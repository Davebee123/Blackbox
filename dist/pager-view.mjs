// The pager on the top bar (the tray) and Comms, its list. pager.mjs sorts the pages; app.js wires the clicks
// (pagerUi, pagerAct); pager.css draws them.
//   The tray: a lamp (it opens Comms), then one small icon per page, most urgent first, red for a threat, a soft glow
//   on a new one; the last slot says +n when more wait. Tap an icon to do the page's thing.
//   Comms: the pages, each with its button; the news folded under them.
// Everything that explains is a tooltip in WoW grammar (pager.mjs tipOf). No new colours: amber for what you act on,
// red for a threat.
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
// A follow-up (events.mjs chains): the chain mark, the event that caused it on hover.
const chainMk = (c) => (c.chain ? `<i class="cchain" title="${esc(c.chain)}" role="img" aria-label="${esc(c.chain)}">${glyph('chain')}</i>` : '');

// The tray: the lamp, then up to max slots (app.js: 4 on a desktop, 3 on a phone).
export function trayMarkup(s, max = 4) {
  const p = pages(s), l = lampOf(s), shown = p.length > max ? p.slice(0, max - 1) : p, more = p.length - shown.length;
  const tile = (c) => { const a = actOf(s, c); return `<button type="button" class="pg-tile${threat(c) ? ' threat' : ''}${c.seen ? '' : ' new'}" ${a ? `data-pact="${c.id}"` : 'data-pg-open'} title="${esc(tipOf(s, c))}" aria-label="${esc(`${shortOf(s, c)}${a ? `: ${a.label}` : ''}`)}">${glyphOf(c)}</button>`; };
  return `<button type="button" class="pg-lamp" data-pg-open aria-label="Pager: open comms" title="${esc(openTip(s))}">${led(l)}</button>${shown.map(tile).join('')}${more ? `<button type="button" class="pg-more" data-pg-open title="${more} more page${more > 1 ? 's' : ''}">+${more}</button>` : ''}`;
}

// Comms: the pages first, each with its button; the news folded under them (a click on a line opens where it happened).
export function inboxMarkup(s, now = Date.now()) {
  const p = pages(s), h = news(s);
  const row = (c) => {
    const a = actOf(s, c), t = threat(c);
    return `<li class="pgi${t ? ' threat' : ''}${c.seen ? '' : ' unseen'}"><span class="pgi-ico">${glyphOf(c)}</span><span class="pgi-main" title="${esc(tipOf(s, c))}"><b>${esc(shortOf(s, c))}${chainMk(c)}</b><small>${esc(c.label)} · ${esc(c.from)} · ${esc(clockOf(s, c, now))}</small></span>${a ? `<button type="button" class="btn small ${t ? 'hot' : 'primary'} pgi-act" data-pact="${c.id}">${esc(a.label)}</button>` : ''}</li>`;
  };
  const old = (c) => `<li class="pgh${c.done ? ' done' : ''}${c.go ? ' go' : ''}" title="${esc(`${c.label}: ${c.text}`)}"${c.go ? ` data-hgo="${esc(c.go)}" data-cid="${c.id}" role="button" tabindex="0"` : ''}><span class="pgh-k">${esc(c.label)}${chainMk(c)}</span><span class="pgh-t">${esc(c.text)}</span><span class="pgh-age">${ago(now - c.t)}</span></li>`;
  return `<div class="comms-head"><span>Comms</span><span class="p-acts">${h.some((c) => c.seen) ? '<button type="button" class="act dim" data-comms-clear title="Clear the news you have seen">Clear</button>' : ''}<button type="button" class="act" data-comms-close>Close</button></span></div>
    <div class="pg-scroll" data-keep="pg-scroll"><ul class="comms-list pg-inbox">${p.map(row).join('') || '<li class="quiet">Quiet.</li>'}</ul>${h.length ? `<details class="pg-hist"><summary>News <b>${h.length}</b></summary><ul class="comms-list">${h.map(old).join('')}</ul></details>` : ''}</div>`;
}
