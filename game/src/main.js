// Vice Shores (3D) — boot, the fixed-step loop, and the screen state machine.
// ?shot=<name> stages one of the four screenshot scenes, runs the simulation forward
// so it is a live render, then raises window.__shotReady for the screenshot runner.

import { STEP } from './config.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { createWorld } from './world.js';
import { createGameRenderer } from './render3d.js';
import { createHud } from './hud.js';
import { stageShot } from './shots.js';

const input = createInput();
input.attach();
const audio = createAudio();
const world = createWorld(input, audio);
const renderer = createGameRenderer(world);
const hud = createHud(world);

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const shotMode = !!shotName;
let shotFrames = 0;
const SHOT_FRAMES = 40; // the camera settles in ~15 frames; 40 frames is ~2 s of sim
// (headless SwiftShader renders slowly, so the frame count — not wall time — is the
// reliable measure)

if (shotMode) {
  try {
    stageShot(world, shotName);
  } catch (e) {
    document.title = 'SHOT ERROR: ' + e.message;
    window.__shotError = String(e && e.message ? e.message : e);
  }
}

let selSlot = 1;
world.state.selSlot = 1;

let last = performance.now();
let acc = 0;

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const s = world.state;

  // Aim: the mouse ray onto the ground (or a locked aim in a staged shot).
  renderer.computeAim({ x: input.state.mouseNdcX, y: input.state.mouseNdcY });

  if (s.screen === 'play') {
    acc += dt;
    let guard = 0;
    while (acc >= STEP && guard++ < 8) {
      world.update(STEP);
      acc -= STEP;
    }
    if (guard >= 8) acc = 0;
  } else if (s.screen === 'garage') {
    world.updateGarage();
  } else if (s.screen === 'paused') {
    if (input.consume('KeyP') || input.consume('Escape') || input.consume('Enter')) {
      s.screen = 'play';
      audio.unlock();
    }
  } else if (s.screen === 'busted') {
    if (input.consume('Enter') || input.consume('KeyE')) {
      s.screen = 'play';
      audio.unlock();
    }
  } else if (s.screen === 'title') {
    if (input.consume('Digit1')) { selSlot = 1; s.selSlot = 1; }
    if (input.consume('Digit2')) { selSlot = 2; s.selSlot = 2; }
    if (input.consume('Digit3')) { selSlot = 3; s.selSlot = 3; }
    if (input.consume('Enter')) {
      audio.unlock();
      if (!world.loadGame(selSlot)) world.newGame(selSlot);
      s.screen = 'play';
    }
    if (input.consume('KeyN')) {
      audio.unlock();
      world.newGame(selSlot);
      s.screen = 'play';
    }
  }

  // First gesture unlocks audio.
  if (input.state.pointerDown) audio.unlock();

  renderer.render(dt);
  hud.draw();
  input.endFrame();

  if (shotMode) {
    shotFrames += 1;
    if (shotFrames >= SHOT_FRAMES && !window.__shotReady) {
      window.__shotReady = true;
    }
  }

  requestAnimationFrame(frame);
}

window.addEventListener('resize', () => {
  renderer.resize(window.innerWidth, window.innerHeight);
  const hudCanvas = hud.canvas;
  hudCanvas.width = window.innerWidth;
  hudCanvas.height = window.innerHeight;
});

window.__game = { world, renderer, hud, input };
requestAnimationFrame(frame);
