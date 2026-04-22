"use strict";

function createActionableError(message, statusCode = 500, code = "CMS_ERROR", details = {}) {
    const err = new Error(message);
    err.statusCode = statusCode;
    err.code = code;
    err.details = details;
    return err;
}

function sanitizeCmsSlug(value, fallback = "") {
    const normalized = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/(^-+|-+$)/g, "");
    return normalized || fallback;
}

function sanitizeCmsEntryKey(value, fallback = "") {
    return sanitizeCmsSlug(value, fallback);
}

function normalizeCmsSchema(schema) {
    if (!schema || typeof schema !== "object" || Array.isArray(schema)) {
        return { fields: [] };
    }

    const fields = Array.isArray(schema.fields) ? schema.fields : [];
    return {
        ...schema,
        fields: fields.map((field) => ({
            name: sanitizeCmsSlug(field?.name || ""),
            label: String(field?.label || field?.name || "").trim(),
            type: String(field?.type || "text").trim().toLowerCase()
        })).filter((field) => field.name)
    };
}

function normalizeCmsEntryData(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) {
        throw createActionableError(
            "CMS entry data must be an object",
            400,
            "CMS_ENTRY_DATA_INVALID",
            { dataType: typeof data }
        );
    }

    return data;
}

function parseJsonRecord(value, fallback) {
    try {
        return JSON.parse(String(value || ""));
    } catch (err) {
        return fallback;
    }
}

module.exports = {
    createActionableError,
    sanitizeCmsSlug,
    sanitizeCmsEntryKey,
    normalizeCmsSchema,
    normalizeCmsEntryData,
    parseJsonRecord
};
