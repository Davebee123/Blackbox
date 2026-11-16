// Floor 7's sets and uniques (docs/floor-items.md: The Sink, 37-44): Smash and Grab, Payroll and Backbone, Headcount
// and Check Valve, and the lair's eight re-homed to the bosses that will drop them (their planned source).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part, addItem, loaded, UNIQUES, hit, gearStat, blocked, floorUniques } from './dist/combat.mjs';
import { uniqueItem, seeded, BASES, STATS } from './dist/gear.mjs';
import { CONFIG, defaultSub, lifted } from './dist/data.mjs';
import { SETS, SET_HOOKS, activeSets, sourcePool } from './dist/sets.mjs';
import { checkItems, fxText, fxList } from './dist/content.mjs';
import ITEMS from './dist/content/items.mjs';

CONFIG.length = { ...CONFIG.length, heal: null };
CONFIG.gearReq = 99;
CONFIG.baseCrit = -100; CONFIG.enemyCrit = 0; CONFIG.misses = false; // no crit unless one is forced

// The plan's pieces and uniques: id, name, slot, level; a set's source.
const SETS7 = {
  smashandgrab: ['Smash and Grab', [38, 42], [['grabber', 'Grabber', 'exploit', 38], ['clipper', 'Clipper', 'script', 40], ['dropzone', 'Dropzone', 'implant', 42]], { kind: 'lair', floor: 7, planned: 'Stealer kills' }],
  payroll: ['Payroll', [39, 43], [['pay-slip', 'Pay Slip', 'script', 39], ['direct-deposit', 'Direct Deposit', 'proxy', 41], ['year-end', 'Year End', 'shell', 43]], { kind: 'thread', floor: [7, 7] }],
  backbone: ['Backbone', [38, 44], [['hop', 'Hop', 'script', 38], ['crc', 'CRC', 'implant', 41], ['broadcast-storm', 'Broadcast Storm', 'exploit', 44]], { kind: 'puzzle', id: 'routing', floor: 7 }],
};
const U7 = [['headcount', 'Headcount', 'proxy', 40, 'PAY RUN'], ['check-valve', 'Check Valve', 'proxy', 44, 'SUMP']];
const REHOMED = { floodgate: 'GOLDEN PARACHUTE', spillway: 'GOLDEN PARACHUTE', outfall: 'PAY RUN', pumphouse: 'BIT BUCKET', seawall: 'BIT BUCKET', 'anchor-chain': 'SUMP', backwash: 'Sinkhole Residents', riptide: 'Sinkhole Residents' };

// ---------- fixtures (floor56.test.mjs's) ----------
const L = 50;
const vet = (cls = 'breaker') => { const s = fresh(); s.hackers = { [cls]: { level: L, xp: 0 } }; s.loadout.archetype = cls; s.loadout.sub = { [cls]: defaultSub(cls) }; return s; };
const wear = (s, ...ids) => ids.map((id) => { const it = addItem(s, uniqueItem(UNIQUES[id], UNIQUES[id].level, seeded(1))); command(s, 'load ' + it.id); assert.ok(loaded(s).some((x) => x.id === it.id), `${id} loaded`); return it; });
const wearSet = (s, id) => wear(s, ...SETS[id].pieces);
function fight(s, { hp = 1000 } = {}) {
  s.run = { loc: 'x', cwd: '/', integrity: hp, max: hp, pack: [], visited: ['/'] };
  selectEncounter(s, 'cryptjack', 7, { level: L, mutation: null, mode: 'run' });
  command(s, 'engage');
  const e = s.encounter;
  e.virus.tells = null; e.hardened = 0;
  for (const p of e.virus.parts) { p.armor = p.maxArmor = 0; p.integrity = p.max = 5000; if (p.attack) p.attack.due = 999; }
  return e;
}
const pulse = (s) => part(s, 'pulse');
const enc = (s) => part(s, 'encryptor');
const hold = (s, n = 1) => { for (let i = 0; i < n; i++) { command(s, 'hold'); resolveCycle(s); } };

// ---------- the data ----------
test("floor 7: three sets, two uniques, each with the plan's name, slot, level and source; the lair's eight re-homed", () => {
  assert.deepEqual(checkItems(ITEMS, BASES, STATS).filter((x) => x.bad).map((x) => x.msg), []);
  const all = [];
  for (const [id, [name, levels, pieces, src]] of Object.entries(SETS7)) {
    assert.equal(SETS[id].name, name);
    assert.deepEqual(SETS[id].levels, levels);
    assert.ok(levels[1] - levels[0] <= 6, `${name}: six levels or fewer`);
    assert.deepEqual(SETS[id].pieces, pieces.map((p) => p[0]));
    for (const [pid, pname, slot, level] of pieces) {
      const u = UNIQUES[pid];
      assert.equal(u.set, id);
      assert.deepEqual(u.sources, [src], `${pname}: its source`);
      assert.ok(u.effect?.text && u.green?.text, `${pname}: its own bonus and its green line`);
      all.push([u, pname, slot, level]);
    }
  }
  for (const [id, name, slot, level, planned] of U7) {
    const u = UNIQUES[id];
    assert.ok(u && !u.set, id);
    assert.deepEqual(u.sources, [{ kind: 'lair', floor: 7, planned }], `${name}: the floor 7 lair boss until ${planned} is built`);
    assert.ok(u.flavour && !/break.?in|keyhole|breach|way in|intru|backdoor/i.test(u.flavour), `${name}: flavour`);
    all.push([u, name, slot, level]);
  }
  const words = /stealer|pay run|sump|golden parachute|bit bucket|sinkhole|resident|cryptjack/i;
  for (const [u, name, slot, level] of all) {
    assert.equal(u.name, name);
    assert.equal(BASES[u.base].slot, slot, `${name}: slot`);
    assert.equal(u.level, level, `${name}: level`);
    assert.ok(fxText(fxList(u)) && !words.test(fxText(fxList(u))), `${name}: a general rule`);
    for (const [k, v] of Object.entries({ ...u.primary, ...u.secondary })) for (const x of [].concat(v)) assert.ok(Number.isInteger(x), `${name}: whole numbers (${k})`);
    const main = slot === 'exploit' ? 'damage' : 'signal';
    const it = uniqueItem({ ...u, secondary: {} }, level, seeded(3)).stats[main], base = uniqueItem({ ...u, primary: {}, secondary: {}, downside: {} }, level, seeded(3)).stats[main];
    assert.ok(it >= base * 0.95 && it <= base * 1.1, `${name}: ${it} against a base's ${base}`);
  }
  // The re-homed eight keep their source and change only the boss they move to.
  for (const [id, planned] of Object.entries(REHOMED)) assert.deepEqual(UNIQUES[id].sources, [{ kind: 'lair', floor: 7, planned }], id);
  for (const id of ['headcount', 'check-valve']) assert.ok(floorUniques('lair', 7, 44).some((u) => u.id === id), `${id}: the floor 7 lair boss's roll`);
  assert.deepEqual(sourcePool({ kind: 'puzzle', id: 'routing', floor: 7 }).map((u) => u.id), SETS.backbone.pieces, 'Backbone: Packet routing boards on The Sink');
  assert.deepEqual(sourcePool({ kind: 'thread', floor: 7 }).map((u) => u.id), SETS.payroll.pieces, 'Payroll: threads on The Sink');
});

// ---------- the uniques ----------
test('Headcount: +1 Block for each part standing, up to 4; Check Valve: a part\'s blast as it breaks deals 40% less', () => {
  const s = vet(); const [hc] = wear(s, 'headcount');
  const out = gearStat(s, 'reduction', 'hacker');
  fight(s);
  const per = lifted(1, hc.level), two = gearStat(s, 'reduction', 'hacker');
  assert.equal(two - out, 2 * per, 'two parts standing');
  enc(s).integrity = 0;
  assert.equal(gearStat(s, 'reduction', 'hacker') - out, per, 'one');
  // Check Valve: a Zip Bomb's blast, 20% of your max, as its part breaks.
  for (const [id, share] of [['check-valve', 0.6], [null, 1]]) {
    const t = vet(); if (id) wear(t, id); fight(t);
    Object.assign(enc(t), { integrity: 0, fuseAt: t.encounter.cycle });
    const mark = t.serial;
    hold(t);
    const took = t.logs.filter((x) => x.id > mark && x.fuse && x.type === 'server-hit').reduce((n, x) => n + x.amount, 0);
    assert.equal(took, blocked(t, Math.round(1000 * 0.2 * share)), id ? 'Check Valve: 40% less' : 'without it, all of it');
  }
});

// ---------- the sets ----------
test("Smash and Grab (3): breaking a part's shield takes a third of it for 2 cycles", () => {
  const s = vet(); wearSet(s, 'smashandgrab'); const e = fight(s);
  assert.deepEqual(activeSets(loaded(s)).find((r) => r.id === 'smashandgrab').open, [2, 3]);
  // A Bodyguard's shield on the Pulse Node: your command hits the shield first.
  Object.assign(enc(s), { mech: 'bodyguard' });
  Object.assign(pulse(s), { bufHp: 30, bufMax: 30, bufBy: 'encryptor' });
  e.commanding = { id: 'spike', target: 'pulse' };
  hit(s, pulse(s), 200, { mine: true });
  e.commanding = false;
  assert.equal(pulse(s).bufHp, 0, 'the shield broke');
  assert.equal(e.shield, 10, 'a third of it is yours');
  hold(s, 2);
  assert.equal(e.shield, 10, 'through the attacks of 2 cycles');
  hold(s);
  assert.equal(e.shield || 0, 0, 'then it fades');
});

test('Payroll (3): every 4th cycle heals 4% of your max Signal', () => {
  const s = vet(); wearSet(s, 'payroll'); const e = fight(s);
  const heals = () => s.logs.filter((x) => /Payroll \(3\)/.test(x.message || '')).length;
  s.run.integrity = 500;
  while (e.cycle <= 4) { assert.equal(heals(), 0, `nothing before cycle 4's end (${e.cycle})`); hold(s); }
  assert.equal(heals(), 1, 'cycle 4');
  hold(s, 4);
  assert.equal(heals(), 2, 'and cycle 8');
});

test('Backbone (3): a command that reaches several parts deals 8% more on each part for each past the first, up to 24%', () => {
  const s = vet(); wearSet(s, 'backbone'); const e = fight(s);
  const before = () => ({ shield: e.shield || 0, parts: {}, burns: new Set(e.burns), helpers: new Set(e.helpers), allies: [] });
  const used = () => SET_HOOKS.used(s, { id: 'spike', target: pulse(s), before: before() });
  // One part: nothing more.
  e.commanding = { id: 'spike', target: 'pulse' };
  const one = hit(s, pulse(s), 2, { mine: true }).dealt, was = pulse(s).integrity;
  used();
  assert.equal(pulse(s).integrity, was, 'one part: nothing more');
  // Two parts: each takes 8% more of what it took.
  const p0 = pulse(s).integrity, q0 = enc(s).integrity;
  const a = hit(s, pulse(s), 2, { mine: true }).dealt, b = hit(s, enc(s), 2, { mine: true }).dealt;
  used();
  assert.equal(p0 - pulse(s).integrity, a + Math.round(a * 0.08), 'the Pulse Node: 8% more');
  assert.equal(q0 - enc(s).integrity, b + Math.round(b * 0.08), 'the Encryptor too');
  // Six parts reached: 24% at most (the extra parts here stand in for a bigger virus).
  const p1 = pulse(s).integrity;
  const c = hit(s, pulse(s), 2, { mine: true }).dealt;
  Object.assign(e.sx.reach, { x1: 1, x2: 1, x3: 1, x4: 1, x5: 1 });
  used();
  assert.equal(p1 - pulse(s).integrity, c + Math.round(c * 0.24), 'up to 24%');
  e.commanding = false;
  assert.ok(one > 0);
});
