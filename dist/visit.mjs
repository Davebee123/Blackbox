// A visit: jack out saves it, a disconnect undoes it (GAME_RULES.md "Visits"). As you connect, run.mjs snaps your
// progress onto the run (s.run.snap); jacking out drops the snap (run.mjs bank), and a disconnect (combat.mjs
// disconnect, either path) puts it back, so you stand exactly where you stood when you connected.
//
// An allowlist, on purpose: what isn't named here keeps moving (the market and the director, mail and contracts
// received, invasions and the wall, runners, the consortium and co-op, achievements, your profile, INIT's table,
// settings and clocks, and the map: servers and leads you found). A field added later keeps its new value through a
// disconnect until it's named here; that errs toward keeping what you got, never toward undoing the world.
//   PROGRESS   your XP and levels (and what spends with them: rested, the bar and talents), items, credits, code,
//              components, what kills teach (the Codex, research, mastery), drop luck, rep and floor jobs.
//   the server the one you're on, in place: its rooms (cleared, down, taken, opened), its spawns, Root, its Resident;
//              never its visit bookkeeping (LOC_KEEP, ROOMS_KEEP: the reconnect wait, the last visit's card, the log).
//   contracts  each one you held at connect gets its count back, and an Install job's item goes back in your stash;
//              contracts received meanwhile stay.
//   Integrity  back to what it was at connect.
export const PROGRESS = ['hackers', 'rested', 'xpMix', 'killXp', 'killXpFrom', 'firsts', 'freshAt', 'loadout', 'gear', 'stash', 'nextItem', 'items', 'collection', 'earned', 'pins', 'materials', 'components', 'filters', 'programs', 'codebases', 'factionParts', 'cargo', 'dex', 'research', 'mastery', 'geneCodex', 'pity', 'netPity', 'standing', 'arcs'];
const LOC_KEEP = ['floorplan', 'lockUntil', 'deaths', 'runs', 'unseen'];
const ROOMS_KEEP = ['at', 'visit', 'visits', 'screen', 'homeAt', 'reconnectAt', 'deaths', 'last', 'log', 'stats', 'fightFrom', 'inSince', 'max', 'signal'];

const pick = (o, keys) => Object.fromEntries(keys.filter((k) => o[k] !== undefined).map((k) => [k, o[k]]));
const omit = (o, keys) => Object.fromEntries(Object.entries(o || {}).filter(([k]) => !keys.includes(k)));

// The snap, taken once the connect is done (its first-visit XP is yours).
export function snapVisit(s, loc, at = Date.now()) {
  if (!s.run) return null;
  const R = loc?.floorplan;
  return (s.run.snap = structuredClone({
    at, // when: the No carrier card's image time
    integrity: s.run.integrity,
    credits: s.server.credits,
    progress: pick(s, PROGRESS),
    loc: loc ? omit(loc, LOC_KEEP) : null,
    rooms: R ? omit(R, ROOMS_KEEP) : null,
    jobs: (s.mail?.jobs || []).filter((j) => !j.done).map((j) => ({ id: j.id, got: j.got, carry: j.carry })),
  }));
}

// Put o back to the snap's keys in place (others hold references to it), sparing keep.
function restoreIn(o, from, keep) {
  for (const k of Object.keys(o)) if (!keep.includes(k) && !(k in from)) delete o[k];
  Object.assign(o, from);
}

// A disconnect: the visit undone. loc: the server you were on. Returns false with no snap (a save from before it).
export function revertVisit(s, snap, loc) {
  if (!snap) return false;
  const x = structuredClone(snap);
  for (const k of PROGRESS) if (!(k in x.progress)) delete s[k];
  Object.assign(s, x.progress);
  s.server.credits = x.credits;
  s.server.integrity = Math.max(1, x.integrity);
  if (loc && x.loc) restoreIn(loc, x.loc, LOC_KEEP);
  if (loc?.floorplan && x.rooms) restoreIn(loc.floorplan, x.rooms, ROOMS_KEEP);
  for (const j of x.jobs) {
    const c = (s.mail?.jobs || []).find((y) => y.id === j.id);
    if (c && !c.done) { c.got = j.got; c.carry = j.carry === 'pack' ? 'stash' : j.carry; } // an Install job's item: back in your stash
  }
  return true;
}

// Warm cache (GAME_RULES.md "Warm cache"): each room you win on a visit adds a stack, up to WARM.max; each gives
// WARM.xp more XP and WARM.scavenge more Scavenge to everything after it on that visit. It lives on the visit
// (R.visit.warm), so every connect starts cold and a disconnect's revert takes it with the rest. A co-op guest's game
// gets the host's stacks with each reward (coop.mjs payReward: s._warm while it pays).
export const WARM = { max: 10, xp: 0.1, scavenge: 5 };
export const warmOf = (s) => {
  if (s?._warm != null) return s._warm;
  const R = s?.rooms;
  return R?.world && R.at && R.visit ? Math.min(WARM.max, R.visit.warm || 0) : 0;
};
export const warmXp = (s) => 1 + WARM.xp * warmOf(s);
export const warmScavenge = (s) => WARM.scavenge * warmOf(s);
// A room won: one more stack (floorplan.mjs roomEnd, after the room's own pay).
export const warmUp = (R) => { if (R?.world && R.visit) R.visit.warm = Math.min(WARM.max, (R.visit.warm || 0) + 1); };

// A co-op guest's own save as they join the host's run (coop.mjs guestGame): their progress, credits and Integrity.
// A wipe puts it back (revertSave); the host's jack out, or the host dropping, keeps it.
export const snapSave = (s) => structuredClone({ integrity: s.server.integrity, credits: s.server.credits, progress: pick(s, PROGRESS) });
export function revertSave(s, snap) {
  if (!snap) return false;
  const x = structuredClone(snap);
  for (const k of PROGRESS) if (!(k in x.progress)) delete s[k];
  Object.assign(s, x.progress);
  s.server.credits = x.credits;
  s.server.integrity = Math.max(1, x.integrity);
  return true;
}
