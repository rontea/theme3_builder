/**
 * Theme_3 Visual Builder - Main Application
 */

class VisualBuilder {
    constructor() {
        this.siteProjectName = 'theme_3';
        this.project = { name: this.siteProjectName, createdAt: new Date().toISOString() };
        this.currentPageName = null;
        this.currentLayoutFileName = null;
        this.historyUndo = [];
        this.historyRedo = [];
        this.partials = [];
        this.pageComponents = [];
        this.partialComponents = [];
        this.partialHistoryUndo = [];
        this.partialHistoryRedo = [];
        this.builderMode = 'page';
        this.pageCreated = false;
        this.partialHeightCache = {};
        this.currentDragPartialPath = null;
        this.canvasLayoutMode = 'flow';
        this.activeRegionFilter = 'all';
        this.activePaletteTab = 'partials';
        this.layoutRegions = [
            { id: 'header', name: 'Header', required: true, locked: false },
            { id: 'hero', name: 'Hero', required: false, locked: false },
            { id: 'main', name: 'Main Content', required: true, locked: false },
            { id: 'side-navigation', name: 'Side Navigation', required: false, locked: false },
            { id: 'content-above', name: 'Content Above', required: false, locked: false },
            { id: 'content-below', name: 'Content Below', required: false, locked: false },
            { id: 'footer', name: 'Footer', required: true, locked: false }
        ];
        this.freeformSectionTemplate = 'free-layout';
        this.pendingNativeDragData = null;
        this.selectedItem = null;
        this.selectedElement = null;
        this.apiBase = '';
        this.pendingDeleteTarget = null;
        this.currentPartialFileName = null;
        this.editingLayoutPath = null;
        this.editingLayoutTemplate = null;
        this.editingLayoutBodyPageName = null;
        this.editingPartialPath = null;
        this.previewContentMode = 'render';
        this.currentPartialCodePath = null;
        this.pendingImageEdit = null;
        this.cmsCollections = [];
        this.cmsEntriesByCollection = {};
        this.cmsEntriesLoadPromises = {};
        this.cmsViews = [];
        this.cmsViewPreviews = {};
        this.cmsViewPreviewPromises = {};
        this.templates = [];
        this.savedLayouts = [];
        this.selectedTemplate = null;
        this.runtimeConfig = {
            cms: {
                readMode: 'export',
                baseUrl: '',
                adminUrl: 'http://localhost:3100/cms',
                exportPath: 'html/data/cms'
            }
        };
        this.designPresets = [
            {
                id: 'default',
                name: 'Default',
                vars: {
                    accent: '#2563eb',
                    text: '#0f172a',
                    muted: '#64748b',
                    surface: '#f8fafc',
                    radius: '12px',
                    fontBody: '"Inter", system-ui, sans-serif',
                    fontHeading: '"Inter", system-ui, sans-serif'
                }
            },
            {
                id: 'studio',
                name: 'Studio',
                vars: {
                    accent: '#0f766e',
                    text: '#0f172a',
                    muted: '#475569',
                    surface: '#ecfeff',
                    radius: '18px',
                    fontBody: '"Inter", system-ui, sans-serif',
                    fontHeading: '"Inter", system-ui, sans-serif'
                }
            },
            {
                id: 'editorial',
                name: 'Editorial',
                vars: {
                    accent: '#b91c1c',
                    text: '#111827',
                    muted: '#6b7280',
                    surface: '#fff7ed',
                    radius: '6px',
                    fontBody: 'Georgia, "Times New Roman", serif',
                    fontHeading: 'Georgia, "Times New Roman", serif'
                }
            },
            {
                id: 'mono',
                name: 'Mono',
                vars: {
                    accent: '#0ea5e9',
                    text: '#0f172a',
                    muted: '#64748b',
                    surface: '#f1f5f9',
                    radius: '2px',
                    fontBody: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace',
                    fontHeading: '"SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace'
                }
            }
        ];
        this.activePresetId = 'default';
        this.apiClient = new window.BuilderApiClient(this.apiBase);
        this.stateStore = window.BuilderStateStore;
        this.notifications = window.BuilderNotifications;
        this.modals = window.BuilderModals;
        this.pagesDashboard = window.BuilderPagesDashboard;
        this.editorCanvas = window.BuilderEditorCanvas;
        
        this.init();
    }

    async init() {
        try {
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => this.setup());
            } else {
                this.setup();
            }
        } catch (error) {
            console.error('Initialization error:', error);
            this.showToast('Failed to initialize builder', 'error');
        }
    }

    async setup() {
        this.bindElements();
        this.bindEvents();
        this.initSortable();
        await this.loadRuntimeConfig();
        await this.initMicroComponents();
        await this.loadCmsCollections();
        await this.loadCmsViews();
        this.initDesignPresets();
        this.initRegionFilters();
        const initialMode = this.getInitialBuilderMode();
        this.setBuilderMode(initialMode);
        this.updateWorkspaceStatus();
        this.updateSelectionStatus();
        this.updateEditorBreadcrumb();
        if (this.shouldShowLanding(initialMode)) {
            this.showLandingScreen();
        } else {
            this.enterBuilder();
        }
    }

    getInitialBuilderMode() {
        const attrMode = document?.body?.dataset?.builderMode || '';
        const urlMode = new URLSearchParams(window.location.search).get('mode') || '';
        const raw = String(attrMode || urlMode).toLowerCase();
        if (raw === 'partial' || raw === 'micro') {
            return 'partial';
        }
        return 'page';
    }

    async loadRuntimeConfig() {
        try {
            const result = await this.apiClient.getBuilderConfig();
            const config = result?.data || {};
            this.runtimeConfig = {
                ...this.runtimeConfig,
                ...config,
                cms: {
                    ...this.runtimeConfig.cms,
                    ...(config.cms || {})
                }
            };
        } catch (error) {
            console.warn('Failed to load builder runtime config:', error);
        }
    }

    shouldShowLanding(initialMode) {
        const hideLanding = document?.body?.dataset?.hideLanding === 'true';
        if (hideLanding) {
            return false;
        }
        return initialMode === 'page';
    }

    bindElements() {
        // Sidebar elements
        this.searchInput = document.getElementById('searchPartials');
        this.partialsFilter = document.getElementById('filterPartials');
        this.regionFilter = document.getElementById('filterRegions');
        this.partialsList = document.getElementById('partialsList');
        this.microList = document.getElementById('microList');
        this.viewsList = document.getElementById('viewsList');
        this.syncPagePartials = document.getElementById('syncPagePartials');
        this.partialsTab = document.getElementById('partialsTab');
        this.microTab = document.getElementById('microTab');
        this.viewsTab = document.getElementById('viewsTab');
        this.sidebarTitle = document.getElementById('sidebarTitle');
        this.microQuickFilters = document.getElementById('microQuickFilters');
        this.presetSelect = document.getElementById('designPresetSelect');
        
        // Canvas elements
        this.canvas = document.getElementById('canvas');
        this.canvasContainer = document.querySelector('.canvas-container');
        this.canvasDropZone = document.getElementById('canvasDropZone');
        this.canvasEmpty = document.getElementById('canvasEmpty');
        this.componentCount = document.getElementById('componentCount');
        this.canvasModeLabel = document.getElementById('canvasModeLabel');
        this.canvasModeHint = document.getElementById('canvasModeHint');
        this.canvasSelectionStatus = document.getElementById('canvasSelectionStatus');
        this.btnCanvasFlow = document.getElementById('btnCanvasFlow');
        this.btnCanvasFreeform = document.getElementById('btnCanvasFreeform');
        this.freeformSectionControls = document.getElementById('freeformSectionControls');
        this.freeformSectionTemplateSelect = document.getElementById('freeformSectionTemplate');
        this.btnExitCanvasFocus = document.getElementById('btnExitCanvasFocus');
        this.paletteItemCount = document.getElementById('paletteItemCount');
        
        // Buttons
        this.btnUndo = document.getElementById('btnUndo');
        this.btnRedo = document.getElementById('btnRedo');
        this.btnClear = document.getElementById('btnClear');
        this.btnPreview = document.getElementById('btnPreview');
        this.btnInspect = document.getElementById('btnInspect');
        this.btnToggleStitchMode = document.getElementById('btnToggleStitchMode');
        this.btnExport = document.getElementById('btnExport');
        this.btnSave = document.getElementById('btnSave');
        this.btnLoadLayout = document.getElementById('btnLoadLayout');
        this.btnClosePage = document.getElementById('btnClosePage');
        this.btnCreateProject = document.getElementById('btnCreateProject');
        this.btnOpenCms = document.getElementById('btnOpenCms');
        this.btnTemplates = document.getElementById('btnTemplates');
        this.projectNameDisplay = document.getElementById('projectNameDisplay');
        this.builderSurfaceBadge = document.getElementById('builderSurfaceBadge');
        this.builderTargetBadge = document.getElementById('builderTargetBadge');
        this.builderValidationBadge = document.getElementById('builderValidationBadge');

        // Modals
        this.previewModal = document.getElementById('previewModal');
        this.exportModal = document.getElementById('exportModal');
        this.loadLayoutModal = document.getElementById('loadLayoutModal');
        this.deleteProjectModal = document.getElementById('deleteProjectModal');
        this.closePageConfirmModal = document.getElementById('closePageConfirmModal');
        this.createProjectModal = document.getElementById('createProjectModal');
        this.createPageModal = document.getElementById('createPageModal');
        this.partialCodeModal = document.getElementById('partialCodeModal');
        this.partialPreviewModal = document.getElementById('partialPreviewModal');
        this.imageModal = document.getElementById('imageModal');
        this.templatesModal = document.getElementById('templatesModal');
        this.previewFrame = document.getElementById('previewFrame');
        this.previewFrameWrap = document.getElementById('previewFrameWrap');
        this.previewControls = document.getElementById('previewControls');
        this.previewTypeControls = document.getElementById('previewTypeControls');
        this.previewMarkupWrap = document.getElementById('previewMarkupWrap');
        this.previewMarkupOutput = document.getElementById('previewMarkupOutput');
        this.exportOutput = document.getElementById('exportOutput');
        this.exportFormat = document.getElementById('exportFormat');
        this.partialCodeTitle = document.getElementById('partialCodeTitle');
        this.partialCodeOutput = document.getElementById('partialCodeOutput');
        this.savePartialCodeButton = document.getElementById('savePartialCode');
        this.partialPreviewTitle = document.getElementById('partialPreviewTitle');
        this.partialPreviewFrame = document.getElementById('partialPreviewFrame');
        this.projectNameInput = document.getElementById('projectNameInput');
        this.openCreateProjectButton = document.getElementById('openCreateProjectModal');
        this.confirmCreateProject = document.getElementById('confirmCreateProject');
        this.closeCreateProjectButton = document.getElementById('closeCreateProjectModal');
        this.cancelCreateProjectButton = document.getElementById('cancelCreateProject');
        this.pageNameInput = document.getElementById('pageNameInput');
        this.confirmCreatePage = document.getElementById('confirmCreatePage');
        this.closeCreatePageButton = document.getElementById('closeCreatePageModal');
        this.cancelCreatePageButton = document.getElementById('cancelCreatePage');
        this.closeDeleteProject = document.getElementById('closeDeleteProject');
        this.cancelDeleteProject = document.getElementById('cancelDeleteProject');
        this.confirmDeleteProject = document.getElementById('confirmDeleteProject');
        this.deleteProjectName = document.getElementById('deleteProjectName');
        this.closeClosePageConfirmModal = document.getElementById('closeClosePageConfirmModal');
        this.cancelClosePageConfirm = document.getElementById('cancelClosePageConfirm');
        this.confirmClosePageConfirm = document.getElementById('confirmClosePageConfirm');
        this.closePageName = document.getElementById('closePageName');
        this.imageUrlInput = document.getElementById('imageUrlInput');
        this.imageAltInput = document.getElementById('imageAltInput');
        this.applyImageUrlButton = document.getElementById('applyImageUrl');
        this.imageUploadInput = document.getElementById('imageUploadInput');
        this.uploadImageButton = document.getElementById('uploadImageButton');
        this.imageUploadStatus = document.getElementById('imageUploadStatus');
        this.closeImageModalButton = document.getElementById('closeImageModal');
        this.cancelImageModalButton = document.getElementById('cancelImageModal');
        this.imageLibraryList = document.getElementById('imageLibraryList');
        this.refreshImageLibraryButton = document.getElementById('refreshImageLibrary');
        this.closeTemplatesModalButton = document.getElementById('closeTemplatesModal');
        this.newTemplateButton = document.getElementById('newTemplateButton');
        this.templateSearchInput = document.getElementById('templateSearchInput');
        this.templateTypeFilter = document.getElementById('templateTypeFilter');
        this.templatesList = document.getElementById('templatesList');
        this.templateEditorEmpty = document.getElementById('templateEditorEmpty');
        this.templateEditor = document.getElementById('templateEditor');
        this.templateEditorTitle = document.getElementById('templateEditorTitle');
        this.templateValidationSummary = document.getElementById('templateValidationSummary');
        this.templateIdInput = document.getElementById('templateIdInput');
        this.templateLabelInput = document.getElementById('templateLabelInput');
        this.templateRouteInput = document.getElementById('templateRouteInput');
        this.templateContentTypeSelect = document.getElementById('templateContentTypeSelect');
        this.templateLayoutSelect = document.getElementById('templateLayoutSelect');
        this.templatePreviewEntrySelect = document.getElementById('templatePreviewEntrySelect');
        this.templateRegionList = document.getElementById('templateRegionList');
        this.saveTemplateButton = document.getElementById('saveTemplateButton');
        this.deleteTemplateButton = document.getElementById('deleteTemplateButton');
        this.previewTemplateButton = document.getElementById('previewTemplateButton');
        this.savedLayoutsList = document.getElementById('savedLayoutsList');
        this.landingScreen = document.getElementById('landingScreen');
        this.landingProjectsList = document.getElementById('landingProjectsList');
        this.landingLandmarksList = document.getElementById('landingLandmarksList');
        this.landingLayoutsList = document.getElementById('landingLayoutsList');
        this.landingContentTitle = document.getElementById('landingContentTitle');
        this.syncLandingPages = document.getElementById('syncLandingPages');
        this.syncLandingLandmarks = document.getElementById('syncLandingLandmarks');
        this.syncLandingLayouts = document.getElementById('syncLandingLayouts');
        this.closeProjectDashboard = document.getElementById('closeProjectDashboard');
        this.refreshLandingProjects = document.getElementById('refreshLandingProjects');
        // Page title
        this.pageTitleInput = document.getElementById('pageTitle');
        
        // Properties panel
        this.propertiesPanel = document.getElementById('propertiesPanel');
        this.propertiesContent = document.getElementById('propertiesContent');
        this.closeProperties = document.getElementById('closeProperties');
        this.inspectorPanel = document.getElementById('inspectorPanel');
        this.inspectorContent = document.getElementById('inspectorContent');
        this.closeInspector = document.getElementById('closeInspector');
    }

    bindEvents() {
        // Search
        this.searchInput.addEventListener('input', () => this.filterComponents());
        if (this.partialsFilter) {
            this.partialsFilter.addEventListener('change', () => this.filterComponents());
        }
        if (this.regionFilter) {
            this.regionFilter.addEventListener('change', () => {
                this.activeRegionFilter = this.regionFilter.value || 'all';
                this.filterComponents();
            });
        }
        if (this.previewControls) {
            this.previewControls.addEventListener('click', (e) => this.handlePreviewControlClick(e));
        }
        if (this.previewTypeControls) {
            this.previewTypeControls.addEventListener('click', (e) => this.handlePreviewViewClick(e));
        }
        if (this.microQuickFilters) {
            this.microQuickFilters.addEventListener('click', (e) => this.handleMicroQuickFilter(e));
        }
        if (this.presetSelect) {
            this.presetSelect.addEventListener('change', (e) => this.applyDesignPreset(e.target.value));
        }
        if (this.partialsTab) {
            this.partialsTab.addEventListener('click', () => {
                this.activePaletteTab = 'partials';
                this.setBuilderMode('page');
            });
        }
        if (this.microTab) {
            this.microTab.addEventListener('click', () => {
                this.activePaletteTab = 'micro';
                this.setBuilderMode('partial');
            });
        }
        if (this.viewsTab) {
            this.viewsTab.addEventListener('click', () => {
                this.activePaletteTab = 'views';
                this.setBuilderMode('page');
            });
        }
        
        // Toolbar buttons
        this.btnUndo.addEventListener('click', () => this.undo());
        this.btnRedo.addEventListener('click', () => this.redo());
        this.btnClear.addEventListener('click', () => this.clearCanvas());
        this.btnPreview.addEventListener('click', () => this.showPreview());
        this.btnInspect.addEventListener('click', () => this.toggleInspectorPanel());
        this.btnToggleStitchMode.addEventListener('click', () => this.toggleStitchMode());
        if (this.btnCanvasFlow) {
            this.btnCanvasFlow.addEventListener('click', () => this.setCanvasLayoutMode('flow'));
        }
        if (this.btnCanvasFreeform) {
            this.btnCanvasFreeform.addEventListener('click', () => this.setCanvasLayoutMode('freeform'));
        }
        if (this.freeformSectionTemplateSelect) {
            this.freeformSectionTemplateSelect.addEventListener('change', (e) => {
                this.freeformSectionTemplate = e.target.value || 'free-layout';
            });
        }
        if (this.btnExitCanvasFocus) {
            this.btnExitCanvasFocus.addEventListener('click', () => this.setCanvasFocusMode(false));
        }
        this.btnExport.addEventListener('click', () => this.showExportModal());
        this.btnSave.addEventListener('click', () => this.saveLayout());
        this.btnLoadLayout.addEventListener('click', () => this.openLoadLayoutModal());
        this.btnClosePage.addEventListener('click', () => this.closeCurrentPageToDashboard());
        this.btnCreateProject.addEventListener('click', () => this.openProjectModal());
        if (this.btnOpenCms) {
            this.btnOpenCms.addEventListener('click', () => this.openCmsModal());
        }
        if (this.btnTemplates) {
            this.btnTemplates.addEventListener('click', () => this.openTemplatesModal());
        }
        if (this.closeTemplatesModalButton) {
            this.closeTemplatesModalButton.addEventListener('click', () => this.hideModal(this.templatesModal));
        }
        if (this.newTemplateButton) {
            this.newTemplateButton.addEventListener('click', () => this.createTemplateDraft());
        }
        if (this.templateSearchInput) {
            this.templateSearchInput.addEventListener('input', () => this.renderTemplatesList());
        }
        if (this.templateTypeFilter) {
            this.templateTypeFilter.addEventListener('change', () => this.renderTemplatesList());
        }
        if (this.templatesList) {
            this.templatesList.addEventListener('click', (event) => this.handleTemplateListClick(event));
        }
        if (this.templateContentTypeSelect) {
            this.templateContentTypeSelect.addEventListener('change', () => this.handleTemplateContentTypeChange());
        }
        if (this.saveTemplateButton) {
            this.saveTemplateButton.addEventListener('click', () => this.saveTemplateFromEditor());
        }
        if (this.deleteTemplateButton) {
            this.deleteTemplateButton.addEventListener('click', () => this.deleteSelectedTemplate());
        }
        if (this.previewTemplateButton) {
            this.previewTemplateButton.addEventListener('click', () => this.previewSelectedTemplate());
        }
        this.syncLandingPages.addEventListener('click', () => this.syncPagesFromFilesystem());
        if (this.syncLandingLandmarks) {
            this.syncLandingLandmarks.addEventListener('click', () => this.syncLandmarksFromFilesystem());
        }
        if (this.syncLandingLayouts) {
            this.syncLandingLayouts.addEventListener('click', () => this.syncLayoutsFromFilesystem());
        }
        this.syncPagePartials.addEventListener('click', () => this.syncCurrentPagePartials());
        this.refreshLandingProjects.addEventListener('click', () => this.loadLandingProjects());
        this.closeProjectDashboard.addEventListener('click', () => this.closeProjectToMainDashboard());
        this.openCreateProjectButton.addEventListener('click', () => this.handleLandingPrimaryAction());
        
        // Modal close buttons
        document.getElementById('closePreview').addEventListener('click', () => this.hideModal(this.previewModal));
        document.getElementById('closeExport').addEventListener('click', () => this.hideModal(this.exportModal));
        document.getElementById('closeLoadLayout').addEventListener('click', () => this.hideModal(this.loadLayoutModal));
        document.getElementById('closePartialCodeModal').addEventListener('click', () => this.hideModal(this.partialCodeModal));
        document.getElementById('closePartialPreviewModal').addEventListener('click', () => this.hideModal(this.partialPreviewModal));
        if (this.savePartialCodeButton) {
            this.savePartialCodeButton.addEventListener('click', () => this.savePartialCode());
        }
        if (this.closeImageModalButton) {
            this.closeImageModalButton.addEventListener('click', () => this.closeImageModal());
        }
        this.closeCreateProjectButton.addEventListener('click', () => this.closeCreateProjectModal());
        this.cancelCreateProjectButton.addEventListener('click', () => this.closeCreateProjectModal());
        this.closeCreatePageButton.addEventListener('click', () => this.closeCreatePageModal());
        this.cancelCreatePageButton.addEventListener('click', () => this.closeCreatePageModal());
        this.closeDeleteProject.addEventListener('click', () => this.closeDeleteProjectModal());
        this.cancelDeleteProject.addEventListener('click', () => this.closeDeleteProjectModal());
        this.confirmDeleteProject.addEventListener('click', () => this.confirmDeleteProjectAction());
        this.closeClosePageConfirmModal.addEventListener('click', () => this.closeClosePageConfirmDialog());
        this.cancelClosePageConfirm.addEventListener('click', () => this.closeClosePageConfirmDialog());
        this.confirmClosePageConfirm.addEventListener('click', () => this.confirmClosePageAction());
        if (this.cancelImageModalButton) {
            this.cancelImageModalButton.addEventListener('click', () => this.closeImageModal());
        }
        if (this.applyImageUrlButton) {
            this.applyImageUrlButton.addEventListener('click', () => this.applyImageUrl());
        }
        if (this.imageUrlInput) {
            this.imageUrlInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    this.applyImageUrl();
                }
            });
        }
        if (this.uploadImageButton) {
            this.uploadImageButton.addEventListener('click', () => this.handleImageUpload());
        }
        if (this.refreshImageLibraryButton) {
            this.refreshImageLibraryButton.addEventListener('click', () => this.loadImageLibrary());
        }
        if (this.imageLibraryList) {
            this.imageLibraryList.addEventListener('click', (event) => this.handleImageLibraryClick(event));
        }
        
        // Export buttons
        document.getElementById('copyExport').addEventListener('click', () => this.copyToClipboard());
        document.getElementById('downloadExport').addEventListener('click', () => this.downloadExport());
        if (this.exportFormat) {
            this.exportFormat.addEventListener('change', () => this.updateExportPreview());
        }
        
        // Close modals on background click
        [this.propertiesPanel, this.previewModal, this.exportModal, this.loadLayoutModal, this.deleteProjectModal, this.closePageConfirmModal, this.createProjectModal, this.createPageModal, this.partialCodeModal, this.partialPreviewModal, this.imageModal].filter(Boolean).forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    if (modal === this.propertiesPanel) {
                        this.hidePropertiesPanel();
                    } else if (modal === this.deleteProjectModal) {
                        this.closeDeleteProjectModal();
                    } else if (modal === this.closePageConfirmModal) {
                        this.closeClosePageConfirmDialog();
                    } else if (modal === this.createProjectModal) {
                        this.closeCreateProjectModal();
                    } else if (modal === this.createPageModal) {
                        this.closeCreatePageModal();
                    } else if (modal === this.partialPreviewModal) {
                        this.hideModal(this.partialPreviewModal);
                    } else if (modal === this.imageModal) {
                        this.closeImageModal();
                    } else {
                        this.hideModal(modal);
                    }
                }
            });
        });
        
        // Properties panel
        this.closeProperties.addEventListener('click', () => this.hidePropertiesPanel());
        if (this.closeInspector) {
            this.closeInspector.addEventListener('click', () => this.hideInspectorPanel());
        }
        this.confirmCreateProject.addEventListener('click', () => this.createProject());
        this.projectNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.createProject();
            }
        });
        this.confirmCreatePage.addEventListener('click', () => this.createPage());
        this.pageNameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.createPage();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hidePropertiesPanel();
                this.hideModal(this.previewModal);
                this.hideModal(this.exportModal);
                this.hideModal(this.partialCodeModal);
                this.hideModal(this.partialPreviewModal);
                this.closeImageModal();
                this.closeCreateProjectModal();
                this.closeCreatePageModal();
                this.closeDeleteProjectModal();
                this.closeClosePageConfirmDialog();
            }
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveLayout();
            }
            if (e.ctrlKey && !e.shiftKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                this.undo();
            }
            if ((e.ctrlKey && e.key.toLowerCase() === 'y') || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'z')) {
                e.preventDefault();
                this.redo();
            }
        });
    }

    initSortable() {
        this.editorCanvas.initSortable(this);
    }

    setProjectLockState(isLocked) {
        this.btnUndo.disabled = isLocked;
        this.btnRedo.disabled = isLocked;
        this.btnClear.disabled = isLocked;
        this.btnPreview.disabled = isLocked;
        if (this.btnInspect) this.btnInspect.disabled = isLocked;
        this.btnToggleStitchMode.disabled = isLocked;
        if (this.btnCanvasFlow) this.btnCanvasFlow.disabled = isLocked;
        if (this.btnCanvasFreeform) this.btnCanvasFreeform.disabled = isLocked;
        if (this.freeformSectionTemplateSelect) this.freeformSectionTemplateSelect.disabled = isLocked || this.canvasLayoutMode !== 'freeform';
        this.btnExport.disabled = isLocked;
        this.btnSave.disabled = isLocked;
        if (this.btnOpenCms) this.btnOpenCms.disabled = false;
        const isEditingPartial = Boolean(this.editingPartialPath);
        const isEditingLayout = Boolean(this.editingLayoutPath);
        const disablePageActions = isLocked || this.builderMode !== 'page' || isEditingPartial || isEditingLayout;
        this.btnLoadLayout.disabled = disablePageActions;
        this.btnClosePage.disabled = isLocked || this.builderMode !== 'page';
        const disableSync = isLocked || this.builderMode !== 'page';
        this.syncPagePartials.disabled = disableSync;
        this.searchInput.disabled = isLocked;
        if (this.partialsFilter) this.partialsFilter.disabled = isLocked;
        this.pageTitleInput.disabled = isLocked || isEditingPartial || isEditingLayout;
        if (this.partialsTab) this.partialsTab.disabled = isLocked;
        if (this.microTab) this.microTab.disabled = isLocked;
        if (this.viewsTab) this.viewsTab.disabled = isLocked;
        if (this.editorCanvas && typeof this.editorCanvas.updateInteractionMode === 'function') {
            this.editorCanvas.updateInteractionMode(this);
        } else {
            if (this.partialsSortable) this.partialsSortable.option('disabled', isLocked);
            if (this.microSortable) this.microSortable.option('disabled', isLocked);
            if (this.viewsSortable) this.viewsSortable.option('disabled', isLocked);
            if (this.canvasSortable) this.canvasSortable.option('disabled', isLocked);
        }
        this.updateSaveButtonLabel();
        this.updateWorkspaceStatus();
    }

    getSnapshot() {
        return this.stateStore.getSnapshot(this);
    }

    pushHistory() {
        this.stateStore.pushHistory(this);
    }

    undo() {
        this.stateStore.undo(this);
        this.refreshLivePreview();
    }

    redo() {
        this.stateStore.redo(this);
        this.refreshLivePreview();
    }

      refreshLivePreview() {
          if (this.previewModal.classList.contains('active')) {
              this.updatePreviewModalContent();
          }
      }

      handlePreviewControlClick(event) {
          const button = event.target.closest('[data-preview]');
          if (!button) {
              return;
          }
          const mode = button.dataset.preview || 'desktop';
          this.setPreviewMode(mode);
      }

      handlePreviewViewClick(event) {
          const button = event.target.closest('[data-preview-view]');
          if (!button) {
              return;
          }
          const mode = button.dataset.previewView || 'render';
          this.setPreviewContentMode(mode);
      }

      setPreviewMode(mode = 'desktop') {
          const size = ['desktop', 'tablet', 'mobile'].includes(mode) ? mode : 'desktop';
          if (this.previewFrameWrap) {
              this.previewFrameWrap.dataset.size = size;
          }
          if (this.previewControls) {
              this.previewControls.querySelectorAll('[data-preview]').forEach((button) => {
                  const target = button.dataset.preview || 'desktop';
                  button.classList.toggle('active', target === size);
              });
          }
      }

      setPreviewContentMode(mode = 'render') {
          const allowMarkup = this.builderMode === 'partial';
          const nextMode = allowMarkup && mode === 'markup' ? 'markup' : 'render';
          this.previewContentMode = nextMode;
          if (this.previewTypeControls) {
              this.previewTypeControls.hidden = !allowMarkup;
              this.previewTypeControls.querySelectorAll('[data-preview-view]').forEach((button) => {
                  const target = button.dataset.previewView || 'render';
                  button.classList.toggle('active', target === nextMode);
              });
          }
          if (this.previewControls) {
              this.previewControls.hidden = nextMode !== 'render';
          }
          if (this.previewFrameWrap) {
              this.previewFrameWrap.hidden = nextMode !== 'render';
          }
          if (this.previewMarkupWrap) {
              this.previewMarkupWrap.hidden = nextMode !== 'markup';
          }
          this.updatePreviewModalContent();
      }

      updatePreviewModalContent() {
          if (this.previewContentMode === 'markup' && this.builderMode === 'partial') {
              if (this.previewMarkupOutput) {
                  this.previewMarkupOutput.textContent = this.generatePreviewMarkup();
              }
              return;
          }
          if (this.previewFrame) {
              this.previewFrame.srcdoc = this.generatePreviewHTML();
          }
      }

    toggleStitchMode() {
        if (this.canvasLayoutMode === 'freeform') {
            this.setCanvasFocusMode(!this.isCanvasFocusMode());
            return;
        }
        const isActive = this.canvas.classList.toggle('stitch-mode');
        if (this.canvasContainer) {
            this.canvasContainer.classList.toggle('stitch-mode', isActive);
        }
        this.btnToggleStitchMode.classList.toggle('btn-primary', isActive);
        this.btnToggleStitchMode.classList.toggle('btn-secondary', !isActive);
        this.btnToggleStitchMode.querySelector('span').textContent = isActive ? 'Edit View' : 'Stitch View';
        this.btnToggleStitchMode.title = isActive ? 'Switch to Edit View' : 'Switch to Stitch View';
        this.updateCanvasDragHandle();
    }

    isCanvasFocusMode() {
        const app = document.getElementById('app');
        return Boolean(app?.classList.contains('canvas-focus-mode'));
    }

    setCanvasFocusMode(isActive) {
        const app = document.getElementById('app');
        if (!app) {
            return;
        }
        app.classList.toggle('canvas-focus-mode', Boolean(isActive));
        if (this.btnExitCanvasFocus) {
            this.btnExitCanvasFocus.hidden = !isActive;
        }
        if (this.btnToggleStitchMode && this.canvasLayoutMode === 'freeform') {
            this.btnToggleStitchMode.classList.toggle('btn-primary', Boolean(isActive));
            this.btnToggleStitchMode.classList.toggle('btn-secondary', !isActive);
            const label = this.btnToggleStitchMode.querySelector('span');
            if (label) {
                label.textContent = isActive ? 'Edit View' : 'Component View';
            }
            this.btnToggleStitchMode.title = isActive
                ? 'Return to the editor'
                : 'Hide the editor and show only the composed components';
        }
    }

    setCanvasLayoutMode(mode = 'flow', options = {}) {
        const nextMode = mode === 'freeform' ? 'freeform' : 'flow';
        const previousMode = this.canvasLayoutMode;
        this.canvasLayoutMode = nextMode;

        if (this.btnCanvasFlow) {
            this.btnCanvasFlow.classList.toggle('active', nextMode === 'flow');
        }
        if (this.btnCanvasFreeform) {
            this.btnCanvasFreeform.classList.toggle('active', nextMode === 'freeform');
        }
        if (this.canvas) {
            this.canvas.classList.toggle('is-freeform-mode', nextMode === 'freeform');
        }
        if (this.canvasContainer) {
            this.canvasContainer.classList.toggle('is-freeform-mode', nextMode === 'freeform');
        }
        if (this.freeformSectionControls) {
            this.freeformSectionControls.hidden = nextMode !== 'freeform';
        }
        if (this.freeformSectionTemplateSelect) {
            this.freeformSectionTemplateSelect.disabled = nextMode !== 'freeform';
            this.freeformSectionTemplateSelect.value = this.freeformSectionTemplate || 'free-layout';
        }
        if (this.canvasEmpty) {
            const title = this.canvasEmpty.querySelector('h4');
            const description = this.canvasEmpty.querySelector('p');
            if (title) {
                title.textContent = nextMode === 'freeform'
                    ? 'Drop To Create Section'
                    : (this.builderMode === 'page' ? 'Drop Components Here' : 'Build Partial Here');
            }
            if (description) {
                description.textContent = nextMode === 'freeform'
                    ? 'Each dropped component is placed into an auto-created section wrapper so the layout stays attached to that section.'
                    : (this.builderMode === 'page'
                        ? 'Drag partials from the sidebar to start building your page'
                        : 'Drag micro components from the sidebar to assemble a partial');
            }
        }
        if (this.btnToggleStitchMode) {
            const disableStitch = nextMode === 'freeform';
            this.btnToggleStitchMode.disabled = false;
            if (disableStitch) {
                this.canvas?.classList.remove('stitch-mode');
                this.canvasContainer?.classList.remove('stitch-mode');
                this.setCanvasFocusMode(false);
                const label = this.btnToggleStitchMode.querySelector('span');
                if (label) {
                    label.textContent = 'Component View';
                }
                this.btnToggleStitchMode.title = 'Hide the editor and show only the composed components';
            } else {
                this.setCanvasFocusMode(false);
                this.btnToggleStitchMode.classList.remove('btn-primary');
                this.btnToggleStitchMode.classList.add('btn-secondary');
                const label = this.btnToggleStitchMode.querySelector('span');
                if (label) {
                    label.textContent = this.canvas?.classList.contains('stitch-mode') ? 'Edit View' : 'Stitch View';
                }
                this.btnToggleStitchMode.title = this.canvas?.classList.contains('stitch-mode')
                    ? 'Switch to Edit View'
                    : 'Switch to Stitch View';
            }
        }

        if (this.editorCanvas && typeof this.editorCanvas.updateInteractionMode === 'function') {
            this.editorCanvas.updateInteractionMode(this);
        }
        this.updateCanvasModeHint();
        this.updateCanvasDragHandle();
        this.filterComponents();
        this.renderCanvasFromState();
        this.refreshLivePreview();

        if (!options.silent && previousMode !== nextMode) {
            this.showToast(
                nextMode === 'freeform'
                    ? 'Freeform mode enabled. Dropped components will be kept inside auto-created sections.'
                    : 'Flow mode enabled. Components stack and reorder vertically.',
                'success'
            );
        }
    }

    openProjectModal() {
        this.showLandingScreen();
    }

    showLandingScreen() {
        if (!this.landingScreen) {
            return;
        }
        this.setCanvasFocusMode(false);
        this.landingScreen.classList.add('active');
        this.setProjectLockState(true);
        this.updateLandingPrimaryAction();
        this.loadLandingProjects();
    }

    closeProjectToMainDashboard() {
        this.currentPageName = null;
        this.pageCreated = false;
        this.currentLayoutFileName = null;
        this.editingPartialPath = null;
        this.editingLayoutPath = null;
        this.editingLayoutTemplate = null;
        this.editingLayoutBodyPageName = null;
        this.updateEditorBreadcrumb();
        this.updateSaveButtonLabel();
        this.updateLandingPrimaryAction();
        this.loadLandingProjects();
    }

    updateEditorBreadcrumb() {
        if (this.editingLayoutPath) {
            const name = this.editingLayoutPath.split('/').pop() || this.editingLayoutPath;
            this.projectNameDisplay.textContent = `Layout: ${name}`;
            this.updateWorkspaceStatus();
            return;
        }
        if (this.editingPartialPath) {
            const name = this.editingPartialPath.split('/').pop() || this.editingPartialPath;
            this.projectNameDisplay.textContent = `Partial: ${name}`;
            this.updateWorkspaceStatus();
            return;
        }
        const pageName = this.currentPageName || '';
        this.projectNameDisplay.textContent = pageName || 'No Page';
        this.updateWorkspaceStatus();
    }

    getWorkspaceSurfaceLabel() {
        if (this.editingLayoutPath) {
            return 'Layout Editor';
        }
        if (this.editingPartialPath) {
            return 'Landmark Editor';
        }
        return this.builderMode === 'partial' ? 'Micro Builder' : 'Page Builder';
    }

    getWorkspaceTargetLabel() {
        if (this.editingLayoutPath) {
            return this.editingLayoutPath.split('/').pop() || 'Active layout';
        }
        if (this.editingPartialPath) {
            return this.editingPartialPath.split('/').pop() || 'Active partial';
        }
        const pageName = (this.currentPageName || this.pageTitleInput?.value || '').trim();
        if (pageName) {
            return pageName;
        }
        return this.builderMode === 'partial' ? 'New partial draft' : 'No active page';
    }

    updateWorkspaceStatus() {
        if (this.builderSurfaceBadge) {
            this.builderSurfaceBadge.textContent = this.getWorkspaceSurfaceLabel();
        }
        if (this.builderTargetBadge) {
            this.builderTargetBadge.textContent = this.getWorkspaceTargetLabel();
        }
        if (this.builderValidationBadge) {
            const issues = this.getLayoutValidationIssues();
            this.builderValidationBadge.hidden = issues.length === 0;
            this.builderValidationBadge.textContent = `${issues.length} Validation ${issues.length === 1 ? 'Error' : 'Errors'}`;
        }
        this.updateCanvasModeHint();
    }

    updateCanvasModeHint() {
        if (!this.canvasModeHint) {
            return;
        }
        let hint = 'Build and reorder sections here.';
        if (this.canvasLayoutMode === 'freeform') {
            hint = 'Drop components to create movable sections on a freeform stage.';
        } else if (this.editingLayoutPath) {
            hint = 'Adjust the main layout structure while keeping the surrounding shell intact.';
        } else if (this.editingPartialPath) {
            hint = 'Refine this landmark partial in isolation, then save it back to the codebase.';
        } else if (this.builderMode === 'partial') {
            hint = 'Assemble micro components into a reusable partial.';
        } else if (!this.pageCreated) {
            hint = 'Open or create a page, then drag partials in to start shaping it.';
        } else {
            hint = 'Drag partials in, reorder them, and edit selected components on the right.';
        }
        this.canvasModeHint.textContent = hint;
    }

    updateSelectionStatus() {
        if (!this.canvasSelectionStatus) {
            return;
        }
        if (this.selectedItem && typeof this.findComponentById === 'function' && !this.findComponentById(this.selectedItem)) {
            this.selectedItem = null;
            this.selectedElement = null;
        }
        if (this.selectedElement?.key) {
            this.canvasSelectionStatus.textContent = 'Element selected';
            return;
        }
        if (this.selectedItem) {
            this.canvasSelectionStatus.textContent = 'Component selected';
            return;
        }
        this.canvasSelectionStatus.textContent = 'No selection';
    }

    updatePaletteItemCount(total = 0, filtered = total) {
        if (!this.paletteItemCount) {
            return;
        }
        const totalCount = Number.isFinite(total) ? total : 0;
        const filteredCount = Number.isFinite(filtered) ? filtered : totalCount;
        this.paletteItemCount.textContent = filteredCount === totalCount
            ? `${filteredCount} available`
            : `${filteredCount} of ${totalCount}`;
    }

    showCreateProjectModal() {
        this.createProjectModal.classList.add('active');
        setTimeout(() => this.projectNameInput.focus(), 0);
    }

    closeCreateProjectModal() {
        this.createProjectModal.classList.remove('active');
    }

    showCreatePageModal() {
        this.createPageModal.classList.add('active');
        setTimeout(() => this.pageNameInput.focus(), 0);
    }

    closeCreatePageModal() {
        this.createPageModal.classList.remove('active');
    }

    updateLandingPrimaryAction() {
        if (!this.openCreateProjectButton) {
            return;
        }
        this.openCreateProjectButton.innerHTML = '<i class="fas fa-file"></i> Create Page';
    }

    updateSaveButtonLabel() {
        if (!this.btnSave) {
            return;
        }
        const label = this.btnSave.querySelector('span');
        if (this.editingLayoutPath) {
            if (label) label.textContent = 'Save Layout';
            this.btnSave.title = 'Save Layout';
            return;
        }
        if (this.editingPartialPath) {
            if (label) label.textContent = 'Save Partial';
            this.btnSave.title = 'Save Partial';
            return;
        }
        const isPageMode = this.builderMode === 'page';
        if (label) {
            label.textContent = isPageMode ? 'Save' : 'Save Partial';
        }
        this.btnSave.title = isPageMode ? 'Save Layout' : 'Save Partial';
    }

    handleLandingPrimaryAction() {
        this.showCreatePageModal();
    }

    enterBuilder() {
        if (this.landingScreen) {
            this.landingScreen.classList.remove('active');
        }
        this.setProjectLockState(false);
    }

    closeCurrentPageToDashboard() {
        if (!this.project) {
            this.showLandingScreen();
            return;
        }

        if (this.pageComponents.length > 0) {
            this.openClosePageConfirmDialog();
            return;
        }

        this.performCloseCurrentPageToDashboard();
    }

    openClosePageConfirmDialog() {
        const pageName = this.currentPageName || this.pageTitleInput.value || 'Current page';
        this.closePageName.textContent = pageName;
        this.closePageConfirmModal.classList.add('active');
    }

    closeClosePageConfirmDialog() {
        this.closePageName.textContent = '';
        this.closePageConfirmModal.classList.remove('active');
    }

    confirmClosePageAction() {
        this.closeClosePageConfirmDialog();
        this.performCloseCurrentPageToDashboard();
    }

    performCloseCurrentPageToDashboard() {
        this.pageCreated = false;
        this.currentLayoutFileName = null;
        this.editingPartialPath = null;
        this.editingLayoutPath = null;
        this.editingLayoutTemplate = null;
        this.editingLayoutBodyPageName = null;
        this.historyUndo = [];
        this.historyRedo = [];
        this.pageComponents = [];
        this.pageTitleInput.value = '';
        this.currentPageName = null;
        this.updateEditorBreadcrumb();
        this.updateSaveButtonLabel();
        this.renderCanvasFromState();
        this.showLandingScreen();
        this.showToast(`Returned to ${this.project.name} dashboard`, 'success');
    }

    async createProject() {
        const projectName = (this.projectNameInput.value || '').trim();
        if (!projectName) {
            this.showToast('Project name is required', 'warning');
            return;
        }

        try {
            const result = await this.apiClient.createProject(projectName);

            this.project = {
                name: result?.data?.projectName || projectName,
                createdAt: result?.data?.createdAt || new Date().toISOString()
            };
        } catch (error) {
            console.error('Failed to create project:', error);
            this.showToast(`Failed to create project: ${error.message}`, 'error');
            return;
        }

        this.pageCreated = false;
        this.currentPageName = null;
        this.currentLayoutFileName = null;
        this.editingPartialPath = null;
        this.editingLayoutPath = null;
        this.editingLayoutTemplate = null;
        this.editingLayoutBodyPageName = null;
        this.historyUndo = [];
        this.historyRedo = [];
        this.pageComponents = [];
        this.renderCanvasFromState();

        this.updateEditorBreadcrumb();
        this.pageTitleInput.value = '';
        this.partials = [];
        this.partialsList.innerHTML = '<div class="loading">Create a page to load partials...</div>';

        this.projectNameInput.value = '';
        this.closeCreateProjectModal();
        this.showLandingScreen();
        this.updateLandingPrimaryAction();
        this.showToast(`Project created: ${projectName}. Create a page from the left panel.`, 'success');
    }

    async createPage() {
        const pageName = (this.pageNameInput.value || '').trim();
        if (!pageName) {
            this.showToast('Page name is required', 'warning');
            return;
        }

        const normalizedPageName = pageName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        if (!normalizedPageName) {
            this.showToast('Page name must include letters or numbers', 'warning');
            return;
        }

        try {
            await this.apiClient.createPage(this.siteProjectName, normalizedPageName, normalizedPageName);
        } catch (error) {
            console.error('Failed to create page:', error);
            this.showToast(`Failed to create page: ${error.message}`, 'error');
            return;
        }

        this.editingPartialPath = null;
        this.editingLayoutPath = null;
        this.editingLayoutTemplate = null;
        this.editingLayoutBodyPageName = null;
        this.currentPageName = normalizedPageName;
        this.currentLayoutFileName = null;
        this.pageTitleInput.value = normalizedPageName;
        this.updateEditorBreadcrumb();
        this.updateSaveButtonLabel();
        this.pageNameInput.value = '';
        this.pageCreated = true;

        await this.loadPartials();
        this.setBuilderMode('page');
        this.closeCreatePageModal();
        this.enterBuilder();
        this.updateLandingPrimaryAction();
        this.showToast(`Page created: ${this.pageTitleInput.value}`, 'success');
    }

    async loadLandingProjects() {
        const tasks = [this.pagesDashboard.loadLandingProjects(this)];
        if (typeof this.pagesDashboard.loadLandingLandmarks === 'function') {
            tasks.push(this.pagesDashboard.loadLandingLandmarks(this));
        }
        if (typeof this.pagesDashboard.loadLandingLayouts === 'function') {
            tasks.push(this.pagesDashboard.loadLandingLayouts(this));
        }
        await Promise.all(tasks);
    }

    async syncPagesFromFilesystem() {
        return this.pagesDashboard.syncPagesFromFilesystem(this);
    }

    async syncLandmarksFromFilesystem() {
        if (!this.syncLandingLandmarks) {
            return;
        }
        this.syncLandingLandmarks.disabled = true;
        try {
            if (typeof this.pagesDashboard.loadLandingLandmarks === 'function') {
                await this.pagesDashboard.loadLandingLandmarks(this);
            }
            this.showToast('Landmarks synced', 'success');
        } catch (error) {
            console.error('Failed to sync landmarks:', error);
            this.showToast(`Landmarks sync failed: ${error.message}`, 'error');
        } finally {
            this.syncLandingLandmarks.disabled = false;
        }
    }

    async syncLayoutsFromFilesystem() {
        if (!this.syncLandingLayouts) {
            return;
        }
        this.syncLandingLayouts.disabled = true;
        try {
            if (typeof this.pagesDashboard.loadLandingLayouts === 'function') {
                await this.pagesDashboard.loadLandingLayouts(this);
            }
            this.showToast('Layouts synced', 'success');
        } catch (error) {
            console.error('Failed to sync layouts:', error);
            this.showToast(`Layouts sync failed: ${error.message}`, 'error');
        } finally {
            this.syncLandingLayouts.disabled = false;
        }
    }

    async openLoadLayoutModal() {
        this.loadLayoutModal.classList.add('active');
        await this.loadSavedLayoutsList();
    }

    async loadSavedLayoutsList() {
        this.savedLayoutsList.innerHTML = '<div class="loading">Loading saved layouts...</div>';
        try {
            const result = await this.apiClient.listSavedLayouts();
            this.savedLayouts = Array.isArray(result.data) ? result.data : [];

            if (!this.savedLayouts.length) {
                this.savedLayoutsList.innerHTML = '<div class="loading">No saved layouts found</div>';
                return;
            }

            let html = '';
            this.savedLayouts.forEach((item) => {
                html += `
                    <div class="saved-layout-item" data-file-name="${item.fileName}">
                        <div class="saved-layout-meta">
                            <div class="saved-layout-name">${item.fileName}</div>
                            <div class="saved-layout-date">${item.updatedAt}</div>
                        </div>
                        <div class="saved-layout-actions">
                            <button class="btn btn-primary btn-load-item">Load</button>
                            <button class="btn btn-danger btn-delete-item" title="Delete project">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                `;
            });
            this.savedLayoutsList.innerHTML = html;

            this.savedLayoutsList.querySelectorAll('.btn-load-item').forEach((button) => {
                button.addEventListener('click', async (e) => {
                    const container = e.currentTarget.closest('.saved-layout-item');
                    const fileName = container.dataset.fileName;
                    await this.loadLayoutByFileName(fileName);
                });
            });
            this.savedLayoutsList.querySelectorAll('.btn-delete-item').forEach((button) => {
                button.addEventListener('click', (e) => {
                    const container = e.currentTarget.closest('.saved-layout-item');
                    const fileName = container.dataset.fileName;
                    this.openDeleteProjectModal(fileName);
                });
            });
        } catch (error) {
            console.error('Failed to load saved layouts list:', error);
            this.savedLayoutsList.innerHTML = '<div class="loading">Failed to load saved layouts</div>';
        }
    }

    async openTemplatesModal() {
        if (!this.templatesModal) {
            return;
        }
        this.templatesModal.classList.add('active');
        await this.loadTemplateWorkspace();
    }

    async loadTemplateWorkspace() {
        if (this.templatesList) {
            this.templatesList.innerHTML = '<div class="loading">Loading templates...</div>';
        }
        try {
            const [templatesResult, layoutsResult] = await Promise.all([
                this.apiClient.listTemplates(),
                this.apiClient.listSavedLayouts()
            ]);
            this.templates = Array.isArray(templatesResult.data) ? templatesResult.data : [];
            this.savedLayouts = Array.isArray(layoutsResult.data) ? layoutsResult.data : [];
            this.populateTemplateSelects();
            this.renderTemplatesList();
            if (this.selectedTemplate) {
                const refreshed = this.templates.find((item) => item.templateId === this.selectedTemplate.templateId);
                if (refreshed) {
                    this.selectTemplate(refreshed);
                }
            }
        } catch (error) {
            console.error('Failed to load templates:', error);
            if (this.templatesList) {
                this.templatesList.innerHTML = '<div class="loading">Failed to load templates</div>';
            }
            this.showToast(`Failed to load templates: ${error.message}`, 'error');
        }
    }

    populateTemplateSelects() {
        if (this.templateContentTypeSelect) {
            const current = this.templateContentTypeSelect.value || '';
            this.templateContentTypeSelect.innerHTML = '<option value="">Static / Unmapped</option>'
                + this.cmsCollections.map((collection) => {
                    return `<option value="${this.escapeAttribute(collection.slug)}">${this.escapeHtml(collection.name || collection.slug)}</option>`;
                }).join('');
            this.templateContentTypeSelect.value = current;
        }
        if (this.templateLayoutSelect) {
            const current = this.templateLayoutSelect.value || '';
            this.templateLayoutSelect.innerHTML = '<option value="">Choose saved layout</option>'
                + this.savedLayouts.map((layout) => {
                    const label = layout.pageName || layout.fileName;
                    return `<option value="${this.escapeAttribute(layout.fileName)}">${this.escapeHtml(label)} (${this.escapeHtml(layout.fileName)})</option>`;
                }).join('');
            this.templateLayoutSelect.value = current;
        }
    }

    renderTemplatesList() {
        if (!this.templatesList) {
            return;
        }
        const query = (this.templateSearchInput?.value || '').trim().toLowerCase();
        const filter = this.templateTypeFilter?.value || 'all';
        const filtered = this.templates.filter((template) => {
            const text = `${template.label || ''} ${template.templateId || ''} ${template.routePattern || ''} ${template.contentType || ''}`.toLowerCase();
            const matchesQuery = !query || text.includes(query);
            const dynamic = Boolean(template.contentType || String(template.routePattern || '').includes(':'));
            const matchesType = filter === 'all' || (filter === 'dynamic' ? dynamic : !dynamic);
            return matchesQuery && matchesType;
        });

        if (!filtered.length) {
            this.templatesList.innerHTML = '<div class="loading">No page templates found</div>';
            return;
        }

        this.templatesList.innerHTML = `
            <div class="template-table">
                <div class="template-table-row template-table-head">
                    <span>Name</span>
                    <span>Route</span>
                    <span>Content Type</span>
                    <span>Layout</span>
                    <span>Regions</span>
                    <span>Status</span>
                </div>
                ${filtered.map((template) => {
                    const status = template.validation?.status || 'valid';
                    const selected = this.selectedTemplate?.templateId === template.templateId ? ' selected' : '';
                    return `
                        <button type="button" class="template-table-row template-row${selected}" data-template-id="${this.escapeAttribute(template.templateId)}">
                            <span><strong>${this.escapeHtml(template.label || template.templateId)}</strong><small>${this.escapeHtml(template.templateId)}</small></span>
                            <span><code>${this.escapeHtml(template.routePattern || 'Unmapped')}</code></span>
                            <span>${template.contentType ? this.escapeHtml(template.contentType) : '<em>Static</em>'}</span>
                            <span>${this.escapeHtml(template.layoutId || 'Missing')}</span>
                            <span>${Number(template.regionsCount || 0)}</span>
                            <span><mark class="template-status template-status-${status}">${this.escapeHtml(status)}</mark></span>
                        </button>
                    `;
                }).join('')}
            </div>
        `;
    }

    handleTemplateListClick(event) {
        const row = event.target.closest('[data-template-id]');
        if (!row) {
            return;
        }
        const template = this.templates.find((item) => item.templateId === row.dataset.templateId);
        if (template) {
            this.selectTemplate(template);
        }
    }

    createTemplateDraft() {
        const baseId = this.currentPageName || this.pageTitleInput?.value || 'new-template';
        const templateId = this.normalizeTemplateId(baseId);
        const regions = {};
        const defaultBlocks = {};
        this.layoutRegions.forEach((region) => {
            regions[region.id] = { label: region.name, required: Boolean(region.required) };
            const blocks = this.pageComponents
                .filter((item) => this.normalizeRegionId(item.region, 'main') === region.id)
                .map((item, index) => this.serializeBlockInstance(item, index, region.id));
            if (blocks.length) {
                defaultBlocks[region.id] = blocks;
            }
        });
        this.selectTemplate({
            templateId,
            label: this.pageTitleInput?.value || 'New Template',
            description: '',
            routePattern: this.currentPageName ? `/${this.currentPageName}` : '/',
            contentType: '',
            layoutId: this.currentLayoutFileName || this.savedLayouts[0]?.fileName || '',
            regions,
            defaultBlocks,
            lockedRegions: ['header', 'footer'],
            validation: { status: 'warning', warnings: [], errors: [] }
        });
    }

    normalizeTemplateId(value) {
        return String(value || 'template')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/(^-+|-+$)/g, '') || 'template';
    }

    selectTemplate(template) {
        this.selectedTemplate = JSON.parse(JSON.stringify(template));
        if (this.templateEditorEmpty) this.templateEditorEmpty.hidden = true;
        if (this.templateEditor) this.templateEditor.hidden = false;
        if (this.templateEditorTitle) this.templateEditorTitle.textContent = template.label || template.templateId || 'Template';
        if (this.templateIdInput) this.templateIdInput.value = template.templateId || '';
        if (this.templateLabelInput) this.templateLabelInput.value = template.label || '';
        if (this.templateRouteInput) this.templateRouteInput.value = template.routePattern || '';
        this.populateTemplateSelects();
        if (this.templateContentTypeSelect) this.templateContentTypeSelect.value = template.contentType || '';
        if (this.templateLayoutSelect) this.templateLayoutSelect.value = template.layoutId || '';
        this.renderTemplateValidation(template.validation);
        this.renderTemplateRegions(template);
        this.populateTemplatePreviewEntries();
        this.renderTemplatesList();
    }

    renderTemplateValidation(validation = {}) {
        if (!this.templateValidationSummary) {
            return;
        }
        const errors = Array.isArray(validation.errors) ? validation.errors : [];
        const warnings = Array.isArray(validation.warnings) ? validation.warnings : [];
        const status = validation.status || (errors.length ? 'error' : warnings.length ? 'warning' : 'valid');
        const items = [...errors, ...warnings];
        if (!items.length) {
            this.templateValidationSummary.innerHTML = '<div class="template-validation template-validation-valid"><strong>Valid</strong><span>No template validation issues.</span></div>';
            return;
        }
        this.templateValidationSummary.innerHTML = `
            <div class="template-validation template-validation-${status}">
                <strong>${status === 'error' ? 'Template has errors' : 'Template has warnings'}</strong>
                ${items.map((item) => `<span>${this.escapeHtml(item.message || item.code)}</span>`).join('')}
            </div>
        `;
    }

    renderTemplateRegions(template) {
        if (!this.templateRegionList) {
            return;
        }
        const locked = new Set(template.lockedRegions || []);
        const defaultBlocks = template.defaultBlocks || {};
        this.templateRegionList.innerHTML = this.layoutRegions.map((region) => {
            const blocks = Array.isArray(defaultBlocks[region.id]) ? defaultBlocks[region.id] : [];
            return `
                <div class="template-region-card" data-region-id="${region.id}">
                    <div class="template-region-card-head">
                        <div>
                            <strong>${this.escapeHtml(region.name)}</strong>
                            <span>${blocks.length} default block${blocks.length === 1 ? '' : 's'}</span>
                        </div>
                        <label class="checkbox-row">
                            <input type="checkbox" class="template-region-lock" ${locked.has(region.id) ? 'checked' : ''}>
                            <span>Locked</span>
                        </label>
                    </div>
                    <textarea class="template-region-blocks" rows="6" spellcheck="false">${this.escapeHtml(JSON.stringify(blocks, null, 2))}</textarea>
                </div>
            `;
        }).join('');
    }

    readTemplateFromEditor() {
        const regions = {};
        const defaultBlocks = {};
        const lockedRegions = [];
        this.templateRegionList?.querySelectorAll('.template-region-card').forEach((card) => {
            const regionId = card.dataset.regionId;
            const region = this.getRegionDefinition(regionId);
            regions[regionId] = { label: region?.name || regionId, required: Boolean(region?.required) };
            if (card.querySelector('.template-region-lock')?.checked) {
                lockedRegions.push(regionId);
            }
            const raw = card.querySelector('.template-region-blocks')?.value || '[]';
            const parsed = this.parseJsonInput(raw, []);
            if (!Array.isArray(parsed)) {
                throw new Error(`${regionId} default blocks must be an array`);
            }
            defaultBlocks[regionId] = parsed;
        });
        return {
            templateId: this.normalizeTemplateId(this.templateIdInput?.value || ''),
            label: (this.templateLabelInput?.value || '').trim(),
            routePattern: (this.templateRouteInput?.value || '').trim(),
            contentType: this.templateContentTypeSelect?.value || '',
            layoutId: this.templateLayoutSelect?.value || '',
            regions,
            defaultBlocks,
            lockedRegions
        };
    }

    async saveTemplateFromEditor() {
        try {
            const payload = this.readTemplateFromEditor();
            const result = await this.apiClient.saveTemplate(payload);
            const saved = result.data;
            const existingIndex = this.templates.findIndex((item) => item.templateId === saved.templateId);
            if (existingIndex >= 0) {
                this.templates.splice(existingIndex, 1, saved);
            } else {
                this.templates.unshift(saved);
            }
            this.selectTemplate(saved);
            this.showToast('Template saved', 'success');
        } catch (error) {
            console.error('Failed to save template:', error);
            this.showToast(`Template save failed: ${error.message}`, 'error');
        }
    }

    async deleteSelectedTemplate() {
        if (!this.selectedTemplate?.templateId) {
            return;
        }
        if (!confirm(`Delete template "${this.selectedTemplate.label || this.selectedTemplate.templateId}"?`)) {
            return;
        }
        try {
            await this.apiClient.deleteTemplate(this.selectedTemplate.templateId);
            this.templates = this.templates.filter((item) => item.templateId !== this.selectedTemplate.templateId);
            this.selectedTemplate = null;
            if (this.templateEditorEmpty) this.templateEditorEmpty.hidden = false;
            if (this.templateEditor) this.templateEditor.hidden = true;
            this.renderTemplatesList();
            this.showToast('Template deleted', 'success');
        } catch (error) {
            console.error('Failed to delete template:', error);
            this.showToast(`Template delete failed: ${error.message}`, 'error');
        }
    }

    async handleTemplateContentTypeChange() {
        await this.populateTemplatePreviewEntries();
    }

    async populateTemplatePreviewEntries() {
        if (!this.templatePreviewEntrySelect) {
            return;
        }
        const collection = this.templateContentTypeSelect?.value || '';
        if (!collection) {
            this.templatePreviewEntrySelect.innerHTML = '<option value="">Static template</option>';
            return;
        }
        this.templatePreviewEntrySelect.innerHTML = '<option value="">Loading entries...</option>';
        const entries = await this.ensureCmsEntriesLoaded(collection, { force: true });
        this.templatePreviewEntrySelect.innerHTML = '<option value="">First matching entry</option>'
            + entries.map((entry) => `<option value="${this.escapeAttribute(entry.entryKey)}">${this.escapeHtml(this.getCmsEntryLabel(entry))}</option>`).join('');
    }

    async previewSelectedTemplate() {
        if (!this.selectedTemplate?.templateId) {
            this.showToast('Save the template before previewing', 'warning');
            return;
        }
        try {
            const entryKey = this.templatePreviewEntrySelect?.value || '';
            const result = await this.apiClient.previewTemplate(this.selectedTemplate.templateId, { entryKey });
            if (this.previewFrame) {
                this.previewFrame.srcdoc = result.data?.html || '';
            }
            if (this.previewMarkupWrap) this.previewMarkupWrap.hidden = true;
            if (this.previewFrameWrap) this.previewFrameWrap.hidden = false;
            if (this.previewTypeControls) this.previewTypeControls.hidden = true;
            this.previewModal.classList.add('active');
        } catch (error) {
            console.error('Failed to preview template:', error);
            this.showToast(`Template preview failed: ${error.message}`, 'error');
        }
    }

    async openPageFromDashboard(pageName, layoutFileName) {
        this.editingPartialPath = null;
        this.editingLayoutPath = null;
        this.editingLayoutTemplate = null;
        this.editingLayoutBodyPageName = null;
        this.currentPageName = pageName;
        this.pageCreated = true;
        this.pageTitleInput.value = pageName;
        this.currentLayoutFileName = layoutFileName || null;
        this.historyUndo = [];
        this.historyRedo = [];
        this.updateSaveButtonLabel();

        if (layoutFileName) {
            await this.loadLayoutByFileName(layoutFileName, pageName);
            return;
        }

        this.pageComponents = [];
        this.renderCanvasFromState();
        await this.loadPartials();
        this.setBuilderMode('page');
        this.enterBuilder();
        this.showToast('Page opened. Click "Sync Page Partials" to load its current structure.', 'warning');
        this.showToast(`Opened page: ${pageName}`, 'success');
    }

    async syncCurrentPagePartials() {
        if (this.editingLayoutPath) {
            await this.openLayoutInBuilder(this.editingLayoutPath);
            this.showToast('Layout synced', 'success');
            return;
        }
        if (this.editingPartialPath) {
            await this.openPartialInBuilder(this.editingPartialPath);
            this.showToast('Partial synced', 'success');
            return;
        }
        return this.pagesDashboard.syncCurrentPagePartials(this);
    }

    openDeleteProjectModal(target) {
        if (typeof target === 'string') {
            this.pendingDeleteTarget = {
                type: 'layout',
                fileName: target
            };
        } else {
            this.pendingDeleteTarget = target;
        }
        this.deleteProjectName.textContent = this.pendingDeleteTarget?.pageName
            || this.pendingDeleteTarget?.projectName
            || this.pendingDeleteTarget?.fileName
            || '';
        this.deleteProjectModal.classList.add('active');
    }

    closeDeleteProjectModal() {
        this.pendingDeleteTarget = null;
        this.deleteProjectName.textContent = '';
        this.deleteProjectModal.classList.remove('active');
    }

    async confirmDeleteProjectAction() {
        if (!this.pendingDeleteTarget) {
            return;
        }

        this.confirmDeleteProject.disabled = true;
        try {
            const target = this.pendingDeleteTarget;
            let response;
            if (target.type === 'project') {
                response = await fetch('/api/projects', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ projectName: target.projectName })
                });
            } else if (target.type === 'page') {
                response = await fetch('/api/pages', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        projectName: target.projectName,
                        pageName: target.pageName
                    })
                });
            } else {
                response = await fetch('/api/saved-layout', {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ fileName: target.fileName })
                });
            }
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to delete item');
            }

            if (target.type === 'layout' && this.currentLayoutFileName === target.fileName) {
                this.currentLayoutFileName = null;
            }
            if (target.type === 'page' && this.currentPageName === target.pageName) {
                this.currentPageName = null;
                this.pageCreated = false;
                this.updateEditorBreadcrumb();
            }
            if (target.type === 'project' && this.project?.name === target.projectName) {
                this.currentPageName = null;
                this.pageCreated = false;
                this.currentLayoutFileName = null;
                this.updateEditorBreadcrumb();
            }

            this.showToast('Deleted successfully', 'success');
            this.closeDeleteProjectModal();
            await this.loadLandingProjects();

            if (this.loadLayoutModal.classList.contains('active')) {
                await this.loadSavedLayoutsList();
            }
        } catch (error) {
            console.error('Failed to delete project:', error);
            this.showToast(`Delete failed: ${error.message}`, 'error');
        } finally {
            this.confirmDeleteProject.disabled = false;
        }
    }

    async loadLayoutByFileName(fileName, pageNameHint = '') {
        try {
            const response = await fetch(`/api/saved-layout?fileName=${encodeURIComponent(fileName)}`);
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to load layout');
            }

            const layoutData = result.data;
            const layoutItems = layoutData.regions && typeof layoutData.regions === 'object'
                ? this.flattenRegions(layoutData.regions)
                : (layoutData.layout || []);
            const components = await this.buildPageComponentsFromLayout(layoutItems);
            this.pageComponents = components.map((item, index) => this.prepareBlockInstance(item, index));
            this.canvasLayoutMode = layoutData?.meta?.canvasLayoutMode === 'freeform' ? 'freeform' : 'flow';
            this.freeformSectionTemplate = layoutData?.meta?.freeformSectionTemplate || this.freeformSectionTemplate || 'free-layout';
            this.editingPartialPath = null;
            this.editingLayoutPath = null;
            this.editingLayoutTemplate = null;
            this.editingLayoutBodyPageName = null;
            this.historyUndo = [];
            this.historyRedo = [];
            this.renderCanvasFromState();

            this.project = {
                name: this.siteProjectName,
                createdAt: this.project?.createdAt || new Date().toISOString()
            };
            this.pageTitleInput.value = layoutData.pageTitle || layoutData.pageName || this.pageTitleInput.value;
            this.currentLayoutFileName = fileName;
            this.currentPageName = layoutData.pageName || this.pageTitleInput.value;
            this.updateEditorBreadcrumb();
            this.updateSaveButtonLabel();
            this.pageCreated = true;

            await this.loadPartials();
            this.setBuilderMode('page');
            this.setCanvasLayoutMode(this.canvasLayoutMode, { silent: true });

            this.enterBuilder();
            this.hideModal(this.loadLayoutModal);
            this.updateLandingPrimaryAction();
            const displayPageName = this.currentPageName || layoutData.pageName || pageNameHint || this.pageTitleInput.value;
            this.showToast(`Loaded page: ${displayPageName}`, 'success');
        } catch (error) {
            console.error('Failed to load layout:', error);
            this.showToast(`Failed to load layout: ${error.message}`, 'error');
        }
    }

    async buildPageComponentsFromLayout(layoutItems) {
        const components = [];
        for (const [index, item] of layoutItems.entries()) {
            if (item.type === 'view') {
                const prepared = this.prepareBlockInstance(item, index);
                prepared.content = '';
                await this.ensureCmsViewPreviewLoaded(prepared.viewId, prepared.displayId);
                components.push(prepared);
                continue;
            }

            const componentPath = item.componentPath || item.partial;
            const endpoint = item.type === 'layout' ? '/api/layout' : '/api/partial';
            const response = await fetch(`${endpoint}?path=${encodeURIComponent(componentPath)}`);
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || `Failed to load component ${componentPath}`);
            }

            components.push({
                instanceId: item.id || ('instance-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)),
                type: item.type || 'partial',
                componentPath,
                name: item.name || componentPath.split('/').pop().replace('.html', ''),
                props: {
                    ...(item.props || {}),
                    ...(item.cmsBinding ? { cmsBinding: item.cmsBinding } : {}),
                    blockConfig: item.blockConfig || item.props?.blockConfig || {}
                },
                content: result.data,
                children: item.children || {},
                canvas: item.canvas ? this.normalizeCanvasPlacement(item.canvas, index) : null,
                region: this.normalizeRegionId(item.region, this.inferRegionForComponent(componentPath)),
                order: Number.isFinite(Number(item.order)) ? Number(item.order) : index + 1,
                blockConfig: item.blockConfig || item.props?.blockConfig || {},
                visible: item.visible !== false && item.visibility !== 'hidden',
                locked: Boolean(item.locked)
            });
        }
        return components;
    }

    async initMicroComponents() {
        const fallback = [
            {
                id: 'heading',
                name: 'Heading',
                category: 'Text',
                preview: 'Single headline',
                template: '<h2 class="micro-heading">Section heading</h2>',
                defaultProps: { title: 'Section heading' }
            },
            {
                id: 'text-block',
                name: 'Text Block',
                category: 'Text',
                preview: 'Heading + paragraph',
                template: '<section class="micro-text-block"><h3>Text block title</h3><p>Add your copy here.</p></section>',
                defaultProps: { title: 'Text block title', text: 'Add your copy here.' }
            },
            {
                id: 'paragraph',
                name: 'Paragraph',
                category: 'Text',
                preview: 'Body copy',
                template: '<p class="micro-paragraph">Write your paragraph here.</p>',
                defaultProps: { text: 'Write your paragraph here.' }
            },
            {
                id: 'link',
                name: 'Link',
                category: 'Actions',
                preview: 'Inline link',
                template: '<a class="micro-link" href="#">Learn more</a>',
                defaultProps: { linkText: 'Learn more', linkHref: '#' }
            },
            {
                id: 'button',
                name: 'Button',
                category: 'Actions',
                preview: 'Call to action',
                template: '<a class="micro-button" href="#">Call to action</a>',
                defaultProps: { linkText: 'Call to action', linkHref: '#' }
            },
            {
                id: 'textbox',
                name: 'Text Box',
                category: 'Forms',
                preview: 'Single-line input',
                template: '<label class="micro-field"><span class="micro-label">Text box</span><input class="micro-input" type="text" placeholder="Type here"></label>',
                defaultProps: {}
            },
            {
                id: 'textarea',
                name: 'Textarea',
                category: 'Forms',
                preview: 'Multi-line input',
                template: '<label class="micro-field"><span class="micro-label">Message</span><textarea class="micro-textarea" rows="4" placeholder="Write something..."></textarea></label>',
                defaultProps: {}
            },
            {
                id: 'select',
                name: 'Select',
                category: 'Forms',
                preview: 'Dropdown choices',
                template: '<label class="micro-field"><span class="micro-label">Select option</span><select class="micro-select"><option>Option 1</option><option>Option 2</option><option>Option 3</option></select></label>',
                defaultProps: {}
            },
            {
                id: 'checkbox',
                name: 'Checkbox',
                category: 'Forms',
                preview: 'Single checkbox',
                template: '<label class="micro-check"><input class="micro-checkbox" type="checkbox"><span>Accept terms</span></label>',
                defaultProps: {}
            },
            {
                id: 'radio',
                name: 'Radio',
                category: 'Forms',
                preview: 'Single radio',
                template: '<label class="micro-radio"><input class="micro-radio-input" type="radio" name="micro-radio"><span>Radio option</span></label>',
                defaultProps: {}
            },
            {
                id: 'image',
                name: 'Image',
                category: 'Media',
                preview: 'Responsive image',
                template: '<img class="micro-image" src="https://via.placeholder.com/800x450" alt="Placeholder image">',
                defaultProps: { imageSrc: 'https://via.placeholder.com/800x450', imageAlt: 'Placeholder image' }
            },
            {
                id: 'spacer',
                name: 'Spacer',
                category: 'Layout',
                preview: 'Vertical spacing',
                template: '<div class="micro-spacer" style="height: 32px;"></div>',
                defaultProps: {}
            },
            {
                id: 'divider',
                name: 'Divider',
                category: 'Layout',
                preview: 'Horizontal rule',
                template: '<hr class="micro-divider" />',
                defaultProps: {}
            },
            {
                id: 'grid-2col',
                name: 'Grid 2-Column',
                category: 'Layout',
                preview: 'Two column grid',
                template: '<section class="micro-grid-2col" style="display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; align-items: start;"><div class="micro-grid-col"><div class="micro-slot" data-slot="left"></div></div><div class="micro-grid-col"><div class="micro-slot" data-slot="right"></div></div></section>',
                defaultProps: {}
            },
            {
                id: 'grid-3col',
                name: 'Grid 3-Column',
                category: 'Layout',
                preview: 'Three column grid',
                template: '<section class="micro-grid-3col" style="display:grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px; align-items: start;"><div class="micro-grid-col"><div class="micro-slot" data-slot="left"></div></div><div class="micro-grid-col"><div class="micro-slot" data-slot="center"></div></div><div class="micro-grid-col"><div class="micro-slot" data-slot="right"></div></div></section>',
                defaultProps: {}
            },
            {
                id: 'flex-split',
                name: 'Flex Split',
                category: 'Layout',
                preview: 'Left / right split',
                template: '<section class="micro-flex-split" style="display:flex; gap: 24px; align-items: center; justify-content: space-between; flex-wrap: wrap;"><div class="micro-flex-col" style="flex: 1 1 320px;"><div class="micro-slot" data-slot="left"></div></div><div class="micro-flex-col" style="flex: 1 1 320px;"><div class="micro-slot" data-slot="right"></div></div></section>',
                defaultProps: {}
            },
            {
                id: 'stack',
                name: 'Stack',
                category: 'Layout',
                preview: 'Vertical stack',
                template: '<section class="micro-stack" style="display:flex; flex-direction: column; gap: 24px;"><div class="micro-slot" data-slot="stack"></div></section>',
                defaultProps: {}
            },
            {
                id: 'media-text',
                name: 'Media + Text',
                category: 'Layout',
                preview: 'Media and copy',
                template: '<section class="micro-media-text" style="display:grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 24px; align-items: center;"><div class="micro-media"><div class="micro-slot" data-slot="media"></div></div><div class="micro-content"><div class="micro-slot" data-slot="content"></div></div></section>',
                defaultProps: {}
            },
            {
                id: 'hero-split',
                name: 'Hero Split',
                category: 'Layout',
                preview: 'Hero with media',
                template: '<section class="micro-hero-split" style="display:flex; gap: 32px; align-items: center; justify-content: space-between; flex-wrap: wrap;"><div class="micro-hero-content" style="flex: 1 1 360px;"><div class="micro-slot" data-slot="content"></div></div><div class="micro-hero-media" style="flex: 1 1 360px;"><div class="micro-slot" data-slot="media"></div></div></section>',
                defaultProps: {}
            },
            {
                id: 'free-layout',
                name: 'Free Layout',
                category: 'Layout',
                preview: 'Top / left / right / bottom',
                template: '<section class="micro-free-layout" style="display:grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; align-items: start; grid-template-areas: \"top top\" \"left right\" \"bottom bottom\";"><div style="grid-area: top;"><div class="micro-slot" data-slot="top"></div></div><div style="grid-area: left;"><div class="micro-slot" data-slot="left"></div></div><div style="grid-area: right;"><div class="micro-slot" data-slot="right"></div></div><div style="grid-area: bottom;"><div class="micro-slot" data-slot="bottom"></div></div></section>',
                defaultProps: {}
            }
        ].map((item) => ({
            ...item,
            type: 'micro',
            group: item.category || 'Ungrouped'
        }));

        try {
            const result = await this.apiClient.listMicroComponents();
            const items = Array.isArray(result.data) ? result.data : [];
            if (items.length > 0) {
                this.microComponents = items.map((item) => {
                    const name = item.name || item.id || 'Micro Component';
                    const category = item.category || 'Ungrouped';
                    return {
                        ...item,
                        name,
                        category,
                        preview: item.preview || 'No preview available',
                        template: item.template || '',
                        defaultProps: item.defaultProps || {},
                        type: 'micro',
                        group: item.group || category || 'Ungrouped'
                    };
                });
                return;
            }
        } catch (error) {
            console.error('Failed to load micro components:', error);
        }

        this.microComponents = fallback;
    }

    async loadPartials() {
        try {
            this.partialsList.innerHTML = '<div class="loading">Loading components...</div>';
            
            const result = await this.apiClient.listPartials();
            
            const items = Array.isArray(result.data) ? result.data : [];
            this.partials = items.filter((item) => {
                const partialPath = String(item?.path || '');
                return partialPath.endsWith('.html')
                    && !partialPath.includes('..')
                    && !partialPath.startsWith('/')
                    && !partialPath.startsWith('\\');
            });
            this.applyPartialGroups();
            this.updatePaletteFilterOptions();
            this.filterComponents();
        } catch (error) {
            console.error('Error loading partials:', error);
            this.partialsList.innerHTML = '<div class="loading">Error loading components</div>';
            this.showToast('Failed to load components', 'error');
        }
    }

    async loadCmsViews() {
        if (this.viewsList) {
            this.viewsList.innerHTML = '<div class="loading">Loading Views...</div>';
        }
        try {
            const result = await this.apiClient.listCmsViews();
            this.cmsViews = Array.isArray(result?.data) ? result.data.map((view) => ({
                ...view,
                id: view.viewId,
                name: view.label || view.viewId,
                type: 'view',
                group: 'CMS Views',
                path: view.viewId,
                preview: `${view.collection || 'collection'} - ${(view.displays || []).length} display${(view.displays || []).length === 1 ? '' : 's'}`
            })) : [];
            if (this.activePaletteTab === 'views') {
                this.updatePaletteFilterOptions();
                this.filterComponents();
            }
        } catch (error) {
            console.error('Error loading CMS Views:', error);
            this.cmsViews = [];
            if (this.viewsList) {
                this.viewsList.innerHTML = '<div class="loading">Error loading Views</div>';
            }
        }
    }

    applyPartialGroups() {
        this.partials = this.partials.map((partial) => ({
            ...partial,
            group: this.resolvePartialGroup(partial)
        }));
    }

    resolvePartialGroup(partial) {
        const explicit = String(partial?.category || '').trim();
        if (explicit) {
            return explicit;
        }

        const rawPath = String(partial?.path || '');
        const normalized = rawPath.replace(/\\/g, '/').replace(/^\/+/, '');
        if (!normalized) {
            return 'Ungrouped';
        }

        const segments = normalized.split('/');
        if (segments.length <= 1) {
            return 'Ungrouped';
        }

        segments.pop();
        const folder = segments.join('/');
        return folder || 'Ungrouped';
    }

    updatePaletteFilterOptions() {
        if (!this.partialsFilter) {
            return;
        }

        const current = this.partialsFilter.value || 'all';
        const items = this.getActivePaletteItems();
        const groups = Array.from(new Set(items.map((item) => item.group).filter(Boolean)));
        groups.sort((a, b) => {
            if (a === 'Ungrouped') return 1;
            if (b === 'Ungrouped') return -1;
            return String(a).localeCompare(String(b));
        });

        this.partialsFilter.innerHTML = '<option value="all">All categories</option>';
        groups.forEach((group) => {
            const option = document.createElement('option');
            option.value = group;
            option.textContent = group;
            this.partialsFilter.appendChild(option);
        });

        if (current && (current === 'all' || groups.includes(current))) {
            this.partialsFilter.value = current;
        }
    }

    renderPaletteItems(items, options = {}) {
        const listEl = options.listEl || this.partialsList;
        if (!listEl) {
            return;
        }
        const emptyMessage = options.emptyMessage || 'No components match the current search/filter';

        if (!items || items.length === 0) {
            listEl.innerHTML = `<div class="loading">${emptyMessage}</div>`;
            return;
        }

        const sorted = [...items].sort((a, b) => {
            const byCategory = String(a.group || '').localeCompare(String(b.group || ''));
            if (byCategory !== 0) return byCategory;
            return String(a.name || '').localeCompare(String(b.name || ''));
        });

        const grouped = new Map();
        sorted.forEach((item) => {
            const groupName = item.group || 'Ungrouped';
            if (!grouped.has(groupName)) {
                grouped.set(groupName, []);
            }
            grouped.get(groupName).push(item);
        });

        const groupNames = Array.from(grouped.keys()).sort((a, b) => {
            if (a === 'Ungrouped') return 1;
            if (b === 'Ungrouped') return -1;
            return String(a).localeCompare(String(b));
        });

        let html = '';
        groupNames.forEach((groupName) => {
            html += `<div class="component-group-title" data-group="${groupName}">${groupName}</div>`;
            grouped.get(groupName).forEach((item) => {
                html += this.createPaletteItem(item);
            });
        });

        listEl.innerHTML = html;

        if (options.allowActions) {
            this.bindPartialCodeButtons(listEl);
            this.bindPartialPreviewButtons(listEl);
        }

        const sortable = options.sortable
            || (listEl === this.viewsList ? this.viewsSortable : (listEl === this.partialsList ? this.partialsSortable : this.microSortable));
        if (sortable) {
            sortable.option('disabled', false);
        }
    }

    createPaletteItem(item) {
        if (item.type === 'micro') {
            const preview = item.preview && item.preview.trim().length > 0
                ? item.preview
                : 'No preview available';
            const draggableAttr = this.canvasLayoutMode === 'freeform' ? 'true' : 'false';
            const allowedRegions = this.getAllowedRegionsForComponent(item.id, 'micro').join(',');
            return `
                <div class="component-item" draggable="${draggableAttr}" data-type="micro" data-path="${item.id}" data-id="${item.id}" data-allowed-regions="${allowedRegions}">
                    <i class="fas fa-cube"></i>
                    <div class="component-meta">
                        <span class="component-name">${item.name}</span>
                        <span class="component-preview">${preview}</span>
                    </div>
                </div>
            `;
        }

        if (item.type === 'view') {
            const displays = Array.isArray(item.displays) ? item.displays : [];
            const blockDisplays = displays.filter((display) => (display.type || 'block') === 'block');
            const defaultDisplay = blockDisplays[0] || displays[0] || {};
            const preview = item.preview && item.preview.trim().length > 0
                ? item.preview
                : 'CMS View block';
            return `
                <div class="component-item" draggable="false" data-type="view" data-path="${this.escapeAttribute(item.viewId)}" data-id="${this.escapeAttribute(item.viewId)}" data-display-id="${this.escapeAttribute(defaultDisplay.displayId || '')}" data-allowed-regions="main,side-navigation,content-above,content-below,hero">
                    <i class="fas fa-table-list"></i>
                    <div class="component-meta">
                        <span class="component-name">${this.escapeHtml(item.name || item.viewId)}</span>
                        <span class="component-preview">${this.escapeHtml(preview)}</span>
                    </div>
                </div>
            `;
        }

        return this.createComponentItem(item);
    }

    bindPartialCodeButtons(root = this.partialsList) {
        if (!root) return;
        root.querySelectorAll('.component-view-code').forEach((button) => {
            button.addEventListener('mousedown', (e) => e.stopPropagation());
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const partialPath = e.currentTarget.dataset.path;
                await this.openPartialCodeModal(partialPath);
            });
        });
    }

    bindPartialPreviewButtons(root = this.partialsList) {
        if (!root) return;
        root.querySelectorAll('.component-view-preview').forEach((button) => {
            button.addEventListener('mousedown', (e) => e.stopPropagation());
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const partialPath = e.currentTarget.dataset.path;
                await this.openPartialPreviewModal(partialPath);
            });
        });
    }

    async openPartialCodeModal(partialPath) {
        if (!partialPath) {
            return;
        }

        this.currentPartialCodePath = partialPath;
        this.partialCodeTitle.textContent = `Edit Partial: ${partialPath}`;
        if (this.partialCodeOutput) {
            this.partialCodeOutput.value = 'Loading...';
        }
        this.partialCodeModal.classList.add('active');

        try {
            const result = await this.apiClient.getPartial(partialPath);
            if (this.partialCodeOutput) {
                this.partialCodeOutput.value = result.data || '';
            }
        } catch (error) {
            console.error('Failed to load partial code:', error);
            if (this.partialCodeOutput) {
                this.partialCodeOutput.value = `Error: ${error.message}`;
            }
        }
    }

    async openCanvasComponentCode(instanceId) {
        const item = this.findComponentById(instanceId);
        if (!item) {
            this.showToast('Component not found', 'warning');
            return;
        }
        if (item.type !== 'partial' || !item.componentPath) {
            this.showToast('Code editing is available for partial components only', 'warning');
            return;
        }
        this.selectCanvasItem(instanceId);
        await this.openPartialCodeModal(item.componentPath);
    }

    async openPartialInBuilder(partialPath) {
        if (!partialPath) {
            return;
        }

        try {
            const instance = await this.createComponentInstance('partial', partialPath);
            this.editingLayoutPath = null;
            this.editingLayoutTemplate = null;
            this.editingLayoutBodyPageName = null;
            this.editingPartialPath = partialPath;
            this.pageCreated = true;
            this.currentPageName = null;
            this.currentLayoutFileName = null;
            this.historyUndo = [];
            this.historyRedo = [];
            this.pageComponents = [instance];
            if (this.pageTitleInput) {
                const name = partialPath.split('/').pop().replace('.html', '');
                this.pageTitleInput.value = name;
            }
            this.setBuilderMode('page');
            this.enterBuilder();
            await this.loadPartials();
            this.updateEditorBreadcrumb();
            this.updateSaveButtonLabel();
            this.renderCanvasFromState();
            this.showToast(`Editing partial: ${partialPath}`, 'success');
        } catch (error) {
            console.error('Failed to open partial in builder:', error);
            this.showToast(`Failed to open partial: ${error.message}`, 'error');
        }
    }

    extractPartialTokensFromHtml(html) {
        if (!html || typeof html !== 'string') {
            return [];
        }
        const tokens = [];
        const regex = /<!--\s*partial:\s*([^>]+?)\s*-->|{{>\s*([a-zA-Z0-9_./-]+)\s*}}/g;
        let match = null;
        while ((match = regex.exec(html)) !== null) {
            const token = String(match[1] || match[2] || '').trim();
            if (token) {
                tokens.push(token);
            }
        }
        return tokens;
    }

    buildPartialLookup() {
        const lookup = new Map();
        (this.partials || []).forEach((item) => {
            const raw = String(item?.path || '').replace(/\\/g, '/').replace(/^\/+/, '');
            if (!raw) return;
            const noExt = raw.replace(/\.html$/i, '');
            const base = noExt.split('/').pop();
            const keys = [raw, noExt, base, `${base}.html`];
            keys.forEach((key) => {
                if (key && !lookup.has(key)) {
                    lookup.set(key, raw);
                }
            });
        });
        return lookup;
    }

    resolvePartialTokenToPath(token, lookup) {
        const normalized = String(token || '').trim().replace(/\\/g, '/');
        if (!normalized) return null;
        const base = normalized.split('/').pop();
        const candidates = [
            normalized,
            normalized.replace(/\.html$/i, ''),
            normalized.replace(/\.html$/i, '') + '.html',
            base,
            base.replace(/\.html$/i, ''),
            base.replace(/\.html$/i, '') + '.html'
        ];
        for (const candidate of candidates) {
            if (lookup.has(candidate)) {
                return lookup.get(candidate);
            }
        }
        return null;
    }

    extractLayoutMainHtml(layoutHtml) {
        const regex = /(<main\b[^>]*>)([\s\S]*?)(<\/main>)/i;
        const match = layoutHtml.match(regex);
        if (!match) {
            return { html: '', hasMain: false };
        }
        return { html: match[2] || '', hasMain: true };
    }

    async buildComponentsFromLayoutMain(mainHtml) {
        const components = [];
        const tokens = this.extractPartialTokensFromHtml(mainHtml);
        const stripped = String(mainHtml || '')
            .replace(/<!--\s*partial:\s*[^>]+?\s*-->/g, '')
            .replace(/{{>\s*[a-zA-Z0-9_./-]+\s*}}/g, '')
            .trim();
        if (tokens.length > 0) {
            const lookup = this.buildPartialLookup();
            for (const token of tokens) {
                const resolved = this.resolvePartialTokenToPath(token, lookup);
                if (!resolved) continue;
                try {
                    const instance = await this.createComponentInstance('partial', resolved);
                    components.push(instance);
                } catch (error) {
                    console.warn('Failed to load partial for layout:', token, error);
                }
            }
        }

        if (components.length === 0 && stripped) {
            components.push({
                instanceId: this.generateInstanceId(),
                type: 'layout',
                componentPath: this.editingLayoutPath || 'layout',
                name: 'Layout Main',
                props: {},
                content: mainHtml,
                children: {}
            });
        }

        if (components.length === 0 && !stripped && tokens.length > 0) {
            components.push({
                instanceId: this.generateInstanceId(),
                type: 'layout',
                componentPath: this.editingLayoutPath || 'layout',
                name: 'Main Section',
                props: { isLayoutPlaceholder: true },
                content: '<div style="border:1px dashed #64748b; padding:16px; border-radius:12px; font-size:12px; color:#94a3b8;">Main section placeholder ({{&gt; body}}). Drag sections into the canvas to replace it.</div>',
                children: {}
            });
        }

        return components;
    }

    async loadBodyComponentsFromPage(pageName) {
        const safeName = (pageName || '').trim();
        if (!safeName) {
            return [];
        }
        try {
            const result = await this.apiClient.getPagePartials(this.siteProjectName, safeName);
            const partialPaths = Array.isArray(result?.data?.partials) ? result.data.partials : [];
            const instances = [];
            for (const componentPath of partialPaths) {
                try {
                    const instance = await this.createComponentInstance('partial', componentPath);
                    instances.push(instance);
                } catch (error) {
                    console.warn('Failed to load body partial:', componentPath, error);
                }
            }
            return instances;
        } catch (error) {
            console.error('Failed to load page body:', error);
            return [];
        }
    }

    removeLayoutPlaceholders() {
        if (!this.editingLayoutPath) {
            return;
        }
        const next = (this.pageComponents || []).filter((item) => !item?.props?.isLayoutPlaceholder);
        if (next.length !== (this.pageComponents || []).length) {
            this.pageComponents = next;
        }
    }

    buildLayoutDataFromComponents(components = [], pageName = '') {
        const safeName = String(pageName || '').trim() || 'page';
        const now = new Date().toISOString();
        return {
            project: this.project,
            pageName: safeName,
            pageTitle: safeName,
            createdAt: now,
            meta: {
                version: 1,
                updatedAt: now,
                canvasLayoutMode: this.canvasLayoutMode,
                freeformSectionTemplate: this.freeformSectionTemplate
            },
            layout: components.map((item, index) => ({
                id: item.instanceId || this.generateInstanceId(),
                order: index + 1,
                type: item.type,
                partial: item.componentPath,
                componentPath: item.componentPath,
                name: item.name,
                props: item.props || {},
                children: item.children || {},
                canvas: this.canvasLayoutMode === 'freeform' ? this.normalizeCanvasPlacement(item.canvas, index) : null,
                renderedContent: this.getRenderedComponentContent(item)
            }))
        };
    }

    async openLayoutInBuilder(layoutPath) {
        if (!layoutPath) {
            return;
        }

        try {
            await this.loadPartials();
            const result = await this.apiClient.getLayout(layoutPath);
            const layoutHtml = result?.data || '';
            const { html: mainHtml, hasMain } = this.extractLayoutMainHtml(layoutHtml);
            const usesBodyPlaceholder = /{{>\s*body\s*}}|<!--\s*partial:\s*body\s*-->/i.test(mainHtml || "");

            this.editingLayoutPath = layoutPath;
            this.editingLayoutTemplate = layoutHtml;
            this.editingLayoutHasMain = hasMain;
            this.editingPartialPath = null;
            this.editingLayoutBodyPageName = usesBodyPlaceholder ? 'index' : null;

            let components = [];
            if (usesBodyPlaceholder) {
                const layoutTokens = this.extractPartialTokensFromHtml(layoutHtml);
                const lookup = this.buildPartialLookup();
                const bodyComponents = await this.loadBodyComponentsFromPage(this.editingLayoutBodyPageName);
                const bodyFallback = bodyComponents.length > 0 ? bodyComponents : [
                    {
                        instanceId: this.generateInstanceId(),
                        type: 'layout',
                        componentPath: 'layout/body',
                        name: 'Main Section',
                        props: { isLayoutPlaceholder: true },
                        content: '<div style="border:1px dashed #64748b; padding:16px; border-radius:12px; font-size:12px; color:#94a3b8;">Main section placeholder ({{&gt; body}}). Drag sections into the canvas to replace it.</div>',
                        children: {}
                    }
                ];

                for (const token of layoutTokens) {
                    if (!token) continue;
                    if (token.toLowerCase() === 'body') {
                        components.push(...bodyFallback);
                        continue;
                    }
                    const resolved = this.resolvePartialTokenToPath(token, lookup);
                    if (!resolved) {
                        continue;
                    }
                    const instance = await this.createComponentInstance('partial', resolved);
                    instance.props = { ...(instance.props || {}), isLayoutContext: true, layoutSlot: token };
                    components.push(instance);
                }
            } else {
                components = await this.buildComponentsFromLayoutMain(mainHtml);
                this.editingLayoutBodyPageName = null;
            }
            this.pageCreated = true;
            this.currentPageName = null;
            this.currentLayoutFileName = null;
            this.historyUndo = [];
            this.historyRedo = [];
            this.pageComponents = components;

            if (this.pageTitleInput) {
                const name = layoutPath.split('/').pop().replace('.html', '');
                this.pageTitleInput.value = name;
            }

            this.setBuilderMode('page');
            this.enterBuilder();
            this.updateEditorBreadcrumb();
            this.updateSaveButtonLabel();
            this.renderCanvasFromState();
            this.showToast(`Layout loaded: ${layoutPath}`, 'success');
        } catch (error) {
            console.error('Failed to open layout in builder:', error);
            this.showToast(`Failed to load layout: ${error.message}`, 'error');
        }
    }

    async saveEditingLayout() {
        const layoutPath = this.editingLayoutPath;
        if (!layoutPath) {
            return;
        }

        if (this.editingLayoutBodyPageName) {
            await this.saveLayoutBodyPage();
            return;
        }

        const template = this.editingLayoutTemplate || '';
        let bodyHtml = this.pageComponents
            .filter((item) => !item?.props?.isLayoutPlaceholder)
            .map((item) => this.getRenderedComponentContent(item, { forCanvas: false }))
            .join('\n');
        if (!bodyHtml.trim() && template) {
            const existing = this.extractLayoutMainHtml(template);
            if (existing.html && existing.html.trim()) {
                bodyHtml = existing.html;
            }
        }
        let nextHtml = template;
        const mainRegex = /(<main\b[^>]*>)([\s\S]*?)(<\/main>)/i;
        if (mainRegex.test(template)) {
            nextHtml = template.replace(mainRegex, `$1\n${bodyHtml}\n$3`);
        } else if (template.includes('{{> body}}')) {
            nextHtml = template.replace('{{> body}}', bodyHtml);
        } else if (template.trim().length > 0) {
            nextHtml = template + `\\n${bodyHtml}`;
        } else {
            nextHtml = bodyHtml;
        }

        try {
            await this.apiClient.saveLayoutFile(layoutPath, nextHtml, true);
            this.editingLayoutTemplate = nextHtml;
            await this.loadPartials();
            if (typeof this.pagesDashboard.loadLandingLayouts === 'function') {
                await this.pagesDashboard.loadLandingLayouts(this);
            }
            this.showToast(`Layout saved: ${layoutPath}`, 'success');
        } catch (error) {
            console.error('Failed to save layout:', error);
            this.showToast(`Failed to save layout: ${error.message}`, 'error');
        }
    }

    async saveLayoutBodyPage() {
        const pageName = this.editingLayoutBodyPageName;
        if (!pageName) {
            return;
        }

        const components = (this.pageComponents || [])
            .filter((item) => !item?.props?.isLayoutPlaceholder)
            .filter((item) => !item?.props?.isLayoutContext);

        if (components.length === 0) {
            this.showToast('Add sections before saving', 'warning');
            return;
        }

        try {
            await this.syncPageComponentPartials(components);
        } catch (error) {
            console.error('Failed to sync page partials before saving layout body:', error);
            this.showToast(`Failed to sync partials: ${error.message}`, 'error');
            return;
        }

        const layoutData = this.buildLayoutDataFromComponents(components, pageName);
        const layoutFileName = `${pageName}-layout.json`;

        try {
            const response = await fetch('/api/save-layout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    layoutData,
                    pageName,
                    overwrite: true,
                    saveAs: false,
                    layoutFileName
                })
            });
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to save page body');
            }
            this.showToast(`Main saved to ${pageName}.html`, 'success');
        } catch (error) {
            console.error('Failed to save layout body page:', error);
            this.showToast(`Failed to save main: ${error.message}`, 'error');
        }
    }

    async syncPageComponentPartials(components = []) {
        const syncTargets = new Map();
        (components || [])
            .filter((item) => item && !item?.props?.isLayoutPlaceholder && !item?.props?.isLayoutContext)
            .forEach((item) => {
                const partialPath = item.componentPath || item.partial;
                if (!partialPath) {
                    return;
                }
                const html = this.getRenderedComponentContent(item, { forCanvas: false });
                syncTargets.set(partialPath, html);
            });

        for (const [partialPath, html] of syncTargets.entries()) {
            await this.apiClient.savePartial(partialPath, html, true);
        }
    }

    async saveEditingPartial() {
        const partialPath = this.editingPartialPath;
        if (!partialPath) {
            return;
        }
        const instance = this.pageComponents?.[0];
        if (!instance) {
            this.showToast('No partial loaded', 'warning');
            return;
        }

        const html = this.getRenderedComponentContent(instance, { forCanvas: false });

        try {
            await this.apiClient.savePartial(partialPath, html, true);
            instance.content = html;
            instance.props = {};
            instance.children = {};
            this.renderCanvasFromState();
            await this.loadPartials();
            if (typeof this.pagesDashboard.loadLandingLandmarks === 'function') {
                await this.pagesDashboard.loadLandingLandmarks(this);
            }
            this.showToast(`Partial saved: ${partialPath}`, 'success');
        } catch (error) {
            console.error('Failed to save partial:', error);
            this.showToast(`Failed to save partial: ${error.message}`, 'error');
        }
    }

    async savePartialCode() {
        if (!this.currentPartialCodePath) {
            this.showToast('No partial selected', 'warning');
            return;
        }
        if (!this.partialCodeOutput) {
            this.showToast('Partial editor not ready', 'warning');
            return;
        }

        const content = this.partialCodeOutput.value || '';
        if (this.savePartialCodeButton) {
            this.savePartialCodeButton.disabled = true;
        }

        try {
            await this.apiClient.savePartial(this.currentPartialCodePath, content, true);
            const pageUpdated = this.updatePartialContentInTree(this.currentPartialCodePath, content, this.pageComponents);
            const partialUpdated = this.updatePartialContentInTree(this.currentPartialCodePath, content, this.partialComponents);
            if (pageUpdated || partialUpdated) {
                this.renderCanvasFromState();
                this.updateCanvasState();
                this.refreshLivePreview();
            }
            await this.loadPartials();
            if (typeof this.pagesDashboard.loadLandingLandmarks === 'function') {
                await this.pagesDashboard.loadLandingLandmarks(this);
            }
            this.showToast(`Partial saved: ${this.currentPartialCodePath}`, 'success');
        } catch (error) {
            console.error('Failed to save partial:', error);
            this.showToast(`Failed to save partial: ${error.message}`, 'error');
        } finally {
            if (this.savePartialCodeButton) {
                this.savePartialCodeButton.disabled = false;
            }
        }
    }

    async openPartialPreviewModal(partialPath) {
        if (!partialPath) {
            return;
        }

        this.partialPreviewTitle.textContent = `Partial Preview: ${partialPath}`;
        this.partialPreviewFrame.srcdoc = '<div style="font-family: Inter, sans-serif; padding: 16px;">Loading preview...</div>';
        this.partialPreviewModal.classList.add('active');

        try {
            const [partialResult, stylesResult] = await Promise.all([
                this.apiClient.getPartial(partialPath),
                this.apiClient.getPreviewStyles()
            ]);
            const css = stylesResult?.data?.css || '';
            const html = partialResult.data || '';
            this.partialPreviewFrame.srcdoc = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>${css}</style>
                    <style>
                        /* Ensure reveal/animation placeholders are visible in preview. */
                        .reveal { opacity: 1 !important; transform: none !important; }
                        [data-reveal], .js-reveal { opacity: 1 !important; transform: none !important; }
                    </style>
                </head>
                <body>${html}</body>
                </html>
            `;
        } catch (error) {
            console.error('Failed to load partial preview:', error);
            this.partialPreviewFrame.srcdoc = `<div style="font-family: Inter, sans-serif; padding: 16px;">Error: ${error.message}</div>`;
        }
    }

    createComponentItem(partial) {
        const preview = partial.preview && partial.preview.trim().length > 0
            ? partial.preview
            : 'No preview available';
        const draggableAttr = this.canvasLayoutMode === 'freeform' ? 'true' : 'false';
        const allowedRegions = this.getAllowedRegionsForComponent(partial.path, 'partial').join(',');
        return `
            <div class="component-item" draggable="${draggableAttr}" data-type="partial" data-path="${partial.path}" data-id="${partial.id}" data-allowed-regions="${allowedRegions}">
                <i class="fas fa-puzzle-piece"></i>
                <div class="component-meta">
                    <span class="component-name">${partial.name}</span>
                    <span class="component-preview">${preview}</span>
                </div>
                <button type="button" class="component-folder component-view-code" data-path="${partial.path}" title="View Partial Code">
                    <i class="fab fa-html5" aria-hidden="true"></i>
                </button>
                <button type="button" class="component-folder component-view-preview" data-path="${partial.path}" title="Preview Partial">
                    <i class="fas fa-eye" aria-hidden="true"></i>
                </button>
            </div>
        `;
    }

    updatePartialContentInTree(partialPath, content, components = []) {
        if (!partialPath || !Array.isArray(components)) {
            return false;
        }

        let updated = false;
        components.forEach((item) => {
            if (!item || typeof item !== 'object') {
                return;
            }

            if (item.type === 'partial' && item.componentPath === partialPath) {
                item.content = content;
                updated = true;
            }

            if (item.children && typeof item.children === 'object') {
                Object.values(item.children).forEach((list) => {
                    if (Array.isArray(list) && this.updatePartialContentInTree(partialPath, content, list)) {
                        updated = true;
                    }
                });
            }
        });

        return updated;
    }

    setBuilderMode(mode) {
        if (mode !== 'page' && mode !== 'partial') {
            return;
        }

        this.builderMode = mode;
        const isPageMode = mode === 'page';
        if (!isPageMode) {
            this.activePaletteTab = 'micro';
        } else if (this.activePaletteTab === 'micro') {
            this.activePaletteTab = 'partials';
        }
        const isViewsPalette = isPageMode && this.activePaletteTab === 'views';

        if (this.partialsTab) {
            this.partialsTab.classList.toggle('active', isPageMode && !isViewsPalette);
        }
        if (this.microTab) {
            this.microTab.classList.toggle('active', !isPageMode);
        }
        if (this.viewsTab) {
            this.viewsTab.classList.toggle('active', isViewsPalette);
        }
        if (this.partialsList) {
            this.partialsList.classList.toggle('active', isPageMode && !isViewsPalette);
        }
        if (this.microList) {
            this.microList.classList.toggle('active', !isPageMode);
        }
        if (this.viewsList) {
            this.viewsList.classList.toggle('active', isViewsPalette);
        }
        if (this.microQuickFilters) {
            this.microQuickFilters.style.display = isPageMode ? 'none' : '';
        }
        if (this.sidebarTitle) {
            this.sidebarTitle.textContent = isViewsPalette ? 'CMS Views' : (isPageMode ? 'Theme Partials' : 'Theme Components');
        }
        if (this.canvasModeLabel) {
            this.canvasModeLabel.textContent = isPageMode ? 'Canvas' : 'Partial Canvas';
        }
        if (this.searchInput) {
            this.searchInput.placeholder = isViewsPalette ? 'Search Views...' : (isPageMode ? 'Search components...' : 'Search micro components...');
        }
        if (this.syncPagePartials) {
            const showSync = isPageMode;
            this.syncPagePartials.style.display = showSync ? '' : 'none';
            const label = this.syncPagePartials.querySelector('span');
            if (this.editingPartialPath) {
                if (label) label.textContent = 'Sync Landmark';
                this.syncPagePartials.title = 'Sync landmark partial from codebase';
            } else if (this.editingLayoutPath) {
                if (label) label.textContent = 'Sync Layout';
                this.syncPagePartials.title = 'Sync layout sections';
            } else {
                if (label) label.textContent = 'Sync Page Partials';
                this.syncPagePartials.title = 'Sync partials used by this page';
            }
        }
        if (this.pageTitleInput) {
            this.pageTitleInput.placeholder = isPageMode ? 'Enter page title...' : 'Enter partial name...';
        }
        this.updateSaveButtonLabel();
        this.updateWorkspaceStatus();
        if (this.canvasEmpty) {
            const title = this.canvasEmpty.querySelector('h4');
            const description = this.canvasEmpty.querySelector('p');
            if (title) {
                title.textContent = isPageMode
                    ? (this.canvasLayoutMode === 'freeform' ? 'Drop To Create Section' : 'Drop Components Here')
                    : 'Build Partial Here';
            }
            if (description) {
                description.textContent = isPageMode
                    ? (this.canvasLayoutMode === 'freeform'
                        ? 'Drag a component to auto-create a grid or flex section that keeps content attached to that section'
                        : (isViewsPalette ? 'Drag Views from the sidebar to place CMS displays' : 'Drag partials from the sidebar to start building your page'))
                    : 'Drag micro components from the sidebar to assemble a partial';
            }
        }

        if (this.btnSave) this.btnSave.disabled = false;
        if (this.btnLoadLayout) this.btnLoadLayout.disabled = !isPageMode;
        if (this.btnClosePage) this.btnClosePage.disabled = !isPageMode;
        if (this.btnSave) {
            const saveLabel = this.btnSave.querySelector('span');
            if (saveLabel) {
                saveLabel.textContent = isPageMode ? 'Save' : 'Save Partial';
            }
            this.btnSave.title = isPageMode ? 'Save Layout' : 'Save Partial';
        }

        this.hidePropertiesPanel();
        this.hideInspectorPanel();

        if (this.editorCanvas && typeof this.editorCanvas.updateInteractionMode === 'function') {
            this.editorCanvas.updateInteractionMode(this);
        } else {
            if (this.partialsSortable) {
                this.partialsSortable.option('disabled', !isPageMode);
            }
            if (this.microSortable) {
                this.microSortable.option('disabled', isPageMode);
            }
            if (this.viewsSortable) {
                this.viewsSortable.option('disabled', !isViewsPalette);
            }
        }

        this.updateCanvasDragHandle();

        this.updatePaletteFilterOptions();
        this.filterComponents();
        this.renderCanvasFromState();
        this.updateCanvasState();
        this.refreshLivePreview();
    }

      getActiveComponents() {
          return this.builderMode === 'partial' ? this.partialComponents : this.pageComponents;
      }

      countComponents(components = []) {
          let count = 0;
          components.forEach((item) => {
              count += 1;
              if (item?.children && typeof item.children === 'object') {
                  Object.values(item.children).forEach((list) => {
                      if (Array.isArray(list)) {
                          count += this.countComponents(list);
                      }
                  });
              }
          });
          return count;
      }

      generateInstanceId() {
          return `instance-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      }

      getDefaultCanvasPlacement(index = 0, element = null) {
          const width = Math.max(280, Math.round(element?.getBoundingClientRect?.().width || 320));
          const column = index % 3;
          const row = Math.floor(index / 3);
          return {
              x: 24 + column * 72,
              y: 24 + row * 72,
              width
          };
      }

      getApproximateCanvasItemHeight(item) {
          if (!item) {
              return 220;
          }
          if (item.componentPath && this.partialHeightCache[item.componentPath]) {
              return this.partialHeightCache[item.componentPath];
          }
          const children = item.children && typeof item.children === 'object'
              ? Object.values(item.children).flat().length
              : 0;
          return 180 + (children * 40);
      }

      normalizeCanvasPlacement(canvas, index = 0) {
          const fallback = this.getDefaultCanvasPlacement(index);
          return {
              x: Number.isFinite(Number(canvas?.x)) ? Math.max(0, Math.round(Number(canvas.x))) : fallback.x,
              y: Number.isFinite(Number(canvas?.y)) ? Math.max(0, Math.round(Number(canvas.y))) : fallback.y,
              width: Number.isFinite(Number(canvas?.width)) ? Math.max(220, Math.round(Number(canvas.width))) : fallback.width
          };
      }

      getLayoutSlotNamesForItem(item) {
          if (!item?.content) {
              return [];
          }
          const wrapper = document.createElement('div');
          wrapper.innerHTML = item.content;
          return Array.from(wrapper.querySelectorAll('.micro-slot[data-slot]'))
              .map((slot) => slot.dataset.slot || 'default')
              .filter(Boolean);
      }

      getPreferredSectionSlot(item, childType = 'partial', childPath = '') {
          const slots = this.getLayoutSlotNamesForItem(item);
          if (slots.length === 0) {
              return null;
          }
          const lowerPath = String(childPath || '').toLowerCase();
          const wantsMedia = childType === 'partial'
              ? /(gallery|image|media|hero|banner|cover)/.test(lowerPath)
              : childPath === 'image';
          const wantsContent = !wantsMedia;

          const preferred = [];
          if (wantsMedia) {
              preferred.push('media', 'right', 'center', 'left', 'top', 'bottom', 'content', 'stack');
          }
          if (wantsContent) {
              preferred.push('content', 'left', 'top', 'right', 'center', 'bottom', 'stack', 'media');
          }
          preferred.push(...slots);

          for (const slotName of preferred) {
              if (!slots.includes(slotName)) {
                  continue;
              }
              const children = Array.isArray(item?.children?.[slotName]) ? item.children[slotName] : [];
              if (children.length === 0) {
                  return slotName;
              }
          }

          return slots[0];
      }

      findReusableFreeformSection(templateId = this.freeformSectionTemplate, childType = 'partial', childPath = '') {
          const components = this.getActiveComponents();
          const candidates = [...components].reverse();
          for (const item of candidates) {
              if (item?.type !== 'micro' || item?.componentPath !== templateId) {
                  continue;
              }
              if (!item?.props?.isAutoSection) {
                  continue;
              }
              const slotName = this.getPreferredSectionSlot(item, childType, childPath);
              if (!slotName) {
                  continue;
              }
              const children = Array.isArray(item?.children?.[slotName]) ? item.children[slotName] : [];
              const slotNames = this.getLayoutSlotNamesForItem(item);
              const canAppendToSameSlot = slotNames.length === 1 && slotNames[0] === slotName;
              if (children.length === 0 || canAppendToSameSlot) {
                  return { item, slotName };
              }
          }
          return null;
      }

      async addComponentToAutoSection(type, componentPath) {
          const reusable = this.findReusableFreeformSection(this.freeformSectionTemplate, type, componentPath);
          if (reusable?.item && reusable.slotName) {
              this.pushHistory();
              const instance = await this.createComponentInstance(type, componentPath);
              if (!Array.isArray(reusable.item.children[reusable.slotName])) {
                  reusable.item.children[reusable.slotName] = [];
              }
              reusable.item.children[reusable.slotName].push(instance);
              this.renderCanvasFromState();
              this.refreshLivePreview();
              return reusable.item;
          }

          this.pushHistory();
          const section = await this.createComponentInstance('micro', this.freeformSectionTemplate);
          section.name = `${section.name} Section`;
          section.props = {
              ...(section.props || {}),
              isAutoSection: true,
              layoutGap: section.props?.layoutGap || 24,
              layoutPadding: section.props?.layoutPadding || 24
          };
          const slotName = this.getPreferredSectionSlot(section, type, componentPath) || this.getLayoutSlotNamesForItem(section)[0];
          if (slotName) {
              section.children = section.children || {};
              if (!Array.isArray(section.children[slotName])) {
                  section.children[slotName] = [];
              }
              const instance = await this.createComponentInstance(type, componentPath);
              section.children[slotName].push(instance);
          }
          this.getActiveComponents().push(section);
          this.renderCanvasFromState();
          this.refreshLivePreview();
          return section;
      }

      async createComponentInstance(type, componentPath) {
          if (type === 'view') {
              const view = this.cmsViews.find((item) => item.viewId === componentPath) || null;
              const displays = Array.isArray(view?.displays) ? view.displays : [];
              const display = displays.find((item) => (item.type || 'block') === 'block') || displays[0] || {};
              const instance = {
                  instanceId: this.generateInstanceId(),
                  type: 'view',
                  componentPath: `view:${componentPath}`,
                  partial: `view:${componentPath}`,
                  viewId: componentPath,
                  displayId: display.displayId || '',
                  name: view?.label || componentPath,
                  props: {
                      viewId: componentPath,
                      displayId: display.displayId || '',
                      config: {},
                      visibility: 'visible'
                  },
                  blockConfig: {},
                  config: {},
                  visibility: 'visible',
                  content: '',
                  children: {},
                  region: 'main',
                  visible: true
              };
              await this.ensureCmsViewPreviewLoaded(instance.viewId, instance.displayId);
              return instance;
          }

          if (type === 'partial') {
              const result = await this.apiClient.getPartial(componentPath);
              const defaultCmsBinding = this.getDefaultCmsBindingForComponent(componentPath);
              return {
                  instanceId: this.generateInstanceId(),
                  type,
                  componentPath,
                  name: componentPath.split('/').pop().replace('.html', ''),
                  props: defaultCmsBinding ? { cmsBinding: defaultCmsBinding } : {},
                  content: result.data,
                  children: {},
                  canvas: null,
                  region: this.inferRegionForComponent(componentPath),
                  order: this.getActiveComponents().length + 1,
                  blockConfig: {},
                  visible: true,
                  locked: false
              };
          }

          if (type === 'micro') {
              const definition = this.getMicroComponentDefinition(componentPath);
              if (!definition) {
                  throw new Error('Unknown micro component');
              }
              return {
                  instanceId: this.generateInstanceId(),
                  type,
                  componentPath: definition.id,
                  name: definition.name,
                  props: { ...(definition.defaultProps || {}) },
                  content: definition.template,
                  children: {},
                  canvas: null,
                  region: 'main',
                  order: this.getActiveComponents().length + 1,
                  blockConfig: {},
                  visible: true,
                  locked: false
              };
          }

          throw new Error('Unsupported component type');
      }

      findComponentById(instanceId, components = this.getActiveComponents()) {
          if (!instanceId) return null;
          for (const item of components) {
              if (item.instanceId === instanceId) {
                  return item;
              }
              if (item.children && typeof item.children === 'object') {
                  for (const list of Object.values(item.children)) {
                      if (!Array.isArray(list)) continue;
                      const found = this.findComponentById(instanceId, list);
                      if (found) return found;
                  }
              }
          }
          return null;
      }

      findComponentLocation(instanceId, components = this.getActiveComponents()) {
          for (const item of components) {
              if (item.instanceId === instanceId) {
                  return { list: components, item, index: components.indexOf(item) };
              }
              if (item.children && typeof item.children === 'object') {
                  for (const list of Object.values(item.children)) {
                      if (!Array.isArray(list)) continue;
                      const location = this.findComponentLocation(instanceId, list);
                      if (location) {
                          return location;
                      }
                  }
              }
          }
          return null;
      }

      removeComponentById(instanceId, components = this.getActiveComponents()) {
          const index = components.findIndex((item) => item.instanceId === instanceId);
          if (index > -1) {
              components.splice(index, 1);
              return true;
          }
          for (const item of components) {
              if (item.children && typeof item.children === 'object') {
                  for (const list of Object.values(item.children)) {
                      if (!Array.isArray(list)) continue;
                      if (this.removeComponentById(instanceId, list)) {
                          return true;
                      }
                  }
              }
          }
          return false;
      }

      cloneComponent(item) {
          const clone = JSON.parse(JSON.stringify(item));
          const updateIds = (node) => {
              node.instanceId = this.generateInstanceId();
              if (node.children && typeof node.children === 'object') {
                  Object.values(node.children).forEach((list) => {
                      if (!Array.isArray(list)) return;
                      list.forEach(updateIds);
                  });
              }
          };
          updateIds(clone);
          return clone;
      }

      reorderSlotChildren(parentId, slotName, orderedIds = []) {
          const parent = this.findComponentById(parentId);
          if (!parent) return;
          if (!parent.children || typeof parent.children !== 'object') {
              parent.children = {};
          }
          const children = Array.isArray(parent.children[slotName]) ? parent.children[slotName] : [];
          const lookup = new Map(children.map((child) => [child.instanceId, child]));
          parent.children[slotName] = orderedIds.map((id) => lookup.get(id)).filter(Boolean);
      }

      async addComponentToSlot(parentId, slotName, type, componentPath) {
          const parent = this.findComponentById(parentId);
          if (!parent) {
              throw new Error('Parent component not found');
          }
          if (!parent.children || typeof parent.children !== 'object') {
              parent.children = {};
          }
          if (!Array.isArray(parent.children[slotName])) {
              parent.children[slotName] = [];
          }
          const instance = await this.createComponentInstance(type, componentPath);
          parent.children[slotName].push(instance);
          this.renderCanvasFromState();
          this.refreshLivePreview();
      }

      updateCanvasDragHandle() {
          if (!this.canvasSortable) {
              return;
          }

          if (this.canvasLayoutMode === 'freeform') {
              this.canvasSortable.option('handle', '.canvas-item-header');
              return;
          }

          const isPageMode = this.builderMode === 'page';
          const isStitchMode = this.canvas?.classList.contains('stitch-mode');
          let handle = '.canvas-item-header, .canvas-item-content';
          if (isPageMode && isStitchMode) {
              handle = '.canvas-item-content';
          }

          this.canvasSortable.option('handle', handle);
      }

    setActiveComponents(components) {
        const normalized = Array.isArray(components)
            ? components.map((item, index) => this.prepareBlockInstance(item, index))
            : [];
        if (this.builderMode === 'partial') {
            this.partialComponents = normalized;
        } else {
            this.pageComponents = normalized;
        }
    }

    getActiveHistoryStore() {
        if (this.builderMode === 'partial') {
            return { undo: this.partialHistoryUndo, redo: this.partialHistoryRedo };
        }
        return { undo: this.historyUndo, redo: this.historyRedo };
    }

    getActivePaletteItems() {
        if (this.builderMode === 'partial') {
            return this.microComponents;
        }
        return this.activePaletteTab === 'views' ? this.cmsViews : this.partials;
    }

    getMicroComponentDefinition(id) {
        return this.microComponents.find((item) => item.id === id);
    }

    filterComponents() {
        const query = (this.searchInput.value || '').trim().toLowerCase();
        const selectedGroup = this.partialsFilter ? this.partialsFilter.value : 'all';
        const items = this.getActivePaletteItems();
        const isPageMode = this.builderMode === 'page';
        const listEl = this.builderMode === 'partial'
            ? this.microList
            : (this.activePaletteTab === 'views' ? this.viewsList : this.partialsList);
        if (!listEl) {
            return;
        }
        if (!isPageMode) {
            this.updateMicroQuickFilters(selectedGroup);
        }

        const activeRegion = this.activeRegionFilter || 'all';
        const filtered = items.filter(p => {
            const queryMatch = !query ||
                p.name.toLowerCase().includes(query) ||
                String(p.path || p.id || '').toLowerCase().includes(query) ||
                (p.category || '').toLowerCase().includes(query) ||
                (p.group || '').toLowerCase().includes(query);
            const groupMatch = selectedGroup === 'all' || String(p.group) === String(selectedGroup);
            const allowedRegions = p.allowedRegions || this.getAllowedRegionsForComponent(p.path || p.id || '', p.type || (isPageMode ? 'partial' : 'micro'));
            const regionMatch = activeRegion === 'all' || allowedRegions.includes(activeRegion);
            return queryMatch && groupMatch && regionMatch;
        });

        const emptyMessage = isPageMode && !this.pageCreated
            ? 'Create a page to load partials...'
            : (this.activePaletteTab === 'views' ? 'No Views match the current search/filter' : 'No components match the current search/filter');
        this.renderPaletteItems(filtered, {
            listEl,
            allowActions: isPageMode && this.activePaletteTab !== 'views',
            emptyMessage
        });
        this.updatePaletteItemCount(items.length, filtered.length);
    }

    handleMicroQuickFilter(event) {
        const button = event.target.closest('[data-filter]');
        if (!button) {
            return;
        }
        const filterValue = button.dataset.filter || 'all';
        if (this.partialsFilter) {
            this.partialsFilter.value = filterValue;
        }
        this.filterComponents();
    }

    updateMicroQuickFilters(activeValue) {
        if (!this.microQuickFilters) {
            return;
        }
        const current = String(activeValue || 'all');
        this.microQuickFilters.querySelectorAll('[data-filter]').forEach((button) => {
            const target = String(button.dataset.filter || 'all');
            button.classList.toggle('active', target === current);
        });
    }

    initDesignPresets() {
        if (!this.presetSelect || !Array.isArray(this.designPresets)) {
            return;
        }
        this.presetSelect.innerHTML = this.designPresets
            .map((preset) => `<option value="${preset.id}">${preset.name}</option>`)
            .join('');
        const saved = localStorage.getItem('builderDesignPreset');
        const initial = this.designPresets.find((preset) => preset.id === saved) || this.designPresets[0];
        this.applyDesignPreset(initial.id, { persist: false });
    }

    initRegionFilters() {
        if (!this.regionFilter) {
            return;
        }
        this.regionFilter.innerHTML = [
            '<option value="all">All regions</option>',
            ...this.layoutRegions.map((region) => `<option value="${region.id}">${region.name}</option>`)
        ].join('');
        this.regionFilter.value = this.activeRegionFilter || 'all';
    }

    getRegionDefinition(regionId = 'main') {
        const normalized = this.normalizeRegionId(regionId, 'main');
        return this.layoutRegions.find((region) => region.id === normalized) || this.layoutRegions.find((region) => region.id === 'main') || this.layoutRegions[0];
    }

    normalizeRegionId(value, fallback = 'main') {
        const aliases = {
            main_content: 'main',
            content_main: 'main',
            body: 'main',
            page_body: 'main',
            side_nav: 'side-navigation',
            side_navigation: 'side-navigation',
            sidenav: 'side-navigation',
            sidebar: 'side-navigation',
            side: 'side-navigation',
            content_above: 'content-above',
            contentabove: 'content-above',
            above_content: 'content-above',
            content_below: 'content-below',
            contentbelow: 'content-below',
            below_content: 'content-below'
        };
        const normalizeToken = (input) => String(input || '')
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '_')
            .replace(/^_+|_+$/g, '');
        const raw = normalizeToken(value);
        const fromPath = raw.includes('_') ? raw.split('_')[0] : raw;
        const normalized = aliases[raw] || aliases[fromPath] || raw;
        if (this.layoutRegions.some((region) => region.id === normalized)) {
            return normalized;
        }
        const fallbackRaw = normalizeToken(fallback);
        const fallbackRegion = aliases[fallbackRaw] || fallbackRaw || 'main';
        return this.layoutRegions.some((region) => region.id === fallbackRegion) ? fallbackRegion : 'main';
    }

    inferRegionForComponent(componentPath = '') {
        const path = String(componentPath || '').toLowerCase();
        if (/(^|\/)(header|navbar|nav)(\.|\/|$)/.test(path) || path.includes('landmark/header')) return 'header';
        if (path.includes('hero') || path.includes('marquee')) return 'hero';
        if (path.includes('footer') || path.includes('landmark/footer')) return 'footer';
        if (path.includes('side') || path.includes('sidebar') || path.includes('navigation')) return 'side-navigation';
        if (path.includes('cta') || path.includes('newsletter')) return 'content-below';
        if (path.includes('header')) return 'content-above';
        return 'main';
    }

    getAllowedRegionsForComponent(componentPath = '', type = 'partial') {
        if (type === 'view') {
            return ['main', 'side-navigation', 'content-above', 'content-below', 'hero'];
        }
        if (type === 'micro') {
            return ['main', 'side-navigation', 'content-above', 'content-below', 'hero'];
        }
        const primary = this.inferRegionForComponent(componentPath);
        const path = String(componentPath || '').toLowerCase();
        if (primary === 'header') return ['header'];
        if (primary === 'footer') return ['footer'];
        if (primary === 'hero') return ['hero', 'content-above', 'main'];
        if (primary === 'side-navigation') return ['side-navigation', 'main'];
        if (path.includes('cta')) return ['content-below', 'main'];
        return ['main', 'content-above', 'content-below'];
    }

    prepareBlockInstance(item = {}, index = 0) {
        const componentPath = item.componentPath || item.partial || item.componentId || '';
        const type = item.type || 'partial';
        if (type === 'view') {
            const viewId = item.viewId || item.props?.viewId || String(componentPath).replace(/^view:/, '');
            const displayId = item.displayId || item.props?.displayId || '';
            return {
                ...item,
                instanceId: item.instanceId || item.id || this.generateInstanceId(),
                id: item.id || item.instanceId,
                type: 'view',
                componentPath: componentPath || `view:${viewId}`,
                partial: item.partial || `view:${viewId}`,
                viewId,
                displayId,
                name: item.name || this.getCmsViewLabel(viewId) || viewId || 'View',
                region: this.normalizeRegionId(item.region, 'main'),
                order: Number.isFinite(Number(item.order)) ? Number(item.order) : index + 1,
                blockConfig: item.blockConfig || item.config || item.props?.blockConfig || {},
                config: item.config || item.props?.config || {},
                visibility: item.visibility || item.props?.visibility || 'visible',
                visible: item.visible !== false && item.visibility !== 'hidden',
                locked: Boolean(item.locked),
                props: {
                    ...(item.props || {}),
                    viewId,
                    displayId,
                    config: item.config || item.props?.config || {},
                    visibility: item.visibility || item.props?.visibility || 'visible'
                },
                children: {}
            };
        }
        const region = this.normalizeRegionId(item.region, this.inferRegionForComponent(componentPath));
        const props = item.props || {};
        return {
            ...item,
            instanceId: item.instanceId || item.id || this.generateInstanceId(),
            id: item.id || item.instanceId,
            type,
            componentPath,
            name: item.name || componentPath.split('/').pop()?.replace('.html', '') || 'Component',
            region,
            order: Number.isFinite(Number(item.order)) ? Number(item.order) : index + 1,
            blockConfig: item.blockConfig || item.config || props.blockConfig || {},
            visible: item.visible !== false && item.visibility !== 'hidden',
            locked: Boolean(item.locked),
            props
        };
    }

    getComponentsByRegion(components = this.getActiveComponents()) {
        const grouped = {};
        this.layoutRegions.forEach((region) => {
            grouped[region.id] = [];
        });
        components.forEach((item, index) => {
            const prepared = this.prepareBlockInstance(item, index);
            const region = this.normalizeRegionId(prepared.region, 'main');
            grouped[region] = grouped[region] || [];
            grouped[region].push(prepared);
        });
        Object.keys(grouped).forEach((regionId) => {
            grouped[regionId].sort((a, b) => {
                const byOrder = Number(a.order || 0) - Number(b.order || 0);
                return byOrder || String(a.instanceId).localeCompare(String(b.instanceId));
            });
        });
        return grouped;
    }

    flattenRegions(regions = {}) {
        return this.layoutRegions.flatMap((region) => {
            const items = Array.isArray(regions[region.id]) ? regions[region.id] : [];
            return items.map((item, index) => this.prepareBlockInstance({ ...item, region: region.id, order: index + 1 }, index));
        });
    }

    buildRegionsPayload() {
        const grouped = this.getComponentsByRegion(this.pageComponents);
        const payload = {};
        this.layoutRegions.forEach((region) => {
            payload[region.id] = grouped[region.id].map((item, index) => this.serializeBlockInstance(item, index, region.id));
        });
        return payload;
    }

    serializeBlockInstance(item, index = 0, regionId = 'main') {
        if (item.type === 'view') {
            const viewId = item.viewId || item.props?.viewId || '';
            const displayId = item.displayId || item.props?.displayId || '';
            const config = item.config || item.props?.config || {};
            const visibility = item.visibility || item.props?.visibility || (item.visible === false ? 'hidden' : 'visible');
            return {
                id: item.instanceId,
                instanceId: item.instanceId,
                order: index + 1,
                type: 'view',
                viewId,
                displayId,
                region: this.normalizeRegionId(regionId || item.region, 'main'),
                name: item.name || this.getCmsViewLabel(viewId) || viewId,
                config,
                visibility,
                blockConfig: item.blockConfig || {},
                visible: item.visible !== false,
                locked: Boolean(item.locked),
                props: {
                    ...(item.props || {}),
                    viewId,
                    displayId,
                    config,
                    visibility,
                    blockConfig: item.blockConfig || item.props?.blockConfig || {}
                },
                children: {},
                canvas: this.canvasLayoutMode === 'freeform' ? this.normalizeCanvasPlacement(item.canvas, index) : null,
                renderedContent: this.getRenderedComponentContent(item)
            };
        }

        return {
            id: item.instanceId,
            instanceId: item.instanceId,
            order: index + 1,
            type: item.type,
            partial: item.componentPath,
            componentPath: item.componentPath,
            name: item.name,
            region: this.normalizeRegionId(regionId || item.region, 'main'),
            blockConfig: item.blockConfig || {},
            cmsBinding: item.props?.cmsBinding || null,
            visible: item.visible !== false,
            locked: Boolean(item.locked),
            props: {
                ...(item.props || {}),
                blockConfig: item.blockConfig || item.props?.blockConfig || {}
            },
            children: item.children || {},
            canvas: this.canvasLayoutMode === 'freeform' ? this.normalizeCanvasPlacement(item.canvas, index) : null,
            renderedContent: this.getRenderedComponentContent(item)
        };
    }

    getActivePreset() {
        return this.designPresets.find((preset) => preset.id === this.activePresetId) || this.designPresets[0];
    }

    applyDesignPreset(id, options = {}) {
        const preset = this.designPresets.find((entry) => entry.id === id) || this.designPresets[0];
        if (!preset) {
            return;
        }
        this.activePresetId = preset.id;
        if (this.presetSelect) {
            this.presetSelect.value = preset.id;
        }
        if (options.persist !== false) {
            localStorage.setItem('builderDesignPreset', preset.id);
        }
        this.applyPresetVariablesToCanvas();
        this.refreshLivePreview();
    }

    applyPresetVariablesToCanvas() {
        const preset = this.getActivePreset();
        const vars = preset?.vars || {};
        const target = this.canvas || document.documentElement;
        const setVar = (name, value) => {
            if (!value) return;
            target.style.setProperty(name, value);
        };
        setVar('--preset-accent', vars.accent);
        setVar('--preset-text', vars.text);
        setVar('--preset-muted', vars.muted);
        setVar('--preset-surface', vars.surface);
        setVar('--preset-radius', vars.radius);
        setVar('--preset-font-body', vars.fontBody);
        setVar('--preset-font-heading', vars.fontHeading);
    }

    getPresetCssVariables() {
        const preset = this.getActivePreset();
        const vars = preset?.vars || {};
        return `
            :root {
                --preset-accent: ${vars.accent || '#2563eb'};
                --preset-text: ${vars.text || '#0f172a'};
                --preset-muted: ${vars.muted || '#64748b'};
                --preset-surface: ${vars.surface || '#f8fafc'};
                --preset-radius: ${vars.radius || '12px'};
                --preset-font-body: ${vars.fontBody || '"Inter", system-ui, sans-serif'};
                --preset-font-heading: ${vars.fontHeading || '"Inter", system-ui, sans-serif'};
            }
        `;
    }

    getMicroBaseStyles() {
        return `
            .micro-heading {
                font-family: var(--preset-font-heading);
                font-size: clamp(24px, 3vw, 40px);
                font-weight: 700;
                margin: 0 0 12px;
            }
            .micro-text-block,
            .micro-paragraph,
            .micro-field {
                font-family: var(--preset-font-body);
                color: var(--preset-text);
            }
            .micro-text-block h3 {
                font-family: var(--preset-font-heading);
                margin: 0 0 12px;
                line-height: 1.1;
            }
            .micro-paragraph {
                color: var(--preset-muted);
                line-height: 1.6;
            }
            .micro-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                padding: 12px 20px;
                border-radius: var(--preset-radius);
                background-color: var(--preset-accent);
                color: #fff;
                font-weight: 600;
                text-decoration: none;
            }
            .micro-link {
                color: var(--preset-accent);
                font-weight: 600;
            }
            .micro-field {
                display: flex;
                flex-direction: column;
                gap: 6px;
                font-size: 12px;
            }
            .micro-input,
            .micro-textarea,
            .micro-select {
                padding: 10px 12px;
                border-radius: var(--preset-radius);
                border: 1px solid #cbd5f5;
                background-color: #fff;
                font-family: var(--preset-font-body);
            }
            .micro-divider {
                border: none;
                border-top: 1px solid #e2e8f0;
            }
        `;
    }

    renderCanvasFromState() {
        this.editorCanvas.renderCanvasFromState(this);
    }

    removeCanvasItem(instanceId) {
        const item = this.findComponentById(instanceId);
        if (item?.locked) {
            this.showToast('This block is locked by the template', 'warning');
            return;
        }
        this.pushHistory();
        const components = this.getActiveComponents();
        const removed = this.removeComponentById(instanceId, components);
        if (!removed) {
            return;
        }
        this.setActiveComponents(components);
        this.renderCanvasFromState();
        this.refreshLivePreview();
        this.showToast('Component removed', 'success');
    }

    duplicateCanvasItem(instanceId) {
        const location = this.findComponentLocation(instanceId);
        if (!location) {
            return;
        }
        this.pushHistory();

        const duplicate = this.cloneComponent(location.item);
        location.list.splice(location.index + 1, 0, duplicate);
        this.setActiveComponents(this.getActiveComponents());
        this.renderCanvasFromState();
        this.refreshLivePreview();
        this.showToast('Component duplicated', 'success');
    }

    moveCanvasItem(instanceId, direction = 0) {
        const location = this.findComponentLocation(instanceId);
        if (!location || location.item.locked) {
            this.showToast('This block cannot be moved', 'warning');
            return;
        }
        const region = this.normalizeRegionId(location.item.region, 'main');
        const components = this.getActiveComponents();
        const siblings = components
            .filter((item) => this.normalizeRegionId(item.region, 'main') === region)
            .sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
        const currentIndex = siblings.findIndex((item) => item.instanceId === instanceId);
        const nextIndex = currentIndex + Number(direction || 0);
        if (currentIndex < 0 || nextIndex < 0 || nextIndex >= siblings.length) {
            return;
        }
        this.pushHistory();
        const [item] = siblings.splice(currentIndex, 1);
        siblings.splice(nextIndex, 0, item);
        const next = this.layoutRegions.flatMap((regionDef) => {
            const list = regionDef.id === region
                ? siblings
                : components.filter((entry) => this.normalizeRegionId(entry.region, 'main') === regionDef.id);
            return list.map((entry, index) => ({ ...entry, order: index + 1 }));
        });
        this.setActiveComponents(next);
        this.renderCanvasFromState();
        this.refreshLivePreview();
    }

    toggleCanvasItemVisibility(instanceId) {
        const item = this.findComponentById(instanceId);
        if (!item) {
            return;
        }
        this.pushHistory();
        item.visible = item.visible === false;
        this.renderCanvasFromState();
        this.refreshLivePreview();
        this.showToast(item.visible === false ? 'Block hidden' : 'Block shown', 'success');
    }

    selectCanvasItem(instanceId) {
        // Remove previous selection
        document.querySelectorAll('.canvas-item').forEach(item => {
            item.classList.remove('selected');
        });
        
        // Add selection to clicked item
        const element = document.querySelector(`.canvas-item[data-instance-id="${instanceId}"]`);
        if (element) {
            element.classList.add('selected');
            this.selectedItem = instanceId;
            this.selectedElement = null;
            this.showPropertiesPanel(instanceId);
            this.updateInspector(instanceId);
            this.updateSelectionStatus();
        }
    }

    selectCanvasElement(instanceId, elementKey) {
        if (!instanceId || !elementKey) {
            return;
        }
        this.selectCanvasItem(instanceId);
        this.selectedElement = { instanceId, key: elementKey };
        this.showPropertiesPanel(instanceId, elementKey);
        this.updateInspector(instanceId, elementKey);
        this.updateSelectionStatus();
        const canvasItem = document.querySelector(`.canvas-item[data-instance-id="${instanceId}"]`);
        if (canvasItem) {
            this.applySelectedCanvasElementSelection(canvasItem, instanceId);
        }
    }

    updateCanvasState() {
        this.editorCanvas.updateCanvasState(this);
    }

    clearCanvas() {
        const components = this.getActiveComponents();
        if (components.length === 0) {
            this.showToast('Canvas is already empty', 'warning');
            return;
        }
        
        if (confirm('Are you sure you want to clear all components?')) {
            this.pushHistory();
            this.setActiveComponents([]);
            this.canvasDropZone.innerHTML = '';
            this.updateCanvasState();
            this.refreshLivePreview();
            this.showToast('Canvas cleared', 'success');
        }
    }

    openCmsModal() {
        const cmsAdminUrl = this.runtimeConfig?.cms?.adminUrl || 'http://localhost:3100/cms';
        const popup = window.open(cmsAdminUrl, '_blank', 'noopener');
        if (!popup) {
            this.showToast(`Open the CMS at ${cmsAdminUrl}`, 'info');
            window.location.href = cmsAdminUrl;
            return;
        }
        this.showToast('CMS admin opened in a separate window', 'info');
    }

    closeCmsModal() {
        // Builder no longer hosts CMS authoring in a modal.
    }

    getDefaultCmsCollectionSchema() {
        return {
            fields: [
                { name: 'title', label: 'Title', type: 'text' }
            ]
        };
    }

    formatCmsSchema(schema) {
        return JSON.stringify(schema || this.getDefaultCmsCollectionSchema(), null, 2);
    }

    formatCmsEntryData(data) {
        return JSON.stringify(data || {}, null, 2);
    }

    parseJsonInput(rawValue, fallback = null) {
        const text = String(rawValue || '').trim();
        if (!text) {
            return fallback;
        }
        return JSON.parse(text);
    }

    cloneCmsBinding(binding) {
        if (!binding || typeof binding !== 'object') {
            return null;
        }
        return JSON.parse(JSON.stringify(binding));
    }

    getDefaultCmsBindingForComponent(componentPath = '') {
        const normalizedPath = String(componentPath || '').replace(/\\/g, '/').trim();
        const presets = {
            'about/about_cta.html': {
                source: 'cms',
                mode: 'record',
                collection: 'cta_blocks',
                selection: {
                    filter: {
                        key: 'about-cta',
                        active: true
                    }
                },
                fieldMap: {
                    heading: 'heading',
                    buttonLabel: 'button_label',
                    buttonUrl: 'button_url'
                },
                fallback: 'static'
            },
            'home/insights.html': {
                source: 'cms',
                mode: 'collection',
                collection: 'insights',
                selection: {
                    filter: {
                        active: true
                    },
                    sort: 'sort_order:asc',
                    limit: 3
                },
                fieldMap: {
                    title: 'title',
                    category: 'category',
                    imageSrc: 'image_src',
                    imageAlt: 'image_alt',
                    linkHref: 'detail_url'
                },
                fallback: 'static'
            },
            'home/projects.html': {
                source: 'cms',
                mode: 'collection',
                collection: 'projects',
                selection: {
                    filter: {
                        active: true,
                        featured: true
                    },
                    sort: 'sort_order:asc',
                    limit: 2
                },
                fieldMap: {
                    title: 'title',
                    category: 'category',
                    text: 'summary',
                    imageSrc: 'image_src',
                    imageAlt: 'image_alt',
                    linkHref: 'detail_url'
                },
                fallback: 'static'
            },
            'project/project_listing.html': {
                source: 'cms',
                mode: 'collection',
                collection: 'projects',
                selection: {
                    filter: {
                        active: true
                    },
                    sort: 'sort_order:asc',
                    limit: 4
                },
                fieldMap: {
                    title: 'title',
                    category: 'category',
                    year: 'year',
                    imageSrc: 'image_src',
                    imageAlt: 'image_alt',
                    linkHref: 'detail_url'
                },
                fallback: 'static'
            },
            'home/cta.html': {
                source: 'cms',
                mode: 'collection',
                collection: 'supporters',
                selection: {
                    groups: [
                        {
                            title: 'Founding Pillars',
                            filter: { active: true, tier: 'founding' },
                            itemTag: 'a',
                            itemClassName: 'font-heading text-4xl md:text-6xl font-bold uppercase hover:text-gray-300 transition-colors'
                        },
                        {
                            title: 'Visionary Contributors',
                            filter: { active: true, tier: 'visionary' },
                            itemTag: 'a',
                            itemClassName: 'font-heading text-xl md:text-2xl font-medium uppercase'
                        },
                        {
                            title: 'Community Support',
                            filter: { active: true, tier: 'community' },
                            itemTag: 'a',
                            itemClassName: ''
                        }
                    ]
                },
                fieldMap: {
                    label: 'name',
                    linkHref: 'url'
                },
                fallback: 'static'
            }
        };

        return this.cloneCmsBinding(presets[normalizedPath] || null);
    }

    async ensureCmsEntriesLoaded(collectionSlug, options = {}) {
        const slug = String(collectionSlug || '').trim();
        if (!slug) {
            return [];
        }

        if (!options.force && Array.isArray(this.cmsEntriesByCollection[slug])) {
            return this.cmsEntriesByCollection[slug];
        }

        if (!options.force && this.cmsEntriesLoadPromises[slug]) {
            return this.cmsEntriesLoadPromises[slug];
        }

        this.cmsEntriesLoadPromises[slug] = this.apiClient
            .listCmsEntries(slug)
            .then((result) => {
                const entries = Array.isArray(result?.data) ? result.data : [];
                this.cmsEntriesByCollection[slug] = entries;
                return entries;
            })
            .catch((error) => {
                console.error(`Failed to load CMS entries for ${slug}:`, error);
                return [];
            })
            .finally(() => {
                delete this.cmsEntriesLoadPromises[slug];
            });

        return this.cmsEntriesLoadPromises[slug];
    }

    getCachedCmsEntries(collectionSlug) {
        const slug = String(collectionSlug || '').trim();
        if (!slug) {
            return [];
        }
        if (Array.isArray(this.cmsEntriesByCollection[slug])) {
            return this.cmsEntriesByCollection[slug];
        }
        return [];
    }

    collectCmsBindingCollections(items = [], bucket = new Set()) {
        items.forEach((item) => {
            if (!item || typeof item !== 'object') {
                return;
            }
            const collection = item?.props?.cmsBinding?.collection;
            if (collection) {
                bucket.add(collection);
            }
            const children = item?.children && typeof item.children === 'object' ? Object.values(item.children) : [];
            children.forEach((group) => {
                if (Array.isArray(group) && group.length > 0) {
                    this.collectCmsBindingCollections(group, bucket);
                }
            });
        });
        return bucket;
    }

    async ensureCmsBindingsLoadedForComponents(items = []) {
        const collections = Array.from(this.collectCmsBindingCollections(items));
        if (collections.length === 0) {
            return;
        }
        await Promise.all(collections.map((slug) => this.ensureCmsEntriesLoaded(slug)));
    }

    toCamelCase(value) {
        return window.BuilderCmsBinding.toCamelCase(value);
    }

    toSnakeCase(value) {
        return window.BuilderCmsBinding.toSnakeCase(value);
    }

    buildCmsDataAliases(data = {}) {
        return window.BuilderCmsBinding.buildDataAliases(data);
    }

    getCmsValueByKey(source, key) {
        return window.BuilderCmsBinding.getValueByKey(source, key);
    }

    getCmsEntryComparableValue(entry, key) {
        return window.BuilderCmsBinding.getEntryComparableValue(entry, key);
    }

    normalizeCmsMappedRecord(data = {}, meta = {}) {
        return window.BuilderCmsBinding.normalizeMappedRecord(data, meta);
    }

    mapCmsEntryData(entry, binding, index = 0) {
        return window.BuilderCmsBinding.mapEntryData(entry, binding, index);
    }

    resolveCmsBinding(item) {
        const binding = item?.props?.cmsBinding;
        if (!binding || binding.source !== 'cms' || !binding.collection) {
            return null;
        }

        const entries = this.getCachedCmsEntries(binding.collection);
        if (!Array.isArray(entries) || entries.length === 0) {
            return null;
        }

        return window.BuilderCmsBinding.resolveBindingEntries(binding, entries);
    }

    getCmsView(viewId) {
        const id = String(viewId || '').trim();
        return this.cmsViews.find((view) => view.viewId === id) || null;
    }

    getCmsViewLabel(viewId) {
        const view = this.getCmsView(viewId);
        return view ? (view.label || view.viewId) : '';
    }

    getCmsViewDisplays(viewId) {
        const view = this.getCmsView(viewId);
        return Array.isArray(view?.displays) ? view.displays : [];
    }

    getCmsViewPreviewKey(viewId, displayId) {
        return `${viewId || ''}::${displayId || ''}`;
    }

    async ensureCmsViewPreviewLoaded(viewId, displayId, options = {}) {
        const id = String(viewId || '').trim();
        const display = String(displayId || '').trim();
        if (!id) {
            return null;
        }
        const key = this.getCmsViewPreviewKey(id, display);
        if (!options.force && this.cmsViewPreviews[key]) {
            return this.cmsViewPreviews[key];
        }
        if (!options.force && this.cmsViewPreviewPromises[key]) {
            return this.cmsViewPreviewPromises[key];
        }

        this.cmsViewPreviewPromises[key] = this.apiClient.previewCmsView(id, display)
            .then((result) => {
                const data = result?.data || null;
                if (data) {
                    this.cmsViewPreviews[key] = data;
                }
                return data;
            })
            .catch((error) => {
                console.error(`Failed to preview CMS View ${id}:`, error);
                return null;
            })
            .finally(() => {
                delete this.cmsViewPreviewPromises[key];
            });

        return this.cmsViewPreviewPromises[key];
    }

    renderCmsViewBlockPreview(item = {}) {
        const viewId = item.viewId || item.props?.viewId || '';
        const displayId = item.displayId || item.props?.displayId || '';
        const preview = this.cmsViewPreviews[this.getCmsViewPreviewKey(viewId, displayId)];
        const view = preview?.view || this.getCmsView(viewId) || {};
        const display = preview?.display || this.getCmsViewDisplays(viewId).find((entry) => entry.displayId === displayId) || {};
        const entries = Array.isArray(preview?.entries) ? preview.entries : [];
        const title = item.name || view.label || viewId || 'View';
        const itemsHtml = entries.map((entry) => {
            const data = entry.data || {};
            const heading = data.title || data.heading || data.name || entry.entryKey || 'Untitled';
            const summary = data.summary || data.description || data.body || '';
            const href = data.detail_url || data.detailUrl || data.url || '';
            const headingHtml = href
                ? `<a href="${this.escapeAttribute(href)}">${this.escapeHtml(heading)}</a>`
                : this.escapeHtml(heading);
            return `
                <article class="cms-view-preview-item">
                    <h4>${headingHtml}</h4>
                    ${summary ? `<p>${this.escapeHtml(summary)}</p>` : ''}
                </article>
            `;
        }).join('');

        if (!preview) {
            this.ensureCmsViewPreviewLoaded(viewId, displayId).then(() => {
                const canvasItem = document.querySelector(`.canvas-item[data-instance-id="${item.instanceId}"] .content-preview`);
                if (canvasItem) {
                    canvasItem.innerHTML = this.renderCmsViewBlockPreview(item);
                }
                this.refreshLivePreview();
            });
        }

        return `
            <section class="cms-view-preview-block" data-view-id="${this.escapeAttribute(viewId)}" data-display-id="${this.escapeAttribute(displayId)}">
                <div class="cms-view-preview-header">
                    <span>${this.escapeHtml(display.label || display.type || 'Block display')}</span>
                    <h3>${this.escapeHtml(title)}</h3>
                </div>
                <div class="cms-view-preview-items">
                    ${preview ? (itemsHtml || '<p class="cms-view-empty">No matching content.</p>') : '<p class="cms-view-empty">Loading View preview...</p>'}
                </div>
            </section>
        `;
    }

    showViewPropertiesPanel(instanceId) {
        const item = this.findComponentById(instanceId);
        if (!item || !this.propertiesPanel || !this.propertiesContent) return;
        const viewId = item.viewId || item.props?.viewId || '';
        const displayId = item.displayId || item.props?.displayId || '';
        const displays = this.getCmsViewDisplays(viewId);
        const displayOptions = displays.map((display) => {
            const suffix = display.type && display.type !== 'block' ? ` (${display.type})` : '';
            return `<option value="${this.escapeAttribute(display.displayId)}"${display.displayId === displayId ? ' selected' : ''}>${this.escapeHtml(display.label || display.displayId)}${this.escapeHtml(suffix)}</option>`;
        }).join('');
        const currentRegion = this.normalizeRegionId(item.region, 'main');
        const allowedRegions = this.getAllowedRegionsForComponent('', 'view');
        const validationIssues = this.getBlockValidationIssues(item);
        const config = item.config || item.props?.config || {};

        this.propertiesContent.innerHTML = `
            <div class="properties-section">
                <div class="properties-title">View Block</div>
                <div class="form-group"><label>Name</label><input type="text" value="${this.escapeAttribute(item.name || '')}" id="propViewName"></div>
                <div class="form-group"><label>View</label><input type="text" value="${this.escapeAttribute(this.getCmsViewLabel(viewId) || viewId)}" disabled></div>
                <div class="form-group"><label>Display</label><select id="propViewDisplay">${displayOptions || '<option value="">No displays</option>'}</select></div>
                <div class="form-group"><label>Region</label><select id="propViewRegion">
                    ${this.layoutRegions.map((region) => {
                        const disabled = allowedRegions.includes(region.id) ? '' : ' disabled';
                        return `<option value="${region.id}"${region.id === currentRegion ? ' selected' : ''}${disabled}>${this.escapeHtml(region.name)}</option>`;
                    }).join('')}
                </select></div>
                <label class="property-toggle">
                    <input type="checkbox" id="propViewVisible"${item.visible !== false ? ' checked' : ''}>
                    <span>Visible</span>
                </label>
                ${validationIssues.length ? validationIssues.map((issue) => `
                    <div class="cms-binding-status cms-binding-status-warning">
                        <strong>${this.escapeHtml(issue.title)}</strong>
                        <span>${this.escapeHtml(issue.message)}</span>
                    </div>
                `).join('') : ''}
            </div>
            <div class="properties-section">
                <div class="properties-title">View Config</div>
                <div class="form-group"><label>Config JSON</label><textarea id="propViewConfig" rows="7">${this.escapeHtml(JSON.stringify(config, null, 2))}</textarea></div>
                <button type="button" class="btn btn-secondary property-action-btn" id="propViewRefresh">Refresh Preview</button>
            </div>
        `;

        document.getElementById('propViewName')?.addEventListener('input', (event) => {
            this.updateComponentProps(instanceId, { name: event.target.value });
        });
        document.getElementById('propViewDisplay')?.addEventListener('change', (event) => {
            const nextDisplayId = event.target.value;
            item.displayId = nextDisplayId;
            item.props = { ...(item.props || {}), displayId: nextDisplayId };
            this.ensureCmsViewPreviewLoaded(viewId, nextDisplayId, { force: true }).then(() => {
                this.renderCanvasFromState();
                this.refreshLivePreview();
                this.showViewPropertiesPanel(instanceId);
            });
        });
        document.getElementById('propViewRegion')?.addEventListener('change', (event) => {
            item.region = this.normalizeRegionId(event.target.value, 'main');
            this.renderCanvasFromState();
            this.refreshLivePreview();
            this.showViewPropertiesPanel(instanceId);
        });
        document.getElementById('propViewVisible')?.addEventListener('change', (event) => {
            item.visible = event.target.checked;
            item.visibility = item.visible ? 'visible' : 'hidden';
            item.props = { ...(item.props || {}), visibility: item.visibility };
            this.renderCanvasFromState();
            this.refreshLivePreview();
        });
        document.getElementById('propViewConfig')?.addEventListener('change', (event) => {
            try {
                const nextConfig = this.parseJsonInput(event.target.value, {}) || {};
                item.config = nextConfig;
                item.props = { ...(item.props || {}), config: nextConfig };
                this.renderCanvasFromState();
                this.refreshLivePreview();
            } catch (error) {
                this.showToast(`Invalid View config JSON: ${error.message}`, 'error');
            }
        });
        document.getElementById('propViewRefresh')?.addEventListener('click', async () => {
            await this.ensureCmsViewPreviewLoaded(viewId, item.displayId || displayId, { force: true });
            this.renderCanvasFromState();
            this.refreshLivePreview();
        });

        this.propertiesPanel.classList.add('active');
    }

    getCmsCollection(collectionSlug) {
        const slug = String(collectionSlug || '').trim();
        return this.cmsCollections.find((collection) => collection.slug === slug) || null;
    }

    getCmsCollectionFields(collectionSlug) {
        const collection = this.getCmsCollection(collectionSlug);
        const fields = collection?.schema?.fields;
        return Array.isArray(fields) ? fields : [];
    }

    getCmsEntryLabel(entry) {
        if (!entry) return '';
        const data = entry.data || {};
        return data.title || data.heading || data.name || entry.entryKey || `Entry ${entry.id || ''}`.trim();
    }

    getCmsBindingStatus(binding) {
        if (!binding || binding.source !== 'cms' || !binding.collection) {
            return {
                type: 'muted',
                title: 'Using static fallback',
                message: 'No CMS binding is configured for this block.'
            };
        }

        const collection = this.getCmsCollection(binding.collection);
        if (!collection) {
            return {
                type: 'error',
                title: 'Missing collection',
                message: `The collection "${binding.collection}" is not available in the CMS export.`
            };
        }

        const fields = this.getCmsCollectionFields(binding.collection).map((field) => field.name);
        const missingFields = Object.values(binding.fieldMap || {})
            .filter(Boolean)
            .filter((fieldName) => !fields.includes(fieldName));
        if (missingFields.length > 0) {
            return {
                type: 'error',
                title: 'Missing mapped field',
                message: `Missing field${missingFields.length === 1 ? '' : 's'}: ${missingFields.join(', ')}.`
            };
        }

        const cachedEntries = this.getCachedCmsEntries(binding.collection);
        if (!Array.isArray(cachedEntries) || cachedEntries.length === 0) {
            return {
                type: 'warning',
                title: 'Using static fallback',
                message: 'Entries are not loaded yet or the exported collection has no entries.'
            };
        }

        const resolved = window.BuilderCmsBinding.resolveBindingEntries(binding, cachedEntries);
        if (!resolved) {
            return {
                type: 'warning',
                title: 'Bound but no matching entries',
                message: 'The binding is valid, but its filters do not match exported entries.'
            };
        }

        const count = resolved.mode === 'collection'
            ? (Array.isArray(resolved.items) ? resolved.items.length : 0)
            : (resolved.record ? 1 : 0);
        return {
            type: 'success',
            title: 'Bound and resolved',
            message: `${count || 1} exported ${count === 1 ? 'entry' : 'entries'} available for preview.`
        };
    }

    getKnownComponentConfigSchema(item = {}) {
        const componentPath = String(item.componentPath || item.partial || item.componentId || '').toLowerCase();
        const name = String(item.name || '').toLowerCase();
        const isProjectGrid = componentPath === 'content/grid'
            || componentPath.includes('project_listing')
            || componentPath.includes('project/project')
            || name.includes('project grid');
        if (!isProjectGrid) {
            return [];
        }
        return [
            {
                name: 'layoutType',
                label: 'Layout Type',
                type: 'select',
                target: 'blockConfig',
                required: true,
                options: [
                    { value: '', label: 'Select a layout...' },
                    { value: 'masonry', label: 'Masonry' },
                    { value: 'grid', label: 'Strict Grid' },
                    { value: 'list', label: 'List View' }
                ]
            },
            { name: 'itemsPerPage', label: 'Items Per Page', type: 'number', target: 'blockConfig', default: 10 },
            { name: 'showPagination', label: 'Show Pagination', type: 'boolean', target: 'blockConfig', default: true }
        ];
    }

    getBlockValidationIssues(item = {}) {
        if (!item) return [];
        if (item.type === 'view') {
            const viewId = item.viewId || item.props?.viewId || '';
            const displayId = item.displayId || item.props?.displayId || '';
            const view = this.getCmsView(viewId);
            const display = this.getCmsViewDisplays(viewId).find((entry) => entry.displayId === displayId);
            const issues = [];
            if (!view) {
                issues.push({
                    type: 'view',
                    title: 'Missing View',
                    message: `The View "${viewId || 'unknown'}" is not available.`,
                    field: 'viewId'
                });
            }
            if (!display) {
                issues.push({
                    type: 'view',
                    title: 'Missing View Display',
                    message: `The display "${displayId || 'unknown'}" is not available for this View.`,
                    field: 'displayId'
                });
            } else if ((display.type || 'block') !== 'block') {
                issues.push({
                    type: 'view',
                    title: 'Unsupported Display Type',
                    message: 'Only block displays can be placed into builder regions.',
                    field: 'displayId'
                });
            }
            const region = this.normalizeRegionId(item.region, 'main');
            const allowedRegions = this.getAllowedRegionsForComponent('', 'view');
            if (!allowedRegions.includes(region)) {
                issues.push({
                    type: 'region',
                    title: 'Unsupported Region',
                    message: `This View block cannot be displayed in ${this.getRegionDefinition(region)?.name || region}.`,
                    field: 'region'
                });
            }
            return issues;
        }
        const fields = this.getComponentConfigSchema(item, item.props || {});
        const props = item.props || {};
        const blockConfig = item.blockConfig || props.blockConfig || {};
        const issues = [];
        fields.forEach((field) => {
            if (!field.required) return;
            const target = field.target === 'props' ? props : blockConfig;
            const value = target?.[field.name];
            if (value === undefined || value === null || String(value).trim() === '') {
                issues.push({
                    type: 'config',
                    title: 'Missing Required Config',
                    message: `This block requires '${field.label || field.name}' to be configured.`,
                    field: field.name
                });
            }
        });
        const region = this.normalizeRegionId(item.region, this.inferRegionForComponent(item.componentPath));
        const allowedRegions = this.getAllowedRegionsForComponent(item.componentPath, item.type);
        if (allowedRegions.length && !allowedRegions.includes(region)) {
            issues.push({
                type: 'region',
                title: 'Unsupported Region',
                message: `This block cannot be displayed in ${this.getRegionDefinition(region)?.name || region}.`,
                field: 'region'
            });
        }
        return issues;
    }

    getLayoutValidationIssues() {
        if (this.builderMode !== 'page') {
            return [];
        }
        return this.getActiveComponents().flatMap((item) => this.getBlockValidationIssues(item));
    }

    getComponentConfigSchema(item, props = {}) {
        if (!item) return [];
        const explicit = item.configSchema || item.schema || item.manifest?.configSchema || item.manifest?.schema;
        if (Array.isArray(explicit)) return explicit;
        if (Array.isArray(explicit?.fields)) return explicit.fields;
        const known = this.getKnownComponentConfigSchema(item);
        if (known.length) return known;

        if (item.type === 'micro') {
            const definition = this.getMicroComponentDefinition(item.componentPath);
            const schema = definition?.configSchema || definition?.schema;
            if (Array.isArray(schema)) return schema;
            if (Array.isArray(schema?.fields)) return schema.fields;
        }

        return this.inferBlockConfigSchema(item, props);
    }

    inferBlockConfigSchema(item, props = {}) {
        const fields = [];
        const content = item?.content || '';
        if (content.includes('h1') || content.includes('h2') || content.includes('h3') || props.title !== undefined) {
            fields.push({ name: 'title', label: 'Title Text', type: 'text', target: 'props' });
        }
        if (content.includes('<p') || props.text !== undefined) {
            fields.push({ name: 'text', label: 'Paragraph Text', type: 'textarea', target: 'props' });
        }
        if (content.includes('<a') || props.linkText !== undefined) {
            fields.push({ name: 'linkText', label: 'Link Text', type: 'text', target: 'props' });
            fields.push({ name: 'linkHref', label: 'Link Href', type: 'url', target: 'props' });
        }
        if (content.includes('<img') || props.imageSrc !== undefined) {
            fields.push({ name: 'imageSrc', label: 'Image Src', type: 'image', target: 'props' });
            fields.push({ name: 'imageAlt', label: 'Image Alt', type: 'text', target: 'props' });
        }
        return fields;
    }

    findCmsEyebrowTarget(root) {
        if (!root) {
            return null;
        }
        const heading = root.querySelector('h1,h2,h3,h4,h5,h6');
        const spans = Array.from(root.querySelectorAll('span'));
        if (heading && spans.length > 0) {
            const preceding = spans.filter((el) => {
                const pos = el.compareDocumentPosition(heading);
                return Boolean(pos & Node.DOCUMENT_POSITION_FOLLOWING);
            });
            if (preceding.length > 0) {
                return preceding[preceding.length - 1];
            }
        }
        return spans[0] || null;
    }

    applyCmsDataToElement(root, data = {}) {
        if (!root || !data || typeof data !== 'object') {
            return;
        }

        const heading = root.querySelector('h1,h2,h3,h4,h5,h6');
        const paragraph = root.querySelector('p');
        const image = root.querySelector('img');
        const link = root.matches('a') ? root : root.querySelector('a');
        const spanTargets = Array.from(root.querySelectorAll('span'));
        const eyebrowTarget = this.findCmsEyebrowTarget(root);

        const titleValue = data.title ?? data.heading ?? data.headline ?? data.name;
        const textValue = data.text ?? data.body ?? data.summary ?? data.description;
        const hrefValue = data.linkHref ?? data.href ?? data.url ?? data.detailUrl ?? data.detail_url ?? data.buttonUrl ?? data.button_url;
        const linkTextValue = data.linkText ?? data.buttonLabel ?? data.button_label ?? data.label;
        const imageSrcValue = data.imageSrc ?? data.src ?? data.image ?? data.image_src;
        const imageAltValue = data.imageAlt ?? data.alt ?? data.image_alt;
        const eyebrowValue = data.eyebrow ?? data.category ?? data.label ?? data.tier;
        const indexValue = data.index ?? data.orderLabel ?? data.order_label;
        const yearValue = data.year;

        if (heading && titleValue !== undefined) heading.textContent = titleValue;
        if (paragraph && textValue !== undefined) paragraph.textContent = textValue;
        if (link && hrefValue !== undefined) link.setAttribute('href', hrefValue);
        if (link && linkTextValue !== undefined && !link.querySelector('h1,h2,h3,h4,h5,h6,p,div,section,article')) {
            link.textContent = linkTextValue;
        }
        if (image && imageSrcValue !== undefined) image.setAttribute('src', imageSrcValue);
        if (image && imageAltValue !== undefined) image.setAttribute('alt', imageAltValue);
        if (eyebrowTarget && eyebrowValue !== undefined) eyebrowTarget.textContent = eyebrowValue;

        if (indexValue !== undefined && heading && spanTargets.length > 1) {
            const preceding = spanTargets.filter((el) => {
                const pos = el.compareDocumentPosition(heading);
                return Boolean(pos & Node.DOCUMENT_POSITION_FOLLOWING);
            });
            if (preceding.length > 1) {
                preceding[0].textContent = indexValue;
            }
        }

        if (yearValue !== undefined && heading && spanTargets.length > 0) {
            const following = spanTargets.filter((el) => {
                const pos = el.compareDocumentPosition(heading);
                return Boolean(pos & Node.DOCUMENT_POSITION_PRECEDING);
            });
            if (following.length > 0) {
                following[following.length - 1].textContent = yearValue;
            }
        }
    }

    findCmsRepeaterTemplate(root) {
        if (!root) {
            return null;
        }

        const parents = [root].concat(Array.from(root.querySelectorAll('*')));
        let best = null;

        const scoreCandidate = (template, count) => {
            const className = template.className || '';
            let score = count;
            if (/(card|item|post|project|blog|supporter)/i.test(className)) score += 10;
            if (template.querySelector('img')) score += 5;
            if (template.querySelector('h1,h2,h3,h4,h5,h6')) score += 4;
            if (template.querySelector('p')) score += 2;
            if (template.matches('a,article,li')) score += 2;
            return score;
        };

        parents.forEach((parent) => {
            const children = Array.from(parent.children);
            if (children.length < 2) {
                return;
            }

            const groups = new Map();
            children.forEach((child) => {
                const signature = `${child.tagName.toLowerCase()}::${Array.from(child.classList).sort().join('.')}`;
                if (!groups.has(signature)) {
                    groups.set(signature, []);
                }
                groups.get(signature).push(child);
            });

            groups.forEach((group) => {
                if (group.length < 2) {
                    return;
                }
                const candidate = {
                    parent,
                    template: group[0],
                    siblings: group,
                    score: scoreCandidate(group[0], group.length)
                };
                if (!best || candidate.score > best.score) {
                    best = candidate;
                }
            });
        });

        return best;
    }

    applyCmsCollectionRendering(wrapper, records = []) {
        if (!Array.isArray(records) || records.length === 0) {
            return false;
        }

        const root = wrapper.firstElementChild || wrapper;
        const repeater = this.findCmsRepeaterTemplate(root);
        if (!repeater) {
            return false;
        }

        const { parent, template, siblings } = repeater;
        const insertionPoint = siblings[0];
        siblings.forEach((node) => node.remove());

        records.forEach((record) => {
            const clone = template.cloneNode(true);
            this.applyCmsDataToElement(clone, record);
            parent.insertBefore(clone, insertionPoint);
        });

        return true;
    }

    findCmsTemplateSequence(root) {
        if (!root) {
            return null;
        }

        const parents = [root].concat(Array.from(root.querySelectorAll('*')));
        let best = null;

        const isCardNode = (node) => {
            if (!node || node.tagName !== 'DIV') {
                return false;
            }
            const hasLink = Boolean(node.querySelector('a'));
            const hasHeading = Boolean(node.querySelector('h1,h2,h3,h4,h5,h6'));
            const hasImage = Boolean(node.querySelector('img'));
            return hasLink && (hasHeading || hasImage);
        };

        parents.forEach((parent) => {
            const candidates = Array.from(parent.children).filter((child) => isCardNode(child));
            if (candidates.length < 2) {
                return;
            }
            const score = candidates.length * 10;
            if (!best || score > best.score) {
                best = { parent, templates: candidates, score };
            }
        });

        return best;
    }

    applyCmsTemplateSequenceRendering(wrapper, records = []) {
        if (!Array.isArray(records) || records.length === 0) {
            return false;
        }

        const root = wrapper.firstElementChild || wrapper;
        const sequence = this.findCmsTemplateSequence(root);
        if (!sequence) {
            return false;
        }

        const { parent, templates } = sequence;
        const insertionPoint = templates[0];
        templates.forEach((node) => node.remove());

        records.forEach((record, index) => {
            const template = templates[index % templates.length];
            const clone = template.cloneNode(true);
            this.applyCmsDataToElement(clone, record);
            parent.insertBefore(clone, insertionPoint);
        });

        return true;
    }

    applyCmsGroupedCollectionRendering(wrapper, groups = []) {
        if (!Array.isArray(groups) || groups.length === 0) {
            return false;
        }

        const root = wrapper.firstElementChild || wrapper;
        const outer = root?.firstElementChild;
        if (!outer) {
            return false;
        }

        const groupBlocks = Array.from(outer.children).filter((block) => {
            const directChildren = Array.from(block.children);
            const directSpan = directChildren.find((child) => child.tagName === 'SPAN');
            const directContainer = directChildren.find((child) => child.tagName === 'DIV');
            return Boolean(directSpan && directContainer);
        });

        if (groupBlocks.length === 0) {
            return false;
        }

        groups.slice(0, groupBlocks.length).forEach((group, index) => {
            const block = groupBlocks[index];
            const directChildren = Array.from(block.children);
            const titleNode = directChildren.find((child) => child.tagName === 'SPAN');
            const listNode = directChildren.find((child) => child.tagName === 'DIV');
            if (!titleNode || !listNode) {
                return;
            }

            if (group.title) {
                titleNode.textContent = group.title;
            }

            listNode.innerHTML = '';
            (group.items || []).forEach((record) => {
                const text = record.label ?? record.title ?? record.name ?? '';
                if (!text) {
                    return;
                }
                const tagName = group.itemTag || (record.linkHref ? 'a' : 'span');
                const el = document.createElement(tagName);
                if (group.itemClassName) {
                    el.className = group.itemClassName;
                }
                if (tagName === 'a' && record.linkHref) {
                    el.setAttribute('href', record.linkHref);
                }
                el.textContent = text;
                listNode.appendChild(el);
            });
        });

        return true;
    }

    async loadCmsCollections() {
        try {
            const result = await this.apiClient.listCmsCollections();
            this.cmsCollections = Array.isArray(result?.data) ? result.data : [];
            if (this.selectedItem) {
                this.showPropertiesPanel(this.selectedItem, this.selectedElement?.key || null);
            }
        } catch (error) {
            console.error('Failed to load CMS collections:', error);
        }
    }

    showPropertiesPanel(instanceId, elementKey = null) {
        const item = this.findComponentById(instanceId);
        if (!item || !this.propertiesPanel || !this.propertiesContent) return;
        if (item.type === 'view') {
            this.showViewPropertiesPanel(instanceId);
            return;
        }

        const defaults = this.extractDefaultsFromContent(item.content);
        const props = { ...defaults, ...(item.props || {}) };
        const layoutMeta = this.getLayoutMeta(item.content);
        const elementState = elementKey ? this.getSelectedElementState(instanceId, elementKey) : null;
        const blockConfig = item.blockConfig || props.blockConfig || {};
        const configFields = this.getComponentConfigSchema(item, props);
        const validationIssues = this.getBlockValidationIssues(item);
        const cmsBinding = props.cmsBinding || {};
        const cmsMode = cmsBinding.mode || 'record';
        const cmsSelection = cmsBinding.selection || {};
        const selectedCollection = cmsBinding.collection || '';
        if (selectedCollection && !Array.isArray(this.cmsEntriesByCollection[selectedCollection]) && !this.cmsEntriesLoadPromises[selectedCollection]) {
            this.ensureCmsEntriesLoaded(selectedCollection).then(() => {
                if (this.selectedItem === instanceId && this.propertiesPanel?.classList.contains('active')) {
                    this.showPropertiesPanel(instanceId, elementKey);
                }
            });
        }
        const selectedEntryKey = cmsSelection.entryKey || cmsSelection?.filter?.entryKey || cmsSelection?.filter?.entry_key || '';
        const cmsFields = this.getCmsCollectionFields(selectedCollection);
        const cmsEntries = this.getCachedCmsEntries(selectedCollection);
        const cmsStatus = this.getCmsBindingStatus(cmsBinding);

        const cmsCollectionOptions = ['<option value="">No CMS binding</option>']
            .concat(this.cmsCollections.map((collection) => {
                const selected = collection.slug === selectedCollection ? ' selected' : '';
                return `<option value="${this.escapeAttribute(collection.slug)}"${selected}>${this.escapeHtml(collection.name || collection.slug)}</option>`;
            }))
            .join('');
        const cmsEntryOptions = ['<option value="">First matching entry</option>']
            .concat(cmsEntries.map((entry) => {
                const value = entry.entryKey || '';
                const selected = value === selectedEntryKey ? ' selected' : '';
                return `<option value="${this.escapeAttribute(value)}"${selected}>${this.escapeHtml(this.getCmsEntryLabel(entry))}</option>`;
            }))
            .join('');
        const cmsFieldOptions = ['<option value="">Choose field</option>']
            .concat(cmsFields.map((field) => `<option value="${this.escapeAttribute(field.name)}">${this.escapeHtml(field.label || field.name)}</option>`))
            .join('');
        const currentRegion = this.normalizeRegionId(item.region, this.inferRegionForComponent(item.componentPath));
        if (item.region !== currentRegion) {
            item.region = currentRegion;
        }
        const allowedRegions = this.getAllowedRegionsForComponent(item.componentPath, item.type);

        this.propertiesPanel.classList.add('active');

        const renderConfigField = (field) => {
            const target = field.target === 'props' ? 'props' : 'blockConfig';
            const value = target === 'props' ? (props[field.name] ?? '') : (blockConfig[field.name] ?? field.default ?? '');
            const id = `propConfig_${target}_${field.name}`.replace(/[^a-zA-Z0-9_-]/g, '_');
            const type = String(field.type || 'text').toLowerCase();
            const label = this.escapeHtml(field.label || field.name);
            const requiredMarker = field.required ? '<span class="required-marker">Required</span>' : '';
            const valueAttr = this.escapeAttribute(value);
            if (type === 'boolean' || type === 'checkbox') {
                return `
                    <div class="form-group">
                        <label class="checkbox-row">
                            <input type="checkbox" id="${id}" data-config-target="${target}" data-config-name="${this.escapeAttribute(field.name)}"${value ? ' checked' : ''}>
                            <span>${label}</span>
                        </label>
                    </div>
                `;
            }
            if (type === 'select' && Array.isArray(field.options)) {
                const options = field.options.map((option) => {
                    const optionValue = typeof option === 'object' ? option.value : option;
                    const optionLabel = typeof option === 'object' ? (option.label || option.value) : option;
                    return `<option value="${this.escapeAttribute(optionValue)}"${String(optionValue) === String(value) ? ' selected' : ''}>${this.escapeHtml(optionLabel)}</option>`;
                }).join('');
                return `
                    <div class="form-group">
                        <label for="${id}">${label}${requiredMarker}</label>
                        <select id="${id}" data-config-target="${target}" data-config-name="${this.escapeAttribute(field.name)}">${options}</select>
                    </div>
                `;
            }
            if (type === 'textarea' || type === 'richtext' || type === 'rich text') {
                return `
                    <div class="form-group">
                        <label for="${id}">${label}${requiredMarker}</label>
                        <textarea id="${id}" rows="4" data-config-target="${target}" data-config-name="${this.escapeAttribute(field.name)}">${this.escapeHtml(value)}</textarea>
                    </div>
                `;
            }
            const inputType = type === 'number' ? 'number' : type === 'url' ? 'url' : 'text';
            return `
                <div class="form-group">
                    <label for="${id}">${label}${requiredMarker}</label>
                    <input type="${inputType}" value="${valueAttr}" id="${id}" data-config-target="${target}" data-config-name="${this.escapeAttribute(field.name)}">
                </div>
            `;
        };

        const contentPanel = `
            <section class="properties-tab-panel active" data-tab-panel="content">
                <div class="properties-section">
                    <div class="properties-title">Component</div>
                    <div class="form-group">
                        <label>Component Type</label>
                        <input type="text" value="${this.escapeAttribute(item.type)}" disabled>
                    </div>
                    <div class="form-group">
                        <label>${item.type === 'micro' ? 'Component ID' : 'File Path'}</label>
                        <input type="text" value="${this.escapeAttribute(item.componentPath)}" disabled>
                    </div>
                    <div class="form-group">
                        <label>Component Name</label>
                        <input type="text" value="${this.escapeAttribute(item.name || '')}" id="propName">
                    </div>
                </div>
                ${elementState ? `
                    <div class="properties-section">
                        <div class="properties-title">Selected Element</div>
                        <div class="property-chip-row">
                            <span class="property-chip">${this.escapeHtml(elementState.tag)}</span>
                            <span class="property-chip">${this.escapeHtml(elementState.key)}</span>
                        </div>
                        ${elementState.canEditText ? `<div class="form-group"><label>Text Content</label><textarea id="propElementText" rows="4">${this.escapeHtml(elementState.text || '')}</textarea></div>` : ''}
                        ${elementState.isLink ? `<div class="form-group"><label>Href</label><input type="text" value="${this.escapeAttribute(elementState.href || '')}" id="propElementHref"></div>` : ''}
                        ${elementState.isImage ? `
                            <div class="form-group"><label>Image Src</label><input type="text" value="${this.escapeAttribute(elementState.src || '')}" id="propElementSrc"></div>
                            <div class="form-group"><label>Image Alt</label><input type="text" value="${this.escapeAttribute(elementState.alt || '')}" id="propElementAlt"></div>
                            <button type="button" class="btn btn-secondary property-action-btn" id="propReplaceImage">Replace Image</button>
                        ` : ''}
                        <div class="form-group"><label>Element ID</label><input type="text" value="${this.escapeAttribute(elementState.id || '')}" id="propElementId"></div>
                        <div class="form-group"><label>Class</label><textarea id="propElementClass" rows="3">${this.escapeHtml(elementState.className || '')}</textarea></div>
                        <div class="form-group"><label>Title Attribute</label><input type="text" value="${this.escapeAttribute(elementState.title || '')}" id="propElementTitle"></div>
                        <div class="form-group"><label>Inline Style</label><textarea id="propElementStyle" rows="4">${this.escapeHtml(elementState.style || '')}</textarea></div>
                    </div>
                ` : `
                    <div class="properties-section">
                        <div class="properties-title">${configFields.length ? 'Block Configuration' : 'Quick Props'}</div>
                        ${configFields.length ? configFields.map(renderConfigField).join('') : '<p class="project-note">No editable content fields were inferred for this block.</p>'}
                    </div>
                `}
            </section>
        `;

        const stylePanel = `
            <section class="properties-tab-panel" data-tab-panel="style">
                ${layoutMeta.isLayout ? `
                    <div class="properties-section">
                        <div class="properties-title">Layout Style</div>
                        <div class="form-group"><label>Layout Gap (px)</label><input type="number" min="0" value="${this.escapeAttribute(props.layoutGap || '')}" id="propLayoutGap" placeholder="24"></div>
                        <div class="form-group"><label>Layout Padding (px)</label><input type="number" min="0" value="${this.escapeAttribute(props.layoutPadding || '')}" id="propLayoutPadding" placeholder="0"></div>
                        <div class="form-group">
                            <label>Align Items</label>
                            <select id="propLayoutAlign">
                                <option value="">Default</option>
                                <option value="flex-start">Start</option>
                                <option value="center">Center</option>
                                <option value="flex-end">End</option>
                                <option value="stretch">Stretch</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Justify Content</label>
                            <select id="propLayoutJustify">
                                <option value="">Default</option>
                                <option value="flex-start">Start</option>
                                <option value="center">Center</option>
                                <option value="flex-end">End</option>
                                <option value="space-between">Space Between</option>
                                <option value="space-around">Space Around</option>
                            </select>
                        </div>
                        <div class="form-group"><label>Background Color</label><input type="text" value="${this.escapeAttribute(props.layoutBg || '')}" id="propLayoutBg" placeholder="#ffffff"></div>
                        ${layoutMeta.isGrid ? `<div class="form-group"><label>Grid Columns</label><select id="propLayoutColumns"><option value="">Default</option><option value="2">2 Columns</option><option value="3">3 Columns</option><option value="4">4 Columns</option></select></div>` : ''}
                        ${layoutMeta.isFlex ? `<div class="form-group"><label class="checkbox-row"><input type="checkbox" id="propLayoutReverse"><span>Reverse Order</span></label></div>` : ''}
                    </div>
                ` : '<div class="properties-section"><p class="project-note">This block does not expose layout style controls.</p></div>'}
            </section>
        `;

        const cmsPanel = `
            <section class="properties-tab-panel" data-tab-panel="cms">
                ${elementState ? '<div class="properties-section"><p class="project-note">CMS bindings are configured at the block level.</p></div>' : `
                    <div class="properties-section">
                        <div class="properties-title">CMS Binding</div>
                        <div class="cms-binding-status cms-binding-status-${cmsStatus.type}">
                            <strong>${this.escapeHtml(cmsStatus.title)}</strong>
                            <span>${this.escapeHtml(cmsStatus.message)}</span>
                        </div>
                        <div class="cms-binding-grid">
                            <div class="form-group"><label>Collection</label><select id="propCmsCollection">${cmsCollectionOptions}</select></div>
                            <div class="form-group">
                                <label>Mode</label>
                                <select id="propCmsMode">
                                    <option value="record"${cmsMode === 'record' ? ' selected' : ''}>Record</option>
                                    <option value="collection"${cmsMode === 'collection' ? ' selected' : ''}>Collection</option>
                                </select>
                            </div>
                            <div class="form-group cms-record-only"><label>Entry</label><select id="propCmsEntry">${cmsEntryOptions}</select></div>
                            <div class="form-group cms-collection-only"><label>Sort</label><input type="text" value="${this.escapeAttribute(cmsSelection.sort || '')}" id="propCmsSort" placeholder="sort_order:asc"></div>
                            <div class="form-group cms-collection-only"><label>Limit</label><input type="number" min="0" value="${this.escapeAttribute(cmsSelection.limit || '')}" id="propCmsLimit" placeholder="0"></div>
                            <div class="form-group"><label>Fallback Mode</label><select id="propCmsFallback"><option value="static"${(cmsBinding.fallback || 'static') === 'static' ? ' selected' : ''}>Static fallback</option><option value="empty"${cmsBinding.fallback === 'empty' ? ' selected' : ''}>Render empty</option></select></div>
                            <div class="form-group"><label>Filters JSON</label><textarea id="propCmsFilter" rows="4" placeholder='{"active":true}'>${this.escapeHtml(JSON.stringify(cmsSelection.filter || {}, null, 2))}</textarea></div>
                            <div class="form-group cms-collection-only"><label>Grouping JSON</label><textarea id="propCmsGroups" rows="4" placeholder='[{"title":"Featured","filter":{"featured":true}}]'>${this.escapeHtml(JSON.stringify(cmsSelection.groups || [], null, 2))}</textarea></div>
                        </div>
                    </div>
                    <div class="properties-section">
                        <div class="properties-title">Field Map</div>
                        <div id="propCmsFieldMapRows" class="cms-field-map-rows">
                            ${Object.entries(cmsBinding.fieldMap || {}).map(([target, source]) => `
                                <div class="cms-field-map-row">
                                    <input type="text" class="prop-cms-map-target" value="${this.escapeAttribute(target)}" placeholder="Block prop">
                                    <select class="prop-cms-map-source" data-selected-source="${this.escapeAttribute(source)}">${cmsFieldOptions}</select>
                                    <button type="button" class="btn btn-secondary prop-cms-map-remove" title="Remove field map"><i class="fas fa-times"></i></button>
                                </div>
                            `).join('')}
                        </div>
                        <button type="button" class="btn btn-secondary property-action-btn" id="propCmsAddFieldMap">Add Field Map</button>
                        <div class="cms-binding-actions">
                            <button type="button" class="btn btn-secondary" id="propCmsOpenManager">Open CMS</button>
                            <button type="button" class="btn btn-secondary" id="propCmsClear">Clear Binding</button>
                        </div>
                    </div>
                `}
            </section>
        `;

        const regionPanel = `
            <section class="properties-tab-panel" data-tab-panel="region">
                <div class="properties-section">
                    <div class="properties-title">Region</div>
                    <div class="form-group">
                        <label>Layout Region</label>
                        <select id="propRegion">
                            ${this.layoutRegions.map((region) => {
                                const disabled = allowedRegions.length && !allowedRegions.includes(region.id) ? ' disabled' : '';
                                return `<option value="${region.id}"${region.id === currentRegion ? ' selected' : ''}${disabled}>${this.escapeHtml(region.name)}</option>`;
                            }).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="checkbox-row">
                            <input type="checkbox" id="propVisible"${item.visible !== false ? ' checked' : ''}>
                            <span>Visible</span>
                        </label>
                    </div>
                    <p class="project-note">Allowed regions: ${allowedRegions.map((id) => this.getRegionDefinition(id)?.name || id).join(', ') || 'Any'}.</p>
                    ${validationIssues.length ? validationIssues.map((issue) => `
                        <div class="cms-binding-status cms-binding-status-warning">
                            <strong>${this.escapeHtml(issue.title)}</strong>
                            <span>${this.escapeHtml(issue.message)}</span>
                        </div>
                    `).join('') : ''}
                </div>
            </section>
        `;

        const advancedPanel = `
            <section class="properties-tab-panel" data-tab-panel="advanced">
                <div class="properties-section">
                    <div class="properties-title">Debug JSON</div>
                    <div class="form-group"><label>Block Config JSON</label><textarea id="propBlockConfigJson" rows="7">${this.escapeHtml(JSON.stringify(blockConfig, null, 2))}</textarea></div>
                    <div class="form-group"><label>CMS Binding JSON</label><textarea id="propCmsBindingJson" rows="10" readonly>${this.escapeHtml(JSON.stringify(props.cmsBinding || null, null, 2))}</textarea></div>
                    <p class="project-note">Raw binding JSON is shown for debugging. Use the CMS Binding tab to edit binding metadata.</p>
                </div>
            </section>
        `;

        this.propertiesContent.innerHTML = `
            <div class="properties-tabs" role="tablist" aria-label="Block properties">
                <button type="button" class="properties-tab active" role="tab" aria-selected="true" data-tab="content">Content</button>
                <button type="button" class="properties-tab" role="tab" aria-selected="false" tabindex="-1" data-tab="style">Style</button>
                <button type="button" class="properties-tab" role="tab" aria-selected="false" tabindex="-1" data-tab="cms">CMS Binding</button>
                <button type="button" class="properties-tab" role="tab" aria-selected="false" tabindex="-1" data-tab="region">Region</button>
                <button type="button" class="properties-tab" role="tab" aria-selected="false" tabindex="-1" data-tab="advanced">Advanced</button>
            </div>
            ${contentPanel}${stylePanel}${cmsPanel}${regionPanel}${advancedPanel}
        `;

        const bindProp = (id, fn, eventName = 'input') => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener(eventName, (e) => fn(e.target.value, e));
        };

        bindProp('propName', (value) => this.updateComponentProps(instanceId, { name: value }));

        const activatePropertiesTab = (button) => {
                const tab = button.dataset.tab;
                this.propertiesContent.querySelectorAll('.properties-tab').forEach((entry) => {
                    entry.classList.toggle('active', entry === button);
                    entry.setAttribute('aria-selected', String(entry === button));
                    entry.setAttribute('tabindex', entry === button ? '0' : '-1');
                });
                this.propertiesContent.querySelectorAll('.properties-tab-panel').forEach((panel) => {
                    panel.classList.toggle('active', panel.dataset.tabPanel === tab);
                });
        };

        const propertyTabs = Array.from(this.propertiesContent.querySelectorAll('.properties-tab'));
        propertyTabs.forEach((button) => {
            button.addEventListener('click', () => {
                activatePropertiesTab(button);
            });
            button.addEventListener('keydown', (event) => {
                if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                const currentIndex = propertyTabs.indexOf(button);
                let nextIndex = currentIndex;
                if (event.key === 'Home') nextIndex = 0;
                else if (event.key === 'End') nextIndex = propertyTabs.length - 1;
                else {
                    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : -1;
                    nextIndex = (currentIndex + direction + propertyTabs.length) % propertyTabs.length;
                }
                propertyTabs[nextIndex]?.focus();
                activatePropertiesTab(propertyTabs[nextIndex]);
            });
        });

        this.propertiesContent.querySelectorAll('[data-config-name]').forEach((control) => {
            const eventName = control.type === 'checkbox' || control.tagName === 'SELECT' ? 'change' : 'input';
            control.addEventListener(eventName, (e) => {
                const target = e.currentTarget.dataset.configTarget || 'blockConfig';
                const name = e.currentTarget.dataset.configName;
                const value = e.currentTarget.type === 'checkbox' ? e.currentTarget.checked : e.currentTarget.value;
                if (!name) return;
                if (target === 'props') {
                    this.updateComponentProps(instanceId, { props: { [name]: value } });
                    return;
                }
                const current = this.findComponentById(instanceId);
                const nextConfig = { ...(current?.blockConfig || {}) };
                if (value === '' || value === null || value === undefined) {
                    delete nextConfig[name];
                } else {
                    nextConfig[name] = value;
                }
                this.updateComponentProps(instanceId, {
                    blockConfig: nextConfig,
                    props: { blockConfig: nextConfig }
                });
            });
        });

        if (elementState) {
            bindProp('propElementText', (value) => this.updateElementTextProperty(instanceId, elementState.key, value));
            bindProp('propElementHref', (value) => this.updateElementAttributeProperty(instanceId, elementState.key, 'href', value));
            bindProp('propElementSrc', (value) => this.updateElementAttributeProperty(instanceId, elementState.key, 'src', value));
            bindProp('propElementAlt', (value) => this.updateElementAttributeProperty(instanceId, elementState.key, 'alt', value));
            bindProp('propElementId', (value) => this.updateElementAttributeProperty(instanceId, elementState.key, 'id', value));
            bindProp('propElementClass', (value) => this.updateElementAttributeProperty(instanceId, elementState.key, 'className', value));
            bindProp('propElementTitle', (value) => this.updateElementAttributeProperty(instanceId, elementState.key, 'title', value));
            bindProp('propElementStyle', (value) => this.updateElementAttributeProperty(instanceId, elementState.key, 'style', value));

            const replaceBtn = document.getElementById('propReplaceImage');
            if (replaceBtn) {
                replaceBtn.addEventListener('click', () => {
                    this.openImageModal({
                        instanceId,
                        inlineKey: elementState.key,
                        singleImageProp: Boolean(elementState.legacyBindings?.src),
                        currentSrc: elementState.src || '',
                        alt: elementState.alt || ''
                    });
                });
            }
        }

        if (layoutMeta.isLayout) {
            const alignSelect = document.getElementById('propLayoutAlign');
            if (alignSelect) {
                alignSelect.value = props.layoutAlign || '';
                alignSelect.addEventListener('change', (e) => {
                    this.updateComponentProps(instanceId, { props: { layoutAlign: e.target.value } });
                });
            }
            const justifySelect = document.getElementById('propLayoutJustify');
            if (justifySelect) {
                justifySelect.value = props.layoutJustify || '';
                justifySelect.addEventListener('change', (e) => {
                    this.updateComponentProps(instanceId, { props: { layoutJustify: e.target.value } });
                });
            }
            if (layoutMeta.isGrid) {
                const columnsSelect = document.getElementById('propLayoutColumns');
                if (columnsSelect) {
                    columnsSelect.value = props.layoutColumns || layoutMeta.columns || '';
                    columnsSelect.addEventListener('change', (e) => {
                        this.updateComponentProps(instanceId, { props: { layoutColumns: e.target.value } });
                    });
                }
            }
            if (layoutMeta.isFlex) {
                const reverseToggle = document.getElementById('propLayoutReverse');
                if (reverseToggle) {
                    reverseToggle.checked = Boolean(props.layoutReverse);
                    reverseToggle.addEventListener('change', (e) => {
                        this.updateComponentProps(instanceId, { props: { layoutReverse: e.target.checked } });
                    });
                }
            }
            bindProp('propLayoutGap', (value) => this.updateComponentProps(instanceId, { props: { layoutGap: value } }));
            bindProp('propLayoutPadding', (value) => this.updateComponentProps(instanceId, { props: { layoutPadding: value } }));
            bindProp('propLayoutBg', (value) => this.updateComponentProps(instanceId, { props: { layoutBg: value } }));
        }

        const regionSelect = document.getElementById('propRegion');
        if (regionSelect) {
            regionSelect.addEventListener('change', (e) => {
                const nextRegion = this.normalizeRegionId(e.target.value, item.region || 'main');
                this.pushHistory();
                item.region = nextRegion;
                this.renderCanvasFromState();
                this.refreshLivePreview();
                this.showPropertiesPanel(instanceId);
            });
        }

        const visibleToggle = document.getElementById('propVisible');
        if (visibleToggle) {
            visibleToggle.addEventListener('change', (e) => {
                item.visible = e.target.checked;
                this.renderCanvasFromState();
                this.refreshLivePreview();
            });
        }

        const blockConfigJson = document.getElementById('propBlockConfigJson');
        if (blockConfigJson) {
            blockConfigJson.addEventListener('change', () => {
                try {
                    const nextConfig = this.parseJsonInput(blockConfigJson.value, {}) || {};
                    this.updateComponentProps(instanceId, {
                        blockConfig: nextConfig,
                        props: { blockConfig: nextConfig }
                    });
                    this.showPropertiesPanel(instanceId);
                } catch (error) {
                    this.showToast(`Invalid block config JSON: ${error.message}`, 'error');
                }
            });
        }

        if (!elementState) {
            const syncCmsModeVisibility = () => {
                const mode = document.getElementById('propCmsMode')?.value || 'record';
                this.propertiesContent.querySelectorAll('.cms-record-only').forEach((el) => {
                    el.hidden = mode !== 'record';
                });
                this.propertiesContent.querySelectorAll('.cms-collection-only').forEach((el) => {
                    el.hidden = mode !== 'collection';
                });
            };

            const readFieldMapRows = () => {
                const rows = Array.from(this.propertiesContent.querySelectorAll('.cms-field-map-row'));
                return rows.reduce((acc, row) => {
                    const target = row.querySelector('.prop-cms-map-target')?.value?.trim();
                    const source = row.querySelector('.prop-cms-map-source')?.value?.trim();
                    if (target && source) {
                        acc[target] = source;
                    }
                    return acc;
                }, {});
            };

            const updateCmsBinding = () => {
                const collectionValue = document.getElementById('propCmsCollection')?.value || '';
                if (!collectionValue) {
                    this.updateComponentProps(instanceId, { props: { cmsBinding: null } });
                    return;
                }

                let filter = {};
                let groups = [];
                try {
                    filter = this.parseJsonInput(document.getElementById('propCmsFilter')?.value, {}) || {};
                    groups = this.parseJsonInput(document.getElementById('propCmsGroups')?.value, []) || [];
                } catch (error) {
                    this.showToast(`Invalid CMS binding JSON: ${error.message}`, 'error');
                    return;
                }

                const mode = document.getElementById('propCmsMode')?.value || 'record';
                const entryKey = document.getElementById('propCmsEntry')?.value || '';
                if (mode === 'record' && entryKey) {
                    filter.entryKey = entryKey;
                }
                const sort = document.getElementById('propCmsSort')?.value?.trim() || '';
                const limitRaw = document.getElementById('propCmsLimit')?.value;
                const limit = Number(limitRaw);
                const selection = { filter };
                if (mode === 'collection') {
                    if (sort) selection.sort = sort;
                    if (Number.isFinite(limit) && limit > 0) selection.limit = limit;
                    if (Array.isArray(groups) && groups.length > 0) selection.groups = groups;
                }

                this.updateComponentProps(instanceId, {
                    props: {
                        cmsBinding: {
                            source: 'cms',
                            mode,
                            collection: collectionValue,
                            selection,
                            fieldMap: readFieldMapRows(),
                            fallback: document.getElementById('propCmsFallback')?.value || 'static'
                        }
                    }
                });

                this.ensureCmsEntriesLoaded(collectionValue).then(() => {
                    if (this.selectedItem === instanceId) {
                        this.showPropertiesPanel(instanceId);
                    }
                });
            };

            const cmsCollectionSelect = document.getElementById('propCmsCollection');
            const cmsModeSelect = document.getElementById('propCmsMode');
            const cmsEntrySelect = document.getElementById('propCmsEntry');
            const cmsFilterInput = document.getElementById('propCmsFilter');
            const cmsGroupsInput = document.getElementById('propCmsGroups');
            const cmsSortInput = document.getElementById('propCmsSort');
            const cmsLimitInput = document.getElementById('propCmsLimit');
            const cmsFallbackInput = document.getElementById('propCmsFallback');
            const cmsOpenButton = document.getElementById('propCmsOpenManager');
            const cmsClearButton = document.getElementById('propCmsClear');
            const fieldMapRows = document.getElementById('propCmsFieldMapRows');
            const addFieldMapButton = document.getElementById('propCmsAddFieldMap');

            this.propertiesContent.querySelectorAll('.prop-cms-map-source').forEach((select) => {
                const selected = select.dataset.selectedSource || '';
                if (selected) {
                    select.value = selected;
                }
            });

            if (cmsCollectionSelect) {
                cmsCollectionSelect.addEventListener('change', updateCmsBinding);
            }
            if (cmsModeSelect) {
                cmsModeSelect.addEventListener('change', () => {
                    syncCmsModeVisibility();
                    updateCmsBinding();
                });
            }
            if (cmsEntrySelect) {
                cmsEntrySelect.addEventListener('change', updateCmsBinding);
            }
            if (cmsFilterInput) {
                cmsFilterInput.addEventListener('change', updateCmsBinding);
            }
            if (cmsGroupsInput) {
                cmsGroupsInput.addEventListener('change', updateCmsBinding);
            }
            if (cmsSortInput) {
                cmsSortInput.addEventListener('change', updateCmsBinding);
            }
            if (cmsLimitInput) {
                cmsLimitInput.addEventListener('change', updateCmsBinding);
            }
            if (cmsFallbackInput) {
                cmsFallbackInput.addEventListener('change', updateCmsBinding);
            }
            if (fieldMapRows) {
                fieldMapRows.addEventListener('input', (event) => {
                    if (event.target.matches('.prop-cms-map-target')) updateCmsBinding();
                });
                fieldMapRows.addEventListener('change', (event) => {
                    if (event.target.matches('.prop-cms-map-source')) updateCmsBinding();
                });
                fieldMapRows.addEventListener('click', (event) => {
                    const remove = event.target.closest('.prop-cms-map-remove');
                    if (!remove) return;
                    remove.closest('.cms-field-map-row')?.remove();
                    updateCmsBinding();
                });
            }
            if (addFieldMapButton && fieldMapRows) {
                addFieldMapButton.addEventListener('click', () => {
                    const row = document.createElement('div');
                    row.className = 'cms-field-map-row';
                    row.innerHTML = `
                        <input type="text" class="prop-cms-map-target" placeholder="Block prop">
                        <select class="prop-cms-map-source">${document.querySelector('.prop-cms-map-source')?.innerHTML || '<option value="">Choose field</option>'}</select>
                        <button type="button" class="btn btn-secondary prop-cms-map-remove" title="Remove field map"><i class="fas fa-times"></i></button>
                    `;
                    fieldMapRows.appendChild(row);
                    row.querySelector('.prop-cms-map-target')?.focus();
                });
            }
            if (cmsOpenButton) {
                cmsOpenButton.addEventListener('click', () => this.openCmsModal());
            }
            if (cmsClearButton) {
                cmsClearButton.addEventListener('click', () => {
                    this.updateComponentProps(instanceId, { props: { cmsBinding: null } });
                    this.showPropertiesPanel(instanceId);
                });
            }
            syncCmsModeVisibility();
        }
    }

    toggleInspectorPanel() {
        if (!this.inspectorPanel) return;
        const isActive = this.inspectorPanel.classList.toggle('active');
        if (this.btnInspect) {
            this.btnInspect.classList.toggle('btn-primary', isActive);
            this.btnInspect.classList.toggle('btn-secondary', !isActive);
        }
        if (isActive) {
            this.updateInspector(this.selectedItem);
        }
    }

    hideInspectorPanel() {
        if (!this.inspectorPanel) return;
        this.inspectorPanel.classList.remove('active');
        if (this.btnInspect) {
            this.btnInspect.classList.remove('btn-primary');
            this.btnInspect.classList.add('btn-secondary');
        }
    }

    updateInspector(instanceId, elementKey = null) {
        if (!this.inspectorContent) return;
        if (!instanceId) {
            this.inspectorContent.innerHTML = '<p class="no-selection">Select a component to inspect its layout</p>';
            return;
        }

          const item = this.findComponentById(instanceId);
          if (!item) {
              this.inspectorContent.innerHTML = '<p class="no-selection">Select a component to inspect its layout</p>';
              return;
          }

        const canvasItem = document.querySelector(`.canvas-item[data-instance-id="${instanceId}"]`);
        if (!canvasItem) {
            this.inspectorContent.innerHTML = '<p class="no-selection">Select a component to inspect its layout</p>';
            return;
        }

        const preview = canvasItem.querySelector('.content-preview');
        const contentRoot = preview?.firstElementChild || preview;
        if (!contentRoot) {
            this.inspectorContent.innerHTML = '<p class="no-selection">No rendered element available</p>';
            return;
        }

        const primary = elementKey
            ? this.findElementByInlineKey(contentRoot, elementKey)
            : contentRoot;
        if (!primary) {
            this.inspectorContent.innerHTML = '<p class="no-selection">No rendered element available</p>';
            return;
        }

        const styles = window.getComputedStyle(primary);
        const rect = primary.getBoundingClientRect();
        const formatBox = (t, r, b, l) => `${t} ${r} ${b} ${l}`;
        const px = (value) => {
            const parsed = parseFloat(String(value || '0'));
            return Number.isFinite(parsed) ? `${Math.round(parsed)}px` : String(value || '0');
        };
        const boxModelHtml = `
            <div class="inspector-section">
                <div class="inspector-title">Box Model</div>
                <div class="box-model">
                    <div class="box-model-layer box-model-margin">
                        <div class="box-model-label box-model-label-top">${px(styles.marginTop)}</div>
                        <div class="box-model-label box-model-label-right">${px(styles.marginRight)}</div>
                        <div class="box-model-label box-model-label-bottom">${px(styles.marginBottom)}</div>
                        <div class="box-model-label box-model-label-left">${px(styles.marginLeft)}</div>
                        <div class="box-model-caption">margin</div>
                        <div class="box-model-layer box-model-border">
                            <div class="box-model-label box-model-label-top">${px(styles.borderTopWidth)}</div>
                            <div class="box-model-label box-model-label-right">${px(styles.borderRightWidth)}</div>
                            <div class="box-model-label box-model-label-bottom">${px(styles.borderBottomWidth)}</div>
                            <div class="box-model-label box-model-label-left">${px(styles.borderLeftWidth)}</div>
                            <div class="box-model-caption">border</div>
                            <div class="box-model-layer box-model-padding">
                                <div class="box-model-label box-model-label-top">${px(styles.paddingTop)}</div>
                                <div class="box-model-label box-model-label-right">${px(styles.paddingRight)}</div>
                                <div class="box-model-label box-model-label-bottom">${px(styles.paddingBottom)}</div>
                                <div class="box-model-label box-model-label-left">${px(styles.paddingLeft)}</div>
                                <div class="box-model-caption">padding</div>
                                <div class="box-model-content">
                                    <span>${Math.round(rect.width)} x ${Math.round(rect.height)}</span>
                                    <small>${styles.display}</small>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const details = [
            ['Tag', primary.tagName.toLowerCase()],
            ['ID', primary.id || '--'],
            ['Class', primary.className || '--']
        ];

        const box = [
            ['Width', `${Math.round(rect.width)}px`],
            ['Height', `${Math.round(rect.height)}px`],
            ['Min Size', `${styles.minWidth} / ${styles.minHeight}`],
            ['Max Size', `${styles.maxWidth} / ${styles.maxHeight}`],
            ['Box Sizing', styles.boxSizing]
        ];

        const spacing = [
            ['Padding', formatBox(styles.paddingTop, styles.paddingRight, styles.paddingBottom, styles.paddingLeft)],
            ['Margin', formatBox(styles.marginTop, styles.marginRight, styles.marginBottom, styles.marginLeft)],
            ['Border', formatBox(styles.borderTopWidth, styles.borderRightWidth, styles.borderBottomWidth, styles.borderLeftWidth)]
        ];

        const layout = [
            ['Display', styles.display],
            ['Position', styles.position],
            ['Overflow', `${styles.overflowX} / ${styles.overflowY}`],
            ['Z-Index', styles.zIndex === 'auto' ? 'auto' : styles.zIndex]
        ];

        const flex = [
            ['Flex Dir', styles.flexDirection],
            ['Flex Wrap', styles.flexWrap],
            ['Justify', styles.justifyContent],
            ['Align Items', styles.alignItems],
            ['Align Content', styles.alignContent],
            ['Gap', styles.gap]
        ];

        const grid = [
            ['Grid Cols', styles.gridTemplateColumns],
            ['Grid Rows', styles.gridTemplateRows],
            ['Auto Flow', styles.gridAutoFlow],
            ['Row Gap', styles.rowGap],
            ['Col Gap', styles.columnGap]
        ];

        const renderSection = (title, rows) => `
            <div class="inspector-section">
                <div class="inspector-title">${title}</div>
                ${rows.map(([label, value]) => `
                    <div class="inspector-row">
                        <span class="inspector-label">${label}</span>
                        <span class="inspector-value">${value || '—'}</span>
                    </div>
                `).join('')}
            </div>
        `;

        this.inspectorContent.innerHTML = [
            boxModelHtml,
            renderSection('Element', details),
            renderSection('Box', box),
            renderSection('Spacing', spacing),
            renderSection('Layout', layout),
            renderSection('Flex', flex),
            renderSection('Grid', grid)
        ].join('');
    }

      extractDefaultsFromContent(html) {
          const wrapper = document.createElement('div');
          wrapper.innerHTML = html;
          const heading = wrapper.querySelector('h1,h2,h3,h4,h5,h6');
        const paragraph = wrapper.querySelector('p');
        const link = wrapper.querySelector('a');
        const image = wrapper.querySelector('img');
          return {
              title: heading ? heading.textContent : '',
              text: paragraph ? paragraph.textContent : '',
              linkText: link ? link.textContent : '',
              linkHref: link ? (link.getAttribute('href') || '') : '',
              imageSrc: image ? (image.getAttribute('src') || '') : '',
              imageAlt: image ? (image.getAttribute('alt') || '') : ''
          };
      }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    escapeAttribute(value) {
        return this.escapeHtml(value);
    }

    getRenderedContentRoot(item) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = this.getRenderedComponentContent(item, { forCanvas: true });
        return wrapper.firstElementChild || null;
    }

    getSelectableElements(rootEl, options = {}) {
        if (!rootEl) return [];
        const includeRoot = options.includeRoot !== false;
        const nodes = includeRoot ? [rootEl, ...Array.from(rootEl.querySelectorAll('*'))] : Array.from(rootEl.querySelectorAll('*'));
        return nodes.filter((el) => this.isSelectableCanvasElement(el, rootEl, options.container || null));
    }

    isSelectableCanvasElement(el, rootEl, containerEl) {
        if (!el || !rootEl) return false;
        const tag = el.tagName.toLowerCase();
        if (['script', 'style', 'br', 'wbr'].includes(tag)) return false;
        if (el.classList.contains('micro-slot')) return false;
        if (containerEl) {
            const owner = el.closest('.canvas-item');
            if (owner && owner !== containerEl) return false;
        }
        if (!containerEl && el.closest('.micro-slot')) return false;
        return true;
    }

    findElementByInlineKey(rootEl, key) {
        if (!rootEl || !key) return null;
        return this.getSelectableElements(rootEl, { includeRoot: true })
            .find((el) => this.getInlineKeyForElement(el, rootEl) === key) || null;
    }

    getLegacyBindingsForElement(item, elementKey) {
        const root = this.getRenderedContentRoot(item);
        if (!root || !elementKey) {
            return {};
        }
        const resolveKey = (selector) => {
            const el = root.querySelector(selector);
            return el ? this.getInlineKeyForElement(el, root) : '';
        };
        const bindings = {};
        if (resolveKey('h1,h2,h3,h4,h5,h6') === elementKey) {
            bindings.text = 'title';
        }
        if (resolveKey('p') === elementKey) {
            bindings.text = 'text';
        }
        const primaryLink = root.querySelector('a,button');
        if (primaryLink && this.getInlineKeyForElement(primaryLink, root) === elementKey) {
            bindings.text = 'linkText';
        }
        const anchor = root.querySelector('a');
        if (anchor && this.getInlineKeyForElement(anchor, root) === elementKey) {
            bindings.href = 'linkHref';
        }
        const image = root.querySelector('img');
        if (image && this.getInlineKeyForElement(image, root) === elementKey) {
            bindings.src = 'imageSrc';
            bindings.alt = 'imageAlt';
        }
        return bindings;
    }

    getSelectedElementState(instanceId, elementKey) {
        const item = this.findComponentById(instanceId);
        if (!item) return null;
        const canvasItem = document.querySelector(`.canvas-item[data-instance-id="${instanceId}"]`);
        const previewRoot = canvasItem?.querySelector('.content-preview')?.firstElementChild || null;
        let element = previewRoot ? this.findElementByInlineKey(previewRoot, elementKey) : null;
        if (!element) {
            const renderedRoot = this.getRenderedContentRoot(item);
            element = renderedRoot ? this.findElementByInlineKey(renderedRoot, elementKey) : null;
        }
        if (!element) return null;

        const tag = element.tagName.toLowerCase();
        const textValue = tag === 'img' ? '' : (element.textContent || '');
        return {
            key: elementKey,
            tag,
            text: textValue,
            href: element.getAttribute('href') || '',
            src: element.getAttribute('src') || '',
            alt: element.getAttribute('alt') || '',
            id: element.getAttribute('id') || '',
            className: element.getAttribute('class') || '',
            title: element.getAttribute('title') || '',
            style: element.getAttribute('style') || '',
            canEditText: tag !== 'img' && tag !== 'input' && tag !== 'textarea' && tag !== 'select',
            isLink: tag === 'a',
            isImage: tag === 'img',
            legacyBindings: this.getLegacyBindingsForElement(item, elementKey)
        };
    }

      getLayoutMeta(html) {
          const wrapper = document.createElement('div');
          wrapper.innerHTML = html || '';
          const root = wrapper.firstElementChild;
          const hasSlots = Boolean(wrapper.querySelector('.micro-slot'));
          const display = root ? root.style.display : '';
          const isGrid = display === 'grid';
          const isFlex = display === 'flex';
          let columns = '';
          if (isGrid && root) {
              const template = root.style.gridTemplateColumns || '';
              const match = template.match(/repeat\((\d+)/i);
              if (match) {
                  columns = match[1];
              }
          }
          return {
              isLayout: hasSlots,
              isGrid,
              isFlex,
              columns
          };
      }

    getRenderedComponentContent(item, options = {}) {
        if (item?.type === 'view') {
            return this.renderCmsViewBlockPreview(item);
        }

        const forCanvas = Boolean(options.forCanvas);
        const wrapper = document.createElement('div');
        wrapper.innerHTML = item.content || '';
        const props = item.props || {};
        const cmsBinding = this.resolveCmsBinding(item);
        const heading = wrapper.querySelector('h1,h2,h3,h4,h5,h6');
        const paragraph = wrapper.querySelector('p');
        const link = wrapper.querySelector('a');
        const image = wrapper.querySelector('img');

        if (heading && typeof props.title === 'string') heading.textContent = props.title;
        if (paragraph && typeof props.text === 'string') paragraph.textContent = props.text;
        if (link && typeof props.linkText === 'string') link.textContent = props.linkText;
        if (link && typeof props.linkHref === 'string') link.setAttribute('href', props.linkHref);
        if (image && typeof props.imageSrc === 'string') image.setAttribute('src', props.imageSrc);
        if (image && typeof props.imageAlt === 'string') image.setAttribute('alt', props.imageAlt);

        this.applyInlineTextOverrides(wrapper, props);
        this.applyInlineImageOverrides(wrapper, props);
        this.applyInlineAttributeOverrides(wrapper, props);
        if (cmsBinding?.mode === 'record' && cmsBinding.record) {
            const root = wrapper.firstElementChild || wrapper;
            this.applyCmsDataToElement(root, cmsBinding.record);
        }

        const root = wrapper.firstElementChild;
        if (root) {
            const withUnit = (value) => {
                if (value === null || value === undefined || value === '') return '';
                const raw = String(value).trim();
                if (!raw) return '';
                if (/[a-z%]+$/i.test(raw)) return raw;
                const num = Number(raw);
                if (Number.isNaN(num)) return raw;
                return `${num}px`;
            };

            const gapValue = withUnit(props.layoutGap);
            if (gapValue) root.style.gap = gapValue;

            const paddingValue = withUnit(props.layoutPadding);
            if (paddingValue) root.style.padding = paddingValue;

            if (props.layoutAlign) root.style.alignItems = props.layoutAlign;
            if (props.layoutJustify) root.style.justifyContent = props.layoutJustify;
            if (props.layoutBg) root.style.backgroundColor = props.layoutBg;

            if (props.layoutColumns) {
                const colNum = Number(props.layoutColumns);
                if (!Number.isNaN(colNum) && colNum > 0) {
                    root.style.gridTemplateColumns = `repeat(${colNum}, minmax(0, 1fr))`;
                }
            }

            if (typeof props.layoutReverse === 'boolean') {
                root.style.flexDirection = props.layoutReverse ? 'row-reverse' : '';
            }
        }

        if (cmsBinding?.mode === 'collection') {
            const groupedApplied = Array.isArray(cmsBinding.groups) && cmsBinding.groups.length > 0
                ? this.applyCmsGroupedCollectionRendering(wrapper, cmsBinding.groups)
                : false;
            if (!groupedApplied && Array.isArray(cmsBinding.items) && cmsBinding.items.length > 0) {
                const repeatedApplied = this.applyCmsCollectionRendering(wrapper, cmsBinding.items);
                if (!repeatedApplied) {
                    this.applyCmsTemplateSequenceRendering(wrapper, cmsBinding.items);
                }
            }
        }

        if (!forCanvas) {
            const slots = wrapper.querySelectorAll('.micro-slot[data-slot]');
            slots.forEach((slot) => {
                const slotName = slot.dataset.slot || 'default';
                const children = Array.isArray(item?.children?.[slotName]) ? item.children[slotName] : [];
                if (children.length === 0) {
                    return;
                }
                slot.innerHTML = children
                    .map((child) => this.getRenderedComponentContent(child, { forCanvas: false }))
                    .join('');
            });
        }

        return wrapper.innerHTML;
    }

    getInlineEditableElements(rootEl, options = {}) {
        if (!rootEl) return [];
        const containerEl = options.container || null;
        const selectors = 'h1,h2,h3,h4,h5,h6,p,a,span,button,br,wbr,hr,pre,blockquote,ol,ul,li,dl,dt,dd,figure,figcaption,div,strong,b,em,i,u,s,mark,small,sub,sup,code,kbd,samp,var,q,cite,abbr,data,time,bdi,bdo,ruby,rt,rp';
        const nodes = Array.from(rootEl.querySelectorAll(selectors));
        if (options.includeRoot && rootEl.matches && rootEl.matches(selectors)) {
            nodes.unshift(rootEl);
        }
        return nodes.filter((el) => this.isInlineEditableElement(el, rootEl, containerEl));
    }

    isInlineEditableElement(el, rootEl, containerEl) {
        if (!el || !rootEl) return false;
        const tag = el.tagName.toLowerCase();
        if (tag === 'hr' || tag === 'br' || tag === 'wbr') return false;
        if (containerEl) {
            const owner = el.closest('.canvas-item');
            if (owner && owner !== containerEl) return false;
        }
        if (el.classList.contains('micro-slot')) return false;
        if (!containerEl && el.closest('.micro-slot')) return false;
        if (containerEl) {
            const owner = el.closest('.canvas-item');
            if (owner && owner !== containerEl) return false;
        }
        const disallowIfChildren = new Set(['div', 'ol', 'ul', 'dl', 'figure', 'blockquote', 'pre', 'li', 'dt', 'dd', 'figcaption']);
        if (disallowIfChildren.has(tag) && el.children.length > 0) {
            return false;
        }
        return true;
    }

    getInlineKeyForElement(el, rootEl) {
        if (!el || !rootEl) return '';
        const segments = [];
        let node = el;
        while (node && node !== rootEl) {
            const parent = node.parentElement;
            if (!parent) break;
            const index = Array.from(parent.children).indexOf(node);
            segments.push(`${node.tagName.toLowerCase()}:${index}`);
            node = parent;
        }
        segments.push(rootEl.tagName.toLowerCase());
        return segments.reverse().join('/');
    }

    applyInlineTextOverrides(wrapper, props) {
        const inlineText = props?.inlineText;
        if (!inlineText || typeof inlineText !== 'object') {
            return;
        }
        const root = wrapper.firstElementChild || wrapper;
        const elements = this.getInlineEditableElements(root, { includeRoot: true });
        elements.forEach((el) => {
            const key = this.getInlineKeyForElement(el, root);
            if (!key) return;
            if (Object.prototype.hasOwnProperty.call(inlineText, key)) {
                el.textContent = inlineText[key];
            }
        });
    }

    applyInlineImageOverrides(wrapper, props) {
        const inlineImages = props?.inlineImages;
        if (!inlineImages || typeof inlineImages !== 'object') {
            return;
        }
        const root = wrapper.firstElementChild || wrapper;
        const images = Array.from(root.querySelectorAll('img'));
        images.forEach((img) => {
            const key = this.getInlineKeyForElement(img, root);
            if (!key || !Object.prototype.hasOwnProperty.call(inlineImages, key)) {
                return;
            }
            const override = inlineImages[key] || {};
            if (override.src) {
                img.setAttribute('src', override.src);
            }
            if (override.alt !== undefined) {
                img.setAttribute('alt', override.alt);
            }
        });
    }

    applyInlineAttributeOverrides(wrapper, props) {
        const inlineAttributes = props?.inlineAttributes;
        if (!inlineAttributes || typeof inlineAttributes !== 'object') {
            return;
        }
        const root = wrapper.firstElementChild || wrapper;
        const elements = this.getSelectableElements(root, { includeRoot: true });
        elements.forEach((el) => {
            const key = this.getInlineKeyForElement(el, root);
            if (!key || !Object.prototype.hasOwnProperty.call(inlineAttributes, key)) {
                return;
            }
            const override = inlineAttributes[key] || {};
            if (override.id !== undefined) {
                if (override.id) {
                    el.setAttribute('id', override.id);
                } else {
                    el.removeAttribute('id');
                }
            }
            if (override.className !== undefined) {
                if (override.className) {
                    el.setAttribute('class', override.className);
                } else {
                    el.removeAttribute('class');
                }
            }
            if (override.title !== undefined) {
                if (override.title) {
                    el.setAttribute('title', override.title);
                } else {
                    el.removeAttribute('title');
                }
            }
            if (override.style !== undefined) {
                if (override.style) {
                    el.setAttribute('style', override.style);
                } else {
                    el.removeAttribute('style');
                }
            }
            if (override.href !== undefined && el.tagName.toLowerCase() === 'a') {
                if (override.href) {
                    el.setAttribute('href', override.href);
                } else {
                    el.removeAttribute('href');
                }
            }
            if (override.src !== undefined && el.tagName.toLowerCase() === 'img') {
                if (override.src) {
                    el.setAttribute('src', override.src);
                } else {
                    el.removeAttribute('src');
                }
            }
            if (override.alt !== undefined && el.tagName.toLowerCase() === 'img') {
                if (override.alt || override.alt === '') {
                    el.setAttribute('alt', override.alt);
                }
            }
        });
    }

    updateComponentProps(instanceId, patch) {
        const item = this.findComponentById(instanceId);
        if (!item) return;
        const activeElement = document.activeElement;
        const isEditingProperties = Boolean(
            activeElement
            && this.propertiesContent
            && this.propertiesContent.contains(activeElement)
        );

        if (typeof patch.name === 'string') {
            item.name = patch.name;
        }
        if (patch.blockConfig && typeof patch.blockConfig === 'object') {
            item.blockConfig = { ...patch.blockConfig };
        }
        if (patch.props && typeof patch.props === 'object') {
            const nextProps = { ...(item.props || {}), ...patch.props };
            Object.keys(nextProps).forEach((key) => {
                if (nextProps[key] === null || nextProps[key] === undefined || nextProps[key] === '') {
                    if (key === 'cmsBinding' || key === 'blockConfig' || key === 'layoutBg' || key === 'layoutGap' || key === 'layoutPadding') {
                        delete nextProps[key];
                    }
                }
            });
            item.props = nextProps;
        }

        const element = document.querySelector(`.canvas-item[data-instance-id="${instanceId}"]`);
        if (element) {
            const nameEl = element.querySelector('.item-name');
            if (nameEl) {
                nameEl.textContent = item.name;
            }
            if (this.editorCanvas && typeof this.editorCanvas.hydrateCanvasItem === 'function') {
                this.editorCanvas.hydrateCanvasItem(this, item, element);
            } else {
                const contentEl = element.querySelector('.content-preview');
                if (contentEl) {
                    contentEl.innerHTML = this.getRenderedComponentContent(item, { forCanvas: true });
                }
            }
        }

        this.refreshLivePreview();
        if (this.selectedItem === instanceId) {
            const selectedKey = this.selectedElement?.instanceId === instanceId ? this.selectedElement.key : null;
            if (!isEditingProperties) {
                this.showPropertiesPanel(instanceId, selectedKey);
            }
            this.updateInspector(instanceId, selectedKey);
        }
    }

    updateElementTextProperty(instanceId, elementKey, value) {
        const item = this.findComponentById(instanceId);
        if (!item || !elementKey) return;

        const bindings = this.getLegacyBindingsForElement(item, elementKey);
        const nextProps = { ...(item.props || {}) };
        if (bindings.text) {
            nextProps[bindings.text] = value;
            if (nextProps.inlineText && typeof nextProps.inlineText === 'object') {
                const inlineText = { ...nextProps.inlineText };
                delete inlineText[elementKey];
                nextProps.inlineText = inlineText;
            }
        } else {
            const inlineText = { ...(nextProps.inlineText || {}) };
            inlineText[elementKey] = value;
            nextProps.inlineText = inlineText;
        }

        this.updateComponentProps(instanceId, { props: nextProps });
    }

    updateElementAttributeProperty(instanceId, elementKey, attributeName, value) {
        const item = this.findComponentById(instanceId);
        if (!item || !elementKey || !attributeName) return;

        const bindings = this.getLegacyBindingsForElement(item, elementKey);
        const nextProps = { ...(item.props || {}) };
        const legacyProp = bindings[attributeName];

        if (legacyProp) {
            nextProps[legacyProp] = value;
            if (nextProps.inlineAttributes && typeof nextProps.inlineAttributes === 'object') {
                const inlineAttributes = { ...(nextProps.inlineAttributes || {}) };
                if (inlineAttributes[elementKey]) {
                    const entry = { ...inlineAttributes[elementKey] };
                    delete entry[attributeName];
                    if (Object.keys(entry).length > 0) {
                        inlineAttributes[elementKey] = entry;
                    } else {
                        delete inlineAttributes[elementKey];
                    }
                    nextProps.inlineAttributes = inlineAttributes;
                }
            }
            this.updateComponentProps(instanceId, { props: nextProps });
            return;
        }

        const inlineAttributes = { ...(nextProps.inlineAttributes || {}) };
        const entry = { ...(inlineAttributes[elementKey] || {}) };
        entry[attributeName] = value;
        inlineAttributes[elementKey] = entry;
        nextProps.inlineAttributes = inlineAttributes;
        this.updateComponentProps(instanceId, { props: nextProps });
    }

    applySelectedCanvasElementSelection(canvasItem, instanceId) {
        if (!canvasItem) {
            return;
        }
        canvasItem.querySelectorAll('.builder-element-selected').forEach((el) => {
            el.classList.remove('builder-element-selected');
        });
        if (!this.selectedElement || this.selectedElement.instanceId !== instanceId) {
            return;
        }
        const preview = canvasItem.querySelector('.content-preview');
        const root = preview?.firstElementChild || preview;
        if (!root) {
            return;
        }
        const target = this.findElementByInlineKey(root, this.selectedElement.key);
        if (target) {
            target.classList.add('builder-element-selected');
        }
    }

    hidePropertiesPanel() {
        this.propertiesPanel.classList.remove('active');
        this.selectedItem = null;
        this.selectedElement = null;
        this.updateInspector(null);
        
        document.querySelectorAll('.canvas-item').forEach(item => {
            item.classList.remove('selected');
        });
        document.querySelectorAll('.builder-element-selected').forEach((el) => {
            el.classList.remove('builder-element-selected');
        });
        this.updateSelectionStatus();
    }

    async showPreview() {
          const components = this.getActiveComponents();
          if (components.length === 0) {
              this.showToast('Add components to preview', 'warning');
              return;
          }

          await this.ensureCmsBindingsLoadedForComponents(components);

          if (this.builderMode === 'partial' || this.canvasLayoutMode === 'freeform') {
              this.setPreviewMode(this.previewFrameWrap?.dataset?.size || 'desktop');
              this.setPreviewContentMode(this.previewContentMode || 'render');
              this.previewModal.classList.add('active');
              return;
          }
        
        try {
            const response = await fetch('/api/watch/start', { method: 'POST' });
            const result = await response.json();
            if (!result.success) {
                throw new Error(result.error || 'Failed to start watch');
            }
        } catch (error) {
            console.error('Failed to start watch process:', error);
            this.showToast(`Watch start failed: ${error.message}`, 'warning');
        }

        const pageName = (this.currentPageName || this.pageTitleInput.value || '').trim();
        if (!pageName) {
            this.showToast('Set a page name first', 'warning');
            return;
        }

        const previewUrl = `http://localhost:3001/${encodeURIComponent(pageName)}.html`;
        window.open(previewUrl, '_blank');
        this.showToast(`Opening hosted preview: ${pageName}.html`, 'success');
    }

      getPreviewCanvasStyle(item) {
          const placement = this.normalizeCanvasPlacement(item?.canvas);
          return `position:absolute;left:min(${placement.x}px, calc(100% - min(${placement.width}px, 100%)));top:${placement.y}px;width:min(${placement.width}px, 100%);max-width:100%;`;
      }

      renderComponentsForCurrentCanvas(components = []) {
          const visibleComponents = components.filter((item) => item.visible !== false);
          if (this.canvasLayoutMode !== 'freeform') {
              const ordered = this.builderMode === 'page'
                  ? this.layoutRegions.flatMap((region) => visibleComponents
                      .filter((item) => this.normalizeRegionId(item.region, 'main') === region.id)
                      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0)))
                  : visibleComponents;
              return ordered
                  .map((item) => this.getRenderedComponentContent(item))
                  .join('\n');
          }
          const stageHeight = Math.max(
              480,
              ...visibleComponents.map((item) => {
                  const placement = this.normalizeCanvasPlacement(item?.canvas);
                  return placement.y + this.getApproximateCanvasItemHeight(item) + 48;
              })
          );
          const nodes = visibleComponents.map((item) => {
              return `<div class="builder-freeform-node" style="${this.getPreviewCanvasStyle(item)}">${this.getRenderedComponentContent(item)}</div>`;
          }).join('\n');
          return `<div class="builder-freeform-stage" style="position:relative; min-height:${Math.round(stageHeight)}px;">${nodes}</div>`;
      }

      generatePreviewHTML() {
          const components = this.getActiveComponents();
          const pageName = this.pageTitleInput.value || (this.builderMode === 'partial' ? 'Partial Preview' : 'Preview');
          const wrapperOpen = this.builderMode === 'partial' ? '<div class="partial-preview">' : '';
          const wrapperClose = this.builderMode === 'partial' ? '</div>' : '';
          const presetVars = this.getPresetCssVariables();
          const microStyles = this.getMicroBaseStyles();
          let html = `
  <!DOCTYPE html>
  <html>
  <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${pageName}</title>
      <link rel="stylesheet" href="../../../build/css/styles.css">
      <style>
          ${presetVars}
          body { margin: 0; padding: 20px; background: var(--preset-surface); color: var(--preset-text); font-family: var(--preset-font-body); }
          * { box-sizing: border-box; }
          .partial-preview { max-width: 1100px; margin: 0 auto; }
          .builder-freeform-stage { position: relative; width: 100%; }
          .builder-freeform-node { position: absolute; }
          ${microStyles}
      </style>
  </head>
  <body>
  `;

        html += wrapperOpen;
        html += this.renderComponentsForCurrentCanvas(components);
        html += wrapperClose;
        
        html += `
</body>
</html>`;
        
        return html;
    }

    generatePreviewMarkup() {
        return this.renderComponentsForCurrentCanvas(this.getActiveComponents()).trim();
    }

    async showExportModal() {
        if (this.builderMode === 'page' && !this.project) {
            this.openProjectModal();
            this.showToast('Create or open a page first', 'warning');
            return;
        }

        if (this.getActiveComponents().length === 0) {
            this.showToast('Add components to export', 'warning');
            return;
        }

        await this.ensureCmsBindingsLoadedForComponents(this.getActiveComponents());
        this.updateExportPreview();
        this.exportModal.classList.add('active');
    }

    updateExportPreview() {
        if (!this.exportOutput) return;
        const format = this.exportFormat ? this.exportFormat.value : 'json';
        if (this.builderMode === 'partial') {
            if (format === 'html') {
                this.exportOutput.value = this.getPartialHTML();
            } else {
                this.exportOutput.value = JSON.stringify(this.getPartialData(), null, 2);
            }
            return;
        }

        if (format === 'html') {
            this.exportOutput.value = this.generatePreviewHTML();
        } else {
            this.exportOutput.value = JSON.stringify(this.getLayoutData(), null, 2);
        }
    }

    getLayoutData() {
        const effectivePageName = this.currentPageName || this.pageTitleInput.value || 'untitled-page';
        const regions = this.buildRegionsPayload();
        const flatLayout = this.layoutRegions.flatMap((region) => regions[region.id] || []);
        return {
            project: this.project,
            pageName: effectivePageName,
            pageTitle: this.pageTitleInput.value || 'Untitled Page',
            createdAt: new Date().toISOString(),
            meta: {
                version: 2,
                updatedAt: new Date().toISOString(),
                canvasLayoutMode: this.canvasLayoutMode,
                freeformSectionTemplate: this.freeformSectionTemplate,
                layoutModel: 'regions'
            },
              regions,
              layout: flatLayout
          };
      }

    getPartialData() {
        const name = (this.pageTitleInput.value || 'untitled-partial').trim();
          return {
              meta: {
                  version: 1,
                  type: 'partial',
                  updatedAt: new Date().toISOString(),
                  canvasLayoutMode: this.canvasLayoutMode,
                  freeformSectionTemplate: this.freeformSectionTemplate
              },
              name,
              createdAt: new Date().toISOString(),
              components: this.partialComponents.map((item, index) => ({
                  id: item.instanceId,
                  order: index + 1,
                  type: item.type,
                  componentId: item.componentPath,
                  name: item.name,
                  props: item.props || {},
                  children: item.children || {},
                  canvas: this.canvasLayoutMode === 'freeform' ? this.normalizeCanvasPlacement(item.canvas, index) : null,
                  renderedContent: this.getRenderedComponentContent(item)
              }))
          };
      }

    getPartialHTML() {
        const components = this.partialComponents;
        let html = '<div class="partial-builder">';
        html += this.renderComponentsForCurrentCanvas(components);
        html += '</div>';
        return html;
    }

    copyToClipboard() {
        this.exportOutput.select();
        document.execCommand('copy');
        this.showToast('Copied to clipboard', 'success');
    }

    downloadExport() {
        const data = this.exportOutput.value;
        const format = this.exportFormat ? this.exportFormat.value : 'json';
        const isHtml = format === 'html';
        const mime = isHtml ? 'text/html' : 'application/json';
        const blob = new Blob([data], { type: mime });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        const baseName = (this.pageTitleInput.value || (this.builderMode === 'partial' ? 'partial' : 'layout')).trim();
        const suffix = this.builderMode === 'partial' ? 'partial' : 'layout';
        const ext = isHtml ? 'html' : 'json';
        a.download = `${baseName}-${suffix}-${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast(`${this.builderMode === 'partial' ? 'Partial' : 'Layout'} downloaded`, 'success');
    }

    async saveLayout() {
        if (this.editingLayoutPath) {
            await this.saveEditingLayout();
            return;
        }
        if (this.editingPartialPath) {
            await this.saveEditingPartial();
            return;
        }
        if (this.builderMode !== 'page') {
            await this.savePartial();
            return;
        }
        if (!this.project) {
            this.openProjectModal();
            this.showToast('Create or open a page first', 'warning');
            return;
        }

        if (this.pageComponents.length === 0) {
            this.showToast('Add components before saving', 'warning');
            return;
        }

        try {
            await this.syncPageComponentPartials(this.pageComponents);
        } catch (error) {
            console.error('Failed to sync page partials before saving layout:', error);
            this.showToast(`Failed to sync partials: ${error.message}`, 'error');
            return;
        }

        await this.ensureCmsBindingsLoadedForComponents(this.pageComponents);
        
        const layoutData = this.getLayoutData();
        
        try {
            let savePayload = {
                layoutData,
                pageName: this.currentPageName || this.pageTitleInput.value || 'layout',
                overwrite: false,
                saveAs: false,
                layoutFileName: this.currentLayoutFileName
            };

            let response = await fetch('/api/save-layout', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(savePayload)
            });

            let result = await response.json();

            if (!result.success && response.status === 409) {
                const shouldOverwrite = confirm(`${result.error}\n\nOverwrite existing page?`);
                if (shouldOverwrite) {
                    savePayload.overwrite = true;
                } else {
                    const saveAsName = prompt('Enter new page name (Save As):', `${this.pageTitleInput.value || 'layout'}-copy`);
                    if (!saveAsName) {
                        this.showToast('Save cancelled', 'warning');
                        return;
                    }
                    savePayload.pageName = saveAsName;
                    savePayload.saveAs = true;
                    savePayload.layoutFileName = null;
                }

                response = await fetch('/api/save-layout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(savePayload)
                });
                result = await response.json();
            }

            if (!result.success) {
                const details = result.details || {};
                const componentPath = details.componentPath || details.sourcePath;
                const componentIndex = Number.isFinite(details.index) ? details.index + 1 : null;
                let actionable = result.error || 'Save failed';
                if (componentPath) {
                    actionable += ` (component: ${componentPath})`;
                }
                if (componentIndex !== null) {
                    actionable += ` [item ${componentIndex}]`;
                }
                throw new Error(actionable);
            }

            this.currentLayoutFileName = result?.data?.layoutFileName || this.currentLayoutFileName;
            this.currentPageName = result?.data?.pageName || this.currentPageName;
            this.updateEditorBreadcrumb();
            const pagePath = result?.data?.pagePath;
            if (pagePath) {
                this.showToast(`Layout saved and page created: ${pagePath}`, 'success');
            } else {
                this.showToast('Layout saved successfully', 'success');
            }
        } catch (error) {
            console.error('Error saving layout:', error);
            this.showToast('Failed to save layout', 'error');
        }
    }

    async savePartial() {
        const components = this.partialComponents;
        if (!components || components.length === 0) {
            this.showToast('Add micro components before saving a partial', 'warning');
            return;
        }

        const rawName = (this.pageTitleInput.value || '').trim();
        if (!rawName) {
            this.showToast('Enter a partial name first', 'warning');
            return;
        }

        const normalized = rawName
            .toLowerCase()
            .replace(/[^a-z0-9/_-]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/(^-+|-+$)/g, '');

        const safeStem = normalized.replace(/\.\.+/g, '').replace(/^\/+/, '');
        if (!safeStem) {
            this.showToast('Partial name must include letters or numbers', 'warning');
            return;
        }

        const basePath = safeStem.includes('/') ? safeStem : `builder/${safeStem}`;
        const targetPath = basePath.endsWith('.html') ? basePath : `${basePath}.html`;
        const payload = {
            path: targetPath,
            content: this.getPartialHTML(),
            overwrite: false
        };

        try {
            let response = await fetch('/api/partial', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            let result = await response.json();

            if (!result.success && response.status === 409) {
                const shouldOverwrite = confirm(`${result.error}\n\nOverwrite existing partial?`);
                if (shouldOverwrite) {
                    response = await fetch('/api/partial', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ ...payload, overwrite: true })
                    });
                    result = await response.json();
                }
            }

            if (!result.success) {
                throw new Error(result.error || 'Failed to save partial');
            }

            this.currentPartialFileName = result.data?.path || targetPath;
            await this.loadPartials();
            this.showToast(`Partial saved: ${this.currentPartialFileName}`, 'success');
        } catch (error) {
            console.error('Failed to save partial:', error);
            this.showToast(`Failed to save partial: ${error.message}`, 'error');
        }
    }

    openImageModal(payload) {
        if (!this.imageModal) {
            return;
        }
        this.pendingImageEdit = { ...(payload || {}) };
        if (this.imageUrlInput) {
            this.imageUrlInput.value = this.pendingImageEdit.currentSrc || '';
        }
        if (this.imageAltInput) {
            this.imageAltInput.value = this.pendingImageEdit.alt || '';
        }
        if (this.imageUploadInput) {
            this.imageUploadInput.value = '';
        }
        if (this.imageUploadStatus) {
            this.imageUploadStatus.textContent = '';
        }
        this.loadImageLibrary();
        this.modals.show(this.imageModal);
    }

    closeImageModal() {
        if (this.imageModal) {
            this.hideModal(this.imageModal);
        }
        this.pendingImageEdit = null;
        if (this.imageUploadInput) {
            this.imageUploadInput.value = '';
        }
        if (this.imageAltInput) {
            this.imageAltInput.value = '';
        }
        if (this.imageUploadStatus) {
            this.imageUploadStatus.textContent = '';
        }
        if (this.imageLibraryList) {
            this.imageLibraryList.innerHTML = '';
        }
    }

    applyImageUrl() {
        const src = (this.imageUrlInput?.value || '').trim();
        if (!src) {
            this.showToast('Enter an image URL', 'warning');
            return;
        }
        const alt = this.imageAltInput ? this.imageAltInput.value.trim() : '';
        this.applyImageSrcToComponent(src, alt);
        this.closeImageModal();
    }

    async handleImageUpload() {
        const file = this.imageUploadInput?.files?.[0];
        if (!file) {
            this.showToast('Choose an image to upload', 'warning');
            return;
        }
        if (this.uploadImageButton) {
            this.uploadImageButton.disabled = true;
        }
        if (this.imageUploadStatus) {
            this.imageUploadStatus.textContent = 'Uploading...';
        }
        try {
            const result = await this.apiClient.uploadImage(file);
            const src = result?.data?.path;
            if (!src) {
                throw new Error('Upload did not return an image path');
            }
            const alt = this.imageAltInput ? this.imageAltInput.value.trim() : '';
            this.applyImageSrcToComponent(src, alt);
            this.closeImageModal();
            this.showToast('Image uploaded', 'success');
        } catch (error) {
            console.error('Image upload failed:', error);
            this.showToast(`Image upload failed: ${error.message}`, 'error');
            if (this.imageUploadStatus) {
                this.imageUploadStatus.textContent = 'Upload failed';
            }
        } finally {
            if (this.uploadImageButton) {
                this.uploadImageButton.disabled = false;
            }
        }
    }

    applyImageSrcToComponent(src, altText) {
        const edit = this.pendingImageEdit;
        if (!edit || !edit.instanceId) {
            return;
        }
        const item = this.findComponentById(edit.instanceId);
        if (!item) {
            return;
        }
        const hasAlt = typeof altText === 'string';
        if (edit.singleImageProp && item.props && typeof item.props.imageSrc === 'string') {
            const nextProps = { imageSrc: src };
            if (hasAlt) {
                nextProps.imageAlt = altText;
            }
            this.updateComponentProps(edit.instanceId, { props: nextProps });
            return;
        }
        if (!edit.inlineKey) {
            this.showToast('Unable to update this image', 'warning');
            return;
        }
        const existing = item?.props?.inlineImages || {};
        const previous = existing[edit.inlineKey] || {};
        const next = {
            ...existing,
            [edit.inlineKey]: {
                src,
                alt: hasAlt ? altText : (previous.alt !== undefined ? previous.alt : (edit.alt || ''))
            }
        };
        this.updateComponentProps(edit.instanceId, { props: { inlineImages: next } });
    }

    async loadImageLibrary() {
        if (!this.imageLibraryList) {
            return;
        }
        this.imageLibraryList.innerHTML = '<div class="loading">Loading images...</div>';
        try {
            const result = await this.apiClient.listImages();
            const files = Array.isArray(result?.data) ? result.data : [];
            if (!files.length) {
                this.imageLibraryList.innerHTML = '<p class="no-selection">No images in src/images yet.</p>';
                return;
            }
            const html = files.map((file) => {
                const safeName = file?.name || 'image';
                const safePath = file?.path || '';
                return `
                    <button class="image-library-item" type="button" data-src="${safePath}" data-name="${safeName}">
                        <img src="${safePath}" alt="${safeName}">
                        <span>${safeName}</span>
                    </button>
                `;
            }).join('');
            this.imageLibraryList.innerHTML = html;
        } catch (error) {
            console.error('Failed to load image library:', error);
            this.imageLibraryList.innerHTML = '<p class="no-selection">Failed to load images.</p>';
        }
    }

    handleImageLibraryClick(event) {
        const button = event.target.closest('.image-library-item');
        if (!button || !this.imageLibraryList) {
            return;
        }
        this.imageLibraryList.querySelectorAll('.image-library-item.selected').forEach((item) => {
            item.classList.remove('selected');
        });
        button.classList.add('selected');
        const src = button.dataset.src || '';
        const name = button.dataset.name || '';
        if (this.imageUrlInput) {
            this.imageUrlInput.value = src;
        }
        if (this.imageAltInput && !this.imageAltInput.value) {
            this.imageAltInput.value = this.formatAltFromName(name);
        }
        if (this.imageUploadStatus) {
            this.imageUploadStatus.textContent = name ? `Selected ${name}` : '';
        }
    }

    formatAltFromName(fileName) {
        const base = String(fileName || '').replace(/\.[^/.]+$/, '');
        return base.replace(/[-_]+/g, ' ').trim();
    }

    hideModal(modal) {
        this.modals.hide(modal);
    }

    showToast(message, type = 'success') {
        this.notifications.showToast(message, type);
    }
}

// Initialize the builder
const builder = new VisualBuilder();
