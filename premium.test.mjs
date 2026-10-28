// Everything is found or bought (v47): the premium shelf (store.mjs PREMIUM, a hub's in factions.mjs hubPremium),
// crafting's commands gone, components only sold, and an old save's recipes, plans and source turned into credits and
// the Zero-day (progression.mjs craftRestore).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, restore, SAVE_VERSION, hackerLevel, hooks } from './dist/combat.mjs';
import { premiumOf, premiumPrice, incomeAt, PREMIUM } from './dist/store.mjs';
import { hubPremium } from './dist/factions.mjs';
import { tickMarket, travelMs } from './dist/market.mjs';
import { CRAFT_REFUND } from './dist/progression.mjs';
import { STASH_CAP } from './dist/gear.mjs';
import { storeMarkup } from './dist/view.mjs';

const open = (level = 14) => { const s = fresh(); s.tutorialCompleted = true; command(s, 'mail'); s.mail.boardOpen = true; s.hubFound = { kestrel: true }; command(s, `developer level ${level}`); s.server.credits = 50000; return s; };

test('the premium shelf: a Tuned two levels up and a Custom at your level, never a unique or a set piece, priced at hours of credits', () => {
  const s = open(14), L = hackerLevel(s), shelf = premiumOf(s);
  assert.equal(shelf.length, PREMIUM.halcyon);
  const blue = shelf.find((x) => x.rarity === 'tuned'), yellow = shelf.find((x) => x.rarity === 'custom');
  assert.equal(blue.level, L + 2, 'a blue, two levels up');
  assert.equal(yellow.level, L, 'a yellow, at your level');
  assert.notEqual(blue.group, yellow.group, 'two different slots');
  for (const it of shelf) { assert.ok(!it.unique && !it.zeroDay, 'never a unique, a set piece or a Zero-day'); assert.equal(it.implicit, 'halcyon'); }
  const hours = (it) => premiumPrice(it, L) / incomeAt(L);
  assert.ok(hours(blue) >= 3 && hours(yellow) <= 5 && hours(blue) < hours(yellow), `about 3 to 5 hours of credits (${hours(blue)}, ${hours(yellow)})`);
  assert.ok(incomeAt(10) === 300 && incomeAt(15) >= 500 && incomeAt(20) <= 900, 'income: about 300 an hour to 10, 500–900 to 20');
  assert.deepEqual(premiumOf(s), shelf, 'looking again changes nothing');
  assert.ok(!('until' in shelf[0]), 'no clock');
  const html = storeMarkup(s);
  assert.match(html, /data-ptip="p:halcyon:0"/);
  assert.match(html, /data-command="buy premium-1"/);
});

test('buying one: it goes in your stash and a comparable one takes its place; a new level brings new stock', () => {
  const s = open(14), L = hackerLevel(s), [first] = premiumOf(s), price = premiumPrice(first, L), c0 = s.server.credits, n0 = s.stash.length;
  command(s, 'buy premium-0');
  assert.equal(s.server.credits, c0 - price);
  assert.equal(s.stash.length, n0 + 1);
  assert.equal(s.stash.at(-1).name, first.name);
  const after = premiumOf(s);
  assert.equal(after.length, PREMIUM.halcyon, 'always something in stock');
  assert.ok(after.some((x) => x.rarity === first.rarity && x.name !== first.name), 'a comparable one in its place');
  // Short of credits, or a full stash: it says so, and nothing moves.
  s.server.credits = 1;
  command(s, 'buy premium-0');
  assert.equal(s.stash.length, n0 + 1);
  s.server.credits = 50000;
  while (s.stash.length < STASH_CAP) s.stash.push({ ...first, id: 'f' + s.stash.length });
  assert.match(command(s, 'buy premium-0').at(-1).message, /stash is full/);
  // A level later the shelf is rolled for the new level.
  command(s, `developer level ${L + 1}`);
  assert.ok(premiumOf(s).every((x) => x.level >= L + 1), 'fits your level');
});

test('a hub\'s premium protocol: its faction\'s implicit, its tier\'s price, delivered by file transfer', () => {
  const T0 = 1_700_000_000_000, was = hooks.now;
  hooks.now = () => T0;
  const s = open(14);
  tickMarket(s, T0);
  const [p] = hubPremium(s, 'kestrel');
  assert.equal(hubPremium(s, 'kestrel').length, PREMIUM.hub);
  assert.equal(p.it.implicit, 'kestrel');
  const c0 = s.server.credits, n0 = s.stash.length;
  command(s, 'buy kestrel premium-0');
  assert.equal(s.server.credits, c0 - p.price);
  assert.equal(s.stash.length, n0, 'on its way');
  tickMarket(s, T0 + travelMs(s, 'kestrel') + 1);
  assert.equal(s.stash.at(-1).name, p.it.name, 'landed');
  assert.equal(hubPremium(s, 'kestrel').length, PREMIUM.hub, 'and another on the shelf');
  hooks.now = was;
});

test('nothing is crafted: compile, filter craft and relay craft say so; components only sell', () => {
  const s = open(14);
  for (const c of ['compile', 'compile crit exploit', 'filter craft grind', 'relay craft']) assert.match(command(s, c).at(-1).message, /found or bought/, c);
  assert.equal(s.recipes, undefined);
  const c0 = s.server.credits;
  command(s, 'market buy kestrel salvage 5');
  assert.equal(s.server.credits, c0, 'hubs don\'t sell components');
});

test('an old save (v46): recipes, filter recipes, the Relay plan and their files become credits; source becomes the Zero-day; contracts pay what took their place', () => {
  const old = fresh();
  Object.assign(old, { version: 46, hackers: { breaker: { level: 20, xp: 0 } } });
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
  assert.deepEqual(s.store.slots.map((x) => x.id), ['cracker'], 'sealed blueprints and component lots leave the shelf');
  const letter = s.mail.list.find((m) => /Nothing gets built/.test(m.subject));
  assert.match(letter.body.join(' '), /2 protocol recipes \(300 credits each\)/);
  assert.match(letter.body.join(' '), /Rootkit/);
});
