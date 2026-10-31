// The mechanics list (docs/mechanics-list.md, dist/mechanics.mjs): twenty components built lean, one test each that its
// rule works, plus the playtest page bringing what a part feeds on. Balance waits for the designer's play.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, selectEncounter, part, livingParts, codexKey, strikeWith, intents, defender } from './dist/combat.mjs';
import { CONFIG, FAMILIES, partGenesFor } from './dist/data.mjs';
import { GENES } from './dist/genes.mjs';
import * as FP from './dist/floorplan.mjs';
import { MECH, mechPower, youDebuffs, directHit, junkKey } from './dist/mechanics.mjs';
import { partTip } from './dist/fightread.mjs';
import { statusSpans } from './dist/view.mjs';
import { TIER } from './dist/research.mjs';
import './dist/arena.mjs'; // developer fight (the Arena)

CONFIG.enemyCrit = 0; CONFIG.misses = false; CONFIG.baseCrit = 0;

// A breaker at a level against a wild virus carrying a gene (its body and that part), nothing on you, every part
// researched to its rule, and every attack held off the timeline until a test lands one.
function fight(gene, { level = 22, seed = 7 } = {}) {
  const family = Object.keys(GENES[gene].parts)[0], s = fresh();
  FP.outfit(s, { cls: 'breaker', level });
  selectEncounter(s, 'random', seed, { level, family, mutation: null, classic: true, genes: [gene], quiet: true });
  command(s, 'engage');
  s.research = {}; s.researchScale = 3;
  for (const p of s.encounter.virus.parts) s.research[codexKey(s.encounter.virus, p)] = TIER.rule;
  s.server.max = s.server.integrity = 5000;
  Object.assign(s.encounter, { soft: 1, chits: 0, shield: 0, hardened: 0 });
  for (const p of livingParts(s)) if (p.attack) p.attack.due = 999;
  return s;
}
const step = (s, text = 'hold') => { command(s, text); return resolveCycle(s); };
const mech = (s, id) => livingParts(s).find((p) => p.mech === id);
const pulse = (s) => part(s, 'pulse');
const said = (ev, re) => ev.some((x) => re.test(x.message));
const lost = (s, fn) => { const was = defender(s).integrity; fn(); return was - defender(s).integrity; };

// ---------- statuses on you ----------
test('Exposed: the Probe leaves you Exposed, and the next hit deals more and clears it', () => {
  const s = fight('exposed'), e = s.encounter;
  strikeWith(s, mech(s, 'exposed'), mech(s, 'exposed').attack);
  assert.equal(e.exposedHit, true);
  assert.ok(statusSpans(s).some((x) => x.name === 'Exposed' && x.kind === 'hot'), 'red on your strip');
  const big = lost(s, () => strikeWith(s, pulse(s), pulse(s).attack));
  assert.equal(e.exposedHit, false);
  const plain = lost(s, () => strikeWith(s, pulse(s), pulse(s).attack));
  assert.ok(big > plain, `${big} > ${plain}`);
});

test('Lag: your command lands after the virus acts, so a part you break that cycle still attacks', () => {
  const run = (lag) => {
    const s = fight('lag'), e = s.encounter, p = pulse(s);
    Object.assign(p, { integrity: 1, armor: 0 }); p.attack.due = e.cycle;
    if (lag) e.lagUntil = e.cycle;
    return step(s, 'spike pulse').some((x) => x.type === 'server-hit' && x.source === 'pulse');
  };
  assert.equal(run(false), false, 'unlagged, the break stops its attack');
  assert.equal(run(true), true, 'lagged, it lands first');
});

test('Leak: each command you fire costs a share of your max; holding is free', () => {
  const s = fight('leak'), e = s.encounter;
  strikeWith(s, mech(s, 'leak'), mech(s, 'leak').attack);
  assert.ok(e.leakUntil >= e.cycle + 1);
  assert.ok(!said(step(s, 'hold'), /^Leak:/));
  assert.ok(said(step(s, 'spike pulse'), new RegExp(`^Leak: your command costs ${Math.round(5000 * MECH.leak.share)}\\.`)));
});

test('Sandboxed: a direct hit is refused, and one queued before it landed doesn\'t fire', () => {
  const s = fight('sandboxed'), e = s.encounter;
  strikeWith(s, mech(s, 'sandbox'), mech(s, 'sandbox').attack);
  e.cycle++; // the cycle it covers
  assert.ok(directHit('spike') && !directHit('crack'));
  command(s, 'spike pulse');
  assert.equal(e.queue, null, 'refused at the prompt');
  e.queue = { ability: 'spike', target: 'pulse', text: 'spike pulse' };
  const hp = pulse(s).integrity + pulse(s).armor;
  assert.ok(said(resolveCycle(s), /^SANDBOXED\./));
  assert.equal(pulse(s).integrity + pulse(s).armor, hp);
});

test('Stunned: your next command doesn\'t fire, unless a ◆ on you breaks instead', () => {
  const s = fight('stunned'), e = s.encounter, st = mech(s, 'stunner');
  e.chits = 1;
  strikeWith(s, st, st.attack);
  assert.equal(e.chits, 0); assert.ok(!(e.stunned > e.cycle), 'the ◆ took it');
  strikeWith(s, st, st.attack);
  assert.equal(e.stunned, e.cycle + 1);
  e.cycle++;
  const ev = step(s, 'spike pulse');
  assert.ok(said(ev, /^STUNNED\./));
});

test('Junk process: a dead key takes a bar key; firing it clears the junk, and that is the command', () => {
  const s = fight('junk'), e = s.encounter;
  strikeWith(s, mech(s, 'junk'), mech(s, 'junk').attack);
  const k = junkKey(s);
  assert.ok(k && !['spike', 'sigint'].includes(k), k);
  assert.ok(youDebuffs(s).includes('Junk process'));
  e.readyAt[k] = e.cycle + 5; // cooling: the dead key still clears
  assert.ok(said(step(s, `${k} pulse`), /^You clear the junk process/));
  assert.equal(junkKey(s), null);
});

// ---------- abilities your statuses unlock ----------
test('Predator: while you\'re Encrypted it attacks every cycle', () => {
  const s = fight('predator'), e = s.encounter, p = mech(s, 'predator');
  p.attack.due = e.cycle + 3;
  step(s);
  assert.equal(p.attack.due, e.cycle + 2, 'clean: its own timer');
  e.encrypt = 5;
  step(s);
  assert.equal(p.attack.due, e.cycle, 'encrypted: next cycle');
  assert.match(partTip(s, e.virus, p), /attacks every cycle/);
});

test('Opportunist: asleep off the timeline until you carry a debuff, then it wakes for good', () => {
  const s = fight('opportunist'), e = s.encounter, p = mech(s, 'opportunist');
  p.attack.due = 999;
  step(s);
  assert.ok(!p.woke && !intents(s).some((i) => i.source === p.id));
  e.scrambleUntil = e.cycle + 2;
  const ev = step(s);
  assert.ok(p.woke && said(ev, /WAKES/));
  assert.equal(p.attack.due, e.cycle);
  e.scrambleUntil = 0;
  step(s);
  assert.ok(p.woke, 'it stays awake');
});

test('Feeder: heals the most damaged part by its share for each debuff you carry', () => {
  const s = fight('feeder'), e = s.encounter, p = pulse(s);
  p.integrity = p.max - 30;
  step(s);
  assert.equal(p.integrity, p.max - 30, 'nothing to feed on');
  e.exposedHit = true; e.leakUntil = e.cycle + 5;
  step(s);
  assert.equal(p.integrity, p.max - 30 + Math.max(1, Math.round(p.max * MECH.feeder.share * 2)));
});

test('Punisher: a command lost to Hung or Stunned gives it a free extra attack', () => {
  const s = fight('punisher'), e = s.encounter, p = mech(s, 'punisher');
  e.stunned = e.cycle;
  const ev = step(s, 'spike pulse');
  assert.ok(said(ev, /punishes the command you lost/));
  assert.ok(ev.some((x) => x.type === 'server-hit' && x.source === p.id));
  assert.equal(p.attack.due, 999, 'its own timer untouched');
});

test('Harvester: its Reap consumes your Corrupted for a hit a cycle it had left', () => {
  const s = fight('harvester'), e = s.encounter, h = mech(s, 'harvester');
  const plain = lost(s, () => strikeWith(s, h, h.attack));
  e.corrupt = { name: 'Test', amount: 5, left: 3, source: 'pulse' };
  const reaped = lost(s, () => strikeWith(s, h, h.attack));
  assert.equal(e.corrupt, null);
  assert.ok(reaped >= plain + Math.round(5000 * MECH.harvester.share * 3) / 2, `${reaped} vs ${plain}`); // Block takes at most half
});

test('Volatile: cleansing its Corrupted deals what it had left at once; letting it run out does not', () => {
  const s = fight('volatile'), e = s.encounter, v = mech(s, 'volatile');
  strikeWith(s, v, v.attack);
  const n = e.corrupt.amount * e.corrupt.left;
  assert.equal(e.corrupt.amount, Math.round(5000 * MECH.volatile.share));
  e.corrupt = null; // a cleanse (Purge, Scrub, Rollback, a class's)
  const ev = step(s);
  assert.ok(ev.some((x) => x.atk === 'Volatile' && x.amount > n / 3), 'the rest at once');
  const t = fight('volatile');
  strikeWith(t, mech(t, 'volatile'), mech(t, 'volatile').attack);
  for (let i = 0; i < 4; i++) assert.ok(!step(t).some((x) => x.atk === 'Volatile'), 'running out is free');
});

// ---------- buffs and support on the virus ----------
test('Amplifier: each cycle it boosts the next attack of another part, in turn, and the boost is spent as it lands', () => {
  const s = fight('amplifier'), e = s.encounter, a = mech(s, 'amplifier');
  step(s);
  const t = livingParts(s).find((x) => x.amped === a.id);
  assert.ok(t && t !== a);
  t.attack.due = e.cycle + 1;
  const i = intents(s).find((x) => x.source === t.id);
  assert.ok(Math.abs(mechPower(s, t) - MECH.amplifier.mult) < 1e-9 && i.amount > 0);
  strikeWith(s, t, t.attack);
  assert.equal(t.amped, null);
  assert.match(partTip(s, e.virus, a), /boosts the next attack/);
});

test('Bodyguard: at the cycle\'s end it shields the part your command hit, and the shield takes your next command', () => {
  const s = fight('bodyguard'), b = mech(s, 'bodyguard'), p = pulse(s);
  Object.assign(p, { armor: 0, integrity: 1000, max: 1000 });
  step(s, 'spike pulse');
  assert.equal(p.bufBy, b.id); assert.equal(p.bufHp, Math.round(1000 * MECH.bodyguard.share));
  const hp = p.integrity;
  step(s, 'spike pulse');
  assert.equal(p.integrity, hp, 'the shield took the hit');
});

test('Vendetta: each other part you break makes the rest hit harder; breaking it first adds nothing', () => {
  const s = fight('vendetta'), e = s.encounter, p = pulse(s);
  Object.assign(p, { integrity: 1, armor: 0 });
  step(s, 'spike pulse');
  assert.equal(e.virus.vendetta, 1);
  const other = livingParts(s).find((x) => x.attack);
  assert.ok(Math.abs(mechPower(s, other) - (1 + MECH.vendetta.more)) < 1e-9);
  const t = fight('vendetta'), v = mech(t, 'vendetta');
  Object.assign(v, { integrity: 1, armor: 0 });
  step(t, `spike ${v.id}`);
  assert.ok(!t.encounter.virus.vendetta);
});

test('Thorns: your command hits on it leave you Corrupted, a stack a hit; burns and helpers don\'t', () => {
  const s = fight('thorns'), e = s.encounter, t = mech(s, 'thorns');
  t.armor = 0;
  step(s, `spike ${t.id}`);
  assert.equal(e.corrupt?.amount, Math.round(5000 * MECH.thorns.share));
  assert.equal(e.corrupt.left, MECH.thorns.cycles - 1, 'and it ticked once');
});

// ---------- timing and control ----------
test('Countdown: at its count of commands fired every part attacks at once; holds don\'t count', () => {
  const s = fight('countdown'), c = mech(s, 'countdown'), p = pulse(s);
  p.integrity = p.max = 1e6;
  for (let i = 0; i < MECH.countdown.at - 1; i++) step(s, 'spike pulse');
  assert.equal(c.count, MECH.countdown.at - 1);
  step(s); step(s);
  assert.equal(c.count, MECH.countdown.at - 1, 'holding stalls it');
  const ev = step(s, 'spike pulse');
  assert.ok(said(ev, /^COUNTDOWN\./));
  const by = new Set(ev.filter((x) => x.source && x.type !== 'phase').map((x) => x.source)); // a hit, an Encrypt, a spawn
  for (const x of livingParts(s).filter((y) => y.attack && y.kind !== 'fragment')) assert.ok(by.has(x.id), `${x.name} attacks`);
  assert.equal(c.count, 0);
});

test('Backtrace: each status you carry adds a stack each cycle; at its count it calls in a fragment', () => {
  const s = fight('backtrace'), e = s.encounter, b = mech(s, 'backtrace');
  e.exposedHit = true; e.leakUntil = 99;
  step(s); step(s);
  assert.equal(b.trace, 4);
  const ev = step(s);
  assert.ok(said(ev, /^BACKTRACE\./));
  assert.ok(livingParts(s).some((x) => x.kind === 'fragment'));
  assert.equal(b.trace, 0);
});

test('Swap: its Pass Throttles you, and your next command hit moves Throttled onto that part', () => {
  const s = fight('swap'), e = s.encounter, w = mech(s, 'swap');
  strikeWith(s, w, w.attack);
  assert.ok(e.throttledUntil >= e.cycle + 1);
  e.cycle++;
  const ev = step(s, 'spike pulse');
  assert.ok(said(ev, /^Swap: your Throttled moves onto the Pulse Node/));
  assert.ok(pulse(s).throttledUntil >= e.cycle - 1 && !(e.throttledUntil >= e.cycle));
});

test('Turncoat: below half your Signal its attack Scrambles you too', () => {
  const s = fight('turncoat'), e = s.encounter, t = mech(s, 'turncoat');
  strikeWith(s, t, t.attack);
  assert.ok(!(e.scrambleUntil > e.cycle), 'above half: a plain hit');
  defender(s).integrity = 2000;
  strikeWith(s, t, t.attack);
  assert.equal(e.scrambleUntil, e.cycle + MECH.turncoat.cycles);
});

// ---------- the playtest page ----------
test('every part has its playtest page, and a part that reads a status another part gives brings that part', () => {
  const parts = Object.entries(FAMILIES).flatMap(([f, x]) => x.parts.filter((p) => p.mech).map((p) => [f, p]));
  assert.equal(new Set(parts.map(([, p]) => p.gene)).size, 20);
  for (const [f, spec] of parts) {
    const s = fresh();
    s.metAll = true;
    command(s, `developer fight part:${spec.id}`);
    const v = s.encounter.virus;
    for (const g of partGenesFor(f, spec, spec.from)) assert.ok(v.parts.some((p) => p.gene === g || GENES[g].carried(p)), `${spec.id}: ${g}`);
  }
});
