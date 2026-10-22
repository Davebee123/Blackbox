// The parts plan, phase P1 (docs/parts-plan.md): the basic slot, the new parts for levels 1 to 12, and fights of 2 to 4
// parts with the signature in most of them, not all (the designer's decision 1). The measurement repeats the plan's:
// 300 wild fights a level, selectEncounter(s, 'random', seed, { level }).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, selectEncounter, command, resolveCycle, active, part, livingParts, intents, timersHidden, partsMix, landingsOf, blocked, attackAmount, alive, hit, heal, limitOf, shuntOf, frozenNow, toIntent, encounterVirus } from './dist/combat.mjs';
import { FAMILIES, CONFIG, createVirus, SERVER, nominal, DAMPER_KINDS } from './dist/data.mjs';
import { boardMarkup, hudMarkup } from './dist/view.mjs';
import { partTip } from './dist/fightread.mjs';
import { PARTS, signatureShare, rollParts, basicsOf, heatOf, along } from './dist/parts.mjs';
import { GENES } from './dist/genes.mjs';
import { findSource, tellsOf } from './dist/tells.mjs';
import { player } from './genesim.mjs';

// The kinds you can meet by level (the plan's "After" column for the levels P1 builds, less the Cryptominer's Rig,
// Cooler and its natives, which come with P3).
const KINDS = { 1: 6, 2: 6, 3: 11, 4: 12, 5: 16, 6: 17, 7: 17, 8: 20, 9: 21, 10: 22, 11: 22, 12: 23 };
const SIGS = new Set(Object.values(FAMILIES).map((f) => f.parts.find((p) => p.special).id));
const kindOf = (p) => (p.copy ? p.id.slice(0, -1) : p.id);
// 300 fights at a level, as the plan measured them: a veteran (every part met) or a new player (nothing researched).
function measure(level, veteran = true) {
  const kinds = new Set(), counts = { 2: 0, 3: 0, 4: 0 }, out = { level, sig: 0, fights: [] };
  for (let seed = 1; seed <= 300; seed++) {
    const s = fresh();
    if (veteran) s.metAll = true;
    selectEncounter(s, 'random', seed, { level, quiet: true });
    const v = s.encounter.virus;
    for (const p of v.parts) kinds.add(kindOf(p));
    if (v.parts.some((p) => SIGS.has(p.id))) out.sig++;
    counts[v.parts.length]++;
    out.fights.push(v);
  }
  return { ...out, kinds, counts, share: out.sig / 300 };
}
const M = {}, N = {};
for (let L = 1; L <= 12; L++) { M[L] = measure(L); N[L] = measure(L, false); }

test('the kinds you can meet: at least the plan\'s table from level 1 to 12 for a veteran, and nearly that for a new player', () => {
  for (let L = 1; L <= 12; L++) {
    assert.ok(M[L].kinds.size >= KINDS[L], `level ${L}: ${M[L].kinds.size} kinds, want ${KINDS[L]} (${[...M[L].kinds].join(', ')})`);
    // A new player meets one stranger a fight, so a kind just opened is rarer in its first levels: all but two at most.
    assert.ok(N[L].kinds.size >= KINDS[L] - 2, `a new player at ${L}: ${N[L].kinds.size} kinds`);
  }
  assert.equal(partsMix(12).kinds, M[12].kinds.size, 'developer parts measures the same mix');
});

test('no four levels in a row without a new kind, from 1 to 12', () => {
  const firstAt = {};
  for (let L = 1; L <= 12; L++) for (const k of M[L].kinds) firstAt[k] ??= L;
  const news = new Set(Object.values(firstAt));
  for (let L = 1; L + 3 <= 12; L++) assert.ok([L, L + 1, L + 2, L + 3].some((x) => news.has(x)), `nothing new from ${L} to ${L + 3}`);
});

test('the gentle start: levels 1 and 2 are always two parts, the basic and the signature, with no third and no mutation; the Pulse Node about two fights in three', () => {
  for (const L of [1, 2]) {
    assert.deepEqual(M[L].counts, { 2: 300, 3: 0, 4: 0 });
    for (const v of M[L].fights) {
      assert.ok(v.parts.some((p) => p.special), 'the signature is there');
      assert.ok(v.parts.every((p) => p.special || p.basic || p.id === 'pulse'), v.parts.map((p) => p.id).join());
      assert.equal(v.mutation, null);
    }
    const pulse = M[L].fights.filter((v) => v.parts.some((p) => p.id === 'pulse')).length / 300;
    assert.ok(pulse > 0.55 && pulse < 0.85, `the Pulse Node in ${pulse}`);
  }
});

test('decision 1: the signature comes in every fight at levels 1–2, then about 70%, from 10 about 55% (within 7 points)', () => {
  for (const L of [1, 2]) assert.equal(M[L].share, 1);
  // At 3 and 4 a third that can take the signature's slot is rare (only the Decoy, from 4): the signature stays then.
  for (const L of [3, 4]) assert.ok(M[L].share >= 0.7, `level ${L}: ${M[L].share}`);
  for (let L = 5; L <= 12; L++) assert.ok(Math.abs(M[L].share - signatureShare(L)) <= 0.07, `level ${L}: the signature in ${M[L].share}, want ${signatureShare(L)}`);
  assert.equal(signatureShare(20), 0.45);
});

test('without its signature, a fight never brings a third that refers to it: no Lockbox, Mutex, Mirror or Idle Timer', () => {
  let none = 0;
  for (let L = 3; L <= 12; L++) for (const v of M[L].fights) {
    if (v.parts.some((p) => p.special)) continue;
    none++;
    assert.ok(v.noSignature, 'it says so (tells.mjs skips its tells)');
    for (const p of v.parts) assert.ok(!['lockbox', 'mutex', 'mirror', 'idletimer'].includes(p.id), `${p.id} without the signature`);
    assert.ok(v.parts.some((p) => p.attack && p.basic), 'its basic attacks');
  }
  assert.ok(none > 300, `${none} fights without the signature`);
});

test('the part counts: 2 or 3 from level 3, 4 from 8, duplicates of the basic from 10', () => {
  for (let L = 3; L <= 7; L++) assert.equal(M[L].counts[4], 0, `level ${L}`);
  for (let L = 8; L <= 12; L++) assert.ok(M[L].counts[4] > 0, `level ${L} has 4-part fights`);
  for (let L = 3; L <= 12; L++) assert.ok(M[L].counts[3] > 60, `level ${L}: ${JSON.stringify(M[L].counts)}`);
  const dups = (L) => M[L].fights.filter((v) => v.parts.some((p) => p.copy)).length;
  for (let L = 1; L <= 9; L++) assert.equal(dups(L), 0, `no duplicate at ${L}`);
  for (const L of [10, 11, 12]) assert.ok(dups(L) > 3 && dups(L) < 40, `level ${L}: ${dups(L)} doubled`);
  for (const v of M[12].fights.filter((x) => x.parts.some((p) => p.copy))) {
    const b = v.parts.find((p) => p.copy), a = v.parts.find((p) => p.id === b.id.slice(0, -1));
    assert.equal(b.name, `${a.name} 2`, 'named for targeting');
    assert.ok(a.attack && b.attack.due - a.attack.due === (v.mutation === 'hasty' && a.attack.due === 2 ? 0 : 1), 'a cycle apart (never onto cycle 1)');
  }
});

test('one stranger a fight: a new player never meets two parts it has never researched (the Pulse Node and the signature aside), and never in a 4-part fight', () => {
  for (let L = 1; L <= 12; L++) for (const v of N[L].fights) {
    const strangers = [...new Set(v.parts.filter((p) => p.id !== 'pulse' && !p.special && !p.copy).map((p) => p.id))]; // a doubled basic is one kind
    assert.ok(strangers.length <= 1, `level ${L}: ${v.parts.map((p) => p.id).join()}`);
    if (strangers.length) assert.ok(v.parts.length <= 3, `level ${L}: a stranger in ${v.parts.length} parts`);
  }
  // A part researched stops being a stranger.
  const s = fresh();
  for (const f of Object.keys(FAMILIES)) for (const p of FAMILIES[f].parts) (s.research ||= {})[`${f}:${p.id}`] = 3;
  let four = 0;
  for (let seed = 1; seed <= 300; seed++) { s.encounter = null; selectEncounter(s, 'random', seed, { level: 12, quiet: true }); four += s.encounter.virus.parts.length === 4; }
  assert.ok(four > 10, `${four} four-part fights once everything is met`);
});

test('the total stays the same: a fight\'s Integrity comes from its family and level, not its part count', () => {
  for (const L of [5, 12]) {
    const by = { 2: [], 3: [], 4: [] };
    for (const v of M[L].fights) if (!v.mutation) by[v.parts.length].push(v.parts.reduce((n, p) => n + p.max, 0) / (v.hpPower || 1));
    const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
    const all = Object.values(by).filter((x) => x.length).map(avg);
    assert.ok(Math.max(...all) / Math.min(...all) < 1.12, `level ${L}: ${all.map((x) => x.toFixed(0)).join(' / ')}`);
  }
});

// ---------- the basics ----------
// Pressure, as families.mjs pressureOf counts it: the damage over the first 20 cycles, after a level's Block, with
// nothing broken. A Cipher Block's counts the Encrypts of an Encryptor left standing, a Fan-in's the fragments of a
// Replicator left standing (3 at most).
function pressure(s, family, id, level) {
  const v = createVirus('random', 4821, { family, threat: SERVER.threat(level), run: true, mutation: null, basic: id });
  const p = v.parts.find((x) => x.id === id), a = p.attack;
  let n = 0;
  for (const c of landingsOf({ attack: { ...a, due: a.first }, taps: p.taps }, 21)) {
    const k = p.cipher ? Math.max(0, Math.floor((c - 4) / 5) + 1) : p.fanin ? Math.min(3, Math.max(0, Math.floor((c - 3) / 4) + 1)) : 0;
    n += blocked(s, Math.round(a.amount * (1 + (p.cipher || p.fanin || 0) * k)));
  }
  return n;
}
test('the basics with a plain attack are pressure-matched to their family\'s Pulse Node: within 5% over 20 cycles after Block, at 10 and 30', () => {
  const was = PARTS.pressure, wasHit = PARTS.hit;
  PARTS.pressure = [1, 1]; PARTS.hit = [[1, 1]]; // the basics as written, before a fight's share-out of pressure
  try { for (const L of [10, 30]) {
    const s = player('bastion', 'warden', L);
    for (const [f, body] of Object.entries(FAMILIES)) {
      const pulse = pressure(s, f, 'pulse', L);
      for (const spec of body.parts.filter((x) => x.pool === 'basic' && x.attack && x.attack.interval > 1)) {
        const k = pressure(s, f, spec.id, L) / pulse;
        assert.ok(Math.abs(k - 1) <= 0.05, `${f} ${spec.id} at ${L}: ${(k * 100).toFixed(0)}%`);
      }
    }
  } } finally { PARTS.pressure = was; PARTS.hit = wasHit; }
});
test('the spike cap: no hit of a rolled fight grows past PARTS.cap of its family\'s Pulse Node (a part that would hits more often instead)', () => {
  for (const L of [5, 10, 12, 30]) {
    const was = { p: PARTS.pressure, h: PARTS.hit };
    PARTS.pressure = [1, 1]; PARTS.hit = [[1, 1]];
    const pulse = Object.fromEntries(Object.keys(FAMILIES).map((f) => [f, createVirus('random', 1, { family: f, threat: SERVER.threat(L), run: true, mutation: null, basic: 'pulse' }).parts.find((p) => p.id === 'pulse').attack.amount]));
    Object.assign(PARTS, { pressure: was.p, hit: was.h });
    for (let seed = 1; seed <= 300; seed++) {
      const v = createVirus('random', seed, { threat: SERVER.threat(L), run: true, mutation: null });
      for (const p of v.parts) if (p.attack?.effect === 'damage') assert.ok(p.attack.amount <= Math.ceil(PARTS.cap * pulse[v.family]) + 1, `level ${L} ${v.name}: ${p.id} ${p.attack.amount} against a Pulse Node's ${pulse[v.family]}`);
    }
  }
});
test('every basic: a level it opens at, a loot component, a Codex card with its research tiers, and a read on the board', async () => {
  const { entryOf } = await import('./dist/codex.mjs');
  const s = fresh();
  for (const [f, body] of Object.entries(FAMILIES)) {
    s.met = { ...(s.met || {}), [f]: true };
    const e = entryOf(s, `family:${f}`);
    for (const spec of body.parts.filter((x) => x.pool === 'basic' || x.pool === 'third')) {
      assert.ok(spec.loot, `${spec.id} drops a component`);
      const card = e.parts.find((x) => x.spec.id === spec.id);
      assert.ok(card?.part, `${f} ${spec.id} has a Codex card`);
      assert.ok(card.from >= 1);
    }
    assert.ok(basicsOf(body).length >= 4, `${f}: the Pulse Node and three more`);
  }
});

// ---------- each new part's rule ----------
// A fight at a level with a forced basic and forced genes, engaged, at home (tells live from level 6).
function fight(level, family, { basic = 'pulse', genes = [] } = {}) {
  const s = fresh(); s.metAll = true;
  selectEncounter(s, 'random', 77, { level, family, basic, genes, mutation: null, quiet: true });
  command(s, 'engage');
  s.encounter.soft = 1;
  return s;
}
const step = (s, text = 'hold') => { command(s, text); return resolveCycle(s); };

test('Accumulator: one big Discharge every 5 cycles, under the spike cap, and it never carries a charge', () => {
  const s = fight(18, 'ransomware', { basic: 'accumulator' }), p = part(s, 'accumulator');
  assert.equal(p.attack.interval, 5);
  const b = fight(18, 'ransomware', { basic: 'pulse' });
  assert.ok(attackAmount(p) <= 1.3 * attackAmount(part(b, 'pulse')), 'its Discharge is at most 1.3 Pulse Nodes (a Surge is about 37% of a level-matched Signal, the cap 45%)');
  assert.ok(p.accum);
  assert.notEqual(findSource(s.encounter.virus, { kind: 'charge', part: 'basic' })?.id, 'accumulator');
});

test('Strobe: a small hit every cycle from cycle 2, bare', () => {
  const s = fight(6, 'worm', { basic: 'strobe' }), p = part(s, 'strobe');
  assert.equal(p.armor, 0);
  assert.deepEqual(landingsOf(p, 6), [2, 3, 4, 5]);
});

test('Repeater and Prism: a volley on back to back cycles; one cut stops the rest of it', () => {
  const s = fight(6, 'worm', { basic: 'repeater' }), p = part(s, 'repeater');
  assert.deepEqual(landingsOf(p, 15), [3, 4, 8, 9, 13, 14]);
  const chips = intents(s, 4).filter((i) => i.source === 'repeater');
  assert.deepEqual(chips.map((i) => [i.col, i.tap, i.taps]), [[2, 1, 2], [3, 2, 2]]);
  const g = fight(6, 'ghostroot', { basic: 'prism' });
  assert.deepEqual(landingsOf(part(g, 'prism'), 10), [3, 4, 5, 8, 9]);
  // A cut on the volley's first hit: the second goes with it.
  step(s); step(s);
  const a = p.attack;
  assert.equal(a.due, 3);
  p.ticks = [{ at: 0.99, spent: false }]; s.encounter.ticked = true;
  step(s, 'spike repeater');
  if (p.attack.due === 4) step(s); // the hit went to armor: no cut this time
  assert.ok(!p.attack.tap, 'no volley in flight');
});

test('Buffer: on its beat it shields the part below it, and the shield takes command hits only', () => {
  const s = fight(6, 'ransomware', { basic: 'buffer' }), enc = part(s, 'encryptor');
  step(s); // end of cycle 1: the first shield
  assert.ok(enc.bufHp > 0, 'the Encryptor is shielded');
  const was = enc.bufHp;
  enc.armor = 0;
  s.encounter.burns.push({ id: 'inject', name: 'Inject', target: 'encryptor', damage: 3, left: 3 });
  const hp = enc.integrity;
  step(s);
  assert.equal(enc.bufHp, was, 'a burn goes under it');
  assert.ok(enc.integrity < hp);
  step(s, 'spike encryptor');
  assert.ok(enc.bufHp < was, 'your command hits the shield');
});

test('Cipher Block and Fan-in: their hits grow with your encryption and with the fragments on the board', () => {
  const s = fight(6, 'ransomware', { basic: 'cipherblock' }), p = part(s, 'cipherblock'), base = attackAmount(p);
  s.encounter.encrypt = part(s, 'encryptor').attack.amount * 2;
  intents(s);
  assert.equal(attackAmount(p), base + Math.round(p.attack.amount * p.cipher * 2));
  const w = fight(6, 'worm', { basic: 'fanin' }), f = part(w, 'fanin'), b0 = attackAmount(f);
  w.encounter.virus.parts.push({ id: 'frag9', name: 'Fragment 9', kind: 'fragment', integrity: 5, max: 5, armor: 0, maxArmor: 0, attack: null });
  intents(w);
  assert.equal(attackAmount(f), b0 + Math.round(f.attack.amount * f.fanin));
});

test('Obfuscator: while it stands every part hides its timers, bare or not; Tag still shows one', () => {
  const s = fight(6, 'ghostroot', { basic: 'obfuscator' }), sc = part(s, 'scrambler');
  sc.armor = 0;
  assert.ok(timersHidden(s, sc));
  sc.taggedUntil = s.encounter.cycle;
  assert.ok(!timersHidden(s, sc));
  part(s, 'obfuscator').integrity = 0;
  sc.taggedUntil = 0;
  assert.ok(!timersHidden(s, sc), 'with it broken, a bare part shows again');
});

test('Zip Bomb: break it and 2 cycles later it hits you for 20% of your max; a ◆ takes it; a fight that ends puts the fuse out', () => {
  const s = fight(6, 'ransomware', { genes: ['zipbomb'] }), z = part(s, 'zipbomb');
  z.integrity = 1;
  step(s, 'spike zipbomb');
  assert.ok(z.fuseAt === s.encounter.cycle + 1, 'the fuse is lit');
  assert.ok(intents(s, 4).some((i) => i.effect === 'fuse' && i.source === 'zipbomb'), 'its chip is on the board');
  for (const p of livingParts(s)) if (p.attack) p.attack.due = 99;
  const max = s.server.max, hp = s.server.integrity;
  step(s); step(s);
  assert.equal(hp - s.server.integrity, Math.round(max * CONFIG.zipbomb.share));
  const t = fight(6, 'ransomware', { genes: ['zipbomb'] });
  for (const p of livingParts(t)) if (p.attack) p.attack.due = 99;
  part(t, 'zipbomb').integrity = 1;
  step(t, 'spike zipbomb');
  t.encounter.chits = 1;
  const hp2 = t.server.integrity;
  step(t); step(t);
  assert.equal(t.server.integrity, hp2, 'a ◆ takes it');
  const u = fight(6, 'ransomware', { genes: ['zipbomb'] });
  for (const p of livingParts(u)) if (p.id !== 'zipbomb') p.integrity = 0;
  part(u, 'zipbomb').integrity = 1;
  step(u, 'spike zipbomb');
  assert.ok(!active(u), 'the last part broken: the fight is won, the fuse out');
});

test('Hotspot: a command hit on it turns the next attack 2 or more cycles away into a charge; a burn doesn\'t', () => {
  const s = fight(8, 'ransomware', { genes: ['hotspot'] }), h = part(s, 'hotspot');
  h.integrity = h.max = 999;
  s.encounter.burns.push({ id: 'inject', name: 'Inject', target: 'hotspot', damage: 3, left: 3 });
  step(s);
  assert.ok(!tellsOf(s).list.some((t) => t.id === 'hotspot'), 'a burn sets nothing off');
  step(s, 'spike hotspot');
  const t = tellsOf(s).list.find((x) => x.id === 'hotspot');
  assert.ok(t?.told, 'a Hot Charge is said');
  assert.ok(t.next - s.encounter.cycle >= 1 && t.part !== 'hotspot');
});

test('Idle Timer: at 5 cycles without a command hit on the signature, every part re-arms; a hit starts the count over', () => {
  const s = fight(10, 'ransomware', { genes: ['idletimer'] }), pulse = part(s, 'pulse'), enc = part(s, 'encryptor');
  for (const p of livingParts(s)) if (p.attack) p.attack.due = 99;
  pulse.armor = 0; pulse.patchAt = 99;
  for (let i = 0; i < 4; i++) step(s);
  assert.equal(pulse.armor, 0);
  step(s);
  assert.equal(pulse.armor, pulse.maxArmor, 'IDLE: re-armed at 5');
  pulse.armor = 0; pulse.patchAt = 99;
  step(s); step(s); step(s, 'spike encryptor'); step(s); step(s);
  assert.equal(pulse.armor, 0, 'the hit on the Encryptor started the count over');
  assert.ok(enc);
});

test('Front End: while it wears ◆ your single-target command at its partner lands on it; stripped, it doesn\'t; burns go through', () => {
  const s = fight(10, 'ghostroot', { genes: ['frontend'] }), fe = part(s, 'frontend'), sc = part(s, 'scrambler');
  for (const p of livingParts(s)) if (p.attack) p.attack.due = 99;
  const a0 = fe.armor, hp = sc.integrity;
  sc.armor = 0;
  step(s, 'spike scrambler');
  assert.equal(fe.armor, a0 - 1, 'the hit bent onto the Front End');
  assert.equal(sc.integrity, hp);
  fe.armor = 0; fe.patchAt = 99;
  step(s, 'spike scrambler');
  assert.ok(sc.integrity < hp, 'stripped, it lets the hit through');
});

test('Backlog: when its Ack lands, the skill you fired that cycle cools down 2 cycles longer', () => {
  const s = fight(12, 'worm', { genes: ['backlog'] }), b = part(s, 'backlog');
  for (const p of livingParts(s)) if (p.attack) p.attack.due = 99;
  const c = s.encounter.cycle;
  step(s, 'overload pulse');
  const plain = s.encounter.readyAt.overload - c;
  const t = fight(12, 'worm', { genes: ['backlog'] }), tb = part(t, 'backlog');
  for (const p of livingParts(t)) if (p.attack) p.attack.due = 99;
  tb.attack.due = t.encounter.cycle;
  t.encounter.chits = 0;
  const ev = step(t, 'overload pulse');
  const landed = ev.some((e) => e.backlog);
  assert.ok(plain >= 2, `Overload cools ${plain}`);
  if (landed) assert.equal(t.encounter.readyAt.overload - c, plain + b.backlog, '+2 on the key it hit');
  else assert.ok(ev.some((e) => e.source === 'backlog'), 'its Ack went somewhere (a miss)');
  assert.ok(intents(t, 4).filter((i) => i.source === 'backlog').every((i) => i.syn), 'its cells carry SYN');
});

test('the new thirds: genes with a cost and a level inside their floor\'s band, the Decoy at 2 points, and the planner answers each', () => {
  for (const id of ['zipbomb', 'hotspot', 'idletimer', 'frontend', 'backlog']) {
    const g = GENES[id];
    assert.ok(g.cost >= 1 && g.cost <= 3 && g.opens >= 5 && g.opens <= 12, id);
    assert.ok(g.bot, `${id} has a bot answer`);
    assert.ok(Object.keys(g.parts).every((f) => FAMILIES[f].third.includes(id)), `${id} is in its families' pools`);
  }
  assert.equal(GENES.decoymirror.cost, 2);
  assert.ok(GENES.idletimer.sig && FAMILIES.ransomware.parts.find((p) => p.id === 'lockbox').sig);
});

// ---------- damage profiles ----------
// A fight's damage is its family's profile, shared out by role (parts.mjs PARTS.profile): a role nothing rolled carries
// moves onto the basic, so every fight keeps its family's shape whatever rolled.
const unsigned = (family, level) => { for (let seed = 1; seed < 400; seed++) { const s = fresh(); s.metAll = true; selectEncounter(s, 'random', seed, { level, family, mutation: null, quiet: true }); if (s.encounter.virus.noSignature) { command(s, 'engage'); s.encounter.soft = 1; return s; } } throw new Error(`no ${family} fight without its signature at ${level}`); };
test('damage profiles: every Ransomware fight carries its ramp (the Encryptor, or a Ratchet on the basic), every Ghostroot fight its burst (the Scrambler, or its Scramble on the basic)', () => {
  for (const L of [5, 10, 30]) for (let seed = 1; seed <= 300; seed++) {
    const v = createVirus('random', seed, { threat: SERVER.threat(L), run: true });
    const sig = v.parts.some((p) => p.special), basic = v.parts.find((p) => p.basic);
    if (v.family === 'ransomware') assert.equal(v.parts.filter((p) => p.ratchet).length, sig ? 0 : 1, `${v.name} at ${L}`);
    if (v.family === 'ransomware' && !sig) assert.equal(basic.ratchet ? 1 : 0, 1, `${v.name}: the Ratchet is on the basic`);
    if (v.family === 'ghostroot' && !sig) assert.ok(basic.attack?.scrambles, `${v.name} at ${L}: its basic Scrambles`);
    if (v.family === 'worm' && !sig) assert.ok(!v.parts.some((p) => p.ratchet || p.attack?.scrambles), `${v.name}: a Worm is steady`);
  }
  for (const [f, prof] of Object.entries(PARTS.profile)) assert.ok(FAMILIES[f] && prof.steady > 0, f);
});
// nominal's count over a typical fight (PARTS.horizon) at the fight's level: a fragment's gnaw and a Scramble's cycles
// scale with the virus's damage too, and a Ratchet's stack counts every cycle it deals.
const fightTotal = (v, T) => v.parts.reduce((n, p) => {
  const a = p.attack;
  let r = 0;
  for (let c = 1; c <= T; c++) r += heatOf(p, c);
  if (!a) return n + r;
  if (a.effect === 'replicate' || a.effect === 'scramble') return n + r + nominal({ attack: { ...a, effect: 'damage', amount: (a.hit || 0) + (a.effect === 'replicate' ? CONFIG.fragmentDamage * 4 : a.amount * 3) * v.power } }, T);
  return n + r + nominal(p, T) + (a.scrambles ? a.scrambles * 3 * v.power * Math.ceil((T + 1 - (a.first ?? a.due)) / Math.max(a.interval, a.scrambleEvery)) : 0);
}, 0);
const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
test('damage profiles: a fight without its signature deals what one with it does over a typical fight, within 15% (nominal, the Ratchet counted), and wears its family\'s ◆ (where PARTS.armor holds it to all of them)', () => {
  for (const L of [10, 30]) for (const f of Object.keys(FAMILIES)) {
    const T = along(PARTS.horizon, L), by = { sig: [], none: [] }, armor = { sig: [], none: [] };
    for (let seed = 1; seed <= 300; seed++) {
      const v = createVirus('random', seed, { family: f, threat: SERVER.threat(L), run: true, mutation: null });
      const k = v.noSignature ? 'none' : 'sig';
      by[k].push(fightTotal(v, T)); armor[k].push(v.parts.reduce((n, p) => n + p.armor, 0));
    }
    assert.ok(Math.abs(avg(by.none) / avg(by.sig) - 1) <= 0.15, `${f} at ${L}: ${avg(by.none).toFixed(0)} without, ${avg(by.sig).toFixed(0)} with`);
    if (along(PARTS.armor, L) === 1) assert.ok(avg(armor.none) >= avg(armor.sig) - 1, `${f} at ${L}: ◆ ${avg(armor.none).toFixed(1)} without, ${avg(armor.sig).toFixed(1)} with`);
  }
});
test('damage profiles: every family deals the same over a typical fight at its level (within 5%), only the shape differs', () => {
  // Each family's own fight (the Pulse Node and the signature, no third), over PARTS.horizon at the level.
  for (const L of [5, 10, 30, 50]) {
    const T = along(PARTS.horizon, L);
    const by = Object.fromEntries(Object.keys(FAMILIES).map((f) => { const v = createVirus('random', 7, { family: f, threat: SERVER.threat(L), mutation: null, basic: 'pulse' }); /* at home: a run's early steps leave encryption out */ return [f, fightTotal(v, T) / v.power]; }));
    const xs = Object.values(by);
    assert.ok(Math.max(...xs) / Math.min(...xs) <= 1.05, `level ${L} over ${T} cycles: ${Object.entries(by).map(([f, x]) => `${f} ${x.toFixed(0)}`).join(' / ')}`);
  }
  const sum = (f) => Object.values(PARTS.profile[f]).reduce((a, b) => a + b, 0);
  for (const f of Object.keys(PARTS.profile)) assert.ok(Math.abs(sum(f) - 1) < 0.02, `${f}'s shares add up to 1`);
});
test('the Ratchet: the basic\'s own stack, a step on the Encryptor\'s clock while it lives; Purge starts it over, breaking it ends it; the board shows it', () => {
  const s = unsigned('ransomware', 10), p = s.encounter.virus.parts.find((x) => x.ratchet);
  assert.ok(p?.basic, 'on the basic');
  for (const x of livingParts(s)) if (x.attack) x.attack.due = 99;
  s.server.integrity = s.server.max = 9999;
  const lost = [];
  for (let c = 0; c < 11; c++) { const hp = s.server.integrity; step(s); lost.push(hp - s.server.integrity); }
  const a = p.ratchet.amount;
  assert.ok(lost[2] === 0 && lost[4] > 0, `it starts after cycle ${p.ratchet.from}: ${lost.join(' ')}`);
  assert.ok(lost[10] > lost[5], `it grows: ${lost.join(' ')}`);
  assert.equal(heatOf(p, s.encounter.cycle + p.ratchet.every) - heatOf(p, s.encounter.cycle), a, 'a step every interval');
  const html = boardMarkup(s);
  assert.ok(/intent crypt esc/.test(html) && /ratchet/.test(html), 'its chip and tag on the board');
  p.ratchet.from = 0; // (Purge is someone's key: start it over by hand, as coolRatchet does)
  assert.ok(heatOf(p, s.encounter.cycle) > 0);
  p.integrity = 0;
  const hp = s.server.integrity; step(s);
  assert.equal(hp - s.server.integrity, 0, 'broken: the Ratchet is gone');
});
test('a Ghostroot basic carrying the burst: its hits Scramble you, at most once on the Scrambler\'s clock', () => {
  const s = unsigned('ghostroot', 10), p = s.encounter.virus.parts.find((x) => x.basic);
  assert.ok(p.attack.scrambles >= 1 && p.attack.scrambleEvery >= 1);
  s.server.integrity = s.server.max = 9999;
  let scrambled = 0;
  for (let c = 0; c < 8; c++) { const ev = step(s); if (ev.some((e) => e.type === 'blind' && e.source === p.id)) scrambled++; }
  assert.ok(scrambled >= 1 && scrambled <= Math.ceil(8 / p.attack.scrambleEvery), `${scrambled} Scrambles in 8 cycles`);
});

test('every parts number is one named constant, and developer parts shows and sets them', () => {
  for (const k of ['signature', 'count', 'duplicate', 'copy', 'floor', 'native', 'elite', 'bulk', 'pressure', 'thirdMax']) assert.ok(k in PARTS, k);
  const s = fresh(), was = structuredClone(PARTS.signature);
  try {
    const ev = command(s, 'developer parts signature 10 0.5');
    assert.ok(ev.some((e) => /Mix at level/.test(e.message)));
    assert.equal(signatureShare(10), 0.5);
    command(s, 'developer parts profile ransomware ramp 160');
    assert.equal(PARTS.profile.ransomware.ramp, 160, 'a profile is set by family and shape');
  } finally { PARTS.signature = was; PARTS.profile.ransomware.ramp = 152; }
  const r = rollParts({ family: 'worm', body: FAMILIES.worm, level: 1, rand: () => 0.1 });
  assert.equal(r.basic.id, 'pulse');
});

// ---------- phase P2: floors 3 and 4, natives ----------
// The kinds you can meet from 13 to 26: the plan's "After" column less the Cryptominer's and the Wiper's own parts (the
// Rig, the Cooler, the Degausser and the Eraser) and the Damper, which come with P3 (the Damper is built, on the Worm's
// list for its playtest page, but rolls at weight 0 until its own families come: PARTS.weight).
const KINDS2 = { 13: 24, 14: 25, 15: 25, 16: 26, 17: 27, 18: 27, 19: 28, 20: 29, 21: 30, 22: 30, 23: 30, 24: 31, 25: 31, 26: 31 };
const M2 = {}, N2 = {};
for (let L = 13; L <= 26; L++) { M2[L] = measure(L); N2[L] = measure(L, false); }
test('P2: the kinds you can meet from 13 to 26, and something new every few levels (13, 14, 16, 17, 19, 20, 21, 24)', () => {
  for (let L = 13; L <= 26; L++) {
    assert.ok(M2[L].kinds.size >= KINDS2[L], `level ${L}: ${M2[L].kinds.size} kinds, want ${KINDS2[L]}`);
    assert.ok(N2[L].kinds.size >= KINDS2[L] - 2, `a new player at ${L}: ${N2[L].kinds.size} kinds`);
  }
  const firstAt = {};
  for (let L = 1; L <= 12; L++) for (const k of M[L].kinds) firstAt[k] ??= L;
  for (let L = 13; L <= 26; L++) for (const k of M2[L].kinds) firstAt[k] ??= L;
  for (const [id, L] of Object.entries({ limiter: 13, spare: 14, tripwire: 16, shunt: 17, scraper: 19, packer: 20, badblock: 21, coldstore: 24 })) assert.equal(firstAt[id], L, `${id} first at ${L}`);
  assert.equal(firstAt.damper, undefined, 'the Damper waits for P3');
  const news = new Set(Object.values(firstAt));
  for (let L = 1; L + 3 <= 26; L++) assert.ok([L, L + 1, L + 2, L + 3].some((x) => news.has(x)), `nothing new from ${L} to ${L + 3}`);
});
test('P2: a share of fights have 4 parts from 16 (PARTS.count), and one stranger a fight still holds', () => {
  for (let L = 16; L <= 26; L++) assert.ok(M2[L].counts[4] >= 50, `level ${L}: ${JSON.stringify(M2[L].counts)}`);
  for (const L of [13, 15]) assert.ok(M2[L].counts[4] < M2[16].counts[4], `fewer 4-part fights at ${L}`);
  assert.deepEqual(along(PARTS.count, 16), [0.1, 0.6, 0.3]);
  for (let L = 13; L <= 26; L++) for (const v of N2[L].fights) {
    const strangers = [...new Set(v.parts.filter((p) => p.id !== 'pulse' && !p.special && !p.copy).map((p) => p.id))];
    assert.ok(strangers.length <= 1 && (!strangers.length || v.parts.length <= 3), `level ${L}: ${v.parts.map((p) => p.id).join()}`);
  }
});
test('P2: the new thirds are genes with a cost, a level inside their floor\'s band and their floor, in their families\' pools; the Tripwire opens at 16', () => {
  const NATIVE = { limiter: 3, spare: 3, shunt: 3, scraper: 4, badblock: 4, coldstore: 4 };
  for (const id of ['limiter', 'spare', 'shunt', 'scraper', 'packer', 'badblock', 'damper', 'coldstore']) {
    const g = GENES[id];
    assert.ok(g.cost >= 1 && g.cost <= 3, id);
    assert.equal(g.floor || null, NATIVE[id] || null, `${id}'s floor`);
    if (g.floor) { const [lo, hi] = [[1, 8], [7, 14], [13, 20], [19, 26]][g.floor - 1]; assert.ok(g.opens >= lo && g.opens <= hi, `${id} opens inside floor ${g.floor}'s band`); }
    assert.ok(Object.keys(g.parts).every((f) => FAMILIES[f].third.includes(id) && g.parts[f].loot && g.parts[f].from === g.opens), `${id} is in its families' pools`);
  }
  assert.equal(GENES.tripwire.opens, 16); assert.equal(FAMILIES.ransomware.parts.find((p) => p.id === 'tripwire').from, 16);
  assert.ok(GENES.spare.sig, 'the Spare refers to the signature: never without it');
  for (let L = 14; L <= 26; L++) for (const v of M2[L].fights) if (v.noSignature) assert.ok(!v.parts.some((p) => p.spare || p.idle), `${v.name}: no Spare or Idle Timer without the signature`);
});

// A forced fight at home (the playtest page's shape: the Pulse Node, the signature, the forced thirds), engaged.
const fight2 = (level, family, genes) => { const s = fresh(); s.metAll = true; selectEncounter(s, 'random', 77, { level, family, basic: 'pulse', genes, mutation: null, quiet: true }); command(s, 'engage'); s.encounter.soft = 1; s.server.integrity = s.server.max = 9999; return s; };
const still = (s) => { for (const p of livingParts(s)) if (p.attack) p.attack.due = 999; };
test('Limiter: no single hit takes more than 20% of its max; burns tick under the cap', () => {
  const s = fight2(13, 'ransomware', ['limiter']), p = part(s, 'limiter');
  p.armor = 0;
  const cap = limitOf(p), hp = p.integrity;
  assert.equal(cap, Math.round(p.max * 0.2));
  hit(s, p, 9999, { server: true });
  assert.equal(hp - p.integrity, cap, 'a huge hit takes the cap');
  hit(s, p, 1, { server: true });
  assert.equal(hp - p.integrity, cap + 1, 'a small one takes what it deals');
  assert.match(boardMarkup(s), /class="capline"/);
});
test('Spare: asleep off the timeline; when the signature breaks it boots 2 cycles later at 60% of its max with its attack; broken asleep, it never does', () => {
  const s = fight2(14, 'worm', ['spare']), sp = part(s, 'spare'), sig = part(s, 'replicator');
  assert.ok(!sp.attack && !intents(s, 4).some((i) => i.source === 'spare'), 'asleep: no attack, nothing on the timeline');
  still(s);
  const max = sig.max;
  hit(s, sig, 99999, { pierce: true, server: true });
  assert.ok(sp.bootAt === s.encounter.cycle + 2 && intents(s, 4).some((i) => i.source === 'spare' && i.effect === 'boot'), 'its Boot chip');
  step(s); step(s); step(s);
  assert.ok(sp.booted && sp.attack?.effect === 'replicate', 'booted with the Replicator\'s Replicate');
  assert.equal(sp.max, Math.round(max * 0.6));
  const t = fight2(14, 'worm', ['spare']), sp2 = part(t, 'spare');
  hit(t, sp2, 99999, { pierce: true, server: true });
  hit(t, part(t, 'replicator'), 99999, { pierce: true, server: true });
  assert.ok(!sp2.bootAt && !alive(sp2), 'broken while it slept: no boot');
});
test('Shunt: while both live, half of what its partner takes moves onto it (after the partner\'s ◆); it shows as a tether', () => {
  const s = fight2(17, 'worm', ['shunt']), sh = part(s, 'shunt'), sig = part(s, 'replicator');
  assert.equal(shuntOf(s, sh), sig, 'its partner is the signature');
  sig.armor = 0;
  const a = sig.integrity, b = sh.integrity;
  hit(s, sig, 20, { server: true });
  assert.equal(a - sig.integrity, 10); assert.equal(b - sh.integrity, 10);
  assert.match(boardMarkup(s), /tether k-shunt/);
  sh.integrity = 0;
  const c = sig.integrity; hit(s, sig, 20, { server: true });
  assert.equal(c - sig.integrity, 20, 'with it broken, the partner takes it all');
});
test('Scraper: its landing takes your ◆ (its hit goes past them) and what is left of your shield, and wears up to 2 ◆ (2 in all)', () => {
  const s = fight2(19, 'ransomware', ['scraper']), p = part(s, 'scraper');
  still(s);
  const a0 = p.armor;
  Object.assign(s.encounter, { chits: 1, shield: 0 });
  p.attack.due = s.encounter.cycle;
  const hp = s.server.integrity;
  step(s);
  assert.equal(s.encounter.chits, 0);
  assert.equal(p.armor, a0 + 1, 'a ◆ on itself');
  assert.ok(hp - s.server.integrity > 0, 'its hit lands, past your ◆');
  Object.assign(s.encounter, { shield: 999 }); p.attack.due = s.encounter.cycle;
  const hp2 = s.server.integrity;
  step(s);
  assert.equal(s.server.integrity, hp2, 'the shield takes the hit');
  assert.equal(s.encounter.shield, 0, 'and the Scraper takes what is left of it');
  assert.equal(p.armor, a0 + 2);
  Object.assign(s.encounter, { chits: 3 }); p.attack.due = s.encounter.cycle;
  step(s);
  assert.equal(p.armor, a0 + 2, 'never more than 2 in all');
  assert.ok(intents(s, 4).filter((i) => i.source === 'scraper').every((i) => i.scrape), 'its cells carry the takes-shield mark');
});
test('Packer: while it stands the virus\'s rolled rules read as ???; breaking it, or a scan before the fight, unpacks them', () => {
  const s = fight2(20, 'ghostroot', ['packer', 'frontend']), fe = part(s, 'frontend');
  s.research = { 'ghostroot:frontend': 60 };
  assert.match(partTip(s, s.encounter.virus, fe), /Packed/);
  assert.match(boardMarkup(s), /tag packed/);
  assert.match(hudMarkup(s), /data-packed="1"/);
  assert.ok(s.encounter.virus.name.startsWith('PACKED'), 'it names the virus');
  hit(s, part(s, 'packer'), 99999, { pierce: true, server: true });
  assert.doesNotMatch(partTip(s, s.encounter.virus, fe), /Packed/, 'broken: unpacked');
  const t = fresh(); t.metAll = true; t.run = { loc: 'sim', cwd: '/', integrity: 300, max: 300, pack: [], visited: ['/'], unpack: [] };
  const opts = { mode: 'run', room: '/x', level: 20, family: 'ghostroot', basic: 'pulse', genes: ['packer', 'frontend'], mutation: null, quiet: true };
  t.run.unpack.push(encounterVirus(t, 'random', 77, opts).id);
  selectEncounter(t, 'random', 77, opts);
  assert.ok(t.encounter.unpacked, 'scanned before: it hides nothing');
});
test('Bad Block: when it lands your next heals lose up to 10% of your max; it shows as cracked cells on your bar', () => {
  const s = fight2(21, 'ghostroot', ['badblock']), p = part(s, 'badblock');
  still(s);
  s.server.max = 1000; s.server.integrity = 500;
  p.attack.due = s.encounter.cycle; s.encounter.chits = 0; s.encounter.shield = 0;
  step(s);
  assert.equal(s.encounter.badBlock?.left, 100, '10% of your max');
  assert.match(hudMarkup(s), /cracked-cells/);
  const hp = s.server.integrity;
  heal(s, 60, 'Test');
  assert.equal(s.server.integrity, hp, 'the cracked cells eat it');
  heal(s, 60, 'Test');
  assert.equal(s.server.integrity, hp + 20, 'the rest of the heal gets through');
  assert.ok(!s.encounter.badBlock);
});
test('Damper: while it wears ◆, the kind it drops deals nothing even through ◆, but still breaks one; stripped, it takes everything', () => {
  const s = fight2(23, 'worm', ['damper']), d = part(s, 'damper');
  assert.ok(DAMPER_KINDS.includes(d.damperKind));
  d.damperKind = 'burn';
  const a = d.armor, hp = d.integrity;
  hit(s, d, 10, { dot: true, pierce: true });
  assert.equal(d.integrity, hp, 'a burn through ◆: nothing');
  assert.equal(d.armor, a - 1, 'it still breaks a ◆');
  hit(s, d, 10, { src: 'helper', dot: true, pierce: true });
  assert.ok(d.integrity < hp, 'a helper through ◆ gets in (it drops burns)');
  d.armor = 0;
  const h2 = d.integrity; hit(s, d, 5, { dot: true });
  assert.ok(d.integrity < h2, 'stripped: burns hurt it');
  assert.match(boardMarkup(s), /tag damper/);
});
test('Cold Store: frozen for 5 cycles, off the timeline and untouchable, with a Thaw chip; then it thaws and its Chill comes 2 cycles later', () => {
  const s = fight2(24, 'ransomware', ['coldstore']), c = part(s, 'coldstore');
  assert.ok(frozenNow(s, c) && !c.attack && c.chill, 'frozen, its Chill set aside');
  assert.match(boardMarkup(s), /tag frost/);
  const hp = c.integrity;
  hit(s, c, 999, { mine: true, pierce: true });
  assert.equal(c.integrity, hp, 'nothing reaches it');
  assert.match(toIntent(s, 'spike coldstore').error || '', /frozen/);
  still(s);
  for (let i = 0; i < 4; i++) step(s);
  assert.ok(intents(s, 4).some((i) => i.source === 'coldstore' && i.effect === 'thaw' && i.col === 0), 'its Thaw chip in Now on cycle 5');
  step(s);
  assert.ok(!frozenNow(s, c) && c.attack?.name === 'Chill' && c.attack.due >= s.encounter.cycle + 1, 'thawed; its Chill comes after');
});
test('natives: elites and ★ rare spawns always bring one of their floor\'s natives (the nearest floor above\'s when theirs has none open)', () => {
  const floorOf = (v, p) => GENES[FAMILIES[v.family].parts.find((x) => x.id === p.id)?.gene || '']?.floor || 0;
  for (const [L, F] of [[16, 3], [22, 4], [10, 2]]) {
    let exact = 0, n = 0;
    for (let seed = 1; seed <= 60; seed++) for (const flag of ['elite', 'rare']) {
      const v = createVirus('random', seed, { threat: SERVER.threat(L), run: true, mutation: null, floor: F, [flag]: true });
      const floors = v.parts.map((p) => floorOf(v, p)).filter(Boolean);
      assert.ok(v.parts.length >= 3, `${flag}: 3 parts or more`);
      assert.ok(floors.some((f) => f <= F), `${flag} ${v.name} at ${L} on floor ${F}: ${v.parts.map((p) => p.id).join()}`);
      if (FAMILIES[v.family].parts.some((x) => x.pool === 'third' && GENES[x.gene].floor === F && x.from <= L)) { exact += floors.includes(F); n++; } // (the Worm has no floor-4 native in P2)
    }
    assert.ok(exact >= 0.75 * n, `floor ${F} at ${L}: its own natives in ${exact} of ${n} (the rest the floor above's: a Spare needs the signature)`);
  }
});
test('Kestrel\'s Idle Timer: from floor 3, about half the guard posts and ICE bring one; none above it', () => {
  const k = (L) => { let n = 0; for (let seed = 1; seed <= 100; seed++) { const s = fresh(); s.run = { loc: 'sim', cwd: '/', integrity: 300, max: 300, pack: [], visited: ['/'] }; selectEncounter(s, ['watchdog', 'sentinel', 'crawler', 'shredder', 'bouncer', 'tracer'][seed % 6], seed, { mode: 'run', room: '/x', level: L, quiet: true }); n += s.encounter.virus.parts.some((p) => p.id === 'idletimer'); } return n; };
  assert.equal(k(10), 0, 'floor 2: none');
  const n = k(18);
  assert.ok(n >= 35 && n <= 65, `floor 3: ${n} of 100`);
  assert.equal(PARTS.kestrel.floor, 3); assert.equal(PARTS.kestrel.share, 0.5);
});
