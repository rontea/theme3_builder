"use strict";

function createPagesController(builderTask, pagesService) {
    return {
        createPage: async (req, res) => {
            builderTask.logBoundary("route", "POST /api/pages");
            try {
                const { projectName, pageName, pageTitle } = req.body || {};
                if (!projectName || !pageName) {
                    return res.status(400).json({ success: false, error: "Missing projectName or pageName" });
                }
                const page = await pagesService.createPage({ projectName, pageName, pageTitle });
                res.json({ success: true, data: page });
            } catch (err) {
                builderTask.sendError(res, err, "PAGE_CREATE_FAILED");
            }
        },
        clonePage: async (req, res) => {
            builderTask.logBoundary("route", "POST /api/pages/clone");
            try {
                const { projectName, sourcePageName, targetPageName, targetPageTitle } = req.body || {};
                if (!projectName || !sourcePageName || !targetPageName) {
                    return res.status(400).json({ success: false, error: "Missing projectName, sourcePageName, or targetPageName" });
                }
                const page = await pagesService.clonePage({ projectName, sourcePageName, targetPageName, targetPageTitle });
                res.json({ success: true, data: page });
            } catch (err) {
                builderTask.sendError(res, err, "PAGE_CLONE_FAILED");
            }
        },
        listPages: async (req, res) => {
            builderTask.logBoundary("route", "GET /api/pages");
            try {
                const { projectName } = req.query;
                if (!projectName) {
                    return res.status(400).json({ success: false, error: "Missing projectName parameter" });
                }
                const pages = await pagesService.listPages(projectName);
                res.json({ success: true, data: pages });
            } catch (err) {
                builderTask.sendError(res, err, "PAGES_LIST_FAILED");
            }
        },
        getPagePartials: async (req, res) => {
            builderTask.logBoundary("route", "GET /api/pages/partials");
            try {
                const projectName = req.query?.projectName || "theme_3";
                const pageName = req.query?.pageName;
                if (!pageName) {
                    return res.status(400).json({ success: false, error: "Missing pageName parameter" });
                }
                const partials = await pagesService.getPagePartials(pageName);
                res.json({ success: true, data: { projectName, pageName, partials } });
            } catch (err) {
                builderTask.sendError(res, err, "PAGE_PARTIALS_READ_FAILED");
            }
        },
        setPagePartialsSyncState: async (req, res) => {
            builderTask.logBoundary("route", "POST /api/pages/partials/sync-state");
            try {
                const projectName = req.body?.projectName || req.query?.projectName || "theme_3";
                const pageName = req.body?.pageName || req.query?.pageName;
                const partialsSynced = Boolean(req.body?.partialsSynced);
                if (!pageName) {
                    return res.status(400).json({ success: false, error: "Missing pageName parameter" });
                }
                const data = await pagesService.setPagePartialsSynced({ projectName, pageName, partialsSynced });
                res.json({ success: true, data });
            } catch (err) {
                builderTask.sendError(res, err, "PAGE_PARTIALS_SYNC_STATE_FAILED");
            }
        },
        syncPages: async (req, res) => {
            builderTask.logBoundary("route", "POST /api/pages/sync");
            try {
                const projectName = req.body?.projectName || req.query?.projectName || "theme_3";
                const data = await pagesService.syncPagesFromFilesystem(projectName);
                res.json({ success: true, data });
            } catch (err) {
                builderTask.sendError(res, err, "PAGES_SYNC_FAILED");
            }
        },
        deletePage: async (req, res) => {
            builderTask.logBoundary("route", "DELETE /api/pages");
            try {
                const projectName = req.body?.projectName || req.query?.projectName;
                const pageName = req.body?.pageName || req.query?.pageName;
                if (!projectName || !pageName) {
                    return res.status(400).json({ success: false, error: "Missing projectName or pageName parameter" });
                }
                const deleted = await pagesService.deletePage({ projectName, pageName });
                res.json({ success: true, data: deleted });
            } catch (err) {
                builderTask.sendError(res, err, "PAGE_DELETE_FAILED");
            }
        }
    };
}

module.exports = {
    createPagesController
};
