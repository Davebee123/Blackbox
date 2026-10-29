// The deep uniques: Batch 1 of the loot plan (docs/loot-plan.md), 30 for The Sink (levels 39-44) and 30 for Bedrock
// (45-50). Their data (name, slot, level, source, lean), what each new effect kind does in a fight, and where they drop:
// a floor's lair boss, rare spawns, vaults, threads and puzzle boards, strain kills, crew bosses. A bigger pool, never
// more drops: each source keeps its own odds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part, addItem, loaded, hooks, UNIQUES, gearStat, maxSignal, damageMultiplier, hit, heal, takeDamage, takenMult, cooldownOf, timersHidden, fxOn, fxPct, rollDrop, setBonusCount, puzzleUnique, floorUniques, strainTrophies, WORLD_SOURCES, addLocation, finish, hackerLevel, critChance } from './dist/combat.mjs';
import { uniqueItem, seeded, BASES, STATS, LOOT } from './dist/gear.mjs';
import { CONFIG, BOSS_LOOT, ABILITIES, defaultSub } from './dist/data.mjs';
import { checkItems, fxText, fxList } from './dist/content.mjs';
import ITEMS from './dist/content/items.mjs';

CONFIG.baseCrit = 0; CONFIG.enemyCrit = 0; CONFIG.misses = false;

// The plan's two tables: id, name, slot, level, source (kind, floor), lean.
const SINK = [
  ['seawall', 'Seawall', 'proxy', 39, 'lair', 7, 'bastion'], ['undertow', 'Undertow', 'exploit', 39, 'rare', 7, null], ['drain-plug', 'Drain Plug', 'shell', 39, 'vault', 7, 'bastion'],
  ['backwash', 'Backwash', 'script', 40, 'lair', 7, 'operator'], ['siltstone', 'Siltstone', 'implant', 40, 'vault', 7, null], ['low-tide', 'Low Tide', 'proxy', 40, 'thread', 7, 'infiltrator'],
  ['brine', 'Brine', 'script', 40, 'rare', 7, null], ['sump-pump', 'Sump Pump', 'shell', 41, 'strain', null, 'bastion'], ['floodgate', 'Floodgate', 'exploit', 41, 'lair', 7, 'breaker'],
  ['brackish', 'Brackish', 'script', 41, 'puzzle', 7, 'infiltrator'], ['mooring', 'Mooring', 'implant', 41, 'rare', 7, null], ['depth-gauge', 'Depth Gauge', 'shell', 41, 'thread', 7, null],
  ['riptide', 'Riptide', 'proxy', 42, 'lair', 7, 'operator', 'GOLDEN PARACHUTE'], ['pressure-hull', 'Pressure Hull', 'shell', 42, 'vault', 7, 'bastion'], ['ballast', 'Ballast', 'implant', 42, 'vault', 7, 'breaker'],
  ['deepwater', 'Deepwater', 'exploit', 42, 'rare', 7, null], ['silt-map', 'Silt Map', 'script', 42, 'thread', 7, null], ['bilge', 'Bilge', 'proxy', 43, 'strain', null, 'infiltrator'],
  ['anchor-chain', 'Anchor Chain', 'implant', 43, 'lair', 7, 'bastion'], ['wake', 'Wake', 'exploit', 43, 'raid', null, null], ['ebb', 'Ebb', 'script', 43, 'puzzle', 7, 'operator'],
  ['flotsam', 'Flotsam', 'shell', 43, 'rare', 7, null], ['outfall', 'Outfall', 'exploit', 43, 'lair', 7, null, 'GOLDEN PARACHUTE'], ['pumphouse', 'Pumphouse', 'proxy', 44, 'lair', 7, 'breaker', 'GOLDEN PARACHUTE'],
  ['sounding-line', 'Sounding Line', 'implant', 44, 'thread', 7, 'infiltrator'], ['cofferdam', 'Cofferdam', 'shell', 44, 'vault', 7, 'bastion'], ['siphon-tube', 'Siphon Tube', 'script', 44, 'strain', null, null],
  ['spillway', 'Spillway', 'exploit', 44, 'lair', 7, 'breaker'], ['turbidity', 'Turbidity', 'proxy', 44, 'rare', 7, 'infiltrator'], ['weir', 'Weir', 'implant', 44, 'vault', 7, 'operator'],
];
const BEDROCK = [
  ['post-code', 'POST Code', 'exploit', 45, 'rare', 8, null], ['bootstrap', 'Bootstrap', 'script', 45, 'lair', 8, null, 'flash ranks'], ['bedframe', 'Bedframe', 'shell', 45, 'vault', 8, 'bastion'],
  ['init-vector', 'Init Vector', 'implant', 45, 'lair', 8, null, 'INIT'], ['bitrot-ward', 'Bitrot Ward', 'proxy', 45, 'strain', null, 'bastion'], ['firmware', 'Firmware', 'implant', 46, 'lair', 8, null, 'flash ranks'],
  ['read-only', 'Read-Only', 'shell', 46, 'lair', 8, 'bastion'], ['watchdog-timer', 'Watchdog Timer', 'script', 46, 'puzzle', 8, 'operator'], ['fuse-map', 'Fuse Map', 'exploit', 46, 'lair', 8, 'breaker', 'Bedrock bosses'],
  ['burn-in', 'Burn-In', 'proxy', 46, 'rare', 8, 'infiltrator'], ['bit-flip', 'Bit Flip', 'exploit', 47, 'puzzle', 8, 'infiltrator'], ['bus-fault', 'Bus Fault', 'implant', 47, 'vault', 8, 'operator'],
  ['brownout', 'Brownout', 'shell', 47, 'thread', 8, null], ['golden-image', 'Golden Image', 'script', 47, 'lair', 8, null, 'flash ranks'], ['bedrock-seal', 'Bedrock Seal', 'proxy', 47, 'lair', 8, 'bastion', 'INIT'],
  ['microcode', 'Microcode', 'implant', 48, 'strain', null, null], ['last-known-good', 'Last Known Good', 'script', 48, 'lair', 8, null, 'Bedrock bosses'], ['cold-iron', 'Cold Iron', 'shell', 48, 'vault', 8, 'bastion'],
  ['wire-wrap', 'Wire Wrap', 'exploit', 48, 'lair', 8, 'breaker'], ['dead-reckoning', 'Dead Reckoning', 'proxy', 48, 'thread', 8, 'infiltrator'], ['ground-plane', 'Ground Plane', 'implant', 49, 'rare', 8, null],
  ['clock-tree', 'Clock Tree', 'script', 49, 'puzzle', 8, null], ['quarry', 'Quarry', 'exploit', 49, 'lair', 8, null, 'Bedrock bosses'], ['strata', 'Strata', 'shell', 49, 'vault', 8, 'bastion'],
  ['load-order', 'Load Order', 'script', 49, 'strain', null, 'operator'], ['undervolt', 'Undervolt', 'proxy', 49, 'rare', 8, 'breaker'], ['keystone', 'Keystone', 'implant', 50, 'lair', 8, null, 'INIT'],
  ['signal-floor', 'Signal Floor', 'proxy', 50, 'lair', 8, null, 'flash ranks'], ['warm-reset', 'Warm Reset', 'shell', 50, 'lair', 8, 'bastion', 'Bedrock bosses'], ['root-of-trust', 'Root of Trust', 'exploit', 50, 'lair', 8, null, 'INIT'],
];
const ALL = [...SINK, ...BEDROCK];

// ---------- fixtures ----------
const L = 50;
const vet = (cls = 'breaker', opts = {}) => { const s = fresh(); s.hackers = { [cls]: { level: opts.level || L, xp: 0 } }; s.loadout.archetype = cls; s.loadout.sub = { [cls]: opts.sub || defaultSub(cls) }; /* a subclass picked: the one named, else the old-edge one */ if (opts.kit) s.loadout.devKit = { talents: [] }; return s; };
const wear = (s, id) => { const it = addItem(s, uniqueItem(UNIQUES[id], UNIQUES[id].level, seeded(1))); command(s, 'load ' + it.id); assert.ok(loaded(s).some((x) => x.id === it.id), `${id} loaded`); return it; };
// A fight with no tells and nothing due: the test sets what lands, and when. run: on a run (your Signal, your rig's Block).
function fight(s, { run = true, hp = 1000, level = L } = {}) {
  if (run) s.run = { loc: 'x', cwd: '/', integrity: hp, max: hp, pack: [], visited: ['/'] };
  selectEncounter(s, 'cryptjack', 7, { level, mutation: null, ...(run ? { mode: 'run' } : {}) });
  command(s, 'engage');
  const e = s.encounter;
  e.virus.tells = null; e.hardened = 0;
  for (const p of e.virus.parts) if (p.attack) p.attack.due = 999;
  return e;
}
const pulse = (s) => part(s, 'pulse');
// One attack from the Pulse Node this cycle, of this size: what it took from your Signal (the hit's own number, so a
// Regen tick in the same cycle doesn't count).
function landed(s, amount) {
  const e = s.encounter, p = pulse(s), mark = s.serial;
  Object.assign(p.attack, { amount, due: e.cycle, interval: 999 });
  command(s, 'hold'); resolveCycle(s);
  return s.logs.filter((x) => x.id > mark && x.type === 'server-hit' && x.source === 'pulse').reduce((n, x) => n + x.amount, 0);
}
const ratio = (a, b) => Math.round((a / b) * 1000) / 1000;

// ---------- the data ----------
test('Batch 1: all 60 uniques, each with the plan\'s name, slot, level, source and lean, an effect, stats and a line of flavour', () => {
  assert.deepEqual(checkItems(ITEMS, BASES, STATS).filter((x) => x.bad).map((x) => x.msg), []);
  assert.equal(ALL.length, 60);
  for (const [id, name, slot, level, kind, floor, lean, planned] of ALL) {
    const u = UNIQUES[id];
    assert.ok(u, id);
    assert.equal(u.name, name);
    assert.equal(BASES[u.base].slot, slot, `${name}: slot`);
    assert.equal(u.level, level, `${name}: level`);
    assert.equal(u.lean || null, lean, `${name}: lean`);
    assert.equal(u.sources.length, 1);
    const src = u.sources[0];
    assert.equal(src.kind, kind, `${name}: source`);
    assert.equal(src.floor || null, floor, `${name}: floor`);
    assert.equal(src.planned || null, planned || null, `${name}: the source it moves to once built`);
    assert.ok(fxList(u).length && fxText(fxList(u)), `${name}: a rule`);
    assert.ok(u.flavour && !/break.?in|keyhole|breach|way in|intru/i.test(u.flavour), `${name}: flavour`);
    for (const part of ['primary', 'secondary']) for (const [k, v] of Object.entries(u[part] || {})) for (const x of [].concat(v)) assert.ok(Number.isInteger(x), `${name}: whole numbers (${k})`);
    // A sidegrade: its slot's best base at its level, a little more in Bedrock, never far past it.
    const it = uniqueItem({ ...u, secondary: {} }, level, seeded(3));
    const main = slot === 'exploit' ? 'damage' : 'signal';
    const base = uniqueItem({ ...u, primary: {}, secondary: {}, downside: {} }, level, seeded(3)).stats[main];
    assert.ok(it.stats[main] >= base * 0.95 && it.stats[main] <= base * (level >= 45 ? 1.25 : 1.1), `${name}: ${it.stats[main]} against a base's ${base}`);
  }
  // No rule names a virus, a gene, a guard or a boss.
  const words = /cryptjack|keylogger|hashrat|tracer|bouncer|sentinel|watchdog guard|resident|relay-king|golden parachute|\binit\b/i;
  for (const [id] of ALL) assert.ok(!words.test(fxText(fxList(UNIQUES[id]))), `${id}: a general rule`);
  // The leans as the plan counts them: Sink 11 any, 6 Bastion, 4 Breaker, 5 Infiltrator, 4 Operator; Bedrock 14, 7, 3, 3, 3.
  const leans = (xs) => ['', 'bastion', 'breaker', 'infiltrator', 'operator'].map((c) => xs.filter((x) => (x[6] || '') === c).length);
  assert.deepEqual(leans(SINK), [11, 6, 4, 5, 4]);
  assert.deepEqual(leans(BEDROCK), [14, 7, 3, 3, 3]);
});

// ---------- stats while a condition holds ----------
test('stat+ and stat%: Siltstone\'s Block for each ◆, Depth Gauge\'s Regen below half, Pressure Hull\'s Block behind a shield, Siphon Tube\'s Leech, Signal Floor\'s Regen', () => {
  const t = vet();
  for (const id of ['siltstone', 'pressure-hull']) wear(t, id);
  const e = fight(t);
  const block = gearStat(t, 'reduction', 'hacker');
  e.chits = 2;
  assert.equal(gearStat(t, 'reduction', 'hacker'), block + 2, 'Siltstone: +1 Block a ◆');
  e.chits = 0;
  e.shield = 5;
  assert.equal(gearStat(t, 'reduction', 'hacker'), Math.round(block * 1.25), 'Pressure Hull: Block 25% stronger behind a shield');
  const s = vet();
  for (const id of ['depth-gauge', 'siphon-tube', 'signal-floor']) wear(s, id);
  fight(s);
  const regen = gearStat(s, 'regen', 'hacker'), leech = gearStat(s, 'leech', 'hacker');
  s.run.integrity = Math.floor(s.run.max * 0.4); // below half
  assert.equal(gearStat(s, 'regen', 'hacker'), regen + 4, 'Depth Gauge: +4 Regen below half');
  assert.equal(gearStat(s, 'leech', 'hacker'), Math.round(leech * 1.5), 'Siphon Tube: Leech half again below half');
  s.run.integrity = Math.floor(s.run.max * 0.2); // below 25%
  assert.equal(gearStat(s, 'regen', 'hacker'), (regen + 4) * 2, 'Signal Floor: Regen doubles below 25%');
});

test('max Signal% and the plain stat rules: Bedframe, Firmware, Flotsam and Golden Image, in a fight or out of one', () => {
  const s = vet(), base = maxSignal(s);
  const bed = wear(s, 'bedframe');
  assert.equal(maxSignal(s), Math.round((base + bed.stats.signal) * 1.12), 'Bedframe: 12% more max Signal, all of it');
  const t = vet(), was = { clock: gearStat(t, 'clock'), signal: maxSignal(t) };
  const fw = wear(t, 'firmware');
  assert.equal(gearStat(t, 'clock'), was.clock + 4, 'Firmware: +4% Clock Speed');
  assert.equal(maxSignal(t), Math.round((was.signal + fw.stats.signal) * 1.04), 'Firmware: +4% max Signal');
  fight(t);
  const plain = vet(); fight(plain);
  assert.equal(ratio(damageMultiplier(t, pulse(t), { mine: true }), damageMultiplier(plain, pulse(plain), { mine: true })), 1.04, 'Firmware: +4% damage');
  const u = vet(), sc = gearStat(u, 'scavenge');
  wear(u, 'flotsam'); wear(u, 'golden-image');
  assert.equal(gearStat(u, 'scavenge'), sc + 20, 'Flotsam and Golden Image: +10% Scavenge each, at home too');
  assert.equal(fxPct(u, 'cache%'), 10, 'Golden Image: caches pay 10% more credits');
  assert.equal(fxText(fxList(UNIQUES.flotsam)), 'Adds 10% Scavenge and 2 Regen.');
});

// ---------- heals and the hits you take ----------
test('heal%: Sump Pump\'s 10% below half and Bedframe\'s 5%, on heals and on Regen', () => {
  const s = vet(); wear(s, 'sump-pump');
  fight(s);
  s.run.integrity = 900; heal(s, 50, 'test');
  assert.equal(s.run.integrity, 950, 'above half: as cast');
  s.run.integrity = 100; heal(s, 50, 'test');
  assert.equal(s.run.integrity, 155, 'below half: 10% larger');
  const t = vet(); wear(t, 'bedframe'); fight(t);
  t.run.integrity = 100; heal(t, 100, 'test');
  assert.equal(t.run.integrity, 205, 'Bedframe: 5% larger');
});

test('taken%: Brownout below 25%, Ballast at full Momentum, Cofferdam behind a shield, Strata by what you are missing', () => {
  const s = vet(); wear(s, 'brownout'); fight(s);
  const b = gearStat(s, 'reduction', 'hacker');
  s.run.integrity = 900;
  assert.equal(takeDamage(s, 200, null, 'test'), 200 - b, 'Brownout: nothing above 25%');
  s.run.integrity = 240;
  assert.equal(takeDamage(s, 200, null, 'test'), 170 - b, 'Brownout: 15% less below 25%');
  const t = vet(); wear(t, 'ballast'); const e = fight(t), bt = gearStat(t, 'reduction', 'hacker');
  e.momentum = { stacks: 2, until: e.cycle + 2 };
  assert.equal(takeDamage(t, 200, null, 'test'), 200 - bt, 'Ballast: not before Momentum is full');
  e.momentum = { stacks: 3, until: e.cycle + 2 };
  assert.equal(takeDamage(t, 200, null, 'test'), 188 - bt, 'Ballast: 6% less at full Momentum (3 stacks, 5 under Redline)');
  const u = vet(); wear(u, 'cofferdam'); const f = fight(u), bu = gearStat(u, 'reduction', 'hacker');
  f.shield = 1;
  assert.equal(takeDamage(u, 200, null, 'test'), 190 - bu - 1, 'Cofferdam: 5% less while a shield holds');
  assert.equal(takeDamage(u, 200, null, 'test'), 200 - bu, 'and nothing once it is gone');
  const v = vet(); wear(v, 'strata'); fight(v);
  const bv = gearStat(v, 'reduction', 'hacker');
  v.run.integrity = 800;
  assert.equal(takeDamage(v, 200, null, 'test'), 192 - bv, 'Strata: 2% for each 10% missing');
  v.run.integrity = 300;
  assert.equal(takeDamage(v, 200, null, 'test'), 180 - bv, 'Strata: up to 10%');
});

test('one hit at a time: Drain Plug halves the first big one, Read-Only cuts the one that takes you below half, Mooring caps every one, Ground Plane stops crits', () => {
  const s = vet(); wear(s, 'drain-plug'); fight(s);
  const b = gearStat(s, 'reduction', 'hacker');
  assert.equal(landed(s, 100), 100 - b, 'a small hit (10%): untouched, and it is not spent');
  assert.equal(landed(s, 300), Math.max(150 - b, 75), 'the first hit over 20% of your max: halved');
  assert.equal(landed(s, 300), 300 - b, 'once a fight');
  const t = vet(); wear(t, 'read-only'); fight(t);
  const bt = gearStat(t, 'reduction', 'hacker');
  assert.equal(landed(t, 200), 200 - bt, 'it stays above half: untouched');
  assert.equal(landed(t, 400), Math.round(400 * 0.6) - bt, 'the hit that takes you below half: 40% less');
  t.run.integrity = 1000;
  assert.equal(landed(t, 600), 600 - bt, 'once a fight');
  const u = vet(); wear(u, 'mooring'); fight(u);
  assert.equal(landed(u, 600), 350 - gearStat(u, 'reduction', 'hacker'), 'Mooring: no hit takes more than 35% of your max');
  const v = vet(); wear(v, 'ground-plane'); const e = fight(v);
  e.virus.crit = 1;
  const plain = vet(); const f = fight(plain); f.virus.crit = 1;
  assert.equal(landed(v, 100), 100 - gearStat(v, 'reduction', 'hacker'), 'Ground Plane: no critical strikes on you');
  assert.equal(landed(plain, 100), 150 - gearStat(plain, 'reduction', 'hacker'), 'without it, a crit lands at ×1.5');
});

test('Seawall stacks Block for the fight as your Block meets hits; Weir\'s helper takes the first hit; Last Known Good rewinds you once', () => {
  const s = vet(); wear(s, 'seawall'); fight(s);
  const b = gearStat(s, 'reduction', 'hacker');
  for (let k = 1; k <= 7; k++) { landed(s, 50); assert.equal(gearStat(s, 'reduction', 'hacker'), b + Math.min(5, k)); }
  const t = vet(); wear(t, 'weir'); const e = fight(t);
  assert.ok(landed(t, 100) > 0, 'no helper out: it lands');
  e.helpers.push({ target: 'encryptor', damage: 1, left: 9 });
  assert.equal(landed(t, 100), 0, 'a helper takes it');
  assert.equal(e.helpers.length, 0, 'and expires');
  e.helpers.push({ target: 'encryptor', damage: 1, left: 9 });
  assert.ok(landed(t, 100) > 0, 'once a fight');
  const u = vet(); wear(u, 'last-known-good'); fight(u);
  for (let k = 0; k < 3; k++) { command(u, 'hold'); resolveCycle(u); }
  u.run.integrity = 700;
  command(u, 'hold'); resolveCycle(u);
  const before = u.run.integrity, hurt = takeDamage(u, 600, null, 'test'); // about 700 to under 200
  assert.ok(hurt > 500);
  assert.equal(u.run.integrity, before - hurt + 300, 'back toward the Signal of 3 cycles ago, at most 30% of your max');
  const was = u.run.integrity;
  takeDamage(u, was - 50, null, 'test');
  assert.ok(u.run.integrity < 200, 'once a fight');
});

test('shields: Warm Reset starts you behind 8% of your max, Bedrock Seal\'s shields absorb 15% more, Anchor Chain makes the next one larger', () => {
  const s = vet(); wear(s, 'warm-reset');
  const e = fight(s);
  assert.equal(e.shield, Math.round(s.run.max * 0.08));
  const t = vet(); wear(t, 'bedrock-seal'); const f = fight(t), b = gearStat(t, 'reduction', 'hacker');
  f.shield = 100;
  assert.equal(takeDamage(t, 400, null, 'test'), 400 - b - 115, '100 shield takes 115');
  assert.equal(f.shield, 0);
  const u = vet('bastion', { kit: true }); wear(u, 'anchor-chain'); const g = fight(u);
  command(u, 'firewall'); resolveCycle(u);
  const plain = g.shield;
  g.shield = 0; g.readyAt = {};
  landed(u, 50);
  command(u, 'firewall'); resolveCycle(u);
  assert.equal(g.shield, plain + Math.round(plain * 0.1), 'after a hit, the next shield is 10% larger');
  g.shield = 0; g.readyAt = {};
  command(u, 'firewall'); resolveCycle(u);
  assert.equal(g.shield, plain, 'and only the next one');
});

test('Cold Iron: Block takes its full amount off damage over time on you', () => {
  const s = vet(); wear(s, 'cold-iron'); fight(s);
  const b = gearStat(s, 'reduction', 'hacker');
  assert.ok(b >= 3);
  assert.equal(takeDamage(s, b + 1, null, 'a tick', { dot: true }), 1, 'a tick of damage over time: all of your Block off it');
  assert.equal(takeDamage(s, b + 1, null, 'a hit'), Math.max(Math.ceil((b + 1) / 2), 1), 'a hit: never under half, as ever');
  const t = vet(); fight(t);
  const bt = gearStat(t, 'reduction', 'hacker');
  assert.equal(takeDamage(t, 2 * bt + 2, null, 'a tick', { dot: true }), Math.max(Math.ceil((2 * bt + 2) / 2), 2 * bt + 2 - bt), 'without it, a tick is a hit');
});

// ---------- the hits you land ----------
// The damage multiplier with a unique against the same fight without it (a unique's own stats never move it).
function against(id, set = () => {}, opts = { mine: true }, cls = 'breaker') {
  const s = vet(cls); wear(s, id); fight(s);
  const t = vet(cls); fight(t);
  set(s); set(t);
  return ratio(damageMultiplier(s, pulse(s), opts), damageMultiplier(t, pulse(t), opts));
}
test('damage% on a condition: Undertow, Brine, Quarry, Outfall, Wake (each crewmate) and Keystone (each set bonus)', () => {
  assert.equal(against('undertow'), 1, 'Undertow: not on a part that did not attack last cycle');
  assert.equal(against('undertow', (s) => { pulse(s).lastLanded = s.encounter.cycle - 1; }), 1.1);
  assert.equal(against('brine', (s) => { pulse(s).integrity = 1; }), 1, 'Brine: not on a part with less left than another');
  assert.equal(against('brine', (s) => { part(s, 'encryptor').integrity = 1; }), 1.08);
  assert.equal(against('quarry'), 1, 'Quarry: not while another part stands');
  assert.equal(against('quarry', (s) => { part(s, 'encryptor').integrity = 0; }), 1.15);
  assert.equal(against('outfall', (s) => { s.encounter.commanding = { id: 'crack' }; s.encounter.metrics.actions.crack = 1; }), 1.1, "Outfall: a skill's first use");
  assert.equal(against('outfall', (s) => { s.encounter.commanding = { id: 'crack' }; s.encounter.metrics.actions.crack = 2; }), 1, 'and not its second');
  const was = hooks.crewAllies;
  try {
    hooks.crewAllies = () => [{ who: 'a', st: {} }, { who: 'b', st: {} }];
    assert.equal(against('wake'), 1.1, 'Wake: 5% for each crewmate');
  } finally { hooks.crewAllies = was; }
  const s = vet(); wear(s, 'keystone'); wear(s, 'kestrel-badge'); wear(s, 'kestrel-token'); fight(s);
  const t = vet(); wear(t, 'kestrel-badge'); wear(t, 'kestrel-token'); fight(t);
  assert.ok(setBonusCount(s) >= 1, 'a set bonus is open');
  assert.equal(ratio(damageMultiplier(s, pulse(s), { mine: true }), damageMultiplier(t, pulse(t), { mine: true })), ratio(1 + 0.03 * setBonusCount(s), 1), 'Keystone: 3% for each set bonus (sets.mjs activeSets)');
});

test('burns or helpers alone: Brackish on a part below half, Riptide on a Jammed part', () => {
  assert.equal(against('brackish', (s) => { pulse(s).integrity = 1; }, { dot: true }), 1.1, 'Brackish: a burn tick on a part below half');
  assert.equal(against('brackish', (s) => { pulse(s).integrity = 1; }, { dot: true, src: 'helper' }), 1, "and not a helper's hit");
  assert.equal(against('brackish', () => {}, { dot: true }), 1, 'nor on a part above half');
  assert.equal(against('riptide', (s) => { pulse(s).jammedUntil = s.encounter.cycle; }, { dot: true, src: 'helper' }), 1.08, 'Riptide: a helper on a Jammed part');
  assert.equal(against('riptide', (s) => { pulse(s).jammedUntil = s.encounter.cycle; }, { dot: true }), 1, 'not a burn');
});

test("critical strikes: Deepwater on armored parts, Bit Flip's every fourth, POST Code's first skill, Root of Trust heals", () => {
  const s = vet(); wear(s, 'deepwater'); fight(s);
  const p = pulse(s);
  const strike = (q) => { q.armor = 0; q.integrity = q.max = 100000; return hit(s, q, 100, { mine: true, crit: true }).dealt; };
  const armored = strike(p);
  p.maxArmor = 0;
  const bare = strike(p);
  assert.equal(armored, Math.floor(bare * 1.1), 'Deepwater: 10% more on a part that wears ◆');
  const t = vet(); wear(t, 'bit-flip'); fight(t);
  const q = pulse(t);
  const hits = [1, 2, 3, 4, 5].map(() => { q.armor = 0; q.integrity = q.max = 100000; return hit(t, q, 100, { mine: true, crit: true }).dealt; });
  assert.equal(new Set([hits[0], hits[1], hits[2], hits[4]]).size, 1);
  assert.ok(hits[3] > hits[0] * 1.2, `Bit Flip: the fourth crit deals its bonus twice (${hits})`);
  const u = vet(); wear(u, 'post-code').stats.crit = 0; const e = fight(u); // no rolled crits: only the forced one
  for (const x of e.virus.parts) Object.assign(x, { armor: 0, integrity: 100000, max: 100000 });
  const crits = () => { const mark = u.serial; command(u, 'spike pulse'); resolveCycle(u); return u.logs.filter((x) => x.id > mark && x.type === 'damage' && x.target === 'pulse' && !x.src).map((x) => x.crit); };
  assert.deepEqual(crits(), [true], 'POST Code: your first damaging skill crits');
  assert.deepEqual(crits(), [false], 'only the first');
  const v = vet(); wear(v, 'root-of-trust'); fight(v);
  v.run.integrity = 500;
  const r = pulse(v); r.armor = 0; r.integrity = r.max = 100000;
  hit(v, r, 100, { mine: true, crit: true });
  assert.equal(v.run.integrity, 500 + Math.round(v.run.max * 0.02), 'Root of Trust: 2% of your max on a crit');
});

const power50 = () => 1 + CONFIG.powerPerLevel * (L - 1);
test('Dead Reckoning goes through ◆ on its first hit on each part; Spillway carries the leftover of a breaking hit', () => {
  const s = vet(); wear(s, 'dead-reckoning'); fight(s);
  const p = pulse(s);
  p.integrity = p.max = 100000;
  const a0 = p.armor;
  const r1 = hit(s, p, 100, { mine: true });
  assert.ok(r1.dealt > 0 && p.armor === a0, 'the first hit: through its ◆');
  const r2 = hit(s, p, 100, { mine: true });
  assert.ok(!r2.dealt && p.armor === a0 - 1, 'the next breaks a ◆ as usual');
  const t = vet('operator'); wear(t, 'spillway').stats.crit = 0; fight(t);
  const q = pulse(t), next = part(t, 'encryptor');
  q.armor = 0; q.integrity = 1;
  next.integrity = next.max = 100000;
  const mark = t.serial;
  hit(t, q, 500, { mine: true });
  const carried = t.logs.filter((x) => x.id > mark && x.type === 'damage' && x.target === 'encryptor').reduce((n, x) => n + x.amount, 0);
  assert.equal(carried, Math.round(15 * power50()), "up to 15 (a skill's number, grown with your level) goes on to the next part, through its ◆");
});

test("timed buffs: Floodgate stacks twice on breaks, Fuse Map adds Momentum, Turbidity's Stealth after a crit", () => {
  const s = vet(); wear(s, 'floodgate'); const e = fight(s);
  const t = vet(); fight(t);
  const base = () => ratio(damageMultiplier(s, pulse(s), { mine: true }), damageMultiplier(t, pulse(t), { mine: true }));
  const smash = (st, id) => { const q = part(st, id); q.armor = 0; q.integrity = 1; hit(st, q, 100, { mine: true }); };
  // A breaker's own Momentum moves both the same; break the same spare part in both.
  const extra = () => { const x = { ...pulse(s), id: 'x' + s.serial, name: 'Spare', integrity: 1, max: 1, armor: 0, attack: null }; s.encounter.virus.parts.push(x); t.encounter.virus.parts.push({ ...x }); smash(s, x.id); smash(t, x.id); };
  extra();
  assert.equal(base(), 1.06, 'one break: +6%');
  extra(); extra();
  assert.equal(base(), 1.12, 'stacking twice, no more');
  e.cycle += 4; t.encounter.cycle += 4;
  assert.equal(base(), 1, 'gone 3 cycles later');
  const u = vet(); wear(u, 'fuse-map'); const f = fight(u);
  const q = pulse(u); q.armor = 0; q.integrity = 1;
  hit(u, q, 100, { mine: true });
  assert.equal(f.momentum.stacks, 2, 'Fuse Map: a break gives 2 Momentum, its own and one more');
  const v = vet(); wear(v, 'turbidity'); const g = fight(v);
  const st = gearStat(v, 'stealth', 'hacker');
  const r = pulse(v); r.armor = 0; r.integrity = r.max = 100000;
  hit(v, r, 100, { mine: true, crit: true });
  assert.equal(gearStat(v, 'stealth', 'hacker'), st + 5, 'Turbidity: +5% Stealth after a crit');
  g.cycle += 3;
  assert.equal(gearStat(v, 'stealth', 'hacker'), st, 'for 2 cycles');
  g.cycle -= 3;
  g.fxs.buff.turbidity.stacks = 20; // 100%: the next attack on you slips a cycle
  const due = g.cycle;
  Object.assign(r.attack, { due, amount: 50, interval: 9 });
  command(v, 'hold'); resolveCycle(v);
  assert.equal(r.attack.due, due + 1, 'while it runs, an attack on you may come a cycle later');
});

test('Wire Wrap: a break that fills your Momentum arms your next skill to hit every other part for 40%', () => {
  const s = vet(); wear(s, 'wire-wrap'); const e = fight(s);
  for (const id of ['a', 'b']) e.virus.parts.push({ ...pulse(s), id, name: 'Part ' + id, integrity: 100000, max: 100000, armor: 0, attack: null });
  const p = pulse(s); p.armor = 0; p.integrity = 1;
  e.momentum = { stacks: 2, until: e.cycle + 2 };
  hit(s, p, 100, { mine: true });
  assert.ok(e.fxs.cleave, 'armed: Momentum full');
  e.cycle++;
  const q = part(s, 'encryptor'); q.armor = 0; q.integrity = q.max = 100000;
  const mark = s.serial;
  e.commanding = { id: 'crack' };
  const r = hit(s, q, 100, { mine: true });
  e.commanding = false;
  const spread = s.logs.filter((x) => x.id > mark && x.type === 'damage' && ['a', 'b'].includes(x.target));
  assert.equal(spread.length, 2, 'every other part');
  const n = Math.max(1, Math.round((r.crit ? (r.dealt - gearStat(s, 'critDamage')) / 1.5 : r.dealt) * 0.4)), crit = (x) => Math.floor(x * 1.5) + gearStat(s, 'critDamage');
  assert.ok(spread.every((x) => Math.abs(x.amount - (x.crit ? crit(n) : n)) <= 2), `40% of the hit (${spread.map((x) => x.amount)} of ${r.dealt})`);
  assert.equal(e.fxs.cleave, null, 'spent');
});

// ---------- helpers and burns ----------
const tough = (e) => { for (const x of e.virus.parts) Object.assign(x, { armor: 0, maxArmor: 0, integrity: 100000, max: 100000 }); };
test('helpers: Ebb\'s first runs longer, Load Order\'s hit as they arrive, Backwash\'s cooldown after one expires, Watchdog Timer\'s free one', () => {
  const s = vet('operator'); wear(s, 'ebb'); const e = fight(s); tough(e);
  command(s, 'deploy pulse'); resolveCycle(s);
  assert.equal(e.helpers[0].left, ABILITIES.deploy.ticks + 2 - 1, 'Ebb: the first helper, 2 cycles longer (one tick spent)');
  e.readyAt = {};
  command(s, 'deploy pulse'); resolveCycle(s);
  assert.equal(e.helpers.at(-1).left, ABILITIES.deploy.ticks - 1, 'only the first each fight');
  const t = vet('operator'); wear(t, 'load-order'); const f = fight(t); tough(f);
  const mark = t.serial;
  command(t, 'deploy pulse'); resolveCycle(t);
  const hits = t.logs.filter((x) => x.id > mark && x.type === 'damage' && x.target === 'pulse' && x.src === 'helper');
  assert.equal(hits.length, 2, 'Load Order: a hit as it arrives, then its tick');
  assert.equal(hits.filter((x) => x.via === 'Load Order').length, 1);
  const u = vet('operator'); wear(u, 'backwash'); const g = fight(u); tough(g);
  command(u, 'deploy pulse'); resolveCycle(u);
  while (g.helpers.length) { command(u, 'hold'); resolveCycle(u); }
  g.readyAt = {};
  const c = g.cycle;
  command(u, 'deploy pulse'); resolveCycle(u);
  assert.equal(g.readyAt.deploy, c + cooldownOf(u, 'deploy') - 1, 'Backwash: after a helper expired, the next helper skill cools a cycle faster');
  g.readyAt = {};
  const c2 = g.cycle;
  command(u, 'deploy pulse'); resolveCycle(u);
  assert.equal(g.readyAt.deploy, c2 + cooldownOf(u, 'deploy'), 'once for each expiry');
  const v = vet('operator'); wear(v, 'watchdog-timer'); const h = fight(v); tough(h);
  while (h.cycle <= 6) { assert.equal(h.helpers.length, 0, `none before the 6th cycle ends (${h.cycle})`); command(v, 'hold'); resolveCycle(v); }
  assert.equal(h.helpers.length, 1, 'Watchdog Timer: a free helper joins after every 6th cycle');
  assert.equal(h.helpers[0].left, 2);
});

test('Bus Fault: a Jam also pushes the part\'s next attack back a cycle', () => {
  const jam = (s) => {
    const e = fight(s); tough(e);
    command(s, 'deploy pulse'); resolveCycle(s);
    const p = pulse(s); p.attack.due = e.cycle + 3;
    const due = p.attack.due;
    command(s, 'jam pulse'); resolveCycle(s);
    return p.attack.due - due;
  };
  const s = vet('operator', { sub: 'hijacker' }); wear(s, 'bus-fault');
  const plain = jam(vet('operator', { sub: 'hijacker' }));
  assert.equal(jam(s), plain + 1, 'a cycle more than a Jam alone');
});

test('burns: Burn-In ticks a new burn once at once; Bilge weakens the part each burn you start is on', () => {
  const s = vet('infiltrator', { kit: true }); wear(s, 'burn-in'); const e = fight(s); tough(e);
  const mark = s.serial;
  command(s, 'inject pulse'); resolveCycle(s);
  const ticks = s.logs.filter((x) => x.id > mark && x.type === 'damage' && x.target === 'pulse' && x.src === 'burn');
  assert.equal(ticks.length, 2, 'Burn-In: once as it starts, then its tick');
  assert.ok(ticks.some((x) => /Burn-In/.test(x.via || '')));
  assert.equal(e.burns[0].left, ABILITIES.inject.ticks - 1, 'without using a tick up');
  const t = vet('infiltrator', { kit: true }); wear(t, 'bilge'); const f = fight(t, { hp: 10000 }); tough(f);
  const b = gearStat(t, 'reduction', 'hacker');
  assert.equal(landed(t, 1000), 1000 - b);
  command(t, 'inject pulse'); resolveCycle(t);
  assert.equal(landed(t, 1000), 970 - b, 'Bilge: a burn you started on it, 3% less');
  f.readyAt = {};
  command(t, 'inject pulse'); resolveCycle(t);
  assert.equal(landed(t, 1000), 970 - b, 'refreshing a burn starts none');
  f.fxs.burned.pulse = 5;
  assert.equal(landed(t, 1000), 910 - b, 'up to 9%');
});

// ---------- cooldowns ----------
test('cooldowns: Bootstrap\'s first one shorter, Microcode\'s shortest skill, Clock Tree\'s meter starts half full', () => {
  const s = vet(); wear(s, 'bootstrap'); const e = fight(s); tough(e);
  command(s, 'overload pulse'); resolveCycle(s);
  assert.equal(e.readyAt.overload, 1 + cooldownOf(s, 'overload') - 1, 'Bootstrap: its first cooldown a cycle shorter');
  e.readyAt = {};
  const c = e.cycle;
  command(s, 'overload pulse'); resolveCycle(s);
  assert.equal(e.readyAt.overload, c + cooldownOf(s, 'overload'), 'then as usual');
  const t = vet(), was = { crack: cooldownOf(t, 'crack'), overload: cooldownOf(t, 'overload') };
  wear(t, 'microcode');
  assert.equal(cooldownOf(t, 'crack'), was.crack - 1, 'Microcode: the shortest cooldown over 1 on your bar');
  assert.equal(cooldownOf(t, 'overload'), was.overload, 'and no other');
  const u = vet(); wear(u, 'clock-tree'); const f = fight(u), rate = gearStat(u, 'clock');
  assert.equal(f.clock, 50, 'Clock Tree: the meter starts half full');
  command(u, 'hold'); resolveCycle(u);
  assert.equal(f.clock, 50 + rate, 'then fills at your Clock Speed, which counts toward its cap');
  assert.ok(rate <= STATS.clock.cap);
});

test('Bitrot Ward: when a break leaves one part, a ◆ for 2 cycles, once a fight', () => {
  const s = vet(); wear(s, 'bitrot-ward'); const e = fight(s);
  for (const q of e.virus.parts) if (q.attack) q.attack.due = 99;
  assert.equal(e.chits, 0, 'nothing at the start');
  const alive = () => e.virus.parts.filter((q) => q.integrity > 0);
  while (alive().length > 2) { const q = alive()[0]; q.armor = 0; q.integrity = 1; hit(s, q, 100, { mine: true }); }
  assert.equal(e.chits, 0, 'two parts left: not yet');
  const q = alive()[0]; q.armor = 0; q.integrity = 1; hit(s, q, 100, { mine: true });
  assert.equal(alive().length, 1);
  assert.equal(e.chits, 1, 'one part left: a ◆');
  command(s, 'hold'); resolveCycle(s);
  assert.equal(e.chits, 1, 'held through its first cycle');
  command(s, 'hold'); resolveCycle(s);
  assert.equal(e.chits, 0, 'gone after 2 cycles');
  assert.ok(s.logs.some((l) => /Bitrot Ward: your ◆ fades/.test(l.message)));
});

// ---------- Momentum ----------
test('Momentum: Pumphouse adds to what spends it, Undervolt takes away the cost of holding it', () => {
  const vent = (withIt) => {
    const s = vet('breaker', { sub: 'overclocker' }); s.loadout.equipped = { overclocker: ['vent'] };
    if (withIt) wear(s, 'pumphouse');
    const e = fight(s); tough(e);
    s.run.integrity = 100; e.momentum = { stacks: 3, until: e.cycle + 3 };
    const mark = s.serial;
    command(s, 'vent'); resolveCycle(s);
    return s.logs.filter((x) => x.id > mark && x.type === 'heal' && /^Vent/.test(x.message)).reduce((n, x) => n + x.amount, 0);
  };
  const plain = vent(false);
  assert.ok(plain > 0);
  assert.equal(vent(true), Math.round(plain * 1.15), 'Pumphouse: 5% for each of the 3 stacks Vent spends');
  const s = vet('breaker', { sub: 'overclocker' }); const e = fight(s);
  e.momentum = { stacks: 2, until: e.cycle + 2 };
  assert.equal(ratio(takenMult(s, pulse(s)), 1), 1.1, 'Redline: 10% more taken while you hold Momentum');
  const t = vet('breaker', { sub: 'overclocker' }); wear(t, 'undervolt'); const f = fight(t);
  f.momentum = { stacks: 2, until: f.cycle + 2 };
  assert.equal(ratio(takenMult(t, pulse(t)), 1), 1, 'Undervolt: not with it');
});

// ---------- what you see, and what you earn ----------
test('Sounding Line: tells a cycle earlier, and a Veiled part shows its next attack once it is a cycle away; Silt Map\'s exploring XP', () => {
  const s = vet(); wear(s, 'sounding-line'); const e = fight(s);
  assert.equal(fxOn(s, 'warn-early')?.fx.value, 1);
  const p = pulse(s); p.veiled = true; p.armor = 2;
  p.attack.due = e.cycle + 3;
  assert.ok(timersHidden(s, p), 'further off: hidden');
  p.attack.due = e.cycle + 1;
  assert.ok(!timersHidden(s, p), 'a cycle away: it shows');
  const t = vet(); const f = fight(t); const q = pulse(t); q.veiled = true; q.armor = 2; q.attack.due = f.cycle + 1;
  assert.ok(timersHidden(t, q), 'without it, hidden');
  const u = vet(); wear(u, 'silt-map');
  assert.equal(fxPct(u, 'explore-xp%'), 10, 'Silt Map: first clears and Mapped servers pay 10% more XP (floorplan.mjs)');
});

// ---------- where they drop ----------
const ids = (rows, kind) => rows.filter((x) => x[4] === kind).map((x) => x[0]);
test('a floor\'s lair boss: The Sink\'s own uniques join its network\'s natives in the same roll, at the same odds and pity, one you lack first', async () => {
  const { connect, play } = await import('./dist/run.mjs');
  const { graphOf } = await import('./dist/floors.mjs');
  const { sigOf } = await import('./dist/network.mjs');
  const s = fresh(); s.netSeed = 4242; s.hackers = { breaker: { level: 44, xp: 0 } };
  const lair = addLocation(s, 'worm', 7, null, graphOf(s, 7).lair);
  assert.ok(lair?.lair && lair.depth === 7);
  lair.level = 44;
  const natives = sigOf(s, 'you').uniques, sink = ids(SINK, 'lair'), deep = ids(BEDROCK, 'lair');
  const kill = () => {
    lair.spawns = {}; lair.lockUntil = 0;
    connect(s, lair.id); play(s, 'cd core'); play(s, 'attack');
    assert.ok(s.encounter?.virus.boss, 'its boss in /core');
    for (const p of s.encounter.virus.parts) Object.assign(p, { integrity: 0, armor: 0 });
    const p = s.encounter.virus.parts[0]; p.integrity = 1;
    command(s, 'spike ' + p.id); resolveCycle(s);
    play(s, 'jack out');
  };
  const was = BOSS_LOOT.chance;
  try {
    BOSS_LOOT.chance = -1;
    kill();
    assert.equal(s.pity['lair:you'], 1, 'a miss: its pity, as ever');
    BOSS_LOOT.chance = 1;
    const before = new Set(Object.keys(s.collection || {}));
    for (let k = 0; k < 16; k++) kill();
    const got = Object.keys(s.collection).filter((id) => !before.has(id) && UNIQUES[id]);
    for (const id of sink) assert.ok(got.includes(id), `${id} from The Sink's lair boss`);
    assert.ok(got.some((id) => natives.includes(id)), 'and the natives still');
    assert.ok(!got.some((id) => deep.includes(id)), "never Bedrock's");
    assert.ok(got.every((id) => natives.includes(id) || sink.includes(id)), 'nothing else');
    assert.equal(s.pity['lair:you'], 0);
  } finally { BOSS_LOOT.chance = was; }
});

test('rare spawns, vaults, puzzle boards and threads drop their floor\'s own, and only on that floor', async () => {
  const s = vet();
  const odds = { ...LOOT.odds.rare }, elite = { ...LOOT.odds.elite }, vault = { ...LOOT.vault }, quest = LOOT.quest;
  try {
    LOOT.odds.rare.zeroday = 1;
    const rare = (floor, level) => rollDrop(s, { kind: 'home', rare: true, floor }, level)?.unique;
    for (let k = 0; k < 20; k++) assert.ok(ids(SINK, 'rare').includes(rare(7, 44)), 'a Sink rare spawn');
    for (let k = 0; k < 20; k++) assert.ok(ids(BEDROCK, 'rare').includes(rare(8, 50)), 'a Bedrock rare spawn');
    for (let k = 0; k < 20; k++) assert.ok(!ids(ALL, 'rare').includes(rare(6, 38)), 'elsewhere, a world unique as before');
    // Vaults: a gold is a vault unique this deep; a floor's own only on that floor.
    for (const k of Object.keys(LOOT.vault)) LOOT.vault[k] = k === 'zeroday' ? 1 : 0;
    const { vaultItem } = await import('./dist/run.mjs');
    const from = (depth, level) => Array.from({ length: 80 }, (_, i) => vaultItem({ seed: 100 + i, depth, level, family: 'worm' }).unique);
    const at7 = from(7, 44), at8 = from(8, 50);
    assert.ok(at7.every((id) => UNIQUES[id].sources.some((x) => x.kind === 'vault' && (!x.floor || x.floor === 7))));
    assert.ok(at7.some((id) => ids(SINK, 'vault').includes(id)), "The Sink's vaults hold its own");
    assert.ok(at8.some((id) => ids(BEDROCK, 'vault').includes(id)) && !at8.some((id) => ids(SINK, 'vault').includes(id)), "Bedrock's hold its own, not The Sink's");
    // Puzzle boards: an elite's odds of a gold, for its floor's own.
    LOOT.odds.elite.zeroday = 1;
    assert.ok(ids(SINK, 'puzzle').includes(puzzleUnique(s, 7, 43)?.unique));
    assert.ok(ids(BEDROCK, 'puzzle').includes(puzzleUnique(s, 8, 50)?.unique));
    assert.equal(puzzleUnique(s, 6, 38), null, 'none on a floor with none of its own');
    LOOT.odds.elite.zeroday = elite.zeroday;
    assert.equal(LOOT.odds.elite.zeroday, 0.00005, "a board rolls an elite's odds, no better");
    // Threads: a thread that starts on The Sink offers one of its own one time in ten, in an item's place.
    const TH = await import('./dist/threads.mjs');
    const t = vet('breaker', { level: 44 });
    t.locations.push({ id: 'deep', depth: 7, level: 44, family: 'worm', state: { cleared: {}, unlocked: {}, taken: {} } });
    t.locations.push({ id: 'mid', depth: 6, level: 38, family: 'worm', state: { cleared: {}, unlocked: {}, taken: {} } });
    LOOT.quest = 1;
    const offer = (loc, k) => TH.offerItems(t, { id: 't' + k, chain: 'tpl:escort:0', seed: 7 + k * 7919, level: 44, places: { start: { loc } } });
    for (let k = 0; k < 10; k++) {
      const items = offer('deep', k), u = items.filter((x) => x.unique);
      assert.equal(items.length, 3);
      assert.equal(u.length, 1);
      assert.ok(ids(SINK, 'thread').includes(u[0].unique));
      assert.ok(!offer('mid', k).some((x) => x.unique), 'none on a floor without its own');
    }
    LOOT.quest = quest;
    let n = 0;
    for (let k = 0; k < 400; k++) if (offer('deep', k).some((x) => x.unique)) n++;
    assert.ok(n > 15 && n < 70, `about one thread in ten (${n} in 400)`);
  } finally { Object.assign(LOOT.odds.rare, odds); Object.assign(LOOT.odds.elite, elite); Object.assign(LOOT.vault, vault); LOOT.quest = quest; }
});

test('strain kills: the strain\'s own trophy and the deep strain uniques share one roll at the same odds; crew bosses carry Wake', () => {
  const s = vet('breaker', { level: 45 });
  assert.deepEqual(strainTrophies('keylogger', 10).map((u) => u.id), ['logger-spool'], 'at level 10: only its own');
  const pool = strainTrophies('keylogger', 45).map((u) => u.id);
  assert.deepEqual(pool.sort(), ['bilge', 'bitrot-ward', 'logger-spool', 'siphon-tube', 'sump-pump'], 'at 45: its own and the strain uniques open by then');
  for (let k = 0; k < pool.length; k++) addItem(s, rollDrop(s, { kind: 'sprawl', strain: 'keylogger', trophy: true }, 45));
  assert.ok(pool.every((id) => s.collection[id]), 'one you lack first: every one in as many rolls');
  // The roll itself: 1 in LOOT.trophy kills of the strain, at 10 or at 45.
  const was = LOOT.trophy;
  try {
    LOOT.trophy = 40;
    const rate = (level) => { const x = vet('breaker', { level }); let n = 0; for (let k = 0; k < 4000; k++) if (rollDrop(x, { kind: 'sprawl', strain: 'keylogger' }, level)?.unique) n++; return n; };
    const lo = rate(10), hi = rate(45);
    assert.ok(Math.abs(lo - 100) < 35 && Math.abs(hi - 100) < 35, `the same odds: ${lo} at 10, ${hi} at 45 (of 4000 at 1 in 40)`);
  } finally { LOOT.trophy = was; }
  // A crew boss's world unique (BOSS_LOOT.raid.gold) can be Wake; the courier and elite pools stay world drops.
  assert.ok(['rare', 'thread', 'puzzle', 'vault'].every((k) => WORLD_SOURCES.includes(k)) && !['lair', 'strain', 'raid', 'boss'].some((k) => WORLD_SOURCES.includes(k)));
  const c = vet('breaker', { level: 45 }), raid = { ...BOSS_LOOT.raid };
  try {
    Object.assign(BOSS_LOOT.raid, { chance: -1, gold: 1 });
    let wake = 0;
    for (let k = 0; k < 500 && !wake; k++) {
      c.stash = [];
      selectEncounter(c, 'random', 7, { level: 45, boss: 'foreman' }); command(c, 'engage'); finish(c, 'victory');
      if (c.stash.some((x) => x.unique === 'wake')) wake++;
    }
    assert.ok(wake, 'Wake from a crew boss');
  } finally { Object.assign(BOSS_LOOT.raid, raid); }
});

test('couriers carry the deep world uniques you lack, never a lair\'s or a strain\'s, at the courier\'s own odds', async () => {
  const { deal, DIRECTOR } = await import('./dist/events.mjs');
  const was = DIRECTOR.named, seen = new Set();
  try {
    DIRECTOR.named = 1;
    for (let i = 0; i < 80; i++) {
      const s = fresh(); s.seed = i + 1; s.hackers = { breaker: { level: 45, xp: 0 } };
      command(s, 'developer location worm');
      const e = deal(s, 'courier');
      if (e?.unique) seen.add(e.unique);
    }
  } finally { DIRECTOR.named = was; }
  const mine = [...seen].filter((id) => ALL.some((x) => x[0] === id));
  assert.ok(mine.length > 3, `deep uniques among them (${mine})`);
  assert.ok(mine.every((id) => ['rare', 'thread', 'puzzle', 'vault'].includes(UNIQUES[id].sources[0].kind)));
  assert.equal(DIRECTOR.named, 20, 'one courier in twenty, as before');
});

test('Init Vector: after every 5th cycle, your next damaging skill hits again for 30%', () => {
  const s = vet(); wear(s, 'init-vector').stats.crit = 0; const e = fight(s); tough(e);
  const spike = () => { const mark = s.serial; command(s, 'spike pulse'); resolveCycle(s); return s.logs.filter((x) => x.id > mark && x.type === 'damage' && x.target === 'pulse' && !x.src); };
  while (e.cycle <= 5) assert.equal(spike().length, 1, `one hit before it is armed (cycle ${e.cycle})`);
  const hits = spike();
  assert.equal(hits.length, 2, 'the skill after the 5th cycle hits again');
  assert.equal(hits[1].via, 'Init Vector');
  assert.ok(Math.abs(hits[1].amount - Math.round(hits[0].amount * 0.3)) <= gearStat(s, 'damage'), `for about 30% of it (${hits[1].amount} of ${hits[0].amount}, Damage on each)`);
  assert.equal(spike().length, 1, 'once each time it is armed');
});

test('out of a fight: Silt Map pays 10% more for a Mapped server, Golden Image\'s caches 10% more credits', async () => {
  const FP = await import('./dist/floorplan.mjs');
  await import('./dist/netrooms.mjs'); // the network's room hooks (cacheMult)
  const lastClear = (withIt) => {
    const s = fresh(); s.rng = 7 * 7777;
    FP.outfit(s, { cls: 'breaker', level: 10, gearSeed: 7 });
    if (withIt) wear(s, 'silt-map');
    FP.startRooms(s, { seed: 7, kind: 'Mailhub', size: 'small', level: 10, floor: 2 });
    FP.connect(s);
    const R = s.rooms, room = FP.neighbours(R.graph, R.at).map((id) => R.graph.rooms[id]).find((r) => ['process', 'guard', 'elite'].includes(r.kind)) || FP.roomList(s).find((r) => r.kind === 'process');
    const from = FP.neighbours(R.graph, room.id)[0];
    R.at = from; R.visit.walked[from] = true; R.screen = null; FP.look(s);
    for (const x of FP.roomList(s)) if (FP.counted(x) && x.id !== room.id) R.cleared[x.id] = 1; // its last room: the fight Maps it
    FP.go(s, room.id); FP.act(s, 'engage');
    const mark = s.serial;
    for (const p of s.encounter.virus.parts) p.integrity = 0;
    finish(s, 'victory'); FP.settle(s);
    const bonus = s.logs.filter((x) => x.id > mark && x.type === 'fresh').reduce((n, x) => n + x.amount, 0); // a Fresh bonus rides on it, capped
    return s.logs.filter((x) => x.id > mark && x.type === 'xp' && /Mapped/.test(x.message)).reduce((n, x) => n + x.amount, 0) - bonus;
  };
  const plain = lastClear(false);
  assert.ok(plain > 0);
  assert.ok(Math.abs(lastClear(true) - plain * 1.1) <= 1, 'Silt Map: 10% more XP for a Mapped server');
  const s = vet();
  assert.equal(FP.WORLD.cacheMult(s), 1);
  wear(s, 'golden-image');
  assert.equal(FP.WORLD.cacheMult(s), 1.1, 'Golden Image: a cache on the network pays 10% more credits');
});
