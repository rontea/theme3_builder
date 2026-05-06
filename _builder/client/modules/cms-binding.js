(function initCmsBindingModule(root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
        return;
    }
    root.BuilderCmsBinding = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function createCmsBindingModule() {
    "use strict";

    function toCamelCase(value) {
        return String(value || "").replace(/[-_]+([a-zA-Z0-9])/g, (_, char) => char.toUpperCase());
    }

    function toSnakeCase(value) {
        return String(value || "")
            .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
            .replace(/[-\s]+/g, "_")
            .toLowerCase();
    }

    function buildDataAliases(data = {}) {
        const aliases = {};
        if (!data || typeof data !== "object" || Array.isArray(data)) {
            return aliases;
        }

        Object.entries(data).forEach(([key, value]) => {
            aliases[key] = value;
            aliases[toCamelCase(key)] = value;
            aliases[toSnakeCase(key)] = value;
        });
        return aliases;
    }

    function getValueByKey(source, key) {
        if (!source || typeof source !== "object" || !key) {
            return undefined;
        }

        const candidates = [key, toCamelCase(key), toSnakeCase(key)];
        for (const candidate of candidates) {
            if (Object.prototype.hasOwnProperty.call(source, candidate)) {
                return source[candidate];
            }
        }
        return undefined;
    }

    function getEntryComparableValue(entry, key) {
        if (!entry || !key) {
            return undefined;
        }
        if (key === "status") {
            return entry.status;
        }
        if (key === "entryKey" || key === "entry_key") {
            return entry.entryKey;
        }
        if (key === "sortOrder" || key === "sort_order") {
            return entry.sortOrder;
        }
        return getValueByKey(buildDataAliases(entry.data || {}), key);
    }

    function normalizeMappedRecord(data = {}, meta = {}) {
        const aliases = buildDataAliases(data);
        if (meta && typeof meta === "object" && !Array.isArray(meta)) {
            Object.entries(meta).forEach(([key, value]) => {
                aliases[key] = value;
                aliases[toCamelCase(key)] = value;
                aliases[toSnakeCase(key)] = value;
            });
        }
        return aliases;
    }

    function mapEntryData(entry, binding, index = 0) {
        const fieldMap = binding?.fieldMap && typeof binding.fieldMap === "object" ? binding.fieldMap : {};
        const source = buildDataAliases(entry?.data || {});
        const mapped = {};

        if (Object.keys(fieldMap).length === 0) {
            Object.assign(mapped, source);
        } else {
            Object.entries(fieldMap).forEach(([targetKey, sourceKey]) => {
                const value = getValueByKey(source, sourceKey);
                if (value !== undefined) {
                    mapped[targetKey] = value;
                }
            });
        }

        if (mapped.title === undefined && mapped.heading === undefined && mapped.name !== undefined) {
            mapped.title = mapped.name;
        }
        if (mapped.linkHref === undefined) {
            const hrefValue = mapped.href ?? mapped.url ?? mapped.detailUrl ?? mapped.detail_url ?? mapped.buttonUrl ?? mapped.button_url;
            if (hrefValue !== undefined) {
                mapped.linkHref = hrefValue;
            }
        }
        if (mapped.imageSrc === undefined) {
            const imageValue = mapped.src ?? mapped.image ?? mapped.image_src;
            if (imageValue !== undefined) {
                mapped.imageSrc = imageValue;
            }
        }
        if (mapped.imageAlt === undefined) {
            const altValue = mapped.alt ?? mapped.image_alt;
            if (altValue !== undefined) {
                mapped.imageAlt = altValue;
            }
        }
        if (mapped.title === undefined) {
            const titleValue = mapped.heading ?? mapped.headline;
            if (titleValue !== undefined) {
                mapped.title = titleValue;
            }
        }
        if (mapped.text === undefined) {
            const textValue = mapped.body ?? mapped.summary ?? mapped.description;
            if (textValue !== undefined) {
                mapped.text = textValue;
            }
        }
        if (mapped.linkText === undefined) {
            const labelValue = mapped.buttonLabel ?? mapped.button_label ?? mapped.label;
            if (labelValue !== undefined) {
                mapped.linkText = labelValue;
            }
        }

        return normalizeMappedRecord(mapped, {
            index: String(index + 1).padStart(2, "0"),
            sortOrder: entry?.sortOrder ?? index,
            status: entry?.status || "",
            entryKey: entry?.entryKey || ""
        });
    }

    function resolveBindingEntries(binding, entries) {
        if (!binding || binding.source !== "cms" || !binding.collection) {
            return null;
        }
        if (!Array.isArray(entries) || entries.length === 0) {
            return null;
        }

        const filter = binding?.selection?.filter && typeof binding.selection.filter === "object"
            ? binding.selection.filter
            : {};
        const filtered = entries.filter((entry) => {
            return Object.entries(filter).every(([key, expected]) => {
                const actual = getEntryComparableValue(entry, key);
                return actual === expected;
            });
        });

        const sortSpec = String(binding?.selection?.sort || "sort_order:asc").trim();
        const [rawSortKey, rawSortDir] = sortSpec.split(":");
        const sortKey = rawSortKey || "sort_order";
        const sortDir = String(rawSortDir || "asc").toLowerCase() === "desc" ? "desc" : "asc";
        filtered.sort((a, b) => {
            const left = getEntryComparableValue(a, sortKey);
            const right = getEntryComparableValue(b, sortKey);
            if (left === right) return Number(a?.id || 0) - Number(b?.id || 0);
            if (left === undefined || left === null) return sortDir === "asc" ? 1 : -1;
            if (right === undefined || right === null) return sortDir === "asc" ? -1 : 1;
            if (typeof left === "number" && typeof right === "number") {
                return sortDir === "asc" ? left - right : right - left;
            }
            const cmp = String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: "base" });
            return sortDir === "asc" ? cmp : -cmp;
        });

        const limitValue = Number(binding?.selection?.limit);
        const limited = Number.isFinite(limitValue) && limitValue > 0
            ? filtered.slice(0, limitValue)
            : filtered;
        const mode = binding.mode === "collection" ? "collection" : "record";
        const groups = Array.isArray(binding?.selection?.groups) ? binding.selection.groups : [];
        const mapped = limited.map((entry, index) => mapEntryData(entry, binding, index));
        const mappedGroups = groups.map((group) => {
            const groupFilter = group?.filter && typeof group.filter === "object" ? group.filter : {};
            const groupEntries = filtered
                .filter((entry) => Object.entries(groupFilter).every(([key, expected]) => getEntryComparableValue(entry, key) === expected))
                .map((entry, index) => mapEntryData(entry, binding, index));
            return {
                ...group,
                items: groupEntries
            };
        });

        if (mapped.length === 0 && mappedGroups.every((group) => !Array.isArray(group.items) || group.items.length === 0)) {
            return null;
        }

        return {
            mode,
            items: mapped,
            record: mapped[0],
            groups: mappedGroups
        };
    }

    return {
        toCamelCase,
        toSnakeCase,
        buildDataAliases,
        getValueByKey,
        getEntryComparableValue,
        normalizeMappedRecord,
        mapEntryData,
        resolveBindingEntries
    };
});
