// node solved.mjs: how solved fights are (docs/puzzle-fights.md section 5, docs/puzzle-levers.md 6). A fight that rewards
// reading it is won by watching (the learner) and by preparing (the routine player), never a wall for the planner, and
// no fixed rule plays its lever as well as reading the board does. docs/puzzle-fights.md "How solved fights are" has the
// measurements.
//
//   node solved.mjs [levels]            ordinary fights, elites, Residents and the six solo bosses, every player, by
//                                       class (about 4 minutes for 10, 18 and 30)
//   node solved.mjs ordinary|hard [levels]   one half of that
//   node solved.mjs bosses [seeds]      the boss set: every solo boss at its floor, +4 and +10, every subclass, six seeds
//                                       (about 15 minutes)
//   node solved.mjs operator            the Operator's helpers, and what the Mimic's beat costs each sub (section 3.2)
//   node solved.mjs rules [levels]      no fixed rule wins (docs/puzzle-levers.md 6): each lever's fights, the planner
//                                       against players that always take one side of it (FIXED)
//
// The players, each on the same fights and seeds:
//   planner     reads every rule, tell and timer (dist/planner.mjs)
//   routine     your program, prepared: research at the fight's tier (rule chips for ordinary fights, mastered for
//               elites), the routine fitted to the trick (prepare: each lever's preset, then Answer the tells); the
//               rotation does the rest. Not on a boss or the Resident: those are yours alone.
//   rotation    your program unprepared: no routine for the virus, so the rotation (the kit player) plays it all
//   learner N   the misreader: the kit player's move on N% of its cycles, the planner's on the
//               rest. 30, 15 and 5 stand for a first try, a few tries in, and learned.
//   kit         blind to the virus, not to its own kit: the planner with every tell and gene unread (TELL.bots.answer
//               off, every gene in GENE_BOTS.ignore). It plays its skills well and reads timers, and answers no lever.
//   blind       blind to both: each cycle the first ready skill on its bar, in bar order, at the first part on the
//               board, Spike when nothing else is ready.
import { POLICIES, fight, at, policyOf } from './balance.mjs';
import { player, playOut, HOME } from './genesim.mjs';
import { livingParts, barKeys, readyIn, toIntent, hooks, selectEncounter, fresh, part, usable, mirrorOn } from './dist/combat.mjs';
import { GENES, GENE_BOTS } from './dist/genes.mjs';
import { beatOn, plannedTells, tellsOf, sigintTarget, bestStrip, stripBy } from './dist/tells.mjs';
import { ARCHETYPES, BOSSES, TELL, ABILITIES } from './dist/data.mjs';
import { planner, plannerWithout, kitPlanner, quietOf, preferring } from './dist/planner.mjs';
import { seeded } from './dist/gear.mjs';
import { TIER } from './dist/research.mjs';
import * as R from './dist/routines.mjs';

export const CLASSES = ['Breaker', 'Bastion', 'Infiltrator', 'Operator'];
export const PLAYERS = ['planner', 'routine', 'rotation', 'learner 30', 'learner 15', 'learner 5', 'kit', 'blind'];
const PROGRAM = new Set(['routine', 'rotation']);

// ---------- the players ----------
export const blind = (s) => {
  const t = livingParts(s)[0]; if (!t) return 'hold';
  const ids = barKeys(s).map(([, id]) => id).filter((id) => id !== 'spike').concat('spike');
  for (const id of ids) { if (readyIn(s, id) > 0) continue; for (const c of [`${id} ${t.id}`, id]) if (!toIntent(s, c).error) return c; }
  return 'hold';
};
export const kit = (s) => kitPlanner(s); // the planner with every tell and gene unread (planner.mjs kitPlanner)
export const learner = (share, seed) => { const r = seeded((seed * 2654435761 + 0x1ea7) >>> 0); return (s) => (r() < share ? kit(s) : planner(s)); };
// The program: research at a tier on every part of the fight's virus and (prepared) its routine fitted to the trick:
// the preset of each lever in the fight (Quiet on the beat, Trip when loud wins, Cash in; a seal's, SIGINT's), then Answer the tells, as
// many handlers as its RAM holds (routines.mjs presetsFor). Set up on its first cycle, then it types nothing and the
// timer runs the program.
export function prepare(s) {
  const body = R.fightBody(s);
  if (!R.isBody(body)) return null;
  const here = new Set(s.encounter.virus.parts.map((p) => p.id)), ps = R.presetsFor(s, body);
  const lever = (k) => ps.filter((p) => p.part && here.has(p.part) && p.id.startsWith(k + ':'));
  // What fits, by need: the levers (a part to break first, a beat, a part to break last, twins), a seal's lever when the
  // fight brings one (Seal dear: strip it), the tells, then SIGINT the dearer when it brings a cast, as RAM allows. An order lever's reading preset (cash
  // in, loud wins, blast pays: docs/puzzle-levers.md 7) comes in place of its plain one.
  const levers = ['cash', 'loud', 'blast', 'first', 'beat', 'last', 'together'].flatMap(lever).filter((p, i, a) => a.findIndex((q) => q.part === p.part) === i);
  const kinds = new Set(plannedTells(s.encounter.virus).map((t) => t.kind)), tell = (id, ...k) => (k.some((x) => kinds.has(x)) ? ps.find((p) => p.id === id) : null);
  const want = [...levers, ...(kinds.has('seal') ? lever('seal') : []), ps.find((p) => p.id === 'tells'), tell('sigint', 'cast')].filter(Boolean).flatMap((p) => p.handlers);
  const hs = [], budget = R.ramFor(s, body);
  let used = 0;
  for (const h of want) {
    if (hs.some((x) => x.when === h.when && x.do === h.do && x.target === h.target)) continue;
    if (used + R.handlerRam(s, h) > budget) continue;
    used += R.handlerRam(s, h);
    hs.push({ ...h });
  }
  return Object.assign(R.routineOf(s, body), { handlers: hs, confirmed: true });
}
function program(tier, prepared) {
  let ready = null;
  return (s) => {
    const e = s.encounter;
    if (e !== ready) {
      ready = e;
      s.research = {}; s.researchScale = 3;
      for (const p of e.virus.parts) s.research[R.refOf(e.virus, p)] = tier;
      if (prepared) prepare(s);
    }
    return 'program';
  };
}
// The move function for a player on one fight. tier: the research a program has (rule, or mastered for an elite).
export function moverOf(name, seed, tier = TIER.rule) {
  if (name === 'planner') return planner;
  if (name === 'kit') return kit;
  if (name === 'blind') return blind;
  if (name === 'routine' || name === 'rotation') return program(tier, name === 'routine');
  if (name.startsWith('learner')) return learner(Number(name.split(' ')[1]) / 100, seed);
  throw new Error(`no player ${name}`);
}
// Your program runs only while installed (routines.mjs installPrograms), so only around a program's fights.
const PROGRAM_HOOKS = ['program', 'programCycle', 'programActed', 'railCheck', 'walkStop'];
function withProgram(on, fn) {
  if (!on) return fn();
  const was = PROGRAM_HOOKS.map((k) => hooks[k]);
  R.installPrograms();
  try { return fn(); } finally { PROGRAM_HOOKS.forEach((k, i) => { hooks[k] = was[i]; }); }
}
// One fight (balance.mjs fight) played by a player of a class.
export function play(cls, name, key, b, opts = {}, tier = TIER.rule) {
  const smart = POLICIES[cls];
  POLICIES[cls] = moverOf(name, (opts.seed ?? 42) * 97 + key.length * 13 + b.level, tier);
  try { return withProgram(PROGRAM.has(name), () => fight(cls, key, b, opts)); } finally { POLICIES[cls] = smart; }
}

// ---------- the fights ----------
// Ordinary: the class-balance fights (20 wilds and the four guards). Elites: 12 rolls. The Resident: 6. The solo bosses
// of docs/puzzle-fights.md section 5, two seeds each. All as balance.mjs builds them, at a bracket.
export const SOLO = ['relayking', 'nb-deadbolt', 'nb-tripmine', 'nb-mirrorshade', 'nb-patchday', 'choir'];
const runs = (n, f) => Array.from({ length: n }, (_, i) => f(i + 1));
export const SETS = {
  ordinary: { tier: 'ordinary', fights: (b) => [...runs(20, (seed) => ['random', { seed, mode: 'run', zone: true }]), ...['watchdog', 'sentinel', 'crawler', 'shredder'].map((g) => [g, { mode: 'run', guard: b.guard }])] },
  elites: { tier: 'elites', research: TIER.mastered, fights: () => runs(12, (seed) => ['random', { seed, mode: 'run', zone: true, elite: true }]) },
  resident: { tier: 'bosses', boss: true, fights: () => runs(6, (seed) => ['random', { seed, mode: 'run', zone: true, boss: 'resident' }]) },
  'solo bosses': { tier: 'bosses', boss: true, fights: () => SOLO.flatMap((id) => [1, 2].map((seed) => ['random', { seed, mode: 'run', zone: true, boss: id, family: BOSSES[id].family, strain: BOSSES[id].strain }])) },
};
const pct = (xs, f) => Math.round((100 * xs.filter(f).length) / xs.length);
const lost = (xs) => Math.round(xs.reduce((a, r) => a + Math.min(100, r.lostPct), 0) / xs.length);
// Win% and Signal lost for every player on a set, for one class at one level ('—' where a player doesn't play it).
export function cell(set, cls, L, players = PLAYERS) {
  const S = SETS[set], b = at(L), out = { wins: {}, lost: {} };
  for (const name of players) {
    if (S.boss && PROGRAM.has(name)) { out.wins[name] = out.lost[name] = null; continue; }
    const rs = S.fights(b).map(([key, opts]) => play(cls, name, key, b, opts, S.research || TIER.rule));
    out.wins[name] = pct(rs, (r) => r.win);
    out.lost[name] = lost(rs);
  }
  return out;
}

// ---------- the bar (docs/puzzle-fights.md section 5, docs/puzzle-levers.md 6) ----------
// Floors for the planner, the routine player and the learner (30, 15, 5): no fight is a wall. A hard fight's first try
// usually fails, so there its learner 30 is also under 50%. The kit and blind players have no ceiling any more (the
// designer: the bot is biased): their columns are information, and the no-fixed-rule test (FIXED, below) and the
// designer's play say whether a lever is a puzzle.
export function barOf(tier, L) {
  if (tier === 'ordinary') return { planner: 85, routine: 85, learner: [70, 80, 85], blind: null };
  if (tier === 'elites') return { planner: 85, routine: 60, learner: [35, 60, 85], blind: null, firstTry: 50 };
  return { planner: 85, routine: null, learner: [20, 50, 85], blind: null, firstTry: 50 };
}
// What a row misses of its bar: [] when it meets it.
export function misses(tier, L, w) {
  const B = barOf(tier, L), out = [];
  const floor = (name, n) => { if (n != null && w[name] != null && w[name] < n) out.push(`${name} ${w[name]} < ${n}`); };
  const ceil = (name, n) => { if (n != null && w[name] != null && w[name] > n) out.push(`${name} ${w[name]} > ${n}`); };
  floor('planner', B.planner); floor('routine', B.routine);
  ['learner 30', 'learner 15', 'learner 5'].forEach((k, i) => floor(k, B.learner[i]));
  ceil('learner 30', B.firstTry); ceil('kit', B.blind); ceil('blind', B.blind);
  return out;
}

// ---------- no fixed rule wins (docs/puzzle-levers.md 6) ----------
// A lever is a puzzle when its right move depends on the board: two players that always take one side of it (always trip
// the Tripwire, never trip it) each play its fights worse than the planner, which reads the board. FIXED[id]:
//   name      the lever, for the report
//   gene      the gene it is (genes.mjs), and family: the family whose wild rolls carry it (a part's lever), or
//   fights    (L) => [[key, opts]]: its fights' balance.mjs fight options instead (a tell's lever: a guard key with
//             { mode: 'run', guard }, or 'random' wild rolls), and has (v) => bool: only the ones whose virus carries
//             it (tells are dealt at engage, so has reads tells.mjs plannedTells)
//   n         how many fights a level (6 by default)
//   from      the lowest level it is measured at (its gene's opens, or later)
//   sides     { label: (move) => move }: wraps the planner's move function into one that always takes that side
// Each P2 rule adds its own entry beside its code's tests (docs/puzzle-levers.md 8).
// The tells' levers (docs/puzzle-levers.md 3.5, 3.6). A seal: always strip its part while it's said, or never touch it
// then. SIGINT: always on a cast, or only on charges.
const sealOn = (s) => { const t = (tellsOf(s)?.list || []).find((x) => x.told && x.kind === 'seal'), p = t && part(s, t.part); return p && p.integrity > 0 && p.armor > 0 ? p : null; };
const fires = (s, text) => !!text && !toIntent(s, text).error;
const sigintHabit = (kind, move) => (s) => { const was = TELL.bots.sigintOn; TELL.bots.sigintOn = kind; try { return move(s); } finally { TELL.bots.sigintOn = was; } };
export const FIXED = {
  seal: {
    name: 'Seal', from: 6, n: 6,
    // The Sentinel guard at your level (its Blacklist from SEAL_FROM), and any wild roll that carries a seal.
    fights: (L) => [...runs(6, (seed) => ['sentinel', { seed, mode: 'run', guard: L }]), ...runs(40, (seed) => ['random', { seed, mode: 'run', zone: true }])],
    has: (v) => plannedTells(v).some((t) => t.kind === 'seal'),
    sides: {
      // Strips the sealing part while the seal is said, with the best strip it has ready (tells.mjs bestStrip).
      'always strip': (move) => (s) => { const p = sealOn(s); return (p && bestStrip(s, p)?.text) || move(s); },
      // Never strips the sealing part while the seal is said: the planner's command goes at another part, or the best
      // command that takes no ◆ off it, or it waits (it plays as if the seal weren't said otherwise).
      'never strip': (move) => (s) => {
        const was = TELL.bots.seal;
        TELL.bots.seal = false;
        try {
          const m = move(s), p = sealOn(s), id = String(m || '').split(' ')[0];
          if (!p || !(stripBy(s, id, p) > 0) || (String(m).split(' ')[1] && String(m).split(' ')[1] !== p.id)) return m;
          return livingParts(s).filter((x) => x !== p).map((x) => `${id} ${x.id}`).find((x) => fires(s, x)) || plannerWithout(s, (k) => stripBy(s, k, p) > 0) || 'hold';
        } finally { TELL.bots.seal = was; }
      },
    },
  },
  sigint: {
    name: 'SIGINT', from: 17, n: 32,
    // Wild rolls from 17: a charge and a cast.
    fights: () => runs(80, (seed) => ['random', { seed, mode: 'run', zone: true }]),
    has: (v) => { const k = plannedTells(v).map((t) => t.kind); return k.includes('charge') && k.includes('cast'); },
    sides: {
      // The planner with a fixed SIGINT habit (tells.mjs TELL.bots.sigintOn): every cast in its window, never a charge;
      // or every charge on its cycle, never a cast.
      'every cast': (move) => sigintHabit('cast', move),
      'only charges': (move) => sigintHabit('charge', move),
    },
  },
};
export const FIXED_MARGIN = 5; // a side must lose this many more points of Signal than the planner on some class
// A move with a gene unread for this one call (the planner, blind to that part's rule).
export const unread = (gene, move) => (s) => { const was = GENE_BOTS.ignore; GENE_BOTS.ignore = new Set([...was, gene]); try { return move(s); } finally { GENE_BOTS.ignore = was; } };
// The beats (docs/puzzle-levers.md 3.1, 3.8): quiet on every beat, or fire on every beat (the planner's move with the beat
// unread). Quiet is hold on the Mimic's (it copies everything else), and on the Decoy's nothing it can bend (planner.mjs quietOf).
const mimicNow = (s) => { const b = beatOn(s); return !!b && b.t.next === s.encounter.cycle; };
FIXED.mimic = { name: 'the Mimic', gene: 'mimic', family: 'ghostroot', from: 8, sides: {
  'quiet on every beat': (move) => (s) => (mimicNow(s) ? 'hold' : move(s)),
  'fire on every beat': (move) => (s) => (mimicNow(s) ? unread('mimic', move)(s) : move(s)),
} };
const quietNow = (s) => quietOf(s).find((c) => !toIntent(s, c).error) || 'hold';
FIXED.decoy = { name: 'the Decoy', gene: 'decoymirror', family: 'ghostroot', from: 6, sides: {
  'quiet on every beat': (move) => (s) => (mirrorOn(s) ? quietNow(s) : move(s)),
  'fire on every beat': (move) => (s) => (mirrorOn(s) ? unread('decoymirror', move)(s) : move(s)),
} };
// Two ways to take one side of an order lever (a part to break early or late), as wrappers of a move function:
//   aimAt(gene)      while a part carrying the gene stands, it is the player's target (planner.mjs preferring): it
//                    still answers what lands now and the tells, and works on that part the rest of the time
//   leaveLast(gene)  while anything else stands, the part is out of the player's sight, so nothing it plans goes at it
const leverPart = (s, gene) => livingParts(s).find((p) => GENES[gene].carried(p));
export const aimAt = (gene) => (move) => (s) => preferring(leverPart(s, gene) || null, () => move(s));
export const leaveLast = (gene) => (move) => (s) => {
  const p = leverPart(s, gene);
  if (!p || !livingParts(s).some((x) => x !== p && x.kind === 'system')) return move(s);
  const hp = p.integrity;
  p.integrity = 0;
  try { return move(s); } finally { p.integrity = hp; }
};
// The order levers (docs/puzzle-levers.md 3.2 to 3.4): the Tripwire (loud both ways), the Zip Bomb (the blast hits both
// sides), the Lockbox (held, not lost).
FIXED.tripwire = { name: 'Tripwire', gene: 'tripwire', family: 'ransomware', from: 16, sides: { 'always trip early': aimAt('tripwire'), 'never trip': leaveLast('tripwire') } };
FIXED.zipbomb = { name: 'Zip Bomb', gene: 'zipbomb', family: 'worm', from: 6, sides: { 'always early': aimAt('zipbomb'), 'always last': leaveLast('zipbomb') } };
FIXED.lockbox = { name: 'Lockbox', gene: 'ward', family: 'ransomware', from: 6, sides: { 'Lockbox first': aimAt('ward'), 'Lockbox last': leaveLast('ward') } };
// The wild rolls of a family at a level that carry a gene: the first n seeds, built as balance.mjs fight builds them.
export function rolledWith(gene, family, L, n = 6) {
  const out = [];
  for (let seed = 1; seed <= 400 && out.length < n; seed++) {
    const s = fresh();
    selectEncounter(s, 'random', seed, { mode: 'run', room: '/sim', level: L, zone: true, family, quiet: true });
    if (s.encounter?.virus.parts.some((p) => GENES[gene].carried(p))) out.push(seed);
  }
  return out;
}
// The virus a fight's options would put up (balance.mjs fight's encounter, before engage), for a FIXED entry's has.
function virusOf(key, opts, L) {
  const s = fresh(), b = at(L);
  s.run = { loc: 'sim', cwd: '/', integrity: 100, max: 100, pack: [], visited: ['/'] };
  selectEncounter(s, key, opts.seed ?? 42, opts.zone ? { mode: 'run', room: '/sim', level: b.level, zone: true, family: opts.family, quiet: true } : { mode: 'run', room: '/sim', level: opts.guard || b.guard || b.level, quiet: true });
  return s.encounter?.virus || null;
}
// A lever's fights at a level: [key, opts] for balance.mjs fight, the first n that carry it.
export function leverFights(F, L, n = F.n || 6) {
  if (!F.fights) return rolledWith(F.gene, F.family, L, n).map((seed) => ['random', { seed, mode: 'run', zone: true, family: F.family }]);
  const out = [];
  for (const [key, opts] of F.fights(L)) { if (out.length >= n) break; const v = virusOf(key, opts, L); if (v && (!F.has || F.has(v))) out.push([key, opts]); }
  return out;
}
// One lever at one level: Signal lost by the planner and by each side, per class, and the sides that fail the test
// (no class where they lose FIXED_MARGIN more than the planner).
export function fixedRow(id, L, n = FIXED[id].n || 6, classes = CLASSES) {
  const F = FIXED[id], b = at(L), list = leverFights(F, L, n), out = { planner: {}, sides: {}, seeds: list.length };
  const run = (cls, move) => { const smart = POLICIES[cls]; POLICIES[cls] = move; try { return list.map(([key, opts]) => fight(cls, key, b, opts)); } finally { POLICIES[cls] = smart; } };
  for (const C of classes) {
    out.planner[C] = lost(run(C, planner));
    for (const [side, wrap] of Object.entries(F.sides)) (out.sides[side] ||= {})[C] = lost(run(C, wrap(planner)));
  }
  out.fails = Object.entries(out.sides).filter(([, by]) => !classes.some((C) => by[C] - out.planner[C] >= FIXED_MARGIN)).map(([k]) => k);
  return out;
}

// ---------- the boss set ----------
// Every solo boss (the Resident and the event bosses too; not the crew bosses) at its floor, +4 and +10, every subclass,
// on `seeds`. A boss's floor here is its own, or 10 (where docs/puzzle-fights.md's boss rows start).
export const BOSS_SET = Object.keys(BOSSES).filter((id) => !BOSSES[id].raid);
export const bossLevels = (id) => { const f = Math.max(10, BOSSES[id].floor || 10); return [f, f + 4, f + 10]; };
const SUBCLASSES = Object.entries(ARCHETYPES).flatMap(([cls, a]) => Object.keys(a.subs).map((sub) => [cls, sub]));
const FAMILIES3 = ['ransomware', 'worm', 'ghostroot'];
// One boss fight at a level (genesim.mjs bossFight's setup), played by a player. The Resident takes a family by seed.
export function bossFight(id, level, cls, sub, seed, name) {
  const s = player(cls, sub, level), B = BOSSES[id], home = HOME.has(id), family = B.family || FAMILIES3[seed % 3];
  s.rng = (seed * 2654435761 + id.length) >>> 0;
  if (home) { s.run = null; selectEncounter(s, 'random', (seed * 7919 + 131) >>> 0, { level, family, name: B.name, boss: id, mutation: null, quiet: true }); }
  else selectEncounter(s, 'random', (seed * 7919 + 131) >>> 0, { mode: 'run', room: '/core', level, zone: true, wild: 'lair', family, boss: id, strain: B.strain || null, mutation: null, name: B.name });
  s.encounter.soft = 1;
  const r = playOut(s, moverOf(name, seed * 31 + level));
  return r.result === 'victory';
}
export function bossRow(id, level, seeds, players = PLAYERS.filter((p) => !PROGRAM.has(p))) {
  const out = {};
  for (const name of players) { let w = 0, n = 0; for (const [cls, sub] of SUBCLASSES) for (const seed of seeds) { w += bossFight(id, level, cls, sub, seed, name); n++; } out[name] = Math.round((100 * w) / n); }
  return out;
}

// ---------- the Operator (docs/puzzle-fights.md 3.2) ----------
// Helpers: their share of the damage a player deals, and of the tells it answers by breaking a part (a tell dies with
// its part: whose hit broke it).
export function helperShare(cls, name, L, opts = {}) {
  const b = at(L), acc = { dmg: 0, helper: 0, said: 0, answered: 0, byBreak: 0, byHelper: 0, wins: 0, n: 0 };
  for (const [key, o] of SETS.ordinary.fights(b)) {
    const r = play(cls, name, key, b, { ...o, ...opts, after: (s, ev) => {
      const last = {};
      for (const x of ev) {
        if (x.type === 'damage' && x.target && x.amount > 0) { acc.dmg += x.amount; if (x.src === 'helper') acc.helper += x.amount; last[x.target] = x.src; }
        if (x.type === 'blocked' && x.answered && x.tell && x.tell !== 'mimic' && / dies with /.test(x.message || '')) { acc.byBreak++; if (last[x.source] === 'helper') acc.byHelper++; }
      }
    } });
    for (const [g, t] of Object.entries(r.tells || {})) if (g !== 'mimic') { acc.said += t.said; acc.answered += t.answered; }
    acc.wins += r.win; acc.n++;
  }
  return acc;
}
// Ghostroot fights with a Mimic: a sub's wins, Signal lost, and the beats that caught its helpers (tells.mjs mimicLands
// plays back each helper on the Mimic's part that was sent once its beat was said; the planner keeps its helpers off it).
export function mimicCost(sub, name, L, { seeds = 12 } = {}) {
  const b = at(L), cls = policyOf(sub), rs = [];
  let caught = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const smart = POLICIES[cls];
    POLICIES[cls] = moverOf(name, seed * 97 + L);
    const after = (s, ev) => { caught += ev.filter((x) => x.tell && x.helpers > 0).length; };
    try { rs.push(fight(cls, 'random', b, { sub, seed, mode: 'run', zone: true, family: 'ghostroot', genes: ['mimic'], after })); } finally { POLICIES[cls] = smart; }
  }
  return { wins: pct(rs, (r) => r.win), lost: lost(rs), caught };
}

// ---------- the command line ----------
const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const args = process.argv.slice(2), what = args.find((x) => !/^\d+$/.test(x)) || 'all', nums = args.filter((x) => /^\d+$/.test(x)).map(Number);
  const short = (k) => k.replace('learner ', 'L');
  if (['all', 'ordinary', 'hard'].includes(what)) {
    const sets = what === 'ordinary' ? ['ordinary'] : what === 'hard' ? ['elites', 'resident', 'solo bosses'] : Object.keys(SETS);
    const rows = [], lostRows = [];
    for (const L of nums.length ? nums : [10, 18, 30]) for (const set of sets) for (const C of CLASSES) {
      const x = cell(set, C, L), w = x.wins;
      rows.push({ level: L, fight: set, class: C, ...Object.fromEntries(PLAYERS.map((k) => [short(k), w[k] ?? '—'])), bar: misses(SETS[set].tier, L, w).join('; ') || 'met' });
      lostRows.push({ level: L, fight: set, class: C, ...Object.fromEntries(PLAYERS.map((k) => [short(k), x.lost[k] ?? '—'])) });
    }
    console.log('Wins (%), and what each row misses of its bar (docs/puzzle-fights.md section 5)');
    console.table(rows);
    console.log('Signal lost (% of your max, capped at 100)');
    console.table(lostRows);
  }
  if (what === 'bosses') {
    const seeds = Array.from({ length: nums[0] || 6 }, (_, i) => i + 1), rows = [];
    for (const id of BOSS_SET) for (const L of bossLevels(id)) {
      const w = bossRow(id, L, seeds);
      rows.push({ boss: BOSSES[id].name, level: L, ...Object.fromEntries(Object.entries(w).map(([k, v]) => [short(k), v])), bar: misses('bosses', L, w).join('; ') || 'met' });
    }
    console.table(rows);
  }
  if (what === 'rules') {
    const rows = [];
    for (const id of Object.keys(FIXED)) for (const L of nums.length ? nums : [10, 18, 30]) {
      if (L < FIXED[id].from) continue;
      const r = fixedRow(id, L);
      for (const C of CLASSES) rows.push({ lever: FIXED[id].name, level: L, class: C, planner: r.planner[C], ...Object.fromEntries(Object.entries(r.sides).map(([k, by]) => [k, by[C]])) });
      rows.push({ lever: FIXED[id].name, level: L, class: '—', planner: `${r.seeds} fights`, verdict: r.fails.length ? `a fixed rule wins: ${r.fails.join(', ')}` : 'no fixed rule wins' });
    }
    console.log('No fixed rule wins (docs/puzzle-levers.md 6): Signal lost, the planner against each side that never reads the board');
    console.table(rows);
  }
  if (what === 'operator') {
    const rows = [];
    for (const L of nums.length ? nums : [10, 18, 30]) for (const name of ['blind', 'planner']) {
      const a = helperShare('Operator', name, L);
      rows.push({ level: L, player: name, wins: Math.round((100 * a.wins) / a.n), 'helper damage %': Math.round((100 * a.helper) / a.dmg), 'tells said': a.said, answered: a.answered, 'died with a part': a.byBreak, 'broken by a helper': a.byHelper });
    }
    console.log('The Operator (the Herder) on the class-balance fights: what its helpers do');
    console.table(rows);
    const cost = [];
    for (const L of nums.length ? nums : [10, 18, 30]) for (const sub of ['herder', 'hijacker']) for (const name of ['planner', 'learner 30', 'kit', 'blind']) {
      if (L < 10 && sub === 'hijacker') continue;
      const x = mimicCost(sub, name, L);
      cost.push({ level: L, sub, player: name, wins: x.wins, 'Signal lost': x.lost, 'beats that caught helpers': x.caught });
    }
    console.log('Ghostroot fights with a Mimic (12 a cell): its beat plays back the helpers on its part sent after it was said');
    console.table(cost);
  }
}
