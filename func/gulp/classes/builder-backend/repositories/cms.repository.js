"use strict";

const { createCmsRepository: createThemeCmsRepository } = require("../../../../../theme-cms/server/repositories/cms.repository");
const { createThemeCmsConfig } = require("../../../../../theme-cms/server/config");

function createCmsRepository(builderTask) {
    return createThemeCmsRepository(createThemeCmsConfig({
        projectRoot: builderTask.cmsProjectRoot
    }));
}

module.exports = {
    createCmsRepository
};
