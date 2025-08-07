// Calendar Manager
class CalendarManager {
    constructor(dataManager) {
        this.dataManager = dataManager;
        this.currentDate = new Date();
        this.selectedDate = null;
        this.initEventListeners();
    }

    initEventListeners() {
        const prevMonthBtn = document.getElementById('prev-month');
        const nextMonthBtn = document.getElementById('next-month');
        
        prevMonthBtn?.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.renderCalendar();
        });
        
        nextMonthBtn?.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.renderCalendar();
        });
        
        // Calendar day clicks
        document.addEventListener('click', (e) => {
            if (e.target.closest('.calendar-day')) {
                const day = e.target.closest('.calendar-day');
                if (!day.classList.contains('other-month')) {
                    this.selectDate(parseInt(day.textContent));
                }
            }
        });
    }

    // Render calendar
    renderCalendar() {
        this.updateCalendarHeader();
        this.renderCalendarGrid();
    }

    // Update calendar header
    updateCalendarHeader() {
        const headerElement = document.getElementById('calendar-month-year');
        if (!headerElement) return;
        
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        
        const month = monthNames[this.currentDate.getMonth()];
        const year = this.currentDate.getFullYear();
        
        headerElement.textContent = `${month} ${year}`;
    }

    // Render calendar grid
    renderCalendarGrid() {
        const calendarGrid = document.getElementById('calendar-grid');
        if (!calendarGrid) return;
        
        // Clear existing content
        calendarGrid.innerHTML = '';
        
        // Add day headers
        const dayHeaders = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const headerRow = document.createElement('div');
        headerRow.className = 'calendar-header-row';
        
        dayHeaders.forEach(dayName => {
            const headerDay = document.createElement('div');
            headerDay.className = 'calendar-header-day';
            headerDay.textContent = dayName;
            headerRow.appendChild(headerDay);
        });
        
        calendarGrid.appendChild(headerRow);
        
        // Get calendar data
        const firstDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), 1);
        const lastDay = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0);
        const startDate = new Date(firstDay);
        startDate.setDate(startDate.getDate() - firstDay.getDay());
        
        const activities = this.dataManager?.getActivities() || [];
        const today = new Date();
        
        // Generate calendar days
        for (let i = 0; i < 42; i++) { // 6 weeks
            const currentDay = new Date(startDate);
            currentDay.setDate(startDate.getDate() + i);
            
            const dayElement = document.createElement('div');
            dayElement.className = 'calendar-day';
            dayElement.textContent = currentDay.getDate();
            
            // Add classes
            if (currentDay.getMonth() !== this.currentDate.getMonth()) {
                dayElement.classList.add('other-month');
            }
            
            if (currentDay.toDateString() === today.toDateString()) {
                dayElement.classList.add('today');
            }
            
            if (this.selectedDate && currentDay.toDateString() === this.selectedDate.toDateString()) {
                dayElement.classList.add('selected');
            }
            
            // Check for activities on this day
            const dayActivities = activities.filter(activity => {
                const activityDate = new Date(activity.date);
                return activityDate.toDateString() === currentDay.toDateString();
            });
            
            if (dayActivities.length > 0) {
                dayElement.classList.add('has-activity');
                
                // Add tooltip
                const activityTypes = [...new Set(dayActivities.map(a => a.type))];
                const activityCount = dayActivities.length;
                dayElement.title = `${activityCount} ${activityCount === 1 ? 'activity' : 'activities'}: ${activityTypes.join(', ')}`;
            }
            
            calendarGrid.appendChild(dayElement);
        }
    }

    // Select date
    selectDate(day) {
        this.selectedDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day);
        this.renderCalendar();
        this.showDayDetails();
    }

    // Show day details
    showDayDetails() {
        if (!this.selectedDate) return;
        
        const activities = this.dataManager?.getActivities() || [];
        const dayActivities = activities.filter(activity => {
            const activityDate = new Date(activity.date);
            return activityDate.toDateString() === this.selectedDate.toDateString();
        });
        
        // Create day details modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-calendar-day"></i> ${Utils.formatDate(this.selectedDate, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h3>
                    <button class="modal-close">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body" style="padding: 1.5rem;">
                    ${dayActivities.length > 0 ? `
                        <h4 style="margin-bottom: 1rem; color: var(--neutral-700);">Activities (${dayActivities.length})</h4>
                        <div class="activity-list">
                            ${dayActivities.map(activity => `
                                <div class="activity-item">
                                    <div class="activity-icon ${activity.type}">
                                        <i class="${this.getActivityIcon(activity.type)}"></i>
                                    </div>
                                    <div class="activity-content">
                                        <div class="activity-text">${Utils.sanitizeHTML(activity.description || activity.title)}</div>
                                        <div class="activity-time">
                                            ${Utils.formatDate(new Date(activity.date), { hour: 'numeric', minute: '2-digit' })}
                                            ${activity.duration ? `• ${Utils.formatDuration(activity.duration)}` : ''}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    ` : `
                        <div class="empty-state-small">
                            <i class="fas fa-calendar-times" style="font-size: 2rem; color: var(--neutral-400); margin-bottom: 1rem;"></i>
                            <p>No activities on this day</p>
                        </div>
                    `}
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

    // Navigate to today
    goToToday() {
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.renderCalendar();
    }

    // Navigate to specific month
    goToMonth(year, month) {
        this.currentDate = new Date(year, month, 1);
        this.renderCalendar();
    }

    // Get calendar statistics
    getCalendarStats() {
        const activities = this.dataManager?.getActivities() || [];
        const currentMonth = this.currentDate.getMonth();
        const currentYear = this.currentDate.getFullYear();
        
        const monthActivities = activities.filter(activity => {
            const date = new Date(activity.date);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });
        
        const activeDays = new Set(
            monthActivities.map(activity => new Date(activity.date).getDate())
        ).size;
        
        const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
        
        return {
            totalActivities: monthActivities.length,
            activeDays,
            totalDays,
            activityRate: Math.round((activeDays / totalDays) * 100)
        };
    }

    // Export calendar data
    exportCalendarData() {
        const activities = this.dataManager?.getActivities() || [];
        const currentMonth = this.currentDate.getMonth();
        const currentYear = this.currentDate.getFullYear();
        
        const monthActivities = activities.filter(activity => {
            const date = new Date(activity.date);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
        });
        
        const calendarData = {
            month: currentMonth + 1,
            year: currentYear,
            activities: monthActivities.map(activity => ({
                date: activity.date,
                type: activity.type,
                title: activity.title,
                description: activity.description,
                duration: activity.duration
            })),
            stats: this.getCalendarStats()
        };
        
        const filename = `calendar-${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}.json`;
        Utils.exportJSON(calendarData, filename);
        
        return calendarData;
    }
}

// Export for global use
window.CalendarManager = CalendarManager;