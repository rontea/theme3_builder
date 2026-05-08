"use strict";

const assert = require("assert");
const path = require("path");
const fs = require("fs-extra");
const BuilderTask = require("../func/gulp/classes/BuilderTask");
const cmsBinding = require("../_builder/client/modules/cms-binding");
const { createThemeCmsConfig, createCmsRepository, createCmsService, startThemeCmsServer } = require("../theme-cms/server");

async function saveLayout(base, body) {
    const response = await fetch(`${base}/api/save-layout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });
    const result = await response.json();
    return { response, result };
}

async function requestJson(base, endpoint, options = {}) {
    const response = await fetch(`${base}${endpoint}`, options);
    const result = await response.json();
    return { response, result };
}

async function requestText(base, endpoint, options = {}) {
    const response = await fetch(`${base}${endpoint}`, options);
    const text = await response.text();
    return { response, text };
}

function createHeaderFooterLayout(pageName, pageTitle, projectName) {
    return {
        project: { name: projectName, createdAt: new Date().toISOString() },
        pageTitle,
        pageName,
        createdAt: new Date().toISOString(),
        meta: { version: 1, updatedAt: new Date().toISOString() },
        layout: [
            {
                id: `${pageName}-header`,
                order: 1,
                type: "partial",
                partial: "landmark/header.html",
                componentPath: "landmark/header.html",
                name: "header",
                props: {}
            },
            {
                id: `${pageName}-footer`,
                order: 2,
                type: "partial",
                partial: "landmark/footer.html",
                componentPath: "landmark/footer.html",
                name: "footer",
                props: {}
            }
        ]
    };
}

async function safeRemove(targetPath) {
    try {
        await fs.remove(targetPath);
    } catch (err) {
        // best-effort cleanup on Windows file locks
    }
}

async function run() {
    const sandboxRoot = path.resolve(__dirname, "..", ".tmp", "builder-fix");
    const builder = new BuilderTask({
        port: 0,
        cmsProjectRoot: sandboxRoot,
        layoutsOutputPath: path.join(sandboxRoot, "_builder", "layouts"),
        databasePath: path.join(sandboxRoot, "_builder", "layouts", "builder.sqlite"),
        pagesOutputPath: path.join(sandboxRoot, "html", "pages")
    });
    const createdLayoutFiles = new Set();
    const createdPageFiles = new Set();
    let cmsRepository = null;
    let cmsService = null;
    let cmsRuntime = null;

    try {
        await safeRemove(sandboxRoot);
        await fs.ensureDir(path.join(sandboxRoot, "_builder", "layouts"));
        await fs.ensureDir(path.join(sandboxRoot, "html", "pages"));
        await fs.ensureDir(path.join(sandboxRoot, "html", "partials", "shared"));
        await fs.ensureDir(path.join(sandboxRoot, "themes", "theme-3", "partials", "shared"));
        await fs.ensureDir(path.join(sandboxRoot, "themes", "theme-3", "partials", "home"));
        await fs.ensureDir(path.join(sandboxRoot, "themes", "theme-3", "partials", "landmark"));
        await fs.ensureDir(path.join(sandboxRoot, "themes", "theme-3", "components"));
        await fs.ensureDir(path.join(sandboxRoot, "themes", "theme-3", "templates", "regions"));
        await fs.ensureDir(path.join(sandboxRoot, "src", "css"));
        await fs.ensureDir(path.join(sandboxRoot, "src", "js"));
        await fs.ensureDir(path.join(sandboxRoot, "src", "images"));
        await Promise.all([
            fs.writeFile(path.join(sandboxRoot, "src", "css", "styles.css"), "html.dark body { color: white; }", "utf8"),
            fs.writeFile(path.join(sandboxRoot, "src", "js", "main.js"), "document.documentElement.dataset.themeRuntime = 'loaded';", "utf8"),
            fs.writeFile(path.join(sandboxRoot, "src", "images", "theme-icon.svg"), "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 10 10\"><circle cx=\"5\" cy=\"5\" r=\"5\"/></svg>", "utf8"),
            fs.writeFile(path.join(sandboxRoot, "html", "partials", "shared", "card.html"), "<article>Legacy card</article>", "utf8"),
            fs.writeFile(path.join(sandboxRoot, "themes", "theme-3", "partials", "shared", "card.html"), "<article>Active theme card</article>", "utf8"),
            fs.writeFile(path.join(sandboxRoot, "themes", "theme-3", "partials", "home", "hero.html"), "<figure><img src=\"img/theme-icon.svg\" srcset=\"img/theme-icon.svg 1x, ./img/theme-icon.svg 2x\" alt=\"Theme Icon\"></figure>", "utf8"),
            fs.writeFile(path.join(sandboxRoot, "themes", "theme-3", "partials", "landmark", "header.html"), "<header>Theme Header</header>", "utf8"),
            fs.writeFile(path.join(sandboxRoot, "themes", "theme-3", "partials", "landmark", "footer.html"), "<footer>Theme Footer</footer>", "utf8"),
            fs.writeFile(path.join(sandboxRoot, "themes", "theme-3", "components", "badge.html"), "<span>Badge</span>", "utf8"),
            fs.writeFile(path.join(sandboxRoot, "themes", "theme-3", "templates", "page.html"), "<!doctype html><head><title>{{ page.title }}</title>{{{ assets.styles }}}</head><body>{{> regions/header }}<main>{{> regions/main }}</main>{{> regions/footer }}{{{ assets.scripts }}}</body>", "utf8"),
            fs.writeFile(path.join(sandboxRoot, "themes", "theme-3", "templates", "regions", "header.html"), "<section data-theme-region=\"header\">{{{ region \"header\" }}}{{> landmark/header }}</section>", "utf8"),
            fs.writeFile(path.join(sandboxRoot, "themes", "theme-3", "templates", "regions", "main.html"), "<section data-theme-region=\"main\">{{{ region \"main\" }}}</section>", "utf8"),
            fs.writeFile(path.join(sandboxRoot, "themes", "theme-3", "templates", "regions", "footer.html"), "<section data-theme-region=\"footer\">{{{ region \"footer\" }}}{{> landmark/footer }}</section>", "utf8"),
            fs.writeJson(path.join(sandboxRoot, "themes", "theme-3", "theme.json"), {
                schemaVersion: 1,
                name: "Sandbox Theme",
                slug: "theme-3",
                version: "9.9.9",
                requiredCollections: [],
                regions: ["header", "main", "footer"],
                regionDefinitions: [
                    { id: "header", label: "Header", template: "templates/regions/header.html", defaultPartial: "partials/landmark/header.html" },
                    { id: "main", label: "Main", template: "templates/regions/main.html" },
                    { id: "footer", label: "Footer", template: "templates/regions/footer.html", defaultPartial: "partials/landmark/footer.html" }
                ],
                templates: [{ id: "page", label: "Page", file: "templates/page.html", regions: ["header", "main", "footer"] }],
                views: [],
                files: ["templates", "templates/regions", "partials", "components"]
            }, { spaces: 2 })
        ]);

        const cmsConfig = createThemeCmsConfig({ projectRoot: sandboxRoot });
        cmsRepository = createCmsRepository(cmsConfig);
        await cmsRepository.initSchema();
        cmsService = createCmsService(cmsRepository, { config: cmsConfig });

        const activeThemes = await cmsService.listThemes();
        assert.equal(activeThemes[0].name, "Sandbox Theme", "Expected CMS to read active theme metadata from theme.json");
        assert.equal(activeThemes[0].version, "9.9.9", "Expected active theme version from theme.json");
        assert.deepEqual(activeThemes[0].regions, ["header", "main", "footer"], "Expected active theme regions from theme.json");

        const themeBuilder = new BuilderTask({ projectRoot: sandboxRoot });
        const themePartials = await themeBuilder.scanPartials();
        const sharedCard = themePartials.find((item) => item.path.replace(/\\/g, "/") === "shared/card.html");
        assert.ok(sharedCard, "Expected builder to scan active theme partials");
        assert.equal(sharedCard.source, "active-theme", "Expected active theme partial to win over legacy html partial");
        const themeComponents = await themeBuilder.scanMicroComponents();
        assert.ok(themeComponents.some((item) => item.path === "micro/badge.html" && item.source === "active-theme"), "Expected builder to scan active theme components before legacy micro components");
        const phase8PagePath = await themeBuilder.createPageFromLayout({
            pageTitle: "Phase 8 Runtime",
            regions: {
                main: [{
                    id: "phase8-card",
                    type: "partial",
                    componentPath: "shared/card.html",
                    partial: "shared/card.html",
                    region: "main",
                    order: 1,
                    renderedContent: "<article>Runtime block</article>"
                }]
            }
        }, "phase8-runtime");
        const phase8Html = await fs.readFile(phase8PagePath, "utf8");
        assert.ok(phase8Html.includes("<title>Phase 8 Runtime</title>"), "Expected active theme page template variables to render");
        assert.ok(phase8Html.includes("data-theme-region=\"header\""), "Expected header region template to render");
        assert.ok(phase8Html.includes("<header>Theme Header</header>"), "Expected empty header region to render theme fallback partial");
        assert.ok(phase8Html.includes("data-theme-region=\"main\""), "Expected main region template to render");
        assert.ok(phase8Html.includes("<article>Runtime block</article>"), "Expected layout block to be injected into main region");
        assert.ok(phase8Html.includes("<footer>Theme Footer</footer>"), "Expected empty footer region to render theme fallback partial");

        await builder.startServer();
        const { port } = builder.server.address();
        const base = `http://localhost:${port}`;

        // Base APIs
        const partialsRes = await fetch(`${base}/api/partials`);
        assert.equal(partialsRes.status, 200, "Expected /api/partials to return 200");
        const partialsBody = await partialsRes.json();
        assert.equal(partialsBody.success, true, "Expected /api/partials success=true");
        assert.ok(Array.isArray(partialsBody.data), "Expected /api/partials data array");

        const layoutsRes = await fetch(`${base}/api/layouts`);
        assert.equal(layoutsRes.status, 200, "Expected /api/layouts to return 200");
        const layoutsBody = await layoutsRes.json();
        assert.equal(layoutsBody.success, true, "Expected /api/layouts success=true");
        assert.ok(Array.isArray(layoutsBody.data), "Expected /api/layouts data array");

        const builderConfig = await requestJson(base, "/api/builder/config");
        assert.equal(builderConfig.response.status, 200, "Expected /api/builder/config to return 200");
        assert.equal(builderConfig.result.success, true, "Expected /api/builder/config success=true");
        assert.equal(builderConfig.result.data.cms.readMode, "export", "Expected default CMS read mode to be export");
        assert.equal(builderConfig.result.data.cms.adminUrl, "http://localhost:3100/cms", "Expected default CMS admin URL");

        const cmsAdminRes = await fetch(`${base}/cms/`);
        assert.equal(cmsAdminRes.status, 404, "Expected builder not to serve /cms/ admin shell");

        const builderCmsApiRes = await fetch(`${base}/api/cms/collections`);
        assert.equal(builderCmsApiRes.status, 404, "Expected builder not to serve /api/cms/* routes");

        // Watch endpoint regression (preview dependency)
        const watchStart = await requestJson(base, "/api/watch/start", { method: "POST" });
        assert.equal(watchStart.response.status, 200, "Expected /api/watch/start to return 200");
        assert.equal(watchStart.result.success, true, "Expected /api/watch/start success=true");
        assert.ok(watchStart.result.data && typeof watchStart.result.data.pid === "number", "Expected watch PID in response");

        // Traversal regression
        const traversalRes = await fetch(`${base}/api/partial?path=..%2Fpackage.json`);
        assert.equal(traversalRes.status, 400, "Expected traversal request to be blocked with 400");
        const traversalBody = await traversalRes.json();
        assert.equal(traversalBody.success, false, "Expected traversal request success=false");

        // Invalid payload regression
        const invalidSave = await saveLayout(base, {
            layoutData: { pageTitle: "x", layout: [{ bad: true }] }
        });
        assert.equal(invalidSave.response.status, 400, "Expected invalid layout payload to return 400");
        assert.equal(invalidSave.result.success, false, "Expected invalid save success=false");

        // Malicious component path regression
        const maliciousSave = await saveLayout(base, {
            pageName: "builder-malicious-test",
            layoutData: {
                pageTitle: "Malicious",
                layout: [
                    {
                        id: "item-1",
                        order: 1,
                        type: "partial",
                        partial: "../package.json",
                        componentPath: "../package.json",
                        name: "bad",
                        props: {}
                    }
                ]
            }
        });
        assert.equal(maliciousSave.response.status, 400, "Expected malicious component path to return 400");
        assert.equal(maliciousSave.result.success, false, "Expected malicious save success=false");

        // Initial save
        const validPayload = createHeaderFooterLayout(
            "builder-fix-test",
            "Builder Fix Test",
            "Builder Fix Test"
        );

        const saveInitial = await saveLayout(base, {
            layoutData: validPayload,
            pageName: "builder-fix-test",
            overwrite: true
        });
        assert.equal(saveInitial.response.status, 200, "Expected initial save to return 200");
        assert.equal(saveInitial.result.success, true, "Expected initial save success=true");

        const layoutPath = saveInitial.result.data.layoutPath || saveInitial.result.data.path;
        const pagePath = saveInitial.result.data.pagePath;
        const layoutFileName = saveInitial.result.data.layoutFileName;
        const isDbLayoutRef = typeof layoutPath === "string" && layoutPath.startsWith("db://");
        if (!isDbLayoutRef) {
            createdLayoutFiles.add(layoutPath);
        }
        createdPageFiles.add(pagePath);

        assert.ok(layoutPath, "Expected layoutPath/path in save response");
        assert.ok(pagePath, "Expected pagePath in save response");
        assert.ok(layoutFileName, "Expected layoutFileName in save response");
        if (!isDbLayoutRef) {
            assert.ok(await fs.pathExists(layoutPath), "Expected saved layout JSON file to exist");
        }
        assert.ok(await fs.pathExists(pagePath), "Expected generated HTML page to exist");

        // Saved-layout listing/read
        const listRes = await fetch(`${base}/api/saved-layouts`);
        assert.equal(listRes.status, 200, "Expected /api/saved-layouts to return 200");
        const listBody = await listRes.json();
        assert.equal(listBody.success, true, "Expected /api/saved-layouts success=true");
        assert.ok(
            listBody.data.some((item) => item.fileName === layoutFileName),
            "Expected saved layout file to appear in /api/saved-layouts"
        );

        const readRes = await fetch(`${base}/api/saved-layout?fileName=${encodeURIComponent(layoutFileName)}`);
        assert.equal(readRes.status, 200, "Expected /api/saved-layout to return 200");
        const readBody = await readRes.json();
        assert.equal(readBody.success, true, "Expected /api/saved-layout success=true");
        assert.equal(readBody.data.pageTitle, validPayload.pageTitle, "Saved layout pageTitle mismatch");
        assert.equal(readBody.data.meta.version, 1, "Expected saved layout meta.version=1");

        // Update existing layout (same layout file)
        const updatedPayload = {
            ...readBody.data,
            pageTitle: "Builder Fix Test Updated",
            layout: [
                {
                    ...readBody.data.layout[1],
                    id: "item-2",
                    order: 1
                },
                {
                    ...readBody.data.layout[0],
                    id: "item-1",
                    order: 2
                }
            ]
        };

        const saveUpdate = await saveLayout(base, {
            layoutData: updatedPayload,
            pageName: "builder-fix-test",
            layoutFileName,
            overwrite: true
        });
        assert.equal(saveUpdate.response.status, 200, "Expected update save to return 200");
        assert.equal(saveUpdate.result.success, true, "Expected update save success=true");
        assert.equal(
            saveUpdate.result.data.layoutFileName,
            layoutFileName,
            "Expected update to keep same layoutFileName"
        );

        const readUpdated = await fetch(`${base}/api/saved-layout?fileName=${encodeURIComponent(layoutFileName)}`);
        const readUpdatedBody = await readUpdated.json();
        assert.equal(readUpdatedBody.data.pageTitle, "Builder Fix Test Updated", "Expected updated pageTitle");
        assert.equal(readUpdatedBody.data.layout[0].id, "item-2", "Expected reordered first component");

        // Conflict then Save As
        const conflictSave = await saveLayout(base, {
            layoutData: updatedPayload,
            pageName: "builder-fix-test",
            overwrite: false,
            saveAs: false
        });
        assert.equal(conflictSave.response.status, 409, "Expected conflict save to return 409");
        assert.equal(conflictSave.result.success, false, "Expected conflict save success=false");
        assert.equal(conflictSave.result.code, "PAGE_ALREADY_EXISTS", "Expected PAGE_ALREADY_EXISTS code");

        const saveAs = await saveLayout(base, {
            layoutData: updatedPayload,
            pageName: "builder-fix-test-copy",
            overwrite: false,
            saveAs: true
        });
        assert.equal(saveAs.response.status, 200, "Expected save-as to return 200");
        assert.equal(saveAs.result.success, true, "Expected save-as success=true");
        const saveAsLayoutPath = saveAs.result.data.layoutPath || saveAs.result.data.path;
        const saveAsPagePath = saveAs.result.data.pagePath;
        const isDbSaveAsRef = typeof saveAsLayoutPath === "string" && saveAsLayoutPath.startsWith("db://");
        if (!isDbSaveAsRef) {
            createdLayoutFiles.add(saveAsLayoutPath);
        }
        createdPageFiles.add(saveAsPagePath);
        if (!isDbSaveAsRef) {
            assert.ok(await fs.pathExists(saveAsLayoutPath), "Expected save-as layout JSON file to exist");
        }
        assert.ok(await fs.pathExists(saveAsPagePath), "Expected save-as HTML page to exist");

        const regionPageName = "phase7-region-model-test";
        const regionLayout = {
            project: { name: "Builder Fix Test", createdAt: new Date().toISOString() },
            pageTitle: "Phase 7 Region Model Test",
            pageName: regionPageName,
            createdAt: new Date().toISOString(),
            meta: { version: 2, layoutModel: "regions", updatedAt: new Date().toISOString() },
            regions: {
                header: [
                    {
                        id: "region-header",
                        instanceId: "region-header",
                        order: 1,
                        type: "partial",
                        partial: "landmark/header.html",
                        componentPath: "landmark/header.html",
                        name: "header",
                        region: "header",
                        blockConfig: {},
                        cmsBinding: null,
                        visible: true,
                        props: {}
                    }
                ],
                main: [
                    {
                        id: "region-main-hidden",
                        instanceId: "region-main-hidden",
                        order: 1,
                        type: "partial",
                        partial: "about/about_cta.html",
                        componentPath: "about/about_cta.html",
                        name: "hidden cta",
                        region: "main",
                        blockConfig: {},
                        cmsBinding: null,
                        visible: false,
                        props: {},
                        renderedContent: "<section>HIDDEN REGION BLOCK</section>"
                    },
                    {
                        id: "region-main",
                        instanceId: "region-main",
                        order: 2,
                        type: "partial",
                        partial: "home/hero.html",
                        componentPath: "home/hero.html",
                        name: "hero in main",
                        region: "main",
                        blockConfig: { variant: "default" },
                        cmsBinding: null,
                        visible: true,
                        props: {}
                    }
                ],
                footer: [
                    {
                        id: "region-footer",
                        instanceId: "region-footer",
                        order: 1,
                        type: "partial",
                        partial: "landmark/footer.html",
                        componentPath: "landmark/footer.html",
                        name: "footer",
                        region: "footer",
                        blockConfig: {},
                        cmsBinding: null,
                        visible: true,
                        props: {}
                    }
                ]
            }
        };
        const regionSave = await saveLayout(base, {
            layoutData: regionLayout,
            pageName: regionPageName,
            overwrite: true
        });
        assert.equal(regionSave.response.status, 200, "Expected region model save to return 200");
        assert.equal(regionSave.result.success, true, "Expected region model save success=true");
        createdPageFiles.add(regionSave.result.data.pagePath);
        const regionHtml = await fs.readFile(regionSave.result.data.pagePath, "utf8");
        assert.ok(
            regionHtml.includes('data-theme-region="header"') || regionHtml.includes("{{> header}}"),
            "Expected region output to include header region block"
        );
        assert.ok(
            regionHtml.includes('data-theme-region="footer"') || regionHtml.includes("{{> footer}}"),
            "Expected region output to include footer region block"
        );
        assert.ok(!regionHtml.includes("HIDDEN REGION BLOCK"), "Expected hidden region block to be omitted from output");

        const regionAliasPageName = "phase1-region-alias-test";
        const regionAliasSave = await saveLayout(base, {
            pageName: regionAliasPageName,
            overwrite: true,
            layoutData: {
                project: { name: "Builder Fix Test", createdAt: new Date().toISOString() },
                pageTitle: "Phase 1 Region Alias Test",
                pageName: regionAliasPageName,
                createdAt: new Date().toISOString(),
                meta: { version: 2, layoutModel: "regions", updatedAt: new Date().toISOString() },
                regions: {
                    side_nav: [
                        {
                            id: "alias-side-nav",
                            instanceId: "alias-side-nav",
                            order: 1,
                            type: "partial",
                            partial: "project/project_listing.html",
                            componentPath: "project/project_listing.html",
                            name: "side nav alias",
                            region: "Side Navigation",
                            props: {}
                        }
                    ],
                    content_above: [
                        {
                            id: "alias-content-above",
                            instanceId: "alias-content-above",
                            order: 1,
                            type: "partial",
                            partial: "home/hero.html",
                            componentPath: "home/hero.html",
                            name: "content above alias",
                            region: "content_above",
                            props: {}
                        }
                    ],
                    content_below: [
                        {
                            id: "alias-content-below",
                            instanceId: "alias-content-below",
                            order: 1,
                            type: "partial",
                            partial: "about/about_cta.html",
                            componentPath: "about/about_cta.html",
                            name: "content below alias",
                            region: "content_below",
                            props: {}
                        }
                    ]
                }
            }
        });
        assert.equal(regionAliasSave.response.status, 200, "Expected region alias save to return 200");
        createdPageFiles.add(regionAliasSave.result.data.pagePath);
        const regionAliasRead = await requestJson(base, `/api/saved-layout?fileName=${encodeURIComponent(regionAliasSave.result.data.layoutFileName)}`);
        assert.equal(regionAliasRead.response.status, 200, "Expected alias layout read to return 200");
        assert.ok(regionAliasRead.result.data.regions["side-navigation"], "Expected side_nav alias to save as side-navigation");
        assert.ok(regionAliasRead.result.data.regions["content-above"], "Expected content_above alias to save as content-above");
        assert.ok(regionAliasRead.result.data.regions["content-below"], "Expected content_below alias to save as content-below");
        assert.equal(regionAliasRead.result.data.regions["side-navigation"][0].region, "side-navigation", "Expected alias block region to be canonical");

        // Pages regression: create/list/sync/load/edit flows
        const projectName = "phase0-regression-project";
        const pageName = "phase0-regression-page";

        const createProject = await requestJson(base, "/api/projects", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectName })
        });
        assert.equal(createProject.response.status, 200, "Expected project create to return 200");
        assert.equal(createProject.result.success, true, "Expected project create success=true");
        assert.equal(createProject.result.data.projectName, projectName, "Expected created project name");

        const createPage = await requestJson(base, "/api/pages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                projectName,
                pageName,
                pageTitle: "Phase 0 Baseline Page"
            })
        });
        assert.equal(createPage.response.status, 200, "Expected page create to return 200");
        assert.equal(createPage.result.success, true, "Expected page create success=true");
        assert.equal(createPage.result.data.projectName, projectName, "Expected created page project");
        assert.equal(createPage.result.data.pageName, pageName, "Expected created page name");

        const pagesBeforeSave = await requestJson(
            base,
            `/api/pages?projectName=${encodeURIComponent(projectName)}`
        );
        assert.equal(pagesBeforeSave.response.status, 200, "Expected list pages to return 200");
        assert.equal(pagesBeforeSave.result.success, true, "Expected list pages success=true");
        assert.ok(
            pagesBeforeSave.result.data.some((item) => item.pageName === pageName),
            "Expected created page to be listed"
        );

        const pageFlowPayload = createHeaderFooterLayout(
            pageName,
            "Phase 0 Baseline Page",
            projectName
        );

        const pageSave = await saveLayout(base, {
            layoutData: pageFlowPayload,
            pageName,
            overwrite: true
        });
        assert.equal(pageSave.response.status, 200, "Expected page save to return 200");
        assert.equal(pageSave.result.success, true, "Expected page save success=true");
        const pageFlowLayoutFileName = pageSave.result.data.layoutFileName;
        const pageFlowPagePath = pageSave.result.data.pagePath;
        createdPageFiles.add(pageFlowPagePath);
        assert.ok(pageFlowLayoutFileName, "Expected page flow layout file");
        assert.ok(await fs.pathExists(pageFlowPagePath), "Expected page flow HTML output");

        const savedLayout = await requestJson(
            base,
            `/api/saved-layout?fileName=${encodeURIComponent(pageFlowLayoutFileName)}`
        );
        assert.equal(savedLayout.response.status, 200, "Expected /api/saved-layout to return 200 in page flow");
        assert.equal(savedLayout.result.success, true, "Expected /api/saved-layout success=true in page flow");

        const editedLayout = {
            ...savedLayout.result.data,
            pageTitle: "Phase 0 Baseline Page Edited"
        };
        const pageEdit = await saveLayout(base, {
            layoutData: editedLayout,
            pageName,
            layoutFileName: pageFlowLayoutFileName,
            overwrite: true
        });
        assert.equal(pageEdit.response.status, 200, "Expected page edit save to return 200");
        assert.equal(pageEdit.result.success, true, "Expected page edit save success=true");
        assert.equal(
            pageEdit.result.data.layoutFileName,
            pageFlowLayoutFileName,
            "Expected edit flow to keep same layout file"
        );

        const pagePartials = await requestJson(
            base,
            `/api/pages/partials?projectName=${encodeURIComponent(projectName)}&pageName=${encodeURIComponent(pageName)}`
        );
        assert.equal(pagePartials.response.status, 200, "Expected page partials read to return 200");
        assert.equal(pagePartials.result.success, true, "Expected page partials read success=true");
        assert.ok(Array.isArray(pagePartials.result.data.partials), "Expected partials list array");
        assert.ok(pagePartials.result.data.partials.length >= 1, "Expected at least one detected partial");

        const projectsAfterPartialsRead = await requestJson(base, "/api/projects");
        assert.equal(projectsAfterPartialsRead.response.status, 200, "Expected project list after partials read to return 200");
        assert.equal(projectsAfterPartialsRead.result.success, true, "Expected project list after partials read success=true");
        assert.equal(
            projectsAfterPartialsRead.result.data.filter((item) => item.projectName === projectName).length,
            1,
            "Expected partials read to avoid creating duplicate project records"
        );

        const setSyncState = await requestJson(base, "/api/pages/partials/sync-state", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectName, pageName, partialsSynced: true })
        });
        assert.equal(setSyncState.response.status, 200, "Expected sync-state update to return 200");
        assert.equal(setSyncState.result.success, true, "Expected sync-state update success=true");
        assert.equal(setSyncState.result.data.partialsSynced, true, "Expected partialsSynced=true");

        const syncPages = await requestJson(base, "/api/pages/sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectName })
        });
        assert.equal(syncPages.response.status, 200, "Expected /api/pages/sync to return 200");
        assert.equal(syncPages.result.success, true, "Expected /api/pages/sync success=true");
        assert.equal(syncPages.result.data.projectName, projectName, "Expected synced projectName");
        assert.ok(syncPages.result.data.syncedCount >= 1, "Expected at least one synced page");
        assert.ok(
            syncPages.result.data.pages.some((item) => item.pageName === pageName),
            "Expected synced pages to include regression page"
        );

        const pagesAfterSync = await requestJson(
            base,
            `/api/pages?projectName=${encodeURIComponent(projectName)}`
        );
        assert.equal(pagesAfterSync.response.status, 200, "Expected pages list after sync to return 200");
        assert.equal(pagesAfterSync.result.success, true, "Expected pages list after sync success=true");
        const syncedPage = pagesAfterSync.result.data.find((item) => item.pageName === pageName);
        assert.ok(syncedPage, "Expected regression page to exist after sync");
        assert.ok(Array.isArray(syncedPage.partials), "Expected synced page to include partials array");

        // CMS fixture setup belongs to the standalone CMS service, not builder /api/cms routes.
        const createCmsCollection = await cmsService.createCollection({
            slug: "supporters",
            name: "Supporters",
            schema: {
                fields: [
                    { name: "name", label: "Name", type: "text" },
                    { name: "tier", label: "Tier", type: "text" },
                    { name: "url", label: "URL", type: "text" }
                ]
            }
        });
        assert.equal(createCmsCollection.slug, "supporters", "Expected CMS collection slug");

        const listCmsCollections = await cmsService.listCollections();
        assert.ok(
            listCmsCollections.some((item) => item.slug === "supporters"),
            "Expected supporters collection in CMS list"
        );

        const createCmsEntry = await cmsService.createEntry({
            collection: "supporters",
            entryKey: "openai",
            status: "published",
            sortOrder: 1,
            data: {
                name: "OpenAI",
                tier: "founding",
                url: "https://openai.com",
                active: true
            }
        });
        assert.equal(createCmsEntry.entryKey, "openai", "Expected CMS entry key");

        await cmsService.createEntry({
            collection: "supporters",
            entryKey: "anthropic",
            status: "published",
            sortOrder: 2,
            data: {
                name: "Anthropic",
                tier: "visionary",
                url: "https://anthropic.com",
                active: true
            }
        });

        await cmsService.createEntry({
            collection: "supporters",
            entryKey: "community-friends",
            status: "published",
            sortOrder: 3,
            data: {
                name: "Community Friends",
                tier: "community",
                url: "https://example.com/community",
                active: true
            }
        });

        const listCmsEntries = await cmsService.listEntries("supporters");
        assert.ok(
            listCmsEntries.some((item) => item.entryKey === "openai"),
            "Expected openai entry in CMS list"
        );

        const cmsExport = await cmsService.exportContent({});
        assert.equal(cmsExport.totals.collections >= 1, true, "Expected at least one exported collection");
        assert.equal(cmsExport.totals.entries >= 1, true, "Expected at least one exported entry");

        const cmsManifestPath = path.join(sandboxRoot, "html", "data", "cms", "manifest.json");
        const cmsCollectionsIndexPath = path.join(sandboxRoot, "html", "data", "cms", "collections", "index.json");
        const cmsSupportersEntriesPath = path.join(sandboxRoot, "html", "data", "cms", "entries", "supporters.json");
        const cmsManifest = await fs.readJson(cmsManifestPath);
        const cmsCollectionsIndex = await fs.readJson(cmsCollectionsIndexPath);
        const cmsSupportersEntries = await fs.readJson(cmsSupportersEntriesPath);
        assert.equal(cmsManifest.version, 1, "Expected CMS manifest version 1");
        assert.ok(
            Array.isArray(cmsManifest.collections) && cmsManifest.collections.some((item) => item.slug === "supporters"),
            "Expected supporters collection in CMS manifest"
        );
        assert.ok(
            Array.isArray(cmsCollectionsIndex.collections) && cmsCollectionsIndex.collections.some((item) => item.slug === "supporters"),
            "Expected supporters collection in exported collections index"
        );
        assert.ok(
            Array.isArray(cmsSupportersEntries.entries) && cmsSupportersEntries.entries.some((item) => item.entryKey === "openai"),
            "Expected openai entry in exported supporters entries"
        );

        const cmsForm = await cmsService.createForm({
            slug: "contact",
            name: "Contact Form",
            status: "active",
            definition: {
                fields: [
                    { name: "name", label: "Name", type: "text", required: true },
                    { name: "email", label: "Email", type: "email", required: true },
                    { name: "message", label: "Message", type: "textarea", required: true }
                ],
                settings: {
                    successMessage: "Thanks for reaching out.",
                    storeSubmissions: true,
                    notificationEmail: "admin@example.com",
                    submitButtonLabel: "Send"
                }
            }
        });
        assert.equal(cmsForm.slug, "contact", "Expected CMS form slug");
        assert.equal(cmsForm.fields.length, 3, "Expected normalized CMS form fields");

        const cmsSubmission = await cmsService.createFormSubmission("contact", {
            name: "Alice Smith",
            email: "alice@example.com",
            message: "I have a question."
        });
        assert.equal(cmsSubmission.status, "new", "Expected new form submission status");
        const cmsSubmissions = await cmsService.listFormSubmissions("contact");
        assert.equal(cmsSubmissions.length, 1, "Expected stored form submission");
        const reviewedSubmission = await cmsService.updateFormSubmissionStatus("contact", cmsSubmission.id, "reviewed");
        assert.equal(reviewedSubmission.status, "reviewed", "Expected reviewed form submission status");

        await fs.ensureDir(path.join(sandboxRoot, "build"));
        await fs.writeFile(path.join(sandboxRoot, "build", "index.html"), "{{> hero}}\n{{> cta}}\n");
        await fs.writeFile(path.join(sandboxRoot, "build", "project.html"), "<!doctype html><h1>Rendered project page</h1>\n");

        cmsRuntime = await startThemeCmsServer({ projectRoot: sandboxRoot, port: 0 });
        const cmsBase = `http://localhost:${cmsRuntime.server.address().port}`;
        const cmsServeCollections = await requestJson(cmsBase, "/api/cms/collections");
        assert.equal(cmsServeCollections.response.status, 200, "Expected standalone CMS server to mount /api/cms/collections");
        assert.equal(cmsServeCollections.result.success, true, "Expected standalone CMS collections success=true");
        assert.ok(
            cmsServeCollections.result.data.some((item) => item.slug === "supporters"),
            "Expected standalone CMS server to list supporters collection"
        );

        const sitePreviewRes = await fetch(`${cmsBase}/site/`);
        const sitePreviewHtml = await sitePreviewRes.text();
        assert.equal(sitePreviewRes.status, 200, "Expected /site/ to return 200");
        assert.ok(sitePreviewHtml.includes("Rendered project page"), "Expected /site/ to use rendered fallback page");
        assert.equal(sitePreviewHtml.includes("{{>"), false, "Expected /site/ not to serve raw partial placeholders");

        const publicForm = await requestJson(cmsBase, "/api/forms/contact");
        assert.equal(publicForm.response.status, 200, "Expected public form endpoint to return 200");
        assert.equal(publicForm.result.success, true, "Expected public form endpoint success=true");
        assert.equal(publicForm.result.data.slug, "contact", "Expected public form payload slug");

        const publicSubmission = await requestJson(cmsBase, "/api/forms/contact/submissions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                data: {
                    name: "Bob Jones",
                    email: "bob@example.com",
                    message: "Demo request."
                }
            })
        });
        assert.equal(publicSubmission.response.status, 200, "Expected public submission endpoint to return 200");
        assert.equal(publicSubmission.result.success, true, "Expected public submission endpoint success=true");

        const cmsServeSubmissions = await requestJson(cmsBase, "/api/cms/forms/contact/submissions");
        assert.equal(cmsServeSubmissions.response.status, 200, "Expected CMS submissions endpoint to return 200");
        assert.equal(cmsServeSubmissions.result.success, true, "Expected CMS submissions endpoint success=true");
        assert.ok(cmsServeSubmissions.result.data.length >= 2, "Expected CMS submissions endpoint to include stored submissions");

        const builderCmsCollections = await requestJson(base, "/api/builder/cms/collections");
        assert.equal(builderCmsCollections.response.status, 200, "Expected builder CMS collections read endpoint to return 200");
        assert.equal(builderCmsCollections.result.success, true, "Expected builder CMS collections read success=true");
        assert.ok(
            builderCmsCollections.result.data.some((item) => item.slug === "supporters"),
            "Expected builder CMS read endpoint to include supporters collection"
        );
        assert.deepStrictEqual(
            builderCmsCollections.result.data,
            await builder.listCmsCollections(),
            "Expected builder CMS collections endpoint to read exported collections index"
        );

        const builderCmsEntries = await requestJson(base, "/api/builder/cms/entries?collection=supporters");
        assert.equal(builderCmsEntries.response.status, 200, "Expected builder CMS entries read endpoint to return 200");
        assert.equal(builderCmsEntries.result.success, true, "Expected builder CMS entries read success=true");
        assert.ok(
            builderCmsEntries.result.data.some((item) => item.entryKey === "openai"),
            "Expected builder CMS read endpoint to include openai entry"
        );
        assert.deepStrictEqual(
            builderCmsEntries.result.data,
            await builder.listCmsEntries("supporters"),
            "Expected builder CMS entries endpoint to read exported collection entries"
        );

        const cmsRenderBinding = {
            source: "cms",
            mode: "record",
            collection: "supporters",
            selection: { filter: { name: "OpenAI" } },
            fieldMap: { heading: "name", buttonUrl: "url", buttonLabel: "tier" },
            fallback: "static"
        };
        const sharedPreviewResolution = cmsBinding.resolveBindingEntries(cmsRenderBinding, builderCmsEntries.result.data);
        const builderFinalResolution = await builder.resolveCmsBindingData(cmsRenderBinding);
        assert.deepStrictEqual(
            builderFinalResolution,
            sharedPreviewResolution,
            "Expected preview and final rendering to use the same CMS binding contract"
        );
        assert.equal(sharedPreviewResolution.record.heading, "OpenAI", "Expected shared binding contract to map heading");
        assert.equal(sharedPreviewResolution.record.buttonUrl, "https://openai.com", "Expected shared binding contract to map URL aliases");

        const cmsRenderPageName = "phase3-cms-render-test";
        const cmsRenderPayload = {
            project: { name: projectName, createdAt: new Date().toISOString() },
            pageTitle: "Phase 3 CMS Render Test",
            pageName: cmsRenderPageName,
            createdAt: new Date().toISOString(),
            meta: { version: 1, updatedAt: new Date().toISOString() },
            layout: [
                {
                    id: "cms-render-item",
                    order: 1,
                    type: "partial",
                    partial: "about/about_cta.html",
                    componentPath: "about/about_cta.html",
                    name: "about cta",
                    props: {
                        cmsBinding: {
                            ...cmsRenderBinding
                        }
                    },
                    renderedContent: `<section class="phase3-stale"><h2>STALE CLIENT CONTENT</h2><a href="https://example.com">wrong</a></section>`
                }
            ]
        };
        const cmsRenderSave = await saveLayout(base, {
            layoutData: cmsRenderPayload,
            pageName: cmsRenderPageName,
            overwrite: true
        });
        assert.equal(cmsRenderSave.response.status, 200, "Expected CMS render layout save to return 200");
        assert.equal(cmsRenderSave.result.success, true, "Expected CMS render layout save success=true");
        const cmsRenderPagePath = cmsRenderSave.result.data.pagePath;
        const cmsRenderLayoutFileName = cmsRenderSave.result.data.layoutFileName;
        createdPageFiles.add(cmsRenderPagePath);
        const cmsRenderHtml = await fs.readFile(cmsRenderPagePath, "utf8");
        assert.ok(!cmsRenderHtml.includes("STALE CLIENT CONTENT"), "Expected backend CMS render to override stale renderedContent");
        assert.ok(cmsRenderHtml.includes("OpenAI"), "Expected generated page to contain resolved CMS content");
        assert.ok(cmsRenderHtml.includes("https://openai.com"), "Expected generated page to contain resolved CMS link");
        assert.ok(!cmsRenderHtml.includes("{{> about_cta}}"), "Expected generated page to avoid raw partial include when CMS render succeeds");
        const savedCmsRenderLayout = await requestJson(
            base,
            `/api/saved-layout?fileName=${encodeURIComponent(cmsRenderLayoutFileName)}`
        );
        assert.equal(savedCmsRenderLayout.response.status, 200, "Expected saved CMS layout to be readable");
        assert.deepStrictEqual(
            savedCmsRenderLayout.result.data.layout[0].props.cmsBinding,
            cmsRenderBinding,
            "Expected saved layouts to preserve existing cmsBinding metadata"
        );

        await cmsService.createCollection({
            slug: "stale_only",
            name: "Stale Only",
            schema: {
                fields: [
                    { name: "heading", label: "Heading", type: "text" }
                ]
            }
        });
        await cmsService.createEntry({
            collection: "stale_only",
            entryKey: "unexported",
            status: "published",
            sortOrder: 1,
            data: {
                heading: "Fresh But Unexported"
            }
        });
        const staleExportPageName = "phase7-stale-export-fallback-test";
        const staleExportSave = await saveLayout(base, {
            pageName: staleExportPageName,
            overwrite: true,
            layoutData: {
                project: { name: projectName, createdAt: new Date().toISOString() },
                pageTitle: "Phase 7 Stale Export Fallback Test",
                pageName: staleExportPageName,
                createdAt: new Date().toISOString(),
                meta: { version: 1, updatedAt: new Date().toISOString() },
                layout: [
                    {
                        id: "phase7-stale-export-item",
                        order: 1,
                        type: "partial",
                        partial: "about/about_cta.html",
                        componentPath: "about/about_cta.html",
                        name: "stale export",
                        props: {
                            cmsBinding: {
                                source: "cms",
                                mode: "record",
                                collection: "stale_only",
                                selection: { filter: { heading: "Fresh But Unexported" } },
                                fieldMap: { heading: "heading" },
                                fallback: "static"
                            }
                        },
                        renderedContent: `<section><h2>STALE EXPORT CONTENT</h2></section>`
                    }
                ]
            }
        });
        assert.equal(staleExportSave.response.status, 200, "Expected stale export fallback save to return 200");
        const staleExportPagePath = staleExportSave.result.data.pagePath;
        createdPageFiles.add(staleExportPagePath);
        const staleExportHtml = await fs.readFile(staleExportPagePath, "utf8");
        assert.ok(!staleExportHtml.includes("Fresh But Unexported"), "Expected builder export mode not to read unexported CMS data");
        assert.ok(!staleExportHtml.includes("STALE EXPORT CONTENT"), "Expected stale renderedContent to be ignored for CMS fallback");
        assert.ok(staleExportHtml.includes("Let's start a"), "Expected missing/stale CMS export to fall back to static partial markup");

        await cmsService.createCollection({
            slug: "insights",
            name: "Insights",
            schema: {
                fields: [
                    { name: "title", label: "Title", type: "text" },
                    { name: "category", label: "Category", type: "text" },
                    { name: "image_src", label: "Image", type: "text" },
                    { name: "image_alt", label: "Image Alt", type: "text" },
                    { name: "detail_url", label: "URL", type: "text" }
                ]
            }
        });

        await cmsService.createEntry({
            collection: "insights",
            entryKey: "future-ai",
            status: "published",
            sortOrder: 1,
            data: {
                title: "Future Systems",
                category: "Research",
                image_src: "https://example.com/future.jpg",
                image_alt: "Future systems",
                detail_url: "future.html"
            }
        });

        await cmsService.createEntry({
            collection: "insights",
            entryKey: "edge-notes",
            status: "published",
            sortOrder: 2,
            data: {
                title: "Edge Notes",
                category: "Engineering",
                image_src: "https://example.com/edge.jpg",
                image_alt: "Edge notes",
                detail_url: "edge.html"
            }
        });
        await cmsService.exportContent({});

        const cmsCollectionPageName = "phase3-cms-collection-test";
        const cmsCollectionPayload = {
            project: { name: projectName, createdAt: new Date().toISOString() },
            pageTitle: "Phase 3 CMS Collection Test",
            pageName: cmsCollectionPageName,
            createdAt: new Date().toISOString(),
            meta: { version: 1, updatedAt: new Date().toISOString() },
            layout: [
                {
                    id: "cms-collection-item",
                    order: 1,
                    type: "partial",
                    partial: "home/insights.html",
                    componentPath: "home/insights.html",
                    name: "insights",
                    props: {
                        cmsBinding: {
                            source: "cms",
                            mode: "collection",
                            collection: "insights",
                            selection: { sort: "sort_order:asc", limit: 2 },
                            fieldMap: {
                                title: "title",
                                category: "category",
                                imageSrc: "image_src",
                                imageAlt: "image_alt",
                                linkHref: "detail_url"
                            },
                            fallback: "static"
                        }
                    },
                    renderedContent: `<section><div>STALE COLLECTION CONTENT</div></section>`
                }
            ]
        };
        const cmsCollectionSave = await saveLayout(base, {
            layoutData: cmsCollectionPayload,
            pageName: cmsCollectionPageName,
            overwrite: true
        });
        assert.equal(cmsCollectionSave.response.status, 200, "Expected CMS collection save to return 200");
        const cmsCollectionPagePath = cmsCollectionSave.result.data.pagePath;
        createdPageFiles.add(cmsCollectionPagePath);
        const cmsCollectionHtml = await fs.readFile(cmsCollectionPagePath, "utf8");
        assert.ok(!cmsCollectionHtml.includes("STALE COLLECTION CONTENT"), "Expected backend collection render to override stale renderedContent");
        assert.ok(cmsCollectionHtml.includes("Future Systems"), "Expected collection render to include first CMS title");
        assert.ok(cmsCollectionHtml.includes("Edge Notes"), "Expected collection render to include second CMS title");
        assert.ok(cmsCollectionHtml.includes("future.html"), "Expected collection render to include first CMS href");
        assert.ok(cmsCollectionHtml.includes("edge.html"), "Expected collection render to include second CMS href");

        const cmsFallbackPageName = "phase3-cms-fallback-test";
        const cmsFallbackPayload = {
            project: { name: projectName, createdAt: new Date().toISOString() },
            pageTitle: "Phase 3 CMS Fallback Test",
            pageName: cmsFallbackPageName,
            createdAt: new Date().toISOString(),
            meta: { version: 1, updatedAt: new Date().toISOString() },
            layout: [
                {
                    id: "cms-fallback-item",
                    order: 1,
                    type: "partial",
                    partial: "about/about_cta.html",
                    componentPath: "about/about_cta.html",
                    name: "about cta fallback",
                    props: {
                        cmsBinding: {
                            source: "cms",
                            mode: "record",
                            collection: "supporters",
                            selection: { filter: { name: "Missing Entry" } },
                            fieldMap: { heading: "name" },
                            fallback: "static"
                        }
                    },
                    renderedContent: `<section><h2>SHOULD NOT SURVIVE</h2></section>`
                }
            ]
        };
        const cmsFallbackSave = await saveLayout(base, {
            layoutData: cmsFallbackPayload,
            pageName: cmsFallbackPageName,
            overwrite: true
        });
        assert.equal(cmsFallbackSave.response.status, 200, "Expected CMS fallback save to return 200");
        const cmsFallbackPagePath = cmsFallbackSave.result.data.pagePath;
        createdPageFiles.add(cmsFallbackPagePath);
        const cmsFallbackHtml = await fs.readFile(cmsFallbackPagePath, "utf8");
        assert.ok(!cmsFallbackHtml.includes("SHOULD NOT SURVIVE"), "Expected fallback render to ignore stale renderedContent");
        assert.ok(cmsFallbackHtml.includes("Let's start a"), "Expected fallback render to preserve static partial markup");

        await cmsService.createCollection({
            slug: "cta_blocks",
            name: "CTA Blocks",
            schema: {
                fields: [
                    { name: "key", label: "Key", type: "text" },
                    { name: "heading", label: "Heading", type: "text" },
                    { name: "button_label", label: "Button Label", type: "text" },
                    { name: "button_url", label: "Button URL", type: "text" },
                    { name: "active", label: "Active", type: "boolean" }
                ]
            }
        });

        await cmsService.createEntry({
            collection: "cta_blocks",
            entryKey: "about-cta",
            status: "published",
            sortOrder: 1,
            data: {
                key: "about-cta",
                heading: "Build something together.",
                button_label: "Reach Out",
                button_url: "mailto:studio@example.com",
                active: true
            }
        });
        await cmsService.exportContent({});

        const phase4CtaPageName = "phase4-cta-block-test";
        const phase4CtaPayload = {
            project: { name: projectName, createdAt: new Date().toISOString() },
            pageTitle: "Phase 4 CTA Block Test",
            pageName: phase4CtaPageName,
            createdAt: new Date().toISOString(),
            meta: { version: 1, updatedAt: new Date().toISOString() },
            layout: [
                {
                    id: "phase4-cta-item",
                    order: 1,
                    type: "partial",
                    partial: "about/about_cta.html",
                    componentPath: "about/about_cta.html",
                    name: "about cta",
                    props: {
                        cmsBinding: {
                            source: "cms",
                            mode: "record",
                            collection: "cta_blocks",
                            selection: { filter: { key: "about-cta", active: true } },
                            fieldMap: {
                                heading: "heading",
                                buttonLabel: "button_label",
                                buttonUrl: "button_url"
                            },
                            fallback: "static"
                        }
                    }
                }
            ]
        };
        const phase4CtaSave = await saveLayout(base, {
            layoutData: phase4CtaPayload,
            pageName: phase4CtaPageName,
            overwrite: true
        });
        assert.equal(phase4CtaSave.response.status, 200, "Expected phase 4 CTA save to return 200");
        const phase4CtaPagePath = phase4CtaSave.result.data.pagePath;
        createdPageFiles.add(phase4CtaPagePath);
        const phase4CtaHtml = await fs.readFile(phase4CtaPagePath, "utf8");
        assert.ok(phase4CtaHtml.includes("Build something together."), "Expected CTA block render to include CMS heading");
        assert.ok(phase4CtaHtml.includes("Reach Out"), "Expected CTA block render to include CMS button label");
        assert.ok(phase4CtaHtml.includes("mailto:studio@example.com"), "Expected CTA block render to include CMS button URL");

        const phase9TemplatePayload = {
            templateId: "phase9-cta-detail",
            label: "Phase 9 CTA Detail",
            routePattern: "/cta/:slug",
            contentType: "cta_blocks",
            layoutId: regionSave.result.data.layoutFileName,
            regions: {
                header: { label: "Header", required: true },
                main: { label: "Main Content", required: true },
                footer: { label: "Footer", required: true }
            },
            lockedRegions: ["header", "footer"],
            defaultBlocks: {
                header: [
                    {
                        id: "phase9-template-header",
                        order: 1,
                        type: "partial",
                        partial: "landmark/header.html",
                        componentPath: "landmark/header.html",
                        name: "header",
                        props: {}
                    }
                ],
                main: [
                    {
                        id: "phase9-template-cta",
                        order: 1,
                        type: "partial",
                        partial: "about/about_cta.html",
                        componentPath: "about/about_cta.html",
                        name: "cta",
                        props: {
                            cmsBinding: {
                                source: "cms",
                                mode: "record",
                                collection: "cta_blocks",
                                selection: { filter: { key: "about-cta" } },
                                fieldMap: {
                                    heading: "heading",
                                    buttonLabel: "button_label",
                                    buttonUrl: "button_url"
                                },
                                fallback: "static"
                            }
                        }
                    }
                ],
                footer: [
                    {
                        id: "phase9-template-footer",
                        order: 1,
                        type: "partial",
                        partial: "landmark/footer.html",
                        componentPath: "landmark/footer.html",
                        name: "footer",
                        props: {}
                    }
                ]
            }
        };
        const phase9TemplateSave = await requestJson(base, "/api/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(phase9TemplatePayload)
        });
        assert.equal(phase9TemplateSave.response.status, 200, "Expected template save to return 200");
        assert.equal(phase9TemplateSave.result.success, true, "Expected template save success=true");
        assert.equal(phase9TemplateSave.result.data.validation.status, "valid", "Expected valid template record");
        assert.equal(phase9TemplateSave.result.data.regionsCount, 3, "Expected template regions count");

        const phase9AliasTemplateSave = await requestJson(base, "/api/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                templateId: "phase9-region-aliases",
                label: "Phase 9 Region Aliases",
                routePattern: "/region-aliases",
                layoutId: regionSave.result.data.layoutFileName,
                regions: {
                    "main-content": { label: "Main Content", required: true },
                    "side-navigation": { label: "Side Navigation", required: false }
                },
                lockedRegions: ["side-navigation"],
                defaultBlocks: {
                    "main-content": [
                        {
                            id: "phase9-alias-project-grid",
                            order: 1,
                            type: "partial",
                            partial: "project/project_listing.html",
                            componentPath: "project/project_listing.html",
                            name: "Project Grid",
                            region: "Main Content",
                            props: {}
                        }
                    ]
                }
            })
        });
        assert.equal(phase9AliasTemplateSave.response.status, 200, "Expected alias template save to return 200");
        assert.equal(phase9AliasTemplateSave.result.data.validation.errors.length, 0, "Expected region aliases to avoid validation errors");
        assert.ok(phase9AliasTemplateSave.result.data.regions["side-navigation"], "Expected side-navigation template region to stay hyphenated");
        assert.ok(phase9AliasTemplateSave.result.data.defaultBlocks.main, "Expected main-content alias to normalize to main");
        assert.equal(phase9AliasTemplateSave.result.data.lockedRegions[0], "side-navigation", "Expected locked region alias to be canonical");
        assert.ok(
            phase9AliasTemplateSave.result.data.regionsCount >= 2,
            "Expected normalized alias regions to be counted"
        );

        const phase9TemplateList = await requestJson(base, "/api/templates");
        assert.equal(phase9TemplateList.response.status, 200, "Expected template list to return 200");
        assert.ok(
            phase9TemplateList.result.data.some((template) => template.templateId === "phase9-cta-detail"),
            "Expected template list to include saved template"
        );

        const cmsTemplatesList = await requestJson(cmsBase, "/api/cms/templates");
        assert.equal(cmsTemplatesList.response.status, 200, "Expected CMS templates list to return 200");
        assert.equal(cmsTemplatesList.result.success, true, "Expected CMS templates list success=true");
        assert.ok(
            cmsTemplatesList.result.data.some((template) => template.templateId === "phase9-cta-detail"),
            "Expected CMS templates list to read builder template records"
        );

        const cmsTemplateSave = await requestJson(cmsBase, "/api/cms/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                templateId: "phase2-cms-template-admin",
                label: "Phase 2 CMS Template Admin",
                routePattern: "/phase2/{slug}",
                contentType: "cta_blocks",
                layoutId: regionSave.result.data.layoutFileName,
                regions: {
                    header: { label: "Header", required: true },
                    "content_above": { label: "Content Above" },
                    main: { label: "Main", required: true },
                    footer: { label: "Footer", required: true }
                },
                lockedRegions: ["header", "footer"],
                defaultBlocks: {
                    "content_above": [
                        {
                            id: "phase2-template-hero",
                            order: 1,
                            type: "partial",
                            partial: "home/hero.html",
                            componentPath: "home/hero.html",
                            name: "Hero",
                            props: {}
                        }
                    ]
                }
            })
        });
        assert.equal(cmsTemplateSave.response.status, 200, "Expected CMS template save to return 200");
        assert.equal(cmsTemplateSave.result.success, true, "Expected CMS template save success=true");
        assert.equal(cmsTemplateSave.result.data.defaultBlocks["content-above"][0].region, "content-above", "Expected CMS template save to canonicalize region aliases");
        assert.equal(cmsTemplateSave.result.data.validation.status, "valid", "Expected CMS template validation to pass");

        const cmsTemplateRead = await requestJson(cmsBase, "/api/cms/templates/phase2-cms-template-admin");
        assert.equal(cmsTemplateRead.response.status, 200, "Expected CMS template read to return 200");
        assert.equal(cmsTemplateRead.result.data.templateId, "phase2-cms-template-admin", "Expected CMS template readback");
        const cmsTemplatePreview = await requestText(cmsBase, "/api/cms/templates/phase2-cms-template-admin/preview");
        assert.equal(cmsTemplatePreview.response.status, 200, "Expected CMS template preview to return 200");
        assert.ok(cmsTemplatePreview.text.includes('href="/site/css/styles.css"'), "Expected template preview CSS to resolve through /site");
        assert.ok(cmsTemplatePreview.text.includes('src="/site/js/main.js"'), "Expected template preview JS to resolve through /site");
        assert.ok(cmsTemplatePreview.text.includes('src="/site/img/theme-icon.svg"'), "Expected template preview images to resolve through /site");
        assert.ok(cmsTemplatePreview.text.includes('srcset="/site/img/theme-icon.svg 1x, /site/img/theme-icon.svg 2x"'), "Expected template preview srcset images to resolve through /site");
        const savedThemeBuild = path.join(sandboxRoot, "themes", "theme-3", "build");
        assert.ok(await fs.pathExists(path.join(savedThemeBuild, "src", "js", "main.js")), "Expected saved region block build to include source JS");
        assert.ok(await fs.pathExists(path.join(savedThemeBuild, "js", "main.js")), "Expected saved region block build to include runtime JS");
        assert.ok(await fs.pathExists(path.join(savedThemeBuild, "src", "images", "theme-icon.svg")), "Expected saved region block build to include source images");
        assert.ok(await fs.pathExists(path.join(savedThemeBuild, "img", "theme-icon.svg")), "Expected saved region block build to include runtime images");
        const cmsMediaAfterTemplateSave = await requestJson(cmsBase, "/api/cms/media");
        assert.equal(cmsMediaAfterTemplateSave.response.status, 200, "Expected media list after template save to return 200");
        assert.ok(
            cmsMediaAfterTemplateSave.result.data.some((item) => item.fileName === "theme-icon.svg" && String(item.url || "").startsWith("/uploads/")),
            "Expected saved region block images to be imported into CMS media"
        );

        const cmsViewCreate = await requestJson(cmsBase, "/api/cms/views", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                viewId: "phase3-cta-listing",
                label: "Phase 3 CTA Listing",
                description: "Lists active CTA blocks.",
                collection: "cta_blocks",
                query: {
                    status: "published",
                    filters: { active: true },
                    sort: [{ field: "heading", direction: "asc" }],
                    limit: 5
                },
                displays: [
                    { displayId: "block", label: "Block", type: "block" },
                    { displayId: "page", label: "Page", type: "page", route: "/cta-listing" }
                ]
            })
        });
        assert.equal(cmsViewCreate.response.status, 200, "Expected CMS View create to return 200");
        assert.equal(cmsViewCreate.result.success, true, "Expected CMS View create success=true");
        assert.equal(cmsViewCreate.result.data.viewId, "phase3-cta-listing", "Expected CMS View ID");
        assert.equal(cmsViewCreate.result.data.validation.status, "valid", "Expected valid CMS View");

        const cmsViewsList = await requestJson(cmsBase, "/api/cms/views");
        assert.equal(cmsViewsList.response.status, 200, "Expected CMS Views list to return 200");
        assert.ok(
            cmsViewsList.result.data.some((view) => view.viewId === "phase3-cta-listing"),
            "Expected CMS Views list to include created View"
        );

        const cmsViewRead = await requestJson(cmsBase, "/api/cms/views/phase3-cta-listing");
        assert.equal(cmsViewRead.response.status, 200, "Expected CMS View read to return 200");
        assert.equal(cmsViewRead.result.data.collection, "cta_blocks", "Expected CMS View read collection");

        const cmsViewPreview = await requestJson(cmsBase, "/api/cms/views/phase3-cta-listing/preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ displayId: "block" })
        });
        assert.equal(cmsViewPreview.response.status, 200, "Expected CMS View preview to return 200");
        assert.equal(cmsViewPreview.result.data.count, 1, "Expected CMS View preview count");
        assert.equal(cmsViewPreview.result.data.entries[0].entryKey, "about-cta", "Expected CMS View preview entry");

        const builderCmsViews = await requestJson(base, "/api/builder/cms/views");
        assert.equal(builderCmsViews.response.status, 200, "Expected builder CMS Views read API to return 200");
        assert.ok(
            builderCmsViews.result.data.some((view) => view.viewId === "phase3-cta-listing"),
            "Expected builder CMS Views read API to include created CMS View"
        );

        const builderCmsViewPreview = await requestJson(base, "/api/builder/cms/views/phase3-cta-listing/preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ displayId: "block" })
        });
        assert.equal(builderCmsViewPreview.response.status, 200, "Expected builder View preview API to return 200");
        assert.equal(builderCmsViewPreview.result.data.count, 1, "Expected builder View preview count");

        const builderViewBlockPageName = "phase6-view-block-test";
        const builderViewBlockSave = await saveLayout(base, {
            pageName: builderViewBlockPageName,
            layoutData: {
                project: { name: "theme_3" },
                pageName: builderViewBlockPageName,
                pageTitle: "Phase 6 View Block Test",
                meta: { version: 2, layoutModel: "regions", updatedAt: new Date().toISOString() },
                regions: {
                    main: [
                        {
                            id: "phase6-view-block",
                            instanceId: "phase6-view-block",
                            order: 1,
                            type: "view",
                            viewId: "phase3-cta-listing",
                            displayId: "block",
                            name: "CTA Listing View",
                            region: "main",
                            config: { wrapper: "listing" },
                            visibility: "visible",
                            visible: true
                        }
                    ]
                }
            }
        });
        assert.equal(builderViewBlockSave.response.status, 200, "Expected builder View block layout save to return 200");
        createdPageFiles.add(builderViewBlockSave.result.data.pagePath);
        const builderViewBlockHtml = await fs.readFile(builderViewBlockSave.result.data.pagePath, "utf8");
        assert.ok(builderViewBlockHtml.includes("Build something together."), "Expected View block page to render CMS View data");
        const builderViewBlockLayout = await requestJson(base, `/api/saved-layout?fileName=${encodeURIComponent(builderViewBlockSave.result.data.layoutFileName)}`);
        assert.ok(builderViewBlockLayout.result.data.regions.main[0].type === "view", "Expected saved region block type to remain view");
        assert.equal(builderViewBlockLayout.result.data.regions.main[0].viewId, "phase3-cta-listing", "Expected saved View block viewId");
        assert.equal(builderViewBlockLayout.result.data.regions.main[0].displayId, "block", "Expected saved View block displayId");

        const invalidBuilderViewDisplay = await saveLayout(base, {
            pageName: "phase6-invalid-view-display",
            layoutData: {
                project: { name: "theme_3" },
                pageName: "phase6-invalid-view-display",
                pageTitle: "Phase 6 Invalid View Display",
                meta: { version: 2, layoutModel: "regions", updatedAt: new Date().toISOString() },
                regions: {
                    main: [
                        {
                            id: "phase6-view-page-display",
                            instanceId: "phase6-view-page-display",
                            order: 1,
                            type: "view",
                            viewId: "phase3-cta-listing",
                            displayId: "page",
                            name: "Invalid Page Display",
                            region: "main",
                            config: {},
                            visibility: "visible",
                            visible: true
                        }
                    ]
                }
            }
        });
        assert.equal(invalidBuilderViewDisplay.response.status, 400, "Expected page display View block save to fail validation");

        const cmsViewUpdate = await requestJson(cmsBase, "/api/cms/views/phase3-cta-listing", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ label: "Phase 3 CTA Listing Updated" })
        });
        assert.equal(cmsViewUpdate.response.status, 200, "Expected CMS View update to return 200");
        assert.equal(cmsViewUpdate.result.data.label, "Phase 3 CTA Listing Updated", "Expected CMS View label update");

        const invalidCmsView = await requestJson(cmsBase, "/api/cms/views", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                viewId: "phase3-invalid-view",
                label: "Invalid View",
                collection: "cta_blocks",
                query: {
                    filters: { missing_field: true },
                    sort: [{ field: "also_missing", direction: "asc" }]
                },
                displays: [
                    { displayId: "page", type: "page", route: "/phase2/{slug}" },
                    { displayId: "page", type: "block" }
                ]
            })
        });
        assert.equal(invalidCmsView.response.status, 400, "Expected invalid CMS View to return 400");
        assert.equal(invalidCmsView.result.code, "CMS_VIEW_INVALID", "Expected invalid CMS View code");
        assert.ok(
            invalidCmsView.result.details.errors.some((item) => item.code === "VIEW_FILTER_FIELD_NOT_FOUND"),
            "Expected invalid CMS View filter field validation"
        );
        assert.ok(
            invalidCmsView.result.details.errors.some((item) => item.code === "VIEW_DISPLAY_ID_DUPLICATE"),
            "Expected invalid CMS View duplicate display validation"
        );
        assert.ok(
            invalidCmsView.result.details.errors.some((item) => item.code === "VIEW_PAGE_ROUTE_CONFLICT"),
            "Expected invalid CMS View route conflict validation"
        );

        const cmsTemplateDelete = await requestJson(cmsBase, "/api/cms/templates/phase2-cms-template-admin", { method: "DELETE" });
        assert.equal(cmsTemplateDelete.response.status, 200, "Expected CMS template delete to return 200");
        assert.equal(cmsTemplateDelete.result.data.deleted, true, "Expected CMS template delete result");

        const phase9TemplatePreview = await requestJson(base, "/api/templates/phase9-cta-detail/preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ entryKey: "about-cta" })
        });
        assert.equal(phase9TemplatePreview.response.status, 200, "Expected template preview to return 200");
        assert.equal(phase9TemplatePreview.result.success, true, "Expected template preview success=true");
        assert.ok(phase9TemplatePreview.result.data.html.includes("Build something together."), "Expected template preview to render selected CMS entry");
        createdPageFiles.add(phase9TemplatePreview.result.data.pagePath);

        const themeExport = await cmsService.exportTheme({
            themeName: "Theme 3 Test",
            includeCompiledAssets: false,
            overwrite: true
        });
        assert.equal(themeExport.validation.valid, true, "Expected theme export validation to pass");
        const themeManifest = await fs.readJson(themeExport.manifestPath);
        assert.ok(Array.isArray(themeManifest.regions) && themeManifest.regions.includes("header"), "Expected theme manifest regions");
        assert.ok(themeManifest.regions.includes("side-navigation"), "Expected theme manifest to use canonical side-navigation region");
        assert.ok(themeManifest.regions.includes("content-above"), "Expected theme manifest to use canonical content-above region");
        assert.ok(themeManifest.regions.includes("content-below"), "Expected theme manifest to use canonical content-below region");
        assert.ok(!themeManifest.regions.includes("side_nav"), "Expected theme manifest not to use underscore side_nav region");
        assert.ok(Array.isArray(themeManifest.regionDefinitions), "Expected Drupal-style region definitions");
        assert.ok(themeManifest.templates.some((template) => template.file === "build/templates/page.html"), "Expected page theme template manifest");
        assert.equal(themeManifest.counts.views, 1, "Expected theme manifest View count");
        assert.ok(Array.isArray(themeManifest.views), "Expected theme manifest Views metadata");
        assert.ok(themeManifest.views.some((view) => view.file === "build/views/phase3-cta-listing.json"), "Expected theme manifest View file metadata");
        assert.ok(await fs.pathExists(path.join(themeExport.outputPath, "build", "templates", "page.html")), "Expected exported page template");
        assert.ok(await fs.pathExists(path.join(themeExport.outputPath, "build", "templates", "regions", "header.html")), "Expected exported header region template");
        assert.ok(await fs.pathExists(path.join(themeExport.outputPath, "build", "templates", "regions", "footer.html")), "Expected exported footer region template");
        assert.ok(await fs.pathExists(path.join(themeExport.outputPath, "build", "regions", "side-navigation.json")), "Expected exported canonical side-navigation region manifest");
        assert.ok(await fs.pathExists(path.join(themeExport.outputPath, "build", "views", "phase3-cta-listing.json")), "Expected exported View JSON file");
        const exportedView = await fs.readJson(path.join(themeExport.outputPath, "build", "views", "phase3-cta-listing.json"));
        assert.equal(exportedView.viewId, "phase3-cta-listing", "Expected exported View ID");
        assert.equal(exportedView.validation.status, "valid", "Expected exported View validation status");
        const exportedPageTemplate = await fs.readFile(path.join(themeExport.outputPath, "build", "templates", "page.html"), "utf8");
        assert.ok(exportedPageTemplate.includes('{{> regions/header }}'), "Expected page template to include header region");
        assert.ok(exportedPageTemplate.includes('{{> regions/footer }}'), "Expected page template to include footer region");
        const exportedThemeReadme = await fs.readFile(path.join(themeExport.outputPath, "README.md"), "utf8");
        assert.ok(exportedThemeReadme.includes("`build/views/`"), "Expected exported README to mention views directory");

        const publishChecklist = await cmsService.getPublishChecklist();
        assert.ok(
            publishChecklist.items.some((item) => item.id === "views" && item.status === "passed"),
            "Expected publish checklist to include passing View validity"
        );

        const cmsViewDelete = await requestJson(cmsBase, "/api/cms/views/phase3-cta-listing", { method: "DELETE" });
        assert.equal(cmsViewDelete.response.status, 200, "Expected CMS View delete to return 200");
        assert.equal(cmsViewDelete.result.data.deleted, true, "Expected CMS View delete result");

        const phase9InvalidTemplateSave = await requestJson(base, "/api/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                templateId: "phase9-invalid-template",
                label: "Invalid Template",
                routePattern: "/invalid/:slug",
                layoutId: "missing-layout.json",
                defaultBlocks: {
                    header: [
                        {
                            id: "wrong-region",
                            type: "partial",
                            partial: "landmark/footer.html",
                            componentPath: "landmark/footer.html",
                            props: {}
                        }
                    ]
                }
            })
        });
        assert.equal(phase9InvalidTemplateSave.response.status, 200, "Expected invalid template save to return 200 with validation");
        assert.equal(phase9InvalidTemplateSave.result.data.validation.status, "error", "Expected invalid template validation error state");
        assert.ok(
            phase9InvalidTemplateSave.result.data.validation.errors.some((item) => item.code === "TEMPLATE_CONTENT_TYPE_MISSING"),
            "Expected dynamic route without content type validation"
        );

        const phase4SupportersPageName = "phase4-supporters-test";
        const phase4SupportersPayload = {
            project: { name: projectName, createdAt: new Date().toISOString() },
            pageTitle: "Phase 4 Supporters Test",
            pageName: phase4SupportersPageName,
            createdAt: new Date().toISOString(),
            meta: { version: 1, updatedAt: new Date().toISOString() },
            layout: [
                {
                    id: "phase4-supporters-item",
                    order: 1,
                    type: "partial",
                    partial: "home/cta.html",
                    componentPath: "home/cta.html",
                    name: "supporters",
                    props: {
                        cmsBinding: {
                            source: "cms",
                            mode: "collection",
                            collection: "supporters",
                            selection: {
                                groups: [
                                    {
                                        title: "Founding Pillars",
                                        filter: { active: true, tier: "founding" },
                                        itemTag: "a",
                                        itemClassName: "font-heading text-4xl md:text-6xl font-bold uppercase hover:text-gray-300 transition-colors"
                                    },
                                    {
                                        title: "Visionary Contributors",
                                        filter: { active: true, tier: "visionary" },
                                        itemTag: "a",
                                        itemClassName: "font-heading text-xl md:text-2xl font-medium uppercase"
                                    },
                                    {
                                        title: "Community Support",
                                        filter: { active: true, tier: "community" },
                                        itemTag: "a"
                                    }
                                ]
                            },
                            fieldMap: {
                                label: "name",
                                linkHref: "url"
                            },
                            fallback: "static"
                        }
                    }
                }
            ]
        };
        const phase4SupportersSave = await saveLayout(base, {
            layoutData: phase4SupportersPayload,
            pageName: phase4SupportersPageName,
            overwrite: true
        });
        assert.equal(phase4SupportersSave.response.status, 200, "Expected phase 4 supporters save to return 200");
        const phase4SupportersPagePath = phase4SupportersSave.result.data.pagePath;
        createdPageFiles.add(phase4SupportersPagePath);
        const phase4SupportersHtml = await fs.readFile(phase4SupportersPagePath, "utf8");
        assert.ok(phase4SupportersHtml.includes("OpenAI"), "Expected supporters render to include founding supporter");
        assert.ok(phase4SupportersHtml.includes("Anthropic"), "Expected supporters render to include visionary supporter");
        assert.ok(phase4SupportersHtml.includes("Community Friends"), "Expected supporters render to include community supporter");
        assert.ok(phase4SupportersHtml.includes("https://anthropic.com"), "Expected supporters render to include supporter URLs");

        await cmsService.createCollection({
            slug: "projects",
            name: "Projects",
            schema: {
                fields: [
                    { name: "title", label: "Title", type: "text" },
                    { name: "category", label: "Category", type: "text" },
                    { name: "image_src", label: "Image", type: "text" },
                    { name: "image_alt", label: "Image Alt", type: "text" },
                    { name: "detail_url", label: "URL", type: "text" },
                    { name: "year", label: "Year", type: "text" },
                    { name: "active", label: "Active", type: "boolean" },
                    { name: "featured", label: "Featured", type: "boolean" }
                ]
            }
        });

        const projectEntries = [
            {
                entryKey: "aimana",
                sortOrder: 1,
                data: {
                    title: "AIMANA",
                    category: "AI Animation",
                    image_src: "https://example.com/aimana.jpg",
                    image_alt: "AIMANA",
                    detail_url: "aimana.html",
                    year: "2024",
                    active: true,
                    featured: true
                }
            },
            {
                entryKey: "voyager",
                sortOrder: 2,
                data: {
                    title: "VOYAGER",
                    category: "Cloud",
                    image_src: "https://example.com/voyager.jpg",
                    image_alt: "Voyager",
                    detail_url: "voyager.html",
                    year: "2024",
                    active: true,
                    featured: true
                }
            },
            {
                entryKey: "neural-canvas",
                sortOrder: 3,
                data: {
                    title: "NEURAL CANVAS",
                    category: "Engineering",
                    image_src: "https://example.com/neural.jpg",
                    image_alt: "Neural Canvas",
                    detail_url: "neural.html",
                    year: "2023",
                    active: true,
                    featured: false
                }
            },
            {
                entryKey: "oscillate",
                sortOrder: 4,
                data: {
                    title: "OSCILLATE",
                    category: "Product",
                    image_src: "https://example.com/oscillate.jpg",
                    image_alt: "Oscillate",
                    detail_url: "oscillate.html",
                    year: "2023",
                    active: true,
                    featured: false
                }
            }
        ];
        for (const entry of projectEntries) {
            await cmsService.createEntry({
                collection: "projects",
                entryKey: entry.entryKey,
                status: "published",
                sortOrder: entry.sortOrder,
                data: entry.data
            });
        }
        await cmsService.exportContent({});

        const phase4ProjectListingPageName = "phase4-project-listing-test";
        const phase4ProjectListingPayload = {
            project: { name: projectName, createdAt: new Date().toISOString() },
            pageTitle: "Phase 4 Project Listing Test",
            pageName: phase4ProjectListingPageName,
            createdAt: new Date().toISOString(),
            meta: { version: 1, updatedAt: new Date().toISOString() },
            layout: [
                {
                    id: "phase4-project-listing-item",
                    order: 1,
                    type: "partial",
                    partial: "project/project_listing.html",
                    componentPath: "project/project_listing.html",
                    name: "project listing",
                    props: {
                        cmsBinding: {
                            source: "cms",
                            mode: "collection",
                            collection: "projects",
                            selection: {
                                filter: { active: true },
                                sort: "sort_order:asc",
                                limit: 4
                            },
                            fieldMap: {
                                title: "title",
                                category: "category",
                                year: "year",
                                imageSrc: "image_src",
                                imageAlt: "image_alt",
                                linkHref: "detail_url"
                            },
                            fallback: "static"
                        }
                    }
                }
            ]
        };
        const phase4ProjectListingSave = await saveLayout(base, {
            layoutData: phase4ProjectListingPayload,
            pageName: phase4ProjectListingPageName,
            overwrite: true
        });
        assert.equal(phase4ProjectListingSave.response.status, 200, "Expected phase 4 project listing save to return 200");
        const phase4ProjectListingPagePath = phase4ProjectListingSave.result.data.pagePath;
        createdPageFiles.add(phase4ProjectListingPagePath);
        const phase4ProjectListingHtml = await fs.readFile(phase4ProjectListingPagePath, "utf8");
        assert.ok(phase4ProjectListingHtml.includes("AIMANA"), "Expected project listing render to include first project");
        assert.ok(phase4ProjectListingHtml.includes("VOYAGER"), "Expected project listing render to include second project");
        assert.ok(phase4ProjectListingHtml.includes("NEURAL CANVAS"), "Expected project listing render to include third project");
        assert.ok(phase4ProjectListingHtml.includes("OSCILLATE"), "Expected project listing render to include fourth project");
        assert.ok(phase4ProjectListingHtml.includes("aimana.html"), "Expected project listing render to include project links");
        assert.ok(phase4ProjectListingHtml.includes("2023"), "Expected project listing render to include CMS year values");

        const deletedPage = await requestJson(base, "/api/pages", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectName, pageName })
        });
        assert.equal(deletedPage.response.status, 200, "Expected page delete to return 200");
        assert.equal(deletedPage.result.success, true, "Expected page delete success=true");

        const deletedProject = await requestJson(base, "/api/projects", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ projectName })
        });
        assert.equal(deletedProject.response.status, 200, "Expected project delete to return 200");
        assert.equal(deletedProject.result.success, true, "Expected project delete success=true");

        console.log("Builder integration tests passed.");
    } finally {
        for (const filePath of createdLayoutFiles) {
            if (filePath && await fs.pathExists(filePath)) {
                await fs.remove(filePath);
            }
        }
        for (const filePath of createdPageFiles) {
            if (filePath && await fs.pathExists(filePath)) {
                await fs.remove(filePath);
            }
        }
        await builder.stopServer();
        if (cmsRuntime && cmsRuntime.server) {
            await new Promise((resolve) => cmsRuntime.server.close(resolve));
        }
        if (cmsRuntime?.repository && typeof cmsRuntime.repository.close === "function") {
            await cmsRuntime.repository.close();
        }
        if (cmsRepository && typeof cmsRepository.close === "function") {
            await cmsRepository.close();
        }
        await safeRemove(sandboxRoot);
    }
}

run().catch((err) => {
    console.error("Builder integration tests failed:", err.message);
    process.exit(1);
});
