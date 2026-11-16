// The cold open (dist/coldopen.mjs): KESSLER's clearing house fills its process table, the frame sticks, the network goes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { SCRIPT, BLINK, EGG, chopTimes, coldOpen } from './dist/coldopen.mjs';

const at = (id) => SCRIPT.steps.find((s) => s.id === id).at / 1000;

test('the crash: the table fills, the frame sticks, the sound dies with the picture, then NETWORK OFFLINE', () => {
  assert.ok(at('full') < at('stuck') && at('stuck') < at('dead') && at('dead') < at('offline') && at('offline') < at('cold'));
  const [bed, bank] = ['bed', 'bank'].map((n) => SCRIPT.cues.find((c) => c[0] === n));
  assert.equal(bed[2].cut, at('dead'), 'the hum dies with the picture');
  assert.equal(bank[1] + bank[2].cut, at('dead'), 'and so does the bank floor');
  assert.equal(bed[2].stutter, at('stuck'), 'both stutter from the stuck frame');
  assert.equal(bank[1] + bank[2].stutter, at('stuck'));
  assert.ok(SCRIPT.TOTAL > 50e3 && SCRIPT.TOTAL < 60e3, `about 55 s, not ${SCRIPT.TOTAL} ms`);
});

test('NETWORK OFFLINE blinks once and is gone before the dark ends', () => {
  assert.deepEqual(BLINK.map(([, on]) => on), [0, 1, 0]);
  const offline = SCRIPT.steps.find((s) => s.id === 'offline');
  assert.ok(BLINK.at(-1)[0] <= offline.ms);
});

test('the easter egg is the process beside init', () => {
  assert.ok(SCRIPT.steps.some((s) => s.t === 'pid 1: init'));
  assert.equal(EGG, 'pid 2: wick');
});

test('a stuck buffer repeats faster and faster until the cut', () => {
  const c = chopTimes(1, 2.7);
  assert.equal(c[0][0], 1);
  assert.ok(c.every(([x, per], i) => i === 0 || per <= c[i - 1][1]));
  assert.ok(c.at(-1)[0] + c.at(-1)[1] <= 2.7 + 1e-9);
});

test('with motion off it does not play', async () => {
  await coldOpen({ reducedMotion: () => true });
});
