// Bastion subclasses (dist/classes/bastion.mjs): the Warden's and the Sysop's skills, edges and talents,
// solo and in a crew. Each does what its card says.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part, readyIn, hasTalent, rank, defender, subOf, edge, knownSkills, active } from './dist/combat.mjs';
import { CONFIG, ABILITIES, SUBS, SUBCLASS, unlockLevel } from './dist/data.mjs';
import { play } from './dist/run.mjs';
import { matesOf } from './dist/crew.mjs';
import { planner } from './dist/planner.mjs';
CONFIG.tells = false; // these check skill numbers; tells.test.mjs checks the tells
// Exact numbers: no crits, no misses, flat numbers at every level, no level gap.
CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.misses = false;
CONFIG.powerPerLevel = 0;
CONFIG.partToughness = 1;
CONFIG.enemyRamp = 0;
CONFIG.gap = { dealt: 0, taken: 0, floor: 1, below: 0 };
(await import('./dist/data.mjs')).LOADOUT.specRanks = 0; // the kit talent's two free ranks (progression.mjs): off, for exact numbers

// A level-38 Bastion of a subclass with these skills on the bar and these talents (by id) and ranks.
function start(sub, bar = [], talents = [], ranks = {}, id = 'cryptjack') {
  const s = fresh();
  s.loadout.archetype = 'bastion';
  s.hackers = { bastion: { level: 38, xp: 0 } };
  s.loadout.sub = { bastion: sub };
  s.loadout.picks[sub] = SUBS[sub].talents.map((pair) => pair.findIndex((x) => talents.includes(x.id))).map((i) => (i < 0 ? undefined : i));
  s.loadout.ranks[sub] = ranks;
  s.loadout.equipped[sub] = [...new Set(['firewall', 'retaliate', ...bar])].slice(0, 7);
  selectEncounter(s, id, 7, { level: 6 });
  command(s, 'engage');
  s.encounter.hardened = 0; // the passive takes a quarter off the first hit: off, for exact numbers
  return s;
}
const act = (s, text) => {
  const ev = command(s, text);
  assert.ok(!ev.some((x) => x.type === 'warning'), ev.at(-1)?.message);
  return resolveCycle(s);
};
const quiet = (s) => { for (const p of s.encounter.virus.parts) p.attack = null; return s; };
const noArmor = (s) => { for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, maxArmor: 0, patchAt: null }); return s; };
const big = (s, id) => Object.assign(part(s, id), { integrity: 500, max: 500 });
const lost = (s, id) => part(s, id).max - part(s, id).integrity;
const hp = (s) => defender(s).integrity;
// Only the Pulse attacks, for `amount`, this cycle.
const surge = (s, amount = 20) => { part(s, 'encryptor').attack = null; Object.assign(part(s, 'pulse').attack, { amount, interval: 99, due: s.encounter.cycle }); };

// A run fight with a crew: you (a Bastion of `sub`, or a Breaker) and `crew` bots.
function crewFight(sub, crew, level = 38, bar = null) {
  const s = fresh();
  const cls = sub ? 'bastion' : 'breaker';
  s.hackers = { [cls]: { level, xp: 0 } };
  s.loadout.archetype = cls;
  if (sub) play(s, 'subclass ' + sub);
  if (bar) s.loadout.equipped[sub] = bar;
  play(s, 'crew sim ' + crew);
  play(s, 'connect sprawl'); play(s, 'cd var'); play(s, 'attack');
  assert.ok(active(s));
  for (const m of matesOf(s)) { Object.assign(m.encounter, { hardened: 0, readyAt: {}, soft: 1 }); m.gear = { rigs: {} }; } // no protocols: exact numbers
  Object.assign(s.encounter, { hardened: 0, soft: 1 });
  return s;
}
// Every attack waits (crewmates share the parts).
const hush = (s) => { for (const p of s.encounter.virus.parts) if (p.attack) p.attack.due = 999; };
// The Pulse alone hits for `amount` this cycle, in a crew fight.
const crewSurge = (s, amount) => { for (const p of s.encounter.virus.parts) if (p.attack) p.attack.due = 999; const p = s.encounter.virus.parts.find((x) => x.attack && x.integrity > 0); p.veiled = false; Object.assign(p.attack, { effect: 'damage', amount, interval: 99, due: s.encounter.cycle }); delete p.attack.hit; return p; };
// A crewmate's command for this cycle (bots plan their own; a test can set it).
const order = (m, text) => { m.encounter.plan = []; const ev = command(m, text); assert.ok(!ev.some((x) => x.type === 'warning'), ev.at(-1)?.message); };

// ---------- the data ----------
test('both lines are full: eight skills each, unlocking at 12 to 38, each with help, short and desc', () => {
  for (const sub of ['warden', 'sysop']) {
    const x = SUBS[sub];
    assert.equal(x.skills.length, 8, sub);
    x.skills.forEach((id, i) => assert.equal(unlockLevel('bastion', id, sub), SUBCLASS.unlocks[i], id));
    for (const id of x.skills) {
      const a = ABILITIES[id];
      assert.ok(a.help && a.short && a.name, id);
      assert.match(a.help, new RegExp(`^${id} `), `${id}: its help starts with the command`);
      if (a.sub) { assert.equal(a.sub, sub); assert.equal(a.cls, 'bastion'); assert.ok(a.desc, id); }
    }
  }
  assert.equal(SUBS.warden.edge.name, 'Grudge');
  assert.equal(SUBS.sysop.edge.name, 'Overprovision');
  // The trees are their own: no talent pick in both.
  const picks = (sub) => SUBS[sub].talents.flat().map((x) => x.id);
  assert.deepEqual(picks('warden').filter((id) => picks('sysop').includes(id)), []);
});

// ---------- Warden ----------
test('Bulkhead: this cycle and next, attacks on you deal half', () => {
  const s = start('warden', ['bulkhead']);
  surge(s, 20);
  act(s, 'bulkhead');
  assert.equal(hp(s), defender(s).max - 10);
  assert.equal(readyIn(s, 'bulkhead'), ABILITIES.bulkhead.cooldown - 1);
  surge(s, 20);
  act(s, 'hold');
  assert.equal(hp(s), defender(s).max - 20, 'still half the next cycle');
  surge(s, 20);
  act(s, 'hold');
  assert.equal(hp(s), defender(s).max - 40, 'then full again');
  assert.equal(s.encounter.buffs.sinkhole, undefined, 'alone, it draws nothing');
});

test('Blowback: hits for every attack that hit you since the last one, shields included, up to 70, then starts over', () => {
  const s = noArmor(start('warden', ['blowback']));
  big(s, 'pulse'); big(s, 'encryptor');
  assert.match(command(s, 'blowback pulse').at(-1).message, /Nothing has hit you/);
  surge(s, 20);
  act(s, 'firewall'); // the shield takes 16 of it
  assert.equal(hp(s), defender(s).max - 4);
  surge(s, 15);
  act(s, 'hold');
  assert.equal(s.encounter.ledger, 35, 'both attacks, at their full size');
  s.encounter.grudge = null; // Grudge has its own test
  act(s, 'blowback encryptor');
  assert.equal(lost(s, 'encryptor'), 35);
  assert.equal(s.encounter.ledger, 0);
  assert.equal(readyIn(s, 'blowback'), ABILITIES.blowback.cooldown - 1);
  s.encounter.ledger = 200;
  s.encounter.readyAt = {};
  act(s, 'blowback encryptor');
  assert.equal(lost(s, 'encryptor'), 35 + 70, 'capped at 70');
  // Deep Buffer: +10% a rank.
  const d = noArmor(start('warden', ['blowback'], [], { 'deep-buffer': 3 }));
  big(d, 'pulse');
  d.encounter.ledger = 40;
  act(d, 'blowback pulse');
  assert.equal(lost(d, 'pulse'), 52);
  // On armor it breaks two chits.
  const a = start('warden', ['blowback']);
  const p = part(a, 'pulse');
  p.armor = 3; p.maxArmor = 3;
  a.encounter.ledger = 40;
  act(a, 'blowback pulse');
  assert.equal(p.armor, 1);
});

test('DMZ: this cycle and next, attacks deal 30% less', () => {
  const s = start('warden', ['dmz']);
  surge(s, 20);
  act(s, 'dmz');
  assert.equal(hp(s), defender(s).max - 14);
  surge(s, 20);
  act(s, 'hold');
  assert.equal(hp(s), defender(s).max - 28);
});

test('Warden talents: Tarpit, Counterflow, Write Protect, Kernel Panic, Vendetta; Uptime is still the old one', () => {
  // Tarpit: Suspend also Throttles until its attack lands.
  const t = start('warden', ['suspend'], ['tarpit']);
  assert.ok(hasTalent(t, 'tarpit'));
  const p = part(t, 'pulse');
  act(t, 'suspend pulse');
  assert.equal(p.throttledUntil, p.attack.due);
  // Counterflow: Retaliate also sends back what Blowback has stored.
  const c = noArmor(start('warden', ['blowback'], ['counterflow']));
  big(c, 'pulse');
  surge(c, 20);
  act(c, 'hold');
  c.encounter.grudge = null;
  const stored = c.encounter.ledger;
  assert.equal(stored, 20);
  act(c, 'retaliate pulse');
  assert.equal(lost(c, 'pulse'), 40 + 20, 'twice the hit, plus the 20 stored');
  assert.equal(c.encounter.ledger, 0);
  // Write Protect: Harden gives two chits for 10% of your max Signal.
  const w = start('warden', ['harden'], ['write-protect']);
  const max = defender(w).max;
  act(w, 'harden');
  assert.equal(w.encounter.chits, 2);
  assert.equal(hp(w), max - Math.round(max * 0.1));
  w.encounter.readyAt = {};
  defender(w).integrity = Math.round(max * 0.1);
  assert.match(command(w, 'harden').at(-1).message, /needs 10%/);
  // Kernel Panic: under a third, +30%.
  const k = noArmor(quiet(start('warden', [], ['kernel-panic'])));
  big(k, 'pulse');
  defender(k).integrity = Math.floor(defender(k).max / 4);
  act(k, 'spike pulse');
  assert.equal(lost(k, 'pulse'), Math.floor(25 * 1.3));
  // Vendetta: Grudge +5% a rank (on top of Grudge's 20%).
  const v = noArmor(quiet(start('warden', [], [], { vendetta: 2 })));
  big(v, 'pulse');
  v.encounter.grudge = 'pulse';
  act(v, 'spike pulse');
  assert.equal(lost(v, 'pulse'), Math.floor(Math.floor(25 * 1.1) * 1.2));
  // Uptime holds at 1.
  const u = start('warden', [], ['uptime']);
  defender(u).integrity = 5;
  surge(u, 20);
  act(u, 'hold');
  assert.equal(hp(u), 1);
});

test('Grudge is the Warden\'s edge, Overprovision the Sysop\'s', () => {
  const w = start('warden'), y = start('sysop');
  assert.ok(edge(w, 'bastion') && !edge(y, 'bastion'));
  assert.equal(subOf(w), 'warden');
  const a = noArmor(quiet(start('warden')));
  big(a, 'pulse');
  a.encounter.grudge = 'pulse';
  act(a, 'spike pulse');
  assert.equal(lost(a, 'pulse'), 30, '+20% on the part that last hit you');
});

// ---------- Sysop ----------
test('Overprovision: healing past full becomes a shield, up to 20 (Reserve Pool +5 a rank, Overcommit twice)', () => {
  const s = quiet(start('sysop', ['multicast']));
  defender(s).integrity = defender(s).max - 4;
  act(s, 'multicast');
  assert.equal(hp(s), defender(s).max);
  assert.equal(s.encounter.shield, 12, '16 healed, 4 of it needed: 12 shield');
  for (let i = 0; i < 4; i++) { s.encounter.readyAt = {}; act(s, 'multicast'); }
  assert.equal(s.encounter.shield, 20, 'capped at 20');
  const r = quiet(start('sysop', ['multicast'], ['overcommit'], { 'reserve-pool': 2 }));
  for (let i = 0; i < 6; i++) { r.encounter.readyAt = {}; act(r, 'multicast'); }
  assert.equal(r.encounter.shield, 60, '(20 + 10) × 2');
  // Patch spills too, up front and as it ticks.
  const p = quiet(start('sysop', ['patch']));
  defender(p).integrity = defender(p).max - 2;
  act(p, 'patch');
  assert.equal(p.encounter.shield, 2, 'Patch: 4 up front, 2 of it past full');
  act(p, 'hold');
  assert.equal(p.encounter.shield, 2 + 2, 'and its ticks spill too');
  // No edge, no shield: a Warden's heal stops at full.
  const w = quiet(start('warden'));
  w.encounter.readyAt = {};
  assert.equal(w.encounter.shield || 0, 0);
});

test('Multicast heals everyone; Fan-out +3 a rank; Ping Flood also hits every part', () => {
  const s = noArmor(quiet(start('sysop', ['multicast'], ['ping-flood'], { 'fan-out': 2 })));
  big(s, 'pulse'); big(s, 'encryptor');
  defender(s).integrity = 50;
  act(s, 'multicast');
  assert.equal(hp(s), 72, '16 + 2 × 3');
  assert.equal(lost(s, 'pulse'), 22);
  assert.equal(lost(s, 'encryptor'), 22);
  assert.equal(readyIn(s, 'multicast'), ABILITIES.multicast.cooldown - 1);
});

test('Heartbeat: 4 a cycle for 4 cycles from now, a new one replaces the old; Tick Rate +1 a rank', () => {
  const s = quiet(start('sysop', ['heartbeat'], [], { 'tick-rate': 2 }));
  defender(s).integrity = 40;
  act(s, 'heartbeat');
  assert.equal(hp(s), 46, '4 + 2 for Tick Rate');
  act(s, 'hold'); act(s, 'hold'); act(s, 'hold'); act(s, 'hold');
  assert.equal(hp(s), 40 + 4 * 6, 'four ticks, then it stops');
  s.encounter.readyAt = {};
  act(s, 'heartbeat');
  s.encounter.readyAt = {};
  act(s, 'heartbeat');
  assert.equal(s.encounter.hots.filter((h) => h.id === 'heartbeat').length, 1, 'one at a time');
});

test('Scrub clears encryption, Scrambled and Corrupted, and heals 8, or 12 when it cleared something', () => {
  const s = quiet(start('sysop', ['scrub']));
  defender(s).integrity = 50;
  s.encounter.encrypt = 6;
  s.encounter.scrambleUntil = s.encounter.cycle + 3;
  act(s, 'scrub');
  assert.equal(s.encounter.encrypt, 0);
  assert.ok(!(s.encounter.scrambleUntil >= s.encounter.cycle));
  assert.equal(hp(s), 62, 'something to clean: half again');
  const c = quiet(start('sysop', ['scrub']));
  defender(c).integrity = 50;
  act(c, 'scrub');
  assert.equal(hp(c), 58, 'nothing to clean: 8');
  const k = quiet(start('sysop', ['scrub']));
  k.encounter.corrupt = { name: 'Full Disk', amount: 9, left: 3, source: 'encryptor' };
  act(k, 'scrub');
  assert.equal(k.encounter.corrupt, null, 'Corrupted is cleaned too');
});

test('Rollback undoes the last attack: heals what it did, or deletes the fragment it spawned', () => {
  const s = start('sysop', ['rollback']);
  assert.match(command(s, 'rollback').at(-1).message, /Nothing to roll back/);
  surge(s, 20);
  act(s, 'hold');
  assert.equal(hp(s), defender(s).max - 20);
  act(s, 'rollback');
  assert.equal(hp(s), defender(s).max);
  assert.equal(readyIn(s, 'rollback'), ABILITIES.rollback.cooldown - 1);
  const w = start('sysop', ['rollback'], [], {}, 'splinter'); // a worm: its Replicator spawns fragments
  const rep = w.encounter.virus.parts.find((p) => p.attack?.effect === 'replicate');
  for (const p of w.encounter.virus.parts) if (p.attack && p !== rep) p.attack.due = 999;
  rep.attack.due = w.encounter.cycle;
  act(w, 'hold');
  const frag = w.encounter.virus.parts.find((p) => p.kind === 'fragment');
  assert.ok(frag && frag.integrity > 0);
  act(w, 'rollback');
  assert.equal(frag.integrity, 0, 'the fragment is gone');
});

test('Hot Standby: once a fight, the attack that would drop you to 0 leaves you at 1', () => {
  const s = start('sysop', ['hot-standby']);
  act(s, 'hot-standby');
  assert.match(command(s, 'hot-standby').at(-1).message, /used up|already/);
  defender(s).integrity = 5;
  surge(s, 30);
  act(s, 'hold');
  assert.equal(hp(s), 1);
  assert.ok(active(s), 'still in the fight');
  assert.equal(s.encounter.standby, false, 'spent');
});

test('Rebalance: alone it heals 6', () => {
  const s = quiet(start('sysop', ['rebalance']));
  defender(s).integrity = 50;
  act(s, 'rebalance');
  assert.equal(hp(s), 56);
});

test('Sysop talents: Service Pack, Critical Path, Redistribute, Loopback', () => {
  const sp = quiet(start('sysop', ['patch'], ['service-pack']));
  defender(sp).integrity = 50;
  act(sp, 'patch');
  assert.equal(hp(sp), 50 + 10, 'Service Pack: 10 up front');
  // Critical Path: +50% on someone under a third.
  const cp = quiet(start('sysop', ['scrub'], ['critical-path']));
  defender(cp).integrity = 10;
  act(cp, 'scrub');
  assert.equal(hp(cp), 10 + 12);
  // Redistribute: alone, Reclaim heals you twice as much.
  const rd = noArmor(quiet(start('sysop', ['reclaim'], ['redistribute'])));
  big(rd, 'pulse');
  defender(rd).integrity = 20;
  act(rd, 'reclaim pulse');
  assert.equal(hp(rd), 20 + 18 + 18);
  // Loopback: a third of each heal comes back to you.
  const lb = quiet(start('sysop', ['scrub'], ['loopback']));
  defender(lb).integrity = 20;
  act(lb, 'scrub');
  assert.equal(hp(lb), 20 + 8 + 3);
});

// ---------- in a crew ----------
test('a Sysop heals crewmates by name: Heartbeat, Scrub, Rollback, Hot Standby; Multicast and Rebalance take the whole crew', () => {
  const s = crewFight('sysop', 'breaker operator', 38, ['heartbeat', 'multicast', 'rollback', 'scrub', 'hot-standby', 'rebalance', 'patch']);
  const [nyx, kilo] = matesOf(s);
  hush(s);
  nyx.run.integrity = 20;
  for (const m of [nyx, kilo]) order(m, 'hold');
  act(s, 'heartbeat nyx');
  assert.ok(nyx.run.integrity >= 24, 'its first tick lands on nyx at the end of nyx\'s turn');
  assert.ok(s.logs.some((e) => e.who === 'nyx' && e.type === 'heal' && e.amount === 4 && /^Heartbeat from you/.test(e.message)));
  assert.match(command(s, 'heartbeat zed').find((e) => e.type === 'warning')?.message || '', /isn't in this fight/);
  // Multicast: everyone.
  s.encounter.readyAt = {};
  s.run.integrity -= 30; kilo.run.integrity -= 30;
  for (const m of [nyx, kilo]) order(m, 'hold');
  const ev = act(s, 'multicast');
  assert.ok(ev.some((e) => e.type === 'heal' && !e.who && e.amount === 16 && /^Multicast \+/.test(e.message)), 'you');
  assert.ok(ev.some((e) => e.type === 'heal' && e.who === 'kilo' && e.amount === 16 && /^Multicast from you/.test(e.message)), 'kilo');
  assert.ok(ev.some((e) => e.who === 'nyx' && /^Multicast from you/.test(e.message)), 'and nyx');
  // Rollback on nyx: the last attack on nyx comes back.
  nyx.run.integrity = nyx.run.max;
  crewSurge(s, 12);
  for (const m of [nyx, kilo]) order(m, 'hold');
  act(s, 'hold');
  const hurt = nyx.run.max - nyx.run.integrity;
  assert.ok(hurt > 0, 'the Pulse hit nyx too');
  hush(s);
  for (const m of [nyx, kilo]) order(m, 'hold');
  act(s, 'rollback nyx');
  assert.ok(nyx.run.integrity >= nyx.run.max - 6, 'healed back (a heartbeat tick may be on top)');
  // Scrub kilo's scramble.
  kilo.encounter.scrambleUntil = kilo.encounter.cycle + 5;
  for (const m of [nyx, kilo]) order(m, 'hold');
  act(s, 'scrub kilo');
  assert.ok(!(kilo.encounter.scrambleUntil >= kilo.encounter.cycle));
  // Hot Standby on kilo: a killing blow leaves kilo at 1.
  for (const m of [nyx, kilo]) order(m, 'hold');
  act(s, 'hot-standby kilo');
  kilo.run.integrity = 3;
  crewSurge(s, 40);
  s.encounter.shield = 999; s.encounter.chits = 0; nyx.encounter.shield = 999;
  for (const m of [nyx, kilo]) order(m, 'hold');
  act(s, 'hold');
  assert.equal(kilo.run.integrity, 1);
  assert.ok(!kilo.encounter.down);
  // Rebalance: everyone to the same share.
  hush(s);
  s.encounter.readyAt = {};
  s.run.integrity = s.run.max; nyx.run.integrity = Math.round(nyx.run.max * 0.2); kilo.run.integrity = kilo.run.max;
  for (const m of [nyx, kilo]) order(m, 'hold');
  command(s, 'rebalance');
  resolveCycle(s);
  const share = (m) => m.run.integrity / m.run.max;
  assert.ok(Math.abs(share(nyx) - share(kilo)) < 0.12 && share(nyx) > 0.6, `${share(nyx)} ${share(kilo)}`);
});

test('Overprovision lands on the crewmate: healing them past full shields them', () => {
  const s = crewFight('sysop', 'breaker');
  const [nyx] = matesOf(s);
  hush(s);
  nyx.run.integrity = nyx.run.max - 2;
  order(nyx, 'hold');
  act(s, 'patch nyx');
  assert.equal(nyx.encounter.shield, 2, '4 up front, 2 of it past full: a shield on nyx');
  order(nyx, 'hold');
  act(s, 'hold');
  assert.equal(nyx.encounter.shield, 2 + 2, 'and a tick of 2');
});

test('Sysop talents in a crew: Redistribute heals the lowest crewmate, Loopback heals you for a third of a heal on someone else', () => {
  const s = crewFight('sysop', 'breaker operator', 38, ['rate-limit', 'firewall', 'retaliate', 'reclaim', 'scrub']);
  s.loadout.picks.sysop = [undefined, 1, 1]; // Redistribute, Loopback
  assert.ok(hasTalent(s, 'redistribute') && hasTalent(s, 'loopback'));
  const [nyx, kilo] = matesOf(s);
  hush(s);
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, maxArmor: 0, patchAt: null, integrity: 500, max: 500 });
  kilo.run.integrity = 10; nyx.run.integrity = nyx.run.max - 5;
  s.run.integrity = 40;
  for (const m of [nyx, kilo]) order(m, 'hold');
  const t = s.encounter.virus.parts.find((p) => p.integrity > 0);
  const ev = act(s, 'reclaim ' + t.id);
  assert.ok(ev.some((e) => e.who === 'kilo' && e.type === 'heal' && /^Redistribute from you \+18/.test(e.message)), 'kilo, the lowest, gets as much as you');
  assert.ok(ev.some((e) => !e.who && e.type === 'heal' && /^Loopback \+6/.test(e.message)), 'and a third of it comes back to you');
  for (const m of [nyx, kilo]) order(m, 'hold');
  const ev2 = act(s, 'scrub nyx');
  assert.ok(ev2.some((e) => !e.who && /^Loopback \+3/.test(e.message)), 'Scrub on nyx: a third of 8 back to you');
});

test('a Warden draws fire with Bulkhead and takes it at half; DMZ covers the whole crew', () => {
  const s = crewFight('warden', 'breaker');
  const [nyx] = matesOf(s);
  const w = s.run.integrity, n = nyx.run.integrity;
  crewSurge(s, 20);
  order(nyx, 'hold');
  act(s, 'bulkhead');
  assert.equal(nyx.run.integrity, n, 'nobody else is hit');
  assert.equal(w - s.run.integrity, 10, 'the Warden takes it, at half');
  assert.equal(s.encounter.ledger, 20, 'and stores all of it for Blowback');
  // DMZ: the crewmate takes 30% less too, and the small stuff (under a tenth of your max) doesn't get in at all.
  const d = crewFight('warden', 'breaker', 38, ['rate-limit', 'firewall', 'retaliate', 'dmz']);
  const [kilo] = matesOf(d);
  const k = kilo.run.integrity;
  crewSurge(d, 60);
  order(kilo, 'hold');
  act(d, 'dmz');
  assert.equal(k - kilo.run.integrity, 42);
  const m = crewFight('warden', 'breaker', 38, ['rate-limit', 'firewall', 'retaliate', 'dmz']);
  const [lima] = matesOf(m);
  const l = lima.run.integrity;
  crewSurge(m, 10);
  order(lima, 'hold');
  act(m, 'dmz');
  assert.equal(l - lima.run.integrity, 0, 'a small hit does nothing');
});

test('bots: a Warden crewmate pulls the fire and sends it back; a Sysop crewmate heals whoever is low, with its own skills', () => {
  // A Warden bot: attacks about to land on everyone, so it draws them.
  const s = crewFight(null, 'warden');
  const [bot] = matesOf(s);
  crewSurge(s, 20);
  bot.encounter.readyAt = {};
  assert.match(planner(bot), /^(bulkhead|firewall)$/);
  bot.encounter.ledger = 60;
  bot.encounter.buffs.sinkhole = bot.encounter.cycle + 1;
  hush(s);
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, maxArmor: 0, integrity: 999, max: 999 }); // nothing to finish first
  assert.match(planner(bot), /^blowback /, 'and spends a full ledger');
  // A Sysop bot heals you when you're low, and Multicasts when two are hurt.
  const t = crewFight(null, 'sysop breaker');
  const [doc, mate] = matesOf(t);
  doc.encounter.readyAt = {};
  t.run.integrity = 5;
  assert.equal(planner(doc), 'hot-standby you', 'about to drop: standby first');
  doc.encounter.once['hot-standby'] = true;
  assert.equal(planner(doc), 'patch you');
  t.run.integrity = Math.round(t.run.max * 0.6); mate.run.integrity = Math.round(mate.run.max * 0.6);
  assert.equal(planner(doc), 'multicast');
  // A crew run: the bot Sysop's skills get used, and the crew wins.
  const r = crewFight(null, 'sysop warden', 30);
  for (let n = 0; n < 80 && active(r); n++) { command(r, planner(r) || 'hold'); resolveCycle(r); }
  assert.equal(r.reports.at(-1).result, 'victory');
});

test('a Sysop alone still works: its heals land on itself, and it wins', () => {
  const s = start('sysop', ['patch', 'multicast', 'heartbeat'], ['service-pack']);
  for (let n = 0; n < 80 && active(s); n++) { command(s, planner(s) || 'hold'); resolveCycle(s); }
  assert.equal(s.reports.at(-1).result, 'victory');
  assert.ok(knownSkills(s, 'bastion').includes('heartbeat'));
  assert.ok(rank(s, 'patch-notes') === 0);
});
