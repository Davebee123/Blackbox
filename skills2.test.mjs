// Unlockable skills (levels 11–19), talents and ranks: each does what its card says.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, part, readyIn, hasTalent, maxSignal, patches } from './dist/combat.mjs';
// An attack slipped past you (what Opening waits for): the window opens, and a cycle passes.
const slip = (s) => { (s.encounter.procs ||= {}).slipped = { until: s.encounter.cycle + 1 + (hasTalent(s, 'fast-hands') ? 1 : 0) }; act(s, 'hold'); };
import { CONFIG, SKILLS, ARCHETYPES } from './dist/data.mjs';
// These tests check exact numbers: no crits (gear.test.mjs covers them).
CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.misses = false; // and no misses
CONFIG.powerPerLevel = 0; // flat numbers at every level (level tests turn it back on)
import { start as startAt, act, quiet, noArmor, big, lost } from './classes.test.mjs';

// A level-25 class with exactly these skills on the bar, these talent picks (0 = a, 1 = b) and ranks.
const start = (cls, bar, picks = [], id = 'cryptjack', ranks = {}) => {
  const s = startAt(cls, 50, id);
  s.loadout.equipped[cls] = bar;
  s.loadout.picks[cls] = picks;
  s.loadout.ranks[cls] = ranks;
  return s;
};

// ---------- Breaker ----------
test('Fork Bomb (double on Exposed); Thermal Runaway grows; Brace blocks and cracks the attacker; Sudo crits; Zero-day once, through armor', () => {
  const s = noArmor(quiet(start('breaker', ['exploit', 'fork-bomb', 'thermal-runaway', 'sudo', 'zero-day'])));
  big(s, 'pulse'); big(s, 'encryptor');
  act(s, 'exploit pulse');
  act(s, 'fork-bomb');
  assert.equal(lost(s, 'pulse'), 30);
  assert.equal(lost(s, 'encryptor'), 15);
  const t = noArmor(quiet(start('breaker', ['thermal-runaway'])));
  big(t, 'pulse');
  act(t, 'thermal-runaway pulse'); act(t, 'hold'); act(t, 'hold'); act(t, 'hold');
  assert.equal(lost(t, 'pulse'), 6 + 10 + 14 + 18);
  const c = noArmor(quiet(start('breaker', ['sudo'])));
  big(c, 'pulse');
  act(c, 'sudo');
  act(c, 'spike pulse');
  assert.equal(lost(c, 'pulse'), Math.floor(25 * 1.5), 'Sudo: every hit crits');
  const z = quiet(start('breaker', ['zero-day']));
  big(z, 'pulse');
  act(z, 'zero-day pulse');
  assert.equal(lost(z, 'pulse'), 80);
  assert.match(command(z, 'zero-day pulse').at(-1).message, /used up/);
  const b = start('breaker', ['brace']);
  part(b, 'encryptor').attack = null;
  const pulse = part(b, 'pulse');
  const armor = pulse.armor;
  b.encounter.cycle = pulse.attack.due;
  const amount = pulse.attack.amount;
  act(b, 'brace');
  assert.equal(100 - b.server.integrity, Math.max(Math.ceil(amount / 2), amount - 5), 'Brace: +5 Block');
  assert.equal(pulse.armor, armor - 1, 'and the attacker lost a chit');
});

// ---------- Bastion ----------
test('Purge burns, heals and decrypts; Reclaim heals half; Quarantine delays and exposes; Harden; Failover hits for missing health', () => {
  const s = noArmor(quiet(start('bastion', ['purge', 'reclaim', 'quarantine', 'harden', 'failover'])));
  big(s, 'pulse');
  s.server.integrity = 50;
  s.encounter.encrypt = 6;
  act(s, 'purge pulse');
  assert.equal(s.encounter.encrypt, 0);
  assert.equal(lost(s, 'pulse'), 6);
  assert.equal(s.server.integrity, 52);
  act(s, 'reclaim pulse');
  assert.equal(lost(s, 'pulse'), 6 + 35 + 6);
  assert.equal(s.server.integrity, 52 + 18 + 2, 'half of 35, rounded, and the Purge tick');
  const q = noArmor(start('bastion', ['quarantine']));
  big(q, 'pulse');
  const due = part(q, 'pulse').attack.due;
  act(q, 'quarantine pulse');
  assert.equal(part(q, 'pulse').attack.due, due + 3);
  act(q, 'spike pulse');
  assert.equal(lost(q, 'pulse'), Math.floor(25 * 1.25), 'Quarantined parts take +25%');
  const f = noArmor(quiet(start('bastion', ['failover'])));
  big(f, 'pulse');
  f.server.integrity = 20;
  act(f, 'failover');
  assert.equal(lost(f, 'pulse'), 20, 'a quarter of 80 missing');
  const h = start('bastion', ['harden']);
  h.encounter.chits = 0;
  act(h, 'harden');
  assert.equal(h.encounter.chits, 1);
});

// ---------- Infiltrator ----------
test('Opening lights after an attack is delayed or misses you; Propagate copies burns; Null Route dodges and crits; Implant burns until it breaks', () => {
  const s = noArmor(start('infiltrator', ['opening', 'propagate', 'null-route', 'implant']));
  big(s, 'pulse'); big(s, 'encryptor');
  assert.match(command(s, 'opening pulse').at(-1).message, /isn't lit/);
  slip(s);
  act(s, 'opening pulse');
  assert.equal(lost(s, 'pulse'), 50);
  const p = noArmor(quiet(start('infiltrator', ['inject', 'propagate'])));
  big(p, 'pulse'); big(p, 'encryptor');
  act(p, 'inject pulse');
  act(p, 'propagate pulse');
  assert.equal(p.encounter.burns.filter((b) => b.target === 'encryptor').length, 1);
  const n = noArmor(start('infiltrator', ['null-route']));
  big(n, 'pulse');
  part(n, 'encryptor').attack = null;
  n.encounter.cycle = part(n, 'pulse').attack.due;
  act(n, 'null-route');
  assert.equal(n.server.integrity, 100, 'dodged');
  act(n, 'spike pulse');
  assert.equal(lost(n, 'pulse'), Math.floor(25 * 1.5), 'and the next skill crits');
  const i = noArmor(quiet(start('infiltrator', ['implant'])));
  big(i, 'pulse');
  act(i, 'implant pulse');
  for (let k = 0; k < 5; k++) act(i, 'hold');
  assert.equal(lost(i, 'pulse'), 60);
});

// ---------- Operator ----------
test('Fork splits helpers up to the cap; Barrier turns a helper into a shield; Reroute moves them and each hits; Cron Storm hits twice', () => {
  const s = noArmor(quiet(start('operator', ['deploy', 'botnet', 'barrier', 'reroute', 'cron-storm'])));
  big(s, 'pulse'); big(s, 'encryptor');
  act(s, 'deploy pulse');
  act(s, 'barrier pulse');
  assert.equal(s.encounter.shield, 12 * 3, 'the three ticks it had left');
  assert.equal(s.encounter.helpers.length, 0);
  s.encounter.readyAt = {};
  act(s, 'botnet pulse');
  const before = lost(s, 'encryptor');
  act(s, 'reroute encryptor');
  assert.equal(lost(s, 'encryptor') - before, 2 * 3 * 4, 'three arrive and hit, then tick');
  s.encounter.readyAt = {};
  const b2 = lost(s, 'encryptor');
  act(s, 'cron-storm');
  assert.equal(lost(s, 'encryptor') - b2, 2 * 3 * 4);
  const f = noArmor(quiet(start('operator', ['botnet', 'fork'])));
  big(f, 'pulse');
  const was = SKILLS.helperCap;
  act(f, 'fork');
  for (let k = 0; k < 3; k++) { f.encounter.readyAt = {}; act(f, 'botnet pulse'); }
  assert.ok(f.encounter.helpers.length <= SKILLS.helperCap, 'never past the cap');
  assert.equal(was, 6);
});

test('talents change the numbers they say', () => {
  const b = noArmor(quiet(start('breaker', ['overload'], [1])));
  big(b, 'pulse');
  assert.ok(hasTalent(b, 'hair-trigger'));
  act(b, 'overload pulse');
  assert.equal(lost(b, 'pulse'), 35);
  assert.equal(readyIn(b, 'overload'), 1);
  const p = quiet(start('breaker', ['overload', 'segfault'], [0, 1]));
  big(p, 'pulse');
  act(p, 'overload pulse');
  assert.equal(lost(p, 'pulse'), 40, 'Piercing: Overload goes through armor');
  const cd = quiet(noArmor(start('breaker', ['segfault'], [0, 0])));
  const pp = Object.assign(part(cd, 'pulse'), { integrity: 35, max: 100 });
  act(cd, 'segfault pulse');
  assert.equal(pp.integrity, 0, 'Core Dump: the execute starts under 40%');
  const y = quiet(start('bastion', ['firewall', 'patch'], [1, 0, 0]));
  y.server.integrity = 50;
  act(y, 'patch');
  assert.equal(y.server.integrity, 70, 'Service Pack: 20 up front');
  y.server.integrity = 5;
  y.encounter.chits = 0;
  part(y, 'pulse').attack = { name: 'Surge', effect: 'damage', amount: 14, interval: 4, due: y.encounter.cycle };
  act(y, 'hold');
  assert.equal(y.server.integrity, 1, 'Uptime holds at 1');
  const i = noArmor(start('infiltrator', ['opening'], [0]));
  big(i, 'pulse');
  slip(i);
  act(i, 'hold');
  act(i, 'opening pulse');
  assert.equal(lost(i, 'pulse'), 50, 'Fast Hands: Opening stays lit a second cycle');
  const o = noArmor(quiet(start('operator', ['deploy'], [0, 0, 0])));
  big(o, 'pulse');
  act(o, 'deploy pulse');
  assert.equal(lost(o, 'pulse'), 2 * Math.round(14 / 2), 'Big Process + Parallel Deploy: two helpers at half');
});

test('filler ranks change the numbers they say', () => {
  const b = noArmor(quiet(start('breaker', ['overload'], [], 'cryptjack', { overclocked: 3, 'heat-sink': 2 })));
  big(b, 'pulse');
  act(b, 'overload pulse');
  assert.equal(lost(b, 'pulse'), Math.floor(48 * 1.09));
  const y = start('bastion', [], [], 'cryptjack', { redundancy: 2 });
  assert.equal(maxSignal(y), CONFIG.maxSignal + 8);
  const i = start('infiltrator', [], [], 'cryptjack', { 'low-profile': 3 });
  const pulse = part(i, 'pulse');
  i.encounter.cycle = pulse.attack.due;
  const amount = pulse.attack.amount;
  act(i, 'hold');
  assert.equal(100 - i.server.integrity, Math.round(amount * 0.91));
  const ac = quiet(start('breaker', [], [], 'cryptjack', { 'armor-cracker': 2 }));
  act(ac, 'spike pulse');
  assert.deepEqual(patches(ac, 6), [{ source: 'pulse', col: 3 }], 'Armor Cracker: 2 more cycles before it patches');
  const o = noArmor(quiet(start('operator', ['deploy'], [], 'cryptjack', { 'thread-pool': 3 })));
  big(o, 'pulse');
  act(o, 'deploy pulse');
  assert.equal(lost(o, 'pulse'), 15, 'Thread Pool: Deploy +3');
  const r = noArmor(start('infiltrator', ['opening'], [], 'cryptjack', { recon: 2 }));
  big(r, 'pulse');
  slip(r);
  act(r, 'opening pulse');
  assert.equal(lost(r, 'pulse'), 60, 'Recon: Opening +10');
});

test('run skills: Tap maps everything, Brute Force Login opens a vault, Rotating Proxies cloaks twice', async () => {
  const { play, connect, currentLocation } = await import('./dist/run.mjs');
  const s = fresh();
  s.loadout.archetype = 'infiltrator';
  s.hackers = { infiltrator: { level: 50, xp: 0 } };
  s.loadout.equipped.infiltrator = ['spoof', 'tap'];
  s.loadout.picks.infiltrator = [0, 1, 0]; // Rotating Proxies, Leaked Creds
  command(s, 'developer location worm');
  Object.assign(s.locations[0], { template: 'relay', quirk: null });
  connect(s, s.locations[0].id);
  const tap = play(s, 'tap').find((e) => e.message?.startsWith('tap:')).message;
  assert.match(tap, /WATCHDOG/);
  assert.match(tap, /key in: access\.log/);
  assert.match(play(s, 'tap').at(-1).message, /used up/);
  play(s, 'spoof'); play(s, 'cd relay');
  assert.equal(s.encounter, null);
  play(s, 'cd ..');
  play(s, 'spoof');
  assert.equal(s.run.cloak, 'armed', 'second spoof with Rotating Proxies');
  play(s, 'cd relay');
  const sig = s.run.integrity;
  s.locations[0].state.cleared['/relay'] = true;
  play(s, 'brute vault');
  assert.equal(s.run.integrity, sig, 'Leaked Creds costs nothing');
  assert.ok(currentLocation(s).state.unlocked['/relay/vault']);
});
