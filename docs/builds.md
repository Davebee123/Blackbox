# Builds: skill affixes and combos

**Status.** Design, nothing built. The designer's picks (November 2026): a large build layer for players to experiment
in; some builds clearly stronger than others, as long as they still have to play the fight. No skill ranks: gear
carries skill efficiency, the talent tree the rest.

## 1. The rule for a build

- **A combo changes how you solve a fight, never whether you need to.** A burn build and a break build beat a seal
  board differently; both still read the tells. A combo that skips a boss's tells is a bug in the combo.
- **Lopsided, not modest.** A combo piece may be two to three times as good in its situation (the specialist rule,
  docs/kits.md 1.1) and plain outside it. This replaces loot-plan.md's *modest on their own* for combo pieces.
- **The biggest combos come past the level cap** (GAME_RULES.md *Items*: power spikes are earned).

## 2. Skill affixes on gear

Eight skill rules roll today (gear.mjs `RULES` with a `skill`, skillrules.mjs), each changing how one skill plays.
Add efficiency lines beside them, Grim Dawn's way: *Flood costs 1 less*, *Tag cools a cycle faster*, *Inject lasts a
cycle longer*. They roll only for your class, as skill rules do.

## 3. Shared events

A combo is two pieces from different systems firing on the same event. Effects already trigger on `FX_WHEN`
(content.mjs): hit, crit, break, start, struck, answer, cycle, helper, expire. Add:

- **burn tick**: one of your burns ticks;
- **shielded**: you gain a shield, or your shield absorbs a hit;
- **Tagged**: you Tag a part;
- **cut**: you cut a part's move.

Talents, uniques, sets, implants, daemons and skill rules all read the same list, and every class gets a few pieces
that trigger on another class's events, so off-class builds exist.

## 4. Stacking

Today the same rule on two items counts once (GAME_RULES.md *Items*). Instead, a second copy counts half and a third a
quarter. An effect's *limits* (once per cycle, per fight) holds the loops.

## 5. Example builds, for the prototype

| Build | Pieces | What it does |
|---|---|---|
| Fever (Infiltrator) | Slow Drip, Long Poll, a crit-resets-cooldown rule | Burns make crits, crits re-arm Inject. |
| Chain reaction (Breaker) | Shrapnel, a break-hit rule, Structural Failure | Each break heals, hits the part winding up, strips the rest. |
| Mirror (Bastion) | Reflective ACL, *shielded* pieces | Shields turn incoming hits into damage. |
| Plague herd (Operator, off-class) | Helpers that burn, Infiltrator burn-tick pieces | Helpers spread burns the burn pieces feed on. |

## Talent tiers (draft)

The candidate for decision 7.1, drafted for Payload (prototype screenshots, November 2026). Six pick-one-of-three
tiers replace the three pick-one-of-two tiers and the three ranked rows; the capstone row stays as it is (45, rank 2
at 50). Tiers open by level, not by points spent. Respec stays free at home. In each tier the first talent is the plain
pick and the third fires on a shared event (section 3); the middle one changes how a skill plays. The ranked rows'
ideas become plain picks (Heap Spray, Shaped Charge, Low Profile, Virulence) or go (Persistent Tag, Backchannel).

| Tier | Level | Plain | Shape | Combo (event) |
|---|---:|---|---|---|
| 1 | 10 | Heap Spray: increases the damage of your Inject by 6 every tick. | Long Fuse: your Inject lasts 6 cycles instead of 4. | Third-Party Cookie (Tagged): when you Tag a part, every burn on it ticks once. |
| 2 | 16 | Shaped Charge: increases the damage of Detonate by 25%. | Assassinate: Detonate deals double damage to a Tagged part. | Chain Letter (break): when a part you are burning breaks, Detonate becomes usable again. |
| 3 | 22 | Low Profile: reduces the damage attacks deal to you by 8%. | Spillover: Skim heals past your max Signal shield you instead, up to 20. | Tripwire (struck): when an attack hits you, your burns on its part tick once. Works once per cycle. |
| 4 | 28 | Virulence: Wormable, Skim and Polymorph deal 5 more damage every tick. | Contagion: each Inject also starts a copy on the part whose attack lands soonest, or refreshes the one there. | Fever (burn tick): every third tick of your Inject is a critical strike. |
| 5 | 34 | Persistence: Rootkit Implant can be used twice a fight. | Superspreader: Bloom copies the burns to every other part, not just the next one. | Heat Sink (shielded, off-class): when you gain a shield, every burn on the target ticks once. Works once per cycle. |
| 6 | 40 | Hot Loop: increases the damage of your burns by 10%. | Index Case: Outbreak also Tags every part for 4 cycles. | Interrupt Vector (answer): when you answer a tell, IRQ Storm becomes usable again. IRQ Storm's own answers do not count. |

Cross-tier combos: Spillover makes the shields Heat Sink fires on, Index Case makes the Tags Third-Party Cookie and
Assassinate want, and Fever's critical strikes feed crit rules on gear (the Fever build, section 5). 3⁶ × 2 = 1,458
builds a subclass, against 16 today.

## 6. Order

1. Prototype: a standalone page with the four builds, their pieces and how they connect, as screenshots.
2. The shared events and the stacking rule.
3. Skill affixes on gear.
4. Content: combo pieces for every class, the off-class ones first.

## 7. Open decisions

1. **More talent choices:** today the ranked rows fill up almost whole (18 points, 18 rank slots and three picks),
   so a subclass has 16 builds. Turning ranked rows into pick-one-of-three tiers is the candidate (*Talent tiers
   (draft)* above).
