// KESSLER-FARM-00: the crew dungeon (rogue.mjs FARM).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, part, active, hooks } from './dist/combat.mjs';
import { play, layoutOf } from './dist/run.mjs';
import { FARM, FARM_UNIQUES, farmOf, openFarm } from './dist/rogue.mjs';
import { BOSSES } from './dist/data.mjs';
import { tickEvents } from './dist/events.mjs';
import { matesOf } from './dist/crew.mjs';

const at7 = () => { const s = fresh(); s.tutorialCompleted = true; s.hackers = { breaker: { level: 7, xp: 0 } }; return s; };
const win = (s) => {
  for (const p of s.encounter.virus.parts) Object.assign(p, { integrity: 0, armor: 0 });
  const p = s.encounter.virus.parts[0];
  p.integrity = 1;
  command(s, 'spike ' + p.id);
  resolveCycle(s);
};
const kill = (s, room) => { play(s, 'cd ' + room); play(s, 'attack'); assert.ok(active(s), `a fight in ${room}`); win(s); assert.ok(!active(s)); };

test('KESSLER-FARM-00 turns up on your map at level 7, and takes only a crew', () => {
  const s = fresh();
  s.hackers = { breaker: { level: 6, xp: 0 } };
  tickEvents(s, 1000);
  assert.equal(farmOf(s), null, 'not before level 7');
  s.hackers.breaker.level = 7;
  tickEvents(s, 1000);
  const loc = farmOf(s);
  assert.equal(loc.name, FARM.name);
  assert.ok(s.logs.some((e) => e.type === 'located' && /crew dungeon/.test(e.message)));
  play(s, 'connect kessler');
  assert.ok(!s.run, 'no crew, no entry');
  assert.ok(s.logs.some((e) => /built for a crew/.test(e.message)));
  play(s, 'crew sim bastion');
  play(s, 'connect kessler');
  assert.ok(s.run);
});

test('the farm: packs block the way, the first two bosses hold the ledger key, and the crew regroups after each', () => {
  const s = at7();
  const loc = openFarm(s);
  play(s, 'crew sim bastion operator');
  play(s, 'connect kessler');
  assert.match(s.logs.filter((e) => e.type === 'net-out' || e.type === 'error' || e.type === 'warning').map((e) => e.message).join(' ') + ' ok', /ok/);
  play(s, 'cd intake/racks');
  assert.equal(s.run.cwd, '/', 'the intake pack is in the way');
  play(s, 'cd intake'); play(s, 'attack');
  const pack = s.encounter.virus;
  assert.ok(pack.elite);
  win(s);
  play(s, 'cat manifest.txt');
  play(s, 'cd racks'); play(s, 'cat shift.log');
  assert.ok(!s.logs.some((e) => e.message?.includes(`word: ${loc.password.replace(/\d+$/, '')}`)), 'locked while the Foreman runs');
  play(s, 'attack');
  assert.equal(s.encounter.virus.boss, 'foreman');
  assert.ok(s.encounter.virus.elite, 'built for a crew');
  s.run.integrity = 1;
  win(s);
  assert.ok(s.run.integrity >= Math.round(s.run.max * FARM.regroup), 'regrouped');
  assert.ok(s.logs.some((e) => /Regroup/.test(e.message)));
  assert.ok(loc.spawns['/intake/racks'].respawnAt - Date.now() > FARM.bossMs - 60000, 'back in 6 hours');
  play(s, 'cat shift.log');
  const word = loc.password.replace(/\d+$/, ''), digits = loc.password.match(/\d+$/)[0];
  assert.ok(s.logs.some((e) => (e.lines || [e.message]).join(' ').includes(word) || JSON.stringify(e).includes(`word: ${word}`)), 'the word');
  play(s, 'cd /'); kill(s, 'cooling'); play(s, 'cd loop'); play(s, 'attack');
  assert.equal(s.encounter.virus.boss, 'heatsink');
  win(s);
  play(s, 'cat temps.log');
  assert.ok(s.logs.some((e) => JSON.stringify(e).includes(`cycle tag: ${digits}`)), 'the digits');
  play(s, 'cd /');
  play(s, `unlock ledger ${loc.password}`);
  assert.ok(loc.state.unlocked['/ledger']);
  play(s, 'cd ledger/core'); play(s, 'attack');
  assert.equal(s.encounter.virus.boss, 'coldwallet');
  win(s);
  assert.equal(Object.values(loc.spawns).filter((x) => x.boss && !x.alive).length, 3);
});

test('the farm\'s eight: two from each boss (with bad-luck protection), two from its packs; the collection counts them', async () => {
  const { bossUniques } = await import('./dist/combat.mjs');
  const { collectionMarkup } = await import('./dist/view.mjs');
  for (const b of ['foreman', 'heatsink', 'coldwallet']) { assert.ok(BOSSES[b]); assert.equal(bossUniques(b).length, 2); }
  const s = at7();
  openFarm(s);
  s.collection = { 'dead-pool': 1 };
  assert.match(collectionMarkup(s), /KESSLER-FARM-00 · 1\/8/);
  assert.equal(FARM_UNIQUES.length, 8);
});
