"use strict";

(function exposeApiClient(global) {
    class BuilderApiClient {
        constructor(baseUrl) {
            this.baseUrl = baseUrl || "";
        }

        buildUrl(path) {
            return `${this.baseUrl}${path}`;
        }

        async requestJson(path, options = {}) {
            const response = await fetch(this.buildUrl(path), options);
            const result = await response.json();
            if (!result || !result.success) {
                throw new Error((result && result.error) || `Request failed: ${path}`);
            }
            return result;
        }

        createProject(projectName) {
            return this.requestJson("/api/projects", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectName })
            });
        }

        createPage(projectName, pageName, pageTitle) {
            return this.requestJson("/api/pages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectName, pageName, pageTitle })
            });
        }

        listPages(projectName) {
            return this.requestJson(`/api/pages?projectName=${encodeURIComponent(projectName)}`);
        }

        syncPages(projectName) {
            return this.requestJson("/api/pages/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectName })
            });
        }

        getPagePartials(projectName, pageName) {
            return this.requestJson(
                `/api/pages/partials?projectName=${encodeURIComponent(projectName)}&pageName=${encodeURIComponent(pageName)}`
            );
        }

        setPagePartialsSyncState(projectName, pageName, partialsSynced) {
            return this.requestJson("/api/pages/partials/sync-state", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ projectName, pageName, partialsSynced: Boolean(partialsSynced) })
            });
        }

        listSavedLayouts() {
            return this.requestJson("/api/saved-layouts");
        }

        getSavedLayout(fileName) {
            return this.requestJson(`/api/saved-layout?fileName=${encodeURIComponent(fileName)}`);
        }

        listPartials() {
            return this.requestJson("/api/partials");
        }

        getPartial(pathName) {
            return this.requestJson(`/api/partial?path=${encodeURIComponent(pathName)}`);
        }
    }

    global.BuilderApiClient = BuilderApiClient;
})(window);

