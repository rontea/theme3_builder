"use strict";

(function exposePagesDashboard(global) {
    const PagesDashboard = {
        async loadLandingProjects(ctx) {
            ctx.landingContentTitle.textContent = "Pages";
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
            } catch (error) {
                console.error("Failed to load landing projects:", error);
                ctx.landingProjectsList.innerHTML = '<div class="text-sm text-rose-300">Failed to load pages</div>';
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

