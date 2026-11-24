// The finish card (docs/demo-plan.md Phase 8, goals in sight): after a big finish, a card over the map once you're off
// the run: what finished, what it paid, and the goal nearest done next (goals.mjs). A big finish: a server mapped or
// taken over, a boss down, a floor job done, a goal on your tracker reached. The newest one wins; it waits for a calm
// moment (no run, no fight, nothing else up: app.js renderFinish).
//   s.finish: { kind, name, pays: [[glyph, n]] }
export const FINISH = { mapped: 'Server mapped', takeover: 'Server taken over', boss: 'Boss down', chain: 'Floor job done', goal: 'Goal reached' };
export function noteFinish(s, kind, name, pays = []) {
  if (!s || s.who || !FINISH[kind]) return;
  s.finish = { kind, name, pays: pays.filter(([, n]) => n > 0) };
}
// Was this goal on your tracker (pinned, or one of the auto rows it showed)? Its key, as goals.mjs writes them.
export const tracked = (s, key) => (s.goals?.pins || []).includes(key) || (s.pins || []).includes(key.slice(2)) || (s.goals?.auto || []).slice(0, 3).includes(key);
export const finishOf = (s) => s.finish || null;
export function finishDone(s) { s.finish = null; }
