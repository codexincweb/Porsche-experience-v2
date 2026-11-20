// All audio is synthesised with the Web Audio API. There are no recordings,
// so there is nothing to license. The engine tone is an oscillator model, not
// a recording of a Porsche engine.
//
// Rules: nothing is created until enable() is called from a user gesture;
// mute fades out within ~80 ms and suspends the context.

export class SoundManager {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.master = null;
    this.engine = null;
    this.engineLevel = 0;
  }

  _build() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    const ctx = new AC();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp).connect(ctx.destination);

    // Ambient bed: two close sines, filtered noise and a slow filter sweep.
    const bed = ctx.createGain();
    bed.gain.value = 0.5;
    bed.connect(this.master);
    [55, 55.45, 82.4].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i === 2 ? "triangle" : "sine";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = i === 2 ? 0.025 : 0.07;
      o.connect(g).connect(bed);
      o.start();
    });
    const noise = this._noiseSource(ctx);
    const nf = ctx.createBiquadFilter();
    nf.type = "lowpass";
    nf.frequency.value = 420;
    const ng = ctx.createGain();
    ng.gain.value = 0.05;
    noise.connect(nf).connect(ng).connect(bed);
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lg = ctx.createGain();
    lg.gain.value = 220;
    lfo.connect(lg).connect(nf.frequency);
    lfo.start();

    // Engine tone: sawtooth stack through a soft clipper, gated by engineLevel.
    const eGain = ctx.createGain();
    eGain.gain.value = 0;
    const shaper = ctx.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(x * 2.4);
    }
    shaper.curve = curve;
    const eFilter = ctx.createBiquadFilter();
    eFilter.type = "lowpass";
    eFilter.frequency.value = 500;
    const oscs = [1, 2, 3].map((mult) => {
      const o = ctx.createOscillator();
      o.type = "sawtooth";
      o.frequency.value = 40 * mult;
      const g = ctx.createGain();
      g.gain.value = 0.3 / mult;
      o.connect(g).connect(shaper);
      o.start();
      return { o, mult };
    });
    shaper.connect(eFilter).connect(eGain).connect(this.master);
    this.engine = { gain: eGain, filter: eFilter, oscs };
    return true;
  }

  _noiseSource(ctx) {
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.start();
    return src;
  }

  async enable() {
    if (!this.ctx && !this._build()) return false;
    await this.ctx.resume();
    this.enabled = true;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(0.5, t, 0.4);
    return true;
  }

  mute() {
    this.enabled = false;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(0, t, 0.03);
    setTimeout(() => {
      if (!this.enabled) this.ctx?.suspend();
    }, 250);
  }

  // Short interface sounds.
  cue(name) {
    if (!this.enabled || !this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const out = this.master;
    if (name === "tick") {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(1400, t);
      o.frequency.exponentialRampToValueAtTime(900, t + 0.05);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      o.connect(g).connect(out);
      o.start(t);
      o.stop(t + 0.09);
    } else if (name === "chapter" || name === "whoosh") {
      const src = ctx.createBufferSource();
      const len = Math.floor(ctx.sampleRate * 0.9);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.Q.value = 1.2;
      f.frequency.setValueAtTime(250, t);
      f.frequency.exponentialRampToValueAtTime(2600, t + 0.55);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.3);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.85);
      src.connect(f).connect(g).connect(out);
      src.start(t);
    } else if (name === "confirm") {
      [660, 990].forEach((hz, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.value = hz;
        const s = t + i * 0.07;
        g.gain.setValueAtTime(0.0001, s);
        g.gain.exponentialRampToValueAtTime(0.12, s + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, s + 0.35);
        o.connect(g).connect(out);
        o.start(s);
        o.stop(s + 0.4);
      });
    }
  }

  // Continuous engine tone. speed 0..1 maps to 800..9000 rpm of a six-cylinder
  // (three firing pulses per crankshaft revolution).
  setEngine(speed, level) {
    if (!this.engine || !this.ctx) return;
    const t = this.ctx.currentTime;
    const rpm = 800 + 8200 * Math.min(1, Math.max(0, speed));
    const fire = (rpm / 60) * 3;
    this.engine.oscs.forEach(({ o, mult }) => o.frequency.setTargetAtTime(fire * mult * 0.5, t, 0.06));
    this.engine.filter.frequency.setTargetAtTime(380 + speed * 2800, t, 0.08);
    this.engineLevel = level;
    this.engine.gain.gain.setTargetAtTime(this.enabled ? 0.11 * level : 0, t, 0.1);
  }
}

export const sound = new SoundManager();
