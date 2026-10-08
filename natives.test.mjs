// Native uniques keep the class bands (network.mjs, docs/networks.md). Its own file: network.test.mjs loads run.mjs,
// whose hooks change how a bare balance fight runs (as farmsim.mjs says of itself).
import test from 'node:test';
import assert from 'node:assert/strict';
import { score, BRACKETS, soloBand } from './balance.mjs';
import { ARCHETYPES } from './dist/data.mjs';
import { UNIQUES } from './dist/combat.mjs';
import { NATIVE_POOL } from './dist/network.mjs';
import { BASES, protocolSlots, SLOT_KINDS } from './dist/gear.mjs';

// Native uniques in the balance harness (balance.mjs, opts.uniques): each one in place of the blue in its slot, on
// every subclass, at the bracket it first fits (10, 18 or 30). They're sidegrades: no subclass leaves the band
// (balance.mjs soloBand's floor, 15%, to 52% lost, the Bastions, which lean crew, anywhere under 52%; at least 80%
// wins) and none moves a bracket's average more than 4 points. The floor was 20% until the tells' window and burst:
// a clean answer now staggers the part (Open, its next attack a cycle later), so the strongest readers sit at 17–20%
// on plain blues (the Demolitionist at Lv 18, the Phantom at 30), inside the class band.
test('native uniques keep the bands: sidegrades, not upgrades', () => {
  const CLASSES = ['Breaker', 'Bastion', 'Infiltrator', 'Operator'];
  const SUBS = CLASSES.flatMap((c) => Object.keys(ARCHETYPES[c.toLowerCase()].subs).map((sub) => [c, sub]));
  const off = [];
  const brackets = BRACKETS.filter((b) => [10, 18, 30].includes(b.level));
  for (const [i, b] of brackets.entries()) {
    const lo = i ? brackets[i - 1].level + 3 : 1;
    const slots = SLOT_KINDS.slice(0, protocolSlots(b.level)).filter((k) => k !== 'implant' || b.level >= 15);
    const ids = NATIVE_POOL.filter((id) => UNIQUES[id].level >= lo && UNIQUES[id].level <= b.level + 2 && slots.includes(BASES[UNIQUES[id].base].slot));
    const base = Object.fromEntries(SUBS.map(([c, sub]) => [sub, score(c, b, { sub })]));
    for (const id of ids) {
      let d = 0;
      for (const [c, sub] of SUBS) {
        const r = score(c, b, { sub, uniques: [id] });
        d += r.lost - base[sub].lost;
        if (r.lost < soloBand(sub)[0] || r.lost > 52) off.push(`${id} ${sub} ${b.name} ${r.lost.toFixed(0)}%`);
        if (r.wins < 0.8 * r.total) off.push(`${id} ${sub} ${b.name} ${r.wins}/${r.total}`);
      }
      if (Math.abs(d / SUBS.length) > 4) off.push(`${id} ${b.name} moves the average ${(d / SUBS.length).toFixed(1)}`);
    }
  }
  assert.deepEqual(off, []);
});
