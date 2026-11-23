// Hands the Vice Shores entry in.
//
// This program is the entrypoint the make.fun scorer runs: it copies the
// game (game/) and the four staged screenshots (screenshots/) from beside
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

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
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
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
}

writeFileSync(join(outDir, 'dossier.json'), buildDossier(outDir, caps));
