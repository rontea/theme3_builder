"use strict";

const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs-extra");
const { createThemeCmsConfig } = require("./config");
const { createCmsRepository } = require("./repositories/cms.repository");
const { createCmsService } = require("./services/cms.service");
const { createCmsController } = require("./controllers/cms.controller");
const { registerCmsRoutes } = require("./routes/cms.routes");

async function createThemeCmsApp(options = {}) {
    const config = createThemeCmsConfig(options);
    const app = express();
    const repository = createCmsRepository(config);
    await repository.initSchema();
    const service = createCmsService(repository, { config });
    const controller = createCmsController({
        cmsService: service
    });

    app.use(cors());
    app.use(express.json({ limit: options.bodyLimit || "512kb" }));
    app.use("/cms", express.static(config.adminPath));
    app.get("/cms", (req, res) => {
        res.sendFile(path.resolve(config.adminPath, "index.html"));
    });
    app.get("/cms/*", (req, res, next) => {
        const requested = path.resolve(config.adminPath, `.${req.path.replace(/^\/cms/, "")}`);
        if (requested.endsWith(".html")) {
            res.sendFile(requested, (err) => {
                if (err) {
                    next();
                }
            });
            return;
        }
        next();
    });
    const siteRootPath = await fs.pathExists(config.buildPath) ? config.buildPath : config.pagesPath;
    app.use("/site", express.static(siteRootPath));
    app.get("/site", (req, res) => {
        res.redirect("/site/");
    });
    app.get("/site/", async (req, res, next) => {
        const preferredFiles = ["index.html", "project.html", "about.html"];
        for (const fileName of preferredFiles) {
            const candidate = path.join(siteRootPath, fileName);
            if (await fs.pathExists(candidate)) {
                res.sendFile(candidate);
                return;
            }
        }
        next();
    });
    registerCmsRoutes(app, controller);

    return {
        app,
        config,
        repository,
        service,
        controller
    };
}

async function startThemeCmsServer(options = {}) {
    const runtime = await createThemeCmsApp(options);
    const port = options.port ?? 3100;

    return new Promise((resolve, reject) => {
        const server = runtime.app.listen(port, () => {
            resolve({
                ...runtime,
                server
            });
        });

        server.on("error", reject);
    });
}

module.exports = {
    createThemeCmsApp,
    startThemeCmsServer
};
