"use strict";

function createBuilderService(builderTask) {
    return {
        saveLayout(layoutData, options) {
            return builderTask.saveLayout(layoutData, options);
        },
        syncPagesFromFilesystem(projectName) {
            return builderTask.syncPagesFromFilesystem(projectName);
        }
    };
}

module.exports = {
    createBuilderService
};
