"use strict";

function createCmsService(builderTask) {
    return {
        listCollections() {
            return builderTask.listCmsCollections();
        },
        createCollection(payload = {}) {
            return builderTask.createCmsCollection(payload);
        },
        updateCollection(slug, payload = {}) {
            return builderTask.updateCmsCollection(slug, payload);
        },
        deleteCollection(slug) {
            return builderTask.deleteCmsCollection(slug);
        },
        listEntries(collection) {
            return builderTask.listCmsEntries(collection);
        },
        createEntry(payload = {}) {
            return builderTask.createCmsEntry(payload);
        },
        updateEntry(id, payload = {}) {
            return builderTask.updateCmsEntry(id, payload);
        },
        deleteEntry(id) {
            return builderTask.deleteCmsEntry(id);
        },
        exportContent(payload = {}) {
            return builderTask.exportCmsContent(payload);
        }
    };
}

module.exports = {
    createCmsService
};
