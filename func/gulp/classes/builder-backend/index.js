"use strict";

module.exports = {
    ...require("./routes/builder.routes"),
    ...require("./routes/layouts.routes"),
    ...require("./routes/partials.routes"),
    ...require("./routes/pages.routes"),
    ...require("./routes/cms.routes"),
    ...require("./controllers/builder.controller"),
    ...require("./controllers/layouts.controller"),
    ...require("./controllers/partials.controller"),
    ...require("./controllers/pages.controller"),
    ...require("./controllers/cms.controller"),
    ...require("./services/builder.service"),
    ...require("./services/layouts.service"),
    ...require("./services/partials.service"),
    ...require("./services/pages.service"),
    ...require("./services/cms.service"),
    ...require("./repositories/builder.repository"),
    ...require("./repositories/layouts.repository"),
    ...require("./repositories/partials.repository"),
    ...require("./repositories/pages.repository"),
    ...require("./repositories/cms.repository")
};
