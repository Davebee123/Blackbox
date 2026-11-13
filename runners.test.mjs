// Runners (runners.mjs, docs/runners.md R1): a stable cast from the network seed, a loop on logged-on time only, #net
// lines from their real turns, and the Rail (runners-view.mjs).
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh } from './dist/combat.mjs';
import { castOf, stateOf, tickRunners, runnersOf, know, knownOf, RUNNERS, TRAITS, TEMPERS, levelOf, leavesAt, runnerOf } from './dist/runners.mjs';
import { runnerRail, runnerMark } from './dist/runners-view.mjs';
import { addLocation } from './dist/combat.mjs';
import { graphOf, floorsOf } from './dist/floors.mjs';
import { online } from './dist/presence.mjs';
import { tickChannel, channelOf } from './dist/channel.mjs';

const world = (seed = 4242, level = 14) => { const s = fresh(); s.netSeed = seed; s.tutorialCompleted = true; s.hackers = { breaker: { level, xp: 0 } }; return s; };
// The first logged-on time (on a minute) the runners on floor fl fit: the save's clock set there.
function moment(s, fl, fits) {
  for (let t = 0; t < 4 * RUNNERS.cycleMs[1]; t += 60000) {
    const on = castOf(s, t).map((r) => ({ r, st: stateOf(s, r, t) })).filter((x) => x.st.floor === fl);
    if (fits(on)) { runnersOf(s).ms = t; return on; }
  }
  throw new Error('no moment fits');
}
// Revealing the map: a server located on a slot, a floor's hubs found, a floor with everything on it revealed.
const locate = (s, slot) => addLocation(s, 'ransomware', 1, null, slot);
const findHubs = (s, g) => { s.mail = { ...s.mail, boardOpen: true }; s.hubFound = { ...s.hubFound, ...Object.fromEntries(Object.keys(g.hubs).map((f) => [f, true])) }; };
function revealFloor(s, fl) {
  const F = floorsOf(s); F.reached = Math.max(F.reached, fl);
  const g = graphOf(s, fl);
  findHubs(s, g);
  for (const n of Object.values(g.nodes)) if (n.kind === 'server') locate(s, n.id);
  return g;
}

test('the cast: the same seed draws the same people, eight of them, each with a class, faction, temperament, traits and trade', () => {
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

test('rotation: runners move on after 2–4 hours logged on and others take their place; a hire stays; one who left comes back as the same person', () => {
  const s = world(), H = 3600000;
  const at = (t) => castOf(s, t).map((r) => r.handle);
  for (let t = 0; t < 200 * H; t += H / 4) assert.equal(new Set(at(t)).size, RUNNERS.cast, 'always eight, no one twice');
  const first = at(0);
  assert.notDeepEqual(at(24 * H).sort(), [...first].sort(), 'a day logged on: other people');
  assert.ok(castOf(s, 0).every((r) => leavesAt(s, r.handle, 0) > 0 && leavesAt(s, r.handle, 0) <= RUNNERS.stay[1]), 'each moves on within their stay');
  // How long one stays: from when they arrive to when they leave, 2–4 hours.
  const h = first[0], left = leavesAt(s, h, 0);
  assert.ok(!at(left).includes(h), 'gone once their stay ends');
  let back = left; while (!at(back).includes(h)) back += H / 4;
  const stay = leavesAt(s, h, back) - back;
  assert.ok(stay <= RUNNERS.stay[1] && leavesAt(s, h, back) - left >= RUNNERS.stay[0], `back later (${Math.round((back - left) / H)} hours on)`);
  assert.deepEqual(castOf(s, back).find((r) => r.handle === h), castOf(s, 0).find((r) => r.handle === h), 'the same person');
  // A hire stays on the net while they're with you, past their stay.
  s.crewSim = [{ name: h, runner: true }];
  assert.ok(at(left).includes(h) && at(left).length === RUNNERS.cast + 1, 'hired: still here, beside the eight');
  assert.equal(leavesAt(s, h, 0), null);
  // Standing is kept by handle while they're away.
  s.crewSim = [];
  raiseStanding(s, h, 30);
  runnersOf(s).ms = left;
  assert.equal(runnerOf(s, h), null); assert.equal(standingOf(s, h), 30, 'away, standing kept');
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
  const cast = new Set(); for (let t = 0; t <= runnersOf(s).ms; t += 60000) for (const r of castOf(s, t)) cast.add(r.handle);
  assert.ok(lines.every((l) => cast.has(l.from)), 'every speaker was a runner on this net when they spoke');
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
  assert.equal(runnerMark(s, r.handle, st.floor), '', 'no mark on a floor you have not reached');
  revealFloor(s, st.floor);
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
import { runnerCard, tierBar, runnersMap, runnersOn, runnersAt, runnersList } from './dist/runners-view.mjs';
import { listed } from './dist/presence.mjs';
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

test('hiring: anyone, a fee once (smaller the better you know them) and a cut of each run; hired, they are crew and level with you', () => {
  const { s, r, loc } = onTheirServer();
  s.server.credits = 10_000;
  assert.equal(cantHire(s, r), null, 'a stranger can be hired');
  const stranger = feeOf(s, r);
  raiseStanding(s, r.handle, 50);
  assert.ok(feeOf(s, r) < stranger, 'a Friend costs less than a stranger');
  assert.equal(Math.round(stranger / HIRE.byTier[0] * HIRE.byTier[2]), feeOf(s, r));
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
  s.server.credits = 10_000;
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

test('the map: one diamond under a place with runners, how many from two up and a list of who is there; the Rail\'s section folds; the people list leaves runners out', () => {
  const s = world(4242, 6);
  revealFloor(s, 1);
  // A moment with two or more at one place, one alone at another, and one on the road.
  const on1 = moment(s, 1, (on) => { const c = {}; for (const x of on) if (!x.st.pos.next) c[x.st.pos.at] = (c[x.st.pos.at] || 0) + 1; const n = Object.values(c); return n.some((k) => k > 1) && n.some((k) => k === 1) && on.some((x) => x.st.pos.next); });
  const svg = runnersMap(s, 1);
  assert.deepEqual(runnersOn(s, 1).map((x) => x.r.handle).sort(), on1.map((x) => x.r.handle).sort(), 'the whole floor revealed: everyone on it');
  // A place: one diamond, alone for one runner (it opens their card), a count beside it for more. The road: a hollow one each.
  const places = {}, road = on1.filter((x) => x.st.pos.next);
  for (const x of on1) if (!x.st.pos.next) (places[x.st.pos.at] ||= []).push(x.r.handle);
  const inG = '(?:(?!</g>)[^])*';
  for (const [slot, list] of Object.entries(places)) {
    if (list.length === 1) { assert.match(svg, new RegExp(`<g class="mrun( down)?" data-runner="${list[0]}"`)); continue; }
    assert.match(svg, new RegExp(`<g class="mrun crowd" data-runners-at="${slot}"${inG}<text class="mrun-n"[^>]*>${list.length}</text>`), `${slot}: one diamond and ${list.length}`);
    for (const h of list) assert.doesNotMatch(svg, new RegExp(`data-runner="${h}"`), 'counted, not drawn one by one');
  }
  for (const x of road) assert.match(svg, new RegExp(`<g class="mrun road" data-runner="${x.r.handle}"`));
  assert.equal((svg.match(/<g class="mrun[ "]/g) || []).length, Object.keys(places).length + road.length, 'one mark a place, one a traveller');
  // A counted diamond opens the list of who's there: a row each (handle, class and level), which opens their card.
  const [slot, list] = Object.entries(places).find(([, l]) => l.length > 1);
  const pop = runnersList(s, 1, slot);
  assert.match(pop, new RegExp(`id="crowd-pop" data-crowd="${slot}"`)); assert.match(pop, new RegExp(`<small>${list.length}</small></h3>`));
  assert.deepEqual([...pop.matchAll(/class="rr-row[^"]*" data-runner="([^"]+)"/g)].map((m) => m[1]), [...list].sort((x, y) => x.localeCompare(y)), 'everyone there, by handle');
  assert.match(pop, /data-crowd-close/);
  assert.match(runnersMap(s, 1, null, false, slot), new RegExp(`<g class="mrun crowd on" data-runners-at="${slot}"`), 'its diamond is lit while the list is up');
  const lone = Object.entries(places).find(([, l]) => l.length === 1);
  if (lone) assert.equal(runnersList(s, 1, lone[0]), '', 'one runner: no list');
  assert.equal(runnersList(s, 1, null), '');
  // The picked one is drawn by their mark, so leaves the count.
  assert.equal(runnersAt(s, 1, slot, list[0]).length, list.length - 1);
  assert.doesNotMatch(runnersMap(s, 1, road[0].r.handle), new RegExp(`data-runner="${road[0].r.handle}"`), 'the picked one is drawn by its mark');
  const h0 = on1[0].r.handle;
  know(s, h0);
  assert.match(runnerRail(s), /data-rail-fold[^>]*aria-expanded="true"/);
  const shut = runnerRail(s, null, true);
  assert.match(shut, /aria-expanded="false"/); assert.doesNotMatch(shut, /rr-row/, 'folded: the head alone');
  assert.ok(online(s).some((x) => x.runner) && !listed(s).some((x) => x.runner), 'runners are on the map, not the people list');
  s.friends = [h0];
  assert.ok(listed(s).some((x) => x.handle === h0), 'a runner you befriend is listed');
});

// ---------- runners show only where you've revealed (the designer's rule, November 2026) ----------
import { revealed, inSight, nodeName, shortPlace, doing, headingOf } from './dist/runners.mjs';
import { mapLayout } from './dist/view.mjs';

// The first moment a runner's state fits: the save's clock set there. { r, st }.
function when(s, fits) {
  for (let t = 0; t < RUNNERS.cycleMs[1] * 3; t += 5000) for (const r of castOf(s, t)) {
    const st = stateOf(s, r, t);
    if (fits(st, r)) { runnersOf(s).ms = t; return { r, st }; }
  }
  throw new Error('no runner fits');
}
const drawn = (s, h) => runnersOn(s, 1).some((x) => x.r.handle === h); // on the map: their own diamond, or counted at a place
const kindOf = (st, id) => st.g.nodes[id].kind;

test('revealed: what your map draws, less its ?s (located servers, the entry, hubs you have found, exits on your map)', () => {
  const agrees = (s, why) => {
    for (let fl = 1; fl <= floorsOf(s).reached; fl++) {
      const g = graphOf(s, fl), { nodes, slots } = mapLayout(s, fl);
      for (const id of Object.keys(g.nodes)) {
        const node = nodes.find((n) => n.id === slots[id]);
        assert.equal(revealed(s, g, id), !!node && node.kind !== 'hidden', `${why}: ${id}`);
      }
    }
  };
  const s = world(4242, 6), g = graphOf(s, 1);
  agrees(s, 'a fresh save');
  assert.deepEqual(Object.keys(g.nodes).filter((id) => revealed(s, g, id)), [g.entry], 'a fresh save: SPRAWL-00 alone');
  assert.ok(s.hidden.some((h) => h.slot && !revealed(s, g, h.slot)), 'a ? is on the map and not revealed');
  const first = s.hidden.find((h) => h.slot).slot;
  locate(s, first);
  assert.ok(revealed(s, g, first), 'located: revealed');
  agrees(s, 'one server located');
  findHubs(s, g);
  assert.ok(Object.values(g.hubs).every((id) => revealed(s, g, id)), 'a hub you have found');
  agrees(s, 'hubs found');
  revealFloor(s, 1);
  assert.ok(g.exits.every((id) => revealed(s, g, id)), 'an exit beside a located server');
  agrees(s, 'the floor located');
  assert.ok(!revealed(s, graphOf(s, 2), graphOf(s, 2).entry), 'nothing on a floor you have not reached');
  floorsOf(s).reached = 2;
  agrees(s, 'a floor down');
});

test('the map: no runner where you have not revealed (under a ?, at a hub off your map, on the road to either)', () => {
  // A fresh save: the runners at SPRAWL-00 and nobody else.
  const s = world(4242, 6), g = graphOf(s, 1);
  const atHome = (x) => x.st.pos.at === g.entry && !x.st.pos.next;
  const on1 = moment(s, 1, (on) => on.filter(atHome).length > 1 && on.some((x) => !atHome(x))); // two or more at SPRAWL-00, others elsewhere
  const home = on1.filter(atHome);
  assert.ok(home.length > 1 && home.length < on1.length);
  for (const x of on1) assert.equal(drawn(s, x.r.handle), home.includes(x), `${x.r.handle}, ${x.st.stage} at ${x.st.pos.at}`);
  const fresh1 = runnersMap(s, 1);
  assert.equal((fresh1.match(/<g class="mrun[ "]/g) || []).length, 1, 'one mark on the whole map');
  assert.match(fresh1, new RegExp(`<g class="mrun crowd" data-runners-at="${g.entry}"[^]*>${home.length}</text>`), 'SPRAWL-00, and how many are there');
  // At work on a server you haven't located (a ? or nothing on your map): no diamond until you locate it.
  const w = when(s, (st) => st.floor === 1 && st.stage === 'work');
  assert.ok(!inSight(s, w.st) && !drawn(s, w.r.handle), 'at an unlocated server: not drawn');
  assert.doesNotMatch(runnersMap(s, 1), new RegExp(`data-runners-at="${w.st.target}"|data-runner="${w.r.handle}"`));
  locate(s, w.st.target);
  assert.ok(inSight(s, w.st) && drawn(s, w.r.handle));
  const there = runnersAt(s, 1, w.st.target);
  assert.ok(there.some((x) => x.r.handle === w.r.handle), 'located: they are under it');
  assert.match(runnersMap(s, 1), there.length > 1 ? new RegExp(`<g class="mrun crowd" data-runners-at="${w.st.target}"[^]*?>${there.length}</text>`) : new RegExp(`<g class="mrun" data-runner="${w.r.handle}"`));
  // On the road: only between two revealed places.
  const s2 = world(4242, 6);
  const t = when(s2, (st) => st.floor === 1 && st.pos.next && [st.pos.at, st.pos.next].includes(st.g.entry) && [st.pos.at, st.pos.next].some((id) => kindOf(st, id) === 'server'));
  assert.ok(!drawn(s2, t.r.handle), 'a road with one end unrevealed: not drawn');
  assert.doesNotMatch(runnersMap(s2, 1), new RegExp(`data-runner="${t.r.handle}"`));
  locate(s2, [t.st.pos.at, t.st.pos.next].find((id) => id !== t.st.g.entry));
  assert.match(runnersMap(s2, 1), new RegExp(`<g class="mrun road" data-runner="${t.r.handle}"`), 'both ends revealed: hollow on the road');
  // At a hub that isn't on your map.
  const s3 = world(4242, 6);
  const h = when(s3, (st) => st.floor === 1 && st.stage === 'hub' && kindOf(st, st.base) === 'hub');
  assert.ok(!drawn(s3, h.r.handle), 'a hub you have not found: not drawn');
  assert.doesNotMatch(runnersMap(s3, 1), new RegExp(`data-runners-at="${h.st.base}"|data-runner="${h.r.handle}"`));
  findHubs(s3, h.st.g);
  assert.ok(drawn(s3, h.r.handle), 'found: drawn');
  assert.match(runnersMap(s3, 1), new RegExp(`data-runners-at="${h.st.base}"|data-runner="${h.r.handle}"`));
});

test('the picked runner: no mark out of sight; the route stops at the first unrevealed place; the ring only on a revealed one', () => {
  // Working a server two links or more from their base, the server before it one you can locate.
  const s = world(4242, 6);
  const { r, st } = when(s, (x) => x.floor === 1 && x.stage === 'work' && x.path.length >= 3 && kindOf(x, x.path.at(-2)) === 'server');
  know(s, r.handle);
  assert.equal(runnerMark(s, r.handle, 1), '', 'at an unlocated server: nothing on the map');
  assert.match(runnerRail(s, r.handle), /rr-row on/, 'their Rail row stays (their card opens beside it)');
  locate(s, st.target);
  const alone = runnerMark(s, r.handle, 1);
  assert.match(alone, /class="mr-dia"/); assert.match(alone, /class="mr-ring"/, 'the ring, on the located server they work');
  assert.doesNotMatch(alone, /mr-route/, 'the server before it is unrevealed: no route');
  locate(s, st.path.at(-2));
  const g = st.g, shown = st.path.length - 1 - st.path.findLastIndex((id) => !revealed(s, g, id));
  const pts = /class="mr-route" points="([^"]+)"/.exec(runnerMark(s, r.handle, 1))?.[1].split(' ') || [];
  assert.ok(shown >= 2 && pts.length === shown, `the route runs back through the ${shown} revealed places (${pts.length} drawn)`);
  // On a road between two revealed places, heading for one that isn't: the diamond and its route, no ring.
  const s2 = world(4242, 6);
  const far = when(s2, (x) => x.floor === 1 && x.stage === 'out' && x.pos.next && x.pos.next !== x.target && [x.pos.at, x.pos.next].every((id) => ['server', 'entry'].includes(kindOf(x, id))));
  for (const id of [far.st.pos.at, far.st.pos.next]) if (kindOf(far.st, id) === 'server') locate(s2, id);
  assert.equal(headingOf(far.st), far.st.target);
  const mark = runnerMark(s2, far.r.handle, 1);
  assert.match(mark, /class="mr-dia"/); assert.doesNotMatch(mark, /mr-ring/, 'heading somewhere unrevealed: no ring');
  locate(s2, far.st.target);
  assert.match(runnerMark(s2, far.r.handle, 1), /class="mr-ring"/);
});

test('the Rail, the tooltip and the card give a runner at an unlocated server its floor alone; #net keeps the kind', () => {
  const s = world(4242, 6);
  const { r, st } = when(s, (x) => x.floor === 1 && x.stage === 'work');
  know(s, r.handle);
  assert.equal(shortPlace(s, st.g, st.target), 'F1');
  assert.equal(doing(s, st), 'working a server on floor 1');
  const row = runnerRail(s);
  assert.match(row, /<small class="rr-at">F1<\/small>/); assert.match(row, /working a server on floor 1\./);
  assert.match(runnerCard(s, r.handle), /class="rc-now">working a server on floor 1 · /);
  assert.match(nodeName(s, st.g, st.target), /^a [A-Z][\w ]+ on floor 1$/, '#net: its kind, in their words');
  const out = when(s, (x) => x.floor === 1 && x.stage === 'out');
  know(s, out.r.handle);
  assert.match(runnerRail(s, out.r.handle), /<small class="rr-at">→ F1<\/small>/, 'on the road to one: → its floor');
  const loc = locate(s, out.st.target);
  assert.match(runnerRail(s, out.r.handle), new RegExp(`<small class="rr-at">→ ${loc.name}</small>`), 'located: by its name');
  assert.equal(doing(s, out.st), `heading for ${loc.name}`);
});

test('the runner card: the Badge head, their bust from the handle, never a named character\'s face', async () => {
  const { faceOf } = await import('./dist/portraits.mjs');
  assert.equal(faceOf('quill', 'runner').id, null, 'a runner called quill is not Quill');
  assert.equal(faceOf('quill', 'npc').id, 'quill');
  assert.deepEqual(faceOf('byte', 'runner'), faceOf('byte', 'runner'), 'the same handle, the same face');
  const s = fresh(); s.netSeed = 1054899509;
  const h = castOf(s)[0].handle, html = runnerCard(s, h);
  assert.match(html, /class="rc-head"><pre class="rc-bust f-bust"/);
  assert.match(html, /rc-head[^]*class="rc-tier"[^]*rc-rows/, 'the Tier bar sits in the head');
  assert.doesNotMatch(html, /<dt>Standing<\/dt>/, 'no Standing row');
});
