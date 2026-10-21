// Routines (docs/routines.md, phase R1): a program fights for you when you don't act. Each class (each subclass from
// level 10) keeps one: its default rotation, the planner's priorities (planner.mjs, what the balance bots play), and
// an ordered stack of handlers you write. Each cycle you let the timer run out, the program checks its handlers top to
// bottom and the first that fits fires; if none fits, the rotation does. Anything you type overrides it for that cycle.
//
//   handler    three chips: WHEN (a condition), DO (a skill on your bar), TARGET (that part, the soonest attacker, the
//              lowest, a part with no ◆). Stored { when, do, target }. A part's WHEN chips open with its research
//              (research.mjs): decoded (3) its name and health, rule (15) its rule and timer, mastered (60) prediction.
//   RAM        the program's budget, from class level only in R1 (ramOf: 4 at level 1 to 10 at 50). A handler costs
//              its WHEN chip's RAM (1 plain, 2 a rule chip, 3 a mastered one), +1 when it fires a long cooldown.
//              Handlers past the budget, top to bottom, sit out.
//   can't      fire a skill with a cooldown of 6 or more (or once a fight) unless a handler names it; press Enter in
//              the Sync Window (it fires when the timer runs out, so never synced); read what the board doesn't show
//              (hidden timers, a veiled part's attack); read a tell (its moves count like auto-repeat: a tell's
//              simple answer, never its Open).
//   exception  a part, mutation or tell no handler covers and your research doesn't either, or a boss, lair,
//              Resident or crew boss phase (always): the program holds its turn, the part is marked on the board and
//              a cue sounds. You play it by hand; ` (or program resume) hands control back for what's on the board.
//   rails      auto jack-out at a Signal share you set (off, 10–50%), with your pack; stop-before-danger (on by
//              default): a walk never steps into an elite, a boss, the Resident or a vault guard.
//
// Rewards: a program's fight pays exactly what the same fight pays you (nothing here touches XP or loot).
//
// State: s.programs = { on, rails: { jackOut, danger }, by: { <class or subclass>: { handlers: [] } } }, made on first
// use (an older save gets the defaults: no SAVE_VERSION change). A fight's exceptions live on e.program.
import { hooks, emit, warn, active, alive, part, livingParts, attackers, intents, toIntent, said, classOf, subOf, hackerLevel, barKeys, cooldownOf, codexKey, defender, maxSignal, timersHidden } from './combat.mjs';
import { ABILITIES, MUTATIONS, FAMILIES, ROOM_FAMILIES, GUARDS, STRAINS, BOSSES, ARCHETYPES, SUBS } from './data.mjs';
import { researchAt, TIER } from './research.mjs';
import { decoded as geneDecoded } from './genome.mjs';
import { plannerWithout, soonest } from './planner.mjs';
import { raidOf } from './raid.mjs';
import { isUp } from './floorplan.mjs';

export const ROUTINES = {
  ram: [4, 10], // RAM at class level 1 and at 50, a straight line between
  long: 6, // a cooldown this long or longer stays your call unless a handler names it
  jackOut: [0, 10, 20, 30, 40, 50], // the auto jack-out line, % of your max Signal (0: off)
  low: 0.5, // "under half": a part's Integrity, your Signal
  fragments: 2, encrypted: 3,
  danger: ['elite', 'guard', 'core', 'boss'], // rooms a walk stops before
  key: '`', // hands control back
};
export const ramOf = (level) => Math.round(ROUTINES.ram[0] + ((Math.min(50, Math.max(1, level || 1)) - 1) * (ROUTINES.ram[1] - ROUTINES.ram[0])) / 49);
export const ramFor = (s) => ramOf(hackerLevel(s));

// ---------- the chips ----------
// WHEN chips on a part, by the research tier that opens them. ref is the part's Codex key (combat.mjs codexKey).
export const PART_WHEN = {
  present: { tier: TIER.decoded, ram: 1, icon: 'part', short: 'on board', label: (n) => `${n} on board`, tip: (n) => `The ${n} is on the board.` },
  low: { tier: TIER.decoded, ram: 1, icon: 'kill', short: 'under half', label: (n) => `${n} under half`, tip: (n) => `The ${n} is under half its Integrity.` },
  bare: { tier: TIER.decoded, ram: 1, icon: 'cracker', short: 'no ◆', label: (n) => `${n} no ◆`, tip: (n) => `The ${n} has no armor left.` },
  due: { tier: TIER.rule, ram: 2, icon: 'clock', short: 'hits now', label: (n) => `${n} hits now`, tip: (n) => `The ${n}'s attack lands this cycle, and its timer shows.` },
  soon: { tier: TIER.rule, ram: 2, icon: 'clock', short: 'hits in 2', label: (n) => `${n} hits in 2`, tip: (n) => `The ${n}'s attack lands this cycle or the next, and its timer shows.` },
  tell: { tier: TIER.rule, ram: 2, icon: 'counter', short: 'tell live', label: (n) => `${n} tell live`, tip: (n) => `A tell on the ${n} can be answered this cycle.` },
  pretell: { tier: TIER.mastered, ram: 3, icon: 'mastered', short: 'before tell', label: (n) => `before ${n} tell`, tip: (n) => `The cycle before a tell on the ${n} can be answered.` },
  open: { tier: TIER.mastered, ram: 3, icon: 'mastered', short: 'Open', label: (n) => `${n} Open`, tip: (n) => `The ${n} is Open: you read its tell.` },
};
// WHEN chips about the fight or you. open(s): whether your research has it.
const anyKey = (s, end, tier) => Object.keys(s.research || {}).some((k) => k.endsWith(':' + end) && researchAt(s, k) >= tier);
export const GLOBAL_WHEN = {
  always: { ram: 1, icon: 'cron', label: 'every cycle', tip: 'Every cycle the timer runs out.', open: () => true },
  hurt: { ram: 1, icon: 'signal', label: 'you under half', tip: 'Your Signal (or Integrity at home) is under half.', open: () => true },
  fragments: { ram: 2, icon: 'worm', label: `${ROUTINES.fragments}+ fragments`, tip: `${ROUTINES.fragments} or more fragments are on the board.`, open: (s) => anyKey(s, 'replicator', TIER.decoded) },
  encrypted: { ram: 2, icon: 'lock', label: `encrypted ${ROUTINES.encrypted}+`, tip: `Your encryption is ${ROUTINES.encrypted} or more.`, open: (s) => anyKey(s, 'encryptor', TIER.decoded) },
  anytell: { ram: 2, icon: 'counter', label: 'any tell live', tip: 'A tell on any part can be answered this cycle.', open: (s) => Object.keys(s.research || {}).some((k) => researchAt(s, k) >= TIER.rule) },
};
const MUT_WHEN = { ram: 2, icon: 'debuff' };
export const TARGETS = {
  that: { icon: 'part', label: 'that part', tip: 'The part the WHEN chip names (a tell: its part; fragments: the lowest).' },
  soonest: { icon: 'clock', label: 'soonest', tip: 'The part whose attack lands soonest, by the timers you can see.' },
  lowest: { icon: 'kill', label: 'lowest', tip: 'The part with the least Integrity left.' },
  bare: { icon: 'cracker', label: 'no ◆', tip: 'The lowest part with no armor. None: the handler waits.' },
};

// A part's name from its Codex key, from the tables (a strain's, a family's, a guard's, a boss's extra parts).
function specOf(ref) {
  const [body, id] = String(ref).split(':');
  const specs = [...(STRAINS[body]?.parts || []), ...(FAMILIES[body]?.parts || []), ...(ROOM_FAMILIES[body]?.parts || []), ...(GUARDS[body]?.parts || []), ...Object.values(BOSSES).filter((b) => b.family === body).flatMap((b) => b.extra || [])];
  return specs.find((x) => x.id === id) || null;
}
export const refName = (ref) => specOf(ref)?.name || String(ref).split(':')[1]?.replace(/-/g, ' ') || String(ref);
export const bodyName = (body) => STRAINS[body]?.name || FAMILIES[body]?.name || ROOM_FAMILIES[body]?.name || GUARDS[body]?.name || body;
export const refBody = (ref) => String(ref).split(':')[0];
// The key a part in a fight answers to: its Codex key, a second copy (Strobe 2, an id with a digit) as the first.
export const refOf = (v, p) => codexKey(v, p).replace(/\d+$/, '');
const researchOfRef = (s, ref) => researchAt(s, ref);

// A WHEN id: a global one, mut:<mutation>, or <ref>:<condition> (ref is body:part).
export function parseWhen(id) {
  const w = String(id || '');
  if (GLOBAL_WHEN[w]) return { kind: 'global', id: w, def: GLOBAL_WHEN[w] };
  if (w.startsWith('mut:') && MUTATIONS[w.slice(4)] && !MUTATIONS[w.slice(4)].retired) return { kind: 'mutation', id: w, mut: w.slice(4), def: MUT_WHEN };
  const i = w.lastIndexOf(':'), ref = w.slice(0, i), cond = w.slice(i + 1);
  if (i > 0 && ref.includes(':') && PART_WHEN[cond]) return { kind: 'part', id: w, ref, cond, def: PART_WHEN[cond] };
  return null;
}
// Is this WHEN chip yours to use (researched)?
export function whenOpen(s, id) {
  const w = parseWhen(id);
  if (!w) return false;
  if (w.kind === 'global') return w.def.open(s);
  if (w.kind === 'mutation') return geneDecoded(s, MUTATIONS[w.mut].gene);
  return researchOfRef(s, w.ref) >= w.def.tier;
}
export function whenLabel(id) {
  const w = parseWhen(id);
  if (!w) return '???';
  if (w.kind === 'global') return w.def.label;
  if (w.kind === 'mutation') return MUTATIONS[w.mut].name;
  return w.def.label(refName(w.ref));
}
export function whenTip(id) {
  const w = parseWhen(id);
  if (!w) return '';
  if (w.kind === 'global') return w.def.tip;
  if (w.kind === 'mutation') return `The virus is ${MUTATIONS[w.mut].name}.`;
  return w.def.tip(refName(w.ref));
}
export const whenIcon = (id) => parseWhen(id)?.def.icon || 'part';
export const whenRam = (id) => parseWhen(id)?.def.ram || 1;
// A long cooldown (or once a fight): only a handler that names it fires it.
export const isLong = (s, id) => !!ABILITIES[id] && id !== 'spike' && (!!ABILITIES[id]?.once || cooldownOf(s, id) >= ROUTINES.long);
export const handlerRam = (s, h) => whenRam(h.when) + (h.do && isLong(s, h.do) ? 1 : 0);

// ---------- the save ----------
export function programsOf(s) {
  const P = (s.programs ||= {});
  if (P.on === undefined) P.on = true;
  P.rails ||= {};
  if (P.rails.jackOut === undefined) P.rails.jackOut = 0;
  if (P.rails.danger === undefined) P.rails.danger = true;
  P.by ||= {};
  return P;
}
// Whose program: your subclass's from level 10, your class's before.
export const programKey = (s) => subOf(s) || classOf(s);
export const programName = (s) => SUBS[subOf(s)]?.name || ARCHETYPES[classOf(s)]?.name || classOf(s);
export function programOf(s, key = programKey(s)) {
  const P = programsOf(s);
  if (!P.by[key]) {
    // A subclass's first program starts as its class's (the handlers you wrote before level 10).
    const from = SUBS[key] && P.by[SUBS[key].cls];
    P.by[key] = { handlers: from ? from.handlers.map((h) => ({ ...h })) : [] };
  }
  return P.by[key];
}
export const rails = (s) => programsOf(s).rails;
// Your bar's skills (Spike, your slots, SIGINT): what a DO chip can be.
export const barSkills = (s) => barKeys(s).map(([key, id]) => ({ key, id })).filter((x) => ABILITIES[x.id]);
// Each handler with what it costs and whether it runs: in budget (top to bottom), its WHEN researched, its skill on your bar.
export function handlerRows(s, prog = programOf(s)) {
  const budget = ramFor(s), bar = new Set(barSkills(s).map((x) => x.id));
  let used = 0;
  return prog.handlers.map((h, i) => {
    const ram = handlerRam(s, h), fits = used + ram <= budget;
    if (fits) used += ram;
    const open = whenOpen(s, h.when), onBar = bar.has(h.do);
    return { h, i, ram, fits, open, onBar, runs: fits && open && onBar };
  });
}
export const ramUsed = (s, prog = programOf(s)) => handlerRows(s, prog).filter((r) => r.fits).reduce((n, r) => n + r.ram, 0);
const liveHandlers = (s) => handlerRows(s).filter((r) => r.runs).map((r) => r.h);

// ---------- reading the board (only what it shows) ----------
const isFrag = (p) => p.kind === 'fragment';
const partsFor = (s, ref) => livingParts(s).filter((p) => !isFrag(p) && refOf(s.encounter.virus, p) === ref);
const shown = (s) => intents(s, 4);
const attackNow = (i, upto) => !i.tell && !i.hidden && i.col <= upto && ['damage', 'encrypt', 'replicate', 'scramble', 'heal', 'fuse'].includes(i.effect);
// The parts a WHEN chip holds for right now (null: it doesn't hold; [] for a chip that names no part but holds).
function holds(s, w) {
  const e = s.encounter, list = shown(s);
  if (w.kind === 'global') {
    if (w.id === 'always') return [];
    if (w.id === 'hurt') { const d = defender(s); return d && d.integrity < d.max * ROUTINES.low ? [] : null; }
    if (w.id === 'fragments') { const f = livingParts(s).filter(isFrag).sort((a, b) => a.integrity - b.integrity); return f.length >= ROUTINES.fragments ? f : null; }
    if (w.id === 'encrypted') return (e.encrypt || 0) >= ROUTINES.encrypted ? [] : null;
    if (w.id === 'anytell') { const ps = list.filter((i) => i.tell && i.open).map((i) => part(s, i.source)).filter(alive); return ps.length ? ps : null; }
    return null;
  }
  if (w.kind === 'mutation') return e.virus.mutation === w.mut ? [] : null;
  const ps = partsFor(s, w.ref).filter((p) => {
    const mine = list.filter((i) => i.source === p.id);
    switch (w.cond) {
      case 'present': return true;
      case 'low': return p.integrity < p.max * ROUTINES.low;
      case 'bare': return !(p.armor > 0);
      case 'due': return !timersHidden(s, p) && mine.some((i) => attackNow(i, 0));
      case 'soon': return !timersHidden(s, p) && mine.some((i) => attackNow(i, 1));
      case 'tell': return mine.some((i) => i.tell && i.open);
      case 'pretell': return mine.some((i) => i.tell && !i.open && i.winFrom === 1);
      case 'open': return p.openUntil >= e.cycle;
      default: return false;
    }
  });
  return ps.length ? ps : null;
}
function targetOf(s, h, ps) {
  const live = livingParts(s);
  if (h.target === 'that') return ps?.[0] || null;
  if (h.target === 'soonest') return soonest(s) || null;
  if (h.target === 'lowest') return [...live].sort((a, b) => a.integrity - b.integrity)[0] || null;
  if (h.target === 'bare') return live.filter((p) => !(p.armor > 0)).sort((a, b) => a.integrity - b.integrity)[0] || null;
  return null;
}
const takesPart = (id) => !['none', 'aggro'].includes(ABILITIES[id]?.target);
// The command a handler fires now, or null when it doesn't fit (its WHEN doesn't hold, its skill is cooling, no target).
function handlerMove(s, h) {
  const w = parseWhen(h.when);
  if (!w || !whenOpen(s, h.when)) return null;
  const ps = holds(s, w);
  if (!ps) return null;
  if (!takesPart(h.do)) return toIntent(s, h.do).error ? null : h.do;
  const t = targetOf(s, h, ps);
  if (!t) return null;
  const text = `${h.do} ${t.id}`;
  return toIntent(s, text).error ? null : text;
}
// The rotation: the planner without any long cooldown (only a handler that names one fires it). Key 1 on the
// soonest attacker if that leaves it nothing.
function rotation(s) {
  const plan = plannerWithout(s, (id) => isLong(s, id));
  if (plan && !toIntent(s, plan).error) return plan;
  const t = soonest(s);
  return t && !toIntent(s, `spike ${t.id}`).error ? `spike ${t.id}` : 'hold';
}

// ---------- exceptions ----------
// Parts whose rule changes a decision (a third part, a guard's rule): the program covers one only at its rule tier.
const RULED = ['ward', 'wardsToo', 'lock', 'twin', 'reflect', 'mimic', 'command', 'deadman', 'fuse', 'hotspot', 'idle', 'front', 'backlog', 'buffer', 'rearm', 'syncOnly', 'phase', 'echo', 'tax', 'pkg', 'obfuscate'];
export const ruled = (p) => RULED.some((k) => p[k]);
const named = (s, pred) => liveHandlers(s).some((h) => { const w = parseWhen(h.when); return !!w && pred(w); });
// What the program doesn't cover on the board now: [{ key, kind, part, name }], before what you've handed back.
export function uncovered(s) {
  const e = s.encounter;
  if (!active(s)) return [];
  const v = e.virus, out = [];
  // A boss, a lair's native, the Resident or a crew boss: its phases always need you (a new phase throws again).
  if (v.boss || v.raid) {
    const ph = v.raid ? `raid${raidOf(s)?.phase ?? 0}` : `p${(v.phases || []).filter((x) => x.done).length}`;
    const crown = livingParts(s).find((p) => p.core) || livingParts(s).find((p) => !isFrag(p)) || null;
    out.push({ key: `boss:${ph}`, kind: 'boss', part: crown?.id || null, name: v.name });
  }
  for (const p of livingParts(s)) {
    if (isFrag(p)) continue;
    const ref = refOf(v, p), n = researchOfRef(s, ref);
    const need = ruled(p) ? TIER.rule : TIER.decoded;
    if (n < need && !named(s, (w) => w.kind === 'part' && w.ref === ref)) out.push({ key: `part:${ref}`, kind: 'part', part: p.id, name: p.name });
  }
  if (v.mutation && MUTATIONS[v.mutation] && !geneDecoded(s, MUTATIONS[v.mutation].gene) && !named(s, (w) => w.kind === 'mutation' && w.mut === v.mutation)) out.push({ key: `mut:${v.mutation}`, kind: 'mutation', part: null, name: MUTATIONS[v.mutation].name });
  // A tell on the board: a part you've mastered, or a handler on its tells (or any tell), covers it.
  for (const i of shown(s).filter((x) => x.tell)) {
    const p = part(s, i.source);
    if (!alive(p)) continue;
    const ref = refOf(v, p);
    if (researchOfRef(s, ref) >= TIER.mastered || named(s, (w) => w.id === 'anytell' || (w.kind === 'part' && w.ref === ref && ['tell', 'pretell'].includes(w.cond)))) continue;
    out.push({ key: `tell:${p.id}:${i.id || i.name}`, kind: 'tell', part: p.id, name: `${p.name}'s ${i.name}` });
  }
  return [...new Map(out.map((x) => [x.key, x])).values()];
}
const progE = (e) => (e.program ||= { ack: {}, thrown: {} });
// The exceptions holding the program now: uncovered, and not handed back.
export const exceptionsOf = (s) => (active(s) ? uncovered(s).filter((x) => !progE(s.encounter).ack[x.key]) : []);
// Say each new exception once, with its cue (app.js plays it): true if one was new.
export function noteExceptions(s) {
  if (!live(s) || !active(s)) return false;
  const P = progE(s.encounter), xs = exceptionsOf(s).filter((x) => !P.thrown[x.key]);
  if (!xs.length) return false;
  for (const x of xs) P.thrown[x.key] = s.encounter.cycle;
  const what = (x) => (x.kind === 'boss' ? `${x.name}'s phase` : x.kind === 'mutation' ? `${x.name} mutation` : x.kind === 'tell' ? x.name : `the ${x.name}`);
  const names = xs.map(what), list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
  emit(s, 'exception', `EXCEPTION: ${list}. Your program holds. Play it, or press ${ROUTINES.key} to hand back.`, { target: xs.find((x) => x.part)?.part || null, exception: xs.map((x) => x.key), kind: xs[0].kind });
  return true;
}
// Hand control back: what's on the board now is yours to leave to the program for the rest of the fight (a boss's
// next phase throws again).
export function handBack(s) {
  if (!active(s)) return warn(s, 'No fight running.');
  const xs = exceptionsOf(s), P = progE(s.encounter);
  if (!xs.length) return emit(s, 'info', '⟳ Your program is running.');
  for (const x of xs) P.ack[x.key] = s.encounter.cycle;
  emit(s, 'program', `⟳ Back to your program: ${xs.map((x) => x.name).join(', ')}.`, { auto: 'program' });
}

// ---------- a cycle ----------
// Is a program running your fights? (The browser installs it; a crewmate never has one.)
export const live = (s) => !!hooks.program && !s?.who && programsOf(s).on;
// What the program does when the timer runs out: { text, handler } (handler: its index, or -1 for the rotation), or
// { hold } while an exception waits. null when it's off.
export function decide(s) {
  if (!live(s) || !active(s)) return null;
  const xs = exceptionsOf(s);
  if (xs.length) return { hold: true, exceptions: xs, part: xs.find((x) => x.part)?.part || null };
  const rows = handlerRows(s);
  for (const r of rows) {
    if (!r.runs) continue;
    const text = handlerMove(s, r.h);
    if (text) return { text, handler: r.i };
  }
  return { text: rotation(s), handler: -1 };
}
// The same, for the board: nothing it reads may move the game's dice or log.
export function preview(s) {
  if (!live(s) || !active(s)) return null;
  const e = s.encounter, key = `${e.cycle}:${s.serial}:${e.queue?.text || ''}:${JSON.stringify(e.program?.ack || {})}`;
  if (cache.e === e && cache.key === key) return cache.out;
  const rng = s.rng, serial = s.serial, logs = s.logs.length;
  let out = null;
  try { out = decide(s); } catch { out = null; } finally { s.rng = rng; s.serial = serial; s.logs.length = logs; }
  if (out && !out.hold) out.target = toIntent(s, out.text).target || null;
  Object.assign(cache, { e, key, out });
  return out;
}
const cache = { e: null, key: '', out: null };
// The engine's hook (combat.mjs playerPhase): the move, or a hold with its line.
function programHook(s) {
  const d = decide(s);
  if (!d) return null;
  if (!d.hold) return d;
  const fresh = noteExceptions(s);
  return { hold: true, part: d.part, type: 'hold', message: fresh ? '⟳ Your program holds.' : `⟳ Your program holds: ${d.exceptions.map((x) => x.name).join(', ')}. Press ${ROUTINES.key} to hand back.` };
}

// ---------- the rails ----------
// Auto jack-out: on a run, crossing your line jacks you out with your pack (in a fight, the emergency jack out).
export function railCheck(s) {
  const r = rails(s), run = s.run;
  if (!r.jackOut || !run || run.breach || s.who) return false;
  const max = run.max || maxSignal(s), pct = max ? (run.integrity / max) * 100 : 100;
  const was = run.railAt;
  run.railAt = pct;
  if (was === undefined || was < r.jackOut || pct >= r.jackOut || run.integrity <= 0) return false; // only a crossing (a run you start under it never trips)
  if (active(s) && s.encounter.mode === 'run') {
    emit(s, 'fled', `AUTO JACK OUT: Signal under ${r.jackOut}%. You keep your pack.`, { rail: 'jackout' });
    hooks.flee?.(s);
    return true;
  }
  if (active(s)) return false;
  emit(s, 'rail', `AUTO JACK OUT: Signal under ${r.jackOut}%.`, { rail: 'jackout' });
  hooks.jackOut?.(s);
  return true;
}
// Stop before danger: what a walk won't step into on its own (an elite, a boss, the Resident, a vault guard, still up).
export function dangerous(s, room) {
  return !!room && ROUTINES.danger.includes(room.kind) && isUp(s, room);
}
export function walkStop(s, room) {
  if (!rails(s).danger || !dangerous(s, room)) return false;
  const label = room.kind === 'core' ? 'the Resident' : room.kind === 'boss' ? 'a boss' : room.kind === 'guard' ? 'a vault guard' : 'an elite';
  emit(s, 'rail', `Stopped before ${room.path}: ${label} holds it. Walk in when you're ready.`, { rail: 'danger', room: room.id });
  return true;
}

// ---------- the command ----------
// program · program on|off · program add [when] [do] [target] · program set <n> when|do|target <id> ·
// program move <n> <to> · program remove <n> · program clear · program resume · program jackout off|10–50 ·
// program danger on|off
export function programCommand(s, text) {
  const [, verb = '', ...args] = text.split(' ');
  const prog = programOf(s), P = programsOf(s), H = prog.handlers;
  const n = (x) => { const i = Number(x) - 1; return Number.isInteger(i) && i >= 0 && i < H.length ? i : -1; };
  const fits = (list) => { const used = list.reduce((a, h) => a + handlerRam(s, h), 0); return used <= ramFor(s) ? null : `That needs ${used} RAM. You have ${ramFor(s)}.`; };
  const checkWhen = (id) => (!parseWhen(id) ? `No WHEN chip ${id}.` : !whenOpen(s, id) ? `${whenLabel(id)}: research it first.` : null);
  const bar = new Set(barSkills(s).map((x) => x.id));
  const checkDo = (id) => (!ABILITIES[id] ? `No skill ${id}.` : !bar.has(id) ? `${ABILITIES[id].name} is not on your bar.` : null);
  const checkTarget = (id) => (TARGETS[id] ? null : `No TARGET chip ${id}. Try: ${Object.keys(TARGETS).join(', ')}.`);
  if (!verb) return emit(s, 'info', `${programName(s)} program: ${P.on ? 'on' : 'off'}, ${ramUsed(s)}/${ramFor(s)} RAM. ${H.length ? H.map((h, i) => `${i + 1}. ${whenLabel(h.when)} → ${said(s, h.do)} → ${TARGETS[h.target]?.label || h.target}`).join('. ') + '.' : 'No handlers: the rotation plays.'}`);
  if (verb === 'on' || verb === 'off') { P.on = verb === 'on'; return emit(s, 'info', `Program ${verb}.${P.on ? '' : ' The timer repeats your last hit again.'}`); }
  if (verb === 'resume' || verb === 'back') return handBack(s);
  if (verb === 'jackout') {
    const v = args[0] === 'off' ? 0 : Number(String(args[0]).replace('%', ''));
    if (!ROUTINES.jackOut.includes(v)) return warn(s, 'program jackout off, 10, 20, 30, 40 or 50.');
    P.rails.jackOut = v;
    if (s.run) delete s.run.railAt;
    return emit(s, 'info', v ? `Auto jack-out at ${v}% Signal.` : 'Auto jack-out off.');
  }
  if (verb === 'danger') { if (!['on', 'off'].includes(args[0])) return warn(s, 'program danger on or off.'); P.rails.danger = args[0] === 'on'; return emit(s, 'info', `Stop before danger ${args[0]}.`); }
  if (verb === 'add') {
    const h = { when: args[0] || 'always', do: args[1] || 'spike', target: args[2] || (parseWhen(args[0])?.kind === 'part' ? 'that' : 'soonest') };
    const bad = checkWhen(h.when) || checkDo(h.do) || checkTarget(h.target) || fits([...H, h]);
    if (bad) return warn(s, bad);
    H.push(h);
    return emit(s, 'info', `Handler ${H.length}: ${whenLabel(h.when)} → ${said(s, h.do)} → ${TARGETS[h.target].label}.`);
  }
  if (verb === 'set') {
    const i = n(args[0]), slot = args[1], id = args[2];
    if (i < 0) return warn(s, `No handler ${args[0]}.`);
    if (!['when', 'do', 'target'].includes(slot) || !id) return warn(s, 'program set <n> when|do|target <chip>.');
    const bad = slot === 'when' ? checkWhen(id) : slot === 'do' ? checkDo(id) : checkTarget(id);
    if (bad) return warn(s, bad);
    const next = H.map((h, j) => (j === i ? { ...h, [slot]: id } : h));
    const over = fits(next);
    if (over) return warn(s, over);
    H[i] = next[i];
    return emit(s, 'info', `Handler ${i + 1}: ${whenLabel(H[i].when)} → ${said(s, H[i].do)} → ${TARGETS[H[i].target].label}.`);
  }
  if (verb === 'move') {
    const i = n(args[0]), j = Math.max(0, Math.min(H.length - 1, Number(args[1]) - 1));
    if (i < 0 || !Number.isInteger(j)) return warn(s, 'program move <n> <to>.');
    const [h] = H.splice(i, 1);
    H.splice(j, 0, h);
    return emit(s, 'info', `Handler moved to ${j + 1}.`);
  }
  if (verb === 'remove') { const i = n(args[0]); if (i < 0) return warn(s, `No handler ${args[0]}.`); H.splice(i, 1); return emit(s, 'info', `Handler ${i + 1} removed.`); }
  if (verb === 'clear') { H.length = 0; return emit(s, 'info', 'Handlers cleared: the rotation plays.'); }
  return warn(s, 'program [on|off|add|set|move|remove|clear|resume|jackout|danger].');
}

// The palette: every WHEN chip you could know, open or not. Parts you've met (research above 0), by body.
export function palette(s) {
  const glob = Object.keys(GLOBAL_WHEN).map((id) => ({ id, open: whenOpen(s, id) }));
  const muts = Object.keys(MUTATIONS).filter((m) => !MUTATIONS[m].retired).map((m) => ({ id: 'mut:' + m, open: whenOpen(s, 'mut:' + m) })).filter((x) => x.open);
  const refs = Object.keys(s.research || {}).filter((k) => researchAt(s, k) > 0 && specOf(k));
  const parts = refs.map((ref) => ({ ref, name: refName(ref), body: bodyName(refBody(ref)), n: researchAt(s, ref), chips: Object.keys(PART_WHEN).map((c) => ({ id: `${ref}:${c}`, cond: c, open: researchAt(s, ref) >= PART_WHEN[c].tier, tier: PART_WHEN[c].tier })) })).sort((a, b) => a.body.localeCompare(b.body) || a.name.localeCompare(b.name));
  return { glob, muts, parts };
}

// Install: the browser's fights run your program (app.js). Tests install it too.
export function installPrograms() {
  hooks.program = programHook;
  hooks.programCycle = (s) => { if (s.who) return; noteExceptions(s); railCheck(s); };
  hooks.railCheck = railCheck;
  hooks.walkStop = walkStop;
}
hooks.programCommand = programCommand; // the command works anywhere the engine runs; the program only once installed
