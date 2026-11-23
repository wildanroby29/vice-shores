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
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);
const detail = params.get('detail') === 'low' ? 'low' : 'full';
const flat = params.get('flat') === '1';
const oldHud = params.get('hud') === 'old';

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const hud = createHud();
const audio = createAudio();
const game = createGame(canvas, { rand: createRandom(seed), detail, hud, audio, flat });
if (flat) {
  // WP1 before: no colour grade, no vignette.
  document.getElementById('game').style.filter = 'none';
  document.getElementById('vignette').style.display = 'none';
}
if (oldHud) {
  const s = document.createElement('style');
  s.textContent = '.glass{background:rgba(0,0,0,0.85)!important;backdrop-filter:none!important;border:1px solid #000!important;border-radius:0!important}';
  document.head.appendChild(s);
}

function announce(message) { status.textContent = message; }

function runShot(name) {
  const scene = stageShot(name, game);
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
    hud.update(game.hudState());
    hud.setHudVisible(true);
  }
  let painted = 0;
  function paint() {
    game.render();
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
  void scene;
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let menuIndex = 0;
  game.setScreen(SCREEN_TITLE);
  game.setCamMode('title');
  hud.showTitle(game.getSaveSlots());
  hud.setHudVisible(false);
  announce('Vice Shores. Press Space or click to start.');

  function startGame() {
    game.setScreen(SCREEN_PLAY);
    game.setCamMode('chase');
    hud.hideTitle();
    hud.setHudVisible(true);
    screen = SCREEN_PLAY;
    audio.engineStart();
    announce('Playing. Follow the gold marker for Marla\'s job.');
    game.say('Marla: "One pickup, no questions. Coral Row, blue awning."', 5);
  }

  function toTitle() {
    game.setScreen(SCREEN_TITLE);
    game.setCamMode('title');
    hud.showTitle(game.getSaveSlots());
    hud.setHudVisible(false);
    screen = SCREEN_TITLE;
    audio.engineStop();
    audio.sirenOff();
  }

  function handleActions() {
    const actions = input.takeActions();
    if (hud.mapOpen()) {
      if (actions & (ACTION_MAP | ACTION_PAUSE)) { hud.hideMap(); }
      return;
    }
    if (hud.shopOpen()) {
      if (actions & (ACTION_SHOP | ACTION_PAUSE)) { hud.hideShop(); screen = SCREEN_PLAY; }
      return;
    }
    if (screen === SCREEN_TITLE) {
      if (actions & ACTION_CONFIRM) startGame();
      return;
    }
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; game.setScreen(SCREEN_PAUSED); announce('Paused.'); }
      else if (screen === SCREEN_PAUSED) { screen = SCREEN_PLAY; game.setScreen(SCREEN_PLAY); announce('Playing.'); }
    }
    if (screen !== SCREEN_PLAY) return;
    if (actions & ACTION_ENTER) game.enterCar();
    if (actions & ACTION_MAP) { hud.drawBigMap(game.hudState().map); hud.showMap(); }
    if (actions & ACTION_SHOP) { hud.showShop(); }
    if (actions & ACTION_RADIO) { const r = game.missions.cycleRadio(); hud.toast(`${r.station} — ${r.song}`); }
    if (actions & ACTION_WEAPON) { const w = game.missions.cycleWeapon(); hud.toast(`Weapon: ${w.name}`); }
    if (actions & ACTION_CAMERA) { game.setCamMode(game.state.camMode === 'chase' ? 'pier' : 'chase'); }
  }

  canvas.addEventListener('pointerdown', () => { if (screen === SCREEN_PLAY) game.shoot(); });

  hud.onBuy((item) => {
    if (game.buyUpgrade(item)) hud.markOwned(item.key);
  });

  let accumulator = 0;
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    const mv = input.read();
    const act = {
      fwd: mv.fwd, back: mv.back, left: mv.left, right: mv.right,
      run: mv.run, shoot: mv.shoot, enter: false,
    };
    if (screen === SCREEN_PLAY || screen === SCREEN_TITLE) {
      while (accumulator >= STEP && (screen === SCREEN_PLAY || screen === SCREEN_TITLE)) {
        game.step(STEP, act);
        accumulator -= STEP;
      }
    } else accumulator = 0;
    if (screen === SCREEN_PLAY) hud.update(game.hudState());
    game.render();
    void menuIndex;
  }
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
