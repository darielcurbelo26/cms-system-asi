(function () {

    // ── DATOS DE PROYECTOS ──────────────────────────────────────────────────
    var PROJECTS = [];
    var originalLength = 0;

    // ── STATE ──────────────────────────────────────────────────────────────
    var wrapper = document.getElementById('projects-gallery-wrapper');
    var cursor = document.getElementById('proj-cursor');
    var progressEl = document.getElementById('proj-progress');
    var scrollHint = document.getElementById('scroll-hint');

    var slides = [];
    var count = 0;
    var h = window.innerHeight;
    var current = 0;
    var offset = 0;
    var isAnimating = false;
    var hintDone = false;
    var logicalCurrent = 0;

    // Touch
    var touchStartY = 0;
    var touchDelta = 0;
    var isDragging = false;
    var wasDragging = false;

    // Cursor — current zone: 'up' | 'mid' | 'down'
    var cursorZone = 'down';

    // ── HIDE HINT ───────────────────────────────────────────────────────────
    function hideHint() {
        if (hintDone || !scrollHint) return;
        hintDone = true;

        // 1. Apagamos la animación CSS infinita
        scrollHint.style.animation = 'none';

        // 2. ¡EL TRUCO MÁGICO! Forzamos un reflow para que el navegador se actualice
        void scrollHint.offsetWidth;

        // 3. Aplicamos la transición suave y la opacidad a 0
        scrollHint.style.transition = 'opacity 0.8s ease-out';
        scrollHint.style.opacity = '0';

        // 4. Lo desactivamos para los clics
        scrollHint.style.pointerEvents = 'none';
    }

    // ── ZONA según posición Y del ratón ─────────────────────────────────────
    // Arriba: 0–25%   Centro: 25–75%   Abajo: 75–100%
    function getZone(mouseY) {
        var pct = mouseY / h;
        if (pct < 0.25) return 'up';
        if (pct < 0.75) return 'mid';
        return 'down';
    }

    // ── UPDATE CURSOR according to zone ─────────────────────────────────────────
    function updateCursor(zone) {
        var isMobile = window.innerWidth <= 768;
        if (isMobile) zone = 'mid'; // Forzar zona central en móviles

        cursorZone = zone;
        var proj = PROJECTS[logicalCurrent];
        var hasLink = proj && proj.link;

        cursor.dataset.zone = zone;

        if (zone === 'up') {
            cursor.querySelector('.cursor-symbol').textContent = '';
            cursor.querySelector('.cursor-text').textContent = '(prev)';
            cursor.classList.remove('cursor-mid');
        } else if (zone === 'down') {
            cursor.querySelector('.cursor-symbol').textContent = '';
            cursor.querySelector('.cursor-text').textContent = '(next)';
            cursor.classList.remove('cursor-mid');
        } else {
            // zona central
            cursor.querySelector('.cursor-symbol').textContent = '';
            cursor.querySelector('.cursor-text').textContent = hasLink ? '(Explore More)' : '';
            cursor.classList.add('cursor-mid');
        }
    }

    // ── BUILD ────────────────────────────────────────────────────────────────
    function build() {
        PROJECTS.forEach(function (d) {
            var div = document.createElement('div');
            div.className = 'proj-slide' + (d.link ? ' has-link' : '');

            var mediaHtml;
            if (d.iframe) {
                mediaHtml = '<iframe src="' + d.iframe + '" style="width:100%;height:100%;border:none;pointer-events:none;" loading="lazy"></iframe>';
            } else {
                mediaHtml = '<img src="' + d.src + '" alt="' + d.title + '">';
            }

            div.innerHTML =
                mediaHtml +
                '<div class="proj-info">' +
                '<div class="proj-title">' + d.title + '</div>' +
                '<div class="proj-meta">' +
                (d.desc ? '<div>DESCRIPTION: ' + d.desc + '</div>' : '') +
                (d.loc ? '<div>LOCATION: ' + d.loc + '</div>' : '') +
                (d.date ? '<div>DATE: ' + d.date + '</div>' : '') +
                '</div>' +
                '</div>';
            wrapper.appendChild(div);
            slides.push(div);
        });

        // Dots
        var origCount = originalLength;
        for (var i = 0; i < origCount; i++) {
            var dot = document.createElement('div');
            dot.className = 'prog-dot' + (i === 0 ? ' active' : '');
            progressEl.appendChild(dot);
        }

        position();
        updateCursor(cursorZone); // Initialize cursor setting initial state
        bindEvents();
    }

    // ── POSICIONAMIENTO INFINITO ─────────────────────────────────────────────
    function getVisualIndex() {
        var minAbs = Infinity;
        var visIdx = current;
        for (var i = 0; i < count; i++) {
            var rel = i - current;
            if (rel > count / 2) rel -= count;
            if (rel < -count / 2) rel += count;
            var y = rel * h + offset;
            if (Math.abs(y) < minAbs) {
                minAbs = Math.abs(y);
                visIdx = i;
            }
        }
        return visIdx;
    }

    function position() {
        for (var i = 0; i < count; i++) {
            var rel = i - current;
            if (rel > count / 2) rel -= count;
            if (rel < -count / 2) rel += count;
            slides[i].style.transform = 'translateY(' + (rel * h + offset) + 'px)';
        }
        
        // Sincronizar siempre el punto y el cursor con lo que se ve en pantalla
        var vis = getVisualIndex();
        logicalCurrent = vis;
        updateDots(vis);
    }

    function updateDots(activeIdx) {
        if (activeIdx === undefined) activeIdx = logicalCurrent;
        var origCount = originalLength;
        var dots = progressEl.querySelectorAll('.prog-dot');
        dots.forEach(function (d, i) {
            d.classList.toggle('active', i === (activeIdx % origCount));
        });
    }

    // ── NAVEGACIÓN INFINITA ──────────────────────────────────────────────────
    function goTo(index) {
        var target = ((index % count) + count) % count;
        hideHint();
        if (isAnimating) return; // double safeguard
        isAnimating = true;

        var dir = index > current ? 1 : -1;
        // if moving from count-1 to 0, dir should be 1
        if (current === count - 1 && target === 0) dir = 1;
        if (current === 0 && target === count - 1) dir = -1;

        var startOff = offset;
        var endOff = -dir * h;
        var startTime = null;
        var duration = 700;

        (function animate(ts) {
            if (!startTime) startTime = ts;
            var p = Math.min((ts - startTime) / duration, 1);
            var ease = 1 - Math.pow(1 - p, 4);
            offset = startOff + (endOff - startOff) * ease;
            position();
            if (p < 1) {
                requestAnimationFrame(animate);
            } else {
                current = target;
                offset = 0;
                position();
                updateCursor(cursorZone);
                isAnimating = false;
            }
        })(performance.now());
    }

    // ── EVENTOS ──────────────────────────────────────────────────────────────
    function bindEvents() {

        wrapper.addEventListener('mousemove', function (e) {
            // Removed hideHint() call here
            gsap.set(cursor, { x: e.clientX, y: e.clientY });
            updateCursor(getZone(e.clientY));
            cursor.classList.add('visible');
        });

        wrapper.addEventListener('mouseenter', function () {
            cursor.classList.add('visible');
        });

        wrapper.addEventListener('mouseleave', function () {
            cursor.classList.remove('visible');
        });

        wrapper.addEventListener('click', function () {
            if (wasDragging) { wasDragging = false; return; }
            hideHint();
            if (isAnimating) return; // Block clicks completely during animation
            
            if (cursorZone === 'up') {
                goTo(current - 1);
            } else if (cursorZone === 'down') {
                goTo(current + 1);
            } else {
                // center zone: navigate to project with smooth black overlay
                var proj = PROJECTS[logicalCurrent];
                if (proj && proj.link) {
                    navigateTo(proj.link);
                }
            }
        });

        wrapper.addEventListener('wheel', function (e) {
            e.preventDefault();
            hideHint();
            if (isAnimating) return;
            if (e.deltaY > 5) goTo(current + 1);
            else if (e.deltaY < -5) goTo(current - 1);
        }, { passive: false });

        wrapper.addEventListener('touchstart', function (e) {
            if (isAnimating) return;
            touchStartY = e.touches[0].clientY;
            touchDelta = 0;
            isDragging = true;
            wasDragging = false;
            hideHint();
        }, { passive: true });

        wrapper.addEventListener('touchmove', function (e) {
            if (!isDragging) return;
            var dy = touchStartY - e.touches[0].clientY;
            if (Math.abs(dy) > 8) { e.preventDefault(); wasDragging = true; }
            touchDelta = dy;
            offset = -touchDelta;
            position();
        }, { passive: false });

        wrapper.addEventListener('touchend', function () {
            if (!isDragging) return;
            isDragging = false;
            if (wasDragging) {
                var thr = h * 0.15;
                if (touchDelta > thr) goTo(current + 1);
                else if (touchDelta < -thr) goTo(current - 1);
                else goTo(current);
            }
        }, { passive: true });

        document.addEventListener('keydown', function (e) {
            if (isAnimating) return;
            hideHint();
            if (e.key === 'ArrowDown' || e.key === ' ') { e.preventDefault(); goTo(current + 1); }
            if (e.key === 'ArrowUp') { e.preventDefault(); goTo(current - 1); }
        });

        window.addEventListener('resize', function () {
            h = window.innerHeight;
            position();
        });
    }

    // ── NAVIGATE — always use canviaPagina for consistent black curtain transition ──
    function navigateTo(url) {
        if (window.canviaPagina) {
            window.canviaPagina(url);
        } else {
            var overlay = document.querySelector('.transition-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.style.cssText = 'position:fixed;inset:0;background:#000;z-index:9999;opacity:0;pointer-events:all;transition:opacity 0.35s ease;';
                document.body.appendChild(overlay);
            }
            overlay.style.background = '#000';
            overlay.style.opacity = '0';
            requestAnimationFrame(function() {
                overlay.style.opacity = '1';
                setTimeout(function() { window.location.href = url; }, 360);
            });
        }
    }

    function setupProjects(data) {
        var items = (data.projects && data.projects.items) ? data.projects.items : [];
        originalLength = items.length;
        PROJECTS = items;
        
        // Loop replication logic for infinite gallery behavior
        if (PROJECTS.length === 1) {
            PROJECTS = [PROJECTS[0], PROJECTS[0], PROJECTS[0], PROJECTS[0]];
        } else if (PROJECTS.length === 2) {
            PROJECTS = PROJECTS.concat(PROJECTS);
        } else if (PROJECTS.length === 3) {
            PROJECTS = PROJECTS.concat(PROJECTS);
        }
        
        count = PROJECTS.length;
        build();
    }

    function init() {
        if (window.TATC_CONTENT) {
            setupProjects(window.TATC_CONTENT);
        } else {
            document.addEventListener('cms:ready', function (e) {
                setupProjects(e.detail);
            });
        }
    }

    init();

})();