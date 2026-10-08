import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, part } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import { CREW, matesOf, mateSignal } from './dist/crew.mjs';
import { planner } from './dist/planner.mjs';
import { FRESH as __FRESH } from './dist/combat.mjs';
__FRESH.bonus = 0; // exact XP checks: the Fresh bonus has its own tests (phase2.test.mjs)

const start = (crew) => {
  const s = fresh();
  s.hackers = { breaker: { level: 5, xp: 0 } };
  if (crew) play(s, 'crew sim ' + crew);
  play(s, 'connect sprawl'); play(s, 'cd var'); play(s, 'attack');
  return s;
};

test('crew sim: bots of other classes join run fights; the virus is tougher for a bigger party', () => {
  const solo = start(null), duo = start('bastion infiltrator');
  assert.deepEqual(duo.crewSim.map((x) => x.cls), ['bastion', 'infiltrator']);
  const hp = (s) => s.encounter.virus.parts.reduce((n, p) => n + p.max, 0);
  assert.equal(Math.round(hp(duo) / hp(solo) * 10) / 10, Math.round((1 + CREW.hpPer * 2) * 10) / 10);
  assert.ok(matesOf(duo).every((m) => m.encounter?.queue), 'each crewmate has a command queued');
  assert.ok(!JSON.stringify(duo).includes('"who":"nyx","loadout"'), 'crewmates stay off the save');
});

test('crewmates act every cycle against the same virus, and the crew wins together', () => {
  const s = start('bastion operator');
  for (let n = 0; n < 60 && active(s); n++) { command(s, planner(s) || 'hold'); resolveCycle(s); }
  assert.equal(s.reports.at(-1).result, 'victory');
  assert.ok(s.logs.some((e) => e.who === 'nyx' && e.type === 'damage'), 'nyx hit something');
  assert.ok(s.logs.some((e) => e.who === 'kilo' && e.type === 'damage'), 'kilo hit something');
  assert.ok(matesOf(s).every((m) => m.encounter === null), 'the fight ends for everyone');
});

test('a damage attack lands on everyone in the fight, each in full', () => {
  const s = start('bastion infiltrator');
  const e = s.encounter;
  const p = e.virus.parts.find((x) => x.attack?.effect === 'damage');
  for (const x of e.virus.parts) if (x !== p && x.attack) x.attack.due = 999;
  p.attack.due = e.cycle;
  const mates = matesOf(s);
  for (const m of [s, ...mates]) m.encounter.hardened = 0;
  const before = [s.run.integrity, ...mates.map((m) => m.run.integrity)];
  command(s, 'hold'); for (const m of mates) { m.encounter.queue = { ability: 'hold', text: 'hold' }; }
  resolveCycle(s);
  const after = [s.run.integrity, ...mates.map((m) => m.run.integrity)];
  assert.ok(after.every((v, i) => v < before[i]), `everyone took it: ${before} → ${after}`);
  assert.equal(p.attack.due, e.cycle - 1 + p.attack.interval, 'its timer moved once');
});

test('your target broke before your turn: the command goes at the next part', () => {
  const s = start('bastion');
  const [a, b] = s.encounter.virus.parts;
  command(s, 'spike ' + a.id);
  a.integrity = 0;
  resolveCycle(s);
  assert.ok(s.logs.some((e) => e.type === 'info' && /already broken, so Spike goes at/.test(e.message)));
  assert.ok(b.integrity < b.max || b.armor < b.maxArmor, 'it hit the other part');
});

test('crew off: back to solo; home intrusions stay solo', () => {
  const s = fresh();
  s.hackers = { breaker: { level: 5, xp: 0 } };
  play(s, 'crew sim bastion');
  command(s, 'encounter cryptjack'); command(s, 'engage');
  assert.ok(!matesOf(s)[0].encounter, 'no crew at home');
  s.encounter = null;
  play(s, 'crew off');
  assert.deepEqual(s.crewSim, []);
});

test('a Bastion drawing fire (Firewall) takes every attack; nobody else is hit', () => {
  const s = start('bastion infiltrator');
  const e = s.encounter;
  const p = e.virus.parts.find((x) => x.attack?.effect === 'damage');
  for (const x of e.virus.parts) if (x !== p && x.attack) x.attack.due = 999;
  p.attack.due = e.cycle;
  const [nyx, kilo] = matesOf(s);
  for (const m of [s, nyx, kilo]) { m.encounter.hardened = 0; m.encounter.shield = 0; }
  nyx.encounter.buffs.sinkhole = e.cycle + 1;
  const before = [s.run.integrity, nyx.run.integrity, kilo.run.integrity];
  command(s, 'hold'); nyx.encounter.queue = kilo.encounter.queue = { ability: 'hold', text: 'hold' };
  resolveCycle(s);
  assert.ok(nyx.run.integrity < before[0 + 1], 'the Bastion took it');
  assert.equal(s.run.integrity, before[0], 'you took nothing');
  assert.equal(kilo.run.integrity, before[2], 'kilo took nothing');
});

test('stepped cycles (the browser): each turn in order, then the virus, one step at a time', async () => {
  const { hooks, stepCycle } = await import('./dist/combat.mjs');
  const s = start('bastion infiltrator');
  hooks.stepped = true;
  try {
    const c = s.encounter.cycle;
    command(s, 'spike ' + s.encounter.virus.parts[0].id);
    resolveCycle(s);
    assert.equal(s.encounter.steps.order[0], 'you', 'a Spike strips: you go first');
    assert.equal(s.encounter.steps.next, 1, 'you acted; the crew waits');
    assert.equal(s.encounter.steps.of, 3);
    assert.equal(resolveCycle(s).length, 0, 'nothing else resolves meanwhile');
    stepCycle(s); assert.equal(s.encounter.steps.next, 2);
    stepCycle(s); assert.equal(s.encounter.steps.next, 3);
    for (let i = 0; i < 6 && s.encounter.steps; i++) stepCycle(s); // the virus: one step per attack due
    assert.equal(s.encounter.steps, null);
    assert.equal(s.encounter.cycle, c + 1, 'the virus went, and the cycle turned');
  } finally { hooks.stepped = false; }
});

test('turn order: armor strippers first, damage skills after; "last" puts your command at the back', async () => {
  const { turnOrder, turnPriority } = await import('./dist/combat.mjs');
  const s = start('bastion infiltrator');
  const [a, b] = matesOf(s);
  const p = s.encounter.virus.parts[0].id;
  a.encounter.queue = { ability: 'spike', target: p, text: 'spike ' + p };
  b.encounter.queue = { ability: 'inject', target: p, text: 'inject ' + p };
  command(s, 'overload ' + p);
  assert.equal(turnPriority(s.encounter), 2, 'Overload is a damage skill');
  assert.deepEqual(turnOrder(s), [a.who, b.who, 'you'], 'the Spike strips first; your Overload lands after');
  command(s, 'spike ' + p);
  assert.deepEqual(turnOrder(s), ['you', a.who, b.who], 'two strippers: you, then the crew');
  command(s, 'spike ' + p + ' last');
  assert.equal(s.encounter.queue.text, `spike ${p} last`);
  assert.deepEqual(turnOrder(s), [a.who, b.who, 'you'], 'last: after everyone');
  for (let n = 0; n < 3 && active(s); n++) resolveCycle(s);
  assert.ok(s.logs.some((e) => e.type === 'resolved' && !e.who), 'your command still went off');
});

test('a party splits kill XP, with 10% more per extra player; elites grow only a little with the party', async () => {
  const { hackerOf } = await import('./dist/combat.mjs');
  const xpOf = (crew) => {
    const s = start(crew);
    for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: 1 });
    for (let n = 0; n < 10 && active(s); n++) { command(s, 'spike ' + s.encounter.virus.parts.find((p) => p.integrity > 0).id); resolveCycle(s); }
    return s.logs.filter((e) => e.type === 'xp' && /neutralized|down/.test(e.message)).reduce((n, e) => n + e.amount, 0);
  };
  const solo = xpOf(null), trio = xpOf('bastion infiltrator');
  assert.ok(Math.abs(trio - Math.round((solo * 1.2) / 3)) <= 1, `${trio} vs ${solo}`);
  assert.ok(CREW.elitePer > 0 && CREW.elitePer < CREW.hpPer, 'elites grow less with the party than normal fights');
});

test('a crewmate keeps its own level: switching your class does not move it', async () => {
  const { matesOf } = await import('./dist/crew.mjs');
  const { hackerLevel } = await import('./dist/combat.mjs');
  const s = fresh();
  s.hackers = { breaker: { level: 12, xp: 0 }, bastion: { level: 3, xp: 0 } };
  command(s, 'archetype breaker');
  play(s, 'crew sim bastion');
  assert.equal(hackerLevel(matesOf(s)[0]), 12);
  command(s, 'archetype bastion');
  assert.equal(hackerLevel(s), 3);
  assert.equal(hackerLevel(matesOf(s)[0]), 12, 'still 12');
  s.crewSim[0].level = undefined; // a crew from an older save
  assert.equal(hackerLevel(matesOf(s)[0]), 3, 'frozen at the level it has when first seen');
  command(s, 'archetype breaker');
  assert.equal(hackerLevel(matesOf(s)[0]), 3);
});

test('a member who drops in earns by the damage they dealt; you split the rest with your crew', async () => {
  const { hooks } = await import('./dist/combat.mjs');
  const killXp = (guest) => {
    const was = hooks.crewGuests;
    hooks.crewGuests = guest ? () => [{ name: 'zed', cls: 'breaker', level: 5 }] : was;
    const s = fresh();
    s.hackers = { breaker: { level: 5, xp: 0 } };
    play(s, 'connect sprawl'); play(s, 'cd var'); play(s, 'attack');
    hooks.crewGuests = was;
    for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0 });
    for (let n = 0; n < 40 && active(s); n++) { command(s, planner(s) || 'hold'); resolveCycle(s); }
    const xp = s.logs.filter((e) => e.type === 'xp' && /neutralized|down/.test(e.message)).reduce((n, e) => n + e.amount, 0);
    return { xp, dealt: s.encounter?.virus?.dealt || {}, party: s.encounter?.party };
  };
  const solo = killXp(false), duo = killXp(true);
  assert.equal(duo.party, 2, 'the member joined');
  const total = Object.values(duo.dealt).reduce((a, b) => a + b, 0);
  const share = (duo.dealt.zed || 0) / total;
  assert.ok(share > 0 && share < 1, `both hit it (${share})`);
  // Same virus, same level: your XP is the party pool minus the guest's share.
  assert.ok(Math.abs(duo.xp - Math.round(solo.xp * (1 + 0.1) * (1 - share))) <= 1, `${duo.xp} vs ${solo.xp} × 1.1 × ${1 - share}`);
});

test('the sim crew: from level 5, Stock gear, and Signal that carries from fight to fight on a run', () => {
  const low = fresh();
  play(low, 'crew sim bastion');
  assert.ok(!(low.crewSim || []).length, 'not before level 5');
  const s = start('bastion');
  const [nyx] = matesOf(s);
  assert.ok(nyx.stash.length && nyx.stash.every((it) => it.rarity === 'stock'), 'plain gear');
  nyx.run.integrity = 3;
  for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: 1, attack: null });
  for (let n = 0; n < 10 && active(s); n++) { command(s, 'spike ' + s.encounter.virus.parts.find((p) => p.integrity > 0).id); resolveCycle(s); }
  assert.equal(s.run.crew.nyx.signal, 3, 'it walks out with what it had');
  play(s, 'cd /'); play(s, 'cd tmp');
  if (s.encounter?.phase === 'alert') play(s, 'attack');
  if (matesOf(s)[0].encounter) assert.equal(matesOf(s)[0].run.integrity, 3, 'and walks into the next fight with it');
  s.run.crew.nyx.signal = 0;
  assert.equal(mateSignal(s, nyx), Math.max(1, Math.round(nyx.run.max * CREW.reboot)), 'a downed crewmate reboots low');
});

test('a healer: patch <name> heals that crewmate, and a Bastion crewmate patches whoever is low', async () => {
  const s = fresh();
  s.hackers = { bastion: { level: 18, xp: 0 } };
  s.loadout.archetype = 'bastion';
  play(s, 'subclass sysop');
  play(s, 'crew sim breaker operator');
  play(s, 'connect sprawl'); play(s, 'cd var'); play(s, 'attack');
  const [nyx] = matesOf(s);
  nyx.run.integrity = 5;
  command(s, 'patch nyx');
  assert.equal(s.encounter.queue?.text, 'patch nyx');
  for (const p of s.encounter.virus.parts) if (p.attack) p.attack.due = 999;
  resolveCycle(s);
  assert.ok(nyx.run.integrity > 5, 'nyx got healed');
  assert.ok(s.logs.some((e) => e.who === 'nyx' && e.type === 'heal' && /Patch from you/.test(e.message)));
  assert.match(command(s, 'patch zed').find((e) => e.type === 'warning')?.message || '', /isn't in this fight/);
  // A Bastion bot heals you when you're low.
  const t = fresh();
  t.hackers = { breaker: { level: 18, xp: 0 } };
  play(t, 'crew sim sysop');
  play(t, 'connect sprawl'); play(t, 'cd var'); play(t, 'attack');
  t.run.integrity = 5;
  const bot = matesOf(t)[0];
  bot.encounter.readyAt = {};
  assert.equal(planner(bot), 'patch you');
});
