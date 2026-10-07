import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command } from './dist/combat.mjs';
import { hubOptions, hubBanner, hubTerminalMarkup, setOrder } from './dist/view.mjs';
import { PAYLOAD as __PAYLOAD } from './dist/payload.mjs';
__PAYLOAD.on = true; // payloads are switched off in the game for now; capturing a hub still needs them here

const open = () => { const s = fresh(); s.tutorialCompleted = true; command(s, 'mail'); s.mail.boardOpen = true; s.hubFound = { glassjaw: true, kestrel: true, lantern: true, nullchoir: true }; return s; };
const keys = (s, f) => hubOptions(s, f).map((o) => o.key);

test('a hub session offers a short menu that fits the situation', () => {
  const s = open();
  assert.deepEqual(keys(fresh(), 'kestrel'), [], 'no hubs before the board');
  assert.deepEqual(keys(s, 'kestrel').slice(0, 4), ['market', 'shop', 'work', 'payloads'], 'every hub has a Shop');
  assert.ok(keys(s, 'halcyon').includes('shop'), 'Halcyon’s Shop is its store');
  assert.ok(!keys(s, 'halcyon').includes('donate'));
  s.standing.nullchoir = -20;
  assert.deepEqual(keys(s, 'nullchoir'), ['payloads', 'donate', 'servers'], 'hostile: no market, no work');
  s.hubs.lantern.captured = { at: 0, bank: 5, bankAt: 0 };
  assert.deepEqual(keys(s, 'lantern'), ['hold', 'market', 'shop'], 'yours: the hub, its market and its shop (at cost)');
});

test('connecting reads like jacking into a server: handshake, banner, who answers, the menu', () => {
  const s = open();
  s.profile = { handle: 'zer0' };
  const lines = hubBanner(s, 'kestrel');
  assert.match(lines[0].html, /ssh zer0@kestrel-dc-north/);
  assert.ok(lines.some((l) => /helpdesk@kestrel/.test(l.html)));
  assert.match(lines.at(-1).html, /class="hn">1<\/span><span class="hl">market</);
  const page = hubTerminalMarkup(s, 'kestrel', lines, null);
  assert.match(page, /id="hubterm"/);
  assert.doesNotMatch(page, /hub-win/, 'no window until you pick');
  const market = hubTerminalMarkup(s, 'kestrel', lines, 'market');
  assert.match(market, /hub-win/);
  assert.match(market, /data-mk-pick="cipher"/, 'wares are rows you pick');
  assert.doesNotMatch(market, /market sell kestrel/, 'no order until you pick one');
  s.materials.cipher = 5;
  setOrder({ f: 'kestrel', w: 'cipher', side: 'sell', n: 3 });
  const ticket = hubTerminalMarkup(s, 'kestrel', lines, 'market');
  assert.match(ticket, /data-mk-n/, 'a slider');
  assert.match(ticket, /market sell kestrel cipher 3/, 'its order, for the slider’s amount');
  assert.match(ticket, /You get/);
  setOrder(null);
  assert.doesNotMatch(market, /payload compile/, 'only the window you picked');
  s.standing.nullchoir = -30;
  assert.match(hubBanner(s, 'nullchoir')[2].html, /Filtered/);
});

test('the Shop window: a faction’s own shelf as tiles; Halcyon’s is its store', () => {
  const s = open(); s.server.credits = 5000;
  const k = hubTerminalMarkup(s, 'kestrel', hubBanner(s, 'kestrel'), 'shop');
  assert.match(k, /class="ptiles stash"/);
  assert.match(k, /data-command="buy kestrel /);
  const h = hubTerminalMarkup(s, 'halcyon', hubBanner(s, 'halcyon'), 'shop');
  assert.match(h, /Halcyon Mutual/);
  assert.match(h, /Agency stock/);
  const m = hubTerminalMarkup(s, 'kestrel', hubBanner(s, 'kestrel'), 'market');
  assert.doesNotMatch(m, /mk-goods/, 'the market is wares only');
});
