// Supply orders (docs/economy.md 3, docs/pays.md): each faction keeps one standing order for one ware, never on a clock:
// Halcyon Cipher code, Kestrel Kernel, LANTERN Worm, NULL CHOIR components, GLASSJAW Exploits. It asks for 10 + level/2
// (Exploits 1 + level/15) at your level now, and pays at once: the hub's price ×1.5 in credits and +4 rep (with its
// ripples, as any rep). The next comes an hour of play after you deliver (s.pace.ms, so nothing turns over while you're
// away). The main sink for code, components and Exploits. Saved: s.supply[faction] = { next, done }, the play time its
// next order opens and how many you've filled; made on the first delivery.
import { emit, warn, materialsOf, hackerLevel } from './combat.mjs';
import { FACTIONS, changeRep, hubFound, hubsOf } from './factions.mjs';
import { WARES, priceOf } from './market.mjs';
import { componentsOf, spend } from './salvage.mjs';

export const SUPPLY = {
  wants: { halcyon: 'cipher', kestrel: 'kernel', lantern: 'worm', nullchoir: 'salvage', glassjaw: 'exploit' },
  pay: 1.5, // the hub's price, times this
  rep: 4,
  nextMs: 60 * 60000, // of play, after a delivery
  amount: (w, L) => (w === 'exploit' ? Math.floor(1 + L / 15) : Math.floor(10 + L / 2)),
};
const playMs = (s) => s.pace?.ms || 0;
export const stockOf = (s, w) => (w === 'salvage' ? componentsOf(s) : materialsOf(s)[w] || 0);

// A faction's order now, or null before the hubs open or its hub is found: { f, ware, name, n, have, credits, rep,
// ready (you hold enough), leftMs (play time until it opens; 0 when it's open), done }.
export function supplyOf(s, f) {
  const w = SUPPLY.wants[f];
  if (!w || !hubsOf(s).length || !hubFound(s, f)) return null;
  const o = s.supply?.[f] || {}, n = SUPPLY.amount(w, hackerLevel(s)), have = stockOf(s, w), leftMs = Math.max(0, (o.next || 0) - playMs(s));
  return { f, ware: w, name: WARES[w].name, n, have, credits: Math.round(n * priceOf(s, f, w) * SUPPLY.pay), rep: SUPPLY.rep, ready: !leftMs && have >= n, leftMs, done: o.done || 0 };
}

// `deliver <faction>`: fill its order from what you hold. Paid at once; the next opens an hour of play later.
export function deliver(s, f) {
  if (!FACTIONS[f] || !SUPPLY.wants[f]) return warn(s, `Deliver to: ${Object.keys(SUPPLY.wants).join(', ')}.`);
  if (!hubsOf(s).length) return warn(s, 'Supply orders open with the faction hubs.');
  if (!hubFound(s, f)) return warn(s, `You haven't located ${FACTIONS[f].short}'s hub yet.`);
  const o = supplyOf(s, f);
  if (o.leftMs) return warn(s, `${FACTIONS[f].short}'s next order comes in ${Math.ceil(o.leftMs / 60000)} min of play.`);
  if (o.have < o.n) return warn(s, `${FACTIONS[f].short} wants ${o.n} ${o.name}. You have ${o.have}.`);
  if (o.ware === 'salvage') spend(s, o.n); else materialsOf(s)[o.ware] -= o.n;
  s.server.credits += o.credits;
  (s.supply ||= {})[f] = { next: playMs(s) + SUPPLY.nextMs, done: o.done + 1 };
  emit(s, 'supply', `${FACTIONS[f].short}'s supply order filled: ${o.n} ${o.name} for ${o.credits} credits.`, { faction: f });
  changeRep(s, f, o.rep, `${FACTIONS[f].short}'s supply order`);
}
