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
