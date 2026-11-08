import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command } from './dist/combat.mjs';
import { hubOptions, hubBanner, hubTerminalMarkup, setOrder } from './dist/view.mjs';

const open = () => { const s = fresh(); s.tutorialCompleted = true; command(s, 'mail'); s.mail.boardOpen = true; s.hubFound = { glassjaw: true, kestrel: true, lantern: true, nullchoir: true }; return s; };
const keys = (s, f) => hubOptions(s, f).map((o) => o.key);

test('a hub session offers a short menu that fits the situation', () => {
  const s = open();
  assert.deepEqual(keys(fresh(), 'kestrel'), [], 'no hubs before the board');
  assert.deepEqual(keys(s, 'kestrel').slice(0, 5), ['market', 'shop', 'work', 'commission', 'servers'], 'every hub has a Shop, its Work and a Commission');
  assert.ok(keys(s, 'halcyon').includes('shop'), 'Halcyon’s Shop is its store');
  assert.ok(!keys(s, 'halcyon').includes('donate'));
  s.standing.nullchoir = 1;
  assert.ok(keys(s, 'nullchoir').includes('market') && keys(s, 'nullchoir').includes('work'), 'the bottom tier still trades: no Hostile');
  assert.ok(!keys(s, 'halcyon').includes('receipts'), 'Receipts only once you keep one');
  s.receipts = { kept: [{ id: 'TRD-77-1', payer: 'a', payee: 'b', sum: 100, date: '1 Jan 2077', c: 'C+16', server: 'X' }], fresh: null, tally: {}, closed: {} };
  assert.ok(keys(s, 'halcyon').includes('receipts') && !keys(s, 'kestrel').includes('receipts'), 'at your commission’s hub');
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
  s.standing.nullchoir = 1;
  assert.match(hubBanner(s, 'nullchoir')[2].html, /Connected\./);
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
