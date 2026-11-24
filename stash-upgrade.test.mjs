// The upgrade mark (view.mjs isUpgrade): a stash protocol that beats what its slot runs wears an amber ▲, and so does
// the Loadout tab (upgradeCount).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, hackerOf, addItem, command } from './dist/combat.mjs';
import { rollItem, seeded } from './dist/gear.mjs';
import { isUpgrade, upgradeCount } from './dist/view.mjs';

test('an unloaded protocol into an empty slot is an upgrade; loaded, it is not; a weaker one is not', () => {
  const s = fresh(); s.tutorialCompleted = true; hackerOf(s).level = 10;
  const good = addItem(s, rollItem(seeded(3), { level: 10, rarity: 'tuned', cls: 'breaker' }));
  assert.ok(isUpgrade(s, good), 'fills an empty slot');
  assert.equal(upgradeCount(s), 1);
  command(s, `load ${good.id}`);
  assert.ok(!isUpgrade(s, good), 'loaded');
  const weak = addItem(s, { ...good, id: undefined, rule: null, stats: Object.fromEntries(Object.entries(good.stats).map(([k, v]) => [k, v / 2])) });
  if (weak) assert.ok(!isUpgrade(s, weak), 'half its stats: no mark');
  const high = addItem(s, rollItem(seeded(5), { level: 30, rarity: 'tuned', cls: 'breaker' }));
  assert.ok(!isUpgrade(s, high), 'above your level: no mark');
});
