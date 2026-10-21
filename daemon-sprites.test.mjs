// Daemon sprites (dist/daemon-sprites.mjs): every daemon gets one, drawn from its id, the same every time, and
// mirrored about its middle column like the class emblems; its blink stops under reduced motion and Motion off.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DAEMONS } from './dist/data.mjs';
import { sprite, spriteHtml, MIRROR, SPRITE_W, SPRITE_H, roleOf, ROLE_WORD } from './dist/daemon-sprites.mjs';

const IDS = Object.keys(DAEMONS);
const mirrored = (line) => [...line].every((c, i) => { const o = line[line.length - 1 - i]; return (MIRROR[c] || c) === o; });

test('every daemon gets a sprite: six rows of eleven, mirrored, with a blink frame and a silhouette', () => {
  assert.equal(IDS.length, 40);
  for (const id of IDS) {
    const s = sprite(id);
    assert.equal(s.lines.length, SPRITE_H, id);
    for (const frame of [s.lines, s.blink, s.ghost]) for (const line of frame) {
      assert.equal(line.length, SPRITE_W, `${id}: ${JSON.stringify(line)}`);
      assert.ok(mirrored(line), `${id} mirrors: ${JSON.stringify(line)}`);
    }
    assert.ok(s.lines.some((l) => l.trim()), `${id} draws something`);
    s.lines.forEach((l, i) => (i === 2 ? assert.match(s.blink[i], /-/, `${id} shuts its eyes`) : assert.equal(s.blink[i], l, `${id}: only the eyes blink`)));
    s.ghost.forEach((g, i) => { assert.match(g, /^ *█* *$/, `${id}: the silhouette is solid`); assert.equal(g.trim().length, s.lines[i].trim().length, `${id}: the silhouette has its shape`); });
    assert.ok(s.delay >= 0 && s.delay < 7);
    assert.ok(ROLE_WORD[roleOf(id)], id);
  }
  assert.ok(new Set(IDS.map((id) => sprite(id).lines.join('\n'))).size >= 38, 'nearly every daemon looks different');
});

test('the sprites are deterministic: a fresh copy of the module draws the same ones', async () => {
  const again = await import('./dist/daemon-sprites.mjs?again');
  assert.notEqual(again.sprite, sprite, 'a second copy, with its own cache');
  for (const id of IDS) assert.deepEqual(again.sprite(id), sprite(id), id);
  assert.equal(spriteHtml('cron'), again.spriteHtml('cron'));
});

test('the sprite as HTML: two frames for a found daemon, the silhouette for an unfound one; decoration only', () => {
  const on = spriteHtml('drill', { size: 9 });
  assert.match(on, /^<span class="spr" style="--spr:9px;--blink-at:-[\d.]+s" aria-hidden="true"><pre class="spr-a">/);
  assert.match(on, /<pre class="spr-b">/);
  const off = spriteHtml('drill', { found: false });
  assert.match(off, /class="spr ghost"/);
  assert.doesNotMatch(off, /spr-b/, 'a silhouette never blinks');
  assert.ok(off.includes('█'));
  // The blink is CSS; reduced motion and Motion off stop it.
  const css = readFileSync(new URL('./dist/daemons.css', import.meta.url), 'utf8');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{ \.spr-a, \.spr-b \{ animation: none; \}/);
  assert.match(css, /\.no-motion \.spr-a, \.no-motion \.spr-b \{ animation: none; \}/);
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ''), /(?<!text-)transform|translate|transition/, 'nothing on the tab moves');
});
