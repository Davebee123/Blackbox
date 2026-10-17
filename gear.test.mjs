// Protocols (you), services (the server) and code: slots, stats, rarities, crits, drops,
// compiling, scrapping, Zero-days, the install queue and save migration.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part, restore, addItem, gearStat, scaled, healScaled, dotMult, dotHit, SAVE_VERSION, previewDamage, daemonSlots, maxSignal, critChance, loaded, slotCount, rigOf, tickServices, syncServer, compileCost, idleRegen, missChance, serverLevel } from './dist/combat.mjs';
import { play, connect, sourceOf } from './dist/run.mjs';
import * as FP from './dist/floorplan.mjs';
// Since R1 a server is rooms (netrooms.mjs): into the first room next to the entry that something holds, and engage.
const roomFight = (s) => { const R = s.rooms, g = R.graph, room = FP.neighbours(g, R.at).map((id) => g.rooms[id]).find((r) => FP.isUp(s, r) && r.kind !== 'core'); FP.go(s, room.id); FP.act(s, 'engage'); };
// The vault, its key in hand: opened, its files in your pack.
const openVault = (s) => { const R = s.rooms, v = R.graph.vaults[0]; R.visit.keys.push(v); R.at = v; R.screen = null; FP.act(s, 'open'); };
import { CONFIG, power } from './dist/data.mjs';
import { STATS, RARITIES, LOOT, BASES, AFFIXES, SLOTS, DECONSTRUCT, uniqueItem, lootOdds, magicFind, COMPILE, STASH_CAP, SERVICES, PROTOCOL_STATS, protocolSlots, RULES, rollItem, seeded, codeOf, codeDrop, vaultCode } from './dist/gear.mjs';

// Exact numbers unless a test turns crits or misses on.
CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.partToughness = 1; // mechanics tests use the parts' base numbers
CONFIG.enemyRamp = 0;
CONFIG.restRegen = 0; // resting has its own test
CONFIG.salvageChance = 1;
CONFIG.misses = false; // and no misses
CONFIG.powerPerLevel = 0; // flat numbers at every level (level tests turn it back on)
CONFIG.gap = { dealt: 0, taken: 0, floor: 1, below: 0 }; // and no level-gap scaling (combat.test.mjs tests it)
(await import('./dist/data.mjs')).LOADOUT.specRanks = 0; // the kit talent's two free ranks (progression.mjs): off, for exact numbers

const item =(stats, extra = {}) => ({ kind: 'protocol', side: 'hacker', rarity: 'stock', level: 5, stats, zeroDay: null, name: 'Test protocol', ...extra });
const give = (s, stats, extra) => { const it = addItem(s, item(stats, extra)); command(s, 'load ' + it.id); return it; };
const svc = (s, services) => { s.services = { ...services }; syncServer(s); s.server.integrity = s.server.max; return s; };
// Filters in the wall's slots (two at +0), with the stats a home fight reads.
const wall = (s, ...stats) => { s.filters = { held: stats.map((x, i) => ({ kind: 'filter', rarity: 'tuned', level: 1, name: `Filter ${i + 1}`, stats: { strength: 1, ...x } })), on: stats.map((_, i) => i) }; syncServer(s); s.server.integrity = s.server.max; return s; };
const fight = (s, key = 'cryptjack', level = 6) => { selectEncounter(s, key, 7, { level }); command(s, 'engage'); return s; };
const bare = (s) => { for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, maxArmor: 0, patchAt: null }); return s; };
const quiet = (s) => { for (const p of s.encounter.virus.parts) p.attack = null; return s; };
const finishOne = (s) => {
  const [first, ...rest] = s.encounter.virus.parts;
  for (const p of rest) Object.assign(p, { integrity: 0, armor: 0 });
  Object.assign(first, { integrity: 1, armor: 0 });
  command(s, 'spike ' + first.id); resolveCycle(s);
};

test('items: a base for its slot (primaries), affixes by rarity (one prefix and suffix on a blue, up to three each on a yellow), named like D2', () => {
  CONFIG.powerPerLevel = 0.04;
  const r = seeded(11);
  for (let i = 0; i < 300; i++) {
    const rarity = ['stock', 'tuned', 'custom'][i % 3];
    const it = rollItem(r, { level: 1 + (i % 30), rarity });
    const base = BASES[it.base];
    assert.ok(SLOTS[it.group] && base.slot === it.group, 'a base for its slot');
    assert.ok(base.level <= it.level, 'a tier the level has unlocked');
    for (const k of Object.keys(base.primary)) assert.ok(it.stats[k] !== undefined, `primary ${k}`);
    const want = RARITIES[rarity].affixes;
    const real = it.affixes.filter((a) => !AFFIXES[a].junk);
    assert.ok(real.length >= want[0] && real.length <= want[1], `${rarity}: ${real.length} affixes`);
    const pre = it.affixes.filter((a) => AFFIXES[a].kind === 'prefix').length, suf = it.affixes.filter((a) => AFFIXES[a].kind === 'suffix').length;
    assert.ok(pre <= (rarity === 'custom' ? 3 : 1) && suf <= (rarity === 'custom' ? 3 : 1));
    for (const a of real) assert.ok(AFFIXES[a].from <= it.level, `${a} needs level ${AFFIXES[a].from}`);
    // A rule on every blue (a minor one) and every yellow (a major one), none on a white.
    assert.equal(it.rule ? RULES[it.rule].tier : null, RARITIES[rarity].rule || null, `${rarity}: its rule`);
  }
  assert.equal(rollItem(seeded(2), { level: 5, rarity: 'scrap' }).rarity, 'stock', 'no grey protocols');
  assert.ok(!AFFIXES.buggy && !AFFIXES.leaky, 'and no junk affixes');
  const blue = rollItem(seeded(4), { level: 8, rarity: 'tuned', slot: 'exploit' });
  assert.match(blue.name, /Weaponized Exploit/, 'named for its base, with its affixes around it');
  const lo = rollItem(seeded(3), { level: 5, rarity: 'stock', slot: 'exploit' }).stats.damage;
  const hi = rollItem(seeded(3), { level: 10, rarity: 'stock', slot: 'exploit' }).stats.damage;
  const tier = rollItem(seeded(3), { level: 11, rarity: 'stock', slot: 'exploit' });
  assert.ok(hi > lo, 'higher level, bigger primaries');
  assert.equal(tier.base, 'exploit-chain', 'a new tier at 11');
  assert.ok(tier.stats.damage > hi, 'and a jump');
  const asked = rollItem(seeded(5), { level: 6, stat: 'crit', source: 'compile' });
  assert.equal(asked.rarity, 'tuned');
  assert.ok(asked.stats.crit > 0, 'compiling a stat: it has that affix');
  CONFIG.powerPerLevel = 0;
});

test('uniques: fixed name and stats, scaled up from their own level; drop odds by tier, trash under elites under rare spawns', () => {
  CONFIG.powerPerLevel = 0.04;
  const u = { id: 'x', name: 'Test Unique', base: 'weaponized-exploit', level: 5, primary: { damage: 10 }, secondary: { crit: 5 }, downside: { reduction: -1 } };
  const a = uniqueItem(u, 5, seeded(1)), b = uniqueItem(u, 15, seeded(1));
  assert.equal(a.name, 'Test Unique');
  assert.equal(a.rarity, 'zeroday');
  assert.equal(a.unique, 'x');
  assert.equal(a.stats.reduction, -1, 'the downside');
  assert.ok(b.stats.damage > a.stats.damage, 'found later, it is bigger');
  CONFIG.powerPerLevel = 0;
  // The loot model (WoW's): trash rarely drops an item, an elite better, a rare spawn better still, at every rarity.
  const [trash, elite, rare] = ['trash', 'elite', 'rare'].map(lootOdds);
  for (const r of ['stock', 'tuned', 'custom', 'zeroday']) assert.ok(trash[r] < elite[r] && elite[r] < rare[r], r);
  assert.ok(trash.stock + trash.tuned + trash.custom < 0.05, 'most trash drops no item');
  assert.ok(rare.stock + rare.tuned + rare.custom > 0.5, 'a rare spawn usually drops one');
  assert.ok(trash.zeroday < 1 / LOOT.per.zeroday && elite.zeroday < 1 / LOOT.per.zeroday, 'a world gold is very rare');
  assert.equal(lootOdds('nonsense'), trash);
  assert.ok(Math.abs(magicFind(50) - 4 / 3) < 1e-9, '+50% Scavenge is +33%');
});

test('slots: Exploit, Proxy, Shell, Script, then Implants at 15 and 30; each class loads its own; one place at a time', () => {
  assert.deepEqual([1, 14, 15, 29, 30, 50].map(protocolSlots), [4, 4, 5, 5, 6, 6]);
  const s = fresh();
  assert.equal(slotCount(s), 4);
  const relay = give(s, { signal: 8 }, { group: 'proxy' });
  assert.equal(maxSignal(s), CONFIG.maxSignal + 8);
  assert.equal(rigOf(s).indexOf(relay.id), 1, 'a Proxy goes in the Proxy slot');
  const first = give(s, { damage: 1 }, { group: 'exploit' });
  give(s, { regen: 1 }, { group: 'shell' });
  give(s, { scavenge: 1 }, { group: 'script' });
  assert.equal(loaded(s).length, 4);
  const extra = addItem(s, item({ crit: 1 }, { group: 'exploit' }));
  command(s, 'load ' + extra.id);
  assert.equal(rigOf(s)[0], extra.id, 'a full slot swaps');
  assert.ok(!rigOf(s).includes(first.id), 'the old one is back in the stash');
  const imp = addItem(s, item({ damage: 2 }, { group: 'implant' }));
  assert.match(command(s, 'load ' + imp.id).at(-1).message, /level 15/);
  command(s, 'unload 1');
  assert.ok(!rigOf(s).includes(extra.id), 'unload by slot number');
  command(s, 'load ' + extra.id);
  assert.equal(loaded(s).length, 4);
  s.hackers.breaker.level = 15;
  assert.equal(slotCount(s), 5, 'a fifth slot at 15');
  command(s, 'load ' + imp.id);
  assert.equal(rigOf(s)[4], imp.id, 'an Implant');
  s.loadout.archetype = 'bastion';
  assert.equal(loaded(s).length, 0, 'each class has its own protocols');
  command(s, 'load ' + extra.id);
  s.loadout.archetype = 'breaker';
  assert.ok(!rigOf(s).includes(extra.id), 'loading it on another class took it off this one');
  fight(s);
  assert.match(command(s, 'load ' + relay.id).at(-1).message, /between fights/);
});

test('Damage adds flat to every skill hit; Crit makes hits land ×1.5; armor still just breaks a chit', () => {
  const s = fresh();
  s.hackers = { breaker: { level: 18, xp: 0 } };
  give(s, { damage: 5 });
  bare(quiet(fight(s)));
  const pulse = part(s, 'pulse');
  Object.assign(pulse, { integrity: 500, max: 500 });
  assert.equal(previewDamage(s, 'spike', pulse), 30);
  command(s, 'spike pulse'); resolveCycle(s);
  assert.equal(500 - pulse.integrity, 30);
  CONFIG.baseCrit = 100;
  command(s, 'spike pulse');
  const ev = resolveCycle(s).find((e) => e.type === 'damage');
  assert.equal(ev.amount, 45);
  assert.equal(ev.crit, true);
  const t = fresh();
  quiet(fight(t));
  const enc = part(t, 'encryptor');
  command(t, 'spike encryptor');
  const hit = resolveCycle(t);
  assert.ok(hit.some((e) => e.type === 'armor') && !hit.some((e) => e.crit), 'no crit on a chit');
  assert.equal(enc.integrity, enc.max);
  CONFIG.baseCrit = 0;
  assert.equal(critChance(fresh()), 0);
});

test('enemies crit too (from level 3), for ×1.5 damage', () => {
  CONFIG.enemyCrit = 1;
  const s = fight(fresh(), 'cryptjack', 6);
  part(s, 'encryptor').attack = null;
  s.encounter.hardened = 0;
  const pulse = part(s, 'pulse');
  s.encounter.cycle = pulse.attack.due;
  const amount = pulse.attack.amount;
  command(s, 'hold');
  const ev = resolveCycle(s).find((e) => e.type === 'server-hit');
  assert.equal(ev.amount, Math.round(amount * 1.5));
  assert.equal(ev.crit, true);
  assert.equal(fight(fresh(), 'cryptjack', 1).encounter.virus.crit, 0, 'a new server never sees an enemy crit');
  CONFIG.enemyCrit = 0;
});

test('filters at home (the services that were): Hardened softens hits, of the Scrubber shields the start, Self-healing heals over 5 cycles and very slowly between fights', () => {
  const s = wall(fresh(), { reduction: 6, shield: 10 }, { regen: 3 });
  assert.equal(gearStat(s, 'reduction', 'server'), 6);
  assert.equal(gearStat(s, 'shield', 'server'), 10, '10% of max Integrity');
  assert.equal(gearStat(s, 'regen', 'server'), 3);
  fight(s);
  assert.equal(s.encounter.shield, 10);
  part(s, 'encryptor').attack = null;
  const pulse = part(s, 'pulse');
  pulse.attack.amount = 25;
  s.encounter.cycle = pulse.attack.due;
  command(s, 'hold'); resolveCycle(s);
  assert.equal(s.server.integrity, 100 - (19 - 10), '25 → 19 after 6 Block, then the shield soaks 10');
  command(s, 'hold'); resolveCycle(s);
  assert.equal(s.server.integrity, 92, 'Regen 3: 3 every 5 cycles, a fifth a cycle: +1 on the second');
  s.encounter = null;
  assert.equal(idleRegen(s, 60000), false, 'between fights: 3 every 5 minutes');
  idleRegen(s, 60000);
  assert.equal(s.server.integrity, 93);
});

test('your survival stats count on runs, the server\'s services at home', () => {
  const s = fresh();
  give(s, { reduction: 3 });
  command(s, 'developer location worm');
  Object.assign(s.locations[0], { template: 'relay', quirk: null });
  connect(s, s.locations[0].id);
  roomFight(s);
  for (const p of s.encounter.virus.parts) p.attack = null;
  const sentry = s.encounter.virus.parts[0];
  sentry.attack = { name: 'Sweep', effect: 'damage', amount: 10, interval: 9, due: s.encounter.cycle };
  const sig = s.run.integrity;
  command(s, 'hold'); resolveCycle(s);
  assert.equal(sig - s.run.integrity, 7, 'your protocol\'s 3 Block on a run');
  const h = fresh();
  give(h, { reduction: 3 });
  fight(h);
  part(h, 'encryptor').attack = null;
  part(h, 'pulse').attack.amount = 10;
  h.encounter.cycle = part(h, 'pulse').attack.due;
  command(h, 'hold'); resolveCycle(h);
  assert.equal(h.server.integrity, 90, 'but not at home');
});

test('misses: your damaging skills can miss (the cooldown is still spent); Accuracy cancels the level gap', () => {
  CONFIG.misses = true;
  Object.assign(CONFIG, { baseMiss: 100, maxMiss: 100 }); // every hit misses
  const s = fresh();
  s.hackers = { breaker: { level: 18, xp: 0 } };
  quiet(fight(s, 'cryptjack', 18));
  const enc = part(s, 'encryptor');
  const armor = enc.armor;
  command(s, 'overload encryptor');
  const ev = resolveCycle(s);
  Object.assign(CONFIG, { baseMiss: 5, maxMiss: 60 });
  assert.ok(ev.some((e) => e.type === 'miss'));
  assert.equal(enc.armor, armor, 'a miss breaks nothing');
  assert.ok(s.encounter.readyAt.overload > s.encounter.cycle, 'Overload is cooling anyway');
  const t = fresh();
  t.hackers = { breaker: { level: 20, xp: 0 } };
  give(t, { accuracy: 6 });
  fight(t, 'cryptjack', 23);
  assert.equal(missChance(t), 2, '3 levels up: 8%, less 6% Accuracy');
  CONFIG.misses = false;
});

test('Decoy and Sandboxed filters: attacks and specials on your server can fail', () => {
  const was = { e: STATS.evasion.cap, s: STATS.sanitize.cap };
  STATS.evasion.cap = STATS.sanitize.cap = 100;
  const s = fresh();
  s.filters = { held: [{ kind: 'filter', rarity: 'tuned', level: 1, name: 'Decoy Packet Filter', stats: { strength: 1, evasion: 100, sanitize: 100 } }], on: [0] };
  fight(s);
  const pulse = part(s, 'pulse'), enc = part(s, 'encryptor');
  s.encounter.hardened = 0;
  s.encounter.cycle = Math.max(pulse.attack.due, enc.attack.due);
  command(s, 'hold');
  const ev = resolveCycle(s);
  assert.ok(ev.some((e) => e.type === 'evaded'));
  assert.ok(ev.some((e) => /Sanitize stopped it/.test(e.message)));
  assert.equal(s.server.integrity, 100);
  assert.equal(s.encounter.encrypt, 0);
  Object.assign(STATS.evasion, { cap: was.e }); Object.assign(STATS.sanitize, { cap: was.s });
});

test('Echo repeats a hit (breaking another chit); Crit Damage raises crits; Payload boosts burns', () => {
  const cap = STATS.echo.cap;
  STATS.echo.cap = 100;
  const s = fresh();
  give(s, { echo: 100 });
  quiet(fight(s));
  const enc = Object.assign(part(s, 'encryptor'), { armor: 2, maxArmor: 2 });
  command(s, 'spike encryptor'); resolveCycle(s);
  assert.equal(enc.armor, 0, 'two chits from one Spike');
  STATS.echo.cap = cap;
  CONFIG.baseCrit = 100;
  const c = fresh();
  give(c, { critDamage: 12 });
  bare(quiet(fight(c)));
  Object.assign(part(c, 'pulse'), { integrity: 500, max: 500 });
  command(c, 'spike pulse'); resolveCycle(c);
  assert.equal(500 - part(c, 'pulse').integrity, 49, '25 × 1.5, + 12');
  CONFIG.baseCrit = 0;
  const b = fresh();
  b.loadout.archetype = 'infiltrator';
  b.hackers = { infiltrator: { level: 18, xp: 0 } };
  give(b, { payload: 10 });
  bare(quiet(fight(b)));
  Object.assign(part(b, 'pulse'), { integrity: 500, max: 500 });
  command(b, 'inject pulse'); resolveCycle(b);
  assert.equal(500 - part(b, 'pulse').integrity, 30, 'Inject 20, +10 Payload on the tick');
});

test('Restore: every heal you cast heals that much more (Patch up front and as it ticks); Payload: every helper hit too', () => {
  const sysop = (restoreStat) => {
    const s = fresh();
    s.loadout.archetype = 'bastion'; s.hackers = { bastion: { level: 14, xp: 0 } }; s.loadout.sub = { bastion: 'sysop' }; // Patch opens at 14 (docs/kits.md)
    s.loadout.equipped.sysop = ['firewall', 'patch'];
    if (restoreStat) give(s, { restore: restoreStat });
    quiet(fight(s));
    s.server.integrity = 50;
    command(s, 'patch'); resolveCycle(s);
    const now = s.server.integrity;
    command(s, 'hold'); resolveCycle(s);
    return [now - 50, s.server.integrity - now];
  };
  assert.deepEqual(sysop(0), [4, 2], 'Patch: 4 now, then 2 a cycle');
  assert.deepEqual(sysop(50), [6, 3], '+50% Restore');
  const herder = (payload) => {
    const s = fresh();
    s.loadout.archetype = 'operator'; s.hackers = { operator: { level: 12, xp: 0 } };
    if (payload) give(s, { payload });
    bare(quiet(fight(s)));
    Object.assign(part(s, 'pulse'), { integrity: 500, max: 500 });
    command(s, 'deploy pulse'); resolveCycle(s);
    const first = 500 - part(s, 'pulse').integrity;
    command(s, 'hold'); resolveCycle(s);
    return 500 - part(s, 'pulse').integrity - first;
  };
  assert.equal(herder(0), 12, 'a helper hits for 12');
  assert.equal(herder(6), 18, '+6 Payload on the helper hit');
});

test('heals you cast and damage over time keep half the +4% a level (CONFIG.healLevel, CONFIG.dotLevel); Restore and Payload make up the rest', () => {
  CONFIG.powerPerLevel = 0.04;
  const s = fresh();
  s.loadout.archetype = 'bastion'; s.hackers = { bastion: { level: 26, xp: 0 } };
  assert.equal(scaled(s, 10), 20, 'everything else: ×2 at level 26');
  assert.equal(healScaled(s, 10), 15, 'a heal you cast: half that growth');
  assert.equal(dotMult(s), 0.75, 'a burn tick or helper hit (built with scaled): 1.5 of the 2');
  give(s, { restore: 20, payload: 5 });
  assert.equal(healScaled(s, 10), 18, '+20% Restore');
  assert.equal(dotMult(s), 0.75, 'Payload is flat: the share stays');
  assert.equal(dotHit(s, scaled(s, 10)), 20, 'a 10 tick at level 26: 15, +5 Payload');
  CONFIG.powerPerLevel = 0;
});

test('v32 then v44: Payload on old protocols was flat (+1–2 a tick), came back ×7 as a percentage, and is flat again at its level', () => {
  const old = fresh();
  old.version = 31;
  const a = addItem(old, item({ payload: 2, damage: 3 }));
  const b = addItem(old, item({ payload: 1.5 }));
  const s = restore(JSON.parse(JSON.stringify(old)));
  assert.equal(s.version, SAVE_VERSION);
  assert.deepEqual(s.stash.find((x) => x.id === a.id).stats, { payload: 2, damage: 3 }, '14% of a level-5 tick of 13: 2');
  assert.equal(s.stash.find((x) => x.id === b.id).stats.payload, 1);
  const again = restore(JSON.parse(JSON.stringify(s)));
  assert.equal(again.stash.find((x) => x.id === a.id).stats.payload, 2, 'once only');
});

test('v44: whole-number stats. Regen five times over (it counts over 5 cycles), Payload flat at the item\'s level, every item in the save, once', () => {
  const old = fresh();
  old.version = 43;
  const shell = addItem(old, item({ signal: 30, regen: 0.8, restore: 12 }));
  const script = addItem(old, item({ damage: 9, payload: 24 }, { level: 30 }));
  const cursed = addItem(old, item({ signal: 90, regen: -2 }, { level: 32 }));
  old.filters = { held: [{ kind: 'filter', rarity: 'tuned', level: 4, name: 'Self-healing Packet Filter', stats: { strength: 1, regen: 0.4 } }], on: [] };
  old.market = { offers: [{ item: { kind: 'protocol', rarity: 'tuned', level: 18, stats: { payload: 30, regen: 1.3 }, name: 'Offered' } }] };
  const s = restore(JSON.parse(JSON.stringify(old)));
  assert.equal(s.version, SAVE_VERSION);
  const got = (it) => s.stash.find((x) => x.id === it.id).stats;
  assert.deepEqual(got(shell), { signal: 30, regen: 4, restore: 12 }, 'Regen 0.8 a cycle is 4 every 5');
  assert.deepEqual(got(script), { damage: 9, payload: 5 }, '24% of a level-30 tick (12 × 1.58): 5 flat');
  assert.equal(got(cursed).regen, -10, 'a downside too');
  assert.equal(s.filters.held[0].stats.regen, 2, 'a filter\'s Regen at home');
  assert.deepEqual(s.market.offers[0].item.stats, { payload: 5, regen: 7 }, 'an item anywhere in the save');
  const again = restore(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(again.stash.find((x) => x.id === script.id).stats, { damage: 9, payload: 5 }, 'once only');
  assert.equal(again.stash.find((x) => x.id === shell.id).stats.regen, 4);
});

test('every stat a player reads is a whole number: rolled items, uniques, filters and the character sheet totals', async () => {
  const { UNIQUES } = await import('./dist/combat.mjs');
  const { rollFilter } = await import('./dist/filters.mjs');
  const { statLine } = await import('./dist/gear.mjs');
  const r = seeded(11), off = [];
  for (let L = 1; L <= 50; L += 1) for (const rarity of ['stock', 'tuned', 'custom']) for (let k = 0; k < 4; k++) {
    const it = rollItem(r, { level: L, rarity });
    for (const [st, v] of Object.entries(it.stats)) if (!Number.isInteger(v)) off.push(`${it.name} v${L} ${st} ${v}`);
    if (/\d\.\d/.test(statLine(it.stats))) off.push(statLine(it.stats));
    const f = rollFilter(r, { level: L, rarity });
    for (const [st, v] of Object.entries(f.stats)) if (!Number.isInteger(v)) off.push(`${f.name} ${st} ${v}`);
  }
  for (const u of Object.values(UNIQUES)) for (const L of [u.level, u.level + 10]) for (const [st, v] of Object.entries(uniqueItem(u, L, r).stats)) if (!Number.isInteger(v)) off.push(`${u.name} v${L} ${st} ${v}`);
  assert.deepEqual(off, []);
  const s = fresh();
  give(s, { regen: 3, payload: 2 });
  assert.equal(gearStat(s, 'regen'), 3);
  assert.equal(gearStat(s, 'payload'), 2);
});

test('Clock Speed ticks cooldowns faster; Leech heals per hit; Stealth delays first attacks', () => {
  const s = fresh();
  s.hackers = { breaker: { level: 18, xp: 0 } };
  give(s, { clock: 100 });
  bare(quiet(fight(s)));
  Object.assign(part(s, 'pulse'), { integrity: 500, max: 500 });
  assert.equal(gearStat(s, 'clock'), 25, 'Clock Speed caps at 25%');
  s.encounter.clock = 75; // three cycles in: this one fills the meter
  command(s, 'overload pulse'); resolveCycle(s);
  const plain = fresh(); plain.hackers = { breaker: { level: 18, xp: 0 } };
  bare(quiet(fight(plain))); Object.assign(part(plain, 'pulse'), { integrity: 500, max: 500 });
  command(plain, 'overload pulse'); resolveCycle(plain);
  assert.equal(s.encounter.readyAt.overload, plain.encounter.readyAt.overload - 1, 'the meter fills: one extra tick');
  const l = fresh();
  give(l, { leech: 10 });
  bare(quiet(fight(l)));
  l.server.integrity = 50;
  Object.assign(part(l, 'pulse'), { integrity: 500, max: 500 });
  command(l, 'spike pulse'); resolveCycle(l);
  assert.equal(l.server.integrity, 60, '10 per skill hit');
  const cap = STATS.stealth.cap;
  STATS.stealth.cap = 100;
  const t = fresh();
  give(t, { stealth: 100 });
  selectEncounter(t, 'cryptjack', 7, { level: 6 });
  const due = part(t, 'pulse').attack.due;
  command(t, 'engage');
  assert.equal(part(t, 'pulse').attack.due, due + 1);
  STATS.stealth.cap = cap;
});

test('a filter of Barbs (Counter-intrusion that was): whatever hits your server takes a hit back', () => {
  const s = wall(fresh(), { countermeasures: 6 });
  bare(fight(s));
  part(s, 'encryptor').attack = null;
  const pulse = part(s, 'pulse');
  s.encounter.cycle = pulse.attack.due;
  command(s, 'hold'); resolveCycle(s);
  assert.equal(pulse.max - pulse.integrity, 6);
});

test('home wins give the family\'s code, and can drop an item at the enemy\'s level', () => {
  const was = LOOT.odds.trash.stock;
  LOOT.odds.trash.stock = 1; // every kill drops something
  const s = fresh();
  bare(quiet(fight(s, 'cryptjack', 4)));
  for (const p of s.encounter.virus.parts) p.integrity = 1;
  command(s, 'spike pulse'); resolveCycle(s);
  const events = (command(s, 'spike encryptor'), resolveCycle(s));
  const drop = events.find((e) => e.type === 'drop');
  assert.ok(drop, 'a drop event for the Victory screen');
  assert.equal(s.stash.length, 1);
  assert.equal(s.stash[0].level, 4);
  assert.equal(s.stash[0].from, 'ransomware', 'it remembers where it dropped (for deconstructing)');
  const code = events.find((e) => e.type === 'code');
  assert.ok(code, 'a code event for the Victory screen');
  const k = codeOf(s.encounter.virus.family);
  assert.equal(k, 'cipher', 'ransomware drops Cipher code');
  assert.equal(s.materials[k], codeDrop(4));
  LOOT.odds.trash.stock = was;
});

test('compile: pick the stat, pay credits and components, get a protocol at your level', () => {
  const s = fresh();
  command(s, 'developer level 3');
  s.server.credits = 1000;
  assert.match(command(s, 'compile crit').at(-1).message, /no protocol recipes/, 'compiling starts locked');
  s.recipes = ['recipe:crit'];
  assert.match(command(s, 'compile damage').at(-1).message, /recipe/, 'only recipes you have');
  assert.match(command(s, 'compile crit').at(-1).message, /components/);
  for (let i = 0; i < 10; i++) s.salvage.push({ name: 'x' });
  command(s, 'compile crit');
  const it = s.stash.at(-1);
  assert.equal(it.kind, 'protocol');
  assert.equal(it.level, 3);
  assert.ok(it.stats.crit > 0, 'the stat you asked for');
  assert.match(command(s, 'compile integrity').at(-1).message, /server/, 'server stats come from the server');
  assert.notEqual(it.rarity, 'zeroday');
  assert.equal(s.server.credits, 1000 - COMPILE.cost(3).credits);
  assert.equal(s.salvage.length, 10 - COMPILE.cost(3).salvage);
  assert.match(command(s, 'compile rootkit').at(-1).message, /source/, 'Zero-days need their source first');
  s.recipes = ['rootkit'];
  for (let i = 0; i < 20; i++) s.salvage.push({ name: 'x' });
  assert.match(command(s, 'compile rootkit').at(-1).message, /guard component/, 'a Zero-day also needs guard components');
  s.salvage.push({ name: 'Tracker Core' }, { name: 'Sentry Lens' });
  command(s, 'compile rootkit');
  assert.equal(s.stash.at(-1).zeroDay, 'rootkit');
  assert.equal(compileCost(s).credits, COMPILE.cost(3).credits, 'no Build Farm any more: the list price');
});

test('deconstruct: an item breaks into salvage, code and Exploits by rarity (a loaded one comes off first)', () => {
  const s = fresh();
  const it = give(s, { damage: 5 }, { rarity: 'custom', from: 'worm', group: 'exploit' });
  const worm = s.materials.worm || 0, ex = s.materials.exploit || 0;
  command(s, 'deconstruct ' + it.id);
  assert.equal(s.stash.length, 0);
  assert.equal(loaded(s).length, 0);
  assert.equal(s.salvage.length, DECONSTRUCT.custom.salvage[0]);
  assert.equal(s.materials.worm - worm, DECONSTRUCT.custom.code, 'code from where it dropped');
  assert.equal(s.materials.exploit - ex, DECONSTRUCT.custom.exploit);
  const g = give(s, { damage: 1 }, { rarity: 'scrap', group: 'exploit' });
  command(s, 'scrap ' + g.id);
  assert.ok(s.salvage.length > DECONSTRUCT.custom.salvage[0], 'scrap still works as a word');
});

test('a full stash deconstructs new items instead', () => {
  const s = fresh();
  for (let i = 0; i < STASH_CAP; i++) addItem(s, item({ damage: 1 }));
  addItem(s, item({ damage: 9 }, { rarity: 'tuned' }));
  assert.equal(s.stash.length, STASH_CAP);
  assert.ok(s.salvage.length >= DECONSTRUCT.tuned.salvage[0] && s.salvage.length <= DECONSTRUCT.tuned.salvage[1]);
});

test('runs: your first vault holds a protocol kit and a code cache; deeper vaults can hold source you bank', () => {
  const s = fresh();
  command(s, 'developer location worm');
  const loc = s.locations[0];
  Object.assign(loc, { template: 'relay', quirk: null, depth: 2 });
  connect(s, loc.id);
  openVault(s);
  const names = s.run.pack.map((f) => f.name);
  assert.ok(names.includes('kit.bin'), names.join(' '));
  const src = sourceOf(loc);
  assert.ok(names.includes(`${src}.src`), 'and its source');
  const before = s.stash.length, worm = s.materials.worm;
  const packed = s.run.pack.filter((p) => p.kind === 'code' && p.material === 'worm').reduce((a, p) => a + p.amount, 0);
  play(s, 'jack out');
  assert.ok(s.stash.length >= before + 1, 'the kit is banked into your stash');
  assert.ok(packed >= vaultCode(loc.level || 1));
  assert.equal(s.materials.worm - worm, packed, 'worm servers give Worm code');
  assert.equal(s.recipes[0], src, 'the source banked');
  assert.ok(s.recipes.slice(1).every((id) => id.startsWith('recipe:')), 'and the blueprint beside it taught a recipe');
});

test('Zero-days: Rootkit\'s first hit goes through armor; Race Condition refunds the first miss; Buffer Overflow crits after a break', () => {
  const s = fresh();
  give(s, { damage: 1 }, { zeroDay: 'rootkit', rarity: 'zeroday' });
  quiet(fight(s));
  const enc = part(s, 'encryptor');
  const armor = enc.armor;
  command(s, 'spike encryptor'); resolveCycle(s);
  assert.equal(enc.armor, armor, 'went through: the chits are still there');
  assert.ok(enc.integrity < enc.max);
  command(s, 'spike encryptor'); resolveCycle(s);
  assert.equal(enc.armor, armor - 1, 'only the first hit');

  const dup = addItem(s, item({ damage: 1 }, { zeroDay: 'rootkit', rarity: 'zeroday' }));
  s.encounter = null;
  assert.match(command(s, 'load ' + dup.id).at(-1).message, /One of each Zero-day/);

  CONFIG.misses = true;
  Object.assign(CONFIG, { baseMiss: 100, maxMiss: 100 });
  const r = fresh();
  r.hackers = { breaker: { level: 18, xp: 0 } };
  give(r, { damage: 1 }, { zeroDay: 'race-condition', rarity: 'zeroday' });
  quiet(fight(r, 'cryptjack', 18));
  command(r, 'overload encryptor'); resolveCycle(r);
  assert.equal(r.encounter.readyAt.overload, undefined, 'the first miss: Overload is ready again');
  command(r, 'overload encryptor'); resolveCycle(r);
  assert.ok(r.encounter.readyAt.overload > r.encounter.cycle, 'the second miss spends it');
  Object.assign(CONFIG, { baseMiss: 5, maxMiss: 60 });
  CONFIG.misses = false;

  const b = fresh();
  give(b, { damage: 1 }, { zeroDay: 'buffer-overflow', rarity: 'zeroday' });
  bare(quiet(fight(b)));
  Object.assign(part(b, 'encryptor'), { integrity: 1 });
  Object.assign(part(b, 'pulse'), { integrity: 500, max: 500 });
  command(b, 'spike encryptor'); resolveCycle(b);
  command(b, 'spike pulse');
  const ev = resolveCycle(b).find((e) => e.type === 'damage');
  assert.equal(ev.crit, true, 'the hit after a break crits');
  command(b, 'spike pulse');
  assert.equal(resolveCycle(b).find((e) => e.type === 'damage').crit, false, 'just the one');
});

test('Cron Job and Snapshot are daemons now: Cron hits every 3 cycles, the part winding up a tell first; Snapshot restores once below half', async () => {
  const c = fresh();
  c.daemonLv = { cron: 1 }; c.daemons = ['cron'];
  bare(fight(c));
  c.encounter.virus.tells = null;
  for (const p of c.encounter.virus.parts) { p.attack = null; p.integrity = p.max = 200; }
  part(c, 'pulse').attack = { name: 'x', effect: 'damage', amount: 0, interval: 99, due: 99 };
  command(c, 'hold'); resolveCycle(c);
  assert.equal(part(c, 'pulse').integrity, 200 - 5, 'cycle 1: it runs on the next to attack, for 5 (lv 1)');
  command(c, 'hold'); resolveCycle(c); command(c, 'hold'); resolveCycle(c);
  assert.equal(part(c, 'pulse').integrity, 195, 'then it waits 3 cycles');
  command(c, 'hold'); resolveCycle(c);
  assert.equal(part(c, 'pulse').integrity, 190, 'and runs again');

  const n = fresh();
  n.daemonLv = { snapshot: 26 }; n.daemons = ['snapshot']; // its share grows with its level (5% at lv 1)
  syncServer(n);
  fight(n);
  n.encounter.hardened = 0;
  part(n, 'encryptor').attack = null;
  const pulse = part(n, 'pulse');
  pulse.attack.amount = 60;
  n.encounter.cycle = pulse.attack.due;
  command(n, 'hold'); resolveCycle(n);
  const { daemonN } = await import('./dist/data.mjs');
  assert.equal(n.server.integrity, 100 - 60 + daemonN('snapshot', 26), 'dropped below half, restored its share of your max');
});

test('services are gone (R2): none to install, the commands say so, the world clock still runs', () => {
  const s = fresh();
  assert.deepEqual(Object.keys(SERVICES), [], 'no services left');
  assert.match(command(s, 'install router', 0).at(-1).message, /Services are gone/);
  assert.match(command(s, 'uninstall router', 0).at(-1).message, /Services are gone/);
  assert.match(command(s, 'cancel install', 0).at(-1).message, /Services are gone/);
  assert.equal(s.install, null);
  assert.deepEqual(tickServices(s, 60000).filter((e) => e.type === 'service-done'), [], 'nothing installs');
});

test('saves from before protocols: installed server gear becomes running services, the rest becomes code', () => {
  const old = fresh();
  Object.assign(old, { version: 14 });
  delete old.services; delete old.materials; delete old.install;
  old.stash = [
    { id: 'g1', slot: 'storage', side: 'server', rarity: 'tuned', level: 5, stats: { integrity: 20 }, zeroDay: null, name: 'Tuned Storage' },
    { id: 'g2', slot: 'firewall', side: 'server', rarity: 'stock', level: 5, stats: { reduction: 4 }, zeroDay: null, name: 'Stock Firewall' },
    { id: 'g3', slot: 'module', side: 'server', rarity: 'zeroday', level: 5, stats: { shield: 5 }, zeroDay: 'cron-job', name: 'Cron Job' },
    { id: 'g4', slot: 'deck', side: 'hacker', rarity: 'tuned', level: 5, stats: { damage: 6, crit: 2 }, zeroDay: null, name: 'Tuned Deck' },
  ];
  old.gear = { server: { storage: 'g1', module: 'g3' }, rigs: { breaker: { deck: 'g4' } } };
  old.recipes = ['cron-job'];
  const s = restore(JSON.parse(JSON.stringify(old)));
  assert.deepEqual(s.services, {}, 'v34: the RAID Array went to the wall, the Cron Job became a daemon');
  assert.equal(s.daemonLv.cron, 1, 'a level-1 save: its Cron Job is a level-1 daemon');
  assert.equal(s.materials.kernel, 5, 'the uninstalled Firewall came back as Kernel code');
  assert.equal(s.materials.worm, 12, 'and the RAID Array as what it cost');
  assert.deepEqual(s.recipes, [], 'no blueprints left for services that are gone');
  assert.deepEqual(s.stash.map((x) => x.id), ['g4']);
  assert.equal(s.stash[0].kind, 'protocol');
  assert.equal(s.stash[0].name, 'Tuned Overdrive');
  assert.deepEqual(rigOf(s), ['g4'], 'your rig carries over as loaded protocols');
  assert.equal(s.server.max, 100);
});

test('the old Upgrades come back as running services and a loaded protocol; daemon slots come from server level', () => {
  const old = fresh();
  Object.assign(old, { version: 11, upgrades: { hardening: 2, signal: 1, amplifier: 1, slot: 1 } });
  delete old.stash; delete old.gear; delete old.services; delete old.materials;
  old.server.max = 140; old.server.integrity = 140;
  const s = restore(JSON.parse(JSON.stringify(old)));
  assert.equal(s.upgrades, undefined);
  assert.deepEqual(s.services, {}, 'the RAID Array is the wall\'s now (v34), and the Route Logger went with services (v40)');
  assert.equal(s.server.max, Math.round(100 * power(serverLevel(s))));
  assert.equal(gearStat(s, 'signal'), 10);
  assert.equal(gearStat(s, 'routeBoost'), 0, 'no services: the Route Logger paid back what it cost');
  assert.equal(loaded(s)[0].rarity, 'stock');
  const t = fresh();
  assert.equal(daemonSlots(t), CONFIG.daemonSlots);
  t.hackers = { operator: { level: 9, xp: 0 }, bastion: { level: 30, xp: 0 } };
  assert.equal(daemonSlots(t), CONFIG.daemonSlots + 2, 'your highest class level opens them (15 and 30), whichever class you play');
});

test('blueprints: nothing is buildable at first; each teaches something new; every vault holds one', async () => {
  const { learnBlueprint, knows, knownRecipes } = await import('./dist/combat.mjs');
  const { layoutOf } = await import('./dist/run.mjs');
  const { BLUEPRINTS } = await import('./dist/gear.mjs');
  const s = fresh();
  assert.equal(knownRecipes(s).length, 0);
  learnBlueprint(s);
  // The pool is every kind of recipe: protocol recipes and filter recipes (codebases come their own ways: sockets.mjs).
  const { CRAFTABLE, knowsFilter } = await import('./dist/filters.mjs');
  const all = BLUEPRINTS.length + CRAFTABLE.length;
  for (let i = 1; i < all; i++) learnBlueprint(s);
  assert.ok(BLUEPRINTS.every((id) => knows(s, id)));
  assert.ok(CRAFTABLE.every((k) => knowsFilter(s, k)), 'filter recipes');
  const salvage = s.salvage.length;
  learnBlueprint(s);
  assert.equal(s.salvage.length, salvage + 2, 'one you know already is 2 components');
  assert.ok(s.salvage.slice(-2).every((p) => !/scrap/i.test(p.name)), 'components, not Scrap');
  command(s, 'developer location worm');
  const vault = Object.values(layoutOf(s.locations[0])).find((d) => d.locked);
  assert.ok(vault.files.includes('blueprint.bp'));
});

test('saves from before categories: a protocol keeps its lead stat\'s category, percent power stats turn flat, and loaded ones move into their kind of slot', () => {
  const old = fresh();
  old.version = 17;
  old.stash = [
    { id: 'g1', kind: 'protocol', side: 'hacker', rarity: 'tuned', level: 5, stats: { damage: 6, signal: 10 }, zeroDay: null, name: 'Tuned Overdrive' },
    { id: 'g2', kind: 'protocol', side: 'hacker', rarity: 'stock', level: 5, stats: { reduction: 5 }, zeroDay: null, name: 'Stock Hardening' },
    { id: 'g3', kind: 'protocol', side: 'hacker', rarity: 'stock', level: 5, stats: { reduction: 4 }, zeroDay: null, name: 'Stock Hardening' },
  ];
  old.gear = { rigs: { breaker: ['g2', 'g1', 'g3'] } };
  const s = restore(JSON.parse(JSON.stringify(old)));
  const g1 = s.stash.find((x) => x.id === 'g1');
  assert.deepEqual(Object.keys(g1.stats), ['damage'], 'the defense stat on an offense protocol drops off');
  assert.equal(g1.group, 'exploit', 'and then into the v27 slots');
  assert.ok(Number.isInteger(s.stash.find((x) => x.id === 'g2').stats.reduction), 'Block is a flat number now');
  assert.equal(rigOf(s)[0], 'g1');
  assert.equal(rigOf(s)[1], 'g2', 'defense became the Proxy slot');
  assert.ok(!rigOf(s).includes('g3'), 'a second one has no slot');
});

test('resting: between fights the server repairs 1% of its max every 10 seconds, at half that while an invader is at the wall', () => {
  CONFIG.restRegen = 0.06;
  const s = fresh();
  s.server.integrity = 50;
  for (let i = 0; i < 10; i++) idleRegen(s, 1000);
  assert.equal(s.server.integrity, 51, '1 point every 10 seconds at 100 max');
  s.invasion = { state: 'breach' };
  for (let i = 0; i < 60; i++) idleRegen(s, 1000);
  assert.equal(s.server.integrity, 54, 'a breach halves it');
  s.invasion = null;
  s.encounter = null;
  for (let i = 0; i < 60; i++) idleRegen(s, 1000);
  assert.equal(s.server.integrity, 60);
  CONFIG.restRegen = 0;
});

test('components pay like mana: any for the rest, named ones where a cost asks, a chosen payment is honoured', async () => {
  const { SALVAGE_COSTS, autoPay, payProblem, parsePay } = await import('./dist/salvage.mjs');
  const s = fresh();
  s.salvage = [{ name: 'Pulse Kernel' }, { name: 'Pulse Kernel' }, { name: 'Sentry Lens' }, { name: 'Sentry Lens' }, { name: 'Sentry Lens' }, { name: 'Mask Shard' }];
  const cost = SALVAGE_COSTS.zeroday(5); // 3 any + 2 guard components
  s.salvage.push({ name: 'Pulse Kernel' }, { name: 'Pulse Kernel' });
  assert.deepEqual(autoPay(s, cost), { 'Sentry Lens': 2, 'Pulse Kernel': 3 }, 'the named ones it asks for, then what no recipe names, and it keeps the spare guard component');
  assert.equal(payProblem(s, cost, { 'Pulse Kernel': 3, 'Mask Shard': 2 }), "You don't have 2 Mask Shard.");
  assert.match(payProblem(s, cost, { 'Pulse Kernel': 4, 'Mask Shard': 1 }), /guard component/);
  const mine = parsePay(s, 'sentry-lens:2,pulse-kernel:2,mask-shard:1');
  assert.equal(payProblem(s, cost, mine), null);
});

test('Uplink trace is gone: old saves swap Traceroute for Keepalive and the Tracer daemon for Stall', () => {
  const old = fresh();
  old.loadout.equipped = { infiltrator: ['inject', 'tag', 'traceroute'] };
  delete old.daemonLv;
  old.daemonsOwned = { tracer: 2 }; old.daemons = ['tracer'];
  const s = restore(JSON.parse(JSON.stringify(old)));
  assert.deepEqual(s.loadout.equipped.infiltrator, ['inject', 'tag', 'keepalive']);
  assert.deepEqual(s.daemonLv, { stall: 1 }, 'a Stall, at a level from its version and yours');
  assert.equal(s.daemonsOwned, undefined);
  assert.deepEqual(s.daemons, ['stall']);
});

test('a recipe with a capital in its id compiles (commands are lowercased: compile critDamage)', async () => {
  const { STATS } = await import('./dist/gear.mjs');
  const { PROTOCOL_NAMES, recipeId } = await import('./dist/gear.mjs');
  const ids = Object.keys(STATS).filter((k) => /[A-Z]/.test(k) && PROTOCOL_NAMES[k]);
  assert.ok(ids.length, 'there are camelCase recipes');
  for (const id of ids) {
    const s = fresh();
    s.recipes = [recipeId(id)]; s.server.credits = 1e5; s.salvage = Array.from({ length: 40 }, () => ({ name: 'Scrap', virus: 't', seed: 0 }));
    const n = (s.stash || []).length;
    command(s, `compile ${id}`);
    assert.equal((s.stash || []).length, n + 1, `compile ${id}`);
  }
});

test('compile <recipe> <slot>: you pick the slot the protocol compiles into; Implant opens at level 15', async () => {
  const { groupOf } = await import('./dist/gear.mjs');
  const { craftMarkup } = await import('./dist/view.mjs');
  const s = fresh();
  command(s, 'developer level 5');
  s.server.credits = 100000;
  s.recipes = ['recipe:crit'];
  for (let i = 0; i < 200; i++) s.salvage.push({ name: 'x' });
  for (const slot of ['exploit', 'proxy', 'shell', 'script']) {
    command(s, `compile crit ${slot}`);
    assert.equal(groupOf(s.stash.at(-1)), slot, slot);
    assert.ok(s.stash.at(-1).stats.crit > 0);
  }
  command(s, 'compile precision proxy'); // the recipe's own name works too
  assert.equal(groupOf(s.stash.at(-1)), 'proxy');
  assert.match(command(s, 'compile crit implant').at(-1).message, /Implants compile from level 15/);
  command(s, 'developer level 15');
  command(s, 'compile crit implant');
  assert.equal(groupOf(s.stash.at(-1)), 'implant');
  // The Craft page picks the slot on the recipe, and its button compiles into it.
  const html = craftMarkup(s, { cat: 'protocols', pick: 'crit', slot: 'shell' });
  assert.match(html, /data-craft-slot="shell" aria-pressed="true"/);
  assert.match(html, /data-command="compile crit shell"/);
  assert.match(html, /Precision Shell/);
});
