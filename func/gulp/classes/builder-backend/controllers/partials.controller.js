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
        }
    };
}

module.exports = {
    createPartialsController
};
