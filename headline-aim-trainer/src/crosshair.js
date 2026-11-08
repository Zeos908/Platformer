// Valorant crosshair profile codes: parse, encode and draw.
//
// A code is a list of key;value pairs separated by semicolons, starting with a
// version token ("0"). Section markers switch what the following keys apply to:
//   (none) general   s = advanced options, p = ADS copies primary, c = override all primaries
//   P      primary   c = color index, u = custom RRGGBBAA, h = outlines, t = outline thickness,
//                    o = outline opacity, d = center dot, z = dot thickness, a = dot opacity,
//                    m = override firing-error offset with crosshair offset
//                    0x / 1x = inner / outer line keys:
//                      b show, t thickness, l length, v vertical length, g vertical length unlinked,
//                      o offset, a opacity, m movement error, s movement multiplier,
//                      f firing error, e firing multiplier
//   A      ADS crosshair (same keys as P), used while zoomed when p = 0
//   S      sniper center dot: d show, c color index, t custom RRGGBBAA, s thickness, o opacity
// Keys that are left out keep their default value, so short codes are normal.
// Unknown keys are kept as-is so a code survives an import/export round trip.
// The key table follows the community-documented format (Riot does not publish one).

export const PRESET_COLORS = ['#FFFFFF', '#00FF00', '#7FFF00', '#DFFF00', '#FFFF00', '#00FFFF', '#FF00FF', '#FF0000'];
export const PRESET_NAMES = ['White', 'Green', 'Yellow green', 'Green yellow', 'Yellow', 'Cyan', 'Pink', 'Red'];

const LINE_KEYS = ['b', 't', 'l', 'v', 'g', 'o', 'a', 'm', 's', 'f', 'e'];
const LINE_DEFAULTS = {
  inner: { b: 1, t: 2, l: 6, v: 6, g: 0, o: 3, a: 0.8, m: 0, s: 1, f: 1, e: 1 },
  outer: { b: 1, t: 2, l: 2, v: 2, g: 0, o: 10, a: 0.35, m: 1, s: 1, f: 1, e: 1 },
};
const SECTION_KEYS = ['c', 'u', 'h', 't', 'o', 'd', 'z', 'a', 'm'];
const SECTION_DEFAULTS = { c: 0, u: 'FFFFFFFF', h: 1, t: 1, o: 0.5, d: 0, z: 2, a: 1, m: 0 };
const SNIPER_KEYS = ['d', 'c', 't', 's', 'o'];
const SNIPER_DEFAULTS = { d: 1, c: 7, t: 'FF0000FF', s: 1, o: 0.8 };
const GENERAL_KEYS = ['s', 'p', 'c'];
const GENERAL_DEFAULTS = { s: 0, p: 1, c: 0 };
const HEX_KEYS = { section: 'u', sniper: 't' };

export const DEFAULT_CODE = '0';

export const CROSSHAIR_PRESETS = [
  { name: 'Valorant default', code: '0' },
  { name: 'Small cyan', code: '0;P;c;5;h;0;0l;4;0o;2;0a;1;0f;0;1b;0' },
  { name: 'Green plus', code: '0;P;c;1;o;1;0t;1;0l;3;0o;2;0a;1;0f;0;1b;0' },
  { name: 'Cyan dot', code: '0;P;c;5;h;0;d;1;z;3;0b;0;1b;0' },
  { name: 'Pink T-gap', code: '0;P;c;6;h;0;0t;1;0l;3;0v;3;0g;1;0o;3;0a;1;0f;0;1b;0' },
];

function newSection() {
  return {
    ...SECTION_DEFAULTS,
    inner: { ...LINE_DEFAULTS.inner },
    outer: { ...LINE_DEFAULTS.outer },
    extra: [],
  };
}

export function defaultProfile() {
  return {
    general: { ...GENERAL_DEFAULTS, extra: [] },
    primary: newSection(),
    ads: null,
    sniper: { ...SNIPER_DEFAULTS, extra: [] },
    hasSniper: false,
  };
}

function num(key, value) {
  const n = Number(value);
  if (value === '' || !Number.isFinite(n)) throw new Error(`"${key}" should be a number but is "${value}".`);
  return n;
}

function hex(key, value) {
  const v = String(value).replace(/^#/, '').toUpperCase();
  if (!/^[0-9A-F]{6}([0-9A-F]{2})?$/.test(v)) throw new Error(`"${key}" should be a hex color like FF00FFFF.`);
  return v.length === 6 ? `${v}FF` : v;
}

/** Parse a crosshair code. Throws an Error with a readable message if it is not one. */
export function parseCode(input) {
  const code = String(input ?? '').trim().replace(/\s+/g, '');
  if (!code) throw new Error('Paste a crosshair code first.');
  const tokens = code.split(';');
  if (tokens[tokens.length - 1] === '') tokens.pop();
  if (!/^\d+$/.test(tokens[0])) throw new Error('Crosshair codes start with "0;" (for example 0;P;c;5;0l;4).');
  const p = defaultProfile();
  let section = 'general';
  let target = p.general;
  for (let i = 1; i < tokens.length;) {
    const tok = tokens[i];
    if (tok === 'P' || tok === 'A' || tok === 'S') {
      if (tok === 'P') { section = 'section'; target = p.primary; }
      if (tok === 'A') { section = 'section'; target = p.ads = p.ads || newSection(); }
      if (tok === 'S') { section = 'sniper'; target = p.sniper; p.hasSniper = true; }
      i++;
      continue;
    }
    if (tok === 'NAME') { i += 2; continue; } // name tag some sites append
    const value = tokens[i + 1];
    if (value === undefined) throw new Error(`"${tok}" has no value. Check the end of the code.`);
    i += 2;
    setKey(target, section, tok, value);
  }
  return p;
}

function setKey(target, section, key, value) {
  if (section === 'section' && /^[01][a-z]$/.test(key) && LINE_KEYS.includes(key[1])) {
    target[key[0] === '0' ? 'inner' : 'outer'][key[1]] = num(key, value);
    return;
  }
  const keys = section === 'general' ? GENERAL_KEYS : section === 'sniper' ? SNIPER_KEYS : SECTION_KEYS;
  if (!keys.includes(key)) {
    target.extra.push([key, value]);
    return;
  }
  target[key] = key === HEX_KEYS[section] ? hex(key, value) : num(key, value);
}

const fmt = (v) => (typeof v === 'number' ? String(Math.round(v * 1000) / 1000) : v);

function encodeSection(sec) {
  const out = [];
  for (const k of SECTION_KEYS) {
    if (k === 'u') { if (sec.c === 8) out.push('u', sec.u); continue; }
    if (sec[k] !== SECTION_DEFAULTS[k]) out.push(k, fmt(sec[k]));
  }
  for (const [k, v] of sec.extra) out.push(k, v);
  for (const [prefix, line] of [['0', sec.inner], ['1', sec.outer]]) {
    const def = LINE_DEFAULTS[prefix === '0' ? 'inner' : 'outer'];
    for (const k of LINE_KEYS) if (line[k] !== def[k]) out.push(prefix + k, fmt(line[k]));
  }
  return out;
}

/** Turn a profile back into a code Valorant can import. */
export function encodeCode(p) {
  const out = ['0'];
  for (const k of GENERAL_KEYS) if (p.general[k] !== GENERAL_DEFAULTS[k]) out.push(k, fmt(p.general[k]));
  for (const [k, v] of p.general.extra) out.push(k, v);
  const prim = encodeSection(p.primary);
  if (prim.length) out.push('P', ...prim);
  if (p.ads) {
    const ads = encodeSection(p.ads);
    if (ads.length) out.push('A', ...ads);
  }
  if (p.hasSniper) {
    const sn = [];
    for (const k of SNIPER_KEYS) {
      if (k === 't') { if (p.sniper.c === 8) sn.push('t', p.sniper.t); continue; }
      if (p.sniper[k] !== SNIPER_DEFAULTS[k]) sn.push(k, fmt(p.sniper[k]));
    }
    for (const [k, v] of p.sniper.extra) sn.push(k, v);
    if (sn.length) out.push('S', ...sn);
  }
  return out.join(';');
}

export function colorOf(sec) {
  if (sec.c === 8) return `#${sec.u.slice(0, 6)}`;
  return PRESET_COLORS[sec.c] || '#FFFFFF';
}

export function sniperColor(sn) {
  if (sn.c === 8) return `#${sn.t.slice(0, 6)}`;
  return PRESET_COLORS[sn.c] || '#FF0000';
}

/** Which section to draw: the ADS section only applies when the profile asks for it. */
export function sectionFor(p, zoomed) {
  return zoomed && p.ads && p.general.p === 0 ? p.ads : p.primary;
}

/** One-line description for the settings panel. */
export function describe(p) {
  const s = p.primary;
  const parts = [];
  parts.push(s.c === 8 ? `custom #${s.u.slice(0, 6)}` : PRESET_NAMES[s.c] || 'white');
  parts.push(s.h ? `outline ${fmt(s.t)}px` : 'no outline');
  if (s.d) parts.push(`dot ${fmt(s.z)}px`);
  const line = (name, l) => {
    if (!l.b || l.t <= 0) return `${name} off`;
    const len = l.g ? `${fmt(l.l)}/${fmt(l.v)}` : fmt(l.l);
    return `${name} ${len}×${fmt(l.t)} gap ${fmt(l.o)}${l.f ? ' + error' : ''}`;
  };
  parts.push(line('inner', s.inner), line('outer', s.outer));
  if (p.ads && p.general.p === 0) parts.push('own ADS crosshair');
  return parts.join(' · ');
}

let outlineCanvas = null;

/**
 * Draw one crosshair section centered in a square canvas, in device pixels.
 * errorPx: current firing error of the weapon on screen, basePx: its resting error.
 */
export function drawSection(ctx, sec, { size, errorPx = 0, basePx = 0, alpha = 1 }) {
  ctx.clearRect(0, 0, size, size);
  const c = Math.floor(size / 2);
  const rects = [];
  if (sec.d && sec.z > 0) {
    const z = Math.max(1, Math.round(sec.z));
    rects.push([c - Math.floor(z / 2), c - Math.floor(z / 2), z, z, sec.a]);
  }
  for (const line of [sec.inner, sec.outer]) {
    if (!line.b || line.t <= 0 || line.a <= 0) continue;
    const err = line.f ? line.e * (sec.m ? Math.max(0, errorPx - basePx) : errorPx) : 0;
    const gap = Math.round(line.o + err);
    const t = Math.max(1, Math.round(line.t));
    const half = Math.floor(t / 2);
    const hl = Math.round(line.l);
    const vl = Math.round(line.g ? line.v : line.l);
    if (hl > 0) {
      rects.push([c - gap - hl, c - half, hl, t, line.a]);
      rects.push([c + gap, c - half, hl, t, line.a]);
    }
    if (vl > 0) {
      rects.push([c - half, c - gap - vl, t, vl, line.a]);
      rects.push([c - half, c + gap, t, vl, line.a]);
    }
  }
  if (sec.h && sec.t > 0 && sec.o > 0) {
    // Outlines go on their own layer so overlaps do not double up.
    if (!outlineCanvas) outlineCanvas = document.createElement('canvas');
    if (outlineCanvas.width !== size) outlineCanvas.width = outlineCanvas.height = size;
    const o = outlineCanvas.getContext('2d');
    o.clearRect(0, 0, size, size);
    o.fillStyle = '#000';
    const w = Math.max(1, Math.round(sec.t));
    for (const [x, y, rw, rh] of rects) {
      o.fillRect(x - w, y - w, rw + w * 2, w);
      o.fillRect(x - w, y + rh, rw + w * 2, w);
      o.fillRect(x - w, y, w, rh);
      o.fillRect(x + rw, y, w, rh);
    }
    ctx.globalAlpha = Math.min(1, sec.o) * alpha;
    ctx.drawImage(outlineCanvas, 0, 0);
  }
  ctx.fillStyle = colorOf(sec);
  for (const [x, y, w, h, a] of rects) {
    ctx.globalAlpha = Math.min(1, a) * alpha;
    ctx.fillRect(x, y, w, h);
  }
  ctx.globalAlpha = 1;
}
