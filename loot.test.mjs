import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, part, FAST } from './dist/combat.mjs';
import { play, connect, packGain, hasKit, hasBlueprint, sourceOf } from './dist/run.mjs';
import { CONFIG } from './dist/data.mjs';
import { newOn, sawTab, gainMarkup, spoilsOf } from './dist/view.mjs';
CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.misses = false;

const win = (s) => {
  for (const p of s.encounter.virus.parts) Object.assign(p, { integrity: 0, armor: 0 });
  const p = s.encounter.virus.parts[0];
  p.integrity = 1;
  command(s, 'spike ' + p.id);
  return resolveCycle(s);
};

test('pack gains: each kind of file reads as a spoils row', () => {
  assert.deepEqual(packGain({ kind: 'credits', amount: 40 }).qty, '+40');
  assert.equal(packGain({ kind: 'credits', amount: 40 }, 46).qty, '+46'); // after Scavenge
  assert.equal(packGain({ kind: 'code', material: 'exploit', amount: 2 }).kind, 'exploit');
  assert.equal(packGain({ kind: 'blueprint' }).sub, '???');
  const g = packGain({ kind: 'gear', item: { name: 'x', rarity: 'tuned', stats: { power: 3 }, slot: 'payload' } });
  assert.equal(g.rarity, 'tuned');
  assert.match(gainMarkup('Pulled', '', [g], false), /Pulled/);
  assert.doesNotMatch(gainMarkup('Pulled', '', [g], false), /data-gain-go/);
  assert.match(gainMarkup('Banked', 'srv', [g]), /data-gain-go/);
});

test('pull says what you got; jack out lists everything banked', () => {
  const s = fresh();
  command(s, 'developer location worm');
  const loc = s.locations[0];
  assert.ok(loc.starter && hasKit(loc) && hasBlueprint(loc), 'your first vault has a protocol and a blueprint');
  Object.assign(loc, { template: 'relay', quirk: null });
  connect(s, loc.id);
  play(s, 'cd relay');
  command(s, 'engage');
  win(s);
  play(s, `unlock vault ${loc.password}`);
  play(s, 'cd vault');
  const pulled = play(s, 'pull kit.bin').find((e) => e.gain);
  assert.equal(pulled.gain.kind, 'item');
  play(s, 'pull blueprint.bp');
  const out = play(s, 'jack out').find((e) => e.type === 'jacked-out');
  const kinds = out.gains.map((r) => r.kind);
  assert.ok(kinds.includes('blueprint') && kinds.includes('item')); // (and whatever the guard dropped)
  assert.equal(new Set(out.gains.filter((r) => r.kind === 'code').map((r) => r.label)).size, kinds.filter((k) => k === 'code').length, 'code: one row per material');
});

test('vaults: protocols in about half, blueprints and source in about a quarter', () => {
  const locs = Array.from({ length: 400 }, (_, i) => ({ seed: 1000 + i * 37, depth: 2 }));
  const share = (f) => locs.filter(f).length / locs.length;
  assert.ok(Math.abs(share(hasKit) - 0.5) < 0.1);
  assert.ok(Math.abs(share(hasBlueprint) - 0.25) < 0.08);
  assert.ok(Math.abs(share(sourceOf) - 0.25) < 0.08);
});

test('new badges: what arrived since you last opened the tab', () => {
  const s = fresh();
  assert.equal(newOn(s, 'loadout'), 0);
  s.stash.push({ id: 'g99' });
  s.daemonsOwned = { mirror: 1 };
  assert.equal(newOn(s, 'loadout'), 1);
  assert.equal(newOn(s, 'daemons'), 1);
  sawTab(s, 'loadout');
  assert.equal(newOn(s, 'loadout'), 0);
  s.daemonsOwned.mirror = 2; // an upgrade is new too
  assert.equal(newOn(s, 'daemons'), 1);
});

test('fast kills: beating your own usual pace pays more XP, and shows on the spoils', () => {
  const s = fresh();
  s.par = { [s.loadout.archetype]: { n: FAST.after, rate: 100 } }; // you usually take ages
  command(s, 'encounter cryptjack');
  command(s, 'engage');
  const events = win(s);
  const fast = events.find((e) => e.type === 'fast-kill');
  assert.ok(fast && fast.amount > 0);
  const rows = spoilsOf(events);
  assert.ok(rows.some((r) => r.kind === 'fast'));
  assert.equal(rows.filter((r) => r.kind === 'xp').length, 1); // one XP row, the bonus included
  // Not fast against your first few kills: there's no pace yet.
  const t = fresh();
  command(t, 'encounter cryptjack');
  command(t, 'engage');
  assert.ok(!win(t).some((e) => e.type === 'fast-kill'));
});
