"use strict";

const fs = require("fs-extra");
const { glob } = require("glob");

function createPartialsRepository() {
    return {
        findFiles(pattern) {
            return glob(pattern);
        },
        readFile(filePath, encoding = "utf8") {
            return fs.readFile(filePath, encoding);
        },
        exists(filePath) {
            return fs.pathExists(filePath);
        }
    };
}

module.exports = {
    createPartialsRepository
};
