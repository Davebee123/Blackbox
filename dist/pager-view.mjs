// The three trial pagers on the top bar, and the Comms inbox they share (pager.mjs sorts the pages; app.js wires the
// clicks; pager.css draws them). The classic pager (index.html #pager, view.mjs commsMarkup) stays the default.
//   A · action  a lamp, the number of pages, a small screen with the most urgent one, and its one-tap button
//   B · device  a beeper: a two-line screen (the page and its clock, the page count and what the act key does) and two
//               keys, next and act, beside the lines they belong to
//   C · tray    a lamp and one small icon per page (red for a threat): tap an icon to act on it
// Everything that explains is a tooltip in WoW grammar (pager.mjs tipOf). No new colours: amber for what you act on,
// red for a threat, the classic pager's LCD green for the screens.
import { glyph } from './glyphs.mjs';
import { EVENT_ICON } from './event-cards.mjs';
import { pages, news, actOf, lampOf, shortOf, clockOf, tipOf, classOf } from './pager.mjs';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ago = (ms) => (ms < 60000 ? `${Math.max(0, Math.round(ms / 1000))}s` : ms < 3600000 ? `${Math.floor(ms / 60000)}m` : `${Math.floor(ms / 3600000)}h`);
const threat = (c) => classOf(c) === 'threat';

// A page's icon: the event's card icon, the wall for a threat at home, a lock for a lockdown, the pay for a ready
// contract, the contract for an offer, an envelope for a letter.
export function glyphOf(c) {
  if (c.card && EVENT_ICON[c.card]) return glyph(EVENT_ICON[c.card]);
  if (threat(c)) return glyph(c.label === 'Lockdown' ? 'lock' : c.label === 'Swarm' ? 'raid' : c.from === 'Consortium' ? 'relay' : 'firewall');
  if (c.kind === 'ready') return glyph('credits');
  if (c.kind === 'offer') return glyph('contract');
  if (c.kind === 'mail') return glyph(/^map/.test(c.go || '') ? 'trace' : 'letter');
  if (c.kind === 'thread') return glyph(c.label === 'Appears' ? 'trace' : 'memory');
  return glyph(c.label === 'Invite' ? 'relay' : c.label === 'Infested' ? 'spider' : 'trace');
}
const led = (l) => `<span class="led${l.on ? ' on' : ''}${l.blink ? ' blink' : ''}${l.threat ? ' alert' : ''}"></span>`;
const openTip = (s) => { const n = news(s).length; return n ? `Comms: ${n} line${n > 1 ? 's' : ''} of news.` : 'Comms'; };

// A · action: [lamp count | screen: icon, name] [act]. The screen never scrolls: a long name ends in …, all of it on hover.
export function actionMarkup(s) {
  const p = pages(s), top = p[0], l = lampOf(s), a = top && actOf(s, top);
  const face = `<button type="button" class="pg-face" data-pg-open aria-label="Pager: open comms" title="${esc(top ? tipOf(s, top) : openTip(s))}">${led(l)}<span class="pg-n">${l.n || ''}</span><span class="pg-lcd${top ? '' : ' idle'}">${top ? `${glyphOf(top)}<span class="pg-what">${esc(shortOf(s, top))}</span>` : ''}</span></button>`;
  return face + (a ? `<button type="button" class="pg-act${threat(top) ? ' threat' : ''}" data-pact="${top.id}" title="${esc(tipOf(s, top))}">${esc(a.label)}</button>` : '');
}

// B · device: the case, the lamp, two lines and two keys. Line 1 is the page and its place in the stack (by the next
// key); line 2 its clock and sender, and what the act key does (by the act key). Idle, the screen shows the time.
export function deviceMarkup(s, cursor = null, now = Date.now()) {
  const p = pages(s), i = Math.max(0, p.findIndex((c) => c.id === cursor)), c = p[i], l = lampOf(s), a = c && actOf(s, c);
  const d = new Date(now), clock = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const lines = c
    ? `<span class="l1"><b>${esc(shortOf(s, c))}</b><i>${i + 1}/${p.length}</i></span><span class="l2"><span>${esc(clockOf(s, c, now))}<span class="frm"> · ${esc(c.from)}</span></span><i>${esc(a?.label || '')}</i></span>`
    : `<span class="l1"><b>${clock}</b><i></i></span><span class="l2"><span></span><i></i></span>`;
  return `<span class="pgb-case${c && threat(c) ? ' threat' : ''}">${led(l)}<button type="button" class="pgb-lcd${c ? '' : ' idle'}" data-pg-open aria-label="Pager: open comms" title="${esc(c ? tipOf(s, c) : openTip(s))}">${lines}</button><span class="pgb-keys"><button type="button" class="pgb-key next" data-pg-next ${p.length > 1 ? '' : 'disabled'} title="Next page" aria-label="Next page"></button><button type="button" class="pgb-key act${c && threat(c) ? ' threat' : ''}" ${a ? `data-pact="${c.id}" title="${esc(a.label)}" aria-label="${esc(a.label)}"` : 'disabled aria-label="Act"'}></button></span></span>`;
}

// C · tray: the lamp (Comms), then one icon per page, most urgent first, up to max (the last slot says +n when more wait).
export function trayMarkup(s, max = 4) {
  const p = pages(s), l = lampOf(s), shown = p.length > max ? p.slice(0, max - 1) : p, more = p.length - shown.length;
  const tile = (c) => { const a = actOf(s, c); return `<button type="button" class="pgc-tile${threat(c) ? ' threat' : ''}${c.seen ? '' : ' new'}" ${a ? `data-pact="${c.id}"` : 'data-pg-open'} title="${esc(tipOf(s, c))}" aria-label="${esc(`${shortOf(s, c)}${a ? `: ${a.label}` : ''}`)}">${glyphOf(c)}</button>`; };
  return `<button type="button" class="pgc-lamp" data-pg-open aria-label="Pager: open comms" title="${esc(openTip(s))}">${led(l)}</button>${shown.map(tile).join('')}${more ? `<button type="button" class="pgc-more" data-pg-open title="${more} more page${more > 1 ? 's' : ''}">+${more}</button>` : ''}`;
}

// Comms for the trial pagers: the pages first, each with its button; the news folded under them.
export function inboxMarkup(s, now = Date.now()) {
  const p = pages(s), h = news(s);
  const row = (c) => {
    const a = actOf(s, c), t = threat(c);
    return `<li class="pgi${t ? ' threat' : ''}${c.seen ? '' : ' unseen'}"><span class="pgi-ico">${glyphOf(c)}</span><span class="pgi-main" title="${esc(tipOf(s, c))}"><b>${esc(shortOf(s, c))}</b><small>${esc(c.label)} · ${esc(c.from)} · ${esc(clockOf(s, c, now))}</small></span>${a ? `<button type="button" class="btn small ${t ? 'hot' : 'primary'} pgi-act" data-pact="${c.id}">${esc(a.label)}</button>` : ''}</li>`;
  };
  const old = (c) => `<li class="pgh${c.done ? ' done' : ''}" title="${esc(`${c.label}: ${c.text}`)}"><span class="pgh-k">${esc(c.label)}</span><span class="pgh-t">${esc(c.text)}</span><span class="pgh-age">${ago(now - c.t)}</span></li>`;
  return `<div class="comms-head"><span>Comms</span><span class="p-acts">${h.some((c) => c.seen) ? '<button type="button" class="act dim" data-comms-clear title="Clear the news you have seen">Clear</button>' : ''}<button type="button" class="act" data-comms-close>Close</button></span></div>
    <div class="pg-scroll" data-keep="pg-scroll"><ul class="comms-list pg-inbox">${p.map(row).join('') || '<li class="quiet">Quiet.</li>'}</ul>${h.length ? `<details class="pg-hist"><summary>News <b>${h.length}</b></summary><ul class="comms-list">${h.map(old).join('')}</ul></details>` : ''}</div>`;
}
