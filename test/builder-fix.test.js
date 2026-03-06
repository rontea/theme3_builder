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

async function run() {
    const builder = new BuilderTask({ port: 0 });
    const createdLayoutFiles = new Set();
    const createdPageFiles = new Set();

    try {
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
        createdLayoutFiles.add(layoutPath);
        createdPageFiles.add(pagePath);

        assert.ok(layoutPath, "Expected layoutPath/path in save response");
        assert.ok(pagePath, "Expected pagePath in save response");
        assert.ok(layoutFileName, "Expected layoutFileName in save response");
        assert.ok(await fs.pathExists(layoutPath), "Expected saved layout JSON file to exist");
        assert.ok(await fs.pathExists(pagePath), "Expected generated HTML page to exist");

        // Saved-layout listing/read
        const listRes = await fetch(`${base}/api/saved-layouts`);
        assert.equal(listRes.status, 200, "Expected /api/saved-layouts to return 200");
        const listBody = await listRes.json();
        assert.equal(listBody.success, true, "Expected /api/saved-layouts success=true");
        assert.ok(
            listBody.data.some((item) => item.fileName === path.basename(layoutPath)),
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
        createdLayoutFiles.add(saveAsLayoutPath);
        createdPageFiles.add(saveAsPagePath);
        assert.ok(await fs.pathExists(saveAsLayoutPath), "Expected save-as layout JSON file to exist");
        assert.ok(await fs.pathExists(saveAsPagePath), "Expected save-as HTML page to exist");

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
    }
}

run().catch((err) => {
    console.error("Builder integration tests failed:", err.message);
    process.exit(1);
});
