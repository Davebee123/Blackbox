// Co-op, a shared fight (docs/coop.md): two saves in one process over an in-memory link. The host's game runs the
// fight; the guest's crewmate is built from the guest's own character and played by the guest's commands; the guest
// sees it as "you"; a win pays the guest on the guest's save only.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, resolveCycle, advance, active, alive, classOf, subOf, cycleLength, loaded, hackerOf } from './dist/combat.mjs';
import { CONFIG } from './dist/data.mjs';
import { benchBuild } from './dist/bench.mjs';
import { play } from './dist/run.mjs';
import { matesOf } from './dist/crew.mjs';
import { planner } from './dist/planner.mjs';
import { memoryPair } from './dist/coop-net.mjs';
import { hostSession, guestSession, hostGame, guestGame, humansReady } from './dist/coop.mjs';

CONFIG.enemyCrit = 0;
const bench = (as, level, handle) => { const s = fresh(); benchBuild(s, as, level); s.profile.handle = handle; return s; };

// Two saves, one link.
export function pairUp({ hostAs = 'breaker', guestAs = 'sysop', level = 10 } = {}) {
  const c = { t: 1_700_000_000_000 };
  c.now = () => c.t;
  const host = bench(hostAs, level, 'ana'), guest = bench(guestAs, level, 'bo');
  const H = hostGame(hostSession(host, { now: c.now }));
  const [hl, gl] = memoryPair();
  H.add(hl);
  const G = guestGame(guestSession(guest, gl, { now: c.now }));
  const tick = () => { c.t += 200; H.tick(); G.tick(); };
  return { c, host, guest, H, G, tick };
}
// The host on SPRAWL-00, in a stray's room fight, the guest seated in it.
const fight = (P) => { play(P.host, 'connect sprawl'); play(P.host, 'cd tmp'); play(P.host, 'attack'); P.tick(); return P.host.encounter; };
const firstLive = (s) => s.encounter.virus.parts.find(alive);

test('the guest fights the host\'s fight as a crewmate built from the guest\'s own character', () => {
  const P = pairUp();
  const e = fight(P);
  assert.ok(active(P.host) && e.rooms, 'a room fight on the host');
  const bo = matesOf(P.host).find((m) => m.who === 'bo');
  assert.ok(bo?.encounter, 'the guest is in it');
  assert.equal(classOf(bo), 'bastion'); assert.equal(subOf(bo), 'sysop');
  assert.deepEqual(loaded(bo).map((it) => it.id).sort(), loaded(P.guest).map((it) => it.id).sort(), 'their own protocols');
  assert.equal(e.party, 2, 'a party of two');
  assert.equal(bo.encounter.queue, null, 'a human: no planner command');
  assert.ok(!JSON.stringify(P.host).includes('sysop'), 'the guest\'s character stays off the host\'s save');
});

test('a cycle turns when both humans are in; the guest\'s command plays on their crewmate', () => {
  const P = pairUp();
  fight(P);
  const e = P.host.encounter, c0 = e.cycle, target = firstLive(P.host);
  command(P.host, `spike ${target.id}`);
  assert.equal(humansReady(P.host), false, 'waiting on the guest');
  assert.equal(e.cycle, c0, 'the host\'s command alone does not turn it');
  P.G.command(`spike ${target.id}`);
  assert.equal(e.cycle, c0 + 1, 'the guest\'s command was the last one in: it turned');
  assert.ok(P.host.logs.some((x) => x.who === 'bo' && ['damage', 'armor', 'miss'].includes(x.type)), 'the guest\'s crewmate hit something');
  // The guest first, then the host: the host's turns it (as the page does: humansReady, then now).
  P.G.command(`spike ${firstLive(P.host).id}`);
  assert.equal(e.cycle, c0 + 1);
  command(P.host, `spike ${firstLive(P.host).id}`);
  if (humansReady(P.host)) command(P.host, 'now');
  assert.equal(e.cycle, c0 + 2);
});

test('the timer turns a cycle with no command from the guest: their auto-repeat plays, on the host', () => {
  const P = pairUp();
  fight(P);
  const e = P.host.encounter, t = firstLive(P.host);
  command(P.host, `spike ${t.id}`); P.G.command(`spike ${t.id}`);
  const before = P.host.serial, c1 = e.cycle;
  advance(P.host, cycleLength(P.host) + 1);
  assert.ok(e.cycle > c1 || !active(P.host), 'the timer turned it');
  assert.ok(P.host.logs.some((x) => x.id > before && x.who === 'bo' && ['damage', 'armor', 'miss'].includes(x.type)), 'the guest\'s auto-repeat fired');
});

test('the guest sees the fight as "you": their own Signal, bar and cooldowns, the host as a crewmate', () => {
  const P = pairUp();
  fight(P);
  const t = firstLive(P.host);
  command(P.host, `spike ${t.id}`); P.G.command(`spike ${t.id}`);
  P.tick();
  const V = P.G.view, bo = matesOf(P.host).find((m) => m.who === 'bo');
  assert.ok(active(V), 'the guest\'s view has the fight');
  assert.equal(V.profile.handle, 'bo');
  assert.equal(classOf(V), 'bastion', 'their class');
  assert.equal(V.run.integrity, bo.run.integrity, 'their Signal');
  assert.equal(V.encounter.cycle, P.host.encounter.cycle, 'the host\'s clock');
  assert.deepEqual(V.encounter.readyAt, bo.encounter.readyAt, 'their cooldowns');
  assert.deepEqual(V.encounter.virus.parts.map((p) => p.integrity), P.host.encounter.virus.parts.map((p) => p.integrity), 'the same virus');
  const mates = matesOf(V);
  assert.deepEqual(mates.map((m) => m.who), ['ana']);
  assert.equal(classOf(mates[0]), 'breaker');
  assert.equal(mates[0].run.integrity, P.host.run.integrity, 'the host\'s Signal on their row');
  assert.ok(V.logs.some((x) => !x.who && ['damage', 'armor', 'miss'].includes(x.type)), 'the guest\'s own hits read as theirs');
  assert.ok(V.logs.some((x) => x.who === 'ana'), 'the host\'s carry the host\'s name');
  assert.ok(!V.logs.some((x) => x.who === 'bo'), 'nothing under the guest\'s own name');
});

test('a won shared fight pays the guest on the guest\'s save, and only there; the host\'s save holds nothing of theirs', () => {
  const P = pairUp();
  fight(P);
  const xp0 = hackerOf(P.guest).xp, lv0 = hackerOf(P.guest).level, hostXp0 = hackerOf(P.host).xp;
  const guestLog0 = P.guest.serial;
  for (let i = 0; i < 80 && active(P.host); i++) {
    const t = firstLive(P.host);
    command(P.host, planner(P.host) || `spike ${t.id}`);
    if (active(P.host)) P.G.command(`spike ${(firstLive(P.host) || t).id}`);
    P.tick();
  }
  assert.equal(P.host.reports.at(-1).result, 'victory');
  P.tick(); P.tick();
  assert.ok(hackerOf(P.guest).xp > xp0 || hackerOf(P.guest).level > lv0, 'the guest earned XP');
  assert.ok(P.guest.logs.some((x) => x.id > guestLog0 && x.type === 'xp' && /with ana/.test(x.message)), 'on their own log');
  assert.ok(P.guest.logs.filter((x) => x.id > guestLog0).every((x) => ['xp', 'code', 'loot', 'level-up', 'fresh', 'drop', 'info'].includes(x.type)), 'only their rewards touched their save');
  assert.equal(P.guest.encounter, null, 'the guest\'s own save never held the host\'s fight');
  assert.equal(P.guest.run, null);
  assert.ok(hackerOf(P.host).xp !== hostXp0, 'the host was paid their own share');
  const saved = JSON.stringify(P.host);
  assert.ok(!saved.includes('sysop') && !saved.includes('_coop'), 'no guest character, no seat in the host\'s save');
  assert.ok(P.G.view.logs.some((x) => x.type === 'victory'), 'the guest saw the win');
  assert.ok(P.G.view.logs.some((x) => x.type === 'xp' && !x.who && /with ana/.test(x.message)), 'and their own XP line');
  assert.ok(!P.G.view.logs.some((x) => x.type === 'xp' && !/with ana/.test(x.message)), 'never the host\'s XP');
});

test('a guest who drops mid-fight becomes a bot for the rest of it, then leaves', () => {
  const P = pairUp();
  fight(P);
  P.G.link.close();
  const bo = matesOf(P.host).find((m) => m.who === 'bo');
  assert.ok(bo.seat.bot, 'the planner plays them now');
  assert.ok(P.host.logs.some((x) => x.type === 'status' && /bo dropped/.test(x.message)));
  command(P.host, `spike ${firstLive(P.host).id}`);
  assert.ok(humansReady(P.host), 'nobody left to wait for');
  for (let i = 0; i < 80 && active(P.host); i++) { command(P.host, planner(P.host) || 'hold'); resolveCycle(P.host); }
  assert.ok(P.host.logs.some((x) => x.who === 'bo' && ['damage', 'armor'].includes(x.type)), 'the bot fought on');
  P.tick();
  assert.ok(!matesOf(P.host).some((m) => m.who === 'bo'), 'gone after the fight');
});

test('the host dropping sends the guest home, rewards kept', () => {
  const P = pairUp();
  fight(P);
  assert.ok(P.G.view);
  P.H.guests[0].link.close();
  assert.ok(P.G.closed);
  assert.match(P.G.notes.at(-1).message, /ana dropped\. You're home\./);
});

test('the guest\'s commands out of a fight are refused, and so are the host\'s own (jack out, pause)', () => {
  const P = pairUp();
  play(P.host, 'connect sprawl'); P.tick();
  P.G.command('spike x');
  assert.ok(P.host.logs.some((x) => x.who === 'bo' && x.type === 'warning' && /ana leads the party/.test(x.message)));
  play(P.host, 'cd tmp'); play(P.host, 'attack'); P.tick();
  P.G.command('jack out');
  assert.ok(P.host.logs.some((x) => x.who === 'bo' && /Only ana can do that/.test(x.message)));
  assert.ok(active(P.host), 'still fighting');
  P.tick();
  assert.ok(!P.G.view.logs.some((x) => x.type === 'warning' && x.who), 'another player\'s refusals stay theirs');
});
