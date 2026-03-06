"use strict";

function validateLayoutData(layoutData, options = {}) {
    const maxLayoutItems = Number(options.maxLayoutItems || 200);
    const maxLayoutTextLength = Number(options.maxLayoutTextLength || 200);

    if (!layoutData || typeof layoutData !== "object" || Array.isArray(layoutData)) {
        const err = new Error("layoutData must be an object");
        err.statusCode = 400;
        throw err;
    }

    if (!Array.isArray(layoutData.layout)) {
        const err = new Error("layoutData.layout must be an array");
        err.statusCode = 400;
        throw err;
    }

    if (layoutData.layout.length > maxLayoutItems) {
        const err = new Error(`layoutData.layout exceeds limit of ${maxLayoutItems} items`);
        err.statusCode = 413;
        throw err;
    }

    if (typeof layoutData.pageTitle === "string" && layoutData.pageTitle.length > maxLayoutTextLength) {
        const err = new Error(`pageTitle exceeds ${maxLayoutTextLength} characters`);
        err.statusCode = 400;
        throw err;
    }

    layoutData.layout.forEach((item, index) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) {
            const err = new Error(`layoutData.layout[${index}] must be an object`);
            err.statusCode = 400;
            throw err;
        }

        const stringFields = ["id", "type", "partial", "name"];
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
