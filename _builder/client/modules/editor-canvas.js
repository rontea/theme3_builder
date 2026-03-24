"use strict";

(function exposeEditorCanvas(global) {
    const EditorCanvas = {
        isFreeformMode(ctx) {
            return ctx?.canvasLayoutMode === "freeform";
        },

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

            this.bindNativePaletteDrag(ctx);
            this.bindFreeformCanvasEvents(ctx);
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

        async createCanvasItem(ctx, type, componentPath, options = {}) {
            try {
                if (type !== "partial" && type !== "micro") {
                    throw new Error("Unsupported component type");
                }

                ctx.pushHistory();
                if (typeof ctx.removeLayoutPlaceholders === "function") {
                    ctx.removeLayoutPlaceholders();
                }
                const instance = await ctx.createComponentInstance(type, componentPath);
                if (options.canvas && typeof options.canvas === "object") {
                    instance.canvas = { ...(instance.canvas || {}), ...options.canvas };
                }
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
            this.applyCanvasItemPosition(ctx, item, div, { isNested });
            this.enableFreeformItemDragging(ctx, item, div, { isNested });

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
            if (ctx.canvasDropZone) {
                ctx.canvasDropZone.classList.toggle("is-freeform", this.isFreeformMode(ctx));
            }
            if (count > 0) {
                ctx.canvasEmpty.classList.add("hidden");
                ctx.canvasDropZone.classList.remove("is-empty");
            } else {
                ctx.canvasEmpty.classList.remove("hidden");
                ctx.canvasDropZone.classList.add("is-empty");
            }
            this.syncFreeformExtent(ctx);
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
            if (typeof ctx.applySelectedCanvasElementSelection === "function") {
                ctx.applySelectedCanvasElementSelection(element, item.instanceId);
            }
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

                if (!slot.__nativePaletteDropBound) {
                    slot.addEventListener("dragover", (evt) => {
                        if (!this.isFreeformMode(ctx)) {
                            return;
                        }
                        evt.preventDefault();
                        evt.stopPropagation();
                        slot.classList.add("drag-over");
                    });
                    slot.addEventListener("dragleave", () => {
                        slot.classList.remove("drag-over");
                    });
                    slot.addEventListener("drop", async (evt) => {
                        if (!this.isFreeformMode(ctx)) {
                            return;
                        }
                        evt.preventDefault();
                        evt.stopPropagation();
                        slot.classList.remove("drag-over");
                        const fallback = ctx.pendingNativeDragData || {};
                        let payload = fallback;
                        const raw = evt.dataTransfer?.getData("text/plain");
                        if (raw) {
                            try {
                                payload = JSON.parse(raw);
                            } catch (error) {
                                payload = fallback;
                            }
                        }
                        const type = payload?.type || "";
                        const componentPath = payload?.path || "";
                        if (!type || !componentPath) {
                            return;
                        }
                        ctx.pushHistory();
                        await ctx.addComponentToSlot(parentId, slotName, type, componentPath);
                        ctx.pendingNativeDragData = null;
                    });
                    slot.__nativePaletteDropBound = true;
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
            if (item?.props?.isLayoutContext) {
                return;
            }
            const preview = element?.querySelector(".content-preview");
            if (!preview) {
                return;
            }
            const contentRoot = preview.firstElementChild || preview;
            if (ctx.getSelectableElements) {
                const selectableTargets = ctx.getSelectableElements(contentRoot, { container: element, includeRoot: true });
                selectableTargets.forEach((el) => {
                    if (!el || el.dataset.propertyInit === "true") {
                        return;
                    }
                    el.dataset.propertyInit = "true";
                    el.addEventListener("click", (evt) => {
                        evt.stopPropagation();
                        const key = ctx.getInlineKeyForElement
                            ? ctx.getInlineKeyForElement(el, contentRoot)
                            : "";
                        if (!key) {
                            return;
                        }
                        ctx.selectCanvasElement(item.instanceId, key);
                    });
                });
            }

            const editableTargets = ctx.getInlineEditableElements
                ? ctx.getInlineEditableElements(contentRoot, { container: element, includeRoot: true })
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
                    const key = el.dataset.inlineKey || inlineKey;
                    if (!key) {
                        return;
                    }
                    const existing = (item?.props?.inlineText || {})[key];
                    if (!prop && existing === value) {
                        return;
                    }
                    if (typeof ctx.updateElementTextProperty === "function") {
                        ctx.updateElementTextProperty(item.instanceId, key, value);
                    }
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
                    evt.stopPropagation();
                    if (!item?.instanceId || typeof ctx.selectCanvasElement !== "function" || typeof ctx.getInlineKeyForElement !== "function") {
                        return;
                    }
                    const key = ctx.getInlineKeyForElement(img, contentRoot);
                    ctx.selectCanvasElement(item.instanceId, key);
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
        },

        updateInteractionMode(ctx) {
            if (ctx.partialsSortable) {
                ctx.partialsSortable.option("disabled", this.isFreeformMode(ctx) || ctx.builderMode !== "page");
            }
            if (ctx.microSortable) {
                ctx.microSortable.option("disabled", this.isFreeformMode(ctx) || ctx.builderMode === "page");
            }
            if (ctx.canvasSortable) {
                ctx.canvasSortable.option("disabled", false);
            }
            this.updateCanvasState(ctx);
        },

        bindNativePaletteDrag(ctx) {
            if (ctx.__nativePaletteBound) {
                return;
            }
            const onDragStart = (evt) => {
                const item = evt.target.closest(".component-item");
                if (!item || !this.isFreeformMode(ctx)) {
                    return;
                }
                if (evt.target.closest(".component-view-code, .component-view-preview")) {
                    evt.preventDefault();
                    return;
                }
                const payload = {
                    type: item.dataset.type || "",
                    path: item.dataset.path || ""
                };
                ctx.pendingNativeDragData = payload;
                if (evt.dataTransfer) {
                    evt.dataTransfer.effectAllowed = "copy";
                    evt.dataTransfer.setData("text/plain", JSON.stringify(payload));
                }
            };
            const onDragEnd = () => {
                ctx.pendingNativeDragData = null;
                ctx.canvasDropZone?.classList.remove("drag-over");
            };

            [ctx.partialsList, ctx.microList].forEach((listEl) => {
                if (!listEl) {
                    return;
                }
                listEl.addEventListener("dragstart", onDragStart);
                listEl.addEventListener("dragend", onDragEnd);
            });
            ctx.__nativePaletteBound = true;
        },

        bindFreeformCanvasEvents(ctx) {
            if (!ctx.canvasDropZone || ctx.__freeformCanvasBound) {
                return;
            }
            ctx.canvasDropZone.addEventListener("dragover", (evt) => {
                if (!this.isFreeformMode(ctx)) {
                    return;
                }
                evt.preventDefault();
                ctx.canvasDropZone.classList.add("drag-over");
            });
            ctx.canvasDropZone.addEventListener("dragleave", (evt) => {
                if (!this.isFreeformMode(ctx)) {
                    return;
                }
                if (evt.target === ctx.canvasDropZone) {
                    ctx.canvasDropZone.classList.remove("drag-over");
                }
            });
            ctx.canvasDropZone.addEventListener("drop", async (evt) => {
                if (!this.isFreeformMode(ctx)) {
                    return;
                }
                evt.preventDefault();
                ctx.canvasDropZone.classList.remove("drag-over");
                const fallback = ctx.pendingNativeDragData || {};
                let payload = fallback;
                const raw = evt.dataTransfer?.getData("text/plain");
                if (raw) {
                    try {
                        payload = JSON.parse(raw);
                    } catch (error) {
                        payload = fallback;
                    }
                }
                const type = payload?.type || "";
                const componentPath = payload?.path || "";
                if (!type || !componentPath) {
                    return;
                }
                if (ctx.builderMode === "page" && typeof ctx.addComponentToAutoSection === "function") {
                    await ctx.addComponentToAutoSection(type, componentPath);
                    return;
                }
                const canvas = this.getCanvasCoordinates(ctx, evt);
                await this.createCanvasItem(ctx, type, componentPath, { canvas });
                ctx.pendingNativeDragData = null;
            });
            ctx.__freeformCanvasBound = true;
        },

        getCanvasCoordinates(ctx, evt, size = {}) {
            const rect = ctx.canvasDropZone.getBoundingClientRect();
            const scrollLeft = ctx.canvas?.scrollLeft || 0;
            const scrollTop = ctx.canvas?.scrollTop || 0;
            const width = Number(size.width) || 320;
            const height = Number(size.height) || 180;
            const rawX = evt.clientX - rect.left + scrollLeft - Math.min(width / 2, 140);
            const rawY = evt.clientY - rect.top + scrollTop - 24;
            return {
                x: Math.max(0, Math.round(rawX)),
                y: Math.max(0, Math.round(rawY)),
                width
            };
        },

        ensureCanvasPlacement(ctx, item, element) {
            if (item.canvas && Number.isFinite(item.canvas.x) && Number.isFinite(item.canvas.y)) {
                return item.canvas;
            }
            const items = ctx.getActiveComponents();
            const index = Math.max(0, items.findIndex((entry) => entry.instanceId === item.instanceId));
            const next = typeof ctx.getDefaultCanvasPlacement === "function"
                ? ctx.getDefaultCanvasPlacement(index, element)
                : { x: 24 + (index % 3) * 48, y: 24 + index * 48, width: 320 };
            item.canvas = { ...next };
            return item.canvas;
        },

        applyCanvasItemPosition(ctx, item, element, options = {}) {
            const isNested = Boolean(options.isNested);
            const hasCanvasPosition = Boolean(item?.canvas && Number.isFinite(Number(item.canvas.x)) && Number.isFinite(Number(item.canvas.y)));
            const isFreeform = this.isFreeformMode(ctx) && !isNested && hasCanvasPosition;
            element.classList.toggle("is-freeform", isFreeform);
            if (!isFreeform) {
                element.style.left = "";
                element.style.top = "";
                element.style.width = "";
                return;
            }
            const placement = this.ensureCanvasPlacement(ctx, item, element);
            const width = Number(placement.width) || 320;
            element.style.left = `${Math.max(0, Math.round(placement.x || 0))}px`;
            element.style.top = `${Math.max(0, Math.round(placement.y || 0))}px`;
            element.style.width = `${Math.max(220, Math.round(width))}px`;
        },

        enableFreeformItemDragging(ctx, item, element, options = {}) {
            if (options.isNested || element.dataset.freeformInit === "true" || !item?.canvas) {
                return;
            }
            element.dataset.freeformInit = "true";
            const handle = element.querySelector(".canvas-item-header");
            if (!handle) {
                return;
            }
            handle.addEventListener("pointerdown", (evt) => {
                if (!this.isFreeformMode(ctx)) {
                    return;
                }
                if (evt.button !== 0 || evt.target.closest("button")) {
                    return;
                }
                evt.preventDefault();
                const placement = this.ensureCanvasPlacement(ctx, item, element);
                const startX = placement.x || 0;
                const startY = placement.y || 0;
                const rect = element.getBoundingClientRect();
                const zoneRect = ctx.canvasDropZone.getBoundingClientRect();
                const pointerOffsetX = evt.clientX - rect.left;
                const pointerOffsetY = evt.clientY - rect.top;
                let moved = false;
                let historyPushed = false;

                const onMove = (moveEvt) => {
                    const scrollLeft = ctx.canvas?.scrollLeft || 0;
                    const scrollTop = ctx.canvas?.scrollTop || 0;
                    const nextX = Math.max(0, Math.round(moveEvt.clientX - zoneRect.left + scrollLeft - pointerOffsetX));
                    const nextY = Math.max(0, Math.round(moveEvt.clientY - zoneRect.top + scrollTop - pointerOffsetY));
                    if (!historyPushed && (Math.abs(nextX - startX) > 2 || Math.abs(nextY - startY) > 2)) {
                        ctx.pushHistory();
                        historyPushed = true;
                    }
                    moved = moved || historyPushed;
                    item.canvas = {
                        ...(item.canvas || {}),
                        x: nextX,
                        y: nextY,
                        width: Number(item.canvas?.width) || Math.round(rect.width || 320)
                    };
                    element.classList.add("is-freeform-dragging");
                    this.applyCanvasItemPosition(ctx, item, element);
                    this.syncFreeformExtent(ctx);
                };

                const onUp = () => {
                    element.classList.remove("is-freeform-dragging");
                    window.removeEventListener("pointermove", onMove);
                    window.removeEventListener("pointerup", onUp);
                    if (moved) {
                        ctx.refreshLivePreview();
                        if (ctx.selectedItem === item.instanceId) {
                            ctx.updateInspector?.(item.instanceId, ctx.selectedElement?.key || null);
                        }
                    }
                };

                window.addEventListener("pointermove", onMove);
                window.addEventListener("pointerup", onUp);
            });
        },

        syncFreeformExtent(ctx) {
            if (!ctx.canvasDropZone) {
                return;
            }
            if (!this.isFreeformMode(ctx)) {
                ctx.canvasDropZone.style.minHeight = "";
                return;
            }
            const items = ctx.getActiveComponents();
            const baseHeight = 480;
            let maxBottom = baseHeight;
            items.forEach((item) => {
                const placement = item?.canvas || {};
                const top = Number(placement.y) || 0;
                const approxHeight = typeof ctx.getApproximateCanvasItemHeight === "function"
                    ? ctx.getApproximateCanvasItemHeight(item)
                    : 220;
                maxBottom = Math.max(maxBottom, top + approxHeight + 48);
            });
            ctx.canvasDropZone.style.minHeight = `${Math.round(maxBottom)}px`;
        }
    };

    global.BuilderEditorCanvas = EditorCanvas;
})(window);

