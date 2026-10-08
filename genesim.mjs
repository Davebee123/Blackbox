// The genome harness (docs/genome.md section 11): the boss bands, the spike cap, and the per-gene cost and answer checks.
// Scripted players, not people: the planner over every subclass (the four classes below level 10), in blues, at a level.
//   read      the planner, reading every tell and answering every gene it has a rule for
//   misread   plays as if blind on a seeded 30% of its cycles (a stand-in for a person)
//   blind     never reads a tell (TELL.bots.answer = false)
//   ignore    plays one gene as if it weren't there (genes.mjs GENE_BOTS), the per-gene version of blind
// node genesim.mjs bosses [ids] [levels]   the boss bands
// node genesim.mjs genes [seeds]           the per-gene table (docs/genome.md "What shipped")
import { fresh, selectEncounter, command, resolveCycle, active, defender, maxSignal, classOf } from './dist/combat.mjs';
import { ARCHETYPES, BOSSES, TELL, SUBCLASS, STRAINS } from './dist/data.mjs';
import { GENES, GENE_BOTS } from './dist/genes.mjs';
import { planner } from './dist/planner.mjs';
import { build } from './balance.mjs';

export const SUBS = Object.entries(ARCHETYPES).flatMap(([cls, a]) => Object.keys(a.subs).map((sub) => [cls, sub]));
export const SEEDS = Array.from({ length: Number(process.env.GENESIM_SEEDS) || 6 }, (_, i) => i + 1); // six a cell, as docs/genome.md measured
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
// Also measures the spike cap (docs/genome.md rule 5): the biggest single landing on you and the worst three cycles,
// as shares of your max.
export function playOut(s, move, cap = 80, { sync = true } = {}) {
  command(s, 'engage');
  const max = defender(s).max, lost = [];
  let spike = 0, spikeBy = '';
  for (let n = 0; n < cap && active(s); n++) {
    const text = move(s) || 'hold';
    command(s, text);
    if (sync && s.encounter?.sync && s.encounter.virus.parts.some((p) => p.syncOnly && p.integrity > 0)) s.encounter.synced = text !== 'hold';
    if (s.encounter?.sync?.surprise) s.encounter.synced = text !== 'hold';
    const was = defender(s).integrity, ev = resolveCycle(s);
    for (const x of ev) if (x.type === 'server-hit' && !x.who && (x.amount || 0) > spike) { spike = x.amount; spikeBy = `${x.message} (max ${max}, ${classOf(s)})`; }
    lost.push(Math.max(0, was - defender(s).integrity));
  }
  const r = s.reports.at(-1) || { result: 'stalemate', cycles: cap, endIntegrity: defender(s).integrity };
  const three = Math.max(0, ...lost.map((_, i) => (lost[i] || 0) + (lost[i + 1] || 0) + (lost[i + 2] || 0)));
  return { ...r, spike: spike / max, three: three / max, spikeBy };
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
  return { win: r.result === 'victory', lost: Math.round(((max - r.endIntegrity) / max) * 100), cycles: r.cycles, spike: r.spike, three: r.three, spikeBy: r.spikeBy };
}
// A boss at a level: win rates for the reader, the misreader and the blind bot, and wins by subclass (of six).
export function bossBand(id, level, modes = ['read', 'misread', 'blind'], seeds = SEEDS) {
  const out = { id, level, subs: {}, seeds: seeds.length };
  for (const mode of modes) {
    let wins = 0, n = 0, lost = 0;
    for (const [cls, sub] of SUBS) {
      let w = 0;
      for (const seed of seeds) { const r = bossFight(id, level, cls, sub, seed, mode); w += r.win; lost += r.lost; n++; if (mode === 'read') { if (r.spike > (out.spike || 0)) { out.spike = r.spike; out.spikeBy = `${sub}: ${r.spikeBy}`; } out.three = Math.max(out.three || 0, r.three); } }
      wins += w;
      if (mode === 'read') out.subs[sub] = w;
      if (mode === 'misread') (out.misSubs ||= {})[sub] = w;
    }
    out[mode] = wins / n;
    out[mode + 'Lost'] = lost / n;
  }
  return out;
}
const pct = (x) => `${Math.round(x * 100)}%`;
export const bandLine = (b) => `${BOSSES[b.id].name} at ${b.level}: read ${pct(b.read)}, misread ${pct(b.misread)}, blind ${pct(b.blind)} · spike ${pct(b.spike)}, three ${pct(b.three)} · ${Object.entries(b.subs).map(([k, v]) => `${k} ${v}/${b.seeds}`).join(' ')}`;

// ---------- the per-gene checks (docs/genome.md 11.1) ----------
// A probe is the body plus one gene, against the body alone, on the same seeds. Each gene in play today has one:
// a third part or a mutation on its family's body, Linked on a v1, a named build against its family's body, a guard's
// rule against a guard of the same shape, a tell alone against no tells (TELL.sim.only). The body's own genes
// (Surge, Encrypt, Replicate, Scramble, Veil) are free and have no probe of their own.
const fam = (family, genes = []) => ({ key: 'random', family, genes });
const probe = (opens, body, gene, extra = {}) => ({ opens, body, with: { ...body, ...extra }, gene });
export const PROBES = {
  ward: probe(3, fam('ransomware'), 'ward', { genes: ['ward'] }),
  mutexlock: probe(8, fam('ransomware'), 'mutexlock', { genes: ['mutexlock'] }),
  tripwire: probe(20, fam('ransomware'), 'tripwire', { genes: ['tripwire'] }),
  twin: probe(3, fam('worm'), 'twin', { genes: ['twin'] }),
  c2: probe(8, fam('worm'), 'c2', { genes: ['c2'] }),
  decoymirror: probe(4, fam('ghostroot'), 'decoymirror', { genes: ['decoymirror'] }),
  mimic: probe(8, fam('ghostroot'), 'mimic', { genes: ['mimic'] }),
  armored: probe(4, fam('ransomware'), 'armored', { genes: ['armored'], mutation: 'armored' }),
  regenerative: probe(4, fam('worm'), 'regenerative', { genes: ['regenerative'], mutation: 'regenerative' }),
  hasty: probe(4, fam('ghostroot'), 'hasty', { genes: ['hasty'], mutation: 'hasty' }),
  adaptive: probe(4, fam('ransomware'), 'adaptive', { genes: ['adaptive'], mutation: 'adaptive' }),
  linked: probe(1, fam('worm'), 'linked', { genes: ['linked'] }),
  keyring: probe(1, { key: 'shredder' }, 'keyring', { key: 'bouncer' }),
  escalation: probe(1, { key: 'watchdog' }, 'escalation', { key: 'tracer' }),
  overcharge: probe(17, { ...fam('ransomware'), only: [] }, 'overcharge', { only: ['overcharge'] }),
  fulldisk: probe(1, { ...fam('ransomware'), only: [] }, 'fulldisk', { only: ['fulldisk'] }),
  massmailer: probe(1, { ...fam('worm'), only: [] }, 'massmailer', { only: ['massmailer'] }),
  possession: probe(1, { ...fam('ghostroot'), only: [] }, 'possession', { only: ['possession'] }),
  doubleextortion: probe(10, { ...fam('ransomware'), only: [] }, 'doubleextortion', { only: ['doubleextortion'] }),
  selfupdate: probe(10, { ...fam('worm'), only: [] }, 'selfupdate', { only: ['selfupdate'] }),
  persistence: probe(10, { ...fam('ghostroot'), only: [] }, 'persistence', { only: ['persistence'] }),
  rekey: probe(6, { key: 'sentinel', only: [] }, 'rekey', { only: ['rekey'] }),
  batteringram: probe(1, { key: 'bouncer', only: [] }, 'batteringram', { only: ['batteringram'] }),
  hotfix: probe(3, { key: 'random', family: 'worm', strain: 'patchwork', genes: [], only: [] }, 'hotfix', { only: ['hotfix'] }),
};
// The named builds: each strain against its family's body. Keylogger's two genes share one probe.
for (const [k, st] of Object.entries(STRAINS)) PROBES[st.genes[0]] = { opens: st.from, body: fam(st.lineage), with: { ...fam(st.lineage), strain: k }, gene: st.genes[0], build: k, also: st.genes.slice(1) };
export const PROBE_LEVELS = [5, 10, 18, 30];
// Who plays a level: the four classes below SUBCLASS.from, every subclass from it.
export const playersAt = (L) => (L >= SUBCLASS.from ? SUBS : Object.keys(ARCHETYPES).map((cls) => [cls, null]));
// Genes the planner has a rule for, so ignoring them means something (planner.mjs, tells.mjs, the Sync Window here).
export const ANSWERED = ['ward', 'mutexlock', 'tripwire', 'twin', 'c2', 'decoymirror', 'mimic', 'keyring', 'adaptive', 'phaseshift', 'synclock', 'overcharge', 'fulldisk', 'massmailer', 'possession', 'doubleextortion', 'selfupdate', 'persistence', 'rekey', 'batteringram', 'hotfix'];

// One probe fight: a run fight at the level, the planner reading (or ignoring one gene).
export function probeFight(cfg, level, cls, sub, seed, { ignore = null } = {}) {
  const s = player(cls, sub, level);
  s.rng = (seed * 2654435761 + level) >>> 0;
  const key = cfg.key || 'random';
  TELL.sim.only = cfg.only || null;
  if (ignore) GENE_BOTS.ignore = new Set([ignore]);
  try {
    selectEncounter(s, key, (seed * 7919 + level * 131) >>> 0, { mode: 'run', room: '/sim', level, zone: key === 'random', ...(key === 'random' ? { family: cfg.family, strain: cfg.strain, genes: cfg.genes || [], grade: 1, mutation: cfg.mutation || null } : { mutation: null }) });
    s.encounter.soft = 1;
    const max = s.run.max, r = playOut(s, planner, 80, { sync: ignore !== 'synclock' });
    return { win: r.result === 'victory', lost: Math.min(100, Math.round(((max - r.endIntegrity) / max) * 100)) };
  } finally { TELL.sim.only = null; GENE_BOTS.ignore = new Set(); }
}
const avg = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
// A gene's cost and answer, over the levels it's open at, every player, the seeds: Signal lost with it over the body
// alone (cost, and per cost point), and with it ignored over it answered (answer), and each player's wins either way.
export function geneCheck(id, { seeds = SEEDS, levels = PROBE_LEVELS, answer = true } = {}) {
  const P = PROBES[id], out = { id, cost: GENES[id].cost, levels: {}, subs: {} };
  const Ls = levels.filter((L) => L >= P.opens);
  const all = { body: [], with: [], ignore: [] };
  for (const L of Ls) {
    const row = { body: [], with: [], ignore: [] };
    for (const [cls, sub] of playersAt(L)) {
      const who = sub || cls, x = (out.subs[who] ||= { with: 0, ignore: 0, n: 0 });
      for (const seed of seeds) {
        const b = probeFight(P.body, L, cls, sub, seed), w = probeFight(P.with, L, cls, sub, seed);
        row.body.push(b.lost); row.with.push(w.lost); x.with += w.win; x.n++;
        if (answer && ANSWERED.includes(id)) { const i = probeFight(P.with, L, cls, sub, seed, { ignore: id }); row.ignore.push(i.lost); x.ignore += i.win; }
      }
    }
    out.levels[L] = { cost: avg(row.with) - avg(row.body), answer: row.ignore.length ? avg(row.ignore) - avg(row.with) : null };
    for (const k of Object.keys(all)) all[k].push(...row[k]);
  }
  out.delta = avg(all.with) - avg(all.body);
  out.perPoint = out.delta / out.cost;
  out.answered = ANSWERED.includes(id) && answer;
  if (out.answered) { out.answer = avg(all.ignore) - avg(all.with); out.ignoreCost = avg(all.ignore) - avg(all.body); }
  return out;
}
const f1 = (x) => (x == null ? '' : (x >= 0 ? '+' : '') + x.toFixed(1));
export const geneLine = (c) => `${GENES[c.id].name.padEnd(16)} cost ${c.cost} · ${f1(c.delta)} pts (${f1(c.perPoint)} a point)${c.answered ? ` · answering saves ${f1(c.answer)}, ignoring costs ${f1(c.ignoreCost)}` : ''} · ${Object.entries(c.levels).map(([L, x]) => `${L}: ${f1(x.cost)}`).join(' ')}`;

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const [what = 'bosses', ...args] = process.argv.slice(2);
  if (what === 'bosses') {
    const ids = args.filter((x) => BOSSES[x]), levels = args.filter((x) => /^\d+$/.test(x)).map(Number);
    for (const id of ids.length ? ids : ['nb-hashlord', 'nb-mirrorshade']) for (const L of levels.length ? levels : [10, 12, 16, 18, 30]) console.log(bandLine(bossBand(id, L)));
  }
  if (what === 'genes') {
    const seeds = SEEDS.slice(0, Number(args.find((x) => /^\d+$/.test(x))) || SEEDS.length), only = args.filter((x) => PROBES[x]);
    for (const id of only.length ? only : Object.keys(PROBES)) console.log(geneLine(geneCheck(id, { seeds })));
  }
}
