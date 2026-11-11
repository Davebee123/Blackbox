// Earned pieces' counts (earned.mjs, GAME_RULES.md *Earned pieces*): one entry a piece, the one place to tune them.
//   { n, on: [src] }           events of these sources, counted from its band
//   { n, distinct: 'field' }   different ones, by that field of the event (a server's specials)
//   { state, floor, n? }       what the floor shows: mapped, held, root (at root), elites, located; no n: all of it
export default {
  "street-atlas": { floor: 1, state: "mapped" },
  "quiet-hours": { floor: 2, n: 3, on: [{ kind: "router-vault", floor: 2 }] },
  "sweetener": { floor: 3, n: 12, on: [{ kind: "bait", floor: 3 }] },
  "ring-main": { floor: 4, state: "held", n: 8 },
  "mixed-bag": { floor: 5, n: 6, distinct: "special", on: [{ kind: "takeover", floor: 5 }] },
  "superuser": { floor: 6, state: "root", n: 3, root: 3 },
  "bottleneck": { floor: 7, state: "elites" },
  "last-mile": { floor: 8, state: "mapped" },
};
