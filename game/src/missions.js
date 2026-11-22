// The story: Rook, a new driver in Vice Shores, runs jobs for the fixer
// Marla. Three missions with on-screen objectives and map markers; each
// pays out, and the third ends the story and opens free roam.
import { MISSIONS } from './config.js';

export const MISSION_STATE = {
  IDLE: 'idle',
  ACTIVE: 'active',
  DONE: 'done',
};

export function createMissions() {
  return {
    index: 0, // which mission is current (0-based); 3 means the story is done
    step: 'goto', // goto | pickup | deliver | escape
    banner: null, // { text, timer } shown after a mission completes
    bannerTimer: 0,
  };
}

export function currentMission(missions) {
  return missions.index < MISSIONS.length ? MISSIONS[missions.index] : null;
}

/** The objective line the HUD shows for the current mission. */
export function objectiveText(missions) {
  const mission = currentMission(missions);
  if (!mission) return 'All jobs done — free roam. Have fun in Vice Shores.';
  if (missions.step === 'pickup') return `${mission.name}: pick up the package in Palm Park (E).`;
  if (missions.step === 'deliver') return `${mission.name}: deliver the package to the pier — the cops are watching.`;
  if (missions.step === 'escape') return `${mission.name}: lose the heat and reach the safehouse.`;
  return `${mission.name}: ${mission.text}`;
}

/** The map marker for the current objective (null when there is none). */
export function objectiveMarker(missions) {
  const mission = currentMission(missions);
  if (!mission) return null;
  if ((missions.step === 'goto' || missions.step === 'pickup') && mission.pickup) return mission.pickup;
  return mission.marker;
}

/** Start the current mission fresh (called on a new game). */
export function startMissions(missions) {
  missions.index = 0;
  missions.step = 'goto';
  missions.banner = null;
  missions.bannerTimer = 0;
}

/**
 * Advance the mission state. `world` carries the player, wanted level and
 * events. Returns true when a mission just completed.
 */
export function stepMissions(missions, world, dt) {
  if (missions.bannerTimer > 0) {
    missions.bannerTimer -= dt;
    if (missions.bannerTimer <= 0) missions.banner = null;
  }
  const mission = currentMission(missions);
  if (!mission) return false;
  const player = world.player;
  const px = player.inCar && player.car ? player.car.x : player.x;
  const py = player.inCar && player.car ? player.car.y : player.y;

  if (missions.step === 'goto') {
    // With a pickup, the first leg is to the pickup point; otherwise the
    // marker itself is the goal.
    const goal = mission.pickup || mission.marker;
    if (Math.hypot(px - goal.x, py - goal.y) < 70) {
      if (mission.pickup) {
        missions.step = 'pickup';
      } else {
        return completeMission(missions, world);
      }
    }
  } else if (missions.step === 'pickup') {
    if (world.justPickedUp) {
      world.justPickedUp = false;
      missions.step = 'deliver';
      world.wanted = Math.max(world.wanted, 1);
      world.events.push({ type: 'wanted', stars: world.wanted });
    }
  } else if (missions.step === 'deliver') {
    if (Math.hypot(px - mission.marker.x, py - mission.marker.y) < 70) {
      return completeMission(missions, world);
    }
  } else if (missions.step === 'escape') {
    if (Math.hypot(px - mission.marker.x, py - mission.marker.y) < 80) {
      world.wanted = 0;
      return completeMission(missions, world);
    }
  }
  return false;
}

function completeMission(missions, world) {
  const mission = currentMission(missions);
  world.money += mission.payout;
  world.events.push({ type: 'mission', name: mission.name, payout: mission.payout });
  missions.banner = `${mission.name} complete — +$${mission.payout}`;
  missions.bannerTimer = 3;
  missions.index += 1;
  if (missions.index < MISSIONS.length) {
    const next = MISSIONS[missions.index];
    missions.step = next.pickup ? 'goto' : 'goto';
    // Mission 3 starts hot: two stars the moment it begins.
    if (next.id === 3) {
      world.wanted = 2;
      missions.step = 'escape';
      world.events.push({ type: 'wanted', stars: 2 });
    }
  } else {
    missions.step = 'goto';
  }
  world.saveDirty = true;
  return true;
}
