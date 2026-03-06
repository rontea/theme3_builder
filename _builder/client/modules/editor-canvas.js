"use strict";

(function exposeEditorCanvas(global) {
    const EditorCanvas = {
        initSortable(ctx) {
            ctx.partialsSortable = new Sortable(ctx.partialsList, {
                group: { name: "builder", pull: "clone", put: false },
                draggable: ".component-item",
                filter: ".component-view-code",
                preventOnFilter: false,
                sort: false,
                animation: 150,
                ghostClass: "sortable-ghost",
                chosenClass: "sortable-chosen",
                onStart: (evt) => {
                    const partialPath = evt?.item?.dataset?.path || "";
                    ctx.currentDragPartialPath = partialPath;
                    const cachedHeight = ctx.partialHeightCache[partialPath];
                    const previewHeight = Number.isFinite(cachedHeight) ? cachedHeight : 240;
                    ctx.canvasDropZone.style.setProperty("--drag-preview-height", `${Math.max(140, Math.round(previewHeight))}px`);
                    ctx.canvasDropZone.classList.add("is-dragging-partial");
                },
                onEnd: () => {
                    this.clearDragPreviewIndicator(ctx);
                }
            });

            ctx.canvasSortable = new Sortable(ctx.canvasDropZone, {
                group: { name: "builder", pull: false, put: ["builder"] },
                animation: 150,
                ghostClass: "sortable-ghost",
                chosenClass: "sortable-chosen",
                handle: ".canvas-item-header",
                onAdd: (evt) => this.handleDrop(ctx, evt),
                onUpdate: (evt) => this.handleReorder(ctx, evt),
                onRemove: (evt) => this.handleRemove(ctx, evt)
            });

            this.updateCanvasState(ctx);
        },

        handleDrop(ctx, evt) {
            if (!ctx.project) {
                evt.item.remove();
                ctx.openProjectModal();
                ctx.showToast("Create or open a page first", "warning");
                return;
            }

            if (!ctx.pageCreated) {
                evt.item.remove();
                ctx.showCreatePageModal();
                ctx.showToast("Create a page first", "warning");
                return;
            }

            const item = evt.item;
            const type = item.dataset.type;
            const componentPath = item.dataset.path;
            item.remove();
            this.createCanvasItem(ctx, type, componentPath);
        },

        async createCanvasItem(ctx, type, componentPath) {
            try {
                if (type !== "partial") {
                    throw new Error("Only partial components are supported");
                }

                const result = await ctx.apiClient.getPartial(componentPath);
                const instanceId = `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                ctx.pushHistory();

                ctx.pageComponents.push({
                    instanceId,
                    type,
                    componentPath,
                    name: componentPath.split("/").pop().replace(".html", ""),
                    props: {},
                    content: result.data
                });

                this.renderCanvasFromState(ctx);
                ctx.refreshLivePreview();
            } catch (error) {
                console.error("Error creating canvas item:", error);
                ctx.showToast("Failed to load component content", "error");
            }
        },

        renderCanvasFromState(ctx) {
            ctx.canvasDropZone.innerHTML = "";
            ctx.pageComponents.forEach((item) => this.renderCanvasItem(ctx, item));
            this.updateCanvasState(ctx);
        },

        renderCanvasItem(ctx, item) {
            const div = document.createElement("div");
            div.className = "canvas-item";
            div.dataset.instanceId = item.instanceId;
            div.dataset.type = item.type;
            div.dataset.path = item.componentPath;
            div.innerHTML = `
                <div class="canvas-item-header">
                    <div class="canvas-item-info">
                        <i class="fas fa-${item.type === "partial" ? "puzzle-piece" : "layer-group"}"></i>
                        <span class="item-name">${item.name}</span>
                        <span class="item-path">${item.componentPath}</span>
                    </div>
                    <div class="canvas-item-actions">
                        <button class="btn-duplicate" title="Duplicate"><i class="fas fa-copy"></i></button>
                        <button class="btn-edit" title="Edit"><i class="fas fa-edit"></i></button>
                        <button class="btn-delete" title="Delete"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
                <div class="canvas-item-content">
                    <div class="content-preview">${ctx.getRenderedComponentContent(item)}</div>
                </div>
            `;

            div.querySelector(".btn-delete").addEventListener("click", (e) => {
                e.stopPropagation();
                ctx.removeCanvasItem(item.instanceId);
            });
            div.querySelector(".btn-duplicate").addEventListener("click", (e) => {
                e.stopPropagation();
                ctx.duplicateCanvasItem(item.instanceId);
            });
            div.querySelector(".btn-edit").addEventListener("click", (e) => {
                e.stopPropagation();
                ctx.selectCanvasItem(item.instanceId);
            });
            div.addEventListener("click", () => ctx.selectCanvasItem(item.instanceId));
            ctx.canvasDropZone.appendChild(div);

            if (item.componentPath) {
                const measuredHeight = Math.ceil(div.getBoundingClientRect().height || 0);
                if (measuredHeight > 0) {
                    ctx.partialHeightCache[item.componentPath] = measuredHeight;
                }
            }
        },

        handleRemove(ctx, evt) {
            ctx.pushHistory();
            const instanceId = evt.item.dataset.instanceId;
            const index = ctx.pageComponents.findIndex((item) => item.instanceId === instanceId);
            if (index > -1) {
                ctx.pageComponents.splice(index, 1);
            }
            this.updateCanvasState(ctx);
            ctx.refreshLivePreview();
        },

        handleReorder(ctx) {
            ctx.pushHistory();
            this.updateCanvasItemsOrder(ctx);
            ctx.refreshLivePreview();
        },

        updateCanvasItemsOrder(ctx) {
            const newOrder = [];
            const elements = ctx.canvasDropZone.querySelectorAll(".canvas-item");
            elements.forEach((el) => {
                const instanceId = el.dataset.instanceId;
                const item = ctx.pageComponents.find((entry) => entry.instanceId === instanceId);
                if (item) {
                    newOrder.push(item);
                }
            });
            ctx.pageComponents = newOrder;
        },

        updateCanvasState(ctx) {
            const count = ctx.pageComponents.length;
            ctx.componentCount.textContent = `${count} component${count !== 1 ? "s" : ""}`;
            if (count > 0) {
                ctx.canvasEmpty.classList.add("hidden");
                ctx.canvasDropZone.classList.remove("is-empty");
            } else {
                ctx.canvasEmpty.classList.remove("hidden");
                ctx.canvasDropZone.classList.add("is-empty");
            }
        },

        clearDragPreviewIndicator(ctx) {
            ctx.currentDragPartialPath = null;
            ctx.canvasDropZone.classList.remove("is-dragging-partial");
            ctx.canvasDropZone.style.removeProperty("--drag-preview-height");
        }
    };

    global.BuilderEditorCanvas = EditorCanvas;
})(window);

