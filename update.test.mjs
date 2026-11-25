// A newer build (dist/update.mjs): the page's stamp against version.json; the log's line; halcyon-mdm's transmission.
import test from 'node:test';
import assert from 'node:assert/strict';
import { isNewer, buildOf, watchUpdate, UPDATE, setUpdateReady, updateReady } from './dist/update.mjs';
import { pingsMarkup } from './dist/pings.mjs';
import SCENES from './dist/content/scenes.mjs';
import { replay, sceneNow, choicesOf, choose } from './dist/scenes.mjs';

const fakeDoc = (build) => {
  const on = {};
  return { hidden: false, baseURI: 'https://x.test/game/', on, querySelector: () => (build ? { content: build } : null), addEventListener: (k, f) => { on[k] = f; } };
};

test('only a different build is newer; no stamp, no check', async () => {
  assert.equal(isNewer('a', 'b'), true);
  assert.equal(isNewer('a', 'a'), false);
  assert.equal(isNewer(null, 'b'), false);
  assert.equal(buildOf(fakeDoc(null)), null);
  let asked = 0;
  watchUpdate(() => {}, { doc: fakeDoc(null), get: async () => { asked++; return {}; } });
  assert.equal(asked, 0);
});

test('coming back to the tab reads version.json beside the page, at most once a minute, and calls a newer build once', async (t) => {
  setUpdateReady(false);
  t.mock.timers.enable({ apis: ['setTimeout', 'Date'], now: 1e9 });
  const doc = fakeDoc('aaa'), urls = [], found = [];
  let remote = 'aaa';
  watchUpdate((b) => found.push(b), { doc, get: async (u) => { urls.push(u); return { build: remote }; } });
  doc.on.visibilitychange(); await null;
  assert.equal(urls.length, 0, 'the page just loaded');
  t.mock.timers.tick(UPDATE.backMs); doc.on.visibilitychange(); await null; await null;
  assert.deepEqual(urls, ['https://x.test/game/version.json']);
  assert.equal(found.length, 0, 'same build');
  remote = 'bbb';
  doc.on.visibilitychange(); await null; await null;
  assert.equal(urls.length, 1, 'within the minute: no second read');
  t.mock.timers.tick(UPDATE.everyMs); await null; await null; await null;
  assert.deepEqual(found, ['bbb'], 'the half-hourly check found it');
  assert.equal(updateReady(), true);
  t.mock.timers.tick(UPDATE.everyMs); doc.on.visibilitychange(); await null; await null;
  assert.deepEqual(found, ['bbb'], 'once');
  setUpdateReady(false);
});

test('a newer build: a ↻ line that stays in the log, and halcyon-mdm offers a restart, again for the next build', () => {
  const s = { comms: [], scenes: { seen: [], queue: [], now: null } };
  assert.doesNotMatch(pingsMarkup(s), /data-update/);
  setUpdateReady(true);
  assert.match(pingsMarkup(s), /data-update/);
  assert.doesNotMatch(pingsMarkup(s, Date.now(), { only: () => true }), /data-update/, 'not in a fight');
  setUpdateReady(false);
  assert.equal(SCENES.update.who, 'halcyon-mdm');
  assert.ok(replay(s, 'update'));
  assert.equal(sceneNow(s).id, 'update');
  assert.deepEqual(choicesOf(s).map((c) => c.label), ['Restart now.', 'Later.']);
  assert.deepEqual(choose(s, 1), { go: 'restart' });
  assert.ok(replay(s, 'update'), 'the next build plays it again');
});
