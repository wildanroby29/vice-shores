// Input: WASD or arrows drive and walk, E enter or steal a car, Space or
// click shoot, Shift sprint or nitro, C camera, M map, G customs, P pause,
// R radio, Q weapon. Held keys give movement; one-shot presses are queued
// as bit flags.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_MAP = 8;
export const ACTION_SHOP = 16;
export const ACTION_RADIO = 32;
export const ACTION_WEAPON = 64;
export const ACTION_CAMERA = 128;

export function createInput(el) {
  const keys = new Set();
  let flags = 0;
  const MAP = {
    Space: ACTION_CONFIRM,
    Enter: ACTION_CONFIRM,
    KeyP: ACTION_PAUSE,
    Escape: ACTION_PAUSE,
    KeyE: ACTION_ENTER,
    KeyM: ACTION_MAP,
    KeyG: ACTION_SHOP,
    KeyR: ACTION_RADIO,
    KeyQ: ACTION_WEAPON,
    KeyC: ACTION_CAMERA,
  };
  window.addEventListener('keydown', (ev) => {
    if (MAP[ev.code] !== undefined) {
      if (!ev.repeat) flags |= MAP[ev.code];
      if (ev.code === 'Space') ev.preventDefault();
      return;
    }
    keys.add(ev.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(ev.code)) {
      ev.preventDefault();
    }
  });
  window.addEventListener('keyup', (ev) => {
    keys.delete(ev.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
  });
  el.addEventListener('pointerdown', () => {
    flags |= ACTION_CONFIRM;
  });

  const isDown = (...codes) => codes.some((c) => keys.has(c));
  return {
    read() {
      return {
        fwd: isDown('KeyW', 'ArrowUp'),
        back: isDown('KeyS', 'ArrowDown'),
        left: isDown('KeyA', 'ArrowLeft'),
        right: isDown('KeyD', 'ArrowRight'),
        run: isDown('ShiftLeft', 'ShiftRight'),
        shoot: isDown('Space') || false,
      };
    },
    takeActions() {
      const taken = flags;
      flags = 0;
      return taken;
    },
  };
}
