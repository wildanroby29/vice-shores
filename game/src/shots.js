// Vice Shores (3D) — the four staged screenshot scenes, exactly the winners' fixed set:
// (1) a 5-star police chase at speed with a helicopter spotlight, ramming police and fire;
// (2) on-foot combat / carjacking with pedestrians; (3) the title/menu with save slots;
// (4) the garage / upgrade shop. Each stage sets up real game state, then the main loop
// runs the simulation forward so the shot is a live render, not a still.

import { SPOTS } from './city.js';

function clearCorridor(world, x0, z0, x1, z1) {
  // Move traffic cars out of the chase corridor so the player car has a clear run.
  for (const c of world.state.cars) {
    if (c.kind !== 'traffic') continue;
    if (c.x > x0 && c.x < x1 && c.z > z0 && c.z < z1) {
      c.x = 780;
      c.z = 300 + ((c.id * 97) % 1200);
      c.speed = 0;
    }
  }
}

function baseSetup(world, opts) {
  const d = world.debug;
  d.setMoney(opts.money || 0);
  d.setClock(opts.clock || 18 * 60 + 45);
  d.setRadio(opts.radio || 0);
  d.setHealth(opts.health || 100, opts.armor || 0);
  d.setAmmo(opts.pistol || 24, opts.smg || 0);
  d.setWeapon(opts.weapon === undefined ? 1 : opts.weapon);
  if (opts.dialogue) d.setDialogue(opts.dialogue, 30);
}

export const SHOTS = {
  '1-chase': {
    label: '5-star police chase',
    stage(world) {
      const s = world.state;
      const d = world.debug;
      baseSetup(world, {
        money: 3400, clock: 19 * 60 + 5, radio: 0,
        health: 100, armor: 75, pistol: 36, smg: 60, weapon: 1,
        dialogue: 'Marla: "Five stars, Rook. Sixty seconds. Make them remember you."',
      });
      d.setMission(7, 1);
      s.surviveTimer = 45;
      // The player in the blue coupe, eastbound on the beachfront boulevard at speed.
      const coupe = s.cars.find((c) => c.mission === 'coupe');
      d.placePlayerInCar(coupe, 500, 1500, 0);
      d.setPlayerCarSpeed(460); // 115 km/h
      d.setCruise(460); // hold the speed — no input in a staged shot
      coupe.health = 82;
      d.setWanted(5);
      // Helicopter ahead of the player, frozen in the frame so its spotlight
      // reads (it follows the player in real play; here it is staged).
      d.spawnHeliAt(1650, 1450);
      d.freezeHeli();
      // Three police cars ramming: one behind, one alongside, one ahead.
      const p1 = d.spawnPoliceAt(370, 1500, 0);
      p1.speed = 480;
      const p2 = d.spawnPoliceAt(640, 1430, 0);
      p2.speed = 470;
      const p3 = d.spawnPoliceAt(830, 1570, 0);
      p3.speed = 450;
      // A wrecked police car burning on the shoulder ahead of the player, so the
      // fire reads in the frame.
      d.wreckPoliceAt(1560, 1440);
      // A roadblock ahead on the boulevard (far enough that the player reaches it
      // just after the screenshot is taken).
      d.setRoadblockAt(1800, 1500, 'h');
      // Clear the chase corridor of traffic, then freeze the rest in place.
      clearCorridor(world, 350, 1420, 1900, 1580);
      d.freezeTraffic();
      s.screen = 'play';
    },
  },

  '2-onfoot': {
    label: 'On-foot carjacking',
    stage(world) {
      const s = world.state;
      const d = world.debug;
      baseSetup(world, {
        money: 850, clock: 18 * 60 + 45, radio: 1,
        health: 88, armor: 0, pistol: 18, smg: 0, weapon: 1,
        dialogue: 'Marla: "Package in Palm Park. The pier, quick — and the cops are already watching."',
      });
      d.setMission(1, 0);
      // The player on foot at the intersection, facing the taxi he is carjacking.
      d.placePlayer(760, 700, 0);
      const taxi = s.cars.find((c) => c.name === 'Taxi' && c.kind === 'parked') || s.cars[2];
      taxi.x = 830;
      taxi.z = 700;
      taxi.angle = 0;
      taxi.kind = 'parked';
      taxi.driver = false;
      taxi.health = 10000; // the player is shooting at it — it must not blow up mid-shot
      // The driver, ejected, running away — and two more pedestrians fleeing.
      s.peds.push(
        { x: 870, z: 660, angle: 0, speed: 175, state: 'flee', color: 0xffd76a, walkPhase: 1, target: null, down: 0 },
        { x: 720, z: 760, angle: 2.4, speed: 175, state: 'flee', color: 0x7ad8ff, walkPhase: 2, target: null, down: 0 },
        { x: 800, z: 640, angle: -1.2, speed: 175, state: 'flee', color: 0xff7a9a, walkPhase: 3, target: null, down: 0 },
      );
      // One police car closing in (wanted 1).
      const cop = d.spawnPoliceAt(560, 700, 0);
      cop.speed = 320;
      d.setWanted(1);
      // The player is shooting at the taxi — lock the aim on it.
      d.setAimLock(taxi.x, taxi.z);
      d.setShooting(true);
      d.freezeTraffic();
      s.screen = 'play';
    },
  },

  '3-title': {
    label: 'Title screen with save slots',
    stage(world) {
      const d = world.debug;
      d.seedSlots();
      d.showTitle();
    },
  },

  '4-garage': {
    label: 'Garage / upgrade shop',
    stage(world) {
      const s = world.state;
      const d = world.debug;
      baseSetup(world, {
        money: 2100, clock: 19 * 60 + 20, radio: 2,
        health: 100, armor: 50, pistol: 24, smg: 0, weapon: 1,
      });
      d.setMission(4, 1);
      // The player in the red sports car, parked on the road in front of Marla's
      // garage (south of the garage building, not inside it).
      const sport = s.cars.find((c) => c.mission === 'sport');
      d.placePlayerInCar(sport, 1500, 720, -Math.PI / 2);
      sport.health = 64;
      d.openGarage();
    },
  },
};

export function stageShot(world, name) {
  const shot = SHOTS[name];
  if (!shot) throw new Error(`unknown shot: ${name}`);
  shot.stage(world);
  return shot;
}
