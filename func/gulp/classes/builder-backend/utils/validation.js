"use strict";

function validateLayoutData(layoutData, options = {}) {
    const maxLayoutItems = Number(options.maxLayoutItems || 200);
    const maxLayoutTextLength = Number(options.maxLayoutTextLength || 200);

    if (!layoutData || typeof layoutData !== "object" || Array.isArray(layoutData)) {
        const err = new Error("layoutData must be an object");
        err.statusCode = 400;
        throw err;
    }

    const regionItems = layoutData.regions && typeof layoutData.regions === "object" && !Array.isArray(layoutData.regions)
        ? Object.values(layoutData.regions).flatMap((items) => Array.isArray(items) ? items : [])
        : null;
    if (!Array.isArray(layoutData.layout) && !regionItems) {
        const err = new Error("layoutData.layout must be an array");
        err.statusCode = 400;
        throw err;
    }

    const itemsToValidate = Array.isArray(layoutData.layout) ? layoutData.layout : regionItems;
    if (itemsToValidate.length > maxLayoutItems) {
        const err = new Error(`layoutData.layout exceeds limit of ${maxLayoutItems} items`);
        err.statusCode = 413;
        throw err;
    }

    if (typeof layoutData.pageTitle === "string" && layoutData.pageTitle.length > maxLayoutTextLength) {
        const err = new Error(`pageTitle exceeds ${maxLayoutTextLength} characters`);
        err.statusCode = 400;
        throw err;
    }

    itemsToValidate.forEach((item, index) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
            const err = new Error(`layoutData.layout[${index}] must be an object`);
            err.statusCode = 400;
            throw err;
        }

        const stringFields = ["id", "type", "name"];
        stringFields.forEach((field) => {
            if (typeof item[field] !== "string" || item[field].trim() === "") {
                const err = new Error(`layoutData.layout[${index}].${field} must be a non-empty string`);
                err.statusCode = 400;
                throw err;
            }
            if (item[field].length > maxLayoutTextLength) {
                const err = new Error(`layoutData.layout[${index}].${field} exceeds ${maxLayoutTextLength} characters`);
                err.statusCode = 400;
                throw err;
            }
        });

        if (item.type === "view") {
            ["viewId", "displayId", "region"].forEach((field) => {
                if (typeof item[field] !== "string" || item[field].trim() === "") {
                    const err = new Error(`layoutData.layout[${index}].${field} must be a non-empty string`);
                    err.statusCode = 400;
                    throw err;
                }
                if (item[field].length > maxLayoutTextLength) {
                    const err = new Error(`layoutData.layout[${index}].${field} exceeds ${maxLayoutTextLength} characters`);
                    err.statusCode = 400;
                    throw err;
                }
            });
        } else {
            const sourcePath = item.partial || item.componentPath;
            if (typeof sourcePath !== "string" || sourcePath.trim() === "") {
                const err = new Error(`layoutData.layout[${index}].partial must be a non-empty string`);
                err.statusCode = 400;
                throw err;
            }
            if (sourcePath.length > maxLayoutTextLength) {
                const err = new Error(`layoutData.layout[${index}].partial exceeds ${maxLayoutTextLength} characters`);
                err.statusCode = 400;
                throw err;
            }
        }

        if (typeof item.order !== "number" || !Number.isFinite(item.order)) {
            const err = new Error(`layoutData.layout[${index}].order must be a number`);
            err.statusCode = 400;
            throw err;
        }
    });
}

module.exports = {
    validateLayoutData
};
