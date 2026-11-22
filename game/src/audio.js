// WebAudio synth sounds for Vice Shores: engine hum, siren, shots, punches,
// pickups, crashes and mission jingles — all generated, no audio files.
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
      master.gain.value = 0.35;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    gain.gain.setValueAtTime(vol || 0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol, filterFreq) {
    if (!ensure() || muted) return;
    const t = ctx.currentTime;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 1200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(vol || 0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
  }

  return {
    unlock() {
      ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.35;
      return muted;
    },
    shot() {
      noise(0.12, 0.4, 3000);
      tone(180, 0.08, 'square', 0.15, 60);
    },
    punch() {
      noise(0.08, 0.3, 500);
      tone(90, 0.1, 'sine', 0.3, 45);
    },
    pickup() {
      tone(660, 0.09, 'sine', 0.22);
      setTimeout(() => tone(990, 0.12, 'sine', 0.22), 80);
    },
    crash() {
      noise(0.35, 0.5, 700);
      tone(70, 0.3, 'sawtooth', 0.25, 30);
    },
    sirenBurst() {
      tone(700, 0.4, 'sine', 0.12, 950);
      setTimeout(() => tone(950, 0.4, 'sine', 0.12, 700), 380);
    },
    missionStart() {
      tone(523, 0.12, 'triangle', 0.25);
      setTimeout(() => tone(659, 0.12, 'triangle', 0.25), 110);
      setTimeout(() => tone(784, 0.2, 'triangle', 0.25), 220);
    },
    missionDone() {
      tone(523, 0.12, 'triangle', 0.25);
      setTimeout(() => tone(659, 0.12, 'triangle', 0.25), 110);
      setTimeout(() => tone(784, 0.12, 'triangle', 0.25), 220);
      setTimeout(() => tone(1046, 0.3, 'triangle', 0.28), 330);
    },
    busted() {
      tone(392, 0.25, 'sawtooth', 0.2, 196);
      setTimeout(() => tone(311, 0.4, 'sawtooth', 0.2, 155), 240);
    },
    click() {
      tone(1200, 0.04, 'square', 0.08);
    },
    engineStart(running) {
      if (!ensure()) return;
      if (running && !engineOsc) {
        engineOsc = ctx.createOscillator();
        engineGain = ctx.createGain();
        engineOsc.type = 'sawtooth';
        engineOsc.frequency.value = 55;
        engineGain.gain.value = 0.0;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 400;
        engineOsc.connect(filter);
        filter.connect(engineGain);
        engineGain.connect(master);
        engineOsc.start();
      } else if (!running && engineOsc) {
        try { engineOsc.stop(); } catch { /* already stopped */ }
        engineOsc = null;
        engineGain = null;
      }
    },
    engineSet(speedNorm) {
      if (!engineOsc || !engineGain || muted) return;
      engineOsc.frequency.value = 50 + speedNorm * 130;
      engineGain.gain.value = 0.02 + speedNorm * 0.05;
    },
    startSiren() {
      if (sirenTimer || !ensure()) return;
      let high = false;
      sirenTimer = setInterval(() => {
        if (muted) return;
        high = !high;
        tone(high ? 880 : 660, 0.42, 'sine', 0.07);
      }, 430);
    },
    stopSiren() {
      if (sirenTimer) {
        clearInterval(sirenTimer);
        sirenTimer = null;
      }
    },
  };
}
