// Goals in sight (docs/demo-plan.md Phase 8): the map's Goals tracker under Contracts, three rows. Your pins come first
// (an earned piece's pin is earned.mjs s.pins, the one its Ledger line sets; an achievement's is s.goals.pins), the
// rest fill in on their own. Reads earned.mjs and achievements.mjs, changes neither's state.
//   s.goals: { pins: ['a:<id>'], auto: [keys], seen: { key: n }, moved: { key: play ms }, shut }
// A key is 'p:<piece id>' or 'a:<achievement id>'. The auto rows are picked again only at a calm moment (refreshGoals:
// the map opened off a run, a jack out), so they never jump while you watch: a goal that moved since the last pick goes
// first, then the nearest done by share, then the fewest left. Left out: what you can't reach yet, anything under
// MIN_SHARE done, and the class climbs (a class to 50).
import { UNIQUES, emit, warn } from './combat.mjs';
import { EARNED, earnedOf, pinsOf, PIN_MAX } from './earned.mjs';
import { achievements, achById, earned, progressOf, rewardText } from './achievements.mjs';

export const GOALS = { rows: PIN_MAX, minShare: 0.1, movedMs: 30 * 60_000 };
const G = (s) => (s.goals ||= { pins: [], auto: null, seen: {}, moved: {}, shut: false });
const playMs = (s) => s.pace?.ms || 0;

// One goal by key, as the tracker draws it: { key, kind, id, name, n, of, what, reward, pinned }, or null when it's done
// or gone.
export function goalOf(s, key, pinned = false) {
  const [k, id] = [key.slice(0, 1), key.slice(2)];
  if (k === 'p') {
    const p = earnedOf(s, id);
    if (!p || p.got) return null;
    return { key, kind: 'piece', id, name: UNIQUES[id].name, n: p.n, of: p.of, what: p.text, open: p.open, full: p.full, pinned };
  }
  const a = achById(id);
  if (!a || earned(s, id)) return null;
  const pr = progressOf(a, s), [n, of] = Array.isArray(pr) ? pr : [0, 1];
  return { key, kind: 'ach', id, name: a.name, n, of, what: a.rule, reward: rewardText(a), cat: a.cat, pinned };
}
export const pinKeys = (s) => [...pinsOf(s).map((id) => `p:${id}`), ...(s.goals?.pins || []).filter((k) => goalOf(s, k))];
const inReach = (g) => g && g.n > 0 && g.n < g.of && g.n / g.of >= GOALS.minShare && (g.kind === 'ach' ? g.cat !== 'class' : g.open && !g.full);
// Every goal the auto rows could pick.
function candidates(s) {
  const out = [];
  for (const u of EARNED) { const g = goalOf(s, `p:${u.id}`); if (inReach(g)) out.push(g); }
  for (const a of achievements()) { const g = goalOf(s, `a:${a.id}`); if (inReach(g)) out.push(g); }
  return out;
}
// Pick the auto rows again (a calm moment). Returns the keys picked.
export function refreshGoals(s) {
  const t = G(s), now = playMs(s), pins = new Set(pinKeys(s)), all = candidates(s);
  for (const g of all) {
    if (t.seen[g.key] != null && g.n > t.seen[g.key]) t.moved[g.key] = now;
    t.seen[g.key] = g.n;
  }
  const recent = (g) => (t.moved[g.key] != null && now - t.moved[g.key] <= GOALS.movedMs ? t.moved[g.key] : -1);
  all.sort((a, b) => recent(b) - recent(a) || b.n / b.of - a.n / a.of || a.of - a.n - (b.of - b.n));
  t.auto = all.filter((g) => !pins.has(g.key)).map((g) => g.key);
  return t.auto;
}
// The tracker's rows: pins, then the auto picks still standing, GOALS.rows in all.
export function goalsOf(s) {
  const pins = pinKeys(s).map((k) => goalOf(s, k, true)).filter(Boolean);
  if (!s.goals?.auto) refreshGoals(s);
  const auto = s.goals.auto.filter((k) => !pins.some((g) => g.key === k)).map((k) => goalOf(s, k)).filter((g) => g && g.n < g.of);
  return [...pins, ...auto].slice(0, GOALS.rows);
}
// Pin or unpin a goal (the row's pin button; an earned piece's pin is its Ledger pin). Returns whether it's pinned now.
export function togglePin(s, key) {
  const g = goalOf(s, key);
  if (!g) return false;
  const t = G(s);
  if (pinKeys(s).includes(key)) {
    if (g.kind === 'piece') s.pins = pinsOf(s).filter((x) => x !== g.id);
    else t.pins = t.pins.filter((x) => x !== key);
    emit(s, 'info', `Unpinned ${g.name}.`);
    return false;
  }
  if (pinKeys(s).length >= GOALS.rows) { warn(s, `Pins are full (${GOALS.rows}). Unpin one first.`); return false; }
  if (g.kind === 'piece') s.pins = [...pinsOf(s), g.id];
  else t.pins = [...t.pins.filter((k) => goalOf(s, k)), key];
  emit(s, 'info', `Pinned ${g.name} to the map.`);
  return true;
}
// Fold or open the tracker (its header). Kept on the save.
export function foldGoals(s) { const t = G(s); t.shut = !t.shut; return t.shut; }
