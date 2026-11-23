// Boot for Vice Shores.
//
// Reads the URL (?shot=, ?seed=, ?detail=low, ?flat=1, ?hud=old), builds
// the game from the seeded stream, and either stages one screenshot or
// runs the real game: a title screen with save slots, then play — driving
// and walking, missions, police, the map and the shop — stepped in fixed
// 1/60-second steps. In shot mode the page stages the scene, paints twice
// and raises window.__shotReady so the screenshot tool knows the frame is
// final.

import { makeRng } from './random.js';
import { createGame } from './render3d.js';
import { createHud } from './hud.js';
import { runShot } from './shots.js';
import * as audio from './audio.js';
import { ACT, createInput } from './input.js';

const params = new URLSearchParams(location.search);
const shotName = params.get('shot');
const seedParam = params.get('seed');
const detail = params.get('detail') === 'low' ? 'low' : 'full';
const flat = params.get('flat') === '1';
const oldHud = params.get('hud') === 'old';

const seed = seedParam !== null
  ? (parseInt(seedParam, 10) >>> 0)
  : (Math.random() * 0xffffffff) >>> 0;

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');

function announce(text) {
  if (statusEl) statusEl.textContent = text;
}

const hud = createHud();
const input = createInput();
const game = createGame(canvas, {
  rand: makeRng(seed), detail, hud, audio, flat,
});

if (flat) {
  canvas.style.filter = 'none';
  const vig = document.getElementById('vignette');
  if (vig) vig.style.display = 'none';
}

if (oldHud) {
  const st = document.createElement('style');
  st.textContent = `
    #hud .glass { background: rgba(0,0,0,0.85) !important; backdrop-filter: none !important; -webkit-backdrop-filter: none !important; border: 1px solid #000 !important; border-radius: 0 !important; }
  `;
  document.head.appendChild(st);
}

window.addEventListener('keydown', () => audio.unlockAudio(), { once: true });
window.addEventListener('pointerdown', () => audio.unlockAudio(), { once: true });

if (shotName) {
  // One staged screenshot.
  runShot(shotName, game);
  hud.hideTitle();
  if (shotName === 'title') {
    hud.showTitleCard();
    hud.setHudVisible(false);
  } else if (shotName.startsWith('asset')) {
    hud.hideTitleCard();
    hud.setHudVisible(false);
  } else {
    hud.hideTitleCard();
    hud.update(game.hudState());
    hud.setHudVisible(true);
  }
  requestAnimationFrame(() => {
    game.render();
    requestAnimationFrame(() => {
      game.render();
      window.__shotReady = true;
    });
  });
} else {
  // The real game.
  let orbitView = false;
  let menuIndex = 0;

  game.screen = 'title';
  game.camMode = 'title';
  hud.setHudVisible(false);
  hud.showTitle(game.listSaves());
  announce('Vice Shores. Press Space or click to start.');

  function startGame() {
    hud.hideTitle();
    game.screen = 'play';
    game.camMode = 'chase';
    hud.setHudVisible(true);
    audio.unlockAudio();
    audio.engineStart();
    announce('Playing. Follow the gold marker for Marla\'s job.');
    game.setDialogue('Marla: "One pickup, no questions. Coral Row, blue awning."', 5);
  }

  function togglePause() {
    if (game.screen === 'play') {
      game.screen = 'paused';
      hud.toast('Paused — press P to resume');
      announce('Paused.');
    } else if (game.screen === 'paused') {
      game.screen = 'play';
      announce('Playing.');
    }
  }

  canvas.addEventListener('pointerdown', () => {
    audio.unlockAudio();
    if (game.screen === 'title') startGame();
    else if (game.screen === 'play') game.shoot();
  });

  hud.onBuy((key) => {
    const res = game.buyUpgrade(key);
    if (res.ok) {
      hud.markOwned(key);
      hud.toast(`${res.name} installed`);
    } else if (res.poor) {
      hud.toast('Not enough money for that.');
    }
  });

  let acc = 0;
  let last = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min(0.25, (now - last) / 1000);
    last = now;
    acc += elapsed;
    const pressed = input.peekPressed();
    if (game.screen === 'title') {
      if (pressed & (ACT.CONFIRM | ACT.SHOOT)) {
        input.takePressed();
        startGame();
      }
    } else if (game.screen === 'play') {
      const p = input.takePressed();
      if (p & ACT.PAUSE) togglePause();
      if (p & ACT.MAP) {
        if (hud.mapOpen) hud.hideMap(); else hud.showMap();
      }
      if (p & ACT.SHOP) {
        if (hud.shopOpen) hud.hideShop(); else hud.showShop();
      }
      if (p & ACT.RADIO) {
        const st = game.missions.cycleRadio();
        hud.toast(`${st.name} — ${st.song}`);
      }
      if (p & ACT.WEAPON) {
        const w = game.missions.cycleWeapon();
        hud.toast(w.name);
      }
      if (p & ACT.CAMERA) orbitView = !orbitView;
    } else if (game.screen === 'paused') {
      const p = input.takePressed();
      if (p & ACT.PAUSE) togglePause();
    } else {
      input.takePressed();
    }

    // The camera follows the mode: orbit on the title screen and when the
    // player asks for the scenic view, over-the-shoulder on foot, chase in
    // the car.
    if (game.screen === 'title') game.camMode = 'title';
    else if (game.screen === 'play' || game.screen === 'paused') {
      if (orbitView) game.camMode = 'title';
      else game.camMode = game.onFoot ? 'onfoot' : 'chase';
    }

    while (acc >= 1 / 60) {
      if (game.screen === 'title' || game.screen === 'play') {
        game.step(1 / 60, input);
      }
      acc -= 1 / 60;
    }
    if (game.screen === 'play' || game.screen === 'paused') {
      hud.update(game.hudState());
    }
    game.render();
  }

  requestAnimationFrame(frame);
}
