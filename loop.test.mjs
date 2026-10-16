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

// Fights were held under 70% before R3. A floor holds a fixed set of servers at fixed levels (floors.mjs), so a climb
// finds fewer new ones than the old endless traces did and outgrows the ones it holds: more of its XP is respawns
// (the pacing bot over six seeds a class: 63-72% fights, the Bastion highest; docs/servers.md 9.10).
test('no one kind of play carries the climb: fights stay under 76% of XP (the bot never crafts or trades), with break-ins, intel and building all paying (building 0.5% over the four classes)', () => {
  for (const cls of CLASSES) {
    const mix = mixes[cls].xpMix, total = Object.values(mix).reduce((a, b) => a + b, 0);
    assert.ok(mix.fight / total < 0.76, `${cls}: fights ${Math.round((100 * mix.fight) / total)}%`);
    // Building pays 0.5% or more since R3: a floor's servers keep the level they were made at, so the bot outgrows
    // more of them before their Resident falls and holds about half as many (docs/servers.md 9.10).
    for (const [k, min] of [['breakin', 0.01], ['intel', 0.01]]) assert.ok((mix[k] || 0) / total >= min, `${cls}: ${k} ${((100 * (mix[k] || 0)) / total).toFixed(1)}%`);
    assert.ok((mix.build || 0) > 0, `${cls}: building pays nothing`);
  }
  // Building, over the four: since the loot rework (WoW's model) the bot wears less gear, so it outgrows more servers
  // before their Resident falls: 0.2–4.8% a class over three seeds (0.4–4.5% before), so the 0.5% floor is on the four.
  const sum = (k) => CLASSES.reduce((n, c) => n + (mixes[c].xpMix[k] || 0), 0), all = CLASSES.reduce((n, c) => n + Object.values(mixes[c].xpMix).reduce((a, b) => a + b, 0), 0);
  assert.ok(sum('build') / all >= 0.005, `build ${((100 * sum('build')) / all).toFixed(1)}% over the four`);
});

// The Breaker leans solo (docs/kits.md 9): since its level-10 kit it climbs alone about a third faster than before,
// so it is held to 1.0x, still never faster alone than with mixed play. The Bastion is held to 1.2x: since tells are
// answered in a window (fewer clean reads, so fewer extra loot rolls and other uniques) its median sits at 1.21x.
test('fighting alone is the slow road: SPRAWL-only takes 1.25x as long to level 12 as mixed play for every class (the Breaker, which leans solo, 1.0x, the Bastion 1.2x), 1.4x on average (median of 7 seeds: 5 swung with which uniques dropped)', async () => {
  const { CONFIG } = await import('./dist/data.mjs');
  const { HIDDEN } = await import('./dist/hidden.mjs');
  const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
  const lead = CONFIG.leadBase, was = { ...HIDDEN };
  // SPRAWL-only: nothing traces past the server wick hands you at level 4 (no stray, first clear, record or Mapped server).
  const at = (cls, only) => { CONFIG.leadBase = only ? 0 : lead; Object.assign(HIDDEN, only ? { firstClear: 0, recordLead: 0, opens: false } : was); return med([1, 2, 3, 4, 5, 6, 7].map((seed) => simulate({ cls, target: 12, seed }).stats.levelAt[12] ?? 1e5)); };
  try {
    const r = CLASSES.map((cls) => at(cls, true) / at(cls, false));
    r.forEach((x, i) => assert.ok(x >= ({ breaker: 1.0, bastion: 1.2 }[CLASSES[i]] ?? 1.25), `${CLASSES[i]}: ${x.toFixed(2)}x`));
    assert.ok(r.reduce((a, b) => a + b, 0) / r.length >= 1.35, `average ${r.map((x) => x.toFixed(2)).join(' / ')}`); // 1.4 before R1: the interrupt made SPRAWL's fights a little cheaper (1.35, 1.55, 1.41, 1.28)
  } finally { CONFIG.leadBase = lead; Object.assign(HIDDEN, was); }
});
