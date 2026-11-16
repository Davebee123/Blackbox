// The dissolve on a canvas (dissolvefx.mjs; docs/performance-plan.md batch 4): its glyphs run the keyframes the old
// per-glyph Web Animations ran, eased out the CSS way.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { easeOut, at, colourAt } from './dist/dissolvefx.mjs';

test('the easing is CSS ease-out, cubic-bezier(0, 0, 0.58, 1)', () => {
  assert.equal(easeOut(0), 0); assert.equal(easeOut(1), 1);
  assert.ok(Math.abs(easeOut(0.5) - 0.685) < 0.003);
  assert.ok(Math.abs(easeOut(0.25) - 0.378) < 0.003); // steep at the start: it can't be flat there
  for (let x = 0.01; x < 1; x += 0.01) assert.ok(easeOut(x) > easeOut(x - 0.01));
});

test('a glyph reads its keyframes as straight lines between offsets', () => {
  const o = [[0, 0], [0.1, 0], [0.2, 0.9], [0.5, 0.75], [1, 0]];
  assert.equal(at(o, 0.05), 0);
  assert.ok(Math.abs(at(o, 0.15) - 0.45) < 1e-9);
  assert.ok(Math.abs(at(o, 0.75) - 0.375) < 1e-9);
  assert.equal(at(o, 1), 0);
  const c = [[0, [0, 0, 0]], [1, [252, 126, 60]]], n = colourAt(c, 0.5); // channels in steps of 12
  assert.deepEqual([Math.floor(n / 484), Math.floor(n / 22) % 22, n % 22], [11, 5, 3]);
});

test('the dissolve is one canvas: no element or timer a glyph, and a setting can pick fewer bits or a fade', () => {
  const hit = readFileSync('dist/hitfx.mjs', 'utf8');
  assert.match(hit, /drawDissolve\(layer, out, f\.scale\)/);
  assert.doesNotMatch(hit, /setInterval/);
  assert.match(hit, /dissolveMode = \(\) => 'all'/);
  assert.match(hit, /fewer: \{ letters: \d+, cells: \d+ \}/);
  assert.match(readFileSync('dist/style.css', 'utf8'), /\.dissolve-fade \.brow\.dying \.part-top \{ visibility: visible; \}/);
});
