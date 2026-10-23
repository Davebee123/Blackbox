// System → Casing (casing.mjs): the colourway, the plate, the stickers on the chin and the props on the desk; and
// System → Settings' Window card (the district outside). Pure functions of state.
//   ui: { slot: the sticker slot picked, 0–3; pslot: the desk's spot picked, 0–1 }
import { glyph } from './glyphs.mjs';
import { COLORWAYS, COLORWAY_IDS, CASING, colorwayOpen, colorwayFrom, casingLook, decalsOwned, decalMarkup, districtOf, districtOpen, districtFrom, PROPS, PROP_IDS, PROP_SLOTS, propOpen, propFrom, propsLook, propsOwned, propSvg } from './casing.mjs';
import { DISTRICTS, DISTRICT_IDS } from './window.mjs';
import { titleById } from './profile.mjs';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

export function casingPageMarkup(s, ui = {}) {
  const C = s.cosmetics || {}, look = casingLook(s), cur = look.color || 'stock', slot = Math.max(0, Math.min(CASING.slots - 1, ui.slot || 0));
  const off = s.settings?.casing === false || s.settings?.shell === 'plain';
  // The colourways: yours to pick, the rest locked with the achievement that brings each on hover.
  const sw = COLORWAY_IDS.map((id) => {
    const a = colorwayFrom(id), open = colorwayOpen(s, id);
    const tip = `${COLORWAYS[id].name}: ${COLORWAYS[id].tip}${a ? ` Comes with ${a.hidden && !open ? 'a hidden achievement' : a.name}.` : ''}`;
    return open
      ? `<button type="button" class="cs-sw" data-case="${id}" data-run="casing color ${id}" aria-pressed="${cur === id}" title="${esc(tip)}"><i class="cs-chip" aria-hidden="true"></i><span>${esc(COLORWAYS[id].name)}</span></button>`
      : `<span class="cs-sw locked" data-case="${id}" title="${esc(tip)}"><i class="cs-chip" aria-hidden="true"></i><span>${esc(COLORWAYS[id].name)}</span>${glyph('lock')}</span>`;
  }).join('');
  // The plate: stock, a title of yours, or your own words.
  const titles = (s.profile?.titles || []).map(titleById).filter(Boolean);
  const plates = [`<button type="button" class="cs-pl" data-run="casing plate stock" aria-pressed="${!C.plate}" title="As it shipped">${esc(CASING.stock)}</button>`,
    ...titles.map((t) => `<button type="button" class="cs-pl" data-run="casing plate title ${esc(t.id)}" aria-pressed="${C.plate?.title === t.id}" title="${esc(`Your title ${t.name}`)}">MODEL 7 · ${esc(t.name.toUpperCase())}</button>`)].join('');
  // The stickers: the chin's four slots (the picked one lit), then yours to put on it.
  const slots = (i) => `<button type="button" class="cs-slot" data-cs-slot="${i}" aria-pressed="${slot === i}" title="${esc(`Slot ${i + 1}`)}">${look.decals[i] ? decalMarkup(look.decals[i], i) : '+'}</button>`;
  const owned = decalsOwned(s);
  const chips = owned.map((x) => `<button type="button" class="cs-decal" data-run="casing sticker ${slot + 1} ${esc(x.id)}" aria-pressed="${look.decals[slot]?.id === x.id}" title="${esc(`${x.tip}. On slot ${slot + 1}.`)}">${decalMarkup(x, slot)}</button>`).join('');
  return `<div class="cs-page">
    <section class="card cs-card"><h2>Colourway</h2>${off ? `<p class="cs-note">${esc('Casing off. System → Settings turns it on.')}</p>` : ''}<div class="cs-swatches">${sw}</div></section>
    <section class="card cs-card" data-case="${cur}"><h2>Nameplate</h2><span class="cs-plate" title="The plate on the chin">${esc(look.plate)}</span>
      <div class="cs-plates">${plates}</div>
      <form class="cs-own" data-cs-plate><input id="cs-plate-in" maxlength="${CASING.plate}" value="${esc(C.plate?.text || '')}" placeholder="Your own, ${CASING.plate} characters" spellcheck="false" autocomplete="off" aria-label="Your own plate"><button type="submit" class="btn small primary">Use</button></form></section>
    <section class="card cs-card" data-case="${cur}"><h2>Stickers</h2>
      <div class="cs-bezel" aria-label="The chin">${slots(0)}${slots(1)}<span class="cs-mini" aria-hidden="true">${esc(look.plate)}</span>${slots(2)}${slots(3)}</div>
      <div class="cs-row"><span>Yours · ${owned.length}</span>${look.decals[slot] ? `<button type="button" class="act dim ach-pin" data-run="casing sticker ${slot + 1} off">Remove</button>` : ''}</div>
      ${owned.length ? `<div class="cs-decals">${chips}</div>` : `<p class="cs-note">${esc('None yet. Achievements bring them.')}</p>`}</section>
    ${deskCardMarkup(s, ui)}
  </div>`;
}

// ---------- the window's district (System → Settings) and the desk's props (System → Casing) ----------
// A district in miniature: its skyline in a few shapes, the same warm lights (the picker, the achievements page).
const D = '#0b0709', L = (x, y, w = 1, h = 1, o = 0.75, c = '#f1b92f') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}" opacity="${o}"/>`;
const R = (x, y, w, h, c = D) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${c}"/>`;
const MINI = {
  sprawl: R(2, 7, 8, 17) + R(11, 11, 6, 13) + R(18, 3, 10, 21) + R(29, 9, 7, 15) + R(37, 5, 9, 19) + R(47, 11, 6, 13) + R(54, 7, 9, 17)
    + L(4, 10) + L(7, 14) + L(20, 6) + L(24, 9) + L(21, 14) + L(39, 8) + L(43, 13) + L(56, 10) + L(59, 15) + L(31, 12, 1.2, 7, 0.9, '#e8707f') + L(49, 15, 1.2, 5, 0.85, '#ffa860'),
  backhaul: R(0, 15, 64, 9, '#140d10') + R(4, 13, 20, 3) + R(40, 12, 22, 4) + R(10, 3, 1, 21) + R(7, 2, 7, 1.5) + R(46, 4, 1, 20) + R(43, 3, 7, 1.5)
    + L(7.5, 2.2, 6, 0.8, 0.9, '#f2dcb8') + L(43.5, 3.2, 6, 0.8, 0.9, '#f2dcb8') + R(18, 10, 24, 1.5) + R(18, 10, 1.5, 14) + L(26, 12, 1.5, 1.5, 0.95) + L(34, 12, 1.5, 1.5, 0.9, '#f2dcb8')
    + R(14, 16.5, 46, 4.5) + [17, 21, 25, 29, 33, 37, 41, 45, 49, 53].map((x) => L(x, 17.5, 2.4, 1.4, 0.7)).join('') + L(0, 21.5, 64, 0.5, 0.35, '#ffcc99') + L(0, 23, 64, 0.5, 0.35, '#ffcc99'),
  stacks: R(1, 9, 12, 15) + R(14, 13, 9, 11) + R(33, 7, 12, 17) + R(46, 12, 8, 12) + R(55, 9, 9, 15) + R(26, 6, 6, 18, '#120c12') + R(25, 5, 8, 1.5)
    + '<ellipse cx="29" cy="3.5" rx="4" ry="2.2" fill="#c4b4a6" opacity=".35"/><ellipse cx="32" cy="1.5" rx="4.5" ry="2" fill="#c4b4a6" opacity=".22"/>'
    + [[3, 12], [6, 15], [9, 18], [4, 20], [16, 15], [19, 19], [35, 10], [38, 14], [41, 11], [36, 18], [43, 20], [48, 15], [51, 19], [57, 12], [60, 16], [58, 20]].map(([x, y], i) => L(x, y, 1, 0.8, 0.85, i % 4 === 3 ? '#f2dcb8' : '#f1b92f')).join(''),
  coldline: R(0, 14, 64, 1.5, '#140d10') + R(0, 15.5, 64, 8.5, '#0d090b') + L(4, 17, 6, 0.5, 0.4, '#ffcc99') + L(20, 19, 8, 0.5, 0.35, '#ffcc99') + L(50, 18, 5, 0.5, 0.4, '#ffcc99')
    + R(12, 7, 1, 10) + R(20, 7, 1, 10) + R(4, 6, 34, 1.5) + R(15, 2, 3, 4) + L(16, 1.2, 1, 1, 0.9) + R(54, 9, 1.4, 5) + L(54, 8.2, 1.4, 1, 0.95, '#f2dcb8')
    + '<path d="M55 8.6L64 6v5z" fill="#f2dcb8" opacity=".18"/>' + R(26, 19, 8, 3, '#4a2e22') + R(34, 19, 6, 3, '#46381f') + R(28, 16, 8, 3, '#3d2a2c') + R(42, 20, 9, 3, '#33302a'),
  tarbeach: R(2, 6, 5, 10, '#150e12') + R(9, 3, 6, 13, '#150e12') + R(17, 8, 5, 8, '#150e12') + R(25, 4, 7, 12, '#150e12') + R(34, 7, 6, 9, '#150e12') + R(42, 2, 5, 14, '#150e12') + R(50, 6, 7, 10, '#150e12') + R(58, 8, 6, 8, '#150e12')
    + L(11, 6) + L(27, 7) + L(44, 5) + L(52, 9) + L(13, 10, 1, 1, 0.5) + R(0, 16, 64, 8) + R(5, 10, 9, 6) + '<path d="M4.5 10L9.5 7.5 14.5 10z" fill="#0b0709"/>' + R(6, 16, 0.8, 3) + R(12, 16, 0.8, 3) + R(4, 15.4, 11, 0.8)
    + R(38, 13, 20, 0.8) + [38, 41, 44, 47, 50, 53, 56].map((x, i) => L(x, 12, 1, 1, i % 3 ? 0.35 : 0.95, '#ffd9a0')).join('') + R(24, 13, 5, 3) + L(25.5, 13.6, 1.5, 2.4, 0.7, '#ffce96'),
};
export const districtMini = (id) => `<svg class="cs-mini-d" viewBox="0 0 64 24" width="64" height="24" aria-hidden="true" preserveAspectRatio="xMidYMax slice">${MINI[id] || MINI.sprawl}</svg>`;
const comes = (a, open) => (a ? ` Comes with ${a.hidden && !open ? 'a hidden achievement' : a.name}.` : '');

// System → Settings → Window: the districts, yours to pick, the rest dim with the achievement that brings each.
export function districtCardMarkup(s) {
  const cur = districtOf(s), off = s.settings?.window === false || s.settings?.casing === false || s.settings?.shell === 'plain';
  const items = DISTRICT_IDS.map((id) => {
    const a = districtFrom(id), open = districtOpen(s, id), tip = `${DISTRICTS[id].name}: ${DISTRICTS[id].tip}${comes(a, open)}`;
    return open
      ? `<button type="button" class="cs-dist" data-run="district ${id}" aria-pressed="${cur === id}" title="${esc(tip)}">${districtMini(id)}<span>${esc(DISTRICTS[id].name)}</span></button>`
      : `<span class="cs-dist locked" title="${esc(tip)}">${districtMini(id)}<span>${esc(DISTRICTS[id].name)}</span>${glyph('lock')}</span>`;
  }).join('');
  return `<section class="card cs-card cs-dists-card"><h2>Window</h2><p class="cs-note">${esc(off ? 'The window is off. Casing and Window on show it, beside the monitor on screens 1700px wide and more.' : 'Out the window beside the monitor, on screens 1700px wide and more.')}</p><div class="cs-dists">${items}</div></section>`;
}

// System → Casing → Desk: the two spots (the picked one lit), then the props, yours to put there, the rest dim.
export function deskCardMarkup(s, ui = {}) {
  const look = propsLook(s), slot = Math.max(0, Math.min(PROP_SLOTS - 1, ui.pslot || 0));
  const spot = (i) => `<button type="button" class="cs-pslot" data-cs-pslot="${i}" aria-pressed="${slot === i}" title="${esc(i ? 'The right of the desk' : 'The left of the desk')}"><small>${i ? 'Right' : 'Left'}</small>${look[i] ? propSvg(look[i].id) : '<b>+</b>'}</button>`;
  const items = PROP_IDS.map((id) => {
    const a = propFrom(id), open = propOpen(s, id), tip = `${PROPS[id].name}: ${PROPS[id].tip}${comes(a, open)}`;
    return open
      ? `<button type="button" class="cs-prop" data-run="casing prop ${slot + 1} ${id}" aria-pressed="${look[slot]?.id === id}" title="${esc(tip)}">${propSvg(id)}<span>${esc(PROPS[id].name)}</span></button>`
      : `<span class="cs-prop locked" title="${esc(tip)}">${propSvg(id)}<span>${esc(PROPS[id].name)}</span>${glyph('lock')}</span>`;
  }).join('');
  return `<section class="card cs-card"><h2>Desk</h2><p class="cs-note">${esc('On the desk under the monitor when the window shows it, else on the chin by the knobs and the lamps.')}</p>
      <div class="cs-desk">${spot(0)}${spot(1)}</div>
      <div class="cs-row"><span>Yours · ${propsOwned(s).length}</span>${look[slot] ? `<button type="button" class="act dim ach-pin" data-run="casing prop ${slot + 1} off">Remove</button>` : ''}</div>
      <div class="cs-props">${items}</div></section>`;
}
