// Vice Shores — all sound is synthesised with WebAudio. No audio files,
// no network. A tiny synth: oscillators + noise through gain envelopes.
let ctx = null;
let master = null;
let engineOsc = null;
let engineGain = null;
let sirenTimer = null;

export function ensureAudio() {
  if (ctx) return;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.22;
    master.connect(ctx.destination);
  } catch (e) { ctx = null; }
}

function tone(freq, dur, type, vol, slideTo) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type || 'sine';
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  g.gain.setValueAtTime(vol || 0.2, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.05);
}

function noiseBurst(dur, vol, lowpass) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = lowpass || 900;
  const g = ctx.createGain();
  g.gain.value = vol || 0.3;
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t);
}

export const sfx = {
  pickup() { tone(660, 0.12, 'sine', 0.25); setTimeout(() => tone(990, 0.18, 'sine', 0.25), 90); },
  punch() { noiseBurst(0.08, 0.35, 500); },
  shot() { noiseBurst(0.12, 0.4, 1800); tone(180, 0.08, 'square', 0.12, 60); },
  crash() { noiseBurst(0.35, 0.5, 400); tone(90, 0.3, 'sawtooth', 0.2, 40); },
  jingle() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.22), i * 110)); },
  click() { tone(1200, 0.04, 'square', 0.08); },
  busted() { tone(440, 0.4, 'sawtooth', 0.18, 220); tone(330, 0.5, 'sawtooth', 0.18, 165); },
  sirenStart() {
    if (!ctx || sirenTimer) return;
    let up = true;
    sirenTimer = setInterval(() => {
      if (!ctx) return;
      tone(up ? 700 : 950, 0.42, 'sine', 0.05);
      up = !up;
    }, 420);
  },
  sirenStop() { if (sirenTimer) { clearInterval(sirenTimer); sirenTimer = null; } },
};

export function setEngine(running, speedNorm) {
  if (!ctx) return;
  if (running && !engineOsc) {
    engineOsc = ctx.createOscillator();
    engineGain = ctx.createGain();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 60;
    engineGain.gain.value = 0.03;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 500;
    engineOsc.connect(f); f.connect(engineGain); engineGain.connect(master);
    engineOsc.start();
  }
  if (!running && engineOsc) {
    try { engineOsc.stop(); } catch (e) {}
    engineOsc = null; engineGain = null;
    return;
  }
  if (engineOsc) {
    engineOsc.frequency.value = 55 + speedNorm * 140;
    engineGain.gain.value = 0.02 + speedNorm * 0.05;
  }
}
