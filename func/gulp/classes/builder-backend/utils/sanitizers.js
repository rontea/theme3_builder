"use strict";

function sanitizeName(value, fallback = "") {
    return String(value || "")
        .trim()
        .replace(/[^a-zA-Z0-9-_ ]/g, "")
        .replace(/\s+/g, " ")
        .slice(0, 80) || fallback;
}

function sanitizePageName(value, fallback = "page") {
    return String(value || "")
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 80) || fallback;
}

module.exports = {
    sanitizeName,
    sanitizePageName
};
