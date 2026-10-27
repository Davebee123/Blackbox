// Routines (docs/routines.md, phase R1): a program fights for you when you don't act. They unlock at class level 5
// (ROUTINES.unlockLevel); below it the timer repeats your last hit, as it always did. Each class (each subclass from
// level 10) keeps one program: a routine per virus (a Codex body: a family, a strain, a guard, the Exfil) it has met,
// and its default rotation for every virus with no routine: the kit player (planner.mjs kitPlanner), which plays your
// skills well and reads the timers but nothing of the virus, no tell and no part's rule (docs/puzzle-fights.md 3.1:
// the program fits the trick, so answering a lever is a handler's job). The fight's virus picks the routine. Each
// cycle you let the timer run out, the routine checks its handlers top to bottom and the first that fits fires; if
// none fits, the rotation does. Anything you type overrides it.
//
//   handler    three chips: WHEN (a condition), DO (a skill on your bar; Rotation, your rotation's move at the part;
//              Hold from level 8, nothing), TARGET (that part, the soonest attacker, the lowest, a part with no ◆, the
//              soonest with no beat on the board, the other parts). Stored { when, do, target }. A handler that names
//              its part and holds but can't fire (its skill cooling) aims the rotation at that part. A part's WHEN
//              chips open with its research (research.mjs): decoded (3) its name and health, rule (15) its rule and
//              timer, mastered (60) prediction.
//   RAM        a budget per routine, not shared: ramFor(s, body) = ramOf(class level) (4 at level 1 to 10 at 50) +
//              ramBonus(s, body) (0 in R1; R2's Codex mastery adds there, per virus). A handler costs its WHEN chip's
//              RAM (1 plain, 2 a rule chip, 3 a mastered one), +1 when it fires a long cooldown. Handlers past the
//              budget, top to bottom, sit out.
//   presets    ready-made routines for a virus (presetsFor), built from its parts, your research and your bar, each
//              fitting its RAM; first a lever's (Quiet on the beat, Tripwire last, Lockbox first) for each lever part
//              whose rule you've researched. Picking one replaces the stack; an edited stack can be got back with
//              program undo.
//   break ◆    an option on each routine, on by default (armorFirst): before a handler fires a hit that a ◆ on its
//   first      target would take (combat.mjs armorTakes), the program fires your best ready armor-breaker at that part
//              instead (breakerFor: the skills whose data breaks ◆, strip or chits); none ready, the hit goes at a part
//              with no ◆ if the TARGET chip allows one (soonest, lowest; that part: another the WHEN chip names), else
//              it fires anyway. It costs ROUTINES.armorRam (0: free). The rotation strips ◆ first on its own.
//   can't      fire a skill with a cooldown of 6 or more (or once a fight) unless a handler names it; press Enter in
//              the Sync Window (it fires when the timer runs out, so never synced); read what the board doesn't show
//              (hidden timers, a veiled part's attack); read a tell (its moves count like auto-repeat: a tell's
//              simple answer, never its Open).
//   exception  only against a virus whose routine you made or confirmed (a preset picked, a handler added or edited,
//              Confirm pressed; a virus with none is the rotation's and never throws): a part no handler names and your research doesn't cover (a charge on it, until mastered), or a lever no handler names (a beat, a part to break first or last, a seal or a cast): that part is
//              yours to play. The program plays the rest of the fight and never targets it; once it's gone, or you
//              have acted on it, the program takes it too. Only excepted parts left: it holds (nothing fires). A boss,
//              lair boss, Resident or crew boss: the whole fight is yours. One cue a fight.
//   rails      auto jack-out at a Signal share you set (off, 10–50%), with your pack; stop-before-danger (on by
//              default): a walk never steps into an elite, a boss, the Resident or a vault guard.
//
// Rewards: a program's fight pays exactly what the same fight pays you (nothing here touches XP or loot).
//
// State: s.programs = { on, focus, rails: { jackOut, danger }, by: { <class or subclass>: { routines: { <body>:
// { handlers: [], confirmed, undo, armor } } } } } (armor: false when Break ◆ first is off; missing is on), made on
// first use (an older save gets the defaults: no SAVE_VERSION change; an R1 save's single stack moves into its viruses'
// routines, migrate). A fight's exceptions live on e.program.
import { hooks, emit, warn, active, alive, part, livingParts, intents, toIntent, said, classOf, subOf, hackerLevel, barKeys, cooldownOf, codexKey, defender, maxSignal, timersHidden, armorTakes, frontOf, buffed, frozenNow, packed } from './combat.mjs';
import { ABILITIES, MUTATIONS, FAMILIES, ROOM_FAMILIES, GUARDS, STRAINS, BOSSES, ARCHETYPES, SUBS, TELLS, TELL_SETS } from './data.mjs';
import { researchAt, TIER } from './research.mjs';
import { decoded as geneDecoded } from './genome.mjs';
import { kitPlanner, kitPlannerAt, soonest } from './planner.mjs';
import { GENES } from './genes.mjs';
import { sigintTarget, dearest } from './tells.mjs';
import { isUp } from './floorplan.mjs';

export const ROUTINES = {
  unlockLevel: 5, // the class level routines open at; below it the timer repeats your last hit
  ram: [4, 10], // RAM at class level 1 and at 50, a straight line between: every routine's base
  long: 6, // a cooldown this long or longer stays your call unless a handler names it
  jackOut: [0, 10, 20, 30, 40, 50], // the auto jack-out line, % of your max Signal (0: off)
  low: 0.5, // "under half": a part's Integrity, your Signal
  fragments: 2, encrypted: 3,
  sealDear: 2, sealOut: 2, // seal dear (docs/puzzle-levers.md 7): a seal that lands within sealOut cycles on a part still wearing sealDear ◆ or more
  danger: ['elite', 'guard', 'core', 'boss'], // rooms a walk stops before
  presets: 5, // the most plain presets a virus shows (a lever's preset comes on top, one per lever researched)
  holdFrom: 8, // the Hold chip (a DO that fires nothing) opens at this class level, with the Mimic's first beats
  armorRam: 0, // what Break ◆ first costs a routine: free, since it's on by default (a cost would cut every routine's RAM, and push the last handler of a full one out)
};
export const LOCKED = `Routines unlock at level ${ROUTINES.unlockLevel}.`;
export const unlocked = (s, arch = classOf(s)) => hackerLevel(s, arch) >= ROUTINES.unlockLevel;
export const ramOf = (level) => Math.round(ROUTINES.ram[0] + ((Math.min(50, Math.max(1, level || 1)) - 1) * (ROUTINES.ram[1] - ROUTINES.ram[0])) / 49);
// RAM a virus's routine gets on top of the base. R2: Codex mastery of that virus adds here (docs/routines.md, RAM).
export const ramBonus = (s, body) => { void s; void body; return 0; };
export const ramFor = (s, body = null, arch = classOf(s)) => ramOf(hackerLevel(s, arch)) + (body ? ramBonus(s, body) : 0);

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
  // A seal's lever (docs/puzzle-levers.md 3.5, 7): it would hand out a lot.
  sealdear: { tier: TIER.rule, ram: 2, icon: 'cracker', short: 'seal dear', label: (n) => `${n} seal dear`, tip: (n) => `A seal on the ${n} lands within ${ROUTINES.sealOut} cycles while it still wears ${ROUTINES.sealDear} ◆ or more.` },
};
// WHEN chips about the fight or you. open(s): whether your research has it.
const anyKey = (s, end, tier) => Object.keys(s.research || {}).some((k) => k.endsWith(':' + end) && researchAt(s, k) >= tier);
export const GLOBAL_WHEN = {
  always: { ram: 1, icon: 'cron', label: 'every cycle', tip: 'Every cycle the timer runs out.', open: () => true },
  hurt: { ram: 1, icon: 'signal', label: 'you under half', tip: 'Your Signal (or Integrity at home) is under half.', open: () => true },
  fragments: { ram: 2, icon: 'worm', label: `${ROUTINES.fragments}+ fragments`, tip: `${ROUTINES.fragments} or more fragments are on the board.`, open: (s) => anyKey(s, 'replicator', TIER.decoded) },
  encrypted: { ram: 2, icon: 'lock', label: `encrypted ${ROUTINES.encrypted}+`, tip: `Your encryption is ${ROUTINES.encrypted} or more.`, open: (s) => anyKey(s, 'encryptor', TIER.decoded) },
  anytell: { ram: 2, icon: 'counter', label: 'any tell live', tip: 'A tell on any part can be answered this cycle.', open: (s) => Object.keys(s.research || {}).some((k) => researchAt(s, k) >= TIER.rule) },
  beat1: { ram: 2, icon: 'echo', label: 'beat in 1', tip: 'A beat lands this cycle: what you fire now is played back.', open: (s) => beatKnown(s) },
  beat2: { ram: 2, icon: 'echo', label: 'beat in 2', tip: 'A beat lands this cycle or the next.', open: (s) => beatKnown(s) },
  // SIGINT's lever (docs/puzzle-levers.md 3.6, 7): open at the rule tier, as any tell live is.
  dearer: { ram: 2, icon: 'interrupt', label: 'dearer', tip: 'The cast or charge SIGINT would stop now costs more than every other one on the board, or is the only one.', open: (s) => Object.keys(s.research || {}).some((k) => researchAt(s, k) >= TIER.rule) },
};
// A beat (docs/puzzle-fights.md 3): a part that plays your command back on its cycle (the Mimic, a Decoy's mirror).
// The beat chips open with any such part's rule.
const beating = (p) => !!p && (!!p.mimic || !!p.reflect);
const beatKnown = (s) => Object.keys(s.research || {}).some((k) => beating(specOf(k)) && researchAt(s, k) >= TIER.rule);
const MUT_WHEN = { ram: 2, icon: 'debuff' };
export const TARGETS = {
  that: { icon: 'part', label: 'that part', tip: 'The part the WHEN chip names (a tell: its part; fragments: the lowest).' },
  soonest: { icon: 'clock', label: 'soonest', tip: 'The part whose attack lands soonest, by the timers you can see.' },
  lowest: { icon: 'kill', label: 'lowest', tip: 'The part with the least Integrity left.' },
  bare: { icon: 'cracker', label: 'no ◆', tip: 'The lowest part with no armor. None: the handler waits.' },
  nobeat: { icon: 'echo', label: 'no beat', tip: 'The part whose attack lands soonest, of those with no beat on the board.' },
  twins: { icon: 'chain', label: 'the twins', tip: 'Whichever of a pair of twins has more of its Integrity left, so they break close together. No twins: the handler waits.' },
  others: { icon: 'chain', label: 'other parts', tip: 'Any part but the ones the WHEN chip names: Rotation plays with them out of its sight. None left: the handler waits.' },
};

// ---------- the viruses ----------
// A virus here is a Codex body: what a part's Codex key starts with (a family, a room body, a strain, a guard).
const bodyDef = (body) => STRAINS[body] || FAMILIES[body] || ROOM_FAMILIES[body] || GUARDS[body] || null;
export const isBody = (body) => !!bodyDef(body);
export const BODY_GROUPS = ['family', 'strain', 'guard', 'runner'];
export const groupOf = (body) => (STRAINS[body] ? 'strain' : GUARDS[body] ? 'guard' : ROOM_FAMILIES[body]?.runner ? 'runner' : FAMILIES[body] || ROOM_FAMILIES[body] ? 'family' : null);
// Every body, in the Codex's order: families (and room bodies), strains, guards, the Exfil.
export function allBodies() {
  const fam = [...Object.keys(FAMILIES), ...Object.keys(ROOM_FAMILIES)];
  return BODY_GROUPS.flatMap((g) => [...new Set([...fam, ...Object.keys(STRAINS), ...Object.keys(GUARDS)])].filter((b) => groupOf(b) === g));
}
// Met, as the Codex counts it (codex.mjs met): seen in a fight, or killed.
export const metBody = (s, body) => !!s.met?.[body] || (s.dex?.kills?.[body] || 0) > 0;
export const metBodies = (s) => allBodies().filter((b) => metBody(s, b));
// A body's parts as specs (a boss's extra parts share their family's research, so they count as its).
// A strain's third parts (genes.mjs: a part a gene brings, rolled on the virus) are its lineage's (a family lists its own).
const thirdSpecs = (body) => Object.values(GENES).map((g) => g.parts?.[body] || g.parts?.[STRAINS[body]?.lineage]).filter(Boolean);
const bodySpecs = (body) => [...(bodyDef(body)?.parts || []), ...Object.values(BOSSES).filter((b) => (b.strain || b.family) === body).flatMap((b) => b.extra || []), ...thirdSpecs(body)];
export const bodyRefs = (body) => [...new Set(bodySpecs(body).map((x) => `${body}:${x.id}`))];
// Decoded: any of its parts researched to its name and health.
export const bodyDecoded = (s, body) => bodyRefs(body).some((ref) => researchAt(s, ref) >= TIER.decoded);

// A part's name from its Codex key, from the tables (a strain's, a family's, a guard's, a boss's extra parts).
function specOf(ref) {
  const [body, id] = String(ref).split(':');
  return bodySpecs(body).find((x) => x.id === id) || null;
}
export const refName = (ref) => specOf(ref)?.name || String(ref).split(':')[1]?.replace(/-/g, ' ') || String(ref);
export const bodyName = (body) => bodyDef(body)?.name || body;
export const refBody = (ref) => String(ref).split(':')[0];
// The key a part in a fight answers to: its Codex key, a second copy (Strobe 2: copy, its id with a number) as the
// first. Only a copy: a part whose own id ends in a number (the C2 Node) keeps it.
export const refOf = (v, p) => (p.copy ? codexKey(v, p).replace(/\d+$/, '') : codexKey(v, p));
const researchOfRef = (s, ref) => researchAt(s, ref);
// The fight's virus: the body its parts' Codex keys name.
export const fightBody = (s) => (s.encounter?.virus ? s.encounter.virus.strain || s.encounter.virus.family : null);

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
  for (const key of Object.keys(P.by)) if (Array.isArray(P.by[key].handlers)) migrate(s, key, P.by[key]);
  return P;
}
// An R1 save kept one stack a class: each handler moves into the routine of the virus whose part it names; one that
// names no part goes into every routine of a virus you've met that has room for it, else it's dropped.
function migrate(s, key, prog) {
  const old = prog.handlers, arch = SUBS[key]?.cls || key;
  delete prog.handlers;
  const R = (prog.routines ||= {});
  const room = (body, h) => (R[body]?.handlers || []).reduce((n, x) => n + handlerRam(s, x), 0) + handlerRam(s, h) <= ramFor(s, body, arch);
  const put = (body, h) => { const r = (R[body] ||= { handlers: [] }); r.handlers.push({ ...h }); r.confirmed = true; }; // a routine you wrote: it throws
  for (const h of old) {
    const w = parseWhen(h?.when);
    if (!w) continue;
    if (w.kind === 'part') { if (isBody(refBody(w.ref))) put(refBody(w.ref), h); continue; }
    for (const body of metBodies(s)) if (room(body, h)) put(body, h);
  }
}
// Whose program: your subclass's from level 10, your class's before.
export const programKey = (s) => subOf(s) || classOf(s);
export const programName = (s) => SUBS[subOf(s)]?.name || ARCHETYPES[classOf(s)]?.name || classOf(s);
export function programOf(s, key = programKey(s)) {
  const P = programsOf(s);
  if (!P.by[key]) {
    // A subclass's first program starts as its class's (the routines you wrote before level 10).
    const from = SUBS[key] && P.by[SUBS[key].cls];
    P.by[key] = { routines: Object.fromEntries(Object.entries(from?.routines || {}).map(([b, r]) => [b, { handlers: r.handlers.map((h) => ({ ...h })), ...(r.armor === false ? { armor: false } : {}) }])) };
  }
  P.by[key].routines ||= {};
  return P.by[key];
}
// The virus a bare command or the Program tab means: the one you picked last, else the fight's, else the first you met.
export function focusBody(s) {
  const P = programsOf(s);
  if (P.focus && isBody(P.focus)) return P.focus;
  const f = active(s) ? fightBody(s) : null;
  return (f && isBody(f) ? f : null) || metBodies(s)[0] || Object.keys(FAMILIES)[0];
}
// The routine the fight uses (or the Program tab shows): the fight's virus while one runs, else the focus.
const currentBody = (s) => (active(s) && isBody(fightBody(s)) ? fightBody(s) : focusBody(s));
export function routineOf(s, body = currentBody(s), key = programKey(s)) {
  const R = programOf(s, key).routines;
  return (R[body] ||= { handlers: [] });
}
export const rails = (s) => programsOf(s).rails;
// Break ◆ first: on unless you turned it off (a new routine, a preset and an older save's routine all have it on).
export const armorFirst = (s, body = currentBody(s)) => routineOf(s, body).armor !== false;
export const armorRam = (s, body = currentBody(s)) => (armorFirst(s, body) ? ROUTINES.armorRam : 0);
// Your bar's skills (Spike, your slots, SIGINT): what a DO chip can be.
export const barSkills = (s) => barKeys(s).map(([key, id]) => ({ key, id })).filter((x) => ABILITIES[x.id]);
// Hold (docs/puzzle-fights.md 3.1): a DO chip that fires nothing that cycle, the routine's way to sit out a beat. Every
// program has it from ROUTINES.holdFrom. It costs no RAM of its own (its handler pays for its WHEN chip).
export const HOLD = { id: 'hold', name: 'Hold', icon: 'stall', tip: 'Fires nothing this cycle.' };
export const holdOpen = (s) => hackerLevel(s) >= ROUTINES.holdFrom;
// Rotation: a DO chip that plays your rotation's move at the TARGET part (other parts: with the WHEN chip's parts out of
// its sight), so a handler can say where and leave what to your kit. A lever's preset is built from it. No RAM of its own.
export const ROTATE = { id: 'rotation', name: 'Rotation', icon: 'cron', tip: 'Your rotation\'s move, at that part.' };
export const doSkills = (s) => [...barSkills(s), { key: '', id: ROTATE.id }, ...(holdOpen(s) ? [{ key: '', id: HOLD.id }] : [])];
export const takesPart = (id) => id !== HOLD.id && (id === ROTATE.id || !['none', 'aggro'].includes(ABILITIES[id]?.target));
// Each handler with what it costs and whether it runs: in budget (top to bottom), its WHEN researched, its skill on your bar.
export function handlerRows(s, body = currentBody(s)) {
  const budget = ramFor(s, body) - armorRam(s, body), bar = new Set(doSkills(s).map((x) => x.id));
  let used = 0;
  return routineOf(s, body).handlers.map((h, i) => {
    const ram = handlerRam(s, h), fits = used + ram <= budget;
    if (fits) used += ram;
    const open = whenOpen(s, h.when), onBar = bar.has(h.do);
    return { h, i, ram, fits, open, onBar, runs: fits && open && onBar };
  });
}
export const ramUsed = (s, body = currentBody(s)) => armorRam(s, body) + handlerRows(s, body).filter((r) => r.fits).reduce((n, r) => n + r.ram, 0);
const liveHandlers = (s, body) => handlerRows(s, body).filter((r) => r.runs).map((r) => r.h);

// ---------- the levers ----------
// A lever (docs/puzzle-fights.md 3) is a part whose rule makes the default move the wrong one: a beat (fire nothing
// on it), a part to break last (a Tripwire, a Zip Bomb, a Hotspot), a part to break first (a Lockbox, a Mutex, a C2
// Node, a Packer), twins to break together (the Mirror). Each gene says which (genes.mjs lever). The rotation answers none of them: a handler that names
// the part does (a beat chip, for a beat).
export const LEVERS = {
  beat: { label: 'beat', tip: 'Fire nothing on its beat.' },
  last: { label: 'break it last', tip: 'Break it after the other parts.' },
  first: { label: 'break it first', tip: 'Break it before the other parts.' },
  together: { label: 'break both together', tip: 'Break it and its twin close together.' },
};
export function leverOf(p) {
  if (!p) return null;
  for (const g of Object.values(GENES)) if (g.lever && g.carried?.(p)) return g.lever;
  return null;
}

// ---------- presets ----------
// Ready-made routines for a virus: plain stacks from its parts (its signature first), your research and your bar.
// Each fits the virus's RAM and uses only chips you have open and skills on your bar. First, one for each lever
// whose part's rule you've researched (Hold on the beat, Tripwire last, Lockbox first): its id says which.
const partSkills = (s) => barSkills(s).map((x) => x.id).filter((id) => ABILITIES[id].target === 'part' && !isLong(s, id));
const bestHit = (s) => partSkills(s).filter((id) => ABILITIES[id].verb === 'hit').sort((a, b) => (ABILITIES[b].damage || 0) - (ABILITIES[a].damage || 0))[0] || 'spike';
const bestStrip = (s) => partSkills(s).filter((id) => ABILITIES[id].strip || ABILITIES[id].pierce).sort((a, b) => (ABILITIES[b].strip || 0) - (ABILITIES[a].strip || 0))[0] || null;
const bestGuard = (s) => barSkills(s).map((x) => x.id).filter((id) => ABILITIES[id].verb === 'shield' && ABILITIES[id].target === 'none' && !isLong(s, id))[0] || null;
export function presetsFor(s, body) {
  const budget = ramFor(s, body) - ROUTINES.armorRam, hit = bestHit(s), strip = bestStrip(s), guard = bestGuard(s); // a preset comes with Break ◆ first on
  const specs = bodySpecs(body).filter((x, i, a) => a.findIndex((y) => y.id === x.id) === i);
  const at = (x, tier) => researchAt(s, `${body}:${x.id}`) >= tier;
  const sig = specs.find((x) => x.special && at(x, TIER.decoded)) || null;
  const out = [], levers = [];
  const add = (id, name, icon, tip, list, lever = null) => {
    const hs = [];
    let used = 0;
    for (const h of list) {
      if (!h || !whenOpen(s, h.when)) { if (lever && h) return; continue; } // a lever's preset is all its handlers or none
      const ram = handlerRam(s, h);
      if (used + ram > budget) { if (lever) return; break; }
      used += ram;
      hs.push(h);
    }
    if (hs.length && ![...out, ...levers].some((p) => same(p.handlers, hs))) (lever ? levers : out).push({ id, name, icon, tip, handlers: hs, ...(lever ? { part: lever } : {}) });
  };
  // A preset for each lever whose part's rule you've researched: the trick's answer, the rotation doing the rest. One
  // in the fight comes first.
  const here = new Set(active(s) && fightBody(s) === body ? s.encounter.virus.parts.map((p) => p.id) : []);
  for (const x of specs.filter((y) => leverOf(y) && at(y, TIER.rule)).sort((a, b) => here.has(b.id) - here.has(a.id))) {
    const ref = `${body}:${x.id}`, lever = leverOf(x);
    if (lever === 'beat') add(`beat:${x.id}`, 'Quiet on the beat', 'echo', `On the ${x.name}'s beat, your rotation fires nothing with a direct hit: a shield, a strip, a burn, or nothing.`, [{ when: 'beat1', do: ROTATE.id, target: 'nobeat' }], x.id);
    if (lever === 'last') add(`last:${x.id}`, `${x.name} last`, 'part', `Your rotation on the other parts while the ${x.name} stands, then on it.`, [{ when: `${ref}:present`, do: ROTATE.id, target: 'others' }], x.id);
    if (lever === 'together') add(`together:${x.id}`, 'Twins together', 'part', `Your rotation on whichever of the ${x.name} and its twin has more left, so they break close together.`, [{ when: `${ref}:present`, do: ROTATE.id, target: 'twins' }], x.id);
    if (lever === 'first') add(`first:${x.id}`, `${x.name} first`, 'part', `Your rotation on the ${x.name} before the other parts.`, [{ when: `${ref}:present`, do: ROTATE.id, target: 'that' }], x.id);
  }
  // A seal (docs/puzzle-levers.md 3.5, 7), for a virus that brings one: your best strip on a part whose seal would
  // hand out a lot (seal dear → your strip → that part), as a lever's preset.
  const sealer = sealsOf(body) && specs.find((x) => x.special && at(x, TIER.rule));
  if (sealer) {
    const breaker = partSkills(s).filter((id) => breaks(id) > 0).sort((a, b) => breaks(b) - breaks(a))[0] || hit;
    add(`seal:${sealer.id}`, 'Seal dear: strip it', 'cracker', `${ABILITIES[breaker].name} the ${sealer.name} when its seal lands within ${ROUTINES.sealOut} cycles while it still wears ${ROUTINES.sealDear} ◆ or more.`, [{ when: `${body}:${sealer.id}:sealdear`, do: breaker, target: 'that' }], sealer.id);
  }
  if (sig) {
    // A preset comes with Break ◆ first on, so a skill that breaks ◆ needs no handler of its own (one at "on board"
    // would spend it on the part once it's bare); a skill that goes through ◆ (Backdoor) keeps its handler.
    const ref = `${body}:${sig.id}`, through = strip && !breaks(strip) ? strip : null;
    const crackFirst = !through && barSkills(s).some((x) => breaks(x.id) && !isLong(s, x.id));
    add('signature', `${sig.name} first`, 'part', through
      ? `The ${sig.name} before anything else: ${ABILITIES[through].name} it while it wears ◆, ${ABILITIES[hit].name} it once it's bare.`
      : `The ${sig.name} before anything else: ${ABILITIES[hit].name} it${crackFirst ? ', its ◆ broken first' : ''}.`,
      through ? [{ when: `${ref}:bare`, do: hit, target: 'that' }, { when: `${ref}:present`, do: through, target: 'that' }] : [{ when: `${ref}:present`, do: hit, target: 'that' }]);
  }
  // Tells: your rotation on the part whose tell can be answered (it cuts a charge or a cast on its cycle, strips a
  // sealing part, or breaks it). SIGINT on the dearer of a cast and a charge (docs/puzzle-levers.md 3.6, 7): its own
  // preset, since SIGINT fired into a cycle a kill was due costs the kill.
  add('tells', 'Answer the tells', 'counter', 'Your rotation on a part whose tell can be answered.', [{ when: 'anytell', do: ROTATE.id, target: 'that' }]);
  if (barSkills(s).some((x) => x.id === 'sigint')) add('sigint', 'SIGINT the dearer', 'interrupt', 'SIGINT the cast or charge you can stop now when it costs more than the other one on the board.', [{ when: 'dearer', do: 'sigint', target: 'that' }]);
  const hitters = specs.filter((x) => at(x, TIER.rule) && x.attack);
  if (hitters.length) add('hits', 'Before it hits', 'clock', `${ABILITIES[hit].name} each part whose attack lands this cycle, signature first.`, hitters.sort((a, b) => !!b.special - !!a.special).map((x) => ({ when: `${body}:${x.id}:due`, do: hit, target: 'that' })));
  if (guard) add('guard', 'Guard when low', 'signal', `${ABILITIES[guard].name} when you're under half, else focus the lowest.`, [{ when: 'hurt', do: guard, target: 'soonest' }, { when: 'always', do: hit, target: 'lowest' }]);
  add('lowest', 'Focus the lowest', 'kill', `${ABILITIES[hit].name} the part with the least Integrity left.`, [{ when: 'always', do: hit, target: 'lowest' }]);
  if (out.length < 2) add('bare', 'No ◆ first', 'cracker', `${ABILITIES[hit].name} the lowest part with no armor; the rotation does the rest.`, [{ when: 'always', do: hit, target: 'bare' }]);
  return [...levers, ...out.slice(0, ROUTINES.presets)];
}
const same = (a, b) => a.length === b.length && a.every((h, i) => h.when === b[i].when && h.do === b[i].do && h.target === b[i].target);
// A body whose tells include a seal (data.mjs TELL_SETS: a family's, a strain's lineage's, a guard's).
const sealsOf = (body) => (TELL_SETS[body] || TELL_SETS[STRAINS[body]?.lineage] || []).some((id) => TELLS[id]?.kind === 'seal');
// The preset the stack is now, or null (edited, or empty: the rotation).
export const presetNow = (s, body) => (routineOf(s, body).handlers.length ? presetsFor(s, body).find((p) => same(p.handlers, routineOf(s, body).handlers))?.id || null : null);

// ---------- reading the board (only what it shows) ----------
const isFrag = (p) => p.kind === 'fragment';
const partsFor = (s, ref) => livingParts(s).filter((p) => !isFrag(p) && refOf(s.encounter.virus, p) === ref);
const shown = (s) => intents(s, 4);
// A beat the board shows (the Mimic's, a Decoy's mirror), up to `upto` columns out: the parts it's on.
const beatParts = (s, upto) => [...new Set(shown(s).filter((i) => (i.tell === 'mimic' || i.effect === 'mirror') && !i.hidden && i.col <= upto).map((i) => part(s, i.source)))].filter(alive);
const isBeat = (i) => i.tell === 'mimic';
const attackNow = (i, upto) => !i.tell && !i.hidden && i.col <= upto && ['damage', 'encrypt', 'replicate', 'scramble', 'heal', 'fuse'].includes(i.effect);
// The parts a WHEN chip holds for right now (null: it doesn't hold; [] for a chip that names no part but holds).
function holds(s, w) {
  const e = s.encounter, list = shown(s);
  if (w.kind === 'global') {
    if (w.id === 'always') return [];
    if (w.id === 'hurt') { const d = defender(s); return d && d.integrity < d.max * ROUTINES.low ? [] : null; }
    if (w.id === 'fragments') { const f = livingParts(s).filter(isFrag).sort((a, b) => a.integrity - b.integrity); return f.length >= ROUTINES.fragments ? f : null; }
    if (w.id === 'encrypted') return (e.encrypt || 0) >= ROUTINES.encrypted ? [] : null;
    if (w.id === 'anytell') { const ps = list.filter((i) => i.tell && i.open && !isBeat(i)).map((i) => part(s, i.source)).filter(alive); return ps.length ? ps : null; } // a beat isn't answered by a hit: the beat chips
    if (w.id === 'beat1' || w.id === 'beat2') { const ps = beatParts(s, w.id === 'beat1' ? 0 : 1); return ps.length ? ps : null; }
    // dearer: the part of the cast or charge SIGINT would stop now, when it costs the most of those on the board (tells.mjs).
    if (w.id === 'dearer') { const t = sigintTarget(s), p = t && part(s, t.part); return t && alive(p) && dearest(s, t) ? [p] : null; }
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
      case 'tell': return mine.some((i) => i.tell && i.open && !isBeat(i));
      case 'pretell': return mine.some((i) => i.tell && !i.open && i.winFrom === 1 && !isBeat(i));
      case 'open': return p.openUntil >= e.cycle;
      case 'sealdear': return p.armor >= ROUTINES.sealDear && mine.some((i) => i.tell === 'seal' && i.col <= ROUTINES.sealOut);
      default: return false;
    }
  });
  return ps.length ? ps : null;
}
// A broad TARGET (soonest, lowest, no ◆) does what it says: it knows your kit, not the virus. Leaving a Tripwire for
// last is a preset's job (docs/puzzle-fights.md 3.1: the program fits the trick), by handlers that name the parts.
// When a part's next attack lands, by the timers the board shows (a hidden one counts as 2, no attack as last).
const dueOf = (s, p) => shown(s).find((i) => i.source === p.id && !i.hidden && !i.tell)?.col ?? (p.attack ? 2 : 9);
// ok: only parts it passes (Break ◆ first's no-◆ retarget); that part then picks among the parts the WHEN chip names.
function targetOf(s, h, ps, ok = null) {
  const live = (ok ? livingParts(s).filter(ok) : livingParts(s)).filter((p) => !frozenNow(s, p)); // a Cold Store still frozen: nothing reaches it
  if (h.target === 'that') return (ok ? (ps || []).filter(ok) : ps || []).filter((p) => !frozenNow(s, p))[0] || null;
  const soon = (list) => [...list].sort((a, b) => dueOf(s, a) - dueOf(s, b) || b.max - a.max)[0] || null;
  if (h.target === 'soonest') return soon(live);
  if (h.target === 'lowest') return [...live].sort((a, b) => a.integrity - b.integrity)[0] || null;
  if (h.target === 'bare') return live.filter((p) => !(p.armor > 0)).sort((a, b) => a.integrity - b.integrity)[0] || null;
  if (h.target === 'nobeat') { const beat = new Set(beatParts(s, 3)); return soon(live.filter((p) => !beat.has(p))); }
  if (h.target === 'others') { const named = new Set(ps || []); return soon(live.filter((p) => !named.has(p))); }
  if (h.target === 'twins') { const tw = live.filter((p) => p.twin || live.some((x) => x.twin === p.id)); return tw.length === 2 ? [...tw].sort((a, b) => b.integrity / b.max - a.integrity / a.max)[0] : null; }
  return null;
}
const fires = (s, text) => !toIntent(s, text).error;

// ---------- Break ◆ first ----------
// The ◆ a skill breaks on an armored part, from its data: strip (Crack, Shaped Charge, Fork Bomb) or chits (Chain
// Reaction, Bit Rot, Rate Limit, Reclaim, Blowback: 2). A skill that goes through ◆ (Backdoor) breaks none.
export const breaks = (id) => { const a = ABILITIES[id]; return a && !a.pierce ? Math.max(a.strip || 0, a.chits > 1 ? a.chits : 0) : 0; };
// Your best ready armor-breaker at p, as a command, or null: the one that breaks the most of its ◆, then the shortest
// cooldown, then the first on your bar. Never a long cooldown (only a handler that names one fires it).
export function breakerFor(s, p) {
  const list = barSkills(s).map((x) => x.id).filter((id) => breaks(id) && !isLong(s, id))
    .map((id, i) => ({ id, i, n: Math.min(breaks(id), p.armor), cd: cooldownOf(s, id), text: takesPart(id) ? `${id} ${p.id}` : id }))
    .filter((x) => fires(s, x.text));
  return list.sort((a, b) => b.n - a.n || a.cd - b.cd || a.i - b.i)[0]?.text || null;
}
// The part a hit at p lands on: a Front End wearing ◆ takes a command at its partner (combat.mjs hit), Sudo aside.
const landsOn = (s, p) => (buffed(s.encounter, 'sudo') ? null : livingParts(s).find((x) => x.front && x !== p && x.armor > 0 && frontOf(s, x) === p)) || p;
// With Break ◆ first on: a hit a ◆ would take becomes your best breaker at that part; none ready, it goes at a part
// with no ◆ its TARGET chip allows (soonest, lowest; that part: another the WHEN chip names); none, it fires anyway.
function armorMove(s, h, ps, t, text) {
  const at = landsOn(s, t);
  if (!(armorTakes(s, h.do, at) > 0)) return { text };
  const b = breakerFor(s, at);
  if (b) return { text: b, armor: 'break' };
  const alt = h.target === 'bare' ? null : targetOf(s, h, h.target === 'that' ? ps : null, (p) => !armorTakes(s, h.do, landsOn(s, p)));
  if (alt && fires(s, `${h.do} ${alt.id}`)) return { text: `${h.do} ${alt.id}`, armor: 'retarget' };
  return { text, armor: 'through' };
}
// The move a handler makes now ({ text, armor? }), or null when it doesn't fit (its WHEN doesn't hold, its skill is
// cooling, no target).
function handlerMove(s, h, body) {
  const w = parseWhen(h.when);
  if (!w || !whenOpen(s, h.when)) return null;
  const ps = holds(s, w);
  if (!ps) return null;
  if (!takesPart(h.do)) return fires(s, h.do) ? { text: h.do } : null;
  // Rotation at no beat, with only beat parts left: at the beat's part (a beat chip's Rotation reads the beat anyway).
  const t = targetOf(s, h, ps) || (h.do === ROTATE.id && h.target === 'nobeat' && BEATS.has(w.id) ? ps[0] : null);
  if (!t) return null;
  if (h.do === ROTATE.id) { const text = h.target === 'others' ? without(s, new Set((ps || []).map((p) => p.id)), () => rotation(s)) : aimed(s, t, BEATS.has(w.id) ? BEAT_GENES : null); return fires(s, text) ? { text } : null; }
  const text = `${h.do} ${t.id}`;
  if (!fires(s, text)) return null;
  return armorFirst(s, body) ? armorMove(s, h, ps, t, text) : { text };
}
// The part a handler aims at when its WHEN holds but its skill can't fire: its own part (TARGET that part), else none.
function aimOf(s, h) {
  const w = parseWhen(h.when);
  if (!w || h.target !== 'that' || !takesPart(h.do) || !whenOpen(s, h.when)) return null;
  return (holds(s, w) || []).filter((p) => alive(p) && !frozenNow(s, p))[0] || null;
}
// The rotation: the kit player (planner.mjs kitPlanner: your kit played well, the timers read, nothing of the virus:
// no tell, no part's rule; docs/puzzle-fights.md 3.1), without any long cooldown (only a handler that names one fires
// it). Key 1 on the soonest attacker if that leaves it nothing.
function rotation(s) {
  const plan = kitPlanner(s, (id) => isLong(s, id));
  if (plan && !toIntent(s, plan).error) return plan;
  const t = soonest(s);
  return t && !toIntent(s, `spike ${t.id}`).error ? `spike ${t.id}` : 'hold';
}
// A beat chip is the reading: the Rotation it fires reads the beat, and goes quiet on it (a shield, a strip, a burn).
const BEAT_GENES = ['mimic', 'decoymirror'];
// The rotation's move at one part (planner.mjs kitPlannerAt: it works on that part).
function aimed(s, t, read = null) {
  const plan = kitPlannerAt(s, t, (id) => isLong(s, id), read);
  return plan && !toIntent(s, plan).error ? plan : `spike ${t.id}`;
}
// The board with some parts out of it (the ones that are yours): the program reads and plans as if they weren't there,
// so it never targets one. Put back however fn ends.
function without(s, ids, fn) {
  if (!ids.size) return fn();
  const hidden = livingParts(s).filter((p) => ids.has(p.id)).map((p) => [p, p.integrity]);
  for (const [p] of hidden) p.integrity = 0;
  try { return fn(); } finally { for (const [p, n] of hidden) p.integrity = n; }
}

// ---------- exceptions ----------
// Parts whose rule changes a decision (a third part, a guard's rule): the program covers one only at its rule tier.
const RULED = ['ward', 'wardsToo', 'lock', 'twin', 'reflect', 'mimic', 'command', 'deadman', 'fuse', 'hotspot', 'idle', 'front', 'backlog', 'buffer', 'rearm', 'syncOnly', 'phase', 'echo', 'tax', 'pkg', 'obfuscate', 'limit', 'spare', 'scrape', 'packer', 'badblock', 'damper', 'frozen'];
export const ruled = (p) => RULED.some((k) => p[k]);
const BEATS = new Set(['beat1', 'beat2']);
const named = (s, pred) => liveHandlers(s, fightBody(s)).some((h) => { const w = parseWhen(h.when); return !!w && pred(w); });
export const EXCEPTION = { label: 'EXCEPTION', phrase: 'no available handler', tip: 'Your program has no handler for this part yet. Play it yourself, or research it in the Codex.', lever: 'Your program has no handler for this part\'s rule. Play it yourself, or pick its preset in the Program tab.', fight: 'Your program leaves this fight to you: a boss is always yours to play.' };
// What the program doesn't cover on the board now: [{ key, kind, part, name }], before the parts you've acted on.
// A boss, a lair's native, the Resident or a crew boss: the whole fight (kind 'fight'). Else each part your research
// doesn't cover and no handler names (a plain part: decoded; a part with a rule: its rule tier), or that has a tell on
// the board you haven't mastered and no handler answers.
export function uncovered(s) {
  const e = s.encounter;
  if (!active(s)) return [];
  const v = e.virus, out = new Map();
  if (v.boss || v.raid) return [{ key: 'fight', kind: 'fight', part: null, name: v.name }];
  if (!confirmed(s, fightBody(s))) return []; // a routine you never made or confirmed: the rotation plays it all
  for (const p of livingParts(s)) {
    if (isFrag(p)) continue;
    const ref = refOf(v, p), n = researchOfRef(s, ref);
    // A lever (a beat, a part to break first or last): only a handler that names it covers it, a beat chip for a beat.
    if (leverOf(p)) {
      if (!named(s, (w) => (w.kind === 'part' && w.ref === ref) || (leverOf(p) === 'beat' && BEATS.has(w.id)))) out.set(p.id, { key: `part:${p.id}`, kind: 'lever', part: p.id, name: p.name, lever: leverOf(p) });
      continue;
    }
    const need = ruled(p) ? TIER.rule : TIER.decoded;
    // A Packer standing (combat.mjs packed): a rolled part's rule reads as ???, so no research covers it.
    if ((n < need || packed(s, v, p)) && !named(s, (w) => w.kind === 'part' && w.ref === ref)) out.set(p.id, { key: `part:${p.id}`, kind: 'part', part: p.id, name: p.name });
  }
  for (const i of shown(s).filter((x) => x.tell)) {
    const p = part(s, i.source);
    if (!alive(p) || out.has(p.id)) continue;
    const ref = refOf(v, p);
    // The rotation reads no tell. A charge is covered once mastered (it lands or is cut by chance, as a hit); a seal or
    // a cast is a lever (strip before it, save SIGINT for it), answered only by a handler: a tell chip on its part, or
    // any tell live. A beat: a beat chip, or a handler that names its part.
    // A seal is covered by seal dear too, a cast by dearer (SIGINT on the dearer one).
    if ((i.tell === 'charge' && researchOfRef(s, ref) >= TIER.mastered) || named(s, (w) => (isBeat(i) ? BEATS.has(w.id) || (w.kind === 'part' && w.ref === ref) : w.id === 'anytell' || (i.tell === 'cast' && w.id === 'dearer') || (w.kind === 'part' && w.ref === ref && ['tell', 'pretell', ...(i.tell === 'seal' ? ['sealdear'] : [])].includes(w.cond))))) continue;
    out.set(p.id, { key: `part:${p.id}`, kind: 'tell', part: p.id, name: p.name, tell: i.name });
  }
  return [...out.values()];
}
// A routine you made or confirmed (a preset picked, a handler added or edited, Confirm pressed): only its fights throw.
export const confirmed = (s, body) => !!programOf(s).routines[body]?.confirmed;
const progE = (e) => (e.program ||= { thrown: {}, played: {}, cued: false });
// The exceptions now: uncovered, less the parts you've acted on (the program takes those back). None while it's off.
export const exceptionsOf = (s) => (live(s) && active(s) ? uncovered(s).filter((x) => !x.part || !progE(s.encounter).played[x.part]) : []);
export const wholeFight = (s) => exceptionsOf(s).some((x) => x.kind === 'fight');
export const yoursNow = (s) => new Set(exceptionsOf(s).map((x) => x.part).filter(Boolean));
// Say each new exception once (the log line, in the exception colour); the first one in a fight carries the cue.
export function noteExceptions(s) {
  if (!live(s) || !active(s)) return false;
  const P = progE(s.encounter), xs = exceptionsOf(s).filter((x) => !P.thrown[x.key]);
  if (!xs.length) return false;
  for (const x of xs) P.thrown[x.key] = s.encounter.cycle;
  const what = (x) => (x.kind === 'fight' ? `the whole fight (${x.name})` : x.kind === 'tell' ? `the ${x.name} (${x.tell})` : x.kind === 'lever' ? `the ${x.name} (${LEVERS[x.lever].label})` : `the ${x.name}`);
  const names = xs.map(what), list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0];
  emit(s, 'exception', `${EXCEPTION.label} · ${EXCEPTION.phrase}: ${list}.`, { target: xs.find((x) => x.part)?.part || null, exception: xs.map((x) => x.key), kind: xs[0].kind, cue: !P.cued });
  P.cued = true;
  return true;
}
// You acted on a part that was yours (combat.mjs playerPhase, your typed command): the program takes it from here.
function acted(s, q) {
  if (!q?.target || !live(s) || !active(s)) return;
  if (exceptionsOf(s).some((x) => x.part === q.target)) progE(s.encounter).played[q.target] = s.encounter.cycle;
}

// ---------- a cycle ----------
// Is a program running your fights? (The browser installs it; a bot crewmate never has one, a co-op player seated as a
// crewmate brings their own (crew.mjs m.seat, coop.mjs); it opens at level 5.)
export const live = (s) => !!hooks.program && (!s?.who || !!s?.seat) && unlocked(s) && programsOf(s).on;
// What the program does when the timer runs out: { text, handler } (handler: its index, or -1 for the rotation), or
// { hold } when nothing is left for it (only parts that are yours, or a boss: the whole fight). null when it's off.
export function decide(s) {
  if (!live(s) || !active(s)) return null;
  const xs = exceptionsOf(s), mine = new Set(xs.map((x) => x.part).filter(Boolean));
  if (xs.some((x) => x.kind === 'fight')) return { hold: true, whole: true, exceptions: xs, part: null };
  if (livingParts(s).every((p) => mine.has(p.id))) return { hold: true, exceptions: xs, part: xs[0]?.part || null };
  const body = fightBody(s);
  return without(s, mine, () => {
    let aim = null;
    for (const r of handlerRows(s, body)) {
      if (!r.runs) continue;
      const m = handlerMove(s, r.h, body);
      if (m) return m.armor && m.armor !== 'through' ? { text: m.text, handler: r.i, armor: m.armor } : { text: m.text, handler: r.i };
      aim ||= aimOf(s, r.h);
    }
    // A handler that names its part (that part) holds but can't fire (its skill cooling): the rotation plays that part.
    if (aim) { const text = aimed(s, aim); if (fires(s, text)) return { text, handler: -1, aim: aim.id }; }
    return { text: rotation(s), handler: -1 };
  });
}
// The same, for the board: nothing it reads may move the game's dice or log.
export function preview(s) {
  if (!live(s) || !active(s)) return null;
  const e = s.encounter, key = `${e.cycle}:${s.serial}:${e.queue?.text || ''}:${JSON.stringify(e.program?.played || {})}`;
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
  noteExceptions(s);
  return { hold: true, part: d.part, type: 'hold', message: d.whole ? '⟳ Nothing fired: this fight is yours to play.' : `⟳ Nothing fired: ${EXCEPTION.phrase} for what is left.` };
}

// ---------- the rails ----------
// Auto jack-out: on a run, crossing your line jacks you out with your pack (in a fight, the emergency jack out).
export function railCheck(s) {
  const r = rails(s), run = s.run;
  if (!r.jackOut || !run || run.breach || s.who || !unlocked(s)) return false;
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
  if (!unlocked(s) || !rails(s).danger || !dangerous(s, room)) return false;
  const label = room.kind === 'core' ? 'the Resident' : room.kind === 'boss' ? 'a boss' : room.kind === 'guard' ? 'a vault guard' : 'an elite';
  emit(s, 'rail', `Stopped before ${room.path}: ${label} holds it. Walk in when you're ready.`, { rail: 'danger', room: room.id });
  return true;
}

// ---------- the command ----------
// program [<virus>] · program on|off · program [<virus>] add [when] [do] [target] · program [<virus>] set <n>
// when|do|target <id> · program [<virus>] move <n> <to> · program [<virus>] remove <n> · program [<virus>] clear ·
// program [<virus>] preset <id> · program [<virus>] undo · program [<virus>] confirm · program [<virus>] armor on|off ·
// program jackout off|10–50 · program danger on|off.
// A virus named picks it (the Program tab opens on it); with none, the one picked last (focusBody).
const line = (s, h) => `${whenLabel(h.when)} → ${said(s, h.do)} → ${TARGETS[h.target]?.label || h.target}`;
export function programCommand(s, text) {
  if (!unlocked(s)) return warn(s, LOCKED);
  let [, verb = '', ...args] = text.trim().split(/\s+/);
  const P = programsOf(s);
  if (isBody(verb)) { P.focus = verb; [verb = '', ...args] = args; }
  const body = focusBody(s), R = routineOf(s, body), H = R.handlers, name = bodyName(body), budget = ramFor(s, body);
  const n = (x) => { const i = Number(x) - 1; return Number.isInteger(i) && i >= 0 && i < H.length ? i : -1; };
  const fits = (list, opt = armorRam(s, body)) => { const used = opt + list.reduce((a, h) => a + handlerRam(s, h), 0); return used <= budget ? null : `That needs ${used} RAM. ${name} has ${budget}.`; };
  const checkWhen = (id) => (!parseWhen(id) ? `No WHEN chip ${id}.` : !whenOpen(s, id) ? `${whenLabel(id)}: research it first.` : null);
  const bar = new Set(doSkills(s).map((x) => x.id));
  const checkDo = (id) => (!ABILITIES[id] && id !== HOLD.id && id !== ROTATE.id ? `No skill ${id}.` : !bar.has(id) ? (id === HOLD.id ? `Hold opens at level ${ROUTINES.holdFrom}.` : `${ABILITIES[id].name} is not on your bar.`) : null);
  const checkTarget = (id) => (TARGETS[id] ? null : `No TARGET chip ${id}. Try: ${Object.keys(TARGETS).join(', ')}.`);
  const edited = () => { delete R.undo; R.confirmed = true; };
  if (!verb) return emit(s, 'info', `${programName(s)} program: ${P.on ? 'on' : 'off'}. ${name}: ${ramUsed(s, body)}/${budget} RAM, break ◆ first ${armorFirst(s, body) ? 'on' : 'off'}. ${H.length ? H.map((h, i) => `${i + 1}. ${line(s, h)}`).join('. ') + '.' : 'No handlers: the rotation plays.'}`);
  if (verb === 'on' || verb === 'off') { P.on = verb === 'on'; return emit(s, 'info', `Program ${verb}.${P.on ? '' : ' The timer repeats your last hit again.'}`); }
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
    H.push(h); edited();
    return emit(s, 'info', `${name}, handler ${H.length}: ${line(s, h)}.`);
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
    H[i] = next[i]; edited();
    return emit(s, 'info', `${name}, handler ${i + 1}: ${line(s, H[i])}.`);
  }
  if (verb === 'move') {
    const i = n(args[0]), j = Math.max(0, Math.min(H.length - 1, Number(args[1]) - 1));
    if (i < 0 || !Number.isInteger(j)) return warn(s, 'program move <n> <to>.');
    const [h] = H.splice(i, 1);
    H.splice(j, 0, h); edited();
    return emit(s, 'info', `${name}: handler moved to ${j + 1}.`);
  }
  if (verb === 'remove') { const i = n(args[0]); if (i < 0) return warn(s, `No handler ${args[0]}.`); H.splice(i, 1); edited(); return emit(s, 'info', `${name}: handler ${i + 1} removed.`); }
  if (verb === 'clear' || (verb === 'preset' && args[0] === 'rotation')) {
    if (H.length && !presetNow(s, body)) R.undo = H.map((h) => ({ ...h }));
    H.length = 0;
    R.confirmed = true;
    return emit(s, 'info', `${name}: no handlers, the rotation plays.`);
  }
  if (verb === 'preset') {
    const p = presetsFor(s, body).find((x) => x.id === args[0]);
    if (!p) return warn(s, `No preset ${args[0] || ''} for ${name}. Try: ${['rotation', ...presetsFor(s, body).map((x) => x.id)].join(', ')}.`);
    if (H.length && !presetNow(s, body)) R.undo = H.map((h) => ({ ...h })); // an edited stack: program undo brings it back
    H.splice(0, H.length, ...p.handlers.map((h) => ({ ...h })));
    delete R.armor; // a ready-made routine comes with Break ◆ first on
    R.confirmed = true;
    return emit(s, 'info', `${name}: ${p.name}.${R.undo ? ' program undo brings your own back.' : ''}`);
  }
  // Break ◆ first: a setting of the routine, not a handler, so it doesn't make the routine yours (exceptions stay as they were).
  if (verb === 'armor') {
    if (!['on', 'off'].includes(args[0])) return warn(s, 'program [virus] armor on or off.');
    if (args[0] === 'on') { const over = R.armor === false && fits(H, ROUTINES.armorRam); if (over) return warn(s, over); delete R.armor; } else R.armor = false;
    return emit(s, 'info', `${name}: break ◆ first ${args[0]}.`);
  }
  if (verb === 'confirm') { R.confirmed = true; return emit(s, 'info', `${name}: routine confirmed. A part it doesn't cover is yours to play.`); }
  if (verb === 'undo') {
    if (!R.undo) return warn(s, `Nothing to undo for ${name}.`);
    H.splice(0, H.length, ...R.undo);
    delete R.undo;
    R.confirmed = true;
    return emit(s, 'info', `${name}: your own handlers are back.`);
  }
  return warn(s, 'program [virus] [on|off|add|set|move|remove|clear|preset|undo|confirm|armor|jackout|danger].');
}

// The palette for a virus: the fight-wide chips, then its parts you've met (research above 0) with their chips.
export function palette(s, body = focusBody(s)) {
  const glob = Object.keys(GLOBAL_WHEN).map((id) => ({ id, open: whenOpen(s, id) }));
  const muts = Object.keys(MUTATIONS).filter((m) => !MUTATIONS[m].retired).map((m) => ({ id: 'mut:' + m, open: whenOpen(s, 'mut:' + m) })).filter((x) => x.open);
  const refs = bodyRefs(body).filter((k) => researchAt(s, k) > 0);
  const parts = refs.map((ref) => ({ ref, name: refName(ref), body: bodyName(body), n: researchAt(s, ref), chips: Object.keys(PART_WHEN).map((c) => ({ id: `${ref}:${c}`, cond: c, open: researchAt(s, ref) >= PART_WHEN[c].tier, tier: PART_WHEN[c].tier })) }));
  return { glob, muts, parts };
}

// Install: the browser's fights run your program (app.js). Tests install it too.
export function installPrograms() {
  hooks.program = programHook;
  hooks.programCycle = (s) => { if (s.who) return; noteExceptions(s); railCheck(s); };
  hooks.programActed = acted;
  hooks.railCheck = railCheck;
  hooks.walkStop = walkStop;
}
hooks.programCommand = programCommand; // the command works anywhere the engine runs; the program only once installed
