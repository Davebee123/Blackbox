// Threads (docs/threads.md, GAME_RULES.md "Threads"): quests found in server rooms, never given and never timed.
// threads.mjs (starts, places, the steps: talk, goto, escort, temporary servers; rewards, the save), its content
// (content/threads.mjs: Restore Point, The Night Operator, Mirror, and the one-offs), the room engine's hooks
// (floorplan.mjs moved and verb, netrooms.mjs connect, stood, coreOpen, won) and its screens (threads-view.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, hooks, restore, SAVE_VERSION, hackerLevel } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import { play } from './dist/run.mjs';
import * as FP from './dist/floorplan.mjs';
import * as TH from './dist/threads.mjs';
import { addrsOf } from './dist/address.mjs';
import { floorsOf } from './dist/floors.mjs';
import { rep } from './dist/factions.mjs';
import { summaryOf } from './dist/netrooms.mjs';
import { roomsMarkup } from './dist/floorplan-view.mjs';
import { mailMarkup, mapMarkup } from './dist/view.mjs';
import { offerMarkup, threadPanel } from './dist/threads-view.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false; CONFIG.exfil.chance = 0;
let clock = 1_700_000_000_000;
hooks.now = () => clock;

// A character at a level with servers located on floors 1 to 3 (worms on 1, ransomware on 2, ghostroot on 3).
function setup(level = 6, { floors = 1, n1 = 5, n2 = 0, n3 = 0 } = {}) {
  const s = fresh(); s.tutorialCompleted = true;
  const arch = s.loadout.archetype;
  floorsOf(s).reached = floors;
  s.hackers = { [arch]: { level: 6, xp: 0 } };
  for (let i = 0; i < n1; i++) command(s, 'developer location worm');
  s.hackers[arch].level = 10; for (let i = 0; i < n2; i++) command(s, 'developer location ransomware');
  s.hackers[arch].level = 15; for (let i = 0; i < n3; i++) command(s, 'developer location ghostroot');
  s.hackers[arch].level = level;
  return s;
}
const tame = (s, floor = 1) => s.locations.filter((l) => !l.rogue && (l.depth || 1) === floor);
const locOf = (s, id) => s.locations.find((l) => l.id === id) || s.threads.servers.find((l) => l.id === id);
const win = (s) => { for (let i = 0; i < 60 && active(s); i++) { for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, attack: null, integrity: Math.min(p.integrity, 1) }); const p = s.encounter.virus.parts.find((x) => x.integrity > 0); command(s, 'spike ' + p.id); resolveCycle(s); } FP.settle(s); };
// Walk to a room through the real verbs, beating what holds each room on the way (full Signal each step).
const walk = (s, id) => {
  for (let k = 0; k < 60 && s.rooms.at !== id; k++) {
    const path = FP.pathTo(s.rooms.graph, s.rooms.at, id, (x) => x !== s.rooms.graph.core || FP.coreOpen(s));
    assert.ok(path, `a way to ${id}`);
    FP.go(s, path[1]);
    if (s.rooms.screen?.kind === 'virus' || s.rooms.screen?.kind === 'hunter') FP.act(s, 'engage');
    if (active(s)) win(s);
    s.run.integrity = s.run.max;
  }
  assert.equal(s.rooms.at, id);
};
const connect = (s, loc) => { if (s.run) play(s, 'jack out'); clock += 60000; loc.lockUntil = 0; const ev = play(s, 'connect ' + loc.id); assert.ok(s.run, ev.map((e) => e.message).join(' ')); return ev; };
// Walk a file all the way on the server you're on: clear what blocks it, stay with it, wait.
const escort = (s, t) => {
  for (let i = 0; i < 300 && t.esc && t.esc.state === 'walk' && t.esc.loc === s.rooms.loc; i++) {
    const next = TH.escortNext(s, t);
    if (!next && t.esc.blocked) { walk(s, t.esc.blocked); walk(s, t.esc.at); continue; }
    if (s.rooms.at !== t.esc.at) walk(s, t.esc.at);
    FP.wait(s);
  }
};
const said = (ev) => ev.map((e) => e.message).join('\n');
// Begin a chain on the server you're on (developer thread pins its start), standing in its room.
const begin = (s, chain) => {
  const loc = locOf(s, s.run.loc);
  TH.developerThread(s, chain);
  const st = TH.startHere(s, loc);
  walk(s, st.room);
  const ev = FP.act(s, 'talk');
  return { t: TH.activeThreads(s).at(-1), ev, loc, st };
};

test('starts: seeded per server, at most one, in a room of its own that never moves an address or counts toward Rooms n/N; never on SPRAWL-00, the farm, a lair, a rogue or a temporary server', () => {
  let found = 0, servers = 0;
  for (let k = 0; k < 8; k++) {
    const s = setup(6, { n1: 8 }); s.netSeed = 500 + k;
    for (const loc of s.locations) {
      const before = loc.floorplan ? { ...addrsOf(loc.floorplan.graph) } : null, sum = loc.floorplan ? summaryOf(s, loc) : null;
      const a = TH.startOn(s, loc), b = TH.startOn(s, loc);
      assert.deepEqual(a, b, 'pinned: the same start every time it is asked');
      if (!TH.eligible(loc)) { assert.equal(a, null, `${loc.name}: no thread on a rogue server`); continue; }
      servers++;
      if (!a) continue;
      found++;
      const g = loc.floorplan.graph, room = g.rooms[a.room];
      assert.ok(room.nook && room.kind === 'empty', 'a room of its own');
      assert.equal(Object.values(g.rooms).filter((x) => x.nook).length, 1, 'one start a server');
      assert.equal(FP.neighbours(g, room.id).length, 1, 'hung off one room');
      if (before) for (const [id, x] of Object.entries(before)) assert.equal(addrsOf(g)[id], x, 'no address moves');
      assert.equal(new Set(Object.values(addrsOf(g))).size, Object.keys(g.rooms).length, 'addresses unique');
      assert.ok(loc.floorplan.cleared[room.id], 'it comes cleared (the bots never walk to it)');
      const s2 = summaryOf(s, loc);
      if (sum) assert.deepEqual([s2.done, s2.total], [sum.done, sum.total], 'Rooms n/N as it was');
    }
    assert.equal(TH.startOn(s, s.zone || { id: 'sprawl', zone: true }), null, 'never on SPRAWL-00');
    for (const x of [{ id: 'x', slot: 'f1-1', farm: true }, { id: 'y', slot: 'f2-1', lair: 'nb', rogue: { kind: 'lair' } }, { id: 'z', temp: {} }]) assert.equal(TH.startOn(s, x), null);
  }
  assert.ok(found >= servers * 0.25 && found <= servers * 0.75, `${found} of ${servers} servers hold a start`);
});

test('the authored chains land on their floor once you reach their level: Restore Point on floor 1 by the second server you connect to, never under level 3', () => {
  const low = setup(2, { n1: 5 });
  for (const loc of tame(low)) connect(low, loc);
  assert.ok(!Object.values(low.threads.starts).some((x) => x?.chain === 'restore-point'), 'waits under its level');
  low.hackers[low.loadout.archetype].level = 3;
  for (const loc of tame(low)) connect(low, loc);
  const where = Object.entries(low.threads.starts).filter(([, x]) => x?.chain === 'restore-point');
  assert.equal(where.length, 1, 'once, on one server');
  const s = setup(5, { n1: 5 }), order = tame(s);
  connect(s, order[0]); connect(s, order[1]);
  assert.equal(Object.values(s.threads.starts).filter((x) => x?.chain === 'restore-point').length, 1, 'by the second server');
});

test('Restore Point (floor 1): talk at its start, reach the archive, walk the file out (it waits at live rooms, bites unless you stand with it, a clean copy when it dies), in transit, leg two, the restore point, pick one of three', () => {
  const s = setup(5, { n1: 5 });
  const home = tame(s)[0];
  connect(s, home);
  const R = s.rooms;
  TH.developerThread(s, 'restore-point');
  const st = TH.startHere(s, home);
  // The ! shows only once you've been in its room.
  assert.equal(TH.marksOn(s, home)[st.room], undefined, '??? until found');
  walk(s, st.room);
  assert.deepEqual(TH.marksOn(s, home)[st.room], { mark: '!', text: 'Restore Point', tid: null });
  const ev = FP.act(s, 'talk');
  assert.match(said(ev), /restore 4471[\s\S]*Source locked at [A-Z]\d+\.[\s\S]*The restore point is on [A-Z]+-[A-Z]+-\d+\./);
  const t = TH.activeThreads(s)[0];
  assert.equal(t.step, 1);
  assert.equal(s.threads.track, t.id, 'tracked');
  assert.equal(t.places.archive.loc, home.id, 'the archive on this server');
  assert.notEqual(t.places.point.loc, home.id, 'the restore point on another');
  assert.equal(R.seen[t.places.archive.room] ? 'drawn' : 'hidden', 'drawn', 'where it sends you is drawn on the map');
  assert.equal(TH.marksOn(s, home)[t.places.archive.room].mark, '?');
  // Reach it: the goto is done and the file wakes there.
  const xp0 = s.hackers[s.loadout.archetype].xp;
  walk(s, t.places.archive.room);
  assert.equal(t.step, 2);
  assert.ok(s.hackers[s.loadout.archetype].xp > xp0 || hackerLevel(s) > 5, 'a step pays deed XP');
  assert.deepEqual([t.esc.loc, t.esc.at, t.esc.hp, t.esc.state], [home.id, t.places.archive.room, 100, 'walk']);
  // A room every 2 of your moves.
  const at0 = t.esc.at;
  FP.wait(s);
  assert.equal(t.esc.at, at0, 'not on the first move');
  const next = TH.escortNext(s, t);
  FP.wait(s);
  if (next) assert.equal(t.esc.at, next, 'a room on the second');
  // It never walks into a live room or the sealed Core: where one is in its way, it waits there.
  const g = R.graph, dest = TH.escortDest(s, t), atNow = t.esc.at;
  let waits = 0;
  for (const x of FP.roomList(s).filter((r) => !FP.isUp(s, r) && r.kind !== 'core' && r.id !== dest)) {
    t.esc.at = x.id;
    const n = TH.escortNext(s, t);
    if (n) assert.ok(!FP.isUp(s, g.rooms[n]) && n !== g.core, `${x.id} → ${n}: never into a live room`);
    else { waits++; assert.ok(FP.isUp(s, g.rooms[t.esc.blocked]), 'it waits for a live room'); }
  }
  assert.ok(waits > 0);
  t.esc.at = atNow;
  // Bitten while you're not with it; with you, nothing bites.
  const liveNext = FP.roomList(s).find((x) => FP.isUp(s, x) && x.kind === 'process' && FP.neighbours(g, x.id).some((y) => !FP.isUp(s, g.rooms[y]) && g.rooms[y].kind !== 'core'));
  const beside = FP.neighbours(g, liveNext.id).find((y) => !FP.isUp(s, g.rooms[y]) && g.rooms[y].kind !== 'core');
  Object.assign(t.esc, { at: beside, count: 0, hp: 100 });
  R.at = beside; R.visit.walked[beside] = true;
  FP.wait(s);
  assert.equal(t.esc.hp, 100, 'you stand with it: nothing bites');
  t.esc.count = 0;
  R.at = FP.neighbours(g, beside).find((y) => y !== liveNext.id) || g.entry;
  FP.wait(s);
  assert.ok(t.esc.hp < 100, 'away from it, the live room next door bites');
  // At 0: a clean copy back where the leg began; nothing else lost.
  Object.assign(t.esc, { hp: 1, count: 0 });
  const ev2 = FP.wait(s);
  assert.match(said(ev2), /corrupted\. A clean copy waits in/);
  assert.deepEqual([t.esc.at, t.esc.hp, t.state, t.step], [t.places.archive.room, 100, 'active', 2]);
  // Walk it out: in transit at the entry.
  R.at = t.esc.at;
  escort(s, t);
  assert.equal(t.esc.state, 'transit');
  assert.equal(t.esc.loc, t.places.point.loc);
  assert.match(TH.objectiveOf(s, t), /In transit to/);
  // Never timed: a month away changes nothing.
  clock += 30 * 24 * 3600000;
  const evc = connect(s, locOf(s, t.places.point.loc));
  assert.match(said(evc), /came through\. It waits at the entry\./);
  assert.deepEqual([t.esc.state, t.esc.leg, t.esc.at], ['walk', 2, s.rooms.graph.entry]);
  escort(s, t);
  assert.equal(t.step, 3, 'in: the next step');
  walk(s, t.places.point.room);
  const evd = FP.act(s, 'talk');
  assert.match(said(evd), /2,114 files restored[\s\S]*thank you, whoever you are/);
  assert.equal(t.state, 'done');
  assert.equal(t.lore, 'M. Wren got her photos back. She never knew from where.');
  // Pick one of three: blues (a yellow one time in ten), one for your class and the stat you chase, each a different slot.
  const o = s.threads.offer;
  assert.equal(o.items.length, 3);
  assert.ok(o.items.every((it) => ['tuned', 'custom'].includes(it.rarity)));
  assert.equal(new Set(o.items.map((it) => it.group)).size, 3);
  const n0 = s.stash.length;
  play(s, 'thread take 2');
  assert.equal(s.stash.length, n0 + 1);
  assert.equal(s.threads.offer, null);
  assert.ok(t.reward);
});

test('a chain\'s reward: three blues at its level, a yellow among them one time in ten; a one-off\'s blue or white', () => {
  const s = setup(10, { n1: 3 });
  let gold = 0, n = 0;
  for (let k = 0; k < 400; k++) {
    const t = { id: 't' + k, chain: 'night-operator', seed: 1000 + k * 7919, level: 10, places: {} };
    const items = TH.offerItems(s, t);
    n++; if (items.some((x) => x.rarity === 'custom')) gold++;
    assert.ok(items.every((x) => x.level === 10));
    assert.equal(items.filter((x) => x.rarity === 'custom').length <= 1, true);
    const short = TH.offerItems(s, { ...t, chain: 'tpl:escort:0' });
    assert.ok(short.every((x) => ['tuned', 'stock'].includes(x.rarity)));
  }
  assert.ok(gold / n > 0.05 && gold / n < 0.16, `${gold}/${n}`);
});

test('The Night Operator (floor 2): fight to the file, carry it two servers over, then a choice of two: hand it over (Kestrel up) or sell it to GLASSJAW (credits, Kestrel down)', () => {
  for (const pick of [1, 2]) {
    const s = setup(12, { floors: 2, n1: 3, n2: 6 });
    connect(s, tame(s, 2)[0]);
    const { t, ev } = begin(s, 'night-operator');
    assert.match(said(ev), /Payroll file's still on [A-Z-]+\d+\. Get it out before the purge\./);
    const ids = [t.places.start.loc, t.places.file.loc, t.places.terminal.loc];
    assert.equal(new Set(ids).size, 3, 'the file and her terminal each on a server of their own');
    connect(s, locOf(s, t.places.file.loc));
    walk(s, t.places.file.room);
    assert.equal(TH.stepOf(t).kind, 'escort');
    escort(s, t);
    if (t.esc?.state === 'transit') { connect(s, locOf(s, t.esc.loc)); escort(s, t); }
    assert.equal(t.step, 3);
    walk(s, t.places.terminal.room);
    const k0 = rep(s, 'kestrel'), g0 = rep(s, 'glassjaw'), c0 = s.server.credits;
    const ask = FP.act(s, 'talk');
    assert.match(said(ask), /talk 1  Hand it over\n  talk 2  Sell it to GLASSJAW/);
    assert.equal(t.state, 'active', 'it waits for your answer');
    assert.deepEqual(s.threads.said.choices, ['Hand it over', 'Sell it to GLASSJAW']);
    play(s, `talk ${pick}`);
    assert.equal(t.state, 'done');
    if (pick === 1) { assert.ok(rep(s, 'kestrel') > k0); assert.equal(s.server.credits, c0); assert.match(t.lore, /Forty people got paid/); }
    else { assert.ok(rep(s, 'glassjaw') > g0); assert.ok(rep(s, 'kestrel') < k0); assert.equal(s.server.credits, c0 + TH.THREAD.credits(12, [150, 25])); assert.match(t.lore, /GLASSJAW resold/); }
  }
});

test('Mirror (floor 3): a temporary server copying your ground appears on the floor map, grows a room a visit, its logs name its builder a floor up, who unseals its kill switch; beaten, it goes dark for good', () => {
  const s = setup(16, { floors: 3, n1: 2, n2: 4, n3: 5 });
  const start = tame(s, 3)[0];
  connect(s, start);
  const { t, ev } = begin(s, 'mirror');
  assert.match(said(ev), /A server appears on floor 3: MIRROR-\d\d\./);
  const tl = s.threads.servers[0];
  assert.ok(tl.temp && tl.depth === 3 && !s.locations.includes(tl), 'no server of your network: its own list');
  assert.ok(tl.floorplan.graph.copyOf, 'its rooms copy a server of yours');
  const src = s.locations.find((l) => l.name === tl.floorplan.graph.copyOf);
  const shape = (g) => Object.values(g.rooms).filter((x) => !x.nook).map((x) => `${x.x},${x.y}`).sort();
  assert.deepEqual(shape(tl.floorplan.graph), shape(src.floorplan.graph), 'the same layout');
  assert.match(mapMarkup(s, tl.id, 'mine', { side: true }), new RegExp(`mnode temp[^"]*" data-select="${tl.id}"[\\s\\S]*Temporary server · floor 3`));
  // Its Core is sealed: no kill switch yet.
  connect(s, tl);
  assert.equal(FP.coreOpen(s), false);
  // The build log, then the process log (the sweep): a wrong pid costs nothing.
  walk(s, tl.temp.logs.build);
  assert.match(said(FP.act(s, 'read')), /by=quill[\s\S]*ask quill, last seen on [A-Z-]+\d+/);
  walk(s, tl.temp.logs.sweep);
  const p = TH.tempSweep(tl);
  assert.equal(p.question, 'Which pid built this server?');
  play(s, 'sweep ' + p.suspects.find((x) => x !== p.answer));
  assert.equal(t.step, 1, 'a wrong answer: look again');
  play(s, 'sweep ' + p.answer);
  assert.equal(t.step, 2);
  assert.equal(FP.coreOpen(s), false, 'Mirror: only its builder gives the kill switch up');
  // It grows a room each visit, never on its own.
  const n0 = Object.keys(tl.floorplan.graph.rooms).length;
  clock += 7 * 24 * 3600000;
  assert.equal(Object.keys(tl.floorplan.graph.rooms).length, n0, 'nothing happens while you are away');
  assert.match(said(connect(s, tl)), /grew a room since you were last here/);
  assert.equal(Object.keys(tl.floorplan.graph.rooms).length, n0 + 1);
  // Quill, a floor up.
  const npc = locOf(s, t.places.npc.loc);
  assert.equal(npc.depth, 2, 'a floor up');
  connect(s, npc); walk(s, t.places.npc.room);
  assert.match(said(FP.act(s, 'talk')), /kill switch is in its Core/);
  assert.equal(tl.temp.kill, true);
  connect(s, tl);
  assert.equal(FP.coreOpen(s), true);
  walk(s, tl.floorplan.graph.core);
  assert.ok(tl.temp.dark, 'dark');
  assert.equal(t.state, 'done');
  play(s, 'jack out'); clock += 60000; tl.lockUntil = 0;
  assert.match(said(play(s, 'connect ' + tl.id)), /is dark\. Nothing answers\./);
  assert.ok(s.threads.servers.includes(tl), 'it stays on the map, a record');
  assert.match(mapMarkup(s, tl.id, 'mine', { side: true }), /mnode temp dark/);
});

test('one-offs on any floor: an escort, a talk and a temporary server, each from its start to its end', () => {
  for (const kind of ['escort', 'talk', 'temp']) {
    const s = setup(6, { n1: 5 });
    connect(s, tame(s)[1]);
    const { t } = begin(s, kind);
    assert.equal(TH.chainOf(t).short, true);
    for (let guard = 0; guard < 8 && t.state === 'active'; guard++) {
      const step = TH.stepOf(t);
      if (step.kind === 'escort') { if (t.esc.state === 'transit') connect(s, locOf(s, t.esc.loc)); else if (s.rooms.loc !== t.esc.loc) connect(s, locOf(s, t.esc.loc)); escort(s, t); continue; }
      if (step.kind === 'talk') { const pl = TH.placeOf(s, t, step.at); if (s.rooms.loc !== pl.loc) connect(s, locOf(s, pl.loc)); walk(s, pl.room); FP.act(s, 'talk'); continue; }
      const tl = locOf(s, t.temps[step.server]);
      if (s.rooms.loc !== tl.id) connect(s, tl);
      if (step.goal === 'logs') { walk(s, tl.temp.logs.build); FP.act(s, 'read'); walk(s, tl.temp.logs.sweep); play(s, 'sweep ' + TH.tempSweep(tl).answer); assert.equal(tl.temp.kill, true, 'a one-off\'s logs give its kill switch up'); }
      else walk(s, tl.floorplan.graph.core);
    }
    assert.equal(t.state, 'done', kind);
    assert.ok(t.lore && s.threads.offer?.tid === t.id, `${kind}: its lore and its reward`);
  }
});

test('never timed, nothing missable: set a thread aside and pick it up again (from Mail or where you found it); its file waits where it stood', () => {
  const s = setup(6, { n1: 5 });
  connect(s, tame(s)[0]);
  const { t, st } = begin(s, 'escort');
  FP.wait(s); FP.wait(s);
  const at = t.esc.at;
  play(s, `thread abandon ${t.id}`);
  assert.equal(t.state, 'abandoned');
  assert.equal(s.threads.track, null);
  FP.wait(s); FP.wait(s); FP.wait(s);
  assert.equal(t.esc.at, at, 'set aside: it waits');
  clock += 90 * 24 * 3600000;
  walk(s, st.room);
  assert.equal(TH.verbOf(s, TH.offerAt(s, locOf(s, s.run.loc), s.rooms.graph.rooms[st.room])), 'Pick it up');
  FP.act(s, 'talk');
  assert.equal(t.state, 'active');
  assert.equal(s.threads.track, t.id);
  play(s, `thread abandon ${t.id}`); play(s, `thread resume ${t.id}`);
  assert.equal(t.state, 'active');
  assert.match(said(play(s, 'threads')), new RegExp(`${t.id}\\s+▸ ${TH.chainOf(t).title}`));
});

test('the save (v43): an older save starts with no threads and pins starts as you connect; a save keeps threads, a temporary server and a file mid-walk', () => {
  assert.equal(SAVE_VERSION, 46); // v44 (whole-number stats), v45 (sets) and v46 (no default subclass) came after
  const old = setup(6, { n1: 4 });
  delete old.threads; old.version = 42;
  const back = restore(JSON.parse(JSON.stringify(old)));
  assert.equal(back.version, SAVE_VERSION);
  assert.deepEqual([back.threads.list, back.threads.servers, back.threads.offer], [[], [], null]);
  connect(back, tame(back)[0]);
  assert.ok(Object.hasOwn(back.threads.starts, tame(back)[0].id), 'pinned on connect');
  // Mid-walk, a temporary server on the map.
  const s = setup(6, { n1: 5 });
  connect(s, tame(s)[0]);
  const { t } = begin(s, 'escort');
  FP.wait(s); FP.wait(s);
  connect(s, tame(s)[1]);
  begin(s, 'temp');
  const r = restore(JSON.parse(JSON.stringify(s)));
  assert.deepEqual(r.threads.list.map((x) => [x.id, x.state, x.step]), s.threads.list.map((x) => [x.id, x.state, x.step]));
  assert.deepEqual(r.threads.list[0].esc, t.esc);
  assert.equal(r.threads.servers.length, 1);
  assert.ok(r.threads.servers[0].floorplan.graph.rooms[r.threads.servers[0].temp.logs.build]);
  play(r, 'jack out'); clock += 60000; r.threads.servers[0].lockUntil = 0;
  play(r, 'connect ' + r.threads.servers[0].id);
  assert.equal(r.run?.loc, r.threads.servers[0].id, 'its temporary server still takes a connect');
});

test('the screens: the ! only once found and amber (never teal), Talk on the card, the dialogue and its choice, the strip, the file on the map, the Threads list with its steps struck, the reward card', () => {
  const s = setup(12, { floors: 2, n1: 3, n2: 6 });
  connect(s, tame(s, 2)[0]);
  const loc = locOf(s, s.run.loc);
  TH.developerThread(s, 'night-operator');
  const st = TH.startHere(s, loc);
  assert.doesNotMatch(roomsMarkup(s), /fp-quest/, '??? until found');
  walk(s, st.room);
  let html = roomsMarkup(s);
  const chip = html.match(new RegExp(`<g class="fp-room[^"]*" data-room="${st.room}"[\\s\\S]*?</g>(?=<g class="fp-room|<path class="fp-route|<g class="fp-bits|</svg>)`))[0];
  assert.match(chip, /class="fp-quest m-start"[\s\S]*>!</);
  assert.doesNotMatch(chip.match(/<g class="fp-quest[\s\S]*?<\/g>/)[0], /you|teal/);
  assert.match(html, /data-rooms="talk"[^>]*>Talk</, 'Talk on its card');
  FP.act(s, 'talk');
  html = roomsMarkup(s);
  assert.match(html, /id="th-panel"[\s\S]*ops-night · idle 41:12:07[\s\S]*Payroll file&#39;s still on/);
  assert.match(html, /class="fp-stat fp-thread"[\s\S]*The Night Operator/, 'the strip: the thread you track');
  const t = TH.activeThreads(s)[0];
  const mail = mailMarkup(s, t.id);
  assert.match(mail, /Threads · 1/);
  assert.match(mail, /th-step done[^"]*"><span class="th-dot"[^>]*><\/span><span>Hear out the idle session\.<\/span>/, 'the done step struck');
  assert.match(mail, /th-step now/);
  assert.match(mail, /th-step fog[\s\S]*\?\?\?/, 'the steps ahead: ??? until you get there');
  // The file on the map: its badge, its arrow, its Integrity on the strip.
  connect(s, locOf(s, t.places.file.loc));
  walk(s, t.places.file.room);
  FP.wait(s); FP.wait(s);
  html = roomsMarkup(s);
  assert.match(html, /class="fp-file[\s\S]*payroll\.db: \d+%/);
  assert.match(html, /fp-stat fp-filestat[\s\S]*payroll\.db/);
  // The choice and the reward card.
  escort(s, t);
  if (t.esc?.state === 'transit') { connect(s, locOf(s, t.esc.loc)); escort(s, t); }
  walk(s, t.places.terminal.room);
  FP.act(s, 'talk');
  assert.match(threadPanel(s, { closed: null }), /data-rooms="talk" data-arg="1"[\s\S]*Hand it over[\s\S]*data-arg="2"[\s\S]*Sell it to GLASSJAW/);
  play(s, 'talk 1');
  const card = offerMarkup(s);
  assert.equal((card.match(/data-run="thread take \d"/g) || []).length, 3);
  assert.match(card, /Thread done[\s\S]*The Night Operator[\s\S]*Pick one/);
});

test('the bots never start one: a whole visit leaves every thread where it was, and nothing a thread adds holds up Mapped', () => {
  const s = setup(6, { n1: 4 });
  const loc = tame(s)[0];
  connect(s, loc);
  TH.developerThread(s, 'restore-point');
  for (const room of FP.roomList(s)) if (FP.FIGHTS.includes(room.kind) && room.kind !== 'core' && !room.nook) { if (s.rooms.at !== room.id) walk(s, room.id); }
  assert.equal(s.threads.list.length, 0, 'walking a server starts nothing');
  const sum = summaryOf(s, loc);
  assert.ok(sum.total === FP.roomList(s).filter(FP.counted).length); // a thread's room and a quirk's optional room never count
});
