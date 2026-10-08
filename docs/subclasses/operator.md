# Operator subclasses: Herder and Hijacker

Every Operator plays the same four skills up to level 10: Deploy, Hook, Spawn and Botnet. At level 10 you pick a subclass with `subclass herder` or `subclass hijacker`. The first pick works anywhere out of a fight, and switching afterwards is free at home. Each subclass has its own skill line, its own edge and its own talent tree, and each keeps its own bar and talent picks when you switch away and back. Until you pick, you play the Herder.

Both subclasses keep the Operator passive, Extra thread, which gives you one more daemon slot.

| | Herder | Hijacker |
|---|---|---|
| Role | Summoner, damage over time | Control, support |
| Idea | More processes than they can kill. | Their code, your commands. |
| Solo | A swarm of helpers does the work. | The virus turns against itself. |
| In a crew | Constant damage on everything. | Shuts attacks down for everyone. |
| Edge | Last Gasp | Man in the Middle |

## Helpers, in short

A helper is a small process that hits one part every cycle, after your command, until it runs out. If its part breaks, it moves on to the part whose attack lands soonest. You can run at most 6 helpers at once (9 with the Hive talent). A helper hit on an armored part breaks one chit instead of doing damage, so a swarm is also how an Operator strips armor. A Hooked part takes 6 more from every hit, helper hits included.

## Herder

The Herder fills the board with helpers and makes every one of them count. It has no way to stop an attack, so it wins by breaking parts before their attacks come round. Fan-out puts a helper on every part when there are three or more, or reaches a part winding up a tell, and Kill Switch then cashes the helpers in: each part they hit takes it as your hit, so two charges can be called off at once. Fork turns thick armor into more helpers, one for each ◆ they break. Garbage Collect hits every part for 14 and keeps your helpers running a cycle longer, so it goes out when three or more helpers are about to expire. Fragments take three times its hit. Helpers alone never call off a tell. nohup is the cheap key between the big ones: a hit now and a small helper behind it. Load Shed splits the next big hit over your swarm, and Crontab, once a fight, starts a helper that stays until the fight ends. The `swarm` preset swaps Mesh for Garbage Collect, for worms, fragments and an Overrun: it is level with `rotation` on an ordinary fight and far better on a swarm.

**Edge: Last Gasp.** Each helper hits once more as it expires.

### Skills

From level 10 each subclass learns its own line of eleven skills, one at each of levels 10, 12, 14, 16, 18, 20, 22, 26, 30, 34 and 38, so with the four core skills it has fifteen keys to choose from. Your bar holds seven, an eighth from level 22 and a ninth from level 30. Two presets come with each subclass (docs/kits.md): `rotation`, which your bar follows as skills unlock until you change it by hand, and one built for a kind of fight. `loadout use <name>` puts a preset on anywhere out of a fight, at home or on a run, and the keys it brings in start your next fight cooling. `loadout save <name>` keeps the bar you have under a name, and `loadout list` shows them all. A save from before the fifteen-key lines keeps every skill it knew.

| Level | Skill | What it does | Cooldown |
|---:|---|---|---:|
| 10 | `fan-out <part>` | Sends a helper to every part, the target first, each dealing 6 damage every cycle for 3 cycles. | 4 |
| 12 | `nohup <part>` | Deals 20 damage and leaves a helper that deals 5 damage to the target every cycle for 2 cycles. | 2 |
| 14 | `kill-switch` | Your helpers deal all their remaining damage at once, plus their Last Gasp. Each part they hit takes it as a hit from your command, which calls off a charge there. | 3 |
| 16 | `load-shed` | The next attack on you is split evenly over your helpers. Each loses that much of the damage it had left, and you take what they couldn't carry. | 5 |
| 18 | `fork` | For 4 cycles, every ◆ your helpers break starts another helper on that part, up to your helper cap. | 6 |
| 20 | `mesh` | Every helper hits once now. For 3 cycles, every helper hit that deals damage also hits every other part for half. | 8 |
| 22 | `garbage-collect` | Deals 14 damage to every part and three times that to every fragment. Your helpers last 1 cycle longer. | 3 |
| 26 | `malloc` | Your next 3 helpers deal 50% more damage and run 1 cycle longer. | 5 |
| 30 | `crontab <part>` | Starts a helper that deals 20 damage to the target every other cycle until the fight ends, moving on when its part breaks. Once per fight. | once |
| 34 | `oom-kill` | Ends every helper you have running and heals you for 40% of the damage they had left. | 6 |
| 38 | `cron-storm` | Every helper you have running hits twice this cycle. | 6 |

Fan-out and Mesh are the Herder's core: put a helper on every part, then let each hit spill onto the rest. Malloc goes before a Deploy or a Botnet, not after it. OOM Kill is the Herder's only way to get health back, and it costs you the whole swarm.

### Talent tree

Ranked rows take up to 3 points each. Each tier asks you to pick one of two talents.

| Row | Option A | Option B |
|---|---|---|
| Ranks 1 | Thread Pool: Deploy helpers deal 1 more per rank. | Node Pool: Botnet helpers deal 1 more per rank. |
| Tier 1 | Big Process: Deploy helpers deal 14. | Long-running: Deploy helpers last 6 cycles. |
| Ranks 2 | Wide Area: Fan-out helpers deal 1 more per rank. | Dead Man’s Switch: Kill Switch cashes in 5% more per rank. |
| Tier 2 | Hive: you can run 9 helpers at once. | Hydra: when a part breaks, each of your helpers on it moves to the next part and splits in two, up to your cap. |
| Ranks 3 | Load Balancer: you take 3% less damage from attacks per rank. | GC Tuning: Garbage Collect deals 30% more per rank. |
| Tier 3 | Zombie Process: Last Gasp hits twice, so each helper hits two more times as it expires. | Supervisor: Kill Switch makes Deploy ready again. |

Hive and Hydra pull the swarm in different directions. Hive lets you stack more helpers on one part, and Hydra rewards spreading them and finishing parts one at a time. Zombie Process suits long-running helpers that you let expire, and Supervisor suits a Deploy and Kill Switch rhythm.

## Hijacker

The Hijacker takes over the virus's own attacks. It spends helpers as currency: a helper sitting on a part is a foothold in that part's code, and Jam, Hijack and Blackhole each pull one off to do their work. Most of its skills leave the part Jammed, and most of them read a tell. Hijack takes a tell over: a charge lands on another part at full size, a cast compiles for you. Spoofed ACK drains a charge and sends half of it back, Jam makes a charge land plain, Replay plays the charged hit back at its part, Reroute stops a cast with two helpers' arrivals, Cache Poison is an 18 hit with an 8 a cycle bite, and a poisoned part's attacks deal 20% less. Alone the Hijacker poisons its target when Botnet or Deploy is cooling. It also makes a seal fail, and Blackhole swallows what nothing else answers. Barrier turns a helper into a shield when you're low and a big hit is landing. Sniff is the cheap hit that leaves a foothold behind, and Jam now hits too, so it holds a part even with no helper on it. Takeover is the long cooldown: for 2 cycles a part's attacks land on its own side. Echo Cancel stops an Echo and turns the Mimic's or a Decoy's next beat back on the virus. The `rules` preset swaps Barrier and Deploy for Cache Poison and Echo Cancel, for healers, the Echo and the Mimic.

**Jammed.** A part is Jammed from the moment you Jam, Hijack, Blackhole or send it a Spoofed ACK until the attack you held goes off (at least through the next cycle).

**Edge: Man in the Middle.** Jammed parts take 20% more damage from everyone, crewmates included. A helper of yours on a part is a foothold too: your own hits on that part take 20% more.

### Skills

| Level | Skill | What it does | Cooldown |
|---:|---|---|---:|
| 10 | `sniff <part>` | Deals 18 damage and leaves a foothold: a helper that deals 4 damage to the target every cycle for 2 cycles. | 2 |
| 12 | `replay <part>` | Plays the target's own attack back at it, straight through armor, for 25 to 40 damage. A charge it is winding up plays back at its charged size, up to 80. | 5 |
| 14 | `spoofed-ack <part>` | The target's attack waits a cycle, and the part takes half that attack, up to 40. A charge on it drains out, and the part takes half the charge, up to 60. Jams the target until the attack goes off. | 5 |
| 16 | `hijack <part>` | Spends one of your helpers on the target to take over its tell. A charge lands on another part of the virus at full size, through armor. A cast compiles for you instead, and your hits deal 35% more for 4 cycles. With no tell on it, its next hit lands on its own side for half. Jams the target until then. | 6 |
| 18 | `jam <part>` | Deals 15 damage and Jams the target until its next attack. If one of your helpers is on it, Jam spends that helper to push the attack back a cycle, and a charge on it lands plain. | 2 |
| 20 | `barrier <part>` | Pulls one of your helpers off the target and turns it into a shield worth all the damage it had left. | 3 |
| 22 | `cache-poison <part>` | Deals 18 damage and poisons the target for 5 cycles. A poisoned part takes 8 damage every cycle and its attacks deal 20% less. An armor patch it is due hits it for 15 instead, a heal it casts hurts the part it was meant for, and a seal it lands fails and hits it for 30. | 4 |
| 26 | `takeover <part>` | For 2 cycles, the target's attacks land on the other parts of the virus at full size instead of on you. A part on its own hits itself. | 12 |
| 30 | `echo-cancel <part>` | Deals 24 damage to the target. An Echo on it stops repeating your hits, and a Mimic or Decoy plays its next beat back at the virus instead of you. | 4 |
| 34 | `reroute <part>` | Every helper moves to the target and hits it once on arrival. Each arrival counts as a hit from you, so two helpers stop a cast. | 4 |
| 38 | `blackhole <part>` | Spends one of your helpers on the target, and its next attack is dropped and does nothing. Jams the target until then. | 6 |

With a skill that takes a part, you can leave the part out: Jam, Hijack, Spoofed ACK and Blackhole then go at the attack that lands soonest. Hijack and Blackhole resolve just before the virus attacks, so a hijacked attack never reaches you or your crew.

A Hijacker needs a helper on the right part at the right time. Spawn is the cheap way to get one there: it costs one cycle of cooldown and leaves a small helper behind for Jam, Hijack or Blackhole to spend.

### Talent tree

| Row | Option A | Option B |
|---|---|---|
| Ranks 1 | Thread Pool: Deploy helpers deal 1 more per rank. | Kernel Hook: Hooked parts take 1 more per hit per rank. |
| Tier 1 | Long Jam: Jam pushes the attack back 2 cycles. | Loopback: Jam and Blackhole leave the helper running. |
| Ranks 2 | ACK Flood: Spoofed ACK sends back 10% more of the attack per rank. | Cold Storage: Barrier shields 10% more per rank. |
| Tier 2 | Double Agent: Hijack takes the part's next two attacks. | Crosstalk: a hijacked hit lands on every other part, not just one. |
| Ranks 3 | Load Balancer: you take 3% less damage from attacks per rank. | Packet Capture: Replay hits 5 harder per rank. |
| Tier 3 | Full Duplex: Jammed parts take 40% more from everyone instead of 20%. | Kill Chain: breaking a Jammed part makes Jam, Spoofed ACK and Hijack ready again. |

Long Jam holds one attack for longer, and Loopback lets you Jam every other cycle without feeding the part new helpers. Double Agent is the safer pick against one big hitter. Crosstalk pays off against viruses with three or more parts. Full Duplex makes the whole crew hit a Jammed part harder, and Kill Chain keeps the control skills turning over when you break what you Jam.

## Balance

Helper hits are damage over time: they grow half as fast with level as other numbers (+2% a level), and Payload on your gear makes up the rest (a Script rolls it as a primary, *Loaded* as a prefix). A Herder chases Payload and Signal, a Hijacker Payload and Clock Speed.

Measured with the class balance script (`balance.mjs`): blue gear with the stats each subclass chases, a talent point at level 10 and every two levels after, and the default bar (the `rotation` preset at that level). Health lost is the average share of Signal over 20 home intrusions and the four guards at the deepest layer.

| Level | Herder | Hijacker |
|---:|---:|---:|
| 10 | 24% | 37% |
| 18 | 37% | 42% |
| 30 | 41% | 37% |
| 40 | 35% | 22% |

Both subclasses win 22 or more of the 24 fights in these brackets, measured after the kit pass (docs/kits.md, section 10). Enemy hits on your Signal take the late step from level 10 (`CONFIG.runLate`). Both lean crew: alone they lose more than the Breakers and the Phantom, and as a crew's third member they win more of the boss tries and keep the crew higher. Their lines start at 10, with Fan-out for the Herder and Sniff for the Hijacker.
