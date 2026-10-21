// The quirks on the room map (GAME_RULES.md Quirks, netrooms.mjs placeQuirkRoom, floorplan.mjs addNest, addSecret):
// a Worm server's optional nest room (a Crawler and its brood, paying components), a Ghostroot server's hidden room
// (off the map, the fog, the hunter and every path until the room beside it is cleared, then open for good, holding a
// stash), the quirks' rules, and the server card's type tag with its one rule (never "Relay": a relay is the item).
// The audit's fixes ride along: a Mailhub without a Patroller still has its mail queue, a Relay's Patroller walks a hop.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, hooks, restore } from './dist/combat.mjs';
import { CONFIG, QUIRKS, TEMPLATES } from './dist/data.mjs';
import { play } from './dist/run.mjs';
import * as FP from './dist/floorplan.mjs';
import { roomsFor, summaryOf } from './dist/netrooms.mjs';
import { addrsOf, sweepRooms } from './dist/address.mjs';
import { roomsMarkup } from './dist/floorplan-view.mjs';
import { mapMarkup, layoutName, layoutRule, LAYOUT_NAMES } from './dist/view.mjs';
import { quirkLine } from './dist/invasion.mjs';
import { TIPS } from './dist/tips.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false;
CONFIG.exfil.chance = 0;
let clock = 1_700_000_000_000;
hooks.now = () => clock;
const win = (s) => { for (let i = 0; i < 40 && active(s); i++) { for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, attack: null }); const p = s.encounter.virus.parts.find((x) => x.integrity > 0); p.integrity = 1; command(s, 'spike ' + p.id); resolveCycle(s); } FP.settle(s); };
// A traced server of a family, built fresh from a seed.
const traced = (family, { seed = 1, template = null, depth = null } = {}) => {
  const s = fresh(); s.tutorialCompleted = true;
  command(s, `developer location ${family}`);
  const loc = s.locations.at(-1);
  loc.lockUntil = 0; loc.seed = seed; if (template) loc.template = template; if (depth) loc.depth = depth;
  loc.floorplan = null;
  return { s, loc, R: roomsFor(s, loc) };
};
const quirkRooms = (g) => Object.values(g.rooms).filter((x) => x.optional);
// Stand beside a room and walk in (the run's Signal topped up).
const walkIn = (s, id) => { const R = s.rooms, by = FP.neighbours(R.graph, id)[0]; R.at = by; R.screen = null; s.run.integrity = s.run.max; return FP.go(s, id); };

test('the nest room: only on Worm servers, from the seed, a dead end off a branch room, optional (out of Rooms n/N and Mapped)', () => {
  for (let k = 0; k < 12; k++) {
    for (const family of ['worm', 'ransomware', 'ghostroot']) {
      const { loc, R } = traced(family, { seed: 7 + k * 613, template: TEMPLATES[k % TEMPLATES.length] }), g = R.graph, nest = Object.values(g.rooms).filter((x) => x.kind === 'nest');
      assert.equal(loc.quirk, { worm: 'nest', ransomware: 'hoard', ghostroot: 'hidden' }[family]);
      assert.equal(nest.length, family === 'worm' ? 1 : 0, `${loc.name}: a nest only on a Worm server`);
      if (!nest.length) continue;
      const [x] = nest, links = FP.neighbours(g, x.id), by = g.rooms[links[0]];
      assert.equal(links.length, 1, 'a dead end');
      assert.ok(x.optional && !FP.counted(x), 'optional: never counted');
      assert.ok(![g.entry, g.core, g.den, ...g.vaults].includes(by.id) && !['guard', 'vault', 'core', 'entry', 'den'].includes(by.kind) || ['guard', 'socket'].includes(by.kind), `off ${by.kind}`);
      assert.ok(FP.FIGHTS.includes('nest'));
      assert.equal(summaryOf(null, loc).total, Object.values(g.rooms).filter(FP.counted).length);
      assert.ok(!Object.values(g.rooms).filter(FP.counted).some((r) => r.id === x.id), 'not in Rooms n/N');
      assert.ok(!sweepRooms(g).includes(x.id), 'not a no-rest map job\'s room');
      // The same seed, the same nest.
      const again = traced(family, { seed: loc.seed, template: loc.template }).R.graph;
      assert.deepEqual(again.rooms[x.id], x, 'deterministic from the seed');
      assert.deepEqual(again.links, g.links);
    }
  }
});

test('the nest fights a Crawler and its brood (elite-lite), pays components, respawns like an elite, and never holds up Mapped', () => {
  const { s, loc, R } = traced('worm', { seed: 41 });
  play(s, 'connect ' + loc.id);
  const g = s.rooms.graph, nest = Object.values(g.rooms).find((x) => x.kind === 'nest');
  walkIn(s, nest.id);
  assert.equal(s.rooms.screen?.kind, 'virus', 'a live virus holds it');
  assert.match(FP.roomsCommand(s, 'ls').map((e) => e.message).join('\n'), /\[nest/);
  play(s, 'engage');
  assert.ok(active(s));
  const v = s.encounter.virus;
  assert.equal(s.encounter.key, 'crawler', 'the Crawler');
  assert.equal(v.family, 'crawler');
  assert.equal(v.parts.filter((p) => p.kind === 'fragment').length, FP.ROOMS.nest.brood, 'its brood out from the start');
  assert.ok(v.parts.some((p) => p.id === 'replicator'), 'and its Brood, spawning more');
  assert.equal(s.encounter.rooms.size, 'nest');
  assert.ok(FP.ROOMS.size.nest.hp > FP.ROOMS.size.process.hp, 'bigger than a process');
  const parts0 = (s.salvage || []).length, xp = s.encounter.roomsXp;
  assert.equal(xp, FP.ROOMS.xp.room * FP.ROOMS.nest.xp, 'twice a room kill\'s XP');
  const ev = (() => { const first = s.serial; win(s); return s.logs.filter((e) => e.id > first); })();
  assert.ok((s.salvage || []).length >= parts0 + FP.ROOMS.nest.parts, 'a cache\'s worth of components');
  assert.ok(ev.some((e) => e.type === 'loot' && /The nest gives up 6 components/.test(e.message)));
  assert.ok(FP.ROOMS.nest.parts > 2, 'more than a process room\'s one or two');
  assert.ok(s.rooms.cleared[nest.id] && !FP.isUp(s, nest));
  assert.equal(FP.respawnBase(s, nest), FP.ROOMS.respawnNew.elite, 'back like an elite');
  assert.equal(s.rooms.rare[nest.id], false, 'never a rare spawn');
  // Mapped without it: every counted room cleared, the nest left alone.
  const t = restore(JSON.parse(JSON.stringify(s))), L = t.locations.find((x) => x.id === loc.id), R2 = L.floorplan;
  for (const id of Object.keys(R2.cleared)) if (id === nest.id) delete R2.cleared[id];
  for (const r of Object.values(R2.graph.rooms)) if (FP.counted(r)) R2.cleared[r.id] ||= clock;
  const sum = summaryOf(t, L);
  assert.equal(sum.done, sum.total, 'Rooms n/N full with the nest still standing');
  assert.ok(R.graph.rooms[nest.id]);
});

test('the hidden room: off the map, the fog, the hunter and every path until the room beside it is cleared; then it opens for good, and holds a stash', () => {
  let found = null;
  for (let k = 0; k < 20 && !found; k++) { const t = traced('ghostroot', { seed: 101 + k * 389, template: 'mirror', depth: 2 }); if (t.R.size !== 'small' && t.R.graph.den) found = t; }
  const { s, loc } = found;
  play(s, 'connect ' + loc.id);
  const R = s.rooms, g = R.graph, x = Object.values(g.rooms).find((r) => r.kind === 'secret'), by = g.rooms[x.off];
  assert.ok(x && x.concealed && x.optional, 'one hidden room, concealed');
  assert.ok(['process', 'elite', 'guard', 'socket'].includes(by.kind), `beside a fight room (${by.kind})`);
  const hidden = () => {
    assert.ok(!FP.roomList(s).some((r) => r.id === x.id), 'not on the room list');
    assert.equal(addrsOf(g)[x.id], undefined, 'no address');
    assert.equal(FP.distances(g, g.entry)[x.id], undefined, 'no path to it');
    assert.equal(FP.pathTo(g, by.id, x.id), null, 'not even from beside it');
    assert.ok(!FP.neighbours(g, by.id).includes(x.id));
    assert.equal(R.seen[x.id], undefined, 'not even a ? ghost');
    assert.doesNotMatch(roomsMarkup(s), new RegExp(`data-room="${x.id}"`), 'no chip');
    assert.ok(!FP.roomsCommand(s, 'map').some((e) => /Hidden room/.test(e.message)));
  };
  hidden();
  // The fog: standing beside its cell sees nothing, and `cd` to it says nothing about it.
  walkIn(s, by.id);
  hidden();
  assert.equal(R.screen?.kind, 'virus', 'the room beside it holds a virus');
  assert.doesNotMatch(FP.go(s, x.id).map((e) => e.message).join(' '), /Hidden room/);
  // The hunter, the Exfil and a thread's file walk links: none leads there.
  assert.ok(Object.keys(g.rooms).every((id) => !FP.neighbours(g, id).includes(x.id)));
  // Every other counted room cleared: the win beside it draws the whole map and Maps the server, and leaves it out.
  for (const r of FP.roomList(s)) if (FP.counted(r) && r.id !== by.id) R.cleared[r.id] ||= clock;
  // Clear the room beside it: the hidden room opens, a ? beside it, with a notice.
  play(s, 'engage');
  assert.ok(active(s), 'the fight beside it');
  const first = s.serial;
  win(s);
  const said = s.logs.filter((e) => e.id > first && e.type === 'rooms-reveal');
  assert.equal(said.length, 1, 'one notice');
  assert.equal(said[0].message, `A hidden room opens off ${by.path}.`);
  assert.ok(!x.concealed && FP.neighbours(g, by.id).includes(x.id), 'linked for good');
  assert.ok(R.drawn && R.mapped, 'drawn and Mapped before it opened');
  assert.equal(R.seen[x.id], 'shape', 'on the map as a room you haven\'t been in');
  assert.ok(FP.roomList(s).some((r) => r.id === x.id) && addrsOf(g)[x.id], 'on the map, with an address');
  assert.match(roomsMarkup(s), new RegExp(`class="fp-room reveal [^"]*" data-room="${x.id}"`), 'its chip fades in');
  assert.ok(!FP.counted(x), 'still optional');
  // It stays: jack out, a save and back, a respawn and another win beside it change nothing.
  FP.jackOut(s);
  const t = restore(JSON.parse(JSON.stringify(s))), L = t.locations.find((l) => l.id === loc.id), g2 = L.floorplan.graph;
  assert.ok(!g2.rooms[x.id].concealed && FP.neighbours(g2, by.id).includes(x.id), 'open on the save');
  clock += 31000;
  play(t, 'connect ' + loc.id);
  const T = t.rooms;
  assert.ok(FP.roomList(t).some((r) => r.id === x.id));
  // The stash: a cache's pile (credits and code into the pack), never bait, then empty for two hours.
  T.at = by.id; T.screen = null; T.visit.walked[x.id] = false;
  FP.go(t, x.id);
  assert.equal(T.at, x.id);
  assert.equal(FP.cacheFull(t, x), true);
  assert.equal(FP.isBait(t, x), false);
  const pack0 = t.run.pack.length;
  play(t, 'pull');
  assert.ok(t.run.pack.length >= pack0 + 2, 'credits and code into the pack');
  assert.ok(t.run.pack.some((f) => f.kind === 'credits' && f.amount >= FP.ROOMS.cache.credits[0]));
  assert.equal(FP.cacheFull(t, x), false, 'taken');
  assert.ok(FP.refillAt(t, x) - clock <= FP.ROOMS.respawn.cache * 60000, 'it fills again like a cache');
  assert.ok(FP.ROOMS.secret.blue > 0 && FP.ROOMS.secret.blue <= 0.1, 'a modest chance at a blue');
});

test('an older save gets its quirk room on load, once, nothing it had moving', () => {
  const { s, loc, R } = traced('worm', { seed: 77 });
  const nest = quirkRooms(R.graph)[0], was = { ...addrsOf(R.graph) };
  delete R.graph.rooms[nest.id]; R.graph.links = R.graph.links.filter(([a, b]) => a !== nest.id && b !== nest.id); delete R.graph.quirks;
  const t = restore(JSON.parse(JSON.stringify(s))), g = t.locations.find((x) => x.id === loc.id).floorplan.graph;
  assert.equal(quirkRooms(g).length, 1, 'its nest back');
  assert.equal(g.quirks, 1);
  for (const [id, a] of Object.entries(was)) if (id !== nest.id) assert.equal(addrsOf(g)[id], a, `${id} keeps its address`);
  const again = restore(JSON.parse(JSON.stringify(t)));
  assert.equal(quirkRooms(again.locations.find((x) => x.id === loc.id).floorplan.graph).length, 1, 'once');
});

test('the quirks\' rules say what they do on rooms, one sentence each; an invasion\'s quirk tag says what it does to the invasion', () => {
  assert.deepEqual(Object.fromEntries(Object.entries(QUIRKS).map(([k, q]) => [k, q.rule])), {
    hoard: 'Caches pay 50% more, but the guards are Armored.',
    nest: 'An optional nest room holds a Crawler and its brood, and pays in components.',
    hidden: 'A hidden room opens once you clear the room beside it, and holds a stash.',
  });
  for (const q of Object.values(QUIRKS)) {
    assert.equal(q.rule.split(/\. /).length, 1, `${q.name}: one sentence`);
    assert.doesNotMatch(q.rule, /ls -a|\/nest|folder|\.ghost/, `${q.name}: nothing from the old file system`);
  }
  for (const id of Object.keys(QUIRKS)) assert.ok(TIPS.some((t) => t.id === `quirk-${id}` && t.text.endsWith(QUIRKS[id].rule)), `the ${id} tip`);
  assert.match(quirkLine({ quirk: 'nest' }), /brood from its Nest/);
  // On the map card and the strip's tooltip.
  const { s, loc } = traced('ghostroot', { seed: 5 });
  assert.match(mapMarkup(s, loc.id), new RegExp(`tag-quirk" data-quirk="hidden" title="${QUIRKS.hidden.rule}">Hidden<`));
  play(s, 'connect ' + loc.id);
  assert.match(FP.WORLD.view.idTip(s), new RegExp(`Hidden: ${QUIRKS.hidden.rule}`));
});

test('every server type has a tooltip rule on its card, and no server type reads "Relay"', () => {
  for (const tmpl of TEMPLATES) {
    const l = { template: tmpl };
    const kind = FP.KIND_OF[tmpl];
    assert.ok(FP.KINDS[kind], tmpl);
    assert.equal(layoutRule(l), `${FP.KINDS[kind].rule}: ${FP.KINDS[kind].text}`, `${tmpl}: its kind's one rule`);
    assert.doesNotMatch(layoutName(l), /relay/i, `${tmpl}: ${layoutName(l)}`);
    assert.doesNotMatch(FP.kindName(kind), /relay/i, `${kind}: ${FP.kindName(kind)}`);
  }
  assert.equal(LAYOUT_NAMES.relay, 'Name server');
  assert.equal(FP.kindName('Relay'), 'Name server');
  // On the card: the type is a tag like the trait and the quirk, its rule on hover.
  const { s, loc } = traced('ransomware', { seed: 9, template: 'relay' });
  const card = mapMarkup(s, loc.id);
  assert.match(card, new RegExp(`<span class="tag tag-kind" data-kind="relay" title="Hops: ${FP.KINDS.Relay.text}">Name server</span>`));
  play(s, 'connect ' + loc.id);
  assert.match(FP.WORLD.view.idLine(s), /^Name server · lv/);
  assert.match(FP.WORLD.view.idTip(s), /a [A-Z]+ Name server, level/);
  assert.doesNotMatch(FP.WORLD.view.idLine(s) + FP.WORLD.view.idTip(s), /Relay/);
  // The playtest's strip and its first line too.
  const p = fresh(); FP.startRooms(p, { seed: 3, kind: 'Relay' });
  assert.ok(p.rooms.log.some((x) => /Name server\. /.test(x)) && !p.rooms.log.some((x) => /Relay/.test(x)));
  assert.doesNotMatch(roomsMarkup(p).match(/<span class="fp-id"[\s\S]*?<\/span><\/span>/)[0], /Relay/);
});

test('the audit: every Mailhub has its mail queue (a Patroller\'s loop or its longest branch), and a Relay\'s Patroller walks a hop', () => {
  for (let seed = 1; seed <= 40; seed++) {
    for (const size of ['small', 'medium']) {
      const g = FP.generate(seed, { size, kind: 'Mailhub', floor: 1 + (seed % 3), level: 8 });
      const q = Object.values(g.rooms).filter((x) => x.queue);
      assert.ok(q.some((x) => ['process', 'elite'].includes(x.kind)), `Mailhub ${size} ${seed}: a fight on its queue`);
      if (g.route) assert.deepEqual(q.map((x) => x.id).sort(), [...new Set(g.route)].sort(), 'the Patroller\'s loop, where it has one');
    }
    for (const size of ['medium', 'large']) {
      const g = FP.generate(seed, { size, kind: 'Relay', floor: 2 + (seed % 4), level: 12 });
      const ids = g.ping ? g.route : [...g.route, g.route[0]], hop = (a, b) => g.hops.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
      assert.ok(ids.some((id, i) => i && hop(ids[i - 1], id)), `Relay ${size} ${seed}: its Patroller takes a hop`);
    }
  }
});
