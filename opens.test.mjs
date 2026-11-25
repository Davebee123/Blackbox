// What opens when (progression.mjs OPENS; GAME_RULES.md "What opens when"): a new character meets each system on its
// trigger and none before; an older save (no s.opens) keeps everything it had.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, hackerOf, restore } from './dist/combat.mjs';
import { OPENS, isOpen, openUp, newCharacter, tickPlay } from './dist/progression.mjs';
import * as SC from './dist/scenes.mjs';
import { castOf, cantHire, raiseStanding, STANDING } from './dist/runners.mjs';
import { supplyOf } from './dist/supply.mjs';
import { moveTable, countOf } from './dist/table.mjs';
import { runCardRoll, tickEvents } from './dist/events.mjs';
import { arcDelivered, TABLE_PAGE } from './dist/arcs.mjs';

const at = (lv, s = fresh()) => { s.tutorialCompleted = true; s.netSeed = 977; hackerOf(s).level = lv; s.hubFound = { kestrel: true, glassjaw: true, nullchoir: true, lantern: true }; s.mail.boardOpen = true; return s; };
const ids = [...Object.keys(OPENS), 'supply:kestrel'];

test('a level-20 save from before the triggers keeps everything open, across a save and load', () => {
  const s = restore(JSON.parse(JSON.stringify(at(20))));
  assert.equal(s.opens, undefined);
  for (const id of ids) assert.ok(isOpen(s, id), id);
  assert.ok(isOpen(s, 'blips', hackerOf(s).level >= 3), 'its level gates pass as before');
  const r = castOf(s)[0];
  assert.notEqual(cantHire(s, r), 'help a runner first');
  assert.ok(!/from level/.test(cantHire(s, r) || ''), 'hiring open at 20');
  assert.ok(supplyOf(s, 'kestrel'), "Kestrel's supply order is up");
  const before = countOf(s); moveTable(s, 2); assert.equal(countOf(s), before + 2, 'the table moves');
  assert.equal(openUp(s, 'hire'), false, 'nothing to open: no transmission on an older save');
  assert.equal(SC.sceneNow(s), null);
});

test('an older save at level 1 keeps its level gates (hiring from 5)', () => {
  const s = at(1);
  assert.equal(cantHire(s, castOf(s)[0]), 'from level 5');
});

test('a new character: every system shut until its trigger, and the trigger survives a save and load', () => {
  const s = newCharacter(at(20));
  for (const id of ids) assert.ok(!isOpen(s, id), id);
  assert.equal(cantHire(s, castOf(s)[0]), 'help a runner first', 'even at 20');
  assert.equal(supplyOf(s, 'kestrel'), null);
  const t0 = countOf(s); moveTable(s, 5); assert.equal(countOf(s), t0, 'the table stays put');
  const loaded = restore(JSON.parse(JSON.stringify(s)));
  assert.ok(loaded.opens && !isOpen(loaded, 'hire') && !isOpen(loaded, 'table'), 'the record survives a load'); // (its achievements, granted on load, open the Rig)
});

test('each trigger opens its system once, and plays its transmission', () => {
  const s = newCharacter(at(3));
  assert.ok(openUp(s, 'hire', { handle: 'ROOK', faction: 'Kestrel', v: 'bold' }));
  assert.ok(!openUp(s, 'hire'), 'once');
  assert.equal(SC.sceneNow(s).id, 'runner-helped');
  assert.match(SC.sceneNow(s).said[0].text, /Saw your process take that thing apart\. ROOK, Kestrel\./, "the runner's temperament");
  assert.notEqual(cantHire(s, castOf(s)[0]), 'help a runner first');
});

test('a runner at Known opens their trade', () => {
  const s = newCharacter(at(3)), r = castOf(s)[0];
  raiseStanding(s, r.handle, STANDING.help);
  assert.ok(isOpen(s, 'trade'));
});

test("a run on a traced server opens run cards; a sale opens that hub's supply order", () => {
  const s = newCharacter(at(3));
  runCardRoll(s);
  assert.ok(isOpen(s, 'runcards'));
  openUp(s, 'supply:kestrel');
  assert.ok(supplyOf(s, 'kestrel') && !supplyOf(s, 'glassjaw'), 'that hub only');
});

test("Carrier's schedule page opens INIT's table, and LANTERN says so", () => {
  const s = newCharacter(at(14));
  arcDelivered(s, { chain: 2, step: 2, type: 'heist', file: TABLE_PAGE });
  if (!isOpen(s, 'table')) { // the step that carries the page, whichever it is
    const c = { chain: 2, type: 'heist' };
    for (let k = 0; k < 6 && !isOpen(s, 'table'); k++) arcDelivered(s, { ...c, step: k });
  }
  assert.ok(isOpen(s, 'table'));
  assert.ok(SC.sceneNow(s)?.id === 'schedule' || s.scenes.queue.some((q) => q.id === 'schedule'));
});

test('the director: no blips before the first jack out, no events before the turf letter', () => {
  const s = newCharacter(at(10));
  for (let i = 0; i < 120; i++) tickEvents(s, 60_000);
  assert.ok(!(s.director?.events || []).length && !(s.director?.blips || []).length, 'nothing dealt');
});

test('transmissions play on their event, waiting only behind one already playing', () => {
  const s = newCharacter(at(5));
  openUp(s, 'blips');
  assert.equal(SC.sceneNow(s).id, 'first-jackout');
  openUp(s, 'rivals');
  assert.equal(SC.sceneNow(s).id, 'first-jackout', 'one at a time');
  SC.skip(s);
  assert.equal(SC.sceneNow(s).id, 'first-vault', 'the next plays as the last closes');
  SC.skip(s);
  openUp(s, 'events');
  assert.ok(SC.sceneNow(s), 'no wait after the last');
});

test('a rival speaks by temperament and how the race ended', () => {
  const s = newCharacter(at(5));
  SC.queueScene(s, 'rival-met', { handle: 'VANTA', faction: 'GLASSJAW', v: 'careful', v2: 'careful-lost' });
  assert.equal(SC.sceneNow(s).said[0].text, 'Clean run. The files are already sold.');
  assert.equal(SC.sceneNow(s).said[0].who, 'VANTA');
});

// Phase 5 (docs/demo-plan.md): the hubs, the floor bosses' falls and floor 2 play their transmissions through the same
// path; CENTRIFUGE's two play at once, LANTERN then wick, and wick's goodbye goes to the demo's end card.
test('the hubs found play Kestrel\'s and GLASSJAW\'s transmissions, on a new character only', async () => {
  const { hubTrace } = await import('./dist/factions.mjs');
  const s = newCharacter(at(5)); s.hubFound = {};
  hubTrace(s, 'kestrel', 100);
  assert.equal(SC.sceneNow(s)?.id, 'kestrel-hub');
  assert.ok(isOpen(s, 'rack'));
  hubTrace(s, 'glassjaw', 100);
  assert.ok(s.scenes.queue.some((q) => q.id === 'glassjaw-hub'), 'queued behind it');
  const old = at(5); old.hubFound = {};
  hubTrace(old, 'glassjaw', 100);
  assert.equal(SC.sceneNow(old), null, 'no transmission on an older save');
});

test('reaching floor 2 brings LANTERN\'s arrival', async () => {
  const F = await import('./dist/floors.mjs');
  const { addLocation } = await import('./dist/combat.mjs');
  const s = newCharacter(at(8));
  const g = F.graphOf(s, 1), host = g.links.filter((l) => l.includes(g.exits[0])).map((l) => (l[0] === g.exits[0] ? l[1] : l[0]))[0];
  addLocation(s, g.nodes[host].family, 1, null, host);
  assert.ok(F.descend(s), 'down the exit');
  assert.equal(SC.sceneNow(s)?.id, 'floor2');
});

test('a floor job\'s Boss step falling plays its transmissions; CENTRIFUGE\'s two at once, ending on the end card', async () => {
  const { FALLS } = await import('./dist/progression.mjs');
  assert.deepEqual(FALLS[1], ['pagenine-falls']);
  const s = newCharacter(at(14));
  s.pace = { kills: 0, ms: 60_000 }; s.scenes = { seen: ['welcome'], queue: [], now: null, lastAt: 50_000 }; // a transmission a moment ago
  for (const id of FALLS[2]) SC.queueScene(s, id);
  assert.equal(SC.sceneNow(s)?.id, 'centrifuge', 'no gap before it');
  while (SC.sceneNow(s)?.id === 'centrifuge') { const c = SC.choicesOf(s); SC.choose(s, c.find((x) => x.end).n); }
  assert.equal(SC.sceneNow(s)?.id, 'centrifuge-wick', 'wick follows at once');
  assert.deepEqual(SC.choose(s, 1), { go: 'demo-end' });
});
