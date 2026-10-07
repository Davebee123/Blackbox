// Root access: a server you've taken over keeps paying you back if you keep coming back to it
// (RuneScape's player-owned house, WoW's dailies and rare spawns).
//
// Every few hours its logs rotate: a fresh process moves into one of its folders, and a rotated
// cache of credits waits at the root. Clear the process and the server gives you more access:
//   Root 1  taken over
//   Root 2  /root opens: a stash of the server's code, refilled every rotation
//   Root 3  it stops costing memory
//   Root 4  one more module port, and its harvester yields 25% more
//   Root 5  its firewall +3, and its harvester works like two (yield doubled)
// Sometimes a rotation brings a rare process instead: 2 levels up, three loot rolls, and it's gone
// within the hour. Rotations run in real time, online or off (not while it's detached: frozen);
// the map marks a waiting one with ↻.
import { emit, hooks, hackerLevel, rollDrop, addItem } from './combat.mjs';
import { FAMILIES, SERVER, variantFor, STRAINS } from './data.mjs';
import { seeded } from './gear.mjs';

export const ROOT = {
  max: 5,
  need: [0, 0, 1, 2, 4, 7], // processes cleared to reach Root N
  firstMs: 60 * 60000, // the first rotation, an hour after the takeover
  rotateMs: 2 * 3600000, // then every two hours
  rareChance: 0.25, rareMs: 60 * 60000, rareLevels: 2, rareRolls: 3,
  freeMemory: 3, portAt: 4, yieldAt: 4, yield: 0.25, wallAt: 5, wallPlus: 3, doubleAt: 5,
  cache: (level, root) => Math.round((20 + 4 * level) * (1 + 0.25 * (root - 1))), // credits in a rotated cache
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
export const rootPorts = (loc) => (rootOf(loc) >= ROOT.portAt ? 1 : 0);
export const rootYield = (loc) => (rootOf(loc) >= ROOT.doubleAt ? 2 : rootOf(loc) >= ROOT.yieldAt ? 1 + ROOT.yield : 1);
export const rootWall = (loc) => (rootOf(loc) >= ROOT.wallAt ? ROOT.wallPlus : 0);

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
    const amount = ROOT.cache(level, rootOf(loc));
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
    if (loc.detached) continue; // frozen (memory.mjs)
    const r = rootState(loc);
    if (r.nextAt == null) { r.nextAt = at + ROOT.firstMs; continue; }
    if (r.proc?.alive && r.proc.until && at >= r.proc.until) { r.proc.alive = false; emit(s, 'info', `The rare process on ${loc.name} moved on.`, { location: loc.id }); }
    if (at < r.nextAt) continue;
    rotate(s, loc, at, rooms(loc));
  }
}
export function rotate(s, loc, at, rooms) {
  const r = rootState(loc);
  r.n++;
  r.nextAt = at + ROOT.rotateMs;
  // Fresh files: the cache and the stash can be taken again.
  if (loc.state?.taken) { delete loc.state.taken['/' + CACHE_FILE]; delete loc.state.taken[STASH_DIR + '/' + STASH_FILE]; }
  const seed = ((loc.seed || 1) * 7919 + r.n * 104729) >>> 0, rnd = seeded(seed);
  const rare = rnd() < ROOT.rareChance;
  const fams = Object.keys(FAMILIES);
  const family = rnd() < 0.5 ? loc.family : fams[Math.floor(rnd() * fams.length)];
  // It keeps up with you inside the server's layer band (like a rogue server), rare ones 2 levels up.
  const level = Math.max(loc.level || 1, SERVER.locationLevel(hackerLevel(s), loc.depth || 1)) + (rare ? ROOT.rareLevels : 0);
  const { grade, strain } = variantFor(family, level, loc.depth || 1, seed);
  const room = rooms.length ? rooms[Math.floor(rnd() * rooms.length)] : '/';
  const label = strain ? STRAINS[strain].name.toLowerCase() : FAMILIES[family].name.toLowerCase();
  r.proc = { alive: true, room, family, level, seed, grade, strain, rare, ...(rare ? { until: at + ROOT.rareMs } : {}), name: `${rare ? 'rare-' : ''}${label}-${String(1000 + (seed % 9000)).slice(-4)}` };
  emit(s, 'rotation', `${loc.name}: logs rotated. ${rare ? `A rare process (${r.proc.name}) is in ${room} for the next hour.` : `A new process is in ${room}.`}`, { location: loc.id, rare });
}

// A process down (combat.mjs calls this through hooks.processWon): access grows, a rare one pays more.
export function processWon(s, e) {
  const loc = (s.locations || []).find((l) => l.id === e.process);
  const p = loc?.root?.proc;
  if (!p) return;
  p.alive = false;
  const r = loc.root;
  r.cleared++;
  if (p.rare) { const more = rollDrop(s, { kind: 'rogue', family: p.family, strain: p.strain, rolls: ROOT.rareRolls }, p.level); if (more) addItem(s, more, 'Rare process: '); }
  while (r.level < ROOT.max && r.cleared >= ROOT.need[r.level + 1]) {
    r.level++;
    emit(s, 'root', `ROOT ${r.level} on ${loc.name}: ${ROOT_PERKS[r.level]}.`, { location: loc.id, root: r.level });
  }
}
export const ROOT_PERKS = { 1: 'taken over', 2: '/root opens, with a stash of code', 3: 'off your memory', 4: '+1 module port, harvester +25%', 5: 'firewall +3, harvester doubled' };
