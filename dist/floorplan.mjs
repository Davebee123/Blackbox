// A server as a graph of rooms (docs/servers.md 2). Pure like the combat engine: state in, events out. Two hosts:
//   the playtest  (R0, app.js ?playtest=rooms): one server on a fresh character that's never saved, s.rooms its own,
//                 its Signal and pack on it (R.signal, R.pack), its clocks ten times as fast.
//   the network   (R1, netrooms.mjs): every server on the real save is a room graph, kept on its location
//                 (loc.floorplan, R.world), s.rooms the one you're connected to. Signal is the run's (s.run.integrity,
//                 resting at home as s.signal), the pack the run's files (banked by run.mjs when you jack out), and
//                 the world's own rules (what a room spawns, the Resident, takeover, Root, contracts) come through
//                 the WORLD hooks netrooms.mjs fills.
//
//   rooms       a fight (process ▣, elite ◆▣, guard post ◆▣, the core ♛, the hunter's den ☠), an interactable (cache ▤,
//               vault ▥, rest ☰) or an empty junction (·). The marks are the terminal's; the page draws icons. A fight room's family, author and attack set are fixed by the
//               server's seed, so a room is a place you learn. Its mutation rerolls with each respawn, and one respawn
//               in ten is a rare spawn (★, two levels up, three loot rolls).
//   moving      the first time you walk into a room on a visit costs ROOMS.move of your max Signal; rooms you've walked
//               this visit, and `wait`, are free. A live virus blocks its room: engage it, or step back.
//   keys        the vault's key sits in a guard post on another branch, three or more rooms from the vault. A guard
//               post is an elite to the player (named Elite n with the others, the elite's icon and a KEY badge): its
//               kind stays 'guard' here, and its enemy is a guard or Kestrel ICE. Beat the
//               guard, walk the key back and open the vault (or force it for ROOMS.force of your max). A key lasts one
//               visit: jack out with it and it goes back to its post, guard and all. The vault unseals /core.
//   the hunter  on a medium or large server (from floor 2): a Patroller walks a fixed loop, a Tracker sleeps in its den
//               and wakes when you walk next to it, follows you and loses you at ROOMS.hunter.lose rooms. Either moves a
//               room for every ROOMS.hunter.pace of your moves (a Lab's Tracker every move once awake), and only when you
//               walk or wait: never while you fight, loot, open or rest. It never enters the rest room or the entry.
//   respawns    fight rooms come back on real time (ROOMS.respawn, ×ROOMS speed in the playtest), never while you stand
//               in them; a cache refills. Nothing expires: a week away and the server is just full again.
//   quiet rooms a rogue server's (netrooms.mjs rogueGraph): Empty (nothing in it, cleared as you walk in) and Stash
//               (a few credits, taken as you walk in, full again when the server reboots: rogue.mjs rogueReboot).
//   the Mule    a loot mob on a rogue server visit (CONFIG.mule; the world decides when one turns up, netrooms.mjs). It
//               starts in a room away from you and flees after each of your moves to the neighbour farthest from you
//               (never your room, never a room with a live virus); with no neighbour farther than where it stands it's
//               cornered and stays. Walk into its room and you fight it; it escapes after CONFIG.mule.escape cycles.
//   progress    rooms cleared at least once, for good: a fight room when you first beat it, an interactable when you
//               first use it, a junction when you first walk it. At 50% the whole graph is drawn; at 100% the server
//               is Mapped (an item roll two levels over it, and 5 kills' worth of XP).
//   visits      connect at the entry, jack out from any room (the pack banks), rest at home (Signal back at
//               CONFIG.signalRest a minute), reconnect after ROOMS.reconnect. Lose a fight and you're disconnected: the
//               unbanked pack is lost, XP and banked gear stay.
//
// Fights are ordinary run fights (combat.mjs selectEncounter, mode 'run') flagged e.rooms: combat.mjs finish hands the
// end back here (hooks.roomEnd), and families.mjs and interrupt.mjs play the room rules (attack sets, the new bodies,
// the interrupt). The Resident is DEADBOLT, under the boss rule the playtest switches (interrupt.mjs BOSS_RULES).
import { hooks, emit, warn, active, selectEncounter, encounterVirus, command, maxSignal, hackerOf, hackerLevel, classOf, addItem, stashItem, gainXp, gainCode, xpFor, rollDrop } from './combat.mjs';
import { GUARDS, SUBS, LOADOUT, SUBCLASS, defaultSub, ARCHETYPES, BOSSES, FAMILIES, CONFIG, ELITE, ROLLED_MUTATIONS, SERVER, xpToNext } from './data.mjs';
import { seeded, rollItem, itemLabel, protocolSlots, SLOT_KINDS, chaseStat } from './gear.mjs';
import { AUTHORS } from './authors.mjs';
import { giveScript, rollScript } from './scripts.mjs';
import { AUTHOR_FAMILIES, OPENS, rollSet, applySet, jitterFirst, setsOf, familyName, setName } from './families.mjs';
import { armTicks, bossRule, BOSS_RULES } from './interrupt.mjs';
import { logSet } from './genome.mjs';

// ---------- tuning ----------
export const ROOMS = {
  sizes: { small: 8, medium: 12, large: 16 },
  spine: { small: 4, medium: 5, large: 6 }, // entry to /core, both counted
  move: 0.03, moveDeep: 0.04, // a room's first entry on a visit, of your max Signal (from floor 5: 4%)
  force: 0.15, bait: 0.1, rest: 0.3, // forcing a vault, pulling bait, the rest room
  respawn: { process: 15, elite: 45, guard: 20, core: 60, cache: 120 }, // minutes (the core: R0 has no takeover, so it comes back like a lair's)
  speed: 1, // the playtest runs the clocks ten times as fast (app.js)
  reconnect: 30000, // after you leave, the server takes you back this much later
  rare: 0.1, rareLevel: 2, rareRolls: 3,
  // XP (7.2): a room kill pays 1.25 kills (an elite three times that, via ELITE.xp), a first clear half again, a rare
  // spawn twice, the Resident four times, the hunter twice; Mapped pays 5 kills.
  xp: { room: 1.25, first: 0.5, rare: 2, boss: 4, hunter: 2, mapped: 5 },
  // Each fight's size in a room, on top of the run sizes every Signal fight has (CONFIG.runHp, runDamage): a process at
  // your level costs 20–30% of your Signal, an elite 45–60%, the Resident wins about one fight in three (2.5).
  // stray: SPRAWL-00's strays (netrooms.mjs), the levels 1 to 5 where you learn the ticks: a plain virus's Integrity, lighter hits.
  // mule: the Mule (a runner, quick to break): a plain virus's Integrity, light hits.
  size: { process: { hp: 1.3, dmg: 0.9 }, elite: { hp: 0.9, dmg: 0.6 }, guard: { hp: 1.2, dmg: 0.85 }, hunter: { hp: 1.6, dmg: 0.7 }, boss: { hp: 1.25, dmg: 0.9 }, stray: { hp: 1, dmg: 0.8 }, mule: { hp: 1.5, dmg: 0.35 } },
  eliteHp: 2.2, // an elite's Integrity (of a plain virus's), before its size
  hunter: { pace: 2, lose: 5, level: 2 }, // a room per 2 of your moves; a Tracker loses you 5 rooms away; 2 levels over the server (its size: twice a guard's Integrity)
  cache: { credits: [18, 36], code: [2, 4], script: 0.15 },
  purse: (level) => 4 + Math.floor(level / 2), // a rogue server's Stash: credits (and 1 code one time in five, netrooms.mjs)
  vault: { gear: 1 / 3, custom: 0.4 },
  junctions: 0.2, // about a fifth of the rooms
};
// The server kinds (2.2), as room themes: one rule each, the hunter they keep, and the directory names their rooms take.
export const KINDS = {
  Mailhub: { rule: 'Spam floods', text: 'Fights on the Patroller\'s loop bring a weak, quick Spam Flood.', hunter: 'patrol', author: 'tollgate',
    dirs: ['spool', 'postfix', 'mqueue', 'smtpd', 'relay', 'aliases', 'maildrop', 'bounce', 'virtual', 'transport', 'lmtp', 'pickup', 'qmgr', 'cleanup', 'tlsmgr', 'anvil', 'scache', 'flush'] },
  Relay: { rule: 'Hops', text: 'Two curved links skip a room. The hunter uses them too.', hunter: 'patrol', author: 'swarmline',
    dirs: ['bind', 'named', 'zones', 'resolv', 'forward', 'slave', 'keys', 'dyn', 'stats', 'hints', 'rndc', 'journal', 'views', 'acl', 'dnssec', 'notify', 'axfr', 'master'] },
  Mirror: { rule: 'Mirrors', text: 'One cache is a mirror with an elite behind it.', hunter: 'track', author: 'palemask',
    dirs: ['www', 'private', 'html', 'assets', 'cdn', 'static', 'uploads', 'cgi-bin', 'logs', 'media', 'themes', 'vhosts', 'certs', 'cache', 'drafts', 'mirror', 'stage', 'public'] },
  Archive: { rule: 'Deep storage', text: 'Two vaults, each with its own key. Only the vault before the Core unseals it.', hunter: 'track', author: 'glassjaw',
    dirs: ['backups', 'srv', 'cold', 'dumps', 'snapshots', 'incr', 'full', 'catalog', 'index', 'offsite', 'restore', 'media', 'rotate', 'weekly', 'monthly', 'ledger', 'escrow', 'ltfs'] },
  Lab: { rule: 'Overheat', text: 'From cycle 10 of a fight, the rack burns you for 2% of your max Signal a cycle and every part for 3% of its max Integrity. Its Tracker moves every move once awake.', hunter: 'track', fast: true, author: 'lantern',
    dirs: ['lab', 'tmp', 'bench', 'rig', 'sandbox', 'builds', 'cores', 'gpu', 'scratch', 'fuzz', 'harness', 'probe', 'samples', 'jit', 'debug', 'trace', 'cold', 'kiln'] },
};
export const KIND_IDS = Object.keys(KINDS);
// The network's rules (netrooms.mjs fills these; the playtest leaves them empty). Each returns undefined to leave a
// room to the playtest's rules.
//   up(s, room, now)        is its fight there (a wild server's spawns)        back(s, room) / from(s, room): its timer
//   fight(s, room, as)      what its fight is                                    respawn(s, room): minutes
//   coreOpen(s)             the Core unsealed                                   vaultOpen(s, room) / canOpen(s, room)
//   won(s, room, e, how)    what a kill pays besides XP (contracts, leads, drops, Root, the takeover)
//   lost(s, room, e)        a loss (a Resident grows)                           leave(s, how, why): the run ends
//   cleared(s, room) / mapped(s)                                                 rare(s): rare spawns' odds
//   cache(s, room, take) / vault(s, room) / pull(s, room) / drops(s, room, e, rare): what you take goes in the pack
export const WORLD = {};
const world = (s) => !!s.rooms?.world;
// Room kinds: their mark on the map, and what they are.
// What each room is called on the map, its card and in the log.
// boss: a crew boss's room (KESSLER-FARM-00's three); stash: Root 2's /root on a server you hold (netrooms.mjs);
// empty, purse: a rogue server's quiet rooms (Empty, and a Stash of a few credits).
export const ROOM_LABEL = { entry: 'Entry', process: 'Process', elite: 'Elite', guard: 'Elite', core: 'Core', boss: 'Boss', den: "Hunter's den", cache: 'Cache', vault: 'Vault', rest: 'Rest room', junction: 'Junction', stash: 'Stash', empty: 'Empty', purse: 'Stash' };
export const MARKS = { entry: '⌂', process: '▣', elite: '◆▣', guard: '◆▣', core: '♛', boss: '♛', den: '☠', cache: '▤', vault: '▥', rest: '☰', junction: '·', stash: '▤', empty: '·', purse: '¤' };
// Rooms that hold something you take, and refill.
export const STOCKED = ['cache', 'stash', 'purse'];
export const FIGHTS = ['process', 'elite', 'guard', 'core', 'boss'];
export const HUNTERS = {
  patrol: { name: 'Patroller', body: 'bouncer', text: 'Walks a fixed loop, a room for every 2 of your moves.' },
  track: { name: 'Tracker', body: 'tracer', text: 'Wakes when you walk next to its den, then follows you a room for every 2 of your moves. Loses you 5 rooms off.' },
};
const GUARD_POOL = ['watchdog', 'sentinel', 'crawler', 'shredder'], ICE_POOL = ['tracer', 'bouncer'];
export const RESIDENT = 'nb-deadbolt';

// ---------- the graph ----------
const pick = (r, xs) => xs[Math.floor(r() * xs.length)];
const key = (x, y) => `${x},${y}`;
export const linksOf = (g) => [...g.links, ...(g.hops || [])];
export const neighbours = (g, id) => linksOf(g).filter(([a, b]) => a === id || b === id).map(([a, b]) => (a === id ? b : a));
// Rooms by distance from one (BFS), through the rooms `can` lets through.
export function distances(g, from, can = () => true) {
  const d = { [from]: 0 }, q = [from];
  while (q.length) { const id = q.shift(); for (const x of neighbours(g, id)) if (!(x in d) && can(x)) { d[x] = d[id] + 1; q.push(x); } }
  return d;
}
export function pathTo(g, from, to, can = () => true) {
  const prev = { [from]: null }, q = [from];
  while (q.length) { const id = q.shift(); if (id === to) break; for (const x of neighbours(g, id)) if (!(x in prev) && (can(x) || x === to)) { prev[x] = id; q.push(x); } }
  if (!(to in prev)) return null;
  const out = [];
  for (let x = to; x != null; x = prev[x]) out.unshift(x);
  return out;
}
// The generator (2.2), from the server's seed, size, kind and floor: the same inputs always build the same server.
//   1 a spine from the entry to /core (ROOMS.spine long), the vault the room before /core
//   2 branches of 1 to 3 rooms off the spine, on a grid so the map draws without crossings
//   3 a loop on a medium server (two branches joined), two on a large; a Relay's two hops
//   4 the rooms' kinds (the table in 2.2, R0's subset), then what each fight room spawns
export function generate(seed, { size = 'medium', kind = 'Mailhub', level = 10, floor = 2, author = null, hunter = null } = {}) {
  for (let t = 0; t < 60; t++) { const g = tryGenerate(seed, t, { size, kind, level, floor, author, hunter }); if (g) return g; }
  throw new Error('No room graph for seed ' + seed);
}
function tryGenerate(seed, attempt, { size, kind, level, floor, author, hunter }) {
  const r = seeded((seed * 7919 + attempt * 104729 + 13) >>> 0);
  const N = Math.min(18, ROOMS.sizes[size] + Math.max(0, floor - 3)), L = ROOMS.spine[size];
  const rooms = {}, links = [], grid = {};
  const add = (id, x, y, extra = {}) => { rooms[id] = { id, x, y, depth: 0, ...extra }; grid[key(x, y)] = id; return rooms[id]; };
  const link = (a, b) => links.push([a, b]);
  for (let i = 0; i < L; i++) { add(`r${i}`, i, 0, { spine: i }); if (i) link(`r${i - 1}`, `r${i}`); }
  const deg = (id) => links.filter(([a, b]) => a === id || b === id).length;
  let n = L;
  for (let guard = 0; n < N && guard < 400; guard++) {
    // A parent: a spine room before the vault, or a branch room under depth 3, with a free cell beside it.
    const free = (p) => [[0, -1], [0, 1], [1, 0], [-1, 0]].filter(([dx, dy]) => (p.spine == null || dx === 0) && !grid[key(p.x + dx, p.y + dy)] && !(p.x + dx < 0 && p.y + dy === 0));
    const pool = Object.values(rooms).filter((p) => (p.spine == null ? p.depth < 3 : p.spine <= L - 3) && free(p).length && deg(p.id) < 4);
    if (!pool.length) return null;
    const w = pool.map((p) => ({ p, w: (p.spine != null ? 1.4 : 1) / (1 + Math.max(0, deg(p.id) - 1) * 1.5) }));
    let x = r() * w.reduce((a, b) => a + b.w, 0), parent = w[0].p;
    for (const c of w) if ((x -= c.w) < 0) { parent = c.p; break; }
    const [dx, dy] = pick(r, free(parent));
    const id = `r${n++}`;
    add(id, parent.x + dx, parent.y + dy, { depth: parent.depth + 1, branch: parent.branch || id });
    link(parent.id, id);
  }
  if (n < N) return null;
  const g = { rooms, links, hops: [], loops: [], entry: 'r0', core: `r${L - 1}`, vaults: [`r${L - 2}`], spine: Array.from({ length: L }, (_, i) => `r${i}`) };
  // Loops: two grid neighbours not yet linked (never the vault or /core), whose cycle is 4 to 7 rooms.
  const want = size === 'large' ? 2 : size === 'medium' ? 1 : 0, banned = new Set([g.core, g.vaults[0]]);
  const cands = [];
  for (const a of Object.values(rooms)) for (const [dx, dy] of [[1, 0], [0, 1]]) {
    const b = rooms[grid[key(a.x + dx, a.y + dy)]];
    if (!b || banned.has(a.id) || banned.has(b.id) || links.some(([p, q]) => (p === a.id && q === b.id) || (p === b.id && q === a.id))) continue;
    if (a.spine != null && b.spine != null) continue;
    const cyc = pathTo(g, a.id, b.id);
    if (cyc && cyc.length >= 4 && cyc.length <= 7) cands.push({ a: a.id, b: b.id, cyc });
  }
  for (const c of cands.sort(() => r() - 0.5)) {
    if (g.loops.length >= want) break;
    if (g.loops.some((l) => l.cyc.some((id) => c.cyc.includes(id)))) continue;
    link(c.a, c.b);
    g.loops.push(c);
  }
  if (g.loops.length < want) return null;
  if (kind === 'Relay') {
    // Two hops: a link between two rooms a room apart (not through the vault or /core), skipping the one between.
    const pairs = [];
    for (const b of Object.keys(rooms)) for (const a of neighbours(g, b)) for (const c of neighbours(g, b)) if (a < c && !banned.has(a) && !banned.has(c) && !banned.has(b) && !neighbours(g, a).includes(c)) pairs.push([a, c]);
    for (const p of pairs.sort(() => r() - 0.5)) { if (g.hops.length >= 2) break; if (g.hops.some(([x, y]) => [x, y].some((id) => p.includes(id)))) continue; g.hops.push(p); }
    if (g.hops.length < 2) return null;
  }
  return assign(g, r, { size, kind, level, floor, author, hunter, N, L }) ? g : null;
}
// What each room is (2.2's table, R0's room kinds), and what its fights spawn.
function assign(g, r, { size, kind, level, floor, author, hunter, N, L }) {
  const R = g.rooms, all = Object.keys(R), spine = new Set(g.spine);
  const set = (id, k, extra = {}) => Object.assign(R[id], { kind: k, ...extra });
  set(g.entry, 'entry'); set(g.core, 'core', { boss: RESIDENT }); set(g.vaults[0], 'vault');
  const free = () => all.filter((id) => !R[id].kind);
  const offSpine = () => free().filter((id) => !spine.has(id));
  const dVault = distances(g, g.vaults[0], (x) => x !== g.core);
  // The key: a guard post on another branch, 3+ rooms from the vault (the farthest end of a branch, by the dice).
  const farFrom = (d, xs) => xs.filter((id) => (d[id] ?? 0) >= 3).sort((a, b) => neighbours(g, a).length - neighbours(g, b).length || d[b] - d[a] || r() - 0.5);
  const guard = farFrom(dVault, offSpine())[0];
  if (!guard) return false;
  set(guard, 'guard', { key: g.vaults[0] });
  if (kind === 'Archive') {
    // Deep storage: a second vault at the end of a branch, its own guard post 3+ rooms from it.
    const v2 = offSpine().filter((id) => neighbours(g, id).length === 1 && (dVault[id] ?? 0) >= 2).sort(() => r() - 0.5)[0];
    if (!v2) return false;
    set(v2, 'vault', { second: true }); g.vaults.push(v2);
    const d2 = distances(g, v2, (x) => x !== g.core);
    const g2 = farFrom(d2, offSpine())[0];
    if (!g2) return false;
    set(g2, 'guard', { key: v2 });
  }
  // The hunter (2.5): on a medium or large server from floor 2 (or forced by the playtest).
  const kindHunter = hunter || KINDS[kind].hunter;
  const hunted = !!hunter || (size !== 'small' && floor >= 2);
  if (hunted) {
    const toKey = pathTo(g, g.entry, guard) || [];
    if (kindHunter === 'patrol') {
      // A Patroller walks a loop (one of the generator's, never through the entry or the rest room), else a path there
      // and back. Its den is on it.
      const loop = g.loops.map((l) => l.cyc).find((cyc) => !cyc.includes(g.entry) && !cyc.some((id) => g.vaults.includes(id)));
      let route = loop;
      if (!route) {
        const starts = offSpine().filter((id) => R[id].kind == null).sort((a, b) => neighbours(g, a).length - neighbours(g, b).length);
        for (const a of starts) {
          const d = distances(g, a, (x) => x !== g.entry && !g.vaults.includes(x) && x !== g.core);
          const far = Object.keys(d).filter((x) => d[x] >= 2 && d[x] <= 3).sort((x, y) => d[y] - d[x])[0];
          if (!far) continue;
          const p = pathTo(g, a, far, (x) => x !== g.entry && !g.vaults.includes(x) && x !== g.core);
          if (p && p.length >= 3) { route = [...p, ...p.slice(1, -1).reverse()]; break; }
        }
      }
      if (!route) return false;
      const den = route.find((id) => !R[id].kind && !spine.has(id)) || route.find((id) => !R[id].kind);
      if (!den) return false;
      set(den, 'den');
      const i = route.indexOf(den);
      g.route = [...route.slice(i), ...route.slice(0, i)];
      g.ping = !loop;
    } else {
      // A Tracker's den sits beside the way to the key, a room or more from the entry.
      const dEntry = distances(g, g.entry);
      // (Never so near the entry that the first room you walk into wakes it.)
      const beside = (far) => offSpine().filter((id) => !toKey.includes(id) && neighbours(g, id).some((x) => toKey.includes(x)) && dEntry[id] >= far);
      const den = beside(3).sort(() => r() - 0.5)[0] || beside(2).sort(() => r() - 0.5)[0] || offSpine().filter((id) => dEntry[id] >= 3).sort(() => r() - 0.5)[0] || offSpine().filter((id) => dEntry[id] >= 2).sort(() => r() - 0.5)[0];
      if (!den) return false;
      set(den, 'den');
    }
    g.den = all.find((id) => R[id].kind === 'den');
    g.hunter = kindHunter;
    if (kind === 'Mailhub' && g.route) for (const id of g.route) R[id].queue = true; // the mail queue is the Patroller's loop
  }
  const nearDen = (id) => g.den && neighbours(g, g.den).includes(id);
  const dEntry = distances(g, g.entry);
  // The rest room: mid-spine or one off it, never beside the den or the entry.
  if (size !== 'small') {
    const ok = (id) => !nearDen(id) && !g.route?.includes(id) && id !== g.den;
    const rest = free().filter((id) => (spine.has(id) || neighbours(g, id).some((x) => spine.has(x))) && dEntry[id] >= 2 && ok(id)).sort(() => r() - 0.5)[0]
      || free().filter((id) => dEntry[id] >= 1 && ok(id)).sort((a, b) => dEntry[a] - dEntry[b] || r() - 0.5)[0];
    if (!rest) return false;
    set(rest, 'rest');
  }
  const count = (k) => ({ small: { elite: 0, cache: 1 }, medium: { elite: 1, cache: 2 }, large: { elite: 2, cache: 3 } }[size][k]);
  for (let i = 0; i < count('elite'); i++) { const id = free().filter((x) => dEntry[x] >= 2).sort(() => r() - 0.5)[0]; if (id) set(id, 'elite'); }
  for (let i = 0; i < count('cache'); i++) { const id = offSpine().sort(() => r() - 0.5)[0]; if (id) set(id, 'cache'); }
  // Mirror: one cache is a mirror, with an elite behind it.
  if (kind === 'Mirror') { const c = all.find((id) => R[id].kind === 'cache'); if (c) R[c].mirror = true; }
  // Junctions where branches split (about a fifth, the entry among them, less the socket rooms R0 doesn't build yet:
  // a socket is a process's room first, so R0 keeps the process); the rest are processes.
  const junctions = Math.max(0, Math.round(N * ROOMS.junctions) - 1 - { small: 1, medium: 1, large: 2 }[size]);
  for (const id of free().sort((a, b) => neighbours(g, b).length - neighbours(g, a).length).slice(0, junctions)) if (neighbours(g, id).length >= 2) set(id, 'junction');
  for (const id of free()) set(id, 'process');
  // What spawns where: a family from the author's open ones (each at least once where there's room), its attack set by
  // the author's taste, a third part fixed for the room. Guard posts take a guard (ICE from floor 2, half the time).
  const fams = (AUTHOR_FAMILIES[author] || AUTHOR_FAMILIES.tollgate).filter((f) => OPENS[f] <= level);
  const fights = all.filter((id) => ['process', 'elite'].includes(R[id].kind) || R[id].mirror).sort();
  const order = [...fams].sort(() => r() - 0.5);
  fights.forEach((id, i) => {
    const family = i < order.length ? order[i] : pick(r, fams);
    const pool = (FAMILIES[family]?.parts || []).filter((p) => p.pool === 'third' && (!p.from || level >= p.from));
    Object.assign(R[id], { family, author, set: rollSet(family, author, r), third: pool.length && r() < 0.6 ? pick(r, pool).gene : null });
  });
  for (const id of all) {
    R[id].seed = Math.floor(r() * 2 ** 31);
    if (R[id].kind === 'guard') R[id].guard = floor >= 2 && r() < 0.5 ? pick(r, ICE_POOL) : pick(r, GUARD_POOL);
    if (R[id].kind === 'cache') R[id].baitSeed = Math.floor(r() * 2 ** 31);
    if (R[id].kind === 'vault') R[id].loot = r() < ROOMS.vault.gear ? { kind: 'gear', rarity: r() < ROOMS.vault.custom ? 'custom' : 'tuned' } : { kind: 'script', script: rollScript(r, 'uncommon') };
  }
  nameRooms(g);
  return true;
}
// Names: what each room is (Process 2, Elite 1, Vault, Core), numbered when a name repeats (a guard post is named and
// numbered with the elites). path is the label every screen and line shows; dir is its slug, for typing (cd process-2).
export function nameRooms(g) {
  const R = g.rooms, sorted = Object.keys(R).sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  const many = {}, nth = {}, base = (x) => x.label || ROOM_LABEL[x.kind] || x.kind;
  for (const id of sorted) many[base(R[id])] = (many[base(R[id])] || 0) + 1;
  for (const id of sorted) {
    const x = R[id], b = base(x);
    nth[b] = (nth[b] || 0) + 1;
    x.path = many[b] > 1 ? `${b} ${nth[b]}` : b;
    x.dir = x.path.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  return g;
}

// ---------- the server on you ----------
const nowOf = () => hooks.now?.() ?? Date.now();
const mins = (s, m) => (m * 60000) / (s.rooms?.speed || ROOMS.speed);
// Your Signal on the server: the playtest's own, or the run's on the network (and at home, what rests there).
export const sigOf = (s) => (world(s) ? (s.run ? s.run.integrity : Math.min(maxSignal(s), s.signal ?? maxSignal(s))) : s.rooms.signal);
function setSig(s, n) { if (!world(s)) s.rooms.signal = n; else if (s.run) s.run.integrity = n; }
const ask = (fn, ...a) => { const f = WORLD[fn]; return f ? f(...a) : undefined; }; // a WORLD hook, on the network only
export const roomOf = (s, id) => s.rooms?.graph.rooms[id] || null;
export const hereOf = (s) => (s.rooms?.at ? roomOf(s, s.rooms.at) : null);
export const roomList = (s) => Object.values(s.rooms.graph.rooms);
// Start the playtest's server: a fresh map, you at home with full Signal.
//   seed, size, kind, level, floor, author: the server. hunter: 'patrol' | 'track' (overrides its kind's). boss: a | b | c.
//   speed: the clocks' speed (the playtest 10). name: shown on the card.
export function startRooms(s, { seed = 1, size = 'medium', kind = 'Mailhub', level = hackerLevel(s), floor = 2, author = null, hunter = null, boss = 'a', speed = ROOMS.speed, name = null } = {}) {
  s.rooms = newRooms(s, { seed, size, kind, level, floor, author, hunter, boss, speed, name });
  s.run = null;
  say(s, `${s.rooms.name}: a ${s.rooms.author.toUpperCase()} ${s.rooms.kind}. ${BOSSES[RESIDENT].name} holds the Core.`);
  return s.rooms;
}
// A server's rooms, built and not yet anyone's: the playtest's (startRooms) or a location's (netrooms.mjs, with its
// own graph and world: true). The room state a save keeps: what's cleared, seen, down, taken and opened, for good.
export function newRooms(s, { seed = 1, size = 'medium', kind = 'Mailhub', level = hackerLevel(s), floor = 2, author = null, hunter = null, boss = 'a', speed = ROOMS.speed, name = null, graph = null, world = false, ...more } = {}) {
  kind = KINDS[kind] ? kind : 'Mailhub';
  author = AUTHOR_FAMILIES[author] ? author : KINDS[kind].author;
  graph ||= generate(seed, { size, kind, level, floor, author, hunter });
  const max = maxSignal(s);
  const R = {
    v: 1, seed, size, kind, level, floor, author, speed, bossRule: world ? null : BOSS_RULES[boss] ? boss : 'a', graph,
    id: (name || serverName(seed, kind)).toLowerCase(), name: name || serverName(seed, kind),
    at: null, visit: null, visits: 0, cleared: {}, seen: {}, down: {}, spawns: {}, rare: {}, taken: {}, opened: {},
    signal: max, max, homeAt: nowOf(), reconnectAt: 0, screen: null, pack: [], banked: [], credits: 0, xpStart: 0,
    log: [], scripts: [], codex: {}, mapped: false, last: null, rolls: 0,
    stats: { fights: 0, won: 0, lost: 0, cuts: 0, wasted: 0, ticks: 0, signalBy: {}, boss: { tries: 0, won: 0 }, hunted: 0, moves: 0, cycles: 0 },
    ...(world ? { world: true } : {}), ...more,
  };
  R.xpStart = xpTotal(s);
  if (graph.core) R.seen[graph.core] = 'kind';
  return R;
}
const NAMES = { Mailhub: 'MERIDIAN-MX', Relay: 'HALVARD-NS', Mirror: 'VANTA-WWW', Archive: 'MOTHWELL-BK', Lab: 'SABLE-LAB' };
export const serverName = (seed, kind) => `${NAMES[kind] || 'KESSLER-SRV'}-${String(seed % 100).padStart(2, '0')}`;
function say(s, text, type = 'rooms') {
  const R = s.rooms;
  R.log.push(text);
  if (R.log.length > 60) R.log.shift();
  return emit(s, type, text);
}
const deny = (s, text) => { warn(s, text); return null; };
const out = (s, first) => s.logs.filter((e) => e.id > first);
const rnd = (R, salt = 0) => seeded((R.seed * 2654435761 + (++R.rolls) * 40503 + salt) >>> 0);

// ---------- time: respawns, refills, rest ----------
// A fight room's virus is up: it never fell, or its timer ran out and you're not standing in it.
export const respawnMs = (s, room) => mins(s, (world(s) ? ask('respawn', s, room) : undefined) ?? ROOMS.respawn[room.kind === 'core' || room.kind === 'boss' ? 'core' : room.kind === 'guard' ? 'guard' : room.kind === 'elite' ? 'elite' : 'process']);
export function isUp(s, room, now = nowOf()) {
  const R = s.rooms, at = R.down[room.id];
  if (!FIGHTS.includes(room.kind)) return false;
  const w = world(s) ? ask('up', s, room, now) : undefined;
  if (w !== undefined) return w;
  if (room.kind === 'core' && !coreOpen(s)) return true; // sealed, with its Resident behind it
  if (at == null) return true;
  const back = at + respawnMs(s, room);
  return now >= back && !(R.at === room.id && (R.inSince ?? 0) < back); // it waits while you stand in it
}
// When a fallen room comes back (ms), or null.
export const backAt = (s, room) => { const w = world(s) ? ask('back', s, room) : undefined; return w !== undefined ? w : s.rooms.down[room.id] != null ? s.rooms.down[room.id] + respawnMs(s, room) : null; };
// When it fell (the respawn ring's start), or null.
export const downAt = (s, room) => { const w = world(s) ? ask('from', s, room) : undefined; return w !== undefined ? w : s.rooms.down[room.id] ?? null; };
// (A Stash has no timer: it's full again when its server reboots.)
export const cacheFull = (s, room, now = nowOf()) => STOCKED.includes(room.kind) && (s.rooms.taken[room.id] == null || (room.kind !== 'purse' && now >= s.rooms.taken[room.id] + mins(s, ROOMS.respawn.cache)));
export const refillAt = (s, room) => (s.rooms.taken[room.id] != null && room.kind !== 'purse' ? s.rooms.taken[room.id] + mins(s, ROOMS.respawn.cache) : null);
// Bait: one cache in four, fresh with each refill.
export const isBait = (s, room) => room.kind === 'cache' && !room.mirror && seeded((room.baitSeed + (s.rooms.spawns[room.id] || 0) * 7919) >>> 0)() < 0.25;
export const coreOpen = (s) => { const w = world(s) ? ask('coreOpen', s) : undefined; return w !== undefined ? w : !!s.rooms.opened[s.rooms.graph.vaults[0]]; };
// A vault opened (the farm's ledger locks again when its keeper is back: netrooms.mjs).
export const opened = (s, room) => { const w = world(s) ? ask('vaultOpen', s, room) : undefined; return w !== undefined ? w : !!s.rooms.opened[room.id]; };
// Your Signal at home rests back (CONFIG.signalRest of your max a minute, at the clock's speed).
export function signalNow(s, now = nowOf()) {
  const R = s.rooms;
  if (R.world) return s.run ? (active(s) ? s.run.integrity : Math.max(1, Math.min(s.run.max, s.run.integrity, R.fightFrom ?? s.run.max))) : sigOf(s);
  if (active(s) && s.run?.rooms) return s.run.integrity;
  // A fight that just ended (its run not settled yet): what it leaves you, on the server or home.
  if (R.at) return s.run?.rooms ? Math.max(1, Math.min(s.run.max, s.run.integrity, R.fightFrom ?? s.run.max)) : R.signal;
  return Math.min(R.max, Math.floor(R.signal + ((now - R.homeAt) / 60000) * CONFIG.signalRest * R.max * R.speed));
}
// The next room to come back (a fight room, or a cache), for the server card.
export function soonest(s, now = nowOf()) {
  let best = null;
  for (const room of roomList(s)) {
    const at = STOCKED.includes(room.kind) ? (cacheFull(s, room, now) ? null : refillAt(s, room)) : FIGHTS.includes(room.kind) && !isUp(s, room, now) ? backAt(s, room) : null;
    if (at != null && (!best || at < best.at)) best = { room, at };
  }
  return best;
}
export const fmtLeft = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return t >= 3600 ? `${Math.floor(t / 3600)}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

// ---------- progress ----------
export const progressOf = (s) => { const all = roomList(s); return { done: all.filter((x) => s.rooms.cleared[x.id]).length, total: all.length }; };
// (quiet: the entry, cleared as you connect, says nothing.)
function clear(s, room, quiet = false) {
  const R = s.rooms;
  if (R.cleared[room.id]) return false;
  R.cleared[room.id] = nowOf();
  const p = progressOf(s);
  if (!quiet) say(s, `${room.path} cleared.`, 'rooms-good');
  if (p.done * 2 >= p.total && !R.drawn) { R.drawn = true; for (const x of roomList(s)) R.seen[x.id] = 'kind'; say(s, 'Half cleared: the whole map is drawn.', 'rooms-good'); }
  if (p.done === p.total && !R.mapped) mapped(s);
  if (R.world) ask('cleared', s, room);
  return true;
}
// 100%: Mapped. An item roll two levels over the server, and 5 kills' worth of XP.
function mapped(s) {
  const R = s.rooms;
  R.mapped = nowOf();
  const it = addItem(s, rollItem(rnd(R, 77), { level: R.level + 2, rarity: rnd(R, 78)() < 0.35 ? 'custom' : 'tuned', cls: classOf(s) }), 'Mapped: ');
  if (it) R.banked.push(it.id);
  const xp = Math.round(xpFor(s, R.level, ROOMS.xp.mapped));
  gainXp(s, xp, `${R.name} Mapped`, 'breakin'); // exploration XP (the old break-ins' share): finishing a server
  say(s, `MAPPED. ${it ? `${itemLabel(it)} goes in your bank. ` : ''}+${xp} XP.`, 'rooms-good');
  if (R.world) ask('mapped', s);
}

// ---------- fog (2.6) ----------
// You see the room you're in and the kind of every room next to it, and the shape one link further (an Infiltrator
// the kinds one further). /core always shows. What you've seen stays seen.
export function look(s) {
  const R = s.rooms, g = R.graph, here = R.at;
  if (!here) return;
  const reach = classOf(s) === 'infiltrator' ? 2 : 1, d = distances(g, here);
  for (const [id, n] of Object.entries(d)) {
    if (n <= reach) R.seen[id] = 'kind';
    else if (n === reach + 1 && R.seen[id] !== 'kind') R.seen[id] = 'shape';
  }
  R.seen[g.core] = 'kind';
}
export const seenOf = (s, id) => s.rooms.seen[id] || null;

// ---------- the hunter (2.5) ----------
const forbidden = (g, id) => id === g.entry || g.rooms[id]?.kind === 'rest' || g.vaults.includes(id) || id === g.core;
function newHunter(s) {
  const g = s.rooms.graph;
  if (!g.den) return null;
  const h = { kind: g.hunter, at: g.den, den: g.den, idx: 0, awake: g.hunter === 'patrol', returning: false, count: 0, down: false, held: 0 };
  return h;
}
export const hunterOf = (s) => s.rooms?.visit?.hunter || null;
export const paceOf = (s, h = hunterOf(s)) => (h && h.kind === 'track' && h.awake && KINDS[s.rooms.kind].fast ? 1 : ROOMS.hunter.pace);
// Where it steps next: the next room of its loop, or a step along the shortest way to you (back to its den once it
// has lost you). It never steps into the entry, the rest room, a vault or /core: it waits at the door.
export function hunterNext(s, h = hunterOf(s)) {
  const R = s.rooms, g = R.graph;
  if (!h || h.down) return null;
  if (h.kind === 'patrol') return g.route[(h.idx + 1) % g.route.length];
  if (!h.awake) return null;
  const to = h.returning ? h.den : R.at;
  if (!to || to === h.at) return null;
  const p = pathTo(g, h.at, to, (x) => !forbidden(g, x));
  const next = p?.[1];
  return next && !forbidden(g, next) ? next : null;
}
// What a move of yours does to it: a Tracker wakes when you walk next to its den, then it counts your moves and steps.
// Returns true if it walked into you.
function hunterMove(s) {
  const R = s.rooms, g = R.graph, h = hunterOf(s);
  if (!h || h.down) return false;
  if (h.held > 0) { h.held--; return false; }
  if (h.kind === 'track' && !h.awake && h.at === h.den && neighbours(g, h.den).includes(R.at)) {
    h.awake = true; h.count = 0;
    say(s, 'The Tracker wakes.', 'rooms-bad');
    return false;
  }
  h.count++;
  if (h.count < paceOf(s)) return false;
  h.count = 0;
  if (h.kind === 'track' && h.awake && !h.returning && (distances(g, h.at)[R.at] ?? 99) >= ROOMS.hunter.lose) {
    h.returning = true;
    say(s, 'The Tracker loses you.', 'rooms-good');
  }
  const next = hunterNext(s, h);
  if (next) { h.at = next; if (h.kind === 'patrol') h.idx = (h.idx + 1) % g.route.length; }
  if (h.kind === 'track' && h.returning && h.at === h.den) { h.returning = false; h.awake = false; say(s, 'The Tracker is back in its den.', 'rooms-good'); }
  return h.at === R.at;
}
// Words for where it is (ls, the room card): "The Patroller is 2 rooms off, in Cache 1, heading for Process 1."
export function hunterLine(s) {
  const R = s.rooms, g = R.graph, h = hunterOf(s);
  if (!h) return '';
  if (h.down) return `The ${HUNTERS[h.kind].name} is down for this visit.`;
  if (h.kind === 'track' && !h.awake) return `The ${HUNTERS[h.kind].name} is asleep in ${g.rooms[h.den].path}.`;
  const d = distances(g, R.at)[h.at] ?? null, where = d == null || d > 3 ? 'far off' : d === 0 ? 'here' : `${d} ${d === 1 ? 'room' : 'rooms'} off`;
  const next = hunterNext(s, h);
  return `The ${HUNTERS[h.kind].name} is ${where}, in ${g.rooms[h.at].path}${next ? `, heading for ${g.rooms[next].path}` : ''}.`;
}

// ---------- the Mule ----------
// A loot mob on a rogue server visit: the world says when one turns up (WORLD.mule, netrooms.mjs), it lives on the
// visit (R.visit.mule: { at, seed, name, state: loose | down | gone, seen, cornered }) and is gone when you leave.
export const muleOf = (s) => { const m = s.rooms?.visit?.mule; return m && m.state === 'loose' && s.rooms.at ? m : null; };
// It goes through any room a live virus doesn't hold (a quiet room, a cleared one, the entry), never into yours.
const muleCan = (s, id) => id !== s.rooms.at && !isUp(s, s.rooms.graph.rooms[id]);
// Where it runs on your next move: the neighbour farthest from you (graph distance), if farther than where it stands.
// null: cornered (or no Mule).
export function muleNext(s, m = muleOf(s)) {
  const R = s.rooms, g = R.graph;
  if (!m || !R.at) return null;
  const d = distances(g, R.at), cur = d[m.at] ?? 0;
  return neighbours(g, m.at).filter((id) => muleCan(s, id) && (d[id] ?? 0) > cur).sort((a, b) => d[b] - d[a] || Number(a.slice(1)) - Number(b.slice(1)))[0] || null;
}
// You see it once its room is one you can see (the fog's rules).
export const muleSeen = (s, m = muleOf(s)) => !!m && seenOf(s, m.at) === 'kind';
// It turns up in the room farthest from you that no live virus holds (the dice among the farthest), named MULE-####.
export function spawnMule(s, seed) {
  const R = s.rooms, d = distances(R.graph, R.at), r = seeded((seed >>> 0) || 1);
  const ok = roomList(s).filter((x) => x.id !== R.at && d[x.id] != null && !isUp(s, x));
  if (!ok.length) return null;
  const far = Math.max(...ok.map((x) => d[x.id])), pool = ok.filter((x) => d[x.id] === far).sort((a, b) => Number(a.id.slice(1)) - Number(b.id.slice(1)));
  R.visit.mule = { at: pool[Math.floor(r() * pool.length)].id, seed: (seed >>> 0) || 1, name: `MULE-${1000 + Math.floor(r() * 9000)}`, state: 'loose', seen: false, cornered: false };
  muleLook(s);
  return R.visit.mule;
}
function muleLook(s) {
  const m = muleOf(s);
  if (!m || m.seen || !muleSeen(s, m)) return;
  m.seen = true;
  say(s, `A Mule hauls a stolen bag through ${s.rooms.graph.rooms[m.at].path}. It runs from you: corner it.`, 'rooms-good');
}
// After each move of yours it runs, or stays put once cornered.
function muleMove(s) {
  const m = muleOf(s);
  if (!m) return;
  const next = muleNext(s, m), was = m.seen;
  if (next) { m.at = next; m.cornered = false; if (was) say(s, `The Mule runs to ${s.rooms.graph.rooms[next].path}.`, 'rooms-cmd'); }
  else if (!m.cornered) { m.cornered = true; if (was) say(s, `The Mule is cornered in ${s.rooms.graph.rooms[m.at].path}.`, 'rooms-good'); }
  muleLook(s);
}
// Words for where it is (ls): "The Mule is 2 rooms off, in Empty 1, running for Stash 2."
export function muleLine(s) {
  const R = s.rooms, m = muleOf(s);
  if (!m || !muleSeen(s, m)) return '';
  const d = distances(R.graph, R.at)[m.at], next = muleNext(s, m);
  return `The Mule is ${d === 1 ? '1 room' : `${d} rooms`} off, in ${R.graph.rooms[m.at].path}${next ? `, running for ${R.graph.rooms[next].path}` : ': cornered'}.`;
}
// Caught: walk into its room and the fight starts. It never fights back hard; it runs out the clock.
function catchMule(s, room, opts) {
  const R = s.rooms, m = muleOf(s);
  say(s, `You corner ${m.name}. Break it before it gets away.`, 'rooms-good');
  R.visit.pending = room.id;
  fight(s, room, { as: 'mule', pause: !!opts.pause });
}

// ---------- a visit ----------
export function connect(s) {
  const R = s.rooms, first = s.serial, now = nowOf();
  if (!R) return [];
  settle(s);
  if (R.at) { deny(s, `You are already on ${R.name}.`); return out(s, first); }
  if (now < R.reconnectAt) { deny(s, `${R.name} won't take you back for ${fmtLeft(R.reconnectAt - now)}.`); return out(s, first); }
  const sig = signalNow(s, now);
  if (sig < Math.ceil(R.max * CONFIG.zone.minSignal)) { deny(s, `You need ${Math.ceil(R.max * CONFIG.zone.minSignal)} Signal to connect. You have ${sig}. It rests back at home.`); return out(s, first); }
  R.max = maxSignal(s);
  R.signal = Math.min(R.max, sig);
  enter(s, now);
  return out(s, first);
}
// In at the entry: a new visit (the network's connect sets up the run first, netrooms.mjs). keys: the vault keys you
// walk in with (a key cracker's, netrooms.mjs).
export function enter(s, now = nowOf(), { keys = [] } = {}) {
  const R = s.rooms;
  if (R.world) R.max = s.run.max;
  R.visits++;
  R.at = R.graph.entry;
  R.inSince = now;
  R.visit = { n: R.visits, walked: { [R.graph.entry]: true }, keys: [...keys], rested: false, moves: 0, hunter: newHunter(s), slipped: false, back: null, xp0: xpTotal(s) };
  R.screen = null;
  look(s);
  clear(s, R.graph.rooms[R.graph.entry], true);
  say(s, `CONNECTED to ${R.name}, visit ${R.visits}.${R.visit.hunter ? ` A ${HUNTERS[R.visit.hunter.kind].name} walks this server.` : ''}`);
  if (R.world) { const seed = ask('mule', s, now); if (seed) spawnMule(s, seed); } // a Mule this visit (netrooms.mjs: rogue servers, your cooldown)
}
// Jack out from any room: home, with the pack banked. A key you didn't use goes back to its post, guard and all.
export function jackOut(s, why = '') {
  const R = s.rooms, first = s.serial;
  settle(s);
  if (!R?.at) { deny(s, 'You are not on the server.'); return out(s, first); }
  if (active(s)) { deny(s, 'No jacking out mid-fight. Win it, or lose the pack.'); return out(s, first); }
  keysBack(s);
  if (R.world) {
    R.last = { result: 'out', xp: xpTotal(s) - R.visit.xp0, banked: s.run.pack.length, visit: R.visit.n };
    goHome(s);
    ask('leave', s, 'out', why);
    return out(s, first);
  }
  const banked = R.pack.length;
  R.banked.push(...R.pack); R.pack = [];
  R.last = { result: 'out', xp: xpTotal(s) - R.visit.xp0, banked, visit: R.visit.n };
  goHome(s);
  say(s, `${why ? `${why} ` : ''}JACKED OUT of ${R.name}.${banked ? ` ${banked} ${banked === 1 ? 'item' : 'items'} banked.` : ''}`, 'jacked-out');
  return out(s, first);
}
// A key you didn't use goes back to its post, guard and all.
function keysBack(s) {
  const R = s.rooms, keys = R.visit?.keys || [];
  for (const vid of keys) { const post = roomList(s).find((x) => x.key === vid); if (post) delete R.down[post.id]; }
  if (keys.length && !R.visit.cracked) say(s, `Your key goes back to ${keys.map((vid) => roomList(s).find((x) => x.key === vid)?.path).filter(Boolean).join(' and ') || 'its elite'}, its guard up again.`, 'rooms-bad');
  if (R.visit) R.visit.keys = [];
}
function goHome(s, R = s.rooms) {
  const now = nowOf();
  R.at = null; R.screen = null; R.homeAt = now; R.reconnectAt = now + ROOMS.reconnect / R.speed;
  R.visit = { ...R.visit, hunter: null, mule: R.visit?.mule?.state === 'loose' ? { ...R.visit.mule, state: 'gone' } : R.visit?.mule || null }; // a Mule you left is gone
}
// Lost a fight: disconnected. The unbanked pack is lost; XP, banked gear and your scripts stay.
function disconnected(s, why) {
  const R = s.rooms, lost = [];
  if (R.world) {
    // The run's end is combat.mjs disconnect (the pack lost; Deadman's Switch jacks you out with it instead).
    R.last = { result: 'lost', why, lost: (s.run?.pack || []).map((f) => f.label || f.name), xp: xpTotal(s) - (R.visit?.xp0 ?? xpTotal(s)), visit: R.visit?.n };
    if (R.at) keysBack(s);
    ask('leave', s, 'lost', why); // Deadman's Switch jacks you out instead (jackOut, home with the pack)
    if (R.at) goHome(s, R);
    return;
  }
  for (const id of R.pack) { const it = stashItem(s, id); if (it) { lost.push(itemLabel(it)); for (const r of Object.values(s.gear?.rigs || {})) if (Array.isArray(r)) for (let i = 0; i < r.length; i++) if (r[i] === id) r[i] = null; s.stash = s.stash.filter((x) => x.id !== id); } }
  R.pack = [];
  keysBack(s);
  R.last = { result: 'lost', why, lost, xp: xpTotal(s) - (R.visit?.xp0 ?? xpTotal(s)), visit: R.visit?.n };
  R.signal = 0;
  goHome(s);
  say(s, `DISCONNECTED. ${why}${lost.length ? ` ${lost.length} unbanked ${lost.length === 1 ? 'item' : 'items'} lost.` : ''}`, 'rooms-bad');
}

// ---------- moving ----------
// The rooms you can walk to from here: linked ones (a Relay's hops too), /core once the vault is open.
export function exits(s) {
  const R = s.rooms;
  if (!R?.at || R.screen || active(s)) return [];
  return neighbours(R.graph, R.at).map((id) => R.graph.rooms[id]).filter((x) => x.kind !== 'core' || coreOpen(s));
}
export const moveCost = (s, room) => (s.rooms.visit?.walked[room.id] ? 0 : Math.max(1, Math.round(s.rooms.max * (s.rooms.floor >= 5 ? ROOMS.moveDeep : ROOMS.move))));
// Walk into a room. opts.pause: a fight starts paused (the browser).
export function go(s, id, opts = {}) {
  const R = s.rooms, first = s.serial;
  if (!R) return [];
  settle(s);
  const room = R.graph.rooms[id] || roomList(s).find((x) => x.dir === id || x.path === id);
  if (!R.at) deny(s, 'You are not on the server. Connect first.');
  else if (active(s)) deny(s, 'Finish the fight first.');
  else if (R.screen?.kind === 'virus') deny(s, `The ${R.screen.name} holds ${hereOf(s).path}. Engage it, or step back.`);
  else if (R.screen?.kind === 'hunter') deny(s, 'The hunter is on you.');
  else if (!room || !neighbours(R.graph, R.at).includes(room.id)) deny(s, room ? `${room.path} is not next to ${hereOf(s).path}.` : `No room ${id}.`);
  else if (room.kind === 'core' && !coreOpen(s)) deny(s, R.world ? `The Core is sealed. ${WORLD.view?.sealed?.(s) || (R.graph.vaults[0] ? `Open the ${R.graph.rooms[R.graph.vaults[0]].path} first.` : '')}`.trim() : `The Core is sealed. Open the ${R.graph.rooms[R.graph.vaults[0]].path} first.`);
  else step(s, room, opts);
  return out(s, first);
}
function step(s, room, opts) {
  const R = s.rooms, cost = moveCost(s, room);
  if (cost) setSig(s, Math.max(1, sigOf(s) - cost));
  R.visit.back = R.at;
  R.at = room.id;
  R.inSince = nowOf();
  if (R.world && s.run) { s.run.cwd = room.path; for (const c of Object.values(s.run.crew || {})) if (c.link === 'you') c.cwd = room.path; } // the run (and your crew) where you are
  R.visit.walked[room.id] = true;
  R.visit.moves++; R.stats.moves++;
  say(s, `→ ${room.path}${cost ? ` (−${cost} Signal)` : ''}`, 'rooms-cmd');
  look(s);
  const h = hunterOf(s);
  if (h && !h.down && h.at === room.id) return meet(s, room, opts);
  if (hunterMove(s)) return meet(s, room, opts);
  if (muleOf(s)?.at === room.id) return catchMule(s, room, opts);
  muleMove(s);
  arrive(s, room, opts);
}
// Stay a move: the hunter takes its step, and you spend nothing.
export function wait(s, opts = {}) {
  const R = s.rooms, first = s.serial;
  settle(s);
  if (!R?.at || active(s) || R.screen) { deny(s, R?.screen ? 'Finish what is in front of you first.' : 'Nothing to wait for.'); return out(s, first); }
  R.visit.moves++; R.stats.moves++;
  say(s, 'wait', 'rooms-cmd');
  if (hunterMove(s)) meet(s, hereOf(s), opts);
  else { muleMove(s); const line = hunterLine(s); if (line) say(s, line); }
  return out(s, first);
}
// Step back out of a fight room you walked into (the move in is spent).
export function back(s, opts = {}) {
  const R = s.rooms, first = s.serial;
  settle(s);
  if (R.screen?.kind !== 'virus' || !R.visit.back) { deny(s, 'Nothing to step back from.'); return out(s, first); }
  const to = R.graph.rooms[R.visit.back];
  R.screen = null;
  step(s, to, opts);
  return out(s, first);
}
// What a room does when you walk in: a live virus holds it, the rest wait for your verbs.
function arrive(s, room, opts = {}) {
  const R = s.rooms;
  const people = R.world ? ask('people', s, room) || [] : [];
  if (people.length) say(s, `${people.join(', ')} ${people.length === 1 ? 'is' : 'are'} here.`, 'rooms');
  if (['junction', 'den', 'empty'].includes(room.kind)) clear(s, room);
  if (room.kind === 'purse' && cacheFull(s, room)) takePurse(s, room); // a rogue server's Stash: taken as you walk in
  if (isUp(s, room)) {
    const f = fightOf(s, room), v = encounterVirus(s, f.key, f.seed, f.opts), name = f.name || v.name;
    R.screen = { kind: 'virus', room: room.id, name, pause: !!opts.pause };
    say(s, `${name} holds ${room.path}.${R.rare[room.id] ? ' A rare spawn.' : ''}`, 'intrusion');
  }
}
function meet(s, room, opts = {}) {
  const R = s.rooms, h = hunterOf(s);
  R.stats.hunted++;
  say(s, `The ${HUNTERS[h.kind].name} is on you.`, 'rooms-bad');
  if (classOf(s) === 'infiltrator' && !R.visit.slipped) { R.screen = { kind: 'hunter', room: room.id, pause: !!opts.pause }; return; }
  R.visit.pending = room.id;
  fight(s, room, { as: 'hunter', pause: !!opts.pause });
}

// ---------- the verbs ----------
// One entry point for the page's buttons, the terminal and the bot: act(s, verb, arg). Events out.
export function act(s, verb, arg = null, opts = {}) {
  const R = s.rooms, first = s.serial;
  if (!R) return [];
  settle(s);
  if (verb === 'go') return go(s, arg, opts);
  if (verb === 'connect') return connect(s);
  if (verb === 'jackout') return jackOut(s);
  if (verb === 'wait') return wait(s, opts);
  if (verb === 'back') return back(s, opts);
  if (verb === 'bossrule') { setBossRule(s, arg); return out(s, first); }
  const here = hereOf(s);
  if (!here) { deny(s, 'You are not on the server. Connect first.'); return out(s, first); }
  if (active(s)) { deny(s, 'Finish the fight first.'); return out(s, first); }
  const sc = R.screen;
  if (sc?.kind === 'hunter') {
    if (verb === 'slip') { R.visit.slipped = true; R.screen = null; say(s, `You slip past the ${HUNTERS[hunterOf(s).kind].name}.`, 'rooms-good'); hunterOf(s).held = 1; arrive(s, here, opts); }
    else if (verb === 'engage' || verb === 'fight') { R.screen = null; R.visit.pending = here.id; fight(s, here, { as: 'hunter', pause: !!opts.pause || !!sc.pause }); }
    else deny(s, 'Fight it, or slip past it.');
    return out(s, first);
  }
  if (verb === 'engage') {
    if (sc?.kind !== 'virus') deny(s, 'Nothing here to fight.');
    else { R.screen = null; fight(s, here, { pause: !!opts.pause || !!sc.pause }); }
    return out(s, first);
  }
  if (sc?.kind === 'virus') { deny(s, `The ${sc.name} holds this room. Engage it, or step back.`); return out(s, first); }
  if (verb === 'cat' && here.kind === 'cache') {
    if (!cacheFull(s, here)) deny(s, `The cache is empty. It refills in ${fmtLeft(refillAt(s, here) - nowOf())}.`);
    else { R.read = { ...(R.read || {}), [here.id]: R.spawns[here.id] || 0 }; say(s, here.mirror ? "It's a mirror. An elite waits behind it." : isBait(s, here) ? `Bait: a canary in every block. Taking it costs ${Math.round(R.max * ROOMS.bait)} Signal.` : 'Clean: credits and code.', isBait(s, here) || here.mirror ? 'rooms-bad' : 'rooms'); }
    return out(s, first);
  }
  if ((verb === 'pull' || verb === 'pull all') && here.kind === 'cache') { pull(s, here, opts); return out(s, first); }
  if ((verb === 'pull' || verb === 'pull all') && here.kind === 'stash') { if (!cacheFull(s, here)) deny(s, `The stash is empty. It fills again in ${fmtLeft(refillAt(s, here) - nowOf())}.`); else { ask('stash', s, here); R.taken[here.id] = nowOf(); clear(s, here); } return out(s, first); }
  if ((verb === 'pull' || verb === 'pull all') && here.kind === 'vault' && R.world && opened(s, here)) { if (!ask('pull', s, here)) deny(s, 'Nothing left in the vault.'); return out(s, first); }
  if ((verb === 'pull' || verb === 'pull all') && here.kind === 'entry' && R.world) { if (!ask('entryPull', s)) deny(s, 'Nothing here to take.'); return out(s, first); }
  if ((verb === 'open' || verb === 'force') && here.kind === 'vault') { openVault(s, here, verb === 'force'); return out(s, first); }
  if (verb === 'rest' && here.kind === 'rest') {
    if (R.visit.rested) deny(s, 'You already rested this visit.');
    else if (sigOf(s) >= R.max) deny(s, 'Your Signal is full. Your rest keeps for later this visit.');
    else { const n = Math.min(R.max - sigOf(s), Math.round(R.max * ROOMS.rest)); setSig(s, sigOf(s) + n); R.visit.rested = true; clear(s, here); say(s, `You rest: +${n} Signal.`, 'rooms-good'); }
    return out(s, first);
  }
  deny(s, `${verb}: nothing here takes that.`);
  return out(s, first);
}
// A Mirror's mirrored cache: pulling it breaks the mirror, and the elite behind it steps out (each time it refills).
// Beat it and what the cache held is yours.
function pull(s, room, opts) {
  const R = s.rooms;
  if (!cacheFull(s, room)) return deny(s, `The cache is empty. It refills in ${fmtLeft(refillAt(s, room) - nowOf())}.`);
  if (room.mirror) { say(s, 'The mirror breaks. An elite steps out.', 'rooms-bad'); R.screen = null; return fight(s, room, { as: 'mirror', pause: !!opts.pause }); }
  takeCache(s, room);
}
function takeCache(s, room) {
  const R = s.rooms, r = rnd(R, 21), C = ROOMS.cache, rich = (R.world && ask('cacheMult', s, room)) || 1;
  if (isBait(s, room)) { const lost = Math.round(R.max * ROOMS.bait); setSig(s, Math.max(1, sigOf(s) - lost)); say(s, `The canary costs you ${lost} Signal.`, 'rooms-bad'); }
  const credits = Math.round((C.credits[0] + Math.floor(r() * (C.credits[1] - C.credits[0] + 1))) * rich * (1 + R.level / 20));
  const fam = roomList(s).find((x) => x.family)?.family, kind = { ransomware: 'cipher', worm: 'worm', ghostroot: 'kernel', trojan: 'worm', cryptominer: 'cipher', wiper: 'cipher' }[fam] || 'cipher';
  const code = C.code[0] + Math.floor(r() * (C.code[1] - C.code[0] + 1));
  if (R.world) ask('cache', s, room, { credits, code, material: kind }); // into the pack: banked when you jack out
  else { R.credits += credits; s.server.credits += credits; gainCode(s, { [kind]: code }, 'Cache: '); }
  say(s, `You take the cache: ${credits} credits and ${code} ${kind} code.`, 'rooms-good');
  if (r() < C.script) giveScript(s, rollScript(r), 'Cache: ');
  R.taken[room.id] = nowOf();
  R.spawns[room.id] = (R.spawns[room.id] || 0) + 1;
  clear(s, room);
}
// A Stash (a rogue server's quiet room): a few credits, now and then a code, full again when the server reboots.
function takePurse(s, room) {
  const R = s.rooms, got = (R.world ? ask('purse', s, room) : null) || { credits: ROOMS.purse(R.level), code: 0 };
  if (!R.world) { R.credits += got.credits; s.server.credits += got.credits; }
  say(s, `Stash: +${got.credits} credits${got.code ? ` and ${got.code} ${got.material} code` : ''}.`, 'rooms-good');
  R.taken[room.id] = nowOf();
  R.spawns[room.id] = (R.spawns[room.id] || 0) + 1;
  clear(s, room, true);
}
function openVault(s, room, force) {
  const R = s.rooms;
  if (opened(s, room)) return deny(s, 'The vault is already open.');
  const has = R.visit.keys.indexOf(room.id), may = R.world ? ask('canOpen', s, room) : undefined;
  if (may === false) return deny(s, room.locked || 'It won\'t open yet.');
  if (!force && has < 0 && !may) return deny(s, `No key. It's in ${roomList(s).find((x) => x.key === room.id)?.path || 'an elite'}, or force the door for ${Math.round(R.max * ROOMS.force)} Signal.`);
  if (force && !may) { const lost = Math.round(R.max * ROOMS.force); setSig(s, Math.max(1, sigOf(s) - lost)); say(s, `You force the door: −${lost} Signal.`, 'rooms-bad'); }
  else if (may) say(s, 'The vault opens.', 'rooms-good');
  else { R.visit.keys.splice(has, 1); say(s, 'The key opens the vault.', 'rooms-good'); }
  R.opened[room.id] = nowOf();
  const v = room.loot || { kind: 'gear', rarity: 'tuned' };
  if (R.world && ask('vault', s, room)) { /* the server's own vault: its files go in the pack (netrooms.mjs) */ }
  else if (v.kind === 'gear') { const it = addItem(s, rollItem(rnd(R, 5), { level: R.level, rarity: v.rarity, cls: classOf(s) }), 'Vault: '); if (it) { if (R.world) ask('packItem', s, it); else R.pack.push(it.id); say(s, `${itemLabel(it)} goes in your pack.`, 'rooms-good'); } }
  else giveScript(s, v.script, 'Vault: ');
  clear(s, room);
  if (room.id === R.graph.vaults[0]) say(s, 'The Core unseals.', 'rooms-bad');
}

// ---------- fights ----------
// What a room's fight is: [key, seed, opts] for selectEncounter, and its name and kind of size.
export function fightOf(s, room, as = null) {
  if (as === 'mule') return muleFight(s, room);
  const w = world(s) && as !== 'hunter' ? ask('fight', s, room, as) : undefined;
  if (w) return w;
  const R = s.rooms, n = R.spawns[room.id] || 0, rare = !as && !!R.rare[room.id], level = (R.world ? ask('level', s) ?? R.level : R.level) + (rare ? ROOMS.rareLevel : 0);
  const seed = ((room.seed + n * 7919) >>> 0) || 1;
  if (as === 'hunter') {
    const body = HUNTERS[hunterOf(s)?.kind || R.graph.hunter]?.body || 'tracer';
    return { key: body, seed: (room.seed ^ 0x7ace) >>> 0, opts: { mode: 'run', room: room.path, level: R.level + ROOMS.hunter.level, name: `${HUNTERS[hunterOf(s)?.kind || 'track'].name.toUpperCase()} ICE` }, size: 'hunter', name: `${HUNTERS[hunterOf(s)?.kind || 'track'].name.toUpperCase()} ICE`, level: R.level + ROOMS.hunter.level, family: null, author: 'kestrel' };
  }
  if (room.kind === 'guard') return { key: room.guard, seed, opts: { mode: 'run', room: room.path, level }, size: 'guard', name: GUARDS[room.guard].name.toUpperCase(), level, family: room.guard, author: GUARDS[room.guard].ice ? 'kestrel' : null };
  if (room.kind === 'core') return { key: 'random', seed, opts: { mode: 'run', room: room.path, level, family: BOSSES[RESIDENT].family, boss: RESIDENT, mutation: null, name: BOSSES[RESIDENT].name, author: R.author }, size: 'boss', name: BOSSES[RESIDENT].name, level, family: BOSSES[RESIDENT].family, author: R.author };
  // A wild virus: its room's family, author, third part and set, and a mutation fresh with each respawn (one at most).
  const elite = room.kind === 'elite' || as === 'mirror';
  const r = seeded((seed * 31 + 5) >>> 0), mut = level >= 4 && r() < SERVER.mutationChance(level) ? ROLLED_MUTATIONS[Math.floor(r() * ROLLED_MUTATIONS.length)] : null;
  const genes = [room.third].filter(Boolean);
  const opts = { mode: 'run', room: room.path, level, family: room.family, author: room.author, mutation: mut, genes, ...(elite ? { elite: true, eliteHp: ROOMS.eliteHp } : {}) };
  return { key: 'random', seed, opts, size: elite ? 'elite' : 'process', name: null, level, family: room.family, author: room.author, set: room.pin || spawnSet(room.family, room.author, seed), mutation: mut, elite, rare };
}
// The Mule's fight: a weak, quick runner at the server's level, its name its own (MULE-####), no set, no mutation.
function muleFight(s, room) {
  const R = s.rooms, m = R.visit?.mule || { seed: room.seed, name: 'MULE' }, level = (R.world ? ask('level', s) ?? R.level : R.level);
  return { key: 'random', seed: m.seed, opts: { mode: 'run', room: room.path, level, family: 'mule', mutation: null, genes: [], name: m.name, author: null }, size: 'mule', name: m.name, level, family: 'mule', author: null, set: null };
}
// Each spawn rolls its own attack set (4.1: "every virus rolls one when it spawns"), weighted by its author, so the same
// room can open with its Encryptor one visit and its Pulse Node the next. Seeded by the spawn: the card and the fight agree.
// room.pin holds one set for every spawn (tests).
export const spawnSet = (family, author, seed) => (setsOf(family) ? rollSet(family, author, seeded((seed ^ 0x5e75) >>> 0)) : null);
// A virus's name before you fight it (the room card): the same build the fight makes, built and thrown away.
export function virusName(s, room, as = null) {
  const f = fightOf(s, room, as);
  if (f.name) return f.name;
  return encounterVirus(s, f.key, f.seed, f.opts).name;
}
export function fight(s, room, { pause = false, as = null } = {}) {
  const R = s.rooms;
  s.encounter = null;
  if (R.world) {
    // The run carries on: your Signal is its integrity (the heal cap at what you walked in with).
    R.max = s.run.max;
    s.run.integrity = Math.min(s.run.integrity, s.run.max);
    R.fightFrom = s.run.integrity;
    s.run.cwd = room.path;
    for (const c of Object.values(s.run.crew || {})) if (c.link === 'you') c.cwd = room.path; // your crew is with you
  } else {
    R.max = maxSignal(s);
    R.signal = Math.min(R.signal, R.max);
    R.fightFrom = R.signal;
    s.run = { loc: 'rooms', rooms: true, cwd: room.path, integrity: R.signal, max: R.max, pack: [], visited: [room.path] };
  }
  const f = fightOf(s, room, as);
  selectEncounter(s, f.key, f.seed, { ...f.opts, quiet: true });
  const e = s.encounter;
  if (!e) return;
  const v = e.virus;
  e.rooms = { room: room.id, kind: R.kind, as, size: f.size, rare: !!f.rare };
  // Its size in a room, its attack set, Spam on a Mailhub's queue. Its tells come by level (tells.mjs, 3.5).
  const S = f.size === 'raw' ? { hp: 1, dmg: 1 } : ROOMS.size[f.size] || ROOMS.size.process; // raw: a crew boss or its packs, sized for a crew already
  v.roomHp = S.hp; v.roomDmg = S.dmg;
  for (const p of v.parts) {
    p.max = p.integrity = Math.max(1, Math.round(p.max * S.hp));
    const a = p.attack;
    if (a && ['damage', 'encrypt'].includes(a.effect)) a.amount = Math.max(1, Math.round(a.amount * S.dmg));
    if (a?.hit) a.hit = Math.max(1, Math.round(a.hit * S.dmg));
    if (a?.rampBy) a.rampBy = Math.max(1, Math.round(a.rampBy * S.dmg));
  }
  // Its timing, fresh each fight (a boss's and crew content's stay fixed, so they can be learned): its set, if its family has them (a wild
  // room's spawn rolls one here), and each part's first attack nudged up to a cycle either way.
  const fresh = !v.boss && !v.raid && f.size !== 'raw'; // crew content (the farm's packs and bosses) is tuned on its own timing
  const set = fresh ? (f.set !== undefined ? f.set : spawnSet(v.family, f.author, f.seed)) : null;
  if (set) { applySet(v, set, seeded((f.seed ^ 0x5e7) >>> 0)); R.codex[`${v.family}:${set}`] = true; logSet(s, v.family, set); }
  else if (fresh) jitterFirst(v, seeded((f.seed ^ 0x5e7) >>> 0));
  if (room.queue && R.kind === 'Mailhub' && as !== 'hunter' && as !== 'mule') spamFlood(s, e);
  if (as === 'mule') { e.escapeAt = CONFIG.mule.escape; for (const p of v.parts) { p.armor = p.maxArmor = Math.min(p.maxArmor, 1); p.patchAt = null; } } // still up after its cycles: it gets away (combat.mjs cycleClose); a runner wears 1 ◆ at most
  if (v.boss && !v.raid) bossRule(s, R.bossRule || s.bossRule || 'a');
  armTicks(s);
  if (v.elite && !v.boss) e.enrageAt = 9;
  e.roomsXp = ROOMS.xp.room * (as === 'hunter' ? ROOMS.xp.hunter : room.kind === 'core' ? ROOMS.xp.boss : f.rare ? ROOMS.xp.rare : 1) * (f.xp || 1);
  if (R.world && !as) e.xpKind = ask('xpKind', s, room); // what its XP counts as in your mix (netrooms.mjs)
  if (v.boss) R.stats.boss.tries++;
  R.stats.fights++;
  say(s, `You engage ${v.name}.${set ? ` ${setName(v.family, set)} set.` : ''}`, 'intrusion');
  command(s, 'engage');
  if (pause && s.encounter) s.encounter.paused = true;
}
// A Mailhub's queue: a weak part that hits quick (about a twelfth of the virus's Integrity, a quarter of its hits).
function spamFlood(s, e) {
  const total = e.virus.parts.reduce((n, p) => n + p.max, 0), hits = e.virus.parts.filter((p) => p.attack).map((p) => p.attack.amount || 0).filter(Boolean);
  const hp = Math.max(8, Math.round(total * 0.08)), dmg = Math.max(2, Math.round((hits.reduce((a, x) => a + x, 0) / Math.max(1, hits.length)) * 0.25));
  e.virus.parts.push({ id: 'spam', name: 'Spam Flood', kind: 'system', integrity: hp, max: hp, armor: 0, maxArmor: 0, patchAt: null, veiled: false, loot: null, special: false, spam: true, attack: { name: 'Junk Mail', effect: 'damage', amount: dmg, interval: 3, due: 2 }, exposedUntil: 0, lastDamaged: 0, boosted: false });
  emit(s, 'status', `A Spam Flood joins the fight: ${hp} Integrity, ${dmg} damage every 3 cycles.`, { target: 'spam' });
}
// After a fight: your Signal back on the server (never over what you started it with), and the fight cleared away.
export function settle(s) {
  const R = s.rooms;
  if (!R || !s.run?.rooms || active(s)) return;
  if (R.world) {
    // A fight that ended: what it leaves you (never over what you walked in with), and the board cleared away.
    if (R.fightFrom != null) s.run.integrity = Math.max(1, Math.min(s.run.max, s.run.integrity, R.fightFrom));
    R.fightFrom = null;
    R.max = s.run.max;
    if (s.encounter?.rooms) s.encounter = null;
    return;
  }
  if (R.at) R.signal = Math.max(1, Math.min(s.run.max, s.run.integrity, R.fightFrom ?? s.run.max));
  R.max = s.run.max;
  s.run = null;
  if (s.encounter?.rooms) s.encounter = null;
}
// The end of a room fight (combat.mjs finish, hooks.roomEnd).
hooks.roomEnd = (s, result) => {
  const R = s.rooms, e = s.encounter, room = R?.graph.rooms[e?.rooms?.room];
  if (!R || !room) return;
  const as = e.rooms.as, kind = as === 'hunter' ? 'hunter' : e.rooms.size;
  R.stats.cycles += e.cycle;
  R.stats.cuts += e.metrics.cuts || 0; R.stats.wasted += e.metrics.wasted || 0; R.stats.ticks += e.metrics.ticks || 0;
  const lost = Math.max(0, (R.fightFrom ?? 0) - Math.max(0, s.run.integrity));
  (R.stats.signalBy[kind] ||= []).push(lost / Math.max(1, R.max));
  const fam = ((R.stats.fam ||= {})[as === 'hunter' ? 'hunter' : e.virus.boss ? 'boss' : (e.virus.elite ? 'elite ' : '') + e.virus.family] ||= { n: 0, won: 0, lost: 0, cycles: 0 });
  fam.n++; fam.won += result === 'victory' ? 1 : 0; fam.lost += lost / Math.max(1, R.max); fam.cycles += e.cycle;
  if (as === 'mule') {
    const m = R.visit?.mule;
    if (m) m.state = result === 'victory' ? 'down' : 'gone';
    if (result === 'escaped') {
      say(s, `${e.virus.name} gets away with its bag.`, 'rooms-bad');
      const pending = R.visit.pending;
      R.visit.pending = null;
      if (pending && R.at) arrive(s, R.graph.rooms[pending]);
      return;
    }
  }
  if (result !== 'victory') {
    R.stats.lost++;
    if (as !== 'hunter' && as !== 'mule') (R.stats.lostAt ||= {})[room.id] = (R.stats.lostAt[room.id] || 0) + 1;
    if (R.world && as !== 'mule') ask('lost', s, room, e, result);
    if (result === 'fled') return; // jacked out mid-fight (the emergency escape): the run ends as a jack out
    return disconnected(s, `${e.virus.name} took your Signal to 0 in ${room.path}.`);
  }
  R.stats.won++;
  if (e.virus.boss) R.stats.boss.won++;
  setSig(s, Math.max(1, Math.min(s.run.max, s.run.integrity, R.fightFrom ?? s.run.max)));
  if (e.roomsLoot?.credits) { if (R.world) s.run.pack.push({ path: `${room.path}/#loot-${s.serial}`, name: 'loot.dat', kind: 'credits', amount: e.roomsLoot.credits }); else { R.credits += e.roomsLoot.credits; s.server.credits += e.roomsLoot.credits; } }
  if (as === 'mule') {
    say(s, `${e.virus.name} is down. Its bag is yours.`, 'rooms-good');
    if (R.world) ask('muleWon', s, room, e);
    const pending = R.visit.pending;
    R.visit.pending = null;
    if (pending) arrive(s, R.graph.rooms[pending]);
    return;
  }
  if (as === 'hunter') {
    const h = hunterOf(s);
    if (h) h.down = true;
    say(s, `${HUNTERS[h?.kind || 'track'].name} down for this visit.`, 'rooms-good');
    giveScript(s, rollScript(rnd(R, 17)), 'The hunter carried: ');
    if (room.kind === 'den') clear(s, room);
    const pending = R.visit.pending;
    R.visit.pending = null;
    if (pending) arrive(s, R.graph.rooms[pending]);
    return;
  }
  if (as === 'mirror') {
    drops(s, room, e, false);
    say(s, 'The mirror is down.', 'rooms-good');
    if (R.world) ask('won', s, room, e, { first: false, rare: false, mirror: true });
    return takeCache(s, room);
  }
  R.down[room.id] = nowOf();
  R.spawns[room.id] = (R.spawns[room.id] || 0) + 1;
  const wasRare = !!R.rare[room.id], first = !R.cleared[room.id];
  // One respawn in ten is a rare spawn: it waits until you kill it (a held server's Root 5, a Legacy server's twice).
  R.rare[room.id] = FIGHTS.includes(room.kind) && !['core', 'boss'].includes(room.kind) && !room.wild && rnd(R, 31)() < ROOMS.rare * ((R.world && ask('rare', s)) || 1);
  // First clear: half that fight's XP again (7.2).
  if (!R.cleared[room.id]) {
    const xp = Math.round(xpFor(s, e.virus.level, (e.roomsXp || 1) * ROOMS.xp.first * (e.virus.elite ? ELITE.xp : 1)));
    gainXp(s, xp, `${room.path} first clear`, 'breakin'); // progress on a server: exploration XP, like the old break-ins
    clear(s, room);
  }
  // The key: beat the guard while its vault is shut and it goes in your pack, for this visit.
  if (room.kind === 'guard' && room.key && !R.opened[room.key] && !R.visit.keys.includes(room.key)) { R.visit.keys.push(room.key); say(s, `You take the ${R.graph.rooms[room.key].path} key.`, 'rooms-good'); }
  drops(s, room, e, wasRare);
  if (R.world) ask('won', s, room, e, { first, rare: wasRare });
  else if (room.kind === 'core') say(s, `${BOSSES[RESIDENT].name} falls.`, 'rooms-good');
};
// XP the playtest character has earned in all (its level's bars and what's in the current one): the server card's
// count is the difference since you started.
export const xpTotal = (s) => { const h = hackerOf(s); let n = h.xp; for (let l = 1; l < h.level; l++) n += xpToNext(l); return n; };
export const xpEarned = (s) => xpTotal(s) - (s.rooms?.xpStart ?? xpTotal(s));
// What a won fight drops into the pack: gear now and then (an elite always a blue or better, a rare spawn three
// rolls), the Resident a blue or better and a script half the time.
function drops(s, room, e, rare) {
  const R = s.rooms, lvl = e.virus.level;
  if (R.world) return ask('drops', s, room, e, rare);
  let it = null;
  if (room.kind === 'core') {
    it = rollItem(rnd(R, 41), { level: lvl, rarity: rnd(R, 42)() < 0.25 ? 'custom' : 'tuned', cls: classOf(s) });
    if (rnd(R, 43)() < 0.5) giveScript(s, rollScript(rnd(R, 44), 'uncommon'), `${BOSSES[RESIDENT].name} drops: `);
  } else it = rollDrop(s, { kind: room.kind === 'guard' ? 'guard' : 'home', family: e.virus.family, elite: !!e.virus.elite, rolls: rare ? ROOMS.rareRolls : undefined }, lvl);
  if (it) { const x = addItem(s, it, 'Dropped: '); if (x) { R.pack.push(x.id); say(s, `${itemLabel(x)} goes in your pack.`, 'rooms-good'); } }
  if (e.virus.elite && rnd(R, 45)() < 0.25) giveScript(s, rollScript(rnd(R, 46)), 'The elite carried: ');
}
// The boss rule, switched mid-session (developer bossrule a|b|c, the core's card): the next fight with the Resident.
export function setBossRule(s, rule) {
  const R = s.rooms;
  if (!BOSS_RULES[rule]) return deny(s, 'bossrule: a, b or c.');
  if (R && !R.world) R.bossRule = rule;
  else s.bossRule = rule; // the network: every boss fight from now on (interrupt.mjs prepareTicks), saved with you
  say(s, `Boss rule ${rule}: ${BOSS_RULES[rule].name}.`, 'rooms-good');
  return rule;
}

// ---------- the clock ----------
// Every second (app.js) and before every action: the rooms that came back this visit say so.
export function tick(s, now = nowOf()) {
  const R = s.rooms;
  if (!R) return [];
  const first = s.serial;
  for (const room of roomList(s)) {
    if (!FIGHTS.includes(room.kind) || R.down[room.id] == null) continue;
    if (isUp(s, room, now) && !R.back?.[room.id]) {
      (R.back ||= {})[room.id] = true;
      if (R.at) say(s, `${room.path} respawns${R.rare[room.id] ? ': a rare spawn' : ''}.`, 'rooms-bad');
    }
    if (!isUp(s, room, now) && R.back?.[room.id]) delete R.back[room.id];
  }
  return out(s, first);
}

// ---------- the terminal (2.3) ----------
const tagOf = (s, room) => {
  const seen = seenOf(s, room.id);
  if (seen !== 'kind') return '??';
  const up = isUp(s, room), left = up ? '' : backAt(s, room) != null ? ` · ↻ ${fmtLeft(backAt(s, room) - nowOf())}` : '';
  if (room.wild || room.kind === 'boss' || (room.kind === 'core' && s.rooms.world)) {
    // On the network: who holds it, by name or family (netrooms.mjs), or that it's down.
    const f = up && (room.kind !== 'core' || coreOpen(s)) ? fightOf(s, room) : null, who = f ? f.name || `${f.elite ? 'elite ' : ''}${familyName(f.family) || f.family}` : '';
    return `${room.kind === 'boss' ? 'boss' : room.kind === 'core' ? 'core' : 'fight'}${who ? ` · ${who} lv ${f.level}` : ''}${room.kind === 'core' && !coreOpen(s) ? ' · sealed' : left}`;
  }
  if (room.kind === 'stash' || room.kind === 'purse') return `stash${cacheFull(s, room) ? '' : ` · ↻ ${fmtLeft(refillAt(s, room) - nowOf())}`}`;
  if (room.kind === 'core') return `core · ${BOSSES[RESIDENT].name}${coreOpen(s) ? '' : ' · sealed'}`;
  if (room.kind === 'guard') return `elite · ${GUARDS[room.guard].name}${room.key && !s.rooms.opened[room.key] ? ' · key' : ''}${up ? '' : ` · ↻ ${fmtLeft(backAt(s, room) - nowOf())}`}`;
  if (['process', 'elite'].includes(room.kind)) return `${room.kind} · ${familyName(room.family)} · ${(AUTHORS[room.author]?.name || '').toUpperCase()}${up ? '' : ` · ↻ ${fmtLeft(backAt(s, room) - nowOf())}`}`;
  if (room.kind === 'cache') return `cache${cacheFull(s, room) ? '' : ` · ↻ ${fmtLeft(refillAt(s, room) - nowOf())}`}`;
  if (room.kind === 'vault') return `vault${opened(s, room) ? ' · open' : ''}`;
  return room.kind;
};
export function roomsCommand(s, text) {
  const R = s.rooms, first = s.serial;
  const [word, ...rest] = text.trim().toLowerCase().split(/\s+/), arg = rest.join(' ');
  if (!R) return null;
  if (word === 'connect' && !R.at) return connect(s);
  if (word === 'jack' && arg === 'out') return jackOut(s);
  if (word === 'ls') {
    if (!R.at) { say(s, 'You are home. Type connect.', 'rooms-out'); return out(s, first); }
    const here = hereOf(s), xs = neighbours(R.graph, R.at).map((id) => R.graph.rooms[id]);
    const who = (x) => { const p = R.world ? ask('people', s, x) || [] : []; return p.length ? `  · ${p.join(', ')}` : ''; }; // who else is in there (SPRAWL-00 is shared)
    const lines = [`${here.path}  [${here.kind}]${who(here)}`, ...xs.map((x, i) => `${i + 1}  ${seenOf(s, x.id) === 'kind' ? x.path : '??'}  [${tagOf(s, x)}]${moveCost(s, x) ? '' : '  walked'}${seenOf(s, x.id) === 'kind' ? who(x) : ''}`)];
    const h = hunterLine(s), mule = muleLine(s);
    say(s, [...lines, ...(h ? [h] : []), ...(mule ? [mule] : [])].join('\n'), 'rooms-out');
    return out(s, first);
  }
  if (word === 'cd' || word === 'go') {
    if (!R.at) { deny(s, 'Connect first.'); return out(s, first); }
    const xs = neighbours(R.graph, R.at).map((id) => R.graph.rooms[id]);
    let room = null;
    if (arg === '..' && R.screen?.kind === 'virus') return back(s); // a virus holds the room: cd .. steps back out
    if (arg === '..') { const d = distances(R.graph, R.graph.entry); room = xs.sort((a, b) => d[a.id] - d[b.id])[0]; }
    else room = /^\d+$/.test(arg) ? xs[Number(arg) - 1] : xs.find((x) => x.dir === arg.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || x.id === arg);
    // A wild server's rooms are its folders (netrooms.mjs): cd var, cd log, cd /var/log, cd ../tmp walk the tree, a room
    // at a time, stopping where something holds the way.
    if (!room && R.world) { const t = folderRoom(s, arg); if (t) return t.id === R.at ? out(s, first) : walkTo(s, t.id); }
    return room ? go(s, room.id) : (deny(s, `cd: ${arg || '?'}: not next to you. Type ls.`), out(s, first));
  }
  if (word === 'map' || word === 'tree') { say(s, treeLines(s).join('\n'), 'rooms-out'); return out(s, first); }
  if (word === 'wait') return wait(s);
  if (word === 'back') return back(s);
  if (['engage', 'fight', 'cat', 'pull', 'open', 'force', 'rest', 'slip'].includes(word)) return act(s, word === 'pull' && arg === 'all' ? 'pull' : word);
  if (word === 'developer' && rest[0] === 'bossrule') { setBossRule(s, rest[1]); return out(s, first); }
  if (word === 'developer' && rest[0] === 'mule') { // with ?dev (app.js): a Mule now, cooldown or not
    if (!R.at || active(s) || muleOf(s)) deny(s, 'developer mule: on a server, out of a fight, with no Mule loose.');
    else if (!spawnMule(s, ((R.seed * 31 + R.visits * 7919 + R.visit.moves) >>> 0) || 1)) deny(s, 'developer mule: no room for one.');
    else say(s, `${muleOf(s).name} is in ${R.graph.rooms[muleOf(s).at].path}.`, 'rooms-good');
    return out(s, first);
  }
  return null;
}
// A folder named as a path (absolute, or from the room you're in), for a wild server's rooms (room.path0).
function folderRoom(s, arg) {
  const here = hereOf(s), base = here?.path0 ?? '/';
  const parts = (arg.startsWith('/') ? arg : `${base}/${arg}`).split('/').filter(Boolean), out = [];
  for (const p of parts) { if (p === '..') out.pop(); else if (p !== '.') out.push(p); }
  const want = '/' + out.join('/');
  return roomList(s).find((x) => (x.path0 ?? (x.kind === 'entry' ? '/' : null)) === want) || null;
}
// Walk to a room by its name (a crewmate's room: run.mjs).
export function walkToRoom(s, name) {
  const R = s.rooms, room = roomList(s).find((x) => x.path === name);
  if (!R?.at || !room || room.id === R.at) return [];
  return walkTo(s, room.id);
}
// Walk to a room you've seen, a step at a time (each step a move: its Signal, the hunter, what holds the room).
function walkTo(s, id) {
  const R = s.rooms, first = s.serial, path = pathTo(R.graph, R.at, id, (x) => !!seenOf(s, x)) || [];
  if (path.length < 2) { deny(s, `cd: no way to ${R.graph.rooms[id].path} from here that you've seen.`); return out(s, first); }
  for (const next of path.slice(1)) {
    const was = R.at;
    go(s, next);
    if (R.at !== next || R.at === was || R.screen || active(s)) break;
  }
  return out(s, first);
}
// The room graph you've seen, as lines: each room, its links.
export function treeLines(s) {
  const R = s.rooms, lines = [`/ ${R.name} · rooms ${progressOf(s).done}/${progressOf(s).total}`];
  const d = distances(R.graph, R.graph.entry);
  for (const room of roomList(s).filter((x) => seenOf(s, x.id)).sort((a, b) => d[a.id] - d[b.id])) {
    const mark = R.at === room.id ? '@' : hunterOf(s)?.at === room.id && !hunterOf(s).down ? 'H' : muleOf(s)?.at === room.id && muleSeen(s) ? 'M' : seenOf(s, room.id) === 'kind' ? MARKS[room.kind] : '?';
    const to = neighbours(R.graph, room.id).filter((x) => seenOf(s, x)).map((x) => R.graph.rooms[x].path);
    lines.push(`${'  '.repeat(Math.min(4, d[room.id]))}${mark} ${room.path}${R.cleared[room.id] ? ' ✓' : ''}  → ${to.join(' ')}`);
  }
  return lines;
}

// ---------- your character, for the playtest ----------
// A class at a level with its subclass, its talents spent as a player would, and a blue protocol in every open slot
// (the breach playtest's outfit, here so the room playtest doesn't lean on breach code).
const fillOrder = (F) => [[F[0][0].id, 3], ['c0'], [F[1][0].id, 3], [F[1][1].id, 1], ['c1'], [F[2][0].id, 3], [F[2][1].id, 2], ['c2'], [F[0][1].id, 3], [F[1][1].id, 2], [F[2][1].id, 1]];
export function outfit(s, { cls = 'breaker', level = 10, sub = null, rarity = 'tuned', gearSeed = 0 } = {}) {
  s.loadout.archetype = ARCHETYPES[cls] ? cls : 'breaker';
  cls = s.loadout.archetype;
  s.hackers = { [cls]: { level, xp: 0 } };
  const pickSub = level >= SUBCLASS.from ? (SUBS[sub]?.cls === cls ? sub : defaultSub(cls)) : null, kit = SUBS[pickSub];
  if (pickSub) s.loadout.sub = { ...(s.loadout.sub || {}), [cls]: pickSub };
  if (kit) {
    let left = level < LOADOUT.talentFrom ? 0 : Math.floor((level - LOADOUT.talentFrom) / LOADOUT.talentEvery) + 1;
    const ranks = {}, picks = [];
    for (const [id, n] of fillOrder(kit.fillers)) {
      if (left <= 0) break;
      if (!n) { picks[+id[1]] = 0; left--; } else { const k = Math.min(n, left); ranks[id] = (ranks[id] || 0) + k; left -= k; }
    }
    s.loadout.picks[pickSub] = picks; s.loadout.ranks[pickSub] = ranks;
  }
  for (let i = 0; i < protocolSlots(level); i++) {
    if (SLOT_KINDS[i] === 'implant' && level < 15) continue;
    const it = addItem(s, rollItem(seeded(level * 100 + i + gearSeed * 7919), { level, rarity, group: SLOT_KINDS[i], stat: chaseStat(kit?.chase, i, rarity) }), 'Issued: ');
    if (it) command(s, 'load ' + it.id);
  }
}
