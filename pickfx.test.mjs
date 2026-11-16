// The class pick's border effects, run by the compositor (docs/performance-plan.md batch 8).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { borderPath, borderKeyframes } from './dist/pickfx.mjs';

test('the run round a rounded box: clockwise from the top edge, its length the border\'s', () => {
  const w = 832, h = 196, r = 4, pts = borderPath(w, h, r);
  assert.deepEqual(pts[0], [r, 0, 0, 0], 'starts where the top-left corner ends, heading right');
  const end = pts[pts.length - 1];
  assert.ok(Math.abs(end[0] - r) < 1e-9 && Math.abs(end[1]) < 1e-9 && end[2] === 360, 'ends where it started, a full turn round');
  assert.ok(Math.abs(end[3] - (2 * (w - 2 * r) + 2 * (h - 2 * r) + 2 * Math.PI * r)) < 1e-9, 'the length of the rounded border');
  for (let i = 1; i < pts.length; i++) assert.ok(pts[i][3] >= pts[i - 1][3] && pts[i][2] >= pts[i - 1][2], 'distance and heading only grow');
  const at = (x, y) => pts.find((p) => Math.abs(p[0] - x) < 1e-9 && Math.abs(p[1] - y) < 1e-9);
  assert.equal(at(w - r, 0)[2], 0, 'the top edge heads right');
  assert.equal(at(w, h - r)[2], 90, 'the right edge heads down');
  assert.equal(at(r, h)[2], 180, 'the bottom edge heads left');
  assert.equal(at(0, r)[2], 270, 'the left edge heads up');
  assert.ok(pts.every(([x, y]) => x >= -1e-9 && x <= w + 1e-9 && y >= -1e-9 && y <= h + 1e-9), 'never off the box');
});

test('its keyframes: transforms at an even speed, turning with the path only for a light that turns', () => {
  const kf = borderKeyframes(380, 410, 4, true), still = borderKeyframes(380, 410, 4, false);
  assert.equal(kf[0].offset, 0);
  assert.equal(kf[kf.length - 1].offset, 1);
  assert.ok(kf.every((k, i) => !i || k.offset >= kf[i - 1].offset));
  assert.match(kf[0].transform, /^translate\(4\.00px, 0\.00px\) rotate\(0deg\)$/);
  assert.ok(still.every((k) => /^translate\([-\d.]+px, [-\d.]+px\)$/.test(k.transform)));
  const top = kf.find((k) => k.transform.startsWith('translate(376.00px, 0.00px)'));
  assert.ok(Math.abs(top.offset - 372 / (2 * 372 + 2 * 402 + 8 * Math.PI)) < 1e-9, 'the top edge takes its share of the loop');
});

test('the picked square\'s looping effects animate only what the compositor runs', () => {
  const css = fs.readFileSync(new URL('./dist/style.css', import.meta.url), 'utf8');
  const start = css.indexOf("/* The picked square's border"), end = css.indexOf('/* A narrow screen: the squares stack');
  assert.ok(start > 0 && end > start);
  const block = css.slice(start, end);
  assert.doesNotMatch(block, /offset-path|offset-distance/, 'no motion path (pickfx.mjs runs the lights with transforms)');
  const props = [...block.matchAll(/@keyframes [\w-]+ \{(.*)\}\s*$/gm)].flatMap(([, body]) => [...body.matchAll(/([a-z-]+):/g)].map((m) => m[1]));
  assert.ok(props.length > 10, 'found the keyframes');
  assert.deepEqual([...new Set(props)].filter((p) => !['opacity', 'transform', 'translate', 'rotate', 'scale', 'filter'].includes(p)), []);
});
