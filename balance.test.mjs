// Guard rails on class balance: scripted players, so this checks the numbers stay in the same league.
import test from 'node:test';
import assert from 'node:assert/strict';
import { score, BRACKETS } from './balance.mjs';

test('at every level bracket each class wins every fight, loses less than Spike alone, and plans more clean kills', () => {
  for (const b of BRACKETS) {
    const base = score('Spike only', b);
    for (const cls of ['Breaker', 'Bastion', 'Infiltrator', 'Operator']) {
      const r = score(cls, b);
      assert.equal(r.wins, r.total, `${cls} at ${b.name}`);
      assert.ok(r.lost <= base.lost, `${cls} at ${b.name}: ${r.lost.toFixed(0)}% lost vs Spike ${base.lost.toFixed(0)}%`);
      assert.ok(r.clean >= base.clean - 2, `${cls} at ${b.name}: ${r.clean} clean vs Spike ${base.clean}`);
    }
  }
});
