// The Operator's helper rules (docs/puzzle-fights.md 3.2): a helper's hit is your hit on every lever (a Tripwire, a
// boss's ♛ part, a Spare), the Mimic's beat plays back the helpers on its part that were sent once the beat was said,
// never past the tell ceiling and never through Sudo, Unmask, Echo Cancel, Log Wipe or a Honeypot; and the planner
// keeps its helpers off a beat and off a Tripwire while others stand.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part, active, livingParts, defender } from './dist/combat.mjs';
import { CONFIG, TELL, createVirus } from './dist/data.mjs';
import { tellsOf } from './dist/tells.mjs';
import { planner } from './dist/planner.mjs';
import { boardMarkup } from './dist/view.mjs';
import { helperPlan } from './dist/fightread.mjs';

CONFIG.enemyCrit = 0; // exact numbers: no enemy crits, no misses
CONFIG.misses = false;

// An Operator at a level, in a home fight against a wild virus of a family.
function fight({ level = 12, family = 'ghostroot', seed = 7, sub = null, opts = {} } = {}) {
  const s = fresh();
  s.hackers = Object.fromEntries(['breaker', 'bastion', 'infiltrator', 'operator'].map((c) => [c, { level, xp: 0 }]));
  command(s, 'archetype operator');
  if (sub) command(s, 'subclass operator ' + sub);
  selectEncounter(s, 'random', seed, { level, mutation: null, family, classic: true, ...opts });
  command(s, 'engage');
  s.server.max = s.server.integrity = 5000; // a server that outlasts any test fight
  s.encounter.hardened = 0;
  for (const p of s.encounter.virus.parts) { if (p.attack) p.attack.due = 999; Object.assign(p, { armor: 0, maxArmor: 0 }); }
  return s;
}
const withPart = (family, id, level) => Array.from({ length: 80 }, (_, i) => i + 1).find((seed) => createVirus('random', seed, { family, threat: 9 + level, classic: true }).parts.some((p) => p.id === id));
// The Mimic's beat, said now and landing in n cycles; every other tell quiet.
function beat(s, n) {
  const T = tellsOf(s), e = s.encounter;
  for (const t of T.list) { t.told = false; t.after = 999; }
  const t = T.list.find((x) => x.kind === 'mimic');
  Object.assign(t, { part: 'mimic', told: true, said: e.cycle, next: e.cycle + n, n: null, after: 999, opened: null });
  return t;
}
const step = (s, text = 'hold') => { const ev = command(s, text); assert.ok(!ev.some((x) => x.type === 'warning'), ev.at(-1)?.message); return resolveCycle(s); };
const mimicSeed = () => withPart('ghostroot', 'mimic', 12);
const big = (s, id) => Object.assign(part(s, id), { integrity: 900, max: 900 });

test('the Mimic\'s beat plays back a helper sent after it was said, at the helper\'s size', () => {
  const s = fight({ seed: mimicSeed() });
  big(s, 'mimic');
  beat(s, 1);
  step(s, 'deploy mimic'); // sent on the cycle the beat was said
  const h = s.encounter.helpers[0];
  assert.equal(h.sent, s.encounter.cycle - 1);
  assert.equal(h.by, 'Deploy');
  const before = defender(s).integrity;
  const ev = step(s);
  assert.equal(before - defender(s).integrity, Math.round(h.damage * TELL.mimic), 'its hit, played back at you');
  assert.ok(ev.some((x) => /plays your helper back at you/.test(x.message || '')));
});

test('a helper sent before the beat was said is never caught', () => {
  const s = fight({ seed: mimicSeed() });
  big(s, 'mimic');
  step(s, 'deploy mimic');
  beat(s, 1); // said after the helper went out
  const before = defender(s).integrity;
  step(s);
  assert.equal(defender(s).integrity, before);
});

test('helpers on other parts are free; Unmask, Sudo, Log Wipe, a Honeypot and Echo Cancel blind it to helpers', () => {
  const s = fight({ seed: mimicSeed() });
  big(s, 'mimic');
  const other = livingParts(s).find((p) => p.id !== 'mimic');
  Object.assign(other, { integrity: 900, max: 900 });
  beat(s, 1);
  step(s, `deploy ${other.id}`);
  const hp = defender(s).integrity;
  step(s);
  assert.equal(defender(s).integrity, hp, 'a helper on another part gives it nothing');
  for (const blind of [(e, p) => { p.unmaskUntil = e.cycle + 1; }, (e) => { e.buffs.sudo = e.cycle + 1; }, (e) => { e.mimicBlind = true; }, (e) => { e.buffs.honeypot = e.cycle + 1; }, (e, p) => { p.echoCancelUntil = e.cycle + 1; }]) {
    const b = fight({ seed: mimicSeed() });
    big(b, 'mimic');
    beat(b, 1);
    step(b, 'deploy mimic');
    blind(b.encounter, part(b, 'mimic'));
    const was = defender(b).integrity;
    step(b);
    assert.equal(defender(b).integrity, was, String(blind));
  }
});

test('one beat\'s playback never passes the tell ceiling, however many helpers it catches', () => {
  const s = fight({ seed: mimicSeed() });
  big(s, 'mimic');
  s.server.max = s.server.integrity = 100;
  beat(s, 0);
  const e = s.encounter;
  for (let i = 0; i < 12; i++) e.helpers.push({ target: 'mimic', damage: 40, left: 3, synced: false, sent: e.cycle, by: 'Deploy' });
  step(s);
  const lost = 100 - defender(s).integrity;
  assert.ok(lost > 0 && lost <= Math.round(Math.min(TELL.ceiling, CONFIG.spikeCap.wild) * 100), `lost ${lost}`);
});

test('a helper\'s hit is your hit: it sets off a Tripwire, starts a ♛ part\'s phase and boots a Spare', () => {
  // A Tripwire a helper breaks while the others stand: they go loud.
  const s = fight({ level: 22, family: 'ransomware', seed: withPart('ransomware', 'tripwire', 22) });
  const trip = part(s, 'tripwire');
  trip.integrity = 5;
  s.encounter.helpers.push({ target: 'tripwire', damage: 12, left: 2, synced: false, sent: s.encounter.cycle, by: 'Deploy' });
  step(s);
  assert.ok(!trip.integrity && s.logs.some((x) => x.tripwire), 'TRIPWIRE: the others go loud');
  // A helper's tick across a ♛ part's phase tick starts its next phase.
  const b = fight({ level: 12, family: 'ransomware', seed: 3 });
  const core = livingParts(b).find((p) => p.attack);
  Object.assign(core, { core: true, max: 100, integrity: 52, ticks: [{ at: 0.5, spent: false, phase: 0 }, { at: 0.25, spent: false, phase: 1 }] });
  b.encounter.virus.phases = [{ at: -1, do: [], say: 'Phase 2.' }, { at: -1, do: [], say: 'Phase 3.' }];
  b.encounter.helpers.push({ target: core.id, damage: 12, left: 2, synced: false, sent: b.encounter.cycle, by: 'Deploy' });
  step(b);
  assert.ok(b.logs.some((x) => x.phase && x.tick === 0.5), 'its phase starts');
  // A helper that breaks the signature boots a sleeping Spare.
  const w = fight({ level: 16, family: 'worm', seed: 77, opts: { classic: false, basic: 'pulse', genes: ['spare'] } });
  const sig = part(w, 'replicator'), sp = part(w, 'spare');
  assert.ok(sig && sp);
  sig.integrity = 5;
  w.encounter.helpers.push({ target: sig.id, damage: 12, left: 2, synced: false, sent: w.encounter.cycle, by: 'Deploy' });
  step(w);
  assert.ok(sp.bootAt, 'the Spare boots');
});

test('the planner sends no helper onto the Mimic while a beat it would reach is on the board, and cashes in caught ones', () => {
  const s = fight({ level: 18, seed: mimicSeed(), sub: 'herder' });
  for (const p of livingParts(s)) Object.assign(p, { integrity: 300, max: 300 });
  const e = s.encounter;
  beat(s, 2);
  for (let k = 0; k < 6 && active(s); k++) {
    const move = planner(s);
    const [id, at] = move.split(' ');
    assert.ok(!(['deploy', 'spawn', 'botnet'].includes(id) && at === 'mimic') && id !== 'fan-out', `cycle ${e.cycle}: ${move}`);
    step(s, move);
    if (e.cycle > 3) break;
  }
  // A caught helper on the beat: Kill Switch cashes it in.
  const k = fight({ level: 18, seed: mimicSeed(), sub: 'herder' });
  for (const p of livingParts(k)) Object.assign(p, { integrity: 300, max: 300 });
  const t = beat(k, 0);
  k.encounter.helpers.push({ target: 'mimic', damage: 12, left: 3, synced: false, sent: t.said, by: 'Deploy' });
  assert.equal(planner(k), 'kill-switch');
});

test('the planner sends no helper whose hits would break a Tripwire while others stand', () => {
  const s = fight({ level: 22, family: 'ransomware', seed: withPart('ransomware', 'tripwire', 22) });
  const trip = part(s, 'tripwire');
  for (const p of livingParts(s)) if (p !== trip) Object.assign(p, { integrity: 400, max: 400 });
  trip.integrity = 20;
  for (let k = 0; k < 8 && active(s); k++) {
    const move = planner(s), [id, at] = move.split(' ');
    assert.ok(!(['deploy', 'spawn', 'botnet', 'fan-out'].includes(id) && (at === 'tripwire' || id === 'fan-out')), `cycle ${s.encounter.cycle}: ${move}`);
    step(s, move);
  }
});

test('the board shows each helper\'s hits as pips, a caught one edged red, and where helpers move on', () => {
  const s = fight({ seed: mimicSeed() });
  big(s, 'mimic');
  const t = beat(s, 2);
  const e = s.encounter;
  e.helpers.push({ target: 'mimic', damage: 12, left: 4, synced: false, sent: t.said, by: 'Deploy' });
  const plan = helperPlan(s);
  const mine = plan.pips.filter((x) => x.part === 'mimic');
  assert.deepEqual(mine.map((x) => x.col), [0, 1, 2, 3]);
  assert.deepEqual(mine.filter((x) => x.trips).map((x) => x.col), [2], 'the hit on the beat trips it');
  const html = boardMarkup(s, null);
  assert.match(html, /class="hpip trip"[^>]*title="Deploy: Helper\. Hits the Mimic for 12 on its beat\.\n▸ The Mimic plays it back at you\. Move it or cash it in first\."/);
  // A part about to break: the tether to where its helpers go next.
  const other = livingParts(s).find((p) => p.id !== 'mimic');
  Object.assign(other, { integrity: 5 });
  e.helpers.push({ target: other.id, damage: 12, left: 3, synced: false, sent: e.cycle, by: 'Spawn' });
  const p2 = helperPlan(s);
  assert.ok(p2.moves.some((m) => m.from === other.id), 'a move-on from the breaking part');
  assert.match(boardMarkup(s, null), /tether k-moveon/);
});
