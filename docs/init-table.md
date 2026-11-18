# INIT's table: the net's pressure, felt in fights, gear and XP

**Status.** Proposed November 2026, not built. Replaces INIT's count in market.md 4, which moved prices. No prices
here: the count changes what you fight, what drops and what the director deals.

## 1. The rule

- **One number a save:** *process table at N%*, 70% to 95%. It starts at 84%.
- **Logged-on time fills it:** +2 an hour (orphans piling up). Nothing moves while you're logged off.
- **Your play empties it.** Orphans are strays tagged ◌ that turn up on every floor at your level; each one broken
  frees 0.2. A Mapped server frees 1, a clean Orphans contract 2.
- **Events jump it** (section 4): a crew's run +3, a cancel round −8, INIT's first fall −20.
- **You steer it.** Both ends pay, differently. Let it fill for volume; clear it for quality. Neither end is a
  penalty, and the middle is the net as it is today.

## 2. The two bands

Each band's effect grows from its edge to its end.

| | **Full** (88% → 95%) | **Clear** (80% → 70%) |
|---|---|---|
| The net | Orphans everywhere | Trades finish |
| Fights | Orphans 1 stray in 3 (1 in 8 between); elites take an orphan add | Fewer strays; ★ rare spawns twice as often |
| XP | Orphan kills +25% (Fights) | Break-ins and Intel +25% |
| Gear | Trash rolls an item 1.5× as often (white and blue) | Blue and yellow odds ×1.4 on elites, rare spawns and vaults |
| Events | Outbreak, Bounty and Hot strain twice as often; INIT's warnings on the Log from 90% | Courier and Leak twice as often; stray caches settle as vault caches |

Volume against quality: a full table is more fights, more XP an hour and more whites and blues; a clear one is fewer,
better drops and a better hour for break-ins. Totals over a session sit within 10% of each other (to be measured).

## 3. Gear that reads it

A few pieces care where the table is; none moves it. Lean: four, on the deep floors' drop lists.

| Piece | Kind | Does |
|---|---|---|
| **Root of Trust** (INIT) | Unique | +1% damage per point over 80% |
| **Warm Reset** (INIT) | Unique | Under 80%, your first shield each fight is doubled |
| **Adoption Papers** | Affix (deep floors) | Orphans you break free 0.4, not 0.2 |
| **Settlement Seal** | Affix (deep floors) | In the Clear band, +1 roll on vaults |

## 4. Events that move it

The director deals these on its own dice, as now (director.md: it never reads your gear or how you're doing). Missing
one costs nothing.

| Event | Count | When |
|---|---|---|
| **A crew's run** (TOLLGATE, SWARMLINE, PALEMASK) | +3 | The built Outbreak, now with a reason |
| **Margin call** (account nine) | +2 | Rare |
| **Cancel round** (a crisis) | −8 | At 95%: LANTERN reads the cancelled accounts. A floor's orphans surge for its hour; taking part pays once |
| **Census** (LANTERN) | −1 | A Log line at each two points: *Four. Nine. Nine. The table is at eighty-eight.* |
| **INIT's first fall** | −20 | Once. Lore 3: the fall frees a large block |

## 5. On screen

- A small bar at the network map's top right: the count, its two bands marked, the number and the band's effects in
  its tooltip (decided for market.md).
- ◌ on an orphan's name, its tooltip: *Orphan. A trade still waiting for its other side. Breaking it frees a slot.*
- LANTERN's census lines and INIT's warnings on the Log.

## 6. Open choices

1. **Does your play move it?** Proposed yes (orphan kills, Mapped, contracts). The alternative keeps market.md's rule:
   the net moves it alone, and you only read it.
2. **One count or one a floor?** Proposed one. A count a floor would let you pick a floor by its band, at the cost of
   eight bars.
3. **INIT's fight:** stays at 97% → 61%, or starts from today's count (a full table, a longer fight).

## 7. Build order

1. A scratchpad prototype: the count over 8 logged-on hours for three players (a farmer, a contract worker, a
   breaker), and the bar's look in two or three options.
2. The count, orphans, the bands and the bar (one slice), with a unit test and GAME_RULES.
3. The events, then the four pieces.
