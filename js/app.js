// Main application entry point
document.addEventListener('DOMContentLoaded', async () => {
    // Show loading state
    const loadingIndicator = document.createElement('div');
    loadingIndicator.className = 'loading-indicator';
    loadingIndicator.innerHTML = '<div class="spinner"></div><p>Загрузка...</p>';
    document.body.appendChild(loadingIndicator);

    try {
        // Load content
        const loadedContent = await contentManager.loadContent();
        const content = loadedContent || (window.DEFAULT_CONTENT ? JSON.parse(JSON.stringify(window.DEFAULT_CONTENT)) : null);
        
        if (content) {
            contentManager.setContent(content);
            // Render static content
            contentManager.renderStaticContent();
            
            // Render main workout program (Протокол Горца)
            if (content.workout_data) {
                workoutManager.renderWorkoutProgram(content);
            }

            // Render additional programs from content.json
            if (content.heavy_duty_workout_data) {
                workoutManager.renderAdditionalProgram(
                    content.heavy_duty_workout_data,
                    'heavy-duty-schedule',
                    content.heavy_duty_title || 'Heavy Duty Майка Менцера'
                );
            }
            if (content.endurance_workout_data) {
                workoutManager.renderAdditionalProgram(
                    content.endurance_workout_data,
                    'endurance-schedule',
                    content.endurance_title || 'Endurance Training Дэвида Гоггинса'
                );
            }
            if (content.vtaper_workout_data) {
                workoutManager.renderAdditionalProgram(
                    content.vtaper_workout_data,
                    'vtaper-schedule',
                    content.vtaper_title || 'V-taper тренировка'
                );
            }
        }

        // Setup event listeners
        setupEventListeners();
        
        // Setup export/import
        setupExportImport();

        // Remove loading indicator
        loadingIndicator.remove();
        
        notifications.info('Приложение загружено');
    } catch (error) {
        console.error('Ошибка инициализации:', error);
        notifications.error('Ошибка загрузки приложения');
        loadingIndicator.remove();
    }
});

function setupEventListeners() {
    // Reset button
    const resetButton = document.getElementById('reset-btn');
    if (resetButton) {
        resetButton.addEventListener('click', () => {
            if (confirm('Вы уверены, что хотите сбросить прогресс тренировки?')) {
                workoutManager.resetProgress();
            }
        });
    }

    // Program cards navigation from "Программы тренировок" к конкретным программам
    const programCards = document.querySelectorAll('.program-card');
    if (programCards.length && window.navigation) {
        const programPageById = {
            gorca: 'program-gorca',
            'heavy-duty': 'program-heavy-duty',
            endurance: 'program-endurance',
            vtaper: 'program-vtaper'
        };

        programCards.forEach(card => {
            card.addEventListener('click', () => {
                const programId = card.getAttribute('data-program-id');
                const pageId = programPageById[programId];
                if (pageId) {
                    navigation.navigateTo(pageId);
                }
            });
        });
    }

    // Auto-save on content edit (debounced)
    const debouncedSave = Utils.debounce(() => {
        if (editMode.isContentEditing || editMode.isProgramEditing) {
            contentManager.saveContent();
        }
    }, 1000);

    document.addEventListener('input', (e) => {
        if (e.target.hasAttribute('contenteditable') && e.target.getAttribute('contenteditable') === 'true') {
            debouncedSave();
        }
    });

    // Handle page visibility changes (save when tab becomes hidden)
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            contentManager.saveContent();
        }
    });

    // Save before page unload
    window.addEventListener('beforeunload', () => {
        contentManager.saveContent();
    });
}

function setupExportImport() {
    // Export button
    const downloadBtn = document.getElementById('btn-download-json');
    if (downloadBtn) {
        downloadBtn.addEventListener('click', () => {
            const data = storage.exportData();
            if (data) {
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `workout-backup-${Utils.formatDate(new Date())}.json`;
                a.click();
                URL.revokeObjectURL(url);
                notifications.success('Данные экспортированы');
            }
        });
    }

    // Import functionality
    const importBtn = document.createElement('button');
    importBtn.className = 'btn-add-block';
    importBtn.textContent = 'Импортировать данные';
    importBtn.style.backgroundColor = '#1976d2';
    importBtn.setAttribute('aria-label', 'Импортировать данные из файла');
    
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    fileInput.setAttribute('aria-label', 'Выберите файл для импорта');
    
    importBtn.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);
                if (storage.importData(data)) {
                    // Reload content
                    contentManager.loadContent().then(() => {
                        const content = contentManager.getContent();
                        contentManager.renderStaticContent();

                        if (content && content.workout_data) {
                            workoutManager.renderWorkoutProgram(content);
                        }

                        if (content && content.heavy_duty_workout_data) {
                            workoutManager.renderAdditionalProgram(
                                content.heavy_duty_workout_data,
                                'heavy-duty-schedule',
                                content.heavy_duty_title || 'Heavy Duty Майка Менцера'
                            );
                        }
                        if (content && content.endurance_workout_data) {
                            workoutManager.renderAdditionalProgram(
                                content.endurance_workout_data,
                                'endurance-schedule',
                                content.endurance_title || 'Endurance Training Дэвида Гоггинса'
                            );
                        }
                        if (content && content.vtaper_workout_data) {
                            workoutManager.renderAdditionalProgram(
                                content.vtaper_workout_data,
                                'vtaper-schedule',
                                content.vtaper_title || 'V-taper тренировка'
                            );
                        }
                    });
                }
            } catch (error) {
                notifications.error('Ошибка чтения файла');
            }
        };
        reader.readAsText(file);
        fileInput.value = '';
    });

    // Add import button to start page
    const startEditButtons = document.getElementById('start-edit-buttons');
    if (startEditButtons) {
        startEditButtons.appendChild(importBtn);
        document.body.appendChild(fileInput);
    }
}

// Make functions globally available for onclick handlers
window.downloadContent = function() {
    const data = storage.exportData();
    if (data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `content-${Utils.formatDate(new Date())}.json`;
        a.click();
        URL.revokeObjectURL(url);
        notifications.success('Контент экспортирован');
    }
};




