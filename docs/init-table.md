# INIT's table: the net's pressure, felt in fights, gear and XP

**Status.** Kept (the designer, November 2026). Slice 1 built: the count, orphans, the bands' Fights, XP and Gear rows, the Readout (GAME_RULES.md "INIT's table"). Replaces INIT's count in market.md 4, which moved prices. No prices
here: the count changes what you fight, what drops and what the director deals.

## 1. The rule

- **One number a save:** *process table at N%*, 70% to 95%. It starts at 81%, the count the cold open and the schedule page show.
- **Logged-on time fills it:** +2 an hour (orphans piling up). Nothing moves while you're logged off.
- **Your play empties it.** Orphans are strays tagged ◌ that turn up on every floor at your level; each one broken
  frees 0.08. A Mapped server frees 1, a clean Orphans contract 2.
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

### What play does to it (prototype: 200 seeds × 8 logged-on hours)

| Player | Full | Between | Clear |
|---|---|---|---|
| Farmer (180 kills an hour) | 45% | 55% | 0% |
| Contract worker (150, some maps and Orphans contracts) | 23% | 66% | 11% |
| Breaker (80, maps, hunts orphans) | 6% | 56% | 38% |
| Holds it full (skips orphans) | 72% | 28% | 0% |
| Holds it clear (hunts orphans) | 0% | 10% | 90% |

Each way of playing drifts to the band that pays it, and a player who wants the other band can steer there.

## 3. Gear that reads it

A few pieces care where the table is; none moves it. Lean: four, on the deep floors' drop lists.

| Piece | Kind | Does |
|---|---|---|
| **Root of Trust** (INIT) | Unique | +1% damage per point over 80% |
| **Warm Reset** (INIT) | Unique | Under 80%, your first shield each fight is doubled |
| **Adoption Papers** | Affix (deep floors) | Orphans you break free twice as much |
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

- *Plain* in the header (picked, replacing the map's *Readout*, too small to notice): *PROCESS TABLE 81%* between
  Signal and Credits. Its tooltip: the band as its kind, a bar from 70% to 95% with both bands and the count's tick, the band's effects as rows (icon chips), what fills and empties it.
- ◌ on an orphan's name, its tooltip: *Orphan. A trade still waiting for its other side. Breaking it frees a slot.*
- LANTERN's census lines and INIT's warnings on the Log.

## 6. INIT's fight

INIT's table starts at today's count and is won 36 points lower, so the fight is the same length from anywhere. Its act
marks sit 7 points apart from the start (solo-bosses.md: 97, 90, 83, 76, 68 → 61 at a count of 97). The band trades
one hard thing for one easy one, so no start is a handicap:

| Start | INIT | You |
|---|---|---|
| **Full** | Adopts two orphans every third cycle, one on the others | An orphan broken clean frees 3, not 2 |
| **Between** | As solo-bosses.md | As solo-bosses.md |
| **Clear** | Reaps its zombies every 3 cycles, not 4 | Orphans are re-parented after four cycles, not three |

## 7. Decided (the designer, November 2026)

- Your play moves the count.
- One count for the whole save.
- INIT starts from the count, and each band's start is balanced against itself (section 6).
- The bands' effects stay as section 2 has them.

## 8. Build order

1. A scratchpad prototype (done): the count over a session (section 2); the *Readout* picked over the Gauge and
   the Squares.
2. The count, orphans, the bands and the bar (one slice), with a unit test and GAME_RULES.
3. The events, then the four pieces.
