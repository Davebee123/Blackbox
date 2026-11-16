// The talent tiers (docs/builds.md): the shared events they fire on (combat.mjs fireEvent) and the save migration from
// ranks and two-way picks (talents.mjs). Each talent's own rule is tested with its class (*-subs.test.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part, restore, takeDamage, hasTalent } from './dist/combat.mjs';
import { CONFIG, SUBS, LOADOUT } from './dist/data.mjs';
import { FX_WHEN, FX_DO } from './dist/content.mjs';
import { onHit } from './dist/interrupt.mjs';
import { tiersRestore } from './dist/talents.mjs';
CONFIG.tells = false;

const fight = (cls, sub) => {
  const s = fresh();
  s.loadout.archetype = cls;
  s.hackers = { [cls]: { level: 50, xp: 0 } };
  s.loadout.sub = { [cls]: sub };
  s.loadout.devKit = { talents: [] };
  selectEncounter(s, 'cryptjack', 7, { level: 6 });
  command(s, 'engage');
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, maxArmor: 0, patchAt: null, integrity: 500, max: 500 });
  return s;
};
const events = (s) => s.encounter.metrics.events || {};
const go = (s, text) => { command(s, text); resolveCycle(s); };

test('the four new events have a name, and gear can heal or shield on them', () => {
  for (const w of ['burn', 'shielded', 'tagged', 'cut']) assert.ok(FX_WHEN[w], w);
  for (const w of ['burn', 'shielded', 'tagged', 'cut']) assert.ok(FX_DO.heal.when.includes(w), w);
  assert.ok(FX_DO.refund.when.includes('cut') && FX_DO.shield.when.includes('cut'));
});

test('burn: one of your burns ticks', () => {
  const s = fight('infiltrator', 'payload');
  for (const p of s.encounter.virus.parts) p.attack = null;
  go(s, 'inject pulse');
  assert.equal(events(s).burn, 1);
  go(s, 'hold');
  assert.equal(events(s).burn, 2);
});

test('shielded: you gain a shield, or your shield absorbs a hit', () => {
  const s = fight('breaker', 'demolitionist');
  for (const p of s.encounter.virus.parts) p.attack = null;
  s.encounter.shield = 10;
  go(s, 'hold');
  assert.equal(events(s).shielded, 1, 'gained');
  go(s, 'hold');
  assert.equal(events(s).shielded, 1, 'holding it is not gaining it');
  takeDamage(s, 4, 'pulse', 'a test hit');
  assert.equal(events(s).shielded, 2, 'it absorbed a hit');
  takeDamage(s, 4, 'pulse', 'a test hit');
  takeDamage(s, 4, 'pulse', 'a test hit');
  assert.equal(events(s).shielded, 4, 'its last 2');
  takeDamage(s, 4, 'pulse', 'a test hit');
  assert.equal(events(s).shielded, 4, 'nothing left to absorb');
});

test('tagged: you hit a Tagged part, whoever Tagged it', () => {
  const s = fight('breaker', 'demolitionist');
  for (const p of s.encounter.virus.parts) p.attack = null;
  go(s, 'spike pulse');
  assert.equal(events(s).tagged, undefined);
  part(s, 'pulse').taggedUntil = s.encounter.cycle + 3; // a crewmate's Tag
  go(s, 'spike pulse');
  assert.equal(events(s).tagged, 1);
});

test('cut: you cut a part\'s move', () => {
  const s = fight('breaker', 'demolitionist'), e = s.encounter, p = part(s, 'pulse');
  e.ticked = true;
  p.ticks = [{ at: 0.5, spent: false }];
  p.attack.due = e.cycle;
  p.integrity = 200;
  onHit(s, p, 500, 300);
  assert.equal(e.metrics.cuts, 1);
  assert.equal(events(s).cut, 1);
});

test('crit, break and struck count too', () => {
  const crit0 = CONFIG.baseCrit;
  CONFIG.baseCrit = 100;
  try {
    const s = fight('breaker', 'demolitionist');
    part(s, 'pulse').integrity = 1;
    go(s, 'spike pulse');
    assert.ok(events(s).crit >= 1 && events(s).break === 1);
  } finally { CONFIG.baseCrit = crit0; }
});

test('the save: ranks and old picks become tier picks where the talent survives; safe to run twice', () => {
  const s = fresh();
  s.hackers = { breaker: { level: 50, xp: 0 }, infiltrator: { level: 50, xp: 0 }, operator: { level: 20, xp: 0 } };
  s.loadout.sub = { breaker: 'demolitionist', infiltrator: 'payload', operator: 'hijacker' };
  s.loadout.ranks = { demolitionist: { shrapnel: 2, 'blast-radius': 3, failsafe: 1 }, payload: {}, hijacker: { 'cold-storage': 2 } };
  s.loadout.picks = { demolitionist: [1, 0, 0], payload: [1], hijacker: [0, 0, 1] };
  const t = restore(JSON.parse(JSON.stringify(s)));
  // Exposed Wiring (a pick) wins tier 1 over Shrapnel (ranks); Total Overkill to tier 4; Cascade Failure (a pick) wins
  // tier 5 over Blast Radius; Failsafe is gone.
  assert.deepEqual(t.loadout.tiers.demolitionist, [2, null, null, 1, 2, null]);
  assert.deepEqual(t.loadout.tiers.payload, [1, null, null, null, null, null], 'Polymorphic lives on as Long Fuse');
  assert.deepEqual(t.loadout.tiers.hijacker, [null, 1, 0, null, 2, null], 'Double Agent, Cold Storage, Kill Chain as Handoff');
  assert.equal(t.loadout.ranks, undefined);
  assert.equal(t.loadout.picks, undefined);
  assert.ok(hasTalent(t, 'exposed-wiring'));
  const again = JSON.parse(JSON.stringify(t));
  tiersRestore(again);
  assert.deepEqual(again.loadout, t.loadout, 'a second run changes nothing');
  assert.equal(LOADOUT.tiers.length, SUBS.demolitionist.tiers.length);
});
