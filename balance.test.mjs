// Guard rails on class balance: scripted players, so this checks the numbers stay in the same league.
// Targets not met yet are `todo` tests: they run and report, but don't fail the suite until their phase lands.
import test from 'node:test';
import assert from 'node:assert/strict';
import { score, hardScore, fight, BRACKETS } from './balance.mjs';
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

test('the hard slice (every open strain, grade 2 wilds, wilds 2 levels up) is beatable but risky: each class and subclass wins at least 55% (the Sysop, weaker alone on purpose, 45%), and at Lv 10 some class loses two or more', () => {
  for (const b of BRACKETS) {
    const who = b.level >= SUBCLASS.from ? SUBS : CLASSES.map((c) => [c, undefined]);
    const rs = who.map(([c, sub]) => hardScore(c, b, { sub }));
    rs.forEach((r, i) => assert.ok(r.wins >= (who[i][1] === 'sysop' ? 0.45 : 0.55) * r.total, `${who[i][1] || who[i][0]} hard at ${b.name}: ${r.wins}/${r.total}`));
    if (b.name === 'Lv 10') assert.ok(rs.some((r) => r.total - r.wins >= 2), `Lv 10 hard: ${rs.map((r) => `${r.wins}/${r.total}`).join(' ')}: nothing can beat you`);
  }
});

// The Demolitionist used to run about 21% from Lv 29 on flat Damage over its many hits, and had its own floor
// at Lv 30. Since Shaped Charge provokes its part (docs/skills.md) it runs about 27–29%, inside the band.
const floor = () => 25;
test('every subclass is viable at Lv 10, 18 and 30: at least 85% wins (the Sysop 70%), 25–50% lost, all eight within 30 points', () => {
  for (const b of BRACKETS.filter((x) => x.level >= SUBCLASS.from && x.level <= 30)) {
    const rs = SUBS.map(([, sub]) => [sub, subRuns[b.name][sub]]);
    for (const [sub, r] of rs) {
      assert.ok(r.wins >= (sub === 'sysop' ? 0.7 : 0.85) * r.total, `${sub} at ${b.name}: ${r.wins}/${r.total}`);
      assert.ok(r.lost >= floor(sub, b) && r.lost <= 50, `${sub} at ${b.name}: ${r.lost.toFixed(0)}%`);
    }
    const lost = rs.map(([, r]) => r.lost);
    assert.ok(Math.max(...lost) - Math.min(...lost) <= 30, `${b.name}: ${rs.map(([sub, r]) => `${sub} ${r.lost.toFixed(0)}`).join(' / ')}`);
  }
});

// The Sysop alone: weaker on purpose (heals built for a crew), like a healer levelling solo. Over a wider
// sample (three gear sets, 40 wilds and 8 guard fights each) a blue Sysop loses 45–55% of its Signal a
// fight and wins 75–85%; the test holds it to 38–58% and 70–92%, and below every other subclass in wins.
const wide = (c, b, sub) => {
  const rs = [0, 1, 2].flatMap((gearSeed) => [...Array.from({ length: 40 }, (_, i) => fight(c, 'random', b, { sub, gearSeed, seed: 500 + i, mode: 'run', zone: true })), ...['watchdog', 'sentinel', 'crawler', 'shredder'].flatMap((g) => [1, 2].map((seed) => fight(c, g, b, { sub, gearSeed, seed, mode: 'run', depth: b.depth })))]);
  return { lost: rs.reduce((a, r) => a + r.lostPct, 0) / rs.length, wins: rs.filter((r) => r.win).length / rs.length };
};
test('the Sysop alone is the weak one: 38–58% lost and 70–92% wins at Lv 18 and 30 with blues, and fewer wins than any other subclass', () => {
  for (const b of BRACKETS.filter((x) => x.level === 18 || x.level === 30)) {
    const rs = Object.fromEntries(SUBS.map(([c, sub]) => [sub, wide(c, b, sub)]));
    const me = rs.sysop, line = Object.entries(rs).map(([sub, r]) => `${sub} ${r.lost.toFixed(0)}% ${Math.round(r.wins * 100)}`).join(' / ');
    assert.ok(me.lost >= 38 && me.lost <= 58, `${b.name}: ${line}`);
    assert.ok(me.wins >= 0.7 && me.wins <= 0.92, `${b.name}: ${line}`);
    for (const [sub, r] of Object.entries(rs)) if (sub !== 'sysop') assert.ok(r.wins > me.wins, `${b.name}: ${line}`);
  }
});

// Solo tells (tells.mjs): a bot that plays as if it can't see them (TELL.bots.answer false) does measurably worse
// than one that reads them, on the same fights. From level 10 a tell let through costs up to a quarter of your max and
// leaves something behind (a key offline, Corrupted, Hung), so the gap is about 12–15 points of Signal a fight on
// average (about 18 at Lv 10, 14 at 18 and 8 at 30, where fights are short) and the ignoring bot loses more fights.
// Below 10 the tells are gentle on purpose (one at a time, small, no after-effect at 1–5): a smaller gap.
const below = (L) => ({ ...BRACKETS.filter((b) => b.level <= L).at(-1), name: 'Lv ' + L, level: L, server: L });
test('reading tells pays: a bot that ignores them loses at least 12 points more Signal a fight on average at Lv 10, 18 and 30 (at least 6 at each), wins fewer fights, and a smaller gap below 10', () => {
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
  for (const l of lines) assert.ok(+l.split(' ').at(-1) >= 6, `ignoring tells costs too little at ${l} (${all})`);
  assert.ok(gap / n >= 12, `ignoring tells costs ${(gap / n).toFixed(1)} points a fight on average from Lv 10 (${all})`);
  assert.ok(wins > 0, `a bot that reads tells wins more often (${all})`);
  const lowAvg = lowGap.reduce((a, g) => a + g, 0) / LOW.length;
  assert.ok(lowAvg >= 1 && lowAvg < gap / n, `below Lv 10 the gap is there but smaller (${all})`);
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
