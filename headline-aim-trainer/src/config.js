// Tuning data for the range. Damage, fire rate, magazine and health numbers
// follow the public stat sheets of the two reference guns; recoil and spread
// curves are hand-tuned approximations of how those guns feel.

export const DEG = Math.PI / 180;

/** Degrees of view rotation per mouse count at sensitivity 1.0 (Valorant's scale). */
export const YAW_PER_COUNT = 0.07;
/** Horizontal field of view in degrees (fixed, like the reference game at 16:9). */
export const H_FOV = 103;
export const EYE_HEIGHT = 1.6;

export const HEALTH = 100;
export const SHIELDS = { none: 0, light: 25, heavy: 50 };

/** Agent movement speeds in m/s. Running agents make footstep sounds, walking agents are silent. */
export const SPEEDS = { walk: 3.9, run: 6.75 };

// Rifle spray: per-bullet view kick in degrees [pitch up, yaw right].
// First bullets climb gently, bullets 4-9 climb hard, then the spray
// sways left and right along the top.
const RIFLE_PATTERN = [
  [0.30, 0.00], [0.42, 0.02], [0.58, -0.03], [0.84, 0.05], [1.02, -0.05],
  [1.12, 0.08], [1.08, 0.10], [0.92, 0.14], [0.66, 0.20], [0.34, 0.36],
  [0.18, 0.46], [0.14, 0.50], [0.10, 0.38], [0.10, -0.56], [0.08, -0.66],
  [0.08, -0.64], [0.05, -0.54], [0.05, -0.38], [0.05, 0.52], [0.05, 0.66],
  [0.05, 0.60], [0.05, 0.40], [0.05, -0.50], [0.05, -0.60], [0.05, -0.50],
];

export const WEAPONS = {
  rifle: {
    id: 'rifle',
    name: 'Rifle',
    slot: 1,
    auto: true,
    fireRate: 9.75,          // rounds per second
    adsFireRateMult: 0.9,
    magSize: 25,
    reloadTime: 2.5,
    equipTime: 1.0,
    zoom: 1.25,
    // Damage does not fall off with range.
    falloff: [{ upTo: Infinity, head: 160, body: 40, leg: 34 }],
    spread: { base: 0.25, adsBase: 0.16, max: 1.5, adsMax: 1.1, rampStart: 1, rampEnd: 10 },
    recoil: {
      pattern: RIFLE_PATTERN,
      jitter: 0.06,
      adsMult: 0.85,
      recoveryDelay: 0.13,   // seconds after the last shot before recovery starts
      heatDecay: 11,         // bullets of "heat" recovered per second
      viewRecover: 9,        // exponential view recovery rate
    },
    viewKick: { back: 0.028, rot: 0.045 },
  },
  revolver: {
    id: 'revolver',
    name: 'Revolver',
    slot: 2,
    auto: true,              // holding the trigger fires at the max rate
    fireRate: 4,
    magSize: 6,
    reloadTime: 2.25,
    equipTime: 1.0,
    zoom: null,
    falloff: [
      { upTo: 30, head: 159, body: 55, leg: 46 },
      { upTo: Infinity, head: 145, body: 50, leg: 42 },
    ],
    spread: { base: 0.25, perHeat: 1.25, max: 2.4 },
    recoil: {
      kick: [2.4, 0.35],     // pitch per shot, max random yaw
      jitter: 0.2,
      recoveryDelay: 0.06,
      heatDecay: 2.5,
      viewRecover: 7,
    },
    viewKick: { back: 0.05, rot: 0.2 },
  },
};

export function damageFor(weapon, zone, distance) {
  const band = weapon.falloff.find((b) => distance <= b.upTo) || weapon.falloff[weapon.falloff.length - 1];
  return band[zone];
}

/** Shots needed to kill for each zone at a given range. */
export function shotsToKill(weapon, totalHp, distance) {
  const out = {};
  for (const zone of ['head', 'body', 'leg']) out[zone] = Math.ceil(totalHp / damageFor(weapon, zone, distance));
  return out;
}

export const FLASHES = {
  flare: {
    id: 'flare',
    name: 'Curve flare',
    fuse: 0.65,        // seconds from release to pop
    blind: 1.1,        // seconds of full blind when looked at directly
    fade: 0.55,
    color: 0xffa860,
  },
  hawk: {
    id: 'hawk',
    name: 'Hawk flash',
    speed: 12,         // m/s while gliding
    flightMin: 0.75,
    flightMax: 1.25,
    windup: 0.55,      // the screech before the pop: your cue to turn
    blind: 1.75,
    fade: 0.75,
    color: 0x6dffb0,
  },
};

/** How much a pop blinds you, from the angle between your view and the flash. */
export function flashFactor(angleDeg) {
  if (angleDeg <= 42) return 1;
  if (angleDeg >= 95) return 0;
  const t = (angleDeg - 42) / (95 - 42);
  return 1 - t * t * (3 - 2 * t);
}

export const FLASH_RATES = {
  low: [9, 13],
  normal: [5.5, 8],
  high: [3.2, 5],
};

export const DISTANCES = {
  close: [0, 16],
  mid: [16, 31],
  long: [31, 80],
  mixed: [0, 80],
};

// Original range agents. Every agent shares one hitbox and one health pool;
// only the looks differ.
export const ROSTER = [
  { name: 'Kestrel', primary: 0xc4622d, secondary: 0x2a2c33, pants: 0x3a3c45, skin: 0xc28a5e, hair: 0x1b1716, accent: 0xff9440, head: 'spikes', extras: ['collar'] },
  { name: 'Halcyon', primary: 0x2e8a86, secondary: 0xe6dfcc, pants: 0x2a3a40, skin: 0xf1caa5, hair: 0xeeeeee, accent: 0x7af4ff, head: 'bun', extras: ['coat'] },
  { name: 'Brakk', primary: 0x5d6650, secondary: 0x2f332b, pants: 0x3c4036, skin: 0x8d5a3b, hair: 0x222222, accent: 0xffc23d, head: 'helmet', extras: ['pads', 'backpack'] },
  { name: 'Nyx', primary: 0x4a2f70, secondary: 0x1d1a26, pants: 0x221f2c, skin: 0xd9b8a0, hair: 0x120f18, accent: 0xc77dff, head: 'hood', extras: [] },
  { name: 'Saffron', primary: 0xd6a51f, secondary: 0x2f5e3a, pants: 0x3f3a30, skin: 0xa86f4a, hair: 0x3b2216, accent: 0xb8ff5c, head: 'ponytail', extras: ['scarf'] },
  { name: 'Tarn', primary: 0x8a2c2c, secondary: 0x3b2f28, pants: 0x2e2a28, skin: 0xe0b08a, hair: 0x6b4a2e, accent: 0xff6a4a, head: 'beanie', extras: ['coat', 'beard'] },
  { name: 'Juno', primary: 0xe6a3c2, secondary: 0xf4f1ea, pants: 0x3d3550, skin: 0xf5d2b8, hair: 0x2b1d3a, accent: 0xff7ad6, head: 'bob', extras: ['headphones'] },
  { name: 'Ozark', primary: 0x24344f, secondary: 0xc9b38a, pants: 0x2a2f38, skin: 0x6e4a33, hair: 0x101010, accent: 0x4fd6ff, head: 'cap', extras: ['goggles', 'backpack'] },
];

export const DEFAULT_SETTINGS = {
  weapon: 'rifle',
  distance: 'mixed',
  movement: 'mix',
  speed: 'mix',
  maxTargets: 1,
  shields: 'heavy',
  flashes: 'off',
  flashRate: 'normal',
  flashPeek: true,
  flashOnly: false,
  duration: 60,
  sens: 0.4,
  dpi: 800,
  scopedMult: 1.0,
  crossColor: '#43f0c8',
  crossStyle: 'cross',
  firingError: false,
  healthBars: true,
  volume: 0.7,
};
