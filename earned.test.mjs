// Earned pieces (earned.mjs, GAME_RULES.md *Earned pieces*): one unique a floor for its feat, on a count from the floor's
// band, the piece once when it fills, never a roll; the floor goals; pins.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, hackerOf, command, restore, uniqueFrom, guardedUnique, hooks, UNIQUES } from './dist/combat.mjs';
import './dist/netrooms.mjs';
import { EARNED, earnedOf, earnEvent, earnTick, pinsOf, bandOf, cellsOf, floorElites, PIN_MAX } from './dist/earned.mjs';
import { SETS, isPiece } from './dist/sets.mjs';
import { graphOf, serverSlot } from './dist/floors.mjs';
import { fxText, fxList, checkItems } from './dist/content.mjs';
import { BASES, STATS } from './dist/gear.mjs';
import ITEMS from './dist/content/items.mjs';
import EARN from './dist/content/earned.mjs';
import { collectionPageMarkup } from './dist/collection-view.mjs';
import { mapMarkup, mapChips } from './dist/view.mjs';
import { logOf } from './dist/collection-log.mjs';

hooks.now = () => 2_000_000;
const at = (L) => { const s = fresh(); hackerOf(s).level = L; return s; };
const got = (s, id) => (s.stash || []).filter((x) => x.unique === id).length;
// A floor's server slots, each a located server with what the test gives it.
const slots = (s, f) => Object.entries(graphOf(s, f).nodes).filter(([, x]) => serverSlot(x)).map(([id, x]) => ({ id, lair: x.kind === 'lair' }));
const place = (s, f, n, more = () => ({})) => { s.locations ||= []; for (const [i, x] of slots(s, f).slice(0, n).entries()) s.locations.push({ id: 'L' + f + x.id, slot: x.id, depth: f, seed: i + 1, name: 'SRV-' + i, ...(x.lair ? { lair: 'x' } : {}), ...more(i, x) }); };

const FEATS = ['street-atlas', 'quiet-hours', 'sweetener', 'ring-main', 'mixed-bag', 'superuser', 'bottleneck', 'last-mile'];

test('one earned unique a floor, its floor\'s feat, never in a roll; the sets keep their rolls', () => {
  assert.deepEqual(EARNED.map((u) => u.id).sort(), [...FEATS].sort());
  assert.deepEqual(Object.keys(EARN).sort(), [...FEATS].sort(), 'every count in one table');
  assert.deepEqual(FEATS.map((id) => [UNIQUES[id].level, UNIQUES[id].sources[0].floor]), [[8, 1], [13, 2], [18, 3], [24, 4], [30, 5], [36, 6], [42, 7], [48, 8]]);
  for (const id of Object.values(SETS).flatMap((x) => x.pieces)) assert.ok(!UNIQUES[id].earn, `${id} rolls`);
  for (const u of EARNED) { assert.ok(!isPiece(u.id)); assert.ok(fxList(u).length && fxText(fxList(u)), `${u.id}: a rule`); }
  const s = at(50);
  for (let f = 1; f <= 8; f++) for (let i = 0; i < 300; i++) assert.ok(!guardedUnique(s, f, 50)?.earn, `a Guarded vault on floor ${f}`);
  for (let i = 0; i < 300; i++) assert.ok(!uniqueFrom(s, { kind: 'vault', layer: 9, floor: 7 }, 50)?.earn);
  assert.deepEqual(checkItems(ITEMS, BASES, STATS).filter((x) => x.bad && FEATS.includes(x.id)), [], 'the editor\'s checks pass');
});

test('a count starts at the band and the piece arrives once, through New in collection, at your level', () => {
  const s = at(10); // The Stacks' band starts at 13
  for (let i = 0; i < 12; i++) earnEvent(s, { kind: 'bait', floor: 3 });
  assert.equal(earnedOf(s, 'sweetener').n, 0, 'before the band: nothing counts');
  assert.equal(bandOf(UNIQUES.sweetener), 13);
  hackerOf(s).level = 16;
  for (let i = 0; i < 11; i++) earnEvent(s, { kind: 'bait', floor: 3 });
  earnEvent(s, { kind: 'bait', floor: 2 });
  const p = earnedOf(s, 'sweetener');
  assert.deepEqual([p.n, p.of, p.text, p.todo], [11, 12, 'Bait caches on Honeypots', 'Take 1 more bait cache on Honeypots']);
  earnEvent(s, { kind: 'bait', floor: 3 });
  assert.equal(got(s, 'sweetener'), 1);
  assert.equal(s.stash.find((x) => x.unique === 'sweetener').level, 18, 'at its level, or yours past it');
  assert.ok(s.collection.sweetener && s.logs.some((l) => l.type === 'collected' && l.unique === 'sweetener'));
  for (let i = 0; i < 12; i++) earnEvent(s, { kind: 'bait', floor: 3 });
  assert.equal(got(s, 'sweetener'), 1, 'once');
  // Found before: no second copy.
  const t = at(13); t.collection = { 'quiet-hours': 1 };
  for (let i = 0; i < 3; i++) earnEvent(t, { kind: 'router-vault', floor: 2 });
  assert.equal(got(t, 'quiet-hours'), 0);
  for (let i = 0; i < 3; i++) earnEvent(s, { kind: 'router-vault', floor: 2 });
  assert.equal(got(s, 'quiet-hours'), 1);
});

test('Mixed Bag counts different specials taken over on Deep Core, Guarded aside', () => {
  const t = at(28);
  earnEvent(t, { kind: 'takeover', floor: 4, special: ['rich', 'hostile'] }); // the wrong floor
  earnEvent(t, { kind: 'takeover', floor: 5, special: ['rich', 'hostile'] });
  earnEvent(t, { kind: 'takeover', floor: 5, special: ['rich', 'legacy'] });
  assert.equal(earnedOf(t, 'mixed-bag').n, 3);
  earnEvent(t, { kind: 'takeover', floor: 5, special: ['stable', 'volatile'] });
  earnEvent(t, { kind: 'takeover', floor: 5, special: ['backbone'] });
  assert.equal(got(t, 'mixed-bag'), 1);
});

test('the floor goals read the floor: mapped, held, Root 3, elite rooms; paid on the tick in band', () => {
  const s = at(8);
  place(s, 1, 9, () => ({ floorplan: { mapped: 1 } }));
  assert.deepEqual([earnedOf(s, 'street-atlas').n, earnedOf(s, 'street-atlas').of, earnedOf(s, 'street-atlas').text], [9, 10, 'Servers mapped on The Sprawl']);
  earnTick(s);
  assert.equal(got(s, 'street-atlas'), 0);
  s.locations.push({ id: 'last', slot: slots(s, 1)[9].id, depth: 1, seed: 9, floorplan: { mapped: 1 } });
  earnTick(s); earnTick(s);
  assert.equal(got(s, 'street-atlas'), 1);
  // Ring Main: 8 held on Coldline; Superuser: three at Root 3 on Kernel Space.
  const h = at(31);
  place(h, 4, 8, () => ({ takenOver: 1 }));
  place(h, 6, 3, (i) => ({ takenOver: 1, root: { level: i < 2 ? 3 : 2 } }));
  earnTick(h);
  assert.equal(got(h, 'ring-main'), 1);
  assert.equal(earnedOf(h, 'superuser').n, 2);
  // Bottleneck: every elite room on The Sink, every server located.
  const b = at(40);
  const rooms = (k) => ({ graph: { rooms: { a: { id: 'a', kind: 'elite' }, b: { id: 'b', kind: k }, c: { id: 'c', kind: 'process' } } }, cleared: { a: 1 } });
  place(b, 7, slots(b, 7).length - 1, () => ({ floorplan: rooms('elite') }));
  assert.equal(floorElites(b, 7).all, false);
  earnTick(b);
  assert.equal(got(b, 'bottleneck'), 0);
  for (const l of b.locations) l.floorplan.cleared.b = 1;
  b.locations.push({ id: 'z', slot: slots(b, 7).at(-1).id, depth: 7, seed: 99, floorplan: rooms('process') });
  const e = floorElites(b, 7);
  assert.ok(e.all && e.n === e.of);
  earnTick(b);
  assert.equal(got(b, 'bottleneck'), 1);
  // Last Mile: every server on Bedrock mapped (cleared); located isn't enough, nor before its band.
  const l = at(43);
  place(l, 8, slots(l, 8).length);
  earnTick(l);
  assert.equal(got(l, 'last-mile'), 0, 'located, not mapped');
  hackerOf(l).level = 40;
  for (const x of l.locations) x.floorplan = { mapped: 1 };
  earnTick(l);
  assert.equal(got(l, 'last-mile'), 0, 'before the band');
  hackerOf(l).level = 43; earnTick(l);
  assert.equal(got(l, 'last-mile'), 1);
});

test('pins: up to three from the Ledger, on the map under Contracts and in a phone chip, kept in the save', () => {
  const s = at(16);
  for (let i = 0; i < 4; i++) earnEvent(s, { kind: 'bait', floor: 3 });
  for (const id of ['sweetener', 'street-atlas', 'ring-main', 'last-mile']) command(s, 'pin ' + id);
  assert.deepEqual(pinsOf(s), ['sweetener', 'street-atlas', 'ring-main']);
  assert.ok(s.logs.at(-1).message.includes(`Pins are full (${PIN_MAX})`));
  command(s, 'unpin ring-main');
  assert.deepEqual(pinsOf(s), ['sweetener', 'street-atlas']);
  command(s, 'pin crowbar');
  assert.equal(pinsOf(s).length, 2, 'only an earned piece');
  const map = mapMarkup(s, 'server', 'mine');
  assert.match(map, /<section class="ctrack pins" aria-label="Pinned"><h3 class="ct-head">.*Pinned<small>2\/3<\/small><\/h3>/);
  assert.match(map, /class="ct-row pin-row" data-go="log:floor:3"[^>]*>.*<small class="ct-for">Floor feat<\/small><b>Sweetener<\/b>.*<span class="ecells uniq"[^>]*>(<i class="on"><\/i>){2}(<i><\/i>){4}<\/span><small class="pin-goal">Bait caches on Honeypots 4\/12<\/small>/, 'its goal in words, as the Ledger says it');
  assert.match(map, /<small class="pin-goal">Servers mapped on The Sprawl 0\/10<\/small>/);
  assert.match(mapChips(s), /class="ph-chip pin" data-phone="pins"[^>]*>.*<b>2<\/b><small>pinned<\/small>/);
  const r = restore(structuredClone(s));
  assert.deepEqual([pinsOf(r), r.earned.sweetener], [['sweetener', 'street-atlas'], 4]);
  for (let i = 0; i < 8; i++) earnEvent(s, { kind: 'bait', floor: 3 });
  assert.deepEqual(pinsOf(s), ['street-atlas'], 'earned, it drops off');
});

test('the Ledger names an earned piece from the start under its floor, with its cells, goal and pin', () => {
  const s = at(16);
  for (let i = 0; i < 4; i++) earnEvent(s, { kind: 'bait', floor: 3 });
  command(s, 'pin sweetener');
  const li = collectionPageMarkup(s, 'floor:3').match(/<li class="lg-line earn" title="Sweetener[^]*?<\/li>/)?.[0];
  assert.ok(li, 'named, never ???');
  assert.match(li, /title="Sweetener: Unique implant, level 18\.\n▸ Take 8 more bait caches on Honeypots\."/);
  assert.match(li, /<b class="lg-earn">Sweetener<\/b><span class="lg-goal"><span class="ecells uniq"[^>]*>(<i class="on"><\/i>){2}(<i><\/i>){4}<\/span><small>Bait caches on Honeypots 4\/12<\/small><\/span>/);
  assert.match(li, /class="lg-pin on" data-command="unpin sweetener" aria-pressed="true"/);
  assert.deepEqual(cellsOf(12, 24), [6, 12], 'past eight, a cell for two');
  assert.ok(logOf(s).flatMap((g) => g.rows).find((e) => e.key === 'floor:1').sections.some((x) => x.slots.some((y) => y.key === 'street-atlas')));
  for (let i = 0; i < 8; i++) earnEvent(s, { kind: 'bait', floor: 3 });
  assert.match(collectionPageMarkup(s, 'floor:3'), /<li class="lg-line got" title="Sweetener: Unique Implant, level 18\./, 'earned: it reads as any find');
});

test('the floor feats\' effects read as their rules', () => {
  assert.equal(fxText(fxList(UNIQUES['street-atlas'])), "Increases your damage by 10% when you fight in a room you haven't cleared.");
  assert.equal(fxText(fxList(UNIQUES['mixed-bag'])), "Increases your damage by 3% for each of the server's specials.");
  assert.equal(fxText(fxList(UNIQUES['ring-main'])), 'Adds 1 Block for every 5 servers you hold, up to 4.');
  assert.equal(fxText(fxList(UNIQUES.sweetener)), 'Heals 5% of your max Signal when you take a cache.');
});
