import * as THREE from 'three';
import { EYE_HEIGHT } from './config.js';

// The map: one open-air hallway. The player stands near one end looking down
// -z. Each side wall has two doorways, at a near depth and a far depth, and
// every doorway opens into a small side room. Agents wait in the rooms and
// step, strafe or cross out of the doorways.
export const HALL = {
  halfWidth: 4.2,        // inner faces of the side walls sit at x = ±4.2
  wallT: 0.5,
  wallH: 5.6,
  zBack: 5,              // wall behind the player
  zEnd: -48,             // end wall
  doors: [-13, -34],     // door centers (both sides)
  doorW: 2.6,
  doorH: 3.3,
  roomDepth: 4.6,
  roomHalfLen: 2.8,
};
const DOOR_LABELS = [['A1', 'B1'], ['A2', 'B2']]; // [depth][left, right]

// ---------------------------------------------------------------------------
// Painted textures (canvas)

function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')];
}

function toTexture(canvas, rx = 1, ry = 1) {
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(rx, ry);
  return t;
}

/** Draw something at (x, y) and at its wrapped copies so the texture tiles. */
function wrapped(W, H, x, y, r, draw) {
  for (const dx of [-W, 0, W]) {
    for (const dy of [-H, 0, H]) {
      const px = x + dx;
      const py = y + dy;
      if (px + r > 0 && px - r < W && py + r > 0 && py - r < H) draw(px, py);
    }
  }
}

/** Soft, stretched brush dabs: the base of the hand-painted look. */
function brush(g, W, H, rand, { count, palette, minR, maxR, alpha, stretch = 2.4, angle = null }) {
  for (let i = 0; i < count; i++) {
    const x = rand() * W;
    const y = rand() * H;
    const r = minR + rand() * (maxR - minR);
    const a = angle === null ? rand() * Math.PI : angle + (rand() - 0.5) * 0.5;
    g.fillStyle = palette[(rand() * palette.length) | 0];
    g.globalAlpha = alpha * (0.5 + rand());
    wrapped(W, H, x, y, r * stretch, (px, py) => {
      g.save();
      g.translate(px, py);
      g.rotate(a);
      g.scale(stretch, 1);
      g.beginPath();
      g.arc(0, 0, r, 0, Math.PI * 2);
      g.fill();
      g.restore();
    });
  }
  g.globalAlpha = 1;
}

function crack(g, rand, x, y, len, color) {
  g.strokeStyle = color;
  g.lineWidth = 1.4;
  g.globalAlpha = 0.45;
  g.beginPath();
  g.moveTo(x, y);
  let a = rand() * Math.PI * 2;
  for (let i = 0; i < len; i++) {
    a += (rand() - 0.5) * 1.1;
    x += Math.cos(a) * 9;
    y += Math.sin(a) * 9;
    g.lineTo(x, y);
  }
  g.stroke();
  g.globalAlpha = 1;
}

function plasterTexture() {
  const [c, g] = makeCanvas(512, 512);
  const rand = rng(41);
  g.fillStyle = '#e8d5b3';
  g.fillRect(0, 0, 512, 512);
  brush(g, 512, 512, rand, { count: 240, palette: ['#f2e2c2', '#dcc39e', '#ecd7b3', '#d4ba94', '#f0dcb8'], minR: 16, maxR: 64, alpha: 0.2 });
  brush(g, 512, 512, rand, { count: 420, palette: ['#fbefd6', '#cfb48e', '#e2c9a3'], minR: 3, maxR: 11, alpha: 0.14 });
  for (let i = 0; i < 4; i++) crack(g, rand, rand() * 512, rand() * 512, 6 + rand() * 8, '#a88b67');
  return toTexture(c);
}

function wainscotTexture() {
  // 2 m wide x 1.1 m tall: two recessed panels, a top rail and a kick board
  const [c, g] = makeCanvas(512, 280);
  const rand = rng(52);
  g.fillStyle = '#3e8c87';
  g.fillRect(0, 0, 512, 280);
  brush(g, 512, 280, rand, { count: 160, palette: ['#4a9a94', '#367f7a', '#43928c', '#2f746f'], minR: 10, maxR: 40, alpha: 0.22, angle: 0 });
  g.fillStyle = '#4fa29c';
  g.fillRect(0, 0, 512, 26);
  g.fillStyle = '#7cc4bb';
  g.fillRect(0, 0, 512, 4);
  g.fillStyle = '#285f5b';
  g.fillRect(0, 252, 512, 28);
  for (const x0 of [22, 278]) {
    g.fillStyle = '#2d6c68';
    g.fillRect(x0, 46, 212, 186);
    g.fillStyle = '#3a8681';
    g.fillRect(x0 + 8, 54, 196, 170);
    g.fillStyle = '#5aa9a2';
    g.fillRect(x0 + 8, 54, 196, 4);
    g.fillRect(x0 + 8, 54, 4, 170);
  }
  brush(g, 512, 280, rand, { count: 120, palette: ['#5fb0a9', '#2b6a66'], minR: 2, maxR: 8, alpha: 0.18 });
  return toTexture(c);
}

function stoneTexture() {
  // Sandstone blocks, 2 m tile, 4 courses
  const [c, g] = makeCanvas(512, 512);
  const rand = rng(63);
  g.fillStyle = '#8b6a4a';
  g.fillRect(0, 0, 512, 512);
  const tones = ['#c09669', '#b88d61', '#c99f72', '#b08459', '#c49a6c'];
  for (let row = 0; row < 4; row++) {
    const y = row * 128;
    let x = row % 2 ? -96 : 0;
    while (x < 512) {
      const w = 160 + ((rand() * 3) | 0) * 32;
      g.fillStyle = tones[(rand() * tones.length) | 0];
      wrapped(512, 512, x + w / 2, y + 64, w, (px) => g.fillRect(px - w / 2 + 3, y + 3, w - 6, 122));
      g.fillStyle = 'rgba(255,240,210,0.35)';
      wrapped(512, 512, x + w / 2, y + 64, w, (px) => g.fillRect(px - w / 2 + 3, y + 3, w - 6, 5));
      x += w;
    }
  }
  brush(g, 512, 512, rand, { count: 260, palette: ['#d2aa7b', '#a67c52', '#c59b6d', '#9c7550'], minR: 6, maxR: 26, alpha: 0.16 });
  for (let i = 0; i < 5; i++) crack(g, rand, rand() * 512, rand() * 512, 4 + rand() * 5, '#7a5a3c');
  return toTexture(c);
}

function floorTexture() {
  // 4 m x 4 m: four big flagstones with painted variation
  const [c, g] = makeCanvas(1024, 1024);
  const rand = rng(74);
  g.fillStyle = '#8f7657';
  g.fillRect(0, 0, 1024, 1024);
  const tones = ['#d6bc92', '#cbb087', '#dec59d', '#d0b48b'];
  for (let ty = 0; ty < 2; ty++) {
    for (let tx = 0; tx < 2; tx++) {
      const x = tx * 512;
      const y = ty * 512;
      g.save();
      g.beginPath();
      g.rect(x + 6, y + 6, 500, 500);
      g.clip();
      g.fillStyle = tones[ty * 2 + tx];
      g.fillRect(x, y, 512, 512);
      brush(g, 1024, 1024, rand, { count: 90, palette: ['#e4cda6', '#c3a67c', '#dcc199', '#bea076'], minR: 20, maxR: 70, alpha: 0.22 });
      g.restore();
      g.fillStyle = 'rgba(255,244,220,0.45)';
      g.fillRect(x + 6, y + 6, 500, 5);
      g.fillRect(x + 6, y + 6, 5, 500);
      g.fillStyle = 'rgba(80,60,40,0.25)';
      g.fillRect(x + 6, y + 501, 500, 5);
    }
  }
  brush(g, 1024, 1024, rand, { count: 500, palette: ['#ead4ae', '#b39670', '#cdb189'], minR: 3, maxR: 10, alpha: 0.15 });
  for (let i = 0; i < 10; i++) crack(g, rand, rand() * 1024, rand() * 1024, 5 + rand() * 7, '#8c714f');
  return toTexture(c);
}

function runnerTexture() {
  // Center carpet: 2.2 m wide x 2 m long
  const [c, g] = makeCanvas(512, 464);
  const rand = rng(85);
  g.fillStyle = '#b4513b';
  g.fillRect(0, 0, 512, 464);
  brush(g, 512, 464, rand, { count: 140, palette: ['#c05d45', '#a44834', '#ba5740'], minR: 12, maxR: 40, alpha: 0.25, angle: Math.PI / 2 });
  g.fillStyle = '#7f3326';
  g.fillRect(0, 0, 40, 464);
  g.fillRect(472, 0, 40, 464);
  g.fillStyle = '#e2b35b';
  g.fillRect(40, 0, 8, 464);
  g.fillRect(464, 0, 8, 464);
  g.fillStyle = '#8f3a2a';
  for (let y = 0; y < 464; y += 116) {
    g.beginPath();
    g.moveTo(256, y + 18);
    g.lineTo(296, y + 58);
    g.lineTo(256, y + 98);
    g.lineTo(216, y + 58);
    g.closePath();
    g.fill();
    g.fillStyle = '#e2b35b';
    g.fillRect(250, y + 52, 12, 12);
    g.fillStyle = '#8f3a2a';
  }
  return toTexture(c);
}

function woodTexture() {
  const [c, g] = makeCanvas(256, 256);
  const rand = rng(96);
  g.fillStyle = '#6a4530';
  g.fillRect(0, 0, 256, 256);
  brush(g, 256, 256, rand, { count: 140, palette: ['#7c553a', '#5a3926', '#714a33'], minR: 3, maxR: 9, alpha: 0.4, stretch: 9, angle: 0 });
  return toTexture(c);
}

function signTexture(label, meters, accent) {
  const [c, g] = makeCanvas(256, 112);
  g.fillStyle = '#1f3d3b';
  g.fillRect(0, 0, 256, 112);
  g.strokeStyle = '#e2b35b';
  g.lineWidth = 6;
  g.strokeRect(5, 5, 246, 102);
  g.fillStyle = accent;
  g.font = '900 62px "Arial Narrow", Arial, sans-serif';
  g.textAlign = 'left';
  g.textBaseline = 'middle';
  g.fillText(label, 22, 58);
  g.fillStyle = '#f2e6cc';
  g.font = '700 30px "Arial Narrow", Arial, sans-serif';
  g.textAlign = 'right';
  g.fillText(`${meters} M`, 234, 60);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function muralTexture() {
  const [c, g] = makeCanvas(1024, 640);
  const rand = rng(107);
  g.fillStyle = '#e6d1ac';
  g.fillRect(0, 0, 1024, 640);
  brush(g, 1024, 640, rand, { count: 200, palette: ['#f0dfbd', '#d8bf99', '#e9d3ad'], minR: 20, maxR: 80, alpha: 0.2 });
  // big painted emblem: a ring with a chevron, crossed by a sodium head line
  g.save();
  g.translate(512, 300);
  g.lineWidth = 46;
  g.strokeStyle = '#b4513b';
  g.beginPath();
  g.arc(0, 0, 170, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = '#3e8c87';
  g.beginPath();
  g.moveTo(-110, 60);
  g.lineTo(0, -90);
  g.lineTo(110, 60);
  g.lineTo(60, 60);
  g.lineTo(0, -20);
  g.lineTo(-60, 60);
  g.closePath();
  g.fill();
  g.restore();
  g.fillStyle = '#e2a93a';
  g.fillRect(170, 236, 684, 16);
  g.fillStyle = '#2f2a25';
  g.font = '900 86px "Arial Narrow", Arial, sans-serif';
  g.textAlign = 'center';
  g.fillText('HEADLINE', 512, 590);
  brush(g, 1024, 640, rand, { count: 160, palette: ['#e6d1ac', '#d7bd96'], minR: 4, maxR: 16, alpha: 0.18 });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function cloudTexture() {
  const [c, g] = makeCanvas(256, 128);
  const rand = rng(118);
  for (let i = 0; i < 26; i++) {
    const x = 40 + rand() * 176;
    const y = 50 + rand() * 40 - Math.abs(x - 128) * 0.15;
    const r = 18 + rand() * 26;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, 'rgba(255,255,255,0.9)');
    grd.addColorStop(0.6, 'rgba(255,250,240,0.55)');
    grd.addColorStop(1, 'rgba(255,250,240,0)');
    g.fillStyle = grd;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------------------------------------------------------------------------
// Painted world material: soft toon ramp, big brush-like tone variation,
// a sunlit-top gradient on walls and darker floor edges along the walls.

let worldRamp = null;
function rampTexture() {
  if (worldRamp) return worldRamp;
  const vals = [146, 152, 164, 188, 216, 236, 249, 255];
  const data = new Uint8Array(vals.length * 4);
  vals.forEach((v, i) => data.set([v, v, v, 255], i * 4));
  worldRamp = new THREE.DataTexture(data, vals.length, 1, THREE.RGBAFormat);
  worldRamp.minFilter = worldRamp.magFilter = THREE.LinearFilter;
  worldRamp.needsUpdate = true;
  return worldRamp;
}

function paintedMaterial(opts, { floor = false, wall = true } = {}) {
  const mat = new THREE.MeshToonMaterial({ gradientMap: rampTexture(), ...opts });
  const uFloor = { value: floor ? 1 : 0 };
  const uWall = { value: wall && !floor ? 1 : 0 };
  const uHallW = { value: HALL.halfWidth };
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uFloorAO = uFloor;
    shader.uniforms.uWallGrad = uWall;
    shader.uniforms.uHallW = uHallW;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWorldP;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvWorldP = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform float uFloorAO;
uniform float uWallGrad;
uniform float uHallW;
varying vec3 vWorldP;
float wHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float wNoise(vec3 p) {
  vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = wHash(i), b = wHash(i + vec3(1.0, 0.0, 0.0)), c = wHash(i + vec3(0.0, 1.0, 0.0)), d = wHash(i + vec3(1.0, 1.0, 0.0));
  float e = wHash(i + vec3(0.0, 0.0, 1.0)), g = wHash(i + vec3(1.0, 0.0, 1.0)), h = wHash(i + vec3(0.0, 1.0, 1.0)), k = wHash(i + vec3(1.0, 1.0, 1.0));
  return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y), mix(mix(e, g, f.x), mix(h, k, f.x), f.y), f.z);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float wTone = 0.92 + 0.1 * wNoise(vWorldP * 0.45) + 0.06 * wNoise(vWorldP * 2.7);
float wGrad = mix(1.0, mix(0.8, 1.06, smoothstep(0.0, 4.5, vWorldP.y)), uWallGrad);
float wEdge = smoothstep(uHallW - 1.3, uHallW, abs(vWorldP.x)) * (1.0 - step(uHallW + 0.05, abs(vWorldP.x)));
float wFloor = 1.0 - 0.22 * wEdge * uFloorAO;
diffuseColor.rgb *= wTone * wGrad * wFloor;`);
  };
  mat.customProgramCacheKey = () => 'headline-world-v1';
  return mat;
}

/** Concatenate indexed or non-indexed geometries (position, normal, uv) into one. */
function mergeGeometries(geos) {
  let vCount = 0;
  let iCount = 0;
  for (const g of geos) {
    vCount += g.attributes.position.count;
    iCount += g.index ? g.index.count : g.attributes.position.count;
  }
  const pos = new Float32Array(vCount * 3);
  const nor = new Float32Array(vCount * 3);
  const uv = new Float32Array(vCount * 2);
  const idx = vCount > 65535 ? new Uint32Array(iCount) : new Uint16Array(iCount);
  let vo = 0;
  let io = 0;
  for (const g of geos) {
    const p = g.attributes.position;
    pos.set(p.array, vo * 3);
    nor.set(g.attributes.normal.array, vo * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, vo * 2);
    if (g.index) {
      const a = g.index.array;
      for (let i = 0; i < a.length; i++) idx[io + i] = a[i] + vo;
      io += a.length;
    } else {
      for (let i = 0; i < p.count; i++) idx[io + i] = vo + i;
      io += p.count;
    }
    vo += p.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  out.computeBoundingSphere();
  return out;
}

/** Box with UVs in world units so tiling textures keep their scale on any size. */
function boxGeo(w, h, d, su = 2, sv = su) {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    for (let i = 0; i < 4; i++) {
      const k = f * 4 + i;
      uv.setXY(k, (uv.getX(k) * dims[f][0]) / su, (uv.getY(k) * dims[f][1]) / sv);
    }
  }
  return g;
}

// ---------------------------------------------------------------------------

export class World {
  constructor(scene) {
    this.scene = scene;
    this.boxes = [];
    this.lanes = [];
    this.peekSpots = [];
    this.crossSpots = [];
    this.eye = new THREE.Vector3(0, EYE_HEIGHT, 0);
    this._dir = new THREE.Vector3();
    this.mats = {
      plaster: paintedMaterial({ map: plasterTexture(), color: 0xffffff }, { wall: true }),
      plasterRoom: paintedMaterial({ map: plasterTexture(), color: 0xd9c8aa }, { wall: true }),
      wainscot: paintedMaterial({ map: wainscotTexture() }, { wall: false }),
      stone: paintedMaterial({ map: stoneTexture() }, { wall: true }),
      floor: paintedMaterial({ map: floorTexture() }, { floor: true }),
      runner: paintedMaterial({ map: runnerTexture(), polygonOffset: true, polygonOffsetFactor: -2 }, { floor: true }),
      wood: paintedMaterial({ map: woodTexture() }, { wall: false }),
      crate: paintedMaterial({ map: woodTexture(), color: 0xe8c79a }, { wall: false }),
      leaf: paintedMaterial({ color: 0x6f9a3e }, { wall: false }),
      leafDark: paintedMaterial({ color: 0x547c2e }, { wall: false }),
      roof: paintedMaterial({ color: 0xb4583e }, { wall: false }),
      house: paintedMaterial({ color: 0xf0d9b5 }, { wall: true }),
      houseAlt: paintedMaterial({ color: 0xe8c9a6 }, { wall: true }),
      metal: paintedMaterial({ color: 0x3b4a4c }, { wall: false }),
      cloth: paintedMaterial({ color: 0xb4513b }, { wall: false }),
      clothAlt: paintedMaterial({ color: 0x3e8c87 }, { wall: false }),
      gold: paintedMaterial({ color: 0xe2b35b, emissive: 0x6a4a10, emissiveIntensity: 0.4 }, { wall: false }),
    };
    this.buildSky();
    this.buildLights();
    this.buildFloor();
    this.buildHall();
    this.buildRooms();
    this.buildProps();
    this.buildSkyline();
    this.buildSpots();
    this.mergeStatic();
  }

  // Everything in the scene so far is static scenery: merge it into one mesh
  // per material so the hallway costs a few dozen draw calls instead of hundreds.
  // Collision uses this.boxes, which is kept separately.
  mergeStatic() {
    const buckets = new Map();
    for (const obj of [...this.scene.children]) {
      if (!obj.isMesh || obj.userData.keep || obj.material.isShaderMaterial) continue;
      const key = `${obj.material.uuid}|${obj.castShadow}|${obj.receiveShadow}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(obj);
    }
    for (const meshes of buckets.values()) {
      if (meshes.length < 2) continue;
      const geos = meshes.map((m) => {
        m.updateMatrix();
        return m.geometry.clone().applyMatrix4(m.matrix);
      });
      const merged = new THREE.Mesh(mergeGeometries(geos), meshes[0].material);
      merged.castShadow = meshes[0].castShadow;
      merged.receiveShadow = meshes[0].receiveShadow;
      for (const m of meshes) {
        this.scene.remove(m);
        m.geometry.dispose();
      }
      for (const g of geos) g.dispose();
      this.scene.add(merged);
    }
  }

  buildSky() {
    const geo = new THREE.SphereGeometry(420, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(0x3f86d6) },
        horizon: { value: new THREE.Color(0xf4e3c2) },
        bottom: { value: new THREE.Color(0xc9ae86) },
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
          vec3 c = h > 0.0 ? mix(horizon, top, pow(clamp(h, 0.0, 1.0), 0.5)) : mix(horizon, bottom, pow(clamp(-h, 0.0, 1.0), 0.4));
          gl_FragColor = vec4(c, 1.0);
          #include <colorspace_fragment>
        }`,
    });
    const sky = new THREE.Mesh(geo, mat);
    sky.renderOrder = -1;
    sky.frustumCulled = false;
    this.scene.add(sky);
    this.scene.fog = new THREE.Fog(0xeedfc3, 70, 200);

    const cloud = cloudTexture();
    const rand = rng(5);
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloud, transparent: true, depthWrite: false, fog: false, opacity: 0.85 }));
      const a = -Math.PI / 2 + (rand() - 0.5) * 2.6;
      const r = 260 + rand() * 80;
      s.position.set(Math.cos(a) * r, 70 + rand() * 90, Math.sin(a) * r);
      s.scale.set(90 + rand() * 70, 40 + rand() * 25, 1);
      s.renderOrder = -1;
      this.scene.add(s);
    }
  }

  buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xd5e6f7, 0xb48d65, 1.35));
    const sun = new THREE.DirectionalLight(0xfff0d4, 2.5);
    const target = new THREE.Vector3(0, 0, (HALL.zBack + HALL.zEnd) / 2);
    sun.position.copy(target).add(new THREE.Vector3(14, 30, 7));
    sun.target.position.copy(target);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 2; sc.far = 90;
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun, sun.target);
    this.sun = sun;
  }

  buildFloor() {
    const w = (HALL.halfWidth + HALL.wallT + HALL.roomDepth + 1.5) * 2;
    const d = HALL.zBack - HALL.zEnd + 4;
    const tex = this.mats.floor.map;
    tex.repeat.set(w / 4, d / 4);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), this.mats.floor);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, 0, (HALL.zBack + HALL.zEnd) / 2);
    floor.receiveShadow = true;
    this.scene.add(floor);
    // center runner
    const len = HALL.zBack - HALL.zEnd - 2;
    this.mats.runner.map.repeat.set(1, len / 2);
    const runner = new THREE.Mesh(new THREE.PlaneGeometry(2.2, len), this.mats.runner);
    runner.rotation.x = -Math.PI / 2;
    runner.position.set(0, 0.003, (HALL.zBack + HALL.zEnd) / 2 - 0.5);
    runner.receiveShadow = true;
    this.scene.add(runner);
    // ground outside the hallway
    const apron = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), paintedMaterial({ color: 0xbfa27a }, { wall: false }));
    apron.rotation.x = -Math.PI / 2;
    apron.position.y = -0.02;
    this.scene.add(apron);
  }

  addBox(x, y, z, w, h, d, material, { solid = true, shadow = true, su = 2, sv = su, receive = true } = {}) {
    const mesh = new THREE.Mesh(boxGeo(w, h, d, su, sv), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = shadow;
    mesh.receiveShadow = receive;
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

  /** A painted wall run along z with wainscot, trim and cornice on the hallway side. */
  hallWall(side, z0, z1) {
    const H = HALL;
    const len = z0 - z1;
    const zc = (z0 + z1) / 2;
    const x = side * (H.halfWidth + H.wallT / 2);
    const inner = side * H.halfWidth;
    this.addBox(x, H.wallH / 2, zc, H.wallT, H.wallH, len, this.mats.plaster, { su: 3 });
    this.addBox(inner - side * 0.03, 0.55, zc, 0.08, 1.1, len, this.mats.wainscot, { su: 2, sv: 1.1 });
    this.addBox(inner - side * 0.05, 1.15, zc, 0.12, 0.1, len, this.mats.stone, { solid: false, su: 2 });
    this.addBox(inner - side * 0.08, H.wallH - 0.15, zc, 0.2, 0.3, len, this.mats.stone, { solid: false, su: 2 });
  }

  buildHall() {
    const H = HALL;
    const half = H.doorW / 2;
    const doorsDesc = [...H.doors].sort((a, b) => b - a);
    for (const side of [-1, 1]) {
      let z = H.zBack;
      for (const dz of doorsDesc) {
        this.hallWall(side, z, dz + half);
        z = dz - half;
      }
      this.hallWall(side, z, H.zEnd);
      // door frames, lintels and signs
      H.doors.forEach((dz, depth) => {
        const x = side * (H.halfWidth + H.wallT / 2);
        const lintelH = H.wallH - H.doorH;
        this.addBox(x, H.doorH + lintelH / 2, dz, H.wallT, lintelH, H.doorW, this.mats.plaster, { su: 3 });
        for (const s of [-1, 1]) this.addBox(x, (H.doorH + 0.35) / 2, dz + s * (half + 0.16), H.wallT + 0.16, H.doorH + 0.35, 0.32, this.mats.stone, { su: 1.5 });
        this.addBox(x, H.doorH + 0.2, dz, H.wallT + 0.2, 0.4, H.doorW + 0.7, this.mats.stone, { su: 1.5 });
        this.addBox(x - side * 0.02, H.doorH + 0.25, dz, H.wallT + 0.26, 0.5, 0.34, this.mats.stone, { solid: false, su: 1 });
        const label = DOOR_LABELS[depth][side < 0 ? 0 : 1];
        const meters = Math.round(Math.abs(dz));
        // Blade sign sticking out of the wall, facing down the hallway toward the player.
        const sign = new THREE.Mesh(
          new THREE.PlaneGeometry(1.25, 0.55),
          new THREE.MeshBasicMaterial({ map: signTexture(label, meters, side < 0 ? '#f0b44a' : '#6fd6cc'), toneMapped: false }),
        );
        sign.position.set(side * (H.halfWidth - 0.78), H.doorH + 0.95, dz + half + 0.35);
        this.scene.add(sign);
        this.addBox(side * (H.halfWidth - 0.78), H.doorH + 0.95, dz + half + 0.33, 1.32, 0.62, 0.03, this.mats.wood, { solid: false, shadow: false, su: 1 });
        this.addBox(side * (H.halfWidth - 0.7), H.doorH + 1.3, dz + half + 0.33, 1.4, 0.05, 0.05, this.mats.metal, { solid: false, shadow: false });
      });
    }
    // end wall with a painted mural framed by an arch
    const W = (H.halfWidth + H.wallT) * 2;
    this.addBox(0, H.wallH / 2, H.zEnd - H.wallT / 2, W, H.wallH, H.wallT, this.mats.plaster, { su: 3 });
    const mural = new THREE.Mesh(new THREE.PlaneGeometry(H.halfWidth * 2 - 1.4, H.wallH - 1.6), paintedMaterial({ map: muralTexture() }, { wall: false }));
    mural.position.set(0, (H.wallH - 1.6) / 2 + 1.25, H.zEnd + 0.02);
    mural.receiveShadow = true;
    this.scene.add(mural);
    this.addBox(0, 0.55, H.zEnd + 0.03, H.halfWidth * 2, 1.1, 0.08, this.mats.wainscot, { su: 2, sv: 1.1 });
    for (const s of [-1, 1]) this.addBox(s * (H.halfWidth - 0.35), H.wallH / 2, H.zEnd + 0.25, 0.7, H.wallH, 0.5, this.mats.stone, { su: 1.5 });
    this.addBox(0, H.wallH - 0.35, H.zEnd + 0.25, H.halfWidth * 2, 0.7, 0.5, this.mats.stone, { su: 1.5 });
    // wall behind the player
    this.addBox(0, H.wallH / 2, H.zBack + H.wallT / 2, W, H.wallH, H.wallT, this.mats.plaster, { su: 3 });
    this.addBox(0, 0.55, H.zBack - 0.03, H.halfWidth * 2, 1.1, 0.08, this.mats.wainscot, { su: 2, sv: 1.1 });
    // overhead beams
    for (let z = H.zBack - 5; z > H.zEnd + 2; z -= 6.5) {
      this.addBox(0, H.wallH - 0.05, z, W + 0.4, 0.38, 0.42, this.mats.wood, { su: 1.5 });
    }
  }

  buildRooms() {
    const H = HALL;
    const rand = rng(9);
    for (const side of [-1, 1]) {
      for (const dz of H.doors) {
        const x0 = side * (H.halfWidth + H.wallT);
        const x1 = side * (H.halfWidth + H.wallT + H.roomDepth);
        const roomH = H.wallH - 0.6;
        // back wall and two side walls
        this.addBox(x1 + side * (H.wallT / 2), roomH / 2, dz, H.wallT, roomH, H.roomHalfLen * 2 + H.wallT * 2, this.mats.plasterRoom, { su: 3 });
        for (const s of [-1, 1]) {
          this.addBox((x0 + x1) / 2, roomH / 2, dz + s * (H.roomHalfLen + H.wallT / 2), H.roomDepth, roomH, H.wallT, this.mats.plasterRoom, { su: 3 });
        }
        // stone skirting inside
        this.addBox(x1 - side * 0.05, 0.2, dz, 0.1, 0.4, H.roomHalfLen * 2, this.mats.stone, { solid: false, su: 1.5 });
        // crates in the corners, clear of the walking line through the door
        for (const s of [-1, 1]) {
          const cx = x1 - side * 0.65;
          const cz = dz + s * (H.roomHalfLen - 0.65);
          this.addBox(cx, 0.45, cz, 0.9, 0.9, 0.9, this.mats.crate, { su: 0.9 });
          if (rand() < 0.6) {
            const crate = this.addBox(cx, 1.25, cz, 0.7, 0.7, 0.7, this.mats.crate, { su: 0.7 });
            crate.rotation.y = 0.3;
          }
        }
      }
    }
  }

  buildProps() {
    const H = HALL;
    const rand = rng(17);
    // planters hugging the walls, placed where they never cross a sightline to a door
    for (const z of [-5, -21, -42]) {
      for (const side of [-1, 1]) {
        const x = side * (H.halfWidth - 0.38);
        this.addBox(x, 0.36, z, 0.66, 0.72, 1.5, this.mats.stone, { su: 1 });
        for (let i = 0; i < 3; i++) {
          const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 + rand() * 0.12, 1), i % 2 ? this.mats.leafDark : this.mats.leaf);
          leaf.position.set(x + (rand() - 0.5) * 0.12, 0.92 + rand() * 0.18, z - 0.45 + i * 0.45);
          leaf.scale.y = 0.85;
          leaf.castShadow = true;
          this.scene.add(leaf);
        }
      }
    }
    // wall lamps
    const glow = new THREE.MeshBasicMaterial({ color: 0xffd38a, toneMapped: false });
    for (const z of [-7, -20.5, -27.5, -41]) {
      for (const side of [-1, 1]) {
        const x = side * (H.halfWidth - 0.12);
        this.addBox(x, 3.15, z, 0.18, 0.12, 0.3, this.mats.metal, { solid: false, shadow: false });
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), glow);
        bulb.position.set(side * (H.halfWidth - 0.24), 3.0, z);
        this.scene.add(bulb);
      }
    }
    // banners hanging between the doors
    for (const [z, mat] of [[-24, this.mats.cloth], [-24, this.mats.clothAlt]]) {
      const side = mat === this.mats.cloth ? -1 : 1;
      const x = side * (H.halfWidth - 0.04);
      this.addBox(x, 3.9, z, 0.04, 2.2, 1.1, mat, { solid: false, shadow: false, su: 1 });
      this.addBox(x - side * 0.01, 3.9, z, 0.05, 0.25, 0.3, this.mats.gold, { solid: false, shadow: false });
      this.addBox(x, 5.05, z, 0.1, 0.08, 1.3, this.mats.wood, { solid: false, shadow: false });
    }
    // pipe along the top of the right wall
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, HALL.zBack - HALL.zEnd, 10), this.mats.metal);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(H.halfWidth - 0.15, 4.55, (HALL.zBack + HALL.zEnd) / 2);
    this.scene.add(pipe);
  }

  buildSkyline() {
    const rand = rng(23);
    const roofGeo = new THREE.CylinderGeometry(1, 1, 1, 3, 1);
    for (let i = 0; i < 16; i++) {
      const side = i % 2 ? 1 : -1;
      const w = 5 + rand() * 6;
      const d = 5 + rand() * 7;
      const h = 6 + rand() * 6;
      const x = side * (12 + rand() * 14);
      const z = 2 - rand() * 56;
      const house = new THREE.Mesh(boxGeo(w, h, d, 3), rand() < 0.5 ? this.mats.house : this.mats.houseAlt);
      house.position.set(x, h / 2, z);
      this.scene.add(house);
      const roof = new THREE.Mesh(roofGeo, this.mats.roof);
      roof.scale.set(w * 0.62, d + 0.6, 1.9);
      roof.rotation.set(Math.PI / 2, 0, Math.PI / 2);
      roof.position.set(x, h + 0.9, z);
      this.scene.add(roof);
    }
    // a tower past the end wall
    const tower = new THREE.Mesh(boxGeo(5, 18, 5, 3), this.mats.house);
    tower.position.set(3, 9, HALL.zEnd - 12);
    this.scene.add(tower);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(4.2, 4, 4), this.mats.roof);
    cap.position.set(3, 20, HALL.zEnd - 12);
    cap.rotation.y = Math.PI / 4;
    this.scene.add(cap);
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

  // Walk a line through each pair of doors and find where an agent goes from
  // fully hidden (inside a side room) to fully visible (in the hallway).
  buildSpots() {
    const H = HALL;
    const step = 0.12;
    const maxX = H.halfWidth + H.wallT + H.roomDepth - 0.6;
    H.doors.forEach((dz, laneIndex) => {
      const lineZ = dz;
      this.lanes.push({ z: dz });
      const runs = [];
      for (let x = -maxX; x <= maxX; x += step) {
        const s = this.classify(x, lineZ);
        const last = runs[runs.length - 1];
        if (last && last.s === s) last.x1 = x;
        else runs.push({ s, x0: x, x1: x });
      }
      const len = (r) => r.x1 - r.x0 + step;
      const base = { lineZ, band: laneIndex, coverFront: dz + H.doorW / 2 };
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
          const door = DOOR_LABELS[laneIndex][hiddenX < 0 ? 0 : 1];
          this.peekSpots.push({ ...base, dir, hiddenX, visStart, visEnd, door, distance: Math.hypot(midX, lineZ) });
          let k = j + dir;
          if (runs[k] && runs[k].s === 1 && len(runs[k]) < 1.0) k += dir;
          const h2 = runs[k];
          if (h2 && h2.s === 0 && len(h2) >= 0.7 && len(v) >= 2 && len(v) <= 15) {
            const inset2 = Math.min(0.45, len(h2) / 2);
            const endX = dir > 0 ? h2.x0 + inset2 : h2.x1 - inset2;
            this.crossSpots.push({ ...base, dir, hiddenX, endX, visStart, visEnd, door, distance: Math.hypot((hiddenX + endX) / 2, lineZ) });
          }
        }
      }
    });
  }
}
