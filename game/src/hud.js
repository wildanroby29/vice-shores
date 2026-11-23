// hud.js — the whole interface as DOM over the canvas: light-glass panels
// (no opaque black boxes), round minimap, speedometer, wanted stars, dispatch
// ticker, cinematic subtitles, crew + weapon icons, a professional shop
// overlay, a full-screen map, and the title screen with the heavy poster logo.
// CSS lives here so the look is one place.
const CSS = `
#hud{position:fixed;inset:0;pointer-events:none;font-family:system-ui,-apple-system,"Segoe UI",sans-serif;color:#f2f4f8;z-index:5}
.glass{background:rgba(12,16,32,0.35);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);border:1px solid rgba(255,255,255,0.18);border-radius:10px;box-shadow:0 4px 18px rgba(0,0,0,0.25);text-shadow:0 1px 3px rgba(0,0,0,0.8)}
.accent{border-left:3px solid #ffb36b}
#obj{position:absolute;top:14px;left:14px;padding:10px 14px;max-width:340px}
#obj .t{font-weight:800;font-size:15px;letter-spacing:0.4px}
#obj .s{font-size:12.5px;opacity:0.92;margin-top:3px}
#obj .bar{height:5px;background:rgba(255,255,255,0.18);border-radius:3px;margin-top:8px;overflow:hidden}
#obj .bar i{display:block;height:100%;background:linear-gradient(90deg,#ffb36b,#ff5a3a);border-radius:3px}
#rank{position:absolute;top:96px;left:14px;padding:6px 12px;font-size:12px;font-weight:700;letter-spacing:1px}
#stars{position:absolute;top:12px;left:50%;transform:translateX(-50%);font-size:26px;letter-spacing:4px;color:#ffd94a;text-shadow:0 0 12px rgba(255,200,60,0.7),0 2px 4px rgba(0,0,0,0.8)}
#stars .dim{color:rgba(255,255,255,0.35);text-shadow:none}
#money{position:absolute;top:14px;right:14px;padding:9px 14px;text-align:right}
#money .m{font-weight:800;font-size:17px;color:#7de08a}
#money .c{font-size:12px;opacity:0.9;margin-top:2px}
#money .r{font-size:11px;opacity:0.65;margin-top:2px}
#dispatch{position:absolute;top:120px;right:14px;width:230px;padding:8px 10px;font-size:12px}
#dispatch .h{font-weight:800;font-size:11px;letter-spacing:1px;opacity:0.85;margin-bottom:5px}
#dispatch .row{display:flex;justify-content:space-between;padding:2px 0}
#dispatch .row b{color:#ffb36b}
#minimap{position:absolute;left:14px;bottom:14px;width:180px;height:180px;border-radius:50%;border:2px solid rgba(255,255,255,0.35);box-shadow:0 4px 18px rgba(0,0,0,0.4);background:#10182a}
#speedo{position:absolute;right:16px;bottom:16px;text-align:right;text-shadow:0 2px 6px rgba(0,0,0,0.85)}
#speedo .n{font-size:44px;font-weight:800;line-height:1}
#speedo .u{font-size:12px;opacity:0.85}
#speedo .car{font-size:13px;font-weight:700;margin-top:2px}
#speedo .cond{font-size:11px;opacity:0.8}
#weapon{position:absolute;right:16px;bottom:110px;padding:7px 11px;font-size:13px;font-weight:700}
#crew{position:absolute;right:16px;bottom:152px;display:flex;gap:8px}
#crew .k{padding:6px 9px;font-size:11px;font-weight:700}
#crew .k b{color:#ffb36b}
#sub{position:absolute;left:50%;bottom:110px;transform:translateX(-50%);max-width:640px;text-align:center;font-size:17px;font-weight:600;text-shadow:0 2px 6px rgba(0,0,0,0.9),0 0 2px rgba(0,0,0,0.9)}
#health{position:absolute;left:208px;bottom:16px;padding:8px 12px;font-size:12px}
#health .hb{height:6px;background:rgba(255,255,255,0.18);border-radius:3px;margin-top:4px;overflow:hidden;width:130px}
#health .hb i{display:block;height:100%;background:#4ade80}
#health .ab i{background:#7fb2ff}
#vignette{position:fixed;inset:0;pointer-events:none;z-index:4;background:transparent}
#game{filter:contrast(1.08) saturate(1.18) brightness(1.02)}
#mapOv,#shopOv{position:fixed;inset:0;display:none;align-items:center;justify-content:center;z-index:20;background:rgba(6,10,22,0.72);backdrop-filter:blur(4px);pointer-events:auto}
#mapOv .card,#shopOv .card{background:rgba(14,20,40,0.85);border:1px solid rgba(255,255,255,0.2);border-radius:14px;padding:18px;box-shadow:0 12px 40px rgba(0,0,0,0.5)}
#mapOv canvas{border-radius:10px}
#mapOv .legend{font-size:12px;opacity:0.9;margin-top:10px;line-height:1.7}
#shopOv .grid{display:grid;grid-template-columns:repeat(3,190px);gap:12px;margin-top:12px}
#shopOv .item{background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.16);border-radius:10px;padding:12px}
#shopOv .item h4{margin:0 0 4px;font-size:14px}
#shopOv .item p{margin:0 0 10px;font-size:11.5px;opacity:0.85;line-height:1.45}
#shopOv .item .price{font-weight:800;color:#7de08a;font-size:14px}
#shopOv .item button{margin-top:8px;width:100%;padding:7px;border:0;border-radius:7px;font-weight:800;cursor:pointer;background:linear-gradient(90deg,#ffb36b,#ff5a3a);color:#1a1206}
#shopOv .item button:disabled{opacity:0.4;cursor:default}
#title{position:fixed;inset:0;z-index:30;display:flex;flex-direction:column;justify-content:center;padding-left:6vw;background:linear-gradient(90deg,rgba(8,10,24,0.72) 0%,rgba(8,10,24,0.35) 45%,rgba(8,10,24,0) 75%);color:#fff;font-family:system-ui,sans-serif}
#title .menu{margin-top:26px}
#title .menu div{font-size:30px;font-weight:800;letter-spacing:2px;padding:7px 0;color:rgba(255,255,255,0.85);cursor:pointer;text-shadow:0 2px 8px rgba(0,0,0,0.8)}
#title .menu div.sel{color:#ffb36b}
#title .menu div.sel::before{content:"▸ "}
#title .slots{margin-top:30px;max-width:520px}
#title .slot{display:flex;justify-content:space-between;padding:9px 14px;margin-top:8px;background:rgba(12,16,32,0.32);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,0.18);border-radius:9px;font-size:13px}
#title .slot b{color:#ffb36b}
#title .ctrl{position:absolute;bottom:18px;left:6vw;font-size:12px;opacity:0.7}
#toast{position:fixed;top:70px;left:50%;transform:translateX(-50%);padding:9px 18px;font-weight:700;font-size:14px;z-index:40;display:none}
#titleCard{position:fixed;inset:0;z-index:30;display:none;flex-direction:column;align-items:center;justify-content:space-between;padding:5vh 0 7vh;pointer-events:none;background:linear-gradient(180deg,rgba(8,10,24,0.5) 0%,rgba(8,10,24,0.18) 32%,rgba(8,10,24,0) 58%);color:#fff;font-family:system-ui,sans-serif}
#titleCard .sub{margin-top:10px;font-size:20px;font-weight:700;letter-spacing:4px;color:#fff;text-align:center;padding:8px 28px;background:linear-gradient(90deg,transparent,rgba(8,10,24,0.62) 18%,rgba(8,10,24,0.62) 82%,transparent);border-radius:6px;text-shadow:0 1px 4px rgba(0,0,0,0.9)}
#titleCard .press{font-size:30px;font-weight:800;letter-spacing:10px;color:#fff;text-shadow:0 0 20px rgba(255,255,255,0.75),0 2px 14px rgba(0,0,0,0.95);animation:pulse 1.6s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:0.95}50%{opacity:0.9}}
`;

export function createHud() {
  const style = document.createElement('style');
  style.textContent = CSS;
  document.head.appendChild(style);

  const hud = document.createElement('div');
  hud.id = 'hud';
  hud.innerHTML = `
    <div id="obj" class="glass accent"><div class="t"></div><div class="s"></div><div class="bar"><i></i></div></div>
    <div id="rank" class="glass"></div>
    <div id="stars"></div>
    <div id="money" class="glass"><div class="m"></div><div class="c"></div><div class="r"></div></div>
    <div id="dispatch" class="glass"><div class="h">DISPATCH</div><div class="rows"></div></div>
    <canvas id="minimap" width="180" height="180"></canvas>
    <div id="speedo"><div class="n">0</div><div class="u">km/h</div><div class="car"></div><div class="cond"></div></div>
    <div id="weapon" class="glass"></div>
    <div id="crew"></div>
    <div id="sub"></div>
    <div id="health" class="glass"><div>HEALTH</div><div class="hb"><i></i></div><div style="margin-top:5px">ARMOUR</div><div class="hb ab"><i></i></div></div>
    <div id="toast" class="glass"></div>`;
  document.body.appendChild(hud);
  const vig = document.createElement('div');
  vig.id = 'vignette';
  document.body.appendChild(vig);

  const $ = (id) => document.getElementById(id);
  const mm = $('minimap').getContext('2d');

  // Full-screen map overlay.
  const mapOv = document.createElement('div');
  mapOv.id = 'mapOv';
  mapOv.innerHTML = `<div class="card"><div style="font-weight:800;font-size:17px;margin-bottom:8px">VICE SHORES — FULL MAP <span style="float:right;font-size:12px;opacity:0.7">press M to close</span></div><canvas id="bigmap" width="860" height="640"></canvas><div class="legend">◆ You &nbsp; ● Police &nbsp; ◆ Mission &nbsp; — Roads &nbsp; ■ Buildings &nbsp; <span style="color:#ffb36b">Coral Row</span> · <span style="color:#7fb2ff">Marina</span> · <span style="color:#7de08a">Pier</span> · Bank District · North Garage · Plaza</div></div>`;
  document.body.appendChild(mapOv);
  const big = $('bigmap').getContext('2d');

  // Professional shop overlay.
  const SHOP = [
    { name: 'Armour Plating', desc: 'Reinforced panels. Take twice the punishment before the car smokes.', price: 800, key: 'armour' },
    { name: 'Engine Tune', desc: 'Stage-2 tune. Noticeably quicker off the line and a higher top speed.', price: 1200, key: 'engine' },
    { name: 'Nitro Boost', desc: 'A tank of nitro. Hold Shift for a short burst of speed.', price: 900, key: 'nitro' },
    { name: 'Sunset Gold Paint', desc: 'Factory gold flake with a deep clearcoat. Turns heads on the boulevard.', price: 500, key: 'paint' },
    { name: 'Chrome Wheels', desc: 'Polished chrome rims with low-profile tyres. Pure boulevard style.', price: 650, key: 'wheels' },
    { name: 'Body Kit', desc: 'Front splitter, side skirts and a rear wing. The GT looks the part.', price: 1500, key: 'bodykit' },
  ];
  const shopOv = document.createElement('div');
  shopOv.id = 'shopOv';
  shopOv.innerHTML = `<div class="card"><div style="font-weight:800;font-size:17px">VICE CUSTOMS — UPGRADES <span style="float:right;font-size:12px;opacity:0.7">press G to close</span></div><div class="grid"></div></div>`;
  document.body.appendChild(shopOv);
  const grid = shopOv.querySelector('.grid');
  const owned = new Set();
  const buyHandlers = [];
  for (const item of SHOP) {
    const el = document.createElement('div');
    el.className = 'item';
    el.innerHTML = `<h4>${item.name}</h4><p>${item.desc}</p><div class="price">$${item.price}</div><button>BUY</button>`;
    el.querySelector('button').addEventListener('click', () => {
      for (const h of buyHandlers) h(item, el);
    });
    grid.appendChild(el);
  }

  // Title screen overlay (SVG logo: heavy italic poster lettering, chrome/sunset
  // gradient, thin neon glow outline, retro sun with slits, palm silhouette).
  const titleOv = document.createElement('div');
  titleOv.id = 'title';
  titleOv.innerHTML = `
    <svg width="640" height="330" viewBox="0 0 640 330" aria-label="Vice Shores">
      <defs>
        <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff7c8"/><stop offset="0.45" stop-color="#ffd94a"/>
          <stop offset="0.55" stop-color="#ff8a3a"/><stop offset="1" stop-color="#e83a2a"/>
        </linearGradient>
        <linearGradient id="sunG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffd94a"/><stop offset="1" stop-color="#ff5a3a"/>
        </linearGradient>
        <filter id="neon" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx="470" cy="150" r="105" fill="url(#sunG)" opacity="0.9"/>
      <g fill="#0a0e1e" opacity="0.85"><rect x="350" y="120" width="240" height="9"/><rect x="350" y="142" width="240" height="8"/><rect x="350" y="163" width="240" height="7"/><rect x="350" y="183" width="240" height="6"/></g>
      <g fill="#0a0e1e"><path d="M520 250 q10 -52 4 -92 q14 40 4 92z M545 250 q22 -40 34 -58 q-6 34 -14 58z M500 250 q-4 -44 -16 -66 q2 36 -4 66z"/></g>
      <g font-family="Arial Black, Arial, sans-serif" font-style="italic" font-weight="900" filter="url(#neon)">
        <text x="18" y="150" font-size="118" fill="url(#chrome)" stroke="#ff5a3a" stroke-width="1.5" transform="skewX(-8)">VICE</text>
        <text x="18" y="262" font-size="118" fill="url(#chrome)" stroke="#ff5a3a" stroke-width="1.5" transform="skewX(-8)">SHORES</text>
      </g>
      <text x="22" y="302" font-family="Arial, sans-serif" font-size="21" font-weight="700" letter-spacing="4" fill="#ffffff">A SUN-SOAKED CITY OF YOUR OWN</text>
      <text x="22" y="326" font-family="Arial, sans-serif" font-size="14" letter-spacing="3" fill="#ffb36b">EIGHT JOBS · FIVE STARS · ONE GOLDEN HOUR</text>
    </svg>
    <div class="menu"><div class="sel">CONTINUE</div><div>NEW GAME</div><div>LOAD GAME</div><div>SETTINGS</div></div>
    <div class="slots"></div>
    <div class="ctrl">WASD drive &nbsp;·&nbsp; E enter / steal car &nbsp;·&nbsp; SPACE shoot &nbsp;·&nbsp; SHIFT sprint / nitro &nbsp;·&nbsp; C camera &nbsp;·&nbsp; M map &nbsp;·&nbsp; G customs &nbsp;·&nbsp; P pause</div>`;
  document.body.appendChild(titleOv);

  // Title card overlay for the ?shot=title screenshot: the big logo over the
  // live golden-hour boulevard (no menu soup), HUD hidden. Round 9: the logo
  // is ONE line, centred, ~60% of frame width; the retro sun is centred
  // BEHIND it and its slit lines are drawn BEHIND the text in sunset-gradient
  // colours (never black, never crossing a letter).
  const titleCard = document.createElement('div');
  titleCard.id = 'titleCard';
  titleCard.innerHTML = `
    <div style="display:flex;flex-direction:column;align-items:center">
    <svg width="900" height="300" viewBox="0 0 900 300" aria-label="Vice Shores">
      <defs>
        <linearGradient id="chrome2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#fff7c8"/><stop offset="0.45" stop-color="#ffd94a"/>
          <stop offset="0.55" stop-color="#ff8a3a"/><stop offset="1" stop-color="#e83a2a"/>
        </linearGradient>
        <linearGradient id="sunG2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffd94a"/><stop offset="1" stop-color="#ff5a3a"/>
        </linearGradient>
        <linearGradient id="slitG" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ff9a3a"/><stop offset="1" stop-color="#ff5a2a"/>
        </linearGradient>
        <filter id="neon2" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <circle cx="450" cy="140" r="125" fill="url(#sunG2)" opacity="0.95"/>
      <g fill="url(#slitG)" opacity="0.9"><rect x="330" y="196" width="240" height="8"/><rect x="330" y="216" width="240" height="7"/><rect x="330" y="235" width="240" height="6"/><rect x="330" y="253" width="240" height="5"/></g>
      <g font-family="Arial Black, Arial, sans-serif" font-style="italic" font-weight="900" filter="url(#neon2)">
        <text x="450" y="172" font-size="100" text-anchor="middle" fill="url(#chrome2)" stroke="#ff5a3a" stroke-width="1.5">VICE SHORES</text>
      </g>
    </svg>
    <div class="sub">A SUN-SOAKED CITY OF YOUR OWN</div>
    </div>
    <div class="press">PRESS START</div>`;
  document.body.appendChild(titleCard);

  function drawMap(ctx, W, H, data) {
    const s = Math.min(W, H) / 440;
    const ox = (W - 440 * s) / 2, oy = (H - 440 * s) / 2;
    const X = (x) => ox + (x + 220) * s, Y = (z) => oy + (z + 220) * s;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#16233a';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#2a4a22';
    ctx.fillRect(ox, oy, 440 * s, 440 * s);
    // Sea + sand.
    ctx.fillStyle = '#1d5f7a';
    ctx.fillRect(X(176), oy, 440 * s - (176 + 220) * s, 440 * s);
    ctx.fillStyle = '#e8cf9a';
    ctx.fillRect(X(176), oy, 34 * s, 440 * s);
    ctx.fillRect(ox, Y(176), 440 * s, 34 * s);
    // Roads.
    ctx.strokeStyle = '#2e2e36';
    ctx.lineWidth = 10 * s;
    for (let i = -4; i <= 4; i += 1) {
      const c = i * 60;
      ctx.beginPath(); ctx.moveTo(ox, Y(c)); ctx.lineTo(ox + 440 * s, Y(c)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(X(c), oy); ctx.lineTo(X(c), oy + 440 * s); ctx.stroke();
    }
    // Buildings.
    ctx.fillStyle = '#8a94a8';
    for (const b of data.buildings) ctx.fillRect(X(b.x - b.w / 2), Y(b.z - b.d / 2), b.w * s, b.d * s);
    // Pier.
    ctx.fillStyle = '#8a6a4a';
    ctx.fillRect(X(180), Y(150), 10 * s, 90 * s);
    // Mission marker.
    ctx.fillStyle = '#ffd94a';
    const mx = X(data.mission[0]), my = Y(data.mission[1]);
    ctx.save(); ctx.translate(mx, my); ctx.rotate(Math.PI / 4); ctx.fillRect(-6, -6, 12, 12); ctx.restore();
    // Police dots.
    for (const p of data.police) { ctx.fillStyle = '#ff4040'; ctx.beginPath(); ctx.arc(X(p.x), Y(p.z), 4, 0, 7); ctx.fill(); }
    // Player arrow.
    ctx.save(); ctx.translate(X(data.player.x), Y(data.player.z)); ctx.rotate(data.player.heading);
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(6, 6); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill(); ctx.restore();
  }

  let toastTimer = 0;
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.style.display = 'none'; }, 2600);
  }

  function update(st) {
    $('obj').querySelector('.t').textContent = `JOB ${st.mission.id} — ${st.mission.name.toUpperCase()}`;
    $('obj').querySelector('.s').textContent = st.mission.short;
    $('obj').querySelector('.bar i').style.width = `${(st.missionDone / 8) * 100}%`;
    $('rank').textContent = `RANK: ${st.rank} · ${st.progress}`;
    let stars = '';
    for (let i = 0; i < 5; i += 1) stars += i < st.wanted ? '★' : '<span class="dim">★</span>';
    $('stars').innerHTML = stars;
    $('money').querySelector('.m').textContent = `$${st.money.toLocaleString('en-US')}`;
    $('money').querySelector('.c').textContent = st.timeStr;
    $('money').querySelector('.r').textContent = `${st.radio.station} — ${st.radio.song}`;
    const rows = $('dispatch').querySelector('.rows');
    rows.innerHTML = st.dispatch.map((d) => `<div class="row"><span><b>${d.name}</b> · ${d.tactic}</span><span>${d.dist} m</span></div>`).join('') || '<div class="row"><span>No units on you</span><span>—</span></div>';
    $('speedo').querySelector('.n').textContent = Math.round(st.speedKmh);
    $('speedo').querySelector('.car').textContent = st.carName;
    $('speedo').querySelector('.cond').textContent = st.onFoot ? 'ON FOOT' : `CONDITION ${st.condition}%`;
    $('weapon').textContent = `${st.weapon.name}${st.weapon.ammo === Infinity ? '' : ' · ' + st.weapon.ammo}`;
    const crew = $('crew');
    crew.innerHTML = st.crew.map((c) => `<div class="k glass"><b>${c.key}</b> ${c.name}</div>`).join('');
    $('sub').textContent = st.dialogue || '';
    const hb = $('health').querySelectorAll('.hb i');
    hb[0].style.width = `${st.health}%`;
    hb[1].style.width = `${st.armour}%`;
    drawMap(mm, 180, 180, st.map);
  }

  function drawBigMap(data) { drawMap(big, 860, 640, data); }

  return {
    update, toast, drawBigMap,
    showMap() { mapOv.style.display = 'flex'; },
    hideMap() { mapOv.style.display = 'none'; },
    mapOpen() { return mapOv.style.display === 'flex'; },
    showShop() { shopOv.style.display = 'flex'; },
    hideShop() { shopOv.style.display = 'none'; },
    shopOpen() { return shopOv.style.display === 'flex'; },
    onBuy(fn) { buyHandlers.push(fn); },
    markOwned(key) { owned.add(key); for (const el of grid.children) { const b = el.querySelector('button'); if (b && el.querySelector('h4').textContent && SHOP.find((s) => s.key === key && el.querySelector('h4').textContent === s.name)) { b.disabled = true; b.textContent = 'OWNED'; } } },
    showTitle(slots) {
      titleOv.style.display = 'flex';
      const box = titleOv.querySelector('.slots');
      box.innerHTML = slots.map((s) => `<div class="slot"><span><b>${s.label}</b> · ${s.act}</span><span>${s.pct} · ${s.missions} · ${s.money}</span></div>`).join('');
    },
    hideTitle() { titleOv.style.display = 'none'; },
    showTitleCard() { titleCard.style.display = 'flex'; },
    hideTitleCard() { titleCard.style.display = 'none'; },
    setHudVisible(v) { hud.style.display = v ? 'block' : 'none'; vig.style.display = v ? 'block' : 'none'; },
  };
}
