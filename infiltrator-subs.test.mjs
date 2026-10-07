// Infiltrator subclasses (dist/classes/infiltrator.mjs): Payload and Phantom. Every new skill, both
// edges (Bloom, Weak Spot) and every new talent does what its card says; the planner plays both.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, selectEncounter, resolveCycle, part, keyMap, knownSkills, readyIn, procOpen, active, subOf, hasTalent } from './dist/combat.mjs';
import { CONFIG, ABILITIES, ARCHETYPES, SUBS, SUBCLASS, unlockLevel } from './dist/data.mjs';
import { play } from './dist/run.mjs';
import { matesOf } from './dist/crew.mjs';
import { planner } from './dist/planner.mjs';
import INFIL from './dist/classes/infiltrator.mjs';
// Exact numbers: no crits, misses or level scaling; each edge is turned on by the test that needs it.
CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.partToughness = 1;
CONFIG.enemyRamp = 0;
CONFIG.misses = false;
CONFIG.edges = false;
CONFIG.powerPerLevel = 0;
CONFIG.gap = { dealt: 0, taken: 0, floor: 1, below: 0 };

// A level-50 Infiltrator in a subclass, with these talents (dev kit: every class skill) and ranks.
const start = (sub, { talents = [], ranks = {}, id = 'cryptjack', seed = 7 } = {}) => {
  const s = fresh();
  s.loadout.archetype = 'infiltrator';
  s.hackers = { infiltrator: { level: 50, xp: 0 } };
  s.loadout.sub = { infiltrator: sub };
  s.loadout.devKit = { talents };
  s.loadout.ranks.infiltrator = ranks;
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
    assert.equal(x.fillers.flat().length, 6); assert.equal(x.talents.flat().length, 6);
  }
  for (const [id, a] of Object.entries(ABILITIES).filter(([, a]) => a.cls === 'infiltrator' && a.sub)) {
    assert.ok(SUBS[a.sub].skills.includes(id), id);
    assert.ok(a.help.startsWith(id + ' ') && a.help.includes(' — ') && a.help.endsWith('.'), id);
    assert.ok(a.short && a.desc && a.icon && a.cooldown >= 1, id);
  }
  const ids = (x) => new Set([...x.fillers.flat(), ...x.talents.flat()].map((n) => n.id));
  const shared = [...ids(SUBS.payload)].filter((k) => ids(SUBS.phantom).has(k));
  assert.ok(shared.length <= 2, `mostly distinct trees (shared: ${shared})`);
  assert.ok(ARCHETYPES.infiltrator.skills.some((k) => k.id === 'wormable') && ARCHETYPES.infiltrator.skills.some((k) => k.id === 'backstab'));
});

// ---------- Payload ----------
test('Wormable: 10 a cycle for 4 cycles, and the cast one spreads a copy to one more part each cycle (copies do not spread)', () => {
  const s = noArmor(quiet(start('payload')));
  big(s, 'pulse'); big(s, 'encryptor'); addPart(s, 'c'); addPart(s, 'd');
  act(s, 'wormable pulse');
  assert.equal(lost(s, 'pulse'), 10);
  const on = () => s.encounter.burns.filter((b) => b.id === 'wormable').map((b) => b.target).sort();
  assert.deepEqual(on(), ['encryptor', 'pulse']);
  act(s, 'hold');
  assert.deepEqual(on(), ['c', 'encryptor', 'pulse'], 'one more part, not two: the copy does not spread');
  act(s, 'hold'); act(s, 'hold');
  assert.deepEqual([lost(s, 'pulse'), lost(s, 'encryptor'), lost(s, 'c'), lost(s, 'd')], [40, 30, 20, 10]);
  assert.equal(s.encounter.burns.length, 0);
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
  act(t, 'inject pulse');
  assert.equal(lost(t, 'pulse'), 12);
  act(t, 'thrash pulse');
  assert.equal(lost(t, 'pulse'), 12 + 24, 'two ticks this cycle');
  act(t, 'hold');
  assert.equal(lost(t, 'pulse'), 12 + 24 + 24, 'the last tick of the Inject ticks twice too');
  act(t, 'inject pulse');
  assert.equal(lost(t, 'pulse'), 60 + 24, 'still Thrashing (3 cycles)');
  act(t, 'hold');
  assert.equal(lost(t, 'pulse'), 84 + 12, 'over: once a cycle again');
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
  assert.equal(lost(s, 'pulse') - a, 24, 'the storm tick and the cycle\'s tick');
  assert.equal(lost(s, 'encryptor') - b, 28);
  assert.equal(s.encounter.infil.poly[0].left, 1, 'only the cycle used it up');
});

test('Bloom (Payload edge): when a burning part breaks, its burns jump a cycle shorter to the part that attacks soonest; not the Phantom\'s', () => {
  withEdges(() => {
    const s = noArmor(start('payload'));
    big(s, 'pulse');
    big(s, 'encryptor');
    part(s, 'encryptor').attack.due = 99;
    act(s, 'inject pulse'); act(s, 'inject pulse'); act(s, 'keepalive pulse');
    assert.deepEqual(s.encounter.burns.map((b) => b.left), [2, 3]);
    part(s, 'pulse').integrity = 1;
    act(s, 'spike pulse');
    assert.equal(part(s, 'pulse').integrity, 0);
    assert.equal(msgs(s, /^Bloom: 2 burns jump from the Pulse Node to the Encryptor/).length, 1);
    assert.deepEqual(s.encounter.burns.map((b) => b.target), ['encryptor'], 'one burn still running there');
    assert.deepEqual(s.encounter.burns.map((b) => b.left), [1], 'a cycle shorter, and it ticked there: 3 → 2 → 1, and 2 → 1 → done');
    assert.equal(lost(s, 'encryptor'), 24);
    const p = noArmor(start('phantom'));
    act(p, 'inject pulse');
    part(p, 'pulse').integrity = 1;
    act(p, 'spike pulse');
    assert.equal(msgs(p, /^Bloom/).length, 0);
    assert.equal(p.encounter.burns.length, 0);
  });
});

test('Payload talents: Contagion, Persistence, Superspreader; ranks: Shaped Charge, Virulence', () => {
  const c = noArmor(quiet(start('payload', { talents: ['contagion'] })));
  big(c, 'pulse'); big(c, 'encryptor');
  act(c, 'inject pulse');
  assert.equal(lost(c, 'encryptor'), 12, 'Contagion: the Inject spread');
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
    assert.deepEqual([lost(u, 'encryptor'), lost(u, 'c')], [12, 12], 'the burn ticked on both');
  });
  const d = noArmor(quiet(start('payload', { ranks: { 'shaped-charge': 2 } })));
  big(d, 'pulse');
  act(d, 'inject pulse');
  const before = lost(d, 'pulse');
  act(d, 'detonate pulse');
  assert.equal(lost(d, 'pulse') - before, Math.floor(Math.round(2 * 12 * 1.5) * 1.2), 'Detonate +20%');
  const v = noArmor(quiet(start('payload', { ranks: { virulence: 3 } })));
  big(v, 'pulse');
  act(v, 'wormable pulse');
  assert.equal(lost(v, 'pulse'), 16, 'Wormable 10 +6');
});

// ---------- Phantom ----------
test('Backstab: 32, a sure crit on a part whose attack is not due this cycle or next; Pivot +10% a rank', () => {
  const s = noArmor(start('phantom'));
  big(s, 'pulse'); part(s, 'encryptor').attack = null;
  part(s, 'pulse').attack.due = s.encounter.cycle + 5;
  act(s, 'backstab pulse');
  assert.equal(lost(s, 'pulse'), 48, '32 × 1.5');
  const d = noArmor(start('phantom'));
  big(d, 'pulse'); part(d, 'encryptor').attack = null;
  part(d, 'pulse').attack.due = d.encounter.cycle + 1;
  act(d, 'backstab pulse');
  assert.equal(lost(d, 'pulse'), 32, 'its attack is due next cycle: no crit');
  const r = noArmor(quiet(start('phantom', { ranks: { pivot: 2 } })));
  big(r, 'pulse');
  act(r, 'backstab pulse');
  assert.equal(lost(r, 'pulse'), Math.floor(32 * 1.2 * 1.5));
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
    // Cold Open: +5% a rank on the Weak Spot hit.
    const c = noArmor(quiet(start('phantom', { ranks: { 'cold-open': 2 } })));
    big(c, 'pulse');
    act(c, 'spike pulse');
    assert.equal(lost(c, 'pulse'), Math.floor(Math.floor(25 * 1.1) * 1.5));
  });
});

test('Phantom talents: Blind Spot (your first burn tick on each part crits), Kill Chain (a break readies Backstab and lights Opening)', () => {
  withEdges(() => {
    const s = noArmor(quiet(start('phantom', { talents: ['blind-spot'] })));
    big(s, 'pulse');
    act(s, 'inject pulse');
    assert.equal(lost(s, 'pulse'), 18);
    act(s, 'hold');
    assert.equal(lost(s, 'pulse'), 30);
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

test('old talents still in the trees keep working by id: Long Fuse is Polymorphic (Inject lasts 5 cycles)', () => {
  assert.ok(SUBS.payload.talents.flat().some((n) => n.id === 'polymorphic' && n.name === 'Long Fuse'));
  const s = noArmor(quiet(start('payload', { talents: ['polymorphic'] })));
  big(s, 'pulse');
  act(s, 'inject pulse');
  assert.equal(s.encounter.burns[0].left, 4);
  assert.ok(hasTalent(s, 'polymorphic'));
  for (const id of ['rotating-proxies', 'leaked-creds', 'fast-hands']) assert.ok(SUBS.phantom.talents.flat().some((n) => n.id === id), id);
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
