import * as THREE from 'three';
import { HEALTH } from './config.js';

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

// Hitboxes are invisible but still raycastable. Every agent uses the same set.
const HIT_MAT = new THREE.MeshBasicMaterial({ visible: false });
const UP = new THREE.Vector3(0, 1, 0);

const ACCEL = 34;   // m/s^2
const DECEL = 30;

function wrapAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
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
    this.plan = [];
    this.step = 0;
    this.stepT = 0;
    this.exposedAt = null;
    this.firstHitAt = null;
    this.spawnedAt = 0;
    this.lastStepPhase = 0;
    this.build();
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

  limb(parent, a, b, r, m) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const mesh = new THREE.Mesh(capsule(r, Math.round(len * 1000) / 1000), m);
    mesh.position.copy(a).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(UP, dir.normalize());
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

  build() {
    const d = this.def;
    const mPrimary = this.mat(d.primary);
    const mSecondary = this.mat(d.secondary);
    const mPants = this.mat(d.pants, { roughness: 0.9 });
    const mSkin = this.mat(d.skin, { roughness: 0.6 });
    const mHair = this.mat(d.hair, { roughness: 0.95 });
    const mAccent = this.mat(d.accent, { emissive: d.accent, emissiveIntensity: 1.4, roughness: 0.4 });
    const mDark = this.mat(0x1a1c20, { roughness: 0.5, metalness: 0.45 });
    const mBoot = this.mat(0x232326, { roughness: 0.85 });
    this.accentMat = mAccent;

    // Legs pivot at the hip so the hitboxes swing with them.
    this.legL = new THREE.Group();
    this.legR = new THREE.Group();
    this.legL.position.set(-0.105, 0.88, 0);
    this.legR.position.set(0.105, 0.88, 0);
    this.body.add(this.legL, this.legR);
    for (const leg of [this.legL, this.legR]) {
      this.add(leg, capsule(0.085, 0.3), mPants, 0, -0.22, 0);
      this.add(leg, capsule(0.072, 0.32), mPants, 0, -0.6, 0);
      this.add(leg, box(0.12, 0.09, 0.06), mSecondary, 0, -0.42, 0.07);
      this.add(leg, box(0.13, 0.11, 0.25), mBoot, 0, -0.83, 0.035);
      this.hitbox(leg, 0.19, 0.88, 0.24, 0, -0.44, 0, 'leg');
    }

    // Pelvis + belt
    this.add(this.body, box(0.36, 0.18, 0.23), mPants, 0, 0.9, 0);
    this.add(this.body, box(0.38, 0.05, 0.25), mDark, 0, 0.985, 0);
    this.add(this.body, box(0.06, 0.04, 0.02), mAccent, 0, 0.985, 0.127);

    // Torso
    const t = (this.torso = new THREE.Group());
    t.position.y = 0.98;
    this.body.add(t);
    this.add(t, box(0.42, 0.5, 0.24), mPrimary, 0, 0.26, 0);
    this.add(t, box(0.36, 0.22, 0.05), mSecondary, 0, 0.22, 0.13);
    this.add(t, box(0.07, 0.07, 0.03), mDark, -0.1, 0.18, 0.165);
    this.add(t, box(0.07, 0.07, 0.03), mDark, 0.0, 0.18, 0.165);
    this.add(t, box(0.07, 0.07, 0.03), mDark, 0.1, 0.18, 0.165);
    this.add(t, box(0.26, 0.018, 0.01), mAccent, 0, 0.36, 0.158);
    this.add(t, sphere(0.09, 12, 8), mPrimary, 0.24, 0.44, 0);
    this.add(t, sphere(0.09, 12, 8), mPrimary, -0.24, 0.44, 0);
    this.add(t, cyl(0.05, 0.055, 0.1), mSkin, 0, 0.55, 0);

    // Arms holding a rifle at the ready
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    this.limb(t, V(0.24, 0.43, 0), V(0.25, 0.2, 0.16), 0.062, mPrimary);
    this.limb(t, V(0.25, 0.2, 0.16), V(0.09, 0.27, 0.36), 0.054, mPrimary);
    this.limb(t, V(-0.24, 0.43, 0), V(-0.21, 0.24, 0.24), 0.062, mPrimary);
    this.limb(t, V(-0.21, 0.24, 0.24), V(-0.03, 0.3, 0.52), 0.054, mPrimary);
    this.add(t, box(0.08, 0.08, 0.09), mDark, 0.08, 0.27, 0.38);
    this.add(t, box(0.08, 0.07, 0.09), mDark, -0.02, 0.3, 0.54);
    const gun = new THREE.Group();
    gun.position.set(0.04, 0.33, 0.44);
    t.add(gun);
    this.add(gun, box(0.05, 0.08, 0.46), mDark, 0, 0, 0);
    this.add(gun, box(0.035, 0.13, 0.06), mDark, 0, -0.1, 0.04, -0.3);
    this.add(gun, cyl(0.012, 0.012, 0.26, 8), mDark, 0, 0.01, 0.35, Math.PI / 2);
    this.add(gun, box(0.04, 0.07, 0.2), mSecondary, 0, -0.01, -0.3);
    this.add(gun, box(0.012, 0.012, 0.2), mAccent, 0.027, 0.02, 0.02);

    // Head
    const h = (this.head = new THREE.Group());
    h.position.y = 0.645;
    t.add(h);
    const skull = this.add(h, sphere(0.118, 18, 14), mSkin, 0, 0, 0);
    skull.scale.set(0.95, 1.08, 1);
    this.add(h, box(0.032, 0.014, 0.01), mDark, -0.042, 0.016, 0.11);
    this.add(h, box(0.032, 0.014, 0.01), mDark, 0.042, 0.016, 0.11);
    this.add(h, box(0.03, 0.035, 0.02), mSkin, 0, -0.01, 0.118);
    this.buildHead(h, d.head, { mPrimary, mSecondary, mHair, mAccent, mDark, mSkin });
    for (const extra of d.extras) this.buildExtra(t, h, extra, { mPrimary, mSecondary, mHair, mAccent, mDark });

    // Hitboxes shared by every agent
    this.hitbox(h, 0.25, 0.28, 0.25, 0, 0.0, 0, 'head');
    this.hitbox(t, 0.48, 0.6, 0.32, 0, 0.2, 0, 'body');
    this.hitbox(t, 0.44, 0.26, 0.36, 0.02, 0.3, 0.3, 'body');
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
        cap(0.126, m.mHair);
        for (let i = 0; i < 7; i++) {
          const a = -1.2 + i * 0.4;
          const spike = this.add(h, cyl(0, 0.035, 0.13, 6), m.mHair, Math.sin(a) * 0.08, 0.11, Math.cos(a) * 0.05 - 0.04);
          spike.rotation.set(-0.7, 0, -a * 0.5);
        }
        break;
      }
      case 'bun':
        cap(0.125, m.mHair);
        this.add(h, sphere(0.06, 12, 10), m.mHair, 0, 0.1, -0.1);
        this.add(h, box(0.2, 0.02, 0.02), m.mAccent, 0, 0.06, 0.1);
        break;
      case 'helmet':
        cap(0.145, m.mSecondary, 0.0, 0, Math.PI * 0.58);
        this.add(h, box(0.22, 0.045, 0.03), m.mAccent, 0, 0.02, 0.118);
        this.add(h, box(0.05, 0.08, 0.05), m.mDark, 0.14, 0.0, 0);
        this.add(h, box(0.05, 0.08, 0.05), m.mDark, -0.14, 0.0, 0);
        break;
      case 'hood': {
        const shell = openShell(0.152, m.mPrimary);
        shell.scale.set(1.05, 1.1, 1.08);
        this.add(h, box(0.2, 0.09, 0.05), m.mDark, 0, -0.05, 0.095);
        this.add(h, box(0.035, 0.012, 0.012), m.mAccent, -0.042, 0.018, 0.118);
        this.add(h, box(0.035, 0.012, 0.012), m.mAccent, 0.042, 0.018, 0.118);
        const tip = this.add(h, cyl(0, 0.06, 0.12, 8), m.mPrimary, 0, 0.1, -0.13);
        tip.rotation.x = -1.0;
        break;
      }
      case 'ponytail': {
        cap(0.126, m.mHair);
        const tail = this.add(h, capsule(0.04, 0.16), m.mHair, 0, -0.02, -0.15);
        tail.rotation.x = 0.45;
        this.add(h, cyl(0.03, 0.03, 0.03, 8), m.mAccent, 0, 0.07, -0.12, 1.1);
        break;
      }
      case 'beanie':
        cap(0.13, m.mSecondary, 0.02, 0, Math.PI * 0.5);
        this.add(h, cyl(0.128, 0.128, 0.045, 18), m.mPrimary, 0, 0.025, -0.004);
        this.add(h, sphere(0.035, 8, 6), m.mPrimary, 0, 0.155, 0);
        break;
      case 'bob': {
        const shell = openShell(0.135, m.mHair, 1.5);
        shell.scale.set(1.05, 1.02, 1.05);
        shell.position.y = 0.0;
        this.add(h, box(0.2, 0.04, 0.03), m.mHair, 0, 0.085, 0.1);
        break;
      }
      case 'cap':
        cap(0.126, m.mSecondary, 0.015, 0, Math.PI * 0.5);
        this.add(h, box(0.17, 0.012, 0.11), m.mSecondary, 0, 0.05, 0.14);
        break;
      default:
        cap(0.125, m.mHair);
    }
  }

  buildExtra(t, h, extra, m) {
    switch (extra) {
      case 'collar':
        this.add(t, cyl(0.1, 0.11, 0.08, 14, true), m.mSecondary, 0, 0.52, 0);
        break;
      case 'coat':
        this.add(t, box(0.42, 0.44, 0.04), m.mPrimary, 0, -0.2, -0.13);
        break;
      case 'pads':
        this.add(t, box(0.15, 0.06, 0.18), m.mSecondary, 0.27, 0.5, 0, 0, 0, -0.3);
        this.add(t, box(0.15, 0.06, 0.18), m.mSecondary, -0.27, 0.5, 0, 0, 0, 0.3);
        this.add(t, box(0.15, 0.012, 0.012), m.mAccent, 0.27, 0.52, 0.09, 0, 0, -0.3);
        this.add(t, box(0.15, 0.012, 0.012), m.mAccent, -0.27, 0.52, 0.09, 0, 0, 0.3);
        break;
      case 'backpack':
        this.add(t, box(0.3, 0.34, 0.14), m.mSecondary, 0, 0.26, -0.19);
        this.add(t, box(0.2, 0.02, 0.01), m.mAccent, 0, 0.35, -0.262);
        break;
      case 'scarf': {
        const ring = this.add(t, geo('scarf', () => new THREE.TorusGeometry(0.08, 0.035, 8, 16)), m.mSecondary, 0, 0.52, 0);
        ring.rotation.x = Math.PI / 2;
        this.add(t, box(0.08, 0.3, 0.03), m.mSecondary, 0.06, 0.36, -0.14, 0.15);
        break;
      }
      case 'beard':
        this.add(h, box(0.16, 0.08, 0.06), m.mHair, 0, -0.08, 0.085);
        this.add(h, box(0.1, 0.02, 0.02), m.mHair, 0, -0.025, 0.118);
        break;
      case 'headphones': {
        const band = this.add(h, geo('hp', () => new THREE.TorusGeometry(0.135, 0.014, 6, 18, Math.PI)), m.mDark, 0, 0.0, 0);
        band.rotation.set(0, Math.PI / 2, 0);
        this.add(h, cyl(0.05, 0.05, 0.035, 12), m.mAccent, 0.13, -0.01, 0, 0, 0, Math.PI / 2);
        this.add(h, cyl(0.05, 0.05, 0.035, 12), m.mAccent, -0.13, -0.01, 0, 0, 0, Math.PI / 2);
        break;
      }
      case 'goggles':
        this.add(h, cyl(0.03, 0.03, 0.025, 10), m.mAccent, -0.045, 0.075, 0.11, Math.PI / 2 - 0.4);
        this.add(h, cyl(0.03, 0.03, 0.025, 10), m.mAccent, 0.045, 0.075, 0.11, Math.PI / 2 - 0.4);
        break;
      default:
        break;
    }
  }

  /** World positions used for exposure checks. */
  samplePoints(out) {
    this.root.updateMatrixWorld(true);
    out[0].set(0, 0, 0).applyMatrix4(this.hitboxes.find((h) => h.userData.zone === 'head').matrixWorld);
    out[1].set(this.root.position.x, 1.2, this.root.position.z);
    return out;
  }

  headWorld(out) {
    this.root.updateMatrixWorld(true);
    return out.set(0, 0, 0).applyMatrix4(this.hitboxes.find((h) => h.userData.zone === 'head').matrixWorld);
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

  update(dt, ctx) {
    if (this.dead) {
      this.deathT += dt;
      const fall = Math.min(1, this.deathT / 0.42);
      this.body.rotation.x = -(fall * fall) * 1.45;
      this.body.position.z = -fall * 0.25;
      if (this.deathT > 0.9) this.body.position.y = -Math.min(1.2, (this.deathT - 0.9) * 2.2);
      if (this.deathT > 1.5) this.finished = true;
      return;
    }

    const pos = this.root.position;
    let faceMode = 'player';
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
      if (this.stepT >= step.t) this.nextStep();
    }

    // Facing: toward the player while peeking, along the path while crossing.
    const toPlayer = Math.atan2(ctx.player.x - pos.x, ctx.player.z - pos.z);
    let target = toPlayer;
    if (faceMode === 'travel' && Math.abs(this.vx) > 0.5) target = Math.atan2(Math.sign(this.vx), 0) * 0.85 + toPlayer * 0.15;
    this.facing += wrapAngle(target - this.facing) * Math.min(1, dt * 9);
    this.root.rotation.y = this.facing;

    // Gait
    const speed = Math.abs(this.vx);
    const k = Math.min(1, speed / 4);
    this.phase += speed * dt * 2.4;
    const forward = this.vx * Math.sin(this.facing);
    const lateral = this.vx * Math.cos(this.facing);
    const fw = speed > 0.01 ? forward / speed : 0;
    const lt = speed > 0.01 ? lateral / speed : 0;
    const swing = Math.sin(this.phase);
    this.legL.rotation.x = swing * 0.6 * k * fw;
    this.legR.rotation.x = -swing * 0.6 * k * fw;
    this.legL.rotation.z = -Math.max(0, swing) * 0.32 * k * Math.abs(lt);
    this.legR.rotation.z = Math.max(0, -swing) * 0.32 * k * Math.abs(lt);
    this.torso.position.y = 0.98 + Math.abs(Math.cos(this.phase)) * 0.028 * k;
    this.torso.rotation.z = -lt * k * 0.05;

    // Footsteps: only running agents are audible.
    if (speed > 4.6) {
      const stepIndex = Math.floor(this.phase / Math.PI);
      if (stepIndex !== this.lastStepPhase) {
        this.lastStepPhase = stepIndex;
        ctx.onFootstep?.(pos);
      }
    }
  }

  nextStep() {
    this.step++;
    this.stepT = 0;
  }
}

/** Build a movement plan for a peek spot. */
export function planFor(kind, spot, speed, rand = Math.random) {
  const r = (a, b) => a + (b - a) * rand();
  const runLen = Math.abs(spot.visEnd - spot.visStart);
  const clampOut = (x) => {
    const lo = spot.visStart + spot.dir * 0.5;
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
      if (rand() < 0.35) plan.push({ type: 'hold', t: r(0.15, 0.4) });
      plan.push({ type: 'move', x: clampOut(anchor - spot.dir * r(0.1, 0.7)), speed });
    }
    plan.push({ type: 'move', x: spot.hiddenX, speed });
    return plan;
  }
  if (kind === 'swing') {
    // Fast wide swing after a flash: run out and hold the angle.
    const out = clampOut(spot.visStart + spot.dir * r(1.6, Math.min(4.5, runLen - 0.3)));
    return [
      { type: 'move', x: out, speed },
      { type: 'hold', t: r(1.2, 1.9) },
      { type: 'move', x: spot.hiddenX, speed },
    ];
  }
  const out = clampOut(spot.visStart + spot.dir * r(1.0, Math.min(4.5, runLen - 0.3)));
  return [
    { type: 'move', x: out, speed },
    { type: 'hold', t: r(0.75, 1.6) },
    { type: 'move', x: spot.hiddenX, speed },
  ];
}
