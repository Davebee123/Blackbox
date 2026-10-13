// A server as a graph of rooms (docs/servers.md 2, phase R0: "one server as a room graph"). Pure like the combat
// engine: state in, events out. It lives on s.rooms, which only the rooms playtest carries (app.js ?playtest=rooms),
// on a fresh character that's never saved.
//
//   rooms       a fight (process ▣, elite ◆▣, guard post ⛨, the core ♛, the hunter's den ☠), an interactable (cache ▤,
//               vault ▥, rest ☰) or an empty junction (·). A fight room's family, author and attack set are fixed by the
//               server's seed, so a room is a place you learn. Its mutation rerolls with each respawn, and one respawn
//               in ten is a rare spawn (★, two levels up, three loot rolls).
//   moving      the first time you walk into a room on a visit costs ROOMS.move of your max Signal; rooms you've walked
//               this visit, and `wait`, are free. A live virus blocks its room: engage it, or step back.
//   keys        the vault's key sits in a guard post on another branch, three or more rooms from the vault. Beat the
//               guard, walk the key back and open the vault (or force it for ROOMS.force of your max). A key lasts one
//               visit: jack out with it and it goes back to its post, guard and all. The vault unseals /core.
//   the hunter  on a medium or large server (from floor 2): a Patroller walks a fixed loop, a Tracker sleeps in its den
//               and wakes when you walk next to it, follows you and loses you at ROOMS.hunter.lose rooms. Either moves a
//               room for every ROOMS.hunter.pace of your moves (a Lab's Tracker every move once awake), and only when you
//               walk or wait: never while you fight, loot, open or rest. It never enters the rest room or the entry.
//   respawns    fight rooms come back on real time (ROOMS.respawn, ×ROOMS speed in the playtest), never while you stand
//               in them; a cache refills. Nothing expires: a week away and the server is just full again.
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
import { tierOf } from './tells.mjs';
import { giveScript, rollScript } from './scripts.mjs';
import { AUTHOR_FAMILIES, OPENS, rollSet, applySet, familyName, setName } from './families.mjs';
import { armTicks, bossRule, BOSS_RULES } from './interrupt.mjs';

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
  size: { process: { hp: 1.3, dmg: 0.9 }, elite: { hp: 0.9, dmg: 0.6 }, guard: { hp: 1.2, dmg: 0.85 }, hunter: { hp: 1.6, dmg: 0.7 }, boss: { hp: 1.25, dmg: 0.9 } },
  eliteHp: 2.2, // an elite's Integrity (of a plain virus's), before its size
  hunter: { pace: 2, lose: 5, level: 2 }, // a room per 2 of your moves; a Tracker loses you 5 rooms away; 2 levels over the server (its size: twice a guard's Integrity)
  cache: { credits: [18, 36], code: [2, 4], script: 0.15 },
  vault: { gear: 1 / 3, custom: 0.4 },
  junctions: 0.2, // about a fifth of the rooms
};
// The server kinds (2.2), as room themes: one rule each, the hunter they keep, and the directory names their rooms take.
export const KINDS = {
  Mailhub: { rule: 'Spam floods', text: 'The rooms on its mail queue (the hunter\'s loop) bring a weak, quick Spam Flood to every fight.', hunter: 'patrol', author: 'tollgate',
    dirs: ['spool', 'postfix', 'mqueue', 'smtpd', 'relay', 'aliases', 'maildrop', 'bounce', 'virtual', 'transport', 'lmtp', 'pickup', 'qmgr', 'cleanup', 'tlsmgr', 'anvil', 'scache', 'flush'] },
  Relay: { rule: 'Hops', text: 'Two shortcut links each skip a room, drawn as curves. The hunter uses them too.', hunter: 'patrol', author: 'swarmline',
    dirs: ['bind', 'named', 'zones', 'resolv', 'forward', 'slave', 'keys', 'dyn', 'stats', 'hints', 'rndc', 'journal', 'views', 'acl', 'dnssec', 'notify', 'axfr', 'master'] },
  Mirror: { rule: 'Mirrors', text: 'One cache is a mirror, with an elite behind it.', hunter: 'track', author: 'palemask',
    dirs: ['www', 'private', 'html', 'assets', 'cdn', 'static', 'uploads', 'cgi-bin', 'logs', 'media', 'themes', 'vhosts', 'certs', 'cache', 'drafts', 'mirror', 'stage', 'public'] },
  Archive: { rule: 'Deep storage', text: 'Two vaults and two guard posts, each with its own key. Only the vault on the way to the Core unseals it.', hunter: 'track', author: 'glassjaw',
    dirs: ['backups', 'srv', 'cold', 'dumps', 'snapshots', 'incr', 'full', 'catalog', 'index', 'offsite', 'restore', 'media', 'rotate', 'weekly', 'monthly', 'ledger', 'escrow', 'ltfs'] },
  Lab: { rule: 'Overheat', text: 'From the 10th cycle of every fight, the rack burns you for 2% of your max Signal each cycle, and every part for 3% of its max Integrity. Its Tracker moves a room every move once awake.', hunter: 'track', fast: true, author: 'lantern',
    dirs: ['lab', 'tmp', 'bench', 'rig', 'sandbox', 'builds', 'cores', 'gpu', 'scratch', 'fuzz', 'harness', 'probe', 'samples', 'jit', 'debug', 'trace', 'cold', 'kiln'] },
};
export const KIND_IDS = Object.keys(KINDS);
// Room kinds: their mark on the map, and what they are.
// What each room is called on the map, its card and in the log.
export const ROOM_LABEL = { entry: 'Entry', process: 'Process', elite: 'Elite', guard: 'Guard post', core: 'Core', den: "Hunter's den", cache: 'Cache', vault: 'Vault', rest: 'Rest room', junction: 'Junction' };
export const MARKS = { entry: '⌂', process: '▣', elite: '◆▣', guard: '⛨', core: '♛', den: '☠', cache: '▤', vault: '▥', rest: '☰', junction: '·' };
export const FIGHTS = ['process', 'elite', 'guard', 'core'];
export const HUNTERS = {
  patrol: { name: 'Patroller', body: 'bouncer', text: 'It walks a fixed loop, a room for every 2 of your moves. Its loop is drawn as a dashed red line.' },
  track: { name: 'Tracker', body: 'tracer', text: 'It sleeps in its den and wakes the first time you walk into a room next to it (those rooms carry a red edge). Awake, it follows you a room for every 2 of your moves, and loses you 5 rooms away.' },
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
  // Names: what each room is (Process 2, Guard post, Vault, Core), numbered when a kind repeats. path is the
  // label every screen and line shows; dir is its slug, for typing (cd process-2).
  const sorted = all.sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
  const many = {}, nth = {};
  for (const id of sorted) many[R[id].kind] = (many[R[id].kind] || 0) + 1;
  for (const id of sorted) {
    const x = R[id], base = ROOM_LABEL[x.kind] || x.kind;
    nth[x.kind] = (nth[x.kind] || 0) + 1;
    x.path = many[x.kind] > 1 ? `${base} ${nth[x.kind]}` : base;
    x.dir = x.path.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  return true;
}

// ---------- the server on you ----------
const nowOf = () => hooks.now?.() ?? Date.now();
const mins = (s, m) => (m * 60000) / (s.rooms?.speed || ROOMS.speed);
export const roomOf = (s, id) => s.rooms?.graph.rooms[id] || null;
export const hereOf = (s) => (s.rooms?.at ? roomOf(s, s.rooms.at) : null);
export const roomList = (s) => Object.values(s.rooms.graph.rooms);
// Start the playtest's server: a fresh map, you at home with full Signal.
//   seed, size, kind, level, floor, author: the server. hunter: 'patrol' | 'track' (overrides its kind's). boss: a | b | c.
//   speed: the clocks' speed (the playtest 10). name: shown on the card.
export function startRooms(s, { seed = 1, size = 'medium', kind = 'Mailhub', level = hackerLevel(s), floor = 2, author = null, hunter = null, boss = 'a', speed = ROOMS.speed, name = null } = {}) {
  kind = KINDS[kind] ? kind : 'Mailhub';
  author = AUTHOR_FAMILIES[author] ? author : KINDS[kind].author;
  const graph = generate(seed, { size, kind, level, floor, author, hunter });
  const max = maxSignal(s);
  s.rooms = {
    v: 1, seed, size, kind, level, floor, author, speed, bossRule: BOSS_RULES[boss] ? boss : 'a', graph,
    id: (name || serverName(seed, kind)).toLowerCase(), name: name || serverName(seed, kind),
    at: null, visit: null, visits: 0, cleared: {}, seen: {}, down: {}, spawns: {}, rare: {}, taken: {}, opened: {},
    signal: max, max, homeAt: nowOf(), reconnectAt: 0, screen: null, pack: [], banked: [], credits: 0, xpStart: 0,
    log: [], scripts: [], codex: {}, mapped: false, last: null, rolls: 0,
    stats: { fights: 0, won: 0, lost: 0, cuts: 0, wasted: 0, ticks: 0, signalBy: {}, boss: { tries: 0, won: 0 }, hunted: 0, moves: 0, cycles: 0 },
  };
  s.run = null;
  s.rooms.xpStart = xpTotal(s);
  s.rooms.seen[graph.core] = 'kind';
  say(s, `${s.rooms.name}: a ${author.toUpperCase()} ${kind}, level ${level}, ${Object.keys(graph.rooms).length} rooms. Its Resident is ${BOSSES[RESIDENT].name}.`);
  return s.rooms;
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
export const respawnMs = (s, room) => mins(s, ROOMS.respawn[room.kind === 'core' ? 'core' : room.kind === 'guard' ? 'guard' : room.kind === 'elite' ? 'elite' : 'process']);
export function isUp(s, room, now = nowOf()) {
  const R = s.rooms, at = R.down[room.id];
  if (!FIGHTS.includes(room.kind)) return false;
  if (room.kind === 'core' && !coreOpen(s)) return true; // sealed, with its Resident behind it
  if (at == null) return true;
  const back = at + respawnMs(s, room);
  return now >= back && !(R.at === room.id && (R.inSince ?? 0) < back); // it waits while you stand in it
}
// When a fallen room comes back (ms), or null.
export const backAt = (s, room) => (s.rooms.down[room.id] != null ? s.rooms.down[room.id] + respawnMs(s, room) : null);
export const cacheFull = (s, room, now = nowOf()) => room.kind === 'cache' && (s.rooms.taken[room.id] == null || now >= s.rooms.taken[room.id] + mins(s, ROOMS.respawn.cache));
export const refillAt = (s, room) => (s.rooms.taken[room.id] != null ? s.rooms.taken[room.id] + mins(s, ROOMS.respawn.cache) : null);
// Bait: one cache in four, fresh with each refill.
export const isBait = (s, room) => room.kind === 'cache' && !room.mirror && seeded((room.baitSeed + (s.rooms.spawns[room.id] || 0) * 7919) >>> 0)() < 0.25;
export const coreOpen = (s) => !!s.rooms.opened[s.rooms.graph.vaults[0]];
// Your Signal at home rests back (CONFIG.signalRest of your max a minute, at the clock's speed).
export function signalNow(s, now = nowOf()) {
  const R = s.rooms;
  if (active(s) && s.run?.rooms) return s.run.integrity;
  // A fight that just ended (its run not settled yet): what it leaves you, on the server or home.
  if (R.at) return s.run?.rooms ? Math.max(1, Math.min(s.run.max, s.run.integrity, R.fightFrom ?? s.run.max)) : R.signal;
  return Math.min(R.max, Math.floor(R.signal + ((now - R.homeAt) / 60000) * CONFIG.signalRest * R.max * R.speed));
}
// The next room to come back (a fight room, or a cache), for the server card.
export function soonest(s, now = nowOf()) {
  let best = null;
  for (const room of roomList(s)) {
    const at = room.kind === 'cache' ? (cacheFull(s, room, now) ? null : refillAt(s, room)) : FIGHTS.includes(room.kind) && !isUp(s, room, now) ? backAt(s, room) : null;
    if (at != null && (!best || at < best.at)) best = { room, at };
  }
  return best;
}
export const fmtLeft = (ms) => { const t = Math.max(0, Math.ceil(ms / 1000)); return t >= 3600 ? `${Math.floor(t / 3600)}:${String(Math.floor((t % 3600) / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` : `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

// ---------- progress ----------
export const progressOf = (s) => { const all = roomList(s); return { done: all.filter((x) => s.rooms.cleared[x.id]).length, total: all.length }; };
function clear(s, room, why = '') {
  const R = s.rooms;
  if (R.cleared[room.id]) return false;
  R.cleared[room.id] = nowOf();
  const p = progressOf(s);
  say(s, `${room.path} cleared${why ? ` (${why})` : ''}. Rooms ${p.done}/${p.total}.`, 'rooms-good');
  if (p.done * 2 >= p.total && !R.drawn) { R.drawn = true; for (const x of roomList(s)) R.seen[x.id] = 'kind'; say(s, 'Half the server cleared: the whole room graph is drawn.', 'rooms-good'); }
  if (p.done === p.total && !R.mapped) mapped(s);
  return true;
}
// 100%: Mapped. An item roll two levels over the server, and 5 kills' worth of XP.
function mapped(s) {
  const R = s.rooms;
  R.mapped = nowOf();
  const it = addItem(s, rollItem(rnd(R, 77), { level: R.level + 2, rarity: rnd(R, 78)() < 0.35 ? 'custom' : 'tuned', cls: classOf(s) }), 'Mapped: ');
  if (it) R.banked.push(it.id);
  const xp = Math.round(xpFor(s, R.level, ROOMS.xp.mapped));
  gainXp(s, xp, `${R.name} Mapped`, 'fight');
  say(s, `MAPPED. Every room of ${R.name} cleared. ${it ? `${itemLabel(it)} is yours, and ` : ''}+${xp} XP.`, 'rooms-good');
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
    say(s, `The Tracker in ${g.rooms[h.den].path} wakes. It follows you a room for every ${paceOf(s)} of your moves.`, 'rooms-bad');
    return false;
  }
  h.count++;
  if (h.count < paceOf(s)) return false;
  h.count = 0;
  if (h.kind === 'track' && h.awake && !h.returning && (distances(g, h.at)[R.at] ?? 99) >= ROOMS.hunter.lose) {
    h.returning = true;
    say(s, `The Tracker loses you. It walks back to ${g.rooms[h.den].path}.`, 'rooms-good');
  }
  const next = hunterNext(s, h);
  if (next) { h.at = next; if (h.kind === 'patrol') h.idx = (h.idx + 1) % g.route.length; }
  if (h.kind === 'track' && h.returning && h.at === h.den) { h.returning = false; h.awake = false; say(s, 'The Tracker is back in its den, asleep.', 'rooms-good'); }
  return h.at === R.at;
}
// Words for where it is (ls): "the hunter is two rooms off, in cron.d, heading for spool."
export function hunterLine(s) {
  const R = s.rooms, g = R.graph, h = hunterOf(s);
  if (!h) return '';
  if (h.down) return `The ${HUNTERS[h.kind].name} is down for this visit.`;
  const d = distances(g, R.at)[h.at] ?? null, words = ['here', 'one room off', 'two rooms off', 'three rooms off'];
  const where = d != null && d <= 3 ? words[d] : 'far off';
  const next = hunterNext(s, h), state = h.kind === 'track' && !h.awake ? `asleep in ${g.rooms[h.den].path}` : `in ${g.rooms[h.at].path}${next ? `, heading for ${g.rooms[next].path}` : ''}`;
  return `The ${HUNTERS[h.kind].name} is ${where}, ${state}. It moves in ${paceOf(s) - h.count}.`;
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
  R.visits++;
  R.at = R.graph.entry;
  R.inSince = now;
  R.visit = { n: R.visits, walked: { [R.graph.entry]: true }, keys: [], rested: false, moves: 0, hunter: newHunter(s), slipped: false, back: null, xp0: xpTotal(s) };
  R.screen = null;
  look(s);
  clear(s, R.graph.rooms[R.graph.entry], 'the entry');
  say(s, `CONNECTED to ${R.name}, visit ${R.visits}. Signal ${R.signal}/${R.max}.${R.visit.hunter ? ` A ${HUNTERS[R.visit.hunter.kind].name} walks this server.` : ''}`);
  return out(s, first);
}
// Jack out from any room: home, with the pack banked. A key you didn't use goes back to its post, guard and all.
export function jackOut(s, why = '') {
  const R = s.rooms, first = s.serial;
  settle(s);
  if (!R?.at) { deny(s, 'You are not on the server.'); return out(s, first); }
  if (active(s)) { deny(s, 'No jacking out mid-fight. Win it, or lose the pack.'); return out(s, first); }
  for (const vid of R.visit.keys) { const post = roomList(s).find((x) => x.key === vid); if (post) delete R.down[post.id]; }
  if (R.visit.keys.length) say(s, `The key goes back to its post, guard and all.`, 'rooms-bad');
  const banked = R.pack.length;
  R.banked.push(...R.pack); R.pack = [];
  R.last = { result: 'out', xp: xpTotal(s) - R.visit.xp0, banked, visit: R.visit.n };
  goHome(s);
  say(s, `${why ? `${why} ` : ''}JACKED OUT of ${R.name}. ${banked ? `${banked} ${banked === 1 ? 'item' : 'items'} banked. ` : ''}Signal ${R.signal}/${R.max}, resting.`, 'jacked-out');
  return out(s, first);
}
function goHome(s) {
  const R = s.rooms, now = nowOf();
  R.at = null; R.screen = null; R.homeAt = now; R.reconnectAt = now + ROOMS.reconnect / R.speed;
  R.visit = { ...R.visit, hunter: null };
}
// Lost a fight: disconnected. The unbanked pack is lost; XP, banked gear and your scripts stay.
function disconnected(s, why) {
  const R = s.rooms, lost = [];
  for (const id of R.pack) { const it = stashItem(s, id); if (it) { lost.push(itemLabel(it)); for (const r of Object.values(s.gear?.rigs || {})) if (Array.isArray(r)) for (let i = 0; i < r.length; i++) if (r[i] === id) r[i] = null; s.stash = s.stash.filter((x) => x.id !== id); } }
  R.pack = [];
  for (const vid of R.visit?.keys || []) { const post = roomList(s).find((x) => x.key === vid); if (post) delete R.down[post.id]; }
  R.last = { result: 'lost', why, lost, xp: xpTotal(s) - (R.visit?.xp0 ?? xpTotal(s)), visit: R.visit?.n };
  R.signal = 0;
  goHome(s);
  say(s, `DISCONNECTED. ${why}${lost.length ? ` ${lost.length} unbanked ${lost.length === 1 ? 'item' : 'items'} lost.` : ''} XP, banked gear and your scripts stay.`, 'rooms-bad');
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
  else if (room.kind === 'core' && !coreOpen(s)) deny(s, `The Core is sealed. Open the ${R.graph.rooms[R.graph.vaults[0]].path} first.`);
  else step(s, room, opts);
  return out(s, first);
}
function step(s, room, opts) {
  const R = s.rooms, cost = moveCost(s, room);
  if (cost) R.signal = Math.max(1, R.signal - cost);
  R.visit.back = R.at;
  R.at = room.id;
  R.inSince = nowOf();
  R.visit.walked[room.id] = true;
  R.visit.moves++; R.stats.moves++;
  say(s, `→ ${room.path}${cost ? ` (−${cost} Signal, ${R.signal}/${R.max})` : ''}`, 'rooms-cmd');
  look(s);
  const h = hunterOf(s);
  if (h && !h.down && h.at === room.id) return meet(s, room, opts);
  if (hunterMove(s)) return meet(s, room, opts);
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
  else { const line = hunterLine(s); if (line) say(s, line); }
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
  if (['junction', 'den'].includes(room.kind)) clear(s, room);
  if (isUp(s, room)) {
    const f = fightOf(s, room), v = encounterVirus(s, f.key, f.seed, f.opts), name = f.name || v.name;
    R.screen = { kind: 'virus', room: room.id, name, pause: !!opts.pause };
    say(s, `${name} holds ${room.path}. Level ${f.level} ${room.kind === 'guard' ? GUARDS[room.guard].name : familyName(v.family)}${v.author ? `, ${AUTHORS[v.author]?.name || v.author}` : ''}.${R.rare[room.id] ? ' A rare spawn.' : ''}`, 'intrusion');
    return;
  }
  if (room.kind === 'cache' && cacheFull(s, room)) say(s, `${room.path}: a cache${room.mirror ? '. It reads back your own handle' : ''}.`);
  if (room.kind === 'vault' && !R.opened[room.id]) say(s, `${room.path}: a vault door. ${R.visit.keys.includes(room.id) ? 'Your key fits it.' : 'You hold no key to it.'}`);
  if (room.kind === 'rest') say(s, R.visit.rested ? `${room.path}: you rested here this visit.` : `${room.path}: a quiet room. The hunter stops at its door.`);
}
function meet(s, room, opts = {}) {
  const R = s.rooms, h = hunterOf(s);
  R.stats.hunted++;
  say(s, `The ${HUNTERS[h.kind].name} is on you in ${room.path}.`, 'rooms-bad');
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
    if (verb === 'slip') { R.visit.slipped = true; R.screen = null; say(s, `You slip past the ${HUNTERS[hunterOf(s).kind].name}. Once a visit.`, 'rooms-good'); hunterOf(s).held = 1; arrive(s, here, opts); }
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
    else { R.read = { ...(R.read || {}), [here.id]: R.spawns[here.id] || 0 }; say(s, here.mirror ? 'You read the cache: it reads back your own handle. It is a mirror, and something waits behind it.' : isBait(s, here) ? `cat cache.dat: a canary string in every block. Pulling it costs ${Math.round(ROOMS.bait * 100)}% of your max Signal.` : 'cat cache.dat: clean. Credits and code.', isBait(s, here) || here.mirror ? 'rooms-bad' : 'rooms'); }
    return out(s, first);
  }
  if ((verb === 'pull' || verb === 'pull all') && here.kind === 'cache') { pull(s, here, opts); return out(s, first); }
  if ((verb === 'open' || verb === 'force') && here.kind === 'vault') { openVault(s, here, verb === 'force'); return out(s, first); }
  if (verb === 'rest' && here.kind === 'rest') {
    if (R.visit.rested) deny(s, 'You rested here this visit already.');
    else { const n = Math.min(R.max - R.signal, Math.round(R.max * ROOMS.rest)); R.signal += n; R.visit.rested = true; clear(s, here, 'rested'); say(s, `Rest: +${n} Signal (${R.signal}/${R.max}).`, 'rooms-good'); }
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
  if (room.mirror) { say(s, 'The mirror breaks. An elite steps out of it.', 'rooms-bad'); R.screen = null; return fight(s, room, { as: 'mirror', pause: !!opts.pause }); }
  takeCache(s, room);
}
function takeCache(s, room) {
  const R = s.rooms, r = rnd(R, 21), C = ROOMS.cache, rich = 1;
  if (isBait(s, room)) { const lost = Math.round(R.max * ROOMS.bait); R.signal = Math.max(1, R.signal - lost); say(s, `The cache was bait. The canary costs you ${lost} Signal.`, 'rooms-bad'); }
  const credits = Math.round((C.credits[0] + Math.floor(r() * (C.credits[1] - C.credits[0] + 1))) * rich * (1 + R.level / 20));
  R.credits += credits; s.server.credits += credits;
  const fam = roomList(s).find((x) => x.family)?.family, kind = { ransomware: 'cipher', worm: 'worm', ghostroot: 'kernel', trojan: 'worm', cryptominer: 'cipher', wiper: 'cipher' }[fam] || 'cipher';
  const code = C.code[0] + Math.floor(r() * (C.code[1] - C.code[0] + 1));
  gainCode(s, { [kind]: code }, 'Cache: ');
  say(s, `You take the cache: ${credits} credits and ${code} ${kind} code.`, 'rooms-good');
  if (r() < C.script) giveScript(s, rollScript(r), 'Cache: ');
  R.taken[room.id] = nowOf();
  R.spawns[room.id] = (R.spawns[room.id] || 0) + 1;
  clear(s, room, 'taken');
}
function openVault(s, room, force) {
  const R = s.rooms;
  if (R.opened[room.id]) return deny(s, 'The vault is open. It stays open.');
  const has = R.visit.keys.indexOf(room.id);
  if (!force && has < 0) return deny(s, `You hold no key to ${room.path}. It sits in a guard post on another branch, or force the door for ${Math.round(ROOMS.force * 100)}% of your max Signal.`);
  if (force) { const lost = Math.round(R.max * ROOMS.force); R.signal = Math.max(1, R.signal - lost); say(s, `You force the door. It costs you ${lost} Signal.`, 'rooms-bad'); }
  else { R.visit.keys.splice(has, 1); say(s, 'The key opens the vault.', 'rooms-good'); }
  R.opened[room.id] = nowOf();
  const v = room.loot || { kind: 'gear', rarity: 'tuned' };
  if (v.kind === 'gear') { const it = addItem(s, rollItem(rnd(R, 5), { level: R.level, rarity: v.rarity, cls: classOf(s) }), 'Vault: '); if (it) { R.pack.push(it.id); say(s, `${itemLabel(it)} goes in your pack.`, 'rooms-good'); } }
  else giveScript(s, v.script, 'Vault: ');
  clear(s, room, 'opened');
  if (room.id === R.graph.vaults[0]) say(s, `The Core unseals. ${BOSSES[RESIDENT].name} is waiting.`, 'rooms-bad');
}

// ---------- fights ----------
// What a room's fight is: [key, seed, opts] for selectEncounter, and its name and kind of size.
export function fightOf(s, room, as = null) {
  const R = s.rooms, n = R.spawns[room.id] || 0, rare = !as && !!R.rare[room.id], level = R.level + (rare ? ROOMS.rareLevel : 0);
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
  return { key: 'random', seed, opts, size: elite ? 'elite' : 'process', name: null, level, family: room.family, author: room.author, set: room.set, mutation: mut, elite, rare };
}
// A virus's name before you fight it (the room card): the same build the fight makes, built and thrown away.
export function virusName(s, room, as = null) {
  const f = fightOf(s, room, as);
  if (f.name) return f.name;
  return encounterVirus(s, f.key, f.seed, f.opts).name;
}
export function fight(s, room, { pause = false, as = null } = {}) {
  const R = s.rooms;
  s.encounter = null;
  R.max = maxSignal(s);
  R.signal = Math.min(R.signal, R.max);
  R.fightFrom = R.signal;
  s.run = { loc: 'rooms', rooms: true, cwd: room.path, integrity: R.signal, max: R.max, pack: [], visited: [room.path] };
  const f = fightOf(s, room, as);
  selectEncounter(s, f.key, f.seed, { ...f.opts, quiet: true });
  const e = s.encounter;
  if (!e) return;
  const v = e.virus;
  e.rooms = { room: room.id, kind: R.kind, as, size: f.size, rare: !!f.rare };
  // Its size in a room, its attack set, Spam on a Mailhub's queue, and its tells by level (3.5: none to level 5, one
  // from 6, two from 17; an elite one more; a boss its own set).
  const S = ROOMS.size[f.size] || ROOMS.size.process;
  v.roomHp = S.hp; v.roomDmg = S.dmg;
  for (const p of v.parts) {
    p.max = p.integrity = Math.max(1, Math.round(p.max * S.hp));
    const a = p.attack;
    if (a && ['damage', 'encrypt'].includes(a.effect)) a.amount = Math.max(1, Math.round(a.amount * S.dmg));
    if (a?.hit) a.hit = Math.max(1, Math.round(a.hit * S.dmg));
    if (a?.rampBy) a.rampBy = Math.max(1, Math.round(a.rampBy * S.dmg));
  }
  if (f.set) { applySet(v, f.set, seeded((room.seed ^ 0x5e7) >>> 0)); R.codex[`${v.family}:${f.set}`] = true; }
  if (room.queue && R.kind === 'Mailhub' && as !== 'hunter') spamFlood(s, e);
  const lvl = v.level, want = v.boss ? null : lvl <= 5 ? 0 : (lvl >= 17 ? 2 : 1) + (v.elite ? 1 : 0);
  if (want === 0) v.tells = { list: [], tier: tierOf(lvl) };
  else if (want != null) v.extraTells = (v.extraTells || 0) + want - tierOf(lvl).count - (v.elite ? 1 : 0);
  if (v.boss) bossRule(s, R.bossRule);
  armTicks(s);
  if (v.elite && !v.boss) e.enrageAt = 9;
  e.roomsXp = ROOMS.xp.room * (as === 'hunter' ? ROOMS.xp.hunter : room.kind === 'core' ? ROOMS.xp.boss : f.rare ? ROOMS.xp.rare : 1);
  if (v.boss) R.stats.boss.tries++;
  R.stats.fights++;
  const by = v.author ? ` ${AUTHORS[v.author]?.name || v.author.toUpperCase()}.` : '';
  say(s, `You engage ${v.name}. Level ${v.level}.${by}${f.set ? ` ${setName(v.family, f.set)} set.` : ''}`, 'intrusion');
  command(s, 'engage');
  if (pause && s.encounter) s.encounter.paused = true;
}
// A Mailhub's queue: a weak part that hits quick (about a twelfth of the virus's Integrity, a quarter of its hits).
function spamFlood(s, e) {
  const total = e.virus.parts.reduce((n, p) => n + p.max, 0), hits = e.virus.parts.filter((p) => p.attack).map((p) => p.attack.amount || 0).filter(Boolean);
  const hp = Math.max(8, Math.round(total * 0.08)), dmg = Math.max(2, Math.round((hits.reduce((a, x) => a + x, 0) / Math.max(1, hits.length)) * 0.25));
  e.virus.parts.push({ id: 'spam', name: 'Spam Flood', kind: 'system', integrity: hp, max: hp, armor: 0, maxArmor: 0, patchAt: null, veiled: false, loot: null, special: false, spam: true, attack: { name: 'Junk Mail', effect: 'damage', amount: dmg, interval: 3, due: 2 }, exposedUntil: 0, lastDamaged: 0, boosted: false });
  emit(s, 'status', `The mail queue floods the fight: a Spam Flood, ${hp} Integrity, ${dmg} damage every 3 cycles.`, { target: 'spam' });
}
// After a fight: your Signal back on the server (never over what you started it with), and the fight cleared away.
export function settle(s) {
  const R = s.rooms;
  if (!R || !s.run?.rooms || active(s)) return;
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
  if (result !== 'victory') { R.stats.lost++; if (as !== 'hunter') (R.stats.lostAt ||= {})[room.id] = (R.stats.lostAt[room.id] || 0) + 1; return disconnected(s, `${e.virus.name} took your Signal to 0 in ${room.path}.`); }
  R.stats.won++;
  if (e.virus.boss) R.stats.boss.won++;
  R.signal = Math.max(1, Math.min(s.run.max, s.run.integrity, R.fightFrom ?? s.run.max));
  if (e.roomsLoot?.credits) { R.credits += e.roomsLoot.credits; s.server.credits += e.roomsLoot.credits; }
  if (as === 'hunter') {
    const h = hunterOf(s);
    if (h) h.down = true;
    say(s, `${HUNTERS[h?.kind || 'track'].name} down for this visit.`, 'rooms-good');
    giveScript(s, rollScript(rnd(R, 17)), 'The hunter carried: ');
    if (room.kind === 'den') clear(s, room, 'its hunter beaten');
    const pending = R.visit.pending;
    R.visit.pending = null;
    if (pending) arrive(s, R.graph.rooms[pending]);
    return;
  }
  if (as === 'mirror') {
    drops(s, room, e, false);
    say(s, 'The mirror is down. The cache behind it is yours.', 'rooms-good');
    return takeCache(s, room);
  }
  R.down[room.id] = nowOf();
  R.spawns[room.id] = (R.spawns[room.id] || 0) + 1;
  const wasRare = !!R.rare[room.id];
  // One respawn in ten is a rare spawn: it waits until you kill it.
  R.rare[room.id] = FIGHTS.includes(room.kind) && room.kind !== 'core' && rnd(R, 31)() < ROOMS.rare;
  // First clear: half that fight's XP again (7.2).
  if (!R.cleared[room.id]) {
    const xp = Math.round(xpFor(s, e.virus.level, (e.roomsXp || 1) * ROOMS.xp.first * (e.virus.elite ? ELITE.xp : 1)));
    gainXp(s, xp, `${room.path} first clear`, 'fight');
    clear(s, room, 'first clear');
  }
  // The key: beat the guard while its vault is shut and it goes in your pack, for this visit.
  if (room.kind === 'guard' && room.key && !R.opened[room.key] && !R.visit.keys.includes(room.key)) { R.visit.keys.push(room.key); say(s, `The ${e.virus.name} carried the key to ${R.graph.rooms[room.key].path}. It lasts this visit.`, 'rooms-good'); }
  drops(s, room, e, wasRare);
  if (room.kind === 'core') say(s, `${BOSSES[RESIDENT].name} falls. ${room.path} is quiet for ${fmtLeft(respawnMs(s, room))}.`, 'rooms-good');
};
// XP the playtest character has earned in all (its level's bars and what's in the current one): the server card's
// count is the difference since you started.
export const xpTotal = (s) => { const h = hackerOf(s); let n = h.xp; for (let l = 1; l < h.level; l++) n += xpToNext(l); return n; };
export const xpEarned = (s) => xpTotal(s) - (s.rooms?.xpStart ?? xpTotal(s));
// What a won fight drops into the pack: gear now and then (an elite always a blue or better, a rare spawn three
// rolls), the Resident a blue or better and a script half the time.
function drops(s, room, e, rare) {
  const R = s.rooms, lvl = e.virus.level;
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
  R.bossRule = rule;
  say(s, `Boss rule (${rule}): ${BOSS_RULES[rule].name}. ${BOSS_RULES[rule].text}`, 'rooms-good');
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
  const up = isUp(s, room);
  if (room.kind === 'core') return `core · ${BOSSES[RESIDENT].name}${coreOpen(s) ? '' : ' · sealed'}`;
  if (room.kind === 'guard') return `guard · ${GUARDS[room.guard].name}${room.key && !s.rooms.opened[room.key] ? ' · key' : ''}${up ? '' : ` · ↻ ${fmtLeft(backAt(s, room) - nowOf())}`}`;
  if (['process', 'elite'].includes(room.kind)) return `${room.kind} · ${familyName(room.family)} · ${(AUTHORS[room.author]?.name || '').toUpperCase()}${up ? '' : ` · ↻ ${fmtLeft(backAt(s, room) - nowOf())}`}`;
  if (room.kind === 'cache') return `cache${cacheFull(s, room) ? '' : ` · ↻ ${fmtLeft(refillAt(s, room) - nowOf())}`}`;
  if (room.kind === 'vault') return `vault${s.rooms.opened[room.id] ? ' · open' : ''}`;
  return room.kind;
};
export function roomsCommand(s, text) {
  const R = s.rooms, first = s.serial;
  const [word, ...rest] = text.trim().toLowerCase().split(/\s+/), arg = rest.join(' ');
  if (!R) return null;
  if (word === 'connect' && !R.at) return connect(s);
  if (word === 'jack' && arg === 'out') return jackOut(s);
  if (word === 'ls') {
    if (!R.at) { say(s, `You are home. ${R.name}: rooms ${progressOf(s).done}/${progressOf(s).total}. Type connect.`, 'rooms-out'); return out(s, first); }
    const here = hereOf(s), xs = neighbours(R.graph, R.at).map((id) => R.graph.rooms[id]);
    const lines = [`${here.path}  [${here.kind}]`, ...xs.map((x, i) => `${i + 1}  ${seenOf(s, x.id) === 'kind' ? x.path : '??'}  [${tagOf(s, x)}]${moveCost(s, x) ? '' : '  walked'}`)];
    const h = hunterLine(s);
    say(s, [...lines, ...(h ? [h] : [])].join('\n'), 'rooms-out');
    return out(s, first);
  }
  if (word === 'cd' || word === 'go') {
    if (!R.at) { deny(s, 'Connect first.'); return out(s, first); }
    const xs = neighbours(R.graph, R.at).map((id) => R.graph.rooms[id]);
    let room = null;
    if (arg === '..') { const d = distances(R.graph, R.graph.entry); room = xs.sort((a, b) => d[a.id] - d[b.id])[0]; }
    else room = /^\d+$/.test(arg) ? xs[Number(arg) - 1] : xs.find((x) => x.dir === arg.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || x.id === arg);
    return room ? go(s, room.id) : (deny(s, `cd: ${arg || '?'}: not next to you. Type ls.`), out(s, first));
  }
  if (word === 'map' || word === 'tree') { say(s, treeLines(s).join('\n'), 'rooms-out'); return out(s, first); }
  if (word === 'wait') return wait(s);
  if (word === 'back') return back(s);
  if (['engage', 'fight', 'cat', 'pull', 'open', 'force', 'rest', 'slip'].includes(word)) return act(s, word === 'pull' && arg === 'all' ? 'pull' : word);
  if (word === 'developer' && rest[0] === 'bossrule') { setBossRule(s, rest[1]); return out(s, first); }
  return null;
}
// The room graph you've seen, as lines: each room, its links.
export function treeLines(s) {
  const R = s.rooms, lines = [`/ ${R.name} · rooms ${progressOf(s).done}/${progressOf(s).total}`];
  const d = distances(R.graph, R.graph.entry);
  for (const room of roomList(s).filter((x) => seenOf(s, x.id)).sort((a, b) => d[a.id] - d[b.id])) {
    const mark = R.at === room.id ? '@' : hunterOf(s)?.at === room.id && !hunterOf(s).down ? 'H' : seenOf(s, room.id) === 'kind' ? MARKS[room.kind] : '?';
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
