// P4 boss acts (dist/acts.mjs, docs/puzzle-fights.md 7; the solo bosses' own rules: bosses.test.mjs): a beat that repeats, three acts, and the one to leave.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, selectEncounter, part, livingParts, intents, defender } from './dist/combat.mjs';
import { player } from './genesim.mjs';
import { tellsOf } from './dist/tells.mjs';
import { actsOf, actOf, actDone, lashOn, actCap, leaveOf, beatsPlayed, beatOf, nextBeat, ACTS } from './dist/acts.mjs';
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

test('the Backlash is sized from the boss: every part lashes for its biggest plain hit doubled, the Encryptor too', () => {
  const s = boss('resident', 'ransomware'), v = s.encounter.virus, enc = part(s, 'encryptor');
  const plain = (p) => (p.attack ? (p.attack.effect === 'damage' ? p.attack.amount : p.attack.hit) || 0 : 0);
  const base = Math.max(...v.parts.map(plain));
  assert.ok(base > 0 && v.backlash.base === base, 'its biggest plain hit, set as the fight starts');
  assert.ok(plain(enc) < base, 'the Encryptor\'s own hit is smaller');
  const chips = intents(s).filter((i) => i.effect === 'backlash');
  assert.ok(chips.length >= 2 && chips.every((i) => i.amount >= Math.round(base * ACTS.lash)), `every Lash chip shows it (${chips.map((i) => i.amount)})`);
  to(s, v.backlash.first);
  Object.assign(enc, { armor: 0, integrity: 900, max: 900 });
  for (const p of v.parts) if (p.attack) p.attack.due = s.encounter.cycle + 3;
  s.encounter.chits = 0; s.encounter.shield = 0;
  command(s, 'spike encryptor');
  const lash = resolveCycle(s).find((x) => x.type === 'server-hit' && /Backlash/.test(x.message));
  assert.ok(lash && lash.amount > base, `hitting the Encryptor on the beat costs a real hit (${lash?.amount})`);
  // The beat quickens in act 2: the size stays the boss's.
  assert.equal(v.backlash.base, base);
});

test('a hit that breaks the part on the beat is safe', () => {
  const s = boss('resident', 'ransomware'), v = s.encounter.virus, pulse = part(s, 'pulse');
  to(s, v.backlash.first);
  Object.assign(pulse, { armor: 0, integrity: 1 });
  command(s, 'spike pulse');
  assert.ok(!resolveCycle(s).some((x) => x.tell === 'backlash'));
});

test('the ♛ holds at its next tick: one tick a hit, so no act is skipped', () => {
  const s = boss('resident', 'worm'), c = core(s);
  c.armor = 0;
  assert.equal(actCap(s, c), c.integrity - Math.floor(0.5 * c.max));
  c.integrity = Math.floor(0.5 * c.max);
  c.ticks[0].spent = true;
  assert.equal(actCap(s, c), c.integrity - Math.floor(0.25 * c.max));
});

test('the one to leave: the ♛ taken under its tick before the beat plays re-arms every part', () => {
  const s = boss('resident', 'ransomware'), c = core(s), v = s.encounter.virus;
  assert.equal(actOf(v), 1);
  assert.ok(!actDone(s) && beatsPlayed(s) === 0, 'no beat yet');
  assert.ok(leaveOf(s) && !leaveOf(s).done, 'the board holds its tick');
  const pulse = part(s, 'pulse');
  pulse.armor = 0;
  Object.assign(c, { armor: 0, integrity: Math.floor(0.5 * c.max) + 2 });
  command(s, 'overload ' + c.id);
  const ev = resolveCycle(s);
  assert.ok(ev.some((x) => x.early), 'too soon');
  assert.ok(pulse.armor > 0, 'every part re-arms');
  assert.equal(actOf(v), 2, 'the next act still starts');
});

test('after the beat plays, the ♛ goes under its tick with no re-arm', () => {
  const s = boss('resident', 'ransomware'), c = core(s), v = s.encounter.virus;
  to(s, v.backlash.first + 1);
  assert.ok(actDone(s));
  const pulse = part(s, 'pulse');
  pulse.armor = 0;
  Object.assign(c, { armor: 0, integrity: Math.floor(0.5 * c.max) + 2 });
  command(s, 'overload ' + c.id);
  assert.ok(!resolveCycle(s).some((x) => x.early));
  assert.equal(pulse.armor, 0);
});

test('each act deals its own tell: act 1 its first, the rest wait', () => {
  const s = boss('resident', 'ransomware', 18), T = tellsOf(s);
  assert.deepEqual(T.list.filter((t) => t.kind !== 'mimic').map((t) => t.act), [1, 2, 3]);
  defender(s).integrity = defender(s).max = 1e6;
  for (let c = 0; c < 10; c++) { command(s, 'hold'); resolveCycle(s); assert.ok(T.list.every((t) => !(t.act > 1 && t.told)), 'only act 1\'s tell is said in act 1'); }
  assert.ok(T.list.some((t) => t.act === 1 && (t.told || t.count)), 'act 1\'s is');
});

test('act 2 quickens the beat', () => {
  const s = boss('resident', 'worm'), v = s.encounter.virus, c = core(s);
  const every = v.backlash.every;
  to(s, v.backlash.first + 1);
  Object.assign(c, { armor: 0, integrity: Math.floor(0.5 * c.max) + 2 });
  command(s, 'overload ' + c.id);
  resolveCycle(s);
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

test("a part's own attack as the beat: it counts as played once it has landed, so the ♛ may go on", () => {
  const s = boss('relayking'), r = part(s, 'relay');
  assert.equal(beatsPlayed(s), 0);
  const c = nextBeat(s);
  assert.equal(c, r.attack.due, 'the beat falls where the Broadcast lands');
  to(s, c + 1);
  assert.equal(beatsPlayed(s), 1);
  assert.ok(actDone(s));
});

test('a fresh save is untouched: no boss state outside a fight', () => {
  assert.equal(fresh().encounter, null);
});
