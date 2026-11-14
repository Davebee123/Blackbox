// Boss acts (docs/puzzle-fights.md P4): a beat that repeats, and three acts, each on a bar of its own (act bars, below).
// A boss with a beat (BOSSES[id].acts, by family for the Resident) deals one more of its tells an act, and each act
// brings its own rule (BOSSES phases).
//
//   the beat     one move on a fixed rhythm, always on the board: the Backlash (on its beat, a part your command hits
//                that doesn't break lashes back: its own attack lands at once, doubled), the Mimic's copy (HOLLOW CHOIR),
//                the Decoy's bend, or a part's own attack (RELAY-KING's Broadcast, REPO MAN's Collection). What you fire
//                on the beat, and where, is the puzzle.
//   the acts     act n deals tell n (charge, cast, then the third); a phase's every quickens the beat. An act ends when its last part breaks (act bars, below).
import { BOSSES, STRAINS, TELLS } from './data.mjs';
import { emit, alive, part, livingParts, strikeWith, attackAmount, landingsOf, hatch, active } from './combat.mjs';
import { tellsOf, findSource } from './tells.mjs';

export const ACTS = { lash: 2 }; // the Backlash's multiple

// The boss's acts (its family's, for the Resident), or null: not a P4 boss.
export function actsOf(v) {
  const A = v?.boss && BOSSES[v.boss]?.acts;
  if (!A) return null;
  return A.beat ? A : A[v.family] || null;
}
// The act now: 1 from the start, one more for each phase done.
export const actOf = (v) => 1 + (v?.phases || []).filter((x) => x.done).length;
// The act a boss is in, for the board (view.mjs actTag, the act break in actbreak.mjs): its number, of how many, and
// the name and emote of the phase that started it (BOSSES phases). null: not a boss with phases.
export function actInfo(v) {
  if (!v?.boss || !v.phases?.length || BOSSES[v.boss]?.raid) return null;
  const last = v.phases.filter((x) => x.done).at(-1);
  return { n: actOf(v), of: v.phases.length + 1, name: last?.name || null, emote: last?.emote || null };
}
const core = (s) => livingParts(s).find((x) => x.core) || null;

// ---------- the beat ----------
// The beat's part and the cycles it falls on, whichever kind it is (null: its part is gone).
export function beatOf(s) {
  const v = s.encounter?.virus, A = actsOf(v);
  if (!A) return null;
  if (A.beat === 'backlash') return v.backlash ? { part: core(s), kind: 'backlash', at: (c) => lashBeat(v, c) } : null;
  if (A.beat === 'copy') { const t = tellsOf(s)?.list.find((x) => x.kind === 'mimic'), p = t && part(s, t.part); return alive(p) && p.mimic ? { part: p, kind: 'copy', at: (c) => c >= t.first && (c - t.first) % t.every === 0 } : null; }
  // A part's own attack (RELAY-KING's Broadcast, REPO MAN's Collection): the cycles it played, then the ones it lands on.
  if (A.beat === 'broadcast' || A.beat === 'collect') { const p = livingParts(s).find((x) => (A.beat === 'broadcast' ? x.broadcast : x.lien) && x.attack); return p ? { part: p, kind: A.beat, at: (c) => (c < s.encounter.cycle ? (p.played || []).includes(c) : landingsOf(p, c + 1).includes(c)) } : null; }
  // Its own part's attack (the floor bosses, floorbosses.mjs: the Gavel's Surge, the Demand's Deadline, the Logger's Dump, main()'s Surge).
  if (A.beat === 'part') { const p = livingParts(s).find((x) => x.id === A.part && x.attack); return p ? { part: p, kind: 'part', at: (c) => (c < s.encounter.cycle ? (p.played || []).includes(c) : landingsOf(p, c + 1).includes(c)) } : null; }
  if (A.beat === 'bend') { const d = livingParts(s).find((x) => x.reflect); return d ? { part: d, kind: 'bend', at: (c) => (c + (d.reflectOff || 0)) % d.reflect === 0 } : null; }
  return null;
}
export const lashBeat = (v, c) => !!v?.backlash && c >= v.backlash.first && (c - v.backlash.first) % v.backlash.every === 0;
// The Backlash is on now for this part: a command hit on it this cycle lashes back (a part with an attack).
export const lashOn = (s, p, c = s.encounter?.cycle) => alive(p) && !!p.attack && lashBeat(s.encounter.virus, c);
// The next cycle the beat falls on, from this one (null: none on the way).
export function nextBeat(s, from = s.encounter.cycle) { const b = beatOf(s); if (!b) return null; for (let c = from; c < from + 12; c++) if (b.at(c)) return c; return null; }

// ---------- the fight ----------
// As the fight is engaged (after the boss rule set its ♛, before the tells are dealt): the beat on its part.
export function actsStart(s) {
  const e = s.encounter, v = e?.virus, A = actsOf(v);
  if (!A) return;
  e.actFrom = 1;
  if (A.beat === 'backlash') v.backlash = { every: A.every, first: A.first };
  if (A.beat === 'bend') { const d = v.parts.find((x) => x.reflect); if (d) { d.sings = true; if (A.every) { d.reflect = A.every; d.reflectOff = (A.every - (A.first % A.every)) % A.every; } } } // the Choir's Decoy: every bend bounces
}
// The act each tell belongs to (tells.mjs plannedTells): the n-th tell is act n's.
export const tellAct = (v, i) => (actsOf(v) ? i + 1 : 0);
// A phase starts (combat.mjs bossPhases): the act begins next cycle, and act 2 quickens the beat.
export function actBegins(s, ph) {
  const e = s.encounter, v = e.virus, A = actsOf(v);
  if (!A) return;
  e.actFrom = e.cycle + 1;
  const every = (ph.every ?? null);
  if (!every) return;
  const first = e.cycle + every;
  if (v.backlash) v.backlash = { every, first };
  const t = tellsOf(s)?.list.find((x) => x.kind === 'mimic');
  if (t && A.beat === 'copy') { t.every = every; t.first = first; if (t.told && t.next > first) { t.told = false; t.next = null; } }
  const d = A.beat === 'bend' && livingParts(s).find((x) => x.reflect);
  if (d) { d.reflect = every; d.reflectOff = (every - (first % every)) % every; }
}
// A hit from your command on a part (combat.mjs hit): on the Backlash's beat, it lashes back this cycle unless it breaks.
// A helper's hit counts when your command sent it this cycle, on the beat (docs/puzzle-fights.md 3.2; sent: its cycle).
export function lashHit(s, p, sent = null) {
  const e = s.encounter;
  if (!lashOn(s, p) || p.lashAt === e.cycle || (sent != null && sent < e.cycle)) return;
  p.lashAt = e.cycle;
}
// What a lash lands: a hit of the part's attack doubled
// (an Encrypt, a Replicate or a Scramble counts its hit, and does its own thing once on top: lashLand).
export function lashAttack(s, p) {
  const a = p.attack, n = a.effect === 'damage' ? attackAmount(p) : a.hit || 0;
  const amount = Math.max(1, Math.round(n * ACTS.lash));
  return { name: 'Backlash', effect: 'damage', amount, interval: a.interval, noCrit: true };
}
// The Resident's act 3 on top of a lash (BOSSES actPhases): the worm's Outbreak hatches a fragment, the ransomware's
// Lockdown encrypts you (while an Encryptor stands, on its Encrypt). What the chip says it adds, or null.
const encryptor = (s) => livingParts(s).find((x) => x.attack?.effect === 'encrypt') || null;
export function lashPlus(s, p) {
  const v = s.encounter.virus;
  if (v.outbreak && p.attack?.effect !== 'replicate') return 'hatches a fragment';
  if (v.lockdown && p.attack?.effect !== 'encrypt' && encryptor(s)) return 'encrypts you';
  return null;
}
// The virus's half (combat.mjs endCycle, before its attacks due): each lash lands. True if the fight ended.
export function lashLand(s) {
  const e = s.encounter;
  for (const p of livingParts(s).filter((x) => x.lashAt === e.cycle && x.attack)) {
    p.lashAt = null;
    const plus = lashPlus(s, p);
    emit(s, 'telegraph', `BACKLASH: you hit the ${p.name} on the beat. It lashes back${plus ? ` and ${plus}` : ''}.`, { source: p.id, tell: 'backlash', kind: 'backlash', at: e.cycle, name: 'BACKLASH' });
    if (strikeWith(s, p, lashAttack(s, p))) return true;
    if (p.attack.effect !== 'damage' && strikeWith(s, p, { ...p.attack, name: p.attack.name, hit: 0 })) return true;
    if (plus && e.virus.outbreak) hatch(s, p, `the ${p.name}'s lash`);
    if (plus && e.virus.lockdown) { const k = encryptor(s); if (strikeWith(s, k, { ...k.attack, name: 'Lockdown', hit: 0 })) return true; }
    if (!active(s)) return true;
  }
  return false;
}
// The beat's chips on the board (combat.mjs intents): the Backlash on each column it falls in.
export function actIntents(s, columns) {
  const e = s.encounter, out = [], v = e.virus;
  if (!v.backlash) return out;
  for (let col = 0; col < columns; col++) if (lashBeat(v, e.cycle + col)) for (const p of livingParts(s).filter((x) => x.attack)) { out.push({ source: p.id, name: 'Backlash', effect: 'backlash', amount: lashAttack(s, p).amount, also: p.attack.effect !== 'damage' ? p.attack.name : null, plus: lashPlus(s, p), col, hidden: false, kind: p.kind }); }
  return out;
}
// ---------- act bars (docs/solo-bosses.md "The shape") ----------
// A solo boss with phases fights each act on a fresh bar: its Integrity split evenly across its acts, every part back at
// full as an act begins, with that act's rules on top. An act ends when its last part breaks (fragments too); the next
// begins at the cycle's end (combat.mjs bossPhases). Every act starts from act 1's board and act 1's rules: an act's own
// rule leaves with it (one rule an act), what grew in it starts over, and a part it brings takes a seat, the board
// holding act 1's Integrity (actEven). The ♛ carries the boss's signature and plain ticks (interrupt.mjs). Crew bosses
// keep their own framework (raid.mjs).
export const barsOn = (s) => !!s.encounter?.actBars;
// The pacing (the designer, November 2026: an act runs 15 to 20 cycles). share: three acts hold this much of the
// boss's Integrity, a third each (a boss with two acts holds two thirds), times its own `bar` (BOSSES: how long its
// acts run against the rest). hit: its hits against one bar's, so a longer act costs about what a short one did.
// enrage: cycles into an act before it enrages (every attack every cycle, a quarter harder). Its rounds (combat.mjs
// roundOf) count from the act's start too.
export const ACT_BARS = { share: 1.8, hit: 0.55, enrage: 24, acts: 3 };
// An attack's size against one bar's: hits and encryption, never a heal, a hatch or a Scramble's length.
const HIT = new Set(['damage', 'encrypt']);
export function actHits(a, by = ACT_BARS.hit) {
  if (!a) return;
  if (HIT.has(a.effect)) a.amount = Math.max(1, Math.round(a.amount * by));
  if (a.hit) a.hit = Math.max(1, Math.round(a.hit * by));
}
// Each act's clock: its rounds and its enrage start at its first cycle.
function actClock(s, at) {
  const v = s.encounter.virus;
  v.actAt = at;
  v.enrageAt = at + ACT_BARS.enrage;
  v.enraged = false;
}
// As the boss rule is set (interrupt.mjs bossRule a): split its Integrity (and a lock on a part) across its acts
// (ACT_BARS), and what joins it later (hpPower) too; size its hits to the act.
export function barsStart(s) {
  const e = s.encounter, v = e?.virus;
  if (!v?.phases?.length || BOSSES[v.boss]?.raid) return false;
  const B = BOSSES[v.boss], k = (ACT_BARS.share * (B?.acts?.[v.family]?.bar ?? B?.bar ?? 1)) / ACT_BARS.acts, cut = (x) => Math.max(1, Math.round(x * k));
  e.actBars = true;
  v.hpPower = (v.hpPower || 1) * k;
  v.power = (v.power || 1) * ACT_BARS.hit;
  for (const p of v.parts) { actHits(p.attack); if (p.kind !== 'fragment') { p.max = p.integrity = cut(p.max); if (p.lockMax) p.lockMax = p.lockHp = cut(p.lockMax); } }
  actClock(s, e.cycle);
  return true;
}
// Act 1's board and rules as the fight engages (combat.mjs engage): what every later act starts from. KEEP: what a
// boss keeps for the whole fight. Everything else on the virus is its rules', and each act starts them over.
const KEEP = new Set(['parts', 'phases', 'tells', 'dealt', 'idleHit', 'weakPoint', 'weakKnown', 'enrageAt', 'enraged', 'actAt']);
export function barsSnap(s) {
  const e = s.encounter;
  if (!e?.actBars || e.actBoard) return;
  const v = e.virus, board = v.parts.filter((p) => p.integrity > 0 && p.kind !== 'fragment');
  e.actBoard = { at: e.cycle + 1, parts: structuredClone(board), keys: Object.keys(v).filter((k) => !KEEP.has(k)) };
  e.actMax = board.reduce((n, p) => n + p.max, 0);
}
// Act 1's tells as dealt (combat.mjs engage, after tellStart): every act deals them again, on its refilled board.
export function barsTells(s) {
  const e = s.encounter;
  if (e?.actBoard && e.virus.tells && !e.actBoard.tells) e.actBoard.tells = structuredClone(e.virus.tells.list);
}
// After an act's verbs: a tell whose part left the board (a seat taken) moves to another part that can carry it, or goes.
export function actTells(s) {
  const v = s.encounter.virus, T = v.tells;
  if (!T) return;
  T.list = T.list.filter((t) => {
    if (v.parts.some((p) => p.id === t.part && p.integrity > 0)) return true;
    const q = t.kind !== 'mimic' && findSource(v, { ...t, part: TELLS[t.id]?.part ?? 'special' });
    if (!q || !(q.integrity > 0)) return false;
    Object.assign(t, { part: q.id, told: false, n: null, next: null, said: null });
    return true;
  });
}
// An act's verbs ran (combat.mjs bossPhases): a part the act brought takes a seat, so its board holds act 1's Integrity.
export function actEven(s) {
  const e = s.encounter, ps = e?.virus?.parts.filter((p) => p.integrity > 0 && p.kind !== 'fragment') || [];
  const now = ps.reduce((n, p) => n + p.max, 0);
  if (!e?.actMax || now <= e.actMax) return;
  const k = e.actMax / now;
  for (const p of ps) { p.max = p.integrity = Math.max(1, Math.round(p.max * k)); if (p.lockMax) p.lockMax = p.lockHp = Math.max(1, Math.round(p.lockMax * k)); }
}
// Acts still to come after this one.
const actsLeft = (v) => (v?.phases || []).filter((x) => !x.done).length;
// The fight's bar over every act (combat.mjs virusIntegrity): this act's parts, and a full board for each act to come.
export function barsTotal(s, cur, max) {
  const e = s.encounter, left = actsLeft(e.virus) * (e.actMax || 0);
  return { current: cur + left, max: (e.actMax || 0) * ((e.virus.phases?.length || 0) + 1) };
}
// This act's bar (view.mjs): its parts' Integrity, out of its board's.
export function actBar(s) {
  const e = s.encounter, ps = e.virus.parts;
  return { current: ps.reduce((n, p) => n + p.integrity, 0), max: Math.max(e.actMax || 0, ps.reduce((n, p) => n + p.max, 0)) };
}
const LATER = /^(due|wake|.+At|.+Until)$/;
const later = (o, by) => { for (const [k, x] of Object.entries(o || {})) if (LATER.test(k) && typeof x === 'number' && x > 0 && x < 900) o[k] = x + by; };
// The cycle's end (combat.mjs bossPhases), every part broken and an act to come: act 1's board comes back at full, its
// timers where they stood, its ticks fresh, with act 1's rules (combat.mjs runs the floor bosses' fbStart again).
// Returns the phase that starts (its verbs run as usual).
export function barsTurn(s) {
  const e = s.encounter, v = e.virus;
  if (!e.actBars || livingParts(s).length || !e.actBoard) return null;
  const ph = v.phases.find((x) => !x.done);
  if (!ph) return null;
  const by = e.cycle + 1 - e.actBoard.at, board = structuredClone(e.actBoard.parts), sleeps = STRAINS[v.strain]?.dormant;
  for (const p of board) {
    const wake = p.attack?.wake; // a dormant part's: cycles after it wakes, not a cycle
    later(p, by); later(p.attack, by);
    if (sleeps && wake != null) p.attack.wake = wake;
    for (const t of p.pending || []) t.at += by;
    p.ticks = null; p.played = []; p.lastDamaged = 0;
  }
  v.parts = board;
  // Act 1's tells come back with their parts (every tell died as its part broke), on the same clock as the board.
  if (v.tells && e.actBoard.tells) {
    const have = new Set(v.tells.list.map((t) => t.id));
    for (const t of structuredClone(e.actBoard.tells)) if (!have.has(t.id)) { for (const k of ['after', 'next', 'said', 'first']) if (t[k] != null) t[k] += by; v.tells.list.push(t); }
  }
  if (e.actBoard.keys) for (const k of Object.keys(v)) if (!KEEP.has(k) && !e.actBoard.keys.includes(k)) delete v[k]; // what the last act's rules added (Liens, a Round) goes with it; a fight saved before keeps them
  e.burns = (e.burns || []).filter((b) => !board.some((p) => p.id === b.target));
  if (!board.some((p) => p.id === v.weakPoint)) { v.weakPoint = board[0]?.id; v.weakKnown = false; }
  e.actFrom = e.cycle + 1;
  e.turnedAt = e.cycle;
  actClock(s, e.cycle + 1);
  if (sleeps) Object.assign(v, { dormant: true, woke: false, wakeAt: e.cycle + sleeps }); // a Sleeper boss (SLEEPWALKER) sleeps again at each act's start
  ph.at = 2;
  return ph;
}
