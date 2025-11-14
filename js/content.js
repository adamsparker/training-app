// Content management
class ContentManager {
    constructor() {
        this.content = {};
        this.elementCounter = 1;
    }

    async loadContent() {
        const loadFromDefaults = (infoMessage = '') => {
            if (window.DEFAULT_CONTENT) {
                this.content = JSON.parse(JSON.stringify(window.DEFAULT_CONTENT));
                storage.saveContent(this.content);
                if (infoMessage) {
                    notifications.info(infoMessage);
                }
                return true;
            }
            return false;
        };

        try {
            // Try to load from localStorage first
            const savedContent = storage.loadContent();
            
            const hasValidSavedContent = savedContent 
                && typeof savedContent === 'object'
                && Object.keys(savedContent).length > 0;

            if (hasValidSavedContent) {
                this.content = savedContent;
                return this.content;
            }

            const isHttpProtocol = typeof window !== 'undefined'
                && window.location
                && window.location.protocol.startsWith('http');

            if (isHttpProtocol) {
                try {
                    const response = await fetch('content.json');
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    
                    const jsonContent = await response.json();
                    this.content = jsonContent;
                    
                    // Save to localStorage for future use
                    storage.saveContent(this.content);
                    
                    return this.content;
                } catch (fetchError) {
                    console.warn('Fetch content.json failed, trying defaults.', fetchError);
                    if (loadFromDefaults('Загружены данные по умолчанию, так как content.json недоступен.')) {
                        return this.content;
                    }
                    throw fetchError;
                }
            }

            if (loadFromDefaults('Загружены данные по умолчанию для локального режима.')) {
                return this.content;
            }

            throw new Error('Источник контента недоступен');
        } catch (error) {
            console.error('Ошибка загрузки контента:', error);
            notifications.error('Не удалось загрузить контент. Проверьте файл content.json');
            return null;
        }
    }

    renderStaticContent() {
        // Remove dynamic elements to avoid duplicates
        document.querySelectorAll('[data-key*="_dynamic_"]').forEach(el => el.remove());

        const elements = document.querySelectorAll('[data-key]');
        
        // Render static elements
        elements.forEach(el => {
            const key = el.getAttribute('data-key');
            if (key && this.content[key] !== undefined && typeof this.content[key] === 'string') {
                el.innerHTML = this.content[key];
            }
        });
        
        // Add data-key to existing guidelines/advice blocks for drag and drop
        document.querySelectorAll('.guidelines-block, .advice-block').forEach(block => {
            if (!block.hasAttribute('data-key')) {
                // Find first element with data-key inside block
                const firstKeyed = block.querySelector('[data-key]');
                if (firstKeyed) {
                    const key = firstKeyed.getAttribute('data-key');
                    // Use block's key based on first element's key
                    const blockKey = key.replace(/_p\d+$|_title$/, '_block');
                    block.setAttribute('data-key', blockKey);
                }
            }
        });
        
        // Add dynamically created blocks
        for (const key in this.content) {
            if (key.includes('_dynamic_') && typeof this.content[key] === 'string') {
                const parts = key.split('_');
                const pageId = parts[0];
                const type = parts[parts.length - 1];
                
                if (type !== 'p' && type !== 'h3') continue;

                const page = document.getElementById(pageId);
                if (page) {
                    // Check if this should be wrapped in a block
                    let newElement = document.createElement(type);
                    newElement.setAttribute('data-key', key);
                    newElement.innerHTML = this.content[key];
                    
                    // Wrap in block for guidelines/advice if needed
                    if ((pageId === 'guidelines' || pageId === 'advice') && !key.includes('_block')) {
                        const wrapper = document.createElement('div');
                        wrapper.className = pageId === 'guidelines' ? 'guidelines-block' : 'advice-block';
                        wrapper.setAttribute('data-key', key.replace(/_p$|_h3$/, '_block'));
                        wrapper.appendChild(newElement);
                        newElement = wrapper;
                    }
                    
                    const editButtonsDiv = document.getElementById(`${pageId}-edit-buttons`);
                    if (editButtonsDiv) {
                        page.insertBefore(newElement, editButtonsDiv);
                    } else {
                        page.appendChild(newElement);
                    }
                }
            }
        }
    }

    saveContent() {
        const editableElements = document.querySelectorAll('[data-key]');
        const keysToRemove = [];

        editableElements.forEach(el => {
            const key = el.getAttribute('data-key');
            if (!document.body.contains(el)) {
                keysToRemove.push(key);
                return;
            }
            
            // Skip blocks - they don't have direct content
            if (el.classList.contains('guidelines-block') || el.classList.contains('advice-block')) {
                // Save content of elements inside the block
                const innerElements = el.querySelectorAll('[data-key]');
                innerElements.forEach(innerEl => {
                    const innerKey = innerEl.getAttribute('data-key');
                    if (innerKey) {
                        // Remove buttons before saving
                        const deleteButton = innerEl.querySelector('.btn-delete-element, .btn-delete-item');
                        if (deleteButton) {
                            const content = innerEl.innerHTML;
                            innerEl.removeChild(deleteButton);
                            this.content[innerKey] = innerEl.innerHTML;
                            // Restore button if needed
                            const editModeToggle = document.getElementById('edit-mode-toggle');
                            if (editModeToggle && editModeToggle.classList.contains('active') && deleteButton) {
                                innerEl.appendChild(deleteButton);
                            }
                        } else {
                            this.content[innerKey] = innerEl.innerHTML;
                        }
                    }
                });
                return;
            }
            
            // Remove delete button from innerHTML before saving
            const deleteButton = el.querySelector('.btn-delete-element, .btn-delete-item');
            if (deleteButton) {
                el.removeChild(deleteButton);
            }

            if (key) {
                this.content[key] = el.innerHTML;
            }

            // Restore button if edit mode is active
            const editModeToggle = document.getElementById('edit-mode-toggle');
            if (editModeToggle && editModeToggle.classList.contains('active') && deleteButton) {
                el.appendChild(deleteButton);
            }
        });
        
        keysToRemove.forEach(key => {
            if (this.content.hasOwnProperty(key)) {
                delete this.content[key];
            }
        });

        // Save workout data
        this.saveWorkoutData();

        // Persist to storage
        const success = storage.saveContent(this.content);
        return success;
    }

    saveWorkoutData() {
        const workoutDayElements = document.querySelectorAll('.workout-day');
        
        if (workoutDayElements.length > 0) {
            const workoutData = { days: [] };

            workoutDayElements.forEach(dayDiv => {
                const dayHeader = dayDiv.querySelector('h3');
                const dayName = dayHeader ? dayHeader.textContent.trim() : '';
                
                // Skip empty days
                if (!dayName) return;
                
                const dayData = { name_ru: dayName, exercises: [] };
                
                dayDiv.querySelectorAll('.workout-table tbody tr').forEach(row => {
                    // Skip rows that are being dragged or are placeholders
                    if (row.classList.contains('dragging') || row.classList.contains('drag-placeholder')) {
                        return;
                    }
                    
                    const cells = row.querySelectorAll('td:not(.checkbox-cell)');
                    if (cells.length >= 3) {
                        const exercise = {
                            name: cells[0].textContent.trim(),
                            sets: cells[1].textContent.trim(),
                            reps: cells[2].textContent.trim(),
                        };
                        
                        // Validate exercise data
                        const validation = Utils.validateWorkoutData(exercise);
                        if (validation.valid) {
                            dayData.exercises.push(exercise);
                        }
                    }
                });
                
                // Always save day, even if empty (user might add exercises later)
                workoutData.days.push(dayData);
            });

            this.content.workout_data = workoutData;
        }
    }

    getContent() {
        return this.content;
    }

    setContent(content) {
        this.content = content;
    }
}

// Global instance
const contentManager = new ContentManager();




