// All sound is synthesized with WebAudio: no audio files, no network. An engine
// hum that follows speed, a two-tone siren while the police are after you, and
// short blips for shots, crashes, pickups and mission jingles.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let muted = false;
  let sirenOn = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      return true;
    } catch {
      return false;
    }
  }

  function resume() {
    if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function noiseBuffer(seconds) {
    const len = Math.max(1, Math.floor(ctx.sampleRate * seconds));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  function blip(freq, seconds, type, gainValue, slideTo) {
    if (!ensure()) return;
    resume();
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + seconds);
    gain.gain.setValueAtTime(gainValue, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t);
    osc.stop(t + seconds + 0.02);
  }

  function burst(seconds, gainValue, filterFreq) {
    if (!ensure()) return;
    resume();
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(seconds);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 1200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(gainValue, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + seconds);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(master);
    src.start(t);
    src.stop(t + seconds + 0.02);
  }

  return {
    resume,
    setMuted(value) {
      muted = value;
      if (master) master.gain.value = value ? 0 : 0.5;
    },
    isMuted() {
      return muted;
    },
    /** Engine hum: call every frame with speed 0..1 and whether the player is driving. */
    engine(speed, driving) {
      if (!ensure()) return;
      resume();
      if (!engineOsc) {
        engineOsc = ctx.createOscillator();
        engineOsc.type = 'sawtooth';
        engineGain = ctx.createGain();
        engineGain.gain.value = 0;
        engineOsc.connect(engineGain);
        engineGain.connect(master);
        engineOsc.start();
      }
      const target = driving ? 0.05 + speed * 0.09 : 0;
      engineOsc.frequency.setTargetAtTime(55 + speed * 145, ctx.currentTime, 0.08);
      engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
    },
    /** Two-tone siren while wanted; call every frame with wanted > 0. */
    siren(on) {
      if (!ensure()) return;
      resume();
      if (on && !sirenOn) {
        sirenOn = true;
        sirenOsc = ctx.createOscillator();
        sirenOsc.type = 'triangle';
        sirenOsc.frequency.value = 720;
        sirenGain = ctx.createGain();
        sirenGain.gain.value = 0.045;
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 1.4;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 260;
        lfo.connect(lfoGain);
        lfoGain.connect(sirenOsc.frequency);
        sirenOsc.connect(sirenGain);
        sirenGain.connect(master);
        sirenOsc.start();
        lfo.start();
        sirenOsc._lfo = lfo;
      } else if (!on && sirenOn) {
        sirenOn = false;
        try {
          sirenOsc.stop();
          sirenOsc._lfo.stop();
        } catch { /* already stopped */ }
        sirenOsc = null;
      }
    },
    shot() {
      burst(0.12, 0.5, 3200);
      blip(190, 0.08, 'square', 0.25, 60);
    },
    crash() {
      burst(0.35, 0.6, 500);
      blip(90, 0.25, 'sine', 0.4, 40);
    },
    pickup() {
      blip(660, 0.09, 'sine', 0.3);
      setTimeout(() => blip(990, 0.12, 'sine', 0.3), 90);
    },
    punch() {
      burst(0.08, 0.4, 900);
    },
    click() {
      blip(880, 0.05, 'square', 0.12);
    },
    jingle() {
      [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => blip(f, 0.16, 'triangle', 0.3), i * 110));
    },
    busted() {
      [392, 330, 262].forEach((f, i) => setTimeout(() => blip(f, 0.22, 'sawtooth', 0.22), i * 160));
    },
  };
}
