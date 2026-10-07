import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, command, addLocation } from './dist/combat.mjs';
import { play } from './dist/run.mjs';
import { MEMORY, memoryCap, liveCount, isLive, memoryCost, branchOf, joinCost } from './dist/memory.mjs';
import { outposts } from './dist/outpost.mjs';
MEMORY.on = true; // these test the memory system itself (the game is trying it switched off)

const world = (n) => { const s = fresh(); s.tutorialCompleted = true; for (let i = 0; i < n; i++) { const l = addLocation(s, 'worm', 1); command(s, `attach ${l.id}`); } return s; };

test('memory: a find arrives off your network; connecting asks for memory, not credits, the first time', () => {
  const s = world(0);
  const loc = addLocation(s, 'worm', 1);
  assert.ok(loc.detached && loc.fresh && !isLive(s, loc));
  assert.deepEqual(joinCost(s, loc), { add: 1, used: 0, cap: memoryCap(s), fits: true });
  const c0 = s.server.credits;
  command(s, `attach ${loc.id}`);
  assert.ok(isLive(s, loc) && !loc.fresh);
  assert.equal(s.server.credits, c0, 'the first connection is free of credits');
  assert.equal(liveCount(s), 1);
});

test('memory: past the cap, a new find arrives detached; you can\'t connect to it', () => {
  const s = world(MEMORY.base + 1);
  assert.equal(memoryCap(s), MEMORY.base);
  assert.equal(liveCount(s), MEMORY.base);
  const last = s.locations.at(-1);
  assert.ok(last.detached);
  s.signal = 999;
  const out = play(s, `connect ${last.id}`);
  assert.ok(!s.run && out.some((e) => /memory/i.test(e.message)));
});

test('memory: detach to make room for free, attach for the same price every time; a frozen outpost makes nothing', () => {
  const s = world(MEMORY.base + 1);
  s.server.credits = 10000;
  const [a] = s.locations, last = s.locations.at(-1);
  a.takenOver = true;
  s.harvesters = [{ kind: 'siphon', level: 5, traits: [] }];
  command(s, `outpost install ${a.id}`, 0);
  assert.equal(outposts(s).length, 1);
  const before = s.server.credits;
  command(s, `detach ${a.id}`, 1000);
  assert.ok(a.detached && !isLive(s, a));
  assert.equal(before - s.server.credits, 0, 'detaching is free');
  assert.equal(outposts(s).length, 0, 'frozen: not running');
  command(s, `attach ${last.id}`, 2000);
  assert.ok(!last.detached);
  command(s, `detach ${last.id}`, 3000);
  const c0 = s.server.credits;
  command(s, `attach ${a.id}`, 9e9);
  assert.equal(c0 - s.server.credits, memoryCost(a), 'no penalty for coming back');
  assert.equal(a.outpost.at, 9e9, 'its clock picks up from now: nothing made while frozen');
});

test('memory: detaching a server freezes everything found through it, and frees their slots', () => {
  const s = world(2);
  s.server.credits = 10000;
  const root = s.locations[0];
  const child = addLocation(s, 'worm', 2, root.id);
  command(s, `attach ${child.id}`);
  assert.deepEqual(branchOf(s, root).map((l) => l.id), [root.id, child.id]);
  const n = liveCount(s);
  command(s, `detach ${root.id}`);
  assert.ok(!isLive(s, child));
  assert.equal(liveCount(s), n - 2);
  assert.match(command(s, `attach ${child.id}`).at(-1).message, /frozen with the server it hangs off/);
});
