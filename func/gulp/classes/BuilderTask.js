"use strict";

const express = require("express");
const cors = require("cors");
const { glob } = require("glob");
const path = require("path");
const fs = require("fs-extra");
const sqlite3 = require("sqlite3");
const { spawn } = require("child_process");
const logErr = require("../../utils/TimeLogger");

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
        this.bodyLimit = options.bodyLimit || "512kb";
        this.maxLayoutItems = options.maxLayoutItems || 200;
        this.maxLayoutTextLength = options.maxLayoutTextLength || 200;
        this.maxLayoutBytes = options.maxLayoutBytes || 512 * 1024;
        this.db = null;
        this.watchProcess = null;
    }

    resolveSafePath(basePath, userPath) {
        if (typeof userPath !== "string" || userPath.trim() === "") {
            const err = new Error("Invalid path parameter");
            err.statusCode = 400;
            throw err;
        }

        const normalized = userPath.replace(/\\/g, "/");
        const resolved = path.resolve(basePath, normalized);
        const relative = path.relative(basePath, resolved);

        if (relative.startsWith("..") || path.isAbsolute(relative)) {
            const err = new Error("Path traversal is not allowed");
            err.statusCode = 400;
            throw err;
        }

        return resolved;
    }

    isPathInside(basePath, targetPath) {
        const resolvedBase = path.resolve(basePath);
        const resolvedTarget = path.resolve(targetPath);
        const relative = path.relative(resolvedBase, resolvedTarget);
        return !(relative.startsWith("..") || path.isAbsolute(relative));
    }

    buildPartialPreview(html) {
        if (typeof html !== "string") {
            return "";
        }

        // Remove scripts/styles and compact to human-readable sample text.
        const cleaned = html
            .replace(/<script[\s\S]*?<\/script>/gi, " ")
            .replace(/<style[\s\S]*?<\/style>/gi, " ")
            .replace(/<[^>]+>/g, " ")
            .replace(/\s+/g, " ")
            .trim();

        return cleaned.slice(0, 140);
    }

    formatCategory(folder) {
        if (!folder || folder === "." || folder === "root") {
            return "General";
        }

        return folder
            .split(/[\\/]/)
            .map((part) => part.replace(/[-_.]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
            .join(" / ");
    }

    validateLayoutData(layoutData) {
        if (!layoutData || typeof layoutData !== "object" || Array.isArray(layoutData)) {
            const err = new Error("layoutData must be an object");
            err.statusCode = 400;
            throw err;
        }

        if (!Array.isArray(layoutData.layout)) {
            const err = new Error("layoutData.layout must be an array");
            err.statusCode = 400;
            throw err;
        }

        if (layoutData.layout.length > this.maxLayoutItems) {
            const err = new Error(`layoutData.layout exceeds limit of ${this.maxLayoutItems} items`);
            err.statusCode = 413;
            throw err;
        }

        if (typeof layoutData.pageTitle === "string" && layoutData.pageTitle.length > this.maxLayoutTextLength) {
            const err = new Error(`pageTitle exceeds ${this.maxLayoutTextLength} characters`);
            err.statusCode = 400;
            throw err;
        }

        layoutData.layout.forEach((item, index) => {
            if (!item || typeof item !== "object" || Array.isArray(item)) {
                const err = new Error(`layoutData.layout[${index}] must be an object`);
                err.statusCode = 400;
                throw err;
            }

            const stringFields = ["id", "type", "partial", "name"];
            stringFields.forEach((field) => {
                if (typeof item[field] !== "string" || item[field].trim() === "") {
                    const err = new Error(`layoutData.layout[${index}].${field} must be a non-empty string`);
                    err.statusCode = 400;
                    throw err;
                }
                if (item[field].length > this.maxLayoutTextLength) {
                    const err = new Error(`layoutData.layout[${index}].${field} exceeds ${this.maxLayoutTextLength} characters`);
                    err.statusCode = 400;
                    throw err;
                }
            });

            if (typeof item.order !== "number" || !Number.isFinite(item.order)) {
                const err = new Error(`layoutData.layout[${index}].order must be a number`);
                err.statusCode = 400;
                throw err;
            }
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
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function onRun(err) {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(this);
            });
        });
    }

    dbGet(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row);
            });
        });
    }

    dbAll(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                    return;
                }
                resolve(rows || []);
            });
        });
    }

    sanitizeName(value, fallback = "") {
        return String(value || "")
            .trim()
            .replace(/[^a-zA-Z0-9-_ ]/g, "")
            .replace(/\s+/g, " ")
            .slice(0, 80) || fallback;
    }

    sanitizePageName(value, fallback = "page") {
        return String(value || "")
            .toLowerCase()
            .replace(/[^a-z0-9-_]/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "")
            .slice(0, 80) || fallback;
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
        return rows;
    }

    async createProject(projectName) {
        const safeProjectName = await this.upsertProjectRecord(projectName);
        const row = await this.dbGet(
            "SELECT project_name AS projectName, created_at AS createdAt, updated_at AS updatedAt FROM builder_projects WHERE project_name = ?",
            [safeProjectName]
        );
        return row;
    }

    async listPages(projectName) {
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
        return enriched;
    }

    async createPage({ projectName, pageName, pageTitle = "" }) {
        return this.upsertPageRecord({ projectName, pageName, pageTitle, layoutFileName: null });
    }

    async buildPartialLookup() {
        const items = await this.scanPartials();
        const lookup = new Map();
        for (const item of items) {
            const rel = String(item.path || "").replace(/\\/g, "/");
            const noExt = rel.replace(/\.html$/i, "");
            const base = path.basename(noExt);
            const keys = [rel, noExt, base, `${base}.html`];
            keys.forEach((key) => {
                if (!lookup.has(key)) {
                    lookup.set(key, rel);
                }
            });
        }
        return lookup;
    }

    extractPartialTokensFromPage(content) {
        const tokens = [];
        if (!content || typeof content !== "string") {
            return tokens;
        }

        const seen = new Set();
        const combinedRegex = /<!--\s*partial:\s*([^>]+?)\s*-->|{{>\s*([a-zA-Z0-9_./-]+)\s*}}/g;
        let match = null;
        while ((match = combinedRegex.exec(content)) !== null) {
            const token = String(match[1] || match[2] || "").trim();
            if (token && !seen.has(token)) {
                seen.add(token);
                tokens.push(token);
            }
        }

        return tokens;
    }

    resolvePartialTokenToPath(token, lookup) {
        const normalized = String(token || "").trim().replace(/\\/g, "/");
        if (!normalized) return null;

        const candidates = [
            normalized,
            normalized.replace(/\.html$/i, ""),
            normalized.replace(/\.html$/i, "") + ".html",
            path.basename(normalized),
            path.basename(normalized, ".html"),
            path.basename(normalized, ".html") + ".html"
        ];

        for (const candidate of candidates) {
            if (lookup.has(candidate)) {
                return lookup.get(candidate);
            }
        }
        return null;
    }

    async getPagePartials(pageName, partialLookup = null) {
        const safePageName = this.sanitizePageName(pageName);
        if (!safePageName) {
            return [];
        }
        const pagePath = path.join(this.pagesOutputPath, `${safePageName}.html`);
        const exists = await fs.pathExists(pagePath);
        if (!exists) {
            return [];
        }

        const content = await fs.readFile(pagePath, "utf8");
        const tokens = this.extractPartialTokensFromPage(content);
        const lookup = partialLookup || await this.buildPartialLookup();
        const resolved = [];
        for (const token of tokens) {
            const relPath = this.resolvePartialTokenToPath(token, lookup);
            if (relPath) {
                resolved.push(relPath);
            }
        }
        return [...new Set(resolved)];
    }

    async syncPagesFromFilesystem(projectName) {
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
        try {
            const pattern = path.join(this.partialsPath, "**/*.html").replace(/\\/g, "/");
            const files = await glob(pattern);

            const items = await Promise.all(files.map(async (file) => {
                const relativePath = path.relative(this.partialsPath, file);
                const folder = path.dirname(relativePath);
                const name = path.basename(file, ".html");
                const componentKey = relativePath.replace(/\\/g, "/").replace(/\.html$/i, "");
                const content = await fs.readFile(file, "utf8");
                const preview = this.buildPartialPreview(content);
                const category = this.formatCategory(folder);

                return {
                    id: componentKey,
                    componentKey,
                    name: name,
                    path: relativePath,
                    fullPath: file,
                    folder: folder === "." ? "root" : folder,
                    category,
                    type: "partial",
                    preview
                };
            }));

            return items;
        } catch (err) {
            logErr.writeLog(err, {
                customKey: "BUILDER_SCAN_PARTIALS_ERROR",
                context: { partialsPath: this.partialsPath }
            });
            throw err;
        }
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
        try {
            const fullPath = this.resolveSafePath(this.partialsPath, filePath);

            if (!fs.existsSync(fullPath)) {
                throw this.createActionableError(
                    `Partial not found: ${filePath}`,
                    404,
                    "PARTIAL_NOT_FOUND",
                    { filePath }
                );
            }

            return await fs.readFile(fullPath, "utf-8");
        } catch (err) {
            logErr.writeLog(err, {
                customKey: "BUILDER_GET_PARTIAL_CONTENT_ERROR",
                context: { filePath }
            });
            throw err;
        }
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
            const pagePath = await this.createPageFromLayout(layoutData, safePageName);
            console.log(`Layout saved to database: ${layoutFileName}`);
            console.log(`Page generated at: ${pagePath}`);

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
        await fs.ensureDir(this.pagesOutputPath);

        const sections = [];
        for (let index = 0; index < layoutData.layout.length; index++) {
            const item = layoutData.layout[index];
            const sourcePath = item.componentPath || item.partial;
            try {
                this.validateComponentPath(item, index);
            } catch (err) {
                throw this.createActionableError(
                    err.message,
                    err.statusCode || 400,
                    err.code || "COMPONENT_VALIDATION_ERROR",
                    {
                        ...(err.details || {}),
                        index,
                        componentPath: sourcePath
                    }
                );
            }

            const partialName = path.basename(sourcePath, ".html");
            sections.push(`{{> ${partialName}}}`);
        }

        const html = sections.join("\n") + "\n";

        const pageFilePath = path.join(this.pagesOutputPath, `${pageName}.html`);
        await fs.writeFile(pageFilePath, html, "utf8");
        return pageFilePath;
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

            // API: Get all available partials
            this.app.get("/api/partials", async (req, res) => {
                try {
                    const partials = await this.scanPartials();
                    res.json({ success: true, data: partials });
                } catch (err) {
                    this.sendError(res, err, "PARTIALS_SCAN_FAILED");
                }
            });

            // API: Get all layouts
            this.app.get("/api/layouts", async (req, res) => {
                try {
                    const layouts = await this.scanLayouts();
                    res.json({ success: true, data: layouts });
                } catch (err) {
                    this.sendError(res, err, "LAYOUTS_SCAN_FAILED");
                }
            });

            // API: Get partial content
            this.app.get("/api/partial", async (req, res) => {
                try {
                    const { path: filePath } = req.query;
                    if (!filePath) {
                        return res.status(400).json({ success: false, error: "Missing path parameter" });
                    }
                    const content = await this.getPartialContent(filePath);
                    res.json({ success: true, data: content });
                } catch (err) {
                    this.sendError(res, err, "PARTIAL_READ_FAILED");
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

            // API: Save layout
            this.app.post("/api/save-layout", async (req, res) => {
                try {
                    const { layoutData, fileName, pageName, overwrite, saveAs, layoutFileName } = req.body;
                    if (!layoutData) {
                        return res.status(400).json({ success: false, error: "Missing layoutData" });
                    }
                    const saveResult = await this.saveLayout(layoutData, {
                        pageName: pageName || fileName,
                        overwrite: Boolean(overwrite),
                        saveAs: Boolean(saveAs),
                        layoutFileName
                    });
                    // Keep `path` for backward compatibility with existing clients.
                    res.json({
                        success: true,
                        data: {
                            path: saveResult.layoutPath,
                            layoutPath: saveResult.layoutPath,
                            pagePath: saveResult.pagePath,
                            pageName: saveResult.pageName,
                            layoutFileName: saveResult.layoutFileName
                        }
                    });
                } catch (err) {
                    this.sendError(res, err, "LAYOUT_SAVE_FAILED");
                }
            });

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

            // API: Create page
            this.app.post("/api/pages", async (req, res) => {
                try {
                    const { projectName, pageName, pageTitle } = req.body || {};
                    if (!projectName || !pageName) {
                        return res.status(400).json({ success: false, error: "Missing projectName or pageName" });
                    }
                    const page = await this.createPage({ projectName, pageName, pageTitle });
                    res.json({ success: true, data: page });
                } catch (err) {
                    this.sendError(res, err, "PAGE_CREATE_FAILED");
                }
            });

            // API: List pages for a project
            this.app.get("/api/pages", async (req, res) => {
                try {
                    const { projectName } = req.query;
                    if (!projectName) {
                        return res.status(400).json({ success: false, error: "Missing projectName parameter" });
                    }
                    const pages = await this.listPages(projectName);
                    res.json({ success: true, data: pages });
                } catch (err) {
                    this.sendError(res, err, "PAGES_LIST_FAILED");
                }
            });

            // API: Get detected partials used by a page html file
            this.app.get("/api/pages/partials", async (req, res) => {
                try {
                    const projectName = req.query?.projectName || "theme_3";
                    const pageName = req.query?.pageName;
                    if (!pageName) {
                        return res.status(400).json({ success: false, error: "Missing pageName parameter" });
                    }
                    await this.upsertProjectRecord(projectName);
                    const partials = await this.getPagePartials(pageName);
                    res.json({ success: true, data: { projectName, pageName, partials } });
                } catch (err) {
                    this.sendError(res, err, "PAGE_PARTIALS_READ_FAILED");
                }
            });

            // API: Mark page partial-sync state
            this.app.post("/api/pages/partials/sync-state", async (req, res) => {
                try {
                    const projectName = req.body?.projectName || req.query?.projectName || "theme_3";
                    const pageName = req.body?.pageName || req.query?.pageName;
                    const partialsSynced = Boolean(req.body?.partialsSynced);
                    if (!pageName) {
                        return res.status(400).json({ success: false, error: "Missing pageName parameter" });
                    }
                    const data = await this.setPagePartialsSynced({ projectName, pageName, partialsSynced });
                    res.json({ success: true, data });
                } catch (err) {
                    this.sendError(res, err, "PAGE_PARTIALS_SYNC_STATE_FAILED");
                }
            });

            // API: Sync filesystem pages into DB and return enriched page list
            this.app.post("/api/pages/sync", async (req, res) => {
                try {
                    const projectName = req.body?.projectName || req.query?.projectName || "theme_3";
                    const data = await this.syncPagesFromFilesystem(projectName);
                    res.json({ success: true, data });
                } catch (err) {
                    this.sendError(res, err, "PAGES_SYNC_FAILED");
                }
            });

            // API: Delete page
            this.app.delete("/api/pages", async (req, res) => {
                try {
                    const projectName = req.body?.projectName || req.query?.projectName;
                    const pageName = req.body?.pageName || req.query?.pageName;
                    if (!projectName || !pageName) {
                        return res.status(400).json({ success: false, error: "Missing projectName or pageName parameter" });
                    }
                    const deleted = await this.deletePage({ projectName, pageName });
                    res.json({ success: true, data: deleted });
                } catch (err) {
                    this.sendError(res, err, "PAGE_DELETE_FAILED");
                }
            });

            // API: List saved layouts
            this.app.get("/api/saved-layouts", async (req, res) => {
                try {
                    const items = await this.listSavedLayouts();
                    res.json({ success: true, data: items });
                } catch (err) {
                    this.sendError(res, err, "SAVED_LAYOUTS_LIST_FAILED");
                }
            });

            // API: Read one saved layout
            this.app.get("/api/saved-layout", async (req, res) => {
                try {
                    const { fileName } = req.query;
                    if (!fileName) {
                        return res.status(400).json({ success: false, error: "Missing fileName parameter" });
                    }
                    const item = await this.getSavedLayout(fileName);
                    res.json({ success: true, data: item });
                } catch (err) {
                    this.sendError(res, err, "SAVED_LAYOUT_READ_FAILED");
                }
            });

            // API: Delete saved layout
            this.app.delete("/api/saved-layout", async (req, res) => {
                try {
                    const fileName = req.body?.fileName || req.query?.fileName;
                    if (!fileName) {
                        return res.status(400).json({ success: false, error: "Missing fileName parameter" });
                    }
                    const deleted = await this.deleteSavedLayout(fileName);
                    res.json({ success: true, data: deleted });
                } catch (err) {
                    this.sendError(res, err, "SAVED_LAYOUT_DELETE_FAILED");
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



