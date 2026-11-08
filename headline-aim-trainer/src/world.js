import * as THREE from 'three';
import { EYE_HEIGHT } from './config.js';

// Cover layout. Each band is a row of walls at one depth (z is negative,
// the player stands at the origin looking down -z). Blocks: [x, width, height?, kind?]
const BANDS = [
  { z: -8, d: 1.0, blocks: [[-6.6, 3.2], [5.8, 3.0, 2.6, 'panel']] },
  { z: -15, d: 1.0, blocks: [[-11.5, 3.4, 2.4, 'crate'], [-0.8, 3.4], [10.2, 3.2, 2.4, 'crate']] },
  { z: -23, d: 1.1, blocks: [[-17, 3.6, 2.6, 'panel'], [-6.4, 3.4, 2.4, 'crate'], [4.6, 3.4], [15.4, 3.6, 2.8, 'panel']] },
  { z: -32, d: 1.2, blocks: [[-22, 4], [-9.5, 3.8, 2.6, 'crate'], [3.2, 3.8, 2.6, 'panel'], [16.5, 4, 2.6, 'crate']] },
  { z: -42, d: 1.2, blocks: [[-26.5, 4.2, 2.8, 'crate'], [-13.5, 4.2], [0.6, 4.2, 2.8, 'crate'], [13.8, 4.2, 2.8, 'panel'], [27, 4]] },
  { z: -52, d: 1.4, blocks: [[-21, 5, 3, 'panel'], [-4.5, 5, 3, 'crate'], [12, 5, 3]] },
];

const FLOOR = { w: 76, zNear: 9, zFar: -66 };
const WALL_X = 36;

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(canvas, repeat) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat[0], repeat[1]);
  }
  return t;
}

// Deterministic noise so the range looks the same every load.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function speckle(g, w, h, count, colors, rand, size = 2) {
  for (let i = 0; i < count; i++) {
    g.fillStyle = colors[(rand() * colors.length) | 0];
    const s = size * (0.5 + rand());
    g.fillRect(rand() * w, rand() * h, s, s);
  }
}

function floorTexture() {
  const ppm = 24; // pixels per meter
  const W = FLOOR.w * ppm;
  const H = (FLOOR.zNear - FLOOR.zFar) * ppm;
  const [c, g] = makeCanvas(W, H);
  const rand = rng(7);
  g.fillStyle = '#a19c91';
  g.fillRect(0, 0, W, H);
  speckle(g, W, H, 26000, ['rgba(60,55,48,0.10)', 'rgba(255,255,255,0.08)', 'rgba(90,80,70,0.08)'], rand, 3);
  // big blotches
  for (let i = 0; i < 260; i++) {
    const x = rand() * W, y = rand() * H, r = 20 + rand() * 90;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(70,62,52,${0.05 + rand() * 0.06})`);
    grd.addColorStop(1, 'rgba(70,62,52,0)');
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const px = (x) => (x + FLOOR.w / 2) * ppm;
  const py = (z) => (z - FLOOR.zFar) * ppm;
  // slab seams every 4 m
  g.strokeStyle = 'rgba(55,50,44,0.35)';
  g.lineWidth = 2;
  for (let x = -FLOOR.w / 2; x <= FLOOR.w / 2; x += 4) {
    g.beginPath(); g.moveTo(px(x), 0); g.lineTo(px(x), H); g.stroke();
  }
  for (let z = FLOOR.zFar; z <= FLOOR.zNear; z += 4) {
    g.beginPath(); g.moveTo(0, py(z)); g.lineTo(W, py(z)); g.stroke();
  }
  // firing line
  g.fillStyle = '#e8b33a';
  g.fillRect(px(-6), py(1.2) - 5, 12 * ppm, 10);
  for (let x = -6; x < 6; x += 0.8) {
    g.fillStyle = '#1d1d1f';
    g.beginPath();
    g.moveTo(px(x), py(1.2) + 5);
    g.lineTo(px(x + 0.3), py(1.2) - 5);
    g.lineTo(px(x + 0.5), py(1.2) - 5);
    g.lineTo(px(x + 0.2), py(1.2) + 5);
    g.fill();
  }
  // distance lines + painted labels
  for (let d = 5; d <= 60; d += 5) {
    const major = d % 10 === 0;
    g.fillStyle = major ? 'rgba(232,179,58,0.75)' : 'rgba(245,242,232,0.45)';
    g.fillRect(0, py(-d) - (major ? 3 : 2), W, major ? 6 : 4);
    if (major) {
      for (const side of [-1, 1]) {
        g.save();
        g.translate(px(side * 2.8), py(-d) + 30);
        g.scale(1, 2.4);
        g.font = '900 34px "Arial Narrow", Arial, sans-serif';
        g.textAlign = 'center';
        g.fillStyle = 'rgba(245,242,232,0.8)';
        g.fillText(`${d} M`, 0, 0);
        g.restore();
      }
    }
  }
  return toTexture(c);
}

function concreteTexture(seed, base, stripe) {
  const [c, g] = makeCanvas(256, 256);
  const rand = rng(seed);
  g.fillStyle = base;
  g.fillRect(0, 0, 256, 256);
  speckle(g, 256, 256, 3500, ['rgba(0,0,0,0.07)', 'rgba(255,255,255,0.07)'], rand, 2);
  // form-tie holes
  g.fillStyle = 'rgba(40,36,30,0.35)';
  for (const [x, y] of [[48, 150], [128, 150], [208, 150], [48, 70], [128, 70], [208, 70]]) {
    g.beginPath(); g.arc(x, y, 3.5, 0, Math.PI * 2); g.fill();
  }
  if (stripe) {
    g.fillStyle = '#e8b33a';
    g.fillRect(0, 0, 256, 22);
    g.fillStyle = '#1b1b1d';
    for (let x = -32; x < 288; x += 28) {
      g.beginPath();
      g.moveTo(x, 22); g.lineTo(x + 14, 0); g.lineTo(x + 24, 0); g.lineTo(x + 10, 22);
      g.fill();
    }
  }
  // bottom grime
  const grd = g.createLinearGradient(0, 200, 0, 256);
  grd.addColorStop(0, 'rgba(50,42,34,0)');
  grd.addColorStop(1, 'rgba(50,42,34,0.35)');
  g.fillStyle = grd;
  g.fillRect(0, 200, 256, 56);
  return toTexture(c);
}

function crateTexture(seed) {
  const [c, g] = makeCanvas(256, 256);
  const rand = rng(seed);
  g.fillStyle = '#4f6878';
  g.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 256; x += 16) {
    g.fillStyle = 'rgba(255,255,255,0.08)';
    g.fillRect(x, 0, 6, 256);
    g.fillStyle = 'rgba(0,0,0,0.14)';
    g.fillRect(x + 8, 0, 4, 256);
  }
  g.fillStyle = '#3d5361';
  g.fillRect(0, 0, 256, 14);
  g.fillRect(0, 242, 256, 14);
  speckle(g, 256, 256, 1600, ['rgba(120,70,40,0.18)', 'rgba(0,0,0,0.1)'], rand, 2);
  g.fillStyle = 'rgba(240,236,226,0.85)';
  g.font = '700 26px "Arial Narrow", Arial, sans-serif';
  g.fillText('RNG-04', 18, 214);
  return toTexture(c);
}

function panelTexture(seed) {
  const [c, g] = makeCanvas(256, 256);
  const rand = rng(seed);
  g.fillStyle = '#dcd6c8';
  g.fillRect(0, 0, 256, 256);
  speckle(g, 256, 256, 1800, ['rgba(0,0,0,0.05)', 'rgba(255,255,255,0.1)'], rand, 2);
  g.fillStyle = '#d8652b';
  g.fillRect(0, 26, 256, 26);
  g.fillStyle = '#2b2d31';
  g.fillRect(0, 52, 256, 5);
  g.strokeStyle = 'rgba(0,0,0,0.18)';
  g.lineWidth = 2;
  g.strokeRect(10, 70, 236, 176);
  return toTexture(c);
}

function wallTexture() {
  const [c, g] = makeCanvas(512, 256);
  const rand = rng(99);
  g.fillStyle = '#7d8790';
  g.fillRect(0, 0, 512, 256);
  speckle(g, 512, 256, 5000, ['rgba(0,0,0,0.06)', 'rgba(255,255,255,0.05)'], rand, 2);
  for (let x = 0; x <= 512; x += 64) {
    g.fillStyle = 'rgba(30,36,42,0.4)';
    g.fillRect(x, 0, 3, 256);
  }
  g.fillStyle = 'rgba(30,36,42,0.35)';
  g.fillRect(0, 196, 512, 3);
  return toTexture(c, [8, 1]);
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.boxes = [];
    this.bands = [];
    this.peekSpots = [];
    this.crossSpots = [];
    this.eye = new THREE.Vector3(0, EYE_HEIGHT, 0);
    this._dir = new THREE.Vector3();
    this.buildSky();
    this.buildLights();
    this.buildFloor();
    this.buildPerimeter();
    this.buildCover();
    this.buildSpots();
  }

  buildSky() {
    const geo = new THREE.SphereGeometry(420, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(0x4f86c6) },
        horizon: { value: new THREE.Color(0xe4e2d8) },
        bottom: { value: new THREE.Color(0xb4ab98) },
      },
      vertexShader: /* glsl */ `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 top; uniform vec3 horizon; uniform vec3 bottom;
        varying vec3 vDir;
        void main() {
          float h = vDir.y;
          vec3 c = h > 0.0 ? mix(horizon, top, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(horizon, bottom, pow(clamp(-h, 0.0, 1.0), 0.4));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const sky = new THREE.Mesh(geo, mat);
    sky.renderOrder = -1;
    sky.frustumCulled = false;
    this.scene.add(sky);
    this.scene.fog = new THREE.Fog(0xd9d7cc, 70, 190);
  }

  buildLights() {
    const hemi = new THREE.HemisphereLight(0xdbe6f2, 0x6d6152, 1.25);
    this.scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.6);
    sun.position.set(26, 44, 18);
    sun.target.position.set(0, 0, -28);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -46; sc.right = 46; sc.top = 46; sc.bottom = -46; sc.near = 5; sc.far = 140;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun, sun.target);
    this.sun = sun;
  }

  buildFloor() {
    const depth = FLOOR.zNear - FLOOR.zFar;
    const geo = new THREE.PlaneGeometry(FLOOR.w, depth);
    const mat = new THREE.MeshStandardMaterial({ map: floorTexture(), roughness: 0.92, metalness: 0 });
    const floor = new THREE.Mesh(geo, mat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, (FLOOR.zNear + FLOOR.zFar) / 2);
    floor.receiveShadow = true;
    this.scene.add(floor);
    // dirt apron beyond the walls so the horizon is not empty
    const apron = new THREE.Mesh(
      new THREE.PlaneGeometry(600, 600),
      new THREE.MeshStandardMaterial({ color: 0x9b8f78, roughness: 1 }),
    );
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = -0.02;
    this.scene.add(apron);
  }

  addBox(x, y, z, w, h, d, material, { solid = true, shadow = true } = {}) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    if (solid) {
      this.boxes.push({
        min: new THREE.Vector3(x - w / 2, y - h / 2, z - d / 2),
        max: new THREE.Vector3(x + w / 2, y + h / 2, z + d / 2),
        mesh,
      });
    }
    return mesh;
  }

  buildPerimeter() {
    const wallMat = new THREE.MeshStandardMaterial({ map: wallTexture(), roughness: 0.85 });
    const depth = FLOOR.zNear - FLOOR.zFar;
    const midZ = (FLOOR.zNear + FLOOR.zFar) / 2;
    this.addBox(0, 4.5, FLOOR.zFar - 0.5, FLOOR.w + 2, 9, 1, wallMat, { shadow: false });
    this.addBox(-WALL_X - 0.5, 3.5, midZ, 1, 7, depth, wallMat, { shadow: false });
    this.addBox(WALL_X + 0.5, 3.5, midZ, 1, 7, depth, wallMat, { shadow: false });
    this.addBox(0, 3.5, FLOOR.zNear + 0.5, FLOOR.w + 2, 7, 1, wallMat, { shadow: false });

    // lane boards on the back wall
    const [c, g] = makeCanvas(1024, 128);
    g.fillStyle = '#1f2a33';
    g.fillRect(0, 0, 1024, 128);
    g.fillStyle = '#e8b33a';
    g.fillRect(0, 0, 1024, 10);
    g.fillRect(0, 118, 1024, 10);
    g.font = '800 64px "Arial Narrow", Arial, sans-serif';
    g.fillStyle = '#ebe5d6';
    g.textAlign = 'center';
    g.fillText('HEADLINE RANGE  ·  60 M', 512, 88);
    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(24, 3),
      new THREE.MeshStandardMaterial({ map: toTexture(c), roughness: 0.7 }),
    );
    board.position.set(0, 6.2, FLOOR.zFar + 0.02);
    this.scene.add(board);

    // skyline blocks beyond the walls
    const far = new THREE.MeshStandardMaterial({ color: 0x8f969a, roughness: 1 });
    const rand = rng(3);
    for (let i = 0; i < 18; i++) {
      const side = i % 2 ? 1 : -1;
      const h = 8 + rand() * 14;
      const w = 6 + rand() * 10;
      const z = FLOOR.zFar + 10 + rand() * 70;
      const x = side * (WALL_X + 12 + rand() * 30);
      this.addBox(x, h / 2, z, w, h, 6 + rand() * 8, far, { solid: false, shadow: false });
    }
    for (let i = 0; i < 9; i++) {
      const h = 10 + rand() * 18;
      this.addBox(-60 + i * 15 + rand() * 6, h / 2, FLOOR.zFar - 18 - rand() * 30, 8 + rand() * 8, h, 8, far, { solid: false, shadow: false });
    }

    // light poles along the side walls
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a3f45, roughness: 0.6, metalness: 0.5 });
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xfff4d6, emissive: 0xfff0c8, emissiveIntensity: 1.5 });
    for (let z = -6; z > FLOOR.zFar + 4; z -= 14) {
      for (const side of [-1, 1]) {
        this.addBox(side * (WALL_X - 0.6), 4.5, z, 0.22, 9, 0.22, poleMat, { solid: false });
        this.addBox(side * (WALL_X - 1.2), 8.9, z, 1.2, 0.18, 0.5, lampMat, { solid: false, shadow: false });
      }
    }
  }

  buildCover() {
    const mats = {
      concrete: [
        new THREE.MeshStandardMaterial({ map: concreteTexture(11, '#bdb4a2', true), roughness: 0.9 }),
        new THREE.MeshStandardMaterial({ map: concreteTexture(12, '#b0a796', false), roughness: 0.9 }),
      ],
      crate: [new THREE.MeshStandardMaterial({ map: crateTexture(21), roughness: 0.65, metalness: 0.25 })],
      panel: [new THREE.MeshStandardMaterial({ map: panelTexture(31), roughness: 0.75 })],
    };
    let n = 0;
    for (const band of BANDS) {
      const b = { z: band.z, d: band.d, front: band.z + band.d / 2, back: band.z - band.d / 2, blocks: [] };
      for (const [x, w, h = 2.4, kind = 'concrete'] of band.blocks) {
        const list = mats[kind];
        const mat = list[n++ % list.length];
        this.addBox(x, h / 2, band.z, w, h, band.d, mat);
        b.blocks.push({ x, w, h });
      }
      this.bands.push(b);
    }
  }

  /** Nearest hit of a ray against the solid boxes. Returns {t, box, normal} or null. */
  intersectRay(o, d, maxT = Infinity) {
    let best = maxT;
    let hit = null;
    const ox = o.x, oy = o.y, oz = o.z;
    const dx = d.x, dy = d.y, dz = d.z;
    for (const b of this.boxes) {
      let t0 = 0, t1 = best, axis = -1, sign = 0, ok = true;
      for (let i = 0; i < 3; i++) {
        const oi = i === 0 ? ox : i === 1 ? oy : oz;
        const di = i === 0 ? dx : i === 1 ? dy : dz;
        const mn = i === 0 ? b.min.x : i === 1 ? b.min.y : b.min.z;
        const mx = i === 0 ? b.max.x : i === 1 ? b.max.y : b.max.z;
        if (Math.abs(di) < 1e-9) {
          if (oi < mn || oi > mx) { ok = false; break; }
          continue;
        }
        let ta = (mn - oi) / di, tb = (mx - oi) / di, s = -1;
        if (ta > tb) { const tmp = ta; ta = tb; tb = tmp; s = 1; }
        if (ta > t0) { t0 = ta; axis = i; sign = s; }
        if (tb < t1) t1 = tb;
        if (t0 > t1) { ok = false; break; }
      }
      if (ok && axis >= 0 && t0 < best) {
        best = t0;
        hit = { t: t0, box: b, axis, sign };
      }
    }
    if (hit) {
      hit.normal = new THREE.Vector3();
      hit.normal.setComponent(hit.axis, hit.sign);
    }
    return hit;
  }

  /** True when nothing solid sits between the eye and the point. */
  visibleFromEye(x, y, z) {
    const d = this._dir.set(x - this.eye.x, y - this.eye.y, z - this.eye.z);
    const len = d.length();
    d.divideScalar(len);
    return !this.intersectRay(this.eye, d, len - 0.05);
  }

  segmentClear(a, b) {
    const d = this._dir.subVectors(b, a);
    const len = d.length();
    d.divideScalar(len);
    return !this.intersectRay(a, d, len - 0.05);
  }

  pointInsideSolid(p, pad = 0.12) {
    for (const b of this.boxes) {
      if (p.x > b.min.x - pad && p.x < b.max.x + pad && p.y > b.min.y - pad && p.y < b.max.y + pad && p.z > b.min.z - pad && p.z < b.max.z + pad) return true;
    }
    return false;
  }

  /** 0 = fully hidden, 1 = partly visible, 2 = head and chest visible. */
  classify(x, z) {
    let anyVisible = false;
    outer: for (const ox of [-0.32, 0, 0.32]) {
      for (const y of [0.15, 0.6, 1.0, 1.35, 1.62, 1.78]) {
        if (this.visibleFromEye(x + ox, y, z)) { anyVisible = true; break outer; }
      }
    }
    if (!anyVisible) return 0;
    return this.visibleFromEye(x, 1.62, z) && this.visibleFromEye(x, 1.2, z) ? 2 : 1;
  }

  // Walk a line behind each band of cover and find where an agent goes from
  // fully hidden to fully visible. Those edges are the peeks.
  buildSpots() {
    const step = 0.12;
    const maxAngle = Math.tan(56 * Math.PI / 180);
    this.bands.forEach((band, bandIndex) => {
      const lineZ = band.back - 0.75;
      const maxX = Math.min(WALL_X - 3, Math.abs(lineZ) * maxAngle);
      const runs = [];
      for (let x = -maxX; x <= maxX; x += step) {
        const s = this.classify(x, lineZ);
        const last = runs[runs.length - 1];
        if (last && last.s === s) last.x1 = x;
        else runs.push({ s, x0: x, x1: x });
      }
      const len = (r) => r.x1 - r.x0 + step;
      const base = { lineZ, band: bandIndex, coverFront: band.front };
      for (let i = 0; i < runs.length; i++) {
        const r = runs[i];
        if (r.s !== 0 || len(r) < 0.7) continue;
        for (const dir of [1, -1]) {
          let j = i + dir;
          if (runs[j] && runs[j].s === 1 && len(runs[j]) < 1.0) j += dir;
          const v = runs[j];
          if (!v || v.s !== 2 || len(v) < 1.6) continue;
          const inset = Math.min(0.45, len(r) / 2);
          const hiddenX = dir > 0 ? r.x1 - inset : r.x0 + inset;
          const visStart = dir > 0 ? v.x0 : v.x1;
          const visEnd = dir > 0 ? v.x1 : v.x0;
          const midX = visStart + dir * Math.min(1.5, len(v) / 2);
          this.peekSpots.push({ ...base, dir, hiddenX, visStart, visEnd, distance: Math.hypot(midX, lineZ) });
          // cross: hidden -> open -> hidden
          let k = j + dir;
          if (runs[k] && runs[k].s === 1 && len(runs[k]) < 1.0) k += dir;
          const h2 = runs[k];
          if (h2 && h2.s === 0 && len(h2) >= 0.7 && len(v) >= 2 && len(v) <= 15) {
            const inset2 = Math.min(0.45, len(h2) / 2);
            const endX = dir > 0 ? h2.x0 + inset2 : h2.x1 - inset2;
            this.crossSpots.push({ ...base, dir, hiddenX, endX, visStart, visEnd, distance: Math.hypot((hiddenX + endX) / 2, lineZ) });
          }
        }
      }
    });
  }
}
