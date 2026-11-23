// Input: WASD/arrows drive and walk, E enter/steal car, Space/click shoot,
// Shift sprint/nitro, C camera, M map, G customs, P pause, R radio, Q weapon.
// Held keys give movement; one-shot presses are queued as bit flags.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_MAP = 8;
export const ACTION_SHOP = 16;
export const ACTION_RADIO = 32;
export const ACTION_WEAPON = 64;
export const ACTION_CAMERA = 128;

export function createInput(target) {
  const held = new Set();
  let actions = 0;
  const ONE = {
    Space: ACTION_CONFIRM, Enter: ACTION_CONFIRM,
    KeyP: ACTION_PAUSE, Escape: ACTION_PAUSE,
    KeyE: ACTION_ENTER, KeyM: ACTION_MAP, KeyG: ACTION_SHOP,
    KeyR: ACTION_RADIO, KeyQ: ACTION_WEAPON, KeyC: ACTION_CAMERA,
  };
  window.addEventListener('keydown', (event) => {
    if (ONE[event.code] !== undefined) {
      if (!event.repeat) actions |= ONE[event.code];
      if (event.code === 'Space') event.preventDefault();
      return;
    }
    held.add(event.code);
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.preventDefault();
  });
  window.addEventListener('keyup', (event) => { held.delete(event.code); });
  window.addEventListener('blur', () => { held.clear(); });
  target.addEventListener('pointerdown', () => { actions |= ACTION_CONFIRM; });

  const has = (...codes) => codes.some((c) => held.has(c));
  return {
    read() {
      return {
        fwd: has('KeyW', 'ArrowUp'),
        back: has('KeyS', 'ArrowDown'),
        left: has('KeyA', 'ArrowLeft'),
        right: has('KeyD', 'ArrowRight'),
        run: has('ShiftLeft', 'ShiftRight'),
        shoot: has('Space') || false,
      };
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
