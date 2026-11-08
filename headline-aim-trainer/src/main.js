import { DEFAULT_SETTINGS, WEAPONS, SHIELDS, HEALTH, YAW_PER_COUNT, ENDLESS, shotsToKill, sessionConfig } from './config.js';
import {
  parseCode, encodeCode, describe, drawSection,
  PRESET_COLORS, PRESET_NAMES, CROSSHAIR_PRESETS, DEFAULT_CODE,
} from './crosshair.js';
import { AudioEngine } from './audio.js';
import { setEnemyHighlight, HIGHLIGHT_COLORS } from './agents.js';
import { HUD } from './hud.js';
import { Input } from './input.js';
import { Game } from './game.js';

const $ = (id) => document.getElementById(id);
const STORE_KEY = 'headline.settings.v1';
const BEST_KEY = 'headline.best.v2';
const LAST_KEY = 'headline.last.v2';

function load(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function save(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked */ }
}

const settings = { ...DEFAULT_SETTINGS, ...load(STORE_KEY, {}) };
const NUMERIC = new Set(['maxTargets', 'duration', 'sens', 'dpi', 'scopedMult', 'volume']);
const MODE_NAMES = { training: 'Training', endless: 'Endless', operator: 'Operator' };

const audio = new AudioEngine();
audio.setVolume(settings.volume);
const hud = new HUD();
const canvas = $('view');
const input = new Input(canvas);
let game;
try {
  game = new Game(canvas, { audio, hud, input });
} catch (err) {
  document.body.innerHTML = `<div style="padding:32px;font:16px/1.5 sans-serif;color:#ece6d6;background:#0b1118;height:100%">WebGL could not start in this browser (${String(err.message || err)}). Try a recent Chrome, Edge or Firefox with hardware acceleration on.</div>`;
  throw err;
}
game.settings = sessionConfig(settings);
window.headline = game; // handy for tinkering in the console

// ---------- crosshair ----------
let profile;
try {
  profile = parseCode(settings.crosshairCode);
} catch (e) {
  profile = parseCode(DEFAULT_CODE);
}

function applyProfile(p, { status, statusClass = '' } = {}) {
  profile = p;
  settings.crosshairCode = encodeCode(p);
  save(STORE_KEY, settings);
  hud.setCrosshairProfile(p);
  $('xhCode').value = settings.crosshairCode;
  setStatus(status ?? describe(p), statusClass);
  syncCrosshairControls();
  drawPreviews();
}

function setStatus(text, cls = '') {
  const el = $('xhStatus');
  el.textContent = text;
  el.className = `xh-status ${cls}`;
}

function drawPreviews() {
  const actual = $('xhActual');
  const zoom = $('xhZoom');
  const dpr = window.devicePixelRatio || 1;
  // Actual size: one canvas pixel per device pixel.
  const cssSize = 120;
  const dev = Math.round(cssSize * dpr);
  actual.width = actual.height = dev;
  actual.style.width = actual.style.height = `${cssSize}px`;
  drawSection(actual.getContext('2d'), profile.primary, { size: dev, errorPx: 3.3 * dpr, basePx: 3.3 * dpr });
  // 4x zoom: draw at 1/4 size then scale up with no smoothing.
  const small = document.createElement('canvas');
  small.width = small.height = 40;
  drawSection(small.getContext('2d'), profile.primary, { size: 40, errorPx: 3.3, basePx: 3.3 });
  zoom.width = zoom.height = 160;
  zoom.style.width = zoom.style.height = `${cssSize}px`;
  const g = zoom.getContext('2d');
  g.imageSmoothingEnabled = false;
  g.clearRect(0, 0, 160, 160);
  g.drawImage(small, 0, 0, 160, 160);
}

function syncCrosshairControls() {
  const s = profile.primary;
  $('xhOutlines').checked = !!s.h;
  $('xhDot').checked = !!s.d;
  $('xhInner').checked = !!s.inner.b;
  $('xhOuter').checked = !!s.outer.b;
  for (const b of document.querySelectorAll('#xhSwatches .swatch')) b.setAttribute('aria-pressed', String(Number(b.dataset.c) === s.c));
  const custom = $('xhCustom');
  custom.value = s.c === 8 ? `#${s.u.slice(0, 6).toLowerCase()}` : PRESET_COLORS[s.c].toLowerCase();
}

function editProfile(fn) {
  const p = structuredClone(profile);
  fn(p.primary, p);
  applyProfile(p);
}

function bindCrosshair() {
  const sw = $('xhSwatches');
  PRESET_COLORS.forEach((hex, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'swatch';
    b.dataset.c = String(i);
    b.style.background = hex;
    b.title = PRESET_NAMES[i];
    b.setAttribute('aria-label', PRESET_NAMES[i]);
    b.addEventListener('click', () => editProfile((s) => { s.c = i; }));
    sw.appendChild(b);
  });
  const custom = document.createElement('input');
  custom.type = 'color';
  custom.id = 'xhCustom';
  custom.title = 'Custom color';
  custom.setAttribute('aria-label', 'Custom color');
  custom.addEventListener('input', () => editProfile((s) => { s.c = 8; s.u = `${custom.value.slice(1).toUpperCase()}FF`; }));
  sw.appendChild(custom);

  $('xhOutlines').addEventListener('change', (e) => editProfile((s) => { s.h = e.target.checked ? 1 : 0; }));
  $('xhDot').addEventListener('change', (e) => editProfile((s) => { s.d = e.target.checked ? 1 : 0; }));
  $('xhInner').addEventListener('change', (e) => editProfile((s) => { s.inner.b = e.target.checked ? 1 : 0; }));
  $('xhOuter').addEventListener('change', (e) => editProfile((s) => { s.outer.b = e.target.checked ? 1 : 0; }));

  const doImport = () => {
    try {
      const p = parseCode($('xhCode').value);
      applyProfile(p, { status: `Imported. ${describe(p)}`, statusClass: 'ok' });
    } catch (err) {
      setStatus(err.message, 'err');
    }
  };
  $('xhImport').addEventListener('click', doImport);
  $('xhCode').addEventListener('keydown', (e) => { if (e.key === 'Enter') doImport(); });
  $('xhCode').addEventListener('paste', () => setTimeout(doImport, 0));
  $('xhCopy').addEventListener('click', async () => {
    const code = encodeCode(profile);
    try {
      await navigator.clipboard.writeText(code);
      setStatus(`Copied: ${code}`, 'ok');
    } catch (err) {
      $('xhCode').value = code;
      $('xhCode').select();
      setStatus('Copy is blocked here. The code is selected, press Ctrl+C.', '');
    }
  });

  const presets = $('xhPresets');
  for (const pr of CROSSHAIR_PRESETS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-small';
    b.textContent = pr.name;
    b.addEventListener('click', () => applyProfile(parseCode(pr.code), { status: `${pr.name}. ${describe(parseCode(pr.code))}` }));
    presets.appendChild(b);
  }
  applyProfile(profile);
}

// ---------- settings UI ----------
function bindSettings() {
  for (const el of document.querySelectorAll('.settings input[type="radio"]')) {
    el.checked = String(settings[el.name]) === el.value;
    el.addEventListener('change', () => {
      if (!el.checked) return;
      settings[el.name] = NUMERIC.has(el.name) ? Number(el.value) : el.value;
      onSettingsChanged();
    });
  }
  for (const el of document.querySelectorAll('[data-setting]')) {
    const key = el.dataset.setting;
    if (el.type === 'checkbox') el.checked = !!settings[key];
    else el.value = settings[key];
    const evt = el.type === 'checkbox' ? 'change' : 'input';
    el.addEventListener(evt, () => {
      if (el.type === 'checkbox') settings[key] = el.checked;
      else if (NUMERIC.has(key)) {
        const v = parseFloat(el.value);
        if (!Number.isFinite(v) || v <= 0) return;
        settings[key] = v;
      } else settings[key] = el.value;
      onSettingsChanged();
    });
  }
  onSettingsChanged();
}

function updateModeUI() {
  const mode = settings.mode;
  for (const el of document.querySelectorAll('[data-for]')) el.hidden = !el.dataset.for.split(' ').includes(mode);
  for (const el of document.querySelectorAll('[data-lock]')) el.hidden = el.dataset.lock !== mode;
  $('targetsCard').disabled = mode === 'endless';
  $('flashesCard').disabled = mode === 'endless';
  for (const el of document.querySelectorAll('#distanceRow input')) el.disabled = mode === 'operator';
  $('distanceRow').style.opacity = mode === 'operator' ? '0.45' : '';
  $('lengthRow').hidden = mode === 'endless';
}

function onSettingsChanged() {
  save(STORE_KEY, settings);
  audio.setVolume(settings.volume);
  setEnemyHighlight(settings.highlight in HIGHLIGHT_COLORS ? HIGHLIGHT_COLORS[settings.highlight] : HIGHLIGHT_COLORS.red);
  updateModeUI();
  const eff = sessionConfig(settings);
  game.settings = eff;
  game.previewWeapon(eff.weapon);
  const cm = 360 / (YAW_PER_COUNT * settings.sens) / settings.dpi * 2.54;
  $('cm360').textContent = Number.isFinite(cm) ? cm.toFixed(1) : '–';
  const total = HEALTH + SHIELDS[eff.shields];
  for (const w of Object.values(WEAPONS)) {
    const near = shotsToKill(w, total, 10);
    const far = shotsToKill(w, total, 40);
    for (const zone of ['head', 'body', 'leg']) {
      const cell = document.querySelector(`[data-stk="${w.id}-${zone}"]`);
      if (cell) cell.textContent = near[zone] === far[zone] ? String(near[zone]) : `${near[zone]} / ${far[zone]}`;
    }
  }
  let summary;
  if (eff.mode === 'endless') {
    summary = `Endless · ${WEAPONS[eff.weapon].name} · everything on · ${ENDLESS.sightLimit} s line of sight kills you`;
  } else {
    const flashText = { off: 'no flashes', flare: 'curve flares', hawk: 'hawk flashes', both: 'both flashes' }[eff.flashes];
    const len = eff.duration ? `${eff.duration} s` : 'untimed';
    const dist = eff.mode === 'operator' ? '30 m+' : `${eff.distance} range`;
    summary = `${MODE_NAMES[eff.mode]} · ${WEAPONS[eff.weapon].name} · ${dist} · ${eff.movement} · ${total} HP · ${flashText} · ${len}`;
  }
  $('startSummary').textContent = summary;
  renderLastRun();
}

function bestKey() {
  const s = sessionConfig(settings);
  if (s.mode === 'endless') return ['endless', s.weapon].join('|');
  return [s.mode, s.weapon, s.distance, s.movement, s.speed, s.maxTargets, s.shields, s.flashes, s.flashOnly ? 'drill' : '', s.duration].join('|');
}

function renderLastRun() {
  const last = load(LAST_KEY, null);
  const best = load(BEST_KEY, {})[bestKey()];
  const el = $('lastRun');
  if (!last && !best) { el.hidden = true; return; }
  el.hidden = false;
  const parts = [];
  if (last) {
    parts.push(`<h3>Last session · ${MODE_NAMES[last.mode] || 'Training'}</h3>`, mini(last.score, 'score'), mini(last.kills, 'kills'), mini(`${Math.round(last.accuracy * 100)}%`, 'accuracy'));
  }
  if (best) {
    parts.push('<h3>Best with these settings</h3>', mini(best.score, 'score'), mini(best.kills, 'kills'),
      best.survived ? mini(formatTime(best.survived), 'survived') : mini(best.bulletsPerKill ? best.bulletsPerKill.toFixed(1) : '–', 'bullets / kill'));
  }
  el.innerHTML = parts.join('');
}
const mini = (v, label) => `<div class="mini"><b>${v}</b><span>${label}</span></div>`;
const formatTime = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

// ---------- screens ----------
const screens = { menu: $('menu'), pause: $('pauseScreen'), results: $('results') };
function showScreen(name) {
  for (const [k, el] of Object.entries(screens)) el.hidden = k !== name;
  document.body.classList.toggle('playing', name === null);
  hud.show(game.mode !== 'demo');
}

async function start() {
  audio.init();
  game.startSession({ ...settings });
  showScreen(null);
  input.active = true;
  const r = await input.lock();
  $('freeBanner').hidden = r !== 'free';
  if (r === 'retry') pause();
}

function pause() {
  if (game.mode !== 'playing' && game.mode !== 'countdown') return;
  game.pause();
  input.active = false;
  $('pauseHint').textContent = input.freeMode ? 'Mouse look works while the cursor is over the window.' : 'Click resume to lock the mouse again.';
  showScreen('pause');
}

async function resume() {
  audio.init();
  input.active = true;
  const r = await input.lock();
  if (r === 'retry') {
    input.active = false;
    $('pauseHint').textContent = 'The browser needs a second after Esc. Click resume again.';
    return;
  }
  game.resume();
  showScreen(null);
}

function toMenu() {
  input.active = false;
  input.unlock();
  game.toDemo();
  showScreen('menu');
}

game.onSessionEnd = (r) => {
  input.active = false;
  input.unlock();
  const key = bestKey();
  const bests = load(BEST_KEY, {});
  const prev = bests[key];
  const isBest = r.elapsed > 5 && r.score > 0 && (!prev || r.score > prev.score);
  if (isBest) {
    bests[key] = { score: r.score, kills: r.kills, accuracy: r.accuracy, bulletsPerKill: r.bulletsPerKill, survived: r.mode === 'endless' ? r.elapsed : null, at: Date.now() };
    save(BEST_KEY, bests);
  }
  save(LAST_KEY, { mode: r.mode, score: r.score, kills: r.kills, accuracy: r.accuracy });
  renderResults(r, isBest, prev);
  showScreen('results');
};

function ms(v) { return v === null ? '–' : `${Math.round(v * 1000)}`; }

function renderResults(r, isBest, prev) {
  const s = sessionConfig(settings);
  const total = HEALTH + SHIELDS[s.shields];
  const endless = r.mode === 'endless';
  const title = $('results').querySelector('h2');
  title.firstChild.textContent = endless ? (r.killedBy ? `Killed by ${r.killedBy}` : 'Run over') : 'Session report';
  $('resultsSub').textContent = endless
    ? `Endless · ${WEAPONS[s.weapon].name} · survived ${formatTime(r.elapsed)}${r.killedBy ? ` · ${r.killedBy} had line of sight for ${ENDLESS.sightLimit} s` : ''}`
    : `${MODE_NAMES[r.mode]} · ${WEAPONS[s.weapon].name} · ${s.mode === 'operator' ? '30 m+' : `${s.distance} range`} · ${s.movement} · ${total} HP agents · ${Math.round(r.elapsed)} s`;
  const z = r.zones;
  const zt = Math.max(1, z.head + z.body + z.leg);
  const perMin = r.elapsed > 0 ? (r.kills / r.elapsed) * 60 : 0;
  const bpk = r.bulletsPerKill === null ? '–' : r.bulletsPerKill.toFixed(1);
  let html = `
    <div class="big-stats${endless ? ' six' : ''}">
      <div><b class="${isBest ? 'pb' : ''}">${r.score}</b><span>${isBest ? 'Score · new best' : prev ? `Score · best ${prev.score}` : 'Score'}</span></div>
      <div><b>${r.kills}</b><span>Kills</span></div>
      ${endless ? `<div><b>${formatTime(r.elapsed)}</b><span>Survived</span></div>` : ''}
      <div><b>${bpk}</b><span>Bullets per kill</span></div>
      <div><b>${r.efficiency === null ? '–' : `${Math.round(r.efficiency * 100)}%`}</b><span>Bullet efficiency</span></div>
      <div><b>${Math.round(r.accuracy * 100)}%</b><span>Accuracy</span></div>
    </div>
    <p class="formula">Score per kill = <b>1000</b> × fewest bullets that could have killed it ÷ bullets you fired since your last kill</p>
    <p class="section-label">Where your hits landed</p>
    <div class="zones" role="img" aria-label="Head ${z.head}, body ${z.body}, legs ${z.leg}">
      <i class="z-head" style="width:${(z.head / zt) * 100}%"></i><i class="z-body" style="width:${(z.body / zt) * 100}%"></i><i class="z-leg" style="width:${(z.leg / zt) * 100}%"></i>
    </div>
    <div class="zone-key"><span><i style="background:var(--sodium)"></i>Head ${z.head}</span><span><i style="background:var(--bone)"></i>Body ${z.body}</span><span><i style="background:var(--dim)"></i>Legs ${z.leg}</span></div>
    <dl class="detail">
      <div><dt>Headshot rate</dt><dd>${Math.round(r.hsRate * 100)}%</dd></div>
      <div><dt>Shots / hits</dt><dd>${r.shots} / ${r.hits}</dd></div>
      <div><dt>One-tap kills</dt><dd>${r.oneTaps}</dd></div>
      <div><dt>ms to first hit</dt><dd>${ms(r.avgReaction)}</dd></div>
      <div><dt>ms to kill</dt><dd>${ms(r.avgTtk)}</dd></div>
      <div><dt>Kills per minute</dt><dd>${perMin.toFixed(1)}</dd></div>
      <div><dt>Got back to cover</dt><dd>${r.escaped}</dd></div>
      <div><dt>Best streak</dt><dd>${r.bestStreak}</dd></div>
      <div><dt>Avg kill distance</dt><dd>${r.avgDist === null ? '–' : `${Math.round(r.avgDist)} m`}</dd></div>
    </dl>`;
  if (r.flashes.total > 0) {
    const f = r.flashes;
    html += `
    <p class="section-label">Flashes</p>
    <dl class="detail">
      <div><dt>Dodged</dt><dd class="good">${f.dodged} / ${f.total}</dd></div>
      <div><dt>Partial</dt><dd class="warn">${f.partial}</dd></div>
      <div><dt>Fully flashed</dt><dd class="bad">${f.flashed}</dd></div>
      <div><dt>Time blind</dt><dd>${f.blindTime.toFixed(1)} s</dd></div>
    </dl>`;
  }
  const body = $('resultsBody');
  body.innerHTML = html;
  body.style.display = 'flex';
  body.style.flexDirection = 'column';
  body.style.gap = '14px';
}

// ---------- input wiring ----------
input.onUnlock = () => {
  if (game.mode === 'playing' || game.mode === 'countdown') pause();
};
input.onKey = (e) => {
  if (game.mode === 'playing' || game.mode === 'countdown') {
    const k = e.key.toLowerCase();
    if (k === 'r') game.weapon.startReload();
    else if (k === '1') game.trySwitch('rifle');
    else if (k === '2') game.trySwitch('revolver');
    else if (k === 'escape' && input.freeMode) pause();
  } else if (game.mode === 'paused' && e.key === 'Escape' && input.freeMode) {
    resume();
  }
};
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});

$('startBtn').addEventListener('click', start);
$('resumeBtn').addEventListener('click', resume);
$('endBtn').addEventListener('click', () => { game.endSession(); });
$('quitBtn').addEventListener('click', toMenu);
$('againBtn').addEventListener('click', start);
$('menuBtn').addEventListener('click', toMenu);
window.addEventListener('resize', () => game.resize());

if (matchMedia('(hover: none) and (pointer: coarse)').matches) $('touchNote').hidden = false;

bindSettings();
bindCrosshair();
showScreen('menu');

// ---------- loop ----------
let last = performance.now();
let fpsAcc = 0;
let fpsFrames = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  game.frame(dt);
  fpsAcc += dt;
  fpsFrames++;
  if (fpsAcc > 0.5) {
    $('hudFps').textContent = `${Math.round(fpsFrames / fpsAcc)} fps`;
    fpsAcc = 0;
    fpsFrames = 0;
  }
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
