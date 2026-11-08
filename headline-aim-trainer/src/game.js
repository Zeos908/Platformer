import * as THREE from 'three';
import {
  DEG, YAW_PER_COUNT, H_FOV, EYE_HEIGHT, WEAPONS, SHIELDS, SPEEDS, ROSTER,
  FLASH_RATES, DISTANCES, ENDLESS, damageFor, flashFactor, scoreForKill, sessionConfig,
} from './config.js';
import { World } from './world.js';
import { Agent, planFor } from './agents.js';
import { WeaponSystem } from './weapon.js';
import { Effects } from './effects.js';
import { FlashManager } from './flashes.js';

const rand = (a, b) => a + (b - a) * Math.random();
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
const mean = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);
const lerp = (a, b, t) => a + (b - a) * t;

function freshStats() {
  return {
    shots: 0, hits: 0, head: 0, body: 0, leg: 0, kills: 0, headKills: 0, oneTaps: 0,
    escaped: 0, damage: 0, reaction: [], ttk: [], killDist: [], streak: 0, bestStreak: 0,
    flashes: 0, dodged: 0, partial: 0, flashed: 0, blindTime: 0,
    score: 0, bulletsPerKill: [], efficiency: [],
  };
}

export class Game {
  constructor(canvas, { audio, hud, input }) {
    this.audio = audio;
    this.hud = hud;
    this.input = input;
    this.settings = null;

    const renderer = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }));
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.autoClear = false;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.05, 600);
    this.camera.rotation.order = 'YXZ';
    this.camera.position.set(0, EYE_HEIGHT, 0);

    this.vmScene = new THREE.Scene();
    this.vmCamera = new THREE.PerspectiveCamera(54, 1, 0.01, 10);
    this.vmScene.add(new THREE.HemisphereLight(0xe2ebf5, 0x4a4036, 1.2));
    const key = new THREE.DirectionalLight(0xfff0d8, 2.2);
    key.position.set(0.6, 1, 0.4);
    this.vmScene.add(key);
    this.vmScene.environment = this.makeEnvironment();

    this.world = new World(this.scene);
    this.effects = new Effects(this.scene);
    this.flashes = new FlashManager(this.scene, this.world, this.effects, audio);
    this.weapon = new WeaponSystem(this.vmScene, audio);
    this.raycaster = new THREE.Raycaster();

    this.agents = [];
    this.pendingPeeks = [];
    this.yaw = 0;
    this.pitch = 0;
    this.mode = 'demo';
    this.time = 0;
    this.remaining = 0;
    this.elapsed = 0;
    this.countdown = 0;
    this.spawnTimer = 1;
    this.flashTimer = 3;
    this.blind = { peak: 0, hold: 0, fade: 0, fadeMax: 1 };
    this.stats = freshStats();
    this.lastDef = null;
    this.lastSpot = null;
    this.onSessionEnd = null;
    this.endless = false;
    this.allowed = ['rifle', 'revolver'];
    this.bulletsSinceKill = 0;
    this.killedBy = null;
    this.maxSight = 0;
    this.warnStep = 0;

    this._e = new THREE.Euler(0, 0, 0, 'YXZ');
    this._f = new THREE.Vector3();
    this._r = new THREE.Vector3();
    this._u = new THREE.Vector3();
    this._d = new THREE.Vector3();
    this._p = new THREE.Vector3();
    this._q = new THREE.Vector3();
    this._pts = [new THREE.Vector3(), new THREE.Vector3()];

    this.resize();
    this.prewarm();
  }

  // A tiny sky-and-softbox scene baked into an environment map so the gun's
  // metal parts have something to reflect.
  makeEnvironment() {
    const env = new THREE.Scene();
    const geo = new THREE.SphereGeometry(10, 32, 16);
    const pos = geo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const sky = new THREE.Color(0xbcd3ea);
    const horizon = new THREE.Color(0xe8e2d4);
    const ground = new THREE.Color(0x6b6052);
    const c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) / 10;
      if (y > 0) c.copy(horizon).lerp(sky, Math.pow(y, 0.6));
      else c.copy(horizon).lerp(ground, Math.pow(-y, 0.5));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    env.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    const box = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.5), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 4.6, 4.1), side: THREE.DoubleSide }));
    box.position.set(4, 6, 3);
    box.lookAt(0, 0, 0);
    env.add(box);
    const rim = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.8, 2.2), side: THREE.DoubleSide }));
    rim.position.set(-6, 2, -4);
    rim.lookAt(0, 0, 0);
    env.add(rim);
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const tex = pmrem.fromScene(env, 0.035).texture;
    pmrem.dispose();
    return tex;
  }

  // Compile every shader up front so the first spawn or flash does not hitch.
  prewarm() {
    const tmp = ROSTER.map((def, i) => {
      const a = new Agent(def, { shield: 50 });
      a.root.position.set(-6 + i * 1.6, 0, -6);
      this.scene.add(a.root);
      return a;
    });
    for (const m of Object.values(this.weapon.models)) m.group.visible = true;
    this.renderer.compile(this.scene, this.camera);
    this.renderer.compile(this.vmScene, this.vmCamera);
    this.render();
    for (const a of tmp) this.removeAgent(a);
    this.weapon.reset('rifle');
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.vmCamera.aspect = w / h;
    this.vmCamera.updateProjectionMatrix();
    this.applyFov(this.weapon ? this.weapon.zoomFactor : 1, true);
  }

  applyFov(zoom, force = false) {
    const aspect = this.camera.aspect;
    const vfov = Math.min(120, (2 * Math.atan(Math.tan((H_FOV / 2) * DEG) / aspect)) / DEG);
    const fov = (2 * Math.atan(Math.tan((vfov / 2) * DEG) / zoom)) / DEG;
    if (force || Math.abs(this.camera.fov - fov) > 1e-4) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  // --- session flow ---------------------------------------------------------

  startSession(raw) {
    const settings = sessionConfig(raw);
    this.settings = settings;
    this.endless = settings.mode === 'endless';
    this.allowed = settings.mode === 'operator' ? ['operator'] : ['rifle', 'revolver'];
    this.bulletsSinceKill = 0;
    this.killedBy = null;
    this.maxSight = 0;
    this.clearField();
    this.weapon.reset(settings.weapon);
    this.yaw = 0;
    this.pitch = 0;
    this.stats = freshStats();
    this.mode = 'countdown';
    this.countdown = 3;
    this.lastBeep = 4;
    this.remaining = settings.duration;
    this.elapsed = 0;
    this.spawnTimer = 0.2;
    this.flashTimer = 2.5;
    this.input.fire = false;
    this.input.takeZoomClicks();
    this.hud.clear();
  }

  /** Swap weapons if this mode allows it. */
  trySwitch(id) {
    if (this.allowed.includes(id)) this.weapon.switchTo(id);
  }

  /** Show a weapon in the menu's background scene. */
  previewWeapon(id) {
    if (this.mode === 'demo' && this.weapon.current !== id) this.weapon.reset(id);
  }

  pause() {
    if (this.mode === 'countdown' || this.mode === 'playing') {
      this.resumeMode = this.mode;
      this.mode = 'paused';
      this.input.fire = false;
    }
  }

  resume() {
    if (this.mode === 'paused') this.mode = this.resumeMode || 'playing';
  }

  endSession() {
    this.mode = 'results';
    this.blind.hold = this.blind.fade = 0;
    this.hud.setFlash(0);
    this.hud.setScope(false);
    const r = this.results();
    this.onSessionEnd?.(r);
    return r;
  }

  toDemo() {
    this.mode = 'demo';
    this.clearField();
    this.weapon.reset(this.settings?.weapon || 'rifle');
    this.hud.clear();
    this.hud.setDanger(0);
    this.hud.setScope(false);
  }

  clearField() {
    for (const a of this.agents) this.removeAgent(a, true);
    this.agents.length = 0;
    this.pendingPeeks.length = 0;
    this.flashes.clear();
    this.effects.clear();
    this.blind = { peak: 0, hold: 0, fade: 0, fadeMax: 1 };
  }

  results() {
    const s = this.stats;
    return {
      kills: s.kills,
      shots: s.shots,
      hits: s.hits,
      accuracy: s.shots ? s.hits / s.shots : 0,
      hsRate: s.hits ? s.head / s.hits : 0,
      zones: { head: s.head, body: s.body, leg: s.leg },
      headKills: s.headKills,
      oneTaps: s.oneTaps,
      escaped: s.escaped,
      damage: s.damage,
      avgReaction: mean(s.reaction),
      avgTtk: mean(s.ttk),
      avgDist: mean(s.killDist),
      bestStreak: s.bestStreak,
      elapsed: this.elapsed,
      score: s.score,
      bulletsPerKill: mean(s.bulletsPerKill),
      efficiency: mean(s.efficiency),
      mode: this.settings?.mode || 'training',
      killedBy: this.killedBy,
      flashes: { total: s.flashes, dodged: s.dodged, partial: s.partial, flashed: s.flashed, blindTime: s.blindTime },
    };
  }

  // --- spawning -------------------------------------------------------------

  spotsFor(kind, distance) {
    const range = DISTANCES[distance] || DISTANCES.mixed;
    const list = kind === 'cross' ? this.world.crossSpots : this.world.peekSpots;
    return list.filter((sp) => sp.distance >= range[0] && sp.distance < range[1]);
  }

  spotBusy(sp) {
    for (const a of this.agents) {
      if (a.alive && a.spot && a.spot.band === sp.band && Math.abs(a.root.position.x - sp.hiddenX) < 3) return true;
    }
    for (const f of this.flashes.active) if (f.spot === sp) return true;
    for (const p of this.pendingPeeks) if (p.spot === sp) return true;
    return false;
  }

  chooseSpot(kind, distance) {
    const list = this.spotsFor(kind, distance).filter((sp) => !this.spotBusy(sp));
    if (!list.length) return null;
    const fresh = list.filter((sp) => sp !== this.lastSpot);
    return pick(fresh.length ? fresh : list);
  }

  pickKind(movement) {
    if (movement !== 'mix') return movement;
    const r = Math.random();
    return r < 0.42 ? 'peek' : r < 0.72 ? 'strafe' : 'cross';
  }

  spawnAgent({ kind, spot, speed, demo = false } = {}) {
    const s = demo ? { movement: 'mix', distance: 'mixed', speed: 'mix', shields: 'heavy' } : this.settings;
    kind = kind || this.pickKind(s.movement);
    spot = spot || this.chooseSpot(kind, s.distance);
    if (!spot && kind === 'cross') {
      kind = 'peek';
      spot = this.chooseSpot(kind, s.distance);
    }
    if (!spot) return null;
    if (!speed) speed = s.speed === 'mix' ? (Math.random() < 0.5 ? SPEEDS.walk : SPEEDS.run) : SPEEDS[s.speed];
    const choices = ROSTER.filter((d) => d !== this.lastDef);
    const def = pick(choices);
    this.lastDef = def;
    this.lastSpot = spot;
    const agent = new Agent(def, { shield: SHIELDS[s.shields] ?? 50 });
    agent.root.position.set(spot.hiddenX, 0, spot.lineZ);
    agent.facing = Math.atan2(-spot.hiddenX, -spot.lineZ);
    agent.root.rotation.y = agent.facing;
    agent.plan = planFor(kind, spot, speed);
    agent.spot = spot;
    agent.kind = kind;
    agent.speed = speed;
    agent.spawnedAt = this.time;
    agent.demo = demo;
    agent.hitsTaken = 0;
    agent.sight = 0;
    this.scene.add(agent.root);
    this.agents.push(agent);
    return agent;
  }

  removeAgent(a, keepList = false) {
    this.scene.remove(a.root);
    for (const m of a.mats) m.dispose();
    if (!keepList) {
      const i = this.agents.indexOf(a);
      if (i >= 0) this.agents.splice(i, 1);
    }
  }

  // --- flashes --------------------------------------------------------------

  throwFlash() {
    const s = this.settings;
    const type = s.flashes === 'both' ? (Math.random() < 0.5 ? 'flare' : 'hawk') : s.flashes;
    const spots = shuffle(this.spotsFor('peek', s.distance).filter((sp) => !this.spotBusy(sp)));
    for (const sp of spots.slice(0, 16)) {
      const plan = this.flashes.plan(type, sp);
      if (plan) {
        this.flashes.throw(plan);
        return true;
      }
    }
    return false;
  }

  onFlashPop(f) {
    if (this.mode !== 'playing' && this.mode !== 'countdown') return;
    const cam = this.camera.position;
    const toFlash = this._d.subVectors(f.pos, cam).normalize();
    const view = this.camera.getWorldDirection(this._f);
    const angle = Math.acos(Math.max(-1, Math.min(1, view.dot(toFlash)))) / DEG;
    const los = this.world.segmentClear(cam, f.pos);
    const factor = los ? flashFactor(angle) : 0;
    const hold = f.def.blind * factor;
    const fade = f.def.fade * Math.max(0.35, factor);
    if (factor > 0.02) {
      const peak = Math.min(1, 0.35 + factor);
      if (peak >= this.blind.peak || this.blind.hold <= 0) {
        this.blind = { peak, hold, fade, fadeMax: fade };
      }
      this.audio.ringing(factor, hold + fade);
    }
    const st = this.stats;
    st.flashes++;
    st.blindTime += hold;
    let label;
    let cls;
    if (factor < 0.12) {
      st.dodged++;
      label = 'Dodged';
      cls = 'good';
    } else if (factor < 0.6) {
      st.partial++;
      label = `Partial · ${hold.toFixed(2)} s`;
      cls = 'warn';
    } else {
      st.flashed++;
      label = `Flashed · ${hold.toFixed(2)} s`;
      cls = 'bad';
    }
    this.hud.toast(label, cls);
    this.hud.feedItem(`<b>${f.def.name}</b> <span class="feed-dim">${Math.round(angle)}° off view</span> <em>${label}</em>`, `flash ${cls}`);
    if (this.settings.flashPeek) this.pendingPeeks.push({ at: this.time + rand(0.12, 0.42), spot: f.spot });
  }

  // --- shooting -------------------------------------------------------------

  muzzleWorld(out) {
    const ndc = this.weapon.muzzleNDC(this.vmCamera, this._q);
    const dir = this._p.set(ndc.x, ndc.y, 0.5).unproject(this.camera).sub(this.camera.position).normalize();
    return out.copy(this.camera.position).addScaledVector(dir, 0.7);
  }

  resolveShot(shot) {
    const counting = this.mode === 'playing';
    if (counting) {
      this.stats.shots++;
      this.bulletsSinceKill++;
    }
    const w = shot.weapon;
    this._e.set(this.pitch + shot.pitchOff * DEG, this.yaw - shot.yawOff * DEG, 0, 'YXZ');
    const fwd = this._f.set(0, 0, -1).applyEuler(this._e);
    const right = this._r.set(1, 0, 0).applyEuler(this._e);
    const up = this._u.set(0, 1, 0).applyEuler(this._e);
    const r = Math.tan(shot.spread * DEG) * Math.sqrt(Math.random());
    const a = Math.random() * Math.PI * 2;
    const dir = this._d.copy(fwd).addScaledVector(right, r * Math.cos(a)).addScaledVector(up, r * Math.sin(a)).normalize();
    const origin = this.camera.position;

    const maxT = 160;
    const wall = this.world.intersectRay(origin, dir, maxT);
    const floorT = dir.y < -1e-4 ? -origin.y / dir.y : Infinity;
    let worldT = Math.min(wall ? wall.t : Infinity, floorT, maxT);

    const targets = [];
    for (const ag of this.agents) {
      if (!ag.alive) continue;
      ag.root.updateMatrixWorld(true);
      for (const hb of ag.hitboxes) targets.push(hb);
    }
    this.raycaster.set(origin, dir);
    this.raycaster.far = worldT;
    const hits = targets.length ? this.raycaster.intersectObjects(targets, false) : [];
    const end = new THREE.Vector3();

    if (hits.length) {
      const h = hits[0];
      const agent = h.object.userData.agent;
      const zone = h.object.userData.zone;
      end.copy(h.point);
      const dmg = damageFor(w, zone, h.distance);
      const before = agent.total;
      const killed = agent.damage(dmg);
      agent.hitsTaken++;
      if (counting && !agent.demo) {
        const st = this.stats;
        st.hits++;
        st[zone]++;
        st.damage += Math.min(dmg, before);
        if (agent.firstHitAt === null) {
          agent.firstHitAt = this.time;
          if (agent.exposedAt !== null) st.reaction.push(this.time - agent.exposedAt);
        }
      }
      this.hud.damageNumber(h.point, dmg, zone);
      this.hud.hit(killed ? 'kill' : zone === 'head' ? 'head' : 'body');
      this.audio.hit(zone);
      this.effects.sparks(h.point, null, zone === 'head' ? 0xfff2a0 : 0xffffff, zone === 'head' ? 10 : 6, 2.2);
      if (killed) this.onKill(agent, zone, h.distance, w);
    } else if (worldT < maxT) {
      end.copy(origin).addScaledVector(dir, worldT);
      const normal = wall && wall.t <= floorT ? wall.normal : new THREE.Vector3(0, 1, 0);
      this.effects.decal(end, normal);
      this.effects.sparks(end, normal, 0xffd27a, 5, 2.5);
      this.effects.dust(end, normal);
    } else {
      end.copy(origin).addScaledVector(dir, maxT);
    }
    this.effects.tracer(this.muzzleWorld(new THREE.Vector3()), end);
  }

  onKill(agent, zone, dist, weapon) {
    agent.kill();
    const head = zone === 'head';
    this.audio.kill(head);
    if (this.mode !== 'playing' || agent.demo) return;
    const st = this.stats;
    st.kills++;
    if (head) st.headKills++;
    if (head && agent.hitsTaken === 1) st.oneTaps++;
    st.streak++;
    st.bestStreak = Math.max(st.bestStreak, st.streak);
    const ttk = agent.exposedAt !== null ? this.time - agent.exposedAt : null;
    if (ttk !== null) st.ttk.push(ttk);
    st.killDist.push(dist);
    // Score: 1000 x (fewest bullets that could have killed) / (bullets fired since the last kill)
    const used = Math.max(1, this.bulletsSinceKill);
    const minBullets = Math.ceil(agent.maxTotal / damageFor(weapon, 'head', dist));
    const points = scoreForKill(minBullets, used);
    this.bulletsSinceKill = 0;
    st.score += points;
    st.bulletsPerKill.push(used);
    st.efficiency.push(Math.min(1, minBullets / used));
    this.hud.feedItem(
      `<b>${weapon.name}</b> <span class="feed-x">✕</span> ${agent.def.name}${head ? ' <em>Headshot</em>' : ''} <span class="feed-dim">${Math.round(dist)} m · ${used} ${used === 1 ? 'bullet' : 'bullets'}</span> <span class="feed-pts">+${points}</span>`,
      head ? 'head' : '',
    );
    this.hud.toast(points === 1000 ? '+1000 · one tap' : `+${points} · ${used} bullets`, points === 1000 ? 'good' : points >= 500 ? 'warn' : '');
    this.spawnTimer = Math.max(this.spawnTimer, rand(0.3, 0.85));
  }

  /** Spawn and flash pacing. Endless ramps these up the longer you survive. */
  pacing() {
    const s = this.settings;
    if (!this.endless) {
      return { maxTargets: s.maxTargets, spawnDelay: [0.35, 1.0], flashGap: FLASH_RATES[s.flashRate] || FLASH_RATES.normal };
    }
    const t = this.elapsed;
    let maxTargets = 1;
    for (const [at, n] of ENDLESS.targetsAt) if (t >= at) maxTargets = n;
    const k = Math.min(1, t / ENDLESS.rampTime);
    const [d0, d1] = ENDLESS.spawnDelay;
    const [f0, f1] = ENDLESS.flashGap;
    return {
      maxTargets,
      spawnDelay: [lerp(d0[0], d1[0], k), lerp(d0[1], d1[1], k)],
      flashGap: [lerp(f0[0], f1[0], k), lerp(f0[1], f1[1], k)],
    };
  }

  // --- frame ----------------------------------------------------------------

  frame(dt) {
    const mode = this.mode;
    if (mode === 'paused') {
      this.render();
      return;
    }
    this.time += dt;
    const s = this.settings;
    const live = mode === 'countdown' || mode === 'playing';

    // Look
    const { dx, dy } = this.input.consume();
    if (live) {
      // Zoomed sensitivity scales with the zoom (1/zoom), then by the zoom multiplier.
      const zoom = this.weapon.zoomFactor;
      const zoomed = zoom > 1.01 ? (s.scopedMult || 1) / zoom : 1;
      const k = s.sens * YAW_PER_COUNT * zoomed * DEG;
      this.yaw -= dx * k;
      this.pitch = Math.max(-89 * DEG, Math.min(89 * DEG, this.pitch - dy * k));
    } else if (mode === 'demo') {
      this.yaw = Math.sin(this.time * 0.12) * 0.22;
      this.pitch = -0.015 + Math.sin(this.time * 0.21) * 0.01;
    }

    // Shooting
    const win = live
      ? { fire: this.input.fire, ads: this.input.ads, zoomClicks: this.input.takeZoomClicks(), lookDX: this.input.lookDX, lookDY: this.input.lookDY }
      : { fire: false, ads: false, zoomClicks: 0 };
    const shots = this.weapon.update(dt, this.time, win, live);
    for (const shot of shots) this.resolveShot(shot);
    this.applyFov(this.weapon.zoomFactor);
    this.camera.rotation.set(this.pitch + this.weapon.recoilP * DEG, this.yaw - this.weapon.recoilY * DEG, 0);
    this.camera.updateMatrixWorld();
    this.audio.updateListener(this.camera);

    // Session clock
    if (mode === 'countdown') {
      this.countdown -= dt;
      const n = Math.ceil(this.countdown);
      if (n !== this.lastBeep && n > 0) {
        this.lastBeep = n;
        this.audio.beep(false);
      }
      this.hud.centerText(n > 0 ? String(n) : '');
      if (this.countdown <= 0) {
        this.mode = 'playing';
        this.stats = freshStats();
        this.audio.beep(true);
        this.hud.centerText('');
      }
    } else if (mode === 'playing') {
      this.elapsed += dt;
      if (s.duration > 0) {
        this.remaining -= dt;
        if (this.remaining <= 0) {
          this.remaining = 0;
          this.endSession();
        }
      }
    }

    // Spawning
    if (this.mode === 'playing') {
      const flashDrill = s.flashOnly && s.flashes !== 'off';
      const alive = this.agents.filter((a) => a.alive && !a.forced).length;
      const pace = this.pacing();
      this.spawnTimer -= dt;
      if (!flashDrill && this.spawnTimer <= 0 && alive < pace.maxTargets) {
        this.spawnAgent();
        this.spawnTimer = rand(pace.spawnDelay[0], pace.spawnDelay[1]);
      }
      if (s.flashes !== 'off') {
        this.flashTimer -= dt;
        if (this.flashTimer <= 0 && !this.flashes.busy) {
          const ok = this.throwFlash();
          this.flashTimer = ok ? rand(pace.flashGap[0], pace.flashGap[1]) : 0.6;
        }
      }
      for (let i = this.pendingPeeks.length - 1; i >= 0; i--) {
        const p = this.pendingPeeks[i];
        if (this.time >= p.at) {
          this.pendingPeeks.splice(i, 1);
          const a = this.spawnAgent({ kind: 'swing', spot: p.spot, speed: SPEEDS.run });
          if (a) a.forced = true;
        }
      }
    } else if (this.mode === 'demo') {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.agents.filter((a) => a.alive).length < 2) {
        this.spawnAgent({ demo: true });
        this.spawnTimer = rand(0.6, 1.6);
      }
    }

    // Agents
    const ctx = { player: this.camera.position, onFootstep: this.mode === 'demo' ? null : (p) => this.audio.footstep(p) };
    for (let i = this.agents.length - 1; i >= 0; i--) {
      const a = this.agents[i];
      a.update(dt, ctx);
      if (a.alive) {
        const pts = a.samplePoints(this._pts);
        a.visibleNow = this.world.visibleFromEye(pts[0].x, pts[0].y, pts[0].z) || this.world.visibleFromEye(pts[1].x, pts[1].y, pts[1].z);
        if (a.visibleNow && a.exposedAt === null) a.exposedAt = this.time;
        // Line-of-sight meter: fills while the agent can see you, drains while it cannot.
        a.sight = Math.max(0, a.sight + (a.visibleNow ? dt : -dt));
      } else {
        a.visibleNow = false;
        a.sight = 0;
      }
      if (a.finished) {
        if (a.alive && a.exposedAt !== null && this.mode === 'playing' && !a.demo) {
          this.stats.escaped++;
          this.stats.streak = 0;
          this.hud.feedItem(`${a.def.name} <span class="feed-dim">got back to cover</span>`, 'miss');
        }
        this.removeAgent(a);
      }
    }

    // Endless: any agent that keeps line of sight for too long wins the duel.
    let maxSight = 0;
    let threat = null;
    for (const a of this.agents) {
      if (a.alive && a.sight > maxSight) { maxSight = a.sight; threat = a; }
    }
    this.maxSight = maxSight;
    if (this.endless && this.mode === 'playing') {
      const level = maxSight / ENDLESS.sightLimit;
      const step = level > 0.5 ? Math.floor(level * 8) : 0;
      if (step > this.warnStep) this.audio.warn(level);
      this.warnStep = step;
      if (threat && maxSight >= ENDLESS.sightLimit) {
        this.killedBy = threat.def.name;
        this.audio.death();
        this.hud.setDanger(1);
        this.endSession();
        this.render();
        return;
      }
    }
    this.hud.setDanger(this.endless && this.mode === 'playing' ? Math.min(1, maxSight / ENDLESS.sightLimit) : 0);

    // Flashes + blind
    this.flashes.update(dt, (f) => this.onFlashPop(f));
    const b = this.blind;
    let alpha = 0;
    if (b.hold > 0) {
      b.hold -= dt;
      alpha = b.peak;
    } else if (b.fade > 0) {
      b.fade -= dt;
      const k = Math.max(0, b.fade / b.fadeMax);
      alpha = b.peak * k * k * (3 - 2 * k);
    } else {
      b.peak = 0;
    }
    this.hud.setFlash(alpha);

    this.effects.update(dt);
    this.updateHud(dt);
    this.render();
  }

  updateHud(dt) {
    const hud = this.hud;
    const s = this.settings;
    if (!s || this.mode === 'demo') return;
    const st = this.stats;
    hud.setStats({
      time: s.duration > 0 ? (this.mode === 'countdown' ? s.duration : this.remaining) : this.elapsed,
      timeLabel: this.endless ? 'Survived' : s.duration > 0 ? 'Time' : 'Elapsed',
      kills: st.kills,
      score: st.score,
      acc: st.shots ? Math.round((st.hits / st.shots) * 100) : 0,
      hs: st.hits ? Math.round((st.head / st.hits) * 100) : 0,
    });
    const w = this.weapon.def;
    hud.setAmmo(this.weapon.ammo[w.id], w.magSize, w.name, this.weapon.reloading, this.weapon.reloadT / w.reloadTime);
    if (s.flashes !== 'off') {
      hud.setFlashStats(`<span>Flashes</span> <b class="good">${st.dodged}</b> dodged · <b class="warn">${st.partial}</b> partial · <b class="bad">${st.flashed}</b> flashed`);
    } else {
      hud.setFlashStats('');
    }
    // Firing error in device pixels, for crosshair lines that follow it.
    const halfH = (window.innerHeight * (window.devicePixelRatio || 1)) / 2;
    const toPx = (deg) => (Math.tan(deg * DEG) / Math.tan((this.camera.fov / 2) * DEG)) * halfH;
    const scoped = this.weapon.scoped;
    hud.setScope(scoped, this.weapon.recoilP);
    hud.drawCrosshair({
      errorPx: toPx(this.weapon.spreadDeg()),
      basePx: toPx(this.weapon.restingSpreadDeg()),
      zoomed: this.weapon.adsActive,
      hidden: scoped,
    });
    hud.update(dt, this.camera, this.agents, s.healthBars, this.endless ? ENDLESS.sightLimit : 0);
  }

  render() {
    const r = this.renderer;
    r.clear();
    r.render(this.scene, this.camera);
    r.clearDepth();
    r.render(this.vmScene, this.vmCamera);
  }
}
