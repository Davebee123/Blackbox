import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command } from './dist/combat.mjs';
import { hubOptions, hubSessionMarkup } from './dist/view.mjs';

const open = () => { const s = fresh(); s.tutorialCompleted = true; command(s, 'mail'); s.mail.boardOpen = true; return s; };
const keys = (s, f) => hubOptions(s, f).map((o) => o.key);

test('a hub session offers a short menu that fits the situation', () => {
  const s = open();
  assert.deepEqual(keys(fresh(), 'kestrel'), [], 'no hubs before the board');
  assert.deepEqual(keys(s, 'kestrel').slice(0, 3), ['market', 'work', 'payloads']);
  assert.ok(keys(s, 'halcyon').includes('store'), 'Halcyon has its store');
  assert.ok(!keys(s, 'halcyon').includes('donate'));
  s.standing.nullchoir = -20;
  assert.deepEqual(keys(s, 'nullchoir'), ['payloads', 'donate', 'servers'], 'hostile: no market, no work');
  s.hubs.lantern.captured = { at: 0, bank: 5, bankAt: 0 };
  assert.deepEqual(keys(s, 'lantern'), ['hold', 'market'], 'yours: the hub and its market');
});

test('the session shows who answers and opens one window at a time', () => {
  const s = open();
  const menu = hubSessionMarkup(s, 'kestrel', null);
  assert.match(menu, /helpdesk@kestrel/);
  assert.doesNotMatch(menu, /hub-win/, 'no window until you pick');
  const market = hubSessionMarkup(s, 'kestrel', 'market', Date.now(), 'overlay');
  assert.match(market, /hub-session overlay/);
  assert.match(market, /hub-win/);
  assert.match(market, /market sell kestrel/);
  assert.doesNotMatch(market, /payload compile/, 'only the window you picked');
});
