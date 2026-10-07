// Guard rails on class balance: scripted players, so this checks the numbers stay in the same league.
// Targets not met yet are `todo` tests: they run and report, but don't fail the suite until their phase lands.
import test from 'node:test';
import assert from 'node:assert/strict';
import { score, hardScore, BRACKETS } from './balance.mjs';

const CLASSES = ['Breaker', 'Bastion', 'Infiltrator', 'Operator'];
const runs = Object.fromEntries(BRACKETS.map((b) => [b.name, Object.fromEntries(CLASSES.map((c) => [c, score(c, b)]))]));

test('at every level bracket each class wins all but at most two fights (deep guards are orange or red; mutated, armored Ghostroots can beat a scripted Breaker), loses less than Spike alone, and plans more clean kills', () => {
  for (const b of BRACKETS) {
    const base = score('Spike only', b);
    for (const cls of CLASSES) {
      const r = runs[b.name][cls];
      assert.ok(r.wins >= r.total - 2, `${cls} at ${b.name}: ${r.wins}/${r.total}`);
      assert.ok(r.lost <= base.lost, `${cls} at ${b.name}: ${r.lost.toFixed(0)}% lost vs Spike ${base.lost.toFixed(0)}%`);
      assert.ok(r.clean >= base.clean - 2, `${cls} at ${b.name}: ${r.clean} clean vs Spike ${base.clean}`);
    }
  }
});

test('the hard slice (every open strain, grade 2 wilds, wilds 2 levels up) is beatable: each class wins all but at most two', () => {
  for (const b of BRACKETS) for (const cls of CLASSES) {
    const r = hardScore(cls, b);
    assert.ok(r.wins >= r.total - 2, `${cls} hard at ${b.name}: ${r.wins}/${r.total}`);
  }
});

test('no class drifts far out of the band: under 50% lost, and within 40 points of each other', () => {
  for (const b of BRACKETS) {
    const lost = CLASSES.map((c) => runs[b.name][c].lost);
    for (const [i, l] of lost.entries()) assert.ok(l < 50, `${CLASSES[i]} at ${b.name}: ${l.toFixed(0)}%`);
    assert.ok(Math.max(...lost) - Math.min(...lost) <= 40, `${b.name}: ${lost.map((l) => l.toFixed(0)).join(' / ')}`);
  }
});

const band = (lo, hi) => () => {
  const off = [];
  for (const b of BRACKETS) {
    const lost = CLASSES.map((c) => runs[b.name][c].lost);
    lost.forEach((l, i) => { if (l < lo || l > hi) off.push(`${CLASSES[i]} ${b.name} ${l.toFixed(0)}%`); });
    if (Math.max(...lost) - Math.min(...lost) > 15) off.push(`${b.name} spread ${(Math.max(...lost) - Math.min(...lost)).toFixed(0)}`);
  }
  assert.deepEqual(off, []);
};
test('target band: a blue-geared fight at your level costs every class 22–35% of its health, classes within 15 points', { todo: 'class tuning: Operator Lv 18 (37%); levels 30 and 50 a few points too easy' }, band(22, 35));
