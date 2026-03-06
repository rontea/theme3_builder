"use strict";

function createLayoutsRepository(builderTask) {
    return {
        dbRun(sql, params = []) {
            return builderTask.dbRun(sql, params);
        },
        dbGet(sql, params = []) {
            return builderTask.dbGet(sql, params);
        },
        dbAll(sql, params = []) {
            return builderTask.dbAll(sql, params);
        }
    };
}

module.exports = {
    createLayoutsRepository
};
