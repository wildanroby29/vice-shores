// Missions: 8 staged jobs with dialogue, objectives, payouts and NEXT chaining.
export const MISSIONS = [
  { id: 1, title: 'First Wheels', type: 'delivery', payout: 800, place: 'Coral Row', obj: 'Steal the orange GT on Coral Row and bring it to North Garage.', next: 'Meet Deacon at the garage', lines: [['ROOK', 'One car. One garage. That is how every legend in this city starts.'], ['DEACON', 'The GT is parked on Coral Row. Take it. Do not scratch it.']] },
  { id: 2, title: 'Ocean Drive Getaway', type: 'getaway', payout: 1200, place: 'Ocean Drive', obj: 'Lose the 4-star heat on Ocean Drive.', next: 'Deliver the package to the Marina', lines: [['DEACON', 'Four stars, Rook. The whole city is looking for you.'], ['ROOK', 'Then let them look. I know these streets better than they do.']] },
  { id: 3, title: 'Plaza Nights', type: 'shootout', payout: 1500, place: 'Plaza', obj: 'Deal with the two armed dealers in the market.', next: 'Meet Deacon at the stall', lines: [['DEACON', 'Two dealers, both armed, both in the market.'], ['ROOK', 'I see them. This ends tonight.']] },
  { id: 4, title: 'The Marina Drop', type: 'delivery', payout: 1800, place: 'Marina', obj: 'Deliver the package to the boat at the Marina.', next: 'Pick up the next job from Deacon', lines: [['ROOK', 'Package is in the trunk. The boat is waiting.'], ['DEACON', 'No stops, no questions. The Marina, Rook.']] },
  { id: 5, title: 'Bank Job', type: 'ram', payout: 2500, place: 'Bank District', obj: 'Ram the target van in the Bank District until it stops.', next: 'Grab the cash and vanish', lines: [['DEACON', 'The van carries the payroll. Ram it, take it, vanish.'], ['ROOK', 'Consider it done.']] },
  { id: 6, title: 'Pier Lights', type: 'shootout', payout: 3000, place: 'Pier', obj: 'Clear the rival crew off the Pier boardwalk.', next: 'Hold the Pier for the crew', lines: [['ROOK', 'They took our pier. I am taking it back.'], ['DEACON', 'Watch the rooftops. They always post one up high.']] },
  { id: 7, title: 'Coral Row Sweep', type: 'shootout', payout: 3500, place: 'Coral Row', obj: 'Clear the rival crew from Coral Row.', next: 'One last job: the Kingpin run', lines: [['DEACON', 'Coral Row is ours once you sweep it.'], ['ROOK', 'Then it is already ours.']] },
  { id: 8, title: 'Kingpin', type: 'getaway', payout: 5000, place: 'Vice Shores', obj: 'Outrun the 5-star heat and reach the Pier to become Kingpin.', next: 'You own this city now', lines: [['DEACON', 'Five stars, Rook. Survive this and the city is yours.'], ['ROOK', 'Then let them come. All of them.']] },
];
export const RANKS = [
  { name: 'ROOKIE', xp: 0 }, { name: 'HUSTLER', xp: 300 }, { name: 'RUNNER', xp: 700 },
  { name: 'ENFORCER', xp: 1200 }, { name: 'BOSS', xp: 2000 }, { name: 'KINGPIN', xp: 3000 },
];
export class MissionLog {
  constructor() { this.index = 0; this.done = 0; this.money = 0; this.xp = 0; this.ratings = []; }
  current() { return MISSIONS[this.index]; }
  stageText() { return `STAGE ${this.index + 1}/8 — ${this.current().title}`; }
  complete(rating) {
    const m = this.current();
    this.money += m.payout; this.xp += 120; this.done += 1;
    this.ratings.push(rating || 'S');
    if (this.index < MISSIONS.length - 1) this.index += 1;
    return m;
  }
  rank() {
    let r = RANKS[0];
    for (const k of RANKS) if (this.xp >= k.xp) r = k;
    const next = RANKS[RANKS.findIndex(k => k === r) + 1];
    return { name: r.name, cur: this.xp, need: next ? next.xp : this.xp, next: next ? next.name : null };
  }
}
