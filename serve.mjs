// Local server for the game (http://127.0.0.1:4173) and the content editor (/editor.html).
// The editor saves through POST /__content/<story|contracts|items>, which writes dist/content/<name>.mjs.
// It only listens on 127.0.0.1, so nothing outside this computer can reach it.
import { createServer } from 'node:http';
import { readFile, writeFile, rename } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';

const root = resolve('dist');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.md': 'text/markdown; charset=utf-8' };
const CONTENT = ['story', 'contracts', 'items'];
const HEADER = "// Written in the content editor (editor.html). Safe to edit by hand too: it's JSON after 'export default'.\n";

async function save(req, res, name) {
  let body = '';
  for await (const chunk of req) { body += chunk; if (body.length > 2_000_000) { res.writeHead(413); return res.end('Too big'); } }
  let data;
  try { data = JSON.parse(body); } catch { res.writeHead(400); return res.end('Not JSON'); }
  const file = resolve(root, 'content', name + '.mjs');
  await writeFile(file + '.tmp', HEADER + 'export default ' + JSON.stringify(data, null, 2) + ';\n');
  await rename(file + '.tmp', file); // all or nothing
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ ok: true, file: 'dist/content/' + name + '.mjs' }));
}

createServer(async (req, res) => {
  try {
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const m = name.match(/^\/__content\/(\w+)$/);
    if (m && req.method === 'POST' && CONTENT.includes(m[1])) return await save(req, res, m[1]);
    const path = resolve(root, '.' + (name === '/' ? '/index.html' : name));
    if (!path.startsWith(root + sep)) { res.writeHead(403); return res.end(); }
    const file = await readFile(path);
    res.writeHead(200, { 'Content-Type': mime[extname(path)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(file);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(4173, '127.0.0.1', () => console.log('Game:   http://127.0.0.1:4173\nEditor: http://127.0.0.1:4173/editor.html'));
