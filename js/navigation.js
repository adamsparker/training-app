// Navigation and UI management
class NavigationManager {
    constructor() {
        this.navLinks = document.querySelectorAll('.nav-link');
        this.pages = document.querySelectorAll('.page');
        this.sidebar = document.getElementById('sidebar');
        this.overlay = document.getElementById('overlay');
        this.menuToggle = document.getElementById('menu-toggle');
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupMenuToggle();
        this.setupKeyboardShortcuts();
    }

    setupNavigation() {
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('data-target');
                this.navigateTo(targetId);
            });
        });
    }

    navigateTo(targetId) {
        const targetPage = document.getElementById(targetId);
        if (!targetPage) return;

        this.navLinks.forEach(navLink => navLink.classList.remove('active'));
        this.pages.forEach(page => page.classList.remove('active'));

        const activeLink = Array.from(this.navLinks).find(link => 
            link.getAttribute('data-target') === targetId
        );
        
        if (activeLink) {
            activeLink.classList.add('active');
            activeLink.setAttribute('aria-current', 'page');
        }
        
        targetPage.classList.add('active');
        targetPage.setAttribute('aria-current', 'page');

        // Close mobile menu if open
        if (window.innerWidth <= 768) {
            this.toggleMenu();
        }

        // Scroll to top
        document.querySelector('.content').scrollTo({ top: 0, behavior: 'smooth' });

        // Update edit buttons if edit mode is active
        if (window.editMode && window.editMode.isContentEditing) {
            setTimeout(() => {
                window.editMode.updateEditButtonsForCurrentPage();
            }, 100);
        }
    }

    setupMenuToggle() {
        if (this.menuToggle) {
            this.menuToggle.addEventListener('click', () => this.toggleMenu());
            this.menuToggle.setAttribute('aria-label', 'Открыть меню');
            this.menuToggle.setAttribute('aria-expanded', 'false');
        }

        if (this.overlay) {
            this.overlay.addEventListener('click', () => this.toggleMenu());
        }

        // Close menu on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.sidebar && this.sidebar.classList.contains('visible')) {
                this.toggleMenu();
            }
        });
    }

    toggleMenu() {
        if (!this.sidebar || !this.overlay) return;
        
        const isVisible = this.sidebar.classList.contains('visible');
        this.sidebar.classList.toggle('visible');
        this.overlay.classList.toggle('active');
        
        if (this.menuToggle) {
            this.menuToggle.setAttribute('aria-expanded', (!isVisible).toString());
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }

            // Ctrl/Cmd + number keys for navigation
            if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
                const num = parseInt(e.key);
                if (num >= 1 && num <= 5) {
                    e.preventDefault();
                    const pages = ['start', 'guidelines', 'programs', 'advice', 'faq'];
                    if (pages[num - 1]) {
                        this.navigateTo(pages[num - 1]);
                    }
                }
            }

            // Escape to close modals/menus
            if (e.key === 'Escape') {
                const modals = document.querySelectorAll('.modal-overlay');
                modals.forEach(modal => modal.remove());
            }
        });
    }
}

// Global instance
const navigation = new NavigationManager();

