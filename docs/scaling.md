# Scaling: feeling stronger, then needing gear

The designer, November 2026: fights are solved once their mechanics are read, with no damage check, and leveling feels
flat: *"Mobs increase their power at a relatively linear rate and it feels like I'm just scaling my power with them."*
The compass is WoW: you feel powerful as you level, then it slowly gets harder until you need gear, and that repeats.

## 1. What the game does now

Measured November 3 (a scratch harness on the bench's `build`: four classes, planner, blues unless named; wins ·
cycles · Signal lost · the biggest single hit, as a share of your max).

**At your level, every level plays the same:**

| Level | 3 | 10 | 18 | 30 | 40 | 50 |
|---|---|---|---|---|---|---|
| Ordinary | 8 cyc · 34% · 16% | 9 · 38% · 26% | 11 · 25% · 17% | 10 · 29% · 25% | 12 · 38% · 22% | 8 · 24% · 18% |
| Elite | — | 13 · 42% · 21% | 20 · 22% · 14% | 14 · 21% · 16% | 11 · 27% · 14% | 10 · 19% · 12% |

**Outleveling barely helps.** Ten levels over, a fight still takes 7–9 cycles (WoW: a grey mob dies in a hit or two):

| You | Mob at your level | 3 below | 6 below | 10 below |
|---|---|---|---|---|
| 10 | 9 cyc · 38% | 9 · 19% | 7 · 7% | — |
| 20 | 11 · 31% | 12 · 18% | 9 · 9% | 7 · 12% |
| 30 | 10 · 29% | 10 · 21% | 9 · 16% | 9 · 11% |

**Gear matters a lot** (you at 20, the mob at 20; Signal lost):

| Gear level | Stock | Tuned | Custom (blue) |
|---|---|---|---|
| 10 | 52% | 50% | 30% |
| 20 | 49% | 36% | 19% |
| 25 | 37% | 33% | 14% |

Stuck in level-10 gear, a level-30 player loses 31% of fights at level (66% of its Signal lost).

Why:

- **One curve for everything.** Your power and a mob's both grow 4% a level, linear (`power`); a mob's damage another
  3% (`enemyRamp`). The friction target (35–45% lost at your level, at 10, 18 and 30) holds the at-level fight flat on
  purpose.
- **Level gaps are one-sided.** A mob above you takes 7% less a level and deals 10% more; below you, you deal at most
  15% more and take at most 30% less (`CONFIG.gap`). Being ahead is never felt.
- **Gear is one smooth curve** (`ITEM_CURVE`): no tier where new gear jumps you ahead.
- **Content follows you.** Server rooms keep their slot's level (floors 1–8 to 43–50), but events (REPO MAN, HOLLOW
  CHOIR, couriers, outbreaks, spotters), off-floor lairs and SPRAWL-00 up to 5 spawn at your level.
- **Fights are short and hits are big**: about 10 cycles at your level, a single hit up to a quarter of your bar, so
  reading the big hits decides the fight and damage barely does.

## 2. The WoW model, mapped

| WoW | BLACKBOX |
|---|---|
| A zone or expansion's level range | A floor's band |
| Grey mobs: a few levels down, trivial (stats steep by level; gap rules mostly for mobs above) | A compounding level curve |
| Quest rewards keep you a little ahead while leveling | A floor's drops at its band's top |
| A new expansion's first greens beat last tier's epics | Each floor's gear a step above the last |
| Dungeon → heroic → raid, each gated by gear from the one before | A floor's servers → its elites → its lair boss and exit |
| Enrage timers and repeating mechanics | Boss mechanics that grow each round, and a tight enrage |

**The sawtooth, per floor:** you arrive at the band's bottom wearing the last floor's best: strong. The floor's servers
climb toward its top while its mobs carry the floor's step: it gets harder. Its elites, lair boss and exit are tuned for
the floor's own blues: you need its gear. New gear on the next floor jumps you ahead again.

## 3. Proposed

Starting numbers, to tune on the arena bench:

1. **A compounding level curve (route 1, WoW's).** `power(level)` grows 6–8% a level, compounding, for you and for
   mobs alike, in place of 4% linear: about 17× (6%) to 43× (8%) by 50, against 3× now. A fight at your level is
   unchanged; a mob ten levels down has about half the Integrity and half the hits (6%), so it falls fast and costs
   little. WoW-sized numbers. The gap rules stay as they are (mostly about mobs above you, as WoW's are).
2. **Longer fights, smaller hits**, at your level in level-appropriate blues: ordinary 12–16 cycles, elites 20–25, solo
   bosses 28–35 with the enrage about 15% past a geared kill. A plain hit at most ~12% of your max; a telegraphed boss
   move at most ~25%. Integrity up and hits down together, so a fight's cost holds.
3. **Floors as tiers.** A mob takes its floor's step on top of its level (about +15% a floor); a floor's gear takes the
   same step and more, so the next floor's first drops outclass the last floor's best. The friction target moves from
   "every level" to the floor's arc: easy at the band's bottom in last floor's gear, 35–45% at its top in its own blues.
4. **Content at its place's level.** Events and lairs spawn at their server's or floor's level; your level only picks
   the floor they appear on.
5. **Boss damage checks**: each round of a boss's mechanic hits harder than the last (the next Broadcast, Liens with
   interest, another voice), so a slow kill faces a round it can't survive however well it reads; the enrage behind it.

The cost: an 8-second cycle makes a 14-cycle fight about two minutes and a 30-cycle boss four (the speed setting can
shorten cycles). The smooth gear curve and the flat friction target give way.

## 4. Build order

One session each, one after the other (they share the economy, pacing and combat numbers), each played before the next:

1. The curve: `power` compounding (most growth already goes through it: `mobPower`, `powerOf`, `scaled`), and every
   number that doesn't keeps its flat form with its value rescaled (never turned into a share): gear stats (anchored at level 50 by `itemPower`, so the low levels
   shrink), flat affixes and uniques (*+6 damage*), heals, shields, Signal, prices and anything shown as a fixed number.
   Events and lairs at their place's level.
2. Fight length: Integrity up, hits down, enrages, the balance targets moved.
3. Floors as tiers: the mob step and the gear step.
4. Boss rounds that grow (the solo bosses first, then the lairs as they're built).

## 5. Decided

The designer, November 3, 2026:

1. **Fight length:** *"slightly longer"* than 12–16, 20–25 and 28–35 cycles; tuned on the arena bench.
2. **The compass:** WoW: *"they do an excellent job at making the player feel powerful when they level, but then it
   slowly gets harder and harder which necessitates gear, then does this over and over again."*
3. **Route 1:** a compounding level curve, WoW's mechanism, over gap modifiers.
4. **Items keep flat values:** *"Don't convert items into %s. Just adjust their flat values."*
