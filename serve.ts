// Vice Shores dev server: serves game/ on http://localhost:8080 (node serve.ts [--port N]).
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('./game', import.meta.url)));
const flag = process.argv.indexOf('--port');
const want = flag === -1 ? 8080 : Number(process.argv[flag + 1]);
const port = Number.isInteger(want) && want > 0 && want < 65536 ? want : 8080;

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
};

createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let path = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
  try { path = decodeURIComponent(path); } catch { res.writeHead(400).end('bad request'); return; }
  const file = resolve(join(root, normalize(path)));
  if (file !== root && !file.startsWith(root + sep)) { res.writeHead(403).end('forbidden'); return; }
  let size = 0;
  try { const s = statSync(file); if (!s.isFile()) throw new Error('x'); size = s.size; }
  catch { res.writeHead(404).end('not found'); return; }
  res.writeHead(200, { 'content-type': TYPES[extname(file).toLowerCase()] ?? 'application/octet-stream', 'content-length': size, 'cache-control': 'no-store' });
  createReadStream(file).pipe(res);
}).listen(port, '127.0.0.1', () => console.log(`game/ is on http://localhost:${port}`));
