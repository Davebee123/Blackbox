// The bosses' own bodies (boss-art.mjs): each boss wears one, with its own moves, and every part it brings is drawn.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BOSS_SHAPE, RESIDENT_SHAPE, BOSS_BUILD, BOSS_STRIKES, bossShape, bossKit } from './dist/boss-art.mjs';
import { shapeOf, strikeOf, STRIKES } from './dist/virus-art.mjs';
import { BOSSES, createVirus } from './dist/data.mjs';

const virusOf = (id, family) => { const B = BOSSES[id]; return createVirus(B.strain || 'random', 4821, { family: family || B.family, run: true, level: 24, mutation: null, boss: id, ...(B.strain ? { strain: B.strain } : {}) }); };
// The regions a model tags its points with, built on a kit that only takes notes.
function regionsOf(v) {
  const seen = new Set(), note = (i) => (...a) => { seen.add(a[i]); };
  BOSS_BUILD[bossShape(v)](bossKit({ add: note(6), orb: note(6), tube: note(4), ring: note(5), box: note(6), disc: note(4), anim: () => 1, sway: () => 1, orbit: () => 1, spin: () => 1, B: 'B', S: () => 'S', r: () => 0.5, jit: (x) => x, v }));
  return seen;
}

test('every boss wears a body of its own, with two moves', () => {
  for (const id of Object.keys(BOSSES)) for (const family of id === 'resident' ? Object.keys(RESIDENT_SHAPE) : [null]) {
    const v = virusOf(id, family), shape = shapeOf(v);
    assert.equal(shape, id === 'resident' ? RESIDENT_SHAPE[family] : BOSS_SHAPE[id], `${id} wears its own`);
    assert.ok(BOSS_BUILD[shape], `${shape} is modelled`);
    assert.ok(STRIKES[strikeOf(shape)] && STRIKES[strikeOf(shape, true)], `${shape} has moves`);
    assert.notEqual(strikeOf(shape), strikeOf(shape, true), `${shape}'s plain and special parts move differently`);
  }
  assert.equal(new Set([...Object.values(BOSS_SHAPE), ...Object.values(RESIDENT_SHAPE)]).size, Object.keys(BOSS_BUILD).length, 'no two bosses share one');
  assert.deepEqual(Object.keys(BOSS_STRIKES).sort(), Object.keys(BOSS_BUILD).sort());
});

test('a plain virus keeps its family body; a Resident of a later family too', () => {
  assert.equal(shapeOf({ family: 'ransomware' }), 'crab');
  assert.equal(shapeOf({ family: 'trojan', boss: 'resident' }), 'horse');
});

test('every part a boss brings is drawn', () => {
  for (const id of Object.keys(BOSSES)) for (const family of id === 'resident' ? Object.keys(RESIDENT_SHAPE) : [null]) {
    const v = virusOf(id, family), seen = regionsOf(v);
    if (BOSSES[id].own) for (const p of v.parts) assert.ok(seen.has(p.id), `${id}: the ${p.name} is on its model`);
    else assert.ok(seen.has('B') && seen.has('S'), `${id}: its basic and special parts are on its model`);
    for (const x of BOSSES[id].extra || []) if (v.parts.some((p) => p.id === x.id)) assert.ok(seen.has(x.id), `${id}: its ${x.name} is on its model`);
  }
});

test('the parts that join mid-fight are modelled from the start', () => {
  const has = (id, ...regions) => { const seen = regionsOf(virusOf(id)); for (const r of regions) assert.ok(seen.has(r), `${id} has ${r}`); };
  has('centrifuge', ...Object.values(BOSSES.centrifuge.buyers).map((b) => b.id));
  has('shakedown', 'demand2');
  has('camswarm', '#camera1', '#camera4', 'frag1');
  has('nb-hashlord', 'miner2');
  const v = virusOf('recursion');
  v.parts.push({ id: 'frame3', frame: 3, integrity: 10, max: 10 });
  assert.ok(regionsOf(v).has('frame3'), 'a pushed frame joins the tunnel');
});
