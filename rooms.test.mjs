// The rooms playtest (docs/servers.md R0, floorplan.mjs): the room graph and its generator, moving and its Signal cost,
// respawn timers, progress, the key walk and the vault, the hunters (a Patroller's loop, a Tracker's den), fog, the
// terminal, the page, and the bot mapping a server. The interrupt: interrupt.test.mjs. The bodies and attack sets:
// families.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, hooks, active, finish, stashItem } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import * as FP from './dist/floorplan.mjs';
import { roomsMarkup } from './dist/floorplan-view.mjs';
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
    assert.equal(ids.length, FP.ROOMS.sizes[size], tag);
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

test('walking: a room\'s first entry on a visit costs 3% of your max Signal, walked rooms and wait are free', () => {
  const s = server({ hunter: null, size: 'small' }), R = s.rooms, g = R.graph;
  const max = R.max, cost = Math.round(max * FP.ROOMS.move);
  const next = FP.neighbours(g, R.at).map((id) => g.rooms[id]).find((r) => !FP.FIGHTS.includes(r.kind)) || FP.neighbours(g, R.at).map((id) => g.rooms[id])[0];
  // Clear its fight first so we can walk through.
  if (FP.FIGHTS.includes(next.kind)) R.down[next.id] = clock;
  const was = R.signal;
  FP.go(s, next.id);
  assert.equal(R.signal, was - cost, 'first entry: 3%');
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
  assert.equal(R.signal, before - cost, 'a new visit: the walk costs again');
  const deep = server({ floor: 5, size: 'small' });
  const room = FP.neighbours(deep.rooms.graph, deep.rooms.at).map((id) => deep.rooms.graph.rooms[id])[0];
  assert.equal(FP.moveCost(deep, room), Math.round(deep.rooms.max * FP.ROOMS.moveDeep));
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
  assert.equal(T, 15 * 60000, '15 minutes for a process');
  assert.equal(FP.respawnMs(s, roomOfKind(s, 'elite')), 45 * 60000);
  assert.equal(FP.respawnMs(s, roomOfKind(s, 'guard')), 20 * 60000);
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
  assert.ok(FP.roomList(s).every((x) => R.seen[x.id] === 'kind'), 'the whole graph is drawn');
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

test('fog: you see the kind of the rooms next to you, the shape one further, and /core always', () => {
  const s = server({ size: 'large', hunter: 'track', kind: 'Lab' }), R = s.rooms, g = R.graph;
  const d = FP.distances(g, R.at);
  for (const [id, n] of Object.entries(d)) {
    if (id === g.core) assert.equal(R.seen[id], 'kind');
    else if (n <= 1) assert.equal(R.seen[id], 'kind', `next to you: ${id}`);
    else if (n === 2) assert.equal(R.seen[id], 'shape', `two off: ${id}`);
    else assert.equal(R.seen[id], undefined, `out of sight: ${id}`);
  }
  // An Infiltrator sees kinds one link further.
  const i = server({ cls: 'infiltrator', size: 'large', hunter: 'track', kind: 'Lab' }), di = FP.distances(i.rooms.graph, i.rooms.at);
  for (const [id, n] of Object.entries(di)) if (n === 2) assert.equal(i.rooms.seen[id], 'kind');
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
  assert.match(map, /rooms \d+\/12/);
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

test('the bot maps a medium server, the Resident and all', () => {
  const r = runServer({ cls: 'bastion', seed: 101, kind: 'Relay' });
  assert.equal(r.mapped, true);
  assert.equal(r.progress.done, r.progress.total);
  assert.ok(r.bossWon >= 1);
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
