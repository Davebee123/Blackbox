// The economy check: the bot (bot.mjs) plays a class to a level three ways — never paying for
// health (it rests), always topping up, and topping up plus building services — and reports what
// it earned, what it spent, how long it rested and how long the climb took.
// node econ.mjs [class] [targetLevel] [seed]
import { simulate } from './bot.mjs';

const [cls = 'breaker', target = '10', seed = '7'] = process.argv.slice(2);
for (const spend of ['none', 'topup', 'all']) {
  const { s, stats } = simulate({ cls, target: +target, seed: +seed, spend });
  const earned = Object.values(stats.ledger).reduce((n, r) => n + (r.credits || 0), 0);
  const spent = Object.values(stats.spent || {}).reduce((a, b) => a + b, 0);
  console.log(`${cls} · ${spend.padEnd(5)} · level ${target} in ${stats.mins} min (rested ${Math.round(stats.restMins || 0)}) · earned ${earned} · spent ${spent} ${JSON.stringify(stats.spent || {})} (${Math.round((spent / earned) * 100)}%) · bank ${s.server.credits} · salvage ${s.salvage.length}`);
}
