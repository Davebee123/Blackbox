import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh } from './dist/combat.mjs';
import { logComms, commsOf, unseen, unseenAlert, seeAll, groupOf, COMMS } from './dist/comms.mjs';

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

test('a breach is an alert; restocks fold together; the list keeps the last 40', () => {
  const s = fresh();
  logComms(s, [{ type: 'wall-breach', message: 'cryptjack BREACHED your wall.' }]);
  assert.ok(unseenAlert(s));
  logComms(s, [{ type: 'store', message: 'x' }, { type: 'store', message: 'x' }]);
  assert.equal(commsOf(s).filter((c) => c.kind === 'store').length, 1);
  for (let i = 0; i < 60; i++) logComms(s, [{ type: 'retainer', message: 'Halcyon retainer: +1 credits.' }]);
  assert.equal(commsOf(s).length, COMMS.keep);
});
