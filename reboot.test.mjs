// The server reboot (floorplan.mjs ROOMS.reboot): on a traced server a fallen fight room stays down until every fight
// room on it has fallen; then the server reboots ROOMS.reboot.minutes later and they all come back at once. Rogue
// servers (and every other wild server) keep their own timers.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, hooks, finish } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import * as FP from './dist/floorplan.mjs';
import { rogueGraph } from './dist/netrooms.mjs';
import { roomsMarkup, pickRoom, closePop } from './dist/floorplan-view.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false;
let clock = Date.UTC(2026, 0, 1);
hooks.now = () => clock;
const tick = (ms) => { clock += ms; };
function server({ seed = 7, size = 'medium' } = {}) {
  const s = fresh();
  s.rng = seed * 7777;
  FP.outfit(s, { cls: 'breaker', level: 10, gearSeed: seed });
  FP.startRooms(s, { seed, kind: 'Mailhub', size, level: 10, hunter: 'patrol', floor: 2 });
  FP.connect(s);
  return s;
}
const win = (s) => { s.encounter.virus.parts.forEach((p) => { p.integrity = 0; }); finish(s, 'victory'); FP.settle(s); };
const place = (s, id) => { s.rooms.at = id; s.rooms.visit.walked[id] = true; s.rooms.screen = null; FP.look(s); };
const kill = (s, room) => { place(s, room.id); FP.fight(s, room); win(s); };
// The fight rooms a reboot waits on: every one but the socket rooms (their guard never comes back) and the optional ones.
const resets = (s) => FP.roomList(s).filter((x) => FP.FIGHTS.includes(x.kind) && x.kind !== 'socket' && FP.counted(x));

test('a fallen fight room stays down until the whole server reboots', () => {
  assert.equal(FP.ROOMS.reboot.minutes, 2, 'two minutes');
  const s = server(), R = s.rooms, rooms = resets(s), procs = rooms.filter((x) => x.kind === 'process');
  assert.ok(FP.rebooting(s));
  assert.equal(FP.rebootOf(s).up, rooms.length, 'every fight room up on a fresh server');
  kill(s, procs[0]);
  R.at = R.graph.entry;
  tick(3 * 3600000);
  assert.equal(FP.isUp(s, procs[0]), false, 'hours later, still down');
  assert.equal(FP.backAt(s, procs[0]), null, 'no timer of its own');
  assert.equal(FP.rebootOf(s).up, rooms.length - 1);
  // Every other fight room down (the vault open, so the Core can fall), then the last one: the reboot starts.
  R.opened[R.graph.vaults[0]] = clock;
  const last = procs[1];
  for (const x of rooms) if (x !== procs[0] && x !== last) R.down[x.id] = clock;
  assert.equal(FP.rebootOf(s).up, 1);
  const first = s.serial;
  kill(s, last);
  const rb = FP.rebootOf(s);
  assert.equal(rb.pending, true);
  assert.equal(rb.at, clock + 2 * 60000);
  assert.ok(s.logs.some((e) => e.id > first && /reboots in 2:00/.test(e.message)), 'the log says so');
  assert.equal(FP.backAt(s, procs[0]), rb.at, 'each room\'s ring runs to the reboot');
  assert.equal(FP.downAt(s, procs[0]), clock, 'from when it started');
  // Two minutes later: every room back, but the one you stand in waits until you leave.
  tick(2 * 60000 + 1000);
  const said = FP.tick(s);
  assert.equal(said.filter((e) => /reboots: every room is back/.test(e.message)).length, 1, 'one line, not one a room');
  assert.equal(FP.isUp(s, last), false, 'never while you stand in it');
  for (const x of rooms) if (x !== last) assert.equal(FP.isUp(s, x), true, x.path);
  R.at = R.graph.entry;
  assert.equal(FP.isUp(s, last), true, 'back once you\'ve left');
  assert.equal(FP.rebootOf(s).pending, false);
  assert.equal(FP.rebootOf(s).up, rooms.length, 'a fresh round');
  assert.equal(FP.tick(s).filter((e) => /reboots/.test(e.message)).length, 0, 'said once');
  // A kill after the reboot waits for the next one.
  kill(s, procs[0]);
  R.at = R.graph.entry;
  tick(3 * 3600000);
  assert.equal(FP.isUp(s, procs[0]), false);
});

test('a Cron Spawner halves the reboot', () => {
  const s = server(), R = s.rooms;
  assert.equal(FP.rebootOf(s).ms, 2 * 60000);
  const sock = FP.roomList(s).find((x) => x.kind === 'socket');
  R.programs = { [sock.id]: 'cron' };
  assert.equal(FP.rebootOf(s).ms, 60000);
});

test('a rogue server keeps its own timers: no reboot', () => {
  const s = fresh();
  s.rooms = FP.newRooms(s, { seed: 3, size: 'small', kind: 'Relay', level: 10, floor: 2, author: 'tollgate', graph: rogueGraph({ seed: 3, level: 10, rogue: { kind: 'pit' } }), type: 'wild' });
  assert.equal(FP.rebooting(s), false);
  assert.equal(FP.rebootOf(s), null);
});

test('the strip shows the fight rooms still up, then the countdown; a fallen room\'s card says it waits on the reboot', () => {
  const s = server(), R = s.rooms, rooms = resets(s);
  assert.match(roomsMarkup(s), new RegExp(`fp-reboot"[^>]*><span class="lbl">Reboot</span><b>${rooms.length} up</b>`));
  const one = rooms.find((x) => x.kind === 'process');
  kill(s, one);
  place(s, one.id); // past the spoils, standing in the fallen room
  pickRoom(s, one.id);
  assert.match(roomsMarkup(s), /Down until [^.]+ reboots, 2:00 after its last fight room falls\./);
  closePop(s);
  R.opened[R.graph.vaults[0]] = clock;
  const last = rooms.find((x) => x.kind === 'process' && x !== one);
  for (const x of rooms) if (x !== last) R.down[x.id] = clock;
  kill(s, last);
  assert.match(roomsMarkup(s), new RegExp(`fp-reboot on"[^>]*><span class="lbl">Reboot</span><b><span data-at="${clock + 2 * 60000}"></span></b>`));
});

test('Mapped with every fight room down: the server goes offline to reboot and takes no connection until it is back', () => {
  const s = server(), R = s.rooms, rooms = resets(s);
  R.opened[R.graph.vaults[0]] = clock;
  const last = rooms.find((x) => x.kind === 'process');
  for (const x of FP.roomList(s)) if (FP.counted(x) && x !== last) R.cleared[x.id] = clock;
  for (const x of rooms) if (x !== last) R.down[x.id] = clock;
  assert.equal(FP.goesOffline(s), false);
  const first = s.serial;
  kill(s, last);
  assert.ok(R.mapped, 'the kill maps it');
  assert.equal(FP.offlineLeft(R), 2 * 60000);
  assert.equal(FP.goesOffline(s), true, 'leaving the fight jacks you out (app.js)');
  assert.ok(s.logs.some((e) => e.id > first && /goes offline to reboot\. Back in 2:00/.test(e.message)));
  FP.jackOut(s);
  assert.equal(FP.goesOffline(s), false, 'home');
  const denied = s.serial;
  tick(40 * 1000); // past the reconnect wait
  FP.connect(s);
  assert.equal(R.at, null, 'no connection while it reboots');
  assert.ok(s.logs.some((e) => e.id > denied && /offline, rebooting\. Back in/.test(e.message)));
  tick(2 * 60000);
  assert.equal(FP.offlineLeft(R), 0, 'back up');
  FP.connect(s);
  assert.ok(R.at, 'connected');
  assert.ok(rooms.every((x) => FP.isUp(s, x)), 'every room back');
});

test('an unmapped server with every fight room down reboots with you still on it', () => {
  const s = server(), R = s.rooms, rooms = resets(s);
  R.opened[R.graph.vaults[0]] = clock;
  const last = rooms.find((x) => x.kind === 'process');
  for (const x of rooms) if (x !== last) R.down[x.id] = clock;
  kill(s, last);
  assert.ok(!R.mapped && FP.rebootOf(s).pending);
  assert.equal(FP.goesOffline(s), false);
});
