# Loot plan: sets and uniques

What's still to add to the item pool. Built: the 21 sets, Batch 1 (the 60 uniques for levels 39–50) and faction gear,
all in GAME_RULES.md "Items". Left: the thin middle, and the pool from 158 uniques toward about 240. Floors 2–8 to
five sets and 20 uniques each: docs/floor-items.md (designed).

## Principles

Taken from Diablo 2: modest items, general effects with a natural lean, something to find in every stretch.

- **Modest on their own.** A unique or set piece is a sidegrade, about a good blue. A full set is the payoff.
- **General, with a lean.** Effects work in every fight and never name a virus, gene, guard or boss.
- **Every band has something**, weighted by how long players spend in it.
- **Sources are activities**: bosses and lairs, vaults, rare spawns, strains, threads, puzzle boards, crew bosses.
- **The drop rate doesn't rise.** Under one unique or set piece an hour; a bigger pool makes each drop likelier new.
- **Earned pieces are outside that rate** (*Earned pieces* below): a piece worked toward for hours doesn't cheapen a drop.
- **Clock Speed caps at 25%**, so its lines on items stay small (4–10%).

## Unique plan

Non-set uniques by band, against where players spend their hours:

| Levels | Uniques now | Next |
|---|---:|---|
| 1–8 | 41 | none: about two hours of play |
| 9–14 | 18 | |
| 15–20 | 8 | **the thin middle: a batch** |
| 21–32 | 24 | |
| 33–38 | 6 | **the thin middle: a batch** |
| 39–44 | 31 | Batch 1, built |
| 45–50 | 30 | Batch 1, built |

Batch 1 leans thin on the Breaker, Infiltrator and Operator at 45–50 (3 each); the next batches even it out.

## Decisions

- **Five sets a floor, under the same cap** (November 2026). Set pieces count toward the hour; each set drops from
  one activity, so a player finishes about one a floor. Each source aims at 3–5 hours of its activity a piece
  (docs/floor-items.md).
- **Sources before the bosses exist.** Until a floor 3–8 boss is built, its pieces and uniques drop from that floor's
  lair boss.
- **Build order.** Batch 1 first (done), then the thin middle (15–20 and 33–38), then the rest toward 240.
- **Measuring the unique rate.** The simulation bot's clock overcounts invasions and couriers: fix it before tuning
  drop odds against the bigger pool.
- **Glyphs.** Each item's glyph comes from its kind, a hash of its name, its main stat and its rarity, so new items
  need no art.

## Earned pieces (designed, not built)

The large goals a floor gives (the designer, November 2026): do an activity to the end and a named item arrives, as
GW2's map completion and collections pay. No new system: the counters mostly exist, and the collection log and the set
tooltip already list every piece.

- **A guarantee on completion.** The count replaces the roll and its pity. The piece arrives when the count fills.
- **Shown from the start.** A missing earned piece shows its name, stats and count (*Punch Card · Quarantine 4/6*),
  never ???. One can be pinned to the map as a contract is.
- **Counted from the band.** A count starts when you reach the set's or the unique's level band.
- **A level requirement.** An earned piece loads only at its own level or above. Items have none today: whether every
  item gets one is open.
- **Outside the one-an-hour rule.** About 41 pieces over the climb.
- **Bosses keep their rolls:** Boot Disk, Hive Mind, Choirbook, Glass Ceiling, On-Call, Mesh, Bedrock, the tier sets,
  boss uniques.

Every count is a first guess from today's averages and what a floor holds; none has met the sims.

### Sets: the roll becomes a count

| Set | Counts | Pieces at |
|---|---|---|
| Night Shift | Threads finished on floors 1–2 | 2 · 4 · 6 |
| Kestrel Clearance | Kills of the piece's own guard (Bouncer, Tracer, Sentinel) | 8 each |
| Patchwork | Strain kills of the piece's lineage | 30 each; Seam at 10 different strains |
| Lantern Route | LANTERN couriers intercepted | 5 · 10 · 15 |
| Cold Storage | Vaults opened on Coldline | 4 · 8 · 12 |
| Overtime | Boards won of the piece's kind | 6 each |
| Burst Buffer | ★ rare spawns killed, floor 5 down | 10 · 20 · 30 |
| Hot Spare | Takeovers on floors 5–6 | 8 · 16 |
| Deep Archive | Vaults opened on floors 7–8 | 6 · 12 · 18 · 24 |

### A new set: Full Coverage (floors 5–6, mapping)

| Piece | Slot, level | Goal |
|---|---|---|
| Plumb Line | exploit, 26 | Map 8 servers on Deep Core |
| Field Book | script, 29 | Map all 16 on Deep Core |
| Hi-Vis | shell, 33 | Map 8 servers on Kernel Space |
| Datum | implant, 37 | Map all 16 on Kernel Space |

Bonus sketch: (2) +2 Regen · (3) a room's first clear pays a share of a kill's XP · (4) your first fight in each room
starts with a ◆.

### One unique feat a floor

Each leans on what its floor is known for; no two ask for the same kind of play. Effects are placeholders.

| Floor | Feat | Unique | Effect sketch |
|---|---|---|---|
| 1 The Sprawl | Map every server | Street Atlas (script, 8) | +10% damage in a room you haven't cleared |
| 2 Backhaul | Bank 3 Router vaults, the Tracker never reaching you | Quiet Hours (shell, 13) | +6% Stealth |
| 3 The Stacks | Take 12 bait caches on Honeypots | Sweetener (implant, 18) | Taking a cache heals 5% of max Signal |
| 4 Coldline | Hold 8 servers on the ring | Ring Main (proxy, 24) | +1 Block for every 5 servers you hold, up to 4 |
| 5 Deep Core | Take over a server of each special | Mixed Bag (script, 30) | +3% damage for each special on the server |
| 6 Kernel Space | Root 3 on three servers | Superuser (implant, 36) | +6% damage and max Signal on a server you hold |
| 7 The Sink | Clear every elite room once | Bottleneck (exploit, 42) | Each tell answered in a fight: +4% damage, up to 3 |
| 8 Bedrock | Locate every server | Last Mile (proxy, 48) | +5% damage for each part in the fight past two |

Floors 3 and 6 fall in the thin bands (15–20, 33–38).

### Open

- **Counters to add:** bait caches taken, elite rooms cleared a floor, servers held a floor.
- **The Sink's and Bedrock's activity uniques** (threads, vaults, boards) stay on their rolls until this has been played.
- **Prototype first:** how a piece's goal reads in the collection log and the set tooltip.
