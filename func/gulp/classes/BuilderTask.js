"use strict";

const express = require("express");
const cors = require("cors");
const { glob } = require("glob");
const path = require("path");
const fs = require("fs-extra");
const sqlite3 = require("sqlite3");
const { spawn } = require("child_process");
const logErr = require("../../utils/TimeLogger");
const { resolveSafePath, isPathInside } = require("./builder-backend/utils/pathSafety");
const { buildPartialPreview, formatCategory } = require("./builder-backend/utils/formatting");
const { validateLayoutData } = require("./builder-backend/utils/validation");
const { sanitizeName, sanitizePageName } = require("./builder-backend/utils/sanitizers");
const { registerLayoutsRoutes } = require("./builder-backend/routes/layouts.routes");
const { registerPartialsRoutes } = require("./builder-backend/routes/partials.routes");
const { registerPagesRoutes } = require("./builder-backend/routes/pages.routes");
const { createLayoutsController } = require("./builder-backend/controllers/layouts.controller");
const { createPartialsController } = require("./builder-backend/controllers/partials.controller");
const { createPagesController } = require("./builder-backend/controllers/pages.controller");
const { createLayoutsService } = require("./builder-backend/services/layouts.service");
const { createPartialsService } = require("./builder-backend/services/partials.service");
const { createPagesService } = require("./builder-backend/services/pages.service");
const { createLayoutsRepository } = require("./builder-backend/repositories/layouts.repository");
const { createPartialsRepository } = require("./builder-backend/repositories/partials.repository");
const { createPagesRepository } = require("./builder-backend/repositories/pages.repository");
const GulpHTMLTasks = require("./GulpHTMLTasks");

/**
 * BuilderTask - Handles the visual drag-and-drop interface builder
 * Scans partials, serves the UI, and provides API endpoints
 */
class BuilderTask {
    constructor(options = {}) {
        this.port = options.port ?? 3000;
        this.app = null;
        this.server = null;
        this.projectRoot = options.projectRoot || process.cwd();
        this.partialsPath = path.resolve(this.projectRoot, options.partialsPath || "./html/partials");
        this.layoutsPath = path.resolve(this.projectRoot, options.layoutsPath || "./html/layouts");
        this.builderPath = path.resolve(this.projectRoot, options.builderPath || "./_builder/client");
        this.layoutsOutputPath = path.resolve(this.projectRoot, options.layoutsOutputPath || "./_builder/layouts");
        this.databasePath = path.resolve(this.projectRoot, options.databasePath || "./_builder/layouts/builder.sqlite");
        this.pagesOutputPath = path.resolve(this.projectRoot, options.pagesOutputPath || "./html/pages");
        this.imagesPath = path.resolve(this.projectRoot, options.imagesPath || "./src/images");
        this.bodyLimit = options.bodyLimit || "512kb";
        this.maxLayoutItems = options.maxLayoutItems || 200;
        this.maxLayoutTextLength = options.maxLayoutTextLength || 200;
        this.maxLayoutBytes = options.maxLayoutBytes || 512 * 1024;
        this.enableBoundaryLogs = options.enableBoundaryLogs ?? process.env.BUILDER_BOUNDARY_LOGS === "1";
        this.db = null;
        this.watchProcess = null;
        this.layoutsRepository = null;
        this.layoutsService = null;
        this.layoutsController = null;
        this.partialsRepository = null;
        this.partialsService = null;
        this.partialsController = null;
        this.pagesRepository = null;
        this.pagesService = null;
        this.pagesController = null;
    }

    logBoundary(layer, action, details = {}) {
        if (!this.enableBoundaryLogs) {
            return;
        }
        const payload = Object.keys(details).length ? ` ${JSON.stringify(details)}` : "";
        console.log(`[builder:${layer}] ${action}${payload}`);
    }

    resolveSafePath(basePath, userPath) {
        return resolveSafePath(basePath, userPath);
    }

    isPathInside(basePath, targetPath) {
        return isPathInside(basePath, targetPath);
    }

    buildPartialPreview(html) {
        return buildPartialPreview(html);
    }

    formatCategory(folder) {
        return formatCategory(folder);
    }

    validateLayoutData(layoutData) {
        return validateLayoutData(layoutData, {
            maxLayoutItems: this.maxLayoutItems,
            maxLayoutTextLength: this.maxLayoutTextLength
        });
    }

    createActionableError(message, statusCode = 500, code = "BUILDER_ERROR", details = {}) {
        const err = new Error(message);
        err.statusCode = statusCode;
        err.code = code;
        err.details = details;
        return err;
    }

    async initDatabase() {
        await fs.ensureDir(path.dirname(this.databasePath));
        this.db = await new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.databasePath, (err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(db);
            });
        });

        await this.dbRun(`
            CREATE TABLE IF NOT EXISTS builder_layouts (
                file_name TEXT PRIMARY KEY,
                page_name TEXT NOT NULL,
                page_title TEXT,
                project_name TEXT,
                layout_json TEXT NOT NULL,
                layout_path TEXT,
                size_bytes INTEGER NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        `);

        await this.dbRun(`
            CREATE TABLE IF NOT EXISTS builder_projects (
                project_name TEXT PRIMARY KEY,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            )
        `);

        await this.dbRun(`
            CREATE TABLE IF NOT EXISTS builder_pages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                project_name TEXT NOT NULL,
                page_name TEXT NOT NULL,
                page_title TEXT,
                layout_file_name TEXT,
                partials_synced INTEGER NOT NULL DEFAULT 0,
                partials_synced_at TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(project_name, page_name)
            )
        `);

        const pageColumns = await this.dbAll("PRAGMA table_info(builder_pages)");
        const hasPartialsSynced = pageColumns.some((col) => col.name === "partials_synced");
        const hasPartialsSyncedAt = pageColumns.some((col) => col.name === "partials_synced_at");
        if (!hasPartialsSynced) {
            await this.dbRun("ALTER TABLE builder_pages ADD COLUMN partials_synced INTEGER NOT NULL DEFAULT 0");
        }
        if (!hasPartialsSyncedAt) {
            await this.dbRun("ALTER TABLE builder_pages ADD COLUMN partials_synced_at TEXT");
        }

        await this.migrateLegacyLayoutFilesToDb();
        await this.migrateProjectsAndPagesFromLayouts();
    }

    async closeDatabase() {
        if (!this.db) {
            return;
        }
        await new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve();
            });
        });
        this.db = null;
    }

    dbRun(sql, params = []) {
        this.logBoundary("repo", "dbRun:start", { sql: String(sql || "").trim().slice(0, 120) });
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function onRun(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(this);
            });
        }).finally(() => {
            this.logBoundary("repo", "dbRun:done");
        });
    }

    dbGet(sql, params = []) {
        this.logBoundary("repo", "dbGet:start", { sql: String(sql || "").trim().slice(0, 120) });
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row);
            });
        }).finally(() => {
            this.logBoundary("repo", "dbGet:done");
        });
    }

    dbAll(sql, params = []) {
        this.logBoundary("repo", "dbAll:start", { sql: String(sql || "").trim().slice(0, 120) });
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows || []);
            });
        }).finally(() => {
            this.logBoundary("repo", "dbAll:done");
        });
    }

    async dbTransaction(work) {
        await this.dbRun("BEGIN IMMEDIATE TRANSACTION");
        try {
            const result = await work();
            await this.dbRun("COMMIT");
            return result;
        } catch (err) {
            try {
                await this.dbRun("ROLLBACK");
            } catch (rollbackErr) {
                logErr.writeLog(rollbackErr, {
                    customKey: "BUILDER_DB_ROLLBACK_ERROR"
                });
            }
            throw err;
        }
    }

    sanitizeName(value, fallback = "") {
        return sanitizeName(value, fallback);
    }

    sanitizePageName(value, fallback = "page") {
        return sanitizePageName(value, fallback);
    }

    async upsertProjectRecord(projectName) {
        const safeProjectName = this.sanitizeName(projectName);
        if (!safeProjectName) {
            throw this.createActionableError("Invalid project name", 400, "INVALID_PROJECT_NAME", { projectName });
        }

        const now = new Date().toISOString();
        await this.dbRun(
            `
                INSERT INTO builder_projects (project_name, created_at, updated_at)
                VALUES (?, ?, ?)
                ON CONFLICT(project_name) DO UPDATE SET
                    updated_at = excluded.updated_at
            `,
            [safeProjectName, now, now]
        );
        return safeProjectName;
    }

    async upsertPageRecord({ projectName, pageName, pageTitle = "", layoutFileName = null, partialsSynced = null }) {
        const safeProjectName = await this.upsertProjectRecord(projectName);
        const safePageName = this.sanitizePageName(pageName);
        if (!safePageName) {
            throw this.createActionableError("Invalid page name", 400, "INVALID_PAGE_NAME", { pageName });
        }

        const now = new Date().toISOString();
        await this.dbRun(
            `
                INSERT INTO builder_pages (
                    project_name, page_name, page_title, layout_file_name, partials_synced, partials_synced_at, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(project_name, page_name) DO UPDATE SET
                    page_title = excluded.page_title,
                    layout_file_name = CASE
                        WHEN excluded.layout_file_name IS NOT NULL AND excluded.layout_file_name != ''
                            THEN excluded.layout_file_name
                        ELSE builder_pages.layout_file_name
                    END,
                    updated_at = excluded.updated_at
            `,
            [
                safeProjectName,
                safePageName,
                String(pageTitle || ""),
                layoutFileName,
                partialsSynced ? 1 : 0,
                partialsSynced ? now : null,
                now,
                now
            ]
        );

        if (partialsSynced !== null) {
            await this.dbRun(
                `
                    UPDATE builder_pages
                    SET partials_synced = ?, partials_synced_at = ?, updated_at = ?
                    WHERE project_name = ? AND page_name = ?
                `,
                [partialsSynced ? 1 : 0, partialsSynced ? now : null, now, safeProjectName, safePageName]
            );
        }

        return {
            projectName: safeProjectName,
            pageName: safePageName,
            pageTitle: String(pageTitle || ""),
            layoutFileName: layoutFileName || null,
            partialsSynced: Boolean(partialsSynced)
        };
    }

    async setPagePartialsSynced({ projectName, pageName, partialsSynced }) {
        this.logBoundary("service", "setPagePartialsSynced:start", { projectName, pageName, partialsSynced: Boolean(partialsSynced) });
        const safeProjectName = this.sanitizeName(projectName);
        const safePageName = this.sanitizePageName(pageName);
        if (!safeProjectName || !safePageName) {
            throw this.createActionableError(
                "Invalid project/page name",
                400,
                "INVALID_PROJECT_OR_PAGE_NAME",
                { projectName, pageName }
            );
        }

        const now = new Date().toISOString();
        const result = await this.dbRun(
            `
                UPDATE builder_pages
                SET partials_synced = ?, partials_synced_at = ?, updated_at = ?
                WHERE project_name = ? AND page_name = ?
            `,
            [partialsSynced ? 1 : 0, partialsSynced ? now : null, now, safeProjectName, safePageName]
        );

        if (!result || result.changes === 0) {
            throw this.createActionableError(
                "Page not found",
                404,
                "PAGE_NOT_FOUND",
                { projectName: safeProjectName, pageName: safePageName }
            );
        }

        return {
            projectName: safeProjectName,
            pageName: safePageName,
            partialsSynced: Boolean(partialsSynced),
            partialsSyncedAt: partialsSynced ? now : null
        };
    }

    async migrateProjectsAndPagesFromLayouts() {
        const rows = await this.dbAll(`
            SELECT DISTINCT
                project_name AS projectName,
                page_name AS pageName,
                page_title AS pageTitle,
                file_name AS layoutFileName
            FROM builder_layouts
            WHERE TRIM(COALESCE(page_name, '')) != ''
        `);

        for (const row of rows) {
            const projectName = this.sanitizeName(row.projectName || "Default Project", "Default Project");
            const pageName = this.sanitizePageName(row.pageName || "page", "page");
            await this.upsertPageRecord({
                projectName,
                pageName,
                pageTitle: row.pageTitle || "",
                layoutFileName: row.layoutFileName || null
            });
        }
    }

    async upsertLayoutRecord({ layoutFileName, pageName, layoutPayload, layoutPath }) {
        const serialized = JSON.stringify(layoutPayload);
        const now = new Date().toISOString();
        const createdAt = layoutPayload?.meta?.createdAt || now;
        const updatedAt = layoutPayload?.meta?.updatedAt || now;
        const sizeBytes = Buffer.byteLength(serialized, "utf8");

        await this.dbRun(
            `
                INSERT INTO builder_layouts (
                    file_name, page_name, page_title, project_name,
                    layout_json, layout_path, size_bytes, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(file_name) DO UPDATE SET
                    page_name = excluded.page_name,
                    page_title = excluded.page_title,
                    project_name = excluded.project_name,
                    layout_json = excluded.layout_json,
                    layout_path = excluded.layout_path,
                    size_bytes = excluded.size_bytes,
                    updated_at = excluded.updated_at
            `,
            [
                layoutFileName,
                pageName,
                String(layoutPayload.pageTitle || ""),
                String(layoutPayload?.project?.name || ""),
                serialized,
                layoutPath,
                sizeBytes,
                createdAt,
                updatedAt
            ]
        );
    }

    async migrateLegacyLayoutFilesToDb() {
        await fs.ensureDir(this.layoutsOutputPath);
        const pattern = path.join(this.layoutsOutputPath, "*.json").replace(/\\/g, "/");
        const files = await glob(pattern);

        for (const file of files) {
            const fileName = path.basename(file);
            const existing = await this.dbGet("SELECT file_name FROM builder_layouts WHERE file_name = ?", [fileName]);
            if (existing) {
                continue;
            }

            let layoutPayload = null;
            try {
                layoutPayload = await fs.readJson(file);
            } catch (err) {
                continue;
            }

            const stat = await fs.stat(file);
            const pageName = String(layoutPayload?.pageName || fileName.replace(/-\d+\.json$/, ""));
            const nowIso = new Date().toISOString();
            if (!layoutPayload.meta || typeof layoutPayload.meta !== "object") {
                layoutPayload.meta = {};
            }
            layoutPayload.meta.createdAt = layoutPayload.meta.createdAt || stat.birthtime.toISOString() || nowIso;
            layoutPayload.meta.updatedAt = layoutPayload.meta.updatedAt || stat.mtime.toISOString() || nowIso;

            await this.upsertLayoutRecord({
                layoutFileName: fileName,
                pageName,
                layoutPayload,
                layoutPath: file
            });
        }
    }

    async listSavedLayouts() {
        const rows = await this.dbAll(`
            SELECT
                file_name AS fileName,
                page_name AS pageName,
                project_name AS projectName,
                layout_path AS fullPath,
                size_bytes AS size,
                updated_at AS updatedAt
            FROM builder_layouts
            ORDER BY datetime(updated_at) DESC
        `);

        if (rows.length > 0) {
            return rows;
        }

        // Fallback for environments with no DB records yet.
        await fs.ensureDir(this.layoutsOutputPath);
        const pattern = path.join(this.layoutsOutputPath, "*.json").replace(/\\/g, "/");
        const files = await glob(pattern);
        const stats = await Promise.all(files.map(async (file) => ({ file, stat: await fs.stat(file) })));

        return stats
            .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs)
            .map(({ file, stat }) => ({
                fileName: path.basename(file),
                pageName: path.basename(file).replace(/-\d+\.json$/, ""),
                projectName: "",
                fullPath: file,
                size: stat.size,
                updatedAt: stat.mtime.toISOString()
            }));
    }

    async listProjects() {
        this.logBoundary("service", "listProjects:start");
        const rows = await this.dbAll(`
            SELECT
                p.project_name AS projectName,
                p.created_at AS createdAt,
                p.updated_at AS updatedAt,
                COUNT(pg.id) AS pageCount
            FROM builder_projects p
            LEFT JOIN builder_pages pg ON pg.project_name = p.project_name
            GROUP BY p.project_name, p.created_at, p.updated_at
            ORDER BY datetime(p.updated_at) DESC
        `);
        this.logBoundary("service", "listProjects:done", { count: rows.length });
        return rows;
    }

    async createProject(projectName) {
        this.logBoundary("service", "createProject:start", { projectName });
        const safeProjectName = await this.upsertProjectRecord(projectName);
        const row = await this.dbGet(
            "SELECT project_name AS projectName, created_at AS createdAt, updated_at AS updatedAt FROM builder_projects WHERE project_name = ?",
            [safeProjectName]
        );
        this.logBoundary("service", "createProject:done", { projectName: safeProjectName });
        return row;
    }

    async listPages(projectName) {
        this.logBoundary("service", "listPages:start", { projectName });
        const safeProjectName = this.sanitizeName(projectName);
        if (!safeProjectName) {
            throw this.createActionableError("Invalid project name", 400, "INVALID_PROJECT_NAME", { projectName });
        }

        const rows = await this.dbAll(
            `
                SELECT
                    project_name AS projectName,
                    page_name AS pageName,
                    page_title AS pageTitle,
                    layout_file_name AS layoutFileName,
                    partials_synced AS partialsSynced,
                    partials_synced_at AS partialsSyncedAt,
                    created_at AS createdAt,
                    updated_at AS updatedAt
                FROM builder_pages
                WHERE project_name = ?
                ORDER BY datetime(updated_at) DESC
            `,
            [safeProjectName]
        );
        const partialLookup = await this.buildPartialLookup();
        const enriched = await Promise.all(rows.map(async (row) => {
            const partials = await this.getPagePartials(row.pageName, partialLookup);
            return {
                ...row,
                partialsSynced: Boolean(row.partialsSynced),
                partials
            };
        }));
        this.logBoundary("service", "listPages:done", { projectName: safeProjectName, count: enriched.length });
        return enriched;
    }

    async createPage({ projectName, pageName, pageTitle = "" }) {
        this.logBoundary("service", "createPage:start", { projectName, pageName });
        return this.upsertPageRecord({ projectName, pageName, pageTitle, layoutFileName: null });
    }

    async clonePage({ projectName, sourcePageName, targetPageName, targetPageTitle = "" }) {
        this.logBoundary("service", "clonePage:start", { projectName, sourcePageName, targetPageName });
        const safeProjectName = this.sanitizeName(projectName);
        const safeSourcePageName = this.sanitizePageName(sourcePageName);
        const safeTargetPageName = this.sanitizePageName(targetPageName);

        if (!safeProjectName || !safeSourcePageName || !safeTargetPageName) {
            throw this.createActionableError(
                "Invalid project or page name",
                400,
                "INVALID_PROJECT_OR_PAGE_NAME",
                { projectName, sourcePageName, targetPageName }
            );
        }

        if (safeSourcePageName === safeTargetPageName) {
            throw this.createActionableError(
                "Clone target must be different from source page",
                400,
                "CLONE_TARGET_SAME_AS_SOURCE",
                { sourcePageName: safeSourcePageName, targetPageName: safeTargetPageName }
            );
        }

        const existingTarget = await this.dbGet(
            "SELECT page_name AS pageName FROM builder_pages WHERE project_name = ? AND page_name = ?",
            [safeProjectName, safeTargetPageName]
        );
        if (existingTarget) {
            throw this.createActionableError(
                `Page already exists: ${safeTargetPageName}.html`,
                409,
                "PAGE_ALREADY_EXISTS",
                { pageName: safeTargetPageName }
            );
        }

        const targetPagePath = path.join(this.pagesOutputPath, `${safeTargetPageName}.html`);
        if (await fs.pathExists(targetPagePath)) {
            throw this.createActionableError(
                `Page already exists: ${safeTargetPageName}.html`,
                409,
                "PAGE_ALREADY_EXISTS",
                { pageName: safeTargetPageName, pagePath: targetPagePath }
            );
        }

        const sourcePageRow = await this.dbGet(
            `
                SELECT
                    project_name AS projectName,
                    page_name AS pageName,
                    page_title AS pageTitle,
                    layout_file_name AS layoutFileName,
                    partials_synced AS partialsSynced
                FROM builder_pages
                WHERE project_name = ? AND page_name = ?
            `,
            [safeProjectName, safeSourcePageName]
        );

        const nextPageTitle = String(targetPageTitle || sourcePageRow?.pageTitle || safeTargetPageName);

        if (sourcePageRow?.layoutFileName) {
            const layoutData = await this.getSavedLayout(sourcePageRow.layoutFileName);
            layoutData.pageName = safeTargetPageName;
            layoutData.pageTitle = nextPageTitle;
            layoutData.project = {
                ...(layoutData.project || {}),
                name: safeProjectName
            };
            layoutData.meta = {
                ...(layoutData.meta || {})
            };

            const result = await this.saveLayout(layoutData, {
                pageName: safeTargetPageName,
                overwrite: false,
                saveAs: true,
                layoutFileName: null
            });

            await this.upsertPageRecord({
                projectName: safeProjectName,
                pageName: safeTargetPageName,
                pageTitle: nextPageTitle,
                layoutFileName: result.layoutFileName,
                partialsSynced: sourcePageRow.partialsSynced
            });

            return {
                projectName: safeProjectName,
                sourcePageName: safeSourcePageName,
                pageName: safeTargetPageName,
                pageTitle: nextPageTitle,
                layoutFileName: result.layoutFileName,
                pagePath: result.pagePath
            };
        }

        const sourcePagePath = path.join(this.pagesOutputPath, `${safeSourcePageName}.html`);
        if (!await fs.pathExists(sourcePagePath)) {
            throw this.createActionableError(
                "Source page not found",
                404,
                "PAGE_NOT_FOUND",
                { projectName: safeProjectName, pageName: safeSourcePageName }
            );
        }

        await fs.ensureDir(this.pagesOutputPath);
        await fs.copy(sourcePagePath, targetPagePath, { overwrite: false, errorOnExist: true });
        await this.upsertPageRecord({
            projectName: safeProjectName,
            pageName: safeTargetPageName,
            pageTitle: nextPageTitle,
            layoutFileName: null,
            partialsSynced: sourcePageRow?.partialsSynced ?? null
        });

        this.logBoundary("service", "clonePage:done", {
            projectName: safeProjectName,
            sourcePageName: safeSourcePageName,
            targetPageName: safeTargetPageName
        });

        return {
            projectName: safeProjectName,
            sourcePageName: safeSourcePageName,
            pageName: safeTargetPageName,
            pageTitle: nextPageTitle,
            layoutFileName: null,
            pagePath: targetPagePath
        };
    }

    async buildPartialLookup() {
        this.initPartialsSlice();
        return this.partialsService.buildPartialLookup();
    }

    extractPartialTokensFromPage(content) {
        this.initPartialsSlice();
        return this.partialsService.extractPartialTokensFromPage(content);
    }

    resolvePartialTokenToPath(token, lookup) {
        this.initPartialsSlice();
        return this.partialsService.resolvePartialTokenToPath(token, lookup);
    }

    async getPagePartials(pageName, partialLookup = null) {
        this.initPartialsSlice();
        return this.partialsService.getPagePartials(pageName, partialLookup);
    }

    async syncPagesFromFilesystem(projectName) {
        this.logBoundary("service", "syncPagesFromFilesystem:start", { projectName });
        const safeProjectName = await this.upsertProjectRecord(projectName || "theme_3");
        await fs.ensureDir(this.pagesOutputPath);
        const files = await glob(path.join(this.pagesOutputPath, "*.html").replace(/\\/g, "/"));

        let synced = 0;
        for (const file of files) {
            const pageName = this.sanitizePageName(path.basename(file, ".html"), "page");
            const content = await fs.readFile(file, "utf8");
            const titleMatch = content.match(/<title>([\s\S]*?)<\/title>/i);
            const pageTitle = titleMatch ? String(titleMatch[1]).replace(/\s+/g, " ").trim() : pageName;
            await this.upsertPageRecord({
                projectName: safeProjectName,
                pageName,
                pageTitle,
                layoutFileName: null
            });
            synced += 1;
        }

        const pages = await this.listPages(safeProjectName);
        this.logBoundary("service", "syncPagesFromFilesystem:done", {
            projectName: safeProjectName,
            syncedCount: synced,
            totalPages: pages.length
        });
        return {
            projectName: safeProjectName,
            syncedCount: synced,
            totalPages: pages.length,
            pages
        };
    }

    async deletePage({ projectName, pageName }) {
        const safeProjectName = this.sanitizeName(projectName);
        const safePageName = this.sanitizePageName(pageName);
        if (!safeProjectName || !safePageName) {
            throw this.createActionableError(
                "Invalid project/page name",
                400,
                "INVALID_PROJECT_OR_PAGE_NAME",
                { projectName, pageName }
            );
        }

        const layoutRows = await this.dbAll(
            "SELECT file_name AS fileName, layout_path AS layoutPath FROM builder_layouts WHERE project_name = ? AND page_name = ?",
            [safeProjectName, safePageName]
        );

        for (const row of layoutRows) {
            const fallbackLayoutPath = this.resolveSafePath(this.layoutsOutputPath, row.fileName);
            const layoutPath = row.layoutPath || fallbackLayoutPath;
            if (await fs.pathExists(layoutPath) && this.isPathInside(this.layoutsOutputPath, layoutPath)) {
                await fs.remove(layoutPath);
            }
            await this.dbRun("DELETE FROM builder_layouts WHERE file_name = ?", [row.fileName]);
        }

        const pagePath = path.join(this.pagesOutputPath, `${safePageName}.html`);
        if (await fs.pathExists(pagePath) && this.isPathInside(this.pagesOutputPath, pagePath)) {
            await fs.remove(pagePath);
        }

        await this.dbRun(
            "DELETE FROM builder_pages WHERE project_name = ? AND page_name = ?",
            [safeProjectName, safePageName]
        );

        return { projectName: safeProjectName, pageName: safePageName };
    }

    async deleteProject(projectName) {
        const safeProjectName = this.sanitizeName(projectName);
        if (!safeProjectName) {
            throw this.createActionableError("Invalid project name", 400, "INVALID_PROJECT_NAME", { projectName });
        }

        const pages = await this.listPages(safeProjectName);
        for (const page of pages) {
            await this.deletePage({ projectName: safeProjectName, pageName: page.pageName });
        }

        await this.dbRun("DELETE FROM builder_projects WHERE project_name = ?", [safeProjectName]);
        return { projectName: safeProjectName };
    }

    async getSavedLayout(fileName) {
        this.logBoundary("service", "getSavedLayout:start", { fileName });
        if (typeof fileName !== "string" || !/^[a-zA-Z0-9._-]+\.json$/.test(fileName)) {
            throw this.createActionableError(
                "Invalid fileName parameter",
                400,
                "INVALID_FILE_NAME",
                { fileName }
            );
        }

        const row = await this.dbGet(
            "SELECT layout_json AS layoutJson FROM builder_layouts WHERE file_name = ?",
            [fileName]
        );

        if (row && row.layoutJson) {
            this.logBoundary("service", "getSavedLayout:done", { fileName, source: "db" });
            return JSON.parse(row.layoutJson);
        }

        const fullPath = this.resolveSafePath(this.layoutsOutputPath, fileName);
        if (!fs.existsSync(fullPath)) {
            throw this.createActionableError(
                `Saved layout not found: ${fileName}`,
                404,
                "SAVED_LAYOUT_NOT_FOUND",
                { fileName }
            );
        }

        this.logBoundary("service", "getSavedLayout:done", { fileName, source: "filesystem" });
        return fs.readJson(fullPath);
    }

    async deleteSavedLayout(fileName) {
        if (typeof fileName !== "string" || !/^[a-zA-Z0-9._-]+\.json$/.test(fileName)) {
            throw this.createActionableError(
                "Invalid fileName parameter",
                400,
                "INVALID_FILE_NAME",
                { fileName }
            );
        }

        const dbRecord = await this.dbGet(
            "SELECT file_name AS fileName, page_name AS pageName, layout_path AS layoutPath FROM builder_layouts WHERE file_name = ?",
            [fileName]
        );

        const fallbackLayoutPath = this.resolveSafePath(this.layoutsOutputPath, fileName);
        const layoutPath = dbRecord?.layoutPath || fallbackLayoutPath;
        const pageName = dbRecord?.pageName || fileName.replace(/-\d+\.json$/, "");
        const pagePath = path.join(this.pagesOutputPath, `${pageName}.html`);

        const layoutExists = await fs.pathExists(layoutPath);
        const pageExists = await fs.pathExists(pagePath);
        if (!dbRecord && !layoutExists) {
            throw this.createActionableError(
                `Saved layout not found: ${fileName}`,
                404,
                "SAVED_LAYOUT_NOT_FOUND",
                { fileName }
            );
        }

        if (dbRecord) {
            await this.dbRun("DELETE FROM builder_layouts WHERE file_name = ?", [fileName]);
        }

        if (layoutExists && this.isPathInside(this.layoutsOutputPath, layoutPath)) {
            await fs.remove(layoutPath);
        }

        if (pageExists && this.isPathInside(this.pagesOutputPath, pagePath)) {
            await fs.remove(pagePath);
        }

        return {
            fileName,
            pageName,
            layoutDeleted: Boolean(layoutExists),
            pageDeleted: Boolean(pageExists)
        };
    }

    /**
     * Scan all partials in the html/partials directory
     * @returns {Promise<Array>} Array of partial file objects
     */
    async scanPartials() {
        this.initPartialsSlice();
        return this.partialsService.scanPartials();
    }

    /**
     * Scan all layouts
     * @returns {Promise<Array>} Array of layout file objects
     */
    async scanLayouts() {
        try {
            const pattern = path.join(this.layoutsPath, "**/*.html").replace(/\\/g, "/");
            const files = await glob(pattern);

            return files.map((file) => {
                const relativePath = path.relative(this.layoutsPath, file);
                const name = path.basename(file, ".html");

                return {
                    id: this.generateId(),
                    name: name,
                    path: relativePath,
                    fullPath: file,
                    type: "layout"
                };
            });
        } catch (err) {
            logErr.writeLog(err, {
                customKey: "BUILDER_SCAN_LAYOUTS_ERROR",
                context: { layoutsPath: this.layoutsPath }
            });
            throw err;
        }
    }

    /**
     * Get content of a specific partial file
     * @param {string} filePath - Relative path to the partial
     * @returns {Promise<string>} HTML content
     */
    async getPartialContent(filePath) {
        this.initPartialsSlice();
        return this.partialsService.getPartialContent(filePath);
    }

    /**
     * Get content of a layout file
     * @param {string} filePath - Relative path to the layout
     * @returns {Promise<string>} HTML content
     */
    async getLayoutContent(filePath) {
        try {
            const fullPath = this.resolveSafePath(this.layoutsPath, filePath);

            if (!fs.existsSync(fullPath)) {
                throw this.createActionableError(
                    `Layout not found: ${filePath}`,
                    404,
                    "LAYOUT_NOT_FOUND",
                    { filePath }
                );
            }

            return await fs.readFile(fullPath, "utf-8");
        } catch (err) {
            logErr.writeLog(err, {
                customKey: "BUILDER_GET_LAYOUT_CONTENT_ERROR",
                context: { filePath }
            });
            throw err;
        }
    }

    async saveLayoutContent(filePath, content = "", options = {}) {
        try {
            const normalized = String(filePath || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
            if (!normalized) {
                throw this.createActionableError(
                    "Layout path is required",
                    400,
                    "LAYOUT_PATH_REQUIRED",
                    { filePath }
                );
            }

            const safePath = normalized.endsWith(".html") ? normalized : `${normalized}.html`;
            const fullPath = this.resolveSafePath(this.layoutsPath, safePath);
            const exists = await fs.pathExists(fullPath);

            if (exists && !options.overwrite) {
                throw this.createActionableError(
                    `Layout already exists: ${safePath}`,
                    409,
                    "LAYOUT_EXISTS",
                    { filePath: safePath }
                );
            }

            await fs.ensureDir(path.dirname(fullPath));
            await fs.writeFile(fullPath, String(content), "utf8");

            return { path: safePath };
        } catch (err) {
            logErr.writeLog(err, {
                customKey: "BUILDER_SAVE_LAYOUT_CONTENT_ERROR",
                context: { filePath }
            });
            throw err;
        }
    }

    validateComponentPath(item, index) {
        const sourcePath = item.componentPath || item.partial;
        if (!sourcePath || typeof sourcePath !== "string") {
            throw this.createActionableError(
                "Invalid component path in layout item",
                400,
                "INVALID_COMPONENT_PATH",
                { index, itemId: item.id, sourcePath }
            );
        }

        // Enforce component source comes from html/partials for page composition.
        const fullPath = this.resolveSafePath(this.partialsPath, sourcePath);
        if (!fs.existsSync(fullPath)) {
            throw this.createActionableError(
                `Component source does not exist: ${sourcePath}`,
                400,
                "COMPONENT_PATH_NOT_FOUND",
                { index, itemId: item.id, sourcePath }
            );
        }
    }

    /**
     * Save layout configuration to file
     * @param {Object} layoutData - The layout configuration
     * @param {string} outputPath - Where to save the file
     */
    async saveLayout(layoutData, options = {}) {
        try {
            this.logBoundary("service", "saveLayout:start", {
                pageName: options.pageName || layoutData?.pageName || "page",
                overwrite: Boolean(options.overwrite),
                saveAs: Boolean(options.saveAs)
            });
            this.validateLayoutData(layoutData);
            await fs.ensureDir(this.pagesOutputPath);

            const safePageName = String(options.pageName || layoutData.pageName || "page")
                .replace(/[^a-zA-Z0-9-_]/g, "-")
                .replace(/-+/g, "-")
                .replace(/^-|-$/g, "")
                .slice(0, 80) || "page";

            let layoutFileName = null;
            if (options.layoutFileName && !options.saveAs) {
                if (!/^[a-zA-Z0-9._-]+\.json$/.test(options.layoutFileName)) {
                    const err = new Error("Invalid layoutFileName");
                    err.statusCode = 400;
                    throw err;
                }
                layoutFileName = options.layoutFileName;
            } else {
                layoutFileName = `${safePageName}-${Date.now()}.json`;
            }

            const targetPagePath = path.join(this.pagesOutputPath, `${safePageName}.html`);

            if (fs.existsSync(targetPagePath) && !options.overwrite) {
                throw this.createActionableError(
                    `Page already exists: ${safePageName}.html`,
                    409,
                    "PAGE_ALREADY_EXISTS",
                    { pageName: safePageName, pagePath: targetPagePath }
                );
            }

            const now = new Date().toISOString();
            const layoutPayload = {
                ...layoutData,
                pageName: safePageName,
                meta: {
                    version: 1,
                    createdAt: layoutData?.meta?.createdAt || now,
                    updatedAt: now
                }
            };

            const serialized = JSON.stringify(layoutPayload, null, 2);
            const bytes = Buffer.byteLength(serialized, "utf8");
            if (bytes > this.maxLayoutBytes) {
                throw this.createActionableError(
                    `layoutData exceeds ${this.maxLayoutBytes} bytes`,
                    413,
                    "LAYOUT_TOO_LARGE",
                    { maxLayoutBytes: this.maxLayoutBytes, bytes }
                );
            }

            const pagePath = await this.createPageFromLayout(layoutPayload, safePageName);
            await this.dbTransaction(async () => {
                await this.upsertLayoutRecord({
                    layoutFileName,
                    pageName: safePageName,
                    layoutPayload,
                    layoutPath: null
                });
                await this.upsertPageRecord({
                    projectName: layoutPayload?.project?.name || "Default Project",
                    pageName: safePageName,
                    pageTitle: layoutPayload?.pageTitle || "",
                    layoutFileName
                });
            });
            console.log(`Layout saved to database: ${layoutFileName}`);
            console.log(`Page generated at: ${pagePath}`);
            this.logBoundary("service", "saveLayout:done", { pageName: safePageName, layoutFileName });

            return { layoutPath: `db://${layoutFileName}`, pagePath, pageName: safePageName, layoutFileName };
        } catch (err) {
            logErr.writeLog(err, {
                customKey: "BUILDER_SAVE_LAYOUT_ERROR",
                context: { outputPath: this.layoutsOutputPath }
            });
            throw err;
        }
    }

    async createPageFromLayout(layoutData, pageName) {
        this.initLayoutsSlice();
        return this.layoutsService.createPageFromLayout(layoutData, pageName);
    }

    sendError(res, err, fallbackCode = "BUILDER_SERVER_ERROR") {
        res.status(err.statusCode || 500).json({
            success: false,
            error: err.message,
            code: err.code || fallbackCode,
            details: err.details || {}
        });
    }

    /**
     * Generate a unique ID
     * @returns {string} UUID-like string
     */
    generateId() {
        return "id-" + Math.random().toString(36).substr(2, 9);
    }

    sanitizeFileName(value, fallback = "image") {
        return String(value || "")
            .trim()
            .replace(/[^a-zA-Z0-9._-]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^[-.]+/, "")
            .slice(0, 120) || fallback;
    }

    getImageExtensionFromMime(mime) {
        const normalized = String(mime || "").toLowerCase();
        if (normalized === "image/jpeg") return ".jpg";
        if (normalized === "image/png") return ".png";
        if (normalized === "image/gif") return ".gif";
        if (normalized === "image/webp") return ".webp";
        if (normalized === "image/svg+xml") return ".svg";
        return "";
    }

    getAllowedImageExtensions() {
        return new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"]);
    }

    async ensureUniqueFileName(dirPath, fileName) {
        const ext = path.extname(fileName);
        const base = path.basename(fileName, ext);
        let candidate = `${base}${ext}`;
        let counter = 1;
        while (await fs.pathExists(path.join(dirPath, candidate))) {
            candidate = `${base}-${counter}${ext}`;
            counter += 1;
        }
        return candidate;
    }

    async startWatchProcess() {
        if (this.watchProcess && !this.watchProcess.killed && this.watchProcess.exitCode === null) {
            return { alreadyRunning: true, pid: this.watchProcess.pid };
        }

        const cliPath = path.resolve(this.projectRoot, "bin/cli.js");
        this.watchProcess = spawn(process.execPath, [cliPath, "watch"], {
            cwd: this.projectRoot,
            env: process.env,
            stdio: "ignore",
            detached: false
        });

        this.watchProcess.on("exit", () => {
            this.watchProcess = null;
        });

        return { alreadyRunning: false, pid: this.watchProcess.pid };
    }

    async rebuildPreviewHtml() {
        const htmlTasks = new GulpHTMLTasks({
            src: "./html/",
            dest: "./build",
            watch: false
        });

        return new Promise((resolve, reject) => {
            Promise.resolve(htmlTasks.compileHtmlSync())
                .then((stream) => {
                    if (!stream || typeof stream.on !== "function") {
                        resolve({ built: false });
                        return;
                    }

                    let settled = false;
                    const finish = (result) => {
                        if (!settled) {
                            settled = true;
                            resolve(result);
                        }
                    };
                    const fail = (err) => {
                        if (!settled) {
                            settled = true;
                            reject(err);
                        }
                    };

                    stream.on("end", () => finish({ built: true }));
                    stream.on("finish", () => finish({ built: true }));
                    stream.on("error", fail);
                })
                .catch(reject);
        });
    }

    initLayoutsSlice() {
        if (this.layoutsRepository && this.layoutsService && this.layoutsController) {
            return;
        }
        this.layoutsRepository = createLayoutsRepository(this);
        this.layoutsService = createLayoutsService(this, this.layoutsRepository);
        this.layoutsController = createLayoutsController(this, this.layoutsService);
    }

    initPartialsSlice() {
        if (this.partialsRepository && this.partialsService && this.partialsController) {
            return;
        }
        this.partialsRepository = createPartialsRepository(this);
        this.partialsService = createPartialsService(this, this.partialsRepository);
        this.partialsController = createPartialsController(this, this.partialsService);
    }

    initPagesSlice() {
        if (this.pagesRepository && this.pagesService && this.pagesController) {
            return;
        }
        this.pagesRepository = createPagesRepository(this);
        this.pagesService = createPagesService(this, this.pagesRepository);
        this.pagesController = createPagesController(this, this.pagesService);
    }

    /**
     * Initialize and start the Express server
     */
    async startServer() {
        try {
            this.app = express();
            await this.initDatabase();
            this.app.use(cors());
            this.app.use(express.json({ limit: this.bodyLimit }));
            this.app.use(express.static(path.resolve(this.builderPath)));
            this.app.use("/src/images", express.static(this.imagesPath));

            this.initPartialsSlice();
            registerPartialsRoutes(this.app, this.partialsController);

            // API: Get all layouts
            this.app.get("/api/layouts", async (req, res) => {
                try {
                    const layouts = await this.scanLayouts();
                    res.json({ success: true, data: layouts });
                } catch (err) {
                    this.sendError(res, err, "LAYOUTS_SCAN_FAILED");
                }
            });

            // API: Get layout content
            this.app.get("/api/layout", async (req, res) => {
                try {
                    const { path: filePath } = req.query;
                    if (!filePath) {
                        return res.status(400).json({ success: false, error: "Missing path parameter" });
                    }
                    const content = await this.getLayoutContent(filePath);
                    res.json({ success: true, data: content });
                } catch (err) {
                    this.sendError(res, err, "LAYOUT_READ_FAILED");
                }
            });
            // API: Save layout content
            this.app.post("/api/layout", async (req, res) => {
                try {
                    const { path: filePath, content, overwrite } = req.body || {};
                    if (!filePath) {
                        return res.status(400).json({ success: false, error: "Missing path parameter" });
                    }
                    const result = await this.saveLayoutContent(filePath, content || "", { overwrite: Boolean(overwrite) });
                    res.json({ success: true, data: result });
                } catch (err) {
                    this.sendError(res, err, "LAYOUT_SAVE_FAILED");
                }
            });

            this.initLayoutsSlice();
            registerLayoutsRoutes(this.app, this.layoutsController);

            // API: Start th3 watch (builder preview dependency)
            this.app.post("/api/watch/start", async (req, res) => {
                try {
                    const info = await this.startWatchProcess();
                    res.json({ success: true, data: info });
                } catch (err) {
                    this.sendError(res, err, "WATCH_START_FAILED");
                }
            });

            // API: Create project
            this.app.post("/api/projects", async (req, res) => {
                try {
                    const projectName = req.body?.projectName;
                    if (!projectName) {
                        return res.status(400).json({ success: false, error: "Missing projectName" });
                    }
                    const project = await this.createProject(projectName);
                    res.json({ success: true, data: project });
                } catch (err) {
                    this.sendError(res, err, "PROJECT_CREATE_FAILED");
                }
            });

            // API: List projects
            this.app.get("/api/projects", async (req, res) => {
                try {
                    const projects = await this.listProjects();
                    res.json({ success: true, data: projects });
                } catch (err) {
                    this.sendError(res, err, "PROJECTS_LIST_FAILED");
                }
            });

            // API: Delete project
            this.app.delete("/api/projects", async (req, res) => {
                try {
                    const projectName = req.body?.projectName || req.query?.projectName;
                    if (!projectName) {
                        return res.status(400).json({ success: false, error: "Missing projectName parameter" });
                    }
                    const deleted = await this.deleteProject(projectName);
                    res.json({ success: true, data: deleted });
                } catch (err) {
                    this.sendError(res, err, "PROJECT_DELETE_FAILED");
                }
            });

            this.initPagesSlice();
            registerPagesRoutes(this.app, this.pagesController);

            // API: Upload image to src/images
            this.app.post("/api/uploads/image", express.raw({ type: "application/octet-stream", limit: "10mb" }), async (req, res) => {
                try {
                    const rawName = req.headers["x-filename"] || "image";
                    const rawType = req.headers["x-filetype"] || "";
                    const safeName = this.sanitizeFileName(rawName, "image");
                    let ext = path.extname(safeName);
                    let baseName = ext ? path.basename(safeName, ext) : safeName;

                    if (!ext) {
                        ext = this.getImageExtensionFromMime(rawType);
                    }
                    if (!ext) {
                        ext = ".png";
                    }

                    const allowed = this.getAllowedImageExtensions();
                    if (!allowed.has(ext.toLowerCase())) {
                        const err = new Error("Unsupported image format");
                        err.statusCode = 400;
                        throw err;
                    }

                    if (!req.body || !req.body.length) {
                        const err = new Error("Empty upload payload");
                        err.statusCode = 400;
                        throw err;
                    }

                    await fs.ensureDir(this.imagesPath);
                    const fileName = await this.ensureUniqueFileName(this.imagesPath, `${baseName}${ext}`);
                    const outputPath = path.join(this.imagesPath, fileName);
                    await fs.writeFile(outputPath, req.body);

                    res.json({
                        success: true,
                        data: {
                            fileName,
                            path: `/src/images/${fileName}`
                        }
                    });
                } catch (err) {
                    this.sendError(res, err, "IMAGE_UPLOAD_FAILED");
                }
            });

            // API: List uploaded images
            this.app.get("/api/uploads/images", async (req, res) => {
                try {
                    await fs.ensureDir(this.imagesPath);
                    const entries = await fs.readdir(this.imagesPath, { withFileTypes: true });
                    const allowed = this.getAllowedImageExtensions();
                    const files = [];
                    for (const entry of entries) {
                        if (!entry.isFile()) continue;
                        const ext = path.extname(entry.name).toLowerCase();
                        if (!allowed.has(ext)) continue;
                        const filePath = path.join(this.imagesPath, entry.name);
                        const stat = await fs.stat(filePath);
                        files.push({
                            name: entry.name,
                            path: `/src/images/${entry.name}`,
                            size: stat.size,
                            updatedAt: stat.mtime.toISOString()
                        });
                    }
                    res.json({ success: true, data: files });
                } catch (err) {
                    this.sendError(res, err, "IMAGE_LIST_FAILED");
                }
            });

            // API: Build final HTML from layout
            this.app.post("/api/build", async (req, res) => {
                try {
                    const { layout, layoutFile } = req.body;
                    // For now, return the layout config - actual HTML generation would use Panini
                    res.json({ success: true, data: { layout, layoutFile } });
                } catch (err) {
                    this.sendError(res, err, "BUILD_API_FAILED");
                }
            });

            // Serve the builder UI
            this.app.get("/", (req, res) => {
                res.sendFile(path.resolve(this.builderPath, "index.html"));
            });

            // Start listening
            return new Promise((resolve, reject) => {
                this.server = this.app.listen(this.port, () => {
                    const serverPort = this.server.address().port;
                    console.log(`\n🎨 Theme_3 Visual Builder`);
                    console.log(`   Running at: http://localhost:${serverPort}`);
                    console.log(`   Press Ctrl+C to stop\n`);
                    resolve();
                });

                this.server.on("error", (err) => {
                    if (err.code === "EADDRINUSE") {
                        console.error(`Port ${this.port} is already in use. Try a different port.`);
                    }
                    reject(err);
                });
            });
        } catch (err) {
            logErr.writeLog(err, {
                customKey: "BUILDER_START_SERVER_ERROR"
            });
            throw err;
        }
    }

    /**
     * Stop the server
     */
    async stopServer() {
        await this.closeDatabase();
        if (this.watchProcess && !this.watchProcess.killed) {
            try {
                this.watchProcess.kill();
            } catch (err) {
                // no-op best effort
            } finally {
                this.watchProcess = null;
            }
        }
        if (this.server) {
            return new Promise((resolve) => {
                this.server.close(() => {
                    console.log("Builder server stopped.");
                    resolve();
                });
            });
        }
    }
}

module.exports = BuilderTask;



