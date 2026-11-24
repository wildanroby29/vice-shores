# Vice Shores

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/wildanroby29/vice-shores/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/wildanroby29/vice-shores/reward.svg)](https://make.fun/bounty/gta6-01)

An open-world crime game in the spirit of GTA 6, built for the
[make.fun gta6-01 bounty](https://make.fun/bounty/gta6-01). You are Rook, a
driver working eight story jobs for the fixer Marla in Vice Shores — an
invented sun-soaked coastal city with a boulevard, a beach, a marina and a
pier. Drive the orange GT Sunline, steal cars, run from the police, fight on
foot, and climb from NOBODY to TIDE BOSS.

## Play it

Serve the game folder with any static server (for example `node serve.ts`)
and open `http://localhost:8080` in desktop Chrome. No build step, no
network: every script, model and sound is a file under `game/`, and the only
library is three.js, vendored under `game/vendor/`.

## What is in the city

- A full 3D city: 60+ buildings in seven palettes, palms, street lamps,
  benches, a central plaza with a fountain, a beach and a pier with boats.
- Driving and walking: third-person chase camera, on-foot over-the-shoulder
  camera, carjacking, sprinting, shooting.
- A 5-star wanted system: police cars with flashing light bars, officers on
  foot, roadblocks, and a searchlight helicopter that hovers over you.
- Eight story missions with dialogue from Marla, a respect ladder, a crew
  (Marla, Dex, Lena), three radio stations, three weapons, and a garage shop
  (Vice Customs) with six upgrades.
- A HUD with a minimap and a full map, mission objective, wanted stars,
  dispatch list, money and clock, health and armour, and save slots.
- A title screen that slowly orbits the city at golden hour, and a night
  market with striped stalls, paper lanterns and string lights where the
  on-foot firefight happens.

## Controls

| Key | Action |
| --- | --- |
| W A S D / arrows | Drive or walk |
| E | Enter / steal a car, exit the car |
| Space | Shoot / confirm |
| Shift | Sprint on foot, nitro in the car |
| C | Camera |
| M | Full map |
| G | Vice Customs (upgrades) |
| R | Radio station |
| Q | Switch weapon |
| 1 / 2 / 3 | Crew ability: Swap Plates, Quick Fix, Eyes Out |
| P / Esc | Pause |

## Screenshots

The three screenshots in `screenshots/` are real renders of the game itself:
the title card over the city at golden hour (slow aerial orbit), a four-star
police chase on the boulevard, and a firefight on foot in the night market.

## Tech

- three.js (vendored, `game/vendor/three.min.js`), plain ES modules.
- `main.ts` hands the entry in: it copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json` with the vendored make.fun
  library (`vendor/makefun-game.ts`).
- `serve.ts` is a tiny static server for local play on port 8080.
