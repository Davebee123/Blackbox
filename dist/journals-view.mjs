// Journals on the screen (journals.mjs is the model, docs/journals.md the picked look): the Ledger's Journals entry (the
// timeline, the writers, the reading view) and the document card over the map on a first find. The sheet is the
// same in both: one muted header line and the writer's type (Sabine typed, moth and Dace notes, Margit's night desk in
// amber mono). Amber is found, ivory the Cascade. Nothing moves.
import { esc } from './view.mjs';
import { glyph } from './glyphs.mjs';
import { FLOORS } from './data.mjs';
import { JOURNALS, JOURNAL_BY, WRITERS, foundOf, journalCount, headLine, cyText } from './journals.mjs';

const UNKNOWN = '???';
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const day = (t) => (t > 1 ? `${MON[new Date(t).getMonth()]} ${new Date(t).getDate()}` : '');
const ital = (t) => esc(t).replace(/\*([^*]+)\*/g, '<i>$1</i>');
const floorName = (n) => `${n} ${FLOORS[n - 1]?.name || ''}`.trim();
const CY = [-13, 30], AXIS = [-13, -5, 10, 20, 30];

// The tooltip of a slot (a chip, a writer's line).
export function slotTip(s, e) {
  const t = foundOf(s)[e.id];
  return t ? `${e.writer}, ${e.dateText}: Journal entry, ${e.cyText}. Found on ${floorName(e.floor)}${day(t) ? `, ${day(t)}` : ''}.` : `${UNKNOWN}: Journal entry, ${e.cyText}.\n▸ Open vaults on ${FLOORS[e.floor - 1]?.name}.`;
}
// The sheet: its header line (by medium) and the text.
export const sheetMarkup = (e) => `<div class="jr-sheet m-${e.medium}">${headLine(e) ? `<p class="jr-medium">${esc(headLine(e))}</p>` : ''}${e.text.map((p) => `<p>${ital(p)}</p>`).join('')}</div>`;
const byline = (e) => `<p class="jr-by"><span>${ital(e.role)}</span><span>${esc(e.dateText)} · ${esc(e.cyText)}</span></p>`;

// The timeline: a column a C-year, the entries stacked in date order, the Cascade through C0.
function timeline(s, ui) {
  const got = foundOf(s), cols = [];
  for (let cy = CY[0]; cy <= CY[1]; cy++) {
    const chips = JOURNALS.filter((e) => e.cy === cy).map((e) => {
      const found = !!got[e.id], fade = ui.writer && e.writer !== ui.writer, lit = ui.read === e.id;
      const cls = `jr-chip${found ? ' got' : ''}${fade ? ' fade' : ''}${lit ? ' lit' : ''}`;
      return found ? `<button type="button" class="${cls}" data-jr-read="${esc(e.id)}" title="${esc(slotTip(s, e))}" aria-label="${esc(`${e.writer}, ${e.dateText}`)}">${esc(WRITERS.find((w) => w.name === e.writer).initials)}</button>` : `<i class="${cls}" title="${esc(slotTip(s, e))}">?</i>`;
    }).join('');
    // An axis label: the year over the C-year (C−13 is 2049, C+30 2091; before C0 the year is 2062+cy, after 2061+cy).
    const ax = AXIS.includes(cy) ? `<small class="jr-ax"><b>${2062 + cy - (cy < 0 ? 0 : 1)}</b>${esc(cyText(cy))}</small>` : '';
    cols.push(`<div class="jr-col${cy === 0 ? ' c0' : ''}">${cy === 0 ? '<span class="jr-cascade" title="The Cascade: 02:14, 10 November 2061. The clearing house stops.">CASCADE 02:14 · 10 NOV 2061</span>' : ''}<div class="jr-stack">${chips}</div>${ax}</div>`);
  }
  return `<div class="jr-tl" role="group" aria-label="Timeline">${cols.join('')}</div>`;
}
function writers(s, ui) {
  const got = foundOf(s);
  const rows = WRITERS.map((w) => {
    const mine = w.entries.map((id) => JOURNAL_BY[id]), n = mine.filter((e) => got[e.id]).length, known = n > 0, open = ui.writer === w.name;
    const pips = mine.map((e) => `<i class="jr-pip${got[e.id] ? ' got' : ''}"></i>`).join('');
    const next = mine.find((e) => !got[e.id]);
    const tip = known ? `${w.name}: Writer. ${w.role.replace(/\*/g, '')}. ${n} of ${mine.length} entries found.` : `${UNKNOWN}: Writer. 0 of ${mine.length} entries found.${next ? `\n▸ Open vaults on ${FLOORS[next.floor - 1]?.name}.` : ''}`;
    const lines = open ? `<ul class="jr-lines">${mine.map((e) => {
      const t = got[e.id], inner = `<b${t ? '' : ' class="unk"'}>${esc(t ? e.dateText : UNKNOWN)}</b><small>${esc(e.cyText)} · ${esc(floorName(e.floor))}</small><time>${esc(day(t))}</time>`;
      return `<li>${t ? `<button type="button" class="jr-line got" data-jr-read="${esc(e.id)}" title="${esc(slotTip(s, e))}">${inner}</button>` : `<span class="jr-line" title="${esc(slotTip(s, e))}">${inner}</span>`}</li>`;
    }).join('')}</ul>` : '';
    return `<li class="jr-wr${open ? ' open' : ''}"><button type="button" class="jr-row${known ? ' known' : ''}" data-jr-writer="${esc(w.name)}" aria-expanded="${open}" title="${esc(tip)}"><span class="lg-ico" aria-hidden="true">${glyph('letter')}</span><b class="${known ? '' : 'unk'}">${esc(known ? w.name : UNKNOWN)}</b><small class="jr-role">${known ? ital(w.role) : ''}</small><span class="jr-pips">${pips}</span><small class="lg-n${n === mine.length ? ' full' : ''}">${n}/${mine.length}</small></button>${lines}</li>`;
  }).join('');
  const k = WRITERS.filter((w) => w.entries.some((id) => got[id])).length;
  return `<section class="cx-sec"><h3 class="cx-kick">Writers<small class="lg-n">${k}/${WRITERS.length}</small></h3><ul class="jr-writers">${rows}</ul></section>`;
}

function reading(s, ui) {
  const e = JOURNAL_BY[ui.read], got = foundOf(s);
  const mine = WRITERS.find((w) => w.name === e.writer).entries.filter((id) => got[id]), i = mine.indexOf(e.id);
  const prev = mine[i - 1], next = mine[i + 1];
  return `<section class="jr-read" aria-label="${esc(`${e.writer}, ${e.dateText}`)}">
    <nav class="jr-nav"><button type="button" class="btn small" data-jr-back>‹ Writers</button><span class="jr-step"><button type="button" class="btn small" ${prev ? `data-jr-read="${esc(prev)}"` : 'disabled'} aria-label="Earlier entry">‹</button><small class="lg-n">${i + 1}/${mine.length}</small><button type="button" class="btn small" ${next ? `data-jr-read="${esc(next)}"` : 'disabled'} aria-label="Later entry">›</button></span></nav>
    <header class="jr-head"><h2>${esc(e.writer)}</h2>${byline(e)}</header>
    ${sheetMarkup(e)}
    <p class="jr-found">Found on ${esc(floorName(e.floor))}${day(got[e.id]) ? ` · ${esc(day(got[e.id]))}` : ''}</p></section>`;
}

// The Ledger's Journals entry under its head. ui: { writer: the writer open, read: the entry being read }.
export function journalLedgerMarkup(s, ui = {}) {
  const read = ui.read && foundOf(s)[ui.read] ? ui.read : null, u = { writer: read ? JOURNAL_BY[read].writer : ui.writer || null, read };
  return `<section class="cx-sec jr-time"><h3 class="cx-kick">Timeline</h3>${timeline(s, u)}</section>${read ? reading(s, u) : writers(s, u)}`;
}

// The document card over the map, the first time an entry is taken from a vault (s.journalCard).
export function journalCardMarkup(s) {
  const e = JOURNAL_BY[s.journalCard];
  if (!e) return '';
  return `<section class="pz-card jr-card" id="jr-card" role="dialog" aria-label="${esc(`Journal: ${e.writer}`)}">
    <header class="pz-head"><p class="pz-kick">Journal · <span class="pz-at">${journalCount(s)}/${JOURNALS.length}</span></p><h1>${esc(e.writer)}</h1>${byline(e)}</header>
    ${sheetMarkup(e)}
    <div class="jr-acts"><button type="button" class="btn primary" data-jr-done>Continue <kbd>Enter</kbd></button><button type="button" class="btn" data-jr-ledger>Ledger ›</button></div></section>`;
}
