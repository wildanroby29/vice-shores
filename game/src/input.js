// Keyboard and mouse input. The game reads movement every frame and takes
// one-shot actions (confirm, pause, garage, crew, reload, weapon switch) once,
// so a held key does not fire them twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_GARAGE = 4;
export const ACTION_MUTE = 8;
export const ACTION_RELOAD = 16;
export const ACTION_CREW_Q = 32;
export const ACTION_CREW_C = 64;
export const ACTION_CREW_V = 128;

const EDGE_KEYS = {
  Enter: ACTION_CONFIRM,
  Space: ACTION_CONFIRM,
  KeyP: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  KeyG: ACTION_GARAGE,
  KeyM: ACTION_MUTE,
  KeyR: ACTION_RELOAD,
  KeyQ: ACTION_CREW_Q,
  KeyC: ACTION_CREW_C,
  KeyV: ACTION_CREW_V,
};

export function createInput(canvas) {
  const held = new Set();
  let queued = 0;
  let pointerX = 0.5;
  let pointerY = 0.5;
  let pointerDown = false;
  let pointerHeld = false;

  function onKeyDown(event) {
    if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
    if (!event.repeat && EDGE_KEYS[event.code]) queued |= EDGE_KEYS[event.code];
    held.add(event.code);
  }
  function onKeyUp(event) {
    held.delete(event.code);
  }
  function onPointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    pointerX = (event.clientX - rect.left) / Math.max(1, rect.width);
    pointerY = (event.clientY - rect.top) / Math.max(1, rect.height);
  }
  function onPointerDown(event) {
    pointerDown = true;
    pointerHeld = true;
    onPointerMove(event);
  }
  function onPointerUp() {
    pointerHeld = false;
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointerup', onPointerUp);

  return {
    /** Movement vector from WASD/arrows, normalised, in screen space (x right, y down). */
    move() {
      let x = 0;
      let y = 0;
      if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
      if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
      if (held.has('KeyW') || held.has('ArrowUp')) y -= 1;
      if (held.has('KeyS') || held.has('ArrowDown')) y += 1;
      const len = Math.hypot(x, y);
      if (len > 0) {
        x /= len;
        y /= len;
      }
      return { x, y };
    },
    sprint() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    shootHeld() {
      return pointerHeld || held.has('Space');
    },
    shootPressed() {
      const pressed = pointerDown;
      pointerDown = false;
      return pressed;
    },
    weaponKey() {
      for (let i = 1; i <= 4; i += 1) {
        if (held.has(`Digit${i}`)) return i - 1;
      }
      return -1;
    },
    pointer() {
      return { x: pointerX, y: pointerY };
    },
    /** One-shot actions since the last call; clears the queue. */
    takeActions() {
      const actions = queued;
      queued = 0;
      return actions;
    },
    isDown(code) {
      return held.has(code);
    },
  };
}
