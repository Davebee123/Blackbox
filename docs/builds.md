# Builds: skill ranks, skill affixes and combos

**Status.** Design, nothing built. The designer's picks (November 2026): a large build layer for players to experiment
in; some builds clearly stronger than others, as long as they still have to play the fight. Ranks are plain efficiency
(Diablo 2), not special effects at breakpoints; gear carries most of the efficiency.

## 1. The rule for a build

- **A combo changes how you solve a fight, never whether you need to.** A burn build and a break build beat a seal
  board differently; both still read the tells. A combo that skips a boss's tells is a bug in the combo.
- **Lopsided, not modest.** A combo piece may be two to three times as good in its situation (the specialist rule,
  docs/kits.md 1.1) and plain outside it. This replaces loot-plan.md's *modest on their own* for combo pieces.
- **The biggest combos come past the level cap** (GAME_RULES.md *Items*: power spikes are earned).

## 2. Skill ranks

| | |
|---|---|
| What a rank does | One or two of the skill's numbers grow: cost, cooldown, duration, ticks, shield or helper size. Damage only a little. |
| Curve | Each rank gives less than the last (about +10, +8, +6, +5, +4%), to a hard cap well under what points allow, so spreading stays a choice. |
| Respec | Free at home, like talents. |
| Board mark | Pips under the skill's icon. The tooltip gives this rank's number, then the next rank's, muted. |

## 3. Skill affixes on gear

Eight skill rules roll today (gear.mjs `RULES` with a `skill`, skillrules.mjs), each changing how one skill plays.
Add efficiency lines beside them, Grim Dawn's way: *+1 rank to Flood*, *Tag cools a cycle faster*, *Inject lasts a
cycle longer*. They roll only for your class, as skill rules do.

## 4. Shared events

A combo is two pieces from different systems firing on the same event. Effects already trigger on `FX_WHEN`
(content.mjs): hit, crit, break, start, struck, answer, cycle, helper, expire. Add:

- **burn tick**: one of your burns ticks;
- **shielded**: you gain a shield, or your shield absorbs a hit;
- **Tagged**: you Tag a part;
- **cut**: you cut a part's move.

Talents, uniques, sets, implants, daemons and skill rules all read the same list, and every class gets a few pieces
that trigger on another class's events, so off-class builds exist.

## 5. Stacking

Today the same rule on two items counts once (GAME_RULES.md *Items*). Instead, a second copy counts half and a third a
quarter. An effect's *limits* (once per cycle, per fight) holds the loops.

## 6. Example builds, for the prototype

| Build | Pieces | What it does |
|---|---|---|
| Fever (Infiltrator) | Slow Drip, Long Poll, a crit-resets-cooldown rule | Burns make crits, crits re-arm Inject. |
| Chain reaction (Breaker) | Shrapnel, a break-hit rule, Structural Failure | Each break heals, hits the part winding up, strips the rest. |
| Mirror (Bastion) | Reflective ACL, *shielded* pieces | Shields turn incoming hits into damage. |
| Plague herd (Operator, off-class) | Helpers that burn, Infiltrator burn-tick pieces | Helpers spread burns the burn pieces feed on. |

## 7. Order

1. Prototype: a standalone page with the four builds, their pieces and how they connect, as screenshots.
2. The shared events and the stacking rule.
3. Skill affixes on gear, then ranks.
4. Content: combo pieces for every class, the off-class ones first.

## 8. Open decisions

1. **Where ranks come from:** level points, gear only, or both.
2. **Ranks and the ranked talent rows** (+X% to a skill per rank) overlap: ranks replace them, or the rows move to
   stats that aren't a skill's.
