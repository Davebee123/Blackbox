// Factions (PvE): companies and hacker crews with servers of their own on your map. Each has a
// hub (a shop, its own board of work, later a market), rep with you, and friends and enemies among
// the others: helping one costs you with its rivals and warms its allies.
//
// Rep (docs/factions-plan.md): every faction runs 1 to 100 in four tiers (1/25/50/75), each named its
// own way. Nothing drives it under 1, so no hub ever shuts. It comes from two things only: the
// contracts a faction posts, and the receipts you stamp for it (receipts.mjs). You hold one
// commission (s.commission, absent = Halcyon): the faction whose retainer you draw, and your stance.
import { emit, warn, rand, hackerLevel, hooks, active } from './combat.mjs';
import { buyAt } from './store.mjs';
import { seeded } from './gear.mjs';

const now = () => hooks.now?.() ?? Date.now();

// Tier thresholds (the same for everyone; each faction names them its own way).
export const REP_TIERS = [1, 25, 50, 75];
export const FACTIONS = {
  halcyon: {
    name: 'Halcyon Mutual', short: 'Halcyon', kind: 'corp', color: '#6fb6ff', start: 10,
    about: 'Cyber-insurance giant. Pays crews to fight its turf war, and doesn’t ask how.',
    tiers: ['Probation', 'Contractor', 'Trusted', 'Preferred'],
    allies: ['kestrel'], rivals: ['glassjaw', 'nullchoir'],
    hub: { name: 'HALCYON-CLEARING-01', level: 1 },
  },
  glassjaw: {
    name: 'GLASSJAW', short: 'GLASSJAW', kind: 'corp', color: '#e07bd0', start: 5,
    about: 'Halcyon’s competitor. Off the books, pays better, and asks less.',
    tiers: ['Unknown', 'Asset', 'Partner', 'Inner circle'],
    allies: [], rivals: ['halcyon', 'lantern'],
    hub: { name: 'GLASSJAW-ANNEX-07', level: 8 },
  },
  kestrel: {
    name: 'Kestrel Underwriting', short: 'Kestrel', kind: 'corp', color: '#8fd46b', start: 10,
    about: 'Runs the data centres everyone rents. Neutral, cautious, everywhere.',
    tiers: ['Prospect', 'Client', 'Account', 'Key account'],
    allies: ['halcyon'], rivals: ['nullchoir'],
    hub: { name: 'KESTREL-DC-NORTH', level: 4 },
  },
  lantern: {
    name: 'LANTERN', short: 'LANTERN', kind: 'crew', color: '#ffb347', start: 10,
    about: 'The voice on the numbers station. Sells what it hears, to whoever listens.',
    tiers: ['Listener', 'Regular', 'Confidant', 'Signal'],
    allies: ['nullchoir'], rivals: ['glassjaw'],
    hub: { name: 'LANTERN-RELAY-88', level: 6 },
  },
  nullchoir: {
    name: 'NULL CHOIR', short: 'NULL CHOIR', kind: 'crew', color: '#ff6f91', start: 10,
    about: 'An anarchist crew. Breaks corporate servers for fun, and trades fair with anyone who does the same.',
    tiers: ['Outsider', 'Fellow', 'Choir', 'Cantor'],
    allies: ['lantern'], rivals: ['halcyon', 'kestrel'],
    hub: { name: 'NULLCHOIR-SQUAT-13', level: 12 },
  },
};
export const FACTION_IDS = Object.keys(FACTIONS);
// ---------- rep ----------
export const rep = (s, f) => { const st = (s.standing ||= { halcyon: FACTIONS.halcyon.start }); if (st[f] == null) st[f] = FACTIONS[f]?.start ?? 10; return st[f]; };
export const repTier = (s, f) => { const r = rep(s, f); let i = 0; REP_TIERS.forEach((m, k) => { if (r >= m) i = k; }); return { i, name: FACTIONS[f].tiers[i], next: REP_TIERS[i + 1] ?? null, min: REP_TIERS[i] }; };
export const REP_FLOOR = 1; // nothing drives a faction under this: no hub ever shuts
// Each faction's crews write their own kind of virus (its runners in feuds, its invaders on a defence call).
export const FACTION_FAMILY = { halcyon: 'worm', glassjaw: 'ghostroot', kestrel: 'worm', lantern: 'worm', nullchoir: 'ransomware' };
// How rep moves through the web: a rival loses half of what you gave, an ally gains a quarter.
export const RIPPLE = { rival: 0.5, ally: 0.25 };
// Just the ripple: rivals move half the other way, allies a quarter the same way.
export function rippleRep(s, f, delta) {
  for (const r of FACTIONS[f]?.rivals || []) { const d = -Math.round(delta * RIPPLE.rival); if (d) changeRep(s, r, d, `${FACTIONS[f].short}'s rival noticed`, { ripple: false }); }
  for (const a of FACTIONS[f]?.allies || []) { const d = Math.round(delta * RIPPLE.ally); if (d) changeRep(s, a, d, `${FACTIONS[f].short}'s ally noticed`, { ripple: false }); }
}
export function changeRep(s, f, delta, why, { ripple = true, quiet = false } = {}) {
  if (!delta || !FACTIONS[f]) return;
  const before = repTier(s, f).name, was = rep(s, f);
  s.standing[f] = Math.max(REP_FLOOR, Math.min(100, was + delta));
  delta = s.standing[f] - was; // what actually changed: a capped or floored change ripples only as far as it went
  if (!delta) return;
  const after = repTier(s, f);
  if (!quiet) emit(s, delta < 0 ? 'rep-down' : 'rep-up', `${why}: ${FACTIONS[f].short} ${delta > 0 ? '+' : ''}${delta} (${rep(s, f)}, ${after.name}).${after.name !== before ? ` ${delta > 0 ? 'Up' : 'Down'} to ${after.name}.` : ''}`, { faction: f, rep: rep(s, f) });
  if (ripple) rippleRep(s, f, delta);
}

// Old saves: rep could sit under 1 (Hostile, or Halcyon's Suspended at 0). Keyed on the value: safe to run twice.
export function repRestore(s) { for (const f of Object.keys(s.standing || {})) if (s.standing[f] < REP_FLOOR) s.standing[f] = REP_FLOOR; }

// ---------- your commission ----------
// The one faction whose retainer you draw (mail.mjs, from your rep with it), and your stance (lore.md 3). Switched at
// any found hub, free, out of a fight; wick has a line each time.
export const STANCE = { halcyon: 'Holds with', kestrel: 'Seals with', lantern: 'Settles with', nullchoir: 'Rolls back with', glassjaw: 'Sells to' };
export const WICK_SWITCH = {
  halcyon: 'halcyon pays again. same desk, same claim numbers. i still point.',
  glassjaw: 'glassjaw pays now. count it twice. i still point.',
  kestrel: 'kestrel pays now. they own the racks you stand on. i still point.',
  lantern: 'lantern pays now. i still point.',
  nullchoir: 'the choir pays now. they sing loud and pay late. i still point.',
};
export const commissionOf = (s) => (FACTIONS[s.commission] ? s.commission : 'halcyon');
export const stanceLine = (s) => `${STANCE[commissionOf(s)]} ${FACTIONS[commissionOf(s)].short}`;
export function setCommission(s, f) {
  if (!FACTIONS[f]) return warn(s, 'commission <faction>');
  if (!hubOf(s, f)) return warn(s, `Find ${FACTIONS[f].short}'s hub first.`);
  if (active(s)) return warn(s, 'Finish the fight first.');
  if (commissionOf(s) === f) return warn(s, `You already hold ${FACTIONS[f].short}'s commission.`);
  s.commission = f;
  emit(s, 'commission', `Commission: ${FACTIONS[f].short}. ${stanceLine(s)}.`, { faction: f });
  emit(s, 'breadcrumb', `wick: ${WICK_SWITCH[f]}`, { faction: f });
}

// ---------- hubs ----------
// One hub per faction, once the board opens (the end of LOWLIGHT's jobs): not fights, places to
// trade. Halcyon's is known (it's your employer); every other faction's you find. Its trace grows
// when you locate a server it owns, and when you clear the viruses off one (they like that). At 100%
// the hub is located: it's on your map, and connect <faction> reaches it.
export const HUB_TRACE = { server: 40, cleared: 20 };
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
  for (const f of FACTION_IDS) s.hubs[f] ||= { id: 'hub-' + f, faction: f };
  return FACTION_IDS.filter((f) => hubFound(s, f)).map((f) => ({ ...s.hubs[f], ...FACTIONS[f].hub, faction: f }));
}
export const hubOf = (s, id) => hubsOf(s).find((h) => h.id === id || h.faction === id) || null;

// ---------- a hub's Shop ----------
// Every hub's has one shape (store.mjs): tools, the shelf, its chase line, its codebases. buy <faction> <what>.
export const buyFrom = (s, f, id, at = now()) => buyAt(s, f, id, at);

// ---------- faction servers ----------
// A few of the servers you trace (about one in eight; never your first two, never rogue ones) belong
// to a faction. Most of the net stays neutral and unclaimed.
export const OWNED = { share: 0.12 };
const ownedRoll = (loc) => seeded(((loc.seed || 1) * 73 + 29) >>> 0)(); // fixed by the server's seed: it doesn't move the game's dice
export function claimServer(s, loc, r = ownedRoll(loc)) {
  if (loc.rogue || loc.starter || (s.locations || []).filter((l) => !l.rogue).length <= 2 || r >= OWNED.share) return;
  const pool = FACTION_IDS.filter((f) => f !== 'halcyon'); // Halcyon insures servers; it doesn't run them out here
  loc.faction = pool[Math.floor((r / OWNED.share) * pool.length) % pool.length];
  hubTrace(s, loc.faction, HUB_TRACE.server, `${loc.name} is ${FACTIONS[loc.faction].short}'s: `); // a server of theirs points toward their hub
}
// A guard or virus cleared off a faction's server: their hub's trace moves (no rep: that's contracts and receipts).
export function clearedFor(s, loc) {
  if (!loc?.faction) return;
  hubTrace(s, loc.faction, HUB_TRACE.cleared, `${FACTIONS[loc.faction].short} noticed: `);
}
// Old saves claimed a third: let go of the servers that wouldn't be claimed now.
export function reclaimCheck(loc) { if (loc.faction && ownedRoll(loc) >= OWNED.share) delete loc.faction; }
// A faction's server taken over: it isn't theirs any more (no rep: the receipt's stamp is the choice).
export function strikeServer(s, loc, how) { if (loc?.faction && how === 'takeover') delete loc.faction; }
// Rivals of a faction: who it wants you to hit (for its contracts).
export const rivalServers = (s, f) => (s.locations || []).filter((l) => l.faction && FACTIONS[f].rivals.includes(l.faction) && !l.takenOver);

