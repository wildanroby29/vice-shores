// Hands the Vice Shores entry in.
//
// This program is the entrypoint the make.fun scorer runs: it copies the
// game (game/) and the three staged screenshots (screenshots/) from beside
// this file into the output directory, then writes dossier.json there with
// the vendored make.fun library. The dossier is the judge's view of the
// entry — a contact sheet of the screenshots plus the game's sources, each
// under its own heading — so the sources themselves carry the description:
// every system is documented in its own file, in its own words, and the
// text the judge reads is the sum of those sources, capped at 160 KiB.
//
// Run it outside the grader with MAKEFUN_OUTPUT_DIR standing in for
// /output (Node 22, standard library only):
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps for this bounty: the text is capped at 160 KiB, at most
// four screenshots of at most 256 KiB each, and the game itself at most 993
// files and 48 MiB with no path over 1000 bytes.
const caps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

mkdirSync(outDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
// The dossier ships exactly the shots listed in shots.json: copy only
// those files, and fail loudly if one is missing or over the 256 KiB cap,
// so a stale or oversized frame can never slip into the entry.
const shotList = JSON.parse(readFileSync(join(repoRoot, 'shots.json'), 'utf8'));
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
for (const shot of shotList) {
  const src = join(repoRoot, 'screenshots', shot.name);
  if (!existsSync(src)) throw new Error(`missing screenshot: ${shot.name}`);
  const bytes = statSync(src).size;
  if (bytes > caps.screenshots.max_bytes) {
    throw new Error(`screenshot over 256 KiB: ${shot.name} (${bytes} bytes)`);
  }
  copyFileSync(src, join(outDir, 'screenshots', shot.name));
}

writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, caps));
