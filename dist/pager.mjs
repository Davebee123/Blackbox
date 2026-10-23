// The pager's pages: which of its lines ask something of you, what one tap does about each, and in what order.
// comms.mjs keeps the lines (world events in, entries out); this sorts them. A *page* is a line you can act on (a
// threat at your wall, a courier to intercept, a contract to deliver, a letter, an offer); *news* is a line that only
// tells you something (pay, standing, a restock, a find). Pure: the save in, pages and acts out. The three trial
// pagers (pager-view.mjs: action, device, tray) draw from it; the classic pager (view.mjs commsMarkup) doesn't.
import { active, emit, warn } from './combat.mjs';
import { STRAINS } from './data.mjs';
import { commsOf, live } from './comms.mjs';
import { MAIL, ready, heldCount, jobs, offers, offer, initMail, systemLetter, title } from './mail.mjs';
import { deal, CARDS } from './events.mjs';

// The pager styles. classic is today's (the scrolling line and the filtered list); the other three are the trial
// directions the designer picks from. ?pager=a|b|c (or the names) on the URL, or the pager setting (pager <style>).
export const PAGER_STYLES = ['classic', 'action', 'device', 'tray'];
const ALIAS = { a: 'action', b: 'device', c: 'tray', classic: 'classic', action: 'action', device: 'device', tray: 'tray' };
export const styleName = (v) => ALIAS[String(v || '').toLowerCase()] || null;
export const pagerStyle = (s, param = null) => styleName(param) || styleName(s.settings?.pager) || 'classic';
export const STYLE_LABEL = { classic: 'classic', action: 'A · action', device: 'B · device', tray: 'C · tray' };

// A fight starts from a world event's card; what the tap says depends on the card.
const FIGHT_VERB = { courier: 'Intercept', lantern: 'Intercept', bounty: 'Hunt', returning: 'Hunt', hunt: 'Hunt', choir: 'Engage', spotter: 'Engage', counter: 'Engage', zero: 'Engage', feud: 'Fight' };
// Threats: red, first in line. Everything at your wall, a swarm on a hub or an outpost, a lockdown, a consortium alarm.
const isThreat = (c) => c.kind === 'alert' || (c.label === 'Invasion' && c.from === 'Wall' && c.beep !== false);
// Lines with something to do about them. The rest is news.
export function classOf(c) {
  if (isThreat(c)) return 'threat';
  if (c.kind === 'offer' || c.kind === 'ready' || c.kind === 'mail') return 'page';
  if (c.kind === 'thread') return c.label === 'Appears' || c.label === 'Done' || c.ref == null ? 'page' : 'news'; // found, a temporary server up, the end; a step on is news
  if (c.card) return c.card === 'outbreak' ? 'news' : 'page'; // the director's events (an outbreak only changes what kills give)
  if (c.label === 'Invite' || c.label === 'Infested') return 'page';
  return 'news';
}
export const isPage = (c) => classOf(c) !== 'news';

const busy = (s) => active(s) || !!s.run;
const openLabel = (go) => (/^mail:l/.test(go) || go === 'mail' ? 'Read' : /^map/.test(go) ? 'Show' : go === 'jack' ? 'Jack in' : 'Open');
const open = (c) => (c.go ? { label: openLabel(c.go), go: c.go } : null);
const eventOf = (s, c) => (c.event != null ? (s.events || []).find((e) => e.id === c.event) : null);

// What one tap on a page does: { label, cmd } (a command, run as typed) or { label, go } (where it is: app.js goTo).
// null for news, and for a page with nowhere to go. Mid-fight or on a run, anything that would start a fight shows
// you where it is instead.
export function actOf(s, c) {
  if (!c || !isPage(c)) return null;
  const free = !busy(s);
  if (isThreat(c)) {
    const inv = s.invasion;
    if (c.go === 'jack' || (c.label === 'Invasion' && c.from === 'Wall')) {
      if (!inv) return open(c);
      if (!free) return { label: 'Show', go: 'map:invader' };
      if (inv.state === 'travel') return inv.kind === 'thief' ? { label: 'Intercept', cmd: 'intercept' } : { label: 'Show', go: 'map:invader' };
      return { label: 'Jack in', cmd: 'jack in' };
    }
    const hub = c.from === 'Hub' && c.label === 'Swarm' && /^hub:(\w+)/.exec(c.go || '')?.[1];
    if (hub && free) return { label: 'Defend', cmd: `hub defend ${hub}` };
    if (c.from === 'Consortium' && c.go === 'map:roamer' && free) return { label: 'Intercept', cmd: 'consortium intercept' };
    return open(c);
  }
  if (c.kind === 'ready') {
    const j = jobs(s).find((x) => x.id === c.ref);
    return j && ready(s, j) ? { label: 'Deliver', cmd: `mail deliver ${j.id}` } : open(c);
  }
  if (c.kind === 'offer') return c.ref != null && heldCount(s) < MAIL.take && offers(s).some((o) => o.id === c.ref) ? { label: 'Take', cmd: `mail accept ${c.ref}` } : open(c);
  if (c.card) {
    const ev = eventOf(s, c);
    if (ev && CARDS[ev.card]?.fight && free) {
      if (ev.card === 'feud' && !ev.side) return { label: 'Pick a side', go: c.go || 'map' };
      return { label: FIGHT_VERB[ev.card] || 'Engage', cmd: `event fight ${ev.id}` };
    }
    if (ev?.card === 'shock' && ev.hub) return { label: ev.mult > 1 ? 'Sell' : 'Buy', go: `hub:${ev.hub}:market` };
    if (ev?.card === 'darknet') return { label: 'Buy', go: c.go || 'map' };
    return open(c);
  }
  return open(c);
}

// In hand: the fight you're in is this page (the courier you intercepted, the invader you jacked in on).
function inHand(s, c) {
  if (!active(s)) return false;
  const e = s.encounter;
  if (c.event != null && e.event === c.event) return true;
  return isThreat(c) && (c.go === 'jack' || (c.label === 'Invasion' && c.from === 'Wall')) && !!s.invasion && e.invader === s.invasion.id;
}
// Still waiting on you: not handled, not in hand, still true, and (a letter) not read in Mail already.
function waiting(s, c) {
  if (c.done || inHand(s, c) || !live(s, c)) return false; // done, in your hands, or no longer true (the prune catches up)
  const l = /^mail:l(\d+)$/.exec(c.go || '');
  if (l) return (s.mail?.list || []).some((m) => m.id === Number(l[1]) && !m.read);
  return true;
}
// How soon it matters: threats, then a world event against its clock, then pay waiting (a ready contract), then the
// rest, a letter, an offer.
export function rankOf(c) {
  if (isThreat(c)) return 0;
  if (c.card) return 1;
  if (c.kind === 'ready') return 2;
  if (c.kind === 'mail') return 4;
  if (c.kind === 'offer') return 5;
  return 3;
}
const leftOf = (s, c) => eventOf(s, c)?.left ?? Infinity;
// The pages, most urgent first.
// One invasion at your wall is one page, however many lines it sent (it set out, it's contested, it broke through):
// the newest says where it is now.
const atHome = (c) => isThreat(c) && (c.go === 'jack' || (c.label === 'Invasion' && c.from === 'Wall'));
export function pages(s) {
  let home = false;
  return commsOf(s).filter((c) => isPage(c) && waiting(s, c))
    .sort((a, b) => rankOf(a) - rankOf(b) || (rankOf(a) === 1 ? leftOf(s, a) - leftOf(s, b) : 0) || b.t - a.t || b.id - a.id)
    .filter((c) => !atHome(c) || (!home && (home = true)));
}
// The news: what happened, newest first (the history under the pages).
export const news = (s) => { const p = new Set(pages(s)); return commsOf(s).filter((c) => !p.has(c)); };
// Clear (the trial pagers' Comms): the news you've seen goes; pages stay until they're done or no longer true.
export function clearNews(s) { const p = new Set(pages(s)); s.comms = commsOf(s).filter((c) => p.has(c) || !c.seen); }
// The lamp: off (nothing to do), lit (pages waiting, all seen), blinking (one you haven't seen), red (a threat).
export function lampOf(s) {
  const p = pages(s);
  if (!p.length) return { on: false, blink: false, threat: false, n: 0 };
  return { on: true, blink: p.some((c) => !c.seen), threat: p.some(isThreat), n: p.length };
}
// A page's short name for a small screen: the event's runner, the contract, the sender, the invader.
export function shortOf(s, c) {
  const ev = eventOf(s, c);
  if (ev?.name) return ev.name;
  if (c.kind === 'ready') { const j = jobs(s).find((x) => x.id === c.ref); if (j) return title(s, j); }
  if (c.kind === 'offer') { const o = offers(s).find((x) => x.id === c.ref); if (o?.subject) return o.subject; }
  if (c.label === 'Invasion' && c.from === 'Wall' && s.invasion?.name) return s.invasion.name;
  if (c.kind === 'mail') return c.text.replace(/\.$/, '');
  return c.text.replace(/[.:].*$/, '') || c.label;
}
// Its clock, when it has one: minutes left on an event, else how long ago it came in.
export function clockOf(s, c, now = Date.now()) {
  const ev = eventOf(s, c);
  if (ev?.left != null) return `${Math.max(1, Math.ceil(ev.left / 60000))}m`;
  const ms = now - c.t;
  return ms < 60000 ? 'now' : ms < 3600000 ? `${Math.floor(ms / 60000)}m ago` : `${Math.floor(ms / 3600000)}h ago`;
}
// The tooltip, WoW grammar: the label as the title, the line, the tap on its own ▸ line.
export function tipOf(s, c) {
  const a = actOf(s, c);
  return `${c.label}: ${c.text}${a ? `\n▸ ${a.label}` : ''}`;
}

// ---------- developer pager fill|clear ----------
// fill: a realistic mix, as real as the game can make it on the spot. A letter, an offer on the board, a contract
// ready to deliver (a real one in Mail), up to two of the director's events (a courier, a bounty: on the map, with
// their clocks), and the news a session brings (the retainer, a restock, standing, a hot strain, a blocked invasion,
// a transfer). developer invade puts a threat on top. clear: an empty pager.
export function developerPager(s, what = 'fill') {
  if (what === 'clear') { s.comms = []; return emit(s, 'info', 'Developer: the pager is empty.'); }
  if (what !== 'fill') return warn(s, 'developer pager fill|clear');
  initMail(s);
  const told = [
    () => emit(s, 'retainer', 'Halcyon retainer: +38 credits.', { credits: 38 }),
    () => emit(s, 'store', 'New stock at the Halcyon store.'),
    () => emit(s, 'standing-up', 'Contract delivered: Halcyon standing +5 (42, Associate).', { standing: 42 }),
    () => { const k = Object.keys(STRAINS)[0]; emit(s, 'hot-strain', `${STRAINS[k].name} is running hot. Its kills give 50% more XP and lead for 4 hours.`, { strain: k }); },
    () => emit(s, 'invasion-cleared', 'Your wall stopped lapsejack-2231 at the gate.', { blocked: true, quiet: true }),
    () => emit(s, 'transfer-in', '3 Cipher arrived at your server from the Kestrel market.'),
  ];
  const page = [
    () => { const l = systemLetter(s, { from: 'wick', subject: 'a name on the list', body: ['saw your handle on a list. not a good list. keep your wall up.'] }); if (l) emit(s, 'mail', `New mail from ${l.from}: ${l.subject}.`, { letter: l.id, from: l.from, subject: l.subject }); },
    () => { const o = offer(s); if (o) emit(s, 'board', `New offer on the board: ${o.subject}.`, { offer: o.id }); },
    () => { // a contract ready to deliver: an offer taken and done (a kill job, its kills in)
      const o = offer(s);
      if (!o) return;
      s.mail.offers.splice(s.mail.offers.indexOf(o), 1);
      delete o.expiresAt;
      Object.assign(o, { type: 'kill', family: 'worm', count: 3, got: 3, where: null });
      s.mail.jobs.push(o);
      emit(s, 'contract-ready', `Contract ready: ${title(s, o)}. Deliver it from Mail.`, { contract: o.id });
    },
    () => deal(s, 'courier') || deal(s),
    () => deal(s, 'bounty') || deal(s),
  ];
  // Interleaved as a session brings them, news last: the line the classic pager scrolls is often news.
  for (let i = 0; i < Math.max(told.length, page.length); i++) { page[i]?.(); told[i]?.(); }
}
