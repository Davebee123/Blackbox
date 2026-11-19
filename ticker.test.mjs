// The ticker (ticker.mjs, docs/ticker.md): market cards on logged-on time, seeded per network, that move hub prices and
// say why in their owners' voices. On fixed seeds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, addLocation } from './dist/combat.mjs';
import { TICK, MODS, STYLES, TICKER_CARDS, tickerSig, sigFor, tickerOf, tickTicker, dealTicker, tickerMult, tickerAt, tickerTip, tickerKind } from './dist/ticker.mjs';
import { priceOf, outsideMult, marketRead, WARE_IDS, CONDITIONS, HUB_CONDITION } from './dist/market.mjs';
import { deal, tickEvents, historyOf } from './dist/events.mjs';
import { tickNetwork } from './dist/invasion.mjs';
import { FACTION_IDS } from './dist/factions.mjs';
import { logComms, commsOf, live } from './dist/comms.mjs';
import { lineOf } from './dist/pings.mjs';
import { tipOf } from './dist/pager.mjs';
import { play } from './dist/run.mjs';
import { hubTerminalMarkup, hubBanner, mapMarkup } from './dist/view.mjs';

const MIN = 60000;
// Every hub found, the director and its blips held still (level 1 deals neither), on network seed.
const world = (seed = 777) => {
  const s = fresh(); s.tutorialCompleted = true; s.netSeed = seed;
  command(s, 'mail'); s.mail.boardOpen = true;
  s.hubFound = { glassjaw: true, kestrel: true, lantern: true, nullchoir: true };
  s.director = { next: 9e9, n: 0, last: null, blipNext: 9e9 };
  return s;
};
const prices = (s) => Object.fromEntries(FACTION_IDS.map((f) => [f, Object.fromEntries(WARE_IDS.map((w) => [w, priceOf(s, f, w)]))]));
const near = (a, b) => Math.abs(a - b) < 1e-9;
// n deals, the live list cleared each time (so every card fits), as card ids.
const dealt = (s, n) => Array.from({ length: n }, () => { tickerOf(s).live = []; return dealTicker(s); });

test('seeded per network: two networks favour different cards and lean their modifiers their own way', () => {
  const a = tickerSig(3), b = tickerSig(2);
  assert.deepEqual(a, tickerSig(3), 'the seed alone decides it');
  assert.equal(a.favoured.length, 2);
  assert.notDeepEqual(a.favoured, b.favoured);
  assert.notEqual(a.style, b.style);
  assert.deepEqual(sigFor(world(3)), a);
  // Their tickers read differently.
  const x = world(3), y = world(2);
  tickTicker(x, 0); tickTicker(y, 0);
  assert.notDeepEqual(dealt(x, 12).map((c) => c.card), dealt(y, 12).map((c) => c.card));
});

test('a card moves its hub\'s price for its minutes, and then stops; its line goes to the Log in its owner\'s voice', () => {
  const s = world(), before = prices(s), first = s.serial;
  const c = dealTicker(s, 'rack', null);
  s.ticker.next = Infinity; // no other card meanwhile
  assert.equal(c.ms, 20 * MIN);
  assert.deepEqual(c.moves, [{ hub: 'kestrel', ware: 'salvage', mult: 1.6 }]);
  const moved = () => { for (const f of FACTION_IDS) for (const w of WARE_IDS) assert.ok(near(priceOf(s, f, w), before[f][w] * (f === 'kestrel' && w === 'salvage' ? 1.6 : 1)), `${f} ${w}`); };
  moved();
  // The Log: the owner, then the whole line; quiet, opening the hub's market.
  const said = s.logs.filter((e) => e.id > first);
  assert.deepEqual(said.map((e) => [e.type, e.message]), [['ticker', 'Kestrel: Rack 4 will close at the end of this cycle. Please collect your belongings.']]);
  logComms(s, said);
  const line = commsOf(s)[0];
  assert.equal(lineOf(s, line), '<b>Kestrel</b>: Rack 4 will close at the end of this cycle. Please collect your belongings.');
  assert.equal(line.go, 'hub:kestrel:market');
  assert.equal(line.beep, false);
  assert.match(tipOf(s, line), /^Rack closure: Rack 4 will close/, 'its tooltip is named for the card');
  tickEvents(s, 20 * MIN - 1000);
  moved();
  assert.ok(live(s, line));
  tickEvents(s, 1000);
  assert.equal(s.ticker.live.length, 0);
  for (const f of FACTION_IDS) for (const w of WARE_IDS) assert.ok(near(priceOf(s, f, w), before[f][w]), `${f} ${w}: back`);
  assert.ok(!live(s, line), 'its Log line goes with it');
});

test('a card every 20–40 minutes of logged-on time, several at once; nothing moves while you\'re logged off', () => {
  const s = world(), before = prices(s), T0 = 1_000_000_000_000;
  // Logged off a day: the gap counts as a few seconds, so no card and no move.
  tickNetwork(s, T0); tickNetwork(s, T0 + 24 * 3600 * 1000);
  assert.equal(s.ticker.live.length, 0);
  assert.ok(s.ticker.next >= TICK.everyMs[0] - 10000);
  for (const f of FACTION_IDS) for (const w of WARE_IDS) assert.equal(priceOf(s, f, w), before[f][w], `${f} ${w}`);
  // Logged on: one comes up within 40 minutes, the next 20 to 40 after it.
  const at = [];
  for (let t = 1; t <= 6 * 60; t++) { const n = s.ticker.n; tickEvents(s, MIN); if (s.ticker.n > n) at.push(t); }
  assert.ok(at.length >= 9 && at.length <= 18, `${at.length} cards in 6 hours`);
  assert.ok(at[0] <= 40);
  for (let i = 1; i < at.length; i++) assert.ok(at[i] - at[i - 1] >= 20 && at[i] - at[i - 1] <= 40, `${at[i - 1]} → ${at[i]}`);
  assert.ok(at.length && s.ticker.live.length >= 1);
  // Several at once, now and then.
  const t = world(5), most = [];
  for (let m = 0; m < 12 * 60; m++) { tickEvents(t, MIN); most.push(t.ticker.live.length); }
  assert.ok(Math.max(...most) >= 2, 'two cards up at once');
  // Nothing before the hubs open.
  const u = fresh();
  for (let m = 0; m < 120; m++) tickEvents(u, MIN);
  assert.equal(u.ticker, undefined);
});

test('the clamp: however many cards stack, a hub\'s ware stays within ×0.4 and ×2.5', () => {
  const s = world();
  // Every card up at once, modifiers rolled, many times over.
  let over = false;
  for (let round = 0; round < 60; round++) {
    tickerOf(s).live = [];
    for (let i = 0; i < Object.keys(TICKER_CARDS).length; i++) dealTicker(s);
    for (const f of FACTION_IDS) for (const w of WARE_IDS) {
      const raw = s.ticker.live.flatMap((c) => c.moves).filter((x) => (x.hub === '*' || x.hub === f) && (x.ware === '*' || x.ware === w)).reduce((a, x) => a * x.mult, 1);
      const m = tickerMult(s, f, w);
      assert.ok(m >= TICK.clamp[0] && m <= TICK.clamp[1], `${f} ${w}: ×${m}`);
      if (raw > TICK.clamp[1]) over = true;
    }
  }
  assert.ok(over, 'the cards did stack past ×2.5');
  // Report auction and Claim files rushed, with the Tax run: ×4.7 raw at GLASSJAW, ×2.5 paid.
  s.ticker.live = [];
  dealTicker(s, 'auction', 'rushed'); dealTicker(s, 'claims', 'rushed'); dealTicker(s, 'tax', 'rushed');
  assert.equal(tickerMult(s, 'glassjaw', 'exploit'), 2.5);
  assert.ok(near(outsideMult(s, 'glassjaw', 'exploit'), CONDITIONS.blackbudget.mult.exploit * 2.5));
  // And the floor.
  s.ticker.live = [{ id: 98, card: 'smallprint', left: MIN, ms: MIN, moves: [{ hub: 'halcyon', ware: 'cipher', mult: 0.55 }] }, { id: 99, card: 'early', left: MIN, ms: MIN, moves: [{ hub: 'halcyon', ware: 'cipher', mult: 0.5 }] }];
  assert.equal(tickerMult(s, 'halcyon', 'cipher'), 0.4);
});

test('modifiers: two cards in five, Rushed, Lingering or Wide, leaning with the network\'s style', () => {
  const r = dealTicker(world(), 'thermal', 'rushed');
  assert.deepEqual([r.ms, r.moves[0].mult, r.mod], [10 * MIN, 1.9, 'rushed'], 'half as long, half again as big');
  const l = dealTicker(world(), 'smallprint', 'lingering');
  assert.deepEqual([l.ms, l.moves[0].mult], [40 * MIN, 0.85], 'twice as long, half as big (the distance from ×1)');
  const s = world(), w = dealTicker(s, 'census', 'wide');
  assert.equal(w.moves.length, 2);
  assert.equal(w.moves[0].hub, 'lantern');
  assert.ok(FACTION_IDS.includes(w.moves[1].hub) && w.moves[1].hub !== 'lantern', 'a second hub posts it too');
  assert.ok(near(priceOf(s, w.moves[1].hub, 'worm'), 14 * (CONDITIONS[HUB_CONDITION[w.moves[1].hub]].mult.worm ?? 1) * 1.5));
  assert.equal(dealTicker(world(), 'tax', 'wide').mod, undefined, 'never Wide on a card that is everywhere already');
  assert.equal(dealTicker(world(), 'early', 'rushed').mod, undefined, 'GLASSJAW\'s early word names its twenty minutes');
  // How often, and which: by the style.
  for (const [seed, style, top] of [[3, 'brisk', 'rushed'], [2, 'patient', 'lingering'], [1, 'loud', 'wide']]) {
    const t = world(seed);
    assert.equal(sigFor(t).style, style);
    tickTicker(t, 0);
    const cards = dealt(t, 3000), mods = cards.filter((c) => c.mod), n = (m) => mods.filter((c) => c.mod === m).length;
    assert.ok(mods.length / cards.length > 0.32 && mods.length / cards.length < 0.42, `${style}: ${mods.length} in ${cards.length}`);
    assert.ok(Object.keys(MODS).filter((m) => m !== top).every((m) => n(top) > n(m)), `${style}: ${Object.keys(MODS).map((m) => `${m} ${n(m)}`).join(', ')}`);
    assert.equal(STYLES[style][top], 3);
  }
});

test('favoured cards come up 2.5 times as often', () => {
  const s = world(777), fav = sigFor(s).favoured;
  tickTicker(s, 0);
  const count = {};
  for (const c of dealt(s, 4000)) count[c.card] = (count[c.card] || 0) + 1;
  const plain = Object.keys(TICKER_CARDS).filter((k) => !fav.includes(k)), avg = plain.reduce((a, k) => a + count[k], 0) / plain.length;
  for (const k of fav) {
    assert.ok(plain.every((p) => count[k] > count[p]), `${k}: ${count[k]} against ${plain.map((p) => count[p]).join(' ')}`);
    assert.ok(count[k] / avg > 1.9 && count[k] / avg < 3.2, `${k}: ×${(count[k] / avg).toFixed(2)}`);
  }
});

test('a card needs its poster\'s hub; the city\'s cards move every hub; early word flickers three prices', () => {
  const s = fresh(); s.tutorialCompleted = true; s.netSeed = 777; command(s, 'mail'); s.mail.boardOpen = true; // Halcyon's hub only
  assert.equal(dealTicker(s, 'rack'), null, 'Kestrel\'s hub not found');
  assert.equal(dealTicker(s, 'early'), null, 'GLASSJAW\'s neither');
  for (let i = 0; i < 40; i++) { tickerOf(s).live = []; const c = dealTicker(s); assert.ok(!TICKER_CARDS[c.card].by || TICKER_CARDS[c.card].by === 'halcyon', c.card); }
  const t = world(), tax = dealTicker(t, 'tax', null), wage = dealTicker(t, 'wage', null);
  assert.equal(tax.ms, 20 * MIN); assert.equal(wage.ms, 30 * MIN);
  for (const f of FACTION_IDS) { assert.ok(near(tickerMult(t, f, 'exploit'), 1.15)); assert.ok(near(tickerMult(t, f, 'worm'), 1.15 * 0.8)); }
  const u = world(), e = dealTicker(u, 'early', null);
  assert.equal(e.moves.length, 3);
  assert.equal(new Set(e.moves.map((x) => `${x.hub} ${x.ware}`)).size, 3, 'three different prices');
  assert.ok(e.moves.every((x) => [TICK.early.up, TICK.early.down].includes(x.mult)));
  // Its own dice: the game's and the director's are untouched.
  const v = world(), rng = v.rng, dir = JSON.stringify(v.director);
  dealt(v, 50);
  assert.equal(v.rng, rng); assert.equal(JSON.stringify(v.director), dir);
});

test('the director deals exactly as before beside it, never a market shock; the world event moves nothing', () => {
  const make = () => {
    const s = world(); s.hackers = { breaker: { level: 12, xp: 0 } };
    addLocation(s, 'worm'); addLocation(s, 'ransomware'); s.locations.forEach((l) => { l.rogue = false; l.runs = 1; });
    s.director = { next: null, n: 0, last: null };
    return s;
  };
  const a = make(), b = make();
  b.ticker = { live: [], next: Infinity, n: 0, last: null }; // the same save without a card
  for (let m = 0; m < 4 * 60; m++) { tickEvents(a, MIN); tickEvents(b, MIN); }
  assert.ok(a.ticker.n > 0 && b.ticker.n === 0);
  assert.deepEqual(historyOf(a).map((h) => [h.k, h.loc, h.how]), historyOf(b).map((h) => [h.k, h.loc, h.how]));
  assert.ok(historyOf(a).length > 3);
  assert.equal(a.rng, b.rng);
  // No market shock, by chance or by name.
  const s = make();
  for (let i = 0; i < 300; i++) { s.events = []; s.director.last = null; assert.notEqual(deal(s)?.card, 'shock'); }
  assert.equal(deal(s, 'shock'), null);
  assert.ok(play(s, 'developer event shock').some((e) => e.type === 'warning'));
  // An old save's world event: ignored.
  const t = world(); t.market = { pressure: {}, transfers: [], serial: 0, event: 'zerorush', eventUntil: Infinity, at: null };
  assert.equal(priceOf(t, 'glassjaw', 'exploit'), 140 * CONDITIONS.blackbudget.mult.exploit);
  assert.deepEqual(marketRead(t, 'glassjaw', 'exploit'), { mult: CONDITIONS.blackbudget.mult.exploit, hub: CONDITIONS.blackbudget.mult.exploit, event: 1, shock: 1, eventName: null });
  dealTicker(t, 'auction', null);
  assert.deepEqual(marketRead(t, 'glassjaw', 'exploit'), { mult: CONDITIONS.blackbudget.mult.exploit * 1.8, hub: CONDITIONS.blackbudget.mult.exploit, event: 1.8, shock: 1, eventName: 'Report auction' }, 'what a runner reads');
});

test('on the screen: the market window\'s tag, the price tooltips, the hub\'s chip; developer ticker', () => {
  const s = world();
  play(s, 'developer ticker rack');
  play(s, 'developer ticker tax');
  const c = s.ticker.live[0], html = hubTerminalMarkup(s, 'kestrel', hubBanner(s, 'kestrel'), 'market');
  const head = html.match(/<div class="mk-tags">[\s\S]*?<\/div>/)[0];
  assert.match(head, new RegExp(`class="tag shock mk-card ${c.moves[0].mult > 1 ? 'up' : 'down'}" title="Rack closure: Multiplies the price of components here by ${c.moves[0].mult}\\. Ends in ${c.ms / MIN} minutes\\.\\n“Rack 4 will close at the end of this cycle\\. Please collect your belongings\\.”" data-tt-kind="Kestrel · Market card[^"]*">${c.moves[0].mult > 1 ? '▲' : '▼'} Rack closure · ${c.ms / MIN} min</span>`));
  assert.match(head, /▲ Tax run · \d+ min/, 'the city\'s card at every hub');
  assert.doesNotMatch(head, /Quiet market|Ransomware outbreak/, 'no world event');
  const tips = [...html.matchAll(/class="mk-d [^"]*" title="([^"]*)"/g)].map((m) => m[1]);
  assert.ok(tips.some((t) => t.includes(`Rack closure ×${c.moves[0].mult}`) && t.includes('Tax run ×1.15')), tips.join(' | '));
  assert.ok(tips.every((t) => t.includes('Tax run ×1.15')), 'every ware it touches');
  assert.equal(tickerAt(s, 'kestrel')[0].name, 'Rack closure', 'the strongest first');
  assert.match(tickerKind(tickerAt(s, 'kestrel')[0]), /^Kestrel · Market card/);
  assert.match(tickerTip(tickerAt(s, 'lantern')[0]), /^Tax run: Multiplies every price here by 1\.15\./);
  const map = mapMarkup(s, 'hub-kestrel');
  assert.match(map, /<g class="hub-shock up"[^>]*><title>Rack closure: /, 'the hub\'s chip');
  assert.match(map, /<g class="hub-shock up"[^>]*><title>Tax run: /, 'the city\'s card on the other hubs');
  // The command: a card by name, with a modifier, or a warning.
  const t = world();
  assert.equal(play(t, 'developer ticker census lingering').filter((e) => e.type === 'ticker').length, 1);
  assert.equal(t.ticker.live[0].mod, 'lingering');
  assert.ok(play(t, 'developer ticker census').some((e) => e.type === 'warning'), 'up already');
  assert.ok(play(t, 'developer ticker nothing').some((e) => e.type === 'warning' && /developer ticker \[premium\|/.test(e.message)));
  assert.equal(play(t, 'developer ticker').filter((e) => e.type === 'ticker').length, 1, 'any card that fits');
});
