// The scanner (dist/scanner.mjs, GAME_RULES.md "The scanner"): the schedule, what goes on the air, the reel (a bite,
// the hold zone, holding still never catches one), what a logged station pays, and the view's markup.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, hooks } from './dist/combat.mjs';
import { floorsOf } from './dist/floors.mjs';
import { priceOf } from './dist/market.mjs';
import { startHere, chainDef } from './dist/threads.mjs';
import { serverMarks } from './dist/threads.mjs';
import * as SC from './dist/scanner.mjs';
import { stripMarkup, tapeMarkup, postBanner, postOptions, postTerminalMarkup, postTitle } from './dist/scanner-view.mjs';
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
// The needle a player puts on a station: dead on, then it bites.
function bite(s, st) {
  const tune = { f: st.f, hook: null, lock: 0 };
  assert.equal(SC.tuneStep(s, tune, 0.05, t()), 'bite', `${st.name} bites dead on`);
  return tune;
}
// Seconds of reeling: the player follows the carrier lag seconds late (Infinity: holds still). The time to catch, or null.
function reel(s, st, tune, lag, limit = 60) {
  const dt = 0.05;
  for (let k = 0; k * dt < limit; k++) {
    clock += dt * 1000;
    if (Number.isFinite(lag)) SC.setFreq(tune, SC.carrier(st, t() - lag, tune.hook));
    const r = SC.tuneStep(s, tune, dt, t());
    if (r === 'catch') return (k + 1) * dt;
    if (r === 'lost') return null;
  }
  return null;
}

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

test('a station bites close in and strong enough, never a logged one', () => {
  const s = setup(), st = air(s, 'sparrow');
  const far = { f: st.f + 0.1, hook: null, lock: 0 };
  assert.ok(SC.heard(s, far, t()).s > 0, 'heard within 0.15 MHz');
  assert.equal(SC.tuneStep(s, far, 0.05, t()), null, 'no bite at 0.1 MHz');
  assert.equal(SC.heard(s, { f: st.f + 0.2, hook: null }, t()).s, 0, 'nothing past 0.15 MHz');
  const tune = bite(s, st);
  assert.equal(tune.hook.id, 'sparrow');
  SC.setFreq(tune, st.f + 0.5);
  assert.equal(tune.hook, null, 'leaving the fine window lets go');
  SC.scannerOf(s).log.sparrow = { at: clock };
  assert.equal(SC.tuneStep(s, { f: st.f, hook: null, lock: 0 }, 0.05, t()), null);
});

test('the reel: holding still never catches one, and following a beat late catches each kind', () => {
  for (const id of ['sparrow', 'tarbeach', 'kade']) {
    const s = setup(), st = air(s, id);
    assert.equal(reel(s, st, bite(s, st), Infinity, 60), null, `${st.name}: held still for a minute`);
    const s2 = setup(), st2 = air(s2, id), secs = reel(s2, st2, bite(s2, st2), 0.25, 30);
    assert.ok(secs && secs >= SC.SCANNER.fill && secs <= 9, `${st2.name}: caught 0.25 s late in ${secs} s`);
  }
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

test('the radio: the frequency, the S-meter, the log counts, ??? until clear, the tape, and tooltips in the WoW grammar', () => {
  const s = setup(), st = air(s, 'sparrow');
  const html = stripMarkup(s, { f: 7.415, hook: null, lock: 0 }, t());
  assert.match(html, /7\.415/);
  assert.match(html, /class="sc-meter"/);
  assert.match(html, />0\/4</, 'numbers stations logged');
  assert.match(html, /no carrier/);
  const near = stripMarkup(s, { f: st.f + 0.08, hook: null, lock: 0 }, t());
  assert.match(near, /\?\?\?/, 'a faint station has no name yet');
  SC.catchStation(s, 'sparrow', clock);
  const done = stripMarkup(s, { f: st.f, hook: null, lock: 0 }, t());
  assert.match(done, /SPARROW-9/);
  assert.match(done, /LOGGED/);
  assert.match(done, /class="sc-tape q".*recording/, "on the air: the tape is recording");
  assert.match(postTitle(s, clock), /^Listening Post: /);
  assert.match(postTitle(s, clock), /\n▸ Something is on the air/, 'on the air: the answer line');
});

test('a numbers station pays once; a pirate and a distress call pay again on a later broadcast, once a broadcast', () => {
  const s = setup(), owl = air(s, 'owl');
  SC.catchStation(s, 'owl', clock);
  air(s, 'owl');
  assert.equal(SC.tuneStep(s, { f: owl.f, hook: null, lock: 0 }, 0.05, t()), null, 'a logged numbers station never bites again');
  assert.equal(SC.catchStation(s, 'owl', clock), null);
  const tar = air(s, 'tarbeach');
  SC.catchStation(s, 'tarbeach', clock);
  assert.equal(SC.tuneStep(s, { f: tar.f, hook: null, lock: 0 }, 0.05, t()), null, 'not twice in one broadcast');
  air(s, 'tarbeach');
  assert.equal(bite(s, tar).hook.id, 'tarbeach', 'it bites again on the next');
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

test('the tape: a played-back station reels in as usual, and one caught live leaves nothing to play back', () => {
  const s = setup(), st = air(s, 'tarbeach'), S = SC.scannerOf(s);
  clock = S.air.end; SC.tickScanner(s, clock);
  SC.playBack(s, clock); clock += 5000;
  assert.ok(reel(s, st, bite(s, st), 0.25, 30), 'caught off the tape');
  assert.ok(SC.catchStation(s, 'tarbeach', clock));
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
