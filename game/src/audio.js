// audio.js — Vice Shores: every sound is synthesized with WebAudio. No audio
// files, no network. The context is created on the first user gesture (the
// title buttons); in a headless run it simply stays suspended and silent.
(function () {
  var VS = window.VS;
  var A = {
    ctx: null, master: null, noiseBuf: null,
    engineOsc: null, engineGain: null, engineFilter: null,
    sirenOsc: null, sirenGain: null, sirenHigh: false, sirenNext: 0,
    radioOn: false, radioStep: 0, radioNext: 0, radioTimer: null,
    songIndex: 0, songNextAt: 0,
  };

  function ensure() {
    if (A.ctx) return A.ctx;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      A.ctx = new Ctx();
      A.master = A.ctx.createGain();
      A.master.gain.value = 0.55;
      A.master.connect(A.ctx.destination);
      var len = A.ctx.sampleRate;
      A.noiseBuf = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
      var d = A.noiseBuf.getChannelData(0);
      for (var i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      // engine hum: sawtooth through a lowpass, pitch follows speed
      A.engineOsc = A.ctx.createOscillator();
      A.engineOsc.type = 'sawtooth';
      A.engineOsc.frequency.value = 55;
      A.engineFilter = A.ctx.createBiquadFilter();
      A.engineFilter.type = 'lowpass';
      A.engineFilter.frequency.value = 420;
      A.engineGain = A.ctx.createGain();
      A.engineGain.gain.value = 0;
      A.engineOsc.connect(A.engineFilter);
      A.engineFilter.connect(A.engineGain);
      A.engineGain.connect(A.master);
      A.engineOsc.start();
      // police siren: square wave, two-tone
      A.sirenOsc = A.ctx.createOscillator();
      A.sirenOsc.type = 'square';
      A.sirenOsc.frequency.value = 700;
      A.sirenGain = A.ctx.createGain();
      A.sirenGain.gain.value = 0;
      A.sirenOsc.connect(A.sirenGain);
      A.sirenGain.connect(A.master);
      A.sirenOsc.start();
    } catch (e) { A.ctx = null; }
    return A.ctx;
  }

  function tone(freq, dur, type, vol, when) {
    if (!A.ctx) return;
    try {
      var t = when || A.ctx.currentTime;
      var o = A.ctx.createOscillator(), g = A.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.2, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(g); g.connect(A.master);
      o.start(t); o.stop(t + dur + 0.02);
    } catch (e) {}
  }

  function noise(dur, filterFreq, vol, type) {
    if (!A.ctx || !A.noiseBuf) return;
    try {
      var src = A.ctx.createBufferSource();
      src.buffer = A.noiseBuf;
      var f = A.ctx.createBiquadFilter();
      f.type = type || 'lowpass';
      f.frequency.value = filterFreq || 800;
      var g = A.ctx.createGain();
      g.gain.setValueAtTime(vol || 0.3, A.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, A.ctx.currentTime + dur);
      src.connect(f); f.connect(g); g.connect(A.master);
      src.start(); src.stop(A.ctx.currentTime + dur + 0.02);
    } catch (e) {}
  }

  // tiny radio sequencer: a warm bass line over Am–F–C–G, 112 BPM, 8th notes.
  var RADIO_ROOTS = [110.0, 87.31, 130.81, 98.0];
  function radioTick() {
    if (!A.ctx || !A.radioOn || VS.state.muted) return;
    var now = A.ctx.currentTime;
    while (A.radioNext < now + 0.25) {
      var step = A.radioStep % 32;
      var bar = Math.floor(A.radioStep / 8) % 4;
      var root = RADIO_ROOTS[bar];
      if (step % 2 === 0) tone(root, 0.24, 'triangle', 0.10, A.radioNext);
      if (step % 8 === 4) tone(root * 1.5, 0.22, 'sine', 0.07, A.radioNext);
      if (step % 4 === 2) noise(0.03, 6000, 0.03, 'highpass');
      A.radioStep++;
      A.radioNext += 60 / 112 / 2;
    }
    if (now > A.songNextAt) {
      A.songIndex = (A.songIndex + 1) % VS.RADIO.songs.length;
      A.songNextAt = now + 32;
      var el = VS.el('radio-song');
      if (el) el.textContent = '♪ ' + VS.RADIO.songs[A.songIndex];
    }
  }

  VS.audio = {
    init: function () {
      ensure();
      if (A.ctx && A.ctx.state === 'suspended') A.ctx.resume().catch(function () {});
      if (A.ctx) {
        A.songNextAt = A.ctx.currentTime + 32;
        if (!A.radioTimer) A.radioTimer = setInterval(radioTick, 120);
      }
    },
    update: function (dt, speed01, throttle, wanted) {
      if (!A.ctx) return;
      try {
        if (A.engineOsc) {
          var target = (VS.state.mode === 'playing' && !VS.state.onFoot)
            ? 0.05 + speed01 * 0.10 + (throttle ? 0.03 : 0)
            : 0.0;
          A.engineGain.gain.setTargetAtTime(target, A.ctx.currentTime, 0.08);
          A.engineOsc.frequency.setTargetAtTime(55 + speed01 * 165, A.ctx.currentTime, 0.1);
        }
        if (A.sirenOsc) {
          var want = wanted > 0 && VS.state.mode === 'playing';
          A.sirenGain.gain.setTargetAtTime(want ? 0.045 : 0, A.ctx.currentTime, 0.2);
          if (want && A.ctx.currentTime > A.sirenNext) {
            A.sirenHigh = !A.sirenHigh;
            A.sirenOsc.frequency.value = A.sirenHigh ? 950 : 700;
            A.sirenNext = A.ctx.currentTime + 0.42;
          }
        }
      } catch (e) {}
    },
    shot: function () { noise(0.14, 2400, 0.35, 'bandpass'); tone(150, 0.1, 'square', 0.16); },
    punch: function () { noise(0.09, 500, 0.3); },
    pickup: function () { tone(660, 0.1, 'sine', 0.18); tone(990, 0.14, 'sine', 0.18, A.ctx ? A.ctx.currentTime + 0.09 : 0); },
    crash: function () { noise(0.4, 320, 0.5); tone(70, 0.3, 'sine', 0.3); },
    reload: function () { tone(420, 0.06, 'square', 0.12); tone(300, 0.06, 'square', 0.12, A.ctx ? A.ctx.currentTime + 0.12 : 0); },
    click: function () { tone(880, 0.05, 'square', 0.1); },
    jingle: function () {
      if (!A.ctx) return;
      var t = A.ctx.currentTime, notes = [523, 659, 784, 1046];
      for (var i = 0; i < notes.length; i++) tone(notes[i], 0.22, 'triangle', 0.2, t + i * 0.11);
    },
    busted: function () {
      if (!A.ctx) return;
      var t = A.ctx.currentTime, notes = [392, 330, 262, 196];
      for (var i = 0; i < notes.length; i++) tone(notes[i], 0.3, 'sawtooth', 0.14, t + i * 0.16);
    },
    radio: function (on) { A.radioOn = !!on; if (!on) A.radioStep = 0; },
    setMuted: function (b) {
      VS.state.muted = !!b;
      if (A.master) A.master.gain.value = b ? 0 : 0.55;
    },
  };
})();
