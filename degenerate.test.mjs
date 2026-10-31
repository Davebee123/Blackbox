// No easy solutions: for every virus a solo player meets (the home families with each third part, the room bodies and
// the Exfil, the strains, the guards and ICE), breaking any one part first never leaves the rest harmless. The check
// (the cheap form of the audit that found the Trojan's, the Cryptominer's, the Bouncer's and Patchwork's): at the
// start of a fight, hold for 8 cycles and count what lands on you; then, on a copy, break one part outright, clear
// the adds already out (fragments, Packages, Droppers) and hold the same 8 cycles. What the parts left deal must stay
// above a floor of what the whole virus deals. Before the fixes a Courier, a Rig, a Gate or a Pulse Node broken
// first left 0%; the lowest a sound body gives is about 14% (an Overrun's Hive: its Pulse Node alone).
// Fixes it guards: the Trojan's Loader redeploys its Courier (families.mjs), and Fallback (combat.mjs breakPart): a
// Cryptominer's Cooler, a Bouncer's Keyring, a Crawler's Brood and Patchwork's Patcher take over the attack of the
// part broken first.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, hooks, hit, part, livingParts, command, resolveCycle, active, defender, selectEncounter } from './dist/combat.mjs';
import { CONFIG, FAMILIES, STRAINS, GUARDS } from './dist/data.mjs';
import { GENES } from './dist/genes.mjs';
import * as FP from './dist/floorplan.mjs';
import './dist/families.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false;
hooks.now = () => Date.UTC(2026, 0, 1);
export const FLOOR = 0.1;
const LEVELS = [8, 16], SEEDS = [1, 2];

// A room body in a playtest server's process room (its set, its rules), or a strain or a guard on a run.
function roomFight(family, level, seed, third = null) {
  const s = fresh();
  s.rng = (seed * 2654435761 + level * 97) >>> 0;
  FP.outfit(s, { cls: 'breaker', level, gearSeed: seed });
  FP.startRooms(s, { seed: 5 + seed, kind: 'Relay', size: 'medium', level });
  FP.connect(s);
  const room = FP.roomList(s).find((r) => r.kind === 'process');
  Object.assign(room, { family, third, author: 'glassjaw' });
  s.rooms.at = room.id; s.rooms.screen = null;
  FP.fight(s, room);
  s.encounter.virus.mutation = null;
  return s;
}
function runFight(key, level, seed, over = {}) {
  const s = fresh();
  s.hackers = { breaker: { level, xp: 0 } };
  s.rng = (seed * 2654435761 + level * 97) >>> 0;
  s.run = { loc: 'x', cwd: '/', integrity: 300, max: 300, pack: [], visited: ['/'] };
  selectEncounter(s, key, seed * 7919 + 13, { level, mode: 'run', room: '/x', mutation: null, ...over });
  command(s, 'engage');
  return s;
}
// What lands on you over n cycles of holding, topped up to full each cycle so nothing ends it early.
function holdLost(s, n = 8) {
  const d = () => defender(s);
  let lost = 0;
  for (let i = 0; i < n && active(s); i++) { d().integrity = d().max; command(s, 'hold'); resolveCycle(s); lost += d().max - Math.max(0, d().integrity); }
  return lost;
}
// The share of the whole virus's 8 cycles the rest deals with each part broken first, by part.
function residuals(make) {
  let base = 0;
  const left = {};
  for (const L of LEVELS) for (const seed of SEEDS) {
    const s0 = make(L, seed);
    base += holdLost(structuredClone(s0));
    for (const p of livingParts(s0).filter((x) => x.kind === 'system')) {
      const s = structuredClone(s0), q = part(s, p.id);
      hit(s, q, q.integrity + 9999, { pierce: true, server: true });
      for (const f of s.encounter.virus.parts) if (f.kind === 'fragment') { f.integrity = 0; if (f.pkg) f.unpacked = true; }
      left[p.id] = (left[p.id] || 0) + holdLost(s);
    }
  }
  return Object.fromEntries(Object.entries(left).map(([id, n]) => [id, n / Math.max(1, base)]));
}
const noEasyWay = (name, make) => {
  const r = residuals(make);
  assert.ok(Object.keys(r).length >= 2, `${name}: two parts or more`);
  // (A Botnet's C&C ends the fight by design, paying 0.6 of a kill: the trade, not an easy way.)
  for (const [id, share] of Object.entries(r)) if (id !== 'cnc') assert.ok(share >= FLOOR, `${name}: break the ${id} first and the rest deals ${Math.round(share * 100)}% of what the whole virus does (floor ${FLOOR * 100}%)`);
};

test('no easy solution: the home families, with each of their third parts', () => {
  for (const [id, f] of Object.entries(FAMILIES)) {
    noEasyWay(f.name, (L, seed) => roomFight(id, L, seed));
    for (const g of f.third) { const from = GENES[g].parts[id].from || 1; noEasyWay(`${f.name} + ${GENES[g].parts[id].name}`, (L, seed) => roomFight(id, Math.max(L, from), seed, g)); }
  }
});

// The parts plan's basics (dist/parts.mjs): each beside its family's signature. One with no attack (a Buffer, an
// Obfuscator) takes the signature's attack over when it breaks first (Fallback).
test('no easy solution: every basic with its family\'s signature', () => {
  for (const [id, f] of Object.entries(FAMILIES)) for (const b of f.parts.filter((x) => x.pool === 'basic')) noEasyWay(`${f.name}: ${b.name}`, (L, seed) => runFight('random', Math.max(L, b.from), seed, { family: id, basic: b.id, genes: [] }));
});

test('no easy solution: the room bodies (the Trojan, the Cryptominer, the Wiper) and the Exfil', () => {
  for (const id of ['trojan', 'cryptominer', 'wiper', 'exfil']) noEasyWay(id, (L, seed) => roomFight(id, Math.max(L, 10), seed));
});

test('no easy solution: every strain (as a v2, the least a strain comes as)', () => {
  for (const [id, st] of Object.entries(STRAINS)) noEasyWay(st.name, (L, seed) => runFight('random', Math.max(L, st.from), seed, { family: st.lineage, strain: id, grade: 2, genes: [] }));
});

test('no easy solution: every guard and ICE', () => {
  for (const [id, g] of Object.entries(GUARDS)) noEasyWay(g.name, (L, seed) => runFight(id, L, seed));
});
