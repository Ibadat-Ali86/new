// Enhanced Learning Dashboard Application
class LearningDashboard {
    constructor() {
        this.API_BASE = '/api/v1';
        this.currentUser = null;
        this.currentView = 'dashboard';
        this.charts = {};
        this.init();
    }

    async init() {
        this.showLoading();
        await this.checkAuth();
        this.bindEvents();
        this.hideLoading();
    }

    // Authentication Methods
    async checkAuth() {
        const token = localStorage.getItem('access_token');
        if (token) {
            try {
                const response = await this.apiCall('/auth/me');
                this.currentUser = response;
                this.showApp();
                await this.loadDashboard();
            } catch (error) {
                this.showAuth();
            }
        } else {
            this.showAuth();
        }
    }

    async login(email, password, rememberMe = false) {
        try {
            const response = await this.apiCall('/auth/login', 'POST', {
                email,
                password
            });
            
            localStorage.setItem('access_token', response.access_token);
            if (response.refresh_token) {
                localStorage.setItem('refresh_token', response.refresh_token);
            }
            
            this.currentUser = response.user;
            this.showApp();
            await this.loadDashboard();
            this.showToast('Welcome back!', 'success');
        } catch (error) {
            this.showToast(error.message || 'Login failed', 'error');
        }
    }

    async register(name, email, password) {
        try {
            await this.apiCall('/auth/register', 'POST', {
                name,
                email,
                password
            });
            
            this.showToast('Registration successful! Please log in.', 'success');
            this.switchAuthForm('login');
        } catch (error) {
            this.showToast(error.message || 'Registration failed', 'error');
        }
    }

    logout() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        this.currentUser = null;
        this.showAuth();
        this.showToast('Logged out successfully', 'info');
    }

    // API Methods
    async apiCall(endpoint, method = 'GET', data = null) {
        const token = localStorage.getItem('access_token');
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            method,
            headers
        };

        if (data && method !== 'GET') {
            config.body = JSON.stringify(data);
        }

        const response = await fetch(`${this.API_BASE}${endpoint}`, config);
        
        if (response.status === 401) {
            // Try to refresh token
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
                try {
                    const refreshResponse = await fetch(`${this.API_BASE}/auth/refresh`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${refreshToken}`
                        }
                    });
                    
                    if (refreshResponse.ok) {
                        const refreshData = await refreshResponse.json();
                        localStorage.setItem('access_token', refreshData.access_token);
                        
                        // Retry original request
                        headers['Authorization'] = `Bearer ${refreshData.access_token}`;
                        const retryResponse = await fetch(`${this.API_BASE}${endpoint}`, config);
                        if (!retryResponse.ok) {
                            throw new Error('Request failed after token refresh');
                        }
                        return await retryResponse.json();
                    }
                } catch (refreshError) {
                    this.logout();
                    throw new Error('Session expired. Please log in again.');
                }
            } else {
                this.logout();
                throw new Error('Session expired. Please log in again.');
            }
        }

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        return await response.json();
    }

    // UI Methods
    showLoading() {
        document.getElementById('loading-screen').classList.remove('d-none');
    }

    hideLoading() {
        document.getElementById('loading-screen').classList.add('d-none');
    }

    showAuth() {
        document.getElementById('app-container').classList.add('d-none');
        document.getElementById('auth-container').classList.remove('d-none');
    }

    showApp() {
        document.getElementById('auth-container').classList.add('d-none');
        document.getElementById('app-container').classList.remove('d-none');
        this.updateUserInfo();
    }

    updateUserInfo() {
        if (this.currentUser) {
            document.getElementById('user-name').textContent = this.currentUser.name.split(' ')[0];
            document.getElementById('dashboard-user-name').textContent = this.currentUser.name.split(' ')[0];
        }
    }

    switchAuthForm(formType) {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        if (formType === 'register') {
            loginForm.classList.add('d-none');
            registerForm.classList.remove('d-none');
        } else {
            registerForm.classList.add('d-none');
            loginForm.classList.remove('d-none');
        }
    }

    showView(viewName) {
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.add('d-none');
        });
        
        // Show target view
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.remove('d-none');
            this.currentView = viewName;
        }
        
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`)?.classList.add('active');
        
        // Load view-specific data
        this.loadViewData(viewName);
    }

    async loadViewData(viewName) {
        switch (viewName) {
            case 'dashboard':
                await this.loadDashboard();
                break;
            case 'goals':
                await this.loadGoals();
                break;
            case 'resources':
                await this.loadResources();
                break;
            case 'progress':
                await this.loadProgress();
                break;
            case 'reminders':
                await this.loadReminders();
                break;
            case 'profile':
                await this.loadProfile();
                break;
        }
    }

    // Dashboard Methods
    async loadDashboard() {
        try {
            const [summary, goals, recentActivity] = await Promise.all([
                this.apiCall('/analytics/summary'),
                this.apiCall('/goals?limit=5'),
                this.apiCall('/reports/analytics')
            ]);

            this.updateDashboardStats(summary);
            this.updateProgressChart(recentActivity);
            this.updateRecentActivity();
        } catch (error) {
            console.error('Error loading dashboard:', error);
        }
    }

    updateDashboardStats(summary) {
        document.getElementById('total-goals').textContent = summary.goals || 0;
        document.getElementById('completed-goals').textContent = summary.goals_completed || 0;
        document.getElementById('total-resources').textContent = summary.resources || 0;
        document.getElementById('study-hours').textContent = `${summary.hours || 0}h`;
    }

    updateProgressChart(data) {
        const ctx = document.getElementById('progress-chart');
        if (!ctx) return;

        if (this.charts.progress) {
            this.charts.progress.destroy();
        }

        const chartData = this.prepareChartData(data.daily_progress || {});
        
        this.charts.progress = new Chart(ctx, {
            type: 'line',
            data: {
                labels: chartData.labels,
                datasets: [{
                    label: 'Study Time (minutes)',
                    data: chartData.data,
                    borderColor: '#0d6efd',
                    backgroundColor: 'rgba(13, 110, 253, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    prepareChartData(dailyProgress) {
        const labels = [];
        const data = [];
        const sortedDates = Object.keys(dailyProgress).sort();
        
        sortedDates.slice(-7).forEach(date => {
            labels.push(new Date(date).toLocaleDateString('en-US', { weekday: 'short' }));
            data.push(dailyProgress[date].minutes || 0);
        });
        
        return { labels, data };
    }

    async updateRecentActivity() {
        try {
            const activities = await this.apiCall('/reports/analytics');
            const container = document.getElementById('recent-activity');
            
            if (!activities || !activities.summary) {
                container.innerHTML = '<p class="text-muted">No recent activity</p>';
                return;
            }
            
            const activityHtml = `
                <div class="activity-item mb-2">
                    <i class="fas fa-bullseye text-primary me-2"></i>
                    <span>${activities.summary.goals} active goals</span>
                </div>
                <div class="activity-item mb-2">
                    <i class="fas fa-check-circle text-success me-2"></i>
                    <span>${activities.summary.goals_completed} goals completed</span>
                </div>
                <div class="activity-item mb-2">
                    <i class="fas fa-clock text-warning me-2"></i>
                    <span>${activities.summary.hours}h study time</span>
                </div>
                <div class="activity-item">
                    <i class="fas fa-fire text-danger me-2"></i>
                    <span>${activities.summary.learning_streak} day streak</span>
                </div>
            `;
            
            container.innerHTML = activityHtml;
        } catch (error) {
            console.error('Error loading recent activity:', error);
        }
    }

    // Goals Methods
    async loadGoals() {
        try {
            const goals = await this.apiCall('/goals');
            this.renderGoals(goals);
            await this.loadGoalCategories();
        } catch (error) {
            console.error('Error loading goals:', error);
        }
    }

    async loadGoalCategories() {
        try {
            const categories = await this.apiCall('/goals/categories');
            const select = document.getElementById('goals-category-filter');
            select.innerHTML = '<option value="">All Categories</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading goal categories:', error);
        }
    }

    renderGoals(goals) {
        const container = document.getElementById('goals-container');
        
        if (!goals || goals.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="fas fa-bullseye fa-3x text-muted mb-3"></i>
                        <h4>No goals yet</h4>
                        <p class="text-muted">Create your first learning goal to get started!</p>
                        <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#goalModal">
                            <i class="fas fa-plus me-1"></i>Create Goal
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = goals.map(goal => this.renderGoalCard(goal)).join('');
    }

    renderGoalCard(goal) {
        const priorityClass = goal.priority === 'high' ? 'border-danger' : 
                            goal.priority === 'medium' ? 'border-warning' : 'border-info';
        const statusBadge = goal.is_completed ? 'bg-success' : 
                           goal.is_overdue ? 'bg-danger' : 'bg-primary';
        const statusText = goal.is_completed ? 'Completed' : 
                          goal.is_overdue ? 'Overdue' : 'Active';

        return `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card h-100 ${priorityClass}">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title">${this.escapeHtml(goal.title)}</h5>
                            <span class="badge ${statusBadge}">${statusText}</span>
                        </div>
                        <p class="card-text text-muted small">${this.escapeHtml(goal.description || '')}</p>
                        <div class="mb-3">
                            <div class="d-flex justify-content-between mb-1">
                                <small>Progress</small>
                                <small>${goal.progress}%</small>
                            </div>
                            <div class="progress" style="height: 6px;">
                                <div class="progress-bar" style="width: ${goal.progress}%"></div>
                            </div>
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                <i class="fas fa-tag me-1"></i>${goal.category}
                            </small>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="app.editGoal(${goal.id})">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-outline-success" onclick="app.logProgress(${goal.id})">
                                    <i class="fas fa-plus"></i>
                                </button>
                                <button class="btn btn-outline-danger" onclick="app.deleteGoal(${goal.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                    ${goal.target_date ? `
                        <div class="card-footer">
                            <small class="text-muted">
                                <i class="fas fa-calendar me-1"></i>
                                Due: ${new Date(goal.target_date).toLocaleDateString()}
                            </small>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    async createGoal(goalData) {
        try {
            await this.apiCall('/goals', 'POST', goalData);
            this.showToast('Goal created successfully!', 'success');
            await this.loadGoals();
            bootstrap.Modal.getInstance(document.getElementById('goalModal')).hide();
        } catch (error) {
            this.showToast(error.message || 'Failed to create goal', 'error');
        }
    }

    async editGoal(goalId) {
        try {
            const goal = await this.apiCall(`/goals/${goalId}`);
            this.populateGoalForm(goal);
            const modal = new bootstrap.Modal(document.getElementById('goalModal'));
            modal.show();
        } catch (error) {
            this.showToast('Failed to load goal details', 'error');
        }
    }

    async deleteGoal(goalId) {
        if (!confirm('Are you sure you want to delete this goal?')) return;
        
        try {
            await this.apiCall(`/goals/${goalId}`, 'DELETE');
            this.showToast('Goal deleted successfully!', 'success');
            await this.loadGoals();
        } catch (error) {
            this.showToast('Failed to delete goal', 'error');
        }
    }

    async logProgress(goalId) {
        const minutes = prompt('How many minutes did you study?');
        if (!minutes || isNaN(minutes)) return;
        
        try {
            await this.apiCall(`/goals/${goalId}/progress`, 'POST', {
                minutes: parseInt(minutes),
                activity_type: 'study'
            });
            this.showToast('Progress logged successfully!', 'success');
            await this.loadGoals();
        } catch (error) {
            this.showToast('Failed to log progress', 'error');
        }
    }

    // Resources Methods
    async loadResources() {
        try {
            const resources = await this.apiCall('/resources');
            this.renderResources(resources);
            await this.loadResourceCategories();
        } catch (error) {
            console.error('Error loading resources:', error);
        }
    }

    async loadResourceCategories() {
        try {
            const categories = await this.apiCall('/resources/categories');
            const select = document.getElementById('resources-category-filter');
            select.innerHTML = '<option value="">All Categories</option>';
            categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category.charAt(0).toUpperCase() + category.slice(1);
                select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading resource categories:', error);
        }
    }

    renderResources(resources) {
        const container = document.getElementById('resources-container');
        
        if (!resources || resources.length === 0) {
            container.innerHTML = `
                <div class="col-12">
                    <div class="text-center py-5">
                        <i class="fas fa-book fa-3x text-muted mb-3"></i>
                        <h4>No resources yet</h4>
                        <p class="text-muted">Add your first learning resource!</p>
                        <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#resourceModal">
                            <i class="fas fa-plus me-1"></i>Add Resource
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = resources.map(resource => this.renderResourceCard(resource)).join('');
    }

    renderResourceCard(resource) {
        const typeIcon = this.getResourceTypeIcon(resource.type);
        
        return `
            <div class="col-lg-4 col-md-6 mb-4">
                <div class="card h-100">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                            <h5 class="card-title">
                                <i class="${typeIcon} me-2"></i>
                                ${this.escapeHtml(resource.title)}
                            </h5>
                            ${resource.is_favorite ? '<i class="fas fa-star text-warning"></i>' : ''}
                        </div>
                        <p class="card-text text-muted small">${this.escapeHtml(resource.description || '')}</p>
                        <div class="mb-2">
                            <span class="badge bg-secondary">${resource.category}</span>
                            ${resource.tags ? resource.tags.map(tag => `<span class="badge bg-light text-dark ms-1">${tag}</span>`).join('') : ''}
                        </div>
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                Added ${new Date(resource.created_at).toLocaleDateString()}
                            </small>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="app.viewResource(${resource.id})">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-outline-secondary" onclick="app.editResource(${resource.id})">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-outline-danger" onclick="app.deleteResource(${resource.id})">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    getResourceTypeIcon(type) {
        const icons = {
            'link': 'fas fa-link',
            'file': 'fas fa-file',
            'note': 'fas fa-sticky-note'
        };
        return icons[type] || 'fas fa-file';
    }

    async viewResource(resourceId) {
        try {
            const resource = await this.apiCall(`/resources/${resourceId}`);
            
            if (resource.type === 'link' && resource.url) {
                window.open(resource.url, '_blank');
            } else if (resource.type === 'note') {
                this.showNoteModal(resource);
            } else {
                this.showToast('Resource viewing not available', 'info');
            }
        } catch (error) {
            this.showToast('Failed to view resource', 'error');
        }
    }

    showNoteModal(resource) {
        const modalHtml = `
            <div class="modal fade" id="noteViewModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${this.escapeHtml(resource.title)}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div style="white-space: pre-wrap;">${this.escapeHtml(resource.content)}</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = new bootstrap.Modal(document.getElementById('noteViewModal'));
        modal.show();
        
        document.getElementById('noteViewModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }

    // Progress Methods
    async loadProgress() {
        try {
            const analytics = await this.apiCall('/reports/analytics');
            this.renderProgressCharts(analytics);
        } catch (error) {
            console.error('Error loading progress:', error);
        }
    }

    renderProgressCharts(analytics) {
        this.renderCompletionChart(analytics.goals_by_status);
        this.renderCategoryChart(analytics.goals_by_category);
    }

    renderCompletionChart(statusData) {
        const ctx = document.getElementById('completion-chart');
        if (!ctx) return;

        if (this.charts.completion) {
            this.charts.completion.destroy();
        }

        this.charts.completion = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Active', 'Completed', 'Overdue'],
                datasets: [{
                    data: [
                        statusData.active || 0,
                        statusData.completed || 0,
                        statusData.overdue || 0
                    ],
                    backgroundColor: ['#0d6efd', '#198754', '#dc3545']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }

    renderCategoryChart(categoryData) {
        const ctx = document.getElementById('category-chart');
        if (!ctx) return;

        if (this.charts.category) {
            this.charts.category.destroy();
        }

        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);

        this.charts.category = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Goals by Category',
                    data: data,
                    backgroundColor: '#0d6efd'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    // Reminders Methods
    async loadReminders() {
        try {
            const reminders = await this.apiCall('/reminders');
            this.renderReminders(reminders);
        } catch (error) {
            console.error('Error loading reminders:', error);
        }
    }

    renderReminders(reminders) {
        const container = document.getElementById('reminders-container');
        
        if (!reminders || reminders.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-bell fa-3x text-muted mb-3"></i>
                    <h4>No reminders set</h4>
                    <p class="text-muted">Create reminders to stay on track with your learning goals!</p>
                    <button class="btn btn-primary" data-bs-toggle="modal" data-bs-target="#reminderModal">
                        <i class="fas fa-plus me-1"></i>Create Reminder
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="row">
                ${reminders.map(reminder => `
                    <div class="col-lg-6 mb-3">
                        <div class="card">
                            <div class="card-body">
                                <div class="d-flex justify-content-between align-items-start">
                                    <h5 class="card-title">${this.escapeHtml(reminder.title)}</h5>
                                    <span class="badge ${reminder.is_active ? 'bg-success' : 'bg-secondary'}">
                                        ${reminder.is_active ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                                <p class="card-text">${this.escapeHtml(reminder.message)}</p>
                                <div class="d-flex justify-content-between align-items-center">
                                    <small class="text-muted">
                                        Next: ${new Date(reminder.next_reminder).toLocaleString()}
                                    </small>
                                    <div class="btn-group btn-group-sm">
                                        <button class="btn btn-outline-primary" onclick="app.editReminder(${reminder.id})">
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-outline-danger" onclick="app.deleteReminder(${reminder.id})">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // Profile Methods
    async loadProfile() {
        try {
            const [profile, stats] = await Promise.all([
                this.apiCall('/auth/me'),
                this.apiCall('/auth/stats')
            ]);
            
            this.populateProfileForm(profile);
            this.updateProfileStats(stats);
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    }

    populateProfileForm(profile) {
        document.getElementById('profile-name').value = profile.name || '';
        document.getElementById('profile-email').value = profile.email || '';
        document.getElementById('profile-bio').value = profile.bio || '';
        document.getElementById('profile-timezone').value = profile.timezone || 'UTC';
    }

    updateProfileStats(stats) {
        document.getElementById('profile-total-goals').textContent = stats.goals || 0;
        document.getElementById('profile-completed-goals').textContent = stats.goals_completed || 0;
        document.getElementById('profile-resources').textContent = stats.resources || 0;
        document.getElementById('profile-streak').textContent = stats.learning_streak || 0;
    }

    // Notification Methods
    async loadNotifications() {
        try {
            const notifications = await this.apiCall('/reminders/notifications');
            this.renderNotifications(notifications);
            this.updateNotificationBadge(notifications);
        } catch (error) {
            console.error('Error loading notifications:', error);
        }
    }

    renderNotifications(notifications) {
        const container = document.getElementById('notifications-list');
        
        if (!notifications || notifications.length === 0) {
            container.innerHTML = `
                <div class="text-center p-3 text-muted">
                    <i class="fas fa-bell-slash fa-2x mb-2"></i>
                    <p class="mb-0">No notifications</p>
                </div>
            `;
            return;
        }

        container.innerHTML = notifications.slice(0, 5).map(notification => `
            <li>
                <a class="dropdown-item ${notification.is_read ? '' : 'fw-bold'}" href="#" 
                   onclick="app.markNotificationRead(${notification.id})">
                    <div class="d-flex">
                        <div class="flex-shrink-0">
                            <i class="fas fa-${this.getNotificationIcon(notification.notification_type)} text-primary"></i>
                        </div>
                        <div class="flex-grow-1 ms-2">
                            <div class="fw-semibold">${this.escapeHtml(notification.title)}</div>
                            <div class="small text-muted">${this.escapeHtml(notification.message)}</div>
                            <div class="small text-muted">${this.formatRelativeTime(notification.created_at)}</div>
                        </div>
                    </div>
                </a>
            </li>
        `).join('');
    }

    updateNotificationBadge(notifications) {
        const badge = document.getElementById('notification-badge');
        const unreadCount = notifications.filter(n => !n.is_read).length;
        
        if (unreadCount > 0) {
            badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
            badge.classList.remove('d-none');
        } else {
            badge.classList.add('d-none');
        }
    }

    getNotificationIcon(type) {
        const icons = {
            'reminder': 'bell',
            'achievement': 'trophy',
            'deadline': 'clock',
            'system': 'cog'
        };
        return icons[type] || 'info-circle';
    }

    async markNotificationRead(notificationId) {
        try {
            await this.apiCall(`/reminders/notifications/${notificationId}`, 'PUT');
            await this.loadNotifications();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    }

    // Event Binding
    bindEvents() {
        // Auth form events
        document.getElementById('login-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const rememberMe = document.getElementById('remember-me').checked;
            this.login(email, password, rememberMe);
        });

        document.getElementById('register-form').addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const confirmPassword = document.getElementById('register-confirm').value;
            
            if (password !== confirmPassword) {
                this.showToast('Passwords do not match', 'error');
                return;
            }
            
            this.register(name, email, password);
        });

        document.getElementById('show-register').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthForm('register');
        });

        document.getElementById('show-login').addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthForm('login');
        });

        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // Navigation events
        document.querySelectorAll('[data-view]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.dataset.view;
                this.showView(view);
            });
        });

        // Goal form events
        document.getElementById('goal-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleGoalSubmit();
        });

        // Resource form events
        document.getElementById('resource-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleResourceSubmit();
        });

        // Profile form events
        document.getElementById('profile-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleProfileSubmit();
        });

        // Search events
        document.getElementById('global-search').addEventListener('input', (e) => {
            this.handleGlobalSearch(e.target.value);
        });

        // Filter events
        document.getElementById('goals-filter').addEventListener('change', () => {
            this.loadGoals();
        });

        document.getElementById('resources-search').addEventListener('input', () => {
            this.loadResources();
        });

        // Resource type tabs
        document.querySelectorAll('[data-type]').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchResourceType(tab.dataset.type);
            });
        });

        // Milestone management
        document.getElementById('add-milestone').addEventListener('click', () => {
            this.addMilestoneInput();
        });

        // Password strength checker
        document.getElementById('register-password').addEventListener('input', (e) => {
            this.updatePasswordStrength(e.target.value);
        });

        // Load notifications on page load
        this.loadNotifications();
        
        // Refresh notifications every 30 seconds
        setInterval(() => {
            this.loadNotifications();
        }, 30000);
    }

    // Form Handlers
    async handleGoalSubmit() {
        const formData = this.getGoalFormData();
        
        if (!formData.title || !formData.category) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        await this.createGoal(formData);
    }

    getGoalFormData() {
        const milestones = [];
        document.querySelectorAll('.milestone-title').forEach(input => {
            if (input.value.trim()) {
                milestones.push({
                    title: input.value.trim(),
                    description: '',
                    order_index: milestones.length
                });
            }
        });

        return {
            title: document.getElementById('goal-title').value.trim(),
            description: document.getElementById('goal-description').value.trim(),
            category: document.getElementById('goal-category').value.trim(),
            priority: document.getElementById('goal-priority').value,
            target_date: document.getElementById('goal-target-date').value || null,
            estimated_hours: parseInt(document.getElementById('goal-estimated-hours').value) || null,
            tags: document.getElementById('goal-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
            milestones: milestones
        };
    }

    async handleResourceSubmit() {
        const formData = this.getResourceFormData();
        
        if (!formData.title || !formData.category) {
            this.showToast('Please fill in all required fields', 'error');
            return;
        }

        await this.createResource(formData);
    }

    getResourceFormData() {
        const activeType = document.querySelector('.nav-link.active[data-type]').dataset.type;
        
        const baseData = {
            title: document.getElementById('resource-title').value.trim(),
            description: document.getElementById('resource-description').value.trim(),
            category: document.getElementById('resource-category').value.trim(),
            type: activeType,
            tags: document.getElementById('resource-tags').value.split(',').map(tag => tag.trim()).filter(tag => tag),
            goal_id: parseInt(document.getElementById('resource-goal').value) || null
        };

        if (activeType === 'link') {
            baseData.url = document.getElementById('resource-url').value.trim();
        } else if (activeType === 'note') {
            baseData.content = document.getElementById('resource-content').value.trim();
        }

        return baseData;
    }

    async createResource(resourceData) {
        try {
            await this.apiCall('/resources', 'POST', resourceData);
            this.showToast('Resource added successfully!', 'success');
            await this.loadResources();
            bootstrap.Modal.getInstance(document.getElementById('resourceModal')).hide();
        } catch (error) {
            this.showToast(error.message || 'Failed to add resource', 'error');
        }
    }

    async handleProfileSubmit() {
        const profileData = {
            name: document.getElementById('profile-name').value.trim(),
            bio: document.getElementById('profile-bio').value.trim(),
            timezone: document.getElementById('profile-timezone').value
        };

        try {
            await this.apiCall('/auth/me', 'PUT', profileData);
            this.showToast('Profile updated successfully!', 'success');
            this.currentUser = { ...this.currentUser, ...profileData };
            this.updateUserInfo();
        } catch (error) {
            this.showToast(error.message || 'Failed to update profile', 'error');
        }
    }

    // Utility Methods
    switchResourceType(type) {
        // Update active tab
        document.querySelectorAll('[data-type]').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('active');

        // Show/hide content sections
        document.querySelectorAll('.resource-type-content').forEach(section => {
            section.classList.add('d-none');
        });
        document.getElementById(`${type}-resource`).classList.remove('d-none');
    }

    addMilestoneInput() {
        const container = document.getElementById('milestones-container');
        const milestoneHtml = `
            <div class="milestone-item mb-2">
                <div class="input-group">
                    <input type="text" class="form-control milestone-title" placeholder="Milestone title">
                    <button type="button" class="btn btn-outline-danger remove-milestone">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        
        container.insertAdjacentHTML('beforeend', milestoneHtml);
        
        // Bind remove event
        container.lastElementChild.querySelector('.remove-milestone').addEventListener('click', (e) => {
            e.target.closest('.milestone-item').remove();
        });
    }

    updatePasswordStrength(password) {
        const strengthBar = document.getElementById('strength-bar');
        const strengthText = document.getElementById('strength-text');
        
        let strength = 0;
        let feedback = [];

        if (password.length >= 8) strength += 20;
        else feedback.push('At least 8 characters');

        if (/[A-Z]/.test(password)) strength += 20;
        else feedback.push('One uppercase letter');

        if (/[a-z]/.test(password)) strength += 20;
        else feedback.push('One lowercase letter');

        if (/\d/.test(password)) strength += 20;
        else feedback.push('One number');

        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 20;
        else feedback.push('One special character');

        strengthBar.style.width = `${strength}%`;
        
        if (strength < 40) {
            strengthBar.className = 'progress-bar bg-danger';
            strengthText.textContent = 'Weak password';
        } else if (strength < 80) {
            strengthBar.className = 'progress-bar bg-warning';
            strengthText.textContent = 'Medium password';
        } else {
            strengthBar.className = 'progress-bar bg-success';
            strengthText.textContent = 'Strong password';
        }
    }

    handleGlobalSearch(query) {
        if (!query.trim()) return;
        
        // Simple search implementation - in a real app, this would be more sophisticated
        console.log('Searching for:', query);
        this.showToast(`Searching for: ${query}`, 'info');
    }

    showToast(message, type = 'info') {
        const toastContainer = document.getElementById('toast-container');
        const toastId = 'toast-' + Date.now();
        
        const bgClass = {
            'success': 'bg-success',
            'error': 'bg-danger',
            'warning': 'bg-warning',
            'info': 'bg-info'
        }[type] || 'bg-info';

        const toastHtml = `
            <div id="${toastId}" class="toast" role="alert">
                <div class="toast-header ${bgClass} text-white">
                    <strong class="me-auto">
                        <i class="fas fa-${this.getToastIcon(type)} me-1"></i>
                        ${type.charAt(0).toUpperCase() + type.slice(1)}
                    </strong>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast"></button>
                </div>
                <div class="toast-body">
                    ${this.escapeHtml(message)}
                </div>
            </div>
        `;
        
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);
        
        const toastElement = document.getElementById(toastId);
        const toast = new bootstrap.Toast(toastElement, { delay: 5000 });
        toast.show();
        
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    }

    getToastIcon(type) {
        const icons = {
            'success': 'check-circle',
            'error': 'exclamation-circle',
            'warning': 'exclamation-triangle',
            'info': 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatRelativeTime(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    }

    populateGoalForm(goal) {
        document.getElementById('goal-title').value = goal.title || '';
        document.getElementById('goal-description').value = goal.description || '';
        document.getElementById('goal-category').value = goal.category || '';
        document.getElementById('goal-priority').value = goal.priority || 'medium';
        document.getElementById('goal-target-date').value = goal.target_date ? goal.target_date.split('T')[0] : '';
        document.getElementById('goal-estimated-hours').value = goal.estimated_hours || '';
        document.getElementById('goal-tags').value = goal.tags ? goal.tags.join(', ') : '';
        
        // Clear existing milestones
        const container = document.getElementById('milestones-container');
        container.innerHTML = '';
        
        // Add milestones
        if (goal.milestones && goal.milestones.length > 0) {
            goal.milestones.forEach(milestone => {
                this.addMilestoneInput();
                const inputs = container.querySelectorAll('.milestone-title');
                inputs[inputs.length - 1].value = milestone.title;
            });
        } else {
            this.addMilestoneInput();
        }
        
        // Update modal title and button
        document.getElementById('goalModalTitle').textContent = 'Edit Goal';
        document.getElementById('goal-save-btn').textContent = 'Update Goal';
    }
}

// Initialize the application
const app = new LearningDashboard();

// Make app globally available for onclick handlers
window.app = app;