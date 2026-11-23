// Goals in sight (dist/goals.mjs): the map tracker's list.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, hackerOf } from './dist/combat.mjs';
import { goalsOf } from './dist/goals.mjs';

test('goals: the nearest done first, three at most, nothing earned or untouched', () => {
  const s = fresh(); hackerOf(s).level = 6;
  assert.ok(goalsOf(s).every((x) => x.n > 0 && x.n < x.of), 'only goals under way');
  s.dex.kills = { x: 90 };
  const g = goalsOf(s);
  assert.ok(g.length >= 1 && g.length <= 3);
  assert.equal(g[0].id, 'c-win-100', '90 of 100 fights is nearest');
  assert.deepEqual([g[0].n, g[0].of], [90, 100]);
  for (let i = 1; i < g.length; i++) assert.ok(g[i - 1].n / g[i - 1].of >= g[i].n / g[i].of, 'furthest along first');
});
