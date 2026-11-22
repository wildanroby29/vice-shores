// WebAudio synth only — no audio files, no network. Engine hum, two-tone siren, blips,
// noise crashes, and a short mission jingle. Everything is created lazily on the first
// user gesture, so the page never tries to play before the browser allows it.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenTimer = null;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function blip(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(vol || 0.15, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, freq) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq || 900;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol || 0.25, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(master);
    src.start(t);
  }

  function engineStart() {
    if (!ensure() || engineOsc) return;
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 55;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 320;
    engineOsc.connect(filter);
    filter.connect(engineGain);
    engineGain.connect(master);
    engineOsc.start();
  }

  function engineSet(speedNorm, on) {
    if (!engineOsc || !engineGain) return;
    const t = ctx.currentTime;
    engineGain.gain.setTargetAtTime(on && !muted ? 0.04 + speedNorm * 0.05 : 0, t, 0.1);
    engineOsc.frequency.setTargetAtTime(55 + speedNorm * 90, t, 0.1);
  }

  function engineStop() {
    if (engineOsc) {
      try { engineOsc.stop(); } catch { /* already stopped */ }
      engineOsc = null;
      engineGain = null;
    }
  }

  function sirenStart() {
    if (!ensure() || sirenTimer) return;
    let high = false;
    sirenTimer = window.setInterval(() => {
      if (!muted) blip(high ? 880 : 660, 0.32, 'sine', 0.05);
      high = !high;
    }, 340);
  }

  function sirenStop() {
    if (sirenTimer) {
      window.clearInterval(sirenTimer);
      sirenTimer = null;
    }
  }

  return {
    unlock,
    pickup: () => blip(660, 0.09, 'sine', 0.18, 990),
    punch: () => noise(0.08, 0.2, 500),
    shot: () => noise(0.12, 0.3, 2400),
    crash: () => noise(0.3, 0.35, 700),
    steal: () => { blip(440, 0.08, 'square', 0.12); blip(587, 0.12, 'square', 0.12); },
    busted: () => { blip(392, 0.2, 'sawtooth', 0.15); blip(311, 0.35, 'sawtooth', 0.15); },
    jingle: () => {
      const notes = [523, 659, 784, 1047];
      notes.forEach((f, i) => window.setTimeout(() => blip(f, 0.16, 'triangle', 0.18), i * 110));
    },
    engineStart,
    engineSet,
    engineStop,
    sirenStart,
    sirenStop,
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.5;
    },
    isMuted: () => muted,
  };
}
