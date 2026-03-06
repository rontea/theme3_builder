"use strict";

function registerPartialsRoutes(app, partialsController) {
    app.get("/api/partials", partialsController.listPartials);
    app.get("/api/partial", partialsController.getPartialContent);
}

module.exports = {
    registerPartialsRoutes
};
