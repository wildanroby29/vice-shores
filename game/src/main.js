// Boot and the one loop: input is read every frame, the world advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between three screens:
// title, play and paused; being busted is a timed overlay inside play.
//
// ?seed=N fixes the city and traffic. ?shot=start|play|drive|mission (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
import { STEP, SAVE_KEY } from './config.js';
import { createWorld, startRun, stepWorld, loadSave, applySave, writeSave, SCREEN } from './world.js';
import { createRandom } from './random.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE, createInput } from './input.js';
import { createRenderer } from './render.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';
import { stepTrafficCar, stepPedestrian } from './traffic.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(seed);
const renderer = createRenderer(canvas);
const audio = createAudio();
world.view = { width: 1280, height: 800 };

function runShot(name) {
  const view = renderer.resize();
  world.view = view;
  const scene = stageShot(name, world);
  let painted = 0;
  function paint() {
    renderer.draw(world, scene, loadSave() !== null);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN.TITLE;
  let save = loadSave();
  let accumulator = 0;
  let last = performance.now();
  let sirenTimer = 0;

  // Screen readers (and anyone watching the page's text) hear the screen changes and each hit.
  function announce(message) {
    status.textContent = message;
  }

  function startNewGame() {
    try {
      window.localStorage.removeItem(SAVE_KEY);
    } catch {
      // Storage can be off: the save then lasts this visit only.
    }
    save = null;
    startRun(world);
    screen = SCREEN.PLAY;
    announce('Playing Vice Shores. First job: drive the blue coupe to Coral Row.');
  }

  function continueGame() {
    const loaded = loadSave();
    startRun(world);
    if (loaded) applySave(world, loaded);
    screen = SCREEN.PLAY;
    announce('Welcome back to Vice Shores.');
  }

  function titleClick(mouse) {
    const view = world.view;
    const bw = 240;
    const bh = 52;
    const by = view.height / 2 + 70;
    if (save) {
      const cx0 = view.width / 2 - bw - 12;
      if (mouse.x >= cx0 && mouse.x <= cx0 + bw && mouse.y >= by && mouse.y <= by + bh) {
        continueGame();
        return;
      }
    }
    const nx0 = view.width / 2 + 12;
    if (mouse.x >= nx0 && mouse.x <= nx0 + bw && mouse.y >= by && mouse.y <= by + bh) {
      startNewGame();
      return;
    }
    // Any other click on the title starts: continue when there is a save.
    if (save) continueGame();
    else startNewGame();
  }

  function handleEvents() {
    for (const event of world.events) {
      if (event.type === 'mission') {
        audio.mission();
        announce(`${event.name} complete. Earned $${event.payout}.`);
      } else if (event.type === 'pickup') audio.pickup();
      else if (event.type === 'punch') audio.punch();
      else if (event.type === 'shot') audio.shot();
      else if (event.type === 'crash') audio.crash();
      else if (event.type === 'busted') {
        audio.busted();
        announce(`Busted. The police took $${event.fine}.`);
      } else if (event.type === 'wanted') {
        announce(event.stars > 0 ? `Wanted level ${event.stars}.` : 'You lost the heat.');
      } else if (event.type === 'steal') announce('Car taken.');
    }
    world.events = [];
  }

  function step() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      audio.setMuted(!audio.isMuted());
      announce(audio.isMuted() ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN.PLAY) {
        screen = SCREEN.PAUSED;
        announce('Paused.');
      } else if (screen === SCREEN.PAUSED) {
        screen = SCREEN.PLAY;
        announce('Playing.');
      }
      return;
    }
    if (screen !== SCREEN.PLAY) return;
    // Drive the world forward one fixed step; input is read inside stepWorld.
    stepWorld(world, STEP, input);
    handleEvents();
    // Engine hum follows the player's car; sirens wail while wanted.
    if (world.player.inCar && world.player.car) {
      audio.engine(Math.min(1, Math.abs(world.player.car.speed) / 430));
    } else {
      audio.engine(0);
    }
    if (world.wanted > 0) {
      sirenTimer -= STEP;
      if (sirenTimer <= 0) {
        sirenTimer = 1.4;
        audio.siren();
      }
    }
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const view = renderer.resize();
    world.view = view;
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    // Title-screen input: clicks pick a button, Space starts.
    if (screen === SCREEN.TITLE) {
      const actions = input.takeActions();
      const mouse = input.takeMouse();
      if (mouse.clicked) {
        audio.unlock();
        titleClick(mouse);
      } else if (actions & ACTION_CONFIRM) {
        audio.unlock();
        if (save) continueGame();
        else startNewGame();
      }
      if (actions & ACTION_MUTE) audio.setMuted(!audio.isMuted());
      // Ambient traffic and pedestrians keep moving behind the title.
      for (const car of world.traffic) stepTrafficCar(car, STEP, world.traffic, world.city);
      for (const ped of world.peds) stepPedestrian(ped, STEP, world.city);
      world.time += STEP;
      renderer.draw(world, screen, save !== null);
      return;
    }
    while (accumulator >= STEP && screen === SCREEN.PLAY) {
      step();
      accumulator -= STEP;
    }
    if (screen === SCREEN.PAUSED) {
      const actions = input.takeActions();
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN.PLAY;
        announce('Playing.');
      }
      if (actions & ACTION_MUTE) audio.setMuted(!audio.isMuted());
      accumulator = 0;
    }
    renderer.draw(world, screen, save !== null);
  }

  // Leaving the tab pauses a running game rather than letting the city run unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN.PLAY) {
      screen = SCREEN.PAUSED;
      announce('Paused.');
    }
  });

  announce('Vice Shores. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
