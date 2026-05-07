"use strict";

const express = require("express");
const cors = require("cors");
const { glob } = require("glob");
const parse5 = require("parse5");
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
const cmsBinding = require("../../../_builder/client/modules/cms-binding");
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
        const cmsSettingsPath = path.resolve(this.projectRoot, "theme-cms", "data", "settings.json");
        const cmsSettings = fs.existsSync(cmsSettingsPath) ? fs.readJsonSync(cmsSettingsPath, { throws: false }) || {} : {};
        this.activeTheme = String(options.activeTheme || process.env.TH3_ACTIVE_THEME || cmsSettings.activeTheme || "theme-3").trim() || "theme-3";
        this.activeThemePath = path.resolve(this.projectRoot, options.activeThemePath || process.env.TH3_ACTIVE_THEME_PATH || cmsSettings.activeThemePath || path.join("themes", this.activeTheme));
        this.activeThemePartialsPath = path.join(this.activeThemePath, "partials");
        this.activeThemeComponentsPath = path.join(this.activeThemePath, "components");
        this.partialsPath = path.resolve(this.projectRoot, options.partialsPath || "./html/partials");
        this.layoutsPath = path.resolve(this.projectRoot, options.layoutsPath || "./html/layouts");
        this.builderPath = path.resolve(this.projectRoot, options.builderPath || "./_builder/client");
        this.layoutsOutputPath = path.resolve(this.projectRoot, options.layoutsOutputPath || "./_builder/layouts");
        this.databasePath = path.resolve(this.projectRoot, options.databasePath || "./_builder/layouts/builder.sqlite");
        this.cmsProjectRoot = path.resolve(options.cmsProjectRoot || this.projectRoot);
        this.cmsExportPath = path.resolve(this.cmsProjectRoot, options.cmsExportPath || "./html/data/cms");
        this.cmsReadMode = options.cmsReadMode || process.env.TH3_BUILDER_CMS_READ_MODE || "export";
        this.cmsBaseUrl = options.cmsBaseUrl || process.env.TH3_CMS_BASE_URL || "";
        this.cmsAdminUrl = options.cmsAdminUrl || process.env.TH3_CMS_ADMIN_URL || "http://localhost:3100/cms";
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

    async resolveComponentSourcePath(sourcePath) {
        const normalized = String(sourcePath || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
        if (!normalized) {
            return null;
        }
        const candidates = [
            { root: this.activeThemePartialsPath, relativePath: normalized },
            { root: this.activeThemeComponentsPath, relativePath: normalized.replace(/^micro\//, "") },
            { root: this.partialsPath, relativePath: normalized }
        ];
        for (const candidate of candidates) {
            const fullPath = this.resolveSafePath(candidate.root, candidate.relativePath);
            if (await fs.pathExists(fullPath)) {
                return fullPath;
            }
        }
        return null;
    }

    resolveComponentSourcePathSync(sourcePath) {
        const normalized = String(sourcePath || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
        if (!normalized) {
            return null;
        }
        const candidates = [
            { root: this.activeThemePartialsPath, relativePath: normalized },
            { root: this.activeThemeComponentsPath, relativePath: normalized.replace(/^micro\//, "") },
            { root: this.partialsPath, relativePath: normalized }
        ];
        for (const candidate of candidates) {
            const fullPath = this.resolveSafePath(candidate.root, candidate.relativePath);
            if (fs.existsSync(fullPath)) {
                return fullPath;
            }
        }
        return null;
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

    getPublicRuntimeConfig() {
        return {
            cms: {
                readMode: this.cmsReadMode,
                baseUrl: this.cmsBaseUrl,
                adminUrl: this.cmsAdminUrl,
                exportPath: path.relative(this.projectRoot, this.cmsExportPath).replace(/\\/g, "/")
            }
        };
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

        await this.dbRun(`
            CREATE TABLE IF NOT EXISTS builder_templates (
                template_id TEXT PRIMARY KEY,
                label TEXT NOT NULL,
                route_pattern TEXT,
                content_type TEXT,
                layout_id TEXT,
                template_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
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

    sanitizeCmsSlug(value, fallback = "") {
        const normalized = String(value || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, "-")
            .replace(/-+/g, "-")
            .replace(/(^-+|-+$)/g, "");
        return normalized || fallback;
    }

    sanitizeCmsEntryKey(value, fallback = "") {
        const normalized = String(value || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, "-")
            .replace(/-+/g, "-")
            .replace(/(^-+|-+$)/g, "");
        return normalized || fallback;
    }

    normalizeCmsSchema(schema) {
        if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
            return { fields: [] };
        }

        const fields = Array.isArray(schema.fields) ? schema.fields : [];
        return {
            ...schema,
            fields: fields.map((field) => ({
                name: this.sanitizeCmsSlug(field?.name || ""),
                label: String(field?.label || field?.name || "").trim(),
                type: String(field?.type || "text").trim().toLowerCase()
            })).filter((field) => field.name)
        };
    }

    normalizeCmsEntryData(data) {
        if (!data || typeof data !== "object" || Array.isArray(data)) {
            throw this.createActionableError(
                "CMS entry data must be an object",
                400,
                "CMS_ENTRY_DATA_INVALID",
                { dataType: typeof data }
            );
        }

        return data;
    }

    parseJsonRecord(value, fallback) {
        try {
            return JSON.parse(String(value || ""));
        } catch (err) {
            return fallback;
        }
    }

    toCamelCase(value) {
        return cmsBinding.toCamelCase(value);
    }

    toSnakeCase(value) {
        return cmsBinding.toSnakeCase(value);
    }

    buildCmsDataAliases(data = {}) {
        return cmsBinding.buildDataAliases(data);
    }

    getCmsValueByKey(source, key) {
        return cmsBinding.getValueByKey(source, key);
    }

    getCmsEntryComparableValue(entry, key) {
        return cmsBinding.getEntryComparableValue(entry, key);
    }

    normalizeCmsMappedRecord(data = {}, meta = {}) {
        return cmsBinding.normalizeMappedRecord(data, meta);
    }

    mapCmsEntryData(entry, binding, index = 0) {
        return cmsBinding.mapEntryData(entry, binding, index);
    }

    async resolveCmsBindingData(binding) {
        if (!binding || binding.source !== "cms" || !binding.collection) {
            return null;
        }

        const entries = await this.listCmsEntries(binding.collection);
        if (!Array.isArray(entries) || entries.length === 0) {
            return null;
        }

        return cmsBinding.resolveBindingEntries(binding, entries);
    }

    isElementNode(node) {
        return Boolean(node && node.nodeName && node.nodeName !== "#text" && node.nodeName !== "#comment" && node.tagName);
    }

    walkElementNodes(node, visit) {
        if (!node) {
            return;
        }
        if (this.isElementNode(node)) {
            visit(node);
        }
        const children = Array.isArray(node.childNodes) ? node.childNodes : [];
        children.forEach((child) => this.walkElementNodes(child, visit));
    }

    getElementNodes(root) {
        const nodes = [];
        this.walkElementNodes(root, (node) => nodes.push(node));
        return nodes;
    }

    getAttr(node, name) {
        const attrs = Array.isArray(node?.attrs) ? node.attrs : [];
        const match = attrs.find((attr) => attr.name === name);
        return match ? match.value : "";
    }

    setAttr(node, name, value) {
        if (!node) {
            return;
        }
        if (!Array.isArray(node.attrs)) {
            node.attrs = [];
        }
        const existing = node.attrs.find((attr) => attr.name === name);
        if (existing) {
            existing.value = String(value);
            return;
        }
        node.attrs.push({ name, value: String(value) });
    }

    setElementText(node, value) {
        if (!node) {
            return;
        }
        node.childNodes = [{ nodeName: "#text", value: String(value), parentNode: node }];
    }

    isPlainTextElement(node) {
        if (!this.isElementNode(node)) {
            return false;
        }
        const children = Array.isArray(node.childNodes) ? node.childNodes : [];
        return children.every((child) => child.nodeName === "#text");
    }

    findFirstElement(root, predicate) {
        let match = null;
        this.walkElementNodes(root, (node) => {
            if (!match && predicate(node)) {
                match = node;
            }
        });
        return match;
    }

    findCmsEyebrowNode(root) {
        const elements = this.getElementNodes(root);
        const headingIndex = elements.findIndex((node) => /^h[1-6]$/i.test(node.tagName));
        const spans = elements.filter((node) => node.tagName === "span");
        if (headingIndex >= 0) {
            const preceding = spans.filter((node) => elements.indexOf(node) < headingIndex);
            if (preceding.length > 0) {
                return preceding[preceding.length - 1];
            }
        }
        return spans[0] || null;
    }

    cloneAstNode(node) {
        if (!node || typeof node !== "object") {
            return null;
        }

        const clone = {
            nodeName: node.nodeName
        };
        if (node.tagName) {
            clone.tagName = node.tagName;
            clone.namespaceURI = node.namespaceURI;
            clone.attrs = Array.isArray(node.attrs)
                ? node.attrs.map((attr) => ({ name: attr.name, value: attr.value }))
                : [];
        }
        if (node.value !== undefined) {
            clone.value = node.value;
        }
        if (node.data !== undefined) {
            clone.data = node.data;
        }
        if (node.mode !== undefined) {
            clone.mode = node.mode;
        }
        if (node.sourceCodeLocation !== undefined) {
            clone.sourceCodeLocation = node.sourceCodeLocation;
        }

        const children = Array.isArray(node.childNodes) ? node.childNodes.map((child) => this.cloneAstNode(child)).filter(Boolean) : [];
        clone.childNodes = children;
        children.forEach((child) => {
            child.parentNode = clone;
        });
        return clone;
    }

    findCmsRepeaterTemplate(root) {
        const parents = [root].concat(this.getElementNodes(root));
        let best = null;

        const scoreCandidate = (template, count) => {
            const className = this.getAttr(template, "class");
            let score = count;
            if (/(card|item|post|project|blog|supporter)/i.test(className)) score += 10;
            if (this.findFirstElement(template, (node) => node.tagName === "img")) score += 5;
            if (this.findFirstElement(template, (node) => /^h[1-6]$/i.test(node.tagName))) score += 4;
            if (this.findFirstElement(template, (node) => node.tagName === "p")) score += 2;
            if (["a", "article", "li"].includes(template.tagName)) score += 2;
            return score;
        };

        parents.forEach((parent) => {
            const children = Array.isArray(parent?.childNodes) ? parent.childNodes.filter((node) => this.isElementNode(node)) : [];
            if (children.length < 2) {
                return;
            }

            const groups = new Map();
            children.forEach((child) => {
                const signature = `${child.tagName}::${this.getAttr(child, "class").split(/\s+/).filter(Boolean).sort().join(".")}`;
                if (!groups.has(signature)) {
                    groups.set(signature, []);
                }
                groups.get(signature).push(child);
            });

            groups.forEach((group) => {
                if (group.length < 2) {
                    return;
                }
                const candidate = {
                    parent,
                    template: group[0],
                    siblings: group,
                    score: scoreCandidate(group[0], group.length)
                };
                if (!best || candidate.score > best.score) {
                    best = candidate;
                }
            });
        });

        return best;
    }

    findCmsTemplateSequence(root) {
        const parents = [root].concat(this.getElementNodes(root));
        let best = null;

        const isCardNode = (node) => {
            if (!this.isElementNode(node) || node.tagName !== "div") {
                return false;
            }
            const hasLink = Boolean(this.findFirstElement(node, (child) => child.tagName === "a"));
            const hasHeading = Boolean(this.findFirstElement(node, (child) => /^h[1-6]$/i.test(child.tagName)));
            const hasImage = Boolean(this.findFirstElement(node, (child) => child.tagName === "img"));
            return hasLink && (hasHeading || hasImage);
        };

        parents.forEach((parent) => {
            const candidates = Array.isArray(parent?.childNodes)
                ? parent.childNodes.filter((child) => isCardNode(child))
                : [];
            if (candidates.length < 2) {
                return;
            }
            const score = candidates.length * 10;
            if (!best || score > best.score) {
                best = { parent, templates: candidates, score };
            }
        });

        return best;
    }

    applyCmsDataToAst(root, data = {}) {
        if (!root || !data || typeof data !== "object") {
            return;
        }

        const heading = this.findFirstElement(root, (node) => /^h[1-6]$/i.test(node.tagName));
        const paragraph = this.findFirstElement(root, (node) => node.tagName === "p");
        const image = this.findFirstElement(root, (node) => node.tagName === "img");
        const link = root.tagName === "a" ? root : this.findFirstElement(root, (node) => node.tagName === "a");
        const eyebrow = this.findCmsEyebrowNode(root);

        const titleValue = data.title ?? data.heading ?? data.headline ?? data.name;
        const textValue = data.text ?? data.body ?? data.summary ?? data.description;
        const hrefValue = data.linkHref ?? data.href ?? data.url ?? data.detailUrl ?? data.detail_url ?? data.buttonUrl ?? data.button_url;
        const linkTextValue = data.linkText ?? data.buttonLabel ?? data.button_label ?? data.label;
        const imageSrcValue = data.imageSrc ?? data.src ?? data.image ?? data.image_src;
        const imageAltValue = data.imageAlt ?? data.alt ?? data.image_alt;
        const eyebrowValue = data.eyebrow ?? data.category ?? data.label ?? data.tier;
        const indexValue = data.index ?? data.orderLabel ?? data.order_label;
        const yearValue = data.year;

        if (heading && titleValue !== undefined) this.setElementText(heading, titleValue);
        if (paragraph && textValue !== undefined) this.setElementText(paragraph, textValue);
        if (link && hrefValue !== undefined) this.setAttr(link, "href", hrefValue);
        if (link && linkTextValue !== undefined && this.isPlainTextElement(link)) this.setElementText(link, linkTextValue);
        if (image && imageSrcValue !== undefined) this.setAttr(image, "src", imageSrcValue);
        if (image && imageAltValue !== undefined) this.setAttr(image, "alt", imageAltValue);
        if (eyebrow && eyebrowValue !== undefined) this.setElementText(eyebrow, eyebrowValue);

        if (indexValue !== undefined && heading) {
            const elements = this.getElementNodes(root);
            const headingIndex = elements.indexOf(heading);
            const precedingSpans = elements.filter((node, index) => node.tagName === "span" && index < headingIndex);
            if (precedingSpans.length > 1) {
                this.setElementText(precedingSpans[0], indexValue);
            }
        }

        if (yearValue !== undefined && heading) {
            const elements = this.getElementNodes(root);
            const headingIndex = elements.indexOf(heading);
            const followingSpans = elements.filter((node, index) => node.tagName === "span" && index > headingIndex);
            if (followingSpans.length > 0) {
                this.setElementText(followingSpans[followingSpans.length - 1], yearValue);
            }
        }
    }

    applyCmsCollectionRenderingToAst(root, records = []) {
        if (!Array.isArray(records) || records.length === 0) {
            return false;
        }

        const repeater = this.findCmsRepeaterTemplate(root);
        if (!repeater || !Array.isArray(repeater.parent?.childNodes)) {
            return false;
        }

        const { parent, template, siblings } = repeater;
        const firstIndex = parent.childNodes.indexOf(siblings[0]);
        parent.childNodes = parent.childNodes.filter((node) => !siblings.includes(node));

        const clones = records.map((record) => {
            const clone = this.cloneAstNode(template);
            if (clone) {
                clone.parentNode = parent;
                this.applyCmsDataToAst(clone, record);
            }
            return clone;
        }).filter(Boolean);

        parent.childNodes.splice(firstIndex, 0, ...clones);
        return clones.length > 0;
    }

    applyCmsTemplateSequenceRenderingToAst(root, records = []) {
        if (!Array.isArray(records) || records.length === 0) {
            return false;
        }

        const sequence = this.findCmsTemplateSequence(root);
        if (!sequence || !Array.isArray(sequence.parent?.childNodes)) {
            return false;
        }

        const { parent, templates } = sequence;
        const firstIndex = parent.childNodes.indexOf(templates[0]);
        parent.childNodes = parent.childNodes.filter((node) => !templates.includes(node));

        const clones = records.map((record, index) => {
            const template = templates[index % templates.length];
            const clone = this.cloneAstNode(template);
            if (clone) {
                clone.parentNode = parent;
                this.applyCmsDataToAst(clone, record);
            }
            return clone;
        }).filter(Boolean);

        parent.childNodes.splice(firstIndex, 0, ...clones);
        return clones.length > 0;
    }

    createAstTextNode(value, parentNode = null) {
        return {
            nodeName: "#text",
            value: String(value),
            parentNode
        };
    }

    createAstElement(tagName, attrs = {}, textContent = "", parentNode = null) {
        const node = {
            nodeName: tagName,
            tagName,
            namespaceURI: "http://www.w3.org/1999/xhtml",
            attrs: Object.entries(attrs)
                .filter(([, value]) => value !== undefined && value !== null && value !== "")
                .map(([name, value]) => ({ name, value: String(value) })),
            childNodes: [],
            parentNode
        };
        if (textContent !== undefined && textContent !== null && textContent !== "") {
            node.childNodes.push(this.createAstTextNode(textContent, node));
        }
        return node;
    }

    applyCmsGroupedCollectionRenderingToAst(root, groups = []) {
        if (!Array.isArray(groups) || groups.length === 0) {
            return false;
        }

        const outer = Array.isArray(root?.childNodes)
            ? root.childNodes.find((child) => this.isElementNode(child))
            : null;
        if (!outer || !Array.isArray(outer.childNodes)) {
            return false;
        }

        const groupBlocks = outer.childNodes.filter((block) => {
            if (!this.isElementNode(block) || !Array.isArray(block.childNodes)) {
                return false;
            }
            const directSpan = block.childNodes.find((child) => this.isElementNode(child) && child.tagName === "span");
            const directContainer = block.childNodes.find((child) => this.isElementNode(child) && child.tagName === "div");
            return Boolean(directSpan && directContainer);
        });

        if (groupBlocks.length === 0) {
            return false;
        }

        groups.slice(0, groupBlocks.length).forEach((group, index) => {
            const block = groupBlocks[index];
            const titleNode = block.childNodes.find((child) => this.isElementNode(child) && child.tagName === "span");
            const listNode = block.childNodes.find((child) => this.isElementNode(child) && child.tagName === "div");
            if (!titleNode || !listNode) {
                return;
            }

            if (group.title) {
                this.setElementText(titleNode, group.title);
            }

            listNode.childNodes = [];
            (group.items || []).forEach((record) => {
                const text = record.label ?? record.title ?? record.name ?? "";
                if (!text) {
                    return;
                }
                const tagName = group.itemTag || (record.linkHref ? "a" : "span");
                const attrs = {};
                if (group.itemClassName) {
                    attrs.class = group.itemClassName;
                }
                if (tagName === "a" && record.linkHref) {
                    attrs.href = record.linkHref;
                }
                listNode.childNodes.push(this.createAstElement(tagName, attrs, text, listNode));
            });
        });

        return true;
    }

    async renderCmsBoundComponent(item) {
        if (item?.type === "view") {
            return this.renderCmsViewBlock(item);
        }

        const binding = item?.props?.cmsBinding;
        if (!binding || binding.source !== "cms" || !binding.collection) {
            return typeof item?.renderedContent === "string" && item.renderedContent.trim().length > 0
                ? item.renderedContent
                : null;
        }

        const sourcePath = item.componentPath || item.partial;
        const fullPath = this.resolveComponentSourcePathSync(sourcePath);
        if (!fullPath) {
            return null;
        }
        const staticMarkup = await fs.readFile(fullPath, "utf8");

        let resolved = null;
        try {
            resolved = await this.resolveCmsBindingData(binding);
        } catch (err) {
            logErr.writeLog(err, {
                customKey: "CMS_BINDING_RESOLVE_FAILED",
                context: { sourcePath, collection: binding.collection }
            });
            return staticMarkup;
        }

        if (!resolved) {
            return staticMarkup;
        }

        try {
            const fragment = parse5.parseFragment(staticMarkup);
            const root = this.getElementNodes(fragment)[0] || null;
            if (!root) {
                return staticMarkup;
            }

            if (resolved.mode === "record" && resolved.record) {
                this.applyCmsDataToAst(root, resolved.record);
            } else if (resolved.mode === "collection") {
                const groupedApplied = Array.isArray(resolved.groups) && resolved.groups.length > 0
                    ? this.applyCmsGroupedCollectionRenderingToAst(root, resolved.groups)
                    : false;
                if (!groupedApplied && Array.isArray(resolved.items) && resolved.items.length > 0) {
                    const repeatedApplied = this.applyCmsCollectionRenderingToAst(root, resolved.items);
                    const sequenceApplied = repeatedApplied ? true : this.applyCmsTemplateSequenceRenderingToAst(root, resolved.items);
                    if (!sequenceApplied) {
                        return staticMarkup;
                    }
                }
            }

            return parse5.serialize(fragment);
        } catch (err) {
            logErr.writeLog(err, {
                customKey: "CMS_BINDING_RENDER_FAILED",
                context: { sourcePath, collection: binding.collection }
            });
            return staticMarkup;
        }
    }

    async renderCmsViewBlock(item = {}) {
        try {
            const result = await this.previewCmsView(item.viewId || item.props?.viewId, {
                displayId: item.displayId || item.props?.displayId
            });
            const display = result.display || {};
            const entries = Array.isArray(result.entries) ? result.entries : [];
            const title = item.name || result.view?.label || "View";
            const rows = entries.map((entry) => {
                const data = entry.data || {};
                const heading = data.title || data.heading || data.name || entry.entryKey || "Untitled";
                const summary = data.summary || data.description || data.body || "";
                const href = data.detail_url || data.detailUrl || data.url || "";
                const headingHtml = href
                    ? `<a href="${this.escapeHtmlAttribute(href)}">${this.escapeHtml(String(heading))}</a>`
                    : this.escapeHtml(String(heading));
                return `<article class="cms-view-item" data-entry-key="${this.escapeHtmlAttribute(entry.entryKey || "")}">
  <h3>${headingHtml}</h3>
  ${summary ? `<p>${this.escapeHtml(String(summary))}</p>` : ""}
</article>`;
            }).join("\n");

            return `<section class="cms-view-block" data-view-id="${this.escapeHtmlAttribute(result.view?.viewId || item.viewId || "")}" data-display-id="${this.escapeHtmlAttribute(display.displayId || item.displayId || "")}">
  <div class="cms-view-block__header">
    <span>${this.escapeHtml(display.label || display.type || "Block")}</span>
    <h2>${this.escapeHtml(title)}</h2>
  </div>
  <div class="cms-view-block__items">${rows || '<p class="cms-view-empty">No matching content.</p>'}</div>
</section>`;
        } catch (err) {
            logErr.writeLog(err, {
                customKey: "CMS_VIEW_BLOCK_RENDER_FAILED",
                context: { viewId: item.viewId || item.props?.viewId, displayId: item.displayId || item.props?.displayId }
            });
            return typeof item?.renderedContent === "string" && item.renderedContent.trim().length > 0
                ? item.renderedContent
                : `<section class="cms-view-block cms-view-block--fallback"><p>View data unavailable.</p></section>`;
        }
    }

    escapeHtml(value = "") {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    escapeHtmlAttribute(value = "") {
        return this.escapeHtml(value);
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

    async listCmsCollections() {
        const publishedPath = path.join(this.cmsExportPath, "collections", "index.json");
        if (await fs.pathExists(publishedPath)) {
            const published = await fs.readJson(publishedPath);
            const items = Array.isArray(published?.collections) ? published.collections : [];
            return items;
        }

        if (this.cmsReadMode === "live" && this.cmsBaseUrl) {
            const result = await this.fetchLiveCmsJson("/api/cms/collections");
            return Array.isArray(result?.data) ? result.data : [];
        }

        return [];
    }

    async listCmsEntries(collectionSlug) {
        const safeCollectionSlug = this.sanitizeCmsSlug(collectionSlug);
        const publishedPath = path.join(this.cmsExportPath, "entries", `${safeCollectionSlug}.json`);
        if (safeCollectionSlug && await fs.pathExists(publishedPath)) {
            const published = await fs.readJson(publishedPath);
            const items = Array.isArray(published?.entries) ? published.entries : [];
            return items.map((entry) => ({
                id: entry.id,
                collection: safeCollectionSlug,
                entryKey: entry.entryKey,
                status: entry.status,
                sortOrder: entry.sortOrder,
                data: entry.data || {},
                createdAt: entry.createdAt,
                updatedAt: entry.updatedAt
            }));
        }

        if (this.cmsReadMode === "live" && this.cmsBaseUrl && safeCollectionSlug) {
            const result = await this.fetchLiveCmsJson(`/api/cms/entries?collection=${encodeURIComponent(safeCollectionSlug)}`);
            return Array.isArray(result?.data) ? result.data : [];
        }

        return [];
    }

    async listCmsViews() {
        const viewDirs = [
            path.join(this.cmsExportPath, "views"),
            path.resolve(this.projectRoot, "themes", "theme-3", "views")
        ];
        const views = [];
        const seen = new Set();

        for (const viewDir of viewDirs) {
            if (!await fs.pathExists(viewDir)) {
                continue;
            }
            const files = await glob(path.join(viewDir, "*.json").replace(/\\/g, "/"));
            for (const file of files) {
                try {
                    const view = await fs.readJson(file);
                    const normalized = this.normalizeCmsViewRecord(view);
                    if (normalized.viewId && !seen.has(normalized.viewId)) {
                        seen.add(normalized.viewId);
                        views.push(normalized);
                    }
                } catch (err) {
                    logErr.writeLog(err, {
                        customKey: "BUILDER_CMS_VIEW_READ_FAILED",
                        context: { file }
                    });
                }
            }
        }

        if (views.length > 0) {
            return views;
        }

        const cmsDatabasePath = (await Promise.all([
            path.resolve(this.cmsProjectRoot, "theme-cms", "data", "cms.sqlite"),
            path.resolve(this.cmsProjectRoot, "data", "cms.sqlite")
        ].map(async (candidate) => await fs.pathExists(candidate) ? candidate : null))).find(Boolean);
        if (cmsDatabasePath) {
            const rows = await this.readCmsDbAll(
                cmsDatabasePath,
                `SELECT view_id AS viewId, label, description, collection_slug AS collection,
                    query_json AS queryJson, displays_json AS displaysJson, created_at AS createdAt, updated_at AS updatedAt
                 FROM cms_views
                 ORDER BY updated_at DESC, label COLLATE NOCASE ASC`
            ).catch(() => []);
            return rows.map((row) => this.normalizeCmsViewRecord({
                ...row,
                query: this.parseJsonRecord(row.queryJson, {}),
                displays: this.parseJsonRecord(row.displaysJson, [])
            }));
        }

        if (this.cmsReadMode === "live" && this.cmsBaseUrl) {
            const result = await this.fetchLiveCmsJson("/api/cms/views");
            return Array.isArray(result?.data) ? result.data.map((view) => this.normalizeCmsViewRecord(view)) : [];
        }

        return [];
    }

    async getCmsView(viewId) {
        const safeViewId = this.sanitizeCmsSlug(viewId);
        if (!safeViewId) {
            throw this.createActionableError("Invalid View ID", 400, "CMS_VIEW_ID_INVALID", { viewId });
        }
        const views = await this.listCmsViews();
        const view = views.find((item) => item.viewId === safeViewId);
        if (!view) {
            throw this.createActionableError("CMS View not found", 404, "CMS_VIEW_NOT_FOUND", { viewId: safeViewId });
        }
        return view;
    }

    async previewCmsView(viewId, options = {}) {
        const safeViewId = this.sanitizeCmsSlug(viewId);
        const displayId = this.sanitizeCmsSlug(options.displayId || options.display || "");
        if (this.cmsReadMode === "live" && this.cmsBaseUrl) {
            const result = await this.fetchLiveCmsJson(`/api/cms/views/${encodeURIComponent(safeViewId)}/preview`, {
                method: "POST",
                body: { displayId }
            });
            if (result?.data) {
                return result.data;
            }
        }

        const view = await this.getCmsView(safeViewId);
        const display = displayId
            ? view.displays.find((item) => item.displayId === displayId)
            : view.displays[0] || null;
        if (displayId && !display) {
            throw this.createActionableError(
                "CMS View display not found",
                404,
                "CMS_VIEW_DISPLAY_NOT_FOUND",
                { viewId: safeViewId, displayId }
            );
        }
        const entries = this.applyCmsViewQuery(await this.listCmsEntries(view.collection), view.query);
        const collection = (await this.listCmsCollections()).find((item) => item.slug === view.collection) || null;
        return {
            view,
            display,
            collection,
            count: entries.length,
            entries
        };
    }

    async fetchLiveCmsJson(endpoint, options = {}) {
        const baseUrl = String(this.cmsBaseUrl || "").replace(/\/+$/, "");
        if (!baseUrl || typeof fetch !== "function") {
            return null;
        }

        const fetchOptions = {};
        if (options.method) {
            fetchOptions.method = options.method;
        }
        if (options.body !== undefined) {
            fetchOptions.headers = { "Content-Type": "application/json" };
            fetchOptions.body = JSON.stringify(options.body || {});
        }
        const response = await fetch(`${baseUrl}${endpoint}`, fetchOptions);
        const result = await response.json();
        if (!response.ok || !result?.success) {
            const err = new Error(result?.error || `CMS request failed: ${endpoint}`);
            err.statusCode = response.status || 502;
            err.code = "CMS_LIVE_READ_FAILED";
            throw err;
        }
        return result;
    }

    readCmsDbAll(databasePath, sql, params = []) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(databasePath, (openErr) => {
                if (openErr) {
                    reject(openErr);
                    return;
                }
                db.all(sql, params, (err, rows) => {
                    db.close();
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(rows || []);
                });
            });
        });
    }

    normalizeCmsViewRecord(view = {}) {
        return {
            viewId: this.sanitizeCmsSlug(view.viewId || view.id || view.view_id || ""),
            label: String(view.label || view.name || view.viewId || "").trim(),
            description: String(view.description || "").trim(),
            collection: this.sanitizeCmsSlug(view.collection || view.collectionSlug || view.collection_slug || ""),
            query: view.query && typeof view.query === "object" && !Array.isArray(view.query) ? view.query : {},
            displays: Array.isArray(view.displays)
                ? view.displays.map((display) => ({
                    displayId: this.sanitizeCmsSlug(display.displayId || display.id || display.display_id || ""),
                    label: String(display.label || display.name || display.displayId || display.id || "").trim(),
                    type: String(display.type || "block").trim().toLowerCase(),
                    route: String(display.route || "").trim(),
                    config: display.config && typeof display.config === "object" && !Array.isArray(display.config) ? display.config : {}
                })).filter((display) => display.displayId)
                : [],
            validation: view.validation || null,
            createdAt: view.createdAt || null,
            updatedAt: view.updatedAt || null
        };
    }

    getCmsViewEntryField(entry = {}, fieldName = "") {
        const normalized = String(fieldName || "").replace(/-/g, "").toLowerCase();
        if (normalized === "entrykey") return entry.entryKey;
        if (normalized === "status") return entry.status;
        if (normalized === "sortorder") return entry.sortOrder;
        if (normalized === "updatedat") return entry.updatedAt;
        return entry.data?.[fieldName];
    }

    compareCmsViewValues(left, right) {
        const leftNumber = Number(left);
        const rightNumber = Number(right);
        if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) {
            return leftNumber - rightNumber;
        }
        return String(left ?? "").localeCompare(String(right ?? ""), undefined, {
            numeric: true,
            sensitivity: "base"
        });
    }

    applyCmsViewQuery(entries = [], query = {}) {
        const status = String(query.status || "published").toLowerCase();
        const filters = query.filters && typeof query.filters === "object" && !Array.isArray(query.filters)
            ? query.filters
            : {};
        const sorted = entries
            .filter((entry) => status === "any" || String(entry.status || "").toLowerCase() === status)
            .filter((entry) => Object.entries(filters).every(([fieldName, expected]) => {
                const value = this.getCmsViewEntryField(entry, fieldName);
                if (Array.isArray(expected)) {
                    return expected.some((item) => String(item) === String(value));
                }
                if (expected && typeof expected === "object" && !Array.isArray(expected)) {
                    if (expected.operator === "contains") {
                        return String(value ?? "").toLowerCase().includes(String(expected.value ?? "").toLowerCase());
                    }
                    if (expected.operator === "not") {
                        return String(value) !== String(expected.value);
                    }
                    return String(value) === String(expected.value);
                }
                return String(value) === String(expected);
            }))
            .sort((left, right) => {
                for (const sortItem of query.sort || []) {
                    const comparison = this.compareCmsViewValues(
                        this.getCmsViewEntryField(left, sortItem.field),
                        this.getCmsViewEntryField(right, sortItem.field)
                    );
                    if (comparison !== 0) {
                        return sortItem.direction === "desc" ? -comparison : comparison;
                    }
                }
                return Number(left.sortOrder || 0) - Number(right.sortOrder || 0)
                    || String(left.entryKey || "").localeCompare(String(right.entryKey || ""));
            });
        const offset = Number.isFinite(Number(query.offset)) ? Math.max(0, Number(query.offset)) : 0;
        const limit = Number.isFinite(Number(query.limit)) ? Math.max(0, Number(query.limit)) : sorted.length;
        return sorted.slice(offset, limit ? offset + limit : undefined);
    }

    getTemplateRegionIds(template = {}) {
        const regions = template.regions && typeof template.regions === "object" && !Array.isArray(template.regions)
            ? Object.keys(template.regions).map((region) => this.normalizeBuilderRegionId(region))
            : [];
        const defaultBlocks = template.defaultBlocks && typeof template.defaultBlocks === "object" && !Array.isArray(template.defaultBlocks)
            ? Object.keys(template.defaultBlocks).map((region) => this.normalizeBuilderRegionId(region))
            : [];
        return Array.from(new Set([...regions, ...defaultBlocks]));
    }

    normalizeBuilderRegionId(value, fallback = "main") {
        const aliases = {
            main_content: "main",
            content_main: "main",
            body: "main",
            page_body: "main",
            side_nav: "side-navigation",
            side_navigation: "side-navigation",
            sidenav: "side-navigation",
            sidebar: "side-navigation",
            side: "side-navigation",
            content_above: "content-above",
            contentabove: "content-above",
            above_content: "content-above",
            content_below: "content-below",
            contentbelow: "content-below",
            below_content: "content-below"
        };
        const allowed = new Set(["header", "hero", "side-navigation", "content-above", "main", "content-below", "footer"]);
        const normalizeToken = (input) => String(input || "")
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_")
            .replace(/^_+|_+$/g, "");
        const raw = normalizeToken(value);
        const firstToken = raw.includes("_") ? raw.split("_")[0] : raw;
        const normalized = aliases[raw] || aliases[firstToken] || raw;
        if (allowed.has(normalized)) {
            return normalized;
        }
        const fallbackRaw = normalizeToken(fallback);
        const fallbackRegion = aliases[fallbackRaw] || fallbackRaw || "main";
        return allowed.has(fallbackRegion) ? fallbackRegion : "main";
    }

    normalizeRegionRecordMap(input = {}) {
        return Object.entries(input).reduce((acc, [regionId, value]) => {
            const normalized = this.normalizeBuilderRegionId(regionId);
            acc[normalized] = {
                ...(typeof value === "object" && value !== null && !Array.isArray(value) ? value : {}),
                id: normalized
            };
            return acc;
        }, {});
    }

    normalizeRegionBlocksMap(input = {}) {
        return Object.entries(input).reduce((acc, [regionId, blocks]) => {
            const normalized = this.normalizeBuilderRegionId(regionId);
            const list = Array.isArray(blocks) ? blocks : [];
            acc[normalized] = [
                ...(acc[normalized] || []),
                ...list.map((block) => ({ ...block, region: this.normalizeBuilderRegionId(block.region || normalized) }))
            ];
            return acc;
        }, {});
    }

    normalizeLayoutRegionModel(input = {}) {
        const next = JSON.parse(JSON.stringify(input || {}));
        if (next.regions && typeof next.regions === "object" && !Array.isArray(next.regions)) {
            const normalizedRegions = {};
            Object.entries(next.regions).forEach(([regionId, blocks]) => {
                const normalized = this.normalizeBuilderRegionId(regionId);
                const list = Array.isArray(blocks) ? blocks : [];
                normalizedRegions[normalized] = [
                    ...(normalizedRegions[normalized] || []),
                    ...list.map((block, index) => ({
                        ...block,
                        region: this.normalizeBuilderRegionId(block.region || normalized),
                        order: Number.isFinite(Number(block.order)) ? Number(block.order) : index + 1
                    }))
                ];
            });
            next.regions = normalizedRegions;
        }
        if (Array.isArray(next.layout)) {
            next.layout = next.layout.map((block) => ({
                ...block,
                region: this.normalizeBuilderRegionId(block.region, block.region || "main")
            }));
        } else if (next.regions && typeof next.regions === "object" && !Array.isArray(next.regions)) {
            next.layout = Object.values(next.regions).flatMap((blocks) => Array.isArray(blocks) ? blocks : []);
        }
        return next;
    }

    async validateViewBlocks(layoutData = {}) {
        const blocks = Array.isArray(layoutData.layout) ? layoutData.layout : [];
        const viewBlocks = blocks.filter((block) => block?.type === "view");
        if (viewBlocks.length === 0) {
            return;
        }
        const views = await this.listCmsViews();
        const allowedRegions = new Set(["main", "side-navigation", "content-above", "content-below", "hero"]);
        viewBlocks.forEach((block, index) => {
            const viewId = this.sanitizeCmsSlug(block.viewId || block.props?.viewId || "");
            const displayId = this.sanitizeCmsSlug(block.displayId || block.props?.displayId || "");
            const region = this.normalizeBuilderRegionId(block.region, "main");
            const view = views.find((item) => item.viewId === viewId);
            const display = view?.displays?.find((item) => item.displayId === displayId);

            if (!view) {
                throw this.createActionableError(
                    `View block references missing View: ${viewId || "unknown"}`,
                    400,
                    "VIEW_BLOCK_VIEW_NOT_FOUND",
                    { index, viewId }
                );
            }
            if (!display) {
                throw this.createActionableError(
                    `View block references missing display: ${displayId || "unknown"}`,
                    400,
                    "VIEW_BLOCK_DISPLAY_NOT_FOUND",
                    { index, viewId, displayId }
                );
            }
            if ((display.type || "block") !== "block") {
                throw this.createActionableError(
                    "View block display must be a block display",
                    400,
                    "VIEW_BLOCK_DISPLAY_TYPE_INVALID",
                    { index, viewId, displayId, displayType: display.type }
                );
            }
            if (!allowedRegions.has(region)) {
                throw this.createActionableError(
                    `View block cannot be placed in region: ${region}`,
                    400,
                    "VIEW_BLOCK_REGION_INVALID",
                    { index, viewId, displayId, region }
                );
            }
        });
    }

    normalizeTemplateRecord(input = {}) {
        const rawId = input.templateId || input.id || input.label || "template";
        const templateId = this.sanitizePageName(rawId, "template");
        const label = String(input.label || input.name || templateId).trim() || templateId;
        const routePattern = String(input.routePattern || input.route || "").trim();
        const contentType = this.sanitizeCmsSlug(input.contentType || input.content_type || "", "");
        const layoutId = String(input.layoutId || input.layout_id || "").trim();
        const lockedRegions = Array.isArray(input.lockedRegions)
            ? input.lockedRegions.map((region) => this.normalizeBuilderRegionId(region)).filter(Boolean)
            : [];
        const regions = input.regions && typeof input.regions === "object" && !Array.isArray(input.regions)
            ? this.normalizeRegionRecordMap(input.regions)
            : {};
        const defaultBlocks = input.defaultBlocks && typeof input.defaultBlocks === "object" && !Array.isArray(input.defaultBlocks)
            ? this.normalizeRegionBlocksMap(input.defaultBlocks)
            : {};

        return {
            templateId,
            label,
            description: String(input.description || "").trim(),
            routePattern,
            contentType,
            layoutId,
            regions,
            defaultBlocks,
            lockedRegions,
            createdAt: input.createdAt || null,
            updatedAt: input.updatedAt || null
        };
    }

    async validateTemplateRecord(template) {
        const warnings = [];
        const errors = [];
        const requiredRegions = ["header", "main", "footer"];
        const allowedRegions = new Set(["header", "hero", "side-navigation", "content-above", "main", "content-below", "footer"]);

        if (!template.routePattern) {
            errors.push({ code: "TEMPLATE_ROUTE_MISSING", message: "Template route pattern is required." });
        }
        if (template.routePattern && template.routePattern.includes(":") && !template.contentType) {
            errors.push({ code: "TEMPLATE_CONTENT_TYPE_MISSING", message: "Dynamic routes need a content type." });
        }
        if (!template.layoutId) {
            errors.push({ code: "TEMPLATE_LAYOUT_MISSING", message: "Template layout ID is required." });
        } else {
            try {
                await this.getSavedLayout(template.layoutId);
            } catch (err) {
                errors.push({ code: "TEMPLATE_LAYOUT_NOT_FOUND", message: `Layout not found: ${template.layoutId}.` });
            }
        }

        const regionIds = this.getTemplateRegionIds(template);
        requiredRegions.forEach((regionId) => {
            const blocks = Array.isArray(template.defaultBlocks?.[regionId]) ? template.defaultBlocks[regionId] : [];
            if (!regionIds.includes(regionId) && blocks.length === 0) {
                warnings.push({ code: "TEMPLATE_REQUIRED_REGION_EMPTY", message: `Required region has no defaults: ${regionId}.` });
            }
        });

        template.lockedRegions.forEach((regionId) => {
            if (!allowedRegions.has(regionId)) {
                errors.push({ code: "TEMPLATE_LOCKED_REGION_INVALID", message: `Locked region is not supported: ${regionId}.` });
            }
            if (!regionIds.includes(regionId)) {
                errors.push({ code: "TEMPLATE_LOCKED_REGION_MISSING", message: `Locked region is not defined: ${regionId}.` });
            }
        });

        Object.entries(template.defaultBlocks || {}).forEach(([regionId, blocks]) => {
            if (!allowedRegions.has(regionId)) {
                errors.push({ code: "TEMPLATE_REGION_UNSUPPORTED", message: `Unsupported default block region: ${regionId}.` });
                return;
            }
            const list = Array.isArray(blocks) ? blocks : [];
            list.forEach((block, index) => {
                const sourcePath = block.componentPath || block.partial || "";
                const inferred = sourcePath ? this.inferAllowedRegionsForComponent(sourcePath, block.type || "partial") : [];
                if (inferred.length > 0 && !inferred.includes(regionId)) {
                    errors.push({
                        code: "TEMPLATE_DEFAULT_BLOCK_REGION_UNSUPPORTED",
                        message: `Default block ${sourcePath || index + 1} is not supported in ${regionId}.`
                    });
                }
            });
        });

        const collections = await this.listCmsCollections();
        const collectionMap = new Map(collections.map((collection) => [collection.slug, collection]));
        const blocks = Object.values(template.defaultBlocks || {}).flatMap((value) => Array.isArray(value) ? value : []);
        for (const block of blocks) {
            const binding = block?.props?.cmsBinding || block?.cmsBinding;
            if (!binding || binding.source !== "cms" || !binding.collection) {
                continue;
            }
            const collection = collectionMap.get(binding.collection);
            if (!collection) {
                errors.push({ code: "TEMPLATE_BINDING_COLLECTION_MISSING", message: `Binding collection missing: ${binding.collection}.` });
                continue;
            }
            const fields = Array.isArray(collection?.schema?.fields) ? collection.schema.fields.map((field) => field.name) : [];
            Object.values(binding.fieldMap || {}).forEach((fieldName) => {
                if (fieldName && !fields.includes(fieldName)) {
                    errors.push({ code: "TEMPLATE_BINDING_FIELD_MISSING", message: `Mapped field missing: ${binding.collection}.${fieldName}.` });
                }
            });
        }

        return {
            status: errors.length ? "error" : warnings.length ? "warning" : "valid",
            errors,
            warnings
        };
    }

    inferAllowedRegionsForComponent(componentPath = "", type = "partial") {
        if (type === "micro") {
            return ["main", "side-navigation", "content-above", "content-below", "hero"];
        }
        const pathValue = String(componentPath || "").toLowerCase();
        if (/(^|\/)(header|navbar|nav)(\.|\/|$)/.test(pathValue) || pathValue.includes("landmark/header")) return ["header"];
        if (pathValue.includes("footer") || pathValue.includes("landmark/footer")) return ["footer"];
        if (pathValue.includes("hero") || pathValue.includes("marquee")) return ["hero", "content-above", "main"];
        if (pathValue.includes("side") || pathValue.includes("sidebar") || pathValue.includes("navigation")) return ["side-navigation", "main"];
        if (pathValue.includes("cta")) return ["content-below", "main"];
        return ["main", "content-above", "content-below"];
    }

    async enrichTemplateRecord(template) {
        const validation = await this.validateTemplateRecord(template);
        const regionIds = this.getTemplateRegionIds(template);
        return {
            ...template,
            regionsCount: regionIds.length,
            validation
        };
    }

    async listTemplates() {
        const rows = await this.dbAll(`
            SELECT template_json AS templateJson
            FROM builder_templates
            ORDER BY datetime(updated_at) DESC
        `);
        const templates = rows.map((row) => this.normalizeTemplateRecord(JSON.parse(row.templateJson)));
        return Promise.all(templates.map((template) => this.enrichTemplateRecord(template)));
    }

    async getTemplate(templateId) {
        const safeTemplateId = this.sanitizePageName(templateId, "");
        if (!safeTemplateId) {
            throw this.createActionableError("Invalid template ID", 400, "INVALID_TEMPLATE_ID", { templateId });
        }
        const row = await this.dbGet(
            "SELECT template_json AS templateJson FROM builder_templates WHERE template_id = ?",
            [safeTemplateId]
        );
        if (!row) {
            throw this.createActionableError("Template not found", 404, "TEMPLATE_NOT_FOUND", { templateId: safeTemplateId });
        }
        return this.enrichTemplateRecord(this.normalizeTemplateRecord(JSON.parse(row.templateJson)));
    }

    async saveTemplate(input = {}) {
        const normalized = this.normalizeTemplateRecord(input);
        const existing = await this.dbGet(
            "SELECT template_json AS templateJson FROM builder_templates WHERE template_id = ?",
            [normalized.templateId]
        );
        const now = new Date().toISOString();
        const payload = {
            ...normalized,
            createdAt: normalized.createdAt || (existing ? JSON.parse(existing.templateJson).createdAt : now),
            updatedAt: now
        };
        const validation = await this.validateTemplateRecord(payload);
        const serialized = JSON.stringify(payload);
        await this.dbRun(
            `
                INSERT INTO builder_templates (
                    template_id, label, route_pattern, content_type,
                    layout_id, template_json, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(template_id) DO UPDATE SET
                    label = excluded.label,
                    route_pattern = excluded.route_pattern,
                    content_type = excluded.content_type,
                    layout_id = excluded.layout_id,
                    template_json = excluded.template_json,
                    updated_at = excluded.updated_at
            `,
            [
                payload.templateId,
                payload.label,
                payload.routePattern,
                payload.contentType,
                payload.layoutId,
                serialized,
                payload.createdAt,
                payload.updatedAt
            ]
        );
        return {
            ...payload,
            regionsCount: this.getTemplateRegionIds(payload).length,
            validation
        };
    }

    async deleteTemplate(templateId) {
        const safeTemplateId = this.sanitizePageName(templateId, "");
        if (!safeTemplateId) {
            throw this.createActionableError("Invalid template ID", 400, "INVALID_TEMPLATE_ID", { templateId });
        }
        const result = await this.dbRun("DELETE FROM builder_templates WHERE template_id = ?", [safeTemplateId]);
        if (!result || result.changes === 0) {
            throw this.createActionableError("Template not found", 404, "TEMPLATE_NOT_FOUND", { templateId: safeTemplateId });
        }
        return { templateId: safeTemplateId };
    }

    mergeTemplateDefaultsIntoLayout(layoutData, template, previewEntry = null) {
        const next = this.normalizeLayoutRegionModel(layoutData || {});
        const regions = next.regions && typeof next.regions === "object" && !Array.isArray(next.regions)
            ? next.regions
            : {};
        Object.entries(template.defaultBlocks || {}).forEach(([regionId, blocks]) => {
            if (!Array.isArray(blocks) || blocks.length === 0) {
                return;
            }
            regions[regionId] = blocks.map((block, index) => ({
                ...block,
                region: regionId,
                order: index + 1,
                locked: template.lockedRegions.includes(regionId) || Boolean(block.locked)
            }));
        });
        next.regions = regions;
        next.layout = Object.values(regions).flatMap((blocks) => Array.isArray(blocks) ? blocks : []);
        next.meta = {
            ...(next.meta || {}),
            templateId: template.templateId,
            templatePreviewEntry: previewEntry ? { entryKey: previewEntry.entryKey, collection: previewEntry.collection } : null
        };
        if (previewEntry && template.contentType) {
            next.layout = next.layout.map((block) => {
                const binding = block?.props?.cmsBinding || block?.cmsBinding;
                if (!binding || binding.source !== "cms" || binding.collection !== template.contentType) {
                    return block;
                }
                return {
                    ...block,
                    props: {
                        ...(block.props || {}),
                        cmsBinding: {
                            ...binding,
                            mode: "record",
                            selection: {
                                ...(binding.selection || {}),
                                filter: {
                                    ...((binding.selection && binding.selection.filter) || {}),
                                    entryKey: previewEntry.entryKey
                                }
                            }
                        }
                    }
                };
            });
            next.regions = Object.fromEntries(Object.entries(regions).map(([regionId, blocks]) => [
                regionId,
                (Array.isArray(blocks) ? blocks : []).map((block) => {
                    const blockId = block.id || "";
                    const blockInstanceId = block.instanceId || "";
                    return next.layout.find((entry) => {
                        return (blockId && entry.id === blockId) || (blockInstanceId && entry.instanceId === blockInstanceId);
                    }) || block;
                })
            ]));
        }
        return next;
    }

    async previewTemplate(templateId, options = {}) {
        const template = await this.getTemplate(templateId);
        const layoutData = await this.getSavedLayout(template.layoutId);
        let previewEntry = null;
        if (template.contentType && options.entryKey) {
            const entries = await this.listCmsEntries(template.contentType);
            previewEntry = entries.find((entry) => entry.entryKey === options.entryKey) || null;
        }
        const mergedLayout = this.mergeTemplateDefaultsIntoLayout(layoutData, template, previewEntry);
        const pageName = this.sanitizePageName(`template-preview-${template.templateId}`, "template-preview");
        const pagePath = await this.createPageFromLayout(mergedLayout, pageName);
        const html = await fs.readFile(pagePath, "utf8");
        return {
            template,
            entry: previewEntry,
            pagePath,
            html
        };
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
     * Scan all active theme partials, falling back to html/partials.
     * @returns {Promise<Array>} Array of partial file objects
     */
    async scanPartials() {
        this.initPartialsSlice();
        return this.partialsService.scanPartials();
    }

    async scanMicroComponents() {
        this.initPartialsSlice();
        return this.partialsService.scanMicroComponents();
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
        if (item?.type === "view") {
            if (!this.sanitizeCmsSlug(item.viewId || item.props?.viewId || "")) {
                throw this.createActionableError(
                    "View block requires a valid viewId",
                    400,
                    "VIEW_BLOCK_VIEW_ID_REQUIRED",
                    { index, itemId: item.id }
                );
            }
            if (!this.sanitizeCmsSlug(item.displayId || item.props?.displayId || "")) {
                throw this.createActionableError(
                    "View block requires a valid displayId",
                    400,
                    "VIEW_BLOCK_DISPLAY_ID_REQUIRED",
                    { index, itemId: item.id, viewId: item.viewId || item.props?.viewId }
                );
            }
            return;
        }

        const sourcePath = item.componentPath || item.partial;
        if (!sourcePath || typeof sourcePath !== "string") {
            throw this.createActionableError(
                "Invalid component path in layout item",
                400,
                "INVALID_COMPONENT_PATH",
                { index, itemId: item.id, sourcePath }
            );
        }

        const fullPath = this.resolveComponentSourcePathSync(sourcePath);
        if (!fullPath) {
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
            const normalizedLayoutData = this.normalizeLayoutRegionModel(layoutData);
            this.validateLayoutData(normalizedLayoutData);
            await this.validateViewBlocks(normalizedLayoutData);
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
                ...normalizedLayoutData,
                pageName: safePageName,
                meta: {
                    version: 1,
                    ...(normalizedLayoutData?.meta || {}),
                    createdAt: normalizedLayoutData?.meta?.createdAt || now,
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
            this.app.get("/api/builder/config", (req, res) => {
                res.json({ success: true, data: this.getPublicRuntimeConfig() });
            });
            this.app.get("/api/builder/cms/collections", async (req, res) => {
                try {
                    const items = await this.listCmsCollections();
                    res.json({ success: true, data: items });
                } catch (err) {
                    this.sendError(res, err, "BUILDER_CMS_COLLECTIONS_READ_FAILED");
                }
            });
            this.app.get("/api/builder/cms/entries", async (req, res) => {
                try {
                    const collection = req.query?.collection;
                    if (!collection) {
                        return res.status(400).json({ success: false, error: "Missing collection parameter" });
                    }
                    const items = await this.listCmsEntries(collection);
                    res.json({ success: true, data: items });
                } catch (err) {
                    this.sendError(res, err, "BUILDER_CMS_ENTRIES_READ_FAILED");
                }
            });
            this.app.get("/api/builder/cms/views", async (req, res) => {
                try {
                    const views = await this.listCmsViews();
                    res.json({ success: true, data: views });
                } catch (err) {
                    this.sendError(res, err, "BUILDER_CMS_VIEWS_READ_FAILED");
                }
            });
            this.app.post("/api/builder/cms/views/:viewId/preview", async (req, res) => {
                try {
                    const preview = await this.previewCmsView(req.params.viewId, req.body || {});
                    res.json({ success: true, data: preview });
                } catch (err) {
                    this.sendError(res, err, "BUILDER_CMS_VIEW_PREVIEW_FAILED");
                }
            });
            this.app.use("/src/images", express.static(this.imagesPath));

            this.app.get("/api/templates", async (req, res) => {
                try {
                    const templates = await this.listTemplates();
                    res.json({ success: true, data: templates });
                } catch (err) {
                    this.sendError(res, err, "TEMPLATES_LIST_FAILED");
                }
            });
            this.app.get("/api/templates/:templateId", async (req, res) => {
                try {
                    const template = await this.getTemplate(req.params.templateId);
                    res.json({ success: true, data: template });
                } catch (err) {
                    this.sendError(res, err, "TEMPLATE_READ_FAILED");
                }
            });
            this.app.post("/api/templates", async (req, res) => {
                try {
                    const template = await this.saveTemplate(req.body || {});
                    res.json({ success: true, data: template });
                } catch (err) {
                    this.sendError(res, err, "TEMPLATE_SAVE_FAILED");
                }
            });
            this.app.delete("/api/templates/:templateId", async (req, res) => {
                try {
                    const deleted = await this.deleteTemplate(req.params.templateId);
                    res.json({ success: true, data: deleted });
                } catch (err) {
                    this.sendError(res, err, "TEMPLATE_DELETE_FAILED");
                }
            });
            this.app.post("/api/templates/:templateId/preview", async (req, res) => {
                try {
                    const preview = await this.previewTemplate(req.params.templateId, req.body || {});
                    res.json({ success: true, data: preview });
                } catch (err) {
                    this.sendError(res, err, "TEMPLATE_PREVIEW_FAILED");
                }
            });

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



