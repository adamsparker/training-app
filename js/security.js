// Security and authentication
class SecurityManager {
    constructor() {
        this.STORAGE_KEY = 'app_auth_hash';
        this.DEFAULT_PASSWORD = 'admin';
        this.init();
    }

    init() {
        // Set default password hash if not exists
        if (!localStorage.getItem(this.STORAGE_KEY)) {
            this.setPassword(this.DEFAULT_PASSWORD);
        }
    }

    // Simple hash function (for demo purposes - in production use proper hashing)
    hashPassword(password) {
        let hash = 0;
        for (let i = 0; i < password.length; i++) {
            const char = password.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return hash.toString();
    }

    setPassword(newPassword) {
        const hash = this.hashPassword(newPassword);
        localStorage.setItem(this.STORAGE_KEY, hash);
    }

    verifyPassword(password) {
        const storedHash = localStorage.getItem(this.STORAGE_KEY);
        const inputHash = this.hashPassword(password);
        return storedHash === inputHash;
    }

    async promptPassword(message = 'Введите пароль:') {
        return new Promise((resolve) => {
            const modal = this.createPasswordModal(message, (password) => {
                modal.remove();
                resolve(password);
            });
            document.body.appendChild(modal);
        });
    }

    createPasswordModal(message, callback) {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');
        overlay.setAttribute('aria-labelledby', 'modal-title');

        const modal = document.createElement('div');
        modal.className = 'modal';
        
        modal.innerHTML = `
            <h3 id="modal-title">${message}</h3>
            <input type="password" id="password-input" class="modal-input" 
                   placeholder="Пароль" autocomplete="off" aria-label="Пароль">
            <div class="modal-buttons">
                <button class="btn-modal btn-primary" id="modal-submit">Подтвердить</button>
                <button class="btn-modal btn-secondary" id="modal-cancel">Отмена</button>
            </div>
        `;

        const input = modal.querySelector('#password-input');
        const submitBtn = modal.querySelector('#modal-submit');
        const cancelBtn = modal.querySelector('#modal-cancel');

        const handleSubmit = () => {
            callback(input.value);
        };

        const handleCancel = () => {
            callback(null);
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
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) handleCancel();
        });

        overlay.appendChild(modal);
        
        // Focus input
        setTimeout(() => input.focus(), 100);

        return overlay;
    }
}

// Global instance
const security = new SecurityManager();




