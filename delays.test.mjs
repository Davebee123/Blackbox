// One delay a wind-up (combat.mjs delayAttack): once something has pushed a part's attack later, no other delay moves
// it until it lands, so it always lands in the end; the next attack can be delayed again. Every player delay goes
// through it: skills, talents, uniques, set bonuses, daemons, capstones, Stealth, reads and scripts. The board marks
// a held attack (view.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part, addItem, loaded, UNIQUES, delayAttack, delayHeld, intents } from './dist/combat.mjs';
import { uniqueItem, seeded } from './dist/gear.mjs';
import { CONFIG } from './dist/data.mjs';
import { runDaemons } from './dist/daemons.mjs';
import { tellsOf } from './dist/tells.mjs';
import { boardMarkup } from './dist/view.mjs';

CONFIG.baseCrit = 0; CONFIG.enemyCrit = 0; CONFIG.misses = false;

const vet = (cls, sub, bar, level = 30) => { const s = fresh(); s.hackers = { [cls]: { level, xp: 0 } }; s.loadout.archetype = cls; s.loadout.sub = { [cls]: sub }; s.loadout.equipped[sub] = bar; return s; };
const wear = (s, id, level) => { const it = addItem(s, uniqueItem(UNIQUES[id], level ?? UNIQUES[id].level, seeded(1))); command(s, 'load ' + it.id); assert.ok(loaded(s).some((x) => x.id === it.id), `${id} loaded`); };
// A run fight with no tells, nothing armored or breakable, and only the Pulse Node attacking: a small Surge in 3 cycles,
// every 4.
function fight(s) {
  s.run = { loc: 'x', cwd: '/', integrity: 5000, max: 5000, pack: [], visited: ['/'] };
  selectEncounter(s, 'cryptjack', 7, { level: s.hackers[s.loadout.archetype].level, mutation: null, mode: 'run' });
  command(s, 'engage');
  const e = s.encounter;
  e.virus.tells = null; e.hardened = 0;
  for (const p of e.virus.parts) { Object.assign(p, { armor: 0, maxArmor: 0, integrity: 100000, max: 100000 }); if (p.attack) p.attack.due = 999; }
  Object.assign(pulse(s).attack, { due: e.cycle + 3, interval: 4, amount: 5 });
  return e;
}
const pulse = (s) => part(s, 'pulse');
const go = (s, text) => { const ev = command(s, text); assert.ok(!ev.some((x) => x.type === 'warning'), ev.at(-1)?.message); resolveCycle(s); s.encounter.readyAt = {}; };
// Hold until the Pulse Node's attack lands: the cycle it landed on.
const landing = (s) => { const p = pulse(s), n = p.attack.n || 0; for (let k = 0; k < 20 && (p.attack.n || 0) === n; k++) go(s, 'hold'); return p.lastLanded; };

test('an attack delayed twice in one wind-up lands one cycle late, not two, and the next one can be delayed again', () => {
  const s = vet('bastion', 'warden', ['suspend']), e = fight(s), p = pulse(s), due = p.attack.due;
  assert.equal(delayAttack(s, p, 1), 1);
  assert.ok(delayHeld(p), 'held by the first delay');
  assert.equal(delayAttack(s, p, 1), 0, 'the second does nothing');
  assert.equal(p.attack.due, due + 1);
  assert.equal(landing(s), due + 1, 'it lands one cycle late');
  assert.ok(!delayHeld(p), 'landing lets go');
  const next = p.attack.due;
  assert.equal(delayAttack(s, p, 1), 1, 'the next attack can be delayed again');
  assert.equal(p.attack.due, next + 1);
  assert.equal(e.phase, 'active');
});

test('a skill: a second Suspend on the same attack does nothing, says so, and the board marks it held', () => {
  const s = vet('bastion', 'warden', ['suspend']), e = fight(s), p = pulse(s);
  p.attack.due = e.cycle + 1; const due = p.attack.due; // on the board after the push
  go(s, 'suspend pulse');
  assert.equal(p.attack.due, due + 2, 'the first Suspend: 2 cycles');
  assert.ok(intents(s).find((i) => i.source === 'pulse').held, 'the chip is held');
  assert.match(boardMarkup(s, null), /class="intent[^"]*\bheld"[^>]*title="[^"]*already delayed/);
  const mark = s.serial;
  go(s, 'suspend pulse');
  assert.equal(p.attack.due, due + 2, 'the second moves nothing');
  assert.ok(s.logs.some((x) => x.id > mark && x.held && /already delayed\. It lands on cycle \d+\./.test(x.message)));
  assert.ok(!s.logs.some((x) => x.id > mark && x.type === 'interrupt'), 'no interrupt, so no Opening either');
  landing(s);
  assert.ok(!intents(s).some((i) => i.held), 'the next attack is not held');
  const next = p.attack.due;
  go(s, 'suspend pulse');
  assert.equal(p.attack.due, next + 2, 'and Suspend moves it');
});

test('a talent: Ghost Route delays the soonest attack once, not again before it lands', () => {
  const s = vet('infiltrator', 'phantom', ['null-route']);
  s.loadout.picks.phantom = [0, 1, 0]; // Ghost Route
  const e = fight(s), p = pulse(s), due = p.attack.due;
  go(s, 'null-route');
  assert.equal(p.attack.due, due + 2);
  const mark = s.serial;
  e.nullRoute = 0; delete e.buffs['null-route'];
  go(s, 'null-route');
  assert.equal(p.attack.due, due + 2, 'held');
  assert.ok(!s.logs.some((x) => x.id > mark && /^Ghost Route/.test(x.message)));
});

test('a capstone: Ghost Step on a break delays the soonest attack, but leaves one already delayed where it is', () => {
  const broke = (pre) => {
    const s = vet('infiltrator', 'phantom', ['backdoor'], 50);
    s.loadout.caps = { phantom: 0 }; // Ghost Step, rank 2 at 50: 2 cycles
    const e = fight(s), p = pulse(s), other = e.virus.parts.find((x) => x.id !== 'pulse');
    if (pre) delayAttack(s, p, 1);
    const due = p.attack.due;
    other.integrity = 1;
    go(s, 'spike ' + other.id);
    assert.equal(other.integrity, 0);
    return p.attack.due - due;
  };
  assert.equal(broke(false), 2, 'Ghost Step: 2 cycles');
  assert.equal(broke(true), 0, 'held: nothing');
});

test('a unique: Bus Fault adds to the delay its own Jam sets, but not to one from before', () => {
  const s = vet('operator', 'hijacker', ['deploy', 'jam']); wear(s, 'bus-fault'); fight(s); const p = pulse(s);
  p.attack.due += 3; const due = p.attack.due; // room for the deploy
  go(s, 'deploy pulse');
  go(s, 'jam pulse');
  assert.equal(p.attack.due, due + 2, 'Jam (1) and Bus Fault (1) are one delay');
  go(s, 'jam pulse');
  assert.equal(p.attack.due, due + 2, 'a second Jam: Bus Fault does nothing');
});

test('a set: Choirbook (3) lengthens this command\'s delay, but not one already holding the attack', () => {
  const s = vet('bastion', 'warden', ['suspend'], 15);
  for (const id of ['psalter', 'mirror', 'keys']) wear(s, id, 15);
  fight(s); const p = pulse(s), due = p.attack.due;
  go(s, 'suspend pulse');
  assert.equal(p.attack.due, due + 3, 'Suspend (2) and a cycle more');
  go(s, 'suspend pulse');
  assert.equal(p.attack.due, due + 3, 'held: neither moves it');
});

test('a daemon: the Stall delays the soonest attack, unless it is already delayed', () => {
  const s = vet('bastion', 'warden', ['suspend']);
  s.daemons = ['stall']; s.daemonLv = { stall: 30 };
  const e = fight(s), p = pulse(s), due = p.attack.due;
  e.daemonReady = {};
  runDaemons(s);
  assert.equal(p.attack.due, due + 1, 'the Stall: a cycle');
  e.daemonReady = {};
  runDaemons(s);
  assert.equal(p.attack.due, due + 1, 'a second Stall: held');
  assert.ok(s.logs.some((x) => /^Stall: hits Pulse Node/.test(x.message)), 'it still hits the part');
});

test('a read: the stagger delays the attack once, and does nothing to an attack already delayed', () => {
  const read = (pre) => {
    const s = fresh();
    s.hackers = { breaker: { level: 18, xp: 0 } };
    selectEncounter(s, 'random', 7, { level: 18, mutation: null, family: 'ransomware' });
    command(s, 'engage');
    s.server.max = s.server.integrity = 5000; s.encounter.hardened = 0;
    for (const p of s.encounter.virus.parts) if (p.attack) p.attack.due = 999;
    const enc = Object.assign(part(s, 'encryptor'), { armor: 0, maxArmor: 0, integrity: 999, max: 999 });
    enc.attack = { name: 'Encrypt', effect: 'damage', amount: 20, interval: 6, due: s.encounter.cycle + 2, n: 0 };
    const T = tellsOf(s);
    for (const x of T.list) { x.told = false; x.after = 999; }
    Object.assign(T.list.find((x) => x.id === 'extortion'), { part: 'encryptor', told: true, said: s.encounter.cycle, next: s.encounter.cycle + 1, n: null, wound: 0, need: 2, hitBy: [], after: 999 });
    if (pre) delayAttack(s, enc, 1);
    const due = enc.attack.due, mark = s.serial;
    command(s, 'sigint'); resolveCycle(s);
    return { moved: enc.attack.due - due, line: s.logs.find((x) => x.id > mark && x.type === 'read')?.message || '' };
  };
  const plain = read(false), held = read(true);
  assert.equal(plain.moved, 1); assert.match(plain.line, /1 cycle later/);
  assert.equal(held.moved, 0); assert.match(held.line, /^READ: /); assert.doesNotMatch(held.line, /later/);
});
