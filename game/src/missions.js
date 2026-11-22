// Missions: Rook's 8 numbered jobs for the fixer Marla. Each job has a name,
// an act, a payout, a location, stages with map markers, and a short dialogue
// line from Marla. After job 8 the city is free roam. The HUD reads this
// module for the job panel; render3d reads the current marker.

export const JOBS = [
  {
    id: 1,
    name: 'FIRST GEAR',
    act: 'ACT I — THE NEW DRIVER',
    payout: 250,
    location: 'Kumala Strand',
    marla: 'Rook. You drive, I pay. Pick up the package at the pier and bring it to the garage — no police, no questions.',
    stages: [
      { id: 'pickup', text: 'Drive to the pier and collect the package', kind: 'go', marker: 'PIER' },
      { id: 'deliver', text: 'Deliver the package to the garage on Palm Row', kind: 'go', marker: 'GARAGE' },
    ],
  },
  {
    id: 2,
    name: 'HOT WHEELS',
    act: 'ACT I — THE NEW DRIVER',
    payout: 400,
    location: 'Palm Row',
    marla: 'Somebody left a Sunline Cab running on Palm Row. Take it. If the driver complains, that is his problem.',
    stages: [
      { id: 'steal', text: 'Steal a taxi on Palm Row', kind: 'steal', marker: 'TAXI' },
      { id: 'deliver', text: 'Deliver the taxi to the garage', kind: 'go', marker: 'GARAGE' },
    ],
  },
  {
    id: 3,
    name: 'NEON RUN',
    act: 'ACT I — THE NEW DRIVER',
    payout: 550,
    location: 'Neon Row',
    marla: 'Three drops, one night, Neon Row. The streetlights are your friends — the cops are not. Keep it moving.',
    stages: [
      { id: 'drop1', text: 'Drop 1: the noodle stand on Neon Row', kind: 'go', marker: 'NEON 1' },
      { id: 'drop2', text: 'Drop 2: the arcade on Neon Row', kind: 'go', marker: 'NEON 2' },
      { id: 'drop3', text: 'Drop 3: the hotel on Neon Row', kind: 'go', marker: 'NEON 3' },
    ],
  },
  {
    id: 4,
    name: 'MARKET SQUEEZE',
    act: 'ACT II — THE RISING WHEELMAN',
    payout: 700,
    location: 'Kumala Market',
    marla: 'The market owes me a debt and it is past due. Collect the envelope from the stall by the fountain. Smile while you do it.',
    stages: [
      { id: 'collect', text: 'Collect the envelope at Kumala Market', kind: 'go', marker: 'MARKET' },
      { id: 'escape', text: 'Lose any police and return to the safehouse', kind: 'escape', marker: 'SAFEHOUSE' },
    ],
  },
  {
    id: 5,
    name: 'BRIDGE BURNER',
    act: 'ACT II — THE RISING WHEELMAN',
    payout: 900,
    location: 'Sunset Bridge',
    marla: 'A rival crew is crossing Sunset Bridge at dusk. Beat them to the other side and show them whose city this is.',
    stages: [
      { id: 'race', text: 'Race across Sunset Bridge before the rival crew', kind: 'race', marker: 'BRIDGE' },
      { id: 'deliver', text: 'Deliver the rival\'s package to the garage', kind: 'go', marker: 'GARAGE' },
    ],
  },
  {
    id: 6,
    name: 'THE GETAWAY',
    act: 'ACT II — THE RISING WHEELMAN',
    payout: 1100,
    location: 'VSPD HQ',
    marla: 'My driver is sitting in a holding cell two blocks from VSPD HQ. Get him out. Expect stars. Expect noise.',
    stages: [
      { id: 'rescue', text: 'Reach the holding cell and free the driver', kind: 'go', marker: 'CELL' },
      { id: 'escape', text: 'Escape the police and bring him to the safehouse', kind: 'escape', marker: 'SAFEHOUSE' },
    ],
  },
  {
    id: 7,
    name: 'GOLDEN HOUR',
    act: 'ACT III — THE FIXER\'S GAMBIT',
    payout: 1300,
    location: 'Marina Bay',
    marla: 'The yacht at Marina Bay carries a case of gold bars. Take the case, lose the tail, and bring it home before sunset.',
    stages: [
      { id: 'take', text: 'Take the gold case from the yacht at Marina Bay', kind: 'go', marker: 'MARINA' },
      { id: 'escape', text: 'Lose the police and reach the safehouse', kind: 'escape', marker: 'SAFEHOUSE' },
    ],
  },
  {
    id: 8,
    name: 'KING OF THE SHORE',
    act: 'ACT III — THE FIXER\'S GAMBIT',
    payout: 1500,
    location: 'Kumala Strand',
    marla: 'One last job, Rook. The whole city is watching the boulevard tonight. Drive it like you own it — because after this, you do.',
    stages: [
      { id: 'show', text: 'Drive the boulevard at 120 km/h past the crowd', kind: 'drive', marker: 'BOULEVARD' },
      { id: 'finale', text: 'Park at the pier and take the crown', kind: 'go', marker: 'PIER' },
    ],
  },
];

/** A fresh mission state for a new game. */
export function createMissionState() {
  return {
    jobIndex: 0,
    stageIndex: 0,
    done: false,
    completedJobs: [],
    timer: 0,
  };
}

export function currentJob(state) {
  if (state.done) return null;
  return JOBS[state.jobIndex] || null;
}

export function currentStage(state) {
  const job = currentJob(state);
  if (!job) return null;
  return job.stages[state.stageIndex] || null;
}

/** Advance one stage; returns the payout when the job completes, else 0. */
export function advanceStage(state) {
  const job = currentJob(state);
  if (!job) return 0;
  state.stageIndex += 1;
  if (state.stageIndex >= job.stages.length) {
    state.completedJobs.push(job.id);
    state.jobIndex += 1;
    state.stageIndex = 0;
    if (state.jobIndex >= JOBS.length) {
      state.done = true;
      return job.payout;
    }
    return job.payout;
  }
  return 0;
}

/** The job-panel text the HUD shows. */
export function jobPanelText(state) {
  const job = currentJob(state);
  if (!job) {
    return {
      title: 'FREE ROAM — ALL 8 JOBS DONE',
      objective: 'The city is yours, Rook. Cruise the boulevard, upgrade the GT, outrun the law.',
      payout: '—',
      jobLabel: '8/8',
    };
  }
  const stage = currentStage(state);
  return {
    title: `JOB ${job.id}/8 · ${job.name}`,
    objective: stage ? stage.text : job.marla,
    payout: `$${job.payout}`,
    jobLabel: `${job.id}/8`,
    act: job.act,
    location: job.location,
    marla: job.marla,
  };
}

/** Respect/rank ladder from completed jobs. */
export function rankFor(completedCount) {
  if (completedCount <= 1) return 'NOBODY';
  if (completedCount <= 3) return 'HUSTLER';
  if (completedCount <= 5) return 'WHEELMAN';
  if (completedCount <= 7) return 'FIXER';
  return 'BOSS';
}

export function respectPercent(completedCount) {
  return Math.round((completedCount / JOBS.length) * 100);
}
