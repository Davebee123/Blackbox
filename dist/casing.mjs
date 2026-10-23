// Casing cosmetics: the monitor around the screen, made yours. Only ever the casing (the bezel, its plate and its
// stickers), never the screen: the game's colours, text and layout don't change, nothing covers the glass, the lamps
// or the knobs, and nothing moves (but a desk mug's steam, with Motion on). Rewards from achievements (achievements.mjs),
// cosmetic only. Below the casing's own: the window's district and the desk's props (the end of this file).
//   colourway  the casing's plastic (CSS variables on body.cased[data-case]: casing.css). Stock is today's dark grey;
//              each other one comes with an achievement.
//   plate      the badge on the chin: BLACKBOX · MODEL 7 (stock), MODEL 7 · <a title you've earned>, or your own text
//              (16 plain characters at most, shown in capitals).
//   stickers   4 slots on the chin, two either side of the plate, each holding a sticker you've earned (profile.mjs
//              stickers, an achievement's reward) as a small decal in its colour.
// Saved on s.cosmetics = { case, plate: null | { title } | { text }, decals: [id|null ×4], district?, props? [id|null ×2] }; an older save has none and
// shows the stock casing. System → Casing turns it all off with the casing (app.js casing()); phones never show it.
import { emit, warn } from './combat.mjs';
import { earned, achievements } from './achievements.mjs';
import { titleById, myProfile, stickerById } from './profile.mjs';
import { DISTRICTS, DISTRICT_IDS } from './window.mjs';

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
// casing color <name>, casing plate <text>|title <title>|stock, casing sticker <1-4> <sticker>|off, casing prop
// <1-2> <prop>|off. (casing on|off is app.js's: the casing itself.)
const plain = (t) => /^[\x20-\x7e]*$/.test(t);
export function casingCommand(s, raw) {
  const words = String(raw).trim().split(/\s+/), verb = (words[1] || '').toLowerCase(), rest = words.slice(2).join(' ');
  const C = cosmeticsOf(s);
  if (!verb) return emit(s, 'info', `Casing: ${COLORWAYS[C.case].name}, plate ${casingLook(s).plate}, ${C.decals.filter(Boolean).length} of ${CASING.slots} stickers, ${propsLook(s).filter(Boolean).length} of ${PROP_SLOTS} props. casing color|plate|sticker|prop`);
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
  if (verb === 'prop') {
    const n = Number(words[2]), what = words.slice(3).join(' ').toLowerCase();
    if (!(n >= 1 && n <= PROP_SLOTS)) return warn(s, `casing prop <1-${PROP_SLOTS}> <prop>|off`);
    C.props = Array.from({ length: PROP_SLOTS }, (_, i) => (Array.isArray(C.props) && C.props[i]) || null);
    if (!what || what === 'off' || what === 'none') { C.props[n - 1] = null; return emit(s, 'info', `The ${n === 1 ? 'left' : 'right'} of the desk is bare.`); }
    const id = PROP_IDS.find((k) => k === what || PROPS[k].name.toLowerCase() === what || PROPS[k].name.toLowerCase().split(' ').includes(what));
    if (!id) return warn(s, `No prop called ${what}. ${PROP_IDS.map((k) => PROPS[k].name).join(', ')}.`);
    if (!propOpen(s, id)) return warn(s, `The ${PROPS[id].name.toLowerCase()} comes with ${comesWith(propFrom(id), false)}.`);
    C.props = C.props.map((x) => (x === id ? null : x)); // one place each
    C.props[n - 1] = id;
    return emit(s, 'info', `${PROPS[id].name} on the ${n === 1 ? 'left' : 'right'} of the desk.`);
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
  return warn(s, 'casing color <name>, casing plate <text>|title <title>|stock, casing sticker <1-4> <sticker>|off, casing prop <1-2> <prop>|off');
}
export const unlockedColorways = (s) => COLORWAY_IDS.filter((id) => colorwayOpen(s, id));

// ---------- the window's district and the desk's props ----------
// The district the window looks out on (window.mjs DISTRICTS): the Sprawl, always open, or one an achievement brought
// (achievements.mjs DECOR_REWARDS, reward.district). Saved as s.cosmetics.district; none, or one not yours, is the
// Sprawl. `district <name>` or System → Settings → Window picks it.
export const districtFrom = (id) => achievements().find((a) => a.reward?.district === id) || null;
export const districtOpen = (s, id) => id === 'sprawl' || (!!DISTRICTS[id] && !!districtFrom(id) && earned(s, districtFrom(id).id));
export const districtOf = (s) => { const id = s?.cosmetics?.district; return id && DISTRICTS[id] && districtOpen(s, id) ? id : 'sprawl'; };
const findDistrict = (q) => { const w = String(q || '').toLowerCase().replace(/^the\s+/, '').trim(); return DISTRICT_IDS.find((k) => k === w || DISTRICTS[k].name.toLowerCase().replace(/^the\s+/, '') === w) || null; };
const comesWith = (a, open) => (a ? `${a.hidden && !open ? 'a hidden achievement' : a.name}` : 'an achievement');
export function districtCommand(s, raw) {
  const rest = String(raw).trim().split(/\s+/).slice(1).join(' ');
  if (!rest) return emit(s, 'info', `Window: ${DISTRICTS[districtOf(s)].name}. Yours: ${DISTRICT_IDS.filter((k) => districtOpen(s, k)).map((k) => DISTRICTS[k].name).join(', ')}. district <name>`);
  const id = findDistrict(rest);
  if (!id) return warn(s, `No district called ${rest}. ${DISTRICT_IDS.map((k) => DISTRICTS[k].name).join(', ')}.`);
  if (!districtOpen(s, id)) return warn(s, `${DISTRICTS[id].name} comes with ${comesWith(districtFrom(id), false)}.`);
  const C = cosmeticsOf(s);
  if (id === 'sprawl') delete C.district; else C.district = id;
  return emit(s, 'info', `Window: ${DISTRICTS[id].name}.`);
}

// The props on the desk: small things that stand in two fixed spots, each from an achievement (reward.prop). Drawn as
// small inline pictures (no canvas), still, but for the mug's steam while Motion is on. Saved as s.cosmetics.props
// [left, right]; none is the bare desk, as it always was.
export const PROPS = {
  mug: { name: 'Coffee mug', tip: 'A chipped mug, still warm. It steams while Motion is on.' },
  duck: { name: 'Rubber duck', tip: 'Explain your code to it, line by line.' },
  keycard: { name: 'Keycard', tip: 'A hub keycard on its lanyard.' },
  cactus: { name: 'Cactus', tip: 'Needs nothing, and nothing gets near it.' },
  floppies: { name: 'Floppy stack', tip: 'Three disks, labelled in marker.' },
  die: { name: 'Lucky die', tip: 'It comes up six when it matters.' },
};
export const PROP_IDS = Object.keys(PROPS);
export const PROP_SLOTS = 2;
export const propFrom = (id) => achievements().find((a) => a.reward?.prop === id) || null;
export const propOpen = (s, id) => !!PROPS[id] && !!propFrom(id) && earned(s, propFrom(id).id);
export const propsOwned = (s) => PROP_IDS.filter((id) => propOpen(s, id));
// What the desk shows (read only): [left, right], each { id, name, tip } or null.
export function propsLook(s) {
  const P = Array.isArray(s?.cosmetics?.props) ? s.cosmetics.props : [];
  return Array.from({ length: PROP_SLOTS }, (_, i) => (P[i] && propOpen(s, P[i]) ? { id: P[i], ...PROPS[P[i]] } : null));
}
// The pictures, 30 × 26, in the casing's warm, dim light. The mug's steam is the only thing that moves (casing.css).
const PROP_SVG = {
  mug: '<path class="steam" d="M11.5 7c-2-2 2-3 0-5"/><path class="steam" d="M15.5 7c-2-2 2-3 0-5"/><path d="M7 9h13v12a3 3 0 0 1-3 3h-7a3 3 0 0 1-3-3z" fill="#5d4232"/><path d="M20 12h2a3 3 0 0 1 0 7h-2" fill="none" stroke="#5d4232" stroke-width="2"/><ellipse cx="13.5" cy="9.5" rx="6.5" ry="1.6" fill="#1c120c"/><path d="M8 11v9" stroke="#8a6a52" stroke-width="1" opacity=".6"/><rect x="5" y="24" width="18" height="1.4" rx=".7" fill="#000" opacity=".5"/>',
  duck: '<ellipse cx="14" cy="19" rx="9" ry="5.5" fill="#d9a63a"/><path d="M5 17c1-3 5-3 7-1" fill="#c8922c"/><circle cx="19" cy="11" r="4.6" fill="#e0b043"/><path d="M23 11.5l4 1-4 1.6z" fill="#d0743a"/><circle cx="20.3" cy="10" r=".9" fill="#1a120c"/><path d="M8 18c3 2 7 2 10 0" fill="none" stroke="#a8782a" stroke-width=".8"/><rect x="5" y="24" width="18" height="1.4" rx=".7" fill="#000" opacity=".5"/>',
  keycard: '<path d="M6 4c0 5 4 8 8 12" fill="none" stroke="#6a5a48" stroke-width="1.2"/><g transform="rotate(-8 15 19)"><rect x="5" y="13" width="20" height="12" rx="1.6" fill="#cfc4ac"/><rect x="5" y="15" width="20" height="2.6" fill="#b8862a"/><rect x="8" y="19.5" width="4" height="3.2" rx=".5" fill="#8a7a5a"/><path d="M14 20h8M14 22.5h6" stroke="#7d7260" stroke-width=".8"/></g>',
  cactus: '<path d="M14 21V7a2.4 2.4 0 0 1 4.8 0v14z" fill="#5f7a42"/><path d="M14 15h-3a2 2 0 0 1-2-2v-3a1.4 1.4 0 0 1 2.8 0v2H14zM18.8 13h2v-2a1.4 1.4 0 0 1 2.8 0v2a2 2 0 0 1-2 2h-2.8z" fill="#55703b"/><path d="M15.6 8v12M17.2 8v12" stroke="#47602f" stroke-width=".5"/><path d="M9.5 20h13.5l-1.6 5H11.1z" fill="#8a5234"/><rect x="9" y="19.4" width="14.5" height="1.8" rx=".5" fill="#9c6040"/>',
  floppies: '<rect x="4" y="19" width="19" height="5" rx=".6" fill="#2f3036"/><rect x="6" y="14.5" width="19" height="5" rx=".6" fill="#4a3c30" transform="rotate(-3 15 17)"/><rect x="5" y="9.5" width="19" height="5" rx=".6" fill="#3b3a3e" transform="rotate(2 14 12)"/><rect x="9" y="9.8" width="7" height="2" fill="#9c9a94" transform="rotate(2 14 12)"/><rect x="16.5" y="10.8" width="6" height="3" fill="#e6dbc2" transform="rotate(2 14 12)"/><rect x="4" y="24" width="20" height="1.4" rx=".7" fill="#000" opacity=".5"/>',
  die: '<g transform="rotate(12 15 17)"><rect x="9" y="11" width="12" height="12" rx="2.4" fill="#e4dccb"/><g fill="#2a1e16"><circle cx="12.3" cy="14.3" r="1"/><circle cx="17.7" cy="14.3" r="1"/><circle cx="12.3" cy="17" r="1"/><circle cx="17.7" cy="17" r="1"/><circle cx="12.3" cy="19.7" r="1"/><circle cx="17.7" cy="19.7" r="1"/></g></g><rect x="8" y="24" width="15" height="1.4" rx=".7" fill="#000" opacity=".5"/>',
};
export const PROP_BOX = { w: 30, h: 26 };
export const propSvg = (id) => `<svg viewBox="0 0 30 26" width="30" height="26" aria-hidden="true">${PROP_SVG[id] || ''}</svg>`;
export const propMarkup = (p, i) => `<span class="prop p-${p.id}" data-prop-slot="${i}" title="${escHtml(`${p.name}. ${p.tip}`)}">${propSvg(p.id)}</span>`;

// Where they stand (pure, so a test can hold it to the rule: never over the knobs, the lamps, the plate, a sticker or
// the screen). m: the viewport { W, H, desk (the desk strip's height, 0 without the window) } and the chin's rects
// { box, knobs, plate, lamps } as getBoundingClientRect gives them; used: which spots hold a prop. With the desk, the
// spots are on it, under the monitor (in the strip below the chin): the left one clear of the keyboard, the right one
// past the cable, where the window's canvas draws nothing on the desk. Without it, they stand on the chin itself, one
// just past the knobs and one just short of the lamps, and the sticker strips then start or end past them (a spot
// with no room before the plate is left empty). Returns the spots ({ x, y, w, h } or null) and the stickers' strip
// ends (--dz-*, from the chin's edges).
export function propLayout(m, used = [false, false]) {
  const { w, h } = PROP_BOX, gap = 18, near = 14, box = m.box;
  const dz = { l0: m.knobs.right - box.left + gap, l1: box.right - m.plate.left + gap, r0: m.plate.right - box.left + gap, r1: box.right - m.lamps.left + gap };
  const spots = [null, null];
  if (m.desk >= h + 2) {
    const y = m.H - m.desk + (m.desk - h) / 2;
    spots[0] = used[0] ? { x: Math.round(m.W * 0.11 - w / 2), y, w, h } : null;
    spots[1] = used[1] ? { x: Math.round(m.W * 0.79 - w / 2), y, w, h } : null;
    return { spots, dz };
  }
  const y = box.top + (box.height - h) / 2;
  if (used[0]) { const x = m.knobs.right + near; if (x + w + near <= m.plate.left) { spots[0] = { x, y, w, h }; dz.l0 = x + w - box.left + gap; } }
  if (used[1]) { const x = m.lamps.left - near - w; if (x - near >= m.plate.right) { spots[1] = { x, y, w, h }; dz.r1 = box.right - x + gap; } }
  return { spots, dz };
}
