document.addEventListener('DOMContentLoaded', () => {
    const { gsap } = window;
    const gallery = document.getElementById('carrusel-galley');
    const root = document.getElementById('carousel-root');

    if (!gallery || !root || typeof gsap === 'undefined') return;

    // 1. Generate image paths in random order with a minimum gap of 10 between adjacent indices
    const TOTAL_IMAGES = 406;
    const MIN_GAP = 10;

    function buildShuffledImages() {
        const pool = Array.from({ length: TOTAL_IMAGES }, (_, i) => i + 1);
        for (let i = pool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pool[i], pool[j]] = [pool[j], pool[i]];
        }

        const result = [];
        const remaining = [...pool];

        while (remaining.length > 0) {
            const lastNum = result.length > 0 ? result[result.length - 1] : null;
            let chosen = -1;
            for (let i = 0; i < remaining.length; i++) {
                if (lastNum === null || Math.abs(remaining[i] - lastNum) >= MIN_GAP) {
                    chosen = i;
                    break;
                }
            }
            if (chosen === -1) {
                let maxDiff = -1;
                for (let i = 0; i < remaining.length; i++) {
                    const diff = Math.abs(remaining[i] - lastNum);
                    if (diff > maxDiff) { maxDiff = diff; chosen = i; }
                }
            }
            result.push(remaining.splice(chosen, 1)[0]);
        }

        return result.map(n => `assets/images/_${n}.webp`);
    }

    // 2. Follower Label Logic (Dynamic Container/Mask Effect)
    const follower = document.getElementById('carousel-cursor');

    if (follower) {
        const text = follower.innerText.trim();

        follower.innerHTML = `
            <div class="cursor-mask">
                <div class="cursor-text">${text}</div>
            </div>
        `;

        const mask = follower.querySelector('.cursor-mask');
        const innerText = follower.querySelector('.cursor-text');

        window.addEventListener('mousemove', (e) => {
            gsap.to(follower, {
                x: e.clientX,
                y: e.clientY,
                duration: 0.15,
                ease: "power2.out"
            });
        });

        root.addEventListener('mouseenter', () => {
            follower.classList.add('active');
            gsap.killTweensOf(follower);
            gsap.set(follower, { opacity: 1 });

            gsap.killTweensOf(mask);
            gsap.fromTo(mask,
                { width: 0 },
                { width: innerText.offsetWidth, duration: 0.4, ease: "power3.inOut" }
            );
        });

        root.addEventListener('mouseleave', () => {
            gsap.killTweensOf(mask);
            gsap.to(mask, {
                width: 0,
                duration: 0.3,
                ease: "power3.inOut"
            });

            gsap.killTweensOf(follower);
            gsap.to(follower, {
                opacity: 0,
                duration: 0.1,
                delay: 0.3,
                onComplete: () => follower.classList.remove('active')
            });
        });
    }

    // 3. Fullscreen Overlay Logic
    const overlay = document.getElementById('gallery-overlay');
    const overlayImg = document.getElementById('overlay-img');
    const btnPrev = document.querySelector('.overlay-prev');
    const btnNext = document.querySelector('.overlay-next');
    let currentIndex = 0;
    let currentImages = [];

    const updateImage = () => {
        if (!currentImages || currentImages.length === 0) return;
        if (currentIndex < 0) currentIndex = currentImages.length - 1;
        if (currentIndex >= currentImages.length) currentIndex = 0;
        if (overlayImg) overlayImg.src = currentImages[currentIndex];
    };

    const openOverlay = (index, imagesArray) => {
        if (imagesArray) currentImages = imagesArray;
        currentIndex = index;
        updateImage();
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const closeOverlay = () => {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
    };

    if (btnNext) btnNext.addEventListener('click', (e) => { e.stopPropagation(); currentIndex++; updateImage(); });
    if (btnPrev) btnPrev.addEventListener('click', (e) => { e.stopPropagation(); currentIndex--; updateImage(); });
    
    const btnClose = document.querySelector('.overlay-close');
    if (btnClose) btnClose.addEventListener('click', (e) => { e.stopPropagation(); closeOverlay(); });

    if (overlay) overlay.addEventListener('click', (e) => {
        if (e.target === overlay || e.target.classList.contains('overlay-content')) closeOverlay();
    });

    document.addEventListener('keydown', (e) => {
        if (!overlay || !overlay.classList.contains('active')) return;
        if (e.key === 'Escape') closeOverlay();
        if (e.key === 'ArrowRight') { currentIndex++; updateImage(); }
        if (e.key === 'ArrowLeft') { currentIndex--; updateImage(); }
    });

    // 4. Carousel Logic (DOM, Physics, Trackpad, and Swipe)
    let carouselInitialized = false;

    function initCarousel() {
        if (carouselInitialized) return;
        
        // Populate carrusel-galley for a-sweet-kid.html if not already populated
        const isStaticSweetKid = window.location.pathname.includes('a-sweet-kid.html') || (!window.location.pathname.includes('project-page.html') && document.title.includes('A Sweet Kid'));
        if (isStaticSweetKid && window.TATC_CONTENT && window.TATC_CONTENT.projects_detail && window.TATC_CONTENT.projects_detail['a-sweet-kid']) {
            const p = window.TATC_CONTENT.projects_detail['a-sweet-kid'];
            if (p.gallery_images && p.gallery_images.length) {
                gallery.innerHTML = p.gallery_images.map((src, i) =>
                    `<img src="${src}" alt="Image ${i + 1}">`
                ).join('');
            }
        }

        // Get images from the #carrusel-galley element if populated
        let images = [];
        const galleryImgs = Array.from(gallery.querySelectorAll('img')).map(img => img.src || img.getAttribute('src')).filter(Boolean);
        
        if (galleryImgs.length > 0) {
            images = [...galleryImgs];
            // Duplicate to ensure smooth loop if there are few items
            while (images.length < 8) {
                images = images.concat(galleryImgs);
            }
            // Shuffle for a random layout feel
            images.sort(() => Math.random() - 0.5);
        } else {
            images = buildShuffledImages();
        }

        const rows = root.querySelectorAll('.carousel-container');
        const AUTOPLAY_SPEED = 0.5;

        rows.forEach(row => {
            const track = row.querySelector('.carousel-track');
            if (!track) return;

            const direction = parseInt(row.dataset.direction || "1");
            
            // Cada fila mezcla las imágenes independientemente
            const rowImages = [...images].sort(() => Math.random() - 0.5);

            for (let i = 0; i < 4; i++) {
                rowImages.forEach((src, idx) => {
                    const slide = document.createElement('div');
                    slide.className = 'carousel-slide';

                    const card = document.createElement('div');
                    card.className = 'carousel-card';
                    card.dataset.idx = idx;

                    const img = document.createElement('img');
                    img.src = src;
                    img.className = 'carousel-image';
                    img.draggable = false;

                    card.appendChild(img);
                    slide.appendChild(card);
                    track.appendChild(slide);
                });
            }

            let setWidth = 0;
            let velocity = 0;
            let isSwiping = false;
            let startX = 0, lastX = 0, lastTime = 0;

            function calculateDimensions() {
                const slides = track.querySelectorAll('.carousel-slide');
                if (slides.length === 0) return 0;
                let totalWidth = 0;
                const gap = parseFloat(window.getComputedStyle(track).gap) || 0;
                for (let i = 0; i < rowImages.length; i++) {
                    totalWidth += slides[i].offsetWidth + gap;
                }
                return totalWidth;
            }

            function setup() {
                setWidth = calculateDimensions();
                if (setWidth > 0) gsap.set(track, { x: -setWidth });
            }
            setTimeout(setup, 200);

            function animate() {
                if (setWidth === 0) return requestAnimationFrame(animate);

                let currentX = gsap.getProperty(track, 'x');
                currentX -= (AUTOPLAY_SPEED * direction) - velocity;
                velocity *= 0.95;

                if (currentX < -setWidth * 2.5) currentX += setWidth;
                else if (currentX > -setWidth * 0.5) currentX -= setWidth;

                gsap.set(track, { x: currentX });
                requestAnimationFrame(animate);
            }
            requestAnimationFrame(animate);

            row.addEventListener('wheel', (e) => {
                if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
                    e.preventDefault();
                }
                velocity -= e.deltaX * 0.02;
            }, { passive: false });

            row.addEventListener('touchstart', e => {
                isSwiping = false;
                startX = lastX = e.touches[0].clientX;
                lastTime = Date.now();
            }, { passive: true });

            row.addEventListener('touchmove', e => {
                const currentX = e.touches[0].clientX;
                const now = Date.now();
                const dt = now - lastTime;

                if (Math.abs(currentX - startX) > 10) isSwiping = true;
                if (dt > 0) velocity += ((currentX - lastX) / dt) * 2;

                lastX = currentX;
                lastTime = now;
            }, { passive: true });

            row.addEventListener('click', (e) => {
                if (isSwiping) return;
                const card = e.target.closest('.carousel-card');
                if (card) {
                    const targetImgIdx = parseInt(card.dataset.idx);
                    openOverlay(targetImgIdx, rowImages);
                }
            });

            window.addEventListener('resize', () => { setTimeout(setup, 150); });
        });

        carouselInitialized = true;
    }

    // Hydrate immediately if TATC_CONTENT is ready, or wait for the engine event
    if (window.TATC_CONTENT) {
        initCarousel();
    } else {
        document.addEventListener('cms:ready', () => {
            initCarousel();
        });
    }
});