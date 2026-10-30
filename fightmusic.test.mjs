// Fight music (dist/fightmusic.mjs, soundtrack.mjs): every family has a theme, played a little under the home track.
import test from 'node:test';
import assert from 'node:assert/strict';
import { FIGHT_THEMES } from './dist/fightmusic.mjs';
import { OPENS } from './dist/families.mjs';
import { THEME_LEVEL, THEME_FADE, MUSIC_VOLUME } from './dist/soundtrack.mjs';

test('every virus family has a fight theme', () => {
  for (const family of Object.keys(OPENS)) {
    const th = FIGHT_THEMES[family];
    assert.ok(th, family);
    assert.equal(typeof th.step, 'function', family);
    assert.ok(th.bpm >= 60 && th.bpm <= 140 && th.gain > 0, family);
  }
});

test('a theme fades in and out over a few seconds, under the home track', () => {
  assert.ok(THEME_FADE >= 2 && THEME_FADE <= 5);
  // The themes are mixed to an RMS of about 0.035 at full level; the home track plays at about 0.0545 × its volume.
  assert.ok(0.035 * THEME_LEVEL < 0.0545 * MUSIC_VOLUME.home);
});
