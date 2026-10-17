// Sets (docs/genome.md 9): uniques that add up. The sets are data (content/sets.mjs); a piece is a unique carrying
// `set: <id>` (content/items.mjs). Pure data and functions over a list of items, so the engine, the views and the tests
// all read the same counts. No imports from the engine: combat.mjs reads this.
//   SETS, setOf(uniqueId)         the sets, and the set a unique belongs to
//   activeSets(items)             the sets you wear (your loaded protocols, in slot order): pieces worn, the bonuses
//                                 open, and the one 4-piece rule (the set that reached four first keeps its bonus)
//   setFx(items)                  the active bonuses' effect blocks, as the fight engine's effect list takes them
//   setCard(id, have)             one set as a tooltip or a Collection row reads it: its pieces (worn, held, missing,
//                                 never found) and its bonus lines, each open or not
//   SET_LOOT, setPool             a guard's own set pieces and their odds (combat.mjs guardSet: BOSS_LOOT's pattern)
import SET_TEXT from './content/sets.mjs';
import ITEMS from './content/items.mjs';

export const SETS = Object.fromEntries((SET_TEXT.sets || []).map((x) => [x.id, x]));
const UNIQ = Object.fromEntries((ITEMS.uniques || []).map((u) => [u.id, u]));
// A piece is a unique carrying set: <id>, listed in its set's pieces (sets.test.mjs keeps the two in step). Read from
// the sets' lists, so a set added at run time (a test's) counts the same way.
const setIdOf = (uniqueId) => { for (const [id, set] of Object.entries(SETS)) if ((set.pieces || []).includes(uniqueId)) return id; return null; };
export const setOf = (uniqueId) => SETS[setIdOf(uniqueId)] || null;
export const isPiece = (uniqueId) => !!setIdOf(uniqueId);
const allPieces = () => Object.values(SETS).flatMap((set) => set.pieces || []);
export const piecesOf = (id) => (SETS[id]?.pieces || []).filter((p) => UNIQ[p]);
// The piece counts a set's bonuses open at (2, 3 and 4 pieces).
export const BONUS_AT = [2, 3, 4];
export const bonusesOf = (id) => BONUS_AT.filter((n) => SETS[id]?.bonuses?.[n]).map((n) => ({ at: n, ...SETS[id].bonuses[n] }));

// A guard's set pieces (a source { kind: 'guard', id, layer }): BOSS_LOOT's pattern at a guard's pace. Guards die often,
// so the chance a kill is low and its pity slow: chance + pity for every kill of that guard without one, while you lack a
// piece it drops (pieces you lack first); once you've found them all, a flat `found` a kill and no pity, so a piece at
// a higher level still turns up now and then without breaking the one-unique-an-hour rule (lootsim.mjs checks it).
export const SET_LOOT = { chance: 0.04, pity: 0.02, found: 0.01 };
export const setPool = (guard) => allPieces().map((id) => UNIQ[id]).filter((u) => u && (u.sources || []).some((x) => x.kind === 'guard' && x.id === guard));
export const setPityKey = (guard) => 'set:' + guard;

// When an item went on (combat.mjs load stamps it.on); an item from before save v45 counts as on since 0, in slot order.
const stampOf = (it, i) => [Number(it?.on) || 0, i];
const earlier = (a, b) => a[0] - b[0] || a[1] - b[1];
// The sets in a loadout (items: your loaded protocols, in slot order). Each distinct piece counts once.
// [{ id, name, n, total, worn: [ids], open: [2, 3], held4: bool, blocked: { at: 4, by: setName } | null }]
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
// The active bonuses' effect blocks: { fx, id, name, set, at } each, the shape combat.mjs uniqueFx lists.
export function setFx(items = []) {
  const out = [];
  for (const r of activeSets(items)) for (const at of r.open) for (const [i, fx] of (SETS[r.id].bonuses[at].fx || []).entries()) out.push({ fx: { text: SETS[r.id].bonuses[at].text, ...fx }, id: `set:${r.id}:${at}:${i}`, name: `${r.name} (${at})`, set: r.id, at });
  return out;
}
// One set for a tooltip or the Collection. have: { worn: [unique ids loaded], held: Set of ids in your stash, found: Set of
// ids you've ever found (the Collection) }, and the active rows (activeSets) for the 4-piece rule.
// pieces: [{ id, name (null until found), slot base, state: 'worn' | 'held' | 'missing' | 'unknown' }]
// bonuses: [{ at, text, on, blocked (the other set holding the 4-piece bonus) }]
export function setCard(id, { worn = [], held = new Set(), found = new Set(), active = null } = {}) {
  const set = SETS[id];
  if (!set) return null;
  const row = (active || []).find((r) => r.id === id);
  const n = row ? row.n : piecesOf(id).filter((p) => worn.includes(p)).length;
  const pieces = piecesOf(id).map((p) => {
    const state = worn.includes(p) ? 'worn' : held.has(p) ? 'held' : found.has(p) ? 'missing' : 'unknown';
    return { id: p, name: state === 'unknown' ? null : UNIQ[p].name, base: UNIQ[p].base, level: UNIQ[p].level, state };
  });
  const bonuses = bonusesOf(id).map((b) => ({ at: b.at, text: b.text, on: row ? row.open.includes(b.at) : n >= b.at, blocked: row?.blocked?.at === b.at ? row.blocked.by : null }));
  return { id, name: set.name, n, total: pieces.length, pieces, bonuses };
}

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
