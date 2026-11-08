import * as THREE from 'three';
import { FLASHES } from './config.js';
import { GLOW } from './effects.js';

const rand = (a, b) => a + (b - a) * Math.random();
const easeOut = (t) => 1 - (1 - t) * (1 - t);
const PARK = new THREE.Vector3(0, -30, -10);

function bezier2(out, a, b, c, t) {
  const u = 1 - t;
  return out.set(0, 0, 0).addScaledVector(a, u * u).addScaledVector(b, 2 * u * t).addScaledVector(c, t * t);
}

function bezier3(out, a, b, c, d, t) {
  const u = 1 - t;
  return out.set(0, 0, 0)
    .addScaledVector(a, u * u * u)
    .addScaledVector(b, 3 * u * u * t)
    .addScaledVector(c, 3 * u * t * t)
    .addScaledVector(d, t * t * t);
}

function buildFlare() {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), new THREE.MeshBasicMaterial({ color: 0xfff1d6 })));
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xff9440, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
  glow.scale.setScalar(1.5);
  g.add(glow);
  g.userData.glow = glow;
  return g;
}

function buildHawk() {
  const g = new THREE.Group();
  const feather = new THREE.MeshStandardMaterial({ color: 0x2f8a5f, emissive: 0x2bd47e, emissiveIntensity: 0.55, roughness: 0.5 });
  const pale = new THREE.MeshStandardMaterial({ color: 0xd9f5e4, emissive: 0x9dffc8, emissiveIntensity: 0.4, roughness: 0.5 });
  const beakMat = new THREE.MeshStandardMaterial({ color: 0xf2c14a, roughness: 0.4 });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.1, 14, 10), feather);
  body.scale.set(0.7, 0.6, 1.6);
  g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), pale);
  head.position.set(0, 0.03, 0.15);
  g.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.06, 8), beakMat);
  beak.position.set(0, 0.02, 0.215);
  beak.rotation.x = Math.PI / 2;
  g.add(beak);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.012, 0.16), feather);
  tail.position.set(0, 0.0, -0.19);
  g.add(tail);
  const wings = [];
  for (const side of [-1, 1]) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.05, 0.02, 0.0);
    const wing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.012, 0.17), feather);
    wing.position.x = side * 0.21;
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.013, 0.12), pale);
    tip.position.set(side * 0.38, 0, -0.03);
    pivot.add(wing, tip);
    pivot.userData.side = side;
    g.add(pivot);
    wings.push(pivot);
  }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0x5dffa6, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.6 }));
  glow.scale.setScalar(1.2);
  g.add(glow);
  g.userData = { wings, glow };
  g.scale.setScalar(1.35);
  return g;
}

export class FlashManager {
  constructor(scene, world, effects, audio) {
    this.world = world;
    this.effects = effects;
    this.audio = audio;
    this.visuals = { flare: buildFlare(), hawk: buildHawk() };
    for (const v of Object.values(this.visuals)) {
      v.position.copy(PARK);
      scene.add(v);
    }
    this.active = [];
    this._a = new THREE.Vector3();
    this._b = new THREE.Vector3();
  }

  get busy() { return this.active.length > 0; }

  clear() {
    for (const f of this.active) this.finish(f, false);
    this.active.length = 0;
  }

  /** Work out a path from behind cover for this spot, or null if it would clip or be blocked. */
  plan(type, spot) {
    const world = this.world;
    const P = (x, y, z) => new THREE.Vector3(x, y, z);
    let path;
    let pop;
    let duration;
    let flight = 0;
    if (type === 'flare') {
      for (const lateral of [1.7, 2.4]) {
        const p0 = P(spot.hiddenX, 1.45, spot.lineZ);
        const p1 = P(spot.visStart + spot.dir * lateral, 1.75, spot.lineZ + 0.25);
        const p2 = P(spot.visStart + spot.dir * rand(0.4, 2.0), rand(1.9, 2.5), Math.min(-3.5, spot.coverFront + rand(1.6, 3.6)));
        const fn = (s, out) => bezier2(out, p0, p1, p2, s);
        if (this.pathClear(fn)) { path = fn; pop = p2; break; }
      }
      duration = FLASHES.flare.fuse;
    } else {
      const def = FLASHES.hawk;
      const p0 = P(spot.hiddenX, 1.6, spot.lineZ);
      const p1 = P(spot.visStart + spot.dir * 1.4, 1.9, spot.lineZ + 0.1);
      const p3 = P(spot.visStart + spot.dir * rand(0.3, 2.8), rand(2.2, 3.0), Math.min(-4.5, spot.coverFront + rand(3.5, 7)));
      const p2 = P(p3.x + spot.dir * 0.6, p3.y + 0.25, p3.z - 2.4);
      const fn = (s, out) => bezier3(out, p0, p1, p2, p3, s);
      if (this.pathClear(fn)) {
        path = fn;
        pop = p3;
        let len = 0;
        for (let i = 1; i <= 16; i++) len += fn(i / 16, this._a).distanceTo(fn((i - 1) / 16, this._b));
        flight = Math.min(def.flightMax, Math.max(def.flightMin, (len * 0.82) / def.speed));
        duration = flight + def.windup;
      }
    }
    if (!path) return null;
    if (pop.length() < 4) return null;
    if (!world.segmentClear(world.eye, pop)) return null;
    return { type, spot, path, pop, duration, flight };
  }

  pathClear(fn) {
    const p = this._a;
    for (let i = 1; i <= 24; i++) {
      fn(i / 24, p);
      if (this.world.pointInsideSolid(p, 0.1)) return false;
    }
    return true;
  }

  throw(plan) {
    const def = FLASHES[plan.type];
    const visual = this.visuals[plan.type];
    const f = { ...plan, def, visual, t: 0, windup: false, pos: new THREE.Vector3(), prev: new THREE.Vector3() };
    plan.path(0, f.pos);
    f.prev.copy(f.pos);
    visual.position.copy(f.pos);
    if (plan.type === 'flare') {
      f.emitter = this.audio.flareThrow(f.pos);
    } else {
      f.emitter = this.audio.hawkCast(f.pos);
    }
    this.active.push(f);
    return f;
  }

  update(dt, onPop) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const f = this.active[i];
      f.t += dt;
      f.prev.copy(f.pos);
      let s;
      if (f.type === 'flare') {
        s = Math.min(1, f.t / f.duration);
      } else if (f.t < f.flight) {
        s = 0.82 * (f.t / f.flight);
      } else {
        s = 0.82 + 0.18 * easeOut(Math.min(1, (f.t - f.flight) / f.def.windup));
        if (!f.windup) {
          f.windup = true;
          this.audio.hawkWindup(f.emitter);
        }
      }
      f.path(s, f.pos);
      const v = f.visual;
      v.position.copy(f.pos);
      const color = f.def.color;
      if (f.type === 'flare') {
        v.userData.glow.scale.setScalar(1.4 + Math.random() * 0.5);
        this.effects.spawn(f.pos.x, f.pos.y, f.pos.z, (Math.random() - 0.5) * 0.4, Math.random() * 0.3, (Math.random() - 0.5) * 0.4, 0.35, 0xff8a3a, { drag: 2, grav: 0.4 });
        this.effects.spawn(f.pos.x, f.pos.y, f.pos.z, (Math.random() - 0.5) * 0.6, Math.random() * 0.5, (Math.random() - 0.5) * 0.6, 0.25, 0xffe0a0, { drag: 2, grav: 0.4 });
        this.effects.holdLight(f, f.pos, color, 6 + Math.random() * 4);
      } else {
        const ahead = this._a;
        f.path(Math.min(1, s + 0.02), ahead);
        if (ahead.distanceToSquared(f.pos) > 1e-6) v.lookAt(ahead);
        const flap = f.windup ? 30 : 17;
        for (const w of v.userData.wings) w.rotation.z = Math.sin(f.t * flap) * 0.65 * w.userData.side;
        const k = f.windup ? 1.2 + Math.min(1, (f.t - f.flight) / f.def.windup) * 1.8 : 1.2;
        v.userData.glow.scale.setScalar(k);
        v.userData.glow.material.opacity = f.windup ? 0.95 : 0.6;
        if (Math.random() < 0.8) this.effects.spawn(f.pos.x, f.pos.y, f.pos.z, 0, 0.1, 0, 0.45, 0x58ff9c, { drag: 1, grav: 0.2 });
        this.effects.holdLight(f, f.pos, color, f.windup ? 10 : 4);
      }
      if (f.emitter) f.emitter.setPosition(f.pos);
      const done = f.type === 'flare' ? f.t >= f.duration : f.t >= f.flight + f.def.windup;
      if (done) {
        this.active.splice(i, 1);
        this.finish(f, true);
        onPop?.(f);
      }
    }
  }

  finish(f, popped) {
    this.effects.releaseLight(f);
    f.visual.position.copy(PARK);
    f.emitter?.stop();
    if (popped) {
      this.effects.pop(f.pos, f.def.color, f.type === 'hawk' ? 9 : 7);
      this.audio.flashPop(f.pos, f.type);
    }
  }
}
