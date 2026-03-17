"use strict";

function createPartialsController(builderTask, partialsService) {
    return {
        listPartials: async (req, res) => {
            builderTask.logBoundary("route", "GET /api/partials");
            try {
                const partials = await partialsService.scanPartials();
                res.json({ success: true, data: partials });
            } catch (err) {
                builderTask.sendError(res, err, "PARTIALS_SCAN_FAILED");
            }
        },
        listMicroComponents: async (req, res) => {
            builderTask.logBoundary("route", "GET /api/micro");
            try {
                const components = await partialsService.scanMicroComponents();
                res.json({ success: true, data: components });
            } catch (err) {
                builderTask.sendError(res, err, "MICRO_SCAN_FAILED");
            }
        },
        getPartialContent: async (req, res) => {
            builderTask.logBoundary("route", "GET /api/partial");
            try {
                const { path: filePath } = req.query;
                if (!filePath) {
                    return res.status(400).json({ success: false, error: "Missing path parameter" });
                }
                const content = await partialsService.getPartialContent(filePath);
                res.json({ success: true, data: content });
            } catch (err) {
                builderTask.sendError(res, err, "PARTIAL_READ_FAILED");
            }
        },
        getPreviewStyles: async (req, res) => {
            builderTask.logBoundary("route", "GET /api/preview-styles");
            try {
                const result = await partialsService.getPreviewStyles();
                if (!result) {
                    return res.status(404).json({ success: false, error: "Preview styles not found" });
                }
                res.json({ success: true, data: result });
            } catch (err) {
                builderTask.sendError(res, err, "PREVIEW_STYLES_READ_FAILED");
            }
        },
        savePartialContent: async (req, res) => {
            builderTask.logBoundary("route", "POST /api/partial");
            try {
                const { path: filePath, content, overwrite } = req.body || {};
                if (!filePath) {
                    return res.status(400).json({ success: false, error: "Missing path parameter" });
                }
                const result = await partialsService.savePartialContent(filePath, content || "", { overwrite: Boolean(overwrite) });
                res.json({ success: true, data: result });
            } catch (err) {
                builderTask.sendError(res, err, "PARTIAL_SAVE_FAILED");
            }
        }
    };
}

module.exports = {
    createPartialsController
};
