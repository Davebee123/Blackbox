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

const RESIDENTS = ['worm', 'ransomware', 'ghostroot', 'botnet', 'cryptominer', 'logicbomb']; // every family a floor 1–2 server has
test('the Residents of floors 1–2 and the three solo bosses are P4 bosses; a deeper family\'s Resident is not yet', () => {
  for (const [id, fam] of [...RESIDENTS.map((f) => ['resident', f]), ['relayking'], ['repoman'], ['choir']]) assert.ok(actsOf(boss(id, fam).encounter.virus), `${id} ${fam || ''}`);
  assert.equal(actsOf(boss('resident', 'wiper').encounter.virus), null);
});

test('the Resident names its act 1 as the fight opens (the act break\'s strip); a boss with no act 1 name does not', () => {
  for (const fam of RESIDENTS) {
    const ev = boss('resident', fam).logs.filter((l) => l.type === 'act-open');
    assert.equal(ev.length, 1, fam);
    assert.deepEqual([ev[0].act.n, ev[0].act.of, ev[0].act.name], [1, 3, 'Backlash'], fam);
  }
  assert.equal(boss('repoman').logs.filter((l) => l.type === 'act-open').length, 0);
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

// A lash on the Pulse Node: on the beat, a hit it outlives.
function lash(s) {
  const v = s.encounter.virus, pulse = part(s, 'pulse');
  while (!lashOn(s, pulse)) { command(s, 'hold'); resolveCycle(s); }
  Object.assign(pulse, { armor: 0, integrity: 500, max: 500 });
  pulse.attack.due = s.encounter.cycle + 3;
  defender(s).integrity = defender(s).max = 1e6;
  command(s, 'spike pulse');
  return resolveCycle(s);
}

test("the Resident's acts: the Watchdog in act 2 only; in act 3 the worm's lash hatches and the ransomware's encrypts", async () => {
  const { watchdogIn } = await import('./dist/combat.mjs');
  const { boardMarkup } = await import('./dist/view.mjs');
  const s = boss('resident', 'worm'), v = s.encounter.virus;
  assert.equal(watchdogIn(s), null, 'no Watchdog in act 1');
  breakAll(s);
  assert.equal(actOf(v), 2);
  assert.equal(watchdogIn(s), BOSSES.resident.watchdog.every - 1, 'act 2 brings it, counted from its first cycle');
  breakAll(s);
  assert.equal(watchdogIn(s), null, 'it leaves with act 2');
  assert.match(boardMarkup(s), /Outbreak\nBoss rule/);
  const frags = () => livingParts(s).filter((p) => p.kind === 'fragment').length, was = frags();
  const ev = lash(s);
  assert.ok(ev.some((x) => x.tell === 'backlash'));
  assert.equal(frags(), was + 1, 'Outbreak: the lash hatched a fragment');
  // The ransomware's Lockdown: a lash encrypts you.
  const r = boss('resident', 'ransomware');
  breakAll(r); breakAll(r);
  assert.ok(intents(r).some((i) => i.effect === 'backlash' && i.plus === 'encrypts you'), 'the lash chip says so');
  r.encounter.encrypt = 0;
  lash(r);
  assert.ok(r.encounter.encrypt > 0, 'Lockdown: the lash encrypted you');
});

test("the Resident's act 3 by family: Static scrambles you, Rally brings a Zombie back, Full load steps the Hash, Live wire burns the fuse", async () => {
  await import('./dist/families.mjs');
  const { boardMarkup } = await import('./dist/view.mjs');
  const act3 = (fam) => { const s = boss('resident', fam); breakAll(s); breakAll(s); return s; };
  const plus = (s, says) => intents(s).some((i) => i.effect === 'backlash' && i.plus === says);
  // Static: a lash scrambles you while the Scrambler stands.
  const g = act3('ghostroot');
  assert.match(boardMarkup(g), /Static\nBoss rule/);
  assert.ok(plus(g, 'scrambles you'));
  lash(g);
  assert.ok(g.logs.some((l) => l.type === 'blind' && /^Static lands/.test(l.message)), 'Static: the lash scrambled you');
  // Rally: with a Zombie down, a lash brings it back at full.
  const b = act3('botnet'), z = b.encounter.virus.parts.find((x) => x.zombie);
  assert.ok(!plus(b, 'rallies a Zombie'), 'nothing to rally while every Zombie stands');
  z.integrity = 0;
  assert.ok(plus(b, 'rallies a Zombie'));
  lash(b);
  assert.equal(z.integrity, z.max, 'Rally: the Zombie is back');
  // Full load: a lash steps the Hash up twice.
  const c = act3('cryptominer'), rig = part(c, 'rig'), was = rig.attack.step || 0;
  lash(c);
  assert.ok((rig.attack.step || 0) >= was + 2, 'Full load: two steps on the Hash');
  // Live wire: a lash burns 2 off the Payload's fuse.
  const { fuseLeft } = await import('./dist/families.mjs');
  const l = act3('logicbomb'), pay = part(l, 'payload'), v = l.encounter.virus, f = fuseLeft(v, pay);
  assert.ok(plus(l, 'burns the fuse'));
  lash(l);
  assert.equal(fuseLeft(v, pay), f - 2, 'Live wire: 2 off the fuse');
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
  const solo = Object.keys(BOSSES).filter((k) => !BOSSES[k].raid && BOSSES[k].phases?.length).flatMap((k) => (k === 'resident' ? [...RESIDENTS, 'wiper'].map((f) => [k, f]) : [[k, BOSSES[k].family]]));
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
