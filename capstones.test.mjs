// The capstone row (docs/progression.md 7): two capstones under each subclass's tree, on points of their own: one at
// level 45 picks one, one at 50 gives it its second rank. Its points go nowhere
// else. Each capstone's rule: the class modules (dist/classes/*.mjs), read with capValue.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, takenMult, freeTiers, tiersOf, capstonePoints, capRank, capValue, capState, kitOf, selectEncounter, resolveCycle, active, defender, livingParts, maxSignal } from './dist/combat.mjs';
import { LOADOUT, SUBS, TREE } from './dist/data.mjs';
import { build, at } from './balance.mjs';
import { planner } from './dist/planner.mjs';

const last = (s, text) => command(s, text).at(-1).message;
// Fill the regular tree as a player would (balance.mjs's order), with no capstone picked.
const filled = (cls, sub, level) => { const s = fresh(); build(s, cls, at(level), { sub, capstone: null, noGear: true }); return s; };

test('every subclass has a capstone row: two capstones, two ranks each, a rule a rank, the second rank a bigger number', () => {
  assert.deepEqual(LOADOUT.capstoneAt, [45, 50]);
  assert.equal(TREE.at(-1).kind, 'capstone');
  const ids = new Set();
  for (const [sub, kit] of Object.entries(SUBS)) {
    assert.equal(kit.capstones?.length, 2, sub);
    for (const c of kit.capstones) {
      assert.ok(!ids.has(c.id), `${c.id} is unique`); ids.add(c.id);
      assert.equal(c.max, 2); assert.equal(c.rules.length, 2); assert.equal(c.ranks.length, 2);
      assert.ok(c.ranks[1] !== c.ranks[0], `${c.name}: rank 2 changes its number`);
      assert.match(c.rules[0], /\.$/); assert.ok(c.rules[0] !== c.rules[1], `${c.name}: rank 2 reads differently`);
      assert.ok(c.rules[0].length <= 110 && !/;/.test(c.rules[0]), `${c.name}: one terse rule`);
    }
  }
  assert.equal(ids.size, 16);
});

test('capstone points: one at 45, two at 50; the tiers are all open by then', () => {
  const s = filled('breaker', 'demolitionist', 44);
  assert.equal(capstonePoints(s), 0);
  assert.equal(capState(s, 'breaker'), 'locked');
  assert.match(last(s, 'talent capstone a'), /Capstones come at level 45/);
  for (const [L, cp] of [[45, 1], [49, 1], [50, 2]]) {
    s.hackers.breaker.level = L;
    assert.equal(capstonePoints(s), cp, `level ${L}`);
    assert.equal(freeTiers(s), 0, `level ${L}: every tier picked`);
  }
});

test('the capstone row: picked on its own point, rank 2 at 50, swapping free, a reset clears it', () => {
  const s = filled('breaker', 'demolitionist', 50);
  const demo = kitOf(s).capstones, tiers = [...tiersOf(s, 'breaker')];
  assert.equal(capState(s, 'breaker'), 'open');
  assert.match(last(s, 'talent capstone a'), new RegExp(`${demo[0].name} \\(rank 2/2\\)`));
  assert.equal(capRank(s, demo[0].id), 2, 'rank 2 at 50');
  assert.equal(capValue(s, demo[0].id), demo[0].ranks[1]);
  assert.equal(capRank(s, demo[1].id), 0);
  assert.deepEqual(tiersOf(s, 'breaker'), tiers, 'the tiers are untouched');
  assert.match(last(s, 'talent capstone b'), new RegExp(demo[1].name));
  assert.equal(capRank(s, demo[1].id), 2); assert.equal(capRank(s, demo[0].id), 0);
  s.hackers.breaker.level = 45;
  assert.equal(capRank(s, demo[1].id), 1); assert.equal(capValue(s, demo[1].id), demo[1].ranks[0]);
  assert.match(last(s, 'talent reset'), /and your capstone/);
  assert.equal(capRank(s, demo[1].id), 0);
});

// One rule each, checked on a fight: the capstone changes what it says it changes.
test('capstone rules do what they say: a sample fight logs each one', () => {
  const said = (sub, cap, re, seeds = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) => {
    for (const seed of seeds) {
      const s = fresh(); build(s, SUBS[sub].cls, at(50), { sub, capstone: cap });
      s.rng = (seed * 2654435761 + 6) >>> 0;
      s.run = { loc: 'sim', cwd: '/', integrity: maxSignal(s), max: maxSignal(s), pack: [], visited: ['/'] };
      selectEncounter(s, 'random', seed, { mode: 'run', room: '/sim', level: 50, zone: true });
      s.encounter.soft = 1;
      command(s, 'engage');
      for (let n = 0; n < 80 && active(s); n++) { command(s, planner(s) || 'hold'); resolveCycle(s); }
      if (s.logs.some((x) => re.test(x.message))) return true;
    }
    return false;
  };
  const cases = [
    ['demolitionist', 0, /Structural Failure/], ['overclocker', 0, /Arc Flash/], ['overclocker', 1, /Thermal Paste/],
    ['warden', 1, /Eye for an Eye/], ['sysop', 0, /Root Cause/], ['sysop', 1, /Warm Standby/],
    ['payload', 0, /Pandemic/], ['payload', 1, /Siphon/], ['phantom', 0, /Ghost Step/], ['phantom', 1, /Smoke and Mirrors/],
    ['herder', 0, /Thundering Herd/], ['herder', 1, /Sandbox/], ['hijacker', 0, /taken over for [3-9] cycles/],
  ];
  for (const [sub, cap, re] of cases) assert.ok(said(sub, cap, re), `${sub} ${SUBS[sub].capstones[cap].name}`);
});

test('the passive capstones change the numbers: Iron Curtain, Load-Bearing Wall and Dead Air cut what lands on you', () => {
  const setup = (cls, sub, cap) => { const s = fresh(); build(s, cls, at(50), { sub, capstone: cap }); s.run = { loc: 'sim', cwd: '/', integrity: maxSignal(s), max: maxSignal(s), pack: [], visited: ['/'] }; selectEncounter(s, 'random', 3, { mode: 'run', room: '/sim', level: 50, zone: true }); command(s, 'engage'); return s; };
  const r2 = (sub, j) => SUBS[sub].capstones[j].ranks[1];
  // Iron Curtain: the part that last hit you (Grudge's part).
  const w = setup('bastion', 'warden', 0), p = livingParts(w).find((x) => x.attack);
  w.encounter.grudge = null; const before = takenMult(w, p);
  w.encounter.grudge = p.id;
  assert.ok(Math.abs(takenMult(w, p) / before - (1 - r2('warden', 0))) < 1e-9, 'the part that last hit you hits softer');
  // Load-Bearing Wall: the last part standing.
  const d = setup('breaker', 'demolitionist', 1), q = livingParts(d).find((x) => x.attack), many = takenMult(d, q);
  for (const x of livingParts(d).filter((y) => y !== q)) x.integrity = 0;
  assert.ok(Math.abs(takenMult(d, q) / many - (1 - r2('demolitionist', 1))) < 1e-9, 'the last part standing hits softer');
  // Dead Air: a Jammed part.
  const h = setup('operator', 'hijacker', 1), j = livingParts(h).find((x) => x.attack), free = takenMult(h, j);
  j.jammedUntil = h.encounter.cycle + 1;
  assert.ok(Math.abs(takenMult(h, j) / free - (1 - r2('hijacker', 1))) < 1e-9, 'a Jammed part hits softer');
});
