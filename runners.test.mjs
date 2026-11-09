// Runners (runners.mjs, docs/runners.md R1): a stable cast from the network seed, a loop on logged-on time only, #net
// lines from their real turns, and the Rail (runners-view.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh } from './dist/combat.mjs';
import { castOf, stateOf, tickRunners, runnersOf, know, knownOf, RUNNERS, TRAITS, TEMPERS, levelOf } from './dist/runners.mjs';
import { runnerRail, runnerMark } from './dist/runners-view.mjs';
import { online } from './dist/presence.mjs';
import { tickChannel, channelOf } from './dist/channel.mjs';

const world = (seed = 4242, level = 14) => { const s = fresh(); s.netSeed = seed; s.tutorialCompleted = true; s.hackers = { breaker: { level, xp: 0 } }; return s; };

test('the cast: the same seed draws the same people, a few dozen of them, each with a class, faction, temperament, traits and trade', () => {
  const a = castOf(world(4242)), b = castOf(world(4242)), c = castOf(world(777));
  assert.equal(a.length, RUNNERS.cast);
  assert.deepEqual(a.map((r) => r.handle), b.map((r) => r.handle));
  assert.notDeepEqual(a.map((r) => r.handle), c.map((r) => r.handle), 'another network, another cast');
  assert.equal(new Set(a.map((r) => r.handle)).size, a.length, 'no handle twice');
  const s = world();
  for (const r of a) {
    assert.ok(TEMPERS.includes(r.temper));
    assert.ok(r.traits.length >= 1 && r.traits.length <= 4 && r.traits.every((t) => TRAITS[t.id]));
    const L = levelOf(s, r);
    assert.ok(L >= 14 + RUNNERS.band[0] && L <= 14 + RUNNERS.band[1], 'a level in a band around yours');
    const st = stateOf(s, r, 1e6);
    assert.ok(st.trade.floor > st.floor || st.trade.floor === 8, 'their trade is frozen deeper than they work');
  }
  assert.deepEqual(castOf(fresh()), [], 'no network seed, no runners');
});

test('the loop: worked out from the seed and logged-on time alone; nothing moves while logged off', () => {
  const s = world(), r = castOf(s)[0];
  const t = 3_600_000;
  assert.deepEqual(stateOf(s, r, t).pos, stateOf(world(), castOf(world())[0], t).pos, 'deterministic');
  const stages = new Set();
  for (let x = 0; x < r.cycle * 3; x += 20000) stages.add(stateOf(s, r, x).stage);
  for (const k of ['hub', 'out', 'work']) assert.ok(stages.has(k), `${k} in the loop`);
  assert.ok(stages.has('back') || stages.has('down'), 'back to the hub, or pulled out');
  // Logged off: the clock only moves with logged-on time (tickRunners' dt), never with the wall clock.
  runnersOf(s).ms = t;
  const before = online(s).map((x) => [x.handle, x.place]);
  assert.deepEqual(online(s, Date.now() + 86_400_000).map((x) => [x.handle, x.place]), before, 'a day away moves nobody');
  tickRunners(s, 0);
  assert.equal(runnersOf(s).ms, t);
  // Logged on: they move, and their turns come back.
  let turns = [];
  for (let i = 0; i < 1200; i++) turns = turns.concat(tickRunners(s, 1000));
  assert.ok(turns.some((q) => q.kind === 'arrive') && turns.some((q) => q.kind === 'clear' || q.kind === 'crash'));
  assert.notDeepEqual(online(s).map((x) => [x.handle, x.place]), before);
});

test('#net: runners speak about their real turns, and speaking is how you come to know them', () => {
  const s = world();
  for (let i = 0; i < 3600; i++) tickChannel(s, 1000);
  const lines = channelOf(s).lines.filter((l) => l.kind === 'sim');
  assert.ok(lines.length >= 5, `${lines.length} lines`);
  const cast = new Set(castOf(s).map((r) => r.handle));
  assert.ok(lines.every((l) => cast.has(l.from)), 'every speaker is a runner on this net');
  assert.ok(lines.some((l) => /cleared|crashed|pulled out|paid|working|on .+ now/.test(l.text)), 'a line from a turn of their loop');
  assert.ok(knownOf(s).length > 0 && knownOf(s).every((r) => lines.some((l) => l.from === r.handle)));
});

test('the Rail: the runners you know under Contracts; the one picked drawn in paper white on its floor', () => {
  const s = world();
  assert.equal(runnerRail(s), '', 'nobody known, no Rail');
  runnersOf(s).ms = 2_000_000;
  const r = castOf(s)[0];
  know(s, r.handle);
  const html = runnerRail(s, r.handle), st = stateOf(s, r);
  assert.match(html, new RegExp(`data-runner="${r.handle}"`));
  assert.match(html, /rr-row on/);
  assert.match(html, new RegExp(`data-tt-kind="Runner · `));
  assert.match(html, new RegExp(`title="${r.handle}: `), 'the tooltip leads with the handle');
  assert.match(html, /You know them from #net\. After /);
  if (st.stage === 'out' || st.stage === 'back') assert.match(html, /→ /, 'on the road: → where they head');
  const mark = runnerMark(s, r.handle, st.floor);
  assert.match(mark, /class="mr-dia"/);
  assert.match(mark, new RegExp(`>${r.handle}</text>`));
  if (st.stage !== 'hub' && st.stage !== 'down') assert.match(mark, /class="mr-ring"/, 'a dashed ring where they head');
  assert.equal(runnerMark(s, r.handle, st.floor + 1), '', 'only on their own floor');
  assert.equal(runnerMark(s, null, st.floor), '');
});
