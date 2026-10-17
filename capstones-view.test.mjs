// The capstone row on the Loadout page, and in the level-up banner (capstones.test.mjs has the rules; this file loads
// the page, whose imports install the network's fight hooks, so it runs on its own).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, capRank, capState } from './dist/combat.mjs';
import { SUBS } from './dist/data.mjs';
import { build, at } from './balance.mjs';
import { loadoutMarkup } from './dist/view.mjs';
import { levelGains } from './dist/progression.mjs';

const filled = (cls, sub, level) => { const s = fresh(); build(s, cls, at(level), { sub, capstone: null, noGear: true }); return s; };

test('each subclass keeps its own capstone, and the Loadout page draws the row with its rank pips', () => {
  const s = filled('infiltrator', 'phantom', 50);
  command(s, 'talent capstone b');
  const ph = SUBS.phantom.capstones[1];
  assert.equal(capRank(s, ph.id), 2);
  const html = loadoutMarkup(s, 'infiltrator', 'skills');
  assert.match(html, /<b>Capstone<\/b>/);
  assert.match(html, new RegExp(ph.name));
  assert.match(html, /data-command="talent infiltrator capstone a"/, 'the other one can be swapped in');
  assert.match(html, /<b>Tier 3<\/b>/, 'the third tier is a tier again');
  assert.doesNotMatch(html, /undefined|NaN/);
  // The other subclass's tree has its own row, unpicked.
  command(s, 'subclass payload');
  assert.equal(capRank(s, ph.id), 0);
  assert.equal(capState(s, 'infiltrator'), 'blocked', 'a fresh tree');
  // The level-up banner names them.
  assert.ok(levelGains('breaker', 45).some((g) => /capstone point/.test(g)));
  assert.ok(levelGains('breaker', 50).some((g) => /second rank/.test(g)));
});

