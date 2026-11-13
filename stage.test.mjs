// The stage (dist/stage.mjs): every floor's place behind the virus, its light, camera, entrance and break physics; the
// board's floor motion (dist/boardfx.mjs); the theme's era on old floors (dist/fightmusic.mjs ERAS); and the fight log
// folding to its newest line (app.js, style.css).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { PLACES, createStage } from './dist/stage.mjs';
import { BOARD_MOTION, motionOf } from './dist/boardfx.mjs';
import { ERAS } from './dist/fightmusic.mjs';
import { floorOf } from './dist/screenfx.mjs';
import { FLOORS } from './dist/data.mjs';
import { fresh } from './dist/combat.mjs';

const draw = (fn, C, R, ...rest) => { const marks = []; fn((x, y, ch, a) => marks.push({ x, y, ch, a }), C, R, ...rest); return marks; };

test('every floor has a place, quiet and inside its window', () => {
  assert.deepEqual(Object.keys(PLACES).map(Number), FLOORS.map((_, i) => i + 1));
  for (const [f, P] of Object.entries(PLACES)) {
    for (const key of ['tag', 'still', 'live', 'light', 'cam', 'enter', 'reveal', 'ground']) assert.ok(P[key] != null, `floor ${f} has ${key}`);
    for (const [C, R] of [[70, 30], [44, 18]]) {
      const marks = [...draw(P.still, C, R), ...draw(P.live, C, R, 3.7)];
      assert.ok(marks.length > 0, `floor ${f} draws something`);
      for (const m of marks) {
        assert.ok(m.x >= -C * 0.15 && m.x <= C * 1.15 && m.y >= -2 && m.y <= R + 2, `floor ${f}: ${m.ch} at ${m.x},${m.y} stays at the window (the canvas clips the rest)`);
        assert.ok(m.a >= 0 && m.a <= 1, `floor ${f}: alpha ${m.a}`);
      }
      const mean = marks.reduce((s, m) => s + m.a, 0) / marks.length;
      assert.ok(mean < 0.3, `floor ${f} stays faint behind the virus (mean alpha ${mean.toFixed(2)})`);
    }
  }
});

test('a place lights the virus: brightness only, never past full', () => {
  const st = createStage({ getFloor: () => 4, doc: null });
  st.update(0);
  for (const t of [0, 1000, 4000, 9000]) for (const n of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, -1]]) {
    const lum = st.light(0.5, ...n, t);
    assert.ok(lum >= 0 && lum <= 1, `light ${lum}`);
  }
  // Coldline's lighthouse flares on the virus's right side once a sweep, and leaves its left as it was dimmed
  const right = [...Array(140)].map((_, i) => st.light(0.3, 1, 0, 0, i * 100)), left = [...Array(140)].map((_, i) => st.light(0.3, -1, 0, 0, i * 100));
  assert.ok(Math.max(...right) > Math.max(...left) + 0.3, 'the beam lights the side facing it');
});

test('a new virus enters its floor\'s way, and Motion off skips it', () => {
  let moving = true;
  const st = createStage({ getFloor: () => 8, canMove: () => moving, doc: null });
  st.update(0); st.enter(0);
  const c = { y: 200, i: 3, lum: 0.5 };
  assert.ok(st.reveal(c, '#', 100, 400, 300).ch, 'early on, Bedrock\'s virus is still rock');
  assert.deepEqual(st.reveal(c, '#', 5000, 400, 300), {}, 'dug out, it draws as itself');
  moving = false; st.enter(0);
  assert.deepEqual(st.reveal(c, '#', 100, 400, 300), {}, 'Motion off: no entrance');
  // Coldline: what is under the waterline stays hidden, always
  const cl = createStage({ getFloor: () => 4, canMove: () => false, doc: null }); cl.update(0);
  assert.equal(cl.reveal({ y: 290, i: 1 }, '#', 0, 400, 300), null);
  assert.deepEqual(cl.reveal({ y: 100, i: 1 }, '#', 0, 400, 300), {});
});

test('the stage is only up on a floor: home and no floor have none', () => {
  let f = null;
  const st = createStage({ getFloor: () => f, doc: null });
  assert.equal(st.update(0), false);
  assert.equal(st.cam(0), null);
  f = 3; assert.equal(st.update(0), true);
  assert.equal(st.tagOf(3), 'stacks/render');
  assert.equal(st.tagOf(null), 'render');
});

test('a broken part\'s bits follow the floor: rise (the default), freeze, sink or crumble', () => {
  const m = { width: 400, height: 300, gx: 7, gy: 10 };
  const ctx = { fillText() {}, set globalAlpha(v) {}, set fillStyle(v) {} };
  const on = (f) => { const st = createStage({ getFloor: () => f, doc: null }); st.update(0); return st; };
  assert.equal(on(1).bit(ctx, { x: 100, y: 100, vx: 0, ph: 1, c: '1' }, 16, m), false, 'the Sprawl keeps the rising bits');
  const d = { x: 100, y: 100, vx: 0.2, ph: 2.5, c: '0', life: 900 };
  const bed = on(8);
  for (let k = 0; k < 200; k++) bed.bit(ctx, d, 16, m);
  assert.ok(d.rest && d.y <= m.height * PLACES[8].ground, 'Bedrock\'s bits come to rest on the floor');
  const ice = { x: 100, y: 100, vx: 0, ph: 4, c: '1', life: 900 };
  const cold = on(4);
  for (let k = 0; k < 200 && !ice.sunk; k++) cold.bit(ctx, ice, 16, m);
  assert.ok(ice.sunk, 'Coldline\'s bits freeze, then sink at the waterline');
});

test('the board\'s floor motion: only how a chip comes in', () => {
  for (const [f, kind] of Object.entries(BOARD_MOTION)) { assert.ok(PLACES[f], `floor ${f}`); assert.ok(['type', 'flap'].includes(kind)); }
  assert.equal(motionOf(1), null, 'the Sprawl moves as it always has');
  assert.equal(motionOf(null), null, 'home too');
});

test('old floors play the theme through their own hardware', () => {
  assert.deepEqual(Object.keys(ERAS).map(Number), [4, 8]);
  assert.ok(ERAS[8].bits < ERAS[4].bits && ERAS[8].band[1] < ERAS[4].band[1], 'deeper is older');
});

test('a fight in a server\'s rooms takes the rooms\' floor when the location has none', () => {
  const s = fresh();
  s.run = { loc: 'rooms', rooms: true };
  s.rooms = { floor: 5 };
  assert.equal(floorOf(s, { module: 'fight', loc: null }), 5);
});

test('the fight log folds to its newest line, and a button opens it', () => {
  const html = readFileSync(new URL('./dist/index.html', import.meta.url), 'utf8'), css = readFileSync(new URL('./dist/style.css', import.meta.url), 'utf8');
  assert.match(html, /id="log-more"/);
  assert.match(css, /body:not\(\.log-open\):not\(\.fight-over\) \.log-lines > li:not\(:last-child\) \{ display: none; \}/);
});

test('round two: the visit\'s sky, the virus\'s tint, the map\'s material, the spoils', async () => {
  const { skyOf, TINT_SKIP } = await import('./dist/stage.mjs');
  const { MATERIALS, tileOf, groundSvg } = await import('./dist/ground.mjs');
  const { SPOILS_MOTION } = await import('./dist/boardfx.mjs');
  // the sky: fog, a low sun or night, never rain
  for (let ms = 0; ms < 48 * 3600e3; ms += 1800e3) assert.ok(['fog', 'dawn', 'night'].includes(skyOf(ms)));
  assert.ok(Object.values(PLACES).filter((P) => P.sky).length >= 3, 'the floors with a sky');
  // the tint: never where the floor's colour sits near a strike's red or an elite's magenta
  assert.deepEqual([...TINT_SKIP].sort(), [5, 7]);
  // the material: a texture on every floor, faint, and a map's rooms and links cut out of it
  for (const f of Object.keys(PLACES)) {
    const t = tileOf(Number(f));
    assert.ok(t.length && t.every((g) => g.a > 0 && g.a <= 0.3), `floor ${f}'s material is there and faint`);
    assert.ok(MATERIALS[f]);
  }
  const svg = groundSvg(8, { id: 'w', rooms: [{ x: 10, y: 10 }, { x: 100, y: 10 }], links: [[{ x: 10, y: 10 }, { x: 100, y: 10 }]], box: { w: 120, h: 100, link: 24 }, cx: 50, cy: 10, rx: 200, ry: 150 });
  assert.equal((svg.match(/<rect x="[-\d.]+" y="[-\d.]+" width="120"/g) || []).length, 2, 'a hole for each room');
  assert.match(svg, /<line x1="10" y1="10" x2="100" y2="10"\/>/, 'and each link');
  assert.equal(groundSvg(null, { id: 'w', rooms: [], links: [], box: {}, cx: 0, cy: 0, rx: 1, ry: 1 }), '', 'home: nothing');
  for (const f of Object.keys(SPOILS_MOTION)) assert.ok(PLACES[f]);
});
