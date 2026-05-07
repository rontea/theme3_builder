"use strict";

function registerCmsRoutes(app, cmsController) {
    app.get("/api/cms/collections", cmsController.listCollections);
    app.post("/api/cms/collections", cmsController.createCollection);
    app.put("/api/cms/collections/:slug", cmsController.updateCollection);
    app.delete("/api/cms/collections/:slug", cmsController.deleteCollection);

    app.get("/api/cms/entries", cmsController.listEntries);
    app.post("/api/cms/entries", cmsController.createEntry);
    app.put("/api/cms/entries/:id", cmsController.updateEntry);
    app.delete("/api/cms/entries/:id", cmsController.deleteEntry);
    app.post("/api/cms/export", cmsController.exportContent);

    app.get("/api/cms/settings", cmsController.getSettings);
    app.put("/api/cms/settings", cmsController.updateSettings);
    app.post("/api/cms/settings/export-data", cmsController.exportSettingsData);
    app.post("/api/cms/settings/validate-import", cmsController.validateImportData);
    app.post("/api/cms/settings/import-data", cmsController.importSettingsData);

    app.get("/api/cms/themes", cmsController.listThemes);
    app.post("/api/cms/themes/export", cmsController.exportTheme);

    app.get("/api/cms/templates", cmsController.listTemplates);
    app.get("/api/cms/templates/:templateId", cmsController.getTemplate);
    app.post("/api/cms/templates", cmsController.saveTemplate);
    app.delete("/api/cms/templates/:templateId", cmsController.deleteTemplate);

    app.get("/api/cms/views", cmsController.listViews);
    app.post("/api/cms/views", cmsController.createView);
    app.post("/api/cms/views/:viewId/preview", cmsController.previewView);
    app.get("/api/cms/views/:viewId", cmsController.getView);
    app.put("/api/cms/views/:viewId", cmsController.updateView);
    app.delete("/api/cms/views/:viewId", cmsController.deleteView);

    app.get("/api/cms/publish/status", cmsController.getPublishStatus);
    app.post("/api/cms/publish/run", cmsController.runPublish);
    app.post("/api/cms/publish/open-build", cmsController.openBuildFolder);

    app.get("/api/cms/media", cmsController.listMedia);
    app.post("/api/cms/media", cmsController.createMedia);
    app.put("/api/cms/media/:id", cmsController.updateMedia);
    app.delete("/api/cms/media/:id", cmsController.deleteMedia);

    app.get("/api/cms/forms", cmsController.listForms);
    app.post("/api/cms/forms", cmsController.createForm);
    app.get("/api/cms/forms/:slug", cmsController.getForm);
    app.put("/api/cms/forms/:slug", cmsController.updateForm);
    app.delete("/api/cms/forms/:slug", cmsController.deleteForm);
    app.get("/api/cms/forms/:slug/submissions", cmsController.listFormSubmissions);
    app.put("/api/cms/forms/:slug/submissions/:id", cmsController.updateFormSubmission);

    app.get("/api/forms/:slug", cmsController.getPublicForm);
    app.post("/api/forms/:slug/submissions", cmsController.createFormSubmission);

    app.get("/api/content/collections", cmsController.listPublicCollections);
    app.get("/api/content/:collection", cmsController.listPublicContent);
    app.get("/api/content/:collection/:entryKey", cmsController.getPublicContentEntry);
}

module.exports = {
    registerCmsRoutes
};
