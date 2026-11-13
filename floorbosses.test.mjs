// The floor 2 and 3 bosses (floorbosses.mjs, docs/solo-bosses.md, GAME_RULES.md "Floor bosses"): CENTRIFUGE's Bidding,
// SHAKEDOWN's Ransom Clock, SHOULDER SURFER's Replay, RECURSION's Call, their acts, where they
// stand (a floor-2 Pit's and a floor-3 Gauntlet's last room), their uniques, and their marks on the board.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, livingParts, attackers, hit, addItem, loaded, UNIQUES, defender, lairPick, bossTable as lootTable } from './dist/combat.mjs';
import { CONFIG, BOSSES, ABILITIES } from './dist/data.mjs';
import { tellsOf } from './dist/tells.mjs';
import { boardMarkup } from './dist/view.mjs';
import { uniqueItem, seeded } from './dist/gear.mjs';
import { FB, topFrame, dumpOf, fbVerb, fbPower } from './dist/floorbosses.mjs';
const fbPowerOf = fbPower;
import { throneOf, rogueSpawns } from './dist/rogue.mjs';
import { createLocation } from './dist/data.mjs';
import * as FP from './dist/floorplan.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false; CONFIG.baseCrit = 0;
// A boss fight with its attacks parked and its tells quiet, so nothing lands unless a test says so.
function boss(id, { level = BOSSES[id].floor, cls = 'breaker', wear = [] } = {}) {
  const s = fresh();
  FP.outfit(s, { cls, level });
  for (const u of wear) command(s, 'load ' + addItem(s, uniqueItem(UNIQUES[u], level, seeded(1))).id);
  selectEncounter(s, 'random', 7, { level, mutation: null, family: BOSSES[id].family, boss: id });
  command(s, 'engage');
  s.server.max = s.server.integrity = 5000;
  s.encounter.hardened = 0;
  for (const p of attackers(s)) p.attack.due = 999;
  for (const t of tellsOf(s)?.list || []) { t.told = false; t.after = 999; }
  return s;
}
const of = (s, id) => livingParts(s).find((p) => p.id === id);
const hold = (s) => { command(s, 'hold'); return resolveCycle(s); };
const landNow = (s, p) => { p.attack.due = s.encounter.cycle; return hold(s); };

test('each floor boss: its own parts only, its ♛, every part with ticks at 50% and 25%, its acts bars', () => {
  for (const [id, crown, parts] of [['centrifuge', 'rotor', ['rotor', 'gavel']], ['shakedown', 'collector', ['collector', 'demand', 'lockbox']], ['shouldersurfer', 'logger', ['logger', 'pulse', 'scrambler']], ['recursion', 'main', ['main', 'frame1', 'frame2']]]) {
    const s = boss(id), v = s.encounter.virus, c = livingParts(s).find((p) => p.core);
    assert.deepEqual(v.parts.map((p) => p.id), parts, id);
    assert.equal(c.id, crown, `${id}'s ♛`);
    assert.deepEqual(c.ticks.map((t) => t.at), [0.5, 0.25], `${id}'s ♛: plain ticks (its acts are bars)`);
    assert.ok(s.encounter.actBars, id);
    assert.ok(v.parts.filter((p) => p !== c && p.ticks).every((p) => p.ticks.map((t) => t.at).join() === '0.5,0.25'), `${id}'s other parts`);
    assert.equal(v.phases.length, 2);
  }
});

test("CENTRIFUGE's Bidding: each Surge that lands spins the Gavel up; at every 2 it sells to the buyer it names, harder each sale; a delay or SIGINT withdraws it", () => {
  const s = boss('centrifuge'), v = s.encounter.virus, g = of(s, 'gavel');
  assert.ok(g.noTicks && !g.ticks, 'the Gavel has no ticks: only a delay, a Throttle or SIGINT stops a sale');
  assert.equal(g.attack.interval, 3);
  landNow(s, g);
  assert.equal(g.attack.interval, 2);
  const who = v.bid.k;
  assert.match(boardMarkup(s), /Bidding\nBoss rule\n.*sells to/);
  landNow(s, g);
  const buyer = FB.bid.buyers[who % 3], spec = BOSSES.centrifuge.buyers[buyer];
  assert.ok(of(s, spec.id)?.buyer === buyer, `the ${spec.name} joined`);
  assert.equal(g.attack.interval, FB.bid.after, 'back to every 4 after a sale');
  assert.equal(v.bid.sold, 1);
  assert.equal(fbPower(s, g, g.attack), 1 + FB.bid.sold, 'each sale, a harder Surge');
  if (buyer === 'tollgate') assert.equal(of(s, 'lockbox').ward, 'rotor');
  landNow(s, g);
  s.encounter.readyAt = {};
  FP.outfit(s, { cls: 'bastion', level: 14 });
  command(s, 'suspend gavel'); resolveCycle(s);
  assert.equal(g.attack.interval, 4, 'a delay withdraws it to every 4');
  // Reserve price (act 2): a withdraw steps it back one. Second lot (act 3): two buyers a sale.
  v.bid.reserve = true; g.attack.interval = 2; g.attack.due = s.encounter.cycle + 2; g.attack.late = null;
  s.encounter.readyAt = {};
  command(s, 'suspend gavel'); resolveCycle(s);
  assert.equal(g.attack.interval, 3);
  v.bid.lots = 2; g.attack.interval = 2;
  const before = livingParts(s).length;
  landNow(s, g);
  assert.ok(livingParts(s).length >= before + 1, 'a second lot brings more');
  // SIGINT cuts a selling Surge and withdraws the bid, for every class.
  const s2 = boss('centrifuge'), g2 = of(s2, 'gavel');
  g2.attack.interval = 2; g2.attack.due = s2.encounter.cycle;
  const hp = defender(s2).integrity;
  command(s2, 'sigint'); resolveCycle(s2);
  assert.equal(g2.attack.interval, 4, 'SIGINT withdraws it');
  assert.equal(s2.encounter.virus.bid.sold, 0, 'nothing sold');
  assert.equal(defender(s2).integrity, hp, 'the Surge is cut');
  // Once the Rotor breaks, nothing sells.
  of(s2, 'rotor').integrity = 0; g2.attack.interval = 2;
  landNow(s2, g2);
  assert.equal(s2.encounter.virus.bid.sold, 0, 'no sale with the Rotor down');
});

test("SHAKEDOWN's Ransom Clock: it counts down, leaks 35% of your max at 0 (15% more each leak) and restarts at 7; a Deadline that lands pays 3; it stops with the Collector; each act brings a new clock; act 2's second Demand takes the Lockbox's seat; act 3 re-arms on a leak", () => {
  const s = boss('shakedown'), v = s.encounter.virus, max = defender(s).max;
  assert.equal(v.ransom.left, FB.ransom.clock);
  hold(s);
  assert.equal(v.ransom.left, FB.ransom.clock - 1);
  const d = of(s, 'demand');
  landNow(s, d);
  assert.equal(v.ransom.left, FB.ransom.clock + 1, 'a Deadline landed: +3');
  v.ransom.left = 1;
  const was = defender(s).integrity;
  hold(s);
  assert.equal(was - defender(s).integrity, Math.round(max * 0.35), 'the leak');
  assert.equal(v.ransom.left, FB.ransom.restart, 'restarts at 7');
  v.ransom.left = 1;
  const was2 = defender(s).integrity;
  hold(s);
  assert.equal(was2 - defender(s).integrity, Math.round(max * 0.5), 'the next leak takes 15% more');
  assert.match(boardMarkup(s), /Ransom Clock\nBoss rule\nIt leaks/);
  const left = v.ransom.left;
  of(s, 'collector').integrity = 0;
  hold(s);
  assert.equal(v.ransom.left, left, 'the Collector is down: the clock stops');
  // Act 2: a new invoice, and a second Demand in the Lockbox's seat, its Deadline on the same cycle.
  for (const p of livingParts(s)) p.integrity = 0;
  hold(s);
  assert.equal(v.ransom.left, FB.ransom.clock, 'each act brings a new clock');
  assert.equal(v.ransom.leaks, 0, 'and the leaks start small again');
  const d2 = of(s, 'demand2'), d1 = of(s, 'demand');
  assert.ok(d2?.deadline, 'a second Demand');
  assert.ok(!of(s, 'lockbox'), 'in the Lockbox\'s seat');
  assert.equal(v.parts.indexOf(d2), v.parts.findIndex((p) => p.id === 'demand2'));
  assert.equal(d2.attack.due, d1.attack.due, 'its Deadline on the same cycle');
  assert.equal(livingParts(s).reduce((n, p) => n + p.max, 0), s.encounter.actMax, 'the board holds act 1\'s Integrity');
  // Act 3: act 1's board again (the Lockbox, one Demand), and a leak re-arms the Demand and brings the Lockbox back.
  for (const p of livingParts(s)) p.integrity = 0;
  hold(s);
  assert.ok(of(s, 'lockbox') && !of(s, 'demand2'), 'act 2\'s Demand leaves with its act');
  const box = of(s, 'lockbox'), d3 = of(s, 'demand');
  box.integrity = 0; d3.armor = 0;
  v.ransom.left = 1;
  hold(s);
  assert.ok(box.integrity === box.max && d3.armor > 0, 'final notice: the Lockbox is back and the Demand re-armed');
});

test("SHOULDER SURFER's Replay: the window opens every other cycle; a command outside it is logged, and the Dump plays it back at its full hit", () => {
  const s = boss('shouldersurfer'), e = s.encounter, lg = of(s, 'logger');
  assert.equal(e.cycle % 2, 1);
  assert.equal(e.sync, null, 'shut on an odd cycle');
  command(s, 'overload pulse'); resolveCycle(s);
  assert.ok(e.sync, 'open on an even one');
  assert.equal(e.keylog, 1, 'the command outside the window is logged');
  const d = dumpOf(s);
  assert.equal(d.id, 'overload');
  const was = defender(s).integrity;
  landNow(s, lg);
  const took = was - defender(s).integrity;
  assert.ok(took <= d.amount && took >= d.amount * 0.9, `the Dump plays it back at its full hit, less your Block (${took} of ${d.amount})`);
  assert.deepEqual(e.logged, [], 'and the log clears');
  // From the top (act 3): the log never clears, and the Dump plays the biggest.
  fbVerb(s, 'top');
  e.logged = [{ id: 'spike', cycle: 1, target: 'pulse' }, { id: 'overload', cycle: 2, target: 'pulse' }, { id: 'spike', cycle: 3, target: 'pulse' }];
  assert.equal(dumpOf(s).id, 'overload');
  landNow(s, lg);
  assert.equal(e.logged.length, 3);
  assert.match(boardMarkup(s), /Replay\nBoss rule\nThe Sync Window/);
});

test("RECURSION's Call: one-part commands reach only the top frame; every 4 cycles the top pushes a frame at 60%, not under a quarter; Return; Overflow", () => {
  const s = boss('recursion'), e = s.encounter, v = e.virus;
  const top = topFrame(s);
  assert.equal(top.id, 'frame2');
  const main = of(s, 'main'), mainHp = main.integrity;
  top.armor = 0; main.armor = 0; top.max = top.integrity = 5000; // nothing breaks, so nothing spills
  const topHp = top.integrity;
  command(s, 'spike main'); resolveCycle(s);
  assert.equal(main.integrity, mainHp, 'main() untouched');
  assert.ok(top.integrity < topHp, 'the top frame took it');
  { const n0 = v.stack.calls || 0; for (let k = 0; k < 6 && (v.stack.calls || 0) === n0; k++) hold(s); }
  const pushed = topFrame(s);
  assert.notEqual(pushed, top, 'a Call pushed a frame');
  assert.equal(pushed.max, Math.round(top.max * FB.stack.push));
  pushed.integrity = Math.floor(pushed.max * 0.2);
  const n = livingParts(s).length;
  { const at = v.stack.callAt; for (let k = 0; k < 6 && e.cycle <= at; k++) hold(s); }
  assert.equal(livingParts(s).length, n, 'under a quarter it cannot Call');
  fbVerb(s, 'return');
  for (const p of attackers(s)) p.attack.due = 999;
  hit(s, pushed, pushed.integrity, { pierce: true, server: true });
  assert.equal(top.returnBoost, FB.stack.ret, 'the frame beneath strikes 50% harder');
  assert.equal(top.attack.due, 998, 'and a cycle sooner');
  fbVerb(s, 'overflow');
  assert.match(boardMarkup(s), /Top frame\nBoss rule/);
});

test('where they stand: SHAKEDOWN on the last room of a floor-2 Pit, RECURSION a floor-3 Gauntlet\'s; nobody elsewhere', () => {
  const s = fresh();
  const mk = (kind, depth) => { const l = createLocation('ransomware', 3, 4242 + depth); Object.assign(l, { rogue: { kind }, template: 'rogue', depth, level: 12, spawns: {}, serial: 0, quirk: null, special: null }); return l; };
  const pit = mk('pit', 2), g = mk('gauntlet', 3), pit3 = mk('pit', 3);
  assert.equal(throneOf(pit).boss, 'shakedown');
  assert.equal(throneOf(g).boss, 'recursion');
  assert.equal(throneOf(pit3), null);
  const sp = rogueSpawns(s, pit)[throneOf(pit).room];
  assert.equal(sp.boss, 'shakedown');
  assert.ok(sp.level >= BOSSES.shakedown.floor);
});

test('their uniques: Governor, Cascade Failure, Paper Trail, Escrow, Privacy Screen, Muscle Memory, Tail Call, Stack Guard', () => {
  for (const id of ['governor', 'cascade-failure', 'paper-trail', 'shakedown-escrow', 'privacy-screen', 'muscle-memory', 'tail-call', 'stack-guard']) assert.ok(UNIQUES[id]?.sources.some((x) => x.kind === 'boss'), id);
  // Escrow: the Ransom Clock and the enrage 2 cycles later.
  const es = boss('shakedown', { wear: ['shakedown-escrow'] });
  assert.equal(es.encounter.virus.ransom.left, FB.ransom.clock + 2);
  // Governor: a part's attack within 2 cycles of its last lands for 25% less.
  const g0 = boss('centrifuge'), g1 = boss('centrifuge', { wear: ['governor'] });
  const twice = (s) => { const p = of(s, 'gavel'); landNow(s, p); const was = defender(s).integrity; p.attack.due = s.encounter.cycle; hold(s); return was - defender(s).integrity; };
  assert.ok(twice(g1) < twice(g0), 'Governor softens the quick second Surge');
  // Cascade Failure: a delay hits the part.
  const cf = boss('centrifuge', { cls: 'bastion', wear: ['cascade-failure'] }), gv = of(cf, 'gavel');
  gv.armor = 0; gv.attack.due = cf.encounter.cycle + 1;
  const hp = gv.integrity;
  command(cf, 'suspend gavel'); resolveCycle(cf);
  assert.ok(gv.integrity < hp, 'Cascade Failure');
  // Privacy Screen: the first playback misses.
  const ps = boss('shouldersurfer', { wear: ['privacy-screen'] });
  command(ps, 'overload pulse'); resolveCycle(ps);
  const was = defender(ps).integrity;
  landNow(ps, of(ps, 'logger'));
  assert.equal(defender(ps).integrity, was, 'the Dump misses');
  // Stack Guard: the next attack after a break lands 20% softer; Tail Call ticks the burns on the rest.
  const sg = boss('recursion', { wear: ['stack-guard', 'tail-call'] });
  sg.encounter.burns.push({ id: 'inject', name: 'Inject', target: 'main', damage: 9, left: 3 });
  const m = of(sg, 'main'), f = of(sg, 'frame2');
  m.armor = 0;
  const mhp = m.integrity;
  hit(sg, f, f.integrity, { pierce: true, server: true });
  assert.ok(m.integrity < mhp, 'Tail Call ticked the burn on main()');
  assert.equal(sg.encounter.stackGuard, sg.encounter.cycle + 2);
});

test('a slip makes the rest of the fight harder: a command at the Gavel bids, a broken Demand halves the clock, a Dump that plays you back grows the next, a Call brings the next one sooner', () => {
  const c = boss('centrifuge'), g = of(c, 'gavel');
  g.armor = 0; g.attack.interval = 3;
  command(c, 'spike gavel'); resolveCycle(c);
  assert.equal(g.attack.interval, 2, 'a command at the Gavel is a bid');
  const k = boss('shakedown'), v = k.encounter.virus, d = of(k, 'demand');
  v.ransom.left = 8;
  d.integrity = 1; hit(k, d, 5, { pierce: true, server: true }); // under the Lockbox's ward cap
  assert.equal(v.ransom.left, 4, 'missed payment: the clock halves');
  const u = boss('shouldersurfer'), lg = of(u, 'logger');
  command(u, 'overload pulse'); resolveCycle(u);
  landNow(u, lg);
  assert.equal(u.encounter.virus.surf.dumps, 1, 'a Dump that played a command back');
  const { fbPower } = { fbPower: fbPowerOf };
  u.encounter.logged = [];
  assert.equal(fbPower(u, lg, lg.attack), 1 + FB.surf.grow, 'the next Dump is bigger');
  const r = boss('recursion'), st = r.encounter.virus.stack;
  for (let i = 0; i < 6 && !st.calls; i++) hold(r);
  assert.equal(st.calls, 1);
  assert.equal(st.callAt - (r.encounter.cycle - 1), FB.stack.call - FB.stack.sooner, 'the next Call a cycle sooner');
});

test("SIGINT stops RECURSION's Call on its cycle", () => {
  const r = boss('recursion'), e = r.encounter, st = e.virus.stack;
  while (e.cycle < st.callAt) hold(r);
  const n = livingParts(r).length;
  command(r, 'sigint'); resolveCycle(r);
  assert.equal(livingParts(r).length, n, 'no frame pushed');
  assert.ok(!st.calls && st.callAt > e.cycle - 1, 'and the next Call comes later');
});

// ---------- floor 4: NIGHT DESK, BYZANTINE, CAMSWARM ----------
import { pendingOf, tradeOf, voteOf, nodesOf, camerasOf, fragsOf, hatchers, parentOf, fbCycle } from './dist/floorbosses.mjs';
import { bossTable, lairHeld, bossUniques } from './dist/combat.mjs';
import { namedBoss } from './dist/arcs.mjs';
import { FLOOR, lairBossFor } from './dist/floors.mjs';
import { fxText } from './dist/content.mjs';

test('the floor 4 bosses: own parts, a ♛, acts as bars, two acts each', () => {
  for (const [id, crown, parts] of [['nightdesk', 'desk', ['desk', 'teller', 'clearing']], ['byzantine', 'nodea', ['nodea', 'nodeb', 'nodec']], ['camswarm', 'hive', ['hive', 'pulse', 'c2']]]) {
    const s = boss(id), v = s.encounter.virus, c = livingParts(s).find((p) => p.core);
    assert.deepEqual(v.parts.map((p) => p.id), parts, id);
    assert.equal(c.id, crown, `${id}'s ♛`);
    assert.deepEqual(c.ticks.map((t) => t.at), [0.5, 0.25], `${id}'s ♛: plain ticks (its acts are bars)`);
    assert.ok(s.encounter.actBars, id);
    assert.equal(v.phases.length, 2);
    assert.equal(tellsOf(s)?.list.length || 0, 0, `${id} deals no tells: its rule is the fight`);
    assert.ok(BOSSES[id].guide.open.length && BOSSES[id].guide.phases.length === 2, `${id}'s Codex guide`);
  }
});

test("NIGHT DESK's No Timeout: its attacks wait as trades, a command settles a part's at half, four settle in full and later ones open bigger", () => {
  const s = boss('nightdesk'), e = s.encounter, v = e.virus, desk = of(s, 'desk'), teller = of(s, 'teller'), clearing = of(s, 'clearing');
  assert.equal(pendingOf(s).length, FB.desk.backlog, 'it opens with a backlog');
  assert.ok(pendingOf(s).every((t) => t.part.role === 'trader'));
  for (const p of [teller, clearing]) p.pending = [];
  // An attack that lands deals nothing and waits on its part.
  const was = defender(s).integrity;
  landNow(s, teller);
  assert.equal(defender(s).integrity, was, 'nothing lands');
  assert.equal(teller.pending.length, 1);
  assert.match(boardMarkup(s), /No Timeout\nBoss rule/);
  assert.match(boardMarkup(s), /Pending trade\nBoss rule/);
  // The traders take no damage; your one-part command on one settles its trades at half.
  const whole = tradeOf(s, teller.pending[0]), hp = teller.integrity;
  command(s, 'spike teller'); resolveCycle(s);
  assert.equal(teller.integrity, hp, 'a trader takes no damage while the Desk stands');
  assert.equal(teller.pending.length, 0);
  assert.equal(was - defender(s).integrity, Math.round(whole * FB.desk.half), 'settled at half');
  // No single hit takes more than its limit off the Desk.
  desk.armor = 0;
  const d0 = desk.integrity;
  hit(s, desk, 99999, { mine: true, pierce: true });
  assert.ok(d0 - desk.integrity <= Math.round(desk.max * FB.desk.limit), 'the Desk loses 10% of its max a hit at most');
  // Four pending: all settle in full, and every later trade opens 25% bigger.
  const at = defender(s).integrity;
  for (const p of [teller, clearing, desk]) p.pending = [];
  landNow(s, teller); landNow(s, clearing); landNow(s, desk);
  assert.equal(pendingOf(s).length, 3);
  const total = pendingOf(s).reduce((n, t) => n + tradeOf(s, t), 0);
  teller.attack.due = e.cycle; hold(s);
  assert.equal(pendingOf(s).length, 0, 'the table clears');
  assert.ok(at - defender(s).integrity > total, 'all four in full');
  assert.equal(v.desk.margin, 1);
  const base = teller.attack.amount;
  landNow(s, teller);
  assert.ok(teller.pending[0].amount >= Math.round(base * (1 + FB.desk.margin)), 'a slip makes the rest of the fight harder: later trades open bigger');
  // Night shift (act 2, by its verb here): the Night Clerk takes the Teller's seat with a trade pending, and a pending
  // trade grows 15% a cycle.
  clearing.pending = []; landNow(s, clearing);
  fbVerb(s, 'nightshift');
  const clerk = of(s, 'clerk');
  assert.ok(clerk?.pending?.length === 1 && !of(s, 'teller'), 'the Clerk sits in the Teller\'s seat, holding a trade');
  const t0 = tradeOf(s, clearing.pending[0]);
  hold(s); hold(s);
  assert.ok(tradeOf(s, clearing.pending[0]) > t0, 'it grows on the night shift');
  // Margin Call (act 3): the Desk's attack settles every pending trade with it, in full.
  fbVerb(s, 'margincall');
  const owed = pendingOf(s).reduce((n, t) => n + tradeOf(s, t), 0), at2 = defender(s).integrity;
  landNow(s, desk);
  assert.equal(pendingOf(s).length, 0, 'the table clears');
  assert.ok(at2 - defender(s).integrity > owed, 'every trade in full, and the Margin Call with them');
  // The traders go with the Desk.
  hit(s, desk, 0, {}); desk.limit = 0; desk.ticks = null; desk.core = false;
  hit(s, desk, desk.integrity, { pierce: true, server: true });
  assert.ok(!livingParts(s).length, 'the Teller and the Clearing House go with it');
});

test("BYZANTINE's Vote: the most damaged Node 15% under the average is restored and every Node hits harder; the traitor swings it; a Hard fork brings a Node back", () => {
  const s = boss('byzantine'), e = s.encounter, v = e.virus, [a, b, c] = ['nodea', 'nodeb', 'nodec'].map((id) => of(s, id));
  const set = (p, f) => { p.integrity = Math.round(p.max * f); };
  const voteNow = () => { v.vote.at = e.cycle; hold(s); };
  assert.ok(nodesOf(s).every((p) => p.limit === FB.vote.limit), 'a hit takes 20% of a Node at most');
  set(c, 0.9);
  assert.equal(voteOf(s).passes, false, 'within 15%: the vote fails');
  voteNow();
  assert.equal(v.vote.passed, 0);
  set(c, 0.4);
  const x = voteOf(s);
  assert.ok(x.passes && x.low === c);
  assert.match(boardMarkup(s), /Vote\nBoss rule\n.*It passes/);
  voteNow();
  assert.equal(c.integrity, Math.round(c.max * 0.8), 'restored to the average of the three');
  assert.equal(v.vote.passed, 1);
  assert.equal(fbPower(s, a, a.attack), 1 + FB.vote.harder, 'each vote that passes, every Node hits harder');
  // Traitor: the most damaged Node turns; while it isn't the most damaged, the restore goes to the healthiest's level.
  set(a, 1); set(b, 0.7); set(c, 0.9);
  fbVerb(s, 'traitor');
  assert.equal(v.vote.traitor, 'nodeb', 'the most damaged Node turns');
  assert.equal(voteOf(s).turned, false, 'while the traitor is the most damaged, the vote is the plain one');
  set(c, 0.5);
  assert.ok(voteOf(s).turned && voteOf(s).passes);
  voteNow();
  assert.equal(c.integrity, c.max, 'restored to the healthiest Node\'s level');
  // Hard fork: a broken Node returns at the next vote, unless every other Node is under half.
  fbVerb(s, 'hardfork');
  set(a, 0.8); set(b, 0.8);
  hit(s, c, c.max, { pierce: true, server: true }); c.integrity = 0;
  voteNow();
  assert.ok(c.integrity > 0, 'it returns at the others\' average');
  set(a, 0.4); set(b, 0.4); c.integrity = 0;
  voteNow();
  assert.equal(c.integrity, 0, 'both others under half: it stays down');
});

test("CAMSWARM's Telnet Sweep: a part under half hatches a shielded fragment, never the Hive; the fragment becomes a Camera unless its part breaks; each hatch brings the next sweep sooner", () => {
  const s = boss('camswarm'), e = s.encounter, v = e.virus, hive = of(s, 'hive'), pulse = of(s, 'pulse'), c2 = of(s, 'c2');
  const sweepNow = () => { v.swarm.at = e.cycle; hold(s); };
  sweepNow();
  assert.equal(fragsOf(s).length, 0, 'nothing under half: nothing hatches');
  assert.equal(v.swarm.every, FB.swarm.sweep);
  hive.integrity = Math.round(hive.max * 0.4); pulse.integrity = Math.round(pulse.max * 0.4);
  assert.deepEqual(hatchers(s).map((p) => p.id), ['pulse'], 'the Hive never hatches');
  assert.match(boardMarkup(s), /Telnet Sweep\nBoss rule/);
  sweepNow();
  const f = fragsOf(s)[0];
  assert.equal(parentOf(s, f), pulse);
  assert.equal(v.swarm.every, FB.swarm.sweep - 1, 'a slip makes the rest of the fight harder: the next sweep a cycle sooner');
  for (const p of attackers(s)) p.attack.due = 999;
  const fhp = f.integrity;
  hit(s, f, 9999, { mine: true, pierce: true });
  assert.equal(f.integrity, fhp, 'shielded while its part stands');
  assert.match(boardMarkup(s), /Fragment\nBoss rule\n.*shields it/);
  // Left alone 3 cycles it is a Camera, with a Surge of its own.
  v.swarm.at = 999;
  for (let k = 0; k < FB.swarm.grows; k++) { for (const p of attackers(s)) p.attack.due = 999; hold(s); }
  assert.equal(camerasOf(s).length, 1);
  assert.ok(f.role === 'camera' && f.kind === 'system' && f.attack.name === 'Surge');
  // Break the part first and its fragment drops.
  c2.integrity = Math.round(c2.max * 0.3);
  sweepNow();
  const g = fragsOf(s).find((x) => x.parent === 'c2');
  assert.ok(g);
  c2.limit = 0; hit(s, c2, c2.integrity, { pierce: true, server: true });
  assert.equal(g.integrity, 0, 'its fragment drops with the C2 Node');
  // Botnet: a broken C2 Node comes back. Lockout: the Hive boots a Camera and takes nothing while one stands.
  fbVerb(s, 'botnet');
  assert.ok(of(s, 'c2')?.role === 'c2', 'the C2 Node is back');
  const cams = camerasOf(s).length;
  fbVerb(s, 'lockout');
  assert.equal(camerasOf(s).length, cams + 1, 'the Hive boots a Camera');
  hive.armor = 0;
  const hh = hive.integrity;
  hit(s, hive, 50, { mine: true, pierce: true });
  assert.equal(hive.integrity, hh, 'locked while a Camera stands');
  for (const cam of camerasOf(s)) cam.integrity = 0;
  for (const ph of v.phases) ph.done = true; // the Lockout is act 3: the ♛ no longer holds at a tick
  hit(s, hive, 50, { mine: true, pierce: true });
  assert.ok(hive.integrity < hh);
});

test('where the floor 4 bosses stand: BYZANTINE on a floor-4 Pit\'s last room, NIGHT DESK its floor job\'s, CAMSWARM in the lair pool with the lair\'s loot', () => {
  const s = fresh();
  const pit = createLocation('ransomware', 3, 4246);
  Object.assign(pit, { rogue: { kind: 'pit' }, template: 'rogue', depth: 4, level: 22, spawns: {}, serial: 0, quirk: null, special: null });
  assert.equal(throneOf(pit).boss, 'byzantine');
  assert.ok(rogueSpawns(s, pit)[throneOf(pit).room].level >= BOSSES.byzantine.floor);
  assert.equal(namedBoss('NIGHT DESK'), 'nightdesk');
  assert.equal(namedBoss('CAMSWARM'), null, 'a lair\'s boss is never a floor job\'s');
  assert.ok(FLOOR.lairs[4].includes('camswarm') && FLOOR.lairs[4].includes('nb-tripmine'));
  const seen = new Set(Array.from({ length: 60 }, (_, i) => lairBossFor((i + 1) * 7919, 4)));
  assert.ok(seen.has('camswarm') && seen.has('nb-tripmine'), 'floor 4\'s lair draws either');
  assert.ok(lairHeld(BOSSES.camswarm) && !BOSSES.camswarm.native);
  const t = bossTable(s, 'camswarm');
  assert.ok(t.native && t.set === null, 'it pays as a lair: the lair\'s roll and its floor\'s set pieces');
  assert.deepEqual(t.uniques.map((u) => u.id).filter((id) => ['changed-default', 'mass-reboot'].includes(id)).sort(), ['changed-default', 'mass-reboot'], 'its own pair in that roll');
});

test('the floor 4 uniques and set pieces: Overdraft, Pre-Authorization, Changed Default, Mass Reboot, Majority Attack, Quorum Sensor; the Runbook and Failover', () => {
  for (const [id, who] of [['overdraft', 'nightdesk'], ['pre-authorization', 'nightdesk'], ['runbook', 'nightdesk'], ['changed-default', 'camswarm'], ['mass-reboot', 'camswarm'], ['majority-attack', 'byzantine'], ['quorum-sensor', 'byzantine'], ['failover', 'byzantine']]) {
    assert.deepEqual(UNIQUES[id]?.sources, [{ kind: 'boss', id: who }], id);
    assert.ok(fxText(UNIQUES[id].effect).length > 0, `${id} has its effect text`);
  }
  assert.equal(bossUniques('nightdesk').length, 2, 'set pieces roll on their own table');
  // Overdraft: once a fight, a hit that would take you under 25% leaves you there; the rest lands over 3 cycles.
  const od = boss('nightdesk', { wear: ['overdraft'] }), d = defender(od);
  for (const p of livingParts(od)) p.pending = [];
  d.integrity = Math.round(d.max * 0.3);
  const t = of(od, 'teller');
  t.pending = [{ amount: Math.round(d.max * 0.4), at: od.encounter.cycle, name: 'Sell Order' }];
  command(od, 'spike teller'); resolveCycle(od); // settles at half: 20% of max, from 30%
  assert.ok(od.encounter.once.overdraft, 'Overdraft held it');
  assert.ok(d.integrity > 0 && od.encounter.overdraft.each > 0, 'and bills the rest');
  // Mass Reboot: every fragment takes a hit when a part breaks.
  const mr = boss('byzantine', { wear: ['mass-reboot'] }), nb = of(mr, 'nodeb');
  landNow(mr, nb);
  const fr = fragsOf(mr)[0], fhp = fr.integrity;
  for (const p of attackers(mr)) p.attack.due = 999;
  const nc = of(mr, 'nodec'); nc.limit = 0;
  hit(mr, nc, nc.integrity, { pierce: true, server: true });
  assert.ok(fr.integrity < fhp, 'Mass Reboot');
  // Majority Attack: +8% for each part below half. Quorum Sensor: the second landing in a cycle is softer.
  const ma0 = boss('byzantine'), ma1 = boss('byzantine', { wear: ['majority-attack'] });
  const dealt = (q) => { const [a, b, c] = ['nodea', 'nodeb', 'nodec'].map((id) => of(q, id)); for (const p of [a, b, c]) { p.armor = 0; p.limit = 0; } a.integrity = Math.round(a.max * 0.4); c.integrity = Math.round(c.max * 0.4); const w = b.integrity; hit(q, b, 5, { mine: true }); return w - b.integrity; };
  const base = dealt(ma0), more = dealt(ma1);
  assert.ok(more > base, `Majority Attack: ${more} > ${base}`);
  const qs = boss('byzantine', { wear: ['quorum-sensor'] }), qa = of(qs, 'nodea'), qc = of(qs, 'nodec');
  assert.equal(fbPower(qs, qa, qa.attack), 1);
  qs.encounter.landings = { cycle: qs.encounter.cycle, n: 1 };
  assert.equal(fbPower(qs, qc, qc.attack), 0.7, 'the second attack to land in a cycle deals 30% less');
});

// ---------- the fights session: act length, floor 4 polish, CAMSWARM's pair ----------
test('act bars: every solo boss\'s acts are bars, and its ♛ keeps plain ticks like the parts beside it', () => {
  for (const id of ['byzantine', 'nightdesk', 'centrifuge', 'relayking', 'repoman', 'choir', 'resident', 'nb-deadbolt', 'nb-hashlord', 'nb-mirrorshade', 'nb-echolalia']) {
    const s = boss(id, { level: Math.max(12, BOSSES[id].floor || 0) });
    assert.ok(s.encounter.actBars, id);
    assert.ok(s.encounter.virus.parts.filter((p) => p.ticks).every((p) => p.ticks.map((t) => t.at).join() === '0.5,0.25'), id);
  }
});

test("NIGHT DESK's attack chips read as trades, and its guide names each line once", () => {
  const s = boss('nightdesk'), teller = of(s, 'teller'), clearing = of(s, 'clearing');
  for (const p of [teller, clearing]) p.pending = [];
  teller.attack.due = s.encounter.cycle + 1;
  let m = boardMarkup(s);
  assert.match(m, /class="intent trade next"[^>]*title="Sell Order\nTrade\nOpens a pending trade of \d+/, 'a trade, with its size');
  assert.doesNotMatch(m, /Sell Order: −/, 'never a hit');
  // The trade that fills the table carries what settles in full.
  clearing.pending = [1, 2, 3].map(() => ({ amount: 10, at: s.encounter.cycle, name: 'Buy Order' }));
  m = boardMarkup(s);
  assert.match(m, /class="intent trade full next"[^>]*Every trade settles on you in full, for \d+/);
  const G = BOSSES.nightdesk.guide, names = [...G.open, ...G.phases.flat()].map((x) => x[0]);
  assert.equal(new Set(names).size, names.length, 'no two guide lines share a name');
});

test("BYZANTINE's vote chip shows beside its Node's own attack on the same cycle", () => {
  const s = boss('byzantine'), e = s.encounter, c = of(s, 'nodec');
  c.integrity = Math.round(c.max * 0.4);
  e.virus.vote.at = e.cycle + 1; c.attack.due = e.cycle + 1;
  const cell = boardMarkup(s).split('data-target="').find((r) => r.startsWith('nodec"'));
  assert.match(cell, /title="Vote: /, 'the vote');
  assert.match(cell, /title="Surge: /, 'and the Surge');
});

test("CAMSWARM's pair comes first in the lair's roll; Changed Default's helpers deal 50% more to fragments", () => {
  const s = fresh(), own = ['changed-default', 'mass-reboot'], pool = [...own, 'native-a', 'native-b'];
  assert.deepEqual(lairPick(s, own, pool), own, 'lacking both: one of the pair');
  s.listen = 'native-a';
  assert.deepEqual(lairPick(s, own, pool), own, 'whatever you listen for');
  s.collection = { 'changed-default': 1 };
  assert.deepEqual(lairPick(s, own, pool), ['mass-reboot'], 'lacking one: that one');
  s.collection['mass-reboot'] = 1;
  assert.deepEqual(lairPick(s, own, pool), ['native-a'], 'both found: the natives as before (the one you listen for)');
  s.listen = null;
  assert.deepEqual(lairPick(s, own, pool), ['native-a', 'native-b']);
  s.collection['native-a'] = s.collection['native-b'] = 1;
  assert.deepEqual(lairPick(s, own, pool), pool, 'all found: any of them');
  assert.deepEqual(lootTable(fresh(), 'camswarm').uniques.slice(0, 2).map((u) => u.id).sort(), own, 'its pair heads its loot page');
  // Changed Default: a helper's hit on a fragment deals half again; on a part, the same.
  assert.match(fxText(UNIQUES['changed-default'].effect), /playing your helpers back at you.*helpers deal 50% more to fragments/i);
  const dealt = (wear) => {
    const q = boss('byzantine', { wear }), nb = of(q, 'nodeb');
    landNow(q, nb);
    const f = fragsOf(q)[0], n = of(q, 'nodea'); n.armor = 0; f.armor = 0; f.max = f.integrity = 1000;
    const f0 = f.integrity, n0 = n.integrity;
    hit(q, f, 20, { by: 'Helper', dot: true, src: 'helper' }); hit(q, n, 20, { by: 'Helper', dot: true, src: 'helper' });
    return [f0 - f.integrity, n0 - n.integrity];
  };
  const [f0, n0] = dealt([]), [f1, n1] = dealt(['changed-default']);
  assert.equal(f1, Math.round(f0 * 1.5), 'half again to a fragment');
  assert.equal(n1, n0, 'a part takes the same');
});

// ---------- the act break (actbreak.mjs) ----------
import { hudMarkup } from './dist/view.mjs';
import { entryOf } from './dist/codex.mjs';
test("an act's last part broken: the phase event names the act and refills the board; the HUD tags ACT n/m on its segment; the Codex lists Act 2 and Act 3", () => {
  const s = boss('byzantine');
  assert.match(hudMarkup(s), /class="tag hot act-tag" title="Act 1\nAct 1 of 3\nBreak every part and its next act begins, every part back at full\.">ACT 1\/3</);
  assert.equal((hudMarkup(s).match(/class="bigbar/g) || []).length - 1, 3, 'three segments beside your bar');
  for (const p of s.encounter.virus.parts) p.integrity = 0;
  const ev = hold(s).find((x) => x.type === 'phase'), c = livingParts(s).find((p) => p.core);
  assert.deepEqual(ev.act, { n: 2, of: 3, name: 'Traitor', emote: BOSSES.byzantine.phases[0].emote, part: c.id, at: null, refill: true });
  assert.match(hudMarkup(s), /title="Traitor\nAct 2 of 3\nThe most damaged Node turns traitor\.[^"]*every part back at full\.">ACT 2\/3</);
  assert.match(hudMarkup(s), /bigbar act-done/);
  // Every boss with acts of its own names each act and gives it an emote; the Codex lists them by act.
  for (const id of ['relayking', 'repoman', 'choir', 'centrifuge', 'shakedown', 'shouldersurfer', 'recursion', 'nightdesk', 'byzantine', 'camswarm']) for (const ph of BOSSES[id].phases) assert.ok(ph.name && ph.emote, `${id}: ${ph.say}`);
  for (const ph of Object.values(BOSSES.resident.actPhases).flat()) assert.ok(ph.name && ph.emote);
  const met = Object.assign(fresh(), { dex: { fought: { relayking: 1 }, won: {} } });
  assert.deepEqual(entryOf(met, 'boss:relayking').phases.map((ph) => ph.act), [2, 3]);
});

test('the act break\'s sound, the Tritone: the break on the act sign as the tick bursts, the drone a voice of its own', async () => {
  const { SIGNS } = await import('./dist/feel.mjs');
  const { VOICES } = await import('./dist/sound.mjs');
  assert.equal(SIGNS.act.voice, 'actbreak');
  assert.equal(typeof VOICES.actbreak, 'function');
  assert.equal(typeof VOICES.actdrone, 'function');
});
