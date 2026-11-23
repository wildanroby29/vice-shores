// shots.js — the 4 screenshot scenes behind ?shot=title|chase|onfoot|pier.
// Each one stages a deterministic scene from the seeded game (time of day,
// mission, wanted level, positions), drives the simulation forward with a
// scripted input so the frame is what real play looks like, and returns the
// screen to draw. Same seed always gives the same frame.
// ?shot=asset_car|asset_police|asset_hero|asset_building|asset_heli are
// debug turntables: ONE asset alone, close-up 3/4 view, neutral background.
// They are NOT part of the 4-shot dossier (they render to /tmp, not
// screenshots/).
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { SCREEN_PLAY } from './render3d.js';
import { makeBuilding, PALETTES } from './city.js';

const IDLE = { fwd: false, back: false, left: false, right: false, run: false, shoot: false, enter: false };
const DRIVE = { ...IDLE, fwd: true };

function forward(game, seconds, input) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) game.step(STEP, input || DRIVE);
}

// Turntable helper: hide the whole world so ONE asset reads alone on a
// neutral background, then frame it in 3/4 view with the 'asset' camera.
function isolateAsset(game, subject, view) {
  game.city.group.visible = false;
  for (const c of game.traffic.cars) c.group.visible = false;
  for (const p of game.peds.peds) p.group.visible = false;
  for (const c of game.police.cars) c.group.visible = false;
  for (const o of game.police.officers) o.group.visible = false;
  game.heli.group.visible = false;
  game.marker.visible = false;
  game.heroCar.group.visible = false;
  game.rook.group.visible = false;
  for (const c of game.sky.clouds) c.visible = false;
  game.glitter.visible = false;
  game.scene.background = new THREE.Color(0x2e3644);
  game.sky.dome.visible = false;
  game.scene.fog = null;
  if (subject) subject.visible = true;
  // Neutral ground disc so the asset is grounded, not floating in a void.
  const disc = new THREE.Mesh(new THREE.CircleGeometry(30, 32), new THREE.MeshStandardMaterial({ color: 0x3a4250, roughness: 1 }));
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0;
  disc.receiveShadow = true;
  game.scene.add(disc);
  game.setTimeOfDay('afternoon');
  game.setCamMode('asset');
  game.setAssetView(view);
}

export function stageShot(name, game) {
  game.setScreen(SCREEN_PLAY);
  game.missions.money = 12650;
  if (name === 'asset_car') {
    // Hero GT alone, 3/4 front view (front = +Z, camera at +X+Z).
    // Rotation is set AFTER forward(): step() resets it to state.heading.
    game.heroCar.group.position.set(0, 0, 0);
    isolateAsset(game, game.heroCar.group, { x: 0, y: 0.8, z: 0, dist: 9, height: 3.2, az: Math.PI / 4, fov: 50 });
    forward(game, 0.5, IDLE);
    game.heroCar.group.rotation.y = 0;
    return { screen: SCREEN_PLAY };
  }
  if (name === 'asset_police') {
    // Police car alone, 3/4 front view.
    // Rotation is set AFTER forward(): police.update() turns it toward the hero.
    const car = game.police.spawnCar(0, 0, 'PURSUIT');
    isolateAsset(game, car.group, { x: 0, y: 0.8, z: 0, dist: 9, height: 3.2, az: Math.PI / 4, fov: 50 });
    forward(game, 0.5, IDLE);
    car.group.rotation.y = 0;
    return { screen: SCREEN_PLAY };
  }
  if (name === 'asset_hero') {
    // Rook alone, 3/4 view, full body (front = +Z, camera at +X+Z).
    game.rook.group.position.set(0, 0, 0);
    game.rook.group.rotation.y = 0;
    isolateAsset(game, game.rook.group, { x: 0, y: 1.0, z: 0, dist: 4.5, height: 1.8, az: Math.PI / 4, fov: 50 });
    forward(game, 0.5, IDLE);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'asset_building') {
    // One new-template building alone (terracotta palette, lit windows).
    const rand = createRandom(7);
    const b = makeBuilding(rand, 0, 0, 24, 20, 28, PALETTES[2], 'full', true);
    game.scene.add(b);
    isolateAsset(game, b, { x: 0, y: 12, z: 0, dist: 55, height: 16, az: Math.PI / 4, fov: 50 });
    forward(game, 0.5, IDLE);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'asset_heli') {
    // Helicopter alone, hovering, rotor spinning, 3/4 view.
    // The beam aims at the hero position, so park the (hidden) hero car
    // directly below the heli: the cone then points straight down.
    game.heroCar.group.position.set(0, 0, 0);
    game.heli.group.position.set(0, 18, 0);
    game.heli.setHold(0, 18, 0);
    game.setWanted(3);
    isolateAsset(game, game.heli.group, { x: 0, y: 18, z: 0, dist: 14, height: 19.5, az: Math.PI / 4, fov: 50 });
    forward(game, 1.0, IDLE);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'title') {
    // Cinematic title card OVER the live golden-hour boulevard. The HUD is
    // hidden and the big SVG logo (hud.js #titleCard) does the branding.
    // Hero GT in 3/4 view in the left third, 5 traffic cars, 12 pedestrians.
    game.setTimeOfDay('golden');
    game.setMission(0); // First Light
    game.setHero(180, -20, 0, true); // hero GT on the boulevard, heading south
    game.setCamMode('titlecard');
    game.setWanted(0);
    forward(game, 1.5, IDLE); // let the camera settle on the hero
    // Traffic ahead of the hero on the boulevard (parked for the photo).
    const spots = [[176, -8, 0], [184, 2, Math.PI], [176, 12, 0], [184, 22, Math.PI], [176, 32, 0]];
    spots.forEach(([x, z, rot], i) => {
      const c = game.traffic.cars[i];
      if (!c) return;
      c.group.position.set(x, 0, z);
      c.group.rotation.y = rot;
      c.x = x; c.z = z; c.speed = 0;
    });
    // Pedestrians on both sidewalks of the boulevard.
    game.peds.peds.forEach((p, i) => {
      if (i >= 12) return;
      const px = i % 2 === 0 ? 170 : 190;
      const pz = -15 + i * 4;
      p.tx = px; p.tz = pz;
      p.group.position.set(px, 0, pz);
    });
    return { screen: SCREEN_PLAY };
  }
  if (name === 'chase') {
    // Blue-hour night, 5 stars, helicopter VISIBLE with a volumetric cone,
    // 4 police cars within 10-30 m, skid smoke, 3/4 rear angle + roll.
    game.setTimeOfDay('night');
    game.setMission(1); // Heat Wave: lose the heat on the boulevard
    game.setHero(0, 60, Math.PI, true); // driving north on the central road
    game.setCamMode('chaseShot');
    game.setWanted(5);
    forward(game, 4, DRIVE);
    const hp = game.hudState().map.player; // hero's spot after driving north
    // Four police cars posed 10-30 m from the hero (frozen, lights flashing).
    const poses = [
      [hp.x - 6, hp.z - 20], [hp.x + 7, hp.z - 25],
      [hp.x - 5, hp.z + 15], [hp.x + 6, hp.z + 18],
    ];
    poses.forEach(([x, z], i) => {
      const c = game.police.cars[i];
      if (!c) return;
      c.group.position.set(x, 0, z);
      c.group.rotation.y = Math.PI;
      c.speed = 0;
    });
    // Four MORE police cars on the flanks, 10-25 m out (round 9: 8 units in
    // the chase, some on the sides), angled in at the hero, lights flashing.
    const flank = [
      [hp.x - 14, hp.z - 8], [hp.x + 14, hp.z - 10],
      [hp.x - 13, hp.z + 8], [hp.x + 13, hp.z + 5],
    ];
    for (const [x, z] of flank) {
      const c = game.police.spawnCar(x, z, 'FLANKING');
      c.group.rotation.y = Math.atan2(hp.x - x, hp.z - z);
      c.speed = 0;
    }
    // Helicopter held ahead-left in frame, beam locked on the hero. Snapped
    // there at once (a lerp alone would still be behind the camera at the
    // screenshot — the heli starts ~170 m back after the 4 s drive).
    // Round 9: closer + lower so the heli is >= 6% of frame width.
    if (game.heli.setHold) {
      game.heli.setHold(hp.x - 12, 14, hp.z - 28);
      game.heli.group.position.set(hp.x - 12, 14, hp.z - 28);
      game.heli.aimAt({ x: hp.x, z: hp.z });
    }
    // Skid smoke LAST (after every forward): the hero drives away from smoke
    // spawned earlier, so puffs must sit at the hero's final spot.
    // Hotfix: small puffs (<= car length) at 0.25 opacity — the old 2.6-3.6
    // sprites at 0.55 read as a big white haze under the hero.
    game.effects.spawnSmoke(hp.x - 2, 0.8, hp.z + 4, 1.6, 1.6, 0xe8e2d8);
    game.effects.spawnSmoke(hp.x + 2, 0.8, hp.z + 4, 1.6, 1.6, 0xe8e2d8);
    game.effects.spawnSmoke(hp.x, 0.8, hp.z - 3, 1.4, 1.4, 0xe8e2d8);
    game.effects.spawnSmoke(hp.x - 1, 0.8, hp.z + 6, 1.8, 1.8, 0xe8e2d8);
    game.effects.spawnSmoke(hp.x + 3, 0.8, hp.z + 2, 1.3, 1.4, 0xe8e2d8);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'onfoot') {
    // Afternoon, over-the-shoulder, job 3 (The Courier) on the boulevard.
    // Hero in the LEFT third, a short firefight (muzzle flashes + tracers +
    // sparks), subtitle clear of the characters. Round 9: staged NORTH of the
    // pier (z=140) so the pier deck/rails cannot cut the foreground — the
    // pier is behind the camera here, not in the frame.
    game.setTimeOfDay('afternoon');
    game.setMission(2);
    game.setHero(180, 140, Math.PI, false); // Rook on foot on the boulevard, facing north toward the marker
    game.setAim(true); // Rook holds the pistol aim pose through step()
    game.setCamMode('onfoot');
    game.setWanted(2);
    // Three officers closing in between Rook and the marker, facing him; a police car angled across the road.
    const rp = { x: 177, z: 142 }; // Rook's actual spot (setHero offsets by -3,+2)
    const offs = [[-8, -14], [8, -16], [0, -20]];
    game.police.officers.length = 0;
    for (const [dx, dz] of offs) {
      const o = game.police.spawnOfficer(rp.x + dx, rp.z + dz);
      o.group.lookAt(rp.x, 0, rp.z);
      o.parts.aim(true); // enemy peds with pistols out, aiming at Rook
    }
    const blocker = game.police.spawnCar(rp.x + 3, rp.z - 27);
    blocker.group.rotation.y = Math.PI * 0.32;
    // Park the police cars as a roadblock so they don't drive onto Rook.
    for (const c of game.police.cars) c.speed = 0;
    // One police car visible in frame, 15 m ahead on the road (dispatch must
    // match the scene: a listed unit has to be seen near the player).
    if (game.police.cars[0]) {
      game.police.cars[0].group.position.set(rp.x + 6, 0, rp.z - 15);
      game.police.cars[0].group.rotation.y = Math.PI;
    }
    // A yellow cab parked ahead-left on the road edge (frozen: traffic would
    // otherwise drive it right up to the camera).
    const cab = game.traffic.cars[0];
    cab.group.position.set(171, 0, 118);
    cab.group.rotation.y = Math.PI * 0.5;
    cab.speed = 0;
    // Pedestrians on both sidewalks ahead of Rook (12 in frame).
    game.peds.peds.forEach((p, i) => {
      if (i >= 12) return;
      const px = i % 2 === 0 ? 171 : 189;
      const pz = 108 + i * 3;
      p.tx = px; p.tz = pz;
      p.group.position.set(px, 0, pz);
    });
    // Two pedestrians lying on the road (fallen in the firefight, no gore):
    // prone across the road (body along X, full 1.8 m silhouette visible
    // from the over-shoulder camera), frozen by the fallen flag.
    [[12, rp.x - 3, rp.z - 10], [13, rp.x + 5, rp.z - 12]].forEach(([i, fx, fz]) => {
      const p = game.peds.peds[i];
      if (!p) return;
      p.fallen = true; p.speed = 0; p.tx = fx; p.tz = fz;
      p.group.position.set(fx, 0.32, fz);
      p.group.rotation.set(0, 0, Math.PI / 2);
    });
    game.say('Marla: "Case goes to the marina. Don\'t open it."', 6);
    forward(game, 1.2, IDLE);
    // Firefight LAST (after every forward) so the muzzle flashes are fresh
    // and bright at the screenshot instead of faded out.
    game.shoot(); // Rook's muzzle flash in the frame
    // Return fire from two officers + tracers + sparks on the roadblock car.
    game.effects.muzzleFlash(rp.x - 8, 1.4, rp.z - 13);
    game.effects.muzzleFlash(rp.x + 8, 1.4, rp.z - 15);
    game.effects.tracer(rp.x, 1.4, rp.z - 3, rp.x - 8, 1.4, rp.z - 13);
    game.effects.tracer(rp.x - 8, 1.4, rp.z - 13, rp.x - 1, 1.2, rp.z - 4);
    game.effects.tracer(rp.x + 8, 1.4, rp.z - 15, rp.x + 1, 1.2, rp.z - 5);
    game.effects.sparks(rp.x + 3, 1.2, rp.z - 26, 10);
    game.effects.spawnSmoke(rp.x, 1.2, rp.z - 10, 1.2, 0.9, 0xffd98a);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'pier') {
    // STREET-LEVEL at the end of the pier, looking back at the skyline at
    // sunset. Sea + sun glitter in the foreground, boats with wakes, planks /
    // posts / rails / lamps on the pier, 16 pedestrians. Round 9: the HERO
    // stands on foot in the LEFT third facing the sea, the GT parked beside
    // him — and everyone stands ON the deck (its top is y=1.1), feet and
    // legs visible, not sunk into it.
    game.setTimeOfDay('sunset');
    game.setMission(5); // High Tide: meet the boat at the pier
    // Rook on foot on the pier, FACING THE SEA (south, toward the camera),
    // LEFT third and CLOSE (7 m from the lens, so he is large and clearly
    // the hero, not one of the crowd). setHero puts Rook at (x-3, z+2);
    // (185,228) lands him at (182,230) — 30° left of the camera axis.
    game.setHero(185, 228, 0, false);
    game.rook.group.position.y = 1.1; // pier deck top
    game.setCamMode('pier');
    game.setWanted(0);
    // The GT parked on the deck beside Rook (4 m east, 4 m behind him).
    game.heroCar.group.position.set(186, 1.1, 226);
    game.heroCar.group.rotation.y = Math.PI;
    // Crowd the pier deck (rows start 10 m north of Rook so nobody blocks
    // him) and the beach with pedestrians — 20 on the pier (feet ON the
    // deck), 4 on the beach.
    game.peds.peds.forEach((p, i) => {
      let px; let pz; let py = 0;
      if (i < 20) { px = 181.5 + (i % 4) * 2.4; pz = 218 - Math.floor(i / 4) * 13; py = 1.1; p.speed = 0; }
      else { px = 196 + ((i - 20) % 4) * 4; pz = 165 + Math.floor((i - 20) / 4) * 12; }
      p.tx = px; p.tz = pz;
      p.group.position.set(px, py, pz);
    });
    game.say('Marla: "Boat\'s at the pier end. Tide waits for nobody."', 6);
    forward(game, 1.5, IDLE);
    return { screen: SCREEN_PLAY };
  }
  // Unknown shot name: fall back to the title card.
  return stageShot('title', game);
}
