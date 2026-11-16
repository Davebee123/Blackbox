// The Graphics settings (graphics.mjs): presets, Auto by device, rows by hand, the migration, and the switches each
// effect reads (docs/performance-plan.md batch 5).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fresh } from './dist/combat.mjs';
import { graphicsOf, presetOf, migrateGraphics, applyAuto, graphicsCommand, settle, PRESETS, GFX } from './dist/graphics.mjs';
import { chipLevel } from './dist/chipfx.mjs';
import { systemMarkup } from './dist/view.mjs';

const read = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');

test('Auto: a desktop plays Quality, a phone Balanced; a preset or a row by hand lets go of it', () => {
  const s = fresh();
  assert.equal(migrateGraphics(s), true);
  assert.equal(migrateGraphics(s), false, 'keyed on the field: safe to run twice');
  applyAuto(s, false);
  const { screenFx, ...rows } = PRESETS.quality;
  assert.deepEqual(graphicsOf(s), { auto: true, ...rows });
  assert.equal(presetOf(s, false), 'auto');
  applyAuto(s, true);
  assert.equal(graphicsOf(s).virus, 'slow');
  assert.equal(graphicsOf(s).tether, false);
  assert.equal(presetOf(s, true), 'auto');
  graphicsCommand(s, 'graphics performance');
  assert.equal(presetOf(s, true), 'performance');
  assert.equal(s.settings.screenFx, 'subtle');
  assert.equal(applyAuto(s, true), false, 'a picked preset stays on the next load');
  graphicsCommand(s, 'graphics virus full');
  assert.equal(presetOf(s, true), 'custom');
  graphicsCommand(s, 'graphics auto', { phone: false });
  assert.equal(presetOf(s, false), 'auto');
  assert.equal(graphicsOf(s).virus, 'full');
});

test('a save that chose its own Screen effects level keeps it, and Auto lets go when the level changes', () => {
  const s = fresh();
  s.settings.screenFx = 'bold';
  migrateGraphics(s);
  assert.equal(graphicsOf(s).auto, false);
  assert.equal(applyAuto(s, true), false);
  assert.equal(s.settings.screenFx, 'bold');
  const t = fresh(); migrateGraphics(t); applyAuto(t, false);
  t.settings.screenFx = 'off';
  assert.equal(settle(t, false), true);
  assert.equal(presetOf(t, false), 'custom');
});

test('commands: rows take only their own values', () => {
  const s = fresh(); migrateGraphics(s);
  assert.equal(graphicsCommand(s, 'map'), null);
  assert.match(graphicsCommand(s, 'graphics dissolve fewer'), /Part dissolve: fewer/);
  assert.equal(graphicsOf(s).dissolve, 'fewer');
  assert.match(graphicsCommand(s, 'graphics dissolve lots'), /^graphics auto/);
  graphicsCommand(s, 'graphics chips off');
  assert.equal(graphicsOf(s).chips, false);
  s.settings.graphics.virus = 'sparkly';
  assert.equal(graphicsOf(s).virus, 'full', 'an unknown value reads as Quality');
});

test('each effect obeys its row', () => {
  assert.deepEqual(chipLevel(1, 5000), [0.4, 0.36]);
  assert.deepEqual(chipLevel(1, 5000, false), [0, 0], 'Chip effects at +1 off: Now only');
  assert.deepEqual(chipLevel(0, 5000, false), [1, 0.55]);
  assert.deepEqual(GFX.frameMs, { full: 40, slow: 125, still: 250 });
  const app = read('./dist/app.js'), css = read('./dist/style.css'), sfx = read('./dist/screenfx.css');
  assert.match(app, /dissolveMode: \(\) => gfx\(\)\.dissolve/);
  assert.match(app, /rate: \(\) => gfx\(\)\.virus/);
  assert.match(app, /plusOne: gfx\(\)\.chips/);
  assert.match(app, /toggle\('no-ambient', !gfx\(\)\.ambient\)/);
  assert.match(app, /toggle\('tether-steady', !gfx\(\)\.tether\)/);
  assert.match(css, /\.tether-steady \.tether\.up \.tt-line \{ animation: none; \}/);
  assert.match(css, /\.no-ambient #crt::before \{ display: none; \}/);
  assert.match(sfx, /\.no-ambient #fx-back \.fx-tex/);
  assert.match(read('./dist/virus-art.mjs'), /const motion = canMove\(\) && r !== 'still';/, 'Motion off still wins');
});

test('the Settings page: a preset over sliders and checkboxes, the rows that cost looks under their heading', () => {
  const s = fresh(); migrateGraphics(s); applyAuto(s, true);
  const html = systemMarkup(s, { phone: true });
  assert.match(html, /<h2>Graphics<\/h2>/);
  assert.match(html, /class="on" data-run="graphics auto" aria-pressed="true"[^>]*>Auto <small>Balanced<\/small>/);
  assert.match(html, /<h3 class="gx-sub">Costs looks<\/h3>/);
  assert.match(html, /data-slide="graphics virus" data-opts="still slow full"/);
  assert.match(html, /value="1" data-slide="graphics virus"/, 'Slow on a phone');
  assert.match(html, /data-slide="screen fx" data-opts="off subtle medium bold"/);
  assert.match(html, /data-run="graphics tether on"  [^>]*><span>Breathing tether</, 'unchecked');
  assert.match(html, /data-tt-kind="Graphics · costs looks"/);
  assert.doesNotMatch(html, /Screen effects: medium|aria-pressed="true">Motion on/, 'no old toggle buttons');
});
