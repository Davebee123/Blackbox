// The ping log (Starsector's message log): world events as short lines, newest at the bottom, the older fading. On the
// Map page it sits in the map's left rail under Contracts; elsewhere above the prompt (app.js). comms.mjs keeps the
// lines and pager.mjs sorts them (what is a page, what a click does, the tooltip); this picks which show and draws
// them. Pure: the save in, markup out.
//   A plain line pings once and fades after PINGS.fadeMs. A page that asks something of you stays until it's dealt
//   with: a threat, a contract to turn in, an unread letter, an invite. The rail's timer cards (a courier, a bounty)
//   stay the place to act on an event, so its line only pings.
import { glyph } from './glyphs.mjs';
import { EVENT_ICON } from './event-cards.mjs';
import { commsOf } from './comms.mjs';
import { pages, classOf, actOf, tipOf, kindOf, shortOf } from './pager.mjs';

export const PINGS = { max: 5, fadeMs: 30000, steps: [1, 0.8, 0.55, 0.35] }; // steps: opacity, newest first

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const threat = (c) => classOf(c) === 'threat';
// The kinds of line that stay while they wait on you. Everything else pings once.
export const sticks = (c) => threat(c) || c.kind === 'ready' || c.kind === 'mail' || c.label === 'Invite';

// The lines showing at now, oldest first (newest at the bottom): the pages that stay (the most urgent if more than
// max), then the newest plain lines that fit. A handled line goes at once.
export function pingsOf(s, now = Date.now(), { only } = {}) {
  const stay = pages(s).filter(sticks).filter((c) => !only || only(c)).slice(0, PINGS.max);
  const plain = commsOf(s).filter((c) => !sticks(c) && !c.done && now - c.t < PINGS.fadeMs && (!only || only(c)));
  return [...stay, ...plain.slice(0, PINGS.max - stay.length)].sort((a, b) => a.t - b.t || a.id - b.id);
}

// A line's icon: the event's card icon, the wall for a threat at home, a lock for a lockdown, the pay for a ready
// contract, the contract for an offer, an envelope for a letter.
export function glyphOf(c) {
  if (c.card && EVENT_ICON[c.card]) return glyph(EVENT_ICON[c.card]);
  if (threat(c)) return glyph(c.label === 'Lockdown' ? 'lock' : c.label === 'Swarm' ? 'raid' : c.from === 'Consortium' ? 'relay' : 'firewall');
  if (c.kind === 'ready') return glyph('credits');
  if (c.kind === 'offer') return glyph('contract');
  if (c.kind === 'mail') return glyph(/^map/.test(c.go || '') ? 'trace' : 'letter');
  if (c.kind === 'thread') return glyph(c.label === 'Appears' ? 'trace' : 'memory');
  if (c.kind === 'paid') return glyph('credits');
  return glyph(c.label === 'Invite' ? 'relay' : c.label === 'Infested' ? 'spider' : 'trace');
}

// Names in a line: a server (VANTA-SINK-36), a runner in capitals (REPO MAN, HOLLOW CHOIR), a handle (cinder-2704), each
// with its version (v2).
const NAME = /\b[A-Z][A-Z0-9]+(?:[- ][A-Z0-9]+)*(?: v\d+)?\b|\b[a-z]+-\d{3,}(?: v\d+)?\b/g;
const SERVER = /\b[A-Z]+(?:-[A-Z0-9]+)+\b/;
const marks = (t) => t.replace(NAME, (m) => `<b>${m}</b>`).replace(/\b([Yy]our (?:wall|server|outpost|(?:[A-Z]\w* )?hub))\b/g, '<span class="you">$1</span>');
const first = (t) => { const m = /^.*?[.!?](?=\s|$)/.exec(t); return (m ? m[0] : t).trim(); };
const sentence = (t) => { const x = t.trim(); return x ? x[0].toUpperCase() + x.slice(1) + (/[.!?]$/.test(x) ? '' : '.') : ''; };

// The line: one short sentence, names in bold (amber, red on a threat), yours teal. Escaped first, so names come back
// as plain text.
export function lineOf(s, c) {
  const b = (t) => `<b>${esc(t)}</b>`;
  if (c.kind === 'mail' && c.label === 'Mail') return `Letter from ${b(String(c.from).split(' · ')[0])}.`;
  if (c.kind === 'ready') return `Contract ready: ${b(shortOf(s, c))}.`;
  if (c.kind === 'offer') return `Offer on the board: ${b(shortOf(s, c))}.`;
  if (c.label === 'Invasion' && c.from === 'Wall' && /^Invasion: /.test(c.text)) return marks(esc(first(c.text.replace(/ \(level \d+\)/, ''))));
  // A director's event: its runner and where, from the event itself (its message is a paragraph).
  const ev = c.card && (s.events || []).find((e) => e.id === c.event);
  const at = ev && (s.locations?.find((l) => l.id === ev.loc)?.name || SERVER.exec(c.text.replace(ev.name || '', ''))?.[0]);
  if (ev?.name && at) {
    if (c.card === 'courier' || c.card === 'lantern') return `${b(c.from)} courier passing through ${b(at)}.`;
    if (c.card === 'bounty' || c.card === 'returning') return `Bounty on ${b(ev.name)}, loose on ${b(at)}.`;
    if (c.card === 'choir') return `${b(ev.name)} singing through ${b(at)}.`;
    if (c.card === 'hunt') return `Hunt: ${b(ev.name)}, on ${b(at)}.`;
  }
  const sold = c.card === 'darknet' && /lists (.+?),/.exec(c.text);
  if (sold) return `Darknet broker lists ${b(sold[1])}.`;
  const said = first(c.text);
  return marks(esc(sentence(/^[a-z]/i.test(said) ? said : `${c.label}: ${said}`))); // "+38 credits." says whose it is
}

// The log: a frameless list, oldest at the top. Each line is a button (a click does what the pager's icon did: app.js
// pingAct) with its tooltip in WoW grammar (pager.mjs tipOf and kindOf). data-t: when it came in (app.js starts its
// fade from there); a line that stays has none.
export function pingsMarkup(s, now = Date.now(), opts = {}) {
  const list = pingsOf(s, now, opts);
  if (!list.length) return '';
  const n = list.length;
  const row = (c, i) => {
    const stay = sticks(c), t = threat(c), act = actOf(s, c) || (c.go ? { go: c.go } : null), step = PINGS.steps[Math.min(n - 1 - i, PINGS.steps.length - 1)];
    return `<li class="ping${t ? ' threat' : ''}${stay ? ' stays' : ''}${c.seen ? '' : ' unseen'}" style="--o:${step}"${stay ? '' : ` data-t="${c.t}"`}><button type="button" class="pi-in" data-ping="${c.id}" title="${esc(tipOf(s, c))}" data-tt-kind="${esc(kindOf(c))}"${act ? '' : ' aria-disabled="true"'}><span class="pi-ico">${glyphOf(c)}</span><span class="pi-t">${lineOf(s, c)}</span></button></li>`;
  };
  return `<ol class="pings" aria-label="Pings">${list.map(row).join('')}</ol>`;
}
