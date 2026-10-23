// The room around the monitor (dist/surround.mjs, dist/surround.css): desk, view and void, beside today's city. Only
// ever behind the casing: never an element or a pixel over the screen, defaults unchanged, and still with Motion off or
// reduced motion.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SURROUNDS, SURROUND_IDS, surroundKind, surroundCommand, surroundMarkup, cityMarkup, timeOfDay, viewWeather, createSurround } from './dist/surround.mjs';
import { WEATHER } from './dist/window.mjs';
import { fresh } from './dist/combat.mjs';
import { systemMarkup } from './dist/view.mjs';

const read = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const css = strip(read('./dist/surround.css'));
// Every rule, @media blocks flattened: { sel, body, media }.
function rules(text) {
  const out = [];
  let i = 0;
  const walk = (end, media) => {
    while (i < end) {
      const open = text.indexOf('{', i);
      if (open < 0 || open >= end) { i = end; return; }
      const head = text.slice(i, open).trim();
      let depth = 1, j = open + 1;
      while (depth && j < text.length) { if (text[j] === '{') depth++; else if (text[j] === '}') depth--; j++; }
      if (head.startsWith('@media')) { i = open + 1; walk(j - 1, head); i = j; continue; }
      if (!head.startsWith('@keyframes')) out.push({ sel: head, body: text.slice(open + 1, j - 1), media });
      i = j;
    }
  };
  walk(text.length, null);
  return out;
}
const decls = (body) => body.split(/;(?![^(]*\))/).map((d) => d.trim()).filter(Boolean).map((d) => [d.slice(0, d.indexOf(':')).trim(), d.slice(d.indexOf(':') + 1).trim()]);
const all = rules(css);
const rule = (sel) => all.find((r) => r.sel === sel);

test('the default is today\'s city: no setting, no layer, the same window', () => {
  for (const settings of [fresh().settings, {}, undefined, { room: 'nope' }]) assert.equal(surroundKind(settings), 'city');
  assert.equal(surroundMarkup('city'), '', 'the city draws nothing here: window.mjs keeps it');
  assert.ok(!/surround/.test(read('./dist/index.html').replace(/<link rel="stylesheet" href="surround\.css">/, '')), 'no room element in the page: surround.mjs adds it only when one is picked');
  assert.ok(!/surround/.test(read('./dist/style.css')), 'style.css is as it was');
  // app.js: the canvas runs exactly as before unless another room is picked, and the room needs the window's own conditions.
  const app = read('./dist/app.js');
  assert.match(app, /const room = roomNow\(\), city = win && room === 'city';\n {2}outside\.set\(city\);\n {2}if \(moved && city\) outside\.remeasure\(\);\n {2}surround\.set\(win && room !== 'city' \? room : null\);/);
  assert.match(app, /let roomParam = params\.get\('room'\);/);
  // System → Settings shows Room beside Window, City by default.
  const s = fresh();
  assert.match(systemMarkup(s), /data-run="window off"[^>]*>Window on<\/button>\s*<button type="button" class="btn" data-run="room style next" [^>]*>Room: City<\/button>/);
  s.settings.window = false;
  assert.match(systemMarkup(s), /data-run="room style next" disabled/, 'nothing to show with the window off');
});

test('room style and ?room= pick a room; the city stays unsaved', () => {
  const st = {};
  assert.equal(surroundKind(st, 'a'), 'desk'); assert.equal(surroundKind(st, 'B'), 'view'); assert.equal(surroundKind(st, 'c'), 'void');
  assert.equal(surroundKind({ room: 'void' }, 'current'), 'city'); assert.equal(surroundKind({ room: 'void' }, 'zzz'), 'void');
  assert.equal(surroundCommand(st, 'room style b'), 'Room: View.'); assert.equal(st.room, 'view');
  assert.equal(surroundCommand(st, 'room style next', 'view'), 'Room: Void.'); assert.equal(st.room, 'void');
  assert.equal(surroundCommand(st, 'room style next', 'void'), 'Room: City.'); assert.ok(!('room' in st), 'the default is no setting at all');
  assert.match(surroundCommand(st, 'room style'), /^Room: City\. room style city\|desk\|view\|void$/);
  assert.match(surroundCommand(st, 'room style attic'), /^No room called attic/);
  assert.equal(surroundCommand({ window: false }, 'room style desk'), 'Room: Desk. (Window is off.)');
  assert.equal(surroundCommand(st, 'room'), null, 'room alone is still the back room page');
  assert.deepEqual(SURROUND_IDS, ['city', 'desk', 'view', 'void']);
  for (const k of SURROUND_IDS) assert.ok(SURROUNDS[k].name && SURROUNDS[k].tip);
});

test('nothing goes over the screen: one layer behind the page with the monitor\'s frame cut out of it', () => {
  const S = rule('.surround');
  const d = Object.fromEntries(decls(S.body));
  assert.equal(d.position, 'fixed'); assert.equal(d.inset, '0'); assert.equal(d['z-index'], '-2', 'where the window sits: under the colourway\'s plastic (-1) and the page');
  assert.equal(d['pointer-events'], 'none');
  // The cut-out: the frame (style.css body.cased::before: --top - 14px, --side - 18px, --desk + 8px, radius 26) grown
  // by 4px, so its edge falls in the middle of the frame's 8px rim, which covers the seam in every colourway.
  for (const p of ['mask-position', '-webkit-mask-position']) assert.equal(d[p], 'calc(var(--side) - 22px) calc(var(--top) - 18px), 0 0');
  for (const p of ['mask-size', '-webkit-mask-size']) assert.equal(d[p], 'calc(100% - 2 * var(--side) + 44px) calc(100% - var(--top) - var(--desk) + 14px), 100% 100%');
  assert.match(d.mask, /^url\("data:image\/svg\+xml,[^"]*rect width='100%25' height='100%25' rx='30'[^"]*"\) no-repeat exclude, linear-gradient\(#000 0 0\)$/);
  assert.equal(d['-webkit-mask-composite'], 'xor');
  const style = strip(read('./dist/style.css'));
  assert.match(style, /body\.cased::before \{[^}]*top: calc\(var\(--top\) - 14px\); bottom: calc\(var\(--desk\) \+ 8px\); left: calc\(var\(--side\) - 18px\); right: calc\(var\(--side\) - 18px\); border-radius: 26px;[^}]*0 0 0 8px var\(--case-rim, #0b0a09\)/);
  assert.match(strip(read('./dist/casing.css')), /body\.cased\[data-case\]::after \{[^}]*z-index: -1;/, 'a colourway\'s plastic sits over the room');
  // Every rule styles the layer or something inside it, and only it; the one outside rule shows it.
  for (const r of all) for (const sel of r.sel.split(',').map((x) => x.trim())) {
    if (sel === 'body.cased.window-on > .surround') { assert.equal(r.body.trim(), 'display: block;'); assert.equal(r.media, '@media (min-width: 1700px) and (min-height: 720px)', 'only beside the window\'s margins: never on a phone or a small window'); continue; }
    assert.match(sel, /^(body:not\(\.no-motion\) )?\.surround(\[data-[\w-]+="\w+"\])?( |$)/, `${sel} is inside the room`);
    assert.ok(!/\.app|#crt|#casing|#fx-|\.topbar|\.lamp|\.knob|\.badge|\.decal/.test(sel), `${sel} never styles the screen or the casing`);
  }
  // The pieces that sit near the monitor are held to its margins: the strips end at the rim, the desk starts under it,
  // and the glow is an outer shadow of the frame's own box (it paints nothing inside it).
  for (const [sel, want] of [['.surround .sr-l, .surround .sr-r', ['width: calc(var(--side) - 22px)', 'bottom: var(--desk)', 'overflow: hidden']], ['.surround .sr-f', ['height: calc(var(--desk) + 4px)', 'overflow: hidden']], ['.surround .sr-halo', ['left: calc(var(--side) - 18px)', 'right: calc(var(--side) - 18px)', 'top: calc(var(--top) - 14px)', 'bottom: calc(var(--desk) + 8px)', 'border-radius: 26px']]]) {
    for (const w of want) assert.ok(rule(sel).body.includes(w), `${sel}: ${w}`);
  }
  for (const r of all.filter((x) => /\.sr-halo$/.test(x.sel))) for (const [p] of decls(r.body)) assert.ok(['left', 'right', 'top', 'bottom', 'border-radius', 'box-shadow'].includes(p), `the glow sets ${p}`);
  // The markup: pictures and blocks only, nothing to click or focus, and the layer lives on <body>, never in the screen.
  for (const k of ['desk', 'view', 'void']) {
    const m = surroundMarkup(k);
    assert.ok(m.length > 100);
    assert.ok(!/<(button|a|input|select|textarea|canvas|img|video|iframe)\b|tabindex|onclick|href=/.test(m), `${k}: nothing interactive`);
    for (const [, cls] of m.matchAll(/class="([^"]+)"/g)) assert.match(cls, /^(sr|sd|sv|sc)-[\w-]+( [\w-]+)?$/, `${k}: ${cls}`);
  }
  const src = read('./dist/surround.mjs');
  assert.match(src, /el\.setAttribute\('aria-hidden', 'true'\)/);
  assert.match(src, /document\.body\.prepend\(el\)/);
  assert.ok(!/getContext|createElement\('canvas'\)|pixi|requestAnimationFrame/i.test(src.replace(/^\/\/.*$/gm, '')), 'DOM, CSS and SVG only, and no frame loop');
});

test('neutral darks and the screen\'s amber: no job colour in the room', () => {
  assert.ok(!/var\(--(you|hot|next|daemon|exception|steel|gray|amber)\b/.test(css), 'no tokens: the room never follows a floor or a job');
  const hues = [];
  for (const m of css.matchAll(/#([0-9a-f]{6})\b|rgba?\((\d+), (\d+), (\d+)/gi)) {
    const [r, g, b] = m[1] ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : [m[2], m[3], m[4]].map(Number);
    const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255, l = (max + min) / 2, sat = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
    if (sat < 0.35 || max < 0.2) continue; // a dark or a grey
    const h = max === r / 255 ? (60 * ((g - b) / 255 / (max - min)) + 360) % 360 : max === g / 255 ? 60 * ((b - r) / 255 / (max - min) + 2) : 60 * ((r - g) / 255 / (max - min) + 4);
    hues.push(h);
    assert.ok(h <= 50 || h >= 345, `${m[0]}: warm (amber, sodium, rose), never teal, violet, steel or green (hue ${Math.round(h)})`);
  }
  assert.ok(hues.length > 10, 'the file has its colours');
  for (const hot of ['#ff5b3d', '#29e0d0', '#b36bff', '#7fd1c7']) assert.ok(!css.toLowerCase().includes(hot), `never ${hot}`);
});

test('reduced motion and Motion off hold the room still', () => {
  const moving = all.filter((r) => decls(r.body).some(([p]) => /^(animation|transition|will-change)/.test(p)));
  assert.ok(moving.length >= 3, 'the view\'s smog, hour and haze, and the void\'s light');
  for (const r of moving) {
    assert.equal(r.media, '@media (prefers-reduced-motion: no-preference)', `${r.sel}: only with motion allowed`);
    for (const sel of r.sel.split(',').map((x) => x.trim())) assert.match(sel, /^body:not\(\.no-motion\) \.surround /, `${sel}: stops with Motion off`);
  }
  // Nothing in the script moves anything: once a minute the view looks at the clock and the weather (CSS fades).
  const src = read('./dist/surround.mjs');
  assert.deepEqual([...src.matchAll(/setInterval\(([^)]*)\)/g)].map((m) => m[1]), ['tick, 60000']);
  assert.ok(!/setTimeout|\.animate\(/.test(src));
});

test('the view: the hour, the weather as haze, the same city every time', () => {
  assert.equal(timeOfDay(new Date(2026, 0, 1, 23)), 'night'); assert.equal(timeOfDay(new Date(2026, 0, 1, 3)), 'night');
  assert.equal(timeOfDay(new Date(2026, 0, 1, 6)), 'dawn'); assert.equal(timeOfDay(new Date(2026, 0, 1, 12)), 'day'); assert.equal(timeOfDay(new Date(2026, 0, 1, 19)), 'dusk');
  assert.deepEqual(Object.keys(WEATHER).map(viewWeather), ['clear', 'fog', 'wet', 'wet', 'wet'], 'drizzle, rain and storms read as wet glass: nothing falls');
  assert.equal(cityMarkup(), cityMarkup(), 'seeded');
  for (const [, cls] of [...css.matchAll(/\.((?:sr|sd|sv|sc)-[\w-]+)/g), ...surroundMarkup('view').matchAll(/class="([^"]+)"/g)]) assert.ok(!/rain|drop|streak|bolt|flash|lightning/.test(cls), `${cls}: no rain and no lightning`);
});

test('createSurround: one layer on <body>, taken away when the city or nothing is picked', () => {
  const body = { kids: [], prepend(el) { this.kids.unshift(el); el.isConnected = true; } };
  const make = () => { const el = { className: '', dataset: {}, innerHTML: '', isConnected: false, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, remove() { body.kids = body.kids.filter((x) => x !== this); this.isConnected = false; } }; return el; };
  globalThis.document = { createElement: make, body };
  const seen = [];
  try {
    const sr = createSurround({ onWeather: (n) => seen.push(n) });
    assert.equal(sr.el.attrs['aria-hidden'], 'true');
    sr.set('city'); assert.equal(body.kids.length, 0); assert.equal(sr.kind, null);
    sr.set('desk'); assert.equal(body.kids.length, 1); assert.equal(sr.el.dataset.kind, 'desk'); assert.match(sr.el.innerHTML, /sd-lamp/);
    sr.set('view'); assert.equal(body.kids.length, 1, 'one layer, redrawn'); assert.ok(['night', 'dawn', 'day', 'dusk'].includes(sr.el.dataset.tod)); assert.equal(seen.length, 1, 'the weather once');
    sr.force('fog'); assert.equal(sr.el.dataset.wx, 'fog');
    sr.hour('dusk'); assert.equal(sr.el.dataset.tod, 'dusk');
    sr.set(null); assert.equal(body.kids.length, 0); assert.equal(sr.el.innerHTML, '');
  } finally { delete globalThis.document; }
});
