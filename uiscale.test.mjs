// UI scale (dist/uiscale.mjs): the screen drawn larger on big displays (the designer: at 2560 the text stays a fixed
// pixel size). It never leaves the layout narrower than its widest breakpoint, so a 1920 screen can't scale up.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { scaleFor, maxScale, parseScale, scaleLabel, nextScale, MIN_WIDTH } from './dist/uiscale.mjs';

test('the scale holds within the room: none up at 1920, about 140% at 2560, always down to 80%', () => {
  assert.equal(maxScale(1780), 1.04); // 1920 cased: a hair
  assert.equal(maxScale(1400), 1); // a small window never grows
  assert.equal(maxScale(2380), 1.4); // 2560 cased with the window
  assert.equal(scaleFor(2, 2380), 1.4);
  assert.equal(scaleFor(1.25, 2380), 1.25);
  assert.equal(scaleFor(0.8, 1400), 0.8);
  assert.equal(scaleFor(0.5, 1400), 0.8);
  assert.equal(scaleFor(undefined, 2380), 1);
  for (const avail of [900, 1400, 1780, 2380, 3700]) for (const set of ['auto', 0.8, 1, 1.25, 2]) {
    const z = scaleFor(set, avail);
    assert.ok(avail / z >= MIN_WIDTH - 1 || z <= 1, `${set} at ${avail}: the screen is ${avail / z} wide`);
  }
});

test('auto sizes the screen to its home width, never under 100%', () => {
  assert.equal(scaleFor('auto', 1780), 1);
  assert.equal(scaleFor('auto', 2380), 1.32);
  assert.equal(scaleFor('auto', 3700), 2.06); // 4K: about double
  assert.equal(scaleFor('auto', 1200), 1);
});

test('the command reads auto, a percent or a fraction; the button steps through what fits, then back to auto', () => {
  assert.equal(parseScale('auto'), 'auto');
  assert.equal(parseScale('125'), 1.25);
  assert.equal(parseScale('125%'), 1.25);
  assert.equal(parseScale('1.4'), 1.4);
  assert.equal(parseScale('300'), null);
  assert.equal(parseScale('big'), null);
  assert.equal(nextScale(1, 2380), 1.1);
  assert.equal(nextScale(1.4, 2380), 'auto');
  assert.equal(nextScale('auto', 2380), 0.8);
  assert.equal(nextScale(1, 1780), 'auto'); // no room to grow at 1920
  assert.equal(scaleLabel('auto', 2380), 'UI scale: Auto (132%)');
  assert.equal(scaleLabel(1.25, 2380), 'UI scale: 125%');
  assert.equal(scaleLabel(1.6, 2380), 'UI scale: 160% (140% fits)');
});

test('the page: the screen zooms by --ui and its height divides by it; pop-ups outside it zoom and place in its px', () => {
  const css = readFileSync('dist/style.css', 'utf8'), app = readFileSync('dist/app.js', 'utf8');
  assert.match(css, /\.app \{ zoom: var\(--ui, 1\); height: calc\(100dvh \/ var\(--ui, 1\)\);/);
  assert.match(css, /body\.cased \.app \{ height: calc\(\(100dvh - var\(--top\) - var\(--chin\) - var\(--desk\)\) \/ var\(--ui, 1\)\);/);
  for (const sel of ['.ptip', '.pg-pop', '.tip']) assert.match(css, new RegExp(`\\${sel} \\{ position: fixed; z-index: \\d+; zoom: var\\(--ui, 1\\);`), sel);
  assert.match(readFileSync('dist/levelup.css', 'utf8'), /\.levelup \{ position: fixed; z-index: 50; zoom: var\(--ui, 1\);/);
  assert.match(css, /\.tt \{[^}]*font: calc\(13px \* var\(--ui, 1\)\)/);
  // Inside the screen, a rect becomes the screen's own px before it places anything.
  for (const fn of ['placeRoomsPop', 'placeMapPop', 'placeCrewWin']) {
    const body = app.slice(app.indexOf(`function ${fn}(`), app.indexOf('\n}\n', app.indexOf(`function ${fn}(`)));
    assert.match(body, /zr\(/, fn);
  }
  assert.match(app, /if \(\/\^ui scale\( \|\$\)\/\.test\(text\)\)/);
});
