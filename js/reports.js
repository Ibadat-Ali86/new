// Reports Manager
class ReportsManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.initEventListeners();
    }

    initEventListeners() {
        const generateReportBtn = document.getElementById('generate-report-btn');
        const exportReportBtn = document.getElementById('export-report-btn');
        
        generateReportBtn?.addEventListener('click', () => {
            this.showReportOptions();
        });
        
        exportReportBtn?.addEventListener('click', () => {
            this.exportProgressReport();
        });
    }

    // Show report options modal
    showReportOptions() {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Generate Report</h3>
                    <button class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="padding: 1.5rem;">
                    <div class="report-options">
                        <h4>Report Type</h4>
                        <div class="form-group">
                            <select id="report-type" class="form-control">
                                <option value="comprehensive">Comprehensive Report</option>
                                <option value="goals">Goals Summary</option>
                                <option value="progress">Progress Report</option>
                                <option value="resources">Resources Report</option>
                                <option value="analytics">Analytics Report</option>
                            </select>
                        </div>
                        
                        <h4>Time Period</h4>
                        <div class="form-group">
                            <select id="report-period" class="form-control">
                                <option value="week">This Week</option>
                                <option value="month">This Month</option>
                                <option value="quarter">This Quarter</option>
                                <option value="year">This Year</option>
                                <option value="all">All Time</option>
                            </select>
                        </div>
                        
                        <h4>Format</h4>
                        <div class="form-group">
                            <select id="report-format" class="form-control">
                                <option value="html">HTML (View in Browser)</option>
                                <option value="json">JSON (Data Export)</option>
                                <option value="csv">CSV (Spreadsheet)</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-primary" onclick="window.reportsManager.generateReport()">Generate Report</button>
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

    // Generate report based on selected options
    generateReport(type = null, period = null, format = null) {
        // Get options from modal if not provided
        if (!type) {
            const modal = document.querySelector('.modal');
            if (modal) {
                type = modal.querySelector('#report-type')?.value || 'comprehensive';
                period = modal.querySelector('#report-period')?.value || 'month';
                format = modal.querySelector('#report-format')?.value || 'html';
                modal.remove();
            } else {
                type = 'comprehensive';
                period = 'month';
                format = 'html';
            }
        }
        
        const reportData = this.generateReportData(type, period);
        
        switch (format) {
            case 'html':
                this.showHTMLReport(reportData, type, period);
                break;
            case 'json':
                this.exportJSONReport(reportData, type, period);
                break;
            case 'csv':
                this.exportCSVReport(reportData, type, period);
                break;
        }
        
        window.showToast('Report generated successfully!', 'success');
    }

    // Generate report data
    generateReportData(type, period) {
        const user = this.dataManager.authManager.getCurrentUser();
        const goals = this.dataManager.getGoals();
        const resources = this.dataManager.getResources();
        const activities = this.dataManager.getActivities();
        
        // Filter data by period
        const filteredData = this.filterDataByPeriod({ goals, resources, activities }, period);
        
        const reportData = {
            user: {
                name: user.name,
                email: user.email,
                memberSince: user.createdAt
            },
            period: {
                type: period,
                startDate: this.getPeriodStartDate(period),
                endDate: new Date().toISOString(),
                generatedAt: new Date().toISOString()
            },
            summary: this.generateSummaryData(filteredData),
            goals: this.generateGoalsData(filteredData.goals),
            resources: this.generateResourcesData(filteredData.resources),
            activities: this.generateActivitiesData(filteredData.activities),
            analytics: this.generateAnalyticsData(filteredData)
        };
        
        return reportData;
    }

    // Filter data by time period
    filterDataByPeriod(data, period) {
        const startDate = this.getPeriodStartDate(period);
        const endDate = new Date();
        
        return {
            goals: data.goals.filter(g => new Date(g.createdAt) >= startDate),
            resources: data.resources.filter(r => new Date(r.createdAt) >= startDate),
            activities: data.activities.filter(a => {
                const activityDate = new Date(a.date);
                return activityDate >= startDate && activityDate <= endDate;
            })
        };
    }

    // Get period start date
    getPeriodStartDate(period) {
        const now = new Date();
        const startDate = new Date(now);
        
        switch (period) {
            case 'week':
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'quarter':
                startDate.setMonth(now.getMonth() - 3);
                break;
            case 'year':
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            case 'all':
                startDate.setFullYear(2020); // Arbitrary early date
                break;
        }
        
        return startDate;
    }

    // Generate summary data
    generateSummaryData(data) {
        const completedGoals = data.goals.filter(g => g.isCompleted).length;
        const totalStudyTime = data.activities
            .filter(a => a.type === 'study_session')
            .reduce((sum, a) => sum + (a.duration || 0), 0);
        
        return {
            totalGoals: data.goals.length,
            completedGoals,
            activeGoals: data.goals.length - completedGoals,
            completionRate: data.goals.length > 0 ? Math.round((completedGoals / data.goals.length) * 100) : 0,
            totalResources: data.resources.length,
            totalActivities: data.activities.length,
            totalStudyTime: Math.round(totalStudyTime / 60), // Convert to hours
            averageSessionLength: data.activities.length > 0 ? Math.round(totalStudyTime / data.activities.length) : 0
        };
    }

    // Generate goals data
    generateGoalsData(goals) {
        const byCategory = Utils.groupBy(goals, 'category');
        const byPriority = Utils.groupBy(goals, 'priority');
        const byStatus = {
            active: goals.filter(g => !g.isCompleted && !Utils.isOverdue(g.targetDate)),
            completed: goals.filter(g => g.isCompleted),
            overdue: goals.filter(g => !g.isCompleted && Utils.isOverdue(g.targetDate))
        };
        
        return {
            total: goals.length,
            byCategory,
            byPriority,
            byStatus,
            averageProgress: goals.length > 0 ? Math.round(goals.reduce((sum, g) => sum + (g.progress || 0), 0) / goals.length) : 0,
            recentlyCompleted: goals.filter(g => {
                if (!g.completedAt) return false;
                const completedDate = new Date(g.completedAt);
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                return completedDate >= weekAgo;
            })
        };
    }

    // Generate resources data
    generateResourcesData(resources) {
        const byCategory = Utils.groupBy(resources, 'category');
        const byType = Utils.groupBy(resources, 'resourceType');
        
        return {
            total: resources.length,
            byCategory,
            byType,
            favorites: resources.filter(r => r.is_favorite),
            recentlyAdded: resources.filter(r => {
                const addedDate = new Date(r.createdAt);
                const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
                return addedDate >= weekAgo;
            })
        };
    }

    // Generate activities data
    generateActivitiesData(activities) {
        const byType = Utils.groupBy(activities, 'type');
        const byDay = {};
        
        activities.forEach(activity => {
            const day = new Date(activity.date).toDateString();
            if (!byDay[day]) byDay[day] = [];
            byDay[day].push(activity);
        });
        
        return {
            total: activities.length,
            byType,
            byDay,
            streak: Utils.calculateStreak(activities),
            mostActiveDay: Object.keys(byDay).reduce((max, day) => 
                byDay[day].length > (byDay[max]?.length || 0) ? day : max, 
                Object.keys(byDay)[0]
            )
        };
    }

    // Generate analytics data
    generateAnalyticsData(data) {
        const goals = data.goals;
        const activities = data.activities;
        
        // Calculate trends
        const goalsCreatedTrend = this.calculateTrend(goals, 'createdAt');
        const activitiesTrend = this.calculateTrend(activities, 'date');
        
        return {
            trends: {
                goalsCreated: goalsCreatedTrend,
                activities: activitiesTrend
            },
            insights: this.generateInsights(data),
            recommendations: this.generateRecommendations(data)
        };
    }

    // Calculate trend (simplified)
    calculateTrend(items, dateField) {
        if (items.length < 2) return 0;
        
        const now = new Date();
        const halfwayPoint = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000)); // 7 days ago
        
        const recent = items.filter(item => new Date(item[dateField]) >= halfwayPoint).length;
        const older = items.filter(item => new Date(item[dateField]) < halfwayPoint).length;
        
        if (older === 0) return recent > 0 ? 100 : 0;
        return Math.round(((recent - older) / older) * 100);
    }

    // Generate insights
    generateInsights(data) {
        const insights = [];
        
        // Goal completion insights
        const completionRate = data.goals.length > 0 ? 
            (data.goals.filter(g => g.isCompleted).length / data.goals.length) * 100 : 0;
        
        if (completionRate > 80) {
            insights.push("Excellent goal completion rate! You're staying on track with your learning objectives.");
        } else if (completionRate > 50) {
            insights.push("Good progress on your goals. Consider breaking down larger goals into smaller milestones.");
        } else {
            insights.push("Focus on completing existing goals before adding new ones to improve your success rate.");
        }
        
        // Activity insights
        const streak = Utils.calculateStreak(data.activities);
        if (streak >= 7) {
            insights.push(`Amazing! You've maintained a ${streak}-day learning streak. Keep up the momentum!`);
        } else if (streak >= 3) {
            insights.push("You're building a good learning habit. Try to maintain consistency for better results.");
        } else {
            insights.push("Consider setting daily learning reminders to build a consistent study habit.");
        }
        
        // Resource insights
        const resourcesPerGoal = data.goals.length > 0 ? data.resources.length / data.goals.length : 0;
        if (resourcesPerGoal < 2) {
            insights.push("Consider adding more learning resources to support your goals effectively.");
        }
        
        return insights;
    }

    // Generate recommendations
    generateRecommendations(data) {
        const recommendations = [];
        
        // Based on goal categories
        const categories = Utils.groupBy(data.goals, 'category');
        const topCategory = Object.keys(categories).reduce((max, cat) => 
            categories[cat].length > (categories[max]?.length || 0) ? cat : max, 
            Object.keys(categories)[0]
        );
        
        if (topCategory) {
            recommendations.push(`You're focusing heavily on ${topCategory}. Consider exploring related areas to broaden your skills.`);
        }
        
        // Based on completion patterns
        const overdueGoals = data.goals.filter(g => !g.isCompleted && Utils.isOverdue(g.targetDate));
        if (overdueGoals.length > 0) {
            recommendations.push("Review your overdue goals and consider adjusting deadlines or breaking them into smaller tasks.");
        }
        
        // Based on activity patterns
        if (data.activities.length > 0) {
            const avgSessionLength = data.activities.reduce((sum, a) => sum + (a.duration || 0), 0) / data.activities.length;
            if (avgSessionLength < 30) {
                recommendations.push("Try longer study sessions (45-60 minutes) for better focus and retention.");
            }
        }
        
        return recommendations;
    }

    // Show HTML report
    showHTMLReport(reportData, type, period) {
        const reportWindow = window.open('', '_blank');
        const htmlContent = this.generateHTMLReport(reportData, type, period);
        
        reportWindow.document.write(htmlContent);
        reportWindow.document.close();
    }

    // Generate HTML report
    generateHTMLReport(data, type, period) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>LearnFlow Report - ${type.charAt(0).toUpperCase() + type.slice(1)}</title>
                <style>
                    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
                    .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #3B82F6; padding-bottom: 20px; }
                    .header h1 { color: #3B82F6; margin: 0; }
                    .header p { color: #666; margin: 5px 0; }
                    .section { margin: 30px 0; }
                    .section h2 { color: #333; border-left: 4px solid #3B82F6; padding-left: 15px; }
                    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
                    .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
                    .stat-value { font-size: 2em; font-weight: bold; color: #3B82F6; }
                    .stat-label { color: #666; margin-top: 5px; }
                    .insights { background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .insights h3 { color: #1976d2; margin-top: 0; }
                    .insight-item { margin: 10px 0; padding: 10px; background: white; border-radius: 5px; }
                    .recommendations { background: #f3e5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
                    .recommendations h3 { color: #7b1fa2; margin-top: 0; }
                    .recommendation-item { margin: 10px 0; padding: 10px; background: white; border-radius: 5px; }
                    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; }
                    @media print { body { background: white; } .container { box-shadow: none; } }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📚 LearnFlow Learning Report</h1>
                        <p><strong>${data.user.name}</strong> | ${data.user.email}</p>
                        <p>Report Period: ${this.formatPeriod(period)} | Generated: ${new Date(data.period.generatedAt).toLocaleDateString()}</p>
                    </div>
                    
                    <div class="section">
                        <h2>📊 Summary</h2>
                        <div class="stats-grid">
                            <div class="stat-card">
                                <div class="stat-value">${data.summary.totalGoals}</div>
                                <div class="stat-label">Total Goals</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${data.summary.completedGoals}</div>
                                <div class="stat-label">Completed Goals</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${data.summary.completionRate}%</div>
                                <div class="stat-label">Completion Rate</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${data.summary.totalResources}</div>
                                <div class="stat-label">Resources</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${data.summary.totalStudyTime}h</div>
                                <div class="stat-label">Study Time</div>
                            </div>
                            <div class="stat-card">
                                <div class="stat-value">${data.activities.streak}</div>
                                <div class="stat-label">Day Streak</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h2>🎯 Goals Analysis</h2>
                        <p><strong>Active Goals:</strong> ${data.goals.byStatus.active.length}</p>
                        <p><strong>Completed Goals:</strong> ${data.goals.byStatus.completed.length}</p>
                        <p><strong>Overdue Goals:</strong> ${data.goals.byStatus.overdue.length}</p>
                        <p><strong>Average Progress:</strong> ${data.goals.averageProgress}%</p>
                        
                        <h3>Goals by Category</h3>
                        ${Object.entries(data.goals.byCategory).map(([category, goals]) => 
                            `<p><strong>${category.charAt(0).toUpperCase() + category.slice(1)}:</strong> ${goals.length} goals</p>`
                        ).join('')}
                    </div>
                    
                    <div class="section">
                        <h2>📚 Resources Overview</h2>
                        <p><strong>Total Resources:</strong> ${data.resources.total}</p>
                        <p><strong>Recently Added:</strong> ${data.resources.recentlyAdded.length}</p>
                        <p><strong>Favorites:</strong> ${data.resources.favorites.length}</p>
                        
                        <h3>Resources by Type</h3>
                        ${Object.entries(data.resources.byType).map(([type, resources]) => 
                            `<p><strong>${type.charAt(0).toUpperCase() + type.slice(1)}:</strong> ${resources.length} resources</p>`
                        ).join('')}
                    </div>
                    
                    <div class="insights">
                        <h3>💡 Insights</h3>
                        ${data.analytics.insights.map(insight => 
                            `<div class="insight-item">${insight}</div>`
                        ).join('')}
                    </div>
                    
                    <div class="recommendations">
                        <h3>🚀 Recommendations</h3>
                        ${data.analytics.recommendations.map(rec => 
                            `<div class="recommendation-item">${rec}</div>`
                        ).join('')}
                    </div>
                    
                    <div class="footer">
                        <p>Generated by LearnFlow - Your Personal Learning Dashboard</p>
                        <p>Keep learning, keep growing! 🌱</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // Export JSON report
    exportJSONReport(reportData, type, period) {
        const filename = `learnflow-${type}-report-${period}-${Utils.formatDate(new Date())}.json`;
        Utils.exportJSON(reportData, filename);
    }

    // Export CSV report
    exportCSVReport(reportData, type, period) {
        let csvContent = '';
        
        // Summary section
        csvContent += 'Summary\n';
        csvContent += 'Metric,Value\n';
        csvContent += `Total Goals,${reportData.summary.totalGoals}\n`;
        csvContent += `Completed Goals,${reportData.summary.completedGoals}\n`;
        csvContent += `Completion Rate,${reportData.summary.completionRate}%\n`;
        csvContent += `Total Resources,${reportData.summary.totalResources}\n`;
        csvContent += `Study Time (hours),${reportData.summary.totalStudyTime}\n`;
        csvContent += `Learning Streak,${reportData.activities.streak}\n\n`;
        
        // Goals section
        if (reportData.goals.total > 0) {
            csvContent += 'Goals by Category\n';
            csvContent += 'Category,Count\n';
            Object.entries(reportData.goals.byCategory).forEach(([category, goals]) => {
                csvContent += `${category},${goals.length}\n`;
            });
            csvContent += '\n';
        }
        
        // Resources section
        if (reportData.resources.total > 0) {
            csvContent += 'Resources by Type\n';
            csvContent += 'Type,Count\n';
            Object.entries(reportData.resources.byType).forEach(([type, resources]) => {
                csvContent += `${type},${resources.length}\n`;
            });
        }
        
        // Create and download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `learnflow-${type}-report-${period}-${Utils.formatDate(new Date())}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Export progress report (for the main export button)
    exportProgressReport() {
        this.generateReport('comprehensive', 'month', 'html');
    }

    // Format period for display
    formatPeriod(period) {
        const periods = {
            week: 'This Week',
            month: 'This Month',
            quarter: 'This Quarter',
            year: 'This Year',
            all: 'All Time'
        };
        return periods[period] || period;
    }

    // Export data in different formats
    exportData(format) {
        const data = this.dataManager.exportUserData();
        
        switch (format) {
            case 'json':
                Utils.exportJSON(data, `learnflow-data-${Utils.formatDate(new Date())}.json`);
                break;
            case 'csv':
                this.exportDataAsCSV(data);
                break;
            case 'pdf':
                window.showToast('PDF export requires a premium account', 'info');
                break;
        }
        
        window.showToast(`Data exported as ${format.toUpperCase()}!`, 'success');
    }

    // Export data as CSV
    exportDataAsCSV(data) {
        let csvContent = '';
        
        // Goals
        csvContent += 'Goals\n';
        csvContent += 'Title,Description,Category,Priority,Status,Progress,Target Date,Created At\n';
        data.goals.forEach(goal => {
            csvContent += `"${goal.title}","${goal.description || ''}","${goal.category}","${goal.priority}","${goal.isCompleted ? 'Completed' : 'Active'}","${goal.progress || 0}%","${goal.targetDate || ''}","${Utils.formatDate(goal.createdAt)}"\n`;
        });
        csvContent += '\n';
        
        // Resources
        csvContent += 'Resources\n';
        csvContent += 'Title,Description,Type,Category,URL,Created At\n';
        data.resources.forEach(resource => {
            csvContent += `"${resource.title}","${resource.description || ''}","${resource.resourceType}","${resource.category}","${resource.url || ''}","${Utils.formatDate(resource.createdAt)}"\n`;
        });
        
        // Create and download CSV
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `learnflow-complete-data-${Utils.formatDate(new Date())}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
}

// Export for global use
window.ReportsManager = ReportsManager;