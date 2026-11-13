// Boss acts (docs/puzzle-fights.md P4): a beat that repeats, and three acts, each on a bar of its own (act bars, below).
// A boss with a beat (BOSSES[id].acts, by family for the Resident) deals one more of its tells an act and quickens its
// beat in act 2; the last speeds every attack.
//
//   the beat     one move on a fixed rhythm, always on the board: the Backlash (on its beat, a part your command hits
//                that doesn't break lashes back: its own attack lands at once, doubled), the Mimic's copy (HOLLOW CHOIR),
//                the Decoy's bend, or a part's own attack (RELAY-KING's Broadcast, REPO MAN's Collection). What you fire
//                on the beat, and where, is the puzzle.
//   the acts     act n deals tell n (charge, cast, then the third); act 2 quickens the beat (every), act 3 speeds every
//                attack a cycle (BOSSES phases). An act ends when its last part breaks (act bars, below).
import { BOSSES } from './data.mjs';
import { emit, alive, part, livingParts, strikeWith, attackAmount, landingsOf } from './combat.mjs';
import { tellsOf } from './tells.mjs';

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
// The virus's half (combat.mjs endCycle, before its attacks due): each lash lands. True if the fight ended.
export function lashLand(s) {
  const e = s.encounter;
  for (const p of livingParts(s).filter((x) => x.lashAt === e.cycle && x.attack)) {
    p.lashAt = null;
    emit(s, 'telegraph', `BACKLASH: you hit the ${p.name} on the beat. It lashes back.`, { source: p.id, tell: 'backlash', kind: 'backlash', at: e.cycle, name: 'BACKLASH' });
    if (strikeWith(s, p, lashAttack(s, p))) return true;
    if (p.attack.effect !== 'damage' && strikeWith(s, p, { ...p.attack, name: p.attack.name, hit: 0 })) return true;
  }
  return false;
}
// The beat's chips on the board (combat.mjs intents): the Backlash on each column it falls in.
export function actIntents(s, columns) {
  const e = s.encounter, out = [], v = e.virus;
  if (!v.backlash) return out;
  for (let col = 0; col < columns; col++) if (lashBeat(v, e.cycle + col)) for (const p of livingParts(s).filter((x) => x.attack)) { out.push({ source: p.id, name: 'Backlash', effect: 'backlash', amount: lashAttack(s, p).amount, also: p.attack.effect !== 'damage' ? p.attack.name : null, col, hidden: false, kind: p.kind }); }
  return out;
}
// ---------- act bars (docs/solo-bosses.md "The shape") ----------
// A solo boss with phases fights each act on a fresh bar: its Integrity split evenly across its acts, every part back at
// full as an act begins, with that act's rules on top. An act ends when its last part breaks (fragments too); the next
// begins at the cycle's end (combat.mjs bossPhases). The board an act starts with (after its verbs) is the next one's.
// The ♛ carries the boss's signature and plain ticks (interrupt.mjs). Crew bosses keep their own framework (raid.mjs).
export const barsOn = (s) => !!s.encounter?.actBars;
// The acts together hold `share` of the boss's Integrity, so each of three is about a quarter of what the boss had on
// one bar. Every act re-arms its ◆ and spends its ticks afresh, so a full third each runs the fight about 20% longer
// than one bar did; a quarter each keeps the fight the length it is today (docs/solo-bosses.md "Act bars, measured").
export const ACT_BARS = { share: 0.72 };
// As the boss rule is set (interrupt.mjs bossRule a): split its Integrity (and a lock on a part) across its acts (ACT_BARS), and
// what joins it later (hpPower) too.
export function barsStart(s) {
  const e = s.encounter, v = e?.virus;
  if (!v?.phases?.length || BOSSES[v.boss]?.raid) return false;
  const n = v.phases.length + 1, cut = (x) => Math.max(1, Math.round((x * ACT_BARS.share) / n));
  e.actBars = true;
  v.hpPower = ((v.hpPower || 1) * ACT_BARS.share) / n;
  for (const p of v.parts) if (p.kind !== 'fragment') { p.max = p.integrity = cut(p.max); if (p.lockMax) p.lockMax = p.lockHp = cut(p.lockMax); }
  return true;
}
// The board as an act begins (combat.mjs engage, bossPhases): what the next act refills.
export function barsSnap(s) {
  const e = s.encounter;
  if (!e?.actBars) return;
  const board = e.virus.parts.filter((p) => p.integrity > 0 && p.kind !== 'fragment');
  e.actBoard = { at: e.cycle + 1, parts: structuredClone(board) };
  e.actMax = board.reduce((n, p) => n + p.max, 0);
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
// The cycle's end (combat.mjs bossPhases), every part broken and an act to come: the board this act began with comes
// back at full, its timers where they stood, its ticks fresh. Returns the phase that starts (its verbs run as usual).
export function barsTurn(s) {
  const e = s.encounter, v = e.virus;
  if (!e.actBars || livingParts(s).length || !e.actBoard) return null;
  const ph = v.phases.find((x) => !x.done);
  if (!ph) return null;
  const by = e.cycle + 1 - e.actBoard.at, board = structuredClone(e.actBoard.parts);
  for (const p of board) {
    later(p, by); later(p.attack, by);
    for (const t of p.pending || []) t.at += by;
    p.ticks = null; p.played = []; p.lastDamaged = 0;
  }
  v.parts = board;
  e.burns = (e.burns || []).filter((b) => !board.some((p) => p.id === b.target));
  if (!board.some((p) => p.id === v.weakPoint)) { v.weakPoint = board[0]?.id; v.weakKnown = false; }
  e.actFrom = e.cycle + 1;
  ph.at = 2;
  return ph;
}
