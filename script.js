// --- PAGE TRANSITIONS (CURTAIN EFFECT) ---
// We use a self-executing function to keep variables local but window-accessible
(function() {
    let overlayTransition;

    function initOverlay() {
        overlayTransition = document.querySelector('.transition-overlay');
        if (!overlayTransition) {
            overlayTransition = document.createElement('div');
            overlayTransition.className = 'transition-overlay';
            document.body.appendChild(overlayTransition);
        }
        
        // Ensure it's active and covering the screen immediately
        gsap.set(overlayTransition, { y: 0, opacity: 1, backgroundColor: 'black' });
        
        // Entrance: Reveal content
        gsap.to(overlayTransition, {
            y: "-100%",
            duration: 0.8,
            ease: 'power3.inOut',
            onComplete: () => {
                overlayTransition.style.pointerEvents = 'none';
            }
        });
    }

    // Handle BFCache (Back/Forward navigation)
    window.addEventListener('pageshow', (e) => {
        if (e.persisted && overlayTransition) {
            gsap.set(overlayTransition, { y: 0, opacity: 1, backgroundColor: 'black' });
            gsap.to(overlayTransition, {
                y: "-100%",
                duration: 0.8,
                ease: 'power3.inOut',
                onComplete: () => {
                    overlayTransition.style.pointerEvents = 'none';
                }
            });
        }
    });

    // --- GATEWAY / SECURITY CHECK ---
    // Qué páginas son privadas se decide combinando dos fuentes: content.json
    // (rápido, local, sirve de respaldo si WordPress no responde a tiempo) y
    // WordPress (fuente real: cualquier "Page Gate" creado en wp-admin aplica
    // de inmediato). WordPress gana si ambas listan la misma página.
    async function fetchJsonWithTimeout(url, ms) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), ms);
        try {
            const res = await fetch(url, { signal: controller.signal });
            return res.ok ? await res.json() : null;
        } catch (e) {
            return null;
        } finally {
            clearTimeout(timeout);
        }
    }

    async function checkSecurity() {
        try {
            const [staticData, wpData] = await Promise.all([
                fetchJsonWithTimeout('content.json?t=' + Date.now(), 3000),
                fetchJsonWithTimeout('https://throughalltheclutter.com/cms/wp-json/tatc/v1/content?t=' + Date.now(), 2500),
            ]);

            const pages = { ...(staticData?.security?.pages || {}), ...(wpData?.security?.pages || {}) };
            if (Object.keys(pages).length === 0) return;

            // Get current page filename
            const path = window.location.pathname;
            let page = path.split("/").pop() || 'index.html';

            // Normalize: if no extension, assume .html for lookup
            let lookupPage = page;
            if (!lookupPage.includes('.')) lookupPage += '.html';

            // Special case for password page itself - avoid infinite loop
            if (page === 'password.html' || page === '404.html' || lookupPage === 'password.html' || lookupPage === '404.html') return;

            const visibility = pages[lookupPage] || 'public';
            const isUnlocked = sessionStorage.getItem('tatc-unlocked') === 'true';

            if (visibility === 'private' && !isUnlocked) {
                // Redirect to gateway with return page info
                window.location.replace(`password.html?redirect=${page}`);
            }
        } catch (e) {
            console.warn("Security check failed:", e);
        }
    }

    // Run as soon as we can
    checkSecurity();

    // Run as soon as we can, but wait for DOM if needed
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOverlay);
    } else {
        initOverlay();
    }

    // Global function for transitions
    window.canviaPagina = function(e) {
        if (e && e.preventDefault) e.preventDefault();
        
        const target = (e && e.currentTarget) ? e.currentTarget.href : e;
        if (!target || target.includes('#') || target === window.location.href) return;

        if (!overlayTransition) overlayTransition = document.querySelector('.transition-overlay');
        
        gsap.killTweensOf(overlayTransition);
        
        // Exit Animation: Move overlay in from the bottom
        // We set pointerEvents to auto so user can't click while transitioning
        overlayTransition.style.pointerEvents = 'auto';
        gsap.fromTo(overlayTransition, 
            { y: "100%", opacity: 1, backgroundColor: 'black' },
            { 
                y: 0, 
                duration: 0.6, 
                ease: 'power3.inOut', 
                onComplete: () => { 
                    // Briefly wait to ensure visual coverage before redirect
                    setTimeout(() => {
                        window.location.href = target;
                    }, 50);
                } 
            }
        );
    };
})();

// ─── DOMContentLoaded ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    
    // Mark as loaded for the session only if we are NOT on a page with a loader
    // This allows index.html to skip its preloader only when navigating back from other pages
    if (!document.getElementById('loader-wrapper')) {
        sessionStorage.setItem('tatc-loaded', 'true');
    }

    // Attach transition to internal links (delegated, so it also covers CMS-injected links)
    document.addEventListener('click', (e) => {
        if (e.defaultPrevented) return;
        if (e.button !== 0) return;
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

        const link = e.target && e.target.closest ? e.target.closest('a') : null;
        if (!link) return;

        if (link.target === '_blank' || link.hasAttribute('download')) return;
        const rawHref = link.getAttribute('href');
        if (!rawHref || rawHref.startsWith('#')) return;
        if (rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) return;

        const isSameOrigin = link.host === window.location.host;
        if (!isSameOrigin) return;

        e.preventDefault();
        window.canviaPagina(link.href);
    }, true);

    // --- 0. GLOBAL ENTRANCE ANIMATIONS (GSAP) ---
    const entranceTimeline = gsap.timeline({
        defaults: { ease: 'power3.out', duration: 1.2 }
    });

    // Hidden by default to avoid flash, but managed by to()
    gsap.set('.nav_component, .heading-style-h1, .section_hero-title-password, .not-found-title, .fixed-controls_component > *, .nav_list a, .text-size-regular, .layout_stack, .not-found-sub, .password-form', {
        opacity: 0
    });

    // Navbar from top
    if (document.querySelector('.nav_component')) {
        entranceTimeline.to('.nav_component', {
            y: 0,
            opacity: 1,
            startAt: { y: -50 },
            duration: 1
        }, 0.2);
    }

    // Main Titles - Scale and Fade (maintaining specific scales)
    if (document.querySelector('.heading-style-h1')) {
        entranceTimeline.to('.heading-style-h1', {
            scale: 1.2,
            opacity: 1,
            filter: 'blur(0.5px)',
            startAt: { scale: 1.3, opacity: 0, filter: 'blur(10px)' },
            duration: 1.8
        }, 0.3);
    }

    if (document.querySelector('.section_hero-title-password')) {
        entranceTimeline.to('.section_hero-title-password', {
            scale: 1.1,
            opacity: 1,
            filter: 'blur(0.5px)',
            startAt: { scale: 1.2, opacity: 0, filter: 'blur(10px)' },
            duration: 1.8
        }, 0.3);
    }

    if (document.querySelector('.not-found-title')) {
        entranceTimeline.to('.not-found-title', {
            scale: 1,
            opacity: 1,
            startAt: { scale: 1.1, opacity: 0 },
            duration: 1.8
        }, 0.3);
    }

    // 404 Red background
    if (document.querySelector('.not-found-bg')) {
        entranceTimeline.to('.not-found-bg', {
            opacity: 1,
            filter: 'blur(8px)',
            startAt: { opacity: 0, filter: 'blur(30px)' },
            duration: 2.5
        }, 0.2);
    }

    // Secondary Content - Fade and Slide Up
    const content = '.text-size-regular, .layout_stack, .not-found-sub, .password-form, .heading-style-h2';
    if (document.querySelector(content)) {
        entranceTimeline.to(content, {
            y: 0,
            opacity: 1,
            startAt: { y: 20, opacity: 0 },
            stagger: 0.1,
            duration: 1.2
        }, 0.5);
    }

    // Bottom Toggles
    if (document.querySelector('.fixed-controls_component')) {
        entranceTimeline.to('.fixed-controls_component > *', {
            scale: 1,
            opacity: 1,
            startAt: { scale: 0, opacity: 0 },
            stagger: 0.08,
            duration: 1,
            ease: 'back.out(1.5)'
        }, 0.7);
    }

    // Staggered Nav Links (if sidebar is open or for desktop)
    if (document.querySelector('.nav_list')) {
        entranceTimeline.to('.nav_list a', {
            x: 0,
            opacity: 1,
            startAt: { x: 15, opacity: 0 },
            stagger: 0.05,
            duration: 1
        }, 0.4);
    }

    // Cube (if exists)
    const cubeCont = document.getElementById('cube-container');
    if (cubeCont) {
        gsap.set(cubeCont, { visibility: 'visible', opacity: 0, filter: 'blur(20px)', scale: 0.95 });
        entranceTimeline.to(cubeCont, {
            opacity: 1,
            filter: 'blur(0px)',
            scale: 1,
            duration: 2,
            ease: 'power2.out'
        }, 0.6);
    }

    // --- 1. BURGER MENU ---
    const burger = document.getElementById('nav_button-menu');
    const rightNavbar = document.querySelector('.nav_menu');
    if (burger && rightNavbar) {
        function openMenu() {
            burger.classList.add('active');
            rightNavbar.classList.add('active');
            document.body.classList.add('menu-open');    // CSS lock
            document.body.style.overflow = 'hidden';     // JS lock
        }
        function closeMenu() {
            burger.classList.remove('active');
            rightNavbar.classList.remove('active');
            document.body.classList.remove('menu-open'); // CSS unlock
            document.body.style.overflow = '';            // JS unlock
        }

        burger.addEventListener('click', (e) => {
            e.stopPropagation();
            rightNavbar.classList.contains('active') ? closeMenu() : openMenu();
        });

        // Close on click outside
        document.addEventListener('mousedown', (e) => {
            if (rightNavbar.classList.contains('active')) {
                if (!rightNavbar.contains(e.target) && !burger.contains(e.target)) closeMenu();
            }
        });

        // Close on nav link click (so scroll restores after navigation)
        rightNavbar.querySelectorAll('a').forEach(a => {
            a.addEventListener('click', () => closeMenu());
        });
    }

    // --- 2. THEME TOGGLE (integrated with DesignSystem) ---
    const themeToggle = document.querySelector('.icon-button.is-square');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            DesignSystem.toggleTheme();
        });
    }

    // --- 2. 3D CUBE ---
    // ─────────────────────────────────────────────────────────────────────────────
    const CONFIG = { rotationSpeedY: 0.5, friction: 0.95, bounce: 0.7 };
    const container = document.getElementById('cube-container');
    const cube = document.getElementById('cube');
    const wrapper = document.querySelector('.cms-cube-wrapper');

    if (!container || !cube || !wrapper) return;

    let size = 250;
    let rX = 0, rY = 0, posX = 0, posY = 0, velX = 0, velY = 0;
    let isDrag = false, lastMouseX = 0, lastMouseY = 0;

    function updateDims() {
        size = window.innerWidth < 768 ? 150 : 250;
        cube.style.width = cube.style.height = size + 'px';
        cube.style.marginLeft = cube.style.marginTop = (-size / 2) + 'px';
        const faces = cube.querySelectorAll('.cube-face');
        const h = size / 2;
        faces.forEach(f => f.style.width = f.style.height = size + 'px');
        faces[0].style.transform = `translateZ(${h}px)`;
        faces[1].style.transform = `rotateY(180deg) translateZ(${h}px)`;
        faces[2].style.transform = `rotateY(90deg) translateZ(${h}px)`;
        faces[3].style.transform = `rotateY(-90deg) translateZ(${h}px)`;
        faces[4].style.transform = `rotateX(90deg) translateZ(${h}px)`;
        faces[5].style.transform = `rotateX(-90deg) translateZ(${h}px)`;
    }

    function getCubeFaceImages() {
        const TOTAL = 406, MIN_GAP = 50, FACES = 6;
        const chosen = [];
        let attempts = 0;
        while (chosen.length < FACES && attempts++ < 10000) {
            const n = Math.floor(Math.random() * TOTAL) + 1;
            if (!chosen.some(c => Math.abs(c - n) < MIN_GAP)) chosen.push(n);
        }
        return chosen.map(n => `assets/images/_${n}.webp`);
    }

    function cubeLoop() {
        rY += CONFIG.rotationSpeedY;
        cube.style.transform = `rotateX(${rX}deg) rotateY(${rY}deg)`;
        if (!isDrag) {
            velX *= CONFIG.friction; velY *= CONFIG.friction;
            posX += velX; posY += velY;
            const minX = size / 2, maxX = wrapper.offsetWidth - size / 2;
            const minY = size / 2, maxY = wrapper.offsetHeight - size / 2;
            if (posX < minX || posX > maxX) velX *= -CONFIG.bounce;
            if (posY < minY || posY > maxY) velY *= -CONFIG.bounce;
            posX = Math.max(minX, Math.min(maxX, posX));
            posY = Math.max(minY, Math.min(maxY, posY));
        }
        container.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
        requestAnimationFrame(cubeLoop);
    }

    const onDown = (x, y) => { isDrag = true; lastMouseX = x; lastMouseY = y; velX = velY = 0; container.style.cursor = 'grabbing'; };
    const onMove = (x, y) => { if (!isDrag) return; velX = x - lastMouseX; velY = y - lastMouseY; posX += velX; posY += velY; lastMouseX = x; lastMouseY = y; };
    container.addEventListener('mousedown', e => onDown(e.clientX, e.clientY));
    window.addEventListener('mousemove', e => onMove(e.clientX, e.clientY));
    window.addEventListener('mouseup', () => { isDrag = false; container.style.cursor = 'grab'; });
    container.addEventListener('touchstart', e => onDown(e.touches[0].clientX, e.touches[0].clientY), { passive: true });
    window.addEventListener('touchmove', e => {
        if (!isDrag) return;
        e.preventDefault();
        onMove(e.touches[0].clientX, e.touches[0].clientY);
    }, { passive: false });
    window.addEventListener('touchend', () => { isDrag = false; container.style.cursor = 'grab'; });
    window.addEventListener('resize', () => { updateDims(); posX = wrapper.offsetWidth / 2; posY = wrapper.offsetHeight / 2; });

    // init cube
    cube.querySelectorAll('img').forEach((img, i) => { img.src = getCubeFaceImages()[i] || ''; });
    updateDims();
    posX = wrapper.offsetWidth / 2;
    posY = wrapper.offsetHeight / 2;
    // container.style.visibility = 'visible'; // Handled by GSAP timeline now
    cubeLoop();

    // ─────────────────────────────────────────────────────────────────────────────
    // --- 3. VISIBILITY TOGGLE — Blur + Fade (GSAP) ---
    // ─────────────────────────────────────────────────────────────────────────────
    const visibilityToggle = document.querySelector('.icon-button.is-cube');
    if (!visibilityToggle) return;

    let cubeVisible = true;
    let busy = false;

    visibilityToggle.addEventListener('click', () => {
        if (busy) return;
        busy = true;

        if (cubeVisible) {
            // DISAPPEAR: button changes instantly, then cube animates
            visibilityToggle.style.opacity = '0.3';
            // Animate opacity/blur on container, but SCALE on the internal cube to avoid transform conflicts
            gsap.to(container, {
                duration: 0.6,
                opacity: 0,
                filter: 'blur(30px)',
                ease: 'power2.in',
                onComplete: () => {
                    gsap.set(container, { visibility: 'hidden' });
                    cubeVisible = false;
                    busy = false;
                }
            });
            gsap.to(cube, { duration: 0.6, scale: 1.08, ease: 'power2.in' });
        } else {
            // APPEAR: button changes instantly, then cube animates
            visibilityToggle.style.opacity = '1';
            gsap.set(container, {
                visibility: 'visible',
                opacity: 0,
                filter: 'blur(30px)'
            });
            gsap.set(cube, { scale: 1.08 });

            gsap.to(container, {
                duration: 0.6,
                opacity: 1,
                filter: 'blur(0px)',
                ease: 'power2.out',
                onComplete: () => {
                    cubeVisible = true;
                    busy = false;
                }
            });
            gsap.to(cube, { duration: 0.6, scale: 1, ease: 'power2.out' });
        }
    });

}); // fin DOMContentLoaded