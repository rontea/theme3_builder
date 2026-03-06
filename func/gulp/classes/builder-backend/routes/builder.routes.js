"use strict";

function registerBuilderRoutes(app, handlers = {}) {
    if (!app || typeof app !== "function" || typeof app.use !== "function") {
        return;
    }

    if (typeof handlers.register === "function") {
        handlers.register(app);
    }
}

module.exports = {
    registerBuilderRoutes
};
