// Shots: deterministic setups for the 4 screenshots (?shot=NAME&seed=7).
const THREE = window.THREE;
export const SHOT_NAMES = ['title', 'chase', 'night', 'progress'];
export function applyShot(name, G) {
  const P = G.player;
  if (name === 'title') {
    G.setMode('title');
    G.camera.position.set(120, 110, 230);
    G.camera.lookAt(0, 10, -10);
    G.camera.fov = 55; G.camera.updateProjectionMatrix();
    G.hudVisible(false);
    return;
  }
  if (name === 'chase') {
    G.setMode('play');
    G.setTimeOfDay('golden');
    G.missions.index = 1;
    G.money = 4820; G.clockMin = 17 * 60 + 30;
    G.police.setWanted(4);
    G.enterCar(G.heroCar);
    G.heroCar.position.set(0, 0, 132);
    G.heroCar.rotation.y = 0;
    G.player.pos.set(0, 0, 132);
    G.speed = 34; G.heroCar.userData.damage = 0.38;
    G.police.cars.length = 0;
    const spots = [[-8, 128], [8, 130], [-9, 136], [9, 138], [-6, 142], [7, 144]];
    for (const [x, z] of spots) {
      const c = G.police.spawnCar(new THREE.Vector3(x, 0, z));
      c.rotation.y = z > 132 ? Math.PI : 0;
    }
    G.police.ensureHeli(G.player.pos);
    if (G.police.heli) G.police.heli.position.set(10, 16, 158);
    G.police.radioIdx = 0;
    G.camera.fov = 64; G.camera.updateProjectionMatrix();
    G.hudVisible(true);
    G.hud.subtitle('DEACON', 'Four stars, Rook. The whole city is looking for you.', 6);
    return;
  }
  if (name === 'night') {
    G.setMode('play');
    G.setTimeOfDay('night');
    G.weather.setRain(true);
    G.missions.index = 2;
    G.money = 3640; G.clockMin = 21 * 60 + 30;
    G.police.setWanted(2);
    G.exitCar();
    P.pos.set(120, 0, -6);
    P.yaw = Math.PI - 0.6;
    G.player.mesh.rotation.y = Math.PI - 0.6;
    G.police.radioIdx = 1;
    G.combat.switch(3);
    G.placeMarketScene();
    G.camera.position.set(120, 2.5, 4);
    G.camera.lookAt(120, 1.5, -20);
    G.camera.fov = 60; G.camera.updateProjectionMatrix();
    G.hudVisible(true);
    G.hud.subtitle('DEACON', 'Two dealers, both armed, both in the market.', 6);
    return;
  }
  if (name === 'progress') {
    G.setMode('play');
    G.setTimeOfDay('golden');
    G.missions.index = 3; G.missions.done = 3; G.missions.money = 18450; G.missions.xp = 320;
    G.missions.ratings = ['S', 'A', 'S'];
    G.money = 18450; G.clockMin = 17 * 60 + 10;
    G.carsStolen = 7; G.distKm = 48; G.coll = 5;
    G.combat.shots = 86;
    G.openProgress();
    return;
  }
}
