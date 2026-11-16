/**
 * Hero 3D scene — blocky "Roblox-style" world:
 *  - a floating voxel grass island with a glowing golden egg on top (Steal an Egg vibe)
 *  - rarity-colored eggs and swirl "devil fruits" floating around (Blox Fruits vibe)
 *  - a low-poly animated ocean below and drifting grass blocks
 * Colors follow the CSS theme; while a stream is live the big egg turns red and pulses.
 * All geometry is original, built in code.
 */
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const canvas = document.getElementById('scene');
const hero = document.getElementById('home');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const mobile = window.innerWidth < 768;

const cssColor = (name, fallback) => {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return new THREE.Color(v || fallback);
};
const isLight = () => cssColor('--bg', '#0a1230').getHSL({}).l > 0.5;
const rand = (a, b) => a + Math.random() * (b - a);

/* ------------------------------------------------------------ geometry */

function eggGeometry(radius = 0.72) {
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI;
    const r = Math.sin(a) * radius * (1 + 0.16 * Math.cos(a)); // wider at the bottom
    pts.push(new THREE.Vector2(Math.max(r, 0.0001), -Math.cos(a)));
  }
  return new THREE.LatheGeometry(pts, 28);
}

/** Canvas texture: spots for eggs, swirls for fruits. */
function makeTexture(base, mark, kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  g.strokeStyle = g.fillStyle = mark;
  if (kind === 'swirl') {
    g.lineWidth = 14;
    for (let k = 0; k < 4; k++) {
      g.beginPath();
      for (let t = 0; t < 7; t += 0.1) {
        const r = 6 + t * 9;
        g.lineTo(32 + k * 64 + Math.cos(t * 2) * r * 0.25, 128 + Math.sin(t * 2) * r);
      }
      g.stroke();
    }
  } else {
    for (let k = 0; k < 14; k++) {
      g.beginPath();
      g.arc(rand(0, 256), rand(30, 226), rand(8, 20), 0, Math.PI * 2);
      g.fill();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const RARITY = [
  ['#f4f1e6', '#d9d2bd'], // common
  ['#5ee37a', '#2a9d4a'], // uncommon
  ['#4cc3ff', '#1a73c9'], // rare
  ['#c27bff', '#7a2fd0'], // epic
  ['#ffd23f', '#ff9d00'], // legendary
  ['#ff6ad5', '#6af0ff'], // mythic
];
const FRUITS = [
  ['#8b3dff', '#d6b3ff'],
  ['#ff4d4d', '#ffc2c2'],
  ['#2fbf71', '#b8ffd6'],
  ['#ff9d1f', '#ffe0a8'],
  ['#2b8cff', '#bfe0ff'],
];

/* --------------------------------------------------------------- scene */

function start() {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    canvas.remove();
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
  camera.position.set(0, 1.6, 12);

  const hemi = new THREE.HemisphereLight(0xbfe6ff, 0x2a1d0f, 1.6);
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(4, 8, 6);
  const eggLight = new THREE.PointLight(0xffcc00, 30, 12);
  scene.add(hemi, sun, eggLight);

  const world = new THREE.Group(); // island + big egg (moves as one)
  scene.add(world);

  /* ---- voxel island ---- */
  const box = new THREE.BoxGeometry(1, 1, 1);
  const grassTop = new THREE.MeshLambertMaterial({ color: '#4ccf4f' });
  const grassSide = new THREE.MeshLambertMaterial({ color: '#8a5a2b' });
  const dirt = new THREE.MeshLambertMaterial({ color: '#6b4220' });
  const blockMats = [grassSide, grassSide, grassTop, dirt, grassSide, grassSide];
  const island = new THREE.Group();
  const R = 2;
  for (let x = -R; x <= R; x++)
    for (let z = -R; z <= R; z++) {
      if (Math.abs(x) + Math.abs(z) > R + 1) continue;
      const top = new THREE.Mesh(box, blockMats);
      top.position.set(x, 0, z);
      island.add(top);
      const depth = R + 1 - Math.max(Math.abs(x), Math.abs(z)); // tapered underside
      for (let d = 1; d <= depth; d++) {
        const b = new THREE.Mesh(box, dirt);
        b.position.set(x, -d, z);
        island.add(b);
      }
    }
  island.scale.setScalar(0.55);
  world.add(island);

  /* ---- big golden egg + rarity ring + sparkles ---- */
  const bigEggMat = new THREE.MeshStandardMaterial({
    map: makeTexture('#ffd23f', '#ff9d00', 'spots'),
    emissive: new THREE.Color('#ffb300'),
    emissiveIntensity: 0.35,
    metalness: 0.25,
    roughness: 0.35,
  });
  const bigEgg = new THREE.Mesh(eggGeometry(0.72), bigEggMat);
  bigEgg.scale.setScalar(0.95);
  bigEgg.position.y = 1.5;
  world.add(bigEgg);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(1.05, 0.06, 8, 48),
    new THREE.MeshBasicMaterial({ color: '#ffcc00', transparent: true, opacity: 0.85 }),
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.55;
  world.add(ring);

  const sparkCount = mobile ? 40 : 90;
  const sparkGeo = new THREE.BufferGeometry();
  const sparkPos = new Float32Array(sparkCount * 3);
  const sparkSeed = new Float32Array(sparkCount);
  for (let i = 0; i < sparkCount; i++) {
    sparkSeed[i] = Math.random();
  }
  sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
  const sparkMat = new THREE.PointsMaterial({ color: '#fff3a8', size: 0.07, transparent: true, opacity: 0.9, depthWrite: false });
  const sparks = new THREE.Points(sparkGeo, sparkMat);
  world.add(sparks);

  /* ---- floating eggs & fruits ---- */
  const floaters = [];
  const smallEgg = eggGeometry(0.72);
  const eggCount = mobile ? 7 : 14;
  for (let i = 0; i < eggCount; i++) {
    const [base, mark] = RARITY[i % RARITY.length];
    const m = new THREE.Mesh(
      smallEgg,
      new THREE.MeshStandardMaterial({ map: makeTexture(base, mark, 'spots'), roughness: 0.4, emissive: new THREE.Color(base), emissiveIntensity: 0.08 }),
    );
    m.scale.setScalar(rand(0.22, 0.42));
    floaters.push(m);
  }
  const fruitGeo = new THREE.SphereGeometry(0.5, 24, 16);
  const leafGeo = new THREE.ConeGeometry(0.14, 0.32, 5);
  const stemMat = new THREE.MeshLambertMaterial({ color: '#2f9e44' });
  const fruitCount = mobile ? 5 : 10;
  for (let i = 0; i < fruitCount; i++) {
    const [base, mark] = FRUITS[i % FRUITS.length];
    const g = new THREE.Group();
    g.add(new THREE.Mesh(fruitGeo, new THREE.MeshStandardMaterial({ map: makeTexture(base, mark, 'swirl'), roughness: 0.3, metalness: 0.1 })));
    const leaf = new THREE.Mesh(leafGeo, stemMat);
    leaf.position.set(0.08, 0.55, 0);
    leaf.rotation.z = -0.5;
    g.add(leaf);
    g.scale.setScalar(rand(0.35, 0.6));
    floaters.push(g);
  }
  const blockCount = mobile ? 6 : 14;
  for (let i = 0; i < blockCount; i++) {
    const b = new THREE.Mesh(box, blockMats);
    b.scale.setScalar(rand(0.25, 0.55));
    floaters.push(b);
  }
  for (const f of floaters) {
    f.position.set(rand(-14, 14), rand(-1.5, 6.5), rand(-16, 2));
    f.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
    f.userData = { spin: new THREE.Vector2(rand(-0.6, 0.6), rand(-0.8, 0.8)), bob: rand(0, Math.PI * 2), base: f.position.y };
    scene.add(f);
  }

  /* ---- ocean ---- */
  const segs = mobile ? 36 : 56;
  const seaGeo = new THREE.PlaneGeometry(90, 60, segs, segs);
  seaGeo.rotateX(-Math.PI / 2);
  const seaBase = Float32Array.from(seaGeo.attributes.position.array);
  const seaMat = new THREE.MeshStandardMaterial({ color: '#1fb6ff', flatShading: true, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.92 });
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.position.set(0, -3.4, -12);
  scene.add(sea);

  /* ---- theme + live ---- */
  let live = false;
  function applyColors() {
    const light = isLight();
    const bg = cssColor('--bg', '#0a1230');
    scene.fog = new THREE.Fog(light ? new THREE.Color('#bfe6ff') : bg, 20, 50);
    seaMat.color.copy(cssColor('--sea', '#1fb6ff'));
    hemi.intensity = light ? 2.0 : 1.3;
    sun.intensity = light ? 2.6 : 1.4;
    const glow = live ? new THREE.Color('#ff3b3b') : new THREE.Color('#ffb300');
    bigEggMat.emissive.copy(glow);
    ring.material.color.copy(live ? new THREE.Color('#ff3b3b') : new THREE.Color('#ffcc00'));
    sparkMat.color.set(live ? '#ffb3b3' : '#fff3a8');
    eggLight.color.copy(glow);
  }
  applyColors();
  window.addEventListener('themechange', applyColors);
  window.addEventListener('livechange', (e) => {
    if (live !== e.detail.live) {
      live = e.detail.live;
      applyColors();
    }
  });

  /* ---- layout ---- */
  function layout() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const wide = w >= 900;
    // Desktop: island on the right. Phone: small, top-right corner, pushed back behind the text.
    world.position.set(wide ? 4.2 : 2.2, wide ? -0.2 : 4.6, wide ? 0 : -6);
    world.scale.setScalar(wide ? 1.35 : 0.75);
    eggLight.position.set(world.position.x, world.position.y + 2.5, world.position.z + 1.5);
    if (reduced) renderer.render(scene, camera);
  }
  new ResizeObserver(layout).observe(canvas);
  layout();

  /* ---- interaction ---- */
  let px = 0, py = 0, scrollY = 0;
  window.addEventListener('pointermove', (e) => {
    px = e.clientX / window.innerWidth - 0.5;
    py = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });
  window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

  /* ---- loop ---- */
  const clock = new THREE.Clock();
  let raf = 0;
  let visible = true;
  const pos = seaGeo.attributes.position;

  function frame() {
    const t = clock.getElapsedTime();

    world.rotation.y = Math.sin(t * 0.25) * 0.35 + px * 0.5 + scrollY * 0.0015;
    world.position.y += ((canvas.clientWidth >= 900 ? -0.2 : 4.6) + Math.sin(t * 0.9) * 0.15 - world.position.y) * 0.1;

    bigEgg.rotation.y = t * 0.8;
    const pulse = live ? 0.5 + Math.sin(t * 6) * 0.35 : 0.35 + Math.sin(t * 2) * 0.1;
    bigEggMat.emissiveIntensity = pulse;
    bigEgg.position.y = 1.5 + Math.sin(t * 1.6) * 0.12;
    ring.rotation.z = t * 0.6;
    ring.scale.setScalar(1 + Math.sin(t * 2) * 0.05);

    for (let i = 0; i < sparkCount; i++) {
      const s = sparkSeed[i];
      const life = (t * 0.35 + s) % 1;
      const ang = s * Math.PI * 20 + t * 0.4;
      const rad = 0.6 + s * 0.9;
      sparkPos[i * 3] = Math.cos(ang) * rad;
      sparkPos[i * 3 + 1] = 0.6 + life * 2.6;
      sparkPos[i * 3 + 2] = Math.sin(ang) * rad;
    }
    sparkGeo.attributes.position.needsUpdate = true;
    sparkMat.opacity = 0.5 + Math.sin(t * 3) * 0.3;

    for (const f of floaters) {
      f.rotation.x += f.userData.spin.x * 0.01;
      f.rotation.y += f.userData.spin.y * 0.01;
      f.position.y = f.userData.base + Math.sin(t * 0.8 + f.userData.bob) * 0.4;
    }

    for (let i = 0; i < pos.count; i++) {
      const x = seaBase[i * 3];
      const z = seaBase[i * 3 + 2];
      pos.array[i * 3 + 1] = Math.sin(x * 0.35 + t * 1.2) * 0.28 + Math.cos(z * 0.3 + t * 0.9) * 0.28;
    }
    pos.needsUpdate = true;

    camera.position.x += (px * 1.6 - camera.position.x) * 0.04;
    camera.position.y += (1.6 - py * 0.9 - camera.position.y) * 0.04;
    camera.lookAt(0, 0.6, 0);

    renderer.render(scene, camera);
    raf = requestAnimationFrame(frame);
  }

  function setRunning() {
    const run = visible && !document.hidden && !reduced;
    if (run && !raf) raf = requestAnimationFrame(frame);
    if (!run && raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; setRunning(); }).observe(hero);
  document.addEventListener('visibilitychange', setRunning);

  if (reduced) renderer.render(scene, camera);
  else setRunning();
}

if (canvas) start();
