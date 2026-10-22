// Scanning a room from its card (run.mjs scanButton, floorplan-view.mjs scanActs): a room next to you that you've been in
// and whose fight is up shows Scan on its pop-up card, with its cost (free for an Infiltrator). A click runs scan <room>,
// the prompt's own command. Its chip opens that card first, and a second click walks in. The rooms tour's scan step
// (tips.mjs tour-scan) points at the button and moves on when you scan.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, active, restore } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import { play, scanButton, SCAN } from './dist/run.mjs';
import * as FP from './dist/floorplan.mjs';
import { roomsMarkup, pickRoom } from './dist/floorplan-view.mjs';
import { nextTip, markSeen, TOUR } from './dist/tips.mjs';

CONFIG.exfil.chance = 0; // no Exfil in these rooms

const newPlayer = (cls) => { const s = fresh(); s.tutorialCompleted = true; if (cls) { s.loadout.archetype = cls; s.hackers[cls] ||= { level: 1, xp: 0 }; } return s; };
// SPRAWL-00, then a room next to you walked into and stepped back from: discovered, its virus up, next to you.
function sprawl(cls) {
  const s = newPlayer(cls);
  play(s, 'connect sprawl');
  const room = FP.exits(s)[0];
  FP.act(s, 'go', room.id);
  FP.act(s, 'back');
  assert.ok(FP.known(s, room.id) && FP.isUp(s, room) && s.rooms.at === s.rooms.graph.entry);
  return { s, room };
}
const ui = () => ({ sel: null, selAt: null, closed: null });
const cardOf = (s, id) => { const u = ui(); pickRoom(s, id, u); return (roomsMarkup(s, u).match(/<div class="map-pop fp-pop"[\s\S]*$/) || [''])[0]; };
const wideOf = (html) => html.match(/<svg class="fp-svg wide[\s\S]*?<\/svg>/)?.[0] || html;
const chipOf = (html, id) => wideOf(html).match(new RegExp(`<g class="[^"]*" data-room="${id}"[^>]*>`))?.[0] || '';
const scanBtn = (html) => html.match(/<button[^>]*class="btn fp-scan"[^>]*>[\s\S]*?<\/button>/)?.[0] || '';
const said = (ev) => ev.map((e) => e.message).join('\n');

test('Scan shows on the card of a room next to you that scan reads, and nowhere else', () => {
  const { s, room } = sprawl();
  const R = s.rooms, g = R.graph;
  const btn = scanBtn(cardOf(s, room.id));
  assert.match(btn, new RegExp(`data-command="scan ${room.dir}"`), 'it runs the prompt\'s scan <room>');
  assert.match(btn, />Scan<small>−1 Signal<\/small>/, 'its cost, as the other cards show theirs');
  assert.doesNotMatch(btn, /disabled/);
  assert.match(btn, /title="Read its virus card before you walk in\. It costs 1 Signal\."/);
  assert.match(cardOf(s, room.id), /data-rooms="go" data-arg="[^"]+">Walk in/, 'and Walk in beside it');
  // Your own room: no Scan (typed scan still reads it).
  assert.equal(scanButton(s, g.rooms[R.at]), null);
  // A room next to you you've never been in: unknown, nothing to read.
  const unknown = FP.exits(s).find((x) => !FP.known(s, x.id));
  assert.ok(unknown);
  assert.equal(scanButton(s, unknown), null);
  assert.equal(scanBtn(cardOf(s, unknown.id)), '');
  // A room you've been in that isn't next to you: no Scan.
  const far = FP.roomList(s).find((x) => x.id !== R.at && !FP.neighbours(g, R.at).includes(x.id) && x.kind === 'process');
  R.seen[far.id] = 'kind';
  assert.ok(FP.isUp(s, far), 'its fight is up: only the distance keeps Scan off');
  assert.equal(scanButton(s, far), null);
  assert.equal(scanBtn(cardOf(s, far.id)), '');
  // Its fight down: hidden, not disabled.
  Object.assign(s.zone.spawns[room.path0], { alive: false, respawnAt: Date.now() + 3600000 });
  assert.equal(FP.isUp(s, room), false);
  assert.equal(scanButton(s, room), null);
  assert.equal(scanBtn(cardOf(s, room.id)), '');
  // The rooms playtest (no run, no prompt scan): none.
  const p = fresh();
  FP.startRooms(p, { seed: 3, kind: 'Mailhub', size: 'small', level: 5, floor: 1 });
  FP.connect(p);
  const next = FP.exits(p)[0];
  p.rooms.seen[next.id] = 'kind';
  assert.equal(scanBtn(cardOf(p, next.id)), '');
});

test('mid-fight: no card and no Scan', () => {
  const { s, room } = sprawl();
  FP.act(s, 'go', room.id);
  FP.act(s, 'engage');
  assert.ok(active(s));
  const other = FP.neighbours(s.rooms.graph, s.rooms.at).map((id) => s.rooms.graph.rooms[id])[0];
  s.rooms.seen[other.id] = 'kind';
  assert.equal(scanButton(s, other), null);
  assert.doesNotMatch(roomsMarkup(s), /fp-scan/);
});

test('a scannable room\'s chip opens its card first, and a second click on it walks in', () => {
  const { s, room } = sprawl();
  assert.match(chipOf(roomsMarkup(s), room.id), new RegExp(`data-fp-sel="${room.id}"`), 'the first click opens its card');
  assert.match(chipOf(roomsMarkup(s), room.id), /\breach\b/, 'still a room you can walk into (its cost on its corner)');
  const u = ui();
  pickRoom(s, room.id, u);
  assert.match(chipOf(roomsMarkup(s, u), room.id), new RegExp(`data-rooms="go" data-arg="${room.id}"`), 'with its card open, a click walks in');
  // A room scan can't read still walks on one click.
  const unknown = FP.exits(s).find((x) => !FP.known(s, x.id));
  assert.match(chipOf(roomsMarkup(s), unknown.id), new RegExp(`data-rooms="go" data-arg="${unknown.id}"`));
});

test('a click on Scan is the typed scan: the same card, 1 Signal; an Infiltrator\'s is free and reads deeper', () => {
  for (const cls of [null, 'infiltrator']) {
    const { s, room } = sprawl(cls);
    const cmd = scanBtn(cardOf(s, room.id)).match(/data-command="([^"]+)"/)[1];
    assert.equal(cmd, `scan ${room.dir}`);
    const typed = restore(JSON.parse(JSON.stringify(s)));
    const sig = s.run.integrity;
    const a = play(s, cmd), b = play(typed, `scan ${room.dir}`);
    const card = (ev) => ev.find((e) => e.type === 'net-scan')?.card;
    assert.ok(card(a), 'a scan card');
    assert.deepEqual(card(a), card(b), 'the same card as typing it');
    assert.equal(s.run.integrity, typed.run.integrity);
    assert.deepEqual(s.run.unpack, typed.run.unpack);
    assert.equal(s.run.scans, 1);
    if (cls === 'infiltrator') {
      assert.equal(s.run.integrity, sig, 'free');
      assert.ok(card(a).deep, 'deeper');
      assert.ok(s.run.scanned.length === 1);
      const btn = scanBtn(cardOf(s, room.id));
      assert.match(btn, />Scan<small>free<\/small>/);
      assert.match(btn, /As an Infiltrator, you scan free and read deeper\./);
    } else {
      assert.equal(s.run.integrity, sig - SCAN.signal, '1 Signal');
      assert.ok(!card(a).deep);
    }
  }
});

test('short of Signal: Scan is disabled and says why; the typed scan refuses the same way', () => {
  const { s, room } = sprawl();
  s.run.integrity = SCAN.signal;
  const btn = scanBtn(cardOf(s, room.id));
  assert.match(btn, / disabled title="Not enough Signal to scan\."/);
  assert.match(said(play(s, `scan ${room.dir}`)), /Not enough Signal to scan\./);
  assert.equal(s.run.integrity, SCAN.signal);
  // An Infiltrator scans free at any Signal.
  const t = sprawl('infiltrator').s;
  t.run.integrity = 1;
  assert.doesNotMatch(scanBtn(cardOf(t, FP.exits(t).find((x) => FP.known(t, x.id)).id)), /disabled/);
});

// The tour: "is it on screen" is the selector's last part (less any :not()) in the markup with the room's card open.
const shows = (html) => (sel) => {
  const last = sel.trim().split(/\s+/).at(-1).replace(/:not\([^)]*\)/g, '');
  const bits = [...last.matchAll(/\.([\w-]+)|\[([\w-]+)="([^"]+)"\]|#([\w-]+)/g)];
  return bits.length > 0 && bits.every(([, cls, attr, val, id]) => (cls ? new RegExp(`class="[^"]*\\b${cls}\\b`).test(html) : attr ? html.includes(`${attr}="${val}"`) : html.includes(`id="${id}"`)));
};

test('the rooms tour\'s scan step: after the walk step, on the first card with Scan; it moves on when you scan', () => {
  const step = TOUR.find((t) => t.id === 'tour-scan');
  assert.ok(step && step.page === 'rooms' && step.after.includes('tour-walk'));
  const { s, room } = sprawl();
  const u = ui();
  pickRoom(s, room.id, u);
  const html = roomsMarkup(s, u);
  assert.notEqual(nextTip(s, 'rooms', shows(html))?.id, 'tour-scan', 'never before the walk step');
  markSeen(s, 'tour-walk'); markSeen(s, 'tour-engage');
  const t = nextTip(s, 'rooms', shows(html));
  assert.equal(t.id, 'tour-scan');
  assert.equal(t.text, 'Scan a room next to you to read its virus before you walk in. It costs 1 Signal.');
  // The card closed: no step (it waits for the button).
  assert.notEqual(nextTip(s, 'rooms', shows(roomsMarkup(s)))?.id, 'tour-scan');
  const m = t.mark(s);
  assert.equal(t.done(s, m), false);
  play(s, `scan ${room.dir}`);
  assert.equal(t.done(s, m), true, 'scanned');
  // An Infiltrator's: free.
  const i = sprawl('infiltrator');
  markSeen(i.s, 'tour-walk'); markSeen(i.s, 'tour-engage');
  const v = ui();
  pickRoom(i.s, i.room.id, v);
  assert.equal(nextTip(i.s, 'rooms', shows(roomsMarkup(i.s, v))).text, 'Scan a room next to you to read its virus before you walk in. As an Infiltrator, you scan free and read deeper.');
});

test('SPRAWL-00 from a fresh connect: the scan step never comes before the walk step', () => {
  const s = newPlayer();
  play(s, 'connect sprawl');
  const all = (sel) => TOUR.some((x) => x.at === sel); // every tour step's thing on screen
  assert.equal(nextTip(s, 'rooms', all)?.id, 'tour-walk');
  markSeen(s, 'tour-walk');
  assert.notEqual(nextTip(s, 'rooms', all)?.id, 'tour-walk');
});
