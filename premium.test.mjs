// Everything is found or bought (v49; the hubs' Shops are shops.test.mjs): crafting's commands gone, components only sold, and an old save's recipes, plans and source turned into credits and
// the Zero-day (progression.mjs craftRestore).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, restore, SAVE_VERSION, hackerLevel, hooks } from './dist/combat.mjs';
import { tickMarket, travelMs } from './dist/market.mjs';
import { CRAFT_REFUND } from './dist/progression.mjs';
import { STASH_CAP } from './dist/gear.mjs';
import { storeMarkup } from './dist/view.mjs';

const open = (level = 14) => { const s = fresh(); s.tutorialCompleted = true; command(s, 'mail'); s.mail.boardOpen = true; s.hubFound = { kestrel: true }; command(s, `developer level ${level}`); s.server.credits = 50000; return s; };

test('nothing is crafted: compile, filter craft and relay craft say so; components only sell', () => {
  const s = open(14);
  for (const c of ['compile', 'compile crit exploit', 'filter craft grind', 'relay craft']) assert.match(command(s, c).at(-1).message, /found or bought/, c);
  assert.equal(s.recipes, undefined);
  const c0 = s.server.credits;
  command(s, 'market buy kestrel salvage 5');
  assert.equal(s.server.credits, c0, 'hubs don\'t sell components');
});

test('an old save (v48): recipes, filter recipes, the Relay plan and their files become credits; source becomes the Zero-day; contracts pay what took their place', () => {
  const old = fresh();
  Object.assign(old, { version: 48, hackers: { breaker: { level: 20, xp: 0 } } });
  command(old, 'mail');
  old.recipes = ['recipe:damage', 'recipe:crit', 'rootkit'];
  old.filterRecipes = ['grind', 'regen'];
  old.plans = ['relay'];
  old.mail.jobs.push({ id: 900, type: 'kill', reward: { credits: 10, blueprint: true, plan: 'relay', codebase: true } });
  old.store = { slots: [{ key: 's1', id: 'blueprint', price: 1, qty: 1, until: 9e15 }, { key: 's2', id: 'salvage', price: 1, qty: 1, until: 9e15 }, { key: 's3', id: 'cracker', price: 1, qty: 1, until: 9e15 }], serial: 3 };
  const c0 = old.server.credits;
  const s = restore(JSON.parse(JSON.stringify(old)));
  assert.equal(s.version, SAVE_VERSION);
  assert.equal(s.server.credits, c0 + 2 * CRAFT_REFUND.recipe(20) + 2 * CRAFT_REFUND.filter(20) + CRAFT_REFUND.plan(20));
  assert.equal(CRAFT_REFUND.recipe(20), 300); assert.equal(CRAFT_REFUND.filter(20), 180); assert.equal(CRAFT_REFUND.plan(20), 280);
  assert.ok(s.stash.some((it) => it.zeroDay === 'rootkit' && it.level === 20), 'the Rootkit source, built at your level');
  for (const k of ['recipes', 'filterRecipes', 'plans']) assert.equal(s[k], undefined, k);
  const job = s.mail.jobs.find((j) => j.id === 900);
  assert.deepEqual(job.reward, { credits: 10 + CRAFT_REFUND.recipe(20), relay: 1, drop: true });
  assert.ok(!s.store, 'the agency stock is gone (v61, store.mjs shopRestore)');
  const letter = s.mail.list.find((m) => /Nothing gets built/.test(m.subject));
  assert.match(letter.body.join(' '), /2 protocol recipes \(300 credits each\)/);
  assert.match(letter.body.join(' '), /Rootkit/);
});
