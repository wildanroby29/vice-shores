// Keyboard and mouse input for Vice Shores. Held keys steer and drive; one-shot
// presses (enter car, shoot, pause, abilities, garage, radio, camera) are queued as
// flags and taken once by the loop, so a press between two frames is never lost.
export const ACT_ENTER = 1;
export const ACT_SHOOT = 2;
export const ACT_PAUSE = 4;
export const ACT_CONFIRM = 8;
export const ACT_GARAGE = 16;
export const ACT_RADIO = 32;
export const ACT_CAMERA = 64;
export const ACT_CREW_Q = 128;
export const ACT_CREW_C = 256;
export const ACT_CREW_V = 512;
export const ACT_RELOAD = 1024;

const FORWARD = new Set(['KeyW', 'ArrowUp']);
const BACK = new Set(['KeyS', 'ArrowDown']);
const LEFT = new Set(['KeyA', 'ArrowLeft']);
const RIGHT = new Set(['KeyD', 'ArrowRight']);
const SPRINT = new Set(['ShiftLeft', 'ShiftRight']);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let weaponKey = 0;

  function keyDown(event) {
    if (event.repeat) return;
    held.add(event.code);
    if (event.code === 'KeyE') actions |= ACT_ENTER;
    else if (event.code === 'Space') actions |= ACT_SHOOT;
    else if (event.code === 'KeyP' || event.code === 'Escape') actions |= ACT_PAUSE;
    else if (event.code === 'Enter') actions |= ACT_CONFIRM;
    else if (event.code === 'KeyG') actions |= ACT_GARAGE;
    else if (event.code === 'KeyM') actions |= ACT_RADIO;
    else if (event.code === 'KeyC') actions |= ACT_CREW_C;
    else if (event.code === 'KeyV') actions |= ACT_CREW_V;
    else if (event.code === 'KeyQ') actions |= ACT_CREW_Q;
    else if (event.code === 'KeyR') actions |= ACT_RELOAD;
    else if (event.code === 'Digit1') weaponKey = 1;
    else if (event.code === 'Digit2') weaponKey = 2;
    else if (event.code === 'Digit3') weaponKey = 3;
    else if (event.code === 'Digit4') weaponKey = 4;
    if (FORWARD.has(event.code) || BACK.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code) || event.code === 'Space') {
      event.preventDefault();
    }
  }

  function keyUp(event) {
    held.delete(event.code);
  }

  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('blur', () => held.clear());
  canvas.addEventListener('pointerdown', () => {
    actions |= ACT_SHOOT;
  });

  function has(set) {
    for (const code of set) if (held.has(code)) return true;
    return false;
  }

  return {
    // -1 back, 1 forward, 0 neither.
    throttle() {
      return (has(FORWARD) ? 1 : 0) - (has(BACK) ? 1 : 0);
    },
    // -1 left, 1 right, 0 neither.
    steer() {
      return (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0);
    },
    sprint() {
      return has(SPRINT);
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeWeapon() {
      const w = weaponKey;
      weaponKey = 0;
      return w;
    },
  };
}
