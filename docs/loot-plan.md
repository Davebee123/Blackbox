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
- **Earned pieces are outside that rate** (*Earned pieces* below): a floor's feat doesn't cheapen a drop.
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

## Earned pieces (built, November 2026)

The large goals a floor gives (the designer, November 2026): finish a floor's feat and a named unique arrives, as GW2's
map completion pays. Built as GAME_RULES.md *Earned pieces* (`earned.mjs`, the counts in `dist/content/earned.mjs`).

- **Separate from the drops** (the designer): different things drop from different activities, so every set keeps its
  roll and its source. Earned pieces are new items of their own, kept few: one unique a floor.
- **A guarantee on completion,** counted from the floor's band, outside the one-an-hour rate.
- **Shown from the start:** named in the Ledger with its count, never ???; up to 3 pinned to the map.
- **Cut:** moving the nine activity sets to counts, and the Full Coverage set (floors 5–6, mapping).

### One unique feat a floor

Each leans on what its floor is known for; no two ask for the same kind of play. Effects are first guesses.

| Floor | Feat | Unique | Effect |
|---|---|---|---|
| 1 The Sprawl | Map every server | Street Atlas (script, 8) | +10% damage in a room you haven't cleared |
| 2 Backhaul | Bank 3 Router vaults, the Tracker never reaching you | Quiet Hours (shell, 13) | +6% Stealth |
| 3 The Stacks | Take 12 bait caches on Honeypots | Sweetener (implant, 18) | Taking a cache heals 5% of max Signal |
| 4 Coldline | Hold 8 servers on the ring | Ring Main (proxy, 24) | +1 Block for every 5 servers you hold, up to 4 |
| 5 Deep Core | Take over servers with 6 different specials | Mixed Bag (script, 30) | +3% damage for each special on the server |
| 6 Kernel Space | Root 3 on three servers | Superuser (implant, 36) | +6% damage and max Signal on a server you hold |
| 7 The Sink | Clear every elite room once | Bottleneck (exploit, 42) | Each tell answered in a fight: +4% damage, up to 3 |
| 8 Bedrock | Map every server | Last Mile (proxy, 48) | +5% damage for each part in the fight past two |

- **Cleared is Mapped** (the designer): a server cleared is one Mapped, every counted room cleared once.
- **Mixed Bag** asks for 6 of the 7 specials: a floor's servers don't always carry every one.
- **Bottleneck:** every server on The Sink located; one not yet located counts as one elite room.
- **Pinned rows** say the goal in the Ledger's words with its count, on its own line when long.
