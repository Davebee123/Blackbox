// The class picker's emblems (dist/class-emblems.mjs): one per class, all the same size, every row its own mirror.
import test from 'node:test';
import assert from 'node:assert/strict';
import { EMBLEMS, asymmetric } from './dist/class-emblems.mjs';
import { ARCHETYPES } from './dist/data.mjs';
import { classPickMarkup } from './dist/view.mjs';

test('every class has an emblem, 19 by 8, mirror-symmetric', () => {
  assert.deepEqual(Object.keys(EMBLEMS).sort(), Object.keys(ARCHETYPES).sort());
  for (const [k, rows] of Object.entries(EMBLEMS)) {
    assert.equal(rows.length, 8, k);
    assert.ok(rows.every((r) => r.length === 19), `${k}: 19 columns`);
    assert.deepEqual(asymmetric(rows), [], `${k}: symmetric`);
  }
});

test('the class picker shows each class with its emblem, idea and starting skills, and a Start button', () => {
  const html = classPickMarkup();
  for (const [k, a] of Object.entries(ARCHETYPES)) {
    assert.ok(html.includes(`data-pick-class="${k}"`), k);
    assert.ok(html.includes(a.idea.replace(/'/g, '&#39;')) || html.includes(a.idea), `${k}: idea`);
    for (const x of a.skills.slice(0, 2)) assert.ok(html.includes(x.name), `${k}: ${x.name}`);
  }
  assert.ok(html.includes('class="btn primary pk-go" disabled'));
});
