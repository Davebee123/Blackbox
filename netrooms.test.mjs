// Servers as rooms on the real game (docs/servers.md R1, netrooms.mjs): a fresh level-1 character connects to
// SPRAWL-00's rooms, a traced server plays as the R0 generator's graph from its seed (the key, the vault and its files
// into the pack, the Resident in the Core, the takeover), wild servers are all fights on their folders' own timers,
// jacking out banks the pack, contracts point at rooms, and an old save moves to rooms in place. The R0 mechanics
// themselves (moving, fog, the hunter, respawn rings): rooms.test.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, hooks, restore, SAVE_VERSION, finish } from './dist/combat.mjs';
import { CONFIG, BOSSES } from './dist/data.mjs';
import { play, currentLocation, LEGACY, KING_ROOM } from './dist/run.mjs';
import * as FP from './dist/floorplan.mjs';
import { roomsFor, summaryOf, sprawlGraph } from './dist/netrooms.mjs';
import { ROGUE, rogueRooms } from './dist/rogue.mjs';
import { ROOT, ROOT_PERKS } from './dist/root.mjs';
import { openContracts, ready } from './dist/mail.mjs';
import { roomsMarkup } from './dist/floorplan-view.mjs';
import { mapMarkup } from './dist/view.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false;
CONFIG.exfil.chance = 0; // no Exfil in these rooms (exfil.test.mjs has it)
let clock = 1_700_000_000_000;
hooks.now = () => clock;
const win = (s) => { for (let i = 0; i < 30 && active(s); i++) { for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, attack: null }); const p = s.encounter.virus.parts.find((x) => x.integrity > 0); p.integrity = 1; command(s, 'spike ' + p.id); resolveCycle(s); } FP.settle(s); };
const traced = (family = 'ransomware') => { const s = fresh(); s.tutorialCompleted = true; command(s, `developer location ${family}`); const loc = s.locations[0]; loc.lockUntil = 0; return { s, loc }; };
const near = (s, id) => FP.neighbours(s.rooms.graph, id)[0];
const enterRoom = (s, id) => { const R = s.rooms; R.at = near(s, id); R.screen = null; FP.go(s, id); };

test('a fresh level-1 character: connect sprawl plays SPRAWL-00 as rooms, its folders as the room tree (named for what they are), RELAY-KING\'s Core sealed until level 3', () => {
  const s = fresh();
  assert.equal(s.version, SAVE_VERSION);
  play(s, 'connect sprawl');
  assert.ok(s.run?.rooms && s.rooms?.world, 'a run on rooms');
  const g = s.rooms.graph;
  assert.deepEqual(Object.values(g.rooms).filter((r) => r.path0 !== '/').map((r) => r.path0).sort(), ['/net', '/net/relay', '/srv', '/tmp', '/var', '/var/log']);
  assert.equal(g.rooms[g.core].path0, KING_ROOM);
  for (const [a, b] of g.links) { const pa = g.rooms[a].path0, pb = g.rooms[b].path0; assert.ok(pb.startsWith(pa === '/' ? '/' : pa + '/'), `${pa} → ${pb}: a folder next to its parent`); }
  assert.deepEqual(sprawlGraph(), g, 'the same graph every time');
  const ls = play(s, 'ls').find((e) => e.type === 'rooms-out').message;
  const net = Object.values(g.rooms).find((r) => r.path0 === '/net');
  assert.match(net.path, /^Process \d$/, 'named for what it is, never a folder');
  assert.equal(g.rooms[g.core].path, 'Core');
  assert.doesNotMatch(ls, /\/(net|var|tmp|srv)/, 'no folder names on screen');
  // A fresh visit: every room but the entry unknown, the ones next to you listed as ? with their cost.
  assert.ok(Object.values(g.rooms).every((r) => (r.id === g.entry) === FP.known(s, r.id)), 'all unknown but the entry');
  assert.match(ls, /\n1  [A-Z]+\d+  \?  \[\?\]  −\d+ Signal/); // its address, and nothing about what it is
  assert.doesNotMatch(ls, /fight|Process/, 'nothing about what they are');
  assert.match(play(s, 'cd net/relay').map((e) => e.message).join(' '), new RegExp(`\\w+-\\d+ holds ${net.path}`), 'what holds it stops the walk; cd still takes the folder');
  assert.equal(s.rooms.screen?.kind, 'virus', 'an unknown room\'s virus still asks: Engage or Step back');
  play(s, 'back');
  assert.match(play(s, 'ls').find((e) => e.type === 'rooms-out').message, new RegExp(`${net.path}  \\[fight · \\w+ lv 1\\]`), 'been in: discovered');
  Object.assign(s.zone.spawns['/net'], { alive: false, respawnAt: clock + 3600000 });
  assert.match(play(s, 'cd /net/relay').map((e) => e.message).join(' '), /The Core is sealed\. RELAY-KING holds it from level 3/);
  // A stray: a fight, its first clear, its timer (90 seconds), then back.
  play(s, 'cd /'); play(s, 'cd tmp');
  assert.equal(s.run.cwd, Object.values(g.rooms).find((r) => r.path0 === '/tmp').path);
  play(s, 'attack');
  assert.ok(active(s) && s.encounter.rooms && s.encounter.ticked, 'a room fight, ticks and all');
  assert.equal(s.encounter.virus.author, null, 'SPRAWL-00\'s strays sign nothing');
  win(s);
  const room = FP.hereOf(s);
  assert.ok(s.rooms.cleared[room.id], 'cleared for good');
  assert.equal(FP.isUp(s, room), false);
  clock += CONFIG.zone.respawnMs + 1000;
  assert.equal(FP.isUp(s, room), false, 'never back while you stand in it');
  play(s, 'cd ..');
  assert.equal(FP.isUp(s, room), true, 'back once you have left');
  // Level 3: RELAY-KING in the Core, a boss under boss rule a.
  s.hackers[s.loadout.archetype].level = 3; s.zone.spawns = {};
  play(s, 'cd /'); play(s, 'cd net'); if (s.rooms.screen) { play(s, 'attack'); win(s); }
  play(s, 'cd relay');
  assert.equal(s.rooms.screen?.kind, 'virus');
  play(s, 'attack');
  assert.equal(s.encounter.virus.boss, 'relayking');
  assert.equal(s.encounter.bossRule, 'a');
});

test('the terminal on rooms: ls, cd, cd .., map, go, wait, back, engage, pack, help, scan and jack out all work; a typo says so', () => {
  const { s, loc } = traced();
  play(s, 'connect ' + loc.id);
  const R = s.rooms;
  const said = (t) => play(s, t).map((e) => e.message).join('\n');
  assert.match(said('ls'), /^[A-Z]+\d+  Entry  \[entry\]/); // your room's address first
  assert.match(said('map'), new RegExp(`/ ${loc.name} · rooms 1/${Object.keys(R.graph.rooms).length}`));
  assert.match(said('help'), /go <room>[\s\S]*jack out/);
  assert.match(said('pack'), /pack is empty/);
  const next = FP.neighbours(R.graph, R.at).map((id) => R.graph.rooms[id]).find((r) => FP.isUp(s, r));
  assert.match(said('scan ' + next.dir), /./, 'a genome card');
  said('go ' + next.dir);
  assert.equal(R.at, next.id);
  assert.equal(R.screen?.kind, 'virus');
  said('back');
  assert.equal(R.at, R.graph.entry, 'stepped back');
  said('wait');
  said('cd ' + next.dir); said('engage');
  assert.ok(active(s));
  win(s);
  assert.match(said('unlock vault x'), /not on rooms/, 'the old verbs say so');
  said('jack out');
  assert.equal(s.run, null);
});

test('a traced server is the R0 generator\'s graph from its seed: the key, the vault\'s files into the pack, the Resident in the Core, the takeover', () => {
  const { s, loc } = traced();
  loc.template = 'mailhub';
  play(s, 'connect ' + loc.id);
  const R = loc.floorplan, g = R.graph;
  assert.ok(R && s.rooms === R, 'its rooms live on it');
  assert.equal(R.kind, 'Mailhub');
  assert.deepEqual(FP.generate(loc.seed, { size: R.size, kind: 'Mailhub', level: R.level, floor: R.floor, author: R.author }).links, g.links.filter((l) => !l.some((id) => FP.isPuzzle(g.rooms[id].kind))), 'from its seed (its puzzle rooms hang off it, docs/servers.md 9.11)');
  assert.equal(FP.coreOpen(s), false);
  // The guard post holds the key: beat it, take the key, open the vault.
  const post = Object.values(g.rooms).find((r) => r.kind === 'guard' && r.key === g.vaults[0]);
  enterRoom(s, post.id); play(s, 'engage');
  assert.ok(active(s));
  win(s);
  assert.ok(R.visit.keys.includes(g.vaults[0]), 'its key');
  enterRoom(s, g.vaults[0]);
  const opened = play(s, 'open');
  assert.ok(opened.some((e) => e.gains?.length), 'the vault says what went in your pack');
  assert.ok(s.run.pack.length >= 2, 'its files');
  assert.ok(FP.coreOpen(s));
  assert.equal(loc.takenOver, undefined, 'not yours yet');
  enterRoom(s, g.core); play(s, 'engage');
  assert.equal(s.encounter.virus.boss, 'resident');
  win(s);
  assert.ok(loc.takenOver, 'taken over');
  assert.equal(FP.isUp(s, g.rooms[g.core]), false, 'its Core quiet');
  assert.match(mapMarkup(s, loc.id, 'net'), /mnode loc[^"]* owned/, 'teal on the network map');
  // Jack out: the pack banks.
  const credits = s.server.credits, stash = s.stash.length;
  play(s, 'jack out');
  assert.equal(s.run, null);
  assert.ok(s.server.credits > credits || s.stash.length > stash, 'banked');
  assert.ok(loc.state.taken[s.logs.findLast((e) => e.type === 'jacked-out') && Object.keys(loc.state.taken)[0]], 'its files are taken');
});

test('losing a fight on rooms disconnects you and loses the pack; progress stays', () => {
  const { s, loc } = traced();
  play(s, 'connect ' + loc.id);
  const R = s.rooms;
  R.visit.keys.push(R.graph.vaults[0]); enterRoom(s, R.graph.vaults[0]); play(s, 'open');
  const packed = s.run.pack.length, done = Object.keys(R.cleared).length;
  assert.ok(packed > 0);
  const next = FP.roomList(s).find((r) => FP.isUp(s, r) && r.kind === 'process');
  enterRoom(s, next.id); play(s, 'engage');
  s.run.integrity = 1;
  for (const p of s.encounter.virus.parts) if (p.attack) p.attack.due = s.encounter.cycle;
  for (let i = 0; i < 5 && active(s); i++) { command(s, 'hold'); resolveCycle(s); }
  assert.equal(s.run, null, 'disconnected');
  assert.ok(s.logs.some((e) => e.type === 'disconnected' && /unbanked/.test(e.message)));
  assert.equal(Object.keys(loc.floorplan.cleared).length, done, 'progress never goes down');
  assert.ok(loc.floorplan.opened[loc.floorplan.graph.vaults[0]], 'the vault stays open');
});

test('respawns run at real speed: a process room 15 minutes, a guard post 20, an elite 45 while you explore; 2, 3, 5 and the Core 10 once it is Mapped or yours; a rogue room stays down for the run', () => {
  const { s, loc } = traced();
  play(s, 'connect ' + loc.id);
  const kinds = Object.fromEntries(FP.roomList(s).filter((r) => FP.FIGHTS.includes(r.kind)).map((r) => [r.kind, FP.respawnMs(s, r)]));
  assert.equal(kinds.process, 15 * 60000);
  assert.equal(kinds.guard, 20 * 60000);
  if (kinds.elite) assert.equal(kinds.elite, 45 * 60000);
  // Held: the farm timers.
  loc.takenOver = true;
  const held = Object.fromEntries(FP.roomList(s).filter((r) => FP.FIGHTS.includes(r.kind)).map((r) => [r.kind, FP.respawnMs(s, r)]));
  assert.equal(held.process, 2 * 60000);
  assert.equal(held.guard, 3 * 60000);
  if (held.elite) assert.equal(held.elite, 5 * 60000);
  if (held.core) assert.equal(held.core, 10 * 60000);
  loc.takenOver = false;
  play(s, 'jack out');
  // A rogue server: a fight room for every folder (and its quiet rooms: exfil.test.mjs); a cleared one stays down for the run.
  for (let i = 0; i < 40 && !s.locations.some((l) => l.rogue && !l.farm); i++) { (s.net ||= {}).rogueDry = ROGUE.pity; command(s, 'developer location worm'); }
  const rogue = s.locations.find((l) => l.rogue && !l.farm);
  rogue.lockUntil = 0;
  play(s, 'connect ' + rogue.id);
  const fights = FP.roomList(s).filter((r) => r.wild);
  assert.deepEqual(fights.map((r) => r.path0).sort(), [...rogueRooms(rogue)].sort(), 'every folder a fight room');
  assert.ok(fights.every((r) => r.kind === 'process'));
  const g = s.rooms.graph, quiet = (x) => !g.rooms[x].wild, way = (r) => FP.pathTo(g, s.rooms.at, r.id, quiet);
  const r0 = fights.find(way);
  for (const id of way(r0).slice(1)) FP.go(s, id); // through the quiet rooms, to the first fight
  play(s, 'attack'); win(s);
  const sp = rogue.spawns[r0.path0];
  assert.equal(sp.alive, false);
  assert.equal(FP.backAt(s, r0), null, 'no timer: it waits for the reboot');
  clock += ROGUE.respawnMs[1] * 3;
  assert.equal(FP.isUp(s, r0), false, 'still down this run');
});

test('root: respawned rooms cleared on a held server climb its pips (2.8); Root 4 says sockets come in R2', () => {
  assert.deepEqual(ROOT.need, [0, 0, 5, 15, 30, 50]);
  assert.match(ROOT_PERKS[4], /socket room, once sockets come/);
});

test('contracts point at rooms: clear N new rooms on a server, map a server; the storyline\'s named target never sits in the sealed Core', async () => {
  const { contractRooms, contractMapped } = await import('./dist/mail.mjs');
  const { s, loc } = traced();
  s.mail = { list: [], offers: [], jobs: [{ id: 1, type: 'rooms', loc: loc.id, count: 2, got: 0, reward: { credits: 10 } }, { id: 2, type: 'map', loc: loc.id, got: 0, reward: { credits: 10 } }], next: 3, boardOpen: true };
  play(s, 'connect ' + loc.id);
  const c = openContracts(s);
  assert.equal(c.length, 2);
  for (const r of FP.roomList(s).filter((x) => FP.isUp(s, x) && x.kind === 'process').slice(0, 2)) { enterRoom(s, r.id); play(s, 'engage'); win(s); }
  assert.ok(ready(s, c.find((j) => j.type === 'rooms')), 'two new rooms cleared');
  assert.ok(!ready(s, c.find((j) => j.type === 'map')));
  contractMapped(s, loc);
  assert.ok(ready(s, c.find((j) => j.type === 'map')));
  assert.equal(typeof contractRooms, 'function');
});

test('the room page on the network: the strip names the server, its rule and level; no boss-rule switch; nothing undefined', () => {
  const s = fresh();
  play(s, 'connect sprawl');
  const html = roomsMarkup(s);
  assert.match(html, /SPRAWL-00/);
  assert.match(html, /Strays · lv 1–5/);
  assert.doesNotMatch(html, /Boss<\/span>/, 'the boss rule is a developer switch on the network');
  assert.doesNotMatch(html, /undefined|NaN/);
  const { s: t, loc } = traced();
  play(t, 'connect ' + loc.id);
  assert.doesNotMatch(roomsMarkup(t), /undefined|NaN/);
  // The map card reads its rooms without connecting.
  play(t, 'jack out');
  const sum = summaryOf(t, loc);
  assert.equal(sum.total, Object.keys(loc.floorplan.graph.rooms).length);
  assert.match(mapMarkup(t, loc.id, 'net'), /Rooms<\/span><strong>\d+\/\d+/);
});

test('developer bossrule a|b|c switches the rule for every boss fight on the network', () => {
  const s = fresh();
  play(s, 'developer bossrule b');
  assert.equal(s.bossRule, 'b');
  s.hackers[s.loadout.archetype].level = 3;
  play(s, 'connect sprawl'); s.zone.spawns['/net'] = { alive: false, respawnAt: clock + 1e9 };
  play(s, 'cd net/relay'); play(s, 'attack');
  assert.equal(s.encounter.bossRule, 'b');
});

test('an old save (v38) moves to rooms in place: every server it found becomes rooms, a held one keeps its vault, its Resident beaten, its Root; a run in flight banks', () => {
  const { s, loc } = traced();
  command(s, 'developer location worm');
  const held = s.locations[0], other = s.locations[1];
  held.takenOver = true; held.root = { level: 2, cleared: 1, n: 3, nextAt: clock + 1000, proc: null };
  // A run in flight on the old file system, with a file in its pack.
  LEGACY.files = true;
  try { other.lockUntil = 0; play(s, 'connect ' + other.id); } finally { LEGACY.files = false; }
  assert.ok(s.run && !s.run.rooms);
  s.run.pack.push({ path: '/x', name: 'cache.dat', kind: 'credits', amount: 25 });
  const raw = JSON.parse(JSON.stringify(s));
  raw.version = 38;
  for (const l of [raw.zone, ...raw.locations].filter(Boolean)) delete l.floorplan;
  const credits = raw.server.credits;
  const t = restore(raw);
  assert.equal(t.version, SAVE_VERSION);
  assert.equal(t.run, null, 'the run in flight jacked out');
  assert.ok(t.server.credits >= credits + 25, 'and its pack banked');
  for (const l of t.locations) assert.ok(l.floorplan?.graph, `${l.name} is rooms`);
  assert.ok(t.zone.floorplan, 'SPRAWL-00 too');
  const h = t.locations.find((l) => l.id === held.id), R = h.floorplan;
  assert.ok(h.takenOver, 'still yours');
  assert.ok(R.opened[R.graph.vaults[0]] && R.cleared[R.graph.core], 'its vault open, its Resident beaten');
  assert.equal(h.root.level, 2, 'its Root kept');
  assert.equal(h.root.cleared, ROOT.need[2], 'counting from where Root 2 begins');
  assert.ok(Object.values(R.graph.rooms).some((x) => x.kind === 'stash'), 'Root 2: its stash room');
  // Saved and loaded again: the rooms keep, s.rooms isn't saved twice.
  play(t, 'connect ' + h.id);
  const json = JSON.stringify(t);
  assert.ok(!('rooms' in JSON.parse(json)));
  const u = restore(JSON.parse(json));
  assert.ok(u.run?.rooms && u.rooms === u.locations.find((l) => l.id === h.id).floorplan, 'mid-run, on the same rooms');
  assert.equal(Object.keys(u.rooms.cleared).length, Object.keys(R.cleared).length);
});

test('a save whose wild rooms were named by their folders (/var/log) loads with them named for what they are', () => {
  const s = fresh();
  play(s, 'connect sprawl');
  for (const r of Object.values(s.zone.floorplan.graph.rooms)) if (r.path0 !== '/') { r.label = r.path0; }
  FP.nameRooms(s.zone.floorplan.graph);
  s.run.cwd = '/net';
  const t = restore(JSON.parse(JSON.stringify(s)));
  const names = Object.values(t.zone.floorplan.graph.rooms).map((r) => r.path);
  assert.ok(names.every((n) => !n.startsWith('/')), names.join(' '));
  assert.ok(names.includes('Core') && names.includes('Process 1'));
  assert.equal(t.run.cwd, 'Entry', 'where you stand, by its name');
});
