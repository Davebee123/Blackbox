# Breaker subclasses

Until level 10 every Breaker plays the same core: Overload, Flood, Exploit and Crack. At level 10 you pick one of two subclasses with `subclass demolitionist` or `subclass overclocker`. The first pick works anywhere out of a fight, and switching later is free at home. Each subclass has its own skill line, its own edge (the signature passive) and its own talent tree, and it keeps its own bar and talent points when you switch away and back. A Breaker who never picks plays the Demolitionist.

A subclass line holds eight skills, which unlock at levels 12, 14, 18, 22, 26, 30, 34 and 38. Your bar still has seven slots, so from level 22 you choose which skills to carry. Momentum, the Breaker passive, works the same for both: each part you break gives +10% damage for 2 cycles, and another break adds a stack and resets the timer.

## Demolitionist

**DPS, Armor, Area.** Bring the whole thing down. Solo, the Demolitionist strips armor fast and hits every part at once. In a crew it opens every part for everyone else, and its strip skills go first in the turn order.

**Edge: Overkill.** When your hit breaks a part, the damage left over spills onto the next part, up to 20.

| Level | Skill | What it does | Cooldown |
|---:|---|---|---:|
| 12 | `shatter <part>` | Lights up for 2 cycles when you break a part's last ◆. It deals 62 damage. | lit |
| 14 | `fork-bomb` | Deals 15 damage to every part, or 30 to an Exposed one. | 3 |
| 18 | `shaped-charge <part>` | Breaks every ◆ on the part at once, which lights Shatter. The blast is loud, so the part's attack comes a cycle sooner. On a part with no armor left, it deals 30 damage instead. | 5 |
| 22 | `thermal-runaway <part>` | Burns the part for 6, then 10, 14 and 18. | 4 |
| 26 | `logic-bomb <part>` | Plants a bomb that goes off 2 cycles later. It deals 50 damage to that part and 20 to every other part. If the part breaks first, the bomb goes off on the next one. On armor, the 50 breaks two ◆. | 4 |
| 30 | `chain-reaction` | For 3 cycles, every part you break blows up and hits every other part for 20. A part broken by a blast sets off a blast of its own. | 6 |
| 34 | `bit-rot <part>` | For 4 cycles the part loses a ◆ at the end of each of your turns, and it can't patch any back while it rots. It can't target a part that never had armor. | 5 |
| 38 | `zero-day <part>` | Deals 65 damage straight through armor. You can use it once per fight. | once |

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

**Playing it.** Strip first, then cash in. Crack and Shaped Charge take the armor off, Shatter lights up the moment the last ◆ breaks, and Fork Bomb finishes off single chits on several parts at once. Shaped Charge pulls the part's attack a cycle closer, so fire it when the attack is still a few cycles away, or when you can break the part before it lands. Logic Bomb and Chain Reaction reward fights with many parts, such as Worm fragments and bosses. Bit Rot is for parts that keep patching their armor back.

## Overclocker

**DPS, Burst.** Run it hot until something melts. Solo, the Overclocker lands the biggest single hits in the game. In a crew it deletes the part that matters. It pays for that in Signal and in the damage it takes.

**Edge: Redline.** Momentum stacks to 5 instead of 3, but you take 10% more damage from attacks while you have any stacks.

| Level | Skill | What it does | Cooldown |
|---:|---|---|---:|
| 12 | `overvolt` | Your next Overload within the next 3 cycles hits twice. On armor, each hit breaks two ◆. It costs you 6 Signal, or 6 Integrity at home. | 4 |
| 14 | `segfault <part>` | Deals 30 damage, or three times that to a part under 30%. | 3 |
| 18 | `thermal-throttle <part>` | Needs Momentum and spends all of it. It deals 20 damage plus 20 for each stack spent. With 2 or more stacks it goes straight through armor. | 3 |
| 22 | `brace` | For 2 cycles you get +5 Block, and whatever hits you loses a ◆ (or takes 10 if it has none). | 5 |
| 26 | `stack-smash <part>` | Deals 30 damage. Each crit hits the part again, up to 3 more times. | 3 |
| 30 | `sudo` | This cycle and next, every hit you land crits. | 6 |
| 34 | `turbo-boost` | You gain 2 Momentum stacks that last 3 cycles. It costs you 6 Signal, or 6 Integrity at home. | 5 |
| 38 | `zero-day <part>` | Deals 65 damage straight through armor. You can use it once per fight. | once |

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

**Playing it.** Build heat, then spend it on one part. Each break adds a Momentum stack, and Redline lets them pile up to 5, so the second and third parts of a fight fall faster than the first. Thermal Throttle turns the stacks into one big hit, and with two or more it ignores armor entirely. Overvolt doubles your next Overload, and Turbo Boost buys stacks without a break, but both cost Signal, and every stack you hold makes the virus hit you harder. Stack Smash pairs with Sudo, Exploit and Critical Heat, because every crit hits again.
