// Quest sites on the screen (sites.mjs, docs/sites.md). The map's *Temporary frame* (picked): a thread's hexagon with a
// ring of the time left. A rig in the threat's red with the lock in it, a red dashed aim at the server its run passes; a
// rack in the director's violet with the cold mark, a dashed link to the server it's mounted beside. Its card in the
// event cards' shell: what it is, its goal as the target, what it pays as icons. Its row on the threat rail. Nothing
// animates.
import { esc, levelTag } from './view.mjs';
import { glyph } from './glyphs.mjs';
import { findLocation } from './combat.mjs';
import { FAMILIES } from './data.mjs';
import { AUTHORS } from './authors.mjs';
import { FACTIONS } from './factions.mjs';
import { SITE, sitesOn, siteServers, siteLive } from './sites.mjs';

const inner = (g) => g.replace(/^<svg[^>]*>|<\/svg>$/g, '');
const cap = (t) => t[0].toUpperCase() + t.slice(1);
const mins = (ms) => Math.max(1, Math.ceil(ms / 60000));
// The rigs on this floor, as map nodes: placed beside the server they aim at.
export const siteNodes = (s, floor) => sitesOn(s, floor).map((l) => ({ id: l.id, kind: 'site', loc: l, x: l.site.at.x, y: l.site.at.y, target: l.site.target || null, host: l.site.host || null }));
const stateWord = (x) => ({ won: x.kind === 'rack' ? 'emptied' : 'settled', landed: 'landed', closed: 'pulled' })[x.state] || null;
const ICON = { rig: 'lock', rack: 'cold' };

export function siteNodeSvg(s, n, sel, label) {
  const l = n.loc, x = l.site, live = siteLive(l), f = live ? Math.max(0, Math.min(1, x.left / x.total)) : 0, r = 17, c = 2 * Math.PI * r;
  const ring = live ? `<circle r="${r}" class="sr-bg"/><circle r="${r}" class="sr-fg" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90)"/>` : '';
  const who = x.kind === 'rack' ? 'a Kestrel rack' : `${AUTHORS[x.crew].name}'s rig`;
  return `<g class="mnode site site-${x.kind}${live ? ' f-target' : ' done'}${sel}" data-select="${esc(l.id)}" tabindex="0" role="button" transform="translate(${n.x} ${n.y})" aria-label="${esc(`${l.name}, ${who}`)}"><circle r="18" class="mhit"/><path class="sframe" d="M0 -12 L11 -5 L11 6 L0 12 L-11 6 L-11 -5 Z"/><g class="sico" transform="translate(-6 -6) scale(.75)">${inner(glyph(ICON[x.kind] || 'lock'))}</g>${ring}${label(n, 14, l.name, stateWord(x) || `${mins(x.left)} min`, !live ? 'dim' : x.kind === 'rack' ? 'site' : 'hot')}</g>`;
}

// The run's sentence: the strip's tooltip.
const runText = (s, l) => { const x = l.site, t = findLocation(s, x.target); return `${AUTHORS[x.crew].name} is locking ${x.inst}'s settlement run as it passes ${t?.name || 'a server'}. Break the lock in the rig's Core before the run settles, and its ${x.trades} trades close.`; };

export function siteCard(s, l, opts = {}) {
  return l.site.kind === 'rack' ? rackCard(s, l, opts) : rigCard(s, l, opts);
}
// The parts every site's card shares: its rooms, the ring of time left, a reward chip, its button.
function parts(s, l, { here = false, busy = false, relock = 0, btn = () => '' } = {}) {
  const x = l.site, live = siteLive(l), R = l.floorplan;
  const rooms = R ? Object.values(R.graph.rooms).filter((r) => !r.nook && !r.optional) : [], done = rooms.filter((r) => R.cleared[r.id]).length;
  const r = 6.5, c = 2 * Math.PI * r, f = live ? Math.max(0, x.left / x.total) : 0;
  const ring = live ? `<span class="evc-ring${f < 0.25 ? ' low' : ''}" title="${esc(`${mins(x.left)} min left`)}"><svg viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="${r}" class="bg"/><circle cx="9" cy="9" r="${r}" class="fg" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 9 9)"/></svg></span>` : '';
  const act = !live ? '' : here ? btn('net', 'Back to the run', true) : `<button type="button" class="btn primary" data-command="connect ${esc(l.id)}" ${busy ? 'disabled title="Finish what you are doing first"' : relock ? 'disabled title="Still tracing your last connection"' : ''}>${relock ? `Connect · ${relock}s` : 'Connect'}</button>`;
  return { x, live, R, rooms, done, f, ring, act };
}
const rw = (icon, n, tip, cls = '') => `<span class="evc-rw sp${cls ? ' ' + cls : ''}" title="${esc(tip)}">${glyph(icon)}${n != null ? `<b>${n}</b>` : ''}</span>`;
function rackCard(s, l, opts) {
  const { x, live, R, rooms, done, ring, act } = parts(s, l, opts), open = !!R?.opened?.[R.graph.vaults[0]];
  const pay = `${rw('firewall', `×${SITE.rack.filters}`, `${SITE.rack.filters} filters for your firewall: the first Tuned or better, Custom one time in four`, 'sp-flt')}${rw('contract', `×${SITE.rack.receipts}`, `${SITE.rack.receipts} receipts from ${x.year}, kept for your commission: +10 rep each, three make a part of its piece`)}<i class="sp-gap"></i><span class="evc-rw sp sp-f" style="--fc:${FACTIONS.kestrel.color}" title="${esc(`Kestrel +${SITE.rack.rep} rep`)}">${glyph('f-kestrel')}<b>+${SITE.rack.rep}</b></span>`;
  return `<section class="card site-card${live ? '' : ' done'}"><h2>Kestrel rack · floor ${l.depth || 1}</h2><h1>${esc(l.name)}</h1>
    <p class="tagline">${levelTag(s, l.level)} <span class="tag tag-era" title="${esc(`Its trades froze in ${x.year}.`)}">${esc(x.c)}</span></p>
    <div class="stats"><div class="stat"><span>Rooms</span><strong>${done}/${rooms.length}</strong></div><div class="stat"><span>Cage</span><strong>${open ? 'open' : 'sealed'}</strong></div></div>
    <section class="evc evc-site" style="--ec:${FACTIONS.kestrel.color}"><header class="evc-head" title="${esc(`Kestrel is pulling Rack ${x.rack} back to cold storage. Open the cage before it goes.`)}">${glyph('cold')}<b>Rack pull</b><span class="evc-sub"><span class="evc-fm" style="--fc:${FACTIONS.kestrel.color}">${glyph('f-kestrel')}</span></span>${ring}</header>
    <div class="evc-body"><div class="evc-target site-tile" title="Its guard holds the key."><span class="evc-face">${glyph('storage')}</span><span class="evc-who"><b>The cage</b><span class="evc-tags"><span class="tag">key · guard post</span></span></span></div>
    <div class="site-pay">${pay}</div></div></section>
    ${act ? `<div class="row">${act}</div>` : ''}</section>`;
}
function rigCard(s, l, { here = false, busy = false, relock = 0, btn = () => '' } = {}) {
  const x = l.site, A = AUTHORS[x.crew], F = FACTIONS[x.faction], live = siteLive(l), R = l.floorplan;
  const rooms = R ? Object.values(R.graph.rooms).filter((r) => !r.nook && !r.optional) : [], done = rooms.filter((r) => R.cleared[r.id]).length;
  const r = 6.5, c = 2 * Math.PI * r, f = live ? Math.max(0, x.left / x.total) : 0, gone = Math.round((1 - f) * 100);
  const ring = live ? `<span class="evc-ring${f < 0.25 ? ' low' : ''}" title="${esc(`${mins(x.left)} min left`)}"><svg viewBox="0 0 18 18" aria-hidden="true"><circle cx="9" cy="9" r="${r}" class="bg"/><circle cx="9" cy="9" r="${r}" class="fg" stroke-dasharray="${(c * f).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 9 9)"/></svg></span>` : '';
  const lock = live ? '<strong class="hot-t">live</strong>' : `<strong>${x.state === 'won' ? 'broken' : 'landed'}</strong>`;
  const rw = (icon, n, tip, cls = '') => `<span class="evc-rw sp${cls ? ' ' + cls : ''}" title="${esc(tip)}">${glyph(icon)}${n != null ? `<b>${n}</b>` : ''}</span>`;
  const pay = `${rw('exploit', `×${SITE.rig.exploits}`, `${SITE.rig.exploits} Exploits: the crew's lock, taken apart`)}<span class="evc-rw sp sp-f" style="--fc:${F.color}" title="${esc(`${F.short} +${SITE.rig.rep} rep: ${x.inst} is theirs to stand behind`)}">${glyph('f-' + x.faction)}<b>+${SITE.rig.rep}</b></span><i class="sp-gap"></i><span class="evc-rw sp lore tbl" title="${esc(`If the run settles locked: its ${x.trades} trades orphan, and the process table +${SITE.rig.table}.`)}">table <b>+${SITE.rig.table}</b></span>`;
  const act = !live ? '' : here ? btn('net', 'Back to the run', true) : `<button type="button" class="btn primary" data-command="connect ${esc(l.id)}" ${busy ? 'disabled title="Finish what you are doing first"' : relock ? 'disabled title="Still tracing your last connection"' : ''}>${relock ? `Connect · ${relock}s` : 'Connect'}</button>`;
  return `<section class="card site-card hot${live ? '' : ' done'}"><h2>${esc(A.name)} rig · floor ${l.depth || 1}</h2><h1>${esc(l.name)}</h1>
    <p class="tagline">${levelTag(s, l.level)} <span class="tag" title="${esc(`${A.name} writes ${FAMILIES[A.crew]?.name.toLowerCase() || 'viruses'}.`)}">${esc(FAMILIES[A.crew]?.name || A.crew)}</span></p>
    <div class="stats"><div class="stat"><span>Rooms</span><strong>${done}/${rooms.length}</strong></div><div class="stat"><span>Lock</span>${lock}</div></div>
    <section class="evc evc-site" style="--ec:var(--hot)"><header class="evc-head" title="${esc(runText(s, l))}">${glyph('lock')}<b>Settlement run</b><span class="evc-sub">${x.trades}</span>${ring}</header>
    <div class="evc-body"><div class="site-run" title="${esc(`${x.inst}'s run: ${x.trades} trades.`)}"><span class="sr-end hot-t">${glyph('lock')}</span><i class="sr-track"><i style="width:${gone}%"></i></i><span class="sr-end">${glyph('node')}</span><span class="sr-what"><b>${esc(cap(x.short))}</b><small>${x.trades} trades</small></span></div>
    <div class="site-pay">${pay}</div></div></section>
    ${act ? `<div class="row">${act}</div>` : ''}</section>`;
}

// A live rig's row on the threat rail: the run, where, the time left.
export const siteRows = (s) => siteServers(s).filter(siteLive).map((l) => (l.site.kind === 'rack'
  ? { cls: 'drop', icon: 'cold', name: 'Rack pull', tag: `lv ${l.level}`, where: l.name, left: l.site.left, total: l.site.total, sel: l.id, verb: 'closes' }
  : { cls: 'hot', icon: 'lock', name: cap(l.site.short), tag: `lv ${l.level}`, where: l.name, left: l.site.left, total: l.site.total, sel: l.id, verb: 'settles' }));
