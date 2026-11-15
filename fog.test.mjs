// Rooms are unknown until you discover them (GAME_RULES.md "Walking and fog"; floorplan.mjs look, known, inSight, fogRestore):
// the rooms next to you are discovered; one further is a "?" chip with nothing about it; once you've stood in or next
// to a room, it's discovered for good and shows everything from anywhere. The hunter and the Exfil show
// in your room, next to you and in a discovered room. Everywhere rooms show: the playtest, traced servers, SPRAWL-00,
// the farm; an old save keeps what it can't rule out.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, hooks, active, restore, command } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import { play } from './dist/run.mjs';
import * as FP from './dist/floorplan.mjs';
import { roomsMarkup, pickRoom } from './dist/floorplan-view.mjs';
import { openFarm } from './dist/rogue.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false;
CONFIG.exfil.chance = 0;
let clock = Date.UTC(2026, 0, 1);
hooks.now = () => clock;
function server({ cls = 'breaker', seed = 7, kind = 'Mailhub', size = 'medium', hunter = null } = {}) {
  const s = fresh();
  s.rng = seed * 7777;
  FP.outfit(s, { cls, level: 10, gearSeed: seed });
  FP.startRooms(s, { seed, kind, size, level: 10, hunter });
  FP.connect(s);
  return s;
}
const place = (s, id) => { s.rooms.at = id; s.rooms.visit.walked[id] = true; s.rooms.screen = null; FP.look(s); };
const wideOf = (html) => html.match(/<svg class="fp-svg wide"[\s\S]*?<\/svg>/)[0];
const chipOf = (html, id) => { const i = html.indexOf(`data-room="${id}"`); if (i < 0) return ''; const from = html.lastIndexOf('<g class="fp-room', i), rest = html.slice(i); const end = rest.search(/<g class="fp-room|<path class="fp-route|<g class="fp-bits|<\/svg>/); return html.slice(from, i + end); };
const tile = (s, id, ui) => chipOf(wideOf(roomsMarkup(s, ui)), id);
const pop = (html) => html.match(/<div class="map-pop fp-pop"[\s\S]*$/)?.[0] || '';
const UNKNOWN_CHIP = /fp-icon|fp-name|fp-plate|fp-tag|fp-live|fp-respawn|fp-hair/;

test('the rooms next to you are discovered, at their first-walk cost; one further, a ? chip with nothing else', () => {
  const s = server({ hunter: 'patrol' }), R = s.rooms, g = R.graph;
  const exits = FP.exits(s);
  assert.ok(exits.length >= 2);
  for (const x of exits) {
    assert.ok(FP.known(s, x.id), `${x.id}: discovered from next door`);
    assert.ok(!R.been[x.id], 'never been in');
    assert.equal(FP.moveCost(s, x), Math.round(R.max * FP.ROOMS.moveNew), 'still the new room\'s cost');
    const chip = tile(s, x.id);
    assert.doesNotMatch(chip, /k-fog/, 'its kind shows');
    assert.match(chip, new RegExp(`data-rooms="go" data-arg="${x.id}"`), 'one click walks in');
  }
  // Two off: a ghost, no kind, no name, no cost, and a ring it could have never shows.
  const d = FP.distances(g, R.at), two = FP.roomList(s).find((x) => d[x.id] === 2 && x.id !== g.core);
  assert.equal(FP.seenOf(s, two.id), 'shape');
  R.down[two.id] = clock; R.rare[two.id] = true;
  const chip = tile(s, two.id);
  assert.match(chip, /class="fp-room k-fog t-fog/, 'a ghost, no kind colour');
  assert.match(chip, /<text class="fp-q"[^>]*>\?<\/text>/, 'a ? for its name');
  assert.doesNotMatch(chip, UNKNOWN_CHIP, 'nothing about what it is');
  assert.doesNotMatch(chip, new RegExp(two.path.toUpperCase()), 'no name plate');
  assert.match(chip, /aria-label="Unknown room"/);
  assert.doesNotMatch(roomsMarkup(s), /undefined|NaN/);
});

test('a room out of reach you have never been in: clickable for its card, which has no cost; the Core is an unknown chip too', () => {
  const s = server(), R = s.rooms, g = R.graph, ui = { sel: null, selAt: null, closed: null };
  const far = FP.roomList(s).find((x) => FP.seenOf(s, x.id) && !FP.exits(s).some((e) => e.id === x.id) && x.id !== R.at);
  assert.ok(far);
  assert.match(tile(s, far.id), new RegExp(`data-fp-sel="${far.id}"`));
  assert.doesNotMatch(tile(s, far.id), /fp-cost/);
  pickRoom(s, far.id, ui);
  const card = pop(roomsMarkup(s, ui));
  assert.match(card, /<h1>Unknown room<\/h1>/);
  assert.doesNotMatch(card, /costs|Signal/);
  assert.equal(FP.seenOf(s, g.core), 'shape');
  assert.doesNotMatch(tile(s, g.core), /SEALED|fp-icon|CORE/);
});

test('walking into a room that holds a virus stops you at the door: Engage or Step back, never a fight by itself', () => {
  const s = server(), R = s.rooms;
  const fight = FP.exits(s).find((x) => FP.FIGHTS.includes(x.kind) && FP.isUp(s, x));
  const ui = { sel: null, selAt: null, closed: null };
  FP.go(s, fight.id, { pause: true });
  assert.equal(R.at, fight.id);
  assert.equal(R.screen?.kind, 'virus');
  assert.equal(active(s), false, 'no fight yet');
  const card = pop(roomsMarkup(s, ui));
  assert.match(card, /data-rooms="engage"[\s\S]*data-rooms="back"/);
  assert.match(card, new RegExp(`<h1>${FP.virusName(s, fight)}</h1>`), 'its card is titled by the virus in it');
});

test('a discovered room keeps its icon, name, badges, live light and ring from afar, across visits and at home', () => {
  const s = server(), R = s.rooms, g = R.graph;
  const post = FP.roomList(s).find((x) => x.kind === 'guard'), p = FP.roomList(s).find((x) => x.kind === 'process' && x.id !== post.id);
  place(s, post.id); place(s, p.id); place(s, g.entry);
  assert.ok(FP.known(s, post.id) && FP.known(s, p.id));
  R.down[p.id] = clock; R.cleared[p.id] = clock;
  let chip = tile(s, post.id);
  assert.match(chip, /class="fp-room k-guard t-hot/);
  assert.match(chip, /href="#fp-i-elite"/);
  assert.match(chip, new RegExp(`>${FP.virusName(s, post)}<`), 'its name plate: the guard in it');
  assert.match(chip, /fp-tag key[\s\S]*>KEY</);
  assert.match(chip, /class="fp-live"/, 'its live light');
  assert.match(tile(s, p.id), /class="fp-respawn hot"/, 'its respawn ring');
  FP.jackOut(s);
  assert.equal(R.at, null);
  chip = tile(s, post.id);
  assert.match(chip, />KEY</, 'at home too');
  clock += 60000; FP.connect(s);
  assert.match(tile(s, post.id), />KEY</, 'and the next visit');
  // The terminal agrees: map names a discovered room, and a ? for an unknown one.
  const map = FP.roomsCommand(s, 'map').find((e) => e.type === 'rooms-out').message;
  assert.match(map, new RegExp(post.path));
  assert.match(map, /\n\s*\? [A-Z]+\d+  \?/, 'an unknown room as ?, with its address');
  const unknown = FP.roomList(s).filter((x) => FP.seenOf(s, x.id) === 'shape');
  for (const x of unknown) assert.ok(!map.includes(x.path + ' ') && !map.endsWith(x.path), `${x.path}: never named`);
});

test('ls: the rooms next to you by name and tag, with their cost', () => {
  const s = server();
  const ls = FP.roomsCommand(s, 'ls').find((e) => e.type === 'rooms-out').message;
  const lines = ls.split('\n').slice(1).filter((l) => /^\d+ /.test(l));
  assert.equal(lines.length, FP.exits(s).length);
  for (const x of FP.exits(s)) assert.match(ls, new RegExp(`${x.path}  \\[[^\\]]+\\]  −\\d+ Signal`), `${x.path}: named, its tag, its cost`);
});

test('the hunter: its skull shows in a room next to you and in a discovered room; deeper in the fog it is out of sight', () => {
  const s = server({ hunter: 'patrol' }), R = s.rooms, g = R.graph, h = FP.hunterOf(s);
  assert.ok(h);
  const reset = () => { R.seen = {}; };
  // You next to its room: the skull and its arrow.
  const door = FP.neighbours(g, h.at)[0];
  reset(); place(s, door);
  assert.equal(FP.hunterSeen(s), true);
  assert.match(tile(s, h.at), /class="fp-skull/, 'next to you: its skull');
  assert.match(FP.hunterLine(s), /1 room off/);
  // Two rooms off, its room unknown: out of sight (a red pulse at the edge of the fog), and ls says so.
  const d = FP.distances(g, h.at), two = FP.roomList(s).find((x) => d[x.id] === 2 && x.id !== g.entry && !FP.neighbours(g, x.id).includes(h.at));
  reset(); place(s, two.id);
  assert.equal(FP.hunterSeen(s), false);
  let wide = wideOf(roomsMarkup(s));
  assert.doesNotMatch(wide, /class="fp-skull/);
  assert.match(wide, /class="fp-near"/, 'the pulse at the edge of the fog');
  assert.equal(FP.hunterLine(s), `The ${FP.HUNTERS[h.kind].name} is out of sight.`);
  // Its room discovered: from afar too.
  R.seen[h.at] = 'kind';
  wide = wideOf(roomsMarkup(s));
  assert.match(chipOf(wide, h.at), /class="fp-skull/);
  assert.match(FP.hunterLine(s), new RegExp(`in ${g.rooms[h.at].path}`));
});

test('everywhere rooms show: a fresh SPRAWL-00, a traced server and the farm open with the entry and its neighbours discovered', () => {
  const s = fresh();
  play(s, 'connect sprawl');
  const open = (x, R) => x.id === R.graph.entry || FP.neighbours(R.graph, R.graph.entry).includes(x.id);
  const check = (tag) => {
    const R = s.rooms, html = roomsMarkup(s), wide = wideOf(html);
    for (const x of FP.roomList(s)) {
      assert.equal(FP.known(s, x.id), open(x, R), `${tag} ${x.id}`);
      if (FP.seenOf(s, x.id) && !open(x, R)) assert.doesNotMatch(chipOf(wide, x.id), UNKNOWN_CHIP, `${tag} ${x.id}: a ? chip`);
    }
    assert.doesNotMatch(html, /undefined|NaN/);
  };
  check('SPRAWL-00');
  play(s, 'jack out');
  const t = fresh(); t.tutorialCompleted = true; command(t, 'developer location ransomware');
  const loc = t.locations[0]; loc.lockUntil = 0;
  play(t, 'connect ' + loc.id);
  assert.ok(t.rooms?.world);
  for (const x of FP.roomList(t)) assert.equal(FP.known(t, x.id), open(x, t.rooms), `traced ${x.id}`);
  const f = fresh(); f.hackers = { [f.loadout.archetype]: { level: 7, xp: 0 } };
  openFarm(f); play(f, 'crew sim bastion'); play(f, 'connect kessler');
  assert.ok(f.run?.rooms);
  for (const x of FP.roomList(f)) assert.equal(FP.known(f, x.id), open(x, f.rooms), `farm ${x.id}`);
});

test('an old save: a room it showed by kind stays discovered unless the save can tell you were never in it', () => {
  const t = fresh(); t.tutorialCompleted = true; command(t, 'developer location ransomware');
  const loc = t.locations[0]; loc.lockUntil = 0;
  play(t, 'connect ' + loc.id); play(t, 'jack out');
  const R = loc.floorplan, rooms = Object.values(R.graph.rooms);
  // As an old save had it: no fog version, every room at 'kind' (the half-cleared reveal).
  delete R.fog;
  for (const x of rooms) R.seen[x.id] = 'kind';
  const fights = rooms.filter((x) => ['process', 'elite', 'guard', 'cache', 'vault', 'rest'].includes(x.kind));
  const back = restore(JSON.parse(JSON.stringify(t)));
  const B = back.locations.find((l) => l.id === loc.id).floorplan;
  assert.equal(B.fog, FP.FOG);
  for (const x of fights) assert.equal(B.seen[x.id], 'kind', `${x.path}: can't tell, stays discovered`);
  assert.equal(B.seen[B.graph.core], 'kind', 'the Core it always showed stays');
  assert.equal(B.seen[B.graph.entry], 'kind');
  // Twice is the same as once, and a new save is left alone.
  const again = restore(JSON.parse(JSON.stringify(back)));
  assert.deepEqual(again.locations.find((l) => l.id === loc.id).floorplan.seen, B.seen);
  // A room that clears as you walk in (a junction, an Empty, a Stash, the den), never cleared: you were never in it.
  const p = server({ seed: 3, size: 'large', hunter: 'track' }), P = p.rooms, den = FP.roomList(p).find((x) => x.kind === 'den'), junction = FP.roomList(p).find((x) => x.kind === 'cache');
  junction.kind = 'junction'; // (the generator rarely lays one: a cache stands in)
  const quiet = [den, junction];
  assert.ok(den && junction, 'a den and a junction to test on');
  delete P.fog;
  for (const x of FP.roomList(p)) P.seen[x.id] = 'kind';
  P.cleared[quiet[1].id] = clock;
  FP.fogRestore(P);
  assert.equal(P.seen[quiet[0].id], 'shape', `${quiet[0].path} never cleared: unknown`);
  assert.equal(P.seen[quiet[1].id], 'kind', `${quiet[1].path} cleared: discovered`);
  assert.equal(P.seen[P.graph.core], 'kind');
  const keep = JSON.stringify(P.seen); FP.fogRestore(P); assert.equal(JSON.stringify(P.seen), keep, 'once');
});

test('Mapped (100%) means every room discovered', () => {
  const s = server(), R = s.rooms;
  const c = FP.roomList(s).find((x) => x.kind === 'cache' && !x.mirror);
  for (const x of FP.roomList(s)) if (x.id !== c.id) R.cleared[x.id] = clock;
  assert.ok(FP.roomList(s).some((x) => !FP.known(s, x.id)));
  place(s, c.id); FP.act(s, 'pull');
  assert.ok(R.mapped, 'Mapped');
  for (const x of FP.roomList(s)) assert.ok(FP.known(s, x.id), `${x.path} discovered`);
});

test('a live fight you can see wears its level on the chip, red when it\'s over yours', () => {
  const s = server(), R = s.rooms;
  const fight = FP.exits(s).find((x) => FP.FIGHTS.includes(x.kind) && FP.isUp(s, x));
  const lv = FP.fightOf(s, fight).level;
  assert.match(tile(s, fight.id), new RegExp(`<g class="fp-lvl"><rect[^>]*/><text[^>]*>lv ${lv}</text>`));
  R.rare[fight.id] = true; // two levels up
  assert.match(tile(s, fight.id), new RegExp(`<g class="fp-lvl over">[\\s\\S]*>lv ${lv + FP.ROOMS.rareLevel}<`));
  R.down[fight.id] = clock;
  assert.doesNotMatch(tile(s, fight.id), /fp-lvl/, 'down: no level');
  const d = FP.distances(R.graph, R.at), two = FP.roomList(s).find((x) => d[x.id] === 2 && x.id !== R.graph.core);
  assert.doesNotMatch(tile(s, two.id), /fp-lvl/, 'unknown: no level');
});
