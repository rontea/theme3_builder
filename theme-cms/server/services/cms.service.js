"use strict";

const fs = require("fs-extra");
const path = require("path");

const {
    createActionableError,
    sanitizeCmsSlug,
    sanitizeCmsEntryKey,
    normalizeCmsSchema,
    normalizeCmsEntryData,
    parseJsonRecord
} = require("../utils/cms-utils");

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

        repository: cmsRepository
    };
}

module.exports = {
    createCmsService
};
