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
- **Tagged**: you hit a Tagged part, whoever Tagged it;
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

## Talent tiers (decided)

Decision 7.1, the designer's pick (November 2026; the review page was a scratchpad artifact). Six pick-one-of-three
tiers replace the three pick-one-of-two tiers and the three ranked rows; the capstone row stays as it is (45, rank 2
at 50). Tiers open by level, not by points spent. Respec stays free at home. In each tier the first talent is the
plain pick (safe in any fight), the middle one changes how a skill plays, and the third fires on a shared event
(section 3), the starred ones on another class's. The kit talents (level 5) stay. Talent text is the name, its kind
("Tier 3 talent") and what it does, nothing more: the player finds the combos. 3⁶ × 2 = 1,458 builds a subclass.

To test in play: Health Probe with Overprovision and Change Freeze (a free Checksum every cycle?), and the
Overclocker's crit build (Feedback Loop, Setuid, Stack Overflow, Flashpoint). Unsure tiers: Ring Circuit's chain,
Heat Spreader's +2 cycles, Cold Plate and Cover Traffic without a shield source, Retransmit without crits, Zeroize
against Log Wipe, Host Vector without a crewmate's Tag, and whether Replay is an answer (Rebroadcast).

### Demolitionist

| Tier | Level | Plain | Shape | Combo (event) |
|---|---:|---|---|---|
| 1 | 10 | **Shrapnel.** Increases the damage of Shatter by 20%. | **Splintering.** Makes Shatter's shards break 2 ◆ on every armored part as well. | **Exposed Wiring.** Exposes the part whose attack lands soonest for 2 cycles when you break a part. (break) |
| 2 | 16 | **Pressure Test.** Makes Crack break 4 ◆ instead of 3. | **Cluster Charge.** Makes Shaped Charge break 2 ◆ on every other part as well. | **Shock Front.** Breaks every ◆ on a part when you answer its tell. (answer) |
| 3 | 22 | **Deep Burn.** Increases the damage of every Thermal Runaway tick by 5. | **Meltdown.** Makes Thermal Runaway start on every other part as well, at half strength. | **Cook-Off.** Lets your burn ticks on an armored part deal their damage as well as break a ◆. (burn tick*) |
| 4 | 28 | **Crumple Zone.** Reduces the damage charged attacks deal to you by 20%. | **Total Overkill.** Makes Overkill spill onto every other part, not just the next one. | **Reactive Plating.** Breaks 2 ◆ on the part that hit you when your shield absorbs its hit. (shielded*) |
| 5 | 34 | **Blast Radius.** Increases the damage of Fork Bomb, Logic Bomb and Chain Reaction by 15%. | **Ring Circuit.** Makes Chain Reaction wire every part, not just the target. | **Cascade Failure.** Lowers all your cooldowns by 1 cycle when you cut a part's move. (cut) |
| 6 | 40 | **Soft Target.** Increases your damage to parts with no armor by 10%. | **Recursion.** Makes Fork Bomb go off again the next cycle, at half strength. | **Critical Mass.** Breaks 1 ◆ on every other part when you land a critical strike. Works once per cycle. (crit*) |

### Overclocker

| Tier | Level | Plain | Shape | Combo (event) |
|---|---:|---|---|---|
| 1 | 10 | **Boost Clock.** Increases the damage of Overload by 10. | **Hair Trigger.** Lowers Overload's cooldown to 2 cycles, but it deals 15% less damage. | **Feedback Loop.** Gives you a Momentum stack when you land a critical strike. Works once per cycle. (crit) |
| 2 | 16 | **Core Voltage.** Increases the damage of Segfault by 20%. | **Burn-in.** Makes Thermal Throttle spend only half your Momentum stacks, rounded down. The rest stay. | **Clock Glitch.** Gives you 2 Momentum stacks when you answer a tell. (answer) |
| 3 | 22 | **Liquid Cooling.** Makes Overvolt and Turbo Boost cost no Signal. | **Coolant Dump.** Makes Vent also shield you for 8 for each Momentum stack it spends. | **Back-EMF.** Gives you a Momentum stack when an attack hits you. Works once per cycle. (struck*) |
| 4 | 28 | **Heat Spreader.** Makes your Momentum stacks last 2 cycles longer. | **Stack Overflow.** Makes Stack Smash hit twice against any part, and three times against an Exposed one. | **Context Switch.** Makes Segfault usable again when you cut a part's move. (cut) |
| 5 | 34 | **Exploit Kit.** Increases your chance to critically strike by 8%. | **Fault Storm.** Makes Fault Injection work on every part, for 2 cycles instead of 3. | **Cold Plate.** Gives you 2 Momentum stacks when you gain a shield. Works once per cycle. (shielded*) |
| 6 | 40 | **Junction Temp.** Increases the damage of Thermal Throttle by 25%. | **Setuid.** Makes every hit you land during Sudo a critical strike. | **Flashpoint.** Makes your next hit a critical strike when you break a part. (break) |

### Warden

| Tier | Level | Plain | Shape | Combo (event) |
|---|---:|---|---|---|
| 1 | 10 | **Deep Packet Inspection.** Makes Firewall absorb 30 instead of 16. | **Token Bucket.** Makes Rate Limit Throttle the target's next 2 attacks instead of 1. | **Rebound.** Makes your next Reject deal double damage when an attack hits you. (struck) |
| 2 | 16 | **Deep Buffer.** Increases the damage of Blowback by 25%. | **Tarpit.** Makes Suspend also Throttle the target until its attack lands. | **Flow Control.** Makes Retaliate usable on a part when you answer its tell. (answer) |
| 3 | 22 | **Hardened Kernel.** Increases your max Signal by 10%. | **Write Protect.** Makes Harden give 2 ◆, but it costs 10% of your max Signal. | **Bounce Buffer.** Deals the damage your shield absorbs back to the part that hit you. (shielded) |
| 4 | 28 | **Denylist.** Increases Grudge's bonus from 20% to 30%. | **Counterflow.** Makes Retaliate also send back everything Blowback has stored, as a second hit, and empties it. | **Dead Letter.** Stores a part's move for your next Blowback when you cut it, as if it had hit you. (cut) |
| 5 | 34 | **Uptime.** Leaves you at 1 Signal when a hit would drop you to 0. Works once per fight. | **Honey Farm.** Makes Honeypot soften the next 2 hits on you instead of 1. | **Heat Shield.** Shields you for 3 when one of your burns ticks. (burn tick*) |
| 6 | 40 | **Kernel Panic.** Increases your damage by 30% while you are below a third of your Signal. | **Fail-Fast.** Makes Failover hit only the target, for double damage. | **Retransmit.** Makes Retaliate usable when you land a critical strike. (crit*) |

### Sysop

| Tier | Level | Plain | Shape | Combo (event) |
|---|---:|---|---|---|
| 1 | 10 | **Parity Bit.** Makes Checksum heal for half the damage it deals instead of a quarter. | **Hot Fix.** Makes Firewall also heal you for 10. | **Health Probe.** Makes Checksum usable again when you gain a shield. Works once per cycle. (shielded) |
| 2 | 16 | **Tick Rate.** Increases Heartbeat's heal by 3 every cycle. | **Service Pack.** Makes Patch heal its whole amount up front. | **Health Check.** Ticks your Heartbeat on you once more when an attack hits you. Works once per cycle. (struck) |
| 3 | 22 | **Anycast.** Increases Multicast's heal by 8. | **Ping Flood.** Makes Multicast also hit every part for what it heals each player. | **Clean Slate.** Increases your next heal by 50% when you answer a tell. (answer) |
| 4 | 28 | **Critical Path.** Increases your heals by 50% on anyone below a third of their Signal. | **Redistribute.** Makes Reclaim also heal the lowest crewmate as much as it heals you. Alone, it heals you twice as much. | **Change Freeze.** Shields you and every crewmate for 8 when you cut a part's move. (cut) |
| 5 | 34 | **Overcommit.** Lets Overprovision hold 40 shield instead of 20. | **Revocation List.** Makes Revoke hit every part for half, and revoke them all for 2 cycles. | **Trickle Charge.** Heals the lowest player for 3 when one of your burns ticks. (burn tick*) |
| 6 | 40 | **High Availability.** Increases all your heals by 15%. | **Graceful Restart.** Makes Hot Standby also heal the player it saves to half their Signal. | **Teardown.** Heals you and every crewmate for 10 when a part breaks. (break*) |

### Payload

| Tier | Level | Plain | Shape | Combo (event) |
|---|---:|---|---|---|
| 1 | 10 | **Heap Spray.** Increases the damage of your Inject by 6 every tick. | **Long Fuse.** Your Inject lasts 6 cycles instead of 4. | **Third-Party Cookie.** When you Tag a part, every burn on it ticks once. (Tagged) |
| 2 | 16 | **Shaped Charge.** Increases the damage of Detonate by 25%. | **Assassinate.** Detonate deals double damage to a Tagged part. | **Chain Letter.** When a part you are burning breaks, Detonate becomes usable again. (break) |
| 3 | 22 | **Low Profile.** Reduces the damage attacks deal to you by 10% from a part you are burning. | **Spillover.** Skim heals past your max Signal shield you instead, up to 20. | **Fault Handler.** When an attack hits you, your burns on its part tick once. Works once per cycle. (struck) |
| 4 | 28 | **Virulence.** Wormable, Skim and Polymorph deal 5 more damage every tick. | **Contagion.** Each Inject also starts a copy on the part whose attack lands soonest, or refreshes the one there. | **Fever.** Every third tick of your Inject is a critical strike. (burn tick) |
| 5 | 34 | **Persistence.** Rootkit Implant can be used twice a fight. | **Superspreader.** Bloom copies the burns to every other part, not just the next one. | **Heat Sink.** When you gain a shield, every burn on the target ticks once. Works once per cycle. (shielded*) |
| 6 | 40 | **Thermal Load.** Increases the damage of your burns by 10%. | **Index Case.** Outbreak also Tags every part for 4 cycles. | **IRQ Chain.** When you answer a tell, IRQ Storm becomes usable again. IRQ Storm's own answers do not count. (answer) |

### Phantom

| Tier | Level | Plain | Shape | Combo (event) |
|---|---:|---|---|---|
| 1 | 10 | **Cold Open.** Increases the damage of your Weak Spot critical strikes by 15%. | **Blind Spot.** Makes your first burn tick on each part a critical strike, as Weak Spot does for hits. | **Web Beacon.** Makes Weak Spot fresh on a part again when you Tag it. (Tagged) |
| 2 | 16 | **Pivot.** Increases the damage of Backstab by 25%. | **Fast Hands.** Keeps Opening usable for 2 cycles instead of 1. | **Timing Attack.** Makes Opening usable when you answer a tell. (answer) |
| 3 | 22 | **Onion Routing.** Increases your max Signal on runs by 8. | **Ghost Route.** Makes Null Route also delay the attack that lands soonest by 2 cycles. | **Kill Chain.** Makes Backstab and Opening usable when you break a part. (break*) |
| 4 | 28 | **Log Rotation.** Lowers Log Wipe's cooldown from 6 cycles to 4. | **Deep Cover.** Makes Log Wipe also make Null Route and Shadow Copy usable again. | **Data Leak.** Ticks your Inject on a part once when you land a critical strike on it. Works once per cycle. (crit) |
| 5 | 34 | **Packet Loss.** Gives attacks on you a 10% chance to miss. | **Full Disclosure.** Makes Unmask last until the target breaks, but its cooldown is 8 cycles. | **Cover Traffic.** Makes Opening usable when your shield absorbs a hit. (shielded*) |
| 6 | 40 | **Clean Exploit.** Increases the damage of your critical strikes by 20%. | **Tracking Pixel.** Moves Tag to the part whose attack lands soonest when a Tagged part breaks, with the cycles it had left. | **Zeroize.** Makes Weak Spot fresh on every part when you cut a part's move. Works once per cycle. (cut) |

### Herder

| Tier | Level | Plain | Shape | Combo (event) |
|---|---:|---|---|---|
| 1 | 10 | **Node Pool.** Increases the damage of Botnet helpers by 3 every cycle. | **Long-running.** Makes Deploy helpers last 6 cycles instead of 4. | **Auto-restart.** Starts a Spawn helper on a part when you cut its move. (cut) |
| 2 | 16 | **Dead Man's Switch.** Increases what Kill Switch cashes in by 15%. | **Supervisor.** Makes Deploy usable again when you use Kill Switch. | **SIGHUP.** Makes every helper on a part hit it once more when its attack hits you. Works once per cycle. (struck*) |
| 3 | 22 | **Hive.** Lets you run 9 helpers at once instead of 6. | **Full Mesh.** Makes Mesh's spill deal full damage, but its cooldown is 12 cycles. | **Hydra.** Splits each of your helpers on a part in two when the part breaks, up to your cap. (break*) |
| 4 | 28 | **GC Tuning.** Increases the damage of Garbage Collect by 50%. | **Zombie Process.** Makes Last Gasp hit twice, so each helper hits two more times as it expires. | **Watchdog Reset.** Makes your helpers run 1 cycle longer when you answer a tell. (answer) |
| 5 | 34 | **Load Balancer.** Reduces the damage attacks deal to you by 3% for each helper you have running, up to 12%. | **Page Out.** Makes OOM Kill shield you for 60% of the damage your helpers had left, instead of healing you for 40%. | **Host Vector.** Makes every helper on a Tagged part hit it once more when you hit it. Works once per cycle. (Tagged*) |
| 6 | 40 | **Renice.** Increases the damage of your helpers by 10%. | **Final Run.** Makes Cron Storm's helpers hit three times, and each one ends with its Last Gasp. | **Hot Swap.** Starts a Spawn helper on every part without one when you gain a shield. Works once per cycle. (shielded*) |

### Hijacker

| Tier | Level | Plain | Shape | Combo (event) |
|---|---:|---|---|---|
| 1 | 10 | **Kernel Hook.** Increases the damage Hooked parts take from every hit by 3. | **Port Mirror.** Makes Sniff leave two footholds instead of one. | **Line Tap.** Makes Sniff usable again when you cut a part's move. (cut) |
| 2 | 16 | **ACK Flood.** Makes Spoofed ACK send back three quarters of the attack instead of half. | **Double Agent.** Makes Hijack take the part's next two attacks. | **Rebroadcast.** Makes Replay usable again when you answer a tell. (answer) |
| 3 | 22 | **Cold Storage.** Increases Barrier's shield by 25%. | **Loopback.** Makes Jam leave the helper running. | **Shim.** Leaves a foothold on the part whose hit your shield absorbs. (shielded) |
| 4 | 28 | **Packet Capture.** Increases the damage of Replay by 15. | **Crosstalk.** Makes a hijacked hit land on every other part, not just one. | **Traceback.** Jams the part that hits you until its next attack. Works once per cycle. (struck*) |
| 5 | 34 | **Full Duplex.** Makes Jammed parts take 30% more damage from everyone instead of 20%. | **Sidetone.** Makes Echo Cancel also Jam the target until its next attack. | **Handoff.** Makes Jam, Spoofed ACK and Hijack usable again when you break a Jammed part. (break*) |
| 6 | 40 | **Refcount.** Heals you for 5 when you spend a helper. | **Event Horizon.** Makes Blackhole drop the part's next two attacks, but its cooldown is 9 cycles. | **Elevate.** Makes Hijack usable again when you land a critical strike on a Jammed part. Works once per cycle. (crit*) |

## 6. Order

1. Prototype: a standalone page with the four builds, their pieces and how they connect, as screenshots.
2. The shared events and the stacking rule.
3. Skill affixes on gear.
4. Content: combo pieces for every class, the off-class ones first.

## 7. Open decisions

1. **More talent choices:** decided, *Talent tiers (decided)* above.
