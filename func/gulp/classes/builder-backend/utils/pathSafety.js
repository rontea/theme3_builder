"use strict";

const path = require("path");

function resolveSafePath(basePath, userPath) {
    if (typeof userPath !== "string" || userPath.trim() === "") {
        const err = new Error("Invalid path parameter");
        err.statusCode = 400;
        throw err;
    }

    const normalized = userPath.replace(/\\/g, "/");
    const resolved = path.resolve(basePath, normalized);
    const relative = path.relative(basePath, resolved);

    if (relative.startsWith("..") || path.isAbsolute(relative)) {
        const err = new Error("Path traversal is not allowed");
        err.statusCode = 400;
        throw err;
    }

    return resolved;
}

function isPathInside(basePath, targetPath) {
    const resolvedBase = path.resolve(basePath);
    const resolvedTarget = path.resolve(targetPath);
    const relative = path.relative(resolvedBase, resolvedTarget);
    return !(relative.startsWith("..") || path.isAbsolute(relative));
}

module.exports = {
    resolveSafePath,
    isPathInside
};
