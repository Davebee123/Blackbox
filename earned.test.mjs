// Earned pieces (earned.mjs, GAME_RULES.md *Earned pieces*): a count from the band, the piece once when it fills, never
// a roll; the floor goals; pins.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, hackerOf, command, restore, setDropPool, uniqueFrom, guardedUnique, hooks, UNIQUES } from './dist/combat.mjs';
import './dist/netrooms.mjs';
import { EARNED, earnedOf, earnEvent, earnTick, pinsOf, bandOf, cellsOf, floorElites, PIN_MAX } from './dist/earned.mjs';
import { SETS, isPiece } from './dist/sets.mjs';
import { graphOf, serverSlot } from './dist/floors.mjs';
import { fxText, fxList, checkItems } from './dist/content.mjs';
import { BASES, STATS } from './dist/gear.mjs';
import ITEMS from './dist/content/items.mjs';
import EARN from './dist/content/earned.mjs';
import { collectionPageMarkup } from './dist/collection-view.mjs';
import { setLines, mapMarkup, mapChips } from './dist/view.mjs';
import { logOf } from './dist/collection-log.mjs';

hooks.now = () => 2_000_000;
const at = (L) => { const s = fresh(); hackerOf(s).level = L; return s; };
const got = (s, id) => (s.stash || []).filter((x) => x.unique === id).length;
// A floor's server slots, each a located server with what the test gives it.
const slots = (s, f) => Object.entries(graphOf(s, f).nodes).filter(([, x]) => serverSlot(x)).map(([id, x]) => ({ id, lair: x.kind === 'lair' }));
const place = (s, f, n, more = () => ({})) => { s.locations ||= []; for (const [i, x] of slots(s, f).slice(0, n).entries()) s.locations.push({ id: 'L' + f + x.id, slot: x.id, depth: f, seed: i + 1, name: 'SRV-' + i, ...(x.lair ? { lair: 'x' } : {}), ...more(i, x) }); };

const PLAN = { nightshift: [4, 8, 12], kestrel: [15, 15, 15], patchwork: [50, 50, 50, 15], lantern: [8, 16, 24], coldstorage: [12, 24, 36], overtime: [15, 15, 15, 15], burstbuffer: [10, 20, 30], hotspare: [8, 16], deeparchive: [15, 30, 45, 60] };
const FEATS = ['street-atlas', 'quiet-hours', 'sweetener', 'ring-main', 'mixed-bag', 'superuser', 'bottleneck', 'last-mile'];

test('the plan\'s pieces are earned: nine sets\' counts, Full Coverage and the eight floor feats, about 41, never in a roll', () => {
  for (const [set, ns] of Object.entries(PLAN)) assert.deepEqual(SETS[set].pieces.map((p) => UNIQUES[p].earn?.n), ns, set);
  assert.deepEqual(SETS.fullcoverage.pieces, ['plumb-line', 'field-book', 'hi-vis', 'datum']);
  assert.deepEqual(SETS.fullcoverage.pieces.map((p) => [UNIQUES[p].level, BASES[UNIQUES[p].base].slot]), [[26, 'exploit'], [29, 'script'], [33, 'shell'], [37, 'implant']]);
  assert.deepEqual(FEATS.map((id) => [UNIQUES[id].level, UNIQUES[id].sources[0].floor]), [[8, 1], [13, 2], [18, 3], [24, 4], [30, 5], [36, 6], [42, 7], [48, 8]]);
  assert.equal(EARNED.length, 41);
  // Bosses keep their rolls: no boss, lair, crew or GLASSJAW piece is earned.
  for (const id of ['bootdisk', 'hivemind', 'choirbook', 'glassceiling', 'oncall', 'mesh', 'bedrock', 'wrecking']) assert.ok(SETS[id].pieces.every((p) => !UNIQUES[p].earn), id);
  // Never in a roll: a set table, a random gold, a Guarded vault's floor unique.
  const s = at(50);
  for (const u of EARNED) {
    for (const src of u.sources) assert.ok(!setDropPool({ ...src, floor: [].concat(src.floor ?? 1)[0], layer: 9 }).some((x) => x.id === u.id), `${u.id}: no set roll`);
    assert.ok(fxList(u).length && fxText(fxList(u)), `${u.id}: a rule`);
  }
  for (let f = 1; f <= 8; f++) for (let i = 0; i < 300; i++) { const u = guardedUnique(s, f, 50); assert.ok(!u?.earn, `a Guarded vault on floor ${f}`); }
  for (let i = 0; i < 300; i++) { const u = uniqueFrom(s, { kind: 'vault', layer: 9, floor: 7 }, 50); assert.ok(!u?.earn); }
  assert.deepEqual(checkItems(ITEMS, BASES, STATS).filter((x) => x.bad && EARNED.some((u) => u.id === x.id)), [], 'the editor\'s checks pass');
});

test('a count starts at the band and the piece arrives once, through New in collection, at your level', () => {
  const s = at(20); // Overtime's band starts at 22
  for (let i = 0; i < 6; i++) earnEvent(s, { kind: 'puzzle', id: 'cascade' });
  assert.equal(earnedOf(s, 'time-clock').n, 0, 'before the band: nothing counts');
  assert.equal(EARN['time-clock'].n, UNIQUES['time-clock'].earn.n, 'the one table');
  assert.equal(bandOf(UNIQUES['time-clock']), 22);
  hackerOf(s).level = 25;
  for (let i = 0; i < 14; i++) earnEvent(s, { kind: 'puzzle', id: 'cascade' });
  earnEvent(s, { kind: 'puzzle', id: 'quarantine' });
  const p = earnedOf(s, 'time-clock');
  assert.deepEqual([p.n, p.of, p.text, p.short, p.todo], [14, 15, 'Cascade boards', 'Cascade', 'Win 1 more Cascade board']);
  assert.deepEqual(['freezer', 'kestrel-badge', 'plumb-line', 'index', 'sweetener'].map((id) => earnedOf(s, id).text), ['Vaults on Coldline', 'Bouncer kills', 'Servers mapped on Deep Core', 'Vaults on floors 7–8', 'Bait caches on Honeypots']);
  assert.equal(earnedOf(s, 'punch-card').n, 1, 'a board of its own kind');
  earnEvent(s, { kind: 'puzzle', id: 'cascade' });
  assert.equal(got(s, 'time-clock'), 1);
  assert.equal(s.stash.find((x) => x.unique === 'time-clock').level, 25, 'at your level');
  assert.ok(s.collection['time-clock'] && s.logs.some((l) => l.type === 'collected' && l.unique === 'time-clock'));
  for (let i = 0; i < 12; i++) earnEvent(s, { kind: 'puzzle', id: 'cascade' });
  assert.equal(got(s, 'time-clock'), 1, 'once');
  assert.ok(earnedOf(s, 'time-clock').got);
  // A piece already found keeps its place: no count, no second copy.
  const t = at(30); t.collection = { 'late-pass': 1 };
  for (let i = 0; i < 15; i++) earnEvent(t, { kind: 'puzzle', id: 'sweep' });
  assert.equal(got(t, 'late-pass'), 0);
});

test('a shared source pays in order (Night Shift 4, 8, 12), and its floors count, no others', () => {
  const s = at(9);
  for (let i = 0; i < 3; i++) earnEvent(s, { kind: 'thread', floor: 3 });
  assert.equal(earnedOf(s, 'timecard').n, 0);
  const paid = [];
  for (let i = 0; i < 12; i++) paid.push(earnEvent(s, { kind: 'thread', floor: 2 }).map((it) => it.unique).join());
  assert.deepEqual(paid.map((x, i) => x && `${i + 1}:${x}`).filter(Boolean), ['4:timecard', '8:night-light', '12:thermos']);
});

test('distinct counts: Seam\'s fifteen different strains, Mixed Bag\'s specials (Guarded aside)', () => {
  const s = at(12);
  for (let i = 0; i < 20; i++) earnEvent(s, { kind: 'strain', lineage: 'worm', strain: 'floodgate' });
  assert.equal(earnedOf(s, 'seam').n, 1);
  assert.equal(earnedOf(s, 'darn').n, 20, 'and worm strains for the Darn');
  for (let i = 0; i < 14; i++) earnEvent(s, { kind: 'strain', lineage: 'worm', strain: 'strain-' + i });
  assert.equal(got(s, 'seam'), 1);
  const t = at(28);
  earnEvent(t, { kind: 'takeover', floor: 4, special: ['rich', 'hostile'] }); // the wrong floor
  earnEvent(t, { kind: 'takeover', floor: 5, special: ['rich', 'hostile'] });
  earnEvent(t, { kind: 'takeover', floor: 5, special: ['rich', 'legacy'] });
  assert.equal(earnedOf(t, 'mixed-bag').n, 3);
  assert.equal(earnedOf(t, 'standby').n, 2, 'a takeover on floor 5 counts for Hot Spare');
  earnEvent(t, { kind: 'takeover', floor: 5, special: ['stable', 'volatile'] });
  earnEvent(t, { kind: 'takeover', floor: 5, special: ['backbone'] });
  assert.equal(got(t, 'mixed-bag'), 1);
});

test('the activity counters: Honeypot bait, Router vaults banked unseen', () => {
  const s = at(16);
  for (let i = 0; i < 11; i++) earnEvent(s, { kind: 'bait', floor: 3 });
  earnEvent(s, { kind: 'bait', floor: 2 });
  assert.equal(earnedOf(s, 'sweetener').n, 11);
  earnEvent(s, { kind: 'bait', floor: 3 });
  assert.equal(got(s, 'sweetener'), 1);
  for (let i = 0; i < 3; i++) earnEvent(s, { kind: 'router-vault', floor: 2 });
  assert.equal(got(s, 'quiet-hours'), 1);
});

test('the floor goals read the floor: mapped, held, Root 3, elite rooms; paid on the tick in band', () => {
  const s = at(8);
  place(s, 1, 9, () => ({ floorplan: { mapped: 1 } }));
  assert.deepEqual([earnedOf(s, 'street-atlas').n, earnedOf(s, 'street-atlas').of], [9, 10]);
  earnTick(s);
  assert.equal(got(s, 'street-atlas'), 0);
  s.locations.push({ id: 'last', slot: slots(s, 1)[9].id, depth: 1, seed: 9, floorplan: { mapped: 1 } });
  earnTick(s); earnTick(s);
  assert.equal(got(s, 'street-atlas'), 1);
  // Ring Main: 8 held on Coldline; Superuser: three at Root 3 on Kernel Space.
  const h = at(26);
  place(h, 4, 8, (i) => ({ takenOver: 1 }));
  place(h, 6, 3, (i) => ({ takenOver: 1, root: { level: i < 2 ? 3 : 2 } }));
  earnTick(h);
  assert.equal(got(h, 'ring-main'), 1);
  assert.equal(earnedOf(h, 'superuser').n, 2);
  // Full Coverage: 8 mapped on Deep Core, then all of it.
  const m = at(30);
  place(m, 5, 8, () => ({ floorplan: { mapped: 1 } }));
  earnTick(m);
  assert.deepEqual([got(m, 'plumb-line'), got(m, 'field-book')], [1, 0]);
  assert.equal(earnedOf(m, 'field-book').of, slots(m, 5).length, 'all: every server and the lair');
  // Bottleneck: every elite room on The Sink, every server located.
  const b = at(40);
  const rooms = (k) => ({ graph: { rooms: { a: { id: 'a', kind: 'elite' }, b: { id: 'b', kind: k }, c: { id: 'c', kind: 'process' } } }, cleared: { a: 1 } });
  place(b, 7, slots(b, 7).length - 1, () => ({ floorplan: rooms('elite') }));
  let e = floorElites(b, 7);
  assert.equal(e.all, false);
  earnTick(b);
  assert.equal(got(b, 'bottleneck'), 0);
  for (const l of b.locations) l.floorplan.cleared.b = 1;
  b.locations.push({ id: 'z', slot: slots(b, 7).at(-1).id, depth: 7, seed: 99, floorplan: rooms('process') });
  e = floorElites(b, 7);
  assert.ok(e.all && e.n === e.of);
  earnTick(b);
  assert.equal(got(b, 'bottleneck'), 1);
  // Last Mile: every server on Bedrock mapped (cleared); located isn't enough, nor before its band.
  const l = at(40);
  place(l, 8, slots(l, 8).length);
  hackerOf(l).level = 43; earnTick(l);
  assert.equal(got(l, 'last-mile'), 0, 'located, not mapped');
  hackerOf(l).level = 40;
  for (const x of l.locations) x.floorplan = { mapped: 1 };
  earnTick(l);
  assert.equal(got(l, 'last-mile'), 0, 'before the band');
  hackerOf(l).level = 43; earnTick(l);
  assert.equal(got(l, 'last-mile'), 1);
});

test('pins: up to three from the Ledger, on the map under Contracts and in a phone chip, kept in the save', () => {
  const s = at(24);
  for (let i = 0; i < 4; i++) earnEvent(s, { kind: 'puzzle', id: 'cascade' });
  for (const id of ['time-clock', 'street-atlas', 'ring-main', 'datum']) command(s, 'pin ' + id);
  assert.deepEqual(pinsOf(s), ['time-clock', 'street-atlas', 'ring-main']);
  assert.ok(s.logs.at(-1).message.includes(`Pins are full (${PIN_MAX})`));
  command(s, 'unpin ring-main');
  assert.deepEqual(pinsOf(s), ['time-clock', 'street-atlas']);
  command(s, 'pin hive-mind-not-a-piece');
  assert.equal(pinsOf(s).length, 2);
  const map = mapMarkup(s, 'server', 'mine');
  assert.match(map, /<section class="ctrack pins" aria-label="Pinned"><h3 class="ct-head">.*Pinned<small>2\/3<\/small><\/h3>/);
  assert.match(map, /class="ct-row pin-row set" data-go="log:other:puzzle"[^>]*>.*<small class="ct-for">Overtime<\/small><b>Time Clock<\/b>.*<span class="ecells set"[^>]*>(<i class="on"><\/i>){2}(<i><\/i>){6}<\/span><small class="pin-goal">Cascade boards 4\/15<\/small>/, 'the goal in words, as the Ledger says it');
  assert.match(map, /class="ct-row pin-row" data-go="log:floor:1"[^>]*>.*<small class="ct-for">Floor feat<\/small><b>Street Atlas<\/b>.*<small class="pin-goal">Servers mapped on The Sprawl 0\/10<\/small>/, 'a floor unique\'s row: amber, Floor feat over it, its goal in words');
  assert.match(mapChips(s), /class="ph-chip pin" data-phone="pins"[^>]*>.*<b>2<\/b><small>pinned<\/small>/);
  const r = restore(structuredClone(s));
  assert.deepEqual([pinsOf(r), r.earned['time-clock']], [['time-clock', 'street-atlas'], 4]);
  // Earned, it drops off the pins.
  for (let i = 0; i < 11; i++) earnEvent(s, { kind: 'puzzle', id: 'cascade' });
  assert.deepEqual(pinsOf(s), ['street-atlas']);
});

test('the Ledger names an earned piece from the start, its cells and goal; the datasheet keeps its line with the count', () => {
  const s = at(24);
  for (let i = 0; i < 4; i++) earnEvent(s, { kind: 'puzzle', id: 'cascade' });
  command(s, 'pin time-clock');
  const html = collectionPageMarkup(s, 'other:puzzle');
  const li = html.match(/<li class="lg-line earn set" title="Time Clock[^]*?<\/li>/)?.[0];
  assert.ok(li, 'named, never ???');
  assert.match(li, /title="Time Clock: Implant from the Overtime set, level 24\.\n▸ Win 11 more Cascade boards\."/);
  assert.match(li, /<b class="lg-earn">Time Clock<\/b><span class="lg-goal"><span class="ecells set"[^>]*>(<i class="on"><\/i>){2}(<i><\/i>){6}<\/span><small>Cascade boards 4\/15<\/small><\/span>/);
  assert.match(li, /class="lg-pin on" data-command="unpin time-clock" aria-pressed="true"/);
  assert.deepEqual(cellsOf(12, 24), [6, 12], 'past eight, a cell for two');
  // A floor's feat: under its floor, amber cells.
  assert.match(collectionPageMarkup(s, 'floor:4'), /<b class="lg-earn">Ring Main<\/b><span class="lg-goal"><span class="ecells uniq"/);
  assert.ok(logOf(s).flatMap((g) => g.rows).find((e) => e.key === 'floor:1').sections.some((x) => x.slots.some((y) => y.key === 'street-atlas')));
  // Earned: it reads as any find.
  for (let i = 0; i < 11; i++) earnEvent(s, { kind: 'puzzle', id: 'cascade' });
  assert.match(collectionPageMarkup(s, 'other:puzzle'), /<li class="lg-line got set" title="Time Clock: Implant from the Overtime set/);
  // The datasheet: each missing earned piece on its line, its goal and count right-aligned.
  const lines = setLines(s, 'time-clock');
  assert.match(lines, /<span class="sp unknown earned"[^>]*><span>Late Pass<\/span><small class="sp-goal">Ping sweep 0\/15<\/small><\/span>/);
  assert.doesNotMatch(lines, /\?\?\?/);
});

test('the floor feats\' effects read and hold: a room not cleared, a server you hold, its specials', () => {
  assert.equal(fxText(fxList(UNIQUES['street-atlas'])), "Increases your damage by 10% when you fight in a room you haven't cleared.");
  assert.equal(fxText(fxList(UNIQUES['mixed-bag'])), "Increases your damage by 3% for each of the server's specials.");
  assert.equal(fxText(fxList(UNIQUES['ring-main'])), 'Adds 1 Block for every 5 servers you hold, up to 4.');
  assert.equal(fxText(fxList(UNIQUES['sweetener'])), 'Heals 5% of your max Signal when you take a cache.');
  assert.ok(isPiece('datum') && !isPiece('street-atlas'));
});
