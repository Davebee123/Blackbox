// P4 boss acts (dist/acts.mjs, docs/puzzle-fights.md 7; the solo bosses' own rules: bosses.test.mjs): a beat that repeats, and three acts on act bars.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, selectEncounter, part, livingParts, intents, defender, virusIntegrity, active } from './dist/combat.mjs';
import { player } from './genesim.mjs';
import { tellsOf } from './dist/tells.mjs';
import { actsOf, actOf, lashOn, beatOf, nextBeat, actBar } from './dist/acts.mjs';
import { BOSSES, CONFIG } from './dist/data.mjs';

CONFIG.misses = false; // the rules, not the dice

// A boss fight at a level, engaged: the Resident in a Core (by family), or an event boss at home.
function boss(id, family = BOSSES[id].family, level = 12, seed = 3) {
  const s = player('breaker', 'demolitionist', level);
  s.rng = 7;
  if (id === 'resident') selectEncounter(s, 'random', seed, { mode: 'run', room: '/core', level, zone: true, wild: 'lair', family, boss: id, mutation: null, name: 'Resident' });
  else { s.run = null; selectEncounter(s, 'random', seed, { level, family, name: BOSSES[id].name, boss: id, mutation: null, quiet: true }); }
  s.encounter.soft = 1;
  command(s, 'engage');
  return s;
}
const core = (s) => livingParts(s).find((p) => p.core);
const to = (s, c) => { while (s.encounter.cycle < c) { command(s, 'hold'); resolveCycle(s); } };

test('the worm and ransomware Residents and the three solo bosses are P4 bosses; the ghostroot Resident is not yet', () => {
  for (const [id, fam] of [['resident', 'worm'], ['resident', 'ransomware'], ['relayking'], ['repoman'], ['choir']]) assert.ok(actsOf(boss(id, fam).encounter.virus), `${id} ${fam || ''}`);
  assert.equal(actsOf(boss('resident', 'ghostroot').encounter.virus), null);
});

test('Backlash: on the beat, a part your command hits lashes back unless the hit breaks it', () => {
  const s = boss('resident', 'ransomware'), v = s.encounter.virus, pulse = part(s, 'pulse');
  assert.ok(intents(s).some((i) => i.effect === 'backlash' && i.source === 'pulse'), 'the beat is on the board');
  to(s, v.backlash.first);
  assert.ok(lashOn(s, pulse));
  Object.assign(pulse, { armor: 0, integrity: 500, max: 500 });
  pulse.attack.due = s.encounter.cycle + 3;
  const was = defender(s).integrity;
  command(s, 'spike pulse');
  const ev = resolveCycle(s);
  assert.ok(ev.some((x) => x.tell === 'backlash'), 'it lashes back');
  const lash = ev.find((x) => x.type === 'server-hit' && /Backlash/.test(x.message));
  assert.ok(lash && was > 0, 'and lands');
  // Off the beat: no lash.
  command(s, 'spike pulse');
  assert.ok(!resolveCycle(s).some((x) => x.tell === 'backlash'));
});

test('a hit that breaks the part on the beat is safe', () => {
  const s = boss('resident', 'ransomware'), v = s.encounter.virus, pulse = part(s, 'pulse');
  to(s, v.backlash.first);
  Object.assign(pulse, { armor: 0, integrity: 1 });
  command(s, 'spike pulse');
  assert.ok(!resolveCycle(s).some((x) => x.tell === 'backlash'));
});

// Act bars (acts.mjs): every part broken ends the act; at the cycle's end the board comes back at full.
const breakAll = (s) => { for (const p of s.encounter.virus.parts) p.integrity = 0; command(s, 'hold'); return resolveCycle(s); };

test('act bars: the fight is three bars, and breaking every part starts the next with every part back at full', () => {
  const s = boss('relayking'), v = s.encounter.virus, bar = actBar(s), all = virusIntegrity(s);
  assert.equal(all.max, bar.max * 3, 'three acts, the same bar each');
  const before = Object.fromEntries(v.parts.map((p) => [p.id, { max: p.max, armor: p.maxArmor }]));
  const ev = breakAll(s);
  assert.equal(actOf(v), 2);
  assert.ok(ev.some((x) => x.act?.refill && x.act.n === 2), 'the act break, with the refill');
  for (const p of v.parts.filter((x) => x.kind !== 'fragment')) {
    assert.equal(p.integrity, p.max, `${p.id} at full`);
    if (before[p.id]) assert.equal(p.armor, before[p.id].armor, `${p.id} ◆ full`);
  }
  assert.equal(virusIntegrity(s).current, actBar(s).current + 1 * s.encounter.actMax, 'one more act to come');
  assert.ok(active(s), 'no victory before the last act');
  breakAll(s);
  assert.equal(actOf(v), 3);
  breakAll(s);
  assert.equal(s.reports.at(-1)?.result, 'victory', 'the last act broken: the fight is won');
});

test("act bars: the ♛ carries plain ticks, and crossing them starts no act", () => {
  const s = boss('resident', 'ransomware'), c = core(s), v = s.encounter.virus;
  assert.deepEqual(c.ticks.map((t) => t.at), [0.5, 0.25]);
  Object.assign(c, { armor: 0, integrity: Math.floor(0.5 * c.max) + 1 });
  command(s, 'overload ' + c.id);
  resolveCycle(s);
  assert.equal(actOf(v), 1);
});

test('act bars: a part broken again in a later act pays no more research or components', async () => {
  const { hit } = await import('./dist/combat.mjs');
  const s = boss('relayking'), v = s.encounter.virus, id = v.parts.find((x) => x.loot)?.id || v.parts[0].id, again = () => part(s, id);
  again().loot ||= 'x';
  hit(s, again(), again().integrity, { mine: true, pierce: true });
  assert.ok(s.encounter.metrics.breakOrder.includes(id));
  breakAll(s);
  s.encounter.metrics.loot = [];
  again().loot ||= 'x';
  for (let i = 0; i < 20; i++) { again().integrity = 5; hit(s, again(), 5, { mine: true, pierce: true }); }
  assert.ok(!s.encounter.metrics.loot.includes(again().loot), 'no component from it, twenty breaks on'); // (a break can set off hits on other parts, whose first break this act is)
});

test('each act deals its own tell: act 1 its first, the rest wait', () => {
  const s = boss('resident', 'ransomware', 18), T = tellsOf(s);
  assert.deepEqual(T.list.filter((t) => t.kind !== 'mimic').map((t) => t.act), [1, 2, 3]);
  defender(s).integrity = defender(s).max = 1e6;
  for (let c = 0; c < 10; c++) { command(s, 'hold'); resolveCycle(s); assert.ok(T.list.every((t) => !(t.act > 1 && t.told)), 'only act 1\'s tell is said in act 1'); }
  assert.ok(T.list.some((t) => t.act === 1 && (t.told || t.count)), 'act 1\'s is');
});

test('act 2 quickens the beat', () => {
  const s = boss('resident', 'worm'), v = s.encounter.virus;
  const every = v.backlash.every;
  breakAll(s);
  assert.equal(actOf(v), 2);
  assert.ok(v.backlash.every < every);
});

test("the solo bosses' beats are their own parts' (docs/solo-bosses.md): the Relay's Broadcast, the Ledger's Collection, the Mimic", () => {
  for (const [id, kind, at] of [['relayking', 'broadcast', 'relay'], ['repoman', 'collect', 'ledger'], ['choir', 'copy', 'mimic']]) {
    const b = beatOf(boss(id));
    assert.equal(b?.kind, kind, id);
    assert.equal(b.part.id, at, id);
  }
});

test("a part's own attack as the beat: it falls where the attack lands", () => {
  const s = boss('relayking'), r = part(s, 'relay');
  assert.equal(nextBeat(s), r.attack.due, 'the beat falls where the Broadcast lands');
});

test('a fresh save is untouched: no boss state outside a fight', () => {
  assert.equal(fresh().encounter, null);
});

// Every solo boss with phases plays them as act bars: each act ends when every part is broken, and the fight only on
// the last.
test('every solo boss, natives too, plays its acts as bars', async () => {
  const FP = await import('./dist/floorplan.mjs');
  const solo = Object.keys(BOSSES).filter((k) => !BOSSES[k].raid && BOSSES[k].phases?.length).flatMap((k) => (k === 'resident' ? ['worm', 'ransomware', 'ghostroot'].map((f) => [k, f]) : [[k, BOSSES[k].family]]));
  for (const [id, family] of solo) {
    const s = fresh(), L = Math.max(BOSSES[id].floor || 14, 14), name = `${id} ${family}`;
    FP.outfit(s, { cls: 'breaker', level: L });
    selectEncounter(s, 'random', 7, { level: L, mutation: null, family, boss: id });
    command(s, 'engage');
    s.server.max = s.server.integrity = 1e6;
    const v = s.encounter.virus, n = v.phases.length + 1;
    assert.ok(s.encounter.actBars, name);
    for (let a = 1; a < n; a++) { breakAll(s); assert.equal(actOf(v), a + 1, `${name}: act ${a + 1}`); assert.ok(livingParts(s).length, `${name}: its board is back`); }
    breakAll(s);
    assert.equal(s.reports.at(-1)?.result, 'victory', `${name}: won on its last act`);
  }
});
