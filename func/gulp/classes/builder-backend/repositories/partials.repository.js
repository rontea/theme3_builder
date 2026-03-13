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
        },
        ensureDir(dirPath) {
            return fs.ensureDir(dirPath);
        },
        writeFile(filePath, content, encoding = "utf8") {
            return fs.writeFile(filePath, content, encoding);
        }
    };
}

module.exports = {
    createPartialsRepository
};
