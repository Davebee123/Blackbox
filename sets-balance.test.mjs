// Set pieces keep the class bands (sets.mjs, docs/genome.md 9.1). Its own file, like natives.test.mjs: other test files
// load run.mjs, whose hooks change how a bare balance fight runs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { score, BRACKETS, soloBand } from './balance.mjs';
import { ARCHETYPES } from './dist/data.mjs';

// Each piece in place of the blue in its slot (balance.mjs opts.uniques), on every subclass, and the sets together with
// their bonuses: a piece is a sidegrade (held to the natives' bounds: no subclass leaves its band, 4 points of slack
// under its floor as natives.test.mjs has, at least 80% wins, and the average moves no more than 4.5 points), and so are
// the two-piece bonuses. The Kestrel 3-piece (a ◆ every 5 cycles you have none) changes how a fight plays, as the doc
// means a 3-piece to: it keeps every band but moves the average further, 6.2 points easier at Lv 10 (the Sysop, with no
// heal before 12, 18 points), 3.4 at 18 and 4.0 at 30 (October 2026). Its bound here is that measure; whether a set's
// 3-piece may be that strong is the designer's call (GAME_RULES.md Sets, docs/genome.md 9.2).
const SLACK = 4;
const SUBS = ['Breaker', 'Bastion', 'Infiltrator', 'Operator'].flatMap((c) => Object.keys(ARCHETYPES[c.toLowerCase()].subs).map((sub) => [c, sub]));
const AT = Object.fromEntries(BRACKETS.filter((b) => [10, 18, 30].includes(b.level)).map((b) => [b.level, b]));
const base = {};
const baseOf = (L) => (base[L] ||= Object.fromEntries(SUBS.map(([c, sub]) => [sub, score(c, AT[L], { sub })])));
function check(L, ids, cap, off) {
  let d = 0;
  for (const [c, sub] of SUBS) {
    const r = score(c, AT[L], { sub, uniques: ids });
    d += r.lost - baseOf(L)[sub].lost;
    if (r.lost < soloBand(sub)[0] - SLACK || r.lost > 52) off.push(`${ids.join('+')} ${sub} Lv ${L} ${r.lost.toFixed(0)}%`);
    if (r.wins < 0.8 * r.total) off.push(`${ids.join('+')} ${sub} Lv ${L} ${r.wins}/${r.total}`);
  }
  if (Math.abs(d / SUBS.length) > cap) off.push(`${ids.join('+')} Lv ${L} moves the average ${(d / SUBS.length).toFixed(1)} (cap ${cap})`);
}

test('set pieces are sidegrades: each piece alone, and the two-piece bonuses', () => {
  const off = [];
  for (const L of [10, 30]) for (const id of ['kestrel-badge', 'kestrel-token', 'kestrel-lanyard', 'wicks-old-toolkit']) check(L, [id], 4.5, off);
  check(30, ['lowlight-badge'], 4.5, off);
  for (const L of [10, 18, 30]) check(L, ['kestrel-badge', 'kestrel-token'], 4.5, off);
  check(30, ['wicks-old-toolkit', 'lowlight-badge'], 4.5, off);
  assert.deepEqual(off, []);
});

test('Kestrel Clearance (3) keeps every band, and moves the average no more than it measured', () => {
  const off = [];
  for (const L of [10, 18, 30]) check(L, ['kestrel-badge', 'kestrel-token', 'kestrel-lanyard'], 7, off);
  assert.deepEqual(off, []);
});
