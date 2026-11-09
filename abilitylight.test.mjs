// Light for ability effects (dist/abilitylight.mjs): every kind is drawn while it lives and never outside it, in its
// tone; cut to a cap, moved later, it keeps that window.
import test from 'node:test';
import assert from 'node:assert/strict';
import { drawLight, KINDS, TONES, endOf, startOf, capped, later, throwN, crackNet, firePhases } from './dist/abilitylight.mjs';

const rnd = ((n) => () => ((n = (n * 1103515245 + 12345) % 2 ** 31) / 2 ** 31))(5);
const box = { l: 100, t: 100, r: 180, b: 120 }, A = { x: 20, y: 300 }, B = { x: 140, y: 110 };
const SAMPLES = {
  flash: { kind: 'flash', x: 140, y: 110, t0: 100, R: 26, dur: 220 },
  ring: { kind: 'ring', x: 140, y: 110, t0: 100, rx: 80, ry: 8, dur: 360, w: 2 },
  glint: { kind: 'glint', x: 140, y: 110, t0: 100, s: 10, dur: 180 },
  sparks: { kind: 'sparks', list: throwN(rnd, 8, B, 100), w: 1 },
  embers: { kind: 'embers', list: throwN(rnd, 8, B, 100, { g: -40 }) },
  puffs: { kind: 'puffs', list: throwN(rnd, 4, B, 100, { g: -40 }) },
  cracks: { kind: 'cracks', net: crackNet(rnd, 140, 118, [[Math.PI, 40], [0, 40]]), t0: 100, grow: 90, life: 400 },
  fire: { kind: 'fire', x0: 100, w: 120, base: 118, n: 6, from: 140, run: 900, H: 24, ph: firePhases(rnd, 6), t0: 100, rise: 110, fall: 300 },
  comet: { kind: 'comet', a: A, b: B, lift: 20, t1: 100, t2: 260, R0: 4 },
  smear: { kind: 'smear', cx: 200, cy: 100, r0: 60, r1: 90, a1: 230, a2: 180, t1: 100, t2: 160 },
  cross: { kind: 'cross', from: { x: 200, y: 90 }, to: B, t0: 100, t1: 250, t2: 400 },
  brackets: { kind: 'brackets', box, t0: 100, dur: 380 },
  tether: { kind: 'tether', from: { x: 100, y: 110 }, to: B, t0: 100, dur: 320 },
  halo: { kind: 'halo', box, t0: 100, dur: 320 },
};

test('every kind is drawn while it lives, and nothing before or after', () => {
  assert.deepEqual(Object.keys(SAMPLES).sort(), [...KINDS].sort(), 'a sample of every kind');
  for (const [k, it] of Object.entries(SAMPLES)) {
    const s = startOf(it), e = endOf(it);
    assert.ok(e > s, k);
    assert.equal(drawLight([it], s - 5), '', `${k}: nothing before it starts`);
    assert.equal(drawLight([it], e + 5), '', `${k}: nothing after it ends`);
    const mid = drawLight([it], s + (e - s) * 0.45);
    assert.ok(mid.length > 40 && !/NaN|undefined/.test(mid), `${k} mid-life: ${mid.slice(0, 80)}`);
    assert.doesNotMatch(mid, /background|<image|<foreignObject/, `${k}: light only`);
  }
});

test('in its tone: the effect\'s colour, or the one an item names (steel on ◆, gold for a crit)', () => {
  const it = SAMPLES.flash;
  assert.match(drawLight([it], 150), new RegExp(TONES.you.c));
  assert.match(drawLight([it], 150, 'crew'), new RegExp(TONES.crew.c));
  assert.match(drawLight([{ ...it, tone: 'steel' }], 150, 'crit'), new RegExp(TONES.steel.c));
});

test('cut to a cap it ends by it (or isn\'t there at all); moved later, its whole window moves', () => {
  for (const [k, it] of Object.entries(SAMPLES)) {
    const c = capped(it, 220);
    if (c) assert.ok(endOf(c) <= 220 + 1e-6, `${k}: ends by the cap (${endOf(c)})`);
    assert.equal(capped(it, startOf(it)), null, `${k}: starting at the cap, it never shows`);
    const l = later(it, 50);
    assert.ok(Math.abs(startOf(l) - startOf(it) - 50) < 1e-6 && Math.abs(endOf(l) - endOf(it) - 50) < 1e-6, `${k}: 50 ms later`);
  }
});
