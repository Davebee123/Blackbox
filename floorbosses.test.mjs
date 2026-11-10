// The floor 2 and 3 bosses (floorbosses.mjs, docs/solo-bosses.md, GAME_RULES.md "Floor bosses"): CENTRIFUGE's Bidding,
// SHAKEDOWN's Ransom Clock, SHOULDER SURFER's Replay, RECURSION's Call, their act ticks at 60% and 30%, where they
// stand (a floor-2 Pit's and a floor-3 Gauntlet's last room), their uniques, and their marks on the board.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, livingParts, attackers, hit, addItem, loaded, UNIQUES, defender } from './dist/combat.mjs';
import { CONFIG, BOSSES, ABILITIES } from './dist/data.mjs';
import { tellsOf } from './dist/tells.mjs';
import { boardMarkup } from './dist/view.mjs';
import { uniqueItem, seeded } from './dist/gear.mjs';
import { FB, topFrame, dumpOf, fbVerb, fbPower } from './dist/floorbosses.mjs';
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

test('each floor boss: its own parts only, its ♛, act ticks at 60% and 30% on it, the rest at 50% and 25%', () => {
  for (const [id, crown, parts] of [['centrifuge', 'rotor', ['rotor', 'gavel']], ['shakedown', 'collector', ['collector', 'demand', 'lockbox']], ['shouldersurfer', 'logger', ['logger', 'pulse', 'scrambler']], ['recursion', 'main', ['main', 'frame1', 'frame2']]]) {
    const s = boss(id), v = s.encounter.virus, c = livingParts(s).find((p) => p.core);
    assert.deepEqual(v.parts.map((p) => p.id), parts, id);
    assert.equal(c.id, crown, `${id}'s ♛`);
    assert.deepEqual(c.ticks.map((t) => t.at), [0.6, 0.3], `${id}'s act ticks`);
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
  assert.equal(g.attack.interval, 3, 'back to every 3 after a sale');
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

test("SHAKEDOWN's Ransom Clock: it counts down, leaks 35% of your max at 0 (15% more each leak) and restarts at 5; a Deadline that lands pays 3; it stops with the Collector; act 2 sends a second Demand on the same cycle; act 3 re-arms on a leak", () => {
  const s = boss('shakedown'), v = s.encounter.virus, max = defender(s).max;
  assert.equal(v.ransom.left, 10);
  hold(s);
  assert.equal(v.ransom.left, 9);
  const d = of(s, 'demand');
  landNow(s, d);
  assert.equal(v.ransom.left, 11, 'a Deadline landed: +3');
  v.ransom.left = 1;
  const was = defender(s).integrity;
  hold(s);
  assert.equal(was - defender(s).integrity, Math.round(max * 0.35), 'the leak');
  assert.equal(v.ransom.left, 5, 'restarts at 5');
  v.ransom.left = 1;
  const was2 = defender(s).integrity;
  hold(s);
  assert.equal(was2 - defender(s).integrity, Math.round(max * 0.5), 'the next leak takes 15% more');
  assert.match(boardMarkup(s), /Ransom Clock\nBoss rule\nIt leaks/);
  d.attack.due = s.encounter.cycle + 3;
  command(s, 'hold');
  fbVerb(s, 'demand2');
  const d2 = of(s, 'demand2');
  assert.ok(d2?.deadline, 'a second Demand');
  assert.equal(d2.attack.due, d.attack.due, 'its Deadline on the same cycle');
  assert.ok(of(s, 'lockbox').wardsToo.includes('demand2'), 'the Lockbox wards it too');
  fbVerb(s, 'notice');
  const box = of(s, 'lockbox');
  box.integrity = 0; d.armor = 0;
  v.ransom.left = 1;
  resolveCycle(s);
  assert.ok(box.integrity === box.max && d.armor > 0, 'final notice: the Lockbox is back and the Demand re-armed');
  const left = v.ransom.left;
  of(s, 'collector').integrity = 0;
  hold(s);
  assert.equal(v.ransom.left, left, 'the Collector is down: the clock stops');
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
  for (let k = 0; k < 6 && e.cycle <= v.stack.callAt; k++) hold(s);
  const pushed = topFrame(s);
  assert.notEqual(pushed, top, 'a Call pushed a frame');
  assert.equal(pushed.max, Math.round(top.max * FB.stack.push));
  pushed.integrity = Math.floor(pushed.max * 0.2);
  const n = livingParts(s).length;
  for (let k = 0; k < 6 && e.cycle <= v.stack.callAt; k++) hold(s);
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
