// ============================================
// НОВАЯ СИСТЕМА РЕДАКТИРОВАНИЯ (ПЕРЕПИСАНА С НУЛЯ)
// ============================================

class EditModeManager {
    constructor() {
        this.editModeToggle = null;
        this.programEditToggle = null;
        this.isContentEditing = false;
        this.isProgramEditing = false;
        
        // Drag and drop state
        this.dragState = {
            isDragging: false,
            draggedElement: null,
            placeholder: null,
            ghost: null,
            dragOffset: { x: 0, y: 0 }
        };
        
        // Initialize when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    init() {
        this.editModeToggle = document.getElementById('edit-mode-toggle');
        this.programEditToggle = document.getElementById('toggle-program-edit');
        
        if (this.editModeToggle) {
            this.editModeToggle.addEventListener('click', () => this.toggleContentEditMode());
        }
        
        if (this.programEditToggle) {
            this.programEditToggle.addEventListener('click', () => this.toggleProgramEditMode());
        }
    }

    // ============================================
    // РЕДАКТИРОВАНИЕ КОНТЕНТА
    // ============================================

    async toggleContentEditMode() {
        if (!this.editModeToggle) {
            notifications.error('Кнопка редактирования не найдена');
            return;
        }

        const isEditing = this.editModeToggle.classList.contains('active');
        
        if (!isEditing) {
            const password = await security.promptPassword('Введите пароль для включения режима редактирования:');
            if (password && security.verifyPassword(password)) {
                this.enableContentEditMode();
            } else if (password !== null) {
                notifications.error('Неверный пароль');
            }
        } else {
            this.disableContentEditMode();
        }
    }

    enableContentEditMode() {
        if (!this.editModeToggle) return;

        this.editModeToggle.classList.add('active');
        this.editModeToggle.textContent = 'Выйти и сохранить';
        this.isContentEditing = true;
        document.body.classList.add('edit-mode-active');

        // Skip main titles
        const skipKeys = ['start_title', 'guidelines_title', 'program_title', 'advice_title', 'faq_title'];

        // Enable editing for all elements with data-key
        document.querySelectorAll('[data-key]').forEach(el => {
            const key = el.getAttribute('data-key');
            if (!key || skipKeys.includes(key)) return;
            
            // Skip if inside a block (blocks are handled separately)
            if (el.closest('.guidelines-block, .advice-block') && !el.classList.contains('guidelines-block') && !el.classList.contains('advice-block')) {
                return;
            }

            el.classList.add('editable-item');
            el.setAttribute('data-editable', 'true');
            el.contentEditable = true;
            
            this.addEditButton(el, key);
            this.addDeleteButton(el, key);
        });

        // Handle blocks (guidelines-block, advice-block)
        document.querySelectorAll('.guidelines-block, .advice-block').forEach(block => {
            // Add data-key if not present
            if (!block.hasAttribute('data-key')) {
                const firstKeyed = block.querySelector('[data-key]');
                if (firstKeyed) {
                    const key = firstKeyed.getAttribute('data-key');
                    const blockKey = key.replace(/_p\d+$|_title$/, '_block');
                    block.setAttribute('data-key', blockKey);
                }
            }
            
            block.classList.add('editable-item');
            block.setAttribute('data-editable', 'true');
            
            // Make inner elements editable
            block.querySelectorAll('[data-key]').forEach(innerEl => {
                innerEl.contentEditable = true;
                innerEl.classList.add('editable-item');
            });
            
            this.addEditButton(block, block.getAttribute('data-key'));
            this.addDeleteButton(block, block.getAttribute('data-key'));
        });

        // Show add block buttons
        this.setupAddBlockButtons();
        
        // Disable program edit mode if active
        if (this.isProgramEditing) {
            this.disableProgramEditMode(false);
        }

        notifications.success('Режим редактирования включен');
    }

    disableContentEditMode() {
        // Save content
        const success = contentManager.saveContent();
        
        this.editModeToggle.classList.remove('active');
        this.editModeToggle.textContent = 'Включить редактирование';
        this.isContentEditing = false;
        document.body.classList.remove('edit-mode-active');

        // Disable contentEditable
        document.querySelectorAll('[contenteditable="true"]').forEach(el => {
            el.contentEditable = false;
        });

        // Clean up
        this.cleanUp();
        contentManager.renderStaticContent();
        
        if (success) {
            notifications.success('Изменения сохранены');
        }
    }

    // ============================================
    // РЕДАКТИРОВАНИЕ ПРОГРАММЫ ТРЕНИРОВОК
    // ============================================

    async toggleProgramEditMode() {
        if (!this.programEditToggle) return;

        const isEditing = this.programEditToggle.textContent !== 'Редактировать программу';
        
        if (!isEditing) {
            const password = await security.promptPassword('Введите пароль для редактирования программы:');
            if (password && security.verifyPassword(password)) {
                this.enableProgramEditMode();
            } else if (password !== null) {
                notifications.error('Неверный пароль');
            }
        } else {
            this.disableProgramEditMode(true);
        }
    }

    enableProgramEditMode() {
        if (!this.programEditToggle) return;

        this.programEditToggle.textContent = 'Завершить редактирование программы и сохранить';
        this.programEditToggle.classList.add('active');
        this.isProgramEditing = true;
        document.body.classList.add('program-edit-active');

        // Make day titles editable
        document.querySelectorAll('.workout-day h3').forEach(h3 => {
            h3.classList.add('editable-item');
            h3.setAttribute('data-editable', 'true');
            h3.contentEditable = true;
            
            // Update delete button when day name changes
            h3.addEventListener('input', () => {
                const dayDiv = h3.closest('.workout-day');
                const deleteBtn = dayDiv?.querySelector('.btn-delete-day');
                if (deleteBtn) {
                    deleteBtn.setAttribute('data-day-name', h3.textContent.trim());
                }
            });
        });

        // Make table cells editable
        document.querySelectorAll('.workout-table td:not(.checkbox-cell)').forEach(cell => {
            cell.classList.add('editable-item');
            cell.setAttribute('data-editable', 'true');
            cell.contentEditable = true;
        });

        // Add "Add Day" button
        this.addAddDayButton();
        
        // Add "Add Exercise" buttons for each day
        document.querySelectorAll('.workout-day').forEach(dayDiv => {
            this.addAddExerciseButton(dayDiv);
        });

        // Add "Delete Exercise" buttons
        document.querySelectorAll('.workout-table tbody tr').forEach(row => {
            this.addDeleteExerciseButton(row);
        });

        notifications.success('Режим редактирования программы включен');
    }

    disableProgramEditMode(showAlert = true) {
        // Save content
        contentManager.saveContent();
        
        this.programEditToggle.textContent = 'Редактировать программу';
        this.programEditToggle.classList.remove('active');
        this.isProgramEditing = false;
        document.body.classList.remove('program-edit-active');
        
        // Disable contentEditable
        document.querySelectorAll('.workout-day h3[contenteditable="true"], .workout-table td[contenteditable="true"]').forEach(el => {
            el.contentEditable = false;
        });

        // Remove edit buttons
        document.querySelectorAll('.btn-add-day-modern, .btn-add-row-modern, .btn-delete-row-modern').forEach(btn => {
            btn.classList.remove('visible');
        });

        // Clean up
        this.cleanUp();
        
        // Re-render workout program
        workoutManager.renderWorkoutProgram(contentManager.getContent());
        
        if (showAlert) {
            notifications.success('Программа тренировок сохранена');
        }
    }

    addAddDayButton() {
        let btn = document.getElementById('btn-add-day');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'btn-add-day';
            btn.className = 'btn-add-day-modern';
            btn.innerHTML = `
                <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 3v14m-7-7h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Добавить новый день
            `;
            btn.setAttribute('aria-label', 'Добавить новый день тренировок');
            btn.onclick = () => workoutManager.addWorkoutDay();
            
            const scheduleContainer = document.getElementById('workout-schedule');
            if (scheduleContainer) {
                scheduleContainer.after(btn);
            }
        }
        btn.classList.add('visible');
    }

    addAddExerciseButton(dayDiv) {
        let btn = dayDiv.querySelector('.btn-add-row-modern');
        if (!btn) {
            btn = document.createElement('button');
            btn.className = 'btn-add-row-modern';
            btn.innerHTML = `
                <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 3v14m-7-7h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
                Добавить упражнение
            `;
            btn.setAttribute('aria-label', 'Добавить упражнение');
            btn.onclick = () => {
                const dayName = dayDiv.querySelector('h3')?.textContent.trim();
                if (dayName) {
                    workoutManager.addExercise(dayName);
                }
            };
            
            const table = dayDiv.querySelector('.workout-table');
            if (table) {
                table.after(btn);
            }
        }
        btn.classList.add('visible');
    }

    addDeleteExerciseButton(row) {
        if (row.querySelector('.btn-delete-row-modern')) return;
        
        const btn = document.createElement('button');
        btn.className = 'btn-delete-row-modern';
        btn.innerHTML = `
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 5l10 10M5 15L15 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `;
        btn.setAttribute('aria-label', 'Удалить упражнение');
        btn.onclick = () => workoutManager.deleteExerciseRow(row);
        
        row.appendChild(btn);
    }

    // ============================================
    // КНОПКИ РЕДАКТИРОВАНИЯ
    // ============================================

    addEditButton(element, key) {
        if (element.querySelector('.btn-edit-item')) return;

        const btn = document.createElement('button');
        btn.className = 'btn-edit-item';
        btn.setAttribute('aria-label', 'Редактировать');
        btn.innerHTML = `
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M11 3H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V9m-1.586-3.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" 
                      stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        `;
        btn.onclick = (e) => {
            e.stopPropagation();
            this.showEditModal(element, key);
        };
        
        element.appendChild(btn);
    }

    addDeleteButton(element, key) {
        if (element.querySelector('.btn-delete-item')) return;

        const btn = document.createElement('button');
        btn.className = 'btn-delete-item';
        btn.setAttribute('aria-label', 'Удалить блок');
        btn.innerHTML = `
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 5l10 10M5 15L15 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
        `;
        btn.onclick = (e) => {
            e.stopPropagation();
            this.deleteEditableBlock(element, key);
        };
        
        element.appendChild(btn);
    }

    // ============================================
    // МОДАЛЬНЫЕ ОКНА
    // ============================================

    showEditModal(element, key) {
        const isWorkoutCell = key === 'workout-cell' || key === 'workout-day-title';
        
        let currentText;
        if (isWorkoutCell) {
            currentText = element.textContent.trim();
        } else {
            const clone = element.cloneNode(true);
            clone.querySelectorAll('.btn-edit-item, .btn-delete-item, .drag-handle').forEach(btn => btn.remove());
            currentText = clone.innerHTML.trim();
        }
        
        const isHTML = !isWorkoutCell && (currentText.includes('<') || element.querySelector('*'));
        
        const modal = this.createModal(
            isHTML ? 'Редактировать контент' : 'Редактировать текст',
            currentText,
            isHTML,
            (newContent) => {
                if (isWorkoutCell) {
                    element.textContent = newContent;
                } else {
                    const editBtn = element.querySelector('.btn-edit-item');
                    const deleteBtn = element.querySelector('.btn-delete-item');
                    const dragHandle = element.querySelector('.drag-handle');
                    
                    element.innerHTML = newContent;
                    
                    if (editBtn) element.appendChild(editBtn);
                    if (deleteBtn) element.appendChild(deleteBtn);
                    if (dragHandle) element.insertBefore(dragHandle, element.firstChild);
                }
                contentManager.saveContent();
                notifications.success('Изменения сохранены');
            }
        );
        
        document.body.appendChild(modal);
    }

    createModal(title, initialContent, isHTML, onSave) {
        const overlay = document.createElement('div');
        overlay.className = 'edit-modal-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');

        const modal = document.createElement('div');
        modal.className = 'edit-modal';
        
        modal.innerHTML = `
            <div class="edit-modal-header">
                <h3>${title}</h3>
                <button class="edit-modal-close" aria-label="Закрыть">
                    <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 5l10 10M5 15L15 5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                    </svg>
                </button>
            </div>
            <div class="edit-modal-body">
                <textarea class="edit-modal-textarea" id="edit-content" rows="${isHTML ? 10 : 6}" placeholder="Введите текст...">${this.escapeHtml(initialContent)}</textarea>
            </div>
            <div class="edit-modal-footer">
                <button class="btn-modal btn-secondary" id="edit-modal-cancel">Отмена</button>
                <button class="btn-modal btn-primary" id="edit-modal-save">Сохранить</button>
            </div>
        `;

        const textarea = modal.querySelector('#edit-content');
        const saveBtn = modal.querySelector('#edit-modal-save');
        const cancelBtn = modal.querySelector('#edit-modal-cancel');
        const closeBtn = modal.querySelector('.edit-modal-close');

        const handleSave = () => {
            const content = textarea.value.trim();
            if (content) {
                onSave(content);
            }
            overlay.remove();
        };

        const handleCancel = () => {
            overlay.remove();
        };

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                handleCancel();
            } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleSave();
            }
        };

        saveBtn.addEventListener('click', handleSave);
        cancelBtn.addEventListener('click', handleCancel);
        closeBtn.addEventListener('click', handleCancel);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) handleCancel();
        });
        textarea.addEventListener('keydown', handleKeyDown);

        overlay.appendChild(modal);
        
        setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
        }, 100);

        return overlay;
    }

    createConfirmModal(title, message, onConfirm) {
        const overlay = document.createElement('div');
        overlay.className = 'edit-modal-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');

        const modal = document.createElement('div');
        modal.className = 'edit-modal edit-modal-confirm';
        
        modal.innerHTML = `
            <div class="edit-modal-header">
                <h3>${title}</h3>
            </div>
            <div class="edit-modal-body">
                <p>${message}</p>
            </div>
            <div class="edit-modal-footer">
                <button class="btn-modal btn-secondary" id="confirm-modal-cancel">Отмена</button>
                <button class="btn-modal btn-primary btn-danger" id="confirm-modal-confirm">Удалить</button>
            </div>
        `;

        const confirmBtn = modal.querySelector('#confirm-modal-confirm');
        const cancelBtn = modal.querySelector('#confirm-modal-cancel');

        const handleConfirm = () => {
            onConfirm();
            overlay.remove();
        };

        const handleCancel = () => {
            overlay.remove();
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) handleCancel();
        });

        overlay.appendChild(modal);
        return overlay;
    }

    deleteEditableBlock(element, key) {
        const modal = this.createConfirmModal(
            'Удалить блок?',
            'Вы уверены, что хотите удалить этот блок? Это действие нельзя отменить.',
            () => {
                const content = contentManager.getContent();
                if (content.hasOwnProperty(key)) {
                    delete content[key];
                }
                
                // If it's a block, remove the whole block
                const block = element.closest('.guidelines-block, .advice-block');
                if (block && (block === element || block.contains(element))) {
                    block.remove();
                } else {
                    element.remove();
                }
                
                contentManager.setContent(content);
                contentManager.saveContent();
                
                // Update add block buttons
                if (this.isContentEditing) {
                    this.setupAddBlockButtons();
                }
                
                notifications.success('Блок удален');
            }
        );
        
        document.body.appendChild(modal);
    }

    // ============================================
    // ДОБАВЛЕНИЕ НОВЫХ БЛОКОВ
    // ============================================

    setupAddBlockButtons() {
        ['start', 'guidelines', 'advice', 'faq'].forEach(pageId => {
            const page = document.getElementById(pageId);
            if (!page) return;
            
            // Show edit buttons container
            const buttonContainer = document.getElementById(`${pageId}-edit-buttons`);
            if (buttonContainer) {
                buttonContainer.classList.add('visible');
                buttonContainer.innerHTML = `
                    <button class="btn-add-block" onclick="editMode.showAddBlockModal('${pageId}', 'p', null)" 
                            aria-label="Добавить абзац">
                        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 3v14m-7-7h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        Добавить абзац
                    </button>
                    <button class="btn-add-block" onclick="editMode.showAddBlockModal('${pageId}', 'h3', null)"
                            aria-label="Добавить заголовок">
                        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 3v14m-7-7h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        Добавить заголовок
                    </button>
                `;
            }
            
            // Remove existing add-block buttons
            page.querySelectorAll('.add-block-button').forEach(btn => btn.remove());
            
            // Add buttons between elements
            if (pageId === 'guidelines' || pageId === 'advice') {
                // Add buttons after blocks
                page.querySelectorAll('.guidelines-block, .advice-block').forEach(block => {
                    if (block.nextElementSibling?.classList.contains('add-block-button')) return;
                    
                    const btn = document.createElement('button');
                    btn.className = 'add-block-button';
                    btn.innerHTML = `
                        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 3v14m-7-7h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <span>Добавить блок</span>
                    `;
                    btn.setAttribute('aria-label', 'Добавить новый блок');
                    btn.onclick = () => this.showAddBlockTypeSelector(pageId, block);
                    
                    block.parentNode.insertBefore(btn, block.nextSibling);
                });
            } else {
                // Add buttons after individual elements
                page.querySelectorAll('[data-key]:not([data-key$="_title"])').forEach(el => {
                    if (el.nextElementSibling?.classList.contains('add-block-button')) return;
                    if (el.closest('.guidelines-block, .advice-block')) return;
                    
                    const btn = document.createElement('button');
                    btn.className = 'add-block-button';
                    btn.innerHTML = `
                        <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M10 3v14m-7-7h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                        </svg>
                        <span>Добавить блок</span>
                    `;
                    btn.setAttribute('aria-label', 'Добавить новый блок');
                    btn.onclick = () => this.showAddBlockTypeSelector(pageId, el);
                    
                    el.parentNode.insertBefore(btn, el.nextSibling);
                });
            }
        });
    }

    showAddBlockTypeSelector(pageId, afterElement) {
        const modal = document.createElement('div');
        modal.className = 'add-block-type-selector';
        modal.innerHTML = `
            <div class="add-block-options">
                <button class="add-block-option" data-type="p">
                    <strong>Абзац</strong>
                    <span>Обычный текстовый блок</span>
                </button>
                <button class="add-block-option" data-type="h3">
                    <strong>Заголовок</strong>
                    <span>Заголовок третьего уровня</span>
                </button>
            </div>
        `;
        
        modal.querySelectorAll('.add-block-option').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.getAttribute('data-type');
                modal.remove();
                // Для кнопки "+ Добавить блок" между блоками всегда создаём отдельный внешний блок
                this.showAddBlockModal(pageId, type, afterElement);
            });
        });
        
        const rect = afterElement.getBoundingClientRect();
        modal.style.position = 'fixed';
        modal.style.left = rect.left + 'px';
        modal.style.top = (rect.bottom + 10) + 'px';
        modal.style.zIndex = '100000';
        
        document.body.appendChild(modal);
        
        setTimeout(() => {
            const closeHandler = (e) => {
                if (!modal.contains(e.target)) {
                    modal.remove();
                    document.removeEventListener('click', closeHandler);
                }
            };
            document.addEventListener('click', closeHandler);
        }, 100);
    }

    showAddBlockModal(pageId, type, afterElement = null) {
        const modal = this.createModal(
            `Добавить ${type === 'h3' ? 'заголовок' : 'абзац'}`,
            '',
            false,
            (content) => {
                if (!content.trim()) {
                    notifications.warning('Текст не может быть пустым');
                    return;
                }
                this.addEditableBlock(pageId, type, content, afterElement);
            }
        );
        
        document.body.appendChild(modal);
    }

    addEditableBlock(pageId, type, content, afterElement = null) {
        const page = document.getElementById(pageId);
        if (!page) return;

        const newKey = Utils.generateUniqueId(pageId) + '_' + type;
        const newElement = document.createElement(type);
        newElement.setAttribute('data-key', newKey);
        newElement.innerHTML = content;
        newElement.classList.add('editable-item');
        newElement.setAttribute('data-editable', 'true');
        newElement.contentEditable = true;

        // Для страниц guidelines/advice новый контент всегда упаковываем в отдельный внешний блок
        let finalElement = newElement;
        if (pageId === 'guidelines' || pageId === 'advice') {
            const wrapper = document.createElement('div');
            wrapper.className = pageId === 'guidelines' ? 'guidelines-block' : 'advice-block';
            wrapper.setAttribute('data-key', newKey.replace(/_p$|_h3$/, '_block'));
            wrapper.classList.add('editable-item');
            wrapper.setAttribute('data-editable', 'true');
            wrapper.appendChild(newElement);
            finalElement = wrapper;
        }

        // Вставка элемента
        if (afterElement && afterElement.parentNode) {
            const block = afterElement.closest('.guidelines-block, .advice-block');
            if (block && (pageId === 'guidelines' || pageId === 'advice')) {
                // Добавляем новый внешний блок после текущего блока
                block.parentNode.insertBefore(finalElement, block.nextSibling);
            } else {
                // Общий случай: вставка сразу после переданного элемента
                afterElement.parentNode.insertBefore(finalElement, afterElement.nextSibling);
            }
        } else {
            const editButtonsDiv = document.getElementById(`${pageId}-edit-buttons`);
            if (editButtonsDiv) {
                page.insertBefore(finalElement, editButtonsDiv);
            } else {
                page.appendChild(finalElement);
            }
        }

        // Save to content
        const contentData = contentManager.getContent();
        const innerEl = finalElement.querySelector(type);
        contentData[newKey] = innerEl ? innerEl.innerHTML : content;
        contentManager.setContent(contentData);
        contentManager.saveContent();

        // Add buttons
        const editableEl = innerEl || finalElement;
        this.addEditButton(editableEl, newKey);
        this.addDeleteButton(editableEl, newKey);

        // Update add-block controls when new element is added
        if (this.isContentEditing) {
            this.setupAddBlockButtons();
        }

        finalElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        notifications.success('Новый блок добавлен');
    }

    cleanupDragState() {
        if (this.dragState.ghost) {
            this.dragState.ghost.remove();
            this.dragState.ghost = null;
        }
        if (this.dragState.placeholder) {
            if (this.dragState.placeholder.parentNode) {
                this.dragState.placeholder.remove();
            }
            this.dragState.placeholder = null;
        }
        this.dragState.draggedElement = null;
    }

    // ============================================
    // ОЧИСТКА
    // ============================================

    cleanUp() {
        // Remove edit buttons
        document.querySelectorAll('.btn-edit-item, .btn-delete-item').forEach(btn => btn.remove());
        
        // Hide edit buttons containers
        document.querySelectorAll('.edit-buttons').forEach(div => {
            div.classList.remove('visible');
            div.innerHTML = '';
        });
        
        // Remove editable classes
        document.querySelectorAll('.editable-item').forEach(el => {
            el.classList.remove('editable-item', 'draggable', 'dragging');
            el.removeAttribute('data-editable');
            el.removeAttribute('data-drag-initialized');
            el.contentEditable = false;
            el.style.opacity = '';
            
            const dragHandle = el.querySelector('.drag-handle');
            if (dragHandle) dragHandle.remove();
        });
        
        // Remove drag elements
        document.querySelectorAll('.drag-placeholder, .drag-ghost').forEach(el => el.remove());
        document.querySelectorAll('.add-block-button, .add-block-type-selector').forEach(el => el.remove());
        
        // Cleanup drag state
        this.cleanupDragState();
    }

    // ============================================
    // УТИЛИТЫ
    // ============================================

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global instance
const editMode = new EditModeManager();
window.editMode = editMode;
