// A room's verb on the rooms map, played over its chip (app.js; each sound is sound.mjs's, timed to match).
//   vault   the *Dial*: its icon's dial clicks three times, the doors part with light behind them, its files fly to
//           your Pack one by one.
//   cache   the *Lid*: the lid on its icon tips up, light comes out, credits and code tick into your Pack. A stash or a
//           hidden room's: the light and the flight.
//   bait    the Lid, then a red canary blinks twice on the chip before the pay ticks in.
//   rest    *Breathe*: the room glows in two slow breaths (its moon swelling) and teal light rises into your Integrity.
//   entry   the files left for you fly into your Pack.
//   key     a guard's vault key rises off its room into your Keys.
//   socket  the program drops into the socket like a cartridge and its light pulses as it boots.
// Drawn in a fixed layer over the page from boxes read once at the start: transforms and opacity only, nothing left
// running after. Screen effects off, Motion off or reduced motion: none (app.js doesn't call it).
const FILE = '<svg viewBox="0 0 14 17" width="14" height="17"><path d="M1 1h8l4 4v11H1z" fill="currentColor" fill-opacity=".18" stroke="currentColor" stroke-width="1.4"/><path d="M9 1v4h4" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
const KEY = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="8" cy="12" r="4"/><path d="M12 12h9M18 12v3M21 12v2"/></svg>';
const MOTE = '<svg viewBox="0 0 6 6" width="6" height="6"><circle cx="3" cy="3" r="3" fill="currentColor"/></svg>';
const BIT = (c) => `<span class="rfx-bit">${c}</span>`;
const DIAL = '<svg style="display:block;overflow:visible" viewBox="8 8 8 8" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><circle cx="12" cy="12" r="4" fill="var(--rfx-fill)"/><path d="M12 8v1.5M12 14.5V16M8 12h1.5M14.5 12H16"/></svg>';
// The vault's beats, in ms (sound.mjs RECIPES.vault keeps the same ones; the others' are written beside each).
export const VAULT = { turn: 240, turns: 3, open: 720, files: 980, gap: 150, fly: 560 };
const AMBER = 'var(--amber)', YOU = 'var(--you)', HOT = 'var(--hot)', NS = 'http://www.w3.org/2000/svg';

const ease = 'cubic-bezier(.2,.7,.2,1)';
const div = (cls, css, html = '') => { const d = document.createElement('div'); d.className = cls; Object.assign(d.style, css); d.innerHTML = html; return d; };
const shown = (els) => els.map((e) => [e, e.getBoundingClientRect()]).find(([, r]) => r.width > 0);
const A = (el, kf, o) => el.animate(kf, { fill: 'forwards', easing: ease, ...o });
const colour = (v, or) => (/^(rgb|#)/.test(v) ? v : or);

// The chip on screen: its outline's box, its edge's width there, its colours, its icon.
function chipOf(room) {
  const g = shown([...document.querySelectorAll(`#page-view .fp-room[data-room="${CSS.escape(room)}"]`)])?.[0], body = g?.querySelector('.fp-body'), r = body?.getBoundingClientRect();
  if (!r?.width) return null;
  const cs = getComputedStyle(body), icon = g.querySelector('.fp-icon');
  const w = (parseFloat(cs.strokeWidth) || 3) * (r.width / (body.getBBox().width || r.width));
  return { g, r, w, hue: colour(cs.stroke, '#ffe066'), fill: colour(cs.fill, g.classList.contains('here') ? '#122c27' : '#16100a'), icon: icon && { el: icon, r: icon.getBoundingClientRect() } };
}
// A layer over the chip, its outline's box with the edge centred on it, that the effect draws in.
function layerOf(c) {
  const { r, w } = c, layer = div('rfx', { left: `${r.left - w / 2}px`, top: `${r.top - w / 2}px`, width: `${r.width + w}px`, height: `${r.height + w}px`, color: c.hue });
  layer.style.setProperty('--rfx-fill', c.fill); layer.style.setProperty('--rfx-w', `${w}px`);
  document.body.append(layer);
  return layer;
}
const glowIn = (layer, color, frames, o) => { const g = div('rfx-glow', color ? { color } : {}); layer.prepend(g); A(g, frames.map((opacity) => ({ opacity })), o); };
const iconBox = (c, k = 1) => { const ir = c.icon.r, s = ir.width * k; return { left: `${ir.left - c.r.left + c.w / 2 + (ir.width - s) / 2}px`, top: `${ir.top - c.r.top + c.w / 2 + (ir.height - s) / 2}px`, width: `${s}px`, height: `${s}px` }; };
// The room's icon drawn again in its place (the map's own hidden till the effect ends), the parts that move in a group
// of their own.
function iconOver(c, layer, moves) {
  const sym = c.icon && document.getElementById(c.icon.el.getAttribute('href')?.slice(1) || '');
  if (!sym) return null;
  const box = div('rfx-icon', iconBox(c)), svg = document.createElementNS(NS, 'svg'), g = document.createElementNS(NS, 'g');
  for (const k of ['viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin']) if (sym.getAttribute(k)) svg.setAttribute(k, sym.getAttribute(k));
  svg.innerHTML = sym.innerHTML;
  const parts = [...svg.querySelectorAll('path, rect, circle')].filter(moves);
  if (!parts.length) return null;
  svg.append(g); for (const p of parts) g.append(p);
  g.style.transformBox = 'fill-box';
  box.append(svg); layer.append(box);
  const el = c.icon.el;
  el.style.visibility = 'hidden';
  layer.restore = () => { el.style.visibility = ''; };
  return g;
}
const centre = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
// The stat takes it: a little bump (found fresh: a redraw may have replaced it).
const bump = (sel) => { for (const p of document.querySelectorAll(`#page-view ${sel}`)) p.animate([{ transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 260, easing: ease }); };
// Something flies off the chip to a stat in the strip (or rises and fades, if the stat isn't there), and the stat bumps.
function fly(from, sel, html, color, { delay = 0, dur = 520, lift = 40, size = [0.4, 1.1, 0.6] } = {}) {
  const t = shown([...document.querySelectorAll(`#page-view ${sel}`)])?.[1], to = t ? centre(t) : { x: from.x, y: from.y - 60 }, dx = to.x - from.x;
  const f = div('rfx-fly', { color }, html), at = (x, y, k) => `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${k})`;
  document.body.append(f);
  f.animate([
    { transform: at(from.x, from.y, size[0]), opacity: 0 },
    { transform: at(from.x + dx * 0.25, from.y - lift, size[1]), opacity: 1, offset: 0.35 },
    { transform: at(to.x, to.y, size[2]), opacity: 0.9, offset: 0.92 },
    { transform: at(to.x, to.y, 0.3), opacity: 0 },
  ], { duration: dur, delay, easing: 'cubic-bezier(.45,0,.3,1)', fill: 'both' }).finished.then(() => { f.remove(); if (t) bump(sel); }, () => f.remove());
}
const gone = (layer, ms) => setTimeout(() => { layer.restore?.(); layer.remove(); }, ms);
const mouth = (c) => ({ x: c.r.left + c.r.width / 2, y: c.r.top + c.r.height / 2 - 8 });

function vault(c, n) {
  const layer = layerOf(c), doorL = div('rfx-door l', {}), doorR = div('rfx-door r', {});
  layer.append(doorL, doorR);
  glowIn(layer, AMBER, [0, 1, 0], { duration: 1400, delay: VAULT.open });
  if (c.icon) {
    const dial = div('rfx-dial', iconBox(c, 1 / 3), DIAL); // the icon's dial: at its middle, a third of it across
    layer.append(dial);
    let a = 0;
    [70, -50, 110].forEach((d, i) => { const from = a; a += d; A(dial, [{ transform: `rotate(${from}deg)` }, { transform: `rotate(${a}deg)` }], { duration: 170, delay: i * VAULT.turn }); });
    A(dial, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, delay: VAULT.open + 300 });
  }
  for (const [d, x] of [[doorL, -7], [doorR, 7]]) A(d, [{ transform: 'translateX(0)' }, { transform: `translateX(${x}px)`, opacity: 0.8 }, { transform: `translateX(${x}px)`, opacity: 0 }], { duration: 1300, delay: VAULT.open });
  for (let i = 0; i < Math.max(1, Math.min(4, n)); i++) fly(mouth(c), '.fp-packstat', FILE, AMBER, { delay: VAULT.files + i * VAULT.gap, dur: VAULT.fly });
  gone(layer, VAULT.open + 1500);
}
// A cache: the lid tips back about its left end, short of the chip's edge (0.2 s); the pay flies from 0.2 s (a bait's
// canary blinks from 0.16 s and its pay flies from 0.64 s), 110 ms apart, each 480 ms.
function cache(c, { bait = false, lidded = true } = {}) {
  const layer = layerOf(c), lid = lidded ? iconOver(c, layer, (p) => p.getAttribute('d') === 'M2 5h20v3H2Z') : null;
  if (lid) { lid.style.transformOrigin = '0% 100%'; A(lid, [{ transform: 'rotate(0)' }, { transform: 'rotate(-13deg)' }], { duration: 260 }); }
  if (bait) glowIn(layer, HOT, [0, 1, 0, 1, 0], { duration: 420, delay: 160, easing: 'linear' });
  else glowIn(layer, AMBER, [0, 1, 0], { duration: 900 });
  const items = bait ? ['¢', '01'] : ['¢', '¢', '¢', '01'], at = bait ? 640 : 200;
  items.forEach((x, i) => fly(mouth(c), '.fp-packstat', BIT(x), AMBER, { delay: at + i * 110, dur: 480, lift: 36 }));
  gone(layer, at + items.length * 110 + 900);
}
// A rest: two breaths over 1.9 s; six motes rise into your Integrity from 0.3 s, 200 ms apart.
function rest(c) {
  const layer = layerOf(c), moon = c.g.classList.contains('k-rest') ? iconOver(c, layer, () => true) : null;
  glowIn(layer, null, [0, 1, 0.2, 1, 0], { duration: 1900, easing: 'ease-in-out' });
  if (moon) { moon.style.transformOrigin = '50% 50%'; A(moon, [1, 1.12, 1, 1.12, 1].map((k) => ({ transform: `scale(${k})` })), { duration: 1900, easing: 'ease-in-out' }); }
  const m = mouth(c);
  for (let i = 0; i < 6; i++) fly({ x: m.x + (i - 2.5) * 9, y: m.y - 8 }, '.fp-sig .sigbar', MOTE, YOU, { delay: 300 + i * 200, dur: 700, lift: 24, size: [0.5, 1, 0.6] });
  gone(layer, 2100);
}
// A socket: the cartridge drops in (0.66 s), the light pulses from 0.4 s.
function socket(c) {
  const layer = layerOf(c), cart = div('rfx-cart', c.icon ? iconBox(c, 0.55) : { left: '40%', top: '35%', width: '20%', height: '30%' });
  layer.append(cart);
  A(cart, [{ transform: 'translateY(-26px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1, offset: 0.6 }, { transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(0)', opacity: 0 }], { duration: 1100, easing: 'cubic-bezier(.5,0,.9,.5)' });
  glowIn(layer, null, [0, 0.6, 0.3, 0.9, 0], { duration: 900, delay: 400 });
  gone(layer, 1400);
}

// Play a room's verb over its chip. fx: { kind, room, n?, lid? } (floorplan.mjs tags the event that says it).
export function playRoomFx(fx) {
  const c = chipOf(fx.room);
  if (!c) return;
  const n = Math.max(1, Math.min(4, fx.n || 1));
  if (fx.kind === 'vault') vault(c, n);
  else if (fx.kind === 'cache' || fx.kind === 'bait') cache(c, { bait: fx.kind === 'bait', lidded: fx.lid !== false });
  else if (fx.kind === 'rest') rest(c);
  else if (fx.kind === 'entry') for (let i = 0; i < n; i++) fly(mouth(c), '.fp-packstat', FILE, AMBER, { delay: i * 150, dur: 560 }); // 150 ms apart, each 560 ms
  else if (fx.kind === 'key') fly(mouth(c), '.fp-keys', KEY, '#ffe066', { dur: 800, lift: 50, size: [0.6, 1.4, 0.7] }); // lands at 0.8 s
  else if (fx.kind === 'socket') socket(c);
}
