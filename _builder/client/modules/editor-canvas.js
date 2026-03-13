"use strict";

(function exposeEditorCanvas(global) {
    const EditorCanvas = {
        initSortable(ctx) {
            ctx.partialsSortable = new Sortable(ctx.partialsList, {
                group: { name: "builder", pull: "clone", put: false },
                draggable: ".component-item",
                filter: ".component-view-code, .component-view-preview",
                preventOnFilter: false,
                sort: false,
                animation: 150,
                ghostClass: "sortable-ghost",
                chosenClass: "sortable-chosen",
                onStart: (evt) => {
                    const partialPath = evt?.item?.dataset?.path || "";
                    ctx.currentDragPartialPath = partialPath;
                },
                onEnd: () => {
                    this.clearDragPreviewIndicator(ctx);
                }
            });

            if (ctx.microList) {
                ctx.microSortable = new Sortable(ctx.microList, {
                    group: { name: "builder", pull: "clone", put: false },
                    draggable: ".component-item",
                    sort: false,
                    animation: 150,
                    ghostClass: "sortable-ghost",
                    chosenClass: "sortable-chosen",
                    onStart: (evt) => {
                        const microPath = evt?.item?.dataset?.path || "";
                        ctx.currentDragPartialPath = microPath;
                    },
                    onEnd: () => {
                        this.clearDragPreviewIndicator(ctx);
                    }
                });
            }

            ctx.canvasSortable = new Sortable(ctx.canvasDropZone, {
                group: { name: "builder", pull: false, put: ["builder"] },
                animation: 150,
                ghostClass: "sortable-ghost",
                chosenClass: "sortable-chosen",
                ignore: "input, textarea, select, option",
                handle: ".canvas-item-header",
                onAdd: (evt) => this.handleDrop(ctx, evt),
                onUpdate: (evt) => this.handleReorder(ctx, evt),
                onRemove: (evt) => this.handleRemove(ctx, evt)
            });

            this.updateCanvasState(ctx);
        },

        handleDrop(ctx, evt) {
            if (ctx.builderMode === "page") {
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
            }

            const item = evt.item;
            const type = item.dataset.type || evt.clone?.dataset?.type;
            const componentPath = item.dataset.path || evt.clone?.dataset?.path;
            item.remove();
            this.createCanvasItem(ctx, type, componentPath);
        },

        async createCanvasItem(ctx, type, componentPath) {
            try {
                if (type !== "partial" && type !== "micro") {
                    throw new Error("Unsupported component type");
                }

                const instanceId = `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                ctx.pushHistory();

                if (type === "partial") {
                    const result = await ctx.apiClient.getPartial(componentPath);
                    ctx.getActiveComponents().push({
                        instanceId,
                        type,
                        componentPath,
                        name: componentPath.split("/").pop().replace(".html", ""),
                        props: {},
                        content: result.data
                    });
                } else {
                    const definition = ctx.getMicroComponentDefinition(componentPath);
                    if (!definition) {
                        throw new Error("Unknown micro component");
                    }
                    ctx.getActiveComponents().push({
                        instanceId,
                        type,
                        componentPath: definition.id,
                        name: definition.name,
                        props: { ...(definition.defaultProps || {}) },
                        content: definition.template
                    });
                }

                this.renderCanvasFromState(ctx);
                ctx.refreshLivePreview();
            } catch (error) {
                console.error("Error creating canvas item:", error);
                ctx.showToast("Failed to load component content", "error");
            }
        },

        renderCanvasFromState(ctx) {
            ctx.canvasDropZone.innerHTML = "";
            ctx.getActiveComponents().forEach((item) => this.renderCanvasItem(ctx, item));
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
                        <i class="fas fa-${item.type === "partial" ? "puzzle-piece" : item.type === "micro" ? "cube" : "layer-group"}"></i>
                        <span class="item-name">${item.name}</span>
                        <span class="item-path">${item.componentPath}</span>
                    </div>
                    <div class="canvas-item-actions">
                        <button class="btn-duplicate" title="Duplicate"><i class="fas fa-copy"></i></button>
                        <button class="btn-toggle-view" title="Collapse view" aria-expanded="true">
                            <i class="fas fa-chevron-up" aria-hidden="true"></i>
                        </button>
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
            const toggleButton = div.querySelector(".btn-toggle-view");
            if (toggleButton) {
                toggleButton.addEventListener("click", (e) => {
                    e.stopPropagation();
                    this.toggleCanvasItemView(ctx, div);
                });
            }
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
            const components = ctx.getActiveComponents();
            const index = components.findIndex((item) => item.instanceId === instanceId);
            if (index > -1) {
                components.splice(index, 1);
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
                const item = ctx.getActiveComponents().find((entry) => entry.instanceId === instanceId);
                if (item) {
                    newOrder.push(item);
                }
            });
            ctx.setActiveComponents(newOrder);
        },

        updateCanvasState(ctx) {
            const count = ctx.getActiveComponents().length;
            ctx.componentCount.textContent = `${count} component${count !== 1 ? "s" : ""}`;
            if (count > 0) {
                ctx.canvasEmpty.classList.add("hidden");
                ctx.canvasDropZone.classList.remove("is-empty");
            } else {
                ctx.canvasEmpty.classList.remove("hidden");
                ctx.canvasDropZone.classList.add("is-empty");
            }
        },

        toggleCanvasItemView(ctx, itemEl) {
            if (!itemEl) {
                return;
            }

            const content = itemEl.querySelector(".canvas-item-content");
            if (!content) {
                return;
            }

            const isCollapsed = itemEl.classList.toggle("collapsed");
            const button = itemEl.querySelector(".btn-toggle-view");

            if (isCollapsed) {
                const height = content.scrollHeight;
                content.style.overflow = "hidden";
                content.style.maxHeight = `${height}px`;
                requestAnimationFrame(() => {
                    content.style.maxHeight = "0px";
                });
            } else {
                const height = content.scrollHeight;
                content.style.overflow = "hidden";
                content.style.maxHeight = `${height}px`;
                const onEnd = () => {
                    content.style.maxHeight = "";
                    content.style.overflow = "";
                    content.removeEventListener("transitionend", onEnd);
                };
                content.addEventListener("transitionend", onEnd);
            }

            if (button) {
                button.setAttribute("aria-expanded", String(!isCollapsed));
                button.title = isCollapsed ? "Slide down view" : "Collapse view";
                const icon = button.querySelector("i");
                if (icon) {
                    icon.classList.toggle("fa-chevron-down", isCollapsed);
                    icon.classList.toggle("fa-chevron-up", !isCollapsed);
                }
            }
        },

        clearDragPreviewIndicator(ctx) {
            ctx.currentDragPartialPath = null;
        }
    };

    global.BuilderEditorCanvas = EditorCanvas;
})(window);

