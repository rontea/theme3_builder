"use strict";

(function exposePagesDashboard(global) {
    const PagesDashboard = {
        async loadLandingProjects(ctx) {
            ctx.landingContentTitle.textContent = "Landmarks";
            ctx.closeProjectDashboard.style.display = "none";
            ctx.landingProjectsList.innerHTML = '<div class="text-sm text-slate-400">Loading pages...</div>';
            try {
                const result = await ctx.apiClient.listPages(ctx.siteProjectName);
                const items = Array.isArray(result.data) ? result.data : [];
                if (items.length === 0) {
                    ctx.landingProjectsList.innerHTML = '<div class="text-sm text-slate-400">No pages found. Click Create Page on the left.</div>';
                    return;
                }

                let html = "";
                items.forEach((item) => {
                    const itemName = item.pageName;
                    const partials = Array.isArray(item.partials) ? item.partials : [];
                    const partialPreview = partials.slice(0, 4);
                    const remainingCount = partials.length - partialPreview.length;
                    const isPartialsSynced = Boolean(item.partialsSynced);
                    const partialsHtml = partials.length > 0
                        ? `<div class="mt-3 flex flex-wrap gap-1.5">${partialPreview.map((p) => `<span class="inline-flex max-w-full truncate rounded-lg border border-slate-600/65 bg-slate-950/70 px-2.5 py-1 text-[10px] font-medium text-slate-300" title="${p}">${p}</span>`).join("")}${remainingCount > 0 ? `<span class="inline-flex rounded-lg border border-slate-600/65 bg-slate-950/70 px-2.5 py-1 text-[10px] font-medium text-slate-400">+${remainingCount}</span>` : ""}</div>`
                        : '<div class="mt-3 text-[10px] font-medium text-slate-500">No detected partials</div>';
                    html += `
                        <div class="group relative rounded-2xl border border-slate-700/65 bg-gradient-to-b from-slate-800/70 to-slate-900/80 p-4 shadow-[0_10px_35px_rgba(2,6,23,0.4)] transition duration-200 hover:-translate-y-0.5 hover:border-sky-400/40 hover:shadow-[0_14px_45px_rgba(2,6,23,0.55)]" data-project-name="${item.projectName || itemName}" data-page-name="${item.pageName || ""}" data-layout-file-name="${item.layoutFileName || ""}">
                            <button class="landing-project-delete absolute right-3 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-rose-500 text-white shadow-md opacity-95 transition hover:scale-110 hover:bg-rose-600" data-project-name="${item.projectName || itemName}" data-page-name="${item.pageName || ""}" data-layout-file-name="${item.layoutFileName || ""}" title="Delete page">
                                <i class="fas fa-trash-alt text-[10px]"></i>
                            </button>
                            <button class="landing-project-clone absolute right-12 top-3 z-10 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-sky-500 text-white shadow-md opacity-95 transition hover:scale-110 hover:bg-sky-600" data-project-name="${item.projectName || itemName}" data-page-name="${item.pageName || ""}" data-layout-file-name="${item.layoutFileName || ""}" title="Clone page">
                                <i class="fas fa-clone text-[10px]"></i>
                            </button>
                            <div class="flex items-start gap-4 min-w-0">
                                <div class="relative shrink-0">
                                    <button class="landing-project-open" data-project-name="${item.projectName || itemName}" data-page-name="${item.pageName || ""}" data-layout-file-name="${item.layoutFileName || ""}" title="Open page">
                                        <span class="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-600/80 bg-slate-950/85 shadow-inner shadow-black/30 transition group-hover:border-orange-400/70">
                                            <i class="fab fa-html5 text-3xl text-orange-500 drop-shadow-[0_2px_6px_rgba(251,146,60,0.4)]"></i>
                                        </span>
                                    </button>
                                </div>
                                <div class="min-w-0 flex-1">
                                    <button class="landing-project-open block w-full truncate text-left text-base font-semibold tracking-tight text-slate-100 transition hover:text-white" data-project-name="${item.projectName || itemName}" data-page-name="${item.pageName || ""}" data-layout-file-name="${item.layoutFileName || ""}" title="Open page">
                                        ${itemName}
                                    </button>
                                    <div class="mt-1 truncate text-[11px] uppercase tracking-[0.08em] text-slate-400">${item.updatedAt}</div>
                                    ${partialsHtml}
                                    ${isPartialsSynced ? '<div class="mt-2 flex justify-end"><span class="inline-flex rounded-md border border-emerald-400/35 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-emerald-300">Synced</span></div>' : ""}
                                </div>
                            </div>
                        </div>
                    `;
                });

                ctx.landingProjectsList.innerHTML = html;
                ctx.landingProjectsList.querySelectorAll(".landing-project-open").forEach((card) => {
                    card.addEventListener("click", async (e) => {
                        await ctx.openPageFromDashboard(e.currentTarget.dataset.pageName, e.currentTarget.dataset.layoutFileName);
                    });
                });
                ctx.landingProjectsList.querySelectorAll(".landing-project-delete").forEach((button) => {
                    button.addEventListener("click", (e) => {
                        const target = e.currentTarget;
                        ctx.openDeleteProjectModal({
                            type: "page",
                            projectName: target.dataset.projectName,
                            pageName: target.dataset.pageName,
                            layoutFileName: target.dataset.layoutFileName
                        });
                    });
                });
                ctx.landingProjectsList.querySelectorAll(".landing-project-clone").forEach((button) => {
                    button.addEventListener("click", async (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const target = e.currentTarget;
                        const sourcePageName = target.dataset.pageName || "";
                        const suggestedName = `${sourcePageName}-copy`;
                        const requestedName = prompt("Enter new cloned page name:", suggestedName);
                        if (!requestedName) {
                            return;
                        }
                        const normalizedName = String(requestedName)
                            .trim()
                            .toLowerCase()
                            .replace(/[^a-z0-9-_]+/g, "-")
                            .replace(/-+/g, "-")
                            .replace(/^-|-$/g, "");
                        if (!normalizedName) {
                            ctx.showToast("Clone cancelled: invalid page name", "warning");
                            return;
                        }
                        try {
                            const result = await ctx.apiClient.clonePage(
                                target.dataset.projectName,
                                sourcePageName,
                                normalizedName,
                                normalizedName
                            );
                            ctx.showToast(`Cloned page: ${result.data?.pageName || normalizedName}`, "success");
                            await this.loadLandingProjects(ctx);
                        } catch (error) {
                            console.error("Failed to clone page:", error);
                            ctx.showToast(`Clone failed: ${error.message}`, "error");
                        }
                    });
                });
            } catch (error) {
                console.error("Failed to load landing projects:", error);
                ctx.landingProjectsList.innerHTML = '<div class="text-sm text-rose-300">Failed to load pages</div>';
            }
        },
        async loadLandingLandmarks(ctx) {
            if (!ctx.landingLandmarksList) {
                return;
            }

            ctx.landingLandmarksList.innerHTML = '<div class="text-sm text-slate-400">Loading landmarks...</div>';

            try {
                const result = await ctx.apiClient.listPartials();
                const items = Array.isArray(result.data) ? result.data : [];
                const landmarks = items.filter((item) => {
                    const rawPath = String(item?.path || "");
                    const normalized = rawPath.replace(/\\/g, "/").replace(/^\/+/, "");
                    return normalized.startsWith("landmark/");
                });

                if (landmarks.length === 0) {
                    ctx.landingLandmarksList.innerHTML = '<div class="text-sm text-slate-400">No landmarks found in html/partials/landmark.</div>';
                    return;
                }

                landmarks.sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));

                const html = landmarks.map((item) => {
                    const name = item?.name || item?.id || "Landmark";
                    const path = item?.path || "";
                    const preview = item?.preview && item.preview.trim().length > 0
                        ? item.preview
                        : "No preview available";

                    return `
                        <div class="group relative rounded-2xl border border-slate-700/60 bg-gradient-to-b from-slate-800/60 to-slate-900/80 p-4 shadow-[0_10px_35px_rgba(2,6,23,0.4)] transition duration-200 hover:-translate-y-0.5 hover:border-emerald-400/40 hover:shadow-[0_14px_45px_rgba(2,6,23,0.55)]">
                            <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0">
                                    <div class="truncate text-sm font-semibold text-slate-100">${name}</div>
                                    <div class="mt-1 truncate text-[10px] uppercase tracking-[0.14em] text-slate-400">${path}</div>
                                </div>
                                <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-600/70 bg-slate-900/80 text-slate-100">
                                    <i class="fas fa-landmark text-emerald-300"></i>
                                </span>
                            </div>
                            <p class="mt-3 text-xs text-slate-300/90 max-h-10 overflow-hidden">${preview}</p>
                            <div class="mt-4 flex flex-wrap gap-2">
                                <button type="button" class="landing-landmark-builder inline-flex items-center gap-1.5 rounded-lg border border-slate-600/70 bg-slate-950/60 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:border-emerald-400/70 hover:text-white" data-path="${path}" title="Edit in Builder">
                                    <i class="fas fa-layer-group text-[10px]"></i>
                                    <span>Builder</span>
                                </button>
                                <button type="button" class="landing-landmark-preview inline-flex items-center gap-1.5 rounded-lg border border-slate-600/70 bg-slate-950/60 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:border-sky-400/70 hover:text-white" data-path="${path}" title="Preview Partial">
                                    <i class="fas fa-eye text-[10px]"></i>
                                    <span>Preview</span>
                                </button>
                                <button type="button" class="landing-landmark-code inline-flex items-center gap-1.5 rounded-lg border border-slate-600/70 bg-slate-950/60 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:border-amber-400/70 hover:text-white" data-path="${path}" title="Edit HTML">
                                    <i class="fab fa-html5 text-[10px]"></i>
                                    <span>Code</span>
                                </button>
                            </div>
                        </div>
                    `;
                }).join("");

                ctx.landingLandmarksList.innerHTML = html;

                ctx.landingLandmarksList.querySelectorAll(".landing-landmark-builder").forEach((button) => {
                    button.addEventListener("click", async (e) => {
                        e.preventDefault();
                        const partialPath = e.currentTarget.dataset.path;
                        if (typeof ctx.openPartialInBuilder === "function") {
                            await ctx.openPartialInBuilder(partialPath);
                        }
                    });
                });
                ctx.landingLandmarksList.querySelectorAll(".landing-landmark-preview").forEach((button) => {
                    button.addEventListener("click", async (e) => {
                        e.preventDefault();
                        const partialPath = e.currentTarget.dataset.path;
                        await ctx.openPartialPreviewModal(partialPath);
                    });
                });
                ctx.landingLandmarksList.querySelectorAll(".landing-landmark-code").forEach((button) => {
                    button.addEventListener("click", async (e) => {
                        e.preventDefault();
                        const partialPath = e.currentTarget.dataset.path;
                        await ctx.openPartialCodeModal(partialPath);
                    });
                });
            } catch (error) {
                console.error("Failed to load landing landmarks:", error);
                ctx.landingLandmarksList.innerHTML = '<div class="text-sm text-rose-300">Failed to load landmarks</div>';
            }
        },
        async loadLandingLayouts(ctx) {
            if (!ctx.landingLayoutsList) {
                return;
            }

            ctx.landingLayoutsList.innerHTML = '<div class="text-sm text-slate-400">Loading layouts...</div>';

            try {
                const result = await ctx.apiClient.listLayouts();
                const items = Array.isArray(result.data) ? result.data : [];

                if (items.length === 0) {
                    ctx.landingLayoutsList.innerHTML = '<div class="text-sm text-slate-400">No layouts found in html/layouts.</div>';
                    return;
                }

                items.sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));

                const html = items.map((item) => {
                    const name = item?.name || item?.id || "Layout";
                    const path = item?.path || "";

                    return `
                        <div class="group relative rounded-2xl border border-slate-700/60 bg-gradient-to-b from-slate-800/60 to-slate-900/80 p-4 shadow-[0_10px_35px_rgba(2,6,23,0.4)] transition duration-200 hover:-translate-y-0.5 hover:border-indigo-400/40 hover:shadow-[0_14px_45px_rgba(2,6,23,0.55)]">
                            <div class="flex items-start justify-between gap-3">
                                <div class="min-w-0">
                                    <div class="truncate text-sm font-semibold text-slate-100">${name}</div>
                                    <div class="mt-1 truncate text-[10px] uppercase tracking-[0.14em] text-slate-400">${path}</div>
                                </div>
                                <span class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-600/70 bg-slate-900/80 text-slate-100">
                                    <i class="fas fa-layer-group text-indigo-300"></i>
                                </span>
                            </div>
                            <p class="mt-3 text-xs text-slate-300/90">Edit the main section with drag-and-drop.</p>
                            <div class="mt-4 flex flex-wrap gap-2">
                                <button type="button" class="landing-layout-builder inline-flex items-center gap-1.5 rounded-lg border border-slate-600/70 bg-slate-950/60 px-2.5 py-1.5 text-[11px] font-semibold text-slate-200 transition hover:border-indigo-400/70 hover:text-white" data-path="${path}" title="Edit Layout">
                                    <i class="fas fa-layer-group text-[10px]"></i>
                                    <span>Builder</span>
                                </button>
                            </div>
                        </div>
                    `;
                }).join("");

                ctx.landingLayoutsList.innerHTML = html;

                ctx.landingLayoutsList.querySelectorAll(".landing-layout-builder").forEach((button) => {
                    button.addEventListener("click", async (e) => {
                        e.preventDefault();
                        const layoutPath = e.currentTarget.dataset.path;
                        if (typeof ctx.openLayoutInBuilder === "function") {
                            await ctx.openLayoutInBuilder(layoutPath);
                        }
                    });
                });

            } catch (error) {
                console.error("Failed to load landing layouts:", error);
                ctx.landingLayoutsList.innerHTML = '<div class="text-sm text-rose-300">Failed to load layouts</div>';
            }
        },

        async syncPagesFromFilesystem(ctx) {
            ctx.syncLandingPages.disabled = true;
            try {
                const result = await ctx.apiClient.syncPages(ctx.siteProjectName);
                const syncedCount = Number(result?.data?.syncedCount || 0);
                ctx.showToast(`Sync complete: ${syncedCount} page(s) loaded`, "success");
                await this.loadLandingProjects(ctx);
            } catch (error) {
                console.error("Failed to sync pages:", error);
                ctx.showToast(`Sync failed: ${error.message}`, "error");
            } finally {
                ctx.syncLandingPages.disabled = false;
            }
        },

        async syncCurrentPagePartials(ctx) {
            if (!ctx.currentPageName) {
                ctx.showToast("Open a page first", "warning");
                return;
            }

            ctx.syncPagePartials.disabled = true;
            try {
                const result = await ctx.apiClient.getPagePartials(ctx.siteProjectName, ctx.currentPageName);
                const partialPaths = Array.isArray(result?.data?.partials) ? result.data.partials : [];
                if (partialPaths.length === 0) {
                    ctx.showToast("No partial markers found in this page html", "warning");
                    return;
                }

                const components = [];
                for (const componentPath of partialPaths) {
                    const partialResult = await ctx.apiClient.getPartial(componentPath);
                    components.push({
                        instanceId: `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                        type: "partial",
                        componentPath,
                        name: componentPath.split("/").pop().replace(".html", ""),
                        props: {},
                        content: partialResult.data
                    });
                }

                ctx.pageComponents = components;
                ctx.historyUndo = [];
                ctx.historyRedo = [];
                ctx.renderCanvasFromState();

                try {
                    await ctx.apiClient.setPagePartialsSyncState(ctx.siteProjectName, ctx.currentPageName, true);
                } catch (stateError) {
                    console.warn("Failed to persist partial sync state:", stateError);
                }

                ctx.showToast(`Synced ${components.length} partial(s) from ${ctx.currentPageName}.html`, "success");
            } catch (error) {
                console.error("Failed to sync current page partials:", error);
                ctx.showToast(`Sync failed: ${error.message}`, "error");
            } finally {
                ctx.syncPagePartials.disabled = false;
            }
        }
    };

    global.BuilderPagesDashboard = PagesDashboard;
})(window);

