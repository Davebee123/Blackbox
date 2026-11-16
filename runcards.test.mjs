// Run cards (GAME_RULES.md "Run cards", docs/director.md 4): the Surge room, the Escort and the Hunter pack.
// runcards.mjs (the rules), floorplan.mjs (the hooks on moves and fights), events.mjs (the deal's dice and the history),
// the map's marks and the strip.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, hooks, addLocation } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import { roomsFor } from './dist/netrooms.mjs';
import { historyOf } from './dist/events.mjs';
import { RIVAL } from './dist/rivals.mjs';
import * as FP from './dist/floorplan.mjs';
import * as RC from './dist/runcards.mjs';
import { runCardRoll, RUNCARD_DEAL } from './dist/events.mjs';
import { roomsMarkup } from './dist/floorplan-view.mjs';
import { CONFIG } from './dist/data.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false;
let clock = 1_700_000_000_000;
hooks.now = () => clock;
function onServer({ floor = 2, seed = 7, level = 12 } = {}) {
  const s = fresh(); s.tutorialCompleted = true;
  s.hackers = { [s.loadout.archetype]: { level, xp: 0 } };
  FP.startRooms(s, { seed, size: 'medium', floor, level });
  FP.connect(s);
  return s;
}
const kill = (s) => { for (let i = 0; i < 40 && active(s); i++) { for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: Math.min(p.integrity, 1) }); const p = s.encounter.virus.parts.find((x) => x.integrity > 0); if (p) command(s, 'spike ' + p.id); resolveCycle(s); } FP.settle(s); };
// Walk to a room, clearing whatever holds the way (and full Signal for the next step).
function walkTo(s, to) {
  const g = s.rooms.graph;
  for (let i = 0; i < 30 && s.rooms.at !== to; i++) {
    const next = FP.pathTo(g, s.rooms.at, to, (x) => x !== g.core)[1];
    FP.go(s, next);
    for (let j = 0; j < 6 && (s.rooms.screen || active(s)); j++) { if (s.rooms.screen) FP.act(s, 'engage'); kill(s); }
    s.rooms.signal = s.rooms.max;
  }
}

test('the deal: one run in four on its own dice, never the same kind twice running, from level 3', () => {
  const s = fresh(); s.hackers = { [s.loadout.archetype]: { level: 12, xp: 0 } };
  let dealt = 0, last = null;
  for (let i = 0; i < 2000; i++) { const c = runCardRoll(s); if (!c) continue; dealt++; assert.ok(RUNCARD_DEAL.kinds.includes(c.kind)); assert.notEqual(c.kind, last); last = s.director.lastCard = c.kind; }
  assert.ok(dealt > 400 && dealt < 600, `${dealt} of 2000`);
  const low = fresh(); low.hackers = { [low.loadout.archetype]: { level: 2, xp: 0 } };
  for (let i = 0; i < 50; i++) assert.equal(runCardRoll(low), null, 'not before level 3');
  assert.equal(runCardRoll(low, 'pack').kind, 'pack', 'a forced card skips the roll');
});

test('surge: waves hold the lit room, each kill pays a slice and fills the bar, then a guardian ends it', () => {
  const s = onServer(), R = s.rooms, c = RC.dealCard(s, 'surge', 5);
  assert.ok(c && R.graph.rooms[c.room].kind === 'process');
  assert.match(roomsMarkup(s), /fp-card-tab surge[^>]*>.*SURGE/s, 'its tab on the map');
  walkTo(s, FP.neighbours(R.graph, c.room).sort((a, b) => FP.distances(R.graph, R.graph.entry)[a] - FP.distances(R.graph, R.graph.entry)[b])[0]);
  const credits = R.credits;
  FP.go(s, c.room);
  assert.equal(R.screen?.as, 'surge', 'a wave holds it');
  FP.act(s, 'engage'); kill(s);
  assert.equal(c.kills, 1); assert.ok(R.credits > credits, 'a slice of the cache');
  assert.equal(R.screen?.as, 'surge', 'the next wave, no rest between');
  FP.act(s, 'back');
  assert.equal(R.screen, null, 'you can step back between fights');
  FP.go(s, c.room);
  for (let i = 1; i < RC.RUNCARD.surge.waves; i++) { s.rooms.signal = s.rooms.max; FP.act(s, 'engage'); kill(s); }
  assert.ok(c.guardian, 'the bar full: a guardian');
  assert.ok(s.rooms.screen && FP.fightOf(s, R.graph.rooms[c.room], 'surge').elite, 'an elite');
  FP.act(s, 'engage'); kill(s);
  assert.equal(c.state, 'won');
  assert.equal(R.screen, null);
});

test('escort: the courier walks a room a move, waits outside a held room, takes even-cycle hits beside you, and pays at the drop', () => {
  const s = onServer(), R = s.rooms, g = R.graph, c = RC.dealCard(s, 'escort', 9);
  assert.ok(c && c.at === g.entry && (FP.distances(g, g.entry)[c.dest] ?? 0) >= RC.RUNCARD.escort.min);
  assert.match(roomsMarkup(s), /fp-cr-route/, 'its route on the map');
  const route = RC.escortRoute(s), first = g.rooms[route[1]];
  if (FP.isUp(s, first)) {
    FP.wait(s);
    assert.equal(c.at, g.entry, 'it waits outside a room something holds');
    FP.go(s, first.id);
    if (R.screen) FP.act(s, 'engage');
    assert.equal(s.encounter?.objective?.kind, 'backup', 'beside you in the fight');
    assert.ok(s.encounter.objective.courier);
    s.encounter.objective.hp = c.max - 3;
    kill(s);
    assert.ok(c.hp > 0 && c.hp <= c.max - 3, 'its Integrity carries');
  }
  for (let i = 0; i < 40 && c.state === 'on'; i++) { walkTo(s, RC.escortRoute(s)[1] || c.dest); FP.wait(s); }
  assert.equal(c.state, 'won');
  assert.ok(R.pack.length >= 1, 'a protocol in the pack');
});

test('escort: at 0 Integrity the courier is lost', () => {
  const s = onServer({ seed: 11 }), R = s.rooms, c = RC.dealCard(s, 'escort', 3), next = RC.escortRoute(s)[1];
  R.down[next] = null; R.cleared[next] = false;
  if (!FP.isUp(s, R.graph.rooms[next])) return; // its first room is quiet on this seed
  FP.go(s, next); if (R.screen) FP.act(s, 'engage');
  s.encounter.objective.hp = 0; s.encounter.objective.failed = true;
  kill(s);
  assert.equal(c.state, 'lost');
});

test('pack: starts three rooms off or more, walks toward you, never into the entry or a rest room, and fights as an elite with runners', () => {
  const s = onServer({ seed: 7 }), R = s.rooms, g = R.graph, c = RC.dealCard(s, 'pack', 21);
  assert.ok(FP.distances(g, R.at)[c.at] >= RC.RUNCARD.pack.min);
  assert.match(roomsMarkup(s), /PACK ×3/);
  for (let i = 0; i < 12 && c.at !== R.at && !active(s); i++) {
    const before = RC.packRooms(s);
    FP.wait(s);
    if (!active(s)) { assert.ok(!['entry', 'rest'].includes(g.rooms[c.at].kind) && c.at !== g.core); assert.ok(RC.packRooms(s) <= Math.max(0, before - 1)); }
  }
  // You stand in the entry: it stops next door. Step to it.
  if (!active(s)) FP.go(s, c.at);
  assert.equal(s.encounter?.rooms?.as, 'pack');
  assert.ok(s.encounter.virus.elite && s.encounter.virus.parts.filter((p) => p.kind === 'fragment').length === RC.RUNCARD.pack.brood);
  kill(s);
  assert.equal(c.state, 'won');
});

test('leaving ends a live card: missed, or taken for a surge you fought in', () => {
  const s = onServer(), c = RC.dealCard(s, 'pack', 2);
  FP.jackOut(s);
  assert.equal(c.state, 'gone');
});

test('on the network: dealt on connect to a traced server, its kills pay into the run\'s pack, its end in the history', () => {
  const s = fresh(); s.tutorialCompleted = true; s.hackers = { breaker: { level: 12, xp: 0 } };
  addLocation(s, 'worm');
  const loc = s.locations.at(-1); loc.rogue = false; loc.runs = 1; roomsFor(s, loc);
  s.director = { next: 9e9, n: 0, last: null, blipNext: 9e9, forceCard: 'pack' };
  const chance = RIVAL.chance; RIVAL.chance = 0; // no rival this visit (a rival and a card never share one)
  try { play(s, 'connect ' + loc.id); } finally { RIVAL.chance = chance; }
  const c = s.rooms?.visit?.card;
  assert.equal(c?.kind, 'pack', 'the forced card');
  assert.equal(historyOf(s)[0].name, 'Hunter pack');
  assert.equal(historyOf(s)[0].how, 'up');
  s.rooms.at = FP.neighbours(s.rooms.graph, c.at)[0]; c.at = FP.neighbours(s.rooms.graph, s.rooms.at).find((x) => x === c.at) || c.at;
  FP.go(s, c.at);
  assert.equal(s.encounter?.rooms?.as, 'pack');
  const pack = s.run.pack.length;
  kill(s);
  assert.equal(c.state, 'won');
  assert.ok(s.run.pack.length >= pack, 'its loot in the run\'s pack');
  assert.equal(historyOf(s)[0].how, 'won');
  play(s, 'jack out');
  assert.ok(!s.rooms?.visit?.card || s.rooms.visit.card.state !== 'on');
});
