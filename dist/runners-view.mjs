// The Rail (docs/runners.md, picked): the runners you know as a list under Contracts on the map, and the one you pick
// drawn on it: a paper-white diamond with the handle, a dotted route through the servers they've passed, a dashed ring
// on where they're heading. Paper white throughout (--bright); a runner hunting you (R3) is the one red.
// The map draws a runner only where you've revealed (runners.mjs revealed, inSight); the Rail gives the rest a floor.
import { castOf, knownOf, runnerOf, stateOf, clsLabel, doing, shortPlace, headingOf, revealed, inSight, hash, TRAITS, standingOf, tierOf, busyOf, cantHire, feeOf, feePaid, cutOf, hired, clockOf, gainOf, PRESET_PLAY, PRESET_TIP } from './runners.mjs';
import { FACTIONS } from './factions.mjs';
import { glyph } from './glyphs.mjs';
import { SUBS, SUBCLASS, ABILITIES, presetBar } from './data.mjs';

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
// shut: the section folded to its head (app.js keeps it per viewer).
export function runnerRail(s, pick = null, shut = false) {
  const R = s.runners?.known || {}, list = knownOf(s).sort((a, b) => (R[b.handle].at || 0) - (R[a.handle].at || 0) || a.handle.localeCompare(b.handle)).slice(0, RAIL.rows);
  if (!list.length) return '';
  const rows = list.map((r) => {
    const st = stateOf(s, r);
    return `<button type="button" class="rr-row${r.handle === pick ? ' on' : ''}${st.stage === 'down' ? ' down' : ''}" data-runner="${esc(r.handle)}" title="${esc(runnerTip(s, r, st))}" data-tt-kind="${esc(`Runner · ${FACTIONS[r.faction].short}`)}"><i class="rr-dia" aria-hidden="true"></i><span class="rr-txt"><b>${esc(r.handle)}</b><small>${esc(clsLabel(r, st.level))} ${st.level}</small></span><small class="rr-at">${esc(railWhere(s, st))}</small></button>`;
  }).join('');
  return `<section class="rrail${shut ? ' shut' : ''}" aria-label="Runners"><h3 class="ct-head rr-head"><button type="button" class="rr-fold" data-rail-fold aria-expanded="${!shut}" title="${shut ? 'Show the runners you know' : 'Fold the runners away'}"><i class="rr-dia" aria-hidden="true"></i>Runners<small>${knownOf(s).length}</small><i class="rr-chev" aria-hidden="true">${shut ? '▸' : '▾'}</i></button></h3>${shut ? '' : rows}</section>`;
}
// The picked runner on the map, on the floor drawn (fl), in its map units (portrait: x and y swapped, as mapLayout).
// Nothing while they're out of sight; the route runs back only as far as the first place you haven't revealed, and the
// ring is drawn only on a revealed one.
export function runnerMark(s, handle, fl, portrait = false) {
  const r = handle && runnerOf(s, handle);
  if (!r) return '';
  const st = stateOf(s, r);
  if (st.floor !== fl || !inSight(s, st)) return '';
  const g = st.g, P = (id) => { const n = g.nodes[id]; return n ? (portrait ? { x: n.y, y: n.x } : { x: n.x, y: n.y }) : null; };
  const a = P(st.pos.at), b = st.pos.next && P(st.pos.next), me = b ? { x: a.x + (b.x - a.x) * st.pos.f, y: a.y + (b.y - a.y) * st.pos.f } : a;
  const passed = st.pos.passed, from = passed.findLastIndex((id) => !revealed(s, g, id)) + 1;
  const pts = passed.slice(from).map(P).filter(Boolean).concat(b ? [me] : []), to = headingOf(st), ring = to && revealed(s, g, to) ? P(to) : null;
  const f = (v) => Math.round(v * 10) / 10;
  const route = pts.length > 1 ? `<polyline class="mr-route" points="${pts.map((p) => `${f(p.x)},${f(p.y)}`).join(' ')}"/>` : '';
  return `<g class="mrunner${st.stage === 'down' ? ' down' : ''}" data-runner-mark="${esc(r.handle)}">${route}${ring ? `<circle class="mr-ring" cx="${f(ring.x)}" cy="${f(ring.y)}" r="22"/>` : ''}<g transform="translate(${f(me.x)} ${f(me.y - (b ? 0 : 16))})"><title>${esc(runnerTip(s, r, st).replace(/\n▸ /, ' '))}</title><path class="mr-dia" d="M0 -7 L7 0 L0 7 L-7 0 Z"/><text class="mr-name" y="-12" text-anchor="middle">${esc(r.handle)}</text></g></g>`;
}
// Every runner in sight on the floor drawn (the picked one has runnerMark): a small paper-white diamond under the place
// they're at, side by side; hollow on the road between two. None where you haven't revealed: under a ?, at a server or
// hub that isn't on your map, or on a road to one. A click opens their card (app.js data-runner). Your crew is with you,
// so isn't drawn.
export function runnersMap(s, fl, pick = null, portrait = false) {
  const here = castOf(s).filter((r) => r.handle !== pick && !hired(s, r.handle)).map((r) => ({ r, st: stateOf(s, r) })).filter((x) => x.st.floor === fl && inSight(s, x.st));
  if (!here.length) return '';
  const g = here[0].st.g, P = (id) => { const n = g.nodes[id]; return n ? (portrait ? { x: n.y, y: n.x } : { x: n.x, y: n.y }) : null; };
  const at = {};
  for (const x of here) if (!x.st.pos.next) (at[x.st.pos.at] ||= []).push(x);
  const f = (v) => Math.round(v * 10) / 10;
  const dia = (x, p, road) => `<g class="mrun${road ? ' road' : ''}${x.st.stage === 'down' ? ' down' : ''}" data-runner="${esc(x.r.handle)}" role="button" tabindex="0" aria-label="${esc(x.r.handle)}" transform="translate(${f(p.x)} ${f(p.y)})"><title>${esc(runnerTip(s, x.r, x.st).replace(/\n▸ /, ' '))}</title><circle class="mrun-hit" r="7"/><path d="M0 -4.5 L4.5 0 L0 4.5 L-4.5 0 Z"/></g>`;
  let out = '';
  for (const [id, list] of Object.entries(at)) { const c = P(id); if (c) list.forEach((x, i) => { out += dia(x, { x: c.x + (i - (list.length - 1) / 2) * 13, y: c.y + 30 }, false); }); }
  for (const x of here.filter((y) => y.st.pos.next)) { const a = P(x.st.pos.at), b = P(x.st.pos.next); if (a && b) out += dia(x, { x: a.x + (b.x - a.x) * x.st.pos.f, y: a.y + (b.y - a.y) * x.st.pos.f }, true); }
  return `<g class="mruns">${out}</g>`;
}
export const runnerFloor = (s, handle) => { const r = runnerOf(s, handle); return r ? stateOf(s, r).floor : null; };

// ---------- R2: the runner card, the crew card, the Tier bar, a runner's row in a room ----------
const CLASS_GLYPH = { breaker: 'damage', bastion: 'shield', infiltrator: 'stealth', operator: 'sync' };
// What each trait does, for its chip's tooltip (docs/runners.md Traits). Only Known face and Haggler are in play yet.
export const TRAIT_DOES = {
  spotter: 'Every few cycles, the part they hit takes more damage from everyone for a cycle.', swarm: "Everyone's helpers hit harder.",
  bulwark: 'The crew starts each fight shielded.', decoy: 'The first attack each fight goes at them.', patch: 'The crew recovers Signal between fights.',
  repair: "Restores your server's Integrity after a run.", routefinder: 'Your steps cost less Signal.', mapper: 'Rooms a step further out show their kind.',
  reader: 'One tell a fight shows a cycle early.', archivist: 'More research on the parts you fight together.', mentor: 'More XP on runs together.',
  coordinator: "The crew's Sync windows last longer.", counterintel: "Rivals' counter-picks read you less often.", fixer: 'Contracts done together pay more faction rep.',
  haggler: 'A smaller cut: half (★ a quarter).', knownface: 'A smaller fee, and standing rises half again as fast.', moonlighter: 'Brings credits to each run in place of a cut.',
  gift: 'Brings a codebase, script or blueprint the first time you hire them.', wildcard: 'Traits rolled from the seed.',
};
const LIVE_TRAITS = ['haggler', 'knownface'];
const TEMPER_DOES = { Careful: 'They pick their jobs with care and crash out less often.', Steady: 'They take jobs as they come.', Bold: 'They take on more and crash out more often.' };
const mmss = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };
// A runner's line in a room you find them in, by temperament.
const ROOM_LINES = {
  Careful: ['Two of us and this goes quicker.', 'I had it at half. Then it found its second wind.', 'Watch the left part. It bites.'],
  Steady: ["It's got more in it than I thought.", 'Pull up a chair. Plenty of it to go round.', 'Same as last week. Slower.'],
  Bold: ['Hit it with me or hold my coat.', 'I was winning. Mostly.', 'Get in here. It pays double if it pays at all.'],
};
export const roomLine = (r, k) => { const L = ROOM_LINES[r.temper]; return L[Math.floor(hash(r.handle, k * 7 + 9) * L.length)]; };

// The Tier bar: the tier's name, a bar to the next and the next one's name; the number and how you met in its tooltip.
export function tierBar(s, h) {
  const n = standingOf(s, h), t = tierOf(n), k = s.runners?.known?.[h];
  const how = k?.met || (k?.by === 'net' ? 'You know them from #net.' : 'You have met them.');
  const tip = `Standing\n${n} of 100. Each tier makes their fee smaller; Close brings them into your consortium.\n▸ ${how}`;
  return `<span class="rc-tier" title="${esc(tip)}"><b>${esc(t.name)}</b><i class="rc-tierbar" style="--f:${Math.round(t.f * 100) / 100}"></i><small>${esc(t.next || '')}</small></span>`;
}
// Traits as named chips, temperament first (dashed); ★ on a starred one.
function traitChips(r) {
  const temper = `<span class="rc-chip temper" title="${esc(`${r.temper}\nTemperament\n${TEMPER_DOES[r.temper]}`)}">${esc(r.temper)}</span>`;
  return temper + r.traits.map((t) => `<span class="rc-chip${t.star ? ' star' : ''}" title="${esc(`${TRAITS[t.id]}${t.star ? ' ★' : ''}\nTrait${t.star ? ', half again as strong' : ''}\n${TRAIT_DOES[t.id]}${LIVE_TRAITS.includes(t.id) ? '' : '\n▸ Not in play yet.'}`)}">${t.star ? '★ ' : ''}${esc(TRAITS[t.id])}</span>`).join('');
}
const factionMark = (r) => `<i class="rc-fmark" title="${esc(FACTIONS[r.faction].name || FACTIONS[r.faction].short)}">${glyph('f-' + r.faction)}</i>`;
// A runner's row (the room's card, and the head of their own): handle, faction mark, class and level, their Signal.
export function runnerRow(s, r, { sig = null, st = stateOf(s, r) } = {}) {
  const bar = sig != null ? `<span class="rc-sig" title="${esc(`${r.handle}'s Signal: ${Math.round(sig * 100)}%.`)}"><i style="--f:${sig}"></i></span>` : '';
  return `<div class="rc-row">${glyph(CLASS_GLYPH[r.cls] || 'run', 'rc-cls')}<span><b>${esc(r.handle)}</b>${factionMark(r)}<small>${esc(clsLabel(r, st.level))} · level ${st.level}</small></span>${bar}</div>`;
}
// The room's card: their row, their line, the standing it pays.
export function roomRunner(s, m) {
  const t = tierOf(standingOf(s, m.r.handle)), gain = gainOf(m.r);
  const pays = `<span class="rc-pays" title="${esc(`Standing\nWin with them and ${m.r.handle}'s standing rises ${gain}.\n▸ ${t.name}${t.next ? ` → ${t.next}` : ''}.`)}"><i class="rr-dia" aria-hidden="true"></i>+${gain}</span>`;
  return `<div class="rc-room">${runnerRow(s, m.r, { sig: m.sig, st: m.st })}<p class="rc-line">“${esc(roomLine(m.r, m.st.k))}”${pays}</p></div>`;
}
// Now: what they're doing, → a server and its time on the road, or Busy with the time they're free.
function nowRow(s, r, st, busy) {
  if (hired(s, r.handle)) return '<span class="rc-now">With you</span>';
  if (busy) return `<span class="rc-now busy">Busy · free in ${mmss(busy.until - clockOf(s))}</span>`;
  const left = st.left, to = headingOf(st);
  if (st.stage === 'out' || st.stage === 'back') return `<span class="rc-now">→ ${esc(shortPlace(s, st.g, to))} · ${mmss(left)}</span>`;
  return `<span class="rc-now">${esc(doing(s, st))}${st.stage === 'work' ? ` · ${mmss(left)}` : ''}</span>`;
}
const lastLine = (s, h) => [...(s.channel?.lines || [])].reverse().find((l) => l.from === h)?.text || '';
const row = (label, html) => `<div class="rc-r"><dt>${label}</dt><dd>${html}</dd></div>`;
// The runner card (a Rail row opens it beside their diamond); mode 'crew' is the crew card Hire turns it into, with
// preset picked.
export function runnerCard(s, h, { mode = 'runner', preset = 'rotation' } = {}) {
  const r = runnerOf(s, h);
  if (!r) return '';
  const st = stateOf(s, r), busy = busyOf(s, r), mine = hired(s, h), no = cantHire(s, r);
  const head = `<p class="rc-kind">Runner · ${esc(FACTIONS[r.faction].short)}</p><h2 class="rc-handle">${glyph(CLASS_GLYPH[r.cls] || 'run', 'rc-cls')}${esc(h)}</h2><p class="rc-class">${esc(clsLabel(r, st.level))} · level ${st.level}</p>`;
  const x = '<button type="button" class="btn small rc-x" data-runner-close title="Close">×</button>';
  if (mode === 'crew' && !mine) {
    const fee = feePaid(s, h) ? 0 : feeOf(s, r), cut = Math.round(cutOf(r) * 100);
    const pay = `<span class="rc-pay" title="${esc(`Fee\nPay\nPaid once, the first time you hire ${h}.${fee ? '' : '\n▸ Paid.'}`)}">${glyph('credits')}<b>${fee ? fee : '✓'}</b></span><span class="rc-pay" title="${esc(`Cut\nPay\n${cut}% of the credits each run banks while ${h} is with you. Items and code stay yours.`)}">${glyph('siphon')}<b>${cut}%</b></span>`;
    const sub = st.level >= SUBCLASS.from ? r.sub : null, P = SUBS[sub]?.presets || { rotation: [] };
    const tiles = Object.keys(P).map((p) => {
      const keys = sub ? presetBar(r.cls, sub, st.level, P[p]) : [];
      const tip = `${p[0].toUpperCase() + p.slice(1)}\nPreset\n${PRESET_TIP[p] || 'Their own way.'}${keys.length ? `\n▸ ${keys.map((id) => ABILITIES[id]?.name || id).join(', ')}.` : ''}`;
      return `<button type="button" class="rc-tile${p === preset ? ' on' : ''}" data-runner-preset="${esc(p)}" aria-pressed="${p === preset}" title="${esc(tip)}"><i class="rc-lamp"></i><b>${esc(p[0].toUpperCase() + p.slice(1))}</b><small>${esc(PRESET_PLAY[p] || '')}</small></button>`;
    }).join('');
    const rows = row('Traits', traitChips(r)) + row('Pay', pay) + row('Bar', `<span class="rc-tiles">${tiles}</span>`);
    return `<section class="rcard crew" id="runner-pop" data-runner-card="${esc(h)}">${x}${head}<dl class="rc-rows">${rows}</dl><div class="row acts"><button type="button" class="btn primary" data-command="hire ${esc(h)} ${esc(preset)}"${no ? ` disabled title="${esc(`You can't hire ${h}: ${no}.`)}"` : ''}>Hire</button><button type="button" class="btn" data-runner-hire="0">Back</button></div></section>`;
  }
  const rows = row('Traits', traitChips(r)) + row('Standing', tierBar(s, h)) + row('Now', nowRow(s, r, st, busy)) + row('After', `<span>${esc(st.trade.what)}, frozen on floor ${st.trade.floor}</span>`);
  const said = lastLine(s, h);
  const act = mine ? `<button type="button" class="btn" data-command="crew kick ${esc(h)}">Let go</button>`
    : `<button type="button" class="btn primary" data-runner-hire="1"${no ? ` disabled title="${esc(`You can't hire ${h}: ${no}.`)}"` : ''}>${busy ? `${glyph('clock')}${mmss(busy.until - clockOf(s))}` : 'Hire'}</button>`;
  return `<section class="rcard${mine ? ' mine' : ''}" id="runner-pop" data-runner-card="${esc(h)}">${x}${head}<dl class="rc-rows">${rows}</dl>${said ? `<p class="rc-said">“${esc(said)}”</p>` : ''}<div class="row acts">${act}</div></section>`;
}
