"use strict";

function registerLayoutsRoutes(app, layoutsController) {
    app.post("/api/save-layout", layoutsController.saveLayout);
    app.get("/api/saved-layouts", layoutsController.listSavedLayouts);
    app.get("/api/saved-layout", layoutsController.getSavedLayout);
    app.delete("/api/saved-layout", layoutsController.deleteSavedLayout);
}

module.exports = {
    registerLayoutsRoutes
};
