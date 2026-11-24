// The finish card (dist/finish.mjs, view.mjs finishMarkup): after a big finish.
import test from 'node:test';
import assert from 'node:assert/strict';
import { fresh, hackerOf } from './dist/combat.mjs';
import { noteFinish, finishOf, finishDone, tracked } from './dist/finish.mjs';
import { logWin } from './dist/genome.mjs';
import { refreshGoals } from './dist/goals.mjs';
import { finishMarkup } from './dist/view.mjs';

test('a big finish notes the card; the newest wins; Continue clears it', () => {
  const s = fresh(); hackerOf(s).level = 6;
  noteFinish(s, 'mapped', 'KESSLER-SPUR-22', [['credits', 120], ['xp', 0]]);
  assert.deepEqual(finishOf(s), { kind: 'mapped', name: 'KESSLER-SPUR-22', pays: [['credits', 120]] }, 'a zero pay is left out');
  logWin(s, { family: 'worm', boss: 'relay-king', name: 'RELAY-KING' });
  assert.equal(finishOf(s).kind, 'boss');
  finishDone(s);
  assert.equal(finishOf(s), null);
  noteFinish(s, 'nonsense', 'x');
  assert.equal(finishOf(s), null);
});

test('the card: what finished, its pay, and the goal nearest done next', () => {
  const s = fresh(); hackerOf(s).level = 6; s.dex.kills = { x: 90 };
  refreshGoals(s);
  assert.ok(tracked(s, 'a:c-win-100'), 'on the tracker');
  noteFinish(s, 'mapped', 'KESSLER-SPUR-22', [['credits', 120]]);
  const html = finishMarkup(s);
  assert.match(html, /<p class="pz-kick">Server mapped<\/p><h1>KESSLER-SPUR-22<\/h1>/);
  assert.match(html, /\+120/);
  assert.match(html, /class="fin-next"><p class="pz-kick">Next<\/p>.*Process Killer/s);
});
