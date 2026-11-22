// The four screenshot stagings for Vice Shores. Each one places the world exactly:
// the chase climax, the on-foot surround, the poster title, and the airbrush
// workshop. Every shot is judged by eye before it ships — if it looks plain, empty
// or ugly, it is re-staged, never accepted.
import { makeCar, makeBurningWreck } from './vehicles.js';
import { makePerson } from './people.js';

function headingTo(tx, tz, fx, fz) {
  // Heading whose forward vector (cos h, -sin h) points from (fx,fz) to (tx,tz).
  return Math.atan2(-(tz - fz), tx - fx);
}

export function stageShot(name, game) {
  const { THREE, scene, state, renderer3d, missions, police } = game;
  state.screen = 'play';
  renderer3d.clearShotCam();

  if (name === 'chase') {
    // 5-star chase climax on the beachfront boulevard, bright sun, ocean left.
    state.jobIndex = 6;
    state.jobProgress = 0.6;
    state.wanted = 5;
    state.money = 86250;
    state.time = 18.38;
    state.dialogue = 'Marla: Five stars, Rook — and the whole city is watching the boulevard. Do not slow down.';
    state.dialogueTimer = 99;
    missions.start(6);
    missions.hide(); // the beacon pillar would sit right in front of the chase camera
    // The player's GT, mid-boulevard, heading north at 122 km/h.
    const gt = game.playerCar;
    gt.mesh.position.set(-52, 0, 30);
    gt.mesh.rotation.y = Math.PI / 2;
    gt.speed = 34;
    gt.heading = Math.PI / 2;
    state.player.x = -52;
    state.player.z = 30;
    state.player.heading = Math.PI / 2;
    state.player.inCar = gt;
    state.player.onFoot = false;
    game.playerMesh.visible = false;
    // Police: sync spawns 7 units + the helicopter, then place them by hand.
    police.sync(-52, 30, 5, 0.016, 1.2);
    const units = police.units;
    const place = (unit, x, z, heading) => {
      unit.mesh.position.set(x, 0, z);
      unit.mesh.rotation.y = heading;
    };
    if (units[0]) place(units[0], -55.5, 26.5, Math.PI / 2 + 0.3); // rammer: rear quarter, left side, angled in
    if (units[1]) place(units[1], -48, 16, Math.PI / 2 - 0.2); // flanker ahead right
    if (units[2]) place(units[2], -55, 8, Math.PI / 2); // chaser mid-pack
    if (units[3]) place(units[3], -49, 2, Math.PI / 2); // roadblock left
    if (units[4]) place(units[4], -52, 0, Math.PI / 2); // roadblock centre
    if (units[5]) place(units[5], -55, -2, Math.PI / 2); // roadblock right
    if (units[6]) place(units[6], -48.5, 38, Math.PI / 2 + 0.5); // trailing, closing in
    // Two burning wrecks with REAL fire, on the shoulders ahead, close to camera.
    const wreck1 = makeBurningWreck(THREE, game.rng);
    wreck1.group.position.set(-47, 0, 18);
    wreck1.group.rotation.y = 0.5;
    scene.add(wreck1.group);
    game.wrecks.push(wreck1);
    const wreck2 = makeBurningWreck(THREE, game.rng);
    wreck2.group.position.set(-57, 0, 10);
    wreck2.group.rotation.y = -0.7;
    scene.add(wreck2.group);
    game.wrecks.push(wreck2);
    // Helicopter fully in frame, high and to the right, so its narrow beam slants
    // in from the frame edge instead of washing out the centre.
    if (police.heli) {
      police.heli.group.position.set(-46, 13, 10);
    }
    // Traffic ahead on the boulevard so the road feels alive.
    const taxi = game.traffic.cars.find((c) => c.mesh.userData.kind === 'taxi');
    if (taxi) {
      taxi.mesh.position.set(-52, 0, -14);
      taxi.mesh.rotation.y = Math.PI / 2;
    }
    // Low close chase camera, slightly to the left so the GT shows its side,
    // spoiler and wheels — a three-quarter rear view, not a flat box from behind.
    renderer3d.setShotCam({
      pos: { x: -55.5, y: 3.2, z: 36.5 },
      look: { x: -51, y: 1.4, z: 10 },
    });
    return { screen: 'play' };
  }

  if (name === 'onfoot') {
    // The surround: Rook at the yellow cab, door open, driver out, two uniformed
    // officers closing in from either side, a police car blocking the road ahead,
    // and a busy street full of pedestrians on both sidewalks.
    state.jobIndex = 1;
    state.jobProgress = 0.3;
    state.wanted = 2;
    state.money = 6420;
    state.time = 18.38;
    state.dialogue = 'Marla: That cab on Palm Row is yours, Rook. Take it — the driver already knows the drill.';
    state.dialogueTimer = 99;
    missions.start(1);
    missions.hide(); // the beacon pillar would sit in the middle of the street
    state.player.x = 0;
    state.player.z = 20;
    state.player.heading = Math.PI / 2;
    state.player.onFoot = true;
    state.player.inCar = null;
    game.playerMesh.visible = true;
    game.playerMesh.position.set(0, 0, 20);
    game.playerMesh.rotation.y = Math.PI / 2;
    // The Sunline Cab right in front of Rook, door open, driver stepping out.
    const cab = game.parkedCars.find((c) => c.kind === 'taxi') || game.parkedCars[0];
    if (cab) {
      cab.mesh.position.set(0.4, 0, 15);
      cab.mesh.rotation.y = Math.PI / 2;
      cab.taken = true;
      // Open door: a thin panel swung out toward the sidewalk.
      const door = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.9, 1.0),
        new THREE.MeshLambertMaterial({ color: 0xffd21f }),
      );
      door.position.set(1.6, 0.75, 15.8);
      door.rotation.y = -0.9;
      scene.add(door);
      game.staged.push(door);
    }
    const driver = makePerson(THREE, game.rng, { shirt: 0xf2e6c9, height: 1.75 });
    driver.position.set(2.2, 0, 16.5);
    driver.rotation.y = headingTo(0, 20, 2.2, 16.5);
    scene.add(driver);
    game.staged.push(driver);
    // Three uniformed officers closing in, close enough to read as police and
    // close enough to feel like a trap: two flanking, one ahead-left.
    police.sync(0, 20, 2, 0.016, 1.2);
    const officers = police.spawnOfficers(scene, [
      { x: -2.6, z: 17, heading: headingTo(0, 20, -2.6, 17) },
      { x: 2.8, z: 17.5, heading: headingTo(0, 20, 2.8, 17.5) },
      { x: -4.5, z: 10, heading: headingTo(0, 20, -4.5, 10) },
    ]);
    game.staged.push(...officers);
    const units = police.units;
    // A police car angled across the road just ahead of the cab, clearly blocking it.
    if (units[0]) { units[0].mesh.position.set(0, 0, 10); units[0].mesh.rotation.y = -Math.PI / 2 + 0.6; }
    if (units[1]) { units[1].mesh.position.set(-6, 0, 26); units[1].mesh.rotation.y = Math.PI / 2; }
    // A busy street: pedestrians on both sidewalks, several close to the camera.
    const pedSpots = [
      [-8.5, 26, 0.6], [-8.5, 16, -0.4], [-9, 8, 1.2], [8.5, 24, -2.2], [8.5, 14, 2.6],
      [9, 6, -1.0], [-8.5, 32, 0.2], [8.5, 32, 3.0], [-8, 2, -0.8], [8, -2, 0.9],
      [-8.5, 22, 1.8], [8.5, 20, -1.6], [-9, 28, 0.9], [9, 28, 2.4],
    ];
    for (const [px, pz, face] of pedSpots) {
      const ped = makePerson(THREE, game.rng, {});
      ped.position.set(px, 0, pz);
      ped.rotation.y = face;
      const limbs = ped.userData.limbs;
      limbs.legL.rotation.x = 0.25;
      limbs.legR.rotation.x = -0.25;
      scene.add(ped);
      game.staged.push(ped);
    }
    // Close over-the-shoulder camera, low and near, straight down the street.
    renderer3d.setShotCam({
      pos: { x: 0, y: 1.9, z: 23.5 },
      look: { x: 0, y: 1.3, z: 6 },
    });
    return { screen: 'play' };
  }

  if (name === 'garage') {
    // Dockside Customs, mid airbrush-paint: the GT on the lift, the painter at its
    // flank with the spray cone, cans and tools and tyres around, neon glowing.
    state.jobIndex = 4;
    state.jobProgress = 0.5;
    state.wanted = 0;
    state.money = 12650;
    state.time = 18.38;
    state.dialogue = 'Marla: A sunrise paint job buys you a new face. Park it inside, keep the doors shut.';
    state.dialogueTimer = 99;
    state.screen = 'garage';
    state.garageOpen = true;
    missions.start(4);
    missions.hide(); // the beacon pillar would rise through the workshop roof
    const gt = game.playerCar;
    // The GT on the lift, facing east so the south-east camera sees its front
    // three-quarter: side, wheels, spoiler and nose in one frame.
    gt.mesh.position.set(-52, 0.8, 96);
    gt.mesh.rotation.y = 0;
    gt.heading = 0;
    gt.speed = 0;
    state.player.x = -52;
    state.player.z = 96;
    state.player.inCar = gt;
    state.player.onFoot = false;
    game.playerMesh.visible = false;
    // The painter, on the car's south flank, facing it, spray gun raised.
    const painter = makePerson(THREE, game.rng, { shirt: 0x2e6fb0, pants: 0x2c3550, height: 1.8 });
    painter.position.set(-50, 0.06, 93.6);
    painter.rotation.y = headingTo(-52, 96, -50, 93.6);
    const limbs = painter.userData.limbs;
    limbs.armR.rotation.x = -1.2;
    limbs.armL.rotation.x = -0.4;
    scene.add(painter);
    game.staged.push(painter);
    // The airbrush spray cone: apex at the gun, wide end opening onto the flank.
    const spray = new THREE.Mesh(
      new THREE.ConeGeometry(1.0, 3.0, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xff8a3c, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false }),
    );
    spray.position.set(-51, 1.25, 94.9);
    const sprayDir = new THREE.Vector3(-2, -0.1, 2.4).normalize();
    spray.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), sprayDir.clone().negate());
    scene.add(spray);
    game.staged.push(spray);
    // A drop cloth by the lift for craft detail.
    const cloth = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.06, 1.4),
      new THREE.MeshLambertMaterial({ color: 0xf2e6c9 }),
    );
    cloth.position.set(-52, 0.1, 92.5);
    scene.add(cloth);
    game.staged.push(cloth);
    // Slightly elevated close three-quarter view from the south-east: the car BIG
    // in frame, the lift posts below the sight line, the painter at its flank,
    // the workbench and neon behind it.
    renderer3d.setShotCam({
      pos: { x: -46.5, y: 3.0, z: 91 },
      look: { x: -52, y: 1.0, z: 96 },
    });
    return { screen: 'garage' };
  }

  // Default: the poster title screen.
  state.jobIndex = 0;
  state.jobProgress = 0.2;
  state.wanted = 0;
  state.money = 500;
  state.time = 18.38;
  state.dialogue = 'Marla: New in town, Rook? One package, one pier. Do not make me regret this.';
  state.dialogueTimer = 99;
  state.screen = 'title';
  missions.start(0);
  // A little life behind the title: the taxi cruising and a few pedestrians.
  const taxi = game.traffic.cars.find((c) => c.mesh.userData.kind === 'taxi');
  if (taxi) {
    taxi.mesh.position.set(-52, 0, -20);
    taxi.mesh.rotation.y = Math.PI / 2;
  }
  return { screen: 'title' };
}
