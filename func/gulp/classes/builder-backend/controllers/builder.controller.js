"use strict";

function createBuilderController(builderTask) {
    return {
        sendError(res, err, fallbackCode) {
            return builderTask.sendError(res, err, fallbackCode);
        }
    };
}

module.exports = {
    createBuilderController
};
