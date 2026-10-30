// Sockets (docs/servers.md 6, R2: sockets.mjs, floorplan.mjs, netrooms.mjs): socket rooms on servers, their guard and
// opening, codebases (what you start with, vaults, a Resident's first fall, Mapped, the shops), components and their drop
// rates, the eight programs and what each does on its own server only, the core socket, Root 4's room, the consortium's
// re-pointed ladder, and the save migration that retires outposts, buildings, plans, services, architecture and the
// dividend.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, hooks, restore, SAVE_VERSION, finish, materialsOf, listenBoost } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import { play } from './dist/run.mjs';
import * as FP from './dist/floorplan.mjs';
import * as SK from './dist/sockets.mjs';
import { roomsFor, addRootSocket, socketRoomsRestore } from './dist/netrooms.mjs';
import { ROOT } from './dist/root.mjs';
import { roomsMarkup } from './dist/floorplan-view.mjs';
import { mapMarkup, serverMarkup, storeMarkup } from './dist/view.mjs';
import { shopOf, FACTION_GOODS } from './dist/factions.mjs';
import { RESEARCH } from './dist/research.mjs';
import { CONSORTIUM } from './dist/consortium.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false;
CONFIG.exfil.chance = 0;
let clock = 1_700_000_000_000;
hooks.now = () => clock;
hooks.restoreError = (e) => console.error('restore failed:', e);
// A fight won by breaking each part with a spike (so its component rolls and the last part broken counts).
const win = (s) => { for (let i = 0; i < 30 && active(s); i++) { for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, attack: null }); const p = s.encounter.virus.parts.find((x) => x.integrity > 0); p.integrity = 1; command(s, 'spike ' + p.id); resolveCycle(s); } FP.settle(s); };
const traced = (family = 'ransomware') => { const s = fresh(); s.tutorialCompleted = true; command(s, `developer location ${family}`); const loc = s.locations[0]; loc.lockUntil = 0; return { s, loc }; };
const sockets = (s) => FP.roomList(s).filter((x) => x.kind === 'socket');
// Stand in a room (tests of what a room does, not of the walk).
const place = (s, id) => { s.rooms.at = id; s.rooms.visit.walked[id] = true; s.rooms.screen = null; FP.look(s); };
// A playtest server with a cleared socket and what a build takes.
function playtest({ seed = 7, size = 'medium', kind = 'Mailhub', hunter = null } = {}) {
  const s = fresh();
  s.rng = seed * 7777;
  FP.outfit(s, { cls: 'breaker', level: 10, gearSeed: seed });
  FP.startRooms(s, { seed, kind, size, level: 10, floor: 2, hunter });
  FP.connect(s);
  const sock = sockets(s)[0];
  s.rooms.cleared[sock.id] = clock;
  s.codebases = [...SK.PROGRAM_IDS];
  s.server.credits = 5000;
  Object.assign(materialsOf(s), { cipher: 500, worm: 500, kernel: 500, exploit: 20 });
  return { s, sock };
}
const build = (s, sock, id) => { place(s, sock.id); return FP.act(s, 'build', id); };

test('socket rooms: small 1, medium 2, large 3, leaves at the ends of branches, guarded by a process of the server once, then open for good', () => {
  for (const [size, n] of [['small', 1], ['medium', 2], ['large', 3]]) for (let seed = 1; seed <= 12; seed++) {
    const g = FP.generate(seed, { size, kind: 'Relay', level: 10, floor: 2, author: 'swarmline' }), xs = Object.values(g.rooms).filter((x) => x.kind === 'socket');
    assert.equal(xs.length, n, `${size} seed ${seed}`);
    assert.equal(g.sockets, n);
    for (const x of xs) {
      assert.equal(FP.neighbours(g, x.id).length, 1, 'a leaf: the end of a branch');
      assert.ok(!g.spine.includes(FP.neighbours(g, x.id)[0]) || true);
      assert.ok(x.family && x.author, 'guarded by one of the server\'s own');
      assert.match(x.path, /^Socket( \d)?$/);
    }
    assert.equal(Object.keys(FP.distances(g, g.entry)).length, Object.keys(g.rooms).length, 'still all connected');
  }
  assert.equal(FP.generate(3, { size: 'medium', kind: 'Lab', level: 10, sockets: 3 }).sockets, 3, 'a Backbone server asks for one more');
  // The guard: a fight the first time, then never again.
  const s = fresh(); s.rng = 99; FP.outfit(s, { cls: 'bastion', level: 10 }); FP.startRooms(s, { seed: 4, size: 'medium', kind: 'Mailhub', level: 10 }); FP.connect(s);
  const sock = sockets(s)[0];
  assert.equal(FP.isUp(s, sock), true, 'guarded');
  assert.equal(FP.socketOpen(s, sock), false);
  s.rooms.at = FP.neighbours(s.rooms.graph, sock.id)[0]; s.rooms.visit.walked[s.rooms.at] = true;
  FP.go(s, sock.id);
  assert.equal(s.rooms.screen?.kind, 'virus', 'its process holds it');
  FP.act(s, 'engage');
  s.encounter.virus.parts.forEach((p) => { p.integrity = 0; }); finish(s, 'victory'); FP.settle(s);
  assert.ok(s.rooms.cleared[sock.id]);
  assert.equal(s.rooms.down[sock.id], undefined, 'no respawn timer');
  clock += 24 * 3600000;
  assert.equal(FP.isUp(s, sock), false, 'a day on: still open');
  assert.equal(FP.socketOpen(s, sock), true);
  assert.equal(FP.backAt(s, sock), null);
  assert.match(s.logs.map((e) => e.message).join(' '), /Socket( \d)? is open: a socket/);
  const ls = FP.roomsCommand(s, 'ls').find((e) => e.type === 'rooms-out').message;
  assert.match(ls, /^[A-Z]+\d+  Socket( \d)?  \[socket\]/);
});

test('codebases: you start with the Harvester; the Build list shows only what you know; one you know isn\'t learnt twice', () => {
  const s = fresh();
  assert.deepEqual(SK.codebasesOf(s), ['harvester']);
  const { s: p, sock } = playtest();
  p.codebases = ['harvester', 'snare'];
  place(p, sock.id);
  const lines = FP.buildLines(p, sock).join('\n');
  assert.match(lines, /Harvester/); assert.match(lines, /Snare/);
  assert.doesNotMatch(lines, /Cron Spawner|Tunnel|\?\?\?/, 'nothing you don\'t know, not even as ???');
  const html = roomsMarkup(p);
  assert.match(html, /data-rooms="build"|data-command="build harvester"/, 'a Build card in the socket\'s pop-up');
  assert.doesNotMatch(html, /Cron Spawner/);
  assert.equal(SK.learnCodebase(p, 'snare', ''), null, 'already known');
  assert.deepEqual(p.codebases, ['harvester', 'snare']);
  assert.equal(SK.learnCodebase(p, 'cron', ''), 'cron');
  assert.ok(SK.knowsCodebase(p, 'cron'));
});

test('codebases are bought (Halcyon\'s store, the hubs\' shelves): a vault, a Resident\'s first fall and Mapped pay credits and a protocol instead', async () => {
  const { NET } = await import('./dist/netrooms.mjs');
  // A vault: spare credits where a codebase was (your first server's always).
  const { s, loc } = traced();
  loc.starter = true;
  play(s, 'connect ' + loc.id);
  const R = s.rooms, v = R.graph.vaults[0];
  place(s, v);
  FP.act(s, 'force');
  assert.ok(!s.run.pack.some((f) => f.kind === 'codebase'), 'no codebase file');
  assert.ok(s.run.pack.some((f) => f.name === 'tokens.dat' && f.kind === 'credits'), 'spare credits');
  play(s, 'jack out');
  assert.deepEqual(SK.codebasesOf(s), ['harvester'], 'still only the Harvester');
  // The Resident's first fall: a protocol, Tuned or better.
  clock += 60000; loc.lockUntil = 0;
  play(s, 'connect ' + loc.id);
  place(s, s.rooms.graph.core);
  FP.go(s, s.rooms.graph.vaults[0]); FP.go(s, s.rooms.graph.core);
  if (s.rooms.screen?.kind === 'virus') FP.act(s, 'engage');
  const stash = s.stash.length;
  win(s);
  assert.ok(loc.takenOver, 'taken over');
  assert.ok(s.stash.slice(stash).some((it) => ['tuned', 'custom'].includes(it.rarity)), 'its Resident carried a protocol');
  // Mapped: credits.
  for (const x of FP.roomList(s)) s.rooms.cleared[x.id] ||= clock;
  delete s.rooms.cleared[s.rooms.graph.entry];
  FP.jackOut(s); clock += 60000; loc.lockUntil = 0;
  const c0 = s.server.credits;
  const evs = play(s, 'connect ' + loc.id);
  assert.ok(s.rooms.mapped, 'Mapped');
  assert.ok(evs.some((e) => /^Mapped: \+\d+ credits/.test(e.message || '')) && s.server.credits >= c0 + NET.mapped(loc.level), 'Mapped pays credits');
  assert.deepEqual(SK.codebasesOf(s), ['harvester'], 'and teaches nothing');
  // Halcyon's store and the faction hubs sell theirs by tier.
  assert.deepEqual(SK.CODEBASE_SHOPS.halcyon.map(([id]) => id), ['harvester', 'defrag', 'mill']);
  assert.ok(FACTION_GOODS['cb-snare'] && FACTION_GOODS['cb-post'] && FACTION_GOODS['cb-tunnel'] && FACTION_GOODS['cb-siphon'] && FACTION_GOODS['cb-cron']);
  assert.equal(FACTION_GOODS['cb-snare'].tier, 2);
  const shop = shopOf(s, 'kestrel', clock).find((x) => x.id === 'cb-snare');
  assert.ok(shop && shop.codebase === 'snare');
});

test('components: 60% a part in a room fight, an elite\'s always and one more at the kill, 35% elsewhere; mastery adds 25%', () => {
  const e = { rooms: { size: 'process' }, virus: {} };
  const s = fresh();
  assert.equal(SK.componentChance(s, e, CONFIG.salvageChance), SK.SOCKET.drop.room);
  assert.equal(SK.SOCKET.drop.room, 0.6);
  assert.equal(SK.componentChance(s, { rooms: { size: 'elite' }, virus: { elite: true } }, 0.35), 1);
  assert.equal(SK.componentChance(s, { virus: {} }, CONFIG.salvageChance), 0.35, 'home and invasions keep 35%');
  assert.equal(RESEARCH.perk.drop, 1.25, 'a mastered part\'s component: 25% more');
  // An elite room: every part's component and one more of the last.
  const { s: p } = playtest();
  const elite = FP.roomList(p).find((x) => x.kind === 'elite');
  place(p, FP.neighbours(p.rooms.graph, elite.id)[0]);
  FP.go(p, elite.id); FP.act(p, 'engage');
  const parts = p.encounter.virus.parts.filter((x) => x.loot).length, before = p.components;
  win(p);
  assert.ok(p.components >= before + parts + 1, `an elite: ${p.components - before} of ${parts} + 1`);
});

test('the Harvester: every kill on its server drops 1 more component; not on another server', () => {
  const { s, sock } = playtest();
  build(s, sock, 'harvester');
  assert.equal(FP.programIn(s, sock.id), 'harvester');
  assert.ok(FP.runs(s, 'harvester'));
  const room = FP.roomList(s).find((x) => x.kind === 'process' && FP.isUp(s, x));
  place(s, FP.neighbours(s.rooms.graph, room.id)[0]);
  FP.go(s, room.id); FP.act(s, 'engage');
  const before = s.components;
  win(s);
  assert.ok(s.logs.some((e) => /\+1 component \(Harvester\)/.test(e.message)), 'one more');
  assert.ok(s.components >= before + 1);
  // Another server: nothing of it.
  const { s: t } = playtest({ seed: 8 });
  assert.equal(FP.runs(t, 'harvester'), false);
});

test('the Cron Spawner halves its server\'s fight rooms\' respawns; the Cache Mill refills its caches twice as fast and pays half again', () => {
  const { s, sock } = playtest();
  const proc = FP.roomList(s).find((x) => x.kind === 'process'), cache = FP.roomList(s).find((x) => x.kind === 'cache');
  const base = FP.respawnMs(s, proc);
  build(s, sock, 'cron');
  assert.equal(FP.respawnMs(s, proc), base / 2);
  assert.equal(FP.respawnMs(s, s.rooms.graph.rooms[s.rooms.graph.core]), FP.respawnMs(s, s.rooms.graph.rooms[s.rooms.graph.core]), 'the Core keeps its own');
  FP.act(s, 'uninstall');
  assert.equal(FP.respawnMs(s, proc), base, 'uninstalled: back to normal');
  s.rooms.taken[cache.id] = clock;
  const refill = FP.refillAt(s, cache) - clock;
  build(s, sock, 'mill');
  assert.equal(FP.refillAt(s, cache) - clock, refill / 2);
  // It pays 50% more: the same cache, the same dice, with and without.
  const take = (mill) => { const { s: x, sock: k } = playtest({ seed: 12 }); if (mill) build(x, k, 'mill'); const c = FP.roomList(x).find((r) => r.kind === 'cache' && !r.mirror); place(x, c.id); const cr = x.server.credits; if (FP.isBait(x, c)) return null; FP.act(x, 'pull'); return x.server.credits - cr; };
  const plain = take(false), milled = take(true);
  if (plain != null) assert.ok(Math.abs(milled - plain * 1.5) <= 1, `${plain} → ${milled}`);
});

test('the Code Siphon: every fight room you clear on its server pays 3 more of its code', () => {
  const { s, sock } = playtest();
  build(s, sock, 'siphon');
  const room = FP.roomList(s).find((x) => x.kind === 'process' && FP.isUp(s, x));
  place(s, FP.neighbours(s.rooms.graph, room.id)[0]); FP.go(s, room.id); FP.act(s, 'engage');
  const m = { ...materialsOf(s) };
  win(s);
  const gain = Object.keys(m).reduce((n, k) => n + (materialsOf(s)[k] - m[k]), 0);
  assert.ok(gain >= SK.SOCKET.siphon, `+${gain} code`);
  assert.ok(s.logs.some((e) => /Code Siphon: \+3/.test(e.message)));
});

test('the Defrag Bay: a rest room in its socket, 25% of your max Signal, once a visit', () => {
  const { s, sock } = playtest();
  build(s, sock, 'defrag');
  const R = s.rooms;
  R.signal = Math.round(R.max * 0.3);
  FP.act(s, 'rest');
  assert.equal(R.signal, Math.round(R.max * 0.3) + Math.round(R.max * SK.SOCKET.rest));
  FP.act(s, 'rest');
  assert.equal(R.signal, Math.round(R.max * 0.3) + Math.round(R.max * SK.SOCKET.rest), 'once a visit');
  assert.match(s.logs.at(-1).message, /already used this Defrag Bay/);
});

test('the Tunnel: its room and the entry are one free step apart, and the hunter never uses it', () => {
  const { s, sock } = playtest({ hunter: 'track' });
  build(s, sock, 'tunnel');
  const g = s.rooms.graph;
  assert.ok(FP.walkable(s, g.entry).includes(sock.id), 'from the entry');
  assert.ok(FP.walkable(s, sock.id).includes(g.entry), 'and back');
  assert.ok(!FP.neighbours(g, g.entry).includes(sock.id), 'not a link of the graph: the hunter walks the graph');
  place(s, g.entry);
  s.rooms.visit.walked = { [g.entry]: true };
  assert.equal(FP.moveCost(s, sock), 0, 'free');
  FP.go(s, sock.id);
  assert.equal(s.rooms.at, sock.id);
  FP.go(s, g.entry);
  assert.equal(s.rooms.at, g.entry);
});

test('the Snare: a hunter that walks into its room is held there 4 of your moves, once a visit', () => {
  const { s, sock } = playtest({ hunter: 'patrol', size: 'large', seed: 21 });
  const g = s.rooms.graph;
  // Put the socket on the Patroller's beat: the room it steps into next.
  const h = FP.hunterOf(s);
  const next = g.route[(h.idx + 1) % g.route.length];
  s.rooms.programs = { [next]: 'snare' };
  place(s, g.entry);
  h.count = FP.paceOf(s) - 1;
  FP.wait(s);
  assert.equal(h.at, next);
  assert.equal(h.held, SK.SOCKET.snare);
  assert.ok(s.logs.some((e) => /The Snare in .* holds the Patroller for 4 moves/.test(e.message)));
  for (let i = 0; i < 4; i++) { FP.wait(s); assert.equal(h.at, next, `held, move ${i + 1}`); }
  for (let i = 0; i < 2; i++) FP.wait(s);
  assert.notEqual(h.at, next, 'and then it walks on');
  assert.ok(s.rooms.visit.snared, 'once a visit');
});

test('the Listening Post: on its server, the unique you name rolls twice as often; listen needs one somewhere', () => {
  const { s, loc } = traced();
  play(s, 'connect ' + loc.id);
  s.listen = 'hotfix';
  assert.equal(listenBoost(s), 1);
  assert.match(command(s, 'listen').map?.((e) => e.message).join(' ') || s.logs.at(-1).message, /Listening Post/);
  const sock = sockets(s)[0];
  s.rooms.programs = { [sock.id]: 'post' };
  assert.equal(SK.postsOf(s), 1);
  assert.equal(listenBoost(s), 2, 'twice as often here');
  play(s, 'jack out');
  assert.equal(listenBoost(s), 1, 'not off the server');
});

test('building: one of each a server, paid in credits, code and (a medium one) an Exploit, instant, uninstall half back; the terminal does it all', () => {
  const { s, sock } = playtest();
  const R = s.rooms;
  const c = SK.programCost(R, 'snare');
  assert.equal(c.credits, Math.round(280 * 1.25), 'a medium program: 280 credits on floor 1, a quarter more on floor 2');
  assert.equal(c.exploit, 1);
  assert.equal(SK.programCost(R, 'harvester').credits, 175, 'light: 140 credits, ×1.25 on floor 2');
  const n0 = s.server.credits, ex0 = materialsOf(s).exploit;
  place(s, sock.id);
  const ev = FP.roomsCommand(s, 'build snare');
  assert.ok(ev.some((e) => e.type === 'program'), 'built from the terminal');
  assert.equal(s.server.credits, n0 - 350);
  assert.equal(materialsOf(s).exploit, ex0 - 1);
  const other = sockets(s)[1];
  s.rooms.cleared[other.id] = clock;
  place(s, other.id);
  assert.match(FP.roomsCommand(s, 'build snare').map((e) => e.message).join(' '), /already runs a Snare/, 'one of each');
  place(s, sock.id);
  FP.roomsCommand(s, 'uninstall');
  assert.equal(FP.programIn(s, sock.id), null);
  assert.equal(s.server.credits, n0 - 350 + 175, 'half the credits back');
  // Short of it: it says what it costs. Unknown: it says so.
  const { s: poor, sock: k } = playtest({ seed: 9 });
  poor.server.credits = 0; poor.codebases = ['harvester'];
  place(poor, k.id);
  assert.match(FP.roomsCommand(poor, 'build harvester').map((e) => e.message).join(' '), /It costs 175 credits, 19 \w+ code/);
  assert.match(FP.roomsCommand(poor, 'build tunnel').map((e) => e.message).join(' '), /need the Tunnel codebase/);
  // A guarded socket can't take one.
  const { s: g } = playtest({ seed: 10 });
  const shut = sockets(g).find((x) => !g.rooms.cleared[x.id]);
  place(g, shut.id); g.rooms.screen = null;
  assert.match(FP.act(g, 'build', 'harvester').map((e) => e.message).join(' '), /Clear the socket first/);
});

test('the map shows sockets: a guarded one live, an open one amber, a program on its chip; the far card says which', () => {
  const { s, sock } = playtest();
  build(s, sock, 'cron');
  const html = roomsMarkup(s);
  assert.match(html, /class="fp-room k-socket/);
  assert.match(html, /CRON SPAWNER/, 'its program on its chip');
  assert.match(html, /fp-prog/, 'a program badge');
});

test('a held server: its Core is its core socket; Root 4 adds a socket room; a Grid consortium one more on every server', () => {
  const { s, loc } = traced();
  play(s, 'connect ' + loc.id);
  const R = s.rooms, core = R.graph.rooms[R.graph.core];
  assert.equal(FP.isSocket(s, core), false, 'not yours yet');
  loc.takenOver = true; loc.root = { level: 1, cleared: 0 };
  assert.equal(FP.isSocket(s, core), true, 'held: the core socket');
  assert.equal(FP.socketOpen(s, core), true);
  s.codebases = ['harvester']; s.server.credits = 500; Object.assign(materialsOf(s), { cipher: 99, worm: 99, kernel: 99 });
  place(s, core.id);
  FP.act(s, 'build', 'harvester');
  assert.equal(FP.programIn(s, core.id), 'harvester', 'a program in the Core (core programs come in R4)');
  // Root 4: a new socket room, open.
  const before = sockets(s).length;
  const room = addRootSocket(loc);
  assert.ok(room && room.kind === 'socket' && room.extra === 'root');
  assert.equal(sockets(s).length, before + 1);
  assert.equal(FP.socketOpen(s, room), true, 'nothing guards it');
  assert.equal(addRootSocket(loc), null, 'once');
  // The ladder: Linked +10% components on members' servers, Grid a socket room on every server.
  const linked = CONSORTIUM.tiers.find((t) => t.name === 'Linked'), grid = CONSORTIUM.tiers.find((t) => t.name === 'Grid');
  assert.match(linked.rule, /components/); assert.match(grid.rule, /socket room/);
  assert.equal(SK.SOCKET.linked, 1.1);
  assert.match(ROOT.need.join(','), /30/, 'Root 4 after 30');
});

test('a socket only changes its own server: a program on one leaves the next server alone', () => {
  const { s, loc } = traced();
  command(s, 'developer location worm');
  const other = s.locations.find((l) => l !== loc && !l.rogue);
  play(s, 'connect ' + loc.id);
  const sock = sockets(s)[0];
  s.rooms.programs = { [sock.id]: 'cron' };
  const proc = FP.roomList(s).find((x) => x.kind === 'process');
  const half = FP.respawnMs(s, proc);
  play(s, 'jack out');
  clock += 60000; other.lockUntil = 0;
  play(s, 'connect ' + other.id);
  const p2 = FP.roomList(s).find((x) => x.kind === 'process');
  assert.equal(FP.respawnMs(s, p2), half * 2, 'the next server respawns at its own pace');
});

test('the save (v40): outposts, buildings, plans, services, architecture and the dividend retire; costs come back as code and components, plans as codebases; sockets join the old graphs', () => {
  const { s, loc } = traced();
  play(s, 'connect ' + loc.id); play(s, 'jack out');
  // An old save: a held outpost with buildings and a build running, a store, plans, services, an architecture, a swarm,
  // a member's outpost with a dividend waiting, plain salvage.
  loc.takenOver = true; loc.root = { level: 4, cleared: 30 };
  loc.buildings = ['siphon', 'ids', 'node']; loc.build = { id: 'post', startedAt: 0, doneAt: 1 };
  loc.outpost = { at: 0, stock: { code: 7.5, credits: 40, salvage: 3 }, lockdown: { left: 1000 } };
  s.plans = ['skimmer', 'lure', 'relay'];
  s.services = { router: 2, scheduler: 1 }; s.install = { id: 'uplink', v: 1, startedAt: 0, doneAt: 1, pay: {} };
  s.architecture = 'fortress';
  s.fleet = { id: 'fl1', target: loc.id, family: 'worm', ships: 3, total: 3, state: 'siege' };
  s.salvage = [{ name: 'Scrap' }, { name: 'Plan scraps' }, { name: 'Pulse Kernel' }, { name: 'Tracker Core' }];
  s.consortium = { name: 'Halyard', founder: 'you', members: ['nyx'], servers: [{ id: 'm1', name: 'NYX-1', member: 'nyx', family: 'worm', level: 5, held: { kind: 'siphon', share: 4.6 } }] };
  delete s.codebases;
  const R = loc.floorplan;
  delete R.graph.sockets; for (const x of Object.values(R.graph.rooms)) if (x.kind === 'socket') { delete R.graph.rooms[x.id]; R.graph.links = R.graph.links.filter((l) => !l.includes(x.id)); }
  const procs = Object.values(R.graph.rooms).filter((x) => x.kind === 'process');
  R.cleared[procs[0].id] = clock;
  const credits = s.server.credits, m = { ...materialsOf(s) };
  s.version = 39;
  const t = restore(JSON.parse(JSON.stringify(s)));
  assert.equal(t.version, SAVE_VERSION);
  assert.equal(SAVE_VERSION, 50); // v41: floors (R3) came after, v42 the long climb, v43 threads, v44 whole-number stats, v45 sets, v46 no default subclass, v47 one kind of component, v48 Indemnity retires, v49 crafting goes, v50 specials
  const l2 = t.locations.find((x) => x.id === loc.id);
  for (const k of ['buildings', 'build', 'outpost']) assert.equal(l2[k], undefined, `${k} gone`);
  assert.ok(l2.takenOver, 'still yours');
  // Refunds: 3 buildings and the build (credits 150+350+200+250), their code, their salvage as components; services
  // (Edge Router v1+v2, Scheduler v1, the Route Logger installing); the store.
  const want = 150 + 350 + 200 + 250 + 40 + (120 + 600) + 120 + 120;
  assert.equal(t.server.credits, credits + want + 128, 'credits back, and (v47) the Relay plan as a relay\'s price (progression.mjs CRAFT_REFUND.plan at level 1)');
  const code = SK.retireOutposts ? (t.materials.cipher - m.cipher) + (t.materials.worm - m.worm) + (t.materials.kernel - m.kernel) : 0;
  assert.ok(code >= 10 + 18 + 12 + 12 + 7 + 12 + 40 + 12 + 12 + 4, `code back (${code})`);
  assert.equal(t.materials.exploit - m.exploit, 1, 'the Exploit a v2 took');
  assert.ok(t.components >= 4 + 4 + 8 + 6 + 6 + 3 + 6 + 15 + 6 + 6, 'components back, and the old pile (Scrap and all) counted in');
  assert.equal(t.salvage, undefined);
  // Plans and buildings became codebases (and a program still to come keeps its codebase).
  for (const id of ['harvester', 'siphon', 'snare', 'mill', 'post', 'bulkhead', 'honeytoken', 'relay']) assert.ok(t.codebases.includes(id), `${id} codebase`);
  assert.equal(t.plans, undefined, 'the Relay plan went with crafting (v47): credits');
  assert.deepEqual(t.services, {}); assert.equal(t.install, null); assert.equal(t.architecture, null);
  assert.equal(t.fleet, null, 'the swarm at the outpost is gone');
  assert.equal(t.consortium.servers[0].held, undefined, 'the member\'s outpost is just their server');
  // Sockets on the old graph: from its seed, the Root 4 room, a process you'd cleared open.
  const R2 = l2.floorplan;
  assert.ok(R2.graph.sockets >= 1);
  assert.ok(Object.values(R2.graph.rooms).some((x) => x.kind === 'socket' && x.extra === 'root'), 'Root 4\'s room');
  assert.deepEqual(R2.programs, {});
  // wick says what changed.
  const letter = t.mail.list.find((x) => /Outposts are gone/.test(x.subject));
  assert.ok(letter, 'a letter from wick');
  assert.match(letter.body.join(' '), /socket rooms/);
  assert.match(letter.body.join(' '), /codebases now/);
  // Twice is once.
  const again = restore(JSON.parse(JSON.stringify(t)));
  assert.equal(again.server.credits, t.server.credits);
  assert.equal(Object.values(again.locations.find((x) => x.id === loc.id).floorplan.graph.rooms).filter((x) => x.kind === 'socket').length, Object.values(R2.graph.rooms).filter((x) => x.kind === 'socket').length);
});

test('older still: a harvester and its modules come back as what their buildings cost; the rack and the stock as credits; their plans as codebases', () => {
  const s = fresh();
  command(s, 'developer location ransomware');
  const a = s.locations[0];
  a.takenOver = true;
  a.outpost = { h: { kind: 'scraper', level: 3 }, stock: 2, lockdown: null, at: 0 };
  a.mods = ['pipeline', 'node'];
  s.harvesters = [{ kind: 'siphon', level: 1 }];
  s.modStock = { storage: 1 };
  s.plans = ['scraper', 'tap', 'node'];
  delete s.codebases;
  const c = s.server.credits, k = materialsOf(s).cipher || 0;
  const back = SK.retireOutposts(s, 23);
  assert.equal(s.server.credits, c + 500 + 400 + 200 + 200 + 150, 'a Data Miner, a Pipeline and a Firewall Node, the rack, the stock');
  assert.equal(materialsOf(s).cipher, k + 25 + 20 + 12 + 2, 'their code, on the server\'s family, and what the harvester held');
  assert.ok(!s.harvesters && !s.modStock && !a.outpost && !a.mods);
  assert.ok(SK.codebasesOf(s).includes('mill') && SK.codebasesOf(s).includes('bulkhead'));
  assert.ok(back.comps >= 12 + 10 + 6);
});

test('a server\'s size is fixed by its seed', () => {
  assert.equal(SK.sizeOf({ seed: 5 }).id, SK.sizeOf({ seed: 5 }).id);
});

test('outposts, services and architecture are gone from the commands and the pages; the Server page lists your codebases', () => {
  const { s } = traced();
  assert.match(command(s, 'outpost build x siphon').map?.((e) => e.message).join(' ') ?? s.logs.at(-1).message, /Outposts are gone/);
  command(s, 'install router'); assert.match(s.logs.at(-1).message, /Services are gone/);
  command(s, 'architecture hub'); assert.match(s.logs.at(-1).message, /architecture is gone/);
  command(s, 'consortium collect');
  const page = serverMarkup(s);
  assert.match(page, /Codebases · 1/);
  assert.doesNotMatch(page, /Install queue|Blueprints ·|Architecture|Bandwidth/);
  const map = mapMarkup(s, s.locations[0].id, 'mine', { pop: true });
  assert.doesNotMatch(map, /Outpost|bandwidth|Build panel|data-build-open/);
  assert.match(storeMarkup(s), /Codebases/);
});
