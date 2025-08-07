// Utility Functions
class Utils {
    // Generate unique ID
    static generateId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // Format date
    static formatDate(date, options = {}) {
        if (!date) return '';
        if (typeof date === 'string') date = new Date(date);
        
        const defaultOptions = {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        };
        
        return date.toLocaleDateString('en-US', { ...defaultOptions, ...options });
    }

    // Format relative time
    static formatRelativeTime(date) {
        if (!date) return '';
        if (typeof date === 'string') date = new Date(date);
        
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMinutes = Math.floor(diffMs / (1000 * 60));

        if (diffMinutes < 1) return 'Just now';
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
        return `${Math.floor(diffDays / 365)}y ago`;
    }

    // Debounce function
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle function
    static throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Sanitize HTML
    static sanitizeHTML(str) {
        const temp = document.createElement('div');
        temp.textContent = str;
        return temp.innerHTML;
    }

    // Calculate progress percentage
    static calculateProgress(completed, total) {
        if (total === 0) return 0;
        return Math.round((completed / total) * 100);
    }

    // Get priority color
    static getPriorityColor(priority) {
        const colors = {
            low: 'var(--neutral-500)',
            medium: 'var(--primary-500)',
            high: 'var(--accent-500)'
        };
        return colors[priority] || colors.medium;
    }

    // Get category icon
    static getCategoryIcon(category) {
        const icons = {
            programming: 'fas fa-code',
            design: 'fas fa-palette',
            business: 'fas fa-briefcase',
            languages: 'fas fa-language',
            science: 'fas fa-flask',
            article: 'fas fa-newspaper',
            video: 'fas fa-video',
            book: 'fas fa-book',
            course: 'fas fa-graduation-cap',
            tool: 'fas fa-tools',
            reference: 'fas fa-bookmark',
            note: 'fas fa-sticky-note',
            other: 'fas fa-folder'
        };
        return icons[category] || icons.other;
    }

    // Validate email
    static isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    // Validate URL
    static isValidURL(string) {
        try {
            new URL(string);
            return true;
        } catch (_) {
            return false;
        }
    }

    // Check if date is overdue
    static isOverdue(date) {
        if (!date) return false;
        if (typeof date === 'string') date = new Date(date);
        return date < new Date();
    }

    // Check if date is upcoming (within 7 days)
    static isUpcoming(date) {
        if (!date) return false;
        if (typeof date === 'string') date = new Date(date);
        const now = new Date();
        const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
        return diffDays >= 0 && diffDays <= 7;
    }

    // Format duration
    static formatDuration(minutes) {
        if (minutes < 60) return `${minutes}m`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    }

    // Calculate streak
    static calculateStreak(activities) {
        if (!activities || activities.length === 0) return 0;
        
        const sortedDates = activities
            .map(a => new Date(a.date).toDateString())
            .filter((date, index, array) => array.indexOf(date) === index)
            .sort((a, b) => new Date(b) - new Date(a));

        let streak = 0;
        let currentDate = new Date();
        
        for (let i = 0; i < sortedDates.length; i++) {
            const activityDate = new Date(sortedDates[i]);
            const diffDays = Math.floor((currentDate - activityDate) / (1000 * 60 * 60 * 24));
            
            if (diffDays === streak) {
                streak++;
                currentDate = activityDate;
            } else if (diffDays === streak + 1) {
                streak++;
                currentDate = activityDate;
            } else {
                break;
            }
        }
        
        return streak;
    }

    // Export data as JSON
    static exportJSON(data, filename) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    // Copy to clipboard
    static async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                return true;
            } catch (err) {
                return false;
            } finally {
                document.body.removeChild(textArea);
            }
        }
    }

    // Generate color palette
    static generateColorPalette(baseColor, count = 5) {
        const colors = [];
        const hsl = this.hexToHsl(baseColor);
        
        for (let i = 0; i < count; i++) {
            const lightness = 80 - (i * 15); // Varying lightness
            colors.push(this.hslToHex(hsl.h, hsl.s, lightness));
        }
        
        return colors;
    }

    // Convert hex to HSL
    static hexToHsl(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        let r = parseInt(result[1], 16) / 255;
        let g = parseInt(result[2], 16) / 255;
        let b = parseInt(result[3], 16) / 255;

        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return { h: h * 360, s: s * 100, l: l * 100 };
    }

    // Convert HSL to hex
    static hslToHex(h, s, l) {
        h /= 360;
        s /= 100;
        l /= 100;
        
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };

        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }

        const toHex = c => {
            const hex = Math.round(c * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };

        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    }

    // Local storage helpers
    static setItem(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (err) {
            console.error('Error saving to localStorage:', err);
            return false;
        }
    }

    static getItem(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (err) {
            console.error('Error reading from localStorage:', err);
            return defaultValue;
        }
    }

    static removeItem(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (err) {
            console.error('Error removing from localStorage:', err);
            return false;
        }
    }

    // Password strength checker
    static checkPasswordStrength(password) {
        let score = 0;
        let feedback = [];

        // Length check
        if (password.length >= 8) score += 1;
        else feedback.push('At least 8 characters');

        // Uppercase check
        if (/[A-Z]/.test(password)) score += 1;
        else feedback.push('One uppercase letter');

        // Lowercase check
        if (/[a-z]/.test(password)) score += 1;
        else feedback.push('One lowercase letter');

        // Number check
        if (/\d/.test(password)) score += 1;
        else feedback.push('One number');

        // Special character check
        if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 1;
        else feedback.push('One special character');

        let strength = 'weak';
        if (score >= 4) strength = 'strong';
        else if (score >= 3) strength = 'medium';

        return { score, strength, feedback };
    }

    // File size formatter
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Search function
    static search(items, query, fields) {
        if (!query) return items;
        
        const lowerQuery = query.toLowerCase();
        return items.filter(item => {
            return fields.some(field => {
                const value = this.getNestedValue(item, field);
                return value && value.toString().toLowerCase().includes(lowerQuery);
            });
        });
    }

    // Get nested object value
    static getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current && current[key], obj);
    }

    // Sort array of objects
    static sortBy(array, field, direction = 'asc') {
        return array.sort((a, b) => {
            const aVal = this.getNestedValue(a, field);
            const bVal = this.getNestedValue(b, field);
            
            if (aVal < bVal) return direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    // Group array by field
    static groupBy(array, field) {
        return array.reduce((groups, item) => {
            const value = this.getNestedValue(item, field);
            if (!groups[value]) groups[value] = [];
            groups[value].push(item);
            return groups;
        }, {});
    }

    // Generate report data
    static generateReportData(goals, resources, activities) {
        const totalGoals = goals.length;
        const completedGoals = goals.filter(g => g.isCompleted).length;
        const activeGoals = totalGoals - completedGoals;
        const completionRate = Utils.calculateProgress(completedGoals, totalGoals);
        
        const totalResources = resources.length;
        const resourcesByCategory = Utils.groupBy(resources, 'category');
        
        const streak = Utils.calculateStreak(activities);
        const thisMonth = activities.filter(a => {
            const date = new Date(a.date);
            const now = new Date();
            return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
        }).length;
        
        return {
            summary: {
                totalGoals,
                completedGoals,
                activeGoals,
                completionRate,
                totalResources,
                currentStreak: streak,
                activitiesThisMonth: thisMonth
            },
            goals: {
                byCategory: Utils.groupBy(goals, 'category'),
                byPriority: Utils.groupBy(goals, 'priority'),
                byStatus: {
                    active: goals.filter(g => !g.isCompleted && !Utils.isOverdue(g.targetDate)),
                    completed: goals.filter(g => g.isCompleted),
                    overdue: goals.filter(g => !g.isCompleted && Utils.isOverdue(g.targetDate))
                }
            },
            resources: {
                byCategory: resourcesByCategory,
                byType: Utils.groupBy(resources, 'resourceType')
            },
            activities: {
                recent: activities.slice(0, 10),
                byMonth: Utils.groupBy(activities, a => new Date(a.date).getMonth()),
                streak
            }
        };
    }
}

// Animation utilities
class AnimationUtils {
    static fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        let start = null;
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const opacity = Math.min(progress / duration, 1);
            
            element.style.opacity = opacity;
            
            if (progress < duration) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    static fadeOut(element, duration = 300) {
        let start = null;
        const initialOpacity = parseFloat(getComputedStyle(element).opacity);
        
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const opacity = Math.max(initialOpacity - (progress / duration), 0);
            
            element.style.opacity = opacity;
            
            if (progress < duration) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
            }
        };
        
        requestAnimationFrame(animate);
    }

    static slideUp(element, duration = 300) {
        const height = element.offsetHeight;
        element.style.height = height + 'px';
        element.style.overflow = 'hidden';
        
        let start = null;
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const newHeight = Math.max(height - (height * progress / duration), 0);
            
            element.style.height = newHeight + 'px';
            
            if (progress < duration) {
                requestAnimationFrame(animate);
            } else {
                element.style.display = 'none';
                element.style.height = '';
                element.style.overflow = '';
            }
        };
        
        requestAnimationFrame(animate);
    }

    static slideDown(element, duration = 300) {
        element.style.display = 'block';
        const height = element.scrollHeight;
        element.style.height = '0px';
        element.style.overflow = 'hidden';
        
        let start = null;
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = timestamp - start;
            const newHeight = Math.min(height * progress / duration, height);
            
            element.style.height = newHeight + 'px';
            
            if (progress < duration) {
                requestAnimationFrame(animate);
            } else {
                element.style.height = '';
                element.style.overflow = '';
            }
        };
        
        requestAnimationFrame(animate);
    }

    static pulse(element, duration = 1000) {
        let start = null;
        const animate = (timestamp) => {
            if (!start) start = timestamp;
            const progress = (timestamp - start) % duration;
            const scale = 1 + 0.05 * Math.sin(2 * Math.PI * progress / duration);
            
            element.style.transform = `scale(${scale})`;
            
            requestAnimationFrame(animate);
        };
        
        requestAnimationFrame(animate);
        
        // Stop animation after 3 cycles
        setTimeout(() => {
            element.style.transform = '';
        }, duration * 3);
    }

    static bounce(element) {
        element.style.animation = 'bounce 0.5s';
        setTimeout(() => {
            element.style.animation = '';
        }, 500);
    }

    static shake(element) {
        element.style.animation = 'shake 0.5s';
        setTimeout(() => {
            element.style.animation = '';
        }, 500);
    }
}

// Export for use in other modules
window.Utils = Utils;
window.AnimationUtils = AnimationUtils;