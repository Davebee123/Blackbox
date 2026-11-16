// A fight's flashes on a row, a name block or a HUD bar run as a layer under the text, faded by opacity (performance plan).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('./dist/style.css', import.meta.url), 'utf8');
const FLASHES = ['hit', 'break', 'hurt', 'still', 'shove', 'enrage', 'strike', 'mark', 'burn', 'daemon', 'good', 'sync', 'surprise'];
const HOST = ':is(.brow, .part-top, .hud-bar)';

test('the hosts keep a layer under their text, at rest invisible', () => {
  assert.match(css, /\.brow, \.part-top, \.hud-bar \{ position: relative; isolation: isolate; \}/);
  assert.match(css, new RegExp(`${HOST.replace(/[().]/g, '\\$&')}::before \\{[^}]*z-index: -1;[^}]*opacity: 0;`));
});

test("each flash's layer starts on its keyframes' first frame and fades by opacity", () => {
  for (const f of FLASHES) {
    const first = css.match(new RegExp(`@keyframes fx-${f} \\{ 0% \\{ ([^}]*) \\}`))?.[1];
    assert.ok(first, f);
    const rule = css.match(new RegExp(`\\.brow, \\.part-top, \\.hud-bar\\)(?::is\\([^)]*\\bfx-${f}\\b[^)]*\\)|\\.fx-${f})::before \\{ ([^}]*) \\}`))?.[1];
    assert.ok(rule, `${f}: no layer`);
    for (const decl of first.split(';').map((d) => d.trim()).filter(Boolean)) assert.ok(rule.includes(decl.replace(/^background: /, 'background: ')), `${f}: ${decl}`);
  }
  assert.match(css, /::before \{ animation: fx-fade var\(--fx-d\) ease-out both; \}/);
});
