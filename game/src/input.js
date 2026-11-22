// Keyboard and mouse input. Held keys steer and drive; one-shot presses are
// queued as flags and taken once by the loop, so a press between two frames is
// never lost and never counted twice.
export const ACT = {
  ENTER: 1, SHOOT: 2, RELOAD: 4, PAUSE: 8, GARAGE: 16, MUTE: 32,
  CREW1: 64, CREW2: 128, CREW3: 256, WEAPON1: 512, WEAPON2: 1024, WEAPON3: 2048, WEAPON4: 4096,
};

const KEYS = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  ShiftLeft: 'sprint', ShiftRight: 'sprint',
};
const PRESS = {
  KeyE: ACT.ENTER, Space: ACT.SHOOT, KeyR: ACT.RELOAD, KeyP: ACT.PAUSE,
  Escape: ACT.PAUSE, KeyG: ACT.GARAGE, KeyM: ACT.MUTE,
  KeyQ: ACT.CREW1, KeyC: ACT.CREW2, KeyV: ACT.CREW3,
  Digit1: ACT.WEAPON1, Digit2: ACT.WEAPON2, Digit3: ACT.WEAPON3, Digit4: ACT.WEAPON4,
};

export function createInput(target) {
  const held = { up: false, down: false, left: false, right: false, sprint: false };
  let actions = 0;
  let mouseDown = false;

  window.addEventListener('keydown', (event) => {
    const name = KEYS[event.code];
    if (name) { held[name] = true; event.preventDefault(); return; }
    const flag = PRESS[event.code];
    if (flag && !event.repeat) { actions |= flag; event.preventDefault(); }
  });
  window.addEventListener('keyup', (event) => {
    const name = KEYS[event.code];
    if (name) held[name] = false;
  });
  window.addEventListener('blur', () => {
    held.up = held.down = held.left = held.right = held.sprint = false;
  });
  target.addEventListener('pointerdown', () => { mouseDown = true; actions |= ACT.SHOOT; });
  target.addEventListener('pointerup', () => { mouseDown = false; });

  return {
    held,
    get mouseDown() { return mouseDown; },
    takeActions() { const t = actions; actions = 0; return t; },
  };
}
