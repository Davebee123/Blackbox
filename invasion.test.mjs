// Invasions (milestone 2): invaders from found locations, the wall, sieges and breaches,
// jacking in, and the chip that stops at 1.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, part, restore, syncServer, tickServices, serverLevel, active, SAVE_VERSION } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import { tickNetwork, wallRating, wallBands, travelMs, outcome, chipRate, grindRate } from './dist/invasion.mjs';
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
  Object.assign(s.locations[0], { level, depth, runs: 1 }); // connected: only servers you've connected to send invasions (GAME_RULES.md "Invasions and the wall")
  s.services = { ...services };
  s.firewall = { pin: fw, plus: 0, frag: 0, defragUntil: 0 };
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

test('invaders only come from servers you have connected to; the network plays on while you are away', () => {
  const s = fresh();
  s.clock = 0;
  tickNetwork(s, 0);
  s.clock = 0;
  wait(s, 20 * MIN);
  assert.equal(s.invasion, null, 'nothing found, nothing comes');
  command(s, 'developer location worm');
  wait(s, 20 * MIN);
  assert.equal(s.invasion, null, 'found but never connected to: nothing comes (GAME_RULES.md "Invasions and the wall")');
  s.locations[0].runs = 1;
  wait(s, I.firstMs - 5000);
  assert.equal(s.invasion, null);
  const ev = wait(s, 5000);
  assert.ok(types(ev).includes('invader'), 'the first one sets out 3 logged-on minutes after the first connection');
  assert.equal(s.invasion.state, 'travel');
  s.clock += 60 * MIN; // the game was closed for an hour
  tickNetwork(s, s.clock);
  assert.ok(s.logs.some((e) => e.type === 'wall-breach' || e.type === 'wall-siege' || e.type === 'invasion-cleared'), 'it reached your wall while you were away');
});

test('travel: 2 minutes from layer 1, a minute more per layer, slower behind a filter of Tar', () => {
  const s = world();
  assert.equal(travelMs(s, 1), 2 * MIN);
  assert.equal(travelMs(s, 3), 4 * MIN);
  s.services = { firewall: 1 };
  s.filters = { held: [{ kind: 'filter', rarity: 'custom', level: 1, name: 'Packet Filter of Tar', stats: { strength: 1, tarpit: 50 } }], on: [0] };
  assert.equal(travelMs(s, 1), 3 * MIN, 'Tar 50%: half again as slow');
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
  const had = v2.components;
  const ev = wait(v2, 5000 + travelMs(v2));
  assert.equal(v2.invasion, null, 'blocked outright');
  assert.equal(v2.components, had + 1);
  assert.ok(ev.some((e) => e.type === 'invasion-cleared' && e.blocked));
  assert.ok(ev.some((e) => e.type === 'xp'), 'a trickle of XP');
  assert.ok(v2.net.next >= I.everyMs[0] && v2.net.next <= I.everyMs[1], 'the next one sets out 20–30 minutes later');
});

test('wall bands: what your wall blocks and holds, by invader level', () => {
  const s = fresh();
  command(s, 'developer server 10');
  s.firewall = { pin: 0, plus: 0, frag: 0, defragUntil: 0 };
  assert.deepEqual(wallBands(s), { blocks: 0, holds: 0 }, 'no firewall to speak of');
  s.firewall.pin = 1;
  assert.deepEqual(wallBands(s), { blocks: 1, holds: 13 }, 'it blocks its own level; the server level adds nothing');
  s.firewall.pin = 10;
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
  s.firewall.pin = 1;
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
});

test('a chip stops at 1: a breach never takes the last point, online or away, and nothing crashes', () => {
  const s = world();
  const inv = atWall(s);
  s.server.integrity = 3;
  const ev = wait(s, 10 * MIN);
  assert.equal(s.server.integrity, 1, 'chipped down to 1 and no further');
  assert.ok(!types(ev).includes('crashed'));
  assert.equal(s.invasion, inv, 'it stays at the wall until you deal with it');
  assert.ok(wallRating(s) > 0, 'the wall stays up');
  assert.equal(s.degraded, undefined);
  // Away: a day of breaches played out a minute at a time.
  const a = world();
  atWall(a);
  a.server.integrity = 2;
  a.clock += 24 * 60 * MIN;
  const away = tickNetwork(a, a.clock);
  assert.equal(a.server.integrity, 1);
  assert.ok(!types(away).includes('crashed'));
  assert.equal(a.occupation, undefined, 'nothing moves into your server');
  // On a run the chip takes the run's bar, never below 1 either.
  const r = world();
  atWall(r);
  play(r, 'connect ' + r.locations[0].id);
  r.run.integrity = 2;
  wait(r, 10 * MIN);
  assert.equal(r.run.integrity, 1);
  assert.ok(r.run, 'still connected');
});

test('losing a home fight leaves you at 1; an invader you lost to stays at the wall, as worn as you left it', () => {
  const s = world();
  command(s, 'encounter cryptjack');
  command(s, 'engage');
  s.server.integrity = 1;
  s.encounter.cycle = part(s, 'pulse').attack.due;
  command(s, 'hold');
  resolveCycle(s);
  assert.equal(s.encounter.phase, 'crashed');
  assert.equal(s.server.integrity, 1);
  assert.equal(s.degraded, undefined);

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
  assert.equal(t.server.integrity, 1);
  assert.equal(t.invasion, inv, 'still at the wall');
  assert.ok(inv.hp < 1, 'as worn down as you left it');
});

test('one bar: Integrity is your health at home and on a run, its max what max Integrity was, and it rests back at home', async () => {
  const { maxSignal, idleRegen } = await import('./dist/combat.mjs');
  const s = world();
  assert.equal(s.server.max, maxSignal(s), 'power and gear, not the server curve');
  s.server.integrity = Math.round(s.server.max / 2);
  play(s, 'connect ' + s.locations[0].id);
  assert.equal(s.run.integrity, Math.round(s.server.max / 2), 'a run starts from the bar as it is');
  s.run.integrity -= 5;
  play(s, 'jack out');
  assert.equal(s.server.integrity, Math.round(s.server.max / 2) - 5, 'and gives it back as it is');
  const before = s.server.integrity;
  idleRegen(s, 30000);
  assert.equal(s.server.integrity, Math.min(s.server.max, before + Math.floor(s.server.max * CONFIG.signalRest / 2)), 'it rests back 20% of its max a minute');
  // One top-up: repair is the same command.
  s.server.credits = 1e6;
  command(s, 'repair');
  assert.equal(s.server.integrity, s.server.max);
});

test('saves from before invasions load with a quiet network', () => {
  const old = fresh();
  old.version = 15;
  delete old.invasion; delete old.net; delete old.gate;
  const s = restore(JSON.parse(JSON.stringify(old)));
  assert.equal(s.version, SAVE_VERSION);
  assert.equal(s.invasion, null);
  assert.deepEqual(s.net, { wall: null, next: null });
  assert.equal(serverLevel(s), 1);
});

test('an older save: Signal becomes the one Integrity bar; Degraded mode and an occupied home go; safe to run twice', async () => {
  const { healthRestore, maxSignal } = await import('./dist/combat.mjs');
  const s = world();
  const max = maxSignal(s);
  Object.assign(s, { signal: 40, signalAcc: 0.5, degraded: { since: 0, until: 1, ms: 1 }, occupation: { id: 'home', occupied: { left: 1 } } });
  s.server.integrity = 0; s.server.max = 900; // the old server curve, crashed
  healthRestore(s);
  assert.deepEqual([s.server.integrity, s.server.max], [40, max], 'Signal\'s value, Signal\'s max');
  for (const k of ['signal', 'signalAcc', 'degraded', 'occupation']) assert.ok(!(k in s), k);
  healthRestore(s);
  assert.deepEqual([s.server.integrity, s.server.max], [40, max], 'twice: the same');
  const full = world();
  full.signal = null; // full Signal
  healthRestore(full);
  assert.equal(full.server.integrity, max);
});
