// Every hub's Shop has one shape (store.mjs, docs/factions-plan.md 5): tools, a shelf on the play clock, a chase line by
// rep tier, codebases. Halcyon's hands over at once; another hub's lands by file transfer.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, hackerLevel, hooks, restore, SAVE_VERSION } from './dist/combat.mjs';
import { shopOf, shelfOf, SHOP, CHASE, TOOLS, incomeAt, shopRestore } from './dist/store.mjs';
import { FACTION_IDS } from './dist/factions.mjs';
import { tickMarket, travelMs } from './dist/market.mjs';
import { tickPlay } from './dist/progression.mjs';
import { items } from './dist/hidden.mjs';
import { CHASE_LINE } from './dist/gear.mjs';
import { shopMarkup } from './dist/view.mjs';

const T0 = 1_700_000_000_000;
hooks.now = () => T0;
const open = (level = 20, rep = 30) => {
  const s = fresh(); s.tutorialCompleted = true; command(s, 'mail'); s.mail.boardOpen = true;
  s.hubFound = Object.fromEntries(FACTION_IDS.map((f) => [f, true]));
  command(s, `developer level ${level}`); s.server.credits = 1e6;
  s.standing = Object.fromEntries(FACTION_IDS.map((f) => [f, rep]));
  return s;
};

test('every hub: five tools, a shelf of two blues and two yellows with its implicit, its chase line, its codebases', () => {
  const s = open();
  for (const f of FACTION_IDS) {
    const shop = shopOf(s, f);
    assert.deepEqual(shop.tools.map((t) => t.id), Object.keys(TOOLS), f);
    assert.deepEqual(shop.shelf.map((x) => x.it.rarity), ['tuned', 'tuned', 'custom', 'custom'], f);
    assert.ok(shop.shelf.every((x) => x.it.implicit === f && x.it.level === hackerLevel(s)), `${f}: its implicit, at your level`);
    assert.equal(new Set(shop.shelf.map((x) => x.it.group)).size, 4, `${f}: a slot each`);
    assert.deepEqual(shop.chase.map((c) => c.id), CHASE[f].map(([id]) => id));
    assert.ok(CHASE_LINE[f]);
    assert.match(shopMarkup(s, f), new RegExp(`${CHASE_LINE[f]}[\\s\\S]*Tools`));
  }
});

test('prices: hours of credits at your level, 5% off a tier; yellows and the chase line wait on rep', () => {
  const s = open(20, 30), L = 20, shop = shopOf(s, 'kestrel'), off = 1 - SHOP.discount;
  const near = (got, want) => assert.ok(Math.abs(got - want) <= 10, `${got} vs ${want}`);
  near(shop.shelf[0].price, 3 * incomeAt(L) * off);
  near(shop.shelf[2].price, 6 * incomeAt(L) * off);
  near(shop.chase[2].price, 20 * incomeAt(L) * off);
  assert.deepEqual(shop.shelf.map((x) => x.locked), [false, false, false, true], 'Contractor opens one yellow');
  assert.deepEqual(shop.chase.map((x) => x.locked), [false, true, true]);
  assert.match(command(s, 'buy kestrel shelf-3').at(-1).message, /Account and up/);
  assert.match(command(s, 'buy kestrel escrow').at(-1).message, /Account and up/);
});

test('the shelf rerolls every 30 minutes of play, never on the wall clock; what you buy stays sold until then', () => {
  const s = open(), first = shelfOf(s, 'halcyon').map((x) => x.it.name);
  command(s, 'buy shelf-0');
  assert.ok(shelfOf(s, 'halcyon')[0].sold);
  assert.match(command(s, 'buy shelf-0').at(-1).message, /Sold/);
  hooks.now = () => T0 + 10 * 3600000; // hours away
  assert.deepEqual(shelfOf(s, 'halcyon').map((x) => x.it.name), first, 'nothing turns over while you are away');
  tickPlay(s, SHOP.rerollMs);
  const next = shelfOf(s, 'halcyon');
  assert.notDeepEqual(next.map((x) => x.it.name), first);
  assert.ok(!next[0].sold);
  hooks.now = () => T0;
});

test('Halcyon hands things over at once; another hub sends them by file transfer', () => {
  const s = open();
  const c0 = s.server.credits, price = shopOf(s, 'halcyon').tools[0].price;
  command(s, 'buy relay');
  assert.equal(items(s).relay, 1);
  assert.equal(s.server.credits, c0 - price);
  command(s, 'buy deductible');
  assert.equal(s.stash.at(-1).zeroDay, 'deductible');
  assert.equal(s.stash.at(-1).implicit, 'halcyon', 'Indemnified carries Claims');
  tickMarket(s, T0);
  const n = s.stash.length;
  command(s, 'buy glassjaw shell-company');
  assert.equal(s.stash.length, n, 'on its way');
  tickMarket(s, T0 + travelMs(s, 'glassjaw') + 1);
  assert.equal(s.stash.at(-1).zeroDay, 'shell-company');
  assert.equal(s.stash.at(-1).implicit, 'glassjaw');
});

test('codebases: once each, by rep', () => {
  const s = open(20, 1);
  assert.match(command(s, 'buy kestrel codebase-snare').at(-1).message, /Client/);
  s.standing.halcyon = 30;
  command(s, 'buy codebase-mill');
  assert.ok(s.codebases.includes('mill'));
  assert.match(command(s, 'buy codebase-mill').at(-1).message, /already know/);
});

test('v61: the agency stock, premium shelves and hub stock leave an old save', () => {
  const s = open();
  s.store = { slots: [{ id: 'exploit' }] }; s.premium = { halcyon: { items: [] } }; s.hubs.kestrel.stock = { relay: 3 }; s.hubs.kestrel.restockAt = 5;
  shopRestore(s);
  assert.ok(!s.store && !s.premium && !('stock' in s.hubs.kestrel));
  s.store = { slots: [] }; s.version = SAVE_VERSION - 1;
  const r = restore(JSON.parse(JSON.stringify(s)));
  assert.ok(!r.store);
});
