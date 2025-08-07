// Data Manager
class DataManager {
    constructor() {
        this.authManager = new AuthManager();
        this.init();
    }

    init() {
        // Initialize with sample data if no data exists
        if (!Utils.getItem('appInitialized')) {
            this.initializeSampleData();
            Utils.setItem('appInitialized', true);
        }
    }

    // Initialize sample data
    initializeSampleData() {
        // Sample users
        const sampleUsers = [
            {
                id: 'user1',
                name: 'Alex Johnson',
                email: 'alex@example.com',
                password: btoa('password123'), // Simple encoding
                avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=128&h=128&dpr=2',
                bio: 'Passionate learner exploring technology and design. Always looking for new challenges and opportunities to grow.',
                createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
                preferences: {
                    theme: 'light',
                    notifications: {
                        email: true,
                        push: true,
                        reminders: true
                    }
                }
            }
        ];

        // Sample goals
        const sampleGoals = [
            {
                id: 'goal1',
                userId: 'user1',
                title: 'Master React.js',
                description: 'Learn React.js fundamentals including hooks, context, and state management. Build at least 3 projects to practice.',
                category: 'programming',
                priority: 'high',
                targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days from now
                createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                isCompleted: false,
                progress: 65,
                milestones: [
                    { id: 'milestone1', title: 'Complete React fundamentals course', isCompleted: true },
                    { id: 'milestone2', title: 'Build a todo app', isCompleted: true },
                    { id: 'milestone3', title: 'Learn React hooks', isCompleted: true },
                    { id: 'milestone4', title: 'Build a portfolio website', isCompleted: false },
                    { id: 'milestone5', title: 'Learn state management (Redux/Context)', isCompleted: false }
                ]
            },
            {
                id: 'goal2',
                userId: 'user1',
                title: 'Learn UI/UX Design',
                description: 'Understand design principles, user research, and prototyping tools like Figma.',
                category: 'design',
                priority: 'medium',
                targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
                createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
                isCompleted: false,
                progress: 35,
                milestones: [
                    { id: 'milestone6', title: 'Complete design fundamentals course', isCompleted: true },
                    { id: 'milestone7', title: 'Learn Figma basics', isCompleted: true },
                    { id: 'milestone8', title: 'Design 5 mobile app screens', isCompleted: false },
                    { id: 'milestone9', title: 'Create a design system', isCompleted: false }
                ]
            },
            {
                id: 'goal3',
                userId: 'user1',
                title: 'Learn Spanish',
                description: 'Achieve conversational level in Spanish through daily practice and lessons.',
                category: 'languages',
                priority: 'medium',
                targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
                createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                isCompleted: false,
                progress: 20,
                milestones: [
                    { id: 'milestone10', title: 'Learn basic vocabulary (500 words)', isCompleted: true },
                    { id: 'milestone11', title: 'Master present tense conjugations', isCompleted: false },
                    { id: 'milestone12', title: 'Have first conversation with native speaker', isCompleted: false },
                    { id: 'milestone13', title: 'Watch Spanish movie without subtitles', isCompleted: false }
                ]
            },
            {
                id: 'goal4',
                userId: 'user1',
                title: 'Complete Machine Learning Course',
                description: 'Finished Stanford\'s Machine Learning course and implemented 3 ML projects.',
                category: 'science',
                priority: 'high',
                targetDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                createdAt: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
                isCompleted: true,
                progress: 100,
                completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                milestones: [
                    { id: 'milestone14', title: 'Complete all course lectures', isCompleted: true },
                    { id: 'milestone15', title: 'Implement linear regression', isCompleted: true },
                    { id: 'milestone16', title: 'Build a neural network from scratch', isCompleted: true },
                    { id: 'milestone17', title: 'Create a recommendation system', isCompleted: true }
                ]
            }
        ];

        // Sample resources
        const sampleResources = [
            {
                id: 'resource1',
                userId: 'user1',
                goalId: 'goal1',
                title: 'React Official Documentation',
                description: 'Comprehensive guide to React concepts and API reference.',
                resourceType: 'link',
                url: 'https://reactjs.org/docs',
                category: 'article',
                tags: ['react', 'javascript', 'frontend', 'documentation'],
                createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
                rating: 5
            },
            {
                id: 'resource2',
                userId: 'user1',
                goalId: 'goal1',
                title: 'React Hooks Tutorial',
                description: 'Complete tutorial on using React hooks effectively.',
                resourceType: 'link',
                url: 'https://www.youtube.com/watch?v=hooks-tutorial',
                category: 'video',
                tags: ['react', 'hooks', 'tutorial', 'youtube'],
                createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
                rating: 4
            },
            {
                id: 'resource3',
                userId: 'user1',
                goalId: 'goal2',
                title: 'Design Systems Notes',
                description: 'Personal notes on creating and maintaining design systems.',
                resourceType: 'note',
                content: `# Design Systems Notes

## Key Principles
1. Consistency
2. Scalability 
3. Accessibility
4. Documentation

## Components to Include
- Typography scale
- Color palette
- Spacing system
- Button variants
- Form elements

## Tools
- Figma for design
- Storybook for documentation
- Design tokens for consistency`,
                category: 'note',
                tags: ['design-system', 'ui', 'notes', 'figma'],
                createdAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
                rating: 0
            },
            {
                id: 'resource4',
                userId: 'user1',
                goalId: 'goal2',
                title: 'The Design of Everyday Things',
                description: 'Classic book on design principles and user psychology.',
                resourceType: 'book',
                category: 'book',
                tags: ['design', 'ux', 'psychology', 'book'],
                createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
                rating: 5
            },
            {
                id: 'resource5',
                userId: 'user1',
                goalId: 'goal3',
                title: 'SpanishDict',
                description: 'Comprehensive Spanish learning platform with exercises.',
                resourceType: 'link',
                url: 'https://www.spanishdict.com',
                category: 'tool',
                tags: ['spanish', 'language', 'dictionary', 'exercises'],
                createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
                rating: 4
            }
        ];

        // Sample activities
        const sampleActivities = [
            {
                id: 'activity1',
                userId: 'user1',
                type: 'goal_created',
                title: 'Created new goal',
                description: 'Started learning Spanish',
                goalId: 'goal3',
                date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                duration: 0
            },
            {
                id: 'activity2',
                userId: 'user1',
                type: 'milestone_completed',
                title: 'Completed milestone',
                description: 'Finished React fundamentals course',
                goalId: 'goal1',
                milestoneId: 'milestone1',
                date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                duration: 120
            },
            {
                id: 'activity3',
                userId: 'user1',
                type: 'resource_added',
                title: 'Added new resource',
                description: 'Added SpanishDict to Spanish learning goal',
                goalId: 'goal3',
                resourceId: 'resource5',
                date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
                duration: 0
            },
            {
                id: 'activity4',
                userId: 'user1',
                type: 'goal_completed',
                title: 'Completed goal',
                description: 'Finished Machine Learning course',
                goalId: 'goal4',
                date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                duration: 0
            },
            {
                id: 'activity5',
                userId: 'user1',
                type: 'study_session',
                title: 'Study session',
                description: 'Practiced Spanish vocabulary',
                goalId: 'goal3',
                date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                duration: 45
            },
            {
                id: 'activity6',
                userId: 'user1',
                type: 'milestone_completed',
                title: 'Completed milestone',
                description: 'Built a todo app with React',
                goalId: 'goal1',
                milestoneId: 'milestone2',
                date: new Date().toISOString(),
                duration: 180
            }
        ];

        // Sample notifications
        const sampleNotifications = [
            {
                id: 'notification1',
                userId: 'user1',
                type: 'reminder',
                title: 'Daily Spanish Practice',
                message: 'Time for your daily Spanish lesson!',
                isRead: false,
                createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
                goalId: 'goal3'
            },
            {
                id: 'notification2',
                userId: 'user1',
                type: 'milestone',
                title: 'Milestone Completed!',
                message: 'Great job completing "React fundamentals course"',
                isRead: false,
                createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                goalId: 'goal1',
                milestoneId: 'milestone1'
            },
            {
                id: 'notification3',
                userId: 'user1',
                type: 'achievement',
                title: 'Goal Completed! 🎉',
                message: 'You completed "Complete Machine Learning Course"',
                isRead: true,
                createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                goalId: 'goal4'
            }
        ];

        // Save sample data
        Utils.setItem('users', sampleUsers);
        
        // Login the sample user automatically
        this.authManager.currentUser = sampleUsers[0];
        this.authManager.isAuthenticated = true;
        Utils.setItem('currentUser', sampleUsers[0]);
        Utils.setItem('authToken', this.authManager.generateToken(sampleUsers[0]));
        
        // Save user-specific data
        this.saveGoals(sampleGoals);
        this.saveResources(sampleResources);
        this.saveActivities(sampleActivities);
        this.saveNotifications(sampleNotifications);
    }

    // Goals Management
    getGoals() {
        return Utils.getItem('userGoals', []).filter(goal => 
            goal.userId === this.authManager.currentUser?.id
        );
    }

    saveGoals(goals) {
        Utils.setItem('userGoals', goals);
    }

    addGoal(goalData) {
        const goals = Utils.getItem('userGoals', []);
        const newGoal = {
            id: Utils.generateId(),
            userId: this.authManager.currentUser.id,
            ...goalData,
            createdAt: new Date().toISOString(),
            isCompleted: false,
            progress: 0
        };
        
        goals.push(newGoal);
        this.saveGoals(goals);
        
        // Add activity
        this.addActivity({
            type: 'goal_created',
            title: 'Created new goal',
            description: `Started "${goalData.title}"`,
            goalId: newGoal.id
        });
        
        return newGoal;
    }

    updateGoal(goalId, updates) {
        const goals = Utils.getItem('userGoals', []);
        const goalIndex = goals.findIndex(g => g.id === goalId);
        
        if (goalIndex !== -1) {
            goals[goalIndex] = {
                ...goals[goalIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            // Check if goal was completed
            if (updates.isCompleted && !goals[goalIndex].completedAt) {
                goals[goalIndex].completedAt = new Date().toISOString();
                
                // Add completion activity
                this.addActivity({
                    type: 'goal_completed',
                    title: 'Completed goal',
                    description: `Finished "${goals[goalIndex].title}"`,
                    goalId: goalId
                });
            }
            
            this.saveGoals(goals);
            return goals[goalIndex];
        }
        
        return null;
    }

    deleteGoal(goalId) {
        const goals = Utils.getItem('userGoals', []);
        const filteredGoals = goals.filter(g => g.id !== goalId);
        
        if (filteredGoals.length !== goals.length) {
            this.saveGoals(filteredGoals);
            
            // Also delete related resources and activities
            this.deleteResourcesByGoal(goalId);
            this.deleteActivitiesByGoal(goalId);
            
            return true;
        }
        
        return false;
    }

    updateMilestone(goalId, milestoneId, updates) {
        const goals = Utils.getItem('userGoals', []);
        const goalIndex = goals.findIndex(g => g.id === goalId);
        
        if (goalIndex !== -1) {
            const milestoneIndex = goals[goalIndex].milestones.findIndex(m => m.id === milestoneId);
            
            if (milestoneIndex !== -1) {
                goals[goalIndex].milestones[milestoneIndex] = {
                    ...goals[goalIndex].milestones[milestoneIndex],
                    ...updates
                };
                
                // Recalculate goal progress
                const completedMilestones = goals[goalIndex].milestones.filter(m => m.isCompleted).length;
                const totalMilestones = goals[goalIndex].milestones.length;
                goals[goalIndex].progress = Utils.calculateProgress(completedMilestones, totalMilestones);
                
                // Add activity for milestone completion
                if (updates.isCompleted) {
                    this.addActivity({
                        type: 'milestone_completed',
                        title: 'Completed milestone',
                        description: `Finished "${goals[goalIndex].milestones[milestoneIndex].title}"`,
                        goalId: goalId,
                        milestoneId: milestoneId,
                        duration: 60 // Default duration for milestone
                    });
                }
                
                this.saveGoals(goals);
                return goals[goalIndex];
            }
        }
        
        return null;
    }

    // Resources Management
    getResources() {
        return Utils.getItem('userResources', []).filter(resource => 
            resource.userId === this.authManager.currentUser?.id
        );
    }

    saveResources(resources) {
        Utils.setItem('userResources', resources);
    }

    addResource(resourceData) {
        const resources = Utils.getItem('userResources', []);
        const newResource = {
            id: Utils.generateId(),
            userId: this.authManager.currentUser.id,
            ...resourceData,
            createdAt: new Date().toISOString(),
            rating: 0,
            lastAccessed: null
        };
        
        resources.push(newResource);
        this.saveResources(resources);
        
        // Add activity
        this.addActivity({
            type: 'resource_added',
            title: 'Added new resource',
            description: `Added "${resourceData.title}"`,
            goalId: resourceData.goalId,
            resourceId: newResource.id
        });
        
        return newResource;
    }

    updateResource(resourceId, updates) {
        const resources = Utils.getItem('userResources', []);
        const resourceIndex = resources.findIndex(r => r.id === resourceId);
        
        if (resourceIndex !== -1) {
            resources[resourceIndex] = {
                ...resources[resourceIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            
            this.saveResources(resources);
            return resources[resourceIndex];
        }
        
        return null;
    }

    deleteResource(resourceId) {
        const resources = Utils.getItem('userResources', []);
        const filteredResources = resources.filter(r => r.id !== resourceId);
        
        if (filteredResources.length !== resources.length) {
            this.saveResources(filteredResources);
            return true;
        }
        
        return false;
    }

    deleteResourcesByGoal(goalId) {
        const resources = Utils.getItem('userResources', []);
        const filteredResources = resources.filter(r => r.goalId !== goalId);
        this.saveResources(filteredResources);
    }

    // Activities Management
    getActivities() {
        return Utils.getItem('userActivities', []).filter(activity => 
            activity.userId === this.authManager.currentUser?.id
        );
    }

    saveActivities(activities) {
        Utils.setItem('userActivities', activities);
    }

    addActivity(activityData) {
        const activities = Utils.getItem('userActivities', []);
        const newActivity = {
            id: Utils.generateId(),
            userId: this.authManager.currentUser.id,
            ...activityData,
            date: activityData.date || new Date().toISOString(),
            duration: activityData.duration || 0
        };
        
        activities.unshift(newActivity); // Add to beginning
        
        // Keep only last 100 activities per user
        const userActivities = activities.filter(a => a.userId === this.authManager.currentUser.id);
        if (userActivities.length > 100) {
            const otherActivities = activities.filter(a => a.userId !== this.authManager.currentUser.id);
            const trimmedUserActivities = userActivities.slice(0, 100);
            this.saveActivities([...otherActivities, ...trimmedUserActivities]);
        } else {
            this.saveActivities(activities);
        }
        
        return newActivity;
    }

    deleteActivitiesByGoal(goalId) {
        const activities = Utils.getItem('userActivities', []);
        const filteredActivities = activities.filter(a => a.goalId !== goalId);
        this.saveActivities(filteredActivities);
    }

    // Notifications Management
    getNotifications() {
        return Utils.getItem('userNotifications', []).filter(notification => 
            notification.userId === this.authManager.currentUser?.id
        );
    }

    saveNotifications(notifications) {
        Utils.setItem('userNotifications', notifications);
    }

    addNotification(notificationData) {
        const notifications = Utils.getItem('userNotifications', []);
        const newNotification = {
            id: Utils.generateId(),
            userId: this.authManager.currentUser.id,
            ...notificationData,
            isRead: false,
            createdAt: new Date().toISOString()
        };
        
        notifications.unshift(newNotification); // Add to beginning
        this.saveNotifications(notifications);
        
        return newNotification;
    }

    markNotificationAsRead(notificationId) {
        const notifications = Utils.getItem('userNotifications', []);
        const notificationIndex = notifications.findIndex(n => n.id === notificationId);
        
        if (notificationIndex !== -1) {
            notifications[notificationIndex].isRead = true;
            notifications[notificationIndex].readAt = new Date().toISOString();
            this.saveNotifications(notifications);
            return notifications[notificationIndex];
        }
        
        return null;
    }

    markAllNotificationsAsRead() {
        const notifications = Utils.getItem('userNotifications', []);
        const userNotifications = notifications.map(notification => {
            if (notification.userId === this.authManager.currentUser.id && !notification.isRead) {
                return {
                    ...notification,
                    isRead: true,
                    readAt: new Date().toISOString()
                };
            }
            return notification;
        });
        
        this.saveNotifications(userNotifications);
        return true;
    }

    clearAllNotifications() {
        const notifications = Utils.getItem('userNotifications', []);
        const filteredNotifications = notifications.filter(n => 
            n.userId !== this.authManager.currentUser.id
        );
        
        this.saveNotifications(filteredNotifications);
        return true;
    }

    // Search and Filter
    searchGoals(query, filters = {}) {
        let goals = this.getGoals();
        
        // Text search
        if (query) {
            goals = Utils.search(goals, query, ['title', 'description', 'category']);
        }
        
        // Apply filters
        if (filters.status) {
            if (filters.status === 'completed') {
                goals = goals.filter(g => g.isCompleted);
            } else if (filters.status === 'active') {
                goals = goals.filter(g => !g.isCompleted && !Utils.isOverdue(g.targetDate));
            } else if (filters.status === 'overdue') {
                goals = goals.filter(g => !g.isCompleted && Utils.isOverdue(g.targetDate));
            }
        }
        
        if (filters.category) {
            goals = goals.filter(g => g.category === filters.category);
        }
        
        if (filters.priority) {
            goals = goals.filter(g => g.priority === filters.priority);
        }
        
        // Sort
        if (filters.sortBy) {
            const direction = filters.sortOrder || 'desc';
            goals = Utils.sortBy(goals, filters.sortBy, direction);
        }
        
        return goals;
    }

    searchResources(query, filters = {}) {
        let resources = this.getResources();
        
        // Text search
        if (query) {
            resources = Utils.search(resources, query, ['title', 'description', 'tags', 'category']);
        }
        
        // Apply filters
        if (filters.category) {
            resources = resources.filter(r => r.category === filters.category);
        }
        
        if (filters.type) {
            resources = resources.filter(r => r.resourceType === filters.type);
        }
        
        if (filters.goalId) {
            resources = resources.filter(r => r.goalId === filters.goalId);
        }
        
        // Sort by creation date by default
        resources = Utils.sortBy(resources, 'createdAt', 'desc');
        
        return resources;
    }

    // Analytics and Reports
    getAnalyticsData() {
        const goals = this.getGoals();
        const resources = this.getResources();
        const activities = this.getActivities();
        
        return Utils.generateReportData(goals, resources, activities);
    }

    // Data Export
    exportUserData() {
        const userData = {
            profile: this.authManager.currentUser,
            goals: this.getGoals(),
            resources: this.getResources(),
            activities: this.getActivities(),
            notifications: this.getNotifications(),
            exportedAt: new Date().toISOString()
        };
        
        return userData;
    }

    // Backup and Restore
    backupData() {
        const backup = this.exportUserData();
        const filename = `learnflow-backup-${Utils.formatDate(new Date())}.json`;
        Utils.exportJSON(backup, filename);
        
        return backup;
    }

    restoreData(backupData) {
        try {
            // Validate backup data structure
            if (!backupData.goals || !backupData.resources || !backupData.activities) {
                throw new Error('Invalid backup data format');
            }
            
            // Restore data
            this.saveGoals(backupData.goals);
            this.saveResources(backupData.resources);
            this.saveActivities(backupData.activities);
            
            if (backupData.notifications) {
                this.saveNotifications(backupData.notifications);
            }
            
            return true;
        } catch (error) {
            console.error('Error restoring data:', error);
            return false;
        }
    }
}

// Export for global use
window.DataManager = DataManager;