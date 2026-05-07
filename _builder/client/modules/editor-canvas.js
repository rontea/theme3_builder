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

            if (ctx.viewsList) {
                ctx.viewsSortable = new Sortable(ctx.viewsList, {
                    group: { name: "builder", pull: "clone", put: false },
                    draggable: ".component-item",
                    sort: false,
                    animation: 150,
                    ghostClass: "sortable-ghost",
                    chosenClass: "sortable-chosen",
                    onStart: (evt) => {
                        ctx.currentDragPartialPath = evt?.item?.dataset?.path || "";
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
            const rawRegion = evt.to?.dataset?.regionId
                || (ctx.activeRegionFilter && ctx.activeRegionFilter !== "all" ? ctx.activeRegionFilter : "")
                || ctx.inferRegionForComponent?.(componentPath)
                || "main";
            const region = ctx.normalizeRegionId?.(rawRegion, ctx.inferRegionForComponent?.(componentPath) || "main") || "main";
            const allowedRegions = String(item.dataset.allowedRegions || evt.clone?.dataset?.allowedRegions || "")
                .split(",")
                .map((value) => ctx.normalizeRegionId?.(value, value.trim()) || value.trim())
                .filter(Boolean);
            if (allowedRegions.length && !allowedRegions.includes(region)) {
                item.remove();
                ctx.showToast(`Component cannot be placed in ${ctx.getRegionDefinition?.(region)?.name || region}`, "warning");
                return;
            }
            item.remove();
            this.createCanvasItem(ctx, type, componentPath, { region });
        },

        async createCanvasItem(ctx, type, componentPath, options = {}) {
            try {
                if (type !== "partial" && type !== "micro" && type !== "view") {
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
                if (ctx.builderMode === "page") {
                    instance.region = ctx.normalizeRegionId?.(options.region, ctx.inferRegionForComponent?.(componentPath) || "main") || "main";
                    instance.order = ctx.getActiveComponents().filter((entry) => entry.region === instance.region).length + 1;
                    instance.visible = instance.visible !== false;
                    instance.blockConfig = instance.blockConfig || {};
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
            if (ctx.builderMode === "page" && !this.isFreeformMode(ctx) && Array.isArray(ctx.layoutRegions)) {
                this.renderRegionCanvas(ctx);
                this.updateCanvasState(ctx);
                return;
            }
            ctx.getActiveComponents().forEach((item) => this.renderCanvasItem(ctx, item, { container: ctx.canvasDropZone }));
            this.updateCanvasState(ctx);
        },

        renderRegionCanvas(ctx) {
            const grouped = ctx.getComponentsByRegion(ctx.getActiveComponents());
            ctx.layoutRegions.forEach((region) => {
                const section = document.createElement("section");
                const blocks = grouped[region.id] || [];
                const isMissing = region.required && blocks.filter((item) => item.visible !== false).length === 0;
                section.className = `builder-region${isMissing ? " has-warning" : ""}${region.locked ? " is-locked" : ""}`;
                section.dataset.regionId = region.id;
                section.innerHTML = `
                    <div class="builder-region-header">
                        <div>
                            <span class="builder-region-kicker">${region.required ? "Required" : "Optional"}</span>
                            <h4>${region.name}</h4>
                        </div>
                        <span class="builder-region-status">${region.locked ? "Locked" : isMissing ? "Missing required block" : `${blocks.length} block${blocks.length === 1 ? "" : "s"}`}</span>
                    </div>
                    <div class="builder-region-drop-zone" data-region-id="${region.id}"></div>
                `;
                const dropZone = section.querySelector(".builder-region-drop-zone");
                if (!blocks.length) {
                    dropZone.innerHTML = `
                        <div class="builder-region-empty">
                            <strong>${region.name} Region</strong>
                            <span>${region.locked ? "This region is locked by the template." : "Drop compatible components here."}</span>
                        </div>
                    `;
                } else {
                    blocks.forEach((item) => this.renderCanvasItem(ctx, item, { container: dropZone }));
                }
                ctx.canvasDropZone.appendChild(section);
                if (!region.locked) {
                    this.enableRegionSortable(ctx, dropZone);
                }
            });
        },

        enableRegionSortable(ctx, dropZone) {
            if (!dropZone || dropZone.__regionSortable) {
                return;
            }
            dropZone.__regionSortable = new Sortable(dropZone, {
                group: { name: "builder", pull: true, put: ["builder"] },
                animation: 150,
                ghostClass: "sortable-ghost",
                chosenClass: "sortable-chosen",
                ignore: "input, textarea, select, option, [contenteditable='true']",
                handle: ".canvas-item-header",
                draggable: ".canvas-item:not(.is-nested)",
                onAdd: (evt) => {
                    const instanceId = evt.item?.dataset?.instanceId;
                    if (instanceId) {
                        this.moveItemToRegion(ctx, instanceId, evt.to?.dataset?.regionId || "main", evt.newIndex);
                        return;
                    }
                    this.handleDrop(ctx, evt);
                },
                onUpdate: (evt) => this.updateRegionOrder(ctx, evt.to?.dataset?.regionId || "main"),
                onRemove: () => this.updateCanvasState(ctx)
            });
        },

        moveItemToRegion(ctx, instanceId, regionId, newIndex = null) {
            const location = ctx.findComponentLocation(instanceId);
            if (!location || location.item.locked) {
                this.renderCanvasFromState(ctx);
                return;
            }
            const targetRegion = ctx.normalizeRegionId?.(regionId, "main") || "main";
            const allowedRegions = ctx.getAllowedRegionsForComponent?.(location.item.componentPath, location.item.type) || [];
            if (allowedRegions.length && !allowedRegions.includes(targetRegion)) {
                ctx.showToast(`Block cannot move to ${ctx.getRegionDefinition?.(targetRegion)?.name || targetRegion}`, "warning");
                this.renderCanvasFromState(ctx);
                return;
            }
            ctx.pushHistory();
            location.item.region = targetRegion;
            const components = ctx.getActiveComponents();
            const others = components.filter((item) => item.instanceId !== instanceId);
            const targetItems = others.filter((item) => item.region === targetRegion);
            const insertAt = Number.isFinite(Number(newIndex)) ? Math.max(0, Math.min(Number(newIndex), targetItems.length)) : targetItems.length;
            targetItems.splice(insertAt, 0, location.item);
            const next = ctx.layoutRegions.flatMap((region) => {
                const list = region.id === targetRegion
                    ? targetItems
                    : others.filter((item) => item.region === region.id);
                return list.map((item, index) => ({ ...item, order: index + 1 }));
            });
            ctx.setActiveComponents(next);
            this.renderCanvasFromState(ctx);
            ctx.refreshLivePreview();
        },

        updateRegionOrder(ctx, regionId) {
            ctx.pushHistory();
            const ids = Array.from(ctx.canvasDropZone.querySelectorAll(`.builder-region-drop-zone[data-region-id="${regionId}"] .canvas-item:not(.is-nested)`))
                .map((element) => element.dataset.instanceId)
                .filter(Boolean);
            const components = ctx.getActiveComponents();
            const lookup = new Map(components.map((item) => [item.instanceId, item]));
            const ordered = ids.map((id, index) => {
                const item = lookup.get(id);
                return item ? { ...item, region: regionId, order: index + 1 } : null;
            }).filter(Boolean);
            const next = ctx.layoutRegions.flatMap((region) => {
                if (region.id === regionId) return ordered;
                return components
                    .filter((item) => item.region === region.id)
                    .map((item, index) => ({ ...item, order: index + 1 }));
            });
            ctx.setActiveComponents(next);
            this.renderCanvasFromState(ctx);
            ctx.refreshLivePreview();
        },

        renderCanvasItem(ctx, item, options = {}) {
            const container = options.container || ctx.canvasDropZone;
            const isNested = Boolean(options.isNested);
            const div = document.createElement("div");
            div.className = `canvas-item${isNested ? " is-nested" : ""}`;
            div.classList.toggle("is-hidden-block", item.visible === false);
            div.dataset.instanceId = item.instanceId;
            div.dataset.type = item.type;
            div.dataset.path = item.componentPath;
            div.dataset.region = item.region || "main";
            div.dataset.visible = String(item.visible !== false);
            div.innerHTML = `
                <div class="canvas-item-header">
                    <div class="canvas-item-info">
                        <i class="fas fa-${item.type === "partial" ? "puzzle-piece" : item.type === "micro" ? "cube" : "layer-group"}"></i>
                        <span class="item-name">${item.name}</span>
                        <span class="item-path">${item.componentPath}</span>
                        <span class="item-path">${ctx.getRegionDefinition?.(item.region)?.name || item.region || "Main"}</span>
                        ${item.visible === false ? '<span class="item-path">Hidden</span>' : ''}
                    </div>
                    <div class="canvas-item-actions">
                        <button class="btn-duplicate" title="Duplicate"><i class="fas fa-copy"></i></button>
                        <button class="btn-move-up" title="Move up"><i class="fas fa-arrow-up"></i></button>
                        <button class="btn-move-down" title="Move down"><i class="fas fa-arrow-down"></i></button>
                        <button class="btn-hide" title="${item.visible === false ? "Show block" : "Hide block"}"><i class="fas fa-${item.visible === false ? "eye" : "eye-slash"}"></i></button>
                        ${item.type === "partial" ? '<button class="btn-code" title="Edit Code"><i class="fas fa-code"></i></button>' : ''}
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
            div.querySelector(".btn-move-up")?.addEventListener("click", (e) => {
                e.stopPropagation();
                ctx.moveCanvasItem(item.instanceId, -1);
            });
            div.querySelector(".btn-move-down")?.addEventListener("click", (e) => {
                e.stopPropagation();
                ctx.moveCanvasItem(item.instanceId, 1);
            });
            div.querySelector(".btn-hide")?.addEventListener("click", (e) => {
                e.stopPropagation();
                ctx.toggleCanvasItemVisibility(item.instanceId);
            });
            const codeButton = div.querySelector(".btn-code");
            if (codeButton) {
                codeButton.addEventListener("click", (e) => {
                    e.stopPropagation();
                    ctx.openCanvasComponentCode(item.instanceId);
                });
            }
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
            return this.clampCanvasPlacement(ctx, {
                x: Math.max(0, Math.round(rawX)),
                y: Math.max(0, Math.round(rawY)),
                width
            });
        },

        clampCanvasPlacement(ctx, placement = {}, element = null) {
            const zone = ctx?.canvasDropZone;
            const zoneWidth = Math.floor(zone?.clientWidth || zone?.getBoundingClientRect?.().width || 0);
            const measuredWidth = Math.round(element?.getBoundingClientRect?.().width || 0);
            const requestedWidth = Number(placement.width) || measuredWidth || 320;
            const minWidth = zoneWidth > 0 ? Math.min(220, zoneWidth) : 220;
            const width = zoneWidth > 0
                ? Math.max(minWidth, Math.min(Math.round(requestedWidth), zoneWidth))
                : Math.max(minWidth, Math.round(requestedWidth));
            const maxX = zoneWidth > 0 ? Math.max(0, zoneWidth - width) : null;
            const rawX = Number(placement.x);
            const rawY = Number(placement.y);
            const x = Number.isFinite(rawX) ? Math.max(0, Math.round(rawX)) : 0;
            return {
                x: maxX === null ? x : Math.min(x, maxX),
                y: Number.isFinite(rawY) ? Math.max(0, Math.round(rawY)) : 0,
                width
            };
        },

        ensureCanvasPlacement(ctx, item, element) {
            if (item.canvas && Number.isFinite(item.canvas.x) && Number.isFinite(item.canvas.y)) {
                item.canvas = this.clampCanvasPlacement(ctx, item.canvas, element);
                return item.canvas;
            }
            const items = ctx.getActiveComponents();
            const index = Math.max(0, items.findIndex((entry) => entry.instanceId === item.instanceId));
            const next = typeof ctx.getDefaultCanvasPlacement === "function"
                ? ctx.getDefaultCanvasPlacement(index, element)
                : { x: 24 + (index % 3) * 48, y: 24 + index * 48, width: 320 };
            item.canvas = this.clampCanvasPlacement(ctx, next, element);
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
            const placement = this.clampCanvasPlacement(ctx, this.ensureCanvasPlacement(ctx, item, element), element);
            item.canvas = { ...(item.canvas || {}), ...placement };
            const width = Number(placement.width) || 320;
            element.style.left = `${Math.max(0, Math.round(placement.x || 0))}px`;
            element.style.top = `${Math.max(0, Math.round(placement.y || 0))}px`;
            element.style.width = `${Math.max(1, Math.round(width))}px`;
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
                    const nextPlacement = this.clampCanvasPlacement(ctx, {
                        x: Math.round(moveEvt.clientX - zoneRect.left + scrollLeft - pointerOffsetX),
                        y: Math.round(moveEvt.clientY - zoneRect.top + scrollTop - pointerOffsetY),
                        width: Number(item.canvas?.width) || Math.round(rect.width || 320)
                    }, element);
                    const nextX = nextPlacement.x;
                    const nextY = nextPlacement.y;
                    if (!historyPushed && (Math.abs(nextX - startX) > 2 || Math.abs(nextY - startY) > 2)) {
                        ctx.pushHistory();
                        historyPushed = true;
                    }
                    moved = moved || historyPushed;
                    item.canvas = {
                        ...(item.canvas || {}),
                        x: nextX,
                        y: nextY,
                        width: nextPlacement.width
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

