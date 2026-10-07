// Protocols (you), services (the server) and code: slots, stats, rarities, crits, drops,
// compiling, scrapping, Zero-days, the install queue and save migration.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part, restore, addItem, gearStat, previewDamage, daemonSlots, maxSignal, critChance, loaded, slotCount, rigOf, tickServices, serviceVersion, serviceValue, portCount, portsUsed, syncServer, installBlock, compileCost, idleRegen, missChance, serverLevel } from './dist/combat.mjs';
import { play, connect, sourceOf } from './dist/run.mjs';
import { CONFIG, power } from './dist/data.mjs';
import { STATS, RARITIES, LOOT, BASES, AFFIXES, SLOTS, DECONSTRUCT, uniqueItem, lootOdds, magicFind, COMPILE, STASH_CAP, SERVICES, VERSIONS, PROTOCOL_STATS, protocolSlots, ports, rollItem, seeded, codeOf, codeDrop, vaultCode, serviceCost } from './dist/gear.mjs';

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

const item = (stats, extra = {}) => ({ kind: 'protocol', side: 'hacker', rarity: 'stock', level: 5, stats, zeroDay: null, name: 'Test protocol', ...extra });
const give = (s, stats, extra) => { const it = addItem(s, item(stats, extra)); command(s, 'load ' + it.id); return it; };
const svc = (s, services) => { s.services = { ...services }; syncServer(s); s.server.integrity = s.server.max; return s; };
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
    const rarity = ['scrap', 'stock', 'tuned', 'custom'][i % 4];
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
  }
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

test('uniques: fixed name and stats, scaled up from their own level; drop odds come from time targets', () => {
  CONFIG.powerPerLevel = 0.04;
  const u = { id: 'x', name: 'Test Unique', base: 'weaponized-exploit', level: 5, primary: { damage: 10 }, secondary: { crit: 5 }, downside: { reduction: -1 } };
  const a = uniqueItem(u, 5, seeded(1)), b = uniqueItem(u, 15, seeded(1));
  assert.equal(a.name, 'Test Unique');
  assert.equal(a.rarity, 'zeroday');
  assert.equal(a.unique, 'x');
  assert.equal(a.stats.reduction, -1, 'the downside');
  assert.ok(b.stats.damage > a.stats.damage, 'found later, it is bigger');
  CONFIG.powerPerLevel = 0;
  const o = lootOdds(60);
  assert.ok(Math.abs(o.tuned - 1 / LOOT.minutes.tuned) < 1e-9 && Math.abs(o.custom - 1 / LOOT.minutes.custom) < 1e-9, 'odds per kill from minutes per drop, at 60 kills an hour');
  assert.ok(lootOdds(600).custom < o.custom / 9, 'faster fights, rarer per kill');
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

test('services at home: Hardened Kernel softens hits, Scrubber shields the start, Hot-patcher heals per cycle and very slowly between fights', () => {
  const s = svc(fresh(), { kernel: 3, scrubber: 3, hotpatch: 2 });
  assert.equal(serviceValue(s, 'kernel'), 6);
  assert.equal(serviceValue(s, 'scrubber'), 10, '10% of max Integrity');
  assert.equal(serviceValue(s, 'hotpatch'), 0.6);
  fight(s);
  assert.equal(s.encounter.shield, 10);
  part(s, 'encryptor').attack = null;
  const pulse = part(s, 'pulse');
  pulse.attack.amount = 25;
  s.encounter.cycle = pulse.attack.due;
  command(s, 'hold'); resolveCycle(s);
  assert.equal(s.server.integrity, 100 - (19 - 10), '25 → 19 after 6 Block, then the shield soaks 10');
  command(s, 'hold'); resolveCycle(s);
  assert.equal(s.server.integrity, 92, 'Regen 0.6 a cycle: +1 on the second');
  s.encounter = null;
  assert.equal(idleRegen(s, 60000), false, 'between fights: 0.6 per minute');
  idleRegen(s, 60000);
  assert.equal(s.server.integrity, 93);
});

test('your survival stats count on runs, the server\'s services at home', () => {
  const s = fresh();
  give(s, { reduction: 3 });
  command(s, 'developer location worm');
  Object.assign(s.locations[0], { template: 'relay', quirk: null });
  connect(s, s.locations[0].id);
  play(s, 'cd relay');
  command(s, 'engage');
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
  const s = svc(fresh(), { firewall: 1 });
  s.filters = { held: [{ kind: 'filter', rarity: 'tuned', level: 1, name: 'Decoy Packet Filter', stats: { strength: 1, evasion: 100, sanitize: 100 } }], on: [0] };
  fight(s);
  const pulse = part(s, 'pulse'), enc = part(s, 'encryptor');
  s.encounter.hardened = 0;
  s.encounter.cycle = Math.max(pulse.attack.due, enc.attack.due);
  command(s, 'hold');
  const ev = resolveCycle(s);
  assert.ok(ev.some((e) => e.type === 'evaded'));
  assert.ok(ev.some((e) => /sanitized/.test(e.message)));
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
  give(b, { payload: 6 });
  bare(quiet(fight(b)));
  Object.assign(part(b, 'pulse'), { integrity: 500, max: 500 });
  command(b, 'inject pulse'); resolveCycle(b);
  assert.equal(500 - part(b, 'pulse').integrity, 18, 'Inject 12 + 6');
});

test('Clock Speed ticks cooldowns faster; Leech heals per hit; Stealth delays first attacks', () => {
  const s = fresh();
  s.hackers = { breaker: { level: 18, xp: 0 } };
  give(s, { clock: 100 });
  bare(quiet(fight(s)));
  Object.assign(part(s, 'pulse'), { integrity: 500, max: 500 });
  command(s, 'overload pulse'); resolveCycle(s);
  const plain = fresh(); plain.hackers = { breaker: { level: 18, xp: 0 } };
  bare(quiet(fight(plain))); Object.assign(part(plain, 'pulse'), { integrity: 500, max: 500 });
  command(plain, 'overload pulse'); resolveCycle(plain);
  assert.equal(s.encounter.readyAt.overload, plain.encounter.readyAt.overload - 1, 'a full meter every cycle: one extra tick');
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

test('Counter-intrusion: whatever hits your server takes a hit back', () => {
  const s = svc(fresh(), { counter: 3 });
  bare(fight(s));
  part(s, 'encryptor').attack = null;
  const pulse = part(s, 'pulse');
  s.encounter.cycle = pulse.attack.due;
  command(s, 'hold'); resolveCycle(s);
  assert.equal(pulse.max - pulse.integrity, 6);
});

test('home wins give the family\'s code, and can drop an item at the enemy\'s level', () => {
  const was = LOOT.common;
  LOOT.common = 1; // every kill drops something
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
  LOOT.common = was;
});

test('compile: pick the stat, pay credits and salvage, get a protocol at your level; Build Farm makes it cheaper', () => {
  const s = fresh();
  command(s, 'developer level 3');
  s.server.credits = 1000;
  assert.match(command(s, 'compile crit').at(-1).message, /no protocol recipes/, 'compiling starts locked');
  s.recipes = ['recipe:crit'];
  assert.match(command(s, 'compile damage').at(-1).message, /recipe/, 'only recipes you have');
  assert.match(command(s, 'compile crit').at(-1).message, /salvage/);
  for (let i = 0; i < 10; i++) s.salvage.push({ name: 'x' });
  command(s, 'compile crit');
  const it = s.stash.at(-1);
  assert.equal(it.kind, 'protocol');
  assert.equal(it.level, 3);
  assert.ok(it.stats.crit > 0, 'the stat you asked for');
  assert.match(command(s, 'compile integrity').at(-1).message, /services/, 'server stats come from services');
  assert.match(command(s, 'compile raid').at(-1).message, /service/, 'a service isn\'t compiled');
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
  svc(s, { buildfarm: 3 });
  assert.equal(compileCost(s).credits, Math.round(COMPILE.cost(3).credits * 0.65), '35% off at v3');
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
  play(s, 'cd relay');
  command(s, 'engage');
  finishOne(s);
  play(s, `unlock vault ${loc.password}`);
  play(s, 'cd vault');
  const ls = play(s, 'ls').map((e) => e.message).join('\n');
  assert.match(ls, /kit\.bin/);
  const src = sourceOf(loc);
  assert.match(ls, new RegExp(src + '\\.src'));
  play(s, 'pull kit.bin');
  play(s, 'pull payload.bin');
  play(s, `pull ${src}.src`);
  const before = s.stash.length, worm = s.materials.worm;
  const packed = s.run.pack.filter((p) => p.kind === 'code' && p.material === 'worm').reduce((a, p) => a + p.amount, 0);
  play(s, 'jack out');
  assert.ok(s.stash.length >= before + 1, 'the kit is banked into your stash');
  assert.ok(packed >= vaultCode(loc.level || 1));
  assert.equal(s.materials.worm - worm, packed, 'worm servers give Worm code');
  assert.deepEqual(s.recipes, [src]);
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

test('Cron Job and Snapshot are special services: Cron hits every 3rd cycle, Snapshot restores once below half', () => {
  const c = svc(fresh(), { cron: 3 });
  bare(fight(c));
  for (const p of c.encounter.virus.parts) { p.attack = null; p.integrity = p.max = 200; }
  part(c, 'pulse').attack = { name: 'x', effect: 'damage', amount: 0, interval: 99, due: 99 };
  command(c, 'hold'); resolveCycle(c); command(c, 'hold'); resolveCycle(c);
  assert.equal(part(c, 'pulse').integrity, 200, 'nothing on cycles 1 and 2');
  command(c, 'hold'); resolveCycle(c);
  assert.equal(part(c, 'pulse').integrity, 200 - Math.round(8 * 0.8), 'cycle 3: the cron job fires (8 × 0.8 at v3)');

  const n = svc(fresh(), { snapshot: 3 });
  fight(n);
  n.encounter.hardened = 0;
  part(n, 'encryptor').attack = null;
  const pulse = part(n, 'pulse');
  pulse.attack.amount = 60;
  n.encounter.cycle = pulse.attack.due;
  command(n, 'hold'); resolveCycle(n);
  assert.equal(n.server.integrity, 100 - 60 + 16, 'dropped below half, restored 16%');
});

test('the install queue: code and credits, one at a time, in real time; versions gate on server level', () => {
  const s = fresh();
  assert.equal(portCount(s), 6);
  assert.deepEqual([1, 9, 17, 41, 50].map(ports), [6, 7, 8, 11, 12]);
  assert.match(command(s, 'install raid', 0).at(-1).message, /RAID Array blueprint/, 'every service starts as a blueprint to find');
  s.recipes = ['raid', 'kernel'];
  assert.match(command(s, 'install raid', 0).at(-1).message, /needs 120c \+ 12 Worm \+ 6 salvage/);
  s.materials.worm = 20; s.materials.kernel = 20; s.server.credits = 300;
  assert.match(command(s, 'install raid', 0).at(-1).message, /6 salvage/, 'salvage too');
  command(s, 'developer salvage 12');
  command(s, 'install raid', 0);
  assert.deepEqual({ ...s.install, pay: undefined }, { id: 'raid', v: 1, startedAt: 0, doneAt: VERSIONS[0].minutes * 60000, pay: undefined });
  assert.equal(s.materials.worm, 8);
  assert.equal(s.server.credits, 180);
  assert.equal(s.salvage.length, 6);
  assert.match(command(s, 'install kernel', 1000).at(-1).message, /One install at a time/);
  assert.equal(tickServices(s, 60000).length, 0, 'not yet');
  const done = tickServices(s, VERSIONS[0].minutes * 60000);
  assert.equal(done[0].type, 'service-done');
  assert.equal(serviceVersion(s, 'raid'), 1);
  assert.equal(s.server.max, 105, 'RAID v1: +5% max Integrity');
  assert.equal(s.server.integrity, 105);
  assert.match(installBlock(s, 'raid'), /server level 10/, 'v2 waits for server level 10');
  command(s, 'install kernel', 0);
  command(s, 'cancel install', 0);
  assert.equal(s.install, null);
  assert.equal(s.materials.kernel, 20, 'cancelling refunds everything');
  assert.equal(s.salvage.length, 6, 'salvage too');
  assert.match(installBlock(s, 'cron'), /source/, 'special services need their source');
  command(s, 'uninstall raid');
  assert.equal(serviceVersion(s, 'raid'), 0);
  assert.equal(s.materials.worm, 14, 'half the code back');
  assert.equal(s.server.max, 100);

  const full = fresh();
  command(full, 'developer code 500');
  command(full, 'developer salvage 200');
  command(full, 'developer blueprints');
  full.server.credits = 9999;
  svc(full, { raid: 1, kernel: 1, scrubber: 1, hotpatch: 1, counter: 1, uplink: 1 });
  assert.equal(portsUsed(full), 6);
  assert.match(installBlock(full, 'buildfarm'), /service slots are in use/);
  command(full, 'developer server 25');
  assert.equal(portCount(full), 9);
  command(full, 'install raid', 0);
  assert.equal(full.install.v, 2, 'an upgrade uses no new port');
  command(full, 'developer finish', 0);
  command(full, 'install raid', 0);
  assert.equal(full.install.v, 3);
  assert.deepEqual(serviceCost('raid', 3), { credits: 2000, worm: 100, exploit: 3 });
  fight(full);
  assert.match(command(full, 'install kernel').at(-1).message, /between fights/);
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
  assert.deepEqual(s.services, { raid: 1, cron: 1 });
  assert.equal(s.materials.kernel, 5, 'the uninstalled Firewall came back as Kernel code');
  assert.deepEqual(s.recipes, ['cron', 'raid'], 'plus a blueprint for each service it runs');
  assert.deepEqual(s.stash.map((x) => x.id), ['g4']);
  assert.equal(s.stash[0].kind, 'protocol');
  assert.equal(s.stash[0].name, 'Tuned Overdrive');
  assert.deepEqual(rigOf(s), ['g4'], 'your rig carries over as loaded protocols');
  assert.equal(s.server.max, 105);
});

test('the old Upgrades come back as running services and a loaded protocol; daemon slots come from server level', () => {
  const old = fresh();
  Object.assign(old, { version: 11, upgrades: { hardening: 2, signal: 1, amplifier: 1, slot: 1 } });
  delete old.stash; delete old.gear; delete old.services; delete old.materials;
  old.server.max = 140; old.server.integrity = 140;
  const s = restore(JSON.parse(JSON.stringify(old)));
  assert.equal(s.upgrades, undefined);
  assert.deepEqual(s.services, { raid: 1, uplink: 1 });
  assert.equal(s.server.max - Math.round(100 * power(serverLevel(s))), 5, 'RAID v1');
  assert.equal(gearStat(s, 'signal'), 10);
  assert.equal(gearStat(s, 'routeBoost'), 25, 'Route Logger v1: route files trace 25% further');
  assert.equal(loaded(s)[0].rarity, 'stock');
  const t = fresh();
  assert.equal(daemonSlots(t), CONFIG.daemonSlots);
  command(t, 'developer server 20');
  assert.equal(daemonSlots(t), CONFIG.daemonSlots + 2);
});

test('blueprints: nothing is buildable at first; each teaches something new; every vault holds one', async () => {
  const { learnBlueprint, knows, knownRecipes } = await import('./dist/combat.mjs');
  const { layoutOf } = await import('./dist/run.mjs');
  const { BLUEPRINTS } = await import('./dist/gear.mjs');
  const s = fresh();
  assert.match(installBlock(s, 'firewall'), /blueprint/);
  assert.equal(knownRecipes(s).length, 0);
  learnBlueprint(s);
  // The pool is every kind of recipe: protocol recipes and services, filter recipes, plans.
  const { CRAFTABLE, knowsFilter } = await import('./dist/filters.mjs');
  const { OUTPOST, knowsPlan } = await import('./dist/outpost.mjs');
  const all = BLUEPRINTS.length + CRAFTABLE.length + Object.keys(OUTPOST.plans).length;
  for (let i = 1; i < all; i++) learnBlueprint(s);
  assert.ok(BLUEPRINTS.every((id) => knows(s, id)));
  assert.ok(CRAFTABLE.every((k) => knowsFilter(s, k)), 'filter recipes');
  assert.ok(Object.keys(OUTPOST.plans).every((k) => knowsPlan(s, k)), 'plans');
  const salvage = s.salvage.length;
  learnBlueprint(s);
  assert.equal(s.salvage.length, salvage + 2, 'one you know already is salvage');
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

test('resting: between fights the server repairs 1% of its max every 10 seconds, but not while an invader is at the wall', () => {
  CONFIG.restRegen = 0.06;
  const s = fresh();
  s.server.integrity = 50;
  for (let i = 0; i < 10; i++) idleRegen(s, 1000);
  assert.equal(s.server.integrity, 51, '1 point every 10 seconds at 100 max');
  s.invasion = { state: 'breach' };
  for (let i = 0; i < 60; i++) idleRegen(s, 1000);
  assert.equal(s.server.integrity, 51, 'a breach stops it');
  s.invasion = null;
  s.encounter = null;
  for (let i = 0; i < 60; i++) idleRegen(s, 1000);
  assert.equal(s.server.integrity, 57);
  CONFIG.restRegen = 0;
});

test('salvage pays like mana: generic pieces for the rest, a chosen payment is honoured', async () => {
  const { SALVAGE_COSTS, autoPay, payProblem, parsePay } = await import('./dist/salvage.mjs');
  const s = fresh();
  s.salvage = [{ name: 'Scrap' }, { name: 'Scrap' }, { name: 'Signal Key' }, { name: 'Signal Key' }, { name: 'Mask Shard' }];
  const cost = SALVAGE_COSTS['harvester-tap'](); // 5 any + a Signal Key
  s.salvage.push({ name: 'Scrap' }, { name: 'Scrap' });
  assert.deepEqual(autoPay(s, cost), { 'Signal Key': 1, Scrap: 4, 'Mask Shard': 1 }, 'plain scrap first, and it keeps the spare component');
  assert.equal(payProblem(s, cost, { Scrap: 4, 'Mask Shard': 2 }), "You don't have 2 Mask Shard.");
  assert.match(payProblem(s, cost, { Scrap: 4, 'Mask Shard': 1 }), /Signal Key/);
  const mine = parsePay(s, 'signal-key:2,scrap:4,mask-shard:0');
  assert.equal(payProblem(s, cost, mine), null);
});

test('buyout: finish an install now for credits, 3x its cost at the start and less as time runs down', async () => {
  const { installBuyout, BUYOUT } = await import('./dist/combat.mjs');
  const { outpostBuyout, OUTPOST } = await import('./dist/outpost.mjs');
  const { VERSIONS } = await import('./dist/gear.mjs');
  const s = fresh();
  s.install = { id: 'firewall', v: 1, startedAt: 0, doneAt: 600000, pay: {} };
  const full = installBuyout(s, 0), half = installBuyout(s, 300000);
  assert.equal(full, Math.max(BUYOUT.min, 3 * VERSIONS[0].credits));
  assert.ok(half <= full && half >= BUYOUT.min);
  s.server.credits = full + 5;
  command(s, 'buyout', 0);
  assert.equal(s.install, null);
  assert.equal(s.services.firewall, 1);
  assert.equal(s.server.credits, 5);
  // Outposts: a lockdown ends, a slot reset is skipped.
  const loc = { id: 'x', name: 'X', outpost: { lockdown: { left: OUTPOST.lockdownMs / 2 } } };
  assert.equal(outpostBuyout(loc, 0).what, 'lockdown');
  assert.equal(outpostBuyout({ outpost: {}, build: { id: 'siphon', startedAt: 0, doneAt: 1000 } }, 0).what, 'build');
  assert.equal(outpostBuyout({ outpost: {} }, 0), null);
});

test('Uplink trace is gone: old saves swap Traceroute for Keepalive and the Tracer daemon for Stall', () => {
  const old = fresh();
  old.loadout.equipped = { infiltrator: ['inject', 'tag', 'traceroute'] };
  old.daemonsOwned = { tracer: 2 }; old.daemons = ['tracer'];
  const s = restore(JSON.parse(JSON.stringify(old)));
  assert.deepEqual(s.loadout.equipped.infiltrator, ['inject', 'tag', 'keepalive']);
  assert.deepEqual(s.daemonsOwned, { stall: 2 });
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
