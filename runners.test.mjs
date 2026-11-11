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

// ---------- R2: meeting, standing and hiring ----------
import { command, active, hooks, resolveCycle } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import { play } from './dist/run.mjs';
import * as FP from './dist/floorplan.mjs';
import './dist/netrooms.mjs';
import { matesOf } from './dist/crew.mjs';
import { STANDING, HIRE, tierOf, standingOf, raiseStanding, meetingOf, feeOf, cutOf, sigOf, setSig, busyOf, cantHire, gainOf } from './dist/runners.mjs';
import { runnerCard, tierBar } from './dist/runners-view.mjs';
import { roomsMarkup } from './dist/floorplan-view.mjs';
import { RIVAL } from './dist/rivals.mjs';

// A traced server with a runner at work on it: the save's clock at their job, the server in their job's slot.
function onTheirServer(level = 14) {
  RIVAL.chance = 0; CONFIG.exfil.chance = 0; CONFIG.enemyCrit = 0; CONFIG.misses = false;
  const s = world(4242, level);
  command(s, 'developer location ransomware');
  s.hackers = { breaker: { level, xp: 0 } };
  const loc = s.locations.at(-1); loc.lockUntil = 0;
  for (const r of castOf(s)) for (let t = 0; t < r.cycle * 2; t += 5000) {
    const st = stateOf(s, r, t);
    if (st.stage === 'work' && st.left > 60000) { runnersOf(s).ms = t; loc.slot = st.target; return { s, r, loc }; }
  }
  throw new Error('nobody at work');
}
const winFight = (s) => { for (let i = 0; i < 30 && active(s); i++) { for (const p of s.encounter.virus.parts) Object.assign(p, { armor: 0, attack: null }); const p = s.encounter.virus.parts.find((x) => x.integrity > 0); p.integrity = 1; command(s, 'spike ' + p.id); resolveCycle(s); } FP.settle(s); };
// Next door to their room, then walk in.
function walkIn(s, m) {
  const path = FP.pathTo(s.rooms.graph, s.rooms.at, m.room.id), nb = path[path.length - 2];
  Object.assign(s.rooms, { at: nb, screen: null }); s.rooms.cleared[nb] = true; s.rooms.down[nb] = Date.now(); FP.look(s);
  return FP.go(s, m.room.id);
}

test('standing: 0–100 in four tiers, drawn as the Tier bar (the number and how you met in its tooltip)', () => {
  assert.deepEqual([0, 24, 25, 50, 74, 75, 100].map((n) => tierOf(n).name), ['Stranger', 'Stranger', 'Known', 'Friend', 'Friend', 'Close', 'Close']);
  assert.equal(tierOf(37).next, 'Friend'); assert.ok(Math.abs(tierOf(37).f - 0.48) < 1e-9); assert.equal(tierOf(100).next, null);
  const s = world(), r = castOf(s).find((x) => !x.traits.some((t) => t.id === 'knownface'));
  assert.equal(standingOf(s, r.handle), 0);
  const up = raiseStanding(s, r.handle, STANDING.help, 'You helped them clear a room on X.');
  assert.equal(standingOf(s, r.handle), 25); assert.equal(up.name, 'Known', 'crossing into a tier says so');
  assert.equal(raiseStanding(s, r.handle, 5), null, 'within a tier: no news');
  raiseStanding(s, r.handle, 500); assert.equal(standingOf(s, r.handle), 100, 'kept to 100');
  const bar = tierBar(s, r.handle);
  assert.match(bar, /<b>Close<\/b>/); assert.match(bar, /100 of 100/); assert.match(bar, /You helped them clear a room on X\./);
  const kf = castOf(s).find((x) => x.traits.some((t) => t.id === 'knownface'));
  if (kf) assert.ok(gainOf(kf) > STANDING.help, 'Known face: standing rises faster');
});

test('meeting: a runner at work on your server fights in one of its rooms; Help, win, and their standing rises a tier', () => {
  const { s, r, loc } = onTheirServer();
  play(s, `connect ${loc.name}`);
  const m = meetingOf(s, FP.isUp);
  assert.equal(m?.r.handle, r.handle, 'the runner whose job this server is');
  assert.ok(['process', 'elite'].includes(m.room.kind) && FP.isUp(s, m.room), 'in a live fight room');
  assert.ok(m.sig >= HIRE.sig[0] && m.sig <= HIRE.sig[1]);
  // The room's chip: a paper-white tab with their handle and their Signal; the tooltip says so.
  const html = roomsMarkup(s);
  assert.match(html, new RegExp(`class="fp-rn-tab".*>${r.handle}</text>`));
  assert.match(html, new RegExp(`The runner ${r.handle} is fighting it, at ${Math.round(m.sig * 100)}% Signal\\.\\n▸ Walk in to help\\.`));
  // Walk in: the card has their row and Help in place of Engage.
  const said = walkIn(s, m).map((e) => e.message).join(' ');
  assert.match(said, new RegExp(`The runner ${r.handle} is fighting it`));
  const card = roomsMarkup(s);
  assert.match(card, /data-rooms="assist"[^>]*>Help/); assert.doesNotMatch(card, /data-rooms="engage"/);
  assert.match(card, new RegExp(`class="rc-row".*<b>${r.handle}</b>`)); assert.match(card, /class="rc-pays"[^>]*>.*\+25/);
  // Help: they fight beside you as a runner, take none of the XP, and a win raises their standing.
  FP.act(s, 'assist');
  assert.ok(active(s));
  const mate = matesOf(s).find((x) => x.who === r.handle);
  assert.ok(mate?.helper && mate.encounter, 'in the fight');
  assert.equal(s.encounter.party, 1, 'the XP stays yours'); assert.deepEqual(s.encounter.guests, []);
  assert.equal(mate.run.integrity, Math.max(1, Math.round(mate.run.max * m.sig)), 'at the Signal they had');
  winFight(s);
  assert.equal(standingOf(s, r.handle), gainOf(r));
  assert.equal(runnersOf(s).known[r.handle].by, 'met');
  assert.match(runnersOf(s).known[r.handle].met, new RegExp(loc.name));
  assert.equal(meetingOf(s, FP.isUp), null, 'helped on this job: they move on');
  assert.match(roomsMarkup(s), /class="rc-tier"/, 'the room\'s card shows their standing, up');
  assert.ok(!s.crewSim?.length, 'helping never hires');
});

test('hiring: from Friend, a fee once and a cut of each run; hired, they are crew and level with you', () => {
  const { s, r, loc } = onTheirServer();
  s.server.credits = 10_000;
  assert.match(cantHire(s, r), /at Friend/);
  raiseStanding(s, r.handle, STANDING.hire);
  assert.equal(cantHire(s, r), null);
  // The runner card, then the crew card Hire turns it into: traits, Pay as two icons, the bar's presets as tiles.
  assert.match(runnerCard(s, r.handle), /data-runner-hire="1"/);
  const crew = runnerCard(s, r.handle, { mode: 'crew' });
  assert.match(crew, /class="rc-chip temper"/); assert.match(crew, new RegExp(`<b>${feeOf(s, r)}</b>`)); assert.match(crew, new RegExp(`<b>${Math.round(cutOf(r) * 100)}%</b>`));
  assert.match(crew, /data-runner-preset="rotation"/); assert.match(crew, new RegExp(`data-command="hire ${r.handle} rotation"`));
  const fee = feeOf(s, r);
  play(s, `hire ${r.handle}`);
  assert.equal(s.server.credits, 10_000 - fee, 'the fee, once');
  assert.deepEqual(s.crewSim.map((x) => [x.name, x.runner]), [[r.handle, true]]);
  assert.equal(matesOf(s)[0].hackers[r.cls].level, levelOf(s, r), 'at their level');
  s.hackers.breaker.level = 20; matesOf(s);
  assert.equal(s.crewSim[0].level, levelOf(s, r), 'and they level with you');
  // A run: they come along, and take their cut of what it banks.
  play(s, `connect ${loc.name}`);
  assert.ok(s.run.crew[r.handle]);
  s.run.pack.push({ path: '/x', name: 'loot.dat', kind: 'credits', amount: 1000 });
  const before = s.server.credits, out = play(s, 'jack out').map((e) => e.message).join(' ');
  const cut = Math.round(1000 * cutOf(r));
  assert.match(out, new RegExp(`${r.handle}'s cut: ${cut} credits`));
  assert.ok(s.server.credits - before <= 1000 - cut + 1);
  // Let go and hire again: no second fee.
  play(s, `crew kick ${r.handle}`);
  const c0 = s.server.credits;
  play(s, `hire ${r.handle}`);
  assert.equal(s.server.credits, c0, 'the fee is paid once');
});

test('a hire\'s Signal carries over; at 0 they disconnect and are busy until it refills on logged-on time', () => {
  const { s, r } = onTheirServer();
  raiseStanding(s, r.handle, STANDING.hire); s.server.credits = 10_000;
  play(s, `hire ${r.handle}`);
  setSig(s, r.handle, 0.4);
  const m = matesOf(s)[0]; m.encounter = { cycle: 0 }; m.run.integrity = 0; // down in a fight
  hooks.crewEnd(s, 'defeat');
  assert.deepEqual(s.crewSim, [], 'at 0 they disconnect');
  assert.match(s.logs.at(-1).message, new RegExp(`${r.handle}: Signal's going\\. I'm out\\.`));
  assert.equal(sigOf(s, r.handle), 0);
  const busy = busyOf(s, r);
  assert.equal(busy.why, 'recovering');
  assert.match(cantHire(s, r), /recovering/);
  assert.match(runnerCard(s, r.handle), /Busy · free in 10:00/);
  runnersOf(s).ms += HIRE.recoverMs / 2;
  assert.equal(sigOf(s, r.handle), 0.5, 'refills on logged-on time');
  runnersOf(s).ms += HIRE.recoverMs / 2;
  assert.equal(sigOf(s, r.handle), 1);
  assert.equal(busyOf(s, r)?.why === 'recovering', false, 'full: hireable again');
});

test('crew invite is gone: crews come from hiring runners', () => {
  const s = world();
  const out = play(s, 'crew invite nyx').map((e) => e.message).join(' ');
  assert.match(out, /hire <runner>/);
  assert.ok(!s.crewSim?.length);
});
