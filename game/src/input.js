// Keyboard and pointer input. WASD/arrows move, Shift sprints, Space/click shoots,
// E enters cars / interacts, P or Esc pauses, M mutes, G opens the garage, 1/2/3 pick a
// weapon, Q cycles weapons. The pointer gives an aim point on the ground (the renderer
// raycasts the mouse ray onto y = 0), so shooting on foot aims where the player looks.

export function createInput() {
  const keys = new Set();
  const state = {
    keys,
    pointerDown: false,
    mouseX: 0,
    mouseY: 0,
    mouseNdcX: 0,
    mouseNdcY: 0,
    /** Edge-triggered presses consumed once by the world (E, pause, weapon keys...). */
    pressed: [],
  };

  const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
  const CONSUME_KEYS = ['KeyE', 'KeyP', 'Escape', 'KeyM', 'KeyG', 'KeyQ', 'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Enter'];

  function keyName(e) {
    return e.code || e.key;
  }

  function onKeyDown(e) {
    const k = keyName(e);
    if (MOVE_KEYS.includes(k) || CONSUME_KEYS.includes(k) || k === 'Space' || k === 'ShiftLeft' || k === 'ShiftRight') {
      e.preventDefault();
    }
    if (!e.repeat && CONSUME_KEYS.includes(k)) state.pressed.push(k);
    keys.add(k);
  }

  function onKeyUp(e) {
    keys.delete(keyName(e));
  }

  function onPointerMove(e) {
    state.mouseX = e.clientX;
    state.mouseY = e.clientY;
    state.mouseNdcX = (e.clientX / window.innerWidth) * 2 - 1;
    state.mouseNdcY = -(e.clientY / window.innerHeight) * 2 + 1;
  }

  function onPointerDown(e) {
    state.pointerDown = true;
    onPointerMove(e);
  }

  function onPointerUp() {
    state.pointerDown = false;
  }

  function attach() {
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('blur', onBlur);
  }

  function onBlur() {
    keys.clear();
    state.pointerDown = false;
  }

  function detach() {
    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerdown', onPointerDown);
    window.removeEventListener('pointerup', onPointerUp);
    window.removeEventListener('blur', onBlur);
  }

  /** Move input as a unit vector in world XZ: x east, z south. */
  function moveVector() {
    let x = 0;
    let z = 0;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
    if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
    if (keys.has('KeyW') || keys.has('ArrowUp')) z -= 1;
    if (keys.has('KeyS') || keys.has('ArrowDown')) z += 1;
    if (x !== 0 && z !== 0) {
      const inv = 1 / Math.hypot(x, z);
      x *= inv;
      z *= inv;
    }
    return { x, z };
  }

  function consume(code) {
    const i = state.pressed.indexOf(code);
    if (i >= 0) {
      state.pressed.splice(i, 1);
      return true;
    }
    return false;
  }

  function endFrame() {
    state.pressed.length = 0;
  }

  return {
    state,
    attach,
    detach,
    moveVector,
    consume,
    endFrame,
    isDown: (code) => keys.has(code),
    sprint: () => keys.has('ShiftLeft') || keys.has('ShiftRight'),
    shootHeld: () => keys.has('Space') || state.pointerDown,
  };
}
