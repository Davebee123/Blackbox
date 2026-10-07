// Loop health: the pacing bot's fight mix as it levels. Grey fights (10+ levels under you) should be
// rare from level 10 to 20, and strains and ICE (fights with a rule) common from level 12. The bot
// skips SPRAWL-00 once it's grey (a player would), except for a contract's named target.
import test from 'node:test';
import assert from 'node:assert/strict';
import { simulate } from './bot.mjs';

const CLASSES = ['breaker', 'bastion', 'infiltrator', 'operator'];
const mixes = Object.fromEntries(CLASSES.map((cls) => { const { s, stats } = simulate({ cls, target: 20 }); return [cls, { ...stats, xpMix: s.xpMix || {} }]; }));
const share = (mix, from, to, key) => {
  let f = 0, n = 0;
  for (const [l, x] of Object.entries(mix)) if (+l >= from && +l <= to) { f += x.fights; n += x[key]; }
  return f ? (100 * n) / f : 0;
};

test('the pacing bot reaches level 20 with every class', () => {
  for (const cls of CLASSES) assert.equal(mixes[cls].level, 20, `${cls} stopped at ${mixes[cls].level}`);
});

test('grey fights are under 20% from level 10 to 20', () => {
  assert.deepEqual(CLASSES.map((c) => `${c} ${share(mixes[c].mix, 10, 20, 'grey').toFixed(0)}%`).filter((x) => parseFloat(x.split(' ')[1]) >= 20), []);
});

test('strains and ICE are at least 15% of fights from level 12', () => {
  assert.deepEqual(CLASSES.map((c) => `${c} ${share(mixes[c].mix, 12, 99, 'special').toFixed(0)}%`).filter((x) => parseFloat(x.split(' ')[1]) < 15), []);
});

test('no one kind of play carries the climb: fights stay under 70% of XP (the bot never crafts or trades), with break-ins, intel and building all paying', () => {
  for (const cls of CLASSES) {
    const mix = mixes[cls].xpMix, total = Object.values(mix).reduce((a, b) => a + b, 0);
    assert.ok(mix.fight / total < 0.7, `${cls}: fights ${Math.round((100 * mix.fight) / total)}%`);
    for (const k of ['breakin', 'intel', 'build']) assert.ok((mix[k] || 0) / total >= 0.01, `${cls}: ${k} ${Math.round((100 * (mix[k] || 0)) / total)}%`);
  }
});

test('fighting alone is the slow road: SPRAWL-only takes 1.25x as long to level 12 as mixed play for every class, 1.4x on average (median of 7 seeds: 5 swung with which uniques dropped)', async () => {
  const { CONFIG } = await import('./dist/data.mjs');
  const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const lead = CONFIG.leadBase;
  const at = (cls, only) => { CONFIG.leadBase = only ? 0 : lead; return med([1, 2, 3, 4, 5, 6, 7].map((seed) => simulate({ cls, target: 12, seed }).stats.levelAt[12] ?? 1e5)); };
  try {
    const r = CLASSES.map((cls) => at(cls, true) / at(cls, false));
    r.forEach((x, i) => assert.ok(x >= 1.25, `${CLASSES[i]}: ${x.toFixed(2)}x`));
    assert.ok(r.reduce((a, b) => a + b, 0) / r.length >= 1.4, `average ${r.map((x) => x.toFixed(2)).join(' / ')}`);
  } finally { CONFIG.leadBase = lead; }
});
