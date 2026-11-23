// Vice Shores — missions and story. Rook runs 8 numbered jobs for the
// fixer Marla: each job has a name, an act, an objective, a payout, a place
// and a line of dialogue. A glowing beacon marks the current objective.
// three.js is loaded by the page as a classic script (game/vendor/three.min.js),
// so the modules read it from the window global instead of importing the UMD
// build (an ES-module import of a UMD file yields an empty namespace).
const THREE = window.THREE;
import { JOBS } from './config.js';

export function makeBeacon(scene) {
  // A tall glowing pillar + a floating diamond marker.
  const g = new THREE.Group();
  const pillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 40, 10, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd21f, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false })
  );
  pillar.position.y = 20;
  g.add(pillar);
  const gem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.9),
    new THREE.MeshBasicMaterial({ color: 0xffe95e })
  );
  gem.position.y = 6;
  g.add(gem);
  g.userData.gem = gem;
  g.visible = false;
  scene.add(g);
  return g;
}

export function animateBeacon(beacon, t) {
  if (!beacon.visible) return;
  beacon.userData.gem.rotation.y = t * 1.6;
  beacon.userData.gem.position.y = 6 + Math.sin(t * 2) * 0.5;
}

// Job targets: where each job sends the player.
export const JOB_SPOTS = [
  { x: -52, z: 10 },   // pier
  { x: -46, z: 30 },   // boulevard cab
  { x: 10, z: -60 },   // Neon Row
  { x: -30, z: -20 },  // market
  { x: 18, z: 88 },    // Dockside Customs
  { x: -46, z: 60 },   // boulevard
  { x: -46, z: 0 },    // boulevard heat
  { x: -52, z: 10 },   // pier finale
];

export function currentJob(state) {
  return JOBS[Math.min(state.jobIndex, JOBS.length - 1)];
}

export function completeJob(state) {
  const job = currentJob(state);
  state.money += job.payout;
  state.jobDone += 1;
  state.respect = Math.min(100, state.respect + 12);
  state.jobIndex = Math.min(state.jobIndex + 1, JOBS.length - 1);
  return job;
}

export function jobDialogue(state) {
  return currentJob(state).say;
}
