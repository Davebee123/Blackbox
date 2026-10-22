// Co-op, a shared run and the host swap (docs/coop.md): the party walks the host's server together (the host leads,
// the guest's view follows), a cache the host takes pays the guest a share of their own, a rest heals both, and "Go to
// <guest>'s network" hands the session over: the old guest hosts, and both walk the new host's servers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, alive, hackerOf, maxSignal } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import { benchBuild } from './dist/bench.mjs';
import { play, currentLocation } from './dist/run.mjs';
import { matesOf } from './dist/crew.mjs';
import { planner } from './dist/planner.mjs';
import * as FP from './dist/floorplan.mjs';
import { nameOf } from './dist/network.mjs';
import { memoryPair } from './dist/coop-net.mjs';
import { hostSession, guestSession, hostGame, guestGame, hostSwap, humansReady } from './dist/coop.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false;
CONFIG.exfil.chance = 0;
// Two players on two networks of their own (a bench keeps its network seed).
const bench = (as, level, handle, netSeed) => { const s = fresh(); s.netSeed = netSeed; s.rng = (netSeed * 2654435761) >>> 0; benchBuild(s, as, level); s.profile.handle = handle; return s; };
function pairUp() {
  const c = { t: Date.now() };
  c.now = () => c.t;
  const host = bench('demolitionist', 10, 'ana', 101), guest = bench('sysop', 10, 'bo', 202);
  const H = hostGame(hostSession(host, { now: c.now }));
  const [hl, gl] = memoryPair();
  H.add(hl);
  const G = guestGame(guestSession(guest, gl, { now: c.now }));
  const P = { c, host, guest, H, G };
  P.tick = () => { c.t += 200; P.H?.tick(); P.G?.tick(); };
  return P;
}
const traced = (s) => s.locations.find((l) => !l.rogue && !l.farm && l.floorplan !== undefined && l.id !== 'kessler') || s.locations.find((l) => !l.rogue);
const near = (s, id) => FP.neighbours(s.rooms.graph, id)[0];
const stepInto = (s, id) => { const R = s.rooms; R.at = near(s, id); R.screen = null; FP.go(s, id); };
const roomOfKind = (s, kind) => Object.values(s.rooms.graph.rooms).find((r) => r.kind === kind);
const win = (P) => {
  for (let i = 0; i < 80 && active(P.host); i++) {
    const t = P.host.encounter.virus.parts.find(alive);
    command(P.host, planner(P.host) || `spike ${t.id}`);
    if (active(P.host)) { P.G.command(`spike ${(P.host.encounter.virus.parts.find(alive) || t).id}`); if (active(P.host) && humansReady(P.host)) command(P.host, 'now'); }
    P.tick();
  }
  FP.settle(P.host);
  P.tick();
};

test('the party walks the host\'s server: the guest\'s view follows the host room by room, and the guest can\'t lead', () => {
  const P = pairUp();
  const loc = traced(P.host);
  play(P.host, 'connect ' + loc.id); P.tick();
  const V = P.G.view;
  assert.ok(V, 'a view once the host is on a run');
  assert.equal(currentLocation(V).name, loc.name, 'the host\'s server');
  assert.equal(V.rooms.at, P.host.rooms.at, 'in the same room');
  assert.ok(!P.guest.locations.some((l) => l.name === loc.name) || P.guest.netSeed !== P.host.netSeed, 'not a server of the guest\'s own');
  const next = FP.neighbours(P.host.rooms.graph, P.host.rooms.at)[0];
  play(P.host, 'go ' + P.host.rooms.graph.rooms[next].id); P.tick();
  assert.equal(P.G.view.rooms.at, P.host.rooms.at, 'the host moved, and the guest with them');
  assert.equal(P.G.view.run.cwd, P.host.run.cwd);
  assert.equal(P.guest.run, null, 'the guest\'s own save is never on the host\'s run');
  P.G.command('go 1');
  assert.ok(P.host.logs.some((x) => x.who === 'bo' && /ana leads the party/.test(x.message)), 'the host leads');
  play(P.host, 'jack out'); P.tick();
  assert.equal(P.G.view, null, 'the host home: the guest\'s page goes back to their own save');
});

test('a cache the host takes pays the guest a share of their own, on the guest\'s dice; the host\'s pack is the host\'s', () => {
  const P = pairUp();
  play(P.host, 'connect ' + traced(P.host).id); P.tick();
  const cache = roomOfKind(P.host, 'cache');
  assert.ok(cache, 'a cache on this server');
  const credits0 = P.guest.server.credits, mats0 = { ...P.guest.materials }, hostPack0 = P.host.run.pack.length;
  stepInto(P.host, cache.id);
  if (active(P.host)) win(P);
  if (P.host.rooms.screen?.kind === 'virus') play(P.host, 'engage');
  if (active(P.host)) win(P);
  play(P.host, 'pull'); P.tick();
  assert.ok(P.host.rooms.taken[cache.id] != null, 'the host took it');
  assert.ok(P.host.run.pack.length > hostPack0, 'into the host\'s pack');
  assert.ok(P.guest.server.credits > credits0, `the guest's share: ${credits0} → ${P.guest.server.credits}`);
  assert.ok(Object.keys(mats0).some((k) => P.guest.materials[k] > mats0[k]), 'and code');
  assert.ok(P.guest.logs.some((x) => x.type === 'coop-share'), 'on the guest\'s own log');
  assert.ok(P.G.view.logs.some((x) => /Your share of the cache/.test(x.message)), 'and on their screen');
});

test('a shared fight on the host\'s server: the guest\'s Signal carries to the next fight; a rest heals it; a new run starts it full', () => {
  const P = pairUp();
  play(P.host, 'connect ' + traced(P.host).id); P.tick();
  const room = Object.values(P.host.rooms.graph.rooms).find((r) => r.kind === 'process');
  stepInto(P.host, room.id);
  if (!active(P.host)) play(P.host, 'engage');
  assert.ok(active(P.host), 'a fight');
  const bo = () => matesOf(P.host).find((m) => m.who === 'bo');
  assert.ok(bo().encounter, 'the guest is in it');
  bo().run.integrity = 40; // badly hurt
  win(P);
  assert.equal(P.host.reports.at(-1).result, 'victory');
  const seat = bo().seat, max = maxSignal(bo());
  assert.ok(seat.signal != null && seat.signal < max * 0.5, `their Signal carried: ${seat.signal} of ${max}`);
  const hurt = seat.signal;
  assert.equal(P.G.view.run.integrity, seat.signal, 'and the guest\'s screen shows it');
  const rest = roomOfKind(P.host, 'rest');
  stepInto(P.host, rest.id);
  if (active(P.host)) win(P);
  play(P.host, 'rest'); P.tick();
  assert.ok(seat.signal == null || seat.signal > hurt, `the rest healed the guest too: ${hurt} → ${seat.signal}`);
  play(P.host, 'jack out'); P.tick();
  play(P.host, 'connect sprawl'); P.tick(); // (the server just left is relocking)
  assert.equal(seat.signal, null, 'a new run: full');
  assert.equal(P.G.view.run.integrity, maxSignal(bo()));
});

test('Go to <guest>\'s network: refused on a run; out of one, the guest hosts and both walk the new host\'s server', () => {
  const P = pairUp();
  play(P.host, 'connect sprawl'); P.tick();
  assert.match(hostSwap(P.H).error, /Jack out first/);
  play(P.host, 'jack out'); P.tick();
  const hostXp = hackerOf(P.host).xp, guestXp = hackerOf(P.guest).xp;
  const G2 = hostSwap(P.H);
  assert.ok(!G2.error);
  const H2 = P.G.became;
  assert.ok(H2, 'the old guest\'s game hosts now');
  assert.ok(G2.joined, 'the old host joined it as the guest');
  assert.equal(G2.host, 'bo'); assert.equal(G2.you, 'ana');
  assert.deepEqual(H2.roster().map((x) => x.name), ['ana']);
  assert.ok(!P.host._coop, 'the old host seats nobody now');
  P.H = H2; P.G = G2;
  // The new host walks their own server, on their own network.
  const theirs = traced(P.guest);
  play(P.guest, 'connect ' + theirs.id); P.tick();
  assert.equal(currentLocation(G2.view).name, theirs.name, 'the old host sees the new host\'s server');
  assert.equal(G2.view.rooms.visits, P.guest.rooms.visits, 'the new host\'s copy of it');
  assert.notEqual(nameOf(P.guest, 'you'), nameOf(P.host, 'you'), 'two networks');
  assert.equal(nameOf(G2.view, 'you'), nameOf(P.guest, 'you'), 'on the new host\'s network');
  assert.equal(G2.view.profile.handle, 'ana', 'as themself');
  assert.deepEqual(matesOf(G2.view).map((m) => m.who), ['bo'], 'with the new host as their crewmate');
  const room = Object.values(P.guest.rooms.graph.rooms).find((r) => r.kind === 'process');
  stepInto(P.guest, room.id);
  if (!active(P.guest)) play(P.guest, 'engage');
  P.tick();
  assert.ok(active(G2.view), 'a shared fight on the new host\'s server');
  assert.ok(matesOf(P.guest).find((m) => m.who === 'ana')?.encounter, 'the old host fights in it as a crewmate');
  for (let i = 0; i < 80 && active(P.guest); i++) {
    const t = P.guest.encounter.virus.parts.find(alive);
    command(P.guest, planner(P.guest) || `spike ${t.id}`);
    if (active(P.guest)) { G2.command(`spike ${(P.guest.encounter.virus.parts.find(alive) || t).id}`); if (active(P.guest) && humansReady(P.guest)) command(P.guest, 'now'); }
    P.tick();
  }
  P.tick();
  assert.equal(P.guest.reports.at(-1).result, 'victory');
  assert.ok(hackerOf(P.host).xp > hostXp, 'the old host was paid on their own save');
  assert.ok(hackerOf(P.guest).xp > guestXp, 'and the new host on theirs');
  assert.ok(!JSON.stringify(P.guest).includes('"demolitionist"') && !JSON.stringify(P.host).includes('"sysop"'), 'neither save holds the other\'s character');
});
