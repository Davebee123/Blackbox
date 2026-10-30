import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part, attackAmount, defender, intents as intentsOf } from './dist/combat.mjs';
import { STRAINS, strainsFor, createVirus, SERVER, variantFor, gradeFor, defaultSub, spreadOf, spreadFrom } from './dist/data.mjs';
import { MECH_GENES, compatible } from './dist/genes.mjs';
import { PARTS } from './dist/parts.mjs';
import { mechLanded, mechFired, youDebuffs } from './dist/mechanics.mjs';

const veteran = (arch = 'breaker', level = 14) => {
  const s = fresh();
  s.hackers = { breaker: { level, xp: 0 }, bastion: { level, xp: 0 }, infiltrator: { level, xp: 0 }, operator: { level, xp: 0 } };
  s.loadout.sub = Object.fromEntries(['breaker', 'bastion', 'infiltrator', 'operator'].map((c) => [c, defaultSub(c)])); // each its old-edge subclass, picked
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
    assert.ok(v.parts.some((p) => p.special) && v.parts.length === (st.genes.some((g) => MECH_GENES.has(g)) ? 3 : 2), id); // a mechanics strain carries three
    assert.match(v.name, new RegExp('^' + st.name.toUpperCase()));
  }
  assert.deepEqual(strainsFor('ghostroot', 3), []);
  assert.deepEqual(strainsFor('ghostroot', 12, 1), [], 'not on layer 1');
  assert.deepEqual(strainsFor('ghostroot', 12, 2).sort(), ['echo', 'flicker', 'keylogger', 'lurker', 'sleeper']);
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
  assert.deepEqual([1, 2, 3, 4, 8].map(gradeFor), [1, 2, 2, 3, 3], 'by floor: 1, then 2-3, then 4 and down');
});

test('Keylogger: the Logger only feels synced commands, and three unsynced ones come back as a Dump', () => {
  const s = bare(start('keylogger'));
  s.encounter.virus.tells = null; // the Logger's own rule: no charge riding its Dump
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
  const ev = fire(s, 'spike pulse', true);
  assert.ok(ev.some((e) => /^Dump (hits|misses)/.test(e.message || '')), 'the Dump fires (it can miss, like any hit)');
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

// Fallback (combat.mjs breakPart): break the part that attacks first and the one left takes over its attack, so the
// obvious first target never leaves the rest harmless.
const breakNow = (s, p) => { Object.assign(p, { armor: 0, maxArmor: 0, patchAt: null }); p.integrity = 1; fire(s, 'spike ' + p.id); };
test('Fallback: the Patcher drops its Patch and takes over the Surge when the Pulse Node breaks first; its Surge lands', () => {
  const s = bare(start('patchwork', 'bastion'));
  const pulse = part(s, 'pulse'), patcher = part(s, 'patcher'), surge = pulse.attack.amount;
  assert.equal(patcher.fallback, 'pulse');
  patcher.attack.due = s.encounter.cycle + 3;
  const next = patcher.attack.due;
  breakNow(s, pulse);
  assert.equal(patcher.attack.due, next, 'in place of its next Patch');
  assert.equal(pulse.integrity, 0);
  assert.equal(patcher.attack.name, 'Surge', 'its Patch is gone: it Surges');
  assert.equal(patcher.attack.effect, 'damage');
  assert.equal(patcher.attack.amount, surge);
  assert.equal(patcher.tookOver, 'pulse');
  assert.ok(s.logs.some((x) => x.type === 'reroute' && x.fallback && /FALLBACK\. The Patcher takes over the Pulse Node's Surge/.test(x.message)));
  const hp = s.server.integrity;
  for (let i = 0; i < 6 && s.encounter; i++) fire(s, 'hold');
  assert.ok(s.server.integrity < hp, 'it hits you');
  // The other way round, nothing changes: the Pulse Node keeps its own Surge.
  const t = bare(start('patchwork', 'bastion')), p2 = part(t, 'pulse'), a2 = { ...p2.attack };
  breakNow(t, part(t, 'patcher'));
  assert.equal(p2.attack.name, a2.name); assert.equal(p2.attack.amount, a2.amount);
});

test('Fallback: a Bouncer\'s Keyring takes over the Gate\'s Ram; a Crawler\'s Brood bites with each spawn once its Maw is down', () => {
  const s = veteran();
  s.run = { loc: 'x', cwd: '/', integrity: 500, max: 500, pack: [], visited: ['/'] };
  selectEncounter(s, 'bouncer', 7, { level: 12, mode: 'run', room: '/x' });
  command(s, 'engage');
  const gate = part(s, 'pulse'), keyring = part(s, 'encryptor'), ram = gate.attack.amount;
  assert.equal(keyring.attack, null, 'no attack of its own');
  const at = s.encounter.cycle, every = gate.attack.interval;
  breakNow(s, gate);
  assert.equal(keyring.attack?.name, 'Ram');
  assert.equal(keyring.attack.amount, ram);
  assert.equal(keyring.attack.due, at + every, 'on the Ram\'s own clock: its first a full interval after the break');
  const c = veteran();
  c.run = { loc: 'x', cwd: '/', integrity: 500, max: 500, pack: [], visited: ['/'] };
  selectEncounter(c, 'crawler', 7, { level: 12, mode: 'run', room: '/x' });
  command(c, 'engage');
  const maw = part(c, 'pulse'), brood = part(c, 'replicator'), bite = maw.attack.amount;
  assert.equal(brood.attack.hit || 0, 0, 'the Brood only spawns while the Maw stands');
  breakNow(c, maw);
  assert.equal(brood.attack.effect, 'replicate', 'it still broods');
  assert.equal(brood.attack.hit, bite, 'and bites with each spawn');
  // Linked (v2 and up) doesn't stack on top: the fallback part takes the attack whole, once.
  const v2 = veteran();
  v2.run = { loc: 'x', cwd: '/', integrity: 500, max: 500, pack: [], visited: ['/'] };
  selectEncounter(v2, 'random', 7, { level: 12, mode: 'run', room: '/x', family: 'worm', strain: 'patchwork', grade: 2, mutation: null });
  command(v2, 'engage');
  const pp = part(v2, 'pulse'), pa = part(v2, 'patcher'), amt = pp.attack.amount;
  breakNow(v2, pp);
  assert.equal(pa.attack.amount, amt, 'the Surge as it was, no Linked third on top');
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

// ---------- the mechanics strains (docs/variety-plan.md 1.1): each builds, and its pair interacts ----------
const mstart = (key) => { const s = veteran('breaker', 20); selectEncounter(s, key, 7, { level: STRAINS[key].from, mutation: null }); command(s, 'engage'); s.encounter.virus.tells = null; return bare(s); };
const said = (ev, re) => ev.some((x) => re.test(x.message || ''));

test('Lurker: the Opportunist sleeps off the timeline until you carry a debuff, then wakes for good', () => {
  const s = mstart('lurker'), e = s.encounter, o = part(s, 'opportunist');
  assert.deepEqual(e.virus.parts.map((p) => p.id), ['pulse', 'scrambler', 'opportunist']);
  part(s, 'scrambler').attack = null; part(s, 'pulse').attack = null;
  fire(s, 'hold');
  assert.ok(!o.woke && o.attack.due >= 900, 'clean: it sleeps');
  e.scrambleUntil = e.cycle + 2; // the Scramble its pair puts on you
  const ev = fire(s, 'hold');
  assert.ok(o.woke && said(ev, /WAKES/), 'Scrambled: it wakes');
  assert.ok(o.attack.due <= e.cycle + 1);
  e.scrambleUntil = 0;
  fire(s, 'hold');
  assert.ok(o.woke && o.attack.due < 900, 'and stays awake once clean');
});

test('Bloodhound: while the Encryptor\'s encryption is on you, the Predator bites every cycle', () => {
  const s = mstart('bloodhound'), e = s.encounter, p = part(s, 'predator');
  part(s, 'encryptor').attack = null; part(s, 'pulse').attack = null;
  fire(s, 'hold');
  assert.ok(!p.hunting);
  e.encrypt = 3;
  fire(s, 'hold');
  assert.ok(p.hunting && p.attack.due <= e.cycle + 1, 'Encrypted: it hunts');
  e.encrypt = 0;
  fire(s, 'hold');
  assert.ok(!p.hunting, 'cleansed: it stops');
});

test('Scythe: the Harvester reaps the Volatile\'s Corrupted, and a reap is not a cleanse; a cleanse deals the rest', () => {
  const s = mstart('scythe'), e = s.encounter, vol = part(s, 'volatile'), har = part(s, 'harvester');
  mechLanded(s, vol, vol.attack);
  assert.ok(e.corrupt?.left > 0 && e.volatile, 'the Volatile Corrupts you');
  const before = s.server.integrity;
  e.lastCmd = { id: 'hold', cycle: e.cycle };
  mechLanded(s, har, har.attack);
  assert.ok(!e.corrupt && !e.volatile && s.server.integrity < before, 'the Reap consumes it for a hit');
  const after = s.server.integrity;
  mechFired(s);
  assert.equal(s.server.integrity, after, 'and the Volatile\'s rest does not land on top');
  mechLanded(s, vol, vol.attack);
  e.corrupt = null; // cleansed
  mechFired(s);
  assert.ok(s.server.integrity < after, 'a cleanse deals what it had left at once');
});

test('Doomsday: fired commands count toward the big turn, the Leak makes each one cost, and holding is free', () => {
  const s = mstart('doomsday'), e = s.encounter, cd = part(s, 'countdown');
  part(s, 'pulse').attack.due = 999;
  part(s, 'leaker').attack.due = 999;
  e.leakUntil = e.cycle + 1;
  const hp = s.server.integrity, ev = fire(s, 'spike pulse');
  assert.ok(said(ev, /^Leak: your command costs/) && s.server.integrity < hp, 'leaking, a command costs');
  assert.equal(cd.count, 1);
  fire(s, 'hold');
  assert.equal(cd.count, 1, 'a hold neither counts nor costs');
  cd.count = 9;
  const big = [...fire(s, 'spike pulse'), ...fire(s, 'hold')];
  assert.ok(said(big, /^COUNTDOWN/), 'at 10, every part attacks at once');
  assert.equal(cd.count, 0);
});

test('Bad Blood: the Amplifier boosts the Pulse Node and the Vendetta in turn, and a break while the Vendetta stands stacks', () => {
  const s = mstart('badblood'), e = s.encounter;
  for (const p of e.virus.parts) if (p.attack) p.attack.due = 999;
  fire(s, 'hold'); fire(s, 'hold');
  assert.equal(part(s, 'pulse').amped, 'amplifier');
  assert.equal(part(s, 'vendetta').amped, 'amplifier', 'both its attackers, in turn');
  part(s, 'pulse').integrity = 1;
  fire(s, 'spike pulse');
  assert.equal(e.virus.vendetta, 1, 'the break avenged');
});

test('Bodysnatcher: your next command hit moves the Swap\'s Throttle onto the part it hits; the Jolt costs a command', () => {
  const s = mstart('bodysnatcher'), e = s.encounter;
  for (const p of e.virus.parts) if (p.attack) p.attack.due = 999;
  e.throttledUntil = e.cycle + 2;
  const ev = fire(s, 'spike pulse');
  assert.ok(said(ev, /^Swap: your Throttled moves onto the Pulse Node/));
  assert.ok(e.throttledUntil < e.cycle && part(s, 'pulse').throttledUntil >= e.cycle);
  const st = part(s, 'stunner');
  mechLanded(s, st, st.attack);
  fire(s, 'hold');
  const hp = part(s, 'pulse').integrity;
  fire(s, 'spike pulse');
  assert.equal(part(s, 'pulse').integrity, hp, 'Stunned: the command does not fire');
});

test('a mechanics strain\'s build crowds out the mutation or Linked that would break its rules', () => {
  assert.equal(createVirus('random', 3, { family: 'worm', strain: 'doomsday', threat: 30, mutation: 'hasty' }).mutation, null);
  assert.equal(createVirus('random', 3, { family: 'worm', strain: 'doomsday', threat: 30, mutation: 'armored' }).mutation, 'armored');
  const bb = createVirus('random', 3, { family: 'worm', strain: 'badblood', threat: 30, grade: 2 });
  assert.ok(bb.unlinked && !bb.genes.some((g) => g.id === 'linked'));
  assert.ok(!createVirus('random', 3, { family: 'ghostroot', strain: 'lurker', threat: 30, grade: 2 }).unlinked);
  for (const k of Object.keys(STRAINS)) assert.deepEqual(compatible(createVirus('random', 4, { family: STRAINS[k].lineage, strain: k, threat: 40, grade: 3 }).genes.map((g) => g.id)), compatible(STRAINS[k].genes), k);
});

test('the spread: a strain\'s mechanics parts roll on wild viruses of its lineage, from its level and depth, and nowhere else', () => {
  assert.deepEqual([...spreadOf('ghostroot', 12, 2)], ['opportunist']);
  assert.deepEqual([...spreadOf('ghostroot', 11, 2)], [], 'below its level');
  assert.deepEqual([...spreadOf('ghostroot', 12, 1)], [], 'above its depth');
  assert.deepEqual([...spreadOf('worm', 16, 3)].sort(), ['amplifier', 'countdown', 'leak', 'vendetta'], 'a mutated strain\'s part doesn\'t spread (the Guarded Patchwork\'s Bodyguard)');
  assert.equal(spreadFrom('worm', 'leak'), 'doomsday');
  assert.equal(PARTS.mech, 0);
  const mechOn = (family, L, floor) => { const got = {}; for (let seed = 1; seed <= 600; seed++) { const v = createVirus('random', seed, { family, threat: L + 9, floor, mutation: null }); for (const p of v.parts) if (p.mech) got[p.mech] = (got[p.mech] || 0) + 1; if (v.parts.some((p) => p.mech === 'opportunist')) assert.ok(v.parts.some((p) => p.special), 'the feeder rule: the Opportunist only beside the Scrambler'); } return got; };
  const g = mechOn('ghostroot', 12, 2);
  assert.deepEqual(Object.keys(g), ['opportunist'], JSON.stringify(g));
  assert.deepEqual(mechOn('ghostroot', 12, 1), {}, 'not above its depth');
  assert.deepEqual(mechOn('ghostroot', 11, 2), {}, 'not below its level');
  assert.ok(mechOn('worm', 15, 2).leak > 0, 'the Doomsday\'s Leaker spreads onto worms');
  const names = []; // named as any third names it (beside a costlier lever, the lever's)
  for (let seed = 1; seed <= 600; seed++) { const v = createVirus('random', seed, { family: 'ghostroot', threat: 21, floor: 2, mutation: null }); if (v.parts.some((p) => p.mech === 'opportunist')) names.push(v.name); }
  assert.ok(names.some((n) => /^LURKING GHOSTROOT-/.test(n)), names.join(' '));
});

// Wave 3 (docs/variety-plan.md 1.3): each old strain's mutated form.
const MUTANTS = { leakingkeylogger: ['keylogger', 'leaker'], junkinghashrat: ['hashrat', 'junker'], amplifiedfloodgate: ['floodgate', 'amplifier'], feedingleech: ['leech', 'feeder'], lurkingsleeper: ['sleeper', 'opportunist'], guardedpatchwork: ['patchwork', 'bodyguard'], laggingflicker: ['flicker', 'jitter'], probingextortion: ['extortion', 'prober'], volatileecho: ['echo', 'volatile'], vengefulbricker: ['bricker', 'vendetta'], countingoverrun: ['overrun', 'countdown'] };

test('mutated strains: the strain and one mechanics part, named by its adjective, from 10 levels past the strain', () => {
  for (const [k, [base, id]] of Object.entries(MUTANTS)) {
    const st = STRAINS[k], b = STRAINS[base], v = createVirus(k, 3, { threat: st.from + 9, mutation: null });
    assert.equal(st.mutates, base);
    assert.equal(st.from, b.from + 10, k);
    assert.deepEqual(v.parts.map((p) => p.id), [...b.parts.map((p) => p.id), id], k);
    assert.match(v.name, new RegExp(`^${st.name.toUpperCase()}-`));
    assert.ok(st.name.endsWith(b.name) && st.rule.startsWith(b.rule) && st.author === b.author, k);
    assert.ok(!strainsFor(b.lineage, st.from - 1, 2).includes(k) && strainsFor(b.lineage, st.from, 2).includes(k), k);
  }
});

test('mutated strains: each one\'s part works beside its strain', () => {
  // The statuses its part's attack puts on you.
  for (const [k, status] of [['leakingkeylogger', 'Leak'], ['junkinghashrat', 'Junk process'], ['laggingflicker', 'Lag'], ['probingextortion', 'Exposed'], ['volatileecho', 'Corrupted']]) {
    const s = mstart(k), p = part(s, MUTANTS[k][1]);
    mechLanded(s, p, p.attack);
    assert.ok(youDebuffs(s).includes(status), `${k}: ${youDebuffs(s)}`);
  }
  // The Leaking Keylogger: an unsynced command both costs and logs.
  { const s = mstart('leakingkeylogger'), e = s.encounter; for (const p of e.virus.parts) if (p.attack) p.attack.due = 999;
    e.leakUntil = e.cycle + 2; const hp = s.server.integrity; fire(s, 'spike pulse');
    assert.ok(s.server.integrity < hp && e.keylog === 1, 'leaked and logged'); }
  // The Amplified Floodgate: the Amplifier boosts the Flooder in turn.
  { const s = mstart('amplifiedfloodgate'); for (const p of s.encounter.virus.parts) if (p.attack) p.attack.due = 999;
    fire(s, 'hold'); fire(s, 'hold');
    assert.ok([part(s, 'pulse').amped, part(s, 'flooder').amped].every((x) => x === 'amplifier')); }
  // The Feeding Leech: a debuff on you heals its most damaged part.
  { const s = mstart('feedingleech'), e = s.encounter; for (const p of e.virus.parts) if (p.attack) p.attack.due = 999;
    const tap = part(s, 'tap'); tap.integrity -= 10; const was = tap.integrity; e.exposedHit = true; fire(s, 'hold');
    assert.ok(tap.integrity > was, 'fed'); }
  // The Lurking Sleeper: a hit wakes the virus, but its Opportunist sleeps on until you carry a debuff.
  { const s = mstart('lurkingsleeper'), e = s.encounter, o = part(s, 'opportunist');
    fire(s, 'spike pulse');
    assert.ok(!e.virus.dormant && !o.woke && o.attack.due >= 900, 'the virus wakes, the Opportunist sleeps');
    e.exposedHit = true; fire(s, 'hold');
    assert.ok(o.woke && o.attack.due < 900, 'a debuff wakes it'); }
  // The Guarded Patchwork: the part you hit is shielded.
  { const s = mstart('guardedpatchwork'); for (const p of s.encounter.virus.parts) if (p.attack) p.attack.due = 999;
    fire(s, 'spike patcher');
    assert.ok(part(s, 'patcher').bufHp > 0 && part(s, 'patcher').bufBy === 'bodyguard'); }
  // The Vengeful Bricker: a break while the Vendetta stands stacks.
  { const s = mstart('vengefulbricker'), e = s.encounter; for (const p of e.virus.parts) if (p.attack) p.attack.due = 999;
    part(s, 'pulse').integrity = 1; fire(s, 'spike pulse');
    assert.equal(e.virus.vendetta, 1); }
  // The Counting Overrun: fired commands count, a hold doesn't.
  { const s = mstart('countingoverrun'), cd = part(s, 'countdown'); for (const p of s.encounter.virus.parts) if (p.attack) p.attack.due = 999;
    fire(s, 'spike pulse'); fire(s, 'hold');
    assert.equal(cd.count, 1); }
});
