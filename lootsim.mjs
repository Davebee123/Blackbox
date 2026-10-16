// The loot check: the pacing bot (bot.mjs) plays each class to a level on a few seeds and reports what it found, a kill
// at a time: how many kills each rarity takes to drop (against LOOT.per in gear.mjs), the same as minutes of real play
// at LOOT.killsPerHour, by level band, and by source (trash, elites and guards, rare spawns, bosses, vaults, quests).
// The bot's own clock runs far slower than a player (about 22 kills an hour), so its minutes are a secondary column.
// node lootsim.mjs [targetLevel] [seeds] [classes, comma-separated]
import { simulate } from './bot.mjs';
import { LOOT } from './dist/gear.mjs';
import { BOSSES } from './dist/data.mjs';

const [target = '25', nSeeds = '2', clsArg = 'breaker,bastion,infiltrator,operator'] = process.argv.slice(2);
const classes = clsArg.split(','), seeds = Array.from({ length: +nSeeds }, (_, i) => 7 + i * 13);
const RAR = ['stock', 'tuned', 'custom', 'zeroday', 'unique'];
const NAME = { stock: 'white', tuned: 'blue', custom: 'yellow', zeroday: 'gold (zero-day)', unique: 'unique' };
const BANDS = [[1, 10], [11, 20], [21, 30], [31, 50]].filter(([a]) => a <= +target);
const KPH = LOOT.killsPerHour;
// Where a drop came from (bot.mjs dropFrom's labels), as the loot model's sources.
const BOSS_NAMES = Object.values(BOSSES).map((b) => b.name);
const sourceOf = (src) => /^Kill: ★ rare|^Rare virus|^The archive/.test(src) ? 'Rare spawns' : /^Kill: (elite|guard)/.test(src) ? 'Elites and guards'
  : /Resident/.test(src) ? 'Resident (Core)' : src === 'Kill: boss' || BOSS_NAMES.some((n) => src === `${n} drops`) ? 'Bosses' : /^KESSLER/.test(src) ? 'The farm'
  : /^Kill: /.test(src) ? 'Trash' : /^(Banked|Vault)/.test(src) ? 'Vaults' : /^(Native unique|Strain trophy)$/.test(src) ? 'World uniques' : 'Quests';
const WORLD = ['Trash', 'Elites and guards', 'Rare spawns', 'Vaults', 'World uniques']; // a gold from these is a world drop

const total = { mins: 0, wins: 0, drops: {}, from: {}, cat: {}, kills: {}, bossKills: {}, band: BANDS.map(() => ({ kills: 0, drops: {} })), world: 0 };
for (const cls of classes) {
  for (const seed of seeds) {
    const t0 = Date.now();
    const { stats } = simulate({ cls, target: +target, seed, spend: 'topup' });
    total.mins += stats.mins; total.wins += stats.wins;
    for (const [src, by] of Object.entries(stats.dropFrom || {})) for (const [r, n] of Object.entries(by)) {
      (total.from[src] ||= {})[r] = (total.from[src][r] || 0) + n; total.drops[r] = (total.drops[r] || 0) + n;
      const c = sourceOf(src); (total.cat[c] ||= {})[r] = (total.cat[c][r] || 0) + n;
      if ((r === 'unique' || r === 'zeroday') && WORLD.includes(c)) total.world += n;
    }
    // Kills by source: room fights by their size, a rare spawn on its own; the rest (home, events) as trash.
    let room = 0;
    for (const f of stats.roomFights || []) if (f.won) {
      room++;
      const k = f.rare ? 'Rare spawns' : f.boss === 'resident' ? 'Resident (Core)' : f.boss ? 'Bosses' : ['elite', 'guard'].includes(f.kind) ? 'Elites and guards' : ['hunter', 'exfil', 'raw'].includes(f.kind) ? 'Other' : 'Trash';
      total.kills[k] = (total.kills[k] || 0) + 1;
      if (f.boss) total.bossKills[f.boss] = (total.bossKills[f.boss] || 0) + 1;
    }
    total.kills.Trash = (total.kills.Trash || 0) + stats.wins - room;
    BANDS.forEach(([a, b], i) => {
      for (const [L, n] of Object.entries(stats.winsAt || {})) if (+L >= a && +L <= b) total.band[i].kills += n;
      for (const [L, r] of stats.dropLevels || []) if (L >= a && L <= b) total.band[i].drops[r] = (total.band[i].drops[r] || 0) + 1;
    });
    const per = (r) => (stats.dropFrom ? Object.values(stats.dropFrom).reduce((n, x) => n + (x[r] || 0), 0) : 0);
    console.log(`${cls.padEnd(11)} seed ${String(seed).padStart(2)} · level ${target} · ${stats.wins} kills (${(stats.wins / KPH).toFixed(1)} h at ${KPH}/h, ${(stats.mins / 60).toFixed(1)} h on the bot's clock) · ${RAR.map((r) => `${per(r)} ${NAME[r].split(' ')[0]}`).join(', ')} · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
}

const K = total.wins, oneIn = (n, kills = K) => (n ? `1 in ${Math.round(kills / n)}` : 'none'), mins = (n, kills = K) => (n ? `${Math.round((kills / n / KPH) * 60)} min` : '');
console.log(`\n${classes.length * seeds.length} runs, ${K} kills (${(K / KPH).toFixed(1)} hours at ${KPH} kills an hour; ${(total.mins / 60).toFixed(1)} on the bot's clock, ${Math.round(K / (total.mins / 60))} an hour)\n`);
console.log('Rarity            | found | kills a drop | at 150/h  | target       | bot clock');
for (const r of RAR) {
  const n = total.drops[r] || 0, t = LOOT.per[r];
  console.log(`${NAME[r].padEnd(17)} | ${String(n).padStart(5)} | ${oneIn(n).padStart(12)} | ${mins(n).padStart(9)} | ${(t ? `1 in ${t}` : '').padStart(12)} | ${n ? `${Math.round(total.mins / n)} min` : ''}`);
}
console.log(`world gold (not a boss, the farm or a quest) | ${total.world} | ${oneIn(total.world)} kills | target under 1 in ${LOOT.per.zeroday}`);
// The random sources alone (what the odds tables set; bosses and quests pay on top, as they say).
const rnd = (r) => ['Trash', 'Elites and guards', 'Rare spawns', 'Vaults'].reduce((n, c) => n + (total.cat[c]?.[r] || 0), 0);
console.log(`random sources (trash, elites, rares, vaults): ${rnd('tuned')} blue (${oneIn(rnd('tuned'))}), ${rnd('custom')} yellow (${oneIn(rnd('custom'))})`);
console.log('\nBy level band (kills a drop)');
console.log('Band     |  kills | ' + RAR.map((r) => NAME[r].split(' ')[0].padStart(10)).join(' | '));
BANDS.forEach(([a, b], i) => { const x = total.band[i]; if (!x.kills) return; console.log(`${`${a}–${b}`.padEnd(8)} | ${String(x.kills).padStart(6)} | ${RAR.map((r) => oneIn(x.drops[r] || 0, x.kills).padStart(10)).join(' | ')}`); });
console.log('\nBy source (drops; a kill source also its kills and odds a kill)');
const order = ['Trash', 'Elites and guards', 'Rare spawns', 'Resident (Core)', 'Bosses', 'The farm', 'Vaults', 'Quests', 'World uniques'];
for (const c of order) {
  const by = total.cat[c] || {}, k = total.kills[c];
  const list = RAR.filter((r) => by[r]).map((r) => `${by[r]} ${NAME[r].split(' ')[0]}${k ? ` (1 in ${Math.round(k / by[r])})` : ''}`).join(', ') || 'nothing';
  console.log(`${c.padEnd(18)} ${k ? `${String(k).padStart(5)} kills · ` : '              '}${list}`);
}
console.log('\nBoss kills: ' + Object.entries(total.bossKills).map(([b, n]) => `${BOSSES[b]?.name || b} ${n}`).join(', '));
console.log('\nWhere they came from');
const srcs = Object.entries(total.from).sort((a, b) => Object.values(b[1]).reduce((x, y) => x + y, 0) - Object.values(a[1]).reduce((x, y) => x + y, 0));
for (const [src, by] of srcs) console.log(`${src.padEnd(26)} ${RAR.filter((r) => by[r]).map((r) => `${by[r]} ${NAME[r].split(' ')[0]}`).join(', ')}`);
