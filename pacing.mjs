// The pacing check: the pacing bot (bot.mjs) climbs each class on a few seeds and this prints the hours of real play to
// levels 5, 10, 20, 30, 40 and 50 against the targets (PACE_TARGET), with the bot's own clock beside them, and where
// the XP came from.
// Real play is bot.mjs's model (REAL): a fight is 3600 / LOOT.killsPerHour seconds with its walk (24 at 150 an hour),
// won or lost, a puzzle board 2 minutes, a log sweep 1; mail, connecting, resting and gearing are inside the walk.
// The bot's own clock (12-second cycles, 3 seconds a step, every rest and reconnect wait) runs about 20 times slower
// on the long climb, so its hours are not a player's. Climbs run in parallel, one per core (`climbs`, for the tests too).
// node pacing.mjs [targetLevel] [seeds] [classes, comma-separated] [spend: none|topup]
import { Worker, isMainThread, parentPort, workerData } from 'node:worker_threads';
import { cpus } from 'node:os';

// Hours of real play to each level: front-loaded, about 100 to 50 (8 floors, 10 to 20 hours each past the first two).
export const PACE_TARGET = { 5: 1, 10: 4, 20: 15, 30: 35, 40: 65, 50: 100 };
export const MILESTONES = [5, 10, 20, 30, 40, 50];
export const CLASSES = ['breaker', 'bastion', 'infiltrator', 'operator'];
// What a climb's XP was, by what earned it (bot.mjs stats.xp's reasons): one-off deeds (deedXpFor), contracts, the rest kills.
const DEEDS = /first clear|Mapped|taken over|^Root|decoded|solved|first run|vault|sweep|clean job|first /;

// One climb, summed up: real and bot hours and fights to each level reached, the XP mix (s.xpMix, by kind), the XP by
// source (kills, deeds, contracts) and the fight mix by level (stats.mix). sprawlOnly: nothing traces past the server
// wick hands you at level 4 (loop.test.mjs's slow road).
export async function climb({ cls, seed, target = 50, spend = 'none', sprawlOnly = false }) {
  const { simulate } = await import('./bot.mjs');
  if (sprawlOnly) {
    const { CONFIG } = await import('./dist/data.mjs'), { HIDDEN } = await import('./dist/hidden.mjs');
    CONFIG.leadBase = 0; Object.assign(HIDDEN, { firstClear: 0, recordLead: 0, opens: false });
  }
  const t0 = Date.now();
  const { s, stats } = simulate({ cls, seed, target, spend });
  const at = (by) => Object.fromEntries(MILESTONES.filter((L) => by[L] != null).map((L) => [L, by[L]]));
  const xs = Object.entries(stats.xp), sum = (re) => xs.filter(([k]) => re.test(k)).reduce((n, [, v]) => n + v, 0), all = xs.reduce((n, [, v]) => n + v, 0) || 1;
  const deeds = sum(DEEDS), contracts = sum(/^contract/);
  return {
    cls, seed, sprawlOnly, level: stats.level, ms: Date.now() - t0,
    real: Object.fromEntries(Object.entries(at(stats.realAt)).map(([L, m]) => [L, m / 60])),
    bot: Object.fromEntries(Object.entries(at(stats.levelAt)).map(([L, m]) => [L, m / 60])),
    fights: at(stats.fightsAt), wins: stats.wins, losses: stats.losses, puzzles: stats.puzzles,
    mix: s.xpMix || {}, from: { kills: (all - deeds - contracts) / all, deeds: deeds / all, contracts: contracts / all },
    fightMix: stats.mix || {}, levelAt: stats.levelAt, realAt: stats.realAt, fightsAt: stats.fightsAt,
  };
}

// Several climbs at once, each in a worker of its own (at most one per core), in the order given.
export function climbs(jobs, width = cpus().length, onDone = null) {
  const runs = new Array(jobs.length);
  let next = 0;
  const one = () => new Promise((done, fail) => {
    if (next >= jobs.length) return done();
    const i = next++;
    const w = new Worker(new URL(import.meta.url), { workerData: { pacing: jobs[i] } });
    w.on('message', (r) => { runs[i] = r; onDone?.(r); });
    w.on('error', fail);
    w.on('exit', () => one().then(done, fail));
  });
  return Promise.all(Array.from({ length: Math.max(1, Math.min(width, jobs.length)) }, one)).then(() => runs);
}

const med = (a) => { const b = a.filter((x) => x != null).sort((x, y) => x - y); return b.length ? (b.length % 2 ? b[(b.length - 1) / 2] : (b[b.length / 2 - 1] + b[b.length / 2]) / 2) : null; };
export const medianAt = (runs, key, L) => med(runs.map((r) => r[key][L]));
// The climb's hours of real play to L: the median of each class's median.
export const hoursTo = (runs, L) => med([...new Set(runs.map((r) => r.cls))].map((c) => medianAt(runs.filter((x) => x.cls === c), 'real', L)));

async function main() {
  const [target = '50', nSeeds = '3', clsArg = CLASSES.join(','), spend = 'none'] = process.argv.slice(2);
  const classes = clsArg.split(','), seeds = Array.from({ length: +nSeeds }, (_, i) => 7 + i * 13);
  const jobs = classes.flatMap((cls) => seeds.map((seed) => ({ cls, seed, target: +target, spend })));
  const runs = await climbs(jobs, cpus().length, (r) => console.error(`  ${r.cls} seed ${r.seed}: level ${r.level}, ${r.wins + r.losses} fights, ${(r.ms / 1000).toFixed(0)} s`));
  const Ls = MILESTONES.filter((L) => L <= +target);
  const f1 = (x) => (x == null ? '—' : x < 10 ? x.toFixed(1) : x.toFixed(0));
  const pct = (x) => `${(100 * x).toFixed(0)}%`;
  const row = (cells) => `| ${cells.join(' | ')} |`;
  const vs = (h, want) => (h == null ? '—' : `${h >= want ? '+' : ''}${Math.round((100 * (h - want)) / want)}%`);
  console.log(`\nHours to each level, median of ${seeds.length} seed${seeds.length > 1 ? 's' : ''} (spend: ${spend}). Real play first, the bot's clock in brackets, then fights.\n`);
  console.log(row(['Class', ...Ls.map((L) => `Lv ${L}`)]));
  console.log(row(['---', ...Ls.map(() => '---:')]));
  console.log(row(['Target (real)', ...Ls.map((L) => f1(PACE_TARGET[L]))]));
  for (const cls of classes) {
    const r = runs.filter((x) => x.cls === cls);
    console.log(row([cls, ...Ls.map((L) => `${f1(medianAt(r, 'real', L))} (${f1(medianAt(r, 'bot', L))}) · ${Math.round(medianAt(r, 'fights', L) ?? NaN)}`)]));
  }
  console.log(row(['All (median)', ...Ls.map((L) => f1(hoursTo(runs, L)))]));
  console.log(row(['Against the target', ...Ls.map((L) => vs(hoursTo(runs, L), PACE_TARGET[L]))]));
  // The XP mix: each kind's share of everything the climb earned (s.xpMix: a held server's respawns count as building),
  // then by source: kills, one-off deeds (first clears, Mapped, takeovers, Root, decodes, puzzle boards) and contracts.
  console.log('\nXP mix, by kind (contracts count as the work behind them; a held server\'s respawns as building) and by source:\n');
  const kinds = [...new Set(runs.flatMap((r) => Object.keys(r.mix)))].sort();
  console.log(row(['Class', ...kinds, 'kills', 'deeds', 'contracts']));
  console.log(row(['---', ...kinds.map(() => '---:'), '---:', '---:', '---:']));
  for (const cls of classes) {
    const r = runs.filter((x) => x.cls === cls), tot = (k) => r.reduce((n, x) => n + (x.mix[k] || 0), 0), sum = kinds.reduce((n, k) => n + tot(k), 0);
    const from = (k) => r.reduce((n, x) => n + x.from[k], 0) / r.length;
    console.log(row([cls, ...kinds.map((k) => pct(tot(k) / sum)), pct(from('kills')), pct(from('deeds')), pct(from('contracts'))]));
  }
  if (process.env.PACING_JSON) (await import('node:fs')).writeFileSync(process.env.PACING_JSON, JSON.stringify(runs));
  const lost = runs.reduce((n, r) => n + r.losses, 0), fought = runs.reduce((n, r) => n + r.wins + r.losses, 0);
  console.log(`\n${fought} fights, ${((100 * lost) / fought).toFixed(0)}% lost; ${runs.reduce((n, r) => n + r.puzzles, 0)} puzzle boards.`);
}

if (!isMainThread && workerData?.pacing) climb(workerData.pacing).then((r) => parentPort.postMessage(r));
else if (isMainThread && import.meta.url === `file://${process.argv[1]}`) main();
