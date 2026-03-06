"use strict";

const assert = require("assert");
const path = require("path");
const fs = require("fs-extra");
const BuilderTask = require("../func/gulp/classes/BuilderTask");

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
        layoutsOutputPath: path.join(sandboxRoot, "_builder", "layouts"),
        databasePath: path.join(sandboxRoot, "_builder", "layouts", "builder.sqlite"),
        pagesOutputPath: path.join(sandboxRoot, "html", "pages")
    });
    const createdLayoutFiles = new Set();
    const createdPageFiles = new Set();

    try {
        await safeRemove(sandboxRoot);
        await fs.ensureDir(path.join(sandboxRoot, "_builder", "layouts"));
        await fs.ensureDir(path.join(sandboxRoot, "html", "pages"));

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
        const validPayload = {
            project: { name: "Builder Fix Test", createdAt: new Date().toISOString() },
            pageTitle: "Builder Fix Test",
            pageName: "builder-fix-test",
            createdAt: new Date().toISOString(),
            meta: { version: 1, updatedAt: new Date().toISOString() },
            layout: [
                {
                    id: "item-1",
                    order: 1,
                    type: "partial",
                    partial: "layout/header.html",
                    componentPath: "layout/header.html",
                    name: "header",
                    props: {}
                },
                {
                    id: "item-2",
                    order: 2,
                    type: "partial",
                    partial: "layout/footer.html",
                    componentPath: "layout/footer.html",
                    name: "footer",
                    props: {}
                }
            ]
        };

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

        const pageFlowPayload = {
            project: { name: projectName, createdAt: new Date().toISOString() },
            pageTitle: "Phase 0 Baseline Page",
            pageName,
            createdAt: new Date().toISOString(),
            meta: { version: 1, updatedAt: new Date().toISOString() },
            layout: [
                {
                    id: "phase0-item-1",
                    order: 1,
                    type: "partial",
                    partial: "layout/header.html",
                    componentPath: "layout/header.html",
                    name: "header",
                    props: {}
                },
                {
                    id: "phase0-item-2",
                    order: 2,
                    type: "partial",
                    partial: "layout/footer.html",
                    componentPath: "layout/footer.html",
                    name: "footer",
                    props: {}
                }
            ]
        };

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
        await safeRemove(sandboxRoot);
    }
}

run().catch((err) => {
    console.error("Builder integration tests failed:", err.message);
    process.exit(1);
});
