# Bastion subclasses: Warden and Sysop

At level 10 a Bastion picks one of two subclasses with `subclass warden` or `subclass sysop`. The first pick works anywhere outside a fight, and switching back and forth is free at home. Each subclass has its own skill line, its own edge and its own talent tree, and each keeps its own bar and tree, so switching back finds them as you left them. Until you pick, you play the Warden.

Both subclasses keep the Bastion core from levels 1 to 7: Rate Limit, Firewall, Purge and Retaliate. The passive, Hardened, stays too: the first damage hit on you each fight deals 25% less. Your bar holds seven skills, so from level 22 you choose which of your eleven or twelve skills to equip.

| Subclass | Role | The idea | Alone | In a crew |
|---|---|---|---|---|
| **Warden** | Tank, Retaliation | Every hit comes to you, and goes back. | Outlasts anything and hits back. | The tank: draws fire and turns it around. |
| **Sysop** | Healer, Support | Keep everyone up, and the logs clean. | Heals through long fights. | The healer: keeps the crew standing and undoes what the virus does. |

## Warden

**Edge: Grudge.** The part that last hit you takes 20% more from your hits. Grudge was the Bastion's edge before subclasses, and it is the Warden's now.

The Warden wants to be hit. Bulkhead and Firewall pull every attack onto you, Bulkhead and DMZ take the sting out of them, and Blowback sends the whole lot back. In a crew, every attack the Warden takes is one that doesn't land on everyone else.

### Warden skills

| Level | Skill | What it does | Cooldown |
|---:|---|---|---:|
| 12 | `suspend [part]` | Pushes its attack back 2 cycles. With no part named, it takes the attack landing soonest. | 4 |
| 14 | `bulkhead` | This cycle and next, attacks on you deal half. With a crew, every attack comes at you for those 2 cycles. | 6 |
| 18 | `blowback <part>` | Hits the part for the full size of every attack that has hit you since your last Blowback, up to 70. What your shields and cuts took off still counts. On armor it breaks 2 chits. | 3 |
| 22 | `throttle [part]` | Its attacks deal half for 3 cycles. | 4 |
| 26 | `harden` | Gives you an armor chit: the next attack on you does nothing, however big. | 6 |
| 30 | `quarantine [part]` | Pushes its attack back 3 cycles, and while it waits it takes 25% more damage. | 6 |
| 34 | `dmz` | This cycle and next, attacks deal 30% less to you and to everyone in your crew. | 6 |
| 38 | `failover` | Hits every part for a quarter of your missing Signal, at least 20. | 5 |

Blowback counts an attack at the size it had when it reached you: Throttled attacks count at half, but your Firewall, Bulkhead, DMZ and Hardened don't make it smaller. An attack your armor chit stops completely doesn't count. Blowback can't be used until something has hit you, and using it starts the count over.

### Warden talents

Ranked rows (up to 3 ranks each; the numbers are per rank):

| Row | First node | Second node |
|---|---|---|
| First | Reverse Shell: Retaliate hits +5. | Deep Buffer: Blowback deals +10%. |
| Second | Hardened Kernel: you take 3% less damage from attacks. | Stateful Firewall: Firewall absorbs +5. |
| Third | Vendetta: Grudge adds +5% more. | Token Bucket: Rate Limit deals +4. |

Choices (pick one of two in each tier):

| Tier | Option a | Option b |
|---|---|---|
| 1 (3 points above) | **Tarpit**: Suspend also Throttles the part until its attack lands. | **Deep Packet Inspection**: Firewall absorbs 30. |
| 2 (8 points above) | **Counterflow**: Retaliate also sends back everything Blowback has stored, as a second hit, and empties it. | **Write Protect**: Harden gives two chits, but it costs 10% of your max Signal. |
| 3 (14 points above) | **Uptime**: once per fight, a hit that would drop you to 0 leaves you at 1. | **Kernel Panic**: while you are under a third of your Signal, your hits deal 30% more. |

## Sysop

**Edge: Overprovision.** Healing past full turns into a shield, up to 20. It works on the heals from your skills (Patch up front and as it ticks, Multicast, Heartbeat, Scrub, Rollback, Rebalance and Reclaim), and the shield lands on whoever you healed. It never builds a shield past 20: a player who already has 20 or more shield keeps what they have.

The Sysop heals, and fixes what a virus does to a crewmate. In a crew, the heals that take a name (`patch nyx`, `heartbeat nyx`, `scrub nyx`, `rollback nyx`, `hot-standby nyx`) land on that crewmate, and a crewmate's name for you is `you`. With no name they land on you, so a Sysop alone heals itself.

### Sysop skills

| Level | Skill | What it does | Cooldown |
|---:|---|---|---:|
| 12 | `patch [name]` | Heals 8 now, then 5 a cycle for 3 cycles. In a crew, `patch nyx` heals nyx instead. | 4 |
| 14 | `multicast` | Heals you and everyone in your crew for 10. | 4 |
| 18 | `heartbeat [name]` | Heals 5 a cycle for 4 cycles, starting now. A new Heartbeat on the same player replaces the old one. | 4 |
| 22 | `scrub [name]` | Clears encryption and Scrambled, and heals 8. | 5 |
| 26 | `reclaim <part>` | Deals 35 damage, and you heal half of what it does. On armor it breaks 2 chits. | 3 |
| 30 | `rollback [name]` | Undoes the last attack that hurt that player: it heals back everything the attack did, or deletes the fragment it spawned. | 6 |
| 34 | `hot-standby [name]` | Puts that player on standby: the next attack that would drop them to 0 leaves them at 1. | once a fight |
| 38 | `rebalance` | Moves everyone in the fight to the same share of their max Signal (the crew's average), then heals everyone 6. Alone, it is just the heal. | 6 |

Encryption, scrambles and fragments only ever land on the player who leads the fight, so `scrub you` and `rollback you` are how a Sysop crewmate gets them off you. Rebalance takes Signal from whoever has the most, which is the point: it keeps the tank standing on the crew's spare health.

### Sysop talents

Ranked rows (up to 3 ranks each; the numbers are per rank):

| Row | First node | Second node |
|---|---|---|
| First | Patch Notes: Patch heals +3. | Fan-out: Multicast heals +3. |
| Second | Reserve Pool: Overprovision holds 5 more shield. | Redundancy: +4 max Signal on runs. |
| Third | Tick Rate: Heartbeat heals +1 a cycle. | Hardened Kernel: you take 3% less damage from attacks. |

Choices (pick one of two in each tier):

| Tier | Option a | Option b |
|---|---|---|
| 1 (3 points above) | **Service Pack**: Patch heals 20 up front. | **Ping Flood**: Multicast also hits every part for what it heals each player. |
| 2 (8 points above) | **Critical Path**: your heals on anyone under a third of their Signal heal 50% more. | **Redistribute**: Reclaim also heals the lowest crewmate as much as it heals you. Alone, it heals you twice as much. |
| 3 (14 points above) | **Overcommit**: Overprovision holds twice as much shield. | **Loopback**: every heal you cast also heals you for a third of it. |

## Crewmates

Simulated crewmates (`crew sim warden`, `crew sim sysop`) are played by the same planner as the balance scripts, and they take the seven skills their role wants rather than the first seven they learned. A Warden crewmate keeps Rate Limit, Firewall and Retaliate, then the first four it knows of Bulkhead, Blowback, Harden, DMZ, Suspend and Purge. It pulls the fire with Bulkhead or Firewall whenever attacks are about to land on everyone or a crewmate is hurt, armors up with Harden when it is drawing a big hit, and spends Blowback once it has stored enough to matter. A Sysop crewmate keeps Rate Limit and Firewall, then the first five it knows of Patch, Multicast, Hot Standby, Heartbeat, Scrub and Rollback, and Retaliate if a slot is left. It puts whoever is about to drop on standby, Multicasts when two players are hurt, Patches or Rolls Back the lowest, keeps a Heartbeat on whoever is drawing fire, and Scrubs your encryption once it stacks up.
