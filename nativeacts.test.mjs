// Floor 2's lair bosses in acts (dist/nativeacts.mjs, docs/solo-bosses.md "The act-bars redesign"): each act's own rule.
import test from 'node:test';
import assert from 'node:assert/strict';
import { command, resolveCycle, selectEncounter, part, livingParts, hit } from './dist/combat.mjs';
import { player } from './genesim.mjs';
import { tellsOf } from './dist/tells.mjs';
import { actOf } from './dist/acts.mjs';
import { NATIVE, nativeCharge, nativeTaken, dozer } from './dist/nativeacts.mjs';
import { BOSSES, CONFIG } from './dist/data.mjs';

CONFIG.misses = false; // the rules, not the dice

// A lair boss in its Core, engaged, at level 12 (MIRRORSHADE moves in at 12).
function lair(id, level = 12, seed = 3) {
  const s = player('breaker', 'demolitionist', level), B = BOSSES[id];
  s.rng = 7;
  selectEncounter(s, 'random', seed, { mode: 'run', room: '/core', level, zone: true, wild: 'lair', family: B.family, boss: id, strain: B.strain || null, mutation: null, name: B.name });
  s.encounter.soft = 1;
  command(s, 'engage');
  s.run.max = s.run.integrity = 1e6;
  return s;
}
const breakAll = (s) => { for (const p of s.encounter.virus.parts) p.integrity = 0; command(s, 'hold'); return resolveCycle(s); };
const hold = (s) => { command(s, 'hold'); return resolveCycle(s); };
const ids = (s) => s.encounter.virus.parts.map((p) => p.id);

test('act bars: act 1\'s tells come back with their parts in every act', () => {
  const s = lair('nb-deadbolt'), first = tellsOf(s).list.map((t) => t.id).sort();
  assert.ok(first.includes('deadbolt'));
  breakAll(s);
  assert.equal(actOf(s.encounter.virus), 2);
  assert.deepEqual(tellsOf(s).list.map((t) => t.id).sort(), first, 'act 2 deals them again');
  breakAll(s);
  assert.ok(tellsOf(s).list.every((t) => part(s, t.part)?.integrity > 0), 'act 3: a tell on the Pulse Node, gone from its seat, moves to a part that stands');
});

test('DEADBOLT: Tumblers relocks the Encryptor when a Deadbolt lands; Double lock seats a second Mutex in the Pulse Node\'s place', () => {
  const s = lair('nb-deadbolt');
  breakAll(s);
  const v = s.encounter.virus, k = part(s, 'encryptor');
  assert.equal(v.tumblers, true);
  k.lockHp = 0; k.lockAt = s.encounter.cycle + 3;
  nativeCharge(s, { id: 'overcharge', name: 'Overcharge' });
  assert.equal(k.lockHp, 0, 'only a Deadbolt');
  nativeCharge(s, { id: 'deadbolt', name: 'Deadbolt' });
  assert.equal(k.lockHp, k.lockMax, 'locked again at full');
  assert.equal(k.lockAt, null);
  const order = ids(s);
  breakAll(s);
  assert.equal(v.tumblers, undefined, 'Tumblers leaves with act 2');
  assert.deepEqual(ids(s), order.map((id) => (id === 'pulse' ? 'mutex2' : id)), 'the Mutex II sits where the Pulse Node did');
  assert.ok(part(s, 'encryptor').lockHp > 0, 'locked');
});

test('BACK ORIFICE: Port knock opens one part at a time, the rest take half; act 3 seats a Mirror', () => {
  const s = lair('nb-backorifice');
  breakAll(s);
  const v = s.encounter.virus, open = part(s, v.knock.open), shut = livingParts(s).find((p) => p.kind === 'system' && p !== open);
  assert.ok(open && shut);
  assert.deepEqual([nativeTaken(s, open), nativeTaken(s, shut)], [1, NATIVE.knock.shut]);
  for (let n = 0; n < NATIVE.knock.every; n++) hold(s);
  assert.notEqual(v.knock.open, open.id, 'it moves after 3 cycles');
  open.integrity = 0; // a part that breaks hands the port on at once
  breakAll(s);
  assert.equal(v.knock, undefined);
  assert.ok(ids(s).includes('mirror') && !ids(s).includes('pulse'), 'a Mirror in the Pulse Node\'s seat');
});

test('PATCH TUESDAY: Out of band patches a part that crosses a tick; Hotfix brings the last part back once at 25%', () => {
  const s = lair('nb-patchday');
  breakAll(s);
  const pulse = part(s, 'pulse'), patcher = part(s, 'patcher'), heal = patcher.attack.amount;
  Object.assign(pulse, { armor: 0, integrity: Math.floor(pulse.max * 0.5) + 2 });
  const ev = hit(s, pulse, 4, { pierce: true, flat: true }), after = pulse.integrity;
  assert.equal(ev.broke, false);
  assert.equal(after, Math.floor(pulse.max * 0.5) - 2 + heal, 'patched at once');
  breakAll(s);
  const v = s.encounter.virus, p = part(s, 'pulse'), q = part(s, 'patcher');
  q.integrity = 0;
  hit(s, p, p.integrity, { pierce: true });
  assert.equal(p.integrity, Math.round(p.max * NATIVE.hotfix), 'the last part comes back at 25%');
  hit(s, p, p.integrity, { pierce: true });
  assert.equal(p.integrity, 0, 'once');
  assert.equal(v.hotfix, 'done');
});

test('SLEEPWALKER: dormant at each act\'s start; REM\'s dozer takes double and a hit on it sounds the Alarm; in act 3 it charges', () => {
  const s = lair('nb-sleepwalker');
  breakAll(s);
  const v = s.encounter.virus;
  assert.equal(v.dormant, true, 'asleep again');
  hit(s, part(s, 'pulse'), 1, { pierce: true, mine: true }); // wakes it
  for (let n = 0; n < 3 && !dozer(s); n++) hold(s);
  const d = dozer(s), other = livingParts(s).find((p) => p !== d);
  assert.ok(d, 'a part dozes');
  assert.ok(d.attack.due >= 900, 'its attack waits');
  assert.deepEqual([nativeTaken(s, d), nativeTaken(s, other)], [NATIVE.rem.taken, 1]);
  hit(s, d, 1, { pierce: true, mine: true });
  assert.equal(dozer(s), null, 'awake');
  assert.ok(d.attack.due < 900);
  const ev = hold(s);
  assert.ok(ev.some((x) => x.type === 'server-hit' && /Alarm/.test(x.message)), 'the Alarm lands');
  breakAll(s);
  hit(s, part(s, 'pulse'), 1, { pierce: true, mine: true });
  let t = null;
  for (let n = 0; n < 4 && !t; n++) { hold(s); t = tellsOf(s).list.find((x) => x.id === 'terror' && x.told); }
  assert.ok(t && dozer(s) && t.part === dozer(s).id, 'Night Terror: the dozer charges');
  hit(s, dozer(s), 1, { pierce: true, mine: true });
  assert.ok(!tellsOf(s).list.some((x) => x.id === 'terror'), 'waking it calls the charge off');
});

test('MIRRORSHADE: act 2 the Doppelganger of your first break; act 3 the beat lands as three shards', () => {
  const s = lair('nb-mirrorshade');
  hit(s, part(s, 'pulse'), part(s, 'pulse').integrity, { pierce: true });
  breakAll(s);
  assert.equal(part(s, 'mimic').doppel, 'Pulse Node');
  breakAll(s);
  const v = s.encounter.virus, m = part(s, 'mimic'), t = tellsOf(s).list.find((x) => x.kind === 'mimic');
  assert.equal(v.shatter, true);
  assert.ok(m.mimic && t, 'the Mimic records again, its beat dealt');
  Object.assign(t, { told: true, next: s.encounter.cycle });
  s.encounter.chits = 0; s.encounter.shield = 0;
  command(s, 'spike pulse');
  const shards = resolveCycle(s).filter((x) => x.type === 'server-hit' && /Shard/.test(x.message));
  assert.equal(shards.length, NATIVE.shards);
});
