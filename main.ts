// Vice Shores — a gta6-01 entry (Node 22, standard library only). The game is this
// directory's game/ folder: plain static files a desktop browser loads offline
// (game/index.html, its ES modules, and the vendored three.js at game/vendor/three.min.js;
// no network request at runtime). This program hands it in: it copies game/ and
// screenshots/ from beside this file to /output and writes /output/dossier.json, the
// summary the judge reads, with the vendored make.fun library.
//
// Vice Shores itself is a 3D low-poly open-world crime game: a 2560x1920 sun-soaked
// coastal city at golden hour, third-person on foot and behind the car, traffic and
// pedestrians, stealing cars, a 0-5 star wanted system with police cars, a helicopter and
// roadblocks, eight numbered story missions for the fixer Marla, a respect/rank ladder,
// crew abilities, weapons with ammo, health and armour, a dense HUD with a live minimap,
// a title screen with three save slots, a garage/upgrade shop, a localStorage save, and
// synthesized WebAudio sound.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080
// (screenshot scenes: ?shot=<name>&seed=7, e.g. ?shot=1-chase&seed=7).
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the
// others refuse an entry the scorer would refuse (more than 4 screenshots or one over
// 256 KiB; more than 993 files in game/ or 48 MiB of game files, in all, or a path under
// game/ over 1000 bytes: game/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
