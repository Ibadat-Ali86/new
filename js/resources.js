// Resources Manager
class ResourcesManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.currentResource = null;
        this.currentResourceType = 'link';
        this.initEventListeners();
    }

    initEventListeners() {
        // Resource modal
        const resourceModal = document.getElementById('resource-modal');
        const resourceForm = document.getElementById('resource-form');
        const resourceModalClose = document.getElementById('resource-modal-close');
        const resourceCancelBtn = document.getElementById('resource-cancel-btn');
        const addResourceBtn = document.getElementById('add-resource-btn');
        
        // Resource type tabs
        const resourceTypeTabs = document.querySelectorAll('.resource-type-tab');
        const fileUploadArea = document.getElementById('file-upload-area');
        const resourceFileInput = document.getElementById('resource-file');
        
        // Search and filter
        const resourcesSearch = document.getElementById('resources-search');
        const resourcesCategory = document.getElementById('resources-category');
        
        // Modal triggers
        addResourceBtn?.addEventListener('click', () => {
            this.showResourceModal();
        });
        
        // Resource actions
        document.addEventListener('click', (e) => {
            if (e.target.closest('.resource-action-btn[data-action="edit"]')) {
                const resourceId = e.target.closest('.resource-card').dataset.resourceId;
                this.editResource(resourceId);
            }
            
            if (e.target.closest('.resource-action-btn[data-action="delete"]')) {
                const resourceId = e.target.closest('.resource-card').dataset.resourceId;
                this.deleteResource(resourceId);
            }
            
            if (e.target.closest('.resource-action-btn[data-action="view"]')) {
                const resourceId = e.target.closest('.resource-card').dataset.resourceId;
                this.viewResource(resourceId);
            }
        });
        
        // Modal close
        [resourceModalClose, resourceCancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.hideResourceModal());
            }
        });
        
        // Close modal on backdrop click
        resourceModal?.addEventListener('click', (e) => {
            if (e.target === resourceModal) {
                this.hideResourceModal();
            }
        });
        
        // Form submission
        resourceForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveResource();
        });
        
        // Resource type tabs
        resourceTypeTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchResourceType(tab.dataset.type);
            });
        });
        
        // File upload
        fileUploadArea?.addEventListener('click', () => {
            resourceFileInput?.click();
        });
        
        fileUploadArea?.addEventListener('dragover', (e) => {
            e.preventDefault();
            fileUploadArea.classList.add('dragover');
        });
        
        fileUploadArea?.addEventListener('dragleave', () => {
            fileUploadArea.classList.remove('dragover');
        });
        
        fileUploadArea?.addEventListener('drop', (e) => {
            e.preventDefault();
            fileUploadArea.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });
        
        resourceFileInput?.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });
        
        // Search and filter
        resourcesSearch?.addEventListener('input', Utils.debounce(() => {
            this.filterResources();
        }, 300));
        
        resourcesCategory?.addEventListener('change', () => {
            this.filterResources();
        });
    }

    // Show resource modal
    showResourceModal(resourceData = null) {
        const modal = document.getElementById('resource-modal');
        const modalTitle = document.getElementById('resource-modal-title');
        const form = document.getElementById('resource-form');
        const saveBtn = document.getElementById('resource-save-btn');
        
        this.currentResource = resourceData;
        
        // Set modal title and button text
        modalTitle.textContent = resourceData ? 'Edit Resource' : 'Add Resource';
        saveBtn.textContent = resourceData ? 'Save Changes' : 'Add Resource';
        
        // Reset form
        form.reset();
        this.switchResourceType('link');
        
        // Populate form if editing
        if (resourceData) {
            this.populateResourceForm(resourceData);
        } else {
            this.populateGoalSelect();
        }
        
        // Show modal
        modal.classList.remove('hidden');
        AnimationUtils.fadeIn(modal);
        
        // Focus first input
        setTimeout(() => {
            const firstInput = form.querySelector('input:not([hidden]), textarea, select');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }

    // Hide resource modal
    hideResourceModal() {
        const modal = document.getElementById('resource-modal');
        const form = document.getElementById('resource-form');
        
        modal.classList.add('hidden');
        form.reset();
        this.currentResource = null;
    }

    // Populate resource form for editing
    populateResourceForm(resource) {
        // Switch to correct resource type
        this.switchResourceType(resource.resourceType);
        
        // Populate common fields
        document.getElementById('resource-title').value = resource.title || '';
        document.getElementById('resource-description').value = resource.description || '';
        document.getElementById('resource-category').value = resource.category || '';
        document.getElementById('resource-tags').value = resource.tags ? resource.tags.join(', ') : '';
        
        // Populate type-specific fields
        if (resource.resourceType === 'link') {
            document.getElementById('resource-url').value = resource.url || '';
        } else if (resource.resourceType === 'note') {
            document.getElementById('resource-content').value = resource.content || '';
        }
        
        // Populate goal select
        this.populateGoalSelect(resource.goalId);
    }

    // Populate goal select dropdown
    populateGoalSelect(selectedGoalId = null) {
        const goalSelect = document.getElementById('resource-goal');
        if (!goalSelect) return;
        
        const goals = this.dataManager.getGoals();
        goalSelect.innerHTML = '<option value="">No specific goal</option>';
        
        goals.forEach(goal => {
            const option = document.createElement('option');
            option.value = goal.id;
            option.textContent = goal.title;
            if (selectedGoalId && goal.id === selectedGoalId) {
                option.selected = true;
            }
            goalSelect.appendChild(option);
        });
    }

    // Switch resource type
    switchResourceType(type) {
        this.currentResourceType = type;
        
        // Update tabs
        document.querySelectorAll('.resource-type-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.type === type);
        });
        
        // Show/hide content sections
        document.querySelectorAll('.resource-type-content').forEach(section => {
            section.classList.toggle('hidden', !section.id.includes(type));
        });
    }

    // Handle file selection
    handleFileSelect(file) {
        const fileUploadArea = document.getElementById('file-upload-area');
        const maxSize = 10 * 1024 * 1024; // 10MB limit
        
        if (file.size > maxSize) {
            window.showToast('File size must be less than 10MB', 'error');
            return;
        }
        
        // Update UI to show selected file
        fileUploadArea.innerHTML = `
            <i class="fas fa-file"></i>
            <p><strong>${file.name}</strong></p>
            <p>${Utils.formatFileSize(file.size)}</p>
            <input type="file" id="resource-file" hidden>
        `;
        
        // Store file reference (in real app, you'd upload to server)
        this.selectedFile = file;
        
        // Auto-populate title if empty
        const titleInput = document.getElementById('resource-title');
        if (!titleInput.value) {
            titleInput.value = file.name.split('.')[0];
        }
    }

    // Save resource
    saveResource() {
        const formData = this.getResourceFormData();
        
        try {
            // Validate form data
            this.validateResourceData(formData);
            
            if (this.currentResource) {
                // Update existing resource
                const updatedResource = this.dataManager.updateResource(this.currentResource.id, formData);
                if (updatedResource) {
                    window.showToast('Resource updated successfully!', 'success');
                    this.renderResources();
                    this.hideResourceModal();
                }
            } else {
                // Create new resource
                const newResource = this.dataManager.addResource(formData);
                if (newResource) {
                    window.showToast('Resource added successfully!', 'success');
                    this.renderResources();
                    this.hideResourceModal();
                }
            }
        } catch (error) {
            window.showToast(error.message, 'error');
        }
    }

    // Get form data
    getResourceFormData() {
        const title = document.getElementById('resource-title').value.trim();
        const description = document.getElementById('resource-description').value.trim();
        const category = document.getElementById('resource-category').value;
        const goalId = document.getElementById('resource-goal').value || null;
        const tagsInput = document.getElementById('resource-tags').value.trim();
        const tags = tagsInput ? tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag) : [];
        
        const resourceData = {
            title,
            description,
            category,
            goalId,
            tags,
            resourceType: this.currentResourceType
        };
        
        // Add type-specific data
        if (this.currentResourceType === 'link') {
            resourceData.url = document.getElementById('resource-url').value.trim();
        } else if (this.currentResourceType === 'note') {
            resourceData.content = document.getElementById('resource-content').value.trim();
        } else if (this.currentResourceType === 'file' && this.selectedFile) {
            resourceData.fileName = this.selectedFile.name;
            resourceData.fileSize = this.selectedFile.size;
            resourceData.fileType = this.selectedFile.type;
            // In a real app, you'd upload the file and store the path
            resourceData.filePath = `/uploads/${this.selectedFile.name}`;
        }
        
        return resourceData;
    }

    // Validate resource data
    validateResourceData(data) {
        if (!data.title) {
            throw new Error('Resource title is required');
        }
        
        if (!data.category) {
            throw new Error('Please select a category');
        }
        
        if (data.resourceType === 'link') {
            if (!data.url) {
                throw new Error('URL is required for link resources');
            }
            if (!Utils.isValidURL(data.url)) {
                throw new Error('Please enter a valid URL');
            }
        } else if (data.resourceType === 'note') {
            if (!data.content) {
                throw new Error('Content is required for note resources');
            }
        } else if (data.resourceType === 'file') {
            if (!this.selectedFile && !this.currentResource) {
                throw new Error('Please select a file');
            }
        }
    }

    // Edit resource
    editResource(resourceId) {
        const resources = this.dataManager.getResources();
        const resource = resources.find(r => r.id === resourceId);
        
        if (resource) {
            this.showResourceModal(resource);
        }
    }

    // Delete resource
    deleteResource(resourceId) {
        if (confirm('Are you sure you want to delete this resource?')) {
            const success = this.dataManager.deleteResource(resourceId);
            
            if (success) {
                window.showToast('Resource deleted successfully!', 'success');
                this.renderResources();
            } else {
                window.showToast('Failed to delete resource', 'error');
            }
        }
    }

    // View resource
    viewResource(resourceId) {
        const resources = this.dataManager.getResources();
        const resource = resources.find(r => r.id === resourceId);
        
        if (!resource) return;
        
        // Update last accessed time
        this.dataManager.updateResource(resourceId, {
            lastAccessed: new Date().toISOString()
        });
        
        if (resource.resourceType === 'link' && resource.url) {
            window.open(resource.url, '_blank');
        } else if (resource.resourceType === 'note') {
            this.showNoteModal(resource);
        } else if (resource.resourceType === 'file') {
            window.showToast('File viewing not implemented in demo', 'info');
        }
    }

    // Show note in modal
    showNoteModal(resource) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${Utils.sanitizeHTML(resource.title)}</h3>
                    <button class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="padding: 1.5rem;">
                    <div style="white-space: pre-wrap; line-height: 1.6;">${Utils.sanitizeHTML(resource.content)}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal
        const closeModal = () => {
            modal.remove();
        };
        
        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        // Show modal
        AnimationUtils.fadeIn(modal);
    }

    // Render resources
    renderResources() {
        const container = document.getElementById('resources-container');
        if (!container) return;
        
        const resources = this.getFilteredResources();
        
        if (resources.length === 0) {
            container.innerHTML = this.getEmptyState();
            return;
        }
        
        container.innerHTML = resources.map(resource => this.renderResourceCard(resource)).join('');
    }

    // Get filtered resources
    getFilteredResources() {
        const query = document.getElementById('resources-search')?.value || '';
        const category = document.getElementById('resources-category')?.value || 'all';
        
        const filters = {};
        if (category !== 'all') {
            filters.category = category;
        }
        
        return this.dataManager.searchResources(query, filters);
    }

    // Render single resource card
    renderResourceCard(resource) {
        const icon = Utils.getCategoryIcon(resource.category);
        const typeIcon = this.getResourceTypeIcon(resource.resourceType);
        
        return `
            <div class="resource-card" data-resource-id="${resource.id}">
                <div class="resource-thumbnail">
                    <i class="${icon}"></i>
                    <span class="resource-type-badge">${typeIcon} ${resource.resourceType}</span>
                </div>
                
                <div class="resource-content">
                    <h3 class="resource-title">${Utils.sanitizeHTML(resource.title)}</h3>
                    
                    ${resource.description ? `
                        <p class="resource-description">${Utils.sanitizeHTML(resource.description)}</p>
                    ` : ''}
                    
                    ${resource.tags && resource.tags.length > 0 ? `
                        <div class="resource-tags">
                            ${resource.tags.slice(0, 3).map(tag => `
                                <span class="resource-tag">${Utils.sanitizeHTML(tag)}</span>
                            `).join('')}
                            ${resource.tags.length > 3 ? `<span class="resource-tag">+${resource.tags.length - 3}</span>` : ''}
                        </div>
                    ` : ''}
                    
                    <div class="resource-footer">
                        <span class="resource-date">${Utils.formatRelativeTime(resource.createdAt)}</span>
                        <div class="resource-actions">
                            <button class="resource-action-btn" data-action="view" title="View resource">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="resource-action-btn" data-action="edit" title="Edit resource">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="resource-action-btn" data-action="delete" title="Delete resource">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Get resource type icon
    getResourceTypeIcon(type) {
        const icons = {
            link: 'fas fa-link',
            file: 'fas fa-file',
            note: 'fas fa-sticky-note'
        };
        return `<i class="${icons[type] || icons.link}"></i>`;
    }

    // Get empty state HTML
    getEmptyState() {
        const search = document.getElementById('resources-search')?.value;
        const category = document.getElementById('resources-category')?.value;
        
        if (search || (category && category !== 'all')) {
            return `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-search"></i>
                    </div>
                    <h3>No resources found</h3>
                    <p>Try adjusting your search criteria or filters.</p>
                    <button class="btn btn-secondary" onclick="window.resourcesManager.clearFilters()">
                        Clear Filters
                    </button>
                </div>
            `;
        }
        
        return `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-book"></i>
                </div>
                <h3>No resources yet</h3>
                <p>Start building your learning library by adding resources!</p>
                <button class="btn btn-primary" onclick="window.resourcesManager.showResourceModal()">
                    <i class="fas fa-plus"></i> Add Your First Resource
                </button>
            </div>
        `;
    }

    // Clear filters
    clearFilters() {
        const searchInput = document.getElementById('resources-search');
        const categorySelect = document.getElementById('resources-category');
        
        if (searchInput) searchInput.value = '';
        if (categorySelect) categorySelect.value = 'all';
        
        this.filterResources();
    }

    // Filter resources based on current filter settings
    filterResources() {
        this.renderResources();
    }

    // Get resource statistics
    getResourceStats() {
        const resources = this.dataManager.getResources();
        const byCategory = Utils.groupBy(resources, 'category');
        const byType = Utils.groupBy(resources, 'resourceType');
        
        return {
            total: resources.length,
            byCategory,
            byType,
            recentlyAdded: resources.filter(r => {
                const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                return new Date(r.createdAt) > dayAgo;
            }).length
        };
    }
}

// Export for global use
window.ResourcesManager = ResourcesManager;