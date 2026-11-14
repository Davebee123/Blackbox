// Working the ♛ (docs/solo-bosses.md, GAME_RULES.md "Solo bosses" and "Floor bosses"): a ♛'s share of its boss, the
// Resident's Watchdog, HOLLOW CHOIR's second voice, CENTRIFUGE's Sold, SHAKEDOWN's Leverage, and the parts an act
// brings back (RECURSION's frames, NIGHT DESK's Night Clerk, BYZANTINE's fork, CAMSWARM's re-infection).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, livingParts, attackers, hit, watchdogIn } from './dist/combat.mjs';
import { CONFIG, BOSSES, createVirus } from './dist/data.mjs';
import { tellsOf } from './dist/tells.mjs';
import { boardMarkup } from './dist/view.mjs';
import { FB, fbVerb, leverLeft, pendingOf, camerasOf, nodesOf, frames, topFrame } from './dist/floorbosses.mjs';
import { planner } from './dist/planner.mjs';
import * as FP from './dist/floorplan.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false; CONFIG.baseCrit = 0;
// A boss fight with its attacks parked and its tells quiet, so nothing lands unless a test says so.
function boss(id, { level = BOSSES[id].floor || 14, cls = 'breaker', family = BOSSES[id].family } = {}) {
  const s = fresh();
  FP.outfit(s, { cls, level });
  selectEncounter(s, 'random', 7, { level, mutation: null, family, boss: id });
  command(s, 'engage');
  s.server.max = s.server.integrity = 5000;
  s.encounter.hardened = 0;
  for (const p of attackers(s)) p.attack.due = 999;
  for (const t of tellsOf(s)?.list || []) { t.told = false; t.after = 999; }
  return s;
}
const of = (s, id) => s.encounter.virus.parts.find((p) => p.id === id);
const crown = (s) => livingParts(s).find((p) => p.core);
const hold = (s) => { command(s, 'hold'); return resolveCycle(s); };
const hitServer = (s, p, n) => hit(s, p, n, { pierce: true, server: true });
const total = (v) => v.parts.reduce((n, p) => n + p.max, 0);

test('a worked ♛ holds its share of the boss, taken from the other parts: the total stays', () => {
  for (const [id, family] of [['resident', 'worm'], ['resident', 'ransomware'], ['relayking', 'worm'], ['repoman', 'ransomware']]) {
    const W = BOSSES[id].work, make = () => createVirus('random', 7, { family, boss: id, threat: 21, mutation: null });
    const v = make(), c = v.parts.find((p) => p.special) || v.parts[0];
    BOSSES[id].work = null;
    let plain; try { plain = make(); } finally { BOSSES[id].work = W; }
    assert.equal(total(v), total(plain), `${id} ${family}: the total`);
    assert.ok(Math.abs(c.max / total(v) - W.share) < 0.01, `${id} ${family}: ♛ ${c.max} of ${total(v)}`);
    assert.ok(c.max > plain.parts.find((p) => p.id === c.id).max, `${id}: its ♛ grew`);
  }
  // SHOULDER SURFER's Logger, in its own numbers: half the boss.
  const ss = BOSSES.shouldersurfer.extra, sum = ss.reduce((n, p) => n + p.integrity, 0);
  assert.equal(ss.find((p) => p.id === 'logger').integrity / sum, 0.5);
});

test("the Resident's Watchdog, in act 2: every 5 cycles its ♛ stands above its next tick, every other part patches a ◆", () => {
  const s = boss('resident', { family: 'ransomware' }), v = s.encounter.virus;
  for (const p of v.parts) p.integrity = 0;
  hold(s);
  assert.equal(v.phases.filter((x) => x.done).length, 1, 'act 2');
  const c = crown(s), rest = livingParts(s).filter((p) => !p.core && p.maxArmor > 0);
  for (const p of livingParts(s).filter((x) => x.attack)) p.attack.due = 999;
  assert.ok(rest.length);
  assert.equal(watchdogIn(s), BOSSES.resident.watchdog.every - 1, 'counted from the act\'s first cycle');
  assert.match(boardMarkup(s), /Watchdog\nBoss rule/);
  for (const p of rest) p.armor = 0;
  c.armor = 0;
  for (let i = 0; i < 4; i++) hold(s);
  assert.ok(rest.every((p) => p.armor === 0), 'nothing before the fifth cycle');
  const ev = hold(s);
  assert.ok(ev.some((x) => x.watchdog), 'it says so');
  assert.ok(rest.every((p) => p.armor === 1), 'a ◆ each');
  assert.equal(c.armor, 0, 'never the ♛');
  // Past its ♛'s last tick there is no Watchdog.
  c.integrity = Math.floor(0.5 * c.max) + 1;
  for (const p of livingParts(s)) { p.ward = null; p.wardsToo = null; } // a ward is another rule
  hitServer(s, c, c.integrity - Math.floor(0.2 * c.max));
  assert.equal(watchdogIn(s), null);
  assert.doesNotMatch(boardMarkup(s), /Watchdog\nBoss rule/);
});

test("HOLLOW CHOIR's second voice takes the Pulse Node's seat, at its size", () => {
  const s = boss('choir'), pulse = of(s, 'pulse'), at = s.encounter.virus.parts.indexOf(pulse), size = pulse.max;
  for (const p of s.encounter.virus.parts) p.integrity = 0;
  hold(s);
  const voices = livingParts(s).filter((p) => p.mimic), m2 = of(s, 'mimic2');
  assert.equal(voices.length, 2);
  assert.ok(!livingParts(s).some((p) => p.id === 'pulse'), 'the Pulse Node is gone');
  assert.equal(s.encounter.virus.parts.indexOf(m2), at, 'in its seat');
  assert.equal(m2.max, size);
  assert.equal(m2.integrity, m2.max);
});

test("CENTRIFUGE's Sold: each sale heals the Rotor ♛ 10% of its max", () => {
  const s = boss('centrifuge'), rotor = crown(s), g = of(s, 'gavel');
  rotor.integrity = Math.round(rotor.max * 0.7);
  const was = rotor.integrity;
  g.attack.interval = FB.bid.fast; g.attack.due = s.encounter.cycle;
  const ev = hold(s);
  assert.equal(s.encounter.virus.bid.sold, 1);
  assert.equal(rotor.integrity, was + Math.round(rotor.max * FB.bid.heal));
  assert.ok(ev.some((x) => x.type === 'heal' && x.sold));
  assert.match(boardMarkup(s), /Each sale heals the Rotor 10% of its max/);
});

test("SHAKEDOWN's Leverage: while a Demand stands the Collector ♛ loses at most 10% of its max a cycle", () => {
  const s = boss('shakedown'), col = crown(s), cap = Math.round(col.max * FB.ransom.lever);
  col.armor = 0;
  assert.equal(leverLeft(s, col), cap);
  assert.equal(hitServer(s, col, cap * 3).dealt, cap, 'a big hit: the cap, and the rest is lost');
  assert.equal(hitServer(s, col, 5).dealt, 0, 'nothing more this cycle');
  assert.match(boardMarkup(s), /Leverage\nBoss rule/);
  hold(s);
  assert.equal(leverLeft(s, col), cap, 'a new cycle, a new cap');
  // No Demand, no cap.
  for (const d of livingParts(s).filter((p) => p.deadline)) d.integrity = 0;
  assert.equal(leverLeft(s, col), null);
  const before = col.integrity;
  hitServer(s, col, cap + 20);
  assert.ok(before - col.integrity > cap);
  assert.doesNotMatch(boardMarkup(s), /Leverage\nBoss rule/);
});

test('the planner works SHAKEDOWN\'s ♛ while its Demand stands (BOSSES work.lead), where another boss\'s ♛ waits', () => {
  const s = boss('shakedown');
  assert.equal(BOSSES.shakedown.work.lead, -1);
  of(s, 'lockbox').integrity = 0; // its ward first, as on any fight
  assert.match(planner(s), / collector$/);
  const W = BOSSES.shakedown.work;
  BOSSES.shakedown.work = null;
  try { assert.match(planner(s), / demand$/); } finally { BOSSES.shakedown.work = W; }
});

test('RECURSION: Return and Overflow each push a frame as they start, at 25% of the top frame, and harden nothing', () => {
  const s = boss('recursion'), v = s.encounter.virus, top = topFrame(s), n = frames(s).length;
  const say = fbVerb(s, 'return');
  assert.equal(frames(s).length, n + 1);
  assert.equal(topFrame(s).max, Math.round(top.max * FB.stack.act));
  assert.equal(topFrame(s).frame, top.frame + 1);
  assert.match(say, /pushes Frame 3 on top/);
  assert.ok(!v.stack.calls, 'no Call counted: the stack hits no harder');
  // The top frame too low to Call still gets one pushed over it.
  topFrame(s).integrity = 1;
  fbVerb(s, 'overflow');
  assert.equal(frames(s).length, n + 2);
  assert.ok(v.stack.ret && v.stack.overflow);
});

test("NIGHT DESK's Night shift clocks in the Night Clerk: a third trader holding one trade, opening none of its own", () => {
  const s = boss('nightdesk');
  assert.equal(pendingOf(s).length, 0, 'no backlog as it opens');
  fbVerb(s, 'nightshift');
  const clerk = of(s, 'clerk');
  assert.equal(clerk.role, 'trader');
  assert.ok(!clerk.attack);
  assert.equal(clerk.pending.length, 1);
  assert.equal(pendingOf(s).length, 1);
  assert.match(boardMarkup(s), /Night Clerk/);
  // On the books: it takes no damage while the Desk stands, and goes with it.
  assert.equal(hitServer(s, clerk, 50).dealt, 0);
  const desk = crown(s);
  desk.integrity = 1; delete desk.limit;
  for (const ph of s.encounter.virus.phases) ph.done = true; // past its acts: the ♛ holds at no tick
  hitServer(s, desk, 5);
  assert.equal(clerk.integrity, 0);
});

test("BYZANTINE's Hard fork forks at once: every broken Node returns at the standing Nodes' average, with fresh ticks", () => {
  const s = boss('byzantine'), b = of(s, 'nodeb'), c = of(s, 'nodec'), a = of(s, 'nodea');
  b.integrity = 0;
  a.integrity = Math.round(a.max * 0.3); c.integrity = Math.round(c.max * 0.5);
  const say = fbVerb(s, 'hardfork');
  assert.equal(nodesOf(s).length, 3);
  assert.equal(b.integrity, Math.round(b.max * 0.4));
  assert.equal(b.ticks, null, 'its ticks are dealt fresh on its first hit');
  assert.match(say, /Node B returns at 40%/);
  assert.ok(s.encounter.virus.vote.fork);
  // Nothing broken: the plain line.
  const t = boss('byzantine');
  assert.equal(fbVerb(t, 'hardfork'), null);
});

test("CAMSWARM's Botnet re-infects: the C2 Node is back, and each other part you broke returns as a Camera at 30%", () => {
  const s = boss('camswarm'), pulse = of(s, 'pulse'), c2 = of(s, 'c2');
  pulse.integrity = 0; c2.integrity = 0;
  const say = fbVerb(s, 'botnet');
  assert.ok(livingParts(s).some((p) => p.role === 'c2'), 'the C2 Node as itself');
  assert.equal(camerasOf(s).length, 1);
  const cam = camerasOf(s)[0];
  assert.equal(cam.id, 'pulse', 'in its place');
  assert.equal(cam.name, 'Camera 1');
  assert.equal(cam.integrity, Math.round(cam.max * FB.swarm.back));
  assert.match(say, /re-infects: C2 Node, Pulse Node as Camera 1/);
  // Nothing broken: the plain line.
  const t = boss('camswarm');
  assert.equal(fbVerb(t, 'botnet'), null);
  assert.equal(camerasOf(t).length, 0);
});
