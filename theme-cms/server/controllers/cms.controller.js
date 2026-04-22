"use strict";

function createCmsController(options = {}) {
    const cmsService = options.cmsService;
    const logBoundary = typeof options.logBoundary === "function" ? options.logBoundary : () => {};
    const sendError = typeof options.sendError === "function"
        ? options.sendError
        : (res, err, fallbackCode) => {
            res.status(err.statusCode || 500).json({
                success: false,
                error: err.message,
                code: err.code || fallbackCode,
                details: err.details || {}
            });
        };

    return {
        listCollections: async (req, res) => {
            logBoundary("route", "GET /api/cms/collections");
            try {
                const items = await cmsService.listCollections();
                res.json({ success: true, data: items });
            } catch (err) {
                sendError(res, err, "CMS_COLLECTIONS_LIST_FAILED");
            }
        },
        createCollection: async (req, res) => {
            logBoundary("route", "POST /api/cms/collections");
            try {
                const { slug, name, schema } = req.body || {};
                if (!slug || !name) {
                    return res.status(400).json({ success: false, error: "Missing slug or name" });
                }
                const item = await cmsService.createCollection({ slug, name, schema });
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_COLLECTION_CREATE_FAILED");
            }
        },
        updateCollection: async (req, res) => {
            logBoundary("route", "PUT /api/cms/collections/:slug");
            try {
                const { slug } = req.params;
                const { name, schema } = req.body || {};
                const item = await cmsService.updateCollection(slug, { name, schema });
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_COLLECTION_UPDATE_FAILED");
            }
        },
        deleteCollection: async (req, res) => {
            logBoundary("route", "DELETE /api/cms/collections/:slug");
            try {
                const { slug } = req.params;
                const item = await cmsService.deleteCollection(slug);
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_COLLECTION_DELETE_FAILED");
            }
        },
        listEntries: async (req, res) => {
            logBoundary("route", "GET /api/cms/entries");
            try {
                const collection = req.query?.collection;
                if (!collection) {
                    return res.status(400).json({ success: false, error: "Missing collection parameter" });
                }
                const items = await cmsService.listEntries(collection);
                res.json({ success: true, data: items });
            } catch (err) {
                sendError(res, err, "CMS_ENTRIES_LIST_FAILED");
            }
        },
        createEntry: async (req, res) => {
            logBoundary("route", "POST /api/cms/entries");
            try {
                const { collection, entryKey, status, sortOrder, data } = req.body || {};
                if (!collection || !entryKey || data === undefined) {
                    return res.status(400).json({ success: false, error: "Missing collection, entryKey, or data" });
                }
                const item = await cmsService.createEntry({ collection, entryKey, status, sortOrder, data });
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_ENTRY_CREATE_FAILED");
            }
        },
        updateEntry: async (req, res) => {
            logBoundary("route", "PUT /api/cms/entries/:id");
            try {
                const { id } = req.params;
                const item = await cmsService.updateEntry(id, req.body || {});
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_ENTRY_UPDATE_FAILED");
            }
        },
        deleteEntry: async (req, res) => {
            logBoundary("route", "DELETE /api/cms/entries/:id");
            try {
                const { id } = req.params;
                const item = await cmsService.deleteEntry(id);
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_ENTRY_DELETE_FAILED");
            }
        },
        exportContent: async (req, res) => {
            logBoundary("route", "POST /api/cms/export");
            try {
                const payload = req.body || {};
                const item = await cmsService.exportContent({
                    includeDrafts: Boolean(payload.includeDrafts),
                    includeArchived: Boolean(payload.includeArchived),
                    outputPath: payload.outputPath || undefined,
                    previewOutputPath: payload.previewOutputPath || undefined
                });
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_EXPORT_FAILED");
            }
        }
    };
}

module.exports = {
    createCmsController
};
