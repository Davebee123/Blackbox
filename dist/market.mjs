// Markets: each faction hub buys and sells what you farm (the three codes, Exploits, salvage).
// Prices move on things you can't change: each hub's own condition (Kestrel's data centre runs
// hot, so it pays well for Kernel code to tune its racks), a world event that rotates every few
// hours, and how much has been sold there lately (you selling a lot drives the price down; it
// recovers over real time). What you can do is read them and trade where the prices are good.
//
// Trades are file transfers: what you sell leaves your stock now and its credits arrive when the
// transfer completes; what you buy is paid now and arrives later. Transfer time depends on the hub, and
// relays on servers you hold shorten it. A transfer can't be lost: the worst case is waiting.
import { emit, warn, materialsOf, hooks } from './combat.mjs';
import { FACTIONS, hubsOf, hostile, repTier } from './factions.mjs';
import { seeded } from './gear.mjs';

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

// The price at a hub for one unit, before the spread: base × its condition × the event × pressure.
export function priceOf(s, f, w) {
  const m = marketOf(s);
  const cond = CONDITIONS[HUB_CONDITION[f]]?.mult[w] ?? 1, ev = eventOf(s).mult[w] ?? 1;
  const p = m.pressure[f]?.[w] || 0;
  const t = now(), gap = Object.entries(s.hubs || {}).some(([g, h]) => g !== f && (h.offlineUntil || 0) > t && (CONDITIONS[HUB_CONDITION[g]]?.mult[w] || 0) > 1) ? MARKET.wiperBoost : 1;
  return WARES[w].base * cond * ev * gap * Math.max(0.35, 1 - MARKET.pressure * p);
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
  if (!WARES[w]) return warn(s, `Wares: ${WARE_IDS.join(', ')}.`);
  if (hostile(s, f)) return warn(s, `${FACTIONS[f].short} won’t trade with you.`);
  if ((s.hubs?.[f]?.offlineUntil || 0) > at) return warn(s, `${FACTIONS[f].hub.name} is offline.`);
  if (n < 1 || n > MARKET.maxLots) return warn(s, `How many? 1–${MARKET.maxLots}.`);
  const m = marketOf(s), q = quote(s, f, w);
  ((m.pressure[f] ||= {})[w] ||= 0);
  if (side === 'sell') {
    if (have(s, w) < n) return warn(s, `You have ${have(s, w)} ${WARES[w].name}.`);
    // The price slides over the lot: average over the lot.
    let credits = 0;
    for (let i = 0; i < n; i++) { credits += quote(s, f, w).sell; m.pressure[f][w] += 1; }
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
    if (t.side === 'sell') { s.server.credits += t.credits; emit(s, 'transfer-in', `Transfer complete to ${FACTIONS[t.f].short}: +${t.credits} credits for ${t.n} ${WARES[t.w].name}.`, { faction: t.f }); }
    else {
      if (t.w === 'salvage') for (let i = 0; i < t.n; i++) s.salvage.push({ name: `${FACTIONS[t.f].short} salvage`, virus: 'market', seed: 0 });
      else materialsOf(s)[t.w] = (materialsOf(s)[t.w] || 0) + t.n;
      emit(s, 'transfer-in', `Transfer complete from ${FACTIONS[t.f].short}: +${t.n} ${WARES[t.w].name}.`, { faction: t.f });
    }
  }
}
export const transfersOf = (s) => marketOf(s).transfers;
export function marketCommand(s, text, at = now()) {
  const [, side, f, w, n] = text.split(' ');
  if (side === 'sell' || side === 'buy') return trade(s, side, f, w, n, at);
  return warn(s, 'market sell|buy <faction> <ware> <n>');
}
