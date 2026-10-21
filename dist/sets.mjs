// Sets (docs/genome.md 9, docs/loot-plan.md): uniques that add up. The sets are data (content/sets.mjs); a piece is a
// unique carrying `set: <id>` (content/items.mjs). The data side is pure functions over a list of items, so the engine,
// the views and the tests all read the same counts; the fight side (SET_HOOKS) is a class-hook module that combat.mjs
// runs beside the classes' (CLASS_HOOKS), and it calls back into the engine only inside a fight.
//   SETS, setOf(uniqueId)         the sets, and the set a unique belongs to
//   activeSets(items)             the sets you wear (your loaded protocols, in slot order): pieces worn, the bonuses
//                                 open, and the one 4-piece rule (the set that reached four first keeps its bonus)
//   setFx(items)                  the active bonuses' effect blocks and the worn pieces' green lines, as the fight
//                                 engine's effect list takes them
//   setCard(id, have)             one set as a tooltip or a Collection row reads it: its pieces (worn, held, missing,
//                                 never found) and its bonus lines, each open or not, a class set's subclass lines too
//   SET_LOOT, sourcePool          each source's set pieces and its odds (combat.mjs setDrop: BOSS_LOOT's pattern)
//   tierLine(id)                  a class set's tier line ("Breaker tier set, level 50"), or null for a general set
//   SET_HOOKS                     what the bonuses do in a fight (the codes below), and setCredits, restFast, seesRare
//                                 for the ones that act outside it
// Every piece has its own bonus (its unique effect, worn alone) and a green line (u.green), a second small stat that
// counts while two or more pieces of its set are worn. A class set's 4-piece adds a line for each of its subclasses
// (bonuses[4].subs): the base line works for anyone, each subclass line only for that subclass. The class sets are the
// end-game tier sets (set.tier: 50, like World of Warcraft's): every piece level 50 with the best stats for its slot
// there, from the crew bosses and the Bedrock lair boss, their bonuses stronger than a general set's.
import SET_TEXT from './content/sets.mjs';
import ITEMS from './content/items.mjs';
import { fxHolds, gearFx, active, loaded, emit, hit, heal, alive, parts, livingParts, defender, burnsOn, helpersOn, helperCap, alliesOf, momentumStacks, classOf, delayAttack } from './combat.mjs';
import { momentumCap } from './classes/breaker.mjs';
import { ABILITIES, SKILLS, ARCHETYPES } from './data.mjs';

export const SETS = Object.fromEntries((SET_TEXT.sets || []).map((x) => [x.id, x]));
const UNIQ = Object.fromEntries((ITEMS.uniques || []).map((u) => [u.id, u]));
// A piece is a unique carrying set: <id>, listed in its set's pieces (sets.test.mjs keeps the two in step). Read from
// the sets' lists, so a set added at run time (a test's) counts the same way.
const setIdOf = (uniqueId) => { for (const [id, set] of Object.entries(SETS)) if ((set.pieces || []).includes(uniqueId)) return id; return null; };
export const setOf = (uniqueId) => SETS[setIdOf(uniqueId)] || null;
export const isPiece = (uniqueId) => !!setIdOf(uniqueId);
const allPieces = () => Object.values(SETS).flatMap((set) => set.pieces || []);
export const piecesOf = (id) => (SETS[id]?.pieces || []).filter((p) => UNIQ[p]);
// The piece counts a set's bonuses open at (2, 3 and 4 pieces), and the count a piece's green line needs.
export const BONUS_AT = [2, 3, 4];
export const GREEN_AT = 2;
export const bonusesOf = (id) => BONUS_AT.filter((n) => SETS[id]?.bonuses?.[n]).map((n) => ({ at: n, ...SETS[id].bonuses[n] }));
export const tierLine = (id) => (SETS[id]?.tier ? `${ARCHETYPES[SETS[id].cls]?.name || SETS[id].cls} tier set, level ${SETS[id].tier}` : null);

// ---------- drops ----------
// Each source's set pieces (a piece's sources, each { kind, ... }): BOSS_LOOT's pattern, one roll an event (a kill, a
// vault, a board, a thread done) at its kind's odds. chance + pity for every event of that source without one, while
// you lack a piece it drops (pieces you lack first); once you've found them all, a flat `found` and no pity, so a
// piece at a higher level still turns up now and then. The odds are set an event at a time, low enough that uniques
// and set pieces together stay under one an hour of play (lootsim.mjs measures it).
//   guard     a guard post's own (Kestrel Clearance): { id, layer }
//   boss      a named boss: { id } (RELAY-KING, REPO MAN, the Hollow Choir)
//   lair      a floor's lair boss: { floor } (the floor 3–8 bosses' pieces, until those bosses are built; Bedrock's
//             also drops the tier sets, beside the crew bosses, and flash ranks join them once built: planned)
//   crew      a crew boss (KESSLER-FARM-00's three): Mesh, and the tier sets
//   rare      a ★ rare spawn: { floor: [lo, hi] } or any floor
//   strain    a strain kill: { lineage } or any strain
//   author    a crew's bosses and elites: { id } (GLASSJAW)
//   vault     a server's vault: { floor: [lo, hi] } or any floor
//   puzzle    a puzzle board won: { id } (its kind)
//   thread    a thread done: { floor: [lo, hi] }
//   courier   a LANTERN courier intercepted
//   takeover  a Resident beaten and its server taken
export const SET_LOOT = {
  guard: { chance: 0.04, pity: 0.02, found: 0.01 },
  boss: { chance: 0.08, pity: 0.03, found: 0.015 },
  lair: { chance: 0.08, pity: 0.03, found: 0.015 },
  crew: { chance: 0.08, pity: 0.03, found: 0.015 },
  rare: { chance: 0.0008, pity: 0.00003, found: 0.0003 },
  strain: { chance: 0.002, pity: 0.0005, found: 0.0005 },
  author: { chance: 0.005, pity: 0.0005, found: 0.001 },
  vault: { chance: 0.005, pity: 0.0006, found: 0.001 },
  puzzle: { chance: 0.01, pity: 0.002, found: 0.003 },
  thread: { chance: 0.15, pity: 0.08, found: 0.03 },
  courier: { chance: 0.006, pity: 0.001, found: 0.002 },
  takeover: { chance: 0.02, pity: 0.005, found: 0.004 },
};
// A tier set's piece (a class set's) comes up this many times as often for its own class as another class's piece
// (combat.mjs setWeight); pieces you lack still come first.
export const CLASS_SET = 3;
// What one roll is called in the log's next-chance line ("The next kill has a 6% chance").
export const SET_EVENT = { vault: 'vault', puzzle: 'board', thread: 'thread', courier: 'courier', takeover: 'takeover' };
const inFloor = (src, f) => src.floor == null || (Array.isArray(src.floor) ? f >= src.floor[0] && f <= src.floor[1] : f === src.floor);
// Does a piece's source match an event? ctx: { kind, id, floor, layer, lineage }.
export const fromHere = (src, ctx) => src.kind === ctx.kind && (src.id == null || src.id === ctx.id) && (src.lineage == null || src.lineage === ctx.lineage)
  && inFloor(src, ctx.floor ?? 1) && (src.layer == null || (ctx.layer ?? 99) >= src.layer);
export const sourcePool = (ctx) => allPieces().map((id) => UNIQ[id]).filter((u) => u && (u.sources || []).some((src) => fromHere(src, ctx)));
// Its pity, kept per source: a guard's as save v45 kept it (set:<guard>), a lair's per floor, a boss's, a crew's or a
// board's per id, the rest per kind.
export const sourceKey = (ctx) => (ctx.kind === 'guard' ? 'set:' + ctx.id : `set:${ctx.kind}${ctx.kind === 'lair' ? ':' + (ctx.floor || 1) : ctx.id ? ':' + ctx.id : ''}`);
export const setPool = (guard) => sourcePool({ kind: 'guard', id: guard });
export const setPityKey = (guard) => sourceKey({ kind: 'guard', id: guard });
// A source as the Collection says it (its first source, or the line for all of them).
const floors = (f) => (Array.isArray(f) ? (f[0] === f[1] ? `floor ${f[0]}` : `floors ${f[0]}–${f[1]}`) : `floor ${f}`);
export function sourceText(src, names = {}) {
  if (!src) return '';
  const where = src.floor != null ? `, ${floors(src.floor)}` : '';
  switch (src.kind) {
    case 'lair': return `${floors(src.floor)[0].toUpperCase()}${floors(src.floor).slice(1)} lair boss`;
    case 'boss': return names.boss?.(src.id) || src.id;
    case 'crew': return 'Crew bosses';
    case 'rare': return `★ rare spawns${where}`;
    case 'strain': return src.lineage ? `${names.lineage?.(src.lineage) || src.lineage} strain kills` : 'Strain kills';
    case 'author': return `${names.author?.(src.id) || src.id} bosses and elites`;
    case 'vault': return `Vaults${where}`;
    case 'puzzle': return `${names.puzzle?.(src.id) || src.id} boards`;
    case 'thread': return `Threads${where}`;
    case 'courier': return "LANTERN's couriers";
    case 'takeover': return 'Resident takeovers';
    default: return '';
  }
}

// ---------- counting ----------
// When an item went on (combat.mjs load stamps it.on); an item from before save v45 counts as on since 0, in slot order.
const stampOf = (it, i) => [Number(it?.on) || 0, i];
const earlier = (a, b) => a[0] - b[0] || a[1] - b[1];
// The sets in a loadout (items: your loaded protocols, in slot order). Each distinct piece counts once.
// [{ id, name, n, total, worn: [ids], open: [2, 3], blocked: { at: 4, by: setName } | null }]
export function activeSets(items = []) {
  const rows = [];
  for (const [id, set] of Object.entries(SETS)) {
    const worn = [], when = [];
    items.forEach((it, i) => { if (it?.unique && (set.pieces || []).includes(it.unique) && !worn.includes(it.unique)) { worn.push(it.unique); when.push(stampOf(it, i)); } });
    if (!worn.length) continue;
    when.sort(earlier);
    rows.push({ id, name: set.name, n: worn.length, total: piecesOf(id).length, worn, open: bonusesOf(id).filter((b) => b.at <= worn.length).map((b) => b.at), blocked: null, reached4: when[3] || null });
  }
  // Only one 4-piece bonus: of the sets that qualify, the one whose fourth piece went on first keeps it.
  const four = rows.filter((r) => r.open.includes(4)).sort((a, b) => earlier(a.reached4, b.reached4));
  for (const r of four.slice(1)) { r.open = r.open.filter((n) => n !== 4); r.blocked = { at: 4, by: four[0].name }; }
  for (const r of rows) delete r.reached4;
  return rows;
}
// The active bonuses' effect blocks and the worn pieces' green lines: { fx, id, name, set, at } each, the shape
// combat.mjs uniqueFx lists. A subclass line carries its subclass (fx.sub): combat.mjs fxCond holds it for that
// subclass only.
export function setFx(items = []) {
  const out = [];
  for (const r of activeSets(items)) {
    for (const at of r.open) {
      const b = SETS[r.id].bonuses[at];
      for (const [i, fx] of (b.fx || []).entries()) out.push({ fx: { text: b.text, ...fx }, id: `set:${r.id}:${at}:${i}`, name: `${r.name} (${at})`, set: r.id, at });
      for (const [sub, x] of Object.entries(b.subs || {})) for (const [i, fx] of (x.fx || []).entries()) out.push({ fx: { text: x.text, ...fx, sub }, id: `set:${r.id}:${at}:${sub}:${i}`, name: `${r.name} (${at})`, set: r.id, at });
    }
    if (r.n >= GREEN_AT) for (const p of r.worn) if (UNIQ[p]?.green) out.push({ fx: UNIQ[p].green, id: 'green:' + p, name: `${UNIQ[p].name} (set)`, set: r.id, at: GREEN_AT });
  }
  return out;
}
// One set for a tooltip or the Collection. have: { worn: [unique ids loaded], held: Set of ids in your stash, found: Set of
// ids you've ever found (the Collection) }, the active rows (activeSets) for the 4-piece rule, and your subclass.
// pieces: [{ id, name (null until found), slot base, state: 'worn' | 'held' | 'missing' | 'unknown' }]
// bonuses: [{ at, text, on, blocked (the other set holding the 4-piece bonus), subs: [{ id, text, on, mine }] }]
export function setCard(id, { worn = [], held = new Set(), found = new Set(), active = null, sub = null } = {}) {
  const set = SETS[id];
  if (!set) return null;
  const row = (active || []).find((r) => r.id === id);
  const n = row ? row.n : piecesOf(id).filter((p) => worn.includes(p)).length;
  const pieces = piecesOf(id).map((p) => {
    const state = worn.includes(p) ? 'worn' : held.has(p) ? 'held' : found.has(p) ? 'missing' : 'unknown';
    return { id: p, name: state === 'unknown' ? null : UNIQ[p].name, base: UNIQ[p].base, level: UNIQ[p].level, state };
  });
  const bonuses = bonusesOf(id).map((b) => {
    const on = row ? row.open.includes(b.at) : n >= b.at;
    return { at: b.at, text: b.text, on, blocked: row?.blocked?.at === b.at ? row.blocked.by : null, subs: Object.entries(b.subs || {}).map(([k, x]) => ({ id: k, text: x.text, mine: k === sub, on: on && k === sub })) };
  });
  return { id, name: set.name, n, total: pieces.length, pieces, bonuses };
}
// A piece's green line as its tooltip shows it: its text, and whether it counts now (the piece worn, with one more).
export function greenOf(uniqueId, worn = []) {
  const u = UNIQ[uniqueId], set = setOf(uniqueId);
  if (!u?.green || !set) return null;
  const n = piecesOf(set.id).filter((p) => worn.includes(p)).length;
  return { text: u.green.text, at: GREEN_AT, on: worn.includes(uniqueId) && n >= GREEN_AT };
}

// ---------- saves ----------
// Save v45: sets. Every protocol loaded on a class is stamped with when it went on (it.on, in slot order, so the
// 4-piece rule has an order to keep), a set piece you hold counts as found (wick's Old Toolkit from the storyline, the
// LOWLIGHT Badge), and a save that had finished the storyline before the Badge's beat (content/story.mjs 'badge') has it
// armed, so its letter comes at its level. Reads and writes nothing outside the save.
export const BADGE_BEAT = 'badge';
export function setsRestore(s, was) {
  if (!(was < 45)) return;
  const stash = Object.fromEntries((s.stash || []).map((it) => [it.id, it]));
  let n = s.equipN || 0;
  for (const rig of Object.values(s.gear?.rigs || {})) if (Array.isArray(rig)) for (const id of rig) if (id && stash[id] && !stash[id].on) stash[id].on = ++n;
  s.equipN = n;
  s.collection ||= {};
  for (const it of s.stash || []) if (it.unique && isPiece(it.unique)) s.collection[it.unique] ||= 1;
  const m = s.mail;
  if (m && Array.isArray(m.posted) && !m.waiting && !m.posted.includes(BADGE_BEAT)) { m.waiting = 'armed'; m.waitFrom ||= 0; }
}
// ---------- the fight engine's side ----------
// SET_HOOKS is a class-hook module (combat.mjs CLASS_HOOKS; dist/classes/breaker.mjs lists the hooks): it runs for
// every player in every fight, and does nothing unless a set piece is loaded (e.sx, sxOf). Its state lives
// on the encounter under e.sx, and on a shared part under the player's name (p.sx*[who]).
// The codes (content/sets.mjs and the pieces' blocks):
//   stat, signal%          a stat and max Signal (combat.mjs gearStat, maxSignal)
//   dmg%                   all your damage, skill hits, burns and helpers (when 'hit', its condition on the part)
//   burn+%, helper+%, dot% your burns, your helpers, both (dot%: combat.mjs damageMultiplier)
//   first-hit%             your first skill hit on each part         opener%   your first skills each fight (n of them)
//   skills%                each different skill used, up to its cap  under%    parts under your burns or helpers
//   break-rush             a break: more damage for some cycles      break-splash  a break: your next damaging skill
//                                                                    also hits the part beside it
//   spill+, break-momentum the Demolitionist's Overkill, the Overclocker's Momentum (subclass lines)
//   shield+%               the shields you raise                     big-mark  a big hit marks its part (mark-late,
//                                                                    mark-heal: the Warden's and the Sysop's lines)
//   half-crit              a part dropping below half: your next hit on it crits (half-weak, half-burn: subclasses)
//   dot-long, helper-twin  burns and helpers last longer; every third helper comes as two (gasp%, twin-foothold)
//   big-hit-cap, last-stand   once a fight: a big hit capped; a killing hit leaves you at 1 with a shield
//   low-heal, comeback     once a fight, dropping low: a heal (and more damage)
//   taken-cut%, crit-more% less damage taken; crits deal more
//   jam-long               jams and delays you apply last a cycle longer
//   first-heal%, heal+%, overheal, crew%, crew-share   heals: the first larger, every cast larger, past full a shield,
//                          more with a crew, a crewmate's share on you
//   late-tick, repeat-every, cd-start   the cycles: an extra cooldown tick, a skill repeating, the first cooldowns shorter
//   rest-fast, credits%, see-rare   outside a fight: resting, caches and vaults, the map card
const who = (s) => s.who || '';
const pct = (n) => 1 + n / 100;
// Your set state in this fight (e.sx), made the first time a hook asks, and again at every start (a crewmate's
// encounter is a copy of the leader's): null without a set piece loaded. The fight's effect list (the pieces' own
// blocks, their green lines and the open bonuses) is kept beside it, since gear can't change mid-fight.
const LISTS = new WeakMap();
export function sxOf(s) {
  const e = s.encounter;
  if (!e) return null;
  if (e.sx === undefined) e.sx = loaded(s).some((it) => it.unique && isPiece(it.unique)) ? { first: {}, n: 0, skills: [], used: {}, helpers: 0, once: {} } : null;
  if (e.sx && !LISTS.has(e)) LISTS.set(e, gearFx(s));
  return e.sx;
}
// The blocks of one code worn now, their conditions holding (nothing spent: set bonuses keep their own once-a-fight
// marks in e.sx.once). Out of a fight, the effect list as it is now.
const listOf = (s) => (s.encounter && LISTS.get(s.encounter)) || gearFx(s);
export const setBlocks = (s, d, ctx = {}, list = listOf(s)) => list.filter((x) => x.fx.do === d && fxHolds(s, x.fx, ctx)).map((x) => ({ ...x, value: Number(x.fx.value) || 0, name: x.name || x.it?.name }));
const custom = setBlocks;
const total = (xs) => xs.reduce((n, x) => n + x.value, 0);
const mineOn = (p, k, s) => !!p?.[k]?.[who(s)];
const mark = (p, k, s, v) => { (p[k] ||= {})[who(s)] = v; };
const max = (s) => defender(s).max;
const pctOf = (s, n) => Math.max(1, Math.round((max(s) * n) / 100));
const gear = (f) => ({ gear: [{ id: f.id, name: f.name }] }); // the HUD's gear chip flashes (combat.mjs firedOf)
// The living part beside p on the board (the next one, else the one before).
function beside(s, p) {
  const all = parts(s), i = all.indexOf(p);
  for (let k = 1; k < all.length; k++) for (const j of [i + k, i - k]) if (all[j] && all[j] !== p && alive(all[j])) return all[j];
  return null;
}
// A stat or max Signal from set blocks (combat.mjs gearStat and maxSignal ask, with a set piece loaded).
export const setStat = (s, stat) => total(custom(s, 'stat', {}, active(s) && sxOf(s) ? listOf(s) : gearFx(s)).filter((x) => x.fx.stat === stat));
export const setSignal = (s) => total(custom(s, 'signal%', {}, active(s) && sxOf(s) ? listOf(s) : gearFx(s)));
// What the outside-a-fight bonuses give: credits from caches or vaults (Lantern Route), how much faster Signal rests
// back (Night Shift), and whether a server's map card shows its rare spawn (the Antenna).
export const setCredits = (s, of) => pct(total(custom(s, 'credits%', {}, gearFx(s)).filter((x) => (x.fx.of || []).includes(of))));
export const restFast = (s) => pct(total(custom(s, 'rest-fast', {}, gearFx(s))));
export const seesRare = (s) => custom(s, 'see-rare', {}, gearFx(s)).length > 0;
// Heals you cast (combat.mjs healScaled): larger with Link, and with Mesh for each crewmate in the fight.
const crewN = (s, x) => Math.min(x.fx.cap || 3, alliesOf(s).length);
export const setHealMult = (s) => (sxOf(s) ? custom(s, 'heal+%').reduce((m, x) => m * pct(x.value), 1) * custom(s, 'crew%').reduce((m, x) => m * pct(x.value * crewN(s, x)), 1) : 1);

export const SET_HOOKS = {
  // A fight starts: is any set piece loaded? Nothing else here runs without one.
  start(s) {
    if (!s.encounter) return;
    s.encounter.sx = undefined;
    LISTS.delete(s.encounter);
    sxOf(s);
  },
  dealt(s, p, opts = {}) {
    const e = s.encounter, x = sxOf(s);
    if (!x || !p) return 1;
    const dot = !!opts.dot, helper = opts.src === 'helper', skill = !!opts.mine && !dot && !opts.by;
    let m = 1;
    for (const f of custom(s, 'dmg%', { target: p })) m *= pct(f.value);
    if (dot && !helper) for (const f of custom(s, 'burn+%')) m *= pct(f.value);
    if (helper) for (const f of custom(s, 'helper+%')) m *= pct(f.value);
    if (helper && opts.by === 'Last Gasp') for (const f of custom(s, 'gasp%')) m *= pct(f.value);
    if (skill && !x.first[p.id]) for (const f of custom(s, 'first-hit%')) m *= pct(f.value);
    if (skill) for (const f of custom(s, 'opener%')) if (x.n < (f.fx.n || 1)) m *= pct(f.value);
    for (const f of custom(s, 'skills%')) m *= pct(Math.min(f.fx.cap || 99, f.value * x.skills.length));
    if (burnsOn(s, p).length || helpersOn(s, p).length) for (const f of custom(s, 'under%')) m *= pct(f.value);
    if (x.rush?.until >= e.cycle) m *= pct(x.rush.value);
    if (x.back?.until >= e.cycle) m *= pct(x.back.value);
    if (p.sxMark?.[who(s)]?.until >= e.cycle) m *= pct(p.sxMark[who(s)].value);
    if (dot && !helper && mineOn(p, 'sxHalf', s)) for (const f of custom(s, 'half-burn')) m *= pct(f.value);
    for (const f of custom(s, 'crew%')) m *= pct(f.value * crewN(s, f));
    return m;
  },
  // Palemask (4): your next hit on a part that dropped below half is a critical strike.
  crit(s, p, opts = {}) { return sxOf(s) && opts.mine && !opts.dot && mineOn(p, 'sxCrit', s) ? 1000 : 0; },
  critDealt(s) { return sxOf(s) ? custom(s, 'crit-more%').reduce((m, x) => m * pct(x.value), 1) : 1; },
  taken(s) { return sxOf(s) ? custom(s, 'taken-cut%').reduce((m, x) => m * (1 - x.value / 100), 1) : 1; },
  // Kestrel Clearance (3): once a fight, a hit for more than its share of your max deals that share.
  absorb(s, n, atk) {
    const x = sxOf(s);
    if (!x || x.once.cap || !atk) return n;
    for (const f of custom(s, 'big-hit-cap')) {
      const cap = Math.floor((max(s) * f.value) / 100);
      if (n > cap) { x.once.cap = true; emit(s, 'blocked', `${f.name}: ${atk.name} would take more than ${f.value}% of your max Signal. It deals ${cap}.`, gear(f)); return cap; }
    }
    return n;
  },
  // Bedrock (4): once a fight, a hit that would drop you to 0 leaves you at 1, behind a shield.
  lastBlow(s, d, dmg) {
    const e = s.encounter, x = sxOf(s);
    if (!x || x.once.stand) return null;
    const f = custom(s, 'last-stand')[0];
    if (!f) return null;
    x.once.stand = true;
    e.shield = (e.shield || 0) + pctOf(s, f.value);
    emit(s, 'heal', `${f.name}: you hold at 1, behind a ${pctOf(s, f.value)} shield.`, { mark: 'shield', ...gear(f) });
    return Math.max(0, d.integrity - 1);
  },
  cooldown(s, id, cd) {
    const x = sxOf(s);
    if (!x || !cd || x.used[id]) return cd;
    const off = total(custom(s, 'cd-start'));
    return off ? Math.max(1, cd - off) : cd;
  },
  spill(s) { return sxOf(s) ? total(custom(s, 'spill+')) : 0; },
  // Heals you cast: the first one each fight larger (Runbook), and healing past full a shield (On-Call).
  healing(s) {
    const e = s.encounter, x = sxOf(s);
    if (!x || !e.commanding || x.once.healed) return 1;
    const f = custom(s, 'first-heal%');
    if (!f.length) return 1;
    x.once.healed = true;
    return f.reduce((m, y) => m * pct(y.value), 1);
  },
  overheal(s, over) {
    const e = s.encounter;
    if (!sxOf(s) || over <= 0) return;
    for (const f of custom(s, 'overheal')) {
      const room = pctOf(s, f.value) - (e.shield || 0), add = Math.min(over, room);
      if (add > 0) { e.shield = (e.shield || 0) + add; emit(s, 'status', `${f.name}: ${add} of the heal becomes a shield (${e.shield}).`, { mark: 'shield', ...gear(f) }); }
    }
  },
  hit(s, p, res, opts = {}) {
    const e = s.encounter, x = sxOf(s);
    if (!x || !(res?.dealt > 0)) return;
    const skill = !!opts.mine && !opts.dot && !opts.by;
    if (skill) x.first[p.id] = true;
    if (res.crit && skill && mineOn(p, 'sxCrit', s)) delete p.sxCrit[who(s)];
    // Palemask (4): the hit that takes a part below half.
    if (alive(p) && p.integrity < p.max / 2 && p.integrity + res.dealt >= p.max / 2) {
      const f = custom(s, 'half-crit')[0];
      if (f) {
        mark(p, 'sxCrit', s, true); mark(p, 'sxHalf', s, true);
        if (custom(s, 'half-weak').length && e.weakHit) delete e.weakHit[p.id]; // Phantom: Weak Spot is fresh on it again
        emit(s, 'status', `${f.name}: the ${p.name} is below half. Your next hit on it is a critical strike.`, { target: p.id, ...gear(f) });
      }
    }
    // Wrecking Crew (4): the next damaging skill after a break also hits the part beside it.
    if (skill && x.splash && !x.busy) {
      const f = custom(s, 'break-splash')[0], t = f && beside(s, p);
      x.splash = false;
      if (t) { x.busy = true; try { hit(s, t, Math.max(1, Math.round((res.dealt * f.value) / 100)), { by: f.name }); } finally { x.busy = false; } }
    }
    // Deep Archive (4): every 4th cycle, the next skill repeats.
    if (skill && x.repeat && !x.busy) {
      const f = custom(s, 'repeat-every')[0];
      x.repeat = false;
      if (f && alive(p)) { x.busy = true; try { hit(s, p, Math.max(1, Math.round((res.dealt * f.value) / 100)), { by: f.name }); } finally { x.busy = false; } }
    }
  },
  broke(s, p) {
    const e = s.encounter, x = sxOf(s);
    if (!x) return;
    for (const f of custom(s, 'break-rush')) x.rush = { until: e.cycle + (f.fx.cycles || 2), value: f.value };
    if (custom(s, 'break-splash').length) { if (e.commanding) x.splashArm = true; else x.splash = true; } // the next skill, not the one that broke it
    // The Overclocker's line: one more Momentum stack on top of the break's own.
    if (classOf(s) === 'breaker' && p.kind !== 'fragment') for (const f of custom(s, 'break-momentum')) {
      e.momentum = { stacks: Math.min(momentumCap(s), momentumStacks(s) + f.value), until: Math.max(e.momentum?.until ?? 0, e.cycle + SKILLS.momentumCycles) };
      e.bkMomentum = { ...e.momentum };
    }
    // Det Cord: a break heals a share of your max.
    for (const f of custom(s, 'break-heal%', { target: p })) heal(s, pctOf(s, f.value), f.name);
  },
  struck(s, atk, dealt, p) {
    const e = s.encounter, x = sxOf(s);
    if (!x || !(dealt > 0)) return;
    const d = defender(s), live = p && parts(s).includes(p) && alive(p);
    // Strongbox (4): a big hit marks the part that dealt it.
    for (const f of custom(s, 'big-mark')) if (live && dealt > (d.max * (f.fx.over || 15)) / 100) {
      mark(p, 'sxMark', s, { until: e.cycle + (f.fx.cycles || 3), value: f.value });
      const late = delayAttack(s, p, total(custom(s, 'mark-late'))); // one delay a wind-up, as any (combat.mjs)
      heal(s, pctOf(s, (f.fx.heal || 3) * custom(s, 'mark-heal').reduce((m, y) => m * y.value, 1)), f.name);
      emit(s, 'status', `${f.name}: the ${p.name} is marked. It takes ${f.value}% more from you for ${f.fx.cycles || 3} cycles${late ? ', and its next attack comes a cycle later' : ''}.`, { target: p.id, ...gear(f) });
    }
    if (d.integrity <= 0) return;
    // Glass Ceiling (4), the Parachute: once a fight each, dropping low heals.
    for (const f of custom(s, 'low-heal')) if (!x.once[f.id] && d.integrity < (d.max * (f.fx.at || 25)) / 100) { x.once[f.id] = true; heal(s, pctOf(s, f.value), f.name); }
    // Hot Spare (2): the first time a fight drops you low, a heal and more damage.
    for (const f of custom(s, 'comeback')) if (!x.once.back && d.integrity < (d.max * (f.fx.at || 30)) / 100) {
      x.once.back = true;
      x.back = { until: e.cycle + (f.fx.cycles || 3), value: f.fx.more || 10 };
      heal(s, pctOf(s, f.value), f.name);
      emit(s, 'status', `${f.name}: you deal ${x.back.value}% more for ${f.fx.cycles || 3} cycles.`, { mark: 'buff', ...gear(f) });
    }
  },
  // The end of your turn each cycle: Overtime's extra cooldown tick, Deep Archive's repeat armed.
  cycle(s) {
    const e = s.encounter, x = sxOf(s);
    if (!x) return;
    if (e.cycle % 2 === 0) for (const f of custom(s, 'late-tick')) {
      const cooling = Object.keys(e.readyAt).filter((k) => e.readyAt[k] > e.cycle + 1);
      for (const k of cooling) e.readyAt[k] -= f.value;
      if (cooling.length) emit(s, 'status', `${f.name}: your cooldowns tick one extra cycle.`, gear(f));
    }
    for (const f of custom(s, 'repeat-every')) if (e.cycle % (f.fx.every || 4) === 0) x.repeat = true;
  },
  // After a skill resolves (combat.mjs useAbility). before: the shield, the parts' jams and timers, the helpers and
  // burns and the crew's Signal and shields, from before it.
  used(s, { id, target, before }) {
    const e = s.encounter, x = sxOf(s);
    if (!x || !before) return;
    x.n++;
    if (!x.skills.includes(id)) x.skills.push(id);
    x.used[id] = true;
    if (x.splashArm) { x.splashArm = false; x.splash = true; }
    // Burns and helpers it started: longer (Hive Mind, Load Balanced), and every third helper as two.
    const longer = (of) => total(custom(s, 'dot-long').filter((f) => f.fx.of === of || f.fx.of === 'both'));
    const burns = e.burns.filter((b) => !before.burns.has(b)), helpers = e.helpers.filter((h) => !before.helpers.has(h));
    for (const b of burns) b.left += longer('burn');
    for (const h of helpers) h.left += longer('helper');
    const twin = custom(s, 'helper-twin')[0];
    for (const h of twin ? helpers : []) {
      if (++x.helpers % (twin.value || 3) || e.helpers.length >= helperCap(s)) continue;
      // The Hijacker's line: the extra helper goes to a part with none of yours on it, a second foothold.
      const other = custom(s, 'twin-foothold').length ? livingParts(s).find((q) => q.id !== h.target && !helpersOn(s, q).length) : null;
      e.helpers.push({ ...h, target: other ? other.id : h.target });
      emit(s, 'status', `${twin.name}: the helper arrives as two${other ? `, the second on the ${other.name}` : ''}.`, { target: other?.id || h.target, mark: 'helper', ...gear(twin) });
    }
    // Strongbox (3), the Combination: a shield you raised is larger.
    const grew = (e.shield || 0) - before.shield, big = custom(s, 'shield+%');
    if (grew > 0 && big.length) e.shield = before.shield + Math.round(grew * big.reduce((m, f) => m * pct(f.value), 1));
    // Choirbook (3): a jam or a delay you applied holds a cycle longer. It lengthens this command's delay (or makes the
    // jam one): another delay already holding the attack keeps it (combat.mjs delayAttack).
    const jam = total(custom(s, 'jam-long'));
    if (jam) for (const p of livingParts(s)) {
      const was = before.parts[p.id];
      if (!was) continue;
      if ((p.jammedUntil || 0) > was.jam) { p.jammedUntil += jam; if (p.attack && p.attack.due <= p.jammedUntil) delayAttack(s, p, jam, { extend: true }); }
      else if (p === target && ABILITIES[id]?.delay && p.attack && p.attack.due > was.due) delayAttack(s, p, jam, { extend: true });
    }
    // Mesh (3): what you put on a crewmate lands on you at a share.
    const share = total(custom(s, 'crew-share'));
    if (share) for (const a of before.allies) {
      const healed = defender(a.st).integrity - a.integrity, shielded = (a.st.encounter?.shield || 0) - a.shield;
      if (healed > 0) heal(s, Math.max(1, Math.round((healed * share) / 100)), `Mesh (3) from ${a.who}`);
      if (shielded > 0) e.shield = (e.shield || 0) + Math.max(1, Math.round((shielded * share) / 100));
    }
  },
};
