"use strict";

const path = require("path");

function createThemeCmsConfig(options = {}) {
    const cmsRoot = path.resolve(options.projectRoot || process.cwd(), options.cmsRoot || "./theme-cms");
    const dataRoot = path.resolve(cmsRoot, options.dataDir || "./data");
    const projectRoot = path.resolve(options.projectRoot || process.cwd());
    const activeTheme = String(options.activeTheme || process.env.TH3_ACTIVE_THEME || "theme-3").trim() || "theme-3";
    const themeExportPath = path.resolve(projectRoot, options.themeExportDir || "./themes");
    const activeThemePath = path.resolve(projectRoot, options.activeThemePath || process.env.TH3_ACTIVE_THEME_PATH || path.join(themeExportPath, activeTheme));

    return {
        projectRoot,
        cmsRoot,
        dataRoot,
        adminPath: path.resolve(cmsRoot, options.adminDir || "./admin"),
        databasePath: path.resolve(dataRoot, options.databaseFile || "./cms.sqlite"),
        settingsPath: path.resolve(dataRoot, options.settingsFile || "./settings.json"),
        uploadsPath: path.resolve(dataRoot, options.uploadsDir || "./uploads"),
        exportPath: path.resolve(projectRoot, options.exportDir || "./html/data/cms"),
        themeExportPath,
        activeTheme,
        activeThemePath,
        builderDatabasePath: path.resolve(projectRoot, options.builderDatabaseFile || "./_builder/layouts/builder.sqlite"),
        cmsBaseUrl: options.cmsBaseUrl || "",
        cmsAdminUrl: options.cmsAdminUrl || "",
        builderPreviewUrl: options.builderPreviewUrl || "",
        previewPath: path.resolve(cmsRoot, options.previewDir || "./preview"),
        buildPath: path.resolve(projectRoot, options.buildDir || "./build"),
        pagesPath: path.resolve(projectRoot, options.pagesDir || "./html/pages"),
        layoutsPath: path.resolve(projectRoot, options.layoutsDir || "./html/layouts"),
        partialsPath: path.resolve(projectRoot, options.partialsDir || "./html/partials"),
        sourcePath: path.resolve(projectRoot, options.sourceDir || "./src")
    };
}

module.exports = {
    createThemeCmsConfig
};
