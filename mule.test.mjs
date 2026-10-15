// Quiet rooms and the Mule (GAME_RULES.md "Rogue servers", docs/servers.md 9.6): a rogue server's rooms are a tree from
// its seed with 2 to 4 quiet rooms woven in (Empty, and Stash: a few credits), it runs in clears (a cleared room stays
// down until the full clear reboots it), and each run rolls once for the Mule, a loot mob that runs from you, on a
// cooldown of your own. floorplan.mjs (the Mule's moves and fight), netrooms.mjs (the rooms, the roll, the bag),
// rogue.mjs (runs and reboots).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fresh, command, resolveCycle, active, hooks, restore, finish } from './dist/combat.mjs';
import { CONFIG, ROOM_FAMILIES } from './dist/data.mjs';
import { play } from './dist/run.mjs';
import * as FP from './dist/floorplan.mjs';
import { rogueGraph, treeGraph, rogueRestore } from './dist/netrooms.mjs';
import { ROGUE, rogueRooms, rogueSpawns, inRuns } from './dist/rogue.mjs';
import { matesOf } from './dist/crew.mjs';
import { roomsMarkup } from './dist/floorplan-view.mjs';
import { boardMarkup } from './dist/view.mjs';
import { TIPS } from './dist/tips.mjs';
import { entries, entryOf } from './dist/codex.mjs';
import { RARITY_ORDER } from './dist/gear.mjs';
import { ELITE } from './dist/data.mjs';
import { rollDrop, rand } from './dist/combat.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false;
let clock = 1_700_000_000_000;
hooks.now = () => clock;
const M = CONFIG.mule, CHANCE = M.chance;
const quietKinds = ['empty', 'purse'];
// A level-12 character with a rogue server of its own (the pity rule makes the next trace one).
function rogueSave(kind = null) {
  const s = fresh(); s.tutorialCompleted = true;
  s.hackers = { [s.loadout.archetype]: { level: 12, xp: 0 } };
  for (let i = 0; i < 60; i++) {
    (s.net ||= {}).rogueDry = ROGUE.pity;
    command(s, 'developer location worm');
    const loc = s.locations.at(-1);
    if (loc.rogue && !loc.farm && (!kind || loc.rogue.kind === kind)) { loc.lockUntil = 0; return { s, loc }; }
  }
  throw new Error('no rogue server');
}
const connect = (s, loc, chance = 0) => { M.chance = chance; try { return play(s, 'connect ' + loc.id); } finally { M.chance = CHANCE; } };
// Every fight room down (the chase's ground opens up), or just these up.
const clearAll = (loc, except = []) => { for (const p of rogueRooms(loc)) Object.assign(loc.spawns[p], { alive: except.includes(p), respawnAt: null }); };
const kill = (s) => { for (let i = 0; i < 40 && active(s); i++) { for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: Math.min(p.integrity, 1) }); const p = s.encounter.virus.parts.find((x) => x.integrity > 0); if (p) command(s, 'spike ' + p.id); resolveCycle(s); } FP.settle(s); };
const place = (s, id) => { const R = s.rooms; R.at = id; R.visit.walked[id] = true; R.screen = null; FP.look(s); };
const mule = (s, at) => { const R = s.rooms; R.visit.mule = { at, seed: 4242, name: 'MULE-4242', state: 'loose', seen: true, cornered: false }; return R.visit.mule; };

test('quiet rooms: every rogue server has 2 to 4 woven into its tree, from its seed, named for what they are', () => {
  const counts = {};
  for (let seed = 1; seed <= 120; seed++) {
    const loc = { seed, level: 10, rogue: { kind: ['nest', 'pit', 'gauntlet'][seed % 3] } };
    const g = rogueGraph(loc), rooms = Object.values(g.rooms), quiet = rooms.filter((r) => quietKinds.includes(r.kind));
    assert.deepEqual(rogueGraph(loc), g, 'the same rooms every time');
    assert.ok(quiet.length >= 2 && quiet.length <= 4, `${quiet.length}`);
    counts[quiet.length] = (counts[quiet.length] || 0) + 1;
    assert.ok(quiet.some((r) => r.kind === 'purse') && quiet.some((r) => r.kind === 'empty'), 'an Empty and a Stash at least');
    assert.deepEqual(rooms.filter((r) => r.wild).map((r) => r.path0).sort(), [...rogueRooms(loc)].sort(), 'a fight room for every folder');
    for (const r of rooms) assert.doesNotMatch(r.path, /\//, 'never a folder name');
    for (const r of quiet) { assert.match(r.path, /^(Empty|Stash)( \d)?$/); assert.equal(r.path0, undefined, 'not a folder'); }
    // A tree: one link fewer than rooms, every link one grid step (nothing crosses), every room reachable.
    assert.equal(g.links.length, rooms.length - 1);
    for (const [a, b] of g.links) assert.equal(Math.abs(g.rooms[a].x - g.rooms[b].x) + Math.abs(g.rooms[a].y - g.rooms[b].y), 1);
    const d = FP.distances(g, g.entry);
    assert.equal(Object.keys(d).length, rooms.length);
    // Not all dead ends: a quiet room with a fight beyond it.
    assert.ok(quiet.some((q) => FP.neighbours(g, q.id).some((n) => g.rooms[n].wild && d[n] > d[q.id])), `seed ${seed}: one between`);
  }
  assert.ok(counts[2] && counts[3] && counts[4], JSON.stringify(counts));
  // SPRAWL-00, a lair and the farm keep their trees: no quiet rooms, no runs.
  assert.equal(inRuns({ rogue: { kind: 'lair' }, lair: 'x' }), false);
  assert.equal(inRuns({ rogue: { kind: 'farm' }, farm: true }), false);
  const s = fresh(); play(s, 'connect sprawl');
  assert.ok(!Object.values(s.rooms.graph.rooms).some((r) => quietKinds.includes(r.kind)), 'SPRAWL-00 as it was');
});

test('an Empty room counts toward Rooms n/N as you walk in; a Stash pays a few credits as you walk in and fills again only on the reboot', () => {
  const { s, loc } = rogueSave();
  connect(s, loc);
  const R = s.rooms, g = R.graph;
  clearAll(loc);
  const empty = FP.roomList(s).find((r) => r.kind === 'empty'), stash = FP.roomList(s).find((r) => r.kind === 'purse');
  place(s, FP.neighbours(g, empty.id)[0]);
  const before = FP.progressOf(s).done;
  FP.go(s, empty.id);
  assert.ok(R.cleared[empty.id], 'cleared');
  assert.equal(FP.progressOf(s).done, before + 1, 'Rooms n/N counts it');
  // The Stash: about 4 + level/2 credits, straight into your bank, and its room cleared.
  place(s, FP.neighbours(g, stash.id)[0]);
  const credits = s.server.credits, done = FP.progressOf(s).done, out = FP.go(s, stash.id);
  assert.equal(s.server.credits - credits, 4 + Math.floor((loc.level || 1) / 2));
  assert.ok(out.some((e) => e.type === 'rooms-good' && /^Stash: \+\d+ credits/.test(e.message)), 'a short notice');
  assert.equal(FP.progressOf(s).done, done + 1, 'Rooms n/N counts it when first taken');
  assert.equal(FP.cacheFull(s, stash), false);
  clock += 3 * 3600000;
  assert.equal(FP.cacheFull(s, stash), false, 'no timer: it waits for the reboot');
  FP.go(s, FP.neighbours(g, stash.id)[0]); const c2 = s.server.credits; FP.go(s, stash.id);
  assert.equal(s.server.credits, c2, 'nothing the second time');
  assert.doesNotMatch(roomsMarkup(s), /undefined|NaN/);
  play(s, 'jack out');
  // A reboot (the full clear's, or the idle one) fills it.
  loc.rogueRun.rebootAt = clock; clock += 1; loc.lockUntil = 0;
  connect(s, loc);
  assert.ok(FP.cacheFull(s, stash), 'full again');
});

test('the Mule runs to the neighbour farthest from you, never into your room or a room a live virus holds; with nowhere farther it is cornered and stays', () => {
  const { s, loc } = rogueSave();
  connect(s, loc);
  const R = s.rooms, g = R.graph;
  clearAll(loc);
  // A room with two or more neighbours besides the one you're in: you next door, the Mule in it.
  const hub = FP.roomList(s).find((r) => r.id !== g.entry && FP.neighbours(g, r.id).length >= 3);
  const you = FP.neighbours(g, hub.id)[0];
  place(s, you);
  const m = mule(s, hub.id);
  const d = FP.distances(g, you), cands = FP.neighbours(g, hub.id).filter((x) => x !== you && d[x] > d[hub.id]);
  const best = cands.sort((a, b) => d[b] - d[a] || Number(a.slice(1)) - Number(b.slice(1)))[0];
  assert.equal(FP.muleNext(s), best, 'the farthest neighbour');
  // A live virus in that room: it can't go there.
  const room = g.rooms[best];
  if (room.wild) { loc.spawns[room.path0].alive = true; assert.notEqual(FP.muleNext(s), best, 'never through a live virus'); loc.spawns[room.path0].alive = false; }
  // Wait a move: it runs.
  FP.wait(s);
  assert.equal(m.at, best);
  // A leaf, you next door: nowhere farther. Cornered, it stays.
  const leaf = FP.roomList(s).find((r) => r.id !== g.entry && FP.neighbours(g, r.id).length === 1);
  place(s, FP.neighbours(g, leaf.id)[0]);
  mule(s, leaf.id);
  assert.equal(FP.muleNext(s), null, 'cornered');
  FP.wait(s);
  assert.equal(R.visit.mule.at, leaf.id, 'it stays');
  assert.ok(R.visit.mule.cornered);
  assert.match(FP.muleLine(s), /cornered/);
  // Walled in: its only way out held by a live virus.
  const inner = FP.roomList(s).find((r) => r.wild && FP.neighbours(g, r.id).length >= 2 && FP.neighbours(g, r.id).some((n) => g.rooms[n].wild));
  if (inner) {
    const out = FP.neighbours(g, inner.id).find((n) => g.rooms[n].wild), back = FP.neighbours(g, inner.id).find((n) => n !== out);
    clearAll(loc, FP.neighbours(g, inner.id).filter((n) => n !== back && g.rooms[n].wild).map((n) => g.rooms[n].path0));
    place(s, back); mule(s, inner.id);
    const nx = FP.muleNext(s);
    assert.ok(!nx || !FP.isUp(s, g.rooms[nx]), 'never through a live virus');
  }
});

test('walking into its room starts a short fight: a weak, quick MULE-####; still up after 6 cycles it escapes, and you stay on the server', () => {
  const { s, loc } = rogueSave();
  connect(s, loc);
  const R = s.rooms, g = R.graph;
  clearAll(loc);
  const leaf = FP.roomList(s).find((r) => r.id !== g.entry && FP.neighbours(g, r.id).length === 1);
  const door = FP.neighbours(g, leaf.id)[0];
  place(s, door);
  const m = mule(s, leaf.id);
  FP.go(s, leaf.id);
  assert.ok(active(s), 'the fight');
  const e = s.encounter;
  assert.equal(e.rooms.as, 'mule');
  assert.equal(e.virus.family, 'mule');
  assert.match(e.virus.name, /^MULE-\d{4}$/);
  assert.equal(e.virus.parts.length, 2, 'one or two parts');
  assert.ok(e.virus.parts.every((p) => p.maxArmor <= 1), 'a runner wears 1 ◆ at most');
  assert.equal(e.escapeAt, M.escape);
  assert.equal(e.roomsXp, FP.ROOMS.xp.room, 'a process kill\'s XP, no more');
  assert.equal(e.virus.level, loc.level, 'the server\'s level');
  assert.match(boardMarkup(s, null), /Escapes in 6/, 'the countdown on the board');
  command(s, 'hold'); resolveCycle(s);
  assert.match(boardMarkup(s, null), /Escapes in 5/);
  for (let i = 0; i < 10 && active(s); i++) { command(s, 'hold'); resolveCycle(s); }
  assert.equal(e.phase, 'escaped');
  assert.equal(e.cycle, M.escape, 'after 6 cycles');
  assert.ok(s.logs.some((x) => x.type === 'escaped'));
  FP.settle(s);
  assert.equal(m.state, 'gone', 'gone for the run');
  assert.ok(s.run && R.at === leaf.id, 'still on the server, in its room');
  assert.equal(FP.muleOf(s), null);
});

test('break it in time: its bag pays 10 Stashes of credits and an item at the server\'s level, once', () => {
  const { s, loc } = rogueSave();
  connect(s, loc);
  const R = s.rooms, g = R.graph;
  clearAll(loc);
  const leaf = FP.roomList(s).find((r) => r.id !== g.entry && FP.neighbours(g, r.id).length === 1);
  place(s, FP.neighbours(g, leaf.id)[0]);
  const m = mule(s, leaf.id);
  const credits = s.server.credits, stash = s.stash.length;
  FP.go(s, leaf.id);
  kill(s);
  assert.equal(m.state, 'down');
  assert.equal(s.server.credits - credits >= M.credits * (4 + Math.floor(loc.level / 2)), true, 'about 10 Stashes');
  assert.ok(s.logs.some((e) => /^The bag: \+\d+ credits, /.test(e.message)), 'the bag, said');
  assert.equal(s.stash.length, stash + 1, 'one item');
  const it = s.stash.at(-1);
  assert.equal(it.level, loc.level, 'at the server\'s level');
  assert.equal(FP.muleOf(s), null);
});

test('its item never beats an elite\'s: the best of two plain rolls (a white otherwise), against an elite\'s three and blue floor', () => {
  const s = fresh(); s.rng = 99;
  let mule = 0, elite = 0, blues = 0;
  const rank = (it) => (it ? RARITY_ORDER.indexOf(it.rarity) : -1);
  for (let i = 0; i < 400; i++) {
    const m = rollDrop(s, { kind: 'rogue', id: 'nest', layer: 2, rolls: M.rolls, flat: true }, 12);
    mule += Math.max(rank(m), RARITY_ORDER.indexOf('stock'));
    if (rank(m) >= RARITY_ORDER.indexOf('tuned')) blues++;
    elite += rank(rollDrop(s, { kind: 'rogue', id: 'pit', layer: 2, elite: true, rolls: ELITE.rolls }, 12));
  }
  assert.ok(mule < elite, `${mule} < ${elite}`);
  assert.ok(blues < 400 * 0.5, 'never a guaranteed blue');
  assert.ok(M.unique <= 0.05 && ELITE.rolls > M.rolls);
  // A loud run or a clean read adds a roll to a kill, never to its bag.
  s.encounter = { virus: { hot: true }, phase: 'victory', cleanRead: true };
  let more = 0; for (let i = 0; i < 400; i++) more += rank(rollDrop(s, { kind: 'rogue', rolls: 2, flat: true }, 12)) >= 0 ? 1 : 0;
  let base = 0; s.encounter = null; for (let i = 0; i < 400; i++) base += rank(rollDrop(s, { kind: 'rogue', rolls: 2, flat: true }, 12)) >= 0 ? 1 : 0;
  assert.ok(Math.abs(more - base) < 40, `${more} vs ${base}: flat`);
});

test('the roll: once a run, at its first connect; reconnecting mid-run never rolls again; a new roll takes a full clear and its reboot', () => {
  const { s, loc } = rogueSave();
  connect(s, loc, 1);
  assert.ok(FP.muleOf(s), 'a Mule this run');
  assert.equal(s.mule.n, 1);
  assert.match(FP.muleOf(s).name, /^MULE-\d{4}$/);
  play(s, 'jack out');
  assert.equal(loc.floorplan.visit.mule.state, 'gone', 'jacking out ends it');
  loc.lockUntil = 0;
  connect(s, loc, 1);
  assert.equal(FP.muleOf(s), null, 'reconnecting mid-run rolls nothing');
  play(s, 'jack out');
  // Past the cooldown, still the same run: nothing.
  clock += M.cooldownMs + 1; loc.lockUntil = 0;
  connect(s, loc, 1);
  assert.equal(FP.muleOf(s), null, 'one roll a run');
  // The full clear: reboot, a new run, a new roll.
  clearAll(loc, [rogueRooms(loc)[0]]);
  const g = s.rooms.graph, last = FP.roomList(s).find((r) => r.path0 === rogueRooms(loc)[0]);
  const way = FP.pathTo(g, s.rooms.at, last.id);
  for (const id of way.slice(1)) FP.go(s, id);
  play(s, 'engage'); kill(s);
  assert.equal(s.run, null, 'rebooting');
  clock += ROGUE.rebootMs;
  connect(s, loc, 1);
  assert.ok(FP.muleOf(s), 'a new run rolls again');
  assert.equal(s.mule.n, 2);
});

test('the cooldown is yours, on your save: 45 minutes across every rogue server you visit, and a reload or a jack out never rerolls', () => {
  const { s, loc } = rogueSave();
  let other = null;
  for (let i = 0; i < 60 && !other; i++) { (s.net ||= {}).rogueDry = ROGUE.pity; command(s, 'developer location worm'); const l = s.locations.at(-1); if (l.rogue && !l.farm && l !== loc) other = l; }
  other.lockUntil = 0;
  connect(s, loc, 1);
  assert.ok(FP.muleOf(s));
  const at = s.mule.at;
  assert.equal(at, clock);
  // Mid-chase, a reload: the same Mule, the same cooldown.
  const back = restore(JSON.parse(JSON.stringify(s)));
  assert.equal(back.mule.at, at, 'the cooldown is on the save');
  play(s, 'jack out');
  clock += 10 * 60000;
  connect(s, other, 1);
  assert.equal(FP.muleOf(s), null, 'another rogue server, inside the cooldown: no Mule');
  assert.ok(other.rogueRun.rolled, 'and its run had its roll');
  play(s, 'jack out');
  // Its run left half done reboots on its own 30 minutes after you left: a new run, still inside the cooldown.
  other.spawns[rogueRooms(other)[0]].alive = false;
  clock += ROGUE.idleMs + 1; other.lockUntil = 0;
  assert.ok(clock < at + M.cooldownMs);
  const n = other.rogueRun.n;
  connect(s, other, 1);
  assert.equal(other.rogueRun.n, n + 1, 'the idle reboot: a new run');
  assert.equal(FP.muleOf(s), null, 'the cooldown still holds');
  play(s, 'jack out');
  // Past the cooldown, the next new run rolls.
  clock = at + M.cooldownMs + 1;
  other.spawns[rogueRooms(other)[0]].alive = false; other.rogueRun.leftAt = clock - ROGUE.idleMs - 1; other.lockUntil = 0;
  connect(s, other, 1);
  assert.ok(FP.muleOf(s), 'past 45 minutes: a Mule');
});

test('jacking out mid-chase or mid-fight ends the Mule for the run, and its cooldown still runs', () => {
  const { s, loc } = rogueSave();
  connect(s, loc, 1);
  const R = s.rooms, g = R.graph;
  clearAll(loc);
  const leaf = FP.roomList(s).find((r) => r.id !== g.entry && FP.neighbours(g, r.id).length === 1);
  place(s, FP.neighbours(g, leaf.id)[0]);
  R.visit.mule.at = leaf.id;
  FP.go(s, leaf.id);
  assert.ok(active(s) && s.encounter.rooms.as === 'mule');
  play(s, 'jack out'); // mid-fight: the emergency escape
  for (let i = 0; i < 3 && active(s); i++) resolveCycle(s);
  assert.equal(s.run, null, 'out');
  assert.notEqual(R.visit.mule?.state, 'loose');
  clock += 60000; loc.lockUntil = 0;
  connect(s, loc, 1);
  assert.equal(FP.muleOf(s), null, 'gone for the run');
  assert.ok(clock < s.mule.at + M.cooldownMs, 'its cooldown runs on');
});

test('a crewmate in your fight never gets a Mule or a cooldown of its own, and no second Mule; another player\'s cooldown is theirs', () => {
  const { s, loc } = rogueSave();
  play(s, 'crew sim bastion');
  connect(s, loc, 1);
  const R = s.rooms, g = R.graph;
  clearAll(loc);
  const leaf = FP.roomList(s).find((r) => r.id !== g.entry && FP.neighbours(g, r.id).length === 1);
  place(s, FP.neighbours(g, leaf.id)[0]);
  for (const c of Object.values(s.run.crew || {})) c.cwd = R.graph.rooms[R.at].path;
  R.visit.mule.at = leaf.id;
  FP.go(s, leaf.id);
  assert.ok(active(s));
  kill(s);
  assert.equal(s.mule.n, 1, 'one Mule');
  for (const m of matesOf(s)) assert.equal(m.mule, undefined, `${m.who}: no cooldown of its own`);
  assert.equal(FP.muleOf(s), null);
  // Another player (their own save) on their own rogue server: your Mule never touches theirs.
  const { s: t, loc: theirs } = rogueSave();
  connect(t, theirs, 1);
  assert.ok(FP.muleOf(t), 'they roll their own');
});

test('developer mule is a dev command: the engine spawns one, the page only passes it with ?dev', () => {
  const { s, loc } = rogueSave();
  connect(s, loc);
  assert.equal(FP.muleOf(s), null);
  clearAll(loc);
  const out = play(s, 'developer mule');
  assert.ok(FP.muleOf(s), out.map((e) => e.message).join(' '));
  const app = readFileSync('./dist/app.js', 'utf8');
  assert.match(app, /if \(\/\^\(developer\( \|\$\)/, 'developer commands are dev only');
});

test('the map: the Mule\'s gold sack where you can see it, an amber arrow to where it runs, filled gold once it can\'t; its tip and its Codex row', () => {
  const { s, loc } = rogueSave();
  connect(s, loc);
  const R = s.rooms, g = R.graph;
  clearAll(loc);
  for (const r of FP.roomList(s)) R.seen[r.id] = 'kind';
  const hub = FP.roomList(s).find((r) => r.id !== g.entry && FP.neighbours(g, r.id).length >= 2 && FP.neighbours(g, r.id).some((n) => n !== g.entry));
  place(s, FP.neighbours(g, hub.id)[0]);
  mule(s, hub.id);
  let html = roomsMarkup(s);
  assert.match(html, /class="fp-mule"/, 'its glyph');
  if (FP.muleNext(s)) assert.match(html, /class="fp-route mule"/, 'its arrow');
  assert.match(html, /fp-mulestat/, 'on the strip');
  assert.doesNotMatch(html, /undefined|NaN/);
  const leaf = FP.roomList(s).find((r) => r.id !== g.entry && FP.neighbours(g, r.id).length === 1);
  place(s, FP.neighbours(g, leaf.id)[0]); mule(s, leaf.id);
  html = roomsMarkup(s);
  assert.match(html, /class="fp-mule cornered"/, 'cornered: its badge filled');
  assert.match(html, /Mule<\/span><b>cornered/, 'and the strip says so');
  assert.doesNotMatch(html, /fp-route mule/);
  const tip = TIPS.find((x) => x.id === 'mule');
  assert.ok(tip && tip.text.length <= 200 && tip.page === 'rooms' && tip.at === '.fp-mule');
  // The Codex: its own row (Runners), ??? until met; its parts research like any other.
  assert.ok(ROOM_FAMILIES.mule.runner);
  const row = entries(fresh()).find((x) => x.id === 'runner').rows[0];
  assert.equal(row.name, null, '??? until met');
  s.met = { ...(s.met || {}), mule: true };
  const e = entryOf(s, 'runner:mule');
  assert.equal(e.name, 'Mule');
  assert.equal(e.parts.length, 2);
  assert.match(e.rule, /escapes after 6 cycles/);
});

test('an old save\'s rogue server gains its quiet rooms on load, its fight rooms on the same ids, what you cleared kept', () => {
  const { s, loc } = rogueSave();
  connect(s, loc);
  play(s, 'jack out');
  // As it was laid out before: its folders around the entry.
  const old = treeGraph(rogueRooms(loc), { seed: loc.seed || 1 });
  loc.floorplan.graph = old;
  const ids = Object.keys(old.rooms), cleared = { [ids[1]]: clock, [ids[2]]: clock };
  loc.floorplan.cleared = { ...cleared, r0: clock };
  const back = restore(JSON.parse(JSON.stringify(s)));
  const L = back.locations.find((l) => l.id === loc.id), g = L.floorplan.graph;
  assert.ok(g.quiet, 'laid out again');
  const quiet = Object.values(g.rooms).filter((r) => quietKinds.includes(r.kind));
  assert.ok(quiet.length >= 2 && quiet.length <= 4);
  for (const id of ids) { assert.equal(g.rooms[id].path0, old.rooms[id].path0, `${id} keeps its folder`); assert.equal(g.rooms[id].path, old.rooms[id].path, `${id} keeps its name`); }
  for (const id of Object.keys(cleared)) assert.ok(L.floorplan.cleared[id], `${id} still cleared`);
  assert.ok(quiet.every((r) => !L.floorplan.cleared[r.id]), 'the quiet rooms to find');
  // Twice is the same as once.
  const g2 = JSON.stringify(g); rogueRestore(back); assert.equal(JSON.stringify(L.floorplan.graph), g2);
});
