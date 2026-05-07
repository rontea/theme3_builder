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
            type: String(field?.type || "text").trim().toLowerCase(),
            required: Boolean(field?.required),
            options: Array.isArray(field?.options)
                ? field.options.map((item) => String(item || "").trim()).filter(Boolean)
                : [],
            helpText: String(field?.helpText || field?.help || "").trim()
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

function normalizeCmsFormField(field = {}) {
    const type = String(field.type || "text").trim().toLowerCase();
    return {
        id: sanitizeCmsSlug(field.id || field.name || field.label || "field"),
        label: String(field.label || field.name || "Field").trim(),
        name: sanitizeCmsSlug(field.name || field.id || field.label || "field"),
        type: ["text", "email", "textarea", "number", "checkbox", "select", "date", "url", "tel"].includes(type) ? type : "text",
        required: Boolean(field.required),
        placeholder: String(field.placeholder || "").trim(),
        validation: String(field.validation || "").trim(),
        options: Array.isArray(field.options)
            ? field.options.map((item) => String(item || "").trim()).filter(Boolean)
            : []
    };
}

function normalizeCmsFormDefinition(definition) {
    const input = definition && typeof definition === "object" && !Array.isArray(definition) ? definition : {};
    const fields = Array.isArray(input.fields) ? input.fields : [];
    return {
        fields: fields.map(normalizeCmsFormField).filter((field) => field.name),
        settings: {
            successMessage: String(input.settings?.successMessage || "Thank you. Your submission has been received.").trim(),
            storeSubmissions: input.settings?.storeSubmissions !== false,
            notificationEmail: String(input.settings?.notificationEmail || "").trim(),
            submitButtonLabel: String(input.settings?.submitButtonLabel || "Submit").trim()
        }
    };
}

function normalizeCmsViewQuery(query) {
    const input = query && typeof query === "object" && !Array.isArray(query) ? query : {};
    const status = String(input.status || "published").trim().toLowerCase();
    const filters = input.filters && typeof input.filters === "object" && !Array.isArray(input.filters)
        ? input.filters
        : {};
    const sortInput = Array.isArray(input.sort) ? input.sort : (input.sort ? [input.sort] : []);
    const limit = Number.isFinite(Number(input.limit)) ? Math.max(0, Math.floor(Number(input.limit))) : 10;
    const offset = Number.isFinite(Number(input.offset)) ? Math.max(0, Math.floor(Number(input.offset))) : 0;

    return {
        status: ["draft", "published", "archived", "any"].includes(status) ? status : "published",
        filters,
        sort: sortInput.map((item) => {
            if (typeof item === "string") {
                const [field, direction = "asc"] = item.split(":");
                return {
                    field: sanitizeCmsSlug(field || ""),
                    direction: String(direction || "asc").toLowerCase() === "desc" ? "desc" : "asc"
                };
            }
            return {
                field: sanitizeCmsSlug(item?.field || ""),
                direction: String(item?.direction || "asc").toLowerCase() === "desc" ? "desc" : "asc"
            };
        }).filter((item) => item.field),
        limit,
        offset,
        pager: Boolean(input.pager || input.pagination)
    };
}

function normalizeCmsViewDisplay(display = {}, index = 0) {
    const type = String(display.type || "block").trim().toLowerCase();
    const displayId = sanitizeCmsSlug(display.displayId || display.id || display.label || `${type}-${index + 1}`, `display-${index + 1}`);
    return {
        displayId,
        label: String(display.label || display.name || displayId).trim() || displayId,
        type: ["block", "page"].includes(type) ? type : "block",
        route: String(display.route || display.routePattern || "").trim(),
        layoutId: String(display.layoutId || display.layout_id || "").trim(),
        rowComponent: String(display.rowComponent || display.componentPath || "").trim(),
        emptyComponent: String(display.emptyComponent || "").trim(),
        settings: display.settings && typeof display.settings === "object" && !Array.isArray(display.settings)
            ? display.settings
            : {}
    };
}

function normalizeCmsViewRecord(input = {}) {
    const viewId = sanitizeCmsSlug(input.viewId || input.id || input.label || "view", "view");
    const displays = Array.isArray(input.displays)
        ? input.displays.map(normalizeCmsViewDisplay)
        : Object.entries(input.displays || {}).map(([displayId, display], index) => normalizeCmsViewDisplay({
            ...(display && typeof display === "object" ? display : {}),
            displayId
        }, index));

    return {
        viewId,
        label: String(input.label || input.name || viewId).trim() || viewId,
        description: String(input.description || "").trim(),
        collection: sanitizeCmsSlug(input.collection || input.collectionSlug || input.contentType || "", ""),
        query: normalizeCmsViewQuery(input.query),
        displays,
        createdAt: input.createdAt || null,
        updatedAt: input.updatedAt || null
    };
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
    normalizeCmsFormDefinition,
    normalizeCmsViewRecord,
    normalizeCmsViewQuery,
    parseJsonRecord
};
