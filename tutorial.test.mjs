import test from 'node:test';
import assert from 'node:assert/strict';
import { beginTutorial, submitTutorial, tickTutorial, continueTutorial, LESSONS } from './dist/tutorial.mjs';
import { CONFIG } from './dist/data.mjs';
// These tests check exact numbers: no crits (gear.test.mjs covers them).
CONFIG.baseCrit = 0;
CONFIG.enemyCrit = 0;
CONFIG.misses = false; // and no misses
CONFIG.powerPerLevel = 0; // flat numbers at every level (level tests turn it back on)
CONFIG.gap = { dealt: 0, taken: 0, floor: 1, below: 0 }; // and no level-gap scaling (combat.test.mjs tests it)

const settings = { sound: false, motion: true };
const runCycle = (t) => { for (let i = 0; i < 20 && ['running', 'live'].includes(t.phase); i++) tickTutorial(t, 500); };

test('every lesson can be completed in order and ends in victory', () => {
  const t = beginTutorial(settings);
  for (let i = 0; i < LESSONS.length - 1; i++) {
    submitTutorial(t, LESSONS[i].command);
    assert.equal(t.phase, 'running', `lesson ${i + 1}: ${t.error}`);
    runCycle(t);
    assert.equal(t.phase, 'review', `lesson ${i + 1} should pause for review`);
    continueTutorial(t);
  }
  submitTutorial(t, LESSONS.at(-1).command);
  assert.equal(t.phase, 'live');
  for (let i = 0; i < 200 && t.phase === 'live'; i++) {
    if (!t.state.encounter.lastAttack && !t.state.encounter.queue) submitTutorial(t, 'bash pulse');
    tickTutorial(t, CONFIG.cycleMs / 5);
  }
  assert.equal(t.phase, 'complete');
  assert.equal(t.state.encounter.phase, 'victory');
});

test('the wrong command is refused without advancing', () => {
  const t = beginTutorial(settings);
  submitTutorial(t, 'scan');
  assert.equal(t.phase, 'ready');
  assert.match(t.error, /bash encryptor/);
});

test('lesson 3 breaks the Encryptor before it patches, and its attack stops', () => {
  const t = beginTutorial(settings);
  for (let i = 0; i < 3; i++) { submitTutorial(t, LESSONS[i].command); runCycle(t); if (i < 2) continueTutorial(t); }
  const enc = t.state.encounter.virus.parts.find((p) => p.id === 'encryptor');
  assert.equal(enc.integrity, 0);
  assert.ok(!t.state.encounter.virus.parts.find((p) => p.id === 'encryptor').attack || !t.state.encounter.virus.parts.find((p) => p.id === 'encryptor').integrity);
});

// ---------- the rooms tour (tips.mjs TOUR): your first server's room map, a step at a time ----------
import { fresh, finish, restore, hooks } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import * as FP from './dist/floorplan.mjs';
import { roomsMarkup, closePop } from './dist/floorplan-view.mjs';
import { nextTip, markSeen, TOUR, skipTour, seenOf, tourDone } from './dist/tips.mjs';

// "Is it on screen": the selector's last part (less any :not()) is in the room page's markup.
const shows = (s) => {
  const html = roomsMarkup(s);
  return (sel) => {
    const last = sel.trim().split(/\s+/).at(-1).replace(/:not\([^)]*\)/g, '');
    const bits = [...last.matchAll(/\.([\w-]+)|\[([\w-]+)="([^"]+)"\]|#([\w-]+)/g)];
    return bits.length > 0 && bits.every(([, cls, attr, val, id]) => (cls ? new RegExp(`class="[^"]*\\b${cls}\\b`).test(html) : attr ? html.includes(`${attr}="${val}"`) : html.includes(`id="${id}"`)));
  };
};
const tour = (s) => { const t = nextTip(s, 'rooms', shows(s)); return t?.tour ? t : null; };
const winRoom = (s) => { s.encounter.virus.parts.forEach((p) => { p.integrity = 0; }); finish(s, 'victory'); FP.settle(s); };
const newPlayer = () => { const s = fresh(); s.tutorialCompleted = true; return s; };

test('the rooms tour: every step one or two short sentences, on the rooms page, kept apart from the tips', () => {
  assert.deepEqual(TOUR.map((t) => t.id), ['tour-walk', 'tour-engage', 'tour-scan', 'tour-cache', 'tour-hunter', 'tour-rest', 'tour-jackout']);
  for (const t of TOUR) {
    assert.equal(t.page, 'rooms');
    assert.ok(t.done, `${t.id} moves on when you do it`);
    const n = (t.text.match(/[.!?](\s|$)/g) || []).length + (t.more ? 1 : 0);
    assert.ok(n >= 1 && n <= 2, `${t.id}: ${n} sentences`);
    assert.ok(t.text.length <= 140, `${t.id} is short`);
  }
});

test('the rooms tour on SPRAWL-00, in order: walk in, the virus\'s card, then Jack out; each step moves on when you do it', () => {
  const s = newPlayer();
  play(s, 'connect sprawl');
  closePop(s);
  let t = tour(s);
  assert.equal(t.id, 'tour-walk', 'first: a room you can walk into');
  assert.equal(tourDone(s), 0);
  const base = t.mark(s);
  assert.equal(t.done(s, base), false);
  const room = FP.exits(s)[0];
  FP.act(s, 'go', room.id);
  assert.equal(t.done(s, base), true, 'walking in is the step done');
  markSeen(s, t.id);
  t = tour(s);
  assert.equal(t.id, 'tour-engage', 'then the virus\'s card: Engage or Step back');
  assert.equal(t.also, '#fp-pop [data-rooms="back"]', 'Step back counts too');
  FP.act(s, 'engage');
  assert.equal(t.done(s, t.mark?.(s)), true, 'engaged');
  markSeen(s, t.id);
  winRoom(s);
  t = tour(s);
  assert.equal(t.id, 'tour-jackout', 'a fight won: Jack out (SPRAWL-00 has no cache, hunter or rest room)');
  assert.match(t.text, /bank your pack/);
  play(s, 'jack out');
  assert.equal(t.done(s, t.mark?.(s)), true);
  markSeen(s, t.id);
  assert.equal(tourDone(s), 3);
});

test('the rooms tour waits its turn: no virus card before the walk, no Jack out before a fight is won', () => {
  const s = newPlayer();
  play(s, 'connect sprawl');
  FP.act(s, 'go', FP.exits(s)[0].id); // walked in without the tour: the virus's card is up
  const all = (sel) => TOUR.some((x) => x.at === sel); // every tour step's thing on screen
  assert.notEqual(nextTip(s, 'rooms', all)?.id, 'tour-engage', 'the engage step waits for the walk step');
  markSeen(s, 'tour-walk');
  assert.equal(nextTip(s, 'rooms', all)?.id, 'tour-engage');
  markSeen(s, 'tour-engage');
  FP.act(s, 'back');
  assert.ok(!['tour-jackout'].includes(nextTip(s, 'rooms', all)?.id), 'no fight won yet');
});

test('the rooms tour meets a cache, the hunter and the rest room when they first turn up', () => {
  const was = hooks.now;
  let clock = Date.UTC(2026, 0, 1);
  hooks.now = () => clock;
  const s = newPlayer();
  FP.outfit(s, { cls: 'breaker', level: 10, gearSeed: 1 });
  FP.startRooms(s, { seed: 4, kind: 'Mailhub', size: 'medium', level: 10, floor: 2 });
  FP.connect(s);
  markSeen(s, 'tour-walk');
  const R = s.rooms, place = (id) => { R.at = id; R.visit.walked[id] = true; R.screen = null; FP.look(s); };
  // The hunter: on the strip; it moves on with your next move.
  let t = tour(s);
  assert.equal(t.id, 'tour-hunter');
  assert.match(t.text, /walk or wait/);
  const m = t.mark(s);
  FP.act(s, 'wait');
  assert.equal(t.done(s, m), true, 'a wait moves it on');
  markSeen(s, t.id);
  // A cache: Take it (or leave it).
  const cache = FP.roomList(s).find((r) => r.kind === 'cache' && !r.mirror);
  place(cache.id);
  t = tour(s);
  assert.equal(t.id, 'tour-cache');
  const c = t.mark(s);
  FP.act(s, 'pull');
  assert.equal(t.done(s, c), true, 'taken');
  markSeen(s, t.id);
  // The rest room, when there's Signal to get back.
  const rest = FP.roomList(s).find((r) => r.kind === 'rest');
  R.signal = 10;
  place(rest.id);
  t = tour(s);
  assert.equal(t.id, 'tour-rest');
  const r = t.mark(s);
  FP.act(s, 'rest');
  assert.equal(t.done(s, r), true, 'rested');
  hooks.now = was;
});

test('the rooms tour shows once a save: done steps stay done through a save, a new save starts it again, and Skip tour or tips off end it', () => {
  const s = newPlayer();
  play(s, 'connect sprawl');
  closePop(s);
  assert.equal(tour(s)?.id, 'tour-walk');
  markSeen(s, 'tour-walk');
  assert.ok(seenOf(s, 'tour-walk') && !s.settings.seen['tour-walk'], 'kept on the save, not with your settings');
  const back = restore(JSON.parse(JSON.stringify(s)));
  assert.ok(seenOf(back, 'tour-walk'), 'it survives a save');
  // A new save: the tour again (the settings, and the tips seen there, carry over to a new game; the tour doesn't).
  const t = newPlayer();
  t.settings = structuredClone(s.settings);
  play(t, 'connect sprawl');
  closePop(t);
  assert.equal(tour(t)?.id, 'tour-walk');
  // Skip tour: none of it again.
  skipTour(t);
  assert.equal(tourDone(t), TOUR.length);
  assert.equal(nextTip(t, 'rooms', (sel) => TOUR.some((x) => x.at === sel)), null, 'skipped');
  // Tips off: no tour.
  const u = newPlayer();
  u.settings.tips = false;
  play(u, 'connect sprawl');
  closePop(u);
  assert.equal(nextTip(u, 'rooms', shows(u)), null);
});
