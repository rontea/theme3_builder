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
                ignore: "input, textarea, select, option, [contenteditable='true']",
                handle: ".canvas-item-header",
                draggable: ".canvas-item:not(.is-nested)",
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

                ctx.pushHistory();
                const instance = await ctx.createComponentInstance(type, componentPath);
                ctx.getActiveComponents().push(instance);

                this.renderCanvasFromState(ctx);
                ctx.refreshLivePreview();
            } catch (error) {
                console.error("Error creating canvas item:", error);
                ctx.showToast("Failed to load component content", "error");
            }
        },

        renderCanvasFromState(ctx) {
            ctx.canvasDropZone.innerHTML = "";
            ctx.getActiveComponents().forEach((item) => this.renderCanvasItem(ctx, item, { container: ctx.canvasDropZone }));
            this.updateCanvasState(ctx);
        },

        renderCanvasItem(ctx, item, options = {}) {
            const container = options.container || ctx.canvasDropZone;
            const isNested = Boolean(options.isNested);
            const div = document.createElement("div");
            div.className = `canvas-item${isNested ? " is-nested" : ""}`;
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
                    <div class="content-preview"></div>
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
            div.addEventListener("click", (e) => {
                e.stopPropagation();
                ctx.selectCanvasItem(item.instanceId);
            });
            container.appendChild(div);
            this.hydrateCanvasItem(ctx, item, div);

            if (!isNested && item.componentPath) {
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
            const elements = ctx.canvasDropZone.querySelectorAll(".canvas-item:not(.is-nested)");
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
            const count = typeof ctx.countComponents === "function"
                ? ctx.countComponents(ctx.getActiveComponents())
                : ctx.getActiveComponents().length;
            ctx.componentCount.textContent = `${count} component${count !== 1 ? "s" : ""}`;
            if (count > 0) {
                ctx.canvasEmpty.classList.add("hidden");
                ctx.canvasDropZone.classList.remove("is-empty");
            } else {
                ctx.canvasEmpty.classList.remove("hidden");
                ctx.canvasDropZone.classList.add("is-empty");
            }
        },

        hydrateCanvasItem(ctx, item, element) {
            if (!element) {
                return;
            }
            const preview = element.querySelector(".content-preview");
            if (preview) {
                preview.innerHTML = ctx.getRenderedComponentContent(item, { forCanvas: true });
            }
            this.initSlotsForItem(ctx, item, element);
            this.enableInlineEditing(ctx, item, element);
        },

        initSlotsForItem(ctx, item, element) {
            if (!element) {
                return;
            }
            const slots = element.querySelectorAll(".micro-slot[data-slot]");
            if (!slots.length) {
                return;
            }
            if (!item.children || typeof item.children !== "object") {
                item.children = {};
            }

            slots.forEach((slot) => {
                const slotName = slot.dataset.slot || "default";
                slot.dataset.parentId = item.instanceId;
                slot.dataset.slot = slotName;

                slot.innerHTML = "";

                const children = Array.isArray(item.children[slotName]) ? item.children[slotName] : [];
                children.forEach((child) => {
                    this.renderCanvasItem(ctx, child, { container: slot, isNested: true });
                });

                if (children.length === 0) {
                    slot.classList.add("is-empty");
                } else {
                    slot.classList.remove("is-empty");
                }

                if (!slot.__microSortable) {
                    slot.__microSortable = new Sortable(slot, {
                        group: { name: "micro-slot", pull: false, put: ["builder"] },
                        draggable: ".canvas-item",
                        sort: true,
                        animation: 150,
                        ghostClass: "sortable-ghost",
                        chosenClass: "sortable-chosen",
                        onAdd: (evt) => this.handleSlotDrop(ctx, evt, slot),
                        onUpdate: () => this.updateSlotOrder(ctx, slot)
                    });
                }
            });
        },

        async handleSlotDrop(ctx, evt, slot) {
            try {
                const parentId = slot?.dataset?.parentId;
                const slotName = slot?.dataset?.slot || "default";
                const type = evt?.item?.dataset?.type || evt?.clone?.dataset?.type;
                const componentPath = evt?.item?.dataset?.path || evt?.clone?.dataset?.path;
                if (!parentId || !type || !componentPath) {
                    evt.item?.remove();
                    return;
                }
                evt.item?.remove();
                ctx.pushHistory();
                await ctx.addComponentToSlot(parentId, slotName, type, componentPath);
            } catch (error) {
                console.error("Failed to add component to slot:", error);
                ctx.showToast("Failed to add component to slot", "error");
            }
        },

        updateSlotOrder(ctx, slot) {
            const parentId = slot?.dataset?.parentId;
            const slotName = slot?.dataset?.slot || "default";
            if (!parentId) {
                return;
            }
            const orderedIds = Array.from(slot.children)
                .filter((el) => el.classList && el.classList.contains("canvas-item"))
                .map((el) => el.dataset.instanceId)
                .filter(Boolean);
            ctx.reorderSlotChildren(parentId, slotName, orderedIds);
            ctx.refreshLivePreview();
        },

        enableInlineEditing(ctx, item, element) {
            const preview = element?.querySelector(".content-preview");
            if (!preview) {
                return;
            }

            const editableTargets = ctx.getInlineEditableElements
                ? ctx.getInlineEditableElements(preview, { container: element })
                : [];

            editableTargets.forEach((el) => {
                if (!el || el.dataset.inlineInit === "true") {
                    return;
                }
                const tag = el.tagName.toLowerCase();
                let prop = null;
                if (/^h[1-6]$/.test(tag)) {
                    prop = "title";
                } else if (tag === "p") {
                    prop = "text";
                } else if (tag === "a" || tag === "button") {
                    prop = "linkText";
                }

                const inlineKey = ctx.getInlineKeyForElement
                    ? ctx.getInlineKeyForElement(el, preview)
                    : "";

                el.dataset.inlineInit = "true";
                if (prop) {
                    el.dataset.inlineProp = prop;
                } else if (inlineKey) {
                    el.dataset.inlineKey = inlineKey;
                }
                el.setAttribute("contenteditable", "true");
                el.setAttribute("spellcheck", "false");

                if (el.tagName === "A") {
                    el.addEventListener("click", (evt) => evt.preventDefault());
                }

                el.addEventListener("keydown", (evt) => {
                    if (evt.key === "Enter" && prop !== "text") {
                        evt.preventDefault();
                    }
                });

                el.addEventListener("blur", () => {
                    const value = (el.textContent || "").trim();
                    if (!item?.instanceId) {
                        return;
                    }
                    if (prop) {
                        const current = item?.props?.[prop];
                        if (typeof current === "string" && current.trim() === value) {
                            return;
                        }
                        ctx.updateComponentProps(item.instanceId, { props: { [prop]: value } });
                        return;
                    }
                    const key = el.dataset.inlineKey || inlineKey;
                    if (!key) {
                        return;
                    }
                    const existing = item?.props?.inlineText || {};
                    if (existing[key] === value) {
                        return;
                    }
                    const next = { ...existing, [key]: value };
                    ctx.updateComponentProps(item.instanceId, { props: { inlineText: next } });
                });
            });

            const images = Array.from(preview.querySelectorAll("img"));
            images.forEach((img) => {
                if (!img || img.dataset.inlineImageInit === "true") {
                    return;
                }
                const owner = img.closest(".canvas-item");
                if (owner && owner !== element) {
                    return;
                }
                img.dataset.inlineImageInit = "true";
                img.style.cursor = "pointer";
                img.addEventListener("click", (evt) => {
                    evt.preventDefault();
                    evt.stopPropagation();
                    if (!item?.instanceId || typeof ctx.openImageModal !== "function") {
                        return;
                    }
                    const key = ctx.getInlineKeyForElement
                        ? ctx.getInlineKeyForElement(img, preview)
                        : "";
                    const current = img.getAttribute("src") || "";
                    ctx.openImageModal({
                        instanceId: item.instanceId,
                        inlineKey: key,
                        singleImageProp: Boolean(item?.props?.imageSrc && images.length === 1),
                        currentSrc: current,
                        alt: img.getAttribute("alt") || ""
                    });
                });
            });
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

