# Breaker subclasses

Until level 10 every Breaker plays the same core: Overload, Flood, Exploit and Crack. At level 10 you pick one of two subclasses with `subclass demolitionist` or `subclass overclocker`. The first pick works anywhere out of a fight, and switching later is free at home. Each subclass has its own skill line, its own edge (the signature passive) and its own talent tree, and it keeps its own bar and talent points when you switch away and back. A Breaker who never picks plays the Demolitionist.

From level 10 each subclass learns its own line of eleven skills, one at each of levels 10, 12, 14, 16, 18, 20, 22, 26, 30, 34 and 38, so with the four core skills it has fifteen keys to choose from. Your bar holds seven, an eighth from level 22 and a ninth from level 30. Two presets come with each subclass (docs/kits.md): `rotation`, which your bar follows as skills unlock until you change it by hand, and one built for a kind of fight. `loadout use <name>` puts a preset on anywhere out of a fight, at home or on a run, and the keys it brings in start your next fight cooling. `loadout save <name>` keeps the bar you have under a name, and `loadout list` shows them all. A save from before the fifteen-key lines keeps every skill it knew. Momentum, the Breaker passive, works the same for both: each part you break gives +10% damage for 2 cycles, and another break adds a stack and resets the timer.

## Demolitionist

**DPS, Armor, Area.** Bring the whole thing down. Solo, the Demolitionist strips armor fast and hits every part at once. In a crew it opens every part for everyone else, and its strip skills go first in the turn order.

**Edge: Overkill.** When your hit breaks a part, the damage left over spills onto the next part, up to 20.

| Level | Skill | What it does | Cooldown |
|---:|---|---|---:|
| 10 | `shatter <part>` | Lit for a cycle on the part whose last ◆ you just broke. 38 damage to it, and its shards hit every other bare part for 12. | lit |
| 12 | `shaped-charge <part>` | Breaks every ◆ on it at once, and the part lashes out: its attack comes a cycle sooner. On a part with no armor left, it deals 30 damage instead. | 5 |
| 14 | `fork-bomb` | 16 damage to every part, three times that to every fragment. | 3 |
| 16 | `debris-field` | This cycle and the next two, every ◆ you break shields you for 5, up to 30. | 6 |
| 18 | `thermal-runaway <part>` | Burns it for 4, then 8, 12 and 16. On a part compiling a cast, every tick counts as a hit on the cast. | 4 |
| 20 | `backfire <part>` | 25 damage. On a part winding up a charge, the charge blows up inside it: it takes the extra the charge would have added (up to 60), and the attack lands plain. | 4 |
| 22 | `logic-bomb <part>` | Goes off 2 cycles later: 50 damage to it and 20 to every other part. A part it breaks can't reboot, and a Tripwire it breaks stays quiet. | 5 |
| 26 | `rm-rf` | This cycle and next, every hit you land also hits every other part for half. | 10 |
| 30 | `chain-reaction <part>` | 30 damage. If the part breaks within 3 cycles, it blows up and hits every other part for 25, and a part the blast breaks blows up too. | 6 |
| 34 | `bit-rot <part>` | 20 damage now. For 4 cycles it loses a ◆ at the end of each of your turns, it can't patch any back, and a seal it starts fails. | 5 |
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

**Playing it.** Strip first, then cash in. Crack takes three ◆ off. Shaped Charge takes them all, but the part lashes out and its attack comes a cycle sooner, so blow it on a part whose attack is still far off. Shatter is lit for one cycle on the part you just stripped. Press it when it's your biggest hit there, and Flood when Flood is bigger. Fork Bomb is for fragments: they take three times its hit while everything else takes a little. Thermal Runaway melts a cast, because every tick counts as a hit on it. Logic Bomb breaks twins for good and keeps a Tripwire quiet. Bit Rot makes a seal fail, and Zero-Day goes through a Mutex lock or a Lockbox ward. Area hits and burns never call off a tell: when a part winds up a charge, hit that part, and Backfire is the hit for it, because the charge goes off inside its own part. Debris Field goes up before a big strip, and every ◆ you break then shields you. rm -rf makes two cycles of your hits land on every part for half, so press it before Shatter or Overload on a part with others still standing. Chain Reaction wires a part that is about to break: when it does, it blows up the rest. The `swarm` preset swaps Thermal Runaway and Logic Bomb for Fork Bomb and Chain Reaction, for worms, fragments and an Overrun.

## Overclocker

**DPS, Burst.** Run it hot until something melts. Solo, the Overclocker lands the biggest single hits in the game. In a crew it deletes the part that matters. It pays for that in Signal and in the damage it takes.

**Edge: Redline.** Momentum stacks to 5 instead of 3, but you take 10% more damage from attacks while you have any stacks.

| Level | Skill | What it does | Cooldown |
|---:|---|---|---:|
| 10 | `hot-loop <part>` | 22 damage, and you gain a Momentum stack that lasts 2 cycles. | 2 |
| 12 | `overvolt <part>` | Two hits of 20 in one command. Both count against a tell: one Overvolt stops a cast. It costs you 6 Signal (Integrity at home). | 4 |
| 14 | `segfault <part>` | 30 damage, three times that on a part winding up a charge. Crash it mid-wind-up. | 3 |
| 16 | `thermal-throttle <part>` | Needs Momentum and spends all of it. It deals 20 damage plus 20 for each stack spent, and with 2 or more stacks it goes straight through armor, locks and wards. | 3 |
| 18 | `brace` | This cycle and next, hits on you deal 30% less, and whatever hits you takes twice what Brace saved you. Made for a charge you can't call off. | 5 |
| 20 | `vent` | Spend all your Momentum: it clears Corrupted, encryption and Scrambled, and heals you 5 for each stack spent (at least 5). | 5 |
| 22 | `stack-smash <part>` | 30 damage. On an Exposed part it hits twice for sure. Each crit hits it again, up to 3 more times. | 3 |
| 26 | `fault-injection <part>` | 20 damage, and for 3 cycles every hit you land on it crits. | 10 |
| 30 | `sudo` | Root override, this cycle and next: your hits go through ◆ (each still breaks one), locks and wards don't hold them, a Tripwire you break stays quiet, and the Decoy and the Mimic can't copy you. | 8 |
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

**Playing it.** Build heat, then spend it on one part, and let the board tell you when. A part winding up a charge is Segfault's: three times the hit, and the charge is called off. A cast is Overvolt's: two hits in one command stop it. A charge you can't stop is Brace's, and the part that lands it takes twice what Brace saved you. A Mutex lock, a Lockbox ward, a Tripwire or the Mimic's beat is Sudo's. Exploit a big bare part and Stack Smash it next cycle for two hits, more on crits. Thermal Throttle turns your stacks into one big hit that goes through armor and locks from two stacks, and Turbo Boost is free once you're under half your Signal. Every stack you hold makes the virus hit you harder. Hot Loop is the cheap key between the big ones, a hit that adds a stack. Vent spends your stacks to clear Corrupted, encryption or a scramble and heals you for each. Fault Injection makes every hit on a part crit for 3 cycles, so line up Segfault, Overload and Stack Smash behind it. The `rules` preset swaps Brace and Fault Injection for Sudo and Vent, for Ransomware, the Ghostroot and the bosses built on locks, Tripwires and the Mimic.
