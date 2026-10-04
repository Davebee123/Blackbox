// Factions (PvE): companies and hacker crews with servers of their own on your map. Each has a
// hub (a shop, its contracts on the board, later a market), rep with you, and friends and
// enemies among the others: helping one costs you with its rivals and warms its allies, the
// Starsector way. Some of the servers you trace belong to a faction: opening one's vault is a
// blow against its owner (and a favour to its rivals).
//
// Rep shares the scale and the store of Halcyon's old standing (s.standing, 0–100, tiers at
// 1/25/50/75): Halcyon is just the first faction, its retainer and store as before.
import { emit, warn, rand, hackerLevel, hooks } from './combat.mjs';
import { GOODS, codeAmount, deliverGoods } from './store.mjs';
import { broadcast } from './station.mjs';
import { seeded } from './gear.mjs';

const now = () => hooks.now?.() ?? Date.now();

// Tier thresholds (the same for everyone; each faction names them its own way).
export const REP_TIERS = [0, 1, 25, 50, 75];
export const FACTIONS = {
  halcyon: {
    name: 'Halcyon Mutual', short: 'Halcyon', kind: 'corp', color: '#6fb6ff', start: 10,
    about: 'Cyber-insurance giant. Pays crews to fight its turf war, and doesn’t ask how.',
    tiers: ['Suspended', 'Probation', 'Contractor', 'Trusted', 'Preferred'],
    allies: ['kestrel'], rivals: ['glassjaw', 'nullchoir'],
    hub: { name: 'HALCYON-CLEARING-01', level: 1 },
    shop: [], // Halcyon's shelf is the store (store.mjs)
  },
  glassjaw: {
    name: 'GLASSJAW', short: 'GLASSJAW', kind: 'corp', color: '#e07bd0', start: 5,
    about: 'Halcyon’s competitor. Off the books, pays better, and asks less.',
    tiers: ['Burned', 'Unknown', 'Asset', 'Partner', 'Inner circle'],
    allies: [], rivals: ['halcyon', 'lantern'],
    hub: { name: 'GLASSJAW-ANNEX-07', level: 8 },
    shop: ['cracker', 'exploit', 'crate', 'blueprint'],
  },
  kestrel: {
    name: 'Kestrel Underwriting', short: 'Kestrel', kind: 'corp', color: '#8fd46b', start: 10,
    about: 'Runs the data centres everyone rents. Neutral, cautious, everywhere.',
    tiers: ['Blacklisted', 'Prospect', 'Client', 'Account', 'Key account'],
    allies: ['halcyon'], rivals: ['nullchoir'],
    hub: { name: 'KESTREL-DC-NORTH', level: 4 },
    shop: ['relay', 'signal', 'repair', 'salvage', 'daemon'],
  },
  lantern: {
    name: 'LANTERN', short: 'LANTERN', kind: 'crew', color: '#ffb347', start: 10,
    about: 'The voice on the numbers station. Sells what it hears, to whoever listens.',
    tiers: ['Tuned out', 'Listener', 'Regular', 'Confidant', 'Signal'],
    allies: ['nullchoir'], rivals: ['glassjaw'],
    hub: { name: 'LANTERN-RELAY-88', level: 6 },
    shop: ['injector', 'cracker', 'tip', 'kernel'],
  },
  nullchoir: {
    name: 'NULL CHOIR', short: 'NULL CHOIR', kind: 'crew', color: '#ff6f91', start: 10,
    about: 'An anarchist crew. Breaks corporate servers for fun, and trades fair with anyone who does the same.',
    tiers: ['Marked', 'Outsider', 'Fellow', 'Choir', 'Cantor'],
    allies: ['lantern'], rivals: ['halcyon', 'kestrel'],
    hub: { name: 'NULLCHOIR-SQUAT-13', level: 12 },
    shop: ['cipher', 'worm', 'exploit', 'daemon'],
  },
};
export const FACTION_IDS = Object.keys(FACTIONS);
// Goods only factions sell (the rest are store.mjs GOODS).
export const FACTION_GOODS = {
  tip: { name: 'Broadcast schedule', about: 'LANTERN tells you when the next dead drop goes out: one goes out now.', credits: (L) => 70 + 5 * L },
};

// ---------- rep ----------
export const rep = (s, f) => { const st = (s.standing ||= { halcyon: FACTIONS.halcyon.start }); if (st[f] == null) st[f] = FACTIONS[f]?.start ?? 10; return st[f]; };
export const repTier = (s, f) => { const r = rep(s, f); let i = 0; REP_TIERS.forEach((m, k) => { if (r >= m) i = k; }); return { i, name: FACTIONS[f].tiers[i], next: REP_TIERS[i + 1] ?? null, min: REP_TIERS[i] }; };
export const hostile = (s, f) => rep(s, f) < REP_TIERS[1];
// How rep moves through the web: a rival loses half of what you gave, an ally gains a quarter.
export const RIPPLE = { rival: 0.5, ally: 0.25 };
// Just the ripple (Halcyon's own change is applied and announced by mail.mjs).
export function rippleRep(s, f, delta) {
  for (const r of FACTIONS[f]?.rivals || []) { const d = -Math.round(delta * RIPPLE.rival); if (d) changeRep(s, r, d, `${FACTIONS[f].short}'s rival noticed`, { ripple: false }); }
  for (const a of FACTIONS[f]?.allies || []) { const d = Math.round(delta * RIPPLE.ally); if (d) changeRep(s, a, d, `${FACTIONS[f].short}'s ally noticed`, { ripple: false }); }
}
export function changeRep(s, f, delta, why, { ripple = true, quiet = false } = {}) {
  if (!delta || !FACTIONS[f]) return;
  const before = repTier(s, f).name;
  s.standing[f] = Math.max(0, Math.min(100, rep(s, f) + delta));
  const after = repTier(s, f);
  if (!quiet) emit(s, delta < 0 ? 'rep-down' : 'rep-up', `${why}: ${FACTIONS[f].short} ${delta > 0 ? '+' : ''}${delta} (${rep(s, f)}, ${after.name}).${after.name !== before ? ` ${delta > 0 ? 'Up' : 'Down'} to ${after.name}.` : ''}`, { faction: f, rep: rep(s, f) });
  if (ripple) rippleRep(s, f, delta);
}

// ---------- hubs ----------
// One hub per faction on your map, once the board opens (the end of LOWLIGHT's jobs): not
// fights, places to trade. Fixed levels: their shops sell at that level or yours, whichever's higher.
export function hubsOf(s) {
  if (!(s.mail?.boardOpen || (s.mail?.story || 0) >= 99)) return [];
  s.hubs ||= {};
  for (const f of FACTION_IDS) s.hubs[f] ||= { id: 'hub-' + f, faction: f, stock: {}, restockAt: 0 };
  return FACTION_IDS.map((f) => ({ ...s.hubs[f], ...FACTIONS[f].hub, faction: f }));
}
export const hubOf = (s, id) => hubsOf(s).find((h) => h.id === id || h.faction === id) || null;

// ---------- faction shops ----------
// A faction's shelf: its goods, each a few in stock, refilled every hour. Better tiers buy
// cheaper (−5% a tier from Neutral) and open the rarer goods; Hostile, the shop is shut.
export const SHOP = { restockMs: 60 * 60000, qty: 3, discount: 0.05 };
const goodOf = (id) => GOODS[id] || FACTION_GOODS[id];
export function shopOf(s, f, at = now()) {
  const h = (s.hubs ||= {})[f] ||= { id: 'hub-' + f, faction: f, stock: {}, restockAt: 0 };
  if (at >= (h.restockAt || 0)) { h.stock = Object.fromEntries(FACTIONS[f].shop.map((id) => [id, SHOP.qty])); h.restockAt = at + SHOP.restockMs; }
  const L = Math.max(hackerLevel(s), FACTIONS[f].hub.level), t = repTier(s, f);
  return FACTIONS[f].shop.map((id) => {
    const g = goodOf(id), need = g.tier || 0;
    const price = Math.round(g.credits(L) * (1 - SHOP.discount * Math.max(0, t.i - 1)));
    return { id, name: g.name, about: g.about || (g.code ? `${codeAmount(L)} of its code.` : ''), price, left: h.stock[id] || 0, locked: t.i < Math.max(1, need), need: Math.max(1, need) };
  });
}
// deliver: store.mjs's delivery for shared goods; faction goods handled here.
export function buyFrom(s, f, id, at = now()) {
  if (!FACTIONS[f] || f === 'halcyon') return warn(s, 'Halcyon sells through its store.');
  if (!hubOf(s, f)) return warn(s, 'Faction hubs open with the contract board.');
  if (hostile(s, f)) return warn(s, `${FACTIONS[f].short} won’t trade with you (${repTier(s, f).name}).`);
  if ((s.hubs?.[f]?.offlineUntil || 0) > at) return warn(s, `${FACTIONS[f].hub.name} is offline.`);
  const item = shopOf(s, f, at).find((x) => x.id === id);
  if (!item) return warn(s, `${FACTIONS[f].short} doesn’t sell that.`);
  if (item.locked) return warn(s, `${item.name} is for ${FACTIONS[f].tiers[item.need]} and up.`);
  if (item.left <= 0) return warn(s, `${item.name} is sold out. More within the hour.`);
  if (s.server.credits < item.price) return warn(s, `${item.name} costs ${item.price} credits.`);
  s.server.credits -= item.price;
  s.hubs[f].stock[id]--;
  emit(s, 'bought', `Bought ${item.name} from ${FACTIONS[f].short} for ${item.price} credits.`, { item: id, faction: f });
  if (id === 'tip') return broadcast(s);
  deliverGoods(s, id, Math.max(hackerLevel(s), FACTIONS[f].hub.level));
}

// ---------- faction servers ----------
// About a third of the servers you trace (not your first two, not rogue ones) belong to a faction.
export const OWNED = { share: 0.32, vaultHit: 6, takeoverHit: 15 };
export function claimServer(s, loc, r = seeded(((loc.seed || 1) * 73 + 29) >>> 0)()) { // fixed by the server's seed: it doesn't move the game's dice
  if (loc.rogue || loc.starter || (s.locations || []).filter((l) => !l.rogue).length <= 2 || r >= OWNED.share) return;
  const pool = FACTION_IDS.filter((f) => f !== 'halcyon'); // Halcyon insures servers; it doesn't run them out here
  loc.faction = pool[Math.floor((r / OWNED.share) * pool.length) % pool.length];
}
// Opening a faction's vault, or taking its server over: a blow to it, a favour to its rivals.
export function strikeServer(s, loc, how) {
  if (!loc?.faction) return;
  const f = loc.faction;
  changeRep(s, f, -(how === 'takeover' ? OWNED.takeoverHit : OWNED.vaultHit), how === 'takeover' ? `You took ${loc.name} from ${FACTIONS[f].short}` : `You opened ${FACTIONS[f].short}'s vault on ${loc.name}`);
  if (how === 'takeover') delete loc.faction;
}
// Rivals of a faction: who it wants you to hit (for its contracts).
export const rivalServers = (s, f) => (s.locations || []).filter((l) => l.faction && FACTIONS[f].rivals.includes(l.faction) && !l.takenOver);
