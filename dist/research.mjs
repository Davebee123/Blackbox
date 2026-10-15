// Part research (GAME_RULES.md "Part research"): what you know about a virus part grows with what you do to it in
// your fights. Each part counts on its own, keyed by its body and its id (combat.mjs codexKey: the strain or family,
// a guard, and a boss's on its family's or strain's), the same key the Codex and the board read.
//
//   earning   break it +1, cut its move with a tick (interrupt.mjs) +1, answer a tell it rides (tells.mjs) +2.
//             A crewmate's fight never counts for you (s.who: a crewmate's own state).
//   tiers     0 met: its name and what it hits · 1 decoded: Integrity, ◆, its attack and timing at your level, its
//             tooltip and cue on the board · 5: its rule, its answer and the tells it can ride · 20 (100%): its loot,
//             and the mastery perk
//   mastery   that part only: its component drops 25% more often (combat.mjs breakPart), and every hit of yours on it
//             deals 3% more (combat.mjs damageMultiplier, so every preview on the board counts it too)
//
// State is s.research ({ key: n }, n capped at 20). fresh() starts it empty and the save restore adds it to an older
// save (no SAVE_VERSION change, as the Codex's s.dex): every part that save had decoded (s.codex) starts decoded (research 3), and
// nothing else is granted.
import { emit, gainXp, xpFor, DECODE_XP, codexKey as keyOf } from './combat.mjs';

export const RESEARCH = {
  max: 60,
  tiers: [3, 15, 60], // decoded, rule, mastered (the designer: "you should need to grind quite a few"; were 1, 5, 20)
  points: { break: 1, cut: 1, tell: 2 },
  perk: { drop: 1.25, dmg: 1.03 },
};
export const TIER = { decoded: 3, rule: 15, mastered: 60 };
export const RESEARCH_SCALE = 3; // an older save's research (on the 1/5/20 scale) is tripled once, so nothing it had unlocked locks again

// The record, made on first use: an older save's decoded parts start decoded (research 3).
export function researchOf(s) {
  if (!s.research) {
    s.research = {};
    for (const [k, on] of Object.entries(s.codex || {})) if (on) s.research[k] = TIER.decoded;
    s.researchScale = RESEARCH_SCALE;
  }
  if (s.researchScale !== RESEARCH_SCALE) { // research earned on the old 1/5/20 scale: tripled once
    for (const k of Object.keys(s.research)) s.research[k] = Math.min(RESEARCH.max, s.research[k] * RESEARCH_SCALE);
    s.researchScale = RESEARCH_SCALE;
  }
  delete s.codex; // the part codex from before research: research holds it now
  return s.research;
}
export const researchAt = (s, key) => Math.min(RESEARCH.max, s?.research?.[key] || 0);
export const partResearch = (s, v, p) => (p && v ? researchAt(s, keyOf(v, p)) : 0);
// The tier a count reaches: 0, 3, 15 or 60.
export const tierAt = (n) => RESEARCH.tiers.filter((t) => n >= t).at(-1) || 0;
export const knows = (s, v, p, tier) => p?.kind === 'fragment' || partResearch(s, v, p) >= tier;
// The mastery perk: your hits on it and its drop. Never a crewmate's (s.who).
export const mastered = (s, v, p) => !s?.who && !!p && p.kind !== 'fragment' && !!v && partResearch(s, v, p) >= TIER.mastered;
export const masteryDmg = (s, v, p) => (mastered(s, v, p) ? RESEARCH.perk.dmg : 1);
export const masteryDrop = (s, v, p) => (mastered(s, v, p) ? RESEARCH.perk.drop : 1);
// A share of the way to 100%: a body's research is the average of its parts'.
export const share = (n) => Math.min(RESEARCH.max, n || 0) / RESEARCH.max;
export const pctOf = (ns) => (ns.length ? Math.round((ns.reduce((a, n) => a + share(n), 0) / ns.length) * 100) : 0);

// What each tier says when you reach it, as the log puts it (tooltip grammar's plain voice: terse).
export const tierLine = (name, tier) => (tier === TIER.decoded ? `${name} decoded: research ${tier}. Hover it to see its numbers.`
  : tier === TIER.rule ? `${name} research ${tier}: its rule and answers are in the Codex.`
    : `${name} mastered: research ${tier}. Its component drops ${Math.round((RESEARCH.perk.drop - 1) * 100)}% more often, and you deal ${Math.round((RESEARCH.perk.dmg - 1) * 100)}% more damage to it.`);

// Research earned on a part in your fight: how (break, cut or tell). Returns the tier it reached, or 0. Reaching the
// first tier decodes the part, and that pays its XP (combat.mjs DECODE_XP), as the first break always did.
export function gainResearch(s, v, p, how) {
  if (!s || s.who || !v || !p || p.kind === 'fragment') return 0;
  const n = RESEARCH.points[how] || 0;
  if (!n) return 0;
  const R = researchOf(s), key = keyOf(v, p), was = Math.min(RESEARCH.max, R[key] || 0);
  if (was >= RESEARCH.max) return 0;
  const now = Math.min(RESEARCH.max, was + n);
  R[key] = now;
  const hit = RESEARCH.tiers.filter((t) => was < t && now >= t);
  for (const t of hit) {
    const type = t === TIER.decoded ? 'codex' : t === TIER.mastered ? 'mastered' : 'research';
    emit(s, type, tierLine(p.name, t), { target: p.id, research: now, tier: t, how });
    if (t === TIER.decoded && s.encounter) gainXp(s, xpFor(s, v.level, DECODE_XP), `${p.name} decoded`, 'intel');
  }
  return hit.at(-1) || 0;
}
