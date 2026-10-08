// Networks: every player's network has a signature, rolled from its network seed (s.netSeed). A simulated
// consortium member's comes from their handle; a real player's seed will be theirs. The seed alone decides
// the signature, so the same seed always plays the same way. docs/networks.md is the designer's review sheet.
//
// What a signature sets (signature(seed)):
//   name     what the network is called (Rust Lattice, Saltwire Spur…)
//   lean     family weights: its mixed rogue folders, hidden neighbours, root rotations and the director's
//            couriers, bounties and outbreaks lean toward them
//   strain   its native strain: STRAIN_NATIVE times as likely as its family's other strains there
//   boss     its native boss (BOSSES nb-*), in a lair of its own (a rogue server) from NETWORK.lairFrom
//   uniques  3 to 5 native uniques from the pool (sources kind 'native' in content/items.mjs): about ten times
//            as likely on their network as anywhere else, with pity on their network like a boss's
//   events   two event-director cards that come up more often there
//   code     its rich code (a share of every other code drop there comes as it) and a material it is rich in
//            (salvage or Exploits)
//
// Where it applies: a fight or a server belongs to a network (netOf, fightNet). Your traced servers, your rogue
// servers, your home fights and your lair are yours; a member's servers (and their lair) are theirs; SPRAWL-00,
// KESSLER-FARM-00 and the trunk server belong to nobody. Natives, code and strains read the network a fight is
// on; the event bias and the lean of your own servers read yours.
//
// The native roll uses its own dice (s.netDice), so it never shifts the rest of the game's rolls. A save with no
// seed (a bare engine state in tests) has no network: no natives, no lean, no lair.
import { emit, warn, hackerLevel, UNIQUES, addItem, findLocation, active, listenBoost } from './combat.mjs';
import { CONFIG, FAMILIES, STRAINS, BOSSES, NATIVE_BOSSES, SERVER, createLocation, xpScale } from './data.mjs';
import { seeded, uniqueItem, codeOf, MATERIALS } from './gear.mjs';
import { postsOf } from './outpost.mjs';
import ITEMS from './content/items.mjs';

export const NETWORK = {
  natives: [3, 5], // how many native uniques a network rolls
  bands: [[5, 15], [16, 28], [29, 40]], // one from each band at least, so there's always one to chase
  tagWeight: { lean: 2, second: 1.25 }, // a native tied to its lean family is likelier to be one of its own
  lean: [3, 1.5, 0.5], // family weights, first to last
  home: 0.005, // the native roll on its network, per kill (elites and bosses roll three times)
  pity: 0.0001, // and this much more for every kill on that network without one (BOSS_LOOT's pity, per kill)
  awayEach: 0.0002, // each foreign native you know of (named, or native to a network you know), per kill: a tenth of a native's share at home, no pity
  away: 0.0005, // one you've never heard of (any other network's), per kill: it turns up rarely, and that names it
  listenAway: 2, // a Listening Post tuned to a foreign native you know: awayEach × (1 + this × posts) for it
  rolls: 3, // elites and bosses
  codeShare: 0.3, // on its network, this share of every other code comes as its rich code
  richIn: { salvage: 1.5, exploit: 1.5 }, // its rich material: part salvage, or Exploit drops, this much likelier there
  eventBoost: 2.5, // its two favoured cards come up this much more often
  lairFrom: 8, lairFinds: 3, // the lair turns up at this level, once you've found this many servers
  lairMs: 60 * 60000, // its boss comes back an hour after it falls
  lairPackMs: 30 * 60000, // the two folders guarding it, half an hour: a lair is a visit, not a farm
  lairRooms: ['outer', 'den', 'core'],
  darknet: { from: 8, credits: (L) => 400 + 40 * L, exploits: 2 }, // a listing for a foreign native (events.mjs)
  CARDS: ['courier', 'bounty', 'choir', 'outbreak', 'leak', 'darknet'],
  names: { a: ['Rust', 'Saltwire', 'Blackglass', 'Copper', 'Hollow', 'Static', 'Neon', 'Coldiron', 'Greywater', 'Nightjar', 'Brine', 'Ash'], b: ['Lattice', 'Mesh', 'Spur', 'Reach', 'Ring', 'Weave', 'Loop', 'Sprawl', 'Delta', 'Grid'] },
};
const FAMS = ['ransomware', 'worm', 'ghostroot'];
// The native pool: every unique whose source is 'native'.
export const NATIVE_POOL = (ITEMS.uniques || []).filter((u) => (u.sources || []).some((x) => x.kind === 'native')).map((u) => u.id);
const NATIVE_DEF = Object.fromEntries((ITEMS.uniques || []).filter((u) => NATIVE_POOL.includes(u.id)).map((u) => [u.id, u]));
export const isNative = (id) => !!NATIVE_DEF[id];
const tagOf = (id) => NATIVE_DEF[id]?.sources.find((x) => x.kind === 'native')?.tag || null;

// A number from a string (FNV-1a): the same handle always makes the same seed.
export function strSeed(text, n = 0) {
  let h = 2166136261 ^ n;
  for (const c of String(text)) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) || 1;
}
const wpick = (r, xs, w) => { let x = r() * xs.reduce((n, k) => n + w(k), 0); for (const k of xs) { x -= w(k); if (x < 0) return k; } return xs.at(-1); };

// ---------- the signature ----------
const CACHE = new Map();
export function signature(seed) {
  seed = seed >>> 0;
  if (!seed) return null;
  if (CACHE.has(seed)) return CACHE.get(seed);
  const r = seeded((seed ^ 0x51c2a7) >>> 0);
  const name = `${NETWORK.names.a[Math.floor(r() * NETWORK.names.a.length)]} ${NETWORK.names.b[Math.floor(r() * NETWORK.names.b.length)]}`;
  // Lean: the three families in an order of their own.
  const order = FAMS.map((f) => [r(), f]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  const lean = Object.fromEntries(order.map((f, i) => [f, NETWORK.lean[i]]));
  // Its native strain: one of its lead family's (seven times in ten), else its second's.
  const fam = r() < 0.7 ? order[0] : order[1];
  const strains = Object.keys(STRAINS).filter((k) => STRAINS[k].lineage === fam);
  const strain = strains[Math.floor(r() * strains.length)];
  // Its native boss: one of its lead family's three times as often.
  const boss = wpick(r, NATIVE_BOSSES, (k) => (BOSSES[k].family === order[0] ? 3 : 1));
  // Native uniques: one from each level band, then up to two more; its lean family's own are likelier.
  const w = (id) => (tagOf(id) === order[0] ? NETWORK.tagWeight.lean : tagOf(id) === order[1] ? NETWORK.tagWeight.second : 1);
  const uniques = [];
  for (const [lo, hi] of NETWORK.bands) uniques.push(wpick(r, NATIVE_POOL.filter((id) => NATIVE_DEF[id].level >= lo && NATIVE_DEF[id].level <= hi && !uniques.includes(id)), w));
  const more = NETWORK.natives[0] - NETWORK.bands.length + Math.floor(r() * (NETWORK.natives[1] - NETWORK.natives[0] + 1));
  for (let i = 0; i < more; i++) uniques.push(wpick(r, NATIVE_POOL.filter((id) => !uniques.includes(id)), w));
  uniques.sort((a, b) => NATIVE_DEF[a].level - NATIVE_DEF[b].level);
  // Events: two favoured cards.
  const cards = [...NETWORK.CARDS], events = [];
  for (let i = 0; i < 2; i++) events.push(cards.splice(Math.floor(r() * cards.length), 1)[0]);
  // Code: rich in its lead family's code six times in ten, else another; and rich in salvage or Exploits.
  const rich = r() < 0.6 ? codeOf(order[0]) : codeOf(order[1 + Math.floor(r() * 2)]);
  const extra = r() < 0.5 ? 'salvage' : 'exploit';
  const sig = { seed, name, lean, order, strain, boss, uniques, events, code: { rich, extra } };
  CACHE.set(seed, sig);
  return sig;
}

// ---------- whose network ----------
// Your seed (a save from before networks gets one: networkRestore), and a simulated member's (their handle).
export const netSeedOf = (s) => (s.netSeed >>> 0) || 0;
export const memberSeed = (h) => strSeed(h, 9);
export const seedOf = (s, who) => (!who ? 0 : who === 'you' ? netSeedOf(s) : memberSeed(who));
export const sigOf = (s, who) => signature(seedOf(s, who));
export const mine = (s) => sigOf(s, 'you');
// Whose network a server is on: 'you', a member's handle, or null (SPRAWL-00, the farm, the trunk, a hub).
export function netOf(s, loc) {
  if (!loc) return null;
  if (loc.member) return loc.member;
  if (loc.zone || loc.trunk || loc.farm || loc.hub || loc.id === CONFIG.zone.id) return null;
  return netSeedOf(s) ? 'you' : null;
}
// Whose network the fight you're in is on.
export function fightNet(s, e = s.encounter) {
  if (!e) return null;
  if (e.member) return findLocation(s, e.member)?.member || null; // defending a member's outpost
  if (e.raid || e.roamer || e.hubClear || e.retake) return null;
  if (e.mode === 'run' || e.zone) {
    const id = e.wild || e.process || s.run?.loc;
    if (e.zone && !e.wild && !e.process) return null; // SPRAWL-00
    return netOf(s, findLocation(s, id));
  }
  return netSeedOf(s) ? 'you' : null; // home: your wall, your outposts, your events
}
export const nameOf = (s, who) => { const g = sigOf(s, who); return g ? g.name : null; };
// What you've learned about a network by playing on it (s.netIntel[who]). The Network card and `network` show only
// this: the families you've fought there, its native strain once you've met it twice, its favoured events once each
// has come up twice, and what it's rich in once its code has noticeably leaned. Nothing is told; you find it.
export const INTEL = { strain: 2, event: 2, rich: 8 };
export const intelOf = (s, who) => ((s.netIntel ||= {})[who] ||= { fam: {}, strains: {}, events: {}, rich: 0 });
const learn = (s, who, what) => emit(s, 'info', `You notice ${what} on ${nameOf(s, who)}.`, { network: who });
export function noteKill(s, e) {
  const who = fightNet(s, e), v = e?.virus, g = who && sigOf(s, who);
  if (!g || !v) return;
  const n = intelOf(s, who);
  if (FAMILIES[v.family]) n.fam[v.family] = (n.fam[v.family] || 0) + 1; // the three families only: guards and bosses aren't a lean
  if (v.strain) {
    n.strains[v.strain] = (n.strains[v.strain] || 0) + 1;
    if (v.strain === g.strain && n.strains[v.strain] === INTEL.strain) learn(s, who, `${STRAINS[v.strain].name} turns up often`);
  }
}
export function noteEvent(s, card) {
  const g = mine(s);
  if (!g) return;
  const n = intelOf(s, 'you');
  n.events[card] = (n.events[card] || 0) + 1;
  if (g.events.includes(card) && n.events[card] === INTEL.event) learn(s, 'you', `${card[0].toUpperCase() + card.slice(1)} comes up often`);
}
export const knowsStrain = (s, who) => (intelOf(s, who).strains[sigOf(s, who)?.strain] || 0) >= INTEL.strain;
export const knowsEvent = (s, card) => (intelOf(s, 'you').events[card] || 0) >= INTEL.event;
export const knowsRich = (s, who) => intelOf(s, who).rich >= INTEL.rich;
export const whoLabel = (who) => (who === 'you' ? 'yours' : `${who}'s`);
// Networks you know: yours and your consortium's members'.
export const knownNets = (s) => [...(netSeedOf(s) ? ['you'] : []), ...(s.consortium?.members || [])];
// Which known network a native unique is native to (yours first), or null.
export const homeOf = (s, id) => knownNets(s).find((who) => sigOf(s, who)?.uniques.includes(id)) || null;

// ---------- the lean ----------
// A family for something on a network, from one roll (so callers keep their dice in step): its lean, or even.
export function leanPick(s, who, x) {
  const g = sigOf(s, who);
  if (!g) return FAMS[Math.floor(x * FAMS.length)];
  let r = x * FAMS.reduce((n, f) => n + g.lean[f], 0);
  for (const f of FAMS) { r -= g.lean[f]; if (r < 0) return f; }
  return FAMS.at(-1);
}
export const nativeStrain = (s, who) => sigOf(s, who)?.strain || null;

// ---------- named and seen ----------
// A native unique shows as ??? until you've seen it (it dropped for you) or heard it named (a darknet listing,
// its network's lair boss falling, a courier carrying it).
export const named = (s, id) => !!(s.collection?.[id] || s.netNamed?.[id]);
export function nameNative(s, id, why = '') {
  if (!isNative(id) || named(s, id)) return;
  (s.netNamed ||= {})[id] = true;
  if (why) emit(s, 'info', `${why}${UNIQUES[id].name}.`, { unique: id });
}

// ---------- the native roll ----------
// Its own dice (mulberry32 on the save), so it never moves the game's.
function dice(s) {
  let t = (s.netDice = ((s.netDice ?? ((netSeedOf(s) || 1) ^ 0x2f6b9e1d)) + 0x6d2b79f5) >>> 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const open = (id, level) => NATIVE_DEF[id] && NATIVE_DEF[id].level <= level + 2;
const pityKey = (s, who) => String(seedOf(s, who));
export const nativeChance = (s, who) => Math.min(1, NETWORK.home + NETWORK.pity * (s.netPity?.[pityKey(s, who)] || 0));
const listening = (s) => (s.listen && postsOf(s) && isNative(s.listen) ? s.listen : null);
// A foreign native you know of, per kill anywhere but its network; the one a Listening Post is tuned to, more.
export const awayChance = (s, id) => NETWORK.awayEach * (id && id === listening(s) ? 1 + NETWORK.listenAway * postsOf(s) : 1);
const knowsOf = (s, id) => named(s, id) || knownNets(s).some((w) => sigOf(s, w)?.uniques.includes(id));
// After a kill on network `who` (or none) at a level: maybe a native unique. Returns the item, or null.
// rolls: an elite's or a boss's. A grey kill (no XP) rolls nothing.
export function nativeRoll(s, who, level, rolls = 1, mobLevel = level) {
  if (!netSeedOf(s) || xpScale(mobLevel - hackerLevel(s)) <= 0) return null;
  const g = sigOf(s, who), mult = Math.max(1, rolls);
  // Its own natives, on its network: pity like a boss's, one you haven't found first, the one you listen for first of all.
  const home = g ? g.uniques.filter((id) => open(id, level)) : [];
  if (home.length) {
    const key = pityKey(s, who), heard = home.includes(listening(s)) ? listenBoost(s) : 1;
    if (dice(s) < Math.min(1, nativeChance(s, who) * mult * heard)) {
      (s.netPity ||= {})[key] = 0;
      const fresh = home.filter((id) => !s.collection?.[id]), lst = home.filter((id) => id === listening(s));
      const from = lst.length && fresh.includes(lst[0]) ? lst : fresh.length ? fresh : home;
      return give(s, from[Math.floor(dice(s) * from.length)], level, who);
    }
    (s.netPity ||= {})[key] = (s.netPity[key] || 0) + 1;
  }
  // A foreign native: anyone's but this network's. Each one you know of has its own small chance (the one you listen
  // for, a better one); the ones you've never heard of share one roll, and the first that drops is named.
  const away = NATIVE_POOL.filter((id) => open(id, level) && !g?.uniques.includes(id));
  const known = away.filter((id) => knowsOf(s, id));
  for (const id of known) if (dice(s) < awayChance(s, id) * mult) return give(s, id, level, homeOf(s, id));
  const strangers = away.filter((id) => !known.includes(id));
  if (strangers.length && dice(s) < NETWORK.away * mult) { const id = strangers[Math.floor(dice(s) * strangers.length)]; return give(s, id, level, homeOf(s, id)); }
  return null;
}
// The item, carrying the network it's native to (its tooltip names it).
function give(s, id, level, who) {
  const it = uniqueItem(UNIQUES[id], level, () => dice(s));
  it.home = homeName(s, id, who);
  nameNative(s, id);
  return it;
}
// The network a native unique belongs to, for its tooltip: a known one, or a stranger's (named from its id).
export function homeName(s, id, who = homeOf(s, id)) {
  if (who) return { name: nameOf(s, who), who };
  const stranger = signature(strSeed(id, (netSeedOf(s) || 1) % 97));
  return { name: stranger.name, who: null };
}

// ---------- code and materials ----------
// On a network rich in a code, a share of every other code drop there comes as it (a carry keeps the fractions,
// so small drops lean too). gains: { material: n } → the same total, leaning.
export function biasCode(s, who, gains) {
  const g = sigOf(s, who);
  if (!g || !gains) return gains;
  const out = { ...gains }, rich = g.code.rich, carry = (s.netCarry ||= {});
  let moved = 0;
  for (const k of ['cipher', 'worm', 'kernel']) {
    if (k === rich || !(out[k] > 0)) continue;
    const x = (carry[k] || 0) + out[k] * NETWORK.codeShare, n = Math.min(out[k], Math.floor(x));
    carry[k] = x - n; out[k] -= n; moved += n;
  }
  if (moved) {
    out[rich] = (out[rich] || 0) + moved;
    const n = intelOf(s, who), was = n.rich;
    n.rich += moved;
    if (was < INTEL.rich && n.rich >= INTEL.rich) learn(s, who, `${MATERIALS[rich].name} keeps turning up`);
  }
  for (const k of Object.keys(out)) if (!out[k]) delete out[k];
  return out;
}
// How much likelier part salvage or an Exploit drop is on a network rich in it.
export const richMult = (s, who, what) => (sigOf(s, who)?.code.extra === what ? NETWORK.richIn[what] : 1);
// The director's weight for a card on your network.
export const eventMult = (s, card) => (mine(s)?.events.includes(card) ? NETWORK.eventBoost : 1);

// ---------- the lair ----------
export const lairOf = (s) => (s.locations || []).find((l) => l.lair && !l.member) || null;
export const lairBoss = (s, who) => sigOf(s, who)?.boss || null;
// A lair on a network: a rogue server of its own, its native boss in /core, its family in the other two folders.
export function makeLair(s, who, level, id, name) {
  const boss = lairBoss(s, who);
  if (!boss) return null;
  const B = BOSSES[boss], seed = (seedOf(s, who) % 99991) + 7;
  const loc = createLocation(B.family, seed, SERVER.layerFor(level));
  return Object.assign(loc, { id, name, family: B.family, level, lair: boss, rogue: { kind: 'lair' }, template: 'rogue', quirk: null, trait: null, spawns: {}, serial: 0, rooms: NETWORK.lairRooms });
}
// Yours turns up once you're NETWORK.lairFrom and have found NETWORK.lairFinds servers.
// force: developer lair (now, whatever your level).
export function openLair(s, force = false) {
  if (!netSeedOf(s) || lairOf(s)) return null;
  if (!force && (hackerLevel(s) < NETWORK.lairFrom || (s.locations || []).filter((l) => !l.zone && !l.farm && !l.lair).length < NETWORK.lairFinds)) return null;
  const B = BOSSES[lairBoss(s, 'you')];
  const loc = makeLair(s, 'you', hackerLevel(s), 'lair', B.lair);
  s.locations.push(loc);
  emit(s, 'located', `${B.lair} is on your map: the lair of ${B.name}, your network's native boss. What it guards is native to ${mine(s).name}.`, { location: loc.id });
  return loc;
}
// What a lair's folders hold: its family (its network's native strain more often) and, in /core, its boss.
export function lairSpawns(s, loc, now, variant) {
  const who = netOf(s, loc), B = BOSSES[loc.lair];
  if (!loc.member) loc.level = Math.max(loc.level || 1, hackerLevel(s));
  for (const room of NETWORK.lairRooms.map((x) => '/' + x)) {
    const sp = loc.spawns[room];
    if (sp?.alive || (sp && sp.respawnAt > now)) continue;
    const n = (loc.serial = (loc.serial || 0) + 1);
    const seed = ((loc.seed || 1) * 131 + n * 7919) >>> 0;
    if (room === '/core') { loc.spawns[room] = { alive: true, family: B.family, boss: loc.lair, level: loc.level, seed, strain: B.strain || null, name: B.name }; continue; }
    const { grade, strain } = variant(B.family, loc.level, loc.depth || 1, seed, nativeStrain(s, who));
    loc.spawns[room] = { alive: true, family: B.family, level: loc.level, seed, strain, grade, name: `${strain ? STRAINS[strain].name.toLowerCase() : FAMILIES[B.family].name.toLowerCase()}-${String(1000 + ((n * 7919) % 9000)).slice(-4)}` };
  }
  return loc.spawns;
}
// A native boss's drops: its network's natives open at its level, BOSS_LOOT's odds and pity (combat.mjs bossUnique).
// The first time it falls it names every native of its network.
export const lairUniques = (s, who, level) => (sigOf(s, who)?.uniques || []).filter((id) => open(id, level));
export function lairFell(s, who) {
  const g = sigOf(s, who);
  if (!g) return;
  const fresh = g.uniques.filter((id) => !named(s, id));
  for (const id of fresh) (s.netNamed ||= {})[id] = true;
  if (fresh.length) emit(s, 'info', `${BOSSES[g.boss].name} falls, and its loot table spills: ${fresh.map((id) => UNIQUES[id].name).join(', ')}. Native to ${g.name}.`);
}

// ---------- darknet listings (events.mjs) ----------
// A foreign native for sale: the one you listen for first, then one you've heard of, then any you lack.
export function darknetPick(s, level) {
  const g = mine(s);
  const pool = NATIVE_POOL.filter((id) => open(id, level) && !g?.uniques.includes(id) && !s.collection?.[id]);
  if (!pool.length) return null;
  const r = dice(s);
  const lst = pool.find((id) => id === s.listen), heard = pool.filter((id) => named(s, id));
  if (lst) return lst;
  if (heard.length && r < 0.5) return heard[Math.floor(dice(s) * heard.length)];
  return pool[Math.floor(dice(s) * pool.length)];
}
export function darknetBuy(s, ev) {
  const L = ev.level, credits = NETWORK.darknet.credits(L), ex = NETWORK.darknet.exploits, m = s.materials || {};
  if (active(s)) return warn(s, 'Finish the fight first.');
  if (s.server.credits < credits || (m.exploit || 0) < ex) return warn(s, `${UNIQUES[ev.unique].name} costs ${credits} credits and ${ex} Exploits. You have ${s.server.credits} and ${m.exploit || 0}.`);
  s.server.credits -= credits; m.exploit -= ex;
  const it = uniqueItem(UNIQUES[ev.unique], hackerLevel(s), () => dice(s));
  it.home = homeName(s, ev.unique);
  addItem(s, it, 'Darknet: ');
  return true;
}

// ---------- the save ----------
// v36: networks. A save from before gets a seed from its own (its seed and its handle), so it always rolls the same one.
export function networkRestore(s, was) {
  if (was >= 36 && s.netSeed) return;
  if (!s.netSeed) s.netSeed = strSeed(`${s.profile?.handle || ''}:${s.seed || 1}:${s.rng || 0}`, 36);
  s.netNamed ||= {};
  s.netPity ||= {};
}

// ---------- show it ----------
// One line per network for `network` and `network <member>`.
export function networkLines(s, who) {
  const g = sigOf(s, who);
  if (!g) return [who === 'you' ? 'No network seed.' : `No network for ${who}.`];
  const n = intelOf(s, who), fought = Object.entries(n.fam).filter(([f]) => FAMILIES[f]).sort((a, b) => b[1] - a[1]);
  const fam = fought.length ? fought.map(([f, k]) => `${FAMILIES[f].name} ${k}`).join(', ') : 'nothing yet';
  const nat = g.uniques.map((id) => (named(s, id) ? `${UNIQUES[id].name} (lv ${UNIQUES[id].level})` : '???')).join(', ');
  const lair = who === 'you' && lairOf(s);
  const events = who === 'you' ? g.events.filter((k) => knowsEvent(s, k)) : [];
  return [
    `${g.name} · ${whoLabel(who)}`,
    `Fought here: ${fam}.${knowsStrain(s, who) ? ` ${STRAINS[g.strain].name} turns up often.` : ''}`,
    `Native boss: ${lair ? `${BOSSES[g.boss].name} in ${lair.name}` : '???'}.`,
    `Native uniques: ${nat}.`,
    ...(who === 'you' ? [`Events that come up often: ${events.length ? events.map((k) => k[0].toUpperCase() + k.slice(1)).join(' and ') : '???'}.`] : []),
    `Rich in: ${knowsRich(s, who) ? `${MATERIALS[g.code.rich].name} and ${g.code.extra === 'salvage' ? 'salvage' : 'Exploits'}` : '???'}.`,
  ];
}
export function networkCommand(s, text) {
  const arg = text.replace(/^network\s*/, '').trim().toLowerCase();
  if (!arg || arg === 'mine' || arg === 'you') {
    if (!netSeedOf(s)) return warn(s, 'No network seed.');
    return emit(s, 'info', networkLines(s, 'you').join('\n'), { network: 'you' });
  }
  const h = (s.consortium?.members || []).find((x) => x.toLowerCase() === arg);
  if (!h) return warn(s, s.consortium ? `${arg} isn't in ${s.consortium.name}. network <member>` : 'network, or network <member> once you are in a consortium.');
  return emit(s, 'info', networkLines(s, h).join('\n'), { network: h });
}
