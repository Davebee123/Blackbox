// Rooms sim (docs/servers.md 9, R0): a bot plays one server as a room graph, visit by visit, until it's Mapped (every
// room cleared, the Resident beaten). It walks to what's worth doing (the key, then the vault, then /core; uncleared
// rooms; caches; respawns for XP; an Exfil 2 rooms off or nearer; a Stash it walks through pays as it goes), keeps clear of the hunter, rests in the rest room or jacks out when its Signal runs
// low, rests at home and comes back. It fights with the planner (planner.mjs, which crosses ticks on due cycles,
// interrupt.mjs interruptMove) and runs a script when one fits. Time is simulated: a move, a fight's cycles, the rest at
// home and the reconnect wait, with the respawns on their real clocks.
//   node roomsim.mjs [runs=6] [level=10] [size=medium]     every class under each boss rule (a, b, c): win rates,
//                                                          Signal lost a fight, minutes to Mapped, XP an hour
import { fresh, command, resolveCycle, active, finish, hooks, defender, attackers, hackerLevel, materialsOf } from './dist/combat.mjs';
import { xpToNext } from './dist/data.mjs';
import { planner } from './dist/planner.mjs';
import { runScript, scriptsOf } from './dist/scripts.mjs';
import * as FP from './dist/floorplan.mjs';
import { buildBlock as programBlock } from './dist/sockets.mjs';
import { botMove } from './dist/puzzles.mjs';

export const CLASSES = ['breaker', 'bastion', 'infiltrator', 'operator'];
export const PICK = { breaker: 'demolitionist', bastion: 'warden', infiltrator: 'payload', operator: 'herder' };
// Seconds the sim charges for each thing (a cycle at the normal speed is 8 s).
export const TIME = { cycle: 8, move: 6, act: 4, home: 2 };
// What the bot expects a fight to cost, of its max Signal, before it takes one on (and the margin it keeps).
export const NEED = { process: 0.32, elite: 0.6, guard: 0.38, nest: 0.45, core: 0.8, hunter: 0.6, margin: 0.06, low: 0.35 };
// What the bot builds in a socket it has cleared (sockets.mjs): the first of these it knows and can pay for. log: a
// sim's eye on each build. (It only ever builds what pays as it plays: components, respawns, code, caches, a rest.)
export const BUILD = { order: ['harvester', 'cron', 'siphon', 'mill', 'defrag', 'tunnel', 'snare'], log: null };
// Puzzle-room moves the bot has made (a sim's tally).
export const PLAY = { moves: 0 };

// A room fight played out by the planner (and a script when it's worth it). Returns the cycles.
export const TRACE = { fn: null }; // a sim's eye on each command (scratch tracing)
export function fightOut(s, max = 90) {
  let n = 0;
  for (; n < max && active(s); n++) {
    botScript(s);
    if (!active(s)) break;
    const text = planner(s) || 'hold';
    TRACE.fn?.(s, text);
    command(s, text);
    resolveCycle(s);
  }
  if (active(s)) finish(s, 'crashed'); // a stalemate counts as a loss
  return n;
}
// A heal when low, a shield before a heavy hit, the burst ones in a big fight.
function botScript(s) {
  const e = s.encounter, bag = scriptsOf(s);
  if (!e?.rooms || e.scriptUsed || !bag.length) return;
  const d = defender(s), low = d.integrity / Math.max(1, d.max), big = e.virus.boss || e.virus.elite || e.rooms.as === 'hunter';
  const heavy = attackers(s).some((p) => p.attack.due <= e.cycle + 1 && (p.attack.amount || 0) >= d.integrity * 0.3);
  const at = (ids) => bag.findIndex((id) => ids.includes(id));
  let i = -1;
  if (low < 0.35) i = at(['sasser', 'krack', 'slowloris', 'shellshock']);
  if (i < 0 && heavy) i = at(['krack', 'shellshock', 'slowloris']);
  if (i < 0 && big && e.cycle <= 2) i = at(['bluekeep', 'spectre', 'mirai', 'conficker']);
  if (i < 0 && big && e.cycle >= 6) i = at(['conficker', 'meltdown', 'mirai', 'ripple20']);
  if (i >= 0) runScript(s, i);
}
const sig = (s) => FP.sigOf(s) / Math.max(1, s.rooms.max); // the playtest's Signal, or the run's on the network
const needOf = (s, room) => (room.kind === 'core' ? NEED.core : room.kind === 'elite' || room.mirror ? NEED.elite : room.kind === 'guard' ? NEED.guard : room.kind === 'nest' ? NEED.nest : NEED.process);
// What the bot walks to next, and the path there. null: jack out.
export function botTarget(s) {
  const R = s.rooms, g = R.graph, h = FP.hunterOf(s), here = R.at;
  const hot = new Set(h && !h.down ? [h.at, FP.hunterNext(s, h)].filter(Boolean) : []);
  if (h && !h.down && h.kind === 'track' && !h.awake) for (const x of FP.neighbours(g, h.den)) hot.add(x);
  const live = (room) => FP.isUp(s, room);
  const f = sig(s), can = (room) => f >= needOf(s, room) + NEED.margin, avoid = R.visit.avoid || {};
  const sealed = (id) => id === g.core && !FP.coreOpen(s);
  const pass = (target) => (id) => id === target || (!hot.has(id) && !(live(g.rooms[id]) && id !== target) && !sealed(id) && !avoid[id]);
  // Through the hunter's reach if there's no other way, or through a fight it can afford.
  const route = (target) => FP.pathTo(g, here, target, pass(target)) || FP.pathTo(g, here, target, (id) => id === target || (!sealed(id) && !avoid[id] && (!live(g.rooms[id]) || can(g.rooms[id]))));
  const options = [];
  const d = FP.distances(g, here);
  // The key walk costs the guard and every live fight between its post and its vault: when the bar can't pay for it
  // all, clear those fights first (or the key goes back to its post when the bot runs dry).
  const walkOf = (post) => (FP.pathTo(g, post.id, post.key, (id) => id === post.key || !sealed(id)) || []).slice(1, -1).filter((id) => live(g.rooms[id]));
  const blockers = new Set(FP.roomList(s).filter((x) => x.kind === 'guard' && x.key && !R.opened[x.key] && !R.visit.keys.includes(x.key)).flatMap(walkOf));
  const keyCost = (post) => needOf(s, post) + walkOf(post).reduce((a, id) => a + needOf(s, g.rooms[id]), 0);
  for (const room of FP.roomList(s)) {
    if (room.id === here) continue;
    if (room.kind === 'core' && !FP.coreOpen(s)) continue;
    let v = 0;
    const up = live(room) || (room.mirror && FP.cacheFull(s, room)); // a mirror is an elite waiting behind a cache
    if (avoid[room.id]) continue;
    if (room.kind === 'guard' && room.key && !R.opened[room.key] && !R.visit.keys.includes(room.key) && up && can(room)) v = f >= keyCost(room) + NEED.margin ? 9 : 4;
    else if (blockers.has(room.id) && up && can(room)) v = 8.5;
    else if (room.kind === 'vault' && !R.opened[room.id] && R.visit.keys.includes(room.id)) v = 10;
    else if (room.kind === 'core' && up && f >= NEED.core) v = 8;
    else if (room.wild && up && can(room) && FP.WORLD.view?.fightNote?.(s, room)?.startsWith('A named')) v = 8; // a contract's named target (netrooms.mjs)
    else if (!R.cleared[room.id] && (!up || can(room)) && room.kind !== 'core' && !FP.isPuzzle(room.kind)) v = up ? 5 : 6; // (a puzzle room is a side room: below, with the caches)
    else if (FP.socketOpen(s, room) && !FP.programIn(s, room.id) && !FP.socketOff(s, room) && !R.visit.built && BUILD.order.some((p) => !programBlock(s, R, room, p))) v = 4; // a program it can build there
    else if ((room.kind === 'cache' || room.kind === 'secret' || FP.isPuzzle(room.kind)) && FP.cacheFull(s, room)) v = 3; // a cache (a hidden room's stash too), or a puzzle room's fresh board
    else if (up && can(room) && room.kind !== 'core') v = 2;
    else if (room.kind === 'rest' && !R.visit.rested && f < 0.7) v = 7;
    if (!v) continue;
    options.push({ room, v: v - 0.35 * (d[room.id] ?? 9) });
  }
  // An Exfil you can see, 2 rooms off or nearer: chase it (a dozen moves at most a visit), through what it can't hide behind.
  const m = FP.exfilOf(s);
  if (m && FP.exfilSeen(s, m) && (d[m.at] ?? 9) <= 2 && (R.visit.chased || 0) < 12) { const p = route(m.at); if (p && p.length > 1) { R.visit.chased = (R.visit.chased || 0) + 1; options.push({ room: g.rooms[m.at], v: 12 }); } }
  for (const o of options.sort((a, b) => b.v - a.v)) { const p = route(o.room.id); if (p && p.length > 1) return { room: o.room, path: p }; }
  return null;
}
// One decision. Returns false when there's nothing more to do this visit (the caller jacks out).
export function botStep(s) {
  const R = s.rooms, here = FP.hereOf(s), sc = R.screen;
  if (sc?.kind === 'hunter') { FP.act(s, sig(s) < 0.6 ? 'slip' : 'engage'); return true; }
  if (sc?.kind === 'rival') { FP.act(s, 'engage'); return true; } // a rival has you: no step back (rivals.mjs)
  if (sc?.kind === 'virus') {
    const room = FP.roomOf(s, sc.room);
    if (sig(s) >= needOf(s, room) || !R.visit.back) FP.act(s, 'engage'); else { (R.visit.avoid ||= {})[room.id] = true; FP.act(s, 'back'); }
    return true;
  }
  if (here.kind === 'secret' && FP.cacheFull(s, here)) { FP.act(s, 'pull'); return true; } // a hidden room's stash: never bait
  if (here.kind === 'cache' && FP.cacheFull(s, here) && !(here.mirror && sig(s) < NEED.elite + NEED.margin)) { FP.act(s, 'cat'); if (!(FP.isBait(s, here) && sig(s) < 0.5)) { FP.act(s, 'pull'); return true; } }
  if (here.kind === 'vault' && !FP.opened(s, here) && R.visit.keys.includes(here.id)) { FP.act(s, 'open'); return true; }
  // A puzzle room's fresh board (puzzles.mjs): played to its end, its solver's moves (the chase's and the cascade's
  // searched, the quarantine's and the sweep's a heuristic), tallied in PLAY.moves.
  if (FP.puzzleReady(s, here)) {
    const b = FP.boardOf(s, here);
    for (let n = 0; n < 120 && !b.done && FP.puzzleReady(s, here) && !active(s); n++) { const m = botMove(b); if (!m) break; FP.act(s, 'play', m); PLAY.moves++; }
    if (!b.done) (R.visit.avoid ||= {})[here.id] = true; // (never: every board ends)
    return true;
  }
  if (here.kind === 'rest' && !R.visit.rested && sig(s) < 0.85) { FP.act(s, 'rest'); return true; }
  if (FP.roomRuns(s, here, 'defrag') && !R.visit.bays?.[here.id] && sig(s) < 0.85) { FP.act(s, 'rest'); return true; }
  // A socket it has cleared, empty: build the first program it knows and can pay for (BUILD's order), once a visit.
  if (FP.socketOpen(s, here) && !FP.programIn(s, here.id) && !FP.socketOff(s, here) && !R.visit.built) {
    R.visit.built = true;
    const id = BUILD.order.find((p) => !programBlock(s, R, here, p));
    if (id) { FP.act(s, 'build', id); BUILD.log?.(s, id); return true; }
  }
  const rest = FP.roomList(s).find((x) => x.kind === 'rest');
  if (sig(s) < NEED.low && (!rest || R.visit.rested)) return false;
  const t = botTarget(s);
  if (sig(s) < NEED.low && t?.room !== rest) return false;
  if (!t) return false;
  // The hunter in our next room, or about to step into it: wait a move instead (a Patroller's timing puzzle), or leave
  // when Signal is too low to fight it.
  const h = FP.hunterOf(s);
  const into = h && !h.down && (h.at === t.path[1] || (FP.hunterNext(s, h) === t.path[1] && FP.paceOf(s) - h.count <= 1));
  // An awake Tracker closing in on a bot too low to fight it: leave (the rest room's door stops it too).
  if (h && !h.down && h.kind === 'track' && h.awake && !h.returning && (FP.distances(R.graph, R.at)[h.at] ?? 9) <= 2 && sig(s) < NEED.hunter + NEED.margin && here.kind !== 'rest') return false;
  if (into && h.kind === 'patrol') {
    R.visit.waited = (R.visit.waited || 0) + 1;
    if (R.visit.waited <= 4) { FP.wait(s); return true; }
    if (sig(s) < NEED.hunter + NEED.margin) return false;
  } else R.visit.waited = 0;
  FP.go(s, t.path[1]);
  return true;
}
// Play a server until it's Mapped (or the clock runs out). Returns the numbers.
// session: minutes to keep playing after it's Mapped (farming its respawns), for the XP an hour of a whole session.
export function runServer({ cls = 'breaker', level = 10, seed = 1, size = 'medium', kind = 'Mailhub', boss = 'a', hunter = null, hours = 4, rep = 0, author = null, session = 0 } = {}) {
  const s = fresh();
  s.rng = (seed * 2654435761 + cls.length * 97 + rep * 40503) >>> 0;
  let clock = Date.UTC(2026, 0, 1);
  const was = hooks.now;
  hooks.now = () => clock;
  try {
    FP.outfit(s, { cls, level, sub: PICK[cls], gearSeed: seed });
    FP.startRooms(s, { seed, size, kind, level, boss, hunter, author });
    const R = s.rooms, end = clock + hours * 3600000, xp0 = FP.xpTotal(s);
    let fights = 0, steps = 0, mappedAt = null, xpAtMap = null, visitsAtMap = null;
    while (clock < end && steps < 20000) {
      steps++;
      FP.tick(s, clock);
      if (!R.at) {
        // Home: rest until the bar is nearly full, then reconnect.
        const want = Math.ceil(R.max * 0.95), need = Math.max(0, want - FP.signalNow(s, clock));
        clock += Math.max(TIME.home * 1000, Math.ceil((need / (R.max * 0.2)) * 60000), R.reconnectAt - clock);
        FP.connect(s);
        continue;
      }
      // Beaten four times in one room: the bot gives the server up (it can't map it).
      if (Object.values(R.stats.lostAt || {}).some((n) => n >= 4)) break;
      if (active(s)) { fights++; clock += fightOut(s) * TIME.cycle * 1000; FP.settle(s); if (R.mapped && !mappedAt) { mappedAt = clock; xpAtMap = FP.xpTotal(s) - xp0; visitsAtMap = R.visits; } if (mappedAt && clock >= mappedAt + session * 60000) break; continue; }
      const before = R.visit.moves;
      if (!botStep(s)) { FP.jackOut(s); clock += TIME.act * 1000; continue; }
      clock += (R.visit && R.visit.moves > before ? TIME.move : TIME.act) * 1000;
      if (R.mapped && !mappedAt) { mappedAt = clock; xpAtMap = FP.xpTotal(s) - xp0; visitsAtMap = R.visits; }
      if (mappedAt && clock >= mappedAt + session * 60000) break;
    }
    const t0 = Date.UTC(2026, 0, 1), minutes = ((mappedAt || clock) - t0) / 60000, xp = xpAtMap ?? FP.xpTotal(s) - xp0, total = (clock - t0) / 60000, xpAll = FP.xpTotal(s) - xp0;
    const st = R.stats, avg = (xs) => (xs?.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
    return { cls, seed, boss, kind, components: s.components || 0, code: Object.values(materialsOf(s)).reduce((a, b) => a + (b || 0), 0), programs: Object.values(R.programs || {}), mapped: !!mappedAt, minutes, visits: visitsAtMap ?? R.visits, fights: st.fights, won: st.won, lost: st.lost, bossTries: st.boss.tries, bossWon: st.boss.won, cuts: st.cuts, wasted: st.wasted,
      signal: Object.fromEntries(Object.entries(st.signalBy).map(([k, v]) => [k, avg(v)])), xp, xpHour: xp / Math.max(1 / 60, minutes / 60), sessionMinutes: total, sessionXpHour: xpAll / Math.max(1 / 60, total / 60), sessionLevelsHour: (xpAll / xpToNext(level)) / Math.max(1 / 60, total / 60), level: hackerLevel(s), levelsHour: (xp / xpToNext(level)) / Math.max(1 / 60, minutes / 60), hunted: st.hunted, progress: FP.progressOf(s), fam: st.fam, stuck: Object.entries(R.stats.lostAt || {}).filter(([, n]) => n >= 4).map(([id]) => `${R.graph.rooms[id].kind} ${R.graph.rooms[id].family || R.graph.rooms[id].guard || ''}`.trim()).join(', '), left: FP.roomList(s).filter((x) => !R.cleared[x.id]).map((x) => `${x.kind}${x.mirror ? '(mirror)' : ''}`).join(' ') };
  } finally { hooks.now = was; }
}
// Many servers for a class under one boss rule.
export function sweep(cls, { runs = 6, level = 10, size = 'medium', boss = 'a', kinds = FP.KIND_IDS, session = 0 } = {}) {
  const out = [];
  for (let i = 0; i < runs; i++) out.push(runServer({ cls, level, seed: 100 + i, size, kind: kinds[i % kinds.length], boss, session }));
  const n = out.length, sum = (f) => out.reduce((a, r) => a + f(r), 0), avgOf = (k) => { const xs = out.map((r) => r.signal[k]).filter((x) => x != null); return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null; };
  return { cls, boss, runs: n, mapped: sum((r) => (r.mapped ? 1 : 0)) / n, fightWin: sum((r) => r.won) / Math.max(1, sum((r) => r.fights)), bossWin: sum((r) => r.bossWon) / Math.max(1, sum((r) => r.bossTries)), bossTries: sum((r) => r.bossTries) / n,
    minutes: sum((r) => r.minutes) / n, visits: sum((r) => r.visits) / n, xpHour: sum((r) => r.xpHour) / n, sessionXpHour: sum((r) => r.sessionXpHour) / n, sessionLevelsHour: sum((r) => r.sessionLevelsHour) / n, levelsHour: sum((r) => r.levelsHour) / n, cuts: sum((r) => r.cuts) / n, wasted: sum((r) => r.wasted) / n,
    signal: { process: avgOf('process'), elite: avgOf('elite'), guard: avgOf('guard'), boss: avgOf('boss'), hunter: avgOf('hunter') }, list: out };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const runs = Number(process.argv[2]) || 6, level = Number(process.argv[3]) || 10, size = process.argv[4] || 'medium', session = Number(process.argv[5] ?? 60);
  const pct = (x) => (x == null ? '  —' : `${Math.round(x * 100)}%`.padStart(4));
  console.log(`rooms sim: ${runs} servers a class and boss rule (the five kinds in turn), level ${level}, ${size}; after Mapped it farms the respawns for ${session} more minutes`);
  console.log('class        rule mapped fights  boss (tries) | Signal lost a fight: process elite guard boss hunter | min to Mapped visits | to Mapped: XP/h levels/h | session: XP/h levels/h | cuts wasted');
  for (const boss of ['a', 'b', 'c']) for (const cls of CLASSES) {
    const r = sweep(cls, { runs, level, size, boss, session });
    console.log(`${cls.padEnd(12)} (${boss})  ${pct(r.mapped)}  ${pct(r.fightWin)}  ${pct(r.bossWin)} (${r.bossTries.toFixed(1)}) |  ${pct(r.signal.process)}  ${pct(r.signal.elite)}  ${pct(r.signal.guard)}  ${pct(r.signal.boss)}  ${pct(r.signal.hunter)} | ${r.minutes.toFixed(0).padStart(4)}  ${r.visits.toFixed(1).padStart(4)} | ${Math.round(r.xpHour).toString().padStart(6)}  ${r.levelsHour.toFixed(2)} | ${Math.round(r.sessionXpHour).toString().padStart(6)}  ${r.sessionLevelsHour.toFixed(2)} | ${r.cuts.toFixed(1)} ${r.wasted.toFixed(1)}`);
  }
}
// Per family (and the boss, the hunter): fights, wins, Signal lost and cycles, over a class's servers.
export function byFamily(cls, opts = {}) {
  const r = sweep(cls, opts), out = {};
  for (const x of r.list) for (const [k, v] of Object.entries(x.fam || {})) { const o = (out[k] ||= { n: 0, won: 0, lost: 0, cycles: 0 }); o.n += v.n; o.won += v.won; o.lost += v.lost; o.cycles += v.cycles; }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, `${v.won}/${v.n} won, ${Math.round((v.lost / v.n) * 100)}% Signal, ${(v.cycles / v.n).toFixed(1)} cycles`]));
}
