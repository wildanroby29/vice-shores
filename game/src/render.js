// The canvas renderer: the city at dusk, every entity, the HUD with a live
// minimap, and the title / pause / busted overlays. The camera shows a
// window-sized slice of the world centred on the player.
import { WORLD, STREETS_X, STREETS_Y, ROAD_HALF, BEACH_Y, WATER_Y, RIVER_X, BRIDGE_Y, CAR, PALETTE, FONT, VIEW_MINIMAP } from './config.js';
import { isBeach } from './city.js';
import { SCREEN } from './world.js';
import { objectiveMarker, objectiveText, currentMission } from './missions.js';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCarShape(ctx, car, isPlayer) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  const halfL = CAR.length / 2;
  const halfW = CAR.width / 2;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  roundRect(ctx, -halfL + 3, -halfW + 4, CAR.length, CAR.width, 7);
  ctx.fill();
  ctx.fillStyle = car.color;
  roundRect(ctx, -halfL, -halfW, CAR.length, CAR.width, 7);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  roundRect(ctx, -halfL + 8, -halfW + 3, 12, CAR.width - 6, 4);
  ctx.fill();
  // Windshield and rear window.
  ctx.fillStyle = '#9fd8ef';
  roundRect(ctx, halfL - 16, -halfW + 4, 8, CAR.width - 8, 3);
  ctx.fill();
  ctx.fillStyle = '#2a2f45';
  roundRect(ctx, -halfL + 4, -halfW + 4, 6, CAR.width - 8, 3);
  ctx.fill();
  // Headlights.
  ctx.fillStyle = '#ffe9a3';
  ctx.fillRect(halfL - 2, -halfW + 3, 3, 4);
  ctx.fillRect(halfL - 2, halfW - 7, 3, 4);
  if (isPlayer) {
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 2;
    roundRect(ctx, -halfL - 1, -halfW - 1, CAR.length + 2, CAR.width + 2, 8);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPoliceLights(ctx, car) {
  const flashing = Math.floor(car.sirenPhase * 2) % 2 === 0;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  ctx.fillStyle = flashing ? '#ff3b30' : '#2f7fe0';
  ctx.fillRect(-4, -CAR.width / 2 - 2, 8, 5);
  ctx.fillStyle = flashing ? '#2f7fe0' : '#ff3b30';
  ctx.fillRect(-4, CAR.width / 2 - 3, 8, 5);
  ctx.restore();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    return { width: w, height: h };
  }

  function drawCity(world) {
    const city = world.city;
    // Ground base.
    ctx.fillStyle = '#262633';
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    // Water: sea on the south, river on the east.
    ctx.fillStyle = PALETTE.water;
    ctx.fillRect(0, WATER_Y, WORLD.width, WORLD.height - WATER_Y);
    ctx.fillRect(RIVER_X, 0, WORLD.width - RIVER_X, WORLD.height);
    ctx.fillStyle = PALETTE.waterDeep;
    ctx.fillRect(0, WATER_Y + 40, WORLD.width, WORLD.height - WATER_Y - 40);
    // Beach sand.
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(0, BEACH_Y, RIVER_X, WATER_Y - BEACH_Y);
    ctx.fillStyle = PALETTE.sandDark;
    for (let x = 40; x < RIVER_X; x += 130) {
      ctx.beginPath();
      ctx.arc(x, BEACH_Y + 46, 10, 0, Math.PI * 2);
      ctx.fill();
    }
    // Roads: asphalt bands along every street centreline.
    ctx.fillStyle = PALETTE.asphalt;
    for (const x of STREETS_X) ctx.fillRect(x - ROAD_HALF, 0, ROAD_HALF * 2, BEACH_Y);
    for (const y of STREETS_Y) ctx.fillRect(0, y - ROAD_HALF, WORLD.width, ROAD_HALF * 2);
    // The bridge carries the y=800 road across the river.
    ctx.fillStyle = PALETTE.asphalt;
    ctx.fillRect(RIVER_X, BRIDGE_Y - ROAD_HALF, WORLD.width - RIVER_X, ROAD_HALF * 2);
    ctx.fillStyle = PALETTE.kerb;
    ctx.fillRect(RIVER_X, BRIDGE_Y - ROAD_HALF - 4, WORLD.width - RIVER_X, 4);
    ctx.fillRect(RIVER_X, BRIDGE_Y + ROAD_HALF, WORLD.width - RIVER_X, 4);
    // Lane dashes.
    ctx.strokeStyle = PALETTE.lane;
    ctx.lineWidth = 3;
    ctx.setLineDash([26, 30]);
    ctx.beginPath();
    for (const x of STREETS_X) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, BEACH_Y);
    }
    for (const y of STREETS_Y) {
      ctx.moveTo(0, y);
      ctx.lineTo(WORLD.width, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    // Parks and parking lots.
    for (const park of city.parks) {
      ctx.fillStyle = PALETTE.grass;
      ctx.fillRect(park.x, park.y, park.w, park.h);
      ctx.fillStyle = PALETTE.grassDark;
      ctx.fillRect(park.x + 8, park.y + 8, park.w - 16, park.h - 16);
    }
    for (const lot of city.lots) {
      ctx.fillStyle = '#2c2c3a';
      ctx.fillRect(lot.x, lot.y, lot.w, lot.h);
      ctx.strokeStyle = '#8b93a3';
      ctx.lineWidth = 2;
      for (let x = lot.x + 30; x < lot.x + lot.w - 20; x += 62) {
        ctx.beginPath();
        ctx.moveTo(x - 18, lot.y + 12);
        ctx.lineTo(x - 18, lot.y + 56);
        ctx.moveTo(x + 18, lot.y + 12);
        ctx.lineTo(x + 18, lot.y + 56);
        ctx.stroke();
      }
    }
    // Buildings: roof, walls, lit windows, neon signs.
    for (let i = 0; i < city.buildings.length; i += 1) {
      const b = city.buildings[i];
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x + 6, b.y + 6, b.w - 12, b.h - 12);
      const cols = Math.max(1, Math.floor(b.w / 30));
      const rows = Math.max(1, Math.floor(b.h / 30));
      for (let c = 0; c < cols; c += 1) {
        for (let r = 0; r < rows; r += 1) {
          const lit = (i * 7 + c * 3 + r * 5) % 4 < 2;
          ctx.fillStyle = lit ? PALETTE.windowLit : PALETTE.windowDark;
          ctx.fillRect(b.x + 12 + c * 30, b.y + 12 + r * 30, 14, 14);
        }
      }
      if (b.neon) {
        ctx.save();
        ctx.shadowColor = b.neonColor;
        ctx.shadowBlur = 14;
        ctx.fillStyle = b.neonColor;
        ctx.fillRect(b.x + 10, b.y + b.h - 6, Math.min(b.w - 20, 90), 4);
        ctx.restore();
      }
    }
    // Trees.
    for (const tree of city.trees) {
      ctx.fillStyle = '#1f4d2e';
      ctx.beginPath();
      ctx.arc(tree.x, tree.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3a7a4d';
      ctx.beginPath();
      ctx.arc(tree.x - 3, tree.y - 3, 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawMarker(world, view) {
    const marker = objectiveMarker(world.missions);
    if (!marker) return;
    const pulse = 1 + Math.sin(world.time * 4) * 0.15;
    const x = marker.x;
    const y = marker.y;
    ctx.save();
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 26 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.gold;
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    // A beam so the marker reads from far away.
    ctx.fillStyle = 'rgba(255,210,62,0.12)';
    ctx.fillRect(x - 8, y - 220, 16, 220);
    ctx.restore();
    // Edge arrow when the marker is off screen.
    const cam = world.camera;
    const left = cam.x - view.width / 2;
    const top = cam.y - view.height / 2;
    if (x < left + 20 || x > left + view.width - 20 || y < top + 20 || y > top + view.height - 20) {
      const cx = Math.max(left + 30, Math.min(left + view.width - 30, x));
      const cy = Math.max(top + 30, Math.min(top + view.height - 30, y));
      const angle = Math.atan2(y - cy, x - cx);
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(angle);
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-8, -10);
      ctx.lineTo(-8, 10);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }

  function drawMinimap(world, view) {
    // The minimap scales the whole 2560x1920 city into a 208x156 corner box:
    // water and beach along the edges, roads as grey bands, the gold mission
    // marker, the player as a white arrow, police as red dots.
    const mw = VIEW_MINIMAP.width;
    const mh = VIEW_MINIMAP.height;
    const mx = view.width - mw - 14;
    const my = view.height - mh - 14;
    const sx = mw / WORLD.width;
    const sy = mh / WORLD.height;
    ctx.save();
    ctx.fillStyle = 'rgba(10,8,20,0.85)';
    ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
    ctx.strokeStyle = '#5a5478';
    ctx.lineWidth = 1;
    ctx.strokeRect(mx - 4, my - 4, mw + 8, mh + 8);
    ctx.beginPath();
    ctx.rect(mx, my, mw, mh);
    ctx.clip();
    // Water and beach.
    ctx.fillStyle = '#123a5c';
    ctx.fillRect(mx, my + (WATER_Y * sy), mw, mh - WATER_Y * sy);
    ctx.fillRect(mx + RIVER_X * sx, my, mw - RIVER_X * sx, mh);
    ctx.fillStyle = '#c9a86a';
    ctx.fillRect(mx, my + BEACH_Y * sy, RIVER_X * sx, (WATER_Y - BEACH_Y) * sy);
    // Roads.
    ctx.fillStyle = '#4a4a5c';
    for (const x of STREETS_X) ctx.fillRect(mx + (x - ROAD_HALF) * sx, my, ROAD_HALF * 2 * sx, BEACH_Y * sy);
    for (const y of STREETS_Y) ctx.fillRect(mx, my + (y - ROAD_HALF) * sy, mw, ROAD_HALF * 2 * sy);
    // Parks.
    ctx.fillStyle = '#2e5d3a';
    for (const park of world.city.parks) ctx.fillRect(mx + park.x * sx, my + park.y * sy, park.w * sx, park.h * sy);
    // Mission marker.
    const marker = objectiveMarker(world.missions);
    if (marker) {
      ctx.fillStyle = PALETTE.gold;
      ctx.beginPath();
      ctx.arc(mx + marker.x * sx, my + marker.y * sy, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Traffic as grey dots, police as red dots, player as a white arrow.
    ctx.fillStyle = '#9a94b8';
    for (const car of world.traffic) {
      ctx.fillRect(mx + car.x * sx - 1, my + car.y * sy - 1, 2, 2);
    }
    ctx.fillStyle = '#ff3b30';
    for (const car of world.police.cars) {
      ctx.beginPath();
      ctx.arc(mx + car.x * sx, my + car.y * sy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    const p = world.player.inCar && world.player.car ? world.player.car : world.player;
    ctx.save();
    ctx.translate(mx + p.x * sx, my + p.y * sy);
    ctx.rotate(p.angle);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(6, 0);
    ctx.lineTo(-4, -4);
    ctx.lineTo(-4, 4);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  function drawHud(world, view) {
    const player = world.player;
    ctx.save();
    ctx.font = `600 15px ${FONT}`;
    // Top-left: health bar and money.
    ctx.fillStyle = 'rgba(10,8,20,0.72)';
    roundRect(ctx, 12, 12, 210, 58, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.hudText;
    ctx.fillText('HEALTH', 24, 32);
    ctx.fillStyle = '#2a2a3a';
    ctx.fillRect(90, 20, 110, 14);
    ctx.fillStyle = player.health > 30 ? PALETTE.green : PALETTE.red;
    ctx.fillRect(90, 20, 110 * Math.max(0, player.health / 100), 14);
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `700 18px ${FONT}`;
    ctx.fillText(`$${world.money}`, 24, 58);
    // Top-right: wanted stars.
    ctx.fillStyle = 'rgba(10,8,20,0.72)';
    roundRect(ctx, view.width - 172, 12, 160, 40, 8);
    ctx.fill();
    ctx.font = `700 22px ${FONT}`;
    for (let i = 0; i < 3; i += 1) {
      ctx.fillStyle = i < world.wanted ? PALETTE.gold : '#3a3a4d';
      ctx.fillText('★', view.width - 158 + i * 34, 40);
    }
    ctx.font = `600 12px ${FONT}`;
    ctx.fillStyle = PALETTE.hudMuted;
    ctx.fillText('WANTED', view.width - 158, 62);
    // Top-centre: objective line.
    const objective = objectiveText(world.missions);
    ctx.font = `600 15px ${FONT}`;
    const ow = ctx.measureText(objective).width + 28;
    ctx.fillStyle = 'rgba(10,8,20,0.72)';
    roundRect(ctx, (view.width - ow) / 2, 12, ow, 34, 8);
    ctx.fill();
    ctx.fillStyle = PALETTE.hudText;
    ctx.fillText(objective, (view.width - ow) / 2 + 14, 34);
    // Bottom-left: speed and car health, or on-foot hint.
    ctx.fillStyle = 'rgba(10,8,20,0.72)';
    roundRect(ctx, 12, view.height - 58, 230, 46, 8);
    ctx.fill();
    if (player.inCar && player.car) {
      const mph = Math.round(Math.abs(player.car.speed) * 0.14);
      ctx.fillStyle = PALETTE.hudText;
      ctx.font = `700 22px ${FONT}`;
      ctx.fillText(`${mph} mph`, 24, view.height - 26);
      ctx.fillStyle = '#2a2a3a';
      ctx.fillRect(120, view.height - 40, 100, 10);
      ctx.fillStyle = player.car.health > 30 ? PALETTE.green : PALETTE.red;
      ctx.fillRect(120, view.height - 40, 100 * Math.max(0, player.car.health / 100), 10);
    } else {
      ctx.fillStyle = PALETTE.hudText;
      ctx.font = `600 14px ${FONT}`;
      ctx.fillText('ON FOOT — E near a car to take it', 24, view.height - 28);
    }
    // Mission banner.
    if (world.missions.banner) {
      ctx.font = `700 22px ${FONT}`;
      const bw = ctx.measureText(world.missions.banner).width + 36;
      ctx.fillStyle = 'rgba(20,16,4,0.88)';
      roundRect(ctx, (view.width - bw) / 2, 64, bw, 40, 8);
      ctx.fill();
      ctx.fillStyle = PALETTE.gold;
      ctx.fillText(world.missions.banner, (view.width - bw) / 2 + 18, 91);
    }
    // Help line, fading after the first seconds of play.
    if (world.time < 12) {
      ctx.font = `500 13px ${FONT}`;
      ctx.fillStyle = 'rgba(242,240,255,0.75)';
      ctx.fillText('WASD move / drive · Shift sprint · E enter or steal a car · Space / click shoot · P pause · M mute', 14, view.height - 178);
    }
    drawMinimap(world, view);
    ctx.restore();
  }

  function drawTitle(world, view, hasSave) {
    ctx.save();
    ctx.fillStyle = 'rgba(8,6,18,0.72)';
    ctx.fillRect(0, 0, view.width, view.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.neonPink;
    ctx.font = `800 84px ${FONT}`;
    ctx.shadowColor = PALETTE.neonPink;
    ctx.shadowBlur = 26;
    ctx.fillText('VICE SHORES', view.width / 2, view.height / 2 - 130);
    ctx.shadowBlur = 0;
    ctx.fillStyle = PALETTE.neonCyan;
    ctx.font = `600 22px ${FONT}`;
    ctx.fillText('a neon coastal city — drive it, steal it, outrun it', view.width / 2, view.height / 2 - 92);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = `500 17px ${FONT}`;
    ctx.fillText('Rook is new in town and broke. The fixer Marla has three jobs:', view.width / 2, view.height / 2 - 40);
    ctx.fillText('drive the coupe to Coral Row · grab a hot package at Palm Park · lose a two-star chase to the safehouse.', view.width / 2, view.height / 2 - 14);
    ctx.fillStyle = PALETTE.hudMuted;
    ctx.font = `500 15px ${FONT}`;
    ctx.fillText('WASD move / drive · Shift sprint · E enter or steal a car · Space or click to shoot · P pause · M mute', view.width / 2, view.height / 2 + 30);
    // Buttons: Continue (when a save exists) and New Game.
    const bw = 240;
    const bh = 52;
    const by = view.height / 2 + 70;
    if (hasSave) {
      ctx.fillStyle = PALETTE.neonCyan;
      roundRect(ctx, view.width / 2 - bw - 12, by, bw, bh, 10);
      ctx.fill();
      ctx.fillStyle = '#062a28';
      ctx.font = `700 20px ${FONT}`;
      ctx.fillText('CONTINUE', view.width / 2 - bw / 2 - 12, by + 34);
    }
    ctx.fillStyle = PALETTE.neonPink;
    roundRect(ctx, view.width / 2 + 12, by, bw, bh, 10);
    ctx.fill();
    ctx.fillStyle = '#2a0616';
    ctx.font = `700 20px ${FONT}`;
    ctx.fillText('NEW GAME', view.width / 2 + bw / 2 + 12, by + 34);
    ctx.fillStyle = PALETTE.hudMuted;
    ctx.font = `500 14px ${FONT}`;
    ctx.fillText('or press Space to start', view.width / 2, by + 88);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function drawPaused(view) {
    ctx.save();
    ctx.fillStyle = 'rgba(8,6,18,0.7)';
    ctx.fillRect(0, 0, view.width, view.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = `800 56px ${FONT}`;
    ctx.fillText('PAUSED', view.width / 2, view.height / 2);
    ctx.font = `500 17px ${FONT}`;
    ctx.fillText('P or Esc to keep playing · M to mute', view.width / 2, view.height / 2 + 36);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function drawBusted(world, view) {
    ctx.save();
    ctx.fillStyle = 'rgba(20,4,8,0.72)';
    ctx.fillRect(0, 0, view.width, view.height);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.red;
    ctx.font = `800 72px ${FONT}`;
    ctx.fillText('BUSTED', view.width / 2, view.height / 2 - 10);
    ctx.fillStyle = PALETTE.hudText;
    ctx.font = `500 18px ${FONT}`;
    ctx.fillText(`The Vice Shores police took $${world.lastFine || 0} and dropped you at the safehouse.`, view.width / 2, view.height / 2 + 30);
    ctx.textAlign = 'left';
    ctx.restore();
  }

  function drawWorldEntities(world) {
    // Parked cars.
    for (const car of world.parked) drawCarShape(ctx, car, false);
    // Mission car glows so the first job reads at a glance.
    for (const car of world.parked) {
      if (!car.missionCar) continue;
      ctx.save();
      ctx.strokeStyle = PALETTE.gold;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(car.x, car.y, 34 + Math.sin(world.time * 4) * 3, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // Traffic and police.
    for (const car of world.traffic) drawCarShape(ctx, car, false);
    for (const car of world.police.cars) {
      drawCarShape(ctx, car, false);
      drawPoliceLights(ctx, car);
    }
    // Pedestrians.
    for (const ped of world.peds) {
      ctx.save();
      ctx.translate(ped.x, ped.y);
      if (ped.down) {
        ctx.rotate(ped.angle + Math.PI / 2);
        ctx.fillStyle = '#8a8a9a';
        ctx.beginPath();
        ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.arc(2, 3, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = ped.color;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#f2c9a0';
        ctx.beginPath();
        ctx.arc(Math.cos(ped.angle) * 3, Math.sin(ped.angle) * 3, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    // Bullets.
    ctx.fillStyle = '#ffe9a3';
    for (const b of world.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    // The player: on foot a teal walker, in a car the gold-trimmed car.
    const player = world.player;
    if (player.inCar && player.car) {
      drawCarShape(ctx, player.car, true);
    } else {
      ctx.save();
      ctx.translate(player.x, player.y);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, 15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = PALETTE.player;
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0e2a28';
      ctx.beginPath();
      ctx.arc(Math.cos(player.angle) * 5, Math.sin(player.angle) * 5, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Package pickup for mission 2.
    const mission = currentMission(world.missions);
    if (mission && mission.pickup && world.missions.step === 'pickup') {
      ctx.save();
      ctx.translate(mission.pickup.x, mission.pickup.y);
      ctx.fillStyle = PALETTE.gold;
      ctx.fillRect(-9, -7, 18, 14);
      ctx.fillStyle = '#7a5c00';
      ctx.fillRect(-9, -2, 18, 3);
      ctx.restore();
    }
  }

  function draw(world, screen, hasSave) {
    const view = resize();
    ctx.clearRect(0, 0, view.width, view.height);
    ctx.fillStyle = '#141021';
    ctx.fillRect(0, 0, view.width, view.height);
    // World space: the camera centres on the player.
    ctx.save();
    ctx.translate(view.width / 2 - world.camera.x, view.height / 2 - world.camera.y);
    drawCity(world);
    drawMarker(world, view);
    drawWorldEntities(world);
    ctx.restore();
    if (screen === SCREEN.PLAY) {
      drawHud(world, view);
      if (world.bustedTimer > 0) drawBusted(world, view);
    } else if (screen === SCREEN.TITLE) {
      drawTitle(world, view, hasSave);
    } else if (screen === SCREEN.PAUSED) {
      drawHud(world, view);
      drawPaused(view);
    }
  }

  return { draw, resize };
}
