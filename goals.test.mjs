// Goals in sight (dist/goals.mjs): the map's Goals tracker, pins first, then the goals nearest done.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, hackerOf } from './dist/combat.mjs';
import { goalsOf, refreshGoals, togglePin, foldGoals, pinKeys, GOALS } from './dist/goals.mjs';

const mk = () => { const s = fresh(); hackerOf(s).level = 6; s.pace = { kills: 0, ms: 0 }; return s; };

test('the auto rows: goals under way and in reach, the nearest done first, three at most; no class climb', () => {
  const s = mk();
  s.dex.kills = { x: 90 };
  refreshGoals(s);
  const g = goalsOf(s);
  assert.ok(g.length >= 1 && g.length <= GOALS.rows);
  assert.equal(g[0].key, 'a:c-win-100', '90 of 100 fights is nearest');
  for (const x of g) assert.ok(x.n > 0 && x.n < x.of && x.n / x.of >= GOALS.minShare && x.cat !== 'class', x.key);
  for (let i = 1; i < g.length; i++) assert.ok(g[i - 1].n / g[i - 1].of >= g[i].n / g[i].of, 'furthest along first');
});

test('the rows hold still until a calm moment; then a goal that moved goes first', () => {
  const s = mk();
  s.dex.kills = { x: 90 };
  refreshGoals(s);
  const before = goalsOf(s).map((g) => g.key);
  s.hubFound = { kestrel: true, glassjaw: true }; // Five Points moves: 1 of 5 to 3 of 5
  assert.deepEqual(goalsOf(s).map((g) => g.key), before, 'no reshuffle mid-session');
  s.pace.ms += 60_000;
  refreshGoals(s);
  assert.equal(goalsOf(s)[0].key, 'a:x-hubs', 'the one that just moved leads');
  s.pace.ms += GOALS.movedMs + 1;
  refreshGoals(s);
  assert.equal(goalsOf(s)[0].key, 'a:c-win-100', 'half an hour on, back to the nearest done');
});

test('pins come first, three at most across pieces and achievements; unpinning hands the row back', () => {
  const s = mk();
  s.dex.kills = { x: 50 };
  refreshGoals(s);
  assert.ok(togglePin(s, 'a:c-win-100'));
  assert.deepEqual(pinKeys(s), ['a:c-win-100']);
  assert.ok(goalsOf(s)[0].pinned && goalsOf(s)[0].key === 'a:c-win-100');
  assert.equal(togglePin(s, 'a:c-win-100'), false);
  assert.deepEqual(pinKeys(s), []);
  s.goals.pins = ['a:c-win-100', 'a:x-hubs', 'a:c-elites'];
  assert.equal(togglePin(s, 'a:cl-breaker'), false, 'full');
});

test('the header folds it, kept on the save', () => {
  const s = mk();
  assert.equal(foldGoals(s), true);
  assert.equal(JSON.parse(JSON.stringify(s)).goals.shut, true);
  assert.equal(foldGoals(s), false);
});
