// WebAudio synth only — no audio files. Engine hum, siren, pickup blip,
// punch thud, gunshot crack and a mission-complete jingle, all from
// oscillators and filtered noise. Muted state survives on the sound object.

export function createAudio() {
  let context = null;
  let muted = false;
  let engineOsc = null;
  let engineGain = null;

  function ensure() {
    if (context) return context;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      context = new AudioContext();
    } catch {
      context = null;
    }
    return context;
  }

  function tone(freq, seconds, type, volume, slideTo) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + seconds);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + seconds);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + seconds);
  }

  function noise(seconds, volume, filterFreq) {
    const ctx = ensure();
    if (!ctx || muted) return;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq || 1200;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + seconds);
    source.connect(filter).connect(gain).connect(ctx.destination);
    source.start();
  }

  return {
    unlock() {
      const ctx = ensure();
      if (ctx && ctx.state === 'suspended') ctx.resume();
    },
    setMuted(value) {
      muted = value;
      if (muted) this.engine(0);
    },
    isMuted() {
      return muted;
    },
    /** Continuous engine hum; 0 stops it, higher values raise the pitch. */
    engine(speed01) {
      const ctx = ensure();
      if (!ctx || muted) {
        if (engineOsc) {
          try { engineOsc.stop(); } catch { /* already stopped */ }
          engineOsc = null;
          engineGain = null;
        }
        return;
      }
      if (speed01 <= 0) {
        if (engineOsc) {
          try { engineOsc.stop(); } catch { /* already stopped */ }
          engineOsc = null;
          engineGain = null;
        }
        return;
      }
      if (!engineOsc) {
        engineOsc = ctx.createOscillator();
        engineOsc.type = 'sawtooth';
        engineGain = ctx.createGain();
        engineGain.gain.value = 0.03;
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 500;
        engineOsc.connect(filter).connect(engineGain).connect(ctx.destination);
        engineOsc.start();
      }
      engineOsc.frequency.setValueAtTime(55 + speed01 * 130, ctx.currentTime);
      engineGain.gain.setValueAtTime(0.02 + speed01 * 0.03, ctx.currentTime);
    },
    siren() {
      tone(720, 0.45, 'sine', 0.05, 980);
    },
    pickup() {
      tone(880, 0.12, 'sine', 0.09, 1320);
    },
    punch() {
      noise(0.12, 0.16, 500);
    },
    shot() {
      noise(0.14, 0.2, 2600);
    },
    crash() {
      noise(0.3, 0.22, 700);
    },
    busted() {
      tone(330, 0.5, 'square', 0.06, 165);
    },
    mission() {
      tone(523, 0.14, 'sine', 0.09);
      setTimeout(() => tone(659, 0.14, 'sine', 0.09), 130);
      setTimeout(() => tone(784, 0.3, 'sine', 0.1), 260);
    },
  };
}
