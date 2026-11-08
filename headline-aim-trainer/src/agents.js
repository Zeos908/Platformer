import * as THREE from 'three';
import { HEALTH } from './config.js';

// Agents share one skeleton, one set of proportions and one set of per-bone
// hitboxes, the way every agent in the reference game shares a hitbox and an
// in-game height. Only clothing, hair, colors and visual bulk change.
//
// Proportions (meters, standing): total height ~1.78, head center 1.62
// (level with the player's eyes, so head-level crosshair placement works on
// flat ground), head about 1/7.5 of body height, shoulders 1.43, hips 0.90,
// knees 0.49. Crouching drops the head by about 0.4 m.
//
// Art style: soft banded "painted" shading, a vertical tone gradient, a little
// brush-like color variation, a warm rim light plus an optional enemy
// highlight rim, and glowing accent trim.

const geoCache = new Map();
function geo(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}
const box = (w, h, d) => geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const sphere = (r, ws = 16, hs = 12, ps = 0, pl = Math.PI * 2, ts = 0, tl = Math.PI) =>
  geo(`s${r},${ws},${hs},${ps},${pl},${ts},${tl}`, () => new THREE.SphereGeometry(r, ws, hs, ps, pl, ts, tl));
const capsule = (r, l) => geo(`c${r},${l}`, () => new THREE.CapsuleGeometry(r, l, 4, 10));
const cyl = (rt, rb, h, s = 12, open = false) => geo(`y${rt},${rb},${h},${s},${open}`, () => new THREE.CylinderGeometry(rt, rb, h, s, 1, open));
/** Box whose pivot is its top edge, for cloth that hangs and swings. */
const panel = (w, h, d) => geo(`p${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d, 1, 3, 1).translate(0, -h / 2, 0));
const V2 = (x, y) => new THREE.Vector2(x, y);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/** Tapered limb with rounded ends: joint at y = 0, extends down to y = -len. */
function limbGeo(r1, r2, len) {
  const key = `limb${r1.toFixed(4)},${r2.toFixed(4)},${len.toFixed(3)}`;
  return geo(key, () => {
    const pts = [];
    const n = 5;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * (Math.PI / 2);
      pts.push(V2(Math.sin(a) * r2, -len - Math.cos(a) * r2));
    }
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * (Math.PI / 2);
      pts.push(V2(Math.cos(a) * r1, Math.sin(a) * r1));
    }
    return new THREE.LatheGeometry(pts, 12);
  });
}

/** Lathe from (radius, y) pairs, bottom to top. */
function latheGeo(key, pairs, seg = 18) {
  return geo(key, () => new THREE.LatheGeometry(pairs.map(([r, y]) => V2(r, y)), seg));
}

// ---------------------------------------------------------------------------
// Stylized material

const HIGHLIGHT = { color: { value: new THREE.Color(0xff3b3b) }, strength: { value: 0.6 } };
export const HIGHLIGHT_COLORS = { red: 0xff3b3b, yellow: 0xf4e04a, purple: 0xc65bff, off: null };

/** Tint the rim of every agent (like an enemy highlight setting). null turns it off. */
export function setEnemyHighlight(hex) {
  if (hex == null) {
    HIGHLIGHT.strength.value = 0;
  } else {
    HIGHLIGHT.color.value.set(hex);
    HIGHLIGHT.strength.value = 0.6;
  }
}

// Red glow around the head, sized to the head hitbox, so you can see where
// headshots count. Walls still hide it.
const HEAD_GLOW = new THREE.ShaderMaterial({
  uniforms: { uColor: { value: new THREE.Color(0xff2a2a) }, uStrength: { value: 1 } },
  vertexShader: /* glsl */ `
    varying vec3 vN;
    varying vec3 vV;
    void main() {
      vec4 mv = modelViewMatrix * vec4(position, 1.0);
      vN = normalize(normalMatrix * normal);
      vV = normalize(-mv.xyz);
      gl_Position = projectionMatrix * mv;
    }`,
  fragmentShader: /* glsl */ `
    uniform vec3 uColor;
    uniform float uStrength;
    varying vec3 vN;
    varying vec3 vV;
    void main() {
      float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
      gl_FragColor = vec4(uColor * (0.2 + f * 1.25) * uStrength, 1.0);
    }`,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  toneMapped: false,
});

/** Turn the red head highlight on or off for every agent. */
export function setHeadHighlight(on) {
  HEAD_GLOW.uniforms.uStrength.value = on ? 1 : 0;
  HEAD_GLOW.visible = !!on;
}

let ramp = null;
function toonRamp() {
  if (ramp) return ramp;
  // Soft S-curve: a bright lit side, a warm mid band, a lifted shadow side.
  const vals = [118, 124, 136, 162, 200, 230, 247, 255];
  const data = new Uint8Array(vals.length * 4);
  vals.forEach((v, i) => data.set([v, v, v, 255], i * 4));
  ramp = new THREE.DataTexture(data, vals.length, 1, THREE.RGBAFormat);
  ramp.minFilter = ramp.magFilter = THREE.LinearFilter;
  ramp.needsUpdate = true;
  return ramp;
}

function stylize(mat) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uHighlight = HIGHLIGHT.color;
    shader.uniforms.uHighlightK = HIGHLIGHT.strength;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPaintW;\nvarying vec3 vPaintL;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvPaintW = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvPaintL = transformed;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
uniform vec3 uHighlight;
uniform float uHighlightK;
varying vec3 vPaintW;
varying vec3 vPaintL;
float paintHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
float paintNoise(vec3 p) {
  vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = paintHash(i), b = paintHash(i + vec3(1.0, 0.0, 0.0)), c = paintHash(i + vec3(0.0, 1.0, 0.0)), d = paintHash(i + vec3(1.0, 1.0, 0.0));
  float e = paintHash(i + vec3(0.0, 0.0, 1.0)), g = paintHash(i + vec3(1.0, 0.0, 1.0)), h = paintHash(i + vec3(0.0, 1.0, 1.0)), k = paintHash(i + vec3(1.0, 1.0, 1.0));
  return mix(mix(mix(a, b, f.x), mix(c, d, f.x), f.y), mix(mix(e, g, f.x), mix(h, k, f.x), f.y), f.z);
}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float paintGrad = smoothstep(-0.05, 1.85, vPaintW.y);
diffuseColor.rgb *= mix(0.78, 1.07, paintGrad) * (0.94 + 0.12 * paintNoise(vPaintL * 26.0));`)
      .replace('#include <opaque_fragment>', `float facing = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
// soft warm rim everywhere, plus a thin silhouette edge in the highlight color
outgoingLight += pow(facing, 2.6) * vec3(1.0, 0.94, 0.86) * 0.16;
// widen the edge with distance so it keeps a visible width far away
float hlDist = clamp(length(vViewPosition) / 35.0, 0.0, 1.0);
outgoingLight += smoothstep(mix(0.7, 0.4, hlDist), 0.95, facing) * uHighlight * uHighlightK;
#include <opaque_fragment>`);
  };
  mat.customProgramCacheKey = () => 'headline-agent-v3';
  return mat;
}

// ---------------------------------------------------------------------------
// Merging: each bone's static parts become one mesh per material.

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
  out.userData.owned = true;
  return out;
}

// ---------------------------------------------------------------------------

// Skeleton measurements
export const BODY = {
  thigh: 0.41,
  shin: 0.39,
  ankle: 0.09,       // ankle joint height above the sole
  hipOffset: 0.04,   // pelvis bone sits this far above the hip joints
  hipWidth: 0.095,
  spine: 0.115,
  chest: 0.2,
  neck: 0.255,
  head: 0.12,
  shoulder: V3(0.185, 0.185, 0),
  upperArm: 0.28,
  foreArm: 0.26,
};

// Hitboxes are invisible but still raycastable.
const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });
const UP = V3(0, 1, 0);
const DOWN = V3(0, -1, 0);

const ACCEL = 34;   // m/s^2
const DECEL = 30;

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/** Two-bone IK: elbow position for a shoulder S reaching hand target T, bending toward pole. */
function solveElbow(S, T, a, b, pole) {
  const delta = T.clone().sub(S);
  const dir = delta.clone().normalize();
  const d = Math.min(delta.length(), a + b - 1e-3);
  const x = (a * a - b * b + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, a * a - x * x));
  const n = pole.clone().sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
  return {
    elbow: S.clone().addScaledVector(dir, x).addScaledVector(n, h),
    hand: S.clone().addScaledVector(dir, d),
  };
}

export class Agent {
  constructor(def, { shield }) {
    this.def = def;
    this.root = new THREE.Group();
    this.body = new THREE.Group();
    this.root.add(this.body);
    this.mats = [];
    this.hitboxes = [];
    this.cloth = [];
    this.maxShield = shield;
    this.shield = shield;
    this.health = HEALTH;
    this.alive = true;
    this.dead = false;
    this.finished = false;
    this.deathT = 0;
    this.vx = 0;
    this.facing = 0;
    this.phase = 0;
    this.hipYaw = 0;
    this.crouch = 0;
    this.runK = 0;
    this.plan = [];
    this.step = 0;
    this.stepT = 0;
    this.exposedAt = null;
    this.firstHitAt = null;
    this.spawnedAt = 0;
    this.sight = 0;
    this.lastStepIndex = 0;
    this.idleT = Math.random() * 10;
    this.build();
    this.pose(0);
  }

  get total() { return this.health + this.shield; }
  get maxTotal() { return HEALTH + this.maxShield; }

  mat(color, { emissive, emissiveIntensity, side } = {}) {
    const m = stylize(new THREE.MeshToonMaterial({ color, gradientMap: toonRamp() }));
    if (emissive !== undefined) {
      m.emissive.set(emissive);
      m.emissiveIntensity = emissiveIntensity ?? 1;
    }
    if (side !== undefined) m.side = side;
    this.mats.push(m);
    return m;
  }

  add(parent, g, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
    const mesh = new THREE.Mesh(g, m);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  /** Small parts that don't need to cast shadows. */
  detail(parent, g, m, x, y, z, rx, ry, rz) {
    const mesh = this.add(parent, g, m, x, y, z, rx, ry, rz);
    mesh.castShadow = false;
    return mesh;
  }

  /** Hanging cloth: not merged, animated in pose(). */
  clothPiece(parent, g, m, kind, x, y, z, rx = 0, extra = {}) {
    const mesh = this.add(parent, g, m, x, y, z, rx);
    mesh.userData.noMerge = true;
    this.cloth.push({ mesh, kind, base: rx, ...extra });
    return mesh;
  }

  /** A tapered limb from point a to point b inside parent space. */
  limbBetween(parent, a, b, r1, r2, m) {
    const dir = b.clone().sub(a);
    const mesh = new THREE.Mesh(limbGeo(r1, r2, dir.length()), m);
    mesh.position.copy(a);
    mesh.quaternion.setFromUnitVectors(DOWN, dir.normalize());
    mesh.castShadow = true;
    parent.add(mesh);
    return mesh;
  }

  /** A thin glowing strip laid along a segment, offset sideways. */
  stripAlong(parent, a, b, offset, m, w = 0.012) {
    const dir = b.clone().sub(a);
    const len = dir.length();
    const mesh = new THREE.Mesh(box(w, len * 0.7, w), m);
    mesh.position.copy(a).addScaledVector(dir, 0.5).add(offset);
    mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
    parent.add(mesh);
    return mesh;
  }

  hitbox(parent, w, h, d, x, y, z, zone) {
    const hb = new THREE.Mesh(box(w, h, d), HIT_MAT);
    hb.position.set(x, y, z);
    hb.userData = { zone, agent: this };
    parent.add(hb);
    this.hitboxes.push(hb);
    return hb;
  }

  /** Hitbox stretched along a segment (for arms). */
  segmentHitbox(parent, a, b, thick, zone) {
    const dir = b.clone().sub(a);
    const hb = new THREE.Mesh(box(thick, dir.length() + thick * 0.6, thick), HIT_MAT);
    hb.position.copy(a).addScaledVector(dir, 0.5);
    hb.quaternion.setFromUnitVectors(UP, dir.clone().normalize());
    hb.userData = { zone, agent: this };
    parent.add(hb);
    this.hitboxes.push(hb);
    return hb;
  }

  build() {
    const d = this.def;
    const bulk = d.bulk || 1;
    const shade = (hex, k) => new THREE.Color(hex).multiplyScalar(k).getHex();
    const m = {
      primary: this.mat(d.primary),
      primaryDark: this.mat(shade(d.primary, 0.7)),
      secondary: this.mat(d.secondary),
      pants: this.mat(d.pants),
      skin: this.mat(d.skin),
      hair: this.mat(d.hair),
      accent: this.mat(d.accent, { emissive: d.accent, emissiveIntensity: 2 }),
      dark: this.mat(0x1d2026),
      pouch: this.mat(shade(d.secondary, 0.62)),
      boot: this.mat(0x26262c),
      glove: this.mat(0x2d2e34),
      white: this.mat(0xf4f1ea),
    };
    this.accentMat = m.accent;
    this.m = m;
    const B = BODY;

    // ---- skeleton
    this.pelvis = new THREE.Group();
    this.body.add(this.pelvis);
    this.spine = new THREE.Group();
    this.spine.position.y = B.spine;
    this.pelvis.add(this.spine);
    this.chest = new THREE.Group();
    this.chest.position.y = B.chest;
    this.spine.add(this.chest);
    this.neck = new THREE.Group();
    this.neck.position.set(0, B.neck, 0.005);
    this.chest.add(this.neck);
    this.head = new THREE.Group();
    this.head.position.set(0, B.head, 0.012);
    this.neck.add(this.head);

    this.legs = [];
    for (const side of [1, -1]) {
      const thigh = new THREE.Group();
      thigh.position.set(side * B.hipWidth, -B.hipOffset, 0);
      const knee = new THREE.Group();
      knee.position.y = -B.thigh;
      thigh.add(knee);
      const ankle = new THREE.Group();
      ankle.position.y = -B.shin;
      knee.add(ankle);
      this.pelvis.add(thigh);
      const leg = { side, thigh, knee, ankle, angle: 0 };
      this.legs.push(leg);

      this.add(thigh, limbGeo(0.09 * bulk, 0.066 * bulk, B.thigh), m.pants);
      this.add(knee, limbGeo(0.064 * bulk, 0.048 * bulk, B.shin), m.pants);
      this.add(knee, sphere(0.06, 12, 8), m.secondary, 0, -0.005, 0.032).scale.set(1, 1.15, 0.7);
      this.detail(knee, box(0.05, 0.012, 0.012), m.accent, 0, 0.03, 0.072);
      // boot
      this.add(ankle, cyl(0.058, 0.062, 0.12, 12), m.boot, 0, 0.01, 0.0);
      const foot = this.add(ankle, capsule(0.052, 0.13), m.boot, 0, -0.045, 0.05, Math.PI / 2);
      foot.scale.set(1.05, 1, 0.8);
      this.detail(ankle, box(0.115, 0.022, 0.255), m.dark, 0, -0.086, 0.05);
      this.detail(ankle, box(0.01, 0.012, 0.16), m.accent, side * 0.057, -0.06, 0.05);

      this.hitbox(thigh, 0.15, 0.44, 0.16, 0, -0.2, 0, 'leg');
      this.hitbox(knee, 0.12, 0.42, 0.13, 0, -0.2, 0, 'leg');
      this.hitbox(ankle, 0.11, 0.09, 0.25, 0, -0.04, 0.05, 'leg');
    }

    // ---- pelvis + belt
    const hips = this.add(this.pelvis, latheGeo('pelvis', [[0, -0.1], [0.11, -0.095], [0.145, -0.04], [0.15, 0.02], [0.142, 0.08], [0.128, 0.125], [0, 0.13]]), m.pants);
    hips.scale.set(1.12 * bulk, 1, 0.82 * bulk);
    const belt = this.add(this.pelvis, cyl(0.157, 0.157, 0.04, 18, true), m.dark, 0, 0.09, 0);
    belt.scale.set(1.08 * bulk, 1, 0.8 * bulk);
    this.detail(this.pelvis, box(0.05, 0.035, 0.02), m.accent, 0, 0.09, 0.128 * bulk);
    this.add(this.pelvis, box(0.07, 0.07, 0.05), m.pouch, 0.15 * bulk, 0.05, 0.03);
    this.add(this.pelvis, box(0.07, 0.07, 0.05), m.pouch, -0.15 * bulk, 0.05, -0.02);
    this.hitbox(this.pelvis, 0.34, 0.16, 0.24, 0, -0.01, 0, 'body');

    // ---- torso
    this.hitbox(this.spine, 0.32, 0.2, 0.22, 0, 0.05, 0, 'body');
    const torso = this.add(this.chest, latheGeo('torso', [[0, -0.245], [0.125, -0.24], [0.14, -0.15], [0.158, -0.04], [0.172, 0.06], [0.176, 0.13], [0.165, 0.19], [0.13, 0.235], [0.07, 0.26], [0, 0.265]]), m.primary);
    torso.scale.set(1.13 * bulk, 1.04, 0.78 * bulk);
    // plate carrier with a glowing emblem
    const fz = 0.112 * bulk;
    this.add(this.chest, box(0.29 * bulk, 0.25, 0.05), m.secondary, 0, 0.03, fz);
    this.add(this.chest, box(0.27 * bulk, 0.22, 0.04), m.secondary, 0, 0.04, -fz + 0.002);
    for (const x of [-0.085, 0, 0.085]) this.add(this.chest, box(0.07, 0.075, 0.035), m.pouch, x * bulk, -0.03, fz + 0.036);
    this.detail(this.chest, box(0.22 * bulk, 0.016, 0.01), m.accent, 0, 0.13, fz + 0.027);
    this.detail(this.chest, cyl(0.026, 0.026, 0.012, 8), m.accent, 0.075 * bulk, 0.085, fz + 0.03, Math.PI / 2);
    this.add(this.chest, box(0.05, 0.12, 0.03), m.secondary, 0.11 * bulk, 0.17, fz - 0.012);
    this.add(this.chest, box(0.05, 0.12, 0.03), m.secondary, -0.11 * bulk, 0.17, fz - 0.012);
    // shoulders
    for (const s of [1, -1]) this.add(this.chest, sphere(0.074 * bulk, 12, 10), m.primary, s * B.shoulder.x, B.shoulder.y, 0);
    this.hitbox(this.chest, 0.4, 0.32, 0.26, 0, 0.08, 0, 'body');

    // ---- neck + head
    this.add(this.neck, cyl(0.046, 0.05, 0.11, 12), m.skin, 0, 0.03, 0);
    this.hitbox(this.neck, 0.12, 0.1, 0.12, 0, 0.04, 0, 'body');
    this.buildFace(m);
    this.hitbox(this.head, 0.24, 0.26, 0.26, 0, 0.005, 0.01, 'head');
    const glow = new THREE.Mesh(sphere(0.155, 20, 14), HEAD_GLOW);
    glow.position.set(0, 0.012, 0.008);
    glow.scale.set(0.9, 1.0, 0.95);
    glow.renderOrder = 4;
    glow.userData.noMerge = true;
    this.head.add(glow);
    this.headGlow = glow;
    // Hair and headgear were modeled for a slightly bigger head: fit them with one scale.
    const gear = new THREE.Group();
    gear.position.set(0, 0.008, -0.002);
    gear.scale.set(0.88, 0.94, 0.9);
    this.head.add(gear);
    this.gear = gear;
    this.buildHead(gear, d.head, m);

    // ---- shouldered rifle + arms (static relative to the chest)
    const gun = new THREE.Group();
    gun.position.set(-0.07, 0.17, 0);
    this.chest.add(gun);
    this.gun = gun;
    this.add(gun, box(0.04, 0.075, 0.18), m.dark, 0, -0.012, 0.07);
    this.add(gun, box(0.045, 0.11, 0.025), m.dark, 0, -0.025, -0.02);
    this.add(gun, box(0.05, 0.08, 0.26), m.dark, 0, 0, 0.29);
    this.add(gun, box(0.032, 0.09, 0.04), m.dark, 0, -0.07, 0.2, 0.35);
    this.add(gun, box(0.034, 0.14, 0.06), m.dark, 0, -0.11, 0.34, -0.3);
    this.add(gun, box(0.055, 0.06, 0.18), m.secondary, 0, -0.005, 0.51);
    this.add(gun, cyl(0.011, 0.011, 0.24, 8), m.dark, 0, 0.004, 0.71, Math.PI / 2);
    this.add(gun, cyl(0.016, 0.016, 0.05, 8), m.dark, 0, 0.004, 0.84, Math.PI / 2);
    this.add(gun, box(0.02, 0.03, 0.05), m.dark, 0, 0.052, 0.22);
    this.detail(gun, box(0.012, 0.012, 0.22), m.accent, -0.027, 0.015, 0.3);

    const gunPos = gun.position;
    const arms = [
      { side: 1, S: V3(B.shoulder.x, B.shoulder.y, 0), T: gunPos.clone().add(V3(0, -0.03, 0.46)), pole: V3(0.35, -1, 0) },
      { side: -1, S: V3(-B.shoulder.x, B.shoulder.y, 0), T: gunPos.clone().add(V3(0, -0.065, 0.2)), pole: V3(-0.45, -1, -0.1) },
    ];
    this.arms = [];
    for (const { side, S, T, pole } of arms) {
      const { elbow, hand } = solveElbow(S, T, B.upperArm, B.foreArm, pole);
      this.arms.push({ side, S, elbow, hand });
      this.limbBetween(this.chest, S, elbow, 0.058 * bulk, 0.047 * bulk, m.primary);
      this.limbBetween(this.chest, elbow, hand, 0.047 * bulk, 0.037 * bulk, m.primary);
      this.add(this.chest, sphere(0.05 * bulk, 10, 8), m.primary, elbow.x, elbow.y, elbow.z);
      // glowing stripe down the outside of the upper arm
      this.stripAlong(this.chest, S, elbow, V3(side * 0.052 * bulk, 0, 0), m.accent);
      this.buildHand(hand, elbow, side, m, d.extras.includes('gauntlets') ? 1.3 : 1);
      this.segmentHitbox(this.chest, S, elbow, 0.11, 'body');
      this.segmentHitbox(this.chest, elbow, hand, 0.095, 'body');
    }

    for (const extra of d.extras) this.buildExtra(extra, gear, m, bulk);

    this.headBox = this.hitboxes.find((h) => h.userData.zone === 'head');
    // Merge static parts bone by bone to keep draw calls low.
    for (const g of [this.pelvis, this.spine, this.chest, this.neck, this.head, gear, gun, ...this.legs.flatMap((l) => [l.thigh, l.knee, l.ankle])]) this.mergeStatic(g);
  }

  buildFace(m) {
    const h = this.head;
    const skull = this.add(h, sphere(0.105, 20, 16), m.skin, 0, 0.01, 0);
    skull.scale.set(0.92, 1.06, 1);
    const jaw = this.add(h, sphere(0.068, 14, 10), m.skin, 0, -0.05, 0.022);
    jaw.scale.set(0.95, 0.8, 1);
    this.detail(h, box(0.022, 0.034, 0.03), m.skin, 0, -0.006, 0.1);
    this.detail(h, box(0.034, 0.006, 0.006), m.dark, 0, -0.056, 0.09);
    for (const s of [1, -1]) {
      this.detail(h, sphere(0.022, 8, 6), m.skin, s * 0.096, 0.0, -0.005).scale.set(0.5, 1, 0.8);
      const eye = this.detail(h, sphere(0.014, 10, 8), m.white, s * 0.034, 0.016, 0.088);
      eye.scale.set(1.25, 0.7, 0.6);
      this.detail(h, sphere(0.0075, 8, 6), m.dark, s * 0.034, 0.016, 0.095);
      // brows angled down toward the nose for a focused look
      this.detail(h, box(0.036, 0.009, 0.012), m.hair, s * 0.035, 0.036, 0.094, 0, 0, s * 0.18);
    }
  }

  buildHand(hand, elbow, side, m, scale) {
    const g = new THREE.Group();
    g.position.copy(hand);
    g.quaternion.setFromUnitVectors(UP, hand.clone().sub(elbow).normalize());
    g.scale.setScalar(scale);
    this.chest.add(g);
    this.add(g, box(0.07, 0.075, 0.035), m.glove, 0, 0.01, 0);
    this.add(g, box(0.068, 0.04, 0.05), m.glove, 0, 0.055, 0.02, 0.6);
    this.add(g, capsule(0.012, 0.03), m.glove, side * 0.038, 0.02, 0.022, 0.4, 0, -side * 0.5);
    this.detail(g, cyl(0.042, 0.042, 0.02, 10, true), m.accent, 0, -0.03, 0);
    this.mergeStatic(g);
  }

  buildHead(h, style, m) {
    const cap = (r, mat, y = 0.012, z = -0.006, tl = Math.PI * 0.55) => this.add(h, sphere(r, 18, 10, 0, Math.PI * 2, 0, tl), mat, 0, y, z);
    // Sphere segment with the face left open (front is +z), visible from inside too.
    const openShell = (r, color, open = 1.9) => {
      const g = sphere(r, 18, 12, Math.PI / 2 + open / 2, Math.PI * 2 - open);
      return this.add(h, g, this.mat(color, { side: THREE.DoubleSide }), 0, 0.01, -0.01);
    };
    const d = this.def;
    switch (style) {
      case 'spikes': {
        cap(0.126, m.hair);
        for (let i = 0; i < 9; i++) {
          const a = -1.4 + i * 0.35;
          const spike = this.add(h, cyl(0, 0.04, 0.17, 6), m.hair, Math.sin(a) * 0.085, 0.115, Math.cos(a) * 0.05 - 0.05);
          spike.rotation.set(-0.85, 0, -a * 0.55);
        }
        const fringe = this.add(h, cyl(0, 0.03, 0.1, 6), m.hair, 0.03, 0.1, 0.09);
        fringe.rotation.set(0.9, 0, 0.3);
        break;
      }
      case 'bun':
        cap(0.125, m.hair);
        this.add(h, sphere(0.065, 12, 10), m.hair, 0, 0.105, -0.1);
        this.detail(h, cyl(0.006, 0.006, 0.16, 6), m.accent, 0, 0.115, -0.1, 0, 0, Math.PI / 2.4);
        this.detail(h, box(0.2, 0.02, 0.02), m.accent, 0, 0.06, 0.1);
        break;
      case 'helmet':
        cap(0.148, m.secondary, 0.0, 0, Math.PI * 0.58);
        this.detail(h, box(0.23, 0.05, 0.03), m.accent, 0, 0.02, 0.12);
        this.add(h, box(0.055, 0.09, 0.06), m.dark, 0.145, 0.0, 0);
        this.add(h, box(0.055, 0.09, 0.06), m.dark, -0.145, 0.0, 0);
        this.add(h, box(0.04, 0.03, 0.12), m.secondary, 0, 0.15, -0.01);
        break;
      case 'hood': {
        const shell = openShell(0.152, d.primary);
        shell.scale.set(1.05, 1.1, 1.08);
        this.add(h, box(0.2, 0.09, 0.05), m.dark, 0, -0.05, 0.095);
        this.detail(h, box(0.04, 0.014, 0.012), m.accent, -0.042, 0.018, 0.118);
        this.detail(h, box(0.04, 0.014, 0.012), m.accent, 0.042, 0.018, 0.118);
        const tip = this.add(h, cyl(0, 0.065, 0.14, 8), m.primary, 0, 0.11, -0.14);
        tip.rotation.x = -1.05;
        break;
      }
      case 'ponytail': {
        cap(0.126, m.hair);
        const tail = this.clothPiece(h, capsule(0.042, 0.22), m.hair, 'hair', 0, 0.02, -0.15, 0.4);
        tail.geometry = geo('ptail', () => new THREE.CapsuleGeometry(0.042, 0.22, 4, 8).translate(0, -0.13, 0));
        this.detail(h, cyl(0.032, 0.032, 0.035, 8), m.accent, 0, 0.06, -0.125, 1.1);
        break;
      }
      case 'beanie':
        cap(0.132, m.secondary, 0.02, 0, Math.PI * 0.5);
        this.add(h, cyl(0.13, 0.13, 0.05, 18), m.primary, 0, 0.025, -0.004);
        this.add(h, sphere(0.04, 8, 6), m.primary, 0, 0.16, 0);
        break;
      case 'bob': {
        const shell = openShell(0.14, d.hair, 1.45);
        shell.scale.set(1.08, 1.04, 1.06);
        shell.position.y = 0.0;
        this.add(h, box(0.21, 0.05, 0.035), m.hair, 0, 0.088, 0.1);
        break;
      }
      case 'cap':
        cap(0.128, m.secondary, 0.015, 0, Math.PI * 0.5);
        this.add(h, box(0.18, 0.014, 0.12), m.secondary, 0, 0.05, 0.145);
        this.detail(h, box(0.04, 0.03, 0.01), m.accent, 0, 0.1, 0.12);
        break;
      default:
        cap(0.125, m.hair);
    }
  }

  buildExtra(extra, gear, m, bulk) {
    const c = this.chest;
    const S = BODY.shoulder;
    switch (extra) {
      case 'collar':
        this.add(c, cyl(0.075, 0.095, 0.1, 14, true), m.secondary, 0, 0.25, 0);
        this.detail(c, cyl(0.096, 0.096, 0.012, 14, true), m.accent, 0, 0.3, 0);
        break;
      case 'longcoat': {
        // Open coat: lapels on the chest, a back panel and two front flaps that follow the legs.
        for (const s of [1, -1]) this.add(c, box(0.07, 0.3, 0.02), m.primaryDark, s * 0.1 * bulk, 0.08, 0.142 * bulk, 0, 0, -s * 0.25);
        this.clothPiece(this.pelvis, panel(0.38 * bulk, 0.66, 0.025), m.primary, 'back', 0, 0.1, -0.13 * bulk, 0.05);
        this.clothPiece(this.pelvis, panel(0.085 * bulk, 0.52, 0.022), m.primary, 'front', 0.15 * bulk, 0.1, 0.11 * bulk, -0.03, { side: 1 });
        this.clothPiece(this.pelvis, panel(0.085 * bulk, 0.52, 0.022), m.primary, 'front', -0.15 * bulk, 0.1, 0.11 * bulk, -0.03, { side: -1 });
        for (const s of [1, -1]) this.clothPiece(this.pelvis, panel(0.11 * bulk, 0.56, 0.022), m.primary, 'side', s * 0.17 * bulk, 0.1, -0.02, 0.02, { side: s });
        this.clothPiece(this.pelvis, panel(0.025, 0.6, 0.02), m.accent, 'back', 0, 0.1, -0.145 * bulk, 0.05);
        break;
      }
      case 'cape': {
        const upper = this.clothPiece(c, panel(0.44 * bulk, 0.46, 0.02), m.primaryDark, 'cape', 0, 0.23, -0.14 * bulk, 0.1);
        const lower = this.add(upper, panel(0.42 * bulk, 0.46, 0.02), m.primaryDark, 0, -0.45, 0);
        lower.userData.noMerge = true;
        this.cloth.push({ mesh: lower, kind: 'cape2', base: 0.02 });
        this.detail(upper, panel(0.02, 0.44, 0.022), m.accent, 0, 0, -0.002);
        this.add(c, cyl(0.1, 0.13, 0.08, 14, true), m.primary, 0, 0.24, -0.01);
        break;
      }
      case 'pauldrons':
        for (const s of [1, -1]) {
          this.add(c, box(0.17, 0.06, 0.2), m.secondary, s * (S.x + 0.03), S.y + 0.06, 0, 0, 0, -s * 0.38);
          this.add(c, box(0.14, 0.05, 0.17), m.secondary, s * (S.x + 0.06), S.y + 0.0, 0, 0, 0, -s * 0.6);
          this.detail(c, box(0.17, 0.014, 0.014), m.accent, s * (S.x + 0.03), S.y + 0.08, 0.1, 0, 0, -s * 0.38);
        }
        break;
      case 'chestplate':
        this.add(c, box(0.34 * bulk, 0.3, 0.07), m.secondary, 0, 0.05, 0.13 * bulk);
        this.add(c, box(0.26 * bulk, 0.08, 0.06), m.secondary, 0, -0.16, 0.12 * bulk);
        this.detail(c, cyl(0.035, 0.035, 0.012, 6), m.accent, 0, 0.08, 0.17 * bulk, Math.PI / 2);
        break;
      case 'backpack':
        this.add(c, box(0.28, 0.34, 0.14), m.secondary, 0, 0.04, -0.2 * bulk);
        this.add(c, box(0.22, 0.12, 0.06), m.pouch, 0, -0.06, -0.28 * bulk);
        this.detail(c, box(0.2, 0.02, 0.01), m.accent, 0, 0.13, -0.272 * bulk);
        break;
      case 'antenna':
        this.add(c, cyl(0.006, 0.006, 0.36, 6), m.dark, 0.1, 0.38, -0.22 * bulk);
        this.detail(c, sphere(0.018, 8, 6), m.accent, 0.1, 0.565, -0.22 * bulk);
        break;
      case 'scarfLong': {
        const ring = this.add(c, geo('scarf', () => new THREE.TorusGeometry(0.078, 0.036, 8, 16)), m.secondary, 0, 0.245, 0);
        ring.rotation.x = Math.PI / 2;
        this.clothPiece(c, panel(0.08, 0.5, 0.025), m.secondary, 'scarf', 0.045, 0.25, -0.1, 0.5, { seed: 0 });
        this.clothPiece(c, panel(0.07, 0.38, 0.022), m.secondary, 'scarf', -0.035, 0.25, -0.1, 0.6, { seed: 1.7 });
        break;
      }
      case 'hoodDown': {
        const hood = this.add(this.neck, sphere(0.12, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), m.primaryDark, 0, -0.02, -0.08, -0.9);
        hood.scale.set(1.2, 0.8, 0.9);
        break;
      }
      case 'gauntlets':
        break; // handled in buildHand
      case 'holster': {
        const right = this.legs.find((l) => l.side === -1);
        this.add(right.thigh, box(0.055, 0.17, 0.1), m.dark, -0.092 * bulk, -0.16, 0);
        this.add(right.thigh, box(0.06, 0.03, 0.12), m.pouch, -0.09 * bulk, -0.06, 0);
        break;
      }
      case 'beard':
        this.add(gear, box(0.16, 0.08, 0.06), m.hair, 0, -0.08, 0.085);
        this.add(gear, box(0.1, 0.02, 0.02), m.hair, 0, -0.025, 0.118);
        break;
      case 'headphones': {
        const band = this.add(gear, geo('hp', () => new THREE.TorusGeometry(0.14, 0.016, 6, 18, Math.PI)), m.dark, 0, 0.0, 0);
        band.rotation.set(0, Math.PI / 2, 0);
        this.add(gear, cyl(0.055, 0.055, 0.04, 12), m.accent, 0.135, -0.01, 0, 0, 0, Math.PI / 2);
        this.add(gear, cyl(0.055, 0.055, 0.04, 12), m.accent, -0.135, -0.01, 0, 0, 0, Math.PI / 2);
        break;
      }
      case 'goggles':
        this.add(gear, cyl(0.032, 0.032, 0.028, 10), m.accent, -0.046, 0.075, 0.11, Math.PI / 2 - 0.4);
        this.add(gear, cyl(0.032, 0.032, 0.028, 10), m.accent, 0.046, 0.075, 0.11, Math.PI / 2 - 0.4);
        this.add(gear, cyl(0.13, 0.13, 0.02, 18, true), m.dark, 0, 0.07, 0.0, 0.25);
        break;
      default:
        break;
    }
  }

  mergeStatic(group) {
    const buckets = new Map();
    for (const child of group.children) {
      if (!child.isMesh || child.userData.zone || child.userData.noMerge || child.children.length) continue;
      const key = `${child.material.uuid}|${child.castShadow}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(child);
    }
    for (const meshes of buckets.values()) {
      if (meshes.length < 2) continue;
      const geos = meshes.map((mesh) => {
        mesh.updateMatrix();
        return mesh.geometry.clone().applyMatrix4(mesh.matrix);
      });
      const merged = new THREE.Mesh(mergeGeometries(geos), meshes[0].material);
      merged.castShadow = meshes[0].castShadow;
      for (const mesh of meshes) group.remove(mesh);
      for (const g of geos) g.dispose();
      group.add(merged);
    }
  }

  /** Free per-agent GPU resources (shared geometry stays cached). */
  dispose() {
    for (const mat of this.mats) mat.dispose();
    this.root.traverse((o) => {
      if (o.isMesh && o.geometry.userData.owned) o.geometry.dispose();
    });
  }

  /** World positions used for exposure checks: head and chest. */
  samplePoints(out) {
    this.root.updateMatrixWorld(true);
    out[0].set(0, 0, 0).applyMatrix4(this.headBox.matrixWorld);
    out[1].set(0, 0.08, 0).applyMatrix4(this.chest.matrixWorld);
    return out;
  }

  headWorld(out) {
    this.root.updateMatrixWorld(true);
    return out.set(0, 0, 0).applyMatrix4(this.headBox.matrixWorld);
  }

  /** Apply damage: shields first, then health. Returns true on kill. */
  damage(amount) {
    const toShield = Math.min(this.shield, amount);
    this.shield -= toShield;
    this.health -= amount - toShield;
    if (this.health <= 0) {
      this.health = 0;
      this.alive = false;
      return true;
    }
    return false;
  }

  kill() {
    this.alive = false;
    this.dead = true;
    this.deathT = 0;
    this.accentMat.emissiveIntensity = 0.25;
    this.headGlow.visible = false;
  }

  /**
   * Pose the skeleton: walk cycle with knee bend, hip twist toward the
   * movement direction while the chest keeps facing the target, crouch,
   * feet planted on the ground, and cloth that swings with the legs.
   */
  pose(dt) {
    const B = BODY;
    const speed = Math.abs(this.vx);
    const k = Math.min(1, speed / 3.5);
    this.runK += ((speed > 5 ? 1 : 0) - this.runK) * Math.min(1, dt * 6);
    const lateral = this.vx * Math.cos(this.facing);
    const forward = this.vx * Math.sin(this.facing);
    const hipTarget = speed > 0.3 ? Math.max(-1, Math.min(1, Math.atan2(lateral, Math.abs(forward)))) * (1 - this.crouch * 0.7) : 0;
    this.hipYaw += (hipTarget - this.hipYaw) * Math.min(1, dt * 9);
    const dirSign = forward < -0.2 ? -1 : 1;
    const rate = 4.8 + (3.9 - 4.8) * this.runK; // radians of cycle per meter
    this.phase += speed * dt * rate * dirSign;

    const aT = (0.32 + 0.24 * this.runK) * k;
    const aK = (0.55 + 0.55 * this.runK) * k;
    const c = this.crouch;
    let lowest = Infinity;
    for (const leg of this.legs) {
      const p = this.phase + (leg.side > 0 ? 0 : Math.PI);
      const thigh = -aT * Math.sin(p) - 0.06 - c * 1.15;
      const knee = 0.13 + aK * Math.max(0, Math.cos(p)) + c * 1.75;
      leg.angle = thigh;
      leg.thigh.rotation.set(thigh, 0, leg.side * 0.045);
      leg.knee.rotation.x = knee;
      leg.ankle.rotation.x = -(thigh + knee) * 0.92;
      const h = B.thigh * Math.cos(thigh) + B.shin * Math.cos(thigh + knee) + B.ankle;
      lowest = Math.min(lowest, -h);
    }
    // Plant the lower foot on the ground.
    const hipH = -lowest;
    this.idleT += dt;
    const breathe = Math.sin(this.idleT * 1.7) * 0.004 * (1 - k);
    this.pelvis.position.y = hipH + B.hipOffset + breathe;
    this.pelvis.rotation.set(0, this.hipYaw, Math.sin(this.phase) * 0.04 * k);
    const lean = 0.05 + this.runK * k * 0.1 + c * 0.22;
    this.spine.rotation.set(lean, -this.hipYaw, -Math.sin(this.phase) * 0.03 * k);
    // Keep the rifle level and on target.
    this.chest.rotation.set(-lean * 0.85, Math.sin(this.phase) * 0.04 * k, 0);
    this.head.rotation.set(0.1 + c * 0.05, 0, 0.06);

    // Cloth and hair
    const t = this.idleT;
    const legFwd = (side) => {
      const leg = this.legs.find((l) => l.side === side);
      return leg ? leg.angle : 0;
    };
    const maxBack = Math.max(0, ...this.legs.map((l) => l.angle));
    const minFwd = Math.min(0, ...this.legs.map((l) => l.angle));
    const flutter = 0.12 + 0.45 * k * (0.4 + 0.6 * this.runK);
    for (const cl of this.cloth) {
      const r = cl.mesh.rotation;
      switch (cl.kind) {
        case 'back':
          r.x = cl.base + maxBack * 0.55 + flutter * 0.6 + Math.sin(t * 7) * 0.03 * k + c * 0.9;
          break;
        case 'front':
          r.x = cl.base + Math.min(0, legFwd(cl.side)) * 0.9 - c * 0.6;
          break;
        case 'cape':
          r.x = cl.base + flutter * 0.45 + Math.sin(t * 6) * 0.03 * (0.3 + k) + c * 0.55;
          break;
        case 'cape2':
          r.x = cl.base + flutter * 0.35 + Math.sin(t * 6 - 0.8) * 0.06 * (0.3 + k) - c * 0.3;
          break;
        case 'side':
          r.z = cl.side * (0.04 + Math.abs(Math.sin(this.phase)) * 0.12 * k);
          r.x = cl.base + flutter * 0.25 + c * 0.6;
          break;
        case 'scarf':
          r.x = cl.base + flutter * 1.3 + Math.sin(t * 8 + cl.seed) * 0.08 * (0.3 + k);
          r.z = Math.sin(t * 5 + cl.seed) * 0.12 * (0.2 + k);
          break;
        case 'hair':
          r.x = cl.base + flutter * 0.5 + Math.sin(this.phase * 2) * 0.08 * k;
          r.z = Math.sin(t * 2.2) * 0.05 + Math.sin(this.phase) * 0.1 * k;
          break;
        default:
          break;
      }
    }
    // Accent trim pulses gently.
    if (!this.dead) this.accentMat.emissiveIntensity = 1.8 + Math.sin(t * 2.6) * 0.35;
  }

  update(dt, ctx) {
    if (this.dead) {
      this.deathT += dt;
      this.vx = 0;
      this.crouch = Math.min(1, this.crouch + dt * 5);
      this.pose(dt);
      const fall = Math.min(1, this.deathT / 0.5);
      this.body.rotation.x = -(fall * fall) * 1.3;
      this.body.position.z = -fall * 0.3;
      if (this.deathT > 0.9) this.body.position.y = -Math.min(1.2, (this.deathT - 0.9) * 2.2);
      if (this.deathT > 1.5) this.finished = true;
      return;
    }

    const pos = this.root.position;
    let faceMode = 'player';
    let crouchTarget = 0;
    const step = this.plan[this.step];
    if (!step) {
      this.finished = true;
    } else if (step.type === 'move') {
      faceMode = step.face || 'player';
      const dx = step.x - pos.x;
      const dist = Math.abs(dx);
      const stopAt = step.carry ? step.speed : Math.sqrt(2 * DECEL * dist);
      const desired = Math.sign(dx) * Math.min(step.speed, stopAt);
      const rate = Math.abs(desired) < Math.abs(this.vx) || Math.sign(desired) !== Math.sign(this.vx) ? DECEL : ACCEL;
      this.vx += Math.max(-rate * dt, Math.min(rate * dt, desired - this.vx));
      const nx = pos.x + this.vx * dt;
      if (dist < 0.015 || Math.sign(step.x - nx) !== Math.sign(dx)) {
        pos.x = step.x;
        if (!step.carry) this.vx = 0;
        this.nextStep();
      } else {
        pos.x = nx;
      }
    } else if (step.type === 'hold') {
      this.vx += Math.max(-DECEL * dt, Math.min(DECEL * dt, -this.vx));
      this.stepT += dt;
      if (step.crouch && this.stepT > (step.crouchDelay ?? 0.15)) crouchTarget = 1;
      if (this.stepT >= step.t) this.nextStep();
    }
    this.crouch += (crouchTarget - this.crouch) * Math.min(1, dt * 9);

    // Facing: toward the player while peeking, along the path while crossing.
    const toPlayer = Math.atan2(ctx.player.x - pos.x, ctx.player.z - pos.z);
    let target = toPlayer;
    if (faceMode === 'travel' && Math.abs(this.vx) > 0.5) target = Math.atan2(Math.sign(this.vx), 0) * 0.85 + toPlayer * 0.15;
    this.facing += wrapAngle(target - this.facing) * Math.min(1, dt * 9);
    this.root.rotation.y = this.facing;

    this.pose(dt);

    // Footsteps: only running agents are audible.
    if (Math.abs(this.vx) > 4.6) {
      const stepIndex = Math.floor(this.phase / Math.PI);
      if (stepIndex !== this.lastStepIndex) {
        this.lastStepIndex = stepIndex;
        ctx.onFootstep?.(pos);
      }
    }
  }

  nextStep() {
    this.step++;
    this.stepT = 0;
  }
}

/** How far past the cover edge a peeker stops, in meters. Skewed toward the edge. */
export const PEEK_MIN = 0.35;
export const PEEK_MAX = 5;
export const PEEK_SKEW = 2.2;   // distance = min + range * u^2.2, so ~48% stop in the first fifth
export const PEEK_CROUCH = 0.3; // chance a peeker crouches once it stops
export function peekDistance(runLen, u = Math.random()) {
  const max = Math.max(PEEK_MIN + 0.3, Math.min(PEEK_MAX, runLen - 0.3));
  return PEEK_MIN + (max - PEEK_MIN) * Math.pow(u, PEEK_SKEW);
}

/** Build a movement plan for a peek spot. */
export function planFor(kind, spot, speed, rand = Math.random) {
  const r = (a, b) => a + (b - a) * rand();
  const runLen = Math.abs(spot.visEnd - spot.visStart);
  const clampOut = (x, minOut = 0.5) => {
    const lo = spot.visStart + spot.dir * minOut;
    const hi = spot.visEnd - spot.dir * 0.3;
    return spot.dir > 0 ? Math.min(hi, Math.max(lo, x)) : Math.max(hi, Math.min(lo, x));
  };
  if (kind === 'cross') {
    return [{ type: 'move', x: spot.endX, speed, face: 'travel', carry: true }];
  }
  if (kind === 'strafe') {
    const anchor = clampOut(spot.visStart + spot.dir * r(1.2, Math.min(2.6, runLen - 0.4)));
    const plan = [{ type: 'move', x: anchor, speed }];
    const cycles = 2 + Math.floor(rand() * 3);
    for (let i = 0; i < cycles; i++) {
      plan.push({ type: 'move', x: clampOut(anchor + spot.dir * r(0.7, 1.7)), speed });
      if (rand() < 0.35) plan.push({ type: 'hold', t: r(0.25, 0.5), crouch: rand() < 0.4, crouchDelay: 0.05 });
      plan.push({ type: 'move', x: clampOut(anchor - spot.dir * r(0.1, 0.7)), speed });
    }
    plan.push({ type: 'move', x: spot.hiddenX, speed });
    return plan;
  }
  if (kind === 'swing') {
    // Fast wide swing after a flash: run out and hold the angle, then fall back.
    const out = clampOut(spot.visStart + spot.dir * r(1.6, Math.min(4.5, runLen - 0.3)));
    return [
      { type: 'move', x: out, speed },
      { type: 'hold', t: r(1.2, 1.9) },
      { type: 'move', x: spot.hiddenX, speed },
    ];
  }
  // Peek: step out a random distance (usually close to the wall) and stop there for good.
  const out = clampOut(spot.visStart + spot.dir * peekDistance(runLen, rand()), PEEK_MIN);
  return [
    { type: 'move', x: out, speed },
    { type: 'hold', t: Infinity, crouch: rand() < PEEK_CROUCH },
  ];
}
