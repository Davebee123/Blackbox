import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, materialsOf, tickServices } from './dist/combat.mjs';
import { WARE_IDS, HUB_CONDITION, CONDITIONS, quote, priceOf, trade, tickMarket, transfersOf, travelMs, MARKET } from './dist/market.mjs';
import { hubsOf } from './dist/factions.mjs';

const open = () => { const s = fresh(); s.tutorialCompleted = true; command(s, 'mail'); s.mail.boardOpen = true; s.server.credits = 5000; return s; };
const T0 = 1_000_000_000_000;

test('every hub has a condition; Kestrel’s hot racks pay well for Kernel code', () => {
  const s = open();
  for (const h of hubsOf(s)) assert.ok(CONDITIONS[HUB_CONDITION[h.faction]], h.faction);
  s.market = { pressure: {}, transfers: [], serial: 0, event: 'calm', eventUntil: T0 * 2, at: T0 };
  assert.ok(quote(s, 'kestrel', 'kernel').sell > quote(s, 'lantern', 'kernel').sell);
  for (const w of WARE_IDS) assert.ok(quote(s, 'halcyon', w).buy > quote(s, 'halcyon', w).sell, 'a spread');
});

test('selling is a file transfer: stock leaves now, credits land later; pressure drops the price and recovers', () => {
  const s = open();
  tickMarket(s, T0);
  s.market.event = 'calm';
  materialsOf(s).kernel = 20;
  const p0 = priceOf(s, 'kestrel', 'kernel'), c0 = s.server.credits;
  trade(s, 'sell', 'kestrel', 'kernel', 10, T0);
  assert.equal(materialsOf(s).kernel, 10);
  assert.equal(s.server.credits, c0, 'not paid yet');
  assert.equal(transfersOf(s).length, 1);
  assert.ok(priceOf(s, 'kestrel', 'kernel') < p0, 'selling pushes the price down');
  const due = transfersOf(s)[0];
  tickMarket(s, due.landsAt - 1);
  assert.equal(s.server.credits, c0);
  tickMarket(s, due.landsAt);
  assert.equal(s.server.credits, c0 + due.credits);
  assert.equal(transfersOf(s).length, 0);
  tickMarket(s, due.landsAt + 48 * 3600000);
  s.market.event = 'calm';
  assert.ok(Math.abs(priceOf(s, 'kestrel', 'kernel') - p0) / p0 < 0.05, 'recovers over time');
});

test('buying pays now and the goods land later; can’t overspend, oversell or trade with the hostile', () => {
  const s = open();
  tickMarket(s, T0);
  const c0 = s.server.credits;
  trade(s, 'buy', 'nullchoir', 'salvage', 3, T0);
  assert.ok(s.server.credits < c0);
  const n0 = (s.salvage || []).length;
  tickMarket(s, T0 + travelMs(s, 'nullchoir'));
  assert.equal(s.salvage.length, n0 + 3);
  trade(s, 'sell', 'halcyon', 'exploit', 5, T0);
  assert.equal(transfersOf(s).length, 0, 'none to sell');
  s.server.credits = 1;
  trade(s, 'buy', 'glassjaw', 'exploit', 1, T0);
  assert.equal(s.server.credits, 1);
  s.standing.lantern = 0; materialsOf(s).worm = 5;
  trade(s, 'sell', 'lantern', 'worm', 5, T0);
  assert.equal(materialsOf(s).worm, 5);
});

test('the world event turns over on the clock, and the market runs from the service tick', () => {
  const s = open();
  tickServices(s, T0);
  const e0 = s.market.event, rolls = [];
  for (let i = 1; i <= 6; i++) { tickServices(s, T0 + i * MARKET.eventMs); rolls.push(s.market.event); }
  assert.notEqual(rolls[0], e0);
  assert.ok(rolls.every((e, i) => e !== (i ? rolls[i - 1] : e0)), 'never the same twice running');
  assert.equal(fresh().market, undefined, 'nothing before the hubs');
  tickMarket(fresh(), T0);
});

test('relays on your servers shorten transfers', () => {
  const s = open();
  const t0 = travelMs(s, 'nullchoir');
  s.locations.push({ id: 'x', relay: true }, { id: 'y', relay: true });
  assert.equal(travelMs(s, 'nullchoir'), Math.round(t0 * 0.8));
});
