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

function advance(g, seconds, input) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) g.step(STEP, input || DRIVE);
}

// Turntable helper: hide the whole world so ONE asset reads alone on a
// neutral background, then frame it in 3/4 view with the 'asset' camera.
function isolate(g, subject, view) {
  g.city.group.visible = false;
  for (const c of g.traffic.cars) c.group.visible = false;
  for (const p of g.peds.peds) p.group.visible = false;
  for (const c of g.police.cars) c.group.visible = false;
  for (const o of g.police.officers) o.group.visible = false;
  g.heli.group.visible = false;
  g.marker.visible = false;
  g.heroCar.group.visible = false;
  g.rook.group.visible = false;
  for (const c of g.sky.clouds) c.visible = false;
  g.glitter.visible = false;
  g.scene.background = new THREE.Color(0x2e3644);
  g.sky.dome.visible = false;
  g.scene.fog = null;
  if (subject) subject.visible = true;
  // Neutral ground disc so the asset is grounded, not floating in a void.
  const pad = new THREE.Mesh(new THREE.CircleGeometry(30, 32), new THREE.MeshStandardMaterial({ color: 0x3a4250, roughness: 1 }));
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0;
  pad.receiveShadow = true;
  g.scene.add(pad);
  g.setTimeOfDay('afternoon');
  g.setCamMode('asset');
  g.setAssetView(view);
}

export function stageShot(name, g) {
  g.setScreen(SCREEN_PLAY);
  g.missions.money = 12650;
  if (name === 'asset_car') {
    // Hero GT alone, 3/4 front view (front = +Z, camera at +X+Z).
    // Rotation is set AFTER advance(): step() resets it to state.heading.
    g.heroCar.group.position.set(0, 0, 0);
    isolate(g, g.heroCar.group, { x: 0, y: 0.8, z: 0, dist: 9, height: 3.2, az: Math.PI / 4, fov: 50 });
    advance(g, 0.5, IDLE);
    g.heroCar.group.rotation.y = 0;
    return { screen: SCREEN_PLAY };
  }
  if (name === 'asset_police') {
    // Police car alone, 3/4 front view.
    // Rotation is set AFTER advance(): police.update() turns it toward the hero.
    const car = g.police.spawnCar(0, 0, 'PURSUIT');
    isolate(g, car.group, { x: 0, y: 0.8, z: 0, dist: 9, height: 3.2, az: Math.PI / 4, fov: 50 });
    advance(g, 0.5, IDLE);
    car.group.rotation.y = 0;
    return { screen: SCREEN_PLAY };
  }
  if (name === 'asset_hero') {
    // Rook alone, 3/4 view, full body (front = +Z, camera at +X+Z).
    g.rook.group.position.set(0, 0, 0);
    g.rook.group.rotation.y = 0;
    isolate(g, g.rook.group, { x: 0, y: 1.0, z: 0, dist: 4.5, height: 1.8, az: Math.PI / 4, fov: 50 });
    advance(g, 0.5, IDLE);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'asset_building') {
    // One new-template building alone (terracotta palette, lit windows).
    const rng = createRandom(7);
    const b = makeBuilding(rng, 0, 0, 24, 20, 28, PALETTES[2], 'full', true);
    g.scene.add(b);
    isolate(g, b, { x: 0, y: 12, z: 0, dist: 55, height: 16, az: Math.PI / 4, fov: 50 });
    advance(g, 0.5, IDLE);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'asset_heli') {
    // Helicopter alone, hovering, rotor spinning, 3/4 view.
    // The beam aims at the hero position, so park the (hidden) hero car
    // directly below the heli: the cone then points straight down.
    g.heroCar.group.position.set(0, 0, 0);
    g.heli.group.position.set(0, 18, 0);
    g.heli.setHold(0, 18, 0);
    g.setWanted(3);
    isolate(g, g.heli.group, { x: 0, y: 18, z: 0, dist: 14, height: 19.5, az: Math.PI / 4, fov: 50 });
    advance(g, 1.0, IDLE);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'title') {
    // Cinematic title card OVER the live golden-hour boulevard. The HUD is
    // hidden and the big SVG logo (hud.js #titleCard) does the branding.
    // Hero GT in 3/4 view in the left third, 5 traffic cars, 12 pedestrians.
    g.setTimeOfDay('golden');
    g.setMission(0); // First Light
    g.setHero(180, -20, 0, true); // hero GT on the boulevard, heading south
    g.setCamMode('titlecard');
    g.setWanted(0);
    advance(g, 1.5, IDLE); // let the camera settle on the hero
    // Traffic ahead of the hero on the boulevard (parked for the photo).
    const slots = [[176, -8, 0], [184, 2, Math.PI], [176, 12, 0], [184, 22, Math.PI], [176, 32, 0]];
    slots.forEach(([x, z, rot], i) => {
      const c = g.traffic.cars[i];
      if (!c) return;
      c.group.position.set(x, 0, z);
      c.group.rotation.y = rot;
      c.x = x; c.z = z; c.speed = 0;
    });
    // Pedestrians on both sidewalks of the boulevard.
    g.peds.peds.forEach((p, i) => {
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
    g.setTimeOfDay('night');
    g.setMission(1); // Heat Wave: lose the heat on the boulevard
    g.setHero(0, 60, Math.PI, true); // driving north on the central road
    g.setCamMode('chaseShot');
    g.setWanted(5);
    advance(g, 4, DRIVE);
    const heroAt = g.hudState().map.player; // hero's spot after driving north
    // Four police cars posed 10-30 m from the hero (frozen, lights flashing).
    const spots = [
      [heroAt.x - 6, heroAt.z - 20], [heroAt.x + 7, heroAt.z - 25],
      [heroAt.x - 5, heroAt.z + 15], [heroAt.x + 6, heroAt.z + 18],
    ];
    spots.forEach(([x, z], i) => {
      const c = g.police.cars[i];
      if (!c) return;
      c.group.position.set(x, 0, z);
      c.group.rotation.y = Math.PI;
      c.speed = 0;
    });
    // Four MORE police cars on the flanks, 10-25 m out (round 9: 8 units in
    // the chase, some on the sides), angled in at the hero, lights flashing.
    const flanks = [
      [heroAt.x - 14, heroAt.z - 8], [heroAt.x + 14, heroAt.z - 10],
      [heroAt.x - 13, heroAt.z + 8], [heroAt.x + 13, heroAt.z + 5],
    ];
    for (const [x, z] of flanks) {
      const c = g.police.spawnCar(x, z, 'FLANKING');
      c.group.rotation.y = Math.atan2(heroAt.x - x, heroAt.z - z);
      c.speed = 0;
    }
    // Helicopter held ahead-left in frame, beam locked on the hero. Snapped
    // there at once (a lerp alone would still be behind the camera at the
    // screenshot — the heli starts ~170 m back after the 4 s drive).
    // Round 9: closer + lower so the heli is >= 6% of frame width.
    if (g.heli.setHold) {
      g.heli.setHold(heroAt.x - 12, 14, heroAt.z - 28);
      g.heli.group.position.set(heroAt.x - 12, 14, heroAt.z - 28);
      g.heli.aimAt({ x: heroAt.x, z: heroAt.z });
    }
    // Skid smoke LAST (after every advance): the hero drives away from smoke
    // spawned earlier, so puffs must sit at the hero's final spot.
    // Hotfix: small puffs (<= car length) at 0.25 opacity — the old 2.6-3.6
    // sprites at 0.55 read as a big white haze under the hero.
    g.effects.spawnSmoke(heroAt.x - 2, 0.8, heroAt.z + 4, 1.6, 1.6, 0xe8e2d8);
    g.effects.spawnSmoke(heroAt.x + 2, 0.8, heroAt.z + 4, 1.6, 1.6, 0xe8e2d8);
    g.effects.spawnSmoke(heroAt.x, 0.8, heroAt.z - 3, 1.4, 1.4, 0xe8e2d8);
    g.effects.spawnSmoke(heroAt.x - 1, 0.8, heroAt.z + 6, 1.8, 1.8, 0xe8e2d8);
    g.effects.spawnSmoke(heroAt.x + 3, 0.8, heroAt.z + 2, 1.3, 1.4, 0xe8e2d8);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'onfoot') {
    // Afternoon, over-the-shoulder, job 3 (The Courier) on the boulevard.
    // Hero in the LEFT third, a short firefight (muzzle flashes + tracers +
    // sparks), subtitle clear of the characters. Round 9: staged NORTH of the
    // pier (z=140) so the pier deck/rails cannot cut the foreground — the
    // pier is behind the camera here, not in the frame.
    g.setTimeOfDay('afternoon');
    g.setMission(2);
    g.setHero(180, 140, Math.PI, false); // Rook on foot on the boulevard, facing north toward the marker
    g.setAim(true); // Rook holds the pistol aim pose through step()
    g.setCamMode('onfoot');
    g.setWanted(2);
    // Three officers closing in between Rook and the marker, facing him; a police car angled across the road.
    const rookAt = { x: 177, z: 142 }; // Rook's actual spot (setHero offsets by -3,+2)
    const posts = [[-8, -14], [8, -16], [0, -20]];
    g.police.officers.length = 0;
    for (const [dx, dz] of posts) {
      const o = g.police.spawnOfficer(rookAt.x + dx, rookAt.z + dz);
      o.group.lookAt(rookAt.x, 0, rookAt.z);
      o.parts.aim(true); // enemy peds with pistols out, aiming at Rook
    }
    const block = g.police.spawnCar(rookAt.x + 3, rookAt.z - 27);
    block.group.rotation.y = Math.PI * 0.32;
    // Park the police cars as a roadblock so they don't drive onto Rook.
    for (const c of g.police.cars) c.speed = 0;
    // One police car visible in frame, 15 m ahead on the road (dispatch must
    // match the scene: a listed unit has to be seen near the player).
    if (g.police.cars[0]) {
      g.police.cars[0].group.position.set(rookAt.x + 6, 0, rookAt.z - 15);
      g.police.cars[0].group.rotation.y = Math.PI;
    }
    // A yellow cab parked ahead-left on the road edge (frozen: traffic would
    // otherwise drive it right up to the camera).
    const taxi = g.traffic.cars[0];
    taxi.group.position.set(171, 0, 118);
    taxi.group.rotation.y = Math.PI * 0.5;
    taxi.speed = 0;
    // Pedestrians on both sidewalks ahead of Rook (12 in frame).
    g.peds.peds.forEach((p, i) => {
      if (i >= 12) return;
      const px = i % 2 === 0 ? 171 : 189;
      const pz = 108 + i * 3;
      p.tx = px; p.tz = pz;
      p.group.position.set(px, 0, pz);
    });
    // Two pedestrians lying on the road (fallen in the firefight, no gore):
    // prone across the road (body along X, full 1.8 m silhouette visible
    // from the over-shoulder camera), frozen by the fallen flag.
    [[12, rookAt.x - 3, rookAt.z - 10], [13, rookAt.x + 5, rookAt.z - 12]].forEach(([i, fx, fz]) => {
      const p = g.peds.peds[i];
      if (!p) return;
      p.fallen = true; p.speed = 0; p.tx = fx; p.tz = fz;
      p.group.position.set(fx, 0.32, fz);
      p.group.rotation.set(0, 0, Math.PI / 2);
    });
    g.say('Marla: "Case goes to the marina. Don\'t open it."', 6);
    advance(g, 1.2, IDLE);
    // Firefight LAST (after every advance) so the muzzle flashes are fresh
    // and bright at the screenshot instead of faded out.
    g.shoot(); // Rook's muzzle flash in the frame
    // Return fire from two officers + tracers + sparks on the roadblock car.
    g.effects.muzzleFlash(rookAt.x - 8, 1.4, rookAt.z - 13);
    g.effects.muzzleFlash(rookAt.x + 8, 1.4, rookAt.z - 15);
    g.effects.tracer(rookAt.x, 1.4, rookAt.z - 3, rookAt.x - 8, 1.4, rookAt.z - 13);
    g.effects.tracer(rookAt.x - 8, 1.4, rookAt.z - 13, rookAt.x - 1, 1.2, rookAt.z - 4);
    g.effects.tracer(rookAt.x + 8, 1.4, rookAt.z - 15, rookAt.x + 1, 1.2, rookAt.z - 5);
    g.effects.sparks(rookAt.x + 3, 1.2, rookAt.z - 26, 10);
    g.effects.spawnSmoke(rookAt.x, 1.2, rookAt.z - 10, 1.2, 0.9, 0xffd98a);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'pier') {
    // STREET-LEVEL at the end of the pier, looking back at the skyline at
    // sunset. Sea + sun glitter in the foreground, boats with wakes, planks /
    // posts / rails / lamps on the pier, 16 pedestrians. Round 9: the HERO
    // stands on foot in the LEFT third facing the sea, the GT parked beside
    // him — and everyone stands ON the deck (its top is y=1.1), feet and
    // legs visible, not sunk into it.
    g.setTimeOfDay('sunset');
    g.setMission(5); // High Tide: meet the boat at the pier
    // Rook on foot on the pier, FACING THE SEA (south, toward the camera),
    // LEFT third and CLOSE (7 m from the lens, so he is large and clearly
    // the hero, not one of the crowd). setHero puts Rook at (x-3, z+2);
    // (185,228) lands him at (182,230) — 30° left of the camera axis.
    g.setHero(185, 228, 0, false);
    g.rook.group.position.y = 1.1; // pier deck top
    g.setCamMode('pier');
    g.setWanted(0);
    // The GT parked on the deck beside Rook (4 m east, 4 m behind him).
    g.heroCar.group.position.set(186, 1.1, 226);
    g.heroCar.group.rotation.y = Math.PI;
    // Crowd the pier deck (rows start 10 m north of Rook so nobody blocks
    // him) and the beach with pedestrians — 20 on the pier (feet ON the
    // deck), 4 on the beach.
    g.peds.peds.forEach((p, i) => {
      let px; let pz; let py = 0;
      if (i < 20) { px = 181.5 + (i % 4) * 2.4; pz = 218 - Math.floor(i / 4) * 13; py = 1.1; p.speed = 0; }
      else { px = 196 + ((i - 20) % 4) * 4; pz = 165 + Math.floor((i - 20) / 4) * 12; }
      p.tx = px; p.tz = pz;
      p.group.position.set(px, py, pz);
    });
    g.say('Marla: "Boat\'s at the pier end. Tide waits for nobody."', 6);
    advance(g, 1.5, IDLE);
    return { screen: SCREEN_PLAY };
  }
  // Unknown shot name: fall back to the title card.
  return stageShot('title', g);
}
