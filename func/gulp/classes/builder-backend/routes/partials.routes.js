"use strict";

function registerPartialsRoutes(app, partialsController) {
    app.get("/api/partials", partialsController.listPartials);
    app.get("/api/micro", partialsController.listMicroComponents);
    app.get("/api/partial", partialsController.getPartialContent);
    app.post("/api/partial", partialsController.savePartialContent);
    app.get("/api/preview-styles", partialsController.getPreviewStyles);
}

module.exports = {
    registerPartialsRoutes
};
