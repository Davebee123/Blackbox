// Markets: each faction hub buys and sells what you farm (the three codes, Exploits, salvage).
// Prices move on things you can't change: each hub's own condition (Kestrel's data centre runs
// hot, so it pays well for Kernel code to tune its racks), a world event that rotates every few
// hours, and how much has been sold there lately (you selling a lot drives the price down; it
// recovers over real time). What you can do is read them and trade where the prices are good.
//
// Trades are file transfers: what you sell leaves your stock now and its credits arrive when the
// transfer completes; what you buy is paid now and arrives later. Transfer time depends on the hub, and
// relays on servers you hold shorten it. A transfer can't be lost: the worst case is waiting.
import { emit, warn, materialsOf, hooks, rand } from './combat.mjs';
import { addFilter, rollFilter } from './filters.mjs';
import { FACTIONS, hubsOf, hostile, repTier, buyFrom, hubFound } from './factions.mjs';
import { seeded } from './gear.mjs';
import { deliverGoods } from './store.mjs';
import { broadcast } from './station.mjs';

const now = () => hooks.now?.() ?? Date.now();

// What trades, and its base price (credits a unit).
export const WARES = {
  cipher: { name: 'Cipher code', base: 14 },
  worm: { name: 'Worm code', base: 14 },
  kernel: { name: 'Kernel code', base: 14 },
  exploit: { name: 'Exploits', base: 140 },
  salvage: { name: 'Salvage', base: 7 },
};
export const WARE_IDS = Object.keys(WARES);

// Conditions: a multiplier on what a hub pays (and asks) for each ware. Each hub has its own,
// fixed; one world event at a time touches every hub.
export const CONDITIONS = {
  claims: { name: 'Claims backlog', about: 'Halcyon is buried in ransomware claims and pays to study the code.', mult: { cipher: 1.35 } },
  blackbudget: { name: 'Black budget', about: 'GLASSJAW buys every Exploit it can, no questions.', mult: { exploit: 1.5 } },
  hotracks: { name: 'Overheating racks', about: 'Kestrel’s north data centre runs hot: Kernel code tunes the CPUs, salvage patches the cooling.', mult: { kernel: 1.8, salvage: 1.25 } },
  thinpipe: { name: 'Thin bandwidth', about: 'LANTERN’s relay is starved: Worm code carries its traffic.', mult: { worm: 1.45 } },
  scrapyard: { name: 'Scrap economy', about: 'NULL CHOIR lives on salvage and has more than it needs.', mult: { salvage: 0.6, cipher: 1.15 } },
};
export const HUB_CONDITION = { halcyon: 'claims', glassjaw: 'blackbudget', kestrel: 'hotracks', lantern: 'thinpipe', nullchoir: 'scrapyard' };
export const EVENTS = {
  outbreak: { name: 'Ransomware outbreak', about: 'A wave of ransomware: everyone wants Cipher code.', mult: { cipher: 1.5 } },
  wormseason: { name: 'Worm season', about: 'A worm tearing through the backbone: Worm code is in demand.', mult: { worm: 1.5 } },
  patchday: { name: 'Patch Tuesday', about: 'Everyone patched last night: code is cheap for a while.', mult: { cipher: 0.8, worm: 0.8, kernel: 0.8 } },
  zerorush: { name: 'Zero-day rush', about: 'A zero-day market panic: Exploits fetch a fortune.', mult: { exploit: 1.6 } },
  blackout: { name: 'Grid blackout', about: 'A city grid failed: salvage and Kernel code go to rebuilding.', mult: { salvage: 1.5, kernel: 1.25 } },
  calm: { name: 'Quiet market', about: 'Nothing moving. Prices sit near normal.', mult: {} },
};
export const MARKET = {
  spread: 0.15, // a hub asks 15% over its price and pays 15% under
  pressure: 0.04, // each unit sold there lately takes 4% off its price (bought, adds 4%)
  recover: 0.12, // and the pressure eases 12% an hour
  eventMs: 4 * 3600000, // the world event turns over every 4 hours
  travelMin: { halcyon: 5, kestrel: 8, lantern: 10, glassjaw: 12, nullchoir: 15 }, // file transfer, minutes
  relayCut: 0.1, // each relay you've installed: 10% faster, up to 40%
  maxLots: 99,
  wiperBoost: 1.25, // while a hub is wiped offline, the others pay 25% more for what it was buying
};

const marketOf = (s) => (s.market ||= { pressure: {}, transfers: [], serial: 0, event: 'calm', eventUntil: 0, at: null });
export const eventOf = (s) => EVENTS[marketOf(s).event] || EVENTS.calm;

// What moves a hub's price that you can't: its condition × the world event × a wiped hub elsewhere.
export function outsideMult(s, f, w) {
  const cond = CONDITIONS[HUB_CONDITION[f]]?.mult[w] ?? 1, ev = eventOf(s).mult[w] ?? 1;
  const t = now(), gap = Object.entries(s.hubs || {}).some(([g, h]) => g !== f && (h.offlineUntil || 0) > t && (CONDITIONS[HUB_CONDITION[g]]?.mult[w] || 0) > 1) ? MARKET.wiperBoost : 1;
  return cond * ev * gap;
}
// The price at a hub for one unit, before the spread: base × outside factors × your own pressure
// (selling pushes it down to 35% at most, buying up to 160%).
export function priceOf(s, f, w) {
  const p = marketOf(s).pressure[f]?.[w] || 0;
  return WARES[w].base * outsideMult(s, f, w) * Math.min(1.6, Math.max(0.35, 1 - MARKET.pressure * p));
}
// What you'd get selling one, and pay buying one (whole credits). Better rep trades a little better.
export function quote(s, f, w) {
  const t = repTier(s, f).i, mine = !!s.hubs?.[f]?.captured, edge = mine ? MARKET.spread : Math.max(0, t - 1) * 0.02; // a hub you hold trades at its true price
  const p = priceOf(s, f, w);
  return { sell: Math.max(1, Math.floor(p * (1 - MARKET.spread + edge))), buy: Math.max(1, Math.ceil(p * (1 + MARKET.spread - edge))), mult: p / WARES[w].base };
}
const have = (s, w) => (w === 'salvage' ? (s.salvage || []).length : materialsOf(s)[w] || 0);
const relays = (s) => (s.locations || []).filter((l) => l.relay).length;
export const travelMs = (s, f) => Math.round(MARKET.travelMin[f] * 60000 * (1 - Math.min(0.4, MARKET.relayCut * relays(s))));

// Send a sale or an order. side: 'sell' | 'buy'.
export function trade(s, side, f, w, n, at = now()) {
  n = Math.floor(Number(n) || 0);
  if (!FACTIONS[f] || !hubsOf(s).length) return warn(s, 'Markets open with the faction hubs.');
  if (!hubFound(s, f)) return warn(s, `You haven't located ${FACTIONS[f].short}'s hub yet.`);
  if (!WARES[w]) return warn(s, `Wares: ${WARE_IDS.join(', ')}.`);
  if (hostile(s, f)) return warn(s, `${FACTIONS[f].short} won’t trade with you.`);
  if ((s.hubs?.[f]?.offlineUntil || 0) > at) return warn(s, `${FACTIONS[f].hub.name} is offline.`);
  if (n < 1 || n > MARKET.maxLots) return warn(s, `How many? 1–${MARKET.maxLots}.`);
  const m = marketOf(s), q = quote(s, f, w);
  ((m.pressure[f] ||= {})[w] ||= 0);
  if (side === 'sell') {
    if (have(s, w) < n) return warn(s, `You have ${have(s, w)} ${WARES[w].name}.`);
    // The price slides over the lot. Each unit is priced after its own push, so selling a lot
    // exactly undoes buying it (never a profit on the round trip, even with no spread).
    let credits = 0;
    for (let i = 0; i < n; i++) { m.pressure[f][w] += 1; credits += quote(s, f, w).sell; }
    if (w === 'salvage') s.salvage.splice(0, n); else materialsOf(s)[w] -= n;
    const t = { id: ++m.serial, side, f, w, n, credits, sentAt: at, landsAt: at + travelMs(s, f) };
    m.transfers.push(t);
    return emit(s, 'transfer-out', `Sending ${n} ${WARES[w].name} to ${FACTIONS[f].short}: ${credits} credits when it completes (${Math.round((t.landsAt - at) / 60000)} min).`, { faction: f });
  }
  let cost = 0;
  for (let i = 0; i < n; i++) { cost += quote(s, f, w).buy; m.pressure[f][w] -= 1; }
  if (s.server.credits < cost) { m.pressure[f][w] += n; return warn(s, `${n} ${WARES[w].name} costs ${cost} credits; you have ${s.server.credits}.`); }
  s.server.credits -= cost;
  const t = { id: ++m.serial, side, f, w, n, credits: cost, sentAt: at, landsAt: at + travelMs(s, f) };
  m.transfers.push(t);
  emit(s, 'transfer-out', `Ordered ${n} ${WARES[w].name} from ${FACTIONS[f].short} for ${cost} credits: it arrives in ${Math.round((t.landsAt - at) / 60000)} min.`, { faction: f });
}
// What an order would do, without doing it: the lot's total at its sliding prices, the first and last
// unit's price, and the same lot priced at the average of the other hubs you can reach (the honest
// "profit or loss": selling here beats or trails selling elsewhere; buying here costs more or less).
function lotTotal(s, side, f, w, n) {
  const m = marketOf(s), was = (m.pressure[f] ||= {})[w] || 0;
  let total = 0, first = 0, last = 0;
  for (let i = 0; i < n; i++) {
    if (side === 'sell') { m.pressure[f][w] = was + i + 1; last = quote(s, f, w).sell; }
    else { m.pressure[f][w] = was - i; last = quote(s, f, w).buy; }
    if (!i) first = last;
    total += last;
  }
  m.pressure[f][w] = was;
  return { total, first, last };
}
export function orderQuote(s, side, f, w, n) {
  n = Math.max(1, Math.floor(n));
  const here = lotTotal(s, side, f, w, n);
  const others = hubsOf(s).map((h) => h.faction).filter((g) => g !== f && !hostile(s, g));
  const avg = others.length ? Math.round(others.reduce((a, g) => a + lotTotal(s, side, g, w, n).total, 0) / others.length) : here.total;
  const vs = side === 'sell' ? here.total - avg : avg - here.total; // positive: better than the average elsewhere
  return { n, side, ...here, credits: side === 'sell' ? here.total : -here.total, after: s.server.credits + (side === 'sell' ? here.total : -here.total), vs, minutes: Math.round(travelMs(s, f) / 60000) };
}
// The most of a ware you can trade here at once: what you hold (sell), or what you can afford (buy).
export function orderMax(s, side, f, w) {
  if (side === 'sell') return Math.min(MARKET.maxLots, have(s, w));
  let n = 0;
  while (n < MARKET.maxLots && lotTotal(s, 'buy', f, w, n + 1).total <= s.server.credits) n++;
  return n;
}

// The clock (real time, offline too): transfers complete, pressure eases, the world event turns over.
export function tickMarket(s, at = now()) {
  if (!hubsOf(s).length) return;
  const m = marketOf(s);
  const hours = m.at == null ? 0 : Math.max(0, at - m.at) / 3600000;
  m.at = at;
  if (hours) for (const f of Object.keys(m.pressure)) for (const w of Object.keys(m.pressure[f])) m.pressure[f][w] *= Math.pow(1 - MARKET.recover, hours);
  if (at >= (m.eventUntil || 0)) {
    // Seeded by the clock, not the game's dice: the market doesn't move anything else's luck.
    const first = !m.eventUntil, keys = Object.keys(EVENTS).filter((k) => k !== m.event);
    m.event = keys[Math.floor(seeded(Math.floor(at / 60000) >>> 0)() * keys.length)];
    m.eventUntil = at + MARKET.eventMs;
    if (!first) emit(s, 'market-event', `Market: ${EVENTS[m.event].name}. ${EVENTS[m.event].about}`, {});
  }
  s.salvage ||= [];
  for (const t of m.transfers.filter((x) => at >= x.landsAt)) {
    m.transfers.splice(m.transfers.indexOf(t), 1);
    if (t.side === 'good') {
      emit(s, 'transfer-in', `Transfer complete from ${FACTIONS[t.f].short}: ${t.name}.`, { faction: t.f });
      if (t.good === 'tip') broadcast(s); // a broadcast schedule bought before LANTERN dropped it
      else if (t.good === 'bootleg') addFilter(s, rollFilter(() => rand(s), { level: t.L, rarity: rand(s) < 0.7 ? 'stock' : 'tuned' }), 'Unsealed: ');
      else deliverGoods(s, t.good, t.L);
      continue;
    }
    if (t.side === 'sell') { s.server.credits += t.credits; emit(s, 'transfer-in', `Transfer complete to ${FACTIONS[t.f].short}: +${t.credits} credits for ${t.n} ${WARES[t.w].name}.`, { faction: t.f }); }
    else {
      if (t.w === 'salvage') for (let i = 0; i < t.n; i++) s.salvage.push({ name: `${FACTIONS[t.f].short} salvage`, virus: 'market', seed: 0 });
      else materialsOf(s)[t.w] = (materialsOf(s)[t.w] || 0) + t.n;
      emit(s, 'transfer-in', `Transfer complete from ${FACTIONS[t.f].short}: +${t.n} ${WARES[t.w].name}.`, { faction: t.f });
    }
  }
}
export const transfersOf = (s) => marketOf(s).transfers;
// A hub's specialty good, bought (factions.mjs buyFrom): paid now, it lands like any transfer.
export function sendGood(s, f, id, name, credits, L, at = now()) {
  const m = marketOf(s);
  const t = { id: ++m.serial, side: 'good', f, good: id, name, n: 1, L, credits, sentAt: at, landsAt: at + travelMs(s, f) };
  m.transfers.push(t);
  emit(s, 'transfer-out', `Bought ${name} from ${FACTIONS[f].short} for ${credits} credits: it lands in ${Math.round((t.landsAt - at) / 60000)} min.`, { faction: f, item: id });
}
// The most any hub would pay you for one right now: shops never sell below it (store.mjs), so
// there's no buying from a shelf to sell straight to a market.
export const bestSell = (s, w) => (hubsOf(s).length && WARES[w] ? Math.max(...hubsOf(s).map((h) => quote(s, h.faction, w).sell)) : 0); // the hubs you can reach
export function marketCommand(s, text, at = now()) {
  const [, side, f, w, n] = text.split(' ');
  if (side === 'buy' && FACTIONS[f]?.shop.includes(w)) return buyFrom(s, f, w, at); // a hub's specialty good (factions.mjs)
  if (side === 'sell' || side === 'buy') return trade(s, side, f, w, n, at);
  return warn(s, 'market sell|buy <faction> <ware> <n> · market buy <faction> <good>');
}
