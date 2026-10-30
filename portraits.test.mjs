// Portraits (portraits.mjs): who's talking, as a backlit ASCII silhouette beside their lines in the quest window.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { FACE, CAST, faceOf, portrait, portraitMarkup } from './dist/portraits.mjs';
import { questPanel } from './dist/quest-view.mjs';

const text = (p) => p.rows.map((row) => row.map(([, t]) => t).join(''));

test('a portrait is a fixed grid of plain ASCII, the same for the same speaker', () => {
  for (const [who, icon] of [['NIGHT OPERATOR · s. okafor', 'npc'], ['restore job 4471', 'npc'], ['mirror.idx', 'file'], ['build.log', 'log']]) {
    const rows = text(portrait(who, icon));
    assert.equal(rows.length, FACE.h, who);
    for (const r of rows) { assert.equal(r.length, FACE.w, who); assert.match(r, /^[\x20-\x7e]*$/, `${who}: ASCII only`); }
    assert.deepEqual(text(portrait(who, icon)), rows);
  }
});

test('the cast have their own faces; anyone else gets one from their name; files and logs are pages', () => {
  assert.equal(faceOf('NIGHT OPERATOR · s. okafor').id, 'okafor');
  assert.equal(faceOf('ops-night · idle 41:12:07').id, 'okafor', 'her idle session is her');
  assert.equal(faceOf('QUILL · cartographer').id, 'quill');
  for (const c of Object.values(CAST)) assert.ok(c.re, 'each of the cast is matched by name');
  assert.equal(faceOf('mirror.idx', 'file').kind, 'file');
  assert.equal(faceOf('build.log', 'log').kind, 'log');
  const a = text(portrait('session · m.kade')), b = text(portrait('cron · night-shift')), c = text(portrait('mirror.idx', 'file'));
  assert.notDeepEqual(a, c, 'a person is not a page');
  assert.ok(new Set([a, b, text(portrait('pager · 2207')), text(portrait('restore job 4471'))].map(String)).size >= 3, 'strangers mostly look different');
  assert.ok(text(portrait('vesper@nullchoir')).join('').includes('o'), 'eyes catch the light');
});

test('the quest window shows who is talking beside their lines, and a sweep (its own body) shows none', () => {
  const d = { n: 1, who: 'QUILL · cartographer', icon: 'npc', lines: ['You found the copy.'], kind: 'talk', at: 2 };
  const html = questPanel(d, null, {});
  assert.match(html, /class="q-talk"><pre class="q-face f-bust" aria-hidden="true">/);
  assert.ok(html.includes(portraitMarkup(d.who, d.icon)));
  assert.match(questPanel({ ...d, icon: 'file', who: 'mirror.idx' }, null, {}), /q-face f-file/);
  assert.doesNotMatch(questPanel({ ...d, kind: 'sweep' }, null, { body: '<div class="sweep"></div>' }), /q-face/);
});

test('its rows scan in once, and are still after, with Motion off or reduced motion', () => {
  const css = readFileSync(new URL('./dist/quest.css', import.meta.url), 'utf8');
  assert.match(css, /\.q-panel \.qf-r \{ animation: q-in[^}]*var\(--age/);
  assert.match(css, /\.no-motion \.q-panel \*, \.q-panel\.q-settled \* \{ animation: none !important; \}/);
  assert.match(css, /\.q-face \{[^}]*border: 1px solid var\(--line-strong\)/);
  assert.doesNotMatch(css.match(/\.q-face[^}]*\}/g).join(''), /--you/, 'teal is only ever you');
});
