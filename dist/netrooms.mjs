// The network's servers as room graphs (GAME_RULES.md "Runs: servers as rooms"): every server you connect to on the real save plays as
// the rooms of floorplan.mjs, kept on its location for good (loc.floorplan). Two shapes:
//   a server   a traced server (yours, a member's, a faction's): the R0 generator from its seed, its template's kind
//              (relay Relay, mailhub Mailhub, mirror Mirror, archive Archive, lab Lab), its size, its family's crew as
//              author, its floor (floors.mjs) the rooms' floor (no hunter on floor 1). Its guard post holds the vault's key; the vault
//              holds what its old vault did (the same files: gear, code, the trace record, credits, a
//              contract's file), into your pack; the Resident waits in /core. Beat it with the vault open and the
//              server is yours: taken over (teal on the network map), its Core quiet for good.
//   wild       SPRAWL-00, a rogue server (Nest, Pit, Gauntlet), a lair, KESSLER-FARM-00, an occupied server: every
//              room a fight, each one a folder of the old server (room.path0), so its spawns (run.mjs zoneSpawns,
//              rogue.mjs rogueSpawns, the farm's, network.mjs lairSpawns) keep their timers, bounties, bosses and
//              crew rules. SPRAWL-00: five rooms of strays and RELAY-KING's Core (from level 3, 30 minutes). The farm:
//              its packs and its three crew bosses, the ledger a vault that opens once the Foreman and the Heatsink
//              are down.
// A rogue server (Nest, Pit, Gauntlet: rogue.mjs inRuns) is laid out as a tree of rooms from its seed (rogueGraph): its
// folders' fight rooms and 2 to 4 quiet rooms woven in (Empty, and Stash: a few credits), at least one of them between
// the entry and a fight. It runs in clears (rogue.mjs): the full clear jacks you out and reboots it. Each run rolls once
// for the Exfil (CONFIG.exfil, on your own cooldown), a loot mob smuggling a stolen archive out, that runs from you
// (floorplan.mjs).
// Root (2.8) counts respawned fight rooms you clear on a server you hold: Root 2 after 5, 3 after 15, 4 after 30, 5
// after 50 (root.mjs ROOT.need). Root 2 adds a stash room by the Core, Root 4 one more socket room.
// Sockets (R2, sockets.mjs): a traced server's socket rooms (by size, +1 Backbone, +1 Root 4, +1 in a Grid consortium);
// a server you hold has its Core as its core socket. A Resident's first fall pays a protocol, and Mapped credits. A run on rooms: s.run.rooms, Signal is the
// run's, the pack the run's files (run.mjs bank). The save migration (v39) builds every found server's rooms.
import { hooks, emit, warn, active, hackerLevel, maxSignal, disconnect, gainXp, xpFor, deedXpFor, addItem, findLocation, roomKill, classOf, gainCode, rollDrop, uniqueFrom, rand, setDrop, fxPct, guardedUnique } from './combat.mjs';
import { setCredits } from './sets.mjs';
import { PUZZLES } from './puzzles.mjs';
import { CONFIG, BOSSES, FAMILIES, GUARDS, ROOM_FAMILIES, QUIRKS, layerOf } from './data.mjs';
import { seeded, MATERIALS, codeOf, rollItem, LOOT } from './gear.mjs';
import { crewOf, factionAuthor, AUTHORS } from './authors.mjs';
import * as FP from './floorplan.mjs';
import { AUTHOR_FAMILIES, familyName } from './families.mjs';
import { zoneOf, zoneRooms } from './zone.mjs';
import { ROGUE, FARM, rogueRooms, rogueSpawns, rogueKill, relocks, clock, inRuns } from './rogue.mjs';
import { lairOpen, NETWORK } from './network.mjs';
import { sizeOf } from './sockets.mjs';
import { SPECIAL, SPECIALS, specialsOf, hasSpecial, armoredAt } from './specials.mjs';
import { gainComponents } from './salvage.mjs';
import { consortiumSockets } from './consortium.mjs';
import { owned, rootOf, ROOT, ROOT_PERKS } from './root.mjs';
import { contractTakeover, contractRooms, contractMapped, contractConnect, contractInstall, contractStood, contractExfil, payloadFor, roomMarks, jobsOn } from './mail.mjs';
import { giveScript, rollScript } from './scripts.mjs';
import { itemLabel, uniqueItem } from './gear.mjs';
import { strikeServer, clearedFor } from './factions.mjs';
import { traceNear, hiddenLead, HIDDEN } from './hidden.mjs';
import { hiddenNear } from './floors.mjs';
import { zoneSpawns, zoneCleared, kingOpen, spawnFight, levelOf, layoutOf, fileInfo, residentLevel, RESIDENT, bank, KING_ROOM, packGain, peopleIn, scanButton } from './run.mjs';
import { threadsConnect, threadsMoved, threadsStood, threadVerb, tempCoreOpen, tempKilled, threadsRestore } from './threads.mjs';

export const KIND_OF = FP.KIND_OF;
export const NET = {
  hoard: 1.5, // caches pay this much more on a Hoard
  quiet: [2, 4], // a rogue server's quiet rooms (Empty and Stash), from its seed
  purseCode: 0.2, // a Stash's 1 code of the server's family, one time in five
  wildXp: 1, // a wild room's kill: a room kill (ROOMS.xp.room), as a traced server's
  stash: 120, // Root 2's stash refills every two hours (minutes)
  mapped: (L) => 30 + 5 * L, // Mapped's credits, at the server's level
};
const now = () => clock();
const isWild = (loc) => !!(loc?.zone || loc?.rogue);
// The location a server's rooms belong to.
export const locOf = (s, R = s.rooms) => (R?.world ? (R.loc === CONFIG.zone.id ? zoneOf(s) : findLocation(s, R.loc)) : null);
// Who writes a traced server: its faction's author, else its family's crew (combat.mjs placeAuthor's rule).
export const authorOf = (loc) => (loc.faction ? factionAuthor(loc.faction) ?? crewOf(loc.family) : crewOf(loc.family)) || 'tollgate';
// A family's lineage: the old three a new body's code and leads count as (a Trojan's are a worm's).
export const lineageOf = (f) => (FAMILIES[f] ? f : MATERIALS[ROOM_FAMILIES[f]?.code]?.family || 'ransomware');

// ---------- building a server's rooms ----------
// A location's rooms, built the first time anything asks (and by the save migration).
export function roomsFor(s, loc) {
  if (!loc) return null;
  if (!loc.floorplan) loc.floorplan = build(s, loc);
  return loc.floorplan;
}
hooks.roomsFor = roomsFor; // a contract aimed at a room or a vault reads the server's rooms (mail.mjs)
function build(s, loc) {
  const name = loc.name, base = { world: true, loc: loc.id, name, speed: 1 };
  if (!isWild(loc)) {
    const kind = KIND_OF[loc.template] || 'Relay', author = authorOf(loc), level = levelOf(loc), floor = loc.depth || 1, size = sizeOf(loc).id;
    const graph = FP.generate(loc.seed || 1, { size, kind, level, floor, author: AUTHOR_FAMILIES[author] ? author : 'tollgate', sockets: socketsFor(loc, size) });
    placePuzzles(loc, graph, size);
    placeQuirkRoom(loc, graph);
    if (hasSpecial(loc, 'stable')) FP.addRestRoom(graph); // a Stable server's rest room (specials.mjs)
    return FP.newRooms(s, { ...base, seed: loc.seed || 1, size, kind, level, floor, author: AUTHOR_FAMILIES[author] ? author : 'tollgate', graph, type: 'server', code: codeOf(loc.family) || 'cipher' });
  }
  const graph = loc.zone ? sprawlGraph() : loc.farm ? farmGraph() : wildGraph(loc);
  return FP.newRooms(s, { ...base, seed: loc.seed || 1, size: 'small', kind: 'Relay', level: loc.level || 1, floor: loc.depth || 1, author: 'tollgate', graph, type: 'wild' });
}
// A traced server's puzzle rooms (9.11, floorplan.mjs addPuzzles): one or two from its seed, Quarantine leaning to a
// Worm-family server, the chase only beside a Tracker's den. SPRAWL-00, rogue servers, lairs and the farm have none.
const wormy = (loc) => lineageOf(loc.family) === 'worm';
export function placePuzzles(loc, g, size = sizeOf(loc).id) {
  if (!g || g.puzzles != null) return [];
  return FP.addPuzzles(g, FP.puzzleKinds(g, loc.seed || 1, { size, worm: wormy(loc) }), loc.seed || 1, ['cascade', 'sweep', 'quarantine']);
}
// A traced server's quirk room (floorplan.mjs addNest, addSecret), from its seed: a Worm server's nest (the Nest
// quirk), a Ghostroot server's hidden room (Hidden). g.quirks marks it done (also an older save's graph:
// quirkRoomsRestore).
export function placeQuirkRoom(loc, g) {
  if (!g || g.quirks != null) return null;
  const room = loc.quirk === 'nest' ? FP.addNest(g, loc.seed || 1) : loc.quirk === 'hidden' ? FP.addSecret(g, loc.seed || 1) : null;
  g.quirks = room ? 1 : 0;
  return room;
}
// A traced server's socket rooms: by its size, one more on a Backbone server (Root 4's and Grid's are rooms added later).
const socketsFor = (loc, size = sizeOf(loc).id) => (FP.ROOMS.sockets[size] || 1) + (hasSpecial(loc, 'backbone') ? 1 : 0);
const link = (g, a, b) => g.links.push([a, b]);
function graphOf(list, links, { core = null, vaults = [], spine = [] } = {}) {
  const g = { rooms: {}, links: [], hops: [], loops: [], entry: 'r0', core, vaults, spine };
  for (const x of list) g.rooms[x.id] = { depth: 0, seed: ((x.seed ?? 1) * 7919 + Number(x.id.slice(1)) * 104729) >>> 0, ...x };
  for (const [a, b] of links) link(g, a, b);
  return FP.nameRooms(g);
}
// A wild server's rooms are its folders, linked as the folder tree: the entry is /, each folder a room next to its
// parent (SPRAWL-00's /var/log beside /var, RELAY-KING's /net/relay beside /net), so `cd var` then `cd log` walk it as
// they always did. kinds: a folder's room kind (process unless named), core: the Core's folder, vaults: the vaults'.
const SLOTS = [[1, 0], [0, -1], [0, 1], [-1, 0], [1, -1], [1, 1], [-1, -1], [-1, 1], [2, 0], [0, -2], [0, 2], [-2, 0]];
export function treeGraph(paths, { core = null, vaults = [], kinds = {}, labels = {}, seed = 1 } = {}) {
  const all = [...paths].sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
  const list = [{ id: 'r0', kind: 'entry', x: 0, y: 0, path0: '/' }], links = [], idOf = { '/': 'r0' }, taken = new Set(['0,0']);
  const free = (x, y) => !taken.has(`${x},${y}`);
  for (const [n, path] of all.entries()) {
    const parent = path.slice(0, path.lastIndexOf('/')) || '/', pid = idOf[parent] ?? 'r0', P = list.find((x) => x.id === pid);
    // The root's folders around the entry; a subfolder outward from its parent, else the nearest free cell.
    let at = null;
    if (pid === 'r0') at = SLOTS.find(([x, y]) => free(x, y));
    else {
      const dx = Math.sign(P.x), dy = Math.sign(P.y);
      at = [[P.x + (dx || 1), P.y], [P.x + dx, P.y + (dy || 1)], [P.x, P.y + (dy || 1)], [P.x, P.y - (dy || 1)], [P.x + (dx || 1), P.y + 1], [P.x + (dx || 1), P.y - 1]].find(([x, y]) => (x || y) && free(x, y));
    }
    for (let r = 2; !at && r < 6; r++) for (let x = -r; x <= r && !at; x++) for (let y = -r; y <= r && !at; y++) if (free(x, y)) at = [x, y];
    const id = `r${n + 1}`;
    taken.add(`${at[0]},${at[1]}`);
    idOf[path] = id;
    const kind = path === core ? 'core' : vaults.includes(path) ? 'vault' : kinds[path] || 'process';
    list.push({ id, kind, x: at[0], y: at[1], path0: path, seed, label: labels[path] || null, ...(kind === 'vault' ? { farm: true } : { wild: true }) }); // named for what it is (Process 2, Core); its folder (path0) still answers cd var
    links.push([pid, id]);
  }
  const spine = [];
  for (let p = core; p; p = p === '/' ? null : p.slice(0, p.lastIndexOf('/')) || '/') spine.unshift(idOf[p]);
  return graphOf(list, links, { core: core ? idOf[core] : null, vaults: vaults.map((v) => idOf[v]).filter(Boolean), spine: core ? spine : ['r0'] });
}
// SPRAWL-00: its six folders, RELAY-KING's /net/relay the Core.
export const sprawlGraph = () => treeGraph(zoneRooms(), { core: KING_ROOM });
// A SPRAWL-00 folder's room by its name, for words about where someone is (presence.mjs).
let sprawlNames = null;
hooks.sprawlRoomName = (folder) => (sprawlNames ||= Object.fromEntries(Object.values(sprawlGraph().rooms).map((r) => [r.path0, r.path])))[folder];
// KESSLER-FARM-00: the intake and cooling packs and their bosses (the Foreman, the Heatsink: crew boss rooms), the
// ledger a vault, and the Coldwallet past it.
export const farmGraph = () => treeGraph(['/ledger', ...Object.keys(FARM.rooms)], { core: '/ledger/core', vaults: ['/ledger'], kinds: Object.fromEntries(Object.entries(FARM.rooms).map(([p, d]) => [p, d.boss ? 'boss' : 'elite'])) });
// A lair or an occupied server: its folders (a lair's /core its Core). A rogue server that runs in clears: rogueGraph.
export const wildGraph = (loc) => (inRuns(loc) ? rogueGraph(loc) : treeGraph(rogueRooms(loc), { core: loc.lair ? '/core' : null, seed: loc.seed || 1 }));
// A rogue server's rooms (Nest, Pit, Gauntlet), from its seed: a tree on the grid (straight links, nothing crossing) a few
// rooms deep, its folders' fight rooms (r1… in the folder order treeGraph gives them, so an old save's rooms keep their
// ids) and 2 to 4 quiet rooms (Empty and Stash) woven in: at least one between the entry and a fight, so routes matter.
const isQuiet = (r) => r.kind === 'empty' || r.kind === 'purse';
export function rogueGraph(loc) {
  const folders = [...rogueRooms(loc)].sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b));
  for (let t = 0; t < 80; t++) { const g = tryRogue(loc, folders, t); if (g) return g; }
  throw new Error('No rogue graph for seed ' + loc.seed);
}
function tryRogue(loc, folders, attempt) {
  const r = seeded((((loc.seed || 1) * 7331 + attempt * 104729 + 17) >>> 0) || 1);
  const F = folders.length, Q = NET.quiet[0] + Math.floor(r() * (NET.quiet[1] - NET.quiet[0] + 1)), N = 1 + F + Q;
  const cells = [{ x: 0, y: 0, parent: null, depth: 0 }], taken = new Set(['0,0']), deg = [0];
  for (let i = 1; i < N; i++) {
    const opts = [];
    cells.forEach((c, j) => { if (deg[j] >= (j ? 3 : 4) || c.depth >= 4) return; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = c.x + dx, y = c.y + dy; if (Math.abs(x) <= 3 && Math.abs(y) <= 2 && !taken.has(`${x},${y}`)) opts.push({ j, x, y, w: (1 + c.depth * 0.6) / (1 + deg[j]) }); } });
    if (!opts.length) return null;
    let k = r() * opts.reduce((a, o) => a + o.w, 0), o = opts[0];
    for (const c of opts) if ((k -= c.w) < 0) { o = c; break; }
    cells.push({ x: o.x, y: o.y, parent: o.j, depth: cells[o.j].depth + 1 }); taken.add(`${o.x},${o.y}`); deg[o.j]++; deg.push(1);
  }
  if (Math.max(...cells.map((c) => c.depth)) < 3 || deg[0] < 2) return null;
  // The quiet rooms: an Empty first where the tree branches or runs on (a room between), then the rest by the dice.
  const kids = (j) => cells.map((c, i) => (c.parent === j ? i : -1)).filter((i) => i >= 0);
  const inner = cells.map((c, i) => i).filter((i) => i && kids(i).length), quiet = new Map();
  if (!inner.length) return null;
  const pick = (xs) => xs[Math.floor(r() * xs.length)];
  quiet.set(pick(inner), 'empty');
  const P = Q === 2 ? 1 : 1 + (r() < 0.5 ? 1 : 0);
  while (quiet.size < Q) { const i = 1 + Math.floor(r() * (N - 1)); if (!quiet.has(i)) quiet.set(i, [...quiet.values()].filter((k) => k === 'purse').length < P ? 'purse' : 'empty'); }
  // Between: a quiet room with a fight beyond it. Never a quiet room at the end of a quiet branch only.
  if (![...quiet.keys()].some((i) => kids(i).some((c) => !quiet.has(c)))) return null;
  if ([...quiet.keys()].some((i) => !kids(i).length && quiet.has(cells[i].parent) && !kids(cells[i].parent).some((c) => !quiet.has(c)))) return null;
  // Ids: the fight rooms r1… in breadth-first order take the folders in order; the quiet rooms after them.
  const order = [0], ids = { 0: 'r0' };
  for (let q = 0; q < order.length; q++) for (const c of kids(order[q])) order.push(c);
  let f = 0, n = F;
  const list = [{ id: 'r0', kind: 'entry', x: 0, y: 0, path0: '/' }];
  for (const i of order.slice(1)) {
    if (quiet.has(i)) { ids[i] = `r${++n}`; list.push({ id: ids[i], kind: quiet.get(i), x: cells[i].x, y: cells[i].y, seed: loc.seed || 1 }); }
    else { ids[i] = `r${++f}`; list.push({ id: ids[i], kind: 'process', x: cells[i].x, y: cells[i].y, path0: folders[f - 1], seed: loc.seed || 1, label: null, wild: true }); }
  }
  const links = order.slice(1).map((i) => [ids[cells[i].parent], ids[i]]);
  const g = graphOf(list.sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1))), links, { spine: ['r0'] });
  g.quiet = 1; // laid out as a rogue server's rooms (the save migration looks for it)
  return g;
}

// ---------- a wild room's spawn ----------
// Its folder's spawn now (refilled first), or null.
function spawnsOf(s, loc) {
  if (loc.zone) return zoneSpawns(s);
  return rogueSpawns(s, loc);
}
export function spawnOf(s, room, loc = locOf(s)) {
  if (!room?.path0 || !loc) return null;
  return spawnsOf(s, loc)[room.path0] || null;
}

// ---------- connecting ----------
// The run starts on a server's rooms (run.mjs connect, after its checks): the entry, the visit, the run's Signal.
export function enterRooms(s, loc, { signal } = {}) {
  const R = roomsFor(s, loc);
  if (isWild(loc)) spawnsOf(s, loc);
  if (!isWild(loc)) { R.level = levelOf(loc); extraSockets(s, loc); }
  s.run = { loc: loc.id, rooms: true, cwd: R.graph.rooms[R.graph.entry].path, integrity: signal, max: maxSignal(s), pack: [], visited: [] };
  if (s.occupation?.id === loc.id) { s.run.max = maxSignal(s); s.run.integrity = Math.min(s.run.max, s.signal ?? s.run.max); } // your own occupied server: no reboot sickness in it
  s.run.crew = Object.fromEntries((s.crewSim || []).map((x) => [x.name, { cwd: s.run.cwd, link: 'you' }]));
  // A key cracker on this server (hidden.mjs): you walk in holding its vault's key, this visit.
  const keys = loc.passwordKnown && R.graph.vaults[0] && !FP.opened(s, R.graph.rooms[R.graph.vaults[0]]) ? [R.graph.vaults[0]] : [];
  threadsConnect(s, loc); // threads (threads.mjs): this server's start pinned, a file in transit at its entry, a temporary server grown
  FP.enter(s, now(), { keys });
  if (keys.length) R.visit.cracked = true;
  contractConnect(s, loc); // an Install job's item goes in your pack on its server (mail.mjs)
  return R;
}
// The run ends (floorplan.mjs jackOut or disconnected): out banks the pack (run.mjs bank) and sends you home; lost
// is a disconnect (the pack lost, combat.mjs disconnect: Deadman's Switch and all).
WORLD_hook('leave', (s, how, why) => {
  const at = locOf(s, roomsOfRun(s));
  if (inRuns(at)) (at.rogueRun ||= { n: 1, at: now() }).leftAt = now(); // a run left half done reboots on its own later (rogue.mjs)
  if (how === 'lost') return disconnect(s, 'Signal lost');
  const loc = at;
  bank(s, loc, why);
});
function roomsOfRun(s) { const loc = s.run && (s.run.loc === CONFIG.zone.id ? zoneOf(s) : findLocation(s, s.run.loc)); return loc?.floorplan || null; }
function WORLD_hook(name, fn) { FP.WORLD[name] = fn; }

// ---------- what's up, and when it comes back ----------
WORLD_hook('up', (s, room, at) => {
  const R = s.rooms, loc = locOf(s);
  if (room.wild) {
    const sp = spawnOf(s, room, loc);
    if (!sp?.alive) return false;
    return !(R.at === room.id && sp.bornAt != null && sp.bornAt > (R.inSince ?? 0)); // it waits while you stand in it
  }
  if (room.kind === 'core' && (loc?.takenOver || loc?.member || loc?.trunk)) return false; // quiet: yours, or a member's
  return undefined;
});
WORLD_hook('back', (s, room) => { if (!room.wild) return undefined; const sp = spawnOf(s, room); return sp && !sp.alive ? sp.respawnAt ?? null : null; });
WORLD_hook('from', (s, room) => { if (!room.wild) return undefined; const sp = spawnOf(s, room); return sp && !sp.alive ? sp.diedAt ?? (sp.respawnAt - 180000) : null; });
// A server you hold is on the farm timers like a Mapped one (FP.farmed).
WORLD_hook('held', (s) => !!locOf(s)?.takenOver);
// A server's special in its fights (specials.mjs): Hostile's hits and XP (floorplan.mjs fight).
WORLD_hook('tune', (s) => (hasSpecial(locOf(s), 'hostile') ? { hits: SPECIAL.hits, xp: SPECIAL.xp } : null));
WORLD_hook('level', (s) => { const loc = locOf(s); return loc ? levelOf(loc) : undefined; });
// A server you hold: its Core is its core socket (6.1). (Core programs come with R4; until then it takes any program.)
WORLD_hook('coreSocket', (s) => { const loc = locOf(s); return !!loc && owned(loc) && s.rooms?.type === 'server'; });
// A Grid socket outside a Grid consortium: its program waits, idle.
WORLD_hook('socketOff', (s, room) => !!room && room.extra === 'grid' && !consortiumSockets(s));
WORLD_hook('rare', (s) => { const loc = locOf(s); return (rootOf(loc) >= 5 ? 2 : 1) * (hasSpecial(loc, 'legacy') ? 2 : 1); });
WORLD_hook('coreOpen', (s) => {
  const loc = locOf(s), R = s.rooms;
  if (!loc) return undefined;
  if (loc.zone) return kingOpen(s, loc); // RELAY-KING holds the Core from level 3 and SPRAWL-00's first reboot
  if (loc.farm) return !!loc.state?.unlocked?.['/ledger'];
  if (loc.lair) return lairOpen(s, loc);
  if (loc.temp) return tempCoreOpen(loc); // a temporary server's kill switch: once you know it (threads.mjs)
  if (isWild(loc)) return true;
  return R.graph.vaults[0] ? !!R.opened[R.graph.vaults[0]] : true;
});
// The farm's ledger is open while its keeper's away (it locks again when the Coldwallet is back).
WORLD_hook('vaultOpen', (s, room) => (room.farm ? !!locOf(s)?.state?.unlocked?.['/ledger'] : undefined));
WORLD_hook('canOpen', (s, room) => {
  if (!room.farm) return undefined;
  const loc = locOf(s), down = (p) => { const sp = loc.spawns?.[p]; return !!sp && !sp.alive; };
  if (down('/intake/racks') && down('/cooling/loop')) { (loc.state.unlocked ||= {})['/ledger'] = true; return true; }
  room.locked = 'The ledger opens on the Foreman\'s badge word and the Heatsink\'s cycle tag. Beat them both first.';
  return false;
});

// ---------- the fights ----------
WORLD_hook('fight', (s, room, as) => {
  const loc = locOf(s), R = s.rooms;
  if (!loc) return undefined;
  if (room.wild) {
    const sp = spawnOf(s, room, loc);
    if (!sp) return { key: 'random', seed: room.seed, opts: { mode: 'run', room: room.path, level: hackerLevel(s), family: 'worm', zone: true }, size: 'process', name: null, level: hackerLevel(s), family: 'worm', wild: true };
    const [key, seed, opts] = spawnFight(s, loc, sp, room.path0);
    const crew = !!(sp.boss && BOSSES[sp.boss]?.raid) || loc.farm;
    const fam = sp.family;
    return { key, seed, opts: { ...opts, room: room.path, author: loc.zone ? null : opts.author }, size: crew ? 'raw' : sp.boss ? 'boss' : sp.elite ? 'elite' : loc.zone ? 'stray' : 'process', name: sp.boss || sp.bounty ? sp.name.toUpperCase?.() === sp.name ? sp.name : opts.name || sp.name : null, level: sp.level, family: fam, elite: !!sp.elite, boss: sp.boss || null, bounty: !!sp.bounty, author: loc.zone ? null : authorOf(loc), xp: NET.wildXp, wild: true };
  }
  if (room.kind === 'core' && R.type === 'server') {
    const level = residentLevel(loc, now()), seed = (((loc.seed || 1) * 7 + 31) >>> 0) + (R.spawns[room.id] || 0) * 7919;
    // Guarded (specials.mjs): a crew elite holds the Core in the Resident's place, as a Pit's (rogue.mjs).
    if (hasSpecial(loc, 'guarded') && !loc.temp) { const name = `ELITE · ${loc.name}`; return { key: 'random', seed, opts: { mode: 'run', room: room.path, level, family: loc.family, elite: true, mutation: armoredAt(loc) ? 'armored' : null, name, author: R.author }, size: 'elite', name, level, family: loc.family, elite: true, author: R.author }; }
    const name = `${loc.temp ? 'KILL SWITCH' : 'RESIDENT'} · ${loc.name}`;
    return { key: 'random', seed, opts: { mode: 'run', room: room.path, level, family: loc.family, boss: 'resident', ...(loc.starter ? { bossHp: RESIDENT.starterHp } : {}), mutation: armoredAt(loc) ? 'armored' : null, name, author: R.author }, size: 'boss', name, level, family: loc.family, author: R.author };
  }
  if (room.kind === 'guard' && (loc.quirk === 'hoard' || armoredAt(loc))) {
    const rare = !as && !!R.rare[room.id], level = levelOf(loc) + (rare ? FP.ROOMS.rareLevel : 0); // a rare spawn two levels up, as any guard post's
    return { key: room.guard, seed: ((room.seed + (R.spawns[room.id] || 0) * 7919) >>> 0) || 1, opts: { mode: 'run', room: room.path, level, mutation: 'armored' }, size: 'guard', name: GUARDS[room.guard].name.toUpperCase(), level, family: room.guard, author: GUARDS[room.guard].ice ? 'kestrel' : null, rare };
  }
  return undefined;
});

// ---------- after a fight ----------
WORLD_hook('drops', () => {}); // what a kill drops comes with what it pays (won)
WORLD_hook('won', (s, room, e, { first = false, mirror = false, rare = false } = {}) => {
  const loc = locOf(s), R = s.rooms;
  if (!loc) return;
  // A first clear on a server traces the ? servers linked to it on its floor (floors.mjs, GAME_RULES.md "The hidden network").
  if (first && !loc.zone && !loc.member) traceNear(s, loc, HIDDEN.firstClear, `${room.path} cleared: `);
  if (room.wild) return wildWon(s, loc, room, e);
  const guard = room.kind === 'guard' || room.kind === 'elite' || room.kind === 'core' || mirror || !!e.virus.elite;
  roomKill(s, e, { pack: true, guard, family: lineageOf(e.virus.family), loc, rare });
  if (room.kind === 'guard') clearedFor(s, loc); // a faction's server: they notice (factions.mjs)
  if (e.virus.elite && seeded((e.seed * 31 + R.stats.fights) >>> 0)() < 0.25) giveScript(s, rollScript(seeded((e.seed * 17 + 3) >>> 0)), 'The elite carried: ');
  if (room.kind === 'core') { if (loc.temp) tempKilled(s, loc); else takeover(s, loc, room); } // a temporary server's kill switch: dark for good (threads.mjs)
  // Root (2.8): a respawned fight room cleared on a server you hold.
  if (!first && owned(loc) && FP.FIGHTS.includes(room.kind) && room.kind !== 'core') rootClear(s, loc, hasSpecial(loc, 'hardened') ? SPECIAL.root : 1); // Hardened: twice as fast
});
WORLD_hook('lost', (s, room, e) => {
  const loc = locOf(s);
  if (!loc) return;
  if (room.wild) return wildLost(s, loc, room, e);
  // A Resident that beats you grows: a level more for 6 hours, up to three.
  if (room.kind === 'core' && e.virus.boss === 'resident') {
    const t = now(), had = loc.resident && t - loc.resident.at < RESIDENT.lossMs ? loc.resident.bonus : 0;
    loc.resident = { bonus: Math.min(RESIDENT.maxLoss, had + 1), at: t };
    emit(s, 'warning', `The Resident of ${loc.name} beat you. It's a level stronger for the next 6 hours.`, { location: loc.id });
  }
});
// The Resident down with the vault open: the server is yours (teal on the map), its Core quiet for good.
function takeover(s, loc, room) {
  const R = s.rooms;
  if (loc.member || loc.trunk || loc.takenOver) return;
  loc.resident = null; loc.regrow = null;
  strikeServer(s, loc, 'takeover');
  contractTakeover(s, loc); // takenOver, its XP and the event (mail.mjs)
  setDrop(s, { kind: 'takeover' }, levelOf(loc), loc.name, { pack: true, path: `${room.path}/#set-${s.serial}` }); // Hot Spare's pieces (sets.mjs)
  loc.root ||= { level: 1, cleared: 0, n: 0, nextAt: null, proc: null };
  R.held = now();
  // Its Resident's first fall: a protocol, Tuned or better, at the server's level.
  if (!loc.residentFell) { loc.residentFell = now(); const r = seeded(((loc.seed || 1) * 53 + 11) >>> 0); addItem(s, rollItem(r, { level: levelOf(loc), rarity: r() < LOOT.quest ? 'custom' : 'tuned' }), `${loc.name}'s Resident carried `); }
}
// Root: respawned fight rooms cleared on a server you hold climb its pips (root.mjs ROOT.need).
export function rootClear(s, loc, n = 1) {
  const r = (loc.root ||= { level: 1, cleared: 0 });
  r.cleared = (r.cleared || 0) + n;
  while (r.level < ROOT.max && r.cleared >= ROOT.need[r.level + 1]) {
    r.level++;
    emit(s, 'root', `ROOT ${r.level} on ${loc.name}: ${ROOT_PERKS[r.level]}.`, { location: loc.id, root: r.level });
    gainXp(s, deedXpFor(s, loc.level || 1, ROOT.levelXp), `Root ${r.level} on ${loc.name}`, 'build');
    if (r.level >= 2) addStash(loc);
    if (r.level >= 4) addRootSocket(loc);
  }
}
// Root 4: one more socket room, beside the Core, open from the start (it replaced the old building slot).
export function addRootSocket(loc) {
  const R = loc.floorplan, room = R?.graph && FP.addSocketRoom(R.graph, 'root');
  if (!room) return null;
  R.cleared[room.id] = now(); R.seen[room.id] ||= 'shape';
  return room;
}
// A Grid consortium's socket room on every traced server (offline when you're not in one: WORLD.socketOff).
function extraSockets(s, loc) {
  const R = loc.floorplan;
  if (!R?.graph || R.type !== 'server') return;
  if (consortiumSockets(s) && FP.addSocketRoom(R.graph, 'grid')) { const room = Object.values(R.graph.rooms).find((x) => x.extra === 'grid'); R.cleared[room.id] = now(); R.seen[room.id] ||= 'shape'; }
}
// Root 2: a stash room beside the Core (the old /root), its code refilled every two hours.
export function addStash(loc) {
  const R = loc.floorplan, g = R?.graph;
  if (!g || !g.core || Object.values(g.rooms).some((x) => x.kind === 'stash')) return;
  const c = g.rooms[g.core], taken = new Set(Object.values(g.rooms).map((x) => `${x.x},${x.y}`));
  const at = [[c.x + 1, c.y], [c.x, c.y - 1], [c.x, c.y + 1]].find(([x, y]) => !taken.has(`${x},${y}`));
  if (!at) return;
  const id = `r${Math.max(...Object.keys(g.rooms).map((k) => Number(k.slice(1)))) + 1}`;
  g.rooms[id] = { id, kind: 'stash', x: at[0], y: at[1], depth: 0, seed: ((loc.seed || 1) * 131) >>> 0, label: 'Stash' };
  g.links.push([g.core, id]);
  g.rooms[id].path = 'Stash'; g.rooms[id].dir = 'stash';
  R.seen[id] ||= 'shape'; // a new room: unknown until you walk in
}

// A wild room's kill: its folder goes quiet on its own timer (rogue.mjs rogueKill: a Pit's second drop, a Gauntlet's
// bonus, the farm's regroup and trophies, an occupation cleared), and the kill pays as SPRAWL's and the rogue
// servers' always did: straight into your bank. A named target (a contract's bounty) is done.
function wildWon(s, loc, room, e) {
  const t = now(), sp = loc.zone ? zoneOf(s).spawns[room.path0] : loc.spawns?.[room.path0];
  const named = sp?.bounty ? sp.name : null;
  const ctx = roomKill(s, e, { wild: true, sprawl: !!loc.zone, bounty: named, family: lineageOf(e.virus.family), loc, guard: !!(e.virus.elite || e.virus.boss) });
  if (sp) { sp.diedAt = t; if (named) delete sp.bounty; }
  if (loc.zone) {
    if (sp) { sp.alive = false; sp.respawnAt = sp.boss ? t + CONFIG.zone.bossRespawnMs : null; } // a stray: down until the clear (run.mjs zoneSpawns)
    if (zoneCleared(loc) && s.run) { FP.jackOut(s, 'SERVER CLEARED. Reboot in progress.'); loc.rebootAt = loc.lockUntil = t + CONFIG.zone.rebootMs; } // offline a moment, then every stray back
  }
  else if (rogueKill(s, loc, room.path0, t, () => { const more = ctx?.more?.(); if (more) addItem(s, more, 'The Pit gives up more: '); }) && s.run) {
    // The full clear: the server reboots. You're out with your pack, it's offline a minute, then every room is back fresh.
    FP.jackOut(s, 'SERVER CLEARED. Reboot in progress.');
    if (!loc.member && HIDDEN.opens) for (const n of hiddenNear(s, loc)) hiddenLead(s, n, 100 - n.lead, 'Full clear: '); // a full clear opens its links, as Mapped does
    loc.lockUntil = t + ROGUE.rebootMs;
  }
}
// A wild room's loss: a named target or a boss stays put (a named one that beat you twice wears down to v1); a Pit
// elite that beat you moves on.
function wildLost(s, loc, room, e) {
  const t = now(), sp = loc.zone ? zoneOf(s).spawns[room.path0] : loc.spawns?.[room.path0];
  if (!sp) return;
  if ((sp.bounty || sp.boss) && (sp.losses = (sp.losses || 0) + 1) >= 2 && sp.grade > 1 && sp.bounty) { delete sp.grade; emit(s, 'info', `${sp.name} is worn down and drops back to v1.`); }
  if (!loc.zone && !loc.farm && sp.elite && sp.alive && !sp.boss) { sp.alive = false; sp.diedAt = t; sp.respawnAt = t + 30 * 60000; emit(s, 'info', `${sp.name} moved on. The room fills again in about 30 minutes.`); }
}

// ---------- a rogue server's Stash and its Exfil ----------
// A Stash (a quiet room): a few credits straight into your bank, as a wild server's kills pay, and 1 code one time in five.
WORLD_hook('purse', (s, room) => {
  const loc = locOf(s), R = s.rooms, credits = FP.ROOMS.purse(loc?.level || 1), material = codeOf(loc?.family) || 'cipher';
  const code = seeded(((room.seed || 1) * 31 + (R.spawns[room.id] || 0) * 7919) >>> 0)() < NET.purseCode ? 1 : 0;
  s.server.credits += credits;
  if (code) gainCode(s, { [material]: code }, 'Stash: ');
  return { credits, code, material: MATERIALS[material].name.toLowerCase() };
});
// The Exfil's roll: once a run on a rogue server that runs in clears (at its first connect), and never while your own
// cooldown runs (s.exfil, on your save: it blocks your Exfils on every rogue server, never anyone else's). The seed, or 0.
WORLD_hook('exfil', (s, t) => {
  const loc = locOf(s), M = CONFIG.exfil;
  if (!inRuns(loc) || !s.run) return 0;
  const rr = (loc.rogueRun ||= { n: 1, at: t }), c = (s.exfil ||= { at: null, n: 0 });
  if (rr.rolled) return 0; // one roll a run: reconnecting mid-run never rolls again
  rr.rolled = true;
  if (c.at != null && t < c.at + M.cooldownMs) return 0;
  const seed = (((loc.seed || 1) * 2654435761 + rr.n * 40503 + (c.n || 0) * 7919) >>> 0) || 1;
  if (seeded(seed)() >= M.chance) return 0;
  c.at = t; c.n = (c.n || 0) + 1; rr.exfil = seed;
  return seed;
});
// Its archive, recovered: CONFIG.exfil.credits Stashes' worth of credits and one item at the server's level (the best of two flat
// rolls, else a white: about twice a kill's blue chance, never a guaranteed blue, nothing else stacked on: no
// clean read or Pit roll), and now and then one of the server's uniques (its kind's and floor's, as its folders drop).
// A trash kill's odds (LOOT.odds.trash) and a sure white: plain loot, under a rare spawn's, by design.
WORLD_hook('exfilWon', (s, room, e) => {
  const loc = locOf(s), M = CONFIG.exfil, lvl = e.virus.level, credits = M.credits * FP.ROOMS.purse(loc.level || 1);
  const ctx = { kind: 'rogue', id: loc.rogue?.kind, layer: layerOf(loc.depth || 1), family: loc.family };
  s.server.credits += credits;
  let item = rollDrop(s, { ...ctx, rolls: M.rolls, flat: true }, lvl) || rollItem(() => rand(s), { level: lvl, rarity: 'stock' }); // always an item: a white unless the rolls found better
  if (rand(s) < M.unique) { const u = uniqueFrom(s, ctx, lvl); if (u) item = uniqueItem(u, lvl, () => rand(s)); }
  const got = item ? addItem(s, item, 'The archive: ') : null;
  emit(s, 'rooms-good', `The archive: +${credits} credits${got ? `, ${itemLabel(got)}` : ''}.`, { credits });
  contractExfil(s); // a Catch an Exfil job (mail.mjs)
});
// A contract's item installed in its room (an Install job, mail.mjs): undefined when you carry none for this server.
WORLD_hook('plant', (s, room, arg) => { const loc = locOf(s); return loc ? contractInstall(s, loc, room, arg) : undefined; });
// You stand in a room with nothing live in it: a no-rest map job counts the visit's rooms (mail.mjs).
WORLD_hook('stood', (s, room) => { const loc = locOf(s); if (loc) { contractStood(s, loc, s.rooms); threadsStood(s, loc, room); } }); // and a thread's goto (threads.mjs)
// Threads (threads.mjs): a file walking after each of your moves; talk, read and sweep in a thread's room.
WORLD_hook('moved', (s) => threadsMoved(s));
WORLD_hook('verb', (s, room, verb, arg) => { const loc = locOf(s); return loc ? threadVerb(s, loc, room, verb, arg) : undefined; });
hooks.threadsRestore = threadsRestore;

// ---------- what you take: into the pack ----------
const packFile = (s, f) => { s.run.pack.push(f); return f; };
// A puzzle room's pay (floorplan.mjs finishPuzzle): credits and code into the pack, like a cache's; components at once,
// of the server's own families.
WORLD_hook('puzzlePay', (s, room, { credits = 0, code = 0, parts = 0, material = 'cipher', won = false } = {}) => {
  const loc = locOf(s), n = s.serial;
  if (won) setDrop(s, { kind: 'puzzle', id: room.kind }, levelOf(loc), `the ${PUZZLES[room.kind]?.name || room.kind} board`, { pack: true, path: `${room.path}/#set-${n}` }); // Overtime's pieces (sets.mjs), a board won
  if (credits) packFile(s, { path: `${room.path}/#puzzle-${n}`, name: 'cache.dat', kind: 'credits', amount: credits });
  if (code) packFile(s, { path: `${room.path}/#puzzle-code-${n}`, name: `${material}.code`, kind: 'code', material, amount: code });
  if (parts) gainComponents(s, parts);
});
WORLD_hook('cache', (s, room, { credits, code, material }) => {
  const n = s.serial;
  packFile(s, { path: `${room.path}/#cache-${n}`, name: 'cache.dat', kind: 'credits', amount: credits });
  packFile(s, { path: `${room.path}/#code-${n}`, name: `${material}.code`, kind: 'code', material, amount: code });
});
WORLD_hook('cacheMult', (s) => { const loc = locOf(s); return (loc?.quirk === 'hoard' ? NET.hoard : 1) * setCredits(s, 'cache') * (1 + fxPct(s, 'cache%') / 100); }); // setCredits: Lantern Route, the Logbook (sets.mjs); cache%: Golden Image
WORLD_hook('packItem', (s, it) => {
  // An item already added to your stash (floorplan.mjs): it goes back out and into the pack, banked when you jack out.
  s.stash = s.stash.filter((x) => x.id !== it.id);
  packFile(s, { path: `vault/#item-${it.id}`, name: 'protocol.bin', kind: 'gear', size: '32k', item: it });
});
WORLD_hook('stash', (s, room) => {
  const loc = locOf(s), amount = ROOT.stash(loc.level || 1), material = codeOf(loc.family) || 'cipher';
  packFile(s, { path: `/root/stash-${s.serial}`, name: 'stash.gz', kind: 'code', material, amount });
  emit(s, 'rooms-good', `You take the stash: ${amount} ${MATERIALS[material].name.toLowerCase()}. It fills again in two hours.`);
});
// The vault: what this server's old vault held, file by file (run.mjs layoutOf, fileInfo), into the pack.
function vaultFiles(loc) {
  const lay = layoutOf(loc), path = Object.keys(lay).find((k) => lay[k].locked && !lay[k].drop);
  return path ? lay[path].files.map((f) => ({ dir: path, name: f })) : [];
}
function takeVault(s, loc) {
  const got = [];
  for (const { dir, name } of vaultFiles(loc)) {
    const full = `${dir}/${name}`, info = fileInfo(loc, dir, name);
    if (!info || ['text', 'trap', 'sweep'].includes(info.kind) || loc.state?.taken?.[full] || s.run.pack.some((f) => f.path === full)) continue;
    got.push(packFile(s, { path: full, name, ...info, ...(info.amount ? { amount: Math.round(info.amount * vaultMult(s, loc, info.kind)) } : {}), loc: loc.id }));
  }
  // Guarded (specials.mjs): one of its floor's uniques, once.
  if (hasSpecial(loc, 'guarded') && !loc.state?.taken?.['vault/#guarded'] && !s.run.pack.some((f) => f.path === 'vault/#guarded')) {
    const u = guardedUnique(s, loc.depth || 1, levelOf(loc));
    if (u) got.push(packFile(s, { path: 'vault/#guarded', name: 'protocol.bin', kind: 'gear', size: '32k', item: uniqueItem(u, levelOf(loc), () => rand(s)), loc: loc.id }));
  }
  return got;
}
// A vault file's pay: Lantern Route's credits (sets.mjs); a Hardened server's credits and code ×2, a Rich server's code ×2.
const vaultMult = (s, loc, kind) => (kind === 'credits' ? setCredits(s, 'vault') * (hasSpecial(loc, 'hardened') ? SPECIAL.vault : 1)
  : kind === 'code' ? (hasSpecial(loc, 'hardened') ? SPECIAL.vault : 1) * (hasSpecial(loc, 'rich') ? SPECIAL.code : 1) : 1);
const gainsOf = (files) => files.map((f) => packGain(f));
WORLD_hook('vault', (s, room) => {
  const loc = locOf(s), R = s.rooms;
  if (!loc || R.type !== 'server' || room.id !== R.graph.vaults[0]) return false;
  const got = takeVault(s, loc), n = got.length;
  emit(s, 'rooms-good', n ? `The vault: ${n} ${n === 1 ? 'file' : 'files'} into your pack.` : 'The vault is bare.', { gains: gainsOf(got) });
  setDrop(s, { kind: 'vault', floor: loc.depth || 1 }, levelOf(loc), `${loc.name}'s vault`, { pack: true, path: `vault/#set-${s.serial}` }); // Cold Storage's and Deep Archive's pieces (sets.mjs)
  if (loc.member) { R.cleared[R.graph.core] ||= now(); }
  return true;
});
WORLD_hook('pull', (s, room) => {
  const loc = locOf(s);
  if (!loc || s.rooms.type !== 'server') return 0;
  const got = takeVault(s, loc), n = got.length;
  if (n) emit(s, 'rooms-good', `${n} more ${n === 1 ? 'file' : 'files'} from the vault into your pack.`, { gains: gainsOf(got) });
  return n;
});

// Files left at a server's entry for you (a relay's route files, a contract's planted file): pull them there.
const entryFiles = (s, loc) => (loc?.extraFiles || []).filter((f) => f.dir === '/' && !loc.state?.taken?.['/' + f.name] && !s.run?.pack.some((x) => x.path === '/' + f.name));
WORLD_hook('entryPull', (s) => {
  const loc = locOf(s), files = entryFiles(s, loc);
  for (const f of files) { const info = fileInfo(loc, '/', f.name); if (info) packFile(s, { path: '/' + f.name, name: f.name, ...info, loc: loc.id }); }
  if (files.length) emit(s, 'rooms-good', `${files.length} ${files.length === 1 ? 'file' : 'files'} into your pack.`);
  return files.length;
});

// ---------- the page's words (floorplan-view.mjs) ----------
const RULES = {
  sprawl: { rule: 'Strays', text: 'Five rooms of strays at your level (to level 5) and RELAY-KING in the Core from level 3. A stray stays down until every room is cleared; then SPRAWL-00 reboots and they are all back. The Core opens after its first reboot, and RELAY-KING comes back 30 minutes after he falls.' },
  nest: { rule: 'Nest', text: ROGUE.kinds.nest.rule }, pit: { rule: 'Pit', text: ROGUE.kinds.pit.rule }, gauntlet: { rule: 'Gauntlet', text: 'Clear every fight room for a bonus cache.' },
  lair: { rule: 'Lair', text: 'The network\'s native boss holds the Core, back an hour after it falls.' },
  farm: { rule: 'Crew dungeon', text: 'Built for a crew. Three crew bosses; the ledger opens once the Foreman and the Heatsink are down.' },
};
const ruleOf = (loc) => (loc.zone ? RULES.sprawl : loc.farm ? RULES.farm : loc.lair ? RULES.lair : loc.rogue ? RULES[loc.rogue.kind] || RULES.nest : null);
FP.WORLD.view = {
  kind: (s) => { const loc = locOf(s); return ruleOf(loc) || undefined; },
  idLine: (s) => {
    const loc = locOf(s), R = s.rooms, r = ruleOf(loc);
    if (r) return `${r.rule} · lv ${loc.zone ? `1–${CONFIG.zone.maxLevel}` : levelOf(loc)}`;
    return `${FP.kindName(R.kind)} · lv ${levelOf(loc)}${loc.depth > 1 ? ` · floor ${loc.depth}` : ''}${rootOf(loc) ? ` · Root ${rootOf(loc)}` : ''}${loc.takenOver ? ' · yours' : ''}`;
  },
  idTip: (s) => {
    const loc = locOf(s), R = s.rooms, r = ruleOf(loc);
    if (r) return `${loc.name}: ${r.rule}.\n${r.text}${inRuns(loc) ? '\nCleared rooms stay down. Clear them all and it reboots: every room back fresh a minute later.' : ''}`;
    const by = (AUTHORS[R.author]?.name || R.author).toUpperCase(), sp = specialsOf(loc).map((id) => SPECIALS[id]), q = QUIRKS[loc.quirk];
    return `${loc.name}: a ${by} ${FP.kindName(R.kind)}, level ${levelOf(loc)}, ${R.size}.\n${FP.kindRule(R.kind)}${sp.map((x) => `\n${x.glyph} ${x.name}: ${x.rule}`).join('')}${q ? `\n${q.name}: ${q.rule}` : ''}${loc.takenOver ? '\nYours: its Core is quiet.' : ''}`;
  },
  sealed: (s) => { const loc = locOf(s); return loc?.zone ? (hackerLevel(s) < 3 ? 'RELAY-KING holds it from level 3, once SPRAWL-00 has rebooted.' : 'It opens when SPRAWL-00 reboots. Clear every room.') : loc?.farm ? 'Behind the ledger.' : loc?.lair ? `${BOSSES[loc.lair]?.name || 'Its boss'} holds it from level ${BOSSES[loc.lair]?.floor || 1}.` : undefined; },
  elite: (s, room) => { const sp = spawnOf(s, room); return !!(sp?.elite || sp?.bounty); },
  packLine: (s, f) => (f.kind === 'credits' ? `${f.amount} credits` : f.kind === 'code' ? `${f.amount} ${MATERIALS[f.material]?.name || f.material}` : f.kind === 'gear' ? itemLabel(f.item) : f.label || f.name),
  fightNote: (s, room) => { const sp = room.wild ? spawnOf(s, room) : null; return sp?.bounty ? 'A named target: a contract wants it.' : sp?.boss && BOSSES[sp.boss]?.raid ? 'A crew boss, sized for your crew.' : room.kind === 'core' && s.rooms.type === 'server' ? 'Beat it and the server is yours.' : ''; },
  vaultLeft: (s, room) => { const loc = locOf(s); if (!loc || room.id !== s.rooms.graph.vaults[0]) return 0; return vaultFiles(loc).filter(({ dir, name }) => { const info = fileInfo(loc, dir, name); return info && !['text', 'trap', 'sweep'].includes(info.kind) && !loc.state?.taken?.[`${dir}/${name}`] && !s.run?.pack.some((f) => f.path === `${dir}/${name}`); }).length; },
  entryFiles: (s) => entryFiles(s, locOf(s)).length,
  downNote: (s, room) => (!room.wild ? undefined : inRuns(locOf(s)) ? 'Down until the server reboots.' : locOf(s)?.zone && !spawnOf(s, room)?.boss ? 'Down until every room is cleared.' : undefined),
  offNote: (s, room) => (room.extra === 'grid' ? 'A Grid consortium\'s socket: offline outside one.' : undefined),
  // Contracts on this server (mail.mjs): the item you carry for this room, the rooms a job marks, each job's progress.
  plantHere: (s, room) => { const loc = locOf(s); return loc ? payloadFor(s, loc, room) : null; },
  marks: (s) => { const loc = locOf(s); return loc ? roomMarks(s, loc, liveFights(s, loc)) : {}; },
  jobs: (s) => { const loc = locOf(s); return loc ? jobsOn(s, loc) : []; },
  // A room next to you that scan reads (run.mjs scanRoom): its card's Scan button runs scan <room>.
  scan: (s, room) => scanButton(s, room),
};

// The live viruses in the rooms you know on this server, as a contract reads a kill (roomKill's terms): the marks.
function liveFights(s, loc) {
  const out = [];
  for (const room of FP.roomList(s)) {
    if (!['process', 'elite', 'guard', 'core'].includes(room.kind) || room.mirror || !FP.known(s, room.id) || !FP.isUp(s, room)) continue;
    const v = FP.virusOf(s, room), sp = room.wild ? spawnOf(s, room, loc) : null;
    out.push({ id: room.id, family: lineageOf(v.family), virus: v.family, zone: !!loc.zone, name: sp?.bounty ? sp.name : null, level: v.level, strain: v.strain || null,
      encrypts: v.parts.some((p) => p.attack?.effect === 'encrypt'), core: room.kind === 'core', server: s.rooms.type === 'server' });
  }
  return out;
}

// A respawned fight room on a server you hold: tending it (Root climbs on these) counts as building in your XP mix,
// as the old log rotations did; the kill pays the same.
WORLD_hook('xpKind', (s, room) => { const loc = locOf(s), R = s.rooms; return owned(loc) && R.cleared[room.id] && room.kind !== 'core' ? 'build' : undefined; });
// Who else is in a wild room (presence.mjs: SPRAWL-00 is shared, and a consortium's ground), your crew left out.
WORLD_hook('people', (s, room) => { const loc = locOf(s); return loc && room.path0 ? peopleIn(s, loc, room.path0, false).filter((p) => !p.crew).map((p) => p.handle) : []; });

// ---------- progress ----------
WORLD_hook('cleared', (s, room) => { const loc = locOf(s); if (loc) contractRooms(s, loc, room); });
WORLD_hook('mapped', (s) => {
  const loc = locOf(s);
  if (!loc) return;
  contractMapped(s, loc);
  // Mapped: every ? linked to it is traced the rest of the way (floors.mjs), so a floor always opens outward.
  if (!loc.zone && !loc.member && HIDDEN.opens) for (const n of hiddenNear(s, loc)) hiddenLead(s, n, 100 - n.lead, 'Mapped: ');
  if (s.rooms.type === 'server') { const n = NET.mapped(levelOf(loc)); s.server.credits += n; emit(s, 'info', `Mapped: +${n} credits.`, { credits: n }); }
});

// ---------- reading a server (the network map's card) ----------
// Rooms n/N, Mapped, the vault and the Core, without connecting.
export function summaryOf(s, loc) {
  const R = loc?.floorplan;
  if (!R) return null;
  const all = Object.values(R.graph.rooms).filter(FP.counted), done = all.filter((x) => R.cleared[x.id]).length; // a thread's room and a quirk's never count
  const vault = R.graph.vaults[0] ? !!R.opened[R.graph.vaults[0]] || (loc.farm && !!loc.state?.unlocked?.['/ledger']) : null;
  return { done, total: all.length, mapped: !!R.mapped, vault, visits: R.visits, kind: R.type === 'server' ? R.kind : null, size: R.size };
}

// ---------- the save (v39) ----------
// Every server you'd found becomes a room graph from its seed. A server you held starts with its vault opened and its
// Resident beaten (two rooms toward progress), and stays held; its Root pips stay. A run in flight on an old server
// is jacked out (what it carried banked). Buildings and outposts stay as they were (sockets are R2).
export function roomsRestore(s, was) {
  exfilRestore(s);
  // Rooms are unknown until you've been in them (floorplan.mjs fogRestore): an older save keeps what it can't rule out.
  for (const loc of [s.zone, ...(s.locations || [])]) if (loc?.floorplan) FP.fogRestore(loc.floorplan);
  // A wild server's rooms were once named by their folders (/var/log): named for what they are now (Process 5).
  for (const loc of [s.zone, ...(s.locations || [])]) {
    const g = loc?.floorplan?.graph;
    if (!g || !Object.values(g.rooms).some((r) => r.label?.startsWith('/'))) continue;
    for (const r of Object.values(g.rooms)) if (r.label?.startsWith('/')) delete r.label;
    FP.nameRooms(g);
    if (s.run?.rooms && s.run.loc === loc.id) { const here = g.rooms[loc.floorplan.at]; if (here) { s.run.cwd = here.path; for (const c of Object.values(s.run.crew || {})) c.cwd = here.path; } }
  }
  rogueRestore(s);
  if (was >= 39) return socketRoomsRestore(s);
  if (s.run && !s.run.rooms) {
    const loc = s.run.loc === CONFIG.zone.id ? zoneOf(s) : findLocation(s, s.run.loc);
    if (s.encounter?.mode === 'run') s.encounter = null;
    try { if (loc) bank(s, loc, 'Your save moved to rooms:'); else { s.signal = s.run.integrity; s.run = null; } } catch { s.run = null; }
  }
  const t = now();
  for (const loc of [zoneOf(s), ...(s.locations || [])]) {
    if (!loc || loc.floorplan) continue;
    let R;
    try { R = roomsFor(s, loc); } catch { continue; }
    if (loc.takenOver && R.type === 'server') {
      const v = R.graph.vaults[0];
      if (v) { R.opened[v] = t; R.cleared[v] = t; R.seen[v] = 'kind'; }
      R.cleared[R.graph.core] = t; R.down[R.graph.core] = t; R.held = t;
      R.seen[R.graph.core] = 'kind';
      if (rootOf(loc) >= 2) addStash(loc);
      // Root counts clears now: a server keeps its pips, and starts counting from where its level begins.
      loc.root = { ...(loc.root || {}), level: rootOf(loc) || 1, cleared: ROOT.need[rootOf(loc) || 1] || 0, proc: null };
    }
  }
  socketRoomsRestore(s);
}
// R2 (v40): a traced server's rooms from before sockets get them, from its seed (floorplan.mjs addSockets): its process
// rooms at the ends of branches become socket rooms, one you'd already cleared open at once (its guard never comes
// back). Root 4 adds its room. Every load, idempotent: g.sockets marks a graph done.
export function socketRoomsRestore(s) {
  for (const loc of s.locations || []) {
    const R = loc.floorplan;
    if (!R?.graph || R.type !== 'server') continue;
    R.programs ||= {};
    R.code ||= codeOf(loc.family) || 'cipher';
    if (R.graph.sockets == null) {
      const was = Object.fromEntries(Object.values(R.graph.rooms).map((x) => [x.id, x.path]));
      FP.addSockets(R.graph, socketsFor(loc), loc.seed || 1);
      for (const x of Object.values(R.graph.rooms)) if (x.kind === 'socket') { delete R.down[x.id]; delete R.rare[x.id]; }
      if (s.run?.rooms && s.run.loc === loc.id && R.at) { const here = R.graph.rooms[R.at]; if (here && was[here.id] !== here.path) { s.run.cwd = here.path; for (const c of Object.values(s.run.crew || {})) c.cwd = here.path; } }
    }
    if (rootOf(loc) >= 4) addRootSocket(loc);
  }
  puzzleRoomsRestore(s);
}
// Puzzle rooms (9.11) on a traced server's graph from before them: added from its seed as new leaf rooms (nothing you'd
// cleared, held, built or been given moves: every room keeps its id, name and address), unknown until you walk in (a
// ? at once on a server already half cleared). Every load, idempotent: g.puzzles marks a graph done.
export function puzzleRoomsRestore(s) {
  for (const loc of s.locations || []) {
    const R = loc.floorplan;
    if (!R?.graph || R.type !== 'server' || R.graph.puzzles != null) continue;
    for (const x of placePuzzles(loc, R.graph, R.size || sizeOf(loc).id)) if (R.drawn || R.mapped) R.seen[x.id] ||= 'shape';
  }
  quirkRoomsRestore(s);
}
// The quirks' rooms on a traced server's graph from before them (a Worm server's nest, a Ghostroot server's hidden
// room), and a Mailhub's mail queue where it had no Patroller: from its seed, as new leaf rooms (nothing you'd cleared,
// held or built moves). A nest is unknown until you walk in (a ? at once on a server already half cleared); a hidden
// room stays off the map until you clear the room beside it. Every load, idempotent: g.quirks marks a graph done.
export function quirkRoomsRestore(s) {
  for (const loc of s.locations || []) {
    const R = loc.floorplan;
    if (!R?.graph || R.type !== 'server') continue;
    if (R.kind === 'Mailhub') FP.markQueue(R.graph);
    if (R.graph.quirks != null) continue;
    const room = placeQuirkRoom(loc, R.graph), by = room?.concealed && R.graph.rooms[room.off];
    // Beside a room you'd cleared that never fights again (a socket, a cache): it's open already, a room you haven't been in.
    if (by && R.cleared[by.id] && (!FP.FIGHTS.includes(by.kind) || by.kind === 'socket')) { delete room.concealed; R.graph.links.push([by.id, room.id]); }
    if (room && !room.concealed && (R.drawn || R.mapped)) R.seen[room.id] ||= 'shape';
  }
  specialRoomsRestore(s);
}
// The specials' rooms on a graph from before them (specials.mjs, v50): a Stable server's rest room, and a Backbone
// server's socket where its graph has only its size's (open at once). Every load, idempotent.
export function specialRoomsRestore(s) {
  for (const loc of s.locations || []) {
    const R = loc.floorplan;
    if (!R?.graph || R.type !== 'server') continue;
    if (hasSpecial(loc, 'stable') && R.graph.stable == null) { const room = FP.addRestRoom(R.graph); if (room && (R.drawn || R.mapped)) R.seen[room.id] ||= 'shape'; }
    if (hasSpecial(loc, 'backbone') && (R.graph.sockets || 0) < socketsFor(loc, R.size)) { const room = FP.addSocketRoom(R.graph, 'backbone'); if (room) { R.cleared[room.id] = now(); R.seen[room.id] ||= 'shape'; } }
  }
}
hooks.roomsRestore = roomsRestore;
// The Mule is the Exfil now (its Runner the Uplink, its Bag the Archive): the cooldown (s.mule), the Codex's record
// of it (met, kills, research), its tip, a run's roll, a visit's chase and a fight in flight carry over. Twice is once.
const PART_IDS = { runner: 'uplink', bag: 'archive' }, PART_NAMES = { Runner: 'Uplink', Bag: 'Archive' };
export function exfilRestore(s) {
  const mv = (o, a, b) => { if (o && o[a] !== undefined) { if (o[b] === undefined) o[b] = o[a]; delete o[a]; } };
  mv(s, 'mule', 'exfil');
  mv(s.met, 'mule', 'exfil');
  for (const k of ['kills', 'fought', 'won']) mv(s.dex?.[k], 'mule', 'exfil');
  for (const o of [s.research, s.codex]) if (o) for (const [old, id] of Object.entries(PART_IDS)) mv(o, `mule:${old}`, `exfil:${id}`);
  mv(s.settings?.seen, 'mule', 'exfil');
  for (const loc of [s.zone, ...(s.locations || [])]) {
    if (!loc) continue;
    mv(loc.rogueRun, 'mule', 'exfil');
    const v = loc.floorplan?.visit;
    mv(v, 'mule', 'exfil');
    if (v?.exfil?.name?.startsWith('MULE-')) v.exfil.name = v.exfil.name.replace(/^MULE-/, 'EXFIL-');
  }
  const e = s.encounter;
  if (e?.rooms?.as === 'mule') e.rooms.as = 'exfil';
  if (e?.rooms?.size === 'mule') e.rooms.size = 'exfil';
  if (e?.virus?.family === 'mule') {
    e.virus.family = 'exfil';
    if (e.virus.name?.startsWith('MULE-')) e.virus.name = e.virus.name.replace(/^MULE-/, 'EXFIL-');
    for (const p of e.virus.parts || []) { if (PART_IDS[p.id]) p.id = PART_IDS[p.id]; if (PART_NAMES[p.name]) p.name = PART_NAMES[p.name]; }
  }
}
// A rogue server laid out before quiet rooms (its folders around the entry): its rooms again from its seed (rogueGraph),
// the fight rooms on the same ids, so what you'd cleared and seen stays; the quiet rooms new, in the fog.
export function rogueRestore(s) {
  for (const loc of s.locations || []) {
    const R = loc.floorplan;
    if (!R?.graph || R.graph.quiet || !inRuns(loc)) continue;
    let g;
    try { g = rogueGraph(loc); } catch { continue; }
    if (!Object.values(R.graph.rooms).every((x) => g.rooms[x.id] && g.rooms[x.id].kind === x.kind && g.rooms[x.id].path0 === x.path0)) continue;
    R.graph = g;
    if (s.run?.rooms && s.run.loc === loc.id) { const here = g.rooms[R.at]; if (here) { s.run.cwd = here.path; for (const c of Object.values(s.run.crew || {})) c.cwd = here.path; } }
  }
}
