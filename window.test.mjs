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
