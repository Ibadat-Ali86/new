// Charts Manager
class ChartsManager {
    constructor() {
        this.charts = {};
        this.colors = {
            primary: '#3B82F6',
            secondary: '#14B8A6',
            accent: '#F97316',
            success: '#22C55E',
            warning: '#F59E0B',
            error: '#EF4444',
            neutral: '#6B7280'
        };
    }

    // Initialize all charts
    initCharts(dataManager) {
        this.dataManager = dataManager;
        this.createProgressChart();
        this.createCompletionChart();
        this.createActivityChart();
        this.createCategoryChart();
    }

    // Progress Overview Chart (Line Chart)
    createProgressChart() {
        const ctx = document.getElementById('progress-chart');
        if (!ctx) return;

        // Generate progress data for the last 30 days
        const progressData = this.generateProgressData();

        if (this.charts.progress) {
            this.charts.progress.destroy();
        }

        this.charts.progress = new Chart(ctx, {
            type: 'line',
            data: {
                labels: progressData.labels,
                datasets: [{
                    label: 'Goals Progress',
                    data: progressData.progress,
                    borderColor: this.colors.primary,
                    backgroundColor: `${this.colors.primary}20`,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: this.colors.primary,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }, {
                    label: 'Resources Added',
                    data: progressData.resources,
                    borderColor: this.colors.secondary,
                    backgroundColor: `${this.colors.secondary}20`,
                    tension: 0.4,
                    fill: false,
                    pointBackgroundColor: this.colors.secondary,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        cornerRadius: 8,
                        padding: 12
                    }
                },
                interaction: {
                    mode: 'nearest',
                    intersect: false
                },
                scales: {
                    x: {
                        display: true,
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        display: true,
                        beginAtZero: true,
                        grid: {
                            borderDash: [5, 5],
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                },
                elements: {
                    point: {
                        hoverBackgroundColor: '#ffffff'
                    }
                }
            }
        });
    }

    // Goal Completion Chart (Doughnut Chart)
    createCompletionChart() {
        const ctx = document.getElementById('completion-chart');
        if (!ctx) return;

        const goals = this.dataManager?.getGoals() || [];
        const completed = goals.filter(g => g.isCompleted).length;
        const active = goals.filter(g => !g.isCompleted && !Utils.isOverdue(g.targetDate)).length;
        const overdue = goals.filter(g => !g.isCompleted && Utils.isOverdue(g.targetDate)).length;

        if (this.charts.completion) {
            this.charts.completion.destroy();
        }

        this.charts.completion = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['Completed', 'Active', 'Overdue'],
                datasets: [{
                    data: [completed, active, overdue],
                    backgroundColor: [
                        this.colors.success,
                        this.colors.primary,
                        this.colors.error
                    ],
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '60%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            usePointStyle: true,
                            padding: 20,
                            generateLabels: (chart) => {
                                const data = chart.data;
                                if (data.labels.length && data.datasets.length) {
                                    return data.labels.map((label, i) => {
                                        const dataset = data.datasets[0];
                                        const value = dataset.data[i];
                                        const total = dataset.data.reduce((sum, val) => sum + val, 0);
                                        const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
                                        
                                        return {
                                            text: `${label}: ${value} (${percentage}%)`,
                                            fillStyle: dataset.backgroundColor[i],
                                            strokeStyle: dataset.backgroundColor[i],
                                            pointStyle: 'circle'
                                        };
                                    });
                                }
                                return [];
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const total = context.dataset.data.reduce((sum, val) => sum + val, 0);
                                const percentage = total > 0 ? Math.round((context.raw / total) * 100) : 0;
                                return `${context.label}: ${context.raw} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });
    }

    // Activity Timeline Chart (Bar Chart)
    createActivityChart() {
        const ctx = document.getElementById('activity-chart');
        if (!ctx) return;

        const activityData = this.generateActivityData();

        if (this.charts.activity) {
            this.charts.activity.destroy();
        }

        this.charts.activity = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: activityData.labels,
                datasets: [{
                    label: 'Study Sessions',
                    data: activityData.studySessions,
                    backgroundColor: `${this.colors.primary}80`,
                    borderColor: this.colors.primary,
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false
                }, {
                    label: 'Milestones Completed',
                    data: activityData.milestones,
                    backgroundColor: `${this.colors.success}80`,
                    borderColor: this.colors.success,
                    borderWidth: 1,
                    borderRadius: 4,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: {
                            usePointStyle: true,
                            padding: 20
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            borderDash: [5, 5],
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                }
            }
        });
    }

    // Category Breakdown Chart (Polar Area Chart)
    createCategoryChart() {
        const ctx = document.getElementById('category-chart');
        if (!ctx) return;

        const goals = this.dataManager?.getGoals() || [];
        const categoryData = this.generateCategoryData(goals);

        if (this.charts.category) {
            this.charts.category.destroy();
        }

        this.charts.category = new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: categoryData.labels,
                datasets: [{
                    data: categoryData.values,
                    backgroundColor: [
                        `${this.colors.primary}60`,
                        `${this.colors.secondary}60`,
                        `${this.colors.accent}60`,
                        `${this.colors.success}60`,
                        `${this.colors.warning}60`,
                        `${this.colors.error}60`
                    ],
                    borderColor: [
                        this.colors.primary,
                        this.colors.secondary,
                        this.colors.accent,
                        this.colors.success,
                        this.colors.warning,
                        this.colors.error
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: {
                            usePointStyle: true,
                            padding: 15
                        }
                    }
                },
                scales: {
                    r: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.1)'
                        }
                    }
                }
            }
        });
    }

    // Generate progress data for the last 30 days
    generateProgressData() {
        const days = 30;
        const labels = [];
        const progress = [];
        const resources = [];
        
        const activities = this.dataManager?.getActivities() || [];
        const userResources = this.dataManager?.getResources() || [];
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            
            labels.push(Utils.formatDate(date, { month: 'short', day: 'numeric' }));
            
            // Count study sessions and milestones for this day
            const dayActivities = activities.filter(a => 
                new Date(a.date).toDateString() === dateStr &&
                (a.type === 'study_session' || a.type === 'milestone_completed')
            );
            
            progress.push(dayActivities.length);
            
            // Count resources added on this day
            const dayResources = userResources.filter(r => 
                new Date(r.createdAt).toDateString() === dateStr
            );
            
            resources.push(dayResources.length);
        }
        
        return { labels, progress, resources };
    }

    // Generate activity data for the last 7 days
    generateActivityData() {
        const days = 7;
        const labels = [];
        const studySessions = [];
        const milestones = [];
        
        const activities = this.dataManager?.getActivities() || [];
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            
            labels.push(Utils.formatDate(date, { weekday: 'short' }));
            
            const dayActivities = activities.filter(a => 
                new Date(a.date).toDateString() === dateStr
            );
            
            studySessions.push(dayActivities.filter(a => a.type === 'study_session').length);
            milestones.push(dayActivities.filter(a => a.type === 'milestone_completed').length);
        }
        
        return { labels, studySessions, milestones };
    }

    // Generate category data from goals
    generateCategoryData(goals) {
        const categories = Utils.groupBy(goals, 'category');
        const labels = Object.keys(categories).map(cat => 
            cat.charAt(0).toUpperCase() + cat.slice(1)
        );
        const values = Object.values(categories).map(group => group.length);
        
        return { labels, values };
    }

    // Update charts with new data
    updateCharts() {
        if (this.dataManager) {
            this.createProgressChart();
            this.createCompletionChart();
            this.createActivityChart();
            this.createCategoryChart();
        }
    }

    // Update progress chart period
    updateProgressPeriod(period) {
        let days;
        switch (period) {
            case 'week':
                days = 7;
                break;
            case 'month':
                days = 30;
                break;
            case 'quarter':
                days = 90;
                break;
            default:
                days = 30;
        }
        
        // Regenerate progress data with new period
        const progressData = this.generateProgressDataForPeriod(days);
        
        if (this.charts.progress) {
            this.charts.progress.data.labels = progressData.labels;
            this.charts.progress.data.datasets[0].data = progressData.progress;
            this.charts.progress.data.datasets[1].data = progressData.resources;
            this.charts.progress.update();
        }
    }

    generateProgressDataForPeriod(days) {
        const labels = [];
        const progress = [];
        const resources = [];
        
        const activities = this.dataManager?.getActivities() || [];
        const userResources = this.dataManager?.getResources() || [];
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            
            if (days <= 7) {
                labels.push(Utils.formatDate(date, { weekday: 'short' }));
            } else if (days <= 30) {
                labels.push(Utils.formatDate(date, { month: 'short', day: 'numeric' }));
            } else {
                labels.push(Utils.formatDate(date, { month: 'short', day: 'numeric' }));
            }
            
            const dayActivities = activities.filter(a => 
                new Date(a.date).toDateString() === dateStr &&
                (a.type === 'study_session' || a.type === 'milestone_completed')
            );
            
            progress.push(dayActivities.length);
            
            const dayResources = userResources.filter(r => 
                new Date(r.createdAt).toDateString() === dateStr
            );
            
            resources.push(dayResources.length);
        }
        
        return { labels, progress, resources };
    }

    // Generate streak calendar
    generateStreakCalendar() {
        const activities = this.dataManager?.getActivities() || [];
        const streakContainer = document.getElementById('streak-calendar');
        
        if (!streakContainer) return;
        
        // Clear existing calendar
        streakContainer.innerHTML = '';
        
        // Generate last 42 days (6 weeks)
        const days = 42;
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toDateString();
            
            const dayElement = document.createElement('div');
            dayElement.className = 'streak-day';
            dayElement.textContent = date.getDate();
            
            // Check if there were activities on this day
            const dayActivities = activities.filter(a => 
                new Date(a.date).toDateString() === dateStr &&
                (a.type === 'study_session' || a.type === 'milestone_completed')
            );
            
            if (dayActivities.length >= 3) {
                dayElement.classList.add('active');
            } else if (dayActivities.length > 0) {
                dayElement.classList.add('partial');
            }
            
            // Add tooltip
            dayElement.title = `${Utils.formatDate(date)}: ${dayActivities.length} activities`;
            
            streakContainer.appendChild(dayElement);
        }
    }

    // Destroy all charts
    destroyCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.destroy();
            }
        });
        this.charts = {};
    }

    // Resize charts
    resizeCharts() {
        Object.values(this.charts).forEach(chart => {
            if (chart) {
                chart.resize();
            }
        });
    }

    // Export chart as image
    exportChart(chartName, filename) {
        const chart = this.charts[chartName];
        if (chart) {
            const url = chart.toBase64Image();
            const link = document.createElement('a');
            link.href = url;
            link.download = filename || `${chartName}-chart.png`;
            link.click();
        }
    }

    // Get chart data for export
    getChartData(chartName) {
        const chart = this.charts[chartName];
        if (chart) {
            return {
                labels: chart.data.labels,
                datasets: chart.data.datasets.map(dataset => ({
                    label: dataset.label,
                    data: dataset.data
                }))
            };
        }
        return null;
    }
}

// Export for global use
window.ChartsManager = ChartsManager;