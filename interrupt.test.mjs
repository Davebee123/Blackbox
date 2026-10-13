// The interrupt (docs/servers.md 3, interrupt.mjs) in the rooms playtest's fights: two ticks a part at 50% and 25%;
// crossing one on a cycle the part's move is due cancels that move, once each; a wasted tick stays spent; burns,
// helpers and daemons count; small parts have none; a charge riding the move is called off with it; and DEADBOLT under
// the three boss rules (a, b, c). The old game's fights carry no ticks.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, hooks, active, hit, part, livingParts, command, resolveCycle, selectEncounter, attackers } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import * as FP from './dist/floorplan.mjs';
import { TICKS, BOSS_RULES, cutsNow, crossBy, interruptMove } from './dist/interrupt.mjs';
import { tellsOf, plannedTells } from './dist/tells.mjs';

CONFIG.enemyCrit = 0; CONFIG.misses = false; CONFIG.baseCrit = 0;
let clock = Date.UTC(2026, 0, 1);
hooks.now = () => clock;
// A room fight with a family of our choosing, its attacks parked so nothing lands unless a test says so.
function roomFight({ family = 'ransomware', set = 'standard', cls = 'breaker', level = 10, kind = 'process', boss = 'a', third = null } = {}) {
  const s = fresh();
  s.rng = 4242;
  FP.outfit(s, { cls, level, gearSeed: 3 });
  FP.startRooms(s, { seed: 5, kind: 'Mirror', size: 'medium', level, boss });
  FP.connect(s);
  const R = s.rooms, room = FP.roomList(s).find((r) => r.kind === kind);
  if (kind === 'process') Object.assign(room, { family, set, third, author: 'tollgate' });
  R.at = room.id; R.screen = null;
  if (kind === 'core') R.opened[R.graph.vaults[0]] = clock;
  FP.fight(s, room);
  s.run.integrity = s.run.max = 5000; R.fightFrom = 5000;
  s.encounter.hardened = 0;
  return s;
}
const park = (s) => { for (const p of attackers(s)) p.attack.due = 999; for (const p of livingParts(s)) if (p.deliver) p.deliver.due = 999; };
const bare = (p) => { p.armor = 0; p.maxArmor = 0; p.patchAt = null; };
// Take a part to just above a share of its max, then deal what crosses it.
const above = (p, at) => { p.integrity = Math.floor(at * p.max) + 3; };
const strike = (s, p, n) => hit(s, p, n, { pierce: true, server: true });

test('every part that is big enough carries two ticks, at 50% and 25%; small parts carry none', () => {
  const s = roomFight({ family: 'worm', set: 'standard' }), e = s.encounter;
  assert.ok(e.rooms);
  for (const p of livingParts(s)) assert.deepEqual(p.ticks.map((t) => t.at), TICKS.at, p.id);
  // A fragment the Replicator spawns has none.
  const rep = part(s, 'replicator');
  park(s); rep.attack.due = e.cycle;
  command(s, 'hold'); resolveCycle(s);
  const frag = livingParts(s).find((p) => p.kind === 'fragment');
  assert.ok(frag, 'a fragment spawned');
  strike(s, frag, 1);
  assert.equal(frag.ticks, undefined, 'fragments carry no ticks');
  // A Mailhub's Spam Flood and a Mutex (18 at level 6 scale) have none either.
  const m = roomFight({ family: 'ransomware', third: 'mutexlock' });
  const mutex = part(m, 'mutex');
  if (mutex) assert.equal(mutex.ticks, undefined, 'a Mutex is under 20');
});

test('crossing a tick on the cycle a part\'s move is due cancels that move, and only that part\'s', () => {
  const s = roomFight({ family: 'ransomware' }), e = s.encounter, pulse = part(s, 'pulse'), enc = part(s, 'encryptor');
  park(s); bare(pulse);
  pulse.attack.due = e.cycle; enc.attack.due = e.cycle;
  const interval = pulse.attack.interval;
  above(pulse, 0.5);
  strike(s, pulse, 5);
  assert.equal(pulse.ticks[0].spent, true);
  assert.equal(pulse.attack.due, e.cycle + interval, 'cancelled: its next comes at its usual interval from now');
  assert.equal(enc.attack.due, e.cycle, 'the other part still has its move');
  assert.ok(s.logs.some((x) => x.type === 'cut' && x.target === 'pulse'));
  // The cycle plays out: the Surge doesn't land, the Encrypt does.
  const first = s.serial;
  command(s, 'hold'); resolveCycle(s);
  const ev = s.logs.filter((x) => x.id > first);
  assert.ok(!ev.some((x) => x.type === 'server-hit' && x.source === 'pulse'), 'no Surge');
  assert.ok(ev.some((x) => x.type === 'encrypt'), 'the Encrypt lands');
  assert.equal(e.metrics.cuts, 1);
});

test('each tick works once: a wasted tick stays spent, and healing back over it doesn\'t re-arm it', () => {
  const s = roomFight({ family: 'ghostroot' }), e = s.encounter, p = part(s, 'pulse');
  park(s); bare(p);
  above(p, 0.5);
  strike(s, p, 5); // nothing due: wasted
  assert.equal(p.ticks[0].spent, true);
  assert.ok(s.logs.some((x) => x.type === 'tick-wasted' && x.target === 'pulse'));
  assert.equal(p.attack.due, 999, 'nothing cancelled');
  // Healed back over it, then crossed again on a due cycle: no cancel.
  p.integrity = p.max;
  p.attack.due = e.cycle;
  above(p, 0.5);
  strike(s, p, 5);
  assert.equal(p.attack.due, e.cycle, 'a spent tick never cancels');
  // The 25% tick still works.
  above(p, 0.25);
  strike(s, p, 5);
  assert.equal(p.ticks[1].spent, true);
  assert.equal(p.attack.due, e.cycle + p.attack.interval, 'the second tick cancels');
  assert.equal(e.metrics.cuts, 1); assert.equal(e.metrics.wasted, 1);
});

test('one hit across both ticks spends both and cancels one move at most', () => {
  const s = roomFight({ family: 'ransomware' }), e = s.encounter, p = part(s, 'pulse');
  park(s); bare(p);
  p.attack.due = e.cycle;
  p.integrity = Math.floor(0.5 * p.max) + 2;
  strike(s, p, Math.ceil(0.3 * p.max));
  assert.ok(p.integrity > 0 && p.ticks.every((t) => t.spent), 'both spent');
  assert.equal(p.attack.due, e.cycle + p.attack.interval);
  assert.equal(e.metrics.cuts, 1);
  assert.equal(e.metrics.wasted, 1, 'the second is wasted');
});

test('burns and helpers count: their ticks land before the attacks do', () => {
  for (const kind of ['burn', 'helper']) {
    const s = roomFight({ family: 'ransomware', cls: 'infiltrator' }), e = s.encounter, p = part(s, 'pulse');
    park(s); bare(p);
    p.attack.due = e.cycle;
    above(p, 0.5);
    if (kind === 'burn') e.burns.push({ id: 'inject', name: 'Inject', target: p.id, damage: 20, left: 2, synced: false });
    else e.helpers.push({ target: p.id, damage: 20, left: 2 });
    const first = s.serial, interval = p.attack.interval;
    command(s, 'hold'); resolveCycle(s);
    const ev = s.logs.filter((x) => x.id > first);
    assert.ok(ev.some((x) => x.type === 'cut' && x.target === p.id), `${kind}: it cut`);
    assert.ok(!ev.some((x) => x.type === 'server-hit' && x.source === p.id), `${kind}: no Surge`);
    assert.equal(p.attack.due, e.cycle - 1 + interval, `${kind}: rescheduled from the cancelled cycle`);
  }
});

test('a charge riding the cancelled move is called off with it', () => {
  const s = roomFight({ family: 'ransomware' }), e = s.encounter, enc = part(s, 'encryptor');
  const T = tellsOf(s);
  assert.ok(T?.list.length, 'a level 10 virus brings a tell');
  const charge = T.list.find((t) => t.kind === 'charge');
  assert.ok(charge && charge.part === 'encryptor');
  park(s); bare(enc);
  enc.attack.due = e.cycle; enc.attack.n = 0;
  Object.assign(charge, { told: true, said: e.cycle - 2, n: 0, next: null, need: 999, wound: 0, hitBy: [] });
  above(enc, 0.5);
  strike(s, enc, 5);
  assert.equal(charge.told, false, 'the charge is called off');
  assert.ok(s.logs.some((x) => x.type === 'blocked' && x.tell === charge.id));
});

test('the Now column says what crossing takes, and a queued command says whether it cuts', () => {
  const s = roomFight({ family: 'ransomware' }), e = s.encounter, p = part(s, 'pulse');
  park(s);
  p.attack.due = e.cycle; p.armor = 1;
  const c = cutsNow(s).find((x) => x.part === 'pulse');
  assert.equal(c.need, p.integrity - Math.floor(0.5 * p.max));
  assert.equal(c.armor, 1);
  bare(p);
  p.max = 400; p.integrity = 203;
  assert.equal(crossBy(s, 'spike', p), 'cut');
  p.attack.due = 999;
  assert.equal(crossBy(s, 'spike', p), 'waste');
  // The bots cross on the due cycle.
  p.attack.due = e.cycle;
  const move = interruptMove(s);
  assert.ok(move && move.endsWith(' pulse'), move);
});

test('the old game\'s fights carry no ticks', () => {
  const s = fresh();
  s.rng = 1;
  selectEncounter(s, 'cryptjack', 7);
  command(s, 'engage');
  assert.ok(active(s));
  const p = livingParts(s)[0];
  hit(s, p, Math.ceil(p.max * 0.6), { pierce: true, server: true });
  assert.ok(livingParts(s).every((x) => x.ticks === undefined));
  assert.ok(!s.logs.some((x) => x.type === 'cut' || x.type === 'tick-wasted'));
});

// ---------- DEADBOLT under the three boss rules ----------
const boss = (rule) => roomFight({ kind: 'core', boss: rule });
test('boss rule (a): the core part\'s ticks are its phases; its other parts interrupt as usual', () => {
  const s = boss('a'), e = s.encounter, v = e.virus, core = part(s, 'encryptor'), pulse = part(s, 'pulse');
  assert.equal(e.bossRule, 'a');
  assert.ok(core.core && core.ticks.every((t) => t.phase != null), 'phase ticks on the ♛ part');
  assert.ok(pulse.ticks.every((t) => t.phase == null), 'plain ticks on the rest');
  assert.ok(v.phases.every((ph) => ph.at < 0), 'no phase by total Integrity');
  park(s); bare(core); bare(pulse);
  // The total drops well past 60%: nothing.
  pulse.integrity = 1;
  command(s, 'hold'); resolveCycle(s);
  assert.ok(v.phases.every((ph) => !ph.done), 'the total alone starts nothing');
  // Across its 50% tick, with its move due: the phase starts, and the move isn't cancelled.
  core.attack.due = e.cycle;
  above(core, 0.5);
  core.lockHp = 0;
  strike(s, core, 5);
  assert.equal(core.attack.due, e.cycle, 'a phase tick cancels nothing');
  command(s, 'hold'); resolveCycle(s);
  assert.equal(v.phases[0].done, true, 'phase 2: DEADBOLT re-arms');
  assert.ok(s.logs.some((x) => x.type === 'phase'));
  assert.ok(core.armor > 0, 're-armed');
  // The pulse still interrupts.
  const p2 = part(s, 'pulse');
  p2.integrity = p2.max; p2.ticks.forEach((t) => { t.spent = false; }); bare(p2); p2.attack.due = e.cycle; above(p2, 0.5);
  strike(s, p2, 5);
  assert.equal(p2.attack.due, e.cycle + p2.attack.interval);
});

test('boss rule (b): every part interrupts, phases stay on total Integrity, and it brings one more charge', () => {
  const a = boss('a'), b = boss('b'), e = b.encounter, v = e.virus;
  assert.equal(e.bossRule, 'b');
  assert.ok(livingParts(b).filter((p) => p.ticks).every((p) => p.ticks.every((t) => t.phase == null)), 'normal ticks on every part, the core too');
  assert.deepEqual(v.phases.map((ph) => ph.at), [0.6, 0.3], 'its own phases, on total');
  const charges = (s) => plannedTells(s.encounter.virus).filter((t) => t.kind === 'charge').length;
  assert.equal(charges(b), charges(a) + 1, 'one more charge');
  // The core part's tick cancels its move.
  const core = part(b, 'encryptor');
  park(b); bare(core); core.lockHp = 0;
  core.attack.due = e.cycle; above(core, 0.5);
  strike(b, core, 5);
  assert.equal(core.attack.due, e.cycle + core.attack.interval);
});

test('boss rule (c): phases at 50% and 25% of total, and only three interrupts a fight', () => {
  const s = boss('c'), e = s.encounter, v = e.virus;
  assert.equal(e.bossRule, 'c');
  assert.deepEqual(v.phases.map((ph) => ph.at), [0.5, 0.25]);
  assert.equal(e.cutBudget, TICKS.budget);
  park(s);
  const ps = livingParts(s).filter((p) => p.ticks);
  let cuts = 0;
  for (const p of ps) for (const at of TICKS.at) {
    bare(p); p.lockHp = 0; p.attack && (p.attack.due = e.cycle);
    if (!p.attack) continue;
    above(p, at);
    const due = p.attack.due;
    strike(s, p, 5);
    if (p.attack.due !== due) cuts++;
  }
  assert.equal(cuts, TICKS.budget, 'three cancels, then the budget is spent');
  assert.equal(e.cutBudget, 0);
  assert.ok(s.logs.some((x) => x.type === 'tick-wasted' && /budget/.test(x.message)));
  assert.ok(BOSS_RULES.a && BOSS_RULES.b && BOSS_RULES.c);
});
