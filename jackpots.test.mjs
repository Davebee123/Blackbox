// Jackpots and head starts (docs/jackpots.md): two rarer unique tiers, their stats, card, effects and drops.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fresh, command, selectEncounter, resolveCycle, part, addItem, loaded, UNIQUES, gearStat, damageMultiplier, hitCritChance, cooldownOf, maxSignal, heal, hackerOf, usable, jackpotOdds, jackpotRoll, tierPair, floorUniques, uniqueFrom, guardedUnique, bossUniques, strainTrophies, WORLD_SOURCES } from './dist/combat.mjs';
import { uniqueItem, seeded, BASES, STATS, goodYellow, statScore, rarityName, JACKPOT, floorToYellow } from './dist/gear.mjs';
import { CONFIG } from './dist/data.mjs';
import { fxText, fxList } from './dist/content.mjs';
import { homes } from './dist/collection.mjs';

CONFIG.baseCrit = 0; CONFIG.enemyCrit = 0; CONFIG.misses = false;
CONFIG.gearReq = 99; // gear of any level (the requirement has its own test in gear.test.mjs)

const SPEC = {
  headstart: [['2600-hz', 'exploit', 4, 1], ['blue-box', 'script', 6, 1], ['acoustic-coupler', 'proxy', 10, 2], ['war-dialer', 'script', 12, 2],
    ['handshake', 'shell', 16, 3], ['red-box', 'exploit', 18, 3], ['issue-49', 'implant', 22, 4], ['sneakernet', 'proxy', 24, 4]],
  jackpot: [['creeper', 'exploit', 8, 1, 1971], ['elk-cloner', 'shell', 8, 1, 1982], ['morris-worm', 'script', 14, 2, 1988], ['michelangelo', 'proxy', 14, 2, 1991],
    ['melissa', 'implant', 20, 3, 1999], ['iloveyou', 'script', 20, 3, 2000], ['code-red', 'exploit', 26, 4, 2001], ['blaster', 'implant', 26, 4, 2003],
    ['mydoom', 'script', 32, 5, 2004], ['storm-worm', 'shell', 32, 5, 2007], ['conficker', 'proxy', 38, 6, 2008], ['stuxnet', 'implant', 38, 6, 2010],
    ['heartbleed', 'exploit', 44, 7, 2014], ['mirai', 'script', 44, 7, 2016], ['eternalblue', 'exploit', 50, 8, 2017], ['bluekeep', 'shell', 50, 8, 2019]],
};
const as = (cls = 'breaker', L = 50) => { const s = fresh(); s.loadout.archetype = cls; hackerOf(s).level = L; return s; };
const wear = (s, id, level) => { const it = addItem(s, uniqueItem(UNIQUES[id], level || UNIQUES[id].level, seeded(1))); command(s, 'load ' + it.id); assert.ok(loaded(s).some((x) => x.id === it.id), `${id} loaded`); return it; };
// A fight with both parts bare and quiet, room on your bar.
const fight = (s) => {
  selectEncounter(s, 'cryptjack', 7, { level: 30, mutation: null }); command(s, 'engage');
  s.server.integrity = s.server.max = 99999;
  for (const p of s.encounter.virus.parts) { p.armor = p.maxArmor = 0; p.integrity = p.max = 5000; if (p.attack) p.attack.due = 999; }
  s.encounter.synced = false;
  return s;
};
const dm = (s, id) => damageMultiplier(s, part(s, id), { mine: true });
const near = (a, b, tol = 0.01) => Math.abs(a / b - 1) < tol;
const go = (s, cmd = 'hold') => { command(s, cmd); resolveCycle(s); };
// What the pulse's attacks did to you over a cycle (the virus's cast aside).
const took = (s, cmd = 'hold') => { const n = s.logs.length; go(s, cmd); return s.logs.slice(n).filter((x) => x.type === 'server-hit' && x.source === 'pulse').reduce((t, x) => t + x.amount, 0); };
// The pulse lands every cycle from now (a plain damage attack, never a tell).
const pulseNow = (s) => { const p = part(s, 'pulse'); p.attack.due = s.encounter.cycle; p.attack.interval = 1; return p; };

test('the 24 exist with the spec\'s slot, level, tier and floor; a jackpot\'s flavour ends with its year', () => {
  for (const [tier, rows] of Object.entries(SPEC)) for (const [id, slot, level, floor, year] of rows) {
    const u = UNIQUES[id];
    assert.ok(u, id);
    assert.equal(BASES[u.base].slot, slot, `${id} slot`);
    assert.equal(u.level, level, `${id} level`);
    assert.equal(u.tier, tier, `${id} tier`);
    assert.equal(u.floor, floor, `${id} floor`);
    if (year) assert.ok(u.flavour.endsWith(` (${year})`), `${id} year`);
    assert.ok(fxText(fxList(u)).length > 10, `${id} has its line`);
  }
  assert.equal(Object.values(UNIQUES).filter((u) => u.tier).length, 24);
  for (let f = 1; f <= 8; f++) assert.equal(tierPair('jackpot', f).length, 2, `floor ${f}'s Hall of Fame pair`);
  for (let f = 1; f <= 4; f++) assert.equal(tierPair('headstart', f).length, 2, `floor ${f}'s head starts`);
});

test('stats: a head start at 1.5 good yellows, a jackpot at 1.3, at its level and higher; safe to run twice; the card says Hall of Fame', () => {
  for (const u of Object.values(UNIQUES).filter((x) => x.tier)) for (const L of [u.level, u.level + 5, 50]) {
    const it = uniqueItem(u, L, seeded(L)), k = u.tier === 'jackpot' ? 1.3 : 1.5, want = goodYellow(it.level, BASES[it.base].slot) * k;
    assert.ok(near(statScore(it.stats), want, 0.02), `${u.name} at ${L}: ${statScore(it.stats).toFixed(2)} against ${want.toFixed(2)}`);
    const once = { ...it.stats };
    floorToYellow(it);
    assert.deepEqual(it.stats, once, `${u.name}: again changes nothing`);
    assert.equal(rarityName(it), u.tier === 'jackpot' ? 'Hall of Fame' : rarityName(uniqueItem(UNIQUES['dead-pool'], 8, seeded(1))), `${u.name}'s kind line`);
  }
  // Never under its own level.
  assert.equal(uniqueItem(UNIQUES.mirai, 10, seeded(1)).level, 44);
});

test('head starts: 2600 Hz, Blue Box, Acoustic Coupler, War Dialer, Handshake, Red Box, Issue 49, Sneakernet', () => {
  let s = as(); wear(s, '2600-hz', 30); fight(s);
  const first = dm(s, 'pulse'); go(s, 'spike pulse');
  assert.ok(near(first / dm(s, 'pulse'), 1.1), '2600 Hz: the first hit deals 10% more');

  s = as(); wear(s, 'blue-box', 30); fight(s);
  const cd = cooldownOf(s, 'overload'), at = s.encounter.cycle; go(s, 'overload pulse');
  assert.equal(s.encounter.readyAt.overload - at, cd - 1, 'Blue Box: the first skill a cycle sooner');
  while (s.encounter.readyAt.overload > s.encounter.cycle) go(s);
  const at2 = s.encounter.cycle; go(s, 'overload pulse');
  assert.equal(s.encounter.readyAt.overload - at2, cd, 'and only the first');

  s = as(); const ac = wear(s, 'acoustic-coupler', 10);
  const plain = loaded(s).reduce((n, it) => n + (it.stats.regen || 0), 0);
  assert.ok(gearStat(s, 'regen') - plain >= 1, 'Acoustic Coupler: Regen on top');
  assert.ok(ac.stats.signal > 0);

  s = as(); wear(s, 'war-dialer', 30); fight(s);
  const w0 = dm(s, 'pulse'); go(s, 'spike pulse');
  assert.ok(near(dm(s, 'pulse') / w0, 1.02), 'War Dialer: one part, 2%');
  go(s, 'spike encryptor');
  assert.ok(near(dm(s, 'pulse') / w0, 1.04), 'two parts, 4%');
  s.encounter.fxs.dialed = { a: 1, b: 1, c: 1, d: 1, e: 1 };
  assert.ok(near(dm(s, 'pulse') / w0, 1.06), 'up to 6%');

  s = as(); wear(s, 'handshake', 16);
  const clk = loaded(s).reduce((n, it) => n + (it.stats.clock || 0), 0);
  assert.equal(gearStat(s, 'clock'), clk + 3, 'Handshake: 3% Clock Speed');

  s = as(); wear(s, 'red-box', 30); fight(s);
  const r0 = dm(s, 'pulse');
  for (let i = 0; i < 3; i++) go(s, 'spike pulse');
  assert.ok(near(dm(s, 'pulse') / r0, 1.2), 'Red Box: the 4th hit, 20% more');
  go(s, 'spike pulse');
  assert.ok(near(dm(s, 'pulse') / r0, 1), 'then plain again');

  const i49 = fxList(UNIQUES['issue-49'])[0];
  assert.deepEqual([i49.when, i49.if, i49.do, i49.value], ['hit', 'target-telling', 'crit%', 10], 'Issue 49: 10% crit on a part winding up a tell');

  s = as(); wear(s, 'sneakernet', 24); fight(s);
  const early = gearStat(s, 'evasion', 'hacker');
  s.encounter.cycle = 4;
  assert.equal(early - gearStat(s, 'evasion', 'hacker'), 5, 'Sneakernet: 5% Evasion in the first 3 cycles');
});

test('Hall of Fame, floors 1-4: Creeper, Elk Cloner, Morris Worm, Michelangelo, Melissa, ILOVEYOU, Code Red, Blaster', () => {
  let s = as(); wear(s, 'creeper', 30); fight(s);
  go(s, 'spike pulse');
  const lost = 5000 - part(s, 'pulse').integrity, splash = 5000 - part(s, 'encryptor').integrity;
  assert.ok(lost > 0 && Math.abs(splash - lost * 0.25) <= 1, `Creeper: another part takes 25% (${lost}, ${splash})`);

  s = as(); wear(s, 'elk-cloner', 30); fight(s);
  const hits = [];
  for (let i = 0; i < 5; i++) { const hp = part(s, 'pulse').integrity; go(s, 'spike pulse'); hits.push(hp - part(s, 'pulse').integrity); }
  assert.ok(hits[4] > hits[3] * 1.8 && hits[3] < hits[0] * 1.2, `Elk Cloner: the 5th skill hits twice (${hits})`);

  s = as(); wear(s, 'morris-worm', 30); fight(s);
  const m0 = dm(s, 'pulse'); go(s, 'spike pulse'); go(s, 'spike pulse');
  assert.ok(near(dm(s, 'pulse') / m0, 1.04), 'Morris Worm: 2% more a hit');
  assert.ok(near(dm(s, 'encryptor') / m0, 1), 'on that part only');

  s = as(); wear(s, 'michelangelo', 30); fight(s);
  s.encounter.cycle = 5; const plain = dm(s, 'pulse');
  pulseNow(s); const five = took(s);
  assert.equal(s.encounter.cycle, 6);
  assert.ok(near(dm(s, 'pulse') / plain, 2), 'Michelangelo: double on the 6th cycle');
  const six = took(s);
  assert.ok(Math.abs(six - five / 2) <= 1, `attacks on you half (${five}, ${six})`);

  s = as('infiltrator'); wear(s, 'melissa', 30); fight(s);
  go(s, 'inject pulse');
  const burn = s.encounter.burns.find((b) => b.target === 'pulse');
  const t = as('infiltrator'); fight(t); go(t, 'inject pulse');
  assert.equal(burn.left, t.encounter.burns.find((b) => b.target === 'pulse').left * 2, 'Melissa: a burn twice as long');
  go(s, 'tag encryptor'); go(t, 'tag encryptor');
  assert.equal(part(s, 'encryptor').taggedUntil - s.encounter.cycle + 1, (part(t, 'encryptor').taggedUntil - t.encounter.cycle + 1) * 2, 'a Tag twice as long');
  const o = as('operator'); wear(o, 'melissa', 30); fight(o); go(o, 'deploy pulse');
  const p = as('operator'); fight(p); go(p, 'deploy pulse');
  assert.equal(o.encounter.helpers[0].left, p.encounter.helpers[0].left * 2 + 1, 'a helper twice as long (it has ticked once)');

  s = as(); wear(s, 'iloveyou', 30); fight(s);
  pulseNow(s);
  assert.ok(took(s) > 0, 'the first attack lands on you');
  const enc = part(s, 'encryptor').integrity;
  assert.equal(took(s), 0, 'ILOVEYOU: then the turned part attacks the virus');
  assert.ok(part(s, 'encryptor').integrity < enc, 'its other part takes it');
  took(s); took(s);
  assert.ok(took(s) > 0, 'for 3 cycles');

  s = as(); wear(s, 'code-red', 30); fight(s);
  CONFIG.baseCrit = 5;
  try { assert.ok(hitCritChance(s, part(s, 'pulse'), { mine: true }) >= 10); assert.equal(hitCritChance(s, part(s, 'pulse'), { mine: true }), 2 * (() => { const t = fight(as()); return hitCritChance(t, part(t, 'pulse'), { mine: true }); })(), 'Code Red: double the crit chance'); }
  finally { CONFIG.baseCrit = 0; }

  s = as(); wear(s, 'blaster', 30);
  const cap = STATS.clock.cap;
  STATS.clock.cap = 10;
  try { assert.equal(gearStat(s, 'clock'), 15, 'Blaster: 15% Clock Speed, past the cap by 15'); }
  finally { STATS.clock.cap = cap; }
  assert.match(fxText(fxList(UNIQUES.blaster)), /from 25% to 40%/);
});

test('Hall of Fame, floors 5-8: Mydoom, Storm Worm, Conficker, Stuxnet, Heartbleed, Mirai, EternalBlue, BlueKeep', () => {
  let s = as(); wear(s, 'mydoom', 50); fight(s);
  let at = s.encounter.cycle; go(s, 'overload pulse');
  assert.equal(s.encounter.readyAt.overload - at, cooldownOf(s, 'overload') - 1, 'Mydoom: a cycle off');

  s = as(); wear(s, 'storm-worm', 50); fight(s);
  pulseNow(s);
  const got = [];
  for (let i = 0; i < 5; i++) { const enc = part(s, 'encryptor').integrity; got.push([took(s), enc - part(s, 'encryptor').integrity]); }
  assert.ok(got.slice(0, 4).every(([you, it]) => you > 0 && it === 0) && got[4][0] === 0 && got[4][1] > 0, `Storm Worm: the 5th attack lands on a part (${JSON.stringify(got)})`);

  s = as(); wear(s, 'conficker', 50); fight(s);
  const pulse = part(s, 'pulse'); pulse.maxArmor = 2; pulse.patchAt = s.encounter.cycle + 1;
  go(s, 'spike pulse');
  go(s);
  assert.equal(pulse.armor, 0, "Conficker: no ◆ back for 2 cycles");
  go(s); go(s);
  assert.equal(pulse.armor, 1, 'then it patches');

  s = as(); wear(s, 'stuxnet', 50); fight(s);
  pulseNow(s); const before = took(s), after = took(s, 'spike pulse');
  assert.ok(Math.abs(after - before * 0.85) <= 1, `Stuxnet: 15% less after your hit (${before}, ${after})`);

  s = as(); wear(s, 'heartbleed', 50); fight(s);
  s.server.integrity = 50000; go(s, 'spike pulse');
  assert.ok(s.server.integrity >= 50000 + 50, 'Heartbleed: 1% of the part\'s max heals you');

  s = as(); wear(s, 'mirai', 50); fight(s);
  const pl = part(s, 'pulse'); pl.integrity = 1;
  go(s, 'spike pulse');
  assert.equal(pl.integrity, 0);
  const e0 = part(s, 'encryptor').integrity; go(s); go(s); go(s);
  const e3 = part(s, 'encryptor').integrity; go(s);
  assert.ok(e0 > e3 && part(s, 'encryptor').integrity === e3, 'Mirai: the broken part fights for 3 cycles');

  s = as(); wear(s, 'eternalblue', 50); fight(s);
  const eb = part(s, 'pulse'); eb.armor = eb.maxArmor = 3;
  CONFIG.baseCrit = 100;
  try { go(s, 'spike pulse'); } finally { CONFIG.baseCrit = 0; }
  assert.equal(eb.armor, 3, 'EternalBlue: a crit goes through ◆');
  const dealt = 5000 - eb.integrity, spread = 5000 - part(s, 'encryptor').integrity;
  assert.ok(dealt > 0 && Math.abs(spread - dealt * 0.5) <= 1, `and spreads at 50% (${dealt}, ${spread})`);

  s = as('bastion'); const plainMax = maxSignal(s); wear(s, 'bluekeep', 50);
  assert.ok(near(maxSignal(s), (plainMax + loaded(s).find((x) => x.unique === 'bluekeep').stats.signal) * 1.2, 0.02), 'BlueKeep: 20% more max Integrity');
  fight(s); s.server.integrity = 1000; heal(s, 100, 'test');
  assert.equal(s.server.integrity, 1120, 'BlueKeep: heals 20% larger');
  go(s, 'firewall');
  const u = as('bastion'); fight(u); go(u, 'firewall');
  assert.ok(near(s.encounter.shield, u.encounter.shield * 1.2, 0.05), `shields 20% larger (${s.encounter.shield}, ${u.encounter.shield})`);
});

test('drops: a head start on its floor and the next, a Hall of Fame on its floor and deeper, at the mob\'s level or its own', () => {
  for (let f = 1; f <= 8; f++) {
    const odds = jackpotOdds(f);
    for (const x of odds.filter((o) => o.tier === 'headstart')) assert.ok(x.floor === f || x.floor === f - 1, `a head start of floor ${x.floor} on floor ${f}`);
    for (const x of odds.filter((o) => o.tier === 'jackpot')) assert.ok(x.floor <= f, `a jackpot of floor ${x.floor} on floor ${f}`);
    assert.equal(odds.filter((o) => o.tier === 'jackpot').length, f, 'every floor down to this one');
  }
  const [hs] = jackpotOdds(1), j = jackpotOdds(3).filter((o) => o.tier === 'jackpot');
  assert.ok(near(hs.odds, 1 / 1500));
  assert.ok(near(jackpotOdds(1, { elite: true })[0].odds, 5 / 1500), 'elites ×5');
  assert.ok(near(j.find((o) => o.floor === 3).odds, 1 / 40000));
  assert.ok(near(j.find((o) => o.floor === 1).odds, 1 / 400000), 'a tenth past its own floor');
  assert.ok(near(jackpotOdds(3, { elite: true }).find((o) => o.tier === 'jackpot' && o.floor === 3).odds, 10 / 40000), 'elites ×10');
  assert.ok(near(jackpotOdds(3, { boss: true }).find((o) => o.tier === 'jackpot' && o.floor === 3).odds, 50 / 40000), 'bosses ×50');
  // What drops, with the odds turned up: never off its floors, at the mob's level or its own.
  const was = structuredClone(JACKPOT);
  JACKPOT.headstart.odds = 0.2; JACKPOT.jackpot.odds = 0.2;
  try {
    const s = fresh();
    for (let f = 1; f <= 8; f++) for (let i = 0; i < 200; i++) {
      const it = jackpotRoll(s, f, 3 + f * 5);
      if (!it) continue;
      const u = UNIQUES[it.unique];
      assert.ok(u.tier === 'headstart' ? u.floor === f || u.floor === f - 1 : u.floor <= f, `${u.name} on floor ${f}`);
      assert.equal(it.level, Math.max(u.level, 3 + f * 5));
    }
    JACKPOT.on = false;
    assert.equal(jackpotRoll(s, 3, 20), null, 'off: nothing');
  } finally { Object.assign(JACKPOT, was); }
  // The odds, roughly (its own dice, from a fixed seed): one in 1,500 trash kills on floor 1 is a head start.
  const s = fresh(); s.rng = 12345;
  let n = 0;
  for (let i = 0; i < 300000; i++) if (jackpotRoll(s, 1, 4)) n++;
  assert.ok(n > 150 && n < 260, `${n} in 300,000 (about 200)`);
});

test('ordinary pools never hold them; the sims never roll them; the Ledger lists them on their floor', () => {
  const tiered = (xs) => xs.filter((u) => u?.tier).map((u) => u.id);
  const s = fresh();
  for (let f = 1; f <= 8; f++) {
    for (const kind of ['lair', 'rare', 'thread', 'puzzle', 'vault']) assert.deepEqual(tiered(floorUniques(kind, f, 60)), [], `${kind} on floor ${f}`);
    for (let i = 0; i < 50; i++) assert.ok(!guardedUnique(s, f, 60)?.tier, `a Guarded vault on floor ${f}`);
    for (const kind of [...WORLD_SOURCES, 'home', 'jackpot']) for (let i = 0; i < 20; i++) assert.ok(!uniqueFrom(s, { kind, floor: f, layer: 3 }, 60)?.tier, `${kind} drops`);
  }
  assert.deepEqual(tiered(Object.keys(UNIQUES).flatMap((id) => bossUniques(id))), []);
  assert.deepEqual(tiered(strainTrophies('cryptjack', 60)), []);
  for (const f of ['bot.mjs', 'roomsim.mjs', 'farmsim.mjs']) assert.match(fs.readFileSync(f, 'utf8'), /JACKPOT\.on = false/, `${f} switches them off`);
  assert.deepEqual(homes({ kind: 'jackpot', floor: 3 }), [['floor:3', 'Any kill']]);
});
