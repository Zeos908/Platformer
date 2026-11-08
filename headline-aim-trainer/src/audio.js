// All sounds are synthesized with WebAudio, so the project ships no audio files.
// Flash and footstep sounds go through HRTF panners so you can hear direction.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.volume = 0.7;
  }

  init() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.volume;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -10;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    const len = ctx.sampleRate * 2;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }

  setVolume(v) {
    this.volume = v;
    if (this.master) this.master.gain.value = v;
  }

  get now() { return this.ctx ? this.ctx.currentTime : 0; }

  updateListener(camera) {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    const p = camera.position;
    const f = camera.getWorldDirection(this._f || (this._f = camera.position.clone()));
    if (l.positionX) {
      const t = this.ctx.currentTime;
      l.positionX.setValueAtTime(p.x, t); l.positionY.setValueAtTime(p.y, t); l.positionZ.setValueAtTime(p.z, t);
      l.forwardX.setValueAtTime(f.x, t); l.forwardY.setValueAtTime(f.y, t); l.forwardZ.setValueAtTime(f.z, t);
      l.upX.setValueAtTime(0, t); l.upY.setValueAtTime(1, t); l.upZ.setValueAtTime(0, t);
    } else {
      l.setPosition(p.x, p.y, p.z);
      l.setOrientation(f.x, f.y, f.z, 0, 1, 0);
    }
  }

  panner(pos) {
    const p = this.ctx.createPanner();
    p.panningModel = 'HRTF';
    p.distanceModel = 'inverse';
    p.refDistance = 3;
    p.rolloffFactor = 0.9;
    p.maxDistance = 120;
    setPannerPos(p, pos, this.ctx.currentTime);
    p.connect(this.master);
    return p;
  }

  noise(dur, { type = 'lowpass', freq = 1000, freqEnd, q = 0.8, gain = 0.5, attack = 0.002, dest, at = 0 } = {}) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t0);
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(dest || this.master);
    src.start(t0, Math.random() * 1.5);
    src.stop(t0 + dur + 0.05);
    return { src, g };
  }

  tone(freq, dur, { type = 'sine', freqEnd, gain = 0.3, attack = 0.003, dest, at = 0, vibrato = 0, vibratoRate = 30 } = {}) {
    const ctx = this.ctx;
    const t0 = ctx.currentTime + at;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    let lfo;
    if (vibrato) {
      lfo = ctx.createOscillator();
      lfo.frequency.value = vibratoRate;
      const lg = ctx.createGain();
      lg.gain.value = vibrato;
      lfo.connect(lg).connect(o.frequency);
      lfo.start(t0);
      lfo.stop(t0 + dur + 0.05);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(dest || this.master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
    return { o, g, lfo };
  }

  // --- weapons ---
  shot(id) {
    if (!this.ctx) return;
    if (id === 'operator') {
      this.noise(0.6, { freq: 2400, freqEnd: 260, gain: 0.85 });
      this.noise(0.07, { type: 'highpass', freq: 2600, gain: 0.5 });
      this.tone(80, 0.4, { freqEnd: 28, gain: 0.95 });
      this.noise(1.1, { type: 'bandpass', freq: 500, freqEnd: 160, q: 0.6, gain: 0.22, attack: 0.05, at: 0.04 });
    } else if (id === 'rifle') {
      this.noise(0.16, { freq: 3400, freqEnd: 700, gain: 0.55 });
      this.noise(0.035, { type: 'highpass', freq: 3800, gain: 0.32 });
      this.tone(130, 0.12, { freqEnd: 45, gain: 0.55 });
    } else {
      this.noise(0.32, { freq: 2600, freqEnd: 420, gain: 0.75 });
      this.noise(0.05, { type: 'highpass', freq: 3000, gain: 0.4 });
      this.tone(95, 0.24, { freqEnd: 32, gain: 0.8 });
    }
  }

  bolt(interval) {
    if (!this.ctx) return;
    for (const [at, f, g] of [[0.22, 1500, 0.2], [0.34, 1100, 0.22], [0.55, 1300, 0.2], [0.66, 1900, 0.24]]) {
      this.noise(0.05, { type: 'bandpass', freq: f, q: 3, gain: g, at: at * interval });
    }
  }

  warn(level) {
    if (!this.ctx) return;
    this.tone(520 + level * 380, 0.08, { type: 'square', gain: 0.05 + level * 0.05 });
  }

  death() {
    if (!this.ctx) return;
    this.noise(0.5, { freq: 1800, freqEnd: 200, gain: 0.7 });
    this.tone(160, 0.9, { type: 'sawtooth', freqEnd: 40, gain: 0.25 });
    this.tone(90, 0.5, { freqEnd: 30, gain: 0.6 });
  }

  dry() {
    if (!this.ctx) return;
    this.noise(0.03, { type: 'highpass', freq: 2500, gain: 0.2 });
  }

  equip() {
    if (!this.ctx) return;
    this.noise(0.08, { type: 'bandpass', freq: 1800, q: 3, gain: 0.18 });
    this.noise(0.06, { type: 'bandpass', freq: 2600, q: 4, gain: 0.16, at: 0.28 });
  }

  reload(duration) {
    if (!this.ctx) return;
    for (const [at, f, g] of [[0.12, 1400, 0.16], [0.3, 900, 0.2], [0.55, 2000, 0.18], [0.84, 2400, 0.22]]) {
      this.noise(0.07, { type: 'bandpass', freq: f, q: 3, gain: g, at: at * duration });
      this.tone(f / 3, 0.05, { type: 'square', gain: 0.03, at: at * duration });
    }
  }

  // --- feedback ---
  hit(zone) {
    if (!this.ctx) return;
    if (zone === 'head') {
      this.tone(2200, 0.26, { gain: 0.32 });
      this.tone(3300, 0.16, { type: 'triangle', gain: 0.14 });
      this.noise(0.02, { type: 'highpass', freq: 6000, gain: 0.15 });
    } else {
      this.noise(0.06, { type: 'bandpass', freq: zone === 'leg' ? 700 : 950, q: 1.5, gain: zone === 'leg' ? 0.22 : 0.34 });
      this.tone(zone === 'leg' ? 190 : 240, 0.07, { type: 'square', freqEnd: 120, gain: 0.05 });
    }
  }

  kill(head) {
    if (!this.ctx) return;
    this.tone(660, 0.12, { type: 'triangle', gain: 0.18 });
    this.tone(990, 0.16, { type: 'triangle', gain: 0.18, at: 0.06 });
    if (head) this.tone(1480, 0.22, { type: 'triangle', gain: 0.14, at: 0.12 });
  }

  beep(high) {
    if (!this.ctx) return;
    this.tone(high ? 1320 : 880, high ? 0.3 : 0.12, { type: 'triangle', gain: 0.18 });
  }

  // --- world ---
  footstep(pos) {
    if (!this.ctx) return;
    const p = this.panner(pos);
    this.noise(0.09, { freq: 520, gain: 0.7, dest: p });
    this.tone(70, 0.06, { gain: 0.35, dest: p });
    setTimeout(() => p.disconnect(), 400);
  }

  emitter(pos) {
    const p = this.panner(pos);
    const ctx = this.ctx;
    const nodes = [];
    return {
      panner: p,
      nodes,
      setPosition: (v) => setPannerPos(p, v, ctx.currentTime),
      stop: () => {
        for (const n of nodes) {
          try { n.g.gain.cancelScheduledValues(ctx.currentTime); n.g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.02); } catch (e) { /* already stopped */ }
        }
        setTimeout(() => p.disconnect(), 600);
      },
    };
  }

  nullEmitter() {
    return { setPosition() {}, stop() {} };
  }

  flareThrow(pos) {
    if (!this.ctx) return this.nullEmitter();
    const e = this.emitter(pos);
    e.nodes.push(this.noise(0.6, { type: 'bandpass', freq: 380, freqEnd: 2200, q: 1.4, gain: 0.7, attack: 0.04, dest: e.panner }));
    e.nodes.push(this.tone(240, 0.5, { type: 'sawtooth', freqEnd: 520, gain: 0.05, dest: e.panner }));
    for (let i = 0; i < 9; i++) {
      e.nodes.push(this.noise(0.025, { type: 'highpass', freq: 3000, gain: 0.3, at: 0.05 + i * 0.06 + Math.random() * 0.03, dest: e.panner }));
    }
    return e;
  }

  hawkCast(pos) {
    if (!this.ctx) return this.nullEmitter();
    const e = this.emitter(pos);
    e.nodes.push(this.tone(2300, 0.32, { type: 'sawtooth', freqEnd: 1400, gain: 0.12, vibrato: 140, vibratoRate: 34, dest: e.panner }));
    e.nodes.push(this.tone(2600, 0.22, { type: 'square', freqEnd: 1700, gain: 0.05, at: 0.12, dest: e.panner }));
    e.nodes.push(this.noise(0.4, { type: 'bandpass', freq: 600, freqEnd: 1200, q: 2, gain: 0.25, attack: 0.05, dest: e.panner }));
    return e;
  }

  hawkWindup(e) {
    if (!this.ctx || !e.panner) return;
    e.nodes.push(this.tone(1200, 0.5, { type: 'sawtooth', freqEnd: 3100, gain: 0.16, attack: 0.05, vibrato: 180, vibratoRate: 26, dest: e.panner }));
    e.nodes.push(this.tone(1800, 0.45, { type: 'square', freqEnd: 3600, gain: 0.05, attack: 0.08, dest: e.panner }));
  }

  flashPop(pos, type) {
    if (!this.ctx) return;
    const p = this.panner(pos);
    this.noise(0.3, { type: 'highpass', freq: 1800, gain: 0.6, dest: p });
    this.tone(type === 'hawk' ? 1900 : 1500, 0.22, { freqEnd: 600, gain: 0.25, dest: p });
    setTimeout(() => p.disconnect(), 800);
  }

  ringing(strength, dur) {
    if (!this.ctx || strength <= 0.05) return;
    this.tone(3700, dur, { gain: 0.07 * strength, attack: 0.02 });
    this.tone(4200, dur * 0.8, { gain: 0.035 * strength, attack: 0.02 });
  }
}

function setPannerPos(p, v, t) {
  if (p.positionX) {
    p.positionX.setValueAtTime(v.x, t);
    p.positionY.setValueAtTime(v.y, t);
    p.positionZ.setValueAtTime(v.z, t);
  } else {
    p.setPosition(v.x, v.y, v.z);
  }
}
