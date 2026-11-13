// The floor 5 bosses (floorbosses.mjs, docs/boss-guide.md "Floor 5", GAME_RULES.md "Floor bosses"): GRACE PERIOD's Grace
// and EXIT NODE's Rollback, their act ticks, where they stand and what they drop.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, livingParts, attackers, hit, bossTable, lairHeld, bossUniques, UNIQUES } from './dist/combat.mjs';
import { CONFIG, BOSSES } from './dist/data.mjs';
import { tellsOf } from './dist/tells.mjs';
import { boardMarkup } from './dist/view.mjs';
import { FB, fbVerb, fbPower, rollTo } from './dist/floorbosses.mjs';
import { namedBoss } from './dist/arcs.mjs';
import { FLOOR, lairBossFor } from './dist/floors.mjs';
import * as FP from './dist/floorplan.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false; CONFIG.baseCrit = 0;
// A boss fight with its attacks parked and its tells quiet, so nothing lands unless a test says so.
function boss(id, { level = BOSSES[id].floor, cls = 'breaker' } = {}) {
  const s = fresh();
  FP.outfit(s, { cls, level });
  selectEncounter(s, 'random', 7, { level, mutation: null, family: BOSSES[id].family, boss: id });
  command(s, 'engage');
  s.server.max = s.server.integrity = 5000;
  s.encounter.hardened = 0;
  for (const p of attackers(s)) p.attack.due = 999;
  for (const t of tellsOf(s)?.list || []) { t.told = false; t.after = 999; }
  return s;
}
const of = (s, id) => livingParts(s).find((p) => p.id === id);
const hold = (s) => { command(s, 'hold'); return resolveCycle(s); };
const told = (s, id) => (tellsOf(s)?.list || []).find((t) => t.id === id && t.told);

test('the floor 5 bosses: own parts, a ♛, act ticks at 60% and 30% on it and 50% and 25% on the rest, two acts each', () => {
  for (const [id, crown, parts, tells] of [['graceperiod', 'policy', ['policy', 'notice', 'collector', 'rider'], 0], ['exitnode', 'core', ['core', 'v7', 'v6', 'v5'], 0]]) {
    const s = boss(id), v = s.encounter.virus, c = livingParts(s).find((p) => p.core);
    assert.deepEqual(v.parts.map((p) => p.id), parts, id);
    assert.equal(c.id, crown, `${id}'s ♛`);
    assert.deepEqual(c.ticks.map((t) => t.at), [0.6, 0.3], `${id}'s act ticks`);
    for (const p of v.parts.filter((x) => x !== c)) assert.deepEqual(p.ticks.map((t) => t.at), [0.5, 0.25], `${id}'s ${p.name}`);
    assert.equal(v.phases.length, 2);
    assert.equal(tellsOf(s)?.list.length || 0, tells, `${id} deals no tells of its own: its charges are its rule's`);
    assert.ok(BOSSES[id].guide.open.length && BOSSES[id].guide.phases.length === 2, `${id}'s Codex guide`);
    for (const ph of BOSSES[id].phases) assert.ok(ph.name && ph.emote, ph.say);
  }
});

test("GRACE PERIOD's Grace: a command pays a part up; one left alone lapses into a charge your command calls off; each that lands makes the next bigger; the Rider; Reinstatement; Acceleration", () => {
  const s = boss('graceperiod'), e = s.encounter, v = e.virus, [policy, notice, collector, rider] = ['policy', 'notice', 'collector', 'rider'].map((id) => of(s, id));
  assert.deepEqual([policy, notice, collector, rider].map((p) => p.grace), [3, 4, 5, 6], 'staggered: left alone, one lapses at a time');
  // Your command pays it up, at the cycle's end: any command on it, a Crack that deals nothing too.
  notice.grace = 1;
  command(s, 'crack notice'); resolveCycle(s);
  assert.equal(notice.grace, FB.grace.days, 'paid up');
  assert.ok(notice.lapsedAt == null, 'it never lapsed');
  assert.match(boardMarkup(s), /Grace\nBoss rule/);
  // Left alone, it lapses: its next attack is a charge (its ◆ stay as they are in act 1), its grace starts over.
  for (const p of [policy, notice, rider]) p.grace = 9;
  collector.integrity = collector.max = 5000; // nothing breaks it
  collector.grace = 1; collector.armor = 0; collector.attack.due = e.cycle + 2;
  hold(s);
  assert.equal(collector.armor, 0, 'no ◆ back in act 1');
  assert.ok(told(s, 'lapse:collector'), 'its next attack is a charge');
  assert.equal(collector.grace, FB.grace.days);
  // Your command on it before it lands calls the charge off.
  command(s, 'spike collector'); resolveCycle(s);
  assert.ok(!told(s, 'lapse:collector'), 'paid: called off');
  assert.ok(!v.grace.fees);
  // Unpaid, it lands, and every later lapse charge is bigger.
  collector.grace = 1; collector.attack.due = e.cycle + FB.grace.lead;
  hold(s);
  const t = told(s, 'lapse:collector');
  assert.ok(t && !t.mult, 'a first charge at its plain size, said a cycle or more ahead');
  while (told(s, 'lapse:collector')) hold(s);
  assert.equal(v.grace.fees, 1, 'it landed');
  assert.match(boardMarkup(s), /Balance\nBoss rule/);
  notice.grace = 1; notice.attack.due = e.cycle + 3;
  hold(s);
  assert.equal(told(s, 'lapse:notice')?.mult, 1 + FB.grace.fee, 'the next one, on any part, is bigger');
  // Attacking only the ♛ is punished: every other part lapses on its own clock.
  for (const p of [policy, notice, collector, rider]) p.grace = 2;
  for (const p of [collector, rider]) p.attack.due = e.cycle + 5;
  command(s, 'crack policy'); resolveCycle(s); command(s, 'crack policy'); resolveCycle(s);
  assert.ok(told(s, 'lapse:rider'), 'the rest lapse (the Rider, untouched)');
  assert.ok(!told(s, 'lapse:policy'));
  // The Rider: the rest hit 15% harder while it stands.
  const atk = policy.attack;
  assert.ok(Math.abs(fbPower(s, policy, atk) - (1 + FB.grace.rider)) < 1e-9);
  assert.equal(fbPower(s, rider, rider.attack), 1, 'never its own');
  rider.integrity = 0;
  assert.equal(fbPower(s, policy, atk), 1, 'the Rider broken');
  // Reinstatement: a lapse refills the part's ◆ too.
  fbVerb(s, 'reinstate');
  for (const p of [policy, notice, collector]) p.grace = 9;
  notice.grace = 1; notice.armor = 0; hold(s);
  assert.equal(notice.armor, notice.maxArmor, 'its ◆ refill');
  assert.ok(notice.repatched, 'Late Fee reads it');
  // Acceleration: grace is 2, and a lapse takes a cycle off every other part's.
  fbVerb(s, 'accelerate');
  assert.equal(v.grace.days, FB.grace.accel);
  assert.ok(livingParts(s).every((p) => p.grace <= FB.grace.accel));
  policy.grace = 2; notice.grace = 1; collector.grace = 2;
  command(s, 'spike policy'); resolveCycle(s);
  assert.equal(notice.lapsedAt, e.cycle - 1);
  assert.deepEqual([policy.grace, collector.grace], [1, FB.grace.accel], 'a lapse takes a cycle off the rest, the one just paid too (once a cycle); one it takes to 0 lapses: the chain');
  assert.equal(collector.lapsedAt, e.cycle - 1, 'the Collector lapses with it');
});

test("EXIT NODE's Rollback: the Front; every 6 cycles its bars go back 2 cycles and a quarter lands on you; a broken part stays broken; Glass Cut; Kept charges; Cold image", () => {
  const s = boss('exitnode'), e = s.encounter, v = e.virus, R = v.roll, [core, v7, v6, v5] = ['core', 'v7', 'v6', 'v5'].map((id) => of(s, id));
  // The Front: a one-part command at the Core lands on Backup v7 while it stands.
  for (const p of [core, v7]) p.armor = 0;
  v7.integrity = v7.max = 5000; // nothing spills over
  const c0 = core.integrity, f0 = v7.integrity;
  command(s, 'spike core'); resolveCycle(s);
  assert.equal(core.integrity, c0, 'the Core takes nothing');
  assert.ok(v7.integrity < f0, 'Backup v7 takes it');
  assert.match(boardMarkup(s), /Front\nBoss rule/);
  assert.match(boardMarkup(s), /Rollback\nBoss rule/);
  // Damage before the image stays; damage in the 2 cycles before the restore is undone, and a quarter of it lands on you.
  v5.integrity = v5.max = 5000;
  while (e.cycle < R.at - FB.roll.back) hold(s);
  hit(s, v5, 300, { pierce: true, server: true }); // before the image
  hold(s);
  const kept = v5.integrity, img = R.images[R.at - FB.roll.back];
  assert.equal(img.v5.hp, kept, 'the image holds that damage');
  hit(s, v5, 200, { pierce: true, server: true });
  hit(s, v6, v6.integrity, { pierce: true, server: true }); // broken outright inside the window
  core.attack.due = e.cycle + 7; core.attack.interval = 9; // its next attack lands in the next restore's window
  const sig = s.server.integrity, before = v5.integrity;
  while (e.cycle < R.at) hold(s);
  hold(s);
  assert.equal(v5.integrity, kept, 'the window\'s damage undone');
  assert.equal(v6.integrity, 0, 'a broken part stays broken');
  assert.equal(sig - s.server.integrity, Math.round((kept - before) * FB.roll.charge), 'Chargeback: a quarter of what it gave back');
  assert.equal(R.at, e.cycle + FB.roll.every - 1, 'the next restore, 6 cycles on');
  // Glass Cut: after the restore the Core's next attack, in the next window, is a charge.
  const gc = tellsOf(s).list.find((t) => t.told && /^glass:/.test(t.id));
  assert.ok(gc && gc.part === 'core', 'the Core charges');
  // The Core is never restored past its last spent act tick.
  const t60 = core.ticks.find((t) => t.at === 0.6);
  core.integrity = Math.floor(core.max * 0.5); t60.spent = true;
  R.images[R.at - FB.roll.back] = { ...R.images[R.at - FB.roll.back], core: { hp: core.max, armor: 0 } };
  assert.equal(rollTo(s, core).hp, Math.floor(core.max * 0.6));
  // Kept charges: a charge cut in the window comes back at the restore.
  fbVerb(s, 'keptcharges');
  while (e.cycle < R.at - 1) hold(s);
  e.cuts = [{ id: gc.id, name: gc.name, part: 'core', kind: 'charge', cycle: e.cycle }]; // cut inside the window
  core.attack.due = e.cycle + 4;
  hold(s); hold(s);
  assert.ok(told(s, `kept:${gc.id}`), 'Glass Cut comes back at the restore');
  // Cold image: every restore returns to the image taken as Backup v6 broke.
  assert.ok(R.cold, 'taken as v6 broke');
  fbVerb(s, 'coldimage');
  core.integrity = 10;
  while (e.cycle < R.at) hold(s);
  v5.integrity = 1;
  s.server.integrity = 5000;
  hold(s);
  assert.equal(v5.integrity, R.cold.v5.hp, 'back to the cold image');
  assert.equal(core.integrity, Math.min(R.cold.core.hp, Math.floor(core.max * 0.6)), 'the Core no higher than its spent tick');
});

test('where the floor 5 bosses stand: EXIT NODE its floor job\'s, GRACE PERIOD in the lair pool with its pair in the lair\'s roll', () => {
  assert.equal(namedBoss('EXIT NODE'), 'exitnode');
  assert.equal(namedBoss('GRACE PERIOD'), null, 'a lair\'s boss is never a floor job\'s');
  assert.deepEqual(FLOOR.lairs[5], ['graceperiod']);
  assert.equal(lairBossFor(7919, 5), 'graceperiod');
  assert.ok(lairHeld(BOSSES.graceperiod) && !BOSSES.graceperiod.native);
  const s = fresh(), t = bossTable(s, 'graceperiod');
  assert.ok(t.native && t.set === null, 'it pays as a lair');
  assert.deepEqual(t.uniques.map((u) => u.id).filter((id) => ['installment', 'late-fee'].includes(id)).sort(), ['installment', 'late-fee']);
  assert.deepEqual(bossUniques('exitnode').map((u) => u.id).sort(), ['hidden-service', 'tail-circuit']);
  for (const [id, who] of [['installment', 'graceperiod'], ['late-fee', 'graceperiod'], ['hidden-service', 'exitnode'], ['tail-circuit', 'exitnode']]) assert.deepEqual(UNIQUES[id].sources, [{ kind: 'boss', id: who }], id);
});
