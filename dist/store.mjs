// Every hub's Shop, one shape (docs/factions-plan.md 5, docs/economy.md Shops). Opens with the contract board (boardOpen).
//   Tools      relays, key crackers, trace injectors, Signal patches, hot-swap kits: always in stock, at fixed prices
//   The shelf  four protocols at your level with the hub's implicit: two blues, a yellow at the second tier and one at
//              the third (rep tiers, factions.mjs REP_TIERS). It rerolls every 30 minutes of play (s.pace.ms, never the
//              wall clock), and a level up rerolls it; what you buy stays sold until then
//   Chase line the hub's chase protocols (gear.mjs ZERO_DAYS chase, CHASE_LINE names it), at the second to fourth tiers,
//              rolled at your level when you buy one, with the hub's implicit. Halcyon's is Indemnified
//   Codebases  the programs it teaches (sockets.mjs CODEBASE_SHOPS), once each
// Prices: the shelf and the chase line are hours of credits at your level (incomeAt): the credit sink, so drops stay the
// main source of gear. Each tier above the first takes 5% off everything. Halcyon's Shop hands things over at once;
// another hub's come by file transfer (market.mjs sendGood). Code lots, Exploits and salvage are the markets' wares.
import { rollItem, seeded, SLOT_KINDS, STASH_CAP, ZERO_DAYS } from './gear.mjs';
import { emit, warn, rand, hackerLevel, addItem, gainCode, maxSignal, hooks, classOf, slotCount } from './combat.mjs';
import { boardOpen, systemLetter } from './mail.mjs';
import { items } from './hidden.mjs';
import { shopCodebases, learnCodebase } from './sockets.mjs';
import { FACTIONS, repTier, hubFound } from './factions.mjs';
import { sendGood } from './market.mjs';

const now = () => hooks.now?.() ?? Date.now();
export const SHOP = {
  discount: 0.05, // off everything, a rep tier above the first
  rerollMs: 30 * 60000, // of play
  shelf: [{ rarity: 'tuned', need: 0, hours: 3 }, { rarity: 'tuned', need: 0, hours: 3 }, { rarity: 'custom', need: 1, hours: 6 }, { rarity: 'custom', need: 2, hours: 6 }],
  chaseHours: { 1: 8, 2: 12, 3: 20 }, // by the tier that opens it
};
export const TOOLS = {
  relay: { name: 'Relay', about: 'Pings the unknown servers next to a server you have taken over, and flags a contract’s signal. Install it on a server you hold.', credits: (L) => 120 + 8 * L },
  cracker: { name: 'Key cracker', about: 'Reveals the vault key of a server you have found. Use it from the server’s map card.', credits: (L) => 60 + 6 * L },
  injector: { name: 'Trace injector', about: 'Adds 30% to the trace on an unknown server. Use it from the server’s map card.', credits: (L) => 80 + 6 * L },
  signal: { name: 'Signal patch', about: 'Refills your Signal at once.', credits: (L) => 30 + 3 * L },
  repair: { name: 'Hot-swap kit', about: 'Repairs your server’s Integrity at once.', credits: (L) => 40 + 5 * L },
};
// Each hub's chase line: [protocol, the tier it opens at].
export const CHASE = {
  halcyon: [['deductible', 1], ['subrogation', 2], ['actuarial', 2], ['total-loss', 3]],
  kestrel: [['failover', 1], ['escrow', 2], ['cold-aisle', 3]],
  glassjaw: [['shell-company', 1], ['black-budget', 2], ['golden-parachute', 3]],
  lantern: [['carrier-wave', 1], ['numbers-station', 2], ['dead-air', 3]],
  nullchoir: [['refrain', 1], ['round', 2], ['crescendo', 3]],
};
// Credits an hour at level L, taking contracts: about 300 to level 10, 500–900 over the climb to 20, and 40 more a level
// past it (econ.mjs: a level earns about three times the credits from 20 to 30 as from 10 to 20).
export const incomeAt = (L) => (L <= 10 ? 300 : L <= 20 ? 300 + 60 * (L - 10) : 900 + 40 * (L - 20));
const round10 = (n) => Math.round(n / 10) * 10;
const cut = (s, f, n) => round10(n * (1 - SHOP.discount * repTier(s, f).i));
export const hoursPrice = (s, f, hours, L = hackerLevel(s)) => cut(s, f, hours * incomeAt(L));
// v48's settling rate (indemnityRestore): 40 credits a unit of Indemnity, rising with your level.
export const chaseRate = (L) => 40 * (1 + L / 15);

// ---------- the shelf ----------
const SELLERS = ['halcyon', 'glassjaw', 'kestrel', 'lantern', 'nullchoir'];
export const shelfWindow = (s) => Math.floor((s.pace?.ms || 0) / SHOP.rerollMs);
export const shelfLeftMs = (s) => SHOP.rerollMs - ((s.pace?.ms || 0) % SHOP.rerollMs);
// Its dice: the save's seed, the seller, the window and your level (never the game's dice: looking changes nothing else).
const shelfDice = (s, f, w, L) => seeded((((s.seed || 1) * 7919 + (SELLERS.indexOf(f) + 1) * 104729 + L * 131 + w * 977) >>> 0) || 1);
export function shelfOf(s, f) {
  const L = hackerLevel(s), w = shelfWindow(s), box = (s.shelf ||= {});
  if (box[f]?.window === w && box[f].level === L) return box[f].items;
  const r = shelfDice(s, f, w, L), open = [...new Set(SLOT_KINDS.slice(0, slotCount(s)))];
  const order = open.map((g) => [g, r()]).sort((a, b) => a[1] - b[1]).map(([g]) => g);
  const items = SHOP.shelf.map((k, i) => ({ it: rollItem(r, { level: L, rarity: k.rarity, slot: order[i % order.length], cls: classOf(s), faction: f }), need: k.need, hours: k.hours, sold: false }));
  box[f] = { window: w, level: L, items };
  return items;
}

// ---------- a hub's Shop, as the window shows it ----------
export function shopOf(s, f) {
  const L = hackerLevel(s), t = repTier(s, f).i;
  return {
    tools: Object.entries(TOOLS).map(([id, g]) => ({ id, name: g.name, about: g.about, price: cut(s, f, g.credits(L)), have: items(s)[id] || 0 })),
    shelf: shelfOf(s, f).map((x, i) => ({ ...x, i, price: hoursPrice(s, f, x.hours, L), locked: t < x.need })),
    chase: (CHASE[f] || []).map(([id, need]) => ({ id, need, name: ZERO_DAYS[id].name, about: ZERO_DAYS[id].effect, price: hoursPrice(s, f, SHOP.chaseHours[need], L), locked: t < need })),
    codebases: shopCodebases(s, f, L).map((x) => ({ ...x, price: cut(s, f, x.price), locked: t < x.tier, need: x.tier })),
    leftMs: shelfLeftMs(s),
  };
}
// What a chase protocol comes out as when you buy it: at your level, with its hub's implicit.
export const chaseItem = (s, f, id, r = () => rand(s)) => rollItem(r, { level: hackerLevel(s), zeroDay: id, faction: f });

// Why an item can't be bought now (or null).
function itemBlock(s, price) {
  if ((s.stash || []).length >= STASH_CAP) return `Your stash is full (${STASH_CAP}).`;
  if (s.server.credits < price) return `It costs ${price} credits. You have ${s.server.credits}.`;
  return null;
}
export const blockOf = itemBlock;

// buy <what> at hub f. what: a tool's id, shelf-<n>, a chase protocol's id, or codebase-<id>.
export function buyAt(s, f, what, at = now()) {
  if (!FACTIONS[f]) return warn(s, 'No such hub.');
  if (!boardOpen(s)) return warn(s, `${FACTIONS[f].short}’s Shop opens to contractors. Finish LOWLIGHT’s jobs first.`);
  if (!hubFound(s, f)) return warn(s, `${FACTIONS[f].short}’s hub isn’t on your map yet.`);
  const shop = shopOf(s, f), tiers = FACTIONS[f].tiers, here = f === 'halcyon', L = hackerLevel(s);
  const pay = (price, name) => { s.server.credits -= price; if (here) emit(s, 'bought', `Bought ${name} for ${price} credits.`, { item: what }); };
  const tool = shop.tools.find((x) => x.id === what);
  if (tool) {
    if (s.server.credits < tool.price) return warn(s, `${tool.name} costs ${tool.price} credits.`);
    pay(tool.price, `a ${tool.name.toLowerCase()}`);
    return here ? deliverGoods(s, what, L) : sendGood(s, f, what, tool.name, tool.price, L, at);
  }
  const shelf = what?.startsWith('shelf-') ? shop.shelf[Number(what.slice(6))] : null;
  if (shelf) {
    if (shelf.sold) return warn(s, 'Sold. The shelf restocks soon.');
    if (shelf.locked) return warn(s, `${shelf.it.name} is for ${tiers[shelf.need]} and up.`);
    const why = itemBlock(s, shelf.price);
    if (why) return warn(s, why);
    shelfOf(s, f)[shelf.i].sold = true;
    pay(shelf.price, shelf.it.name);
    return here ? addItem(s, shelf.it, 'Halcyon: ') : sendGood(s, f, 'shelf', shelf.it.name, shelf.price, L, at, shelf.it);
  }
  const ch = shop.chase.find((x) => x.id === what);
  if (ch) {
    if (ch.locked) return warn(s, `${ch.name} is for ${tiers[ch.need]} and up.`);
    const why = itemBlock(s, ch.price);
    if (why) return warn(s, why);
    const it = chaseItem(s, f, what);
    pay(ch.price, ch.name);
    return here ? addItem(s, it, 'Halcyon: ') : sendGood(s, f, 'chase', ch.name, ch.price, L, at, it);
  }
  const cb = what?.startsWith('codebase-') ? shop.codebases.find((x) => x.id === what.slice(9)) : null;
  if (cb) {
    if (cb.known) return warn(s, `You already know the ${cb.name}.`);
    if (cb.locked) return warn(s, `The ${cb.name} is for ${tiers[cb.need]} and up.`);
    if (s.server.credits < cb.price) return warn(s, `The ${cb.name} costs ${cb.price} credits.`);
    pay(cb.price, `the ${cb.name}`);
    return here ? learnCodebase(s, cb.id, 'Halcyon: ') : sendGood(s, f, `cb-${cb.id}`, cb.name, cb.price, L, at);
  }
  return warn(s, `${FACTIONS[f].short} doesn’t sell that.`);
}
// buy <what>: Halcyon's Shop.
export const buy = (s, what) => buyAt(s, 'halcyon', what);

// A tool, delivered. The cut goods (code lots, Exploits, the sealed item) still land for a transfer bought before v61.
export function deliverGoods(s, id, L, f = 'halcyon') {
  if (['relay', 'cracker', 'injector'].includes(id)) { items(s)[id] = (items(s)[id] || 0) + 1; return; }
  if (id === 'signal') { s.signal = maxSignal(s); if (s.run) s.run.integrity = s.run.max; return emit(s, 'heal', 'Signal patched to full.'); }
  if (id === 'repair') { s.server.integrity = s.server.max; return emit(s, 'heal', `Server back to ${s.server.max}/${s.server.max}.`); }
  if (['cipher', 'worm', 'kernel'].includes(id)) return gainCode(s, { [id]: 3 + Math.floor(L / 5) }, 'Bought: ');
  if (id === 'exploit') return gainCode(s, { exploit: 1 }, 'Bought: ');
  if (id === 'crate') return addItem(s, rollItem(() => rand(s), { level: L, rarity: 'tuned', faction: f }), 'Unsealed: ');
}

// v61: every hub's Shop has one shape. The agency stock, the premium shelves and the hubs' stock counts go (keyed on the
// fields, so it runs once); nothing in them was yours.
export function shopRestore(s) {
  delete s.store; delete s.premium;
  for (const h of Object.values(s.hubs || {})) { delete h.stock; delete h.restockAt; }
}

// v60: payloads, held hubs and their swarms are cut (docs/factions-plan.md 10). A save that holds a hub is paid out once:
// what its bank held plus a day of its income, and each payload built or in flight back at what it cost; wick says so.
// Keyed on the fields (a hub's `captured`, s.payloads), so it runs once; the rest of their state goes with them.
export const HUB_PAYOUT = { hours: 24, income: (hubLevel) => 10 + 3 * hubLevel, payload: (L) => 60 + 10 * L };
export function hubsRestore(s) {
  let credits = 0;
  const held = [];
  for (const [f, h] of Object.entries(s.hubs || {})) {
    if (h.captured) { credits += Math.floor(h.captured.bank || 0) + HUB_PAYOUT.hours * HUB_PAYOUT.income(FACTIONS[f]?.hub.level || 1); held.push(FACTIONS[f]?.hub.name || f); }
    for (const k of ['captured', 'offlineUntil', 'alert', 'alertAt', 'grudgeAt', 'grudgeSent']) delete h[k];
  }
  if (s.payloads) for (const p of [...(s.payloads.built || []), ...(s.payloads.flying || [])]) credits += HUB_PAYOUT.payload(p.level || 1);
  delete s.payloads; delete s.fleet; delete s.fleetSeq; delete s.retake;
  if (s.net) { delete s.net.retakeAt; delete s.net.retakeSent; }
  if (!credits || !s.server) return 0;
  s.server.credits = (s.server.credits || 0) + credits;
  const what = held.length ? `${held.join(' and ')} ${held.length > 1 ? 'are' : 'is'} back with ${held.length > 1 ? 'their owners' : 'its owner'}` : 'nobody writes payloads any more';
  systemLetter(s, { from: 'wick', subject: 'sold it back', body: [`${what}. i sold what you had for ${credits} credits. it's on your server.`, 'trade there like anyone else now.'] });
  return credits;
}

// v48: Indemnity is retired. An older save's unspent Indemnity becomes credits once, at the rate the
// chase protocols are priced at your level, so it buys what it would have; a letter from Halcyon says
// so. Contracts held from before stop promising it. Keyed on the field, so it runs once.
export function indemnityRestore(s) {
  for (const j of [...(s.mail?.jobs || []), ...(s.mail?.offers || [])]) if (j.reward) delete j.reward.indemnity;
  if (!('indemnity' in s)) return 0;
  const n = s.indemnity || 0, credits = Math.round(n * chaseRate(hackerLevel(s)));
  delete s.indemnity;
  if (!credits || !s.server) return 0;
  s.server.credits = (s.server.credits || 0) + credits;
  systemLetter(s, { from: 'claims', subject: 'Indemnity, settled', body: [`We no longer issue Indemnity. Your ${n} has been settled in credits: ${credits}, paid to your server.`, 'Our own protocols are still on the shelf, for credits now, and your standing still decides which ones you can buy.'] });
  return credits;
}
