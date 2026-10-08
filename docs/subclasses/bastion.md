# Bastion subclasses: Warden and Sysop

At level 10 a Bastion picks one of two subclasses with `subclass warden` or `subclass sysop`. The first pick works anywhere outside a fight, and switching back and forth is free at home. Each subclass has its own skill line, its own edge and its own talent tree, and each keeps its own bar and tree, so switching back finds them as you left them. Until you pick, you play the Warden.

Both subclasses keep the Bastion core from levels 1 to 7: Rate Limit, Firewall, Purge and Retaliate. The passive, Hardened, stays too: the first damage hit on you each fight deals 25% less. From level 10 each subclass learns its own line of eleven skills, one at each of levels 10, 12, 14, 16, 18, 20, 22, 26, 30, 34 and 38, so with the four core skills it has fifteen keys to choose from. Your bar holds seven, an eighth from level 22 and a ninth from level 30. Two presets come with each subclass (docs/kits.md): `rotation`, which your bar follows as skills unlock until you change it by hand, and one built for a kind of fight. `loadout use <name>` puts a preset on anywhere out of a fight, at home or on a run, and the keys it brings in start your next fight cooling. `loadout save <name>` keeps the bar you have under a name, and `loadout list` shows them all. A save from before the fifteen-key lines keeps every skill it knew.

| Subclass | Role | The idea | Alone | In a crew |
|---|---|---|---|---|
| **Warden** | Tank, Retaliation | Every hit comes to you, and goes back. | Outlasts anything and hits back. | The tank: draws fire and turns it around. |
| **Sysop** | Healer, Support | Keep everyone up, and the logs clean. | Slow alone: small hits, though it keeps itself standing. | The healer: keeps the crew standing and undoes what the virus does. |

## Warden

**Edge: Grudge.** The part that last hit you takes 20% more from your hits. Grudge was the Bastion's edge before subclasses, and it is the Warden's now.

The Warden wants to be hit, and it has a key for each kind of tell. Suspend drains a charge before it lands. Quarantine stops a cast, which keeps SIGINT for the next one. Throttle halves a part gone loud for 6 cycles, or a charge Suspend can't reach. Bulkhead takes three quarters off a charge that gets through. DMZ closes the zone on a Replicate, which then spawns nothing, and fragment bites do nothing inside it. Purge is its burn and its cleanse: it clears encryption and Corrupted. Bulkhead and Firewall pull every attack onto you in a crew, and Blowback sends the whole lot back. Reject is the cheap hit between them, and it shields you a little. Circuit Breaker caps every hit on you for 3 cycles, which is how a Warden walks through a burst or a boss's big phase. Honeypot takes the edge off the next hit, and a Scramble or the Mimic's beat goes after the honeypot instead of you. The `swarm` preset swaps Harden and Bulkhead for DMZ and Throttle, for worms, fragments and loud parts.

### Warden skills

| Level | Skill | What it does | Cooldown |
|---:|---|---|---:|
| 10 | `reject <part>` | 28 damage. On the part that last hit you, you also shield 10. | 2 |
| 12 | `suspend [part]` | SIGSTOP: push its attack back 2 cycles. A charge on that attack drains out: it lands plain. With no part, the attack landing soonest. | 4 |
| 14 | `bulkhead` | This cycle and next, attacks on you deal half, and a charged one a quarter. With a crew, every attack comes at you for those 2 cycles. | 6 |
| 16 | `blowback <part>` | Hits it for the full size of every attack that has hit you since your last Blowback, shields and cuts included, up to 70, and Retaliate is lit for the next cycle. On armor it breaks 2 ◆. | 3 |
| 18 | `harden` | Gain a ◆: the next attack on you does nothing, however big. | 6 |
| 20 | `quarantine [part]` | Push its attack back 3 cycles; while it waits, it takes +25% damage. A cast it's compiling is stopped. | 6 |
| 22 | `throttle [part]` | 20 damage, and its attacks deal half for 3 cycles. On a part gone loud (a Tripwire set off, Double Extortion, a Bricker's rage), for 6, and the loud wears off. | 4 |
| 26 | `circuit-breaker` | For 3 cycles, no attack can take more than a tenth of your max Signal from you. What it would have dealt past that goes into Blowback. | 12 |
| 30 | `dmz` | This cycle and next, attacks deal 30% less to you and everyone in your crew, fragment bites and hits under a tenth of your max do nothing, and a Replicate spawns nothing. | 6 |
| 34 | `honeypot` | For 2 cycles, the next hit on you deals 15 less, and a Scramble, a Possession or the Mimic's beat lands on the honeypot instead of you. | 6 |
| 38 | `failover` | Hit every part for a quarter of your missing health (at least 20). | 5 |

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

The Sysop heals, and fixes what a virus does to a crewmate. Heartbeat goes up before a charge lands, because a charged hit deals 25% less while it runs. Scrub cleans encryption, Scrambled and Corrupted, and heals more when it cleaned something. Rollback undoes a cast that just compiled, alone. Multicast hurts every fragment as much as it heals. It is built for a crew: Multicast heals everyone at once. Checksum and Reclaim are its hits, and both heal as they land (Checksum heals the lowest crewmate). Maintenance Window is its cooldown: for 3 cycles its heals heal half again, and its hits heal it. Revoke stops a part's heals, patches and Self-Update, and a heal the virus casts on its own side lands on you instead. Alone, like a healer levelling solo, it kills slowly. A fight takes it about twice the cycles a damage dealer needs, but its hits heal it, so it rarely ends a fight low. The `healers` preset swaps Patch for Revoke, for Leech, Patchwork and PATCH TUESDAY.

**Restore.** Heals you cast keep only half of the 4% a level everything else gets (+2% a level, `CONFIG.healLevel`); Restore on your gear makes up the rest. Every Shell rolls it as a primary, and *of Restoration* adds it as a suffix (4–10% from item level 1 to 20, about 19% at 30). A Sysop in blues that chases it (and Clock Speed for more casts) has about 48% at level 18 and 65% at 30, and its Multicast heals 32 and 42 there; in whites (about 11–13%, from the Shell) 24 and 29. Reclaim's lifesteal and Rollback give back damage, so they grow with it already and take only Restore. In a crew, the heals that take a name (`patch nyx`, `heartbeat nyx`, `scrub nyx`, `rollback nyx`, `hot-standby nyx`) land on that crewmate, and a crewmate's name for you is `you`. With no name they land on you, so a Sysop alone heals itself.

### Sysop skills

| Level | Skill | What it does | Cooldown |
|---:|---|---|---:|
| 10 | `checksum <part>` | 24 damage, and you heal a quarter of what it does. In a crew, the lowest crewmate heals instead. | 2 |
| 12 | `reclaim <part>` | 35 damage, and you heal half of what it does. On armor it breaks 2 ◆. | 3 |
| 14 | `patch [name]` | Heal 4 now, then 2 a cycle for 3 cycles. In a crew, patch nyx heals nyx instead. | 4 |
| 16 | `heartbeat [name]` | Heals you 4 a cycle for 4 cycles, starting now, and a charged hit on you while it runs deals 25% less. In a crew, heartbeat nyx does it for nyx. A new Heartbeat replaces the old one. | 4 |
| 18 | `scrub [name]` | Clears encryption (a Full Disk burst too), Scrambled and Corrupted from you, and heals you 8, or 12 if it cleared something. In a crew, scrub nyx does it for nyx. | 5 |
| 20 | `multicast` | Heals you and everyone in your crew for 16. Every part takes 6, and every fragment takes 16. | 4 |
| 22 | `rollback [name]` | Undoes the last attack that hurt you (heals back all it did, or deletes the fragment it spawned) and clears Corrupted. Alone, it also undoes a cast that just compiled. In a crew, rollback nyx does it for nyx. | 6 |
| 26 | `maintenance-window` | For 3 cycles, your heals heal 50% more, and your hits heal you for a quarter of what they deal. | 12 |
| 30 | `revoke <part>` | 22 damage. For 4 cycles a heal, patch or Self-Update it casts fails, and a heal it would have cast on its own side heals you instead. | 4 |
| 34 | `hot-standby [name]` | Once per fight, the next attack that would drop you to 0 leaves you at 1 instead. In a crew, hot-standby nyx covers nyx. | once |
| 38 | `rebalance` | Evens out the Signal of everyone in the fight (each moves to the crew's average share of their max), then heals everyone 6. Alone, it heals you 12. | 6 |

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
| 1 (3 points above) | **Service Pack**: Patch heals 10 up front. | **Ping Flood**: Multicast also hits every part for what it heals each player. |
| 2 (8 points above) | **Critical Path**: your heals on anyone under a third of their Signal heal 50% more. | **Redistribute**: Reclaim also heals the lowest crewmate as much as it heals you. Alone, it heals you twice as much. |
| 3 (14 points above) | **Overcommit**: Overprovision holds twice as much shield. | **Loopback**: every heal you cast also heals you for a third of it. |

## Crewmates

Simulated crewmates (`crew sim warden`, `crew sim sysop`) are played by the same planner as the balance scripts, and they take the seven skills their role wants rather than the first seven they learned. A Warden crewmate keeps Rate Limit, Firewall and Retaliate, then the first four it knows of Bulkhead, Blowback, Harden, DMZ, Suspend and Purge. It pulls the fire with Bulkhead or Firewall whenever attacks are about to land on everyone or a crewmate is hurt, armors up with Harden when it is drawing a big hit, and spends Blowback once it has stored enough to matter. A Sysop crewmate keeps Rate Limit and Firewall, then the first five it knows of Patch, Multicast, Hot Standby, Heartbeat, Scrub and Rollback, and Retaliate if a slot is left. It heals ahead of the damage (`HEAL` in bastion.mjs): it puts anyone under 30% on standby, Multicasts when two players are under 85%, Patches or Rolls Back the lowest under 80%, keeps a Heartbeat on whoever is drawing fire and on the lowest under 95%, and Scrubs your encryption once it stacks up. A Sysop alone (a bot, or the balance scripts) keeps Patch for under 30%, and it presses Checksum and Reclaim as its hits.

The farm's bosses are built around a healer: from level 12 their damage rises, to ×1.6 at 18. With a Sysop a crew of four wins every boss try (simulated, everyone in blues), and someone in it still dips to about half; without a healer or a tank it wins about two tries in three.
