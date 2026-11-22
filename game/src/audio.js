// WebAudio synth only: every sound is built from oscillators and noise, no
// audio files, no network. Created lazily on the first user gesture.
let ctx = null;
let engineOsc = null;
let engineGain = null;
let sirenTimer = null;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function tone(freq, dur, type, vol, slideTo) {
  const c = ac(); if (!c) return;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(freq, c.currentTime);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), c.currentTime + dur);
  g.gain.setValueAtTime(vol || 0.12, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g); g.connect(c.destination);
  o.start(); o.stop(c.currentTime + dur + 0.02);
}

function noise(dur, vol, lowpass) {
  const c = ac(); if (!c) return;
  const len = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource(); src.buffer = buf;
  const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lowpass || 1200;
  const g = c.createGain(); g.gain.setValueAtTime(vol || 0.2, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  src.connect(f); f.connect(g); g.connect(c.destination);
  src.start();
}

export const audio = {
  unlock() { ac(); },
  shot() { noise(0.12, 0.25, 3000); tone(180, 0.08, 'square', 0.08, 60); },
  punch() { tone(120, 0.08, 'sine', 0.2, 50); noise(0.06, 0.15, 800); },
  pickup() { tone(660, 0.09, 'sine', 0.12); setTimeout(() => tone(880, 0.12, 'sine', 0.12), 80); },
  crash() { noise(0.5, 0.35, 900); tone(90, 0.4, 'sawtooth', 0.15, 40); },
  jingle() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'triangle', 0.12), i * 110)); },
  busted() { tone(220, 0.5, 'sawtooth', 0.12, 110); tone(165, 0.5, 'sawtooth', 0.1, 82); },
  engineStart(speed) {
    const c = ac(); if (!c) return;
    this.engineStop();
    engineOsc = c.createOscillator(); engineGain = c.createGain();
    engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 50 + speed * 0.6;
    engineGain.gain.value = 0.03;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    engineOsc.connect(f); f.connect(engineGain); engineGain.connect(c.destination);
    engineOsc.start();
  },
  engineSet(speed) {
    if (engineOsc && engineGain) {
      engineOsc.frequency.setTargetAtTime(50 + speed * 0.9, ctx.currentTime, 0.05);
      engineGain.gain.setTargetAtTime(0.02 + Math.min(0.05, speed * 0.0004), ctx.currentTime, 0.1);
    }
  },
  engineStop() {
    try { if (engineOsc) engineOsc.stop(); } catch { /* already stopped */ }
    engineOsc = null; engineGain = null;
  },
  sirenStart() {
    if (sirenTimer) return;
    let up = true;
    sirenTimer = setInterval(() => { tone(up ? 700 : 950, 0.28, 'sine', 0.045); up = !up; }, 300);
  },
  sirenStop() { if (sirenTimer) { clearInterval(sirenTimer); sirenTimer = null; } },
};
