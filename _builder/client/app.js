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
        this.pageCreated = false;
        this.partialHeightCache = {};
        this.currentDragPartialPath = null;
        this.selectedItem = null;
        this.apiBase = '';
        this.pendingDeleteTarget = null;
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
        this.updateEditorBreadcrumb();
        this.showLandingScreen();
    }

    bindElements() {
        // Sidebar elements
        this.searchInput = document.getElementById('searchPartials');
        this.partialsList = document.getElementById('partialsList');
        this.syncPagePartials = document.getElementById('syncPagePartials');
        
        // Canvas elements
        this.canvas = document.getElementById('canvas');
        this.canvasDropZone = document.getElementById('canvasDropZone');
        this.canvasEmpty = document.getElementById('canvasEmpty');
        this.componentCount = document.getElementById('componentCount');
        
        // Buttons
        this.btnUndo = document.getElementById('btnUndo');
        this.btnRedo = document.getElementById('btnRedo');
        this.btnClear = document.getElementById('btnClear');
        this.btnPreview = document.getElementById('btnPreview');
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
        this.previewFrame = document.getElementById('previewFrame');
        this.exportOutput = document.getElementById('exportOutput');
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
    }

    bindEvents() {
        // Search
        this.searchInput.addEventListener('input', () => this.filterComponents());
        
        // Toolbar buttons
        this.btnUndo.addEventListener('click', () => this.undo());
        this.btnRedo.addEventListener('click', () => this.redo());
        this.btnClear.addEventListener('click', () => this.clearCanvas());
        this.btnPreview.addEventListener('click', () => this.showPreview());
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
        
        // Export buttons
        document.getElementById('copyExport').addEventListener('click', () => this.copyToClipboard());
        document.getElementById('downloadExport').addEventListener('click', () => this.downloadExport());
        
        // Close modals on background click
        [this.previewModal, this.exportModal, this.loadLayoutModal, this.deleteProjectModal, this.closePageConfirmModal, this.createProjectModal, this.createPageModal, this.partialCodeModal, this.partialPreviewModal].forEach(modal => {
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
                    } else {
                        this.hideModal(modal);
                    }
                }
            });
        });
        
        // Properties panel
        this.closeProperties.addEventListener('click', () => this.hidePropertiesPanel());
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
        this.btnToggleStitchMode.disabled = isLocked;
        this.btnExport.disabled = isLocked;
        this.btnSave.disabled = isLocked;
        this.btnClosePage.disabled = isLocked;
        this.syncPagePartials.disabled = isLocked;
        this.searchInput.disabled = isLocked;
        this.pageTitleInput.disabled = isLocked;
        if (this.partialsSortable) this.partialsSortable.option('disabled', isLocked);
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

    toggleStitchMode() {
        const isActive = this.canvas.classList.toggle('stitch-mode');
        this.btnToggleStitchMode.classList.toggle('btn-primary', isActive);
        this.btnToggleStitchMode.classList.toggle('btn-secondary', !isActive);
        this.btnToggleStitchMode.querySelector('span').textContent = isActive ? 'Edit View' : 'Stitch View';
        this.btnToggleStitchMode.title = isActive ? 'Switch to Edit View' : 'Switch to Stitch View';
    }

    openProjectModal() {
        this.showLandingScreen();
    }

    showLandingScreen() {
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
        this.openCreateProjectButton.innerHTML = '<i class="fas fa-file"></i> Create Page';
    }

    handleLandingPrimaryAction() {
        this.showCreatePageModal();
    }

    enterBuilder() {
        this.landingScreen.classList.remove('active');
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
            this.renderPartials(this.partials);
        } catch (error) {
            console.error('Error loading partials:', error);
            this.partialsList.innerHTML = '<div class="loading">Error loading components</div>';
            this.showToast('Failed to load components', 'error');
        }
    }

    renderPartials(partials) {
        if (!partials || partials.length === 0) {
            this.partialsList.innerHTML = '<div class="loading">No components match the current search/filter</div>';
            return;
        }

        const sorted = [...partials].sort((a, b) => {
            const byCategory = String(a.category || '').localeCompare(String(b.category || ''));
            if (byCategory !== 0) return byCategory;
            return String(a.name || '').localeCompare(String(b.name || ''));
        });

        let html = '';
        sorted.forEach((partial) => {
            html += this.createComponentItem(partial);
        });
        
        this.partialsList.innerHTML = html;
        this.bindPartialCodeButtons();
        this.bindPartialPreviewButtons();
        
        // Reinitialize sortable for new items
        this.partialsSortable.option('disabled', false);
    }

    bindPartialCodeButtons() {
        this.partialsList.querySelectorAll('.component-view-code').forEach((button) => {
            button.addEventListener('mousedown', (e) => e.stopPropagation());
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                e.stopPropagation();
                const partialPath = e.currentTarget.dataset.path;
                await this.openPartialCodeModal(partialPath);
            });
        });
    }

    bindPartialPreviewButtons() {
        this.partialsList.querySelectorAll('.component-view-preview').forEach((button) => {
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

    filterComponents() {
        const query = (this.searchInput.value || '').trim().toLowerCase();

        const filtered = this.partials.filter(p => {
            const queryMatch = !query ||
                p.name.toLowerCase().includes(query) ||
                p.path.toLowerCase().includes(query) ||
                (p.category || '').toLowerCase().includes(query);
            return queryMatch;
        });

        this.renderPartials(filtered);
    }

    renderCanvasFromState() {
        this.editorCanvas.renderCanvasFromState(this);
    }

    removeCanvasItem(instanceId) {
        this.pushHistory();
        const index = this.pageComponents.findIndex(item => item.instanceId === instanceId);
        if (index > -1) {
            this.pageComponents.splice(index, 1);
        }
        this.renderCanvasFromState();
        this.refreshLivePreview();
        this.showToast('Component removed', 'success');
    }

    duplicateCanvasItem(instanceId) {
        const index = this.pageComponents.findIndex(item => item.instanceId === instanceId);
        if (index === -1) {
            return;
        }
        this.pushHistory();

        const original = this.pageComponents[index];
        const duplicate = {
            ...original,
            instanceId: 'instance-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9)
        };
        this.pageComponents.splice(index + 1, 0, duplicate);
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
        }
    }

    updateCanvasState() {
        this.editorCanvas.updateCanvasState(this);
    }

    clearCanvas() {
        if (this.pageComponents.length === 0) {
            this.showToast('Canvas is already empty', 'warning');
            return;
        }
        
        if (confirm('Are you sure you want to clear all components?')) {
            this.pushHistory();
            this.pageComponents = [];
            this.canvasDropZone.innerHTML = '';
            this.updateCanvasState();
            this.refreshLivePreview();
            this.showToast('Canvas cleared', 'success');
        }
    }

    showPropertiesPanel(instanceId) {
        const item = this.pageComponents.find(i => i.instanceId === instanceId);
        if (!item) return;
        const defaults = this.extractDefaultsFromContent(item.content);
        const props = { ...defaults, ...(item.props || {}) };
        
        this.propertiesPanel.classList.add('active');
        
        this.propertiesContent.innerHTML = `
            <div class="form-group">
                <label>Component Type</label>
                <input type="text" value="${item.type}" disabled>
            </div>
            <div class="form-group">
                <label>File Path</label>
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

    getRenderedComponentContent(item) {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = item.content;
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

        return wrapper.innerHTML;
    }

    updateComponentProps(instanceId, patch) {
        const item = this.pageComponents.find(i => i.instanceId === instanceId);
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
            const contentEl = element.querySelector('.content-preview');
            if (contentEl) {
                contentEl.innerHTML = this.getRenderedComponentContent(item);
            }
        }

        this.refreshLivePreview();
    }

    hidePropertiesPanel() {
        this.propertiesPanel.classList.remove('active');
        this.selectedItem = null;
        
        document.querySelectorAll('.canvas-item').forEach(item => {
            item.classList.remove('selected');
        });
    }

    async showPreview() {
        if (this.pageComponents.length === 0) {
            this.showToast('Add components to preview', 'warning');
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
        let html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.pageTitleInput.value || 'Preview'}</title>
    <link rel="stylesheet" href="../../../build/css/styles.css">
    <style>
        body { margin: 0; padding: 20px; }
        * { box-sizing: border-box; }
    </style>
</head>
<body>
`;
        
        this.pageComponents.forEach(item => {
            html += this.getRenderedComponentContent(item) + '\n';
        });
        
        html += `
</body>
</html>`;
        
        return html;
    }

    showExportModal() {
        if (!this.project) {
            this.openProjectModal();
            this.showToast('Create or open a page first', 'warning');
            return;
        }

        if (this.pageComponents.length === 0) {
            this.showToast('Add components to export', 'warning');
            return;
        }
        
        const layoutData = this.getLayoutData();
        this.exportOutput.value = JSON.stringify(layoutData, null, 2);
        
        this.exportModal.classList.add('active');
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
                renderedContent: this.getRenderedComponentContent(item)
            }))
        };
    }

    copyToClipboard() {
        this.exportOutput.select();
        document.execCommand('copy');
        this.showToast('Copied to clipboard', 'success');
    }

    downloadExport() {
        const data = this.exportOutput.value;
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.pageTitleInput.value || 'layout'}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showToast('Layout downloaded', 'success');
    }

    async saveLayout() {
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

    hideModal(modal) {
        this.modals.hide(modal);
    }

    showToast(message, type = 'success') {
        this.notifications.showToast(message, type);
    }
}

// Initialize the builder
const builder = new VisualBuilder();
