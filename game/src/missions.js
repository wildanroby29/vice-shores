// Rook's story: eight numbered jobs for the fixer Marla. Each job has a beacon in
// the world, an objective, and a payout. The module tracks progress and reports
// what the HUD should show.
import { JOBS } from './config.js';

export function createMissions(THREE, scene) {
  // The beacon: a tall golden pillar of light plus a floating diamond marker.
  const beaconMat = new THREE.MeshBasicMaterial({ color: 0xffd21f, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false });
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 30, 12, 1, true), beaconMat);
  beacon.position.y = 15;
  scene.add(beacon);
  const diamondMat = new THREE.MeshBasicMaterial({ color: 0xffd21f });
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.9), diamondMat);
  diamond.position.y = 4.5;
  scene.add(diamond);
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xffd21f, transparent: true, opacity: 0.7, side: THREE.DoubleSide, depthWrite: false });
  const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 3.0, 24), ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.12;
  scene.add(ring);

  let current = 0;
  let collectCount = 0;
  let surviveTimer = 0;

  function placeFor(jobIndex) {
    const job = JOBS[jobIndex];
    if (!job) return;
    beacon.position.x = job.target.x;
    beacon.position.z = job.target.z;
    diamond.position.x = job.target.x;
    diamond.position.z = job.target.z;
    ring.position.x = job.target.x;
    ring.position.z = job.target.z;
    beacon.visible = true;
    diamond.visible = true;
    ring.visible = true;
  }

  function hide() {
    beacon.visible = false;
    diamond.visible = false;
    ring.visible = false;
  }

  return {
    get current() { return current; },
    get collectCount() { return collectCount; },
    placeFor,
    hide,
    start(jobIndex) {
      current = jobIndex;
      collectCount = 0;
      surviveTimer = 0;
      placeFor(jobIndex);
    },
    // Called every step with the player's position and state; returns 'done' |
    // 'progress' | null. `ctx` carries the live state the job needs.
    update(dt, t, px, pz, state) {
      const job = JOBS[current];
      if (!job) return null;
      diamond.rotation.y = t * 1.5;
      diamond.position.y = 4.5 + Math.sin(t * 2) * 0.4;
      ring.scale.setScalar(1 + Math.sin(t * 3) * 0.12);
      const dx = px - job.target.x;
      const dz = pz - job.target.z;
      const dist = Math.hypot(dx, dz);
      if (job.kind === 'survive') {
        surviveTimer += dt;
        state.jobProgress = Math.min(1, surviveTimer / 60);
        if (state.wanted >= 4 && surviveTimer >= 60) return 'done';
        return 'progress';
      }
      if (job.kind === 'collect') {
        // Three drops along the boulevard: the beacon walks to the next drop.
        if (dist < 4) {
          collectCount += 1;
          state.jobProgress = collectCount / 3;
          if (collectCount >= 3) return 'done';
          const drops = [{ x: -52, z: -30 }, { x: -52, z: 30 }, { x: -52, z: 60 }];
          const next = drops[Math.min(collectCount, 2)];
          beacon.position.x = next.x;
          beacon.position.z = next.z;
          diamond.position.x = next.x;
          diamond.position.z = next.z;
          ring.position.x = next.x;
          ring.position.z = next.z;
          return 'progress';
        }
        return null;
      }
      if (dist < 4) {
        state.jobProgress = 1;
        return 'done';
      }
      return null;
    },
    complete(state) {
      const job = JOBS[current];
      if (!job) return 0;
      state.jobDone[current] = true;
      state.money += job.payout;
      state.respect += 400 + job.payout;
      current = Math.min(JOBS.length - 1, current + 1);
      if (current < JOBS.length && !JOBS.slice(0, current).every((_, i) => state.jobDone[i])) {
        // All jobs done: free roam.
      }
      if (state.jobDone.every(Boolean)) {
        hide();
        return job.payout;
      }
      placeFor(current);
      return job.payout;
    },
    job() {
      return JOBS[current];
    },
    allDone(state) {
      return state.jobDone.every(Boolean);
    },
  };
}
