export const ACT = {
  ENTER: 1,
  SHOOT: 2,
  SPRINT: 4,
  CAMERA: 8,
  MAP: 16,
  SHOP: 32,
  PAUSE: 64,
  RADIO: 128,
  WEAPON: 256,
  CONFIRM: 512,
  // Crew abilities, matching the numbered key chips on the HUD ability
  // cards: 1 Swap Plates (Marla), 2 Quick Fix (Dex), 3 Eyes Out (Lena).
  ABILITY1: 1024,
  ABILITY2: 2048,
  ABILITY3: 4096,
};

const PRESS_KEYS = {
  KeyE: ACT.ENTER,
  Space: ACT.SHOOT | ACT.CONFIRM,
  Enter: ACT.CONFIRM,
  KeyC: ACT.CAMERA,
  KeyM: ACT.MAP,
  KeyG: ACT.SHOP,
  KeyP: ACT.PAUSE,
  Escape: ACT.PAUSE,
  KeyR: ACT.RADIO,
  KeyQ: ACT.WEAPON,
  Digit1: ACT.ABILITY1,
  Digit2: ACT.ABILITY2,
  Digit3: ACT.ABILITY3,
};

export function createInput() {
  const held = new Set();
  let queued = 0;
  let shiftHeld = false;

  function keyName(e) {
    return e.code || e.key;
  }

  function onDown(e) {
    const code = keyName(e);
    if (code === 'ShiftLeft' || code === 'ShiftRight') shiftHeld = true;
    held.add(code);
    const flag = PRESS_KEYS[code];
    if (flag) {
      queued |= flag;
      e.preventDefault();
    }
    if (code === 'Space' || code.startsWith('Arrow')) e.preventDefault();
  }

  function onUp(e) {
    const code = keyName(e);
    if (code === 'ShiftLeft' || code === 'ShiftRight') shiftHeld = false;
    held.delete(code);
  }

  // Named so detach() can remove it: the anonymous version could never
  // be unregistered, so a detached input kept clearing state on blur.
  function onBlur() {
    held.clear();
    shiftHeld = false;
    // Drop anything queued while the window was unfocused, so a key
    // pressed just before alt-tabbing does not fire on the way back.
    queued = 0;
  }

  window.addEventListener('keydown', onDown);
  window.addEventListener('keyup', onUp);
  window.addEventListener('blur', onBlur);

  function down(...codes) {
    return codes.some((c) => held.has(c));
  }

  return {
    get forward() {
      return down('KeyW', 'ArrowUp') ? 1 : down('KeyS', 'ArrowDown') ? -1 : 0;
    },
    get steer() {
      return down('KeyA', 'ArrowLeft') ? -1 : down('KeyD', 'ArrowRight') ? 1 : 0;
    },
    get sprint() {
      return shiftHeld;
    },
    takePressed() {
      const out = queued;
      queued = 0;
      return out;
    },
    peekPressed() {
      return queued;
    },
    detach() {
      window.removeEventListener('keydown', onDown);
      window.removeEventListener('keyup', onUp);
      window.removeEventListener('blur', onBlur);
    },
  };
}

export function scriptedInput(kind) {
  if (kind === 'DRIVE') {
    return {
      forward: 1, steer: 0, sprint: false,
      takePressed() { return 0; },
      peekPressed() { return 0; },
    };
  }
  return {
    forward: 0, steer: 0, sprint: false,
    takePressed() { return 0; },
    peekPressed() { return 0; },
  };
}
