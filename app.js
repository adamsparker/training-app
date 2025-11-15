// app.js - ФИНАЛЬНАЯ ВЕРСИЯ С РЕДАКТИРОВАНИЕМ ДНЕЙ И ПАРОЛЕМ

document.addEventListener('DOMContentLoaded', () => {

    // Function to handle program card clicks
    function handleProgramCardClick(event) {
        event.preventDefault();
        const card = event.currentTarget;
        const programId = card.getAttribute('data-program-id');
        if (programId) {
            const targetPage = document.getElementById(`program-${programId}`);
            if (targetPage) {
                // Hide all pages
                document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
                // Show target page
                targetPage.classList.add('active');
                // Scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        }
    }

    // Function to handle program card touch/click events
    function initProgramCards() {
        const programCards = document.querySelectorAll('.program-card');
        programCards.forEach(card => {
            // Remove existing event listeners to prevent duplicates
            card.removeEventListener('click', handleProgramCardClick);
            card.removeEventListener('touchend', handleProgramCardClick);
            
            // Add both click and touch event listeners
            card.addEventListener('click', handleProgramCardClick);
            card.addEventListener('touchend', handleProgramCardClick);
        });
    }

    // Initialize program cards
    initProgramCards();

    // --- 0. КОНСТАНТЫ И ЭЛЕМЕНТЫ ---
    const navLinks = document.querySelectorAll('.nav-link');
    const pages = document.querySelectorAll('.page');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');
    const menuToggle = document.getElementById('menu-toggle');
    const scheduleContainer = document.getElementById('workout-schedule');
    const editModeToggle = document.getElementById('edit-mode-toggle'); 
    const programEditToggle = document.getElementById('toggle-program-edit'); 
    
    // Пароль для обоих режимов редактирования
    const EDIT_PASSWORD = "admin"; 
    
    let fullContent = {}; 
    let newElementCounter = 1; 
    
    // --- 0.5. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
    
    function generateUniqueId(prefix) {
        return `${prefix}_dynamic_${Date.now()}_${newElementCounter++}`;
    }

    const getCheckboxes = () => document.querySelectorAll('.workout-table input[type="checkbox"]');
    
    function cleanUpEditButtons() {
        // Удаляем все динамические кнопки
        document.querySelectorAll('.btn-add-block, .btn-add-row, .btn-delete-row, .btn-delete-element, #btn-add-day').forEach(btn => btn.remove());
        // Очищаем контейнеры для кнопок добавления
        document.querySelectorAll('.edit-buttons').forEach(div => div.innerHTML = '');
        
        // Делаем весь контент нередактируемым
        document.querySelectorAll('[data-key][contenteditable="true"]').forEach(el => {
            el.contentEditable = false;
        });
        document.querySelectorAll('.workout-table td[contenteditable="true"]').forEach(el => {
            el.contentEditable = false;
        });
        document.querySelectorAll('.workout-day h3[contenteditable="true"]').forEach(el => {
            el.contentEditable = false;
        });
    }

    // --- 1. ЗАГРУЗКА И СОХРАНЕНИЕ КОНТЕНТА ---
    
    async function loadContent() {
        // Сброс режима редактирования и очистка кнопок при каждой загрузке
        cleanUpEditButtons(); 
        if (programEditToggle) programEditToggle.textContent = 'Редактировать программу';
        
        try {
            const savedContent = localStorage.getItem('siteContent');
            let contentToLoad;
            
            if (savedContent) {
                contentToLoad = JSON.parse(savedContent);
            } else {
                const response = await fetch('content.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}. Проверьте content.json`);
                }
                contentToLoad = await response.json();
            }

            fullContent = contentToLoad;

            renderStaticContent();
            
            if (fullContent.workout_data) {
                renderWorkoutProgram();
                loadCheckboxState();
                attachCheckboxListeners();
            }
            
            // Re-initialize program cards after content is loaded
            initProgramCards();

        } catch (error) {
            console.error("Ошибка при загрузке контента:", error);
        }
    }
    
    function renderStaticContent() {
        // Удаляем все динамические элементы, чтобы избежать дублирования
        document.querySelectorAll('[data-key*="_dynamic_"]').forEach(el => el.remove());

        const elements = document.querySelectorAll('[data-key]');
        
        // 1. Рендеринг статических элементов
        elements.forEach(el => {
            const key = el.getAttribute('data-key');
            if (key && fullContent[key] !== undefined && typeof fullContent[key] === 'string') {
                el.innerHTML = fullContent[key];
            }
        });
        
        // 2. Добавление динамически созданных блоков
        for (const key in fullContent) {
            if (key.includes('_dynamic_') && typeof fullContent[key] === 'string') {
                const parts = key.split('_');
                const pageId = parts[0];
                const type = parts[parts.length - 1]; 
                
                if (type !== 'p' && type !== 'h3') continue;

                const page = document.getElementById(pageId);
                if (page) {
                    const newElement = document.createElement(type);
                    newElement.setAttribute('data-key', key);
                    newElement.innerHTML = fullContent[key];
                    
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

    function saveAllContent() {
        // 1. Сохранение статического/динамического контента
        const editableElements = document.querySelectorAll('[data-key]');
        const keysToRemove = [];

        editableElements.forEach(el => {
            const key = el.getAttribute('data-key');
            if (!document.body.contains(el)) {
                 keysToRemove.push(key);
                 return;
            }
            
            // Удаляем кнопку удаления из innerHTML перед сохранением контента
            const deleteButton = el.querySelector('.btn-delete-element');
            if (deleteButton) {
                el.removeChild(deleteButton);
            }

            if (key) {
                fullContent[key] = el.innerHTML; 
            }

            // Возвращаем кнопку, если режим редактирования активен
            if (editModeToggle && editModeToggle.classList.contains('active') && deleteButton) {
                el.appendChild(deleteButton);
            }
        });
        
        keysToRemove.forEach(key => {
            if (fullContent.hasOwnProperty(key)) {
                delete fullContent[key];
            }
        });

        // 2. Сохранение данных программы тренировок 
        const workoutDayElements = document.querySelectorAll('.workout-day');
        
        // Обновляем workout_data только если нашли элементы программы.
        if (workoutDayElements.length > 0) { 
            const tempWorkoutData = { days: [] };

            workoutDayElements.forEach(dayDiv => {
                const dayHeader = dayDiv.querySelector('h3');
                
                // ИСПРАВЛЕНО: Извлекаем новое имя дня
                const dayName = dayHeader.textContent.trim(); 
                
                const dayData = { name_ru: dayName, exercises: [] };
                
                dayDiv.querySelectorAll('.workout-table tbody tr').forEach(row => {
                    const cells = row.querySelectorAll('td:not(.checkbox-cell)');
                    if (cells.length >= 3) {
                        dayData.exercises.push({
                            name: cells[0].textContent.trim(), 
                            sets: cells[1].textContent.trim(),
                            reps: cells[2].textContent.trim(),
                        });
                    }
                });
                // Пропускаем дни, которые могут быть пустыми после удаления всех упражнений
                if (dayData.exercises.length > 0) {
                     tempWorkoutData.days.push(dayData);
                } else if (dayName.toLowerCase().includes('день') || dayName.toLowerCase().includes('day')) {
                    // Если день пуст, но пользователь его оставил (для нового дня), сохраняем только если он не был явно удален
                    tempWorkoutData.days.push(dayData);
                }
            });

            fullContent.workout_data = tempWorkoutData;
        }

        localStorage.setItem('siteContent', JSON.stringify(fullContent));
    }

    // --- 2. ЛОГИКА РЕЖИМА РЕДАКТИРОВАНИЯ С ПАРОЛЕМ ---

    // 2.1. Режим редактирования статического контента (пароль)
    function toggleEditMode() {
        if (!editModeToggle) return; 
        
        const isEditing = editModeToggle.classList.contains('active');
        
        if (!isEditing) {
            const password = prompt("Введите пароль для включения режима редактирования статического контента:");
            if (password === EDIT_PASSWORD) {
                enableEditMode();
            } else if (password !== null) {
                alert("Неверный пароль.");
            }
        } else {
            disableEditMode();
        }
    }
    
    function enableEditMode() {
        editModeToggle.classList.add('active');
        editModeToggle.textContent = 'Выйти и сохранить';
        
        const mainTitlesToSkip = ['start_title', 'guidelines_title', 'program_title', 'advice_title', 'faq_title'];

        // Делаем весь контент редактируемым и добавляем кнопки удаления
        document.querySelectorAll('[data-key]').forEach(el => {
            el.contentEditable = true;

            const key = el.getAttribute('data-key');
            if (mainTitlesToSkip.includes(key)) return;
            
            if (el.querySelector('.btn-delete-element')) return; 

            const deleteButton = document.createElement('button');
            deleteButton.className = 'btn-delete-element';
            deleteButton.textContent = 'Удалить блок';
            deleteButton.onclick = () => deleteEditableBlock(el, key);
            
            el.appendChild(deleteButton);
        });

        // Вставляем кнопки добавления блоков на статических страницах
        ['start', 'guidelines', 'advice', 'faq'].forEach(pageId => {
            const buttonContainer = document.getElementById(`${pageId}-edit-buttons`);
            if (buttonContainer) {
                buttonContainer.innerHTML = `
                    <button class="btn-add-block" onclick="addEditableBlock('${pageId}', 'p')">Добавить абзац (p)</button>
                    <button class="btn-add-block" onclick="addEditableBlock('${pageId}', 'h3')">Добавить заголовок (h3)</button>
                `;
            }
        });

        // Если активен режим редактирования программы, не перезаписываем его
        if (!programEditToggle || programEditToggle.textContent === 'Редактировать программу') {
            disableProgramEditMode(false);
        }
    }
    
    function disableEditMode() {
        saveAllContent(); 
        
        editModeToggle.classList.remove('active');
        editModeToggle.textContent = 'Включить редактирование';

        cleanUpEditButtons();
        loadContent(); 
        
        alert("Изменения сохранены локально в вашем браузере.");
    }
    
    if (editModeToggle) {
        editModeToggle.addEventListener('click', toggleEditMode);
    }
    
    // 2.2. Режим редактирования программы (отдельная кнопка с паролем)
    if (programEditToggle) {
        programEditToggle.addEventListener('click', () => {
            if (programEditToggle.textContent === 'Редактировать программу') {
                const password = prompt("Введите пароль для редактирования программы:"); // ДОБАВЛЕН ПАРОЛЬ
                if (password === EDIT_PASSWORD) {
                    enableProgramEditMode();
                } else if (password !== null) {
                    alert("Неверный пароль.");
                }
            } else {
                disableProgramEditMode(true);
            }
        });
    }

    function enableProgramEditMode() {
        programEditToggle.textContent = 'Завершить редактирование программы и сохранить';
        
        // ДОБАВЛЕНО: Делаем заголовки дней редактируемыми
        document.querySelectorAll('.workout-day h3').forEach(h3 => {
            h3.contentEditable = true;
            h3.classList.add('editable-element');
        });

        // ДОБАВЛЕНО: Добавляем кнопку "Добавить новый день"
        let addDayBtn = document.getElementById('btn-add-day');
        if (!addDayBtn) {
            addDayBtn = document.createElement('button');
            addDayBtn.id = 'btn-add-day';
            addDayBtn.className = 'btn-add-row'; 
            addDayBtn.textContent = 'Добавить новый день';
            addDayBtn.onclick = window.addWorkoutDay;
            scheduleContainer.after(addDayBtn);
        }
        
        // Делаем ячейки таблицы редактируемыми
        document.querySelectorAll('.workout-table td:not(.checkbox-cell)').forEach(cell => {
            cell.contentEditable = true;
        });

        // Вставляем кнопки добавления строк в программе тренировок
        document.querySelectorAll('.workout-day').forEach(dayDiv => {
            const dayName = dayDiv.querySelector('h3').textContent;
            let addButton = dayDiv.querySelector('.btn-add-row');
            if (!addButton || addButton.id === 'btn-add-day') { // Проверка, что это не глобальная кнопка
                // Создаем кнопку добавления упражнения для конкретного дня
                addButton = document.createElement('button');
                addButton.className = 'btn-add-row';
                addButton.textContent = `Добавить упражнение в ${dayName}`;
                addButton.onclick = () => addExercise(dayName);
            }
            const lastTable = dayDiv.querySelector('.workout-table');
            if (lastTable) {
                lastTable.after(addButton);
            }
        });

        // Вставляем кнопки удаления строки
        document.querySelectorAll('.workout-table tbody tr').forEach(row => {
            if (!row.querySelector('.btn-delete-row')) {
                 const deleteBtn = document.createElement('button');
                 deleteBtn.className = 'btn-delete-row';
                 deleteBtn.textContent = 'Удалить';
                 deleteBtn.onclick = () => deleteExerciseRow(row);
                 
                 row.appendChild(deleteBtn);
            }
        });
    }

    function disableProgramEditMode(showAlert = true) {
        saveAllContent();
        
        programEditToggle.textContent = 'Редактировать программу';
        
        // Удаляем кнопки программы
        document.querySelectorAll('.btn-add-row, .btn-delete-row, #btn-add-day').forEach(btn => btn.remove());
        
        // Делаем ячейки и заголовки нередактируемыми
        document.querySelectorAll('.workout-table td[contenteditable="true"]').forEach(cell => {
            cell.contentEditable = false;
        });
        document.querySelectorAll('.workout-day h3[contenteditable="true"]').forEach(h3 => {
            h3.contentEditable = false;
        });

        // Перерисовываем программу, чтобы убедиться, что все чисто и обновлено
        renderWorkoutProgram();
        
        if (showAlert) {
             alert("Программа тренировок сохранена локально.");
        }
    }


    // --- 3. ФУНКЦИИ УДАЛЕНИЯ И ДОБАВЛЕНИЯ КОНТЕНТА (ГЛОБАЛЬНЫЕ) ---

    window.deleteEditableBlock = function(element, key) { /* ... (без изменений) ... */
        if (confirm(`Вы уверены, что хотите удалить блок?`)) {
            if (fullContent.hasOwnProperty(key)) {
                delete fullContent[key];
            }
            element.remove();
            saveAllContent();
            alert("Блок удален и изменения сохранены.");
        }
    }

    window.deleteExerciseRow = function(rowElement) { /* ... (без изменений) ... */
        if (confirm("Вы уверены, что хотите удалить это упражнение?")) {
            rowElement.remove();
            saveAllContent(); 
            if (programEditToggle.textContent !== 'Редактировать программу') {
                loadContent(); 
            }
            alert("Упражнение удалено и изменения сохранены.");
        }
    }


    window.addEditableBlock = function(pageId, type) { /* ... (без изменений) ... */
        const page = document.getElementById(pageId);
        if (!page) return;

        const newKey = generateUniqueId(pageId) + '_' + type; 
        
        const newElement = document.createElement(type);
        newElement.setAttribute('data-key', newKey);
        newElement.innerHTML = `[Новый ${type.toUpperCase()}] Введите текст здесь.`;
        newElement.contentEditable = true; 
        
        const editButtonsDiv = document.getElementById(`${pageId}-edit-buttons`);
        if (editButtonsDiv) {
            page.insertBefore(newElement, editButtonsDiv);
        } else {
            page.appendChild(newElement);
        }

        fullContent[newKey] = newElement.innerHTML;
        
        enableEditMode();
        newElement.focus();
    }

    window.addExercise = function(dayName) { /* ... (без изменений) ... */
        if (!fullContent.workout_data) return;
        
        const dayData = fullContent.workout_data.days.find(d => d.name_ru === dayName);
        if (!dayData) return;

        const newExercise = {
            name: "[НОВОЕ] Упражнение",
            sets: "3",
            reps: "8-12"
        };
        
        dayData.exercises.push(newExercise);
        
        renderWorkoutProgram(); 
        enableProgramEditMode(); 
        saveAllContent(); 
    }
    
    // ДОБАВЛЕНО: Функция для добавления нового дня
    window.addWorkoutDay = function() {
        if (!fullContent.workout_data) {
            fullContent.workout_data = { days: [] };
        }

        const newDayName = prompt("Введите название нового дня (например, 'Суббота'):");
        if (!newDayName || newDayName.trim() === "") {
            alert("Название дня не может быть пустым.");
            return;
        }
        
        const newDay = {
            name_ru: newDayName.trim(),
            exercises: [] 
        };
        
        fullContent.workout_data.days.push(newDay);
        
        renderWorkoutProgram(); 
        enableProgramEditMode(); 
        saveAllContent();
    }
    
    // --- 5. ДИНАМИЧЕСКАЯ ГЕНЕРАЦИЯ ПРОГРАММЫ ---
    
    function renderWorkoutProgram() {
        if (!fullContent.workout_data || !scheduleContainer) return;

        let html = '';
        let checkboxIndex = 1; 

        fullContent.workout_data.days.forEach((day) => {
            // ДОБАВЛЕНО: Кнопка для удаления дня
            const deleteDayBtn = `
                <button class="btn-delete-row" style="float:right; margin-top: -5px;" onclick="deleteWorkoutDay('${day.name_ru}')">Удалить день</button>
            `;

            html += `
                <div class="workout-day">
                    <h3>${day.name_ru}</h3>
                    ${(programEditToggle && programEditToggle.textContent !== 'Редактировать программу') ? deleteDayBtn : ''}
                    <div class="program-content">
                        <table class="workout-table" data-day="${day.name_ru}">
                            <thead>
                                <tr>
                                    <th>Упражнение</th>
                                    <th>Подходы</th>
                                    <th>Повторения</th>
                                    <th>Выполнено</th>
                                </tr>
                            </thead>
                            <tbody>
            `;

            day.exercises.forEach((ex) => {
                const id = `ex${checkboxIndex++}`;
                html += `
                    <tr>
                        <td data-label="Упражнение">${ex.name}</td>
                        <td data-label="Подходы">${ex.sets}</td>
                        <td data-label="Повторения">${ex.reps}</td>
                        <td data-label="Выполнено" class="checkbox-cell">
                            <input type="checkbox" id="${id}">
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

        scheduleContainer.innerHTML = html;
        
        // Если был активен режим редактирования, возвращаем его
        if (programEditToggle && programEditToggle.textContent !== 'Редактировать программу') {
            enableProgramEditMode(); 
        }
    }

    // ДОБАВЛЕНО: Функция удаления дня
    window.deleteWorkoutDay = function(dayName) {
        if (confirm(`Вы уверены, что хотите удалить весь день "${dayName}" и все его упражнения?`)) {
            if (!fullContent.workout_data) return;

            fullContent.workout_data.days = fullContent.workout_data.days.filter(
                day => day.name_ru !== dayName
            );

            saveAllContent();
            renderWorkoutProgram(); 
            enableProgramEditMode(); 
            alert(`День "${dayName}" удален.`);
        }
    }

    // --- 6. ЛОГИКА ЧЕКБОКСОВ и 7. НАВИГАЦИЯ ---
    
    function saveCheckboxState() { /* ... (без изменений) ... */
        getCheckboxes().forEach(checkbox => {
            localStorage.setItem(checkbox.id, checkbox.checked);
        });
    }

    function loadCheckboxState() { /* ... (без изменений) ... */
        getCheckboxes().forEach(checkbox => {
            checkbox.checked = localStorage.getItem(checkbox.id) === 'true';
        });
    }

    function attachCheckboxListeners() { /* ... (без изменений) ... */
        getCheckboxes().forEach(checkbox => {
            checkbox.addEventListener('change', saveCheckboxState);
        });
    }

    if (resetButton) { /* ... (без изменений) ... */
        resetButton.forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm("Вы уверены, что хотите сбросить прогресс тренировки?")) {
                    getCheckboxes().forEach(checkbox => {
                        checkbox.checked = false;
                    });
                    saveCheckboxState();
                }
            });
        });
    }
    
    navLinks.forEach(link => { /* ... (без изменений) ... */
        link.addEventListener('click', (e) => {
            e.preventDefault(); 
            const targetId = link.getAttribute('data-target');
            const targetPage = document.getElementById(targetId);

            navLinks.forEach(navLink => navLink.classList.remove('active'));
            pages.forEach(page => page.classList.remove('active'));

            if (link) link.classList.add('active');
            if (targetPage) targetPage.classList.add('active');

            if (window.innerWidth <= 768) {
                toggleMenu(); 
            }
        });
    });

    function toggleMenu() { /* ... (без изменений) ... */
        if (sidebar) sidebar.classList.toggle('visible');
        if (overlay) overlay.classList.toggle('active');
    }

    if (menuToggle) { /* ... (без изменений) ... */
        menuToggle.addEventListener('click', toggleMenu);
    }
    if (overlay) { /* ... (без изменений) ... */
        overlay.addEventListener('click', toggleMenu); 
    }
    
    // --- ИНИЦИАЛИЗАЦИЯ ---
    loadContent();
});