// Audio: procedural WebAudio — engine, sirens, gunshots, radio bed. No assets.
export class AudioSys {
  constructor() {
    this.ctx = null; this.muted = false; this.engine = null; this.siren = null; this.radio = null;
  }
  ensure() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const g = this.ctx.createGain(); g.gain.value = 0.16; g.connect(this.ctx.destination);
      this.master = g;
      const osc = this.ctx.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 55;
      const eg = this.ctx.createGain(); eg.gain.value = 0.0;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320;
      osc.connect(lp); lp.connect(eg); eg.connect(g);
      osc.start(); this.engine = { osc, gain: eg };
      const s = this.ctx.createOscillator(); s.type = 'sine'; s.frequency.value = 720;
      const sg = this.ctx.createGain(); sg.gain.value = 0.0;
      s.connect(sg); sg.connect(g); s.start(); this.siren = { osc: s, gain: sg };
    } catch { this.ctx = null; }
  }
  setEngine(speed, on) {
    if (!this.ctx || !this.engine) return;
    this.engine.osc.frequency.value = 50 + speed * 2.4;
    this.engine.gain.gain.value = on ? 0.05 : 0;
  }
  setSiren(on, t) {
    if (!this.ctx || !this.siren) return;
    this.siren.gain.gain.value = on ? 0.045 : 0;
    if (on) this.siren.osc.frequency.value = 660 + Math.sin(t * 4) * 160;
  }
  shot() {
    if (!this.ctx || this.muted) return;
    const dur = 0.12;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = 0.5;
    src.connect(g); g.connect(this.master); src.start();
  }
  blip() {
    if (!this.ctx || this.muted) return;
    const o = this.ctx.createOscillator(); o.type = 'square'; o.frequency.value = 880;
    const g = this.ctx.createGain(); g.gain.value = 0.12;
    o.connect(g); g.connect(this.master);
    o.start(); o.stop(this.ctx.currentTime + 0.07);
  }
  toggleMute() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : 0.16; return this.muted; }
}
