// Chains (events.mjs, docs/director.md section 2): a follow-up only from what you did, dealt after its delay into a free
// slot, gone after 3 hours of logged-on time, one per kind; ignoring one costs nothing; the director's dice only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, active, resolveCycle, addLocation, materialsOf } from './dist/combat.mjs';
import { deal, eventsOf, tickEvents, CARDS, CHAIN, FEUD, HUNT, DIRECTOR, chainOf, schedule, eventKill, returnPay, bountyPay, huntPay, feudPay, zeroCode } from './dist/events.mjs';
import { rep, FACTIONS } from './dist/factions.mjs';
import { FACTION_FAMILY } from './dist/hubs.mjs';
import { codeOf } from './dist/gear.mjs';
import { mapMarkup } from './dist/view.mjs';
import { inboxMarkup } from './dist/pager-view.mjs';
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
  assert.match(inboxMarkup(s), /class="cchain"[^>]*title="Follows the feud/);
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
  assert.ok(schedule(s, 'returning', c('r'), { family: 'worm', name: 'r', hunter: 'halcyon', level: 12, pay: 300 }));
  assert.ok(schedule(s, 'lantern', c('l'), {}, null));
  assert.equal(chainOf(s).length, CHAIN.max);
  s.events = [{ id: 99, card: 'outbreak', family: 'worm', loc: null, left: 9e9 }];
  assert.equal(schedule(s, 'zero', c('z'), { family: 'worm', outbreak: 99 }, null), null, 'three at most');
  assert.equal(chainOf(s).length, CHAIN.max);
});

test('a returning bounty: only from a hunt that got away; back once at the pay it got away with, never more, never marked', () => {
  const hunt = (s) => { const ev = deal(s, 'hunt'); assert.ok(ev); return ev; };
  // Ignored and gone: nothing. Fought and won: nothing.
  { const s = world({ hubs: ['kestrel'] }); hunt(s); tickEvents(s, CARDS.hunt.ms); assert.deepEqual(chainOf(s), [], 'ignored: it simply leaves'); }
  { const s = world({ hubs: ['kestrel'] }), ev = hunt(s); command(s, `event fight ${ev.id}`); win(s); tickEvents(s, CARDS.hunt.ms); assert.deepEqual(chainOf(s), [], 'caught'); }
  // All three hops while you're on a run on its floor: it got away.
  const hops = (s) => { for (let i = 0; i <= HUNT.hops; i++) tickEvents(s, HUNT.hopMs); };
  { const s = world({ hubs: ['kestrel'] }), ev = hunt(s); s.run = { loc: ev.path.at(-1) }; hops(s); assert.ok(!eventsOf(s).includes(ev)); assert.ok(pending(s, 'returning'), 'on a run on its floor'); }
  { const s = world({ hubs: ['kestrel'] }), ev = hunt(s); s.run = { loc: 'elsewhere' }; s.locations.push({ id: 'elsewhere', depth: 3, rogue: true }); hops(s); assert.ok(!eventsOf(s).includes(ev)); assert.deepEqual(chainOf(s), [], 'a run on another floor'); }
  { const s = world({ hubs: ['kestrel'] }), ev = hunt(s); hops(s); assert.ok(!eventsOf(s).includes(ev)); assert.deepEqual(chainOf(s), [], 'all its hops, you not on a run: it just leaves'); }
  // Fought once and let go, after a hop.
  const s = world({ level: 12, hubs: ['kestrel'] }), ev = hunt(s);
  tickEvents(s, HUNT.hopMs);
  const paid = huntPay(ev), lvl = ev.level;
  command(s, `event fight ${ev.id}`); assert.ok(active(s)); s.encounter = null; // you left
  tickEvents(s, CARDS.hunt.ms);
  const f = pending(s, 'returning');
  assert.ok(f, 'it got away');
  assert.ok(f.dueIn >= CHAIN.returning.delay[0] && f.dueIn < CHAIN.returning.delay[1], '30–60 min');
  tickEvents(s, f.dueIn);
  const r1 = chained(s)[0];
  assert.equal(r1.card, 'returning');
  assert.equal(r1.name, ev.name, 'the same name');
  assert.equal(r1.level, lvl, 'the level it got away at');
  assert.equal(returnPay(r1), paid, 'what the hunt paid when it got away');
  assert.ok(returnPay(r1) <= Math.round(bountyPay(lvl) * HUNT.mult.at(-1)), 'never more than a hunt can pay');
  assert.ok(!r1.marked && !r1.unique, 'no marked bounty');
  assert.match(mapMarkup(s, r1.loc), /last chance/);
  // Let go again: gone for good.
  command(s, `event fight ${r1.id}`); s.encounter = null;
  tickEvents(s, CHAIN.returning.ms);
  assert.ok(!eventsOf(s).includes(r1));
  assert.deepEqual(chainOf(s), [], 'it never comes back twice');
  // Caught: the pay and the hunter's rep.
  const t = world({ level: 12, hubs: ['kestrel'] });
  schedule(t, 'returning', { card: 'hunt', name: 'x', loc: null }, { family: 'worm', name: 'x-1', hunter: 'kestrel', level: 12, pay: 300 }, null);
  tickEvents(t, 1);
  const r2 = chained(t)[0], cr = t.server.credits, st = t.stash.length;
  command(t, `event fight ${r2.id}`); win(t);
  assert.equal(t.server.credits - cr, 300);
  assert.equal(t.stash.length, st, 'no drop of its own');
  assert.deepEqual(chainOf(t), [], 'the chain ends');
});

test('chains roll only the director\'s dice: the game\'s rng doesn\'t move', () => {
  const s = world({ level: 12, hubs: ['glassjaw', 'kestrel', 'lantern'] });
  const rng = s.rng;
  const ob = deal(s, 'outbreak');
  for (let i = 0; i < CHAIN.zero.at; i++) eventKill(s, ob.family);
  schedule(s, 'counter', { card: 'feud', name: 'x', loc: null, side: 'halcyon' }, { side: 'halcyon', foe: 'glassjaw' });
  schedule(s, 'returning', { card: 'hunt', name: 'x', loc: null }, { family: 'worm', name: 'x-1', hunter: 'kestrel', level: 12, pay: 300 });
  for (let i = 0; i < 20; i++) tickEvents(s, 5 * MIN);
  for (const k of ['counter', 'returning', 'lantern', 'zero']) { s.events = []; play(s, `developer chain ${k}`); }
  assert.equal(s.rng, rng, 'the game\'s dice untouched');
  // And the same save chains the same way.
  const a = world(), b = world();
  for (const x of [a, b]) { schedule(x, 'counter', { card: 'feud', name: 'x', loc: null, side: 'halcyon' }, { side: 'halcyon', foe: 'glassjaw' }); }
  assert.equal(a.director.chain[0].dueIn, b.director.chain[0].dueIn);
});

test('developer chain deals each follow-up now; developer event keeps working and doesn\'t list them', () => {
  for (const k of ['counter', 'returning', 'lantern', 'zero']) {
    const s = world({ hubs: ['glassjaw'] });
    play(s, `developer chain ${k}`);
    const ev = chained(s)[0];
    assert.equal(ev?.card, k, k);
    assert.ok(ev.cause, `${k}: a cause`);
  }
  assert.ok(play(world({ hubs: ['glassjaw'] }), 'developer chain marked').some((e) => e.type === 'warning'), 'no marked bounty any more');
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
  for (const k of ['returning', 'lantern', 'zero']) {
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
  for (const k of ['counter', 'returning', 'lantern', 'zero']) {
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
