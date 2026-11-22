# Vice Shores — open-world crime (make.fun gta6-01)

[![make.fun](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01)
[![rank](https://make.fun/badge/gta6-01/wildanroby29/vice-shores/rank.svg)](https://make.fun/bounty/gta6-01)
[![reward](https://make.fun/badge/gta6-01/wildanroby29/vice-shores/reward.svg)](https://make.fun/bounty/gta6-01)

**Vice Shores** is a complete 3D open-world crime game in the spirit of GTA 6,
built with three.js (vendored) and plain static files. No Rockstar names, art,
or assets — the city, characters, vehicles, story and sounds are all original.

You are **Rook**, a new driver in the sun-soaked coastal city of Vice Shores.
The fixer **Marla** has eight jobs for you: steal cars, run packages, outrun
the Vice Shores Police Department, and pull the big score at Shore Bank.

## What is in the game

- A 3D low-poly coastal city at golden hour: beachfront boulevard, palms,
  ocean, pier, river and bridge, parks, parking lots and neon signs
- On foot (third-person) and by car (chase camera), with carjacking (E)
- Traffic and pedestrians who flee from crimes
- Wanted system 0–5 stars: police chases, ramming, roadblocks, helicopter
  with a spotlight, and getting busted
- 8 numbered story jobs with stages, payouts, dialogue and a respect ladder
  (NOBODY → HUSTLER → WHEELMAN → FIXER → BOSS)
- Dense HUD: job panel, VSPD dispatch list, wanted stars, money + clock,
  weapon slots, health/armor, minimap, crew abilities, radio, vehicle info
- Title screen with 3 save slots, pause, localStorage saves, garage shop
  (repair, respray, armour, nitro, ammo)
- Synthesized WebAudio sound: engine, sirens, shots, radio music — no files

## Play

Serve `game/` with any static server (`node serve.ts`, then
http://localhost:8080) and open it in desktop Chrome. No network requests.

- **W A S D** move / drive · **mouse drag** look · **SHIFT** sprint / nitro
- **CLICK / SPACE** shoot / handbrake · **E** enter / exit / steal car
- **1–4** weapons · **R** reload · **Q / C / V** crew abilities
- **G** garage (at Dockside Customs) · **P** pause · **M** mute

## Hand in

`main.ts` (Node 22) copies `game/` and `screenshots/` to `/output` and
writes `/output/dossier.json` with the vendored make.fun library.
