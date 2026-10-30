// Server specials (specials.mjs, docs/server-specials.md) and their programs (sockets.mjs): each special's rule, the
// invasion sourcing, each program, the save's move from traits, and the card's tag.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, hooks, restore, syncServer, materialsOf } from './dist/combat.mjs';
import { CONFIG, DAEMON_DROP } from './dist/data.mjs';
import * as FP from './dist/floorplan.mjs';
import * as SK from './dist/sockets.mjs';
import * as SP from './dist/specials.mjs';
import { rootClear } from './dist/netrooms.mjs';
import { residentLevel, play } from './dist/run.mjs';
import { tickNetwork, sendsAt, daemonDrop } from './dist/invasion.mjs';
import { mapMarkup, specialTags } from './dist/view.mjs';
import { RIVAL } from './dist/rivals.mjs';
RIVAL.chance = 0; // a rival rolls at connect (rivals.mjs): these walks are scripted (rivals.test.mjs plays them)

CONFIG.enemyCrit = 0; CONFIG.misses = false;
CONFIG.exfil.chance = 0;
let clock = 1_700_000_000_000;
hooks.now = () => clock;
hooks.restoreError = (e) => console.error('restore failed:', e);
const win = (s) => { for (let i = 0; i < 30 && active(s); i++) { for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, attack: null }); const p = s.encounter.virus.parts.find((x) => x.integrity > 0); p.integrity = 1; command(s, 'spike ' + p.id); resolveCycle(s); } FP.settle(s); };
// A traced server with the specials given, its rooms built on connect.
function traced(special = [], { family = 'ransomware', seed = 1, level } = {}) {
  const s = fresh(); s.tutorialCompleted = true; s.rng = seed * 7777;
  command(s, `developer location ${family}`);
  const loc = s.locations[0];
  Object.assign(loc, { lockUntil: 0, special, ...(level ? { level } : {}) });
  play(s, 'connect ' + loc.id);
  return { s, loc, R: loc.floorplan };
}
const place = (s, id) => { s.rooms.at = id; s.rooms.visit.walked[id] = true; s.rooms.screen = null; FP.look(s); };
const fightIn = (s, room) => { place(s, FP.neighbours(s.rooms.graph, room.id)[0]); FP.go(s, room.id); if (!active(s)) FP.act(s, 'engage'); return s.encounter; };
const rooms = (s, kind) => FP.roomList(s).filter((x) => x.kind === kind);
// A playtest server with an open socket and everything a build takes.
function playtest({ seed = 7, size = 'medium', kind = 'Mailhub', hunter = null } = {}) {
  const s = fresh();
  s.rng = seed * 7777;
  FP.outfit(s, { cls: 'breaker', level: 10, gearSeed: seed });
  FP.startRooms(s, { seed, kind, size, level: 10, floor: 2, hunter });
  FP.connect(s);
  const sock = rooms(s, 'socket')[0];
  s.rooms.cleared[sock.id] = clock;
  s.codebases = [...SK.PROGRAM_IDS];
  s.server.credits = 9000;
  Object.assign(materialsOf(s), { cipher: 500, worm: 500, kernel: 500, exploit: 20 });
  return { s, sock };
}
const build = (s, sock, id) => { place(s, sock.id); return FP.act(s, 'build', id); };
// The invasion world (invasion.test.mjs): one connected server, the clock at 0.
function world(special, level = 10) {
  const s = fresh();
  command(s, 'developer location worm');
  Object.assign(s.locations[0], { level, depth: 1, runs: 1, special });
  s.firewall = { pin: 0, plus: 0, frag: 0, defragUntil: 0 };
  syncServer(s); s.server.integrity = s.server.max; s.clock = 0; tickNetwork(s, 0);
  return s;
}
const launch = (s) => { s.net.next = 0; s.clock += 5000; tickNetwork(s, s.clock); return s.invasion; };

test('every traced server has a special from its seed, two from floor 5 down; Guarded is the rare one', () => {
  const seen = {}, n = 5000;
  for (let seed = 1; seed <= n; seed++) {
    const a = SP.rollSpecials({ seed, depth: 1 });
    assert.deepEqual(a, SP.rollSpecials({ seed, depth: 1 }), 'fixed by the seed');
    assert.equal(a.length, 1);
    seen[a[0]] = (seen[a[0]] || 0) + 1;
    const deep = SP.rollSpecials({ seed, depth: 5 });
    assert.equal(deep.length, 2); assert.notEqual(deep[0], deep[1]); assert.equal(deep[0], a[0], 'the first stays');
  }
  assert.deepEqual(Object.keys(seen).sort(), Object.keys(SP.SPECIALS).sort(), 'all eight turn up');
  assert.ok(Math.abs(seen.guarded / n - SP.SPECIAL.guarded) < 0.012, `Guarded 1 in 25 (${seen.guarded})`);
  const s = fresh(); command(s, 'developer location worm');
  assert.ok(SP.SPECIALS[s.locations[0].special[0]], 'a found server rolls one');
});

test('the specials never name what the server is for', () => {
  for (const x of Object.values(SP.SPECIALS)) assert.doesNotMatch(`${x.rule} ${x.answer} ${[...x.up, ...x.cost].map((c) => c[2]).join(' ')}`, /source|farm/i, x.name);
});

test('invasion sourcing: a Volatile server is picked twice as often, a Stable one half; Amplifier and Lockdown move its levels', () => {
  const v = { id: 'v', special: ['volatile'] }, p = { id: 'p', special: ['rich'] }, st = { id: 's', special: ['stable'] }, list = [v, p, st], got = { v: 0, p: 0, s: 0 };
  for (let i = 0; i < 3500; i++) got[SP.pickSender(list, (i + 0.5) / 3500).id]++;
  assert.deepEqual(got, { v: 2000, p: 1000, s: 500 });
  // A Volatile server's invader comes 2 levels higher, an Amplifier's 2 more, a Lockdown's 2 lower.
  assert.equal(launch(world(['volatile'])).level, 12);
  assert.equal(launch(world(['rich'])).level, 10);
  const amp = world(['rich']); amp.locations[0].floorplan = { programs: { r9: 'amplifier' } };
  assert.equal(launch(amp).level, 12); assert.equal(sendsAt(amp.locations[0]), 12, 'the Safe readout counts it');
  const lock = world(['volatile']); lock.locations[0].floorplan = { programs: { r9: 'lockdown' } };
  assert.equal(launch(lock).level, 10, 'Lockdown cancels Volatile');
  // Backbone: its invasions travel twice as fast.
  assert.equal(launch(world(['backbone'])).total * 2, launch(world(['rich'])).total);
});

test('Volatile: its invaders you kill drop a daemon half the time', () => {
  const s = world(['volatile']), inv = { from: s.locations[0].id, level: 10, family: 'worm' };
  let n = 0;
  for (let i = 0; i < 4000; i++) { s.pity = {}; if (daemonDrop(s, inv, 'you')) n++; }
  assert.ok(Math.abs(n / 4000 - DAEMON_DROP.volatile) < 0.03, `${n} of 4000`);
  s.locations[0].special = ['rich'];
  n = 0;
  for (let i = 0; i < 4000; i++) { s.pity = {}; if (daemonDrop(s, inv, 'you')) n++; }
  assert.ok(Math.abs(n / 4000 - DAEMON_DROP.you) < 0.03, `elsewhere ${n} of 4000`);
});

test('Stable: one more rest room, beside the spine, each rest once a visit', () => {
  const { s, R } = traced(['stable']), xs = rooms(s, 'rest');
  const extra = xs.find((x) => x.extra === 'stable');
  assert.ok(extra, 'its rest room');
  assert.ok(FP.neighbours(R.graph, extra.id).some((id) => R.graph.spine.includes(id)));
  R.max = s.run.max; s.run.integrity = 1;
  for (const x of xs) { place(s, x.id); FP.act(s, 'rest'); }
  assert.equal(s.logs.filter((e) => /You rest: \+/.test(e.message)).length, xs.length, 'each rests');
  place(s, extra.id); FP.act(s, 'rest');
  assert.match(s.logs.at(-1).message, /already rested here/);
});

test('Rich: kills drop twice the code, the vault\'s code doubles, its guards and Resident are Armored', () => {
  const code = (special) => {
    const { s } = traced(special);
    fightIn(s, rooms(s, 'process').find((x) => FP.isUp(s, x)));
    win(s);
    return s.run.pack.filter((f) => f.kind === 'code').reduce((n, f) => n + f.amount, 0);
  };
  const plain = code(['stable']), rich = code(['rich']);
  assert.ok(plain > 0); assert.equal(rich, plain * 2);
  const { s, R } = traced(['rich']);
  assert.equal(FP.fightOf(s, rooms(s, 'guard')[0]).opts.mutation, 'armored');
  assert.equal(FP.fightOf(s, R.graph.rooms[R.graph.core]).opts.mutation, 'armored');
});

test('Hostile: its fights pay 50% more XP and hit 25% harder', () => {
  const at = (special) => { const { s } = traced(special, { seed: 3 }); const e = fightIn(s, rooms(s, 'process').find((x) => FP.isUp(s, x))); return { xp: e.roomsXp, dmg: e.virus.roomDmg }; };
  const plain = at(['rich']), hostile = at(['hostile']);
  assert.equal(hostile.xp, plain.xp * SP.SPECIAL.xp);
  assert.ok(Math.abs(hostile.dmg - plain.dmg * SP.SPECIAL.hits) < 1e-9);
});

test('Legacy: rare spawns twice as often, its Resident a level higher', () => {
  const { s, loc } = traced(['legacy']);
  assert.equal(FP.WORLD.rare(s), 2);
  const plain = residentLevel({ ...loc, special: ['rich'] }, clock);
  assert.equal(residentLevel(loc, clock), plain + 1);
});

test('Backbone: one more socket room', () => {
  const n = (special) => rooms(traced(special, { seed: 5 }).s, 'socket').length;
  assert.equal(n(['backbone']), n(['rich']) + 1);
});

test('Hardened: the vault pays double, Root climbs twice as fast, guards and Resident Armored', () => {
  const vault = (special) => {
    const { s, R } = traced(special);
    const post = rooms(s, 'guard').find((r) => r.key === R.graph.vaults[0]);
    fightIn(s, post); win(s);
    place(s, R.graph.vaults[0]); FP.act(s, 'open');
    return s.run.pack.filter((f) => f.path.startsWith('vault') || f.path.includes('/')).filter((f) => ['credits', 'code'].includes(f.kind) && f.loc).reduce((n, f) => n + f.amount, 0);
  };
  const plain = vault(['stable']), hard = vault(['hardened']);
  assert.ok(plain > 0); assert.ok(Math.abs(hard - plain * 2) <= 2, `${plain} → ${hard}`);
  const { s, loc } = traced(['hardened']);
  assert.equal(FP.fightOf(s, rooms(s, 'guard')[0]).opts.mutation, 'armored');
  loc.root = { level: 1, cleared: 0 };
  rootClear(s, loc, 2);
  assert.equal(loc.root.cleared, 2);
});

test('Guarded: a crew elite holds the Core; the vault holds one of the floor\'s uniques', () => {
  const { s, R } = traced(['guarded'], { level: 12 });
  const f = FP.fightOf(s, R.graph.rooms[R.graph.core]);
  assert.equal(f.size, 'elite'); assert.ok(f.opts.elite); assert.ok(!f.opts.boss);
  const post = rooms(s, 'guard').find((r) => r.key === R.graph.vaults[0]);
  fightIn(s, post); win(s);
  place(s, R.graph.vaults[0]); FP.act(s, 'open');
  const u = s.run.pack.find((f) => f.path === 'vault/#guarded');
  assert.ok(u?.item?.unique, 'a unique');
  FP.act(s, 'pull');
  assert.equal(s.run.pack.filter((f) => f.path === 'vault/#guarded').length, 1, 'once');
});

test('the programs: on the shelves, Lockdown paid in Cipher', () => {
  for (const id of ['lockdown', 'amplifier', 'bulkhead', 'patch', 'honeytoken', 'lure']) {
    assert.ok(SK.PROGRAMS[id]?.rule, id);
    assert.ok(Object.values(SK.CODEBASE_SHOPS).some((xs) => xs.some(([x]) => x === id)), `${id} on a shelf`);
  }
  const { s, sock } = playtest();
  assert.deepEqual(Object.keys(SK.programCost(s.rooms, 'lockdown').code), ['cipher']);
  assert.ok(build(s, sock, 'lockdown') !== false && FP.programIn(s, sock.id) === 'lockdown');
});

test('the Patch Injector: viruses on its server have 1 ◆ less on every part', () => {
  const armor = (patch) => { const { s, sock } = playtest({ seed: 9 }); if (patch) build(s, sock, 'patch'); const room = rooms(s, 'process').find((x) => FP.isUp(s, x)); const e = fightIn(s, room); return e.virus.parts.map((p) => p.maxArmor); };
  const plain = armor(false), patched = armor(true);
  assert.ok(plain.some((n) => n > 0));
  assert.deepEqual(patched, plain.map((n) => Math.max(0, n - 1)));
});

test('the Bulkhead: fights next door start behind a shield of 10% of your max Signal; not two rooms away', () => {
  const shield = (bulk, near) => {
    const { s, sock } = playtest({ seed: 4 });
    s.rooms.programs = bulk ? { [sock.id]: 'bulkhead' } : {};
    const g = s.rooms.graph, next = FP.neighbours(g, sock.id)[0];
    const room = near ? g.rooms[next] : rooms(s, 'process').find((x) => x.id !== next && !FP.neighbours(g, x.id).includes(sock.id));
    s.rooms.cleared[next] = null;
    FP.fight(s, room);
    return { n: s.encounter.shield || 0, max: s.rooms.max };
  };
  const plain = shield(false, true), bulk = shield(true, true);
  assert.equal(bulk.n - plain.n, Math.round(bulk.max * SK.SOCKET.bulkhead));
  assert.equal(shield(true, false).n, shield(false, false).n);
});

test('the Honeytoken: a grade higher, 1 in 4 an elite, 50% more XP', () => {
  const { s, sock } = playtest({ seed: 11 });
  const room = rooms(s, 'process').find((x) => FP.isUp(s, x));
  const plain = FP.fightOf(s, room);
  build(s, sock, 'honeytoken');
  const f = FP.fightOf(s, room);
  assert.equal(f.opts.grade, 2); assert.ok(!plain.opts.grade);
  let elites = 0;
  for (let n = 0; n < 400; n++) { s.rooms.spawns[room.id] = n; if (FP.fightOf(s, room).elite) elites++; }
  assert.ok(Math.abs(elites / 400 - 0.25) < 0.07, `${elites} of 400`);
  s.rooms.spawns[room.id] = 0;
  const e = fightIn(s, room);
  assert.equal(e.roomsXp, FP.ROOMS.xp.room * (f.rare ? FP.ROOMS.xp.rare : 1) * SK.SOCKET.honey.xp);
});

test('the Lure: fight rooms respawn as the family you name, one you\'ve met', () => {
  const { s, sock } = playtest();
  const room = rooms(s, 'process').find((x) => FP.isUp(s, x)), other = FP.lureFamilies({ met: { worm: 1, splinter: 1, cryptjack: 1, ghostroot: 1, ...Object.fromEntries(rooms(s, 'process').map((x) => [x.family, 1])) } }).find((f) => f !== room.family);
  build(s, sock, 'lure');
  s.met = { [other]: true };
  FP.roomsCommand(s, 'lure nothing-here');
  assert.match(s.logs.at(-1).message, /name a family you've met/);
  FP.roomsCommand(s, `lure ${other}`);
  assert.equal(s.rooms.lure, other);
  assert.equal(FP.fightOf(s, room).family, other);
});

test('the save (v50): a trait becomes a special; a server with none rolls one; a wild one has none; twice is once', () => {
  const s = fresh(); s.tutorialCompleted = true;
  for (const f of ['worm', 'ransomware', 'ghostroot']) command(s, `developer location ${f}`);
  const [a, b, c] = s.locations;
  for (const l of s.locations) delete l.special;
  a.trait = 'rich'; b.trait = null; c.trait = null; c.rogue = { kind: 'pit' };
  const t = restore(JSON.parse(JSON.stringify(s)));
  const [A, B, C] = t.locations;
  assert.deepEqual(A.special, ['rich']); assert.ok(!('trait' in A));
  assert.deepEqual(B.special, SP.rollSpecials(B)); assert.equal(C.special, null);
  const again = restore(JSON.parse(JSON.stringify(t)));
  assert.deepEqual(again.locations.map((l) => l.special), t.locations.map((l) => l.special));
});

test('the look: one filled amber tag, its glyph and name; the tooltip says what it is and names the programs; the map node wears the glyph', () => {
  const { s, loc } = traced(['volatile']);
  const tag = specialTags(loc);
  assert.match(tag, /class="tag tag-special" data-special="volatile"/);
  assert.match(tag, /⚡\uFE0E Volatile<\/span>$/);
  assert.match(tag, /title="Volatile: Server special\.\n.*\n▸ Amplifier raises it\. Lockdown lowers it\."/s);
  assert.match(tag, /<template class="tt-more">.*class="rw".*class="rw neg"/s);
  play(s, 'jack out');
  assert.match(mapMarkup(s, loc.id), /class="mspecial"[^>]*>⚡\uFE0E</);
});
