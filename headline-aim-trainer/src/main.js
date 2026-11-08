import { DEFAULT_SETTINGS, WEAPONS, SHIELDS, HEALTH, YAW_PER_COUNT, shotsToKill } from './config.js';
import { AudioEngine } from './audio.js';
import { HUD } from './hud.js';
import { Input } from './input.js';
import { Game } from './game.js';

const $ = (id) => document.getElementById(id);
const STORE_KEY = 'headline.settings.v1';
const BEST_KEY = 'headline.best.v1';
const LAST_KEY = 'headline.last.v1';

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
game.settings = settings;
window.headline = game; // handy for tinkering in the console

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
    const evt = el.type === 'checkbox' || el.type === 'color' ? 'change' : 'input';
    el.addEventListener(evt, () => {
      if (el.type === 'checkbox') settings[key] = el.checked;
      else if (NUMERIC.has(key)) {
        const v = parseFloat(el.value);
        if (!Number.isFinite(v) || v <= 0) return;
        settings[key] = v;
      } else settings[key] = el.value;
      onSettingsChanged();
    });
    if (el.type === 'color') el.addEventListener('input', () => { settings[key] = el.value; onSettingsChanged(); });
  }
  onSettingsChanged();
}

function onSettingsChanged() {
  save(STORE_KEY, settings);
  audio.setVolume(settings.volume);
  hud.setCrosshairSettings(settings.crossColor, settings.crossStyle);
  const cm = 360 / (YAW_PER_COUNT * settings.sens) / settings.dpi * 2.54;
  $('cm360').textContent = Number.isFinite(cm) ? cm.toFixed(1) : '–';
  const total = HEALTH + SHIELDS[settings.shields];
  for (const w of Object.values(WEAPONS)) {
    const near = shotsToKill(w, total, 10);
    const far = shotsToKill(w, total, 40);
    for (const zone of ['head', 'body', 'leg']) {
      const cell = document.querySelector(`[data-stk="${w.id}-${zone}"]`);
      if (cell) cell.textContent = near[zone] === far[zone] ? String(near[zone]) : `${near[zone]} / ${far[zone]}`;
    }
  }
  const flashText = { off: 'no flashes', flare: 'curve flares', hawk: 'hawk flashes', both: 'both flashes' }[settings.flashes];
  const len = settings.duration ? `${settings.duration} s` : 'endless';
  $('startSummary').textContent = `${WEAPONS[settings.weapon].name} · ${settings.distance} range · ${settings.movement} · ${total} HP · ${flashText} · ${len}`;
  renderLastRun();
}

function bestKey() {
  const s = settings;
  return [s.weapon, s.distance, s.movement, s.speed, s.maxTargets, s.shields, s.flashes, s.flashOnly ? 'drill' : '', s.duration].join('|');
}

function renderLastRun() {
  const last = load(LAST_KEY, null);
  const best = load(BEST_KEY, {})[bestKey()];
  const el = $('lastRun');
  if (!last && !best) { el.hidden = true; return; }
  el.hidden = false;
  const parts = ['<h3>Last session</h3>'];
  if (last) {
    parts.push(mini(last.kills, 'kills'), mini(`${Math.round(last.accuracy * 100)}%`, 'accuracy'), mini(`${Math.round(last.hsRate * 100)}%`, 'headshot'));
  }
  if (best) parts.push(`<h3>Best with these settings</h3>`, mini(best.kills, 'kills'), mini(`${Math.round(best.accuracy * 100)}%`, 'accuracy'), mini(best.avgTtk ? `${Math.round(best.avgTtk * 1000)}` : '–', 'ms to kill'));
  el.innerHTML = parts.join('');
}
const mini = (v, label) => `<div class="mini"><b>${v}</b><span>${label}</span></div>`;

// ---------- screens ----------
const screens = { menu: $('menu'), pause: $('pauseScreen'), results: $('results') };
function showScreen(name) {
  for (const [k, el] of Object.entries(screens)) el.hidden = k !== name;
  const playing = name === null;
  document.body.classList.toggle('playing', playing);
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
  const isBest = r.elapsed > 5 && r.kills > 0 && (!prev || r.kills > prev.kills || (r.kills === prev.kills && r.accuracy > prev.accuracy));
  if (isBest) {
    bests[key] = { kills: r.kills, accuracy: r.accuracy, avgTtk: r.avgTtk, at: Date.now() };
    save(BEST_KEY, bests);
  }
  save(LAST_KEY, { kills: r.kills, accuracy: r.accuracy, hsRate: r.hsRate });
  renderResults(r, isBest, prev);
  showScreen('results');
};

function ms(v) { return v === null ? '–' : `${Math.round(v * 1000)}`; }

function renderResults(r, isBest, prev) {
  const s = settings;
  const total = HEALTH + SHIELDS[s.shields];
  $('resultsSub').textContent = `${WEAPONS[s.weapon].name} · ${s.distance} range · ${s.movement} · ${total} HP agents · ${Math.round(r.elapsed)} s`;
  const z = r.zones;
  const zt = Math.max(1, z.head + z.body + z.leg);
  const perMin = r.elapsed > 0 ? (r.kills / r.elapsed) * 60 : 0;
  let html = `
    <div class="big-stats">
      <div><b class="${isBest ? 'pb' : ''}">${r.kills}</b><span>${isBest ? 'Kills · new best' : prev ? `Kills · best ${prev.kills}` : 'Kills'}</span></div>
      <div><b>${Math.round(r.accuracy * 100)}%</b><span>Accuracy</span></div>
      <div><b>${Math.round(r.hsRate * 100)}%</b><span>Headshot rate</span></div>
      <div><b>${ms(r.avgReaction)}</b><span>ms to first hit</span></div>
      <div><b>${ms(r.avgTtk)}</b><span>ms to kill</span></div>
    </div>
    <p class="section-label">Where your hits landed</p>
    <div class="zones" role="img" aria-label="Head ${z.head}, body ${z.body}, legs ${z.leg}">
      <i class="z-head" style="width:${(z.head / zt) * 100}%"></i><i class="z-body" style="width:${(z.body / zt) * 100}%"></i><i class="z-leg" style="width:${(z.leg / zt) * 100}%"></i>
    </div>
    <div class="zone-key"><span><i class="z-head" style="background:var(--sodium)"></i>Head ${z.head}</span><span><i style="background:var(--bone)"></i>Body ${z.body}</span><span><i style="background:var(--dim)"></i>Legs ${z.leg}</span></div>
    <dl class="detail">
      <div><dt>Shots / hits</dt><dd>${r.shots} / ${r.hits}</dd></div>
      <div><dt>One-tap kills</dt><dd>${r.oneTaps}</dd></div>
      <div><dt>Headshot kills</dt><dd>${r.headKills}</dd></div>
      <div><dt>Kills per minute</dt><dd>${perMin.toFixed(1)}</dd></div>
      <div><dt>Got back to cover</dt><dd>${r.escaped}</dd></div>
      <div><dt>Best streak</dt><dd>${r.bestStreak}</dd></div>
      <div><dt>Damage dealt</dt><dd>${Math.round(r.damage)}</dd></div>
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
  $('resultsBody').innerHTML = html;
  $('resultsBody').style.display = 'flex';
  $('resultsBody').style.flexDirection = 'column';
  $('resultsBody').style.gap = '14px';
}

// ---------- input wiring ----------
input.onUnlock = () => {
  if (game.mode === 'playing' || game.mode === 'countdown') pause();
};
input.onKey = (e) => {
  if (game.mode === 'playing' || game.mode === 'countdown') {
    const k = e.key.toLowerCase();
    if (k === 'r') game.weapon.startReload();
    else if (k === '1') game.weapon.switchTo('rifle');
    else if (k === '2') game.weapon.switchTo('revolver');
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
