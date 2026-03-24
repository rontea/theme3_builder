"use strict";

function registerPagesRoutes(app, pagesController) {
    app.post("/api/pages", pagesController.createPage);
    app.post("/api/pages/clone", pagesController.clonePage);
    app.get("/api/pages", pagesController.listPages);
    app.get("/api/pages/partials", pagesController.getPagePartials);
    app.post("/api/pages/partials/sync-state", pagesController.setPagePartialsSyncState);
    app.post("/api/pages/sync", pagesController.syncPages);
    app.delete("/api/pages", pagesController.deletePage);
}

module.exports = {
    registerPagesRoutes
};
