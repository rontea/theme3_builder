"use strict";

const fs = require("fs-extra");
const path = require("path");
const crypto = require("crypto");
const sqlite3 = require("sqlite3");
const { src, dest } = require("gulp");
const panini = require("panini");
const sass = require("sass");

const {
    createActionableError,
    sanitizeCmsSlug,
    sanitizeCmsEntryKey,
    normalizeCmsSchema,
    normalizeCmsEntryData,
    normalizeCmsFormDefinition,
    normalizeCmsViewRecord,
    parseJsonRecord
} = require("../utils/cms-utils");

function sanitizeFileName(value, fallback = "asset") {
    const raw = String(value || fallback).trim();
    const ext = path.extname(raw).toLowerCase().replace(/[^a-z0-9.]/g, "");
    const base = path.basename(raw, path.extname(raw))
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/(^-+|-+$)/g, "") || fallback;
    return `${base}${ext}`;
}

function normalizeMediaRow(row, usedByCount = 0) {
    return {
        id: row.id,
        fileName: row.fileName,
        fileType: row.mimeType,
        mimeType: row.mimeType,
        sizeBytes: row.sizeBytes,
        url: row.url,
        thumbnailUrl: String(row.mimeType || "").startsWith("image/") ? row.url : null,
        dimensions: row.width && row.height ? { width: row.width, height: row.height } : null,
        usedByCount,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    };
}

function normalizeFormStatus(value) {
    const normalized = String(value || "").toLowerCase();
    return ["active", "draft", "archived"].includes(normalized) ? normalized : "draft";
}

function normalizeSubmissionStatus(value) {
    const normalized = String(value || "").toLowerCase();
    return ["new", "reviewed", "archived"].includes(normalized) ? normalized : "new";
}

function normalizeFormRow(row, counts = {}) {
    const definition = parseJsonRecord(row.definitionJson, { fields: [], settings: {} });
    return {
        id: row.id,
        slug: row.slug,
        name: row.name,
        status: row.status,
        definition,
        fields: Array.isArray(definition.fields) ? definition.fields : [],
        settings: definition.settings || {},
        submissions: Number(counts.total || 0),
        unread: Number(counts.unread || 0),
        lastActivity: counts.lastActivity || row.updatedAt,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    };
}

function normalizeViewRow(row, validation = null) {
    const view = normalizeCmsViewRecord({
        viewId: row.viewId,
        label: row.label,
        description: row.description,
        collection: row.collection,
        query: parseJsonRecord(row.queryJson, {}),
        displays: parseJsonRecord(row.displaysJson, []),
        createdAt: row.createdAt,
        updatedAt: row.updatedAt
    });
    return {
        ...view,
        validation
    };
}

function sortEntries(a, b) {
    const leftOrder = Number.isFinite(Number(a?.sortOrder)) ? Number(a.sortOrder) : 0;
    const rightOrder = Number.isFinite(Number(b?.sortOrder)) ? Number(b.sortOrder) : 0;
    if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
    }
    const leftId = Number.isFinite(Number(a?.id)) ? Number(a.id) : 0;
    const rightId = Number.isFinite(Number(b?.id)) ? Number(b.id) : 0;
    return leftId - rightId;
}

function createStatusFilter(options = {}) {
    const includeDrafts = Boolean(options.includeDrafts);
    const includeArchived = Boolean(options.includeArchived);
    return new Set([
        "published",
        ...(includeDrafts ? ["draft"] : []),
        ...(includeArchived ? ["archived"] : [])
    ]);
}

async function writeExportBundle(targetPath, bundle) {
    await fs.ensureDir(targetPath);
    await fs.emptyDir(targetPath);

    const collectionsDir = path.join(targetPath, "collections");
    const entriesDir = path.join(targetPath, "entries");
    await fs.ensureDir(collectionsDir);
    await fs.ensureDir(entriesDir);

    await fs.writeJson(path.join(targetPath, "manifest.json"), bundle.manifest, { spaces: 2 });
    await fs.writeJson(path.join(collectionsDir, "index.json"), { collections: bundle.collections }, { spaces: 2 });
    await fs.writeJson(path.join(entriesDir, "index.json"), { collections: bundle.entriesIndex }, { spaces: 2 });

    for (const item of bundle.collections) {
        const slug = item.slug;
        await fs.writeJson(path.join(collectionsDir, `${slug}.json`), item, { spaces: 2 });
        await fs.writeJson(
            path.join(entriesDir, `${slug}.json`),
            {
                collection: slug,
                generatedAt: bundle.generatedAt,
                count: bundle.entriesByCollection[slug].length,
                entries: bundle.entriesByCollection[slug]
            },
            { spaces: 2 }
        );
    }
}

function createCmsService(cmsRepository, options = {}) {
    const serviceConfig = options.config || cmsRepository?.config || {};

    return {
        getDefaultSettings() {
            return {
                projectName: "Theme 3 CMS",
                cmsBaseUrl: serviceConfig.cmsBaseUrl || "http://localhost:3100",
                cmsAdminUrl: serviceConfig.cmsAdminUrl || "http://localhost:3100/cms",
                builderPreviewUrl: serviceConfig.builderPreviewUrl || "http://localhost:3000",
                localStoragePath: serviceConfig.dataRoot || "",
                activeTheme: serviceConfig.activeTheme || "theme-3",
                activeThemePath: serviceConfig.activeThemePath || "",
                contentExportPath: serviceConfig.exportPath || "",
                themeExportPath: serviceConfig.themeExportPath || "",
                apiEndpoint: "http://localhost:3100/api",
                apiToken: ""
            };
        },

        async getSettings() {
            const defaults = this.getDefaultSettings();
            let stored = {};
            if (serviceConfig.settingsPath && await fs.pathExists(serviceConfig.settingsPath)) {
                stored = await fs.readJson(serviceConfig.settingsPath).catch(() => ({}));
            }
            const settings = normalizeSettingsPayload(stored, defaults);
            const validation = validateSettingsPayload(settings);
            const themes = await this.listThemes().catch(() => []);
            return {
                settings,
                validation,
                paths: {
                    projectRoot: serviceConfig.projectRoot,
                    cmsRoot: serviceConfig.cmsRoot,
                    dataRoot: serviceConfig.dataRoot,
                    databasePath: serviceConfig.databasePath,
                    uploadsPath: serviceConfig.uploadsPath,
                    exportPath: serviceConfig.exportPath,
                    themeExportPath: serviceConfig.themeExportPath,
                    activeThemePath: resolveActiveThemeInfo(serviceConfig, settings).themePath,
                    buildPath: serviceConfig.buildPath,
                    settingsPath: serviceConfig.settingsPath
                },
                themes
            };
        },

        async updateSettings(payload = {}) {
            const current = await this.getSettings();
            const settings = normalizeSettingsPayload(payload, current.settings);
            const validation = validateSettingsPayload(settings);
            if (!validation.valid) {
                throw createActionableError("Settings validation failed", 400, "CMS_SETTINGS_INVALID", validation);
            }
            await fs.ensureDir(path.dirname(serviceConfig.settingsPath));
            await fs.writeJson(serviceConfig.settingsPath, {
                ...settings,
                updatedAt: new Date().toISOString()
            }, { spaces: 2 });
            return {
                settings,
                validation
            };
        },

        async createContentSnapshot(options = {}) {
            const collections = await this.listCollections();
            const entriesByCollection = {};
            for (const collection of collections) {
                entriesByCollection[collection.slug] = await this.listEntries(collection.slug);
            }
            const forms = await this.listForms().catch(() => []);
            return {
                version: 1,
                generatedAt: new Date().toISOString(),
                includeDrafts: Boolean(options.includeDrafts),
                includeArchived: Boolean(options.includeArchived),
                collections,
                entriesByCollection,
                forms
            };
        },

        validateContentSnapshot(snapshot = {}) {
            const errors = [];
            const warnings = [];
            const collections = Array.isArray(snapshot.collections) ? snapshot.collections : [];
            const entriesByCollection = snapshot.entriesByCollection && typeof snapshot.entriesByCollection === "object"
                ? snapshot.entriesByCollection
                : {};

            if (collections.length === 0) {
                errors.push({ code: "IMPORT_COLLECTIONS_EMPTY", message: "Snapshot does not contain any collections." });
            }
            collections.forEach((collection) => {
                const slug = sanitizeCmsSlug(collection.slug);
                if (!slug) {
                    errors.push({ code: "IMPORT_COLLECTION_SLUG_INVALID", message: "A collection has an invalid slug." });
                }
                const schema = normalizeCmsSchema(collection.schema || {});
                if (!Array.isArray(schema.fields)) {
                    errors.push({ code: "IMPORT_COLLECTION_SCHEMA_INVALID", message: `Collection ${slug || "unknown"} has an invalid schema.` });
                }
                const entries = Array.isArray(entriesByCollection[collection.slug]) ? entriesByCollection[collection.slug] : [];
                entries.forEach((entry) => {
                    if (!sanitizeCmsEntryKey(entry.entryKey)) {
                        warnings.push({ code: "IMPORT_ENTRY_KEY_INVALID", message: `Collection ${slug} contains an entry with an invalid key.` });
                    }
                });
            });

            return {
                valid: errors.length === 0,
                errors,
                warnings,
                totals: {
                    collections: collections.length,
                    entries: Object.values(entriesByCollection).reduce((sum, entries) => sum + (Array.isArray(entries) ? entries.length : 0), 0)
                }
            };
        },

        async importContentSnapshot(snapshot = {}) {
            const validation = this.validateContentSnapshot(snapshot);
            if (!validation.valid) {
                throw createActionableError("Imported CMS snapshot is invalid", 400, "CMS_IMPORT_INVALID", validation);
            }

            const currentCollections = await this.listCollections();
            const collectionMap = new Map(currentCollections.map((collection) => [collection.slug, collection]));
            const summary = {
                collectionsCreated: 0,
                collectionsUpdated: 0,
                entriesCreated: 0,
                entriesUpdated: 0
            };

            for (const collection of snapshot.collections) {
                const safeSlug = sanitizeCmsSlug(collection.slug);
                const payload = {
                    slug: safeSlug,
                    name: collection.name || safeSlug,
                    schema: collection.schema || { fields: [] }
                };
                if (collectionMap.has(safeSlug)) {
                    await this.updateCollection(safeSlug, payload);
                    summary.collectionsUpdated += 1;
                } else {
                    await this.createCollection(payload);
                    summary.collectionsCreated += 1;
                }

                const existingEntries = await this.listEntries(safeSlug);
                const entryMap = new Map(existingEntries.map((entry) => [entry.entryKey, entry]));
                const entries = Array.isArray(snapshot.entriesByCollection?.[collection.slug])
                    ? snapshot.entriesByCollection[collection.slug]
                    : [];
                for (const entry of entries) {
                    const entryPayload = {
                        collection: safeSlug,
                        entryKey: entry.entryKey,
                        status: entry.status || "draft",
                        sortOrder: entry.sortOrder || 0,
                        data: entry.data || {}
                    };
                    const existing = entryMap.get(entry.entryKey);
                    if (existing) {
                        await this.updateEntry(existing.id, entryPayload);
                        summary.entriesUpdated += 1;
                    } else {
                        await this.createEntry(entryPayload);
                        summary.entriesCreated += 1;
                    }
                }
            }

            return {
                importedAt: new Date().toISOString(),
                validation,
                summary
            };
        },

        async listCollections() {
            const rows = await cmsRepository.dbAll(`
                SELECT
                    id,
                    slug,
                    name,
                    schema_json AS schemaJson,
                    created_at AS createdAt,
                    updated_at AS updatedAt
                FROM cms_collections
                ORDER BY name COLLATE NOCASE ASC, slug ASC
            `);

            return rows.map((row) => ({
                id: row.id,
                slug: row.slug,
                name: row.name,
                schema: parseJsonRecord(row.schemaJson, { fields: [] }),
                createdAt: row.createdAt,
                updatedAt: row.updatedAt
            }));
        },

        async createCollection({ slug, name, schema }) {
            const safeSlug = sanitizeCmsSlug(slug);
            const safeName = String(name || "").trim();
            if (!safeSlug) {
                throw createActionableError("Invalid collection slug", 400, "CMS_COLLECTION_SLUG_INVALID", { slug });
            }
            if (!safeName) {
                throw createActionableError("Collection name is required", 400, "CMS_COLLECTION_NAME_REQUIRED", { name });
            }

            const existing = await cmsRepository.dbGet("SELECT slug FROM cms_collections WHERE slug = ?", [safeSlug]);
            if (existing) {
                throw createActionableError(
                    `CMS collection already exists: ${safeSlug}`,
                    409,
                    "CMS_COLLECTION_EXISTS",
                    { slug: safeSlug }
                );
            }

            const normalizedSchema = normalizeCmsSchema(schema);
            const now = new Date().toISOString();
            const result = await cmsRepository.dbRun(
                `
                    INSERT INTO cms_collections (slug, name, schema_json, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                `,
                [safeSlug, safeName, JSON.stringify(normalizedSchema), now, now]
            );

            return {
                id: result.lastID,
                slug: safeSlug,
                name: safeName,
                schema: normalizedSchema,
                createdAt: now,
                updatedAt: now
            };
        },

        async updateCollection(slug, { name, schema }) {
            const safeSlug = sanitizeCmsSlug(slug);
            if (!safeSlug) {
                throw createActionableError("Invalid collection slug", 400, "CMS_COLLECTION_SLUG_INVALID", { slug });
            }

            const current = await cmsRepository.dbGet(
                "SELECT id, slug, name, schema_json AS schemaJson, created_at AS createdAt FROM cms_collections WHERE slug = ?",
                [safeSlug]
            );
            if (!current) {
                throw createActionableError("CMS collection not found", 404, "CMS_COLLECTION_NOT_FOUND", { slug: safeSlug });
            }

            const nextName = String(name || current.name || "").trim();
            if (!nextName) {
                throw createActionableError("Collection name is required", 400, "CMS_COLLECTION_NAME_REQUIRED", { name });
            }

            const nextSchema = schema === undefined
                ? parseJsonRecord(current.schemaJson, { fields: [] })
                : normalizeCmsSchema(schema);
            const now = new Date().toISOString();

            await cmsRepository.dbRun(
                `
                    UPDATE cms_collections
                    SET name = ?, schema_json = ?, updated_at = ?
                    WHERE slug = ?
                `,
                [nextName, JSON.stringify(nextSchema), now, safeSlug]
            );

            return {
                id: current.id,
                slug: safeSlug,
                name: nextName,
                schema: nextSchema,
                createdAt: current.createdAt,
                updatedAt: now
            };
        },

        async deleteCollection(slug) {
            const safeSlug = sanitizeCmsSlug(slug);
            if (!safeSlug) {
                throw createActionableError("Invalid collection slug", 400, "CMS_COLLECTION_SLUG_INVALID", { slug });
            }

            const existing = await cmsRepository.dbGet("SELECT slug FROM cms_collections WHERE slug = ?", [safeSlug]);
            if (!existing) {
                throw createActionableError("CMS collection not found", 404, "CMS_COLLECTION_NOT_FOUND", { slug: safeSlug });
            }

            const usage = await cmsRepository.dbGet("SELECT COUNT(*) AS count FROM cms_entries WHERE collection_slug = ?", [safeSlug]);
            const entryCount = Number(usage?.count || 0);
            if (entryCount > 0) {
                throw createActionableError(
                    "Cannot delete a CMS collection that still has entries",
                    409,
                    "CMS_COLLECTION_HAS_ENTRIES",
                    { slug: safeSlug, entryCount }
                );
            }

            await cmsRepository.dbRun("DELETE FROM cms_collections WHERE slug = ?", [safeSlug]);
            return { slug: safeSlug, deleted: true };
        },

        async listEntries(collectionSlug) {
            const safeCollectionSlug = sanitizeCmsSlug(collectionSlug);
            if (!safeCollectionSlug) {
                throw createActionableError(
                    "Missing collection parameter",
                    400,
                    "CMS_COLLECTION_REQUIRED",
                    { collectionSlug }
                );
            }

            const rows = await cmsRepository.dbAll(
                `
                    SELECT
                        id,
                        collection_slug AS collection,
                        entry_key AS entryKey,
                        status,
                        sort_order AS sortOrder,
                        data_json AS dataJson,
                        created_at AS createdAt,
                        updated_at AS updatedAt
                    FROM cms_entries
                    WHERE collection_slug = ?
                    ORDER BY sort_order ASC, id ASC
                `,
                [safeCollectionSlug]
            );

            return rows.map((row) => ({
                id: row.id,
                collection: row.collection,
                entryKey: row.entryKey,
                status: row.status,
                sortOrder: row.sortOrder,
                data: parseJsonRecord(row.dataJson, {}),
                createdAt: row.createdAt,
                updatedAt: row.updatedAt
            }));
        },

        async listPublicCollections() {
            const collections = await this.listCollections();
            return collections.map((collection) => ({
                slug: collection.slug,
                name: collection.name,
                schema: collection.schema,
                links: {
                    entries: `/api/content/${collection.slug}`
                }
            }));
        },

        async listPublicContent(collectionSlug, options = {}) {
            const collection = await this.listCollections()
                .then((collections) => collections.find((item) => item.slug === sanitizeCmsSlug(collectionSlug)));
            if (!collection) {
                throw createActionableError("CMS collection not found", 404, "CMS_COLLECTION_NOT_FOUND", { collection: collectionSlug });
            }

            const statusFilter = createStatusFilter({
                includeDrafts: Boolean(options.includeDrafts),
                includeArchived: Boolean(options.includeArchived)
            });
            const entries = await this.listEntries(collection.slug);
            const filteredEntries = entries
                .filter((entry) => statusFilter.has(String(entry.status || "").toLowerCase()))
                .sort(sortEntries)
                .map((entry) => ({
                    entryKey: entry.entryKey,
                    status: entry.status,
                    sortOrder: entry.sortOrder,
                    data: entry.data,
                    updatedAt: entry.updatedAt,
                    links: {
                        self: `/api/content/${collection.slug}/${entry.entryKey}`
                    }
                }));

            return {
                collection: {
                    slug: collection.slug,
                    name: collection.name,
                    schema: collection.schema
                },
                count: filteredEntries.length,
                entries: filteredEntries
            };
        },

        async getPublicContentEntry(collectionSlug, entryKey, options = {}) {
            const collection = sanitizeCmsSlug(collectionSlug);
            const key = sanitizeCmsEntryKey(entryKey);
            if (!collection || !key) {
                throw createActionableError("Invalid content endpoint parameters", 400, "CMS_PUBLIC_CONTENT_INVALID", { collectionSlug, entryKey });
            }

            const content = await this.listPublicContent(collection, options);
            const entry = content.entries.find((item) => item.entryKey === key);
            if (!entry) {
                throw createActionableError("CMS content entry not found", 404, "CMS_PUBLIC_CONTENT_NOT_FOUND", { collection, entryKey: key });
            }
            return {
                collection: content.collection,
                entry
            };
        },

        async listViews(options = {}) {
            const rows = await cmsRepository.dbAll(`
                SELECT
                    id,
                    view_id AS viewId,
                    label,
                    description,
                    collection_slug AS collection,
                    query_json AS queryJson,
                    displays_json AS displaysJson,
                    created_at AS createdAt,
                    updated_at AS updatedAt
                FROM cms_views
                ORDER BY label COLLATE NOCASE ASC, view_id ASC
            `);
            const views = rows.map((row) => normalizeViewRow(row));
            if (options.includeValidation === false) {
                return views;
            }
            return Promise.all(views.map((view) => this.enrichViewRecord(view)));
        },

        async getView(viewId, options = {}) {
            const safeViewId = sanitizeCmsSlug(viewId);
            if (!safeViewId) {
                throw createActionableError("Invalid View ID", 400, "CMS_VIEW_ID_INVALID", { viewId });
            }
            const row = await cmsRepository.dbGet(
                `
                    SELECT
                        id,
                        view_id AS viewId,
                        label,
                        description,
                        collection_slug AS collection,
                        query_json AS queryJson,
                        displays_json AS displaysJson,
                        created_at AS createdAt,
                        updated_at AS updatedAt
                    FROM cms_views
                    WHERE view_id = ?
                `,
                [safeViewId]
            );
            if (!row) {
                throw createActionableError("CMS View not found", 404, "CMS_VIEW_NOT_FOUND", { viewId: safeViewId });
            }
            const view = normalizeViewRow(row);
            return options.includeValidation === false ? view : this.enrichViewRecord(view);
        },

        async createView(input = {}) {
            const normalized = normalizeCmsViewRecord(input);
            if (!normalized.viewId) {
                throw createActionableError("Invalid View ID", 400, "CMS_VIEW_ID_INVALID", { viewId: input.viewId });
            }
            const existing = await cmsRepository.dbGet("SELECT view_id AS viewId FROM cms_views WHERE view_id = ?", [normalized.viewId]);
            if (existing) {
                throw createActionableError(`CMS View already exists: ${normalized.viewId}`, 409, "CMS_VIEW_EXISTS", { viewId: normalized.viewId });
            }
            const validation = await this.validateViewRecord(normalized);
            if (validation.errors.length > 0) {
                throw createActionableError("CMS View validation failed", 400, "CMS_VIEW_INVALID", validation);
            }
            const now = new Date().toISOString();
            await cmsRepository.dbRun(
                `
                    INSERT INTO cms_views (
                        view_id, label, description, collection_slug,
                        query_json, displays_json, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    normalized.viewId,
                    normalized.label,
                    normalized.description,
                    normalized.collection,
                    JSON.stringify(normalized.query),
                    JSON.stringify(normalized.displays),
                    now,
                    now
                ]
            );
            return {
                ...normalized,
                createdAt: now,
                updatedAt: now,
                validation
            };
        },

        async updateView(viewId, input = {}) {
            const current = await this.getView(viewId, { includeValidation: false });
            const normalized = normalizeCmsViewRecord({
                ...current,
                ...input,
                viewId: current.viewId
            });
            const validation = await this.validateViewRecord(normalized);
            if (validation.errors.length > 0) {
                throw createActionableError("CMS View validation failed", 400, "CMS_VIEW_INVALID", validation);
            }
            const now = new Date().toISOString();
            await cmsRepository.dbRun(
                `
                    UPDATE cms_views
                    SET label = ?,
                        description = ?,
                        collection_slug = ?,
                        query_json = ?,
                        displays_json = ?,
                        updated_at = ?
                    WHERE view_id = ?
                `,
                [
                    normalized.label,
                    normalized.description,
                    normalized.collection,
                    JSON.stringify(normalized.query),
                    JSON.stringify(normalized.displays),
                    now,
                    current.viewId
                ]
            );
            return {
                ...normalized,
                createdAt: current.createdAt,
                updatedAt: now,
                validation
            };
        },

        async deleteView(viewId) {
            const safeViewId = sanitizeCmsSlug(viewId);
            if (!safeViewId) {
                throw createActionableError("Invalid View ID", 400, "CMS_VIEW_ID_INVALID", { viewId });
            }
            const result = await cmsRepository.dbRun("DELETE FROM cms_views WHERE view_id = ?", [safeViewId]);
            if (!result || result.changes === 0) {
                throw createActionableError("CMS View not found", 404, "CMS_VIEW_NOT_FOUND", { viewId: safeViewId });
            }
            return { viewId: safeViewId, deleted: true };
        },

        async previewView(viewId, options = {}) {
            const view = await this.getView(viewId);
            if (view.validation?.errors?.length) {
                throw createActionableError("CMS View is invalid", 400, "CMS_VIEW_INVALID", view.validation);
            }
            const content = await this.listPublicContent(view.collection, {
                includeDrafts: view.query.status === "draft" || view.query.status === "any" || Boolean(options.includeDrafts),
                includeArchived: view.query.status === "archived" || view.query.status === "any" || Boolean(options.includeArchived)
            });
            const displayId = sanitizeCmsSlug(options.displayId || options.display || "");
            const display = displayId
                ? view.displays.find((item) => item.displayId === displayId)
                : view.displays[0] || null;
            if (displayId && !display) {
                throw createActionableError("CMS View display not found", 404, "CMS_VIEW_DISPLAY_NOT_FOUND", { viewId: view.viewId, displayId });
            }
            const entries = applyViewQuery(content.entries, view.query);
            return {
                view,
                display,
                collection: content.collection,
                count: entries.length,
                entries
            };
        },

        async validateViewRecord(view = {}) {
            const normalized = normalizeCmsViewRecord(view);
            const errors = [];
            const warnings = [];

            if (!normalized.viewId) {
                errors.push({ code: "VIEW_ID_MISSING", message: "View ID is required." });
            }
            if (!normalized.label) {
                errors.push({ code: "VIEW_LABEL_MISSING", message: "View label is required." });
            }
            if (!normalized.collection) {
                errors.push({ code: "VIEW_COLLECTION_MISSING", message: "View collection is required." });
            }

            const collections = await this.listCollections();
            const collection = collections.find((item) => item.slug === normalized.collection);
            const fieldNames = new Set(collection ? getSchemaFields(collection).map((field) => field.name) : []);
            const activeTheme = resolveActiveThemeInfo(serviceConfig, await readStoredSettingsForTheme(serviceConfig, this.getDefaultSettings()));
            if (normalized.collection && !collection) {
                errors.push({ code: "VIEW_COLLECTION_NOT_FOUND", message: `View collection was not found: ${normalized.collection}.` });
            }

            Object.keys(normalized.query.filters || {}).forEach((fieldName) => {
                if (collection && !fieldNames.has(fieldName)) {
                    errors.push({ code: "VIEW_FILTER_FIELD_NOT_FOUND", message: `Filter field was not found: ${normalized.collection}.${fieldName}.` });
                }
            });
            normalized.query.sort.forEach((item) => {
                if (collection && !["entry-key", "entrykey", "status", "sort-order", "sortorder", "updated-at", "updatedat"].includes(item.field) && !fieldNames.has(item.field)) {
                    errors.push({ code: "VIEW_SORT_FIELD_NOT_FOUND", message: `Sort field was not found: ${normalized.collection}.${item.field}.` });
                }
            });

            if (normalized.displays.length === 0) {
                errors.push({ code: "VIEW_DISPLAY_MISSING", message: "At least one View display is required." });
            }
            const displayIds = new Set();
            const pageRoutes = [];
            for (const display of normalized.displays) {
                if (displayIds.has(display.displayId)) {
                    errors.push({ code: "VIEW_DISPLAY_ID_DUPLICATE", message: `Display ID is duplicated: ${display.displayId}.` });
                }
                displayIds.add(display.displayId);
                if (display.type === "page") {
                    if (!display.route) {
                        errors.push({ code: "VIEW_PAGE_ROUTE_MISSING", message: `Page display needs a route: ${display.displayId}.` });
                    } else {
                        pageRoutes.push({ displayId: display.displayId, route: display.route });
                    }
                }
                for (const [field, componentPath] of Object.entries({
                    rowComponent: display.rowComponent,
                    emptyComponent: display.emptyComponent
                })) {
                    if (!componentPath) {
                        continue;
                    }
                    if (path.isAbsolute(componentPath) || componentPath.includes("..")) {
                        errors.push({ code: "VIEW_COMPONENT_PATH_INVALID", message: `${field} has an unsafe component path: ${componentPath}.` });
                    } else if (!await cmsComponentPathExists(componentPath, serviceConfig, activeTheme)) {
                        warnings.push({ code: "VIEW_COMPONENT_NOT_FOUND", message: `${field} was not found: ${componentPath}.` });
                    }
                }
            }

            const routeOwnerMap = new Map();
            const templates = await this.listTemplates().catch(() => []);
            templates.forEach((template) => {
                if (template.routePattern) {
                    routeOwnerMap.set(template.routePattern, `template:${template.templateId}`);
                }
            });
            const views = await this.listViews({ includeValidation: false }).catch(() => []);
            views.forEach((candidate) => {
                if (candidate.viewId === normalized.viewId) {
                    return;
                }
                candidate.displays
                    .filter((display) => display.type === "page" && display.route)
                    .forEach((display) => routeOwnerMap.set(display.route, `view:${candidate.viewId}.${display.displayId}`));
            });
            pageRoutes.forEach((item) => {
                const owner = routeOwnerMap.get(item.route);
                if (owner) {
                    errors.push({ code: "VIEW_PAGE_ROUTE_CONFLICT", message: `Page display route conflicts with ${owner}: ${item.route}.` });
                }
            });

            return {
                status: errors.length ? "error" : warnings.length ? "warning" : "valid",
                errors,
                warnings
            };
        },

        async enrichViewRecord(view = {}) {
            const validation = await this.validateViewRecord(view);
            return {
                ...normalizeCmsViewRecord(view),
                validation
            };
        },

        async createEntry({ collection, entryKey, status = "draft", sortOrder = 0, data }) {
            const safeCollectionSlug = sanitizeCmsSlug(collection);
            const safeEntryKey = sanitizeCmsEntryKey(entryKey);
            const normalizedStatus = ["draft", "published", "archived"].includes(String(status || "").toLowerCase())
                ? String(status || "").toLowerCase()
                : "draft";
            const normalizedSortOrder = Number.isFinite(Number(sortOrder)) ? Number(sortOrder) : 0;
            const normalizedData = normalizeCmsEntryData(data);

            if (!safeCollectionSlug) {
                throw createActionableError("Invalid collection slug", 400, "CMS_COLLECTION_SLUG_INVALID", { collection });
            }
            if (!safeEntryKey) {
                throw createActionableError("Invalid entry key", 400, "CMS_ENTRY_KEY_INVALID", { entryKey });
            }

            const collectionRow = await cmsRepository.dbGet("SELECT slug FROM cms_collections WHERE slug = ?", [safeCollectionSlug]);
            if (!collectionRow) {
                throw createActionableError("CMS collection not found", 404, "CMS_COLLECTION_NOT_FOUND", { collection: safeCollectionSlug });
            }

            const existing = await cmsRepository.dbGet(
                "SELECT id FROM cms_entries WHERE collection_slug = ? AND entry_key = ?",
                [safeCollectionSlug, safeEntryKey]
            );
            if (existing) {
                throw createActionableError(
                    `CMS entry already exists: ${safeEntryKey}`,
                    409,
                    "CMS_ENTRY_EXISTS",
                    { collection: safeCollectionSlug, entryKey: safeEntryKey }
                );
            }

            const now = new Date().toISOString();
            const result = await cmsRepository.dbRun(
                `
                    INSERT INTO cms_entries (
                        collection_slug, entry_key, status, sort_order, data_json, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                `,
                [safeCollectionSlug, safeEntryKey, normalizedStatus, normalizedSortOrder, JSON.stringify(normalizedData), now, now]
            );

            return {
                id: result.lastID,
                collection: safeCollectionSlug,
                entryKey: safeEntryKey,
                status: normalizedStatus,
                sortOrder: normalizedSortOrder,
                data: normalizedData,
                createdAt: now,
                updatedAt: now
            };
        },

        async updateEntry(id, payload = {}) {
            const numericId = Number(id);
            if (!Number.isInteger(numericId) || numericId <= 0) {
                throw createActionableError("Invalid entry id", 400, "CMS_ENTRY_ID_INVALID", { id });
            }

            const current = await cmsRepository.dbGet(
                `
                    SELECT
                        id,
                        collection_slug AS collection,
                        entry_key AS entryKey,
                        status,
                        sort_order AS sortOrder,
                        data_json AS dataJson,
                        created_at AS createdAt
                    FROM cms_entries
                    WHERE id = ?
                `,
                [numericId]
            );
            if (!current) {
                throw createActionableError("CMS entry not found", 404, "CMS_ENTRY_NOT_FOUND", { id: numericId });
            }

            const nextCollection = payload.collection === undefined
                ? current.collection
                : sanitizeCmsSlug(payload.collection);
            const nextEntryKey = payload.entryKey === undefined
                ? current.entryKey
                : sanitizeCmsEntryKey(payload.entryKey);
            if (!nextCollection) {
                throw createActionableError("Invalid collection slug", 400, "CMS_COLLECTION_SLUG_INVALID", { collection: payload.collection });
            }
            if (!nextEntryKey) {
                throw createActionableError("Invalid entry key", 400, "CMS_ENTRY_KEY_INVALID", { entryKey: payload.entryKey });
            }

            const collectionRow = await cmsRepository.dbGet("SELECT slug FROM cms_collections WHERE slug = ?", [nextCollection]);
            if (!collectionRow) {
                throw createActionableError("CMS collection not found", 404, "CMS_COLLECTION_NOT_FOUND", { collection: nextCollection });
            }

            const duplicate = await cmsRepository.dbGet(
                "SELECT id FROM cms_entries WHERE collection_slug = ? AND entry_key = ? AND id != ?",
                [nextCollection, nextEntryKey, numericId]
            );
            if (duplicate) {
                throw createActionableError(
                    `CMS entry already exists: ${nextEntryKey}`,
                    409,
                    "CMS_ENTRY_EXISTS",
                    { collection: nextCollection, entryKey: nextEntryKey }
                );
            }

            const nextStatus = payload.status === undefined
                ? current.status
                : (["draft", "published", "archived"].includes(String(payload.status || "").toLowerCase())
                    ? String(payload.status || "").toLowerCase()
                    : "draft");
            const nextSortOrder = payload.sortOrder === undefined
                ? Number(current.sortOrder || 0)
                : (Number.isFinite(Number(payload.sortOrder)) ? Number(payload.sortOrder) : 0);
            const nextData = payload.data === undefined
                ? parseJsonRecord(current.dataJson, {})
                : normalizeCmsEntryData(payload.data);
            const now = new Date().toISOString();

            await cmsRepository.dbRun(
                `
                    UPDATE cms_entries
                    SET collection_slug = ?, entry_key = ?, status = ?, sort_order = ?, data_json = ?, updated_at = ?
                    WHERE id = ?
                `,
                [nextCollection, nextEntryKey, nextStatus, nextSortOrder, JSON.stringify(nextData), now, numericId]
            );

            return {
                id: numericId,
                collection: nextCollection,
                entryKey: nextEntryKey,
                status: nextStatus,
                sortOrder: nextSortOrder,
                data: nextData,
                createdAt: current.createdAt,
                updatedAt: now
            };
        },

        async deleteEntry(id) {
            const numericId = Number(id);
            if (!Number.isInteger(numericId) || numericId <= 0) {
                throw createActionableError("Invalid entry id", 400, "CMS_ENTRY_ID_INVALID", { id });
            }

            const current = await cmsRepository.dbGet(
                "SELECT id, collection_slug AS collection, entry_key AS entryKey FROM cms_entries WHERE id = ?",
                [numericId]
            );
            if (!current) {
                throw createActionableError("CMS entry not found", 404, "CMS_ENTRY_NOT_FOUND", { id: numericId });
            }

            await cmsRepository.dbRun("DELETE FROM cms_entries WHERE id = ?", [numericId]);
            return {
                id: numericId,
                collection: current.collection,
                entryKey: current.entryKey,
                deleted: true
            };
        },

        async exportContent(options = {}) {
            const statusFilter = createStatusFilter(options);
            const generatedAt = new Date().toISOString();
            const collections = await this.listCollections();
            const entriesByCollection = {};
            const collectionRecords = [];
            let totalEntries = 0;

            for (const collection of collections) {
                const entries = await this.listEntries(collection.slug);
                const filteredEntries = entries
                    .filter((entry) => statusFilter.has(String(entry.status || "").toLowerCase()))
                    .sort(sortEntries)
                    .map((entry) => ({
                        id: entry.id,
                        entryKey: entry.entryKey,
                        status: entry.status,
                        sortOrder: entry.sortOrder,
                        data: entry.data,
                        createdAt: entry.createdAt,
                        updatedAt: entry.updatedAt
                    }));

                entriesByCollection[collection.slug] = filteredEntries;
                totalEntries += filteredEntries.length;

                collectionRecords.push({
                    id: collection.id,
                    slug: collection.slug,
                    name: collection.name,
                    schema: collection.schema,
                    createdAt: collection.createdAt,
                    updatedAt: collection.updatedAt,
                    entryCount: filteredEntries.length,
                    files: {
                        collection: `collections/${collection.slug}.json`,
                        entries: `entries/${collection.slug}.json`
                    }
                });
            }

            const entriesIndex = collectionRecords.map((collection) => ({
                slug: collection.slug,
                count: collection.entryCount,
                file: `entries/${collection.slug}.json`
            }));

            const manifest = {
                version: 1,
                generatedAt,
                source: {
                    databasePath: serviceConfig.databasePath || null
                },
                statusFilter: Array.from(statusFilter),
                totals: {
                    collections: collectionRecords.length,
                    entries: totalEntries
                },
                collections: collectionRecords.map((collection) => ({
                    slug: collection.slug,
                    name: collection.name,
                    entryCount: collection.entryCount,
                    files: collection.files
                }))
            };

            const bundle = {
                generatedAt,
                manifest,
                collections: collectionRecords,
                entriesIndex,
                entriesByCollection
            };

            const outputPath = path.resolve(options.outputPath || serviceConfig.exportPath || path.join(process.cwd(), "html", "data", "cms"));
            await writeExportBundle(outputPath, bundle);

            const targets = [{ type: "publish", outputPath }];

            if (options.previewOutputPath) {
                const previewOutputPath = path.resolve(options.previewOutputPath);
                await writeExportBundle(previewOutputPath, bundle);
                targets.push({ type: "preview", outputPath: previewOutputPath });
            }

            return {
                generatedAt,
                totals: manifest.totals,
                statusFilter: manifest.statusFilter,
                targets,
                manifestPath: path.join(outputPath, "manifest.json")
            };
        },

        async readThemeSource() {
            const storedSettings = await readStoredSettingsForTheme(serviceConfig, this.getDefaultSettings());
            const activeTheme = resolveActiveThemeInfo(serviceConfig, storedSettings);
            const activeThemeManifest = await readActiveThemeManifest(activeTheme);
            const partials = await listThemePartials(activeTheme.themePath, serviceConfig);
            const collections = await this.listCollections();
            const collectionMap = new Map(collections.map((collection) => [collection.slug, collection]));
            const entries = {};
            for (const collection of collections) {
                entries[collection.slug] = await this.listEntries(collection.slug);
            }
            const views = await this.listViews({ includeValidation: false }).catch(() => []);

            let layouts = [];
            let templates = [];
            if (serviceConfig.builderDatabasePath && await fs.pathExists(serviceConfig.builderDatabasePath)) {
                try {
                    const layoutRows = await readBuilderDbAll(
                        serviceConfig.builderDatabasePath,
                        `SELECT file_name AS fileName, page_name AS pageName, page_title AS pageTitle,
                            project_name AS projectName, layout_json AS layoutJson, updated_at AS updatedAt
                        FROM builder_layouts ORDER BY updated_at DESC`
                    );
                    layouts = layoutRows.map((row) => ({
                        fileName: row.fileName,
                        pageName: row.pageName,
                        pageTitle: row.pageTitle,
                        projectName: row.projectName,
                        updatedAt: row.updatedAt,
                        layout: normalizeThemeLayoutData(safeJsonParse(row.layoutJson, {}))
                    }));
                } catch (_error) {
                    layouts = [];
                }

                try {
const templateRows = await readBuilderDbAll(
                         serviceConfig.builderDatabasePath,
                         "SELECT template_json AS templateJson FROM builder_templates ORDER BY updated_at DESC"
                     );
                     templates = templateRows.map((row) => normalizeCmsTemplateRecord(safeJsonParse(row.templateJson, {})));
                } catch (_error) {
                    templates = [];
                }
            }

const bindingRecords = collectBindingRecords(layouts, templates);
            const requiredCollections = Array.from(new Set([
                ...(activeThemeManifest?.requiredCollections || []),
                ...getBindingCollections(bindingRecords),
                ...templates.map((template) => template.contentType).filter(Boolean),
                ...views.map((view) => view.collection).filter(Boolean)
            ])).sort();

            const manifestRegions = Array.isArray(activeThemeManifest?.regions) ? activeThemeManifest.regions : [];
            const regions = manifestRegions.length
                ? Array.from(new Set(manifestRegions.map((regionId) => normalizeThemeRegionId(regionId, regionId))))
                : sortThemeRegions(Array.from(new Set([
                    "header",
                    "hero",
                    "main",
                    "side-navigation",
                    "content-above",
                    "content-below",
                    "footer",
                    ...layouts.flatMap((layout) => Object.keys(layout.layout?.regions || {})),
                    ...templates.flatMap((template) => Object.keys(template.regions || {})),
                    ...templates.flatMap((template) => Object.keys(template.defaultBlocks || {}))
                ])));
            const themeTemplates = Array.isArray(activeThemeManifest?.templates) && activeThemeManifest.templates.length
                ? activeThemeManifest.templates
                : createThemeTemplateManifest(regions);
            const generatedRegionDefinitions = createThemeRegionDefinitions(regions);
            const manifestRegionDefinitions = Array.isArray(activeThemeManifest?.regionDefinitions)
                ? activeThemeManifest.regionDefinitions.map((region) => ({
                    ...region,
                    id: normalizeThemeRegionId(region.id || region.regionId || region.name, "main")
                }))
                : [];
            const manifestRegionMap = new Map(manifestRegionDefinitions.map((region) => [region.id, region]));
            const regionDefinitions = generatedRegionDefinitions.map((region) => ({
                ...region,
                ...(manifestRegionMap.get(region.id) || {})
            }));

            return {
                activeTheme,
                activeThemeManifest,
                collections,
                collectionMap,
                entries,
                views,
                layouts,
                templates,
                themeTemplates,
                partials,
                bindingRecords,
                requiredCollections,
                regions,
                regionDefinitions
            };
        },

        async validateTheme(options = {}) {
            const source = options.source || await this.readThemeSource();
            const warnings = [];
            const errors = [];
            const activeTheme = source.activeTheme || resolveActiveThemeInfo(serviceConfig);
            const activeThemeIssues = await validateActiveThemeFolder(activeTheme, source.activeThemeManifest);
            errors.push(...activeThemeIssues.errors);
            warnings.push(...activeThemeIssues.warnings);

            if (source.layouts.length === 0) {
                warnings.push({ code: "THEME_LAYOUTS_EMPTY", message: "No builder layouts were found for this theme." });
            }
            if (source.templates.length === 0 && source.themeTemplates.length === 0) {
                warnings.push({ code: "THEME_TEMPLATES_EMPTY", message: "No page templates were found for this theme." });
            }

            for (const view of source.views || []) {
                const viewValidation = await this.validateViewRecord(view);
                viewValidation.errors.forEach((item) => {
                    errors.push({
                        ...item,
                        code: `THEME_${item.code}`,
                        viewId: view.viewId
                    });
                });
                viewValidation.warnings.forEach((item) => {
                    warnings.push({
                        ...item,
                        code: `THEME_${item.code}`,
                        viewId: view.viewId
                    });
                });
            }

            source.requiredCollections.forEach((slug) => {
                const collection = source.collectionMap.get(slug);
                if (!collection) {
                    errors.push({ code: "THEME_COLLECTION_MISSING", message: `Required CMS collection is missing: ${slug}.`, collection: slug });
                }
            });

            for (const record of source.bindingRecords) {
                const binding = record.binding || {};
                const collectionSlug = binding.collection || binding.contentType;
                if (collectionSlug && source.collectionMap.has(collectionSlug)) {
                    const fields = getSchemaFields(source.collectionMap.get(collectionSlug));
                    const fieldNames = new Set(fields.map((field) => field.name).filter(Boolean));
                    Object.values(binding.fieldMap || {}).forEach((fieldName) => {
                        if (fieldName && !fieldNames.has(String(fieldName))) {
                            warnings.push({
                                code: "THEME_BINDING_FIELD_MISSING",
                                message: `Binding references missing field "${fieldName}" in ${collectionSlug}.`,
                                collection: collectionSlug,
                                field: fieldName
                            });
                        }
                    });
                }

                const componentPath = String(record.componentPath || "").replace(/\\/g, "/");
                if (componentPath) {
                    if (!await cmsComponentPathExists(componentPath, serviceConfig, activeTheme)) {
                        warnings.push({
                            code: "THEME_COMPONENT_MISSING",
                            message: `Component partial was not found: ${componentPath}.`,
                            componentPath
                        });
                    }
                }
            }

            source.templates.forEach((template) => {
                if (!template.routePattern) {
                    warnings.push({ code: "THEME_TEMPLATE_ROUTE_MISSING", message: `Template "${template.label || template.templateId}" has no route pattern.` });
                }
                if (!template.layoutId) {
                    warnings.push({ code: "THEME_TEMPLATE_LAYOUT_MISSING", message: `Template "${template.label || template.templateId}" has no layout ID.` });
                }
            });

            return {
                valid: errors.length === 0,
                errors,
                warnings,
                counts: {
                    layouts: source.layouts.length,
                    templates: source.templates.length + source.themeTemplates.length,
                    builderTemplates: source.templates.length,
                    themeTemplates: source.themeTemplates.length,
                    views: (source.views || []).length,
                    regions: source.regions.length,
                    bindings: source.bindingRecords.length,
                    requiredCollections: source.requiredCollections.length
                }
            };
        },

        async listTemplates() {
            await ensureBuilderTemplatesTable(serviceConfig.builderDatabasePath);
            const rows = await readBuilderDbAll(
                serviceConfig.builderDatabasePath,
                "SELECT template_json AS templateJson FROM builder_templates ORDER BY datetime(updated_at) DESC"
            );
            const templates = rows.map((row) => normalizeCmsTemplateRecord(safeJsonParse(row.templateJson, {})));
            return Promise.all(templates.map((template) => this.enrichTemplateRecord(template)));
        },

        async getTemplate(templateId) {
            await ensureBuilderTemplatesTable(serviceConfig.builderDatabasePath);
            const safeTemplateId = slugifyThemeName(templateId, "");
            if (!safeTemplateId) {
                throw createActionableError("Invalid template ID", 400, "CMS_TEMPLATE_ID_INVALID", { templateId });
            }
            const row = await readBuilderDbGet(
                serviceConfig.builderDatabasePath,
                "SELECT template_json AS templateJson FROM builder_templates WHERE template_id = ?",
                [safeTemplateId]
            );
            if (!row) {
                throw createActionableError("Page template not found", 404, "CMS_TEMPLATE_NOT_FOUND", { templateId: safeTemplateId });
            }
            return this.enrichTemplateRecord(normalizeCmsTemplateRecord(safeJsonParse(row.templateJson, {})));
        },

        async saveTemplate(input = {}) {
            await ensureBuilderTemplatesTable(serviceConfig.builderDatabasePath);
            const normalized = normalizeCmsTemplateRecord(input);
            const now = new Date().toISOString();
            const existing = await readBuilderDbGet(
                serviceConfig.builderDatabasePath,
                "SELECT template_json AS templateJson FROM builder_templates WHERE template_id = ?",
                [normalized.templateId]
            );
            const existingTemplate = existing ? safeJsonParse(existing.templateJson, {}) : {};
            const payload = {
                ...normalized,
                createdAt: normalized.createdAt || existingTemplate.createdAt || now,
                updatedAt: now
            };
            const validation = await this.validateTemplateRecord(payload);
            await readBuilderDbRun(
                serviceConfig.builderDatabasePath,
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
                    JSON.stringify(payload),
                    payload.createdAt,
                    payload.updatedAt
                ]
            );

            // Write build file to active theme
            try {
                await this.writeTemplateBuildFile(payload.templateId);
            } catch (err) {
                console.error("Failed to write template build file:", err);
            }

            return {
                ...payload,
                regionsCount: getTemplateRegionIds(payload).length,
                validation
            };
        },

        async deleteTemplate(templateId) {
            await ensureBuilderTemplatesTable(serviceConfig.builderDatabasePath);
            const safeTemplateId = slugifyThemeName(templateId, "");
            if (!safeTemplateId) {
                throw createActionableError("Invalid template ID", 400, "CMS_TEMPLATE_ID_INVALID", { templateId });
            }
            const result = await readBuilderDbRun(
                serviceConfig.builderDatabasePath,
                "DELETE FROM builder_templates WHERE template_id = ?",
                [safeTemplateId]
            );
            if (!result || result.changes === 0) {
                throw createActionableError("Page template not found", 404, "CMS_TEMPLATE_NOT_FOUND", { templateId: safeTemplateId });
            }
            return { templateId: safeTemplateId, deleted: true };
        },

        async previewTemplate(templateId) {
            const safeTemplateId = sanitizeCmsSlug(templateId);
            if (!safeTemplateId) {
                throw createActionableError("Invalid template ID", 400, "CMS_TEMPLATE_ID_INVALID", { templateId });
            }

            const templateRow = await readBuilderDbGet(
                serviceConfig.builderDatabasePath,
                "SELECT template_json AS templateJson FROM builder_templates WHERE template_id = ?",
                [safeTemplateId]
            );
            if (!templateRow) {
                throw createActionableError("Template not found", 404, "CMS_TEMPLATE_NOT_FOUND", { templateId: safeTemplateId });
            }

            const template = normalizeCmsTemplateRecord(safeJsonParse(templateRow.templateJson, {}));
            const activeTheme = resolveActiveThemeInfo(serviceConfig);
            const themePath = activeTheme.themePath;
            if (!themePath || !await fs.pathExists(themePath)) {
                throw createActionableError("Active theme folder not found", 404, "THEME_ACTIVE_FOLDER_MISSING", { themePath });
            }

            const html = await this.renderTemplateToHtml(template, themePath, { assetBase: "/site/" });
            return { html, templateId: safeTemplateId };
        },

        async writeTemplateBuildFile(templateId) {
            const safeTemplateId = sanitizeCmsSlug(templateId);
            if (!safeTemplateId) {
                throw createActionableError("Invalid template ID", 400, "CMS_TEMPLATE_ID_INVALID", { templateId });
            }

            const templateRow = await readBuilderDbGet(
                serviceConfig.builderDatabasePath,
                "SELECT template_json AS templateJson FROM builder_templates WHERE template_id = ?",
                [safeTemplateId]
            );
            if (!templateRow) {
                throw createActionableError("Template not found", 404, "CMS_TEMPLATE_NOT_FOUND", { templateId: safeTemplateId });
            }

            const activeTheme = resolveActiveThemeInfo(serviceConfig);
            const themePath = activeTheme.themePath;
            if (!themePath || !await fs.pathExists(themePath)) {
                throw createActionableError("Active theme folder not found", 404, "THEME_ACTIVE_FOLDER_MISSING", { themePath });
            }

            const buildDir = getThemeBuildPath(themePath);
            const layoutsDir = path.join(buildDir, "layouts");
            await fs.ensureDir(layoutsDir);

            const template = safeJsonParse(templateRow.templateJson, {});
            const normalized = normalizeCmsTemplateRecord(template);
            const output = {
                templateId: normalized.templateId,
                label: normalized.label,
                routePattern: normalized.routePattern,
                contentType: normalized.contentType,
                layoutId: normalized.layoutId,
                regions: normalized.regions,
                defaultBlocks: normalized.defaultBlocks,
                lockedRegions: normalized.lockedRegions,
                updatedAt: new Date().toISOString()
            };

            const filePath = path.join(layoutsDir, `${safeTemplateId}.json`);
            await fs.writeJson(filePath, output, { spaces: 2 });
            await syncTemplateBuildPartials(normalized, buildDir, serviceConfig);
            await syncCompleteSourceTree(buildDir, serviceConfig);

            // Generate and write index.html
            const html = await this.renderTemplateToHtml(template, themePath);
            await fs.writeFile(path.join(buildDir, "index.html"), html, "utf8");

            await syncTemplateBuildAssets(html, buildDir, serviceConfig);
            await importThemeBuildImagesToMedia(buildDir, serviceConfig, cmsRepository);
            await updateActiveThemeAssetManifest(themePath, buildDir, serviceConfig);

            console.log(`[CMS] Wrote template build file: ${filePath}`);
            console.log(`[CMS] Wrote build index.html: ${path.join(buildDir, 'index.html')}`);
            return { filePath, templateId: safeTemplateId };
        },

        async renderTemplateToHtml(template, themePath, options = {}) {
            const runtimeThemePath = await getThemeRuntimePath(themePath);
            const rawDefaultBlocks = template.defaultBlocks || {};
            const normalizedBlocks = {};
            Object.entries(rawDefaultBlocks).forEach(([rawRegionId, blocks]) => {
                const norm = normalizeThemeRegionId(rawRegionId, rawRegionId);
                normalizedBlocks[norm] = [
                    ...(normalizedBlocks[norm] || []),
                    ...(Array.isArray(blocks) ? blocks : [])
                ];
            });
            const regionIds = Object.keys(normalizedBlocks);
            const sortedRegionIds = sortThemeRegions(regionIds);

            const resolvePartial = async (relativePath, seen = new Set()) => {
                const cleaned = String(relativePath || "").trim();
                if (!cleaned) return "";
                if (seen.has(cleaned)) return `<!-- recursive: ${cleaned} -->`;
                const nextSeen = new Set(seen);
                nextSeen.add(cleaned);

                const candidates = [
                    path.join(runtimeThemePath, cleaned),
                    path.join(runtimeThemePath, "partials", cleaned),
                    path.join(runtimeThemePath, "components", cleaned.replace(/^micro\//, "")),
                    path.join(themePath, cleaned),
                    path.join(themePath, "partials", cleaned),
                    path.join(themePath, "components", cleaned.replace(/^micro\//, "")),
                    path.join(serviceConfig.partialsPath || "", cleaned)
                ];
                let fullPath = null;
                for (const candidate of candidates) {
                    if (await fs.pathExists(candidate)) {
                        fullPath = candidate;
                        break;
                    }
                }
                if (!fullPath) {
                    return `<!-- missing: ${cleaned} -->`;
                }

                let content = await fs.readFile(fullPath, "utf8");

                // Resolve nested {{> partial}} includes
                const includeRegex = /{{>\s*([a-zA-Z0-9_./-]+)\s*}}/g;
                const tokens = [];
                let match;
                while ((match = includeRegex.exec(content)) !== null) {
                    tokens.push(match[1]);
                }
                const resolvedMap = new Map();
                for (const token of tokens) {
                    if (!resolvedMap.has(token)) {
                        const tokenDir = path.dirname(cleaned);
                        const resolved = token.startsWith("/") ? token : path.join(tokenDir, token);
                        resolvedMap.set(token, await resolvePartial(resolved, nextSeen));
                    }
                }
                for (const [token, replacement] of resolvedMap) {
                    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const tokenRegex = new RegExp(`{{>\\s*${escaped}\\s*}}`, 'g');
                    content = content.replace(tokenRegex, replacement);
                }

                return content;
            };

            const renderBlock = async (block) => {
                const componentPath = block.componentPath || block.partial || "";
                return await resolvePartial(componentPath);
            };

            const pageTemplateCandidates = [
                path.join(runtimeThemePath, "templates/page.html"),
                path.join(themePath, "templates/page.html")
            ];
            const pageTemplatePath = pageTemplateCandidates.find((candidate) => candidate && fs.existsSync(candidate));
            if (!pageTemplatePath) {
                throw createActionableError("Theme page template not found", 404, "THEME_TEMPLATE_MISSING", { file: "build/templates/page.html" });
            }
            const pageTemplate = await fs.readFile(pageTemplatePath, "utf8");

            const renderedRegions = {};
            for (const regionId of sortedRegionIds) {
                const blocks = Array.isArray(normalizedBlocks[regionId]) ? normalizedBlocks[regionId] : [];
                const blockPromises = blocks.map((block) => renderBlock(block));
                const blockMarkups = await Promise.all(blockPromises);
                const regionTemplateCandidates = [
                    path.join(runtimeThemePath, `templates/regions/${regionId}.html`),
                    path.join(themePath, `templates/regions/${regionId}.html`)
                ];
                const regionTemplatePath = regionTemplateCandidates.find((candidate) => candidate && fs.existsSync(candidate));
                let regionShell = "";
                if (regionTemplatePath) {
                    regionShell = await fs.readFile(regionTemplatePath, "utf8");
                } else {
                    regionShell = `<section data-theme-region="${regionId}" data-theme-region-label="${regionId}">\n{{{ region "${regionId}" }}}\n</section>`;
                }
                const blockMarkup = blockMarkups.filter(Boolean).join("\n");
                let regionMarkup = regionShell.replace(/\{\{\{\s*region\s+["'][a-zA-Z0-9_-]+["']\s*\}\}\}/g, blockMarkup);
                renderedRegions[regionId] = regionMarkup;
            }

            let html = pageTemplate.replace(/{{>\s*regions\/([a-zA-Z0-9_-]+)\s*}}/g, (_match, regionId) => {
                return renderedRegions[normalizeThemeRegionId(regionId, regionId)] || "";
            });
            const extra = sortedRegionIds
                .filter((regionId) => !new RegExp(`{{>\\s*regions/${regionId}\\s*}}`).test(pageTemplate))
                .map((regionId) => renderedRegions[regionId])
                .filter(Boolean);
            if (extra.length) {
                html += `\n${extra.join("\n")}`;
            }

            // Asset injection prefers the theme-local build assets and falls back to the static site build.
            const projectBuildPath = serviceConfig.buildPath || path.join(serviceConfig.projectRoot || process.cwd(), "build");
            const sourcePath = serviceConfig.sourcePath || "";
            const assetBase = String(options.assetBase || "").replace(/\/?$/, options.assetBase ? "/" : "");
            const assetUrl = (relativePath) => `${assetBase}${relativePath.replace(/^\/+/, "")}`;
            let stylesTag = "";
            let scriptsTag = "";
            try {
                const themeCssPath = path.join(runtimeThemePath, "css", "styles.css");
                const cssPath = path.join(projectBuildPath, "css", "styles.css");
                const sourceCssPath = path.join(sourcePath, "css", "styles.css");
                const sourceScssPath = path.join(sourcePath, "scss", "styles.scss");
                if (await fs.pathExists(themeCssPath) || await fs.pathExists(cssPath) || await fs.pathExists(sourceCssPath) || await fs.pathExists(sourceScssPath)) {
                    stylesTag = `<link rel="stylesheet" href="${assetUrl("css/styles.css")}">`;
                } else if (await fs.pathExists(cssPath)) {
                    stylesTag = '<link rel="stylesheet" href="/site/css/styles.css">';
                }
            } catch (_) {}
            try {
                const themeJsPath = path.join(runtimeThemePath, "js", "main.js");
                const jsPath = path.join(projectBuildPath, "js", "main.js");
                const sourceJsPath = path.join(sourcePath, "js", "main.js");
                if (await fs.pathExists(themeJsPath) || await fs.pathExists(jsPath) || await fs.pathExists(sourceJsPath)) {
                    scriptsTag = `<script src="${assetUrl("js/main.js")}"></script>`;
                } else if (await fs.pathExists(jsPath)) {
                    scriptsTag = '<script src="/site/js/main.js"></script>';
                }
            } catch (_) {}

html = html
                .replace(/\{\{\s*page\.lang\s*\}\}/g, "en")
                .replace(/\{\{\s*page\.title\s*\}\}/g, template.label || "Preview")
                .replace(/\{\{\s*page\.bodyClass\s*\}\}/g, `page-${sanitizeCmsSlug(template.templateId || "preview")}`)
                .replace(/\{\{\{\s*assets\.styles\s*\}\}\}/g, stylesTag)
                .replace(/\{\{\{\s*assets\.scripts\s*\}\}\}/g, scriptsTag);
            if (assetBase) {
                html = rewritePreviewAssetUrls(html, assetBase);
            }

            return html;
        },

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
            }

            const regionIds = getTemplateRegionIds(template);
            requiredRegions.forEach((regionId) => {
                const blocks = Array.isArray(template.defaultBlocks?.[regionId]) ? template.defaultBlocks[regionId] : [];
                if (!regionIds.includes(regionId) && blocks.length === 0) {
                    warnings.push({ code: "TEMPLATE_REQUIRED_REGION_EMPTY", message: `Required region has no defaults: ${regionId}.` });
                }
            });

            const lockedRegions = Array.isArray(template.lockedRegions) ? template.lockedRegions : [];
            lockedRegions.forEach((regionId) => {
                if (!allowedRegions.has(regionId)) {
                    errors.push({ code: "TEMPLATE_LOCKED_REGION_INVALID", message: `Locked region is not supported: ${regionId}.` });
                }
                if (!regionIds.includes(regionId)) {
                    errors.push({ code: "TEMPLATE_LOCKED_REGION_MISSING", message: `Locked region is not defined: ${regionId}.` });
                }
            });

            Object.entries(template.defaultBlocks || {}).forEach(([regionId, blocks]) => {
                const normalizedRegionId = normalizeThemeRegionId(regionId, regionId);
                if (!allowedRegions.has(normalizedRegionId)) {
                    errors.push({ code: "TEMPLATE_REGION_UNSUPPORTED", message: `Unsupported default block region: ${regionId}.` });
                    return;
                }
            });

            return {
                status: errors.length ? "error" : warnings.length ? "warning" : "valid",
                errors,
                warnings
            };
        },

        async enrichTemplateRecord(template = {}) {
            const validation = await this.validateTemplateRecord(template);
            return {
                ...template,
                regionsCount: getTemplateRegionIds(template).length,
                validation
            };
        },

        async listThemes() {
            const source = await this.readThemeSource();
            const validation = await this.validateTheme({ source });
            const activeTheme = source.activeTheme || resolveActiveThemeInfo(serviceConfig);
            const exportedManifest = source.activeThemeManifest || null;
            const themeName = exportedManifest?.name || formatThemeName(activeTheme.slug);
            const themeSlug = exportedManifest?.slug || activeTheme.slug;
            const outputPath = activeTheme.themePath;

            return [{
                id: themeSlug,
                name: themeName,
                slug: themeSlug,
                version: exportedManifest?.version || "1.0.0",
                active: true,
                status: "active",
                description: exportedManifest?.description || "Active theme folder used by CMS validation and builder component discovery.",
                requiredCollections: source.requiredCollections,
                regions: source.regions,
                regionDefinitions: source.regionDefinitions,
                layouts: source.layouts,
                templates: source.templates,
                themeTemplates: source.themeTemplates,
                partials: source.partials,
                views: source.views,
                bindings: source.bindingRecords,
                validation,
                lastExported: exportedManifest?.exportedAt || null,
                outputPath,
                manifestPath: activeTheme.manifestPath
            }];
        },

        async exportTheme(options = {}) {
            const source = await this.readThemeSource();
            const validation = await this.validateTheme({ source });
            const themeName = String(options.themeName || "Theme 3").trim() || "Theme 3";
            const themeSlug = slugifyThemeName(themeName);
            const generatedAt = new Date().toISOString();
            const defaultOutputRoot = serviceConfig.themeExportPath || path.join(process.cwd(), "themes");
            const outputPath = path.resolve(options.outputPath || path.join(defaultOutputRoot, themeSlug));
            const buildPath = getThemeBuildPath(outputPath);

            if (!isPathInside(serviceConfig.projectRoot || process.cwd(), outputPath)) {
                throw createActionableError("Theme export output must stay inside the project root", 400, "THEME_EXPORT_PATH_INVALID", { outputPath });
            }
            if (await fs.pathExists(outputPath)) {
                if (!options.overwrite) {
                    throw createActionableError("Theme export output already exists", 409, "THEME_EXPORT_EXISTS", { outputPath });
                }
                await fs.emptyDir(buildPath);
                await removeLegacyThemeRuntimeDirs(outputPath);
            }
            await fs.ensureDir(outputPath);
            await fs.ensureDir(buildPath);

            const dirs = ["templates", "templates/regions", "layouts", "pages", "regions", "views", "partials", "components", "assets", "data/fallback", "bindings"];
            await Promise.all(dirs.map((dir) => fs.ensureDir(path.join(buildPath, dir))));

            const copyIfExists = async (from, to) => {
                if (from && await fs.pathExists(from)) {
                    await fs.copy(from, to, { overwrite: true, errorOnExist: false });
                    return true;
                }
                return false;
            };

            await copyIfExists(serviceConfig.pagesPath, path.join(buildPath, "pages"));
            await copyIfExists(serviceConfig.layoutsPath, path.join(buildPath, "layouts", "html"));
            await copyIfExists(serviceConfig.partialsPath, path.join(buildPath, "partials"));
            await copyIfExists(path.join(serviceConfig.partialsPath || "", "micro"), path.join(buildPath, "components"));

            if (options.includeCompiledAssets !== false) {
                await copyIfExists(serviceConfig.sourcePath, path.join(buildPath, "src"));
                await copyIfExists(path.join(serviceConfig.sourcePath || "", "css"), path.join(buildPath, "assets", "css"));
                await copyIfExists(path.join(serviceConfig.sourcePath || "", "js"), path.join(buildPath, "assets", "js"));
                await copyIfExists(path.join(serviceConfig.sourcePath || "", "images"), path.join(buildPath, "assets", "images"));
                await copyIfExists(path.join(serviceConfig.sourcePath || "", "resources"), path.join(buildPath, "assets", "resources"));
                await copyIfExists(path.join(serviceConfig.sourcePath || "", "scss"), path.join(buildPath, "assets", "scss"));
                await copyIfExists(path.join(serviceConfig.sourcePath || "", "config"), path.join(buildPath, "assets", "config"));
                await copyIfExists(path.join(serviceConfig.sourcePath || "", "css"), path.join(buildPath, "css"));
                await copyIfExists(path.join(serviceConfig.sourcePath || "", "js"), path.join(buildPath, "js"));
                await copyIfExists(path.join(serviceConfig.sourcePath || "", "images"), path.join(buildPath, "img"));
            }

            for (const layout of source.layouts) {
                await fs.writeJson(path.join(buildPath, "layouts", layout.fileName), layout.layout, { spaces: 2 });
            }
            for (const template of source.templates) {
                const templateId = slugifyThemeName(template.templateId || template.label || "template");
                await fs.writeJson(path.join(buildPath, "pages", `${templateId}.template.json`), template, { spaces: 2 });
            }
            const exportedViews = [];
            for (const view of source.views || []) {
                const viewId = slugifyThemeName(view.viewId || view.label || "view", "view");
                const viewValidation = await this.validateViewRecord(view);
                const viewFile = `views/${viewId}.json`;
                const viewExport = {
                    ...normalizeCmsViewRecord(view),
                    validation: viewValidation
                };
                await fs.writeJson(path.join(buildPath, viewFile), viewExport, { spaces: 2 });
                exportedViews.push({
                    id: viewExport.viewId,
                    label: viewExport.label,
                    collection: viewExport.collection,
                    file: `build/${viewFile}`,
                    displays: viewExport.displays.map((display) => ({
                        id: display.displayId,
                        label: display.label,
                        type: display.type,
                        route: display.route || null
                    })),
                    validation: viewValidation.status
                });
            }
await fs.writeFile(path.join(buildPath, "templates", "page.html"), buildThemePageTemplate(source.regionDefinitions), "utf8");
            for (const region of source.regionDefinitions) {
                await fs.writeFile(
                    path.join(buildPath, "templates", "regions", `${region.id}.html`),
                    buildThemeRegionTemplate(region),
                    "utf8"
                );
            }
            const canonicalRegions = ["header", "hero", "side-navigation", "content-above", "main", "content-below", "footer"];
            const allRegions = [...new Set([...canonicalRegions, ...source.regions])];
            for (const regionId of allRegions) {
                const regionLayouts = source.layouts.map((layout) => ({
                    layoutId: layout.fileName,
                    blocks: getLayoutRegionBlocks(layout.layout, regionId)
                })).filter((item) => item.blocks.length > 0);
                await fs.writeJson(path.join(buildPath, "regions", `${regionId}.json`), {
                    id: regionId,
                    layouts: regionLayouts
                }, { spaces: 2 });
            }
            await fs.writeJson(path.join(buildPath, "bindings", "cms-bindings.json"), {
                generatedAt,
                includeDraftBindings: Boolean(options.includeDraftBindings),
                bindings: source.bindingRecords
            }, { spaces: 2 });

            if (options.includeFallbackData !== false) {
                await writeExportBundle(path.join(buildPath, "data", "fallback"), {
                    generatedAt,
                    manifest: {
                        version: 1,
                        generatedAt,
                        statusFilter: ["published", "draft", "archived"],
                        totals: {
                            collections: source.collections.length,
                            entries: Object.values(source.entries).reduce((sum, items) => sum + items.length, 0)
                        },
                        collections: source.collections.map((collection) => ({
                            slug: collection.slug,
                            name: collection.name,
                            entryCount: source.entries[collection.slug]?.length || 0,
                            files: {
                                collection: `collections/${collection.slug}.json`,
                                entries: `entries/${collection.slug}.json`
                            }
                        }))
                    },
                    collections: source.collections.map((collection) => ({
                        ...collection,
                        entryCount: source.entries[collection.slug]?.length || 0,
                        files: {
                            collection: `collections/${collection.slug}.json`,
                            entries: `entries/${collection.slug}.json`
                        }
                    })),
                    entriesIndex: source.collections.map((collection) => ({
                        slug: collection.slug,
                        count: source.entries[collection.slug]?.length || 0,
                        file: `entries/${collection.slug}.json`
                    })),
entriesByCollection: source.entries
                });
            }

let themeJson = {
                schemaVersion: 1,
                name: themeName,
                slug: themeSlug,
                version: String(options.version || "1.0.0"),
                exportedAt: generatedAt,
                source: {
                    projectRoot: serviceConfig.projectRoot,
                    cmsDatabase: serviceConfig.databasePath,
                    builderDatabase: serviceConfig.builderDatabasePath
                },
                requiredCollections: source.requiredCollections,
                regions: allRegions,
                regionDefinitions: source.regionDefinitions.map((region) => ({
                    ...region,
                    template: `build/templates/regions/${region.id}.html`,
                    defaultPartial: region.defaultPartial ? `build/${region.defaultPartial}` : null
                })),
                templates: source.themeTemplates.map((template) => ({
                    ...template,
                    file: template.file ? `build/${String(template.file).replace(/^build\//, "")}` : "build/templates/page.html"
                })),
                views: exportedViews,
                assets: await getThemeSourceAssetManifest(buildPath, serviceConfig),
                counts: validation.counts,
                validation,
                files: Array.from(new Set([
                    ...dirs.map((dir) => `build/${dir}`),
                    ...(await listThemeBuildFiles(buildPath))
                ])).sort()
            };
            await fs.writeJson(path.join(outputPath, "theme.json"), themeJson, { spaces: 2 });
            const refreshedSource = await this.readThemeSource().catch(() => null);
            if (refreshedSource) {
                const refreshedValidation = await this.validateTheme({ source: refreshedSource }).catch(() => null);
                if (refreshedValidation) {
                    themeJson = {
                        ...themeJson,
                        counts: refreshedValidation.counts,
                        validation: refreshedValidation
                    };
                    await fs.writeJson(path.join(outputPath, "theme.json"), themeJson, { spaces: 2 });
                }
            }
            await fs.writeFile(path.join(outputPath, "README.md"), `# ${themeName}

Exported from Theme 3 CMS on ${generatedAt}.

## Package Contents

- \`theme.json\` package metadata and validation summary.
- \`build/templates/page.html\` and \`build/templates/regions/*.html\` Drupal-style theme templates.
- \`build/layouts/\` builder layout JSON and copied HTML layouts.
- \`build/pages/\` static pages plus page template JSON.
- \`build/regions/\` named region manifests.
- \`build/views/\` Views-style listing and page display definitions.
- \`build/partials/\` and \`build/components/\` reusable HTML components.
- \`build/assets/\`, \`build/css/\`, \`build/js/\`, and \`build/img/\` copied source assets when enabled.
- \`build/data/fallback/\` CMS fallback JSON when enabled.
- \`build/bindings/\` CMS binding metadata.
`);

            return {
                generatedAt,
                outputPath,
                manifestPath: path.join(outputPath, "theme.json"),
                validation: themeJson.validation,
                totals: themeJson.counts
            };
        },

        async checkBrokenMediaLinks() {
            const collections = await this.listCollections();
            const missing = [];
            for (const collection of collections) {
                const entries = await this.listEntries(collection.slug);
                entries.forEach((entry) => {
                    const serialized = JSON.stringify(entry.data || {});
                    const matches = serialized.match(/\/uploads\/[^"')\s]+/g) || [];
                    matches.forEach((url) => {
                        const fileName = path.basename(url);
                        const filePath = path.join(serviceConfig.uploadsPath || "", fileName);
                        if (!fs.existsSync(filePath)) {
                            missing.push({ collection: collection.slug, entryKey: entry.entryKey, url });
                        }
                    });
                });
            }
            return missing;
        },

        async getPublishChecklist() {
            const source = await this.readThemeSource();
            const validation = await this.validateTheme({ source });
            const missingCollections = validation.errors.filter((item) => item.code === "THEME_COLLECTION_MISSING");
            const missingFields = validation.warnings.filter((item) => item.code === "THEME_BINDING_FIELD_MISSING");
            const missingBindings = validation.warnings.filter((item) => item.code === "THEME_COMPONENT_MISSING");
            const viewIssues = [...validation.errors, ...validation.warnings].filter((item) => String(item.code || "").startsWith("THEME_VIEW_"));
            const brokenMedia = await this.checkBrokenMediaLinks();

            const theme = (await this.listThemes())[0];
            const themeManifest = theme?.outputPath ? path.join(theme.outputPath, "theme.json") : null;
            const themeManifestMtime = await getFileMtime(themeManifest);
            const themeSourceMtime = await getNewestMtime([
                serviceConfig.builderDatabasePath,
                serviceConfig.databasePath
            ]);
            const themeCurrent = Boolean(themeManifestMtime)
                && (!themeSourceMtime || themeManifestMtime.getTime() >= themeSourceMtime.getTime());

            const contentManifest = path.join(serviceConfig.exportPath || "", "manifest.json");
            const contentManifestMtime = await getFileMtime(contentManifest);
            const contentSourceMtime = await getFileMtime(serviceConfig.databasePath);
            const contentCurrent = Boolean(contentManifestMtime)
                && (!contentSourceMtime || contentManifestMtime.getTime() >= contentSourceMtime.getTime());

            const items = [
                createChecklistItem(
                    "collections",
                    "Required collections exist",
                    missingCollections.length === 0,
                    missingCollections.map((item) => item.collection || item.message).join(", ")
                ),
                createChecklistItem(
                    "fields",
                    "Required fields exist",
                    missingFields.length === 0,
                    missingFields.map((item) => `${item.collection}.${item.field}`).join(", ")
                ),
                createChecklistItem(
                    "media",
                    "No broken media links",
                    brokenMedia.length === 0,
                    brokenMedia.map((item) => `${item.collection}/${item.entryKey}: ${item.url}`).join(", ")
                ),
                createChecklistItem(
                    "bindings",
                    "No missing CMS bindings",
                    missingBindings.length === 0,
                    missingBindings.map((item) => item.componentPath || item.message).join(", ")
                ),
                createChecklistItem(
                    "views",
                    "Views are valid",
                    viewIssues.length === 0,
                    viewIssues.map((item) => `${item.viewId || "view"}: ${item.message}`).join(", ")
                ),
                createChecklistItem(
                    "theme-sync",
                    "Theme export is current",
                    themeCurrent,
                    themeManifestMtime ? "Theme package is older than CMS or builder source data." : "No theme export manifest found."
                ),
                createChecklistItem(
                    "content-sync",
                    "Content export is current",
                    contentCurrent,
                    contentManifestMtime ? "Content bridge export is older than CMS data." : "No CMS export manifest found."
                )
            ];

            return {
                generatedAt: new Date().toISOString(),
                valid: items.every((item) => item.status === "passed"),
                items,
                theme: theme || null,
                paths: {
                    contentManifest,
                    themeManifest,
                    buildPath: serviceConfig.buildPath
                }
            };
        },

        async generateStaticOutput(options = {}) {
            const outputPath = path.resolve(options.outputPath || serviceConfig.buildPath || path.join(process.cwd(), "build"));
            if (!isPathInside(serviceConfig.projectRoot || process.cwd(), outputPath)) {
                throw createActionableError("Static output path must stay inside the project root", 400, "PUBLISH_BUILD_PATH_INVALID", { outputPath });
            }

            await fs.emptyDir(outputPath);
            const compiledPages = await compilePaniniPages(serviceConfig, outputPath);
            if (serviceConfig.exportPath && await fs.pathExists(serviceConfig.exportPath)) {
                await fs.copy(serviceConfig.exportPath, path.join(outputPath, "data", "cms"), { overwrite: true, errorOnExist: false });
            }
            await compileStaticStyles(serviceConfig, outputPath);
            await copyStaticAssets(serviceConfig, outputPath);
            if (!compiledPages) {
                await fs.writeFile(path.join(outputPath, "index.html"), "<!doctype html><title>Theme 3 Build</title><h1>Theme 3 Build</h1>");
            }

            return {
                outputPath,
                generatedAt: new Date().toISOString()
            };
        },

        async runPublish(options = {}) {
            const includeDrafts = Boolean(options.includeDrafts);
            const includeArchived = Boolean(options.includeArchived);
            const themeName = options.themeName || "Theme 3";
            const steps = [];

            const contentExport = await this.exportContent({
                includeDrafts,
                includeArchived,
                outputPath: serviceConfig.exportPath
            });
            steps.push({ id: "content", status: "passed", label: "Content exported", result: contentExport });

            const themeExport = await this.exportTheme({
                themeName,
                includeCompiledAssets: options.includeCompiledAssets !== false,
                includeFallbackData: options.includeFallbackData !== false,
                includeDraftBindings: Boolean(options.includeDraftBindings),
                overwrite: true
            });
            steps.push({ id: "theme", status: "passed", label: "Theme built", result: themeExport });

            const staticOutput = await this.generateStaticOutput({
                outputPath: options.outputPath || serviceConfig.buildPath
            });
            steps.push({ id: "static", status: "passed", label: "Static output generated", result: staticOutput });

            const checklist = await this.getPublishChecklist();
            return {
                generatedAt: new Date().toISOString(),
                status: checklist.valid ? "success" : "warning",
                steps,
                checklist,
                buildPath: getThemeBuildPath(themeExport.outputPath),
                staticBuildPath: staticOutput.outputPath,
                siteUrl: "/site/"
            };
        },

        async getPublishStatus() {
            const checklist = await this.getPublishChecklist();
            const storedSettings = await readStoredSettingsForTheme(serviceConfig, this.getDefaultSettings());
            const activeTheme = resolveActiveThemeInfo(serviceConfig, storedSettings);
            const activeThemeBuildPath = getThemeBuildPath(activeTheme.themePath);
            const statusBuildPath = await fs.pathExists(activeThemeBuildPath) ? activeThemeBuildPath : serviceConfig.buildPath;
            const buildManifest = await getNewestMtime([
                path.join(statusBuildPath || "", "index.html"),
                statusBuildPath
            ]);
            return {
                generatedAt: new Date().toISOString(),
                checklist,
                buildPath: statusBuildPath,
                siteUrl: "/site/",
                lastBuildAt: buildManifest ? buildManifest.toISOString() : null
            };
        },

        async listMedia() {
            const rows = await cmsRepository.dbAll(`
                SELECT
                    id,
                    file_name AS fileName,
                    stored_name AS storedName,
                    mime_type AS mimeType,
                    size_bytes AS sizeBytes,
                    width,
                    height,
                    url,
                    created_at AS createdAt,
                    updated_at AS updatedAt
                FROM cms_media_assets
                ORDER BY updated_at DESC, id DESC
            `);

            const entries = await cmsRepository.dbAll("SELECT data_json AS dataJson FROM cms_entries");
            return rows.map((row) => {
                const usedByCount = entries.filter((entry) => String(entry.dataJson || "").includes(row.url)).length;
                return normalizeMediaRow(row, usedByCount);
            });
        },

        async createMediaAsset(payload = {}) {
            const fileName = sanitizeFileName(payload.fileName || payload.name || "asset");
            const mimeType = String(payload.mimeType || payload.fileType || "application/octet-stream").trim();
            const dataBase64 = String(payload.dataBase64 || "").replace(/^data:[^;]+;base64,/, "");
            if (!dataBase64) {
                throw createActionableError("Missing media file data", 400, "CMS_MEDIA_DATA_REQUIRED");
            }

            const buffer = Buffer.from(dataBase64, "base64");
            if (!buffer.length) {
                throw createActionableError("Media file data is empty", 400, "CMS_MEDIA_DATA_EMPTY");
            }

            await fs.ensureDir(serviceConfig.uploadsPath);
            const storedName = `${Date.now()}-${fileName}`;
            const targetPath = path.join(serviceConfig.uploadsPath, storedName);
            await fs.writeFile(targetPath, buffer);

            const now = new Date().toISOString();
            const url = `/uploads/${storedName}`;
            const dimensions = payload.dimensions || {};
            const result = await cmsRepository.dbRun(
                `
                    INSERT INTO cms_media_assets (
                        file_name, stored_name, mime_type, size_bytes, width, height, url, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                `,
                [
                    fileName,
                    storedName,
                    mimeType,
                    buffer.length,
                    Number.isFinite(Number(dimensions.width)) ? Number(dimensions.width) : null,
                    Number.isFinite(Number(dimensions.height)) ? Number(dimensions.height) : null,
                    url,
                    now,
                    now
                ]
            );

            return normalizeMediaRow({
                id: result.lastID,
                fileName,
                storedName,
                mimeType,
                sizeBytes: buffer.length,
                width: Number.isFinite(Number(dimensions.width)) ? Number(dimensions.width) : null,
                height: Number.isFinite(Number(dimensions.height)) ? Number(dimensions.height) : null,
                url,
                createdAt: now,
                updatedAt: now
            });
        },

        async updateMediaAsset(id, payload = {}) {
            const numericId = Number(id);
            if (!Number.isInteger(numericId) || numericId <= 0) {
                throw createActionableError("Invalid media id", 400, "CMS_MEDIA_ID_INVALID", { id });
            }
            const current = await cmsRepository.dbGet(
                "SELECT id, file_name AS fileName, stored_name AS storedName, mime_type AS mimeType, size_bytes AS sizeBytes, width, height, url, created_at AS createdAt FROM cms_media_assets WHERE id = ?",
                [numericId]
            );
            if (!current) {
                throw createActionableError("Media asset not found", 404, "CMS_MEDIA_NOT_FOUND", { id: numericId });
            }

            let fileName = current.fileName;
            let mimeType = current.mimeType;
            let sizeBytes = current.sizeBytes;
            let width = current.width;
            let height = current.height;

            if (payload.fileName || payload.name) {
                fileName = sanitizeFileName(payload.fileName || payload.name);
            }

            if (payload.dataBase64) {
                const dataBase64 = String(payload.dataBase64 || "").replace(/^data:[^;]+;base64,/, "");
                const buffer = Buffer.from(dataBase64, "base64");
                await fs.ensureDir(serviceConfig.uploadsPath);
                await fs.writeFile(path.join(serviceConfig.uploadsPath, current.storedName), buffer);
                mimeType = String(payload.mimeType || payload.fileType || current.mimeType).trim();
                sizeBytes = buffer.length;
                const dimensions = payload.dimensions || {};
                width = Number.isFinite(Number(dimensions.width)) ? Number(dimensions.width) : null;
                height = Number.isFinite(Number(dimensions.height)) ? Number(dimensions.height) : null;
            }

            const now = new Date().toISOString();
            await cmsRepository.dbRun(
                `
                    UPDATE cms_media_assets
                    SET file_name = ?, mime_type = ?, size_bytes = ?, width = ?, height = ?, updated_at = ?
                    WHERE id = ?
                `,
                [fileName, mimeType, sizeBytes, width, height, now, numericId]
            );

            return normalizeMediaRow({
                id: numericId,
                fileName,
                storedName: current.storedName,
                mimeType,
                sizeBytes,
                width,
                height,
                url: current.url,
                createdAt: current.createdAt,
                updatedAt: now
            });
        },

        async deleteMediaAsset(id) {
            const numericId = Number(id);
            if (!Number.isInteger(numericId) || numericId <= 0) {
                throw createActionableError("Invalid media id", 400, "CMS_MEDIA_ID_INVALID", { id });
            }
            const current = await cmsRepository.dbGet(
                "SELECT id, stored_name AS storedName FROM cms_media_assets WHERE id = ?",
                [numericId]
            );
            if (!current) {
                throw createActionableError("Media asset not found", 404, "CMS_MEDIA_NOT_FOUND", { id: numericId });
            }

            await fs.remove(path.join(serviceConfig.uploadsPath, current.storedName));
            await cmsRepository.dbRun("DELETE FROM cms_media_assets WHERE id = ?", [numericId]);
            return { id: numericId, deleted: true };
        },

        async listForms() {
            const rows = await cmsRepository.dbAll(`
                SELECT
                    id,
                    slug,
                    name,
                    status,
                    definition_json AS definitionJson,
                    created_at AS createdAt,
                    updated_at AS updatedAt
                FROM cms_forms
                ORDER BY updated_at DESC, name COLLATE NOCASE ASC
            `);

            const countRows = await cmsRepository.dbAll(`
                SELECT
                    form_slug AS formSlug,
                    COUNT(*) AS total,
                    SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS unread,
                    MAX(created_at) AS lastActivity
                FROM cms_form_submissions
                GROUP BY form_slug
            `);
            const countsBySlug = new Map(countRows.map((row) => [row.formSlug, row]));
            return rows.map((row) => normalizeFormRow(row, countsBySlug.get(row.slug) || {}));
        },

        async getForm(slug, options = {}) {
            const safeSlug = sanitizeCmsSlug(slug);
            if (!safeSlug) {
                throw createActionableError("Invalid form slug", 400, "CMS_FORM_SLUG_INVALID", { slug });
            }
            const row = await cmsRepository.dbGet(
                `
                    SELECT
                        id,
                        slug,
                        name,
                        status,
                        definition_json AS definitionJson,
                        created_at AS createdAt,
                        updated_at AS updatedAt
                    FROM cms_forms
                    WHERE slug = ?
                `,
                [safeSlug]
            );
            if (!row || (options.publicOnly && row.status !== "active")) {
                throw createActionableError("CMS form not found", 404, "CMS_FORM_NOT_FOUND", { slug: safeSlug });
            }
            const countRow = await cmsRepository.dbGet(
                `
                    SELECT
                        COUNT(*) AS total,
                        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS unread,
                        MAX(created_at) AS lastActivity
                    FROM cms_form_submissions
                    WHERE form_slug = ?
                `,
                [safeSlug]
            );
            return normalizeFormRow(row, countRow || {});
        },

        async createForm({ slug, name, status = "draft", definition }) {
            const safeSlug = sanitizeCmsSlug(slug);
            const safeName = String(name || "").trim();
            if (!safeSlug) {
                throw createActionableError("Invalid form slug", 400, "CMS_FORM_SLUG_INVALID", { slug });
            }
            if (!safeName) {
                throw createActionableError("Form name is required", 400, "CMS_FORM_NAME_REQUIRED", { name });
            }
            const existing = await cmsRepository.dbGet("SELECT slug FROM cms_forms WHERE slug = ?", [safeSlug]);
            if (existing) {
                throw createActionableError(`CMS form already exists: ${safeSlug}`, 409, "CMS_FORM_EXISTS", { slug: safeSlug });
            }

            const normalizedDefinition = normalizeCmsFormDefinition(definition);
            const normalizedStatus = normalizeFormStatus(status);
            const now = new Date().toISOString();
            const result = await cmsRepository.dbRun(
                `
                    INSERT INTO cms_forms (slug, name, status, definition_json, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `,
                [safeSlug, safeName, normalizedStatus, JSON.stringify(normalizedDefinition), now, now]
            );

            return normalizeFormRow({
                id: result.lastID,
                slug: safeSlug,
                name: safeName,
                status: normalizedStatus,
                definitionJson: JSON.stringify(normalizedDefinition),
                createdAt: now,
                updatedAt: now
            });
        },

        async updateForm(slug, payload = {}) {
            const safeSlug = sanitizeCmsSlug(slug);
            if (!safeSlug) {
                throw createActionableError("Invalid form slug", 400, "CMS_FORM_SLUG_INVALID", { slug });
            }
            const current = await cmsRepository.dbGet(
                "SELECT id, slug, name, status, definition_json AS definitionJson, created_at AS createdAt FROM cms_forms WHERE slug = ?",
                [safeSlug]
            );
            if (!current) {
                throw createActionableError("CMS form not found", 404, "CMS_FORM_NOT_FOUND", { slug: safeSlug });
            }

            const nextName = String(payload.name || current.name || "").trim();
            if (!nextName) {
                throw createActionableError("Form name is required", 400, "CMS_FORM_NAME_REQUIRED", { name: payload.name });
            }
            const nextStatus = payload.status === undefined ? current.status : normalizeFormStatus(payload.status);
            const nextDefinition = payload.definition === undefined
                ? parseJsonRecord(current.definitionJson, { fields: [], settings: {} })
                : normalizeCmsFormDefinition(payload.definition);
            const now = new Date().toISOString();

            await cmsRepository.dbRun(
                `
                    UPDATE cms_forms
                    SET name = ?, status = ?, definition_json = ?, updated_at = ?
                    WHERE slug = ?
                `,
                [nextName, nextStatus, JSON.stringify(nextDefinition), now, safeSlug]
            );

            return normalizeFormRow({
                id: current.id,
                slug: safeSlug,
                name: nextName,
                status: nextStatus,
                definitionJson: JSON.stringify(nextDefinition),
                createdAt: current.createdAt,
                updatedAt: now
            });
        },

        async deleteForm(slug) {
            const safeSlug = sanitizeCmsSlug(slug);
            if (!safeSlug) {
                throw createActionableError("Invalid form slug", 400, "CMS_FORM_SLUG_INVALID", { slug });
            }
            const existing = await cmsRepository.dbGet("SELECT slug FROM cms_forms WHERE slug = ?", [safeSlug]);
            if (!existing) {
                throw createActionableError("CMS form not found", 404, "CMS_FORM_NOT_FOUND", { slug: safeSlug });
            }
            await cmsRepository.dbRun("DELETE FROM cms_form_submissions WHERE form_slug = ?", [safeSlug]);
            await cmsRepository.dbRun("DELETE FROM cms_forms WHERE slug = ?", [safeSlug]);
            return { slug: safeSlug, deleted: true };
        },

        async listFormSubmissions(slug) {
            const safeSlug = sanitizeCmsSlug(slug);
            if (!safeSlug) {
                throw createActionableError("Invalid form slug", 400, "CMS_FORM_SLUG_INVALID", { slug });
            }
            await this.getForm(safeSlug);
            const rows = await cmsRepository.dbAll(
                `
                    SELECT
                        id,
                        form_slug AS formSlug,
                        status,
                        data_json AS dataJson,
                        created_at AS createdAt,
                        updated_at AS updatedAt
                    FROM cms_form_submissions
                    WHERE form_slug = ?
                    ORDER BY created_at DESC, id DESC
                `,
                [safeSlug]
            );
            return rows.map((row) => ({
                id: row.id,
                formSlug: row.formSlug,
                status: row.status,
                data: parseJsonRecord(row.dataJson, {}),
                createdAt: row.createdAt,
                updatedAt: row.updatedAt
            }));
        },

        async createFormSubmission(slug, data = {}) {
            const form = await this.getForm(slug, { publicOnly: true });
            const normalizedData = normalizeCmsEntryData(data);
            const missingFields = form.fields.filter((field) => {
                if (!field.required || field.type === "checkbox") return false;
                const value = normalizedData[field.name];
                return value === undefined || value === null || String(value).trim() === "";
            });
            if (missingFields.length > 0) {
                throw createActionableError(
                    "Required form fields are missing",
                    400,
                    "CMS_FORM_SUBMISSION_INVALID",
                    { fields: missingFields.map((field) => field.name) }
                );
            }

            const now = new Date().toISOString();
            if (form.settings.storeSubmissions === false) {
                return {
                    stored: false,
                    formSlug: form.slug,
                    status: "accepted",
                    createdAt: now
                };
            }

            const result = await cmsRepository.dbRun(
                `
                    INSERT INTO cms_form_submissions (form_slug, status, data_json, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?)
                `,
                [form.slug, "new", JSON.stringify(normalizedData), now, now]
            );
            return {
                id: result.lastID,
                formSlug: form.slug,
                status: "new",
                data: normalizedData,
                createdAt: now,
                updatedAt: now
            };
        },

        async updateFormSubmissionStatus(slug, id, status) {
            const safeSlug = sanitizeCmsSlug(slug);
            const numericId = Number(id);
            if (!safeSlug) {
                throw createActionableError("Invalid form slug", 400, "CMS_FORM_SLUG_INVALID", { slug });
            }
            if (!Number.isInteger(numericId) || numericId <= 0) {
                throw createActionableError("Invalid submission id", 400, "CMS_SUBMISSION_ID_INVALID", { id });
            }
            const current = await cmsRepository.dbGet(
                "SELECT id, form_slug AS formSlug, data_json AS dataJson, created_at AS createdAt FROM cms_form_submissions WHERE id = ? AND form_slug = ?",
                [numericId, safeSlug]
            );
            if (!current) {
                throw createActionableError("CMS form submission not found", 404, "CMS_SUBMISSION_NOT_FOUND", { id: numericId });
            }
            const nextStatus = normalizeSubmissionStatus(status);
            const now = new Date().toISOString();
            await cmsRepository.dbRun(
                "UPDATE cms_form_submissions SET status = ?, updated_at = ? WHERE id = ? AND form_slug = ?",
                [nextStatus, now, numericId, safeSlug]
            );
            return {
                id: numericId,
                formSlug: safeSlug,
                status: nextStatus,
                data: parseJsonRecord(current.dataJson, {}),
                createdAt: current.createdAt,
                updatedAt: now
            };
        },

        repository: cmsRepository
    };
}

function slugifyThemeName(value, fallback = "theme-3") {
    return String(value || fallback)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/(^-+|-+$)/g, "") || fallback;
}

function isPathInside(parentPath, targetPath) {
    const relative = path.relative(path.resolve(parentPath), path.resolve(targetPath));
    return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function waitForStream(stream) {
    return new Promise((resolve, reject) => {
        stream.on("end", resolve);
        stream.on("finish", resolve);
        stream.on("error", reject);
    });
}

async function copyIfExists(from, to) {
    if (from && await fs.pathExists(from)) {
        await fs.copy(from, to, { overwrite: true, errorOnExist: false });
        return true;
    }
    return false;
}

function getThemeBuildPath(themePath = "") {
    return path.join(themePath || "", "build");
}

async function getThemeRuntimePath(themePath = "") {
    const buildPath = getThemeBuildPath(themePath);
    return buildPath && await fs.pathExists(buildPath) ? buildPath : themePath;
}

async function removeLegacyThemeRuntimeDirs(themePath = "") {
    const legacyDirs = ["templates", "layouts", "pages", "regions", "views", "partials", "components", "assets", "data", "bindings"];
    await Promise.all(legacyDirs.map(async (dir) => {
        const target = path.join(themePath, dir);
        if (target && await fs.pathExists(target)) {
            await fs.remove(target);
        }
    }));
}

function getTemplatePartialPaths(template = {}) {
    const paths = new Set();
    Object.values(template.defaultBlocks || {}).forEach((blocks) => {
        if (!Array.isArray(blocks)) {
            return;
        }
        blocks.forEach((block) => {
            const componentPath = String(block?.componentPath || block?.partial || "").replace(/\\/g, "/").trim();
            if (!componentPath || path.isAbsolute(componentPath) || componentPath.includes("..")) {
                return;
            }
            if (!componentPath.startsWith("partials/") || componentPath.startsWith("partials/micro/")) {
                return;
            }
            paths.add(componentPath);
        });
    });
    return Array.from(paths).sort();
}

async function syncTemplateBuildPartials(template = {}, buildDir = "", serviceConfig = {}) {
    const partialPaths = getTemplatePartialPaths(template);
    const targetRoot = path.join(buildDir || "", "partials");
    await fs.emptyDir(targetRoot);

    for (const partialPath of partialPaths) {
        const sourceRelative = partialPath.replace(/^partials\//, "");
        const from = path.join(serviceConfig.partialsPath || "", sourceRelative);
        const to = path.join(buildDir, partialPath);
        if (await fs.pathExists(from)) {
            await fs.ensureDir(path.dirname(to));
            await fs.copy(from, to, { overwrite: true, errorOnExist: false });
        }
    }
}

async function copyFirstExisting(candidates = [], targetPath = "") {
    for (const candidate of candidates) {
        if (candidate && await fs.pathExists(candidate)) {
            await fs.ensureDir(path.dirname(targetPath));
            await fs.copy(candidate, targetPath, { overwrite: true, errorOnExist: false });
            return true;
        }
    }
    return false;
}

function getLocalAssetRefs(html = "") {
    const refs = new Set(["css/styles.css", "js/main.js"]);
    const attrRegex = /\b(?:src|href)=["']([^"']+)["']/gi;
    let match;
    while ((match = attrRegex.exec(String(html || ""))) !== null) {
        const value = String(match[1] || "").trim().replace(/\\/g, "/");
        if (!value || value.startsWith("http://") || value.startsWith("https://") || value.startsWith("//") || value.startsWith("#") || value.startsWith("mailto:")) {
            continue;
        }
        const cleaned = value
            .replace(/^\/site\//, "")
            .replace(/^\/+/, "")
            .replace(/^\.\//, "");
        if (cleaned.includes("..") || path.isAbsolute(cleaned)) {
            continue;
        }
        if (/^(css|js|img|assets\/images|assets\/icons|assets\/resources|uploads)\//.test(cleaned)) {
            refs.add(cleaned);
        }
    }
    return Array.from(refs).sort();
}

function isExternalAssetUrl(value = "") {
    return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|mailto:|tel:|data:|blob:)/i.test(String(value || "").trim());
}

function normalizeLocalAssetUrl(value = "") {
    return String(value || "")
        .trim()
        .replace(/\\/g, "/")
        .replace(/^\/site\//, "")
        .replace(/^\/+/, "")
        .replace(/^\.\//, "")
        .replace(/^(?:\.\.\/)+(?:src\/)?images\//, "img/");
}

function shouldRewritePreviewAssetUrl(value = "") {
    if (!value || isExternalAssetUrl(value)) {
        return false;
    }
    const cleaned = normalizeLocalAssetUrl(value);
    return /^(?:css|js|img|assets\/images|assets\/icons|assets\/resources|uploads|src\/images)\//.test(cleaned);
}

function toPreviewAssetUrl(value = "", assetBase = "/site/") {
    const base = String(assetBase || "/site/").replace(/\/?$/, "/");
    const cleaned = normalizeLocalAssetUrl(value).replace(/^src\/images\//, "img/");
    return `${base}${cleaned}`;
}

function rewritePreviewAssetUrls(html = "", assetBase = "/site/") {
    let output = String(html || "").replace(/\b(src|href)=("([^"]*)"|'([^']*)')/gi, (match, attr, quoted, doubleValue, singleValue) => {
        const value = doubleValue ?? singleValue ?? "";
        if (!shouldRewritePreviewAssetUrl(value)) {
            return match;
        }
        const quote = quoted.startsWith("'") ? "'" : "\"";
        return `${attr}=${quote}${toPreviewAssetUrl(value, assetBase)}${quote}`;
    });

    output = output.replace(/\bsrcset=("([^"]*)"|'([^']*)')/gi, (match, quoted, doubleValue, singleValue) => {
        const value = doubleValue ?? singleValue ?? "";
        const rewritten = value.split(",").map((candidate) => {
            const parts = candidate.trim().split(/\s+/);
            if (!parts[0] || !shouldRewritePreviewAssetUrl(parts[0])) {
                return candidate.trim();
            }
            return [toPreviewAssetUrl(parts[0], assetBase), ...parts.slice(1)].join(" ");
        }).join(", ");
        const quote = quoted.startsWith("'") ? "'" : "\"";
        return `srcset=${quote}${rewritten}${quote}`;
    });

    return output;
}

async function syncTemplateBuildAssets(html = "", buildDir = "", serviceConfig = {}) {
    await Promise.all(["assets", "css", "js", "img", "src"].map(async (dir) => {
        const target = path.join(buildDir, dir);
        if (await fs.pathExists(target)) {
            await fs.remove(target);
        }
    }));

    const projectBuildPath = serviceConfig.buildPath || path.join(serviceConfig.projectRoot || process.cwd(), "build");
    const sourcePath = serviceConfig.sourcePath || "";
    await syncCompleteSourceTree(buildDir, serviceConfig);
    const refs = getLocalAssetRefs(html);
    for (const ref of refs) {
        const targetPath = path.join(buildDir, ref);
        const fileName = path.basename(ref);
        const candidates = [
            path.join(projectBuildPath, ref),
            ref.startsWith("img/") ? path.join(sourcePath, "images", fileName) : "",
            ref.startsWith("assets/images/") ? path.join(sourcePath, "images", fileName) : "",
            ref.startsWith("assets/icons/") ? path.join(sourcePath, "images", fileName) : "",
            ref.startsWith("uploads/") ? path.join(serviceConfig.uploadsPath || "", fileName) : "",
            ref.startsWith("css/") ? path.join(sourcePath, "css", fileName) : "",
            ref.startsWith("js/") ? path.join(sourcePath, "js", fileName) : ""
        ];
        await copyFirstExisting(candidates, targetPath);
    }
}

function getAssetMimeType(filePath = "") {
    const ext = path.extname(filePath).toLowerCase();
    const types = {
        ".avif": "image/avif",
        ".gif": "image/gif",
        ".ico": "image/x-icon",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".svg": "image/svg+xml",
        ".webp": "image/webp"
    };
    return types[ext] || "application/octet-stream";
}

function isPortableImageFile(filePath = "") {
    return /\.(?:avif|gif|ico|jpe?g|png|svg|webp)$/i.test(filePath);
}

async function importThemeBuildImagesToMedia(buildDir = "", serviceConfig = {}, cmsRepository = null) {
    if (!buildDir || !cmsRepository || !await fs.pathExists(buildDir)) {
        return [];
    }
    const files = await listThemeBuildFiles(buildDir);
    const imageFiles = files
        .filter((file) => /^(build\/img\/|build\/assets\/images\/|build\/assets\/icons\/|build\/src\/images\/)/.test(file))
        .filter(isPortableImageFile);
    const imported = [];
    const now = new Date().toISOString();

    await fs.ensureDir(serviceConfig.uploadsPath);

    for (const manifestPath of imageFiles) {
        const relativePath = manifestPath.replace(/^build\//, "");
        const sourcePath = path.join(buildDir, relativePath);
        if (!await fs.pathExists(sourcePath)) {
            continue;
        }
        const buffer = await fs.readFile(sourcePath);
        if (!buffer.length) {
            continue;
        }
        const hash = crypto.createHash("sha1").update(buffer).digest("hex").slice(0, 12);
        const fileName = sanitizeFileName(path.basename(sourcePath), "theme-asset");
        const storedName = `theme-${hash}-${fileName}`;
        const targetPath = path.join(serviceConfig.uploadsPath, storedName);
        await fs.writeFile(targetPath, buffer);

        const existing = await cmsRepository.dbGet(
            "SELECT id FROM cms_media_assets WHERE stored_name = ?",
            [storedName]
        );
        if (existing) {
            await cmsRepository.dbRun(
                "UPDATE cms_media_assets SET file_name = ?, mime_type = ?, size_bytes = ?, updated_at = ? WHERE id = ?",
                [fileName, getAssetMimeType(sourcePath), buffer.length, now, existing.id]
            );
            imported.push({ id: existing.id, fileName, url: `/uploads/${storedName}`, source: manifestPath });
            continue;
        }

        const result = await cmsRepository.dbRun(
            `
                INSERT INTO cms_media_assets (
                    file_name, stored_name, mime_type, size_bytes, width, height, url, created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                fileName,
                storedName,
                getAssetMimeType(sourcePath),
                buffer.length,
                null,
                null,
                `/uploads/${storedName}`,
                now,
                now
            ]
        );
        imported.push({ id: result.lastID, fileName, url: `/uploads/${storedName}`, source: manifestPath });
    }

    return imported;
}

async function syncCompleteSourceTree(buildDir = "", serviceConfig = {}) {
    const sourcePath = serviceConfig.sourcePath || "";
    if (!buildDir || !sourcePath || !await fs.pathExists(sourcePath)) {
        return false;
    }

    await copyIfExists(sourcePath, path.join(buildDir, "src"));
    await copyIfExists(path.join(sourcePath, "css"), path.join(buildDir, "assets", "css"));
    await copyIfExists(path.join(sourcePath, "js"), path.join(buildDir, "assets", "js"));
    await copyIfExists(path.join(sourcePath, "images"), path.join(buildDir, "assets", "images"));
    await copyIfExists(path.join(sourcePath, "resources"), path.join(buildDir, "assets", "resources"));
    await copyIfExists(path.join(sourcePath, "scss"), path.join(buildDir, "assets", "scss"));
    await copyIfExists(path.join(sourcePath, "config"), path.join(buildDir, "assets", "config"));
    await copyIfExists(path.join(sourcePath, "css"), path.join(buildDir, "css"));
    await copyIfExists(path.join(sourcePath, "js"), path.join(buildDir, "js"));
    await copyIfExists(path.join(sourcePath, "images"), path.join(buildDir, "img"));
    return true;
}

async function listThemeBuildFiles(buildDir = "") {
    if (!buildDir || !await fs.pathExists(buildDir)) {
        return [];
    }
    const files = [];
    const walk = async (currentDir) => {
        const entries = await fs.readdir(currentDir, { withFileTypes: true }).catch(() => []);
        for (const entry of entries) {
            const entryPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                await walk(entryPath);
            } else if (entry.isFile()) {
                files.push(`build/${path.relative(buildDir, entryPath).replace(/\\/g, "/")}`);
            }
        }
    };
    await walk(buildDir);
    return files.sort();
}

async function getThemeSourceAssetManifest(buildDir = "", serviceConfig = {}) {
    const files = await listThemeBuildFiles(buildDir);
    const sourcePrefix = "build/src/";
    const sourceFiles = files.filter((file) => file.startsWith(sourcePrefix));
    const isStyle = (file) => /\.(?:css|scss|sass)$/i.test(file);
    const isScript = (file) => /\.(?:js|mjs|cjs|ts)$/i.test(file);
    const isImage = (file) => /\.(?:avif|gif|ico|jpe?g|png|svg|webp)$/i.test(file);
    const resourceFiles = sourceFiles.filter((file) => file.startsWith("build/src/resources/"));
    const configFiles = sourceFiles.filter((file) => file.startsWith("build/src/config/"));

    return {
        sourceRoot: serviceConfig.sourcePath || "",
        runtimeRoot: "build",
        styles: files.filter((file) => isStyle(file) && !file.startsWith("build/src/resources/")).sort(),
        scripts: files.filter((file) => isScript(file) && !file.startsWith("build/src/resources/")).sort(),
        images: files.filter(isImage).sort(),
        resources: resourceFiles.sort(),
        config: configFiles.sort(),
        sourceFiles
    };
}

async function updateActiveThemeAssetManifest(themePath = "", buildDir = "", serviceConfig = {}) {
    if (!themePath || !buildDir) {
        return null;
    }
    const manifestPath = path.join(themePath, "theme.json");
    const manifest = await fs.readJson(manifestPath).catch(() => ({}));
    const buildFiles = await listThemeBuildFiles(buildDir);
    const existingFiles = Array.isArray(manifest.files) ? manifest.files : [];
    const nextManifest = {
        ...manifest,
        assets: await getThemeSourceAssetManifest(buildDir, serviceConfig),
        files: Array.from(new Set([...existingFiles, ...buildFiles])).sort(),
        updatedAt: new Date().toISOString()
    };
    await fs.writeJson(manifestPath, nextManifest, { spaces: 2 });
    return nextManifest;
}

async function compilePaniniPages(serviceConfig = {}, outputPath) {
    const pagesRoot = serviceConfig.pagesPath;
    const layoutsRoot = serviceConfig.layoutsPath;
    const partialsRoot = serviceConfig.partialsPath;

    if (!pagesRoot || !await fs.pathExists(pagesRoot)) {
        return false;
    }

    panini.refresh();
    const helpersRoot = path.join(path.dirname(pagesRoot), "helpers");
    const dataRoot = path.join(path.dirname(pagesRoot), "data");
    const toPaniniPath = (targetPath) => {
        const resolved = path.resolve(targetPath);
        const relative = path.relative(process.cwd(), resolved);
        const value = relative && !relative.startsWith("..") && !path.isAbsolute(relative)
            ? relative
            : resolved;
        return value.replace(/\\/g, "/");
    };
    const pagesPath = toPaniniPath(pagesRoot);
    const pagesGlob = `${pagesPath}/**/*.{html,hbs,handlebars}`;
    const stream = src(pagesGlob, { allowEmpty: true })
        .pipe(panini({
            root: pagesPath,
            layouts: toPaniniPath(layoutsRoot),
            partials: toPaniniPath(partialsRoot),
            helpers: toPaniniPath(helpersRoot),
            data: toPaniniPath(dataRoot)
        }))
        .pipe(dest(outputPath));

    await waitForStream(stream);
    return true;
}

async function compileStaticStyles(serviceConfig = {}, outputPath) {
    const sourcePath = serviceConfig.sourcePath || "";
    const cssOutputPath = path.join(outputPath, "css");
    await copyIfExists(path.join(sourcePath, "css"), cssOutputPath);

    const scssEntry = path.join(sourcePath, "scss", "styles.scss");
    if (!await fs.pathExists(scssEntry)) {
        return false;
    }

    const result = sass.compile(scssEntry, {
        style: "expanded",
        loadPaths: [path.join(sourcePath, "scss")]
    });
    await fs.ensureDir(cssOutputPath);
    await fs.writeFile(path.join(cssOutputPath, "styles.css"), result.css, "utf8");
    return true;
}

async function copyStaticAssets(serviceConfig = {}, outputPath) {
    const sourcePath = serviceConfig.sourcePath || "";
    await copyIfExists(path.join(sourcePath, "js"), path.join(outputPath, "js"));
    await copyIfExists(path.join(sourcePath, "images"), path.join(outputPath, "img"));
    await copyIfExists(path.join(sourcePath, "images"), path.join(outputPath, "assets", "images"));
}

function readBuilderDbAll(databasePath, sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(databasePath, sqlite3.OPEN_READONLY, (openErr) => {
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

async function ensureBuilderTemplatesTable(databasePath) {
    if (!databasePath) {
        throw createActionableError("Builder database path is not configured", 500, "BUILDER_DATABASE_NOT_CONFIGURED");
    }
    await fs.ensureDir(path.dirname(databasePath));
    await readBuilderDbRun(
        databasePath,
        `
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
        `
    );
}

function readBuilderDbGet(databasePath, sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(databasePath, (openErr) => {
            if (openErr) {
                reject(openErr);
                return;
            }
            db.get(sql, params, (err, row) => {
                db.close();
                if (err) {
                    reject(err);
                    return;
                }
                resolve(row || null);
            });
        });
    });
}

function readBuilderDbRun(databasePath, sql, params = []) {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(databasePath, (openErr) => {
            if (openErr) {
                reject(openErr);
                return;
            }
            db.run(sql, params, function onRun(err) {
                db.close();
                if (err) {
                    reject(err);
                    return;
                }
                resolve(this);
            });
        });
    });
}

function safeJsonParse(value, fallback) {
    try {
        return JSON.parse(value);
    } catch (_error) {
        return fallback;
    }
}

function getSchemaFields(collection) {
    return Array.isArray(collection?.schema?.fields) ? collection.schema.fields : [];
}

function getViewEntryField(entry = {}, fieldName = "") {
    const normalized = String(fieldName || "").replace(/-/g, "").toLowerCase();
    if (normalized === "entrykey") return entry.entryKey;
    if (normalized === "status") return entry.status;
    if (normalized === "sortorder") return entry.sortOrder;
    if (normalized === "updatedat") return entry.updatedAt;
    return entry.data?.[fieldName];
}

function compareViewValues(left, right) {
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

function applyViewQuery(entries = [], query = {}) {
    const status = String(query.status || "published").toLowerCase();
    const filters = query.filters && typeof query.filters === "object" && !Array.isArray(query.filters)
        ? query.filters
        : {};
    const sorted = entries
        .filter((entry) => status === "any" || String(entry.status || "").toLowerCase() === status)
        .filter((entry) => Object.entries(filters).every(([fieldName, expected]) => {
            const value = getViewEntryField(entry, fieldName);
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
                const comparison = compareViewValues(
                    getViewEntryField(left, sortItem.field),
                    getViewEntryField(right, sortItem.field)
                );
                if (comparison !== 0) {
                    return sortItem.direction === "desc" ? -comparison : comparison;
                }
            }
            return sortEntries(left, right);
        });
    const offset = Number.isFinite(Number(query.offset)) ? Math.max(0, Number(query.offset)) : 0;
    const limit = Number.isFinite(Number(query.limit)) ? Math.max(0, Number(query.limit)) : sorted.length;
    return sorted.slice(offset, limit ? offset + limit : undefined);
}

async function cmsComponentPathExists(componentPath, serviceConfig = {}, activeTheme = null) {
    if (path.isAbsolute(componentPath) || String(componentPath || "").includes("..")) {
        return false;
    }
    const theme = activeTheme || resolveActiveThemeInfo(serviceConfig);
    const runtimeThemePath = await getThemeRuntimePath(theme.themePath || "");
    const candidates = [
        path.join(runtimeThemePath || "", componentPath),
        path.join(runtimeThemePath || "", "partials", componentPath),
        path.join(runtimeThemePath || "", "components", componentPath.replace(/^micro[\\/]/, "")),
        path.join(theme.themePath || "", componentPath),
        path.join(theme.themePath || "", "partials", componentPath),
        path.join(theme.themePath || "", "components", componentPath.replace(/^micro[\\/]/, "")),
        path.join(serviceConfig.projectRoot || "", componentPath),
        path.join(serviceConfig.partialsPath || "", componentPath),
    ];
    for (const candidate of candidates) {
        if (candidate && await fs.pathExists(candidate)) {
            return true;
        }
    }
    return false;
}

function flattenLayoutBlocks(layoutData = {}) {
    const blocks = [];
    if (Array.isArray(layoutData.layout)) {
        blocks.push(...layoutData.layout.map((item) => ({
            ...item,
            region: normalizeThemeRegionId(item?.region, item?.region || "main")
        })));
    }
    if (layoutData.regions && typeof layoutData.regions === "object" && !Array.isArray(layoutData.regions)) {
        Object.entries(layoutData.regions).forEach(([regionId, items]) => {
            const normalizedRegion = normalizeThemeRegionId(regionId);
            if (Array.isArray(items)) {
                items.forEach((item) => blocks.push({
                    ...item,
                    region: normalizeThemeRegionId(item.region || normalizedRegion, normalizedRegion)
                }));
            }
        });
    }
    return blocks.filter((item) => item && typeof item === "object");
}

function getLayoutRegionBlocks(layoutData = {}, regionId = "main") {
    const normalizedRegion = normalizeThemeRegionId(regionId);
    const regions = layoutData?.regions && typeof layoutData.regions === "object" && !Array.isArray(layoutData.regions)
        ? layoutData.regions
        : {};
    return Object.entries(regions).flatMap(([candidateRegionId, blocks]) => {
        if (normalizeThemeRegionId(candidateRegionId) !== normalizedRegion || !Array.isArray(blocks)) {
            return [];
        }
        return blocks.map((block, index) => ({
            ...block,
            region: normalizeThemeRegionId(block.region || normalizedRegion, normalizedRegion),
            order: Number.isFinite(Number(block.order)) ? Number(block.order) : index + 1
        }));
    });
}

function normalizeThemeLayoutData(layoutData = {}) {
    const next = JSON.parse(JSON.stringify(layoutData || {}));
    if (next.regions && typeof next.regions === "object" && !Array.isArray(next.regions)) {
        const normalizedRegions = {};
        Object.entries(next.regions).forEach(([regionId, blocks]) => {
            const normalized = normalizeThemeRegionId(regionId);
            const list = Array.isArray(blocks) ? blocks : [];
            normalizedRegions[normalized] = [
                ...(normalizedRegions[normalized] || []),
                ...list.map((block, index) => ({
                    ...block,
                    region: normalizeThemeRegionId(block.region || normalized, normalized),
                    order: Number.isFinite(Number(block.order)) ? Number(block.order) : index + 1
                }))
            ];
        });
        next.regions = normalizedRegions;
    }
    if (Array.isArray(next.layout)) {
        next.layout = next.layout.map((block) => ({
            ...block,
            region: normalizeThemeRegionId(block.region, block.region || "main")
        }));
    } else if (next.regions && typeof next.regions === "object" && !Array.isArray(next.regions)) {
        next.layout = Object.values(next.regions).flatMap((blocks) => Array.isArray(blocks) ? blocks : []);
    }
    return next;
}

function normalizeCmsRegionRecordMap(input = {}) {
    return Object.entries(input).reduce((acc, [regionId, value]) => {
        const normalized = normalizeThemeRegionId(regionId);
        acc[normalized] = {
            ...(typeof value === "object" && value !== null && !Array.isArray(value) ? value : {}),
            id: normalized
        };
        return acc;
    }, {});
}

function normalizeCmsRegionBlocksMap(input = {}) {
    return Object.entries(input).reduce((acc, [regionId, blocks]) => {
        const normalized = normalizeThemeRegionId(regionId);
        const list = Array.isArray(blocks) ? blocks : [];
        acc[normalized] = [
            ...(acc[normalized] || []),
            ...list.map((block, index) => ({
                ...block,
                region: normalizeThemeRegionId(block.region || normalized, normalized),
                order: Number.isFinite(Number(block.order)) ? Number(block.order) : index + 1
            }))
        ];
        return acc;
    }, {});
}

function normalizeCmsTemplateRecord(input = {}) {
    const templateId = slugifyThemeName(input.templateId || input.id || input.label || "template", "template");
    const regions = input.regions && typeof input.regions === "object" && !Array.isArray(input.regions)
        ? normalizeCmsRegionRecordMap(input.regions)
        : {};
    const defaultBlocks = input.defaultBlocks && typeof input.defaultBlocks === "object" && !Array.isArray(input.defaultBlocks)
        ? normalizeCmsRegionBlocksMap(input.defaultBlocks)
        : {};
    const lockedRegions = Array.isArray(input.lockedRegions)
        ? input.lockedRegions.map((region) => normalizeThemeRegionId(region)).filter(Boolean)
        : [];

    return {
        templateId,
        label: String(input.label || input.name || templateId).trim() || templateId,
        description: String(input.description || "").trim(),
        routePattern: String(input.routePattern || input.route || "").trim(),
        contentType: sanitizeCmsSlug(input.contentType || input.content_type || "", ""),
        layoutId: String(input.layoutId || input.layout_id || "").trim(),
        regions,
        defaultBlocks,
        lockedRegions: Array.from(new Set(lockedRegions)),
        createdAt: input.createdAt || null,
        updatedAt: input.updatedAt || null
    };
}

function getTemplateRegionIds(template = {}) {
    const regions = template.regions && typeof template.regions === "object" && !Array.isArray(template.regions)
        ? Object.keys(template.regions).map((region) => normalizeThemeRegionId(region))
        : [];
    const defaultBlocks = template.defaultBlocks && typeof template.defaultBlocks === "object" && !Array.isArray(template.defaultBlocks)
        ? Object.keys(template.defaultBlocks).map((region) => normalizeThemeRegionId(region))
        : [];
    return Array.from(new Set([...regions, ...defaultBlocks]));
}

function collectBindingRecords(layouts = [], templates = []) {
    const records = [];
    layouts.forEach((layout) => {
        flattenLayoutBlocks(layout.layout).forEach((block) => {
            const binding = block.cmsBinding || block.binding;
            if (binding && typeof binding === "object") {
                records.push({
                    source: "layout",
                    layoutId: layout.fileName,
                    blockId: block.id || null,
                    componentPath: block.componentPath || block.partial || "",
                    region: normalizeThemeRegionId(block.region, block.region || "main"),
                    binding
                });
            }
        });
    });
    templates.forEach((template) => {
        Object.entries(template.defaultBlocks || {}).forEach(([regionId, blocks]) => {
            (Array.isArray(blocks) ? blocks : []).forEach((block) => {
                const binding = block.cmsBinding || block.binding;
                if (binding && typeof binding === "object") {
                    records.push({
                        source: "template",
                        templateId: template.templateId,
                        blockId: block.id || null,
                        componentPath: block.componentPath || block.partial || "",
                        region: normalizeThemeRegionId(block.region || regionId, regionId),
                        binding
                    });
                }
            });
        });
    });
    return records;
}

function getBindingCollections(bindingRecords = []) {
    const slugs = new Set();
    bindingRecords.forEach((record) => {
        const binding = record.binding || {};
        if (binding.collection) {
            slugs.add(String(binding.collection));
        }
        if (binding.contentType) {
            slugs.add(String(binding.contentType));
        }
    });
    return Array.from(slugs).sort();
}

async function getFileMtime(filePath) {
    if (!filePath || !await fs.pathExists(filePath)) {
        return null;
    }
    const stat = await fs.stat(filePath);
    return stat.mtime;
}

async function getNewestMtime(paths = []) {
    const dates = [];
    for (const itemPath of paths) {
        const mtime = await getFileMtime(itemPath);
        if (mtime) {
            dates.push(mtime);
        }
    }
    if (dates.length === 0) {
        return null;
    }
    return dates.sort((a, b) => b.getTime() - a.getTime())[0];
}

function createChecklistItem(id, label, passed, details = "") {
    return {
        id,
        label,
        status: passed ? "passed" : "failed",
        details
    };
}

function humanizeRegionLabel(regionId) {
    return String(regionId || "")
        .replace(/[_-]+/g, " ")
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeThemeRegionId(value, fallback = "main") {
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
        below_content: "content-below",
        project: "main",
        projects: "main",
        supporters: "content-below",
        supporter: "content-below"
    };
    const normalizeToken = (input) => String(input || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "_")
        .replace(/^_+|_+$/g, "");
    const raw = normalizeToken(value);
    const normalized = aliases[raw] || raw;
    if (normalized) {
        return normalized;
    }
    const fallbackRaw = normalizeToken(fallback);
    const fallbackRegion = aliases[fallbackRaw] || fallbackRaw || "main";
    return fallbackRegion || "main";
}

function sortThemeRegions(regionIds = []) {
    const preferredOrder = ["header", "hero", "side-navigation", "content-above", "main", "content-below", "footer"];
    const order = new Map(preferredOrder.map((regionId, index) => [regionId, index]));
    const normalizedRegionIds = Array.from(new Set(regionIds.map((regionId) => normalizeThemeRegionId(regionId))));
    return normalizedRegionIds.sort((left, right) => {
        const leftRank = order.has(left) ? order.get(left) : preferredOrder.length;
        const rightRank = order.has(right) ? order.get(right) : preferredOrder.length;
        if (leftRank !== rightRank) return leftRank - rightRank;
        return String(left).localeCompare(String(right));
    });
}

function createThemeRegionDefinitions(regionIds = []) {
    const required = new Set(["header", "main", "footer"]);
    const defaultPartials = {
        header: "partials/landmark/header.html",
        footer: "partials/landmark/footer.html"
    };

    return regionIds.map((regionId) => ({
        id: regionId,
        label: humanizeRegionLabel(regionId),
        required: required.has(regionId),
        template: `templates/regions/${regionId}.html`,
        defaultPartial: defaultPartials[regionId] || null
    }));
}

function createThemeTemplateManifest(regionIds = []) {
    return [
        {
            id: "page",
            label: "Default Page",
            type: "page",
            file: "templates/page.html",
            regions: regionIds
        }
    ];
}

function buildThemeRegionTemplate(region = {}) {
    const regionId = region.id || "region";
    const fallback = region.defaultPartial
        ? `  {{> ${region.defaultPartial.replace(/^partials\//, "").replace(/\.html$/, "")} }}\n`
        : "";

    return `<section data-theme-region="${regionId}" data-theme-region-label="${region.label || humanizeRegionLabel(regionId)}">
  {{{ region "${regionId}" }}}
${fallback}</section>
`;
}

function buildThemePageTemplate(regionDefinitions = []) {
    const regionIds = regionDefinitions.map((region) => region.id);
    const beforeMain = regionIds.filter((id) => ["header"].includes(id));
    const mainRegions = regionIds.filter((id) => !["header", "footer"].includes(id));
    const afterMain = regionIds.filter((id) => ["footer"].includes(id));
    const renderRegionInclude = (regionId) => `  {{> regions/${regionId} }}`;

    return `<!doctype html>
<html lang="{{ page.lang }}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>{{ page.title }}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          fontFamily: {
            sans: ['Inter', 'sans-serif'],
            heading: ['Space Grotesk', 'sans-serif']
          },
          lineHeight: {
            'tight-08': '0.8',
            'tight-09': '0.9'
          },
          letterSpacing: {
            'ultra-tight': '-0.06em',
            'widest-xl': '0.5em'
          },
          colors: {
            background: {
              light: '#fafafa',
              dark: '#0a0a0a'
            },
            text: {
              light: '#1a1a1a',
              dark: '#f0f0f0'
            }
          }
        }
      }
    };
  </script>
  {{{ assets.styles }}}
</head>
<body class="bg-background-light text-text-light dark:bg-background-dark dark:text-text-dark transition-colors duration-700 overflow-x-hidden font-sans antialiased {{ page.bodyClass }}">
${beforeMain.map(renderRegionInclude).join("\n")}
  <main id="main-content" data-theme-region-group="main">
${mainRegions.map((regionId) => `    {{> regions/${regionId} }}`).join("\n")}
  </main>
${afterMain.map(renderRegionInclude).join("\n")}
  {{{ assets.scripts }}}
</body>
</html>
`;
}

function formatThemeName(slug = "theme-3") {
    return String(slug || "theme-3")
        .split(/[-_]+/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ") || "Theme 3";
}

function resolveActiveThemeInfo(serviceConfig = {}, settings = {}) {
    const themeRoot = path.resolve(settings.themeExportPath || serviceConfig.themeExportPath || path.join(serviceConfig.projectRoot || process.cwd(), "themes"));
    const slug = slugifyThemeName(settings.activeTheme || serviceConfig.activeTheme || "theme-3", "theme-3");
    const configuredPath = String(settings.activeThemePath || serviceConfig.activeThemePath || "").trim();
    const themePath = path.resolve(configuredPath || path.join(themeRoot, slug));
    return {
        slug,
        themeRoot,
        themePath,
        manifestPath: path.join(themePath, "theme.json"),
        infoPath: path.join(themePath, `${slug}.info.yml`)
    };
}

async function readStoredSettingsForTheme(serviceConfig = {}, defaults = {}) {
    if (!serviceConfig.settingsPath || !await fs.pathExists(serviceConfig.settingsPath)) {
        return defaults;
    }
    const stored = await fs.readJson(serviceConfig.settingsPath).catch(() => ({}));
    return normalizeSettingsPayload(stored, defaults);
}

async function readActiveThemeManifest(activeTheme = {}) {
    const jsonManifest = activeTheme.manifestPath && await fs.pathExists(activeTheme.manifestPath)
        ? await fs.readJson(activeTheme.manifestPath).catch(() => null)
        : null;
    const infoManifest = await readActiveThemeInfoManifest(activeTheme);

    if (!jsonManifest && !infoManifest) {
        return null;
    }
    if (!infoManifest) {
        return jsonManifest;
    }

    return {
        ...(jsonManifest || {}),
        ...infoManifest,
        source: {
            ...(jsonManifest?.source || {}),
            ...(infoManifest.source || {})
        },
        regions: infoManifest.regions,
        regionDefinitions: infoManifest.regionDefinitions,
        templates: Array.isArray(jsonManifest?.templates) ? jsonManifest.templates : createThemeTemplateManifest(infoManifest.regions)
    };
}

async function listThemePartials(themePath = "", serviceConfig = {}) {
    const sourcePartialsRoot = serviceConfig.partialsPath || "";
    const runtimeThemePath = await getThemeRuntimePath(themePath);
    const partialsRoot = sourcePartialsRoot && await fs.pathExists(sourcePartialsRoot)
        ? sourcePartialsRoot
        : path.join(runtimeThemePath || "", "partials");
    if (!partialsRoot || !await fs.pathExists(partialsRoot)) {
        return [];
    }
    const results = [];
    const walk = async (currentDir) => {
        const entries = await fs.readdir(currentDir, { withFileTypes: true }).catch(() => []);
        for (const entry of entries) {
            const entryPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                await walk(entryPath);
            } else if (entry.isFile() && /\.html?$/i.test(entry.name)) {
                const relativePath = path.relative(partialsRoot, entryPath).replace(/\\/g, "/");
                if (relativePath === "micro" || relativePath.startsWith("micro/")) {
                    continue;
                }
                const componentPath = `partials/${relativePath}`;
                results.push({
                    name: humanizeRegionLabel(path.basename(entry.name, path.extname(entry.name))),
                    componentPath,
                    partial: componentPath,
                    group: path.dirname(relativePath).replace(/\\/g, "/").replace(/^\.$/, ""),
                    ready: true
                });
            }
        }
    };
    await walk(partialsRoot);
    return results.sort((left, right) => left.componentPath.localeCompare(right.componentPath));
}

async function readActiveThemeInfoManifest(activeTheme = {}) {
    const candidates = [];
    if (activeTheme.infoPath) {
        candidates.push(activeTheme.infoPath);
    }
    if (activeTheme.themePath && await fs.pathExists(activeTheme.themePath)) {
        const entries = await fs.readdir(activeTheme.themePath).catch(() => []);
        entries
            .filter((entry) => /\.info\.ya?ml$/i.test(entry))
            .forEach((entry) => candidates.push(path.join(activeTheme.themePath, entry)));
    }
    const infoPath = candidates.find((candidate) => candidate && fs.existsSync(candidate));
    if (!infoPath) {
        return null;
    }
    const content = await fs.readFile(infoPath, "utf8").catch(() => "");
    const parsed = parseThemeInfoYml(content);
    const regions = Object.keys(parsed.regions || {}).map((regionId) => normalizeThemeRegionId(regionId, regionId));
    if (!regions.length) {
        return {
            ...parsed,
            source: { infoFile: path.basename(infoPath), infoPath },
            regions: [],
            regionDefinitions: []
        };
    }
    const hidden = new Set((parsed.regionsHidden || []).map((regionId) => normalizeThemeRegionId(regionId, regionId)));
    const required = new Set(["header", "main", "footer", "content"]);
    const regionDefinitions = regions
        .filter((regionId) => !hidden.has(regionId))
        .map((regionId) => ({
            id: regionId,
            label: parsed.regions[regionId] || humanizeRegionLabel(regionId),
            required: required.has(regionId),
            template: `build/templates/regions/${regionId}.html`,
            defaultPartial: null,
            source: "info.yml"
        }));
    return {
        name: parsed.name || formatThemeName(activeTheme.slug),
        slug: activeTheme.slug,
        type: parsed.type || "theme",
        description: parsed.description || "",
        version: parsed.version || "1.0.0",
        baseTheme: parsed.baseTheme || "",
        coreVersionRequirement: parsed.coreVersionRequirement || "",
        source: { infoFile: path.basename(infoPath), infoPath },
        regions: regionDefinitions.map((region) => region.id),
        regionDefinitions,
        info: parsed
    };
}

function parseThemeInfoYml(content = "") {
    const result = { regions: {}, regionsHidden: [] };
    let activeMap = "";
    String(content || "").split(/\r?\n/).forEach((line) => {
        const withoutComment = line.replace(/\s+#.*$/, "");
        if (!withoutComment.trim()) {
            return;
        }
        const indent = withoutComment.match(/^\s*/)?.[0].length || 0;
        const trimmed = withoutComment.trim();
        if (indent === 0) {
            activeMap = "";
            const match = trimmed.match(/^([^:]+):\s*(.*)$/);
            if (!match) {
                return;
            }
            const key = match[1].trim();
            const value = parseThemeInfoScalar(match[2]);
            if (key === "regions") {
                activeMap = "regions";
                return;
            }
            if (key === "regions_hidden") {
                activeMap = "regions_hidden";
                if (Array.isArray(value)) {
                    result.regionsHidden = value;
                }
                return;
            }
            if (key === "base theme") result.baseTheme = value;
            else if (key === "core_version_requirement") result.coreVersionRequirement = value;
            else result[key.replace(/[-\s]+([a-z])/g, (_match, letter) => letter.toUpperCase())] = value;
            return;
        }
        if (activeMap === "regions") {
            const match = trimmed.match(/^([^:]+):\s*(.*)$/);
            if (match) {
                const id = normalizeThemeRegionId(match[1], match[1]);
                result.regions[id] = parseThemeInfoScalar(match[2]) || humanizeRegionLabel(id);
            }
            return;
        }
        if (activeMap === "regions_hidden") {
            const match = trimmed.match(/^-\s*(.+)$/);
            if (match) {
                result.regionsHidden.push(parseThemeInfoScalar(match[1]));
            }
        }
    });
    return result;
}

function parseThemeInfoScalar(value = "") {
    const trimmed = String(value || "").trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
        return trimmed.slice(1, -1).split(",").map((item) => parseThemeInfoScalar(item)).filter(Boolean);
    }
    if ((trimmed.startsWith("'") && trimmed.endsWith("'")) || (trimmed.startsWith("\"") && trimmed.endsWith("\""))) {
        return trimmed.slice(1, -1);
    }
    if (trimmed === "false") return false;
    if (trimmed === "true") return true;
    return trimmed;
}

async function validateActiveThemeFolder(activeTheme = {}, manifest = null) {
    const warnings = [];
    const errors = [];
    const themePath = activeTheme.themePath || "";
    const runtimeThemePath = await getThemeRuntimePath(themePath);
    const manifestPath = activeTheme.manifestPath || "";

    if (!themePath || !await fs.pathExists(themePath)) {
        warnings.push({
            code: "THEME_ACTIVE_FOLDER_MISSING",
            message: `Active theme folder was not found: ${themePath}.`,
            themePath
        });
        return { errors, warnings };
    }
    if (!manifest) {
        warnings.push({
            code: "THEME_ACTIVE_MANIFEST_MISSING",
            message: `Active theme manifest was not found: ${manifestPath}.`,
            manifestPath
        });
        return { errors, warnings };
    }

    const manifestFiles = Array.isArray(manifest.files) ? manifest.files.filter(Boolean) : [];
    if (manifestFiles.length) {
        for (const filePath of manifestFiles) {
            const relativePath = String(filePath || "").replace(/\\/g, "/");
            if (path.isAbsolute(relativePath) || relativePath.includes("..")) {
                warnings.push({
                    code: "THEME_ACTIVE_FILE_PATH_INVALID",
                    message: `Theme manifest contains an invalid file path: ${relativePath}.`,
                    path: relativePath
                });
                continue;
            }
            if (!await fs.pathExists(path.join(themePath, relativePath))) {
                warnings.push({
                    code: "THEME_ACTIVE_FILE_MISSING",
                    message: `Theme manifest file is missing: ${relativePath}.`,
                    path: relativePath
                });
            }
        }
    } else {
        const expectedDirs = ["templates", "templates/regions", "layouts", "pages", "regions", "partials", "components", "assets", "data/fallback", "bindings"];
        for (const dir of expectedDirs) {
            const dirPath = path.join(runtimeThemePath, dir);
            if (!await fs.pathExists(dirPath)) {
                warnings.push({
                    code: "THEME_ACTIVE_DIR_MISSING",
                    message: `Active theme directory is missing: build/${dir}.`,
                    path: `build/${dir}`
                });
            }
        }
    }

    for (const template of manifest.templates || []) {
        if (template.file && !await fs.pathExists(path.join(themePath, template.file))) {
            warnings.push({
                code: "THEME_ACTIVE_TEMPLATE_FILE_MISSING",
                message: `Theme template file is missing: ${template.file}.`,
                path: template.file
            });
        }
    }
    for (const region of manifest.regionDefinitions || []) {
        if (region.template && !await fs.pathExists(path.join(themePath, region.template))) {
            warnings.push({
                code: "THEME_ACTIVE_REGION_TEMPLATE_MISSING",
                message: `Theme region template is missing: ${region.template}.`,
                region: region.id,
                path: region.template
            });
        }
        if (region.defaultPartial && !await fs.pathExists(path.join(themePath, region.defaultPartial))) {
            warnings.push({
                code: "THEME_ACTIVE_DEFAULT_PARTIAL_MISSING",
                message: `Theme default partial is missing: ${region.defaultPartial}.`,
                region: region.id,
                path: region.defaultPartial
            });
        }
    }
    for (const view of manifest.views || []) {
        if (view.file && !await fs.pathExists(path.join(themePath, view.file))) {
            warnings.push({
                code: "THEME_ACTIVE_VIEW_FILE_MISSING",
                message: `Theme View file is missing: ${view.file}.`,
                viewId: view.id,
                path: view.file
            });
        }
    }

    return { errors, warnings };
}

function normalizeSettingsPayload(payload = {}, defaults = {}) {
    const stringFields = [
        "projectName",
        "cmsBaseUrl",
        "cmsAdminUrl",
        "builderPreviewUrl",
        "localStoragePath",
        "activeTheme",
        "activeThemePath",
        "contentExportPath",
        "themeExportPath",
        "apiEndpoint",
        "apiToken"
    ];
    const next = { ...defaults };
    stringFields.forEach((field) => {
        if (payload[field] !== undefined) {
            next[field] = String(payload[field] || "").trim();
        }
    });
    return next;
}

function validateSettingsPayload(settings = {}) {
    const warnings = [];
    const errors = [];
    const requireUrl = (field, label) => {
        const value = String(settings[field] || "").trim();
        if (!value) {
            errors.push({ field, message: `${label} is required.` });
            return;
        }
        if (!/^https?:\/\//i.test(value)) {
            errors.push({ field, message: `${label} must start with http:// or https://.` });
        }
    };

    if (!String(settings.projectName || "").trim()) {
        errors.push({ field: "projectName", message: "Project name is required." });
    }
    requireUrl("cmsBaseUrl", "CMS base URL");
    requireUrl("cmsAdminUrl", "CMS admin URL");
    requireUrl("builderPreviewUrl", "Builder preview URL");
    if (settings.apiEndpoint && !/^https?:\/\//i.test(String(settings.apiEndpoint))) {
        warnings.push({ field: "apiEndpoint", message: "API endpoint should start with http:// or https://." });
    }
    ["localStoragePath", "contentExportPath", "themeExportPath", "activeThemePath"].forEach((field) => {
        if (!String(settings[field] || "").trim()) {
            warnings.push({ field, message: `${field} is empty; the server default will be used.` });
        }
    });

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

module.exports = {
    createCmsService
};
