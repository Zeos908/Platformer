import * as THREE from 'three';
import { defaultProfile, drawSection, sectionFor, sniperColor } from './crosshair.js';

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor() {
    this.root = $('hud');
    this.cross = $('crosshair');
    this.crossCtx = this.cross.getContext('2d');
    this.hitmarker = $('hitmarker');
    this.time = $('hudTime');
    this.timeLabel = $('hudTimeLabel');
    this.score = $('hudScore');
    this.scope = $('scope');
    this.scopeDot = $('scopeDot');
    this.danger = $('danger');
    this.kills = $('hudKills');
    this.acc = $('hudAcc');
    this.hs = $('hudHs');
    this.ammo = $('hudAmmo');
    this.mag = $('hudMag');
    this.weapon = $('hudWeapon');
    this.reload = $('hudReload');
    this.flashStat = $('hudFlash');
    this.feed = $('killfeed');
    this.toastEl = $('toast');
    this.floats = $('floats');
    this.bars = $('bars');
    this.flashOverlay = $('flashOverlay');
    this.center = $('centerMsg');
    this.fps = $('hudFps');
    this.items = [];
    this.barEls = new Map();
    this.crossKey = '';
    this.profile = defaultProfile();
    this.hitT = 0;
    this.toastT = 0;
    this._v = new THREE.Vector3();
    this.dpr = 1;
  }

  show(on) { this.root.hidden = !on; }

  /** Use a parsed Valorant crosshair profile (see crosshair.js). */
  setCrosshairProfile(profile) {
    this.profile = profile;
    this.crossKey = '';
    const sn = profile.sniper;
    const dpr = window.devicePixelRatio || 1;
    const size = Math.max(2, Math.round(4 * sn.s)) / dpr;
    this.scopeDot.hidden = !sn.d;
    this.scopeDot.style.width = this.scopeDot.style.height = `${size}px`;
    this.scopeDot.style.background = sniperColor(sn);
    this.scopeDot.style.opacity = String(Math.min(1, sn.o));
  }

  /**
   * Draw the crosshair 1:1 in device pixels, like the game does at native resolution.
   * Lines with firing error enabled move out by the weapon's current spread.
   */
  drawCrosshair({ errorPx = 0, basePx = 0, zoomed = false, hidden = false } = {}) {
    const dpr = window.devicePixelRatio || 1;
    const sec = sectionFor(this.profile, zoomed);
    const key = `${hidden}|${sec === this.profile.primary}|${Math.round(errorPx)}|${Math.round(basePx)}|${dpr}|${window.innerWidth}x${window.innerHeight}`;
    if (key === this.crossKey) return;
    this.crossKey = key;
    this.cross.hidden = hidden;
    if (hidden) return;
    const size = 320;
    if (this.cross.width !== size) this.cross.width = this.cross.height = size;
    const css = size / dpr;
    this.cross.style.width = this.cross.style.height = `${css}px`;
    // Snap the canvas to whole device pixels around the screen center.
    this.cross.style.left = `${(Math.floor((window.innerWidth * dpr) / 2) - size / 2) / dpr}px`;
    this.cross.style.top = `${(Math.floor((window.innerHeight * dpr) / 2) - size / 2) / dpr}px`;
    drawSection(this.crossCtx, sec, { size, errorPx: Math.min(140, errorPx), basePx: Math.min(140, basePx) });
  }

  setScope(on) {
    if (this.scope.hidden === !on) return;
    this.scope.hidden = !on;
  }

  setDanger(level) {
    const v = level <= 0 ? '0' : (Math.pow(level, 1.6) * 0.9).toFixed(2);
    if (this._danger !== v) {
      this._danger = v;
      this.danger.style.opacity = v;
    }
  }

  hit(kind) {
    this.hitmarker.className = `hitmarker show ${kind}`;
    this.hitT = kind === 'kill' ? 0.28 : 0.14;
  }

  // DOM writes only happen when a value actually changes.
  text(el, v) {
    v = String(v);
    if (el._v !== v) {
      el._v = v;
      el.textContent = v;
    }
  }

  setStats({ time, timeLabel, kills, score, acc, hs }) {
    this.text(this.time, formatClock(Math.max(0, time)));
    this.text(this.timeLabel, timeLabel);
    this.text(this.kills, kills);
    this.text(this.score, score);
    this.text(this.acc, `${acc}%`);
    this.text(this.hs, `${hs}%`);
  }

  setAmmo(ammo, mag, name, reloading, reloadP) {
    this.text(this.ammo, ammo);
    this.text(this.mag, mag);
    this.text(this.weapon, name);
    const low = ammo <= Math.ceil(mag * 0.2);
    if (this.ammo._low !== low) { this.ammo._low = low; this.ammo.classList.toggle('low', low); }
    if (this.reload.hidden === reloading) this.reload.hidden = !reloading;
    if (reloading) this.reload.style.setProperty('--p', reloadP.toFixed(2));
  }

  setFlashStats(html) {
    if (this._flashHtml === html) return;
    this._flashHtml = html;
    this.flashStat.hidden = !html;
    if (html) this.flashStat.innerHTML = html;
  }

  setFlash(alpha) {
    const v = alpha.toFixed(2);
    if (this._flashA !== v) {
      this._flashA = v;
      this.flashOverlay.style.opacity = v;
    }
  }

  feedItem(html, cls = '') {
    const el = document.createElement('div');
    el.className = `feed-item ${cls}`;
    el.innerHTML = html;
    this.feed.prepend(el);
    while (this.feed.children.length > 5) this.feed.lastChild.remove();
    setTimeout(() => el.classList.add('out'), 3800);
    setTimeout(() => el.remove(), 4300);
  }

  toast(text, cls = '') {
    this.toastEl.textContent = text;
    this.toastEl.className = `toast show ${cls}`;
    this.toastT = 1.0;
  }

  centerText(text) {
    this.center.hidden = !text;
    if (text) this.center.textContent = text;
  }

  damageNumber(pos, value, zone) {
    const el = document.createElement('div');
    el.className = `dmg ${zone}`;
    el.textContent = value;
    this.floats.appendChild(el);
    this.items.push({ el, pos: pos.clone(), t: 0, drift: (Math.random() - 0.5) * 30 });
  }

  clear() {
    for (const it of this.items) it.el.remove();
    this.items.length = 0;
    for (const el of this.barEls.values()) el.remove();
    this.barEls.clear();
    this.feed.innerHTML = '';
    this.setFlash(0);
    this.setDanger(0);
    this.setScope(false);
    this.centerText('');
  }

  project(pos, camera, w, h) {
    const v = this._v.copy(pos).project(camera);
    if (v.z > 1) return null;
    return [(v.x * 0.5 + 0.5) * w, (-v.y * 0.5 + 0.5) * h];
  }

  update(dt, camera, agents, showBars, sightLimit = 0) {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (this.hitT > 0) {
      this.hitT -= dt;
      if (this.hitT <= 0) this.hitmarker.className = 'hitmarker';
    }
    if (this.toastT > 0) {
      this.toastT -= dt;
      if (this.toastT <= 0) this.toastEl.className = 'toast';
    }
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.t += dt;
      const p = this.project(it.pos, camera, w, h);
      if (!p || it.t > 0.9) {
        if (it.t > 0.9) { it.el.remove(); this.items.splice(i, 1); }
        else it.el.style.opacity = 0;
        continue;
      }
      const rise = it.t * 46;
      it.el.style.transform = `translate(${p[0] + it.drift * it.t}px, ${p[1] - rise}px) translate(-50%, -100%)`;
      it.el.style.opacity = String(Math.max(0, 1 - Math.max(0, it.t - 0.5) / 0.4));
    }

    const seen = new Set();
    if (showBars) {
      for (const a of agents) {
        if (!a.alive || !a.visibleNow) continue;
        seen.add(a);
        let el = this.barEls.get(a);
        if (!el) {
          el = document.createElement('div');
          el.className = 'hpbar';
          el.innerHTML = '<span class="hp-name"></span><span class="hp-track"><i class="hp-health"></i><i class="hp-shield"></i></span><span class="hp-sight"><i></i></span>';
          el.querySelector('.hp-name').textContent = a.def.name;
          this.bars.appendChild(el);
          this.barEls.set(a, el);
        }
        a.headWorld(this._v);
        this._v.y += 0.32;
        const p = this.project(this._v, camera, w, h);
        if (!p) { el.style.opacity = 0; continue; }
        el.style.opacity = 1;
        el.style.transform = `translate(${p[0]}px, ${p[1]}px) translate(-50%, -100%)`;
        const max = a.maxTotal;
        el.querySelector('.hp-health').style.width = `${(a.health / max) * 100}%`;
        const sh = el.querySelector('.hp-shield');
        sh.style.width = `${(a.shield / max) * 100}%`;
        const sight = el.querySelector('.hp-sight');
        sight.hidden = !sightLimit;
        if (sightLimit) sight.firstChild.style.width = `${Math.min(1, a.sight / sightLimit) * 100}%`;
      }
    }
    for (const [a, el] of this.barEls) {
      if (!seen.has(a)) { el.remove(); this.barEls.delete(a); }
    }
  }
}

export function formatClock(t) {
  const s = Math.floor(t);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
