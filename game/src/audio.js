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

export function blip() {
  blipTone(660, 0.09, 'sine', 0.12, 880);
}

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

export function chime() {
  blipTone(880, 0.16, 'sine', 0.14);
  setTimeout(() => blipTone(1318, 0.24, 'sine', 0.12), 90);
}

// Two-tone pickup jingle for collectibles and mission rewards: a quick
// rising pair so a grab reads as a reward, not a menu blip.
export function pickup() {
  blipTone(988, 0.09, 'sine', 0.14, 1175);
  setTimeout(() => blipTone(1318, 0.18, 'sine', 0.12), 80);
}

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
