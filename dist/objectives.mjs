// Objectives (docs/variety-plan.md 2): what wins a room's fight, besides breaking every part. One on the encounter,
// e.objective = { kind, n, part?, met?, failed? }, set as the room's fight starts (floorplan.mjs fight). combat.mjs asks
// this module as a part breaks or takes a hit and as each cycle closes, and finish pays the bonus for one met.
//   exfil     the Exfil's upload: still up at the end of cycle n, it gets away. Its archive is its pay (no bonus).
//   priority  break the marked part by the end of cycle n; the rest can stand. Missed: the fight goes on, no bonus.
//   uptime    keep your Signal up to the end of cycle n and the fight is won. The virus can't be broken, and every few
//             cycles its attacks come a cycle quicker.
// One server fight room in two carries Priority or Uptime, and it takes the lever's place (floorplan.mjs fightOf).
import { emit, livingParts } from './combat.mjs';
import { seeded } from './gear.mjs';
import { gainComponents } from './salvage.mjs';

// The numbers, every one a start: the designer's play tunes them.
export const OBJ = {
  share: 0.5, // of a server's fight rooms
  from: 6, // the level they start: with the levers whose place they take (parts.mjs PARTS.lever)
  bonus: { rolls: 1, xp: 0.5, components: 2 }, // a met objective: the loot rolls once more, half the kill's XP again, components
};
export const OBJECTIVES = {
  exfil: { name: 'Exfil', bonus: false }, // its n: CONFIG.exfil.escape (floorplan.mjs fight)
  priority: { name: 'Priority', n: 5, bonus: true },
  uptime: { name: 'Uptime', n: 8, every: 3, bonus: true },
};
export const ROLLED = ['priority', 'uptime'];
const cyc = (n) => `${n} ${n === 1 ? 'cycle' : 'cycles'}`;

// A room's objective, by its own hash of the spawn's seed (the card and the fight agree), or null.
export function rollObjective(seed, level) {
  if (level < OBJ.from) return null;
  const r = seeded(((seed >>> 0) ^ 0x0b1ec7) >>> 0 || 1);
  return r() < OBJ.share ? ROLLED[Math.floor(r() * ROLLED.length)] : null;
}
// Set as the fight starts. Priority marks one part, by the fight's seed (never a fragment or a Spam Flood).
export function armObjective(s, e, kind, n = OBJECTIVES[kind].n) {
  const o = { kind, n };
  if (kind === 'priority') {
    const xs = e.virus.parts.filter((p) => p.kind !== 'fragment' && !p.spam);
    o.part = xs[Math.floor(seeded(((e.seed >>> 0) ^ 0x9e1) >>> 0 || 1)() * xs.length)]?.id;
  }
  e.objective = o;
  return o;
}
export const objectiveOf = (e) => e?.objective || null;
export const objectiveMet = (e) => !!e?.objective?.met && !!OBJECTIVES[e.objective.kind]?.bonus;
// Uptime: the virus can't be broken. A hit takes a part down to 1 at most (its fragments still fall).
export const holdsPart = (e, p) => e?.objective?.kind === 'uptime' && p.kind !== 'fragment';
// A part broke: the Priority's, in time, meets it.
export function objectiveBroke(s, p) {
  const o = s.encounter?.objective;
  if (o?.kind !== 'priority' || o.met || o.failed || p.id !== o.part) return;
  o.met = true;
  emit(s, 'status', `Priority met: the ${p.name} is down.`, { target: p.id, objective: 'priority' });
}
// The end of a cycle: the objective's clock. Returns how the fight ends ('escaped', 'victory'), or null.
export function objectiveCycle(s) {
  const e = s.encounter, o = e?.objective;
  if (!o || !(e.rooms || e.arena)) return null; // a room's fight, or the Arena's (arena.mjs)
  if (o.kind === 'exfil') return e.cycle >= o.n ? 'escaped' : null;
  if (o.kind === 'priority') {
    if (!o.met && !o.failed && e.cycle >= o.n) { o.failed = true; emit(s, 'status', 'Priority missed. Fight on.', { objective: 'priority' }); }
    return null;
  }
  if (o.kind === 'uptime') {
    if (e.cycle >= o.n) { o.met = true; return 'victory'; }
    if (e.cycle % OBJECTIVES.uptime.every === 0) {
      for (const p of livingParts(s)) { const a = p.attack; if (a && a.interval > 1) { a.interval--; a.due = Math.min(a.due, e.cycle + a.interval); } }
      emit(s, 'status', 'Its attacks come a cycle quicker.', { objective: 'uptime' });
    }
  }
  return null;
}
// A met objective's bonus (finish, on a win): its components now; its loot roll (combat.mjs rollDrop) and XP (payKill)
// read objectiveMet.
export function objectiveBonus(s, e) {
  if (!objectiveMet(e)) return;
  const n = gainComponents(s, OBJ.bonus.components);
  emit(s, 'loot', `${OBJECTIVES[e.objective.kind].name}: +${n} components.`, { objective: e.objective.kind });
}
export const bonusXp = (e, xp) => (objectiveMet(e) ? Math.max(1, Math.round(xp * OBJ.bonus.xp)) : 0);
export const bonusRolls = (e) => (objectiveMet(e) && e.phase !== 'active' ? OBJ.bonus.rolls : 0);

// ---------- the board ----------
// Its chip in the phase strip: "Upload 2/6", "Uptime 3/8", "Priority 2/5" (✓ met, ✗ missed).
export function objectiveText(e) {
  const o = e.objective, done = Math.max(0, Math.min(o.n, e.cycle - 1));
  if (o.kind === 'exfil') return `Upload ${done}/${o.n}`;
  if (o.met) return `${OBJECTIVES[o.kind].name} ✓`;
  if (o.failed) return `${OBJECTIVES[o.kind].name} ✗`;
  return `${OBJECTIVES[o.kind].name} ${done}/${o.n}`;
}
// Its tooltip, WoW's grammar: the name, what it does, then the answer (▸, muted). The kind line rides on data-tt-kind.
export function objectiveTip(e, partName = null) {
  const o = e.objective;
  if (o.kind === 'exfil') return `Exfil: still up at the end of cycle ${o.n}, its upload completes and the archive is gone.\n▸ Break its Uplink first.`;
  if (o.kind === 'priority') return `Priority: break the ${partName || 'marked part'} by the end of cycle ${o.n} for the bonus. The rest can stand.\n▸ Focus it first. Missed, the fight goes on.`;
  return `Uptime: keep your Signal up to the end of cycle ${o.n} and the fight is won. The virus can't be broken, and every ${cyc(OBJECTIVES.uptime.every)} its attacks come a cycle quicker.\n▸ Defend: shields, cuts and heals win it.`;
}
// The room card's line and the map's tag: what walking in brings.
export function objectiveLine(kind) {
  const n = OBJECTIVES[kind].n;
  return kind === 'priority' ? `Break the marked part within ${cyc(n)}.` : `Keep your Signal up for ${cyc(n)}. The virus can't be broken.`;
}
