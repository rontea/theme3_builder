"use strict";

const path = require("path");

function createThemeCmsConfig(options = {}) {
    const cmsRoot = path.resolve(options.projectRoot || process.cwd(), options.cmsRoot || "./theme-cms");
    const dataRoot = path.resolve(cmsRoot, options.dataDir || "./data");
    const projectRoot = path.resolve(options.projectRoot || process.cwd());

    return {
        projectRoot,
        cmsRoot,
        dataRoot,
        adminPath: path.resolve(cmsRoot, options.adminDir || "./admin"),
        databasePath: path.resolve(dataRoot, options.databaseFile || "./cms.sqlite"),
        uploadsPath: path.resolve(dataRoot, options.uploadsDir || "./uploads"),
        exportPath: path.resolve(projectRoot, options.exportDir || "./html/data/cms"),
        previewPath: path.resolve(cmsRoot, options.previewDir || "./preview"),
        buildPath: path.resolve(projectRoot, options.buildDir || "./build"),
        pagesPath: path.resolve(projectRoot, options.pagesDir || "./html/pages")
    };
}

module.exports = {
    createThemeCmsConfig
};
