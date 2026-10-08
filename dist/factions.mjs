// Factions (PvE): companies and hacker crews with servers of their own on your map. Each has a
// hub (a shop, its contracts on the board, later a market), rep with you, and friends and
// enemies among the others: helping one costs you with its rivals and warms its allies. Some of the servers you trace belong to a faction: opening one's vault is a
// blow against its owner (and a favour to its rivals).
//
// Rep shares the scale and the store of Halcyon's old standing (s.standing, tiers at 1/25/50/75):
// Halcyon is just the first faction, its retainer and store as before. Below 1 a faction is
// Hostile, and hostility has depth: rep runs down to −100 (Halcyon's floor stays 0). Rep never
// comes back on its own: you earn it back by hitting a faction's rivals, working for its allies,
// or donating (dearer the deeper you are, and only as far as Neutral).
import { emit, warn, rand, hackerLevel, materialsOf, hooks } from './combat.mjs';
import { GOODS, codeAmount, priceNow } from './store.mjs';
import { seeded } from './gear.mjs';
import { sendGood } from './market.mjs';

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
    shop: [], // Halcyon's goods are its store (store.mjs): instant, unlike every other hub's
  },
  glassjaw: {
    name: 'GLASSJAW', short: 'GLASSJAW', kind: 'corp', color: '#e07bd0', start: 5,
    about: 'Halcyon’s competitor. Off the books, pays better, and asks less.',
    tiers: ['Burned', 'Unknown', 'Asset', 'Partner', 'Inner circle'],
    allies: [], rivals: ['halcyon', 'lantern'],
    hub: { name: 'GLASSJAW-ANNEX-07', level: 8 },
    shop: ['cracker', 'crate', 'blueprint'],
  },
  kestrel: {
    name: 'Kestrel Underwriting', short: 'Kestrel', kind: 'corp', color: '#8fd46b', start: 10,
    about: 'Runs the data centres everyone rents. Neutral, cautious, everywhere.',
    tiers: ['Blacklisted', 'Prospect', 'Client', 'Account', 'Key account'],
    allies: ['halcyon'], rivals: ['nullchoir'],
    hub: { name: 'KESTREL-DC-NORTH', level: 4 },
    shop: ['relay', 'injector', 'harden', 'daemon'],
  },
  lantern: {
    name: 'LANTERN', short: 'LANTERN', kind: 'crew', color: '#ffb347', start: 10,
    about: 'The voice on the numbers station. Sells what it hears, to whoever listens.',
    tiers: ['Tuned out', 'Listener', 'Regular', 'Confidant', 'Signal'],
    allies: ['nullchoir'], rivals: ['glassjaw'],
    hub: { name: 'LANTERN-RELAY-88', level: 6 },
    shop: ['bootleg', 'cracker', 'injector'],
  },
  nullchoir: {
    name: 'NULL CHOIR', short: 'NULL CHOIR', kind: 'crew', color: '#ff6f91', start: 10,
    about: 'An anarchist crew. Breaks corporate servers for fun, and trades fair with anyone who does the same.',
    tiers: ['Marked', 'Outsider', 'Fellow', 'Choir', 'Cantor'],
    allies: ['lantern'], rivals: ['halcyon', 'kestrel'],
    hub: { name: 'NULLCHOIR-SQUAT-13', level: 12 },
    shop: ['daemon', 'crate', 'cracker', 'harden'],
  },
};
export const FACTION_IDS = Object.keys(FACTIONS);
// Goods only factions sell (the rest are store.mjs GOODS).
export const FACTION_GOODS = {
  bootleg: { name: 'Bootleg filter', about: 'A sealed firewall filter at your level, Stock or better.', credits: (L) => 90 + 8 * L },
};

// ---------- rep ----------
export const rep = (s, f) => { const st = (s.standing ||= { halcyon: FACTIONS.halcyon.start }); if (st[f] == null) st[f] = FACTIONS[f]?.start ?? 10; return st[f]; };
export const repTier = (s, f) => { const r = rep(s, f); let i = 0; REP_TIERS.forEach((m, k) => { if (r >= m) i = k; }); return { i, name: FACTIONS[f].tiers[i], next: REP_TIERS[i + 1] ?? null, min: REP_TIERS[i] }; };
export const hostile = (s, f) => rep(s, f) < REP_TIERS[1] && !captured(s, f);
export const REP_FLOOR = (f) => (f === 'halcyon' ? 0 : -100);
export const captured = (s, f) => !!s.hubs?.[f]?.captured;
// How rep moves through the web: a rival loses half of what you gave, an ally gains a quarter.
export const RIPPLE = { rival: 0.5, ally: 0.25 };
// Just the ripple (Halcyon's own change is applied and announced by mail.mjs).
// soft: a ripple that never pushes a rival below 0 (Halcyon's standing: doing your job isn't picking a side).
export function rippleRep(s, f, delta, { soft = false } = {}) {
  for (const r of FACTIONS[f]?.rivals || []) { const d = -Math.round(delta * RIPPLE.rival); if (d) changeRep(s, r, d, `${FACTIONS[f].short}'s rival noticed`, { ripple: false, floor: soft ? Math.min(0, rep(s, r)) : undefined }); }
  for (const a of FACTIONS[f]?.allies || []) { const d = Math.round(delta * RIPPLE.ally); if (d) changeRep(s, a, d, `${FACTIONS[f].short}'s ally noticed`, { ripple: false }); }
}
export function changeRep(s, f, delta, why, { ripple = true, quiet = false, floor } = {}) {
  if (!delta || !FACTIONS[f]) return;
  const before = repTier(s, f).name, was = rep(s, f);
  s.standing[f] = Math.max(floor ?? REP_FLOOR(f), Math.min(100, was + delta));
  delta = s.standing[f] - was; // what actually changed: a capped or floored change ripples only as far as it went
  if (!delta) return;
  const after = repTier(s, f);
  if (!quiet) emit(s, delta < 0 ? 'rep-down' : 'rep-up', `${why}: ${FACTIONS[f].short} ${delta > 0 ? '+' : ''}${delta} (${rep(s, f)}, ${after.name}).${after.name !== before ? ` ${delta > 0 ? 'Up' : 'Down'} to ${after.name}.` : ''}`, { faction: f, rep: rep(s, f) });
  if (ripple) rippleRep(s, f, delta);
}

// ---------- hubs ----------
// One hub per faction, once the board opens (the end of LOWLIGHT's jobs): not fights, places to
// trade. Halcyon's is known (it's your employer); every other faction's you find. Its trace grows
// when you locate a server it owns, and when you clear the viruses off one (they like that). At 100%
// the hub is located: it's on your map, and connect <faction> reaches it.
export const HUB_TRACE = { server: 40, cleared: 20, rep: 2 };
export const hubFound = (s, f) => f === 'halcyon' || !!s.hubFound?.[f];
export const hubTraceOf = (s, f) => (hubFound(s, f) ? 100 : Math.min(99, s.hubLead?.[f] || 0));
export function hubTrace(s, f, amount, why = '') {
  if (!FACTIONS[f] || hubFound(s, f) || amount <= 0) return;
  const n = Math.min(100, (s.hubLead ||= {})[f] = (s.hubLead[f] || 0) + amount);
  if (n < 100) return emit(s, 'lead', `${why}${FACTIONS[f].short} hub trace ${n}%.`, { faction: f });
  (s.hubFound ||= {})[f] = true;
  emit(s, 'located', `HUB LOCATED: ${FACTIONS[f].hub.name}. ${FACTIONS[f].short} is on your map.`, { faction: f, hub: true });
}
export function hubsOf(s) {
  if (!(s.mail?.boardOpen || (s.mail?.story || 0) >= 99)) return [];
  s.hubs ||= {};
  for (const f of FACTION_IDS) s.hubs[f] ||= { id: 'hub-' + f, faction: f, stock: {}, restockAt: 0 };
  return FACTION_IDS.filter((f) => hubFound(s, f)).map((f) => ({ ...s.hubs[f], ...FACTIONS[f].hub, faction: f }));
}
export const hubOf = (s, id) => hubsOf(s).find((h) => h.id === id || h.faction === id) || null;

// ---------- donations ----------
// Buying your way back: credits plus the code the hub's condition wants. +5 rep each, up to the
// top of Neutral (never into trust: that you earn). Inflated by how deep in the hole you are:
// base × (1 + depth/10), where depth is how far under 1 your rep sits.
export const DONATE = { rep: 5, cap: REP_TIERS[2] - 1, credits: (hubLevel) => 80 + 10 * hubLevel, code: 5, ware: { halcyon: 'cipher', glassjaw: 'exploit', kestrel: 'kernel', lantern: 'worm', nullchoir: 'cipher' } };
export function donationOf(s, f) {
  const depth = Math.max(0, REP_TIERS[1] - rep(s, f)), x = 1 + depth / 10;
  const w = DONATE.ware[f], code = w === 'exploit' ? Math.max(1, Math.round(x)) : Math.round(DONATE.code * x);
  return { credits: Math.round(DONATE.credits(FACTIONS[f].hub.level) * x), ware: w, code, x, open: rep(s, f) < DONATE.cap && !captured(s, f) };
}
export function donate(s, f) {
  if (!FACTIONS[f] || !hubOf(s, f)) return warn(s, 'Donate to a faction hub.');
  const d = donationOf(s, f);
  if (captured(s, f)) return warn(s, 'That hub is yours.');
  if (!d.open) return warn(s, `${FACTIONS[f].short} doesn’t take donations from friends. Earn the rest.`);
  const mats = materialsOf(s);
  if (s.server.credits < d.credits) return warn(s, `A donation to ${FACTIONS[f].short} is ${d.credits} credits and ${d.code} ${d.ware}.`);
  if ((mats[d.ware] || 0) < d.code) return warn(s, `A donation to ${FACTIONS[f].short} takes ${d.code} ${d.ware}.`);
  s.server.credits -= d.credits; mats[d.ware] -= d.code;
  changeRep(s, f, Math.min(DONATE.rep, DONATE.cap - rep(s, f)), `You donated to ${FACTIONS[f].short}`, { ripple: false });
}

// ---------- a hub's goods ----------
// Part of its market (market.mjs): the specialty goods only it sells, a few of each in stock,
// refilled every hour. Buy-only, and they come by file transfer like everything bought at a hub.
// Better tiers buy cheaper (−5% a tier from Neutral) and open the rarer goods; Hostile, shut.
// (Code, Exploits and salvage aren't goods: they're the market's wares, bought and sold.)
export const SHOP = { restockMs: 60 * 60000, qty: 3, discount: 0.05, atCost: 0.6 }; // a hub you hold sells at cost
const goodOf = (id) => GOODS[id] || FACTION_GOODS[id];
export function shopOf(s, f, at = now()) {
  const h = (s.hubs ||= {})[f] ||= { id: 'hub-' + f, faction: f, stock: {}, restockAt: 0 };
  if (at >= (h.restockAt || 0)) { h.stock = Object.fromEntries(FACTIONS[f].shop.map((id) => [id, SHOP.qty])); h.restockAt = at + SHOP.restockMs; }
  const L = Math.max(hackerLevel(s), FACTIONS[f].hub.level), t = repTier(s, f), mine = captured(s, f);
  return FACTIONS[f].shop.map((id) => {
    const g = goodOf(id), need = g.tier || 0;
    const price = priceNow(s, id, Math.round(g.credits(L) * (mine ? SHOP.atCost : 1 - SHOP.discount * Math.max(0, t.i - 1))), L);
    return { id, name: g.name, about: g.about || (g.code ? `${codeAmount(L)} of its code.` : ''), price, left: h.stock[id] || 0, locked: !mine && t.i < Math.max(1, need), need: Math.max(1, need) };
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
  sendGood(s, f, id, item.name, item.price, Math.max(hackerLevel(s), FACTIONS[f].hub.level), at);
}

// ---------- faction servers ----------
// A few of the servers you trace (about one in eight; never your first two, never rogue ones) belong
// to a faction. Most of the net stays neutral and unclaimed.
export const OWNED = { share: 0.12, vaultHit: 6, takeoverHit: 15 };
const ownedRoll = (loc) => seeded(((loc.seed || 1) * 73 + 29) >>> 0)(); // fixed by the server's seed: it doesn't move the game's dice
export function claimServer(s, loc, r = ownedRoll(loc)) {
  if (loc.rogue || loc.starter || (s.locations || []).filter((l) => !l.rogue).length <= 2 || r >= OWNED.share) return;
  const pool = FACTION_IDS.filter((f) => f !== 'halcyon'); // Halcyon insures servers; it doesn't run them out here
  loc.faction = pool[Math.floor((r / OWNED.share) * pool.length) % pool.length];
  hubTrace(s, loc.faction, HUB_TRACE.server, `${loc.name} is ${FACTIONS[loc.faction].short}'s: `); // a server of theirs points toward their hub
}
// A guard or virus cleared off a faction's server: a favour (a little rep), and their hub's trace moves.
export function clearedFor(s, loc) {
  if (!loc?.faction) return;
  changeRep(s, loc.faction, HUB_TRACE.rep, `You cleared ${loc.name}`, { ripple: false });
  hubTrace(s, loc.faction, HUB_TRACE.cleared, `${FACTIONS[loc.faction].short} noticed: `);
}
// Old saves claimed a third: let go of the servers that wouldn't be claimed now.
export function reclaimCheck(loc) { if (loc.faction && ownedRoll(loc) >= OWNED.share) delete loc.faction; }
// Opening a faction's vault, or taking its server over: a blow to it, a favour to its rivals.
export function strikeServer(s, loc, how) {
  if (!loc?.faction) return;
  const f = loc.faction;
  changeRep(s, f, -(how === 'takeover' ? OWNED.takeoverHit : OWNED.vaultHit), how === 'takeover' ? `You took ${loc.name} from ${FACTIONS[f].short}` : `You opened ${FACTIONS[f].short}'s vault on ${loc.name}`);
  if (how === 'takeover') delete loc.faction;
}
// Rivals of a faction: who it wants you to hit (for its contracts).
export const rivalServers = (s, f) => (s.locations || []).filter((l) => l.faction && FACTIONS[f].rivals.includes(l.faction) && !l.takenOver);

