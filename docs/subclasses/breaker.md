# Breaker subclasses

Until level 10 every Breaker plays the same core: Overload, Flood, Exploit and Crack. At level 10 you pick one of two subclasses with `subclass demolitionist` or `subclass overclocker`. The first pick works anywhere out of a fight, and switching later is free at home. Each subclass has its own skill line, its own edge (the signature passive) and its own talent tree, and it keeps its own bar and talent points when you switch away and back. A Breaker who never picks plays the Demolitionist.

A subclass line holds eight skills, which unlock at levels 12, 14, 18, 22, 26, 30, 34 and 38. Your bar holds seven skills, an eighth from level 22 and a ninth from level 30, and the skill that opens with each new slot goes into it. From level 26 you choose which skills to carry. Momentum, the Breaker passive, works the same for both: each part you break gives +10% damage for 2 cycles, and another break adds a stack and resets the timer.

## Demolitionist

**DPS, Armor, Area.** Bring the whole thing down. Solo, the Demolitionist strips armor fast and hits every part at once. In a crew it opens every part for everyone else, and its strip skills go first in the turn order.

**Edge: Overkill.** When your hit breaks a part, the damage left over spills onto the next part, up to 20.

| Level | Skill | What it does | Cooldown |
|---:|---|---|---:|
| 12 | `shatter <part>` | Lit for a cycle on the part whose last ◆ you just broke. 38 damage to it. | lit |
| 14 | `fork-bomb` | 12 damage to every part, three times that to every fragment. | 3 |
| 18 | `shaped-charge <part>` | Breaks every ◆ on it at once, and the part lashes out: its attack comes a cycle sooner. On a part with no armor left, it deals 30 damage instead. | 5 |
| 22 | `thermal-runaway <part>` | Burns it for 4, then 8, 12 and 16. On a part compiling a cast, every tick counts as a hit on the cast. | 4 |
| 26 | `logic-bomb <part>` | Goes off 2 cycles later: 50 damage to it and 20 to every other part. A part it breaks can't reboot, and a Tripwire it breaks stays quiet. | 4 |
| 30 | `chain-reaction` | For 3 cycles, every part you break blows up and hits every other part for 20. A part broken by a blast sets off a blast of its own. | 6 |
| 34 | `bit-rot <part>` | For 4 cycles it loses a ◆ at the end of each of your turns, it can't patch any back, and a seal it starts fails. | 5 |
| 38 | `zero-day <part>` | 65 damage straight through armor, locks and wards. Once per fight. | once |

### Demolitionist talents

Ranked rows (up to 3 ranks in each node, numbers per rank):

| Row | First node | Second node |
|---|---|---|
| 1 | **Armor Cracker.** Parts you strip take 1 cycle longer to patch. | **Blast Radius.** Fork Bomb, Logic Bomb and Chain Reaction deal 10% more. |
| 2 | **Overclocked Core.** You deal 3% more damage. | **Shrapnel.** Shatter deals 8% more. |
| 3 | **Failsafe.** You take 3% less damage from attacks. | **Deep Burn.** Thermal Runaway burns for 2 more each tick. |

Choice tiers (pick one of two):

| Tier | Option A | Option B |
|---|---|---|
| 1 | **Cluster Charge.** Shaped Charge also breaks 2 ◆ on every other part. | **Exposed Wiring.** Whenever a part loses its last ◆, it is Exposed for your next 2 cycles. |
| 2 | **Cascade Failure.** Your first break each fight resets all your cooldowns. | **Meltdown.** Thermal Runaway also starts on every other part at half strength. |
| 3 | **Total Overkill.** Overkill spills onto every other part, not just the next one. | **Scorched Earth.** No part patches its ◆ back while you're in the fight. |

**Playing it.** Strip first, then cash in. Crack takes three ◆ off. Shaped Charge takes them all, but the part lashes out and its attack comes a cycle sooner, so blow it on a part whose attack is still far off. Shatter is lit for one cycle on the part you just stripped. Press it when it's your biggest hit there, and Flood when Flood is bigger. Fork Bomb is for fragments: they take three times its hit while everything else takes a little. Thermal Runaway melts a cast, because every tick counts as a hit on it. Logic Bomb breaks twins for good and keeps a Tripwire quiet. Bit Rot makes a seal fail, and Zero-Day goes through a Mutex lock or a Lockbox ward. Area hits and burns never call off a tell: when a part winds up a charge, hit that part.

## Overclocker

**DPS, Burst.** Run it hot until something melts. Solo, the Overclocker lands the biggest single hits in the game. In a crew it deletes the part that matters. It pays for that in Signal and in the damage it takes.

**Edge: Redline.** Momentum stacks to 5 instead of 3, but you take 10% more damage from attacks while you have any stacks.

| Level | Skill | What it does | Cooldown |
|---:|---|---|---:|
| 12 | `overvolt <part>` | Two hits of 20 in one command. Both count against a tell: one Overvolt stops a cast. It costs you 6 Signal (Integrity at home). | 4 |
| 14 | `segfault <part>` | 30 damage, three times that on a part winding up a charge. Crash it mid-wind-up. | 3 |
| 18 | `thermal-throttle <part>` | Needs Momentum and spends all of it. It deals 20 damage plus 20 for each stack spent, and with 2 or more stacks it goes straight through armor, locks and wards. | 3 |
| 22 | `brace` | This cycle and next, hits on you deal 30% less, and whatever hits you takes twice what Brace saved you. Made for a charge you can't call off. | 5 |
| 26 | `stack-smash <part>` | 30 damage. On an Exposed part it hits twice for sure. Each crit hits it again, up to 3 more times. | 3 |
| 30 | `sudo` | Root override, this cycle and next: locks and wards don't hold your hits, a Tripwire you break stays quiet, and the Decoy and the Mimic can't copy you. | 6 |
| 34 | `turbo-boost` | Gain 2 Momentum stacks that last 3 cycles, for 6 Signal (Integrity at home). Under half your Signal it costs nothing and gives 3. | 5 |
| 38 | `zero-day <part>` | 65 damage straight through armor, locks and wards. Once per fight. | once |

### Overclocker talents

Ranked rows (up to 3 ranks in each node, numbers per rank):

| Row | First node | Second node |
|---|---|---|
| 1 | **Heat Sink.** Overload deals 4 more damage. | **Chain Exploit.** Each Momentum stack gives 2% more damage. |
| 2 | **Exploit Kit.** Exposed gives 5% more crit chance. | **Core Voltage.** Segfault and Stack Smash deal 8% more. |
| 3 | **Heat Spreader.** Momentum lasts 1 cycle longer. | **Liquid Cooling.** Overvolt and Turbo Boost cost 2 less, so they are free at 3 ranks. |

Choice tiers (pick one of two):

| Tier | Option A | Option B |
|---|---|---|
| 1 | **Hair Trigger.** Overload has cooldown 2 but deals 35. | **Feedback Loop.** Every crit you land adds a Momentum stack. |
| 2 | **Core Dump.** Segfault's execute starts under 40%. | **Burn-in.** Thermal Throttle spends only half your Momentum stacks, rounded down, and the rest stay. |
| 3 | **Unsafe Mode.** You deal 30% more damage and take 20% more. | **Critical Heat.** While you have 4 or more Momentum stacks, every hit you land crits. |

**Playing it.** Build heat, then spend it on one part, and let the board tell you when. A part winding up a charge is Segfault's: three times the hit, and the charge is called off. A cast is Overvolt's: two hits in one command stop it. A charge you can't stop is Brace's, and the part that lands it takes twice what Brace saved you. A Mutex lock, a Lockbox ward, a Tripwire or the Mimic's beat is Sudo's. Exploit a big bare part and Stack Smash it next cycle for two hits, more on crits. Thermal Throttle turns your stacks into one big hit that goes through armor and locks from two stacks, and Turbo Boost is free once you're under half your Signal. Every stack you hold makes the virus hit you harder.
