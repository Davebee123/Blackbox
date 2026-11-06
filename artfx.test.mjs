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
  assert.equal(strikeOf('crab'), 'pulse');
  assert.equal(strikeOf('crab', true), 'snap');
  assert.equal(strikeOf('wraith'), 'phase');
  assert.equal(strikeOf('nothing-like-it'), 'lunge');
  for (const style of Object.keys(STRIKES)) for (const i of [0, 3, 8]) {
    const end = strikeAt(style, 1, i, 10, 10, c);
    assert.ok(Math.abs(end.reach) + Math.abs(end.dx) + Math.abs(end.dy) < 0.01, `${style} comes home where it began`);
  }
  assert.ok(strikeAt('phase', 0.2, 0, 10, 10, c).hide, 'a ghost blinks out');
  assert.ok(strikeAt('strike', 0.4, 0, 10, 10, c).dy > 0, 'a serpent dives at you');
  assert.ok(strikeAt('snap', 0.25, 0, 10, 0, c).dx < 0, 'a claw closes as it jabs');
  const spun = strikeAt('grind', 0.4, 0, 10, 0, c);
  assert.ok(Math.abs(spun.dx) + Math.abs(spun.dy) > 1, 'a grinder turns');
  for (const style of ['shock', 'grind']) for (let u = 0; u <= 1; u += 0.05) assert.ok(strikeAt(style, u, 3, 10, 10, c).reach <= 0.2, `${style} stays home: what it throws comes out, not the part`);
  assert.equal(strikeOf('hound'), 'shock', 'a hound barks with its head');
  assert.equal(strikeOf('hound', true), 'rake', 'and rakes with its legs');
  assert.equal(strikeOf('horse'), 'spill', 'a trojan spills from its hatch');
  assert.equal(strikeOf('horse', true), 'headbutt', 'and butts with its head');
  const { shapeOf } = await import('./dist/virus-art.mjs');
  for (const shape of ['crab', 'padlock', 'serpent', 'wraith', 'hound', 'eye', 'spider', 'tick', 'blades', 'block', 'gate', 'dish', 'cube', 'fountain', 'cocoon', 'rings', 'hive', 'horse', 'boiler', 'magnet', 'mast', 'bomb']) {
    assert.ok(STRIKES[strikeOf(shape)] && STRIKES[strikeOf(shape, true)], `${shape} has moves`);
    assert.notEqual(strikeOf(shape), strikeOf(shape, true), `${shape}'s core and limbs move differently`);
  }
  assert.equal(shapeOf({ family: 'ransomware' }), 'crab');
  assert.ok(strikeAt('headbutt', 0.2, 0, 0, 0, c).dy < 0, 'a headbutt rears first');
});
