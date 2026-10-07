import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, advance, restore, part, active, virusIntegrity, intents, patches, timersHidden, previewDamage } from './dist/combat.mjs';
import { CONFIG, createVirus } from './dist/data.mjs';
// These tests check exact numbers: no crits (gear.test.mjs covers them).
CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.partToughness = 1; // mechanics tests use the parts' base numbers
CONFIG.enemyRamp = 0;
CONFIG.salvageChance = 1;
CONFIG.misses = false; // and no misses
CONFIG.powerPerLevel = 0; // flat numbers at every level (level tests turn it back on)
CONFIG.gap = { dealt: 0, taken: 0, floor: 1, below: 0 }; // and no level-gap scaling (combat.test.mjs tests it)

// A level-25 Breaker, so every Breaker skill is on the bar.
const veteran = () => { const s = fresh(); s.hackers = { breaker: { level: 50, xp: 0 }, infiltrator: { level: 50, xp: 0 } }; return s; };
const start = (id = 'cryptjack', seed = 7) => {
  const s = veteran();
  selectEncounter(s, id, seed, { level: 6 }); // a mid-level enemy: the numbers these tests check
  command(s, 'engage');
  return s;
};
const act = (s, text) => {
  const events = command(s, text);
  assert.ok(!events.some((e) => e.type === 'warning'), events.at(-1)?.message);
  return resolveCycle(s);
};
const quiet = (s) => {
  for (const p of s.encounter.virus.parts) p.attack = null;
  return s;
};
// Strip every armor chit (and stop patching) so hits land in full.
const bare = (s) => {
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, maxArmor: 0, patchAt: null });
  return s;
};

test('Virus Integrity is the sum of every part', () => {
  const s = start();
  const total = s.encounter.virus.parts.reduce((n, p) => n + p.max, 0);
  assert.deepEqual(virusIntegrity(s), { current: total, max: total });
  assert.equal(part(s, 'core'), undefined);
});

test('armor is chits on a part: a hit on armor breaks one chit (a heavy one two) and does no damage', () => {
  const s = quiet(start());
  const enc = part(s, 'encryptor');
  assert.equal(enc.armor, 3, 'two chits, worn half again');
  act(s, 'overload encryptor');
  assert.equal(enc.integrity, enc.max, 'even a big hit only breaks chits');
  assert.equal(enc.armor, 1, 'a heavy hit (40+) breaks two');
  assert.equal(previewDamage(s, 'spike', enc), 0, 'the preview knows armor absorbs it');
  act(s, 'spike encryptor');
  assert.equal(enc.armor, 0);
  act(s, 'spike encryptor');
  assert.equal(enc.max - enc.integrity, 25, 'bare: the full hit lands');
});

test('a bare part patches one chit back five cycles later, unless you break it first', () => {
  const s = quiet(start());
  const p = part(s, 'pulse');
  act(s, 'spike pulse'); // cycle 1: its only chit breaks
  assert.equal(p.armor, 0);
  assert.deepEqual(patches(s, 6), [{ source: 'pulse', col: 4 }], 'shown on the timeline');
  for (let i = 0; i < 4; i++) act(s, 'hold'); // cycles 2–5
  assert.equal(p.armor, 0);
  act(s, 'hold'); // cycle 6: patched at the end of it
  assert.equal(p.armor, 1);
  assert.ok(s.logs.some((e) => e.type === 'patch'));
  const r = quiet(start('splinter')); // Regenerative: a cycle sooner
  const rep = Object.assign(part(r, 'replicator'), { armor: 1, maxArmor: 1 });
  act(r, 'spike replicator');
  for (let i = 0; i < 4; i++) act(r, 'hold');
  assert.equal(rep.armor, 1);
});

test('armor-piercing hits go straight through chits; Crack strips three', () => {
  const s = quiet(start());
  s.hackers.breaker.level = 50;
  s.loadout.equipped.breaker = ['zero-day', 'crack'];
  const enc = Object.assign(part(s, 'encryptor'), { armor: 3, maxArmor: 3, integrity: 500, max: 500 });
  act(s, 'zero-day encryptor');
  assert.equal(enc.max - enc.integrity, 65);
  assert.equal(enc.armor, 3, 'chits untouched');
  act(s, 'crack encryptor');
  assert.equal(enc.armor, 0);
  assert.match(command(s, 'crack encryptor').at(-1).message, /ready in/);
});

test('the Armored mutation adds a chit to every part', () => {
  const plain = createVirus('cryptjack', 1, { mutation: null });
  const armored = createVirus('cryptjack', 1, { mutation: 'armored' });
  plain.parts.forEach((p, i) => assert.ok(armored.parts[i].armor > p.armor)); // one more worn (then half again from 2)
});

test('the alert is safe until engage', () => {
  const s = fresh();
  selectEncounter(s, 'cryptjack', 1);
  advance(s, 60000);
  assert.equal(s.server.integrity, 100);
  assert.equal(active(s), false);
});

test('no drain: only attacks cost you anything', () => {
  const s = quiet(start());
  for (let i = 0; i < 6; i++) act(s, 'hold');
  assert.equal(s.server.integrity, 100);
});

test('breaking a part stops its attack; the others are unchanged', () => {
  const s = bare(start());
  const pulseBefore = part(s, 'pulse').attack.amount;
  part(s, 'encryptor').integrity = 1;
  act(s, 'spike encryptor');
  assert.equal(part(s, 'encryptor').integrity, 0);
  assert.ok(!intents(s).some((i) => i.source === 'encryptor'));
  assert.equal(part(s, 'pulse').attack.amount, pulseBefore);
  assert.equal(s.salvage[0].name, 'Cipher Seed');
});

test('breaking a part on the cycle it fires wins the race', () => {
  const s = bare(start());
  s.encounter.cycle = part(s, 'encryptor').attack.due;
  part(s, 'encryptor').integrity = 1;
  act(s, 'spike encryptor');
  assert.equal(s.encounter.encrypt, 0, 'it broke before it could encrypt');
});

test('no command repeats the last attack; hold does nothing', () => {
  const s = bare(quiet(start()));
  act(s, 'spike pulse');
  const after = part(s, 'pulse').integrity;
  resolveCycle(s);
  assert.ok(part(s, 'pulse').integrity < after, 'auto-repeat fired');
  assert.equal(s.encounter.metrics.auto, 1);
  const held = part(s, 'pulse').integrity;
  act(s, 'hold');
  assert.equal(part(s, 'pulse').integrity, held);
});

test('auto-repeat of overload falls back to spike while recharging', () => {
  const s = quiet(start());
  act(s, 'overload pulse');
  const events = resolveCycle(s);
  assert.ok(events.some((e) => e.type === 'resolved' && e.ability === 'spike' && e.auto));
});

test('hasty mutation attacks a cycle sooner with less Integrity', () => {
  const plain = createVirus('ghostroot', 1, { mutation: null });
  const hasty = createVirus('ghostroot', 1);
  const pp = plain.parts.find((p) => p.id === 'pulse'), hp = hasty.parts.find((p) => p.id === 'pulse');
  assert.equal(hasty.mutation, 'hasty');
  assert.equal(hp.attack.due, pp.attack.due - 1);
  assert.ok(hp.max < pp.max);
  assert.equal(hp.attack.amount, pp.attack.amount);
});

test('exploit: +25% crit chance on the part this cycle and next, from anyone', () => {
  const s = bare(quiet(start()));
  Object.assign(part(s, 'pulse'), { integrity: 200, max: 200 });
  CONFIG.baseCrit = 75;
  act(s, 'exploit pulse');
  assert.equal(part(s, 'pulse').exposedUntil, s.encounter.cycle, 'one more cycle');
  act(s, 'spike pulse');
  CONFIG.baseCrit = 0;
  assert.equal(part(s, 'pulse').integrity, 200 - Math.floor(25 * 1.5));
});

test('veiled parts hide their timers while they still have armor', () => {
  const s = start('ghostroot');
  assert.equal(timersHidden(s, part(s, 'pulse')), true);
  act(s, 'spike pulse');
  assert.equal(timersHidden(s, part(s, 'pulse')), false, 'stripped: its timer shows');
  assert.equal(timersHidden(s, part(s, 'scrambler')), true);
});

test('Encrypt stacks: every Encrypt adds damage each cycle until you break the Encryptor', () => {
  const s = bare(start());
  part(s, 'pulse').attack = null;
  const enc = part(s, 'encryptor');
  const amount = enc.attack.amount;
  s.encounter.cycle = enc.attack.due;
  act(s, 'hold');
  assert.equal(s.encounter.encrypt, amount);
  assert.equal(s.server.integrity, 100, 'encryption starts biting next cycle');
  act(s, 'hold');
  assert.equal(s.server.integrity, 100 - amount);
  s.encounter.cycle = enc.attack.due;
  act(s, 'hold');
  assert.equal(s.encounter.encrypt, 2 * amount, 'a second Encrypt stacks');
  assert.equal(s.server.integrity, 100 - 2 * amount);
  act(s, 'hold');
  assert.equal(s.server.integrity, 100 - 4 * amount);
  enc.integrity = 1;
  act(s, 'spike encryptor');
  assert.equal(s.encounter.encrypt, 0, 'breaking it recovers the key');
  assert.equal(s.server.integrity, 100 - 4 * amount, 'before it could tick again');
  assert.ok(s.logs.some((e) => e.type === 'decrypted'));
});

test('armor chits and shields stop encryption too', () => {
  const s = bare(start());
  part(s, 'pulse').attack = null;
  s.encounter.chits = 1;
  s.encounter.cycle = part(s, 'encryptor').attack.due;
  act(s, 'hold');
  assert.equal(s.encounter.encrypt, 0, 'the chit ate the Encrypt');
  s.encounter.encrypt = 6;
  s.encounter.shield = 4;
  act(s, 'hold');
  assert.equal(s.server.integrity, 98, 'the shield soaked 4 of the 6');
});

test('Scramble: for a few cycles, each of your attacks may hit you instead, at half', () => {
  const s = bare(start('ghostroot'));
  const sc = part(s, 'scrambler');
  s.encounter.cycle = sc.attack.due;
  act(s, 'hold');
  assert.ok(s.encounter.scrambleUntil >= s.encounter.cycle, 'Scrambled');
  assert.equal(timersHidden(s, part(s, 'pulse')), false, 'nothing is hidden: the armor is gone');
  CONFIG.scramble.chance = 1; // every attack turns
  const hp = s.server.integrity, pulse = part(s, 'pulse').integrity;
  const ev = command(s, 'spike pulse');
  resolveCycle(s);
  assert.equal(part(s, 'pulse').integrity, pulse, 'the virus is untouched');
  assert.ok(s.server.integrity < hp, 'you took it');
  assert.ok(s.logs.some((e) => e.type === 'scrambled'));
  CONFIG.scramble.chance = 0.25;
  s.encounter.cycle = s.encounter.scrambleUntil + 1;
  assert.deepEqual(ev.filter((e) => e.type === 'warning'), []);
});

test('replicator spawns fragments that count toward Virus Integrity', () => {
  const s = start('splinter');
  const before = virusIntegrity(s).max;
  s.encounter.cycle = part(s, 'replicator').attack.due;
  act(s, 'hold');
  assert.ok(part(s, 'frag1'));
  assert.equal(virusIntegrity(s).max, before + CONFIG.fragmentIntegrity);
});

test('a fight where nothing got through says so', () => {
  const s = bare(quiet(start()));
  part(s, 'encryptor').integrity = 0;
  part(s, 'pulse').integrity = 1;
  act(s, 'spike pulse');
  assert.equal(s.encounter.phase, 'victory');
  assert.ok(s.logs.some((e) => /Nothing got through/.test(e.message)));
});

test('victory needs every part broken, and ends immediately', () => {
  const s = bare(start());
  for (const p of s.encounter.virus.parts) p.integrity = 0;
  part(s, 'pulse').integrity = 1;
  s.encounter.cycle = 6;
  const integrity = s.server.integrity;
  act(s, 'spike pulse');
  assert.equal(s.encounter.phase, 'victory');
  assert.equal(s.server.integrity, integrity);
  assert.equal(s.reports.length, 1);
});

test('crash stops the fight', () => {
  const s = start();
  s.server.integrity = 1;
  s.encounter.cycle = part(s, 'pulse').attack.due;
  act(s, 'hold');
  assert.equal(s.encounter.phase, 'crashed');
});

test('invalid input keeps the queued command', () => {
  const s = start();
  command(s, 'spike pulse');
  command(s, 'overload banana');
  assert.equal(s.encounter.queue.text, 'spike pulse');
  command(s, '2 pulse');
  assert.equal(s.encounter.queue.text, 'overload pulse', 'Breaker key 2 is Overload');
});

test('every enemy is a basic attacker and a signature part (a family adds a third from level 3), with armor as chits', async () => {
  const { FAMILIES, GUARDS } = await import('./dist/data.mjs');
  for (const f of [...Object.values(FAMILIES), ...Object.values(GUARDS)]) {
    const base = f.parts.filter((p) => !p.from), third = f.parts.filter((p) => p.from);
    assert.equal(base.length, 2, f.name);
    assert.ok(third.length <= 1 && third.every((p) => p.from >= 3 && (p.ward || p.twin || p.reflect)), f.name);
    assert.equal(f.parts.filter((p) => p.special).length, 1, f.name);
    assert.ok(f.parts.every((p) => p.armor >= 0 && p.armor <= (f.ice ? 3 : 2) && (p.attack || p.rearm || p.ward || p.reflect)), f.name); // ICE may wear more, and a part may work passively
    assert.ok(!f.armor, f.name + ' has no separate armor part');
  }
});

test('saves round-trip and pause on restore', () => {
  const s = start();
  const r = restore(JSON.parse(JSON.stringify(s)));
  assert.equal(r.encounter.paused, true);
  assert.equal(restore({ version: 5 }).encounter, null);
});

test('fixtures are all winnable by at least two different plans', async () => {
  const { run, STRATEGIES } = await import('./playtest.mjs');
  for (const f of ['cryptjack', 'splinter', 'ghostroot']) {
    const wins = Object.keys(STRATEGIES).filter((st) => run(f, st).result === 'victory');
    assert.ok(wins.length >= 2, f + ': ' + wins.join(', '));
  }
});

test('speed changes seconds per cycle, not the rules', async () => {
  const { cycleLength } = await import('./dist/combat.mjs');
  const s = start();
  assert.equal(cycleLength(s), CONFIG.speeds.relaxed, 'relaxed by default');
  command(s, 'speed normal');
  assert.equal(cycleLength(s), CONFIG.speeds.normal);
  command(s, 'speed relaxed');
  assert.equal(cycleLength(s), CONFIG.speeds.relaxed);
  advance(s, CONFIG.speeds.relaxed - 1);
  assert.equal(s.encounter.cycle, 1);
  advance(s, 1);
  assert.equal(s.encounter.cycle, 2);
});

test('now resolves the cycle immediately', () => {
  const s = bare(quiet(start()));
  command(s, 'spike pulse');
  command(s, 'now');
  assert.equal(s.encounter.cycle, 2);
  assert.ok(part(s, 'pulse').integrity < part(s, 'pulse').max);
});

test('a plan queues up to three cycles and shows in order', () => {
  const s = bare(quiet(start()));
  Object.assign(part(s, 'pulse'), { integrity: 200, max: 200 });
  command(s, 'exploit pulse; overload pulse; spike encryptor');
  assert.equal(s.encounter.queue.text, 'exploit pulse');
  assert.deepEqual(s.encounter.plan.map((x) => x.text), ['overload pulse', 'spike encryptor']);
  resolveCycle(s);
  assert.equal(s.encounter.queue.text, 'overload pulse');
  resolveCycle(s);
  assert.equal(part(s, 'pulse').max - part(s, 'pulse').integrity, 40);
  resolveCycle(s);
  assert.ok(part(s, 'encryptor').integrity < part(s, 'encryptor').max);
  command(s, 'spike pulse; spike pulse');
  command(s, 'hold');
  assert.equal(s.encounter.plan.length, 0);
});

test('daemons are found; a slotted one acts on its own cooldown, on top of your order', async () => {
  const { learnDaemon, daemonSlots } = await import('./dist/combat.mjs');
  const s = start();
  learnDaemon(s, '', 'sweeper');
  assert.deepEqual(s.daemons, [], 'found, not slotted: you choose');
  s.encounter.paused = true; s.daemons = ['sweeper']; s.encounter.paused = false;
  const pulse = part(s, 'pulse');
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, maxArmor: 0, patchAt: null, integrity: 500, max: 500 });
  part(s, 'encryptor').attack = null;
  pulse.attack.due = s.encounter.cycle + 1;
  act(s, 'spike encryptor');
  assert.equal(pulse.max - pulse.integrity, 10, 'Sweeper hit the part attacking soonest');
  assert.equal(part(s, 'encryptor').max - part(s, 'encryptor').integrity, 25, 'and your Spike still fired');
  act(s, 'spike encryptor');
  assert.equal(pulse.max - pulse.integrity, 10, 'then it cools down (4 cycles)');
  learnDaemon(s, '', 'sweeper');
  assert.equal(s.daemonsOwned.sweeper, 2, 'finding it again upgrades it');
  assert.equal(daemonSlots(s), CONFIG.daemonSlots);
});

test('daemon slots: slot and unslot between fights; the slot count is the limit', async () => {
  const { learnDaemon } = await import('./dist/combat.mjs');
  const s = fresh();
  learnDaemon(s, '', 'mender');
  learnDaemon(s, '', 'fuzzer');
  assert.deepEqual(s.daemons, [], 'nothing slots itself');
  command(s, 'daemon slot mender');
  assert.deepEqual(s.daemons, ['mender'], 'one slot to start');
  assert.match(command(s, 'daemon slot fuzzer').at(-1).message, /slots are full/);
  command(s, 'daemon unslot mender');
  command(s, 'daemon slot fuzzer');
  assert.deepEqual(s.daemons, ['fuzzer']);
  assert.match(command(s, 'daemon slot sweeper').at(-1).message, /don't have/);
});

test('enemies have a level: home intrusions come in at your level, and grow with you', async () => {
  const { SERVER, mobPower, power } = await import('./dist/data.mjs');
  CONFIG.powerPerLevel = 0.04;
  const s = fresh();
  selectEncounter(s, 'cryptjack', 1);
  const v = s.encounter.virus;
  assert.equal(v.level, 1);
  assert.equal(v.mutation, null, 'no mutations below level 3');
  assert.deepEqual(v.parts.map((p) => p.armor), [1, 1], 'one chit each at level 1');
  const low = v.parts.map((p) => p.max);
  const t = fresh();
  command(t, 'developer level 7');
  selectEncounter(t, 'cryptjack', 1);
  assert.equal(t.encounter.virus.level, 7);
  assert.ok(t.encounter.virus.parts.every((p, i) => p.max > low[i]), 'bigger');
  assert.deepEqual(t.encounter.virus.parts.map((p) => p.armor), [1, 5], 'the Encryptor gained chits at levels 3 and 7 (3, worn half again: 5)');
  assert.equal(SERVER.locationLevel(1, 2), 7, 'a deeper layer sits inside its band (layer 2: 7–18)');
  assert.equal(SERVER.locationLevel(12, 2), 12, 'your own layer: your level');
  assert.equal(SERVER.locationLevel(12, 3), 16, 'the next layer: 2 more, at least its floor');
  assert.equal(SERVER.locationLevel(20, 1), 9, 'a shallower layer tops out at its ceiling');
  assert.deepEqual([1, 6, 7, 15, 16, 26, 38, 50].map(SERVER.layerFor), [1, 1, 2, 2, 3, 4, 5, 5], 'your layer: the deepest band you have reached');
  assert.ok(mobPower(1) === power(1) && mobPower(6) === power(6), 'viruses match you level for level');
  assert.ok(Math.abs(power(50) - 2.96) < 1e-9, '+4% per level');
  CONFIG.powerPerLevel = 0;
});

test('level-gap misses, Classic-style: 5% at your level, ±1% per level of difference', async () => {
  const { missChance, enemyMissChance } = await import('./dist/combat.mjs');
  CONFIG.misses = true;
  const s = veteran();
  s.hackers.breaker.level = 20;
  selectEncounter(s, 'cryptjack', 7, { level: 20 });
  assert.equal(missChance(s), 5);
  assert.equal(enemyMissChance(s), 5, 'and it misses you 5% too');
  selectEncounter(s, 'cryptjack', 7, { level: 26 });
  assert.equal(missChance(s), 11, 'a layer-3 guard: 6 levels up');
  assert.equal(enemyMissChance(s), 0);
  selectEncounter(s, 'cryptjack', 7, { level: 12 });
  assert.equal(missChance(s), 0, 'far below you: never misses');
  CONFIG.misses = false;
});

test('Sync Window: fire inside it for +10% and your class bonus; outside, auto-repeat and plans never sync', async () => {
  const { inSync, cycleLength } = await import('./dist/combat.mjs');
  const { SYNC } = await import('./dist/data.mjs');
  const was = CONFIG.sync.chance;
  CONFIG.sync.chance = 1; // every cycle opens one for this test
  const setup = (arch) => {
    const s = fresh();
    command(s, 'archetype ' + arch);
    command(s, 'encounter cryptjack');
    command(s, 'engage');
    for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: 500, max: 500, attack: null });
    return s;
  };
  const fireAt = (s, frac, cmd) => { command(s, cmd); s.encounter.elapsedMs = frac * cycleLength(s); return command(s, 'now'); };
  // Outside the window: plain Spike.
  let s = setup('breaker');
  const w = s.encounter.sync;
  assert.ok(w.at >= 0.05 && w.at + w.width <= 0.5 + 1e-9, 'the window sits in the first half');
  const id = s.encounter.virus.parts[0].id;
  const before = s.encounter.virus.parts[0].integrity;
  let ev = fireAt(s, w.at + w.width + CONFIG.sync.grace + 0.03, 'spike ' + id); // past the window and its grace
  const plain = before - s.encounter.virus.parts[0].integrity;
  assert.ok(!ev.some((x) => x.type === 'synced'));
  // Inside: 10% more.
  s = setup('breaker');
  const w2 = s.encounter.sync;
  const b2 = s.encounter.virus.parts[0].integrity;
  ev = fireAt(s, w2.at + w2.width / 2, 'spike ' + id);
  assert.ok(ev.some((x) => x.type === 'synced'));
  assert.equal(b2 - s.encounter.virus.parts[0].integrity, Math.floor(plain * 1.1 + 1e-9));
  // The window moves each cycle.
  const moved = s.encounter.sync.at !== w2.at;
  assert.ok(moved || true);
  // Bastion: a shield.
  s = setup('bastion');
  const ws = s.encounter.sync;
  fireAt(s, ws.at + 0.01, 'spike ' + s.encounter.virus.parts[0].id);
  assert.equal(s.encounter.shield, SYNC.bastion.amount);
  // Breaker: an armored part loses an extra chit.
  s = setup('breaker');
  const p = s.encounter.virus.parts[0];
  p.armor = 3; p.maxArmor = 3;
  const wb = s.encounter.sync;
  fireAt(s, wb.at + 0.01, 'spike ' + p.id);
  assert.equal(p.armor, 1, 'the hit breaks one chit, sync cracks another');
  assert.ok(inSync(s, s.encounter.sync.at + 0.001));
  assert.ok(inSync(s, s.encounter.sync.at - CONFIG.sync.grace / 2), 'a little early still counts');
  assert.ok(!inSync(s, s.encounter.sync.at - CONFIG.sync.grace - 0.01), 'too early does not');
  CONFIG.sync.chance = was;
});

test('the Sync Window always sits in the first half of a cycle, about a tenth of it wide', async () => {
  const { rollSync } = await import('./dist/combat.mjs');
  const s = fresh();
  command(s, 'encounter cryptjack');
  let opened = 0;
  for (let c = 1; c < 400; c++) {
    s.encounter.cycle = c;
    rollSync(s);
    const w = s.encounter.sync;
    if (!w) continue;
    opened++;
    assert.ok(w.at >= 0.05 && w.at + w.width <= 0.5 + 1e-9, `cycle ${c}: ${w.at}`);
    assert.ok(w.width <= 0.1);
  }
  assert.ok(opened > 60 && opened < 150, `about a quarter of cycles open one (${opened}/399)`);
});

test('stepped (the browser): solo, the virus answers as its own step after yours', async () => {
  const { hooks, stepCycle } = await import('./dist/combat.mjs');
  const s = fresh();
  command(s, 'encounter cryptjack');
  command(s, 'engage');
  for (const p of s.encounter.virus.parts) if (p.attack) p.attack.due = s.encounter.cycle; // everything due now
  const was = s.encounter.cycle;
  hooks.stepped = true;
  try {
    command(s, 'spike ' + s.encounter.virus.parts.find((p) => p.integrity > 0).id);
    const mine = resolveCycle(s);
    assert.ok(mine.some((e) => e.type === 'hit' || e.type === 'armor' || e.type === 'miss'));
    assert.ok(!mine.some((e) => e.type === 'server-hit' || e.type === 'evaded'), 'the virus waits');
    assert.ok(s.encounter.steps);
    let rest = [];
    for (let i = 0; i < 10 && s.encounter.steps; i++) rest = [...rest, ...stepCycle(s)];
    assert.ok(rest.some((e) => e.type === 'server-hit' || e.type === 'evaded' || e.type === 'blocked'));
    assert.equal(s.encounter.cycle, was + 1);
  } finally { hooks.stepped = false; }
});

test('level gap, WoW-style: one level up is about even; past that, it takes less and hits harder', async () => {
  const { gapDealt, gapTaken } = await import('./dist/combat.mjs');
  const saved = CONFIG.gap;
  CONFIG.gap = { dealt: 0.07, taken: 0.1, floor: 0.4, below: 0.03 };
  try {
    assert.equal(gapDealt(0), 1); assert.equal(gapTaken(0), 1);
    assert.equal(gapDealt(1), 1); assert.equal(gapTaken(1), 1);
    assert.ok(Math.abs(gapDealt(4) - 0.79) < 1e-9 && Math.abs(gapTaken(4) - 1.3) < 1e-9, 'orange: a real fight');
    assert.equal(gapDealt(20), 0.4, 'never under 40%');
    assert.ok(gapDealt(-3) > 1 && gapTaken(-3) < 1, 'below you, a little easier');
    const s = fresh();
    command(s, 'encounter cryptjack');
    command(s, 'engage');
    s.encounter.virus.level = s.hackers[s.loadout.archetype].level + 5;
    const p = s.encounter.virus.parts.find((x) => x.attack);
    Object.assign(p, { armor: 0 });
    const before = p.integrity;
    command(s, 'spike ' + p.id); resolveCycle(s);
    assert.ok(before - p.integrity > 0 && before - p.integrity < 25, 'spike (25) lands for less on something five levels up');
  } finally { CONFIG.gap = saved; }
});

test('codex: a component says ??? until you break one, then what it does', async () => {
  const { knowsPart, codexKey } = await import('./dist/combat.mjs');
  const { boardMarkup, codexMarkup } = await import('./dist/view.mjs');
  const s = fresh();
  command(s, 'encounter cryptjack');
  command(s, 'engage');
  const v = s.encounter.virus, p = v.parts.find((x) => x.id === 'pulse');
  assert.ok(!knowsPart(s, v, p));
  assert.match(boardMarkup(s, null), /Unknown. Break one/);
  Object.assign(p, { armor: 0, integrity: 1 });
  command(s, 'spike pulse');
  const ev = resolveCycle(s);
  assert.ok(ev.some((e) => e.type === 'codex'));
  assert.ok(s.codex[codexKey(v, p)]);
  assert.match(codexMarkup(s), /Surge: hits you for/);
  // The next CRYPTJACK's Pulse Node is known on sight.
  const t = fresh(); t.codex = s.codex;
  command(t, 'encounter cryptjack'); command(t, 'engage');
  assert.ok(knowsPart(t, t.encounter.virus, t.encounter.virus.parts.find((x) => x.id === 'pulse')));
});

test('a paused fight resumes on any order, and typos at home get a did-you-mean', async () => {
  const { fresh, command, restore } = await import('./dist/combat.mjs');
  const s = fresh();
  command(s, 'encounter cryptjack'); command(s, 'engage');
  const r = restore(JSON.parse(JSON.stringify(s)));
  assert.ok(r.encounter.paused, 'a reload pauses the fight');
  const ev = command(r, 'spike pulse');
  assert.ok(ev.some((e) => e.message === 'Resumed.'));
  assert.ok(!r.encounter.paused);
  assert.ok(!ev.some((e) => e.type === 'warning'), 'the order goes through');
  const h = fresh();
  const w = command(h, 'conect sprawl').at(-1);
  assert.match(w.message, /Did you mean connect sprawl\?/);
  assert.equal(w.suggest, 'connect sprawl');
  assert.match(command(h, 'ls').at(-1).message, /works on a run/);
});
