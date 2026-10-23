// The window behind the monitor (dist/window.mjs, dist/window.css): the city through the glass, for everyone. Only
// ever behind the casing: never an element or a pixel over the screen, no canvas, and still with Motion off or reduced
// motion.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { WEATHER, weatherAt, SPELL_MS, hazeOf, timeOfDay, cityMarkup, windowMarkup, createWindow } from './dist/window.mjs';
import { fresh } from './dist/combat.mjs';
import { systemMarkup } from './dist/view.mjs';

const read = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');
const strip = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const css = strip(read('./dist/window.css'));
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

test('the view is the window for everyone: one look, no switch, the Window setting as it was', () => {
  const app = read('./dist/app.js');
  // Shown whenever the casing and the Window setting are on (a new game and an old save alike: Window defaults on).
  assert.match(app, /win = cased && roomy && campaign\.settings\.window !== false;/);
  assert.match(app, /\n {2}outside\.set\(win\);\n/);
  assert.ok(!/room style|params\.get\('room'\)|settings\.room|surround/.test(app), 'no room switch, no ?room=, no command');
  for (const f of ['./dist/surround.mjs', './dist/surround.css']) assert.ok(!existsSync(new URL(f, import.meta.url)), `${f} is gone`);
  const s = fresh();
  assert.equal(s.settings.window, undefined, 'a new game has the window on by default');
  assert.match(systemMarkup(s), /data-run="window off"[^>]*>Window on<\/button>/);
  assert.ok(!/Room:|room style/.test(systemMarkup(s)), 'no Room setting');
  assert.match(read('./dist/index.html'), /<link rel="stylesheet" href="window\.css">/);
  assert.ok(!/<div class="window-view"|<canvas class="window/.test(read('./dist/index.html')), 'window.mjs adds the layer only when it shows');
  assert.ok(!/window-out/.test(read('./dist/style.css') + read('./dist/screenfx.css')), 'the old canvas\'s rules are gone');
});

test('nothing goes over the screen: one layer behind the page with the monitor\'s frame cut out of it', () => {
  const d = Object.fromEntries(decls(rule('.window-view').body));
  assert.equal(d.position, 'fixed'); assert.equal(d.inset, '0'); assert.equal(d['z-index'], '-2', 'under the colourway\'s plastic (-1) and the page');
  assert.equal(d['pointer-events'], 'none');
  // The cut-out: the frame (style.css body.cased::before: --top - 14px, --side - 18px, --desk + 8px, radius 26) grown
  // by 4px, so its edge falls in the middle of the frame's 8px rim, which covers the seam in every colourway.
  for (const p of ['mask-position', '-webkit-mask-position']) assert.equal(d[p], 'calc(var(--side) - 22px) calc(var(--top) - 18px), 0 0');
  for (const p of ['mask-size', '-webkit-mask-size']) assert.equal(d[p], 'calc(100% - 2 * var(--side) + 44px) calc(100% - var(--top) - var(--desk) + 14px), 100% 100%');
  assert.match(d.mask, /^url\("data:image\/svg\+xml,[^"]*rect width='100%25' height='100%25' rx='30'[^"]*"\) no-repeat exclude, linear-gradient\(#000 0 0\)$/);
  assert.equal(d['-webkit-mask-composite'], 'xor');
  const style = strip(read('./dist/style.css'));
  assert.match(style, /body\.cased::before \{[^}]*top: calc\(var\(--top\) - 14px\); bottom: calc\(var\(--desk\) \+ 8px\); left: calc\(var\(--side\) - 18px\); right: calc\(var\(--side\) - 18px\); border-radius: 26px;[^}]*0 0 0 8px var\(--case-rim, #0b0a09\)/);
  assert.match(strip(read('./dist/casing.css')), /body\.cased\[data-case\]::after \{[^}]*z-index: -1;/, 'a colourway\'s plastic sits over the window');
  // Every rule styles the layer or something inside it, and only it; the one outside rule shows it.
  for (const r of all) for (const sel of r.sel.split(',').map((x) => x.trim())) {
    if (sel === 'body.cased.window-on > .window-view') { assert.equal(r.body.trim(), 'display: block;'); assert.equal(r.media, '@media (min-width: 1700px) and (min-height: 720px)', 'only beside the window\'s margins: never on a phone or a small window'); continue; }
    if (sel === 'body.cased.window-on.monitor-roomy > .window-view') { assert.equal(r.body.trim(), 'display: block;'); assert.equal(r.media, '@media (min-width: 1100px) and (min-height: 720px)', 'with the monitor Roomy, on any window the casing shows on (never a phone)'); continue; }
    assert.match(sel, /^(body:not\(\.no-motion\) )?\.window-view(\[data-[\w-]+="\w+"\])?( |$)/, `${sel} is inside the window`);
    assert.ok(!/\.app|#crt|#casing|#fx-|\.topbar|\.lamp|\.knob|\.badge|\.decal/.test(sel), `${sel} never styles the screen or the casing`);
  }
  // The pieces near the monitor are held to its margins: the strips end at the rim, the sill starts under it, and the
  // glow is an outer shadow of the frame's own box (it paints nothing inside it).
  for (const [sel, want] of [['.window-view .wv-l, .window-view .wv-r', ['width: calc(var(--side) - 22px)', 'bottom: var(--desk)', 'overflow: hidden']], ['.window-view .wv-f', ['height: calc(var(--desk) + 4px)', 'overflow: hidden']], ['.window-view .wv-halo', ['left: calc(var(--side) - 18px)', 'right: calc(var(--side) - 18px)', 'top: calc(var(--top) - 14px)', 'bottom: calc(var(--desk) + 8px)', 'border-radius: 26px']]]) {
    for (const w of want) assert.ok(rule(sel).body.includes(w), `${sel}: ${w}`);
  }
  for (const r of all.filter((x) => /\.wv-halo$/.test(x.sel))) for (const [p] of decls(r.body)) assert.ok(['left', 'right', 'top', 'bottom', 'border-radius', 'box-shadow'].includes(p), `the glow sets ${p}`);
  // The markup: pictures and blocks only, nothing to click or focus, and the layer lives on <body>, never in the screen.
  const m = windowMarkup();
  assert.ok(!/<(button|a|input|select|textarea|canvas|img|video|iframe)\b|tabindex|onclick|href=/.test(m), 'nothing interactive');
  for (const [, cls] of m.matchAll(/class="([^"]+)"/g)) assert.match(cls, /^wv-[\w-]+( rose)?$/, cls);
  const src = read('./dist/window.mjs');
  assert.match(src, /el\.setAttribute\('aria-hidden', 'true'\)/);
  assert.match(src, /document\.body\.prepend\(el\)/);
  assert.ok(!/getContext|createElement\('canvas'\)|pixi|requestAnimationFrame/i.test(src.replace(/^\/\/.*$/gm, '')), 'DOM, CSS and SVG only, and no frame loop');
});

test('neutral darks, the screen\'s amber and soft warm neon: no job colour in the window', () => {
  assert.ok(!/var\(--(you|hot|next|daemon|exception|steel|gray|amber)\b/.test(css), 'no tokens: the window never follows a floor or a job');
  const hues = [];
  for (const m of css.matchAll(/#([0-9a-f]{6})\b|rgba?\((\d+), (\d+), (\d+)/gi)) {
    const [r, g, b] = m[1] ? [0, 2, 4].map((i) => parseInt(m[1].slice(i, i + 2), 16)) : [m[2], m[3], m[4]].map(Number);
    const max = Math.max(r, g, b) / 255, min = Math.min(r, g, b) / 255, l = (max + min) / 2, sat = max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
    if (sat < 0.35 || max < 0.2) continue; // a dark or a grey
    const h = max === r / 255 ? (60 * ((g - b) / 255 / (max - min)) + 360) % 360 : max === g / 255 ? 60 * ((b - r) / 255 / (max - min) + 2) : 60 * ((r - g) / 255 / (max - min) + 4);
    hues.push(h);
    assert.ok(h <= 50 || h >= 345, `${m[0]}: warm (amber, sodium, rose), never teal, violet, steel or green (hue ${Math.round(h)})`);
  }
  assert.ok(hues.length > 5, 'the file has its colours');
  for (const job of ['#ff5b3d', '#29e0d0', '#b36bff', '#7fd1c7']) assert.ok(!css.toLowerCase().includes(job), `never ${job}`);
});

test('reduced motion and Motion off hold the window still', () => {
  const moving = all.filter((r) => decls(r.body).some(([p]) => /^(animation|transition|will-change)/.test(p)));
  assert.ok(moving.length >= 3, 'the smog, the hour and the haze');
  for (const r of moving) {
    assert.equal(r.media, '@media (prefers-reduced-motion: no-preference)', `${r.sel}: only with motion allowed`);
    for (const sel of r.sel.split(',').map((x) => x.trim())) assert.match(sel, /^body:not\(\.no-motion\) \.window-view /, `${sel}: stops with Motion off`);
  }
  // Nothing in the script moves anything: once a minute it looks at the clock and the weather (CSS fades).
  const src = read('./dist/window.mjs');
  assert.deepEqual([...src.matchAll(/setInterval\(([^)]*)\)/g)].map((m) => m[1]), ['tick, 60000']);
  assert.ok(!/setTimeout|\.animate\(/.test(src));
});

test('the hour, the weather as haze, the same city every time', () => {
  assert.equal(timeOfDay(new Date(2026, 0, 1, 23)), 'night'); assert.equal(timeOfDay(new Date(2026, 0, 1, 3)), 'night');
  assert.equal(timeOfDay(new Date(2026, 0, 1, 6)), 'dawn'); assert.equal(timeOfDay(new Date(2026, 0, 1, 12)), 'day'); assert.equal(timeOfDay(new Date(2026, 0, 1, 19)), 'dusk');
  assert.deepEqual(Object.keys(WEATHER).map(hazeOf), ['clear', 'fog', 'wet', 'wet', 'wet'], 'drizzle, rain and storms read as wet glass: nothing falls');
  // The weather turns every five minutes, from the clock alone (a reload doesn't reroll it), and every kind comes up.
  const t = Date.UTC(2026, 0, 1);
  assert.equal(weatherAt(t), weatherAt(t + SPELL_MS - 1));
  assert.deepEqual(new Set(Array.from({ length: 400 }, (_, i) => weatherAt(t + i * SPELL_MS))), new Set(Object.keys(WEATHER)));
  assert.equal(cityMarkup(), cityMarkup(), 'seeded');
  for (const [, cls] of [...css.matchAll(/\.(wv-[\w-]+)/g), ...windowMarkup().matchAll(/class="([^"]+)"/g)]) assert.ok(!/rain|drop|streak|bolt|flash|lightning/.test(cls), `${cls}: no rain and no lightning`);
});

test('createWindow: one layer on <body> while it shows, gone when it doesn\'t', () => {
  const body = { kids: [], prepend(el) { this.kids.unshift(el); el.isConnected = true; } };
  const make = () => ({ className: '', dataset: {}, innerHTML: '', isConnected: false, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, remove() { body.kids = body.kids.filter((x) => x !== this); this.isConnected = false; } });
  globalThis.document = { createElement: make, body };
  const seen = [];
  try {
    const w = createWindow({ onWeather: (n, wx) => seen.push([n, wx.rain]) });
    assert.equal(w.el.attrs['aria-hidden'], 'true'); assert.equal(w.el.className, 'window-view');
    assert.equal(body.kids.length, 0, 'nothing until it shows');
    w.set(true); assert.equal(body.kids.length, 1); assert.match(w.el.innerHTML, /wv-city/); assert.ok(['night', 'dawn', 'day', 'dusk'].includes(w.el.dataset.tod));
    assert.equal(seen.length, 1, 'the weather once, for the rain\'s sound');
    w.set(true); assert.equal(body.kids.length, 1, 'one layer');
    w.force('fog'); assert.equal(w.el.dataset.wx, 'fog'); assert.equal(w.weather, 'fog');
    w.force('storm'); assert.equal(w.el.dataset.wx, 'wet');
    w.hour('dusk'); assert.equal(w.el.dataset.tod, 'dusk');
    w.set(false); assert.equal(body.kids.length, 0); assert.equal(w.el.innerHTML, '');
  } finally { delete globalThis.document; }
});

// Monitor size (style.css body.cased.monitor-roomy): Full by default, Roomy smaller and centred with the window round it.
// The formula below mirrors the CSS exactly (the test checks the text), so its numbers are the real ones.
const ROOMY_CSS = 'body.cased.monitor-roomy { --side: max(calc((100vw - 1800px) / 2), calc(18px + max(8px, min(10vw, (100vw - 1105px) / 2)))); --vm: max(16px, min(20dvh, calc(100dvh - 704px))); --top: calc(22px + 0.56 * (var(--vm) - 16px)); --desk: calc(0.44 * (var(--vm) - 16px)); background: var(--case-win, #0b0a09); }';
function roomy(W, H) {
  const side = Math.max((W - 1800) / 2, 18 + Math.max(8, Math.min(W * 0.1, (W - 1105) / 2)));
  const vm = Math.max(16, Math.min(H * 0.2, H - 704)), top = 22 + 0.56 * (vm - 16), desk = 0.44 * (vm - 16);
  return { side, top, desk, screen: [W - 2 * side, H - top - 52 - desk], frame: [W - 2 * (side - 18), H - (top - 14) - (desk + 8)] };
}
const full = (W, H) => [W - 2 * Math.max(26, (W - 1800) / 2), H - 22 - 52];

test('Monitor: Full by default; Roomy is a setting and a command, and only moves the casing', () => {
  const s = fresh();
  assert.equal(s.settings.monitor, undefined, 'Full: no setting');
  assert.match(systemMarkup(s), /data-run="monitor roomy" aria-pressed="false"[^>]*>Monitor: Full<\/button>/);
  s.settings.monitor = 'roomy';
  assert.match(systemMarkup(s), /data-run="monitor full" aria-pressed="true"[^>]*>Monitor: Roomy<\/button>/);
  s.settings.casing = false;
  assert.match(systemMarkup(s), /data-run="monitor full"[^>]*disabled/, 'no casing, no monitor to size');
  const app = read('./dist/app.js');
  assert.match(app, /if \(text === 'monitor full' \|\| text === 'monitor roomy'\) \{ if \(text === 'monitor roomy'\) campaign\.settings\.monitor = 'roomy'; else delete campaign\.settings\.monitor;/);
  assert.match(app, /const small = cased && campaign\.settings\.monitor === 'roomy';/);
  assert.match(app, /document\.body\.classList\.toggle\('monitor-roomy', small\);/);
  // The class only sets the casing's own measures (and hides the bar's toggles, as the wide window does): no layout
  // breakpoint, no media query and no screen rule keys on it, so the screen keeps its size class.
  const style = strip(read('./dist/style.css'));
  assert.ok(style.includes(ROOMY_CSS), 'the formula is the one checked here');
  const at = style.indexOf(ROOMY_CSS), media = style.lastIndexOf('@media', at);
  assert.equal(style.slice(media, style.indexOf('{', media)).trim(), '@media (min-width: 1100px) and (min-height: 720px)', 'only where the casing shows: never a phone');
  for (const f of ['style.css', 'window.css', 'casing.css', 'screenfx.css', 'campaign.css', 'breach.css', 'combat-layout.css', 'blackbox.css', 'server.css', 'daemons.css', 'codex.css', 'achievements.css']) {
    const text = strip(read(`./dist/${f}`));
    assert.ok(!/@media[^{]*monitor/.test(text), `${f}: no media query on the monitor's size`);
    for (const m of text.matchAll(/([^{}]*monitor-roomy[^{}]*)\{([^}]*)\}/g)) {
      const sel = m[1].trim(), props = decls(m[2]).map(([p]) => p);
      assert.ok(/^body\.cased(\.window-on)?\.monitor-roomy( > \.window-view| \.toggles)?$/.test(sel), `${f}: ${sel} sizes the casing only`);
      for (const p of props) assert.ok(['--side', '--vm', '--top', '--desk', 'background', 'display'].includes(p), `${sel} sets ${p}`);
    }
  }
});

test('Roomy: the frame is 80% of the window, never a screen smaller than the desktop layout\'s smallest', () => {
  // The smallest window the desktop layout runs at (combat-layout.css switches below 1121px wide; the casing needs 720px
  // tall) gives today's smallest screen: Roomy never goes under it, so no layout reads a size it doesn't expect, and
  // the text is the same size as it always is (nothing is scaled).
  const floor = full(1121, 720);
  assert.deepEqual(floor, [1069, 646]);
  const r = roomy(1440, 900);
  assert.deepEqual(r.frame.map(Math.round), [1152, 720], '80% of a 1440×900 window');
  assert.deepEqual(r.screen.map(Math.round), [1116, 662]);
  assert.ok(r.top - 14 - 8 > 60 && r.side - 26 > 100 && r.desk > 40, 'the window shows above, beside and below');
  for (let W = 1100; W <= 3840; W += 20) for (let H = 720; H <= 2160; H += 20) {
    const { screen, frame } = roomy(W, H), f = full(W, H);
    assert.ok(screen[0] >= Math.min(floor[0], f[0]) - 0.01 && screen[1] >= Math.min(floor[1], f[1]) - 0.01, `${W}×${H}: the screen stays at least ${floor.join('×')}`);
    assert.ok(screen[0] <= f[0] + 0.01 && screen[1] <= f[1] + 0.01, `${W}×${H}: never bigger than Full`);
    assert.ok(frame[0] <= W && frame[1] <= H, `${W}×${H}: the monitor fits`);
  }
  assert.deepEqual(roomy(1920, 1080).frame.map(Math.round), [1536, 864], '80% of a 1920×1080 window too');
});
