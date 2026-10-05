// Rogue servers: wild servers in the network where viruses gather and come back after you kill
// them, like SPRAWL-00 but deeper, at the server's own level and grade (with strains from layer 2).
// About 1 in 6 servers you trace is one, and never more than five in a row aren't. A rogue server
// has no vault, so it can't be taken over or harvested, and it never sends invaders: you go to it.
// Each has a kind:
//   Nest      one family, strains twice as often
//   Pit       mixed families, 2 levels above the server, a second roll for drops
//   Gauntlet  mixed families; clear every folder in one run for a bonus cache
import { emit, rand, gainCode, gainXp, xpFor, hooks } from './combat.mjs';
import { FAMILIES, variantFor, STRAINS, CONFIG, ELITE } from './data.mjs';
import { seeded, codeOf } from './gear.mjs';
import { occupationCleared } from './consortium.mjs';

export const ROGUE = {
  share: 1 / 6, // of servers you trace
  pity: 5, // after this many in a row that aren't, the next one is
  firstTame: 2, // the first two servers you trace are never rogue
  kinds: { nest: { name: 'Nest', rule: 'One family only, and strains twice as often.' }, pit: { name: 'Pit', rule: 'Mixed families, 2 levels above the server, better drops.' }, gauntlet: { name: 'Gauntlet', rule: 'Clear every folder in one run for a bonus cache.' } },
  rooms: ['hive', 'pit', 'spool', 'cells', 'drain', 'nursery', 'crypt', 'sump', 'rack', 'void'],
  respawnMs: [180000, 300000], // 3–5 minutes
  pitLevels: 2,
  relockMs: CONFIG.relockMs, // after you leave a wild server it won't take you back for a minute
};
export const isRogue = (loc) => !!loc?.rogue;
export const isWild = (loc) => !!(loc?.zone || loc?.rogue);
// Seconds until a wild server lets you reconnect (0 = now).
export const clock = () => hooks.now?.() ?? Date.now();
export const relockLeft = (loc, now = clock()) => Math.max(0, Math.ceil(((loc?.lockUntil || 0) - now) / 1000));

// Decide, when a server is traced, whether it's rogue (fixed by its seed, with the pity rule).
export function rollRogue(s, loc) {
  const net = (s.net ||= {});
  if ((s.locations || []).length < ROGUE.firstTame) return; // your first servers are always normal: the early jobs need one to take over
  const r = seeded((loc.seed || 1) * 61 + 7);
  const rogue = r() < ROGUE.share || (net.rogueDry || 0) >= ROGUE.pity;
  if (!rogue) { net.rogueDry = (net.rogueDry || 0) + 1; return; }
  net.rogueDry = 0;
  const kinds = Object.keys(ROGUE.kinds);
  loc.rogue = { kind: kinds[Math.floor(r() * kinds.length)] };
  loc.template = 'rogue';
  loc.quirk = null; // quirks and site traits are about vaults and harvesting: not here
  loc.trait = null;
  loc.spawns = {};
  loc.serial = 0;
}

// Its folders: 4–8 of them, one level deep, chosen by its seed.
// An occupied server (consortium.mjs) has its own folders.
export function rogueLayout(loc) {
  const r = seeded((loc.seed || 1) * 67 + 3);
  const n = 4 + Math.floor(r() * 5);
  const rooms = loc.rooms || ROGUE.rooms.map((x) => [r(), x]).sort((a, b) => a[0] - b[0]).slice(0, n).map((x) => x[1]);
  const out = { '/': { dirs: rooms, files: ['motd.txt'] } };
  for (const room of rooms) out['/' + room] = { dirs: [], files: [] };
  return out;
}
export const rogueRooms = (loc) => Object.keys(rogueLayout(loc)).filter((p) => p !== '/');

export function rogueMotd(loc) {
  if (loc.occupied) return [`${loc.name}. rebooting. something moved in while it was down.`, 'clear every folder and it comes back up.'];
  const k = ROGUE.kinds[loc.rogue.kind];
  const fam = FAMILIES[loc.family].name.toLowerCase();
  return {
    nest: [`${loc.name}. nobody has run this box in years. the ${fam} moved in.`, 'every folder is a nest. they come back. they always come back.'],
    pit: [`${loc.name}. abandoned exchange. whatever's down here is hungry.`, 'stronger than the box should hold. better pickings too.'],
    gauntlet: [`${loc.name}. somebody wired every folder with a live process.`, 'clear the lot in one go and the cache at the root opens.'],
  }[loc.rogue.kind] || [k.rule];
}

// Fill empty folders whose timer is up. Same as SPRAWL-00, but at the server's level and grade.
export function rogueSpawns(s, loc, now = clock()) {
  if (!loc.rogue) return {};
  loc.spawns ||= {};
  const fams = Object.keys(FAMILIES);
  for (const room of rogueRooms(loc)) {
    const sp = loc.spawns[room];
    if (sp?.alive || (sp && (sp.respawnAt > now || loc.occupied))) continue; // an occupation doesn't come back
    const n = (loc.serial = (loc.serial || 0) + 1);
    const seed = ((loc.seed || 1) * 131 + n * 7919) >>> 0;
    const r = seeded(seed);
    const family = loc.rogue.kind === 'nest' ? loc.family : fams[Math.floor(r() * fams.length)];
    const level = (loc.level || 1) + (loc.rogue.kind === 'pit' ? ROGUE.pitLevels : 0);
    let { grade, strain } = variantFor(family, level, loc.depth || 1, seed);
    if (!strain && loc.rogue.kind === 'nest') strain = variantFor(family, level, loc.depth || 1, seed ^ 0x9e37).strain; // twice the chances
    const label = strain ? STRAINS[strain].name.toLowerCase() : FAMILIES[family].name.toLowerCase();
    const elite = loc.rogue.kind === 'pit' && seeded(seed ^ 0x51ed)() < ELITE.share; // group content
    loc.spawns[room] = { alive: true, family, level, seed, strain, grade, ...(elite ? { elite: true } : {}), name: `${elite ? 'elite ' : ''}${label}-${String(1000 + ((n * 7919) % 9000)).slice(-4)}` };
  }
  return loc.spawns;
}
export const liveRogue = (loc) => Object.values(loc.spawns || {}).filter((x) => x.alive).length;
export const rogueRespawn = (s) => ROGUE.respawnMs[0] + Math.floor(rand(s) * (ROGUE.respawnMs[1] - ROGUE.respawnMs[0]));

// After a kill on a rogue server: the folder goes quiet, the Pit rolls again for a drop, and a
// Gauntlet cleared in one run opens its cache.
export function rogueKill(s, loc, room, now, extraDrop) {
  const sp = loc.spawns?.[room];
  if (sp) { sp.alive = false; sp.respawnAt = now + rogueRespawn(s); }
  if (loc.occupied && !liveRogue(loc)) occupationCleared(s, loc);
  if (loc.rogue.kind === 'pit') extraDrop();
  if (loc.rogue.kind === 'gauntlet' && s.run) {
    const done = (s.run.gauntlet ||= []);
    if (!done.includes(room)) done.push(room);
    if (!s.run.gauntletPaid && rogueRooms(loc).every((r) => done.includes(r))) {
      s.run.gauntletPaid = true;
      const credits = 60 + 12 * (loc.level || 1), code = 4 + Math.floor((loc.level || 1) / 5);
      s.server.credits += credits;
      gainCode(s, { [codeOf(loc.family)]: code }, '');
      gainXp(s, xpFor(s, loc.level || 1, 1), 'gauntlet cleared');
      emit(s, 'net-good', `GAUNTLET CLEARED. The cache at the root opens: +${credits} credits, +${code} code.`);
    }
  }
}
