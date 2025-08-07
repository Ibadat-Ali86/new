// Goals Manager
class GoalsManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.currentGoal = null;
        this.initEventListeners();
    }

    initEventListeners() {
        // Goal creation/editing modal
        const goalModal = document.getElementById('goal-modal');
        const goalForm = document.getElementById('goal-form');
        const goalModalClose = document.getElementById('goal-modal-close');
        const goalCancelBtn = document.getElementById('goal-cancel-btn');
        const addMilestoneBtn = document.getElementById('add-milestone-btn');
        
        // Modal triggers
        document.addEventListener('click', (e) => {
            if (e.target.matches('#add-goal-btn, #create-goal-btn')) {
                this.showGoalModal();
            }
            
            if (e.target.closest('.goal-action-btn[data-action="edit"]')) {
                const goalId = e.target.closest('.goal-card').dataset.goalId;
                this.editGoal(goalId);
            }
            
            if (e.target.closest('.goal-action-btn[data-action="delete"]')) {
                const goalId = e.target.closest('.goal-card').dataset.goalId;
                this.deleteGoal(goalId);
            }
        });
        
        // Modal close
        [goalModalClose, goalCancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.hideGoalModal());
            }
        });
        
        // Close modal on backdrop click
        goalModal?.addEventListener('click', (e) => {
            if (e.target === goalModal) {
                this.hideGoalModal();
            }
        });
        
        // Form submission
        goalForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveGoal();
        });
        
        // Add milestone button
        addMilestoneBtn?.addEventListener('click', () => {
            this.addMilestoneInput();
        });
        
        // Milestone completion
        document.addEventListener('click', (e) => {
            if (e.target.matches('.milestone-checkbox')) {
                const goalId = e.target.closest('.goal-card').dataset.goalId;
                const milestoneId = e.target.dataset.milestoneId;
                this.toggleMilestone(goalId, milestoneId);
            }
        });
        
        // Filter and sort
        const goalsFilter = document.getElementById('goals-filter');
        const goalsSort = document.getElementById('goals-sort');
        
        goalsFilter?.addEventListener('change', () => this.filterGoals());
        goalsSort?.addEventListener('change', () => this.filterGoals());
    }

    // Show goal creation/editing modal
    showGoalModal(goalData = null) {
        const modal = document.getElementById('goal-modal');
        const modalTitle = document.getElementById('goal-modal-title');
        const form = document.getElementById('goal-form');
        const saveBtn = document.getElementById('goal-save-btn');
        
        this.currentGoal = goalData;
        
        // Set modal title and button text
        modalTitle.textContent = goalData ? 'Edit Goal' : 'Create New Goal';
        saveBtn.textContent = goalData ? 'Save Changes' : 'Create Goal';
        
        // Populate form if editing
        if (goalData) {
            this.populateGoalForm(goalData);
        } else {
            form.reset();
            this.resetMilestones();
        }
        
        // Show modal
        modal.classList.remove('hidden');
        AnimationUtils.fadeIn(modal);
        
        // Focus first input
        const firstInput = form.querySelector('input, textarea, select');
        if (firstInput) {
            setTimeout(() => firstInput.focus(), 100);
        }
    }

    // Hide goal modal
    hideGoalModal() {
        const modal = document.getElementById('goal-modal');
        const form = document.getElementById('goal-form');
        
        modal.classList.add('hidden');
        form.reset();
        this.resetMilestones();
        this.currentGoal = null;
    }

    // Populate goal form for editing
    populateGoalForm(goal) {
        document.getElementById('goal-title').value = goal.title || '';
        document.getElementById('goal-description').value = goal.description || '';
        document.getElementById('goal-category').value = goal.category || '';
        document.getElementById('goal-priority').value = goal.priority || 'medium';
        
        if (goal.targetDate) {
            const date = new Date(goal.targetDate);
            document.getElementById('goal-target-date').value = date.toISOString().split('T')[0];
        }
        
        // Populate milestones
        this.resetMilestones();
        if (goal.milestones && goal.milestones.length > 0) {
            goal.milestones.forEach((milestone, index) => {
                if (index > 0) this.addMilestoneInput();
                const milestoneInputs = document.querySelectorAll('.milestone-title');
                if (milestoneInputs[index]) {
                    milestoneInputs[index].value = milestone.title;
                }
            });
        }
    }

    // Reset milestones to single empty input
    resetMilestones() {
        const container = document.getElementById('milestones-container');
        container.innerHTML = `
            <div class="milestone-item">
                <input type="text" placeholder="Milestone title" class="milestone-title">
                <button type="button" class="milestone-remove">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        // Add event listener to the remove button
        const removeBtn = container.querySelector('.milestone-remove');
        removeBtn.addEventListener('click', (e) => {
            this.removeMilestoneInput(e.target.closest('.milestone-item'));
        });
    }

    // Add milestone input
    addMilestoneInput() {
        const container = document.getElementById('milestones-container');
        const milestoneItem = document.createElement('div');
        milestoneItem.className = 'milestone-item';
        milestoneItem.innerHTML = `
            <input type="text" placeholder="Milestone title" class="milestone-title">
            <button type="button" class="milestone-remove">
                <i class="fas fa-trash"></i>
            </button>
        `;
        
        // Add event listener
        const removeBtn = milestoneItem.querySelector('.milestone-remove');
        removeBtn.addEventListener('click', () => {
            this.removeMilestoneInput(milestoneItem);
        });
        
        container.appendChild(milestoneItem);
        
        // Focus the new input
        const newInput = milestoneItem.querySelector('.milestone-title');
        newInput.focus();
    }

    // Remove milestone input
    removeMilestoneInput(milestoneItem) {
        const container = document.getElementById('milestones-container');
        const items = container.querySelectorAll('.milestone-item');
        
        // Don't remove if it's the only one
        if (items.length > 1) {
            milestoneItem.remove();
        } else {
            // Clear the input instead
            const input = milestoneItem.querySelector('.milestone-title');
            input.value = '';
        }
    }

    // Save goal (create or update)
    saveGoal() {
        const formData = this.getGoalFormData();
        
        try {
            // Validate form data
            this.validateGoalData(formData);
            
            if (this.currentGoal) {
                // Update existing goal
                const updatedGoal = this.dataManager.updateGoal(this.currentGoal.id, formData);
                if (updatedGoal) {
                    window.showToast('Goal updated successfully!', 'success');
                    this.renderGoals();
                    this.hideGoalModal();
                }
            } else {
                // Create new goal
                const newGoal = this.dataManager.addGoal(formData);
                if (newGoal) {
                    window.showToast('Goal created successfully!', 'success');
                    this.renderGoals();
                    this.hideGoalModal();
                    
                    // Update dashboard stats
                    this.updateDashboardStats();
                }
            }
        } catch (error) {
            window.showToast(error.message, 'error');
        }
    }

    // Get form data
    getGoalFormData() {
        const title = document.getElementById('goal-title').value.trim();
        const description = document.getElementById('goal-description').value.trim();
        const category = document.getElementById('goal-category').value;
        const priority = document.getElementById('goal-priority').value;
        const targetDateInput = document.getElementById('goal-target-date').value;
        
        // Collect milestones
        const milestoneInputs = document.querySelectorAll('.milestone-title');
        const milestones = Array.from(milestoneInputs)
            .map((input, index) => ({
                id: this.currentGoal?.milestones?.[index]?.id || Utils.generateId(),
                title: input.value.trim(),
                isCompleted: this.currentGoal?.milestones?.[index]?.isCompleted || false
            }))
            .filter(milestone => milestone.title); // Remove empty milestones
        
        return {
            title,
            description,
            category,
            priority,
            targetDate: targetDateInput ? new Date(targetDateInput).toISOString() : null,
            milestones
        };
    }

    // Validate goal data
    validateGoalData(data) {
        if (!data.title) {
            throw new Error('Goal title is required');
        }
        
        if (!data.category) {
            throw new Error('Please select a category');
        }
        
        if (data.targetDate && new Date(data.targetDate) <= new Date()) {
            throw new Error('Target date must be in the future');
        }
        
        if (data.milestones.length === 0) {
            throw new Error('Please add at least one milestone');
        }
    }

    // Edit goal
    editGoal(goalId) {
        const goals = this.dataManager.getGoals();
        const goal = goals.find(g => g.id === goalId);
        
        if (goal) {
            this.showGoalModal(goal);
        }
    }

    // Delete goal
    deleteGoal(goalId) {
        if (confirm('Are you sure you want to delete this goal? This action cannot be undone.')) {
            const success = this.dataManager.deleteGoal(goalId);
            
            if (success) {
                window.showToast('Goal deleted successfully!', 'success');
                this.renderGoals();
                this.updateDashboardStats();
            } else {
                window.showToast('Failed to delete goal', 'error');
            }
        }
    }

    // Toggle milestone completion
    toggleMilestone(goalId, milestoneId) {
        const goals = this.dataManager.getGoals();
        const goal = goals.find(g => g.id === goalId);
        
        if (goal) {
            const milestone = goal.milestones.find(m => m.id === milestoneId);
            if (milestone) {
                const updatedGoal = this.dataManager.updateMilestone(goalId, milestoneId, {
                    isCompleted: !milestone.isCompleted
                });
                
                if (updatedGoal) {
                    this.renderGoals();
                    this.updateDashboardStats();
                    
                    if (!milestone.isCompleted) {
                        window.showToast('Milestone completed! 🎉', 'success');
                    }
                }
            }
        }
    }

    // Render goals
    renderGoals() {
        const container = document.getElementById('goals-container');
        if (!container) return;
        
        const goals = this.getFilteredGoals();
        
        if (goals.length === 0) {
            container.innerHTML = this.getEmptyState();
            return;
        }
        
        container.innerHTML = goals.map(goal => this.renderGoalCard(goal)).join('');
    }

    // Get filtered and sorted goals
    getFilteredGoals() {
        const filter = document.getElementById('goals-filter')?.value || 'all';
        const sortBy = document.getElementById('goals-sort')?.value || 'created';
        
        let goals = this.dataManager.getGoals();
        
        // Apply filter
        if (filter !== 'all') {
            goals = this.dataManager.searchGoals('', { status: filter });
        }
        
        // Apply sort
        let sortField = 'createdAt';
        let sortOrder = 'desc';
        
        switch (sortBy) {
            case 'priority':
                sortField = 'priority';
                sortOrder = 'asc';
                // Custom sort for priority
                goals.sort((a, b) => {
                    const priorityOrder = { high: 3, medium: 2, low: 1 };
                    return priorityOrder[b.priority] - priorityOrder[a.priority];
                });
                return goals;
            case 'deadline':
                goals = goals.filter(g => g.targetDate).sort((a, b) => new Date(a.targetDate) - new Date(b.targetDate));
                return goals;
            case 'progress':
                sortField = 'progress';
                sortOrder = 'desc';
                break;
        }
        
        return Utils.sortBy(goals, sortField, sortOrder);
    }

    // Render single goal card
    renderGoalCard(goal) {
        const completedMilestones = goal.milestones.filter(m => m.isCompleted).length;
        const totalMilestones = goal.milestones.length;
        const progress = Utils.calculateProgress(completedMilestones, totalMilestones);
        
        const isOverdue = Utils.isOverdue(goal.targetDate);
        const isUpcoming = Utils.isUpcoming(goal.targetDate);
        
        let deadlineClass = '';
        let deadlineText = '';
        
        if (goal.targetDate) {
            if (isOverdue && !goal.isCompleted) {
                deadlineClass = 'overdue';
                deadlineText = `Overdue by ${Math.ceil((new Date() - new Date(goal.targetDate)) / (1000 * 60 * 60 * 24))} days`;
            } else if (isUpcoming) {
                deadlineClass = 'upcoming';
                deadlineText = `Due in ${Math.ceil((new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24))} days`;
            } else {
                deadlineText = `Due ${Utils.formatDate(goal.targetDate)}`;
            }
        }
        
        return `
            <div class="goal-card priority-${goal.priority}" data-goal-id="${goal.id}">
                <div class="goal-header">
                    <div class="goal-info">
                        <h3 class="goal-title">${Utils.sanitizeHTML(goal.title)}</h3>
                        <span class="goal-category">${Utils.sanitizeHTML(goal.category)}</span>
                    </div>
                    <div class="goal-actions">
                        <button class="goal-action-btn" data-action="edit" title="Edit goal">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="goal-action-btn" data-action="delete" title="Delete goal">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                
                ${goal.description ? `<p class="goal-description">${Utils.sanitizeHTML(goal.description)}</p>` : ''}
                
                <div class="goal-progress">
                    <div class="progress-header">
                        <span class="progress-label">Progress</span>
                        <span class="progress-percentage">${progress}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progress}%"></div>
                    </div>
                </div>
                
                ${goal.milestones.length > 0 ? `
                    <div class="milestones-list">
                        ${goal.milestones.map(milestone => `
                            <div class="milestone-item">
                                <div class="milestone-checkbox ${milestone.isCompleted ? 'checked' : ''}" 
                                     data-milestone-id="${milestone.id}"></div>
                                <span class="milestone-text ${milestone.isCompleted ? 'completed' : ''}">${Utils.sanitizeHTML(milestone.title)}</span>
                            </div>
                        `).join('')}
                    </div>
                ` : ''}
                
                <div class="goal-meta">
                    <span class="goal-creation">
                        <i class="fas fa-calendar-plus"></i>
                        Created ${Utils.formatRelativeTime(goal.createdAt)}
                    </span>
                    ${deadlineText ? `
                        <span class="goal-deadline ${deadlineClass}">
                            <i class="fas fa-clock"></i>
                            ${deadlineText}
                        </span>
                    ` : ''}
                </div>
            </div>
        `;
    }

    // Get empty state HTML
    getEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-bullseye"></i>
                </div>
                <h3>No goals yet</h3>
                <p>Create your first learning goal to get started on your journey!</p>
                <button class="btn btn-primary" onclick="window.goalsManager.showGoalModal()">
                    <i class="fas fa-plus"></i> Create Your First Goal
                </button>
            </div>
        `;
    }

    // Filter goals based on current filter/sort settings
    filterGoals() {
        this.renderGoals();
    }

    // Render recent goals for dashboard
    renderRecentGoals() {
        const container = document.getElementById('recent-goals');
        if (!container) return;
        
        const goals = this.dataManager.getGoals()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
            .slice(0, 3);
        
        if (goals.length === 0) {
            container.innerHTML = `
                <div class="empty-state-small">
                    <p>No goals created yet</p>
                    <button class="btn btn-sm btn-primary" onclick="window.goalsManager.showGoalModal()">
                        Create Goal
                    </button>
                </div>
            `;
            return;
        }
        
        container.innerHTML = goals.map(goal => `
            <div class="goal-card goal-card-small" data-goal-id="${goal.id}">
                <div class="goal-header">
                    <div class="goal-info">
                        <h4 class="goal-title">${Utils.sanitizeHTML(goal.title)}</h4>
                        <span class="goal-category">${Utils.sanitizeHTML(goal.category)}</span>
                    </div>
                </div>
                
                <div class="goal-progress">
                    <div class="progress-header">
                        <span class="progress-label">Progress</span>
                        <span class="progress-percentage">${goal.progress || 0}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${goal.progress || 0}%"></div>
                    </div>
                </div>
                
                <div class="goal-meta">
                    <span class="goal-creation">
                        Created ${Utils.formatRelativeTime(goal.createdAt)}
                    </span>
                </div>
            </div>
        `).join('');
    }

    // Update dashboard statistics
    updateDashboardStats() {
        const goals = this.dataManager.getGoals();
        const completedGoals = goals.filter(g => g.isCompleted);
        const activities = this.dataManager.getActivities();
        const resources = this.dataManager.getResources();
        
        // Update stat cards
        const totalGoalsEl = document.getElementById('total-goals');
        const completedGoalsEl = document.getElementById('completed-goals');
        const totalResourcesEl = document.getElementById('total-resources');
        const studyHoursEl = document.getElementById('study-hours');
        const streakDaysEl = document.getElementById('streak-days');
        
        if (totalGoalsEl) totalGoalsEl.textContent = goals.length;
        if (completedGoalsEl) completedGoalsEl.textContent = completedGoals.length;
        if (totalResourcesEl) totalResourcesEl.textContent = resources.length;
        
        if (studyHoursEl) {
            const totalMinutes = activities
                .filter(a => a.type === 'study_session')
                .reduce((sum, a) => sum + (a.duration || 0), 0);
            const hours = Math.floor(totalMinutes / 60);
            studyHoursEl.textContent = `${hours}h`;
        }
        
        if (streakDaysEl) {
            const streak = Utils.calculateStreak(activities);
            streakDaysEl.textContent = streak;
        }
    }

    // Get goal statistics
    getGoalStats() {
        const goals = this.dataManager.getGoals();
        const completed = goals.filter(g => g.isCompleted).length;
        const overdue = goals.filter(g => !g.isCompleted && Utils.isOverdue(g.targetDate)).length;
        const active = goals.length - completed - overdue;
        
        return {
            total: goals.length,
            completed,
            active,
            overdue,
            completionRate: Utils.calculateProgress(completed, goals.length)
        };
    }
}

// Export for global use
window.GoalsManager = GoalsManager;