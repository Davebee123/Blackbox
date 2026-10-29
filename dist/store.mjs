// The Halcyon store. Opens with the contract board (boardOpen).
//
// Two shelves:
//   Halcyon's own line, always there: relays and the chase protocols (gated by standing tier, and
//     priced high: they're the credit sink). A chase protocol is Indemnified: bigger rolls and a
//     signature effect nothing else has.
//   Other agencies' stock, resold through Halcyon: four slots that turn over on their own uneven
//     clocks. Each has a supplier, a price that drifts ±25% and a small quantity. This is where
//     the exploring kit (key crackers, trace injectors, cheap relays), code and repairs turn up.
//     (Daemons only come from invasions.) Above it, the premium shelf: two protocols rolled for
//     your level, a step above what drops (PREMIUM; a hub's shop holds one, factions.mjs).
import { ZERO_DAYS, rollItem, MATERIALS, seeded, SLOT_KINDS, STASH_CAP } from './gear.mjs';
import { emit, warn, rand, hackerLevel, addItem, gainCode, maxSignal, hooks, classOf, slotCount } from './combat.mjs';
import { tierIndex, TIERS, boardOpen, systemLetter } from './mail.mjs';
import { items } from './hidden.mjs';
import { bestSell } from './market.mjs';
import { shopCodebases, learnCodebase } from './sockets.mjs';

const now = () => hooks.now?.() ?? Date.now();
export const STORE = {
  slots: 4,
  slotLife: [40 * 60 * 1000, 150 * 60 * 1000], // each agency slot turns over somewhere in here
  drift: 0.25, // prices move this much either way
};
export const AGENCIES = ['Kestrel Underwriting', 'Norrland Re', 'Blue Ledger Security', 'Mimir Actuarial', 'Quayside Claims', 'Vesper Risk'];

// What a chase protocol costs per unit of its old Indemnity price (Indemnity retired in v48): 40
// credits, rising with your level the way the rest of the store does.
export const chaseRate = (L) => 40 * (1 + L / 15);
const chase = (n) => (L) => Math.round((n * chaseRate(L)) / 10) * 10;
// Halcyon's own line. tier: the standing tier (index in TIERS) it takes to buy.
export const LINE = [
  { id: 'relay', name: 'Relay', about: 'Pings the unknown servers next to a server you have taken over, and flags a contract’s signal. Install it on a server you hold.', credits: (L) => 120 + 8 * L, tier: 1 },
  { id: 'deductible', chase: true, credits: chase(30), tier: 2 },
  { id: 'subrogation', chase: true, credits: chase(45), tier: 3 },
  { id: 'actuarial', chase: true, credits: chase(45), tier: 3 },
  { id: 'total-loss', chase: true, credits: chase(80), tier: 4 }, // the Preferred weapon
];
export const lineName = (x) => x.name || ZERO_DAYS[x.id].name;
export const lineAbout = (x) => x.about || ZERO_DAYS[x.id].effect;

// What agencies might have. credits: price at your level before drift.
export const GOODS = {
  relay: { name: 'Relay (refurbished)', about: 'A second-hand relay. It pings like a new one.', credits: (L) => 95 + 6 * L, qty: [1, 2] },
  cracker: { name: 'Key cracker', about: 'Reveals the vault key of a server you have found. Use it from the server’s map card.', credits: (L) => 60 + 6 * L, qty: [1, 3] },
  injector: { name: 'Trace injector', about: 'Adds 30% to the trace on an unknown server. Use it from the server’s map card.', credits: (L) => 80 + 6 * L, qty: [1, 2] },
  signal: { name: 'Signal patch', about: 'Refills your Signal at once.', credits: (L) => 30 + 3 * L, qty: [2, 4] },
  repair: { name: 'Hot-swap kit', about: 'Repairs your server’s Integrity at once.', credits: (L) => 40 + 5 * L, qty: [1, 3] },
  cipher: { name: 'Cipher code lot', code: 'cipher', credits: (L) => 45 + 5 * L, qty: [1, 3] },
  worm: { name: 'Worm code lot', code: 'worm', credits: (L) => 45 + 5 * L, qty: [1, 3] },
  kernel: { name: 'Kernel code lot', code: 'kernel', credits: (L) => 45 + 5 * L, qty: [1, 3] },
  exploit: { name: 'Exploit', about: 'Grants 1 Exploit. Medium socket programs take them.', credits: (L) => 150 + 10 * L, qty: [1, 1] },
  crate: { name: 'Sealed item', about: 'Opens into a Tuned (blue) item at your level.', credits: (L) => 180 + 14 * L, qty: [1, 1] },
};
// The daemon image's weight went to a second Sealed item.
const WEIGHTS = { relay: 2, cracker: 3, injector: 3, signal: 3, repair: 2, cipher: 2, worm: 2, kernel: 2, exploit: 1, crate: 2 };
export const codeAmount = (L) => 3 + Math.floor(L / 5);
// What a lot of tradeable goods (code, an Exploit) costs now: its shelf price, but never
// less than 10% over what the best hub market would pay for its contents.
export function priceNow(s, id, price, L = hackerLevel(s)) {
  const units = id === 'exploit' ? 1 : GOODS[id]?.code ? codeAmount(L) : 0;
  return units ? Math.max(price, Math.ceil(bestSell(s, id) * units * 1.1)) : price;
}
export const goodsAbout = (g, L) => g.about || `Get ${codeAmount(L)} ${MATERIALS[g.code].name}.`;

export const storeOf = (s) => (s.store ||= { slots: [], serial: 0 });
const between = (s, [lo, hi]) => Math.round(lo + rand(s) * (hi - lo));

function stockSlot(s, at) {
  const st = storeOf(s), L = hackerLevel(s);
  const keys = Object.keys(GOODS).filter((k) => (GOODS[k].tier || 0) <= tierIndex(s));
  const total = keys.reduce((n, k) => n + WEIGHTS[k], 0);
  let r = rand(s) * total, id = keys[0];
  for (const k of keys) { r -= WEIGHTS[k]; if (r < 0) { id = k; break; } }
  const g = GOODS[id];
  const drift = 1 + (rand(s) * 2 - 1) * STORE.drift;
  return { key: 's' + ++st.serial, id, agency: AGENCIES[Math.floor(rand(s) * AGENCIES.length)], price: Math.max(1, Math.round(g.credits(L) * drift)), drift, qty: between(s, g.qty), until: at + between(s, STORE.slotLife) };
}

// Called with the clock: expired slots are replaced, each on its own schedule.
export function tickStore(s, at = now()) {
  if (!boardOpen(s)) return;
  const st = storeOf(s);
  const before = st.slots.map((x) => x.key).join();
  st.slots = st.slots.filter((x) => x.until > at && x.qty > 0);
  while (st.slots.length < STORE.slots) st.slots.push(stockSlot(s, at));
  if (before && st.slots.map((x) => x.key).join() !== before) emit(s, 'store', 'New stock at the Halcyon store.', { quiet: true });
}

export function buy(s, what) {
  if (!boardOpen(s)) return warn(s, 'Halcyon’s store opens to contractors. Finish LOWLIGHT’s jobs first.');
  const L = hackerLevel(s);
  const line = LINE.find((x) => x.id === what);
  if (line) {
    if (tierIndex(s) < line.tier) return warn(s, `${lineName(line)} is for ${TIERS[line.tier].name} standing and up.`);
    const price = line.credits(L);
    if (s.server.credits < price) return warn(s, `${lineName(line)} costs ${price} credits.`);
    s.server.credits -= price;
    if (line.chase) {
      const item = rollItem(() => rand(s), { level: L, zeroDay: line.id });
      emit(s, 'bought', `Bought ${lineName(line)} for ${price} credits.`, { item: line.id });
      return addItem(s, item, 'Halcyon: ');
    }
    items(s)[line.id] = (items(s)[line.id] || 0) + 1;
    return emit(s, 'bought', `Bought a ${lineName(line).toLowerCase()} for ${price} credits. You have ${items(s)[line.id]}.`, { item: line.id });
  }
  // Codebases (sockets.mjs): Halcyon's own, once each, by standing.
  if (what?.startsWith('codebase-')) {
    const cb = shopCodebases(s, 'halcyon', L).find((x) => x.id === what.slice(9));
    if (!cb) return warn(s, 'Halcyon has no such codebase.');
    if (cb.known) return warn(s, `You already know the ${cb.name}.`);
    if (tierIndex(s) < cb.tier) return warn(s, `The ${cb.name} is for ${TIERS[cb.tier].name} standing and up.`);
    if (s.server.credits < cb.price) return warn(s, `The ${cb.name} costs ${cb.price} credits.`);
    s.server.credits -= cb.price;
    emit(s, 'bought', `Bought the ${cb.name} for ${cb.price} credits.`, { codebase: cb.id });
    return learnCodebase(s, cb.id, 'Halcyon: ');
  }
  if (what?.startsWith('premium-')) return buyPremium(s, 'halcyon', Number(what.slice(8)));
  const slot = storeOf(s).slots.find((x) => x.key === what);
  if (!slot) return warn(s, 'That’s not on the shelf any more.');
  const price = priceNow(s, slot.id, slot.price, L);
  if (s.server.credits < price) return warn(s, `That costs ${price} credits.`);
  const g = GOODS[slot.id];
  s.server.credits -= price;
  slot.qty--;
  emit(s, 'bought', `Bought ${g.name} from ${slot.agency} for ${price} credits.`, { item: slot.id });
  deliverGoods(s, slot.id, L);
}

// f: the faction that sold it (a hub's goods land through market.mjs): its sealed item carries its implicit (gear.mjs IMPLICITS).
export function deliverGoods(s, id, L, f = 'halcyon') {
  const g = GOODS[id];
  if (['relay', 'cracker', 'injector'].includes(id)) { items(s)[id] = (items(s)[id] || 0) + 1; return; }
  if (g.code) return gainCode(s, { [g.code]: codeAmount(L) }, 'Bought: ');
  if (id === 'exploit') return gainCode(s, { exploit: 1 }, 'Bought: ');
  if (GOODS[id]?.codebase) return learnCodebase(s, GOODS[id].codebase, 'Unsealed: ');
  if (id === 'signal') { s.signal = maxSignal(s); if (s.run) s.run.integrity = s.run.max; return emit(s, 'heal', 'Signal patched to full.'); }
  if (id === 'repair') { s.server.integrity = s.server.max; return emit(s, 'heal', `Server back to ${s.server.max}/${s.server.max}.`); }
  if (id === 'crate') return addItem(s, rollItem(() => rand(s), { level: L, rarity: 'tuned', faction: f }), 'Unsealed: ');
}

// ---------- the premium shelf ----------
// Protocols rolled for your level, a step above the drop curve: a Tuned (blue) two levels up, or a Custom (yellow) at
// your level. Never a unique or a set piece. Priced at hours of credits at your level (incomeAt, measured with
// econ.mjs). No clock: a new level brings new stock, and buying one puts a comparable one in its place.
export const PREMIUM = {
  halcyon: 2, hub: 1, // how many each shelf holds
  kinds: [{ rarity: 'tuned', up: 2, hours: 3.5 }, { rarity: 'custom', up: 0, hours: 4.5 }],
};
// Credits an hour at level L, taking contracts (The economy): about 300 to level 10, 500–900 over the climb to 20, and
// 40 more a level past it (econ.mjs: a level earns about three times the credits from 20 to 30 as from 10 to 20).
export const incomeAt = (L) => (L <= 10 ? 300 : L <= 20 ? 300 + 60 * (L - 10) : 900 + 40 * (L - 20));
const kindOf = (it) => PREMIUM.kinds.find((k) => k.rarity === it.rarity) || PREMIUM.kinds[0];
// Its price at your level, before a hub's tier discount.
export const premiumPrice = (it, L) => Math.round((kindOf(it).hours * incomeAt(L)) / 10) * 10;
const SELLERS = ['halcyon', 'glassjaw', 'kestrel', 'lantern', 'nullchoir'];
// The shelf's dice: fixed by the save's seed, the seller, the level and how many it has sold (never the game's dice, so
// looking at a shelf never changes anything else).
const premiumDice = (s, f, L, n) => seeded((((s.seed || 1) * 7919 + (SELLERS.indexOf(f) + 1) * 104729 + L * 131 + n * 977) >>> 0) || 1);
// k: its kind (PREMIUM.kinds): Halcyon's shelf holds one of each, a hub's one at random; a sold one's is the same again.
function rollPremium(s, f, L, shelf, k = null) {
  const r = premiumDice(s, f, L, shelf.n++);
  const open = [...new Set(SLOT_KINDS.slice(0, slotCount(s)))], taken = shelf.items.map((x) => x.group);
  const free = open.filter((g) => !taken.includes(g)), pool = free.length ? free : open;
  k ||= f === 'halcyon' ? PREMIUM.kinds[shelf.items.length % PREMIUM.kinds.length] : PREMIUM.kinds[Math.floor(r() * PREMIUM.kinds.length)];
  return rollItem(r, { level: L + k.up, rarity: k.rarity, slot: pool[Math.floor(r() * pool.length)], cls: classOf(s), faction: f });
}
// A seller's premium protocols, rolled for your level (a new level re-rolls them).
export function premiumOf(s, f = 'halcyon') {
  const L = hackerLevel(s), box = (s.premium ||= {});
  if (box[f]?.level !== L) box[f] = { level: L, n: 0, items: [] };
  const shelf = box[f], want = f === 'halcyon' ? PREMIUM.halcyon : PREMIUM.hub;
  while (shelf.items.length < want) shelf.items.push(rollPremium(s, f, L, shelf));
  return shelf.items;
}
// Why you can't buy it now (or null): price is what it costs here.
export function premiumBlock(s, price) {
  if ((s.stash || []).length >= STASH_CAP) return `Your stash is full (${STASH_CAP}).`;
  if (s.server.credits < price) return `It costs ${price} credits. You have ${s.server.credits}.`;
  return null;
}
// Halcyon's: straight into your stash. A hub's comes by transfer (factions.mjs buyFrom); either way a comparable one
// takes its place on the shelf.
export function takePremium(s, f, i) {
  const shelf = s.premium?.[f], it = shelf?.items[i];
  if (!it) return null;
  shelf.items.splice(i, 1);
  shelf.items.splice(i, 0, rollPremium(s, f, shelf.level, shelf, kindOf(it))); // a comparable one in its place
  return it;
}
function buyPremium(s, f, i) {
  const L = hackerLevel(s), it = premiumOf(s, f)[i];
  if (!it) return warn(s, 'That’s not on the shelf any more.');
  const price = premiumPrice(it, L), why = premiumBlock(s, price);
  if (why) return warn(s, why);
  s.server.credits -= price;
  takePremium(s, f, i);
  emit(s, 'bought', `Bought ${it.name} from Halcyon for ${price} credits.`, { item: 'premium' });
  return addItem(s, it, 'Halcyon: ');
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
