// Main Application
class LearnFlowApp {
    constructor() {
        this.isInitialized = false;
        this.currentView = 'dashboard';
        this.managers = {};
        
        // Initialize on DOM load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        try {
            // Hide loading screen initially
            await this.showLoadingScreen();
            
            // Initialize managers
            this.initializeManagers();
            
            // Check authentication
            if (!this.managers.auth.isUserAuthenticated()) {
                this.showAuthScreen();
                return;
            }
            
            // Initialize UI
            this.initializeUI();
            
            // Show app
            this.showAppScreen();
            
            // Initial data load
            this.loadInitialData();
            
            this.isInitialized = true;
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            window.showToast('Failed to initialize application', 'error');
        }
    }

    // Show loading screen
    showLoadingScreen() {
        return new Promise((resolve) => {
            const loadingScreen = document.getElementById('loading-screen');
            if (loadingScreen) {
                loadingScreen.classList.remove('hidden');
                setTimeout(resolve, 1000); // Minimum loading time for better UX
            } else {
                resolve();
            }
        });
    }

    // Initialize all managers
    initializeManagers() {
        // Data and auth managers
        this.managers.data = new DataManager();
        this.managers.auth = this.managers.data.authManager;
        
        // Feature managers
        this.managers.goals = new GoalsManager(this.managers.data);
        this.managers.resources = new ResourcesManager(this.managers.data);
        this.managers.notifications = new NotificationsManager(this.managers.data);
        this.managers.charts = new ChartsManager();
        this.managers.calendar = new CalendarManager(this.managers.data);
        
        // Expose managers globally for easy access
        window.dataManager = this.managers.data;
        window.authManager = this.managers.auth;
        window.goalsManager = this.managers.goals;
        window.resourcesManager = this.managers.resources;
        window.notificationsManager = this.managers.notifications;
        window.chartsManager = this.managers.charts;
        window.calendarManager = this.managers.calendar;
    }

    // Initialize UI event listeners
    initializeUI() {
        this.initializeAuth();
        this.initializeNavigation();
        this.initializeUserMenu();
        this.initializeSearch();
        this.initializeResponsive();
        this.initializeKeyboardShortcuts();
    }

    // Initialize authentication UI
    initializeAuth() {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const showRegisterLink = document.getElementById('show-register');
        const showLoginLink = document.getElementById('show-login');
        const logoutBtn = document.getElementById('logout-btn');
        const passwordToggles = document.querySelectorAll('.password-toggle');
        
        // Form switching
        showRegisterLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthForm('register');
        });
        
        showLoginLink?.addEventListener('click', (e) => {
            e.preventDefault();
            this.switchAuthForm('login');
        });
        
        // Password toggles
        passwordToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const passwordInput = toggle.previousElementSibling;
                const icon = toggle.querySelector('i');
                
                if (passwordInput.type === 'password') {
                    passwordInput.type = 'text';
                    icon.classList.replace('fa-eye', 'fa-eye-slash');
                } else {
                    passwordInput.type = 'password';
                    icon.classList.replace('fa-eye-slash', 'fa-eye');
                }
            });
        });
        
        // Password strength checker
        const registerPassword = document.getElementById('register-password');
        if (registerPassword) {
            registerPassword.addEventListener('input', (e) => {
                this.updatePasswordStrength(e.target.value);
            });
        }
        
        // Form submissions
        loginForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
        
        registerForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
        
        // Logout
        logoutBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });
    }

    // Switch between auth forms
    switchAuthForm(formType) {
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        
        if (formType === 'register') {
            loginForm?.classList.add('hidden');
            registerForm?.classList.remove('hidden');
        } else {
            registerForm?.classList.add('hidden');
            loginForm?.classList.remove('hidden');
        }
    }

    // Update password strength indicator
    updatePasswordStrength(password) {
        const strengthBar = document.querySelector('.strength-bar');
        const strengthText = document.querySelector('.strength-text');
        
        if (!strengthBar || !strengthText) return;
        
        const strength = Utils.checkPasswordStrength(password);
        
        strengthBar.className = `strength-bar ${strength.strength}`;
        strengthText.textContent = `Password strength: ${strength.strength}`;
        
        if (strength.feedback.length > 0) {
            strengthText.textContent += ` (${strength.feedback.join(', ')})`;
        }
    }

    // Handle login
    async handleLogin() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const rememberMe = document.getElementById('remember-me').checked;
        
        try {
            await this.managers.auth.login({ email, password, rememberMe });
            window.showToast('Welcome back!', 'success');
            this.showAppScreen();
            this.loadInitialData();
        } catch (error) {
            window.showToast(error.message, 'error');
        }
    }

    // Handle registration
    async handleRegister() {
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm').value;
        
        try {
            await this.managers.auth.register({ name, email, password, confirmPassword });
            window.showToast('Account created successfully! Welcome to LearnFlow!', 'success');
            this.showAppScreen();
            this.loadInitialData();
        } catch (error) {
            window.showToast(error.message, 'error');
        }
    }

    // Handle logout
    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            this.managers.auth.logout();
            window.showToast('Logged out successfully', 'info');
            this.showAuthScreen();
        }
    }

    // Initialize navigation
    initializeNavigation() {
        const navItems = document.querySelectorAll('.nav-item');
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.getElementById('sidebar');
        
        // Navigation clicks
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const view = item.dataset.view;
                if (view) {
                    this.showView(view);
                }
            });
        });
        
        // Mobile menu toggle
        menuToggle?.addEventListener('click', () => {
            sidebar?.classList.toggle('open');
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 768 && 
                !sidebar?.contains(e.target) && 
                !menuToggle?.contains(e.target)) {
                sidebar?.classList.remove('open');
            }
        });
    }

    // Initialize user menu
    initializeUserMenu() {
        const userMenuBtn = document.getElementById('user-menu-btn');
        const userDropdown = document.getElementById('user-dropdown');
        
        userMenuBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            userDropdown?.classList.toggle('hidden');
        });
        
        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!userMenuBtn?.contains(e.target)) {
                userDropdown?.classList.add('hidden');
            }
        });
        
        // Handle dropdown menu clicks
        userDropdown?.addEventListener('click', (e) => {
            const link = e.target.closest('a[data-view]');
            if (link) {
                e.preventDefault();
                const view = link.dataset.view;
                this.showView(view);
                userDropdown.classList.add('hidden');
            }
        });
    }

    // Initialize global search
    initializeSearch() {
        const globalSearch = document.getElementById('global-search');
        
        globalSearch?.addEventListener('input', Utils.debounce((e) => {
            this.handleGlobalSearch(e.target.value);
        }, 300));
        
        globalSearch?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.executeGlobalSearch(e.target.value);
            }
        });
    }

    // Handle global search
    handleGlobalSearch(query) {
        if (!query.trim()) return;
        
        // Show search suggestions (simplified implementation)
        const goals = this.managers.data.searchGoals(query);
        const resources = this.managers.data.searchResources(query);
        
        // In a full implementation, you'd show a dropdown with suggestions
        console.log('Search results:', { goals, resources });
    }

    // Execute global search
    executeGlobalSearch(query) {
        if (!query.trim()) return;
        
        // Navigate to appropriate view and filter results
        const goals = this.managers.data.searchGoals(query);
        const resources = this.managers.data.searchResources(query);
        
        if (goals.length > resources.length) {
            this.showView('goals');
            // Set search filter (would need to implement in goals manager)
        } else if (resources.length > 0) {
            this.showView('resources');
            // Set search filter
            const resourcesSearch = document.getElementById('resources-search');
            if (resourcesSearch) {
                resourcesSearch.value = query;
                this.managers.resources.filterResources();
            }
        }
    }

    // Initialize responsive behavior
    initializeResponsive() {
        // Handle window resize
        window.addEventListener('resize', Utils.throttle(() => {
            this.handleResize();
        }, 250));
        
        // Initial resize
        this.handleResize();
    }

    // Handle window resize
    handleResize() {
        // Resize charts
        if (this.managers.charts) {
            this.managers.charts.resizeCharts();
        }
        
        // Close mobile menu on desktop
        if (window.innerWidth > 768) {
            const sidebar = document.getElementById('sidebar');
            sidebar?.classList.remove('open');
        }
    }

    // Initialize keyboard shortcuts
    initializeKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only handle shortcuts when not typing in inputs
            if (e.target.matches('input, textarea, select')) return;
            
            // Ctrl/Cmd + shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'n':
                        e.preventDefault();
                        if (this.currentView === 'goals') {
                            this.managers.goals.showGoalModal();
                        } else if (this.currentView === 'resources') {
                            this.managers.resources.showResourceModal();
                        }
                        break;
                    case 'f':
                        e.preventDefault();
                        document.getElementById('global-search')?.focus();
                        break;
                    case '/':
                        e.preventDefault();
                        document.getElementById('global-search')?.focus();
                        break;
                }
            }
            
            // Number keys for navigation
            if (e.key >= '1' && e.key <= '5' && !e.ctrlKey && !e.metaKey) {
                const views = ['dashboard', 'goals', 'resources', 'progress', 'calendar'];
                const viewIndex = parseInt(e.key) - 1;
                if (views[viewIndex]) {
                    this.showView(views[viewIndex]);
                }
            }
            
            // Escape key
            if (e.key === 'Escape') {
                // Close any open modals
                const openModal = document.querySelector('.modal:not(.hidden)');
                if (openModal) {
                    openModal.classList.add('hidden');
                }
                
                // Close notification panel
                const notificationPanel = document.getElementById('notification-panel');
                if (!notificationPanel?.classList.contains('hidden')) {
                    this.managers.notifications.hideNotificationPanel();
                }
                
                // Close user dropdown
                const userDropdown = document.getElementById('user-dropdown');
                if (!userDropdown?.classList.contains('hidden')) {
                    userDropdown.classList.add('hidden');
                }
            }
        });
    }

    // Show authentication screen
    showAuthScreen() {
        document.getElementById('loading-screen')?.classList.add('hidden');
        document.getElementById('app-container')?.classList.add('hidden');
        document.getElementById('auth-container')?.classList.remove('hidden');
    }

    // Show main application
    showAppScreen() {
        document.getElementById('loading-screen')?.classList.add('hidden');
        document.getElementById('auth-container')?.classList.add('hidden');
        document.getElementById('app-container')?.classList.remove('hidden');
        
        // Update user info
        this.updateUserInfo();
    }

    // Update user information in UI
    updateUserInfo() {
        const user = this.managers.auth.getCurrentUser();
        if (!user) return;
        
        // Update user name
        const userNameEl = document.getElementById('user-name');
        if (userNameEl) {
            userNameEl.textContent = user.name.split(' ')[0]; // First name only
        }
        
        // Update user avatar
        const userAvatarImg = document.getElementById('user-avatar-img');
        if (userAvatarImg && user.avatar) {
            userAvatarImg.src = user.avatar;
        }
        
        // Update profile form
        const profileName = document.getElementById('profile-name');
        const profileEmail = document.getElementById('profile-email');
        const profileBio = document.getElementById('profile-bio');
        const profileAvatar = document.getElementById('profile-avatar');
        
        if (profileName) profileName.value = user.name;
        if (profileEmail) profileEmail.value = user.email;
        if (profileBio) profileBio.value = user.bio || '';
        if (profileAvatar && user.avatar) profileAvatar.src = user.avatar;
    }

    // Show specific view
    showView(viewName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });
        
        // Hide all views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.add('hidden');
        });
        
        // Show target view
        const targetView = document.getElementById(`${viewName}-view`);
        if (targetView) {
            targetView.classList.remove('hidden');
            this.currentView = viewName;
            
            // Load view-specific data
            this.loadViewData(viewName);
        }
        
        // Close mobile menu
        const sidebar = document.getElementById('sidebar');
        sidebar?.classList.remove('open');
    }

    // Load view-specific data
    loadViewData(viewName) {
        switch (viewName) {
            case 'dashboard':
                this.loadDashboardData();
                break;
            case 'goals':
                this.managers.goals.renderGoals();
                break;
            case 'resources':
                this.managers.resources.renderResources();
                break;
            case 'progress':
                this.loadProgressData();
                break;
            case 'calendar':
                this.managers.calendar.renderCalendar();
                break;
            case 'profile':
                this.loadProfileData();
                break;
        }
    }

    // Load initial data
    loadInitialData() {
        // Load dashboard by default
        this.showView('dashboard');
        
        // Initialize charts
        this.managers.charts.initCharts(this.managers.data);
        
        // Start notification checks
        this.managers.notifications.scheduleNotificationChecks();
        
        // Update progress chart period selector
        const progressPeriod = document.getElementById('progress-period');
        progressPeriod?.addEventListener('change', (e) => {
            this.managers.charts.updateProgressPeriod(e.target.value);
        });
        
        // Export report button
        const exportReportBtn = document.getElementById('export-report-btn');
        exportReportBtn?.addEventListener('click', () => {
            this.exportProgressReport();
        });
    }

    // Load dashboard data
    loadDashboardData() {
        // Update statistics
        this.managers.goals.updateDashboardStats();
        
        // Render recent goals
        this.managers.goals.renderRecentGoals();
        
        // Render activity feed
        this.renderActivityFeed();
        
        // Update charts
        this.managers.charts.updateCharts();
    }

    // Load progress data
    loadProgressData() {
        // Update all charts
        this.managers.charts.updateCharts();
        
        // Generate streak calendar
        this.managers.charts.generateStreakCalendar();
    }

    // Load profile data
    loadProfileData() {
        const user = this.managers.auth.getCurrentUser();
        if (!user) return;
        
        // Update user stats
        const stats = this.managers.auth.getUserStats();
        if (stats) {
            this.managers.auth.updateUserStats(stats);
        }
        
        // Handle profile form submission
        const profileForm = document.getElementById('profile-form');
        profileForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleProfileUpdate();
        });
    }

    // Handle profile update
    async handleProfileUpdate() {
        const name = document.getElementById('profile-name').value;
        const email = document.getElementById('profile-email').value;
        const bio = document.getElementById('profile-bio').value;
        
        try {
            await this.managers.auth.updateProfile({ name, email, bio });
            window.showToast('Profile updated successfully!', 'success');
            this.updateUserInfo();
        } catch (error) {
            window.showToast(error.message, 'error');
        }
    }

    // Render activity feed
    renderActivityFeed() {
        const container = document.getElementById('activity-feed');
        if (!container) return;
        
        const activities = this.managers.data.getActivities()
            .slice(0, 5); // Show last 5 activities
        
        if (activities.length === 0) {
            container.innerHTML = `
                <div class="empty-state-small">
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon ${activity.type}">
                    <i class="${this.getActivityIcon(activity.type)}"></i>
                </div>
                <div class="activity-content">
                    <div class="activity-text">${Utils.sanitizeHTML(activity.description || activity.title)}</div>
                    <div class="activity-time">${Utils.formatRelativeTime(activity.date)}</div>
                </div>
            </div>
        `).join('');
    }

    // Get activity icon
    getActivityIcon(type) {
        const icons = {
            goal_created: 'fas fa-bullseye',
            goal_completed: 'fas fa-trophy',
            milestone_completed: 'fas fa-flag-checkered',
            resource_added: 'fas fa-book',
            study_session: 'fas fa-graduation-cap'
        };
        return icons[type] || 'fas fa-circle';
    }

    // Export progress report
    exportProgressReport() {
        const reportData = this.managers.data.getAnalyticsData();
        const user = this.managers.auth.getCurrentUser();
        
        const report = {
            user: {
                name: user.name,
                email: user.email
            },
            generatedAt: new Date().toISOString(),
            period: 'All Time',
            ...reportData
        };
        
        const filename = `learnflow-progress-report-${Utils.formatDate(new Date())}.json`;
        Utils.exportJSON(report, filename);
        
        window.showToast('Progress report exported successfully!', 'success');
    }

    // Handle app errors
    handleError(error, context = 'Application') {
        console.error(`${context} Error:`, error);
        window.showToast(`${context} error: ${error.message}`, 'error');
    }

    // Get app statistics
    getAppStats() {
        if (!this.isInitialized) return null;
        
        return {
            user: this.managers.auth.getCurrentUser(),
            goals: this.managers.goals.getGoalStats(),
            resources: this.managers.resources.getResourceStats(),
            notifications: this.managers.notifications.getNotificationStats(),
            calendar: this.managers.calendar.getCalendarStats()
        };
    }
}

// Initialize app when script loads
window.app = new LearnFlowApp();

// Global error handler
window.addEventListener('error', (e) => {
    console.error('Global error:', e.error);
    if (window.app) {
        window.app.handleError(e.error, 'Global');
    }
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    if (window.app) {
        window.app.handleError(e.reason, 'Promise');
    }
});

// Service worker registration (for future PWA features)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Service worker would be registered here in a production app
        console.log('Service worker support detected');
    });
}

// Export app for global access
window.LearnFlowApp = LearnFlowApp;