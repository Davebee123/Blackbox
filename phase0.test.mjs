// Phase 0 of the pre-multiplayer review: the systems bugs it found, each pinned down.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle } from './dist/combat.mjs';
import { CONFIG, SERVER } from './dist/data.mjs';
import { rollItem, seeded } from './dist/gear.mjs';
import { changeRep, rep } from './dist/factions.mjs';

test('wild viruses mutate by level: none below 4, a quarter to 9, then 40%', () => {
  const rate = (L) => { let m = 0; for (let i = 1; i <= 400; i++) { const s = fresh(); selectEncounter(s, 'random', i, { mode: 'run', room: '/x', level: L, zone: true }); if (s.encounter.virus.mutation) m++; } return m / 400; };
  assert.equal(rate(3), 0);
  assert.ok(Math.abs(rate(6) - 0.25) < 0.06);
  assert.ok(Math.abs(rate(12) - 0.4) < 0.06);
  assert.equal(SERVER.mutationChance(3), 0);
});

test('Rerouting works on families whose survivor isn\'t a damage part: the Encryptor gains a hit', () => {
  const s = fresh();
  selectEncounter(s, 'cryptjack', 3, { level: 8, mutation: 'rerouting' }); command(s, 'engage');
  const pulse = s.encounter.virus.parts.find((p) => p.id === 'pulse');
  Object.assign(pulse, { armor: 0, integrity: 1 });
  command(s, 'spike pulse');
  const ev = resolveCycle(s);
  assert.ok(ev.some((e) => e.type === 'reroute'));
  assert.ok(s.encounter.virus.parts.find((p) => p.id === 'encryptor').attack.hit > 0);
});

test('Worm fragments take their health from the virus\'s health scale, not its damage', () => {
  const s = fresh();
  selectEncounter(s, 'splinter', 3, { mode: 'run', room: '/x', level: 50 });
  const v = s.encounter.virus;
  assert.ok(Math.round(CONFIG.fragmentIntegrity * v.hpPower) < v.parts[0].max, 'a fragment is smaller than the Pulse Node');
});

test('the Bouncer\'s Keyring overheats after three re-arms', () => {
  const s = fresh();
  s.run = { loc: 'sim', cwd: '/', integrity: 999, max: 999, pack: [], visited: ['/'] };
  selectEncounter(s, 'bouncer', 3, { mode: 'run', room: '/x', level: 6 });
  command(s, 'engage');
  const gate = s.encounter.virus.parts.find((p) => p.name === 'Gate');
  gate.attack = null;
  let rearms = 0;
  for (let c = 0; c < 30 && s.encounter?.phase === 'active'; c++) { gate.armor = 0; command(s, 'hold'); rearms += resolveCycle(s).filter((e) => e.type === 'patch' && /re-arms/.test(e.message)).length; }
  assert.equal(rearms, CONFIG.rearmMax);
});

test('rep ripples use what actually changed, and Halcyon ripples never push a rival below 0', async () => {
  const { rippleRep } = await import('./dist/factions.mjs');
  const s = fresh();
  s.standing = { halcyon: 100, glassjaw: 5, kestrel: 100, nullchoir: 5, lantern: 10 };
  const ng = rep(s, 'nullchoir');
  changeRep(s, 'kestrel', 10, 'test'); // already 100: nothing changes, nothing ripples
  assert.equal(rep(s, 'nullchoir'), ng);
  rippleRep(s, 'halcyon', 40, { soft: true }); // Halcyon's rivals lose, but stop at 0
  for (const f of ['glassjaw', 'nullchoir']) assert.ok(rep(s, f) >= 0, f);
});

test('the Watchman holds its bar when upgraded: v3 still fires, and twice a fight', async () => {
  const { DAEMONS } = await import('./dist/data.mjs');
  const { watchmanBar } = await import('./dist/combat.mjs');
  const s = fresh();
  const bar1 = watchmanBar(s);
  s.daemonsOwned = { watchman: 3 }; s.daemons = ['watchman'];
  assert.equal(watchmanBar(s), bar1, 'the version doesn\'t raise the bar');
  assert.match(DAEMONS.watchman.rule, /at v3 it works twice a fight/);
});

test('Implants drop and compile from item level 15', () => {
  const r = seeded(9);
  const groups = new Set(Array.from({ length: 200 }, () => rollItem(r, { level: 16, rarity: 'tuned' }).group));
  assert.ok(groups.has('implant'));
  assert.ok(!new Set(Array.from({ length: 200 }, () => rollItem(r, { level: 10 }).group)).has('implant'));
});

test('board offers last 15 minutes', async () => {
  const { MAIL } = await import('./dist/mail.mjs');
  assert.deepEqual(MAIL.offerLife, [15 * 60000, 15 * 60000]);
});
