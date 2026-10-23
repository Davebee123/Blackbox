// ASCII art never shows a scrollbar: the global pre rule (dist/style.css) scrolls on overflow, so every <pre> that draws
// art sets overflow itself (the designer saw a bar beside the class emblems, then beside the level-up's big number).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

// The <pre> blocks that hold text which may run long, and may scroll.
const TEXT = new Set(['bx-term', 'intro-tty', 'metrics']);
// Art styled through its wrapper's rule: a daemon's two sprite frames take .spr pre (daemons.css).
const VIA = { 'spr-a': 'spr pre', 'spr-b': 'spr pre' };

test('every art <pre> in dist sets its own overflow, so it never scrolls', () => {
  const files = readdirSync('dist');
  const code = files.filter((f) => /\.(mjs|js)$/.test(f)).map((f) => readFileSync(`dist/${f}`, 'utf8')).join('\n');
  const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(`dist/${f}`, 'utf8')).join('\n');
  const art = new Set([...code.matchAll(/<pre class="([\w-]+)/g)].map((m) => m[1]).filter((c) => !TEXT.has(c)));
  assert.ok(art.has('lu-b-big') && art.has('sk-emblem'), [...art].join(' '));
  for (const c of art) {
    const sel = (VIA[c] ?? c).replace(' ', '\\s+');
    const rules = [...css.matchAll(new RegExp(`[^{}]*\\.${sel}\\b[^{}]*\\{([^}]*)\\}`, 'g'))].map((m) => m[1]).join(';');
    assert.match(rules, /overflow:\s*(visible|hidden)/, `.${c} sets no overflow, so the global pre rule can scroll it`);
  }
});

test('a <pre> with no class of its own is art only when aria-hidden, and aria-hidden art never scrolls', () => {
  assert.match(readFileSync('dist/style.css', 'utf8'), /pre\[aria-hidden="true"\] \{ max-height: none; overflow: visible; \}/);
  // The profile card's class emblems (the designer saw a bar beside the Bastion's), its banner presets, the reward banners.
  for (const f of ['profile-view.mjs', 'achievements-view.mjs']) assert.match(readFileSync(`dist/${f}`, 'utf8'), /<pre aria-hidden="true">/, f);
});
