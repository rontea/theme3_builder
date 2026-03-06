"use strict";

function buildPartialPreview(html) {
    if (typeof html !== "string") {
        return "";
    }

    // Remove scripts/styles and compact to human-readable sample text.
    const cleaned = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

    return cleaned.slice(0, 140);
}

function formatCategory(folder) {
    if (!folder || folder === "." || folder === "root") {
        return "General";
    }

    return folder
        .split(/[\\/]/)
        .map((part) => part.replace(/[-_.]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()))
        .join(" / ");
}

module.exports = {
    buildPartialPreview,
    formatCategory
};
