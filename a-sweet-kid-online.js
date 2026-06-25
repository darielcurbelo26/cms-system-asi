import * as THREE from 'https://esm.sh/three@0.163.0';

/* ══════════════════════════════════
   SCENE
══════════════════════════════════ */
const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('canvas'), antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.85;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0a0a0a);
scene.fog = new THREE.FogExp2(0x0a0a0a, 0.055);

const camera = new THREE.PerspectiveCamera(65, innerWidth / innerHeight, 0.05, 80);
camera.position.set(0, 0, 0);

window.addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
});

/* ── room geometry ── */
const R = 5.5, RH = 2.1;

const roomMat = new THREE.MeshStandardMaterial({ color: 0xeae6e1, roughness: 0.95, metalness: 0 });

function addPlane(mat, w, h, px, py, pz, rx, ry) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.position.set(px, py, pz);
  m.rotation.set(rx, ry, 0);
  scene.add(m);
}

const floorM = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2), roomMat);
floorM.rotation.x = -Math.PI / 2; floorM.position.y = -RH; scene.add(floorM);

const ceilM = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2), roomMat);
ceilM.rotation.x = Math.PI / 2; ceilM.position.y = RH; scene.add(ceilM);

addPlane(roomMat, R * 2, RH * 2,  0, 0, -R, 0, 0);
addPlane(roomMat, R * 2, RH * 2,  0, 0,  R, 0, Math.PI);
addPlane(roomMat, R * 2, RH * 2, -R, 0,  0, 0,  Math.PI / 2);
addPlane(roomMat, R * 2, RH * 2,  R, 0,  0, 0, -Math.PI / 2);

/* ── lights ── */
scene.add(new THREE.AmbientLight(0xd0c0e8, 0.75));
const overhead = new THREE.PointLight(0xe0d0f8, 2.2, 26, 1.6);
overhead.position.set(0, RH - 0.2, 0); scene.add(overhead);

/* ── artworks ── */
const AW = 1.1, AH = 1.5;
const ARTS = [
  {
    id: 0, title: 'FRAGMENTED IDENTITY',
    desc: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
    src: 'assets/artworks/a_sweet_kid_fragmented_identity_1773578325456.png',
    pos: [-R + .05, 0, 0], ry: Math.PI / 2,
    cam: [-R + 2.5, 0, 0], look: [-R + .1, 0, 0], lp: [-R * .5, RH - .3, 0]
  },
  {
    id: 1, title: 'NEGATIVE SELF TALK',
    desc: 'Sed do eiusmod tempor incididunt ut labore et dolore magna.',
    src: 'assets/artworks/a_sweet_kid_negative_self_talk_1773578346007.png',
    pos: [0, 0, -R + .05], ry: 0,
    cam: [0, 0, -R + 2.5], look: [0, 0, -R + .1], lp: [0, RH - .3, -R * .5]
  },
  {
    id: 2, title: 'SOLITARY CONFINEMENT',
    desc: 'Ut enim ad minim veniam, quis nostrud exercitation ullamco.',
    src: 'assets/artworks/a_sweet_kid_solitary_confinement_1773578370915.png',
    pos: [R - .05, 0, 0], ry: -Math.PI / 2,
    cam: [R - 2.5, 0, 0], look: [R - .1, 0, 0], lp: [R * .5, RH - .3, 0]
  },
];

const texLoader = new THREE.TextureLoader();
const artMeshes = [];
const spotLights = [];
const clickTargets = [];

function buildArtworks() {
  ARTS.forEach(a => {
    const tex = texLoader.load(a.src);
    tex.colorSpace = THREE.SRGBColorSpace;

    const group = new THREE.Group();
    group.position.set(...a.pos);
    group.rotation.y = a.ry;

    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.15, metalness: 0 });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(AW, AH), mat);
    group.add(mesh);

    clickTargets.push({ mesh, id: a.id });
    artMeshes.push({ mat, id: a.id });
    scene.add(group);

    const spot = new THREE.SpotLight(0xf0e8ff, 22, 16, Math.PI / 6.5, 0.55, 1.5);
    spot.position.set(...a.lp);
    const tgt = new THREE.Object3D();
    tgt.position.set(...a.pos);
    scene.add(tgt);
    spot.target = tgt;
    scene.add(spot);
    spotLights.push({ light: spot, id: a.id });
  });
}

function initCMS(data) {
  if (data && data.gallery_3d) {
    if (data.gallery_3d.audio_src) {
      const audioEl = document.getElementById('audio');
      if (audioEl) audioEl.src = data.gallery_3d.audio_src;
    }
    
    if (data.gallery_3d.artworks && data.gallery_3d.artworks.length > 0) {
      const dbArts = data.gallery_3d.artworks;
      // Camera yaw is clamped to [-90deg, +90deg] (see drag handlers below), a 180deg
      // arc that can only ever reach 3 walls: x=-R, z=-R, x=+R. A 4th wall at z=+R
      // physically exists in the room but the camera can never pan to face it — so
      // only 'left'/'center'/'right' are valid positions here, not a 4th "back" wall.
      const wallMap = {
        'left': { pos: [-R + .05, 0, 0], ry: Math.PI / 2, cam: [-R + 2.5, 0, 0], look: [-R + .1, 0, 0], lp: [-R * .5, RH - .3, 0] },
        'center': { pos: [0, 0, -R + .05], ry: 0, cam: [0, 0, -R + 2.5], look: [0, 0, -R + .1], lp: [0, RH - .3, -R * .5] },
        'right': { pos: [R - .05, 0, 0], ry: -Math.PI / 2, cam: [R - 2.5, 0, 0], look: [R - .1, 0, 0], lp: [R * .5, RH - .3, 0] }
      };

      // Clear the static ARTS and rebuild from CMS
      ARTS.length = 0;
      dbArts.forEach((dbArt) => {
        const wMap = wallMap[dbArt.wall] || wallMap['center'];
        ARTS.push({
          id: dbArt.id,
          title: dbArt.title,
          desc: dbArt.alt || '',
          src: dbArt.src,
          pos: wMap.pos,
          ry: wMap.ry,
          cam: wMap.cam,
          look: wMap.look,
          lp: wMap.lp
        });
      });
    }
  }
  buildArtworks();
}

if (window.TATC_CONTENT) {
  initCMS(window.TATC_CONTENT);
} else {
  document.addEventListener('cms:ready', (e) => initCMS(e.detail));
}

/* ══════════════════════════════════
   CAMERA STATE
══════════════════════════════════ */
const camPos = new THREE.Vector3();
const camLook = new THREE.Vector3(0, 0, -5);
const tPos = new THREE.Vector3();
const tLook = new THREE.Vector3(0, 0, -5);

let yaw = 0, pitch = 0;
let tYaw = 0, tPitch = 0;

const isPortrait = () => innerHeight > innerWidth;
const baseFov = () => isPortrait() ? 85 : 65;
let fov = baseFov(), tFov = baseFov();
window.addEventListener('resize', () => { tFov = baseFov(); });

/* ══════════════════════════════════
   INTERACTION
══════════════════════════════════ */
let focused = null;
let isDragging = false;
let dragStart = { x: 0, y: 0, yaw: 0, pitch: 0 };
let cursorX = 0, cursorY = 0;
let hintGone = false;
let audioPlaying = false;

const cursorEl = document.getElementById('cursor');
document.addEventListener('mousemove', e => {
  cursorX = e.clientX; cursorY = e.clientY;
  cursorEl.style.left = cursorX + 'px';
  cursorEl.style.top = cursorY + 'px';

  if (!hintGone) {
    hintGone = true;
    document.getElementById('hint').style.opacity = '0';
  }

  if (isDragging && focused === null) {
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    tYaw = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, dragStart.yaw + dx * (Math.PI / innerWidth)));
    tPitch = Math.max(-0.22, Math.min(0.22, dragStart.pitch - dy * 0.003));
  }
});

let mouseDownOnCanvas = false;

document.addEventListener('mousedown', e => {
  mouseDownOnCanvas = !e.target.closest('button, a, [id="audio-viz"]');
  isDragging = true;
  dragStart = { x: e.clientX, y: e.clientY, yaw: tYaw, pitch: tPitch };
  if (focused === null && mouseDownOnCanvas) cursorEl.classList.add('drag');
});

document.addEventListener('mouseup', e => {
  if (!isDragging) return;
  const moved = Math.abs(e.clientX - dragStart.x) > 5 || Math.abs(e.clientY - dragStart.y) > 5;
  isDragging = false;
  cursorEl.classList.remove('drag');

  if (!moved && mouseDownOnCanvas) {
    const ndcX = (e.clientX / innerWidth) * 2 - 1;
    const ndcY = -(e.clientY / innerHeight) * 2 + 1;
    raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera);
    const hits = raycaster.intersectObjects(clickTargets.map(t => t.mesh));
    if (hits.length) {
      const found = clickTargets.find(t => t.mesh === hits[0].object);
      if (found && found.id !== focused) setFocus(found.id);
    } else if (focused !== null) {
      setFocus(null);
    }
  }
});

const raycaster = new THREE.Raycaster();
let hoveredId = null;
function checkHover() {
  if (isDragging || focused !== null) {
    cursorEl.classList.remove('hover');
    return;
  }
  const ndcX = (cursorX / innerWidth) * 2 - 1;
  const ndcY = -(cursorY / innerHeight) * 2 + 1;
  raycaster.setFromCamera({ x: ndcX, y: ndcY }, camera);
  const hits = raycaster.intersectObjects(clickTargets.map(t => t.mesh));
  const newHov = hits.length ? clickTargets.find(t => t.mesh === hits[0].object)?.id ?? null : null;
  if (newHov !== hoveredId) {
    hoveredId = newHov;
    cursorEl.classList.toggle('hover', hoveredId !== null);
  }
}

document.addEventListener('wheel', e => {
  if (focused !== null) return;
  e.preventDefault();
  tFov = Math.max(42, Math.min(80, tFov + e.deltaY * 0.035));
}, { passive: false });

let ts = { x: 0, y: 0, yaw: 0, pitch: 0, dist: 0 };
document.addEventListener('touchstart', e => {
  if (focused !== null) return;
  if (e.touches.length === 1) {
    isDragging = true;
    const t = e.touches[0];
    ts = { x: t.clientX, y: t.clientY, yaw: tYaw, pitch: tPitch, dist: 0 };
  }
  if (e.touches.length === 2) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    ts.dist = Math.hypot(dx, dy);
  }
}, { passive: true });

document.addEventListener('touchmove', e => {
  e.preventDefault();
  if (!hintGone) {
    hintGone = true;
    document.getElementById('hint').style.opacity = '0';
  }
  if (e.touches.length === 1 && isDragging && focused === null) {
    tYaw = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, ts.yaw + (e.touches[0].clientX - ts.x) * (Math.PI / innerWidth)));
    tPitch = Math.max(-0.22, Math.min(0.22, ts.pitch - (e.touches[0].clientY - ts.y) * 0.003));
  }
  if (e.touches.length === 2 && focused === null) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const d = Math.hypot(dx, dy);
    tFov = Math.max(42, Math.min(80, tFov + (ts.dist - d) * 0.05));
    ts.dist = d;
  }
}, { passive: false });

document.addEventListener('touchend', () => { isDragging = false; });

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') setFocus(null);
  if (e.key === 'ArrowLeft' && focused !== null && focused > 0) setFocus(focused - 1);
  if (e.key === 'ArrowRight' && focused !== null && focused < ARTS.length - 1) setFocus(focused + 1);
});

/* ── UI ── */
function setFocus(idx) {
  focused = idx;
  const isFoc = focused !== null;
  document.getElementById('focus-bar').classList.toggle('on', isFoc);
  document.getElementById('caption').classList.toggle('on', isFoc);

  if (isFoc) {
    const a = ARTS[focused];
    document.getElementById('cap-title').textContent = a.title;
    document.getElementById('cap-sub').textContent = a.desc;
    document.getElementById('fb-count').textContent = `${focused + 1} / ${ARTS.length}`;
    document.getElementById('fb-prev').style.opacity = focused > 0 ? '1' : '0.2';
    document.getElementById('fb-next').style.opacity = focused < ARTS.length - 1 ? '1' : '0.2';
  }
}

document.getElementById('fb-prev').addEventListener('click', () => { if (focused > 0) setFocus(focused - 1); });
document.getElementById('fb-next').addEventListener('click', () => { if (focused < ARTS.length - 1) setFocus(focused + 1); });
document.getElementById('btn-room').addEventListener('click', () => setFocus(null));

document.getElementById('btn-exit').addEventListener('click', () => {
  if (document.referrer?.includes(location.host)) history.back();
  else location.href = '/';
});

let audioLabel = document.getElementById('btn-audio');
audioLabel.addEventListener('click', toggleAudio);
document.getElementById('audio-viz').addEventListener('click', toggleAudio);
function toggleAudio(e) {
  e.stopPropagation();
  const aud = document.getElementById('audio');
  const bars = document.querySelectorAll('.a-bar');
  audioPlaying = !audioPlaying;
  if (audioPlaying) aud.play().catch(() => { });
  else aud.pause();
  bars.forEach(b => b.style.animationPlayState = audioPlaying ? 'running' : 'paused');
  audioLabel.textContent = audioPlaying ? 'Ambient — on' : 'Ambient';
}

/* ══════════════════════════════════
   RENDER LOOP
══════════════════════════════════ */
const DIM = new THREE.Color(0.035, 0.032, 0.028);
const BRIGHT = new THREE.Color(1, 1, 1);

function animate() {
  requestAnimationFrame(animate);

  const L = 0.055;

  if (focused === null) {
    yaw += (tYaw - yaw) * 0.065;
    pitch += (tPitch - pitch) * 0.065;
    const r = 5;
    tLook.set(Math.sin(yaw) * r, Math.sin(pitch) * r, -Math.cos(yaw) * r);
    tPos.set(0, 0, 0);
  } else {
    const a = ARTS[focused];
    tPos.set(...a.cam);
    tLook.set(...a.look);
  }

  camPos.lerp(tPos, L);
  camLook.lerp(tLook, L);
  camera.position.copy(camPos);
  camera.lookAt(camLook);

  fov += (tFov - fov) * 0.06;
  if (Math.abs(camera.fov - fov) > 0.01) {
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }

  spotLights.forEach(({ light, id }) => {
    const t = focused === null ? 7 : (focused === id ? 18 : 0.4);
    light.intensity += (t - light.intensity) * 0.05;
  });

  artMeshes.forEach(({ mat, id }) => {
    const target = (focused !== null && focused !== id) ? DIM : BRIGHT;
    mat.color.lerp(target, 0.06);
  });

  checkHover();
  renderer.render(scene, camera);
}

animate();

/* ── loader ── */
const fill = document.getElementById('lfill');
const loaderEl = document.getElementById('loader');
let p = 0;
const lt = setInterval(() => {
  p += Math.random() * 12 + 4;
  if (p >= 100) {
    p = 100; clearInterval(lt);
    setTimeout(() => { loaderEl.style.opacity = '0'; setTimeout(() => loaderEl.remove(), 1200); }, 500);
  }
  fill.style.width = p + '%';
}, 55);

setFocus(null);
