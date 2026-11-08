// The Settings page (view.mjs systemMarkup, nav id 'system'): the player's options; developer tools only with ?dev.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fresh } from './dist/combat.mjs';
import { systemMarkup } from './dist/view.mjs';

const DEV_ONLY = /coop-card|kills an hour|data-sound=|radio test|class="ticker"|Fight reports|class="fulllog"|data-stab="dev"/;

test('the nav says Settings; the player sees options, never developer tools', () => {
  assert.match(readFileSync(new URL('./dist/index.html', import.meta.url), 'utf8'), /<button data-module="system">Settings<\/button>/);
  const s = fresh();
  for (const tab of ['settings', 'achievements', 'casing', 'terminal', 'dev']) assert.doesNotMatch(systemMarkup(s, { coop: true, tab }), DEV_ONLY, tab);
  assert.match(systemMarkup(s, { tab: 'dev' }), /data-stab="settings" aria-selected="true"/, 'no Dev tab without ?dev: back to Settings');
  assert.match(systemMarkup(s), /data-volume="music"/);
  assert.match(systemMarkup(s), /data-run="reset game"/);
});

test('with ?dev a Dev tab holds co-op, pace, the sound test, the wire, fight reports and the log', () => {
  const s = fresh();
  assert.match(systemMarkup(s, { dev: true }), /data-stab="dev" aria-selected="false"/);
  assert.doesNotMatch(systemMarkup(s, { dev: true }), /data-sound=|class="fulllog"/, 'not on Settings');
  const html = systemMarkup(s, { dev: true, coop: true, tab: 'dev' });
  for (const re of [/coop-card/, /kills an hour|Not enough play yet/, /data-sound="hit"/, /radio test/, /class="ticker"/, /Fight reports/, /class="fulllog"/]) assert.match(html, re);
});
