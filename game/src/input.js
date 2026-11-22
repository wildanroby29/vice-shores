// Keyboard and pointer input. Held keys give a move vector; one-shot presses
// (enter/exit a car, shoot, pause, mute, confirm) are queued as bit flags
// and taken once by the loop, so a press between two frames is never lost
// and never counted twice.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_SHOOT = 8;
export const ACTION_MUTE = 16;

const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const SPRINT = new Set(['ShiftLeft', 'ShiftRight']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const ENTER = new Set(['KeyE']);
const MUTE = new Set(['KeyM']);

export function createInput(target) {
  const held = new Set();
  let actions = 0;
  let mouse = { x: 0, y: 0, down: false, clicked: false };

  window.addEventListener('keydown', (event) => {
    if (UP.has(event.code) || DOWN.has(event.code) || LEFT.has(event.code) || RIGHT.has(event.code) || SPRINT.has(event.code)) {
      held.add(event.code);
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM | ACTION_SHOOT;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (ENTER.has(event.code)) {
      if (!event.repeat) actions |= ACTION_ENTER;
    } else if (MUTE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_MUTE;
    } else return;
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  // A key released while the tab is hidden never sends keyup: let go of everything on blur.
  window.addEventListener('blur', () => {
    held.clear();
    mouse.down = false;
  });
  target.addEventListener('pointermove', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
  });
  target.addEventListener('pointerdown', (event) => {
    mouse.x = event.clientX;
    mouse.y = event.clientY;
    mouse.down = true;
    mouse.clicked = true;
    actions |= ACTION_CONFIRM;
  });
  target.addEventListener('pointerup', () => {
    mouse.down = false;
  });

  function axis(neg, pos) {
    return (held.has(pos) ? 1 : 0) - (held.has(neg) ? 1 : 0);
  }

  return {
    /** Normalised {x, y} move vector from the held keys. */
    moveVector() {
      const x = axis('ArrowLeft', 'ArrowRight') || axis('KeyA', 'KeyD');
      const y = axis('ArrowUp', 'ArrowDown') || axis('KeyW', 'KeyS');
      const length = Math.hypot(x, y);
      if (length === 0) return { x: 0, y: 0 };
      return { x: x / length, y: y / length };
    },
    sprinting() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The mouse position in screen pixels, and whether it was just clicked. */
    takeMouse() {
      const clicked = mouse.clicked;
      mouse.clicked = false;
      return { x: mouse.x, y: mouse.y, clicked, down: mouse.down };
    },
    mousePosition() {
      return { x: mouse.x, y: mouse.y };
    },
  };
}
