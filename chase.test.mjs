// The hubs' chase protocols (chase.mjs, gear.mjs ZERO_DAYS chase): each rule once, on a real fight's state.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, addItem, takeDamage, classEach, defender, livingParts, hooks } from './dist/combat.mjs';
import { CHASE_HOOKS, CHASE_FX } from './dist/chase.mjs';
import { IMPLICIT_HOOKS } from './dist/faction-gear.mjs';
import { chaseItem, CHASE } from './dist/store.mjs';
import { ZERO_DAYS, rarityName, CHASE_LINE } from './dist/gear.mjs';
import { CONFIG } from './dist/data.mjs';

hooks.now = () => Date.UTC(2026, 0, 1);
const factionOf = (id) => Object.keys(CHASE).find((f) => CHASE[f].some(([x]) => x === id));
// A level 20 fight at home with one chase protocol loaded (or none).
function fight(id) {
  const s = fresh();
  s.tutorialCompleted = true;
  command(s, 'developer level 20');
  if (id) { addItem(s, chaseItem(s, factionOf(id), id)); command(s, 'load ' + s.stash.at(-1).id); }
  command(s, 'encounter cryptjack'); command(s, 'engage');
  return s;
}
const e = (s) => s.encounter;

test('every chase line: a name, its protocols with their faction and implicit, a slot each', () => {
  for (const [f, line] of Object.entries(CHASE)) for (const [id] of line) {
    const it = chaseItem(fresh(), f, id);
    assert.ok(ZERO_DAYS[id].chase, id);
    assert.equal(it.rarity, 'indemnified');
    assert.equal(it.implicit, f, `${id} carries ${f}'s implicit`);
    assert.equal(rarityName(it), CHASE_LINE[f]);
  }
});

test('Failover: once a fight, a hit that would take you under 25% leaves you at 25%', () => {
  const s = fight('failover'), d = defender(s), floor = Math.ceil(d.max * CHASE_FX.failover);
  takeDamage(s, d.max * 2, 'x', 'Test');
  assert.equal(d.integrity, floor);
  d.integrity = d.max;
  takeDamage(s, d.max * 2, 'x', 'Test');
  assert.ok(d.integrity < floor, 'once a fight');
});

test('Shell Company: the first hit that would take you under 75% deals half', () => {
  const lost = (id) => { const s = fight(id), d = defender(s), was = d.integrity; takeDamage(s, Math.round(d.max * 0.5), 'x', 'Test'); return was - d.integrity; };
  const plain = lost(null), shell = lost('shell-company');
  assert.ok(shell <= plain * 0.55 + 1, `${shell} against ${plain}`);
});

test('Golden Parachute: once a fight, falling under 25% heals you to 50%', () => {
  const s = fight('golden-parachute'), d = defender(s);
  d.integrity = Math.floor(d.max * 0.2);
  classEach('struck', s, { name: 'Test' }, 5, livingParts(s)[0]);
  assert.ok(d.integrity >= Math.floor(d.max * 0.5), `${d.integrity} of ${d.max}`);
  d.integrity = Math.floor(d.max * 0.2);
  classEach('struck', s, { name: 'Test' }, 5, livingParts(s)[0]);
  assert.equal(d.integrity, Math.floor(d.max * 0.2), 'once a fight');
});

test('Black Budget: above 75% health your crits deal 50% more', () => {
  const s = fight('black-budget'), d = defender(s), p = livingParts(s)[0];
  assert.equal(CHASE_HOOKS.critDealt(s, p, { mine: true }), CHASE_FX.budgetCrit);
  d.integrity = Math.floor(d.max * 0.5);
  assert.equal(CHASE_HOOKS.critDealt(s, p, { mine: true }), 1);
});

test('Escrow: a break\'s overflow is held, then lands with your next hit', () => {
  const s = fight('escrow'), [a, b] = livingParts(s);
  CHASE_HOOKS.hit(s, a, { dealt: 10, overflow: 40, broke: true }, { mine: true });
  assert.equal(e(s).fxs.chase.bank, 40);
  const was = b.integrity;
  CHASE_HOOKS.hit(s, b, { dealt: 5, overflow: 0, broke: false }, { mine: true });
  assert.equal(e(s).fxs.chase.bank, 0);
  assert.ok(b.integrity < was, 'paid into the next hit');
});

test('Cold Aisle: after a break, cooldowns tick one extra cycle for 2 cycles', () => {
  const s = fight('cold-aisle'), c = e(s).cycle;
  e(s).readyAt.test = c + 10;
  CHASE_HOOKS.broke(s, livingParts(s)[0]);
  for (let i = 0; i < 3; i++) CHASE_HOOKS.cycleEnd(s);
  assert.equal(e(s).readyAt.test, c + 8);
});

test('Dead Air: a cycle no attack reached you ticks your cooldowns; a blocked one does not', () => {
  const s = fight('dead-air'), c = e(s).cycle;
  e(s).readyAt.test = c + 10;
  CHASE_HOOKS.cycleEnd(s);
  assert.equal(e(s).readyAt.test, c + 9);
  e(s).reached = e(s).cycle;
  CHASE_HOOKS.cycleEnd(s);
  assert.equal(e(s).readyAt.test, c + 9);
});

test('Carrier Wave: Clean Signal holds through the first hit each fight', () => {
  const s = fight('carrier-wave'), p = livingParts(s)[0];
  IMPLICIT_HOOKS.start(s);
  e(s).fxs.imp.clean = 2;
  classEach('struck', s, { name: 'Test' }, 5, p);
  assert.equal(e(s).fxs.imp.clean, 2);
  classEach('struck', s, { name: 'Test' }, 5, p);
  assert.equal(e(s).fxs.imp.clean, 0, 'once a fight');
});

test('Numbers Station: at full Clean Signal the hit goes out to every part, and spends the stacks', () => {
  const s = fight('numbers-station'), [a, b] = livingParts(s);
  IMPLICIT_HOOKS.start(s);
  e(s).fxs.imp.clean = CHASE_FX.clean;
  e(s).commanding = { id: 'spike' };
  b.armor = 0;
  const was = b.integrity;
  CHASE_HOOKS.hit(s, a, { dealt: 20, overflow: 0, broke: false }, { mine: true });
  assert.ok(b.integrity < was);
  assert.equal(e(s).fxs.imp.clean, 0);
});

test('Refrain: the same skill twice in a row, and the second cools in half the time', () => {
  const s = fight('refrain'), c = e(s).cycle;
  CHASE_HOOKS.used(s, { id: 'spike' });
  e(s).readyAt.spike = c + 4;
  CHASE_HOOKS.used(s, { id: 'spike' });
  assert.equal(e(s).readyAt.spike, c + 2);
});

test('Round: Chorus\'s second hit lands on another part too', () => {
  CONFIG.misses = false;
  const s = fight('round'), [a, b] = livingParts(s);
  IMPLICIT_HOOKS.start(s);
  b.armor = 0;
  const was = b.integrity;
  IMPLICIT_HOOKS.used(s, { id: 'spike', target: a, res: { dealt: 5 } });
  IMPLICIT_HOOKS.used(s, { id: 'spike', target: a, res: { dealt: 5 } });
  assert.ok(b.integrity < was);
});

test('Crescendo: each repeat of the same skill deals 15% more, up to 60%, until another', () => {
  const s = fight('crescendo'), p = livingParts(s)[0], opts = { mine: true };
  e(s).commanding = { id: 'spike' };
  assert.equal(CHASE_HOOKS.dealt(s, p, opts), 1);
  const m = [];
  for (let i = 0; i < 6; i++) { CHASE_HOOKS.used(s, { id: 'spike' }); m.push(+CHASE_HOOKS.dealt(s, p, opts).toFixed(2)); }
  assert.deepEqual(m, [1.15, 1.3, 1.45, 1.6, 1.6, 1.6]);
  CHASE_HOOKS.used(s, { id: 'flood' });
  assert.equal(CHASE_HOOKS.dealt(s, p, opts), 1);
});
