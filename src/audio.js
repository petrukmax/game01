(function () {
  "use strict";

  const NF = (window.NF = window.NF || {});

  function AudioSystem() {
    this.ctx = null;
    this.master = null;
    this.comp = null;
    this.noiseBuffer = null;
    this.muted = false;
    this.volume = 0.42;
    this.enabled = false;
  }

  AudioSystem.prototype.ensure = function () {
    if (this.enabled) {
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(function () {});
      }
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    try {
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.comp = this.ctx.createDynamicsCompressor();
      this.comp.threshold.value = -18;
      this.comp.knee.value = 20;
      this.comp.ratio.value = 8;
      this.comp.attack.value = 0.004;
      this.comp.release.value = 0.22;
      this.master.connect(this.comp);
      this.comp.connect(this.ctx.destination);
      const len = Math.floor(this.ctx.sampleRate * 1.2);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < len; i++) {
        const white = Math.random() * 2 - 1;
        last = last * 0.72 + white * 0.28;
        data[i] = last;
      }
      this.noiseBuffer = buf;
      this.enabled = true;
    } catch (err) {
      this.enabled = false;
    }
  };

  AudioSystem.prototype.setMuted = function (muted) {
    this.muted = !!muted;
    if (this.master && this.ctx) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setValueAtTime(this.master.gain.value, now);
      this.master.gain.linearRampToValueAtTime(this.muted ? 0 : this.volume, now + 0.08);
    }
    return this.muted;
  };

  AudioSystem.prototype.toggleMute = function () {
    return this.setMuted(!this.muted);
  };

  AudioSystem.prototype.tone = function (opts) {
    if (!this.enabled || !this.ctx || this.muted) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + (opts.delay || 0);
    const dur = opts.dur || 0.15;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = opts.type || "sine";
    osc.frequency.setValueAtTime(Math.max(20, opts.freq || 220), t0);
    if (opts.to) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t0 + dur);
    }
    if (opts.detune) osc.detune.value = opts.detune;
    const vol = (opts.vol === undefined ? 0.2 : opts.vol);
    const attack = opts.attack === undefined ? 0.005 : opts.attack;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    let node = osc;
    if (opts.filter) {
      const flt = ctx.createBiquadFilter();
      flt.type = opts.filter;
      flt.frequency.setValueAtTime(opts.cutoff || 900, t0);
      if (opts.cutoffTo) flt.frequency.exponentialRampToValueAtTime(Math.max(40, opts.cutoffTo), t0 + dur);
      flt.Q.value = opts.q || 1;
      node.connect(flt);
      flt.connect(gain);
    } else {
      node.connect(gain);
    }
    if (opts.pan !== undefined && ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = opts.pan;
      gain.connect(panner);
      panner.connect(this.master);
    } else {
      gain.connect(this.master);
    }
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  };

  AudioSystem.prototype.noise = function (opts) {
    if (!this.enabled || !this.ctx || this.muted || !this.noiseBuffer) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + (opts.delay || 0);
    const dur = opts.dur || 0.12;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const flt = ctx.createBiquadFilter();
    flt.type = opts.filter || "bandpass";
    flt.frequency.setValueAtTime(Math.max(40, opts.freq || 1200), t0);
    if (opts.to) flt.frequency.exponentialRampToValueAtTime(Math.max(40, opts.to), t0 + dur);
    flt.Q.value = opts.q === undefined ? 1.2 : opts.q;
    const gain = ctx.createGain();
    const vol = opts.vol === undefined ? 0.18 : opts.vol;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + (opts.attack || 0.004));
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(flt);
    flt.connect(gain);
    if (opts.pan !== undefined && ctx.createStereoPanner) {
      const panner = ctx.createStereoPanner();
      panner.pan.value = opts.pan;
      gain.connect(panner);
      panner.connect(this.master);
    } else {
      gain.connect(this.master);
    }
    src.start(t0);
    src.stop(t0 + dur + 0.03);
  };

  AudioSystem.prototype.play = function (name, opts) {
    const o = opts || {};
    if (!this.enabled) return;
    const pan = o.pan;
    switch (name) {
      case "swipe":
        this.noise({ dur: 0.13, vol: 0.24, filter: "bandpass", freq: 1800, to: 300, q: 1.8, pan: pan });
        this.tone({ freq: 900, to: 420, dur: 0.08, type: "triangle", vol: 0.045, pan: pan });
        break;
      case "scratch":
        // Claw scratch sound: quick high-frequency noise burst
        this.noise({ dur: 0.06, vol: 0.3, filter: "bandpass", freq: 3000, to: 600, q: 2.5, pan: pan });
        this.tone({ freq: 1400, to: 400, dur: 0.05, type: "square", vol: 0.05, pan: pan });
        break;
      case "bite":
        this.noise({ dur: 0.055, vol: 0.34, filter: "highpass", freq: 900, to: 2400, q: 0.8, pan: pan });
        this.tone({ freq: 150, to: 58, dur: 0.16, type: "sine", vol: 0.24, pan: pan });
        break;
      case "pounce":
        this.tone({ freq: 92, to: 48, dur: 0.38, type: "sawtooth", vol: 0.13, filter: "lowpass", cutoff: 420, cutoffTo: 120, pan: pan });
        this.noise({ dur: 0.3, vol: 0.16, filter: "bandpass", freq: 500, to: 160, q: 0.8, pan: pan });
        break;
      case "hit":
        this.tone({ freq: 150, to: 55, dur: 0.18, type: "sine", vol: 0.27, pan: pan });
        this.noise({ dur: 0.1, vol: 0.18, filter: "lowpass", freq: 900, to: 180, q: 0.7, pan: pan });
        break;
      case "heavyHit":
        this.tone({ freq: 112, to: 36, dur: 0.3, type: "sine", vol: 0.36, pan: pan });
        this.noise({ dur: 0.2, vol: 0.26, filter: "lowpass", freq: 700, to: 90, q: 0.6, pan: pan });
        break;
      case "block":
        this.noise({ dur: 0.08, vol: 0.17, filter: "bandpass", freq: 1800, to: 1200, q: 3, pan: pan });
        this.tone({ freq: 760, to: 520, dur: 0.12, type: "square", vol: 0.055, pan: pan });
        break;
      case "coin":
        this.tone({ freq: 880, dur: 0.07, type: "sine", vol: 0.16, pan: pan });
        this.tone({ freq: 1320, dur: 0.09, type: "sine", vol: 0.12, delay: 0.055, pan: pan });
        break;
      case "health":
        this.tone({ freq: 320, to: 520, dur: 0.2, type: "triangle", vol: 0.16, pan: pan });
        this.tone({ freq: 640, dur: 0.12, type: "sine", vol: 0.08, delay: 0.12, pan: pan });
        break;
      case "focus":
        this.tone({ freq: 240, to: 880, dur: 0.35, type: "triangle", vol: 0.12, pan: pan });
        this.tone({ freq: 660, to: 1320, dur: 0.25, type: "sine", vol: 0.07, delay: 0.08, pan: pan });
        break;
      case "life":
        [523, 659, 784, 1046].forEach((f, i) => {
          this.tone({ freq: f, dur: 0.18, type: "sine", vol: 0.1, delay: i * 0.09, pan: pan });
        });
        break;
      case "jump":
        this.tone({ freq: 260, to: 540, dur: 0.16, type: "sine", vol: 0.1, pan: pan });
        this.noise({ dur: 0.09, vol: 0.05, filter: "highpass", freq: 900, q: 0.4, pan: pan });
        break;
      case "land":
        this.tone({ freq: 90, to: 42, dur: 0.16, type: "sine", vol: 0.2, pan: pan });
        this.noise({ dur: 0.1, vol: 0.1, filter: "lowpass", freq: 400, to: 100, q: 0.5, pan: pan });
        break;
      case "death":
        this.tone({ freq: 170, to: 44, dur: 0.7, type: "sawtooth", vol: 0.13, filter: "lowpass", cutoff: 600, cutoffTo: 100, pan: pan });
        this.noise({ dur: 0.5, vol: 0.12, filter: "lowpass", freq: 500, to: 80, q: 0.5, pan: pan });
        break;
      case "enemyDown":
        this.tone({ freq: 130, to: 40, dur: 0.4, type: "sawtooth", vol: 0.11, filter: "lowpass", cutoff: 440, cutoffTo: 80, pan: pan });
        this.noise({ dur: 0.24, vol: 0.16, filter: "lowpass", freq: 800, to: 120, q: 0.6, pan: pan });
        break;
      case "bossRoar":
        this.tone({ freq: 86, to: 42, dur: 0.9, type: "sawtooth", vol: 0.17, filter: "lowpass", cutoff: 360, cutoffTo: 120, pan: pan });
        this.tone({ freq: 63, to: 37, dur: 0.9, type: "square", vol: 0.06, filter: "lowpass", cutoff: 240, pan: pan });
        this.noise({ dur: 0.7, vol: 0.14, filter: "bandpass", freq: 340, to: 90, q: 0.7, pan: pan });
        break;
      case "secret":
        [523, 659, 784, 1046, 1318].forEach((f, i) => {
          this.tone({ freq: f, dur: 0.28, type: "sine", vol: 0.085, delay: i * 0.075, pan: pan });
        });
        break;
      case "flag":
        [392, 523, 659, 784].forEach((f, i) => {
          this.tone({ freq: f, dur: 0.3, type: "triangle", vol: 0.09, delay: i * 0.11, pan: pan });
        });
        this.noise({ dur: 1.0, vol: 0.05, filter: "bandpass", freq: 900, to: 1800, q: 0.4, pan: pan });
        break;
      case "gate":
        this.tone({ freq: 72, to: 34, dur: 0.8, type: "sawtooth", vol: 0.12, filter: "lowpass", cutoff: 220, pan: pan });
        this.noise({ dur: 0.7, vol: 0.11, filter: "lowpass", freq: 260, to: 60, q: 0.5, pan: pan });
        break;
      case "click":
        this.tone({ freq: 620, dur: 0.03, type: "square", vol: 0.035, pan: pan });
        break;
      case "spawn":
        this.noise({ dur: 0.2, vol: 0.08, filter: "bandpass", freq: 300, to: 1100, q: 1.2, pan: pan });
        break;
      case "shockwave":
        this.tone({ freq: 75, to: 30, dur: 0.55, type: "sine", vol: 0.35, pan: pan });
        this.noise({ dur: 0.42, vol: 0.24, filter: "lowpass", freq: 600, to: 70, q: 0.6, pan: pan });
        break;
      case "levelClear":
        [523, 659, 784, 1046].forEach((f, i) => {
          this.tone({ freq: f, dur: 0.42, type: "triangle", vol: 0.1, delay: i * 0.12, pan: pan });
        });
        break;
      case "gameOver":
        [220, 174, 130].forEach((f, i) => {
          this.tone({ freq: f, dur: 0.65, type: "sawtooth", vol: 0.08, filter: "lowpass", cutoff: 500, delay: i * 0.2, pan: pan });
        });
        break;
      case "victory":
        [392, 523, 659, 784, 1046, 1318].forEach((f, i) => {
          this.tone({ freq: f, dur: 0.6, type: "triangle", vol: 0.085, delay: i * 0.13, pan: pan });
        });
        break;
      default:
        break;
    }
  };

  NF.AudioSystem = AudioSystem;
})();
