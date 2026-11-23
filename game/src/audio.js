// Sound for Vice Shores, made entirely with the Web Audio API — no audio
// files at all. Everything is a small oscillator or a burst of filtered
// noise, so the game ships no sound assets and still hums, wails and bangs.
// The audio context is created lazily on the first user gesture (browsers
// block sound before one), and every function below is a safe no-op until
// the context exists, which also keeps the staged screenshots silent.

let ctx = null;
let engineNodes = null;
let sirenNodes = null;

function ensureCtx() {
  if (ctx) return ctx;
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  } catch (e) {
    ctx = null;
  }
  return ctx;
}

// Call this from a real user gesture (click / keypress) to unlock sound.
export function unlockAudio() {
  const c = ensureCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

function blipTone(freq, dur, type, vol, slideTo) {
  const c = ensureCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + dur);
  gain.gain.setValueAtTime(vol, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
  osc.connect(gain).connect(c.destination);
  osc.start();
  osc.stop(c.currentTime + dur);
}

// A short UI blip.
export function blip() {
  blipTone(660, 0.09, 'sine', 0.12, 880);
}

// A gunshot: a burst of noise through a low-pass filter, plus a click.
export function shot() {
  const c = ensureCtx();
  if (!c) return;
  const len = Math.floor(c.sampleRate * 0.14);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const filt = c.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 1800;
  const gain = c.createGain();
  gain.gain.setValueAtTime(0.5, c.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.14);
  src.connect(filt).connect(gain).connect(c.destination);
  src.start();
  blipTone(160, 0.06, 'square', 0.18, 60);
}

// The little chime when a job pays out.
export function chime() {
  blipTone(880, 0.16, 'sine', 0.14);
  setTimeout(() => blipTone(1318, 0.24, 'sine', 0.12), 90);
}

// The engine: a sawtooth through a low-pass, whose pitch follows speed.
export function engineStart() {
  const c = ensureCtx();
  if (!c || engineNodes) return;
  const osc = c.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.value = 55;
  const filt = c.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 420;
  const gain = c.createGain();
  gain.gain.value = 0.05;
  osc.connect(filt).connect(gain).connect(c.destination);
  osc.start();
  engineNodes = { osc, filt, gain };
}

export function engineSet(speedNorm) {
  if (!engineNodes) return;
  const t = engineNodes.osc.context.currentTime;
  engineNodes.osc.frequency.setTargetAtTime(55 + speedNorm * 140, t, 0.08);
  engineNodes.filt.frequency.setTargetAtTime(420 + speedNorm * 900, t, 0.08);
  engineNodes.gain.gain.setTargetAtTime(0.04 + speedNorm * 0.05, t, 0.1);
}

export function engineStop() {
  if (!engineNodes) return;
  try {
    engineNodes.gain.gain.setTargetAtTime(0, engineNodes.osc.context.currentTime, 0.05);
    engineNodes.osc.stop(engineNodes.osc.context.currentTime + 0.3);
  } catch (e) {}
  engineNodes = null;
}

// The police siren: a sine that wails up and down on a slow LFO.
export function sirenOn() {
  const c = ensureCtx();
  if (!c || sirenNodes) return;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 750;
  const lfo = c.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.6;
  const lfoGain = c.createGain();
  lfoGain.gain.value = 260;
  const gain = c.createGain();
  gain.gain.value = 0.045;
  lfo.connect(lfoGain).connect(osc.frequency);
  osc.connect(gain).connect(c.destination);
  osc.start();
  lfo.start();
  sirenNodes = { osc, lfo, gain };
}

export function sirenOff() {
  if (!sirenNodes) return;
  try {
    sirenNodes.gain.gain.setTargetAtTime(0, sirenNodes.osc.context.currentTime, 0.05);
    sirenNodes.osc.stop(sirenNodes.osc.context.currentTime + 0.3);
    sirenNodes.lfo.stop(sirenNodes.osc.context.currentTime + 0.3);
  } catch (e) {}
  sirenNodes = null;
}
