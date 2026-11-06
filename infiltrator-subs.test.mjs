// Infiltrator subclasses (dist/classes/infiltrator.mjs): Payload and Phantom. Every new skill, both
// edges (Bloom, Weak Spot) and every new talent does what its card says; the planner plays both.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fresh, command, selectEncounter, resolveCycle, part, keyMap, knownSkills, readyIn, procOpen, active, subOf, hasTalent, cooldownOf, fxAnswer, fireEvent, takeDamage, takenMult, maxSignal } from './dist/combat.mjs';
import { CONFIG, ABILITIES, ARCHETYPES, SUBS, SUBCLASS, unlockLevel } from './dist/data.mjs';
import { play } from './dist/run.mjs';
import { matesOf } from './dist/crew.mjs';
import { planner } from './dist/planner.mjs';
import INFIL from './dist/classes/infiltrator.mjs';
CONFIG.tells = false; // these check skill numbers; tells.test.mjs checks the tells
// Exact numbers: no crits, misses or level scaling; each edge is turned on by the test that needs it.
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

// A level-50 Infiltrator in a subclass, with these talents (dev kit: every class skill).
const start = (sub, { talents = [], id = 'cryptjack', seed = 7 } = {}) => {
  const s = fresh();
  s.loadout.archetype = 'infiltrator';
  s.hackers = { infiltrator: { level: 50, xp: 0 } };
  s.loadout.sub = { infiltrator: sub };
  s.loadout.devKit = { talents };
  s.loadout.equipped.infiltrator = [];
  selectEncounter(s, id, seed, { level: 6 });
  command(s, 'engage');
  return s;
};
// Fire a command (putting the skill on the bar first) and play the cycle out.
const act = (s, text) => {
  const w = text.split(' ')[0], eq = s.loadout.equipped.infiltrator;
  if (ABILITIES[w] && w !== 'spike' && !Object.values(keyMap(s)).includes(w)) { if (eq.length >= 7) eq.shift(); eq.push(w); }
  const events = command(s, text);
  assert.ok(!events.some((e) => e.type === 'warning'), events.at(-1)?.message);
  return resolveCycle(s);
};
const quiet = (s) => { for (const p of s.encounter.virus.parts) p.attack = null; return s; };
const noArmor = (s) => { for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, maxArmor: 0, patchAt: null }); s.encounter.hardened = 0; return s; };
const big = (s, id) => Object.assign(part(s, id), { integrity: 500, max: 500 });
const lost = (s, id) => part(s, id).max - part(s, id).integrity;
// An extra bare part with no attack.
const addPart = (s, id) => { s.encounter.virus.parts.push({ id, name: id.toUpperCase(), kind: 'system', integrity: 500, max: 500, armor: 0, maxArmor: 0, patchAt: null, attack: null, exposedUntil: 0, lastDamaged: 0 }); return part(s, id); };
const withEdges = (fn) => { CONFIG.edges = true; try { fn(); } finally { CONFIG.edges = false; } };
const msgs = (s, re) => s.logs.filter((e) => re.test(e.message));

test('both lines: eight skills each in unlock order, every new skill has its card, and the two trees are different', () => {
  for (const id of ['payload', 'phantom']) {
    const x = SUBS[id];
    assert.equal(x.skills.length, SUBCLASS.unlocks.length, id);
    x.skills.forEach((k, i) => assert.equal(unlockLevel('infiltrator', k, id), SUBCLASS.unlocks[i], k));
    assert.equal(x.tiers.length, 6); assert.ok(x.tiers.every((r) => r.length === 3), id);
  }
  for (const [id, a] of Object.entries(ABILITIES).filter(([, a]) => a.cls === 'infiltrator' && a.sub)) {
    assert.ok(SUBS[a.sub].skills.includes(id), id);
    assert.ok(a.help.startsWith(id + ' ') && a.help.includes(' — ') && a.help.endsWith('.'), id);
    assert.ok(a.short && a.desc && a.icon && a.cooldown >= 1, id);
  }
  const ids = (x) => new Set(x.tiers.flat().map((n) => n.id));
  assert.deepEqual([...ids(SUBS.payload)].filter((k) => ids(SUBS.phantom).has(k)), [], 'distinct trees');
  const src = fs.readFileSync('dist/combat.mjs', 'utf8') + fs.readFileSync('dist/classes/infiltrator.mjs', 'utf8');
  for (const x of [SUBS.payload, SUBS.phantom]) for (const id of ids(x)) assert.ok(src.includes(`'${id}'`), `${x.id}: ${id} is implemented`);
  assert.ok(ARCHETYPES.infiltrator.skills.some((k) => k.id === 'wormable') && ARCHETYPES.infiltrator.skills.some((k) => k.id === 'backstab'));
});

// ---------- Payload ----------
test('Wormable: 8 a cycle for 4 cycles, and the cast one spreads a copy to one more part each cycle (copies do not spread), carrying your Inject', () => {
  const s = noArmor(quiet(start('payload')));
  big(s, 'pulse'); big(s, 'encryptor'); addPart(s, 'c'); addPart(s, 'd');
  act(s, 'wormable pulse');
  assert.equal(lost(s, 'pulse'), 8);
  const on = () => s.encounter.burns.filter((b) => b.id === 'wormable').map((b) => b.target).sort();
  assert.deepEqual(on(), ['encryptor', 'pulse']);
  act(s, 'hold');
  assert.deepEqual(on(), ['c', 'encryptor', 'pulse'], 'one more part, not two: the copy does not spread');
  act(s, 'hold'); act(s, 'hold');
  assert.deepEqual([lost(s, 'pulse'), lost(s, 'encryptor'), lost(s, 'c'), lost(s, 'd')], [32, 24, 16, 8]);
  assert.equal(s.encounter.burns.length, 0);
  // It spreads your Inject: each copy carries the Inject on its part along, with the time it has left.
  const w = noArmor(quiet(start('payload')));
  big(w, 'pulse'); big(w, 'encryptor'); addPart(w, 'c');
  act(w, 'inject pulse');
  act(w, 'wormable pulse');
  const inj = () => w.encounter.burns.filter((b) => b.id === 'inject').map((b) => `${b.target} ${b.left}`).sort();
  assert.deepEqual(inj(), ['encryptor 2', 'pulse 2'], 'the Inject went with the copy, with the time it had left');
  act(w, 'hold');
  assert.equal(lost(w, 'encryptor'), 8 + 20, 'both ticked there');
  assert.deepEqual(inj(), ['c 1', 'encryptor 1', 'pulse 1'], 'on to the next part');
  // Carried onto a part that has your Inject already: still one there, with the longer time left.
  const x = noArmor(quiet(start('payload')));
  big(x, 'pulse'); big(x, 'encryptor');
  act(x, 'inject encryptor');
  x.encounter.readyAt = {};
  act(x, 'inject pulse');
  act(x, 'wormable pulse');
  assert.deepEqual(x.encounter.burns.filter((b) => b.id === 'inject').map((b) => `${b.target} ${b.left}`).sort(), ['encryptor 2', 'pulse 2'], 'one Inject a part: a carried one refreshes, never stacks');
  assert.equal(msgs(w, /Wormable spreads to the .*, carrying your Inject/).length, 2);
});

test('Skim burns 9 a cycle and every tick heals you 4; Polymorph burns 14 through armor (Tag counts, it is not an ordinary burn)', () => {
  const s = noArmor(quiet(start('payload')));
  big(s, 'pulse');
  s.server.integrity = s.server.max - 30;
  act(s, 'skim pulse');
  assert.equal(lost(s, 'pulse'), 9);
  assert.equal(s.server.max - s.server.integrity, 26);
  const p = quiet(start('payload'));
  const pulse = big(p, 'pulse');
  pulse.armor = 3; pulse.maxArmor = 3;
  act(p, 'polymorph pulse');
  assert.equal(lost(p, 'pulse'), 14);
  assert.equal(pulse.armor, 3, 'straight through: no ◆ broken');
  assert.equal(p.encounter.burns.length, 0, 'kept apart from the ordinary burns');
  act(p, 'tag pulse');
  assert.equal(lost(p, 'pulse'), 14 + 21, 'Tagged: ×1.5');
  act(p, 'hold');
  assert.equal(lost(p, 'pulse'), 14 + 21 + 21);
  act(p, 'hold');
  assert.equal(lost(p, 'pulse'), 56, 'three ticks and done');
  assert.equal(readyIn(p, 'polymorph'), 0);
});

test('Detonate and Keepalive reach Polymorph; Thrash makes every burn on a part tick twice for 3 cycles, the last tick too', () => {
  const s = noArmor(quiet(start('payload')));
  big(s, 'pulse');
  act(s, 'inject pulse');
  act(s, 'polymorph pulse');
  const before = lost(s, 'pulse');
  act(s, 'keepalive pulse');
  assert.equal(s.encounter.infil.poly[0].left, 2 - 1 + 2 - 0, 'Polymorph +2 cycles (one ticked off)');
  act(s, 'detonate pulse');
  assert.equal(s.encounter.infil.poly.length, 0, 'Detonate spent it');
  assert.ok(lost(s, 'pulse') > before + 14 * 3);
  const t = noArmor(quiet(start('payload')));
  big(t, 'pulse');
  t.encounter.burns.push({ id: 'skim', target: 'pulse', damage: 12, grow: 0, left: 2, name: 'Skim', drain: 0 });
  act(t, 'hold');
  assert.equal(lost(t, 'pulse'), 12);
  act(t, 'thrash pulse');
  assert.equal(lost(t, 'pulse'), 12 + 24, 'two ticks this cycle: the last tick of the Skim ticks twice too');
  assert.equal(t.encounter.burns.length, 0);
  act(t, 'inject pulse');
  assert.equal(lost(t, 'pulse'), 36 + 40, 'the Inject ticks twice');
  act(t, 'hold');
  assert.equal(lost(t, 'pulse'), 76 + 40, 'still Thrashing (3 cycles)');
  act(t, 'hold');
  assert.equal(lost(t, 'pulse'), 116 + 20, 'over: once a cycle again');
});

test('IRQ Storm: every burn on every part ticks once more now, and none runs out sooner; nothing to storm without burns', () => {
  const s = noArmor(quiet(start('payload')));
  big(s, 'pulse'); big(s, 'encryptor');
  assert.match(command(s, 'irq-storm').at(-1).message, /isn't on your bar|No burns/);
  s.loadout.equipped.infiltrator.push('irq-storm');
  assert.match(command(s, 'irq-storm').at(-1).message, /No burns running/);
  act(s, 'inject pulse');
  act(s, 'polymorph encryptor');
  const [a, b] = [lost(s, 'pulse'), lost(s, 'encryptor')];
  assert.equal(s.encounter.infil.poly[0].left, 2);
  act(s, 'irq-storm');
  assert.equal(lost(s, 'pulse') - a, 40, 'the storm tick and the cycle\'s tick');
  assert.equal(lost(s, 'encryptor') - b, 28, 'Polymorph on a bare part: 14, twice');
  assert.equal(s.encounter.infil.poly[0].left, 1, 'only the cycle used it up');
});

test('Bloom (Payload edge): when a burning part breaks, its burns jump a cycle shorter to the part that attacks soonest; not the Phantom\'s', () => {
  withEdges(() => {
    const s = noArmor(start('payload'));
    big(s, 'pulse');
    big(s, 'encryptor');
    part(s, 'encryptor').attack.due = 99;
    act(s, 'skim pulse'); act(s, 'inject pulse'); act(s, 'keepalive pulse');
    assert.deepEqual(s.encounter.burns.map((b) => `${b.id} ${b.left}`), ['skim 3', 'inject 4']);
    part(s, 'pulse').integrity = 1;
    act(s, 'spike pulse');
    assert.equal(part(s, 'pulse').integrity, 0);
    assert.equal(msgs(s, /^Bloom: 2 burns jump from the Pulse Node to the Encryptor/).length, 1);
    assert.deepEqual(s.encounter.burns.map((b) => b.target), ['encryptor', 'encryptor'], 'both still running there');
    assert.deepEqual(s.encounter.burns.map((b) => `${b.id} ${b.left}`), ['skim 1', 'inject 2'], 'a cycle shorter, and they ticked there: 3 → 2 → 1, and 4 → 3 → 2');
    assert.equal(lost(s, 'encryptor'), 9 + 20);
    const p = noArmor(start('phantom'));
    act(p, 'inject pulse');
    part(p, 'pulse').integrity = 1;
    act(p, 'spike pulse');
    assert.equal(msgs(p, /^Bloom/).length, 0);
    assert.equal(p.encounter.burns.length, 0);
  });
});

const inj = (s, id, damage = 10, left = 4) => s.encounter.burns.push({ id: 'inject', name: 'Inject', target: id, damage, grow: 0, left, drain: 0 });
test('Payload tier 1: Heap Spray, Long Fuse, Third-Party Cookie', () => {
  const h = noArmor(quiet(start('payload', { talents: ['heap-spray'] })));
  big(h, 'pulse');
  act(h, 'inject pulse');
  assert.equal(lost(h, 'pulse'), 26, '+6 a tick');
  const l = noArmor(quiet(start('payload', { talents: ['long-fuse'] })));
  big(l, 'pulse');
  act(l, 'inject pulse');
  assert.equal(l.encounter.burns[0].left, 5, 'Inject lasts 6 cycles');
  const c = noArmor(quiet(start('payload', { talents: ['third-party-cookie'] })));
  const n = noArmor(quiet(start('payload')));
  for (const x of [c, n]) { big(x, 'pulse'); inj(x, 'pulse'); act(x, 'tag pulse'); }
  assert.equal(lost(c, 'pulse') - lost(n, 'pulse'), Math.round(10 * 1.5), 'Tag, and the burn on it ticks once (Tagged)');
});

test('Payload tier 2: Shaped Charge, Assassinate, Chain Letter', () => {
  const d = noArmor(quiet(start('payload', { talents: ['shaped-charge'] })));
  big(d, 'pulse');
  act(d, 'inject pulse');
  const before = lost(d, 'pulse');
  act(d, 'detonate pulse');
  assert.equal(lost(d, 'pulse') - before, Math.floor(Math.round(3 * 20 * ABILITIES.detonate.mult) * 1.25), 'Detonate +25%');
  const c = noArmor(quiet(start('payload', { talents: ['chain-letter'] })));
  c.encounter.readyAt.detonate = c.encounter.cycle + 5;
  inj(c, 'pulse'); part(c, 'pulse').integrity = 1;
  act(c, 'spike pulse');
  assert.equal(readyIn(c, 'detonate'), 0, 'a burning part breaks: Detonate is ready');
});

test('Payload tier 3: Low Profile, Spillover, Fault Handler', () => {
  const l = start('payload', { talents: ['low-profile'] }), p = part(l, 'pulse');
  assert.equal(takenMult(l, p), 1);
  inj(l, 'pulse');
  assert.equal(takenMult(l, p), 0.9, 'a part you are burning hits 10% softer');
  const sp = noArmor(quiet(start('payload', { talents: ['spillover'] })));
  big(sp, 'pulse');
  act(sp, 'skim pulse');
  assert.ok(sp.encounter.shield > 0 && sp.encounter.shield <= 20, 'Skim at full Signal shields you instead');
  const f = noArmor(quiet(start('payload', { talents: ['fault-handler'] })));
  big(f, 'pulse'); inj(f, 'pulse');
  fireEvent(f, 'struck', { part: part(f, 'pulse') });
  fireEvent(f, 'struck', { part: part(f, 'pulse') });
  assert.equal(lost(f, 'pulse'), 10, 'its part hits you: your burns on it tick once, once a cycle');
});

test('Payload tier 4: Virulence, Contagion, Fever', () => {
  const v = noArmor(quiet(start('payload', { talents: ['virulence'] })));
  big(v, 'pulse');
  act(v, 'wormable pulse');
  assert.equal(lost(v, 'pulse'), 13, 'Wormable 8 +5');
  const c = noArmor(quiet(start('payload', { talents: ['contagion'] })));
  big(c, 'pulse'); big(c, 'encryptor');
  act(c, 'inject pulse');
  assert.equal(lost(c, 'encryptor'), 20, 'Contagion: the Inject spread');
  c.encounter.readyAt = {};
  act(c, 'inject pulse');
  assert.equal(c.encounter.burns.filter((b) => b.id === 'inject' && b.target === 'encryptor').length, 1, 'a second Inject refreshes the copy there, never stacks');
  const f = noArmor(quiet(start('payload', { talents: ['fever'] })));
  big(f, 'pulse'); inj(f, 'pulse', 10, 6);
  for (let k = 0; k < 3; k++) act(f, 'hold');
  assert.equal(lost(f, 'pulse'), 10 + 10 + 15, 'the third tick crits');
});

test('Payload tier 5: Persistence, Superspreader, Heat Sink', () => {
  const p = noArmor(quiet(start('payload', { talents: ['persistence'] })));
  big(p, 'pulse'); big(p, 'encryptor');
  act(p, 'implant pulse');
  act(p, 'implant encryptor');
  assert.match(command(p, 'implant pulse').at(-1).message, /used up/);
  assert.equal(p.encounter.burns.filter((b) => b.id === 'implant').length, 2);
  withEdges(() => {
    const u = noArmor(start('payload', { talents: ['superspreader'] }));
    big(u, 'encryptor'); addPart(u, 'c');
    act(u, 'inject pulse');
    part(u, 'pulse').integrity = 1;
    act(u, 'spike pulse');
    assert.ok(msgs(u, /Superspreader copies one to every other part/).length);
    assert.deepEqual([lost(u, 'encryptor'), lost(u, 'c')], [20, 20], 'the burn ticked on both');
  });
  const h = noArmor(quiet(start('payload', { talents: ['heat-sink'] })));
  big(h, 'pulse'); inj(h, 'pulse');
  h.encounter.lastAttack = 'spike pulse';
  h.encounter.shield = 10;
  act(h, 'hold');
  assert.equal(lost(h, 'pulse'), 20, 'a shield: the burn on your target ticks once more');
});

test('Payload tier 6: Thermal Load, Index Case, IRQ Chain', () => {
  const t = noArmor(quiet(start('payload', { talents: ['thermal-load'] })));
  big(t, 'pulse'); inj(t, 'pulse');
  act(t, 'hold');
  assert.equal(lost(t, 'pulse'), 11, 'burns +10%');
  const x = noArmor(quiet(start('payload', { talents: ['index-case'] })));
  act(x, 'outbreak');
  assert.ok(x.encounter.virus.parts.every((p) => p.taggedUntil >= x.encounter.cycle + 2), 'Outbreak Tags every part for 4 cycles');
  const q = noArmor(quiet(start('payload', { talents: ['irq-chain'] })));
  q.encounter.readyAt['irq-storm'] = q.encounter.cycle + 5;
  fxAnswer(q, part(q, 'pulse'));
  assert.equal(readyIn(q, 'irq-storm'), 0, 'answering a tell readies IRQ Storm');
});

// ---------- Phantom ----------
// A tell said on a part (tells.mjs), for skills that read one.
const busy = (s, id, kind = 'charge') => { s.encounter.virus.tells = { list: [{ id: 'x', kind, name: 'Test', part: id, told: true, said: s.encounter.cycle, next: s.encounter.cycle + 2, n: part(s, id).attack?.n || 0, need: 1, wound: 0, hitBy: [], after: 0, count: 0 }], tier: { lead: 2, live: 1, hits: 1, castHits: 2, mult: 2, cap: 0.1, dot: 0.03, after: 0, burn: 0, hang: 0 } }; };
test('Backstab: 32, a sure crit on a part busy with a tell (charging, compiling, sealing, recording); Pivot +25%', () => {
  const s = noArmor(start('phantom'));
  big(s, 'pulse'); part(s, 'encryptor').attack = null;
  busy(s, 'pulse', 'cast');
  act(s, 'backstab pulse');
  assert.equal(lost(s, 'pulse'), 48, '32 × 1.5');
  const d = noArmor(start('phantom'));
  big(d, 'pulse'); part(d, 'encryptor').attack = null;
  act(d, 'backstab pulse');
  assert.equal(lost(d, 'pulse'), 32, 'nothing on it: no crit');
  const r = noArmor(quiet(start('phantom', { talents: ['pivot'] })));
  big(r, 'pulse'); busy(r, 'pulse');
  act(r, 'backstab pulse');
  assert.equal(lost(r, 'pulse'), Math.floor(32 * 1.25 * 1.5));
});

test('Shadow Copy: the next hit on you does nothing and Opening lights; on a crewmate, the decoy takes their hit', () => {
  const s = noArmor(start('phantom'));
  big(s, 'pulse');
  part(s, 'encryptor').attack = null;
  s.encounter.cycle = part(s, 'pulse').attack.due;
  const hp = s.server.integrity;
  s.loadout.equipped.infiltrator = ['opening'];
  act(s, 'shadow-copy');
  assert.equal(s.server.integrity, hp, 'the copy took it');
  assert.ok(msgs(s, /hits the shadow copy/).length);
  assert.ok(procOpen(s, 'slipped'), 'Opening is lit');
  act(s, 'opening pulse');
  assert.equal(lost(s, 'pulse'), 50);
  assert.ok(readyIn(s, 'shadow-copy') > 0);
  // A crew: the decoy on nyx.
  const c = fresh();
  c.loadout.archetype = 'infiltrator'; c.hackers = { infiltrator: { level: 30, xp: 0 } }; c.loadout.sub = { infiltrator: 'phantom' };
  c.loadout.equipped.phantom = ['inject', 'backdoor', 'keepalive', 'tag', 'null-route', 'opening', 'shadow-copy'];
  play(c, 'crew sim bastion');
  play(c, 'connect sprawl'); play(c, 'cd var'); play(c, 'attack');
  assert.ok(active(c));
  const [nyx] = matesOf(c);
  const hit = c.encounter.virus.parts.find((x) => x.attack?.effect === 'damage');
  for (const x of c.encounter.virus.parts) if (x !== hit && x.attack) x.attack.due = 999;
  hit.attack.due = c.encounter.cycle;
  nyx.encounter.hardened = 0;
  const before = nyx.run.integrity;
  command(c, 'shadow-copy ' + nyx.who);
  nyx.encounter.queue = { ability: 'hold', text: 'hold' };
  resolveCycle(c);
  assert.equal(nyx.run.integrity, before, `${nyx.who} took nothing`);
  assert.ok(nyx.logs.some((e) => /hits the shadow copy/.test(e.message)) || c.logs.some((e) => /hits the shadow copy/.test(e.message)));
});

test('Weak Spot (Phantom edge) and Log Wipe: the first hit on each part crits; Log Wipe makes it fresh again and halves the next hit; Cold Open', () => {
  withEdges(() => {
    const s = noArmor(start('phantom', { talents: ['deep-cover'] }));
    big(s, 'pulse'); part(s, 'encryptor').attack = null; part(s, 'pulse').attack.due = 999;
    act(s, 'spike pulse');
    assert.equal(lost(s, 'pulse'), Math.floor(25 * 1.5), 'Weak Spot');
    act(s, 'spike pulse');
    assert.equal(lost(s, 'pulse'), 37 + 25, 'once per part');
    act(s, 'null-route');
    act(s, 'spike pulse'); // spends Null Route's crit
    const was = lost(s, 'pulse');
    assert.ok(readyIn(s, 'null-route') > 0);
    act(s, 'log-wipe');
    assert.equal(readyIn(s, 'null-route'), 0, 'Deep Cover: Null Route ready');
    act(s, 'spike pulse');
    assert.equal(lost(s, 'pulse') - was, 37, 'fresh again');
    // The next hit on you deals half.
    const h = noArmor(start('phantom'));
    part(h, 'encryptor').attack = null;
    const pulse = part(h, 'pulse');
    pulse.attack.due = h.encounter.cycle + 1;
    h.encounter.hardened = 0;
    act(h, 'log-wipe');
    const hp = h.server.integrity;
    act(h, 'hold');
    assert.equal(hp - h.server.integrity, Math.round(pulse.attack.amount * 0.5));
    // Payload has no Weak Spot.
    const y = noArmor(start('payload'));
    big(y, 'pulse');
    act(y, 'spike pulse');
    assert.equal(lost(y, 'pulse'), 25);
    // Cold Open: +15% on the Weak Spot hit.
    const c = noArmor(quiet(start('phantom', { talents: ['cold-open'] })));
    big(c, 'pulse');
    act(c, 'spike pulse');
    assert.equal(lost(c, 'pulse'), Math.floor(Math.floor(25 * 1.15) * 1.5));
  });
});

test('Weak Spot needs bare code: a hit through armor neither crits nor uses it up', () => {
  withEdges(() => {
    const s = quiet(start('phantom'));
    const p = Object.assign(big(s, 'pulse'), { armor: 2, maxArmor: 2 });
    act(s, 'backdoor pulse');
    assert.equal(lost(s, 'pulse'), 24, 'through armor: no crit');
    p.armor = 0;
    act(s, 'spike pulse');
    assert.equal(lost(s, 'pulse') - 24, Math.floor(25 * 1.5), 'the first hit on its bare code crits');
  });
});

test('Detonate cashes in burns but leaves a Rootkit Implant burning (its timer is "until it breaks")', () => {
  const s = noArmor(quiet(start('payload')));
  big(s, 'pulse');
  act(s, 'implant pulse');
  s.loadout.equipped.infiltrator.push('detonate');
  assert.match(command(s, 'detonate pulse').at(-1).message, /Rootkit Implant/, 'nothing else to cash in');
  act(s, 'inject pulse');
  const before = lost(s, 'pulse');
  act(s, 'detonate pulse');
  assert.equal(lost(s, 'pulse') - before, Math.round(3 * 20 * ABILITIES.detonate.mult) + 10, 'the Inject\'s three ticks ×1.5, and the Implant ticks on');
  assert.equal(s.encounter.burns.filter((b) => b.id === 'implant').length, 1);
});

test('Phantom talents: Blind Spot (your first burn tick on each part crits), Kill Chain (a break readies Backstab and lights Opening)', () => {
  withEdges(() => {
    const s = noArmor(quiet(start('phantom', { talents: ['blind-spot'] })));
    big(s, 'pulse');
    act(s, 'inject pulse');
    assert.equal(lost(s, 'pulse'), 30);
    act(s, 'hold');
    assert.equal(lost(s, 'pulse'), 50);
  });
  const k = noArmor(quiet(start('phantom', { talents: ['kill-chain'] })));
  big(k, 'encryptor');
  k.loadout.equipped.infiltrator = ['opening'];
  act(k, 'backstab encryptor');
  assert.ok(readyIn(k, 'backstab') > 0);
  part(k, 'pulse').integrity = 1;
  act(k, 'spike pulse');
  assert.equal(readyIn(k, 'backstab'), 0);
  assert.ok(procOpen(k, 'slipped'));
});

test('Phantom tier 1 and 2: Web Beacon, Fast Hands, Timing Attack', () => {
  withEdges(() => {
    const w = noArmor(quiet(start('phantom', { talents: ['web-beacon'] })));
    big(w, 'pulse');
    act(w, 'spike pulse');
    assert.ok(w.encounter.weakHit.pulse, 'Weak Spot used');
    act(w, 'tag pulse');
    assert.ok(!w.encounter.weakHit.pulse, 'Tag makes it fresh again');
  });
  const t = quiet(start('phantom', { talents: ['timing-attack'] }));
  t.loadout.equipped.infiltrator = ['opening'];
  fxAnswer(t, part(t, 'pulse'));
  assert.ok(procOpen(t, 'slipped'), 'answering a tell lights Opening');
});

test('Phantom tier 3 and 4: Onion Routing, Log Rotation, Data Leak', () => {
  const o = start('phantom', { talents: ['onion-routing'] }), n = start('phantom');
  assert.equal(maxSignal(o) - maxSignal(n), 8);
  assert.equal(cooldownOf(start('phantom', { talents: ['log-rotation'] }), 'log-wipe'), 4);
  assert.equal(cooldownOf(start('phantom'), 'log-wipe'), ABILITIES['log-wipe'].cooldown);
  CONFIG.baseCrit = 100;
  try {
    const d = noArmor(quiet(start('phantom', { talents: ['data-leak'] }))), n = noArmor(quiet(start('phantom')));
    for (const x of [d, n]) { big(x, 'pulse'); inj(x, 'pulse'); act(x, 'spike pulse'); }
    assert.equal(lost(d, 'pulse') - lost(n, 'pulse'), 15, 'a crit ticks your Inject on it once (a crit too)');
  } finally { CONFIG.baseCrit = 0; }
});

test('Phantom tier 5: Packet Loss, Full Disclosure, Cover Traffic', () => {
  const p = start('phantom', { talents: ['packet-loss'] });
  assert.equal(INFIL.evade(p, part(p, 'pulse')), 10);
  const f = noArmor(quiet(start('phantom', { talents: ['full-disclosure'] })));
  big(f, 'pulse');
  act(f, 'unmask pulse');
  assert.ok(part(f, 'pulse').unmasked.until > f.encounter.cycle + 100, 'until it breaks');
  assert.equal(cooldownOf(f, 'unmask'), 8);
  const c = quiet(start('phantom', { talents: ['cover-traffic'] }));
  c.loadout.equipped.infiltrator = ['opening'];
  c.encounter.shield = 20;
  takeDamage(c, 5, 'pulse', 'a test hit');
  assert.ok(procOpen(c, 'slipped'), 'a hit on your shield lights Opening');
});

test('Phantom tier 6: Clean Exploit, Tracking Pixel, Zeroize', () => {
  CONFIG.baseCrit = 100;
  try {
    const c = noArmor(quiet(start('phantom', { talents: ['clean-exploit'] })));
    big(c, 'pulse');
    act(c, 'spike pulse');
    assert.equal(lost(c, 'pulse'), Math.floor(25 * (1.5 * 1.2)), 'crits deal 20% more');
  } finally { CONFIG.baseCrit = 0; }
  const z = quiet(start('phantom', { talents: ['zeroize'] }));
  z.encounter.weakHit = { pulse: true };
  fireEvent(z, 'cut', { part: part(z, 'pulse') });
  assert.deepEqual(z.encounter.weakHit, {}, 'a cut makes Weak Spot fresh on every part');
  assert.ok(SUBS.phantom.tiers.flat().some((n) => n.id === 'tracking-pixel'));
});

// ---------- the planner ----------
test('the planner plays both subclasses: their own skills show up, and they win their fights', () => {
  const uses = { payload: {}, phantom: {} };
  for (const sub of ['payload', 'phantom']) {
    for (let seed = 1; seed <= 8; seed++) {
      const s = fresh();
      s.loadout.archetype = 'infiltrator';
      s.hackers = { infiltrator: { level: 38, xp: 0 } };
      s.loadout.sub = { infiltrator: sub };
      s.loadout.equipped[sub] = ['inject', 'backdoor', 'tag', ...(sub === 'payload' ? ['wormable', 'implant', 'polymorph', 'thrash'] : ['backstab', 'shadow-copy', 'log-wipe', 'opening'])];
      selectEncounter(s, 'random', seed, { level: 6 });
      command(s, 'engage');
      for (let n = 0; n < 60 && active(s); n++) {
        const text = planner(s) || 'hold';
        uses[sub][text.split(' ')[0]] = (uses[sub][text.split(' ')[0]] || 0) + 1;
        command(s, text);
        resolveCycle(s);
      }
      assert.equal(s.reports.at(-1)?.result, 'victory', `${sub} seed ${seed}`);
    }
  }
  assert.ok(uses.payload.wormable && uses.payload.polymorph, JSON.stringify(uses.payload));
  assert.ok(uses.phantom.backstab, JSON.stringify(uses.phantom));
  assert.equal(INFIL.plan(fresh(), null), null, 'another class falls through');
});

