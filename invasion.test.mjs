// Invasions (milestone 2): invaders from found locations, the wall, sieges and breaches,
// jacking in, crashes and Degraded mode.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, part, restore, syncServer, tickServices, serverLevel, active, SAVE_VERSION } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import { tickNetwork, wallRating, wallBands, travelMs, outcome, chipRate, grindRate, degradedLeft } from './dist/invasion.mjs';
import { CONFIG } from './dist/data.mjs';

CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.misses = false;
const MIN = 60000;
const I = CONFIG.invasion;

// A server with one found location at a level; the network clock starts at t = 0.
// fw: the firewall's level (0: none to speak of, every invasion breaches).
function world({ level = 1, family = 'worm', depth = 1, services = {}, fw = 0 } = {}) {
  const s = fresh();
  command(s, `developer location ${family}`);
  Object.assign(s.locations[0], { level, depth });
  s.services = { ...services };
  s.firewall = { level: fw, frag: 0, defragUntil: 0, hardenUntil: 0 };
  syncServer(s);
  s.server.integrity = s.server.max;
  s.clock = 0;
  tickNetwork(s, 0);
  return s;
}
// Advance logged-on time in 5-second ticks (the longest a tick counts).
function wait(s, ms) {
  const out = [];
  for (let t = 0; t < ms; t += 5000) { s.clock += Math.min(5000, ms - t); out.push(...tickNetwork(s, s.clock)); }
  return out;
}
// The next invader, straight to the wall (plain: no mutation, grade 1, so the numbers are exact).
function atWall(s) {
  s.net.next = 0;
  wait(s, 5000);
  const inv = s.invasion;
  Object.assign(inv, { mutation: null, grade: 1 });
  wait(s, inv.left);
  return inv;
}
const types = (events) => events.map((e) => e.type);

test('invaders only come from locations you have found, only while you are logged on', () => {
  const s = fresh();
  s.clock = 0;
  tickNetwork(s, 0);
  s.clock = 0;
  wait(s, 20 * MIN);
  assert.equal(s.invasion, null, 'nothing found, nothing comes');
  command(s, 'developer location worm');
  wait(s, I.firstMs - 5000);
  assert.equal(s.invasion, null);
  const ev = wait(s, 5000);
  assert.ok(types(ev).includes('invader'), 'the first one sets out 3 logged-on minutes after the first find');
  assert.equal(s.invasion.state, 'travel');
  const left = s.invasion.left;
  s.clock += 60 * MIN; // the game was closed for an hour
  tickNetwork(s, s.clock);
  assert.equal(s.invasion.left, left - I.maxTickMs, 'a long gap counts as one tick');
});

test('travel: 2 minutes from layer 1, a minute more per layer, slower behind a Tarpit', () => {
  const s = world();
  assert.equal(travelMs(s, 1), 2 * MIN);
  assert.equal(travelMs(s, 3), 4 * MIN);
  s.services = { tarpit: 1 };
  assert.equal(travelMs(s, 1), 3 * MIN, 'Tarpit v1: 50% slower');
  s.services = { tarpit: 3 };
  assert.equal(travelMs(s, 1), 5 * MIN);
});

test('the wall: no firewall means a breach; a level-6 invader is contested by a level-1 firewall; a level-1 one is blocked', () => {
  const bare = world();
  atWall(bare);
  assert.equal(bare.invasion.state, 'breach');
  assert.equal(chipRate(wallRating(bare) / 100), 1, 'a breach chips 1% a minute');

  const v1 = world({ level: 6, fw: 1 }); // exactly between the lines
  atWall(v1);
  assert.equal(v1.invasion.state, 'siege');
  assert.equal(chipRate(1), 0.5, 'halfway between the lines: half the chip');
  assert.equal(grindRate(1), 12, 'and the wall grinds 12% a minute');

  const v2 = world({ fw: 1 });
  v2.net.next = 0;
  const salvage = v2.salvage.length;
  const ev = wait(v2, 5000 + travelMs(v2));
  assert.equal(v2.invasion, null, 'blocked outright');
  assert.equal(v2.salvage.length, salvage + 1);
  assert.ok(ev.some((e) => e.type === 'invasion-cleared' && e.blocked));
  assert.ok(ev.some((e) => e.type === 'xp'), 'a trickle of XP');
  assert.ok(v2.net.next >= I.everyMs[0] && v2.net.next <= I.everyMs[1], 'the next one sets out 6–10 minutes later');
});

test('wall bands: what your wall blocks and holds, by invader level', () => {
  const s = fresh();
  command(s, 'developer server 10');
  s.firewall = { level: 0, frag: 0, defragUntil: 0, hardenUntil: 0 };
  assert.deepEqual(wallBands(s), { blocks: 0, holds: 0 }, 'no firewall to speak of');
  s.firewall.level = 1;
  assert.deepEqual(wallBands(s), { blocks: 1, holds: 13 }, 'it blocks its own level; the server level adds nothing');
  s.firewall.level = 10;
  assert.deepEqual(wallBands(s), { blocks: 10, holds: 26 });
  assert.equal(outcome(1.2), 'blocked');
  assert.equal(outcome(0.8), 'breach');
});

test('a siege wears the invader down while it chips the server; a breach just chips', () => {
  const s = world({ level: 6, fw: 1 });
  const inv = atWall(s);
  wait(s, 2 * MIN);
  assert.ok(Math.abs(inv.hp - 0.76) < 0.01, '12% a minute');
  assert.equal(s.server.integrity, 99, '0.5% a minute of 100');
  const ev = wait(s, 7 * MIN);
  assert.equal(s.invasion, null, 'ground down to nothing');
  assert.ok(ev.some((e) => e.type === 'invasion-cleared'));

  const b = world();
  atWall(b);
  wait(b, 5 * MIN);
  assert.equal(b.server.integrity, 95);
  assert.equal(b.invasion.hp, 1, 'no wall to wear it down');
});

test('a firewall upgrade mid-breach turns it into a siege', () => {
  const s = world({ level: 6 });
  atWall(s);
  assert.equal(s.invasion.state, 'breach');
  s.firewall.level = 1;
  const ev = wait(s, 5000);
  assert.equal(s.invasion.state, 'siege');
  assert.ok(types(ev).includes('wall-siege'));
});

test('jack in: fight it at the wall, worn down, armor intact, for a full kill; the gate intrusion waits', () => {
  const s = world({ level: 6, fw: 1 });
  command(s, 'encounter cryptjack');
  const gate = s.encounter;
  assert.match(play(s, 'jack in').at(-1).message, /on its way|Nothing/, 'nothing at the wall yet');
  const inv = atWall(s);
  wait(s, 4 * MIN + 10000); // worn to about half
  const ev = play(s, 'jack in');
  assert.ok(types(ev).includes('jack-in'));
  assert.ok(active(s), 'straight into the fight');
  assert.equal(s.encounter.invader, inv.id);
  assert.equal(s.gate, gate, 'the gate intrusion is parked');
  for (const p of s.encounter.virus.parts) {
    assert.ok(p.integrity < p.max && p.integrity >= Math.round(p.max * 0.45), `${p.id} worn down`);
    assert.equal(p.armor, p.maxArmor, 'armor intact');
  }
  const hp = s.server.integrity;
  wait(s, 2 * MIN);
  assert.equal(s.server.integrity, hp, 'no chip while you fight it');
  // Win it.
  for (const p of s.encounter.virus.parts) Object.assign(p, { integrity: 0, armor: 0 });
  const last = s.encounter.virus.parts[0];
  last.integrity = 1;
  const xp = s.hackers.breaker?.xp || 0;
  command(s, 'spike ' + last.id);
  const won = resolveCycle(s);
  assert.ok(won.some((e) => e.type === 'victory'));
  assert.ok(won.some((e) => e.type === 'invasion-cleared'));
  assert.equal(s.invasion, null);
  assert.ok((s.hackers.breaker.xp || 0) > xp || s.hackers.breaker.level > 1, 'full XP');
  command(s, 'engage');
  assert.equal(s.encounter, gate, 'engage brings the gate intrusion back');
  assert.ok(active(s));
});

test('you jack out of a run before you can jack in', () => {
  const s = world();
  atWall(s);
  play(s, 'connect ' + s.locations[0].id);
  assert.match(play(s, 'jack in').at(-1).message, /Jack out first/);
});

test('a chip never ends a home fight you are in', () => {
  const s = world();
  atWall(s);
  command(s, 'encounter cryptjack');
  command(s, 'engage');
  for (const p of s.encounter.virus.parts) p.attack = null;
  s.server.integrity = 1;
  wait(s, 3 * MIN);
  assert.equal(s.server.integrity, 1);
  assert.equal(s.degraded, null);
});

test('crash: a breach chips you to zero, the server reboots at half and runs degraded for 10 real minutes', () => {
  const s = world();
  atWall(s);
  s.server.integrity = 1;
  const ev = wait(s, MIN);
  assert.ok(types(ev).includes('crashed'));
  assert.ok(types(ev).includes('degraded'));
  assert.equal(s.server.integrity, 50);
  assert.ok(s.degraded);
  assert.equal(wallRating(s), 0, 'the wall is down');
  wait(s, 5 * MIN);
  assert.equal(s.server.integrity, 50, 'the invader waits: no chip while degraded');
  const left = degradedLeft(s, s.clock);
  assert.ok(left > 4.5 * MIN && left < 5.5 * MIN, 'about 5 of the 10 minutes left');
  // Server XP stops; your own XP doesn't.
  const sxp = s.serverXp;
  play(s, 'developer level 3');
  assert.equal(s.serverXp, sxp, 'the rebooting server earns nothing');
  assert.equal(s.hackers.breaker.level, 3);
  // The real clock runs out even with the game closed.
  s.clock += 10 * MIN;
  const back = tickNetwork(s, s.clock);
  assert.ok(types(back).includes('rebooted'));
  assert.equal(s.degraded, null);
  wait(s, MIN);
  assert.equal(s.server.integrity, 49, 'the breach resumes');
});

test('Degraded mode pauses the install queue', () => {
  const s = world();
  s.materials.worm = 20;
  s.server.credits = 500;
  command(s, 'developer salvage 10');
  s.recipes.push('raid');
  command(s, 'install raid', 0);
  assert.equal(s.install.doneAt, 15 * MIN);
  play(s, 'developer crash');
  wait(s, 5000); // the clock starts
  wait(s, 10 * MIN);
  assert.equal(s.degraded, null);
  assert.equal(s.install.doneAt, 15 * MIN + 10 * MIN, 'pushed back by the time spent degraded');
  tickServices(s, 16 * MIN + 5000);
  assert.ok(s.install, 'not done at the old time');
  tickServices(s, 25 * MIN + 5000);
  assert.equal(s.services.raid, 1);
});

test('losing a home fight reboots into Degraded mode too; losing to an invader leaves it at the wall', () => {
  const s = world();
  command(s, 'encounter cryptjack');
  command(s, 'engage');
  s.server.integrity = 1;
  s.encounter.cycle = part(s, 'pulse').attack.due;
  command(s, 'hold');
  resolveCycle(s);
  assert.equal(s.encounter.phase, 'crashed');
  assert.equal(s.server.integrity, 50);
  assert.ok(s.degraded);

  const t = world();
  const inv = atWall(t);
  play(t, 'jack in');
  const pulse = part(t, 'pulse');
  pulse.integrity = Math.round(pulse.max / 2);
  t.server.integrity = 1;
  t.encounter.cycle = pulse.attack.due;
  command(t, 'hold');
  resolveCycle(t);
  assert.equal(t.encounter.phase, 'crashed');
  assert.equal(t.invasion, inv, 'still at the wall');
  assert.ok(inv.hp < 1, 'as worn down as you left it');
  assert.ok(t.degraded);
});

test('saves from before invasions load with a quiet network', () => {
  const old = fresh();
  old.version = 15;
  delete old.invasion; delete old.net; delete old.degraded; delete old.gate;
  const s = restore(JSON.parse(JSON.stringify(old)));
  assert.equal(s.version, SAVE_VERSION);
  assert.equal(s.invasion, null);
  assert.deepEqual(s.net, { wall: null, next: null });
  assert.equal(s.degraded, null);
  assert.equal(serverLevel(s), 1);
});
