// app.js renders while it loads: a module-level const that a boot render reads must be declared before the render
// runs, or a save that reloads inside a run throws (the tooltip's `tt`, read by holdPopTip from putRooms).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('./dist/app.js', import.meta.url), 'utf8');

test('the hover tip state is declared before the save loads and the first render', () => {
  const tt = src.indexOf('const tt = {'), load = src.indexOf('let campaign = load()');
  assert.ok(tt > 0 && load > 0, 'both markers are in app.js');
  assert.ok(tt < load, 'const tt sits above the boot');
});
