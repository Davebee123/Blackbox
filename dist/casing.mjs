// Casing cosmetics: the monitor around the screen, made yours. Only ever the casing (the bezel, its plate and its
// stickers), never the screen: the game's colours, text and layout don't change, nothing covers the glass, the lamps
// or the knobs, and nothing moves. Rewards from achievements (achievements.mjs), cosmetic only.
//   colourway  the casing's plastic (CSS variables on body.cased[data-case]: casing.css). Stock is today's dark grey;
//              each other one comes with an achievement.
//   plate      the badge on the chin: BLACKBOX · MODEL 7 (stock), MODEL 7 · <a title you've earned>, or your own text
//              (16 plain characters at most, shown in capitals).
//   stickers   4 slots on the chin, two either side of the plate, each holding a sticker you've earned (profile.mjs
//              stickers, an achievement's reward) as a small decal in its colour.
// Saved on s.cosmetics = { case, plate: null | { title } | { text }, decals: [id|null ×4] }; an older save has none and
// shows the stock casing. System → Casing turns it all off with the casing (app.js casing()); phones never show it.
import { emit, warn } from './combat.mjs';
import { earned, achievements } from './achievements.mjs';
import { titleById, myProfile, stickerById } from './profile.mjs';

export const CASING = { slots: 4, plate: 16, stock: 'BLACKBOX · MODEL 7' };
// The colourways: their name and the achievement that brings each (its id). Their colours live in casing.css.
export const COLORWAYS = {
  stock: { name: 'Stock', tip: 'Dark grey plastic, as it shipped.' },
  beige: { name: 'Beige box', tip: 'The office beige of a 90s tower.' },
  matte: { name: 'Matte black', tip: 'Soft-touch black, no shine.' },
  smoked: { name: 'Smoked', tip: 'Smoked grey, like a see-through case.' },
  halcyon: { name: 'Halcyon blue', tip: 'Halcyon Mutual\'s corporate navy.' },
  glassjaw: { name: 'GLASSJAW plum', tip: 'GLASSJAW\'s deep plum.' },
  kestrel: { name: 'Kestrel green', tip: 'Kestrel\'s rack-room green.' },
  lantern: { name: 'LANTERN copper', tip: 'LANTERN\'s burnt copper.' },
  nullchoir: { name: 'NULL CHOIR wine', tip: 'NULL CHOIR\'s dark wine.' },
};
export const COLORWAY_IDS = Object.keys(COLORWAYS);
// The achievement that brings a colourway (achievements.mjs reward.casing), or null for stock.
export const colorwayFrom = (id) => achievements().find((a) => a.reward?.casing === id) || null;
export const colorwayOpen = (s, id) => id === 'stock' || (!!COLORWAYS[id] && !!colorwayFrom(id) && earned(s, colorwayFrom(id).id));

export function cosmeticsOf(s) {
  const C = (s.cosmetics ||= {});
  if (!COLORWAYS[C.case]) C.case = 'stock';
  if (C.plate === undefined) C.plate = null;
  if (!Array.isArray(C.decals)) C.decals = [];
  C.decals = Array.from({ length: CASING.slots }, (_, i) => C.decals[i] || null);
  return C;
}
// The stickers you can put on the casing: every one an achievement you've earned brings (kept for good), and any the
// profile shows now (profile.mjs stickersOf is the card's; this never loses one).
export function decalsOwned(s) {
  const ids = achievements().filter((a) => a.reward?.sticker && earned(s, a.id)).map((a) => a.reward.sticker);
  return [...new Set(ids)].map(stickerById).filter(Boolean);
}
// What the casing shows (app.js casing() draws it; read only, so a view never writes the save).
export function casingLook(s) {
  const C = s.cosmetics || {}, owned = new Set(decalsOwned(s).map((x) => x.id));
  const color = COLORWAYS[C.case] && colorwayOpen(s, C.case) && C.case !== 'stock' ? C.case : null;
  const t = C.plate?.title && (s.profile?.titles || []).includes(C.plate.title) ? titleById(C.plate.title) : null;
  const plate = t ? `MODEL 7 · ${t.name.toUpperCase()}` : C.plate?.text ? C.plate.text.toUpperCase() : CASING.stock;
  const decals = Array.from({ length: CASING.slots }, (_, i) => { const id = (C.decals || [])[i]; return id && owned.has(id) ? stickerById(id) : null; });
  return { color, plate, decals };
}
const escHtml = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// A decal: a small label in the sticker's colour, its mark in ASCII, a slight tilt (still: it never moves).
const DECAL_MARK = { faction: '##', set: '[]', floor: '\\/', lair: 'x_x', deed: '*' };
export const decalMarkup = (x, i) => `<span class="decal k-${x.kind}" style="--sc:${x.color}" data-slot="${i}" title="${escHtml(x.tip)}"><i aria-hidden="true">${DECAL_MARK[x.kind] || '*'}</i>${escHtml(x.label)}</span>`;
// The chin's two strips of stickers (slots 1–2 left of the plate, 3–4 right of it). Empty when none are placed.
export function decalStrips(s) {
  const L = casingLook(s).decals, side = (a, b) => L.slice(a, b).map((x, k) => (x ? decalMarkup(x, a + k) : '')).join('');
  return { left: side(0, 2), right: side(2, 4) };
}

// ---------- commands ----------
// casing color <name>, casing plate <text>|title <title>|stock, casing sticker <1-4> <sticker>|off. (casing on|off
// is app.js's: the casing itself.)
const plain = (t) => /^[\x20-\x7e]*$/.test(t);
export function casingCommand(s, raw) {
  const words = String(raw).trim().split(/\s+/), verb = (words[1] || '').toLowerCase(), rest = words.slice(2).join(' ');
  const C = cosmeticsOf(s);
  if (!verb) return emit(s, 'info', `Casing: ${COLORWAYS[C.case].name}, plate ${casingLook(s).plate}, ${C.decals.filter(Boolean).length} of ${CASING.slots} stickers. casing color|plate|sticker`);
  if (verb === 'color' || verb === 'colour') {
    const want = rest.toLowerCase(), id = COLORWAY_IDS.find((k) => k === want || COLORWAYS[k].name.toLowerCase() === want);
    if (!id) return warn(s, `No colourway called ${rest || 'that'}. ${COLORWAY_IDS.join(', ')}.`);
    if (!colorwayOpen(s, id)) { const a = colorwayFrom(id); return warn(s, `${COLORWAYS[id].name} comes with ${a?.hidden ? 'a hidden achievement' : a?.name || 'an achievement'}.`); }
    C.case = id;
    return emit(s, 'info', `Casing: ${COLORWAYS[id].name}.`);
  }
  if (verb === 'plate') {
    const low = rest.toLowerCase();
    if (!rest || low === 'stock' || low === 'off') { C.plate = null; return emit(s, 'info', `Plate: ${CASING.stock}.`); }
    if (low.startsWith('title ')) {
      const q = low.slice(6).trim(), t = (myProfile(s).titles || []).map(titleById).find((x) => x && (x.id === q || x.name.toLowerCase() === q || x.name.toLowerCase().replace(/^(the|of) /, '') === q));
      if (!t) return warn(s, `No title of yours called ${q}. titles lists them.`);
      C.plate = { title: t.id };
      return emit(s, 'info', `Plate: MODEL 7 · ${t.name.toUpperCase()}.`);
    }
    const text = rest.replace(/^text\s+/i, '').replace(/\s+/g, ' ').trim();
    if (!plain(text)) return warn(s, 'Plain keyboard characters only.');
    if (text.length > CASING.plate) return warn(s, `A plate is ${CASING.plate} characters at most.`);
    C.plate = { text };
    return emit(s, 'info', `Plate: ${text.toUpperCase()}.`);
  }
  if (verb === 'sticker') {
    const n = Number(words[2]), what = words.slice(3).join(' ').toLowerCase();
    if (!(n >= 1 && n <= CASING.slots)) return warn(s, `casing sticker <1-${CASING.slots}> <sticker>|off`);
    if (!what || what === 'off' || what === 'none') { C.decals[n - 1] = null; return emit(s, 'info', `Slot ${n} is bare.`); }
    const x = decalsOwned(s).find((d) => d.id === what || d.label.toLowerCase() === what);
    if (!x) return warn(s, `No sticker of yours called ${what}.`);
    C.decals = C.decals.map((id) => (id === x.id ? null : id)); // one place each
    C.decals[n - 1] = x.id;
    return emit(s, 'info', `${x.label} goes on slot ${n}.`);
  }
  return warn(s, 'casing color <name>, casing plate <text>|title <title>|stock, casing sticker <1-4> <sticker>|off');
}
export const unlockedColorways = (s) => COLORWAY_IDS.filter((id) => colorwayOpen(s, id));
