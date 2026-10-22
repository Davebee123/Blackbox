// System → Casing (casing.mjs): the colourway, the plate and the stickers on the chin. Pure functions of state.
//   ui: { slot: the sticker slot picked, 0–3 }
import { glyph } from './glyphs.mjs';
import { COLORWAYS, COLORWAY_IDS, CASING, colorwayOpen, colorwayFrom, casingLook, decalsOwned, decalMarkup } from './casing.mjs';
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
  </div>`;
}
