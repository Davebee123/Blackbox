// Loop health: the pacing bot's fight mix as it levels. Grey fights (10+ levels under you) should be
// rare from level 10 to 20, and strains and ICE (fights with a rule) common from level 12.
// Targets not met yet are `todo`: they run and report until Phase 2 (level bands, grey stops paying) lands.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from './bot.mjs';

const CLASSES = ['breaker', 'bastion', 'infiltrator', 'operator'];
const mixes = Object.fromEntries(CLASSES.map((cls) => [cls, simulate({ cls, target: 20 }).stats]));
const share = (mix, from, to, key) => {
  let f = 0, n = 0;
  for (const [l, x] of Object.entries(mix)) if (+l >= from && +l <= to) { f += x.fights; n += x[key]; }
  return f ? (100 * n) / f : 0;
};

test('the pacing bot reaches level 20 with every class, fighting at every level', () => {
  for (const cls of CLASSES) {
    const st = mixes[cls];
    assert.equal(st.level, 20, `${cls} stopped at ${st.level}`);
    assert.ok(share(st.mix, 10, 20, 'grey') < 40, `${cls}: ${share(st.mix, 10, 20, 'grey').toFixed(0)}% grey`);
  }
});

test('target: grey fights under 20% from level 10 to 20', { todo: 'Phase 2: level bands by layer, grey content stops paying' }, () => {
  assert.deepEqual(CLASSES.map((c) => `${c} ${share(mixes[c].mix, 10, 20, 'grey').toFixed(0)}%`).filter((x) => parseFloat(x.split(' ')[1]) >= 20), []);
});

test('target: strains and ICE at least 15% of fights from level 12', { todo: 'Phase 2/4: strains and ICE in the regular mix' }, () => {
  assert.deepEqual(CLASSES.map((c) => `${c} ${share(mixes[c].mix, 12, 99, 'special').toFixed(0)}%`).filter((x) => parseFloat(x.split(' ')[1]) < 15), []);
});
