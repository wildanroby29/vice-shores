// audio.js — tiny WebAudio synth only: engine hum, siren wail, radio blips,
// gunshot noise and a pickup chime. No audio files.
export function createAudio() {
  let ctx = null;
  let engine = null;
  let engineGain = null;
  let siren = null;

  function ensure() {
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function blip(freq, dur, type, vol) {
    if (!ensure()) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol || 0.08, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + dur);
  }

  function shot() {
    if (!ensure()) return;
    const len = 0.12;
    const buf = ctx.createBuffer(1, ctx.sampleRate * len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g = ctx.createGain();
    g.gain.value = 0.25;
    src.connect(g).connect(ctx.destination);
    src.start();
  }

  function chime() { blip(880, 0.18, 'sine', 0.1); setTimeout(() => blip(1318, 0.25, 'sine', 0.1), 120); }

  function engineStart() {
    if (!ensure() || engine) return;
    engine = ctx.createOscillator();
    engine.type = 'sawtooth';
    engine.frequency.value = 55;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0.0;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 420;
    engine.connect(f).connect(engineGain).connect(ctx.destination);
    engine.start();
  }
  function engineSet(rpm) {
    if (engine && engineGain) {
      engine.frequency.value = 50 + rpm * 90;
      engineGain.gain.value = 0.03 + rpm * 0.05;
    }
  }
  function engineStop() {
    if (engineGain) engineGain.gain.value = 0;
  }

  function sirenOn() {
    if (!ensure() || siren) return;
    siren = ctx.createOscillator();
    siren.type = 'sine';
    const g = ctx.createGain();
    g.gain.value = 0.035;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.6;
    const lg = ctx.createGain();
    lg.gain.value = 260;
    lfo.connect(lg).connect(siren.frequency);
    siren.frequency.value = 800;
    siren.connect(g).connect(ctx.destination);
    siren.start();
    lfo.start();
    siren._lfo = lfo;
  }
  function sirenOff() {
    if (siren) { try { siren.stop(); siren._lfo.stop(); } catch { /* already stopped */ } siren = null; }
  }

  return { blip, shot, chime, engineStart, engineSet, engineStop, sirenOn, sirenOff };
}
