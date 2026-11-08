import * as THREE from 'three';

function dotTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.35, 'rgba(255,255,255,0.6)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export const GLOW = dotTexture();

const MAX_PARTICLES = 600;
const MAX_DECALS = 90;
const MAX_TRACERS = 12;

export class Effects {
  constructor(scene) {
    this.scene = scene;

    // Particles: one Points object, additive, recycled.
    this.p = [];
    const geo = new THREE.BufferGeometry();
    this.pPos = new Float32Array(MAX_PARTICLES * 3);
    this.pCol = new Float32Array(MAX_PARTICLES * 3);
    geo.setAttribute('position', new THREE.BufferAttribute(this.pPos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.pCol, 3));
    this.points = new THREE.Points(geo, new THREE.PointsMaterial({
      size: 0.09, map: GLOW, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true,
    }));
    this.points.frustumCulled = false;
    scene.add(this.points);
    for (let i = 0; i < MAX_PARTICLES; i++) this.p.push({ life: 0, max: 1, x: 0, y: -100, z: 0, vx: 0, vy: 0, vz: 0, r: 1, g: 1, b: 1, drag: 0, grav: 0 });
    this.pNext = 0;

    // Decals
    const decalGeo = new THREE.CircleGeometry(0.035, 10);
    const decalMat = new THREE.MeshBasicMaterial({ color: 0x1b1814, transparent: true, opacity: 0.8, polygonOffset: true, polygonOffsetFactor: -4, depthWrite: false });
    this.decals = [];
    for (let i = 0; i < MAX_DECALS; i++) {
      const d = new THREE.Mesh(decalGeo, decalMat);
      d.position.y = -50;
      scene.add(d);
      this.decals.push(d);
    }
    this.decalNext = 0;

    // Tracers: thin stretched boxes
    const tracerGeo = new THREE.BoxGeometry(1, 1, 1);
    tracerGeo.translate(0, 0, -0.5);
    this.tracers = [];
    for (let i = 0; i < MAX_TRACERS; i++) {
      const mat = new THREE.MeshBasicMaterial({ color: 0xffd89a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
      const m = new THREE.Mesh(tracerGeo, mat);
      m.position.y = -50;
      m.userData.life = 0;
      scene.add(m);
      this.tracers.push(m);
    }
    this.tracerNext = 0;

    // Flash pops: sprite + one persistent point light (no shader recompiles)
    this.popSprites = [];
    for (let i = 0; i < 2; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: GLOW, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
      s.position.y = -50;
      s.userData.life = 0;
      scene.add(s);
      this.popSprites.push(s);
    }
    this.light = new THREE.PointLight(0xffffff, 0, 14, 1.6);
    this.light.position.set(0, -20, 0);
    scene.add(this.light);
    this.lightOwner = null;
    this.lightPop = 0;
  }

  spawn(x, y, z, vx, vy, vz, life, color, { drag = 1.5, grav = -6 } = {}) {
    const p = this.p[this.pNext];
    this.pNext = (this.pNext + 1) % MAX_PARTICLES;
    Object.assign(p, { x, y, z, vx, vy, vz, life, max: life, drag, grav });
    const c = color instanceof THREE.Color ? color : new THREE.Color(color);
    p.r = c.r; p.g = c.g; p.b = c.b;
  }

  sparks(point, normal, color = 0xffd27a, n = 8, speed = 3) {
    for (let i = 0; i < n; i++) {
      const v = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).multiplyScalar(1.2);
      if (normal) v.addScaledVector(normal, 0.9);
      v.normalize().multiplyScalar(speed * (0.4 + Math.random()));
      this.spawn(point.x, point.y, point.z, v.x, v.y, v.z, 0.18 + Math.random() * 0.2, color);
    }
  }

  dust(point, normal) {
    for (let i = 0; i < 5; i++) {
      const v = normal.clone().multiplyScalar(0.6 + Math.random() * 0.6).add(new THREE.Vector3((Math.random() - 0.5) * 0.6, Math.random() * 0.5, (Math.random() - 0.5) * 0.6));
      this.spawn(point.x, point.y, point.z, v.x, v.y, v.z, 0.35 + Math.random() * 0.25, 0x3a332a, { drag: 3, grav: -0.5 });
    }
  }

  decal(point, normal) {
    const d = this.decals[this.decalNext];
    this.decalNext = (this.decalNext + 1) % MAX_DECALS;
    d.position.copy(point).addScaledVector(normal, 0.004);
    d.lookAt(point.clone().add(normal));
    d.rotation.z = Math.random() * Math.PI;
    d.scale.setScalar(0.7 + Math.random() * 0.6);
  }

  tracer(from, to) {
    const m = this.tracers[this.tracerNext];
    this.tracerNext = (this.tracerNext + 1) % MAX_TRACERS;
    const len = from.distanceTo(to);
    m.position.copy(from);
    m.lookAt(to);
    m.scale.set(0.012, 0.012, len);
    m.userData.life = 0.07;
    m.material.opacity = 0.9;
  }

  pop(position, color, size = 7) {
    const s = this.popSprites.find((p) => p.userData.life <= 0) || this.popSprites[0];
    s.position.copy(position);
    s.material.color.set(color);
    s.userData.life = 0.55;
    s.userData.size = size;
    this.lightOwner = null;
    this.light.color.set(color);
    this.light.position.copy(position);
    this.lightPop = 0.4;
  }

  /** A moving object (flare, hawk) can borrow the point light. */
  holdLight(owner, position, color, intensity) {
    if (this.lightPop > 0) return;
    this.lightOwner = owner;
    this.light.color.set(color);
    this.light.position.copy(position);
    this.light.intensity = intensity;
  }

  releaseLight(owner) {
    if (this.lightOwner === owner) {
      this.lightOwner = null;
      if (this.lightPop <= 0) this.light.intensity = 0;
    }
  }

  clear() {
    for (const p of this.p) { p.life = 0; p.y = -100; }
    for (const d of this.decals) d.position.y = -50;
    for (const t of this.tracers) { t.userData.life = 0; t.material.opacity = 0; }
    for (const s of this.popSprites) { s.userData.life = 0; s.material.opacity = 0; }
    this.light.intensity = 0;
    this.lightOwner = null;
    this.lightPop = 0;
  }

  update(dt) {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = this.p[i];
      const j = i * 3;
      if (p.life > 0) {
        p.life -= dt;
        const k = Math.exp(-p.drag * dt);
        p.vx *= k; p.vy = p.vy * k + p.grav * dt; p.vz *= k;
        p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
        if (p.y < 0.01) { p.y = 0.01; p.vy *= -0.3; }
        const f = Math.max(0, p.life / p.max);
        this.pPos[j] = p.x; this.pPos[j + 1] = p.y; this.pPos[j + 2] = p.z;
        this.pCol[j] = p.r * f; this.pCol[j + 1] = p.g * f; this.pCol[j + 2] = p.b * f;
      } else {
        this.pPos[j + 1] = -100;
        this.pCol[j] = this.pCol[j + 1] = this.pCol[j + 2] = 0;
      }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;

    for (const t of this.tracers) {
      if (t.userData.life > 0) {
        t.userData.life -= dt;
        t.material.opacity = Math.max(0, t.userData.life / 0.07) * 0.9;
        if (t.userData.life <= 0) t.position.y = -50;
      }
    }
    for (const s of this.popSprites) {
      if (s.userData.life > 0) {
        s.userData.life -= dt;
        const age = 0.55 - s.userData.life;
        s.scale.setScalar(s.userData.size * Math.min(1, age / 0.08));
        s.material.opacity = Math.max(0, s.userData.life / 0.55);
        if (s.userData.life <= 0) s.position.y = -50;
      }
    }
    if (this.lightPop > 0) {
      this.lightPop -= dt;
      this.light.intensity = Math.max(0, this.lightPop / 0.4) * 60;
      if (this.lightPop <= 0) this.light.intensity = 0;
    }
  }
}
