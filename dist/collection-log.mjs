// The collection log (docs/variety-plan.md 3, GAME_RULES.md *Collection log*), built: every entry the Codex knows (a
// family, a strain, a guard, a boss), each floor, and the other sources, each with its slots in sections (Uniques, each
// set, Mastered, Beaten, Feats), the date each slot first came, and its n of N. Pure, but it reads the Codex
// (codex.mjs), so the engine never loads it: it hands syncCollection to the engine as a hook (combat.mjs hooks).
//
//   logOf(s)            the log: groups, each its entries, each its sections of slots, have and total
//   syncCollection(s)   syncSlots, then stamps the entries now full (full:<entry>), for the achievements
import { hooks, UNIQUES, hackerLevel, codexKey } from './combat.mjs';
import { BOSSES, STRAINS, FLOORS } from './data.mjs';
import { SLOTS, BASES } from './gear.mjs';
import { SETS, setOf, piecesOf } from './sets.mjs';
import { isNative } from './network.mjs';
import { entries, partsOf } from './codex.mjs';
import { syncSlots, homes, OTHER, BOSS_FEATS, floorFeat } from './collection.mjs';

export const LOG_GROUPS = [
  { id: 'family', name: 'Families' },
  { id: 'strain', name: 'Strains' },
  { id: 'guard', name: 'Guards & ICE' },
  { id: 'boss', name: 'Bosses' },
  { id: 'floor', name: 'Floors' },
  { id: 'other', name: 'Elsewhere' },
];
const slotName = (u) => SLOTS[BASES[u.base]?.slot]?.name || '';
const achGot = (s, id) => s.achievements?.got?.[id] || null;

export function logOf(s) {
  const got = s.collection || {}, E = new Map(), L = hackerLevel(s), reached = s.floors?.reached || 1;
  const add = (group, id, name, known, lv) => { const key = `${group}:${id}`; if (!E.has(key)) E.set(key, { key, group, id, name, known, lv, uniques: [], sets: new Map(), mastered: [], beaten: [], feats: [] }); return E.get(key); };
  for (const g of entries(s)) {
    if (g.id === 'mutation') continue;
    for (const r of g.rows) {
      const group = g.id === 'runner' ? 'family' : g.id, e = add(group, r.id, r.known ? r.name : null, r.known, group === 'boss' ? BOSSES[r.id].floor || null : STRAINS[r.id]?.level || 1);
      if (group === 'boss') {
        e.beaten.push({ key: 'w:' + r.id, kind: 'beaten', name: 'Beaten', rule: `Win a fight with ${BOSSES[r.id].name}.` });
        for (const a of [...(BOSS_FEATS[r.id] || []), ...(BOSSES[r.id].native ? ['c-' + r.id] : [])]) e.feats.push({ ach: a });
        continue;
      }
      for (const x of partsOf(s, g.id, r.id)) if (x.part) e.mastered.push({ key: 'm:' + codexKey(x.virus, x.part), kind: 'mastered', name: x.named ? x.part.name : null, level: x.from, n: x.research });
      if (group === 'strain') e.beaten.push({ key: 'b:' + r.id, kind: 'beaten', name: 'Beaten', rule: `Beat a ${STRAINS[r.id].name}.` });
    }
  }
  FLOORS.forEach((f, i) => { const e = add('floor', String(i + 1), f.name, reached >= i + 1, f.band[0]); for (const a of floorFeat(i + 1)) e.feats.push({ ach: a }); });
  for (const u of Object.values(UNIQUES)) {
    if (isNative(u.id)) continue; // a network's own (network.mjs): one network's, not the log's
    const set = setOf(u.id);
    for (const src of u.sources || []) for (const [key, where] of homes(src)) {
      const [group, id] = key.split(/:(.*)/);
      const e = E.get(key) || add(group, id, OTHER[id] || id, true, u.level);
      const slot = { key: u.id, kind: set ? 'set' : 'unique', name: u.name, level: u.level, slot: slotName(u), where, set: set?.id || null };
      if (set) { if (!e.sets.has(set.id)) e.sets.set(set.id, []); if (!e.sets.get(set.id).some((x) => x.key === u.id)) e.sets.get(set.id).push(slot); }
      else if (!e.uniques.some((x) => x.key === u.id)) e.uniques.push(slot);
    }
  }
  const out = [];
  for (const e of E.values()) {
    for (const id of e.sets.keys()) e.feats.push({ ach: (SETS[id]?.tier ? 'cl-set-' : 'k-set-') + id });
    const sections = [];
    if (e.uniques.length) sections.push({ kind: 'unique', slots: e.uniques.sort((a, b) => a.level - b.level) });
    for (const [id, slots] of e.sets) { const all = piecesOf(id); sections.push({ kind: 'set', set: id, name: setOf(all[0])?.name || id, have: all.filter((p) => got[p]).length, of: all.length, slots }); }
    if (e.mastered.length) sections.push({ kind: 'mastered', slots: e.mastered });
    if (e.beaten.length) sections.push({ kind: 'beaten', slots: e.beaten });
    const feats = [...new Set(e.feats.map((f) => f.ach))].map((a) => ({ key: 'ach:' + a, kind: 'feat', ach: a }));
    if (feats.length) sections.push({ kind: 'feat', slots: feats });
    const slots = sections.flatMap((x) => x.slots);
    for (const x of slots) { x.when = x.kind === 'feat' ? achGot(s, x.ach) : got[x.key] || null; x.got = !!x.when; }
    const have = slots.filter((x) => x.got).length;
    if (slots.length) out.push({ key: e.key, group: e.group, id: e.id, name: e.name, known: e.known, lv: e.lv, sections, have, total: slots.length, full: have === slots.length, below: e.lv <= L });
  }
  return LOG_GROUPS.map((g) => { const rows = out.filter((e) => e.group === g.id); return { ...g, rows, have: rows.reduce((a, e) => a + e.have, 0), total: rows.reduce((a, e) => a + e.total, 0) }; }).filter((g) => g.rows.length);
}
export const logTotals = (log) => ({ have: log.reduce((a, g) => a + g.have, 0), total: log.reduce((a, g) => a + g.total, 0) });


const sigs = new WeakMap(); // the log is rebuilt only when what fills it changed
export function syncCollection(s, now = hooks.now?.() ?? Date.now()) {
  const fresh = syncSlots(s, now);
  if (s.who) return fresh;
  const c = (s.collection ||= {}), sig = () => `${Object.keys(c).length}:${Object.keys(s.achievements?.got || {}).length}:${hackerLevel(s)}`;
  if (sigs.get(s) !== sig()) {
    for (const g of logOf(s)) for (const e of g.rows) if (e.full) c['full:' + e.key] ||= now;
    sigs.set(s, sig());
  }
  return fresh;
}
hooks.syncCollection = syncCollection; // profile.mjs tickProfile calls it once this module is loaded (the game, a test)
