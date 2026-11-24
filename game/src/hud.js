import { FONT_STACK, JOBS, CREW, ABILITIES } from './config.js';
import { WEAPONS } from './missions.js';

const SHOP_ITEMS = [
  { key: 'armour', name: 'Armour Plating', price: 800, desc: 'Reinforced panels. Take twice the punishment before the car smokes.' },
  { key: 'engine', name: 'Engine Tune', price: 1200, desc: 'Stage-2 tune. Noticeably quicker off the line and a higher top speed.' },
  { key: 'nitro', name: 'Nitro Boost', price: 900, desc: 'A tank of nitro. Hold Shift for a short burst of speed.' },
  { key: 'paint', name: 'Sunset Gold Paint', price: 500, desc: 'Factory gold flake with a deep clearcoat. Turns heads on the boulevard.' },
  { key: 'wheels', name: 'Chrome Wheels', price: 650, desc: 'Polished chrome rims with low-profile tyres. Pure boulevard style.' },
  { key: 'bodykit', name: 'Body Kit', price: 1500, desc: 'Front splitter, side skirts and a rear wing. The GT looks the part.' },
];

const CSS = `
#game { filter: contrast(1.08) saturate(1.18) brightness(1.02); }
#hud { position: fixed; inset: 0; pointer-events: none; z-index: 10; font-family: ${FONT_STACK}; color: #f2f4f8; }
#hud .glass { background: rgba(12,16,32,0.35); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); border: 1px solid rgba(255,255,255,0.18); border-radius: 10px; box-shadow: 0 4px 18px rgba(0,0,0,0.25); text-shadow: 0 1px 3px rgba(0,0,0,0.8); }
#hud .accent { border-left: 3px solid #ffb36b; }
#objective { position: absolute; top: 14px; left: 14px; max-width: 360px; padding: 10px 14px; font-size: 14px; }
#objective .job { font-size: 15px; font-weight: 700; }
#objective .goal { font-size: 12.5px; opacity: 0.9; margin-top: 2px; }
#objective .stage { font-size: 11.5px; font-weight: 700; letter-spacing: 0.5px; color: #ffd166; margin-top: 5px; }
#objective .next { font-size: 11.5px; opacity: 0.9; margin-top: 1px; }
#objective .bar { height: 5px; border-radius: 3px; background: rgba(255,255,255,0.2); margin-top: 8px; overflow: hidden; }
#objective .bar i { display: block; height: 100%; background: linear-gradient(90deg, #ffb36b, #ff5a3a); }
#rank { position: absolute; top: 124px; left: 14px; padding: 6px 12px; font-size: 12px; font-weight: 700; letter-spacing: 1px; min-width: 210px; }
#rank .xpbar { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.22); margin-top: 5px; overflow: hidden; }
#rank .xpbar i { display: block; height: 100%; background: linear-gradient(90deg, #7de08a, #ffd94a); }
#rank .xpnum { font-size: 10.5px; font-weight: 600; letter-spacing: 0.5px; opacity: 0.85; margin-top: 3px; }
#stars { position: absolute; top: 12px; left: 50%; transform: translateX(-50%); font-size: 26px; letter-spacing: 4px; color: #ffd94a; text-shadow: 0 0 12px rgba(255,217,74,0.6), 0 2px 4px rgba(0,0,0,0.8); }
#stars .dim { color: rgba(255,255,255,0.35); text-shadow: none; }
#money { position: absolute; top: 14px; right: 14px; padding: 9px 14px; text-align: right; font-size: 14px; }
#money .amount { font-size: 17px; font-weight: 700; color: #7de08a; }
#money .clock { font-size: 12px; opacity: 0.9; }
#money .radio { font-size: 11px; opacity: 0.7; }
#dispatch { position: absolute; top: 120px; right: 14px; width: 250px; padding: 8px 10px; font-size: 12px; }
#dispatch .head { font-size: 11px; font-weight: 700; letter-spacing: 1px; margin-bottom: 4px; }
#dispatch .row { display: flex; justify-content: space-between; padding: 2px 0; }
#dispatch .row b { color: #ffb36b; }
#radioline { position: absolute; top: 276px; right: 14px; width: 250px; padding: 6px 10px; font-size: 11px; font-style: italic; opacity: 0.95; }
#minimapWrap { position: absolute; left: 14px; bottom: 14px; width: 180px; height: 180px; border-radius: 50%; overflow: hidden; border: 2px solid rgba(255,255,255,0.35); background: #10182a; }
#minimap { display: block; width: 180px; height: 180px; }
#health { position: absolute; left: 208px; bottom: 16px; padding: 8px 12px; font-size: 12px; }
#health .lbl { display: flex; justify-content: space-between; margin: 2px 0; }
#health .track { width: 130px; height: 6px; border-radius: 3px; background: rgba(255,255,255,0.2); overflow: hidden; }
#health .track i { display: block; height: 100%; }
#health .hp i { background: #4ade80; }
#health .ar i { background: #7fb2ff; }
#speedo { position: absolute; right: 16px; bottom: 16px; text-align: right; font-size: 16px; text-shadow: 0 1px 3px rgba(0,0,0,0.8); }
#speedo .num { font-size: 44px; font-weight: 800; line-height: 1; }
#speedo .unit { font-size: 12px; opacity: 0.85; }
#speedo .car { font-size: 13px; font-weight: 700; margin-top: 2px; }
#speedo .cond { font-size: 11px; opacity: 0.85; }
#weapon { position: absolute; right: 16px; bottom: 110px; padding: 7px 10px; font-size: 12px; }
#weapon .wslots { display: flex; gap: 6px; }
#weapon .wslot { min-width: 62px; padding: 5px 7px; border-radius: 7px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.14); text-align: center; }
#weapon .wslot.on { background: rgba(255,179,107,0.28); border-color: #ffb36b; }
#weapon .wslot .wn { display: block; font-weight: 800; font-size: 11px; letter-spacing: 0.5px; }
#weapon .wslot .wa { display: block; font-size: 11px; opacity: 0.9; margin-top: 1px; }
#crew { position: absolute; right: 16px; bottom: 168px; display: flex; gap: 8px; }
#crew .ability { display: flex; align-items: center; gap: 7px; padding: 6px 9px; }
#crew .ability .portrait { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 900; color: #0d1526; border: 2px solid rgba(255,255,255,0.7); flex: 0 0 auto; }
#crew .ability .an { font-size: 11.5px; font-weight: 800; line-height: 1.15; }
#crew .ability .ar { font-size: 10.5px; opacity: 0.85; line-height: 1.15; }
#subtitle { position: absolute; left: 50%; bottom: 118px; transform: translateX(-50%); max-width: 640px; display: flex; align-items: center; gap: 10px; padding: 8px 14px; font-size: 15px; font-weight: 600; text-align: left; }
#subtitle .portrait { width: 34px; height: 34px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 16px; font-weight: 900; color: #0d1526; border: 2px solid rgba(255,255,255,0.7); flex: 0 0 auto; }
#subtitle .who { font-size: 11px; font-weight: 800; letter-spacing: 1px; color: #ffd166; }
#subtitle .line { font-size: 15px; font-weight: 600; line-height: 1.35; text-shadow: 0 1px 3px rgba(0,0,0,0.9); }
#prompt { position: absolute; left: 50%; bottom: 190px; transform: translateX(-50%); display: flex; align-items: center; gap: 8px; padding: 8px 14px; font-size: 14px; font-weight: 700; }
#prompt .key { display: inline-flex; align-items: center; justify-content: center; min-width: 26px; height: 26px; padding: 0 6px; border-radius: 6px; background: #ffd94a; color: #1a0e08; font-weight: 900; font-size: 14px; }
#toast { position: absolute; top: 70px; left: 50%; transform: translateX(-50%); padding: 9px 18px; font-size: 14px; font-weight: 700; display: none; }
#vignette { position: fixed; inset: 0; pointer-events: none; z-index: 5; background: radial-gradient(ellipse at center, transparent 62%, rgba(0,0,0,0.35) 100%); }
.overlay { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 20; background: rgba(6,10,22,0.72); backdrop-filter: blur(4px); -webkit-backdrop-filter: blur(4px); }
.overlay .card { background: rgba(14,20,40,0.88); border-radius: 14px; padding: 18px; border: 1px solid rgba(255,255,255,0.15); }
.overlay h2 { margin: 0 0 4px; font-size: 20px; letter-spacing: 1px; }
.overlay .hint { font-size: 12px; opacity: 0.7; margin-bottom: 12px; }
.overlay .legend { font-size: 12px; opacity: 0.8; margin-top: 10px; }
#shopGrid { display: grid; grid-template-columns: repeat(3, 190px); gap: 12px; }
#shopGrid .item { background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px; padding: 12px; }
#shopGrid .item h3 { margin: 0 0 4px; font-size: 14px; }
#shopGrid .item p { margin: 0 0 8px; font-size: 11.5px; opacity: 0.85; line-height: 1.4; }
#shopGrid .price { color: #7de08a; font-weight: 700; font-size: 14px; }
#shopGrid button { width: 100%; margin-top: 8px; padding: 8px; border: none; border-radius: 8px; background: linear-gradient(90deg, #ffb36b, #ff5a3a); color: #1a0e08; font-weight: 800; font-size: 13px; cursor: pointer; pointer-events: auto; }
#shopGrid button:disabled { background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.6); cursor: default; }
#progressCard { width: 980px; max-width: 96vw; }
#progressBody { display: flex; gap: 18px; margin-top: 10px; }
#progressMap { width: 480px; height: 480px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.2); }
#progressSide { flex: 1; display: flex; flex-direction: column; gap: 12px; font-size: 13px; }
#progressSide .sec { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 9px; padding: 10px 12px; }
#progressSide .sec h3 { margin: 0 0 6px; font-size: 11px; letter-spacing: 1.5px; color: #ffd166; }
#progressSide .row { display: flex; justify-content: space-between; padding: 2px 0; }
#progressSide .xpbar { height: 4px; border-radius: 2px; background: rgba(255,255,255,0.22); margin-top: 6px; overflow: hidden; }
#progressSide .xpbar i { display: block; height: 100%; background: linear-gradient(90deg, #7de08a, #ffd94a); }
#titleScreen { position: fixed; inset: 0; z-index: 30; display: flex; flex-direction: column; justify-content: center; padding-left: 6vw; background: linear-gradient(90deg, rgba(8,10,24,0.72), rgba(8,10,24,0) 75%); font-family: ${FONT_STACK}; color: #f2f4f8; }
#titleScreen .menu { margin-top: 18px; font-size: 30px; font-weight: 700; letter-spacing: 2px; line-height: 1.5; }
#titleScreen .menu .sel { color: #ffb36b; }
#titleScreen .slots { max-width: 520px; margin-top: 16px; }
#titleScreen .slot { padding: 9px 14px; margin-top: 8px; border-radius: 9px; font-size: 13px; display: flex; justify-content: space-between; background: rgba(12,16,32,0.35); border: 1px solid rgba(255,255,255,0.18); }
#titleScreen .controls { margin-top: 22px; font-size: 12px; opacity: 0.7; }
#titleCard { position: fixed; inset: 0; z-index: 30; display: flex; flex-direction: column; align-items: center; justify-content: space-between; padding: 5vh 0 7vh; pointer-events: none; background: linear-gradient(180deg, rgba(8,10,24,0.5), rgba(8,10,24,0.18) 32%, transparent 58%); font-family: ${FONT_STACK}; }
#titleCard .sub { font-size: 20px; font-weight: 700; letter-spacing: 4px; color: #fff; text-align: center; padding: 8px 28px; border-radius: 6px; text-shadow: 0 2px 12px rgba(0,0,0,0.95), 0 0 6px rgba(0,0,0,0.85); }
#titleCard .press { font-size: 30px; font-weight: 700; letter-spacing: 10px; color: #ffffff; opacity: 1; text-shadow: 0 0 22px rgba(255,255,255,0.95), 0 0 8px rgba(255,255,255,0.9), 0 2px 14px rgba(0,0,0,0.95); }
`;

const CHROME_GRAD = ['#fff7c8', '#ffd94a', '#ff8a3a', '#e83a2a'];

function chromeGradient(id) {
  return `<defs>
    <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${CHROME_GRAD[0]}"/>
      <stop offset="0.45" stop-color="${CHROME_GRAD[1]}"/>
      <stop offset="0.75" stop-color="${CHROME_GRAD[2]}"/>
      <stop offset="1" stop-color="${CHROME_GRAD[3]}"/>
    </linearGradient>
    <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ff9a3a"/>
      <stop offset="1" stop-color="#ff5a2a"/>
    </linearGradient>
    <linearGradient id="${id}sun" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffd94a"/>
      <stop offset="1" stop-color="#ff5a3a"/>
    </linearGradient>
    <filter id="${id}glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="6" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>`;
}

function titleLogoSvg() {
  return `<svg width="640" height="330" viewBox="0 0 640 330" xmlns="http://www.w3.org/2000/svg">
  ${chromeGradient('t')}
  <circle cx="470" cy="150" r="105" fill="url(#tsun)" opacity="0.9"/>
  <rect x="350" y="120" width="240" height="9" fill="#0a0e1e" opacity="0.85"/>
  <rect x="350" y="142" width="240" height="8" fill="#0a0e1e" opacity="0.85"/>
  <rect x="350" y="163" width="240" height="7" fill="#0a0e1e" opacity="0.85"/>
  <rect x="350" y="183" width="240" height="6" fill="#0a0e1e" opacity="0.85"/>
  <text x="30" y="150" font-family="Arial Black, sans-serif" font-size="118" font-weight="900" font-style="italic" transform="skewX(-8)" fill="url(#t)" stroke="#ff5a3a" stroke-width="1.5" filter="url(#tglow)">VICE</text>
  <text x="30" y="262" font-family="Arial Black, sans-serif" font-size="118" font-weight="900" font-style="italic" transform="skewX(-8)" fill="url(#t)" stroke="#ff5a3a" stroke-width="1.5" filter="url(#tglow)">SHORES</text>
  <text x="30" y="302" font-family="Arial Black, sans-serif" font-size="21" font-weight="700" letter-spacing="4" fill="#ffffff">A SUN-SOAKED CITY OF YOUR OWN</text>
  <text x="30" y="326" font-family="Arial Black, sans-serif" font-size="14" letter-spacing="3" fill="#ffb36b">EIGHT JOBS · FIVE STARS · ONE GOLDEN HOUR</text>
  </svg>`;
}

function titleCardSvg() {
  return `<svg width="900" height="300" viewBox="0 0 900 300" xmlns="http://www.w3.org/2000/svg">
  ${chromeGradient('c')}
  <circle cx="450" cy="140" r="125" fill="url(#csun)" opacity="0.95"/>
  <rect x="330" y="196" width="240" height="8" fill="url(#cs)" opacity="0.9"/>
  <rect x="330" y="216" width="240" height="7" fill="url(#cs)" opacity="0.9"/>
  <rect x="330" y="235" width="240" height="6" fill="url(#cs)" opacity="0.9"/>
  <rect x="330" y="253" width="240" height="5" fill="url(#cs)" opacity="0.9"/>
  <text x="450" y="172" text-anchor="middle" font-family="Arial Black, sans-serif" font-size="100" font-weight="900" font-style="italic" fill="url(#c)" stroke="#ff5a3a" stroke-width="1.5" filter="url(#cglow)">VICE SHORES</text>
  </svg>`;
}

function el(tag, cls, parent) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (parent) parent.appendChild(e);
  return e;
}

const PORTRAIT_COLOURS = { Marla: '#ff8a5c', Dex: '#4db2ff', Lena: '#7de08a', Rook: '#ffd94a' };
function portraitHtml(name, size) {
  const col = PORTRAIT_COLOURS[name] || '#b9b4a8';
  const initial = (name || '?').trim().charAt(0).toUpperCase();
  return `<span class="portrait" style="width:${size}px;height:${size}px;background:${col};font-size:${Math.round(size * 0.45)}px">${initial}</span>`;
}

function drawMap(ctx, W, H, st) {
  const scale = Math.min(W, H) / 440;
  const cx = W / 2;
  const cy = H / 2;
  const X = (x) => cx + x * scale;
  const Y = (z) => cy + z * scale;
  ctx.fillStyle = '#16233a';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2a4a22';
  ctx.fillRect(X(-210), Y(-210), 420 * scale, 420 * scale);
  ctx.fillStyle = '#1d5f7a';
  ctx.fillRect(X(176), Y(-210), 34 * scale, 420 * scale);
  ctx.fillRect(X(-210), Y(176), 420 * scale, 34 * scale);
  ctx.fillStyle = '#e8cf9a';
  ctx.fillRect(X(176), Y(-210), 8 * scale, 420 * scale);
  ctx.fillRect(X(-210), Y(176), 420 * scale, 8 * scale);
  ctx.strokeStyle = '#2e2e36';
  ctx.lineWidth = Math.max(2, 7 * scale);
  for (let i = -4; i <= 4; i++) {
    const c = i * 60;
    ctx.beginPath(); ctx.moveTo(X(-210), Y(c)); ctx.lineTo(X(210), Y(c)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(X(c), Y(-210)); ctx.lineTo(X(c), Y(210)); ctx.stroke();
  }
  ctx.fillStyle = '#8a94a8';
  for (const b of st.map.buildings) {
    ctx.fillRect(X(b.x - b.w / 2), Y(b.z - b.d / 2), b.w * scale, b.d * scale);
  }
  ctx.fillStyle = '#8a6a4a';
  ctx.fillRect(X(180), Y(150), 10 * scale, 90 * scale);
  const mt = st.map.mission;
  ctx.fillStyle = '#ffd94a';
  ctx.save();
  ctx.translate(X(mt[0]), Y(mt[1]));
  ctx.rotate(Math.PI / 4);
  const ms = 6;
  ctx.fillRect(-ms / 2, -ms / 2, ms, ms);
  ctx.restore();
  ctx.fillStyle = '#ff4040';
  for (const p of st.map.police) {
    ctx.beginPath();
    ctx.arc(X(p.x), Y(p.z), 4, 0, Math.PI * 2);
    ctx.fill();
  }
  const pl = st.map.player;
  ctx.fillStyle = '#ffffff';
  ctx.save();
  ctx.translate(X(pl.x), Y(pl.z));
  ctx.rotate(pl.heading);
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 6);
  ctx.lineTo(-6, 6);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawProgressMap(canvas, districts) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = '#0d2a4a';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#155a8a';
  ctx.fillRect(W * 0.78, 0, W * 0.22, H);
  const cols = 3;
  const rows = Math.ceil(districts.length / cols);
  const bw = (W * 0.74) / cols;
  const bh = (H * 0.92) / rows;
  districts.forEach((d, i) => {
    const x = (i % cols) * bw + 10;
    const y = Math.floor(i / cols) * bh + 10;
    ctx.fillStyle = d.colour;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(x, y, bw - 8, bh - 8);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, bw - 8, bh - 8);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(d.name, x + 10, y + 24);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = '13px Arial, sans-serif';
    ctx.fillText(`${d.pct}% complete`, x + 10, y + 44);
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(d.note, x + 10, y + 62);
  });
  ctx.fillStyle = '#9fd8ff';
  ctx.font = 'bold 15px Arial, sans-serif';
  ctx.fillText('SEA', W * 0.85, H * 0.5);
}

export function createHud() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const vignette = document.createElement('div');
  vignette.id = 'vignette';
  document.body.appendChild(vignette);

  const hud = el('div', '', document.body);
  hud.id = 'hud';

  const objective = el('div', 'glass accent', hud);
  objective.id = 'objective';
  const jobTitle = el('div', 'job', objective);
  const jobGoal = el('div', 'goal', objective);
  const stageEl = el('div', 'stage', objective);
  const nextEl = el('div', 'next', objective);
  const barWrap = el('div', 'bar', objective);
  const barFill = el('i', '', barWrap);

  const rank = el('div', 'glass', hud);
  rank.id = 'rank';

  const stars = el('div', '', hud);
  stars.id = 'stars';

  const money = el('div', 'glass', hud);
  money.id = 'money';
  const amount = el('div', 'amount', money);
  const clockEl = el('div', 'clock', money);
  const radioEl = el('div', 'radio', money);

  const dispatch = el('div', 'glass', hud);
  dispatch.id = 'dispatch';
  const dispatchHead = el('div', 'head', dispatch);
  dispatchHead.textContent = 'DISPATCH';
  const dispatchRows = el('div', '', dispatch);

  const radioLine = el('div', 'glass', hud);
  radioLine.id = 'radioline';

  const minimapWrap = el('div', '', hud);
  minimapWrap.id = 'minimapWrap';
  const minimap = document.createElement('canvas');
  minimap.id = 'minimap';
  minimap.width = 180;
  minimap.height = 180;
  minimapWrap.appendChild(minimap);
  const mmapCtx = minimap.getContext('2d');

  const health = el('div', 'glass', hud);
  health.id = 'health';
  const hpLbl = el('div', 'lbl', health);
  hpLbl.innerHTML = '<span>HEALTH</span>';
  const hpTrack = el('div', 'track hp', health);
  const hpFill = el('i', '', hpTrack);
  const arLbl = el('div', 'lbl', health);
  arLbl.innerHTML = '<span>ARMOUR</span>';
  const arTrack = el('div', 'track ar', health);
  const arFill = el('i', '', arTrack);

  const speedo = el('div', '', hud);
  speedo.id = 'speedo';
  const speedNum = el('div', 'num', speedo);
  const speedUnit = el('div', 'unit', speedo);
  speedUnit.textContent = 'km/h';
  const carNameEl = el('div', 'car', speedo);
  const condEl = el('div', 'cond', speedo);

  const weapon = el('div', 'glass', hud);
  weapon.id = 'weapon';

  const crew = el('div', '', hud);
  crew.id = 'crew';

  const subtitle = el('div', 'glass', hud);
  subtitle.id = 'subtitle';
  subtitle.style.display = 'none';

  const prompt = el('div', 'glass', hud);
  prompt.id = 'prompt';
  prompt.style.display = 'none';

  const toast = el('div', 'glass', hud);
  toast.id = 'toast';

  const mapOverlay = el('div', 'overlay', document.body);
  mapOverlay.style.display = 'none';
  const mapCard = el('div', 'card', mapOverlay);
  const mapTitle = el('h2', '', mapCard);
  mapTitle.textContent = 'VICE SHORES — FULL MAP';
  const mapHint = el('div', 'hint', mapCard);
  mapHint.textContent = 'press M to close';
  const mapCanvas = document.createElement('canvas');
  mapCanvas.width = 860;
  mapCanvas.height = 640;
  mapCard.appendChild(mapCanvas);
  const mapCtx = mapCanvas.getContext('2d');
  const mapLegend = el('div', 'legend', mapCard);
  mapLegend.textContent = '◆ You  ● Police  ◆ Mission  — Roads  ■ Buildings   Coral Row / Marina / Pier / Bank District / North Garage / Plaza';

  const progressOverlay = el('div', 'overlay', document.body);
  progressOverlay.style.display = 'none';
  const progressCard = el('div', 'card', progressOverlay);
  progressCard.id = 'progressCard';
  const progressTitle = el('h2', '', progressCard);
  progressTitle.textContent = 'VICE SHORES — PROGRESS';
  const progressHint = el('div', 'hint', progressCard);
  progressHint.textContent = 'press P to close';
  const progressBody = el('div', '', progressCard);
  progressBody.id = 'progressBody';
  const progressMap = document.createElement('canvas');
  progressMap.id = 'progressMap';
  progressMap.width = 480;
  progressMap.height = 480;
  progressBody.appendChild(progressMap);
  const progressSide = el('div', '', progressBody);
  progressSide.id = 'progressSide';

  const shopOverlay = el('div', 'overlay', document.body);
  shopOverlay.style.display = 'none';
  const shopCard = el('div', 'card', shopOverlay);
  const shopTitle = el('h2', '', shopCard);
  shopTitle.textContent = 'VICE CUSTOMS — UPGRADES';
  const shopHint = el('div', 'hint', shopCard);
  shopHint.textContent = 'press G to close';
  const shopGrid = el('div', '', shopCard);
  shopGrid.id = 'shopGrid';
  const buyButtons = {};
  for (const item of SHOP_ITEMS) {
    const card = el('div', 'item', shopGrid);
    const name = el('h3', '', card);
    name.textContent = item.name;
    const desc = el('p', '', card);
    desc.textContent = item.desc;
    const price = el('div', 'price', card);
    price.textContent = `$${item.price}`;
    const btn = document.createElement('button');
    btn.textContent = 'BUY';
    btn.dataset.key = item.key;
    card.appendChild(btn);
    buyButtons[item.key] = btn;
  }

  const titleScreen = el('div', '', document.body);
  titleScreen.id = 'titleScreen';
  titleScreen.style.display = 'none';
  const logoWrap = el('div', '', titleScreen);
  logoWrap.innerHTML = titleLogoSvg();
  const menu = el('div', 'menu', titleScreen);
  const menuItems = ['CONTINUE', 'NEW GAME', 'LOAD GAME', 'SETTINGS'];
  const menuEls = menuItems.map((label, i) => {
    const row = el('div', i === 0 ? 'sel' : '', menu);
    row.textContent = (i === 0 ? '▸ ' : '   ') + label;
    return row;
  });
  const slotsWrap = el('div', 'slots', titleScreen);
  const controls = el('div', 'controls', titleScreen);
  controls.textContent = 'WASD drive · E enter / steal car · SPACE shoot · SHIFT sprint / nitro · C camera · M map · G customs · P pause';

  const titleCard = el('div', '', document.body);
  titleCard.id = 'titleCard';
  titleCard.style.display = 'none';
  const cardCol = el('div', '', titleCard);
  cardCol.style.display = 'flex';
  cardCol.style.flexDirection = 'column';
  cardCol.style.alignItems = 'center';
  const cardSvg = el('div', '', cardCol);
  cardSvg.innerHTML = titleCardSvg();
  const cardSub = el('div', 'sub', cardCol);
  cardSub.textContent = 'A SUN-SOAKED CITY OF YOUR OWN';
  const press = el('div', 'press', titleCard);
  press.textContent = 'PRESS START';

  let buyHandler = null;
  let toastTimer = null;

  function showToast(text) {
    toast.textContent = text;
    toast.style.display = 'block';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toast.style.display = 'none'; }, 2600);
  }

  for (const key of Object.keys(buyButtons)) {
    buyButtons[key].addEventListener('click', () => {
      if (buyHandler) buyHandler(key);
    });
  }

  const api = {
    update(st) {
      jobTitle.textContent = `JOB ${st.mission.id} — ${st.mission.name.toUpperCase()}`;
      jobGoal.textContent = st.mission.goal;
      const nextJob = JOBS[st.mission.id] || null;
      stageEl.textContent = `STAGE ${st.mission.id}/${JOBS.length}`;
      nextEl.textContent = nextJob ? `NEXT: ${nextJob.name} — ${nextJob.goal}` : 'NEXT: Take the golden hour job';
      barFill.style.width = `${(st.missionDone / 8) * 100}%`;
      rank.style.top = `${objective.offsetTop + objective.offsetHeight + 8}px`;
      const xpPct = Math.round((st.missionDone / 8) * 100);
      rank.innerHTML = `RANK: ${st.rank} · ${st.progress}<div class="xpbar"><i style="width:${xpPct}%"></i></div><div class="xpnum">${st.missionDone * 1250} / ${(st.missionDone + 1) * 1250} XP · ${xpPct}% TO ${st.rank}</div>`;
      let starHtml = '';
      for (let i = 0; i < 5; i++) {
        starHtml += i < st.wanted ? '★' : '<span class="dim">★</span>';
      }
      stars.innerHTML = starHtml;
      amount.textContent = `$${st.money.toLocaleString('en-US')}`;
      clockEl.textContent = st.timeStr;
      radioEl.textContent = `${st.radio.name} — ${st.radio.song}`;
      if (!st.dispatch || st.dispatch.length === 0) {
        dispatchRows.innerHTML = '<div class="row"><span>No units on you</span><span>—</span></div>';
      } else {
        dispatchRows.innerHTML = st.dispatch
          .map((d) => `<div class="row"><span><b>${d.name}</b> · ${d.tactic}</span><span>${d.dist} m</span></div>`)
          .join('');
      }
      radioLine.textContent = st.radioLine ? `RADIO: “${st.radioLine}”` : '';
      radioLine.style.display = st.radioLine ? 'block' : 'none';
      speedNum.textContent = String(st.speedKmh);
      carNameEl.textContent = st.carName;
      condEl.textContent = st.onFoot ? 'ON FOOT' : `CONDITION ${st.condition}%`;
      const weapons = st.weapons || WEAPONS.map((w) => ({ ...w, active: w.name === st.weapon.name }));
      weapon.innerHTML = `<div class="wslots">${weapons.map((w) => `<div class="wslot ${w.active ? 'on' : ''}"><span class="wn">${w.name.toUpperCase()}</span><span class="wa">${Number.isFinite(w.ammo) ? w.ammo : '∞'}</span></div>`).join('')}</div>`;
      crew.innerHTML = ABILITIES.map((a) => {
        const c = CREW.find((x) => x.name === a.crew) || CREW[0];
        return `<span class="ability glass">${portraitHtml(c.name, 30)}<span><span class="an">${a.name}</span><br><span class="ar">${a.role} · ${c.name}</span></span></span>`;
      }).join('');
      if (st.dialogue) {
        const m = st.dialogue.match(/^([^:]+):\s*"?([\s\S]*?)"?\s*$/);
        const who = m ? m[1].trim() : 'ROOK';
        const line = m ? m[2] : st.dialogue;
        subtitle.innerHTML = `${portraitHtml(who, 34)}<span><span class="who">${who.toUpperCase()}</span><br><span class="line">${line}</span></span>`;
        subtitle.style.display = 'flex';
      } else {
        subtitle.style.display = 'none';
      }
      if (st.prompt) {
        prompt.innerHTML = `<span class="key">E</span><span>${st.prompt}</span>`;
        prompt.style.display = 'flex';
      } else {
        prompt.style.display = 'none';
      }
      hpFill.style.width = `${Math.max(0, Math.min(100, st.health))}%`;
      arFill.style.width = `${Math.max(0, Math.min(100, st.armour))}%`;
      if (st.toast) showToast(st.toast);
      drawMap(mmapCtx, 180, 180, st);
      if (mapOverlay.style.display !== 'none') drawMap(mapCtx, 860, 640, st);
    },
    showMap() { mapOverlay.style.display = 'flex'; },
    hideMap() { mapOverlay.style.display = 'none'; },
    get mapOpen() { return mapOverlay.style.display !== 'none'; },
    showShop() { shopOverlay.style.display = 'flex'; },
    hideShop() { shopOverlay.style.display = 'none'; },
    get shopOpen() { return shopOverlay.style.display !== 'none'; },
    showProgress(data) {
      const districts = data.districts || [];
      const coll = data.collectibles || { found: 0, total: 0, items: [] };
      const missions = data.missions || [];
      const career = data.career || {};
      const saves = data.saves || [];
      const overall = data.overallPct || 0;
      progressSide.innerHTML = `
        <div class="sec"><h3>RANK — ${data.rankName || 'NOBODY'}</h3>
          <div class="row"><span>${data.rankXp || 0} / ${data.rankNextXp || 2000} XP</span><span>${overall}% complete</span></div>
          <div class="xpbar"><i style="width:${overall}%"></i></div></div>
        <div class="sec"><h3>COLLECTIBLES — ${coll.found}/${coll.total}</h3>
          ${coll.items.map((c) => `<div class="row"><span>${c.found ? '✓' : '○'} ${c.name}</span><span>${c.found ? 'Found' : c.hint}</span></div>`).join('')}</div>
        <div class="sec"><h3>MISSION RATINGS</h3>
          ${missions.map((m) => `<div class="row"><span>${m.name}</span><span>${m.rating}</span></div>`).join('')}</div>
        <div class="sec"><h3>CAREER STATS</h3>
          <div class="row"><span>Missions completed</span><span>${career.missionsDone || 0} / ${career.missionsTotal || 8}</span></div>
          <div class="row"><span>Money earned</span><span>$${(career.moneyEarned || 0).toLocaleString('en-US')}</span></div>
          <div class="row"><span>Cars stolen</span><span>${career.carsStolen || 0}</span></div>
          <div class="row"><span>Police escapes</span><span>${career.escapes || 0}</span></div>
          <div class="row"><span>Best wanted level</span><span>${career.bestStars || 0} ★</span></div></div>
        <div class="sec"><h3>SAVE SLOTS</h3>
          ${saves.map((s) => `<div class="row"><span>${s.label}</span><span>${s.empty ? 'Empty' : `${s.percent}% · ${s.missions} · $${s.money.toLocaleString('en-US')}`}</span></div>`).join('')}</div>`;
      drawProgressMap(progressMap, districts);
      progressOverlay.style.display = 'flex';
    },
    hideProgress() { progressOverlay.style.display = 'none'; },
    get progressOpen() { return progressOverlay.style.display !== 'none'; },
    onBuy(fn) { buyHandler = fn; },
    markOwned(key) {
      const btn = buyButtons[key];
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'OWNED';
      }
    },
    showTitle(slots) {
      slotsWrap.innerHTML = '';
      for (const s of slots) {
        const row = el('div', 'slot', slotsWrap);
        const left = el('span', '', row);
        left.textContent = s.empty ? `${s.label}` : `${s.label} · ${s.act}`;
        const right = el('span', '', row);
        right.textContent = s.empty
          ? '—'
          : `${s.percent}% · ${s.missions} · $${s.money.toLocaleString('en-US')}`;
      }
      titleScreen.style.display = 'flex';
    },
    hideTitle() { titleScreen.style.display = 'none'; },
    showTitleCard() { titleCard.style.display = 'flex'; },
    hideTitleCard() { titleCard.style.display = 'none'; },
    setHudVisible(v) {
      hud.style.display = v ? 'block' : 'none';
      vignette.style.display = v ? 'block' : 'none';
    },
    toast: showToast,
    setMenuSelected(i) {
      menuEls.forEach((row, j) => {
        row.className = j === i ? 'sel' : '';
        row.textContent = (j === i ? '▸ ' : '   ') + menuItems[j];
      });
    },
  };
  return api;
}
