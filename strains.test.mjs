import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part, attackAmount, defender, intents as intentsOf } from './dist/combat.mjs';
import { STRAINS, strainsFor, createVirus, SERVER, variantFor, gradeFor } from './dist/data.mjs';

const veteran = (arch = 'breaker', level = 14) => {
  const s = fresh();
  s.hackers = { breaker: { level, xp: 0 }, bastion: { level, xp: 0 }, infiltrator: { level, xp: 0 }, operator: { level, xp: 0 } };
  if (arch !== 'breaker') command(s, 'archetype ' + arch);
  return s;
};
const start = (key, arch = 'breaker', level = 12) => {
  const s = veteran(arch);
  selectEncounter(s, key, 7, { level, mutation: null });
  command(s, 'engage');
  return s;
};
const fire = (s, text, synced = false) => { command(s, text); s.encounter.synced = synced; return resolveCycle(s); };
const bare = (s) => { for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, maxArmor: 0, patchAt: null }); return s; };

test('strains belong to a lineage and live deeper; SPRAWL-00 stays plain', () => {
  for (const [id, st] of Object.entries(STRAINS)) {
    const v = createVirus(id, 3);
    assert.equal(v.family, st.lineage);
    assert.equal(v.strain, id);
    assert.ok(v.parts.some((p) => p.special) && v.parts.length === 2, id);
    assert.match(v.name, new RegExp('^' + st.name.toUpperCase()));
  }
  assert.deepEqual(strainsFor('ghostroot', 3), []);
  assert.deepEqual(strainsFor('ghostroot', 12, 1), [], 'not on layer 1');
  assert.deepEqual(strainsFor('ghostroot', 12, 2).sort(), ['echo', 'flicker', 'keylogger', 'sleeper']);
  // SPRAWL-00 (random variants) never rolls a strain
  for (let seed = 1; seed <= 100; seed++) assert.equal(createVirus('random', seed, { family: 'worm', threat: SERVER.threat(30) }).strain, null);
  // layer 2: about half the time, once the level allows
  let strains = 0;
  for (let seed = 1; seed <= 200; seed++) if (variantFor('worm', 12, 2, seed).strain) strains++;
  assert.ok(strains > 70 && strains < 130, `strains: ${strains}/200`);
  assert.equal(variantFor('worm', 12, 1, 5).strain, null);
});

test('grades: deeper servers send the same virus with bigger numbers', () => {
  const [v1, v2, v3] = [1, 2, 3].map((grade) => createVirus('cryptjack', 9, { threat: SERVER.threat(10), mutation: null, grade }));
  const hp = (v) => v.parts.reduce((n, p) => n + p.max, 0);
  const hit = (v) => v.parts.find((p) => p.id === 'pulse').attack.amount;
  assert.ok(hp(v2) > hp(v1) && hp(v3) > hp(v2));
  assert.ok(hit(v2) > hit(v1) && hit(v3) > hit(v2));
  assert.equal(v3.parts.find((p) => !p.special).maxArmor, v1.parts.find((p) => !p.special).maxArmor, 'only the numbers grow');
  assert.equal(v1.name, 'CRYPTJACK');
  assert.equal(v2.name, 'CRYPTJACK v2');
  assert.deepEqual([1, 2, 3, 5].map(gradeFor), [1, 2, 3, 3]);
});

test('Keylogger: the Logger only feels synced commands, and three unsynced ones come back as a Dump', () => {
  const s = bare(start('keylogger'));
  const logger = part(s, 'logger');
  assert.ok(s.encounter.sync && s.encounter.sync.width === 0.14, 'a wide window opens every cycle');
  const hp = logger.integrity;
  fire(s, 'spike logger');
  assert.equal(logger.integrity, hp, 'out of sync: nothing');
  assert.equal(s.encounter.keylog, 1);
  fire(s, 'spike logger', true);
  assert.ok(logger.integrity < hp, 'in sync: it lands');
  assert.equal(s.encounter.keylog, 1, 'a synced command is not logged');
  fire(s, 'spike pulse');
  fire(s, 'spike pulse');
  assert.equal(logger.attack.due, s.encounter.cycle, 'the Dump comes next cycle');
  const before = s.server.integrity;
  fire(s, 'spike pulse', true);
  assert.ok(s.server.integrity < before, 'the Dump lands');
  assert.equal(s.encounter.keylog, 0, 'the log empties');
});

test('Hashrat: while the Miner lives, cooldowns run at half speed', () => {
  const s = start('hashrat');
  for (const p of s.encounter.virus.parts) p.attack = null;
  fire(s, 'overload pulse');
  const ready = s.encounter.readyAt.overload;
  for (let i = 0; i < 4; i++) fire(s, 'hold');
  assert.ok(s.encounter.readyAt.overload > ready, 'the Miner pushed the cooldown back');
  const t = veteran(); selectEncounter(t, 'hashrat', 7, { level: 12, mutation: null }); command(t, 'engage');
  for (const p of t.encounter.virus.parts) p.attack = null;
  part(t, 'miner').integrity = 0;
  fire(t, 'overload pulse');
  const r2 = t.encounter.readyAt.overload;
  for (let i = 0; i < 4; i++) fire(t, 'hold');
  assert.equal(t.encounter.readyAt.overload, r2, 'Miner dead: normal cooldowns');
});

test('Floodgate: the Flooder hits every cycle, harder each time; a delay resets it', () => {
  const s = start('floodgate', 'bastion');
  part(s, 'pulse').attack = null;
  const flood = part(s, 'flooder').attack;
  for (let i = 0; i < 4; i++) fire(s, 'hold');
  assert.ok(flood.step >= 3, `it has fired every cycle since its first (${flood.step})`);
  fire(s, 'suspend flooder');
  assert.equal(flood.step, 0, 'a delay resets the ramp');
});

test('Leech: the bite heals the most hurt part and clears a burn on it', () => {
  const s = bare(start('leech', 'infiltrator'));
  const pulse = part(s, 'pulse'), tap = part(s, 'tap');
  pulse.attack = null;
  pulse.integrity = Math.round(pulse.max / 3);
  s.encounter.burns.push({ id: 'inject', target: 'pulse', damage: 1, grow: 0, left: 9, name: 'Inject', drain: 0 });
  tap.attack.due = s.encounter.cycle;
  const before = pulse.integrity;
  fire(s, 'hold');
  assert.ok(pulse.integrity > before - 1, 'healed back');
  assert.equal(s.encounter.burns.filter((b) => b.target === 'pulse').length, 0, 'the burn is gone');
});

test('Sleeper: nothing lands while it sleeps; a hit wakes it and the Alarm lands at once', () => {
  const s = start('sleeper');
  const before = s.server.integrity;
  for (let i = 0; i < 4; i++) fire(s, 'hold');
  assert.equal(s.server.integrity, before, 'dormant');
  assert.ok(s.encounter.virus.dormant);
  fire(s, 'spike pulse');
  assert.equal(s.encounter.virus.dormant, false, 'awake');
  assert.ok(s.server.integrity < before, 'the Alarm landed');
  const t = start('sleeper');
  for (let i = 0; i < 6; i++) fire(t, 'hold');
  assert.equal(t.encounter.virus.dormant, false, 'its timer wakes it too');
});

test('SPRAWL-00 is a starter area: its viruses never pass level 8', async () => {
  const { zoneSpawns } = await import('./dist/run.mjs');
  const s = veteran('breaker', 20);
  const spawns = Object.values(zoneSpawns(s));
  assert.ok(spawns.length > 0);
  for (const sp of spawns) assert.ok(sp.level <= 8, `level ${sp.level}`);
});

test('Patchwork: the Patcher heals the most damaged part; nothing of yours stops it', () => {
  const s = bare(start('patchwork', 'bastion'));
  const pulse = part(s, 'pulse'), patcher = part(s, 'patcher');
  pulse.attack = null;
  pulse.integrity = Math.round(pulse.max / 2);
  patcher.attack.due = s.encounter.cycle;
  s.encounter.chits = 3; // armor chits stop attacks on you, not a heal on its own side
  const before = pulse.integrity, hp = s.server.integrity;
  fire(s, 'hold');
  assert.equal(pulse.integrity, before + patcher.attack.amount, 'patched');
  assert.equal(s.server.integrity, hp, 'a heal never hurts you');
  assert.equal(s.encounter.chits, 3, 'and spends none of your armor');
});

test('Flicker: hits on the Shade pass through on odd cycles and land on even ones', () => {
  const s = bare(start('flicker'));
  for (const p of s.encounter.virus.parts) p.attack = null;
  const shade = part(s, 'shade'), hp = shade.integrity;
  if (s.encounter.cycle % 2 === 0) fire(s, 'hold');
  assert.equal(s.encounter.cycle % 2, 1);
  const mine = defender(s).integrity;
  fire(s, 'spike shade');
  assert.equal(shade.integrity, hp, 'out of phase: through it');
  assert.ok(defender(s).integrity < mine, 'and the static bounces back at you');
  fire(s, 'spike shade');
  assert.ok(shade.integrity < hp, 'in phase: it lands');
  assert.ok(part(s, 'pulse').integrity > 0);
});

test('Extortion: enough damage while the Demand winds up calls the Deadline off', () => {
  const s = bare(start('extortion'));
  part(s, 'pulse').attack = null;
  const demand = part(s, 'demand'), atk = demand.attack;
  atk.due = s.encounter.cycle + 1;
  atk.windup = 1; // any hit is enough here
  fire(s, 'spike demand');
  assert.ok(atk.due > s.encounter.cycle + 1, 'called off and started over');
  const t = bare(start('extortion'));
  part(t, 'pulse').attack = null;
  const d2 = part(t, 'demand');
  d2.attack.due = t.encounter.cycle;
  const before = t.server.integrity;
  fire(t, 'hold');
  assert.ok(before - t.server.integrity >= d2.attack.amount * 0.85, 'ignored, the Deadline lands'); // (a little under: it's two levels below you)
});

test('Echo: while the Echo lives, each hit repeats next cycle at half', () => {
  const s = start('echo');
  const pulse = part(s, 'pulse');
  pulse.attack.due = s.encounter.cycle; pulse.attack.interval = 99;
  let before = s.server.integrity;
  fire(s, 'hold');
  const first = before - s.server.integrity;
  assert.ok(first > 0);
  before = s.server.integrity;
  fire(s, 'hold');
  assert.equal(before - s.server.integrity, Math.max(1, Math.round(first / 2)), 'the echo lands');
  const t = start('echo');
  const p2 = part(t, 'pulse');
  p2.attack.due = t.encounter.cycle; p2.attack.interval = 99;
  fire(t, 'hold');
  part(t, 'echo').integrity = 0;
  before = t.server.integrity;
  fire(t, 'hold');
  assert.equal(t.server.integrity, before, 'no Echo, no echo');
});

test('Bricker: below half Integrity a part hits 30% harder', () => {
  const s = start('bricker');
  const locker = part(s, 'locker');
  const full = locker.attack.amount;
  const shown = () => s.encounter && intentsOf(s).find((i) => i.source === 'locker')?.amount;
  locker.integrity = Math.floor(locker.max / 2) - 1;
  assert.equal(attackAmount(locker), Math.round(full * 1.3));
  assert.equal(shown(), Math.round(full * 1.3), 'the timeline shows the enraged hit');
});

test('Overrun: its fragments bite one harder every cycle they live', () => {
  const s = start('overrun', 'bastion');
  s.encounter.hardened = 0; // Hardened would halve the first bite
  part(s, 'pulse').attack = null;
  const hive = part(s, 'hive');
  hive.attack.due = s.encounter.cycle;
  fire(s, 'hold');
  const frag = s.encounter.virus.parts.find((p) => p.kind === 'fragment');
  assert.ok(frag && frag.attack.ramp, 'a growing fragment');
  hive.attack = null;
  const bites = [];
  for (let i = 0; i < 3; i++) { const b = s.server.integrity; fire(s, 'hold'); bites.push(b - s.server.integrity); }
  assert.ok(Math.max(...bites.slice(1)) > bites[0], `bites grow: ${bites}`); // (one may miss)
});

test('ICE: a Bouncer re-arms its Gate; a Tracer hits harder the longer it lasts; ICE only from layer 2', async () => {
  const { layoutOf, iceOf } = await import('./dist/run.mjs');
  const { createLocation } = await import('./dist/data.mjs');
  const s = veteran();
  s.run = { loc: 'x', cwd: '/', integrity: 500, max: 500, pack: [], visited: ['/'] };
  selectEncounter(s, 'bouncer', 7, { level: 12, mode: 'run', room: '/x' });
  command(s, 'engage');
  const gate = part(s, 'pulse');
  gate.attack = null;
  gate.armor = 0;
  while (s.encounter.cycle % 4 !== 0) fire(s, 'hold');
  fire(s, 'hold');
  assert.equal(gate.armor, gate.maxArmor, 're-armed');
  const t = veteran();
  t.run = { loc: 'x', cwd: '/', integrity: 500, max: 500, pack: [], visited: ['/'] };
  selectEncounter(t, 'tracer', 7, { level: 12, mode: 'run', room: '/x' });
  command(t, 'engage');
  const tr = part(t, 'tracker'), at0 = attackAmount(tr);
  fire(t, 'hold'); fire(t, 'hold');
  assert.ok(attackAmount(tr) > at0, 'Trace-back grows');
  let iced = 0;
  for (let seed = 1; seed <= 100; seed++) {
    assert.equal(iceOf(createLocation('worm', seed, 1)), false, 'never on layer 1');
    const loc = { ...createLocation('worm', seed, 2), template: 'relay' };
    if (iceOf(loc)) { iced++; assert.equal(layoutOf(loc)['/relay'].guard, 'tracer'); }
  }
  assert.ok(iced > 30 && iced < 70, `iced: ${iced}`);
});
