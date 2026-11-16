// scripts/build.mjs: the hosted game as one script and one stylesheet, every asset beside them. Skips without esbuild
// (npm ci).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, relative, extname } from 'node:path';
import { tmpdir } from 'node:os';

const esbuild = existsSync('node_modules/esbuild');
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));

test('the build is one script and one stylesheet, with every asset and nothing of the source code', { skip: !esbuild && 'esbuild not installed (npm ci)' }, async () => {
  const { buildGame } = await import('./scripts/build.mjs');
  const out = mkdtempSync(join(tmpdir(), 'bb-build-'));
  try {
    const r = await buildGame(out);
    const html = readFileSync(join(out, 'index.html'), 'utf8');
    const scripts = [...html.matchAll(/<script[^>]*src="([^"]+)"/g)].map((m) => m[1]);
    const sheets = [...html.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)].map((m) => m[1]);
    assert.deepEqual(scripts, [r.script]);
    assert.deepEqual(sheets, [r.style]);
    assert.match(r.script, /^app-\w+\.js$/, 'at the root, so import.meta.url finds sfx/');
    const files = walk(out).map((f) => relative(out, f));
    assert.deepEqual(files.filter((f) => ['.js', '.mjs', '.css'].includes(extname(f))).sort(), [r.script, r.style].sort(), 'no chunks, no source modules');
    assert.ok(!files.includes('editor.html'), 'the editor is dev only');
    for (const f of walk('dist').map((x) => relative('dist', x))) if (!['.js', '.mjs', '.css'].includes(extname(f)) && f !== 'editor.html') assert.ok(files.includes(f), `${f} copied`);
    const js = readFileSync(join(out, r.script), 'utf8');
    assert.doesNotMatch(js, /\bimport\s*\(\s*["'`]\.|\bfrom\s*["']\./, 'every import inlined');
    const css = readFileSync(join(out, r.style), 'utf8').replace(/url\((["']?)data:.*?\1\)/g, '');
    for (const m of css.matchAll(/url\(["']?([^)"'#][^)"']*)["']?\)/g)) assert.ok(existsSync(join(out, m[1])), `${m[1]} in the stylesheet exists`);
    assert.ok(html.includes('<script type="module"'), 'still a module (top-level await, import.meta.url)');
  } finally { rmSync(out, { recursive: true, force: true }); }
});
