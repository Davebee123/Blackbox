// The window behind the monitor (dist/window.mjs): the slum outside on a canvas behind the page, with its weather.
// Shown with the casing and the Window setting on at 1700px and wider; there is no monitor size setting.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { WEATHER, weatherAt, SPELL_MS } from './dist/window.mjs';
import { fresh } from './dist/combat.mjs';
import { systemMarkup } from './dist/view.mjs';

const read = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');

test('shown with the casing and the Window on; the monitor stands in at 1700px and wider', () => {
  const app = read('./dist/app.js'), css = read('./dist/style.css');
  assert.match(app, /win = cased && roomy && campaign\.settings\.window !== false;/);
  assert.match(app, /\n {2}outside\.set\(win\);\n/);
  assert.match(css, /\.window-out \{ position: fixed; inset: 0;[^}]*pointer-events: none; display: none; \}/, 'out of the flow, never takes clicks, hidden by default');
  assert.match(css, /@media \(min-width: 1700px\) and \(min-height: 720px\) \{\n {2}body\.cased\.window-on \{ --side:/, 'the monitor stands in at 1700px and wider');
  assert.match(read('./dist/screenfx.css'), /\.window-out \{ z-index: -2; \}/, 'behind the backdrop');
  const s = fresh();
  assert.equal(s.settings.window, undefined, 'a new game has the window on by default');
  assert.match(systemMarkup(s), /data-run="window off"[^>]*>Window on<\/button>/);
});

test('no monitor size setting: no Full or Roomy, no command, no body class, a saved settings.monitor ignored', () => {
  const app = read('./dist/app.js');
  assert.ok(!/settings\.monitor|monitor roomy|monitor full|monitor-roomy/.test(app));
  assert.ok(!/monitor-roomy|Roomy/.test(read('./dist/style.css')));
  const s = fresh(); s.settings.monitor = 'roomy';
  assert.ok(!/Monitor:|monitor roomy|monitor full/.test(systemMarkup(s)), 'no Monitor button on System');
  assert.ok(!existsSync(new URL('./dist/window.css', import.meta.url)), 'the View stylesheet is gone');
  assert.ok(!/window\.css/.test(read('./dist/index.html')));
});

test('the weather comes from the clock: one spell for five minutes, every kind reachable', () => {
  assert.deepEqual(Object.keys(WEATHER).sort(), ['clear', 'drizzle', 'fog', 'rain', 'storm']);
  const t0 = Math.floor(Date.UTC(2026, 0, 1) / SPELL_MS) * SPELL_MS;
  assert.equal(weatherAt(t0), weatherAt(t0 + SPELL_MS - 1), 'the same spell all the way through');
  const seen = new Set();
  for (let i = 0; i < 400; i++) seen.add(weatherAt(t0 + i * SPELL_MS));
  assert.deepEqual([...seen].sort(), Object.keys(WEATHER).sort());
  for (const w of Object.values(WEATHER)) for (const v of Object.values(w)) assert.ok(v >= 0 && v <= 1);
  assert.equal(WEATHER.storm.storm, 1, 'only a storm brings lightning');
  assert.ok(Object.entries(WEATHER).every(([k, w]) => k === 'storm' || w.storm === 0));
});

test('thunder plays through Ambience, only with Sound on', () => {
  const app = read('./dist/app.js'), feel = read('./dist/feel.mjs'), track = read('./dist/soundtrack.mjs');
  assert.match(app, /onThunder: \(d\) => feel\.thunder\(d\)/);
  assert.match(feel, /thunder\(delay\) \{ if \(settings\(\)\.sound\) track\.thunder\(delay\); \}/);
  assert.match(track, /function thunder\(delay\)/);
  assert.match(read('./dist/view.mjs'), /'Radio chatter, rain, thunder, the street and the room tone'/);
});

test('the sky follows the hour: night as it always was, dawn, day and dusk only tint it', async () => {
  const { HOURS, hourOf } = await import('./dist/window.mjs');
  const at = (h) => hourOf(new Date(2026, 0, 1, h, 30));
  assert.deepEqual([0, 4, 5, 6, 7, 12, 17, 18, 20, 21, 23].map(at), ['night', 'night', 'dawn', 'dawn', 'day', 'day', 'day', 'dusk', 'dusk', 'night', 'night']);
  assert.deepEqual(Object.keys(HOURS).sort(), ['dawn', 'day', 'dusk', 'night']);
  assert.deepEqual(HOURS.night.sky, ['#1c1319', '#150e14', '#140d15', '#3a2016', '#1a100c', '#0a0706'], 'the night sky is the original one');
  const lum = (h) => { const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  for (const [k, t] of Object.entries(HOURS)) {
    assert.equal(t.sky.length, 6, k);
    assert.ok(t.sky.every((c) => lum(c) < 70), `${k}: the sky stays dark behind the screen`);
    assert.ok(t.lit > 0 && t.lit <= 1 && t.sign > 0 && t.sign <= 1, k);
  }
  assert.match(read('./dist/app.js'), /if \(params\.get\('tod'\)\) outside\.hour\(params\.get\('tod'\)\);/);
});

test('the signs and lights keep off the job colours: no teal, no violet, no hot red', async () => {
  const { NEON } = await import('./dist/window.mjs');
  const hsl = (h) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
    const hue = !d ? 0 : mx === r ? (60 * ((g - b) / d) + 360) % 360 : mx === g ? 60 * ((b - r) / d) + 120 : 60 * ((r - g) / d) + 240;
    return { hue, s, l };
  };
  for (const c of NEON) {
    const { hue, s, l } = hsl(c);
    assert.ok(!(hue > 150 && hue < 210 && s > 0.3), `${c} is not teal`);
    assert.ok(!(hue > 250 && hue < 320 && s > 0.3), `${c} is not violet`);
    assert.ok(!((hue < 12 || hue > 340) && s > 0.8 && l < 0.6), `${c} is not a threat's red`);
  }
  const src = read('./dist/window.mjs');
  for (const old of ['#29e0d0', '#b36bff', '#ff2d6f', '90,220,210', '255,70,130']) assert.ok(!src.includes(old), `${old} is gone`);
});

test('cheap to draw: the still layers are cached and cut to the window, the loop stops when nothing may move', () => {
  const src = read('./dist/window.mjs');
  for (const l of ['sky = slice(sky)', 'city = slice(city)', 'wet = slice(wet, 1)', 'glass = slice(glass)']) assert.ok(src.includes(l), l);
  assert.match(src, /if \(t - last < 48\) return;/, 'about 20 frames a second');
  assert.match(src, /function start\(\) \{ if \(running\(\) \|\| !on \|\| !sky \|\| !strips\.length \|\| document\.hidden \|\| !canMove\(\)\) return;/);
  assert.match(src, /if \(!canMove\(\)\) \{ draw\(t\); return; \}/, 'Motion off or reduced motion: one still frame');
  assert.match(src, /document\.addEventListener\('visibilitychange', \(\) => \{ if \(document\.hidden\) stop\(\); else start\(\); \}\);/, 'a hidden tab draws nothing');
  assert.ok(!/g\.clip\(\); \/\/ the window/.test(src), 'no clip of many rects over the whole frame');
});

// ---------- the districts (window.mjs DISTRICTS; their unlocks: casing.test.mjs) ----------
// A stand-in for the page: a canvas whose 2D context records, for the window's own canvas, the box of every draw (cut
// to its clip), so a test can see where a frame paints; the others (the cached layers) just take the calls.
function fakePage({ W = 1920, H = 1080, desk = 34, side = Math.max(48, W * 0.035), top = 56, chin = 52, hidden = false } = {}) {
  const app = { left: side, top, right: W - side, bottom: H - desk - chin };
  Object.assign(app, { width: app.right - app.left, height: app.bottom - app.top });
  const ops = [], frames = [];
  let made = 0;
  const ctxFor = (main) => {
    const st = { clip: null, stack: [], path: [] };
    const put = (x, y, w, h) => {
      if (!main) return;
      let b = { x: Math.min(x, x + w), y: Math.min(y, y + h), w: Math.abs(w), h: Math.abs(h) };
      if (st.clip) { const c = st.clip, x0 = Math.max(b.x, c.x), y0 = Math.max(b.y, c.y), x1 = Math.min(b.x + b.w, c.x + c.w), y1 = Math.min(b.y + b.h, c.y + c.h); b = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }; }
      if (b.w > 0 && b.h > 0) ops.push(b);
    };
    // a path is its subpaths (each moveTo or rect starts one): the rain is one stroke of many short lines
    const sub = () => st.path.at(-1) || (st.path.push([]), st.path.at(-1));
    const bbox = (pts) => { const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]); return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; };
    const paint = () => { for (const p of st.path) if (p.length) { const b = bbox(p); put(b.x, b.y, Math.max(b.w, 0.5), Math.max(b.h, 0.5)); } };
    const fn = {
      fillRect: put,
      drawImage: (img, ...a) => { const [dx, dy, dw, dh] = a.length === 8 ? a.slice(4) : a.length === 4 ? a : [a[0], a[1], img.width, img.height]; put(dx, dy, dw, dh); },
      beginPath: () => { st.path = []; },
      moveTo: (x, y) => st.path.push([[x, y]]), lineTo: (x, y) => sub().push([x, y]),
      quadraticCurveTo: (a, b, x, y) => sub().push([a, b], [x, y]), bezierCurveTo: (a, b, c, d, x, y) => sub().push([a, b], [c, d], [x, y]),
      arc: (x, y, r) => sub().push([x - r, y - r], [x + r, y + r]),
      rect: (x, y, w, h) => st.path.push([[x, y], [x + w, y + h]]), roundRect: (x, y, w, h) => st.path.push([[x, y], [x + w, y + h]]),
      fill: paint, stroke: paint,
      clip: () => { st.clip = bbox(st.path.flat()); },
      save: () => st.stack.push(st.clip), restore: () => { st.clip = st.stack.pop() ?? null; },
      createLinearGradient: () => ({ addColorStop() {} }), createRadialGradient: () => ({ addColorStop() {} }),
    };
    return new Proxy({}, { get: (t, k) => (k in t ? t[k] : fn[k] || (() => {})), set: (t, k, v) => { t[k] = v; return true; } });
  };
  const raf = [];
  const saved = {};
  const globals = {
    document: { hidden, createElement: () => { const main = made++ === 0; return { width: 0, height: 0, setAttribute() {}, remove() {}, getContext: () => ctxFor(main) }; }, querySelector: (q) => (q === '.app' ? { getBoundingClientRect: () => app } : null), body: { prepend() {} }, addEventListener() {} },
    getComputedStyle: () => ({ getPropertyValue: () => `${desk}px` }), innerWidth: W, innerHeight: H, devicePixelRatio: 1, addEventListener() {},
    requestAnimationFrame: (cb) => { raf.push(cb); return raf.length; }, cancelAnimationFrame() {},
  };
  for (const k in globals) { saved[k] = Object.getOwnPropertyDescriptor(globalThis, k); Object.defineProperty(globalThis, k, { value: globals[k], configurable: true, writable: true }); }
  const restore = () => { for (const k in saved) { if (saved[k]) Object.defineProperty(globalThis, k, saved[k]); else delete globalThis[k]; } };
  // run what's queued: the build, then frames 200 ms apart (so the slow movers, a train or a ship, come by)
  const run = (n) => { let t = performance.now(); for (let i = 0; i < n && raf.length; i++) { const cb = raf.shift(); frames.push(ops.length); cb((t += 200)); } };
  // the window as measure() cuts it: the strips, the band, the rim under the monitor's edge, and the desk
  const low = H - desk, lx = app.left + 22, rx = app.right - 22, ty = app.top + 26, by = low - 48;
  const shown = [{ x: 0, y: 0, w: lx, h: low }, { x: rx, y: 0, w: W - rx, h: low }, { x: lx, y: 0, w: rx - lx, h: ty }, { x: lx, y: by, w: rx - lx, h: low - by }, { x: 0, y: H - desk, w: W, h: desk }];
  return { app, ops, raf, run, restore, shown, W, H };
}
const meets = (a, b, pad = 0.5) => a.x < b.x + b.w - pad && b.x < a.x + a.w - pad && a.y < b.y + b.h - pad && b.y < a.y + a.h - pad;

test('districts: the Sprawl (the city as it always was) and four more, each named and in the same warm light', async () => {
  const { DISTRICTS, DISTRICT_IDS, NEON } = await import('./dist/window.mjs');
  assert.deepEqual(DISTRICT_IDS, ['sprawl', 'backhaul', 'stacks', 'coldline', 'tarbeach']);
  assert.equal(DISTRICTS.sprawl.palette, NEON, 'the Sprawl keeps its signs');
  assert.equal(DISTRICTS.sprawl.fog, 0, 'and its air');
  const hsl = (h) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255), mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
    const s = d ? d / (1 - Math.abs(2 * l - 1)) : 0, hue = !d ? 0 : mx === r ? (60 * ((g - b) / d) + 360) % 360 : mx === g ? 60 * ((b - r) / d) + 120 : 60 * ((r - g) / d) + 240;
    return { hue, s, l };
  };
  for (const [id, D] of Object.entries(DISTRICTS)) {
    assert.ok(D.name && D.tip.endsWith('.'), id);
    assert.ok(D.fog >= 0 && D.fog <= 0.25, `${id}: a little fog of its own at most`);
    for (const c of [...D.palette, ...(D.boxes || [])]) {
      const { hue, s, l } = hsl(c);
      assert.ok(!(hue > 150 && hue < 210 && s > 0.3), `${id} ${c} is not teal`);
      assert.ok(!(hue > 250 && hue < 320 && s > 0.3), `${id} ${c} is not violet`);
      assert.ok(!((hue < 12 || hue > 340) && s > 0.8 && l < 0.6), `${id} ${c} is not a threat's red`);
    }
  }
  const src = read('./dist/window.mjs');
  assert.match(src, /const SEEDS = \{ sprawl: \[4242, 8117\],/, 'the Sprawl lays out from the seeds it always had');
  assert.match(src, /if \(district !== 'sprawl'\) PAINT\[district\]\(/, 'and is drawn by its own code, untouched');
});

test('every district builds and draws without errors at 1700, 1920 and 2560, only around the monitor and never into the screen', async () => {
  const { createWindow, DISTRICT_IDS } = await import('./dist/window.mjs');
  // a clock in a clear spell, so the window starts dry
  const now = Date.now, t0 = Math.floor(now() / SPELL_MS) * SPELL_MS, k = [...Array(400).keys()].find((i) => weatherAt(t0 + i * SPELL_MS) === 'clear');
  Date.now = () => t0 + k * SPELL_MS + 1000;
  try {
  for (const [W, H, desk, top] of [[1700, 900, 30, 46], [1920, 1080, 34, 56], [2560, 1440, 34, 56], [1920, 800, 0, 22]]) {
    for (const id of DISTRICT_IDS) {
      const P = fakePage({ W, H, desk, top });
      try {
        const w = createWindow({ canMove: () => true });
        w.district(id);
        assert.equal(w.districtId, id);
        w.set(true);
        P.run(1); // the build and its first frame
        assert.ok(P.ops.length > 0, `${id} ${W}×${H}: it draws`);
        // Dry first (the rain, blown by the wind, runs on behind the monitor's edge as it always has): six minutes of
        // frames, the trains and ships coming by, every draw where the window shows.
        w.force('clear');
        P.run(300); P.ops.length = 0;
        P.run(1500);
        const canvas = { x: 0, y: 0, w: W, h: H }; // (anything wholly off the canvas draws nothing)
        const hidden = P.ops.find((b) => meets(b, canvas, 0) && !P.shown.some((r) => meets(b, { x: r.x - 8, y: r.y - 8, w: r.w + 16, h: r.h + 16 }, 0))); // (a spinner's tail light may trail a few pixels under the rim)
        assert.ok(!hidden, `${id} ${W}×${H}: a frame draws only where the window shows (${JSON.stringify(hidden)})`);
        w.force('storm');
        P.run(600);
        assert.ok(P.raf.length > 0, `${id}: still running`);
        const inner = { x: P.app.left + 100, y: P.app.top + 100, w: P.app.width - 200, h: P.app.height - 200 };
        const into = P.ops.find((b) => meets(b, inner));
        assert.ok(!into, `${id} ${W}×${H}: nothing, rain and lightning included, reaches into the screen (${JSON.stringify(into)})`);
        assert.ok(w.stats.frames > 100 && w.stats.ms >= 0, 'it counts its cost');
        w.set(false);
      } finally { P.restore(); }
    }
  }
  } finally { Date.now = now; }
});

test('a district changes only on a change, and Motion off or a hidden tab stops every district\'s movers', async () => {
  const { createWindow, DISTRICT_IDS } = await import('./dist/window.mjs');
  for (const id of DISTRICT_IDS) {
    let P = fakePage();
    try {
      const w = createWindow({ canMove: () => false });
      w.district(id); w.set(true);
      P.run(1);
      assert.ok(P.ops.length > 0, `${id}: one still frame`);
      assert.equal(P.raf.length, 0, `${id}: Motion off, no loop`);
      const n = P.ops.length;
      w.district(id); w.district('nowhere' === id ? 'x' : id);
      assert.equal(P.ops.length, n, 'the same district again draws nothing new');
    } finally { P.restore(); }
    P = fakePage({ hidden: true });
    try {
      const w = createWindow({ canMove: () => true });
      w.district(id); w.set(true);
      P.run(1);
      assert.equal(P.raf.length, 0, `${id}: a hidden tab, no loop`);
    } finally { P.restore(); }
  }
  const P = fakePage();
  try {
    const w = createWindow({ canMove: () => true });
    w.district('atlantis');
    assert.equal(w.districtId, 'sprawl', 'an unknown district is the Sprawl');
  } finally { P.restore(); }
});
