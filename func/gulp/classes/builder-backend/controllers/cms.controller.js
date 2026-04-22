"use strict";

const { createCmsController: createThemeCmsController } = require("../../../../../theme-cms/server/controllers/cms.controller");

function createCmsController(builderTask, cmsService) {
    return createThemeCmsController({
        cmsService,
        logBoundary: builderTask.logBoundary.bind(builderTask),
        sendError: builderTask.sendError.bind(builderTask)
    });
}

module.exports = {
    createCmsController
};
