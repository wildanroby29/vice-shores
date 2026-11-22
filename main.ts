// Vice Shores — a complete 3D open-world crime game for make.fun gta6-01.
// Node 22, standard library only. This program hands the game in: it copies
// game/ (the playable game, static files) and screenshots/ (four real renders
// of the game) from beside this file into /output, then writes the dossier
// the judge reads with the vendored make.fun library.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for /output:
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
// The four screenshots are real renders of the game itself (Playwright,
// headless Chromium, ?shot= staging) — they are the judge's dossier images.
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The sealed gate's own caps (reference/gate.json): text_max_bytes shapes the
// dossier text; the rest refuse an entry the scorer would refuse — more than
// 4 screenshots or one over 256 KiB, more than 993 files in game/ or 48 MiB
// of game files in all, or a path under game/ over 1000 bytes.
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
