"use strict";

module.exports = {
    ...require("./config"),
    ...require("./app"),
    ...require("./controllers/cms.controller"),
    ...require("./repositories/cms.repository"),
    ...require("./routes/cms.routes"),
    ...require("./services/cms.service"),
    ...require("./utils/cms-utils")
};
