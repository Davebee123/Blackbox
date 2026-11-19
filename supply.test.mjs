import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, materialsOf, hackerOf } from './dist/combat.mjs';
import { rep } from './dist/factions.mjs';
import { priceOf } from './dist/market.mjs';
import { SUPPLY, supplyOf } from './dist/supply.mjs';
import { hubOptions, hubTerminalMarkup } from './dist/view.mjs';
import { snapVisit, revertVisit } from './dist/visit.mjs';

const open = () => { const s = fresh(); s.tutorialCompleted = true; command(s, 'mail'); s.mail.boardOpen = true; s.hubFound = { glassjaw: true, kestrel: true, lantern: true, nullchoir: true }; return s; };
const at = (s, L) => { hackerOf(s).level = L; return s; };

test('each faction wants its own ware, from when the hubs open and its hub is found', () => {
  const s = fresh();
  assert.equal(supplyOf(s, 'halcyon'), null, 'nothing before the hubs open');
  const t = open();
  assert.deepEqual(['halcyon', 'kestrel', 'lantern', 'nullchoir', 'glassjaw'].map((f) => supplyOf(t, f).ware), ['cipher', 'kernel', 'worm', 'salvage', 'exploit']);
  delete t.hubFound.lantern;
  assert.equal(supplyOf(t, 'lantern'), null, 'nor before its hub is found');
  command(t, 'deliver lantern');
  assert.match(t.logs.at(-1).message, /haven't located LANTERN's hub/);
});

test('it asks 10 + level/2 (Exploits 1 + level/15) at your level now', () => {
  const s = at(open(), 20);
  assert.equal(supplyOf(s, 'halcyon').n, 20);
  assert.equal(supplyOf(s, 'nullchoir').n, 20);
  assert.equal(supplyOf(s, 'glassjaw').n, 2);
  at(s, 1);
  assert.equal(supplyOf(s, 'halcyon').n, 10);
  assert.equal(supplyOf(s, 'glassjaw').n, 1);
});

test('a delivery: the ware goes, the hub price ×1.25 in credits and +4 rep at once, the next an hour of play later', () => {
  const s = at(open(), 20);
  materialsOf(s).cipher = 25;
  const c0 = s.server.credits, h0 = rep(s, 'halcyon'), g0 = rep(s, 'glassjaw'), k0 = rep(s, 'kestrel');
  assert.ok(supplyOf(s, 'halcyon').ready);
  command(s, 'deliver halcyon');
  const pay = Math.round(20 * priceOf(s, 'halcyon', 'cipher') * SUPPLY.pay); // after the command's market tick (its world event)
  assert.equal(materialsOf(s).cipher, 5);
  assert.equal(s.server.credits, c0 + pay);
  assert.equal(rep(s, 'halcyon'), h0 + SUPPLY.rep);
  assert.ok(rep(s, 'glassjaw') < g0, 'its rival cools, as any rep');
  assert.ok(rep(s, 'kestrel') >= k0, 'its ally warms');
  assert.equal(s.logs.findLast((e) => e.type === 'supply').faction, 'halcyon');
  // The next waits an hour of play; nothing moves meanwhile.
  materialsOf(s).cipher = 40;
  const o = supplyOf(s, 'halcyon');
  assert.equal(o.leftMs, SUPPLY.nextMs);
  assert.ok(!o.ready);
  command(s, 'deliver halcyon');
  assert.equal(materialsOf(s).cipher, 40, 'too soon: nothing taken');
  s.pace = { ...(s.pace || {}), ms: (s.pace?.ms || 0) + SUPPLY.nextMs };
  assert.ok(supplyOf(s, 'halcyon').ready, 'open again after an hour of play');
  command(s, 'hub deliver halcyon');
  assert.equal(materialsOf(s).cipher, 20);
  assert.equal(supplyOf(s, 'halcyon').done, 2);
});

test('short of the ware, nothing changes; components come from your count', () => {
  const s = at(open(), 10);
  s.components = 14;
  const c0 = s.server.credits;
  command(s, 'deliver nullchoir');
  assert.equal(s.components, 14);
  assert.equal(s.server.credits, c0);
  assert.match(s.logs.at(-1).message, /NULL CHOIR wants 15 Components\. You have 14\./);
  s.components = 15;
  command(s, 'deliver nullchoir');
  assert.equal(s.components, 0);
  assert.ok(s.server.credits > c0);
});

test("the hub's menu line shows the ware and what you hold, lit once you hold enough; its window has Deliver", () => {
  const s = at(open(), 10);
  materialsOf(s).worm = 3;
  const line = () => hubOptions(s, 'lantern').find((o) => o.key === 'order');
  assert.match(line().meta, /3\/15/);
  assert.doesNotMatch(line().meta, /ready/);
  materialsOf(s).worm = 15;
  assert.match(line().meta, /class="sup-meta ready"/);
  const win = hubTerminalMarkup(s, 'lantern', [], 'order');
  assert.match(win, /data-command="deliver lantern"/);
  assert.match(win, /15 Worm code/);
  command(s, 'deliver lantern');
  assert.match(line().meta, /60m/, 'then the clock to the next');
  assert.match(hubTerminalMarkup(s, 'lantern', [], 'order'), /The next order comes in 60 min of play\./);
});

test('a disconnect undoes a delivery made on the run: the ware, the credits, the rep and the order', () => {
  const s = at(open(), 10);
  materialsOf(s).kernel = 15;
  const c0 = s.server.credits, k0 = rep(s, 'kestrel');
  s.run = {};
  snapVisit(s, null);
  command(s, 'deliver kestrel');
  assert.equal(materialsOf(s).kernel, 0);
  revertVisit(s, s.run.snap, null);
  assert.equal(materialsOf(s).kernel, 15);
  assert.equal(s.server.credits, c0);
  assert.equal(rep(s, 'kestrel'), k0);
  assert.ok(supplyOf(s, 'kestrel').ready, 'the order is open again');
});
