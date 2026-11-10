// The Rail (docs/runners.md, picked): the runners you know as a list under Contracts on the map, and the one you pick
// drawn on it: a paper-white diamond with the handle, a dotted route through the servers they've passed, a dashed ring
// on where they're heading. Paper white throughout (--bright); a runner hunting you (R3) is the one red.
import { knownOf, runnerOf, stateOf, clsLabel, doing, shortPlace, headingOf } from './runners.mjs';
import { FACTIONS } from './factions.mjs';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export const RAIL = { rows: 6 };

// The tooltip, in WoW's grammar: the handle; Runner · faction (the kind line); class, level and what they're doing;
// then, muted, how you know them and what they're after.
export function runnerTip(s, r, st = stateOf(s, r)) {
  const how = (s.runners?.known?.[r.handle]?.by || 'net') === 'net' ? 'You know them from #net.' : 'You have met them.';
  return `${r.handle}: ${clsLabel(r, st.level)}, level ${st.level}, ${doing(s, st)}.\n▸ ${how} After ${st.trade.what}, frozen on floor ${st.trade.floor}.`;
}
// Where, on the Rail: a place, or → a place for one on the road.
export function railWhere(s, st) {
  const g = st.g, to = headingOf(st);
  return st.stage === 'out' || st.stage === 'back' ? `→ ${shortPlace(s, g, to)}` : shortPlace(s, g, st.pos.at);
}
// The Rail: the runners you know, the last heard first (RAIL.rows at most), the picked one lit.
export function runnerRail(s, pick = null) {
  const R = s.runners?.known || {}, list = knownOf(s).sort((a, b) => (R[b.handle].at || 0) - (R[a.handle].at || 0) || a.handle.localeCompare(b.handle)).slice(0, RAIL.rows);
  if (!list.length) return '';
  const rows = list.map((r) => {
    const st = stateOf(s, r);
    return `<button type="button" class="rr-row${r.handle === pick ? ' on' : ''}${st.stage === 'down' ? ' down' : ''}" data-runner="${esc(r.handle)}" title="${esc(runnerTip(s, r, st))}" data-tt-kind="${esc(`Runner · ${FACTIONS[r.faction].short}`)}"><i class="rr-dia" aria-hidden="true"></i><span class="rr-txt"><b>${esc(r.handle)}</b><small>${esc(clsLabel(r, st.level))} ${st.level}</small></span><small class="rr-at">${esc(railWhere(s, st))}</small></button>`;
  }).join('');
  return `<section class="rrail" aria-label="Runners"><h3 class="ct-head rr-head"><i class="rr-dia" aria-hidden="true"></i>Runners<small>${knownOf(s).length}</small></h3>${rows}</section>`;
}
// The picked runner on the map, on the floor drawn (fl), in its map units (portrait: x and y swapped, as mapLayout).
export function runnerMark(s, handle, fl, portrait = false) {
  const r = handle && runnerOf(s, handle);
  if (!r) return '';
  const st = stateOf(s, r);
  if (st.floor !== fl) return '';
  const g = st.g, P = (id) => { const n = g.nodes[id]; return n ? (portrait ? { x: n.y, y: n.x } : { x: n.x, y: n.y }) : null; };
  const a = P(st.pos.at), b = st.pos.next && P(st.pos.next), me = b ? { x: a.x + (b.x - a.x) * st.pos.f, y: a.y + (b.y - a.y) * st.pos.f } : a;
  const pts = st.pos.passed.map(P).filter(Boolean).concat(b ? [me] : []), to = headingOf(st), ring = to ? P(to) : null;
  const f = (v) => Math.round(v * 10) / 10;
  const route = pts.length > 1 ? `<polyline class="mr-route" points="${pts.map((p) => `${f(p.x)},${f(p.y)}`).join(' ')}"/>` : '';
  return `<g class="mrunner${st.stage === 'down' ? ' down' : ''}" data-runner-mark="${esc(r.handle)}">${route}${ring ? `<circle class="mr-ring" cx="${f(ring.x)}" cy="${f(ring.y)}" r="22"/>` : ''}<g transform="translate(${f(me.x)} ${f(me.y - (b ? 0 : 16))})"><title>${esc(runnerTip(s, r, st).replace(/\n▸ /, ' '))}</title><path class="mr-dia" d="M0 -7 L7 0 L0 7 L-7 0 Z"/><text class="mr-name" y="-12" text-anchor="middle">${esc(r.handle)}</text></g></g>`;
}
export const runnerFloor = (s, handle) => { const r = runnerOf(s, handle); return r ? stateOf(s, r).floor : null; };
