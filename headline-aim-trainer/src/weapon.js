import * as THREE from 'three';
import { WEAPONS } from './config.js';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const smoothstep = (a, b, x) => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeOut = (t) => 1 - (1 - t) * (1 - t);
// 0 before a, ramps to 1 by b, holds, ramps back to 0 from c to d
const bump = (p, a, b, c, d) => (p < a || p > d ? 0 : p < b ? smoothstep(a, b, p) : p < c ? 1 : 1 - smoothstep(c, d, p));

function M(color, opts = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.3, ...opts });
}

function part(parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.rotation.set(rx, ry, rz);
  parent.add(m);
  return m;
}

const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
const C = (r, len, seg = 14) => new THREE.CylinderGeometry(r, r, len, seg);

function limb(parent, a, b, r, mat) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 4, 10), mat);
  m.position.copy(a).addScaledVector(dir, 0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
  parent.add(m);
  return m;
}

function flashTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grd.addColorStop(0, 'rgba(255,250,225,1)');
  grd.addColorStop(0.18, 'rgba(255,214,120,0.95)');
  grd.addColorStop(0.45, 'rgba(255,140,40,0.35)');
  grd.addColorStop(1, 'rgba(255,120,20,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 128);
  g.globalCompositeOperation = 'lighter';
  g.fillStyle = 'rgba(255,220,150,0.8)';
  for (let i = 0; i < 6; i++) {
    g.save();
    g.translate(64, 64);
    g.rotate((i / 6) * Math.PI * 2);
    g.beginPath();
    g.moveTo(-5, 0);
    g.lineTo(0, -62);
    g.lineTo(5, 0);
    g.fill();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function arms(g, mats, right, left) {
  const { glove, sleeve } = mats;
  part(g, B(0.058, 0.08, 0.095), glove, ...right.hand, ...(right.handRot || [0, 0, 0]));
  limb(g, new THREE.Vector3(...right.wrist), new THREE.Vector3(...right.elbow), 0.046, sleeve);
  part(g, B(0.075, 0.06, 0.1), glove, ...left.hand, ...(left.handRot || [0, 0, 0]));
  limb(g, new THREE.Vector3(...left.wrist), new THREE.Vector3(...left.elbow), 0.046, sleeve);
}

// AK-pattern rifle: dark steel receiver, tan polymer furniture, curved mag.
function buildRifle(mats) {
  const g = new THREE.Group();
  const steel = M(0x3a3e45, { metalness: 0.75, roughness: 0.38 });
  const steel2 = M(0x4c5159, { metalness: 0.7, roughness: 0.32 });
  const poly = M(0x8d6d47, { roughness: 0.72, metalness: 0.04 });
  const dark = M(0x222428, { roughness: 0.55, metalness: 0.35 });
  const accent = M(0xf4b740, { emissive: 0xf4b740, emissiveIntensity: 0.5, roughness: 0.4 });

  part(g, B(0.05, 0.075, 0.36), steel, 0, 0, 0);
  part(g, B(0.046, 0.022, 0.32), steel2, 0, 0.047, 0.01);
  part(g, B(0.03, 0.026, 0.045), steel, 0, 0.056, -0.17);
  part(g, B(0.006, 0.012, 0.02), steel2, 0, 0.073, -0.17);
  part(g, B(0.058, 0.06, 0.2), poly, 0, -0.006, -0.28);
  part(g, C(0.017, 0.2), poly, 0, 0.046, -0.28, Math.PI / 2);
  part(g, C(0.0115, 0.27), steel, 0, 0.004, -0.5, Math.PI / 2);
  part(g, C(0.0075, 0.18), steel2, 0, 0.026, -0.46, Math.PI / 2);
  part(g, B(0.018, 0.045, 0.022), steel, 0, 0.03, -0.555);
  part(g, B(0.004, 0.02, 0.006), steel2, 0, 0.062, -0.555);
  part(g, C(0.017, 0.07), dark, 0, 0.004, -0.665, Math.PI / 2);
  part(g, B(0.008, 0.012, 0.3), accent, 0.0255, -0.01, 0.0);
  part(g, B(0.03, 0.012, 0.016), steel2, 0.036, 0.02, -0.07);
  part(g, B(0.012, 0.03, 0.06), dark, 0, -0.05, 0.035);
  part(g, B(0.036, 0.1, 0.046), poly, 0, -0.078, 0.1, -0.35);
  part(g, B(0.04, 0.062, 0.22), poly, 0, -0.016, 0.285, 0.08);
  part(g, B(0.045, 0.11, 0.026), dark, 0, -0.035, 0.395, 0.08);

  const mag = new THREE.Group();
  part(mag, B(0.034, 0.07, 0.062), dark, 0, -0.07, -0.095, 0.15);
  part(mag, B(0.034, 0.07, 0.062), dark, 0, -0.13, -0.122, 0.36);
  part(mag, B(0.034, 0.07, 0.062), dark, 0, -0.184, -0.168, 0.58);
  part(mag, B(0.036, 0.012, 0.064), steel2, 0, -0.212, -0.19, 0.58);
  g.add(mag);

  arms(g, mats,
    { hand: [0.022, -0.075, 0.1], handRot: [-0.35, 0, 0], wrist: [0.035, -0.11, 0.15], elbow: [0.17, -0.32, 0.45] },
    { hand: [-0.018, -0.03, -0.3], wrist: [-0.04, -0.06, -0.26], elbow: [-0.24, -0.34, -0.02] });

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.004, -0.71);
  g.add(muzzle);
  return {
    group: g, mag, muzzle,
    scale: 0.6,
    hip: new THREE.Vector3(0.11, -0.118, -0.28), hipRotY: 0.07,
    ads: new THREE.Vector3(0, -0.088, -0.31),
    flashScale: 0.36,
  };
}

// Six-shot revolver with a swing-out cylinder.
function buildRevolver(mats) {
  const g = new THREE.Group();
  const steel = M(0x6a6e75, { metalness: 0.85, roughness: 0.28 });
  const steel2 = M(0x3a3d42, { metalness: 0.8, roughness: 0.34 });
  const wood = M(0x6e3f22, { roughness: 0.6, metalness: 0.02 });
  const accent = M(0xf4b740, { emissive: 0xf4b740, emissiveIntensity: 0.5, roughness: 0.4 });

  part(g, B(0.032, 0.062, 0.12), steel2, 0, 0, 0);
  part(g, B(0.022, 0.028, 0.17), steel, 0, 0.012, -0.135);
  part(g, B(0.012, 0.008, 0.17), steel2, 0, 0.03, -0.135);
  part(g, C(0.009, 0.12), steel2, 0, -0.008, -0.11, Math.PI / 2);
  part(g, B(0.006, 0.014, 0.012), steel, 0, 0.04, -0.21);
  part(g, B(0.012, 0.026, 0.02), steel2, 0, 0.038, 0.058, -0.4);
  part(g, B(0.008, 0.004, 0.11), accent, 0.017, 0.012, -0.12);
  const guard = part(g, new THREE.TorusGeometry(0.018, 0.0045, 6, 14, Math.PI), steel2, 0, -0.034, 0.012);
  guard.rotation.set(0, Math.PI / 2, Math.PI);
  part(g, B(0.031, 0.1, 0.046), wood, 0, -0.072, 0.062, -0.3);

  const cylGroup = new THREE.Group();
  cylGroup.position.set(0, 0.0, -0.012);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.031, 0.031, 0.056, 18), steel);
  drum.rotation.x = Math.PI / 2;
  cylGroup.add(drum);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    part(cylGroup, B(0.008, 0.008, 0.058), steel2, Math.cos(a) * 0.029, Math.sin(a) * 0.029, 0, 0, 0, a);
  }
  g.add(cylGroup);

  arms(g, mats,
    { hand: [0.006, -0.07, 0.065], handRot: [-0.3, 0, 0], wrist: [0.02, -0.1, 0.11], elbow: [0.16, -0.3, 0.38] },
    { hand: [-0.03, -0.085, 0.05], handRot: [-0.2, 0, 0.3], wrist: [-0.05, -0.11, 0.09], elbow: [-0.23, -0.31, 0.32] });

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.012, -0.235);
  g.add(muzzle);
  return {
    group: g, mag: cylGroup, muzzle,
    scale: 0.7,
    hip: new THREE.Vector3(0.1, -0.085, -0.33), hipRotY: 0.1,
    ads: null,
    flashScale: 0.32,
  };
}

// Bolt-action sniper: long fluted barrel, big scope, bolt that cycles after each shot.
function buildSniper(mats) {
  const g = new THREE.Group();
  const steel = M(0x33363c, { metalness: 0.75, roughness: 0.36 });
  const steel2 = M(0x4a4f57, { metalness: 0.7, roughness: 0.3 });
  const poly = M(0x5d6247, { roughness: 0.75, metalness: 0.04 });
  const poly2 = M(0x464a35, { roughness: 0.8, metalness: 0.04 });
  const glass = M(0x10202a, { metalness: 0.9, roughness: 0.08, emissive: 0x0a2a3a, emissiveIntensity: 0.4 });
  const accent = M(0xf4b740, { emissive: 0xf4b740, emissiveIntensity: 0.5, roughness: 0.4 });

  part(g, B(0.054, 0.07, 0.32), steel, 0, 0, 0);
  part(g, B(0.062, 0.06, 0.3), poly, 0, -0.012, -0.29);
  part(g, C(0.0125, 0.6), steel, 0, 0.006, -0.62, Math.PI / 2);
  part(g, B(0.03, 0.03, 0.07), steel2, 0, 0.006, -0.95);
  part(g, B(0.034, 0.012, 0.05), steel, 0, 0.006, -0.95);
  part(g, B(0.008, 0.01, 0.26), accent, 0.032, -0.012, -0.29);
  // scope
  part(g, C(0.024, 0.3), steel, 0, 0.085, -0.03, Math.PI / 2);
  const bell = part(g, new THREE.CylinderGeometry(0.034, 0.024, 0.07, 18), steel, 0, 0.085, -0.215, -Math.PI / 2);
  bell.rotation.x = -Math.PI / 2;
  part(g, C(0.031, 0.006), glass, 0, 0.085, -0.252, Math.PI / 2);
  part(g, C(0.028, 0.05), steel2, 0, 0.085, 0.14, Math.PI / 2);
  part(g, C(0.022, 0.004), glass, 0, 0.085, 0.166, Math.PI / 2);
  part(g, C(0.011, 0.03), steel2, 0, 0.118, -0.03);
  part(g, C(0.011, 0.03), steel2, 0.032, 0.085, -0.03, 0, 0, Math.PI / 2);
  part(g, B(0.03, 0.04, 0.025), steel, 0, 0.055, -0.1);
  part(g, B(0.03, 0.04, 0.025), steel, 0, 0.055, 0.06);
  // magazine, grip, stock
  part(g, B(0.036, 0.06, 0.085), steel2, 0, -0.06, -0.03);
  part(g, B(0.012, 0.03, 0.06), steel, 0, -0.05, 0.06);
  part(g, B(0.036, 0.1, 0.046), poly2, 0, -0.08, 0.12, -0.3);
  part(g, B(0.042, 0.075, 0.27), poly, 0, -0.02, 0.3, 0.05);
  part(g, B(0.03, 0.03, 0.14), poly2, 0, 0.03, 0.3);
  part(g, B(0.046, 0.12, 0.026), poly2, 0, -0.035, 0.44, 0.05);
  // bolt handle (animated)
  const bolt = new THREE.Group();
  bolt.position.set(0.03, 0.022, 0.07);
  part(bolt, C(0.0055, 0.05), steel2, 0.024, 0, 0, 0, 0, Math.PI / 2 + 0.35);
  part(bolt, new THREE.SphereGeometry(0.011, 10, 8), steel, 0.048, -0.01, 0);
  g.add(bolt);

  arms(g, mats,
    { hand: [0.022, -0.078, 0.12], handRot: [-0.3, 0, 0], wrist: [0.035, -0.11, 0.17], elbow: [0.17, -0.32, 0.47] },
    { hand: [-0.018, -0.045, -0.33], wrist: [-0.04, -0.07, -0.29], elbow: [-0.24, -0.34, -0.04] });

  const muzzle = new THREE.Object3D();
  muzzle.position.set(0, 0.006, -0.99);
  g.add(muzzle);
  return {
    group: g, mag: bolt, bolt, muzzle,
    scale: 0.6,
    hip: new THREE.Vector3(0.115, -0.125, -0.3), hipRotY: 0.065,
    ads: new THREE.Vector3(0.02, -0.11, -0.22),
    flashScale: 0.5,
  };
}

export class WeaponSystem {
  constructor(vmScene, audio) {
    this.audio = audio;
    const armMats = {
      glove: M(0x2a2b2f, { roughness: 0.85, metalness: 0 }),
      sleeve: M(0x2d4757, { roughness: 0.9, metalness: 0 }),
    };
    this.models = { rifle: buildRifle(armMats), revolver: buildRevolver(armMats), operator: buildSniper(armMats) };
    const flashTex = flashTexture();
    for (const m of Object.values(this.models)) {
      m.group.scale.setScalar(m.scale);
      vmScene.add(m.group);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      sprite.scale.setScalar(m.flashScale);
      sprite.visible = false;
      m.muzzle.add(sprite);
      m.flash = sprite;
    }
    this.flashLight = new THREE.PointLight(0xffb060, 0, 1.5, 2);
    vmScene.add(this.flashLight);
    this.ammo = {};
    this._v = new THREE.Vector3();
    this.sway = { x: 0, y: 0 };
    this.kick = { z: 0, r: 0 };
    this.reset('rifle');
  }

  get def() { return WEAPONS[this.current]; }
  get model() { return this.models[this.current]; }
  /** Fully zoomed (rifle ADS or a scope level). */
  get adsActive() { return this.adsT > (this.def.zoomLevels ? 0.9 : 0.8); }
  get scoped() { return !!this.def.zoomLevels && this.adsT > 0.7; }
  get zoomFactor() { return this.zoom; }

  reset(id) {
    this.current = id;
    for (const w of Object.values(WEAPONS)) this.ammo[w.id] = w.magSize;
    this.reloading = false;
    this.reloadT = 0;
    this.equipT = 99;
    this.heat = 0;
    this.recoilP = 0;
    this.recoilY = 0;
    this.nextFire = 0;
    this.lastShot = -99;
    this.adsT = 0;
    this.zoom = 1;
    this.zoomLevel = 0;
    this.levelZoom = 1;
    this.latched = false;
    this.boltT = 99;
    this.flashT = 0;
    this.emptyT = 0;
    for (const [k, m] of Object.entries(this.models)) m.group.visible = k === id;
  }

  switchTo(id) {
    if (id === this.current || !WEAPONS[id]) return;
    this.current = id;
    this.reloading = false;
    this.equipT = 0;
    this.heat = 0;
    this.adsT = 0;
    this.zoomLevel = 0;
    this.latched = false;
    for (const [k, m] of Object.entries(this.models)) m.group.visible = k === id;
    this.audio?.equip();
  }

  startReload() {
    const w = this.def;
    if (this.reloading || this.ammo[w.id] >= w.magSize || this.equipT < w.equipTime) return;
    this.reloading = true;
    this.reloadT = 0;
    this.zoomLevel = 0;
    this.adsT = Math.min(this.adsT, 0.5);
    this.audio?.reload(w.reloadTime);
  }

  /** Current spread cone in degrees. */
  spreadDeg() {
    const w = this.def;
    const s = w.spread;
    if (s.hip !== undefined) return s.hip + (s.scoped - s.hip) * smoothstep(0.6, 1, this.adsT);
    if (s.perHeat !== undefined) return Math.min(s.max, s.base + s.perHeat * this.heat);
    const ads = this.adsActive;
    const base = ads ? s.adsBase : s.base;
    const max = ads ? s.adsMax : s.max;
    return base + (max - base) * smoothstep(s.rampStart, s.rampEnd, this.heat);
  }

  /** Spread with no recoil heat, used to place firing-error crosshair lines. */
  restingSpreadDeg() {
    const s = this.def.spread;
    if (s.hip !== undefined) return this.spreadDeg();
    if (s.perHeat !== undefined) return s.base;
    return this.adsActive ? s.adsBase : s.base;
  }

  applyKick() {
    const r = this.def.recoil;
    let dp;
    let dy;
    if (r.pattern) {
      [dp, dy] = r.pattern[Math.min(r.pattern.length - 1, Math.floor(this.heat))];
    } else {
      dp = r.kick[0];
      dy = (Math.random() * 2 - 1) * r.kick[1];
    }
    dp += (Math.random() * 2 - 1) * r.jitter * 0.5;
    dy += (Math.random() * 2 - 1) * r.jitter;
    const m = this.adsActive && r.adsMult ? r.adsMult : 1;
    this.recoilP += dp * m;
    this.recoilY += dy * m;
    this.heat += 1;
  }

  /** Advance one frame. input: { fire, ads, zoomClicks, lookDX, lookDY }. Returns shots fired. */
  update(dt, t, input, canFire = true) {
    const w = this.def;
    const shots = [];
    this.equipT += dt;
    const equipped = this.equipT >= w.equipTime * 0.6;

    let wantAds;
    if (w.zoomLevels) {
      const clicks = input.zoomClicks || 0;
      for (let i = 0; i < clicks; i++) this.zoomLevel = (this.zoomLevel + 1) % (w.zoomLevels.length + 1);
      if (this.reloading || !equipped) this.zoomLevel = 0;
      if (this.zoomLevel > 0) this.levelZoom = w.zoomLevels[this.zoomLevel - 1];
      wantAds = this.zoomLevel > 0;
    } else {
      wantAds = !!(input.ads && w.zoom && !this.reloading && equipped);
      this.levelZoom = w.zoom || 1;
    }
    this.adsT = clamp(this.adsT + (wantAds ? dt : -dt) / (w.scopeTime || 0.16), 0, 1);
    const targetZoom = 1 + (this.levelZoom - 1) * smoothstep(0, 1, this.adsT);
    this.zoom += (targetZoom - this.zoom) * Math.min(1, dt * 22);

    if (this.reloading) {
      this.reloadT += dt;
      if (this.reloadT >= w.reloadTime) {
        this.reloading = false;
        this.ammo[w.id] = w.magSize;
      }
    }

    if (!input.fire) this.latched = false;
    const ready = canFire && this.equipT >= w.equipTime && !this.reloading && !(w.semi && this.latched);
    if (input.fire && ready) {
      if (this.ammo[w.id] <= 0) {
        this.startReload();
      } else {
        const interval = 1 / (w.fireRate * (this.adsActive ? w.adsFireRateMult || 1 : 1));
        let guard = 0;
        while (t >= this.nextFire && this.ammo[w.id] > 0 && guard++ < 3) {
          shots.push({ spread: this.spreadDeg(), pitchOff: this.recoilP, yawOff: this.recoilY, weapon: w });
          this.applyKick();
          this.ammo[w.id]--;
          this.nextFire = t - this.nextFire < interval ? this.nextFire + interval : t + interval;
          this.lastShot = t;
          this.kick.z += w.viewKick.back;
          this.kick.r += w.viewKick.rot;
          this.flashT = 0.045;
          this.model.flash.material.rotation = Math.random() * Math.PI * 2;
          this.model.flash.scale.setScalar(this.model.flashScale * (0.8 + Math.random() * 0.45));
          this.audio?.shot(w.id);
          if (w.semi) {
            this.latched = true;
            this.boltT = 0;
            if (this.ammo[w.id] > 0) this.audio?.bolt(interval);
            break;
          }
        }
      }
    }
    this.boltT += dt;
    if (this.ammo[w.id] === 0 && !this.reloading) {
      this.emptyT += dt;
      if (this.emptyT > 0.3) this.startReload();
    } else {
      this.emptyT = 0;
    }

    const r = w.recoil;
    if (t - this.lastShot > r.recoveryDelay) {
      this.heat = Math.max(0, this.heat - r.heatDecay * dt);
      const f = Math.exp(-r.viewRecover * dt);
      this.recoilP *= f;
      this.recoilY *= f;
    }
    this.animate(dt, t, input);
    return shots;
  }

  animate(dt, t, input) {
    const m = this.model;
    const w = this.def;
    this.kick.z *= Math.exp(-dt * 16);
    this.kick.r *= Math.exp(-dt * 13);
    const tx = clamp(-(input.lookDX || 0) * 0.00022, -0.028, 0.028);
    const ty = clamp((input.lookDY || 0) * 0.00022, -0.022, 0.022);
    this.sway.x += (tx - this.sway.x) * Math.min(1, dt * 9);
    this.sway.y += (ty - this.sway.y) * Math.min(1, dt * 9);

    const ads = smoothstep(0, 1, this.adsT);
    const pos = this._v.copy(m.hip);
    if (m.ads) pos.lerp(m.ads, ads);
    const loose = 1 - ads * 0.75;
    pos.x += this.sway.x * loose + Math.sin(t * 1.3) * 0.0018 * loose;
    pos.y += this.sway.y * loose + Math.sin(t * 2.1) * 0.0014 * loose;
    pos.z += this.kick.z * (1 - ads * 0.5);
    let rx = this.kick.r * (1 - ads * 0.5);
    let ry = m.hipRotY * (1 - ads) + this.sway.x * 1.6;
    let rz = this.sway.x * 2.2;

    if (this.equipT < w.equipTime) {
      const e = 1 - easeOut(Math.min(1, this.equipT / (w.equipTime * 0.75)));
      pos.y -= e * 0.32;
      rx -= e * 0.9;
    }

    m.mag.position.set(0, 0, 0);
    m.mag.rotation.set(0, 0, 0);
    if (m.bolt) m.bolt.position.set(0.03, 0.022, 0.07);
    if (this.reloading) {
      const p = this.reloadT / w.reloadTime;
      const tilt = bump(p, 0.04, 0.18, 0.82, 0.97);
      rz += tilt * (w.id === 'revolver' ? 0.9 : 0.55);
      rx += tilt * 0.2;
      pos.y -= tilt * 0.035;
      if (w.id === 'rifle') {
        const out = p < 0.22 ? 0 : p < 0.36 ? smoothstep(0.22, 0.36, p) : p < 0.5 ? 1 : 1 - smoothstep(0.5, 0.7, p);
        m.mag.position.y = -out * 0.4;
        m.mag.position.z = out * 0.04;
        m.mag.rotation.x = out * 0.4;
        pos.z += bump(p, 0.78, 0.82, 0.84, 0.9) * 0.02;
      } else if (w.id === 'revolver') {
        const out = bump(p, 0.12, 0.25, 0.75, 0.88);
        m.mag.position.x = -out * 0.042;
        m.mag.rotation.z = out * p * 12;
      } else if (m.bolt) {
        const rack = bump(p, 0.8, 0.85, 0.88, 0.95);
        m.bolt.rotation.z = rack * 1.1;
        m.bolt.position.z = 0.07 + rack * 0.06;
      }
    } else if (m.bolt) {
      // Bolt cycle after a sniper shot
      const interval = 1 / w.fireRate;
      const p = this.boltT / interval;
      const lift = bump(p, 0.2, 0.3, 0.62, 0.72);
      const pull = bump(p, 0.3, 0.4, 0.52, 0.62);
      m.bolt.rotation.z = lift * 1.1;
      m.bolt.position.z = 0.07 + pull * 0.07;
      rz += bump(p, 0.15, 0.3, 0.6, 0.8) * 0.12;
    }

    m.group.position.copy(pos);
    m.group.rotation.set(rx, ry, rz);
    // The sniper's viewmodel disappears behind the scope overlay.
    m.group.visible = !(w.zoomLevels && this.adsT > 0.7);

    this.flashT -= dt;
    const on = this.flashT > 0 && m.group.visible;
    m.flash.visible = on;
    m.muzzle.getWorldPosition(this.flashLight.position);
    this.flashLight.intensity = on ? 2.2 : 0;
  }

  /** Screen position of the muzzle, in normalized device coordinates. */
  muzzleNDC(vmCamera, out) {
    if (!this.model.group.visible) return out.set(0, -0.15, 0.5);
    this.model.muzzle.getWorldPosition(out);
    return out.project(vmCamera);
  }
}
