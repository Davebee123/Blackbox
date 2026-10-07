import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh } from './dist/combat.mjs';
import { logComms, commsOf, unseen, unseenAlert, seeAll, groupOf, COMMS, clearOne, pruneComms } from './dist/comms.mjs';

test('world events go to the pager; fight chatter doesn’t', () => {
  const s = fresh();
  const added = logComms(s, [
    { type: 'mail', message: 'New mail from wick · LOWLIGHT: a name on the list.', letter: 3, from: 'wick · LOWLIGHT', subject: 'a name on the list' },
    { type: 'board', message: 'New offer on the board: Turf: ORIN-MIRROR-07.', offer: 9 },
    { type: 'damage', message: 'Spike hits Pulse Node: −12.' },
    { type: 'retainer', message: 'Halcyon retainer: +38 credits.', credits: 38 },
  ]);
  assert.equal(added.length, 3);
  const [ret, offer, mail] = commsOf(s);
  assert.equal(mail.go, 'mail:l3');
  assert.equal(offer.go, 'mail:j9');
  assert.equal(offer.text, 'Turf: ORIN-MIRROR-07.');
  assert.equal(groupOf(ret.kind), 'Money');
  assert.equal(unseen(s), 3);
  seeAll(s);
  assert.equal(unseen(s), 0);
});

test('a breach is an alert; repeats fold together; the list keeps the last few', () => {
  const s = fresh();
  logComms(s, [{ type: 'wall-breach', message: 'cryptjack BREACHED your wall.' }]);
  assert.ok(unseenAlert(s));
  logComms(s, [{ type: 'store', message: 'x' }, { type: 'store', message: 'x' }]);
  assert.equal(commsOf(s).filter((c) => c.kind === 'store').length, 1);
  for (let i = 0; i < 60; i++) logComms(s, [{ type: 'retainer', message: 'Halcyon retainer: +1 credits.' }]);
  assert.equal(commsOf(s).filter((c) => c.label === 'Retainer').length, 1, 'retainers fold into one line');
  for (let i = 0; i < 60; i++) logComms(s, [{ type: 'board', message: `New offer on the board: job ${i}.`, offer: i }]);
  assert.equal(commsOf(s).length, COMMS.keep);
});

test('the pager drops what is no longer true, and news times out', () => {
  const s = fresh(), t = 1e12;
  s.mail = { ...(s.mail || {}), offers: [{ id: 7 }], jobs: [] };
  logComms(s, [{ type: 'board', message: 'New offer on the board: a job.', offer: 7 }, { type: 'retainer', message: 'Halcyon retainer: +5 credits.' }], t);
  pruneComms(s, t + 1000);
  assert.equal(commsOf(s).length, 2);
  s.mail.offers = [];
  pruneComms(s, t + 2000);
  assert.deepEqual(commsOf(s).map((c) => c.label), ['Retainer'], 'the offer left the board, so its line goes');
  pruneComms(s, t + COMMS.newsMs + 1);
  assert.equal(commsOf(s).length, 0, 'news goes on its own');
});

test('each pager entry clears on its own', () => {
  const s = fresh();
  logComms(s, [
    { type: 'mail', message: 'New mail from wick: hi.', letter: 1, from: 'wick', subject: 'hi' },
    { type: 'retainer', message: 'Halcyon retainer: +38 credits.', credits: 38 },
  ]);
  const [a, b] = commsOf(s);
  clearOne(s, a.id);
  assert.deepEqual(commsOf(s).map((c) => c.id), [b.id]);
});
