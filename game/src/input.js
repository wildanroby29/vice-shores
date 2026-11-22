// input.js — Vice Shores: keyboard and mouse. Tracks held keys, drag-look
// deltas for the third-person camera, and click-to-shoot. main.js reads the
// snapshot each frame through VS.readInput().
(function () {
  var VS = window.VS;
  VS.keys = {};
  VS.mouse = { down: false, clicked: false, dx: 0, dy: 0, dragging: false, lastX: 0, lastY: 0 };

  VS.initInput = function () {
    window.addEventListener('keydown', function (e) {
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.code) !== -1) e.preventDefault();
      if (e.repeat) return;
      VS.keys[e.code] = true;
      if (e.code === 'KeyM') VS.audio.setMuted(!VS.state.muted);
      if (e.code === 'KeyP' || e.code === 'Escape') VS.togglePause();
      if (e.code === 'KeyG') VS.toggleGarage();
      if (e.code === 'KeyE') VS.keys.interactEdge = true;
      if (e.code === 'KeyR') VS.reloadWeapon();
      if (e.code === 'Digit1') VS.switchWeapon(0);
      if (e.code === 'Digit2') VS.switchWeapon(1);
      if (e.code === 'Digit3') VS.switchWeapon(2);
      if (e.code === 'Digit4') VS.switchWeapon(3);
      if (e.code === 'KeyQ') VS.useCrew(0);
      if (e.code === 'KeyC') VS.useCrew(1);
      if (e.code === 'KeyV') VS.useCrew(2);
    });
    window.addEventListener('keyup', function (e) { VS.keys[e.code] = false; });
    var gl = VS.el('gl');
    gl.addEventListener('pointerdown', function (e) {
      VS.mouse.down = true;
      VS.mouse.clicked = true;
      VS.mouse.dragging = true;
      VS.mouse.lastX = e.clientX;
      VS.mouse.lastY = e.clientY;
    });
    window.addEventListener('pointermove', function (e) {
      if (!VS.mouse.dragging) return;
      VS.mouse.dx += e.clientX - VS.mouse.lastX;
      VS.mouse.dy += e.clientY - VS.mouse.lastY;
      VS.mouse.lastX = e.clientX;
      VS.mouse.lastY = e.clientY;
    });
    window.addEventListener('pointerup', function () {
      VS.mouse.down = false;
      VS.mouse.dragging = false;
    });
    gl.addEventListener('wheel', function (e) {
      e.preventDefault();
      VS.state.camDist = VS.clamp(VS.state.camDist + (e.deltaY > 0 ? 0.8 : -0.8), 4.5, 12);
    }, { passive: false });
    gl.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  };

  VS.readInput = function () {
    var k = VS.keys;
    return {
      up: !!(k.KeyW || k.ArrowUp),
      down: !!(k.KeyS || k.ArrowDown),
      left: !!(k.KeyA || k.ArrowLeft),
      right: !!(k.KeyD || k.ArrowRight),
      sprint: !!(k.ShiftLeft || k.ShiftRight),
      nitro: !!(k.ShiftLeft || k.ShiftRight),
      handbrake: !!k.Space,
      shoot: !!(k.Space || VS.mouse.down),
      interact: !!k.KeyE,
      interactEdge: !!k.interactEdge,
    };
  };

  VS.consumeInteractEdge = function () { VS.keys.interactEdge = false; };
})();
