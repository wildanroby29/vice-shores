// Missions: Rook's 8 numbered jobs for the fixer Marla. Each job has a name,
// an act, a place, a payout, an objective and a line of dialogue. The marker
// is a glowing beacon in the world and on the minimap; reaching it completes
// the job, pays out, and advances the story. Free roam follows job 8.
import { S, JOBS, BOULEVARD_X, PIER_Z, GARAGE, SAFEHOUSE, RANK_RP, rankFor } from './config.js';
import { audio } from './audio.js';
import { addHeat } from './police.js';

const SPOTS = {
  pier: { x: BOULEVARD_X + 8, z: PIER_Z, label: 'PIER' },
  palmRow: { x: BOULEVARD_X - 12, z: 52, label: 'PALM ROW' },
  neonRow: { x: -52, z: 0, label: 'NEON ROW' },
  market: { x: BOULEVARD_X - 26, z: -52, label: 'MARKET' },
  marina: { x: BOULEVARD_X + 30, z: PIER_Z + 40, label: 'MARINA' },
  garage: { x: GARAGE.x - 14, z: GARAGE.z, label: 'DOCKSIDE CUSTOMS' },
  boulevard: { x: BOULEVARD_X, z: -104, label: 'SUNSET BOULEVARD' },
  bank: { x: -52, z: -104, label: 'SHORE BANK' },
  safehouse: { x: SAFEHOUSE.x, z: SAFEHOUSE.z, label: 'SAFEHOUSE' },
};

const JOB_SPOTS = [SPOTS.pier, SPOTS.palmRow, SPOTS.neonRow, SPOTS.market, SPOTS.marina, SPOTS.garage, SPOTS.boulevard, SPOTS.bank];

let beacon = null;

export function currentJob() { return JOBS[S.jobIndex] || null; }

export function startJob(scene) {
  const job = currentJob();
  if (!job) { S.marker = null; return; }
  const spot = JOB_SPOTS[S.jobIndex];
  S.marker = { x: spot.x, z: spot.z, label: spot.label };
  S.jobDone = false;
  S.jobTimer = 0;
  S.heatTimer = 0;
  S.dialogue = `Marla: ${job.line}`;
  S.dialogueTimer = 8;
  if (!beacon) {
    beacon = new THREE.Group();
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 42, 10, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffc93c, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false }));
    beam.position.y = 21; beacon.add(beam);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.22, 8, 24),
      new THREE.MeshBasicMaterial({ color: 0xffc93c }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 0.3; beacon.add(ring);
    scene.add(beacon);
  }
  beacon.position.set(spot.x, 0, spot.z);
  beacon.visible = true;
}

export function completeJob(scene) {
  const job = currentJob();
  if (!job || S.jobDone) return;
  S.jobDone = true;
  S.money += job.pay;
  S.respect += job.pay;
  S.dialogue = `Marla: Job done. $${job.pay} is yours, Rook.`;
  S.dialogueTimer = 6;
  audio.jingle();
  if (beacon) beacon.visible = false;
  S.jobIndex += 1;
  if (currentJob()) startJob(scene);
  else {
    S.marker = null;
    S.dialogue = 'Marla: That is all eight jobs, Rook. The city is yours now — free roam.';
    S.dialogueTimer = 10;
  }
}

export function updateMissions(scene, dt, playerPos) {
  const job = currentJob();
  if (!job || S.jobDone) return;
  S.jobTimer += dt;
  const spot = JOB_SPOTS[S.jobIndex];
  const d = Math.hypot(playerPos.x - spot.x, playerPos.z - spot.z);
  // Job 3 is "lose the heat": complete when wanted drops to 0 after having it.
  if (job.id === 3) {
    if (S.wanted > 0) S.heatTimer = 0;
    else if (S.jobTimer > 5) { completeJob(scene); return; }
  }
  // Job 7 is "survive 60s at 4+ stars".
  if (job.id === 7) {
    if (S.wanted >= 4) S.heatTimer += dt;
    if (S.heatTimer >= 60) { completeJob(scene); return; }
  }
  // Job 5 is a timed race to the marina.
  if (job.id === 5 && S.jobTimer > 90) {
    S.dialogue = 'Marla: Too slow, Rook. The marina job is off — try the next one.';
    S.dialogueTimer = 6;
    S.jobIndex += 1;
    if (currentJob()) startJob(scene);
    return;
  }
  if (d < 6) completeJob(scene);
  if (beacon) beacon.rotation.y += dt * 1.5;
}

export function rankProgress() {
  const r = rankFor(S.respect);
  const next = RANK_RP[r + 1] || RANK_RP[RANK_RP.length - 1];
  const prev = RANK_RP[r];
  return { rank: r, pct: next === prev ? 100 : Math.round(((S.respect - prev) / (next - prev)) * 100) };
}
