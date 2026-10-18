// Event cards (events.mjs): each event's own small panel, on a server's map card, your server's card (the net-wide
// ones and your wall's), a hub's card (a market shock) and the Network card (a darknet listing). One shell for all: a
// kicker strip (the card's icon and name, its level, a ring of the time left), a body, a footer. Shown, not told: the
// card's sentence is the strip's tooltip and every number's detail its own; nothing on the card is a sentence. The
// main action is part of the design: a faction's half of a feud, a target tile, a price tile. Real buttons throughout.
// Motion (style.css .evc): a pulse where a feud's bar meets, on a hunt's quarry and a courier's packet. Each is locked
// to the wall clock (--ph), so a redraw doesn't restart it; Motion off or reduced motion keeps the still look.
import { glyph } from './glyphs.mjs';
import { glyphMarkup } from './protocol-glyphs.mjs';
import { FACTIONS as FX } from './factions.mjs';
import { FAMILIES, CONFIG } from './data.mjs';
import { UNIQUES, hackerLevel, active, materialsOf } from './combat.mjs';
import { CARDS, HUNT, huntPay, hopLeft, feudShare, feudPay, feudGood, eventText, courierPay, bountyPay, FEUD } from './events.mjs';
import { SCOUTED, KINDS as INV_KINDS } from './invasion.mjs';
import { WARES } from './market.mjs';
import { codeOf } from './gear.mjs';
import { esc, levelTag, partPips } from './view.mjs';
import { pieceState, pieceOf } from './faction-gear.mjs';

// Each card's icon (the strip, the threat list, the pager), and a family's: its code's glyph.
export const EVENT_ICON = { courier: 'upload', bounty: 'bounty', choir: 'echo', outbreak: 'spider', leak: 'cracker', darknet: 'item', feud: 'mirror', hunt: 'kill', shock: 'sync', spotter: 'watchman' };
export const FAM_GLYPH = { ransomware: 'cipher', worm: 'worm', ghostroot: 'kernel' };
const WARE_GLYPH = { cipher: 'cipher', worm: 'worm', kernel: 'kernel', salvage: 'salvage', exploit: 'exploit' };
const mins = (ms) => Math.max(1, Math.ceil(ms / 60000));
const busyOf = (s) => (active(s) || s.run ? 'Finish what you are doing first' : '');
const placeOf = (s, id) => (s.locations || []).find((l) => l.id === id);
const fmark = (f) => `<span class="evc-fm" style="--fc:${FX[f].color}">${glyph('f-' + f)}</span>`;
// A reward: an icon and a number, its detail on hover.
const rw = (icon, n, tip, cls = '') => `<span class="evc-rw${cls ? ' ' + cls : ''}" title="${esc(tip)}">${icon}${n != null ? `<b>${n}</b>` : ''}</span>`;
const credits = (n) => rw(glyph('credits'), n, `${n} credits`);
const repOf = (f, n) => rw(fmark(f), `+${n}`, `${FX[f].short} +${n} rep`);
// A unique as a protocol glyph (protocol-glyphs.mjs), gold and flickering like any unique.
const uniqueGlyph = (id, size = 'sm') => glyphMarkup({ name: UNIQUES[id].name, rarity: 'zeroday', unique: true, stats: { ...UNIQUES[id].primary } }, size);
// Time left as a ring that drains; the minutes are its tooltip.
function ring(left, total, tip) {
  const r = 6.5, c = 2 * Math.PI * r, f = Math.max(0, Math.min(1, left / Math.max(1, total)));
  return `<span class="evc-ring${f < 0.25 ? ' low' : ''}" title="${esc(tip)}" role="img" aria-label="${esc(tip)}"><svg viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="${r}" class="bg"/><circle cx="9" cy="9" r="${r}" class="fg" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 9 9)"/></svg></span>`;
}
// The shell. sub: what sits in the strip after the name (a level, a mark); left/total: the ring (none for a card with no clock).
function shell(s, ev, { body, foot = '', sub = '', left = ev.left, total = CARDS[ev.card].ms, tip = `${mins(left)} min left`, cls = '', name = CARDS[ev.card].name } = {}) {
  return `<section class="evc evc-${ev.card}${cls ? ' ' + cls : ''}" style="--ph:-${Date.now() % 2400}ms" aria-label="${esc(name)}"><header class="evc-head" title="${esc(eventText(s, ev))}">${glyph(EVENT_ICON[ev.card])}<b>${esc(name)}</b><span class="evc-sub">${sub}</span>${left != null ? ring(left, total, tip) : ''}</header><div class="evc-body">${body}</div>${foot ? `<footer class="evc-foot">${foot}</footer>` : ''}</section>`;
}
// A target tile: the virus as a framed portrait, its name and level, what it pays. The tile is the button.
function target(s, ev, { face, name = ev.name, tags = '', pay = '', tip, cls = '', cmd = `event fight ${ev.id}` }) {
  const busy = busyOf(s);
  return `<button type="button" class="evc-target${cls ? ' ' + cls : ''}" data-command="${cmd}" ${busy ? `disabled title="${busy}"` : `title="${esc(tip)}"`}><span class="evc-face">${face}</span><span class="evc-who"><b>${esc(name)}</b><span class="evc-tags">${levelTag(s, ev.level, `lv ${ev.level}`)}${tags}</span></span><span class="evc-pay">${pay}</span></button>`;
}

// ---------- the cards ----------
// Feud: two factions face off across a stacked bar in their colours. Each half is that side's button: its mark, its share,
// the runner you'd fight for it, what it pays under it. Your side lit once chosen (the other locked); a pulse where they meet,
// an arrow the way it last moved.
function feud(s, ev) {
  const busy = busyOf(s), [a, b] = ev.sides, mine = ev.side, pa = feudShare(ev, a) * 100;
  const half = (f, i) => {
    const o = ev.sides[1 - i], pct = Math.round(feudShare(ev, f) * 100), on = mine === f, off = !!mine && !on;
    const tip = off ? `You fight for ${FX[mine].short} in this feud.` : busy || `${on ? 'Fight' : `Side with ${FX[f].short} and fight`} ${ev.runners[o]}, level ${ev.level}. ${CARDS.feud.reward(ev, f)}.`;
    return `<button type="button" class="fd-half fd-${i ? 'b' : 'a'}${on ? ' on' : ''}${off ? ' off' : ''}" style="--fc:${FX[f].color}" data-command="event fight ${ev.id} ${f}" aria-pressed="${on}" ${busy || off ? 'disabled' : ''} title="${esc(tip)}"><span class="fd-mark">${glyph('f-' + f)}</span><span class="fd-name">${esc(FX[f].short)}</span><b class="fd-pct">${pct}<small>%</small></b><span class="fd-foe">${glyph(off ? 'lock' : 'kill')}<span>${esc(ev.runners[o])}</span></span>${on ? `<span class="fd-you" title="Your side${ev.wins ? `: ${ev.wins} runner${ev.wins > 1 ? 's' : ''} beaten` : ''}">${'<i></i>'.repeat(ev.wins || 0)}</span>` : ''}</button>`;
  };
  const lead = pa > 50 ? a : pa < 50 ? b : null, gain = ev.trend > 0 ? a : ev.trend < 0 ? b : null;
  const barTip = `${FX[a].short} ${Math.round(pa)}%, ${FX[b].short} ${100 - Math.round(pa)}%.${gain ? ` ${FX[gain].short} is gaining.` : ''}`;
  const bar = `<div class="fd-bar${lead ? ' lead-' + (lead === a ? 'a' : 'b') : ''}" style="--ca:${FX[a].color};--cb:${FX[b].color};--p:${pa.toFixed(1)}%" role="img" aria-label="${esc(barTip)}" title="${esc(barTip)}"><i class="fd-seg sa"></i><i class="fd-seg sb"></i><i class="fd-mid"></i><i class="fd-edge${ev.trend > 0 ? ' up' : ev.trend < 0 ? ' down' : ''}"></i></div>`;
  const good = (f) => feudGood(f) === 'crate' ? rw(glyph('crate'), null, 'A sealed item: a Tuned item at your level', 'r-tuned') : rw(glyph('firewall'), null, 'A bootleg filter at your level, Stock or better');
  // A win's protocol carries its side's mark (gear.mjs IMPLICITS); the feud's part fills the next of its piece's pips (faction-gear.mjs).
  const drop = (f) => `<span class="evc-rw fd-drop" style="--fc:${FX[f].color}" title="${esc(`A protocol at your level with ${FX[f].short}'s mark`)}">${glyph('item')}</span>`;
  const part = (f) => { const st = pieceState(s, f); return st ? `<span class="evc-rw fd-part" style="--fc:${FX[f].color}" title="${esc(`A part of ${st.name}: ${Math.min(st.parts + 1, st.need)} of ${st.need}`)}">${glyph('part')}${partPips(st, 'sm', true)}</span>` : ''; };
  const pays = (f, i) => `<div class="fd-rw fd-${i ? 'b' : 'a'}${mine && mine !== f ? ' off' : ''}">${credits(feudPay(ev.level))}${repOf(f, FEUD.rep)}${drop(f)}<span class="fd-won" title="${esc(`Win the feud: a part of ${pieceOf(f)?.name || 'its piece'}, ${feudGood(f) === 'crate' ? 'a sealed item' : 'a bootleg filter'} and ${FX[f].short} +${FEUD.bonusRep}`)}">${glyph('takeover')}${part(f)}${good(f)}${repOf(f, FEUD.bonusRep)}</span></div>`;
  return shell(s, ev, { sub: levelTag(s, ev.level, `lv ${ev.level}`), cls: mine ? 'chosen' : '', body: `<div class="fd-arena">${half(a, 0)}${half(b, 1)}<i class="fd-vs" aria-hidden="true">vs</i>${bar}${pays(a, 0)}${pays(b, 1)}</div>` });
}
// Bounty hunt: its route as a strip of server dots (the quarry on the one it's on, the next dashed), each with its pay
// rung and level; the quarry's tile; the ring counts to its next hop.
function hunt(s, ev) {
  const L = hackerLevel(s), base = ev.base ?? ev.level - (ev.hop || 0);
  const stops = ev.path.map((id, i) => {
    const st = i < ev.hop ? 'past' : i === ev.hop ? 'here' : i === ev.hop + 1 ? 'next' : 'later', lv = Math.min(CONFIG.maxMobLevel, base + i, L + HUNT.cap);
    return `<li class="hn-stop ${st}" title="${esc(`${placeOf(s, id)?.name || 'A server'}: level ${lv}, pay ×${HUNT.mult[i]}`)}"><i class="hn-dot">${i === ev.hop ? glyph('kill') : ''}</i><b>×${HUNT.mult[i]}</b><small>lv ${lv}</small></li>`;
  }).join('');
  const last = ev.hop >= HUNT.hops, here = placeOf(s, ev.loc)?.name || '';
  return shell(s, ev, {
    sub: fmark(ev.hunter), left: hopLeft(ev), total: HUNT.hopMs, tip: `${last ? 'Leaves' : 'Hops'} in ${mins(hopLeft(ev))} min`,
    body: `<ol class="hn-route" style="--n:${ev.path.length}">${stops}</ol>${target(s, ev, { face: glyph(FAM_GLYPH[ev.family] || 'kill'), tags: `<small class="evc-at">${esc(here)}</small>`, pay: `${credits(huntPay(ev))}${repOf(ev.hunter, HUNT.rep)}`, tip: `Fight ${ev.name}, level ${ev.level}. ${CARDS.hunt.reward(ev)}.` })}`,
  });
}
// Bounty: a wanted poster. The family's glyph framed, the name, level, the pay.
function bounty(s, ev) {
  return shell(s, ev, { body: target(s, ev, { cls: 'poster', face: glyph(FAM_GLYPH[ev.family] || 'bounty'), tags: ev.boss ? '<span class="tag hot">boss</span>' : '<span class="tag">elite</span>', pay: `${credits(bountyPay(ev.level))}${repOf('halcyon', 2)}`, tip: `Fight ${ev.name}. ${CARDS.bounty.reward(ev)}.` }) });
}
// Hollow Choir: a boss in a frame. Its pay: double a bounty's credits and a Custom protocol.
function choir(s, ev) {
  return shell(s, ev, { body: target(s, ev, { cls: 'boss', face: glyph('echo'), tags: '<span class="tag hot">boss</span>', pay: `${credits(bountyPay(ev.level) * 2)}${rw(glyph('protocol'), null, 'A protocol, Custom or better', 'r-custom')}`, tip: `Fight the HOLLOW CHOIR. ${CARDS.choir.reward(ev)}.` }) });
}
// Courier: a packet crossing a line through your server, as far along as its time is gone; its cargo on it.
function courier(s, ev) {
  const gone = 1 - ev.left / CARDS.courier.ms, cargo = ev.unique ? uniqueGlyph(ev.unique) : glyph('protocol');
  const pay = `${credits(courierPay(ev.level))}${ev.unique ? rw(glyph('item'), null, UNIQUES[ev.unique].name, 'r-zeroday') : rw(glyph('protocol'), null, 'A protocol, Tuned or Custom', 'r-tuned')}`;
  return shell(s, ev, {
    body: `<div class="cr-line" style="--at:${(gone * 100).toFixed(1)}%" title="${esc(`It leaves in ${mins(ev.left)} min`)}"><i class="cr-track"></i><i class="cr-srv">${glyph('integrity')}</i><span class="cr-pkt">${glyph('upload')}</span></div>${target(s, ev, { cls: ev.unique ? 'courier unique' : 'courier', face: cargo, tags: ev.unique ? `<span class="iname r-zeroday">${esc(UNIQUES[ev.unique].name)}</span>` : '', pay, tip: `Intercept ${ev.name}. ${CARDS.courier.reward(ev)}.` })}`,
  });
}
// Spotter: the spotter on your wall as its tile; the next invasion a silhouette, −2 levels once it's down.
function spotter(s, ev) {
  return shell(s, ev, { body: `<div class="spt-row">${target(s, ev, { face: glyph('watchman'), tip: `Fight ${ev.name}. Win and the next invasion comes ${SCOUTED.levels} levels weaker, its kind and server known.` })}${nextTile(s, null)}</div>` });
}
// The next invasion: a silhouette (?) until a spotter's down, then its kind and server, −2 levels.
function nextTile(s, sc) {
  const from = sc && placeOf(s, sc.from);
  return `<span class="spt-next${sc ? ' known' : ''}" title="${esc(sc ? `The next invasion: ${from ? `a ${INV_KINDS[sc.kind].name.toLowerCase()} from ${from.name}, ` : ''}${sc.levels} levels weaker` : `The next invasion. Kill the spotter to see its kind, and it comes ${SCOUTED.levels} levels weaker`)}">${glyph('firewall')}<b class="spt-sil">${sc && from ? esc(INV_KINDS[sc.kind].name) : '?'}</b><small>−${sc?.levels ?? SCOUTED.levels} lv</small>${from ? `<small class="spt-from">${esc(from.name)}</small>` : ''}</span>`;
}
// Market shock: a big ▲×2.5 or ▼×0.4 with the ware, the hub's mark and a price spark. The tile opens that market.
function shock(s, ev) {
  const up = ev.mult > 1, spark = up ? '0,13 7,12 14,13 21,12 28,13 33,12 36,3 46,3' : '0,4 7,5 14,4 21,5 28,4 33,5 36,13 46,13';
  const tip = `${up ? 'Sell' : 'Buy'} ${WARES[ev.ware].name} at ${FX[ev.hub].short}: ×${ev.mult} the usual price. Open the market.`;
  return shell(s, ev, {
    sub: fmark(ev.hub), cls: up ? 'up' : 'down',
    body: `<button type="button" class="sh-tile" data-go="hub:${ev.hub}:market" title="${esc(tip)}"><span class="sh-ware">${glyph(WARE_GLYPH[ev.ware] || 'credits')}</span><b class="sh-mult">${up ? '▲' : '▼'}×${ev.mult}</b><svg class="sh-spark" viewBox="0 0 46 16" aria-hidden="true"><polyline points="${spark}"/></svg><span class="sh-name">${esc(WARES[ev.ware].name)}</span><span class="sh-act">${up ? 'Sell' : 'Buy'}</span></button>`,
  });
}
// Outbreak: the family's code glyph, ×2.
function outbreak(s, ev) {
  const code = codeOf(ev.family);
  return shell(s, ev, { body: `<div class="ob-tile" title="${esc(`${FAMILIES[ev.family].name} kills drop double code`)}"><span class="ob-glyph">${glyph(FAM_GLYPH[ev.family] || 'spider')}</span><b class="ob-mult">×2</b><span class="ob-name"><b>${esc(FAMILIES[ev.family].name)}</b><small>${esc(WARES[code]?.name || 'code')}</small></span></div>` });
}
// Darknet listing: the unique's glyph and name, its home network, and its price as a tile you buy with.
export function darknetCard(s, ev) {
  const m = materialsOf(s), can = s.server.credits >= ev.credits && (m.exploit || 0) >= ev.exploits && !active(s);
  const price = `<button type="button" class="dk-price" data-command="event buy ${ev.id}" ${can ? '' : 'disabled'} title="${esc(can ? `Buy ${UNIQUES[ev.unique].name} for ${ev.credits} credits and ${ev.exploits} Exploits` : `It costs ${ev.credits} credits and ${ev.exploits} Exploits. You have ${s.server.credits} and ${m.exploit || 0}.`)}"><span>${glyph('credits')}<b>${ev.credits}</b></span><span>${glyph('exploit')}<b>${ev.exploits}</b></span><small>Buy</small></button>`;
  return shell(s, ev, { body: `<div class="dk-row"><span class="dk-glyph">${uniqueGlyph(ev.unique)}</span><span class="dk-who"><b class="iname r-zeroday">${esc(UNIQUES[ev.unique].name)}</b><small>${glyph('signal')}${esc(ev.net)}</small></span>${price}</div>` });
}
// Leak (no clock: it's at once): the vault key as a tile on its server's card, until the vault's open.
export function leakCard(s, l) {
  return `<section class="evc evc-leak" aria-label="Leak"><header class="evc-head" title="${esc(`Someone leaked the vault key of ${l.name}. Its vault opens without the password.`)}">${glyph(EVENT_ICON.leak)}<b>Leak</b><span class="evc-sub"></span></header><div class="evc-body"><div class="lk-tile" title="The vault's password: it opens without a fight for it"><span class="lk-key">${glyph('cracker')}</span><code>${esc(l.password)}</code><span class="lk-vault">${glyph('unlock')}<small>open</small></span></div></div></section>`;
}
// Your server's card after a spotter's down: the next invasion, known.
export function toldCard(s) {
  const sc = s.net?.scouted;
  return sc ? `<section class="evc evc-told" aria-label="Next invasion"><header class="evc-head" title="${esc(`You killed its spotter. The next invasion comes ${sc.levels} levels weaker.`)}">${glyph('firewall')}<b>Next invasion</b><span class="evc-sub"></span></header><div class="evc-body">${nextTile(s, sc)}</div></section>` : '';
}

const BUILD = { feud, hunt, bounty, choir, courier, spotter, shock, outbreak, darknet: darknetCard };
// An event's card, or '' for one with none (a leak is shown on its server: leakCard).
export const eventCard = (s, ev) => BUILD[ev.card]?.(s, ev) || '';
