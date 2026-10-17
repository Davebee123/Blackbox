// The rooms playtest (docs/servers.md R0, floorplan.mjs): the room graph and its generator, moving and its Signal cost,
// respawn timers, progress, the key walk and the vault, the hunters (a Patroller's loop, a Tracker's den), fog, the
// terminal, the page, and the bot mapping a server. The interrupt: interrupt.test.mjs. The bodies and attack sets:
// families.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, hooks, active, finish, stashItem } from './dist/combat.mjs';
import { CONFIG, GUARDS } from './dist/data.mjs';
import * as FP from './dist/floorplan.mjs';
import { roomsMarkup, popOf, pickRoom, closePop } from './dist/floorplan-view.mjs';
import { runServer } from './roomsim.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false;
let clock = Date.UTC(2026, 0, 1);
hooks.now = () => clock;
const tick = (ms) => { clock += ms; };
function server({ cls = 'breaker', seed = 7, kind = 'Mailhub', size = 'medium', hunter = null, boss = 'a', floor = 2, speed = 1, author = null } = {}) {
  const s = fresh();
  s.rng = seed * 7777;
  FP.outfit(s, { cls, level: 10, gearSeed: seed });
  FP.startRooms(s, { seed, kind, size, level: 10, hunter, boss, floor, speed, author });
  FP.connect(s);
  return s;
}
const roomOfKind = (s, k) => FP.roomList(s).find((r) => r.kind === k);
const win = (s) => { s.encounter.virus.parts.forEach((p) => { p.integrity = 0; }); finish(s, 'victory'); FP.settle(s); };
const lose = (s) => { s.run.integrity = 0; finish(s, 'crashed'); FP.settle(s); };
// Put the player in a room directly (tests of what a room does, not of the walk).
const place = (s, id) => { s.rooms.at = id; s.rooms.visit.walked[id] = true; s.rooms.screen = null; FP.look(s); };
const SIZES = ['small', 'medium', 'large'];

test('the generator: the same seed builds the same server, and other seeds build others', () => {
  for (const kind of FP.KIND_IDS) for (const size of SIZES) {
    const a = FP.generate(11, { size, kind, level: 10, floor: 2, author: 'tollgate' }), b = FP.generate(11, { size, kind, level: 10, floor: 2, author: 'tollgate' });
    assert.deepEqual(a, b, `${kind} ${size}`);
  }
  const shapes = new Set(Array.from({ length: 12 }, (_, i) => JSON.stringify(FP.generate(i + 1, { size: 'medium', kind: 'Mailhub', level: 10, floor: 2, author: 'tollgate' }).links)));
  assert.ok(shapes.size >= 10, 'different seeds, different graphs');
});

test('every server is connected, sized by the table, and laid out as the doc asks', () => {
  for (const kind of FP.KIND_IDS) for (const size of SIZES) for (let seed = 1; seed <= 25; seed++) {
    const g = FP.generate(seed, { size, kind, level: 10, floor: 2, author: FP.KINDS[kind].author }), ids = Object.keys(g.rooms), tag = `${kind} ${size} seed ${seed}`;
    assert.equal(ids.length, FP.ROOMS.sizes[size] + FP.ROOMS.sockets[size], `${tag}: its rooms and (R2) its socket rooms`);
    // Socket rooms: at the end of a branch, never by the entry, a vault, the Core or the den, each guarded by a process.
    const sockets = ids.filter((id) => g.rooms[id].kind === 'socket');
    assert.equal(sockets.length, FP.ROOMS.sockets[size], tag);
    for (const id of sockets) {
      const by = FP.neighbours(g, id);
      assert.equal(by.length, 1, `${tag}: a socket is a leaf`);
      assert.ok(![g.entry, g.core, g.den, ...g.vaults].includes(by[0]) && !g.spine.includes(by[0]), `${tag}: off a branch`);
      assert.ok(g.rooms[id].family, `${tag}: a process of the server guards it`);
    }
    const d = FP.distances(g, g.entry);
    assert.equal(Object.keys(d).length, ids.length, `${tag}: every room reachable from the entry`);
    // The spine: entry to /core, the vault the room before it, /core only behind the vault.
    assert.equal(g.spine.length, FP.ROOMS.spine[size], tag);
    assert.equal(g.rooms[g.entry].kind, 'entry'); assert.equal(g.rooms[g.core].kind, 'core'); assert.equal(g.rooms[g.vaults[0]].kind, 'vault');
    assert.deepEqual(FP.neighbours(g, g.core), [g.vaults[0]], `${tag}: /core sits behind its vault`);
    // The key: a guard post 3+ rooms from its vault (not through /core).
    for (const v of g.vaults) {
      const post = ids.find((id) => g.rooms[id].key === v);
      assert.ok(post, `${tag}: a key for every vault`);
      assert.ok(FP.distances(g, v, (x) => x !== g.core)[post] >= 3, `${tag}: the key is 3+ rooms from its vault`);
    }
    assert.equal(g.vaults.length, kind === 'Archive' ? 2 : 1, tag);
    if (kind === 'Relay') assert.equal(g.hops.length, 2, `${tag}: two hops`);
    assert.equal(g.loops.length, { small: 0, medium: 1, large: 2 }[size], `${tag}: loops`);
    // The hunter: on medium and large from floor 2. A Patroller's loop never takes in the entry, the rest room, a vault or /core.
    if (size === 'small') assert.equal(g.den, undefined, tag);
    else {
      assert.ok(g.den, `${tag}: a den`);
      assert.equal(g.hunter, FP.KINDS[kind].hunter);
      if (g.route) {
        assert.ok(g.route.includes(g.den));
        assert.ok(!g.route.some((id) => id === g.entry || g.rooms[id].kind === 'rest' || g.vaults.includes(id) || id === g.core), `${tag}: the loop`);
        if (!g.ping) assert.ok(g.route.length >= 4 && g.route.length <= 7, `${tag}: a loop of 4 to 7 rooms`);
        for (let i = 0; i < g.route.length; i++) assert.ok(FP.neighbours(g, g.route[i]).includes(g.route[(i + 1) % g.route.length]), `${tag}: the loop walks links`);
      }
    }
    // About half the rooms are fights, and the rest room (medium, large) isn't next to the den.
    const fights = ids.filter((id) => FP.FIGHTS.includes(g.rooms[id].kind)).length;
    assert.ok(fights >= ids.length * 0.4, `${tag}: ${fights} fights`);
    const rest = ids.find((id) => g.rooms[id].kind === 'rest');
    if (size !== 'small') assert.ok(rest && !(g.den && FP.neighbours(g, g.den).includes(rest)), tag);
  }
  // The floor doesn't change a small server: no hunter, unless the playtest asks for one.
  assert.equal(FP.generate(3, { size: 'medium', kind: 'Lab', level: 10, floor: 1, author: 'lantern' }).den, undefined, 'floor 1: no hunter');
  assert.ok(FP.generate(3, { size: 'medium', kind: 'Lab', level: 10, floor: 1, author: 'lantern', hunter: 'patrol' }).den, '&hunter= forces one');
});

test('walking: a room\'s first entry on a visit costs 5% of your max Signal if you\'ve never been in it, 3% if you have; walked rooms and wait are free', () => {
  const s = server({ hunter: null, size: 'small' }), R = s.rooms, g = R.graph;
  const max = R.max, cost = Math.round(max * FP.ROOMS.moveNew), again = Math.round(max * FP.ROOMS.move);
  const next = FP.neighbours(g, R.at).map((id) => g.rooms[id]).find((r) => !FP.FIGHTS.includes(r.kind)) || FP.neighbours(g, R.at).map((id) => g.rooms[id])[0];
  // Clear its fight first so we can walk through.
  if (FP.FIGHTS.includes(next.kind)) R.down[next.id] = clock;
  const was = R.signal;
  FP.go(s, next.id);
  assert.equal(R.signal, was - cost, 'first entry into a room you have never been in: 5%');
  FP.go(s, g.entry);
  assert.equal(R.signal, was - cost, 'the entry was walked: free');
  FP.go(s, next.id);
  assert.equal(R.signal, was - cost, 'walked this visit: free');
  FP.wait(s);
  assert.equal(R.signal, was - cost, 'wait: free');
  // A new visit pays again; from floor 5 it's 4%.
  FP.jackOut(s); tick(10 * 60000); FP.connect(s);
  const before = R.signal;
  FP.go(s, next.id);
  assert.equal(R.signal, before - again, 'a new visit: the walk costs again, 3% now that you know the room');
  const deep = server({ floor: 5, size: 'small' });
  const room = FP.neighbours(deep.rooms.graph, deep.rooms.at).map((id) => deep.rooms.graph.rooms[id])[0];
  assert.equal(FP.moveCost(deep, room), Math.round(deep.rooms.max * FP.ROOMS.moveNewDeep), 'from floor 5: 6% unknown');
  deep.rooms.seen[room.id] = 'kind';
  assert.equal(FP.moveCost(deep, room), Math.round(deep.rooms.max * FP.ROOMS.moveDeep), 'and 4% known');
});

test('a live virus holds its room: engage or step back, and the move in is spent', () => {
  const s = server({ size: 'small' }), R = s.rooms;
  const fightRoom = FP.neighbours(R.graph, R.at).map((id) => R.graph.rooms[id]).find((r) => ['process', 'guard', 'elite'].includes(r.kind)) || FP.roomList(s).find((r) => r.kind === 'process');
  place(s, FP.neighbours(R.graph, fightRoom.id).find((id) => id !== fightRoom.id));
  const was = R.signal;
  FP.go(s, fightRoom.id);
  assert.equal(R.screen?.kind, 'virus');
  const other = FP.neighbours(R.graph, fightRoom.id).find((id) => id !== R.visit.back);
  if (other) { FP.go(s, other); assert.equal(R.at, fightRoom.id, 'no walking through a live virus'); }
  FP.back(s);
  assert.notEqual(R.at, fightRoom.id, 'stepped back');
  assert.ok(R.signal < was, 'the move in stays spent');
  FP.go(s, fightRoom.id);
  FP.act(s, 'engage');
  assert.ok(active(s) && s.encounter.rooms.room === fightRoom.id);
});

test('respawns: a fallen room comes back on its timer (never while you stand in it), and a cache refills', () => {
  const s = server({ size: 'medium', hunter: 'patrol' }), R = s.rooms;
  const room = roomOfKind(s, 'process');
  place(s, room.id);
  R.screen = null;
  FP.fight(s, room);
  win(s);
  assert.equal(FP.isUp(s, room), false, 'down after its fall');
  const T = FP.respawnMs(s, room);
  assert.equal(T, 15 * 60000, '15 minutes for a process while you explore the server');
  assert.equal(FP.respawnMs(s, roomOfKind(s, 'elite')), 45 * 60000);
  assert.equal(FP.respawnMs(s, roomOfKind(s, 'guard')), 20 * 60000);
  assert.equal(FP.respawnMs(s, roomOfKind(s, 'core')), 60 * 60000);
  // Mapped, it's a farm: the fast timers (real play clears a medium server's fights in about 4 minutes).
  R.mapped = clock;
  assert.equal(FP.farmed(s), true);
  assert.equal(FP.respawnMs(s, room), 2 * 60000);
  assert.equal(FP.respawnMs(s, roomOfKind(s, 'elite')), 5 * 60000);
  assert.equal(FP.respawnMs(s, roomOfKind(s, 'guard')), 3 * 60000);
  assert.equal(FP.respawnMs(s, roomOfKind(s, 'core')), 10 * 60000);
  assert.equal(FP.ROOMS.respawn.cache, 120, 'caches and puzzle boards: 2 hours either way');
  assert.equal(FP.ROOMS.rare, 0.1, 'one respawn in ten is a rare spawn');
  R.mapped = null;
  tick(T + 1000);
  assert.equal(FP.isUp(s, room), false, 'never while you stand in it');
  const out = FP.neighbours(R.graph, room.id)[0];
  R.at = out;
  assert.equal(FP.isUp(s, room), true, 'back once you\'ve left');
  assert.ok(FP.backAt(s, room) <= clock);
  // Walking in after it came back: the virus holds the room again.
  R.at = out; R.visit.walked[room.id] = true;
  FP.go(s, room.id);
  assert.equal(R.screen?.kind, 'virus');
  // The playtest's clocks run ten times as fast.
  const fast = server({ speed: 10 });
  assert.equal(FP.respawnMs(fast, roomOfKind(fast, 'process')), 90000);
  // A cache: taken, then full again 2 hours later.
  const c = roomOfKind(s, 'cache');
  R.screen = null; place(s, c.id);
  FP.act(s, 'pull');
  assert.equal(FP.cacheFull(s, c), false);
  tick(2 * 3600000);
  assert.equal(FP.cacheFull(s, c), true);
  // The server card's soonest timer names a room.
  const t = FP.soonest(fast);
  assert.equal(t, null, 'nothing down on a fresh server');
});

test('progress: rooms cleared at least once, for good; it never goes down', () => {
  const s = server({ size: 'medium', hunter: 'patrol' }), R = s.rooms;
  let last = FP.progressOf(s).done;
  assert.equal(last, 1, 'the entry counts once you\'re in');
  // The bot plays visit after visit (losses and all): progress only ever climbs.
  const r = runServer({ cls: 'operator', seed: 3, kind: 'Lab', hours: 1.5 });
  assert.ok(r.progress.done >= r.progress.total / 2);
  // A respawn doesn't take a cleared room back.
  const room = roomOfKind(s, 'process');
  place(s, room.id); FP.fight(s, room); win(s);
  const done = FP.progressOf(s).done;
  assert.ok(done > last);
  tick(3 * 3600000);
  R.at = R.graph.entry;
  assert.equal(FP.isUp(s, room), true);
  assert.equal(FP.progressOf(s).done, done, 'respawned, still cleared');
  // A loss: disconnected, and progress stays.
  place(s, room.id); FP.fight(s, room); lose(s);
  assert.equal(R.at, null, 'disconnected');
  assert.equal(FP.progressOf(s).done, done);
  // Half the server cleared draws the whole graph: the next first clear past it shows every room.
  tick(60000); FP.connect(s);
  const c = roomOfKind(s, 'cache'), total = FP.roomList(s).length;
  for (const x of FP.roomList(s)) if (FP.progressOf(s).done < Math.ceil(total / 2) - 1 && x.id !== c.id) R.cleared[x.id] ||= clock;
  assert.ok(FP.roomList(s).some((x) => !R.seen[x.id]), 'some rooms out of sight');
  place(s, c.id); FP.act(s, 'pull');
  assert.ok(FP.roomList(s).every((x) => R.seen[x.id]), 'the whole graph is drawn');
  // Drawn, not discovered: a room you've never been in is still an unknown shape.
  for (const x of FP.roomList(s)) if (!R.cleared[x.id] && x.id !== R.at) assert.equal(R.seen[x.id], 'shape', `${x.path}: unknown`);
});

test('the key walk: beat the guard post for the key, walk it to the vault, open it, and /core unseals', () => {
  const s = server({ size: 'medium', hunter: 'patrol' }), R = s.rooms, g = R.graph;
  const post = roomOfKind(s, 'guard'), vault = g.rooms[g.vaults[0]];
  assert.equal(post.key, vault.id);
  // /core is sealed until then.
  place(s, vault.id);
  assert.ok(!FP.exits(s).some((x) => x.kind === 'core'), 'sealed');
  FP.act(s, 'open');
  assert.equal(R.opened[vault.id], undefined, 'no key, no open');
  place(s, post.id);
  FP.fight(s, post); win(s);
  assert.deepEqual(R.visit.keys, [vault.id], 'the key is in your pack');
  // Jack out with it: it goes back to its post, guard and all.
  FP.jackOut(s);
  assert.equal(FP.isUp(s, post), true, 'the guard is back');
  tick(10 * 60000); FP.connect(s);
  assert.deepEqual(R.visit.keys, [], 'a key lasts one visit');
  place(s, post.id); FP.fight(s, post); win(s);
  place(s, vault.id);
  const sig = R.signal;
  FP.act(s, 'open');
  assert.ok(R.opened[vault.id], 'the key opens it');
  assert.equal(R.signal, sig, 'opening with the key costs nothing');
  assert.deepEqual(R.visit.keys, [], 'the key is used');
  assert.ok(FP.coreOpen(s) && FP.exits(s).some((x) => x.kind === 'core'), '/core unseals');
  assert.ok(R.cleared[vault.id], 'the vault counts toward progress');
  // It stays open: next visit needs no key.
  FP.jackOut(s); tick(10 * 60000); FP.connect(s);
  assert.ok(FP.coreOpen(s));
  // Forcing a vault: 15% of your max Signal, no key.
  const t = server({ seed: 9, size: 'medium', hunter: 'patrol' }), v = t.rooms.graph.rooms[t.rooms.graph.vaults[0]];
  place(t, v.id);
  const before = t.rooms.signal;
  FP.act(t, 'force');
  assert.equal(t.rooms.signal, before - Math.round(t.rooms.max * FP.ROOMS.force));
  assert.ok(t.rooms.opened[v.id] && FP.coreOpen(t));
  // An Archive: two vaults, each with its own key; only the spine's unseals /core.
  const a = server({ kind: 'Archive', seed: 4 }), ag = a.rooms.graph;
  assert.equal(ag.vaults.length, 2);
  const posts = FP.roomList(a).filter((x) => x.kind === 'guard');
  assert.deepEqual(posts.map((x) => x.key).sort(), [...ag.vaults].sort());
  place(a, ag.vaults[1]); FP.act(a, 'force');
  assert.equal(FP.coreOpen(a), false, 'the tape vault doesn\'t unseal /core');
});

test('caches: bait costs 10% of your max Signal to pull, cat tells you first; contents and progress', () => {
  let found = null;
  for (let seed = 1; seed < 60 && !found; seed++) { const s = server({ seed, size: 'large' }); const c = FP.roomList(s).find((x) => x.kind === 'cache' && !x.mirror && FP.isBait(s, x)); if (c) found = { s, c }; }
  assert.ok(found, 'some cache is bait');
  const { s, c } = found, R = s.rooms;
  place(s, c.id);
  FP.act(s, 'cat');
  assert.ok(R.log.at(-1).includes('canary'), 'cat shows the canary');
  const was = R.signal, credits = R.credits;
  FP.act(s, 'pull');
  assert.equal(R.signal, was - Math.round(R.max * FP.ROOMS.bait), 'the canary costs 10%');
  assert.ok(R.credits > credits, 'and you still take what it held');
  assert.ok(R.cleared[c.id]);
});

test('the rest room: 30% of your max, once a visit', () => {
  const s = server(), R = s.rooms, rest = roomOfKind(s, 'rest');
  place(s, rest.id);
  R.signal = 10;
  FP.act(s, 'rest');
  assert.equal(R.signal, 10 + Math.round(R.max * FP.ROOMS.rest));
  FP.act(s, 'rest');
  assert.equal(R.signal, 10 + Math.round(R.max * FP.ROOMS.rest), 'once a visit');
  assert.ok(R.cleared[rest.id]);
});

test('home: Signal rests back at 20% a minute (the clock\'s speed in the playtest), and the server takes you back after 30 s', () => {
  const s = server(), R = s.rooms;
  R.signal = 20;
  FP.jackOut(s);
  assert.equal(R.at, null);
  const r = FP.connect(s);
  assert.ok(r.some((e) => e.type === 'warning'), 'the reconnect wait');
  tick(30000);
  assert.equal(FP.signalNow(s), 20 + Math.floor(0.5 * 0.2 * R.max));
  tick(5 * 60000);
  assert.equal(FP.signalNow(s), R.max, 'full in 5 minutes');
  FP.connect(s);
  assert.equal(R.at, R.graph.entry);
  assert.equal(R.signal, R.max);
  // Losing a fight: disconnected, the unbanked pack lost, banked gear kept.
  const room = roomOfKind(s, 'elite');
  place(s, room.id); FP.fight(s, room); win(s);
  const items = [...R.pack];
  place(s, roomOfKind(s, 'process').id); FP.fight(s, roomOfKind(s, 'process')); lose(s);
  assert.equal(R.pack.length, 0);
  for (const id of items) assert.equal(stashItem(s, id), null, 'the unbanked pack is gone');
  assert.equal(R.signal, 0);
});

test('fog: a room is unknown until you have been in it; you see the shapes next to you and one further, and the Core\'s chip', () => {
  const s = server({ size: 'large', hunter: 'track', kind: 'Lab' }), R = s.rooms, g = R.graph;
  const d = FP.distances(g, R.at);
  for (const [id, n] of Object.entries(d)) {
    if (id === R.at) assert.equal(R.seen[id], 'kind', 'the room you are in is discovered');
    else if (id === g.core || n <= 2) assert.equal(R.seen[id], 'shape', `drawn, unknown: ${id} (${n} off)`);
    else assert.equal(R.seen[id], undefined, `out of sight: ${id}`);
  }
  // Walk in: discovered for good, and still discovered from afar, a visit later.
  const next = FP.exits(s)[0];
  FP.go(s, next.id);
  assert.equal(R.seen[next.id], 'kind');
  if (R.screen?.kind === 'virus') FP.act(s, 'back');
  FP.jackOut(s); tick(60000); FP.connect(s);
  assert.ok(FP.known(s, next.id), 'remembered on the server');
  // An Infiltrator sees shapes one link further, and kinds no sooner.
  const i = server({ cls: 'infiltrator', size: 'large', hunter: 'track', kind: 'Lab' }), di = FP.distances(i.rooms.graph, i.rooms.at);
  for (const [id, n] of Object.entries(di)) if (n >= 1 && n <= 3) assert.equal(i.rooms.seen[id], 'shape', `${id} (${n} off)`);
});

test('the hunter moves only when you walk or wait, never while you fight, loot, open or rest', () => {
  const s = server({ hunter: 'patrol', kind: 'Mailhub' }), R = s.rooms, h = FP.hunterOf(s);
  assert.equal(h.kind, 'patrol');
  const snap = () => `${h.at}:${h.count}:${h.idx}`;
  const before = snap();
  // A fight, a pull, an open, a rest: nothing moves it.
  const p = roomOfKind(s, 'process'); place(s, p.id); FP.fight(s, p); for (let k = 0; k < 6; k++) { if (!active(s)) break; s.encounter.virus.parts.forEach((x) => { if (x.attack) x.attack.due = 999; }); }
  win(s);
  place(s, roomOfKind(s, 'cache').id); FP.act(s, 'cat'); FP.act(s, 'pull');
  place(s, roomOfKind(s, 'vault').id); FP.act(s, 'force');
  place(s, roomOfKind(s, 'rest').id); FP.act(s, 'rest');
  assert.equal(snap(), before, 'nothing moved it');
  // Waiting does: one room for every 2 moves.
  place(s, roomOfKind(s, 'rest').id);
  const route = R.graph.route, at0 = route.indexOf(h.at);
  FP.wait(s);
  assert.equal(h.at, route[at0], 'one move: it counts');
  FP.wait(s);
  assert.equal(h.at, route[(at0 + 1) % route.length], 'two moves: it steps along its loop');
  for (let k = 0; k < route.length * 2; k++) FP.wait(s);
  assert.equal(h.at, route[(at0 + 1 + route.length) % route.length], 'round its loop, a room every two moves');
});

test('a Patroller walks its loop and never steps into the rest room or the entry; a meeting is a fight', () => {
  for (let seed = 1; seed <= 15; seed++) {
    const s = server({ seed, hunter: 'patrol', kind: 'Relay' }), R = s.rooms, h = FP.hunterOf(s), seen = new Set();
    place(s, roomOfKind(s, 'rest').id);
    for (let k = 0; k < 40; k++) { FP.wait(s); seen.add(h.at); assert.ok(R.graph.route.includes(h.at)); }
    assert.ok(![...seen].some((id) => id === R.graph.entry || R.graph.rooms[id].kind === 'rest'), `seed ${seed}`);
    assert.ok(!active(s), 'it never came in to the rest room');
  }
  // Stepping into its room: a fight with it (no back-off).
  const s = server({ hunter: 'patrol', kind: 'Mailhub' }), R = s.rooms, h = FP.hunterOf(s);
  const next = FP.neighbours(R.graph, h.at).find((id) => !FP.FIGHTS.includes(R.graph.rooms[id].kind) && R.graph.rooms[id].kind !== 'core') || FP.neighbours(R.graph, h.at)[0];
  place(s, next);
  h.count = 0;
  FP.go(s, h.at);
  assert.ok(active(s) && s.encounter.rooms.as === 'hunter', 'you walked into it');
  assert.equal(s.encounter.virus.level, R.level + 2, 'two levels over the server');
  win(s);
  assert.equal(h.down, true, 'down for the rest of the visit');
  FP.jackOut(s); tick(60000); FP.connect(s);
  assert.equal(FP.hunterOf(s).down, false, 'back at its den the next visit');
  assert.equal(FP.hunterOf(s).at, R.graph.den);
});

test('a Tracker sleeps until you walk next to its den, follows you, loses you 5 rooms off and walks home', () => {
  let checked = 0;
  for (let seed = 1; seed <= 8; seed++) {
    const s = server({ seed, hunter: 'track', kind: 'Mirror', size: 'large' }), R = s.rooms, g = R.graph, h = FP.hunterOf(s), den = g.den;
    const walkable = (id) => g.rooms[id].kind !== 'core' && !g.vaults.includes(id) && g.rooms[id].kind !== 'rest' && id !== g.entry;
    const fromDen = FP.distances(g, den);
    assert.equal(h.awake, false, 'asleep');
    // Walking around away from the den doesn't wake it.
    const far = Object.keys(fromDen).find((id) => fromDen[id] >= 3 && walkable(id));
    place(s, far); FP.wait(s); FP.wait(s);
    assert.equal(h.awake, false, `seed ${seed}: far from the den, asleep`);
    assert.equal(h.at, den);
    // Into a room next to the den: it wakes.
    const near = FP.neighbours(g, den).find((id) => walkable(id)), before = FP.neighbours(g, near).find((id) => id !== den);
    place(s, before);
    R.down[near] = clock; R.visit.walked[near] = true;
    FP.go(s, near);
    assert.equal(h.awake, true, `seed ${seed}: next to its den, awake`);
    // It follows by the shortest path, a room for every 2 moves.
    const its = (from) => FP.distances(g, from, walkable); // the rooms it walks (never the entry, the rest room, a vault or /core)
    const three = Object.keys(its(h.at)).find((id) => its(h.at)[id] === 3);
    if (!three) continue;
    checked++;
    place(s, three); R.screen = null; h.count = 0;
    FP.wait(s);
    assert.equal(its(h.at)[R.at], 3, 'one move: it counts');
    FP.wait(s);
    assert.equal(its(h.at)[R.at], 2, 'two moves: a room closer');
    // 5 rooms off: it loses you and walks back to its den, then sleeps.
    const away = Object.keys(FP.distances(g, h.at)).find((id) => FP.distances(g, h.at)[id] >= 5 && walkable(id));
    if (!away) continue;
    place(s, away); h.count = 0;
    FP.wait(s); FP.wait(s);
    assert.ok(h.returning || !h.awake, `seed ${seed}: it lost you`);
    for (let k = 0; k < 30 && h.awake; k++) { const d = FP.distances(g, h.at)[den]; FP.wait(s); FP.wait(s); if (h.awake) assert.ok(FP.distances(g, h.at)[den] < d, 'it walks home'); }
    assert.equal(h.awake, false, `seed ${seed}: back asleep`);
    assert.equal(h.at, den, 'in its den');
  }
  assert.ok(checked >= 4, 'enough servers walked');
  // A Lab's Tracker moves a room every move once awake.
  const lab = server({ hunter: 'track', kind: 'Lab' }), lh = FP.hunterOf(lab);
  assert.equal(FP.paceOf(lab, lh), 2);
  lh.awake = true;
  assert.equal(FP.paceOf(lab, lh), 1);
});

test('the hunter never walks into the rest room: it waits at the door', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const s = server({ seed, hunter: 'track', kind: 'Archive' }), R = s.rooms, g = R.graph, h = FP.hunterOf(s), rest = roomOfKind(s, 'rest');
    if (!rest) continue;
    place(s, rest.id);
    h.awake = true; h.returning = false;
    for (let k = 0; k < 20; k++) { FP.wait(s); assert.notEqual(h.at, rest.id); }
    assert.ok(!active(s));
    const d = FP.distances(g, h.at)[rest.id];
    assert.ok(d === 1 || (FP.distances(g, h.at, (x) => x !== g.entry && !g.vaults.includes(x) && x !== g.core)[rest.id] ?? 9) >= 1, 'at the door, or as near as it can get');
  }
});

test('an Infiltrator slips past the hunter once a visit', () => {
  const s = server({ cls: 'infiltrator', hunter: 'patrol' }), R = s.rooms, h = FP.hunterOf(s);
  const next = FP.neighbours(R.graph, h.at).find((id) => !FP.FIGHTS.includes(R.graph.rooms[id].kind)) || FP.neighbours(R.graph, h.at)[0];
  place(s, next); h.count = 0;
  FP.go(s, h.at);
  assert.equal(R.screen?.kind, 'hunter');
  FP.act(s, 'slip');
  assert.ok(!active(s) && R.visit.slipped);
  assert.notEqual(R.screen?.kind, 'hunter');
});

test('the terminal: ls names the exits and the hunter, cd moves, map draws what you\'ve seen', () => {
  const s = server({ hunter: 'patrol' }), R = s.rooms;
  const ls = FP.roomsCommand(s, 'ls').find((e) => e.type === 'rooms-out').message;
  assert.match(ls, /\[entry\]/);
  assert.match(ls, /Patroller is/);
  const first = FP.neighbours(R.graph, R.at).map((id) => R.graph.rooms[id])[0];
  FP.roomsCommand(s, `cd ${first.dir}`);
  assert.equal(R.at, first.id);
  if (R.screen?.kind === 'virus') FP.roomsCommand(s, 'back');
  const map = FP.roomsCommand(s, 'map').find((e) => e.type === 'rooms-out').message;
  assert.match(map, new RegExp(`rooms \\d+/${12 + FP.ROOMS.sockets.medium}`), 'twelve rooms and two socket rooms');
  FP.roomsCommand(s, 'developer bossrule c');
  assert.equal(R.bossRule, 'c');
  FP.roomsCommand(s, 'jack out');
  assert.equal(R.at, null);
});

test('the page draws home, a room, a fight room and the map in both orientations', () => {
  const s = server({ hunter: 'track', kind: 'Mirror' }), R = s.rooms;
  let html = roomsMarkup(s);
  assert.match(html, /fp-svg wide/); assert.match(html, /fp-svg tall/);
  assert.match(html, /Boss rule/);
  assert.match(html, /DEADBOLT/, '/core shows its Resident');
  const p = FP.neighbours(R.graph, R.at).map((id) => R.graph.rooms[id]).find((r) => FP.FIGHTS.includes(r.kind));
  if (p) { FP.go(s, p.id); html = roomsMarkup(s); assert.match(html, /Engage/); }
  FP.jackOut(s);
  html = roomsMarkup(s);
  assert.match(html, /Connect/);
  assert.doesNotMatch(html, /undefined|NaN/);
});

// One room's chip in the page's markup: from its <g> to the next room's, or to what follows the rooms.
const chipOf = (html, id) => { const i = html.indexOf(`data-room="${id}"`); if (i < 0) return ''; const from = html.lastIndexOf('<g class="fp-room', i), rest = html.slice(i); const end = rest.search(/<g class="fp-room|<path class="fp-route|<g class="fp-bits|<\/svg>/); return html.slice(from, i + end); };
const wideOf = (html) => html.match(/<svg class="fp-svg wide"[\s\S]*?<\/svg>/)[0];

test('the map chips: one badge language for state, countdowns and rings that tick in place, tooltips that say each thing once', () => {
  const s = server(), R = s.rooms, g = R.graph;
  const tile = (html, id) => chipOf(wideOf(html), id);
  const tip = (html, id) => tile(html, id).match(/title="([^"]*)"/)?.[1] || '';
  let html = roomsMarkup(s);
  // You: the only teal chip, its pulsing ring and YOU on the entry; a room you can walk into carries its cost; the
  // Core is SEALED.
  assert.match(tile(html, g.entry), /class="fp-room k-entry t-you here[^"]*"/);
  assert.match(tile(html, g.entry), /fp-you-ring/);
  assert.match(tile(html, g.entry), />YOU</);
  assert.equal((wideOf(html).match(/ t-you /g) || []).length, 1, 'only your room is teal');
  const next = FP.exits(s)[0];
  assert.match(tile(html, next.id), new RegExp(`data-rooms="go" data-arg="${next.id}"`));
  assert.match(tile(html, next.id), new RegExp(`fp-cost[\\s\\S]*−${FP.moveCost(s, next)}<`));
  // The Core you've never been in is an unknown chip; once discovered it is SEALED, from afar.
  assert.doesNotMatch(tile(html, g.core), /SEALED|fp-icon/);
  R.seen[g.core] = 'kind';
  html = roomsMarkup(s);
  assert.match(tile(html, g.core), /fp-tag hot[\s\S]*>SEALED</, 'the sealed Core is SEALED');
  assert.match(tip(html, g.core), /^Core: Level \d+ DEADBOLT/);
  // No legend, no "Next ↻" on the strip: the chips carry it.
  assert.doesNotMatch(html, /fp-legend|Next ↻/);
  // A fallen room: gray, and its countdown is an empty slot the page fills and its ring an arc the page sets, so the
  // markup holds still while it ticks.
  const p = FP.roomList(s).find((r) => r.kind === 'process');
  R.down[p.id] = clock; R.cleared[p.id] = clock; R.seen[p.id] = 'kind';
  html = roomsMarkup(s);
  const at = FP.backAt(s, p);
  assert.match(tile(html, p.id), /class="fp-room k-process t-gray/);
  assert.match(tile(html, p.id), new RegExp(`data-at="${at}" data-fmt="s"></tspan>`));
  assert.match(tile(html, p.id), new RegExp(`<circle class="arc"[^>]*data-ring-from="${clock}" data-ring-at="${at}"`), 'a respawn ring');
  tick(5000);
  assert.equal(roomsMarkup(s), html, 'five seconds on, the same markup');
  // Tooltips: the room's name as the title, at most two lines, never a countdown or the name again.
  for (const room of FP.roomList(s)) {
    const t = tip(html, room.id);
    if (!t) continue;
    const [head, ...body] = t.split(': ');
    const lines = body.join(': ').split('\n').filter(Boolean);
    assert.ok(lines.length <= 2, `${room.path}: ${t}`);
    assert.doesNotMatch(t, /\d+:\d\d|comes back in|refills in/i, `${room.path}: no countdown in its tooltip`);
    if (FP.seenOf(s, room.id) === 'kind') { assert.equal(head.replace(/\n.*/s, ''), room.path); assert.ok(!lines.join(' ').includes(room.path), `${room.path} says its name once`); }
  }
  // The log: no Signal readout the strip already shows.
  assert.ok(!R.log.some((l) => new RegExp(`${R.max}\\b`).test(l) && /\/\d+/.test(l)), R.log.join(' | '));
});

test('Schematic HD: chips by kind and colour, KEY, LOCKED and SEALED, the hunter\'s skull and its one arrow, traces without vias', () => {
  const s = server({ hunter: 'patrol' }), R = s.rooms, g = R.graph;
  for (const id of Object.keys(g.rooms)) R.seen[id] = 'kind';
  let html = roomsMarkup(s), wide = wideOf(html);
  const tone = (id) => chipOf(wide, id).match(/class="fp-room k-(\w+) t-(\w+)/)?.slice(1);
  // A chip for every room you've seen, with its kind and colour: teal only for you, a live fight red with its live
  // light, the Core red, the vault, a stocked cache and the rest room amber (no steel blue on the map).
  assert.equal((wide.match(/<g class="fp-room /g) || []).length, FP.roomList(s).length);
  for (const room of FP.roomList(s)) {
    const [k, t] = tone(room.id);
    assert.equal(k, room.kind);
    if (room.id === R.at) assert.equal(t, 'you');
    else if (FP.FIGHTS.includes(room.kind)) { assert.equal(t, 'hot', room.path); assert.match(chipOf(wide, room.id), /class="fp-live"/, `${room.path}: a red live light`); }
    else if (['vault', 'cache', 'rest'].includes(room.kind)) assert.equal(t, 'amber', room.path);
  }
  assert.doesNotMatch(wide, /steel|#86b6c6/i);
  // The guard post is an Elite to you: named and numbered with the elites, the elite's icon, and KEY.
  const post = FP.roomList(s).find((x) => x.kind === 'guard'), elites = FP.roomList(s).filter((x) => ['elite', 'guard'].includes(x.kind));
  assert.match(post.path, /^Elite( \d+)?$/);
  assert.deepEqual(elites.map((x) => x.path).sort(), elites.length > 1 ? elites.map((_, i) => `Elite ${i + 1}`).sort() : ['Elite']);
  assert.doesNotMatch(html, /Guard post/);
  assert.match(chipOf(wide, post.id), /href="#fp-i-elite"/);
  assert.match(chipOf(wide, post.id), /fp-tag key[\s\S]*>KEY</);
  const vault = g.rooms[g.vaults[0]];
  assert.match(chipOf(wide, vault.id), /fp-tag lock[\s\S]*>LOCKED</);
  assert.match(chipOf(wide, g.core), />SEALED</);
  // Take the key: KEY leaves the elite and the vault says your key fits; open it and the Core unseals.
  R.visit.keys = [vault.id];
  wide = wideOf(roomsMarkup(s));
  assert.doesNotMatch(chipOf(wide, post.id), />KEY</);
  assert.match(chipOf(wide, vault.id), />KEY FITS</);
  R.opened[vault.id] = clock;
  wide = wideOf(roomsMarkup(s));
  assert.equal(tone(vault.id)[1], 'gray', 'an opened vault is used');
  assert.doesNotMatch(chipOf(wide, g.core), />SEALED</);
  // A pop-up on the key's room is titled by the guard in it (the room is an Elite by kind).
  R.opened = {}; R.visit.keys = [];
  const ui = { sel: null, selAt: null, closed: null };
  pickRoom(s, post.id, ui);
  const card = roomsMarkup(s, ui).match(/<div class="map-pop fp-pop"[\s\S]*$/)[0];
  assert.match(card, new RegExp(`<h1>${GUARDS[post.guard].name.toUpperCase()}</h1>`));
  assert.match(card, new RegExp(GUARDS[post.guard].name));
  assert.match(card, /Carries the Vault key/);
  // Traces: a bed and a line for every link, no via dots; the links out of your room flow amber.
  wide = wideOf(roomsMarkup(s));
  assert.doesNotMatch(wide, /fp-via|fp-dot/);
  assert.equal((wide.match(/class="fp-bed/g) || []).length, FP.linksOf(g).length);
  assert.equal((wide.match(/class="fp-link live/g) || []).length, FP.exits(s).length);
  // No SVG filter on a straight line (a zero-height box makes it vanish).
  assert.doesNotMatch(wide, /<line[^>]*filter=/);
  // The hunter: a skull on its room and one red arrow into the room it steps into next, nothing on that room.
  const h = R.visit.hunter, nextId = FP.hunterNext(s, h);
  assert.ok(nextId, 'the Patroller has a next room');
  assert.equal((wide.match(/class="fp-skull/g) || []).length, 1);
  assert.match(chipOf(wide, h.at), /class="fp-skull/);
  assert.equal((wide.match(/class="fp-route"/g) || []).length, 1, 'one route path');
  assert.match(wide, /<path class="fp-route" d="M[\d.-]+ [\d.-]+ Q[\d.-]+ [\d.-]+ [\d.-]+ [\d.-]+" marker-end="url\(#fp-arrow\)"\/>/);
  assert.doesNotMatch(chipOf(wide, nextId), /hunt-next|fp-ring|NEXT/);
  // The bits drift off your room only: twelve of them.
  assert.equal((wide.match(/<g class="fp-bits"/g) || []).length, 1);
  assert.equal((wide.match(/<g class="fp-bits"[\s\S]*?<\/g>/)[0].match(/<text /g) || []).length, 12);
  // A cleared fight room wears a respawn ring; an emptied cache an amber one.
  const p = FP.roomList(s).find((x) => x.kind === 'process' && x.id !== R.at), c = FP.roomList(s).find((x) => x.kind === 'cache' && !x.mirror);
  R.down[p.id] = clock; R.cleared[p.id] = clock; R.taken[c.id] = clock;
  wide = wideOf(roomsMarkup(s));
  assert.match(chipOf(wide, p.id), /class="fp-respawn hot"/);
  assert.match(chipOf(wide, c.id), /class="fp-respawn amber"/);
  assert.equal(tone(c.id)[1], 'gray');
  // A rare spawn: ★.
  delete R.down[p.id]; R.rare[p.id] = true;
  assert.match(chipOf(wideOf(roomsMarkup(s)), p.id), /fp-tag rare[\s\S]*>★</);
  // The zoom: the map carries its own fit-the-server button, and its base view in data-vb.
  html = roomsMarkup(s);
  assert.match(html, /data-fp-zoom/);
  assert.match(html, /<svg class="fp-svg wide" viewBox="([^"]+)" data-vb="\1"/);
  assert.doesNotMatch(html, /undefined|NaN/);
});

test('the page is the map and a pop-up: it opens on a decision and on a click, closes until the next one, and Wait and Jack out sit on the strip', () => {
  const s = server({ hunter: 'patrol' }), R = s.rooms, g = R.graph, ui = { sel: null, selAt: null, closed: null };
  const pop = (html) => html.match(/<div class="map-pop fp-pop" id="fp-pop" data-pop="([^"]+)"[\s\S]*$/);
  let html = roomsMarkup(s, ui);
  // No side column: no exits list, no tty. Wait and Jack out are on the strip.
  assert.doesNotMatch(html, /fp-side|fp-exits|fp-log|Exits</);
  assert.match(html, /class="fp-acts"><button[^>]*data-rooms="wait"[\s\S]*data-rooms="jackout"/);
  // The entry wants nothing: no pop-up. Other rooms you've seen open one on a click; rooms you can walk into walk.
  assert.equal(popOf(s, ui), null);
  assert.equal(pop(html), null);
  assert.match(html, new RegExp(`data-room="${g.core}" data-fp-sel="${g.core}" tabindex="0"`));
  const p = FP.exits(s).find((x) => x.kind === 'process');
  assert.match(html, new RegExp(`data-room="${p.id}" data-rooms="go" data-arg="${p.id}"`));
  // The Core, never been in: its card says only that it's unknown.
  pickRoom(s, g.core, ui);
  html = roomsMarkup(s, ui);
  assert.match(pop(html)[0], /unknown[\s\S]*<h1>Unknown room<\/h1>/);
  assert.doesNotMatch(pop(html)[0], /DEADBOLT|Sealed|Core/);
  closePop(s, ui);
  R.seen[g.core] = 'kind'; // discovered (as if you'd been in): its card from afar
  pickRoom(s, g.core, ui);
  html = roomsMarkup(s, ui);
  assert.equal(pop(html)[1], g.core);
  assert.match(pop(html)[0], /sealed[\s\S]*<h1>Core<\/h1>[\s\S]*DEADBOLT[\s\S]*Sealed until you open the Vault/);
  assert.doesNotMatch(pop(html)[0], /data-rooms=/, 'a far room has no verbs');
  assert.doesNotMatch(html, new RegExp(`data-room="${g.core}"[^>]*title=`), 'no tooltip on the room the card is about');
  pickRoom(s, g.core, ui);
  assert.equal(popOf(s, ui), null, 'a second click closes it');
  // Walk into a live virus: the card opens by itself, Engage and Step back.
  pickRoom(s, g.core, ui);
  FP.go(s, p.id);
  assert.equal(popOf(s, ui), p.id, 'a step drops the room you clicked; the decision opens on yours');
  html = roomsMarkup(s, ui);
  assert.match(pop(html)[0], /you are here · live[\s\S]*data-rooms="engage"[\s\S]*data-rooms="back"/);
  assert.doesNotMatch(pop(html)[0], /heading for/, 'no hunter line unless it is about this room');
  // Closed, it stays closed through redraws and ticks; a far room can still be looked at.
  closePop(s, ui);
  tick(3000);
  assert.equal(popOf(s, ui), null);
  pickRoom(s, g.entry, ui);
  assert.match(pop(roomsMarkup(s, ui))[0], /<h1>Entry<\/h1>/);
  FP.act(s, 'back');
  // A stocked cache, the rest room (when it can rest), a locked vault: each opens its card with its verbs.
  const c = FP.roomList(s).find((x) => x.kind === 'cache' && !x.mirror);
  place(s, c.id); R.visit.moves++;
  assert.equal(popOf(s, ui), c.id);
  html = pop(roomsMarkup(s, ui))[0];
  assert.match(html, /data-rooms="pull"[^>]*>Take it[\s\S]*data-fp-pop-close>Leave it</, 'standing in it: take it or leave it');
  assert.match(html, FP.isBait(s, c) ? /Bait\. Taking it costs \d+ Signal\./ : /Clean: credits and code\./, 'and you see what it is, nothing to read first');
  assert.doesNotMatch(html, /data-rooms="cat"/);
  const rest = roomOfKind(s, 'rest');
  place(s, rest.id); R.visit.moves++; R.signal = R.max;
  assert.equal(popOf(s, ui), null, 'full Signal: nothing to decide');
  R.signal = Math.round(R.max / 2);
  assert.equal(popOf(s, ui), rest.id);
  assert.match(pop(roomsMarkup(s, ui))[0], /data-rooms="rest"/);
  const v = g.rooms[g.vaults[0]];
  place(s, v.id); R.visit.moves++; R.visit.keys = [v.id];
  assert.match(pop(roomsMarkup(s, ui))[0], /key fits[\s\S]*data-rooms="open"[\s\S]*data-rooms="force"/);
  // Home: the card on the entry with Connect, and Connect on the strip.
  FP.jackOut(s);
  html = roomsMarkup(s, ui);
  assert.equal(pop(html)[1], g.entry);
  assert.match(pop(html)[0], /Jacked out[\s\S]*data-rooms="connect"/);
  assert.match(html, /class="fp-acts"><button[^>]*data-rooms="connect"/);
  assert.doesNotMatch(html, /undefined|NaN/);
});

test('the bot maps a medium server, the Resident and all (five times in twelve at its own level since the long climb: stepping into the unknown costs 5%)', () => {
  // Twelve seeds: on four it swung between 2 and 3 with the loot rolls' share of the dice (about 70% over 24).
  // Since the long climb (v42) it stays at level 10 the whole way: before, the server's own XP took it to 12 or 13 while it
  // mapped and it mapped 8 of these 12; at its own level the elites (a Worm, a Trojan) stop it on 7, so it maps 5.
  const runs = [101, 7, 23, 58, ...Array.from({ length: 8 }, (_, i) => 200 + i * 37)].map((seed) => runServer({ cls: 'bastion', seed, kind: 'Relay' }));
  const mapped = runs.filter((r) => r.mapped);
  assert.ok(mapped.length >= 5, `${mapped.length}/12 mapped`);
  for (const r of mapped) { assert.equal(r.progress.done, r.progress.total); assert.ok(r.bossWon >= 1); }
});

test('a Mirror\'s mirrored cache: pulling it breaks the mirror, and the elite behind it guards what it holds', () => {
  const s = server({ kind: 'Mirror', hunter: 'track' }), R = s.rooms, c = FP.roomList(s).find((x) => x.mirror);
  assert.ok(c && c.kind === 'cache' && c.family, 'one cache is a mirror, with its elite fixed by the seed');
  place(s, c.id);
  assert.equal(R.screen, null, 'walking in starts no fight');
  FP.act(s, 'cat');
  assert.match(R.log.at(-1), /mirror/);
  const credits = R.credits;
  FP.act(s, 'pull');
  assert.ok(active(s) && s.encounter.rooms.as === 'mirror' && s.encounter.virus.elite, 'the elite steps out');
  win(s);
  assert.ok(R.credits > credits, 'what the cache held is yours');
  assert.equal(FP.cacheFull(s, c), false);
  assert.ok(R.cleared[c.id]);
});

test('after a lost fight, home shows your Signal resting from 0, and Connect waits for it', () => {
  const s = server(), R = s.rooms, p = roomOfKind(s, 'process');
  place(s, p.id); FP.fight(s, p);
  s.run.integrity = 0; finish(s, 'crashed'); // not settled yet, as in the browser
  assert.equal(R.at, null);
  assert.equal(FP.signalNow(s), 0);
  tick(60000);
  assert.ok(FP.signalNow(s) > 0, 'it rests');
  tick(5 * 60000);
  FP.connect(s);
  assert.equal(R.at, R.graph.entry);
});
