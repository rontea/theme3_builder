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
                    { name: "cover_image", label: "Cover Image", type: "image" },
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
                    { name: "image_src", label: "Image", type: "image" },
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

    const FIELD_TYPES = [
        "text",
        "textarea",
        "richtext",
        "number",
        "boolean",
        "select",
        "date",
        "image",
        "url",
        "slug",
        "reference",
        "repeater"
    ];

    const FORM_FIELD_TYPES = ["text", "email", "textarea", "number", "checkbox", "select", "date", "url", "tel"];

    class CmsAdminApp {
        constructor() {
            this.collections = [];
            this.entries = [];
            this.filteredEntries = [];
            this.dashboardEntries = [];
            this.dashboardWarnings = [];
            this.dashboardError = null;
            this.dashboardLoadedAt = null;
            this.collectionEntryCounts = new Map();
            this.collectionSearchQuery = "";
            this.schemaFields = [];
            this.selectedFieldIndex = null;
            this.selectedEntryIds = new Set();
            this.mediaItems = [];
            this.filteredMediaItems = [];
            this.mediaViewMode = "grid";
            this.selectedMediaId = null;
            this.mediaPickerTarget = null;
            this.mediaPickerSelectedId = null;
            this.forms = [];
            this.filteredForms = [];
            this.selectedFormSlug = null;
            this.formFields = [];
            this.selectedFormFieldIndex = null;
            this.formSubmissions = [];
            this.filteredFormSubmissions = [];
            this.formSubmissionFilter = "all";
            this.formSubmissionSearchQuery = "";
            this.themes = [];
            this.selectedThemeId = null;
            this.themeDetailTab = "overview";
            this.templates = [];
            this.selectedTemplateId = null;
            this.templatesSearchQuery = "";
            this.cmsBuilderSearchQuery = "";
            this.cmsBuilderPartialSearchQuery = "";
            this.cmsBuilderSelectedTemplateId = null;
            this.cmsBuilderSelectedBlockId = null;
            this.cmsBuilderActiveRegion = "main";
            this.templatePreviewEntries = [];
            this.views = [];
            this.selectedViewId = null;
            this.viewsSearchQuery = "";
            this.publishChecklist = [];
            this.publishDevice = "desktop";
            this.publishStatusData = null;
            this.apiTab = "tokens";
            this.apiTokens = [];
            this.apiCollections = [];
            this.apiForms = [];
            this.apiError = null;
            this.settingsData = null;
            this.pendingImportSnapshot = null;
            this.selectedCollection = null;
            this.selectedEntryId = null;
            this.currentView = "dashboard";
            this.rawJsonDirty = false;
            this.statusTimer = null;
            this.openActionMenuId = null;
            this.confirmDialogResolver = null;
            this.lastFocusedElement = null;
            this.sitePreviewStorageKey = "themeCms.sitePreviewUrl";
            this.builderUrlStorageKey = "themeCms.builderUrl";

            this.bindElements();
            this.bindEvents();
            this.loadConfiguration();
            this.loadSettings();
            this.loadCollections();
        }

        bindElements() {
            this.viewButtons = Array.from(document.querySelectorAll("[data-view]"));
            this.viewPanels = Array.from(document.querySelectorAll("[data-view-panel]"));
            this.menuToggle = document.getElementById("menuToggle");
            this.sidebarOverlay = document.getElementById("sidebarOverlay");
            this.globalSearch = document.getElementById("globalSearch");
            this.sectionsList = document.getElementById("sectionsList");
            this.entriesList = document.getElementById("entriesList");
            this.entriesTitle = document.getElementById("entriesTitle");
            this.entriesSubtitle = document.getElementById("entriesSubtitle");
            this.editorTitle = document.getElementById("editorTitle");
            this.entriesSearch = document.getElementById("entriesSearch");
            this.entriesCollectionFilter = document.getElementById("entriesCollectionFilter");
            this.entriesStatusFilter = document.getElementById("entriesStatusFilter");
            this.entriesSort = document.getElementById("entriesSort");
            this.entriesBulkBar = document.getElementById("entriesBulkBar");
            this.entriesBulkCount = document.getElementById("entriesBulkCount");

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
            this.collectionsSearch = document.getElementById("collectionsSearch");
            this.collectionsRefreshButton = document.getElementById("collectionsRefresh");
            this.collectionsTableState = document.getElementById("collectionsTableState");
            this.collectionsTableRows = document.getElementById("collectionsTableRows");
            this.collectionFieldsList = document.getElementById("collectionFieldsList");
            this.fieldSettings = document.getElementById("fieldSettings");
            this.addFieldButton = document.getElementById("addField");

            this.refreshCollectionsButton = document.getElementById("refreshCollections");
            this.viewSiteButton = document.getElementById("viewSite");
            this.openBuilderButton = document.getElementById("openBuilder");
            this.refreshEntriesButton = document.getElementById("refreshEntries");
            this.saveEntryButton = document.getElementById("saveEntry");
            this.newEntryButton = document.getElementById("newEntry");
            this.deleteEntryButton = document.getElementById("deleteEntry");
            this.saveCollectionButton = document.getElementById("saveCollection");
            this.newCollectionButton = document.getElementById("newCollection");
            this.deleteCollectionButton = document.getElementById("deleteCollection");

            this.publishExportButton = document.getElementById("publishExport");
            this.publishRunButton = document.getElementById("publishRun");
            this.publishOpenBuildButton = document.getElementById("publishOpenBuild");
            this.publishIncludeDrafts = document.getElementById("publishIncludeDrafts");
            this.publishIncludeArchived = document.getElementById("publishIncludeArchived");
            this.publishResult = document.getElementById("publishResult");
            this.publishSteps = document.getElementById("publishSteps");
            this.publishStatusMessage = document.getElementById("publishStatusMessage");
            this.publishLastBuild = document.getElementById("publishLastBuild");
            this.publishChecklistEl = document.getElementById("publishChecklist");
            this.publishChecklistBadge = document.getElementById("publishChecklistBadge");
            this.previewContentSource = document.getElementById("previewContentSource");
            this.previewContentStatus = document.getElementById("previewContentStatus");
            this.previewActiveTheme = document.getElementById("previewActiveTheme");
            this.previewRefreshButton = document.getElementById("previewRefresh");
            this.previewDeviceButtons = Array.from(document.querySelectorAll("[data-preview-device]"));
            this.previewOpenWindowButton = document.getElementById("previewOpenWindow");
            this.previewFrame = document.getElementById("previewFrame");
            this.previewFrameShell = document.getElementById("previewFrameShell");
            this.previewAddress = document.getElementById("previewAddress");
            this.previewLoading = document.getElementById("previewLoading");
            this.sitePreviewUrlInput = document.getElementById("sitePreviewUrl");
            this.builderUrlInput = document.getElementById("builderUrl");
            this.saveSitePreviewUrlButton = document.getElementById("saveSitePreviewUrl");
            this.settingsSaveButton = document.getElementById("settingsSave");
            this.settingsState = document.getElementById("settingsState");
            this.settingsProjectName = document.getElementById("settingsProjectName");
            this.settingsActiveTheme = document.getElementById("settingsActiveTheme");
            this.settingsActiveThemePath = document.getElementById("settingsActiveThemePath");
            this.settingsLocalStoragePath = document.getElementById("settingsLocalStoragePath");
            this.settingsDatabasePath = document.getElementById("settingsDatabasePath");
            this.settingsCmsBaseUrl = document.getElementById("settingsCmsBaseUrl");
            this.settingsCmsAdminUrl = document.getElementById("settingsCmsAdminUrl");
            this.settingsContentExportPath = document.getElementById("settingsContentExportPath");
            this.settingsThemeExportPath = document.getElementById("settingsThemeExportPath");
            this.settingsApiEndpoint = document.getElementById("settingsApiEndpoint");
            this.settingsApiToken = document.getElementById("settingsApiToken");
            this.settingsExportData = document.getElementById("settingsExportData");
            this.settingsImportPick = document.getElementById("settingsImportPick");
            this.settingsImportFile = document.getElementById("settingsImportFile");
            this.settingsValidateImport = document.getElementById("settingsValidateImport");
            this.settingsRunImport = document.getElementById("settingsRunImport");
            this.settingsImportResult = document.getElementById("settingsImportResult");
            this.dashboardState = document.getElementById("dashboardState");
            this.dashboardStateMessage = document.getElementById("dashboardStateMessage");
            this.dashboardDraftCount = document.getElementById("dashboardDraftCount");
            this.dashboardPublishedCount = document.getElementById("dashboardPublishedCount");
            this.dashboardLastPublished = document.getElementById("dashboardLastPublished");
            this.dashboardActiveTheme = document.getElementById("dashboardActiveTheme");
            this.dashboardThemeBadge = document.getElementById("dashboardThemeBadge");
            this.dashboardThemeStatus = document.getElementById("dashboardThemeStatus");
            this.dashboardWarningCount = document.getElementById("dashboardWarningCount");
            this.dashboardActivityState = document.getElementById("dashboardActivityState");
            this.dashboardActivityRows = document.getElementById("dashboardActivityRows");
            this.dashboardWarningsList = document.getElementById("dashboardWarnings");
            this.dashboardActionState = document.getElementById("dashboardActionState");
            this.dashboardCreateEntryButton = document.getElementById("dashboardCreateEntry");
            this.dashboardExportThemeButton = document.getElementById("dashboardExportTheme");
            this.mediaUploadInput = document.getElementById("mediaUploadInput");
            this.mediaUploadButton = document.getElementById("mediaUpload");
            this.mediaRefreshButton = document.getElementById("mediaRefresh");
            this.mediaGridViewButton = document.getElementById("mediaGridView");
            this.mediaListViewButton = document.getElementById("mediaListView");
            this.mediaSearch = document.getElementById("mediaSearch");
            this.mediaState = document.getElementById("mediaState");
            this.mediaItemsContainer = document.getElementById("mediaItems");
            this.mediaDetail = document.getElementById("mediaDetail");
            this.mediaDetailBody = document.getElementById("mediaDetailBody");
            this.mediaDetailClose = document.getElementById("mediaDetailClose");
            this.mediaPickerModal = document.getElementById("mediaPickerModal");
            this.mediaPickerSearch = document.getElementById("mediaPickerSearch");
            this.mediaPickerUpload = document.getElementById("mediaPickerUpload");
            this.mediaPickerState = document.getElementById("mediaPickerState");
            this.mediaPickerItems = document.getElementById("mediaPickerItems");
            this.mediaPickerInsert = document.getElementById("mediaPickerInsert");
            this.formsSearch = document.getElementById("formsSearch");
            this.formsRefreshButton = document.getElementById("formsRefresh");
            this.newFormButton = document.getElementById("newForm");
            this.formsState = document.getElementById("formsState");
            this.formsRows = document.getElementById("formsRows");
            this.formBuilderTitle = document.getElementById("formBuilderTitle");
            this.formName = document.getElementById("formName");
            this.formSlug = document.getElementById("formSlug");
            this.formStatus = document.getElementById("formStatus");
            this.formFieldsList = document.getElementById("formFieldsList");
            this.formFieldSettings = document.getElementById("formFieldSettings");
            this.addFormFieldButton = document.getElementById("addFormField");
            this.formSuccessMessage = document.getElementById("formSuccessMessage");
            this.formStoreSubmissions = document.getElementById("formStoreSubmissions");
            this.formNotificationEmail = document.getElementById("formNotificationEmail");
            this.formSubmitLabel = document.getElementById("formSubmitLabel");
            this.saveFormButton = document.getElementById("saveForm");
            this.deleteFormButton = document.getElementById("deleteForm");
            this.submissionFormTitle = document.getElementById("submissionFormTitle");
            this.formSubmissionSearch = document.getElementById("formSubmissionSearch");
            this.formSubmissionFilters = document.getElementById("formSubmissionFilters");
            this.submissionsState = document.getElementById("submissionsState");
            this.submissionsRows = document.getElementById("submissionsRows");
            this.themesRefreshButton = document.getElementById("themesRefresh");
            this.themeExportOpenButton = document.getElementById("themeExportOpen");
            this.themesState = document.getElementById("themesState");
            this.themesTableRows = document.getElementById("themesTableRows");
            this.themeDetailTitle = document.getElementById("themeDetailTitle");
            this.themeDetailBadge = document.getElementById("themeDetailBadge");
            this.themeDetailContent = document.getElementById("themeDetailContent");
            this.themeTabs = Array.from(document.querySelectorAll("[data-theme-tab]"));
            this.themeExportModal = document.getElementById("themeExportModal");
            this.themeExportName = document.getElementById("themeExportName");
            this.themeExportOutput = document.getElementById("themeExportOutput");
            this.themeExportAssets = document.getElementById("themeExportAssets");
            this.themeExportFallback = document.getElementById("themeExportFallback");
            this.themeExportDraftBindings = document.getElementById("themeExportDraftBindings");
            this.themeExportOverwrite = document.getElementById("themeExportOverwrite");
            this.themeExportResult = document.getElementById("themeExportResult");
            this.themeExportRunButton = document.getElementById("themeExportRun");
            this.templatesRefreshButton = document.getElementById("templatesRefresh");
            this.templateNewButton = document.getElementById("templateNew");
            this.templatesState = document.getElementById("templatesState");
            this.templatesSearch = document.getElementById("templatesSearch");
            this.templatesTableRows = document.getElementById("templatesTableRows");
            this.templateEditorTitle = document.getElementById("templateEditorTitle");
            this.templateEditorBadge = document.getElementById("templateEditorBadge");
            this.templateId = document.getElementById("templateId");
            this.templateLabel = document.getElementById("templateLabel");
            this.templateRoutePattern = document.getElementById("templateRoutePattern");
            this.templateContentType = document.getElementById("templateContentType");
            this.templateLayoutId = document.getElementById("templateLayoutId");
            this.templateDescription = document.getElementById("templateDescription");
            this.templateSaveButton = document.getElementById("templateSave");
            this.templateDeleteButton = document.getElementById("templateDelete");
            this.templateRegions = document.getElementById("templateRegions");
            this.templatePreviewEntry = document.getElementById("templatePreviewEntry");
            this.templatePreviewButton = document.getElementById("templatePreview");
            this.templatePreviewResult = document.getElementById("templatePreviewResult");
            this.templateValidation = document.getElementById("templateValidation");
            this.cmsBuilderSearch = document.getElementById("cmsBuilderSearch");
            this.cmsBuilderLibrary = document.getElementById("cmsBuilderLibrary");
            this.cmsBlockPickerModal = document.getElementById("cmsBlockPickerModal");
            this.cmsBlockPickerSearch = document.getElementById("cmsBlockPickerSearch");
            this.cmsBlockPickerList = document.getElementById("cmsBlockPickerList");
             this.cmsBuilderTemplateSelect = document.getElementById("cmsBuilderTemplateSelect");
             this.cmsBuilderNewButton = document.getElementById("cmsBuilderNew");
             this.cmsBuilderSaveButton = document.getElementById("cmsBuilderSave");
             this.cmsBuilderViewSiteButton = document.getElementById("cmsBuilderViewSite");
             this.cmsBuilderState = document.getElementById("cmsBuilderState");
            this.cmsBuilderTitle = document.getElementById("cmsBuilderTitle");
            this.cmsBuilderRegions = document.getElementById("cmsBuilderRegions");
            this.cmsBuilderPropertiesTitle = document.getElementById("cmsBuilderPropertiesTitle");
            this.cmsBuilderProperties = document.getElementById("cmsBuilderProperties");
            this.viewsRefreshButton = document.getElementById("viewsRefresh");
            this.viewNewButton = document.getElementById("viewNew");
            this.viewsState = document.getElementById("viewsState");
            this.viewsSearch = document.getElementById("viewsSearch");
            this.viewsTableRows = document.getElementById("viewsTableRows");
            this.viewEditorTitle = document.getElementById("viewEditorTitle");
            this.viewEditorBadge = document.getElementById("viewEditorBadge");
            this.viewId = document.getElementById("viewId");
            this.viewLabel = document.getElementById("viewLabel");
            this.viewCollection = document.getElementById("viewCollection");
            this.viewStatus = document.getElementById("viewStatus");
            this.viewLimit = document.getElementById("viewLimit");
            this.viewSortField = document.getElementById("viewSortField");
            this.viewSortDirection = document.getElementById("viewSortDirection");
            this.viewFilters = document.getElementById("viewFilters");
            this.viewPager = document.getElementById("viewPager");
            this.viewDescription = document.getElementById("viewDescription");
            this.viewDisplays = document.getElementById("viewDisplays");
            this.viewAddDisplayButton = document.getElementById("viewAddDisplay");
            this.viewSaveButton = document.getElementById("viewSave");
            this.viewDeleteButton = document.getElementById("viewDelete");
            this.viewPreviewDisplay = document.getElementById("viewPreviewDisplay");
            this.viewPreviewButton = document.getElementById("viewPreview");
            this.viewPreviewState = document.getElementById("viewPreviewState");
            this.viewPreviewResults = document.getElementById("viewPreviewResults");
            this.viewValidation = document.getElementById("viewValidation");
            this.apiTabs = Array.from(document.querySelectorAll("[data-api-tab]"));
            this.apiPanelTitle = document.getElementById("apiPanelTitle");
            this.apiPanelSubtitle = document.getElementById("apiPanelSubtitle");
            this.apiPanelContent = document.getElementById("apiPanelContent");
            this.apiState = document.getElementById("apiState");
            this.apiRefreshButton = document.getElementById("apiRefresh");
            this.apiGenerateTokenButton = document.getElementById("apiGenerateToken");
            this.status = document.getElementById("status");
            this.confirmDialog = document.getElementById("confirmDialog");
            this.confirmDialogTitle = document.getElementById("confirmDialogTitle");
            this.confirmDialogDescription = document.getElementById("confirmDialogDescription");
            this.confirmDialogConfirm = document.getElementById("confirmDialogConfirm");
            this.confirmDialogCancel = document.getElementById("confirmDialogCancel");
        }

        bindEvents() {
            this.viewButtons.forEach((button) => {
                button.addEventListener("click", () => this.setView(button.dataset.view || "content"));
            });

            this.menuToggle?.addEventListener("click", () => this.toggleSidebar());
            this.sidebarOverlay?.addEventListener("click", () => this.closeSidebar());
            if (this.openBuilderButton && !this.openBuilderButton.dataset.view) {
                this.openBuilderButton.addEventListener("click", () => this.openBuilder());
            }
            this.globalSearch?.addEventListener("input", () => this.applyGlobalSearch());
            this.refreshCollectionsButton.addEventListener("click", () => this.loadCollections());
            this.viewSiteButton.addEventListener("click", () => this.openSitePreview());
            this.dashboardCreateEntryButton?.addEventListener("click", () => this.handleDashboardAction("create-entry"));
            this.dashboardExportThemeButton?.addEventListener("click", () => this.handleDashboardAction("export-theme"));
            document.querySelectorAll("[data-dashboard-action]").forEach((button) => {
                button.addEventListener("click", () => this.handleDashboardAction(button.dataset.dashboardAction || ""));
            });
            this.refreshEntriesButton.addEventListener("click", () => this.loadEntries());
            this.entriesSearch.addEventListener("input", () => this.applyEntrySearch());
            this.entriesStatusFilter?.addEventListener("change", () => this.applyEntrySearch());
            this.entriesSort?.addEventListener("change", () => this.applyEntrySearch());
            this.entriesCollectionFilter?.addEventListener("change", () => this.selectCollection(this.entriesCollectionFilter.value));
            this.entriesBulkBar?.querySelectorAll("[data-bulk-entry-action]").forEach((button) => {
                button.addEventListener("click", () => this.applyBulkEntryAction(button.dataset.bulkEntryAction || ""));
            });

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
            this.collectionsSearch?.addEventListener("input", () => {
                this.collectionSearchQuery = this.collectionsSearch.value || "";
                this.renderCollectionsTable();
            });
            this.collectionsRefreshButton?.addEventListener("click", () => this.loadCollections());
            this.collectionSchema.addEventListener("input", () => this.syncFieldBuilderFromSchemaText());
            this.addFieldButton?.addEventListener("click", () => this.addSchemaField());
            this.saveSitePreviewUrlButton?.addEventListener("click", () => this.saveConfiguration());
            this.settingsSaveButton?.addEventListener("click", () => this.saveSettings());
            this.settingsExportData?.addEventListener("click", () => this.exportSettingsData());
            this.settingsImportPick?.addEventListener("click", () => this.settingsImportFile?.click());
            this.settingsImportFile?.addEventListener("change", () => this.loadImportSnapshotFile());
            this.settingsValidateImport?.addEventListener("click", () => this.validateImportSnapshot());
            this.settingsRunImport?.addEventListener("click", () => this.importSettingsData());

            this.publishExportButton?.addEventListener("click", () => this.runExport());
            this.publishRunButton?.addEventListener("click", () => this.runPublish());
            this.publishOpenBuildButton?.addEventListener("click", () => this.openBuildFolder());
            this.previewRefreshButton?.addEventListener("click", () => this.refreshPreview());
            this.previewContentSource?.addEventListener("change", () => this.refreshPreview());
            this.previewContentStatus?.addEventListener("change", () => this.refreshPreview());
            this.previewActiveTheme?.addEventListener("change", () => this.refreshPreview());
            this.previewOpenWindowButton?.addEventListener("click", () => this.openPreviewWindow());
            this.previewDeviceButtons.forEach((button) => {
                button.addEventListener("click", () => this.setPreviewDevice(button.dataset.previewDevice || "desktop"));
            });
            this.mediaUploadButton?.addEventListener("click", () => this.mediaUploadInput?.click());
            this.mediaPickerUpload?.addEventListener("click", () => this.mediaUploadInput?.click());
            this.mediaUploadInput?.addEventListener("change", () => this.uploadSelectedMediaFiles());
            this.mediaRefreshButton?.addEventListener("click", () => this.loadMedia());
            this.mediaSearch?.addEventListener("input", () => this.applyMediaSearch());
            this.mediaGridViewButton?.addEventListener("click", () => this.setMediaViewMode("grid"));
            this.mediaListViewButton?.addEventListener("click", () => this.setMediaViewMode("list"));
            this.mediaDetailClose?.addEventListener("click", () => this.closeMediaDetail());
            this.mediaPickerSearch?.addEventListener("input", () => this.renderMediaPickerItems());
            this.mediaPickerInsert?.addEventListener("click", () => this.insertSelectedMedia());
            this.mediaPickerModal?.querySelectorAll("[data-media-picker-close]").forEach((button) => {
                button.addEventListener("click", () => this.closeMediaPicker());
            });
            this.formsSearch?.addEventListener("input", () => this.applyFormsSearch());
            this.formsRefreshButton?.addEventListener("click", () => this.loadForms());
            this.newFormButton?.addEventListener("click", () => this.resetFormBuilder());
            this.addFormFieldButton?.addEventListener("click", () => this.addFormField());
            this.saveFormButton?.addEventListener("click", () => this.saveForm());
            this.deleteFormButton?.addEventListener("click", () => this.deleteForm());
            this.formSubmissionSearch?.addEventListener("input", () => {
                this.formSubmissionSearchQuery = this.formSubmissionSearch.value || "";
                this.applySubmissionFilters();
            });
            this.formSubmissionFilters?.querySelectorAll("[data-submission-filter]").forEach((button) => {
                button.addEventListener("click", () => {
                    this.formSubmissionFilter = button.dataset.submissionFilter || "all";
                    this.applySubmissionFilters();
                });
            });
            this.themesRefreshButton?.addEventListener("click", () => this.loadThemes());
            this.themeExportOpenButton?.addEventListener("click", () => this.openThemeExportDialog());
            this.themeExportRunButton?.addEventListener("click", () => this.runThemeExport());
            this.themeExportModal?.querySelectorAll("[data-theme-export-close]").forEach((button) => {
                button.addEventListener("click", () => this.closeThemeExportDialog());
            });
            this.themeTabs.forEach((button) => {
                button.addEventListener("click", () => {
                    this.themeDetailTab = button.dataset.themeTab || "overview";
                    this.renderThemeDetail();
                });
            });
            this.templatesRefreshButton?.addEventListener("click", () => this.loadTemplates());
            this.templateNewButton?.addEventListener("click", () => this.createTemplateDraft());
            this.templatesSearch?.addEventListener("input", () => {
                this.templatesSearchQuery = this.templatesSearch.value || "";
                this.renderTemplates();
            });
            this.templateSaveButton?.addEventListener("click", () => this.saveTemplate());
            this.templateDeleteButton?.addEventListener("click", () => this.deleteTemplate());
            this.templateContentType?.addEventListener("change", () => this.loadTemplatePreviewEntries());
            this.templatePreviewButton?.addEventListener("click", () => this.previewTemplateMapping());
            this.cmsBuilderSearch?.addEventListener("input", () => {
                this.cmsBuilderSearchQuery = this.cmsBuilderSearch.value || "";
                this.renderCmsBuilderLibrary();
            });
            this.cmsBlockPickerSearch?.addEventListener("input", () => {
                this.cmsBuilderPartialSearchQuery = this.cmsBlockPickerSearch.value || "";
                this.renderCmsBlockPicker();
            });
            this.cmsBlockPickerModal?.querySelectorAll("[data-cms-block-picker-close]").forEach((button) => {
                button.addEventListener("click", () => this.closeCmsBlockPicker());
            });
            this.cmsBuilderTemplateSelect?.addEventListener("change", () => {
                this.cmsBuilderSelectedTemplateId = this.cmsBuilderTemplateSelect.value || null;
                this.cmsBuilderSelectedBlockId = null;
                this.renderCmsBuilder();
            });
             this.cmsBuilderNewButton?.addEventListener("click", () => this.createCmsBuilderDraft());
             this.cmsBuilderSaveButton?.addEventListener("click", () => this.saveCmsBuilderLayout());
             this.cmsBuilderViewSiteButton?.addEventListener("click", () => this.viewCmsBuilderSite());
             this.viewsRefreshButton?.addEventListener("click", () => this.loadViews());
            this.viewNewButton?.addEventListener("click", () => this.createViewDraft());
            this.viewsSearch?.addEventListener("input", () => {
                this.viewsSearchQuery = this.viewsSearch.value || "";
                this.renderViews();
            });
            this.viewCollection?.addEventListener("change", () => {
                this.populateViewFieldOptions();
                this.renderViewDisplays(this.getSelectedView());
            });
            this.viewAddDisplayButton?.addEventListener("click", () => this.addViewDisplay());
            this.viewSaveButton?.addEventListener("click", () => this.saveView());
            this.viewDeleteButton?.addEventListener("click", () => this.deleteView());
            this.viewPreviewButton?.addEventListener("click", () => this.previewView());
            this.apiTabs.forEach((button) => {
                button.addEventListener("click", () => {
                    this.apiTab = button.dataset.apiTab || "tokens";
                    this.renderApiConsole();
                });
            });
            this.apiRefreshButton?.addEventListener("click", () => this.loadApiConsoleData());
            this.apiGenerateTokenButton?.addEventListener("click", () => this.generateApiToken());
            this.confirmDialogConfirm?.addEventListener("click", () => this.resolveConfirmDialog(true));
            this.confirmDialog?.querySelectorAll("[data-confirm-cancel]").forEach((button) => {
                button.addEventListener("click", () => this.resolveConfirmDialog(false));
            });
            document.addEventListener("click", (event) => {
                if (!event.target.closest(".action-menu")) {
                    this.closeActionMenus();
                }
            });
            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape") {
                    this.closeActionMenus();
                    if (this.confirmDialog && !this.confirmDialog.hidden) {
                        this.resolveConfirmDialog(false);
                    } else if (this.themeExportModal && !this.themeExportModal.hidden) {
                        this.closeThemeExportDialog();
                    } else if (this.mediaPickerModal && !this.mediaPickerModal.hidden) {
                        this.closeMediaPicker();
                    } else if (this.cmsBlockPickerModal && !this.cmsBlockPickerModal.hidden) {
                        this.closeCmsBlockPicker();
                    } else if (this.mediaDetail && !this.mediaDetail.hidden && window.matchMedia("(max-width: 820px)").matches) {
                        this.closeMediaDetail();
                    }
                }
                this.trapModalFocus(event);
            });
            this.bindRovingTabs(this.themeTabs, (button) => {
                this.themeDetailTab = button.dataset.themeTab || "overview";
                this.renderThemeDetail();
            });
            this.bindRovingTabs(this.apiTabs, (button) => {
                this.apiTab = button.dataset.apiTab || "tokens";
                this.renderApiConsole();
            });
        }

        loadConfiguration() {
            const stored = String(window.localStorage.getItem(this.sitePreviewStorageKey) || "").trim();
            const fallback = `${window.location.origin}/site/`;
            this.sitePreviewUrlInput.value = stored || fallback;

            const builderUrl = String(window.localStorage.getItem(this.builderUrlStorageKey) || "").trim();
            this.builderUrlInput.value = builderUrl || this.getDefaultBuilderUrl();
        }

        saveConfiguration() {
            const value = String(this.sitePreviewUrlInput.value || "").trim();
            if (!value) {
                this.toast("Preview URL is required", "error");
                return;
            }
            const builderUrl = String(this.builderUrlInput.value || "").trim();
            if (!builderUrl) {
                this.toast("Builder URL is required", "error");
                return;
            }
            window.localStorage.setItem(this.sitePreviewStorageKey, value);
            window.localStorage.setItem(this.builderUrlStorageKey, builderUrl);
            this.toast("CMS URLs saved.");
        }

        setSettingsState(message, variant = "success", hidden = false) {
            if (!this.settingsState) {
                return;
            }
            this.settingsState.hidden = hidden;
            this.settingsState.className = `state-banner is-${variant}`;
            this.settingsState.innerHTML = `<span>${this.escapeHtml(message)}</span>`;
        }

        async loadSettings() {
            this.setSettingsState("Loading settings...", "loading");
            try {
                const result = await this.requestJson("/api/cms/settings");
                this.settingsData = result?.data || {};
                this.renderSettings();
                this.setSettingsState("Settings loaded.", "success");
            } catch (error) {
                this.setSettingsState(`Settings failed to load: ${error.message}`, "error");
            }
        }

        renderSettings() {
            const data = this.settingsData || {};
            const settings = data.settings || {};
            const paths = data.paths || {};
            const themes = Array.isArray(data.themes) ? data.themes : [];
            const storedSitePreviewUrl = String(window.localStorage.getItem(this.sitePreviewStorageKey) || "").trim();
            if (this.settingsProjectName) this.settingsProjectName.value = settings.projectName || "";
            if (this.settingsLocalStoragePath) this.settingsLocalStoragePath.value = settings.localStoragePath || paths.dataRoot || "";
            if (this.settingsDatabasePath) this.settingsDatabasePath.value = paths.databasePath || "";
            if (this.settingsCmsBaseUrl) this.settingsCmsBaseUrl.value = settings.cmsBaseUrl || window.location.origin;
            if (this.settingsCmsAdminUrl) this.settingsCmsAdminUrl.value = settings.cmsAdminUrl || `${window.location.origin}/cms`;
            if (this.sitePreviewUrlInput) this.sitePreviewUrlInput.value = storedSitePreviewUrl || this.sitePreviewUrlInput.value || `${window.location.origin}/site/`;
            if (this.builderUrlInput) this.builderUrlInput.value = settings.builderPreviewUrl || this.builderUrlInput.value || this.getDefaultBuilderUrl();
            if (settings.builderPreviewUrl) {
                window.localStorage.setItem(this.builderUrlStorageKey, settings.builderPreviewUrl);
            }
            if (this.settingsContentExportPath) this.settingsContentExportPath.value = settings.contentExportPath || paths.exportPath || "";
            if (this.settingsThemeExportPath) this.settingsThemeExportPath.value = settings.themeExportPath || paths.themeExportPath || "";
            if (this.settingsActiveThemePath) this.settingsActiveThemePath.value = settings.activeThemePath || paths.activeThemePath || "";
            if (this.settingsApiEndpoint) this.settingsApiEndpoint.value = settings.apiEndpoint || `${window.location.origin}/api`;
            if (this.settingsApiToken) this.settingsApiToken.value = settings.apiToken || "";
            if (this.settingsActiveTheme) {
                const fallbackTheme = settings.activeTheme || "theme-3";
                const options = themes.length
                    ? themes.map((theme) => ({ value: theme.id || theme.slug, label: theme.name || theme.slug }))
                    : [{ value: fallbackTheme, label: fallbackTheme }];
                this.settingsActiveTheme.innerHTML = options.map((item) => `
                    <option value="${this.escapeAttribute(item.value)}">${this.escapeHtml(item.label)}</option>
                `).join("");
                this.settingsActiveTheme.value = fallbackTheme;
            }
        }

        collectSettingsPayload() {
            return {
                projectName: this.settingsProjectName?.value || "",
                cmsBaseUrl: this.settingsCmsBaseUrl?.value || "",
                cmsAdminUrl: this.settingsCmsAdminUrl?.value || "",
                builderPreviewUrl: this.builderUrlInput?.value || "",
                localStoragePath: this.settingsLocalStoragePath?.value || "",
                activeTheme: this.settingsActiveTheme?.value || "theme-3",
                activeThemePath: this.settingsActiveThemePath?.value || "",
                contentExportPath: this.settingsContentExportPath?.value || "",
                themeExportPath: this.settingsThemeExportPath?.value || "",
                apiEndpoint: this.settingsApiEndpoint?.value || "",
                apiToken: this.settingsApiToken?.value || ""
            };
        }

        async saveSettings() {
            if (!this.settingsSaveButton) {
                return;
            }
            this.setButtonLoading(this.settingsSaveButton, true, "Saving...");
            try {
                const payload = this.collectSettingsPayload();
                const result = await this.requestJson("/api/cms/settings", {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                this.settingsData = {
                    ...(this.settingsData || {}),
                    ...(result?.data || {})
                };
                window.localStorage.setItem(this.sitePreviewStorageKey, this.sitePreviewUrlInput?.value || "");
                window.localStorage.setItem(this.builderUrlStorageKey, payload.builderPreviewUrl);
                window.localStorage.setItem("themeCms.activeTheme", payload.activeTheme);
                this.setSettingsState("Settings saved successfully.", "success");
                this.toast("Settings saved.");
            } catch (error) {
                const details = error.details?.errors || [];
                const detailText = details.length ? ` ${details.map((item) => item.message).join(" ")}` : "";
                this.setSettingsState(`Settings validation warning:${detailText || ` ${error.message}`}`, "error");
                this.toast(`Settings failed: ${error.message}`, "error");
            } finally {
                this.setButtonLoading(this.settingsSaveButton, false);
            }
        }

        async exportSettingsData() {
            this.setButtonLoading(this.settingsExportData, true, "Exporting...");
            try {
                const result = await this.requestJson("/api/cms/settings/export-data", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ includeDrafts: true, includeArchived: true })
                });
                const snapshot = result?.data || {};
                if (this.settingsImportResult) {
                    this.settingsImportResult.textContent = JSON.stringify({
                        generatedAt: snapshot.generatedAt,
                        collections: snapshot.collections?.length || 0,
                        entries: Object.values(snapshot.entriesByCollection || {}).reduce((sum, entries) => sum + (Array.isArray(entries) ? entries.length : 0), 0),
                        forms: snapshot.forms?.length || 0
                    }, null, 2);
                }
                const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = `theme-cms-snapshot-${Date.now()}.json`;
                link.click();
                URL.revokeObjectURL(url);
                this.pendingImportSnapshot = snapshot;
                this.setSettingsState("CMS data snapshot generated and staged for validation.", "success");
                this.toast("CMS data exported.");
            } catch (error) {
                this.setSettingsState(`CMS data export failed: ${error.message}`, "error");
                this.toast(`CMS data export failed: ${error.message}`, "error");
            } finally {
                this.setButtonLoading(this.settingsExportData, false);
            }
        }

        async loadImportSnapshotFile() {
            const file = this.settingsImportFile?.files?.[0];
            if (!file) {
                return;
            }
            try {
                const text = await file.text();
                this.pendingImportSnapshot = JSON.parse(text);
                if (this.settingsImportResult) {
                    this.settingsImportResult.textContent = `Loaded ${file.name}. Run validation before import.`;
                }
                this.setSettingsState(`Import file loaded: ${file.name}`, "success");
            } catch (error) {
                this.pendingImportSnapshot = null;
                this.setSettingsState(`Import file could not be read: ${error.message}`, "error");
                this.toast("Import file is invalid JSON.", "error");
            }
        }

        async validateImportSnapshot() {
            if (!this.pendingImportSnapshot) {
                this.setSettingsState("Choose or export a CMS snapshot before validating.", "warning");
                return;
            }
            try {
                const result = await this.requestJson("/api/cms/settings/validate-import", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ snapshot: this.pendingImportSnapshot })
                });
                if (this.settingsImportResult) {
                    this.settingsImportResult.textContent = JSON.stringify(result.data, null, 2);
                }
                this.setSettingsState(result.data?.valid ? "Imported schema/content is valid." : "Imported schema/content has validation errors.", result.data?.valid ? "success" : "error");
            } catch (error) {
                this.setSettingsState(`Import validation failed: ${error.message}`, "error");
            }
        }

        async importSettingsData() {
            if (!this.pendingImportSnapshot) {
                this.setSettingsState("Choose or export a CMS snapshot before importing.", "warning");
                return;
            }
            const confirmed = await this.confirmAction({
                title: "Import CMS Snapshot",
                description: "Existing matching collections and entries will be updated.",
                confirmLabel: "Import",
                destructive: false
            });
            if (!confirmed) {
                return;
            }
            try {
                const result = await this.requestJson("/api/cms/settings/import-data", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ snapshot: this.pendingImportSnapshot })
                });
                if (this.settingsImportResult) {
                    this.settingsImportResult.textContent = JSON.stringify(result.data, null, 2);
                }
                this.setSettingsState("CMS snapshot imported successfully.", "success");
                this.toast("CMS snapshot imported.");
                await this.loadCollections();
            } catch (error) {
                this.setSettingsState(`CMS import failed: ${error.message}`, "error");
                this.toast(`CMS import failed: ${error.message}`, "error");
            }
        }

        openSitePreview() {
            const target = String(this.sitePreviewUrlInput?.value || "").trim() || `${window.location.origin}/site/`;
            window.open(target, "_blank", "noopener");
        }

        async openBuilder() {
            const target = this.getBuilderTargetUrl();
            if (!target) {
                this.toast("Builder URL is invalid. Update it in Settings.", "error");
                return { opened: false, target: "", available: false };
            }

            const popup = window.open(target, "_blank");
            this.closeSidebar();
            if (!popup) {
                this.toast(`Popup blocked. Open Builder manually at ${target}`, "error");
                return { opened: false, target, available: null };
            }
            popup.opener = null;

            const status = await this.checkBuilderStatus(target);
            if (!status.available) {
                const port = status.port || "8000";
                this.toast(`Builder may not be running at ${target}. Start it with: node bin\\cli.js builder --port ${port} --open false`, "warning");
            }
            return { opened: true, target, available: status.available };
        }

        async checkBuilderStatus(target) {
            let timeout = null;
            try {
                const url = new URL(target);
                const controller = new AbortController();
                timeout = window.setTimeout(() => controller.abort(), 1800);
                const response = await fetch(`${url.origin}/api/builder/config`, {
                    method: "GET",
                    signal: controller.signal
                });
                return {
                    available: response.ok,
                    port: url.port || (url.protocol === "https:" ? "443" : "80")
                };
            } catch (error) {
                try {
                    const url = new URL(target);
                    return {
                        available: false,
                        port: url.port || (url.protocol === "https:" ? "443" : "80"),
                        error
                    };
                } catch (urlError) {
                    return {
                        available: false,
                        port: "",
                        error: urlError
                    };
                }
            } finally {
                if (timeout) {
                    window.clearTimeout(timeout);
                }
            }
        }

        getBuilderTargetUrl() {
            const raw = String(this.builderUrlInput?.value || window.localStorage.getItem(this.builderUrlStorageKey) || "").trim() || this.getDefaultBuilderUrl();
            try {
                const url = new URL(raw);
                if (!/^https?:$/i.test(url.protocol)) {
                    return "";
                }
                return url.toString().replace(/\/$/, "");
            } catch (_error) {
                return "";
            }
        }

        getDefaultBuilderUrl() {
            const url = new URL(window.location.origin);
            const port = Number(url.port || (url.protocol === "https:" ? 443 : 80));
            if (port === 8100) {
                url.port = "8000";
            } else if (port === 3100) {
                url.port = "3000";
            } else if (port > 100) {
                url.port = String(port - 100);
            } else {
                url.port = "3000";
            }
            return url.toString().replace(/\/$/, "");
        }

        toggleSidebar() {
            const isOpen = document.body.classList.toggle("sidebar-open");
            this.menuToggle?.setAttribute("aria-expanded", String(isOpen));
            if (this.sidebarOverlay) {
                this.sidebarOverlay.hidden = !isOpen;
            }
        }

        closeSidebar() {
            document.body.classList.remove("sidebar-open");
            this.menuToggle?.setAttribute("aria-expanded", "false");
            if (this.sidebarOverlay) {
                this.sidebarOverlay.hidden = true;
            }
        }

        setView(viewName) {
            this.currentView = viewName;
            this.viewButtons.forEach((button) => {
                if (button.classList.contains("nav-item")) {
                    button.classList.toggle("is-active", button.dataset.view === viewName);
                }
            });
            this.viewPanels.forEach((panel) => {
                panel.classList.toggle("is-active", panel.dataset.viewPanel === viewName);
            });
            this.closeSidebar();
            if (viewName === "media" && this.mediaItems.length === 0) {
                this.loadMedia();
            }
            if (viewName === "forms" && this.forms.length === 0) {
                this.loadForms();
            }
            if (viewName === "themes" && this.themes.length === 0) {
                this.loadThemes();
            }
            if (viewName === "templates" && this.templates.length === 0) {
                this.loadTemplates();
            }
            if (viewName === "builder") {
                this.loadCmsBuilder();
            }
            if (viewName === "views" && this.views.length === 0) {
                this.loadViews();
            }
            if (viewName === "publish") {
                this.loadPublishStatus();
            }
            if (viewName === "api") {
                this.loadApiConsoleData();
            }
            if (viewName === "settings") {
                this.loadSettings();
            }
        }

        applyGlobalSearch() {
            const query = String(this.globalSearch?.value || "").trim();
            this.entriesSearch.value = query;
            this.applyEntrySearch();
        }

        setDashboardState(variant, message) {
            if (!this.dashboardState || !this.dashboardStateMessage) {
                return;
            }
            this.dashboardState.className = `state-banner is-${variant}`;
            this.dashboardStateMessage.textContent = message;
            this.dashboardState.hidden = false;
        }

        setDashboardAction(message, variant = "success") {
            if (!this.dashboardActionState) {
                return;
            }
            this.dashboardActionState.hidden = false;
            this.dashboardActionState.className = `inline-state is-${variant}`;
            this.dashboardActionState.textContent = message;
        }

        updateDashboard() {
            const entries = Array.isArray(this.dashboardEntries) ? this.dashboardEntries : [];
            const draftCount = entries.filter((entry) => entry.status === "draft").length;
            const publishedEntries = entries.filter((entry) => entry.status === "published");
            const warningCount = Array.isArray(this.dashboardWarnings) ? this.dashboardWarnings.length : 0;

            this.dashboardDraftCount.textContent = String(draftCount);
            this.dashboardPublishedCount.textContent = String(publishedEntries.length);
            this.dashboardWarningCount.textContent = String(warningCount);

            const lastPublished = this.getMostRecentEntry(publishedEntries);
            this.dashboardLastPublished.textContent = lastPublished
                ? `Last: ${this.formatRelativeTime(lastPublished.updatedAt || lastPublished.createdAt)}`
                : "No published entries yet";

            const activeTheme = String(window.localStorage.getItem("themeCms.activeTheme") || "").trim() || "Theme 3";
            this.dashboardActiveTheme.textContent = activeTheme;
            this.dashboardThemeBadge.textContent = "Local";
            this.dashboardThemeStatus.textContent = "Theme export pending";

            if (this.dashboardError) {
                this.setDashboardState("error", `Dashboard failed to load: ${this.dashboardError.message}`);
            } else if (!this.dashboardLoadedAt) {
                this.setDashboardState("loading", "Loading dashboard data...");
            } else {
                this.setDashboardState("success", `Dashboard updated ${this.formatRelativeTime(this.dashboardLoadedAt)}.`);
            }

            this.renderDashboardActivity();
            this.renderDashboardWarnings();
        }

        getMostRecentEntry(entries) {
            return [...entries].sort((a, b) => {
                const left = Date.parse(a.updatedAt || a.createdAt || "") || 0;
                const right = Date.parse(b.updatedAt || b.createdAt || "") || 0;
                return right - left;
            })[0] || null;
        }

        formatRelativeTime(value) {
            const timestamp = Date.parse(value || "");
            if (!timestamp) {
                return "unknown";
            }
            const deltaSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
            if (deltaSeconds < 60) return "just now";
            const deltaMinutes = Math.floor(deltaSeconds / 60);
            if (deltaMinutes < 60) return `${deltaMinutes}m ago`;
            const deltaHours = Math.floor(deltaMinutes / 60);
            if (deltaHours < 24) return `${deltaHours}h ago`;
            const deltaDays = Math.floor(deltaHours / 24);
            if (deltaDays < 30) return `${deltaDays}d ago`;
            return new Date(timestamp).toLocaleDateString();
        }

        getStatusBadgeClass(status) {
            const normalized = String(status || "draft").toLowerCase();
            if (normalized === "published") return "status-badge is-success";
            if (normalized === "archived") return "status-badge is-muted";
            return "status-badge is-warning";
        }

        formatBytes(bytes) {
            const value = Number(bytes || 0);
            if (!value) return "0 Bytes";
            const units = ["Bytes", "KB", "MB", "GB"];
            const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
            return `${(value / Math.pow(1024, index)).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
        }

        getMediaName(item) {
            return item?.fileName || item?.name || "asset";
        }

        isImageMedia(item) {
            return String(item?.mimeType || item?.fileType || "").startsWith("image/");
        }

        getMediaType(item) {
            return String(item?.mimeType || item?.fileType || "file").split("/")[1] || "file";
        }

        renderDashboardActivity() {
            if (!this.dashboardActivityRows || !this.dashboardActivityState) {
                return;
            }

            if (this.dashboardError) {
                this.dashboardActivityRows.innerHTML = "";
                this.dashboardActivityState.innerHTML = `
                    <div class="error-state">
                        <strong>Could not load recent activity.</strong>
                        <span>${this.escapeHtml(this.dashboardError.message)}</span>
                        <button class="btn btn-secondary" type="button" data-dashboard-retry>Try Again</button>
                    </div>
                `;
                this.dashboardActivityState.hidden = false;
                this.dashboardActivityState.querySelector("[data-dashboard-retry]")?.addEventListener("click", () => this.loadDashboardData());
                return;
            }

            const recentEntries = [...this.dashboardEntries]
                .sort((a, b) => {
                    const left = Date.parse(a.updatedAt || a.createdAt || "") || 0;
                    const right = Date.parse(b.updatedAt || b.createdAt || "") || 0;
                    return right - left;
                })
                .slice(0, 8);

            if (recentEntries.length === 0) {
                this.dashboardActivityRows.innerHTML = "";
                this.dashboardActivityState.innerHTML = `
                    <div class="empty-state">
                        <strong>No recent activity</strong>
                        <span>Create your first collection and entry to start publishing content.</span>
                        <button class="btn btn-primary" type="button" data-dashboard-action="create-collection">Create Collection</button>
                    </div>
                `;
                this.dashboardActivityState.hidden = false;
                this.dashboardActivityState.querySelector("[data-dashboard-action]")?.addEventListener("click", () => this.handleDashboardAction("create-collection"));
                return;
            }

            this.dashboardActivityState.hidden = true;
            this.dashboardActivityRows.innerHTML = recentEntries.map((entry) => {
                const collection = this.getCollection(entry.collection);
                const title = this.getEntryLabel(entry);
                return `
                    <tr>
                        <td data-label="Entry Title"><strong>${this.escapeHtml(title)}</strong><span class="table-subtext">${this.escapeHtml(entry.entryKey || "")}</span></td>
                        <td data-label="Collection">${this.escapeHtml(collection?.name || this.humanizeLabel(entry.collection))}</td>
                        <td data-label="Updated">${this.escapeHtml(this.formatRelativeTime(entry.updatedAt || entry.createdAt))}</td>
                        <td data-label="Status"><span class="${this.getStatusBadgeClass(entry.status)}">${this.escapeHtml(String(entry.status || "draft").toUpperCase())}</span></td>
                    </tr>
                `;
            }).join("");
        }

        renderDashboardWarnings() {
            if (!this.dashboardWarningsList) {
                return;
            }

            if (this.dashboardError) {
                this.dashboardWarningsList.innerHTML = `<div class="warning-item is-danger"><strong>API Error</strong><span>${this.escapeHtml(this.dashboardError.message)}</span></div>`;
                return;
            }

            if (!this.dashboardWarnings.length) {
                this.dashboardWarningsList.innerHTML = '<div class="success-state"><strong>No validation warnings</strong><span>Collections and entries loaded without dashboard-level issues.</span></div>';
                return;
            }

            this.dashboardWarningsList.innerHTML = this.dashboardWarnings.map((warning) => `
                <div class="warning-item ${warning.severity === "danger" ? "is-danger" : ""}">
                    <strong>${this.escapeHtml(warning.title)}</strong>
                    <span>${this.escapeHtml(warning.message)}</span>
                </div>
            `).join("");
        }

        buildDashboardWarnings(entryResults = []) {
            const warnings = [];

            if (this.collections.length === 0) {
                warnings.push({
                    title: "No collections",
                    message: "Create at least one collection before building CMS-backed pages.",
                    severity: "danger"
                });
            }

            this.collections.forEach((collection) => {
                const fields = this.getSchemaFields(collection);
                if (fields.length === 0) {
                    warnings.push({
                        title: "Empty schema",
                        message: `${collection.name || collection.slug} has no fields.`,
                        severity: "danger"
                    });
                }

                const invalidFields = fields.filter((field) => !field.name || !field.type);
                if (invalidFields.length > 0) {
                    warnings.push({
                        title: "Invalid fields",
                        message: `${collection.name || collection.slug} has ${invalidFields.length} field definition issue(s).`,
                        severity: "danger"
                    });
                }
            });

            entryResults
                .filter((result) => result.status === "rejected")
                .forEach((result) => {
                    warnings.push({
                        title: "Entry load failed",
                        message: result.reason?.message || "A collection could not load entries.",
                        severity: "danger"
                    });
                });

            this.dashboardEntries.forEach((entry) => {
                if (!["draft", "published", "archived"].includes(String(entry.status || "").toLowerCase())) {
                    warnings.push({
                        title: "Invalid entry status",
                        message: `${entry.entryKey || `Entry ${entry.id}`} has unsupported status "${entry.status}".`,
                        severity: "danger"
                    });
                }
            });

            this.dashboardWarnings = warnings;
        }

        async loadDashboardData() {
            this.dashboardError = null;
            this.dashboardLoadedAt = null;
            this.dashboardEntries = [];
            this.dashboardWarnings = [];
            this.collectionEntryCounts = new Map();
            this.setDashboardState("loading", "Loading dashboard data...");
            this.updateDashboard();

            if (this.collections.length === 0) {
                this.buildDashboardWarnings([]);
                this.dashboardLoadedAt = new Date().toISOString();
                this.updateDashboard();
                return;
            }

            const entryResults = await Promise.allSettled(
                this.collections.map(async (collection) => {
                    const result = await this.requestJson(`/api/cms/entries?collection=${encodeURIComponent(collection.slug)}`);
                    return (Array.isArray(result?.data) ? result.data : []).map((entry) => ({
                        ...entry,
                        collection: entry.collection || collection.slug
                    }));
                })
            );

            this.dashboardEntries = entryResults
                .filter((result) => result.status === "fulfilled")
                .flatMap((result) => result.value);
            entryResults.forEach((result, index) => {
                const slug = this.collections[index]?.slug;
                if (slug && result.status === "fulfilled") {
                    this.collectionEntryCounts.set(slug, result.value.length);
                }
            });

            const failed = entryResults.find((result) => result.status === "rejected");
            if (failed) {
                this.dashboardError = failed.reason instanceof Error ? failed.reason : new Error("Some entries failed to load");
            }

            this.buildDashboardWarnings(entryResults);
            this.dashboardLoadedAt = new Date().toISOString();
            this.updateDashboard();
            this.renderCollectionsTable();
        }

        getFormStatusBadgeClass(status) {
            const normalized = String(status || "draft").toLowerCase();
            if (normalized === "active") return "status-badge is-success";
            if (normalized === "archived") return "status-badge is-muted";
            return "status-badge is-warning";
        }

        getSubmissionStatusBadgeClass(status) {
            const normalized = String(status || "new").toLowerCase();
            if (normalized === "reviewed") return "status-badge is-success";
            if (normalized === "archived") return "status-badge is-muted";
            return "status-badge is-info";
        }

        getDefaultFormDefinition() {
            return {
                fields: [
                    { id: "name", name: "name", label: "Full Name", type: "text", required: true, placeholder: "Jane Doe", validation: "" },
                    { id: "email", name: "email", label: "Email Address", type: "email", required: true, placeholder: "jane@example.com", validation: "email" },
                    { id: "message", name: "message", label: "Message", type: "textarea", required: true, placeholder: "How can we help?", validation: "" }
                ],
                settings: {
                    successMessage: "Thank you. Your submission has been received.",
                    storeSubmissions: true,
                    notificationEmail: "",
                    submitButtonLabel: "Send Message"
                }
            };
        }

        async loadForms() {
            if (this.formsState) {
                this.formsState.hidden = false;
                this.formsState.innerHTML = '<div class="loading-state"><span class="spinner" aria-hidden="true"></span><span>Loading forms...</span></div>';
            }
            try {
                const result = await this.requestJson("/api/cms/forms");
                this.forms = Array.isArray(result?.data) ? result.data : [];
                this.applyFormsSearch();
                if (!this.selectedFormSlug && this.forms.length) {
                    this.selectForm(this.forms[0].slug, { skipSubmissions: false });
                } else if (this.selectedFormSlug) {
                    const current = this.forms.find((form) => form.slug === this.selectedFormSlug);
                    if (current) {
                        this.resetFormBuilder(current);
                    } else {
                        this.resetFormBuilder();
                    }
                } else {
                    this.resetFormBuilder();
                }
            } catch (error) {
                if (this.formsRows) this.formsRows.innerHTML = "";
                if (this.formsState) {
                    this.formsState.hidden = false;
                    this.formsState.innerHTML = `
                        <div class="error-state">
                            <strong>Failed to load forms</strong>
                            <span>${this.escapeHtml(error.message)}</span>
                            <button class="btn btn-secondary" type="button" data-forms-retry>Try Again</button>
                        </div>
                    `;
                    this.formsState.querySelector("[data-forms-retry]")?.addEventListener("click", () => this.loadForms());
                }
                this.toast(`Failed to load forms: ${error.message}`, "error");
            }
        }

        applyFormsSearch() {
            const query = String(this.formsSearch?.value || "").trim().toLowerCase();
            this.filteredForms = this.forms.filter((form) => {
                return !query
                    || String(form.name || "").toLowerCase().includes(query)
                    || String(form.slug || "").toLowerCase().includes(query)
                    || String(form.status || "").toLowerCase().includes(query);
            });
            this.renderFormsList();
        }

        renderFormsList() {
            if (!this.formsRows || !this.formsState) return;
            const items = this.filteredForms || [];
            if (!items.length) {
                this.formsRows.innerHTML = "";
                this.formsState.hidden = false;
                this.formsState.innerHTML = `
                    <div class="empty-state">
                        <strong>${this.forms.length ? "No matching forms" : "No forms yet"}</strong>
                        <span>${this.forms.length ? "Try a different search term." : "Create a form to start collecting submissions."}</span>
                        <button class="btn btn-primary" type="button" data-empty-create-form>Create Form</button>
                    </div>
                `;
                this.formsState.querySelector("[data-empty-create-form]")?.addEventListener("click", () => this.resetFormBuilder());
                return;
            }

            this.formsState.hidden = true;
            this.formsRows.innerHTML = items.map((form) => {
                const unread = Number(form.unread || 0);
                return `
                    <tr class="${form.slug === this.selectedFormSlug ? "is-selected" : ""}">
                        <td data-label="Form Name">
                            <button class="table-link" type="button" data-form-edit="${this.escapeHtml(form.slug)}">${this.escapeHtml(form.name || this.humanizeLabel(form.slug))}</button>
                            <span class="table-subtext">${this.escapeHtml(form.slug)}</span>
                        </td>
                        <td data-label="Status"><span class="${this.getFormStatusBadgeClass(form.status)}">${this.escapeHtml(String(form.status || "draft").toUpperCase())}</span></td>
                        <td data-label="Submissions">${Number(form.submissions || 0).toLocaleString()}${unread ? ` <span class="status-badge is-info">${unread} NEW</span>` : ""}</td>
                        <td data-label="Last Activity">${this.escapeHtml(this.formatRelativeTime(form.lastActivity || form.updatedAt || form.createdAt))}</td>
                        <td data-label="Actions">
                            ${this.createActionMenuHtml(`form:${form.slug}`, [
                                { action: "submissions", label: "Submissions", icon: "S" },
                                { action: "duplicate", label: "Duplicate", icon: "+" }
                            ])}
                        </td>
                    </tr>
                `;
            }).join("");
            this.formsRows.querySelectorAll("[data-form-edit]").forEach((button) => {
                button.addEventListener("click", () => this.selectForm(button.dataset.formEdit || ""));
            });
            this.bindActionMenus(this.formsRows, {
                submissions: (menuId) => this.selectForm(menuId.replace(/^form:/, ""), { focusSubmissions: true }),
                duplicate: (menuId, button) => this.duplicateForm(menuId.replace(/^form:/, ""), button)
            });
        }

        async selectForm(slug, options = {}) {
            const form = this.forms.find((item) => item.slug === slug);
            if (!form) return;
            this.selectedFormSlug = form.slug;
            this.resetFormBuilder(form);
            this.renderFormsList();
            if (!options.skipSubmissions) {
                await this.loadFormSubmissions(form.slug);
            }
            if (options.focusSubmissions) {
                this.submissionFormTitle?.scrollIntoView({ behavior: "smooth", block: "start" });
            }
        }

        resetFormBuilder(form = null) {
            this.setFieldError(this.formName, "");
            this.setFieldError(this.formSlug, "");
            const definition = form?.definition || this.getDefaultFormDefinition();
            const settings = definition.settings || {};
            this.selectedFormSlug = form?.slug || null;
            this.selectedFormFieldIndex = 0;
            this.formFields = (definition.fields || []).map((field, index) => ({
                id: field.id || field.name || `field-${index + 1}`,
                name: field.name || `field_${index + 1}`,
                label: field.label || this.humanizeLabel(field.name || `Field ${index + 1}`),
                type: field.type || "text",
                required: Boolean(field.required),
                placeholder: field.placeholder || "",
                validation: field.validation || "",
                options: Array.isArray(field.options) ? field.options : []
            }));
            if (this.formName) this.formName.value = form?.name || "Contact Form";
            if (this.formSlug) {
                this.formSlug.value = form?.slug || "contact";
                this.formSlug.disabled = Boolean(form);
            }
            if (this.formStatus) this.formStatus.value = form?.status || "draft";
            if (this.formSuccessMessage) this.formSuccessMessage.value = settings.successMessage || "Thank you. Your submission has been received.";
            if (this.formStoreSubmissions) this.formStoreSubmissions.checked = settings.storeSubmissions !== false;
            if (this.formNotificationEmail) this.formNotificationEmail.value = settings.notificationEmail || "";
            if (this.formSubmitLabel) this.formSubmitLabel.value = settings.submitButtonLabel || "Submit";
            if (this.formBuilderTitle) this.formBuilderTitle.textContent = form ? `Editing: ${form.name}` : "New Form";
            if (!form) {
                this.formSubmissions = [];
                this.filteredFormSubmissions = [];
                if (this.submissionFormTitle) this.submissionFormTitle.textContent = "Submissions";
                this.renderSubmissions();
            }
            this.renderFormFields();
            this.renderFormFieldSettings();
        }

        renderFormFields() {
            if (!this.formFieldsList) return;
            if (!this.formFields.length) {
                this.formFieldsList.innerHTML = '<p class="empty">No fields yet. Add a field to build this form.</p>';
                return;
            }
            this.formFieldsList.innerHTML = this.formFields.map((field, index) => {
                const selected = index === this.selectedFormFieldIndex;
                const required = field.required ? '<span class="required-marker">*</span>' : "";
                return `
                    <div class="form-builder-field ${selected ? "is-selected" : ""}">
                        <button class="form-field-preview" type="button" data-form-field-select="${index}">
                            <span class="form-field-label">${this.escapeHtml(field.label)} ${required}</span>
                            ${this.renderFormFieldControl(field)}
                        </button>
                        <div class="schema-field-actions">
                            <button class="icon-button" type="button" data-form-field-up="${index}" aria-label="Move ${this.escapeHtml(field.label)} up">Up</button>
                            <button class="icon-button" type="button" data-form-field-down="${index}" aria-label="Move ${this.escapeHtml(field.label)} down">Down</button>
                            <button class="icon-button danger-icon" type="button" data-form-field-delete="${index}" aria-label="Delete ${this.escapeHtml(field.label)}">x</button>
                        </div>
                    </div>
                `;
            }).join("");
            this.formFieldsList.querySelectorAll("[data-form-field-select]").forEach((button) => {
                button.addEventListener("click", () => {
                    this.selectedFormFieldIndex = Number(button.dataset.formFieldSelect);
                    this.renderFormFields();
                    this.renderFormFieldSettings();
                });
            });
            this.formFieldsList.querySelectorAll("[data-form-field-up]").forEach((button) => {
                button.addEventListener("click", () => this.moveFormField(Number(button.dataset.formFieldUp), -1));
            });
            this.formFieldsList.querySelectorAll("[data-form-field-down]").forEach((button) => {
                button.addEventListener("click", () => this.moveFormField(Number(button.dataset.formFieldDown), 1));
            });
            this.formFieldsList.querySelectorAll("[data-form-field-delete]").forEach((button) => {
                button.addEventListener("click", () => this.deleteFormField(Number(button.dataset.formFieldDelete)));
            });
        }

        renderFormFieldControl(field) {
            const placeholder = this.escapeHtml(field.placeholder || "");
            if (field.type === "textarea") {
                return `<textarea rows="3" placeholder="${placeholder}" disabled></textarea>`;
            }
            if (field.type === "checkbox") {
                return `<label class="field-checkbox"><input type="checkbox" disabled><span>${this.escapeHtml(field.label)}</span></label>`;
            }
            if (field.type === "select") {
                const options = (field.options || []).map((option) => `<option>${this.escapeHtml(option)}</option>`).join("");
                return `<select disabled><option>${placeholder || "Select an option"}</option>${options}</select>`;
            }
            return `<input type="${this.escapeHtml(field.type || "text")}" placeholder="${placeholder}" disabled>`;
        }

        renderFormFieldSettings() {
            if (!this.formFieldSettings) return;
            const field = this.formFields[this.selectedFormFieldIndex];
            if (!field) {
                this.formFieldSettings.innerHTML = '<p class="empty">Select a field to edit its settings.</p>';
                return;
            }
            this.formFieldSettings.innerHTML = `
                <label class="field">
                    <span>Label</span>
                    <input type="text" value="${this.escapeHtml(field.label)}" data-form-field-setting="label">
                </label>
                <label class="field">
                    <span>Name</span>
                    <input type="text" value="${this.escapeHtml(field.name)}" data-form-field-setting="name">
                </label>
                <label class="field">
                    <span>Type</span>
                    <select data-form-field-setting="type">
                        ${FORM_FIELD_TYPES.map((type) => `<option value="${type}" ${field.type === type ? "selected" : ""}>${this.escapeHtml(this.humanizeLabel(type))}</option>`).join("")}
                    </select>
                </label>
                <label class="field">
                    <span>Placeholder</span>
                    <input type="text" value="${this.escapeHtml(field.placeholder || "")}" data-form-field-setting="placeholder">
                </label>
                <label class="field">
                    <span>Validation</span>
                    <input type="text" value="${this.escapeHtml(field.validation || "")}" data-form-field-setting="validation" placeholder="email, min:2, max:120">
                </label>
                <label class="field ${field.type === "select" ? "" : "is-hidden"}">
                    <span>Options</span>
                    <input type="text" value="${this.escapeHtml((field.options || []).join(", "))}" data-form-field-setting="options" placeholder="Option A, Option B">
                </label>
                <label class="field-inline">
                    <input type="checkbox" ${field.required ? "checked" : ""} data-form-field-setting="required">
                    <span>Required field</span>
                </label>
            `;
            this.formFieldSettings.querySelectorAll("[data-form-field-setting]").forEach((input) => {
                input.addEventListener("input", () => this.updateSelectedFormField(input));
                input.addEventListener("change", () => this.updateSelectedFormField(input));
            });
        }

        updateSelectedFormField(input) {
            const field = this.formFields[this.selectedFormFieldIndex];
            if (!field) return;
            const key = input.dataset.formFieldSetting;
            if (key === "required") {
                field.required = Boolean(input.checked);
            } else if (key === "options") {
                field.options = String(input.value || "").split(",").map((item) => item.trim()).filter(Boolean);
            } else if (key === "name") {
                field.name = this.slugify(input.value, field.name);
            } else {
                field[key] = input.value;
            }
            if (key === "label" && !field.name) {
                field.name = this.slugify(input.value, "field");
            }
            this.renderFormFields();
            if (key === "type") this.renderFormFieldSettings();
        }

        addFormField() {
            const index = this.formFields.length + 1;
            this.formFields.push({
                id: `field-${index}`,
                name: `field_${index}`,
                label: `Field ${index}`,
                type: "text",
                required: false,
                placeholder: "",
                validation: "",
                options: []
            });
            this.selectedFormFieldIndex = this.formFields.length - 1;
            this.renderFormFields();
            this.renderFormFieldSettings();
        }

        moveFormField(index, direction) {
            const nextIndex = index + direction;
            if (nextIndex < 0 || nextIndex >= this.formFields.length) return;
            const [field] = this.formFields.splice(index, 1);
            this.formFields.splice(nextIndex, 0, field);
            this.selectedFormFieldIndex = nextIndex;
            this.renderFormFields();
            this.renderFormFieldSettings();
        }

        deleteFormField(index) {
            if (index < 0 || index >= this.formFields.length) return;
            this.formFields.splice(index, 1);
            this.selectedFormFieldIndex = Math.max(0, Math.min(index, this.formFields.length - 1));
            this.renderFormFields();
            this.renderFormFieldSettings();
        }

        collectFormDefinition() {
            return {
                fields: this.formFields.map((field, index) => ({
                    id: field.id || field.name || `field-${index + 1}`,
                    name: this.slugify(field.name || field.label, `field-${index + 1}`),
                    label: field.label || this.humanizeLabel(field.name || `Field ${index + 1}`),
                    type: field.type || "text",
                    required: Boolean(field.required),
                    placeholder: field.placeholder || "",
                    validation: field.validation || "",
                    options: field.type === "select" ? (field.options || []) : []
                })),
                settings: {
                    successMessage: this.formSuccessMessage?.value || "Thank you. Your submission has been received.",
                    storeSubmissions: Boolean(this.formStoreSubmissions?.checked),
                    notificationEmail: this.formNotificationEmail?.value || "",
                    submitButtonLabel: this.formSubmitLabel?.value || "Submit"
                }
            };
        }

        async saveForm() {
            const slug = this.slugify(this.formSlug?.value || "", "");
            const name = String(this.formName?.value || "").trim();
            this.setFieldError(this.formSlug, "");
            this.setFieldError(this.formName, "");
            if (!slug || !name) {
                if (!slug) this.setFieldError(this.formSlug, "Form slug is required.");
                if (!name) this.setFieldError(this.formName, "Form name is required.");
                (slug ? this.formName : this.formSlug)?.focus();
                this.toast("Form slug and name are required", "error");
                return;
            }
            if (!this.formFields.length) {
                this.toast("Add at least one form field", "error");
                return;
            }
            const payload = {
                name,
                status: this.formStatus?.value || "draft",
                definition: this.collectFormDefinition()
            };
            try {
                if (this.selectedFormSlug) {
                    await this.requestJson(`/api/cms/forms/${encodeURIComponent(this.selectedFormSlug)}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload)
                    });
                    this.toast(`Form updated: ${name}`);
                } else {
                    await this.requestJson("/api/cms/forms", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ slug, ...payload })
                    });
                    this.selectedFormSlug = slug;
                    this.toast(`Form created: ${name}`);
                }
                await this.loadForms();
                await this.loadFormSubmissions(this.selectedFormSlug || slug);
            } catch (error) {
                this.toast(`Failed to save form: ${error.message}`, "error");
            }
        }

        async duplicateForm(slug, triggerButton = null) {
            const form = this.forms.find((item) => item.slug === slug);
            if (!form) return;
            const nextSlug = `${form.slug}-copy-${Date.now()}`;
            this.setButtonLoading(triggerButton, true, "Duplicating...");
            try {
                await this.requestJson("/api/cms/forms", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        slug: nextSlug,
                        name: `${form.name} Copy`,
                        status: "draft",
                        definition: form.definition
                    })
                });
                this.selectedFormSlug = nextSlug;
                this.toast("Form duplicated.");
                await this.loadForms();
            } catch (error) {
                this.toast(`Failed to duplicate form: ${error.message}`, "error");
            } finally {
                this.setButtonLoading(triggerButton, false);
            }
        }

        async deleteForm() {
            if (!this.selectedFormSlug) {
                this.toast("Select a form first", "error");
                return;
            }
            const confirmed = await this.confirmAction({
                title: "Delete Form",
                description: `Delete form "${this.selectedFormSlug}" and its submissions?`,
                confirmLabel: "Delete Form"
            });
            if (!confirmed) return;
            this.setButtonLoading(this.deleteFormButton, true, "Deleting...");
            try {
                await this.requestJson(`/api/cms/forms/${encodeURIComponent(this.selectedFormSlug)}`, { method: "DELETE" });
                this.toast("Form deleted.");
                this.selectedFormSlug = null;
                await this.loadForms();
            } catch (error) {
                this.toast(`Failed to delete form: ${error.message}`, "error");
            } finally {
                this.setButtonLoading(this.deleteFormButton, false);
            }
        }

        async loadFormSubmissions(slug = this.selectedFormSlug) {
            if (!slug) {
                this.formSubmissions = [];
                this.applySubmissionFilters();
                return;
            }
            if (this.submissionsState) {
                this.submissionsState.hidden = false;
                this.submissionsState.innerHTML = '<div class="loading-state"><span class="spinner" aria-hidden="true"></span><span>Loading submissions...</span></div>';
            }
            try {
                const result = await this.requestJson(`/api/cms/forms/${encodeURIComponent(slug)}/submissions`);
                this.formSubmissions = Array.isArray(result?.data) ? result.data : [];
                const form = this.forms.find((item) => item.slug === slug);
                if (this.submissionFormTitle) this.submissionFormTitle.textContent = `${form?.name || this.humanizeLabel(slug)} Submissions`;
                this.applySubmissionFilters();
            } catch (error) {
                if (this.submissionsRows) this.submissionsRows.innerHTML = "";
                if (this.submissionsState) {
                    this.submissionsState.hidden = false;
                    this.submissionsState.innerHTML = `
                        <div class="error-state">
                            <strong>Failed to load submissions</strong>
                            <span>${this.escapeHtml(error.message)}</span>
                            <button class="btn btn-secondary" type="button" data-submissions-retry>Try Again</button>
                        </div>
                    `;
                    this.submissionsState.querySelector("[data-submissions-retry]")?.addEventListener("click", () => this.loadFormSubmissions(slug));
                }
                this.toast(`Failed to load submissions: ${error.message}`, "error");
            }
        }

        applySubmissionFilters() {
            const query = String(this.formSubmissionSearchQuery || "").trim().toLowerCase();
            const filter = this.formSubmissionFilter || "all";
            this.formSubmissionFilters?.querySelectorAll("[data-submission-filter]").forEach((button) => {
                button.setAttribute("aria-pressed", String((button.dataset.submissionFilter || "all") === filter));
            });
            this.filteredFormSubmissions = this.formSubmissions.filter((submission) => {
                const matchesStatus = filter === "all" || submission.status === filter;
                const text = JSON.stringify(submission.data || {}).toLowerCase();
                return matchesStatus && (!query || text.includes(query));
            });
            this.renderSubmissions();
        }

        renderSubmissions() {
            if (!this.submissionsRows || !this.submissionsState) return;
            const items = this.filteredFormSubmissions || [];
            if (!items.length) {
                this.submissionsRows.innerHTML = "";
                this.submissionsState.hidden = false;
                this.submissionsState.innerHTML = `
                    <div class="empty-state">
                        <strong>No submissions found</strong>
                        <span>${this.selectedFormSlug ? "Submissions will appear here when visitors submit this form." : "Select a form to review its inbox."}</span>
                    </div>
                `;
                return;
            }
            this.submissionsState.hidden = true;
            this.submissionsRows.innerHTML = items.map((submission) => {
                const entries = Object.entries(submission.data || {});
                const summary = entries.slice(0, 4).map(([key, value]) => `
                    <div>
                        <span>${this.escapeHtml(this.humanizeLabel(key))}</span>
                        <strong>${this.escapeHtml(String(value ?? ""))}</strong>
                    </div>
                `).join("");
                return `
                    <article class="submission-item">
                        <div class="submission-item-header">
                            <div>
                                <span class="${this.getSubmissionStatusBadgeClass(submission.status)}">${this.escapeHtml(String(submission.status || "new").toUpperCase())}</span>
                                <span class="table-subtext">${this.escapeHtml(this.formatRelativeTime(submission.createdAt))}</span>
                            </div>
                            ${this.createActionMenuHtml(`submission:${submission.id}`, [
                                { action: "reviewed", label: "Mark Reviewed", icon: "R", disabled: submission.status === "reviewed" },
                                { action: "archived", label: "Archive", icon: "A", disabled: submission.status === "archived" },
                                { action: "new", label: "Move To Inbox", icon: "I", disabled: submission.status === "new" }
                            ])}
                        </div>
                        <div class="submission-data">${summary}</div>
                    </article>
                `;
            }).join("");
            this.bindActionMenus(this.submissionsRows, {
                reviewed: (menuId, button) => this.updateSubmissionStatus(menuId.replace(/^submission:/, ""), "reviewed", button),
                archived: (menuId, button) => this.updateSubmissionStatus(menuId.replace(/^submission:/, ""), "archived", button),
                new: (menuId, button) => this.updateSubmissionStatus(menuId.replace(/^submission:/, ""), "new", button)
            });
        }

        async updateSubmissionStatus(id, status, triggerButton = null) {
            if (!this.selectedFormSlug || !id || !status) return;
            this.setButtonLoading(triggerButton, true, "Updating...");
            try {
                await this.requestJson(`/api/cms/forms/${encodeURIComponent(this.selectedFormSlug)}/submissions/${encodeURIComponent(id)}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ status })
                });
                this.toast(`Submission marked ${status}.`);
                await this.loadFormSubmissions(this.selectedFormSlug);
                await this.loadForms();
            } catch (error) {
                this.toast(`Failed to update submission: ${error.message}`, "error");
            } finally {
                this.setButtonLoading(triggerButton, false);
            }
        }

        async loadMedia() {
            if (this.mediaState) {
                this.mediaState.hidden = false;
                this.mediaState.innerHTML = '<div class="loading-state"><span class="spinner" aria-hidden="true"></span><span>Loading media...</span></div>';
            }
            try {
                const result = await this.requestJson("/api/cms/media");
                this.mediaItems = Array.isArray(result?.data) ? result.data : [];
                this.applyMediaSearch();
            } catch (error) {
                if (this.mediaItemsContainer) this.mediaItemsContainer.innerHTML = "";
                if (this.mediaState) {
                    this.mediaState.hidden = false;
                    this.mediaState.innerHTML = `
                        <div class="error-state">
                            <strong>Failed to load media</strong>
                            <span>${this.escapeHtml(error.message)}</span>
                            <button class="btn btn-secondary" type="button" data-media-retry>Try Again</button>
                        </div>
                    `;
                    this.mediaState.querySelector("[data-media-retry]")?.addEventListener("click", () => this.loadMedia());
                }
                if (this.mediaPickerModal && !this.mediaPickerModal.hidden && this.mediaPickerState) {
                    this.mediaPickerItems.innerHTML = "";
                    this.mediaPickerState.hidden = false;
                    this.mediaPickerState.innerHTML = `
                        <div class="error-state">
                            <strong>Failed to load media</strong>
                            <span>${this.escapeHtml(error.message)}</span>
                            <button class="btn btn-secondary" type="button" data-media-picker-retry>Try Again</button>
                        </div>
                    `;
                    this.mediaPickerState.querySelector("[data-media-picker-retry]")?.addEventListener("click", () => this.loadMedia());
                }
                this.toast(`Failed to load media: ${error.message}`, "error");
            }
        }

        applyMediaSearch() {
            const query = String(this.mediaSearch?.value || "").trim().toLowerCase();
            this.filteredMediaItems = this.mediaItems.filter((item) => {
                return !query || this.getMediaName(item).toLowerCase().includes(query) || this.getMediaType(item).toLowerCase().includes(query);
            });
            this.renderMediaItems();
            this.renderMediaPickerItems();
        }

        setMediaViewMode(mode) {
            this.mediaViewMode = mode === "list" ? "list" : "grid";
            this.mediaGridViewButton?.setAttribute("aria-pressed", String(this.mediaViewMode === "grid"));
            this.mediaListViewButton?.setAttribute("aria-pressed", String(this.mediaViewMode === "list"));
            this.renderMediaItems();
        }

        renderMediaItems() {
            if (!this.mediaItemsContainer || !this.mediaState) return;
            const items = this.filteredMediaItems || [];
            this.mediaItemsContainer.className = this.mediaViewMode === "list" ? "media-list" : "media-grid";
            if (!items.length) {
                this.mediaItemsContainer.innerHTML = "";
                this.mediaState.hidden = false;
                this.mediaState.innerHTML = `
                    <div class="empty-state">
                        <strong>${this.mediaItems.length ? "No matching media" : "No media yet"}</strong>
                        <span>${this.mediaItems.length ? "Try a different search term." : "Upload your first image or file."}</span>
                        <button class="btn btn-primary" type="button" data-media-empty-upload>Upload Media</button>
                    </div>
                `;
                this.mediaState.querySelector("[data-media-empty-upload]")?.addEventListener("click", () => this.mediaUploadInput?.click());
                return;
            }

            this.mediaState.hidden = true;
            this.mediaItemsContainer.innerHTML = items.map((item) => this.renderMediaCard(item, this.selectedMediaId === item.id)).join("");
            this.mediaItemsContainer.querySelectorAll("[data-media-id]").forEach((button) => {
                button.addEventListener("click", () => this.selectMedia(Number(button.dataset.mediaId)));
            });
        }

        renderMediaCard(item, isSelected = false) {
            const name = this.getMediaName(item);
            const type = this.getMediaType(item).toUpperCase();
            const preview = this.isImageMedia(item)
                ? `<img src="${this.escapeHtml(item.thumbnailUrl || item.url)}" alt="${this.escapeHtml(name)}" loading="lazy">`
                : `<span class="file-icon" aria-hidden="true">${this.escapeHtml(type.slice(0, 3))}</span>`;
            return `
                <button class="media-card ${this.mediaViewMode === "list" ? "is-list" : ""} ${isSelected ? "is-selected" : ""}" type="button" data-media-id="${item.id}">
                    <span class="media-preview">${preview}<span class="media-type">${this.escapeHtml(type)}</span></span>
                    <span class="media-copy">
                        <strong title="${this.escapeHtml(name)}">${this.escapeHtml(name)}</strong>
                        <small>${this.escapeHtml(this.formatBytes(item.sizeBytes))} - ${Number(item.usedByCount || 0)} use${Number(item.usedByCount || 0) === 1 ? "" : "s"}</small>
                    </span>
                </button>
            `;
        }

        selectMedia(id) {
            const item = this.mediaItems.find((media) => Number(media.id) === Number(id));
            if (!item) return;
            this.selectedMediaId = item.id;
            this.renderMediaItems();
            this.renderMediaDetail(item);
        }

        closeMediaDetail() {
            this.selectedMediaId = null;
            if (this.mediaDetail) this.mediaDetail.hidden = true;
            this.renderMediaItems();
        }

        renderMediaDetail(item) {
            if (!this.mediaDetail || !this.mediaDetailBody) return;
            const name = this.getMediaName(item);
            const dimensions = item.dimensions ? `${item.dimensions.width} x ${item.dimensions.height}` : "Unknown";
            const preview = this.isImageMedia(item)
                ? `<img class="media-detail-image" src="${this.escapeHtml(item.url)}" alt="${this.escapeHtml(name)}">`
                : `<div class="media-detail-file">${this.escapeHtml(this.getMediaType(item).toUpperCase())}</div>`;
            this.mediaDetail.hidden = false;
            this.mediaDetailBody.innerHTML = `
                <div class="media-detail-preview">${preview}</div>
                <div class="media-meta-list">
                    <div><span>Name</span><strong>${this.escapeHtml(name)}</strong></div>
                    <div><span>Type</span><strong>${this.escapeHtml(item.mimeType || item.fileType || "")}</strong></div>
                    <div><span>Size</span><strong>${this.escapeHtml(this.formatBytes(item.sizeBytes))}</strong></div>
                    <div><span>Dimensions</span><strong>${this.escapeHtml(dimensions)}</strong></div>
                    <div><span>Used By</span><strong>${Number(item.usedByCount || 0)}</strong></div>
                    <div><span>URL</span><code>${this.escapeHtml(item.url)}</code></div>
                </div>
                <div class="media-detail-actions">
                    <button class="btn btn-secondary" type="button" data-media-copy>Copy URL</button>
                    <button class="btn btn-secondary" type="button" data-media-rename>Rename</button>
                    <button class="btn btn-secondary" type="button" data-media-replace>Replace File</button>
                    <button class="btn btn-danger" type="button" data-media-delete>Delete</button>
                </div>
            `;
            if (window.matchMedia("(max-width: 820px)").matches) {
                this.mediaDetail.focus();
            }
            this.mediaDetailBody.querySelector("[data-media-copy]")?.addEventListener("click", () => this.copyText(item.url, "Media URL copied."));
            this.mediaDetailBody.querySelector("[data-media-rename]")?.addEventListener("click", () => this.renameMedia(item));
            this.mediaDetailBody.querySelector("[data-media-replace]")?.addEventListener("click", () => {
                this.mediaPickerTarget = { type: "replace", id: item.id };
                this.mediaUploadInput?.click();
            });
            this.mediaDetailBody.querySelector("[data-media-delete]")?.addEventListener("click", () => this.deleteMedia(item));
        }

        async copyText(text, message = "Copied.") {
            try {
                await navigator.clipboard.writeText(text);
                this.toast(message);
            } catch (error) {
                this.toast("Clipboard copy failed.", "error");
            }
        }

        async renameMedia(item) {
            const nextName = window.prompt("Rename file", this.getMediaName(item));
            if (!nextName || nextName === this.getMediaName(item)) return;
            try {
                const result = await this.requestJson(`/api/cms/media/${encodeURIComponent(item.id)}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ fileName: nextName })
                });
                this.toast("Media renamed.");
                await this.loadMedia();
                this.selectMedia(result.data.id);
            } catch (error) {
                this.toast(`Rename failed: ${error.message}`, "error");
            }
        }

        async deleteMedia(item) {
            const confirmed = await this.confirmAction({
                title: "Delete Media",
                description: `Delete "${this.getMediaName(item)}"?`,
                confirmLabel: "Delete Media"
            });
            if (!confirmed) return;
            try {
                await this.requestJson(`/api/cms/media/${encodeURIComponent(item.id)}`, { method: "DELETE" });
                this.toast("Media deleted.");
                this.closeMediaDetail();
                await this.loadMedia();
            } catch (error) {
                this.toast(`Delete failed: ${error.message}`, "error");
            }
        }

        readFileAsDataUrl(file) {
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result || ""));
                reader.onerror = () => reject(reader.error || new Error("File read failed"));
                reader.readAsDataURL(file);
            });
        }

        getImageDimensionsFromDataUrl(dataUrl, mimeType) {
            if (!String(mimeType || "").startsWith("image/")) {
                return Promise.resolve(null);
            }
            return new Promise((resolve) => {
                const image = new Image();
                image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
                image.onerror = () => resolve(null);
                image.src = dataUrl;
            });
        }

        async uploadSelectedMediaFiles() {
            const files = Array.from(this.mediaUploadInput?.files || []);
            if (!files.length) return;
            try {
                for (const file of files) {
                    const dataUrl = await this.readFileAsDataUrl(file);
                    const dimensions = await this.getImageDimensionsFromDataUrl(dataUrl, file.type);
                    const payload = {
                        fileName: file.name,
                        mimeType: file.type || "application/octet-stream",
                        dataBase64: dataUrl,
                        dimensions
                    };

                    if (this.mediaPickerTarget?.type === "replace") {
                        await this.requestJson(`/api/cms/media/${encodeURIComponent(this.mediaPickerTarget.id)}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload)
                        });
                        this.toast("Media replaced.");
                        this.mediaPickerTarget = null;
                    } else {
                        await this.requestJson("/api/cms/media", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(payload)
                        });
                    }
                }
                this.mediaUploadInput.value = "";
                await this.loadMedia();
                this.renderMediaPickerItems();
                this.toast(`${files.length} media file${files.length === 1 ? "" : "s"} uploaded.`);
            } catch (error) {
                this.toast(`Upload failed: ${error.message}`, "error");
            }
        }

        openMediaPicker(target = {}) {
            this.lastFocusedElement = document.activeElement;
            this.mediaPickerTarget = target;
            this.mediaPickerSelectedId = null;
            if (this.mediaPickerSearch) this.mediaPickerSearch.value = "";
            if (this.mediaPickerInsert) this.mediaPickerInsert.disabled = true;
            if (this.mediaPickerModal) {
                this.mediaPickerModal.hidden = false;
                window.setTimeout(() => this.mediaPickerSearch?.focus(), 0);
            }
            if (!this.mediaItems.length) {
                if (this.mediaPickerState) {
                    this.mediaPickerState.hidden = false;
                    this.mediaPickerState.innerHTML = '<div class="loading-state"><span class="spinner" aria-hidden="true"></span><span>Loading media...</span></div>';
                }
                if (this.mediaPickerItems) this.mediaPickerItems.innerHTML = "";
                this.loadMedia();
            } else {
                this.renderMediaPickerItems();
            }
        }

        closeMediaPicker() {
            if (this.mediaPickerModal) this.mediaPickerModal.hidden = true;
            this.mediaPickerTarget = null;
            this.mediaPickerSelectedId = null;
            this.restoreFocus();
        }

        renderMediaPickerItems() {
            if (!this.mediaPickerItems || !this.mediaPickerState) return;
            const query = String(this.mediaPickerSearch?.value || "").trim().toLowerCase();
            const onlyImages = this.mediaPickerTarget?.allowImages !== false;
            const items = this.mediaItems.filter((item) => {
                const matchesQuery = !query || this.getMediaName(item).toLowerCase().includes(query);
                const matchesType = !onlyImages || this.isImageMedia(item);
                return matchesQuery && matchesType;
            });

            if (!items.length) {
                this.mediaPickerItems.innerHTML = "";
                this.mediaPickerState.hidden = false;
                this.mediaPickerState.innerHTML = `
                    <div class="empty-state">
                        <strong>No media found</strong>
                        <span>Upload an asset or adjust your search.</span>
                    </div>
                `;
                return;
            }

            this.mediaPickerState.hidden = true;
            this.mediaPickerItems.innerHTML = items.map((item) => {
                const name = this.getMediaName(item);
                const preview = this.isImageMedia(item)
                    ? `<img src="${this.escapeHtml(item.thumbnailUrl || item.url)}" alt="${this.escapeHtml(name)}" loading="lazy">`
                    : `<span class="file-icon" aria-hidden="true">${this.escapeHtml(this.getMediaType(item).slice(0, 3).toUpperCase())}</span>`;
                return `
                    <button class="media-card ${Number(this.mediaPickerSelectedId) === Number(item.id) ? "is-selected" : ""}" type="button" data-picker-media-id="${item.id}">
                        <span class="media-preview">${preview}<span class="media-type">${this.escapeHtml(this.getMediaType(item).toUpperCase())}</span></span>
                        <span class="media-copy">
                            <strong>${this.escapeHtml(name)}</strong>
                            <small>${this.escapeHtml(this.formatBytes(item.sizeBytes))}</small>
                        </span>
                    </button>
                `;
            }).join("");
            this.mediaPickerItems.querySelectorAll("[data-picker-media-id]").forEach((button) => {
                button.addEventListener("click", () => {
                    this.mediaPickerSelectedId = Number(button.dataset.pickerMediaId);
                    if (this.mediaPickerInsert) this.mediaPickerInsert.disabled = false;
                    this.renderMediaPickerItems();
                });
            });
        }

        insertSelectedMedia() {
            const item = this.mediaItems.find((media) => Number(media.id) === Number(this.mediaPickerSelectedId));
            if (!item || !this.mediaPickerTarget) return;
            if (this.mediaPickerTarget.type === "entry-field") {
                const input = Array.from(this.entryFormFields.querySelectorAll("[data-entry-field]"))
                    .find((element) => element.dataset.entryField === this.mediaPickerTarget.fieldName);
                if (input) {
                    input.value = item.url;
                    input.dispatchEvent(new Event("input", { bubbles: true }));
                }
            }
            this.closeMediaPicker();
            this.toast("Media inserted.");
        }

        async handleDashboardAction(action) {
            switch (action) {
                case "create-collection":
                    this.setView("structure");
                    this.resetCollectionForm();
                    this.setDashboardAction("Collection editor opened.");
                    break;
                case "create-entry":
                    this.setView("content");
                    this.resetEntryForm();
                    this.setDashboardAction("Entry editor opened.");
                    break;
                case "upload-media":
                    this.setView("media");
                    await this.loadMedia();
                    this.mediaUploadInput?.click();
                    this.setDashboardAction("Media upload opened.");
                    break;
                case "open-builder":
                    {
                        const result = await this.openBuilder();
                        if (result?.opened) {
                            this.setDashboardAction("Builder opened in a new tab.");
                        } else {
                            this.setDashboardAction("Builder could not be opened. Check popup permissions or Settings.", "error");
                        }
                    }
                    break;
                case "export-content":
                    await this.runExport();
                    await this.loadDashboardData();
                    this.setDashboardAction("Content export completed.");
                    break;
                case "export-theme":
                    this.setView("themes");
                    this.setDashboardAction("Theme export is scheduled for Phase 10.", "warning");
                    this.toast("Theme export is scheduled for Phase 10.", "warning");
                    break;
                case "view-drafts":
                    this.setView("content");
                    this.entriesSearch.value = "draft";
                    this.applyEntrySearch();
                    break;
                case "view-warnings":
                    this.dashboardWarningsList?.scrollIntoView({ behavior: "smooth", block: "center" });
                    break;
                default:
                    break;
            }
        }

        async requestJson(url, options = {}) {
            const response = await fetch(url, options);
            const result = await response.json();
            if (!result || !result.success) {
                const error = new Error((result && result.error) || `Request failed: ${url}`);
                error.code = result?.code;
                error.details = result?.details || {};
                throw error;
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

        setButtonLoading(button, isLoading, label = "Working...") {
            if (!button) {
                return "";
            }
            if (isLoading) {
                const previousLabel = button.textContent;
                button.dataset.previousLabel = previousLabel;
                button.disabled = true;
                button.classList.add("is-loading");
                button.textContent = label;
                return previousLabel;
            }
            button.disabled = false;
            button.classList.remove("is-loading");
            button.textContent = button.dataset.previousLabel || button.textContent;
            delete button.dataset.previousLabel;
            return button.textContent;
        }

        createActionMenuHtml(id, items = []) {
            const safeId = this.escapeAttribute(id);
            const label = this.escapeAttribute(`Open actions for ${String(id).replace(/^[^:]+:/, "")}`);
            return `
                <div class="action-menu" data-action-menu="${safeId}">
                    <button class="icon-button" type="button" aria-label="${label}" aria-haspopup="menu" aria-expanded="false" data-action-menu-toggle="${safeId}">...</button>
                    <div class="action-menu-panel" role="menu" aria-label="Actions">
                        ${items.map((item) => `
                            <button
                                class="action-menu-item${item.destructive ? " is-danger" : ""}"
                                type="button"
                                role="menuitem"
                                data-action-menu-item="${safeId}"
                                data-action="${this.escapeAttribute(item.action)}"
                                ${item.disabled ? "disabled" : ""}
                            >
                                <span class="action-menu-icon" aria-hidden="true">${this.escapeHtml(item.icon || "")}</span>
                                <span>${this.escapeHtml(item.label)}</span>
                            </button>
                        `).join("")}
                    </div>
                </div>
            `;
        }

        bindActionMenus(container, handlers = {}) {
            container?.querySelectorAll("[data-action-menu-toggle]").forEach((button) => {
                button.addEventListener("click", (event) => {
                    event.stopPropagation();
                    const id = button.dataset.actionMenuToggle || "";
                    this.toggleActionMenu(id, container);
                });
                button.addEventListener("keydown", (event) => {
                    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        this.toggleActionMenu(button.dataset.actionMenuToggle || "", container, { focusFirst: true });
                    }
                });
            });
            container?.querySelectorAll("[data-action-menu-item]").forEach((button) => {
                button.addEventListener("click", async (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    const menuId = button.dataset.actionMenuItem || "";
                    const action = button.dataset.action || "";
                    this.closeActionMenus();
                    const handler = handlers[action];
                    if (handler) {
                        await handler(menuId, button);
                    }
                });
                button.addEventListener("keydown", (event) => this.handleActionMenuKeydown(event));
            });
        }

        toggleActionMenu(id, scope = document, options = {}) {
            const menu = scope.querySelector(`[data-action-menu="${this.escapeCss(id)}"]`);
            if (!menu) return;
            const isOpen = menu.classList.contains("is-open");
            this.closeActionMenus();
            if (!isOpen) {
                menu.classList.add("is-open");
                menu.querySelector("[data-action-menu-toggle]")?.setAttribute("aria-expanded", "true");
                this.openActionMenuId = id;
                if (options.focusFirst) {
                    menu.querySelector(".action-menu-item:not(:disabled)")?.focus();
                }
            }
        }

        handleActionMenuKeydown(event) {
            const items = Array.from(event.currentTarget.closest(".action-menu-panel")?.querySelectorAll(".action-menu-item:not(:disabled)") || []);
            const index = items.indexOf(event.currentTarget);
            if (!items.length) return;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                const direction = event.key === "ArrowDown" ? 1 : -1;
                items[(index + direction + items.length) % items.length]?.focus();
            } else if (event.key === "Home") {
                event.preventDefault();
                items[0]?.focus();
            } else if (event.key === "End") {
                event.preventDefault();
                items[items.length - 1]?.focus();
            } else if (event.key === "Escape") {
                event.preventDefault();
                const menu = event.currentTarget.closest(".action-menu");
                const toggle = menu?.querySelector("[data-action-menu-toggle]");
                this.closeActionMenus();
                toggle?.focus();
            }
        }

        closeActionMenus() {
            document.querySelectorAll(".action-menu.is-open").forEach((menu) => {
                menu.classList.remove("is-open");
                menu.querySelector("[data-action-menu-toggle]")?.setAttribute("aria-expanded", "false");
            });
            this.openActionMenuId = null;
        }

        confirmAction(options = {}) {
            if (!this.confirmDialog || this.confirmDialogResolver !== null) {
                return Promise.resolve(false);
            }
            const {
                title = "Confirm Action",
                description = "This action needs confirmation.",
                confirmLabel = "Confirm",
                cancelLabel = "Cancel",
                destructive = true
            } = options;
            this.confirmDialogTitle.textContent = title;
            this.confirmDialogDescription.textContent = description;
            this.confirmDialogConfirm.textContent = confirmLabel;
            this.confirmDialogCancel.textContent = cancelLabel;
            this.confirmDialogConfirm.className = destructive ? "btn btn-danger" : "btn btn-primary";
            this.confirmDialog.classList.toggle("is-destructive", destructive);
            this.lastFocusedElement = document.activeElement;
            this.confirmDialog.hidden = false;
            this.confirmDialogConfirm.focus();
            return new Promise((resolve) => {
                this.confirmDialogResolver = resolve;
            });
        }

        resolveConfirmDialog(confirmed) {
            if (this.confirmDialog) {
                this.confirmDialog.hidden = true;
            }
            if (this.confirmDialogResolver) {
                this.confirmDialogResolver(Boolean(confirmed));
                this.confirmDialogResolver = null;
            }
            this.restoreFocus();
        }

        getOpenModal() {
            return [this.confirmDialog, this.themeExportModal, this.mediaPickerModal, this.cmsBlockPickerModal].find((modal) => modal && !modal.hidden) || null;
        }

        getFocusableElements(root) {
            return Array.from(root.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
                .filter((element) => element.offsetParent !== null || element === document.activeElement);
        }

        trapModalFocus(event) {
            if (event.key !== "Tab") return;
            const modal = this.getOpenModal();
            if (!modal) return;
            const focusable = this.getFocusableElements(modal);
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }

        restoreFocus() {
            const target = this.lastFocusedElement;
            this.lastFocusedElement = null;
            if (target && typeof target.focus === "function" && document.contains(target)) {
                target.focus();
            }
        }

        bindRovingTabs(tabs, activate) {
            tabs.forEach((button) => {
                button.addEventListener("keydown", (event) => {
                    if (!["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp", "Home", "End"].includes(event.key)) return;
                    event.preventDefault();
                    const currentIndex = tabs.indexOf(button);
                    let nextIndex = currentIndex;
                    if (event.key === "Home") nextIndex = 0;
                    else if (event.key === "End") nextIndex = tabs.length - 1;
                    else {
                        const direction = event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1;
                        nextIndex = (currentIndex + direction + tabs.length) % tabs.length;
                    }
                    tabs[nextIndex]?.focus();
                    activate(tabs[nextIndex]);
                });
            });
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

        escapeAttribute(value) {
            return this.escapeHtml(value);
        }

        escapeCss(value) {
            if (window.CSS && typeof window.CSS.escape === "function") {
                return window.CSS.escape(String(value));
            }
            return String(value).replace(/["\\]/g, "\\$&");
        }

        getFieldDomId(prefix, name) {
            return `${prefix}-${String(name || "field").replace(/[^a-zA-Z0-9_-]+/g, "-")}`;
        }

        setFieldError(input, message = "") {
            if (!input) return;
            const field = input.closest(".field") || input.parentElement;
            const error = field?.querySelector(".field-error");
            const hasError = Boolean(message);
            input.classList.toggle("is-invalid", hasError);
            input.setAttribute("aria-invalid", String(hasError));
            if (error) {
                error.textContent = message;
                error.hidden = !hasError;
                if (hasError) {
                    input.setAttribute("aria-describedby", error.id);
                } else if (input.getAttribute("aria-describedby") === error.id) {
                    input.removeAttribute("aria-describedby");
                }
            }
        }

        clearFieldErrors(root) {
            root?.querySelectorAll("input, select, textarea").forEach((input) => this.setFieldError(input, ""));
        }

        humanizeLabel(value) {
            return String(value || "")
                .replace(/[_-]+/g, " ")
                .replace(/\s+/g, " ")
                .trim()
                .replace(/\b\w/g, (ch) => ch.toUpperCase());
        }

        slugify(value, fallback = "item") {
            return String(value || fallback)
                .trim()
                .toLowerCase()
                .replace(/[^a-z0-9_-]+/g, "-")
                .replace(/-+/g, "-")
                .replace(/(^-+|-+$)/g, "") || fallback;
        }

        getCollection(slug) {
            return this.collections.find((item) => item.slug === slug) || null;
        }

        getSchemaFields(collection) {
            const fields = Array.isArray(collection?.schema?.fields) ? collection.schema.fields : [];
            return fields.filter((field) => field && field.name);
        }

        normalizeSchemaField(field = {}, index = 0) {
            const rawName = String(field.name || `field_${index + 1}`).trim();
            const name = rawName
                .replace(/\s+/g, "_")
                .replace(/[^a-zA-Z0-9_]/g, "_")
                .replace(/_+/g, "_")
                .replace(/^_+|_+$/g, "")
                .toLowerCase() || `field_${index + 1}`;
            const type = FIELD_TYPES.includes(String(field.type || "").toLowerCase())
                ? String(field.type).toLowerCase()
                : "text";
            return {
                name,
                label: String(field.label || this.humanizeLabel(name)).trim() || this.humanizeLabel(name),
                type,
                required: Boolean(field.required),
                options: Array.isArray(field.options)
                    ? field.options
                    : String(field.options || "").split(",").map((item) => item.trim()).filter(Boolean),
                helpText: String(field.helpText || field.help || "").trim()
            };
        }

        getCurrentSchema() {
            try {
                return this.parseJson(this.collectionSchema.value, COLLECTION_TEMPLATES.custom.schema) || COLLECTION_TEMPLATES.custom.schema;
            } catch (error) {
                return { mode: this.collectionSingleton.checked ? "singleton" : "collection", fields: this.schemaFields };
            }
        }

        writeSchemaFromFieldBuilder() {
            const schema = this.getCurrentSchema();
            schema.mode = this.collectionSingleton.checked ? "singleton" : (schema.mode || "collection");
            schema.fields = this.schemaFields.map((field, index) => this.normalizeSchemaField(field, index));
            this.collectionSchema.value = this.formatJson(schema, schema);
        }

        syncFieldBuilderFromSchemaText() {
            try {
                const schema = this.parseJson(this.collectionSchema.value, COLLECTION_TEMPLATES.custom.schema) || COLLECTION_TEMPLATES.custom.schema;
                this.schemaFields = Array.isArray(schema.fields)
                    ? schema.fields.map((field, index) => this.normalizeSchemaField(field, index))
                    : [];
                if (this.selectedFieldIndex != null && this.selectedFieldIndex >= this.schemaFields.length) {
                    this.selectedFieldIndex = this.schemaFields.length ? this.schemaFields.length - 1 : null;
                }
                this.renderSchemaFields();
            } catch (error) {
                this.fieldSettings.innerHTML = `<p class="empty">Schema JSON is invalid: ${this.escapeHtml(error.message)}</p>`;
            }
        }

        setSchemaFields(fields = []) {
            this.schemaFields = fields.map((field, index) => this.normalizeSchemaField(field, index));
            if (!this.schemaFields.length) {
                this.selectedFieldIndex = null;
            } else if (this.selectedFieldIndex == null || this.selectedFieldIndex >= this.schemaFields.length) {
                this.selectedFieldIndex = 0;
            }
            this.writeSchemaFromFieldBuilder();
            this.renderSchemaFields();
        }

        renderSchemaFields() {
            if (!this.collectionFieldsList || !this.fieldSettings) {
                return;
            }

            if (!this.schemaFields.length) {
                this.collectionFieldsList.innerHTML = '<p class="empty">No fields yet. Add a field to start modeling content.</p>';
                this.fieldSettings.innerHTML = '<p class="empty">Select a field to edit its settings.</p>';
                return;
            }

            this.collectionFieldsList.innerHTML = this.schemaFields.map((field, index) => `
                <div class="schema-field ${index === this.selectedFieldIndex ? "is-selected" : ""}" data-field-index="${index}">
                    <button class="schema-field-main" type="button" data-field-select="${index}">
                        <span class="drag-handle" aria-hidden="true">::</span>
                        <span>
                            <strong>${this.escapeHtml(field.name)}${field.required ? " *" : ""}</strong>
                            <small>${this.escapeHtml(field.label)} - ${this.escapeHtml(field.type)}</small>
                        </span>
                    </button>
                    <div class="schema-field-actions">
                        <button class="icon-button" type="button" aria-label="Move field up" data-field-move-up="${index}">↑</button>
                        <button class="icon-button" type="button" aria-label="Move field down" data-field-move-down="${index}">↓</button>
                        <button class="icon-button" type="button" aria-label="Duplicate field" data-field-duplicate="${index}">+</button>
                        <button class="icon-button danger-icon" type="button" aria-label="Delete field" data-field-delete="${index}">×</button>
                    </div>
                </div>
            `).join("");

            this.collectionFieldsList.querySelectorAll("[data-field-select]").forEach((button) => {
                button.addEventListener("click", () => {
                    this.selectedFieldIndex = Number(button.dataset.fieldSelect);
                    this.renderSchemaFields();
                });
            });
            this.collectionFieldsList.querySelectorAll("[data-field-move-up]").forEach((button) => {
                button.addEventListener("click", () => this.moveSchemaField(Number(button.dataset.fieldMoveUp), -1));
            });
            this.collectionFieldsList.querySelectorAll("[data-field-move-down]").forEach((button) => {
                button.addEventListener("click", () => this.moveSchemaField(Number(button.dataset.fieldMoveDown), 1));
            });
            this.collectionFieldsList.querySelectorAll("[data-field-duplicate]").forEach((button) => {
                button.addEventListener("click", () => this.duplicateSchemaField(Number(button.dataset.fieldDuplicate)));
            });
            this.collectionFieldsList.querySelectorAll("[data-field-delete]").forEach((button) => {
                button.addEventListener("click", () => this.deleteSchemaField(Number(button.dataset.fieldDelete)));
            });

            this.renderFieldSettings();
        }

        renderFieldSettings() {
            const field = this.schemaFields[this.selectedFieldIndex];
            if (!field) {
                this.fieldSettings.innerHTML = '<p class="empty">Select a field to edit its settings.</p>';
                return;
            }

            const typeOptions = FIELD_TYPES.map((type) => `<option value="${type}" ${field.type === type ? "selected" : ""}>${this.escapeHtml(this.humanizeLabel(type))}</option>`).join("");
            this.fieldSettings.innerHTML = `
                <label class="field">
                    <span>Label</span>
                    <input type="text" value="${this.escapeHtml(field.label)}" data-field-setting="label">
                </label>
                <label class="field">
                    <span>Field Name</span>
                    <input type="text" value="${this.escapeHtml(field.name)}" data-field-setting="name">
                </label>
                <label class="field">
                    <span>Type</span>
                    <select data-field-setting="type">${typeOptions}</select>
                </label>
                <label class="field field-toggle">
                    <span>Required</span>
                    <span class="field-checkbox">
                        <input type="checkbox" data-field-setting="required" ${field.required ? "checked" : ""}>
                        <span>Editors must fill this field</span>
                    </span>
                </label>
                <label class="field">
                    <span>Select Options</span>
                    <input type="text" value="${this.escapeHtml((field.options || []).join(", "))}" data-field-setting="options" placeholder="option-a, option-b">
                </label>
                <label class="field">
                    <span>Help Text</span>
                    <input type="text" value="${this.escapeHtml(field.helpText || "")}" data-field-setting="helpText" placeholder="Short guidance for editors">
                </label>
            `;

            this.fieldSettings.querySelectorAll("[data-field-setting]").forEach((input) => {
                input.addEventListener("change", () => this.updateSelectedSchemaField(input));
            });
        }

        updateSelectedSchemaField(input) {
            const field = this.schemaFields[this.selectedFieldIndex];
            if (!field) return;

            const key = input.dataset.fieldSetting;
            if (key === "required") {
                field.required = Boolean(input.checked);
            } else if (key === "options") {
                field.options = String(input.value || "").split(",").map((item) => item.trim()).filter(Boolean);
            } else {
                field[key] = input.value;
            }
            this.schemaFields[this.selectedFieldIndex] = this.normalizeSchemaField(field, this.selectedFieldIndex);
            this.writeSchemaFromFieldBuilder();
            this.renderSchemaFields();
        }

        addSchemaField() {
            const index = this.schemaFields.length;
            this.schemaFields.push(this.normalizeSchemaField({ name: `new_field_${index + 1}`, label: `New Field ${index + 1}`, type: "text" }, index));
            this.selectedFieldIndex = index;
            this.writeSchemaFromFieldBuilder();
            this.renderSchemaFields();
        }

        moveSchemaField(index, direction) {
            const nextIndex = index + direction;
            if (nextIndex < 0 || nextIndex >= this.schemaFields.length) return;
            const fields = [...this.schemaFields];
            const [field] = fields.splice(index, 1);
            fields.splice(nextIndex, 0, field);
            this.schemaFields = fields;
            this.selectedFieldIndex = nextIndex;
            this.writeSchemaFromFieldBuilder();
            this.renderSchemaFields();
        }

        duplicateSchemaField(index) {
            const field = this.schemaFields[index];
            if (!field) return;
            const duplicate = this.normalizeSchemaField({ ...field, name: `${field.name}_copy`, label: `${field.label} Copy` }, this.schemaFields.length);
            this.schemaFields.splice(index + 1, 0, duplicate);
            this.selectedFieldIndex = index + 1;
            this.writeSchemaFromFieldBuilder();
            this.renderSchemaFields();
        }

        async deleteSchemaField(index) {
            const field = this.schemaFields[index];
            if (!field) return;
            const confirmed = await this.confirmAction({
                title: "Delete Field",
                description: `Delete field "${field.name}"? Existing entry data is not deleted, but this field will leave the normal editor.`,
                confirmLabel: "Delete Field"
            });
            if (!confirmed) {
                return;
            }
            this.schemaFields.splice(index, 1);
            this.selectedFieldIndex = this.schemaFields.length ? Math.max(0, index - 1) : null;
            this.writeSchemaFromFieldBuilder();
            this.renderSchemaFields();
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
            this.setSchemaFields(schema.fields || []);

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

        renderEntryCollectionFilter() {
            if (!this.entriesCollectionFilter) return;
            const collections = this.normalizeCollections();
            this.entriesCollectionFilter.innerHTML = collections.map((collection) => `
                <option value="${this.escapeHtml(collection.slug)}" ${collection.slug === this.selectedCollection ? "selected" : ""}>
                    ${this.escapeHtml(collection.name || this.humanizeLabel(collection.slug))}
                </option>
            `).join("");
        }

        renderCollectionsTable() {
            if (!this.collectionsTableRows || !this.collectionsTableState) {
                return;
            }

            const query = String(this.collectionSearchQuery || "").trim().toLowerCase();
            const collections = this.normalizeCollections().filter((collection) => {
                if (!query) return true;
                return String(collection.name || "").toLowerCase().includes(query)
                    || String(collection.slug || "").toLowerCase().includes(query);
            });

            if (!collections.length) {
                this.collectionsTableRows.innerHTML = "";
                this.collectionsTableState.hidden = false;
                this.collectionsTableState.innerHTML = `
                    <div class="empty-state">
                        <strong>${this.collections.length ? "No matching collections" : "No collections yet"}</strong>
                        <span>${this.collections.length ? "Try a different search term." : "Create a collection to start modeling content."}</span>
                        <button class="btn btn-primary" type="button" data-collection-empty-new>Create Collection</button>
                    </div>
                `;
                this.collectionsTableState.querySelector("[data-collection-empty-new]")?.addEventListener("click", () => this.resetCollectionForm());
                return;
            }

            this.collectionsTableState.hidden = true;
            this.collectionsTableRows.innerHTML = collections.map((collection) => {
                const fieldCount = this.getSchemaFields(collection).length;
                const entryCount = this.collectionEntryCounts.get(collection.slug) ?? 0;
                const isActive = collection.slug === this.selectedCollection;
                return `
                    <tr class="${isActive ? "is-selected-row" : ""}">
                        <td data-label="Name"><strong>${this.escapeHtml(collection.name || this.humanizeLabel(collection.slug))}</strong><span class="table-subtext">${fieldCount} fields</span></td>
                        <td data-label="Slug"><code>${this.escapeHtml(collection.slug)}</code></td>
                        <td data-label="Entries">${entryCount}</td>
                        <td data-label="Required"><span class="status-badge is-muted">Not declared</span></td>
                        <td data-label="Updated">${this.escapeHtml(this.formatRelativeTime(collection.updatedAt || collection.createdAt))}</td>
                        <td data-label="Actions">
                            ${this.createActionMenuHtml(`collection:${collection.slug}`, [
                                { action: "edit", label: "Edit", icon: "E" },
                                { action: "entries", label: "View Entries", icon: "L" }
                            ])}
                        </td>
                    </tr>
                `;
            }).join("");

            this.bindActionMenus(this.collectionsTableRows, {
                edit: (menuId) => this.selectCollection(menuId.replace(/^collection:/, "")),
                entries: async (menuId) => {
                    await this.selectCollection(menuId.replace(/^collection:/, ""));
                    this.setView("content");
                }
            });
        }

        renderSections() {
            const collections = this.normalizeCollections();
            if (collections.length === 0) {
                this.sectionsList.innerHTML = '<p class="empty">No content types yet. Go to Structure and create one.</p>';
                this.renderEntryCollectionFilter();
                this.renderCollectionsTable();
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
            this.renderEntryCollectionFilter();
            this.renderCollectionsTable();
        }

        getEntryLabel(entry) {
            const data = entry?.data || {};
            return data.title || data.headline || data.name || entry.entryKey || `entry-${entry.id}`;
        }

        applyEntrySearch() {
            const query = String(this.entriesSearch.value || "").trim().toLowerCase();
            const statusFilter = String(this.entriesStatusFilter?.value || "all").toLowerCase();

            this.filteredEntries = this.entries.filter((entry) => {
                const label = String(this.getEntryLabel(entry)).toLowerCase();
                const key = String(entry.entryKey || "").toLowerCase();
                const status = String(entry.status || "").toLowerCase();
                const collection = String(entry.collection || "").toLowerCase();
                const json = JSON.stringify(entry.data || {}).toLowerCase();
                const matchesQuery = !query || label.includes(query) || key.includes(query) || status.includes(query) || collection.includes(query) || json.includes(query);
                const matchesStatus = statusFilter === "all" || status === statusFilter;
                return matchesQuery && matchesStatus;
            });

            const sortMode = String(this.entriesSort?.value || "sortOrder");
            this.filteredEntries.sort((a, b) => {
                if (sortMode === "newest" || sortMode === "oldest") {
                    const left = Date.parse(a.updatedAt || a.createdAt || "") || 0;
                    const right = Date.parse(b.updatedAt || b.createdAt || "") || 0;
                    return sortMode === "newest" ? right - left : left - right;
                }
                if (sortMode === "title") {
                    return String(this.getEntryLabel(a)).localeCompare(String(this.getEntryLabel(b)));
                }
                return Number(a.sortOrder || 0) - Number(b.sortOrder || 0);
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
                this.updateEntryBulkBar();
                return;
            }

            const entries = Array.isArray(this.filteredEntries) ? this.filteredEntries : [];
            if (entries.length === 0) {
                this.entriesList.innerHTML = `
                    <div class="empty-state">
                        <strong>No matching entries</strong>
                        <span>Create one or adjust the current search and filters.</span>
                        <button class="btn btn-primary" type="button" data-empty-new-entry>New Entry</button>
                    </div>
                `;
                this.entriesList.querySelector("[data-empty-new-entry]")?.addEventListener("click", () => this.resetEntryForm());
                this.updateEntryBulkBar();
                return;
            }

            this.entriesList.innerHTML = `
                <div class="table-wrap">
                    <table class="data-table entries-table" aria-label="CMS entries">
                        <thead>
                            <tr>
                                <th scope="col"><input id="entriesSelectAll" type="checkbox" aria-label="Select all entries"></th>
                                <th scope="col">Title</th>
                                <th scope="col">Key</th>
                                <th scope="col">Status</th>
                                <th scope="col">Sort</th>
                                <th scope="col">Updated</th>
                                <th scope="col">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${entries.map((entry) => {
                const isActive = Number(entry.id) === Number(this.selectedEntryId);
                const isSelected = this.selectedEntryIds.has(Number(entry.id));
                return `
                    <tr class="${isActive ? "is-selected-row" : ""}">
                        <td data-label="Select"><input type="checkbox" data-entry-select="${entry.id}" aria-label="Select ${this.escapeHtml(this.getEntryLabel(entry))}" ${isSelected ? "checked" : ""}></td>
                        <td data-label="Title"><button class="table-link" type="button" data-entry-id="${entry.id}">${this.escapeHtml(this.getEntryLabel(entry))}</button></td>
                        <td data-label="Key"><code>${this.escapeHtml(entry.entryKey || "")}</code></td>
                        <td data-label="Status"><span class="${this.getStatusBadgeClass(entry.status)}">${this.escapeHtml(String(entry.status || "draft").toUpperCase())}</span></td>
                        <td data-label="Sort">${Number(entry.sortOrder || 0)}</td>
                        <td data-label="Updated">${this.escapeHtml(this.formatRelativeTime(entry.updatedAt || entry.createdAt))}</td>
                        <td data-label="Actions">
                            ${this.createActionMenuHtml(`entry:${entry.id}`, [
                                { action: "edit", label: "Edit", icon: "E" },
                                { action: "duplicate", label: "Duplicate", icon: "+" },
                                { action: "archive", label: "Archive", icon: "A", disabled: String(entry.status || "").toLowerCase() === "archived" },
                                { action: "delete", label: "Delete", icon: "x", destructive: true }
                            ])}
                        </td>
                    </tr>
                `;
                            }).join("")}
                        </tbody>
                    </table>
                </div>
            `;

            this.entriesList.querySelectorAll("[data-entry-id]").forEach((button) => {
                button.addEventListener("click", () => this.selectEntry(button.dataset.entryId || ""));
            });
            this.entriesList.querySelectorAll("[data-entry-select]").forEach((checkbox) => {
                checkbox.addEventListener("change", () => this.toggleEntrySelection(checkbox.dataset.entrySelect || "", checkbox.checked));
            });
            this.entriesList.querySelector("#entriesSelectAll")?.addEventListener("change", (event) => {
                this.toggleAllEntrySelections(event.target.checked);
            });
            this.bindActionMenus(this.entriesList, {
                edit: (menuId) => this.selectEntry(menuId.replace(/^entry:/, "")),
                duplicate: (menuId, button) => this.duplicateEntry(menuId.replace(/^entry:/, ""), button),
                archive: (menuId, button) => this.updateEntryStatus(menuId.replace(/^entry:/, ""), "archived", button),
                delete: async (menuId) => {
                    this.selectedEntryId = Number(menuId.replace(/^entry:/, ""));
                    await this.deleteEntry();
                }
            });
            this.updateEntryBulkBar();
        }

        updateEntryBulkBar() {
            if (!this.entriesBulkBar || !this.entriesBulkCount) return;
            const selectedCount = this.selectedEntryIds.size;
            this.entriesBulkBar.hidden = selectedCount === 0;
            this.entriesBulkCount.textContent = `${selectedCount} ${selectedCount === 1 ? "entry" : "entries"} selected`;
            const selectAll = this.entriesList?.querySelector("#entriesSelectAll");
            if (selectAll) {
                const visibleIds = new Set((this.filteredEntries || []).map((entry) => Number(entry.id)));
                selectAll.checked = visibleIds.size > 0 && [...visibleIds].every((id) => this.selectedEntryIds.has(id));
            }
        }

        toggleEntrySelection(entryId, checked) {
            const id = Number(entryId);
            if (!id) return;
            if (checked) {
                this.selectedEntryIds.add(id);
            } else {
                this.selectedEntryIds.delete(id);
            }
            this.updateEntryBulkBar();
        }

        toggleAllEntrySelections(checked) {
            (this.filteredEntries || []).forEach((entry) => {
                const id = Number(entry.id);
                if (!id) return;
                if (checked) {
                    this.selectedEntryIds.add(id);
                } else {
                    this.selectedEntryIds.delete(id);
                }
            });
            this.renderEntries();
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
                const required = field.required ? ' <span class="required-marker">*</span>' : "";
                const wide = fieldType === "textarea" || fieldType === "richtext" || fieldType === "markdown";
                const fieldClass = `field${wide ? " full" : ""}`;
                const inputId = this.getFieldDomId("entry-field", fieldName);
                const errorId = `${inputId}-error`;
                const errorHtml = `<span id="${this.escapeAttribute(errorId)}" class="field-error" hidden></span>`;
                const requiredAttrs = field.required ? `required aria-required="true"` : "";
                const describedBy = `aria-describedby="${this.escapeAttribute(errorId)}"`;

                if (fieldType === "boolean") {
                    return `
                        <label class="${fieldClass}">
                            <span>${this.escapeHtml(label)}${required}</span>
                            <span class="field-checkbox">
                                <input id="${this.escapeAttribute(inputId)}" type="checkbox" data-entry-field="${this.escapeHtml(fieldName)}" ${describedBy} ${value ? "checked" : ""}>
                                <span>${this.escapeHtml(fieldName)}</span>
                            </span>
                            ${errorHtml}
                        </label>
                    `;
                }

                if (fieldType === "textarea" || fieldType === "richtext" || fieldType === "markdown") {
                    return `
                        <label class="${fieldClass}">
                            <span>${this.escapeHtml(label)}${required}</span>
                            <textarea id="${this.escapeAttribute(inputId)}" data-entry-field="${this.escapeHtml(fieldName)}" rows="${fieldType === "textarea" ? 4 : 8}" ${requiredAttrs} ${describedBy}>${this.escapeHtml(value == null ? "" : String(value))}</textarea>
                            ${errorHtml}
                        </label>
                    `;
                }

                if (fieldType === "select") {
                    const options = Array.isArray(field.options) ? field.options : [];
                    return `
                        <label class="${fieldClass}">
                            <span>${this.escapeHtml(label)}${required}</span>
                            <select id="${this.escapeAttribute(inputId)}" data-entry-field="${this.escapeHtml(fieldName)}" ${requiredAttrs} ${describedBy}>
                                <option value="">Select...</option>
                                ${options.map((option) => `<option value="${this.escapeHtml(option)}" ${String(value || "") === String(option) ? "selected" : ""}>${this.escapeHtml(this.humanizeLabel(option))}</option>`).join("")}
                            </select>
                            ${errorHtml}
                        </label>
                    `;
                }

                if (fieldType === "repeater") {
                    return `
                        <label class="${fieldClass} full">
                            <span>${this.escapeHtml(label)}${required}</span>
                            <textarea id="${this.escapeAttribute(inputId)}" data-entry-field="${this.escapeHtml(fieldName)}" data-entry-json="true" rows="7" ${requiredAttrs} ${describedBy}>${this.escapeHtml(JSON.stringify(value || [], null, 2))}</textarea>
                            ${errorHtml}
                        </label>
                    `;
                }

                if (fieldType === "image") {
                    return `
                        <label class="${fieldClass}">
                            <span>${this.escapeHtml(label)}${required}</span>
                            <span class="media-field-control">
                                <input id="${this.escapeAttribute(inputId)}" type="url" data-entry-field="${this.escapeHtml(fieldName)}" value="${this.escapeHtml(value == null ? "" : String(value))}" ${requiredAttrs} ${describedBy}>
                                <button class="btn btn-secondary" type="button" data-open-media-picker="${this.escapeHtml(fieldName)}">Browse</button>
                            </span>
                            ${errorHtml}
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
                        <span>${this.escapeHtml(label)}${required}</span>
                        <input id="${this.escapeAttribute(inputId)}" type="${inputType}" data-entry-field="${this.escapeHtml(fieldName)}" value="${this.escapeHtml(value == null ? "" : String(value))}" ${requiredAttrs} ${describedBy}>
                        ${errorHtml}
                    </label>
                `;
            }).join("");

            this.entryFormFields.querySelectorAll("[data-open-media-picker]").forEach((button) => {
                button.addEventListener("click", () => this.openMediaPicker({
                    type: "entry-field",
                    fieldName: button.dataset.openMediaPicker || "",
                    allowImages: true
                }));
            });
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

                if (element.dataset.entryJson === "true") {
                    try {
                        data[key] = JSON.parse(element.value || "[]");
                    } catch (error) {
                        data[key] = [];
                    }
                    return;
                }

                data[key] = element.value;
            });
            return data;
        }

        validateEntryData(data) {
            const collection = this.getCollection(this.selectedCollection);
            const missing = this.getSchemaFields(collection).filter((field) => {
                if (!field.required) return false;
                const value = data[field.name];
                if (field.type === "boolean") return false;
                if (Array.isArray(value)) return value.length === 0;
                return value === undefined || value === null || String(value).trim() === "";
            });

            this.entryFormFields.querySelectorAll("[data-entry-field]").forEach((element) => {
                const isMissing = missing.some((field) => field.name === element.dataset.entryField);
                const label = missing.find((field) => field.name === element.dataset.entryField)?.label || element.dataset.entryField;
                this.setFieldError(element, isMissing ? `${label} is required.` : "");
            });

            return missing;
        }

        resetCollectionForm(collection = null) {
            this.setFieldError(this.collectionSlug, "");
            this.setFieldError(this.collectionName, "");
            if (!collection) {
                this.collectionSlug.disabled = false;
                this.collectionSlug.value = "";
                this.collectionName.value = "";
                this.collectionTemplate.value = "custom";
                this.collectionSingleton.checked = false;
                this.collectionSchema.value = this.formatJson(COLLECTION_TEMPLATES.custom.schema, COLLECTION_TEMPLATES.custom.schema);
                this.setSchemaFields(COLLECTION_TEMPLATES.custom.schema.fields);
                return;
            }

            this.collectionSlug.disabled = true;
            this.collectionSlug.value = collection.slug || "";
            this.collectionName.value = collection.name || "";
            this.collectionTemplate.value = "custom";
            this.collectionSingleton.checked = this.isSingletonCollection(collection);
            this.collectionSchema.value = this.formatJson(collection.schema || COLLECTION_TEMPLATES.custom.schema, COLLECTION_TEMPLATES.custom.schema);
            this.setSchemaFields((collection.schema || COLLECTION_TEMPLATES.custom.schema).fields || []);
        }

        resetEntryForm(entry = null) {
            this.setFieldError(this.entryKey, "");
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
                await this.loadDashboardData();

                if (this.selectedCollection) {
                    this.resetCollectionForm(this.getCollection(this.selectedCollection));
                    await this.loadEntries();
                } else {
                    this.entries = [];
                    this.filteredEntries = [];
                    this.renderEntries();
                    this.resetCollectionForm();
                    this.resetEntryForm();
                    this.updateDashboard();
                }
            } catch (error) {
                this.sectionsList.innerHTML = `<p class="empty">Failed to load collections: ${this.escapeHtml(error.message)}</p>`;
                this.toast(`Failed to load collections: ${error.message}`, "error");
                this.updateDashboard();
            }
        }

        async selectCollection(slug) {
            this.selectedCollection = slug || null;
            this.selectedEntryId = null;
            this.selectedEntryIds.clear();
            this.entriesSearch.value = "";
            if (this.entriesStatusFilter) this.entriesStatusFilter.value = "all";
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
                this.selectedEntryIds.forEach((id) => {
                    if (!this.entries.some((item) => Number(item.id) === Number(id))) {
                        this.selectedEntryIds.delete(id);
                    }
                });

                this.applyEntrySearch();
                const activeEntry = this.entries.find((item) => Number(item.id) === Number(this.selectedEntryId)) || null;
                this.resetEntryForm(activeEntry);
                this.updateDashboard();
            } catch (error) {
                this.entries = [];
                this.filteredEntries = [];
                this.entriesList.innerHTML = `<p class="empty">Failed to load entries: ${this.escapeHtml(error.message)}</p>`;
                this.toast(`Failed to load entries: ${error.message}`, "error");
                this.updateDashboard();
            }
        }

        selectEntry(entryId) {
            const numericId = Number(entryId);
            const entry = this.entries.find((item) => Number(item.id) === numericId) || null;
            this.selectedEntryId = entry ? numericId : null;
            this.renderEntries();
            this.resetEntryForm(entry);
        }

        async updateEntryStatus(entryId, status, triggerButton = null) {
            const entry = this.entries.find((item) => Number(item.id) === Number(entryId));
            if (!entry) return;
            this.setButtonLoading(triggerButton, true, "Updating...");
            try {
                await this.requestJson(`/api/cms/entries/${encodeURIComponent(entry.id)}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        collection: entry.collection,
                        entryKey: entry.entryKey,
                        status,
                        sortOrder: entry.sortOrder,
                        data: entry.data || {}
                    })
                });
                this.toast(`Entry ${status}: ${entry.entryKey}`);
                await this.loadEntries();
                await this.loadDashboardData();
            } catch (error) {
                this.toast(`Failed to update entry: ${error.message}`, "error");
            } finally {
                this.setButtonLoading(triggerButton, false);
            }
        }

        async duplicateEntry(entryId, triggerButton = null) {
            const entry = this.entries.find((item) => Number(item.id) === Number(entryId));
            if (!entry) return;
            const entryKey = `${entry.entryKey || "entry"}_copy_${Date.now()}`;
            this.setButtonLoading(triggerButton, true, "Duplicating...");
            try {
                const result = await this.requestJson("/api/cms/entries", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        collection: entry.collection,
                        entryKey,
                        status: "draft",
                        sortOrder: Number(entry.sortOrder || 0) + 1,
                        data: { ...(entry.data || {}) }
                    })
                });
                this.selectedEntryId = result?.data?.id || null;
                this.toast(`Entry duplicated: ${entryKey}`);
                await this.loadEntries();
                await this.loadDashboardData();
            } catch (error) {
                this.toast(`Failed to duplicate entry: ${error.message}`, "error");
            } finally {
                this.setButtonLoading(triggerButton, false);
            }
        }

        async applyBulkEntryAction(action) {
            const ids = [...this.selectedEntryIds];
            if (!ids.length) return;
            if (action === "delete") {
                const confirmed = await this.confirmAction({
                    title: "Delete Selected Entries",
                    description: `Delete ${ids.length} selected entries?`,
                    confirmLabel: "Delete Entries"
                });
                if (!confirmed) {
                    return;
                }
            }

            try {
                for (const id of ids) {
                    if (action === "delete") {
                        await this.requestJson(`/api/cms/entries/${encodeURIComponent(id)}`, { method: "DELETE" });
                    } else {
                        const entry = this.entries.find((item) => Number(item.id) === Number(id));
                        if (!entry) continue;
                        await this.requestJson(`/api/cms/entries/${encodeURIComponent(id)}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                collection: entry.collection,
                                entryKey: entry.entryKey,
                                status: action,
                                sortOrder: entry.sortOrder,
                                data: entry.data || {}
                            })
                        });
                    }
                }
                this.selectedEntryIds.clear();
                this.toast(`Bulk action completed for ${ids.length} entries.`);
                await this.loadEntries();
                await this.loadDashboardData();
            } catch (error) {
                this.toast(`Bulk action failed: ${error.message}`, "error");
            }
        }

        async saveCollection() {
            const slug = String(this.collectionSlug.value || "").trim();
            const name = String(this.collectionName.value || "").trim();
            this.setFieldError(this.collectionSlug, "");
            this.setFieldError(this.collectionName, "");
            if (!slug || !name) {
                if (!slug) this.setFieldError(this.collectionSlug, "Collection slug is required.");
                if (!name) this.setFieldError(this.collectionName, "Collection name is required.");
                (slug ? this.collectionName : this.collectionSlug)?.focus();
                this.toast("Collection slug and name are required", "error");
                return;
            }

            let schema;
            try {
                this.writeSchemaFromFieldBuilder();
                schema = this.parseJson(this.collectionSchema.value, COLLECTION_TEMPLATES.custom.schema) || COLLECTION_TEMPLATES.custom.schema;
            } catch (error) {
                this.toast(`Invalid schema JSON: ${error.message}`, "error");
                return;
            }
            schema.mode = this.collectionSingleton.checked ? "singleton" : (schema.mode || "collection");

            this.setButtonLoading(this.saveCollectionButton, true, "Saving...");
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
            } finally {
                this.setButtonLoading(this.saveCollectionButton, false);
            }
        }

        async deleteCollection() {
            if (!this.selectedCollection) {
                this.toast("Select a collection first", "error");
                return;
            }

            const confirmed = await this.confirmAction({
                title: "Delete Content Type",
                description: `Delete content type "${this.selectedCollection}"?`,
                confirmLabel: "Delete Content Type"
            });
            if (!confirmed) {
                return;
            }

            this.setButtonLoading(this.deleteCollectionButton, true, "Deleting...");
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
            } finally {
                this.setButtonLoading(this.deleteCollectionButton, false);
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
            this.setFieldError(this.entryKey, "");
            if (!entryKey) {
                this.setFieldError(this.entryKey, "Entry key is required.");
                this.entryKey.focus();
                this.toast("Entry key is required", "error");
                return;
            }

            const missingFields = this.validateEntryData(data);
            if (missingFields.length > 0) {
                this.entryFormFields.querySelector(".is-invalid")?.focus();
                this.toast(`Required fields missing: ${missingFields.map((field) => field.label || field.name).join(", ")}`, "error");
                return;
            }

            const payload = {
                collection: this.selectedCollection,
                entryKey,
                status: this.entryStatus.value || "draft",
                sortOrder: Number(this.entrySortOrder.value || 0),
                data
            };

            this.setButtonLoading(this.saveEntryButton, true, "Saving...");
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
            } finally {
                this.setButtonLoading(this.saveEntryButton, false);
            }
        }

        async deleteEntry() {
            if (!this.selectedEntryId) {
                this.toast("Select an entry first", "error");
                return;
            }

            const entry = this.entries.find((item) => Number(item.id) === Number(this.selectedEntryId));
            const confirmed = await this.confirmAction({
                title: "Delete Entry",
                description: `Delete "${this.getEntryLabel(entry || {}) || "this entry"}"?`,
                confirmLabel: "Delete Entry"
            });
            if (!confirmed) {
                return;
            }

            this.setButtonLoading(this.deleteEntryButton, true, "Deleting...");
            try {
                await this.requestJson(`/api/cms/entries/${encodeURIComponent(this.selectedEntryId)}`, {
                    method: "DELETE"
                });
                this.toast("Entry deleted");
                this.selectedEntryId = null;
                await this.loadEntries();
            } catch (error) {
                this.toast(`Failed to delete entry: ${error.message}`, "error");
            } finally {
                this.setButtonLoading(this.deleteEntryButton, false);
            }
        }

        async loadViews() {
            if (this.viewsState) {
                this.viewsState.innerHTML = `<div class="loading-state">Loading views...</div>`;
                this.viewsState.hidden = false;
            }
            try {
                const [viewsResult, themesResult] = await Promise.all([
                    this.requestJson("/api/cms/views"),
                    this.themes.length ? Promise.resolve({ data: this.themes }) : this.requestJson("/api/cms/themes").catch(() => ({ data: this.themes }))
                ]);
                this.views = Array.isArray(viewsResult?.data) ? viewsResult.data : [];
                this.themes = Array.isArray(themesResult?.data) ? themesResult.data : this.themes;
                if (!this.selectedViewId && this.views[0]) this.selectedViewId = this.views[0].viewId;
                this.renderViews();
                this.renderViewEditor();
                if (this.viewsState) this.viewsState.hidden = true;
            } catch (error) {
                if (this.viewsState) {
                    this.viewsState.hidden = false;
                    this.viewsState.innerHTML = `<div class="error-state"><strong>Could not load views.</strong><span>${this.escapeHtml(error.message)}</span><button class="btn btn-secondary" type="button" data-views-retry>Try Again</button></div>`;
                    this.viewsState.querySelector("[data-views-retry]")?.addEventListener("click", () => this.loadViews());
                }
            }
        }

        renderViews() {
            if (!this.viewsTableRows) return;
            const query = String(this.viewsSearchQuery || "").trim().toLowerCase();
            const filtered = this.views.filter((view) => !query || `${view.viewId || ""} ${view.label || ""} ${view.collection || ""} ${view.description || ""}`.toLowerCase().includes(query));
            if (!filtered.length) {
                this.viewsTableRows.innerHTML = `<tr><td colspan="5"><div class="empty-state"><strong>No Views found.</strong><span>Create a listing or page display from a CMS collection.</span></div></td></tr>`;
                return;
            }
            this.viewsTableRows.innerHTML = filtered.map((view) => {
                const validation = view.validation || {};
                const status = validation.status || (validation.errors?.length ? "error" : validation.warnings?.length ? "warning" : "valid");
                const statusClass = status === "valid" ? "is-success" : status === "warning" ? "is-warning" : "is-danger";
                const displays = Array.isArray(view.displays) ? view.displays : [];
                return `
                    <tr class="${view.viewId === this.selectedViewId ? "is-selected" : ""}" data-view-row="${this.escapeAttribute(view.viewId)}">
                        <td data-label="Name"><strong>${this.escapeHtml(view.label || view.viewId)}</strong><br><small>${this.escapeHtml(view.viewId)}</small></td>
                        <td data-label="Collection">${this.escapeHtml(this.getCollection(view.collection)?.name || view.collection || "Missing")}</td>
                        <td data-label="Displays">${displays.length ? displays.map((display) => `<span class="status-badge is-muted">${this.escapeHtml(display.type)}:${this.escapeHtml(display.displayId)}</span>`).join(" ") : "None"}</td>
                        <td data-label="Validation"><span class="status-badge ${statusClass}">${this.escapeHtml(status)}</span></td>
                        <td data-label="Actions"><button class="btn btn-secondary btn-small" type="button" data-view-edit="${this.escapeAttribute(view.viewId)}">Edit</button></td>
                    </tr>
                `;
            }).join("");
            this.viewsTableRows.querySelectorAll("[data-view-row]").forEach((row) => {
                row.addEventListener("click", (event) => {
                    if (event.target.closest("[data-view-edit]")) return;
                    this.selectedViewId = row.dataset.viewRow;
                    this.renderViews();
                    this.renderViewEditor();
                });
            });
            this.viewsTableRows.querySelectorAll("[data-view-edit]").forEach((button) => {
                button.addEventListener("click", () => {
                    this.selectedViewId = button.dataset.viewEdit;
                    this.renderViews();
                    this.renderViewEditor();
                });
            });
        }

        getSelectedView() {
            return this.views.find((view) => view.viewId === this.selectedViewId) || null;
        }

        createViewDraft() {
            const viewId = `view-${Date.now()}`;
            const draft = {
                viewId,
                label: "New View",
                description: "",
                collection: this.selectedCollection || this.collections[0]?.slug || "",
                query: { status: "published", filters: {}, sort: [], limit: 10 },
                displays: [{ displayId: "block", label: "Block", type: "block", route: "", rowComponent: "", emptyComponent: "", settings: {} }],
                validation: { status: "warning", warnings: [], errors: [] }
            };
            this.views = [draft, ...this.views.filter((view) => view.viewId !== viewId)];
            this.selectedViewId = viewId;
            this.renderViews();
            this.renderViewEditor();
            this.viewId?.focus();
        }

        getViewFieldOptions(collectionSlug = "") {
            const collection = this.getCollection(collectionSlug || this.viewCollection?.value || "");
            const schemaFields = this.getSchemaFields(collection).map((field) => field.name);
            return ["entry-key", "status", "sort-order", "updated-at", ...schemaFields];
        }

        populateViewFieldOptions() {
            if (!this.viewSortField) return;
            const current = this.viewSortField.value;
            const options = this.getViewFieldOptions();
            this.viewSortField.innerHTML = `<option value="">Default order</option>` + options.map((field) => `<option value="${this.escapeAttribute(field)}">${this.escapeHtml(this.humanizeLabel(field))}</option>`).join("");
            this.viewSortField.value = options.includes(current) ? current : "";
        }

        renderViewEditor() {
            const view = this.getSelectedView();
            if (this.viewCollection) {
                const current = view?.collection || this.collections[0]?.slug || "";
                this.viewCollection.innerHTML = `<option value="">Choose collection</option>` + this.collections.map((collection) => `<option value="${this.escapeAttribute(collection.slug)}">${this.escapeHtml(collection.name || collection.slug)}</option>`).join("");
                this.viewCollection.value = current;
            }
            this.populateViewFieldOptions();
            if (!view) {
                if (this.viewEditorTitle) this.viewEditorTitle.textContent = "Select a View";
                if (this.viewEditorBadge) {
                    this.viewEditorBadge.className = "status-badge is-muted";
                    this.viewEditorBadge.textContent = "Idle";
                }
                [this.viewId, this.viewLabel, this.viewDescription, this.viewFilters].forEach((input) => { if (input) input.value = ""; });
                if (this.viewLimit) this.viewLimit.value = "10";
                if (this.viewStatus) this.viewStatus.value = "published";
                if (this.viewSortDirection) this.viewSortDirection.value = "asc";
                if (this.viewPager) this.viewPager.checked = false;
                if (this.viewDisplays) this.viewDisplays.innerHTML = `<div class="empty-state"><span>Select or create a View.</span></div>`;
                if (this.viewPreviewResults) this.viewPreviewResults.innerHTML = "";
                if (this.viewPreviewState) this.viewPreviewState.innerHTML = "";
                if (this.viewValidation) this.viewValidation.innerHTML = "";
                return;
            }
            const validation = view.validation || {};
            const status = validation.status || (validation.errors?.length ? "error" : validation.warnings?.length ? "warning" : "valid");
            if (this.viewEditorTitle) this.viewEditorTitle.textContent = view.label || view.viewId;
            if (this.viewEditorBadge) {
                this.viewEditorBadge.className = `status-badge ${status === "valid" ? "is-success" : status === "warning" ? "is-warning" : "is-danger"}`;
                this.viewEditorBadge.textContent = status;
            }
            if (this.viewId) this.viewId.value = view.viewId || "";
            if (this.viewLabel) this.viewLabel.value = view.label || "";
            if (this.viewDescription) this.viewDescription.value = view.description || "";
            if (this.viewStatus) this.viewStatus.value = view.query?.status || "published";
            if (this.viewLimit) this.viewLimit.value = Number(view.query?.limit ?? 10);
            if (this.viewSortField) this.viewSortField.value = view.query?.sort?.[0]?.field || "";
            if (this.viewSortDirection) this.viewSortDirection.value = view.query?.sort?.[0]?.direction || "asc";
            if (this.viewFilters) this.viewFilters.value = this.formatViewFilters(view.query?.filters || {});
            if (this.viewPager) this.viewPager.checked = Boolean(view.query?.pager);
            this.renderViewDisplays(view);
            this.renderViewValidation(view);
            this.renderViewPreviewDisplayOptions(view);
        }

        formatViewFilters(filters = {}) {
            return Object.entries(filters || {}).map(([key, value]) => `${key}=${value?.value ?? value}`).join(", ");
        }

        parseViewFilters(value = "") {
            return String(value || "").split(",").map((item) => item.trim()).filter(Boolean).reduce((acc, item) => {
                const [key, ...rest] = item.split("=");
                const field = this.slugify(key || "", "");
                if (!field) return acc;
                const raw = rest.join("=").trim();
                if (raw === "true") acc[field] = true;
                else if (raw === "false") acc[field] = false;
                else if (raw !== "" && Number.isFinite(Number(raw))) acc[field] = Number(raw);
                else acc[field] = raw;
                return acc;
            }, {});
        }

        renderViewDisplays(view = {}) {
            if (!this.viewDisplays) return;
            const displays = Array.isArray(view?.displays) ? view.displays : [];
            if (!displays.length) {
                this.viewDisplays.innerHTML = `<div class="empty-state"><span>Add a block or page display.</span></div>`;
                this.renderViewPreviewDisplayOptions(view);
                return;
            }
            this.viewDisplays.innerHTML = displays.map((display, index) => `
                <div class="view-display-row" data-view-display-index="${index}">
                    <div class="field-grid compact-field-grid">
                        <label class="field"><span>Display ID</span><input type="text" value="${this.escapeHtml(display.displayId || "")}" data-view-display-field="displayId"></label>
                        <label class="field"><span>Label</span><input type="text" value="${this.escapeHtml(display.label || "")}" data-view-display-field="label"></label>
                        <label class="field"><span>Type</span><select data-view-display-field="type"><option value="block" ${display.type !== "page" ? "selected" : ""}>Block</option><option value="page" ${display.type === "page" ? "selected" : ""}>Page</option></select></label>
                        <label class="field"><span>Route</span><input type="text" value="${this.escapeHtml(display.route || "")}" placeholder="/news" data-view-display-field="route"></label>
                        <label class="field"><span>Layout / Template</span><input type="text" value="${this.escapeHtml(display.layoutId || "")}" placeholder="listing-layout.json" data-view-display-field="layoutId"></label>
                        <label class="field"><span>Row Component</span><input type="text" value="${this.escapeHtml(display.rowComponent || "")}" placeholder="blog/blog_grid.html" data-view-display-field="rowComponent"></label>
                        <label class="field"><span>Empty Component</span><input type="text" value="${this.escapeHtml(display.emptyComponent || "")}" data-view-display-field="emptyComponent"></label>
                    </div>
                    <button class="btn btn-danger btn-small" type="button" data-view-display-delete="${index}">Remove Display</button>
                </div>
            `).join("");
            this.viewDisplays.querySelectorAll("[data-view-display-delete]").forEach((button) => {
                button.addEventListener("click", () => {
                    const current = this.collectViewDisplays();
                    current.splice(Number(button.dataset.viewDisplayDelete), 1);
                    const viewRecord = this.getSelectedView();
                    if (viewRecord) viewRecord.displays = current;
                    this.renderViewDisplays({ displays: current });
                    this.renderViewPreviewDisplayOptions({ displays: current });
                });
            });
        }

        collectViewDisplays() {
            const displays = [];
            this.viewDisplays?.querySelectorAll("[data-view-display-index]").forEach((row, index) => {
                const getValue = (field) => String(row.querySelector(`[data-view-display-field="${field}"]`)?.value || "").trim();
                displays.push({
                    displayId: this.slugify(getValue("displayId") || `display-${index + 1}`, `display-${index + 1}`),
                    label: getValue("label") || this.humanizeLabel(getValue("displayId") || `Display ${index + 1}`),
                    type: getValue("type") === "page" ? "page" : "block",
                    route: getValue("route"),
                    layoutId: getValue("layoutId"),
                    rowComponent: getValue("rowComponent"),
                    emptyComponent: getValue("emptyComponent"),
                    settings: {}
                });
            });
            return displays;
        }

        addViewDisplay() {
            const current = this.collectViewDisplays();
            current.push({ displayId: `display-${current.length + 1}`, label: `Display ${current.length + 1}`, type: "block", route: "", layoutId: "", rowComponent: "", emptyComponent: "", settings: {} });
            const view = this.getSelectedView();
            if (view) view.displays = current;
            this.renderViewDisplays({ displays: current });
            this.renderViewPreviewDisplayOptions({ displays: current });
        }

        collectViewPayload() {
            const existing = this.getSelectedView() || {};
            const sortField = String(this.viewSortField?.value || "").trim();
            return {
                ...existing,
                viewId: this.slugify(this.viewId?.value || "", ""),
                label: String(this.viewLabel?.value || "").trim(),
                description: String(this.viewDescription?.value || "").trim(),
                collection: String(this.viewCollection?.value || "").trim(),
                query: {
                    status: String(this.viewStatus?.value || "published").trim(),
                    filters: this.parseViewFilters(this.viewFilters?.value || ""),
                    sort: sortField ? [{ field: sortField, direction: String(this.viewSortDirection?.value || "asc") }] : [],
                    limit: Number.isFinite(Number(this.viewLimit?.value)) ? Number(this.viewLimit.value) : 10,
                    pager: Boolean(this.viewPager?.checked)
                },
                displays: this.collectViewDisplays()
            };
        }

        renderViewValidation(view = {}) {
            if (!this.viewValidation) return;
            const validation = view.validation || {};
            const issues = [...(validation.errors || []), ...(validation.warnings || [])];
            if (!issues.length) {
                this.viewValidation.innerHTML = `<div class="success-state"><strong>No validation issues.</strong><span>View is ready for theme export.</span></div>`;
                return;
            }
            this.viewValidation.innerHTML = issues.map((issue) => `<div class="${String(issue.code || "").includes("NOT_FOUND") || String(issue.code || "").includes("MISSING") ? "warning-state" : "detail-card"}"><strong>${this.escapeHtml(issue.code || "VIEW_VALIDATION")}</strong><span>${this.escapeHtml(issue.message || "")}</span></div>`).join("");
        }

        renderViewPreviewDisplayOptions(view = this.getSelectedView()) {
            if (!this.viewPreviewDisplay) return;
            const displays = Array.isArray(view?.displays) ? view.displays : this.collectViewDisplays();
            this.viewPreviewDisplay.innerHTML = displays.length
                ? displays.map((display) => `<option value="${this.escapeAttribute(display.displayId)}">${this.escapeHtml(display.label || display.displayId)} (${this.escapeHtml(display.type || "block")})</option>`).join("")
                : `<option value="">No displays</option>`;
        }

        async saveView() {
            const payload = this.collectViewPayload();
            if (!payload.viewId || !payload.label || !payload.collection) {
                this.toast("View ID, label, and collection are required.", "error");
                return;
            }
            this.setButtonLoading(this.viewSaveButton, true, "Saving...");
            try {
                const existing = this.views.some((view) => view.viewId === payload.viewId && view.createdAt);
                const result = await this.requestJson(existing ? `/api/cms/views/${encodeURIComponent(payload.viewId)}` : "/api/cms/views", {
                    method: existing ? "PUT" : "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const saved = result?.data || payload;
                this.selectedViewId = saved.viewId;
                this.views = [saved, ...this.views.filter((view) => view.viewId !== saved.viewId)];
                this.toast(`View saved: ${saved.label || saved.viewId}`);
                this.renderViews();
                this.renderViewEditor();
                await this.loadThemes();
            } catch (error) {
                const details = error.details?.errors?.[0]?.message ? `: ${error.details.errors[0].message}` : "";
                this.toast(`View save failed${details || `: ${error.message}`}`, "error");
            } finally {
                this.setButtonLoading(this.viewSaveButton, false);
            }
        }

        async deleteView() {
            const view = this.getSelectedView();
            if (!view) {
                this.toast("Select a View first.", "error");
                return;
            }
            const confirmed = await this.confirmAction({
                title: "Delete View",
                description: `Delete "${view.label || view.viewId}"?`,
                confirmLabel: "Delete View"
            });
            if (!confirmed) return;
            this.setButtonLoading(this.viewDeleteButton, true, "Deleting...");
            try {
                await this.requestJson(`/api/cms/views/${encodeURIComponent(view.viewId)}`, { method: "DELETE" });
                this.views = this.views.filter((item) => item.viewId !== view.viewId);
                this.selectedViewId = this.views[0]?.viewId || null;
                this.toast("View deleted.");
                this.renderViews();
                this.renderViewEditor();
                await this.loadThemes();
            } catch (error) {
                this.toast(`View delete failed: ${error.message}`, "error");
            } finally {
                this.setButtonLoading(this.viewDeleteButton, false);
            }
        }

        async previewView() {
            const payload = this.collectViewPayload();
            const existing = this.views.find((view) => view.viewId === payload.viewId && view.createdAt);
            if (!existing) {
                this.toast("Save the View before previewing.", "warning");
                return;
            }
            if (this.viewPreviewState) this.viewPreviewState.innerHTML = `<div class="loading-state">Loading preview...</div>`;
            this.setButtonLoading(this.viewPreviewButton, true, "Previewing...");
            try {
                const result = await this.requestJson(`/api/cms/views/${encodeURIComponent(payload.viewId)}/preview`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ displayId: this.viewPreviewDisplay?.value || "" })
                });
                const data = result?.data || {};
                const entries = Array.isArray(data.entries) ? data.entries : [];
                if (this.viewPreviewState) this.viewPreviewState.innerHTML = `<div class="success-state"><strong>${entries.length} result${entries.length === 1 ? "" : "s"}</strong><span>${this.escapeHtml(data.collection?.name || data.collection?.slug || "")}</span></div>`;
                if (this.viewPreviewResults) {
                    this.viewPreviewResults.innerHTML = entries.length ? entries.map((entry) => `<div class="detail-card"><strong>${this.escapeHtml(this.getEntryLabel(entry) || entry.entryKey)}</strong><span>${this.escapeHtml(entry.entryKey || "")} - ${this.escapeHtml(entry.status || "")}</span></div>`).join("") : `<div class="empty-state"><span>No entries matched this View.</span></div>`;
                }
            } catch (error) {
                if (this.viewPreviewState) this.viewPreviewState.innerHTML = `<div class="error-state"><strong>Preview failed.</strong><span>${this.escapeHtml(error.message)}</span></div>`;
            } finally {
                this.setButtonLoading(this.viewPreviewButton, false);
            }
        }

         getCmsBuilderComponents() {
             const theme = this.getSelectedTheme?.() || this.themes[0] || {};
             const partials = Array.isArray(theme.partials) ? theme.partials : [];
             if (partials.length) {
                 return partials.map((partial) => {
                     const componentPath = partial.componentPath || partial.partial || "";
                     return {
                         name: partial.name || this.humanizeLabel(componentPath.split("/").pop()?.replace(/\.html?$/i, "") || "Partial"),
                         componentPath,
                         partial: componentPath,
                         group: partial.group || "",
                         allowedRegions: Array.isArray(partial.allowedRegions) ? partial.allowedRegions : [],
                         ready: partial.ready !== false
                     };
                 }).filter((partial) => partial.componentPath && !partial.componentPath.includes('/micro/'));
             }
             return [
                 { name: "Navbar", componentPath: "partials/landmark/header.html", allowedRegions: ["header"], ready: true },
                 { name: "Hero Section", componentPath: "partials/home/hero.html", allowedRegions: ["hero", "content-above"], ready: true },
                 { name: "Project Grid", componentPath: "partials/home/projects.html", allowedRegions: ["main", "content-below"], ready: true },
                 { name: "CTA Block", componentPath: "partials/home/cta.html", allowedRegions: ["main", "content-below"], ready: true },
                 { name: "Footer Link Grid", componentPath: "partials/landmark/footer.html", allowedRegions: ["footer"], ready: true }
             ];
         }

        openCmsBlockPicker(regionId = "main") {
            if (!this.cmsBlockPickerModal) {
                this.addCmsBuilderBlock();
                return;
            }
            this.cmsBuilderActiveRegion = regionId || "main";
            this.cmsBuilderPartialSearchQuery = "";
            if (this.cmsBlockPickerSearch) {
                this.cmsBlockPickerSearch.value = "";
            }
            this.lastFocusedElement = document.activeElement;
            this.renderCmsBlockPicker();
            this.cmsBlockPickerModal.hidden = false;
            window.setTimeout(() => this.cmsBlockPickerSearch?.focus(), 0);
        }

        closeCmsBlockPicker() {
            if (this.cmsBlockPickerModal) {
                this.cmsBlockPickerModal.hidden = true;
            }
            this.restoreFocus();
        }

        renderCmsBlockPicker() {
            if (!this.cmsBlockPickerList) return;
            const query = String(this.cmsBuilderPartialSearchQuery || "").trim().toLowerCase();
            const components = this.getCmsBuilderComponents().filter((component) => {
                const haystack = `${component.name} ${component.componentPath} ${component.group || ""}`.toLowerCase();
                return !query || haystack.includes(query);
            });
            this.cmsBlockPickerList.innerHTML = components.map((component) => `
                <button class="cms-builder-component" type="button" data-cms-builder-pick-partial="${this.escapeAttribute(component.componentPath)}">
                    <span class="cms-builder-component-icon" aria-hidden="true">+</span>
                    <span>
                        <strong>${this.escapeHtml(component.name)}</strong>
                        <small>${this.escapeHtml(component.componentPath)}</small>
                        ${component.group ? `<em>${this.escapeHtml(component.group)}</em>` : ""}
                    </span>
                </button>
            `).join("") || `<div class="empty-state"><span>No partials match the search.</span></div>`;
            this.cmsBlockPickerList.querySelectorAll("[data-cms-builder-pick-partial]").forEach((button) => {
                button.addEventListener("click", () => {
                    this.addCmsBuilderBlock(button.dataset.cmsBuilderPickPartial || "");
                    this.closeCmsBlockPicker();
                });
            });
        }

        async loadCmsBuilder() {
            if (this.cmsBuilderState) {
                this.cmsBuilderState.hidden = false;
                this.cmsBuilderState.innerHTML = `<div class="loading-state">Loading CMS block layouts...</div>`;
            }
            try {
                {
                    const [templatesResult, themesResult] = await Promise.all([
                        this.templates.length ? Promise.resolve({ data: this.templates }) : this.requestJson("/api/cms/templates"),
                        this.requestJson("/api/cms/themes")
                    ]);
                    this.templates = Array.isArray(templatesResult?.data) ? templatesResult.data : [];
                    this.themes = Array.isArray(themesResult?.data) ? themesResult.data : this.themes;
                }
                if (!this.cmsBuilderSelectedTemplateId) {
                    this.cmsBuilderSelectedTemplateId = this.selectedTemplateId || this.templates[0]?.templateId || null;
                }
                if (!this.cmsBuilderSelectedTemplateId) {
                    this.createCmsBuilderDraft({ silent: true });
                }
                this.renderCmsBuilder();
                if (this.cmsBuilderState) {
                    this.cmsBuilderState.hidden = true;
                }
            } catch (error) {
                if (this.cmsBuilderState) {
                    this.cmsBuilderState.hidden = false;
                    this.cmsBuilderState.innerHTML = `<div class="error-state"><strong>Could not load block layouts.</strong><span>${this.escapeHtml(error.message)}</span></div>`;
                }
            }
        }

        getCmsBuilderTemplate() {
            return this.templates.find((template) => template.templateId === this.cmsBuilderSelectedTemplateId) || null;
        }

        getCmsBuilderRegions(template = null) {
            return this.getTemplateRegionIds(template).map((id) => {
                const theme = this.getSelectedTheme?.() || this.themes[0] || {};
                const definition = (theme.regionDefinitions || []).find((region) => region.id === id) || {};
                return {
                    id,
                    label: definition.label || this.humanizeLabel(id),
                    required: Boolean(definition.required || ["header", "main", "footer"].includes(id))
                };
            });
        }

        renderCmsBuilder() {
            const template = this.getCmsBuilderTemplate();
            if (this.cmsBuilderTitle) {
                this.cmsBuilderTitle.textContent = template?.label || "Block Layout";
            }
            if (this.cmsBuilderTemplateSelect) {
                this.cmsBuilderTemplateSelect.innerHTML = this.templates.map((item) => `
                    <option value="${this.escapeAttribute(item.templateId)}">${this.escapeHtml(item.label || item.templateId)}</option>
                `).join("");
                if (template) {
                    this.cmsBuilderTemplateSelect.value = template.templateId;
                }
            }
            this.renderCmsBuilderLibrary();
            this.renderCmsBuilderRegions();
            this.renderCmsBuilderProperties();
        }

        renderCmsBuilderLibrary() {
            if (!this.cmsBuilderLibrary) return;
            const query = String(this.cmsBuilderSearchQuery || "").trim().toLowerCase();
            const components = this.getCmsBuilderComponents().filter((component) => {
                const haystack = `${component.name} ${component.componentPath} ${(component.allowedRegions || []).join(" ")}`.toLowerCase();
                return !query || haystack.includes(query);
            });
            this.cmsBuilderLibrary.innerHTML = components.map((component) => `
                <button class="cms-builder-component" type="button" data-cms-builder-add="${this.escapeAttribute(component.name)}">
                    <span class="cms-builder-component-icon" aria-hidden="true">+</span>
                    <span>
                        <strong>${this.escapeHtml(component.name)}</strong>
                        <small>${this.escapeHtml(component.componentPath)}</small>
                        <em>${component.ready ? "CMS ready" : "Static block"}</em>
                    </span>
                </button>
            `).join("") || `<div class="empty-state"><span>No blocks match the search.</span></div>`;
            this.cmsBuilderLibrary.querySelectorAll("[data-cms-builder-add]").forEach((button) => {
                button.addEventListener("click", () => this.addCmsBuilderBlock(button.dataset.cmsBuilderAdd));
            });
        }

        renderCmsBuilderRegions() {
            if (!this.cmsBuilderRegions) return;
            const template = this.getCmsBuilderTemplate();
            if (!template) {
                this.cmsBuilderRegions.innerHTML = `<div class="empty-state"><span>Create a layout to start placing blocks.</span></div>`;
                return;
            }
            const blocksByRegion = template.defaultBlocks || {};
            this.cmsBuilderRegions.innerHTML = this.getCmsBuilderRegions(template).map((region) => {
                const blocks = Array.isArray(blocksByRegion[region.id]) ? blocksByRegion[region.id] : [];
                const blockHtml = blocks.map((block, index) => {
                    const blockId = block.id || `${region.id}-${index}`;
                    const selected = blockId === this.cmsBuilderSelectedBlockId;
                    return `
                        <div class="cms-builder-block ${selected ? "is-selected" : ""}" data-cms-builder-block="${this.escapeAttribute(blockId)}" data-region="${this.escapeAttribute(region.id)}">
                            <button class="cms-builder-grip" type="button" aria-label="Drag to reorder">⋮⋮</button>
                            <div>
                                <strong>${this.escapeHtml(block.name || block.componentPath || block.partial || "Block")}</strong>
                                <small>${this.escapeHtml(block.componentPath || block.partial || "")}</small>
                            </div>
                            <button class="icon-button" type="button" data-cms-builder-remove="${this.escapeAttribute(blockId)}" aria-label="Remove block">x</button>
                        </div>
                    `;
                }).join("");
                return `
                    <article class="cms-builder-region" data-cms-builder-region="${this.escapeAttribute(region.id)}">
                        <header>
                            <div>
                                <strong>${this.escapeHtml(region.label)}</strong>
                                <span>Region</span>
                            </div>
                        </header>
                        <div class="cms-builder-region-body ${blocks.length ? "" : "is-empty"}" data-region-blocks-container="${this.escapeAttribute(region.id)}">
                            ${blocks.length ? blockHtml : `<span>Drop or add blocks to ${this.escapeHtml(region.label)}.</span>`}
                            <button class="btn btn-secondary btn-small cms-builder-region-add" type="button" data-cms-builder-region-add="${this.escapeAttribute(region.id)}">Add Block</button>
                        </div>
                    </article>
                `;
            }).join("");
            
            // Initialize Sortable for each region.
            this.cmsBuilderRegions.querySelectorAll("[data-region-blocks-container]").forEach((container) => {
                if (container.sortable) {
                    container.sortable.destroy();
                }
                if (typeof window.Sortable !== "undefined") {
                    container.sortable = window.Sortable.create(container, {
                        animation: 150,
                        group: "cms-builder-region-blocks",
                        handle: ".cms-builder-grip",
                        draggable: ".cms-builder-block",
                        filter: ".cms-builder-region-add",
                        preventOnFilter: false,
                        ghostClass: "sortable-ghost",
                        chosenClass: "sortable-chosen",
                        dragClass: "sortable-drag",
                        onEnd: (evt) => this.handleBlockSort(evt, container.dataset.regionBlocksContainer)
                    });
                }
            });
            
            this.cmsBuilderRegions.querySelectorAll("[data-cms-builder-region-add]").forEach((button) => {
                button.addEventListener("click", () => {
                    this.cmsBuilderActiveRegion = button.dataset.cmsBuilderRegionAdd || "main";
                    this.openCmsBlockPicker(this.cmsBuilderActiveRegion);
                });
            });
            this.cmsBuilderRegions.querySelectorAll("[data-cms-builder-block]").forEach((block) => {
                block.addEventListener("click", (event) => {
                    if (event.target.closest("[data-cms-builder-remove], [data-cms-builder-move], .cms-builder-grip")) return;
                    this.cmsBuilderSelectedBlockId = block.dataset.cmsBuilderBlock;
                    this.renderCmsBuilder();
                });
            });
            this.cmsBuilderRegions.querySelectorAll("[data-cms-builder-remove]").forEach((button) => {
                button.addEventListener("click", () => this.removeCmsBuilderBlock(button.dataset.cmsBuilderRemove));
            });
            this.cmsBuilderRegions.querySelectorAll("[data-cms-builder-move]").forEach((button) => {
                button.addEventListener("click", () => this.moveCmsBuilderBlock(button.dataset.cmsBuilderMove, button.dataset.direction || "up"));
            });
        }

        createCmsBuilderDraft(options = {}) {
            const templateId = `site-layout-${Date.now()}`;
            const regions = {};
            this.getCmsBuilderRegions().forEach((region) => {
                regions[region.id] = { id: region.id, label: region.label, required: region.required };
            });
            const draft = {
                templateId,
                label: "New Site Block Layout",
                description: "",
                routePattern: "/new-layout",
                contentType: "",
                layoutId: this.getTemplateLayouts()[0]?.fileName || "",
                regions,
                defaultBlocks: {},
                lockedRegions: ["header", "footer"],
                validation: { status: "warning", warnings: [], errors: [] }
            };
            this.templates = [draft, ...this.templates.filter((template) => template.templateId !== templateId)];
            this.cmsBuilderSelectedTemplateId = templateId;
            this.cmsBuilderSelectedBlockId = null;
            if (!options.silent) {
                this.toast("New CMS block layout created.");
            }
            this.renderCmsBuilder();
        }

        addCmsBuilderBlock(componentName = "") {
            const template = this.getCmsBuilderTemplate();
            if (!template) return;
            const components = this.getCmsBuilderComponents();
            const component = components.find((item) => item.name === componentName || item.componentPath === componentName) || components[0];
            if (!component) return;
            const allowedRegions = Array.isArray(component.allowedRegions) ? component.allowedRegions : [];
            const region = allowedRegions.includes(this.cmsBuilderActiveRegion)
                ? this.cmsBuilderActiveRegion
                : (allowedRegions[0] || this.cmsBuilderActiveRegion || "main");
            const block = {
                id: `block-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                name: component.name,
                type: "partial",
                region,
                order: ((template.defaultBlocks?.[region] || []).length + 1),
                partial: component.componentPath,
                componentPath: component.componentPath,
                props: {},
                cmsBinding: null
            };
            template.defaultBlocks = template.defaultBlocks || {};
            template.defaultBlocks[region] = [...(template.defaultBlocks[region] || []), block];
            this.cmsBuilderSelectedBlockId = block.id;
            this.renderCmsBuilder();
        }

        findCmsBuilderBlock(blockId) {
            const template = this.getCmsBuilderTemplate();
            for (const [regionId, blocks] of Object.entries(template?.defaultBlocks || {})) {
                const index = Array.isArray(blocks) ? blocks.findIndex((block) => block.id === blockId) : -1;
                if (index >= 0) return { template, regionId, blocks, index, block: blocks[index] };
            }
            return null;
        }

        removeCmsBuilderBlock(blockId) {
            const found = this.findCmsBuilderBlock(blockId);
            if (!found) return;
            found.blocks.splice(found.index, 1);
            if (this.cmsBuilderSelectedBlockId === blockId) {
                this.cmsBuilderSelectedBlockId = null;
            }
            this.renderCmsBuilder();
        }

        moveCmsBuilderBlock(blockId, direction = "up") {
            const found = this.findCmsBuilderBlock(blockId);
            if (!found) return;
            const targetIndex = direction === "down" ? found.index + 1 : found.index - 1;
            if (targetIndex < 0 || targetIndex >= found.blocks.length) return;
            const [block] = found.blocks.splice(found.index, 1);
            found.blocks.splice(targetIndex, 0, block);
            found.blocks.forEach((item, index) => { item.order = index + 1; });
            this.renderCmsBuilder();
        }

        handleBlockSort(evt, regionId) {
            const template = this.getCmsBuilderTemplate();
            if (!template || !template.defaultBlocks) return;

            const targetRegionId = evt.to?.dataset.regionBlocksContainer || regionId || "main";
            const sourceRegionId = evt.from?.dataset.regionBlocksContainer || targetRegionId;
            const movedBlockId = evt.item?.dataset.cmsBuilderBlock || "";
            const moved = movedBlockId ? this.findCmsBuilderBlock(movedBlockId)?.block : null;
            const previousTargetBlocks = Array.isArray(template.defaultBlocks[targetRegionId])
                ? template.defaultBlocks[targetRegionId].filter((block) => block?.id !== movedBlockId)
                : [];
            const byId = new Map(previousTargetBlocks.map((block) => [block.id, block]));

            if (moved) {
                Object.keys(template.defaultBlocks).forEach((candidateRegionId) => {
                    const blocks = template.defaultBlocks[candidateRegionId];
                    if (Array.isArray(blocks)) {
                        template.defaultBlocks[candidateRegionId] = blocks.filter((block) => block?.id !== movedBlockId);
                    }
                });
                byId.set(moved.id, moved);
            }

            const orderedIds = Array.from(evt.to?.querySelectorAll(".cms-builder-block") || [])
                .map((el) => el.dataset.cmsBuilderBlock)
                .filter(Boolean);
            const usedIds = new Set();
            const orderedBlocks = orderedIds
                .map((blockId) => {
                    const block = byId.get(blockId);
                    if (block) usedIds.add(blockId);
                    return block || null;
                })
                .filter(Boolean);

            previousTargetBlocks.forEach((block) => {
                if (block?.id && !usedIds.has(block.id)) {
                    orderedBlocks.push(block);
                }
            });
            template.defaultBlocks[targetRegionId] = orderedBlocks;
            [sourceRegionId, targetRegionId].forEach((candidateRegionId) => {
                const blocks = template.defaultBlocks[candidateRegionId];
                if (Array.isArray(blocks)) {
                    blocks.forEach((block, index) => {
                        block.region = candidateRegionId;
                        block.order = index + 1;
                    });
                }
            });

            this.renderCmsBuilder();
        }

        renderCmsBuilderProperties() {
            const found = this.findCmsBuilderBlock(this.cmsBuilderSelectedBlockId);
            if (!this.cmsBuilderProperties || !this.cmsBuilderPropertiesTitle) return;
            if (!found) {
                this.cmsBuilderPropertiesTitle.textContent = "Select a block";
                this.cmsBuilderProperties.innerHTML = `<div class="empty-state"><span>Select a block to edit region, name, and path.</span></div>`;
                return;
            }
            const block = found.block;
            this.cmsBuilderPropertiesTitle.textContent = block.name || "Block";
            const regions = this.getCmsBuilderRegions(found.template);
            this.cmsBuilderProperties.innerHTML = `
                <label class="field"><span>Name</span><input id="cmsBuilderBlockName" type="text" value="${this.escapeAttribute(block.name || "")}"></label>
                <label class="field"><span>Component Path</span><input id="cmsBuilderBlockPath" type="text" value="${this.escapeAttribute(block.componentPath || block.partial || "")}"></label>
                <label class="field"><span>Region</span><select id="cmsBuilderBlockRegion">${regions.map((region) => `
                    <option value="${this.escapeAttribute(region.id)}" ${region.id === found.regionId ? "selected" : ""}>${this.escapeHtml(region.label)}</option>
                `).join("")}</select></label>
                <label class="field"><span>CMS Binding JSON</span><textarea id="cmsBuilderBlockBinding" rows="7">${this.escapeHtml(JSON.stringify(block.cmsBinding || null, null, 2))}</textarea></label>
                <div class="editor-actions">
                    <button id="cmsBuilderApplyBlock" class="btn btn-primary" type="button">Apply Block</button>
                    <button id="cmsBuilderMoveDown" class="btn btn-secondary" type="button">Move Down</button>
                </div>
            `;
            this.cmsBuilderProperties.querySelector("#cmsBuilderApplyBlock")?.addEventListener("click", () => this.applyCmsBuilderBlockProperties());
            this.cmsBuilderProperties.querySelector("#cmsBuilderMoveDown")?.addEventListener("click", () => this.moveCmsBuilderBlock(block.id, "down"));
        }

        applyCmsBuilderBlockProperties() {
            const found = this.findCmsBuilderBlock(this.cmsBuilderSelectedBlockId);
            if (!found) return;
            const name = String(this.cmsBuilderProperties.querySelector("#cmsBuilderBlockName")?.value || "").trim();
            const componentPath = String(this.cmsBuilderProperties.querySelector("#cmsBuilderBlockPath")?.value || "").trim();
            const nextRegion = String(this.cmsBuilderProperties.querySelector("#cmsBuilderBlockRegion")?.value || found.regionId).trim();
            const bindingRaw = String(this.cmsBuilderProperties.querySelector("#cmsBuilderBlockBinding")?.value || "null").trim();
            const cmsBinding = this.parseJson(bindingRaw || "null", null);
            found.block.name = name || found.block.name;
            found.block.componentPath = componentPath || found.block.componentPath;
            found.block.partial = componentPath || found.block.partial;
            found.block.region = nextRegion;
            found.block.cmsBinding = cmsBinding;
            if (nextRegion !== found.regionId) {
                found.blocks.splice(found.index, 1);
                found.template.defaultBlocks[nextRegion] = [...(found.template.defaultBlocks[nextRegion] || []), found.block];
            }
            Object.values(found.template.defaultBlocks || {}).forEach((blocks) => {
                if (Array.isArray(blocks)) blocks.forEach((item, index) => { item.order = index + 1; });
            });
            this.renderCmsBuilder();
        }

        async saveCmsBuilderLayout() {
            const template = this.getCmsBuilderTemplate();
            if (!template) {
                this.toast("Create a CMS block layout first.", "error");
                return;
            }
            this.setButtonLoading(this.cmsBuilderSaveButton, true, "Saving...");
            try {
                const result = await this.requestJson("/api/cms/templates", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(template)
                });
                const saved = result?.data || template;
                this.templates = [saved, ...this.templates.filter((item) => item.templateId !== saved.templateId)];
                this.selectedTemplateId = saved.templateId;
                this.cmsBuilderSelectedTemplateId = saved.templateId;
                this.toast(`CMS block layout saved: ${saved.label || saved.templateId}`);
                this.renderCmsBuilder();
                await this.loadThemes();
            } catch (error) {
                this.toast(`CMS block layout save failed: ${error.message}`, "error");
            } finally {
                this.setButtonLoading(this.cmsBuilderSaveButton, false);
            }
        }

        viewCmsBuilderSite() {
            const templateId = this.cmsBuilderSelectedTemplateId || this.selectedTemplateId;
            if (!templateId) {
                this.toast("Save a template first to preview.", "warning");
                return;
            }
            const previewUrl = `/api/cms/templates/${encodeURIComponent(templateId)}/preview`;
            window.open(previewUrl, "_blank", "noopener, noreferrer");
        }

        async loadTemplates() {
            if (this.templatesState) {
                this.templatesState.innerHTML = `<div class="loading-state">Loading templates...</div>`;
                this.templatesState.hidden = false;
            }
            try {
                const [templatesResult, themesResult] = await Promise.all([
                    this.requestJson("/api/cms/templates"),
                    this.themes.length ? Promise.resolve({ data: this.themes }) : this.requestJson("/api/cms/themes")
                ]);
                this.templates = Array.isArray(templatesResult?.data) ? templatesResult.data : [];
                this.themes = Array.isArray(themesResult?.data) ? themesResult.data : this.themes;
                if (!this.selectedTemplateId && this.templates[0]) {
                    this.selectedTemplateId = this.templates[0].templateId;
                }
                this.renderTemplates();
                this.renderTemplateEditor();
                if (this.templatesState) {
                    this.templatesState.hidden = true;
                }
            } catch (error) {
                if (this.templatesState) {
                    this.templatesState.hidden = false;
                    this.templatesState.innerHTML = `
                        <div class="error-state">
                            <strong>Could not load templates.</strong>
                            <span>${this.escapeHtml(error.message)}</span>
                            <button class="btn btn-secondary" type="button" data-templates-retry>Try Again</button>
                        </div>
                    `;
                    this.templatesState.querySelector("[data-templates-retry]")?.addEventListener("click", () => this.loadTemplates());
                }
            }
        }

        getTemplateLayouts() {
            const theme = this.getSelectedTheme?.() || this.themes[0] || {};
            return Array.isArray(theme.layouts) ? theme.layouts : [];
        }

        getTemplateRegionIds(template = null) {
            const theme = this.getSelectedTheme?.() || this.themes[0] || {};
            const themeRegionIds = Array.isArray(theme.regions) ? theme.regions : [];
            if (themeRegionIds.length) {
                return themeRegionIds;
            }
            const regionIds = new Set(themeRegionIds.length ? themeRegionIds : ["header", "hero", "side-navigation", "content-above", "main", "content-below", "footer"]);
            (theme.regions || []).forEach((region) => regionIds.add(region));
            Object.keys(template?.regions || {}).forEach((region) => regionIds.add(region));
            Object.keys(template?.defaultBlocks || {}).forEach((region) => regionIds.add(region));
            const order = themeRegionIds.length ? themeRegionIds : ["header", "hero", "side-navigation", "content-above", "main", "content-below", "footer"];
            return Array.from(regionIds).sort((left, right) => {
                const leftRank = order.includes(left) ? order.indexOf(left) : order.length;
                const rightRank = order.includes(right) ? order.indexOf(right) : order.length;
                return leftRank - rightRank || left.localeCompare(right);
            });
        }

        renderTemplates() {
            if (!this.templatesTableRows) {
                return;
            }
            const query = String(this.templatesSearchQuery || "").trim().toLowerCase();
            const filtered = this.templates.filter((template) => {
                const haystack = `${template.templateId || ""} ${template.label || ""} ${template.routePattern || ""} ${template.contentType || ""} ${template.layoutId || ""}`.toLowerCase();
                return !query || haystack.includes(query);
            });
            if (filtered.length === 0) {
                this.templatesTableRows.innerHTML = `
                    <tr>
                        <td colspan="7">
                            <div class="empty-state">
                                <strong>No templates found.</strong>
                                <span>Create a route template for listing, detail, or landing pages.</span>
                            </div>
                        </td>
                    </tr>
                `;
                return;
            }
            this.templatesTableRows.innerHTML = filtered.map((template) => {
                const validation = template.validation || {};
                const status = validation.status || (validation.errors?.length ? "error" : validation.warnings?.length ? "warning" : "valid");
                const statusClass = status === "valid" ? "is-success" : status === "warning" ? "is-warning" : "is-danger";
                return `
                    <tr class="${template.templateId === this.selectedTemplateId ? "is-selected" : ""}" data-template-row="${this.escapeAttribute(template.templateId)}">
                        <td data-label="Name"><strong>${this.escapeHtml(template.label || template.templateId)}</strong><br><small>${this.escapeHtml(template.templateId)}</small></td>
                        <td data-label="Route"><code>${this.escapeHtml(template.routePattern || "Unmapped")}</code></td>
                        <td data-label="Content Type">${this.escapeHtml(template.contentType || "Static")}</td>
                        <td data-label="Layout">${this.escapeHtml(template.layoutId || "Missing")}</td>
                        <td data-label="Regions">${Number(template.regionsCount || 0)}</td>
                        <td data-label="Validation"><span class="status-badge ${statusClass}">${this.escapeHtml(status)}</span></td>
                        <td data-label="Actions">
                            <button class="btn btn-secondary btn-small" type="button" data-template-edit="${this.escapeAttribute(template.templateId)}">Edit</button>
                        </td>
                    </tr>
                `;
            }).join("");
            this.templatesTableRows.querySelectorAll("[data-template-row]").forEach((row) => {
                row.addEventListener("click", (event) => {
                    if (event.target.closest("[data-template-edit]")) return;
                    this.selectedTemplateId = row.dataset.templateRow;
                    this.renderTemplates();
                    this.renderTemplateEditor();
                });
            });
            this.templatesTableRows.querySelectorAll("[data-template-edit]").forEach((button) => {
                button.addEventListener("click", () => {
                    this.selectedTemplateId = button.dataset.templateEdit;
                    this.renderTemplates();
                    this.renderTemplateEditor();
                });
            });
        }

        getSelectedTemplate() {
            return this.templates.find((template) => template.templateId === this.selectedTemplateId) || null;
        }

        createTemplateDraft() {
            const templateId = `template-${Date.now()}`;
            const regions = {};
            this.getTemplateRegionIds().forEach((regionId) => {
                regions[regionId] = { id: regionId, label: this.humanizeLabel(regionId), required: ["header", "main", "footer"].includes(regionId) };
            });
            const draft = {
                templateId,
                label: "New Template",
                description: "",
                routePattern: "/new-template",
                contentType: "",
                layoutId: this.getTemplateLayouts()[0]?.fileName || "",
                regions,
                defaultBlocks: {},
                lockedRegions: ["header", "footer"],
                validation: { status: "warning", warnings: [], errors: [] }
            };
            this.templates = [draft, ...this.templates.filter((template) => template.templateId !== templateId)];
            this.selectedTemplateId = templateId;
            this.renderTemplates();
            this.renderTemplateEditor();
            this.templateId?.focus();
        }

        renderTemplateEditor() {
            const template = this.getSelectedTemplate();
            const layouts = this.getTemplateLayouts();
            if (this.templateContentType) {
                const current = template?.contentType || "";
                this.templateContentType.innerHTML = `<option value="">Static / no content type</option>` + this.collections.map((collection) => `
                    <option value="${this.escapeAttribute(collection.slug)}">${this.escapeHtml(collection.name || collection.slug)}</option>
                `).join("");
                this.templateContentType.value = current;
            }
            if (this.templateLayoutId) {
                const current = template?.layoutId || "";
                this.templateLayoutId.innerHTML = `<option value="">Choose saved layout</option>` + layouts.map((layout) => `
                    <option value="${this.escapeAttribute(layout.fileName)}">${this.escapeHtml(layout.pageName || layout.fileName)} (${this.escapeHtml(layout.fileName)})</option>
                `).join("");
                this.templateLayoutId.value = current;
            }

            if (!template) {
                if (this.templateEditorTitle) this.templateEditorTitle.textContent = "Select a template";
                if (this.templateEditorBadge) {
                    this.templateEditorBadge.className = "status-badge is-muted";
                    this.templateEditorBadge.textContent = "Idle";
                }
                [this.templateId, this.templateLabel, this.templateRoutePattern, this.templateDescription].forEach((input) => {
                    if (input) input.value = "";
                });
                if (this.templateRegions) this.templateRegions.innerHTML = `<div class="empty-state"><span>Select or create a template.</span></div>`;
                if (this.templateValidation) this.templateValidation.innerHTML = "";
                if (this.templatePreviewResult) this.templatePreviewResult.textContent = "Select a template to preview route data.";
                return;
            }

            if (this.templateEditorTitle) this.templateEditorTitle.textContent = template.label || template.templateId;
            const validation = template.validation || {};
            const status = validation.status || (validation.errors?.length ? "error" : validation.warnings?.length ? "warning" : "valid");
            if (this.templateEditorBadge) {
                this.templateEditorBadge.className = `status-badge ${status === "valid" ? "is-success" : status === "warning" ? "is-warning" : "is-danger"}`;
                this.templateEditorBadge.textContent = status;
            }
            if (this.templateId) this.templateId.value = template.templateId || "";
            if (this.templateLabel) this.templateLabel.value = template.label || "";
            if (this.templateRoutePattern) this.templateRoutePattern.value = template.routePattern || "";
            if (this.templateDescription) this.templateDescription.value = template.description || "";
            this.renderTemplateRegions(template);
            this.renderTemplateValidation(template);
            this.loadTemplatePreviewEntries();
        }

        renderTemplateRegions(template = {}) {
            if (!this.templateRegions) {
                return;
            }
            const locked = new Set(template.lockedRegions || []);
            const defaultBlocks = template.defaultBlocks || {};
            this.templateRegions.innerHTML = this.getTemplateRegionIds(template).map((regionId) => {
                const blocks = Array.isArray(defaultBlocks[regionId]) ? defaultBlocks[regionId] : [];
                return `
                    <div class="template-region-row" data-template-region="${this.escapeAttribute(regionId)}">
                        <label class="checkbox-row">
                            <input type="checkbox" class="template-region-lock" ${locked.has(regionId) ? "checked" : ""}>
                            <span>${this.escapeHtml(this.humanizeLabel(regionId))}</span>
                        </label>
                        <textarea class="template-region-blocks" rows="4" aria-label="${this.escapeAttribute(regionId)} default blocks">${this.escapeHtml(JSON.stringify(blocks, null, 2))}</textarea>
                    </div>
                `;
            }).join("");
        }

        renderTemplateValidation(template = {}) {
            if (!this.templateValidation) {
                return;
            }
            const validation = template.validation || {};
            const issues = [...(validation.errors || []), ...(validation.warnings || [])];
            if (issues.length === 0) {
                this.templateValidation.innerHTML = `<div class="success-state"><strong>No validation issues.</strong><span>Template is ready for theme validation.</span></div>`;
                return;
            }
            this.templateValidation.innerHTML = issues.map((issue) => `
                <div class="${String(issue.code || "").includes("MISSING") ? "warning-state" : "detail-card"}">
                    <strong>${this.escapeHtml(issue.code || "TEMPLATE_VALIDATION")}</strong>
                    <span>${this.escapeHtml(issue.message || "")}</span>
                </div>
            `).join("");
        }

        collectTemplatePayload() {
            const existing = this.getSelectedTemplate() || {};
            const regions = {};
            const defaultBlocks = {};
            const lockedRegions = [];
            this.templateRegions?.querySelectorAll("[data-template-region]").forEach((row) => {
                const regionId = row.dataset.templateRegion;
                regions[regionId] = { id: regionId, label: this.humanizeLabel(regionId), required: ["header", "main", "footer"].includes(regionId) };
                if (row.querySelector(".template-region-lock")?.checked) {
                    lockedRegions.push(regionId);
                }
                const raw = row.querySelector(".template-region-blocks")?.value || "[]";
                const blocks = this.parseJson(raw, []);
                if (!Array.isArray(blocks)) {
                    throw new Error(`Default blocks for ${regionId} must be a JSON array.`);
                }
                if (blocks.length) {
                    defaultBlocks[regionId] = blocks;
                }
            });
            return {
                ...existing,
                templateId: String(this.templateId?.value || "").trim(),
                label: String(this.templateLabel?.value || "").trim(),
                description: String(this.templateDescription?.value || "").trim(),
                routePattern: String(this.templateRoutePattern?.value || "").trim(),
                contentType: String(this.templateContentType?.value || "").trim(),
                layoutId: String(this.templateLayoutId?.value || "").trim(),
                regions,
                defaultBlocks,
                lockedRegions
            };
        }

        async saveTemplate() {
            let payload;
            try {
                payload = this.collectTemplatePayload();
            } catch (error) {
                this.toast(error.message, "error");
                return;
            }
            if (!payload.templateId || !payload.label) {
                this.toast("Template ID and label are required.", "error");
                return;
            }
            this.setButtonLoading(this.templateSaveButton, true, "Saving...");
            try {
                const result = await this.requestJson("/api/cms/templates", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
                const saved = result?.data || payload;
                this.selectedTemplateId = saved.templateId;
                this.templates = [saved, ...this.templates.filter((template) => template.templateId !== saved.templateId)];
                this.toast(`Template saved: ${saved.label || saved.templateId}`);
                this.renderTemplates();
                this.renderTemplateEditor();
                await this.loadThemes();
            } catch (error) {
                this.toast(`Template save failed: ${error.message}`, "error");
            } finally {
                this.setButtonLoading(this.templateSaveButton, false);
            }
        }

        async deleteTemplate() {
            const template = this.getSelectedTemplate();
            if (!template) {
                this.toast("Select a template first.", "error");
                return;
            }
            const confirmed = await this.confirmAction({
                title: "Delete Template",
                description: `Delete "${template.label || template.templateId}"?`,
                confirmLabel: "Delete Template"
            });
            if (!confirmed) {
                return;
            }
            this.setButtonLoading(this.templateDeleteButton, true, "Deleting...");
            try {
                await this.requestJson(`/api/cms/templates/${encodeURIComponent(template.templateId)}`, { method: "DELETE" });
                this.templates = this.templates.filter((item) => item.templateId !== template.templateId);
                this.selectedTemplateId = this.templates[0]?.templateId || null;
                this.toast("Template deleted.");
                this.renderTemplates();
                this.renderTemplateEditor();
                await this.loadThemes();
            } catch (error) {
                this.toast(`Template delete failed: ${error.message}`, "error");
            } finally {
                this.setButtonLoading(this.templateDeleteButton, false);
            }
        }

        async loadTemplatePreviewEntries() {
            const collection = String(this.templateContentType?.value || "").trim();
            this.templatePreviewEntries = [];
            if (!this.templatePreviewEntry) {
                return;
            }
            if (!collection) {
                this.templatePreviewEntry.innerHTML = `<option value="">No content type selected</option>`;
                return;
            }
            this.templatePreviewEntry.innerHTML = `<option value="">Loading entries...</option>`;
            try {
                const result = await this.requestJson(`/api/cms/entries?collection=${encodeURIComponent(collection)}`);
                this.templatePreviewEntries = Array.isArray(result?.data) ? result.data : [];
                this.templatePreviewEntry.innerHTML = this.templatePreviewEntries.length
                    ? this.templatePreviewEntries.map((entry) => `<option value="${this.escapeAttribute(entry.entryKey)}">${this.escapeHtml(this.getEntryLabel(entry) || entry.entryKey)}</option>`).join("")
                    : `<option value="">No entries found</option>`;
            } catch (error) {
                this.templatePreviewEntry.innerHTML = `<option value="">Entries failed to load</option>`;
            }
        }

        previewTemplateMapping() {
            let payload;
            try {
                payload = this.collectTemplatePayload();
            } catch (error) {
                this.toast(error.message, "error");
                return;
            }
            const selectedEntryKey = this.templatePreviewEntry?.value || "";
            const entry = this.templatePreviewEntries.find((item) => item.entryKey === selectedEntryKey) || null;
            const route = entry
                ? payload.routePattern.replace(/\{slug\}|:slug|\{entryKey\}|:entryKey/g, entry.data?.slug || entry.entryKey)
                : payload.routePattern;
            if (this.templatePreviewResult) {
                this.templatePreviewResult.textContent = JSON.stringify({
                    templateId: payload.templateId,
                    route,
                    contentType: payload.contentType || null,
                    previewEntry: entry ? { entryKey: entry.entryKey, status: entry.status } : null,
                    layoutId: payload.layoutId,
                    lockedRegions: payload.lockedRegions,
                    regionCount: Object.keys(payload.regions || {}).length
                }, null, 2);
            }
        }

        async loadThemes() {
            if (this.themesState) {
                this.themesState.innerHTML = `<div class="loading-state">Loading themes...</div>`;
                this.themesState.hidden = false;
            }
            try {
                const result = await this.requestJson("/api/cms/themes");
                this.themes = Array.isArray(result?.data) ? result.data : [];
                if (!this.selectedThemeId && this.themes[0]) {
                    this.selectedThemeId = this.themes[0].id;
                }
                this.renderThemes();
                this.renderPreviewThemes();
                if (this.themesState) {
                    this.themesState.hidden = true;
                }
            } catch (error) {
                if (this.themesState) {
                    this.themesState.innerHTML = `
                        <div class="error-state">
                            <strong>Could not load themes.</strong>
                            <span>${this.escapeHtml(error.message)}</span>
                            <button class="btn btn-secondary" type="button" data-themes-retry>Try Again</button>
                        </div>
                    `;
                    this.themesState.hidden = false;
                    this.themesState.querySelector("[data-themes-retry]")?.addEventListener("click", () => this.loadThemes());
                }
            }
        }

        getSelectedTheme() {
            return this.themes.find((theme) => theme.id === this.selectedThemeId) || this.themes[0] || null;
        }

        renderThemes() {
            if (!this.themesTableRows) {
                return;
            }
            if (this.themes.length === 0) {
                this.themesTableRows.innerHTML = `
                    <tr>
                        <td colspan="7">
                            <div class="empty-state">
                                <strong>No themes found.</strong>
                                <span>Refresh after creating layouts and templates in the builder.</span>
                            </div>
                        </td>
                    </tr>
                `;
                this.renderThemeDetail();
                return;
            }

            this.themesTableRows.innerHTML = this.themes.map((theme) => {
                const validation = theme.validation || {};
                const issueCount = Number(validation.errors?.length || 0) + Number(validation.warnings?.length || 0);
                return `
                    <tr class="${theme.id === this.selectedThemeId ? "is-selected" : ""}" data-theme-row="${this.escapeAttribute(theme.id)}">
                        <td data-label="Theme Name"><strong>${this.escapeHtml(theme.name)}</strong></td>
                        <td data-label="Version">v${this.escapeHtml(theme.version || "1.0.0")}</td>
                        <td data-label="Active"><span class="${theme.active ? "status-badge is-success" : "status-badge is-muted"}">${theme.active ? "Active" : "Inactive"}</span></td>
                        <td data-label="Required Collections">${this.escapeHtml((theme.requiredCollections || []).join(", ") || "None detected")}</td>
                        <td data-label="Validation"><span class="${validation.valid ? "status-badge is-success" : "status-badge is-warning"}">${validation.valid ? "Valid" : `${issueCount} issue${issueCount === 1 ? "" : "s"}`}</span></td>
                        <td data-label="Last Exported">${theme.lastExported ? this.escapeHtml(this.formatRelativeTime(theme.lastExported)) : "Never"}</td>
                        <td data-label="Actions">
                            <button class="btn btn-secondary btn-small" type="button" data-theme-export="${this.escapeAttribute(theme.id)}">Export</button>
                        </td>
                    </tr>
                `;
            }).join("");

            this.themesTableRows.querySelectorAll("[data-theme-row]").forEach((row) => {
                row.addEventListener("click", (event) => {
                    if (event.target.closest("[data-theme-export]")) return;
                    this.selectedThemeId = row.dataset.themeRow;
                    this.renderThemes();
                });
            });
            this.themesTableRows.querySelectorAll("[data-theme-export]").forEach((button) => {
                button.addEventListener("click", () => {
                    this.selectedThemeId = button.dataset.themeExport;
                    this.renderThemes();
                    this.openThemeExportDialog();
                });
            });
            this.renderThemeDetail();
        }

        renderThemeDetail() {
            const theme = this.getSelectedTheme();
            this.themeTabs.forEach((button) => {
                const isSelected = button.dataset.themeTab === this.themeDetailTab;
                button.setAttribute("aria-pressed", String(isSelected));
                button.setAttribute("role", "tab");
                button.setAttribute("aria-selected", String(isSelected));
                button.setAttribute("tabindex", isSelected ? "0" : "-1");
            });
            if (!theme) {
                if (this.themeDetailTitle) this.themeDetailTitle.textContent = "Select a theme";
                if (this.themeDetailContent) this.themeDetailContent.innerHTML = "";
                return;
            }

            const validation = theme.validation || { errors: [], warnings: [], counts: {} };
            if (this.themeDetailTitle) this.themeDetailTitle.textContent = theme.name || "Theme";
            if (this.themeDetailBadge) {
                this.themeDetailBadge.className = validation.valid ? "status-badge is-success" : "status-badge is-warning";
                this.themeDetailBadge.textContent = validation.valid ? "Ready" : "Needs Review";
            }

            const counts = validation.counts || {};
            const renderList = (items, emptyText) => {
                const list = Array.isArray(items) ? items : [];
                if (list.length === 0) return `<div class="empty-state"><span>${this.escapeHtml(emptyText)}</span></div>`;
                return `<div class="detail-list">${list.map((item) => `<span>${this.escapeHtml(item)}</span>`).join("")}</div>`;
            };
            const issues = [...(validation.errors || []), ...(validation.warnings || [])];
            const tab = this.themeDetailTab;

            let html = "";
            if (tab === "overview") {
                html = `
                    <div class="theme-overview-grid">
                        <div class="summary-tile"><span>Layouts</span><strong>${Number(counts.layouts || 0)}</strong></div>
                        <div class="summary-tile"><span>Templates</span><strong>${Number(counts.templates || 0)}</strong></div>
                        <div class="summary-tile"><span>Regions</span><strong>${Number(counts.regions || 0)}</strong></div>
                        <div class="summary-tile"><span>Bindings</span><strong>${Number(counts.bindings || 0)}</strong></div>
                    </div>
                    <div class="${validation.valid ? "success-state" : "warning-state"}">
                        <strong>${validation.valid ? "Theme is ready to export." : "Theme has validation items."}</strong>
                        <span>${issues.length ? `${issues.length} issue${issues.length === 1 ? "" : "s"} found across collections, layouts, and bindings.` : "No blocking issues were detected."}</span>
                    </div>
                    <dl class="metadata-list">
                        <div><dt>Output Folder</dt><dd>${this.escapeHtml(theme.outputPath || "")}</dd></div>
                        <div><dt>Description</dt><dd>${this.escapeHtml(theme.description || "")}</dd></div>
                    </dl>
                `;
            } else if (tab === "collections") {
                html = renderList(theme.requiredCollections, "No required collections detected from templates or CMS bindings.");
            } else if (tab === "regions") {
                html = renderList(theme.regions, "No layout regions detected.");
            } else if (tab === "templates") {
                const templates = Array.isArray(theme.templates) ? theme.templates : [];
                html = templates.length ? templates.map((template) => `
                    <div class="detail-card">
                        <strong>${this.escapeHtml(template.label || template.templateId || "Template")}</strong>
                        <span>${this.escapeHtml(template.routePattern || "No route")} &middot; ${this.escapeHtml(template.contentType || "No content type")}</span>
                    </div>
                `).join("") : `<div class="empty-state"><span>No page templates found.</span></div>`;
            } else if (tab === "assets") {
                html = renderList(["pages/", "layouts/", "partials/", "components/", "assets/"], "No asset folders configured.");
            } else if (tab === "bindings") {
                const bindings = Array.isArray(theme.bindings) ? theme.bindings : [];
                html = bindings.length ? bindings.map((record) => `
                    <div class="detail-card">
                        <strong>${this.escapeHtml(record.componentPath || record.blockId || "Binding")}</strong>
                        <span>${this.escapeHtml(record.binding?.collection || record.binding?.contentType || "No collection")} &middot; ${this.escapeHtml(record.region || "No region")}</span>
                    </div>
                `).join("") : `<div class="empty-state"><span>No CMS bindings found.</span></div>`;
            } else if (tab === "warnings") {
                html = issues.length ? issues.map((issue) => `
                    <div class="${issue.code?.includes("MISSING") ? "warning-state" : "detail-card"}">
                        <strong>${this.escapeHtml(issue.code || "THEME_VALIDATION")}</strong>
                        <span>${this.escapeHtml(issue.message || "")}</span>
                    </div>
                `).join("") : `<div class="success-state"><strong>No warnings.</strong><span>Theme validation is clean.</span></div>`;
            } else if (tab === "history") {
                html = `
                    <dl class="metadata-list">
                        <div><dt>Last Exported</dt><dd>${theme.lastExported ? this.escapeHtml(new Date(theme.lastExported).toLocaleString()) : "Never"}</dd></div>
                        <div><dt>Current Output</dt><dd>${this.escapeHtml(theme.outputPath || "")}</dd></div>
                    </dl>
                `;
            }

            if (this.themeDetailContent) {
                this.themeDetailContent.innerHTML = html;
            }
        }

        openThemeExportDialog() {
            this.lastFocusedElement = document.activeElement;
            const theme = this.getSelectedTheme();
            if (this.themeExportName) {
                this.themeExportName.value = theme?.name || "Theme 3";
            }
            if (this.themeExportOutput) {
                this.themeExportOutput.value = theme?.outputPath || "./themes/theme-3";
            }
            if (this.themeExportResult) {
                this.themeExportResult.textContent = "Configure export options, then run export.";
            }
            if (this.themeExportModal) {
                this.themeExportModal.hidden = false;
                window.setTimeout(() => this.themeExportName?.focus(), 0);
            }
        }

        closeThemeExportDialog() {
            if (this.themeExportModal) {
                this.themeExportModal.hidden = true;
            }
            this.restoreFocus();
        }

        async runThemeExport() {
            if (!this.themeExportRunButton) {
                return;
            }
            this.setButtonLoading(this.themeExportRunButton, true, "Exporting...");
            if (this.themeExportResult) {
                this.themeExportResult.textContent = "Generating portable theme package...";
            }
            try {
                const result = await this.requestJson("/api/cms/themes/export", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        themeName: this.themeExportName?.value || "Theme 3",
                        outputPath: this.themeExportOutput?.value || undefined,
                        includeCompiledAssets: Boolean(this.themeExportAssets?.checked),
                        includeFallbackData: Boolean(this.themeExportFallback?.checked),
                        includeDraftBindings: Boolean(this.themeExportDraftBindings?.checked),
                        overwrite: Boolean(this.themeExportOverwrite?.checked)
                    })
                });
                const data = result?.data || {};
                if (this.themeExportResult) {
                    this.themeExportResult.textContent = JSON.stringify({
                        generatedAt: data.generatedAt,
                        outputPath: data.outputPath,
                        manifestPath: data.manifestPath,
                        totals: data.totals,
                        validation: data.validation
                    }, null, 2);
                }
                this.toast("Theme export completed.");
                await this.loadThemes();
            } catch (error) {
                if (this.themeExportResult) {
                    this.themeExportResult.textContent = `Theme export failed: ${error.message}`;
                }
                this.toast(`Theme export failed: ${error.message}`, "error");
            } finally {
                this.setButtonLoading(this.themeExportRunButton, false);
            }
        }

        renderPreviewThemes() {
            if (!this.previewActiveTheme) {
                return;
            }
            const currentValue = this.previewActiveTheme.value;
            const themes = this.themes.length ? this.themes : [{ id: "theme-3", name: "Theme 3" }];
            this.previewActiveTheme.innerHTML = themes.map((theme) => `
                <option value="${this.escapeAttribute(theme.id || theme.slug || theme.name)}">${this.escapeHtml(theme.name || theme.slug || "Theme")}</option>
            `).join("");
            if (currentValue && themes.some((theme) => [theme.id, theme.slug, theme.name].includes(currentValue))) {
                this.previewActiveTheme.value = currentValue;
            } else if (themes[0]) {
                this.previewActiveTheme.value = themes[0].id || themes[0].slug || themes[0].name;
            }
        }

        async loadPublishStatus() {
            this.setPublishMessage("Checking publish readiness...", "loading");
            try {
                if (this.themes.length === 0) {
                    await this.loadThemes();
                } else {
                    this.renderPreviewThemes();
                }
                const result = await this.requestJson("/api/cms/publish/status");
                this.publishStatusData = result?.data || {};
                this.publishChecklist = this.publishStatusData.checklist?.items || [];
                this.renderPublishChecklist(this.publishStatusData.checklist);
                this.updatePublishSteps([]);
                this.renderLastBuild(this.publishStatusData.lastBuildAt);
                this.setPublishMessage("Publish readiness checked.", "success");
                this.refreshPreview();
            } catch (error) {
                this.setPublishMessage(`Publish status failed: ${error.message}`, "error");
                this.renderPublishChecklist({ valid: false, items: [] });
            }
        }

        renderLastBuild(value) {
            if (!this.publishLastBuild) {
                return;
            }
            this.publishLastBuild.textContent = value
                ? `Last build: ${this.formatRelativeTime(value)}`
                : "No build generated yet.";
        }

        setPublishMessage(message, variant = "success") {
            if (!this.publishStatusMessage) {
                return;
            }
            this.publishStatusMessage.hidden = false;
            this.publishStatusMessage.className = `inline-state is-${variant}`;
            this.publishStatusMessage.textContent = message;
        }

        renderPublishChecklist(checklist = {}) {
            const items = Array.isArray(checklist.items) ? checklist.items : this.publishChecklist;
            const failedCount = items.filter((item) => item.status === "failed").length;
            if (this.publishChecklistBadge) {
                this.publishChecklistBadge.className = failedCount ? "status-badge is-warning" : "status-badge is-success";
                this.publishChecklistBadge.textContent = failedCount ? `${failedCount} issue${failedCount === 1 ? "" : "s"}` : "All Clear";
            }
            if (!this.publishChecklistEl) {
                return;
            }
            if (items.length === 0) {
                this.publishChecklistEl.innerHTML = `
                    <div class="empty-state">
                        <strong>No checklist data.</strong>
                        <span>Refresh publish status to validate the build.</span>
                    </div>
                `;
                return;
            }
            this.publishChecklistEl.innerHTML = items.map((item) => `
                <div class="checklist-item is-${this.escapeAttribute(item.status || "failed")}">
                    <span class="checklist-icon"></span>
                    <div>
                        <strong>${this.escapeHtml(item.label || item.id)}</strong>
                        ${item.details ? `<small>${this.escapeHtml(item.details)}</small>` : ""}
                    </div>
                </div>
            `).join("");
        }

        updatePublishSteps(completedSteps = [], activeStep = "") {
            if (!this.publishSteps) {
                return;
            }
            const completed = new Set(completedSteps);
            this.publishSteps.querySelectorAll("[data-publish-step]").forEach((item) => {
                const id = item.dataset.publishStep;
                item.classList.toggle("is-complete", completed.has(id));
                item.classList.toggle("is-active", activeStep === id);
                item.classList.toggle("is-pending", !completed.has(id) && activeStep !== id);
            });
        }

        getPreviewUrl() {
            const base = String(this.sitePreviewUrlInput?.value || `${window.location.origin}/site/`).trim() || "/site/";
            let url;
            try {
                url = new URL(base, window.location.origin);
            } catch (_error) {
                url = new URL("/site/", window.location.origin);
            }
            url.searchParams.set("theme", this.previewActiveTheme?.value || "theme-3");
            url.searchParams.set("source", this.previewContentSource?.value || "live");
            url.searchParams.set("status", this.previewContentStatus?.value || "draft");
            return url;
        }

        refreshPreview() {
            const url = this.getPreviewUrl();
            if (this.previewAddress) {
                this.previewAddress.textContent = `${url.pathname}${url.search}`;
            }
            if (this.previewLoading) {
                this.previewLoading.hidden = false;
            }
            if (this.previewFrame) {
                this.previewFrame.src = url.href;
                window.setTimeout(() => {
                    if (this.previewLoading) {
                        this.previewLoading.hidden = true;
                    }
                }, 500);
            }
        }

        setPreviewDevice(device) {
            this.publishDevice = ["desktop", "tablet", "mobile"].includes(device) ? device : "desktop";
            this.previewDeviceButtons.forEach((button) => {
                const selected = button.dataset.previewDevice === this.publishDevice;
                button.classList.toggle("is-active", selected);
                button.setAttribute("aria-pressed", String(selected));
            });
            if (this.previewFrameShell) {
                this.previewFrameShell.className = `preview-frame-shell is-${this.publishDevice}`;
            }
        }

        openPreviewWindow() {
            window.open(this.getPreviewUrl().href, "_blank", "noopener");
        }

        async runPublish() {
            if (!this.publishRunButton) {
                return;
            }
            this.setButtonLoading(this.publishRunButton, true, "Publishing...");
            this.publishResult.textContent = "Running publish workflow...";
            this.updatePublishSteps([], "content");
            this.setPublishMessage("Exporting CMS content...", "loading");
            try {
                const result = await this.requestJson("/api/cms/publish/run", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        includeDrafts: Boolean(this.publishIncludeDrafts?.checked),
                        includeArchived: Boolean(this.publishIncludeArchived?.checked),
                        includeCompiledAssets: true,
                        includeFallbackData: true,
                        includeDraftBindings: Boolean(this.publishIncludeDrafts?.checked),
                        themeName: this.previewActiveTheme?.selectedOptions?.[0]?.textContent || "Theme 3"
                    })
                });
                const data = result?.data || {};
                this.updatePublishSteps(["content", "theme", "static"]);
                this.publishResult.textContent = JSON.stringify({
                    generatedAt: data.generatedAt,
                    status: data.status,
                    buildPath: data.buildPath,
                    siteUrl: data.siteUrl,
                    steps: (data.steps || []).map((step) => ({ id: step.id, status: step.status, label: step.label })),
                    checklist: data.checklist
                }, null, 2);
                this.publishChecklist = data.checklist?.items || [];
                this.renderPublishChecklist(data.checklist);
                this.renderLastBuild(data.generatedAt);
                this.setPublishMessage(data.status === "success" ? "Publish completed." : "Publish completed with checklist warnings.", data.status === "success" ? "success" : "warning");
                this.toast("Publish workflow completed.");
                this.refreshPreview();
            } catch (error) {
                this.updatePublishSteps([], "");
                this.publishResult.textContent = `Publish failed: ${error.message}`;
                this.setPublishMessage(`Publish failed: ${error.message}`, "error");
                this.toast(`Publish failed: ${error.message}`, "error");
            } finally {
                this.setButtonLoading(this.publishRunButton, false);
            }
        }

        async openBuildFolder() {
            this.setButtonLoading(this.publishOpenBuildButton, true, "Opening...");
            try {
                const result = await this.requestJson("/api/cms/publish/open-build", { method: "POST" });
                const data = result?.data || {};
                this.setPublishMessage(`Build folder ready: ${data.buildPath || "build"}`, "success");
                this.publishResult.textContent = JSON.stringify({
                    buildFolderOpened: Boolean(data.opened),
                    buildPath: data.buildPath,
                    siteUrl: data.siteUrl,
                    message: data.message
                }, null, 2);
                this.toast("Build folder path ready.");
            } catch (error) {
                this.setPublishMessage(`Build folder failed: ${error.message}`, "error");
                this.toast(`Build folder failed: ${error.message}`, "error");
            } finally {
                this.setButtonLoading(this.publishOpenBuildButton, false);
            }
        }

        getApiTokens() {
            try {
                return JSON.parse(window.localStorage.getItem("themeCms.apiTokens") || "[]");
            } catch (_error) {
                return [];
            }
        }

        saveApiTokens(tokens) {
            window.localStorage.setItem("themeCms.apiTokens", JSON.stringify(tokens));
        }

        async loadApiConsoleData() {
            if (this.apiState) {
                this.apiState.hidden = false;
                this.apiState.innerHTML = `<div class="loading-state">Loading API console data...</div>`;
            }
            this.apiTokens = this.getApiTokens();
            try {
                const [collectionsResult, formsResult] = await Promise.all([
                    this.requestJson("/api/content/collections"),
                    this.requestJson("/api/cms/forms")
                ]);
                this.apiCollections = collectionsResult?.data?.collections || [];
                this.apiForms = Array.isArray(formsResult?.data) ? formsResult.data : [];
                this.apiError = null;
                if (this.apiState) {
                    this.apiState.hidden = true;
                }
            } catch (error) {
                this.apiError = error;
                if (this.apiState) {
                    this.apiState.hidden = false;
                    this.apiState.innerHTML = `
                        <div class="error-state">
                            <strong>Could not load API data.</strong>
                            <span>${this.escapeHtml(error.message)}</span>
                            <button class="btn btn-secondary" type="button" data-api-retry>Try Again</button>
                        </div>
                    `;
                    this.apiState.querySelector("[data-api-retry]")?.addEventListener("click", () => this.loadApiConsoleData());
                }
            }
            this.renderApiConsole();
        }

        renderApiConsole() {
            if (!this.apiPanelContent) {
                return;
            }
            const labels = {
                tokens: ["API Tokens", "Manage bearer tokens for external API consumers."],
                content: ["Content Endpoints", "Read published CMS collections and entries over REST."],
                forms: ["Form Endpoints", "Read public form definitions and submit responses."],
                settings: ["CORS Settings", "Review browser access settings for local API use."],
                webhooks: ["Webhooks", "Placeholder integration notes for future outbound events."]
            };
            const [title, subtitle] = labels[this.apiTab] || labels.tokens;
            if (this.apiPanelTitle) this.apiPanelTitle.textContent = title;
            if (this.apiPanelSubtitle) this.apiPanelSubtitle.textContent = subtitle;
            this.apiTabs.forEach((button) => {
                const selected = button.dataset.apiTab === this.apiTab;
                button.classList.toggle("is-active", selected);
                button.setAttribute("aria-selected", String(selected));
                button.setAttribute("tabindex", selected ? "0" : "-1");
            });
            if (this.apiGenerateTokenButton) {
                this.apiGenerateTokenButton.hidden = this.apiTab !== "tokens";
            }

            if (this.apiTab === "tokens") {
                this.renderApiTokens();
            } else if (this.apiTab === "content") {
                this.renderContentEndpoints();
            } else if (this.apiTab === "forms") {
                this.renderFormEndpoints();
            } else if (this.apiTab === "settings") {
                this.renderApiSettings();
            } else {
                this.renderApiWebhooks();
            }
        }

        renderApiTokens() {
            if (this.apiTokens.length === 0) {
                this.apiPanelContent.innerHTML = `
                    <div class="empty-state api-empty">
                        <strong>No API tokens yet.</strong>
                        <span>Generate a token to model bearer authentication states for external consumers.</span>
                    </div>
                `;
                return;
            }
            this.apiPanelContent.innerHTML = `
                <div class="api-token-list">
                    ${this.apiTokens.map((token) => `
                        <div class="api-token-card is-${this.escapeAttribute(token.status)}">
                            <div>
                                <strong>${this.escapeHtml(token.name)}</strong>
                                <code>${token.status === "active" ? this.escapeHtml(token.token) : "revoked-token-hidden"}</code>
                                <small>Created ${this.escapeHtml(token.createdAt)}</small>
                            </div>
                            <span class="${token.status === "active" ? "status-badge is-success" : "status-badge is-muted"}">${this.escapeHtml(token.status)}</span>
                            <div class="actions-inline">
                                <button class="btn btn-secondary btn-small" type="button" data-copy-text="${this.escapeAttribute(token.token)}" ${token.status !== "active" ? "disabled" : ""}>Copy</button>
                                <button class="btn btn-danger btn-small" type="button" data-api-revoke="${this.escapeAttribute(token.id)}" ${token.status !== "active" ? "disabled" : ""}>Revoke</button>
                            </div>
                        </div>
                    `).join("")}
                </div>
            `;
            this.bindApiPanelActions();
        }

        renderContentEndpoints() {
            const collection = this.apiCollections[0] || { slug: "projects", name: "Projects" };
            const endpoints = [
                { label: "List collections", method: "GET", path: "/api/content/collections" },
                { label: `List ${collection.name || collection.slug}`, method: "GET", path: `/api/content/${collection.slug}` },
                { label: `Get ${collection.name || collection.slug} entry`, method: "GET", path: `/api/content/${collection.slug}/:entryKey` }
            ];
            const sample = {
                success: true,
                data: {
                    collection: collection.slug,
                    count: 1,
                    entries: [
                        {
                            entryKey: "example-entry",
                            status: "published",
                            data: { title: "Example content" }
                        }
                    ]
                }
            };
            this.apiPanelContent.innerHTML = this.renderEndpointDocs(endpoints, sample, this.apiCollections.length
                ? "Available collections"
                : "No collections found yet") + this.renderApiCollectionList();
            this.bindApiPanelActions();
        }

        renderFormEndpoints() {
            const form = this.apiForms[0] || { slug: "contact", name: "Contact" };
            const endpoints = [
                { label: `Get ${form.name || form.slug} form`, method: "GET", path: `/api/forms/${form.slug}` },
                { label: `Submit ${form.name || form.slug} form`, method: "POST", path: `/api/forms/${form.slug}/submissions` },
                { label: "Review submissions", method: "GET", path: `/api/cms/forms/${form.slug}/submissions` }
            ];
            const sample = {
                success: true,
                data: {
                    slug: form.slug,
                    fields: [
                        { name: "email", type: "email", required: true },
                        { name: "message", type: "textarea", required: true }
                    ]
                }
            };
            this.apiPanelContent.innerHTML = this.renderEndpointDocs(endpoints, sample, this.apiForms.length
                ? "Available forms"
                : "No forms found yet") + this.renderApiFormList();
            this.bindApiPanelActions();
        }

        renderEndpointDocs(endpoints, sample, listLabel) {
            const sampleText = JSON.stringify(sample, null, 2);
            return `
                <div class="api-doc-grid">
                    <div class="api-endpoint-list">
                        ${endpoints.map((endpoint) => `
                            <div class="api-endpoint-card">
                                <div>
                                    <span class="method-badge is-${this.escapeAttribute(endpoint.method.toLowerCase())}">${this.escapeHtml(endpoint.method)}</span>
                                    <strong>${this.escapeHtml(endpoint.label)}</strong>
                                </div>
                                <code>${this.escapeHtml(endpoint.path)}</code>
                                <button class="icon-button" type="button" aria-label="Copy ${this.escapeAttribute(endpoint.label)} endpoint" data-copy-text="${this.escapeAttribute(endpoint.path)}">Copy</button>
                            </div>
                        `).join("")}
                    </div>
                    <div class="api-sample-panel">
                        <div class="api-sample-header">
                            <span>Sample Response</span>
                            <button class="icon-button" type="button" aria-label="Copy sample response" data-copy-text="${this.escapeAttribute(sampleText)}">Copy</button>
                        </div>
                        <pre>${this.escapeHtml(sampleText)}</pre>
                    </div>
                </div>
                <p class="subtle api-list-label">${this.escapeHtml(listLabel)}</p>
            `;
        }

        renderApiCollectionList() {
            if (this.apiCollections.length === 0) {
                return `<div class="empty-state api-empty"><span>Create collections to expose content endpoints.</span></div>`;
            }
            return `
                <div class="detail-list api-chip-list">
                    ${this.apiCollections.map((collection) => `<span>${this.escapeHtml(collection.slug)}</span>`).join("")}
                </div>
            `;
        }

        renderApiFormList() {
            if (this.apiForms.length === 0) {
                return `<div class="empty-state api-empty"><span>Create forms to expose public form endpoints.</span></div>`;
            }
            return `
                <div class="detail-list api-chip-list">
                    ${this.apiForms.map((form) => `<span>${this.escapeHtml(form.slug)}</span>`).join("")}
                </div>
            `;
        }

        renderApiSettings() {
            this.apiPanelContent.innerHTML = `
                <div class="api-settings-grid">
                    <div class="detail-card">
                        <strong>CORS Mode</strong>
                        <span>The local CMS server currently allows browser requests through Express CORS middleware.</span>
                    </div>
                    <label class="field">
                        <span>Allowed Origin</span>
                        <input type="text" value="${this.escapeAttribute(window.location.origin)}" readonly>
                    </label>
                    <label class="field">
                        <span>Local Builder Origin</span>
                        <input type="text" value="${this.escapeAttribute(this.builderUrlInput?.value || this.getDefaultBuilderUrl())}" readonly>
                    </label>
                    <button class="btn btn-secondary" type="button" data-copy-text="${this.escapeAttribute(window.location.origin)}">Copy Current Origin</button>
                </div>
            `;
            this.bindApiPanelActions();
        }

        renderApiWebhooks() {
            this.apiPanelContent.innerHTML = `
                <div class="empty-state api-empty">
                    <strong>No webhooks configured.</strong>
                    <span>Webhook delivery is reserved for a later integration pass. Content changes and form submissions are the planned trigger families.</span>
                </div>
            `;
        }

        generateApiToken() {
            const token = {
                id: `token-${Date.now()}`,
                name: `Local API Token ${this.apiTokens.length + 1}`,
                token: `th3_${Math.random().toString(36).slice(2)}${Math.random().toString(36).slice(2)}`,
                status: "active",
                createdAt: new Date().toLocaleString()
            };
            this.apiTokens = [token, ...this.apiTokens];
            this.saveApiTokens(this.apiTokens);
            this.renderApiConsole();
            this.toast("API token created.");
        }

        revokeApiToken(id) {
            this.apiTokens = this.apiTokens.map((token) => token.id === id ? { ...token, status: "revoked" } : token);
            this.saveApiTokens(this.apiTokens);
            this.renderApiConsole();
            this.toast("API token revoked.", "warning");
        }

        bindApiPanelActions() {
            this.apiPanelContent?.querySelectorAll("[data-copy-text]").forEach((button) => {
                button.addEventListener("click", () => this.copyText(button.dataset.copyText || ""));
            });
            this.apiPanelContent?.querySelectorAll("[data-api-revoke]").forEach((button) => {
                button.addEventListener("click", () => this.revokeApiToken(button.dataset.apiRevoke || ""));
            });
        }

        async copyText(text) {
            try {
                await navigator.clipboard.writeText(text);
                this.toast("Copied to clipboard.");
            } catch (_error) {
                this.toast("Copy failed. Select the text manually.", "error");
            }
        }

        async runExport() {
            this.setButtonLoading(this.publishExportButton, true, "Exporting...");
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
            } finally {
                this.setButtonLoading(this.publishExportButton, false);
            }
        }
    }

    new CmsAdminApp();
})();
