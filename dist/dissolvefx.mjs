// A broken part's 1s and 0s, drawn on one canvas laid over the part for the length of the effect (hitfx.mjs dissolve;
// docs/performance-plan.md batch 4). Each glyph runs the keyframes the old one-element-per-glyph version ran (its
// opacity, colour and drift, eased out over its own length) and flickers on the same timers; a glyph is drawn from a
// sprite of that character in that colour with its glow baked in, so a frame is only image copies. One loop draws every
// dissolve under way. Its clock is a do-nothing animation on the canvas, so slow motion (app.js slowmo, which sets every
// animation's playbackRate) slows it with the rest; the canvas goes when that animation ends.
const GLOW = 6, GLOW_RGBA = 'rgba(241, 185, 47, 0.7)'; // the glow the old per-glyph spans had (a 6 px text-shadow)
const live = new Set();
let looping = false, idle = 0;

// CSS ease-out, cubic-bezier(0, 0, 0.58, 1), as a table (solved for x once by halving, read with a straight line
// between steps).
const EASE = (() => {
  const N = 256, out = new Float32Array(N + 1), bx = (t) => 3 * (1 - t) * t * t * 0.58 + t * t * t, by = (t) => 3 * (1 - t) * t * t + t * t * t;
  for (let i = 0; i <= N; i++) { let lo = 0, hi = 1; for (let j = 0; j < 30; j++) { const m = (lo + hi) / 2; if (bx(m) < i / N) lo = m; else hi = m; } out[i] = by((lo + hi) / 2); }
  return out;
})();
export function easeOut(x) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const f = x * 256, i = f | 0;
  return EASE[i] + (EASE[i + 1] - EASE[i]) * (f - i);
}
// A property's value at offset p from its keyframes [[offset, value]...] (sorted; numbers).
export function at(keys, p) {
  if (p <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const o1 = keys[i][0];
    if (p <= o1) { const o0 = keys[i - 1][0], v0 = keys[i - 1][1]; return o1 > o0 ? v0 + (keys[i][1] - v0) * (p - o0) / (o1 - o0) : keys[i][1]; }
  }
  return keys[keys.length - 1][1];
}
// The same for a colour's keyframes ([[offset, [r, g, b]]...]), as one number: each channel rounded to a step of 12
// (22 steps), so a fade shares its sprites.
export function colourAt(keys, p) {
  let i = 1;
  while (i < keys.length - 1 && p > keys[i][0]) i++;
  const [o0, c0] = keys[i - 1], [o1, c1] = keys[i], k = p <= o0 ? 0 : p >= o1 ? 1 : (p - o0) / (o1 - o0);
  const q = (j) => Math.round((c0[j] + (c1[j] - c0[j]) * k) / 12);
  return (q(0) * 22 + q(1)) * 22 + q(2);
}

let probe;
export function rgbOf(color) { // any CSS colour as [r, g, b]
  probe = probe || document.createElement('canvas').getContext('2d');
  probe.fillStyle = '#000'; probe.fillStyle = color;
  const s = probe.fillStyle;
  if (s[0] === '#') return [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  return (s.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
}

// Sprites: a character in a font and colour, with its glow, at the screen's pixel density, keyed by one number, packed
// in rows on small atlas pages (a canvas each cost more to make than all the drawing; one big atlas is copied whole
// whenever it is drawn into after being drawn from, so a frame makes its new sprites first, then draws). The pages
// start over when the density changes or they grow past a few.
const fonts = new Map(), PAGE = 512;
let pages = [], sprites = new Map(), spriteK = 0, at0 = { x: 0, y: 0, h: 0 };
function page() {
  const cv = document.createElement('canvas'); cv.width = cv.height = PAGE;
  pages.push({ cv, ctx: cv.getContext('2d') }); at0 = { x: 0, y: 0, h: 0 };
}
function restart(k) { pages = []; sprites = new Map(); spriteK = k; page(); }
function sprite(g, colour, k) {
  if (k !== spriteK || pages.length > 12) restart(k);
  const key = (g.fid * 65536 + g.ch.charCodeAt(0)) * 10648 + colour;
  let s = sprites.get(key);
  if (s) return s;
  const rgb = [Math.floor(colour / 484), Math.floor(colour / 22) % 22, colour % 22].map((v) => Math.min(255, v * 12));
  const pad = Math.ceil((GLOW * 1.3 + 1) * k);
  let pg = pages[pages.length - 1].ctx;
  pg.setTransform(1, 0, 0, 1, 0, 0); pg.font = g.font;
  const m = pg.measureText(g.ch), w = Math.min(PAGE, Math.ceil(m.width * k) + pad * 2), h = Math.min(PAGE, Math.ceil(g.size * 1.3 * k) + pad * 2);
  if (at0.x + w > PAGE) at0 = { x: 0, y: at0.y + at0.h, h: 0 };
  if (at0.y + h > PAGE) { page(); pg = pages[pages.length - 1].ctx; pg.font = g.font; }
  s = { cv: pages[pages.length - 1].cv, x: at0.x, y: at0.y, w, h };
  at0.x += w; at0.h = Math.max(at0.h, h);
  pg.textAlign = 'center'; pg.textBaseline = 'alphabetic';
  pg.fillStyle = `rgb(${rgb})`;
  pg.shadowColor = GLOW_RGBA; pg.shadowBlur = GLOW * k;
  pg.setTransform(k, 0, 0, k, s.x + w / 2, s.y + h / 2);
  const asc = m.fontBoundingBoxAscent ?? g.size * 0.8, desc = m.fontBoundingBoxDescent ?? g.size * 0.2;
  pg.fillText(g.ch, 0, (asc - desc) / 2); // the glyph's box centred on (0, 0), like translate(-50%, -50%) on its span
  sprites.set(key, s);
  return s;
}

// glyphs: [{ x, y, ch, font, size, dur, o: keys, c: keys, dx: keys, dy: keys, flick: { every, from, odds } }] in the
// layer's px. scale: the layer's px to the screen's CSS px (the casing's transform).
export function drawDissolve(layer, glyphs, scale = 1) {
  if (!glyphs.length) return null;
  const k = scale * (window.devicePixelRatio || 1), P = 22;
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity;
  for (const g of glyphs) {
    const ex = g.x + g.dx[g.dx.length - 1][1], ey = g.y + g.dy[g.dy.length - 1][1];
    l = Math.min(l, g.x, ex); r = Math.max(r, g.x, ex); t = Math.min(t, g.y, ey); b = Math.max(b, g.y, ey);
  }
  l -= P; t -= P; r += P; b += P;
  const cv = document.createElement('canvas');
  cv.className = 'fx-dissolve';
  Object.assign(cv.style, { left: l + 'px', top: t + 'px', width: r - l + 'px', height: b - t + 'px' });
  cv.width = Math.min(4096, Math.ceil((r - l) * k)); cv.height = Math.min(4096, Math.ceil((b - t) * k));
  layer.appendChild(cv);
  const dur = Math.max(...glyphs.map((g) => g.dur));
  const clock = cv.animate([{ opacity: 1 }, { opacity: 1 }], { duration: dur });
  const d = { cv, ctx: cv.getContext('2d'), glyphs, clock, dur, k, l, t, born: performance.now() };
  for (const g of glyphs) { g.tick = 0; g.fid = fonts.get(g.font) ?? fonts.set(g.font, fonts.size).get(g.font); }
  live.add(d);
  const done = () => { live.delete(d); cv.remove(); };
  clock.finished.then(done, done);
  draw(d, performance.now());
  if (!looping) { looping = true; requestAnimationFrame(loop); }
  return d;
}

function loop(now) {
  for (const d of live) draw(d, now);
  if (live.size) return requestAnimationFrame(loop);
  looping = false;
  clearTimeout(idle); idle = setTimeout(() => { if (!live.size) { pages = []; sprites = new Map(); spriteK = 0; } }, 10000); // its memory back once the fight is quiet
}
function draw(d, now) {
  const { ctx, cv, k } = d, time = d.clock.currentTime ?? d.dur, real = now - d.born, todo = d.todo || (d.todo = []);
  todo.length = 0;
  for (const g of d.glyphs) { // first every glyph's state and sprite (making any new ones), then the drawing
    if (time >= g.dur) continue;
    const f = g.flick, n = Math.floor(real / f.every); // the old per-glyph timers, on the clock (not slowed, as theirs weren't)
    if (n > g.tick) { g.tick = n; if (real >= f.from && Math.random() < f.odds) g.ch = f.odds < 1 ? (g.ch === '0' ? '1' : '0') : Math.random() < 0.5 ? '0' : '1'; }
    const p = easeOut(time / g.dur), a = at(g.o, p);
    if (a < 0.004) continue;
    todo.push(sprite(g, colourAt(g.c, p), k), Math.min(1, a), (g.x + at(g.dx, p) - d.l) * k, (g.y + at(g.dy, p) - d.t) * k);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cv.width, cv.height);
  for (let i = 0; i < todo.length; i += 4) {
    const s = todo[i];
    ctx.globalAlpha = todo[i + 1];
    ctx.drawImage(s.cv, s.x, s.y, s.w, s.h, todo[i + 2] - s.w / 2, todo[i + 3] - s.h / 2, s.w, s.h);
  }
}
