// Ability mastery: an ability's effect (abilityfx.mjs) evolves with use. Every ability you fire in a fight counts, per
// class, on the save; at MASTERY thresholds its effect reaches tier 2 (a richer version) and tier 3 (a signature
// flourish: abilityfx-table.mjs TIERS and TIER_UP). Cosmetic only: a tier changes how the effect looks, never a number.
//
// What counts: a command you fired (typed, from the tray, its number key, the timer's auto-repeat, a routine you made),
// once it fires (its cooldown spent, a miss included). Not a daemon's (it's the daemon's), not a crewmate's (their state
// is their own: s.who), not a breach's scripts. Key 1 counts under its class's word (Ban is the Bastion's, Bash the
// Breaker's), SIGINT per class too.
//
// Thresholds by how often an ability can fire (its cooldown): a main-rotation skill fires 1 to 3 times a fight (the
// balance planner, balance.mjs), so at about 150 fights an hour of real play (gear.mjs LOOT.killsPerHour) one reaches
// tier 3 in roughly 3 to 7 hours of play with it; a rarely-fired one (SIGINT, a long cooldown, once a fight) has lower
// thresholds, so it still gets there in a long while.
//
// The tier it plays at is yours to choose (Skills page: its detail panel; `mastery <skill> <1-3>`), any tier you've
// unlocked; by default the highest. Choosing the highest you have goes back to the default (it follows you up).
//
// Saved on s.mastery = { uses: { class: { ability id: n } }, pick: { class: { ability id: tier } } }, with defaults;
// an older save starts at 0 everywhere.
import { ABILITIES, ARCHETYPES, SUBS, SPIKE, isRunSkill, spikeOf } from './data.mjs';
import { RECIPES } from './abilityfx-table.mjs';

export const TIERS_N = 3;
// [tier 2, tier 3] uses, by the ability's cooldown (cycles); key 1 with the staples.
export const MASTERY = {
  bands: [
    { upTo: 2, at: [100, 1000] }, // key 1, the lit skills and the 2-cycle staples (Crack, Exploit, Reject…)
    { upTo: 5, at: [75, 750] }, // the main rotation (Overload, Inject, Purge, Botnet…)
    { upTo: 8, at: [40, 400] }, // the longer ones (Flood, Harden, Quarantine, SIGINT…)
    { upTo: Infinity, at: [20, 200] }, // the rare ones (10 cycles and over) and once a fight (Zero-day, Rootkit Implant…)
  ],
};
// The recipe key an ability plays under for a class (key 1 is its class's word).
const keyOf = (id, cls) => (id === 'spike' ? SPIKE[cls]?.word || 'spike' : id);
// An ability with an effect to master (every one you can fire in a fight; run skills never fire there).
export const masterable = (id, cls) => !!ABILITIES[id] && !isRunSkill(id) && Object.hasOwn(RECIPES, keyOf(id, cls));
// Its thresholds by tier: [, 0, tier 2's, tier 3's] (index 1 to 3: the uses that tier needs).
export function thresholdsOf(id) {
  const a = ABILITIES[id];
  if (!a) return [null, 0, Infinity, Infinity];
  const cd = a.once ? Infinity : a.cooldown || 0;
  return [null, 0, ...MASTERY.bands.find((b) => cd <= b.upTo).at];
}
// Every ability a class can master, in its page's order: key 1, SIGINT, its core, then each subclass's line.
export function masteryList(cls) {
  const a = ARCHETYPES[cls];
  if (!a) return [];
  const ids = ['spike', 'sigint', ...a.core, ...Object.keys(a.subs).flatMap((sub) => (SUBS[sub]?.skills || []).map((x) => x.id || x))];
  return [...new Set(ids)].filter((id) => masterable(id, cls));
}
// A class's own kit to master: key 1, its core and one subclass's line (the achievement's "every ability of a class").
export function kitOf(cls, sub) {
  const a = ARCHETYPES[cls];
  if (!a || SUBS[sub]?.cls !== cls) return [];
  return [...new Set(['spike', ...a.core, ...(SUBS[sub].skills || []).map((x) => x.id || x)])].filter((id) => masterable(id, cls));
}

// ---------- the save ----------
export function masteryOf(s) {
  const M = (s.mastery ||= {});
  M.uses ||= {}; M.pick ||= {};
  return M;
}
export const usesOf = (s, cls, id) => s?.mastery?.uses?.[cls]?.[id] || 0;
// The tier its uses have reached.
export function earnedTier(s, cls, id) {
  const n = usesOf(s, cls, id), t = thresholdsOf(id);
  return n >= t[3] ? 3 : n >= t[2] ? 2 : 1;
}
// The tier it plays at: the one you chose, if you still have it, else the highest you've reached.
export function tierOf(s, cls, id) {
  const top = earnedTier(s, cls, id), pick = s?.mastery?.pick?.[cls]?.[id];
  return pick >= 1 && pick <= top ? pick : top;
}
// The engine's note of a use (combat.mjs useAbility): yours only, in a fight, never a daemon's or a crewmate's.
export function noteUse(s, id, auto, cls) {
  if (s.who || auto === 'daemon' || !masterable(id, cls)) return;
  const U = masteryOf(s).uses;
  U[cls] ||= {};
  U[cls][id] = (U[cls][id] || 0) + 1;
}
// Where it stands: { tier, uses, next (the next tier's threshold, or null at the top), pick (the tier it plays at) }.
export function progressOf(s, cls, id) {
  const tier = earnedTier(s, cls, id), t = thresholdsOf(id);
  return { tier, uses: usesOf(s, cls, id), next: tier < TIERS_N ? t[tier + 1] : null, pick: tierOf(s, cls, id), at: t };
}
// Its line in WoW tooltip grammar: "Mastery 2 · 340/1000" (on its way to the next tier), "Mastery 3 · mastered".
export function masteryLine(s, cls, id) {
  if (!masterable(id, cls)) return '';
  const p = progressOf(s, cls, id);
  return `Mastery ${p.tier} · ${p.next ? `${Math.min(p.uses, p.next)}/${p.next}` : 'mastered'}`;
}

// ---------- the reads achievements.mjs makes ----------
// How many abilities you've taken to tier 3, over every class.
export const masteredN = (s) => Object.entries(s?.mastery?.uses || {}).reduce((n, [cls, ids]) => n + Object.keys(ids || {}).filter((id) => ARCHETYPES[cls] && earnedTier(s, cls, id) >= 3).length, 0);
// Key 1 at tier 3 for how many classes.
export const keyOnesN = (s) => Object.keys(ARCHETYPES).filter((cls) => earnedTier(s, cls, 'spike') >= 3).length;
// The best share of a class's kit (key 1, core, one subclass's line) at tier 3: [done, of].
export function kitBest(s) {
  let best = [0, 1];
  for (const [cls, a] of Object.entries(ARCHETYPES)) for (const sub of Object.keys(a.subs)) {
    const ids = kitOf(cls, sub), done = ids.filter((id) => earnedTier(s, cls, id) >= 3).length;
    if (ids.length && done / ids.length > best[0] / best[1]) best = [done, ids.length];
  }
  return best;
}

// ---------- the command ----------
// mastery [<class>] <skill> <1|2|3>: the tier its effect plays at (one you've unlocked). mastery [<skill>]: where it
// stands. The skill by its id or its name (key 1 by its class's word, or spike).
export function findSkill(cls, words) {
  const w = String(words || '').toLowerCase().trim();
  if (!w) return null;
  if (w === 'spike' || w === spikeOf(cls).word || w === spikeOf(cls).name.toLowerCase() || w === 'key 1') return 'spike';
  const hit = Object.entries(ABILITIES).find(([id, a]) => id === w || a.name.toLowerCase() === w);
  return hit && masterable(hit[0], cls) ? hit[0] : null;
}
export const skillName = (id, cls) => (id === 'spike' ? spikeOf(cls).name : ABILITIES[id]?.name || id);
export function masteryCommand(s, text, { emit, warn, classOf }) {
  const words = String(text).trim().split(/\s+/).slice(1);
  let cls = classOf(s);
  if (ARCHETYPES[words[0]]) cls = words.shift();
  const last = words[words.length - 1], tier = /^[123]$/.test(last || '') ? Number(words.pop()) : null;
  if (!words.length) {
    const list = masteryList(cls).filter((id) => usesOf(s, cls, id) > 0);
    return emit(s, 'info', list.length ? `Mastery (${ARCHETYPES[cls].name}): ${list.map((id) => `${skillName(id, cls)} ${masteryLine(s, cls, id).replace(/^Mastery /, '')}`).join(', ')}.` : `No mastery yet as ${/^[AEIOU]/.test(ARCHETYPES[cls].name) ? 'an' : 'a'} ${ARCHETYPES[cls].name}: every ability you fire in a fight counts toward its next tier.`);
  }
  const id = findSkill(cls, words.join(' '));
  if (!id) return warn(s, `No ability called ${words.join(' ')} to master as ${ARCHETYPES[cls].name}. mastery [<class>] <skill> [1|2|3]`);
  const p = progressOf(s, cls, id), name = skillName(id, cls);
  if (tier == null) return emit(s, 'info', `${name}: ${masteryLine(s, cls, id)}. Its effect plays at tier ${p.pick}.`);
  if (tier > p.tier) return warn(s, `${name} reaches tier ${tier} at ${p.at[tier]} uses (${p.uses} so far).`);
  const P = masteryOf(s).pick;
  P[cls] ||= {};
  if (tier === p.tier) delete P[cls][id]; // the highest you have: the default again, so it follows you up
  else P[cls][id] = tier;
  return emit(s, 'info', `${name}: its effect plays at tier ${tier}${tier === p.tier ? ' (your highest)' : ''}.`);
}
// developer mastery <skill|all> <uses>: set the class in use's count (dev only, as every developer command).
export function developerMastery(s, text, { emit, warn, classOf }) {
  const words = String(text).trim().split(/\s+/).slice(2), n = Number(words.pop()), cls = classOf(s);
  const ids = words.join(' ') === 'all' ? masteryList(cls) : [findSkill(cls, words.join(' '))].filter(Boolean);
  if (!ids.length || !(n >= 0)) return warn(s, 'developer mastery <skill|all> <uses>');
  const U = masteryOf(s).uses;
  U[cls] ||= {};
  for (const id of ids) U[cls][id] = Math.floor(n);
  return emit(s, 'info', `Developer: ${ids.length > 1 ? `${ids.length} abilities` : skillName(ids[0], cls)} at ${Math.floor(n)} uses.`);
}
