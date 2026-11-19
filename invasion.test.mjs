// Invasions: invaders from servers you've connected to, the chip at HOME, intercepting, and the chip that stops at 1.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, part, restore, syncServer, tickServices, serverLevel, active, SAVE_VERSION } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import { tickNetwork, travelMs, chipRate } from './dist/invasion.mjs';
import { CONFIG } from './dist/data.mjs';

CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.misses = false;
const MIN = 60000;
const I = CONFIG.invasion;

// A server with one found location at a level; the network clock starts at t = 0.
function world({ level = 1, family = 'worm', depth = 1, services = {} } = {}) {
  const s = fresh();
  command(s, `developer location ${family}`);
  Object.assign(s.locations[0], { level, depth, runs: 1 }); // connected: only servers you've connected to send invasions (GAME_RULES.md "Invasions")
  s.services = { ...services };
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
// The next invader, straight to HOME (plain: no mutation, grade 1, so the numbers are exact).
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
  assert.equal(s.invasion, null, 'found but never connected to: nothing comes (GAME_RULES.md "Invasions")');
  s.locations[0].runs = 1;
  wait(s, I.firstMs - 5000);
  assert.equal(s.invasion, null);
  const ev = wait(s, 5000);
  assert.ok(types(ev).includes('invader'), 'the first one sets out 3 logged-on minutes after the first connection');
  assert.equal(s.invasion.state, 'travel');
  s.clock += 60 * MIN; // the game was closed for an hour
  tickNetwork(s, s.clock);
  assert.ok(s.logs.some((e) => e.type === 'wall-breach'), 'it reached HOME while you were away');
});

test('travel: 2 minutes from layer 1, a minute more per layer', () => {
  const s = world();
  assert.equal(travelMs(s, 1), 2 * MIN);
  assert.equal(travelMs(s, 3), 4 * MIN);
});

test('nothing stops an invasion but you: every one reaches HOME and chips 1% a minute until you intercept it', () => {
  for (const level of [1, 6, 30]) {
    const s = world({ level });
    const inv = atWall(s);
    assert.equal(inv.state, 'breach', `a level-${level} one reaches HOME`);
    assert.equal(chipRate(), 1);
    wait(s, 5 * MIN);
    assert.equal(s.server.integrity, s.server.max - Math.round(s.server.max * 0.05), '1% of max a minute');
    assert.equal(s.invasion, inv, 'it stays until you deal with it');
    assert.equal(inv.hp, 1, 'nothing wears it down');
    assert.ok(inv.grown > 0, 'its bounty grows while it sits');
  }
});

test('left alone at HOME 15 minutes, it leaves unpaid, the streak stands, and the next one is scheduled', () => {
  const s = world();
  const inv = atWall(s);
  s.net.streak = 3;
  const had = { ...s.materials };
  wait(s, 14 * MIN);
  assert.equal(s.invasion, inv, 'still there at 14 minutes');
  const ev = wait(s, MIN + 5000);
  assert.equal(s.invasion, null, 'gone at 15');
  assert.ok(ev.some((e) => e.type === 'invasion-cleared' && e.lost && /left HOME/.test(e.message)));
  assert.deepEqual(s.materials, had, 'its bounty went with it');
  assert.equal(s.net.streak, 3, 'no loss: the streak stands');
  assert.ok(s.net.next >= I.everyMs[0] - 5000 && s.net.next <= I.everyMs[1], 'the next one sets out 20-30 minutes later');
});

test('intercept: catch it on its road, before it chips anything', () => {
  const s = world();
  s.net.next = 0;
  wait(s, 5000);
  const inv = s.invasion;
  assert.equal(inv.state, 'travel');
  const ev = play(s, 'intercept');
  assert.ok(types(ev).includes('jack-in'));
  assert.ok(active(s));
  assert.equal(s.encounter.invader, inv.id);
  const left = inv.left;
  wait(s, MIN);
  assert.equal(inv.left, left, 'it waits on its road while you fight it');
});

test('intercept at HOME: as worn as a lost fight left it, armor intact, for a full kill; the gate intrusion waits', () => {
  const s = world({ level: 6 });
  command(s, 'encounter cryptjack');
  const gate = s.encounter;
  assert.match(play(s, 'jack in').at(-1).message, /Nothing/, 'nothing coming yet');
  const inv = atWall(s);
  inv.hp = 0.5; // a fight you lost left it at half
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
  assert.equal(s.invasion, inv, 'it stays at HOME until you deal with it');
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

test('losing a home fight leaves you at 1; an invader you lost to stays at HOME, as worn as you left it', () => {
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
  assert.equal(t.invasion, inv, 'still at HOME');
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
