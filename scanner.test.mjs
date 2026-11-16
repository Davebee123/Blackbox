// The scanner (dist/scanner.mjs, GAME_RULES.md "The scanner"): the schedule, what goes on the air, Tune's pad (finding,
// the lock, the symbols, the air window, lost and the tape), what a logged station pays, and the view's markup.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, hooks } from './dist/combat.mjs';
import { floorsOf } from './dist/floors.mjs';
import { priceOf } from './dist/market.mjs';
import { startHere, chainDef } from './dist/threads.mjs';
import { serverMarks } from './dist/threads.mjs';
import * as SC from './dist/scanner.mjs';
import { tuneMarkup, padSvg, playAt, tapeMarkup, postBanner, postOptions, postTerminalMarkup, postTitle } from './dist/scanner-view.mjs';
import { mapMarkup } from './dist/view.mjs';
import './dist/netrooms.mjs';

let clock = 1_700_000_000_000;
hooks.now = () => clock;
const t = () => clock / 1000;

// A character with five worm servers traced on floor 1 and the hubs found.
function setup({ servers = 5, hubs = true } = {}) {
  const s = fresh(); s.tutorialCompleted = true;
  const arch = s.loadout.archetype;
  floorsOf(s).reached = 1;
  s.hackers = { [arch]: { level: 6, xp: 0 } };
  for (let i = 0; i < servers; i++) command(s, 'developer location worm');
  if (hubs) { command(s, 'mail'); s.mail.boardOpen = true; s.hubFound = { kestrel: true, lantern: true }; }
  SC.scannerOf(s).found = true;
  return s;
}
// Puts a station on the air from now, fully faded in.
function air(s, id) { SC.scannerOf(s); SC.startBroadcast(s, clock, id); clock += 5000; return SC.stationById(id); }
// Steps an attempt dt at a time for up to `secs`; me(A, t) places your dot each step (null: it stays). Stops early when
// until(events, A) is true. Returns every event, each with its time.
function run(s, A, secs, { me = null, until = () => false, onStep = null } = {}) {
  const dt = 0.05, out = [];
  for (let k = 0; k * dt < secs; k++) {
    clock += dt * 1000;
    if (me) { const p = me(A, t()); if (p) A.me = p; }
    onStep?.(A, t());
    const ev = SC.padStep(s, A, dt, t());
    for (const e of ev) out.push({ ...e, t: t() });
    if (until(ev, A)) break;
  }
  return out;
}
const follow = (A, t) => SC.cloudOf(A, t); // dead on the cloud
// An attempt taken to sync: found, then the dot kept on the cloud with the right decoder.
function synced(s, id) {
  air(s, id);
  const A = SC.attempt(s, t(), { decoder: SC.PLAY[SC.stationById(id).kind].decoder });
  run(s, A, 30, { me: follow, until: () => A.stage === 'sym' });
  assert.equal(A.stage, 'sym', `${id} syncs`);
  return A;
}
// Catches every symbol as it lights (a hold for a long one).
const catcher = (s) => (A, now) => {
  if (A.stage !== 'sym') return;
  if (A.dec.hold) return;
  const dot = A.dec.dots.find((d) => SC.symLive(d, now) && now - d.born > 0.15);
  if (dot) SC.tap(s, A, [dot.x, dot.y], now);
};

test('the schedule: the first broadcast after 5 minutes, on 2–3 minutes, then 15–30 minutes quiet', () => {
  const s = setup(), S = SC.scannerOf(s);
  assert.equal(S.next, clock + SC.SCANNER.first * 1000);
  assert.equal(SC.tickScanner(s, clock), null);
  clock = S.next;
  assert.equal(SC.tickScanner(s, clock), 'start');
  const len = (S.air.end - S.air.start) / 1000;
  assert.ok(len >= 120 && len <= 180, `on ${len} s`);
  assert.ok(SC.onAir(s, clock));
  clock = S.air.end;
  assert.equal(SC.tickScanner(s, clock), 'end');
  const quiet = (S.next - clock) / 60000;
  assert.ok(quiet >= 15 && quiet <= 30, `quiet ${quiet} min`);
  assert.equal(S.air, null);
});

test('what goes on the air: stations not yet logged first, then the ones that pay again, a pirate only with a hub, a distress call only with a server', () => {
  const bare = setup({ servers: 0, hubs: false });
  assert.deepEqual(new Set(SC.pool(bare).map((x) => x.kind)), new Set(['numbers']));
  const s = setup();
  assert.deepEqual(new Set(SC.pool(s).map((x) => x.kind)), new Set(['numbers', 'pirate', 'distress']));
  const S = SC.scannerOf(s);
  for (const st of SC.STATIONS) if (st.id !== 'owl') S.log[st.id] = { at: clock };
  for (let i = 0; i < 5; i++) assert.equal(SC.startBroadcast(s, clock).id, 'owl', 'the one not yet logged');
  S.log.owl = { at: clock };
  assert.deepEqual(new Set(SC.pool(s).map((x) => x.kind)), new Set(['pirate', 'distress']), 'all logged: the ones that still pay');
  const p = SC.startBroadcast(s, clock, 'tarbeach'), d = SC.startBroadcast(s, clock, 'kade');
  assert.ok(['kestrel', 'lantern'].includes(p.hub));
  assert.ok(s.locations.some((l) => l.id === d.loc));
  assert.match(SC.textOf(s, SC.stationById('kade'), d), new RegExp(s.locations.find((l) => l.id === d.loc).name.toLowerCase()));
});

test('search: the station is found when your light is over its cloud, not before; a logged one has no attempt', () => {
  const s = setup(), st = air(s, 'sparrow');
  const A = SC.attempt(s, t(), { me: [10, 10] });
  assert.equal(A.stage, 'search');
  assert.deepEqual(run(s, A, 2, { me: (A, now) => { const p = SC.cloudOf(A, now); return [p[0] + 200, p[1]]; } }), [], 'two lights away: nothing');
  const ev = run(s, A, 1, { me: (A, now) => { const p = SC.cloudOf(A, now); return [p[0] + SC.PAD.light * 0.85, p[1]]; }, until: (e) => e.length });
  assert.deepEqual(ev.map((e) => e.e), ['found']);
  assert.equal(A.stage, 'lock');
  SC.catchStation(s, st.id, clock);
  air(s, 'sparrow');
  assert.equal(SC.attempt(s, t()), null, 'a logged numbers station: nothing to catch');
});

test('the lock fills in 5 s in the hold ring and drains at 1/8 a second outside; the wrong decoder fills at half speed', () => {
  const syncAt = (decoder) => {
    const s = setup(); air(s, 'sparrow');
    const A = SC.attempt(s, t(), { decoder });
    const ev = run(s, A, 30, { me: follow, until: () => A.stage === 'sym' });
    return ev.at(-1).t - ev[0].t;
  };
  const right = syncAt('vox'), wrong = syncAt('data');
  assert.ok(Math.abs(right - SC.PAD.fill) < 0.15, `VOX on a numbers station: ${right} s`);
  assert.ok(Math.abs(wrong - 2 * SC.PAD.fill) < 0.15, `DATA on it: ${wrong} s`);
  const s = setup(); air(s, 'sparrow');
  const A = SC.attempt(s, t());
  run(s, A, 3, { me: follow });
  const lk = A.lock;
  run(s, A, 1, { me: (A, now) => { const p = SC.cloudOf(A, now); return [p[0] + SC.PAD.hold + 20, p[1]]; } });
  assert.ok(Math.abs(lk - A.lock - 1 / SC.PAD.drain) < 0.02, 'a second out of the ring drains an eighth');
});

test('a distress call: it fades, and the lock waits while it does; it is never found faded', () => {
  const s = setup(); air(s, 'kade');
  const A = SC.attempt(s, t(), { decoder: 'cw' });
  let pausedSteps = 0, foundFaded = false;
  run(s, A, 12, {
    me: follow,
    onStep: (A, now) => {
      if (A.stage === 'lock' && SC.fadedNow(A, now)) { const before = A.lock; SC.padStep(s, A, 0.05, now); if (A.lock === before) pausedSteps++; }
    },
    until: (ev) => { if (ev.some((e) => e.e === 'found') && SC.visOf(A, t()) < SC.PAD.faded) foundFaded = true; return A.stage === 'sym'; },
  });
  assert.ok(pausedSteps > 5, `the lock held still while it faded (${pausedSteps} steps)`);
  assert.equal(foundFaded, false);
});

test('the symbols: numbers one at a time, pirates in bursts of 3, a distress call SOS in order with its long ones held', () => {
  const s = setup(), A = synced(s, 'sparrow'), t0 = t();
  const syms = run(s, A, 3, { onStep: catcher(s) }).filter((e) => e.e === 'sym');
  assert.ok(Math.abs(syms[0].t - t0 - SC.PAD.sync) < 0.06, 'the first lights after the sync');
  assert.ok(syms.every((e) => e.delay === 0));
  assert.ok(Math.abs(syms[1].t - syms[0].t - SC.PLAY.numbers.every) < 0.06, 'then every 0.62 s');
  const s2 = setup(), P = synced(s2, 'tarbeach'), burst = run(s2, P, 2).filter((e) => e.e === 'sym').slice(0, 3);
  assert.deepEqual(burst.map((e) => +e.delay.toFixed(2)), [0, 0.16, 0.32], 'a pirate: three, 0.16 s apart');
  assert.equal(new Set(burst.map((e) => e.i)).size, 3, 'at three positions');
  assert.ok(P.dec.dots.every((d) => d.life >= 0.55 && d.life <= 1.1));
  const s3 = setup(), D = synced(s3, 'kade');
  const kinds = [];
  run(s3, D, 40, { onStep: (A, now) => { const d = A.dec?.dots.find((x) => SC.symLive(x, now) && now - x.born > 0.15); if (!d || A.dec.hold) return; kinds.push(d.dash ? '-' : '.'); SC.tap(s3, A, [d.x, d.y], now); }, until: () => D.stage !== 'sym' });
  assert.equal(kinds.join(''), '...---...');
  assert.equal(D.stage, 'logged');
});

test('a long one needs 0.5 s held; let go early and it waits, and a missed one comes back', () => {
  const s = setup(), D = synced(s, 'kade');
  run(s, D, 20, { onStep: catcher(s), until: () => D.dec.got === 3 });
  run(s, D, 5, { until: () => D.dec.dots.some((d) => SC.symLive(d, t())) });
  const dash = D.dec.dots.find((d) => SC.symLive(d, t()));
  assert.ok(dash.dash, 'the fourth is a long one');
  SC.tap(s, D, [dash.x, dash.y], t());
  run(s, D, 0.3);
  SC.release(D);
  assert.equal(D.dec.got, 3, 'let go after 0.3 s: not caught');
  const ev = run(s, D, 5, { until: (e) => e.some((x) => x.e === 'miss') });
  assert.ok(ev.some((e) => e.e === 'miss'));
  run(s, D, 2, { until: (e) => e.some((x) => x.e === 'sym') });
  const again = D.dec.dots.find((d) => !d.done);
  assert.ok(again?.dash, 'it comes back');
  SC.tap(s, D, [again.x, again.y], t());
  run(s, D, 0.6);
  assert.equal(D.dec.got, 4, 'held 0.5 s: caught');
});

test('catching every symbol logs it and pays; too many misses lose the frame', () => {
  for (const id of ['sparrow', 'tarbeach']) {
    const s = setup(), A = synced(s, id);
    run(s, A, 30, { onStep: catcher(s), until: () => A.stage !== 'sym' });
    assert.equal(A.stage, 'logged', `${id}: logged`);
    assert.equal(A.dec.got, SC.needOf(A.kind));
    assert.ok(SC.logged(s, id));
  }
  for (const id of ['sparrow', 'tarbeach', 'kade']) {
    const s = setup(), A = synced(s, id), K = SC.PLAY[A.kind];
    const ev = run(s, A, 30, { until: () => A.stage !== 'sym' });
    assert.equal(A.stage, 'lost');
    assert.equal(A.out.why, 'frame');
    assert.equal(ev.filter((e) => e.e === 'miss').length, K.strikes, `${id}: lost on miss ${K.strikes}`);
    assert.ok(!SC.logged(s, id));
  }
});

test('the air window: the lesser of the kind\'s window and the broadcast\'s time left; lost when it runs out before sync', () => {
  const s = setup(); air(s, 'tarbeach');
  const A = SC.attempt(s, t());
  assert.equal(Math.round(SC.airLeft(s, A, t())), SC.PLAY.pirate.air);
  SC.scannerOf(s).air.end = clock + 12000;
  assert.equal(Math.round(SC.airLeft(s, A, t())), 12, 'the broadcast has less');
  const s2 = setup(); air(s2, 'sparrow');
  const B = SC.attempt(s2, t(), { me: [10, 10] });
  const ev = run(s2, B, 60, { until: () => B.stage === 'lost' });
  assert.equal(B.out.why, 'air');
  assert.ok(Math.abs(ev.at(-1).t - B.t0 - SC.PLAY.numbers.air) < 0.1, 'at 45 s');
});

test('lost: it signs off onto the tape, Play back puts it on the air once; lost again, nothing left', () => {
  const s = setup(); air(s, 'sparrow');
  const A = SC.attempt(s, t(), { me: [10, 10] });
  run(s, A, 60, { until: () => A.stage === 'lost' });
  assert.equal(SC.onAir(s, clock), null, 'it signed off');
  assert.equal(SC.playable(s, clock), '', 'on tape');
  assert.ok(!playAt(s, A, t()), 'Play back shows once the loss has typed out');
  assert.ok(playAt(s, A, t() + 2.5));
  assert.ok(SC.playBack(s, clock));
  const B = SC.attempt(s, t(), { me: [10, 10] });
  assert.ok(B, 'a new search on the tape');
  run(s, B, 60, { until: () => B.stage === 'lost' });
  assert.match(SC.playable(s, clock), /Already played back/);
  assert.equal(playAt(s, B, t() + 3), null);
  assert.match(padSvg(s, B, t() + 3), /nothing left on tape/);
  assert.ok(!SC.logged(s, 'sparrow'), 'a loss costs nothing');
});

test('Tune: lantern-rx on post-07, the signal as 9 cells, the decoders with WoW tooltips; the pad at each stage', () => {
  const s = setup();
  const idle = tuneMarkup(s, null, t());
  assert.match(idle, /lantern-rx <em>post-07<\/em>/);
  assert.equal((idle.match(/<i[ >]/g) || []).length, 9);
  assert.match(idle, /title="VOX: Decoder\. Reads numbers stations\./);
  assert.match(idle, /aria-pressed="true"[^>]*>VOX|data-sc-dec="vox" aria-pressed="true"/);
  assert.match(idle, /viewBox="0 0 900 562"/);
  assert.match(idle, /DEAD AIR/);
  assert.doesNotMatch(idle, /MHz|S\d/, 'no dial, no S-meter readout');
  air(s, 'sparrow');
  const A = SC.attempt(s, t());
  assert.match(padSvg(s, A, t()), /class="p-air"/, 'the air bar');
  assert.doesNotMatch(padSvg(s, A, t()), /PHASE/);
  run(s, A, 1, { me: follow });
  assert.match(padSvg(s, A, t()), /PHASE/, 'locking: the axes');
  assert.match(padSvg(s, A, t()), /class="p-arc/, 'the lock arc');
  run(s, A, 10, { me: follow, until: () => A.stage === 'sym' });
  run(s, A, 1.2);
  const sym = padSvg(s, A, t());
  assert.doesNotMatch(sym, /PHASE|p-air"/, 'synced: no axes, no air bar');
  assert.match(sym, /class="p-sym"/);
  run(s, A, 30, { onStep: catcher(s), until: () => A.stage === 'logged' });
  const done = padSvg(s, A, t() + 4);
  assert.match(done, /LOGGED/);
  assert.match(done, /SPARROW-9/);
  assert.match(done, /Retired · lore/);
  assert.match(done, /p-ascii/);
});

test('a numbers station logs its lore line and signs off 8 s later', () => {
  const s = setup(), st = air(s, 'owl');
  const e = SC.catchStation(s, 'owl', clock);
  assert.ok(e && SC.logged(s, 'owl'));
  assert.equal(SC.scannerOf(s).air.end, clock + 8000);
  assert.equal(SC.payText(s, st), st.lore.line);
  assert.equal(SC.catchStation(s, 'owl', clock), null, 'once');
});

test("a pirate's tip moves its hub's price for a while", () => {
  const s = setup(), st = air(s, 'church'), hub = SC.scannerOf(s).air.hub;
  const before = priceOf(s, hub, 'worm');
  SC.catchStation(s, 'church', clock);
  assert.ok(Math.abs(priceOf(s, hub, 'worm') / before - st.tip.mult) < 1e-9);
  assert.ok(SC.tipOf(s, hub));
  clock += st.tip.mins * 60000 + 1;
  SC.tickScanner(s, clock);
  assert.equal(priceOf(s, hub, 'worm'), before, 'back to normal');
  assert.equal(SC.scannerOf(s).tips.length, 0);
});

test('a distress call starts a thread on the server it names, its ! on the map', () => {
  const s = setup(), st = air(s, 'homing'), at = SC.scannerOf(s).air.loc;
  SC.catchStation(s, 'homing', clock);
  const loc = s.locations.find((l) => l.id === at), start = startHere(s, loc);
  assert.equal(start.chain, st.chain);
  assert.equal(serverMarks(s)[at].mark, '!');
  assert.match(SC.payText(s, st), new RegExp(chainDef(st.chain).title));
  assert.ok(!SC.distressTargets(s).includes(loc), 'one thread a server');
});

test('a numbers station pays once; a pirate and a distress call pay again on a later broadcast, once a broadcast', () => {
  const s = setup(), owl = air(s, 'owl');
  SC.catchStation(s, 'owl', clock);
  air(s, 'owl');
  assert.equal(SC.attempt(s, t()), null, 'a logged numbers station is nothing to catch again');
  assert.equal(SC.catchStation(s, 'owl', clock), null);
  const tar = air(s, 'tarbeach');
  SC.catchStation(s, 'tarbeach', clock);
  assert.equal(SC.attempt(s, t()), null, 'not twice in one broadcast');
  air(s, 'tarbeach');
  assert.equal(SC.attempt(s, t()).id, 'tarbeach', 'again on the next');
  assert.ok(SC.catchStation(s, 'tarbeach', clock));
  assert.equal(SC.scannerOf(s).log.tarbeach.n, 2);
  air(s, 'kade');
  const first = SC.scannerOf(s).air.loc;
  SC.catchStation(s, 'kade', clock);
  air(s, 'kade');
  const second = SC.scannerOf(s).air.loc;
  assert.notEqual(second, first, 'a server with a thread on it is never named again');
  SC.catchStation(s, 'kade', clock);
  assert.equal(startHere(s, s.locations.find((l) => l.id === second)).chain, 'tpl:talk:0');
});

test('the tape: it holds the last broadcast, Play back puts it back on the air once, and the next broadcast replaces it', () => {
  const s = setup(), S = SC.scannerOf(s);
  assert.equal(SC.tapeOf(s), null);
  assert.match(SC.playable(s, clock), /Nothing on tape/);
  clock = S.next; SC.tickScanner(s, clock);
  const first = { ...S.air }, len = first.end - first.start;
  assert.equal(SC.tapeOf(s).id, first.id, 'the post records the broadcast');
  assert.match(SC.playable(s, clock), /on the air/, 'not while it is live');
  clock = first.end; SC.tickScanner(s, clock);
  const next = S.next;
  assert.equal(SC.playable(s, clock), '');
  clock += 60000;
  const back = SC.playBack(s, clock);
  assert.equal(back.id, first.id);
  assert.equal(back.end - back.start, len, 'as long as it ran');
  assert.ok(SC.onAir(s, clock));
  assert.match(SC.playable(s, clock), /on the air/);
  clock = back.end; SC.tickScanner(s, clock);
  assert.equal(S.next, next, 'a playback keeps the schedule');
  assert.match(SC.playable(s, clock), /Already played back/);
  assert.equal(SC.playBack(s, clock), null, 'once');
  clock = S.next; SC.tickScanner(s, clock);
  assert.equal(SC.tapeOf(s).start, clock, 'the next broadcast replaces it');
  assert.equal(SC.tapeOf(s).played, undefined);
});

test('the tape: a played-back station is caught as usual, and one caught live leaves nothing to play back', () => {
  const s = setup(); air(s, 'tarbeach'); const S = SC.scannerOf(s);
  clock = S.air.end; SC.tickScanner(s, clock);
  SC.playBack(s, clock);
  const A = SC.attempt(s, t(), { decoder: 'data' });
  run(s, A, 30, { me: follow, until: () => A.stage === 'sym' });
  run(s, A, 30, { onStep: catcher(s), until: () => A.stage !== 'sym' });
  assert.equal(A.stage, 'logged', 'caught off the tape');
  assert.equal(S.log.tarbeach.n, 1);
  const s2 = setup(), S2 = SC.scannerOf(s2);
  air(s2, 'owl'); SC.catchStation(s2, 'owl', clock);
  clock = S2.air.end; SC.tickScanner(s2, clock);
  assert.match(SC.playable(s2, clock), /Already logged/);
  assert.match(tapeMarkup(s2, clock), /LOGGED/);
});

test('the Listening Post: an ssh banner, LANTERN on the line, the menu, ON THE AIR while a broadcast is up', () => {
  const s = setup();
  const quiet = postBanner(s, clock).map((l) => l.html).join('\n');
  assert.match(quiet, /ssh .*@post-07/);
  assert.match(quiet, /instant/);
  assert.doesNotMatch(quiet, /ON THE AIR/);
  assert.deepEqual(postOptions(s, clock).map((o) => o.key), ['tune', 'recordings', 'log']);
  air(s, 'sparrow');
  const live = postBanner(s, clock).map((l) => l.html).join('\n');
  assert.match(live, /ON THE AIR/);
  assert.match(live, /lantern@post-07:<\/b> carrier near 6/);
  assert.match(postOptions(s, clock)[0].meta, /on air/);
  assert.match(postOptions(s, clock)[2].meta, /^0\/10$/);
  const page = postTerminalMarkup(s, postBanner(s, clock), 'tune', clock);
  assert.match(page, /data-sc-root/, 'the Tune window holds the radio');
  assert.match(page, /\[?0?.*disconnect/);
});

test('the clue: the post is off the map until the first broadcast is on the air, then found once; an old radio save knows it', () => {
  const s = fresh(); s.tutorialCompleted = true;
  const S = SC.scannerOf(s);
  assert.equal(SC.postFound(s), false);
  assert.doesNotMatch(mapMarkup(s, 'server'), /data-select="post"/);
  assert.equal(SC.findPost(s, clock), false, 'nothing on the air yet');
  clock = S.next; SC.tickScanner(s, clock);
  assert.equal(SC.findPost(s, clock), true);
  assert.equal(SC.findPost(s, clock), false, 'once');
  assert.match(mapMarkup(s, 'server'), /data-select="post"/);
  const old = fresh(); old.scanner = { log: {}, tips: [], n: 3, air: null, next: clock };
  assert.equal(SC.postFound(old), false);
  SC.scannerOf(old);
  assert.equal(SC.postFound(old), true, 'keyed on the field: a save from the top-bar radio');
});
