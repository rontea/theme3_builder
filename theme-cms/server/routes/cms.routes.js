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
}

module.exports = {
    registerCmsRoutes
};
