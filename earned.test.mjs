// Earned pieces (earned.mjs, GAME_RULES.md *Earned pieces*): one unique a floor for its feat, on a count from the floor's
// band, the piece once when it fills, never a roll; the floor goals; pins.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, hackerOf, command, restore, uniqueFrom, guardedUnique, hooks, UNIQUES, selectEncounter, livingParts, delayAttack, fxHolds, addItem, gearStat } from './dist/combat.mjs';
import './dist/netrooms.mjs';
import { EARNED, earnedOf, earnEvent, earnTick, pinsOf, bandOf, cellsOf, floorElites, PIN_MAX } from './dist/earned.mjs';
import { SETS, isPiece } from './dist/sets.mjs';
import { graphOf, serverSlot } from './dist/floors.mjs';
import { fxText, fxList, checkItems } from './dist/content.mjs';
import { BASES, STATS, uniqueItem, seeded } from './dist/gear.mjs';
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

test('the earned pieces: the floor feats, the floors\' own and the cross-floor ones, never in a roll; the drop sets keep theirs', () => {
  assert.deepEqual(EARNED.map((u) => u.id).sort(), Object.keys(EARN).sort(), 'every count in one table');
  assert.equal(EARNED.length, 38);
  for (const id of FEATS) assert.ok(EARN[id], id);
  assert.deepEqual(FEATS.map((id) => [UNIQUES[id].level, UNIQUES[id].sources[0].floor]), [[8, 1], [13, 2], [18, 3], [24, 4], [30, 5], [36, 6], [42, 7], [48, 8]]);
  for (const set of Object.values(SETS)) { const earned = set.pieces.filter((p) => UNIQUES[p].earn).length; assert.ok(earned === 0 || earned === set.pieces.length, `${set.id}: all earned or none`); }
  assert.deepEqual(Object.values(SETS).filter((x) => x.pieces.every((p) => UNIQUES[p].earn)).map((x) => x.id).sort(), ['atoll', 'bootloader', 'coldstart', 'fullcoverage', 'longhaul', 'switchback', 'tenure']);
  for (const u of EARNED) assert.ok(fxList(u).length && fxText(fxList(u)), `${u.id}: a rule`);
  // A cross-floor piece is stronger: its slot's stats ×1.1 (a floor's own ×1).
  const main = (u) => [].concat(Object.values(u.primary)[0])[0];
  assert.ok(main(UNIQUES['field-book']) > main(UNIQUES.grub) * 0.9 && UNIQUES.sampler.sources[0].floor == null && UNIQUES.regular.sources[0].floor === 1);
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

// The event counts, table-driven: each piece counted by events pays at its n, not before, from its band.
test('every event-counted piece pays at its count: the floors\' own and the cross-floor ones', () => {
  for (const u of EARNED.filter((x) => x.earn.on)) {
    const s = at(50), src = u.earn.on[0], E = u.earn;
    const ctx = (i) => ({ ...src, floor: Array.isArray(src.floor) ? src.floor[0] : src.floor ?? 1, ...(src.kind === 'takeover' ? { special: ['rich', 'hostile', 'legacy', 'stable', 'volatile', 'backbone'].slice(i, i + 1) } : {}), ...(E.distinct === 'id' ? { id: ['quarantine', 'chase', 'cascade', 'sweep', 'routing', 'deadlock', 'cryptogram', 'terminal'][i] } : {}), ...(E.distinct === 'strain' ? { strain: 'strain-' + i } : {}) });
    for (let i = 0; i < E.n - 1; i++) earnEvent(s, ctx(i));
    assert.equal(got(s, u.id), 0, `${u.id}: not before ${E.n}`);
    assert.equal(earnedOf(s, u.id).n, E.n - 1, `${u.id}: counted`);
    earnEvent(s, ctx(E.n - 1));
    assert.equal(got(s, u.id), 1, `${u.id}: at ${E.n}`);
  }
  // A floor's own counts on that floor only: Switchback's Hunter chase boards on Backhaul.
  const t = at(12);
  earnEvent(t, { kind: 'puzzle', id: 'chase', floor: 3 });
  earnEvent(t, { kind: 'puzzle', id: 'cascade', floor: 2 });
  assert.equal(earnedOf(t, 'dead-end').n, 0);
  assert.equal(earnedOf(t, 'sampler').n, 0, 'before its band');
});

test('the new floor goals: Honeypots mapped, Bedrock\'s islands, Root 5 anywhere', () => {
  const h = at(16);
  place(h, 3, 6, (i) => ({ floorplan: { mapped: 1, kind: i < 4 ? 'Honeypot' : 'Mirror' } }));
  assert.deepEqual([earnedOf(h, 'honeycomb').n, earnedOf(h, 'honeycomb').text], [4, 'Honeypots mapped']);
  earnTick(h);
  assert.equal(got(h, 'honeycomb'), 0);
  h.locations[4].floorplan.kind = 'Honeypot'; earnTick(h);
  assert.equal(got(h, 'honeycomb'), 1);
  const b = at(45);
  place(b, 8, 18);
  for (const id of ['f8-0', 'f8-5', 'f8-10']) b.locations.find((l) => l.slot === id).floorplan = { mapped: 1 };
  earnTick(b);
  assert.deepEqual([got(b, 'lagoon'), got(b, 'reef'), got(b, 'causeway')], [1, 1, 0], 'three of the four islands');
  assert.equal(earnedOf(b, 'causeway').of, 4);
  const r = at(40);
  place(r, 4, 2, () => ({ takenOver: 1, root: { level: 5 } }));
  place(r, 7, 1, () => ({ takenOver: 1, root: { level: 5 } }));
  place(r, 2, 1, () => ({ takenOver: 1, root: { level: 4 } }));
  earnTick(r);
  assert.deepEqual([got(r, 'freehold'), got(r, 'deed'), earnedOf(r, 'sitting-tenant').text], [1, 1, 'Servers at Root 5']);
});

test('the new effects read and hold: echo, delays, the first cycles, held servers, contracts', () => {
  assert.equal(fxText(fxList(UNIQUES.regular)), 'Adds 5% Echo. Makes your first echo on each part hit for full damage.');
  assert.equal(fxText(fxList(UNIQUES.honeycomb)), 'Your Block counts double for the first 3 cycles of a fight.');
  assert.equal(fxText(fxList(UNIQUES['no-rest'])), "Increases your max Signal by 6% while you haven't rested this visit. Adds 1 Regen while you haven't rested this visit.");
  // Switchback (3): the cycle after a delay lands.
  const s = at(30);
  for (const id of ['honeycomb', 'late-pass']) { const it = addItem(s, uniqueItem(UNIQUES[id], 30, seeded(1))); command(s, 'load ' + it.id); } // Late Pass: a proxy with Block
  selectEncounter(s, 'cryptjack', 3, { level: 14, mutation: null }); command(s, 'engage');
  const e = s.encounter, p = livingParts(s).find((x) => x.attack);
  e.cycle = 4; delayAttack(s, p, 1);
  assert.equal(e.delayedAt, 4);
  e.cycle = 5; assert.ok(fxHolds(s, { if: 'after-delay' }));
  e.cycle = 6; assert.ok(!fxHolds(s, { if: 'after-delay' }));
  assert.ok(!fxHolds(s, { if: 'early' }) && (e.cycle = 3, fxHolds(s, { if: 'early' })));
  // Honeycomb doubles your Block in the first 3 cycles.
  e.cycle = 2; const early = gearStat(s, 'reduction'); e.cycle = 5; const late = gearStat(s, 'reduction');
  assert.ok(late > 0 && early === late * 2, `${early} against ${late}`);
});
