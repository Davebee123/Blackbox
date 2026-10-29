# Progression: the pace of the climb

**Status.** The model behind how long the climb takes and where XP comes from. Built: the curve, deeds, contract XP,
respawns, Rested and the capstones (GAME_RULES.md *Levels*, *Classes and loadout*, *Mail and contracts*, *Runs*).
Left: the open decisions in 7.

## 7. The long climb

The designer wants the game to work as a long sandbox (Warframe, Starsector, Terraria: many activities, no
concentrated storyline), front-loaded. Real players take 10 to 15 seconds a mob, about 150 kills an hour with the walk
(`LOOT.killsPerHour`).

### The pace model

Two players, both from the formulas (data.mjs `CLIMB`, `DEED`; mail.mjs `BASE`, `SIZE`, `MAIL.xp`):

| Hours to | Lv 5 | Lv 10 | Lv 20 | Lv 30 | Lv 40 | Lv 50 |
|---|---:|---:|---:|---:|---:|---:|
| Contract worker (`PACE_TARGET`, what the bot is held to) | 0.7 | 2.7 | 10.0 | 23.4 | 43.4 | 66.8 |
| Farmer, Mapped lumps included (`FARM_TARGET`, `CLIMB.minutes`) | 1.1 | 4.1 | 15.1 | 35.1 | 65.1 | 100.2 |

- **Kills** pay 20 + 10 × level; a level takes `CLIMB.kills` kills of your level. Not scaled.
- **Deeds** (Mapped, takeovers, Root levels) pay their kill shares times `deedScale` (`DEED.share` 0.4 × how much longer
  the level is than before the long climb), so exploring still pays about a quarter. Mapped pays its 5 kills plus half
  of each counted fight room's kill. A puzzle board, a decode and a log sweep pay a kill each, unscaled.
- **Contracts** pay a fixed amount set when posted: the kind's baseline in kills' worth (`BASE`) × its size by what it
  counts (`SIZE`: ×1, ×2, ×3) × the level curve (`MAIL.xp`: 3× at level 1, 8× at 5, 13× from 10 to 20, 11× from 30).
  The designer's answer: *players are faster than any table of minutes.*
- **Rested** banks only from time logged off (WoW's: 5% of a level every 8 hours, up to 1.5 levels). There is no
  catch-up XP.
- **Respawns** run 15, 20, 45 and 60 minutes (fight room, guard post, elite, Core) while you explore a server, and 2,
  3, 5 and 10 once it is Mapped or yours, so one server carries a session of farming without blocking mapping.

`node pacing.mjs [level] [seeds] [classes]` climbs each class and prints real hours against `PACE_TARGET`, with the XP
mix. loop.test.mjs holds levels 5 to 30 on seed 7. Measured, the farmer runs 25–40% behind `FARM_TARGET` (it loses the
first clears of servers it never maps), so working contracts pays about 1.76× farming's XP an hour, not the 1.5× aimed
for.

### Level gates

Approximate real hours at each gate on the farmer's pace (`CLIMB.minutes`); a contract worker gets there in about two
thirds of the time.

| Gate | Level | Hours |
|---|---:|---:|
| Kit talent, third skill; class trial ends; wick's breadcrumb | 4–5 | 0.6–1.1 |
| Fourth skill (the armor answer) | 7 | 2 |
| Subclass, edge, SIGINT, first talent point | 10 | 4 |
| Implant slot, a daemon slot | 15 | 9 |
| Crew bosses | 18 | 12 |
| Eighth bar slot | 22 | 18 |
| Ninth bar slot, sixth protocol slot, a daemon slot | 30 | 35 |
| Base tiers | 34, 42 | 46, 72 |
| Last subclass skill | 38 | 58 |
| Last daemon slot, capstone rank 1 | 45 | 82 |
| Capstone rank 2 | 50 | 100 |
| Floors open at | 7, 13, 19, 25, 31, 37, 43 | 2, 7, 14, 24, 38, 55, 75 |

### Open decisions

1. **The floor spread.** Floors are front-loaded: the Sprawl about 2 hours, Bedrock (43 to 50) about 25. Widen late
   bands, narrow early ones, or accept it.
2. **Deeds at 0.4.** At 1.0 exploring pays four fifths of the climb; at 0.4 kills stay about 70%. Exploration XP is
   the lever if the sandbox should push wandering over farming.
3. **Money and loot per level** are 15 to 20 times what they were before the long climb (per hour nothing changed). A
   level-priced economy may want prices per hour instead.
4. **Same-level elites while mapping.** Nobody outlevels a server while mapping it now; elites may want a look.
5. **Farming outpaced exploring** with fast respawns on held servers. If exploring should stay the faster road, the
   respawn kill could pay less on a server you hold, or deeds more.
6. **Damage capstones don't show at 50** (fights are 5 to 9 cycles), so the pace picks add a target, strip ◆ or buy
   time. Crew bosses, long fights, are where raw damage would count, and they aren't measured at 50.
7. **The level-50 solo floor.** Several subclasses lose under 15% at 50 with or without a capstone: drop the floor
   from 40, or make the level-50 fights harder.
8. **The contract share.** Working contracts measures 1.76× farming; a lower share gives 1.5× but puts the contract
   worker about 27% behind `PACE_TARGET`.

## Old sections, cited in code

| Section | Now |
|---|---|
| 1–6 (the v34 review: tables, diagnosis, options, what changed) | Built; GAME_RULES *Levels*. Effective keys (kits.md, balance.mjs) is one over the sum of squared key shares, Spike and SIGINT included. |
| Power spikes | GAME_RULES *Items* (base power follows item level, no step at a tier) |
| 7 (the curve, the XP mix, timers, the save v42, Behind removed, capstones) | Above, and GAME_RULES *Levels*, *Classes and loadout* (capstones), *Runs* (respawns) |
| How solved fights are; Every player, every tier; The program fits the trick | docs/puzzle-fights.md 5 |
| XP anchored by activities | 7, above |
