// The newer event cards (events.mjs): feud (a tug-of-war), bounty hunt, market shock, spotter; and every card's look (event-cards.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, active, resolveCycle, addLocation } from './dist/combat.mjs';
import { deal, eventsOf, tickEvents, CARDS, FEUD, HUNT, SHOCK, huntPay, feuds, feudShare, feudPay } from './dist/events.mjs';
import { filtersOf } from './dist/filters.mjs';
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

// A feud between GLASSJAW and LANTERN (on the director's dice), and the rep of every faction as it stands.
const glassLantern = () => {
  const s = world({ hubs: ['glassjaw', 'kestrel', 'lantern'] });
  s.director.r = 1;
  let ev; for (let i = 0; i < 20 && !(ev?.sides.includes('glassjaw') && ev.sides.includes('lantern')); i++) { s.events = []; ev = deal(s, 'feud'); }
  assert.deepEqual([...ev.sides].sort(), ['glassjaw', 'lantern']);
  return { s, ev };
};
const reps = (s) => Object.fromEntries(Object.keys(FACTIONS).map((f) => [f, rep(s, f)]));

test('a feud: pick a side by its half of the card, fight the other side\'s runner; a win pushes your side, pays, and costs no one any rep', () => {
  const { s, ev } = glassLantern();
  assert.ok(Math.abs(ev.bar - 0.5) <= FEUD.start + 1e-9, 'starts near even');
  const card = mapMarkup(s, ev.loc);
  for (const f of ev.sides) assert.match(card, new RegExp(`class="fd-half[^"]*"[^>]*data-command="event fight ${ev.id} ${f}"`), `${f}'s half is its button`);
  assert.match(card, /class="fd-bar/, 'the stacked bar');
  command(s, `event fight ${ev.id}`);
  assert.ok(!active(s), 'no side, no fight');
  command(s, `event fight ${ev.id} kestrel`);
  assert.ok(!active(s), 'not a side in this feud');
  const was = reps(s), credits = s.server.credits, bar = feudShare(ev, 'glassjaw'), runner = ev.runners.lantern;
  command(s, `event fight ${ev.id} glassjaw`);
  assert.ok(active(s));
  assert.equal(s.encounter.virus.family, FACTION_FAMILY.lantern, 'LANTERN\'s runner');
  assert.equal(s.encounter.virus.name, runner);
  assert.ok(s.encounter.virus.elite);
  win(s);
  assert.ok(Math.abs(feudShare(ev, 'glassjaw') - (bar + FEUD.push)) < 1e-9, 'a win pushes your side');
  assert.equal(rep(s, 'glassjaw'), was.glassjaw + FEUD.rep, 'your side');
  for (const f of Object.keys(FACTIONS)) if (f !== 'glassjaw') assert.equal(rep(s, f), was[f], `${f}: nobody loses`);
  assert.ok(s.server.credits - credits >= feudPay(ev.level), 'a win pays on its own');
  assert.equal(feudPay(ev.level), Math.round((80 + 15 * ev.level) / 2), 'half a bounty\'s credits');
  assert.ok(eventsOf(s).includes(ev), 'still up: fight again');
  assert.notEqual(ev.runners.lantern, runner, 'a fresh runner');
  assert.match(mapMarkup(s, ev.loc), /class="fd-half fd-[ab] on"/, 'your side lit');
});

test('a feud\'s side locks with your first fight; after that the faction can be left off', () => {
  const { s, ev } = glassLantern();
  command(s, `event fight ${ev.id} lantern`);
  assert.ok(active(s));
  s.encounter = null; // the fight lost or left
  assert.equal(ev.side, 'lantern', 'locked, won or not');
  const first = s.serial;
  command(s, `event fight ${ev.id} glassjaw`);
  assert.ok(!active(s), 'the other side is shut');
  assert.ok(s.logs.some((e) => e.id > first && e.type === 'warning' && /LANTERN/.test(e.message)));
  assert.match(mapMarkup(s, ev.loc), new RegExp(`class="fd-half fd-[ab] off"[^>]*data-command="event fight ${ev.id} glassjaw"[^>]*disabled`), 'its half locked on the card');
  command(s, `event fight ${ev.id}`);
  assert.ok(active(s), 'your side by default');
  assert.equal(s.encounter.virus.family, FACTION_FAMILY.glassjaw);
});

test('a feud drifts on the director\'s dice, never the game\'s, and never past its hold on its own', () => {
  const { s, ev } = glassLantern();
  const rng = s.rng, seen = new Set([ev.bar]);
  for (let i = 0; i < FEUD.ms / FEUD.driftMs - 1; i++) {
    tickEvents(s, FEUD.driftMs);
    seen.add(ev.bar);
    assert.ok(ev.bar >= FEUD.hold[0] - 1e-9 && ev.bar <= FEUD.hold[1] + 1e-9, 'inside its hold');
  }
  assert.equal(ev.steps, FEUD.ms / FEUD.driftMs - 1, 'a step a minute');
  assert.ok(seen.size > 5, 'it moves');
  assert.equal(s.rng, rng, 'the game\'s dice untouched');
  // The same save drifts the same way.
  const a = glassLantern(), b = glassLantern();
  tickEvents(a.s, 7 * FEUD.driftMs); tickEvents(b.s, 7 * FEUD.driftMs);
  assert.equal(a.ev.bar, b.ev.bar);
  // Past the hold (your pushes), drift only brings it back toward even.
  const t = glassLantern(); t.ev.bar = 0.95;
  for (let i = 0; i < 10; i++) { tickEvents(t.s, FEUD.driftMs); assert.ok(t.ev.bar <= 0.95 + 1e-9); }
});

test('taking the bar to 100% wins the feud: the bonus, once', () => {
  const { s, ev } = glassLantern();
  ev.bar = ev.sides[0] === 'glassjaw' ? 0.5 : 0.5; // even
  const was = reps(s), stash = s.stash.length, credits = s.server.credits, mine = 'glassjaw';
  command(s, `event fight ${ev.id} ${mine}`); win(s);
  assert.ok(eventsOf(s).includes(ev));
  assert.equal(s.stash.length, stash + 1, 'no bonus at 75%: the runner\'s protocol only');
  const first = s.serial;
  command(s, `event fight ${ev.id}`); win(s);
  assert.ok(!eventsOf(s).includes(ev), 'won: over');
  assert.equal(s.stash.length, stash + 3, 'the second runner\'s protocol and GLASSJAW\'s sealed item, once');
  assert.equal(rep(s, mine), was[mine] + 2 * FEUD.rep + FEUD.bonusRep);
  for (const f of Object.keys(FACTIONS)) if (f !== mine) assert.ok(rep(s, f) >= was[f], `${f}: never a loss`);
  assert.ok(s.server.credits - credits >= 2 * feudPay(ev.level));
  assert.ok(s.logs.some((e) => e.id > first && e.type === 'world-event-won'));
  command(s, `event fight ${ev.id}`);
  assert.ok(!active(s), 'nothing more to fight');
  // LANTERN sells no sealed item: its bootleg filter. Halcyon's ally Kestrel warms a little.
  const t = world({ hubs: ['glassjaw'] }); t.director.r = 1;
  const e2 = deal(t, 'feud'), filters = filtersOf(t).length, w2 = reps(t);
  e2.bar = 0.5;
  command(t, `event fight ${e2.id} halcyon`); win(t); command(t, `event fight ${e2.id}`); win(t);
  assert.equal(rep(t, 'kestrel'), w2.kestrel + Math.round((FEUD.rep + FEUD.bonusRep) * 0.25), 'Halcyon\'s ally warms a little');
  for (const f of ['glassjaw', 'nullchoir', 'lantern']) assert.equal(rep(t, f), w2[f], `${f} unchanged (GLASSJAW the other side, NULL CHOIR a rival)`);
  const u = glassLantern(); u.ev.bar = 0.5;
  const uf = filtersOf(u.s).length;
  command(u.s, `event fight ${u.ev.id} lantern`); win(u.s); command(u.s, `event fight ${u.ev.id}`); win(u.s);
  assert.equal(filtersOf(u.s).length, uf + 1, 'LANTERN\'s bootleg filter');
  assert.equal(filters, filtersOf(t).length, 'Halcyon gives a sealed item, not a filter');
});

test('when a feud\'s time runs out: ahead, the bonus; behind, you keep what each fight paid and lose nothing', () => {
  // Ahead at the end.
  const a = glassLantern();
  command(a.s, `event fight ${a.ev.id} glassjaw`); win(a.s);
  a.ev.bar = a.ev.sides[0] === 'glassjaw' ? 0.6 : 0.4;
  const stash = a.s.stash.length, ra = rep(a.s, 'glassjaw');
  FEUD.drift = [0, 0]; // hold the bar still while the clock runs out
  try { tickEvents(a.s, FEUD.ms); } finally { FEUD.drift = [0.02, 0.05]; }
  assert.ok(!eventsOf(a.s).includes(a.ev), 'over');
  assert.equal(a.s.stash.length, stash + 1, 'the bonus');
  assert.equal(rep(a.s, 'glassjaw'), ra + FEUD.bonusRep);
  // Behind at the end: what the win paid stays, nobody's rep moves, nothing more.
  const b = glassLantern();
  command(b.s, `event fight ${b.ev.id} glassjaw`); win(b.s);
  b.ev.bar = b.ev.sides[0] === 'glassjaw' ? 0.3 : 0.7;
  const was = reps(b.s), credits = b.s.server.credits, st = b.s.stash.length;
  FEUD.drift = [0, 0];
  try { tickEvents(b.s, FEUD.ms); } finally { FEUD.drift = [0.02, 0.05]; }
  assert.ok(!eventsOf(b.s).includes(b.ev), 'over');
  assert.deepEqual(reps(b.s), was, 'no rep lost (or won) with anyone');
  assert.equal(b.s.server.credits, credits, 'what the win paid stays');
  assert.equal(b.s.stash.length, st, 'no bonus');
  // Never picked a side: it just ends.
  const c = glassLantern(), wc = reps(c.s);
  tickEvents(c.s, FEUD.ms);
  assert.ok(!eventsOf(c.s).includes(c.ev));
  assert.deepEqual(reps(c.s), wc);
});

test('event cards are shown, not told: no sentence on any card, its action a button, its sentence a tooltip', () => {
  const s = world({ level: 14, hubs: ['glassjaw', 'kestrel'] });
  addLocation(s, 'ghostroot'); s.locations.forEach((l) => { l.rogue = false; l.runs = 1; });
  s.netSeed = 777;
  const cards = [];
  for (const c of ['courier', 'bounty', 'choir', 'feud', 'hunt', 'spotter', 'outbreak', 'shock', 'darknet', 'leak']) {
    s.events = []; s.director.last = null;
    const ev = deal(s, c);
    assert.ok(ev, c);
    if (c === 'shock') ev.hub = 'halcyon'; // a hub on this floor's map
    const where = c === 'leak' ? ev.loc || s.locations.find((l) => l.leaked)?.id : ev.loc || (ev.hub ? 'hub-' + ev.hub : 'server');
    const html = mapMarkup(s, where);
    const m = html.match(new RegExp(`<section class="evc evc-${c}[\\s\\S]*?</section>`));
    assert.ok(m, `${c}: its card`);
    cards.push([c, m[0]]);
  }
  for (const [c, html] of cards) {
    assert.ok(!/<p[\s>]/.test(html), `${c}: no paragraph`);
    assert.match(html, /class="evc-head" title="[^"]+\."/, `${c}: the sentence is the strip's tooltip`);
    const text = html.replace(/<span class="pglyph[^>]*>[\s\S]*?<\/span>/g, ' ').replace(/<[^>]*>/g, ' ').replace(/&#39;|&amp;|&quot;/g, '').replace(/\s+/g, ' ').trim();
    assert.ok(!/[a-z]\.(\s|$)/.test(text), `${c}: no sentence on the card: "${text}"`);
    assert.ok(text.split(' ').length <= 30, `${c}: labels and numbers, not prose: "${text}"`);
    if (!['outbreak', 'leak'].includes(c)) assert.match(html, /<button type="button"/, `${c}: its action is a button`);
  }
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
  s.director.blipNext = Infinity; // no price flicker (a blip) meanwhile
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
