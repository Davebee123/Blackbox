// Mutations that make a fight move: Rerouting (a broken part's attack moves on) and Adaptive
// (a part you keep hitting hardens).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part } from './dist/combat.mjs';
import { MUTATIONS } from './dist/data.mjs';

const start = (mutation) => {
  const s = fresh();
  s.hackers = { breaker: { level: 12, xp: 0 } };
  selectEncounter(s, 'cryptjack', 3, { level: 12, mutation });
  command(s, 'engage');
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, maxArmor: 0, patchAt: null });
  return s;
};

test('the new mutations are in the pool, with a rule each', () => {
  for (const id of ['rerouting', 'adaptive']) assert.ok(MUTATIONS[id]?.rule.length > 20, id);
});

test('Linked (and old Rerouting viruses): a broken part hands a third of its attack damage to the next attacker', async () => {
  const { CONFIG } = await import('./dist/data.mjs');
  const s = start('rerouting');
  const pulse = part(s, 'pulse'), enc = part(s, 'encryptor');
  enc.attack = { ...pulse.attack, name: 'Spark', amount: 10, due: s.encounter.cycle + 3 }; // a second damage attacker
  const before = enc.attack.amount, half = Math.max(1, Math.round(pulse.attack.amount * CONFIG.linked));
  pulse.integrity = 1;
  command(s, 'spike pulse');
  const ev = resolveCycle(s);
  assert.ok(ev.some((x) => x.type === 'reroute' && x.target === 'encryptor'));
  assert.equal(enc.attack.amount, before + half);
  assert.equal(enc.rerouted, half);
});

test('Adaptive: three cycles in a row on one part gives it a chit at the end of the third; switching resets it', () => {
  const s = start('adaptive');
  const p = part(s, 'encryptor');
  p.integrity = p.max = 9999;
  for (let i = 0; i < 2; i++) { command(s, 'spike encryptor'); resolveCycle(s); }
  assert.equal(p.armor, 0, 'two cycles: nothing yet');
  command(s, 'spike pulse'); resolveCycle(s);
  command(s, 'spike encryptor'); resolveCycle(s);
  assert.equal(p.armor, 0, 'a switch resets the count');
  command(s, 'spike encryptor'); resolveCycle(s);
  const ev = (command(s, 'spike encryptor'), resolveCycle(s));
  assert.equal(p.armor, 1, 'third in a row: it adapts');
  assert.ok(ev.some((x) => x.type === 'patch' && x.adapt));
});

test('without the mutation, neither happens', () => {
  const s = start(null);
  const p = part(s, 'encryptor');
  p.integrity = p.max = 9999;
  for (let i = 0; i < 4; i++) { command(s, 'spike encryptor'); resolveCycle(s); }
  assert.equal(p.armor, 0);
});
