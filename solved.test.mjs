// solved.mjs's players and bar (docs/puzzle-fights.md section 5): the kit player reads nothing of the virus and leaves the
// switches as it found them, a learner on 0% is the planner, the routine player's fights are its program's, the Operator's
// report counts the beats that caught helpers, and the bar's floors and ceilings.
import test from 'node:test';
import assert from 'node:assert/strict';
import { at, fight, POLICIES } from './balance.mjs';
import { TELL } from './dist/data.mjs';
import { GENE_BOTS } from './dist/genes.mjs';
import { hooks } from './dist/combat.mjs';
import { kit, learner, play, misses, barOf, mimicCost } from './solved.mjs';

test('the kit player reads no tell and no gene, and puts both switches back', () => {
  const b = at(18), r = play('Breaker', 'kit', 'random', b, { seed: 3, mode: 'run', zone: true });
  assert.ok(r.cycles > 0);
  assert.equal(TELL.bots.answer, true);
  assert.equal(GENE_BOTS.ignore.size, 0);
  let seen = null;
  const smart = POLICIES.Breaker;
  POLICIES.Breaker = (s) => { const was = TELL.bots.answer; const t = kit(s); seen ??= was; return t; };
  try { fight('Breaker', 'random', b, { seed: 3, mode: 'run', zone: true }); } finally { POLICIES.Breaker = smart; }
  assert.equal(seen, true, 'between moves the switches are as they were');
});

test('a learner that never misreads plays the planner; one that always does plays the kit player', () => {
  const b = at(18), o = { seed: 5, mode: 'run', zone: true, family: 'ghostroot' };
  const same = (a, c) => assert.deepEqual([a.win, a.cycles, a.lostPct], [c.win, c.cycles, c.lostPct]);
  for (const C of ['Breaker', 'Operator']) {
    const smart = POLICIES[C];
    POLICIES[C] = learner(0, 1); const l0 = fight(C, 'random', b, o);
    POLICIES[C] = learner(1, 1); const l1 = fight(C, 'random', b, o);
    POLICIES[C] = smart;
    same(l0, play(C, 'planner', 'random', b, o));
    same(l1, play(C, 'kit', 'random', b, o));
  }
});

test("the routine player's fights are played by its program, which is uninstalled after", () => {
  const was = hooks.program;
  const r = play('Bastion', 'routine', 'random', at(18), { seed: 2, mode: 'run', zone: true });
  assert.ok(r.uses.program >= r.cycles - 1, 'it typed nothing');
  assert.equal(hooks.program, was);
  assert.ok(r.win, 'a prepared program wins an ordinary fight at its level');
});

test("the Operator's report: the Mimic's beat catches the blind player's helpers, and the planner keeps its own off it", () => {
  // A Herder at 18 against Ghostroot with a Mimic (the game's rule, tells.mjs mimicLands; helper-rules.test.mjs has the rule).
  const blind = mimicCost('herder', 'blind', 18, { seeds: 3 }), smart = mimicCost('herder', 'planner', 18, { seeds: 3 });
  assert.ok(blind.caught > 0, 'some beat caught a blind helper');
  assert.ok(smart.caught <= blind.caught, `the planner's helpers are caught no more often (${smart.caught} vs ${blind.caught})`);
  assert.equal(smart.wins, 100);
});

test('the bar: floors for the planner, routine and learner; the kit and blind players have no ceiling (docs/puzzle-levers.md 9)', () => {
  for (const tier of ['ordinary', 'elites', 'bosses']) for (const L of [10, 18, 30]) assert.equal(barOf(tier, L).blind, null);
  const ok = { planner: 90, routine: 88, rotation: 50, 'learner 30': 72, 'learner 15': 81, 'learner 5': 86, kit: 30, blind: 20 };
  assert.deepEqual(misses('ordinary', 18, ok), []);
  assert.deepEqual(misses('ordinary', 30, { ...ok, kit: 100, blind: 100 }), []);
  assert.deepEqual(misses('ordinary', 30, { ...ok, planner: 80 }), ['planner 80 < 85']);
  assert.deepEqual(misses('elites', 18, { ...ok, kit: 5, blind: 5 }), ['learner 30 72 > 50'], 'a hard fight whose first try usually wins is not hard to learn');
  assert.deepEqual(misses('bosses', 18, { ...ok, routine: null, 'learner 30': 20, kit: 5, blind: 6 }), []);
});
