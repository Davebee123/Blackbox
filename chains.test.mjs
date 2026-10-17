// Chains (events.mjs, docs/director.md section 2): a follow-up only from what you did, dealt after its delay into a free
// slot, gone after 3 hours of logged-on time, one per kind; ignoring one costs nothing; the director's dice only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, active, resolveCycle, addLocation, UNIQUES, materialsOf } from './dist/combat.mjs';
import { deal, eventsOf, tickEvents, CARDS, CHAIN, FEUD, HUNT, DIRECTOR, chainOf, schedule, eventKill, returnPay, bountyPay, feudPay, zeroCode, missing } from './dist/events.mjs';
import { rep, FACTIONS } from './dist/factions.mjs';
import { FACTION_FAMILY } from './dist/hubs.mjs';
import { ROLLED_MUTATIONS } from './dist/data.mjs';
import { codeOf } from './dist/gear.mjs';
import { mapMarkup, commsMarkup } from './dist/view.mjs';
import { logComms, commsOf } from './dist/comms.mjs';
import { play } from './dist/run.mjs';

const MIN = 60000, HOUR = 60 * MIN;
const world = ({ level = 12, hubs = [] } = {}) => {
  const s = fresh(); s.tutorialCompleted = true; s.hackers = { breaker: { level, xp: 0 } };
  addLocation(s, 'worm'); addLocation(s, 'ransomware');
  s.locations.forEach((l) => { l.rogue = false; l.runs = 1; });
  command(s, 'mail'); s.mail.boardOpen = true;
  s.hubFound = Object.fromEntries(hubs.map((f) => [f, true]));
  s.market = { pressure: {}, transfers: [], serial: 0, event: 'calm', eventUntil: Infinity, at: null };
  s.director = { next: 9e9, n: 0, last: null }; // an older save's director: no follow-up list yet
  return s;
};
const win = (s) => {
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: 1, attack: null, lockHp: 0, lockAt: 9e9 }); // no mutex lock to soak the hit
  for (let i = 0; i < 6 && active(s); i++) { const p = s.encounter.virus.parts.find((x) => x.integrity > 0); command(s, 'spike ' + p.id); resolveCycle(s); }
};
const reps = (s) => Object.fromEntries(Object.keys(FACTIONS).map((f) => [f, rep(s, f)]));
const chained = (s) => eventsOf(s).filter((e) => CARDS[e.card].chain);
const pending = (s, kind) => chainOf(s).find((f) => f.kind === kind);
// A feud you fought one runner in (won), then let run out: GLASSJAW vs Halcyon.
const feudWon = (s) => {
  const ev = deal(s, 'feud'); ev.bar = 0.5;
  command(s, `event fight ${ev.id} ${ev.sides[0]}`); win(s);
  FEUD.drift = [0, 0];
  try { tickEvents(s, FEUD.ms); } finally { FEUD.drift = [0.02, 0.05]; }
  assert.ok(!eventsOf(s).includes(ev));
  return ev;
};

test('an older save just starts with an empty follow-up list', () => {
  const s = world();
  assert.equal(s.director.chain, undefined);
  tickEvents(s, 10 * MIN);
  assert.deepEqual(chainOf(s), []);
});

test('a counter-raid: only after a feud you won a fight in; waits its delay, then takes a free slot with its link', () => {
  // Ignored, or a side picked and no fight won: nothing.
  { const s = world({ hubs: ['glassjaw'] }); deal(s, 'feud'); tickEvents(s, FEUD.ms); assert.deepEqual(chainOf(s), [], 'ignored: nothing'); }
  { const s = world({ hubs: ['glassjaw'] }), ev = deal(s, 'feud'); command(s, `event fight ${ev.id} halcyon`); s.encounter = null; tickEvents(s, FEUD.ms); assert.deepEqual(chainOf(s), [], 'fought, never won: nothing'); }
  const s = world({ hubs: ['glassjaw'] }), ev = feudWon(s), f = pending(s, 'counter');
  assert.ok(f, 'pending');
  assert.ok(f.dueIn >= CHAIN.counter.delay[0] && f.dueIn < CHAIN.counter.delay[1], '20–40 min');
  assert.equal(f.expiresIn, CHAIN.expireMs);
  assert.deepEqual([f.data.side, f.data.foe], [ev.side, ev.sides.find((x) => x !== ev.side)]);
  assert.equal(f.cause.card, 'feud'); assert.equal(f.cause.id, ev.id); assert.equal(f.cause.loc, ev.loc);
  const due = f.dueIn;
  tickEvents(s, due - MIN);
  assert.equal(chained(s).length, 0, 'not before its delay');
  const first = s.serial;
  tickEvents(s, MIN);
  const c = chained(s)[0];
  assert.equal(c?.card, 'counter', 'dealt when due');
  assert.equal(chainOf(s).length, 0, 'off the list');
  assert.equal(c.family, FACTION_FAMILY[f.data.foe], 'in the side you fought\'s family');
  assert.equal(c.level, 12); assert.ok(c.elite); assert.equal(c.eliteHp, FEUD.hp, 'sized like a feud\'s runner');
  assert.ok(s.locations.some((l) => l.id === c.loc), 'a server you hold');
  const html = mapMarkup(s, c.loc);
  assert.match(html, /<section class="evc evc-counter chained/);
  assert.match(html, /class="evc-link"[^>]*title="Follows the feud [^"]+\."/, 'the link mark names its cause');
  // The pager line carries the same mark.
  logComms(s, s.logs.filter((e) => e.id > first));
  const line = commsOf(s).find((x) => x.event === c.id);
  assert.match(line.chain, /^Follows the feud/);
  assert.match(commsMarkup(s), /class="cchain"[^>]*title="Follows the feud/);
  // Holding no server you've been on: it comes at your home.
  const t = world({ hubs: ['glassjaw'] });
  t.locations.forEach((l) => { l.runs = 0; });
  schedule(t, 'counter', { card: 'feud', name: 'x', loc: null, side: 'halcyon' }, { side: 'halcyon', foe: 'glassjaw' }, null);
  tickEvents(t, 1);
  assert.equal(chained(t)[0].loc, null, 'your home');
  assert.match(mapMarkup(t, 'server'), /evc-counter/);
});

test('a counter-raid never lowers anyone\'s rep: beaten, your side +2 and nothing else; ignored, nothing at all', () => {
  const s = world({ hubs: ['glassjaw', 'kestrel', 'lantern'] });
  schedule(s, 'counter', { card: 'feud', name: 'Halcyon vs GLASSJAW', loc: null, side: 'glassjaw' }, { side: 'glassjaw', foe: 'halcyon' }, null);
  tickEvents(s, 1);
  const c = chained(s)[0], was = reps(s), cr = s.server.credits;
  command(s, `event fight ${c.id}`);
  assert.ok(active(s));
  assert.equal(s.encounter.virus.family, FACTION_FAMILY.halcyon);
  win(s);
  assert.ok(!eventsOf(s).includes(c), 'over');
  assert.equal(rep(s, 'glassjaw'), was.glassjaw + CHAIN.counter.rep);
  for (const f of Object.keys(FACTIONS)) if (f !== 'glassjaw') assert.equal(rep(s, f), was[f], `${f}: no ripple, no loss`);
  assert.ok(s.server.credits - cr >= feudPay(c.level));
  assert.deepEqual(chainOf(s), [], 'the grudge ends');
  // Ignored: it leaves, and costs nothing.
  const t = world({ hubs: ['glassjaw'] });
  schedule(t, 'counter', { card: 'feud', name: 'x', loc: null, side: 'halcyon' }, { side: 'halcyon', foe: 'glassjaw' }, null);
  tickEvents(t, 1);
  const w2 = reps(t), c2 = t.server.credits, st = t.stash.length;
  tickEvents(t, CHAIN.counter.ms);
  assert.equal(chained(t).length, 0, 'it left');
  assert.deepEqual(reps(t), w2); assert.equal(t.server.credits, c2); assert.equal(t.stash.length, st);
  assert.deepEqual(chainOf(t), [], 'and starts nothing');
});

test('a follow-up waits for a free slot, its expiry still running, and expires quietly after 3 hours', () => {
  const s = world({ level: 12 });
  deal(s, 'outbreak'); deal(s, 'bounty'); // both slots full, for as long as it takes
  for (const e of eventsOf(s)) e.left = 9e9;
  assert.equal(eventsOf(s).length, DIRECTOR.max);
  schedule(s, 'counter', { card: 'feud', name: 'x', loc: null, side: 'halcyon' }, { side: 'halcyon', foe: 'glassjaw' });
  const f = pending(s, 'counter');
  tickEvents(s, f.dueIn + MIN);
  assert.equal(chained(s).length, 0, 'no free slot: it waits');
  assert.ok(pending(s, 'counter'));
  assert.ok(f.expiresIn < CHAIN.expireMs, 'its expiry runs while it waits');
  s.events = eventsOf(s).filter((e) => e.card !== 'bounty'); // a slot frees
  tickEvents(s, 1);
  assert.equal(chained(s)[0]?.card, 'counter', 'dealt into the free slot');
  // Never dealt in 3 hours of logged-on time: gone, without a word.
  const t = world({ level: 12 });
  t.events = [{ id: 90, card: 'outbreak', family: 'worm', loc: null, left: 9e9 }, { id: 91, card: 'outbreak', family: 'ransomware', loc: null, left: 9e9 }];
  schedule(t, 'counter', { card: 'feud', name: 'x', loc: null, side: 'halcyon' }, { side: 'halcyon', foe: 'glassjaw' });
  tickEvents(t, CHAIN.expireMs - MIN);
  assert.ok(pending(t, 'counter'), 'still waiting just before 3 hours');
  const first = t.serial;
  tickEvents(t, MIN);
  assert.deepEqual(chainOf(t), [], 'expired');
  assert.ok(!t.logs.some((e) => e.id > first && /world-event/.test(e.type)), 'quietly');
});

test('offline time never piles up: the list ticks only on the network clock', () => {
  const s = world();
  schedule(s, 'counter', { card: 'feud', name: 'x', loc: null, side: 'halcyon' }, { side: 'halcyon', foe: 'glassjaw' });
  const f = pending(s, 'counter'), due = f.dueIn, exp = f.expiresIn;
  // A save sitting untouched (no tickEvents) is a save offline: nothing moves.
  assert.equal(f.dueIn, due); assert.equal(f.expiresIn, exp);
  tickEvents(s, 5 * MIN);
  assert.equal(f.dueIn, due - 5 * MIN); assert.equal(f.expiresIn, exp - 5 * MIN);
});

test('follow-ups don\'t stack: one per kind, three at most', () => {
  const s = world({ hubs: ['glassjaw'] });
  feudWon(s); s.director.chain[0].dueIn = 9e9;
  feudWon(s);
  assert.equal(chainOf(s).filter((f) => f.kind === 'counter').length, 1, 'a new cause for a pending kind doesn\'t stack');
  const c = (k) => ({ card: 'x', name: k, loc: null });
  assert.ok(schedule(s, 'returning', c('r'), { family: 'worm', name: 'r', hunter: 'halcyon', level: 12, escapes: 1, mutation: 'armored' }));
  assert.ok(schedule(s, 'lantern', c('l'), {}, null));
  assert.equal(chainOf(s).length, CHAIN.max);
  s.events = [{ id: 99, card: 'outbreak', family: 'worm', loc: null, left: 9e9 }];
  assert.equal(schedule(s, 'zero', c('z'), { family: 'worm', outbreak: 99 }, null), null, 'three at most');
  assert.equal(chainOf(s).length, CHAIN.max);
});

test('a returning bounty: only from a hunt that got away; it grows, and after two escapes comes back marked, once', () => {
  const hunt = (s) => { const ev = deal(s, 'hunt'); assert.ok(ev); return ev; };
  // Ignored and gone: nothing. Fought and won: nothing.
  { const s = world({ hubs: ['kestrel'] }); hunt(s); tickEvents(s, CARDS.hunt.ms); assert.deepEqual(chainOf(s), [], 'ignored: it simply leaves'); }
  { const s = world({ hubs: ['kestrel'] }), ev = hunt(s); command(s, `event fight ${ev.id}`); win(s); tickEvents(s, CARDS.hunt.ms); assert.deepEqual(chainOf(s), [], 'caught'); }
  // All three hops while you're on a run on its floor: it got away.
  const hops = (s) => { for (let i = 0; i <= HUNT.hops; i++) tickEvents(s, HUNT.hopMs); };
  { const s = world({ hubs: ['kestrel'] }), ev = hunt(s); s.run = { loc: ev.path.at(-1) }; hops(s); assert.ok(!eventsOf(s).includes(ev)); assert.ok(pending(s, 'returning'), 'on a run on its floor'); }
  { const s = world({ hubs: ['kestrel'] }), ev = hunt(s); s.run = { loc: 'elsewhere' }; s.locations.push({ id: 'elsewhere', depth: 3, rogue: true }); hops(s); assert.ok(!eventsOf(s).includes(ev)); assert.deepEqual(chainOf(s), [], 'a run on another floor'); }
  { const s = world({ hubs: ['kestrel'] }), ev = hunt(s); hops(s); assert.ok(!eventsOf(s).includes(ev)); assert.deepEqual(chainOf(s), [], 'all its hops, you not on a run: it just leaves'); }
  // Fought once and let go.
  const s = world({ level: 12, hubs: ['kestrel'] }), ev = hunt(s);
  tickEvents(s, HUNT.hopMs);
  command(s, `event fight ${ev.id}`); assert.ok(active(s)); s.encounter = null; // you left
  tickEvents(s, CARDS.hunt.ms);
  const f = pending(s, 'returning');
  assert.ok(f, 'it got away');
  assert.ok(f.dueIn >= CHAIN.returning.delay[0] && f.dueIn < CHAIN.returning.delay[1], '30–60 min');
  assert.equal(f.data.escapes, 1);
  assert.ok(ROLLED_MUTATIONS.includes(f.data.mutation), 'one mutation');
  tickEvents(s, f.dueIn);
  const r1 = chained(s)[0];
  assert.equal(r1.card, 'returning');
  assert.equal(r1.name, ev.name, 'the same name');
  assert.equal(r1.level, Math.min(ev.level + CHAIN.returning.lv, 12 + CHAIN.returning.cap), '+2 levels, to your level + 3');
  assert.equal(r1.mutation, f.data.mutation);
  assert.equal(returnPay(r1), Math.round(bountyPay(r1.level) * 1.5), 'the bounty ×1.5');
  assert.ok(!r1.marked);
  const html = mapMarkup(s, r1.loc);
  assert.match(html, /class="rt-esc"[^>]*>(<i class="on"><\/i>)(<i><\/i>)<\/span>/, 'one escape of two, as pips');
  // Fought and let go again: back once more, marked, with a unique you're missing.
  command(s, `event fight ${r1.id}`); assert.equal(s.encounter.virus.mutation, r1.mutation, 'its mutation in the fight'); s.encounter = null;
  tickEvents(s, CHAIN.returning.ms);
  const f2 = pending(s, 'returning');
  assert.equal(f2?.data.escapes, 2);
  tickEvents(s, f2.dueIn);
  const r2 = chained(s)[0];
  assert.ok(r2.marked, 'marked');
  assert.equal(r2.level, Math.min(r1.level + CHAIN.returning.lv, 12 + CHAIN.returning.cap));
  assert.equal(returnPay(r2), Math.round(bountyPay(r2.level) * 2.25), '×1.5 for each escape');
  assert.ok(r2.unique && missing(s).includes(r2.unique), 'a unique you haven\'t found');
  assert.ok(UNIQUES[r2.unique].level <= 12 + 2);
  const m = mapMarkup(s, r2.loc);
  assert.match(m, /evc-returning chained marked/);
  assert.match(m, /class="rt-drop"[\s\S]*class="iname r-zeroday">/, 'its unique\'s glyph and gold name');
  const stash = s.stash.length;
  command(s, `event fight ${r2.id}`); win(s);
  assert.ok(s.stash.some((x) => x.unique === r2.unique) || s.collection?.[r2.unique], 'the named drop');
  assert.ok(s.stash.length > stash);
  assert.deepEqual(chainOf(s), [], 'the chain ends');
  // A marked one that gets away again: the chain still ends.
  const t = world({ level: 12, hubs: ['kestrel'] });
  schedule(t, 'returning', { card: 'returning', name: 'x', loc: null, escapes: 2 }, { family: 'worm', name: 'x-1', hunter: 'kestrel', level: 12, escapes: 2, mutation: 'armored' }, null);
  tickEvents(t, 1);
  const r3 = chained(t)[0];
  command(t, `event fight ${r3.id}`); t.encounter = null;
  tickEvents(t, CHAIN.returning.ms);
  assert.deepEqual(chainOf(t), [], 'once marked, it doesn\'t come back');
  // Below level 10, or nothing missing: a Custom protocol in the unique's place.
  const u = world({ level: 8, hubs: ['kestrel'] });
  schedule(u, 'returning', { card: 'returning', name: 'x', loc: null, escapes: 2 }, { family: 'worm', name: 'x-2', hunter: 'kestrel', level: 8, escapes: 2, mutation: 'armored' }, null);
  tickEvents(u, 1);
  const r4 = chained(u)[0];
  assert.ok(r4.marked && !r4.unique);
  assert.match(mapMarkup(u, r4.loc), /class="rt-drop custom"/);
  const st = u.stash.length;
  command(u, `event fight ${r4.id}`); win(u);
  assert.ok(u.stash.slice(st).some((x) => x.rarity === 'custom'), 'a Custom protocol');
});

test('LANTERN\'s offer: three couriers you intercepted deal LANTERN\'s own courier at once; the count starts over', () => {
  const s = world({ level: 12, hubs: ['lantern'] });
  // Ignored couriers don't count.
  deal(s, 'courier'); tickEvents(s, CARDS.courier.ms);
  assert.equal(s.director.couriers || 0, 0);
  for (let i = 0; i < CHAIN.lantern.at; i++) {
    s.director.last = null;
    const ev = deal(s, 'courier');
    command(s, `event fight ${ev.id}`); win(s);
    assert.ok(!eventsOf(s).includes(ev));
  }
  const f = pending(s, 'lantern');
  assert.ok(f, 'after the third');
  assert.equal(f.dueIn, 0, 'at once');
  tickEvents(s, 1);
  const ev = chained(s)[0];
  assert.equal(ev.card, 'lantern');
  assert.equal(s.director.couriers, 0, 'the count starts over');
  assert.equal(ev.family, FACTION_FAMILY.lantern);
  assert.match(mapMarkup(s, ev.loc), /evc-lantern chained[^"]*" style="[^"]*--ec:/, 'in LANTERN\'s colour');
  const was = reps(s), st = s.stash.length;
  command(s, `event fight ${ev.id}`); win(s);
  assert.equal(rep(s, 'lantern'), Math.min(100, was.lantern + CHAIN.lantern.rep), 'LANTERN +5');
  for (const k of Object.keys(FACTIONS)) if (k !== 'lantern') assert.equal(rep(s, k), was[k], `${k}: no loss`);
  assert.ok(s.stash.slice(st).some((x) => x.rarity === 'custom'), 'a Custom protocol');
  // LANTERN's hub not located: Halcyon standing instead.
  const t = world({ level: 12 }); t.director.couriers = CHAIN.lantern.at - 1;
  const c = deal(t, 'courier'); command(t, `event fight ${c.id}`); win(t);
  tickEvents(t, 1);
  const e2 = chained(t)[0], h = rep(t, 'halcyon');
  assert.equal(e2.ally, 'halcyon');
  command(t, `event fight ${e2.id}`); win(t);
  assert.equal(rep(t, 'halcyon'), Math.min(100, h + CHAIN.lantern.rep));
});

test('patient zero: 15 kills of the family during its outbreak deal its source; killing it ends the outbreak and pays its code', () => {
  const s = world({ level: 12 });
  const ob = deal(s, 'outbreak'), other = ['worm', 'ransomware', 'ghostroot'].find((f) => f !== ob.family);
  for (let i = 0; i < 20; i++) eventKill(s, other);
  for (let i = 0; i < CHAIN.zero.at - 1; i++) eventKill(s, ob.family);
  assert.deepEqual(chainOf(s), [], 'other families and 14 kills: nothing');
  eventKill(s, ob.family);
  assert.equal(pending(s, 'zero')?.data.outbreak, ob.id, 'the 15th');
  eventKill(s, ob.family);
  assert.equal(chainOf(s).length, 1, 'once an outbreak');
  tickEvents(s, 1);
  const z = chained(s)[0];
  assert.equal(z.card, 'zero'); assert.equal(z.family, ob.family); assert.ok(z.elite);
  assert.ok(s.locations.some((l) => l.id === z.loc), 'on one of your servers');
  const k = codeOf(ob.family), code = materialsOf(s)[k] || 0;
  command(s, `event fight ${z.id}`);
  assert.equal(s.encounter.virus.family, ob.family); assert.ok(s.encounter.virus.elite);
  win(s);
  assert.ok(!eventsOf(s).includes(ob), 'the outbreak ends early');
  assert.ok(!eventsOf(s).includes(z));
  assert.ok((materialsOf(s)[k] || 0) - code >= zeroCode(z), 'a vault cache\'s code of the family');
  // A real fight's kill counts: an outbreak, then a kill of its family.
  const t = world({ level: 6 }), o2 = deal(t, 'outbreak'), b = deal(t, 'bounty');
  o2.family = b.family;
  command(t, `event fight ${b.id}`); win(t);
  assert.equal(o2.kills, 1, 'a kill in a fight');
  // An outbreak that ends before its source is dealt takes the follow-up with it.
  const u = world({ level: 12 }), o3 = deal(u, 'outbreak');
  u.events.push({ id: 98, card: 'bounty', loc: u.locations[0].id, left: 9e9, family: 'worm', level: 12, name: 'b' });
  for (let i = 0; i < CHAIN.zero.at; i++) eventKill(u, o3.family);
  assert.ok(pending(u, 'zero'));
  tickEvents(u, CARDS.outbreak.ms);
  assert.deepEqual(chainOf(u), [], 'its outbreak over: gone');
});

test('chains roll only the director\'s dice: the game\'s rng doesn\'t move', () => {
  const s = world({ level: 12, hubs: ['glassjaw', 'kestrel', 'lantern'] });
  const rng = s.rng;
  const ob = deal(s, 'outbreak');
  for (let i = 0; i < CHAIN.zero.at; i++) eventKill(s, ob.family);
  schedule(s, 'counter', { card: 'feud', name: 'x', loc: null, side: 'halcyon' }, { side: 'halcyon', foe: 'glassjaw' });
  schedule(s, 'returning', { card: 'hunt', name: 'x', loc: null, escapes: 2 }, { family: 'worm', name: 'x-1', hunter: 'kestrel', level: 12, escapes: 2, mutation: 'armored' });
  for (let i = 0; i < 20; i++) tickEvents(s, 5 * MIN);
  for (const k of ['counter', 'returning', 'lantern', 'zero']) { s.events = []; play(s, `developer chain ${k}`); }
  assert.equal(s.rng, rng, 'the game\'s dice untouched');
  // And the same save chains the same way.
  const a = world(), b = world();
  for (const x of [a, b]) { schedule(x, 'counter', { card: 'feud', name: 'x', loc: null, side: 'halcyon' }, { side: 'halcyon', foe: 'glassjaw' }); }
  assert.equal(a.director.chain[0].dueIn, b.director.chain[0].dueIn);
});

test('developer chain deals each follow-up now; developer event keeps working and doesn\'t list them', () => {
  for (const k of ['counter', 'returning', 'marked', 'lantern', 'zero']) {
    const s = world({ hubs: ['glassjaw'] });
    play(s, `developer chain ${k}`);
    const ev = chained(s)[0];
    assert.equal(ev?.card, k === 'marked' ? 'returning' : k, k);
    assert.ok(ev.cause, `${k}: a cause`);
    if (k === 'marked') assert.ok(ev.marked);
  }
  const s = world({ hubs: ['glassjaw'] });
  const out = play(s, 'developer chain nope');
  assert.ok(out.some((e) => e.type === 'warning' && /counter\|returning/.test(e.message)));
  play(s, 'developer event feud');
  assert.equal(eventsOf(s)[0]?.card, 'feud');
  const w = play(world(), 'developer event counter');
  assert.ok(w.some((e) => e.type === 'warning' && !/counter/.test(e.message)), 'not an ordinary card');
  // The deck never deals a follow-up on its own.
  const t = world({ level: 14, hubs: ['glassjaw', 'kestrel', 'lantern'] });
  for (let i = 0; i < 200; i++) { t.events = []; const e = deal(t); assert.ok(!e || !CARDS[e.card].chain); }
});

test('ignoring any follow-up costs nothing and starts nothing', () => {
  for (const k of ['returning', 'marked', 'lantern', 'zero']) {
    const s = world({ level: 12, hubs: ['glassjaw', 'kestrel', 'lantern'] });
    if (k === 'zero') { const ob = deal(s, 'outbreak'); ob.left = 9e9; }
    play(s, `developer chain ${k}`);
    const ev = chained(s)[0], was = reps(s), cr = s.server.credits, st = s.stash.length;
    tickEvents(s, CARDS[ev.card].ms);
    assert.ok(!eventsOf(s).includes(ev), `${k}: gone`);
    assert.deepEqual(reps(s), was, `${k}: no rep moves`);
    assert.equal(s.server.credits, cr); assert.equal(s.stash.length, st);
    assert.deepEqual(chainOf(s), [], `${k}: nothing follows`);
  }
});

test('the new cards are shown, not told: no sentence on any, the action a button, the cause in the link\'s tooltip', () => {
  const cards = [];
  for (const k of ['counter', 'returning', 'marked', 'lantern', 'zero']) {
    const s = world({ level: 14, hubs: ['glassjaw'] });
    play(s, `developer chain ${k}`);
    const ev = chained(s)[0], html = mapMarkup(s, ev.loc || 'server');
    const m = html.match(new RegExp(`<section class="evc evc-${ev.card}[\\s\\S]*?</section>`));
    assert.ok(m, `${k}: its card`);
    cards.push([k, m[0]]);
  }
  for (const [c, html] of cards) {
    assert.ok(!/<p[\s>]/.test(html), `${c}: no paragraph`);
    assert.match(html, /class="evc-head" title="[^"]+\."/, `${c}: the sentence is the strip's tooltip`);
    assert.match(html, /class="evc-link"[^>]*title="Follows [^"]+\."/, `${c}: the link mark`);
    const text = html.replace(/<span class="pglyph[^>]*>[\s\S]*?<\/span>/g, ' ').replace(/<[^>]*>/g, ' ').replace(/&#39;|&amp;|&quot;/g, '').replace(/\s+/g, ' ').trim();
    assert.ok(!/[a-z]\.(\s|$)/.test(text), `${c}: no sentence on the card: "${text}"`);
    assert.ok(text.split(' ').length <= 30, `${c}: labels and numbers, not prose: "${text}"`);
    assert.match(html, /<button type="button" class="evc-target[^"]*" data-command="event fight \d+"/, `${c}: its action is a button`);
  }
});
