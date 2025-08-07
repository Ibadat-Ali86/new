// Authentication Manager
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.init();
    }

    init() {
        // Check for existing session
        const storedUser = Utils.getItem('currentUser');
        const token = Utils.getItem('authToken');
        
        if (storedUser && token && this.validateToken(token)) {
            this.currentUser = storedUser;
            this.isAuthenticated = true;
        }
    }

    // Generate a simple JWT-like token (for demo purposes)
    generateToken(userData) {
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
            userId: userData.id,
            email: userData.email,
            exp: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        }));
        const signature = btoa(`${header}.${payload}.secret`);
        
        return `${header}.${payload}.${signature}`;
    }

    // Validate token
    validateToken(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return false;
            
            const payload = JSON.parse(atob(parts[1]));
            return payload.exp > Date.now();
        } catch (err) {
            return false;
        }
    }

    // Register new user
    async register(userData) {
        const { name, email, password, confirmPassword } = userData;
        
        // Validation
        if (!name || !email || !password) {
            throw new Error('All fields are required');
        }
        
        if (!Utils.isValidEmail(email)) {
            throw new Error('Please enter a valid email address');
        }
        
        if (password !== confirmPassword) {
            throw new Error('Passwords do not match');
        }
        
        const passwordStrength = Utils.checkPasswordStrength(password);
        if (passwordStrength.score < 3) {
            throw new Error('Password is too weak. ' + passwordStrength.feedback.join(', '));
        }
        
        // Check if user already exists
        const existingUsers = Utils.getItem('users', []);
        if (existingUsers.find(user => user.email === email)) {
            throw new Error('An account with this email already exists');
        }
        
        // Create new user
        const newUser = {
            id: Utils.generateId(),
            name,
            email,
            password: btoa(password), // Simple encoding (not secure for production)
            avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=128&h=128&dpr=2',
            bio: '',
            createdAt: new Date().toISOString(),
            preferences: {
                theme: 'light',
                notifications: {
                    email: true,
                    push: true,
                    reminders: true
                },
                privacy: {
                    profile: 'private',
                    activity: 'private'
                }
            },
            stats: {
                goalsCreated: 0,
                goalsCompleted: 0,
                resourcesAdded: 0,
                currentStreak: 0,
                totalStudyTime: 0
            }
        };
        
        // Save user
        existingUsers.push(newUser);
        Utils.setItem('users', existingUsers);
        
        // Log in the user
        return this.login({ email, password });
    }

    // Login user
    async login(credentials) {
        const { email, password, rememberMe = false } = credentials;
        
        // Validation
        if (!email || !password) {
            throw new Error('Email and password are required');
        }
        
        if (!Utils.isValidEmail(email)) {
            throw new Error('Please enter a valid email address');
        }
        
        // Find user
        const users = Utils.getItem('users', []);
        const user = users.find(u => u.email === email);
        
        if (!user) {
            throw new Error('No account found with this email address');
        }
        
        // Check password
        if (user.password !== btoa(password)) {
            throw new Error('Incorrect password');
        }
        
        // Generate token
        const token = this.generateToken(user);
        
        // Update user's last login
        user.lastLogin = new Date().toISOString();
        const userIndex = users.findIndex(u => u.id === user.id);
        users[userIndex] = user;
        Utils.setItem('users', users);
        
        // Set session
        this.currentUser = user;
        this.isAuthenticated = true;
        
        // Store session data
        Utils.setItem('currentUser', user);
        Utils.setItem('authToken', token);
        
        if (rememberMe) {
            Utils.setItem('rememberMe', true);
        }
        
        return { user, token };
    }

    // Logout user
    logout() {
        this.currentUser = null;
        this.isAuthenticated = false;
        
        // Clear session data
        Utils.removeItem('currentUser');
        Utils.removeItem('authToken');
        Utils.removeItem('rememberMe');
        
        // Clear other user data
        Utils.removeItem('userGoals');
        Utils.removeItem('userResources');
        Utils.removeItem('userActivities');
        Utils.removeItem('userNotifications');
        
        return true;
    }

    // Update user profile
    async updateProfile(updates) {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated');
        }
        
        const users = Utils.getItem('users', []);
        const userIndex = users.findIndex(u => u.id === this.currentUser.id);
        
        if (userIndex === -1) {
            throw new Error('User not found');
        }
        
        // Validate updates
        if (updates.email && updates.email !== this.currentUser.email) {
            if (!Utils.isValidEmail(updates.email)) {
                throw new Error('Please enter a valid email address');
            }
            
            // Check if email is already taken
            if (users.find(u => u.email === updates.email && u.id !== this.currentUser.id)) {
                throw new Error('This email is already in use');
            }
        }
        
        // Update user
        const updatedUser = {
            ...users[userIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        users[userIndex] = updatedUser;
        Utils.setItem('users', users);
        
        // Update current user
        this.currentUser = updatedUser;
        Utils.setItem('currentUser', updatedUser);
        
        return updatedUser;
    }

    // Change password
    async changePassword(currentPassword, newPassword) {
        if (!this.isAuthenticated) {
            throw new Error('Not authenticated');
        }
        
        // Verify current password
        if (this.currentUser.password !== btoa(currentPassword)) {
            throw new Error('Current password is incorrect');
        }
        
        // Validate new password
        const passwordStrength = Utils.checkPasswordStrength(newPassword);
        if (passwordStrength.score < 3) {
            throw new Error('New password is too weak. ' + passwordStrength.feedback.join(', '));
        }
        
        // Update password
        const users = Utils.getItem('users', []);
        const userIndex = users.findIndex(u => u.id === this.currentUser.id);
        
        users[userIndex].password = btoa(newPassword);
        users[userIndex].updatedAt = new Date().toISOString();
        
        Utils.setItem('users', users);
        
        // Update current user
        this.currentUser = users[userIndex];
        Utils.setItem('currentUser', this.currentUser);
        
        return true;
    }

    // Get user stats
    getUserStats() {
        if (!this.isAuthenticated) return null;
        
        const goals = Utils.getItem('userGoals', []);
        const resources = Utils.getItem('userResources', []);
        const activities = Utils.getItem('userActivities', []);
        
        const completedGoals = goals.filter(g => g.isCompleted).length;
        const currentStreak = Utils.calculateStreak(activities);
        
        return {
            goalsCreated: goals.length,
            goalsCompleted: completedGoals,
            resourcesAdded: resources.length,
            currentStreak,
            totalStudyTime: activities.reduce((total, activity) => {
                return total + (activity.duration || 0);
            }, 0)
        };
    }

    // Update user stats
    updateUserStats(stats) {
        if (!this.isAuthenticated) return;
        
        const users = Utils.getItem('users', []);
        const userIndex = users.findIndex(u => u.id === this.currentUser.id);
        
        if (userIndex !== -1) {
            users[userIndex].stats = {
                ...users[userIndex].stats,
                ...stats,
                updatedAt: new Date().toISOString()
            };
            
            Utils.setItem('users', users);
            this.currentUser.stats = users[userIndex].stats;
            Utils.setItem('currentUser', this.currentUser);
        }
    }

    // Check session validity
    isSessionValid() {
        if (!this.isAuthenticated) return false;
        
        const token = Utils.getItem('authToken');
        return token && this.validateToken(token);
    }

    // Refresh session
    refreshSession() {
        if (!this.isSessionValid()) {
            this.logout();
            return false;
        }
        
        // Generate new token
        const token = this.generateToken(this.currentUser);
        Utils.setItem('authToken', token);
        
        return true;
    }

    // Get current user
    getCurrentUser() {
        return this.currentUser;
    }

    // Check if user is authenticated
    isUserAuthenticated() {
        return this.isAuthenticated && this.isSessionValid();
    }
}

// Export for global use
window.AuthManager = AuthManager;