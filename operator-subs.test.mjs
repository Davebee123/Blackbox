// Operator subclasses (dist/classes/operator.mjs): Herder and Hijacker. Every new skill, both edges,
// every new talent, and the planner playing both lines.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part, keyMap, knownSkills, readyIn, patchDelay } from './dist/combat.mjs';
import { CONFIG, ABILITIES, SUBS, SUBCLASS, ARCHETYPES, unlockLevel } from './dist/data.mjs';
import OPERATOR from './dist/classes/operator.mjs';

// The balance run at the end plays with the real numbers: keep them before these tests flatten them.
const REAL = { baseCrit: CONFIG.baseCrit, enemyCrit: CONFIG.enemyCrit, partToughness: CONFIG.partToughness, enemyRamp: CONFIG.enemyRamp, misses: CONFIG.misses, edges: CONFIG.edges, powerPerLevel: CONFIG.powerPerLevel, gap: CONFIG.gap };
// Exact numbers: no crits, no misses, base part numbers, flat power, no level gap; edges off unless a test turns one on.
Object.assign(CONFIG, { baseCrit: 0, enemyCrit: 0, partToughness: 1, enemyRamp: 0, misses: false, edges: false, powerPerLevel: 0, gap: { dealt: 0, taken: 0, floor: 1, below: 0 } });

// A level-50 Operator in a quiet cryptjack fight (Pulse and Encryptor), with the dev kit: every skill
// of the class, these talents, these ranks, and this subclass.
const start = ({ sub = 'herder', talents = [], ranks = {}, id = 'cryptjack' } = {}) => {
  const s = fresh();
  s.loadout.archetype = 'operator';
  s.hackers = { operator: { level: 50, xp: 0 } };
  s.loadout.sub = { operator: sub };
  s.loadout.devKit = { talents };
  s.loadout.ranks.operator = ranks;
  selectEncounter(s, id, 7, { level: 6 });
  command(s, 'engage');
  for (const p of s.encounter.virus.parts) Object.assign(p, { attack: null, armor: 0, maxArmor: 0, patchAt: null, integrity: 500, max: 500 });
  return s;
};
const act = (s, text) => {
  const w = text.split(' ')[0], eq = (s.loadout.equipped.operator ||= Object.values(keyMap(s)).filter((x) => x !== 'spike'));
  if (ABILITIES[w] && w !== 'spike' && !Object.values(keyMap(s)).includes(w) && knownSkills(s, 'operator').includes(w)) { if (eq.length >= 7) eq.shift(); eq.push(w); }
  const events = command(s, text);
  assert.ok(!events.some((e) => e.type === 'warning'), events.at(-1)?.message);
  return resolveCycle(s);
};
// A command on its own (no cycle), with the skill put on the bar first.
const tryCmd = (s, text) => { const w = text.split(' ')[0], eq = (s.loadout.equipped.operator ||= Object.values(keyMap(s)).filter((x) => x !== 'spike')); if (!eq.includes(w)) { if (eq.length >= 7) eq.shift(); eq.push(w); } return command(s, text).at(-1).message; };
const lost = (s, id) => part(s, id).max - part(s, id).integrity;
const surge = (s, id, amount, due = s.encounter.cycle, interval = 4) => (part(s, id).attack = { name: 'Surge', effect: 'damage', amount, interval, due });
const edges = (fn) => { CONFIG.edges = true; try { fn(); } finally { CONFIG.edges = false; } };
const logged = (s, re) => s.logs.filter((e) => re.test(e.message)).length;

// ---------- the lines ----------
test('both lines have eight skills, unlocking from 12 to 38; every new skill is an Operator skill with a card and library text', () => {
  for (const id of ['herder', 'hijacker']) {
    const x = SUBS[id];
    assert.equal(x.cls, 'operator');
    assert.equal(x.skills.length, 8, id);
    x.skills.forEach((k, i) => assert.equal(unlockLevel('operator', k, id), SUBCLASS.unlocks[i], k));
  }
  for (const [k, a] of Object.entries(ABILITIES).filter(([, a]) => a.sub === 'herder' || a.sub === 'hijacker')) {
    assert.equal(a.cls, 'operator', k);
    assert.ok(SUBS[a.sub].skills.includes(k), `${k} is on the ${a.sub} line`);
    assert.match(a.help, new RegExp(`^${k}( <part>)? — .+\\.$`), k);
    assert.ok(a.short && a.desc && a.icon && a.cooldown > 0, k);
    assert.ok(ARCHETYPES.operator.skills.some((c) => c.id === k), k);
  }
  const ids = (x) => new Set([...x.fillers.flat(), ...x.talents.flat()].map((n) => n.id));
  const shared = [...ids(SUBS.herder)].filter((i) => ids(SUBS.hijacker).has(i));
  assert.ok(shared.length <= 2, `the trees are their own (shared: ${shared})`);
  assert.equal(SUBS.hijacker.edge.name, 'Man in the Middle');
  assert.equal(SUBS.herder.edge.name, 'Last Gasp');
});

// ---------- Herder ----------
test('Fan-out: a helper on every part; Wide Area makes them bigger', () => {
  const s = start();
  act(s, 'fan-out pulse');
  assert.equal(s.encounter.helpers.length, 2);
  assert.ok(s.encounter.helpers.every((h) => h.damage === 6 && h.left === 2));
  assert.equal(lost(s, 'pulse'), 6);
  assert.equal(lost(s, 'encryptor'), 6);
  const w = start({ ranks: { 'wide-area': 2 } });
  act(w, 'fan-out encryptor');
  assert.equal(lost(w, 'pulse'), 8);
  assert.equal(lost(w, 'encryptor'), 8);
});

test('Mesh: a helper hit that does damage splashes half onto every other part', () => {
  const s = start();
  act(s, 'mesh');
  act(s, 'deploy pulse');
  assert.equal(lost(s, 'pulse'), 12);
  assert.equal(lost(s, 'encryptor'), 6, 'half of the 12');
  for (let k = 0; k < 3; k++) act(s, 'hold');
  assert.equal(lost(s, 'encryptor'), 6 + 6, 'one more splash, then Mesh runs out');
  const armored = start();
  Object.assign(part(armored, 'encryptor'), { armor: 2, maxArmor: 2 });
  act(armored, 'mesh');
  act(armored, 'deploy pulse');
  assert.equal(part(armored, 'encryptor').armor, 1, 'a splash on armor breaks a chit');
});

test('Malloc: the next three helpers deal half again and run a cycle longer', () => {
  const s = start();
  act(s, 'malloc');
  act(s, 'deploy pulse');
  assert.deepEqual(s.encounter.helpers.map((h) => [h.damage, h.left]), [[18, 4]]);
  assert.equal(lost(s, 'pulse'), 18);
  assert.equal(s.encounter.malloc, 2);
  act(s, 'botnet encryptor');
  assert.equal(s.encounter.malloc, 0, 'two of the three botnet helpers got it');
  assert.deepEqual(s.encounter.helpers.filter((h) => h.target === 'encryptor').map((h) => h.damage), [6, 6, 4]);
});

test('OOM Kill: every helper goes, and you heal 40% of what they had left', () => {
  const s = start();
  act(s, 'deploy pulse');
  s.server.integrity = 50;
  assert.match(tryCmd(start(), 'oom-kill'), /No helpers/);
  act(s, 'oom-kill');
  assert.equal(s.encounter.helpers.length, 0);
  assert.equal(s.server.integrity, 50 + Math.round(12 * 3 * 0.4));
});

test('GC Tuning: Garbage Collect hits 30% harder per rank', () => {
  const s = start({ ranks: { 'gc-tuning': 1 } });
  act(s, 'garbage-collect');
  assert.equal(lost(s, 'pulse'), 13);
  assert.equal(lost(s, 'encryptor'), 13);
});

test('Hydra: when a part breaks, each of your helpers on it splits in two on the next one', () => {
  const s = start({ talents: ['hydra'] });
  act(s, 'deploy pulse');
  part(s, 'pulse').integrity = 1;
  act(s, 'spike pulse');
  assert.equal(s.encounter.helpers.length, 2);
  assert.ok(s.encounter.helpers.every((h) => h.target === 'encryptor'));
  assert.equal(lost(s, 'encryptor'), 24, 'both hit the Encryptor that cycle');
  const plain = start();
  act(plain, 'deploy pulse');
  part(plain, 'pulse').integrity = 1;
  act(plain, 'spike pulse');
  assert.equal(plain.encounter.helpers.length, 1, 'without it, the helper just moves on');
});

test('Last Gasp is the Herder\'s edge; Zombie Process makes it hit twice', () => {
  edges(() => {
    const s = start();
    act(s, 'deploy pulse');
    for (let k = 0; k < 4; k++) act(s, 'hold');
    assert.equal(logged(s, /^Last Gasp: /), 1);
    assert.equal(lost(s, 'pulse'), 12 * 5);
    const z = start({ talents: ['zombie-process'] });
    act(z, 'deploy pulse');
    for (let k = 0; k < 4; k++) act(z, 'hold');
    assert.equal(logged(z, /^Zombie Process: /), 1);
    assert.equal(lost(z, 'pulse'), 12 * 6);
    const h = start({ sub: 'hijacker' });
    act(h, 'deploy pulse');
    for (let k = 0; k < 4; k++) act(h, 'hold');
    assert.equal(logged(h, /^Last Gasp: /), 0, 'not the Hijacker\'s');
  });
});

// ---------- Hijacker ----------
test('Jam marks the part Jammed; Man in the Middle: a Jammed part takes +20% from everyone, Hijacker only', () => {
  edges(() => {
    const s = start({ sub: 'hijacker' });
    act(s, 'deploy pulse');
    surge(s, 'pulse', 20, s.encounter.cycle + 1);
    act(s, 'jam pulse');
    const p = part(s, 'pulse');
    assert.equal(p.attack.due, s.encounter.cycle + 1, 'pushed back a cycle');
    assert.ok(p.jammedUntil >= s.encounter.cycle);
    const before = lost(s, 'pulse');
    act(s, 'spike pulse');
    assert.equal(lost(s, 'pulse') - before, 30, '25 +20%');
    // From everyone: a crewmate of any class gets it on this part too.
    const mate = fresh();
    mate.encounter = { cycle: s.encounter.cycle };
    assert.equal(OPERATOR.dealt(mate, p, {}), 1.2);
    assert.equal(OPERATOR.dealt(mate, part(s, 'encryptor'), {}), 1, 'only the Jammed part');
    // The Herder's Jam doesn't carry it.
    const h = start();
    act(h, 'deploy pulse');
    surge(h, 'pulse', 20, h.encounter.cycle + 1);
    act(h, 'jam pulse');
    const b2 = lost(h, 'pulse');
    act(h, 'spike pulse');
    assert.equal(lost(h, 'pulse') - b2, 25);
  });
});

test('Full Duplex: Jammed parts take +40%; Kill Chain: breaking a Jammed part readies Jam, Spoofed ACK and Hijack', () => {
  edges(() => {
    const s = start({ sub: 'hijacker', talents: ['full-duplex'] });
    act(s, 'deploy pulse');
    surge(s, 'pulse', 20, s.encounter.cycle + 1);
    act(s, 'jam pulse');
    const before = lost(s, 'pulse');
    act(s, 'spike pulse');
    assert.equal(lost(s, 'pulse') - before, 35);
  });
  const k = start({ sub: 'hijacker', talents: ['kill-chain'] });
  act(k, 'deploy pulse');
  surge(k, 'pulse', 20, k.encounter.cycle + 1);
  act(k, 'jam pulse');
  assert.ok(readyIn(k, 'jam') > 0);
  part(k, 'pulse').integrity = 1;
  act(k, 'spike pulse');
  assert.equal(readyIn(k, 'jam'), 0);
  assert.ok(k.logs.some((e) => /^Kill Chain/.test(e.message)));
});

test('Long Jam pushes the attack back two cycles; Loopback keeps the helper', () => {
  const s = start({ sub: 'hijacker', talents: ['long-jam'] });
  act(s, 'deploy pulse');
  surge(s, 'pulse', 20, s.encounter.cycle + 1);
  const due = part(s, 'pulse').attack.due;
  act(s, 'jam pulse');
  assert.equal(part(s, 'pulse').attack.due, due + 2);
  const l = start({ sub: 'hijacker', talents: ['loopback'] });
  act(l, 'deploy pulse');
  surge(l, 'pulse', 20, l.encounter.cycle + 1);
  act(l, 'jam pulse');
  assert.equal(l.encounter.helpers.length, 1, 'the helper is still running');
  assert.equal(part(l, 'pulse').attack.due, l.encounter.cycle + 1);
});

test('Spoofed ACK: the attack waits a cycle and the part takes half of it; ACK Flood sends back more', () => {
  const s = start({ sub: 'hijacker' });
  surge(s, 'pulse', 30, s.encounter.cycle);
  const due = part(s, 'pulse').attack.due;
  act(s, 'spoofed-ack pulse');
  assert.equal(part(s, 'pulse').attack.due, due + 1);
  assert.equal(lost(s, 'pulse'), 15);
  assert.equal(s.server.integrity, s.server.max, 'nothing landed');
  assert.ok(part(s, 'pulse').jammedUntil >= s.encounter.cycle);
  const f = start({ sub: 'hijacker', ranks: { 'ack-flood': 2 } });
  surge(f, 'pulse', 30, f.encounter.cycle);
  act(f, 'spoofed-ack pulse');
  assert.equal(lost(f, 'pulse'), 21);
  const big = start({ sub: 'hijacker' });
  surge(big, 'pulse', 200, big.encounter.cycle + 2);
  act(big, 'spoofed-ack pulse');
  assert.equal(lost(big, 'pulse'), 40, 'up to 40');
  assert.match(tryCmd(start({ sub: 'hijacker' }), 'spoofed-ack pulse'), /no attack/);
});

test('Hijack: spend a helper, and the part\'s next hit lands on its own side, through armor', () => {
  const s = start({ sub: 'hijacker' });
  act(s, 'deploy pulse');
  Object.assign(part(s, 'encryptor'), { armor: 2, maxArmor: 2 });
  surge(s, 'pulse', 30);
  const was = lost(s, 'pulse');
  act(s, 'hijack pulse');
  assert.equal(s.encounter.helpers.length, 0, 'the helper is spent');
  assert.equal(lost(s, 'encryptor'), 18, '60% of 30');
  assert.equal(part(s, 'encryptor').armor, 2, 'straight through armor');
  assert.equal(lost(s, 'pulse'), was);
  assert.equal(s.server.integrity, s.server.max, 'nothing reached you');
  assert.equal(part(s, 'pulse').attack.due, s.encounter.cycle - 1 + 4, 'its timer starts over');
  assert.equal(part(s, 'pulse').hijack, undefined);
  assert.match(tryCmd(start({ sub: 'hijacker' }), 'hijack pulse'), /no helper/);
  // A part on its own hits itself; anything that isn't a hit does nothing.
  const solo = start({ sub: 'hijacker' });
  part(solo, 'encryptor').integrity = 0;
  act(solo, 'deploy pulse');
  surge(solo, 'pulse', 30);
  const w2 = lost(solo, 'pulse');
  act(solo, 'hijack pulse');
  assert.equal(lost(solo, 'pulse') - w2, 18);
  const enc = start({ sub: 'hijacker' });
  act(enc, 'deploy encryptor');
  part(enc, 'encryptor').attack = { name: 'Encrypt', effect: 'encrypt', amount: 6, interval: 5, due: enc.encounter.cycle };
  act(enc, 'hijack encryptor');
  assert.equal(enc.encounter.encrypt, 0);
});

test('Double Agent: Hijack takes the next two attacks; Crosstalk: the hit lands on every other part', () => {
  const s = start({ sub: 'hijacker', talents: ['double-agent'] });
  act(s, 'deploy pulse');
  surge(s, 'pulse', 30, s.encounter.cycle, 2);
  act(s, 'hijack pulse');
  act(s, 'hold');
  act(s, 'hold');
  assert.equal(lost(s, 'encryptor'), 36, 'two hijacked hits');
  assert.equal(s.server.integrity, s.server.max);
  assert.equal(part(s, 'pulse').hijack, undefined);
  const c = start({ sub: 'hijacker', talents: ['crosstalk'] });
  c.encounter.virus.parts.push({ ...part(c, 'encryptor'), id: 'extra', name: 'Extra', attack: null });
  act(c, 'deploy pulse');
  surge(c, 'pulse', 30);
  act(c, 'hijack pulse');
  assert.equal(lost(c, 'encryptor'), 18);
  assert.equal(lost(c, 'extra'), 18);
});

test('Blackhole: spend a helper, and the next attack does nothing at all; Loopback keeps the helper', () => {
  const s = start({ sub: 'hijacker' });
  act(s, 'deploy encryptor');
  part(s, 'encryptor').attack = { name: 'Encrypt', effect: 'encrypt', amount: 6, interval: 5, due: s.encounter.cycle };
  act(s, 'blackhole encryptor');
  assert.equal(s.encounter.encrypt, 0);
  assert.equal(s.encounter.helpers.length, 0);
  assert.equal(part(s, 'encryptor').attack.due, s.encounter.cycle - 1 + 5);
  assert.ok(s.logs.some((e) => /blackhole and does nothing/.test(e.message)));
  const l = start({ sub: 'hijacker', talents: ['loopback'] });
  act(l, 'deploy pulse');
  surge(l, 'pulse', 30);
  act(l, 'blackhole pulse');
  assert.equal(l.server.integrity, l.server.max);
  assert.equal(l.encounter.helpers.length, 1);
});

test('Cache Poison: a patch that is due hits the part instead, and a heal it casts hurts', () => {
  const s = start({ sub: 'hijacker' });
  Object.assign(part(s, 'pulse'), { maxArmor: 1, armor: 0, patchAt: s.encounter.cycle });
  act(s, 'cache-poison pulse');
  assert.equal(part(s, 'pulse').armor, 0, 'no chit back');
  assert.equal(lost(s, 'pulse'), 15);
  assert.equal(part(s, 'pulse').patchAt, s.encounter.cycle - 1 + patchDelay(s), 'its patch starts over');
  const h = start({ sub: 'hijacker' });
  part(h, 'pulse').integrity = 400;
  part(h, 'encryptor').attack = { name: 'Patchwork', effect: 'heal', amount: 20, interval: 4, due: h.encounter.cycle };
  act(h, 'cache-poison encryptor');
  assert.equal(lost(h, 'pulse'), 120, 'the heal meant for the Pulse hurts it');
  const plain = start({ sub: 'hijacker' });
  Object.assign(part(plain, 'pulse'), { maxArmor: 1, armor: 0, patchAt: plain.encounter.cycle });
  act(plain, 'hold');
  assert.equal(part(plain, 'pulse').armor, 1, 'without it, it patches');
});

test('Replay: the part takes its own attack, 20 to 40, through armor; Packet Capture adds 5 a rank', () => {
  const s = start({ sub: 'hijacker' });
  Object.assign(part(s, 'pulse'), { armor: 3, maxArmor: 3 });
  surge(s, 'pulse', 30, s.encounter.cycle + 3);
  act(s, 'replay pulse');
  assert.equal(lost(s, 'pulse'), 30);
  assert.equal(part(s, 'pulse').armor, 3);
  const lo = start({ sub: 'hijacker' });
  surge(lo, 'pulse', 5, lo.encounter.cycle + 3);
  act(lo, 'replay pulse');
  assert.equal(lost(lo, 'pulse'), 20);
  const hi = start({ sub: 'hijacker', ranks: { 'packet-capture': 2 } });
  surge(hi, 'pulse', 90, hi.encounter.cycle + 3);
  act(hi, 'replay pulse');
  assert.equal(lost(hi, 'pulse'), 50);
});

test('Cold Storage: Barrier shields 10% more per rank', () => {
  const s = start({ sub: 'hijacker', ranks: { 'cold-storage': 1 } });
  act(s, 'deploy pulse');
  act(s, 'barrier pulse');
  assert.equal(s.encounter.shield, 36 + 4);
});

// ---------- the planner ----------
test('the planner plays both lines: wins at level 18 and 30, using the new skills', async () => {
  const flat = { ...CONFIG, gap: CONFIG.gap };
  Object.assign(CONFIG, REAL);
  try {
    const { score, BRACKETS } = await import('./balance.mjs');
    for (const L of [18, 30]) {
      const b = { ...BRACKETS.filter((x) => x.level <= L).at(-1), name: 'Lv ' + L, level: L, server: L };
      const h = score('Operator', b, { sub: 'herder' });
      const j = score('Operator', b, { sub: 'hijacker' });
      assert.ok(h.wins / h.total >= 0.85 && j.wins / j.total >= 0.85, `wins ${h.wins} ${j.wins}`);
      assert.ok(h.uses['fan-out'] && h.uses.mesh, JSON.stringify(h.uses));
      assert.ok(j.uses.hijack && j.uses.replay, JSON.stringify(j.uses));
      assert.ok(Math.abs(h.lost - j.lost) <= 15, `close: ${h.lost.toFixed(0)} vs ${j.lost.toFixed(0)}`);
    }
  } finally { Object.assign(CONFIG, flat); }
});
