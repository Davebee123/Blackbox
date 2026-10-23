// The capstone row on the Loadout page, and in the level-up (capstones.test.mjs has the rules; this file loads
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
  assert.match(html, /<span class="sk-tl lit"><i><\/i>Lv 45<\/span>/, 'the capstone row, open');
  assert.match(html, new RegExp(`<button type="button" class="sk-tn pick cap" data-sk="t:${ph.id}" aria-pressed="false"><i class="sk-check" aria-hidden="true">✓</i><b>${ph.name}</b><span class="sk-pips" aria-label="2 of 2"><i class="on"></i><i class="on"></i></span>`), 'picked, its two rank pips lit');
  assert.match(html, /<span class="sk-tl lit"><i><\/i>Tier 3<\/span>/, 'the third tier is a tier again');
  const other = SUBS.phantom.capstones[0];
  const panel = loadoutMarkup(s, 'infiltrator', 'skills', { sel: 't:' + other.id });
  assert.match(panel, /data-command="talent infiltrator capstone a"[^>]*>Swap to this</, 'the other one can be swapped in, from its panel');
  assert.match(loadoutMarkup(s, 'infiltrator', 'skills', { sel: 't:' + ph.id }), /Rank 2 at level 50/, 'its panel names its second rank');
  assert.doesNotMatch(html, /undefined|NaN/);
  // The other subclass's tree has its own row, unpicked.
  command(s, 'subclass payload');
  assert.equal(capRank(s, ph.id), 0);
  assert.equal(capState(s, 'infiltrator'), 'blocked', 'a fresh tree');
  // The level-up names them.
  assert.ok(levelGains('breaker', 45).some((g) => /capstone point/.test(g)));
  assert.ok(levelGains('breaker', 50).some((g) => /second rank/.test(g)));
});

