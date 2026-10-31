// Boss acts (docs/puzzle-fights.md P4): a beat that repeats, three acts, and the one to leave. A P4 boss (BOSSES[id].acts,
// by family for the Resident) plays in three acts: the first from the start, the next two from its ♛ part's ticks at 50%
// and 25% (interrupt.mjs rule a). Each act deals one more of its tells and quickens its beat; the last speeds every attack.
//
//   the beat     one move on a fixed rhythm, always on the board: the Backlash (on its beat, a part your command hits
//                that doesn't break lashes back: its own attack lands at once, doubled), the Mimic's copy (REPO MAN's Repo
//                Agent) or the Decoy's bend (HOLLOW CHOIR). What you fire on the beat, and where, is the puzzle.
//   the acts     act n deals tell n (charge, cast, then the third); act 2 quickens the beat (every), act 3 speeds every
//                attack a cycle (BOSSES phases).
//   the one to leave  the ♛ must stand above its next tick until this act's beat has played (ACTS.leave), or nothing else
//                stands. Taken under it sooner, every part re-arms (to its full ◆). A hit takes it under one tick at most.
import { BOSSES, TELL } from './data.mjs';
import { emit, alive, part, livingParts, defender, strikeWith, attackAmount } from './combat.mjs';
import { tellsOf } from './tells.mjs';

export const ACTS = { leave: 1, lash: 2, floor: 0.3 }; // beats an act plays before its ♛ may go on; the Backlash's multiple, and its least (a share of your max)

// The boss's acts (its family's, for the Resident), or null: not a P4 boss.
export function actsOf(v) {
  const A = v?.boss && BOSSES[v.boss]?.acts;
  if (!A) return null;
  return A.beat ? A : A[v.family] || null;
}
// The act now: 1 from the start, one more for each phase done.
export const actOf = (v) => 1 + (v?.phases || []).filter((x) => x.done).length;
const core = (s) => livingParts(s).find((x) => x.core) || null;

// ---------- the beat ----------
// The beat's part and the cycles it falls on, whichever kind it is (null: its part is gone).
export function beatOf(s) {
  const v = s.encounter?.virus, A = actsOf(v);
  if (!A) return null;
  if (A.beat === 'backlash') return v.backlash ? { part: core(s), kind: 'backlash', at: (c) => lashBeat(v, c) } : null;
  if (A.beat === 'copy') { const t = tellsOf(s)?.list.find((x) => x.kind === 'mimic'), p = t && part(s, t.part); return alive(p) && p.mimic ? { part: p, kind: 'copy', at: (c) => c >= t.first && (c - t.first) % t.every === 0 } : null; }
  if (A.beat === 'bend') { const d = livingParts(s).find((x) => x.reflect); return d ? { part: d, kind: 'bend', at: (c) => (c + (d.reflectOff || 0)) % d.reflect === 0 } : null; }
  return null;
}
export const lashBeat = (v, c) => !!v?.backlash && c >= v.backlash.first && (c - v.backlash.first) % v.backlash.every === 0;
// The Backlash is on now for this part: a command hit on it this cycle lashes back (a part with an attack).
export const lashOn = (s, p, c = s.encounter?.cycle) => alive(p) && !!p.attack && lashBeat(s.encounter.virus, c);
// Beats this act has played (cycles before this one, since the act began), and whether the act is done: its beat
// has played ACTS.leave times, its beat's part is gone, or nothing but the ♛ stands.
export function beatsPlayed(s) {
  const e = s.encounter, b = beatOf(s);
  if (!b) return Infinity;
  let n = 0;
  for (let c = e.actFrom || 1; c < e.cycle; c++) if (b.at(c)) n++;
  return n;
}
export const actDone = (s) => beatsPlayed(s) >= ACTS.leave || !livingParts(s).some((x) => !x.core && x.kind === 'system'); // nothing else to work on: go
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
// The ♛ taken under its next tick (interrupt.mjs onHit): before this act's beat has played, every part re-arms.
export function crossed(s, p) {
  const v = s.encounter.virus;
  if (!actsOf(v) || actDone(s)) return false;
  for (const x of livingParts(s)) if (x.kind === 'system' && x.maxArmor > 0) { x.armor = x.maxArmor; x.patchAt = null; }
  emit(s, 'phase', `Too soon: ${v.name}'s ${p.name} went under before its beat played. Every part re-arms.`, { boss: v.boss, target: p.id, early: true });
  return true;
}
// The most a hit takes off the ♛ (combat.mjs hit): down to just under its next tick, and no further, so each act is
// played (none skipped by one big hit). Past its last tick, the rest of it.
export function actCap(s, p) {
  if (!actsOf(s.encounter?.virus)) return Infinity;
  const t = (p.ticks || []).find((x) => !x.spent);
  return t ? Math.max(0, p.integrity - Math.floor(t.at * p.max)) : Infinity;
}
// A hit from your command on a part (combat.mjs hit): on the Backlash's beat, it lashes back this cycle unless it breaks.
// A helper's hit counts when your command sent it this cycle, on the beat (docs/puzzle-fights.md 3.2; sent: its cycle).
export function lashHit(s, p, sent = null) {
  const e = s.encounter;
  if (!lashOn(s, p) || p.lashAt === e.cycle || (sent != null && sent < e.cycle)) return;
  p.lashAt = e.cycle;
}
// What a lash lands: a hit of the part's attack doubled, never under ACTS.floor of your max nor over the tell ceiling
// (an Encrypt, a Replicate or a Scramble counts its hit, and does its own thing once on top: lashLand).
export function lashAttack(s, p) {
  const a = p.attack, max = defender(s).max, n = a.effect === 'damage' ? attackAmount(p) : a.hit || 0;
  const amount = Math.max(Math.round(ACTS.floor * max), Math.min(Math.round(n * ACTS.lash), Math.round(TELL.ceiling * max)));
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
// The ♛'s leave mark (view.mjs): whether it may go on now, and what the next tick takes.
export function leaveOf(s) {
  const v = s.encounter?.virus, p = core(s);
  if (!actsOf(v) || !p || !(p.ticks || []).some((t) => !t.spent)) return null;
  const done = actDone(s), beat = nextBeat(s);
  return { part: p, done, beat: beat == null ? null : beat - s.encounter.cycle };
}
