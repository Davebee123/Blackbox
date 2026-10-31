// Blips (events.mjs, docs/director.md section 3): a stray cache, a price flicker, a rumour and a sighting, about every
// 5 minutes logged on, beside the events; and the history list (section 5). Missing a blip costs nothing.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, addLocation } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import * as FP from './dist/floorplan.mjs';
import { roomsFor } from './dist/netrooms.mjs';
import { deal, eventsOf, tickEvents, dealBlip, blipsOf, historyOf, BLIP, HISTORY, DIRECTOR, flickerMult } from './dist/events.mjs';
import { priceOf, WARE_IDS } from './dist/market.mjs';
import { FACTIONS } from './dist/factions.mjs';
import { mapMarkup } from './dist/view.mjs';
import { roomsMarkup } from './dist/floorplan-view.mjs';
import { inboxMarkup } from './dist/pager-view.mjs';
import { logComms, commsOf, live } from './dist/comms.mjs';

const MIN = 60000;
// A level 12 player with two traced servers, every room on them cleared; Halcyon's and GLASSJAW's hubs found.
const world = ({ level = 12 } = {}) => {
  const s = fresh(); s.tutorialCompleted = true; s.hackers = { breaker: { level, xp: 0 } };
  addLocation(s, 'worm'); addLocation(s, 'ransomware');
  s.locations.forEach((l) => { l.rogue = false; l.runs = 1; const R = roomsFor(s, l); for (const r of Object.values(R.graph.rooms)) R.cleared[r.id] = true; });
  command(s, 'mail'); s.mail.boardOpen = true;
  s.hubFound = { glassjaw: true };
  s.market = { pressure: {}, transfers: [], serial: 0, event: 'calm', eventUntil: Infinity, at: null };
  s.director = { next: 9e9, n: 0, last: null, blipNext: 9e9 };
  return s;
};
const locOf = (s, b) => s.locations.find((l) => l.id === b.loc);

test('a stray cache: a spark on its server and its room; walk in and it goes in your pack; let it go and nothing is lost', () => {
  const s = world(), b = dealBlip(s, 'cache'), loc = locOf(s, b), R = loc.floorplan;
  assert.ok(b && R.cleared[b.room], 'in a room you cleared');
  assert.ok(b.credits > 0 && b.code > 0);
  assert.match(mapMarkup(s, loc.id), /blipmark/, 'a spark on the map node');
  for (const r of Object.values(R.graph.rooms)) if (FP.FIGHTS.includes(r.kind)) R.down[r.id] = Date.now(); // nothing live on the way
  play(s, 'connect ' + loc.id);
  assert.match(roomsMarkup(s), /fp-blip/, 'a spark on its room');
  const R2 = s.rooms;
  const near = Object.keys(R2.graph.rooms).find((id) => FP.neighbours(R2.graph, b.room).includes(id));
  R2.at = near; R2.visit.walked[near] = true; R2.screen = null;
  FP.go(s, b.room);
  assert.equal(R2.at, b.room);
  assert.ok(s.run.pack.some((f) => f.kind === 'credits' && f.amount === b.credits), 'credits in the pack');
  assert.ok(s.run.pack.some((f) => f.kind === 'code' && f.amount === b.code), 'code in the pack');
  assert.equal(blipsOf(s).length, 0);
  assert.equal(historyOf(s)[0].how, 'taken');
  // Let one go: it leaves, and nothing else changes.
  const t = world(), c = dealBlip(t, 'cache'), credits = t.server.credits;
  tickEvents(t, c.ms);
  assert.equal(blipsOf(t).length, 0);
  assert.equal(t.server.credits, credits);
  assert.equal(historyOf(t)[0].how, 'missed');
});

test('a price flicker moves one hub\'s ware ±15% for 5 minutes, shown on the hub\'s chip', () => {
  const s = world(), hubs = Object.keys(FACTIONS), before = Object.fromEntries(hubs.map((f) => [f, Object.fromEntries(WARE_IDS.map((w) => [w, priceOf(s, f, w)]))]));
  const b = dealBlip(s, 'flicker');
  assert.ok([1 + BLIP.flicker.pct, 1 - BLIP.flicker.pct].includes(b.mult));
  assert.equal(b.ms, 5 * MIN);
  for (const f of hubs) for (const w of WARE_IDS) assert.ok(Math.abs(priceOf(s, f, w) - (f === b.hub && w === b.ware ? before[f][w] * b.mult : before[f][w])) < 1e-9, `${f} ${w}`);
  assert.match(mapMarkup(s, 'hub-' + b.hub), new RegExp(`hub-shock[^>]*${b.mult > 1 ? 'up' : 'down'}|×${b.mult}`), 'the ▲/▼ chip');
  tickEvents(s, b.ms);
  assert.equal(flickerMult(s, b.hub, b.ware), 1);
  for (const f of hubs) for (const w of WARE_IDS) assert.ok(Math.abs(priceOf(s, f, w) - before[f][w]) < 1e-9, 'back to normal');
});

test('a rumour names where the next event lands, and it does', () => {
  for (let seed = 1; seed <= 8; seed++) {
    const s = world(); s.seed = seed;
    const b = dealBlip(s, 'rumour');
    assert.ok(b, `seed ${seed}`);
    assert.match(mapMarkup(s, b.loc), /blipmark/, 'a spark on the server it names');
    const ev = deal(s);
    assert.equal(ev.card, b.card, `seed ${seed}: the card`);
    assert.equal(ev.loc, b.loc, `seed ${seed}: the server`);
    assert.equal(historyOf(s).find((h) => h.id === b.id).how, 'true');
    tickEvents(s, MIN);
    assert.ok(!blipsOf(s).some((x) => x.kind === 'rumour'), 'its line goes once the event is up');
  }
  // A card asked for by name (a developer deal) leaves the rumour standing.
  const s = world(), b = dealBlip(s, 'rumour'), other = deal(s, 'outbreak');
  assert.equal(other.card, 'outbreak');
  assert.equal(s.director.rumour.card, b.card);
});

test('a sighting: a ★ rare spawn due in a named room within minutes; met, it counts; missed, it moves on', () => {
  const s = world(), b = dealBlip(s, 'sighting'), loc = locOf(s, b), R = loc.floorplan;
  assert.ok(R.rare[b.room], 'the room\'s next virus is a rare spawn');
  assert.ok(b.at - Date.now() <= BLIP.sighting.due[1] + 1000, 'due within minutes');
  assert.match(mapMarkup(s, loc.id), /blipmark/);
  R.spawns[b.room] = (R.spawns[b.room] || 0) + 1; R.rare[b.room] = false; // killed
  tickEvents(s, MIN);
  assert.equal(historyOf(s)[0].how, 'taken');
  // Missed: the room's next virus is an ordinary one again.
  const t = world(), c = dealBlip(t, 'sighting');
  tickEvents(t, c.ms);
  assert.equal(locOf(t, c).floorplan.rare[c.room], false);
  assert.equal(historyOf(t)[0].how, 'missed');
});

test('blips come about every 5 minutes logged on, beside the events, from level 3; logged-off time piles none up', () => {
  const s = world(); s.director.blipNext = null;
  const n0 = s.director.bn || 0;
  for (let t = 0; t < 60 * MIN; t += MIN / 2) tickEvents(s, MIN / 2);
  const n = (s.director.bn || 0) - n0;
  assert.ok(n >= 10 && n <= 15, `${n} blips in an hour`);
  assert.ok(eventsOf(s).length <= DIRECTOR.max, 'never in the events\' slots');
  assert.ok(blipsOf(s).length <= BLIP.max);
  const low = world({ level: DIRECTOR.from - 1 }); low.director.blipNext = null;
  for (let t = 0; t < 30 * MIN; t += MIN) tickEvents(low, MIN);
  assert.equal(low.director.bn || 0, 0, 'none under level 3');
  const away = world(); away.director.blipNext = null;
  tickEvents(away, 3 * 60 * MIN);
  assert.ok((away.director.bn || 0) <= 1, 'one big step deals one at most');
});

test('the history: the last 20 things the director dealt and how each ended, on the pager; a blip\'s line goes with it', () => {
  const s = world();
  const ev = deal(s, 'outbreak');
  assert.equal(historyOf(s)[0].how, 'up');
  tickEvents(s, ev.left);
  assert.equal(historyOf(s).find((h) => h.id === ev.id).how, 'gone');
  for (let i = 0; i < 30; i++) { const b = dealBlip(s, 'flicker'); if (b) tickEvents(s, b.ms); }
  assert.equal(historyOf(s).length, HISTORY.keep);
  assert.match(inboxMarkup(s), /History <b>20<\/b>/);
  // A blip's pager line: quiet, and gone when the blip is.
  const t = world(), b = dealBlip(t, 'flicker');
  logComms(t, t.logs.filter((e) => e.type === 'blip'));
  const c = commsOf(t).find((x) => x.blip === b.id);
  assert.ok(c && c.beep === false);
  assert.ok(live(t, c));
  tickEvents(t, b.ms);
  assert.ok(!live(t, c));
});
