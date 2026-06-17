// ═════════════════════════════════════════════════════════════════════════════
// DESIGN SYSTEM - SISTEMA DE DISEÑO CENTRALIZADO
// ═════════════════════════════════════════════════════════════════════════════

const DesignSystem = {
    // ─── CONFIG ───────────────────────────────────────────────────────────────
    THEME: {
        LIGHT: 'light',
        DARK: 'dark',
        STORAGE_KEY: 'theme-mode',
        TRANSITION_DURATION: 400, // ms (matches CSS cubic-bezier)
        EASING: 'cubic-bezier(1, 0.01, 0.43, 1)'
    },

    COLORS: {
        light: {
            bg: '#FFFFFF',
            text: '#000000',
            border: '#000000',
            accent: '#000000'
        },
        dark: {
            bg: '#000000',
            text: '#FFFFFF',
            border: '#FFFFFF',
            accent: '#FFFFFF'
        }
    },

    // ─── ESTADO ───────────────────────────────────────────────────────────────
    currentTheme: null,

    // ─── INICIALIZAR TEMA ANTES DE RENDERIZAR ─────────────────────────────────
    initThemeBeforeRender() {
        const savedTheme = localStorage.getItem(this.THEME.STORAGE_KEY);
        if (savedTheme === this.THEME.DARK) {
            document.documentElement.setAttribute('data-theme', this.THEME.DARK);
            this.currentTheme = this.THEME.DARK;
            if (document.body) {
                document.body.classList.add('dark-mode');
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    document.body.classList.add('dark-mode');
                });
            }
        } else {
            document.documentElement.removeAttribute('data-theme');
            this.currentTheme = this.THEME.LIGHT;
            if (document.body) {
                document.body.classList.remove('dark-mode');
            } else {
                document.addEventListener('DOMContentLoaded', () => {
                    document.body.classList.remove('dark-mode');
                });
            }
        }
    },

    // ─── TOGGLE TEMA ──────────────────────────────────────────────────────────
    toggleTheme() {
        const isDark = document.body.classList.contains('dark-mode');
        const newTheme = isDark ? this.THEME.LIGHT : this.THEME.DARK;

        document.body.classList.toggle('dark-mode');
        this.currentTheme = newTheme;

        localStorage.setItem(this.THEME.STORAGE_KEY, newTheme);

        // Disparar evento personalizado para que otros componentes se enteren
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme: newTheme }
        }));
    },

    // ─── OBTENER TEMA ACTUAL ──────────────────────────────────────────────────
    isCurrentThemeDark() {
        return this.currentTheme === this.THEME.DARK;
    },

    getThemeColor(colorKey) {
        const theme = this.isCurrentThemeDark() ? 'dark' : 'light';
        return this.COLORS[theme][colorKey];
    },

    // ─── ESCUCHAR CAMBIOS DE TEMA DESDE OTRAS PESTAÑAS ────────────────────────
    syncStorageChanges() {
        window.addEventListener('storage', (e) => {
            if (e.key === this.THEME.STORAGE_KEY) {
                this.initThemeBeforeRender();
                window.dispatchEvent(new CustomEvent('themeChanged', {
                    detail: { theme: this.currentTheme, external: true }
                }));
            }
        });
    },

    // ─── INICIALIZAR EL SISTEMA ───────────────────────────────────────────────
    init() {
        this.initThemeBeforeRender();
        this.syncStorageChanges();
    }
};

// Ejecutar inmediatamente (antes de DOMContentLoaded)
DesignSystem.init();
