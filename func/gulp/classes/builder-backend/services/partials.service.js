"use strict";

const path = require("path");
const { buildPartialPreview, formatCategory } = require("../utils/formatting");
const { resolveSafePath, isPathInside } = require("../utils/pathSafety");
const logErr = require("../../../../utils/TimeLogger");

function createPartialsService(builderTask, partialsRepository) {
    const normalizePath = (value) => String(value || "").replace(/\\/g, "/");

    const resolveScanRoots = (kind = "partials") => {
        const roots = kind === "components"
            ? [
                { root: builderTask.activeThemeComponentsPath, source: "active-theme" },
                { root: path.join(builderTask.activeThemePartialsPath || "", "micro"), source: "active-theme-partials" },
                { root: path.join(builderTask.partialsPath, "micro"), source: "legacy-html" }
            ]
            : [
                { root: builderTask.activeThemePartialsPath, source: "active-theme" },
                { root: builderTask.partialsPath, source: "legacy-html" }
            ];
        const seen = new Set();
        return roots
            .filter((item) => item.root)
            .map((item) => ({ ...item, root: path.resolve(item.root) }))
            .filter((item) => {
                const key = item.root.toLowerCase();
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            });
    };

    const scanHtmlFiles = async (roots) => {
        const files = [];
        for (const item of roots) {
            if (!await partialsRepository.exists(item.root)) {
                continue;
            }
            const pattern = path.join(item.root, "**/*.html").replace(/\\/g, "/");
            const matches = await partialsRepository.findFiles(pattern);
            matches.forEach((file) => files.push({ ...item, file }));
        }
        return files;
    };

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
                const files = await scanHtmlFiles(resolveScanRoots("partials"));
                const seen = new Set();

                const items = await Promise.all(files.map(async ({ root, source, file }) => {
                    const relativePath = path.relative(root, file);
                    const normalizedPath = normalizePath(relativePath);
                    if (normalizedPath.startsWith("micro/")) {
                        return null;
                    }
                    if (seen.has(normalizedPath)) {
                        return null;
                    }
                    seen.add(normalizedPath);
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
                        source,
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
                    context: { activeThemePartialsPath: builderTask.activeThemePartialsPath, partialsPath: builderTask.partialsPath }
                });
                throw err;
            }
        },
        async scanMicroComponents() {
            try {
                const files = await scanHtmlFiles(resolveScanRoots("components"));
                const seen = new Set();

                const nameOverrides = new Map([
                    ["grid-2col", "Grid 2-Column"],
                    ["grid-3col", "Grid 3-Column"],
                    ["flex-split", "Flex Split"],
                    ["stack", "Stack"],
                    ["media-text", "Media + Text"],
                    ["hero-split", "Hero Split"],
                    ["free-layout", "Free Layout"]
                ]);

                const items = await Promise.all(files.map(async ({ root, source, file }) => {
                    const relativePath = path.relative(root, file);
                    const normalized = normalizePath(relativePath);
                    if (seen.has(normalized)) {
                        return null;
                    }
                    seen.add(normalized);
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
                        source,
                        folder: folder === "." ? "root" : folder,
                        category,
                        type: "micro",
                        preview,
                        template: content
                    };
                }));

                return items.filter(Boolean);
            } catch (err) {
                logErr.writeLog(err, {
                    customKey: "BUILDER_SCAN_MICRO_ERROR",
                    context: {
                        activeThemeComponentsPath: builderTask.activeThemeComponentsPath,
                        activeThemePartialsPath: builderTask.activeThemePartialsPath,
                        partialsPath: builderTask.partialsPath
                    }
                });
                throw err;
            }
        },
        async getPartialContent(filePath) {
            try {
                const normalized = String(filePath || "").trim().replace(/\\/g, "/").replace(/^\/+/, "");
                const candidates = [
                    { root: builderTask.activeThemePartialsPath, relativePath: normalized },
                    { root: builderTask.activeThemeComponentsPath, relativePath: normalized.replace(/^micro\//, "") },
                    { root: builderTask.partialsPath, relativePath: normalized }
                ];
                let fullPath = null;
                for (const candidate of candidates) {
                    if (!candidate.root) continue;
                    const candidatePath = resolveSafePath(candidate.root, candidate.relativePath);
                    if (isPathInside(candidate.root, candidatePath) && await partialsRepository.exists(candidatePath)) {
                        fullPath = candidatePath;
                        break;
                    }
                }
                if (!fullPath) {
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

                let preview = { rebuilt: false };
                try {
                    await builderTask.rebuildPreviewHtml();
                    preview = { rebuilt: true };
                } catch (previewErr) {
                    logErr.writeLog(previewErr, {
                        customKey: "BUILDER_PARTIAL_PREVIEW_REBUILD_ERROR",
                        context: { filePath: safePath }
                    });
                    preview = {
                        rebuilt: false,
                        error: previewErr.message
                    };
                }

                return {
                    path: safePath,
                    preview
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
