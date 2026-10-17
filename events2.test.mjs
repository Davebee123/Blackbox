// The newer event cards (events.mjs): feud, bounty hunt, market shock, spotter.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, active, resolveCycle, addLocation } from './dist/combat.mjs';
import { deal, eventsOf, tickEvents, CARDS, FEUD, HUNT, SHOCK, huntPay, feuds } from './dist/events.mjs';
import { rep, FACTIONS } from './dist/factions.mjs';
import { FACTION_FAMILY } from './dist/hubs.mjs';
import { priceOf, WARE_IDS } from './dist/market.mjs';
import { play } from './dist/run.mjs';
import { SCOUTED, KINDS } from './dist/invasion.mjs';
import { mapMarkup } from './dist/view.mjs';
import { logComms, commsOf } from './dist/comms.mjs';

const MIN = 60000;
// Two traced servers (connected: they send invasions), the board open, Halcyon's hub (always known) and the ones asked for.
const world = ({ level = 9, hubs = [] } = {}) => {
  const s = fresh(); s.tutorialCompleted = true; s.hackers = { breaker: { level, xp: 0 } };
  addLocation(s, 'worm'); addLocation(s, 'ransomware');
  s.locations.forEach((l) => { l.rogue = false; l.runs = 1; });
  command(s, 'mail'); s.mail.boardOpen = true;
  s.hubFound = Object.fromEntries(hubs.map((f) => [f, true]));
  s.market = { pressure: {}, transfers: [], serial: 0, event: 'calm', eventUntil: Infinity, at: null };
  s.director = { next: 9e9, n: 0, last: null }; // nothing dealt on its own while a test runs the clock
  return s;
};
const win = (s) => {
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: 1, attack: null });
  for (let i = 0; i < 6 && active(s); i++) { const p = s.encounter.virus.parts.find((x) => x.integrity > 0); command(s, 'spike ' + p.id); resolveCycle(s); }
};
const can = (s, card) => CARDS[card].where(s).length > 0;

test('each new card deals only when its conditions hold', () => {
  // Feud: level 8, two located hubs that are rivals.
  assert.ok(!can(world({ level: 7, hubs: ['glassjaw'] }), 'feud'), 'not before level 8');
  assert.ok(!can(world({ hubs: ['kestrel', 'lantern'] }), 'feud'), 'Halcyon, Kestrel and LANTERN: no two are rivals');
  assert.deepEqual(feuds(world({ hubs: ['kestrel', 'lantern'] })), []);
  assert.ok(can(world({ hubs: ['glassjaw'] }), 'feud'), 'Halcyon and GLASSJAW are rivals');
  { const s = world({ hubs: ['glassjaw'] }); s.mail.boardOpen = false; s.mail.story = 0; assert.ok(!can(s, 'feud'), 'no hubs before the board'); }
  // Hunt: level 6, two traced servers to hop between.
  assert.ok(!can(world({ level: 5 }), 'hunt'));
  { const s = world({ level: 6 }); assert.ok(can(s, 'hunt')); s.locations.pop(); assert.ok(!can(s, 'hunt'), 'one server: nowhere to hop'); }
  // Shock: level 5, a hub you can trade at.
  assert.ok(!can(world({ level: 4 }), 'shock'));
  { const s = world({ level: 5 }); assert.ok(can(s, 'shock')); s.standing = { halcyon: 0 }; assert.ok(!can(s, 'shock'), 'every hub hostile'); }
  { const s = world({ level: 5 }); s.mail.boardOpen = false; s.mail.story = 0; assert.ok(!can(s, 'shock'), 'no hubs'); }
  // Spotter: level 6, invasions live (a server you've connected to), none scouted already.
  assert.ok(!can(world({ level: 5 }), 'spotter'));
  { const s = world({ level: 6 }); assert.ok(can(s, 'spotter')); s.locations.forEach((l) => { l.runs = 0; }); assert.ok(!can(s, 'spotter'), 'nothing connected sends invasions'); }
  { const s = world({ level: 6 }); s.net = { scouted: { levels: 2 } }; assert.ok(!can(s, 'spotter'), 'one scouted already'); }
  // And dealt by name only when they fit.
  assert.equal(deal(world({ level: 7, hubs: ['glassjaw'] }), 'feud'), null);
  for (const c of ['feud', 'hunt', 'shock', 'spotter']) assert.equal(deal(world({ hubs: ['glassjaw'] }), c)?.card, c);
});

test('a feud: pick a side, fight the other side\'s runner; the win pays your side and costs no one any rep', () => {
  const s = world({ hubs: ['glassjaw', 'kestrel', 'lantern'] });
  s.director.r = 1;
  let ev; for (let i = 0; i < 20 && !(ev?.sides.includes('glassjaw') && ev.sides.includes('lantern')); i++) { s.events = []; ev = deal(s, 'feud'); }
  assert.deepEqual([...ev.sides].sort(), ['glassjaw', 'lantern']);
  assert.match(mapMarkup(s, ev.loc), new RegExp(`event fight ${ev.id} glassjaw`), 'a button a side');
  assert.match(mapMarkup(s, ev.loc), new RegExp(`event fight ${ev.id} lantern`));
  command(s, `event fight ${ev.id}`);
  assert.ok(!active(s), 'no side, no fight');
  command(s, `event fight ${ev.id} kestrel`);
  assert.ok(!active(s), 'not a side in this feud');
  const was = Object.fromEntries(Object.keys(FACTIONS).map((f) => [f, rep(s, f)])), credits = s.server.credits, stash = s.stash.length;
  command(s, `event fight ${ev.id} glassjaw`);
  assert.ok(active(s));
  assert.equal(s.encounter.virus.family, FACTION_FAMILY.lantern, 'LANTERN\'s runner');
  assert.equal(s.encounter.virus.name, ev.runners.lantern);
  assert.ok(s.encounter.virus.elite);
  win(s);
  assert.equal(rep(s, 'glassjaw'), was.glassjaw + FEUD.rep, 'your side');
  assert.equal(rep(s, 'lantern'), was.lantern, 'the other side: unchanged');
  for (const r of FACTIONS.glassjaw.rivals) assert.equal(rep(s, r), was[r], `its rival ${r}: unchanged`);
  for (const f of Object.keys(FACTIONS)) if (f !== 'glassjaw') assert.equal(rep(s, f), was[f], `${f}: nobody loses`);
  assert.ok(s.server.credits - credits >= 80 + 15 * ev.level, 'a bounty');
  assert.ok(s.stash.length > stash, 'GLASSJAW\'s sealed item');
  assert.equal(eventsOf(s).length, 0, 'over');
  // LANTERN sells no sealed item: its bootleg filter.
  const t = world({ hubs: ['glassjaw'] });
  t.director.r = 1;
  const e2 = deal(t, 'feud'), first = t.serial;
  command(t, `event fight ${e2.id} halcyon`);
  assert.equal(t.encounter.virus.family, FACTION_FAMILY.glassjaw);
  const was2 = Object.fromEntries(Object.keys(FACTIONS).map((f) => [f, rep(t, f)]));
  win(t);
  assert.equal(rep(t, 'halcyon'), was2.halcyon + FEUD.rep);
  assert.equal(rep(t, 'kestrel'), was2.kestrel + 1, 'Halcyon\'s ally warms a little');
  for (const f of ['glassjaw', 'nullchoir', 'lantern']) assert.equal(rep(t, f), was2[f], `${f} unchanged (GLASSJAW the other side, NULL CHOIR a rival)`);
  assert.ok(t.logs.some((e) => e.id > first && e.type === 'world-event-won'));
});

test('a bounty hunt hops three times, a level and more pay each hop, then it\'s gone; the kill pays Kestrel', () => {
  const s = world({ level: 9, hubs: ['kestrel'] });
  addLocation(s, 'ghostroot'); s.locations.forEach((l) => { l.rogue = false; });
  const ev = deal(s, 'hunt');
  assert.equal(ev.path.length, HUNT.hops + 1);
  for (let i = 1; i < ev.path.length; i++) assert.notEqual(ev.path[i], ev.path[i - 1], 'it moves');
  assert.equal(ev.loc, ev.path[0]);
  assert.equal(ev.hunter, 'kestrel');
  assert.match(mapMarkup(s, ev.loc), /mhunt/, 'a line to its next server');
  const pays = [huntPay(ev)], levels = [ev.level];
  for (let h = 1; h <= HUNT.hops; h++) {
    tickEvents(s, HUNT.hopMs);
    assert.equal(ev.hop, h);
    assert.equal(ev.loc, ev.path[h]);
    levels.push(ev.level); pays.push(huntPay(ev));
  }
  assert.deepEqual(levels, [9, 10, 11, 12], 'a level a hop');
  for (let i = 1; i < pays.length; i++) assert.ok(pays[i] > pays[i - 1], 'better paid');
  assert.equal(pays[3], Math.round((80 + 15 * 12) * 2));
  tickEvents(s, HUNT.hopMs);
  assert.ok(!eventsOf(s).includes(ev), 'gone after three hops');
  // Caught at its second hop: that hop's pay, and Kestrel standing.
  const t = world({ level: 9, hubs: ['kestrel'] });
  const e2 = deal(t, 'hunt');
  tickEvents(t, 2 * HUNT.hopMs);
  command(t, `event fight ${e2.id}`);
  assert.ok(active(t));
  tickEvents(t, 3 * HUNT.hopMs);
  assert.equal(e2.hop, 2, 'it waits while you fight it');
  const credits = t.server.credits, kes = rep(t, 'kestrel');
  win(t);
  assert.equal(t.server.credits - credits >= Math.round((80 + 15 * 11) * 1.6), true);
  assert.equal(rep(t, 'kestrel'), kes + HUNT.rep);
  // No Kestrel hub: Halcyon posts it.
  assert.equal(deal(world({ level: 9 }), 'hunt').hunter, 'halcyon');
});

test('a market shock moves exactly that hub\'s ware, and ends', () => {
  const s = world({ level: 9, hubs: ['kestrel'] }); // Halcyon's and Kestrel's: both on floor 1's map
  const hubs = Object.keys(FACTIONS), before = Object.fromEntries(hubs.map((f) => [f, Object.fromEntries(WARE_IDS.map((w) => [w, priceOf(s, f, w)]))]));
  const ev = deal(s, 'shock');
  assert.ok(SHOCK.wares.includes(ev.ware));
  assert.ok([SHOCK.up, SHOCK.down].includes(ev.mult));
  for (const f of hubs) for (const w of WARE_IDS) {
    const want = f === ev.hub && w === ev.ware ? before[f][w] * ev.mult : before[f][w];
    assert.ok(Math.abs(priceOf(s, f, w) - want) < 1e-9, `${f} ${w}`);
  }
  assert.match(mapMarkup(s, 'hub-' + ev.hub), /hub-shock/, 'a chip on the hub');
  tickEvents(s, SHOCK.ms);
  assert.equal(eventsOf(s).length, 0);
  for (const f of hubs) for (const w of WARE_IDS) assert.ok(Math.abs(priceOf(s, f, w) - before[f][w]) < 1e-9, 'back to normal');
  // A crash, one time in three or so.
  const dirs = new Set();
  for (let i = 0; i < 30; i++) { s.events = []; dirs.add(deal(s, 'shock').mult); }
  assert.deepEqual([...dirs].sort(), [SHOCK.down, SHOCK.up]);
});

test('a spotter: kill it and the next invasion comes weaker, its kind known; ignore it and nothing changes', () => {
  const base = () => { const s = world({ level: 9 }); s.locations.forEach((l, i) => { l.level = 8 + i; }); s.net = { wall: 0, next: 9e9, seq: 3 }; s.director = { next: 9e9, n: 0, last: null }; return s; };
  // Kill it.
  const s = base(), ev = deal(s, 'spotter');
  assert.equal(ev.loc, null, 'at home');
  assert.match(mapMarkup(s, 'server'), new RegExp(`event fight ${ev.id}`), 'on your server\'s card');
  command(s, `event fight ${ev.id}`);
  assert.ok(active(s));
  win(s);
  const sc = s.net.scouted;
  assert.ok(sc && KINDS[sc.kind] && s.locations.some((l) => l.id === sc.from), 'its server and kind, known now');
  assert.equal(sc.levels, SCOUTED.levels);
  play(s, 'developer invade');
  const inv = s.invasion, from = s.locations.find((l) => l.id === sc.from);
  assert.equal(inv.from, sc.from);
  assert.equal(inv.kind, sc.kind);
  assert.equal(inv.level, Math.max(1, from.level + (KINDS[sc.kind].lvl || 0) - SCOUTED.levels), 'weaker');
  assert.equal(inv.scouted, SCOUTED.levels);
  assert.equal(s.net.scouted, null, 'once');
  // Ignore it: the next invasion is the one it would have been.
  const a = base(), b = base();
  const e2 = deal(b, 'spotter');
  tickEvents(b, CARDS.spotter.ms);
  assert.ok(!eventsOf(b).includes(e2), 'it left');
  assert.ok(!b.net.scouted);
  play(a, 'developer invade'); play(b, 'developer invade');
  for (const k of ['from', 'kind', 'level', 'name', 'seed', 'mutation']) assert.deepEqual(b.invasion[k], a.invasion[k], k);
  assert.equal(b.rng, a.rng);
});

test('the director\'s rolls (dealing, hops, endings) never shift the game\'s rng', () => {
  const s = world({ level: 9, hubs: ['glassjaw', 'kestrel'] });
  addLocation(s, 'ghostroot'); s.locations.forEach((l) => { l.rogue = false; l.runs = 1; });
  s.director = { next: 9e9, n: 0, last: null };
  const rng = s.rng;
  for (const c of ['feud', 'hunt', 'shock', 'spotter']) assert.ok(deal(s, c), c);
  for (let i = 0; i < 6; i++) tickEvents(s, HUNT.hopMs);
  assert.equal(eventsOf(s).length, 0, 'all over');
  assert.equal(s.rng, rng);
});

test('a hunt\'s pager line follows it; developer event names the new cards', () => {
  const s = world({ level: 9, hubs: ['kestrel'] }), first = s.serial;
  const ev = deal(s, 'hunt');
  tickEvents(s, HUNT.hopMs);
  logComms(s, s.logs.filter((e) => e.id > first));
  const mine = commsOf(s).filter((c) => c.event === ev.id);
  assert.equal(mine.length, 1, 'one line, replaced');
  assert.equal(mine[0].go, `map:${ev.path[1]}`);
  assert.equal(mine[0].from, 'Kestrel');
  for (const c of ['feud', 'hunt', 'shock', 'spotter']) {
    const t = world({ hubs: ['glassjaw'] });
    play(t, `developer event ${c}`);
    assert.equal(eventsOf(t)[0]?.card, c, c);
  }
  const t = world({ level: 3 }), out = play(t, 'developer event feud');
  assert.ok(out.some((e) => e.type === 'warning' && /level 8/.test(e.message)), 'says why not');
});
