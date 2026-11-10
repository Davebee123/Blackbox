# Floor items: sets and uniques, floors 2–8

**Status.** Designed November 2026, not built. Brings every floor to five sets and 20 uniques (docs/content.md 7.3),
under docs/loot-plan.md's principles. Prototyped as applets (tooltips, a boss's loot page).

**Picked:** the boss loot page is *Grouped* (C): every kill, its uniques, its set piece, each with the next kill's odds
as a bar. *Built* (codex-view.mjs lootTable). Item tooltips stay as built. The drop cap stays at under one unique or set piece an hour, set pieces
included, so a player finishes about one set a floor: the one for the activity they favour.

Marks: **✓** built · **◇** designed in the docs, kept · **✎** designed, rewritten here · **✚** new · **→** built, re-homed.
Set lines read *piece (slot, level): own bonus [green line]*. Counts are by floor band, so a level-14 item counts on
floors 2 and 3, as the earlier count did.

## Floor 2 · Backhaul (7–14) · 7 sets ✓ · 38 uniques ✓ (+14 designed)

Past the bar, so nothing new.

- **Sets ✓:** Hive Mind (floor 2 lair), Kestrel Clearance, Night Shift, Choirbook, Patchwork, Lantern Route, Glass Ceiling (from 14).
- **◇ Tollbooth** (docs/genome.md 9.2), designed, not built: rename *Crowbar* (Wrecking Crew's) and *Ledger* (Glass
  Ceiling's) before it's built.
- **Glass Ceiling's Rotor** (exploit 14) → CENTRIFUGE, which has a Rotor part. Its other pieces stay with GLASSJAW's bosses. *Built.*
- **Boss uniques ✓:** CENTRIFUGE: Governor, Cascade Failure. SHAKEDOWN: Paper Trail, Escrow (*shakedown-escrow*: the Kestrel zero-day has the name too). Both pairs still fit the
  reworked fights (Bidding rewards a delay, and the Ransom Clock is a countdown).
- **Native pairs ◇:** DEADBOLT, BACK ORIFICE, PATCH TUESDAY, MIRRORSHADE, and SLEEPWALKER, whose *Night Light* is renamed
  **Lucid**.

## Floor 3 · The Stacks (13–20) · sets ✓ · 14 → 24 uniques

| Unique | Slot · Lv | Source | Effect | |
|---|---|---|---|---|
| Privacy Screen | shell 18 | SHOULDER SURFER | The first part each fight that plays back or copies your command misses with it. | ✓ |
| Muscle Memory | script 18 | SHOULDER SURFER | A command fired exactly 2 cycles after your last deals 10% more. | ✓ |
| Tail Call | exploit 19 | RECURSION | When you break a part, your burns on the other parts tick once right away. | ✓ |
| Stack Guard | proxy 19 | RECURSION | The next attack on you within 2 cycles of a part breaking deals 20% less. | ✓ |
| HASHLORD, FLOODWALL, ECHOLALIA pairs | 16–18 | their lairs | docs/genome.md 7.4 | ◇ |

**Set source →** On-Call's **Pager** (proxy 18) moves from the floor 3 lair boss to SHOULDER SURFER. *Built* (floor 4's lair boss still drops it).

## Floor 4 · Coldline (19–26) · sets ✓ · 17 → 25 uniques

| Unique | Slot · Lv | Source | Effect | |
|---|---|---|---|---|
| Overdraft | proxy 24 | NIGHT DESK | Leaves you at 25% when a hit would take you lower, and the rest lands over the next 3 cycles. Works once per fight. | ✚ |
| Pre-Authorization | script 24 | NIGHT DESK | Increases the damage of your next hit by 10% when you raise a shield. | ✚ |
| Sapper Kit | exploit 20 | TRIPMINE | When you break a part that sets something off as it breaks, it goes off on the virus's next part instead of on you. | ✎ (it named Tripwire, Zip Bomb and Twin) |
| CAMSWARM, BYZANTINE pairs, TRIPMINE's Quiet Hours | 20–26 | their fights | docs/genome.md 7.4 | ◇ |

**Set sources →** On-Call's **Runbook** (22) → NIGHT DESK, and **Failover** (26) → BYZANTINE. The *on-call desk*
and *failover against a faulty node* are the bosses' own stories.

## Floor 5 · Deep Core (25–32) · 2 → 5 sets · 12 → 20 uniques

**Sets** (Burst Buffer ✓, Hot Spare ✓)

| Set | Source | Pieces | 2 | 3 | 4 |
|---|---|---|---|---|---|
| **Fine Print** ✚ | Underwriting desk: its vaults and Core | Rider (proxy 26): +2 Block [+6% max Signal] · Deductible (shell 27): the first hit on you each fight deals 20% less [+2 Block] · Exclusion (script 30): +5% crit [+5% damage] · Premium (implant 32): +6% max Signal [+5% Clock Speed] | +8% max Signal | A tell that lands on you shields you for 5% of your max Signal | While a shield holds, your hits deal 10% more |
| **Contiguous** ✚ | Defrag boards won | Sector (exploit 27): +4% damage [+5% crit] · Cluster (implant 29): +4% Clock Speed [+6% max Signal] · Allocation Table (script 31): +5% crit [+5% damage] | +5% Clock Speed | Each command in a row on the same part deals 6% more than the last, up to 18% | |
| **Packer** ✚ | Polymorph kills (its lineage) | Stub (exploit 26): +5% crit [+5% damage] · Junk Code (script 28): +6% damage to a part wearing ◆ [+5% crit] · Decryptor (shell 31): +2 Block [+6% max Signal] | +5% crit | When you break a part's last ◆, your next hit on another part is a critical strike | |

**Uniques**

| Unique | Slot · Lv | Source | Effect | |
|---|---|---|---|---|
| Installment | implant 28 | GRACE PERIOD | Your first hit on each part every 3 cycles deals 10% more. | ✚ |
| Late Fee | exploit 28 | GRACE PERIOD | Increases your damage by 15% on a part whose ◆ came back this fight. | ✚ |
| Antibody, Tourniquet | 32 | PARASITE | docs/genome.md 7.4 | ◇ |
| Hidden Service | implant 30 | EXIT NODE | Every 6 cycles, the next attack on you deals half. | ✎ (it named Front End layers) |
| Tail Circuit | exploit 30 | EXIT NODE | Increases your damage by 10% on a part with more Integrity than it had 2 cycles ago. | ✚ replaces Guard Relay (Onion Routing is gone from the fight) |
| Moral Hazard, Reinsurance | 40 | ACTUARY | docs/genome.md 7.4 (UNDERWRITER's two) | ◇ |

ACTUARY's pair is level 40, so it counts on floor 5 only by where it drops. Without it, floor 5 has 18.

## Floor 6 · Kernel Space (31–38) · 1 → 5 sets · 9 → 20 uniques

**Sets** (Mesh ✓, crew only)

| Set | Source | Pieces | 2 | 3 | 4 |
|---|---|---|---|---|---|
| **Domain Admin** ✚ | Domain Controller vaults | Ticket (implant 32): +6% max Signal [+5% damage] · Group Policy (proxy 33): +2 Block [+5% Clock Speed] · Schema (shell 35): +5% Restore [+2 Block] · Admin Rights (exploit 37): +5% damage [+5% crit] | +5% damage, +5% max Signal | When you strip a part's last ◆, your shortest cooldown drops by 1 | From the third part you break in a fight, your cooldowns are 1 cycle shorter |
| **Semaphore** ✚ | Deep Deadlock boards | Spinlock (script 33): +4% Clock Speed [+5% damage] · Semaphore (implant 35): +6% max Signal [+5% Clock Speed] · Critical Section (shell 37): +2 Block [+6% max Signal] | +5% Clock Speed | An attack you delay leaves its part Open for 1 cycle | |
| **Hidden Process** ✚ | Rootkit kills | Unlink (exploit 32): +5% crit [+5% damage] · Hollow (script 34): your burns deal 5% more [+5% crit] · Driver (implant 36): +5% Stealth [+6% max Signal] | +6% damage | Your burns keep ticking on a part that can't be hit | |
| **Watertight** ✚ | Kestrel ICE on floor 6 | Hatch (proxy 34): +2 Block [+6% max Signal] · Seal Plate (shell 36): +6% max Signal [+2 Block] · Pressure Door (implant 38): +2 Block [+5% damage] | +3 Block | When a hit takes more than 15% of your max, the next hit on you within 2 cycles deals 20% less | |

**Uniques**

| Unique | Slot · Lv | Source | Effect | |
|---|---|---|---|---|
| Syscall Table | script 34 | RING ZERO | docs/genome.md 7.4 | ◇ |
| Ring Minus One | implant 34 | RING ZERO | A skill fired after waiting ready for 2 cycles deals 15% more. | ✎ (the old text shut hooks off, and fights no longer shut skills off) |
| Load Path | exploit 36 | BRICKWALL | A hit that breaks a ◆ still deals 15% of its damage to the part. | ✚ replaces Firmware Flash (Hard Brick is gone) |
| Recovery Mode | script 36 | BRICKWALL | docs/genome.md 7.4 | ◇ |
| Notice Period | script 36 | BULKHEAD | When a part starts a tell, your shortest cooldown drops by 1. | ✚ |
| Pressure Relief | shell 36 | BULKHEAD | An attack you delayed deals 20% less when it lands. | ✚ |
| Generator, UPS | 34 | BLACKOUT | docs/genome.md 7.4 | ◇ |
| DKOM | script 33 | Rootkit kills | Your first hit on a part that just became hittable deals 25% more. | ✚ |
| Golden Ticket | implant 36 | Domain Controller, the Core's vault | +6% max Signal. Your first shield each fight is doubled. | ✚ |
| Pass the Hash | exploit 35 | Domain Controller vaults | A critical strike makes your next hit on a different part a critical strike too. Works once every 3 cycles. | ✚ |

## Floor 7 · The Sink (37–44) · 1 → 5 sets · 33 → 35 uniques, the lair's eight re-homed

**Sets** (Deep Archive ✓)

| Set | Source | Pieces | 2 | 3 | 4 |
|---|---|---|---|---|---|
| **Catchment** ✚ | Sinkhole Residents | Gully (exploit 37): +5% damage [+5% crit] · Culvert (proxy 39): +2 Block [+6% max Signal] · Basin (shell 42): +6% max Signal [+2 Block] · Reservoir (implant 44): +4% Clock Speed [+5% damage] | +5% damage, +5% max Signal | Heals you for 3% of your max Signal when you break a part | Each part you break adds 5% damage for the fight, up to 20% |
| **Exfil** ✚ | Stealer kills | Grabber (exploit 38): +5% crit [+5% damage] · Clipper (script 40): +5% Scavenge [+5% crit] · Dropzone (implant 42): +6% max Signal [+5% Clock Speed] | +6% damage | When your hit breaks a part's shield, a third of it shields you for 2 cycles | |
| **Payroll** ✚ | Threads on The Sink | Pay Slip (script 39): +5% Restore [+6% max Signal] · Direct Deposit (proxy 41): +6% max Signal [+2 Block] · Year End (shell 43): +2 Block [+5% Clock Speed] | +8% max Signal | Every 4th cycle, heals you for 4% of your max Signal | |
| **Backbone** ✚ | The Sink's puzzle rooms (deep Packet routing) | Hop (script 38): +4% Clock Speed [+5% damage] · Checksum (implant 41): +5% crit [+6% max Signal] · Multicast (exploit 44): +5% damage [+5% crit] | +5% Clock Speed | A hit that reaches several parts deals 8% more for each part past the first, up to 24% | |

**Boss uniques**, from the lair's eight (✓ built, → re-homed) and two new ones

| Boss (what it teaches) | Its two |
|---|---|
| GOLDEN PARACHUTE (break them close together, before it jacks out) | → Floodgate (a break gives +6% damage, stacking), → Spillway (a breaking hit carries 15 onto the next part) |
| PAY RUN (every part standing adds to the payday) | → Outfall (each skill's first use deals 10% more), ✚ **Headcount** (proxy 40): +1 Block for each part standing, up to 4 |
| BIT BUCKET (big hits get through, and the flush comes back) | → Pumphouse (+5% a Momentum stack spent), → Seawall (Block grows as it reduces hits) |
| SUMP (break the Sump when you can take the flush) | → Anchor Chain (a hit on you makes your next heal or shield 10% larger), ✚ **Check Valve** (proxy 44): damage from a part breaking deals 40% less to you |

**Backwash** and **Riptide** (helper lines) → the Sinkhole's Resident, beside Catchment.

## Floor 8 · Bedrock (43–50) · 5 sets ✓ · 43 → 44 uniques, the lair's eighteen re-homed

| Boss (what it teaches) | Its two | Its Bedrock piece |
|---|---|---|
| HALT AND CATCH FIRE (time the vents, survive the blow) | → Read-Only, → Init Vector | Bedrock Plate (shell 43) |
| THUNDERING HERD (break each worker in one hit) | → Fuse Map, → Wire Wrap | Core Sample (implant 45) |
| CORE DUMP (choose what breaks, and when) | → Last Known Good, → Bedrock Seal | Pick (exploit 47) |
| INIT (break orphans cleanly) | → Root of Trust, → Warm Reset, plus ◇ **Final Settlement** with wick's letter (docs/lore.md 6) | Survey (proxy 49) |

- **The other six → the endgame**, which has no loot of its own yet: Bootstrap and Firmware to the Firmware server's
  Core; Quarry, Keystone, Signal Floor and Golden Image to the flash ranks.
- **Tier sets:** unchanged (crew bosses and either floor 8 lair boss).

## The new source rows (SET_LOOT), proposed

| Source | Like | Chance · pity · once all found |
|---|---|---|
| A server kind's Core (Underwriting desk, Sinkhole) | a Resident takeover, raised | 4% · +1% · 0.5% |
| A Domain Controller vault | a vault, raised (three a server) | 3% · +1% · 0.4% |
| A kill of the floor's new family (Polymorph, Rootkit, Stealer) | a strain kill, lowered (they're common) | 0.02% · +0.003% · 0.01% |
| Kestrel ICE on floor 6 | a guard post | 4% · +2% · 1% |
| A floor's own board (Defrag, deep Deadlock, deep Packet routing) | a puzzle board, raised | 3% · +1% · 0.5% |

## Drop rate: what five sets a floor means

- **What a player sees.** A floor runs 10–15 hours, so it yields about 6–12 drops. The floor's pool is now about
  37–40 items (five sets of about 3.4 pieces, plus 20 uniques), so a player sees about a quarter of it.
- **What that means for sets.** If half the drops are set pieces, that's 3–6 pieces a floor. Spread across five sets,
  that finishes none. On one set, it finishes one. Each new set has its own activity as its source, so the set a player
  finishes is the one for what they like doing.
- **The odds are uneven today** (events per piece ÷ an assumed rate an hour of that activity):

| Source | Events a piece | At | Hours a piece |
|---|---:|---|---:|
| A boss, by its odds today | 6 | 3 kills/h | 2 |
| A thread, today | 3.5 | 1/h | 3.5 |
| A puzzle board, today | 24 | 4/h | 6 |
| A Resident takeover, today | 15 | 2/h | 7.4 |
| A vault, today | 44 | 4/h | 11 |
| A strain kill, today, if it were a common family | 53 | 60/h | 0.9 |
| **Proposed:** a Core, a DC vault, a board, a family kill | 10, 10, 10, 220 | 2, 3, 4, 60 /h | 5, 3.5, 2.6, 3.7 |

- **The aim.** About 3–5 hours of a set's activity for each piece. A 3-piece set then takes one floor's stay, and its
  2-piece bonus arrives mid-floor. The proposed rows above do that. The vault, takeover and board rows are too slow
  today; the strain-kill row would be too fast on a common family.
- **Overlapping sources add up.** One server run yields family kills, vaults and a Core together, so their rates add.
  The rows above sum to about 0.6 an hour on a run that does all three. Uniques at their current rate stay inside the
  cap, but only just: measure on the planner once its clock is fixed (docs/loot-plan.md), and don't tune before that.
- **Fixed levels.** A piece found late in its band is close to obsolete. Every new set spans 6 levels or fewer, so its
  pieces stay useful together.
- **The hour rates are my assumptions,** not measured. The planner's clock overcounts today.
