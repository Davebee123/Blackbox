// The Halcyon store. Opens with the Contractor letter (the end of the storyline).
//
// Two shelves:
//   Halcyon's own line, always there: relays (credits) and the chase protocols (Indemnity only,
//     gated by standing tier). A chase protocol is Indemnified: bigger rolls and a signature
//     effect you can't find or compile anywhere else.
//   Other agencies' stock, resold through Halcyon: four slots that turn over on their own uneven
//     clocks. Each has a supplier, a price that drifts ±25% and a small quantity. This is where
//     the exploring kit (key crackers, trace injectors, cheap relays), code, repairs and the odd
//     blueprint or daemon turn up.
import { ZERO_DAYS, rollItem, MATERIALS } from './gear.mjs';
import { emit, warn, rand, hackerLevel, addItem, learnBlueprint, learnDaemon, materialsOf, gainCode, maxSignal, hooks } from './combat.mjs';
import { tierIndex, TIERS, indemnity, boardOpen } from './mail.mjs';
import { items } from './hidden.mjs';
import { bestSell } from './market.mjs';
import { OUTPOST, knowsPlan, learnPlan, planName, planPrice } from './outpost.mjs';

const now = () => hooks.now?.() ?? Date.now();
export const STORE = {
  slots: 4,
  slotLife: [40 * 60 * 1000, 150 * 60 * 1000], // each agency slot turns over somewhere in here
  drift: 0.25, // prices move this much either way
};
export const AGENCIES = ['Kestrel Underwriting', 'Norrland Re', 'Blue Ledger Security', 'Mimir Actuarial', 'Quayside Claims', 'Vesper Risk'];

// Halcyon's own line. tier: the standing tier (index in TIERS) it takes to buy.
export const LINE = [
  { id: 'relay', name: 'Relay', about: 'Install it on a server you’ve taken over. It pings the unknown servers next to it and flags a contract’s signal.', credits: (L) => 120 + 8 * L, tier: 1 },
  { id: 'deductible', chase: true, indemnity: 30, tier: 2 },
  { id: 'subrogation', chase: true, indemnity: 45, tier: 3 },
  { id: 'actuarial', chase: true, indemnity: 45, tier: 3 },
  { id: 'total-loss', chase: true, indemnity: 80, tier: 4 }, // the Preferred weapon
];
export const lineName = (x) => x.name || ZERO_DAYS[x.id].name;
export const lineAbout = (x) => x.about || ZERO_DAYS[x.id].effect;

// What agencies might have. credits: price at your level before drift.
export const GOODS = {
  relay: { name: 'Relay (refurbished)', about: 'A second-hand relay: same ping.', credits: (L) => 95 + 6 * L, qty: [1, 2] },
  cracker: { name: 'Key cracker', about: 'Reveals the vault key of a server you’ve found (use it from its map card).', credits: (L) => 60 + 6 * L, qty: [1, 3] },
  injector: { name: 'Trace injector', about: 'Adds 30% to the trace on an unknown server (use it from its map card).', credits: (L) => 80 + 6 * L, qty: [1, 2] },
  signal: { name: 'Signal patch', about: 'Your Signal back to full, now.', credits: (L) => 30 + 3 * L, qty: [2, 4] },
  repair: { name: 'Hot-swap kit', about: 'Your server’s Integrity back to full, now.', credits: (L) => 40 + 5 * L, qty: [1, 3] },
  cipher: { name: 'Cipher code lot', code: 'cipher', credits: (L) => 45 + 5 * L, qty: [1, 3] },
  worm: { name: 'Worm code lot', code: 'worm', credits: (L) => 45 + 5 * L, qty: [1, 3] },
  kernel: { name: 'Kernel code lot', code: 'kernel', credits: (L) => 45 + 5 * L, qty: [1, 3] },
  exploit: { name: 'Exploit', about: 'One Exploit, for the top service versions.', credits: (L) => 150 + 10 * L, qty: [1, 1] },
  salvage: { name: 'Salvage lot', about: 'Five pieces of salvage.', credits: (L) => 30 + 3 * L, qty: [2, 4] },
  crate: { name: 'Sealed item', about: 'A sealed Tuned (blue) item at your level.', credits: (L) => 180 + 14 * L, qty: [1, 1] },
  blueprint: { name: 'Sealed blueprint', about: 'A blueprint you don’t have yet.', credits: (L) => 250 + 15 * L, qty: [1, 1], tier: 2 },
  daemon: { name: 'Daemon image', about: 'A daemon, or a version up if you have it.', credits: (L) => 300 + 20 * L, qty: [1, 1], tier: 2 },
};
const WEIGHTS = { relay: 2, cracker: 3, injector: 3, signal: 3, repair: 2, cipher: 2, worm: 2, kernel: 2, exploit: 1, salvage: 2, crate: 1, blueprint: 1, daemon: 1 };
export const codeAmount = (L) => 3 + Math.floor(L / 5);
// What a lot of tradeable goods (code, an Exploit, salvage) costs now: its shelf price, but never
// less than 10% over what the best hub market would pay for its contents.
export function priceNow(s, id, price, L = hackerLevel(s)) {
  const units = id === 'salvage' ? 5 : id === 'exploit' ? 1 : GOODS[id]?.code ? codeAmount(L) : 0;
  return units ? Math.max(price, Math.ceil(bestSell(s, id) * units * 1.1)) : price;
}
export const goodsAbout = (g, L) => g.about || `${codeAmount(L)} ${MATERIALS[g.code].name}.`;

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
    if (line.chase) {
      if (indemnity(s) < line.indemnity) return warn(s, `${lineName(line)} costs ${line.indemnity} Indemnity. You have ${indemnity(s)}.`);
      s.indemnity -= line.indemnity;
      const item = rollItem(() => rand(s), { level: L, zeroDay: line.id });
      emit(s, 'bought', `Bought ${lineName(line)} for ${line.indemnity} Indemnity.`, { item: line.id });
      return addItem(s, item, 'Halcyon: ');
    }
    const price = line.credits(L);
    if (s.server.credits < price) return warn(s, `${lineName(line)} costs ${price} credits.`);
    s.server.credits -= price;
    items(s)[line.id] = (items(s)[line.id] || 0) + 1;
    return emit(s, 'bought', `Bought a ${lineName(line).toLowerCase()} for ${price} credits. You have ${items(s)[line.id]}.`, { item: line.id });
  }
  // Plans: a harvester's or a module's, once each (outpost.mjs).
  if (what?.startsWith('plan-')) {
    const id = what.slice(5);
    if (!OUTPOST.plans[id]) return warn(s, 'Halcyon has no such plan.');
    if (knowsPlan(s, id)) return warn(s, `You already have the ${planName(id)}.`);
    const price = planPrice(id, L);
    if (s.server.credits < price) return warn(s, `The ${planName(id)} costs ${price} credits.`);
    s.server.credits -= price;
    emit(s, 'bought', `Bought the ${planName(id)} for ${price} credits.`, { plan: id });
    return learnPlan(s, id);
  }
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

export function deliverGoods(s, id, L) {
  const g = GOODS[id];
  if (['relay', 'cracker', 'injector'].includes(id)) { items(s)[id] = (items(s)[id] || 0) + 1; return; }
  if (g.code) return gainCode(s, { [g.code]: codeAmount(L) }, 'Bought: ');
  if (id === 'exploit') return gainCode(s, { exploit: 1 }, 'Bought: ');
  if (id === 'salvage') { for (let i = 0; i < 5; i++) s.salvage.push({ name: 'Agency salvage', virus: 'store', seed: 0 }); return; }
  if (id === 'signal') { s.signal = maxSignal(s); if (s.run) s.run.integrity = s.run.max; return emit(s, 'heal', 'Signal patched to full.'); }
  if (id === 'repair') { s.server.integrity = s.server.max; return emit(s, 'heal', `Server back to ${s.server.max}/${s.server.max}.`); }
  if (id === 'crate') return addItem(s, rollItem(() => rand(s), { level: L, rarity: 'tuned' }), 'Unsealed: ');
  if (id === 'blueprint') return learnBlueprint(s, 'Unsealed: ');
  if (id === 'daemon') return learnDaemon(s, 'Installed: ');
}
