// ═════════════════════════════════════════════════════════════════════════════
// ADMIN SYSTEM - Sistema Centralizado del Panel Administrativo
// ═════════════════════════════════════════════════════════════════════════════

const AdminSystem = {
    // ─── CONFIG ───────────────────────────────────────────────────────────────
    CONFIG_URL: '../data/config.json',
    config: null,
    currentTab: 'textos',

    // ─── INICIALIZAR ──────────────────────────────────────────────────────────
    async init() {
        await this.loadConfig();
        this.setupEventListeners();
        this.renderAll();
    },

    // ─── CARGAR CONFIGURACIÓN ─────────────────────────────────────────────────
    async loadConfig() {
        try {
            const response = await fetch(this.CONFIG_URL);
            if (!response.ok) throw new Error('Failed to load config.json');
            this.config = await response.json();
            console.log('✅ Config cargada:', this.config);
        } catch (error) {
            console.error('❌ Error cargando config.json:', error);
            this.showStatus('Error cargando configuración', 'error');
            // Usar config por defecto
            this.loadDefaultConfig();
        }
    },

    // ─── CONFIG POR DEFECTO ───────────────────────────────────────────────────
    loadDefaultConfig() {
        this.config = {
            version: '1.0.0',
            lastUpdated: new Date().toISOString(),
            site: { title: 'TATC Portfolio', description: 'Through all the clutter' },
            pages: {
                index: { hero: { title: 'Through all the clutter', subtitle: '' } },
                about: {
                    title: 'A Sweet Kid',
                    intro_title: 'Mexico City Art Week 2025',
                    paragraphs: ['Párrafo 1', 'Párrafo 2', 'Párrafo 3']
                },
                a_sweet_kid: {
                    title: 'A Sweet Kid',
                    location: 'Mexico City — Salon Silicon',
                    description: 'Descripción del proyecto...'
                }
            },
            projects: [
                {
                    id: 1,
                    src: 'assets/images/_1.webp',
                    title: 'A Sweet Kid',
                    desc: 'Multimedia installation',
                    date: '2025',
                    loc: 'Mexico City — Salon Silicon',
                    link: 'a-sweet-kid.html'
                }
            ],
            socials: {
                x: 'https://x.com',
                instagram: 'https://instagram.com',
                email: 'ejemplo@correo.com'
            },
            variables: {
                typography: {
                    'navbar-font-size': '1rem',
                    'navbar-weight': '500',
                    'hero-font-size': '14cqw',
                    'hero-weight': '900'
                },
                spacing: {
                    'inner-navbar': '0.75rem',
                    'card-gap': '8px',
                    'card-height': '160px'
                },
                colors: {
                    light_bg: '#FFFFFF',
                    light_text: '#000000',
                    dark_bg: '#000000',
                    dark_text: '#FFFFFF'
                }
            }
        };
    },

    // ─── SETUP EVENT LISTENERS ────────────────────────────────────────────────
    setupEventListeners() {
        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Textos
        document.getElementById('hero-title')?.addEventListener('change', (e) => {
            this.config.pages.index.hero.title = e.target.value;
        });

        document.getElementById('about-title')?.addEventListener('change', (e) => {
            this.config.pages.about.title = e.target.value;
        });

        ['about-p1', 'about-p2', 'about-p3'].forEach((id, idx) => {
            document.getElementById(id)?.addEventListener('change', (e) => {
                this.config.pages.about.paragraphs[idx] = e.target.value;
            });
        });

        // Enlaces
        document.getElementById('social-x')?.addEventListener('change', (e) => {
            this.config.socials.x = e.target.value;
        });

        document.getElementById('social-instagram')?.addEventListener('change', (e) => {
            this.config.socials.instagram = e.target.value;
        });

        document.getElementById('social-email')?.addEventListener('change', (e) => {
            this.config.socials.email = e.target.value;
        });

        // Proyectos
        document.getElementById('btn-new-project')?.addEventListener('click', () => {
            this.openProjectModal();
        });

        // Imágenes
        const uploadArea = document.getElementById('upload-area');
        if (uploadArea) {
            uploadArea.addEventListener('click', () => {
                document.getElementById('file-input').click();
            });

            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = '#000';
                uploadArea.style.background = '#f0f0f0';
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.style.borderColor = '#ddd';
                uploadArea.style.background = '#fafafa';
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.style.borderColor = '#ddd';
                uploadArea.style.background = '#fafafa';
                this.handleFileUpload(e.dataTransfer.files);
            });
        }

        document.getElementById('file-input')?.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files);
        });

        // Guardar/Reset
        document.getElementById('btn-save')?.addEventListener('click', () => {
            this.saveConfig();
        });

        document.getElementById('btn-reset')?.addEventListener('click', () => {
            if (confirm('¿Estás seguro de que quieres resetear todos los cambios?')) {
                this.loadDefaultConfig();
                this.renderAll();
                this.showStatus('Configuración resetada', 'success');
            }
        });

        // Modal
        document.getElementById('btn-project-save')?.addEventListener('click', () => {
            this.saveNewProject();
        });

        document.querySelectorAll('.modal-cancel, .modal-close').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('modal-project').classList.remove('active');
            });
        });
    },

    // ─── SWITCH TAB ────────────────────────────────────────────────────────────
    switchTab(tabName) {
        this.currentTab = tabName;

        // Remover active de tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Agregar active al tab clickeado
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Remover active de contenidos
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.remove('active');
        });

        // Agregar active al contenido
        document.getElementById(`tab-${tabName}`).classList.add('active');
    },

    // ─── RENDERIZAR TODO ───────────────────────────────────────────────────────
    renderAll() {
        this.renderTextos();
        this.renderProyectos();
        this.renderEnlaces();
        this.renderVariables();
    },

    // ─── RENDERIZAR TEXTOS ────────────────────────────────────────────────────
    renderTextos() {
        document.getElementById('hero-title').value = this.config.pages.index.hero.title;
        document.getElementById('about-title').value = this.config.pages.about.title;
        document.getElementById('about-p1').value = this.config.pages.about.paragraphs[0] || '';
        document.getElementById('about-p2').value = this.config.pages.about.paragraphs[1] || '';
        document.getElementById('about-p3').value = this.config.pages.about.paragraphs[2] || '';
    },

    // ─── RENDERIZAR PROYECTOS ─────────────────────────────────────────────────
    renderProyectos() {
        const container = document.getElementById('proyectos-list');
        if (!container) return;

        container.innerHTML = '';

        this.config.projects.forEach((project, idx) => {
            const card = document.createElement('div');
            card.className = 'proyecto-card';
            card.innerHTML = `
                <h4>${project.title}</h4>
                <p><strong>Desc:</strong> ${project.desc}</p>
                <p><strong>Año:</strong> ${project.date}</p>
                <p><strong>Loc:</strong> ${project.loc}</p>
                <img src="../${project.src}" style="max-height: 100px; margin-top: 0.5rem;">
                <div class="proyecto-card-actions">
                    <button class="btn btn-primary btn-small" onclick="AdminSystem.editProject(${idx})">✏️ Editar</button>
                    <button class="btn btn-danger btn-small" onclick="AdminSystem.deleteProject(${idx})">🗑️ Eliminar</button>
                </div>
            `;
            container.appendChild(card);
        });
    },

    // ─── RENDERIZAR ENLACES ───────────────────────────────────────────────────
    renderEnlaces() {
        document.getElementById('social-x').value = this.config.socials.x;
        document.getElementById('social-instagram').value = this.config.socials.instagram;
        document.getElementById('social-email').value = this.config.socials.email;
    },

    // ─── RENDERIZAR VARIABLES ─────────────────────────────────────────────────
    renderVariables() {
        document.getElementById('var-navbar-font-size').value =
            this.config.variables.typography['navbar-font-size'];
        document.getElementById('var-inner-navbar').value =
            this.config.variables.spacing['inner-navbar'];
        document.getElementById('color-light-bg').value =
            this.config.variables.colors.light_bg;
        document.getElementById('color-light-text').value =
            this.config.variables.colors.light_text;
        document.getElementById('color-dark-bg').value =
            this.config.variables.colors.dark_bg;
        document.getElementById('color-dark-text').value =
            this.config.variables.colors.dark_text;
    },

    // ─── ABRIR MODAL DE PROYECTO ───────────────────────────────────────────────
    openProjectModal(projectIdx = null) {
        const modal = document.getElementById('modal-project');
        modal.dataset.projectIdx = projectIdx === null ? -1 : projectIdx;

        if (projectIdx !== null) {
            const project = this.config.projects[projectIdx];
            document.getElementById('project-title').value = project.title;
            document.getElementById('project-desc').value = project.desc;
            document.getElementById('project-date').value = project.date;
            document.getElementById('project-loc').value = project.loc;
            document.getElementById('project-image').value = project.src;
        } else {
            document.getElementById('project-title').value = '';
            document.getElementById('project-desc').value = '';
            document.getElementById('project-date').value = new Date().getFullYear();
            document.getElementById('project-loc').value = '';
            document.getElementById('project-image').value = '';
        }

        modal.classList.add('active');
    },

    editProject(idx) {
        this.openProjectModal(idx);
    },

    deleteProject(idx) {
        if (confirm('¿Seguro que quieres eliminar este proyecto?')) {
            this.config.projects.splice(idx, 1);
            this.renderProyectos();
        }
    },

    // ─── GUARDAR NUEVO PROYECTO ────────────────────────────────────────────────
    saveNewProject() {
        const title = document.getElementById('project-title').value;
        const desc = document.getElementById('project-desc').value;
        const date = document.getElementById('project-date').value;
        const loc = document.getElementById('project-loc').value;
        const src = document.getElementById('project-image').value;

        if (!title || !desc || !date || !loc || !src) {
            this.showStatus('Completa todos los campos', 'error');
            return;
        }

        const projectIdx = parseInt(document.getElementById('modal-project').dataset.projectIdx);

        if (projectIdx === -1) {
            // Nuevo proyecto
            const newProject = {
                id: Math.max(...this.config.projects.map(p => p.id), 0) + 1,
                src,
                title,
                desc,
                date,
                loc,
                link: 'a-sweet-kid.html'
            };
            this.config.projects.push(newProject);
        } else {
            // Editar proyecto existente
            this.config.projects[projectIdx] = {
                ...this.config.projects[projectIdx],
                src, title, desc, date, loc
            };
        }

        document.getElementById('modal-project').classList.remove('active');
        this.renderProyectos();
        this.showStatus('Proyecto guardado', 'success');
    },

    // ─── HANDLE FILE UPLOAD ────────────────────────────────────────────────────
    handleFileUpload(files) {
        console.log(`📸 ${files.length} archivos para subir`);
        this.showStatus(`Se procesarían ${files.length} archivos. Funcionalidad de upload en desarrollo.`, 'success');
        // TODO: Implementar upload a servidor
    },

    // ─── GUARDAR CONFIGURACIÓN ────────────────────────────────────────────────
    async saveConfig() {
        try {
            this.config.lastUpdated = new Date().toISOString();

            // Crear FormData para enviar JSON
            const jsonData = JSON.stringify(this.config, null, 2);

            // En un proyecto real, enviar al servidor para guardar
            // Por ahora, mostrar en consola
            console.log('📁 Config a guardar:', this.config);

            // Opcional: Descargar como archivo
            const blob = new Blob([jsonData], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'config.json';
            a.click();
            window.URL.revokeObjectURL(url);

            this.showStatus('✅ Configuración guardada (descargada como config.json)', 'success');
        } catch (error) {
            console.error('❌ Error guardando:', error);
            this.showStatus('Error al guardar la configuración', 'error');
        }
    },

    // ─── MOSTRAR STATUS ────────────────────────────────────────────────────────
    showStatus(message, type = 'info') {
        const statusEl = document.getElementById('status-message');
        statusEl.textContent = message;
        statusEl.className = `status-message ${type}`;

        if (type !== 'error') {
            setTimeout(() => {
                statusEl.textContent = '';
                statusEl.className = 'status-message';
            }, 3000);
        }
    }
};

// ─── INICIALIZAR AL CARGAR ─────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    // Auth logic
    const authOverlay = document.getElementById('auth-overlay');
    const authPass = document.getElementById('auth-pass');
    const authBtn = document.getElementById('auth-btn');
    const authError = document.getElementById('auth-error');
    const adminContainer = document.getElementById('admin-container');
    
    // Check if implicitly authenticated via localStorage
    const isAuth = localStorage.getItem('tatc_admin_auth');
    if (isAuth === 'true') {
        unlockAdmin();
    }
    
    function unlockAdmin() {
        if(authOverlay) {
            authOverlay.style.opacity = '0';
            setTimeout(() => {
                authOverlay.style.display = 'none';
            }, 500);
        }
        if(adminContainer) {
            adminContainer.style.display = 'flex';
            setTimeout(() => {
                adminContainer.style.opacity = '1';
            }, 50);
        }
        AdminSystem.init();
    }
    
    function handleAuth() {
        // Simple client-side passcode
        if (authPass.value === 'TATC2026' || authPass.value === 'admin') {
            localStorage.setItem('tatc_admin_auth', 'true');
            unlockAdmin();
        } else {
            authError.textContent = 'Invalid passcode.';
            authError.style.opacity = '1';
            authPass.value = '';
            setTimeout(() => authError.style.opacity = '0', 2000);
        }
    }
    
    if (authBtn) {
        authBtn.addEventListener('click', handleAuth);
        authPass.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleAuth();
        });
    }
});
