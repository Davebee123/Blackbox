// Breaker subclasses (dist/classes/breaker*.mjs): Demolitionist and Overclocker. Every new skill,
// both edges, every new talent and filler, and how the planner plays them.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fresh, command, selectEncounter, resolveCycle, part, keyMap, knownSkills, readyIn, momentumStacks, patchDelay, cooldownOf, fxAnswer, fireEvent, takeDamage, takenMult } from './dist/combat.mjs';
import { CONFIG, SKILLS, ABILITIES, SUBS, SUBCLASS, unlockLevel, skillOrder } from './dist/data.mjs';
import { planner } from './dist/planner.mjs';
import * as BREAKER_DATA from './dist/classes/breaker.data.mjs';
CONFIG.tells = false; // these check skill numbers; tells.test.mjs checks the tells

// Exact numbers: no crits, misses, edges, level scaling or level gap (as classes.test.mjs).
CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.partToughness = 1;
CONFIG.enemyRamp = 0;
CONFIG.misses = false;
CONFIG.edges = false;
const OWN0 = CONFIG.ownPerLevel, FILL0 = CONFIG.gearFill; // your own line and gear's fill, to turn back on
CONFIG.powerPerLevel = 0; CONFIG.levelLine = 0; CONFIG.ownPerLevel = 0; CONFIG.gearFill = [[1, 1]];
CONFIG.gap = { dealt: 0, taken: 0, floor: 1, below: 0 };
(await import('./dist/data.mjs')).LOADOUT.specRanks = 0; // the kit talent's two free ranks (progression.mjs): off, for exact numbers

// A Breaker of a subclass, with every class skill it has by level 50 (the dev kit) and these talents.
const start = (sub, { talents = [], level = 50 } = {}) => {
  const s = fresh();
  s.loadout.archetype = 'breaker';
  s.hackers = { breaker: { level, xp: 0 } };
  s.loadout.sub = { breaker: sub };
  s.loadout.devKit = { talents };
  selectEncounter(s, 'cryptjack', 7, { level: 6 });
  command(s, 'engage');
  s.encounter.hardened = 0;
  return s;
};
const demo = (o) => start('demolitionist', o);
const oc = (o) => start('overclocker', o);
// Put the skill on the bar (the dev kit knows them all), fire it, resolve the cycle.
const act = (s, text) => {
  const w = text.split(' ')[0], eq = (s.loadout.equipped.breaker ||= Object.values(keyMap(s)).filter((x) => x !== 'spike' && x !== 'sigint'));
  if (ABILITIES[w] && w !== 'spike' && !Object.values(keyMap(s)).includes(w) && knownSkills(s, 'breaker').includes(w)) { if (eq.length >= 7) eq.shift(); eq.push(w); }
  const events = command(s, text);
  assert.ok(!events.some((e) => e.type === 'warning'), events.at(-1)?.message);
  return resolveCycle(s);
};
const quiet = (s) => { for (const p of s.encounter.virus.parts) p.attack = null; return s; };
const noArmor = (s) => { for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, maxArmor: 0, patchAt: null }); return s; };
const big = (s, id) => Object.assign(part(s, id), { integrity: 500, max: 500 });
const lost = (s, id) => part(s, id).max - part(s, id).integrity;
const armor = (s, id, n) => Object.assign(part(s, id), { armor: n, maxArmor: n, patchAt: null });
const extra = (s, id, hp = 500) => { const p = { ...s.encounter.virus.parts[0], id, name: id.toUpperCase(), integrity: hp, max: hp, armor: 0, maxArmor: 0, patchAt: null, attack: null }; s.encounter.virus.parts.push(p); return p; };
const stacks = (s, n) => { s.encounter.momentum = { stacks: n, until: s.encounter.cycle + 2 }; };
const equip = (s, id) => { const eq = (s.loadout.equipped.breaker ||= Object.values(keyMap(s)).filter((x) => x !== 'spike' && x !== 'sigint')); if (!eq.includes(id)) { if (eq.length >= 7) eq.shift(); eq.push(id); } };
const refused = (s, text) => { equip(s, text.split(' ')[0]); return command(s, text).at(-1); };
const withEdges = (fn) => { CONFIG.edges = true; try { fn(); } finally { CONFIG.edges = false; } };

// ---------- the data ----------
test('both lines hold 11 skills in unlock order (10 to 38), and every new skill is a well-formed Breaker skill', () => {
  const icons = ['behavior', 'clear', 'command', 'event-lock', 'event-warning', 'expand', 'exploit', 'injector', 'interrupt', 'mutation', 'overload', 'server', 'shell-shield', 'spike', 'weakness'];
  const verbs = ['hit', 'burn', 'stun', 'debuff', 'shield', 'heal', 'buff', 'util'];
  for (const sub of ['demolitionist', 'overclocker']) {
    assert.equal(SUBS[sub].skills.length, SUBCLASS.unlocks.length, sub);
    SUBS[sub].skills.forEach((id, i) => assert.equal(unlockLevel('breaker', id, sub), SUBCLASS.unlocks[i], `${sub} ${id}`));
    assert.deepEqual(skillOrder('breaker', sub).slice(0, 4), ['overload', 'flood', 'exploit', 'crack']);
  }
  for (const [id, a] of Object.entries(BREAKER_DATA.abilities)) {
    assert.equal(a.cls, 'breaker', id);
    assert.ok(SUBS[a.sub].skills.includes(id), `${id} is in the ${a.sub} line`);
    assert.ok(icons.includes(a.icon) && verbs.includes(a.verb), id);
    assert.ok(a.help.startsWith(id + ' ') || a.help.startsWith(id + ' —'), id);
    assert.match(a.help, / — \S.*\.$/, id);
    assert.ok(a.short && a.desc && (a.cooldown >= 2 || a.once), id);
  }
  assert.equal(SUBS.demolitionist.edge.name, 'Overkill');
  assert.equal(SUBS.overclocker.edge.name, 'Redline');
});

test('every talent in both trees is implemented somewhere, and the two trees share no talent', () => {
  const src = fs.readFileSync('dist/combat.mjs', 'utf8') + fs.readFileSync('dist/classes/breaker.mjs', 'utf8');
  const ids = (sub) => SUBS[sub].tiers.flat().map((n) => n.id);
  for (const sub of ['demolitionist', 'overclocker']) for (const id of ids(sub)) assert.ok(src.includes(`'${id}'`), `${sub}: ${id}`);
  assert.deepEqual(ids('demolitionist').filter((id) => ids('overclocker').includes(id)), []);
});

// ---------- Demolitionist ----------
test('Shaped Charge: breaks every ◆ at once and lights Shatter, but the part lashes out (its attack comes a cycle sooner); 30 on a bare part', () => {
  const s = demo();
  part(s, 'encryptor').attack = null;
  const p = armor(s, 'pulse', 5);
  big(s, 'pulse');
  p.attack.due = s.encounter.cycle + 4;
  const due = p.attack.due;
  act(s, 'shaped-charge pulse');
  assert.equal(p.armor, 0);
  assert.equal(p.attack.due, due - 1, 'provoked');
  assert.equal(p.patchAt, s.encounter.cycle - 1 + patchDelay(s));
  act(s, 'shatter pulse');
  assert.equal(lost(s, 'pulse'), 38, 'Shatter was lit');
  assert.equal(readyIn(s, 'shaped-charge'), 3, 'cooldown 5');
  const b = noArmor(quiet(demo()));
  big(b, 'pulse');
  act(b, 'shaped-charge pulse');
  assert.equal(lost(b, 'pulse'), 30);
});

test('Logic Bomb: 2 cycles later, 50 to its part and 20 to every other; on the next part if its own broke first', () => {
  const s = noArmor(quiet(demo()));
  big(s, 'pulse'); big(s, 'encryptor');
  act(s, 'logic-bomb pulse');
  act(s, 'hold');
  assert.equal(lost(s, 'pulse'), 0, 'not yet');
  act(s, 'hold');
  assert.equal(lost(s, 'pulse'), 50);
  assert.equal(lost(s, 'encryptor'), 20);
  const t = noArmor(quiet(demo()));
  big(t, 'encryptor');
  act(t, 'logic-bomb pulse');
  part(t, 'pulse').integrity = 1;
  act(t, 'spike pulse');
  act(t, 'hold');
  assert.equal(lost(t, 'encryptor'), Math.floor(50 * 1.1), 'the bomb moved to the next part (and the break gave you a Momentum stack)');
  // On armor it breaks two ◆, like any heavy hit.
  const a = quiet(demo());
  armor(a, 'pulse', 3); big(a, 'encryptor'); part(a, 'encryptor').armor = 0;
  act(a, 'logic-bomb pulse'); act(a, 'hold'); act(a, 'hold');
  assert.equal(part(a, 'pulse').armor, 1);
});

test('Chain Reaction: 40 to the part (2 ◆ on armor), and if it breaks within 3 cycles it hits the rest for 30; a part the blast breaks blows up too', () => {
  const s = noArmor(quiet(demo()));
  big(s, 'encryptor');
  extra(s, 'x1', 10);
  Object.assign(part(s, 'pulse'), { integrity: 50, max: 50 });
  act(s, 'chain-reaction pulse');
  assert.equal(part(s, 'pulse').integrity, 10, 'a 40 hit in any fight');
  act(s, 'spike pulse');
  assert.equal(part(s, 'x1').integrity, 0, 'the blast broke X1');
  assert.equal(lost(s, 'encryptor'), Math.floor(30 * 1.1) + Math.floor(30 * 1.2), 'two blasts, each with the Momentum of the breaks so far');
  assert.equal(readyIn(s, 'chain-reaction'), 3, 'cooldown 5');
  // On armor it breaks 2 ◆ and wires the part all the same.
  const a = quiet(demo());
  armor(a, 'pulse', 3); big(a, 'encryptor');
  act(a, 'chain-reaction pulse');
  assert.equal(part(a, 'pulse').armor, 1);
  assert.ok(part(a, 'pulse').bkChain, 'wired');
  // Past its 3 cycles, a break is just a break.
  const t = noArmor(quiet(demo()));
  big(t, 'encryptor'); big(t, 'pulse');
  act(t, 'chain-reaction pulse'); act(t, 'hold'); act(t, 'hold'); act(t, 'hold');
  part(t, 'pulse').integrity = 1;
  act(t, 'spike pulse');
  assert.equal(lost(t, 'encryptor'), 0);
});

test('Bit Rot: 25 now (2 ◆ on armor), then a ◆ off at the end of each of your turns for 4 cycles, no patching, and 20% more from you while it rots', () => {
  const s = quiet(demo());
  const p = armor(s, 'pulse', 7);
  act(s, 'bit-rot pulse');
  assert.equal(p.armor, 4, 'its hit breaks two, the rot another');
  act(s, 'hold'); act(s, 'hold'); act(s, 'hold');
  assert.equal(p.armor, 1, 'four cycles, four ◆');
  act(s, 'hold');
  assert.equal(p.armor, 1, 'then it stops');
  // A bare part that was about to patch waits until the rot is over.
  const t = quiet(demo());
  const q = armor(t, 'pulse', 2);
  q.armor = 0; q.patchAt = t.encounter.cycle + 1;
  act(t, 'bit-rot pulse');
  assert.equal(q.patchAt, t.encounter.cycle - 1 + 4);
  for (let k = 0; k < 3; k++) act(t, 'hold');
  assert.equal(q.armor, 0, 'no patch while it rots');
  act(t, 'hold');
  assert.equal(q.armor, 1, 'the patch comes once it ends');
  const n = noArmor(quiet(demo()));
  big(n, 'pulse');
  act(n, 'bit-rot pulse');
  assert.equal(lost(n, 'pulse'), 25, 'worth a Spike anywhere');
  assert.ok(part(n, 'pulse').bkRot, 'a bare part rots too');
  act(n, 'spike pulse');
  assert.equal(lost(n, 'pulse'), 25 + Math.floor(25 * 1.2), 'and takes 20% more from you');
});

test('Demolitionist tier 1: Shrapnel, Splintering, Exposed Wiring', () => {
  const h = quiet(demo({ talents: ['shrapnel'] }));
  armor(h, 'pulse', 2); big(h, 'pulse');
  act(h, 'shaped-charge pulse');
  act(h, 'shatter pulse');
  assert.equal(lost(h, 'pulse'), Math.floor(38 * 1.2), 'Shrapnel: +20% on Shatter');
  const p = quiet(demo({ talents: ['splintering'] }));
  armor(p, 'pulse', 2); big(p, 'pulse'); armor(p, 'encryptor', 3);
  act(p, 'shaped-charge pulse');
  act(p, 'shatter pulse');
  assert.equal(part(p, 'encryptor').armor, 1, "Splintering: the shards break 2 ◆ on an armored part");
  const w = noArmor(demo({ talents: ['exposed-wiring'] }));
  part(w, 'pulse').integrity = 1;
  act(w, 'spike pulse');
  assert.ok(w.encounter.virus.parts.some((x) => x.integrity > 0 && x.exposedUntil >= w.encounter.cycle), 'Exposed Wiring: a break exposes the next part to attack');
});

test('Demolitionist tier 2: Pressure Test, Cluster Charge, Shock Front', () => {
  const t = quiet(demo({ talents: ['pressure-test'] }));
  armor(t, 'pulse', 5);
  act(t, 'crack pulse');
  assert.equal(part(t, 'pulse').armor, 1, 'Crack breaks 4');
  const s = quiet(demo({ talents: ['cluster-charge'] }));
  armor(s, 'pulse', 3); armor(s, 'encryptor', 3);
  act(s, 'shaped-charge pulse');
  assert.equal(part(s, 'encryptor').armor, 1);
  const f = quiet(demo({ talents: ['shock-front'] }));
  armor(f, 'pulse', 4);
  fxAnswer(f, part(f, 'pulse'));
  assert.equal(part(f, 'pulse').armor, 0, 'answering its tell breaks every ◆');
});

test('Demolitionist tier 3: Deep Burn, Meltdown, Cook-Off', () => {
  const d = noArmor(quiet(demo({ talents: ['deep-burn'] })));
  big(d, 'pulse');
  act(d, 'thermal-runaway pulse');
  assert.equal(lost(d, 'pulse'), 9, 'Deep Burn: +5 a tick');
  act(d, 'hold');
  assert.equal(lost(d, 'pulse'), 9 + 13, 'it still grows by 4');
  const s = noArmor(quiet(demo({ talents: ['meltdown'] })));
  big(s, 'pulse'); big(s, 'encryptor');
  act(s, 'thermal-runaway pulse');
  assert.equal(lost(s, 'pulse'), 4);
  assert.equal(lost(s, 'encryptor'), 2);
  act(s, 'hold');
  assert.equal(lost(s, 'encryptor'), 2 + 4, 'it grows by half as much');
  const c = quiet(demo({ talents: ['cook-off'] })), n = quiet(demo());
  for (const x of [c, n]) { big(x, 'pulse'); armor(x, 'pulse', 6); x.encounter.burns.push({ id: 'thermal-runaway', name: 'Thermal Runaway', target: 'pulse', damage: 10, left: 3 }); act(x, 'hold'); }
  assert.equal(lost(n, 'pulse'), 0, 'a tick on armor breaks a ◆');
  assert.equal(lost(c, 'pulse'), 10, 'Cook-Off: and deals its damage');
  assert.equal(part(c, 'pulse').armor, part(n, 'pulse').armor);
});

test('Demolitionist tier 4: Crumple Zone, Total Overkill, Reactive Plating', () => {
  const z = demo({ talents: ['crumple-zone'] }), p = part(z, 'pulse');
  assert.equal(takenMult(z, p), 1);
  z.encounter.virus.tells = { list: [{ told: true, part: 'pulse', kind: 'charge', name: 'x' }] };
  assert.equal(takenMult(z, p), 0.8, 'a charged attack deals 20% less');
  withEdges(() => {
    const s = noArmor(quiet(demo({ talents: ['total-overkill'] })));
    big(s, 'encryptor'); extra(s, 'x1');
    part(s, 'pulse').integrity = 1;
    act(s, 'spike pulse');
    assert.equal(lost(s, 'encryptor'), 20);
    assert.equal(lost(s, 'x1'), 20);
  });
  const r = quiet(demo({ talents: ['reactive-plating'] }));
  armor(r, 'pulse', 3);
  r.encounter.shield = 20;
  takeDamage(r, 10, 'pulse', 'a test hit');
  assert.equal(part(r, 'pulse').armor, 1, 'its hit on your shield breaks 2 ◆ on it');
});

test('Demolitionist tier 5: Blast Radius, Ring Circuit, Cascade Failure', () => {
  const s = noArmor(quiet(demo({ talents: ['blast-radius'] })));
  big(s, 'pulse');
  act(s, 'fork-bomb');
  assert.equal(lost(s, 'pulse'), Math.floor(16 * 1.15), 'Blast Radius: +15% on Fork Bomb');
  const r = noArmor(quiet(demo({ talents: ['ring-circuit'] })));
  big(r, 'pulse'); big(r, 'encryptor');
  act(r, 'chain-reaction pulse');
  assert.ok(part(r, 'encryptor').bkChain, 'every part is wired');
  const c = quiet(demo({ talents: ['cascade-failure'] })), e = c.encounter;
  e.readyAt.flood = e.cycle + 5;
  fireEvent(c, 'cut', { part: part(c, 'pulse') });
  assert.equal(e.readyAt.flood, e.cycle + 4, 'a cut lowers every cooldown by 1');
});

test('Demolitionist tier 6: Soft Target, Recursion, Critical Mass', () => {
  const t = noArmor(quiet(demo({ talents: ['soft-target'] })));
  big(t, 'pulse');
  act(t, 'spike pulse');
  assert.equal(lost(t, 'pulse'), Math.floor(25 * 1.1));
  const r = noArmor(quiet(demo({ talents: ['recursion'] })));
  big(r, 'pulse');
  act(r, 'fork-bomb');
  act(r, 'hold');
  assert.equal(lost(r, 'pulse'), 16 + 8, 'Fork Bomb again next cycle, at half');
  CONFIG.baseCrit = 100;
  try {
    const m = quiet(demo({ talents: ['critical-mass'] }));
    big(m, 'pulse'); armor(m, 'pulse', 0); armor(m, 'encryptor', 3);
    act(m, 'spike pulse');
    assert.equal(part(m, 'encryptor').armor, 2, 'a crit breaks 1 ◆ on every other part');
  } finally { CONFIG.baseCrit = 0; }
});

// ---------- Overclocker ----------
test('Overvolt: two hits of 20 in one command, for 6 Signal (Integrity at home); on armor each breaks a ◆; not when you can\'t pay', () => {
  const s = noArmor(quiet(oc()));
  big(s, 'pulse');
  act(s, 'overvolt pulse');
  assert.equal(s.server.integrity, 94);
  assert.equal(lost(s, 'pulse'), 40, 'two hits of 20');
  const a = quiet(oc());
  armor(a, 'pulse', 3);
  act(a, 'overvolt pulse');
  assert.equal(part(a, 'pulse').armor, 1, 'one ◆ a hit');
  const p = oc();
  p.server.integrity = 6;
  assert.match(refused(p, 'overvolt').message, /costs 6/);
});

test('Thermal Throttle: needs Momentum, spends it all for 20 + 20 a stack; through armor from 2 stacks', () => {
  const s = quiet(oc());
  armor(s, 'pulse', 3); big(s, 'pulse');
  assert.match(refused(s, 'thermal-throttle pulse').message, /needs Momentum/);
  stacks(s, 2);
  act(s, 'thermal-throttle pulse');
  assert.equal(lost(s, 'pulse'), 60, 'the spent stacks add to the hit, not your multiplier');
  assert.equal(part(s, 'pulse').armor, 3, 'straight through');
  assert.equal(momentumStacks(s), 0);
  const one = quiet(oc());
  armor(one, 'pulse', 3); big(one, 'pulse');
  stacks(one, 1);
  act(one, 'thermal-throttle pulse');
  assert.equal(lost(one, 'pulse'), 0);
  assert.equal(part(one, 'pulse').armor, 1, 'one stack: a heavy hit on armor, two ◆');
  const b = noArmor(quiet(oc()));
  big(b, 'pulse');
  stacks(b, 3);
  act(b, 'thermal-throttle pulse');
  assert.equal(lost(b, 'pulse'), 80);
});

test('Stack Smash: 30, and each crit hits again, up to 3 more times', () => {
  const s = noArmor(quiet(oc()));
  big(s, 'pulse');
  act(s, 'stack-smash pulse');
  assert.equal(lost(s, 'pulse'), 30, 'no crit, one hit');
  const c = noArmor(quiet(oc()));
  big(c, 'pulse');
  const crit = CONFIG.baseCrit;
  CONFIG.baseCrit = 100;
  try { act(c, 'stack-smash pulse'); } finally { CONFIG.baseCrit = crit; }
  assert.equal(lost(c, 'pulse'), 4 * Math.floor(30 * 1.5), 'every hit crits, so four hits');
});

test('Turbo Boost: 2 Momentum stacks for 3 cycles, for 6; not when your Momentum is full', () => {
  const s = noArmor(quiet(oc()));
  big(s, 'pulse');
  act(s, 'turbo-boost');
  assert.equal(momentumStacks(s), 2);
  assert.equal(s.server.integrity, 94);
  act(s, 'spike pulse');
  assert.equal(lost(s, 'pulse'), Math.floor(25 * 1.2));
  act(s, 'hold'); act(s, 'hold');
  assert.equal(momentumStacks(s), 0, 'gone after 3 cycles');
  const f = oc();
  stacks(f, SKILLS.momentumMax);
  assert.match(refused(f, 'turbo-boost').message, /already full/);
});

// In a crew (GAME_RULES.md "Subclasses"): Turbo Boost runs every crewmate hot for its 3 cycles (more damage dealt and taken)
// and ticks their cooldowns crewTick cycles; the Overclocker itself is untouched (combat-view.test.mjs: the Turbo bar).
test('Overclocker in a crew: Turbo Boost runs every crewmate hot and ticks their cooldowns', async () => {
  const { hooks, damageMultiplier, turboOn } = await import('./dist/combat.mjs');
  const A = ABILITIES['turbo-boost'], o = noArmor(quiet(oc())), d = noArmor(quiet(demo()));
  const was = hooks.crewAllies;
  hooks.crewAllies = (x) => (x === d ? [{ who: 'Ada', st: o }] : x === o ? [{ who: 'Bo', st: d }] : []);
  try {
    const before = damageMultiplier(d, part(d, 'pulse'), { mine: true });
    d.encounter.readyAt.overload = d.encounter.cycle + 4;
    act(o, 'turbo-boost');
    assert.equal(d.encounter.readyAt.overload, d.encounter.cycle + 4 - A.crewTick, 'its cooldown ticked');
    assert.ok(Math.abs(damageMultiplier(d, part(d, 'pulse'), { mine: true }) / before - A.crewDealt) < 1e-9);
    assert.equal(turboOn(d.encounter).taken, A.crewTaken);
    assert.equal(turboOn(o.encounter), null, 'not the Overclocker itself');
    d.encounter.cycle += A.cycles;
    assert.equal(turboOn(d.encounter), null, 'gone after 3 cycles');
    assert.equal(A.cooldown, 15);
  } finally { hooks.crewAllies = was; }
});

test('Overclocker tier 1: Boost Clock, Hair Trigger, Feedback Loop', () => {
  const o = ABILITIES.overload.damage;
  const b = noArmor(quiet(oc({ talents: ['boost-clock'] })));
  big(b, 'pulse');
  act(b, 'overload pulse');
  assert.equal(lost(b, 'pulse'), o + 10);
  const h = noArmor(quiet(oc({ talents: ['hair-trigger'] })));
  big(h, 'pulse');
  act(h, 'overload pulse');
  assert.equal(lost(h, 'pulse'), Math.floor(o * 0.85), '15% less');
  assert.equal(cooldownOf(h, 'overload'), 2);
  CONFIG.baseCrit = 100;
  try {
    const s = noArmor(quiet(oc({ talents: ['feedback-loop'] })));
    big(s, 'pulse');
    act(s, 'overvolt pulse');
    assert.equal(momentumStacks(s), 1, 'a crit adds a stack, once a cycle');
  } finally { CONFIG.baseCrit = 0; }
});

test('Overclocker tier 2: Core Voltage, Burn-in, Clock Glitch', () => {
  const s = noArmor(quiet(oc({ talents: ['core-voltage'] })));
  big(s, 'pulse');
  act(s, 'segfault pulse');
  assert.equal(lost(s, 'pulse'), Math.floor(30 * 1.2));
  const b = noArmor(quiet(oc({ talents: ['burn-in'] })));
  big(b, 'pulse');
  stacks(b, 3);
  act(b, 'thermal-throttle pulse');
  assert.equal(momentumStacks(b), 1, 'half the stacks kept');
  assert.equal(lost(b, 'pulse'), Math.floor(80 * 1.1), 'the kept stack still counts');
  const g = quiet(oc({ talents: ['clock-glitch'] }));
  fxAnswer(g, part(g, 'pulse'));
  assert.equal(momentumStacks(g), 2, 'answering a tell gives 2 stacks');
});

test('Overclocker tier 3: Liquid Cooling, Coolant Dump, Back-EMF', () => {
  const l = oc({ talents: ['liquid-cooling'] });
  act(l, 'overvolt');
  assert.equal(l.server.integrity, 100, 'Overvolt costs nothing');
  const c = quiet(oc({ talents: ['coolant-dump'] }));
  stacks(c, 2);
  act(c, 'vent');
  assert.equal(c.encounter.shield, 16, '8 shield a stack Vent spends');
  const m = quiet(oc({ talents: ['back-emf'] }));
  fireEvent(m, 'struck', { part: part(m, 'pulse') });
  fireEvent(m, 'struck', { part: part(m, 'pulse') });
  assert.equal(momentumStacks(m), 1, 'a stack when hit, once a cycle');
});

test('Overclocker tier 4: Heat Spreader, Stack Overflow, Context Switch', () => {
  const h = noArmor(quiet(oc({ talents: ['heat-spreader'] })));
  part(h, 'pulse').integrity = 1;
  act(h, 'spike pulse');
  assert.equal(h.encounter.momentum.until, h.encounter.cycle - 1 + SKILLS.momentumCycles + 2);
  const o = noArmor(quiet(oc({ talents: ['stack-overflow'] })));
  big(o, 'pulse');
  act(o, 'stack-smash pulse');
  assert.equal(lost(o, 'pulse'), 60, 'twice against any part');
  const x = noArmor(quiet(oc({ talents: ['stack-overflow'] }))), ex = SKILLS.exposed;
  big(x, 'pulse');
  part(x, 'pulse').exposedUntil = x.encounter.cycle + 3;
  SKILLS.exposed = 0; // Exposed's crit chance off, for exact numbers
  try { act(x, 'stack-smash pulse'); } finally { SKILLS.exposed = ex; }
  assert.equal(lost(x, 'pulse'), 90, 'three times against an Exposed one');
  const c = quiet(oc({ talents: ['context-switch'] }));
  c.encounter.readyAt.segfault = c.encounter.cycle + 4;
  fireEvent(c, 'cut', { part: part(c, 'pulse') });
  assert.equal(c.encounter.readyAt.segfault, undefined, 'a cut makes Segfault usable');
});

test('Overclocker tier 5: Exploit Kit, Fault Storm, Cold Plate', () => {
  CONFIG.baseCrit = 92;
  try {
    const k = noArmor(quiet(oc({ talents: ['exploit-kit'] })));
    big(k, 'pulse');
    for (let i = 0; i < 4; i++) act(k, 'spike pulse');
    assert.equal(lost(k, 'pulse'), 4 * Math.floor(25 * 1.5), '8% more crit chance');
  } finally { CONFIG.baseCrit = 0; }
  const f = quiet(oc({ talents: ['fault-storm'] }));
  act(f, 'fault-injection pulse');
  assert.equal(part(f, 'encryptor').bkFault.until, f.encounter.cycle, 'every part, for 2 cycles');
  const c = quiet(oc({ talents: ['cold-plate'] }));
  c.encounter.shield = 10;
  act(c, 'hold');
  assert.equal(momentumStacks(c), 2, 'gaining a shield gives 2 stacks');
});

test('Overclocker tier 6: Junction Temp, Setuid, Flashpoint', () => {
  const j = noArmor(quiet(oc({ talents: ['junction-temp'] })));
  big(j, 'pulse');
  stacks(j, 3);
  act(j, 'thermal-throttle pulse');
  assert.equal(lost(j, 'pulse'), Math.floor(80 * 1.25));
  const u = noArmor(quiet(oc({ talents: ['setuid'] })));
  big(u, 'pulse');
  act(u, 'sudo');
  const was = lost(u, 'pulse');
  act(u, 'spike pulse');
  assert.equal(lost(u, 'pulse') - was, Math.floor(25 * 1.5), 'every hit during Sudo crits');
  const f = noArmor(quiet(oc({ talents: ['flashpoint'] })));
  big(f, 'encryptor');
  part(f, 'pulse').integrity = 1;
  act(f, 'spike pulse');
  f.encounter.momentum = null;
  act(f, 'spike encryptor');
  assert.equal(lost(f, 'encryptor'), Math.floor(25 * 1.5), 'the hit after a break crits');
});

// ---------- the edges ----------
test('Redline (Overclocker): Momentum stacks to 5, and you take 10% more while you have any; the Demolitionist still caps at 3', () => {
  withEdges(() => {
    const breakFive = (s) => {
      const e = s.encounter;
      big(s, 'pulse'); big(s, 'encryptor'); // Overkill's spills land on these
      for (const id of ['x1', 'x2', 'x3', 'x4']) extra(s, id, 99);
      for (const id of ['x1', 'x2', 'x3', 'x4', 'pulse']) { part(s, id).integrity = 1; act(s, 'spike ' + id); }
      return e.momentum.stacks;
    };
    assert.equal(breakFive(noArmor(quiet(oc()))), 5);
    assert.equal(breakFive(noArmor(quiet(demo()))), SKILLS.momentumMax);
    const hurt = (s) => {
      part(s, 'encryptor').attack = null;
      const p = part(s, 'pulse');
      s.encounter.cycle = p.attack.due;
      act(s, 'hold');
      return 100 - s.server.integrity;
    };
    const amount = part(oc(), 'pulse').attack.amount;
    const r = noArmor(oc()); stacks(r, 1);
    assert.equal(hurt(r), Math.round(amount * 1.1));
    assert.equal(hurt(noArmor(oc())), amount, 'no stacks, no extra');
    const d = noArmor(demo()); stacks(d, 1);
    assert.equal(hurt(d), amount, 'not the Demolitionist');
  });
});

test('Overkill (Demolitionist\'s edge) is off for the Overclocker', () => {
  withEdges(() => {
    const s = noArmor(quiet(oc()));
    big(s, 'encryptor');
    part(s, 'pulse').integrity = 1;
    act(s, 'spike pulse');
    assert.equal(lost(s, 'encryptor'), 0);
  });
});

// ---------- the planner ----------
test('the planner: Shaped Charge on a thick shell, Thermal Throttle through armor with stacks, Turbo Boost when you\'re hurt', () => {
  const s = demo();
  part(s, 'encryptor').integrity = 0;
  const p = armor(s, 'pulse', 5);
  p.attack.due = s.encounter.cycle + 4;
  s.loadout.equipped.breaker = ['overload', 'flood', 'exploit', 'crack', 'shatter', 'fork-bomb', 'shaped-charge'];
  assert.equal(planner(s), 'shaped-charge pulse');
  p.attack.due = s.encounter.cycle + 1;
  assert.notEqual(planner(s), 'shaped-charge pulse', 'not when the provoked attack would land before you follow up');
  const o = oc();
  part(o, 'encryptor').integrity = 0;
  const q = armor(o, 'pulse', 3); big(o, 'pulse');
  q.attack.due = o.encounter.cycle + 3;
  o.loadout.equipped.breaker = ['overload', 'flood', 'exploit', 'crack', 'overvolt', 'segfault', 'thermal-throttle'];
  stacks(o, 2);
  assert.equal(planner(o), 'thermal-throttle pulse');
  stacks(o, 0);
  o.loadout.equipped.breaker = ['overload', 'flood', 'exploit', 'crack', 'overvolt', 'segfault', 'thermal-throttle', 'brace', 'turbo-boost'];
  o.hackers.breaker.level = 34;
  o.server.integrity = Math.round(o.server.max * 0.4);
  assert.equal(planner(o), 'turbo-boost', 'under half: free Momentum for a Thermal Throttle');
});

test('bots play both subclasses to wins', async () => {
  const { score, BRACKETS } = await import('./balance.mjs');
  for (const sub of ['demolitionist', 'overclocker']) {
    const r = score('Breaker', BRACKETS[2], { sub });
    assert.ok(r.wins >= 0.85 * r.total, `${sub}: ${r.wins}/${r.total}`);
    assert.ok(r.lost < 55, `${sub}: ${r.lost.toFixed(0)}%`);
  }
});

// ---------- the 15-key pools (docs/kits.md) ----------
test('Shatter: 38 on the part you just bared, and its shards hit every other bare part for 12', () => {
  const s = quiet(demo());
  armor(s, 'pulse', 2); big(s, 'pulse'); big(s, 'encryptor'); part(s, 'encryptor').armor = 0;
  act(s, 'shaped-charge pulse');
  act(s, 'shatter pulse');
  assert.equal(lost(s, 'pulse'), 38);
  assert.equal(lost(s, 'encryptor'), 12, 'shards on the other bare part');
});

test('Exploit: 15 and Exposed, so it never costs a hit', () => {
  const s = noArmor(quiet(demo()));
  big(s, 'pulse');
  act(s, 'exploit pulse');
  assert.equal(lost(s, 'pulse'), 15);
  assert.ok(part(s, 'pulse').exposedUntil >= s.encounter.cycle, 'Exposed through the next cycle');
});

test('Debris Field: for 3 cycles every ◆ you break shields you 5, up to 30', () => {
  const s = quiet(demo());
  armor(s, 'pulse', 5); armor(s, 'encryptor', 6);
  act(s, 'debris-field');
  act(s, 'shaped-charge pulse');
  assert.equal(s.encounter.shield, 25, 'five ◆, five shields');
  act(s, 'crack encryptor');
  assert.equal(s.encounter.shield, 30, 'capped at 30');
  act(s, 'hold');
  act(s, 'crack encryptor');
  assert.equal(s.encounter.shield, 30, 'over after its 3 cycles');
});

test('Backfire: 25 anywhere; on a part winding up a charge, the charge goes off inside it and the attack lands plain', async () => {
  const { tellOn, tellOpen } = await import('./dist/tells.mjs');
  const n = noArmor(quiet(demo()));
  big(n, 'pulse');
  act(n, 'backfire pulse');
  assert.equal(lost(n, 'pulse'), 25);
  // A charge on a part's next attack, in its window (tells.mjs): Backfire turns it on its own part.
  CONFIG.tells = true;
  try {
    let s = null, t = null;
    for (let seed = 1; seed < 40 && !t; seed++) {
      s = fresh();
      s.loadout.archetype = 'breaker'; s.hackers = { breaker: { level: 30, xp: 0 } }; s.loadout.sub = { breaker: 'demolitionist' };
      s.loadout.equipped.demolitionist = ['backfire', 'crack', 'flood'];
      selectEncounter(s, 'cryptjack', seed, { level: 30 });
      command(s, 'engage');
      for (let k = 0; k < 12 && s.encounter?.phase === 'active' && !t; k++) {
        t = s.encounter.virus.parts.find((p) => p.integrity > 0 && tellOpen(s, p, 'charge') && p.attack) || null; // in its window (tells.mjs)
        if (!t) { command(s, 'hold'); resolveCycle(s); }
      }
    }
    assert.ok(t, 'a charge came up');
    t.integrity = t.max = 2000;
    const ev = command(s, 'backfire ' + t.id);
    assert.ok(!ev.some((e) => e.type === 'warning'), ev.at(-1)?.message);
    const out = resolveCycle(s);
    assert.ok(out.some((e) => /BACKFIRE/.test(e.message)), 'the charge goes off inside it');
    assert.ok(!tellOn(s, t, 'charge'), 'and is gone');
  } finally { CONFIG.tells = false; }
});

test('rm -rf: for 2 cycles every hit you land also hits every other part for half', () => {
  const s = noArmor(quiet(demo()));
  big(s, 'pulse'); big(s, 'encryptor');
  act(s, 'rm-rf');
  act(s, 'overload pulse');
  assert.equal(lost(s, 'pulse'), 40);
  assert.equal(lost(s, 'encryptor'), 20, 'half of it on the other part');
  assert.equal(readyIn(s, 'rm-rf'), 8, 'cooldown 10');
});

test('Hot Loop: 22 and a Momentum stack for 2 cycles; Vent spends the stacks to cleanse and heal 5 each', () => {
  const s = noArmor(quiet(oc()));
  big(s, 'pulse');
  act(s, 'hot-loop pulse');
  assert.equal(lost(s, 'pulse'), 22);
  assert.equal(momentumStacks(s), 1);
  stacks(s, 3);
  s.encounter.corrupt = { left: 3, amount: 4 };
  s.encounter.encrypt = 6;
  s.server.integrity = 50;
  act(s, 'vent');
  assert.equal(momentumStacks(s), 0);
  assert.ok(!s.encounter.corrupt && !s.encounter.encrypt, 'Corrupted and encryption cleared');
  assert.ok(s.server.integrity >= 50 + 15 - 1, 'healed 5 a stack');
});

test('Fault Injection: 20, and every hit you land on it crits for 3 cycles', () => {
  const s = noArmor(quiet(oc()));
  big(s, 'pulse');
  act(s, 'fault-injection pulse');
  assert.equal(lost(s, 'pulse'), 20);
  act(s, 'overload pulse');
  assert.equal(lost(s, 'pulse'), 20 + Math.floor(40 * 1.5), 'a crit');
  act(s, 'hold'); act(s, 'hold');
  act(s, 'spike pulse');
  assert.equal(lost(s, 'pulse'), 20 + Math.floor(40 * 1.5) + 25, 'over after 3 cycles');
});

test('Sudo: for 2 cycles your hits go through ◆, each still breaking one', () => {
  const s = quiet(oc());
  armor(s, 'pulse', 3); big(s, 'pulse');
  act(s, 'sudo');
  act(s, 'overload pulse');
  assert.equal(lost(s, 'pulse'), 40, 'straight through');
  assert.equal(part(s, 'pulse').armor, 2, 'and a ◆ broken on the way');
  assert.equal(readyIn(s, 'sudo'), 6, 'cooldown 8');
});
