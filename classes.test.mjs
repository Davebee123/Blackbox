// The four classes' first five skills: each does exactly one thing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part, keyMap, daemonSlots, timersHidden, intents, readyIn, momentumStacks } from './dist/combat.mjs';
import { CONFIG, SKILLS, ABILITIES } from './dist/data.mjs';
// These tests check exact numbers: no crits (gear.test.mjs covers them).
CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.partToughness = 1; // mechanics tests use the parts' base numbers
CONFIG.enemyRamp = 0;
CONFIG.salvageChance = 1;
CONFIG.misses = false; // and no misses
CONFIG.edges = false; // each class's edge (Overkill, Grudge, Weak Spot, Last Gasp) has its own test
CONFIG.powerPerLevel = 0; // flat numbers at every level (level tests turn it back on)
CONFIG.gap = { dealt: 0, taken: 0, floor: 1, below: 0 }; // and no level-gap scaling (combat.test.mjs tests it)

// A class at a level (default 9: bar full with its first five).
export const start = (cls, level = 22, id = 'cryptjack', seed = 7) => {
  const s = fresh();
  s.loadout.archetype = cls;
  s.hackers = { [cls]: { level, xp: 0 } };
  selectEncounter(s, id, seed, { level: 6 }); // a mid-level enemy: the numbers these tests check
  command(s, 'engage');
  return s;
};
export const act = (s, text) => {
  const events = command(s, text);
  assert.ok(!events.some((e) => e.type === 'warning'), events.at(-1)?.message);
  return resolveCycle(s);
};
export const quiet = (s) => { for (const p of s.encounter.virus.parts) p.attack = null; return s; };
// Strip every armor chit (and stop patching) so hits land in full; drop your own chits too.
export const noArmor = (s) => { for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, maxArmor: 0, patchAt: null }); s.encounter.hardened = 0; return s; };
export const big = (s, id) => Object.assign(part(s, id), { integrity: 500, max: 500 });
export const lost = (s, id) => part(s, id).max - part(s, id).integrity;

test('every skill does one kind of thing', () => {
  const verbs = new Set(['hit', 'burn', 'stun', 'debuff', 'shield', 'heal', 'buff', 'util']);
  for (const [id, a] of Object.entries(ABILITIES)) assert.ok(verbs.has(a.verb), id);
});

test('keys: 1 Spike, 2–8 equipped skills; other classes\' skills are refused', () => {
  const s = start('bastion');
  assert.deepEqual(Object.values(keyMap(s)), ['spike', 'rate-limit', 'firewall', 'suspend', 'retaliate', 'patch', 'purge', 'throttle']);
  assert.match(command(s, 'overload pulse').at(-1).message, /isn't on your bar/);
  assert.equal(command(s, '4 pulse').at(-1).type, 'queued');
});

// ---------- Breaker ----------
test('Breaker: Overload hits 40 and a crit resets it; Exploit: +25% crit chance on the part for a cycle; Momentum +10% per break', () => {
  const s = noArmor(quiet(start('breaker')));
  big(s, 'pulse');
  act(s, 'overload pulse');
  assert.equal(lost(s, 'pulse'), 40);
  assert.ok(readyIn(s, 'overload') > 0);
  CONFIG.baseCrit = 75;
  const c = noArmor(quiet(start('breaker')));
  big(c, 'pulse');
  act(c, 'exploit pulse');
  assert.equal(lost(c, 'pulse'), 0, 'Exploit itself does no damage');
  act(c, 'overload pulse');
  CONFIG.baseCrit = 0;
  assert.equal(lost(c, 'pulse'), 60, '75% + Exposed 25%: a sure crit, ×1.5');
  assert.equal(readyIn(c, 'overload'), 0, 'the crit reset Overload');
  // Momentum: +10% a stack, for 2 cycles after the last break, at most 3 stacks.
  s.encounter.momentum = { stacks: 5, until: s.encounter.cycle + 2 };
  assert.equal(momentumStacks(s), 5, 'raw state');
  s.encounter.momentum = { stacks: 2, until: s.encounter.cycle };
  const before = lost(s, 'pulse');
  act(s, 'spike pulse');
  assert.equal(lost(s, 'pulse') - before, Math.floor(25 * 1.2), 'two stacks: +20%');
  assert.equal(momentumStacks(s), 0, 'gone once its cycles run out');
});

test('Breaker Momentum: a stack per break, capped at 3, lasts 2 cycles from the last break', () => {
  const s = noArmor(quiet(start('breaker')));
  const e = s.encounter;
  const brk = (p) => { p.integrity = 1; act(s, 'spike ' + p.id); };
  e.virus.parts.push({ ...e.virus.parts[0], id: 'x1', name: 'X1', integrity: 99, max: 99 }, { ...e.virus.parts[0], id: 'x2', name: 'X2', integrity: 99, max: 99 }, { ...e.virus.parts[0], id: 'x3', name: 'X3', integrity: 99, max: 99 });
  for (const id of ['x1', 'x2', 'x3', 'pulse']) brk(e.virus.parts.find((p) => p.id === id));
  assert.equal(e.momentum.stacks, SKILLS.momentumMax, 'four breaks, three stacks');
  assert.equal(e.momentum.until, e.cycle - 1 + SKILLS.momentumCycles, 'refreshed by the last break');
});

test('Breaker: Crack strips 3 chits; breaking the last one lights Shatter (62) for 2 cycles; Segfault triples under 30%', () => {
  const s = quiet(start('breaker'));
  const enc = Object.assign(part(s, 'encryptor'), { armor: 4, maxArmor: 4, integrity: 500, max: 500 });
  assert.match(command(s, 'shatter encryptor').at(-1).message, /isn't lit/);
  act(s, 'crack encryptor');
  assert.equal(enc.armor, 1);
  act(s, 'spike encryptor');
  assert.equal(enc.armor, 0, 'the last chit');
  assert.equal(command(s, 'shatter encryptor').at(-1).type, 'queued', 'Shatter is lit');
  resolveCycle(s);
  assert.equal(enc.max - enc.integrity, 62);
  assert.match(command(s, 'shatter encryptor').at(-1).message, /isn't lit/, 'one use per window');
  const x = noArmor(quiet(start('breaker')));
  const p = Object.assign(part(x, 'pulse'), { integrity: 100, max: 100 });
  act(x, 'segfault pulse');
  assert.equal(p.integrity, 70);
  p.integrity = 25;
  x.encounter.readyAt = {};
  act(x, 'segfault pulse');
  assert.equal(p.integrity, 0, '90 on a part under 30%');
});

// ---------- Bastion ----------
test('Bastion: Hardened halves the first hit; Rate Limit hits 45 (+15 if its attack is due), cooldown 3, and halves its next attack; Patch heals 10 then 5 a cycle', () => {
  const s = start('bastion');
  assert.equal(s.encounter.hardened, 1);
  part(s, 'encryptor').attack = null;
  const surge = part(s, 'pulse').attack.amount;
  s.encounter.cycle = part(s, 'pulse').attack.due;
  act(s, 'hold');
  assert.equal(100 - s.server.integrity, Math.round(surge / 2), 'Hardened: the first Surge lands at half');
  assert.equal(s.encounter.hardened, 0);
  const t = noArmor(quiet(start('bastion')));
  big(t, 'pulse');
  act(t, 'rate-limit pulse');
  assert.equal(lost(t, 'pulse'), 45);
  assert.equal(t.encounter.readyAt['rate-limit'] - t.encounter.cycle, 2, 'cooldown 3: ready again in 3 cycles');
  // Its next attack, whenever it lands, deals half.
  const d = noArmor(start('bastion'));
  big(d, 'pulse');
  part(d, 'encryptor').attack = null;
  d.encounter.hardened = 0;
  const p = part(d, 'pulse');
  p.attack.due = d.encounter.cycle + 2;
  act(d, 'rate-limit pulse');
  assert.equal(p.throttledUntil, p.attack.due, 'Throttled through its next attack');
  const before = d.server.integrity;
  act(d, 'hold'); act(d, 'hold');
  const took = before - d.server.integrity, full = p.attack.amount;
  assert.ok(took > 0 && took < full, `half its Surge (${took} of ${full})`);
  t.server.integrity = 50;
  act(t, 'patch');
  assert.equal(t.server.integrity, 60);
  act(t, 'hold');
  assert.equal(t.server.integrity, 65, 'then 5 a cycle');
});

test('Bastion: Firewall absorbs 25 and lights Retaliate (twice the hit, next cycle); Throttle halves attacks', () => {
  const s = noArmor(start('bastion'));
  s.encounter.hardened = 0;
  part(s, 'encryptor').attack = null;
  const pulse = big(s, 'pulse');
  const amount = pulse.attack.amount;
  s.encounter.cycle = pulse.attack.due;
  assert.match(command(s, 'retaliate pulse').at(-1).message, /isn't lit/);
  act(s, 'firewall');
  assert.equal(s.server.integrity, 100, 'the shield took the hit');
  act(s, 'retaliate pulse');
  assert.equal(lost(s, 'pulse'), 2 * amount);
  const t = start('bastion');
  t.encounter.hardened = 0;
  const p2 = part(t, 'pulse');
  t.encounter.cycle = p2.attack.due;
  act(t, 'throttle pulse');
  assert.equal(100 - t.server.integrity, Math.round(p2.attack.amount * 0.5) || 100 - t.server.integrity);
});

// ---------- Infiltrator ----------
test('Infiltrator: Inject stacks up to 3; Tag makes burns tick +50% and shows a veiled timer; Backdoor +6 per burn, through armor; Detonate', () => {
  const s = noArmor(quiet(start('infiltrator')));
  big(s, 'pulse');
  act(s, 'inject pulse');
  assert.equal(lost(s, 'pulse'), 12);
  act(s, 'inject pulse');
  assert.equal(lost(s, 'pulse'), 12 + 24, 'two stacks tick');
  s.encounter.burns = [1, 2, 3].map((n) => ({ id: 'inject', target: 'pulse', damage: 1, grow: 0, left: 5, name: 'Inject', drain: 0, n }));
  s.encounter.readyAt = {};
  act(s, 'inject pulse');
  assert.equal(s.encounter.burns.filter((b) => b.target === 'pulse').length, 3, 'a fourth replaces the oldest');
  assert.ok(!s.encounter.burns.some((b) => b.n === 1));
  const t = noArmor(quiet(start('infiltrator')));
  big(t, 'pulse');
  act(t, 'tag pulse');
  act(t, 'inject pulse');
  assert.equal(lost(t, 'pulse'), 18, '12 × 1.5');
  const b = quiet(start('infiltrator'));
  big(b, 'pulse');
  b.encounter.burns.push({ id: 'inject', target: 'pulse', damage: 0, grow: 0, left: 5, name: 'Inject', drain: 0 });
  act(b, 'backdoor pulse');
  assert.equal(lost(b, 'pulse'), 30, '24 + 6 for one burn');
  const d = noArmor(quiet(start('infiltrator')));
  big(d, 'pulse');
  act(d, 'inject pulse');
  const before = lost(d, 'pulse');
  act(d, 'detonate pulse');
  assert.equal(lost(d, 'pulse') - before, Math.round(2 * 12 * 1.5), 'the two ticks left, now, ×1.5');
  assert.equal(d.encounter.burns.length, 0);
  const g = start('infiltrator', 18, 'ghostroot');
  assert.equal(timersHidden(g, part(g, 'pulse')), true);
  act(g, 'tag pulse');
  assert.equal(timersHidden(g, part(g, 'pulse')), false);
  assert.ok(intents(g).some((i) => i.source === 'pulse' && !i.hidden));
});

test('burns and helpers break a chit per tick: small hits are how you strip armor', () => {
  const s = quiet(start('operator'));
  const enc = Object.assign(part(s, 'encryptor'), { armor: 2, maxArmor: 2 });
  act(s, 'botnet encryptor');
  assert.equal(enc.armor, 0, 'three helpers, two chits: the third hit lands');
  assert.equal(lost(s, 'encryptor'), 4);
});

// ---------- Operator ----------
test('Operator: +1 daemon slot; Deploy helper; Hook adds 6 to every hit, helpers included; Kill Switch cashes in', () => {
  const s = noArmor(quiet(start('operator')));
  assert.equal(daemonSlots(s), CONFIG.daemonSlots + 1);
  big(s, 'pulse');
  act(s, 'hook pulse');
  act(s, 'deploy pulse');
  assert.equal(lost(s, 'pulse'), 12 + 6);
  act(s, 'spike pulse');
  assert.equal(lost(s, 'pulse'), 18 + 25 + 6 + 12 + 6);
  const before = lost(s, 'pulse');
  act(s, 'kill-switch');
  assert.equal(lost(s, 'pulse') - before, 24 + 6, 'two helper hits left, cashed in at once (+Hook)');
  assert.equal(s.encounter.helpers.length, 0);
});

test('Operator: Jam spends a helper to delay the part\'s attack a cycle', () => {
  const s = noArmor(start('operator'));
  big(s, 'pulse');
  assert.match(command(s, 'jam pulse').at(-1).message, /no helper/);
  act(s, 'deploy pulse');
  const due = part(s, 'pulse').attack.due;
  act(s, 'jam pulse');
  assert.equal(part(s, 'pulse').attack.due, due + 1);
  assert.equal(s.encounter.helpers.length, 0);
});

test('Operator: Botnet sends three small helpers; Garbage Collect hits every part', () => {
  const s = noArmor(quiet(start('operator')));
  big(s, 'pulse');
  act(s, 'botnet pulse');
  assert.equal(lost(s, 'pulse'), 12);
  assert.equal(readyIn(s, 'botnet'), ABILITIES.botnet.cooldown - 1);
  const g = quiet(start('operator', 30, 'splinter'));
  g.loadout.equipped.operator = ['botnet', 'garbage-collect'];
  act(g, 'garbage-collect');
  assert.ok(g.encounter.virus.parts.every((p) => p.armor === p.maxArmor - 1), 'a chit off every armored part');
  const h = noArmor(quiet(start('operator', 30, 'splinter')));
  h.loadout.equipped.operator = ['botnet', 'garbage-collect'];
  const hp = h.encounter.virus.parts.map((p) => p.integrity);
  act(h, 'garbage-collect');
  assert.ok(h.encounter.virus.parts.every((p, i) => p.integrity === hp[i] - 10));
});

// ---------- runs ----------
test('Spoof slips past one guard for one file; Light footprint makes return trips free', async () => {
  const { play, connect } = await import('./dist/run.mjs');
  const s = fresh();
  s.loadout.archetype = 'infiltrator';
  s.hackers = { infiltrator: { level: 30, xp: 0 } };
  s.loadout.equipped.infiltrator = ['inject', 'spoof'];
  command(s, 'developer location worm');
  Object.assign(s.locations[0], { template: 'relay', quirk: null });
  connect(s, s.locations[0].id);
  play(s, 'spoof');
  play(s, 'cd relay');
  assert.equal(s.encounter, null, 'no fight');
  play(s, 'pull cache.dat');
  assert.equal(s.run.pack.length, 1);
  assert.match(play(s, 'cd vault').at(-1).message, /guarded/);
  const sig = s.run.integrity;
  play(s, 'cd ..');
  assert.equal(s.run.integrity, sig, 'going back is free');
  play(s, 'cd relay');
  assert.equal(s.encounter.virus.name, 'WATCHDOG', 'the spoof is spent; the guard is still there');
});

test('the level-5 kit skills: Flood, Suspend, Keepalive, Spawn', () => {
  const b = noArmor(quiet(start('breaker')));
  big(b, 'pulse');
  act(b, 'flood pulse');
  assert.equal(lost(b, 'pulse'), 76, 'Flood: 76 on a bare part');
  const a = start('bastion');
  const due = part(a, 'pulse').attack.due;
  act(a, 'suspend pulse');
  assert.equal(part(a, 'pulse').attack.due, due + 2);
  assert.match(command(a, 'suspend').at(-1).message, /ready in/);
  const i = start('infiltrator');
  const ip = i.encounter.virus.parts.find((p) => p.integrity > 0);
  act(i, 'inject ' + ip.id);
  const left = i.encounter.burns.find((b) => b.target === ip.id).left;
  act(i, 'keepalive ' + ip.id);
  assert.equal(i.encounter.burns.find((b) => b.target === ip.id).left, left + 1, 'Keepalive: +2 cycles (one ticks off as the cycle passes)');
  const o = noArmor(quiet(start('operator')));
  big(o, 'pulse');
  act(o, 'spawn pulse');
  assert.equal(o.encounter.helpers.length, 1);
});

test('each class has an edge from level 10: Overkill, Grudge, Weak Spot, Last Gasp', () => {
  CONFIG.edges = true;
  try { edges(); } finally { CONFIG.edges = false; }
});
function edges() {
  // Breaker, Overkill: what's left over when a hit breaks a part spills onto the next one.
  const b = noArmor(quiet(start('breaker')));
  part(b, 'pulse').integrity = 1;
  const other = b.encounter.virus.parts.find((p) => p.id !== 'pulse'), was = other.integrity;
  act(b, 'spike pulse');
  assert.ok(other.integrity < was && was - other.integrity <= 20, 'it spilled, up to 20');
  // Infiltrator, Weak Spot: the first hit on each part crits; the second doesn't have to.
  const i = noArmor(quiet(start('infiltrator')));
  big(i, 'pulse');
  const ev = act(i, 'spike pulse');
  assert.ok(ev.some((e) => e.type === 'damage' && e.target === 'pulse' && e.crit), 'its first hit on the part crits');
  // Bastion, Grudge: the part that last hit you takes +20% from your hits.
  const a = noArmor(start('bastion'));
  for (const p of a.encounter.virus.parts) p.attack = null;
  a.encounter.grudge = 'pulse';
  const hp = part(a, 'pulse').integrity;
  act(a, 'spike pulse');
  const g = hp - part(a, 'pulse').integrity;
  const c = noArmor(quiet(start('bastion')));
  const hp2 = part(c, 'pulse').integrity;
  act(c, 'spike pulse');
  assert.equal(g, Math.floor((hp2 - part(c, 'pulse').integrity) * 1.2), '+20%');
  // Operator, Last Gasp: a helper hits once more as it expires.
  const o = noArmor(quiet(start('operator')));
  big(o, 'pulse');
  act(o, 'deploy pulse');
  for (let k = 0; k < 6; k++) act(o, 'hold');
  assert.ok(o.logs.some((e) => /^Last Gasp: /.test(e.message)));
  // Not before level 10.
  const young = noArmor(quiet(start('breaker', 6)));
  part(young, 'pulse').integrity = 1;
  const yo = young.encounter.virus.parts.find((p) => p.id !== 'pulse'), yw = yo.integrity;
  act(young, 'spike pulse');
  assert.equal(yo.integrity, yw, 'no edge yet');
}

test('the Sysadmin is the Bastion now: old saves carry its level, tree and bar across', async () => {
  const { restore } = await import('./dist/combat.mjs');
  const s = fresh();
  s.version = 22;
  s.loadout.archetype = 'sysadmin';
  s.hackers = { sysadmin: { level: 12, xp: 5 } };
  s.loadout.equipped = { sysadmin: ['kill-process', 'firewall'] };
  const r = restore(JSON.parse(JSON.stringify(s)));
  assert.equal(r.loadout.archetype, 'bastion');
  assert.deepEqual(r.hackers.bastion, { level: 12, xp: 5 });
  assert.deepEqual(r.loadout.equipped.bastion, ['rate-limit', 'firewall'], 'Kill Process is Rate Limit now');
  assert.equal(command(r, 'archetype sysadmin').at(-1).type, 'loadout', 'the old name still works');
});
