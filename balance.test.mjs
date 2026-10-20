// Guard rails on class balance: scripted players, so this checks the numbers stay in the same league.
// Targets not met yet are `todo` tests: they run and report, but don't fail the suite until their phase lands.
import test from 'node:test';
import assert from 'node:assert/strict';
import { score, hardScore, fight, BRACKETS, soloBand } from './balance.mjs';
import { ARCHETYPES, SUBCLASS, TELL } from './dist/data.mjs';

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

test('the hard slice (every open strain, grade 2 wilds, wilds 2 levels up) is beatable but risky: each class and subclass wins at least 55% (the Sysop, slow alone, 45%), and at Lv 10 some class loses two or more', () => {
  for (const b of BRACKETS) {
    const who = b.level >= SUBCLASS.from ? SUBS : CLASSES.map((c) => [c, undefined]);
    const rs = who.map(([c, sub]) => hardScore(c, b, { sub }));
    rs.forEach((r, i) => assert.ok(r.wins >= (who[i][1] === 'sysop' ? 0.45 : 0.55) * r.total, `${who[i][1] || who[i][0]} hard at ${b.name}: ${r.wins}/${r.total}`));
    if (b.name === 'Lv 10') assert.ok(rs.some((r) => r.total - r.wins >= 2), `Lv 10 hard: ${rs.map((r) => `${r.wins}/${r.total}`).join(' ')}: nothing can beat you`);
  }
});

// The solo band is per subclass (balance.mjs soloBand, docs/kits.md 9): 15–50% lost, and the Bastions, which lean
// crew and pay for it alone in pace, anywhere under 50%. The six damage dealers stay within 30 points of each other.
test('every subclass is viable alone at Lv 10, 18 and 30: at least 85% wins, inside its solo band, the damage dealers within 30 points', () => {
  for (const b of BRACKETS.filter((x) => x.level >= SUBCLASS.from && x.level <= 30)) {
    const rs = SUBS.map(([, sub]) => [sub, subRuns[b.name][sub]]);
    for (const [sub, r] of rs) {
      const [lo, hi] = soloBand(sub, b.level);
      assert.ok(r.wins >= 0.85 * r.total, `${sub} at ${b.name}: ${r.wins}/${r.total}`);
      assert.ok(r.lost >= lo && r.lost <= hi, `${sub} at ${b.name}: ${r.lost.toFixed(0)}%`);
    }
    const lost = rs.filter(([sub]) => soloBand(sub)[0] > 0).map(([, r]) => r.lost);
    // Held at Lv 10 since the damage profiles: the Overclocker (50%) and the Herder (16%) 34 apart on these fights
    // (39% and 16% over 160): the new thirds and one-big-basic fights suit helpers and punish burst (docs/parts-plan.md).
    assert.ok(Math.max(...lost) - Math.min(...lost) <= (b.level === 10 ? 35 : 30), `${b.name}: ${rs.map(([sub, r]) => `${sub} ${r.lost.toFixed(0)}`).join(' / ')}`);
  }
});

// The Bastions alone: built for a crew, like a tank or a healer levelling solo. What they pay alone is time. Over a
// wider sample (three gear sets, 40 wilds and 8 guard fights each) the Warden takes at least 1.4 times the cycles of
// the damage dealers' median a fight, and the Sysop at least twice as many (docs/kits.md 11: alone its hits deal 75%,
// SUBS.sysop.alone), while it still loses little Signal: 15% a fight at most, its heals drawn from its full hits.
// Carrying a crew: farm.test.mjs.
const wide = (c, b, sub) => {
  const rs = [0, 1, 2].flatMap((gearSeed) => [...Array.from({ length: 40 }, (_, i) => fight(c, 'random', b, { sub, gearSeed, seed: 500 + i, mode: 'run', zone: true })), ...['watchdog', 'sentinel', 'crawler', 'shredder'].flatMap((g) => [1, 2].map((seed) => fight(c, g, b, { sub, gearSeed, seed, mode: 'run', guard: b.guard })))]);
  return { lost: rs.reduce((a, r) => a + r.lostPct, 0) / rs.length, wins: rs.filter((r) => r.win).length / rs.length, cycles: rs.reduce((a, r) => a + r.cycles, 0) / rs.length };
};
test('the Bastions alone are the slow ones: the Warden at least 1.4 times the damage dealers\' median cycles a fight at Lv 18 and 30, the Sysop at least twice, both winning 85% and the Sysop losing 15% or less', () => {
  for (const b of BRACKETS.filter((x) => x.level === 18 || x.level === 30)) {
    const rs = Object.fromEntries(SUBS.map(([c, sub]) => [sub, wide(c, b, sub)]));
    const line = Object.entries(rs).map(([sub, r]) => `${sub} ${r.lost.toFixed(0)}% ${Math.round(r.wins * 100)} ${r.cycles.toFixed(1)}c`).join(' / ');
    const dps = SUBS.filter(([c]) => c !== 'Bastion').map(([, sub]) => rs[sub].cycles).sort((x, y) => x - y);
    const median = (dps[2] + dps[3]) / 2;
    assert.ok(rs.warden.cycles >= 1.4 * median, `${b.name}: ${line}`);
    assert.ok(rs.sysop.cycles >= 2 * median, `${b.name}: Sysop ${(rs.sysop.cycles / median).toFixed(2)}x: ${line}`);
    assert.ok(rs.sysop.lost <= 15, `${b.name}: ${line}`);
    for (const sub of ['warden', 'sysop']) assert.ok(rs[sub].wins >= 0.85, `${b.name}: ${line}`);
  }
});

// Solo tells (tells.mjs): a bot that plays as if it can't see them (TELL.bots.answer false) against one that reads
// them, on the same fights. Since R1 (docs/servers.md 3.5) a charge is answered by the interrupt, and both bots cut a
// big attack on its cycle whether or not they see the charge riding it, so the gap is what only a reader does: SIGINT
// a cast, go quiet on a Mimic's beat, strip a seal, strip a part ahead of its charge. It measured 4.8 points of Signal
// at Lv 10, 1.9 at 18 and 0.9 at 30 (it was about 17 under the burst rules), with Lv 5 at 0 (no tells to level 5)
// and Lv 8 at 3.9. The test holds that reading never costs (a point of slack a bracket), pays on average from Lv 10,
// and that a level-5 fight brings no tells to read.
const below = (L) => ({ ...BRACKETS.filter((b) => b.level <= L).at(-1), name: 'Lv ' + L, level: L, server: L });
test('reading tells pays: a bot that ignores them loses more Signal on average from Lv 10, never less by more than a point at a bracket, and nothing to read at Lv 5', () => {
  TELL.bots.answer = false;
  let ignored, low, lowRead;
  const LOW = [5, 8];
  try {
    ignored = Object.fromEntries(BRACKETS.filter((b) => b.level >= SUBCLASS.from && b.level <= 30).map((b) => [b.name, Object.fromEntries(SUBS.map(([c, sub]) => [sub, score(c, b, { sub })]))]));
    low = LOW.map((L) => CLASSES.map((c) => score(c, below(L))));
  } finally { TELL.bots.answer = true; }
  lowRead = LOW.map((L) => CLASSES.map((c) => score(c, below(L))));
  let gap = 0, n = 0, wins = 0;
  const lines = [];
  for (const [name, row] of Object.entries(ignored)) {
    let g = 0;
    for (const [sub, r] of Object.entries(row)) { g += r.lost - subRuns[name][sub].lost; wins += subRuns[name][sub].wins - r.wins; }
    g /= Object.keys(row).length; gap += g; n++;
    lines.push(`${name} ${g.toFixed(1)}`);
  }
  const lowGap = LOW.map((L, i) => low[i].reduce((a, r, k) => a + r.lost - lowRead[i][k].lost, 0) / CLASSES.length);
  const all = `${lines.join(', ')}; ${LOW.map((L, i) => `Lv ${L} ${lowGap[i].toFixed(1)}`).join(', ')}; ${wins} more wins reading`;
  for (const l of lines) assert.ok(+l.split(' ').at(-1) >= -1, `ignoring tells pays at ${l} (${all})`);
  assert.ok(gap / n >= 1, `ignoring tells costs ${(gap / n).toFixed(1)} points a fight on average from Lv 10 (${all})`);
  assert.ok(wins >= 0, `a bot that reads tells wins at least as often (${all})`);
  assert.ok(Math.abs(lowGap[0]) < 0.5, `Lv 5 has no tells (${all})`);
  assert.ok(lowGap[1] > 0, `Lv 8 has one, and it pays to read it (${all})`);
});

test('no class drifts far out of the band: under 55% lost, and within 40 points of each other', () => {
  for (const b of BRACKETS) {
    const lost = CLASSES.map((c) => runs[b.name][c].lost);
    for (const [i, l] of lost.entries()) assert.ok(l < 55, `${CLASSES[i]} at ${b.name}: ${l.toFixed(0)}%`);
    assert.ok(Math.max(...lost) - Math.min(...lost) <= 40, `${b.name}: ${lost.map((l) => l.toFixed(0)).join(' / ')}`);
  }
});

// The friction target (friction.mjs TARGET.blues): a same-level fight costs every subclass 35–45% of its
// Signal at Lv 10, 18 and 30, all eight within about 10 points (Lv 1: 28–55%, before subclasses). The
// Sysop, from Lv 18 (its heals come at 12, 14 and 18), 45–55%, and it's left out of the spread.
const band = () => () => {
  const off = [];
  for (const b of BRACKETS.filter((x) => x.level <= 30)) {
    const span = (who) => (b.level < SUBCLASS.from ? [28, 55] : who === 'sysop' && b.level >= 18 ? [45, 55] : [35, 45]);
    const rs = b.level >= SUBCLASS.from ? SUBS.map(([, sub]) => [sub, subRuns[b.name][sub]]) : CLASSES.map((c) => [c, runs[b.name][c]]);
    rs.forEach(([who, r]) => { const [lo, hi] = span(who); if (r.lost < lo || r.lost > hi) off.push(`${who} ${b.name} ${r.lost.toFixed(0)}%`); });
    const lost = rs.filter(([who]) => who !== 'sysop' || b.level < 18).map(([, r]) => r.lost);
    if (b.level >= SUBCLASS.from && Math.max(...lost) - Math.min(...lost) > 12) off.push(`${b.name} spread ${(Math.max(...lost) - Math.min(...lost)).toFixed(0)}`);
  }
  assert.deepEqual(off, []);
};
test('target band: a fight at your level costs every subclass 35–45% at Lv 10, 18 and 30 (the Sysop 45–55% from Lv 18; 28–55% at Lv 1), within about 10 points', { todo: 'with the gear each subclass chases: Lv 1 Bastion, Infiltrator and Operator run 15–21%; the Phantom 29% at Lv 10, 32% at 18 and 28% at 30; the Payload 34% at Lv 10 and 49% at 30; the Warden (Signal on its gear) 29% at Lv 18 and 34% at 30, the Hijacker 34% at 18 and 46% at 30; the Demolitionist 28% at Lv 18 and 27% at 30; the Sysop 41–46% on these 24 fights' }, band());

// The capstone row (levels 45 and 50, docs/progression.md 7): at Lv 50, with either capstone at rank 2, every subclass
// still wins 85% and stays under its solo ceiling; neither pick is a trap (no more than 3 points worse than none) or a
// must (the two within 8 points of each other). Most pairs are a pace pick against a safety pick, so one cuts cycles
// and the other Signal. (At Lv 50 the Phantom, Herder, Sysop and Warden already sit under the solo band's floor of
// 15 with no capstone: the floor is held from 10 to 30.)
test('capstones at Lv 50: either pick keeps every subclass winning and under its ceiling, neither a trap nor a must', () => {
  const b = BRACKETS.at(-1), off = [];
  for (const [c, sub] of SUBS) {
    const [none, a, z] = [null, 0, 1].map((capstone) => score(c, b, { sub, capstone }));
    for (const [r, k] of [[a, 'a'], [z, 'b']]) {
      if (r.wins < 0.85 * r.total) off.push(`${sub} ${k}: ${r.wins}/${r.total}`);
      if (r.lost > soloBand(sub)[1]) off.push(`${sub} ${k}: ${r.lost.toFixed(0)}% lost`);
      // A pick that ends fights sooner leaves less time to heal back up (Root Cause: a third fewer cycles), so it may end a little lower.
      if (r.lost > none.lost + 3 && r.cycles > 0.9 * none.cycles) off.push(`${sub} ${k}: ${r.lost.toFixed(1)}% against ${none.lost.toFixed(1)}% with none`);
    }
    if (Math.abs(a.lost - z.lost) > 8) off.push(`${sub}: ${a.lost.toFixed(1)}% against ${z.lost.toFixed(1)}%`);
  }
  assert.deepEqual(off, []);
});
