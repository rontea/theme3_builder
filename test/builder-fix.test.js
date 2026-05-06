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

        const cmsConfig = createThemeCmsConfig({ projectRoot: sandboxRoot });
        cmsRepository = createCmsRepository(cmsConfig);
        await cmsRepository.initSchema();
        cmsService = createCmsService(cmsRepository, { config: cmsConfig });

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

        cmsRuntime = await startThemeCmsServer({ projectRoot: sandboxRoot, port: 0 });
        const cmsBase = `http://localhost:${cmsRuntime.server.address().port}`;
        const cmsServeCollections = await requestJson(cmsBase, "/api/cms/collections");
        assert.equal(cmsServeCollections.response.status, 200, "Expected standalone CMS server to mount /api/cms/collections");
        assert.equal(cmsServeCollections.result.success, true, "Expected standalone CMS collections success=true");
        assert.ok(
            cmsServeCollections.result.data.some((item) => item.slug === "supporters"),
            "Expected standalone CMS server to list supporters collection"
        );

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
