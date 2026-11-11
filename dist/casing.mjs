// Casing cosmetics: the monitor around the screen, made yours. Only ever the casing (the bezel, its plate and its
// stickers), never the screen: the game's colours, text and layout don't change, nothing covers the glass, the lamps
// or the knobs, and nothing moves (but a desk mug's steam, with Motion on). Rewards from achievements (achievements.mjs),
// cosmetic only. Below the casing's own: the window's district and the desk's props (the end of this file).
//   colourway  the casing's plastic (CSS variables on body.cased[data-case]: casing.css). Stock is today's dark grey;
//              each other one comes with an achievement.
//   plate      the badge on the chin: BLACKBOX · MODEL 7 (stock), MODEL 7 · <a title you've earned>, or your own text
//              (16 plain characters at most, shown in capitals).
//   stickers   every sticker you've earned (profile.mjs stickers, an achievement's reward), a small decal in its
//              colour, anywhere on the plastic: the top, either side or the chin. They may overlap each other, never
//              the glass, the knobs, the plate or the lamps. Dragged into place on Rig → Casing.
// Saved on s.cosmetics = { case, plate: null | { title } | { text }, stickers: [{ id, side, u, v }], district?,
// props?: [{ id, on, u }] }; an older save has none and shows the stock casing (its four chin slots and two desk spots
// are read as places: stuck() and stood()). System → Casing turns it all off with the casing (app.js casing()); phones never show it.
import { emit, warn } from './combat.mjs';
import { earned, achievements } from './achievements.mjs';
import { titleById, myProfile, stickerById } from './profile.mjs';
import { DISTRICTS, DISTRICT_IDS } from './districts.mjs';

export const CASING = { plate: 16, stock: 'BLACKBOX · MODEL 7' };
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
  C.stickers = stuck(C); delete C.decals; // an older save's four slots, converted once
  if (C.props) C.props = stood(C);
  return C;
}
// Where a sticker is: a side of the casing, how far along it (u, 0–1) and, on the chin, how far down (v, 0–1).
export const SIDES = ['top', 'left', 'right', 'chin'];
const unit = (v, d = 0.5) => (v != null && v !== '' && Number.isFinite(Number(v)) ? Math.max(0, Math.min(1, Number(v))) : d);
const once = (list) => list.filter((x, i) => list.findIndex((y) => y.id === x.id) === i); // one place each
const SLOT_U = [0.2, 0.32, 0.68, 0.8]; // where an older save's four chin slots were
// The stickers as saved, whatever the save's age (pure, so a view can read it): [{ id, side, u, v }], the last on top.
function stuck(C) {
  if (Array.isArray(C?.stickers)) return once(C.stickers.filter((x) => x && typeof x.id === 'string').map((x) => ({ id: x.id, side: SIDES.includes(x.side) ? x.side : 'chin', u: unit(x.u), v: unit(x.v) })));
  return once((Array.isArray(C?.decals) ? C.decals : []).map((id, i) => (typeof id === 'string' ? { id, side: 'chin', u: SLOT_U[i] ?? 0.5, v: 0.5 } : null)).filter(Boolean));
}
// The props as saved: [{ id, on: 'desk' | 'top', u }]. An older save's two spots were the desk's left and right.
function stood(C) {
  return once((Array.isArray(C?.props) ? C.props : []).map((p, i) => (typeof p === 'string' ? { id: p, on: 'desk', u: i ? 0.79 : 0.11 } : p && typeof p.id === 'string' ? { id: p.id, on: p.on === 'top' ? 'top' : 'desk', u: unit(p.u) } : null)).filter(Boolean));
}
const r4 = (v) => Math.round(unit(v) * 1e4) / 1e4;
// Put a sticker of yours somewhere (or move it): it goes on top of the others. False when it isn't yours.
export function placeSticker(s, id, pos = {}) {
  if (!decalsOwned(s).some((x) => x.id === id)) return false;
  const C = cosmeticsOf(s);
  C.stickers = [...C.stickers.filter((x) => x.id !== id), { id, side: SIDES.includes(pos.side) ? pos.side : 'chin', u: r4(pos.u), v: r4(pos.v) }];
  return true;
}
export function placeProp(s, id, pos = {}) {
  if (!propOpen(s, id)) return false;
  const C = cosmeticsOf(s);
  C.props = [...stood(C).filter((x) => x.id !== id), { id, on: pos.on === 'top' ? 'top' : 'desk', u: r4(pos.u) }];
  return true;
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
  const decals = stuck(C).filter((x) => owned.has(x.id) && stickerById(x.id)).map((x) => ({ ...stickerById(x.id), side: x.side, u: x.u, v: x.v }));
  return { color, plate, decals };
}
const escHtml = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// A decal: a small label in the sticker's colour, its mark in ASCII (still: it never moves).
const DECAL_MARK = { faction: '##', set: '[]', floor: '\\/', lair: 'x_x', deed: '*' };
export const decalMarkup = (x) => `<span class="decal k-${x.kind}" style="--sc:${x.color}" data-sticker="${escHtml(x.id)}" title="${escHtml(x.tip)}"><i aria-hidden="true">${DECAL_MARK[x.kind] || '*'}</i>${escHtml(x.label)}</span>`;

// ---------- commands ----------
// casing color <name>, casing plate <text>|title <title>|stock, casing sticker <sticker> [top|left|right|chin [0-100
// [0-100]]]|off, casing prop <prop> [desk|top [0-100]]|off. (casing on|off is app.js's: the casing itself.)
const USAGE = 'casing color <name>, casing plate <text>|title <title>|stock, casing sticker <sticker> [top|left|right|chin]|off, casing prop <prop> [desk|top]|off';
const NEW_U = [0.22, 0.74, 0.3, 0.66, 0.16, 0.8, 0.36, 0.6], NEW_PROP_U = [0.11, 0.79, 0.05, 0.9, 0.6, 0.7]; // where a new one lands
const pct = (w, d) => (w != null && /^\d+(\.\d+)?$/.test(w) ? Number(w) / 100 : d);
const plain = (t) => /^[\x20-\x7e]*$/.test(t);
export function casingCommand(s, raw) {
  const words = String(raw).trim().split(/\s+/), verb = (words[1] || '').toLowerCase(), rest = words.slice(2).join(' ');
  const C = cosmeticsOf(s);
  if (!verb) return emit(s, 'info', `Casing: ${COLORWAYS[C.case].name}, plate ${casingLook(s).plate}, ${casingLook(s).decals.length} stickers, ${propsLook(s).length} props. casing color|plate|sticker|prop`);
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
  const w = words.slice(2).map((x) => x.toLowerCase()), off = ['off', 'none'].includes(w.at(-1));
  if (off) w.pop();
  if (verb === 'prop' || verb === 'props') {
    if (off && !w.length) { C.props = []; return emit(s, 'info', 'The desk is bare.'); }
    const at = w.findIndex((x) => x === 'top' || x === 'desk'), what = (at < 0 ? w : w.slice(0, at)).join(' ');
    if (!what) return warn(s, 'casing prop <prop> [desk|top]|off');
    const id = PROP_IDS.find((k) => k === what || PROPS[k].name.toLowerCase() === what || PROPS[k].name.toLowerCase().split(' ').includes(what));
    if (!id) return warn(s, `No prop called ${what}. ${PROP_IDS.map((k) => PROPS[k].name).join(', ')}.`);
    if (!propOpen(s, id)) return warn(s, `The ${PROPS[id].name.toLowerCase()} comes with ${comesWith(propFrom(id), false)}.`);
    const now = stood(C), was = now.find((x) => x.id === id);
    if (off) { C.props = now.filter((x) => x.id !== id); return emit(s, 'info', `The ${PROPS[id].name.toLowerCase()} comes off.`); }
    const on = at < 0 ? was?.on || 'desk' : w[at];
    placeProp(s, id, { on, u: pct(w[at + 1], at < 0 && was ? was.u : NEW_PROP_U[now.length % NEW_PROP_U.length]) });
    return emit(s, 'info', `${PROPS[id].name} on ${on === 'top' ? 'top of the monitor' : 'the desk'}.`);
  }
  if (verb === 'sticker' || verb === 'stickers') {
    if (off && !w.length) { C.stickers = []; return emit(s, 'info', 'The casing is bare.'); }
    const at = w.findIndex((x) => SIDES.includes(x)), what = (at < 0 ? w : w.slice(0, at)).join(' ');
    if (!what) return warn(s, 'casing sticker <sticker> [top|left|right|chin]|off');
    const x = decalsOwned(s).find((d) => d.id === what || d.label.toLowerCase() === what);
    if (!x) return warn(s, `No sticker of yours called ${what}.`);
    const was = C.stickers.find((d) => d.id === x.id);
    if (off) { C.stickers = C.stickers.filter((d) => d.id !== x.id); return emit(s, 'info', `${x.label} comes off.`); }
    const side = at < 0 ? was?.side || 'chin' : w[at];
    placeSticker(s, x.id, { side, u: pct(w[at + 1], at < 0 && was ? was.u : NEW_U[C.stickers.length % NEW_U.length]), v: pct(w[at + 2], at < 0 && was ? was.v : 0.5) });
    return emit(s, 'info', `${x.label} goes on the ${side === 'left' || side === 'right' ? `${side} side` : side}.`);
  }
  return warn(s, USAGE);
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

// The props: small things that stand on the desk or on top of the monitor, anywhere along either, each from an
// achievement (reward.prop). Drawn as small inline pictures (no canvas), still, but for the mug's steam while Motion is
// on. Saved as s.cosmetics.props [{ id, on, u }]; none is the bare desk, as it always was.
export const PROPS = {
  mug: { name: 'Coffee mug', tip: 'A chipped mug, still warm. It steams while Motion is on.' },
  duck: { name: 'Rubber duck', tip: 'Explain your code to it, line by line.' },
  keycard: { name: 'Keycard', tip: 'A hub keycard on its lanyard.' },
  cactus: { name: 'Cactus', tip: 'Needs nothing, and nothing gets near it.' },
  floppies: { name: 'Floppy stack', tip: 'Three disks, labelled in marker.' },
  die: { name: 'Lucky die', tip: 'It comes up six when it matters.' },
};
export const PROP_IDS = Object.keys(PROPS);
export const propFrom = (id) => achievements().find((a) => a.reward?.prop === id) || null;
export const propOpen = (s, id) => !!PROPS[id] && !!propFrom(id) && earned(s, propFrom(id).id);
export const propsOwned = (s) => PROP_IDS.filter((id) => propOpen(s, id));
// What stands where (read only): [{ id, name, tip, on, u }].
export const propsLook = (s) => stood(s?.cosmetics).filter((p) => propOpen(s, p.id)).map((p) => ({ ...p, ...PROPS[p.id] }));
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
export const propMarkup = (p) => `<span class="prop p-${p.id}" data-prop="${p.id}" title="${escHtml(`${p.name}. ${p.tip}`)}">${propSvg(p.id)}</span>`;

// ---------- where things sit (pure, so a test can hold them to the rule) ----------
// m: the page { W, H } and the screen's margins on it { top, side, chin, desk } (the body's padding: the glass is the
// box inside them), win: the window is showing. keep: the rects of the knobs, the plate and the lamps.
// The plastic a sticker can sit on round the glass: the bezel (14px over it, 18px either side) and a little of its rim.
export const FRAME = { t: 20, s: 24, corner: 22, rim: 22 };
const glassOf = (m) => ({ left: m.side, top: m.top, right: m.W - m.side, bottom: m.H - m.chin - m.desk });
const clamp = (v, a, b) => (a > b ? (a + b) / 2 : Math.max(a, Math.min(b, v)));
const runOf = (g) => [g.left - FRAME.s + FRAME.corner, g.right + FRAME.s - FRAME.corner]; // the top's and the chin's length, short of the corners
// A centre moved off every kept span, inside lo–hi: the nearest place in a gap wide enough to hold it.
function clearOf(cx, half, spans, lo, hi) {
  let best = null, from = lo + half;
  const offer = (a, b) => { if (b < a) return; const c = clamp(cx, a, b); if (best == null || Math.abs(c - cx) < Math.abs(best - cx)) best = c; };
  for (const [a, b] of [...spans].sort((p, q) => p[0] - q[0])) { offer(from, Math.min(a - half, hi - half)); from = Math.max(from, b + half); }
  offer(from, hi - half);
  return best ?? clamp(cx, lo + half, hi - half);
}
const spansOf = (keep, pad) => keep.map((r) => [r.left - pad, r.right + pad]);
// A chin sticker's slight tilt, its own for good. The thin top and sides have no room for one.
export const stickerTilt = (id) => (([...String(id)].reduce((a, c) => a + c.charCodeAt(0), 0) % 7) - 3) * 0.9;
// Where a sticker { id, side, u, v } of size { w, h } is drawn: its box's top left (x, y) before it turns, its centre,
// the room it takes once turned (bw × bh) and its turn in degrees. Always wholly on the plastic.
export function stickerSpot(m, keep, st, size) {
  const g = glassOf(m), up = st.side === 'left' || st.side === 'right', bw = up ? size.h : size.w, bh = up ? size.w : size.h, [x0, x1] = runOf(g);
  let cx, cy, rot = 0;
  if (st.side === 'top') { cx = clamp(x0 + st.u * (x1 - x0), x0 + bw / 2, x1 - bw / 2); cy = g.top - FRAME.t / 2; }
  else if (up) { cx = st.side === 'left' ? g.left - FRAME.s / 2 : g.right + FRAME.s / 2; cy = clamp(g.top + st.u * (g.bottom - g.top), g.top + 6 + bh / 2, g.bottom - 6 - bh / 2); rot = st.side === 'left' ? -90 : 90; }
  else { const y0 = g.bottom + 4 + bh / 2, y1 = g.bottom + m.chin - 12 - bh / 2; cy = clamp(y0 + st.v * (y1 - y0), y0, y1); cx = clearOf(x0 + st.u * (x1 - x0), bw / 2, spansOf(keep, 6), x0, x1); rot = stickerTilt(st.id); }
  return { x: cx - size.w / 2, y: cy - size.h / 2, cx, cy, bw, bh, rot };
}
// The place a sticker dragged to (px, py) takes: the side under the pointer, or the nearest one from over the glass.
export function stickerAt(m, px, py, size) {
  const g = glassOf(m), [x0, x1] = runOf(g);
  let side;
  if (py >= g.bottom) side = 'chin'; else if (py <= g.top) side = 'top'; else if (px <= g.left) side = 'left'; else if (px >= g.right) side = 'right';
  else { const d = { top: py - g.top, chin: g.bottom - py, left: px - g.left, right: g.right - px }; side = SIDES.reduce((a, b) => (d[b] < d[a] ? b : a)); }
  if (side === 'left' || side === 'right') return { side, u: unit((py - g.top) / (g.bottom - g.top)), v: 0.5 };
  const y0 = g.bottom + 4 + size.h / 2, y1 = g.bottom + m.chin - 12 - size.h / 2;
  return { side, u: unit((px - x0) / (x1 - x0)), v: side === 'chin' ? unit((py - y0) / Math.max(1, y1 - y0)) : 0.5 };
}
// Whether a prop can stand on top of the monitor: only with the window, and room over the frame for it.
const roofOf = (m) => (m.win && m.top - FRAME.rim >= PROP_BOX.h - 4 ? m.top - FRAME.rim : 0);
const deskOf = (m) => m.desk >= PROP_BOX.h + 2;
// Where a prop { on, u } stands ({ x, y, w, h, on }): on top of the monitor when there's room over it; else on the desk
// under the monitor (clear of the keyboard, the monitor's foot and its cable, as window.mjs draws them); else, with no
// desk, on the chin, clear of the knobs, the plate and the lamps.
export function propSpot(m, keep, p) {
  const { w, h } = PROP_BOX, g = glassOf(m), [x0, x1] = runOf(g), roof = roofOf(m);
  if (p.on === 'top' && roof) return { x: Math.round(clamp(x0 + p.u * (x1 - x0), x0 + w / 2, x1 - w / 2) - w / 2), y: roof - h + 2, w, h, on: 'top' };
  if (deskOf(m)) {
    const fw = Math.min(260, m.W * 0.14), cx = clearOf(p.u * m.W, w / 2, [[m.W * 0.2 - 6, m.W * 0.4 + 6], [m.W / 2 - fw / 2 - 6, m.W / 2 + fw * 1.2 + 6]], 8, m.W - 8);
    return { x: Math.round(cx - w / 2), y: m.H - m.desk + (m.desk - h) / 2, w, h, on: 'desk' };
  }
  return { x: Math.round(clearOf(x0 + p.u * (x1 - x0), w / 2, spansOf(keep, 14), x0, x1) - w / 2), y: g.bottom + (m.chin - h) / 2, w, h, on: 'desk' };
}
// The place a prop dragged to (px, py) takes: the top from the screen's upper half (when it can stand there), else the desk.
export function propAt(m, px, py) {
  const g = glassOf(m), [x0, x1] = runOf(g);
  if (roofOf(m) && py < (g.top + g.bottom) / 2) return { on: 'top', u: unit((px - x0) / (x1 - x0)) };
  return { on: 'desk', u: deskOf(m) ? unit(px / m.W) : unit((px - x0) / (x1 - x0)) };
}
