// Receipts (docs/receipts.md). Every traced server's vault holds one: the frozen trade its Resident orphaned. At the
// takeover its card shows the receipt and five stamps, one a faction; a stamp pays +RECEIPT.rep with that faction (the
// usual ripples) and one receipt toward its piece (RECEIPT.perPart make a part, beside the parts feuds give). Later
// keeps it in your files, to hand in at your commission's hub. No credits on any stamp.
//
// s.receipts: { kept: [receipt], fresh: id of the one whose card is up (any stamp), tally: { f: toward the next part },
// closed: { f: stamped in all } }.
import { FACTIONS, changeRep, commissionOf, hubOf } from './factions.mjs';
import { gainPart, PIECES } from './faction-gear.mjs';
import { emit, warn } from './combat.mjs';
import { seeded } from './gear.mjs';
import { floorOfLoc } from './places.mjs';

export const RECEIPT = { rep: 10, perPart: 3 };
// Each faction's stamp: its verb and what happens to the trade (lore.md 3).
export const STAMPS = {
  halcyon: { verb: 'File', done: 'Filed', what: 'It becomes a claim; Halcyon pays and keeps the account.' },
  kestrel: { verb: 'Seal', done: 'Sealed', what: 'Walled off with the floor it froze on.' },
  glassjaw: { verb: 'Sell', done: 'Sold', what: 'Sold on to the highest bidder.' },
  lantern: { verb: 'Settle', done: 'Settled', what: 'Closed the way it was meant to close.' },
  nullchoir: { verb: 'Roll back', done: 'Rolled back', what: 'Both sides get their money back, decades late.' },
};
export const STAMP_ORDER = ['halcyon', 'kestrel', 'glassjaw', 'lantern', 'nullchoir'];
// Who's on the net (lore.md 8.1), and the year each floor mounted (lore.md 1): a floor's orphans date from its mount to
// the next layer's (floor 8's, to the Cascade).
const INSTITUTIONS = ['Brandt & Vey', 'Annick Life', 'Pellucid Payroll', 'Corvid Exchange', 'Harrow Street Credit Union', 'City Treasury Office', 'Tenements Board', 'Kessler Systems'];
const MOUNTED = [null, 2086, 2080, 2075, 2071, 2067, 2064, 2062, 2041];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const CASCADE = 2061;

// The receipt a server's vault holds: fixed by its seed (it doesn't move the game's dice).
export function receiptOf(loc) {
  const r = seeded(((loc.seed || 1) * 97 + 13) >>> 0), floor = floorOfLoc(loc) || 1;
  const from = MOUNTED[floor] ?? 2086, to = floor === 8 ? CASCADE : MOUNTED[floor - 1] ?? 2091;
  const year = from + Math.floor(r() * Math.max(1, to - from)), day = 1 + Math.floor(r() * 28), month = Math.floor(r() * 12);
  const a = Math.floor(r() * INSTITUTIONS.length), b = (a + 1 + Math.floor(r() * (INSTITUTIONS.length - 1))) % INSTITUTIONS.length;
  const sum = Math.round((1000 + r() * 89000) / 100) * 100, n = String(Math.floor(r() * 1e7)).padStart(7, '0');
  const c = year - CASCADE;
  return { id: `TRD-${String(year).slice(2)}-${n}`, loc: loc.id, server: loc.name, payer: INSTITUTIONS[a], payee: INSTITUTIONS[b], sum,
    date: `${day} ${MONTHS[month]} ${year}`, c: `C${c < 0 ? '−' : '+'}${Math.abs(c)}` };
}
export const receiptsOf = (s) => (s.receipts ||= { kept: [], fresh: null, tally: {}, closed: {} });
export const keptReceipts = (s) => receiptsOf(s).kept;
export const tallyOf = (s, f) => receiptsOf(s).tally[f] || 0;
export const sumText = (n) => `¤${n.toLocaleString('en-US')}`;
export const receiptLine = (x) => `${x.id} · ${x.payer} → ${x.payee} · ${sumText(x.sum)} · ${x.date} · ${x.c}`;

// The takeover (mail.mjs contractTakeover): the vault's receipt goes into your files, its card up. Returns it.
export function takeReceipt(s, loc) {
  const R = receiptsOf(s);
  if (!loc || loc.receipt) return null;
  const x = receiptOf(loc);
  loc.receipt = x.id;
  R.kept.push(x);
  R.fresh = x.id;
  return x;
}
// Stamp a receipt for a faction. The one whose card is up takes any stamp; a kept one is handed in at your commission's
// hub, for your commission.
export function stampReceipt(s, id, f) {
  const R = receiptsOf(s), x = R.kept.find((k) => k.id.toLowerCase() === String(id).toLowerCase()); // commands come in lower case
  if (!x) return warn(s, 'That receipt isn’t in your files.');
  if (!FACTIONS[f]) return warn(s, 'receipt <id> <faction>');
  if (R.fresh !== x.id) {
    if (f !== commissionOf(s)) return warn(s, `Hand kept receipts in at your commission’s hub (${FACTIONS[commissionOf(s)].short}).`);
    if (!hubOf(s, f)) return warn(s, `Find ${FACTIONS[f].short}’s hub first.`);
  }
  R.kept.splice(R.kept.indexOf(x), 1);
  if (R.fresh === x.id) R.fresh = null;
  R.closed[f] = (R.closed[f] || 0) + 1;
  emit(s, 'receipt', `${STAMPS[f].done}: ${x.id}. ${STAMPS[f].what}`, { faction: f, receipt: x.id });
  changeRep(s, f, RECEIPT.rep, `${STAMPS[f].done} for ${FACTIONS[f].short}`);
  const n = (R.tally[f] = (R.tally[f] || 0) + 1);
  if (n >= RECEIPT.perPart && PIECES[f]) { R.tally[f] = n - RECEIPT.perPart; gainPart(s, f); }
}
// Later: the card goes; the receipt stays in your files.
export function laterReceipt(s) { receiptsOf(s).fresh = null; }
// receipt <id> <faction> | receipt later
export function receiptCommand(s, text) {
  const [, a, b] = text.split(' ');
  if (a === 'later') return laterReceipt(s);
  return stampReceipt(s, a, b);
}
