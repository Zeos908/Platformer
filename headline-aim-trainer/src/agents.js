import * as THREE from 'three';
import { HEALTH } from './config.js';

// Agents share one skeleton, one set of proportions and one set of per-bone
// hitboxes, the way every agent in the reference game shares a hitbox and an
// in-game height. Only clothing, hair and colors change between agents.
//
// Proportions (meters, standing): total height ~1.78, head center 1.62
// (level with the player's eyes, so head-level crosshair placement works on
// flat ground), head about 1/7.5 of body height, shoulders 1.43, hips 0.90,
// knees 0.49. Crouching drops the head by about 0.4 m.

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
const V2 = (x, y) => new THREE.Vector2(x, y);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

/** Tapered limb with rounded ends: joint at y = 0, extends down to y = -len. */
function limbGeo(r1, r2, len) {
  const key = `limb${r1},${r2},${len.toFixed(3)}`;
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

  mat(color, extra = {}) {
    const m = new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0.04, ...extra });
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
    const m = {
      primary: this.mat(d.primary),
      secondary: this.mat(d.secondary),
      pants: this.mat(d.pants, { roughness: 0.9 }),
      skin: this.mat(d.skin, { roughness: 0.62 }),
      hair: this.mat(d.hair, { roughness: 0.95 }),
      accent: this.mat(d.accent, { emissive: d.accent, emissiveIntensity: 1.4, roughness: 0.4 }),
      dark: this.mat(0x1b1d22, { roughness: 0.5, metalness: 0.45 }),
      pouch: this.mat(new THREE.Color(d.secondary).multiplyScalar(0.62).getHex(), { roughness: 0.85 }),
      boot: this.mat(0x24242a, { roughness: 0.85 }),
      glove: this.mat(0x2b2c31, { roughness: 0.8 }),
    };
    this.accentMat = m.accent;
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
      this.legs.push({ side, thigh, knee, ankle });

      this.add(thigh, limbGeo(0.09, 0.066, B.thigh), m.pants);
      this.add(knee, limbGeo(0.064, 0.048, B.shin), m.pants);
      this.add(knee, sphere(0.058, 10, 8), m.secondary, 0, -0.005, 0.03).scale.set(1, 1.15, 0.7);
      // boot
      this.add(ankle, cyl(0.056, 0.06, 0.1, 12), m.boot, 0, 0.0, 0.0);
      const foot = this.add(ankle, capsule(0.05, 0.13), m.boot, 0, -0.045, 0.05, Math.PI / 2);
      foot.scale.set(1.05, 1, 0.8);
      this.add(ankle, box(0.11, 0.02, 0.25), m.dark, 0, -0.085, 0.05);

      this.hitbox(thigh, 0.15, 0.44, 0.16, 0, -0.2, 0, 'leg');
      this.hitbox(knee, 0.12, 0.42, 0.13, 0, -0.2, 0, 'leg');
      this.hitbox(ankle, 0.11, 0.09, 0.25, 0, -0.04, 0.05, 'leg');
    }

    // ---- pelvis + belt
    const hips = this.add(this.pelvis, latheGeo('pelvis', [[0, -0.1], [0.11, -0.095], [0.145, -0.04], [0.15, 0.02], [0.142, 0.08], [0.128, 0.125], [0, 0.13]]), m.pants);
    hips.scale.set(1.12, 1, 0.82);
    const belt = this.add(this.pelvis, cyl(0.157, 0.157, 0.04, 18, true), m.dark, 0, 0.09, 0);
    belt.scale.set(1.08, 1, 0.8);
    this.add(this.pelvis, box(0.05, 0.035, 0.02), m.accent, 0, 0.09, 0.128);
    this.hitbox(this.pelvis, 0.34, 0.16, 0.24, 0, -0.01, 0, 'body');

    // ---- torso
    this.hitbox(this.spine, 0.32, 0.2, 0.22, 0, 0.05, 0, 'body');
    const torso = this.add(this.chest, latheGeo('torso', [[0, -0.245], [0.125, -0.24], [0.14, -0.15], [0.158, -0.04], [0.172, 0.06], [0.176, 0.13], [0.165, 0.19], [0.13, 0.235], [0.07, 0.26], [0, 0.265]]), m.primary);
    torso.scale.set(1.13, 1.04, 0.78);
    // plate carrier
    this.add(this.chest, box(0.29, 0.25, 0.05), m.secondary, 0, 0.03, 0.112);
    this.add(this.chest, box(0.27, 0.22, 0.04), m.secondary, 0, 0.04, -0.11);
    for (const x of [-0.085, 0, 0.085]) this.add(this.chest, box(0.07, 0.075, 0.035), m.pouch, x, -0.03, 0.148);
    this.add(this.chest, box(0.22, 0.016, 0.01), m.accent, 0, 0.13, 0.139);
    this.add(this.chest, box(0.05, 0.12, 0.03), m.secondary, 0.11, 0.17, 0.1);
    this.add(this.chest, box(0.05, 0.12, 0.03), m.secondary, -0.11, 0.17, 0.1);
    // shoulders
    for (const s of [1, -1]) this.add(this.chest, sphere(0.074, 12, 10), m.primary, s * B.shoulder.x, B.shoulder.y, 0);
    this.hitbox(this.chest, 0.4, 0.32, 0.26, 0, 0.08, 0, 'body');

    // ---- neck + head
    this.add(this.neck, cyl(0.046, 0.05, 0.11, 12), m.skin, 0, 0.03, 0);
    this.hitbox(this.neck, 0.12, 0.1, 0.12, 0, 0.04, 0, 'body');
    const skull = this.add(this.head, sphere(0.105, 20, 16), m.skin, 0, 0.01, 0);
    skull.scale.set(0.92, 1.06, 1);
    const jaw = this.add(this.head, sphere(0.068, 14, 10), m.skin, 0, -0.05, 0.022);
    jaw.scale.set(0.95, 0.8, 1);
    this.add(this.head, box(0.022, 0.034, 0.03), m.skin, 0, -0.006, 0.1);
    for (const s of [1, -1]) {
      this.add(this.head, sphere(0.022, 8, 6), m.skin, s * 0.096, 0.0, -0.005).scale.set(0.5, 1, 0.8);
      this.add(this.head, box(0.026, 0.011, 0.01), m.dark, s * 0.034, 0.018, 0.096);
      this.add(this.head, box(0.032, 0.008, 0.012), m.hair, s * 0.034, 0.035, 0.095);
    }
    this.hitbox(this.head, 0.24, 0.26, 0.26, 0, 0.005, 0.01, 'head');
    // Hair and headgear were modeled for a slightly bigger head: fit them with one scale.
    const gear = new THREE.Group();
    gear.position.set(0, 0.008, -0.002);
    gear.scale.set(0.88, 0.94, 0.9);
    this.head.add(gear);
    this.buildHead(gear, d.head, m);

    // ---- shouldered rifle + arms (static relative to the chest)
    const gun = new THREE.Group();
    gun.position.set(-0.07, 0.17, 0);
    this.chest.add(gun);
    this.add(gun, box(0.04, 0.075, 0.18), m.dark, 0, -0.012, 0.07);
    this.add(gun, box(0.045, 0.11, 0.025), m.dark, 0, -0.025, -0.02);
    this.add(gun, box(0.05, 0.08, 0.26), m.dark, 0, 0, 0.29);
    this.add(gun, box(0.032, 0.09, 0.04), m.dark, 0, -0.07, 0.2, 0.35);
    this.add(gun, box(0.034, 0.14, 0.06), m.dark, 0, -0.11, 0.34, -0.3);
    this.add(gun, box(0.055, 0.06, 0.18), m.secondary, 0, -0.005, 0.51);
    this.add(gun, cyl(0.011, 0.011, 0.24, 8), m.dark, 0, 0.004, 0.71, Math.PI / 2);
    this.add(gun, cyl(0.016, 0.016, 0.05, 8), m.dark, 0, 0.004, 0.84, Math.PI / 2);
    this.add(gun, box(0.02, 0.03, 0.05), m.dark, 0, 0.052, 0.22);
    this.add(gun, box(0.012, 0.012, 0.22), m.accent, -0.027, 0.015, 0.3);

    const gunPos = gun.position;
    const arms = [
      { S: V3(B.shoulder.x, B.shoulder.y, 0), T: gunPos.clone().add(V3(0, -0.03, 0.46)), pole: V3(0.35, -1, 0) },
      { S: V3(-B.shoulder.x, B.shoulder.y, 0), T: gunPos.clone().add(V3(0, -0.065, 0.2)), pole: V3(-0.45, -1, -0.1) },
    ];
    for (const { S, T, pole } of arms) {
      const { elbow, hand } = solveElbow(S, T, B.upperArm, B.foreArm, pole);
      this.limbBetween(this.chest, S, elbow, 0.058, 0.047, m.primary);
      this.limbBetween(this.chest, elbow, hand, 0.047, 0.037, m.primary);
      this.add(this.chest, sphere(0.05, 10, 8), m.primary, elbow.x, elbow.y, elbow.z);
      const glove = this.add(this.chest, capsule(0.036, 0.045), m.glove, hand.x, hand.y, hand.z);
      glove.quaternion.setFromUnitVectors(UP, hand.clone().sub(elbow).normalize());
      this.segmentHitbox(this.chest, S, elbow, 0.11, 'body');
      this.segmentHitbox(this.chest, elbow, hand, 0.095, 'body');
    }

    for (const extra of d.extras) this.buildExtra(extra, gear, m);
    this.headBox = this.hitboxes.find((h) => h.userData.zone === 'head');
  }

  buildHead(h, style, m) {
    const cap = (r, mat, y = 0.012, z = -0.006, tl = Math.PI * 0.55) => this.add(h, sphere(r, 18, 10, 0, Math.PI * 2, 0, tl), mat, 0, y, z);
    // Sphere segment with the face left open (front is +z)
    const openShell = (r, mat, open = 1.9) => {
      const g = sphere(r, 18, 12, Math.PI / 2 + open / 2, Math.PI * 2 - open);
      const inside = mat.clone();
      inside.side = THREE.DoubleSide;
      this.mats.push(inside);
      return this.add(h, g, inside, 0, 0.01, -0.01);
    };
    switch (style) {
      case 'spikes': {
        cap(0.126, m.hair);
        for (let i = 0; i < 7; i++) {
          const a = -1.2 + i * 0.4;
          const spike = this.add(h, cyl(0, 0.035, 0.13, 6), m.hair, Math.sin(a) * 0.08, 0.11, Math.cos(a) * 0.05 - 0.04);
          spike.rotation.set(-0.7, 0, -a * 0.5);
        }
        break;
      }
      case 'bun':
        cap(0.125, m.hair);
        this.add(h, sphere(0.06, 12, 10), m.hair, 0, 0.1, -0.1);
        this.add(h, box(0.2, 0.02, 0.02), m.accent, 0, 0.06, 0.1);
        break;
      case 'helmet':
        cap(0.145, m.secondary, 0.0, 0, Math.PI * 0.58);
        this.add(h, box(0.22, 0.045, 0.03), m.accent, 0, 0.02, 0.118);
        this.add(h, box(0.05, 0.08, 0.05), m.dark, 0.14, 0.0, 0);
        this.add(h, box(0.05, 0.08, 0.05), m.dark, -0.14, 0.0, 0);
        break;
      case 'hood': {
        const shell = openShell(0.152, m.primary);
        shell.scale.set(1.05, 1.1, 1.08);
        this.add(h, box(0.2, 0.09, 0.05), m.dark, 0, -0.05, 0.095);
        this.add(h, box(0.035, 0.012, 0.012), m.accent, -0.042, 0.018, 0.118);
        this.add(h, box(0.035, 0.012, 0.012), m.accent, 0.042, 0.018, 0.118);
        const tip = this.add(h, cyl(0, 0.06, 0.12, 8), m.primary, 0, 0.1, -0.13);
        tip.rotation.x = -1.0;
        break;
      }
      case 'ponytail': {
        cap(0.126, m.hair);
        const tail = this.add(h, capsule(0.04, 0.16), m.hair, 0, -0.02, -0.15);
        tail.rotation.x = 0.45;
        this.add(h, cyl(0.03, 0.03, 0.03, 8), m.accent, 0, 0.07, -0.12, 1.1);
        break;
      }
      case 'beanie':
        cap(0.13, m.secondary, 0.02, 0, Math.PI * 0.5);
        this.add(h, cyl(0.128, 0.128, 0.045, 18), m.primary, 0, 0.025, -0.004);
        this.add(h, sphere(0.035, 8, 6), m.primary, 0, 0.155, 0);
        break;
      case 'bob': {
        const shell = openShell(0.135, m.hair, 1.5);
        shell.scale.set(1.05, 1.02, 1.05);
        shell.position.y = 0.0;
        this.add(h, box(0.2, 0.04, 0.03), m.hair, 0, 0.085, 0.1);
        break;
      }
      case 'cap':
        cap(0.126, m.secondary, 0.015, 0, Math.PI * 0.5);
        this.add(h, box(0.17, 0.012, 0.11), m.secondary, 0, 0.05, 0.14);
        break;
      default:
        cap(0.125, m.hair);
    }
  }

  buildExtra(extra, gear, m) {
    const c = this.chest;
    const S = BODY.shoulder;
    switch (extra) {
      case 'collar':
        this.add(c, cyl(0.075, 0.09, 0.08, 14, true), m.secondary, 0, 0.245, 0);
        break;
      case 'coat': {
        const tail = this.add(this.pelvis, box(0.34, 0.5, 0.03), m.primary, 0, -0.17, -0.13);
        tail.rotation.x = -0.08;
        this.add(this.pelvis, box(0.12, 0.42, 0.03), m.primary, 0.12, -0.14, 0.13);
        break;
      }
      case 'pads':
        for (const s of [1, -1]) {
          this.add(c, box(0.14, 0.05, 0.17), m.secondary, s * (S.x + 0.02), S.y + 0.055, 0, 0, 0, -s * 0.35);
          this.add(c, box(0.14, 0.012, 0.012), m.accent, s * (S.x + 0.02), S.y + 0.07, 0.088, 0, 0, -s * 0.35);
        }
        break;
      case 'backpack':
        this.add(c, box(0.28, 0.32, 0.13), m.secondary, 0, 0.04, -0.19);
        this.add(c, box(0.2, 0.02, 0.01), m.accent, 0, 0.12, -0.257);
        break;
      case 'scarf': {
        const ring = this.add(c, geo('scarf', () => new THREE.TorusGeometry(0.075, 0.032, 8, 16)), m.secondary, 0, 0.245, 0);
        ring.rotation.x = Math.PI / 2;
        this.add(c, box(0.075, 0.28, 0.03), m.secondary, 0.05, 0.1, -0.14, 0.12);
        break;
      }
      case 'beard':
        this.add(gear, box(0.16, 0.08, 0.06), m.hair, 0, -0.08, 0.085);
        this.add(gear, box(0.1, 0.02, 0.02), m.hair, 0, -0.025, 0.118);
        break;
      case 'headphones': {
        const band = this.add(gear, geo('hp', () => new THREE.TorusGeometry(0.135, 0.014, 6, 18, Math.PI)), m.dark, 0, 0.0, 0);
        band.rotation.set(0, Math.PI / 2, 0);
        this.add(gear, cyl(0.05, 0.05, 0.035, 12), m.accent, 0.13, -0.01, 0, 0, 0, Math.PI / 2);
        this.add(gear, cyl(0.05, 0.05, 0.035, 12), m.accent, -0.13, -0.01, 0, 0, 0, Math.PI / 2);
        break;
      }
      case 'goggles':
        this.add(gear, cyl(0.03, 0.03, 0.025, 10), m.accent, -0.045, 0.075, 0.11, Math.PI / 2 - 0.4);
        this.add(gear, cyl(0.03, 0.03, 0.025, 10), m.accent, 0.045, 0.075, 0.11, Math.PI / 2 - 0.4);
        break;
      default:
        break;
    }
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
    this.accentMat.emissiveIntensity = 0.2;
  }

  /**
   * Pose the skeleton: walk cycle with knee bend, hip twist toward the
   * movement direction while the chest keeps facing the target, crouch,
   * and feet planted on the ground.
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
