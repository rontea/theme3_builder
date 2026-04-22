"use strict";

(function bootCmsAdmin() {
    const COLLECTION_TEMPLATES = {
        custom: {
            nameHint: "Custom Type",
            schema: {
                mode: "collection",
                fields: [
                    { name: "title", label: "Title", type: "text" }
                ]
            }
        },
        blog: {
            nameHint: "Blog Posts",
            schema: {
                mode: "collection",
                fields: [
                    { name: "title", label: "Title", type: "text" },
                    { name: "slug", label: "Slug", type: "text" },
                    { name: "excerpt", label: "Excerpt", type: "textarea" },
                    { name: "content", label: "Content", type: "richtext" },
                    { name: "cover_image", label: "Cover Image URL", type: "url" },
                    { name: "category", label: "Category", type: "text" },
                    { name: "author", label: "Author", type: "text" },
                    { name: "published_at", label: "Published Date", type: "date" },
                    { name: "active", label: "Active", type: "boolean" }
                ]
            }
        },
        news: {
            nameHint: "News",
            schema: {
                mode: "collection",
                fields: [
                    { name: "headline", label: "Headline", type: "text" },
                    { name: "slug", label: "Slug", type: "text" },
                    { name: "summary", label: "Summary", type: "textarea" },
                    { name: "content", label: "Content", type: "richtext" },
                    { name: "date", label: "News Date", type: "date" },
                    { name: "source_url", label: "Source URL", type: "url" },
                    { name: "active", label: "Active", type: "boolean" }
                ]
            }
        },
        projects: {
            nameHint: "Projects",
            schema: {
                mode: "collection",
                fields: [
                    { name: "title", label: "Project Title", type: "text" },
                    { name: "slug", label: "Slug", type: "text" },
                    { name: "category", label: "Category", type: "text" },
                    { name: "summary", label: "Summary", type: "textarea" },
                    { name: "year", label: "Year", type: "text" },
                    { name: "detail_url", label: "Detail URL", type: "url" },
                    { name: "image_src", label: "Image URL", type: "url" },
                    { name: "image_alt", label: "Image Alt", type: "text" },
                    { name: "featured", label: "Featured", type: "boolean" },
                    { name: "active", label: "Active", type: "boolean" }
                ]
            }
        },
        navigation: {
            nameHint: "Navigation",
            schema: {
                mode: "singleton",
                fields: [
                    { name: "menu_label_1", label: "Menu Label 1", type: "text" },
                    { name: "menu_url_1", label: "Menu URL 1", type: "url" },
                    { name: "menu_label_2", label: "Menu Label 2", type: "text" },
                    { name: "menu_url_2", label: "Menu URL 2", type: "url" },
                    { name: "menu_label_3", label: "Menu Label 3", type: "text" },
                    { name: "menu_url_3", label: "Menu URL 3", type: "url" },
                    { name: "menu_label_4", label: "Menu Label 4", type: "text" },
                    { name: "menu_url_4", label: "Menu URL 4", type: "url" }
                ]
            }
        }
    };

    class CmsAdminApp {
        constructor() {
            this.collections = [];
            this.entries = [];
            this.filteredEntries = [];
            this.selectedCollection = null;
            this.selectedEntryId = null;
            this.currentView = "content";
            this.rawJsonDirty = false;
            this.statusTimer = null;
            this.sitePreviewStorageKey = "themeCms.sitePreviewUrl";

            this.bindElements();
            this.bindEvents();
            this.loadConfiguration();
            this.loadCollections();
        }

        bindElements() {
            this.viewButtons = Array.from(document.querySelectorAll("[data-view]"));
            this.viewPanels = Array.from(document.querySelectorAll("[data-view-panel]"));
            this.sectionsList = document.getElementById("sectionsList");
            this.entriesList = document.getElementById("entriesList");
            this.entriesTitle = document.getElementById("entriesTitle");
            this.entriesSubtitle = document.getElementById("entriesSubtitle");
            this.editorTitle = document.getElementById("editorTitle");
            this.entriesSearch = document.getElementById("entriesSearch");

            this.entryCollection = document.getElementById("entryCollection");
            this.entryKey = document.getElementById("entryKey");
            this.entryStatus = document.getElementById("entryStatus");
            this.entrySortOrder = document.getElementById("entrySortOrder");
            this.entryData = document.getElementById("entryData");
            this.entryFormFields = document.getElementById("entryFormFields");

            this.collectionSlug = document.getElementById("collectionSlug");
            this.collectionName = document.getElementById("collectionName");
            this.collectionSchema = document.getElementById("collectionSchema");
            this.collectionTemplate = document.getElementById("collectionTemplate");
            this.collectionSingleton = document.getElementById("collectionSingleton");
            this.applyTemplateButton = document.getElementById("applyTemplate");

            this.refreshCollectionsButton = document.getElementById("refreshCollections");
            this.viewSiteButton = document.getElementById("viewSite");
            this.refreshEntriesButton = document.getElementById("refreshEntries");
            this.saveEntryButton = document.getElementById("saveEntry");
            this.newEntryButton = document.getElementById("newEntry");
            this.deleteEntryButton = document.getElementById("deleteEntry");
            this.saveCollectionButton = document.getElementById("saveCollection");
            this.newCollectionButton = document.getElementById("newCollection");
            this.deleteCollectionButton = document.getElementById("deleteCollection");

            this.publishExportButton = document.getElementById("publishExport");
            this.publishIncludeDrafts = document.getElementById("publishIncludeDrafts");
            this.publishIncludeArchived = document.getElementById("publishIncludeArchived");
            this.publishResult = document.getElementById("publishResult");
            this.sitePreviewUrlInput = document.getElementById("sitePreviewUrl");
            this.saveSitePreviewUrlButton = document.getElementById("saveSitePreviewUrl");
            this.status = document.getElementById("status");
        }

        bindEvents() {
            this.viewButtons.forEach((button) => {
                button.addEventListener("click", () => this.setView(button.dataset.view || "content"));
            });

            this.refreshCollectionsButton.addEventListener("click", () => this.loadCollections());
            this.viewSiteButton.addEventListener("click", () => this.openSitePreview());
            this.refreshEntriesButton.addEventListener("click", () => this.loadEntries());
            this.entriesSearch.addEventListener("input", () => this.applyEntrySearch());

            this.saveEntryButton.addEventListener("click", () => this.saveEntry());
            this.newEntryButton.addEventListener("click", () => this.resetEntryForm());
            this.deleteEntryButton.addEventListener("click", () => this.deleteEntry());
            this.entryData.addEventListener("input", () => {
                this.rawJsonDirty = true;
            });

            this.saveCollectionButton.addEventListener("click", () => this.saveCollection());
            this.newCollectionButton.addEventListener("click", () => this.resetCollectionForm());
            this.deleteCollectionButton.addEventListener("click", () => this.deleteCollection());
            this.applyTemplateButton.addEventListener("click", () => this.applySelectedTemplate());
            this.saveSitePreviewUrlButton.addEventListener("click", () => this.saveConfiguration());

            this.publishExportButton.addEventListener("click", () => this.runExport());
        }

        loadConfiguration() {
            const stored = String(window.localStorage.getItem(this.sitePreviewStorageKey) || "").trim();
            const fallback = `${window.location.origin}/site/`;
            this.sitePreviewUrlInput.value = stored || fallback;
        }

        saveConfiguration() {
            const value = String(this.sitePreviewUrlInput.value || "").trim();
            if (!value) {
                this.toast("Preview URL is required", "error");
                return;
            }
            window.localStorage.setItem(this.sitePreviewStorageKey, value);
            this.toast("Preview URL saved.");
        }

        openSitePreview() {
            const target = String(this.sitePreviewUrlInput?.value || "").trim() || `${window.location.origin}/site/`;
            window.open(target, "_blank", "noopener");
        }

        setView(viewName) {
            this.currentView = viewName;
            this.viewButtons.forEach((button) => {
                button.classList.toggle("is-active", button.dataset.view === viewName);
            });
            this.viewPanels.forEach((panel) => {
                panel.classList.toggle("is-active", panel.dataset.viewPanel === viewName);
            });
        }

        async requestJson(url, options = {}) {
            const response = await fetch(url, options);
            const result = await response.json();
            if (!result || !result.success) {
                throw new Error((result && result.error) || `Request failed: ${url}`);
            }
            return result;
        }

        toast(message, variant = "success") {
            this.status.textContent = message;
            this.status.hidden = false;
            this.status.className = `status is-${variant}`;
            window.clearTimeout(this.statusTimer);
            this.statusTimer = window.setTimeout(() => {
                this.status.hidden = true;
            }, 3000);
        }

        formatJson(value, fallback) {
            return JSON.stringify(value || fallback, null, 2);
        }

        parseJson(text, fallback) {
            const raw = String(text || "").trim();
            if (!raw) {
                return fallback;
            }
            return JSON.parse(raw);
        }

        escapeHtml(value) {
            return String(value || "")
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
        }

        humanizeLabel(value) {
            return String(value || "")
                .replace(/[_-]+/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .replace(/\b\w/g, (ch) => ch.toUpperCase());
        }

        getCollection(slug) {
            return this.collections.find((item) => item.slug === slug) || null;
        }

        getSchemaFields(collection) {
            const fields = Array.isArray(collection?.schema?.fields) ? collection.schema.fields : [];
            return fields.filter((field) => field && field.name);
        }

        isSingletonCollection(collection) {
            return String(collection?.schema?.mode || "").toLowerCase() === "singleton";
        }

        applySelectedTemplate() {
            const key = this.collectionTemplate.value || "custom";
            const template = COLLECTION_TEMPLATES[key] || COLLECTION_TEMPLATES.custom;
            const schema = JSON.parse(JSON.stringify(template.schema));
            schema.mode = this.collectionSingleton.checked ? "singleton" : schema.mode || "collection";
            this.collectionSchema.value = this.formatJson(schema, schema);

            if (!this.collectionName.value.trim()) {
                this.collectionName.value = template.nameHint;
            }
            if (!this.collectionSlug.value.trim() && key !== "custom") {
                this.collectionSlug.value = key === "blog" ? "blog_posts" : key;
            }
        }

        normalizeCollections() {
            return [...this.collections].sort((a, b) => {
                const left = (a.name || a.slug || "").toLowerCase();
                const right = (b.name || b.slug || "").toLowerCase();
                return left.localeCompare(right);
            });
        }

        renderSections() {
            const collections = this.normalizeCollections();
            if (collections.length === 0) {
                this.sectionsList.innerHTML = '<p class="empty">No content types yet. Go to Structure and create one.</p>';
                return;
            }

            if (!this.selectedCollection || !this.getCollection(this.selectedCollection)) {
                this.selectedCollection = collections[0].slug;
            }

            this.sectionsList.innerHTML = collections.map((collection) => {
                const isActive = collection.slug === this.selectedCollection;
                const fieldCount = this.getSchemaFields(collection).length;
                const modeLabel = this.isSingletonCollection(collection) ? "singleton" : "collection";
                const subtitle = `${modeLabel} - ${fieldCount} fields`;
                return `
                    <button class="item ${isActive ? "active" : ""}" type="button" data-section="${collection.slug}">
                        <span class="item-title">${this.escapeHtml(collection.name || this.humanizeLabel(collection.slug))}</span>
                        <span class="item-meta">${this.escapeHtml(collection.slug)}</span>
                        <span class="item-meta">${subtitle}</span>
                    </button>
                `;
            }).join("");

            this.sectionsList.querySelectorAll("[data-section]").forEach((button) => {
                button.addEventListener("click", () => this.selectCollection(button.dataset.section || ""));
            });
        }

        getEntryLabel(entry) {
            const data = entry?.data || {};
            return data.title || data.headline || data.name || entry.entryKey || `entry-${entry.id}`;
        }

        applyEntrySearch() {
            const query = String(this.entriesSearch.value || "").trim().toLowerCase();
            if (!query) {
                this.filteredEntries = [...this.entries];
                this.renderEntries();
                return;
            }

            this.filteredEntries = this.entries.filter((entry) => {
                const label = String(this.getEntryLabel(entry)).toLowerCase();
                const key = String(entry.entryKey || "").toLowerCase();
                const json = JSON.stringify(entry.data || {}).toLowerCase();
                return label.includes(query) || key.includes(query) || json.includes(query);
            });
            this.renderEntries();
        }

        renderEntries() {
            const collection = this.getCollection(this.selectedCollection);
            this.entriesTitle.textContent = collection
                ? `${collection.name || this.humanizeLabel(collection.slug)} Entries`
                : "Content Entries";
            this.entriesSubtitle.textContent = collection
                ? `Manage ${this.isSingletonCollection(collection) ? "single-record" : "multi-entry"} content for this type.`
                : "Select a content type to manage entries.";

            if (!collection) {
                this.entriesList.innerHTML = '<p class="empty">Select a content type to manage entries.</p>';
                return;
            }

            const entries = Array.isArray(this.filteredEntries) ? this.filteredEntries : [];
            if (entries.length === 0) {
                this.entriesList.innerHTML = '<p class="empty">No matching entries. Create one to start publishing content.</p>';
                return;
            }

            this.entriesList.innerHTML = entries.map((entry) => {
                const isActive = Number(entry.id) === Number(this.selectedEntryId);
                const metaText = `${entry.status || "draft"} - sort ${Number(entry.sortOrder || 0)}`;
                return `
                    <button class="item ${isActive ? "active" : ""}" type="button" data-entry-id="${entry.id}">
                        <span class="item-title">${this.escapeHtml(this.getEntryLabel(entry))}</span>
                        <span class="item-meta">${this.escapeHtml(entry.entryKey || "")}</span>
                        <span class="item-meta">${metaText}</span>
                    </button>
                `;
            }).join("");

            this.entriesList.querySelectorAll("[data-entry-id]").forEach((button) => {
                button.addEventListener("click", () => this.selectEntry(button.dataset.entryId || ""));
            });
        }

        renderDynamicEntryFields(entryData = {}) {
            const collection = this.getCollection(this.selectedCollection);
            const schemaFields = this.getSchemaFields(collection);
            if (!collection || schemaFields.length === 0) {
                this.entryFormFields.innerHTML = '<p class="empty">No schema fields found. Add fields in Structure.</p>';
                return;
            }

            this.entryFormFields.innerHTML = schemaFields.map((field) => {
                const fieldType = String(field.type || "text").toLowerCase();
                const fieldName = field.name;
                const label = field.label || this.humanizeLabel(fieldName);
                const value = entryData[fieldName];
                const wide = fieldType === "textarea" || fieldType === "richtext" || fieldType === "markdown";
                const fieldClass = `field${wide ? " full" : ""}`;

                if (fieldType === "boolean") {
                    return `
                        <label class="${fieldClass}">
                            <span>${this.escapeHtml(label)}</span>
                            <span class="field-checkbox">
                                <input type="checkbox" data-entry-field="${this.escapeHtml(fieldName)}" ${value ? "checked" : ""}>
                                <span>${this.escapeHtml(fieldName)}</span>
                            </span>
                        </label>
                    `;
                }

                if (fieldType === "textarea" || fieldType === "richtext" || fieldType === "markdown") {
                    return `
                        <label class="${fieldClass}">
                            <span>${this.escapeHtml(label)}</span>
                            <textarea data-entry-field="${this.escapeHtml(fieldName)}" rows="${fieldType === "textarea" ? 4 : 8}">${this.escapeHtml(value == null ? "" : String(value))}</textarea>
                        </label>
                    `;
                }

                const inputType = fieldType === "number"
                    ? "number"
                    : fieldType === "date"
                        ? "date"
                        : fieldType === "url"
                            ? "url"
                            : "text";

                return `
                    <label class="${fieldClass}">
                        <span>${this.escapeHtml(label)}</span>
                        <input type="${inputType}" data-entry-field="${this.escapeHtml(fieldName)}" value="${this.escapeHtml(value == null ? "" : String(value))}">
                    </label>
                `;
            }).join("");
        }

        collectEntryDataFromForm() {
            const data = {};
            const fieldElements = this.entryFormFields.querySelectorAll("[data-entry-field]");
            fieldElements.forEach((element) => {
                const key = element.getAttribute("data-entry-field");
                if (!key) return;

                if (element.type === "checkbox") {
                    data[key] = Boolean(element.checked);
                    return;
                }

                if (element.type === "number") {
                    const numeric = Number(element.value);
                    data[key] = Number.isFinite(numeric) ? numeric : 0;
                    return;
                }

                data[key] = element.value;
            });
            return data;
        }

        resetCollectionForm(collection = null) {
            if (!collection) {
                this.collectionSlug.disabled = false;
                this.collectionSlug.value = "";
                this.collectionName.value = "";
                this.collectionTemplate.value = "custom";
                this.collectionSingleton.checked = false;
                this.collectionSchema.value = this.formatJson(COLLECTION_TEMPLATES.custom.schema, COLLECTION_TEMPLATES.custom.schema);
                return;
            }

            this.collectionSlug.disabled = true;
            this.collectionSlug.value = collection.slug || "";
            this.collectionName.value = collection.name || "";
            this.collectionTemplate.value = "custom";
            this.collectionSingleton.checked = this.isSingletonCollection(collection);
            this.collectionSchema.value = this.formatJson(collection.schema || COLLECTION_TEMPLATES.custom.schema, COLLECTION_TEMPLATES.custom.schema);
        }

        resetEntryForm(entry = null) {
            const collection = this.getCollection(this.selectedCollection);
            const singleton = this.isSingletonCollection(collection);
            this.selectedEntryId = entry?.id || null;
            this.entryCollection.value = collection?.slug || "";
            this.entryKey.value = entry?.entryKey || (singleton ? "default" : "");
            this.entryKey.readOnly = singleton;
            this.entryStatus.value = entry?.status || "draft";
            this.entrySortOrder.value = String(entry?.sortOrder ?? 0);

            const payloadData = entry?.data || {};
            this.entryData.value = this.formatJson(payloadData, {});
            this.rawJsonDirty = false;
            this.renderDynamicEntryFields(payloadData);

            this.editorTitle.textContent = entry
                ? `Editing: ${this.getEntryLabel(entry)}`
                : `New ${collection?.name || "Entry"}`;
        }

        async loadCollections() {
            this.sectionsList.innerHTML = '<p class="empty">Loading content types...</p>';
            try {
                const result = await this.requestJson("/api/cms/collections");
                this.collections = Array.isArray(result?.data) ? result.data : [];
                this.renderSections();

                if (this.selectedCollection) {
                    this.resetCollectionForm(this.getCollection(this.selectedCollection));
                    await this.loadEntries();
                } else {
                    this.entries = [];
                    this.filteredEntries = [];
                    this.renderEntries();
                    this.resetCollectionForm();
                    this.resetEntryForm();
                }
            } catch (error) {
                this.sectionsList.innerHTML = `<p class="empty">Failed to load collections: ${this.escapeHtml(error.message)}</p>`;
                this.toast(`Failed to load collections: ${error.message}`, "error");
            }
        }

        async selectCollection(slug) {
            this.selectedCollection = slug || null;
            this.selectedEntryId = null;
            this.entriesSearch.value = "";
            this.renderSections();
            this.resetCollectionForm(this.getCollection(this.selectedCollection));
            await this.loadEntries();
        }

        async loadEntries() {
            if (!this.selectedCollection) {
                this.entries = [];
                this.filteredEntries = [];
                this.renderEntries();
                this.resetEntryForm();
                return;
            }

            this.entriesList.innerHTML = '<p class="empty">Loading entries...</p>';
            try {
                const result = await this.requestJson(`/api/cms/entries?collection=${encodeURIComponent(this.selectedCollection)}`);
                this.entries = Array.isArray(result?.data) ? result.data : [];
                if (this.selectedEntryId && !this.entries.some((item) => Number(item.id) === Number(this.selectedEntryId))) {
                    this.selectedEntryId = null;
                }

                this.applyEntrySearch();
                const activeEntry = this.entries.find((item) => Number(item.id) === Number(this.selectedEntryId)) || null;
                this.resetEntryForm(activeEntry);
            } catch (error) {
                this.entries = [];
                this.filteredEntries = [];
                this.entriesList.innerHTML = `<p class="empty">Failed to load entries: ${this.escapeHtml(error.message)}</p>`;
                this.toast(`Failed to load entries: ${error.message}`, "error");
            }
        }

        selectEntry(entryId) {
            const numericId = Number(entryId);
            const entry = this.entries.find((item) => Number(item.id) === numericId) || null;
            this.selectedEntryId = entry ? numericId : null;
            this.renderEntries();
            this.resetEntryForm(entry);
        }

        async saveCollection() {
            const slug = String(this.collectionSlug.value || "").trim();
            const name = String(this.collectionName.value || "").trim();
            if (!slug || !name) {
                this.toast("Collection slug and name are required", "error");
                return;
            }

            let schema;
            try {
                schema = this.parseJson(this.collectionSchema.value, COLLECTION_TEMPLATES.custom.schema) || COLLECTION_TEMPLATES.custom.schema;
            } catch (error) {
                this.toast(`Invalid schema JSON: ${error.message}`, "error");
                return;
            }
            schema.mode = this.collectionSingleton.checked ? "singleton" : (schema.mode || "collection");

            try {
                if (this.selectedCollection === slug) {
                    await this.requestJson(`/api/cms/collections/${encodeURIComponent(slug)}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name, schema })
                    });
                    this.toast(`Collection updated: ${slug}`);
                } else {
                    await this.requestJson("/api/cms/collections", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ slug, name, schema })
                    });
                    this.selectedCollection = slug;
                    this.toast(`Collection created: ${slug}`);
                }
                await this.loadCollections();
            } catch (error) {
                this.toast(`Failed to save collection: ${error.message}`, "error");
            }
        }

        async deleteCollection() {
            if (!this.selectedCollection) {
                this.toast("Select a collection first", "error");
                return;
            }

            if (!window.confirm(`Delete content type "${this.selectedCollection}"?`)) {
                return;
            }

            try {
                await this.requestJson(`/api/cms/collections/${encodeURIComponent(this.selectedCollection)}`, {
                    method: "DELETE"
                });
                this.toast(`Collection deleted: ${this.selectedCollection}`);
                this.selectedCollection = null;
                this.selectedEntryId = null;
                await this.loadCollections();
            } catch (error) {
                this.toast(`Failed to delete collection: ${error.message}`, "error");
            }
        }

        async saveEntry() {
            if (!this.selectedCollection) {
                this.toast("Select a content type first", "error");
                return;
            }

            let data = this.collectEntryDataFromForm();
            try {
                if (this.rawJsonDirty) {
                    data = this.parseJson(this.entryData.value, data) || data;
                }
            } catch (error) {
                this.toast(`Invalid JSON in advanced panel: ${error.message}`, "error");
                return;
            }

            const entryKey = String(this.entryKey.value || "").trim();
            if (!entryKey) {
                this.toast("Entry key is required", "error");
                return;
            }

            const payload = {
                collection: this.selectedCollection,
                entryKey,
                status: this.entryStatus.value || "draft",
                sortOrder: Number(this.entrySortOrder.value || 0),
                data
            };

            try {
                if (this.selectedEntryId) {
                    await this.requestJson(`/api/cms/entries/${encodeURIComponent(this.selectedEntryId)}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });
                    this.toast(`Entry updated: ${entryKey}`);
                } else {
                    const result = await this.requestJson("/api/cms/entries", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });
                    this.selectedEntryId = result?.data?.id || null;
                    this.toast(`Entry created: ${entryKey}`);
                }
                this.rawJsonDirty = false;
                await this.loadEntries();
            } catch (error) {
                this.toast(`Failed to save entry: ${error.message}`, "error");
            }
        }

        async deleteEntry() {
            if (!this.selectedEntryId) {
                this.toast("Select an entry first", "error");
                return;
            }

            if (!window.confirm("Delete this entry?")) {
                return;
            }

            try {
                await this.requestJson(`/api/cms/entries/${encodeURIComponent(this.selectedEntryId)}`, {
                    method: "DELETE"
                });
                this.toast("Entry deleted");
                this.selectedEntryId = null;
                await this.loadEntries();
            } catch (error) {
                this.toast(`Failed to delete entry: ${error.message}`, "error");
            }
        }

        async runExport() {
            try {
                const result = await this.requestJson("/api/cms/export", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        includeDrafts: Boolean(this.publishIncludeDrafts.checked),
                        includeArchived: Boolean(this.publishIncludeArchived.checked)
                    })
                });
                const data = result?.data || {};
                this.publishResult.textContent = JSON.stringify(
                    {
                        generatedAt: data.generatedAt,
                        totals: data.totals,
                        targets: data.targets,
                        manifestPath: data.manifestPath
                    },
                    null,
                    2
                );
                this.toast("Export completed.");
            } catch (error) {
                this.publishResult.textContent = `Export failed: ${error.message}`;
                this.toast(`Export failed: ${error.message}`, "error");
            }
        }
    }

    new CmsAdminApp();
})();
