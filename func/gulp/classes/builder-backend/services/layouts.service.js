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
                sections.push(`{{> ${partialName}}}`);
            }

            const html = sections.join("\n") + "\n";
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
