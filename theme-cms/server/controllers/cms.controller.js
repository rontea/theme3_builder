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
        getSettings: async (req, res) => {
            logBoundary("route", "GET /api/cms/settings");
            try {
                const item = await cmsService.getSettings();
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_SETTINGS_GET_FAILED");
            }
        },
        updateSettings: async (req, res) => {
            logBoundary("route", "PUT /api/cms/settings");
            try {
                const item = await cmsService.updateSettings(req.body || {});
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_SETTINGS_UPDATE_FAILED");
            }
        },
        exportSettingsData: async (req, res) => {
            logBoundary("route", "POST /api/cms/settings/export-data");
            try {
                const snapshot = await cmsService.createContentSnapshot(req.body || {});
                res.json({ success: true, data: snapshot });
            } catch (err) {
                sendError(res, err, "CMS_SETTINGS_EXPORT_DATA_FAILED");
            }
        },
        validateImportData: async (req, res) => {
            logBoundary("route", "POST /api/cms/settings/validate-import");
            try {
                const item = cmsService.validateContentSnapshot(req.body?.snapshot || req.body || {});
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_SETTINGS_VALIDATE_IMPORT_FAILED");
            }
        },
        importSettingsData: async (req, res) => {
            logBoundary("route", "POST /api/cms/settings/import-data");
            try {
                const item = await cmsService.importContentSnapshot(req.body?.snapshot || req.body || {});
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_SETTINGS_IMPORT_DATA_FAILED");
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
        },
        listThemes: async (req, res) => {
            logBoundary("route", "GET /api/cms/themes");
            try {
                const items = await cmsService.listThemes();
                res.json({ success: true, data: items });
            } catch (err) {
                sendError(res, err, "CMS_THEMES_LIST_FAILED");
            }
        },
        exportTheme: async (req, res) => {
            logBoundary("route", "POST /api/cms/themes/export");
            try {
                const payload = req.body || {};
                const item = await cmsService.exportTheme({
                    themeName: payload.themeName,
                    version: payload.version,
                    outputPath: payload.outputPath,
                    includeCompiledAssets: payload.includeCompiledAssets,
                    includeFallbackData: payload.includeFallbackData,
                    includeDraftBindings: payload.includeDraftBindings,
                    overwrite: Boolean(payload.overwrite)
                });
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_THEME_EXPORT_FAILED");
            }
        },
        listTemplates: async (req, res) => {
            logBoundary("route", "GET /api/cms/templates");
            try {
                const items = await cmsService.listTemplates();
                res.json({ success: true, data: items });
            } catch (err) {
                sendError(res, err, "CMS_TEMPLATES_LIST_FAILED");
            }
        },
        getTemplate: async (req, res) => {
            logBoundary("route", "GET /api/cms/templates/:templateId");
            try {
                const item = await cmsService.getTemplate(req.params.templateId);
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_TEMPLATE_READ_FAILED");
            }
        },
        saveTemplate: async (req, res) => {
            logBoundary("route", "POST /api/cms/templates");
            try {
                const item = await cmsService.saveTemplate(req.body || {});
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_TEMPLATE_SAVE_FAILED");
            }
        },
        deleteTemplate: async (req, res) => {
            logBoundary("route", "DELETE /api/cms/templates/:templateId");
            try {
                const item = await cmsService.deleteTemplate(req.params.templateId);
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_TEMPLATE_DELETE_FAILED");
            }
        },
        listViews: async (req, res) => {
            logBoundary("route", "GET /api/cms/views");
            try {
                const items = await cmsService.listViews();
                res.json({ success: true, data: items });
            } catch (err) {
                sendError(res, err, "CMS_VIEWS_LIST_FAILED");
            }
        },
        getView: async (req, res) => {
            logBoundary("route", "GET /api/cms/views/:viewId");
            try {
                const item = await cmsService.getView(req.params.viewId);
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_VIEW_READ_FAILED");
            }
        },
        createView: async (req, res) => {
            logBoundary("route", "POST /api/cms/views");
            try {
                const item = await cmsService.createView(req.body || {});
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_VIEW_CREATE_FAILED");
            }
        },
        updateView: async (req, res) => {
            logBoundary("route", "PUT /api/cms/views/:viewId");
            try {
                const item = await cmsService.updateView(req.params.viewId, req.body || {});
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_VIEW_UPDATE_FAILED");
            }
        },
        deleteView: async (req, res) => {
            logBoundary("route", "DELETE /api/cms/views/:viewId");
            try {
                const item = await cmsService.deleteView(req.params.viewId);
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_VIEW_DELETE_FAILED");
            }
        },
        previewView: async (req, res) => {
            logBoundary("route", "POST /api/cms/views/:viewId/preview");
            try {
                const item = await cmsService.previewView(req.params.viewId, req.body || {});
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_VIEW_PREVIEW_FAILED");
            }
        },
        getPublishStatus: async (req, res) => {
            logBoundary("route", "GET /api/cms/publish/status");
            try {
                const item = await cmsService.getPublishStatus();
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_PUBLISH_STATUS_FAILED");
            }
        },
        runPublish: async (req, res) => {
            logBoundary("route", "POST /api/cms/publish/run");
            try {
                const payload = req.body || {};
                const item = await cmsService.runPublish({
                    includeDrafts: Boolean(payload.includeDrafts),
                    includeArchived: Boolean(payload.includeArchived),
                    includeCompiledAssets: payload.includeCompiledAssets,
                    includeFallbackData: payload.includeFallbackData,
                    includeDraftBindings: Boolean(payload.includeDraftBindings),
                    themeName: payload.themeName,
                    outputPath: payload.outputPath
                });
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_PUBLISH_RUN_FAILED");
            }
        },
        openBuildFolder: async (req, res) => {
            logBoundary("route", "POST /api/cms/publish/open-build");
            try {
                const item = await cmsService.getPublishStatus();
                res.json({
                    success: true,
                    data: {
                        opened: true,
                        buildPath: item.buildPath,
                        siteUrl: item.siteUrl,
                        message: "Build folder path is ready."
                    }
                });
            } catch (err) {
                sendError(res, err, "CMS_PUBLISH_OPEN_BUILD_FAILED");
            }
        },
        listMedia: async (req, res) => {
            logBoundary("route", "GET /api/cms/media");
            try {
                const items = await cmsService.listMedia();
                res.json({ success: true, data: items });
            } catch (err) {
                sendError(res, err, "CMS_MEDIA_LIST_FAILED");
            }
        },
        createMedia: async (req, res) => {
            logBoundary("route", "POST /api/cms/media");
            try {
                const item = await cmsService.createMediaAsset(req.body || {});
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_MEDIA_CREATE_FAILED");
            }
        },
        updateMedia: async (req, res) => {
            logBoundary("route", "PUT /api/cms/media/:id");
            try {
                const item = await cmsService.updateMediaAsset(req.params.id, req.body || {});
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_MEDIA_UPDATE_FAILED");
            }
        },
        deleteMedia: async (req, res) => {
            logBoundary("route", "DELETE /api/cms/media/:id");
            try {
                const item = await cmsService.deleteMediaAsset(req.params.id);
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_MEDIA_DELETE_FAILED");
            }
        },
        listForms: async (req, res) => {
            logBoundary("route", "GET /api/cms/forms");
            try {
                const items = await cmsService.listForms();
                res.json({ success: true, data: items });
            } catch (err) {
                sendError(res, err, "CMS_FORMS_LIST_FAILED");
            }
        },
        getForm: async (req, res) => {
            logBoundary("route", "GET /api/cms/forms/:slug");
            try {
                const item = await cmsService.getForm(req.params.slug);
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_FORM_GET_FAILED");
            }
        },
        createForm: async (req, res) => {
            logBoundary("route", "POST /api/cms/forms");
            try {
                const { slug, name, status, definition } = req.body || {};
                if (!slug || !name) {
                    return res.status(400).json({ success: false, error: "Missing slug or name" });
                }
                const item = await cmsService.createForm({ slug, name, status, definition });
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_FORM_CREATE_FAILED");
            }
        },
        updateForm: async (req, res) => {
            logBoundary("route", "PUT /api/cms/forms/:slug");
            try {
                const item = await cmsService.updateForm(req.params.slug, req.body || {});
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_FORM_UPDATE_FAILED");
            }
        },
        deleteForm: async (req, res) => {
            logBoundary("route", "DELETE /api/cms/forms/:slug");
            try {
                const item = await cmsService.deleteForm(req.params.slug);
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_FORM_DELETE_FAILED");
            }
        },
        getPublicForm: async (req, res) => {
            logBoundary("route", "GET /api/forms/:slug");
            try {
                const form = await cmsService.getForm(req.params.slug, { publicOnly: true });
                res.json({
                    success: true,
                    data: {
                        slug: form.slug,
                        name: form.name,
                        fields: form.fields,
                        settings: {
                            successMessage: form.settings.successMessage,
                            submitButtonLabel: form.settings.submitButtonLabel
                        }
                    }
                });
            } catch (err) {
                sendError(res, err, "CMS_PUBLIC_FORM_GET_FAILED");
            }
        },
        createFormSubmission: async (req, res) => {
            logBoundary("route", "POST /api/forms/:slug/submissions");
            try {
                const item = await cmsService.createFormSubmission(req.params.slug, req.body?.data || req.body || {});
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_FORM_SUBMISSION_CREATE_FAILED");
            }
        },
        listFormSubmissions: async (req, res) => {
            logBoundary("route", "GET /api/cms/forms/:slug/submissions");
            try {
                const items = await cmsService.listFormSubmissions(req.params.slug);
                res.json({ success: true, data: items });
            } catch (err) {
                sendError(res, err, "CMS_FORM_SUBMISSIONS_LIST_FAILED");
            }
        },
        updateFormSubmission: async (req, res) => {
            logBoundary("route", "PUT /api/cms/forms/:slug/submissions/:id");
            try {
                const item = await cmsService.updateFormSubmissionStatus(req.params.slug, req.params.id, req.body?.status);
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_FORM_SUBMISSION_UPDATE_FAILED");
            }
        },
        listPublicCollections: async (req, res) => {
            logBoundary("route", "GET /api/content/collections");
            try {
                const items = await cmsService.listPublicCollections();
                res.json({
                    success: true,
                    data: {
                        collections: items
                    }
                });
            } catch (err) {
                sendError(res, err, "CMS_PUBLIC_COLLECTIONS_FAILED");
            }
        },
        listPublicContent: async (req, res) => {
            logBoundary("route", "GET /api/content/:collection");
            try {
                const item = await cmsService.listPublicContent(req.params.collection, {
                    includeDrafts: req.query?.includeDrafts === "true",
                    includeArchived: req.query?.includeArchived === "true"
                });
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_PUBLIC_CONTENT_LIST_FAILED");
            }
        },
        getPublicContentEntry: async (req, res) => {
            logBoundary("route", "GET /api/content/:collection/:entryKey");
            try {
                const item = await cmsService.getPublicContentEntry(req.params.collection, req.params.entryKey, {
                    includeDrafts: req.query?.includeDrafts === "true",
                    includeArchived: req.query?.includeArchived === "true"
                });
                res.json({ success: true, data: item });
            } catch (err) {
                sendError(res, err, "CMS_PUBLIC_CONTENT_GET_FAILED");
            }
        }
    };
}

module.exports = {
    createCmsController
};
