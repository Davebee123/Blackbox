# Loot plan: sets and uniques

What's still to add to the item pool. Built: the 21 sets, Batch 1 (the 60 uniques for levels 39–50) and faction gear,
all in GAME_RULES.md "Items". Left: the thin middle, and the pool from 158 uniques toward about 240.

## Principles

Taken from Diablo 2: modest items, general effects with a natural lean, something to find in every stretch.

- **Modest on their own.** A unique or set piece is a sidegrade, about a good blue. A full set is the payoff.
- **General, with a lean.** Effects work in every fight and never name a virus, gene, guard or boss.
- **Every band has something**, weighted by how long players spend in it.
- **Sources are activities**: bosses and lairs, vaults, rare spawns, strains, threads, puzzle boards, crew bosses.
- **The drop rate doesn't rise.** Under one unique or set piece an hour; a bigger pool makes each drop likelier new.
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

- **Sources before the bosses exist.** Until a floor 3–8 boss is built, its pieces and uniques drop from that floor's
  lair boss.
- **Build order.** Batch 1 first (done), then the thin middle (15–20 and 33–38), then the rest toward 240.
- **Measuring the unique rate.** The simulation bot's clock overcounts invasions and couriers: fix it before tuning
  drop odds against the bigger pool.
- **Glyphs.** Each item's glyph comes from its kind, a hash of its name, its main stat and its rarity, so new items
  need no art.
