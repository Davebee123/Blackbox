// Guard rails on class balance: scripted players, so this checks the numbers stay in the same league.
// Targets not met yet are `todo` tests: they run and report, but don't fail the suite until their phase lands.
import test from 'node:test';
import assert from 'node:assert/strict';
import { score, hardScore, BRACKETS } from './balance.mjs';

const CLASSES = ['Breaker', 'Bastion', 'Infiltrator', 'Operator'];
const runs = Object.fromEntries(BRACKETS.map((b) => [b.name, Object.fromEntries(CLASSES.map((c) => [c, score(c, b)]))]));

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

test('the hard slice (every open strain, grade 2 wilds, wilds 2 levels up) is beatable but risky: each class wins at least 55%, and at Lv 10 some class loses two or more', () => {
  for (const b of BRACKETS) {
    const rs = CLASSES.map((cls) => hardScore(cls, b));
    rs.forEach((r, i) => assert.ok(r.wins >= 0.55 * r.total, `${CLASSES[i]} hard at ${b.name}: ${r.wins}/${r.total}`));
    if (b.name === 'Lv 10') assert.ok(rs.some((r) => r.total - r.wins >= 2), `Lv 10 hard: ${rs.map((r) => `${r.wins}/${r.total}`).join(' ')}: nothing can beat you`);
  }
});

test('no class drifts far out of the band: under 55% lost, and within 40 points of each other', () => {
  for (const b of BRACKETS) {
    const lost = CLASSES.map((c) => runs[b.name][c].lost);
    for (const [i, l] of lost.entries()) assert.ok(l < 55, `${CLASSES[i]} at ${b.name}: ${l.toFixed(0)}%`);
    assert.ok(Math.max(...lost) - Math.min(...lost) <= 40, `${b.name}: ${lost.map((l) => l.toFixed(0)).join(' / ')}`);
  }
});

// The early game (Lv 10) costs more than the long middle (Lv 18 and up).
const band = () => () => {
  const off = [];
  for (const b of BRACKETS) {
    const [lo, hi] = b.level >= 18 ? [22, 40] : b.level >= 10 ? [35, 50] : [28, 55];
    const lost = CLASSES.map((c) => runs[b.name][c].lost);
    lost.forEach((l, i) => { if (l < lo || l > hi) off.push(`${CLASSES[i]} ${b.name} ${l.toFixed(0)}%`); });
    if (Math.max(...lost) - Math.min(...lost) > 15) off.push(`${b.name} spread ${(Math.max(...lost) - Math.min(...lost)).toFixed(0)}`);
  }
  assert.deepEqual(off, []);
};
test('target band: a fight at your level costs every class 35–50% at Lv 10, 22–40% from Lv 18, 28–55% at Lv 1; classes within 15 points', { todo: 'class tuning: Bastion runs high and Operator low at Lv 10–12' }, band());
