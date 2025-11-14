// Storage management with error handling
class StorageManager {
    constructor() {
        this.CONTENT_KEY = 'siteContent';
        this.CHECKBOX_PREFIX = 'checkbox_';
        this.STATS_KEY = 'workout_stats';
    }

    saveContent(content) {
        try {
            if (!Utils.isLocalStorageAvailable()) {
                throw new Error('LocalStorage недоступен');
            }
            localStorage.setItem(this.CONTENT_KEY, JSON.stringify(content));
            return true;
        } catch (error) {
            console.error('Ошибка сохранения контента:', error);
            notifications.error('Не удалось сохранить данные. Проверьте настройки браузера.');
            return false;
        }
    }

    loadContent() {
        try {
            if (!Utils.isLocalStorageAvailable()) {
                return null;
            }
            const saved = localStorage.getItem(this.CONTENT_KEY);
            return saved ? JSON.parse(saved) : null;
        } catch (error) {
            console.error('Ошибка загрузки контента:', error);
            notifications.error('Не удалось загрузить сохраненные данные.');
            return null;
        }
    }

    saveCheckboxState(checkboxId, checked) {
        try {
            if (!Utils.isLocalStorageAvailable()) return false;
            localStorage.setItem(`${this.CHECKBOX_PREFIX}${checkboxId}`, checked.toString());
            return true;
        } catch (error) {
            console.error('Ошибка сохранения состояния чекбокса:', error);
            return false;
        }
    }

    loadCheckboxState(checkboxId) {
        try {
            if (!Utils.isLocalStorageAvailable()) return false;
            return localStorage.getItem(`${this.CHECKBOX_PREFIX}${checkboxId}`) === 'true';
        } catch (error) {
            return false;
        }
    }

    clearAllCheckboxes() {
        try {
            if (!Utils.isLocalStorageAvailable()) return false;
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.CHECKBOX_PREFIX)) {
                    localStorage.removeItem(key);
                }
            });
            return true;
        } catch (error) {
            console.error('Ошибка очистки чекбоксов:', error);
            return false;
        }
    }

    exportData() {
        try {
            const content = this.loadContent();
            const checkboxes = {};
            const keys = Object.keys(localStorage);
            
            keys.forEach(key => {
                if (key.startsWith(this.CHECKBOX_PREFIX)) {
                    const id = key.replace(this.CHECKBOX_PREFIX, '');
                    checkboxes[id] = localStorage.getItem(key) === 'true';
                }
            });

            return {
                content,
                checkboxes,
                exportDate: new Date().toISOString(),
                version: '1.0'
            };
        } catch (error) {
            console.error('Ошибка экспорта данных:', error);
            notifications.error('Не удалось экспортировать данные.');
            return null;
        }
    }

    importData(data) {
        try {
            if (!data || !data.content) {
                throw new Error('Неверный формат данных');
            }

            // Validate data structure
            if (typeof data.content !== 'object') {
                throw new Error('Неверная структура данных');
            }

            // Save content
            this.saveContent(data.content);

            // Restore checkboxes if available
            if (data.checkboxes) {
                Object.keys(data.checkboxes).forEach(id => {
                    localStorage.setItem(
                        `${this.CHECKBOX_PREFIX}${id}`,
                        data.checkboxes[id].toString()
                    );
                });
            }

            notifications.success('Данные успешно импортированы');
            return true;
        } catch (error) {
            console.error('Ошибка импорта данных:', error);
            notifications.error('Не удалось импортировать данные. Проверьте формат файла.');
            return false;
        }
    }

    getStats() {
        try {
            const stats = localStorage.getItem(this.STATS_KEY);
            return stats ? JSON.parse(stats) : { totalWorkouts: 0, lastReset: null };
        } catch (error) {
            return { totalWorkouts: 0, lastReset: null };
        }
    }

    updateStats(reset = false) {
        try {
            const stats = this.getStats();
            if (reset) {
                stats.totalWorkouts++;
                stats.lastReset = new Date().toISOString();
            }
            localStorage.setItem(this.STATS_KEY, JSON.stringify(stats));
            return stats;
        } catch (error) {
            console.error('Ошибка обновления статистики:', error);
            return null;
        }
    }
}

// Global instance
const storage = new StorageManager();




