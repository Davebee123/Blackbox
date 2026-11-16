// Operator subclasses (dist/classes/operator.mjs): Herder and Hijacker. Every new skill, both edges,
// every new talent, and the planner playing both lines.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part, keyMap, knownSkills, readyIn, patchDelay, fireEvent, helperCap } from './dist/combat.mjs';
import { CONFIG, ABILITIES, SUBS, SUBCLASS, ARCHETYPES, unlockLevel } from './dist/data.mjs';
import OPERATOR from './dist/classes/operator.mjs';
CONFIG.tells = false; // these check skill numbers; tells.test.mjs checks the tells

// The balance run at the end plays with the real numbers: keep them before these tests flatten them.
const REAL = { baseCrit: CONFIG.baseCrit, enemyCrit: CONFIG.enemyCrit, partToughness: CONFIG.partToughness, enemyRamp: CONFIG.enemyRamp, misses: CONFIG.misses, edges: CONFIG.edges, powerPerLevel: CONFIG.powerPerLevel, levelLine: CONFIG.levelLine, ownPerLevel: CONFIG.ownPerLevel, gearFill: CONFIG.gearFill, gap: CONFIG.gap };
// Exact numbers: no crits, no misses, base part numbers, flat power, no level gap; edges off unless a test turns one on.
Object.assign(CONFIG, { baseCrit: 0, enemyCrit: 0, partToughness: 1, enemyRamp: 0, misses: false, edges: false, powerPerLevel: 0, levelLine: 0, ownPerLevel: 0, gearFill: [[1, 1]], gap: { dealt: 0, taken: 0, floor: 1, below: 0 } });
(await import('./dist/data.mjs')).LOADOUT.specRanks = 0; // the kit talent's two free ranks (progression.mjs): off, for exact numbers

// A level-50 Operator in a quiet cryptjack fight (Pulse and Encryptor), with the dev kit: every skill
// of the class, these talents, and this subclass.
const start = ({ sub = 'herder', talents = [], id = 'cryptjack' } = {}) => {
  const s = fresh();
  s.loadout.archetype = 'operator';
  s.hackers = { operator: { level: 50, xp: 0 } };
  s.loadout.sub = { operator: sub };
  s.loadout.devKit = { talents };
  selectEncounter(s, id, 7, { level: 6 });
  command(s, 'engage');
  for (const p of s.encounter.virus.parts) Object.assign(p, { attack: null, armor: 0, maxArmor: 0, patchAt: null, integrity: 500, max: 500 });
  return s;
};
const act = (s, text) => {
  const w = text.split(' ')[0], eq = (s.loadout.equipped.operator ||= Object.values(keyMap(s)).filter((x) => x !== 'spike' && x !== 'sigint'));
  if (ABILITIES[w] && w !== 'spike' && !Object.values(keyMap(s)).includes(w) && knownSkills(s, 'operator').includes(w)) { if (eq.length >= 7) eq.shift(); eq.push(w); }
  const events = command(s, text);
  assert.ok(!events.some((e) => e.type === 'warning'), events.at(-1)?.message);
  return resolveCycle(s);
};
// A command on its own (no cycle), with the skill put on the bar first.
const tryCmd = (s, text) => { const w = text.split(' ')[0], eq = (s.loadout.equipped.operator ||= Object.values(keyMap(s)).filter((x) => x !== 'spike' && x !== 'sigint')); if (!eq.includes(w)) { if (eq.length >= 7) eq.shift(); eq.push(w); } return command(s, text).at(-1).message; };
const lost = (s, id) => part(s, id).max - part(s, id).integrity;
const surge = (s, id, amount, due = s.encounter.cycle, interval = 4) => (part(s, id).attack = { name: 'Surge', effect: 'damage', amount, interval, due });
const edges = (fn) => { CONFIG.edges = true; try { fn(); } finally { CONFIG.edges = false; } };
const logged = (s, re) => s.logs.filter((e) => re.test(e.message)).length;

// ---------- the lines ----------
test('both lines have eleven skills, unlocking from 10 to 38; every new skill is an Operator skill with a card and library text', () => {
  for (const id of ['herder', 'hijacker']) {
    const x = SUBS[id];
    assert.equal(x.cls, 'operator');
    assert.equal(x.skills.length, 11, id);
    x.skills.forEach((k, i) => assert.equal(unlockLevel('operator', k, id), SUBCLASS.unlocks[i], k));
  }
  for (const [k, a] of Object.entries(ABILITIES).filter(([, a]) => a.sub === 'herder' || a.sub === 'hijacker')) {
    assert.equal(a.cls, 'operator', k);
    assert.ok(SUBS[a.sub].skills.includes(k), `${k} is on the ${a.sub} line`);
    assert.match(a.help, new RegExp(`^${k}( <part>)? — .+\\.$`), k);
    assert.ok(a.short && a.desc && a.icon && (a.cooldown > 0 || a.once), k);
    assert.ok(ARCHETYPES.operator.skills.some((c) => c.id === k), k);
  }
  const ids = (x) => new Set(x.tiers.flat().map((n) => n.id));
  const shared = [...ids(SUBS.herder)].filter((i) => ids(SUBS.hijacker).has(i));
  assert.deepEqual(shared, [], 'the trees are their own');
  assert.equal(SUBS.hijacker.edge.name, 'Man in the Middle');
  assert.equal(SUBS.herder.edge.name, 'Last Gasp');
});

// ---------- Herder ----------
test('Fan-out: a helper on every part', () => {
  const s = start();
  act(s, 'fan-out pulse');
  assert.equal(s.encounter.helpers.length, 2);
  assert.ok(s.encounter.helpers.every((h) => h.damage === 6 && h.left === 2));
  assert.equal(lost(s, 'pulse'), 6);
  assert.equal(lost(s, 'encryptor'), 6);
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

test('GC Tuning: Garbage Collect hits 50% harder', () => {
  const s = start({ talents: ['gc-tuning'] });
  act(s, 'garbage-collect');
  assert.equal(lost(s, 'pulse'), 21);
  assert.equal(lost(s, 'encryptor'), 21);
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

test('Full Duplex: Jammed parts take +30%; Handoff: breaking a Jammed part readies Jam, Spoofed ACK and Hijack', () => {
  edges(() => {
    const s = start({ sub: 'hijacker', talents: ['full-duplex'] });
    act(s, 'deploy pulse');
    surge(s, 'pulse', 20, s.encounter.cycle + 1);
    act(s, 'jam pulse');
    const before = lost(s, 'pulse');
    act(s, 'spike pulse');
    assert.equal(lost(s, 'pulse') - before, Math.floor(25 * 1.3));
  });
  const k = start({ sub: 'hijacker', talents: ['handoff'] });
  act(k, 'deploy pulse');
  surge(k, 'pulse', 20, k.encounter.cycle + 1);
  act(k, 'jam pulse');
  assert.ok(readyIn(k, 'jam') > 0);
  part(k, 'pulse').integrity = 1;
  act(k, 'spike pulse');
  assert.equal(readyIn(k, 'jam'), 0);
  assert.ok(k.logs.some((e) => /^Handoff/.test(e.message)));
});

test('Loopback: Jam keeps the helper', () => {
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
  const f = start({ sub: 'hijacker', talents: ['ack-flood'] });
  surge(f, 'pulse', 30, f.encounter.cycle);
  act(f, 'spoofed-ack pulse');
  assert.equal(lost(f, 'pulse'), 23, 'three quarters');
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
  assert.equal(lost(s, 'encryptor'), 15, 'half of 30 (a charge would land whole: tells.test.mjs)');
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
  assert.equal(lost(solo, 'pulse') - w2, 15);
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
  assert.equal(lost(s, 'encryptor'), 30, 'two hijacked hits');
  assert.equal(s.server.integrity, s.server.max);
  assert.equal(part(s, 'pulse').hijack, undefined);
  const c = start({ sub: 'hijacker', talents: ['crosstalk'] });
  c.encounter.virus.parts.push({ ...part(c, 'encryptor'), id: 'extra', name: 'Extra', attack: null });
  act(c, 'deploy pulse');
  surge(c, 'pulse', 30);
  act(c, 'hijack pulse');
  assert.equal(lost(c, 'encryptor'), 15);
  assert.equal(lost(c, 'extra'), 15);
});

test('Blackhole: spend a helper, and the next attack does nothing at all; Loopback is Jam only', () => {
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
  assert.equal(l.encounter.helpers.length, 0);
});

test('Cache Poison: 18 now and 8 a cycle, its attacks deal 20% less, a patch that is due hits the part instead, and a heal it casts hurts', () => {
  const s = start({ sub: 'hijacker' });
  Object.assign(part(s, 'pulse'), { maxArmor: 1, armor: 0, patchAt: s.encounter.cycle });
  act(s, 'cache-poison pulse');
  assert.equal(part(s, 'pulse').armor, 0, 'no chit back');
  assert.equal(lost(s, 'pulse'), 18 + 15 + 8, 'its hit, the turned patch, and the poison\'s first bite');
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

test('Cache Poison: a poisoned part\'s attacks deal 20% less, on anyone', () => {
  const plain = start({ sub: 'hijacker' }), s = start({ sub: 'hijacker' });
  for (const x of [plain, s]) { for (const p of x.encounter.virus.parts) p.attack = null; surge(x, 'pulse', 30, x.encounter.cycle + 1); x.encounter.hardened = 0; }
  act(plain, 'hold'); act(s, 'cache-poison pulse');
  const before = [plain.server.integrity, s.server.integrity];
  act(plain, 'hold'); act(s, 'hold');
  const took = (x, i) => before[i] - x.server.integrity;
  assert.ok(took(plain, 0) > 0);
  assert.equal(took(s, 1), Math.round(took(plain, 0) * (1 - ABILITIES['cache-poison'].weaken)));
});

test('Replay: the part takes its own attack, 25 to 40, through armor; Packet Capture adds 15', () => {
  const s = start({ sub: 'hijacker' });
  Object.assign(part(s, 'pulse'), { armor: 3, maxArmor: 3 });
  surge(s, 'pulse', 30, s.encounter.cycle + 3);
  act(s, 'replay pulse');
  assert.equal(lost(s, 'pulse'), 30);
  assert.equal(part(s, 'pulse').armor, 3);
  const lo = start({ sub: 'hijacker' });
  surge(lo, 'pulse', 5, lo.encounter.cycle + 3);
  act(lo, 'replay pulse');
  assert.equal(lost(lo, 'pulse'), 25);
  const hi = start({ sub: 'hijacker', talents: ['packet-capture'] });
  surge(hi, 'pulse', 90, hi.encounter.cycle + 3);
  act(hi, 'replay pulse');
  assert.equal(lost(hi, 'pulse'), 55, 'capped at 40, +15');
});

test('Cold Storage: Barrier shields 25% more', () => {
  const s = start({ sub: 'hijacker', talents: ['cold-storage'] });
  act(s, 'deploy pulse');
  act(s, 'barrier pulse');
  assert.equal(s.encounter.shield, 36 + 9);
});

// ---------- the talent tiers (docs/builds.md): one test a new talent ----------
test('Node Pool: Botnet helpers +3; Long-running: Deploy helpers last 6 cycles; Renice: helpers +10%', () => {
  const s = start({ talents: ['node-pool'] });
  act(s, 'botnet pulse');
  assert.ok(s.encounter.helpers.length === 3 && s.encounter.helpers.every((h) => h.damage === 7));
  const l = start({ talents: ['long-running'] });
  act(l, 'deploy pulse');
  assert.equal(l.encounter.helpers[0].left, 5);
  const r = start({ talents: ['renice'] });
  act(r, 'deploy pulse');
  assert.equal(lost(r, 'pulse'), Math.floor(12 * 1.1));
});

test('Supervisor: Kill Switch readies Deploy; Hive: 9 helpers', () => {
  const s = start({ talents: ['supervisor', 'hive'] });
  act(s, 'deploy pulse');
  act(s, 'kill-switch');
  assert.equal(readyIn(s, 'deploy'), 0);
  assert.equal(helperCap(s), 9);
});

test('Auto-restart: a cut starts a Spawn helper there; Line Tap: a cut readies Sniff', () => {
  const s = start({ sub: 'hijacker', talents: ['auto-restart', 'line-tap'] });
  act(s, 'sniff pulse');
  assert.ok(readyIn(s, 'sniff') > 0);
  fireEvent(s, 'cut', { part: part(s, 'encryptor') });
  assert.ok(s.encounter.helpers.some((h) => h.target === 'encryptor' && h.damage === 7));
  assert.equal(readyIn(s, 'sniff'), 0);
});

test('Dead Man\'s Switch: Kill Switch cashes in 15% more', () => {
  const s = start({ talents: ['dead-mans-switch'] });
  act(s, 'deploy pulse');
  act(s, 'kill-switch');
  assert.equal(lost(s, 'pulse'), 12 + Math.round(36 * 1.15));
});

test('SIGHUP: struck, your helpers on that part hit it once more', () => {
  const s = start({ talents: ['sighup'] });
  act(s, 'deploy pulse');
  surge(s, 'pulse', 10);
  act(s, 'hold');
  assert.equal(lost(s, 'pulse'), 12 * 3);
});

test('Full Mesh: Mesh splashes full damage, on a 12-cycle cooldown', () => {
  const s = start({ talents: ['full-mesh'] });
  act(s, 'deploy pulse');
  act(s, 'mesh');
  assert.equal(lost(s, 'encryptor'), 24, 'the strike and the tick, each in full');
  assert.equal(readyIn(s, 'mesh'), 11);
});

test('Watchdog Reset: answering a tell runs your helpers a cycle longer', () => {
  const s = start({ talents: ['watchdog-reset'] });
  act(s, 'deploy pulse');
  fireEvent(s, 'answer', { part: part(s, 'pulse') });
  assert.equal(s.encounter.helpers[0].left, 4);
});

test('Load Balancer: 3% less damage a helper; Page Out: OOM Kill shields 60%', () => {
  const s = start({ talents: ['load-balancer'] });
  act(s, 'botnet pulse');
  surge(s, 'encryptor', 100);
  act(s, 'hold');
  assert.equal(s.server.max - s.server.integrity, 91);
  const o = start({ talents: ['page-out'] });
  act(o, 'deploy pulse');
  act(o, 'oom-kill');
  assert.equal(o.encounter.shield, Math.round(36 * 0.6));
  assert.equal(o.server.integrity, o.server.max);
});

test('Host Vector: hitting a Tagged part, your helpers on it hit once more, once a cycle', () => {
  const s = start({ talents: ['host-vector'] });
  act(s, 'deploy pulse');
  fireEvent(s, 'tagged', { part: part(s, 'pulse') });
  fireEvent(s, 'tagged', { part: part(s, 'pulse') });
  assert.equal(lost(s, 'pulse'), 24);
});

test('Final Run: Cron Storm hits three times, and the helpers end with their Last Gasp', () => {
  edges(() => {
    const s = start({ talents: ['final-run'] });
    act(s, 'deploy pulse');
    act(s, 'cron-storm');
    assert.equal(lost(s, 'pulse'), 12 * 5);
    assert.equal(s.encounter.helpers.length, 0);
  });
});

test('Hot Swap: gaining a shield starts a Spawn helper on every part without one', () => {
  const s = start({ talents: ['hot-swap'] });
  act(s, 'deploy pulse');
  fireEvent(s, 'shielded', { gained: true });
  assert.deepEqual(s.encounter.helpers.map((h) => h.target).sort(), ['encryptor', 'pulse']);
});

test('Kernel Hook: Hooked parts take 3 more a hit; Port Mirror: Sniff leaves two footholds', () => {
  const s = start({ sub: 'hijacker', talents: ['kernel-hook', 'port-mirror'] });
  act(s, 'hook pulse');
  const before = lost(s, 'pulse');
  act(s, 'spike pulse');
  assert.equal(lost(s, 'pulse') - before, 25 + 6 + 3);
  act(s, 'sniff encryptor');
  assert.equal(s.encounter.helpers.filter((h) => h.target === 'encryptor').length, 2);
});

test('Rebroadcast: answering a tell readies Replay; Elevate: a crit on a Jammed part readies Hijack', () => {
  const s = start({ sub: 'hijacker', talents: ['rebroadcast', 'elevate'] });
  surge(s, 'pulse', 30, s.encounter.cycle + 3);
  act(s, 'replay pulse');
  fireEvent(s, 'answer', { part: null });
  assert.equal(readyIn(s, 'replay'), 0);
  act(s, 'jam pulse');
  s.encounter.readyAt.hijack = s.encounter.cycle + 5;
  fireEvent(s, 'crit', { part: part(s, 'pulse') });
  assert.equal(readyIn(s, 'hijack'), 0);
});

test('Shim: your shield absorbing a hit leaves a foothold on its part', () => {
  const s = start({ sub: 'hijacker', talents: ['shim'] });
  s.encounter.shield = 10;
  surge(s, 'pulse', 20);
  act(s, 'hold');
  assert.ok(s.encounter.helpers.some((h) => h.target === 'pulse' && h.damage === 4));
});

test('Traceback: the part that hits you is Jammed; Sidetone: Echo Cancel Jams', () => {
  const s = start({ sub: 'hijacker', talents: ['traceback'] });
  surge(s, 'pulse', 10);
  act(s, 'hold');
  assert.ok(part(s, 'pulse').jammedUntil >= s.encounter.cycle);
  const e = start({ sub: 'hijacker', talents: ['sidetone'] });
  act(e, 'echo-cancel pulse');
  assert.ok(part(e, 'pulse').jammedUntil >= e.encounter.cycle);
});

test('Refcount: spending a helper heals 5', () => {
  const s = start({ sub: 'hijacker', talents: ['refcount'] });
  act(s, 'deploy pulse');
  surge(s, 'pulse', 20, s.encounter.cycle + 1);
  s.server.integrity = 50;
  act(s, 'jam pulse');
  assert.equal(s.server.integrity, 55);
});

test('Event Horizon: Blackhole drops the next two attacks, on a 9-cycle cooldown', () => {
  const s = start({ sub: 'hijacker', talents: ['event-horizon'] });
  act(s, 'deploy pulse');
  surge(s, 'pulse', 30, s.encounter.cycle, 1);
  act(s, 'blackhole pulse');
  act(s, 'hold');
  assert.equal(s.server.integrity, s.server.max);
  assert.ok(!part(s, 'pulse').blackhole);
  assert.equal(readyIn(s, 'blackhole'), 7);
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
      assert.ok(h.uses.nohup && (L < 20 || (h.uses['fan-out'] && h.uses.mesh)), JSON.stringify(h.uses));
      assert.ok((j.uses.hijack || j.uses.takeover || j.uses.jam) && j.uses.replay && j.uses.sniff, JSON.stringify(j.uses)); // with tells off (this file), Hijack's moment is a helper on a big attacker (and with the interrupt, a cut often takes it first)
      assert.ok(Math.abs(h.lost - j.lost) <= 26, `close: ${h.lost.toFixed(0)} vs ${j.lost.toFixed(0)}`); // since R1 the Herder's helpers cut for free: 15 vs 39 at 18 (was within 15); flat Payload (save v44) helps its small helper hits most: 15 vs 40, held at 26
    }
  } finally { Object.assign(CONFIG, flat); }
});
