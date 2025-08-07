// Notifications Manager
class NotificationsManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.isVisible = false;
        this.initEventListeners();
        this.updateNotificationBadge();
    }

    initEventListeners() {
        const notificationBtn = document.getElementById('notifications-btn');
        const notificationPanel = document.getElementById('notification-panel');
        const clearNotificationsBtn = document.getElementById('clear-notifications');
        
        // Toggle notification panel
        notificationBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleNotificationPanel();
        });
        
        // Clear all notifications
        clearNotificationsBtn?.addEventListener('click', () => {
            this.clearAllNotifications();
        });
        
        // Click outside to close panel
        document.addEventListener('click', (e) => {
            if (this.isVisible && !notificationPanel?.contains(e.target)) {
                this.hideNotificationPanel();
            }
        });
        
        // Notification item clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('.notification-item')) {
                const notificationId = e.target.closest('.notification-item').dataset.notificationId;
                this.handleNotificationClick(notificationId);
            }
        });
    }

    // Toggle notification panel
    toggleNotificationPanel() {
        if (this.isVisible) {
            this.hideNotificationPanel();
        } else {
            this.showNotificationPanel();
        }
    }

    // Show notification panel
    showNotificationPanel() {
        const panel = document.getElementById('notification-panel');
        if (!panel) return;
        
        this.isVisible = true;
        panel.classList.remove('hidden');
        this.renderNotifications();
        
        // Mark all as read after viewing
        setTimeout(() => {
            this.markAllAsRead();
        }, 1000);
    }

    // Hide notification panel
    hideNotificationPanel() {
        const panel = document.getElementById('notification-panel');
        if (!panel) return;
        
        this.isVisible = false;
        panel.classList.add('hidden');
    }

    // Render notifications
    renderNotifications() {
        const container = document.getElementById('notification-list');
        if (!container) return;
        
        const notifications = this.dataManager.getNotifications()
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        if (notifications.length === 0) {
            container.innerHTML = this.getEmptyNotificationsHTML();
            return;
        }
        
        container.innerHTML = notifications.map(notification => 
            this.renderNotificationItem(notification)
        ).join('');
    }

    // Render single notification item
    renderNotificationItem(notification) {
        const iconClass = this.getNotificationIcon(notification.type);
        const timeAgo = Utils.formatRelativeTime(notification.createdAt);
        
        return `
            <div class="notification-item ${notification.isRead ? 'read' : 'unread'}" 
                 data-notification-id="${notification.id}">
                <div class="notification-content">
                    <div class="notification-icon ${notification.type}">
                        <i class="${iconClass}"></i>
                    </div>
                    <div class="notification-details">
                        <div class="notification-title">${Utils.sanitizeHTML(notification.title)}</div>
                        <div class="notification-text">${Utils.sanitizeHTML(notification.message)}</div>
                        <div class="notification-time">${timeAgo}</div>
                    </div>
                </div>
            </div>
        `;
    }

    // Get notification icon
    getNotificationIcon(type) {
        const icons = {
            reminder: 'fas fa-bell',
            milestone: 'fas fa-flag-checkered',
            achievement: 'fas fa-trophy',
            goal: 'fas fa-bullseye',
            resource: 'fas fa-book',
            system: 'fas fa-cog',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    // Get empty notifications HTML
    getEmptyNotificationsHTML() {
        return `
            <div class="empty-state-small">
                <div class="empty-state-icon">
                    <i class="fas fa-bell-slash"></i>
                </div>
                <p>No notifications yet</p>
                <small>You'll see updates about your goals and progress here</small>
            </div>
        `;
    }

    // Handle notification click
    handleNotificationClick(notificationId) {
        const notification = this.dataManager.getNotifications()
            .find(n => n.id === notificationId);
        
        if (!notification) return;
        
        // Mark as read
        this.dataManager.markNotificationAsRead(notificationId);
        this.updateNotificationBadge();
        
        // Handle navigation based on notification type
        this.handleNotificationAction(notification);
    }

    // Handle notification actions
    handleNotificationAction(notification) {
        // Hide notification panel first
        this.hideNotificationPanel();
        
        // Navigate based on notification type
        switch (notification.type) {
            case 'goal':
            case 'milestone':
                // Navigate to goals view
                if (notification.goalId) {
                    window.app?.showView('goals');
                    // Optionally highlight specific goal
                    setTimeout(() => {
                        const goalCard = document.querySelector(`[data-goal-id="${notification.goalId}"]`);
                        if (goalCard) {
                            goalCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            AnimationUtils.pulse(goalCard);
                        }
                    }, 300);
                }
                break;
            
            case 'resource':
                // Navigate to resources view
                window.app?.showView('resources');
                break;
            
            case 'achievement':
                // Show achievement details
                this.showAchievementDetails(notification);
                break;
                
            default:
                // For reminders and other types, just mark as handled
                break;
        }
    }

    // Show achievement details
    showAchievementDetails(notification) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-trophy" style="color: var(--accent-500); margin-right: 0.5rem;"></i>Achievement Unlocked!</h3>
                    <button class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="padding: 2rem; text-align: center;">
                    <div style="font-size: 4rem; margin-bottom: 1rem;">🎉</div>
                    <h3 style="margin-bottom: 1rem; color: var(--neutral-800);">${Utils.sanitizeHTML(notification.title)}</h3>
                    <p style="color: var(--neutral-600); line-height: 1.6;">${Utils.sanitizeHTML(notification.message)}</p>
                    <button class="btn btn-primary" style="margin-top: 1.5rem;" onclick="this.closest('.modal').remove()">
                        Awesome! 🚀
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal
        const closeModal = () => modal.remove();
        modal.querySelector('.modal-close').addEventListener('click', closeModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
        
        AnimationUtils.fadeIn(modal);
    }

    // Add new notification
    addNotification(type, title, message, data = {}) {
        const notification = this.dataManager.addNotification({
            type,
            title,
            message,
            ...data
        });
        
        // Update badge
        this.updateNotificationBadge();
        
        // Show toast for important notifications
        if (['achievement', 'milestone'].includes(type)) {
            window.showToast(title, 'success');
        }
        
        // Update notification panel if visible
        if (this.isVisible) {
            this.renderNotifications();
        }
        
        return notification;
    }

    // Mark all notifications as read
    markAllAsRead() {
        this.dataManager.markAllNotificationsAsRead();
        this.updateNotificationBadge();
        
        if (this.isVisible) {
            this.renderNotifications();
        }
    }

    // Clear all notifications
    clearAllNotifications() {
        if (confirm('Are you sure you want to clear all notifications?')) {
            this.dataManager.clearAllNotifications();
            this.updateNotificationBadge();
            this.renderNotifications();
            window.showToast('All notifications cleared', 'info');
        }
    }

    // Update notification badge
    updateNotificationBadge() {
        const badge = document.querySelector('.notification-badge');
        if (!badge) return;
        
        const unreadCount = this.dataManager.getNotifications()
            .filter(n => !n.isRead).length;
        
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.style.display = 'flex';
        } else {
            badge.style.display = 'none';
        }
    }

    // Generate daily reminder notifications
    generateDailyReminders() {
        const goals = this.dataManager.getGoals()
            .filter(goal => !goal.isCompleted);
        
        // Study reminder for active goals
        if (goals.length > 0) {
            const randomGoal = goals[Math.floor(Math.random() * goals.length)];
            this.addNotification(
                'reminder',
                '📚 Daily Study Reminder',
                `Time to make progress on "${randomGoal.title}"!`,
                { goalId: randomGoal.id }
            );
        }
        
        // Deadline reminders
        goals.forEach(goal => {
            if (goal.targetDate) {
                const daysUntilDeadline = Math.ceil(
                    (new Date(goal.targetDate) - new Date()) / (1000 * 60 * 60 * 24)
                );
                
                if (daysUntilDeadline === 7) {
                    this.addNotification(
                        'reminder',
                        '⏰ Deadline Approaching',
                        `"${goal.title}" is due in 1 week`,
                        { goalId: goal.id }
                    );
                } else if (daysUntilDeadline === 1) {
                    this.addNotification(
                        'reminder',
                        '🚨 Deadline Tomorrow',
                        `"${goal.title}" is due tomorrow!`,
                        { goalId: goal.id }
                    );
                } else if (daysUntilDeadline === 0) {
                    this.addNotification(
                        'reminder',
                        '⚠️ Deadline Today',
                        `"${goal.title}" is due today!`,
                        { goalId: goal.id }
                    );
                }
            }
        });
    }

    // Generate achievement notifications
    checkForAchievements() {
        const goals = this.dataManager.getGoals();
        const activities = this.dataManager.getActivities();
        const resources = this.dataManager.getResources();
        
        const completedGoals = goals.filter(g => g.isCompleted).length;
        const currentStreak = Utils.calculateStreak(activities);
        
        // First goal completion
        if (completedGoals === 1) {
            this.addNotification(
                'achievement',
                '🎯 First Goal Complete!',
                'Congratulations on completing your first learning goal!'
            );
        }
        
        // Multiple goal milestones
        if (completedGoals === 5) {
            this.addNotification(
                'achievement',
                '🏆 Goal Master!',
                'Amazing! You\'ve completed 5 learning goals!'
            );
        } else if (completedGoals === 10) {
            this.addNotification(
                'achievement',
                '🌟 Learning Champion!',
                'Incredible! You\'ve completed 10 learning goals!'
            );
        }
        
        // Streak achievements
        if (currentStreak === 7) {
            this.addNotification(
                'achievement',
                '🔥 Week Streak!',
                'You\'ve maintained a 7-day learning streak!'
            );
        } else if (currentStreak === 30) {
            this.addNotification(
                'achievement',
                '💪 Month Streak!',
                'Outstanding! You\'ve maintained a 30-day learning streak!'
            );
        }
        
        // Resource collection milestones
        if (resources.length === 10) {
            this.addNotification(
                'achievement',
                '📚 Resource Collector!',
                'You\'ve added 10 learning resources to your library!'
            );
        } else if (resources.length === 50) {
            this.addNotification(
                'achievement',
                '🗃️ Resource Master!',
                'Impressive! You\'ve built a library of 50 learning resources!'
            );
        }
    }

    // Schedule notification checks
    scheduleNotificationChecks() {
        // Check for achievements every time data changes
        // (This would typically be done through event listeners in a real app)
        setInterval(() => {
            this.checkForAchievements();
        }, 5 * 60 * 1000); // Check every 5 minutes
        
        // Daily reminders
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0); // 9 AM next day
        
        const msUntilTomorrow = tomorrow.getTime() - now.getTime();
        
        setTimeout(() => {
            this.generateDailyReminders();
            
            // Then repeat daily
            setInterval(() => {
                this.generateDailyReminders();
            }, 24 * 60 * 60 * 1000);
        }, msUntilTomorrow);
    }

    // Get notification statistics
    getNotificationStats() {
        const notifications = this.dataManager.getNotifications();
        const unread = notifications.filter(n => !n.isRead).length;
        const byType = Utils.groupBy(notifications, 'type');
        
        return {
            total: notifications.length,
            unread,
            byType
        };
    }
}

// Toast notification system
class ToastManager {
    constructor() {
        this.toasts = [];
        this.container = document.getElementById('toast-container');
        this.maxToasts = 5;
    }

    show(message, type = 'info', duration = 5000) {
        const toast = this.createToast(message, type, duration);
        this.addToast(toast);
        return toast;
    }

    createToast(message, type, duration) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = this.getToastIcon(type);
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i class="${icon}"></i>
            </div>
            <div class="toast-content">
                <div class="toast-title">${this.getToastTitle(type)}</div>
                <div class="toast-text">${Utils.sanitizeHTML(message)}</div>
            </div>
            <button class="toast-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        // Close button
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', () => this.removeToast(toast));
        
        // Auto remove
        if (duration > 0) {
            setTimeout(() => this.removeToast(toast), duration);
        }
        
        // Click to dismiss
        toast.addEventListener('click', (e) => {
            if (!e.target.closest('.toast-close')) {
                this.removeToast(toast);
            }
        });
        
        return toast;
    }

    getToastIcon(type) {
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        return icons[type] || icons.info;
    }

    getToastTitle(type) {
        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Info'
        };
        return titles[type] || titles.info;
    }

    addToast(toast) {
        if (!this.container) return;
        
        // Remove oldest toast if at limit
        if (this.toasts.length >= this.maxToasts) {
            this.removeToast(this.toasts[0]);
        }
        
        this.toasts.push(toast);
        this.container.appendChild(toast);
        
        // Trigger animation
        requestAnimationFrame(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateX(0)';
        });
    }

    removeToast(toast) {
        if (!toast || !toast.parentNode) return;
        
        const index = this.toasts.indexOf(toast);
        if (index > -1) {
            this.toasts.splice(index, 1);
        }
        
        // Animate out
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }

    clear() {
        this.toasts.forEach(toast => this.removeToast(toast));
    }
}

// Global toast function
window.showToast = function(message, type = 'info', duration = 5000) {
    if (!window.toastManager) {
        window.toastManager = new ToastManager();
    }
    return window.toastManager.show(message, type, duration);
};

// Export for global use
window.NotificationsManager = NotificationsManager;
window.ToastManager = ToastManager;