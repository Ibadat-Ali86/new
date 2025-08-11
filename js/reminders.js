// Reminders Manager
class RemindersManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.currentReminder = null;
        this.initEventListeners();
    }

    initEventListeners() {
        // Reminder modal
        const reminderModal = document.getElementById('reminder-modal');
        const reminderForm = document.getElementById('reminder-form');
        const reminderModalClose = document.getElementById('reminder-modal-close');
        const reminderCancelBtn = document.getElementById('reminder-cancel-btn');
        const createReminderBtn = document.getElementById('create-reminder-btn');
        
        // Modal triggers
        createReminderBtn?.addEventListener('click', () => {
            this.showReminderModal();
        });
        
        // Modal close
        [reminderModalClose, reminderCancelBtn].forEach(btn => {
            if (btn) {
                btn.addEventListener('click', () => this.hideReminderModal());
            }
        });
        
        // Close modal on backdrop click
        reminderModal?.addEventListener('click', (e) => {
            if (e.target === reminderModal) {
                this.hideReminderModal();
            }
        });
        
        // Form submission
        reminderForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveReminder();
        });
        
        // Reminder actions
        document.addEventListener('click', (e) => {
            if (e.target.closest('.reminder-action-btn[data-action="edit"]')) {
                const reminderId = e.target.closest('.reminder-card').dataset.reminderId;
                this.editReminder(reminderId);
            }
            
            if (e.target.closest('.reminder-action-btn[data-action="delete"]')) {
                const reminderId = e.target.closest('.reminder-card').dataset.reminderId;
                this.deleteReminder(reminderId);
            }
            
            if (e.target.closest('.reminder-action-btn[data-action="toggle"]')) {
                const reminderId = e.target.closest('.reminder-card').dataset.reminderId;
                this.toggleReminder(reminderId);
            }
        });
    }

    // Show reminder modal
    showReminderModal(reminderData = null) {
        const modal = document.getElementById('reminder-modal');
        const form = document.getElementById('reminder-form');
        
        this.currentReminder = reminderData;
        
        // Reset form
        form.reset();
        
        // Populate form if editing
        if (reminderData) {
            this.populateReminderForm(reminderData);
        } else {
            this.populateGoalSelect();
            // Set default datetime to tomorrow at 9 AM
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(9, 0, 0, 0);
            document.getElementById('reminder-datetime').value = tomorrow.toISOString().slice(0, 16);
        }
        
        // Show modal
        modal.classList.remove('hidden');
        AnimationUtils.fadeIn(modal);
        
        // Focus first input
        setTimeout(() => {
            const firstInput = form.querySelector('input, textarea, select');
            if (firstInput) {
                firstInput.focus();
            }
        }, 100);
    }

    // Hide reminder modal
    hideReminderModal() {
        const modal = document.getElementById('reminder-modal');
        const form = document.getElementById('reminder-form');
        
        modal.classList.add('hidden');
        form.reset();
        this.currentReminder = null;
    }

    // Populate reminder form for editing
    populateReminderForm(reminder) {
        document.getElementById('reminder-title').value = reminder.title || '';
        document.getElementById('reminder-message').value = reminder.message || '';
        document.getElementById('reminder-type').value = reminder.reminder_type || 'daily';
        document.getElementById('reminder-email').checked = reminder.email_enabled !== false;
        
        if (reminder.next_reminder) {
            const date = new Date(reminder.next_reminder);
            document.getElementById('reminder-datetime').value = date.toISOString().slice(0, 16);
        }
        
        // Populate goal select
        this.populateGoalSelect(reminder.goal_id);
    }

    // Populate goal select dropdown
    populateGoalSelect(selectedGoalId = null) {
        const goalSelect = document.getElementById('reminder-goal');
        if (!goalSelect) return;
        
        const goals = this.dataManager.getGoals().filter(g => !g.isCompleted);
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

    // Save reminder
    saveReminder() {
        const formData = this.getReminderFormData();
        
        try {
            // Validate form data
            this.validateReminderData(formData);
            
            if (this.currentReminder) {
                // Update existing reminder
                const updatedReminder = this.dataManager.updateReminder(this.currentReminder.id, formData);
                if (updatedReminder) {
                    window.showToast('Reminder updated successfully!', 'success');
                    this.renderReminders();
                    this.hideReminderModal();
                }
            } else {
                // Create new reminder
                const newReminder = this.dataManager.addReminder(formData);
                if (newReminder) {
                    window.showToast('Reminder created successfully!', 'success');
                    this.renderReminders();
                    this.hideReminderModal();
                }
            }
        } catch (error) {
            window.showToast(error.message, 'error');
        }
    }

    // Get form data
    getReminderFormData() {
        const title = document.getElementById('reminder-title').value.trim();
        const message = document.getElementById('reminder-message').value.trim();
        const reminderType = document.getElementById('reminder-type').value;
        const goalId = document.getElementById('reminder-goal').value || null;
        const datetime = document.getElementById('reminder-datetime').value;
        const emailEnabled = document.getElementById('reminder-email').checked;
        
        return {
            title,
            message,
            reminder_type: reminderType,
            goal_id: goalId,
            next_reminder: new Date(datetime).toISOString(),
            email_enabled: emailEnabled,
            in_app_enabled: true,
            is_active: true
        };
    }

    // Validate reminder data
    validateReminderData(data) {
        if (!data.title) {
            throw new Error('Reminder title is required');
        }
        
        if (!data.next_reminder) {
            throw new Error('Please select a date and time for the reminder');
        }
        
        const reminderDate = new Date(data.next_reminder);
        if (reminderDate <= new Date()) {
            throw new Error('Reminder date must be in the future');
        }
    }

    // Edit reminder
    editReminder(reminderId) {
        const reminders = this.dataManager.getReminders();
        const reminder = reminders.find(r => r.id === reminderId);
        
        if (reminder) {
            this.showReminderModal(reminder);
        }
    }

    // Delete reminder
    deleteReminder(reminderId) {
        if (confirm('Are you sure you want to delete this reminder?')) {
            const success = this.dataManager.deleteReminder(reminderId);
            
            if (success) {
                window.showToast('Reminder deleted successfully!', 'success');
                this.renderReminders();
            } else {
                window.showToast('Failed to delete reminder', 'error');
            }
        }
    }

    // Toggle reminder active status
    toggleReminder(reminderId) {
        const reminders = this.dataManager.getReminders();
        const reminder = reminders.find(r => r.id === reminderId);
        
        if (reminder) {
            const updatedReminder = this.dataManager.updateReminder(reminderId, {
                is_active: !reminder.is_active
            });
            
            if (updatedReminder) {
                const status = updatedReminder.is_active ? 'activated' : 'deactivated';
                window.showToast(`Reminder ${status}!`, 'success');
                this.renderReminders();
            }
        }
    }

    // Render reminders
    renderReminders() {
        const container = document.getElementById('reminders-container');
        if (!container) return;
        
        const reminders = this.dataManager.getReminders();
        
        if (reminders.length === 0) {
            container.innerHTML = this.getEmptyState();
            return;
        }
        
        container.innerHTML = `
            <div class="reminders-grid">
                ${reminders.map(reminder => this.renderReminderCard(reminder)).join('')}
            </div>
        `;
    }

    // Render single reminder card
    renderReminderCard(reminder) {
        const nextReminder = new Date(reminder.next_reminder);
        const isOverdue = nextReminder < new Date();
        const relativeTime = Utils.formatRelativeTime(reminder.next_reminder);
        
        return `
            <div class="reminder-card ${reminder.is_active ? 'active' : 'inactive'}" data-reminder-id="${reminder.id}">
                <div class="reminder-header">
                    <div class="reminder-info">
                        <h3 class="reminder-title">${Utils.sanitizeHTML(reminder.title)}</h3>
                        <span class="reminder-type">${reminder.reminder_type}</span>
                    </div>
                    <div class="reminder-status">
                        <span class="status-badge ${reminder.is_active ? 'active' : 'inactive'}">
                            ${reminder.is_active ? 'Active' : 'Inactive'}
                        </span>
                    </div>
                </div>
                
                ${reminder.message ? `
                    <p class="reminder-message">${Utils.sanitizeHTML(reminder.message)}</p>
                ` : ''}
                
                <div class="reminder-schedule">
                    <div class="schedule-info ${isOverdue ? 'overdue' : ''}">
                        <i class="fas fa-clock"></i>
                        <span>Next: ${relativeTime}</span>
                    </div>
                    <div class="reminder-settings">
                        ${reminder.email_enabled ? '<i class="fas fa-envelope" title="Email enabled"></i>' : ''}
                        ${reminder.in_app_enabled ? '<i class="fas fa-bell" title="In-app notifications enabled"></i>' : ''}
                    </div>
                </div>
                
                ${reminder.goal_id ? `
                    <div class="reminder-goal">
                        <i class="fas fa-bullseye"></i>
                        <span>Related to goal</span>
                    </div>
                ` : ''}
                
                <div class="reminder-actions">
                    <button class="reminder-action-btn" data-action="toggle" title="${reminder.is_active ? 'Deactivate' : 'Activate'} reminder">
                        <i class="fas fa-${reminder.is_active ? 'pause' : 'play'}"></i>
                    </button>
                    <button class="reminder-action-btn" data-action="edit" title="Edit reminder">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="reminder-action-btn" data-action="delete" title="Delete reminder">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // Get empty state HTML
    getEmptyState() {
        return `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-bell"></i>
                </div>
                <h3>No reminders set</h3>
                <p>Create reminders to stay on track with your learning goals!</p>
                <button class="btn btn-primary" onclick="window.remindersManager.showReminderModal()">
                    <i class="fas fa-plus"></i> Create Your First Reminder
                </button>
            </div>
        `;
    }

    // Process due reminders (would be called by a background service)
    processDueReminders() {
        const reminders = this.dataManager.getReminders();
        const now = new Date();
        
        reminders.forEach(reminder => {
            if (reminder.is_active && new Date(reminder.next_reminder) <= now) {
                // Create notification
                window.notificationsManager?.addNotification(
                    'reminder',
                    reminder.title,
                    reminder.message || 'Time for your scheduled reminder!',
                    { goalId: reminder.goal_id }
                );
                
                // Update next reminder time based on type
                let nextReminder = new Date(reminder.next_reminder);
                
                switch (reminder.reminder_type) {
                    case 'daily':
                        nextReminder.setDate(nextReminder.getDate() + 1);
                        break;
                    case 'weekly':
                        nextReminder.setDate(nextReminder.getDate() + 7);
                        break;
                    case 'custom':
                        // For custom reminders, deactivate after firing
                        this.dataManager.updateReminder(reminder.id, { is_active: false });
                        return;
                }
                
                // Update reminder with new next time
                this.dataManager.updateReminder(reminder.id, {
                    next_reminder: nextReminder.toISOString()
                });
            }
        });
    }

    // Get reminder statistics
    getReminderStats() {
        const reminders = this.dataManager.getReminders();
        const active = reminders.filter(r => r.is_active).length;
        const inactive = reminders.length - active;
        const overdue = reminders.filter(r => 
            r.is_active && new Date(r.next_reminder) < new Date()
        ).length;
        
        return {
            total: reminders.length,
            active,
            inactive,
            overdue
        };
    }
}

// Export for global use
window.RemindersManager = RemindersManager;