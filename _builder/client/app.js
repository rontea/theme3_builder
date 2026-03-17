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
        this.selectedItem = null;
        this.apiBase = '';
        this.pendingDeleteTarget = null;
        this.currentPartialFileName = null;
        this.pendingImageEdit = null;
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
        await this.initMicroComponents();
        this.initDesignPresets();
        const initialMode = this.getInitialBuilderMode();
        this.setBuilderMode(initialMode);
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
        this.partialsList = document.getElementById('partialsList');
        this.microList = document.getElementById('microList');
        this.syncPagePartials = document.getElementById('syncPagePartials');
        this.partialsTab = document.getElementById('partialsTab');
        this.microTab = document.getElementById('microTab');
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
        this.projectNameDisplay = document.getElementById('projectNameDisplay');

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
        this.previewFrame = document.getElementById('previewFrame');
        this.previewFrameWrap = document.getElementById('previewFrameWrap');
        this.previewControls = document.getElementById('previewControls');
        this.exportOutput = document.getElementById('exportOutput');
        this.exportFormat = document.getElementById('exportFormat');
        this.partialCodeTitle = document.getElementById('partialCodeTitle');
        this.partialCodeOutput = document.getElementById('partialCodeOutput');
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
        this.savedLayoutsList = document.getElementById('savedLayoutsList');
        this.landingScreen = document.getElementById('landingScreen');
        this.landingProjectsList = document.getElementById('landingProjectsList');
        this.landingContentTitle = document.getElementById('landingContentTitle');
        this.syncLandingPages = document.getElementById('syncLandingPages');
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
        if (this.previewControls) {
            this.previewControls.addEventListener('click', (e) => this.handlePreviewControlClick(e));
        }
        if (this.microQuickFilters) {
            this.microQuickFilters.addEventListener('click', (e) => this.handleMicroQuickFilter(e));
        }
        if (this.presetSelect) {
            this.presetSelect.addEventListener('change', (e) => this.applyDesignPreset(e.target.value));
        }
        if (this.partialsTab) {
            this.partialsTab.addEventListener('click', () => this.setBuilderMode('page'));
        }
        if (this.microTab) {
            this.microTab.addEventListener('click', () => this.setBuilderMode('partial'));
        }
        
        // Toolbar buttons
        this.btnUndo.addEventListener('click', () => this.undo());
        this.btnRedo.addEventListener('click', () => this.redo());
        this.btnClear.addEventListener('click', () => this.clearCanvas());
        this.btnPreview.addEventListener('click', () => this.showPreview());
        this.btnInspect.addEventListener('click', () => this.toggleInspectorPanel());
        this.btnToggleStitchMode.addEventListener('click', () => this.toggleStitchMode());
        this.btnExport.addEventListener('click', () => this.showExportModal());
        this.btnSave.addEventListener('click', () => this.saveLayout());
        this.btnLoadLayout.addEventListener('click', () => this.openLoadLayoutModal());
        this.btnClosePage.addEventListener('click', () => this.closeCurrentPageToDashboard());
        this.btnCreateProject.addEventListener('click', () => this.openProjectModal());
        this.syncLandingPages.addEventListener('click', () => this.syncPagesFromFilesystem());
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
        [this.previewModal, this.exportModal, this.loadLayoutModal, this.deleteProjectModal, this.closePageConfirmModal, this.createProjectModal, this.createPageModal, this.partialCodeModal, this.partialPreviewModal, this.imageModal].forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    if (modal === this.deleteProjectModal) {
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
        this.btnExport.disabled = isLocked;
        this.btnSave.disabled = isLocked;
        const disablePageActions = isLocked || this.builderMode !== 'page';
        this.btnLoadLayout.disabled = disablePageActions;
        this.btnClosePage.disabled = disablePageActions;
        this.syncPagePartials.disabled = disablePageActions;
        this.searchInput.disabled = isLocked;
        if (this.partialsFilter) this.partialsFilter.disabled = isLocked;
        this.pageTitleInput.disabled = isLocked;
        if (this.partialsTab) this.partialsTab.disabled = isLocked;
        if (this.microTab) this.microTab.disabled = isLocked;
        if (this.partialsSortable) this.partialsSortable.option('disabled', isLocked);
        if (this.microSortable) this.microSortable.option('disabled', isLocked);
        if (this.canvasSortable) this.canvasSortable.option('disabled', isLocked);
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
              this.previewFrame.srcdoc = this.generatePreviewHTML();
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

    toggleStitchMode() {
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

    openProjectModal() {
        this.showLandingScreen();
    }

    showLandingScreen() {
        if (!this.landingScreen) {
            return;
        }
        this.landingScreen.classList.add('active');
        this.setProjectLockState(true);
        this.updateLandingPrimaryAction();
        this.loadLandingProjects();
    }

    closeProjectToMainDashboard() {
        this.currentPageName = null;
        this.pageCreated = false;
        this.currentLayoutFileName = null;
        this.updateEditorBreadcrumb();
        this.updateLandingPrimaryAction();
        this.loadLandingProjects();
    }

    updateEditorBreadcrumb() {
        const pageName = this.currentPageName || '';
        this.projectNameDisplay.textContent = pageName || 'No Page';
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
        this.historyUndo = [];
        this.historyRedo = [];
        this.pageComponents = [];
        this.pageTitleInput.value = '';
        this.currentPageName = null;
        this.updateEditorBreadcrumb();
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

        this.currentPageName = normalizedPageName;
        this.currentLayoutFileName = null;
        this.pageTitleInput.value = normalizedPageName;
        this.updateEditorBreadcrumb();
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
        return this.pagesDashboard.loadLandingProjects(this);
    }

    async syncPagesFromFilesystem() {
        return this.pagesDashboard.syncPagesFromFilesystem(this);
    }

    async openLoadLayoutModal() {
        this.loadLayoutModal.classList.add('active');
        await this.loadSavedLayoutsList();
    }

    async loadSavedLayoutsList() {
        this.savedLayoutsList.innerHTML = '<div class="loading">Loading saved layouts...</div>';
        try {
            const result = await this.apiClient.listSavedLayouts();

            if (!Array.isArray(result.data) || result.data.length === 0) {
                this.savedLayoutsList.innerHTML = '<div class="loading">No saved layouts found</div>';
                return;
            }

            let html = '';
            result.data.forEach((item) => {
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

    async openPageFromDashboard(pageName, layoutFileName) {
        this.currentPageName = pageName;
        this.pageCreated = true;
        this.pageTitleInput.value = pageName;
        this.currentLayoutFileName = layoutFileName || null;
        this.historyUndo = [];
        this.historyRedo = [];

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
            const components = await this.buildPageComponentsFromLayout(layoutData.layout || []);
            this.pageComponents = components;
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
            this.pageCreated = true;

            await this.loadPartials();
            this.setBuilderMode('page');

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
        for (const item of layoutItems) {
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
                props: item.props || {},
                content: result.data
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
            || (listEl === this.partialsList ? this.partialsSortable : this.microSortable);
        if (sortable) {
            sortable.option('disabled', false);
        }
    }

    createPaletteItem(item) {
        if (item.type === 'micro') {
            const preview = item.preview && item.preview.trim().length > 0
                ? item.preview
                : 'No preview available';
            return `
                <div class="component-item" data-type="micro" data-path="${item.id}" data-id="${item.id}">
                    <i class="fas fa-cube"></i>
                    <div class="component-meta">
                        <span class="component-name">${item.name}</span>
                        <span class="component-preview">${preview}</span>
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

        this.partialCodeTitle.textContent = `Partial Code: ${partialPath}`;
        this.partialCodeOutput.textContent = 'Loading...';
        this.partialCodeModal.classList.add('active');

        try {
            const result = await this.apiClient.getPartial(partialPath);
            this.partialCodeOutput.textContent = result.data || '';
        } catch (error) {
            console.error('Failed to load partial code:', error);
            this.partialCodeOutput.textContent = `Error: ${error.message}`;
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
        return `
            <div class="component-item" data-type="partial" data-path="${partial.path}" data-id="${partial.id}">
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

    setBuilderMode(mode) {
        if (mode !== 'page' && mode !== 'partial') {
            return;
        }

        this.builderMode = mode;
        const isPageMode = mode === 'page';

        if (this.partialsTab) {
            this.partialsTab.classList.toggle('active', isPageMode);
        }
        if (this.microTab) {
            this.microTab.classList.toggle('active', !isPageMode);
        }
        if (this.partialsList) {
            this.partialsList.classList.toggle('active', isPageMode);
        }
        if (this.microList) {
            this.microList.classList.toggle('active', !isPageMode);
        }
        if (this.microQuickFilters) {
            this.microQuickFilters.style.display = isPageMode ? 'none' : '';
        }
        if (this.sidebarTitle) {
            this.sidebarTitle.textContent = isPageMode ? 'Partials (html/partials)' : 'Micro Components';
        }
        if (this.canvasModeLabel) {
            this.canvasModeLabel.textContent = isPageMode ? 'Canvas' : 'Partial Canvas';
        }
        if (this.searchInput) {
            this.searchInput.placeholder = isPageMode ? 'Search components...' : 'Search micro components...';
        }
        if (this.syncPagePartials) {
            this.syncPagePartials.style.display = isPageMode ? '' : 'none';
        }
        if (this.pageTitleInput) {
            this.pageTitleInput.placeholder = isPageMode ? 'Enter page title...' : 'Enter partial name...';
        }
        if (this.canvasEmpty) {
            const title = this.canvasEmpty.querySelector('h4');
            const description = this.canvasEmpty.querySelector('p');
            if (title) {
                title.textContent = isPageMode ? 'Drop Components Here' : 'Build Partial Here';
            }
            if (description) {
                description.textContent = isPageMode
                    ? 'Drag partials from the sidebar to start building your page'
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

        if (this.partialsSortable) {
            this.partialsSortable.option('disabled', !isPageMode);
        }
        if (this.microSortable) {
            this.microSortable.option('disabled', isPageMode);
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

      async createComponentInstance(type, componentPath) {
          if (type === 'partial') {
              const result = await this.apiClient.getPartial(componentPath);
              return {
                  instanceId: this.generateInstanceId(),
                  type,
                  componentPath,
                  name: componentPath.split('/').pop().replace('.html', ''),
                  props: {},
                  content: result.data,
                  children: {}
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
                  children: {}
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

          const isPageMode = this.builderMode === 'page';
          const isStitchMode = this.canvas?.classList.contains('stitch-mode');
          let handle = '.canvas-item-header, .canvas-item-content';
          if (isPageMode && isStitchMode) {
              handle = '.canvas-item-content';
          }

          this.canvasSortable.option('handle', handle);
      }

    setActiveComponents(components) {
        if (this.builderMode === 'partial') {
            this.partialComponents = components;
        } else {
            this.pageComponents = components;
        }
    }

    getActiveHistoryStore() {
        if (this.builderMode === 'partial') {
            return { undo: this.partialHistoryUndo, redo: this.partialHistoryRedo };
        }
        return { undo: this.historyUndo, redo: this.historyRedo };
    }

    getActivePaletteItems() {
        return this.builderMode === 'partial' ? this.microComponents : this.partials;
    }

    getMicroComponentDefinition(id) {
        return this.microComponents.find((item) => item.id === id);
    }

    filterComponents() {
        const query = (this.searchInput.value || '').trim().toLowerCase();
        const selectedGroup = this.partialsFilter ? this.partialsFilter.value : 'all';
        const items = this.getActivePaletteItems();
        const isPageMode = this.builderMode === 'page';
        const listEl = isPageMode ? this.partialsList : this.microList;
        if (!listEl) {
            return;
        }
        if (!isPageMode) {
            this.updateMicroQuickFilters(selectedGroup);
        }

        const filtered = items.filter(p => {
            const queryMatch = !query ||
                p.name.toLowerCase().includes(query) ||
                String(p.path || p.id || '').toLowerCase().includes(query) ||
                (p.category || '').toLowerCase().includes(query) ||
                (p.group || '').toLowerCase().includes(query);
            const groupMatch = selectedGroup === 'all' || String(p.group) === String(selectedGroup);
            return queryMatch && groupMatch;
        });

        const emptyMessage = isPageMode && !this.pageCreated
            ? 'Create a page to load partials...'
            : 'No components match the current search/filter';
        this.renderPaletteItems(filtered, {
            listEl,
            allowActions: isPageMode,
            emptyMessage
        });
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
            this.showPropertiesPanel(instanceId);
            this.updateInspector(instanceId);
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

      showPropertiesPanel(instanceId) {
          const item = this.findComponentById(instanceId);
          if (!item) return;
          const defaults = this.extractDefaultsFromContent(item.content);
          const props = { ...defaults, ...(item.props || {}) };
          const layoutMeta = this.getLayoutMeta(item.content);
          
          this.propertiesPanel.classList.add('active');
          
          this.propertiesContent.innerHTML = `
              <div class="form-group">
                  <label>Component Type</label>
                <input type="text" value="${item.type}" disabled>
            </div>
            <div class="form-group">
                <label>${item.type === 'micro' ? 'Component ID' : 'File Path'}</label>
                <input type="text" value="${item.componentPath}" disabled>
            </div>
            <div class="form-group">
                <label>Component Name</label>
                <input type="text" value="${item.name}" id="propName">
            </div>
            <div class="form-group">
                <label>Title Text</label>
                <input type="text" value="${props.title || ''}" id="propTitle">
            </div>
            <div class="form-group">
                <label>Paragraph Text</label>
                <input type="text" value="${props.text || ''}" id="propText">
            </div>
            <div class="form-group">
                <label>Link Text</label>
                <input type="text" value="${props.linkText || ''}" id="propLinkText">
            </div>
            <div class="form-group">
                <label>Link Href</label>
                <input type="text" value="${props.linkHref || ''}" id="propLinkHref">
            </div>
            <div class="form-group">
                <label>Image Src</label>
                <input type="text" value="${props.imageSrc || ''}" id="propImageSrc">
            </div>
              <div class="form-group">
                  <label>Image Alt</label>
                  <input type="text" value="${props.imageAlt || ''}" id="propImageAlt">
              </div>
              ${layoutMeta.isLayout ? `
              <div class="form-group">
                  <label>Layout Gap (px)</label>
                  <input type="number" min="0" value="${props.layoutGap || ''}" id="propLayoutGap" placeholder="24">
              </div>
              <div class="form-group">
                  <label>Layout Padding (px)</label>
                  <input type="number" min="0" value="${props.layoutPadding || ''}" id="propLayoutPadding" placeholder="0">
              </div>
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
              <div class="form-group">
                  <label>Background Color</label>
                  <input type="text" value="${props.layoutBg || ''}" id="propLayoutBg" placeholder="#ffffff">
              </div>
              ${layoutMeta.isGrid ? `
              <div class="form-group">
                  <label>Grid Columns</label>
                  <select id="propLayoutColumns">
                      <option value="">Default</option>
                      <option value="2">2 Columns</option>
                      <option value="3">3 Columns</option>
                      <option value="4">4 Columns</option>
                  </select>
              </div>
              ` : ''}
              ${layoutMeta.isFlex ? `
              <div class="form-group">
                  <label class="checkbox-row">
                      <input type="checkbox" id="propLayoutReverse">
                      <span>Reverse Order</span>
                  </label>
              </div>
              ` : ''}
              ` : ''}
          `;

        const bindProp = (id, fn) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.addEventListener('input', (e) => fn(e.target.value));
        };

        bindProp('propName', (value) => this.updateComponentProps(instanceId, { name: value }));
        bindProp('propTitle', (value) => this.updateComponentProps(instanceId, { props: { title: value } }));
        bindProp('propText', (value) => this.updateComponentProps(instanceId, { props: { text: value } }));
        bindProp('propLinkText', (value) => this.updateComponentProps(instanceId, { props: { linkText: value } }));
          bindProp('propLinkHref', (value) => this.updateComponentProps(instanceId, { props: { linkHref: value } }));
          bindProp('propImageSrc', (value) => this.updateComponentProps(instanceId, { props: { imageSrc: value } }));
          bindProp('propImageAlt', (value) => this.updateComponentProps(instanceId, { props: { imageAlt: value } }));

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

    updateInspector(instanceId) {
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
        const primary = preview?.firstElementChild || preview;
        if (!primary) {
            this.inspectorContent.innerHTML = '<p class="no-selection">No rendered element available</p>';
            return;
        }

        const styles = window.getComputedStyle(primary);
        const rect = primary.getBoundingClientRect();
        const formatBox = (t, r, b, l) => `${t} ${r} ${b} ${l}`;

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
        const forCanvas = Boolean(options.forCanvas);
        const wrapper = document.createElement('div');
        wrapper.innerHTML = item.content || '';
        const props = item.props || {};
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
        const elements = this.getInlineEditableElements(wrapper);
        elements.forEach((el) => {
            const key = this.getInlineKeyForElement(el, wrapper);
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
        const images = Array.from(wrapper.querySelectorAll('img'));
        images.forEach((img) => {
            const key = this.getInlineKeyForElement(img, wrapper);
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

    updateComponentProps(instanceId, patch) {
        const item = this.findComponentById(instanceId);
        if (!item) return;

        if (typeof patch.name === 'string') {
            item.name = patch.name;
        }
        if (patch.props && typeof patch.props === 'object') {
            item.props = { ...(item.props || {}), ...patch.props };
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
            this.updateInspector(instanceId);
        }
    }

    hidePropertiesPanel() {
        this.propertiesPanel.classList.remove('active');
        this.selectedItem = null;
        this.updateInspector(null);
        
        document.querySelectorAll('.canvas-item').forEach(item => {
            item.classList.remove('selected');
        });
    }

      async showPreview() {
          const components = this.getActiveComponents();
          if (components.length === 0) {
              this.showToast('Add components to preview', 'warning');
              return;
          }

          if (this.builderMode === 'partial') {
              this.setPreviewMode(this.previewFrameWrap?.dataset?.size || 'desktop');
              this.previewFrame.srcdoc = this.generatePreviewHTML();
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
          ${microStyles}
      </style>
  </head>
  <body>
  `;

        html += wrapperOpen;
        components.forEach(item => {
            html += this.getRenderedComponentContent(item) + '\n';
        });
        html += wrapperClose;
        
        html += `
</body>
</html>`;
        
        return html;
    }

    showExportModal() {
        if (this.builderMode === 'page' && !this.project) {
            this.openProjectModal();
            this.showToast('Create or open a page first', 'warning');
            return;
        }

        if (this.getActiveComponents().length === 0) {
            this.showToast('Add components to export', 'warning');
            return;
        }

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
        return {
            project: this.project,
            pageName: effectivePageName,
            pageTitle: this.pageTitleInput.value || 'Untitled Page',
            createdAt: new Date().toISOString(),
            meta: {
                version: 1,
                updatedAt: new Date().toISOString()
            },
              layout: this.pageComponents.map((item, index) => ({
                  id: item.instanceId,
                  order: index + 1,
                  type: item.type,
                  partial: item.componentPath,
                  componentPath: item.componentPath,
                  name: item.name,
                  props: item.props || {},
                  children: item.children || {},
                  renderedContent: this.getRenderedComponentContent(item)
              }))
          };
      }

    getPartialData() {
        const name = (this.pageTitleInput.value || 'untitled-partial').trim();
          return {
              meta: {
                  version: 1,
                  type: 'partial',
                  updatedAt: new Date().toISOString()
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
                  renderedContent: this.getRenderedComponentContent(item)
              }))
          };
      }

    getPartialHTML() {
        const components = this.partialComponents;
        let html = '<div class="partial-builder">';
        components.forEach((item) => {
            html += this.getRenderedComponentContent(item) + '\n';
        });
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
