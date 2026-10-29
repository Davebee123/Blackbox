// A fight coming up (dist/bootfx.mjs): the screen boots into it, the virus first (the designer's pick, Centre stage).
// Leaving a won one: Channel cut, the page folding to a teal line and the next opening out of it.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BOOT, TUBE_ON, bootLines, CUT } from './dist/bootfx.mjs';

test('the virus comes on before anything of yours, and it is all over in a little over two seconds', () => {
  for (const k of ['console', 'chrome', 'you', 'youBar', 'board', 'log', 'prompt', 'tray']) assert.ok(BOOT.virus < BOOT[k] && BOOT.enemy < BOOT[k], k);
  assert.ok(BOOT.flash < BOOT.black && BOOT.black < BOOT.virus);
  for (const k of ['you', 'board', 'log', 'prompt', 'tray']) assert.ok(BOOT[k] + TUBE_ON.at(-1)[0] <= BOOT.done, k);
  assert.ok(BOOT.done <= 2200);
});

test('a panel catching flickers but ends lit', () => {
  assert.equal(TUBE_ON[0][1], 0);
  assert.equal(TUBE_ON.at(-1)[1], 1);
  assert.ok(TUBE_ON.filter(([, v]) => v === 0).length >= 3);
});

test('the console checks your bar, class and keys, then names the virus in red', () => {
  const lines = bootLines({ bar: 'Your server', hp: '100/100', cls: 'Breaker', level: '1', keys: ['Bash', 'Overload'], virus: 'CRYPTJACK', paused: true });
  assert.deepEqual(lines.map((l) => l.text), [
    'BLACKBOX MODEL 7 · cold boot',
    'your server ...... 100/100',
    'class ............ breaker lv 1',
    'key 1 bash ....... ok',
    'key 2 overload ... ok',
    'proc/intrusion ... CRYPTJACK',
    'cycle clock ...... paused',
    '> ready_',
  ]);
  assert.deepEqual(lines.filter((l) => l.hot).map((l) => l.text), ['proc/intrusion ... CRYPTJACK']);
  assert.equal(bootLines({ keys: ['a', 'b', 'c', 'd', 'e', 'f'] }).filter((l) => l.text.startsWith('key ')).length, 4);
});

test('leaving a won fight is quick: the page folds, the next one opens out of the line, then your room rings', () => {
  assert.ok(CUT.cut <= CUT.swap && CUT.swap <= CUT.open);
  assert.ok(CUT.open < CUT.ring && CUT.open + CUT.openFor <= CUT.done);
  assert.ok(CUT.done <= 900);
});
