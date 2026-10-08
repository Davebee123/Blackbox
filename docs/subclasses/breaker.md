# Breaker subclasses

Until level 10 every Breaker plays the same core: Overload, Flood, Exploit and Crack. At level 10 you pick one of two subclasses with `subclass demolitionist` or `subclass overclocker`. The first pick works anywhere out of a fight, and switching later is free at home. Each subclass has its own skill line, its own edge (the signature passive) and its own talent tree, and it keeps its own bar and talent points when you switch away and back. A Breaker who never picks plays the Demolitionist.

From level 10 each subclass learns its own line of eleven skills, one at each of levels 10, 12, 14, 16, 18, 20, 22, 26, 30, 34 and 38, so with the four core skills it has fifteen keys to choose from. Your bar holds seven, an eighth from level 22 and a ninth from level 30. Two presets come with each subclass (docs/kits.md): `rotation`, which your bar follows as skills unlock until you change it by hand, and one built for a kind of fight. `loadout use <name>` puts a preset on anywhere out of a fight, at home or on a run, and the keys it brings in start your next fight cooling. `loadout save <name>` keeps the bar you have under a name, and `loadout list` shows them all. A save from before the fifteen-key lines keeps every skill it knew. Momentum, the Breaker passive, works the same for both: each part you break gives +10% damage for 2 cycles, and another break adds a stack and resets the timer.

## Demolitionist

**DPS, Armor, Area.** Bring the whole thing down. Solo, the Demolitionist strips armor fast and hits every part at once. In a crew it opens every part for everyone else, and its strip skills go first in the turn order.

**Edge: Overkill.** When your hit breaks a part, the damage left over spills onto the next part, up to 20.

| Level | Skill | What it does | Cooldown |
|---:|---|---|---:|
| 10 | `shatter <part>` | Deals 38 damage to the part whose last ◆ you just broke. Its shards deal 12 damage to every other part with no armor. Usable for 1 cycle after the strip. | lit |
| 12 | `shaped-charge <part>` | Breaks every ◆ on the target at once. The part lashes out, and its next attack comes a cycle sooner. Deals 30 damage instead to a part with no armor. | 5 |
| 14 | `fork-bomb` | A recursive blast that breaks 3 ◆ on every armored part and deals 16 damage to every part with no armor. Fragments take triple damage. | 4 |
| 16 | `debris-field` | For 3 cycles, every ◆ you break shields you for 5, up to 30. | 6 |
| 18 | `thermal-runaway <part>` | Burns the target for 4 damage, then 8, 12 and 16 over the next 3 cycles. Each tick on a part compiling a cast counts as a hit on the cast. | 4 |
| 20 | `backfire <part>` | Deals 25 damage to the target. A charge it is winding up blows up inside it, dealing the extra the charge would have added (up to 60), and the attack lands plain. | 4 |
| 22 | `logic-bomb <part>` | Plants a bomb that goes off 2 cycles later, dealing 50 damage to the target and 20 to every other part. A part it breaks can't reboot, and a Tripwire it breaks stays quiet. | 5 |
| 26 | `rm-rf` | For 2 cycles, every hit you land also hits every other part for half as much. | 10 |
| 30 | `chain-reaction <part>` | Deals 40 damage to the target, or breaks 2 ◆ on an armored one, and wires it for 3 cycles. If it breaks while wired, it explodes for 30 damage to every other part, and a part the blast breaks explodes too. | 5 |
| 34 | `bit-rot <part>` | Deals 25 damage, or breaks 2 ◆ on an armored part, and rots the target for 4 cycles. A rotting part takes 20% more damage from you, loses a ◆ at the end of each of your turns and can't patch armor back. A seal it lands while rotting fails. | 5 |
| 38 | `zero-day <part>` | Deals 65 damage to the target, straight through armor, locks and wards. Once per fight. | once |

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

**Playing it.** Strip first, then cash in. Crack takes three ◆ off. Shaped Charge takes them all, but the part lashes out and its attack comes a cycle sooner, so blow it on a part whose attack is still far off. Shatter is lit for one cycle on the part you just stripped. Press it when it's your biggest hit there, and Flood when Flood is bigger. Fork Bomb is a Crack on every part at once: it breaks 3 ◆ on each armored part and hits every bare one for 16, and fragments take three times that. Press it when it bares your target and more besides, so Shatter follows. Thermal Runaway melts a cast, because every tick counts as a hit on it. Logic Bomb breaks twins for good and keeps a Tripwire quiet. Bit Rot is the strip for a thick shell or for when Crack is cooling: two ◆ at once, one more at the end of each of your turns, and the part takes 20% more from you while it rots. A seal it lands while rotting fails. Zero-Day goes through a Mutex lock or a Lockbox ward. Area hits and burns never call off a tell: when a part winds up a charge, hit that part, and Backfire is the hit for it, because the charge goes off inside its own part. Debris Field goes up before a big strip, and every ◆ you break then shields you. rm -rf makes two cycles of your hits land on every part for half, so press it before Shatter or Overload on a part with others still standing. Chain Reaction is a 40 hit, or 2 ◆ off an armored part, and it wires the part for 3 cycles. Wire the part you are about to break, and when Shatter takes it the blast hits everything else for 30. The `rotation` preset is the single-target build: Crack and Shaped Charge into Shatter, Flood and Overload. The `area` preset spreads the damage over every part instead. It leads with Fork Bomb and Chain Reaction and keeps rm -rf, and it gives up Thermal Runaway and Logic Bomb. It is about as good as `rotation` on an ordinary fight, and clearly better on worms, fragments, an Overrun and the bosses that bring adds.

## Overclocker

**DPS, Burst.** Run it hot until something melts. Solo, the Overclocker lands the biggest single hits in the game. In a crew it deletes the part that matters. It pays for that in Signal and in the damage it takes.

**Edge: Redline.** Momentum stacks to 5 instead of 3, but you take 10% more damage from attacks while you have any stacks.

| Level | Skill | What it does | Cooldown |
|---:|---|---|---:|
| 10 | `hot-loop <part>` | Deals 22 damage and gives you a Momentum stack that lasts 2 cycles. | 2 |
| 12 | `overvolt <part>` | Hits the target twice for 20 damage in one command. Both hits count against a tell, so one Overvolt stops a cast. Costs 6 Signal (Integrity at home). | 4 |
| 14 | `segfault <part>` | Deals 30 damage to the target. Damage is tripled against a part winding up a charge. | 3 |
| 16 | `thermal-throttle <part>` | Spends all your Momentum to deal 20 damage, plus 20 for each stack spent. With 2 or more stacks it goes straight through armor, locks and wards. Requires Momentum. | 3 |
| 18 | `brace` | For 2 cycles, hits on you deal 30% less damage. Whatever hits you takes twice the damage Brace saved. | 5 |
| 20 | `vent` | Spends all your Momentum to clear Corrupted, encryption and Scrambled, and heals you for 5 per stack spent, at least 5. | 5 |
| 22 | `stack-smash <part>` | Deals 30 damage to the target. Hits twice against an Exposed part, and each critical strike hits again, up to 3 more times. | 3 |
| 26 | `fault-injection <part>` | Deals 20 damage to the target. For 3 cycles, every hit you land on it is a critical strike. | 10 |
| 30 | `sudo` | For 2 cycles, your hits go through ◆ and still break one each. Locks and wards don't hold them, a Tripwire you break stays quiet, and a Decoy or the Mimic can't copy you. | 8 |
| 34 | `turbo-boost` | Gives you 2 Momentum stacks that last 3 cycles, for 6 Signal (Integrity at home). Below half your Signal it costs nothing and gives 3. | 5 |
| 38 | `zero-day <part>` | Deals 65 damage to the target, straight through armor, locks and wards. Once per fight. | once |

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

**Playing it.** Build heat, then spend it on one part, and let the board tell you when. A part winding up a charge is Segfault's: three times the hit, and the charge is called off. A cast is Overvolt's: two hits in one command stop it. A charge you can't stop is Brace's, and the part that lands it takes twice what Brace saved you. A Mutex lock, a Lockbox ward, a Tripwire or the Mimic's beat is Sudo's. Exploit a big bare part and Stack Smash it next cycle for two hits, more on crits. Thermal Throttle turns your stacks into one big hit that goes through armor and locks from two stacks, and Turbo Boost is free once you're under half your Signal. Every stack you hold makes the virus hit you harder. Hot Loop is the cheap key between the big ones, a hit that adds a stack. Vent spends your stacks to clear Corrupted, encryption or a scramble and heals you for each. Fault Injection makes every hit on a part crit for 3 cycles, so line up Segfault, Overload and Stack Smash behind it. Sudo also makes your hits go through ◆ for 2 cycles, so it is the strip on a thick shell when Crack is cooling. The `rules` preset swaps Brace and Fault Injection for Sudo and Vent, for Ransomware, the Ghostroot and the bosses built on locks, Tripwires and the Mimic.
