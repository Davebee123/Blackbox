// The difficulty curve: health a same-level fight costs, by the gear you're wearing.
// Targets (items design doc): nothing 50–60%, whites 35–45%, blues 25–30%, a yellow set 12–18%.
// node friction.mjs [levels…]
import { score, BRACKETS } from './balance.mjs';
export const GEAR = { nothing: { noGear: true }, whites: { rarity: 'stock' }, blues: { rarity: 'tuned' }, yellows: { rarity: 'custom' } };
export const TARGET = { nothing: [60, 75], whites: [40, 50], blues: [35, 45], yellows: [20, 30] };
export function friction(levels = [1, 5, 10, 18, 30], classes = ['Breaker', 'Bastion', 'Infiltrator', 'Operator']) {
  const rows = [];
  for (const L of levels) {
    const b = BRACKETS.reduce((best, x) => (x.level <= L ? x : best), BRACKETS[0]);
    const br = { ...b, name: 'Lv ' + L, level: L, server: L };
    for (const [g, opts] of Object.entries(GEAR)) {
      const per = classes.map((c) => score(c, br, opts));
      rows.push({ level: L, gear: g, lost: per.map((r) => r.lost), wins: per.map((r) => r.wins / r.total), avg: per.reduce((a, r) => a + r.lost, 0) / per.length });
    }
  }
  return rows;
}
if (import.meta.url === `file://${process.argv[1]}`) {
  const levels = process.argv.slice(2).map(Number);
  for (const r of friction(levels.length ? levels : undefined)) {
    const [lo, hi] = TARGET[r.gear];
    console.log(`Lv ${String(r.level).padStart(2)} ${r.gear.padEnd(8)} avg ${r.avg.toFixed(0).padStart(3)}% (target ${lo}–${hi})  by class ${r.lost.map((x) => x.toFixed(0).padStart(3)).join(' ')}  wins ${r.wins.map((w) => Math.round(w * 100)).join('/')}`);
  }
}
