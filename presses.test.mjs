// Press diversity (docs/skills.md): no one key carries a subclass, and every subclass skill gets pressed in the
// moment it's built for. Scripted players (balance.mjs), so this checks the planners read the board the way the
// skills ask them to, and that no skill is dead weight on the bar.
import test from 'node:test';
import assert from 'node:assert/strict';
import { score, fight, BRACKETS } from './balance.mjs';
import { ARCHETYPES, SUBS, isRunSkill, unlockLevel } from './dist/data.mjs';
import { defaultBar } from './dist/combat.mjs';

const POLICY = { breaker: 'Breaker', bastion: 'Bastion', infiltrator: 'Infiltrator', operator: 'Operator' };
const ALL = Object.entries(POLICY).flatMap(([cls, pol]) => Object.keys(ARCHETYPES[cls].subs).map((sub) => [cls, pol, sub]));
const at = (L) => ({ ...BRACKETS.filter((b) => b.level <= L).at(-1), name: 'Lv ' + L, level: L, server: L });

// At Lv 30, on the bar a player has then, the most-pressed key is under 45% of presses. The Sysop and the Herder
// lean on Spike most (43% and 41%, from 50% and 46%): a solo healer and a swarm both need a free hit between their
// big keys. Every other subclass's top key is under 40%.
test('no key carries a subclass at Lv 30: the most-pressed key is under 45% of presses for every subclass', () => {
  const off = [];
  for (const [, pol, sub] of ALL) {
    const r = score(pol, at(30), { sub });
    const total = Object.values(r.uses).reduce((a, n) => a + n, 0);
    const [top, n] = Object.entries(r.uses).sort((a, b) => b[1] - a[1])[0];
    if (n / total >= 0.45) off.push(`${sub}: ${top} ${Math.round((n / total) * 100)}%`);
  }
  assert.deepEqual(off, []);
});

// Each subclass skill on the bar four levels after it opens (at most 42), over fights that hold its moments:
// the bracket's own, worms (fragments, twins), elites (seals, more tells) and four strains (a Bricker's rage, a
// Leech's heals, Patchwork armor, an Overrun swarm). Every one is pressed at least once. Left out: the run skills
// (no slot) and Rebalance, which evens out a crew and has nothing to do alone.
const CREW_ONLY = ['rebalance'];
test('every subclass skill is pressed in the moments it is built for', () => {
  const dead = [];
  for (const [cls, pol, sub] of ALL) {
    for (const id of SUBS[sub].skills.filter((x) => !isRunSkill(x) && !CREW_ONLY.includes(x))) {
      const L = Math.min(42, unlockLevel(cls, id, sub) + 4), b = at(L), base = defaultBar(cls, sub, L);
      const bar = base.includes(id) ? base : [...base.slice(0, -1), id];
      let n = score(pol, b, { sub, bar }).uses[id] || 0;
      for (let i = 0; i < 6; i++) n += fight(pol, 'random', b, { sub, bar, seed: 900 + i, mode: 'run', zone: true, family: 'worm' }).uses?.[id] || 0;
      for (let i = 0; i < 6; i++) n += fight(pol, 'random', b, { sub, bar, seed: 950 + i, mode: 'run', zone: true, elite: true }).uses?.[id] || 0;
      for (const strain of ['patchwork', 'bricker', 'leech', 'overrun']) n += fight(pol, 'random', b, { sub, bar, seed: 990, mode: 'run', zone: true, strain }).uses?.[id] || 0;
      if (!n) dead.push(`${sub} ${id} (Lv ${L})`);
    }
  }
  assert.deepEqual(dead, []);
});
