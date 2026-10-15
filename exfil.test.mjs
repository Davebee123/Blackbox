// Quiet rooms and the Exfil (GAME_RULES.md "Rogue servers", docs/servers.md 9.6, 9.7): a rogue server's rooms are a tree from
// its seed with 2 to 4 quiet rooms woven in (Empty, and Stash: a few credits), it runs in clears (a cleared room stays
// down until the full clear reboots it), and each run rolls once for the Exfil, a process smuggling a stolen archive
// out that runs from you, on a cooldown of your own. floorplan.mjs (the Exfil's moves and fight), netrooms.mjs (the
// rooms, the roll, the archive, the old save's Mule carried over),
// rogue.mjs (runs and reboots).
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
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
import { entries, entryOf, GROUPS } from './dist/codex.mjs';
import { RARITY_ORDER } from './dist/gear.mjs';
import { ELITE } from './dist/data.mjs';
import { rollDrop, rand } from './dist/combat.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false;
let clock = 1_700_000_000_000;
hooks.now = () => clock;
const M = CONFIG.exfil, CHANCE = M.chance;
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
const exfil = (s, at) => { const R = s.rooms; R.visit.exfil = { at, seed: 4242, name: 'EXFIL-4242', state: 'loose', seen: true, cornered: false }; return R.visit.exfil; };

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

test('the Exfil runs to the neighbour farthest from you, never into your room or a room a live virus holds; with nowhere farther it is cornered and stays', () => {
  const { s, loc } = rogueSave();
  connect(s, loc);
  const R = s.rooms, g = R.graph;
  clearAll(loc);
  // A room with two or more neighbours besides the one you're in: you next door, the Exfil in it.
  const hub = FP.roomList(s).find((r) => r.id !== g.entry && FP.neighbours(g, r.id).length >= 3);
  const you = FP.neighbours(g, hub.id)[0];
  place(s, you);
  const m = exfil(s, hub.id);
  const d = FP.distances(g, you), cands = FP.neighbours(g, hub.id).filter((x) => x !== you && d[x] > d[hub.id]);
  const best = cands.sort((a, b) => d[b] - d[a] || Number(a.slice(1)) - Number(b.slice(1)))[0];
  assert.equal(FP.exfilNext(s), best, 'the farthest neighbour');
  // A live virus in that room: it can't go there.
  const room = g.rooms[best];
  if (room.wild) { loc.spawns[room.path0].alive = true; assert.notEqual(FP.exfilNext(s), best, 'never through a live virus'); loc.spawns[room.path0].alive = false; }
  // Wait a move: it runs.
  FP.wait(s);
  assert.equal(m.at, best);
  // A leaf, you next door: nowhere farther. Cornered, it stays.
  const leaf = FP.roomList(s).find((r) => r.id !== g.entry && FP.neighbours(g, r.id).length === 1);
  place(s, FP.neighbours(g, leaf.id)[0]);
  exfil(s, leaf.id);
  assert.equal(FP.exfilNext(s), null, 'cornered');
  FP.wait(s);
  assert.equal(R.visit.exfil.at, leaf.id, 'it stays');
  assert.ok(R.visit.exfil.cornered);
  assert.match(FP.exfilLine(s), /cornered/);
  // Walled in: its only way out held by a live virus.
  const inner = FP.roomList(s).find((r) => r.wild && FP.neighbours(g, r.id).length >= 2 && FP.neighbours(g, r.id).some((n) => g.rooms[n].wild));
  if (inner) {
    const out = FP.neighbours(g, inner.id).find((n) => g.rooms[n].wild), back = FP.neighbours(g, inner.id).find((n) => n !== out);
    clearAll(loc, FP.neighbours(g, inner.id).filter((n) => n !== back && g.rooms[n].wild).map((n) => g.rooms[n].path0));
    place(s, back); exfil(s, inner.id);
    const nx = FP.exfilNext(s);
    assert.ok(!nx || !FP.isUp(s, g.rooms[nx]), 'never through a live virus');
  }
});

test('walking into its room starts a short fight: a weak, quick EXFIL-####; still up after 6 cycles it escapes, and you stay on the server', () => {
  const { s, loc } = rogueSave();
  connect(s, loc);
  const R = s.rooms, g = R.graph;
  clearAll(loc);
  const leaf = FP.roomList(s).find((r) => r.id !== g.entry && FP.neighbours(g, r.id).length === 1);
  const door = FP.neighbours(g, leaf.id)[0];
  place(s, door);
  const m = exfil(s, leaf.id);
  FP.go(s, leaf.id);
  assert.ok(active(s), 'the fight');
  const e = s.encounter;
  assert.equal(e.rooms.as, 'exfil');
  assert.equal(e.virus.family, 'exfil');
  assert.match(e.virus.name, /^EXFIL-\d{4}$/);
  assert.equal(e.virus.parts.length, 2, 'one or two parts');
  assert.ok(e.virus.parts.every((p) => p.maxArmor <= 1), 'a runner wears 1 ◆ at most');
  assert.equal(e.escapeAt, M.escape);
  assert.equal(e.roomsXp, FP.ROOMS.xp.room, 'a process kill\'s XP, no more');
  assert.equal(e.virus.level, loc.level, 'the server\'s level');
  assert.deepEqual(e.virus.parts.map((p) => p.name), ['Uplink', 'Archive'], 'its Uplink and its Archive');
  assert.match(boardMarkup(s, null), /class="esc-left">Upload 0\/6</, 'the upload on the board');
  assert.match(boardMarkup(s, null), /class="ps-esc"[^>]*>Upload 0\/6</, 'and on the phone strip');
  command(s, 'hold'); resolveCycle(s);
  assert.match(boardMarkup(s, null), /Upload 1\/6/);
  assert.doesNotMatch(boardMarkup(s, null), /Escapes|bag|Mule/i);
  for (let i = 0; i < 10 && active(s); i++) { command(s, 'hold'); resolveCycle(s); }
  assert.equal(e.phase, 'escaped');
  assert.equal(e.cycle, M.escape, 'after 6 cycles');
  assert.ok(s.logs.some((x) => x.type === 'escaped' && x.message === 'Upload complete. The archive is gone.'));
  FP.settle(s);
  assert.equal(m.state, 'gone', 'gone for the run');
  assert.ok(s.run && R.at === leaf.id, 'still on the server, in its room');
  assert.equal(FP.exfilOf(s), null);
});

test('break it in time: archive recovered, 10 Stashes of credits and 10 Stashes of credits and an item at the server\'s level, once', () => {
  const { s, loc } = rogueSave();
  connect(s, loc);
  const R = s.rooms, g = R.graph;
  clearAll(loc);
  const leaf = FP.roomList(s).find((r) => r.id !== g.entry && FP.neighbours(g, r.id).length === 1);
  place(s, FP.neighbours(g, leaf.id)[0]);
  const m = exfil(s, leaf.id);
  const credits = s.server.credits, stash = s.stash.length;
  FP.go(s, leaf.id);
  kill(s);
  assert.equal(m.state, 'down');
  assert.equal(s.server.credits - credits >= M.credits * (4 + Math.floor(loc.level / 2)), true, 'about 10 Stashes');
  assert.ok(s.logs.some((e) => /^The archive: \+\d+ credits, /.test(e.message)), 'the archive, said');
  assert.ok(s.logs.some((e) => /is down\. Archive recovered\.$/.test(e.message)), 'Archive recovered.');
  assert.equal(s.stash.length, stash + 1, 'one item');
  const it = s.stash.at(-1);
  assert.equal(it.level, loc.level, 'at the server\'s level');
  assert.equal(FP.exfilOf(s), null);
});

test('its item never beats an elite\'s: the best of two plain rolls (a white otherwise), against an elite\'s three and blue floor', () => {
  const s = fresh(); s.rng = 99;
  let exfil = 0, elite = 0, blues = 0;
  const rank = (it) => (it ? RARITY_ORDER.indexOf(it.rarity) : -1);
  for (let i = 0; i < 400; i++) {
    const m = rollDrop(s, { kind: 'rogue', id: 'nest', layer: 2, rolls: M.rolls, flat: true }, 12);
    exfil += Math.max(rank(m), RARITY_ORDER.indexOf('stock'));
    if (rank(m) >= RARITY_ORDER.indexOf('tuned')) blues++;
    elite += rank(rollDrop(s, { kind: 'rogue', id: 'pit', layer: 2, elite: true, rolls: ELITE.rolls }, 12));
  }
  assert.ok(exfil < elite, `${exfil} < ${elite}`);
  assert.ok(blues < 400 * 0.5, 'never a guaranteed blue');
  assert.ok(M.unique <= 0.05 && ELITE.rolls > M.rolls);
  // A loud run or a clean read adds a roll to a kill, never to its archive.
  s.encounter = { virus: { hot: true }, phase: 'victory', cleanRead: true };
  let more = 0; for (let i = 0; i < 400; i++) more += rank(rollDrop(s, { kind: 'rogue', rolls: 2, flat: true }, 12)) >= 0 ? 1 : 0;
  let base = 0; s.encounter = null; for (let i = 0; i < 400; i++) base += rank(rollDrop(s, { kind: 'rogue', rolls: 2, flat: true }, 12)) >= 0 ? 1 : 0;
  assert.ok(Math.abs(more - base) < 40, `${more} vs ${base}: flat`);
});

test('the roll: once a run, at its first connect; reconnecting mid-run never rolls again; a new roll takes a full clear and its reboot', () => {
  const { s, loc } = rogueSave();
  connect(s, loc, 1);
  assert.ok(FP.exfilOf(s), 'an Exfil this run');
  assert.equal(s.exfil.n, 1);
  assert.match(FP.exfilOf(s).name, /^EXFIL-\d{4}$/);
  play(s, 'jack out');
  assert.equal(loc.floorplan.visit.exfil.state, 'gone', 'jacking out ends it');
  loc.lockUntil = 0;
  connect(s, loc, 1);
  assert.equal(FP.exfilOf(s), null, 'reconnecting mid-run rolls nothing');
  play(s, 'jack out');
  // Past the cooldown, still the same run: nothing.
  clock += M.cooldownMs + 1; loc.lockUntil = 0;
  connect(s, loc, 1);
  assert.equal(FP.exfilOf(s), null, 'one roll a run');
  // The full clear: reboot, a new run, a new roll.
  clearAll(loc, [rogueRooms(loc)[0]]);
  const g = s.rooms.graph, last = FP.roomList(s).find((r) => r.path0 === rogueRooms(loc)[0]);
  const way = FP.pathTo(g, s.rooms.at, last.id);
  for (const id of way.slice(1)) FP.go(s, id);
  play(s, 'engage'); kill(s);
  assert.equal(s.run, null, 'rebooting');
  clock += ROGUE.rebootMs;
  connect(s, loc, 1);
  assert.ok(FP.exfilOf(s), 'a new run rolls again');
  assert.equal(s.exfil.n, 2);
});

test('the cooldown is yours, on your save: 45 minutes across every rogue server you visit, and a reload or a jack out never rerolls', () => {
  const { s, loc } = rogueSave();
  let other = null;
  for (let i = 0; i < 60 && !other; i++) { (s.net ||= {}).rogueDry = ROGUE.pity; command(s, 'developer location worm'); const l = s.locations.at(-1); if (l.rogue && !l.farm && l !== loc) other = l; }
  other.lockUntil = 0;
  connect(s, loc, 1);
  assert.ok(FP.exfilOf(s));
  const at = s.exfil.at;
  assert.equal(at, clock);
  // Mid-chase, a reload: the same Exfil, the same cooldown.
  const back = restore(JSON.parse(JSON.stringify(s)));
  assert.equal(back.exfil.at, at, 'the cooldown is on the save');
  play(s, 'jack out');
  clock += 10 * 60000;
  connect(s, other, 1);
  assert.equal(FP.exfilOf(s), null, 'another rogue server, inside the cooldown: no Exfil');
  assert.ok(other.rogueRun.rolled, 'and its run had its roll');
  play(s, 'jack out');
  // Its run left half done reboots on its own 30 minutes after you left: a new run, still inside the cooldown.
  other.spawns[rogueRooms(other)[0]].alive = false;
  clock += ROGUE.idleMs + 1; other.lockUntil = 0;
  assert.ok(clock < at + M.cooldownMs);
  const n = other.rogueRun.n;
  connect(s, other, 1);
  assert.equal(other.rogueRun.n, n + 1, 'the idle reboot: a new run');
  assert.equal(FP.exfilOf(s), null, 'the cooldown still holds');
  play(s, 'jack out');
  // Past the cooldown, the next new run rolls.
  clock = at + M.cooldownMs + 1;
  other.spawns[rogueRooms(other)[0]].alive = false; other.rogueRun.leftAt = clock - ROGUE.idleMs - 1; other.lockUntil = 0;
  connect(s, other, 1);
  assert.ok(FP.exfilOf(s), 'past 45 minutes: an Exfil');
});

test('jacking out mid-chase or mid-fight ends the Exfil for the run, and its cooldown still runs', () => {
  const { s, loc } = rogueSave();
  connect(s, loc, 1);
  const R = s.rooms, g = R.graph;
  clearAll(loc);
  const leaf = FP.roomList(s).find((r) => r.id !== g.entry && FP.neighbours(g, r.id).length === 1);
  place(s, FP.neighbours(g, leaf.id)[0]);
  R.visit.exfil.at = leaf.id;
  FP.go(s, leaf.id);
  assert.ok(active(s) && s.encounter.rooms.as === 'exfil');
  play(s, 'jack out'); // mid-fight: the emergency escape
  for (let i = 0; i < 3 && active(s); i++) resolveCycle(s);
  assert.equal(s.run, null, 'out');
  assert.notEqual(R.visit.exfil?.state, 'loose');
  clock += 60000; loc.lockUntil = 0;
  connect(s, loc, 1);
  assert.equal(FP.exfilOf(s), null, 'gone for the run');
  assert.ok(clock < s.exfil.at + M.cooldownMs, 'its cooldown runs on');
});

test('a crewmate in your fight never gets an Exfil or a cooldown of its own, and no second Exfil; another player\'s cooldown is theirs', () => {
  const { s, loc } = rogueSave();
  play(s, 'crew sim bastion');
  connect(s, loc, 1);
  const R = s.rooms, g = R.graph;
  clearAll(loc);
  const leaf = FP.roomList(s).find((r) => r.id !== g.entry && FP.neighbours(g, r.id).length === 1);
  place(s, FP.neighbours(g, leaf.id)[0]);
  for (const c of Object.values(s.run.crew || {})) c.cwd = R.graph.rooms[R.at].path;
  R.visit.exfil.at = leaf.id;
  FP.go(s, leaf.id);
  assert.ok(active(s));
  kill(s);
  assert.equal(s.exfil.n, 1, 'one Exfil');
  for (const m of matesOf(s)) assert.equal(m.exfil, undefined, `${m.who}: no cooldown of its own`);
  assert.equal(FP.exfilOf(s), null);
  // Another player (their own save) on their own rogue server: your Exfil never touches theirs.
  const { s: t, loc: theirs } = rogueSave();
  connect(t, theirs, 1);
  assert.ok(FP.exfilOf(t), 'they roll their own');
});

test('developer exfil is a dev command: the engine spawns one, the page only passes it with ?dev', () => {
  const { s, loc } = rogueSave();
  connect(s, loc);
  assert.equal(FP.exfilOf(s), null);
  clearAll(loc);
  const out = play(s, 'developer exfil');
  assert.ok(FP.exfilOf(s), out.map((e) => e.message).join(' '));
  const app = readFileSync('./dist/app.js', 'utf8');
  assert.match(app, /if \(\/\^\(developer\( \|\$\)/, 'developer commands are dev only');
});

test('the map: the Exfil\'s gold archive where you can see it, an amber arrow to where it runs, filled gold once it can\'t; its tip and its Codex row', () => {
  const { s, loc } = rogueSave();
  connect(s, loc);
  const R = s.rooms, g = R.graph;
  clearAll(loc);
  for (const r of FP.roomList(s)) R.seen[r.id] = 'kind';
  const hub = FP.roomList(s).find((r) => r.id !== g.entry && FP.neighbours(g, r.id).length >= 2 && FP.neighbours(g, r.id).some((n) => n !== g.entry));
  place(s, FP.neighbours(g, hub.id)[0]);
  exfil(s, hub.id);
  let html = roomsMarkup(s);
  assert.match(html, /class="fp-exfil"/, 'its glyph');
  if (FP.exfilNext(s)) assert.match(html, /class="fp-route exfil"/, 'its arrow');
  assert.match(html, /fp-exfilstat/, 'on the strip');
  assert.doesNotMatch(html, /undefined|NaN/);
  const leaf = FP.roomList(s).find((r) => r.id !== g.entry && FP.neighbours(g, r.id).length === 1);
  place(s, FP.neighbours(g, leaf.id)[0]); exfil(s, leaf.id);
  html = roomsMarkup(s);
  assert.match(html, /class="fp-exfil cornered"/, 'cornered: its badge filled');
  assert.match(html, /Exfil<\/span><b>cornered/, 'and the strip says so');
  assert.doesNotMatch(html, /fp-route exfil/);
  const tip = TIPS.find((x) => x.id === 'exfil');
  assert.ok(tip && tip.text.length <= 200 && tip.page === 'rooms' && tip.at === '.fp-exfil');
  // The Codex: its own row (Exfils), ??? until met; its parts research like any other.
  assert.ok(ROOM_FAMILIES.exfil.runner);
  const row = entries(fresh()).find((x) => x.id === 'runner').rows[0];
  assert.equal(row.name, null, '??? until met');
  s.met = { ...(s.met || {}), exfil: true };
  const e = entryOf(s, 'runner:exfil');
  assert.equal(e.name, 'Exfil');
  assert.equal(e.parts.length, 2);
  assert.match(e.rule, /upload completes after 6 cycles/);
  assert.equal(GROUPS.find((x) => x.id === 'runner').name, 'Exfils');
  assert.match(html, /href="#fp-i-archive"/, 'an archive with an upload arrow, not a sack');
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

// The fog (fog.test.mjs): an Exfil shows in your room, a room next to you (known or not) and a discovered room.
test('the Exfil shows next to you, in a room you have never been in too, and in a discovered room from afar; deeper in the fog it is out of sight', () => {
  const { s, loc } = rogueSave();
  connect(s, loc);
  const R = s.rooms, g = R.graph;
  clearAll(loc);
  // A room two or more off the entry: you next to it, then two off, its room never discovered.
  const d0 = FP.distances(g, g.entry), deep = FP.roomList(s).find((r) => d0[r.id] >= 2);
  const door = FP.neighbours(g, deep.id).find((x) => d0[x] < d0[deep.id]);
  R.seen = {}; place(s, door);
  const m = exfil(s, deep.id);
  assert.equal(FP.known(s, deep.id), false);
  assert.equal(FP.exfilSeen(s, m), true, 'next to you');
  let html = roomsMarkup(s);
  assert.match(html, /class="fp-exfil( cornered)?"/, 'its glyph on the ? chip');
  assert.match(html, /fp-exfilstat/);
  assert.doesNotMatch(FP.exfilLine(s), new RegExp(g.rooms[deep.id].path), 'never names a room you have not been in');
  assert.match(FP.exfilLine(s), /in an unknown room/);
  // Two off, unknown: out of sight, nothing on the map or the strip.
  const back = FP.neighbours(g, door).find((x) => x !== deep.id && FP.distances(g, x)[deep.id] === 2);
  assert.ok(back, 'a room two off the Exfil');
  {
    R.seen = {}; place(s, back);
    assert.equal(FP.exfilSeen(s, m), false, 'two off in the fog');
    html = roomsMarkup(s);
    assert.doesNotMatch(html, /class="fp-exfil|fp-exfilstat|fp-route exfil/);
    assert.equal(FP.exfilLine(s), '');
    // Discovered: seen from afar.
    R.seen[deep.id] = 'kind';
    assert.equal(FP.exfilSeen(s, m), true);
    assert.match(roomsMarkup(s), /class="fp-exfil/);
    assert.match(FP.exfilLine(s), new RegExp(`in ${g.rooms[deep.id].path}`));
  }
});

test('an old save\'s Mule is the Exfil: s.mule becomes s.exfil (the cooldown carries over), its Codex record, tip, a run\'s roll and a chase in flight with it', () => {
  const { s, loc } = rogueSave();
  connect(s, loc, 1);
  assert.ok(FP.exfilOf(s));
  const at = s.exfil.at;
  play(s, 'jack out');
  // As an old save had it.
  const old = JSON.parse(JSON.stringify(s));
  old.mule = old.exfil; delete old.exfil;
  old.met = { ...(old.met || {}), mule: true };
  old.research = { ...(old.research || {}), 'mule:runner': 4, 'mule:bag': 2 };
  (old.dex ||= {}).kills = { ...(old.dex.kills || {}), mule: 3 };
  old.settings.seen = { ...(old.settings.seen || {}), mule: 1 };
  const L = old.locations.find((l) => l.id === loc.id);
  L.rogueRun.mule = L.rogueRun.exfil; delete L.rogueRun.exfil;
  L.floorplan.visit.mule = { ...L.floorplan.visit.exfil, name: 'MULE-1234', state: 'loose' }; delete L.floorplan.visit.exfil;
  const back = restore(old);
  assert.equal(back.mule, undefined);
  assert.equal(back.exfil.at, at, 'the cooldown carries over');
  assert.equal(back.exfil.n, 1);
  assert.equal(back.met.exfil, true); assert.equal(back.met.mule, undefined);
  assert.equal(back.research['exfil:uplink'], 4); assert.equal(back.research['exfil:archive'], 2);
  assert.equal(back.research['mule:runner'], undefined);
  assert.equal(back.dex.kills.exfil, 3);
  assert.equal(back.settings.seen.exfil, 1);
  const B = back.locations.find((l) => l.id === loc.id);
  assert.ok(B.rogueRun.exfil && B.rogueRun.mule === undefined);
  assert.equal(B.floorplan.visit.exfil.name, 'EXFIL-1234');
  assert.equal(B.floorplan.visit.mule, undefined);
  // Inside the cooldown, still: no Exfil on the next run.
  const again = restore(JSON.parse(JSON.stringify(back)));
  assert.deepEqual(again.exfil, back.exfil, 'twice is once');
  B.rogueRun.rebootAt = clock; clock += 1; B.lockUntil = 0;
  connect(back, B, 1);
  assert.equal(FP.exfilOf(back), null, 'the carried cooldown still blocks');
});

test('no player-facing text says Mule, bag or sack: the chase, the fight, its end, the map, the board, the tip and the Codex', () => {
  const { s, loc } = rogueSave();
  connect(s, loc);
  const R = s.rooms, g = R.graph;
  clearAll(loc);
  const BAD = /\bmule|\bbag\b|\bsack\b|\bescapes in\b/i;
  const texts = [];
  for (const r of FP.roomList(s)) R.seen[r.id] = 'kind';
  const hub = FP.roomList(s).find((r) => r.id !== g.entry && FP.neighbours(g, r.id).length >= 2);
  place(s, FP.neighbours(g, hub.id)[0]);
  const x = exfil(s, hub.id); x.seen = false;
  play(s, 'developer exfil');
  texts.push(roomsMarkup(s), FP.exfilLine(s), play(s, 'ls').map((e) => e.message).join('\n'), play(s, 'map').map((e) => e.message).join('\n'));
  FP.wait(s);
  // Caught: the fight and its board; then once to its end, once broken.
  const leaf = FP.roomList(s).find((r) => r.id !== g.entry && FP.neighbours(g, r.id).length === 1);
  place(s, FP.neighbours(g, leaf.id)[0]); exfil(s, leaf.id);
  FP.go(s, leaf.id);
  assert.ok(active(s));
  texts.push(boardMarkup(s, null));
  for (let i = 0; i < 10 && active(s); i++) { command(s, 'hold'); resolveCycle(s); }
  FP.settle(s);
  place(s, FP.neighbours(g, leaf.id)[0]); exfil(s, leaf.id);
  FP.go(s, leaf.id); kill(s);
  texts.push(...s.logs.map((e) => e.message));
  texts.push(...TIPS.filter((t) => t.id === 'exfil').map((t) => t.text));
  const me = { ...fresh(), met: { exfil: true } };
  texts.push(JSON.stringify(entryOf(me, 'runner:exfil')), JSON.stringify(entries(me).find((e) => e.id === 'runner')), JSON.stringify(ROOM_FAMILIES.exfil));
  for (const t of texts) assert.doesNotMatch(t, BAD, t.slice(0, 200));
  assert.ok(s.logs.some((e) => e.message === 'Upload complete. The archive is gone.'));
  assert.ok(s.logs.some((e) => /Archive recovered\./.test(e.message)));
  // And none in the page's code: every string a player could read in dist/ (comments and the old save's migration aside).
  for (const f of readdirSync('./dist').filter((n) => /\.(mjs|js)$/.test(n))) {
    readFileSync(`./dist/${f}`, 'utf8').split('\n').forEach((line, i) => {
      const code = line.replace(/\/\/.*$/, '');
      if (/PART_NAMES|MULE-|'mule'|mule:/.test(code)) return;
      assert.doesNotMatch(code, /\bMule\b|\bsack\b|stolen bag|its bag|The bag/, `${f}:${i + 1}`);
    });
  }
});
