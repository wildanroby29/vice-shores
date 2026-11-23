// Boot and the one loop: input every frame, the game advances in fixed 1/60 s
// steps, the renderer paints what is there. Screens: title, play, paused,
// game over, map and shop overlays.
// ?seed=N fixes the random pattern. ?shot=title|chase|onfoot|pier (with
// &seed=N) stages that scene instead of running the loop, paints it twice
// and sets window.__shotReady for a screenshot.
// ?flat=1 renders without the render-core upgrades (WP1 before/after).
// ?hud=old renders the old black-box HUD (WP3 before/after).
// ?detail=low builds simple stand-in assets (WP2 before/after).
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_ENTER, ACTION_MAP, ACTION_SHOP, ACTION_RADIO, ACTION_WEAPON, ACTION_CAMERA } from './input.js';
import { createGame, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER } from './render3d.js';
import { createHud } from './hud.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const query = new URLSearchParams(window.location.search);
const shotName = query.get('shot');
const seedRaw = Number.parseInt(query.get('seed') ?? '', 10);
const seedNum = Number.isInteger(seedRaw) ? seedRaw : Math.floor(Math.random() * 4294967296);
const detail = query.get('detail') === 'low' ? 'low' : 'full';
const flat = query.get('flat') === '1';
const legacyHud = query.get('hud') === 'old';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const hud = createHud();
const audio = createAudio();
const g = createGame(canvas, { rand: createRandom(seedNum), detail, hud, audio, flat });
if (flat) {
  // WP1 before: no colour grade, no vignette.
  document.getElementById('game').style.filter = 'none';
  document.getElementById('vignette').style.display = 'none';
}
if (legacyHud) {
  const fix = document.createElement('style');
  fix.textContent = '.glass{background:rgba(0,0,0,0.85)!important;backdrop-filter:none!important;border:1px solid #000!important;border-radius:0!important}';
  document.head.appendChild(fix);
}

function announce(message) {
  statusEl.textContent = message;
}

function runShot(name) {
  const staged = stageShot(name, g);
  hud.hideTitle();
  if (name === 'title') {
    // Title card over the live boulevard: big logo, HUD hidden.
    hud.showTitleCard();
    hud.setHudVisible(false);
  } else if (name.startsWith('asset_')) {
    // Asset turntable: one asset alone on a neutral background, HUD hidden.
    hud.hideTitleCard();
    hud.setHudVisible(false);
  } else {
    hud.hideTitleCard();
    hud.update(g.hudState());
    hud.setHudVisible(true);
  }
  let frames = 0;
  function draw() {
    g.render();
    frames += 1;
    if (frames < 2) requestAnimationFrame(draw);
    else window.__shotReady = true;
  }
  requestAnimationFrame(draw);
  void staged;
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let menuIndex = 0;
  g.setScreen(SCREEN_TITLE);
  g.setCamMode('title');
  hud.showTitle(g.getSaveSlots());
  hud.setHudVisible(false);
  announce('Vice Shores. Press Space or click to start.');

  function startGame() {
    g.setScreen(SCREEN_PLAY);
    g.setCamMode('chase');
    hud.hideTitle();
    hud.setHudVisible(true);
    screen = SCREEN_PLAY;
    audio.engineStart();
    announce('Playing. Follow the gold marker for Marla\'s job.');
    g.say('Marla: "One pickup, no questions. Coral Row, blue awning."', 5);
  }

  function toTitle() {
    g.setScreen(SCREEN_TITLE);
    g.setCamMode('title');
    hud.showTitle(g.getSaveSlots());
    hud.setHudVisible(false);
    screen = SCREEN_TITLE;
    audio.engineStop();
    audio.sirenOff();
  }

  function handleActions() {
    const flags = input.takeActions();
    if (hud.mapOpen()) {
      if (flags & (ACTION_MAP | ACTION_PAUSE)) {
        hud.hideMap();
      }
      return;
    }
    if (hud.shopOpen()) {
      if (flags & (ACTION_SHOP | ACTION_PAUSE)) {
        hud.hideShop();
        screen = SCREEN_PLAY;
      }
      return;
    }
    if (screen === SCREEN_TITLE) {
      if (flags & ACTION_CONFIRM) startGame();
      return;
    }
    if (flags & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        g.setScreen(SCREEN_PAUSED);
        announce('Paused.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        g.setScreen(SCREEN_PLAY);
        announce('Playing.');
      }
    }
    if (screen !== SCREEN_PLAY) return;
    if (flags & ACTION_ENTER) g.enterCar();
    if (flags & ACTION_MAP) {
      hud.drawBigMap(g.hudState().map);
      hud.showMap();
    }
    if (flags & ACTION_SHOP) {
      hud.showShop();
    }
    if (flags & ACTION_RADIO) {
      const station = g.missions.cycleRadio();
      hud.toast(`${station.station} — ${station.song}`);
    }
    if (flags & ACTION_WEAPON) {
      const weapon = g.missions.cycleWeapon();
      hud.toast(`Weapon: ${weapon.name}`);
    }
    if (flags & ACTION_CAMERA) {
      g.setCamMode(g.state.camMode === 'chase' ? 'pier' : 'chase');
    }
  }

  canvas.addEventListener('pointerdown', () => {
    if (screen === SCREEN_PLAY) g.shoot();
  });

  hud.onBuy((item) => {
    if (g.buyUpgrade(item)) hud.markOwned(item.key);
  });

  let acc = 0;
  let prev = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    acc += Math.min((now - prev) / 1000, MAX_FRAME);
    prev = now;
    handleActions();
    const move = input.read();
    const keys = {
      fwd: move.fwd, back: move.back, left: move.left, right: move.right,
      run: move.run, shoot: move.shoot, enter: false,
    };
    if (screen === SCREEN_PLAY || screen === SCREEN_TITLE) {
      while (acc >= STEP && (screen === SCREEN_PLAY || screen === SCREEN_TITLE)) {
        g.step(STEP, keys);
        acc -= STEP;
      }
    } else acc = 0;
    if (screen === SCREEN_PLAY) hud.update(g.hudState());
    g.render();
    void menuIndex;
  }
  requestAnimationFrame(frame);
}

if (shotName) runShot(shotName);
else runGame();
