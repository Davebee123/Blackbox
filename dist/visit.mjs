// A visit (GAME_RULES.md "Visits"): jack out and a disconnect both bring home everything it paid (run.mjs bank). The
// one thing a disconnect loses is the visit's Warm cache, which lives on the visit and starts cold on the next.

// Warm cache (GAME_RULES.md "Warm cache"): each room you win on a visit adds a stack, up to WARM.max; each gives
// WARM.xp more XP and WARM.scavenge more Scavenge to everything after it on that visit. It lives on the visit
// (R.visit.warm), so every connect starts cold, and a disconnect loses it. A co-op guest's game
// gets the host's stacks with each reward (coop.mjs payReward: s._warm while it pays).
export const WARM = { max: 10, xp: 0.1, scavenge: 5 };
export const warmOf = (s) => {
  if (s?._warm != null) return s._warm;
  const R = s?.rooms;
  return R?.world && R.at && R.visit ? Math.min(WARM.max, R.visit.warm || 0) : 0;
};
export const warmXp = (s) => 1 + WARM.xp * warmOf(s);
export const warmScavenge = (s) => WARM.scavenge * warmOf(s);
// The Warm cache's extra XP is held on the visit (R.visit.held) and paid when you jack out (floorplan.mjs jackOut);
// a disconnect loses it. A co-op guest's is held on their session until the host's visit ends. True when it was held;
// false (no visit) pays it at once.
export function holdWarm(s, extra) {
  if (s?._warm != null) { if (!s._hold) return false; s._hold.held = (s._hold.held || 0) + extra; return true; } // a co-op guest's: held on their session (coop.mjs)
  const R = s?.rooms;
  if (!(R?.world && R.at && R.visit)) return false;
  R.visit.held = (R.visit.held || 0) + extra;
  return true;
}
export const heldOf = (s) => s?._held ?? ((s?.rooms?.at && s.rooms.visit?.held) || 0); // _held: a co-op guest's view (coop.mjs viewOf)
// A room won: one more stack (floorplan.mjs roomEnd, after the room's own pay).
export const warmUp = (R) => { if (R?.world && R.visit) R.visit.warm = Math.min(WARM.max, (R.visit.warm || 0) + 1); };

// A save from before Phase 6 (demo-plan.md) carries the visit's snap on its run (s.run.snap): it goes, keyed on the field.
export function snapRestore(s) { if (s?.run && 'snap' in s.run) delete s.run.snap; return s; }
