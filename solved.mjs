// node solved.mjs: how solved fights are (docs/puzzle-fights.md section 5). A fight that rewards reading it should lose a
// blind player, and both watching (the learner) and preparing (the routine player) should win it. docs/progression.md
// "How solved fights are" has the measurements.
//
//   node solved.mjs [levels]            ordinary fights, elites, Residents and the six solo bosses, every player, by
//                                       class (about 4 minutes for 10, 18 and 30)
//   node solved.mjs ordinary|hard [levels]   one half of that
//   node solved.mjs bosses [seeds]      the boss set: every solo boss at its floor, +4 and +10, every subclass, six seeds
//                                       (about 15 minutes)
//   node solved.mjs operator            the blind Operator's helpers, and the Herder's beat (section 3.2), prototyped here
//
// The players, each on the same fights and seeds:
//   planner     reads every rule, tell and timer (dist/planner.mjs)
//   routine     your program, prepared: research at the fight's tier (rule chips for ordinary fights, mastered for
//               elites), the routine fitted to the trick (prepare: each lever's preset, then Answer the tells); the
//               rotation does the rest. Not on a boss or the Resident: those are yours alone.
//   rotation    your program unprepared: no routine for the virus, so the rotation (the kit player) plays it all
//   learner N   the misreader (docs/genome.md 11.2): the kit player's move on N% of its cycles, the planner's on the
//               rest. 30, 15 and 5 stand for a first try, a few tries in, and learned.
//   kit         blind to the virus, not to its own kit: the planner with every tell and gene unread (TELL.bots.answer
//               off, every gene in GENE_BOTS.ignore). It plays its skills well and reads timers, and answers no lever.
//   blind       blind to both: each cycle the first ready skill on its bar, in bar order, at the first part on the
//               board, Spike when nothing else is ready.
import { POLICIES, fight, at, policyOf } from './balance.mjs';
import { player, playOut, HOME } from './genesim.mjs';
import { livingParts, barKeys, readyIn, toIntent, hooks, selectEncounter, part, defender, strikeWith, alive } from './dist/combat.mjs';
import { ARCHETYPES, BOSSES, TELL, ABILITIES } from './dist/data.mjs';
import { planner, plannerWithout, kitPlanner } from './dist/planner.mjs';
import { tellsOf } from './dist/tells.mjs';
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
// the preset of each lever in the fight (Hold on the beat, Tripwire last, Lockbox first), then Answer the tells, as
// many handlers as its RAM holds (routines.mjs presetsFor). Set up on its first cycle, then it types nothing and the
// timer runs the program.
export function prepare(s) {
  const body = R.fightBody(s);
  if (!R.isBody(body)) return null;
  const here = new Set(s.encounter.virus.parts.map((p) => p.id)), ps = R.presetsFor(s, body);
  const lever = (k) => ps.filter((p) => p.part && here.has(p.part) && p.id.startsWith(k + ':'));
  // What fits, by need: the levers (a part to break first, a beat, a part to break last), then the tells.
  const want = [...['first', 'beat', 'last'].flatMap(lever), ps.find((p) => p.id === 'tells')].filter(Boolean).flatMap((p) => p.handlers);
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
// of docs/puzzle-fights.md 1.4, two seeds each. All as balance.mjs builds them, at a bracket.
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

// ---------- the bar (docs/puzzle-fights.md section 5) ----------
// Floors for the planner, the routine player and the learner (30, 15, 5), and a ceiling for the kit and blind players,
// which falls with level. A hard fight's first try usually fails, so there its learner 30 is also under 50%.
export function barOf(tier, L) {
  const by = (a, b, c) => (L < 18 ? a : L < 30 ? b : c);
  if (tier === 'ordinary') return { planner: 85, routine: 85, learner: [70, 80, 85], blind: by(40, 30, 20) };
  if (tier === 'elites') return { planner: 85, routine: 60, learner: [35, 60, 85], blind: by(20, 10, 5), firstTry: 50 };
  return { planner: 85, routine: null, learner: [20, 50, 85], blind: by(10, 5, 2), firstTry: 50 };
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
// Rules 2 and 3, prototyped (not in the game): on the Mimic's beat, each helper on its part that was sent once the beat
// was on the board has its hit played back at you, at its own size times TELL.mimic. With your command's playback it
// never passes TELL.ceiling of your max. Sudo, Unmask, Echo Cancel and a Honeypot blind it to helpers too.
export function beatCatchesHelpers() {
  const born = new WeakMap();
  let beat = null, before = [];
  return {
    before: (s) => {
      const e = s.encounter, c = e.cycle;
      for (const h of e.helpers) if (!born.has(h)) born.set(h, c - 1); // already out: sent last cycle at the latest
      before = [...e.helpers];
      const t = tellsOf(s)?.list.find((x) => x.kind === 'mimic' && x.told && x.next === c);
      beat = t && alive(part(s, t.part)) && part(s, t.part).mimic ? { c, said: t.said, p: part(s, t.part) } : null;
    },
    after: (s, ev) => {
      const e = s.encounter;
      if (!beat || !e || e.phase !== 'active') return;
      for (const h of e.helpers) if (!born.has(h)) born.set(h, beat.c);
      const { c, said, p } = beat;
      if (e.buffs?.sudo >= c || p.unmaskUntil >= c || p.echoCancelUntil >= c || ev.some((x) => x.tell === 'mimic' && /honeypot|turns it/.test(x.message || ''))) return;
      const ran = [...new Set([...e.helpers, ...before.filter((h) => h.left === 0)])];
      const caught = ran.filter((h) => h.target === p.id && born.get(h) >= said);
      if (!caught.length) return;
      const max = defender(s).max, played = ev.filter((x) => x.type === 'server-hit' && /\(mimicked\)/.test(x.message || '')).reduce((n, x) => n + (x.amount || 0), 0);
      const amount = Math.round(Math.min(TELL.ceiling * max - played, caught.reduce((n, h) => n + h.damage, 0) * TELL.mimic));
      if (amount > 0) strikeWith(s, p, { name: 'Helpers (mimicked)', effect: 'damage', amount, interval: 99, noCrit: true, tell: 'mimic' });
    },
  };
}
// The planner taught rule 3: while other parts stand, no helper goes onto the Mimic's part if its hits would still run
// on a beat already on the board (the plan is made with that part out of the board, Fan-out vetoed). Helpers sent right
// after a beat, short enough to end before the next one, are free. With the Mimic alone it sends them anyway: the
// playback costs less than the cycles a kill without them takes. On the beat, Kill Switch cashes in the helpers it
// would catch.
const HELPS = new Set(Object.keys(ABILITIES).filter((id) => ABILITIES[id].helper));
export function heedsBeat(move) {
  const born = new WeakMap();
  return (s) => {
    const e = s.encounter, c = e.cycle, t = tellsOf(s)?.list.find((x) => x.kind === 'mimic' && x.told && x.next >= c);
    for (const h of e.helpers) if (!born.has(h)) born.set(h, c - 1);
    const p = t && part(s, t.part);
    const text = move(s);
    if (!alive(p) || !p.mimic) return text;
    if (t.next === c && e.helpers.some((h) => h.target === p.id && h.left > 0 && born.get(h) >= t.said) && !toIntent(s, 'kill-switch').error) return 'kill-switch';
    const [id, at] = String(text).split(' ');
    if (!(HELPS.has(id) && (at === p.id || id === 'fan-out')) || t.next > c + (ABILITIES[id].ticks || 1) - 1) return text;
    if (livingParts(s).length === 1) return text; // the Mimic alone: the playback costs less than the cycles it would take without helpers
    const hp = p.integrity;
    p.integrity = 0;
    try { return plannerWithout(s, (k) => k === 'fan-out') || 'hold'; } finally { p.integrity = hp; }
  };
}
// Ghostroot fights with a Mimic: a sub's wins and Signal lost, today and with the beat catching its helpers.
export function mimicCost(sub, name, L, { rule = false, taught = false, seeds = 12 } = {}) {
  const b = at(L), cls = policyOf(sub), rs = [];
  for (let seed = 1; seed <= seeds; seed++) {
    const catches = rule ? beatCatchesHelpers() : null, smart = POLICIES[cls];
    const move = moverOf(name, seed * 97 + L);
    POLICIES[cls] = taught ? heedsBeat(move) : move;
    try { rs.push(fight(cls, 'random', b, { sub, seed, mode: 'run', zone: true, family: 'ghostroot', genes: ['mimic'], ...(catches || {}) })); } finally { POLICIES[cls] = smart; }
  }
  return { wins: pct(rs, (r) => r.win), lost: lost(rs) };
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
  if (what === 'operator') {
    const rows = [];
    for (const L of nums.length ? nums : [10, 18, 30]) for (const name of ['blind', 'planner']) {
      const a = helperShare('Operator', name, L);
      rows.push({ level: L, player: name, wins: Math.round((100 * a.wins) / a.n), 'helper damage %': Math.round((100 * a.helper) / a.dmg), 'tells said': a.said, answered: a.answered, 'died with a part': a.byBreak, 'broken by a helper': a.byHelper });
    }
    console.log('The Operator (the Herder) on the class-balance fights: what its helpers do');
    console.table(rows);
    const cost = [];
    for (const L of nums.length ? nums : [10, 18, 30]) for (const sub of ['herder', 'hijacker']) for (const [label, name, taught] of [['planner', 'planner', false], ['planner, taught', 'planner', true], ['learner 30, taught', 'learner 30', true], ['blind', 'blind', false]]) {
      if (L < 10 && sub === 'hijacker') continue;
      const now = mimicCost(sub, name, L), rule = mimicCost(sub, name, L, { rule: true, taught });
      cost.push({ level: L, sub, player: label, 'wins today': now.wins, 'wins, rule': rule.wins, 'lost today': now.lost, 'lost, rule': rule.lost });
    }
    console.log('Ghostroot fights with a Mimic (12 a cell): today, and with the beat catching helpers sent after it was said');
    console.table(cost);
  }
}
