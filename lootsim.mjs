// The loot check: the pacing bot (bot.mjs) plays each class to a level on a few seeds and reports what it found:
// how often each rarity drops (minutes of play between drops, against LOOT.minutes' targets in gear.mjs), by level
// band, where the drops came from (kills, vaults, caches, elites, puzzles…), and the uniques among them.
// node lootsim.mjs [targetLevel] [seeds] [classes, comma-separated]
import { simulate } from './bot.mjs';
import { LOOT } from './dist/gear.mjs';

const [target = '25', nSeeds = '2', clsArg = 'breaker,bastion,infiltrator,operator'] = process.argv.slice(2);
const classes = clsArg.split(','), seeds = Array.from({ length: +nSeeds }, (_, i) => 7 + i * 13);
const RAR = ['stock', 'tuned', 'custom', 'zeroday', 'unique'];
const NAME = { stock: 'white', tuned: 'blue', custom: 'yellow', zeroday: 'gold (zero-day)', unique: 'unique' };
const BANDS = [[1, 10], [11, 20], [21, 30], [31, 50]].filter(([a]) => a <= +target);

const total = { mins: 0, wins: 0, drops: {}, from: {}, band: BANDS.map(() => ({ mins: 0, drops: {} })) };
for (const cls of classes) {
  for (const seed of seeds) {
    const t0 = Date.now();
    const { stats } = simulate({ cls, target: +target, seed, spend: 'topup' });
    total.mins += stats.mins; total.wins += stats.wins;
    for (const [src, by] of Object.entries(stats.dropFrom || {})) for (const [r, n] of Object.entries(by)) { (total.from[src] ||= {})[r] = (total.from[src][r] || 0) + n; total.drops[r] = (total.drops[r] || 0) + n; }
    // Each level band's minutes (from when the bot reached its first level to its last) and its drops.
    BANDS.forEach(([a, b], i) => {
      const from = stats.levelAt[a] ?? null, to = stats.levelAt[b + 1] ?? stats.mins;
      if (from == null) return;
      total.band[i].mins += Math.max(0, to - from);
      for (const [L, r] of stats.dropLevels || []) if (L >= a && L <= b) total.band[i].drops[r] = (total.band[i].drops[r] || 0) + 1;
    });
    const per = (r) => (stats.dropFrom ? Object.values(stats.dropFrom).reduce((n, x) => n + (x[r] || 0), 0) : 0);
    console.log(`${cls.padEnd(11)} seed ${String(seed).padStart(2)} · level ${target} in ${(stats.mins / 60).toFixed(1)} h · ${stats.wins} kills · ${RAR.map((r) => `${per(r)} ${NAME[r].split(' ')[0]}`).join(', ')} · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
}

const hours = total.mins / 60, every = (n, mins) => (n ? `${Math.round(mins / n)} min` : 'none');
const target_ = { tuned: `${LOOT.minutes.tuned} min`, custom: `${LOOT.minutes.custom} min`, zeroday: `${LOOT.minutes.zeroday} min` };
console.log(`\n${classes.length * seeds.length} runs, ${hours.toFixed(1)} hours of play, ${total.wins} kills (${Math.round(total.wins / hours)} an hour)\n`);
console.log('Rarity            | found | one every | per hour | target');
for (const r of RAR) { const n = total.drops[r] || 0; console.log(`${NAME[r].padEnd(17)} | ${String(n).padStart(5)} | ${every(n, total.mins).padStart(9)} | ${(n / hours).toFixed(2).padStart(8)} | ${target_[r] || (r === 'stock' ? `1 in ${Math.round(1 / LOOT.common)} kills` : '')}`); }
console.log('\nBy level band (one every N minutes)');
console.log('Band     | hours | ' + RAR.map((r) => NAME[r].split(' ')[0].padStart(7)).join(' | '));
BANDS.forEach(([a, b], i) => { const x = total.band[i]; if (!x.mins) return; console.log(`${`${a}–${b}`.padEnd(8)} | ${(x.mins / 60).toFixed(1).padStart(5)} | ${RAR.map((r) => every(x.drops[r] || 0, x.mins).padStart(7)).join(' | ')}`); });
console.log('\nWhere they came from');
const srcs = Object.entries(total.from).sort((a, b) => Object.values(b[1]).reduce((x, y) => x + y, 0) - Object.values(a[1]).reduce((x, y) => x + y, 0));
for (const [src, by] of srcs) console.log(`${src.padEnd(26)} ${RAR.filter((r) => by[r]).map((r) => `${by[r]} ${NAME[r].split(' ')[0]}`).join(', ')}`);
