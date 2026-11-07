// Journals (docs/journals.md, GAME_RULES.md *Journals*): 51 entries by 13 writers, each a file in a vault on the floor
// its header names. Light: the engine loads it (netrooms.mjs takes one from a vault). No stats and no credits.
//
//   JOURNALS, WRITERS        the entries in date order (n: 1..51), and the writers in the doc's order
//   journalFor(s, loc)       the entry a traced server's vault holds now, or null (JOURNAL.share of servers, by seed)
//   findJournal(s, id, t)    records it (s.journals[id] = when) and queues its document card (s.journalCard)
//
// s.journals = { [entry id]: when found }, made on first use. s.journalCard: the entry whose card is up, or null.
import { emit } from './combat.mjs';
import { seeded } from './gear.mjs';
import RAW from './content/journals.mjs';

export const JOURNAL = { share: 0.5 }; // share of traced servers whose vault holds an entry, while its floor has one unfound
export const JOURNAL_KEY = 'journal:journals'; // the Ledger's entry (collection-log.mjs)
const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const dateText = (d) => { const [y, m, day] = d.split('-').map(Number); return `${day} ${MON[m - 1]} ${y}`; };
export const cyText = (cy) => (cy === 0 ? 'C0' : cy < 0 ? `C−${-cy}` : `C+${cy}`);
// A writer's medium (the sheet's type and header line): typed (Sabine), notes (moth, Dace), desk (Margit at Kessler).
const mediumOf = (e) => (e.writer === 'Sabine Roth' ? 'typed' : e.writer === 'moth' || e.writer === 'Dace' ? 'notes' : e.writer === 'Margit Sorensen' && e.role === 'Night-desk operator · Kessler Systems' ? 'desk' : 'plain');
const initials = (w) => w.split(' ').map((p) => p[0].toUpperCase()).join('').slice(0, 2);

export const JOURNALS = RAW.map((e) => ({ ...e, dateText: dateText(e.date), cyText: cyText(e.cy), medium: mediumOf(e), initials: initials(e.writer) }))
  .sort((a, b) => a.date.localeCompare(b.date) || a.writer.localeCompare(b.writer))
  .map((e, i) => ({ ...e, n: i + 1 }));
export const JOURNAL_BY = Object.fromEntries(JOURNALS.map((e) => [e.id, e]));
export const WRITERS = [...new Set(RAW.map((e) => e.writer))].map((name) => {
  const mine = JOURNALS.filter((e) => e.writer === name);
  return { name, initials: initials(name), role: mine[mine.length - 1].role, entries: mine.map((e) => e.id) };
});
// The sheet's header line, by medium.
export const headLine = (e) => (e.medium === 'typed' ? 'COURANT · CITY DESK · ROTH' : e.medium === 'notes' ? `~/notes/${e.date}.txt` : e.medium === 'desk' ? `KESSLER SYSTEMS · NIGHT DESK · ${e.date}` : '');

export const foundOf = (s) => s.journals || {};
export const journalCount = (s) => JOURNALS.filter((e) => foundOf(s)[e.id]).length;

// A traced server's vault: the earliest unfound entry of its floor, on JOURNAL.share of servers (by the server's seed,
// so the same server always answers the same).
export function journalFor(s, loc) {
  if (!loc || s.who) return null;
  if (seeded(((loc.seed || 1) * 2246822519 + 97) >>> 0 || 1)() >= JOURNAL.share) return null;
  const floor = loc.depth || 1, got = foundOf(s);
  return JOURNALS.find((e) => e.floor === floor && !got[e.id]) || null;
}
export function findJournal(s, id, t = Date.now()) {
  const e = JOURNAL_BY[id];
  if (!e || s.who) return false;
  const got = (s.journals ||= {});
  if (got[id]) return false;
  got[id] = t;
  s.journalCard = id;
  emit(s, 'journal', `Journal: ${e.writer}, ${e.dateText}.`, { journal: id, go: 'log:' + JOURNAL_KEY });
  return true;
}
