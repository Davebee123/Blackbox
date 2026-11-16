// Flowing dashes and moving files, run by the graphics card (docs/performance-plan.md batch 3).
import test from 'node:test';
import assert from 'node:assert/strict';
import { flowSvg, quadPts } from './dist/flowfx.mjs';

const pieces = (html) => [...html.matchAll(/<g transform="translate\(([-\d.]+) ([-\d.]+)\) rotate\(([-\d.]+)\)" clip-path="url\(#([\w-]+)\)"><clipPath id="([\w-]+)"><rect x="0" y="-8" width="([\d.]+)" height="16"\/><\/clipPath><line class="([^"]+)" x1="(-[\d.]+)" y1="0" x2="([\d.]+)" y2="0" style="--p:(\d+)px;stroke-dashoffset:([\d.]+)"\/><\/g>/g)];

test('a straight trace: one dashed piece, a period longer than the trace, clipped to it and slid by a transform', () => {
  const html = flowSvg([{ x: 10, y: 20 }, { x: 110, y: 20 }], 'fp-flow', 14, { id: 'w' });
  const [p] = pieces(html);
  assert.ok(p, html);
  assert.deepEqual([p[1], p[2], p[3]], ['10', '20', '0']);
  assert.equal(p[4], p[5], 'its own clip');
  assert.equal(p[6], '100', 'clipped to the trace');
  assert.equal(p[8], '-14', 'starts a period back');
  assert.equal(p[9], '100');
  assert.match(p[7], /\bfp-flow flow-run\b/, 'the class carries the stroke and dash; flow-run the motion (style.css)');
  assert.doesNotMatch(html, /dashoffset:\s*-|animation|<animate/, 'no dash-offset animation, nothing per frame');
});

test("a curve: pieces whose dashes stay in phase across the joins, each with its own clip", () => {
  const pts = quadPts({ x: 0, y: 0 }, { x: 50, y: -40 }, { x: 100, y: 0 });
  assert.equal(pts.length, 9);
  assert.deepEqual(pts[0], { x: 0, y: 0 }); assert.deepEqual(pts[8], { x: 100, y: 0 });
  const ps = pieces(flowSvg(pts, 'fp-flow route', 14, { id: 't' }));
  assert.equal(ps.length, 8);
  let s = 0;
  for (const p of ps) {
    assert.ok(Math.abs(+p[11] - (s % 14)) < 0.2, `phase ${p[11]} at ${s.toFixed(1)}`);
    s += +p[6];
  }
  assert.equal(new Set(ps.map((p) => p[4])).size, 8, 'a clip a piece');
  assert.ok(ps.every((p) => p[4].startsWith('flc-t-')), 'the clips carry the svg\'s prefix');
});

test('the rooms map and the Map draw their flows this way; a file in transit moves by a CSS animation', async () => {
  const { transitSvg } = await import('./dist/threads-view.mjs');
  const html = transitSvg({ id: 'transit-7', name: 'a file', x: 50, y: 40, route: 'M0 0 L100 0 L100 80', pts: [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 80 }] });
  assert.doesNotMatch(html, /<animateMotion/, 'no SMIL: it runs on the main thread');
  assert.match(html, /@keyframes tm-transit-7\{0%\{transform:translate\(0px,0px\)\}55\.56%\{transform:translate\(100px,0px\)\}100%\{transform:translate\(100px,80px\)\}\}/, 'an even pace along the route');
  assert.match(html, /<g class="tmove" style="animation:tm-transit-7 6s linear infinite">/);
  assert.match(transitSvg({ id: 'x', name: 'f', x: 5, y: 6, route: 'M0 0 L10 0' }, false), /class="tmover" transform="translate\(5 6\)"/, 'Motion off: it sits halfway');
});
