// The mechanics list (docs/mechanics-list.md, dist/mechanics.mjs): twenty components built lean, then Parts 1's fifteen,
// one test each that its rule works, plus the playtest page bringing what a part feeds on. Balance waits for the designer's play.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, selectEncounter, part, livingParts, codexKey, strikeWith, intents, defender, hit, delayAttack, delayHeld, previewDamage, usable } from './dist/combat.mjs';
import { CONFIG, FAMILIES, STRAINS, BOSSES, createVirus, partGenesFor } from './dist/data.mjs';
import { partsOf } from './dist/codex.mjs';
import { bodyRefs } from './dist/routines.mjs';
import { GENES } from './dist/genes.mjs';
import * as FP from './dist/floorplan.mjs';
import { MECH, mechPower, youDebuffs, directHit, junkKey, mechTags, mechChips, mechTick } from './dist/mechanics.mjs';
import { partTip } from './dist/fightread.mjs';
import { statusSpans, boardMarkup } from './dist/view.mjs';
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
  Object.assign(p, { armor: 0, integrity: 10000, max: 10000 });
  step(s, 'spike pulse');
  assert.equal(p.bufBy, b.id); assert.equal(p.bufHp, Math.round(10000 * MECH.bodyguard.share));
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

// ---------- Parts 1 (docs/mechanics-list.md "Parts 1") ----------
// The rule, its tooltip and its mark on the board (its tags and chips: mechTags, mechChips), one test a part.
const tagsOf = (s, p) => mechTags(s, p).map((t) => t.text + t.dim + t.tail);
const chipsOf = (s, p) => mechChips(s, 4, intents(s)).filter((x) => x.source === p.id);
const chipOf = (s, p) => intents(s).find((i) => i.source === p.id && !i.tell);
const tipOf = (s, p) => partTip(s, s.encounter.virus, p);
const big = (p) => Object.assign(p, { armor: 0, integrity: 1e6, max: 1e6 });
const atHalf = (p) => Object.assign(p, { armor: 0, max: 1e6, integrity: 5e5 + 1 }); // one spike takes it across its 50% tick, and no further
const spikeOn = (s, p) => { const was = p.integrity; step(s, `spike ${p.id}`); return was - p.integrity; };

test('Overreacher: the cycle after its Lunge lands it takes 50% more, and a cut Lunge leaves no soft cycle', () => {
  const s = fight('overreacher'), e = s.encounter, o = big(mech(s, 'overreacher'));
  const plain = spikeOn(s, o);
  o.attack.due = e.cycle + 1;
  assert.deepEqual(chipsOf(s, o).map((x) => [x.col, x.cls, x.name, x.text]), [[2, 'soft', 'Soft', '+50%']], 'the column after its Lunge');
  step(s); step(s);
  assert.deepEqual(tagsOf(s, o), ['soft +50%']);
  assert.ok(chipsOf(s, o).some((x) => x.col === 0 && x.cls === 'soft'));
  const soft = spikeOn(s, o);
  assert.ok(soft >= Math.floor(plain * 1.5) - 1 && soft > plain, `${soft} is half again ${plain}`);
  assert.equal(spikeOn(s, o), plain, 'one cycle only');
  o.integrity = o.max / 2 + 1; o.attack.due = e.cycle;
  assert.ok(said(step(s, `spike ${o.id}`), /^INTERRUPTED\./));
  assert.deepEqual(tagsOf(s, o), [], 'cut: no soft cycle');
  assert.match(tipOf(s, o), /For 1 cycle after its Lunge lands, it takes 50% more damage\.\n▸ Cut the Lunge, or hit it the cycle after\.$/);
});

test('Live Wire: each command that hits it brings its Snap a cycle sooner, up to 3 a wind-up, never onto this cycle', () => {
  const s = fight('livewire'), e = s.encounter, w = big(mech(s, 'livewire'));
  w.attack.due = e.cycle + 9;
  const due = w.attack.due;
  assert.deepEqual(tagsOf(s, w), ['△△△ sooner']);
  hit(s, w, 5, { mine: true, dot: true });
  assert.equal(w.attack.due, due, 'a burn does not pull');
  step(s, `spike ${w.id}`);
  assert.equal(w.attack.due, due - 1);
  assert.deepEqual(tagsOf(s, w), ['▲△△ sooner']);
  assert.ok(chipsOf(s, w).length === 0 || chipsOf(s, w)[0].cls === 'ghost');
  for (let i = 0; i < 3; i++) step(s, `spike ${w.id}`);
  assert.equal(w.attack.due, due - 3, 'three at most');
  w.attack.due = e.cycle + 1; w.pulls = 0;
  step(s, `spike ${w.id}`);
  assert.equal(w.attack.due, e.cycle, 'not onto the cycle it was fired in');
  step(s);
  assert.deepEqual(tagsOf(s, w), ['△△△ sooner'], 'the count clears when the Snap lands');
  assert.match(tipOf(s, w), /Each command that hits it brings its next Snap 1 cycle sooner, up to 3\.\n▸ /);
});

test('Condenser: each attack from another part that lands stores a charge, and the third sets off its Discharge', () => {
  const s = fight('condenser'), e = s.encounter, c = mech(s, 'condenser'), p = pulse(s), enc = part(s, 'encryptor');
  const surge = lost(s, () => strikeWith(s, p, p.attack));
  strikeWith(s, enc, enc.attack);
  assert.equal(c.charge, 2, 'a Surge and an Encrypt');
  assert.deepEqual(tagsOf(s, c), ['●●○ charge']);
  p.attack.due = e.cycle + 2;
  assert.deepEqual(chipsOf(s, c).map((x) => [x.col, x.cls, x.name]), [[2, 'hotchip', 'Discharge']], 'under the attack that would fill it');
  const ev = [];
  const both = lost(s, () => { const n = s.logs.length; strikeWith(s, p, p.attack); ev.push(...s.logs.slice(n)); });
  assert.ok(said(ev, /^The Condenser is full\. It discharges\./) && ev.some((x) => x.type === 'server-hit' && x.atk === 'Discharge'));
  assert.ok(both > surge, `${both} > ${surge}`);
  assert.equal(c.charge, 0, 'and its own Discharge stores none');
  assert.match(tipOf(s, c), /Each attack that lands on you stores a charge\. At 3 it deals \d+ damage to you and empties\.\n▸ /);
});

test('Pacer: every 3 cycles every other attack repeats a cycle faster, up to 2; a command hit starts its count over', () => {
  const s = fight('pacer'), e = s.encounter, p = mech(s, 'pacer'), n = pulse(s), was = n.attack.interval;
  assert.deepEqual(tagsOf(s, p), ['●○○']);
  assert.deepEqual(chipsOf(s, p).map((x) => [x.col, x.cls, x.name, x.text]), [[2, 'hotchip', 'Step', 'all ▲1']]);
  step(s); step(s);
  assert.ok(said(step(s), /^STEP\./));
  assert.equal(n.attack.interval, was - 1);
  assert.deepEqual(tagsOf(s, p), ['tempo ▲1', '●○○']);
  step(s); // cycle 4
  step(s, `spike ${p.id}`); // cycle 5: the count starts over, so no step at the end of 6
  step(s);
  assert.equal(p.steps, 1);
  assert.ok(said(step(s), /^STEP\./), 'at the end of cycle 7');
  assert.equal(n.attack.interval, Math.max(2, was - 2));
  for (let i = 0; i < 4; i++) step(s);
  assert.equal(p.steps, 2, 'two at most');
  assert.deepEqual(tagsOf(s, p), ['tempo ▲2']);
  Object.assign(p, { integrity: 1, armor: 0 });
  step(s, `spike ${p.id}`);
  assert.equal(n.attack.interval, was, 'broken, the intervals return');
  assert.match(partTip(s, e.virus, p), /Every 3 cycles, every attack repeats 1 cycle faster, up to 2\. A command that hits the Pacer starts its count over\.\n▸ /);
});

test('Cutout: taking it across a tick pushes every attack back a cycle, and uses up no delay', () => {
  const s = fight('cutout'), e = s.encounter, k = mech(s, 'cutout'), p = pulse(s);
  assert.deepEqual(tagsOf(s, k), ['2 trips']);
  assert.equal(mechTick(k, k.ticks[0]), ' sw', 'its ticks draw amber');
  p.attack.due = e.cycle + 1;
  assert.equal(delayAttack(s, p, 1), 1);
  const due = p.attack.due;
  atHalf(k);
  command(s, `spike ${k.id}`);
  assert.deepEqual(chipsOf(s, k).map((x) => [x.col, x.cls, x.name, x.text]), [[0, 'trip', 'trip', '▸ all +1']], 'what the queued command would do');
  const ev = resolveCycle(s);
  assert.ok(said(ev, /^TRIPPED\./) && !ev.some((x) => x.type === 'tick-wasted'));
  assert.equal(p.attack.due, due + 1, 'pushed back a cycle');
  assert.deepEqual(tagsOf(s, k), ['1 trip']);
  assert.ok(delayHeld(p), 'its one delay is still its one delay');
  assert.match(tipOf(s, k), /Taking it across a tick pushes every attack back 1 cycle\. It has \d ticks?( left)?\.\n▸ Cross a tick when a big attack is due\.$/);
});

test('Magnet: its Pull deals its amount for each ◆ it wears, and each ◆ you strip from another part lands on it, up to 6', () => {
  const s = fight('magnet'), e = s.encounter, m = mech(s, 'magnet'), p = pulse(s);
  assert.equal(m.armor, 2); assert.equal(m.maxArmor, 6);
  m.attack.due = e.cycle + 1;
  assert.equal(chipOf(s, m).amount, m.attack.amount * 2);
  assert.match(tagsOf(s, m)[0], /^−\d+ a ◆$/);
  step(s); // the armor every part wears, seen
  const worn = p.armor;
  assert.ok(worn >= 1);
  step(s, `spike ${p.id}`);
  assert.equal(p.armor, worn - 1);
  assert.equal(m.armor, 3, 'the ◆ you stripped');
  m.attack.due = e.cycle + 1;
  assert.equal(chipOf(s, m).amount, m.attack.amount * 3, 'the live total');
  const three = lost(s, () => strikeWith(s, m, m.attack));
  m.armor = 6;
  assert.equal(lost(s, () => strikeWith(s, m, m.attack)), three * 2);
  p.armor = p.maxArmor = 3; step(s); step(s, `spike ${p.id}`);
  assert.equal(m.armor, 6, 'six at most');
  assert.match(tipOf(s, m), /Deals \d+ damage to you for each ◆ it wears, every 4 cycles, \d+ now\. Each ◆ you strip from another part lands on the Magnet, up to 6\.\n▸ /);
});

test('Dead Man\'s Hand: broken mid wind-up its Payout lands at once; the cycle after a Payout it breaks clean', () => {
  const s = fight('deadhand'), e = s.encounter, d = mech(s, 'deadhand');
  d.attack.due = e.cycle + 2;
  assert.match(tagsOf(s, d)[0], /^on break −\d+$/);
  Object.assign(d, { integrity: 1, armor: 0 });
  const ev = [], took = lost(s, () => ev.push(...step(s, `spike ${d.id}`)));
  assert.ok(said(ev, /breaks mid wind-up\. Its Payout lands at once\./));
  assert.ok(ev.some((x) => x.type === 'server-hit' && x.source === d.id && x.atk === 'Payout') && took > 0);
  const t = fight('deadhand'), h = mech(t, 'deadhand');
  h.attack.due = t.encounter.cycle;
  step(t); // its Payout lands
  assert.deepEqual(tagsOf(t, h), [], 'safe: no mark');
  Object.assign(h, { integrity: 1, armor: 0 });
  const quiet = step(t, `spike ${h.id}`);
  assert.ok(!said(quiet, /lands at once/) && !quiet.some((x) => x.type === 'server-hit' && x.source === h.id));
  assert.match(tipOf(s, pulse(s)), /^Pulse Node: /);
  assert.match(partTip(t, t.encounter.virus, h), /When it breaks, the Payout it is winding up lands at once, unless one landed this cycle or the last\.\n▸ Break it the cycle after its Payout lands\.$/);
});

test('Reservoir: its Flush is scaled by the Integrity it has left, on its chip and as it lands', () => {
  const s = fight('reservoir'), e = s.encounter, r = mech(s, 'reservoir');
  r.attack.due = e.cycle + 1;
  const full = chipOf(s, r).amount;
  assert.equal(full, r.attack.amount);
  const whole = lost(s, () => strikeWith(s, r, r.attack));
  r.integrity = r.max / 2;
  assert.equal(chipOf(s, r).amount, Math.round(full / 2), 'half at 50%');
  const half = lost(s, () => strikeWith(s, r, r.attack));
  assert.ok(Math.abs(half - whole / 2) <= 1, `${half} is half of ${whole}`);
  assert.match(tipOf(s, r), new RegExp(`Deals up to ${full} damage to you every 4 cycles, less by the share of Integrity it has lost, ${Math.round(full / 2)} now\\.\n▸ Damage it before each Flush\\.$`));
});

test('Flyback: the cycle after an attack lands on you it repeats it at half, once', () => {
  const s = fight('flyback'), e = s.encounter, f = mech(s, 'flyback'), p = pulse(s);
  p.attack.due = e.cycle + 1;
  const n = chipOf(s, p).amount;
  assert.deepEqual(chipsOf(s, f).map((x) => [x.col, x.cls, x.name, x.text]), [[2, 'cond', 'Surge', `−${Math.round(n / 2)}`]], 'one column after the Surge, at half its number');
  step(s);
  p.attack.interval = 99;
  const first = lost(s, () => step(s));
  assert.ok(first > 0);
  assert.deepEqual(chipsOf(s, f).map((x) => [x.col, x.cls, x.name]), [[0, 'cond', 'Surge']]);
  const ev = [], again = lost(s, () => ev.push(...step(s)));
  assert.ok(said(ev, /^The Flyback repeats Surge at half\./));
  assert.ok(Math.abs(again - first / 2) <= 1, `${again} is half of ${first}`);
  assert.equal(lost(s, () => step(s)), 0, 'its own repeat is not repeated');
  assert.match(tipOf(s, f), /The cycle after an attack lands on you, the Flyback repeats it at half\.\n▸ Cut the attack it would repeat, or break the Flyback\.$/);
});

test('Shutter: shut for 2 cycles its ◆ hold against every strip, then open for 2 it wears none', () => {
  const s = fight('shutter'), e = s.encounter, sh = mech(s, 'shutter');
  sh.integrity = sh.max = 1e6;
  assert.equal(sh.armor, 3);
  assert.deepEqual(chipsOf(s, sh).map((x) => `${x.cls} ${x.name} ${x.text}`), ['steelchip Shut ◆◆◆', 'steelchip Shut ◆◆◆', 'soft Open 0 ◆', 'soft Open 0 ◆']);
  const hp = sh.integrity;
  assert.ok(said(step(s, `spike ${sh.id}`), /It is shut, and its ◆ hold\./));
  assert.equal(sh.armor, 3, 'a hit is absorbed and breaks none');
  assert.equal(sh.integrity, hp);
  assert.ok(hit(s, sh, 5, { mine: true, pierce: true, by: 'a piercing hit' }).dealt > 0, 'through armor still lands');
  step(s);
  assert.equal(e.cycle, 3); assert.equal(sh.armor, 0, 'open');
  assert.ok(spikeOn(s, sh) > 0);
  step(s);
  assert.equal(e.cycle, 5); assert.equal(sh.armor, 3, 'shut again');
  assert.match(tipOf(s, sh), /Its armor shuts for 2 cycles, then opens for 2, in turn\. Shut, its ◆ cannot be stripped\.\n▸ Save your big hits for the cycles it is open\.$/);
});

test('Cistern: an attack you cut is held at its size, and every 6 cycles it Drains all it holds', () => {
  const s = fight('cistern'), e = s.encounter, c = mech(s, 'cistern'), p = pulse(s);
  e.virus.tells = null; // no cast lands across the twelve cycles this runs
  assert.deepEqual(tagsOf(s, c), ['●○○○○○']);
  atHalf(p);
  p.attack.due = e.cycle;
  const size = chipOf(s, p).amount;
  assert.ok(said(step(s, `spike ${p.id}`), /^INTERRUPTED\./));
  p.attack.due = 999;
  assert.equal(c.pool, size);
  assert.deepEqual(tagsOf(s, c), [`holds ${size}`, '●●○○○○']);
  step(s); step(s);
  assert.deepEqual(chipsOf(s, c).map((x) => [x.col, x.cls, x.name, x.text]), [[2, 'hotchip', 'Drain', `−${size}`]], 'in the column it is due');
  step(s); step(s);
  assert.equal(e.cycle, 6);
  const ev = [], took = lost(s, () => ev.push(...step(s)));
  assert.ok(ev.some((x) => x.type === 'server-hit' && x.atk === 'Drain') && took > 0);
  assert.equal(c.pool, 0);
  for (let i = 0; i < 6; i++) assert.equal(lost(s, () => step(s)), 0, 'nothing held, nothing happens');
  assert.match(tipOf(s, c), /Each attack you cut is held in the Cistern\. Every 6 cycles it deals all it holds to you, and empties\.\n▸ /);
});

test('Welder: its Weld puts 1 ◆ back on the other part that wears the least, never past its max, and a ◆ on you stops it whole', () => {
  const s = fight('welder'), e = s.encounter, w = mech(s, 'welder'), p = pulse(s);
  w.attack.due = e.cycle + 1;
  const chip = chipOf(s, w);
  assert.equal(chip.cls, 'steelchip'); assert.equal(chip.tail, ' · +1 ◆');
  const max = p.maxArmor;
  p.armor = 0;
  e.chits = 1;
  strikeWith(s, w, w.attack);
  assert.equal(p.armor, 0, 'your ◆ took the Weld');
  const n = s.logs.length;
  assert.ok(lost(s, () => strikeWith(s, w, w.attack)) > 0);
  assert.equal(p.armor, 1);
  assert.ok(said(s.logs.slice(n), /^Weld puts 1 ◆ back on the Pulse Node/));
  for (let i = 0; i < 6; i++) strikeWith(s, w, w.attack);
  for (const x of livingParts(s)) assert.ok(x.armor <= x.maxArmor, x.name);
  assert.equal(p.armor, max);
  assert.match(tipOf(s, w), /Deals \d+ damage to you every 4 cycles, and puts 1 ◆ back on the part that wears the least\.\n▸ Cut the Weld, or break the Welder before you strip\.$/);
});

test('Matcher: the same key two cycles running sets it off; a hold between them does not', () => {
  const s = fight('matcher'), e = s.encounter, m = mech(s, 'matcher'), p = big(pulse(s));
  assert.deepEqual(tagsOf(s, m), []);
  assert.equal(lost(s, () => step(s, `spike ${p.id}`)), 0);
  assert.match(tagsOf(s, m)[0], /^last key: \w/);
  const [chip] = chipsOf(s, m);
  assert.deepEqual([chip.col, chip.cls], [0, 'cond']); assert.match(chip.text, /^▸ −\d+$/);
  assert.equal(tagsOf(s, m)[0], `last key: ${chip.name}`, 'the key that would set it off');
  const ev = [], took = lost(s, () => ev.push(...step(s, `spike ${p.id}`)));
  assert.ok(said(ev, /two cycles running/) && ev.some((x) => x.type === 'server-hit' && x.atk === 'Match') && took > 0);
  step(s); // a hold never counts
  assert.deepEqual(chipsOf(s, m), []);
  assert.equal(lost(s, () => step(s, `spike ${p.id}`)), 0);
  assert.match(tipOf(s, m), /^Matcher: Has no timed attack\. When you fire the same key two cycles running, it deals \d+ damage to you at once\.\n▸ Change keys every cycle while it stands\.$/);
});

test('Splitter: taken under 50% it splits into two parts, each with half the Integrity left and half its Rend, on alternate cycles', () => {
  const s = fight('splitter'), e = s.encounter, sp = mech(s, 'splitter');
  assert.deepEqual(tagsOf(s, sp), ['splits at 50%']);
  assert.equal(mechTick(sp, sp.ticks[0]), ' split', 'its 50% tick draws red');
  assert.match(tipOf(s, sp), /Taken under 50%, it splits into two parts that each deal \d+, on alternate cycles\.\n▸ Split it when two small hits suit you better\.$/);
  atHalf(sp);
  sp.attack.due = e.cycle + 3;
  const rend = sp.attack.amount;
  command(s, `spike ${sp.id}`);
  assert.deepEqual(chipsOf(s, sp).map((x) => [x.col, x.cls, x.name]), [[0, 'trip', 'split']]);
  const was = sp.integrity, dmg = previewDamage(s, 'spike', sp);
  const ev = resolveCycle(s);
  assert.ok(said(ev, /^The Splitter SPLITS under 50%/) && !ev.some((x) => x.type === 'tick-wasted'), 'its 50% tick is the split, not a wasted one');
  const two = part(s, 'splitter2');
  assert.equal(two.name, 'Splitter 2');
  for (const x of [sp, two]) { assert.equal(x.integrity, Math.ceil((was - dmg) / 2)); assert.equal(x.max, 5e5, 'half the max, so its bar stands where it stood'); assert.equal(x.attack.amount, Math.round(rend / 2)); assert.deepEqual(x.ticks.map((k) => k.spent), [true, false], 'the 25% tick is left'); }
  assert.equal(two.attack.due - sp.attack.due, 2, 'the second between the first\'s');
  assert.deepEqual(tagsOf(s, sp), []);
  assert.equal(mechTick(sp, sp.ticks[0]), '');
  assert.match(tipOf(s, two), /^Splitter 2: Deals \d+ damage to you every 4 cycles\./);
  step(s, `spike ${two.id}`);
  assert.equal(e.virus.parts.filter((x) => x.mech === 'splitter').length, 2, 'a half never splits again');
});

test('Auditor: its Audit deals more for each of your keys on cooldown as it lands, five at most', () => {
  const s = fight('auditor', { level: 26 }), e = s.encounter, a = mech(s, 'auditor'), base = a.attack.amount, per = Math.round(base * MECH.auditor.per);
  a.attack.due = e.cycle + 1;
  assert.equal(chipOf(s, a).amount, base);
  assert.deepEqual(tagsOf(s, a), []);
  const none = lost(s, () => strikeWith(s, a, a.attack));
  const keys = usable(s).filter((id) => id !== 'hold');
  assert.ok(keys.length >= 3, keys.join(' '));
  for (const id of keys.slice(0, 2)) e.readyAt[id] = e.cycle + 9;
  assert.deepEqual(tagsOf(s, a), ['2 keys cooling']);
  assert.equal(chipOf(s, a).amount, base + 2 * per, 'the live total');
  assert.ok(lost(s, () => strikeWith(s, a, a.attack)) > none);
  for (const id of keys) e.readyAt[id] = e.cycle + 9;
  assert.equal(chipOf(s, a).amount, base + Math.min(MECH.auditor.max, keys.length) * per);
  assert.match(tipOf(s, a), /Deals \d+ damage to you every 5 cycles, and \d+ more for each of your keys on cooldown when it lands, \d+ now\.\n▸ Fire your long cooldowns just after its Audit lands\.$/);
});

test('Parts 1 on the board: each part\'s tags and chips are drawn in its row, a Welder\'s Weld in steel', () => {
  const row = (html, id) => html.split('<button type="button"').find((x) => x.includes(`data-target="${id}"`)) || '';
  { const s = fight('shutter'), sh = mech(s, 'shutter'); sh.attack.due = s.encounter.cycle + 1;
    const r = row(boardMarkup(s, null), sh.id);
    assert.equal(r.split('class="intent steelchip"').length - 1, 2); assert.equal(r.split('class="intent soft"').length - 1, 2);
    assert.ok(r.indexOf('intent steelchip') < r.indexOf('>Slam<'), 'its armor, then its Slam'); }
  { const s = fight('condenser'), c = mech(s, 'condenser'); c.charge = 2; pulse(s).attack.due = s.encounter.cycle + 1;
    const r = row(boardMarkup(s, null), c.id);
    assert.match(r, /<span class="tag mtag" title="[^"]*">●●<i>○<\/i> charge<\/span>/);
    assert.match(r, /class="intent hotchip"[^>]*><span class="ico"[^>]*><\/span><b>Discharge<\/b><small>−\d+<\/small>/); }
  { const s = fight('welder'), w = mech(s, 'welder'); w.attack.due = s.encounter.cycle + 1;
    assert.match(row(boardMarkup(s, null), w.id), /class="intent next steelchip"[^]*<small>−\d+ · \+1 ◆<\/small>/); }
  { const s = fight('cutout'), k = mech(s, 'cutout');
    assert.equal(row(boardMarkup(s, null), k.id).split('class="ptick sw"').length - 1, 2); }
  { const s = fight('auditor', { level: 26 }), a = mech(s, 'auditor'); s.encounter.readyAt[usable(s)[1]] = 99;
    assert.match(row(boardMarkup(s, null), a.id), /<span class="tag hot mtag" title="[^"]*">1 key cooling<\/span>/); }
});

test('Parts 1 roll nowhere: no wild virus, strain or boss carries one, and the Codex and a program\'s mastery leave them out', () => {
  const ids = ['overreacher', 'livewire', 'condenser', 'pacer', 'cutout', 'magnet', 'deadhand', 'reservoir', 'flyback', 'shutter', 'cistern', 'welder', 'matcher', 'splitter', 'auditor'];
  for (const id of ids) assert.ok(GENES[id] && Object.values(GENES[id].parts).every((x) => x.mech === id && x.unlisted && x.from >= 10), id);
  const carries = (v) => v.parts.some((p) => ids.includes(p.mech));
  for (let seed = 1; seed <= 1500; seed++) for (const run of [true, false]) assert.ok(!carries(createVirus('random', seed, { threat: 19 + (seed % 41), run, grade: 1 + (seed % 3), elite: seed % 7 === 0 })), `seed ${seed}`);
  for (const k of Object.keys(STRAINS)) assert.ok(!carries(createVirus(k, 5, { threat: 40 })), k);
  for (const [k, b] of Object.entries(BOSSES)) if (FAMILIES[b.family]) assert.ok(!carries(createVirus('random', 5, { threat: 40, family: b.family, boss: k })), k);
  for (const f of ['ransomware', 'worm', 'ghostroot']) {
    assert.ok(!partsOf(fresh(), 'family', f).some((x) => ids.includes(x.spec.mech)), `${f}: not in the Codex`);
    assert.ok(!bodyRefs(f).some((ref) => ids.includes(ref.split(':')[1])), `${f}: not in its mastery count`);
  }
});

// ---------- the playtest page ----------
test('every part has its playtest page, and a part that reads a status another part gives brings that part', () => {
  const parts = Object.entries(FAMILIES).flatMap(([f, x]) => x.parts.filter((p) => p.mech).map((p) => [f, p]));
  assert.equal(new Set(parts.map(([, p]) => p.gene)).size, 35); // the twenty, and Parts 1's fifteen
  for (const [f, spec] of parts) {
    const s = fresh();
    s.metAll = true;
    command(s, `developer fight part:${spec.id}`);
    const v = s.encounter.virus;
    for (const g of partGenesFor(f, spec, spec.from)) assert.ok(v.parts.some((p) => p.gene === g || GENES[g].carried(p)), `${spec.id}: ${g}`);
  }
});
