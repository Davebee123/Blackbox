// The genome harness (docs/genome.md section 11): boss bands, and later the per-gene checks.
// Scripted players, not people: the planner over every subclass, in blues, at a level.
//   read      the planner, reading every tell
//   misread   plays as if blind on a seeded 30% of its cycles (a stand-in for a person)
//   blind     never reads a tell (TELL.bots.answer = false)
import { fresh, selectEncounter, command, resolveCycle, active, defender, maxSignal } from './dist/combat.mjs';
import { ARCHETYPES, BOSSES, TELL, SUBCLASS } from './dist/data.mjs';
import { planner } from './dist/planner.mjs';
import { build } from './balance.mjs';

export const SUBS = Object.entries(ARCHETYPES).flatMap(([cls, a]) => Object.keys(a.subs).map((sub) => [cls, sub]));
const SEEDS = [1, 2, 3, 4, 5, 6];
const dice = (seed) => { let t = (seed * 2654435761) >>> 0; return () => { t = (t + 0x6d2b79f5) >>> 0; let x = Math.imul(t ^ (t >>> 15), t | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; };
// A move by the planner, read, misread or blind.
function mover(mode, seed) {
  const r = dice(seed * 31 + 7);
  return (s) => {
    const blind = mode === 'blind' || (mode === 'misread' && r() < 0.3);
    if (!blind) return planner(s);
    TELL.bots.answer = false;
    try { return planner(s); } finally { TELL.bots.answer = true; }
  };
}
// Play a fight the encounter is already set up for: engage, then the mover until it ends (80 cycles is a loss).
export function playOut(s, move, cap = 80) {
  command(s, 'engage');
  for (let n = 0; n < cap && active(s); n++) {
    const text = move(s) || 'hold';
    command(s, text);
    if (s.encounter?.sync && s.encounter.virus.parts.some((p) => p.syncOnly && p.integrity > 0)) s.encounter.synced = text !== 'hold';
    if (s.encounter?.sync?.surprise) s.encounter.synced = text !== 'hold';
    resolveCycle(s);
  }
  const r = s.reports.at(-1) || { result: 'stalemate', cycles: cap, endIntegrity: defender(s).integrity };
  return r;
}
// A player of a subclass at a level, on a run, rested.
export function player(cls, sub, level, opts = {}) {
  const s = fresh();
  build(s, cls, { level, server: level, depth: 2 }, { sub: level >= SUBCLASS.from ? sub : undefined, ...opts });
  s.run = { loc: 'sim', cwd: '/', integrity: maxSignal(s), max: maxSignal(s), pack: [], visited: ['/'] };
  return s;
}
// The event bosses fight at home, on your server (events.mjs); the rest in a lair's /core, on your Signal.
export const HOME = new Set(['choir', 'repoman']);
// One boss fight at a level.
export function bossFight(id, level, cls, sub, seed, mode = 'read') {
  const s = player(cls, sub, level), B = BOSSES[id], home = HOME.has(id);
  s.rng = (seed * 2654435761 + id.length) >>> 0;
  if (home) { s.run = null; selectEncounter(s, 'random', (seed * 7919 + 131) >>> 0, { level, family: B.family, name: B.name, boss: id, mutation: null, quiet: true }); }
  else selectEncounter(s, 'random', (seed * 7919 + 131) >>> 0, { mode: 'run', room: '/core', level, zone: true, wild: 'lair', family: B.family, boss: id, strain: B.strain || null, mutation: null, name: B.name });
  s.encounter.soft = 1;
  const max = home ? s.server.max : s.run.max, r = playOut(s, mover(mode, seed));
  return { win: r.result === 'victory', lost: Math.round(((max - r.endIntegrity) / max) * 100), cycles: r.cycles };
}
// A boss at a level: win rates for the reader, the misreader and the blind bot, and wins by subclass (of six).
export function bossBand(id, level, modes = ['read', 'misread', 'blind']) {
  const out = { id, level, subs: {} };
  for (const mode of modes) {
    let wins = 0, n = 0, lost = 0;
    for (const [cls, sub] of SUBS) {
      let w = 0;
      for (const seed of SEEDS) { const r = bossFight(id, level, cls, sub, seed, mode); w += r.win; lost += r.lost; n++; }
      wins += w;
      if (mode === 'read') out.subs[sub] = w;
    }
    out[mode] = wins / n;
    out[mode + 'Lost'] = lost / n;
  }
  return out;
}
const pct = (x) => `${Math.round(x * 100)}%`;
export const bandLine = (b) => `${BOSSES[b.id].name} at ${b.level}: read ${pct(b.read)}, misread ${pct(b.misread)}, blind ${pct(b.blind)} · ${Object.entries(b.subs).map(([k, v]) => `${k} ${v}/6`).join(' ')}`;

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const [what = 'bosses', ...args] = process.argv.slice(2);
  if (what === 'bosses') {
    const ids = args.length ? args : ['nb-hashlord', 'nb-mirrorshade'];
    for (const id of ids) for (const L of [10, 12, 16, 18, 30]) console.log(bandLine(bossBand(id, L)));
  }
}
