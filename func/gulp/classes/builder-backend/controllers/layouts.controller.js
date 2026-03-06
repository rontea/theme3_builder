"use strict";

function createLayoutsController(builderTask, layoutsService) {
    return {
        saveLayout: async (req, res) => {
            builderTask.logBoundary("route", "POST /api/save-layout");
            try {
                const { layoutData, fileName, pageName, overwrite, saveAs, layoutFileName } = req.body || {};
                if (!layoutData) {
                    return res.status(400).json({ success: false, error: "Missing layoutData" });
                }
                const saveResult = await layoutsService.saveLayout(layoutData, {
                    pageName: pageName || fileName,
                    overwrite: Boolean(overwrite),
                    saveAs: Boolean(saveAs),
                    layoutFileName
                });
                // Keep `path` for backward compatibility with existing clients.
                res.json({
                    success: true,
                    data: {
                        path: saveResult.layoutPath,
                        layoutPath: saveResult.layoutPath,
                        pagePath: saveResult.pagePath,
                        pageName: saveResult.pageName,
                        layoutFileName: saveResult.layoutFileName
                    }
                });
            } catch (err) {
                builderTask.sendError(res, err, "LAYOUT_SAVE_FAILED");
            }
        },
        listSavedLayouts: async (req, res) => {
            builderTask.logBoundary("route", "GET /api/saved-layouts");
            try {
                const items = await layoutsService.listSavedLayouts();
                res.json({ success: true, data: items });
            } catch (err) {
                builderTask.sendError(res, err, "SAVED_LAYOUTS_LIST_FAILED");
            }
        },
        getSavedLayout: async (req, res) => {
            builderTask.logBoundary("route", "GET /api/saved-layout");
            try {
                const { fileName } = req.query;
                if (!fileName) {
                    return res.status(400).json({ success: false, error: "Missing fileName parameter" });
                }
                const item = await layoutsService.getSavedLayout(fileName);
                res.json({ success: true, data: item });
            } catch (err) {
                builderTask.sendError(res, err, "SAVED_LAYOUT_READ_FAILED");
            }
        },
        deleteSavedLayout: async (req, res) => {
            builderTask.logBoundary("route", "DELETE /api/saved-layout");
            try {
                const fileName = req.body?.fileName || req.query?.fileName;
                if (!fileName) {
                    return res.status(400).json({ success: false, error: "Missing fileName parameter" });
                }
                const deleted = await layoutsService.deleteSavedLayout(fileName);
                res.json({ success: true, data: deleted });
            } catch (err) {
                builderTask.sendError(res, err, "SAVED_LAYOUT_DELETE_FAILED");
            }
        }
    };
}

module.exports = {
    createLayoutsController
};
