"use strict";

const path = require("path");
const { buildPartialPreview, formatCategory } = require("../utils/formatting");
const { resolveSafePath } = require("../utils/pathSafety");
const logErr = require("../../../../utils/TimeLogger");

function createPartialsService(builderTask, partialsRepository) {
    const normalizePath = (value) => String(value || "").replace(/\\/g, "/");

    const resolveMicroCategory = (name, folder) => {
        const key = String(name || "").toLowerCase();
        if (["heading", "text-block", "paragraph"].includes(key)) return "Text";
        if (["link", "button"].includes(key)) return "Actions";
        if (["textbox", "textarea", "select", "checkbox", "radio"].includes(key)) return "Forms";
        if (["image"].includes(key)) return "Media";
        if ([
            "spacer",
            "divider",
            "grid-2col",
            "grid-3col",
            "flex-split",
            "stack",
            "media-text",
            "hero-split",
            "free-layout"
        ].includes(key)) return "Layout";
        return formatCategory(folder);
    };

    return {
        async scanPartials() {
            try {
                const pattern = path.join(builderTask.partialsPath, "**/*.html").replace(/\\/g, "/");
                const files = await partialsRepository.findFiles(pattern);

                const items = await Promise.all(files.map(async (file) => {
                    const relativePath = path.relative(builderTask.partialsPath, file);
                    const normalizedPath = normalizePath(relativePath);
                    if (normalizedPath.startsWith("micro/")) {
                        return null;
                    }
                    const folder = path.dirname(relativePath);
                    const name = path.basename(file, ".html");
                    const componentKey = relativePath.replace(/\\/g, "/").replace(/\.html$/i, "");
                    const content = await partialsRepository.readFile(file, "utf8");
                    const preview = buildPartialPreview(content);
                    const category = formatCategory(folder);

                    return {
                        id: componentKey,
                        componentKey,
                        name: name,
                        path: relativePath,
                        fullPath: file,
                        folder: folder === "." ? "root" : folder,
                        category,
                        type: "partial",
                        preview
                    };
                }));

                return items.filter(Boolean);
            } catch (err) {
                logErr.writeLog(err, {
                    customKey: "BUILDER_SCAN_PARTIALS_ERROR",
                    context: { partialsPath: builderTask.partialsPath }
                });
                throw err;
            }
        },
        async scanMicroComponents() {
            try {
                const microRoot = path.join(builderTask.partialsPath, "micro");
                const pattern = path.join(microRoot, "**/*.html").replace(/\\/g, "/");
                const files = await partialsRepository.findFiles(pattern);

                const nameOverrides = new Map([
                    ["grid-2col", "Grid 2-Column"],
                    ["grid-3col", "Grid 3-Column"],
                    ["flex-split", "Flex Split"],
                    ["stack", "Stack"],
                    ["media-text", "Media + Text"],
                    ["hero-split", "Hero Split"],
                    ["free-layout", "Free Layout"]
                ]);

                const items = await Promise.all(files.map(async (file) => {
                    const relativePath = path.relative(microRoot, file);
                    const normalized = normalizePath(relativePath);
                    const folder = path.dirname(normalized);
                    const baseName = path.basename(normalized, ".html");
                    const componentKey = normalized.replace(/\.html$/i, "");
                    const content = await partialsRepository.readFile(file, "utf8");
                    const preview = buildPartialPreview(content);
                    const category = resolveMicroCategory(baseName, folder);
                    const displayName = nameOverrides.get(baseName) || formatCategory(baseName);
                    const partialPath = normalizePath(path.join("micro", normalized));

                    return {
                        id: componentKey,
                        componentKey,
                        name: displayName,
                        path: partialPath,
                        fullPath: file,
                        folder: folder === "." ? "root" : folder,
                        category,
                        type: "micro",
                        preview,
                        template: content
                    };
                }));

                return items;
            } catch (err) {
                logErr.writeLog(err, {
                    customKey: "BUILDER_SCAN_MICRO_ERROR",
                    context: { partialsPath: builderTask.partialsPath }
                });
                throw err;
            }
        },
        async getPartialContent(filePath) {
            try {
                const fullPath = resolveSafePath(builderTask.partialsPath, filePath);
                const exists = await partialsRepository.exists(fullPath);
                if (!exists) {
                    throw builderTask.createActionableError(
                        `Partial not found: ${filePath}`,
                        404,
                        "PARTIAL_NOT_FOUND",
                        { filePath }
                    );
                }
                return partialsRepository.readFile(fullPath, "utf-8");
            } catch (err) {
                logErr.writeLog(err, {
                    customKey: "BUILDER_GET_PARTIAL_CONTENT_ERROR",
                    context: { filePath }
                });
                throw err;
            }
        },
        async savePartialContent(filePath, content = "", options = {}) {
            try {
                const normalized = String(filePath || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
                if (!normalized) {
                    throw builderTask.createActionableError(
                        "Partial path is required",
                        400,
                        "PARTIAL_PATH_REQUIRED",
                        { filePath }
                    );
                }

                const safePath = normalized.endsWith(".html") ? normalized : `${normalized}.html`;
                const fullPath = resolveSafePath(builderTask.partialsPath, safePath);
                const exists = await partialsRepository.exists(fullPath);

                if (exists && !options.overwrite) {
                    throw builderTask.createActionableError(
                        `Partial already exists: ${safePath}`,
                        409,
                        "PARTIAL_EXISTS",
                        { filePath: safePath }
                    );
                }

                await partialsRepository.ensureDir(path.dirname(fullPath));
                await partialsRepository.writeFile(fullPath, String(content), "utf8");

                return {
                    path: safePath
                };
            } catch (err) {
                logErr.writeLog(err, {
                    customKey: "BUILDER_SAVE_PARTIAL_ERROR",
                    context: { filePath }
                });
                throw err;
            }
        },
        async getPreviewStyles() {
            const candidates = [
                path.resolve(builderTask.projectRoot, "build", "css", "styles.css"),
                path.resolve(builderTask.projectRoot, "html", "css", "styles.css"),
                path.resolve(builderTask.projectRoot, "_builder", "client", "styles.css")
            ];

            for (const filePath of candidates) {
                try {
                    const exists = await partialsRepository.exists(filePath);
                    if (exists) {
                        const css = await partialsRepository.readFile(filePath, "utf8");
                        return { css, sourcePath: filePath };
                    }
                } catch (err) {
                    // Ignore and continue to next candidate.
                }
            }

            return null;
        },
        async buildPartialLookup() {
            const items = await this.scanPartials();
            const lookup = new Map();
            for (const item of items) {
                const rel = String(item.path || "").replace(/\\/g, "/");
                const noExt = rel.replace(/\.html$/i, "");
                const base = path.basename(noExt);
                const keys = [rel, noExt, base, `${base}.html`];
                keys.forEach((key) => {
                    if (!lookup.has(key)) {
                        lookup.set(key, rel);
                    }
                });
            }
            return lookup;
        },
        extractPartialTokensFromPage(content) {
            const tokens = [];
            if (!content || typeof content !== "string") {
                return tokens;
            }

            const seen = new Set();
            const combinedRegex = /<!--\s*partial:\s*([^>]+?)\s*-->|{{>\s*([a-zA-Z0-9_./-]+)\s*}}/g;
            let match = null;
            while ((match = combinedRegex.exec(content)) !== null) {
                const token = String(match[1] || match[2] || "").trim();
                if (token && !seen.has(token)) {
                    seen.add(token);
                    tokens.push(token);
                }
            }

            return tokens;
        },
        resolvePartialTokenToPath(token, lookup) {
            const normalized = String(token || "").trim().replace(/\\/g, "/");
            if (!normalized) return null;

            const candidates = [
                normalized,
                normalized.replace(/\.html$/i, ""),
                normalized.replace(/\.html$/i, "") + ".html",
                path.basename(normalized),
                path.basename(normalized, ".html"),
                path.basename(normalized, ".html") + ".html"
            ];

            for (const candidate of candidates) {
                if (lookup.has(candidate)) {
                    return lookup.get(candidate);
                }
            }
            return null;
        },
        async getPagePartials(pageName, partialLookup = null) {
            const safePageName = builderTask.sanitizePageName(pageName);
            if (!safePageName) {
                return [];
            }
            const pagePath = path.join(builderTask.pagesOutputPath, `${safePageName}.html`);
            const exists = await partialsRepository.exists(pagePath);
            if (!exists) {
                return [];
            }

            const content = await partialsRepository.readFile(pagePath, "utf8");
            const tokens = this.extractPartialTokensFromPage(content);
            const lookup = partialLookup || await this.buildPartialLookup();
            const resolved = [];
            for (const token of tokens) {
                const relPath = this.resolvePartialTokenToPath(token, lookup);
                if (relPath) {
                    resolved.push(relPath);
                }
            }
            return [...new Set(resolved)];
        },
        repository: partialsRepository
    };
}

module.exports = {
    createPartialsService
};
