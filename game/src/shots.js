// The screenshot scenes behind ?shot=chase|onfoot|title|garage. Each one stages
// a real moment of the game — an epic crash chase, a police surround, the
// poster title, the airbrush workshop — with CLOSE epic cameras, never a
// distant overview, and a busy city around it. Same seed, same frame.
import { S, BOULEVARD_X, GARAGE, PALETTE } from './config.js';
import { makeCar, setBurning } from './vehicles.js';
import { makePerson } from './people.js';
import { spawnPolice } from './police.js';
import { startJob } from './missions.js';
import { showTitle, showGarage, fillSaveSlots } from './hud.js';

function policeCarAt(scene, x, z, angle) {
  const model = { name: 'VSPD Interceptor', kind: 'sedan', color: 0xf2f2f2, top: 48, len: 4.4 };
  return makeCar(scene, model, x, z, angle, true);
}

// 1-chase: the climax of a 5-star chase — a police car RAMMING the GT, a
// burning wreck, the helicopter beam locked on, traffic and pedestrians.
export function stageChase(ctx) {
  const { scene } = ctx;
  S.mode = 'play';
  S.wanted = 5; S.wantedHeat = 1;
  S.money = 86250; S.respect = 2600;
  S.jobIndex = 6;
  startJob(scene);
  S.dialogue = 'Marla: Five stars, Rook — and the whole city is watching the boulevard. Do not slow down.';
  S.dialogueTimer = 30;
  // The player's GT, mid-boulevard, at speed.
  const gt = makeCar(scene, { name: 'Rukun Pelo GT', kind: 'sports', color: PALETTE.sportsOrange, top: 62, len: 4.6 },
    BOULEVARD_X - 2, 30, 0, false);
  gt.speed = 34; gt.condition = 97;
  S.car = gt; S.inCar = true;
  S.player = { x: gt.x, z: gt.z };
  // The ram: a police car in contact with the GT's rear quarter, sparks.
  // Beside the GT (north side), so the chase camera still sees the GT.
  const rammer = policeCarAt(scene, gt.x - 3, gt.z - 3.5, 0.12);
  rammer.speed = 33; S.police.push(rammer);
  rammer.unit = 'VSPD-23'; rammer.tactic = 'RAMMING'; rammer.dist = 4;
  const flanker = policeCarAt(scene, gt.x + 16, gt.z - 7, -0.3);
  flanker.speed = 30; S.police.push(flanker);
  flanker.unit = 'VSPD-19'; flanker.tactic = 'FLANKING'; flanker.dist = 18;
  const roadblock = policeCarAt(scene, gt.x + 34, gt.z + 2, Math.PI / 2);
  S.roadblocks.push(roadblock);
  roadblock.unit = 'VSPD-12'; roadblock.tactic = 'ROADBLOCK';
  // Two burning wrecks ahead of the GT, in frame, fire and smoke visible.
  const wreck = makeCar(scene, { name: 'Coral Coupe', kind: 'coupe', color: 0xe87a5d, top: 44, len: 4.2 },
    gt.x + 14, gt.z + 7, 0.5, false);
  setBurning(scene, wreck);
  wreck.mesh.rotation.y = 0.5; wreck.mesh.rotation.z = 0.08;
  const wreck2 = makeCar(scene, { name: 'Palm Sedan', kind: 'sedan', color: 0x4d7ea8, top: 40, len: 4.4 },
    gt.x + 24, gt.z - 6, -0.4, false);
  setBurning(scene, wreck2);
  // Helicopter above and ahead, beam on the GT — lowered so it is in frame.
  spawnPolice(scene, { x: gt.x, z: gt.z });
  if (S.heli) { S.heli.x = gt.x + 18; S.heli.z = gt.z - 8; S.heli.y = 13; }
  // Traffic and pedestrians so the boulevard is alive.
  for (const c of ctx.traffic) { if (Math.abs(c.z - 30) > 60) continue; }
  ctx.camera = 'chase';
  ctx.focus = gt;
}

// 2-onfoot: Rook surrounded — police officers closing in from three sides, a
// carjacking in progress (the yellow cab, door open, driver out), a busy street.
export function stageOnfoot(ctx) {
  const { scene } = ctx;
  S.mode = 'play';
  S.wanted = 2; S.wantedHeat = 0.4;
  S.money = 6420; S.respect = 320;
  S.jobIndex = 1;
  startJob(scene);
  S.dialogue = 'Marla: That cab on Palm Row is yours, Rook. Take it — the driver already knows the drill.';
  S.dialogueTimer = 30;
  const px = 90, pz = 30; // on the road, looking east down the street
  const rook = makePerson(scene, px, pz, 0, {
    isPlayer: true, height: 1.82, shirt: PALETTE.playerJacket, jacketTrim: 0xffffff, cap: 0x1a1a1a,
  });
  S.player = rook; S.inCar = false;
  // The carjacking: the yellow cab, door open, its driver stepping out.
  const cab = makeCar(scene, { name: 'Sunline Cab', kind: 'taxi', color: PALETTE.taxiYellow, top: 42, len: 4.4 },
    px + 6, pz, 0, false);
  const driver = makePerson(scene, px + 8.5, pz + 1.5, Math.PI / 2, { shirt: 0xf2c94c });
  driver.speed = 1.4;
  // Police closing in: two cars and three officers on foot.
  const p1 = policeCarAt(scene, px + 12, pz, 0);
  p1.unit = 'VSPD-07'; p1.tactic = 'RAMMING'; p1.dist = 22; S.police.push(p1);
  const p2 = policeCarAt(scene, px - 8, pz, 0);
  p2.unit = 'VSPD-31'; p2.tactic = 'FLANKING'; p2.dist = 27; S.police.push(p2);
  const offs = [[px + 4, pz - 4], [px + 4, pz + 4], [px - 2, pz + 6]];
  for (const [ox, oz] of offs) {
    const off = makePerson(scene, ox, oz, Math.atan2(-(pz - oz), px - ox), {
      shirt: 0x1d4ed8, pants: 0x1a1a1a, cap: 0x1d4ed8,
    });
    off.speed = 2.4;
    ctx.officers = ctx.officers || [];
    ctx.officers.push(off);
  }
  // A crowd: extra pedestrians clustered around the action.
  for (let i = 0; i < 10; i += 1) {
    const a = (i / 10) * Math.PI * 2;
    const ped = makePerson(scene, px + Math.cos(a) * (10 + (i % 3) * 4), pz + Math.sin(a) * (10 + (i % 3) * 4), a, {});
    ped.speed = 1.6;
    S.peds.push(ped);
  }
  // Close over-the-shoulder camera, straight down the road — no palm in
  // the line of sight, the cab and the closing police dead ahead.
  ctx.shotCam = { pos: [px - 4, 2.2, pz + 1.2], look: [px + 6, 1.4, pz - 0.5] };
  ctx.camera = 'foot';
  ctx.focus = rook;
}

// 3-title: the poster title over the bright city.
export function stageTitle(ctx) {
  const { scene } = ctx;
  S.mode = 'title';
  S.money = 12650; S.respect = 2600;
  fillSaveSlots();
  showTitle();
  ctx.camera = 'title';
}

// 4-garage: the GT on the lift inside Dockside Customs, mid airbrush paint.
export function stageGarage(ctx) {
  const { scene } = ctx;
  S.mode = 'garage';
  S.money = 12650; S.respect = 2600;
  const spot = ctx.workshop.carSpot;
  const gt = makeCar(scene, { name: 'Rukun Pelo GT', kind: 'sports', color: 0xe85d04, top: 62, len: 4.6 },
    spot.x, spot.z, spot.angle, false);
  gt.condition = 72;
  gt.mesh.position.y = 1.1; // on the lift
  S.car = gt; S.inCar = false;
  S.player = { x: spot.x + 6, z: spot.z };
  // The painter, spray gun in hand, right at the car's flank — close enough
  // that the spray mist reads as paint going onto the car.
  const painter = makePerson(scene, spot.x + 2.2, spot.z + 3.5, Math.PI, {
    shirt: 0x2e86c8, pants: 0x3a3a3a, cap: 0xffc93c,
  });
  painter.mesh.rotation.y = Math.atan2(3.5, -2.2); // facing the car's flank
  ctx.painter = painter;
  showGarage();
  // Side view from the south-east: the car's flank and the painter in the
  // foreground, the lift posts to the sides, never between camera and car.
  ctx.shotCam = { pos: [spot.x + 7.5, 2.4, spot.z + 5.5], look: [spot.x - 1, 1.3, spot.z - 0.5] };
  ctx.camera = 'garage';
  ctx.focus = gt;
}

export function stageShot(name, ctx) {
  if (name === 'chase') stageChase(ctx);
  else if (name === 'onfoot') stageOnfoot(ctx);
  else if (name === 'garage') stageGarage(ctx);
  else stageTitle(ctx);
}
