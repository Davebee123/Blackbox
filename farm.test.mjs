// KESSLER-FARM-00: the crew dungeon (rogue.mjs FARM).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, part, active, hooks } from './dist/combat.mjs';
import { play, layoutOf } from './dist/run.mjs';
import { FARM, FARM_UNIQUES, farmOf, openFarm } from './dist/rogue.mjs';
import { BOSSES } from './dist/data.mjs';
import { tickEvents } from './dist/events.mjs';
import { matesOf } from './dist/crew.mjs';
import * as FP from './dist/floorplan.mjs';

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

// Since R1 the farm's folders are rooms (netrooms.mjs farmGraph): cd walks them, a pack holds its room, and the ledger
// is a vault that opens once the Foreman and the Heatsink are down (their badge word and cycle tag, no typing).
test('the farm: packs block the way, the first two bosses open the ledger, and the crew regroups after each', () => {
  const s = at7();
  const loc = openFarm(s);
  play(s, 'crew sim bastion operator');
  play(s, 'connect kessler');
  assert.ok(s.run?.rooms, 'the farm is rooms');
  play(s, 'cd intake/racks');
  assert.equal(FP.hereOf(s).path0, '/intake', 'the intake pack is in the way');
  assert.match(s.run.cwd, /^Elite \d$/, 'its room is named for what it is');
  assert.equal(s.rooms.screen?.kind, 'virus');
  play(s, 'attack');
  const pack = s.encounter.virus;
  assert.ok(pack.elite);
  win(s);
  play(s, 'cd racks');
  play(s, 'attack');
  assert.equal(s.encounter.virus.boss, 'foreman');
  assert.ok(s.encounter.virus.elite, 'built for a crew');
  s.run.integrity = 1;
  win(s);
  play(s, 'ls');
  assert.ok(s.run.integrity >= Math.round(s.run.max * FARM.regroup), 'regrouped');
  assert.ok(s.logs.some((e) => /Regroup/.test(e.message)));
  assert.ok(loc.spawns['/intake/racks'].respawnAt - Date.now() > FARM.bossMs - 60000, 'back in 6 hours');
  play(s, 'cd /ledger'); play(s, 'open');
  assert.ok(!loc.state.unlocked['/ledger'], 'locked while the Heatsink runs');
  play(s, 'cd /'); kill(s, 'cooling'); play(s, 'cd loop'); play(s, 'attack');
  assert.equal(s.encounter.virus.boss, 'heatsink');
  win(s);
  play(s, 'cd /ledger'); play(s, 'open');
  assert.ok(loc.state.unlocked['/ledger'], 'the ledger opens');
  play(s, 'cd core'); play(s, 'attack');
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

// Crew balance (farmsim.mjs): the farm's three are crew bosses (raid.mjs), each a check on a role. Seeded,
// about 6 s: a full crew (Warden, Sysop and two damage, everyone with SIGINT) wins at least 95% of boss tries
// with someone dipping; take away its tank, its healer, its SIGINTs or a damage dealer and the matching boss
// mostly wins.
test('at level 18 a full crew wins at least 95% of boss tries under pressure; without its tank, healer, SIGINTs or second damage dealer the matching boss mostly wins', async () => {
  const { farmScore } = await import('./farmsim.mjs');
  const full = farmScore('demolitionist', ['warden', 'sysop', 'payload'], 18, { seeds: 24 }); // 24 seeds: since the damage profiles the wild rooms on the way shift the dice, and on 8 it swung to 24 of 26 (72 of 74 on 24; 72 of 72 with the parts roll off)
  assert.ok(full.wins >= 0.95 * full.tries, `full crew: ${full.wins}/${full.tries}`);
  assert.ok(full.low < 50 && full.heals > 30, `pressure: lowest ${full.low.toFixed(0)}%, healing ${full.heals.toFixed(0)}% of cycles`);
  const one = (crew, boss, bots = {}, seeds = 16) => farmScore('demolitionist', crew, 18, { seeds, only: boss, tries: 1, bots }).by[boss];
  const tank = one(['sysop', 'payload', 'herder'], 'foreman'), healer = one(['warden', 'payload', 'herder'], 'heatsink', {}, 48); // 48 seeds: since the damage profiles the wild rooms on the way shift the dice, and on 16 it swung 7 to 10 wins (23 of 48)
  const sigint = one(['warden', 'sysop', 'payload'], 'foreman', { interrupt: false }), damage = one(['warden', 'sysop', 'sysop'], 'coldwallet', {}, 48); // 48 seeds: on 16 it swung 3 to 6 wins with the loot rolls' share of the dice (19–22% on 64)
  assert.ok(tank.wins <= 0.5 * tank.tries, `no tank, the Foreman: ${tank.wins}/${tank.tries}`);
  assert.ok(healer.wins <= 0.6 * healer.tries, `no healer, the Heatsink: ${healer.wins}/${healer.tries}`);
  assert.ok(sigint.wins <= 0.3 * sigint.tries, `no SIGINT, the Foreman: ${sigint.wins}/${sigint.tries}`);
  assert.ok(damage.wins <= 0.3 * damage.tries, `one damage dealer, the Coldwallet: ${damage.wins}/${damage.tries}`);
});
