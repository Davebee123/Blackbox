import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command } from './dist/combat.mjs';
import { hubOptions, hubBanner, hubTerminalMarkup } from './dist/view.mjs';

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

test('connecting reads like jacking into a server: handshake, banner, who answers, the menu', () => {
  const s = open();
  s.profile = { handle: 'zer0' };
  const lines = hubBanner(s, 'kestrel');
  assert.match(lines[0].html, /ssh zer0@kestrel-dc-north/);
  assert.ok(lines.some((l) => /helpdesk@kestrel/.test(l.html)));
  assert.match(lines.at(-1).html, /\[1\] market/);
  const page = hubTerminalMarkup(s, 'kestrel', lines, null);
  assert.match(page, /id="hubterm"/);
  assert.doesNotMatch(page, /hub-win/, 'no window until you pick');
  const market = hubTerminalMarkup(s, 'kestrel', lines, 'market');
  assert.match(market, /hub-win/);
  assert.match(market, /market sell kestrel/);
  assert.doesNotMatch(market, /payload compile/, 'only the window you picked');
  s.standing.nullchoir = -30;
  assert.match(hubBanner(s, 'nullchoir')[2].html, /Filtered/);
});
