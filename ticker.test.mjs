// The ticker (ticker.mjs, docs/ticker.md): market cards on logged-on time, seeded per network, that move hub prices and
// say why in their owners' voices. On fixed seeds.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, addLocation } from './dist/combat.mjs';
import { TICK, MODS, STYLES, TICKER_CARDS, RARE_CARDS, RIVALS, CREW_MULT, tickerSig, sigFor, tickerOf, tickTicker, dealTicker, tickerMult, tickerAt, tickerTip, tickerKind, orderLeft, raresLeft } from './dist/ticker.mjs';
import { trade, quote, transfersOf } from './dist/market.mjs';
import { tickChannel, channelOf } from './dist/channel.mjs';
import { castOf } from './dist/runners.mjs';
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
  assert.ok(Math.max(...most) <= TICK.max, `never more than ${TICK.max}`);
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
  for (let i = 0; i < 40; i++) { tickerOf(s).live = []; const c = dealTicker(s); assert.ok(c.moves.every((x) => x.hub === '*' || x.hub === 'halcyon'), c.card); }
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
  dealTicker(s, 'rack', null); dealTicker(s, 'tax', null); // plain: a Leaked one waits five minutes
  tickerOf(s).live.forEach((c) => delete c.order);
  const c = s.ticker.live[0], html = hubTerminalMarkup(s, 'kestrel', hubBanner(s, 'kestrel'), 'market');
  const head = html.match(/<div class="mk-tags">[\s\S]*?<\/div>/)[0];
  // The condition and each card a square: its icon; the name, what it does and the line on hover.
  assert.match(head, /^<div class="mk-tags"><span class="tk-sq cond" tabindex="0" title="Overheating racks: Multiplies the price of Kernel code here by 1\.8 and of components by 1\.25\.\n▸ [^"]+" data-tt-kind="Kestrel · Hub condition"><svg class="glyph tk-ico"/);
  assert.match(head, new RegExp(`<span class="tk-sq mk-card ${c.moves[0].mult > 1 ? 'up' : 'down'}" tabindex="0" title="Rack closure: Multiplies the price of components here by ${c.moves[0].mult}\\. Ends in ${c.ms / MIN} minutes\\.\\n▸ “Rack 4 will close at the end of this cycle\\. Please collect your belongings\\.”" data-tt-kind="Kestrel · Market card[^"]*"><svg class="glyph tk-ico"[^>]*>.*?</svg><i style="width:100%"></i></span>`));
  assert.match(head, /title="Tax run: [^"]*"/, 'the city\'s card at every hub');
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
  play(t, 'developer ticker');
  assert.equal(t.ticker.live.length, 2, 'any card that fits');
});

test('a bulk order: three price cards in ten carry one, sized by its ware, and it holds the price until it is filled', () => {
  // How often and how big, over many deals.
  const t = world(); tickTicker(t, 0);
  const cards = dealt(t, 3000).filter((c) => c.moves.some((x) => x.hub !== '*' && x.ware !== '*' && x.mult > 1) && c.card !== 'early');
  const with_ = cards.filter((c) => c.order);
  assert.ok(with_.length / cards.length > 0.25 && with_.length / cards.length < 0.35, `${with_.length} in ${cards.length}`);
  for (const c of with_) {
    const [lo, hi] = c.order.ware === 'salvage' ? [40, 120] : c.order.ware === 'exploit' ? [2, 6] : [20, 60];
    assert.ok(c.order.n >= lo && c.order.n <= hi && c.order.left === c.order.n, `${c.order.ware} ${c.order.n}`);
    assert.ok(c.moves.some((x) => x.hub === c.order.hub && x.ware === c.order.ware && x.mult > 1), 'on a price the card raises');
  }
  // Selling into it takes nothing off the price; past it, each unit presses as before.
  const s = world(), c = dealTicker(s, 'rack', null);
  c.order = { hub: 'kestrel', ware: 'salvage', n: 5, left: 5 };
  s.components = 20;
  const before = quote(s, 'kestrel', 'salvage').sell;
  assert.equal(orderLeft(s, 'kestrel', 'salvage'), 5);
  trade(s, 'sell', 'kestrel', 'salvage', 3);
  assert.equal(quote(s, 'kestrel', 'salvage').sell, before, 'held');
  assert.equal(c.order.left, 2);
  assert.equal(transfersOf(s)[0].credits, before * 3);
  trade(s, 'sell', 'kestrel', 'salvage', 4); // two into the order, two pressing
  assert.equal(c.order.left, 0);
  assert.ok(quote(s, 'kestrel', 'salvage').sell < before);
  // On the screen: a chip on the ware's price, its tooltip in WoW grammar.
  c.order = { hub: 'kestrel', ware: 'salvage', n: 31, left: 31 };
  const html = hubTerminalMarkup(s, 'kestrel', hubBanner(s, 'kestrel'), 'market');
  assert.match(html, /<span class="mk-want" title="Bulk order: Kestrel buys 31 more components at this price\. Selling into it doesn(?:'|&#39;)t lower the price\. Ends with Rack closure in 20 minutes\." data-tt-kind="Kestrel · Bulk order"><svg[^>]*>.*?<\/svg>31<\/span>/);
});

test('two buyers: rival hubs bid ×1.4 for one ware at once, posted by Corvid Exchange', () => {
  const s = world(), c = dealTicker(s, 'rivals', null);
  assert.equal(c.moves.length, 2);
  assert.ok(RIVALS.some((p) => p.join() === c.moves.map((x) => x.hub).join()), c.moves.map((x) => x.hub).join());
  assert.equal(c.moves[0].ware, c.moves[1].ware);
  assert.ok(c.moves.every((x) => x.mult === 1.4));
  const said = s.logs.at(-1);
  assert.match(said.message, /^Corvid Exchange: \w[\w ]+ and [\w ]+ are bidding against each other for [\w ]+\.$/);
  // Only rivals with both hubs found.
  const t = fresh(); t.tutorialCompleted = true; t.netSeed = 777; command(t, 'mail'); t.mail.boardOpen = true; t.hubFound = { kestrel: true };
  assert.equal(dealTicker(t, 'rivals'), null);
});

test('a corner: a runner on the net buys up one code at their hub, ×1.4 for 10 minutes, on #net in their voice', () => {
  const s = world();
  tickChannel(s, 0);
  const c = dealTicker(s, 'corner', null);
  const r = castOf(s).find((x) => x.handle === c.who);
  assert.ok(r, 'a runner on the net now');
  assert.deepEqual(c.moves, [{ hub: r.faction, ware: c.moves[0].ware, mult: 1.4 }]);
  assert.ok(['cipher', 'worm', 'kernel'].includes(c.moves[0].ware));
  assert.equal(c.ms, 10 * MIN);
  assert.equal(c.mod, undefined, 'no modifier');
  assert.match(s.logs.at(-1).message, new RegExp(`^${c.who}: buying every (cipher|worm|kernel) lot at [a-z ]+\\. sell me yours$`));
  tickChannel(s, 0);
  assert.ok(channelOf(s).lines.some((l) => l.kind === 'sim' && l.from === c.who && /every (cipher|worm|kernel) lot/i.test(l.text)), '#net');
  assert.equal(tickerAt(s, r.faction, c.moves[0].ware)[0].owner, c.who);
});

test('rare cards: each network holds two of five, each dealt once a playthrough, price effects only', () => {
  const a = tickerSig(3).rare, b = tickerSig(2).rare;
  assert.equal(new Set(a).size, 2); assert.ok(a.every((k) => RARE_CARDS[k]));
  assert.ok([1, 2, 3, 4, 5, 6, 7, 8].some((n) => tickerSig(n).rare.join() !== a.join()), 'networks differ');
  const s = world(3); tickTicker(s, 0);
  assert.equal(s.ticker.rare, undefined, 'made on first use');
  const got = dealt(s, 2000).filter((c) => RARE_CARDS[c.card]).map((c) => c.card);
  assert.deepEqual(got.sort(), [...a].sort(), 'each once');
  assert.deepEqual(raresLeft(s), []);
  // Rack zero: components ×1.5 at Kestrel and Kernel ×0.6 everywhere, 30 min; a rare card's kind line says so.
  const t = world(), z = dealTicker(t, 'rackzero');
  assert.equal(z.ms, 30 * MIN);
  assert.ok(near(tickerMult(t, 'kestrel', 'salvage'), 1.5) && near(tickerMult(t, 'lantern', 'kernel'), 0.6) && near(tickerMult(t, 'kestrel', 'kernel'), 0.6));
  assert.match(tickerKind(tickerAt(t, 'kestrel')[0]), /^Kestrel · Rare market card$/);
  assert.match(hubTerminalMarkup(t, 'kestrel', hubBanner(t, 'kestrel'), 'market'), /class="tk-sq mk-card (up|down) rare"[\s\S]*?<b class="tk-star">★<\/b>/);
});

test('Leaked: GLASSJAW puts the card on the Log five minutes ahead. Quiet: no Log line, only the hub\'s tag', () => {
  const s = world(), first = s.serial, c = dealTicker(s, 'thermal', 'leaked');
  s.ticker.next = Infinity;
  assert.equal(c.mod, 'leaked');
  const said = s.logs.filter((e) => e.id > first);
  assert.deepEqual(said.map((e) => e.message), ['GLASSJAW: In five minutes, Kestrel posts this: “The north aisle is running warm. Kernel code is wanted for the tuning.”']);
  assert.equal(tickerMult(s, 'kestrel', 'kernel'), 1, 'not yet');
  tickTicker(s, 4 * MIN); assert.equal(tickerMult(s, 'kestrel', 'kernel'), 1);
  tickTicker(s, 2 * MIN); assert.equal(tickerMult(s, 'kestrel', 'kernel'), 1.6, 'now');
  assert.equal(c.left, 19 * MIN, 'its own minutes start when it moves');
  assert.equal(dealTicker(world(), 'auction', 'leaked').mod, undefined, 'never GLASSJAW leaking its own');
  const t = world(), n = t.serial, q = dealTicker(t, 'census', 'quiet');
  assert.equal(q.mod, 'quiet');
  assert.equal(t.logs.filter((e) => e.id > n && e.type === 'ticker').length, 0, 'no Log line');
  assert.match(hubTerminalMarkup(t, 'lantern', hubBanner(t, 'lantern'), 'market'), /class="tk-sq mk-card up" tabindex="0" title="Census: /);
  assert.match(tickerKind(tickerAt(t, 'lantern')[0]), /· Quiet$/);
});

test('a crew\'s run: the director\'s Outbreak, its code ×0.8 everywhere while it runs, the crew\'s line on #net', () => {
  const s = world(); s.hackers = { breaker: { level: 12, xp: 0 } };
  s.events = [{ id: 1, card: 'outbreak', family: 'ransomware', left: 30 * MIN, loc: null }];
  for (const f of FACTION_IDS) assert.ok(near(tickerMult(s, f, 'cipher'), CREW_MULT), f);
  assert.equal(tickerMult(s, 'kestrel', 'worm'), 1);
  const c = tickerAt(s, 'halcyon', 'cipher')[0];
  assert.equal(c.name, "TOLLGATE's run");
  assert.equal(tickerKind(c), 'TOLLGATE · Crew run');
  assert.match(hubTerminalMarkup(s, 'halcyon', hubBanner(s, 'halcyon'), 'market'), /class="tk-sq mk-card crew" tabindex="0" title="TOLLGATE(?:'|&#39;)s run: Multiplies the price of Cipher code here by 0\.8\./);
  assert.equal(tickerAt(s, 'halcyon')[0].crew, 'tollgate');
  s.events = [{ id: 2, card: 'outbreak', family: 'botnet', left: 10 * MIN }];
  assert.equal(tickerAt(s, 'lantern', 'worm')[0].name, "SWARMLINE's rental");
  s.events = [{ id: 3, card: 'outbreak', family: 'cryptominer', left: 10 * MIN }];
  assert.equal(tickerAt(s, 'lantern').length, 0, 'GLASSJAW\'s family: no crew\'s run');
  s.events = [];
  assert.equal(tickerMult(s, 'halcyon', 'cipher'), 1, 'over with the outbreak');
  // On #net: the crew's own line when the director deals it.
  const t = world(); t.hackers = { breaker: { level: 12, xp: 0 } };
  tickChannel(t, 0);
  const ev = deal(t, 'outbreak');
  tickChannel(t, 0);
  const run = { ransomware: 'TOLLGATE', wiper: 'TOLLGATE', logicbomb: 'TOLLGATE', worm: 'SWARMLINE', botnet: 'SWARMLINE', ghostroot: 'PALEMASK' }[ev.family];
  if (run) assert.ok(channelOf(t).lines.some((l) => l.kind === 'crew' && l.from === run), channelOf(t).lines.map((l) => l.text).join(' | '));
});

test('three up at once at most, a crew\'s run among them; the window groups them: the condition, up, then down', () => {
  assert.equal(TICK.max, 3);
  const s = world();
  dealTicker(s, 'rack', null); dealTicker(s, 'smallprint', null);
  s.ticker.next = 0;
  s.events = [{ id: 1, card: 'outbreak', family: 'worm', left: 30 * MIN }];
  const n = s.ticker.n;
  tickTicker(s, MIN);
  assert.equal(s.ticker.n, n, 'full: the due card waits');
  s.events = [];
  tickTicker(s, MIN);
  assert.equal(s.ticker.n, n + 1, 'dealt as a slot frees');
  // The squares: condition, then the cards that raise prices, then those that lower them, each group apart.
  const t = world();
  dealTicker(t, 'smallprint', null); dealTicker(t, 'premium', null); dealTicker(t, 'tax', null);
  t.events = [{ id: 2, card: 'outbreak', family: 'ransomware', left: 30 * MIN }];
  const head = hubTerminalMarkup(t, 'halcyon', hubBanner(t, 'halcyon'), 'market').match(/<div class="mk-tags">[\s\S]*?<\/div>/)[0];
  const order = [...head.matchAll(/class="(tk-group|tk-sq [^"]*)"/g)].map((m) => m[1].replace(' mk-card', ''));
  assert.deepEqual(order, ['tk-sq cond', 'tk-group', 'tk-sq up', 'tk-sq up', 'tk-group', 'tk-sq down', 'tk-sq crew']);
});
