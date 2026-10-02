import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, active, part } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import { CREW, matesOf, targetOf } from './dist/crew.mjs';
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

test('an attack goes at whoever hit that part last', () => {
  const s = start('bastion');
  const p = s.encounter.virus.parts[0];
  p.lastBy = 'nyx';
  assert.equal(targetOf(s, p), 'nyx');
  p.lastBy = null;
  assert.equal(targetOf(s, p), null, 'nobody (or you): it comes at you');
  const m = matesOf(s)[0];
  p.lastBy = 'nyx'; m.run.integrity = 0;
  assert.equal(targetOf(s, p), null, 'a downed crewmate draws nothing');
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
