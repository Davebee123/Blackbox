// Damage numbers, one per source (dist/dmgfx.mjs): every damage instance of a cycle becomes its own number with
// its kind's icon and a tooltip naming its source, in resolution order, a beat apart (0.25–0.5 s, faster when
// many are queued, never more than 2.2 s for a batch). And the lash a virus attack throws at you (dist/lash.mjs)
// scales with the hit. Real fights through combat.mjs check the events carry where each hit came from.
import test from 'node:test';
import assert from 'node:assert/strict';
import { KINDS, STAGGER, gapFor, floatOf, plan, queueAfter } from './dist/dmgfx.mjs';
import { sizeOf } from './dist/lash.mjs';
import { GLYPHS } from './dist/glyphs.mjs';
import { fresh, command, selectEncounter, resolveCycle, part, keyMap } from './dist/combat.mjs';
import { CONFIG, ABILITIES } from './dist/data.mjs';

const ctx = { partName: (id) => ({ pulse: 'Pulse Node', locker: 'Locker' })[id], attackName: (id) => ({ pulse: 'Surge' })[id], skillName: (id) => ABILITIES[id]?.name };
let n = 0;
const ev = (type, x = {}) => ({ id: ++n, type, message: '', ...x });

test('every kind has a glyph of the game\'s icon set', () => {
  for (const [k, v] of Object.entries(KINDS)) assert.ok(GLYPHS[v.icon], `${k}: ${v.icon}`);
  assert.equal(new Set(Object.values(KINDS).map((v) => v.icon)).size, Object.keys(KINDS).length, 'one icon per kind');
});

test('each source maps to its own kind, icon, text and tooltip', () => {
  const cases = [
    [ev('damage', { target: 'pulse', amount: 25, skill: 'spike' }), 'spike', '−25', 'Spike −25 on Pulse Node', 'part'],
    [ev('damage', { target: 'pulse', amount: 30, skill: 'exploit' }), 'hit', '−30', /^Exploit −30/, 'part'],
    [ev('damage', { target: 'pulse', amount: 40, crit: true, skill: 'spike' }), 'crit', '−40', 'Spike crit −40 on Pulse Node', 'part'],
    [ev('damage', { target: 'pulse', amount: 20, src: 'burn', via: 'Inject' }), 'burn', '−20', 'Inject burn −20 on Pulse Node', 'part'],
    [ev('damage', { target: 'pulse', amount: 21, src: 'burn', via: 'Inject', crit: true }), 'crit', '−21', 'Inject burn crit −21 on Pulse Node', 'part'],
    [ev('damage', { target: 'pulse', amount: 12, src: 'helper', via: 'Helper' }), 'helper', '−12', 'Helper −12 on Pulse Node', 'part'],
    [ev('damage', { target: 'pulse', amount: 5, src: 'daemon', via: 'Sweeper' }), 'helper', '−5', 'Sweeper daemon −5 on Pulse Node', 'part'],
    [ev('damage', { target: 'pulse', amount: 6, src: 'reflect', via: 'Countermeasures' }), 'reflect', '−6', 'Countermeasures (reflected) −6 on Pulse Node', 'part'],
    [ev('damage', { target: 'pulse', amount: 9, via: 'Echo' }), 'hit', '−9', 'Echo −9 on Pulse Node', 'part'],
    [ev('server-hit', { source: 'pulse', amount: 12 }), 'attack', '−12', 'Surge −12', 'you'],
    [ev('server-hit', { source: 'pulse', amount: 18, crit: true }), 'crit', '−18', 'Surge crit −18', 'you'],
    [ev('server-hit', { source: 'pulse', amount: 30, tell: 'strain' }), 'spike', '−30', 'Surge charge −30', 'you'],
    [ev('server-hit', { source: 'pulse', amount: 3, bounce: true }), 'reflect', '−3', 'Bounced back −3', 'you'],
    [ev('encrypted', { amount: 4 }), 'encrypt', '−4', 'Encryption −4', 'you'],
    [ev('encrypt', { source: 'locker', amount: 3 }), 'encrypt', '+3/cycle', 'Encryption +3 a cycle', 'you'],
    [ev('blocked', { amount: 7, shield: true }), 'shield', '7', 'Shield absorbs 7', 'you'],
    [ev('heal', { amount: 8 }), 'heal', '+8', 'Heal +8', 'you'],
    [ev('cut', { target: 'pulse', cut: true }), 'interrupt', 'INTERRUPTED', 'Interrupt: interrupted on Pulse Node', 'part'],
  ];
  for (const [e, kind, text, label, at] of cases) {
    const f = floatOf(e, ctx);
    assert.ok(f, e.type);
    assert.equal(f.kind, kind, label);
    assert.equal(f.icon, KINDS[kind].icon);
    assert.equal(f.text, text);
    if (label instanceof RegExp) assert.match(f.label, label); else assert.equal(f.label, label);
    assert.equal(f.at, at);
  }
  // Not damage instances: no number of their own.
  for (const e of [ev('status', { target: 'pulse' }), ev('blocked', { source: 'pulse' }), ev('armor', { target: 'pulse' }), ev('server-hit', { amount: 0 }), ev('heal', {})]) assert.equal(floatOf(e, ctx), null, e.type);
  // A virus repairing its own part is on the part, in the virus's colour.
  assert.deepEqual([floatOf(ev('heal', { target: 'pulse', amount: 6 }), ctx).at, floatOf(ev('heal', { target: 'pulse', amount: 6 }), ctx).hostile], ['part', true]);
});

test('a batch: one number per instance, in order, a beat apart; the rest land with the number before them', () => {
  const evs = [ev('status'), ev('damage', { target: 'pulse', amount: 25, skill: 'spike' }), ev('broken', { target: 'pulse' }),
    ev('damage', { target: 'locker', amount: 20, src: 'burn', via: 'Inject' }), ev('damage', { target: 'locker', amount: 20, src: 'burn', via: 'Inject' }),
    ev('damage', { target: 'locker', amount: 12, src: 'helper', via: 'Helper' }), ev('xp', { amount: 5 })];
  const p = plan(evs, ctx);
  assert.equal(p.count, 4);
  assert.deepEqual([...p.floats.values()].map((f) => f.kind), ['spike', 'burn', 'burn', 'helper'], 'two ticks of the same burn: two numbers');
  assert.deepEqual(evs.map((e) => p.delay(e)), [0, 0, 0, 390, 780, 1170, 1170]);
  assert.ok(p.gap >= STAGGER.floor && p.gap <= 0.5);
  assert.equal(p.total, 1170);
  // Effects minimal / Motion off: all at once (the numbers stack instead).
  const q = plan(evs, ctx, { stagger: false });
  assert.equal(q.count, 4);
  assert.ok(evs.every((e) => q.delay(e) === 0));
  // A batch behind another starts where it says.
  assert.deepEqual(evs.slice(1, 4).map((e) => plan(evs, ctx, { start: 300 }).delay(e)), [300, 300, 690]);
});

test('the stagger: 0.25–0.5 s apart, faster with more, and a batch never takes more than 2.2 s', () => {
  assert.equal(gapFor(0), 0); assert.equal(gapFor(1), 0);
  for (let k = 2; k <= 9; k++) { assert.ok(gapFor(k) >= 0.25 && gapFor(k) <= 0.5, `${k}: ${gapFor(k)}`); assert.ok(gapFor(k + 1) <= gapFor(k)); }
  for (const k of [10, 14, 30, 80]) assert.ok((k - 1) * gapFor(k) <= STAGGER.cap + 1e-9, `${k}`);
  const many = Array.from({ length: 40 }, () => ev('damage', { target: 'pulse', amount: 2, src: 'helper', via: 'Helper' }));
  const p = plan(many, ctx);
  assert.equal(p.count, 40);
  assert.ok(p.total <= STAGGER.cap * 1000 + 1);
  const ds = many.map((e) => p.delay(e));
  assert.ok(ds.every((d, i) => !i || d > ds[i - 1]), 'strictly in order');
  // Crewmates hit by the same attack at once share its beat.
  const crew = [ev('server-hit', { source: 'pulse', amount: 10 }), ev('server-hit', { source: 'pulse', amount: 10, who: 'NYX' }), ev('server-hit', { source: 'pulse', amount: 10, who: 'KAI' })];
  const c = plan(crew, ctx);
  assert.deepEqual(crew.map((e) => c.delay(e)), [0, 0, 0]);
  // The next batch queues a beat behind the last number, but not too far behind.
  assert.equal(queueAfter(-5000), 0);
  assert.ok(queueAfter(0) > 250 && queueAfter(0) <= STAGGER.wait * 1000);
  assert.equal(queueAfter(5000), STAGGER.wait * 1000);
});

test('the lash scales with the hit: bigger hits throw more; a crit or a charge whips harder; calm is lighter; encryption is its own', () => {
  const small = sizeOf({ power: 0.1, full: true }), big = sizeOf({ power: 1, full: true }), heavy = sizeOf({ power: 0.5, heavy: true, full: true });
  assert.ok(big.bits > small.bits && big.rain > small.rain && big.glitch > small.glitch && big.life > small.life);
  assert.ok(heavy.strands > sizeOf({ power: 0.5, full: true }).strands && heavy.bits > sizeOf({ power: 0.5, full: true }).bits);
  const calm = sizeOf({ power: 0.5 });
  assert.ok(calm.strands === 1 && calm.rain === 0 && calm.glitch === 0 && calm.bits < sizeOf({ power: 0.5, full: true }).bits, 'calm: one strand, no full-screen glitch');
  const tick = sizeOf({ mode: 'tick', full: true }), enc = sizeOf({ mode: 'encrypt' });
  assert.ok(tick.strands === 0 && tick.bits === 0 && tick.glitch === 0 && tick.locks > 0, 'an encryption tick: locks only');
  assert.ok(enc.strands === 1 && enc.locks > 0 && enc.bits === 0);
  for (const x of [small, big, heavy, calm, tick, enc]) assert.ok(x.travel + x.life <= 700, 'short: under 0.7 s');
});

// Real fights: the events say where each hit came from.
CONFIG.tells = false; CONFIG.baseCrit = 0; CONFIG.enemyCrit = 0; CONFIG.misses = false; CONFIG.edges = false; // no Weak Spot crit
const start = (arch, id = 'cryptjack') => {
  const s = fresh();
  s.loadout.archetype = arch;
  s.hackers = { [arch]: { level: 50, xp: 0 } };
  s.loadout.devKit = { talents: [] };
  s.loadout.equipped[arch] = [];
  selectEncounter(s, id, 7, { level: 6 });
  command(s, 'engage');
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, maxArmor: 0, patchAt: null, integrity: 500, max: 500 });
  s.encounter.hardened = 0;
  return s;
};
const act = (s, text) => {
  const w = text.split(' ')[0], eq = s.loadout.equipped[s.loadout.archetype];
  if (ABILITIES[w] && w !== 'spike' && !Object.values(keyMap(s)).includes(w)) { if (eq.length >= 7) eq.shift(); eq.push(w); }
  const out = command(s, text);
  assert.ok(!out.some((e) => e.type === 'warning'), out.at(-1)?.message);
  return resolveCycle(s);
};

test('a real fight: Inject burns, a Spike and helpers each get their own number', () => {
  const s = start('infiltrator');
  const [a, b] = s.encounter.virus.parts.map((p) => p.id);
  act(s, `inject ${a}`);
  s.encounter.readyAt = {};
  act(s, `inject ${b}`);
  s.encounter.readyAt = {};
  const evs = act(s, `spike ${a}`);
  const names = { partName: (id) => part(s, id)?.name, attackName: (id) => part(s, id)?.attack?.name, skillName: (id) => ABILITIES[id]?.name };
  const p = plan(evs, names);
  const fl = [...p.floats.values()];
  const burns = fl.filter((f) => f.kind === 'burn');
  assert.equal(burns.length, 2, 'each burn ticks on its own: ' + fl.map((f) => f.label).join(' | '));
  assert.ok(burns.every((f) => /^Inject burn −\d+ on /.test(f.label)));
  assert.deepEqual(new Set(burns.map((f) => f.target)), new Set([a, b]));
  const spike = fl.find((f) => f.kind === 'spike');
  assert.ok(spike && spike.target === a && /^Spike −\d+ on /.test(spike.label), fl.map((f) => f.label).join(' | '));
  assert.ok(fl.indexOf(spike) < fl.indexOf(burns[0]), 'your command first, then the burns, as they resolved');
  const ds = fl.map((f) => f.delay);
  assert.ok(ds.every((d, i) => !i || d > ds[i - 1]));

  const o = start('operator');
  const t = o.encounter.virus.parts[0].id;
  act(o, `spawn ${t}`);
  o.encounter.readyAt = {};
  const evs2 = act(o, `spawn ${t}`);
  const helpers = [...plan(evs2, names).floats.values()].filter((f) => f.kind === 'helper');
  assert.ok(helpers.length >= 1 && helpers.every((f) => f.icon === 'daemon' && /^Helper −\d+/.test(f.label)), evs2.map((e) => e.message).join(' | '));
  const dmg = evs2.filter((e) => e.type === 'damage' && e.src === 'helper');
  assert.equal(helpers.length, dmg.length, 'one number per helper hit');
});

test('a hit a Mutex\'s lock soaks: the lock\'s own number in the shield kind ("−12 absorbed"); one that breaks through shows the damage too', async () => {
  const { absorbOf } = await import('./dist/dmgfx.mjs');
  const ctx = { partName: () => 'Encryptor', skillName: (id) => (id === 'spike' ? 'Spike' : id) };
  const whole = floatOf({ id: 1, type: 'damage', target: 'encryptor', amount: 0, shield: 12, lockWas: 20, skill: 'spike' }, ctx);
  assert.deepEqual([whole.kind, whole.icon, whole.text, whole.at, whole.target], ['shield', KINDS.shield.icon, '−12 absorbed', 'part', 'encryptor']);
  assert.equal(whole.label, 'Spike −12 absorbed by the lock on Encryptor');
  const through = { id: 2, type: 'damage', target: 'encryptor', amount: 7, shield: 12, lockWas: 12, skill: 'spike' };
  assert.equal(floatOf(through, ctx).text, '−7', 'what got past the lock');
  assert.equal(absorbOf(through, ctx).text, '−12 absorbed', 'and the lock\'s number beside it');
  assert.equal(absorbOf({ id: 3, type: 'damage', target: 'encryptor', amount: 9 }, ctx), null, 'no lock, no absorbed number');
});
