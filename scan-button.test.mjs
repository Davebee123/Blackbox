// Scanning a room from its chip (run.mjs scanButton, floorplan-view.mjs roomSvg): a room next to you that you've been in
// and whose fight is up carries SCAN on its chip's bottom-right edge (on hover or focus; always on a phone's map), with
// its cost (FREE for an Infiltrator). A click runs scan <room>, the prompt's own command; a click anywhere else on the
// chip still walks in. A scan names every rule the virus carries, on its card and in the fight that follows
// (genome.mjs scannedRead). The rooms tour's scan step (tips.mjs tour-scan) points at SCAN and moves on when you scan.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, active, restore, encounterVirus } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import { GENES } from './dist/genes.mjs';
import { genomeCard, scannedRead, chipOf, virusGenes } from './dist/genome.mjs';
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
const wideOf = (html, map = 'wide') => html.match(new RegExp(`<svg class="fp-svg ${map}[\\s\\S]*?</svg>`))?.[0] || html;
// A room's chip, all of it (to its closing tag), on the wide map (or the tall one, a phone's).
function tileOf(html, id, map = 'wide') {
  const w = wideOf(html, map), at = w.indexOf(`data-room="${id}"`), a = at < 0 ? -1 : w.lastIndexOf('<g class="fp-room', at);
  if (a < 0) return '';
  let d = 0;
  for (const m of w.slice(a).matchAll(/<g\b|<\/g>/g)) { d += m[0] === '</g>' ? -1 : 1; if (!d) return w.slice(a, a + m.index + 4); }
  return w.slice(a);
}
const scanBtn = (html) => html.match(/<g class="fp-scanbtn[^"]*"[^>]*>[\s\S]*?<\/g>/)?.[0] || '';
const tileBtn = (s, id) => scanBtn(tileOf(roomsMarkup(s), id));
const said = (ev) => ev.map((e) => e.message).join('\n');

test('SCAN shows on the chip of a room next to you that scan reads, and nowhere else', () => {
  const { s, room } = sprawl();
  const R = s.rooms, g = R.graph;
  const tile = tileOf(roomsMarkup(s), room.id);
  assert.match(tile, new RegExp(`^<g class="fp-room[^"]*\\breach\\b[^"]*" data-room="${room.id}" data-rooms="go" data-arg="${room.id}"`), 'one click on the chip still walks in');
  const btn = scanBtn(tile);
  assert.match(btn, new RegExp(`data-command="scan ${room.dir}"`), 'it runs the prompt\'s scan <room>');
  assert.match(btn, />SCAN −1<\/text>/, 'its cost, as the corner badge shows a step\'s');
  assert.match(btn, /title="Scan: read its virus card before you walk in\.\nIt costs 1 Signal\."/);
  assert.doesNotMatch(btn, /aria-disabled/);
  assert.doesNotMatch(cardOf(s, room.id), /fp-scan|data-command/, 'nothing on the pop-up card');
  // Your own room: no SCAN (typed scan still reads it).
  assert.equal(scanButton(s, g.rooms[R.at]), null);
  assert.equal(tileBtn(s, R.at), '');
  // A room next to you you've never been in: unknown, nothing to read.
  const unknown = FP.exits(s).find((x) => !FP.known(s, x.id));
  assert.ok(unknown);
  assert.equal(scanButton(s, unknown), null);
  assert.equal(tileBtn(s, unknown.id), '');
  // A room you've been in that isn't next to you: no SCAN.
  const far = FP.roomList(s).find((x) => x.id !== R.at && !FP.neighbours(g, R.at).includes(x.id) && x.kind === 'process');
  R.seen[far.id] = 'kind';
  assert.ok(FP.isUp(s, far), 'its fight is up: only the distance keeps SCAN off');
  assert.equal(scanButton(s, far), null);
  assert.equal(tileBtn(s, far.id), '');
  // Its fight down: hidden, not disabled (its ring takes that corner).
  Object.assign(s.zone.spawns[room.path0], { alive: false, respawnAt: Date.now() + 3600000 });
  assert.equal(FP.isUp(s, room), false);
  assert.equal(scanButton(s, room), null);
  assert.equal(tileBtn(s, room.id), '');
  // The rooms playtest (no run, no prompt scan): none.
  const p = fresh();
  FP.startRooms(p, { seed: 3, kind: 'Mailhub', size: 'small', level: 5, floor: 1 });
  FP.connect(p);
  const next = FP.exits(p)[0];
  p.rooms.seen[next.id] = 'kind';
  assert.equal(tileBtn(p, next.id), '');
});

test('SCAN sits clear of the cost badge, the name plate and the address, on the wide map and a phone\'s', () => {
  for (const cls of [null, 'infiltrator']) { // SCAN −1, and the wider SCAN FREE
    const { s, room } = sprawl(cls);
    delete s.rooms.visit.walked[room.id]; // a first step in this visit: its cost badge on the corner
    for (const map of ['wide', 'tall']) {
      const tile = tileOf(roomsMarkup(s), room.id, map);
      const box = (re) => { const m = tile.match(re); return m && { x: +m[1], y: +m[2], w: +m[3], h: +m[4] }; };
      const scan = box(/class="fp-scanbtn[^"]*"[^>]*><rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/);
      const plate = box(/<rect class="fp-plate" x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/);
      const cost = box(/class="fp-cost"><rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/);
      const addr = box(/class="fp-addr[^"]*"><rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"/);
      const apart = (a, b) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
      assert.ok(scan && plate && cost && addr, `${map}: drawn`);
      assert.ok(apart(scan, plate), `${map}: clear of the name`);
      assert.ok(apart(scan, cost), `${map}: clear of the cost`);
      assert.ok(apart(scan, addr), `${map}: clear of the address`);
    }
  }
});

test('with a virus in front of you, or mid-fight: no SCAN', () => {
  const { s, room } = sprawl();
  FP.act(s, 'go', room.id);
  for (const id of FP.neighbours(s.rooms.graph, s.rooms.at)) s.rooms.seen[id] = 'kind';
  assert.doesNotMatch(roomsMarkup(s), /fp-scanbtn/, 'no room is a step away until you engage or step back');
  FP.act(s, 'engage');
  assert.ok(active(s));
  for (const id of FP.neighbours(s.rooms.graph, s.rooms.at)) assert.equal(scanButton(s, s.rooms.graph.rooms[id]), null);
  assert.doesNotMatch(roomsMarkup(s), /fp-scanbtn/);
});

test('a click on SCAN is the typed scan: the same card, 1 Signal; an Infiltrator\'s is free and reads deeper', () => {
  for (const cls of [null, 'infiltrator']) {
    const { s, room } = sprawl(cls);
    const cmd = tileBtn(s, room.id).match(/data-command="([^"]+)"/)[1];
    assert.equal(cmd, `scan ${room.dir}`);
    const typed = restore(JSON.parse(JSON.stringify(s)));
    const sig = s.run.integrity;
    const a = play(s, cmd), b = play(typed, `scan ${room.dir}`);
    const card = (ev) => ev.find((e) => e.type === 'net-scan')?.card;
    assert.ok(card(a), 'a scan card');
    assert.deepEqual(card(a), card(b), 'the same card as typing it');
    assert.equal(s.run.integrity, typed.run.integrity);
    assert.deepEqual(s.run.unpack, typed.run.unpack, 'a Packer unpacked as before');
    assert.equal(s.run.unpack.length, 1);
    assert.equal(s.run.scans, 1);
    if (cls === 'infiltrator') {
      assert.equal(s.run.integrity, sig, 'free');
      assert.ok(card(a).deep, 'deeper');
      assert.equal(s.run.scanned.length, 1);
      const btn = tileBtn(s, room.id);
      assert.match(btn, />SCAN FREE<\/text>/);
      assert.match(btn, /As an Infiltrator, you scan free and read deeper\./);
    } else {
      assert.equal(s.run.integrity, sig - SCAN.signal, '1 Signal');
      assert.ok(!card(a).deep);
    }
  }
});

test('short of Signal: SCAN is off and says why, and a click on it never walks in; the typed scan refuses the same way', () => {
  const { s, room } = sprawl();
  s.run.integrity = SCAN.signal;
  const btn = tileBtn(s, room.id);
  assert.match(btn, /class="fp-scanbtn off" aria-disabled="true"/);
  assert.doesNotMatch(btn, /data-command|data-rooms/, 'no command, and nothing to walk on');
  assert.match(btn, /title="Not enough Signal to scan\."/);
  assert.match(said(play(s, `scan ${room.dir}`)), /Not enough Signal to scan\./);
  assert.equal(s.run.integrity, SCAN.signal);
  // An Infiltrator scans free at any Signal.
  const t = sprawl('infiltrator');
  t.s.run.integrity = 1;
  assert.doesNotMatch(tileBtn(t.s, t.room.id), /aria-disabled/);
});

test('a scan names every rule the virus carries, on its card and in the fight; what each does still waits for the Codex', () => {
  const { s, room } = sprawl();
  const f = FP.fightOf(s, room), v = encounterVirus(s, f.key, f.seed, f.opts);
  assert.equal(scannedRead(s, v), false);
  const before = genomeCard(s, v);
  assert.ok(before.genes.some((x) => !x.name), 'a rule not yet met: ???');
  const card = play(s, `scan ${room.dir}`).find((e) => e.type === 'net-scan').card;
  assert.ok(scannedRead(s, v));
  for (const c of card.genes) assert.ok(c.name, `${c.id}: named`);
  for (const c of card.genes.filter((x) => x.state !== 'decoded' && !(GENES[x.id].mutation && x.state !== 'unknown'))) assert.equal(c.rule, null, `${c.id}: what it does waits for the Codex`);
  assert.deepEqual(card.tells, before.tells, 'its tells as before');
  // Another virus you haven't scanned: ??? as before.
  assert.equal(scannedRead(s, { id: 'other' }), false);
  // The fight that follows: the same virus, its rules named, a Packer unpacked.
  FP.act(s, 'go', room.id);
  FP.act(s, 'engage');
  assert.ok(active(s));
  assert.equal(s.encounter.virus.id, v.id);
  assert.ok(scannedRead(s, s.encounter.virus));
  assert.ok(s.encounter.unpacked, 'scanned before the fight: a Packer hides nothing');
  for (const g of virusGenes(s.encounter.virus)) assert.ok(chipOf(s, g.id, g.src, false, true).name);
});

// The tour: "is it on screen" is the selector's last part (less any :not()) in the markup.
const shows = (html) => (sel) => {
  const last = sel.trim().split(/\s+/).at(-1).replace(/:not\([^)]*\)/g, '');
  const bits = [...last.matchAll(/\.([\w-]+)|\[([\w-]+)="([^"]+)"\]|#([\w-]+)/g)];
  return bits.length > 0 && bits.every(([, cls, attr, val, id]) => (cls ? new RegExp(`class="[^"]*\\b${cls}\\b`).test(html) : attr ? html.includes(`${attr}="${val}"`) : html.includes(`id="${id}"`)));
};

test('the rooms tour\'s scan step: after the walk step, at SCAN on the first room it reads; it moves on when you scan', () => {
  const step = TOUR.find((t) => t.id === 'tour-scan');
  assert.ok(step && step.page === 'rooms' && step.after.includes('tour-walk'));
  assert.equal(step.at, '.fp-scanbtn:not([aria-disabled])');
  assert.equal(step.also, '.fp-room.reach', 'walking in instead closes it');
  const { s, room } = sprawl();
  const html = roomsMarkup(s);
  assert.notEqual(nextTip(s, 'rooms', shows(html))?.id, 'tour-scan', 'never before the walk step');
  markSeen(s, 'tour-walk'); markSeen(s, 'tour-engage');
  const t = nextTip(s, 'rooms', shows(html));
  assert.equal(t.id, 'tour-scan');
  assert.equal(t.text, 'Scan a room next to you to read its virus before you walk in. It costs 1 Signal.');
  // No room it reads: no step.
  const down = restore(JSON.parse(JSON.stringify(s)));
  Object.assign(down.zone.spawns[room.path0], { alive: false, respawnAt: Date.now() + 3600000 });
  assert.notEqual(nextTip(down, 'rooms', shows(roomsMarkup(down)))?.id, 'tour-scan');
  const m = t.mark(s);
  assert.equal(t.done(s, m), false);
  play(s, `scan ${room.dir}`);
  assert.equal(t.done(s, m), true, 'scanned');
  // An Infiltrator's: free.
  const i = sprawl('infiltrator');
  markSeen(i.s, 'tour-walk'); markSeen(i.s, 'tour-engage');
  assert.equal(nextTip(i.s, 'rooms', shows(roomsMarkup(i.s))).text, 'Scan a room next to you to read its virus before you walk in. As an Infiltrator, you scan free and read deeper.');
});

test('SPRAWL-00 from a fresh connect: the scan step never comes before the walk step', () => {
  const s = newPlayer();
  play(s, 'connect sprawl');
  const all = (sel) => TOUR.some((x) => x.at === sel); // every tour step's thing on screen
  assert.equal(nextTip(s, 'rooms', all)?.id, 'tour-walk');
  markSeen(s, 'tour-walk');
  assert.notEqual(nextTip(s, 'rooms', all)?.id, 'tour-walk');
});
