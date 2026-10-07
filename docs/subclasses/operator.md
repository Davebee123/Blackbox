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

The Herder fills the board with helpers and makes every one of them count. It has no way to stop an attack, so it wins by breaking parts before their attacks come round.

**Edge: Last Gasp.** Each helper hits once more as it expires.

### Skills

The line unlocks one skill at a time. Your bar holds seven skills, so from level 18 you choose which ones to carry.

| Level | Skill | What it does | Cooldown |
|---:|---|---|---:|
| 12 | `fan-out <part>` | Sends a helper to every part, starting with this one. Each hits its part for 6 every cycle for 3 cycles. | 4 |
| 14 | `mesh` | For 3 cycles, every helper hit that does damage also hits every other part for half as much. Those splash hits break armor chits like any other hit. | 6 |
| 18 | `kill-switch` | Your helpers deal all their remaining damage now, and stop. | 3 |
| 22 | `garbage-collect` | Deals 10 damage to every part, and your helpers last a cycle longer. | 3 |
| 26 | `malloc` | The next 3 helpers you start deal 50% more and run a cycle longer. | 5 |
| 30 | `fork` | For 4 cycles, each helper hit has a 15% chance to start another helper, up to your cap. | 6 |
| 34 | `oom-kill` | The out-of-memory killer takes every helper you have running, and you heal for 40% of the damage they had left. | 6 |
| 38 | `cron-storm` | Every helper hits twice this cycle. | 6 |

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

The Hijacker takes over the virus's own attacks. It spends helpers as currency: a helper sitting on a part is a foothold in that part's code, and Jam, Hijack and Blackhole each pull one off to do their work. Most of its skills leave the part Jammed.

**Jammed.** A part is Jammed from the moment you Jam, Hijack, Blackhole or send it a Spoofed ACK until the attack you held goes off (at least through the next cycle).

**Edge: Man in the Middle.** Jammed parts take 20% more damage from everyone, crewmates included.

### Skills

| Level | Skill | What it does | Cooldown |
|---:|---|---|---:|
| 12 | `jam <part>` | Pull one of your helpers off the part to push its attack back a cycle. The part is Jammed. | 2 |
| 14 | `hijack <part>` | Pull one of your helpers off the part to take over its next attack. If that attack is a hit, it lands on another part of the virus for 60% of its size (up to 60), straight through armor. A part on its own hits itself. An encryption, a scramble, a spawn or a heal does nothing. The part is Jammed until then. | 6 |
| 18 | `replay <part>` | Record the part's attack and play it back at it. The part takes its own attack's size, at least 20 and at most 40, straight through armor. | 5 |
| 22 | `spoofed-ack <part>` | Fake the handshake. The part's attack waits a cycle, and the part takes half of that attack itself (at least 8, at most 40). The part is Jammed until the attack goes off. | 5 |
| 26 | `barrier <part>` | Pull one of your helpers off the part and turn it into a shield worth all the damage it had left. | 3 |
| 30 | `cache-poison <part>` | The part is Poisoned for 5 cycles. An armor patch it is due hits it for 15 instead, and its patch timer starts over. A heal it casts on its own side hurts the part it was meant for by the same amount. | 4 |
| 34 | `reroute <part>` | Every helper moves to this part and hits it once on arrival. | 4 |
| 38 | `blackhole <part>` | Pull one of your helpers off the part. Its next attack goes into a blackhole and does nothing at all, whatever kind of attack it is. The part is Jammed until then. | 6 |

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

Measured with the class balance script (`balance.mjs`): blue gear, a talent point at level 10 and every two levels after, and the default bar (the core four and the first three skills of the line). Health lost is the average share of Signal over 20 home intrusions and the four guards at the deepest layer.

| Level | Herder | Hijacker |
|---:|---:|---:|
| 10 | 33% | 38% |
| 18 | 40% | 30% |
| 30 | 27% | 25% |

Both subclasses win every fight in these brackets. At level 10 the two only differ by their edge, because their lines start at level 12.
