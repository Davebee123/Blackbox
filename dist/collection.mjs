// The collection log (docs/variety-plan.md 3): everything you can collect, per entry (a family, a strain, a guard, a
// boss, a floor, or another source), what you have and what's left. Daemons have their own log, so it leaves them out.
// This module keeps the slots (light: the engine loads it); collection-log.mjs builds the log from the Codex, and
// collection-view.mjs draws it as the Codex's Collection tab.
//
//   syncSlots(s)          every second: stamps the slots the save now shows (a part mastered, a strain beaten, a boss
//                         won), with one pager line for them (collection-log.mjs syncCollection adds the full entries)
//   collectionRestore(s)  on load (combat.mjs restore): an older save's slots, stamped quietly, with one pager line
//   homeOfUnique, entryOfSlot, logGo   where a pager line opens the log
//
// s.collection = { [slot]: when } (when 1: before the log). A unique's slot is its id (combat.mjs keeps it on a find).
// The rest: m:<research key> a part mastered, b:<strain> a strain beaten, w:<boss> a boss won, full:<entry> an entry
// filled. Feats are achievements and keep their own date (s.achievements.got).
import { emit, hooks, UNIQUES } from './combat.mjs';
import { BOSSES, STRAINS, GUARDS, FLOORS, floorOfLayer } from './data.mjs';
import { RESEARCH } from './research.mjs';

// Where a floor's uniques come from, as its ledger line says it.
export const FLOOR_KIND = { vault: 'Vaults', rare: '★ Rare spawns', thread: 'Threads', lair: 'Lair boss' };
// The sources that are neither a virus nor a floor, each one entry under Elsewhere.
export const OTHER = { trophy: 'Strain trophies', sprawl: 'SPRAWL-00', rogue: 'Rogue servers', story: 'Storyline', contract: 'Contracts', invasion: 'Invasions', courier: 'Couriers', author: 'Authors', puzzle: 'Puzzle boards', farm: 'KESSLER-FARM-00', store: 'Halcyon store', feud: 'Feuds', takeover: 'Takeovers', crew: 'Crew bosses', raid: 'Crew bosses', vault: 'Vaults', rare: 'Rare spawns', thread: 'Threads', lair: 'Lair bosses' };
// An entry's feats: the achievements that are about it (a set's under each entry that drops a piece of it).
export const BOSS_FEATS = { relayking: ['c-relayking'], repoman: ['c-repoman'], choir: ['c-choir'] };
export const floorFeat = (n) => (n >= 2 ? ['x-floor-' + n] : []);

const floorsOf = (src) => (src.floor != null ? (Array.isArray(src.floor) ? Array.from({ length: src.floor[1] - src.floor[0] + 1 }, (_, i) => src.floor[0] + i) : [src.floor]) : src.layer ? [floorOfLayer(src.layer)] : []);
// The entries a unique's source puts it under: [entry key, its line's where].
export function homes(src) {
  if (src.kind === 'boss') return BOSSES[src.id] ? [['boss:' + src.id, '']] : [];
  if (src.kind === 'strain') return [[src.id ? 'strain:' + src.id : src.lineage ? 'family:' + src.lineage : 'other:trophy', '']]; // no id: any strain's trophy
  if (src.kind === 'guard') return [['guard:' + src.id, '']];
  if (FLOOR_KIND[src.kind]) { const fs = floorsOf(src); if (fs.length) return fs.map((f) => ['floor:' + f, FLOOR_KIND[src.kind]]); }
  return OTHER[src.kind] ? [['other:' + src.kind.replace('raid', 'crew'), '']] : [];
}
// Where a pager line opens the log (app.js goTo): on the entry, or the log's first page.
export const logGo = (key) => (key ? 'log:' + key : 'log');
// A unique's first entry: where its pager line opens the log.
export const homeOfUnique = (id) => (UNIQUES[id]?.sources || []).flatMap(homes)[0]?.[0] || null;

// A slot's entry: where a pager line about it opens the log.
export function entryOfSlot(k) {
  const [kind, id] = String(k).split(':');
  if (kind === 'm') return `${STRAINS[id] ? 'strain' : GUARDS[id] ? 'guard' : 'family'}:${id}`;
  if (kind === 'b') return 'strain:' + id;
  if (kind === 'w') return 'boss:' + id;
  return homeOfUnique(k);
}

// ---------- keeping it ----------
// The slots the save shows that the log hasn't stamped: [key, its pager words].
function owed(s) {
  const got = s.collection || {}, out = [];
  for (const [k, n] of Object.entries(s.research || {})) if (n >= RESEARCH.max && !got['m:' + k]) out.push(['m:' + k, 'a part mastered']);
  for (const [id, n] of Object.entries(s.dex?.kills || {})) if (n > 0 && STRAINS[id] && !got['b:' + id]) out.push(['b:' + id, `${STRAINS[id].name} beaten`]);
  for (const [id, n] of Object.entries(s.dex?.won || {})) if (n > 0 && BOSSES[id] && !got['w:' + id]) out.push(['w:' + id, `${BOSSES[id].name} beaten`]);
  return out;
}
// Every second (profile.mjs tickProfile, by way of collection-log.mjs syncCollection): the slots the save now shows,
// stamped now, with one pager line for all of them. Returns the new ones.
export function syncSlots(s, now = hooks.now?.() ?? Date.now()) {
  if (s.who) return [];
  const c = (s.collection ||= {}), fresh = owed(s);
  for (const [k] of fresh) c[k] = now;
  if (fresh.length) {
    const words = fresh.map(([, w]) => w), parts = words.filter((w) => w === 'a part mastered').length, rest = words.filter((w) => w !== 'a part mastered');
    const line = [...rest, ...(parts ? [parts > 1 ? `${parts} parts mastered` : 'a part mastered'] : [])].join(', ');
    emit(s, 'logged', `Collection: ${line[0].toUpperCase()}${line.slice(1)}.`, { slots: fresh.map(([k]) => k), go: logGo(entryOfSlot(fresh[0][0])) });
  }
  return fresh;
}
// An older save: the slots it has already filled, stamped as before the log (1), and one pager line. Safe to run twice:
// a slot already stamped is left as it is.
export function collectionRestore(s) {
  const c = (s.collection ||= {}), fresh = owed(s);
  for (const [k] of fresh) c[k] = 1;
  if (fresh.length) emit(s, 'logged', `Collection: ${fresh.length} from your record.`, { slots: [], record: fresh.length, go: 'log' });
}
