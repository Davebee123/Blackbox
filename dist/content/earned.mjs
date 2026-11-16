// Earned pieces' counts (earned.mjs, GAME_RULES.md *Earned pieces*): one entry a piece, the one place to tune them.
//   { n, on: [src] }           events of these sources, counted from its band
//   { n, distinct: 'field' }   different ones, by that field of the event (a server's specials)
//   { state, floor, n? }       what the floor shows: mapped, held, root (at root), elites, located, islands, mapped of a
//                              kind (kind); no n: all of it. all: every floor (root)
// floor: the floor it belongs to (its band, its goal's place); a cross-floor piece's floor is only its band.
export default {
  // The floor feats.
  "street-atlas": { floor: 1, state: "mapped" },
  "quiet-hours": { floor: 2, n: 3, on: [{ kind: "router-vault", floor: 2 }] },
  "sweetener": { floor: 3, n: 12, on: [{ kind: "bait", floor: 3 }] },
  "ring-main": { floor: 4, state: "held", n: 8 },
  "mixed-bag": { floor: 5, n: 6, distinct: "special", on: [{ kind: "takeover", floor: 5 }] },
  "superuser": { floor: 6, state: "root", n: 3, root: 3 },
  "bottleneck": { floor: 7, state: "elites" },
  "last-mile": { floor: 8, state: "mapped" },
  // The floors' own (a sidegrade each).
  "regular": { floor: 1, n: 150, on: [{ kind: "sprawl" }] },
  "dead-end": { floor: 2, n: 5, on: [{ kind: "puzzle", id: "chase", floor: 2 }] },
  "one-way": { floor: 2, n: 10, on: [{ kind: "puzzle", id: "chase", floor: 2 }] },
  "turnout": { floor: 2, n: 15, on: [{ kind: "puzzle", id: "chase", floor: 2 }] },
  "honeycomb": { floor: 3, state: "mapped", kind: "Honeypot", n: 5 },
  "ice-pick": { floor: 4, n: 10, on: [{ kind: "cold-quick", floor: 4 }] },
  "rime": { floor: 4, n: 25, on: [{ kind: "cold-quick", floor: 4 }] },
  "thaw": { floor: 4, n: 50, on: [{ kind: "cold-quick", floor: 4 }] },
  "sapper": { floor: 5, n: 6, on: [{ kind: "armored-core", floor: 5 }] },
  "grub": { floor: 6, n: 40, on: [{ kind: "root-clear", floor: 6 }] },
  "chainload": { floor: 6, n: 80, on: [{ kind: "root-clear", floor: 6 }] },
  "post": { floor: 6, n: 120, on: [{ kind: "root-clear", floor: 6 }] },
  "culvert": { floor: 7, n: 12, on: [{ kind: "rare", floor: 7 }] },
  "lagoon": { floor: 8, state: "islands", n: 1 },
  "reef": { floor: 8, state: "islands", n: 3 },
  "causeway": { floor: 8, state: "islands" },
  // Across floors (stronger).
  "plumb-line": { floor: 5, state: "mapped", n: 8 },
  "field-book": { floor: 5, state: "mapped" },
  "hi-vis": { floor: 6, state: "mapped", n: 8 },
  "datum": { floor: 6, state: "mapped" },
  "waybill": { floor: 2, n: 10, on: [{ kind: "contract" }] },
  "dray": { floor: 2, n: 25, on: [{ kind: "contract" }] },
  "tailgate": { floor: 2, n: 50, on: [{ kind: "contract" }] },
  "freehold": { floor: 6, state: "root", root: 5, all: true, n: 1 },
  "deed": { floor: 6, state: "root", root: 5, all: true, n: 3 },
  "sitting-tenant": { floor: 6, state: "root", root: 5, all: true, n: 5 },
  "sampler": { floor: 3, n: 8, distinct: "id", on: [{ kind: "puzzle" }] },
  "field-guide": { floor: 4, n: 20, distinct: "strain", on: [{ kind: "strain" }] },
  "no-rest": { floor: 4, n: 5, on: [{ kind: "map-norest" }] },
  "long-shot": { floor: 7, n: 10, on: [{ kind: "locate", floor: [5, 8] }] },
};
