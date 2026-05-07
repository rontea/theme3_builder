"use strict";

const path = require("path");
const fs = require("fs-extra");

const REGION_ORDER = ["header", "hero", "side-navigation", "content-above", "main", "content-below", "footer"];
const REGION_ALIASES = {
    main_content: "main",
    content_main: "main",
    body: "main",
    page_body: "main",
    side_nav: "side-navigation",
    side_navigation: "side-navigation",
    sidenav: "side-navigation",
    sidebar: "side-navigation",
    side: "side-navigation",
    content_above: "content-above",
    contentabove: "content-above",
    above_content: "content-above",
    content_below: "content-below",
    contentbelow: "content-below",
    below_content: "content-below"
};

function normalizeRegionId(value, fallback = "main") {
    const raw = String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    const firstToken = raw.includes("_") ? raw.split("_")[0] : raw;
    const normalized = REGION_ALIASES[raw] || REGION_ALIASES[firstToken] || raw;
    if (REGION_ORDER.includes(normalized)) {
        return normalized;
    }
    const fallbackRaw = String(fallback || "main")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
    return REGION_ALIASES[fallbackRaw] || (REGION_ORDER.includes(fallbackRaw) ? fallbackRaw : "main");
}

function flattenLayoutItems(layoutData = {}) {
    if (layoutData.regions && typeof layoutData.regions === "object" && !Array.isArray(layoutData.regions)) {
        const normalizedRegions = Object.entries(layoutData.regions).reduce((acc, [regionId, items]) => {
            const normalized = normalizeRegionId(regionId);
            acc[normalized] = [
                ...(acc[normalized] || []),
                ...(Array.isArray(items) ? items : [])
            ];
            return acc;
        }, {});
        const known = REGION_ORDER.flatMap((regionId) => {
            const items = Array.isArray(normalizedRegions[regionId]) ? normalizedRegions[regionId] : [];
            return items.map((item, index) => ({ ...item, region: normalizeRegionId(item.region || regionId), order: item.order || index + 1 }));
        });
        const extra = Object.keys(normalizedRegions)
            .filter((regionId) => !REGION_ORDER.includes(regionId))
            .flatMap((regionId) => {
                const items = Array.isArray(normalizedRegions[regionId]) ? normalizedRegions[regionId] : [];
                return items.map((item, index) => ({ ...item, region: normalizeRegionId(item.region || regionId), order: item.order || index + 1 }));
            });
        return [...known, ...extra].filter((item) => item.visible !== false && item.visibility !== "hidden");
    }
    return Array.isArray(layoutData.layout) ? layoutData.layout.filter((item) => item.visible !== false && item.visibility !== "hidden") : [];
}

function groupLayoutItemsByRegion(layoutItems = []) {
    return layoutItems.reduce((acc, item) => {
        const regionId = normalizeRegionId(item.region || "main");
        acc[regionId] = acc[regionId] || [];
        acc[regionId].push(item);
        return acc;
    }, {});
}

function sortRegionIds(regionIds = []) {
    const order = new Map(REGION_ORDER.map((regionId, index) => [regionId, index]));
    return Array.from(new Set(regionIds.map((regionId) => normalizeRegionId(regionId))))
        .sort((left, right) => {
            const leftRank = order.has(left) ? order.get(left) : REGION_ORDER.length;
            const rightRank = order.has(right) ? order.get(right) : REGION_ORDER.length;
            if (leftRank !== rightRank) return leftRank - rightRank;
            return String(left).localeCompare(String(right));
        });
}

function renderPageVariables(template = "", layoutData = {}, pageName = "page") {
    const pageTitle = layoutData.pageTitle || layoutData.title || pageName;
    const replacements = new Map([
        ["page.lang", "en"],
        ["page.title", pageTitle],
        ["page.bodyClass", `page-${pageName}`],
        ["assets.styles", ""],
        ["assets.scripts", ""]
    ]);
    return String(template).replace(/{{{?\s*([a-zA-Z0-9_.-]+)\s*}?}}/g, (match, key) => {
        if (!replacements.has(key)) {
            return match;
        }
        return replacements.get(key);
    });
}

function createLayoutsService(builderTask, layoutsRepository) {
    return {
        saveLayout(layoutData, options) {
            return builderTask.saveLayout(layoutData, options);
        },
        listSavedLayouts() {
            return builderTask.listSavedLayouts();
        },
        getSavedLayout(fileName) {
            return builderTask.getSavedLayout(fileName);
        },
        deleteSavedLayout(fileName) {
            return builderTask.deleteSavedLayout(fileName);
        },
        async createPageFromLayout(layoutData, pageName) {
            await fs.ensureDir(builderTask.pagesOutputPath);

            const isFreeform = layoutData?.meta?.canvasLayoutMode === "freeform";
            const layoutItems = flattenLayoutItems(layoutData);
            const renderLayoutItem = async (item, index) => {
                const sourcePath = item.componentPath || item.partial;
                try {
                    builderTask.validateComponentPath(item, index);
                } catch (err) {
                    throw builderTask.createActionableError(
                        err.message,
                        err.statusCode || 400,
                        err.code || "COMPONENT_VALIDATION_ERROR",
                        {
                            ...(err.details || {}),
                            index,
                            componentPath: sourcePath
                        }
                    );
                }

                const cmsRenderedMarkup = await builderTask.renderCmsBoundComponent(item);
                const renderedMarkup = typeof cmsRenderedMarkup === "string" && cmsRenderedMarkup.trim().length > 0
                    ? cmsRenderedMarkup
                    : (typeof item?.renderedContent === "string" && item.renderedContent.trim().length > 0
                        ? item.renderedContent
                        : `{{> ${path.basename(sourcePath, ".html")}}}`);
                const trackedMarkup = sourcePath
                    ? `<!-- partial: ${sourcePath} -->\n${renderedMarkup}`
                    : renderedMarkup;
                if (isFreeform) {
                    const x = Math.max(0, Number(item?.canvas?.x) || 0);
                    const y = Math.max(0, Number(item?.canvas?.y) || 0);
                    const width = Math.max(220, Number(item?.canvas?.width) || 320);
                    return `<div class="builder-freeform-node" style="position:absolute; left:${x}px; top:${y}px; width:${width}px; max-width:calc(100% - ${x}px);}">${trackedMarkup}</div>`;
                }
                return trackedMarkup;
            };

            const renderItems = async (items = []) => {
                const sections = [];
                for (let index = 0; index < items.length; index++) {
                    sections.push(await renderLayoutItem(items[index], index));
                }
                return sections.join("\n");
            };

            const renderPartialIncludes = async (content = "") => {
                const includeRegex = /{{>\s*([a-zA-Z0-9_./-]+)\s*}}/g;
                const matches = Array.from(String(content).matchAll(includeRegex));
                let rendered = String(content);
                for (const match of matches) {
                    const token = match[1];
                    if (token.startsWith("regions/")) {
                        continue;
                    }
                    const candidates = [token, `${token}.html`];
                    let partialMarkup = "";
                    for (const candidate of candidates) {
                        const fullPath = builderTask.resolveComponentSourcePathSync(candidate);
                        if (fullPath) {
                            partialMarkup = await fs.readFile(fullPath, "utf8");
                            break;
                        }
                    }
                    rendered = rendered.replace(match[0], partialMarkup);
                }
                return rendered;
            };

            const readThemeTemplate = async (relativePath) => {
                const fullPath = path.join(builderTask.activeThemePath || "", relativePath);
                if (builderTask.activeThemePath && builderTask.isPathInside(builderTask.activeThemePath, fullPath) && await fs.pathExists(fullPath)) {
                    return fs.readFile(fullPath, "utf8");
                }
                return null;
            };

            const groupedItems = groupLayoutItemsByRegion(layoutItems);
            const layoutRegionIds = Object.keys(groupedItems);
            const manifestPath = path.join(builderTask.activeThemePath || "", "theme.json");
            const manifest = await fs.pathExists(manifestPath)
                ? await fs.readJson(manifestPath).catch(() => null)
                : null;
            const manifestRegionIds = Array.isArray(manifest?.regions) ? manifest.regions : [];
            const regionIds = sortRegionIds([...manifestRegionIds, ...layoutRegionIds]);
            const pageTemplate = await readThemeTemplate("templates/page.html");

            if (pageTemplate) {
                const renderedRegions = {};
                for (const regionId of regionIds) {
                    const items = groupedItems[regionId] || [];
                    const blockMarkup = await renderItems(items);
                    const regionTemplate = await readThemeTemplate(`templates/regions/${regionId}.html`);
                    const regionShell = regionTemplate || `<section data-theme-region="${regionId}">\n{{{ region "${regionId}" }}}\n</section>`;
                    let regionMarkup = regionShell.replace(/{{{\s*region\s+["'][a-zA-Z0-9_-]+["']\s*}}}/g, blockMarkup);
                    if (blockMarkup.trim()) {
                        regionMarkup = regionMarkup.replace(/^\s*{{>\s*(?!regions\/)[a-zA-Z0-9_./-]+\s*}}\s*$/gm, "");
                    } else {
                        regionMarkup = await renderPartialIncludes(regionMarkup);
                    }
                    renderedRegions[regionId] = regionMarkup;
                }

                let html = pageTemplate.replace(/{{>\s*regions\/([a-zA-Z0-9_-]+)\s*}}/g, (_match, regionId) => {
                    return renderedRegions[normalizeRegionId(regionId)] || "";
                });
                const extraRegions = regionIds
                    .filter((regionId) => !new RegExp(`{{>\\s*regions/${regionId}\\s*}}`).test(pageTemplate))
                    .map((regionId) => renderedRegions[regionId])
                    .filter(Boolean);
                if (extraRegions.length) {
                    html += `\n${extraRegions.join("\n")}`;
                }
                html = await renderPartialIncludes(renderPageVariables(html, layoutData, pageName));
                if (isFreeform) {
                    html = html.replace(/(<main\b[^>]*>)/i, "$1\n<div class=\"builder-freeform-stage\" style=\"position:relative; min-height:960px;\">")
                        .replace(/(<\/main>)/i, "</div>\n$1");
                }
                const pageFilePath = path.join(builderTask.pagesOutputPath, `${pageName}.html`);
                await fs.writeFile(pageFilePath, html.endsWith("\n") ? html : `${html}\n`, "utf8");
                return pageFilePath;
            }

            const sections = [];
            for (let index = 0; index < layoutItems.length; index++) {
                sections.push(await renderLayoutItem(layoutItems[index], index));
            }
            const html = isFreeform
                ? `<div class="builder-freeform-stage" style="position:relative; min-height:960px;">\n${sections.join("\n")}\n</div>\n`
                : sections.join("\n") + "\n";
            const pageFilePath = path.join(builderTask.pagesOutputPath, `${pageName}.html`);
            await fs.writeFile(pageFilePath, html, "utf8");
            return pageFilePath;
        },
        repository: layoutsRepository
    };
}

module.exports = {
    createLayoutsService
};
