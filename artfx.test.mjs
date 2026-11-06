// The virus render's attack lunge and break dissolve (virus-art.mjs): their timing curves.
import test from 'node:test';
import assert from 'node:assert/strict';
import { lungeAt, releaseOf } from './dist/virus-art.mjs';

test('an attack pulls back, strikes out, holds, and comes home', () => {
  assert.equal(lungeAt(0), 0);
  assert.ok(lungeAt(0.1) < 0, 'the wind-up pulls back');
  assert.equal(lungeAt(0.4), 1, 'at full reach mid-strike');
  assert.ok(lungeAt(0.8) > 0 && lungeAt(0.8) < 0.5, 'easing home');
  assert.equal(lungeAt(1), 0);
});

test('a broken part lets go point by point, all before its dissolve ends', () => {
  const at = Array.from({ length: 500 }, (_, i) => releaseOf(i));
  assert.ok(at.every((u) => u >= 0 && u < 0.8));
  assert.ok(new Set(at.map((u) => Math.floor(u * 10))).size >= 8, 'spread across the dissolve');
});

test('each body strikes its own way', async () => {
  const { strikeAt, strikeOf, STRIKES } = await import('./dist/virus-art.mjs');
  const c = { x: 0, y: 0 };
  assert.equal(strikeOf('crab'), 'snap');
  assert.equal(strikeOf('wraith'), 'phase');
  assert.equal(strikeOf('nothing-like-it'), 'lunge');
  for (const style of Object.keys(STRIKES)) assert.ok(Math.abs(strikeAt(style, 1, 3, 10, 10, c).reach) < 0.001, `${style} comes home`);
  assert.ok(strikeAt('phase', 0.2, 0, 10, 10, c).hide, 'a ghost blinks out');
  assert.ok(strikeAt('strike', 0.4, 0, 10, 10, c).dy > 0, 'a serpent dives at you');
  assert.ok(strikeAt('snap', 0.25, 0, 10, 0, c).dx < 0, 'a claw closes as it jabs');
  const spun = strikeAt('grind', 0.4, 0, 10, 0, c);
  assert.ok(Math.abs(spun.dx) + Math.abs(spun.dy) > 1, 'a grinder turns');
  for (const style of ['shock', 'grind']) for (let u = 0; u <= 1; u += 0.05) assert.ok(strikeAt(style, u, 3, 10, 10, c).reach <= 0.2, `${style} stays home: what it throws comes out, not the part`);
  assert.equal(strikeOf('hound'), 'shock');
});
