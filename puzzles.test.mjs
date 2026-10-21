// Puzzle rooms (docs/servers.md 9.11, puzzles.mjs and its rooms in floorplan.mjs/netrooms.mjs): each board the same
// from its seed, every chase winnable in 5 to 12 with walking straight at the door losing, every cascade clearable in
// its fewest taps, quarantine's spread and its scoring, the sweep's distances and budget, deeper boards from floor 4,
// what each pays (once), the one lock rule (done until it refills), where they go on a server (and where they never
// do), the fog, the chase's two ends with the real Tracker, and an older save gaining them without losing a thing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, hooks, active, restore, SAVE_VERSION } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import { play } from './dist/run.mjs';
import * as FP from './dist/floorplan.mjs';
import * as PZ from './dist/puzzles.mjs';
import { roomsFor, placePuzzles, puzzleRoomsRestore } from './dist/netrooms.mjs';
import { addrsOf } from './dist/address.mjs';
import { roomsMarkup } from './dist/floorplan-view.mjs';
import { botStep } from './roomsim.mjs';

CONFIG.exfil.chance = 0; CONFIG.enemyCrit = 0; CONFIG.misses = false;
let clock = 1_700_000_000_000;
hooks.now = () => clock;
const SEEDS = Array.from({ length: 40 }, (_, i) => (i + 1) * 7919 + 13);

// ---------- the boards ----------
test('every board is the same from its seed, and another seed draws another', () => {
  for (const kind of PZ.PUZZLE_KINDS) for (const floor of [1, 5]) {
    const a = PZ.newPuzzle(kind, 4242, { floor }), b = PZ.newPuzzle(kind, 4242, { floor }), c = PZ.newPuzzle(kind, 4243, { floor });
    assert.deepEqual(a, b, `${kind} floor ${floor}`);
    assert.notDeepEqual({ ...a, seed: 0 }, { ...c, seed: 0 }, `${kind}: a new seed, a new board`);
    assert.deepEqual(JSON.parse(JSON.stringify(a)), a, `${kind}: a board is plain data (a save holds it)`);
  }
});

test('every chase is searched: winnable, its fewest moves 5 to 12, walking straight at the door loses, and the solver\'s moves win in exactly that many', () => {
  for (const seed of SEEDS) {
    const b = PZ.newChase(seed);
    assert.ok(b.best >= 5 && b.best <= 12, `seed ${seed}: fewest ${b.best}`);
    assert.equal(PZ.chaseSolve(b.walls, b.p0, b.h0, b.exit).best, b.best);
    assert.equal(PZ.chaseStraight(b.walls, b.p0, b.h0, b.exit), false, `seed ${seed}: straight at the door is caught`);
    assert.ok(b.walls.length >= 6 && b.walls.length <= 10);
    const { moves } = PZ.chaseSolve(b.walls, b.p, b.h, b.exit);
    for (const m of moves) assert.ok(PZ.puzzleMove(b, m), m);
    assert.equal(b.done, 'won');
    assert.equal(b.moves, b.best);
  }
});

test('the Tracker\'s rule: across toward you if it\'s open, else up or down, else it stands; two steps, caught on either', () => {
  // Tracker at A1 (0), you at C3 (12), no walls: across to B1, across to C1.
  assert.deepEqual(PZ.trackerTurn([], 0, 12).path, [0, 1, 2]);
  // A wall between A1 and B1: it goes down instead, then across.
  assert.deepEqual(PZ.trackerTurn(['0-1'], 0, 12).path, [0, 5, 6]);
  // Walled in both ways: it stands (it never goes around).
  assert.deepEqual(PZ.trackerTurn(['0-1', '0-5'], 0, 12).path, [0, 0, 0]);
  // Same column: up or down only. You two below: it lands on you on its second step.
  const t = PZ.trackerTurn([], 2, 12);
  assert.deepEqual(t.path, [2, 7, 12]); assert.equal(t.caught, true);
  // One step away: caught on the first step, it stops there.
  assert.deepEqual(PZ.trackerTurn([], 7, 12), { h: 12, caught: true, path: [7, 12] });
  // The board shows where it would catch you, and undo and restart take moves back.
  const b = PZ.newChase(99);
  const reach = PZ.chaseReach(b);
  for (const i of Object.keys(reach).map(Number)) assert.equal(PZ.chaseDanger(b, i), i !== b.exit && (i === b.h || PZ.trackerTurn(b.walls, b.h, i).caught));
  const p0 = b.p, h0 = b.h, { moves } = PZ.chaseSolve(b.walls, b.p, b.h, b.exit);
  PZ.puzzleMove(b, moves[0]);
  assert.equal(b.moves, 1);
  PZ.puzzleMove(b, 'undo');
  assert.deepEqual([b.p, b.h, b.moves], [p0, h0, 0]);
  PZ.puzzleMove(b, moves[0]); PZ.puzzleMove(b, moves[1]);
  assert.equal(b.moves, 2);
  PZ.puzzleMove(b, 'restart');
  assert.deepEqual([b.p, b.h, b.moves, b.hist.length], [b.p0, b.h0, 0, 0]);
});

test('every cascade is clearable in its fewest taps (and not fewer); it allows one more; a tap discharges wave by wave', () => {
  for (const seed of SEEDS.slice(0, 24)) {
    const b = PZ.newCascade(seed), n = b.b.filter(Boolean).length;
    assert.ok(n >= 12 && n <= 18, `seed ${seed}: ${n} nodes`);
    assert.ok(b.best >= 3, `seed ${seed}: fewest ${b.best}`);
    assert.equal(b.taps, b.best + 1);
    assert.ok(b.b.every((v) => v >= 0 && v <= 3));
    const { taps } = PZ.cascadeSolve(b.b);
    assert.equal(taps.length, b.best);
    assert.equal(PZ.cascadeSolve(b.b, b.best - 1).best, 0, 'no fewer taps clear it');
    for (const i of taps) PZ.puzzleMove(b, `tap ${i}`);
    assert.equal(b.done, 'won', `seed ${seed}`);
  }
  // The chain: a 3 beside a tap goes past 3 and discharges in the next wave, its other neighbours +1.
  const rack = Array(25).fill(0);
  rack[0] = 1; rack[1] = 3; rack[2] = 1; rack[6] = 2;
  const frames = PZ.discharge(rack, 0);
  assert.deepEqual(frames.map((f) => f.wave), [[0], [1]]);
  assert.deepEqual([rack[0], rack[1], rack[2], rack[6]], [0, 0, 2, 3], 'B1 went (past 3), C1 and B2 took +1 from it');
  // Out of taps with nodes left: lost.
  const b = PZ.newCascade(5);
  for (let k = 0; k < b.taps && !b.done; k++) PZ.puzzleMove(b, `tap ${b.b.findIndex(Boolean)}`);
  assert.ok(b.done === 'won' || (b.done === 'lost' && b.used === b.taps));
});

test('quarantine: the worm copies into the open frontier node with the most open neighbours (ties in reading order), a firewall takes its node, it ends when it can\'t spread, and what it never reached pays', () => {
  const { OPEN, INF, WALL, DEAD } = PZ.Q, cells = Array(63).fill(OPEN);
  cells[10] = INF; // B2
  // Frontier: B1 (1: 2 open), A2 (9: 2 open), C2 (11: 4 open), B3 (19: 4 open). Most open neighbours, first in reading order: C2.
  assert.equal(PZ.qTarget(cells), 11);
  cells[11] = WALL;
  assert.equal(PZ.qTarget(cells), 19, 'C2 walled: B3 next (4 open)');
  cells[19] = DEAD; cells[1] = WALL; cells[9] = WALL;
  assert.equal(PZ.qTarget(cells), -1, 'walled in: it can\'t spread');
  // On a real board: a firewall on the marked node, the worm goes where qTarget says, scores count open nodes (★ 3).
  const b = PZ.newQuarantine(17);
  const t0 = PZ.qTargets(b)[0].to, open0 = b.cells.filter((v) => v === OPEN).length;
  assert.equal(b.total, b.cells.reduce((n, v, i) => n + (v === OPEN ? (b.data.includes(i) ? 3 : 1) : 0), 0));
  assert.equal(PZ.puzzleMove(b, `wall ${b.starts[0]}`), null, 'no firewall on the worm');
  const did = PZ.puzzleMove(b, `wall ${t0}`);
  assert.equal(b.cells[t0], WALL);
  assert.equal(did.spread.length, 1);
  assert.equal(b.cells.filter((v) => v === OPEN).length, open0 - 2, 'one node walled, one infected');
  while (!b.done) PZ.puzzleMove(b, `wall ${PZ.qBest(b)}`);
  assert.equal(PZ.qTarget(b.cells), -1);
  const sc = PZ.puzzleScore(b);
  assert.equal(sc.saved, PZ.qValue(b));
  assert.equal(b.done, sc.saved >= b.total / 2 ? 'won' : 'lost');
  // Every board's bot play contains it to at least half (so every board can be won).
  for (const seed of SEEDS.slice(0, 12)) for (const floor of [1, 5]) {
    const q = PZ.newQuarantine(seed, { floor });
    while (!q.done) PZ.puzzleMove(q, PZ.botMove(q));
    assert.equal(q.done, 'won', `seed ${seed} floor ${floor}`);
  }
});

test('ping sweep: a ping reads the steps across plus down, pings and digs share a budget of 5, a pinged cell can still be dug', () => {
  assert.equal(PZ.pDist(0, 48), 12);
  assert.equal(PZ.pDist(8, 10), 2);
  for (const seed of SEEDS.slice(0, 10)) {
    const b = PZ.newSweep(seed, { floor: 1 }), c = b.caches[0];
    assert.equal(b.variant, 'one'); assert.equal(b.budget, 5); assert.equal(b.caches.length, 1);
    for (let i = 0; i < 49; i++) assert.equal(PZ.sweepRead(b, i), PZ.pDist(i, c));
    // Ping the cache's own cell: 0. Then dig it: found, and the budget left pays.
    PZ.puzzleMove(b, `ping ${c}`);
    assert.equal(b.pings[0].read, 0);
    assert.equal(PZ.puzzleMove(b, `ping ${c}`), null, 'a cell pings once');
    PZ.puzzleMove(b, `dig ${c}`);
    assert.equal(b.done, 'won');
    assert.equal(PZ.sweepLeft(b), 3);
  }
  // Five misses and it's over.
  const b = PZ.newSweep(3);
  const miss = Array.from({ length: 49 }, (_, i) => i).filter((i) => i !== b.caches[0]).slice(0, 5);
  for (const i of miss) PZ.puzzleMove(b, `dig ${i}`);
  assert.equal(b.done, 'lost'); assert.equal(PZ.sweepLeft(b), 0);
  assert.equal(PZ.puzzleMove(b, `dig ${b.caches[0]}`), null, 'nothing after the end');
  // The bot finds it within budget on every plain board.
  for (const seed of SEEDS) { const x = PZ.newSweep(seed); while (!x.done) PZ.puzzleMove(x, PZ.botMove(x)); assert.equal(x.done, 'won', `seed ${seed}`); }
});

test('deeper floors (4 and down): two outbreaks or a worm that copies twice; two caches (a budget of 8) or noisy cells that read one off. Floors 1 to 3: the plain boards', () => {
  const seen = { quarantine: new Set(), sweep: new Set() };
  for (const seed of SEEDS) {
    for (const floor of [1, 2, 3]) { assert.equal(PZ.newQuarantine(seed, { floor }).variant, 'one'); assert.equal(PZ.newSweep(seed, { floor }).variant, 'one'); }
    const q = PZ.newQuarantine(seed, { floor: 4 }), p = PZ.newSweep(seed, { floor: 6 });
    seen.quarantine.add(q.variant); seen.sweep.add(p.variant);
    if (q.variant === 'twin') { assert.equal(q.starts.length, 2); assert.equal(q.cells.filter((v) => v === PZ.Q.INF).length, 2); }
    if (q.variant === 'fast') { assert.equal(q.spread, 2); const n = q.cells.filter((v) => v === PZ.Q.INF).length; const did = PZ.puzzleMove(q, `wall ${PZ.qBest(q)}`); assert.equal(did.spread.length, 2, 'it copies twice a turn'); assert.equal(q.cells.filter((v) => v === PZ.Q.INF).length, n + 2); }
    if (p.variant === 'twin') { assert.equal(p.caches.length, 2); assert.equal(p.budget, 8); assert.ok(PZ.pDist(p.caches[0], p.caches[1]) >= 3); }
    if (p.variant === 'noisy') {
      assert.equal(Object.keys(p.noise).length, PZ.P.noisy);
      for (const i of Object.keys(p.noise).map(Number)) assert.equal(Math.abs(PZ.sweepRead(p, i) - PZ.pDist(i, p.caches[0])), 1, 'a noisy cell reads one off');
    }
  }
  assert.deepEqual([...seen.quarantine].sort(), ['fast', 'twin']);
  assert.deepEqual([...seen.sweep].sort(), ['noisy', 'twin']);
  // Two caches: a ping reads the nearest one still buried, and both are needed.
  const two = SEEDS.map((x) => PZ.newSweep(x, { floor: 5 })).find((x) => x.variant === 'twin');
  const [a, c] = two.caches;
  assert.equal(PZ.sweepRead(two, a), 0);
  PZ.puzzleMove(two, `dig ${a}`);
  assert.equal(two.done, null, 'one of two');
  assert.equal(PZ.sweepRead(two, a), PZ.pDist(a, c), 'it reads the other now');
  PZ.puzzleMove(two, `dig ${c}`);
  assert.equal(two.done, 'won');
});

test('the terminal\'s words: cells by address (c4), the board as text, every move in a line', () => {
  const b = PZ.newQuarantine(8);
  assert.equal(PZ.cellOf(b, 'c4'), 3 * 9 + 2);
  assert.equal(PZ.cellOf(b, 'a1'), 0);
  assert.equal(PZ.cellOf(b, 'z9'), null);
  assert.equal(PZ.cellName(b, 3 * 9 + 2), 'C4');
  const lines = PZ.boardLines(b);
  assert.equal(lines.length, 1 + 7 + 1);
  assert.match(lines.join('\n'), /X/); assert.match(lines.join('\n'), /!/);
  const t = PZ.qTargets(b)[0].to;
  assert.match(PZ.moveLine(b, PZ.puzzleMove(b, `wall ${t}`)), /^Firewall on [A-I]\d\. The worm copies into [A-I]\d\./);
});

// ---------- on a server ----------
const traced = (family = 'worm', { seed = 1, depth = 1, template = null } = {}) => {
  const s = fresh(); s.tutorialCompleted = true;
  command(s, `developer location ${family}`);
  const loc = s.locations.at(-1);
  loc.lockUntil = 0; loc.seed = seed; loc.depth = depth; if (template) loc.template = template;
  loc.floorplan = null;
  return { s, loc, R: roomsFor(s, loc) };
};
const puzzlesOf = (g) => Object.values(g.rooms).filter((x) => FP.isPuzzle(x.kind));
const walkIn = (s, id) => { const R = s.rooms; R.at = FP.neighbours(R.graph, id).find((x) => !FP.isPuzzle(R.graph.rooms[x].kind)); R.screen = null; R.visit.walked[R.at] = true; FP.go(s, id); };
function serverWith(kind, family = 'worm') {
  for (let k = 0; k < 300; k++) {
    const t = traced(family, { seed: 500 + k * 61, depth: kind === 'chase' ? 3 : 1 + (k % 3), template: kind === 'chase' ? ['mirror', 'archive', 'lab'][k % 3] : null });
    const room = puzzlesOf(t.R.graph).find((x) => x.kind === kind);
    if (room) return { ...t, room };
  }
  throw new Error('no server with ' + kind);
}

test('placement: one or two a server from its seed, never two of a kind, new rooms off a branch (never the entry, the Core, a vault, a guard post, the den or a socket), Quarantine leaning Worm, the chase only beside a Tracker\'s den', () => {
  const tally = { worm: { quarantine: 0, n: 0 }, other: { quarantine: 0, n: 0 } }, counts = new Set();
  for (let k = 0; k < 90; k++) {
    const family = ['worm', 'ransomware', 'ghostroot'][k % 3], tmpl = ['relay', 'mailhub', 'mirror', 'archive', 'lab'][k % 5];
    const { s, loc, R } = traced(family, { seed: 31 + k * 977, depth: 1 + (k % 3), template: tmpl }), g = R.graph, pz = puzzlesOf(g);
    counts.add(pz.length);
    assert.ok(pz.length >= 1 && pz.length <= 2, `${loc.name}: ${pz.length}`);
    assert.equal(new Set(pz.map((x) => x.kind)).size, pz.length, 'never two of a kind');
    assert.equal(g.puzzles, pz.length);
    for (const x of pz) {
      const links = FP.neighbours(g, x.id);
      assert.equal(links.length, 1, 'a leaf');
      const a = g.rooms[links[0]];
      assert.ok(![g.entry, g.core, ...g.vaults].includes(a.id) && !['guard', 'socket', 'den', 'entry', 'core', 'vault'].includes(a.kind), `${x.kind} hangs off ${a.kind}`);
      assert.ok(![g.entry, g.core, ...g.vaults, g.den].includes(x.id));
      if (x.kind === 'chase') { assert.equal(g.hunter, 'track'); assert.ok(FP.neighbours(g, g.den).includes(a.id), 'the chase beside the den'); }
      if (g.core) assert.ok(Math.abs(g.rooms[g.core].x - x.x) + Math.abs(g.rooms[g.core].y - x.y) > 1, 'never beside the Core (Root 2 and 4 build there)');
    }
    assert.equal(Object.keys(FP.distances(g, g.entry)).length, Object.values(g.rooms).filter(FP.onMap).length, 'still all connected (a hidden room only once it opens)');
    // Nothing moved: every room the generator made keeps its address.
    const bare = FP.generate(loc.seed, { size: R.size, kind: R.kind, level: R.level, floor: R.floor, author: R.author }), was = addrsOf(bare), now = addrsOf(g);
    for (const id of Object.keys(bare.rooms)) assert.equal(now[id], was[id], `${loc.name} ${id}`);
    const t = family === 'worm' ? tally.worm : tally.other;
    t.n++; if (pz.some((x) => x.kind === 'quarantine')) t.quarantine++;
    assert.ok(s);
  }
  assert.deepEqual([...counts].sort(), [1, 2]);
  assert.ok(tally.worm.quarantine / tally.worm.n > tally.other.quarantine / tally.other.n + 0.15, `Quarantine leans Worm: ${tally.worm.quarantine}/${tally.worm.n} against ${tally.other.quarantine}/${tally.other.n}`);
  // Wild servers have none: SPRAWL-00, a rogue server, the farm.
  const s = fresh();
  play(s, 'connect sprawl');
  assert.equal(puzzlesOf(s.rooms.graph).length, 0, 'SPRAWL-00');
  FP.jackOut(s);
});

test('fog: a puzzle room is a ? like any other until you\'ve been in it; then its own icon and its state (ready, in play, solved or failed with its refill)', () => {
  const { s, loc, room } = serverWith('cascade');
  play(s, `connect ${loc.name}`);
  const R = s.rooms;
  R.seen[room.id] = 'shape';
  const chipOf = (html) => html.match(new RegExp(`<g class="fp-room [^"]*" data-room="${room.id}"[\\s\\S]*?</g></g>|<g class="fp-room [^"]*" data-room="${room.id}"[^>]*>[\\s\\S]*?(?=<g class="fp-room|<path class="fp-route|<g class="fp-bits|</svg>)`)) ?.[0] || '';
  let chip = chipOf(roomsMarkup(s));
  assert.match(chip, /k-fog/); assert.doesNotMatch(chip, /fp-i-cascade|Cascade|CASCADE/i);
  assert.match(FP.treeLines(s).join('\n'), new RegExp(`\\? ${FP.addrOf(s, room.id)}  \\?`));
  walkIn(s, room.id);
  assert.ok(FP.known(s, room.id));
  assert.equal(FP.puzzleState(s, room), 'ready');
  chip = chipOf(roomsMarkup(s));
  assert.match(chip, /k-cascade/); assert.match(chip, /fp-i-cascade/);
  const b = FP.boardOf(s, room);
  FP.act(s, 'play', PZ.botMove(b));
  assert.equal(FP.puzzleState(s, room), b.done ? 'won' : 'live');
  while (!b.done) FP.act(s, 'play', PZ.botMove(b));
  assert.equal(FP.puzzleState(s, room), 'won');
  FP.go(s, FP.neighbours(R.graph, room.id)[0]);
  const html = roomsMarkup(s);
  assert.match(chipOf(html), /SOLVED/);
  assert.match(chipOf(html), /fp-respawn amber/, 'its refill ring');
  assert.match(FP.roomsCommand(s, 'ls').map((e) => e.message).join('\n'), /puzzle · Cascade · solved · ↻ 1:59:\d\d|puzzle · Cascade · solved · ↻ 2:00:00/);
});

test('play: walking in opens its board; moves by the card\'s verbs or the terminal; it ends once, pays once, counts as cleared, and stays done until it refills (two hours) with a new board', () => {
  const { s, loc, room } = serverWith('quarantine');
  play(s, `connect ${loc.name}`);
  const R = s.rooms;
  walkIn(s, room.id);
  assert.match(roomsMarkup(s), /id="pz-panel"/, 'its board over the map');
  assert.doesNotMatch(roomsMarkup(s), /id="fp-pop"/, 'the pop-up stands aside');
  const said = FP.roomsCommand(s, 'play').map((e) => e.message).join('\n');
  assert.match(said, /Quarantine: Wall it in\./);
  const b = FP.boardOf(s, room), seed0 = b.seed;
  assert.deepEqual(FP.boardOf(s, room), b, 'the same board until it refills');
  const t = PZ.qTargets(b)[0].to;
  FP.roomsCommand(s, `play wall ${PZ.cellName(b, t).toLowerCase()}`);
  assert.equal(b.cells[t], PZ.Q.WALL, 'the terminal\'s play wall c4');
  // Walk out mid-play and back: as you left it.
  const out = FP.neighbours(R.graph, room.id)[0];
  FP.go(s, out); FP.go(s, room.id);
  assert.equal(FP.boardOf(s, room).turn, 1);
  assert.equal(FP.puzzleState(s, room), 'live');
  const xp0 = s.hackers[Object.keys(s.hackers)[0]].xp, pack0 = s.run.pack.length;
  let end = null;
  while (!b.done) { const ev = FP.act(s, 'play', PZ.botMove(b), { pause: true }); end = ev.find((e) => e.type === 'puzzle-end') || end; }
  assert.ok(end && end.won, 'contained');
  assert.equal(end.pay.code, Math.round((FP.ROOMS.puzzles.code(R.level) * PZ.qValue(b)) / b.total), 'the server\'s code for what it never reached');
  assert.equal(s.run.pack.length, pack0 + 1, 'into the pack');
  assert.equal(s.run.pack.at(-1).material, R.code);
  assert.ok(R.cleared[room.id], 'counts toward Rooms n/N');
  const xpEv = s.logs.find((e) => e.type === 'xp' && /Quarantine solved/.test(e.message));
  assert.ok(xpEv && xpEv.kind === 'intel', 'a little XP, as intel');
  assert.ok(s.hackers[Object.keys(s.hackers)[0]].xp !== xp0 || xpEv.amount > 0);
  // Done: nothing more, nothing paid twice.
  const after = FP.act(s, 'play', 'wall 0');
  assert.ok(after.some((e) => e.type === 'warning' && /done\. A fresh board in/.test(e.message)));
  assert.equal(s.run.pack.length, pack0 + 1);
  assert.equal(FP.puzzleState(s, room), 'won');
  // Two hours on: a fresh board, a new one.
  clock += 2 * 3600000 + 1000;
  assert.equal(FP.puzzleState(s, room), 'ready');
  const fresh2 = FP.boardOf(s, room);
  assert.notEqual(fresh2.seed, seed0);
  assert.equal(fresh2.turn, 0);
  assert.equal(R.puzzles[room.id].n, 1);
});

test('what each pays: Cascade components (more for a tap left over), Ping sweep a cache (more for the budget left), a lost board nothing but what Quarantine saved', () => {
  {
    const { s, loc, room } = serverWith('cascade');
    play(s, `connect ${loc.name}`); walkIn(s, room.id);
    const b = FP.boardOf(s, room), parts = s.salvage.length;
    let end;
    while (!b.done) end = FP.act(s, 'play', PZ.botMove(b)).find((e) => e.type === 'puzzle-end') || end;
    assert.equal(b.used, b.best, 'the solver used the fewest');
    assert.equal(s.salvage.length - parts, FP.ROOMS.puzzles.parts + FP.ROOMS.puzzles.spare, 'components, one tap spare');
    assert.equal(end.pay.parts, s.salvage.length - parts);
  }
  {
    const { s, loc, room } = serverWith('sweep');
    play(s, `connect ${loc.name}`); walkIn(s, room.id);
    const b = FP.boardOf(s, room);
    FP.act(s, 'play', `dig ${b.caches[0]}`);
    const end = s.logs.findLast((e) => e.type === 'puzzle-end');
    assert.ok(end.won && end.pay.credits > 0 && end.pay.code > 0);
    assert.ok(s.run.pack.some((f) => f.kind === 'credits' && f.amount === end.pay.credits));
  }
  {
    const { s, loc, room } = serverWith('sweep', 'ransomware');
    play(s, `connect ${loc.name}`); walkIn(s, room.id);
    const b = FP.boardOf(s, room), pack = s.run.pack.length;
    for (const i of Array.from({ length: 49 }, (_, k) => k).filter((k) => !b.caches.includes(k)).slice(0, b.budget)) FP.act(s, 'play', `dig ${i}`);
    const end = s.logs.findLast((e) => e.type === 'puzzle-end');
    assert.equal(end.won, false);
    assert.equal(s.run.pack.length, pack, 'a lost sweep pays nothing');
    assert.equal(FP.puzzleState(s, room), 'lost', 'and locks until it refills, as a win does');
    assert.ok(s.rooms.cleared[room.id], 'played to its end: cleared');
  }
});

test('the chase, with the real Tracker: through the door it loses your trail for the visit (and a small cache); caught, the hunter fight starts right there', () => {
  const { s, loc, room } = serverWith('chase');
  play(s, `connect ${loc.name}`);
  const R = s.rooms, g = R.graph;
  walkIn(s, room.id);
  const h = FP.hunterOf(s);
  assert.ok(h && h.kind === 'track');
  const b = FP.boardOf(s, room), pack = s.run.pack.length;
  for (const m of PZ.chaseSolve(b.walls, b.p, b.h, b.exit).moves) FP.act(s, 'play', m);
  assert.equal(b.done, 'won');
  assert.ok(h.lost, 'it lost your trail');
  assert.equal(s.run.pack.length, pack + 2, 'half a cache: credits and code');
  // Back to its den and asleep, and walking past it doesn't wake it again this visit.
  Object.assign(h, { at: h.den, awake: false, returning: false, count: 0 });
  const by = FP.neighbours(g, g.den).find((id) => id !== room.id && !FP.isPuzzle(g.rooms[id].kind));
  R.at = FP.neighbours(g, by).find((x) => x !== g.den) || by; R.screen = null;
  if (R.at !== by) FP.go(s, by); else FP.wait(s);
  assert.equal(h.awake, false, 'it stays asleep');
  // A fresh board (two hours on, a new visit): caught.
  FP.jackOut(s); clock += 2 * 3600000 + 60000;
  play(s, `connect ${loc.name}`);
  walkIn(s, room.id);
  const c = FP.boardOf(s, s.rooms.graph.rooms[room.id]);
  assert.equal(c.done, null);
  const toward = () => { const reach = PZ.chaseReach(c); const hit = Object.keys(reach).map(Number).find((i) => PZ.chaseDanger(c, i)); if (hit != null) return `go ${hit}`; const d = (i) => PZ.pDist(i, c.h); return `go ${Object.keys(reach).map(Number).filter((i) => i !== c.exit).sort((x, y) => d(x) - d(y))[0] ?? c.p}`; };
  let ev = [];
  for (let n = 0; n < 30 && !c.done; n++) ev = FP.act(s, 'play', toward(), { pause: true });
  assert.equal(c.done, 'lost');
  assert.ok(active(s), 'the fight is on');
  assert.equal(s.encounter.rooms.as, 'hunter');
  assert.equal(s.encounter.rooms.room, room.id, 'right there');
  assert.ok(ev.some((e) => e.type === 'engage'));
  assert.equal(FP.hunterOf(s).at, room.id);
});

test('the bot plays them: every board it walks into ends, and it never stalls on one', () => {
  for (const kind of PZ.PUZZLE_KINDS) {
    const { s, loc, room } = serverWith(kind);
    play(s, `connect ${loc.name}`);
    walkIn(s, room.id);
    botStep(s);
    if (active(s)) continue; // (a chase the solver lost would be a fight: it never is)
    assert.notEqual(FP.puzzleState(s, room), 'ready', kind);
    assert.notEqual(FP.puzzleState(s, room), 'live', kind);
  }
});

test('an older save: its traced servers gain their puzzle rooms from their seed, nothing it had moves (ids, names, addresses, cleared, seen, held, programs, the run), and twice is once', () => {
  const { s, loc } = serverWith('quarantine');
  play(s, `connect ${loc.name}`);
  const R = loc.floorplan, g = R.graph;
  // Back to before puzzle rooms: none on the graph.
  for (const x of puzzlesOf(g)) { delete g.rooms[x.id]; g.links = g.links.filter((l) => !l.includes(x.id)); delete R.seen[x.id]; }
  delete g.puzzles;
  const ids = Object.keys(g.rooms);
  for (const id of ids.slice(0, 4)) { R.cleared[id] = clock; R.seen[id] = 'kind'; }
  loc.takenOver = true; R.held = clock;
  const sock = Object.values(g.rooms).find((x) => x.kind === 'socket');
  R.programs = { [sock.id]: 'harvester' };
  const before = { addrs: { ...addrsOf(g) }, paths: Object.fromEntries(ids.map((id) => [id, g.rooms[id].path])), seen: { ...R.seen }, cleared: { ...R.cleared }, at: R.at, cwd: s.run.cwd };
  const t = restore(JSON.parse(JSON.stringify(s)));
  assert.equal(t.version, SAVE_VERSION);
  const l2 = t.locations.find((x) => x.id === loc.id), R2 = l2.floorplan, g2 = R2.graph, added = puzzlesOf(g2);
  assert.ok(added.length >= 1 && added.length <= 2, 'its puzzle rooms');
  assert.ok(added.some((x) => x.kind === 'quarantine'), 'the same kinds from its seed');
  for (const id of ids) {
    assert.equal(addrsOf(g2)[id], before.addrs[id], `${id} keeps its address`);
    assert.equal(g2.rooms[id].path, before.paths[id], `${id} keeps its name`);
  }
  assert.deepEqual(Object.fromEntries(Object.entries(R2.seen).filter(([id]) => ids.includes(id))), before.seen, 'what you\'d seen');
  assert.deepEqual(R2.cleared, before.cleared, 'what you\'d cleared');
  for (const x of added) assert.ok(!FP.known(t, x.id) && !R2.cleared[x.id], 'new rooms: unknown, uncleared');
  assert.ok(l2.takenOver, 'still yours');
  assert.deepEqual(R2.programs, { [sock.id]: 'harvester' }, 'its programs');
  assert.equal(t.run.cwd, before.cwd, 'the run where it was');
  assert.equal(R2.at, before.at);
  // Twice is once.
  const again = restore(JSON.parse(JSON.stringify(t)));
  assert.deepEqual(again.locations.find((x) => x.id === loc.id).floorplan.graph, g2);
  puzzleRoomsRestore(again);
  assert.equal(puzzlesOf(again.locations.find((x) => x.id === loc.id).floorplan.graph).length, added.length);
  assert.deepEqual(placePuzzles(l2, g2), [], 'a graph with them is done');
});
