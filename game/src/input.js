// Vice Shores — keyboard input. One shared state object; the game reads
// keys by name and the shot system can press keys virtually.
export const keys = Object.create(null);
export const pressed = Object.create(null); // edge-triggered: true for one frame

export function attachInput() {
  window.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    keys[e.code] = true;
    pressed[e.code] = true;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
}

export function endFrame() { for (const k in pressed) pressed[k] = false; }

export function down(code) { return !!keys[code]; }
export function hit(code) { return !!pressed[code]; }

// WASD + arrows drive / walk; Shift sprints or sneaks; Space shoots.
export function steer() {
  let x = 0, y = 0;
  if (down('KeyA') || down('ArrowLeft')) x -= 1;
  if (down('KeyD') || down('ArrowRight')) x += 1;
  if (down('KeyW') || down('ArrowUp')) y += 1;
  if (down('KeyS') || down('ArrowDown')) y -= 1;
  return { x, y };
}
