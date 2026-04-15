"use strict";

const path = require("path");
const fs = require("fs-extra");

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

            const sections = [];
            const isFreeform = layoutData?.meta?.canvasLayoutMode === "freeform";
            for (let index = 0; index < layoutData.layout.length; index++) {
                const item = layoutData.layout[index];
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

                const partialName = path.basename(sourcePath, ".html");
                if (isFreeform) {
                    const x = Math.max(0, Number(item?.canvas?.x) || 0);
                    const y = Math.max(0, Number(item?.canvas?.y) || 0);
                    const width = Math.max(220, Number(item?.canvas?.width) || 320);
                    sections.push(
                        `<div class="builder-freeform-node" style="position:absolute; left:${x}px; top:${y}px; width:${width}px; max-width:calc(100% - ${x}px);">{{> ${partialName}}}</div>`
                    );
                } else {
                    sections.push(`{{> ${partialName}}}`);
                }
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
