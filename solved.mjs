// node solved.mjs: how solved fights are. A fight that rewards reading it should lose a blind player, and the
// planner should do much better than one. docs/progression.md "How solved fights are" has the first measurement.
// How solved are fights? The planner (reads every rule, tell and timer) against a blind player: each cycle it fires
// the first ready skill on its bar, in bar order, at the first part on the board, Spike when nothing else is ready.
import { POLICIES, generic, at } from './balance.mjs';
import { livingParts, barKeys, readyIn, toIntent } from './dist/combat.mjs';
const blind = (s) => {
  const t = livingParts(s)[0]; if (!t) return 'hold';
  const ids = barKeys(s).map(([, id]) => id).filter((id) => id !== 'spike').concat('spike');
  for (const id of ids) { if (readyIn(s, id) > 0) continue; for (const c of [`${id} ${t.id}`, id]) if (!toIntent(s, c).error) return c; }
  return 'hold';
};
const sum = (rs) => ({ win: Math.round(100 * rs.filter((r) => r.win).length / rs.length), lost: Math.round(rs.reduce((a, r) => a + Math.min(100, r.lostPct), 0) / rs.length), cycles: (rs.reduce((a, r) => a + r.cycles, 0) / rs.length).toFixed(1) });
const rows = [];
for (const L of [10, 18, 30, 50]) for (const C of ['Breaker', 'Bastion', 'Infiltrator', 'Operator']) {
  const b = at(L), smart = POLICIES[C];
  const p = sum(generic(C, b)); POLICIES[C] = blind; const q = sum(generic(C, b)); POLICIES[C] = smart;
  rows.push({ level: L, class: C, 'planner win%': p.win, 'blind win%': q.win, 'planner lost%': p.lost, 'blind lost%': q.lost, 'planner cycles': p.cycles, 'blind cycles': q.cycles });
}
console.table(rows);
