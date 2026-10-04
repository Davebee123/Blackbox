import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, part } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import { CREW, matesOf } from './dist/crew.mjs';
import { planner } from './dist/planner.mjs';

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
  for (const m of [s, ...mates]) m.encounter.chits = 0;
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
  assert.ok(s.logs.some((e) => e.type === 'info' && /already broken: Spike goes at/.test(e.message)));
  assert.ok(b.integrity < b.max || b.armor < b.maxArmor, 'it hit the other part');
});

test('crew off: back to solo; home intrusions stay solo', () => {
  const s = fresh();
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
  for (const m of [s, nyx, kilo]) { m.encounter.chits = 0; m.encounter.shield = 0; }
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

test('a party splits kill XP, with 10% more per extra player; elites don\'t grow with the party', async () => {
  const { hackerOf } = await import('./dist/combat.mjs');
  const xpOf = (crew) => {
    const s = start(crew);
    for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, integrity: 1 });
    for (let n = 0; n < 10 && active(s); n++) { command(s, 'spike ' + s.encounter.virus.parts.find((p) => p.integrity > 0).id); resolveCycle(s); }
    return s.logs.filter((e) => e.type === 'xp' && /neutralized|down/.test(e.message)).reduce((n, e) => n + e.amount, 0);
  };
  const solo = xpOf(null), trio = xpOf('bastion infiltrator');
  assert.ok(Math.abs(trio - Math.round((solo * 1.2) / 3)) <= 1, `${trio} vs ${solo}`);
  assert.equal(CREW.elitePer, 0);
});
