// Automated strategy playtest. These are scripted policies, not human players:
// they check that no single kill order dominates, not whether the game is fun.
import fs from 'node:fs';
import { fresh, selectEncounter, command, resolveCycle, active, livingParts, attackers, readyIn, intents, alive, part, usable } from './dist/combat.mjs';

// Kill-order strategies test the enemies, not the classes (a level-1 Breaker: Spike and Overload).
// Armor first: Spike breaks a chit; on a bare part, Overload if it's ready.
const hit = (s, target) => (target.armor > 0 || !usable(s).includes('overload') || readyIn(s, 'overload') ? 'spike ' : 'overload ') + target.id;
const soonest = (s) => attackers(s).sort((a, b) => a.attack.due - b.attack.due)[0] || livingParts(s)[0];

export const STRATEGIES = {
  'Soonest attack first': (s) => hit(s, soonest(s)),
  'Signature part first': (s) => hit(s, livingParts(s).find((p) => p.special) || soonest(s)),
  'Basic attacker first': (s) => hit(s, livingParts(s).find((p) => !p.special && p.kind === 'system') || soonest(s)),
  'Least armor first': (s) => hit(s, livingParts(s).sort((a, b) => a.armor - b.armor || a.integrity - b.integrity)[0]),
  'Finish bare parts first': (s) => hit(s, livingParts(s).find((p) => p.maxArmor && !p.armor) || soonest(s)),
};

export function run(fixture, strategy, { integrity = 100, credits = 160, seed = 42 } = {}) {
  const s = fresh();
  s.hackers = { breaker: { level: 4, xp: 0 } }; // Spike, Overload, Exploit
  s.server.integrity = integrity;
  s.server.credits = credits;
  selectEncounter(s, fixture, seed);
  command(s, 'engage');
  for (let n = 0; n < 60 && active(s); n++) {
    command(s, STRATEGIES[strategy](s));
    resolveCycle(s);
  }
  const r = s.reports.at(-1);
  return { fixture, strategy, start: integrity, result: r.result, cycles: r.cycles, endIntegrity: r.endIntegrity, lost: integrity - r.endIntegrity, trace: r.trace, order: r.breakOrder.join(' > ') };
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const rows = [];
  for (const fixture of ['cryptjack', 'splinter', 'ghostroot']) for (const start of [100, 50]) for (const strategy of Object.keys(STRATEGIES)) rows.push(run(fixture, strategy, { integrity: start }));
  const variants = [];
  for (let seed = 1; seed <= 30; seed++) for (const strategy of Object.keys(STRATEGIES)) variants.push({ seed, ...run('random', strategy, { seed }) });
  const best = {};
  for (const v of variants) {
    const key = v.seed;
    const score = (v.result === 'victory' ? 1000 : 0) + v.endIntegrity - v.cycles / 100; // ties: the faster plan
    if (!best[key] || score > best[key].score) best[key] = { strategy: v.strategy, score };
  }
  const wins = {};
  for (const b of Object.values(best)) wins[b.strategy] = (wins[b.strategy] || 0) + 1;

  let md = '# BLACKBOX automated strategy playtest\n\nKill-order strategies against each enemy (a level-4 Breaker: Spike, Overload, Crack, Interrupt, Trace; the scripts only use Spike, Overload and Trace). For class balance see BALANCE.md. Scripted policies, not people. They check that no single kill order always wins; they cannot tell you whether a fight is fun or readable in five seconds.\n\n';
  md += '## Fixtures\n\n| Fixture | Start | Strategy | Result | Cycles | Integrity lost | Trace | Break order |\n|---|---:|---|---|---:|---:|---:|---|\n';
  for (const r of rows) md += `| ${r.fixture} | ${r.start} | ${r.strategy} | ${r.result} | ${r.cycles} | ${r.lost} | ${r.trace}% | ${r.order} |\n`;
  md += '\n## Best strategy across 30 random variants\n\nScore = victory, then Integrity left, then fewer cycles.\n\n| Strategy | Variants where it was best |\n|---|---:|\n';
  for (const [k, v] of Object.entries(wins).sort((a, b) => b[1] - a[1])) md += `| ${k} | ${v} |\n`;
  fs.mkdirSync('docs', { recursive: true });
  fs.writeFileSync('docs/PLAYTEST.md', md);
  fs.writeFileSync('docs/playtest-results.json', JSON.stringify({ rows, variants }, null, 2));
  console.log(md);
}
