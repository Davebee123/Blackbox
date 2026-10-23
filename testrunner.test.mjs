// The test runner (scripts/test.mjs): `npm test` skips a slow simulation only when nothing it loads has changed.
// These keep that rule honest: a change that could move a simulation's numbers always runs it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { SLOW, closureOf, plan } from './scripts/test.mjs';

const runs = (changed) => { const p = plan({ changed: new Set(changed) }); return p.slow.filter((f) => p.why[f].startsWith('runs')); };

test('every slow file exists, and each loads the combat engine and the game data', () => {
  for (const f of SLOW) {
    assert.ok(existsSync(f), f);
    const c = closureOf(f);
    assert.ok(c.has('dist/combat.mjs') && c.has('dist/data.mjs'), f);
  }
});

test('a change to the engine, the data or a slow file runs it; a stylesheet or the page script runs none', () => {
  assert.deepEqual(runs(['dist/combat.mjs']).length, SLOW.length);
  assert.deepEqual(runs(['dist/data.mjs']).length, SLOW.length);
  assert.deepEqual(runs(['dist/genes.mjs']).length, SLOW.length);
  assert.deepEqual(runs(['loop.test.mjs']), ['loop.test.mjs']);
  assert.deepEqual(runs(['dist/style.css', 'dist/app.js', 'README.md']), []);
});

test('a module reached only through another one still counts (the graph is followed all the way down)', () => {
  // gear.mjs is imported by combat.mjs, not by the tests themselves.
  assert.ok(runs(['dist/gear.mjs']).includes('balance.test.mjs'));
});

test('--full runs everything, --fast none of the slow files, and the fast files always run', () => {
  const all = plan({ mode: 'full' }), fast = plan({ mode: 'fast' });
  assert.equal(all.files.length, all.fast.length + SLOW.length);
  assert.equal(fast.files.length, fast.fast.length);
  assert.ok(fast.fast.includes('testrunner.test.mjs') && !fast.fast.some((f) => SLOW.includes(f)));
  assert.equal(plan({ changed: null }).files.length, all.files.length, 'no base to compare with: everything');
});
