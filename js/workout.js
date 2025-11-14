// Workout program management
class WorkoutManager {
    constructor() {
        this.scheduleContainer = document.getElementById('workout-schedule');
        this.checkboxIndex = 1;
    }

    renderWorkoutProgram(content) {
        if (!content.workout_data || !this.scheduleContainer) return;

        let html = '';
        this.checkboxIndex = 1;

        content.workout_data.days.forEach((day) => {
            const safeName = Utils.escapeHtml(day.name_ru);
            const deleteDayBtn = `
                <button class="btn-delete-row btn-delete-day" style="float:right; margin-top: -5px;" 
                        data-day-name="${safeName}"
                        onclick="workoutManager.deleteWorkoutDay(this.getAttribute('data-day-name'))"
                        aria-label="Удалить день ${safeName}">
                    Удалить день
                </button>
            `;

            const programEditToggle = document.getElementById('toggle-program-edit');
            const isEditing = programEditToggle && 
                            programEditToggle.textContent !== 'Редактировать программу';

            html += `
                <div class="workout-day" data-day="${Utils.escapeHtml(day.name_ru)}">
                    <h3>${Utils.escapeHtml(day.name_ru)}</h3>
                    ${isEditing ? deleteDayBtn : ''}
                    <div class="program-content">
                        <table class="workout-table" data-day="${Utils.escapeHtml(day.name_ru)}" 
                               role="table" aria-label="Программа тренировок для ${Utils.escapeHtml(day.name_ru)}">
                            <thead>
                                <tr>
                                    <th scope="col">Упражнение</th>
                                    <th scope="col">Подходы</th>
                                    <th scope="col">Повторения</th>
                                    <th scope="col">Выполнено</th>
                                </tr>
                            </thead>
                            <tbody>
            `;

            day.exercises.forEach((ex) => {
                const id = `ex${this.checkboxIndex++}`;
                html += `
                    <tr>
                        <td data-label="Упражнение">${Utils.escapeHtml(ex.name)}</td>
                        <td data-label="Подходы">${Utils.escapeHtml(ex.sets)}</td>
                        <td data-label="Повторения">${Utils.escapeHtml(ex.reps)}</td>
                        <td data-label="Выполнено" class="checkbox-cell">
                            <input type="checkbox" id="${id}" 
                                   aria-label="Отметить упражнение ${Utils.escapeHtml(ex.name)} как выполненное">
                        </td>
                    </tr>
                `;
            });

            html += `
                            </tbody>
                        </table>
                    </div>
                </div>
            `;
        });

        this.scheduleContainer.innerHTML = html;
        
        // Load checkbox states
        this.loadCheckboxStates();
        this.attachCheckboxListeners();
    }

    loadCheckboxStates() {
        document.querySelectorAll('.workout-table input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = storage.loadCheckboxState(checkbox.id);
        });
    }

    attachCheckboxListeners() {
        document.querySelectorAll('.workout-table input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                storage.saveCheckboxState(checkbox.id, checkbox.checked);
                this.updateProgress();
            });
        });
    }

    updateProgress() {
        const checkboxes = document.querySelectorAll('.workout-table input[type="checkbox"]');
        const checked = Array.from(checkboxes).filter(cb => cb.checked).length;
        const total = checkboxes.length;
        
        if (total > 0) {
            const percentage = Math.round((checked / total) * 100);
            // Could update a progress indicator here
        }
    }

    resetProgress() {
        const checkboxes = document.querySelectorAll('.workout-table input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            storage.saveCheckboxState(checkbox.id, false);
        });
        storage.updateStats(true);
        notifications.success('Прогресс тренировки сброшен');
    }

    addExercise(dayName) {
        const content = contentManager.getContent();
        if (!content.workout_data) return;

        const dayData = content.workout_data.days.find(d => d.name_ru === dayName);
        if (!dayData) {
            notifications.error('День не найден');
            return;
        }

        const newExercise = {
            name: "[НОВОЕ] Упражнение",
            sets: "3",
            reps: "8-12"
        };
        
        dayData.exercises.push(newExercise);
        contentManager.setContent(content);
        this.renderWorkoutProgram(content);
        contentManager.saveContent();
        editMode.enableProgramEditMode();
        notifications.info('Упражнение добавлено');
    }

    deleteExerciseRow(rowElement) {
        rowElement.remove();
        contentManager.saveContent();
        const programEditToggle = document.getElementById('toggle-program-edit');
        if (programEditToggle && programEditToggle.textContent !== 'Редактировать программу') {
            this.renderWorkoutProgram(contentManager.getContent());
            editMode.enableProgramEditMode();
        }
        notifications.info('Упражнение удалено');
    }

    addWorkoutDay() {
        const content = contentManager.getContent();
        if (!content.workout_data) {
            content.workout_data = { days: [] };
        }

        // Create a simple text input modal
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'day-name-title');
        
        const modalContent = document.createElement('div');
        modalContent.className = 'modal';
        
        modalContent.innerHTML = `
            <h3 id="day-name-title">Введите название нового дня</h3>
            <input type="text" id="day-name-input" class="modal-input" 
                   placeholder="Например: Суббота" autocomplete="off" aria-label="Название дня">
            <div class="modal-buttons">
                <button class="btn-modal btn-primary" id="day-name-submit">Добавить</button>
                <button class="btn-modal btn-secondary" id="day-name-cancel">Отмена</button>
            </div>
        `;
        
        modal.appendChild(modalContent);
        document.body.appendChild(modal);
        
        const input = modal.querySelector('#day-name-input');
        const submitBtn = modal.querySelector('#day-name-submit');
        const cancelBtn = modal.querySelector('#day-name-cancel');
        
        const handleSubmit = () => {
            const dayName = input.value.trim();
            modal.remove();
            
            if (!dayName) {
                notifications.warning('Название дня не может быть пустым');
                return;
            }
            
            const newDay = {
                name_ru: dayName,
                exercises: []
            };
            
            content.workout_data.days.push(newDay);
            contentManager.setContent(content);
            this.renderWorkoutProgram(content);
            contentManager.saveContent();
            editMode.enableProgramEditMode();
            notifications.success(`День "${dayName}" добавлен`);
        };
        
        const handleCancel = () => {
            modal.remove();
        };
        
        const handleKeyDown = (e) => {
            if (e.key === 'Enter') {
                handleSubmit();
            } else if (e.key === 'Escape') {
                handleCancel();
            }
        };
        
        submitBtn.addEventListener('click', handleSubmit);
        cancelBtn.addEventListener('click', handleCancel);
        input.addEventListener('keydown', handleKeyDown);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) handleCancel();
        });
        
        setTimeout(() => input.focus(), 100);
    }

    deleteWorkoutDay(dayName) {
        if (!confirm(`Вы уверены, что хотите удалить весь день "${dayName}" и все его упражнения?`)) {
            return;
        }

        const content = contentManager.getContent();
        if (!content.workout_data) return;

        content.workout_data.days = content.workout_data.days.filter(
            day => day.name_ru !== dayName
        );

        contentManager.setContent(content);
        this.renderWorkoutProgram(content);
        contentManager.saveContent();
        editMode.enableProgramEditMode();
        notifications.success(`День "${dayName}" удален`);
    }
}

// Global instance
const workoutManager = new WorkoutManager();

