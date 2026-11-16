// Restarting a one-shot animation class without a layout (docs/performance-plan.md batch 15).
import test from 'node:test';
import assert from 'node:assert/strict';
import { restartClass } from './dist/restart.mjs';

// A fake element that logs what restartClass does to it, and whether it asks for a style pass.
function el(classes) {
  const log = [], set = new Set(classes);
  return {
    log,
    classList: { contains: (c) => set.has(c), add: (...c) => { log.push(['add', ...c]); c.forEach((x) => set.add(x)); }, remove: (...c) => { log.push(['remove', ...c]); c.forEach((x) => set.delete(x)); } },
    ownerDocument: { defaultView: { getComputedStyle: () => ({ get animationName() { log.push(['style']); return 'x'; } }) } },
    get offsetWidth() { log.push(['layout']); return 1; },
  };
}

test('a class that is not on goes on with no style pass', () => {
  const e = el([]);
  restartClass(e, 'fx-hit');
  assert.deepEqual(e.log, [['add', 'fx-hit']]);
});

test('a class already on comes off, one style pass (never a layout), and goes back on', () => {
  const e = el(['fx-hit']);
  restartClass(e, 'fx-hit', 'big');
  assert.deepEqual(e.log, [['remove', 'fx-hit', 'big'], ['style'], ['add', 'fx-hit', 'big']]);
});
