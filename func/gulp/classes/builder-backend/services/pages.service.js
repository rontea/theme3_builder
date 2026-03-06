"use strict";

function createPagesService(builderTask, pagesRepository) {
    return {
        createPage(payload) {
            return builderTask.createPage(payload);
        },
        listPages(projectName) {
            return builderTask.listPages(projectName);
        },
        getPagePartials(pageName) {
            return builderTask.getPagePartials(pageName);
        },
        setPagePartialsSynced(payload) {
            return builderTask.setPagePartialsSynced(payload);
        },
        syncPagesFromFilesystem(projectName) {
            return builderTask.syncPagesFromFilesystem(projectName);
        },
        deletePage(payload) {
            return builderTask.deletePage(payload);
        },
        repository: pagesRepository
    };
}

module.exports = {
    createPagesService
};
