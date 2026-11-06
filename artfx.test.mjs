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
