// Utility functions
class Utils {
    static generateUniqueId(prefix) {
        return `${prefix}_dynamic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

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

    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    static validateWorkoutData(exercise) {
        if (!exercise.name || exercise.name.trim() === '') {
            return { valid: false, error: 'Название упражнения не может быть пустым' };
        }
        if (!exercise.sets || exercise.sets.trim() === '') {
            return { valid: false, error: 'Количество подходов не может быть пустым' };
        }
        if (!exercise.reps || exercise.reps.trim() === '') {
            return { valid: false, error: 'Количество повторений не может быть пустым' };
        }
        return { valid: true };
    }

    static formatDate(date) {
        return new Intl.DateTimeFormat('ru-RU', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }).format(date);
    }

    static isLocalStorageAvailable() {
        try {
            const test = '__localStorage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            return false;
        }
    }
}




