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
