// The Settings page (view.mjs systemMarkup, nav id 'system'): the player's options; developer tools only with ?dev.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fresh } from './dist/combat.mjs';
import { systemMarkup, rigMarkup } from './dist/view.mjs';

const DEV_ONLY = /coop-card|kills an hour|data-sound=|radio test|class="ticker"|Fight reports|class="fulllog"|data-stab="dev"/;

test('the nav says Settings; the player sees options, never developer tools', () => {
  assert.match(readFileSync(new URL('./dist/index.html', import.meta.url), 'utf8'), /<button data-module="system"[^>]*>Settings<\/button>/);
  const s = fresh();
  for (const tab of ['settings', 'dev']) assert.doesNotMatch(systemMarkup(s, { coop: true, tab }), DEV_ONLY, tab);
  assert.doesNotMatch(systemMarkup(s, { tab: 'dev' }), /data-stab/, 'no tabs without ?dev');
  assert.match(systemMarkup(s, { tab: 'dev' }), /data-volume="music"/, 'and no Dev page: Settings');
  assert.match(systemMarkup(s), /data-volume="music"/);
  assert.match(systemMarkup(s), /data-run="reset game"/);
});

test('every top-bar tab has a tooltip: its name, then what the page holds', () => {
  const html = readFileSync(new URL('./dist/index.html', import.meta.url), 'utf8');
  const tabs = [...html.match(/<nav class="modules"[\s\S]*?<\/nav>/)[0].matchAll(/<button data-module="(\w+)"([^>]*)>([A-Za-z]+)/g)];
  assert.ok(tabs.length >= 10);
  for (const [, id, attrs, label] of tabs) assert.match(attrs, new RegExp(`data-tt="${label}: [A-Z][^"]+\\."`), id);
});

test('with ?dev a Dev tab holds co-op, pace, the sound test, the wire, fight reports and the log', () => {
  const s = fresh();
  assert.match(systemMarkup(s, { dev: true }), /data-stab="dev" aria-selected="false"/);
  assert.doesNotMatch(systemMarkup(s, { dev: true }), /data-sound=|class="fulllog"/, 'not on Settings');
  const html = systemMarkup(s, { dev: true, coop: true, tab: 'dev' });
  for (const re of [/coop-card/, /kills an hour|Not enough play yet/, /data-sound="hit"/, /radio test/, /class="ticker"/, /Fight reports/, /class="fulllog"/]) assert.match(html, re);
});

test('the Rig holds Achievements, Casing (with the window\'s districts) and Terminal; Settings holds none of them', () => {
  assert.match(readFileSync(new URL('./dist/index.html', import.meta.url), 'utf8'), /<button data-module="rig"[^>]*>Rig<\/button>/);
  const s = fresh(), html = systemMarkup(s, { dev: true });
  assert.doesNotMatch(html, /data-stab="(achievements|casing|terminal)"|data-rtab|cs-dist/);
  for (const t of ['achievements', 'casing', 'terminal']) assert.match(rigMarkup(s), new RegExp(`data-rtab="${t}"`));
  assert.match(rigMarkup(s), /data-rtab="achievements" aria-selected="true"/, 'opens on Achievements');
  assert.match(rigMarkup(s, { tab: 'casing' }), /cs-page[\s\S]*data-run="district sprawl"/);
});
