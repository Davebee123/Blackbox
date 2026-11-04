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

### After step 1 (November 3): the curve

Power compounds 6% a level (`CONFIG.powerPerLevel`); flat numbers are lifted (`lift` = power ÷ the 4% line), so a fight
at your level plays as before. Events, lairs and SPRAWL-00's rooms take their place's level. Same harness; cycles ·
Signal lost (8% beside it, from `?bench=<name>&curve=8`):

| Level | Ordinary | Elite |
|---|---|---|
| 10 | 9 · 27% (8%: 9 · 29%) | 13 · 47% (13 · 50%) |
| 18 | 11 · 20% (11 · 20%) | 15 · 16% (15 · 17%) |
| 30 | 9 · 29% (9 · 28%) | 12 · 22% (12 · 19%) |
| 45 | 8 · 20% (8 · 20%) | 9 · 16% (9 · 16%) |

| You | Mob at your level | 3 below | 6 below | 10 below |
|---|---|---|---|---|
| 10 | 9 · 27% | 8 · 22% (8%: 21%) | 6 · 4% (3%) | — |
| 20 | 10 · 24% | 10 · 8% (8%) | 8 · 5% (4%) | 6 · 5% (4%) |
| 30 | 9 · 29% | 9 · 17% (15%) | 8 · 9% (7%) | 7 · 3% (2%) |
| 45 | 8 · 20% | 9 · 20% (16%) | 9 · 9% (7%) | 7 · 5% (4%) |

Gear (you and the mob at 20, Signal lost): gear level 10: 49 / 47 / 33% (stock / tuned / custom); 20: 32 / 24 / 20%;
25: 25 / 15 / 10%. Stuck in level-10 gear at 30: 67% lost, 75% won (8%: 72%, 63%). Old gear hurts a little more.

**Outleveling is cheap now, not short.** Ten levels over, a fight costs 3–5% (was 6–8%), but still takes 6–7 cycles:
fights are bound by ◆, not Integrity. A hit breaks one ◆ (two when heavy) however big it is, so a part needs its ◆
broken and then one hit, at any level gap; even at 20% a level, twenty levels down takes 5–7 cycles. Measured (not
built): if a virus below you wore ◆ × (1 − gap ÷ 10), none at ten under, ten levels over would take 3–4 cycles and 0%,
six over 6–7 cycles. A lean rule for the designer to pick, or step 2's longer fights may change the balance of ◆ and
Integrity enough on their own.

### After step 2 (November 3): gear carries your power

WoW's model. Your own numbers (skill damage, burns, base Signal, shields, talents' Signal) grow with `power` to level 6,
then stop (`CONFIG.ownFrom`, `ownPerLevel` 0); mobs still compound 6%. Your gear's Damage, Crit Damage, Payload,
Signal, Regen and Leech are × a fill at their item level (`CONFIG.gearFill`: 1 to 6, 1.46 at 10, 1.77 at 25, 1.52 at
50), fitted so a level's blues give the Signal and Damage step 1 did. Damage and Payload work like spell power: each hit
gets them × its size over a reference, so a nuke stays a nuke: Damage on a skill hit over Spike's (`damageRef` 25), on a
burn tick or helper hit over 50 (`tickRef`), and Payload on top over 28 (`dotRef`). Heals keep step
1's growth: no gear stat feeds a heal but Restore. In its level's blues, gear is 74% of your Signal at 20 and 88% at 30
(was 42% and 52%).

Same harness, wild fights at your level; won · cycles · Signal lost (step 1 in brackets):

| You | Its level's blues | Ten levels old | None | Level-10 blues |
|---|---|---|---|---|
| 10 | 98% · 10 · 30% (98% · 33%) | 88% · 54% (98% · 38%) | 69% · 68% (94% · 48%) | — |
| 20 | 100% · 11 · 27% (100% · 30%) | 63% · 71% (85% · 45%) | 13% · 95% (73% · 65%) | (ten old) |
| 30 | 96% · 10 · 34% (96% · 32%) | 63% · 73% (85% · 50%) | 0% (60% · 75%) | 8% · 94% (63% · 73%) |

At your level in its blues (cycles · Signal lost): 3: 8 · 29%; 10: 10 · 30% (elite 14 · 38%); 18: 11 · 21% (16 ·
23%); 30: 10 · 34% (12 · 31%); 45: 9 · 28% (11 · 31%). Subclasses alone and their core rotations sit within a few
points of main; crew bosses at 18 win 72 of 74 tries (72 of 73); the campaign bot reaches level 10 in 11–15 breaches.

**Ticks and helpers (November 4).** With Damage on skill hits only, a burn or helper class's hits gained ×6 from its blues
at 30 and its ticks ×2.9 (×2.4 against ×2.0 at 18), and in a crew the solo-leaning Demolitionist and Overclocker won
100% of the farm's boss tries, the Herder 91% and the Hijacker 83%. Now Damage reaches ticks too (`gearTick`), and
Payload's reference went from 14 to 28 so a burn or helper class alone plays as before: ticks gain ×1.4 · ×2.2 · ×4.5
at 10 · 18 · 30, against hits' ×1.5 · ×2.4 · ×6.0. Alone, Signal lost at 10 · 18 · 30 (main in brackets): Payload 19 ·
18 · 23% (19 · 19 · 24), Herder 13 · 20 · 20% (15 · 22 · 28), Hijacker 21 · 29 · 36% (23 · 29 · 38), Sysop 24 · 2 · 7%
(25 · 3 · 11). As a crew's third member (Lv 18 · 30): Payload 100 · 100%, Herder 97 · 100% (81 · 100), Hijacker
90 · 100% (65 · 100); the Demolitionist 100 · 100, the Overclocker 97 · 100; the full crew at 18 100% (97%).

Back where they were before step 2: key 1 for the Payload and Herder, the Warden's Throttle, the Payload out-carrying
the solo ones in a crew. Still held (each test says what it measures): the Herder carries a crew within 2 points of the
solo ones (99% to the Demolitionist's 100%) and the Hijacker 95% (floor raised from 65% to 90%); the Herder alone at 10
loses 13% (band floor 15: one fight of 24); the Hijacker's key 1 21% at 18 and its core 21 under its full build at 30;
the Overclocker 20 of 24 alone at 30; the Sysop 1.95× the pace at 18; the Herder's OOM Kill; Umbrella Policy 5.5. New
since the tick rule: the Sysop's healers preset 10.7 worse on its own fights, the Herder's swarm preset 0.2 and the
Payload's 5.8 on the generic fights. They wait on a kit pass after the designer has played it.

**Why the coefficients:** with a flat Damage stat and your level no longer growing hits, every hit is a small base plus
the same gear Damage, so a nuke and a jab converge (at 30, a 40 hit 282 and a 10 hit 241) and big-hit kits sink (core
rotations at 30: Demolitionist 51%, main 26%). With burns on your level instead, the Sysop lost 20% alone at 30 and a
crew won 72 of 93 boss tries.

**Why level 6:** with your own line flat from level 1, gear a few levels old at 5–10 cost a lot (level 5 in starter
whites: 81% won). From 6, SPRAWL-00 and the first levels play as they did. The cost: at 10, no gear still wins 69%.

**Ten levels old still wins about 60%.** A level's blues must keep up with its mobs, which grow 1.8× in ten levels, so
gear ten levels old is about 45% of you however little your level gives. WoW is the same while levelling; its wall is
the tier. Ours is step 4: each floor a gear step, its elites, lair and exit tuned to its own blues.

### After step 3 (November 4): fight length

On your Signal a virus's Integrity is × `CONFIG.length.hp` at its level (2.2 at 1, 2.5 at 10, 2.3 at 18, 3.5 at 30, 5.5
at 45) and its hits × `length.dmg` (0.42, 0.4, 0.5, 0.42, 0.33): steeper late, where your damage had outgrown a mob's
Integrity and fights were bound by ◆. Elites ×1.65 Integrity, ×0.62 hits (from 1.5 and 0.7). Each solo boss has its own
(`BOSSES` long: Integrity, hits, and an enrage about 15% past its geared kill, cycles 31 to 40), fitted to its Signal
cost on main. The spike cap: 25% of your max from a solo boss (was 60%), 20% from a wild charge (45%); the Backlash
15–25% (30–60%). Room elites enrage at 17 (9). Adds (fragments, Packages, Droppers) keep their size, breaches keep
their pace, crew bosses are untouched. The planner breaks a Trojan's Loader first (a sturdier Courier outlasts the chase).

Same harness, at your level in its blues; cycles · Signal lost · the 90th-percentile single hit (main in brackets):

| Level | Ordinary | Elite | Solo boss (won) |
|---|---|---|---|
| 3 | 15 · 30% · 18% (8 · 29% · 21%) | 26 · 48% (13 · 48%) | 33 · 65%, 79% (14 · 65%, 71%) |
| 10 | 15 · 23% · 19% (9 · 27% · 25%) | 27 · 34% (13 · 30%) | 35 · 49%, 75% (14 · 61%, 71%) |
| 18 | 17 · 23% · 11% (11 · 19% · 15%) | 23 · 13% (15 · 15%) | 34 · 45%, 71% (14 · 52%, 79%) |
| 30 | 16 · 28% · 13% (10 · 31% · 22%) | 26 · 24% (11 · 25%) | 36 · 33%, 83% (12 · 40%, 88%) |
| 45 | 16 · 21% · 13% (8 · 24% · 20%) | 26 · 18% (9 · 19%) | 36 · 27%, 79% (11 · 31%, 96%) |

Plain hits now stay under about 12% (main reached 30–41%); what goes past is a charge or a Mimic's playback, capped.

| You | At your level | 3 below | 6 below | 10 below |
|---|---|---|---|---|
| 10 | 14 · 19% | 12 · 13% | 8 · 2% | — |
| 20 | 15 · 23% | 14 · 7% | 11 · 2% | 9 · 3% |
| 30 | 16 · 25% | 12 · 13% | 10 · 5% | 9 · 0% |
| 45 | 16 · 20% | 15 · 13% | 12 · 3% | 9 · 3% |

Gear (won · Signal lost): its level's blues 100% · 19–25% at 10, 20, 30; ten levels old at 20 63% · 68% (88% · 62%), at
30 38% · 73% (63% · 66%); none at 10 67% · 66% (71% · 62%), at 20 8%, at 30 0%. The full crew wins 36 of 36 boss tries at
18 and 30. The rooms bot maps 6 of 12 medium servers at 10 (12 on main: the Warden's room fights run 25–45 cycles).

**Sustain potency (the designer, November 4: healing too strong; potency and cooldowns, since there is no mana).** A longer
fight lands less a cycle, so heals and shields went further: alone, the Warden lost 8% at 10, 18 and 30 and the Sysop
0–8%, and both won five levels up. Now every heal you take and your skills' flat shields are × `length.heal` (0.6 of the
hits' factor) and a heal drawn from your damage × `length.drawn` ÷ `length.hp` (Reclaim's lifesteal off a mob's whole
Integrity had healed back all of it). Alone at 10 · 18 · 30: the Sysop 33 · 8 · 21% (24 · 2 · 7% before step 3), the
Warden 24 · 12 · 12% (27 · 13 · 25%). Five levels up the Sysop wins 1–3 of 8; the Warden still 5–7 (its cuts and blocks
scale with the hits). Damage dealers: +2 wins about 85% for 50–65% lost, +3 about half, +5 one in eight.

**No damage caps (the designer, November 4: as in WoW).** The spike cap, the tell ceiling, the tiers' caps and the
Backlash's floor and ceiling are gone: a charge is its hit × `mult`, a Backlash its hit × 2. A solo boss's charge is its
hit × 2 (`TELL.boss.mult`, was 2.5–3 × 1.1), so its plain hits carry the pressure. The designer found the bosses too easy:
each solo boss's `long.dmg` is set where the four default subclasses win about 70% at 10, 18 and 30 in blues (FLOODWALL
and REPO MAN already did; MIRRORSHADE keeps 0.8, where its band at 12 reads 67%: more drops its misreader under 45%). Most bosses' hits rose 1.1 to 5.5×; HASHLORD's (fitted under the cap, every Surge
at 25%) fell 3 → 1.55. Plain hits now reach 7–13% (p90), HASHLORD's Surge 19–26%; charges land 15–30%, HASHLORD's
Difficulty Bomb about 45% and RELAY-KING's about 40% at 10. Signal lost 50–90% a boss. A wild charge, no longer stopped
at 20%, is ×2.5 to ×3 its hit: the Sysop alone loses 25% at 30 (20%), its core rotation 63% (49%), and the Breaker's
climb to 10 takes 17 breaches (16); each held in its test.

Held (each test says what it measures): the Demolitionist's core rotation 27 points under its full build at 18; five
second presets (the Payload's swarm +14.7 on the generic fights, the Hijacker's rules −14.6 on its own, the Phantom's
evasion −7.8, the Herder's swarm +5.6, the Warden's swarm +5.2); the Warden's DMZ pressed in 3 of 24 at 30; ignoring the
Mimic 32 points; the Herder carrying a crew 97% to the Demolitionist's 100%; the Warden's Circuit Breaker pressed in none of its moments at 30; the Demolitionist's floor at 18 held at 13 (10% with the Kestrel pair); the Infiltrator's climb on seed 7, which from level 19 farms one held server's respawns and meets 2% strains and ICE (15% asked).

## 2. The WoW model, mapped

| WoW | BLACKBOX |
|---|---|
| A zone or expansion's level range | A floor's band |
| Grey mobs: a few levels down, trivial (stats steep by level; gap rules mostly for mobs above) | A compounding level curve |
| Quest rewards keep you a little ahead while leveling | A floor's drops at its band's top |
| A new expansion's first greens beat last tier's epics | Each floor's gear a step above the last |
| Dungeon → heroic → raid, each gated by gear from the one before | A floor's servers → its elites → its lair boss and exit |
| Enrage timers and repeating mechanics | Boss mechanics that grow each round, and a tight enrage |
| Item level: one number sets an item's stat budget | Item level × the fill (`gearFill`) |
| Health is mostly Stamina from gear | Signal is mostly gear (step 2: 88% at 30) |
| An ability is a base plus a coefficient × spell or attack power from gear; a big spell gets more of it | Gear Damage × the skill's size over Spike's (`damageRef`) |
| A DoT tick or a pet's hit gets its own, smaller coefficient of the same spell power | Gear Damage × the tick's size over 50 (`tickRef`), Payload × it over 28 (`dotRef`) |
| Heals scale with spell power from gear | Not yet: heals keep step 1's growth with your level |

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

1. **Built (November 3).** The curve: `power` compounding (most growth already goes through it: `mobPower`, `powerOf`, `scaled`), and every
   number that doesn't keeps its flat form with its value rescaled (never turned into a share): gear stats (anchored at level 50 by `itemPower`, so the low levels
   shrink), flat affixes and uniques (*+6 damage*), heals, shields, Signal, prices and anything shown as a fixed number.
   Events and lairs at their place's level.
2. **Built (November 3): gear carries your power** (decided November 3, section 5.5; section 1 has the numbers). Your own numbers (skill damage, base Signal,
   heals, shields) grow on a slow line instead of `power`; mobs keep compounding 6%; item stats grow to fill the gap, so
   in level-appropriate blues most of your Signal and damage is gear. Targets at your level, on the harness:

   | Gear | Level 10 | Level 30 |
   |---|---|---|
   | Its level's blues | 35–45% lost (as now) | 35–45% lost (as now) |
   | Ten levels old | often lost | lost nearly every fight |
   | None | lost | lost |

   Now, at 30: level-30 blues win 100% (29% lost), level-20 blues 92%, level-10 whites or level-1 gear 63% (73% lost):
   your level alone carries you (540 of 1028 Signal is level, the rest gear). The cost: the friction table's "nothing"
   row (60–75%, a win) goes; the low levels (starter gear at 3) must still win; elites, bosses and the class sims are
   re-measured against the new split.
3. **Built (November 4): fight length** (section 1 has the numbers): Integrity up, hits down, enrages, the balance targets moved.
4. **Next:** floors as tiers: the mob step and the gear step.
5. Boss rounds that grow (the solo bosses first, then the lairs as they're built).

## 5. Decided

The designer, November 3, 2026:

1. **Fight length:** *"slightly longer"* than 12–16, 20–25 and 28–35 cycles; tuned on the arena bench.
2. **The compass:** WoW: *"they do an excellent job at making the player feel powerful when they level, but then it
   slowly gets harder and harder which necessitates gear, then does this over and over again."*
3. **Route 1:** a compounding level curve, WoW's mechanism, over gap modifiers.
4. **Items keep flat values:** *"Don't convert items into %s. Just adjust their flat values."*
5. **Gear over level:** *"There is no way a level 30 should be winning any fights at level 30 with level 10 gear."*
   *"Level should not contribute to your power as much at all."*
6. **WoW's coefficients:** gear Damage and Payload scale with each hit's size, like spell power: *"focus the design close
   to [WoW]"*, *"keep the coefficients and land step 2"*.
