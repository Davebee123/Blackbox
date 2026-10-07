// Guard rails on class balance: scripted players, so this checks the numbers stay in the same league.
// Targets not met yet are `todo` tests: they run and report, but don't fail the suite until their phase lands.
import test from 'node:test';
import assert from 'node:assert/strict';
import { score, hardScore, BRACKETS } from './balance.mjs';
import { ARCHETYPES, SUBCLASS } from './dist/data.mjs';

const CLASSES = ['Breaker', 'Bastion', 'Infiltrator', 'Operator'];
const runs = Object.fromEntries(BRACKETS.map((b) => [b.name, Object.fromEntries(CLASSES.map((c) => [c, score(c, b)]))]));
// Every subclass (from SUBCLASS.from): [policy, sub].
const SUBS = CLASSES.flatMap((c) => Object.keys(ARCHETYPES[c.toLowerCase()].subs).map((sub) => [c, sub]));
const subRuns = Object.fromEntries(BRACKETS.filter((b) => b.level >= SUBCLASS.from).map((b) => [b.name, Object.fromEntries(SUBS.map(([c, sub]) => [sub, score(c, b, { sub })]))]));

test('at every level bracket each class wins at least 85% of fights at its level, loses less than Spike alone, and plans more clean kills', () => {
  for (const b of BRACKETS) {
    const base = score('Spike only', b);
    for (const cls of CLASSES) {
      const r = runs[b.name][cls];
      assert.ok(r.wins >= 0.85 * r.total, `${cls} at ${b.name}: ${r.wins}/${r.total}`);
      assert.ok(r.lost <= base.lost, `${cls} at ${b.name}: ${r.lost.toFixed(0)}% lost vs Spike ${base.lost.toFixed(0)}%`);
      assert.ok(r.clean >= base.clean - 2, `${cls} at ${b.name}: ${r.clean} clean vs Spike ${base.clean}`);
    }
  }
});

test('the hard slice (every open strain, grade 2 wilds, wilds 2 levels up) is beatable but risky: each class and subclass wins at least 55%, and at Lv 10 some class loses two or more', () => {
  for (const b of BRACKETS) {
    const who = b.level >= SUBCLASS.from ? SUBS : CLASSES.map((c) => [c, undefined]);
    const rs = who.map(([c, sub]) => hardScore(c, b, { sub }));
    rs.forEach((r, i) => assert.ok(r.wins >= 0.55 * r.total, `${who[i][1] || who[i][0]} hard at ${b.name}: ${r.wins}/${r.total}`));
    if (b.name === 'Lv 10') assert.ok(rs.some((r) => r.total - r.wins >= 2), `Lv 10 hard: ${rs.map((r) => `${r.wins}/${r.total}`).join(' ')}: nothing can beat you`);
  }
});

test('every subclass is viable at Lv 10, 18 and 30: at least 85% wins, 25–50% lost, all eight within 22 points', () => {
  for (const b of BRACKETS.filter((x) => x.level >= SUBCLASS.from && x.level <= 30)) {
    const rs = SUBS.map(([, sub]) => [sub, subRuns[b.name][sub]]);
    for (const [sub, r] of rs) {
      assert.ok(r.wins >= 0.85 * r.total, `${sub} at ${b.name}: ${r.wins}/${r.total}`);
      assert.ok(r.lost >= 25 && r.lost <= 50, `${sub} at ${b.name}: ${r.lost.toFixed(0)}%`);
    }
    const lost = rs.map(([, r]) => r.lost);
    assert.ok(Math.max(...lost) - Math.min(...lost) <= 22, `${b.name}: ${rs.map(([sub, r]) => `${sub} ${r.lost.toFixed(0)}`).join(' / ')}`);
  }
});

test('no class drifts far out of the band: under 55% lost, and within 40 points of each other', () => {
  for (const b of BRACKETS) {
    const lost = CLASSES.map((c) => runs[b.name][c].lost);
    for (const [i, l] of lost.entries()) assert.ok(l < 55, `${CLASSES[i]} at ${b.name}: ${l.toFixed(0)}%`);
    assert.ok(Math.max(...lost) - Math.min(...lost) <= 40, `${b.name}: ${lost.map((l) => l.toFixed(0)).join(' / ')}`);
  }
});

// The friction target (friction.mjs TARGET.blues): a same-level fight costs every subclass 35–45% of its
// Signal at Lv 10, 18 and 30, all eight within about 10 points (Lv 1: 28–55%, before subclasses).
const band = () => () => {
  const off = [];
  for (const b of BRACKETS.filter((x) => x.level <= 30)) {
    const [lo, hi] = b.level >= SUBCLASS.from ? [35, 45] : [28, 55];
    const rs = b.level >= SUBCLASS.from ? SUBS.map(([, sub]) => [sub, subRuns[b.name][sub]]) : CLASSES.map((c) => [c, runs[b.name][c]]);
    rs.forEach(([who, r]) => { if (r.lost < lo || r.lost > hi) off.push(`${who} ${b.name} ${r.lost.toFixed(0)}%`); });
    const lost = rs.map(([, r]) => r.lost);
    if (b.level >= SUBCLASS.from && Math.max(...lost) - Math.min(...lost) > 12) off.push(`${b.name} spread ${(Math.max(...lost) - Math.min(...lost)).toFixed(0)}`);
  }
  assert.deepEqual(off, []);
};
test('target band: a fight at your level costs every subclass 35–45% at Lv 10, 18 and 30 (28–55% at Lv 1), within about 10 points', { todo: 'Lv 10: these 20 seeds run 29–33% for five of eight (wider samples: 35–46%); the Sysop sits at 27–29% from Lv 18 (it ends fights healed, and pays in wins and time instead); the Overclocker runs 45–48%' }, band());
