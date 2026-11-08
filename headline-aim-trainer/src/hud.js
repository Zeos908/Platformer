import * as THREE from 'three';

const $ = (id) => document.getElementById(id);

export class HUD {
  constructor() {
    this.root = $('hud');
    this.cross = $('crosshair');
    this.crossCtx = this.cross.getContext('2d');
    this.hitmarker = $('hitmarker');
    this.time = $('hudTime');
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
    this.crossSettings = { color: '#43f0c8', style: 'cross' };
    this.hitT = 0;
    this.toastT = 0;
    this._v = new THREE.Vector3();
    this.dpr = 1;
  }

  show(on) { this.root.hidden = !on; }

  setCrosshairSettings(color, style) {
    this.crossSettings = { color, style };
    this.crossKey = '';
  }

  drawCrosshair(errorPx = 0) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const e = Math.round(errorPx * 2) / 2;
    const key = `${this.crossSettings.color}|${this.crossSettings.style}|${e}|${dpr}`;
    if (key === this.crossKey) return;
    this.crossKey = key;
    const size = 160;
    if (this.cross.width !== size * dpr) {
      this.cross.width = this.cross.height = size * dpr;
      this.cross.style.width = this.cross.style.height = `${size}px`;
    }
    const g = this.crossCtx;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, size, size);
    const c = size / 2;
    const { color, style } = this.crossSettings;
    const rect = (x, y, w, h) => {
      g.fillStyle = 'rgba(0,0,0,0.55)';
      g.fillRect(x - 1, y - 1, w + 2, h + 2);
      g.fillStyle = color;
      g.fillRect(x, y, w, h);
    };
    if (style !== 'dot') {
      const gap = 3 + Math.min(60, e);
      const len = 6;
      const th = 2;
      rect(c - th / 2, c - gap - len, th, len);
      rect(c - th / 2, c + gap, th, len);
      rect(c - gap - len, c - th / 2, len, th);
      rect(c + gap, c - th / 2, len, th);
    }
    if (style !== 'cross') {
      const s = style === 'dot' ? 4 : 2;
      rect(c - s / 2, c - s / 2, s, s);
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

  setStats({ time, kills, acc, hs }) {
    this.text(this.time, formatClock(Math.max(0, time)));
    this.text(this.kills, kills);
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
    this.centerText('');
  }

  project(pos, camera, w, h) {
    const v = this._v.copy(pos).project(camera);
    if (v.z > 1) return null;
    return [(v.x * 0.5 + 0.5) * w, (-v.y * 0.5 + 0.5) * h];
  }

  update(dt, camera, agents, showBars) {
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
          el.innerHTML = '<span class="hp-name"></span><span class="hp-track"><i class="hp-health"></i><i class="hp-shield"></i></span>';
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
