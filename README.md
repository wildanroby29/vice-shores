[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/wildanroby29/vice-shores/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/wildanroby29/vice-shores/reward.svg)](https://make.fun/bounty/gta6-01)

# Vice Shores

A complete 3D low-poly open-world crime game for make.fun's [Make GTA 6](https://make.fun/bounty/gta6-01) bounty — an original sun-soaked coastal city at golden hour, built by an AI agent, with no Rockstar material anywhere.

Rook just rolled into Vice Shores. Marla the fixer has eight jobs, and the whole coast is open to take them in: drive the blue coupe to Coral Row, grab a package in Palm Park, lose a two-star chase, drive a client to Airport Rd in sixty seconds, steal a red sports car, pay the cops back by wrecking three of their cars, crack the bank vault, and survive five stars at the pier. After that, free roam — the city is yours.

## What's in it

- A 2560×1920 3D open world (three.js, vendored): street grid, lit buildings with neon signs, beachfront boulevard with palms, ocean and beach, a river and a bridge, sunset golden-hour lighting
- Third-person on foot (walk/sprint, punch, shoot, carjack) and behind the car (acceleration, braking, steering, collisions, car health)
- Traffic that drives the roads and brakes for the car ahead, and pedestrians who walk the sidewalks and flee crimes
- Stealing cars — parked cars are a crime only if a cop sees; driven cars always bring heat
- A wanted system (0–5 stars) with police cars that chase and ram, a helicopter with a spotlight at 4–5 stars, roadblocks at 3+ stars, and getting busted ($150 fine, respawn at the safehouse)
- Eight numbered story missions with on-screen objectives, gold map markers and payouts ($250–$1,500), plus a respect/rank ladder (NOBODY → HUSTLER → WHEELMAN → FIXER → BOSS) and named crew abilities (Marla, Dex, Lena)
- Weapons with ammo (fists, pistol, SMG), health and armour, money and an in-game clock, a radio station, and a garage/upgrade shop (repair, respray, armour, ammo)
- A dense HUD: job panel, named police dispatch panel (unit + distance + tactic), wanted stars, money + clock, weapon slots, health/armour, a live minimap, respect rank, radio, speed + vehicle name + condition
- A title screen with three save slots, pause, and a localStorage save
- Synthesized WebAudio sound only: engine hum, sirens, pickups, punches, shots, crashes, mission jingles

## Play

Serve it locally with `node serve.ts`, then open http://localhost:8080 — no build step, no network requests at runtime (three.js is vendored at `game/vendor/three.min.js`).

- **WASD / arrows** — move & drive · **Shift** — sprint
- **E** — enter / exit a car · **Space / click** — shoot (punch point-blank with fists)
- **1 / 2 / 3** — weapon · **Q** — cycle weapon · **G** — garage (near Marla's garage)
- **P** — pause · **M** — mute

## Entry

- `main.ts` (Node 22) copies `game/` and `screenshots/` to `/output` and writes `dossier.json` with the vendored make.fun library.
- Built by an AI agent in a recorded Muse session for the gta6-01 bounty.
