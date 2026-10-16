// Root access: a server you've taken over keeps paying you back if you keep coming back to it
// (RuneScape's player-owned house, WoW's dailies and rare spawns).
//
// Since R1 (docs/servers.md 2.8) a server is rooms, and respawns are what rotations were: Root counts the respawned
// fight rooms you clear on a server you hold (netrooms.mjs rootClear), ROOT.need of them for each pip:
//   Root 1  taken over
//   Root 2  (5 clears) a stash room opens by the Core: the server's code, refilled every two hours
//   Root 3  (15) it stops sending invasions, and stops costing memory
//   Root 4  (30) one more socket room once sockets come (R2); until then one more building slot
//   Root 5  (50) its rare spawns come twice as often
// The old log rotations (a process in a folder, a rotated cache) only ran on the file-system servers; nothing on rooms
// rotates (tickRoot skips them).
import { emit, hooks, hackerLevel, rollDrop, addItem, gainXp, xpFor } from './combat.mjs';
import { FAMILIES, SERVER, variantFor, STRAINS } from './data.mjs';
import { seeded } from './gear.mjs';
import { nativeStrain, leanPick } from './network.mjs';

export const ROOT = {
  max: 5,
  need: [0, 0, 5, 15, 30, 50], // respawned fight rooms cleared on the server to reach Root N
  firstMs: 60 * 60000, // the first rotation, an hour after the takeover
  rotateMs: 2 * 3600000, // then every two hours
  rareChance: 0.25, rareMs: 60 * 60000, rareLevels: 2,
  levelXp: 0.75, // kills of XP for each Root level
  freeMemory: 3, portAt: 4, yieldAt: 4, yield: 0.25, wallAt: 5, wallPlus: 3, doubleAt: 5,
  cache: (level, root) => Math.round((20 + 4 * level) * (1 + 0.25 * (root - 1))), // credits in a rotated cache
  spread: 6, // more servers than this spread the same cache money thinner (each pays spread/owned of it)
  stash: (level) => 4 + Math.floor(level / 4), // code in /root's stash
};
const now = () => hooks.now?.() ?? Date.now();

// A server you hold for good: taken over, not rogue, not someone else's.
export const owned = (loc) => !!loc?.takenOver && !loc.rogue && !loc.member && !loc.zone && !loc.trunk;
export const rootOf = (loc) => (owned(loc) ? loc.root?.level || 1 : 0);
const rootState = (loc) => (loc.root ||= { level: 1, cleared: 0, n: 0, nextAt: null, proc: null });
// What the next Root level takes: processes cleared so far, and needed.
export const rootProgress = (loc) => { const r = rootState(loc); return r.level >= ROOT.max ? null : { have: r.cleared, need: ROOT.need[r.level + 1] }; };
// Root 3+: off your memory (memory.mjs).
export const freeOfMemory = (loc) => rootOf(loc) >= ROOT.freeMemory;
// Root 3 (without memory): the server stops sending invasions at you.
export const quietAtRoot = (loc) => rootOf(loc) >= ROOT.freeMemory;
export const rootPorts = (loc) => (rootOf(loc) >= ROOT.portAt ? 1 : 0);
// (Root 4's harvester +25% and Root 5's firewall +3 and doubled yield went with the R1 table: 2.8.)
export const rootYield = () => 1;
export const rootWall = () => 0;

// The process waiting on a server right now (alive and, if rare, not gone yet).
export function procOf(loc, at = now()) {
  const p = owned(loc) && loc.root?.proc;
  if (!p?.alive) return null;
  if (p.until && at >= p.until) return null;
  return p;
}
export const procIn = (loc, room, at = now()) => { const p = procOf(loc, at); return p && p.room === room ? p : null; };

// The rotated files: a cache at the root, and (Root 2+) a stash in /root.
export const CACHE_FILE = 'rotated.gz', STASH_DIR = '/root', STASH_FILE = 'stash.gz';
export function rootFiles(loc) {
  if (!owned(loc) || !loc.root?.n) return { cache: false, stash: false };
  return { cache: true, stash: rootOf(loc) >= 2 };
}
export function rootFileInfo(loc, path, name, codeName) {
  if (!owned(loc)) return null;
  const level = loc.level || 1;
  if (path === '/' && name === CACHE_FILE && loc.root?.n) {
    const amount = loc.root.cache ?? ROOT.cache(level, rootOf(loc)); // set when the logs rotated (spread over the servers you hold)
    return { kind: 'credits', size: '12k', amount, text: [`rotated log cache #${loc.root.n}: about ${amount} credits in old payment tokens.`, 'pull it to take it. the next rotation leaves another.'] };
  }
  if (path === STASH_DIR && name === STASH_FILE && rootOf(loc) >= 2) {
    const amount = ROOT.stash(level);
    return { kind: 'code', size: '24k', material: codeName, amount, text: [`root stash: ${amount} code the old owner kept for themselves.`, 'pull it and bank it. it fills again every rotation.'] };
  }
  return null;
}

// The clock: rotate every owned server whose time has come (real time, online or off).
export function tickRoot(s, at = now(), rooms = () => []) {
  for (const loc of (s.locations || []).filter(owned)) {
    if (loc.detached || loc.floorplan) continue; // frozen (memory.mjs); a server on rooms doesn't rotate (its rooms respawn)
    const r = rootState(loc);
    if (r.nextAt == null) { r.nextAt = at + ROOT.firstMs; continue; }
    if (r.proc?.alive && r.proc.until && at >= r.proc.until) { r.proc.alive = false; emit(s, 'info', `The rare virus on ${loc.name} moved on.`, { location: loc.id }); }
    if (at < r.nextAt) continue;
    rotate(s, loc, at, rooms(loc));
  }
}
export function rotate(s, loc, at, rooms) {
  const r = rootState(loc);
  r.n++;
  r.nextAt = at + ROOT.rotateMs;
  // The cache it leaves: spread thinner the more servers you hold (ROOT.spread), so owning many isn't a money printer.
  const held = (s.locations || []).filter((l) => l.takenOver).length || 1;
  r.cache = Math.max(1, Math.round(ROOT.cache(loc.level || 1, rootOf(loc)) * Math.min(1, ROOT.spread / held)));
  // Fresh files: the cache and the stash can be taken again.
  if (loc.state?.taken) { delete loc.state.taken['/' + CACHE_FILE]; delete loc.state.taken[STASH_DIR + '/' + STASH_FILE]; }
  const seed = ((loc.seed || 1) * 7919 + r.n * 104729) >>> 0, rnd = seeded(seed);
  const rare = rnd() < ROOT.rareChance;
  const fams = Object.keys(FAMILIES);
  const family = rnd() < 0.5 ? loc.family : leanPick(s, 'you', rnd()); // the other half leans with your network (network.mjs)
  // It keeps up with you inside the server's floor band (like a rogue server), rare ones 2 levels up.
  const level = Math.max(loc.level || 1, SERVER.keepUp(hackerLevel(s), loc.depth || 1)) + (rare ? ROOT.rareLevels : 0);
  const { grade, strain } = variantFor(family, level, loc.depth || 1, seed, nativeStrain(s, 'you'));
  const room = rooms.length ? rooms[Math.floor(rnd() * rooms.length)] : '/';
  const label = strain ? STRAINS[strain].name.toLowerCase() : FAMILIES[family].stem.toLowerCase();
  r.proc = { alive: true, room, family, level, seed, grade, strain, rare, ...(rare ? { until: at + ROOT.rareMs } : {}), name: `${rare ? 'rare-' : ''}${label}-${String(1000 + (seed % 9000)).slice(-4)}` };
  emit(s, 'rotation', `${loc.name}: logs rotated. ${rare ? `A rare virus (${r.proc.name}) is in ${room} for the next hour.` : `A new virus is in ${room}.`}`, { location: loc.id, rare });
}

// A process down (combat.mjs calls this through hooks.processWon): access grows, a rare one pays more.
export function processWon(s, e) {
  const loc = (s.locations || []).find((l) => l.id === e.process);
  const p = loc?.root?.proc;
  if (!p) return;
  p.alive = false;
  const r = loc.root;
  r.cleared++;
  if (p.rare) { const more = rollDrop(s, { kind: 'rogue', family: p.family, strain: p.strain, rare: true }, p.level); if (more) addItem(s, more, 'Rare virus: '); }
  while (r.level < ROOT.max && r.cleared >= ROOT.need[r.level + 1]) {
    r.level++;
    emit(s, 'root', `ROOT ${r.level} on ${loc.name}: ${ROOT_PERKS[r.level]}.`, { location: loc.id, root: r.level });
    gainXp(s, xpFor(s, loc.level || 1, ROOT.levelXp), `Root ${r.level} on ${loc.name}`, 'build');
  }
}
export const ROOT_PERKS = { 1: 'taken over', 2: 'a stash room opens by the Core, its code back every two hours', 3: 'it stops sending invasions', 4: 'one more building slot (a socket room, once sockets come)', 5: 'its rare spawns come twice as often' };
