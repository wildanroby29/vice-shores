// audio.js — a tiny WebAudio synth only: engine hum, siren wail, radio
// blips, gunshot noise and a pickup chime. No audio files anywhere.
export function createAudio() {
  let ac = null;
  let eng = null;
  let engGain = null;
  let srn = null;

  function boot() {
    if (!ac) {
      try {
        ac = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        ac = null;
      }
    }
    if (ac && ac.state === 'suspended') ac.resume();
    return ac;
  }

  function blip(freq, dur, type, vol) {
    if (!boot()) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(vol || 0.08, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur);
  }

  function shot() {
    if (!boot()) return;
    const dur = 0.12;
    const buffer = ac.createBuffer(1, ac.sampleRate * dur, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    }
    const source = ac.createBufferSource();
    source.buffer = buffer;
    const gain = ac.createGain();
    gain.gain.value = 0.25;
    source.connect(gain).connect(ac.destination);
    source.start();
  }

  function chime() {
    blip(880, 0.18, 'sine', 0.1);
    setTimeout(() => blip(1318, 0.25, 'sine', 0.1), 120);
  }

  function engineStart() {
    if (!boot() || eng) return;
    eng = ac.createOscillator();
    eng.type = 'sawtooth';
    eng.frequency.value = 55;
    engGain = ac.createGain();
    engGain.gain.value = 0.0;
    const filter = ac.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    eng.connect(filter).connect(engGain).connect(ac.destination);
    eng.start();
  }
  function engineSet(rpm) {
    if (eng && engGain) {
      eng.frequency.value = 50 + rpm * 90;
      engGain.gain.value = 0.03 + rpm * 0.05;
    }
  }
  function engineStop() {
    if (engGain) engGain.gain.value = 0;
  }

  function sirenOn() {
    if (!boot() || srn) return;
    srn = ac.createOscillator();
    srn.type = 'sine';
    const gain = ac.createGain();
    gain.gain.value = 0.035;
    const wobble = ac.createOscillator();
    wobble.frequency.value = 0.6;
    const wobGain = ac.createGain();
    wobGain.gain.value = 260;
    wobble.connect(wobGain).connect(srn.frequency);
    srn.frequency.value = 800;
    srn.connect(gain).connect(ac.destination);
    srn.start();
    wobble.start();
    srn._lfo = wobble;
  }
  function sirenOff() {
    if (srn) {
      try {
        srn.stop();
        srn._lfo.stop();
      } catch {
        // Already stopped.
      }
      srn = null;
    }
  }

  return {
    blip,
    shot,
    chime,
    engineStart,
    engineSet,
    engineStop,
    sirenOn,
    sirenOff,
  };
}
