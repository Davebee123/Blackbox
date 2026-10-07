# BLACKBOX class balance by level

One scripted planner for every class (it finishes bare or about-to-fire parts, answers attacks it cannot prevent, strips armor with small or spread hits, then finishes), playing each class’s own kit (from level 10 its default subclass: Demolitionist, Warden, Phantom, Herder; every subclass has its own table below). Each bracket: 20 random home intrusions at your level and the four guards at the deepest layer reached (your level + 2 per layer). Your numbers and theirs both grow 4% per level, and enemy hits on your Signal take the late step from level 10 (`CONFIG.runLate`: ×1.1 at 10, ×1.12 at 18, ×1.35 from 30); misses follow the level gap (5% at your level). Talents as a player would have them: a point at level 10 and every 2 levels after, spent in a fixed order (14 points at 50, not the whole tree). Everyone loads a Tuned (blue) protocol in every open slot (4, 5 at 15, 6 at 30) at their level (an implant slot only from 15, where implants start to drop), from level 10 each carrying a stat its subclass chases, in turn (the subclass’s `chase` list: Damage and Crit for a Demolitionist, Restore and Clock Speed for a Sysop, Payload for the burn and helper classes…) and runs a bracket’s worth of defensive services (none at 1; four v1 at 10; up to eight v3 at 50), except the no-gear column, which has neither. Crits are on for both sides (seeded). Health lost is a share of your own max. Scripted policies, not people.

| Bracket | Spike, no gear | Spike only | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|---:|---:|
| Lv 1 | 12/24 · 0 clean · 79% · 10.3c | 24/24 · 1 clean · 41% · 8.4c | 24/24 · 1 clean · 32% · 7.8c | 24/24 · 1 clean · 21% · 7.5c | 24/24 · 2 clean · 21% · 6.8c | 24/24 · 1 clean · 22% · 6.9c |
| Lv 10 | 1/24 · 0 clean · 97% · 7.2c | 5/24 · 1 clean · 88% · 8.8c | 23/24 · 1 clean · 47% · 9.3c | 24/24 · 1 clean · 38% · 13.0c | 24/24 · 1 clean · 36% · 8.9c | 24/24 · 1 clean · 37% · 8.1c |
| Lv 18 | 1/24 · 0 clean · 99% · 6.7c | 4/24 · 0 clean · 94% · 9.5c | 24/24 · 1 clean · 40% · 8.3c | 24/24 · 2 clean · 26% · 16.9c | 24/24 · 2 clean · 38% · 9.6c | 24/24 · 0 clean · 40% · 6.5c |
| Lv 30 | 4/24 · 0 clean · 93% · 6.1c | 4/24 · 0 clean · 87% · 7.3c | 24/24 · 1 clean · 19% · 6.6c | 24/24 · 2 clean · 35% · 15.4c | 24/24 · 3 clean · 37% · 8.8c | 24/24 · 1 clean · 41% · 6.0c |
| Lv 50 | 4/24 · 0 clean · 96% · 4.4c | 4/24 · 1 clean · 86% · 7.0c | 24/24 · 3 clean · 19% · 6.4c | 22/24 · 2 clean · 43% · 14.5c | 24/24 · 4 clean · 35% · 8.3c | 23/24 · 2 clean · 43% · 5.0c |

Cells: wins · clean kills (nothing got through: no damage, encryption included) · average health lost · average cycles.

## The hard slice

Every strain open at the level, six grade 2 wilds and six wilds two levels up.

| Bracket | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|
| Lv 1 | 11/12 · 72% · 10.4c | 12/12 · 52% · 9.7c | 11/12 · 49% · 7.5c | 10/12 · 67% · 9.3c |
| Lv 10 | 14/22 · 62% · 7.9c | 14/22 · 67% · 11.6c | 19/22 · 61% · 8.2c | 19/22 · 51% · 7.8c |
| Lv 18 | 23/23 · 47% · 8.3c | 23/23 · 48% · 15.2c | 23/23 · 49% · 9.9c | 22/23 · 44% · 6.4c |
| Lv 30 | 22/23 · 55% · 7.7c | 19/23 · 62% · 12.9c | 19/23 · 58% · 8.3c | 22/23 · 51% · 6.0c |
| Lv 50 | 22/23 · 37% · 6.3c | 19/23 · 70% · 13.7c | 20/23 · 41% · 7.8c | 23/23 · 52% · 4.8c |

## By subclass

The same fights for each of the eight subclasses (blues, the bracket's services and talents; the bar is the core four and the line's first three). Cells: health lost · wins.

| Bracket | Demolitionist | Overclocker | Warden | Sysop | Payload | Phantom | Herder | Hijacker |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Lv 10 | 47% · 23/24 | 48% · 21/24 | 38% · 24/24 | 44% · 23/24 | 41% · 24/24 | 36% · 24/24 | 37% · 24/24 | 46% · 24/24 |
| Lv 18 | 40% · 24/24 | 42% · 24/24 | 26% · 24/24 | 40% · 24/24 | 43% · 24/24 | 38% · 24/24 | 40% · 24/24 | 32% · 24/24 |
| Lv 30 | 19% · 24/24 | 42% · 24/24 | 35% · 24/24 | 37% · 22/24 | 46% · 24/24 | 37% · 24/24 | 41% · 24/24 | 44% · 23/24 |
| Lv 50 | 19% · 24/24 | 49% · 21/24 | 43% · 22/24 | 46% · 18/24 | 52% · 24/24 | 35% · 24/24 | 43% · 23/24 | 45% · 22/24 |

Target (friction.mjs; a `todo` test in balance.test.mjs): a blue-geared fight at your level costs every subclass 35–45% of its health at levels 10, 18 and 30, subclasses within about 10 points.

## Skill use at level 50

- **Breaker:** shatter 40% · shaped-charge 16% · crack 14% · spike 11% · overload 10% · hold 8% · flood 1%
- **Bastion:** spike 49% · rate-limit 15% · blowback 12% · firewall 10% · purge 5% · retaliate 4% · suspend 3% · bulkhead 2%
- **Infiltrator:** inject 34% · opening 25% · backdoor 24% · spike 16% · backstab 1% · tag 1% · null-route 1%
- **Operator:** spike 45% · fan-out 20% · mesh 16% · deploy 15% · botnet 4%

## Unlockable skills (level 50, whole tree)

Each one swapped into the fifth slot. Change vs the first five.

| Class | Skill | Wins | Health lost | Δ | Cycles | Δ |
|---|---|---:|---:|---:|---:|---:|
| Breaker | Fork Bomb | 22/24 | 45% | +26 | 9.3 | +2.9 |
| Breaker | Shaped Charge | 24/24 | 21% | +2 | 6.3 | -0.0 |
| Breaker | Thermal Runaway | 24/24 | 41% | +22 | 9.2 | +2.8 |
| Breaker | Logic Bomb | 20/24 | 46% | +27 | 9.0 | +2.7 |
| Breaker | Chain Reaction | 15/24 | 67% | +48 | 7.6 | +1.2 |
| Breaker | Bit Rot | 21/24 | 47% | +29 | 9.0 | +2.6 |
| Breaker | Zero-day | 23/24 | 34% | +15 | 8.1 | +1.7 |
| Bastion | Bulkhead | 21/24 | 50% | +7 | 16.2 | +1.7 |
| Bastion | Blowback | 21/24 | 45% | +2 | 13.0 | -1.5 |
| Bastion | Throttle | 21/24 | 53% | +9 | 15.3 | +0.8 |
| Bastion | Harden | 22/24 | 46% | +3 | 17.2 | +2.7 |
| Bastion | Quarantine | 21/24 | 51% | +8 | 16.4 | +1.9 |
| Bastion | DMZ | 20/24 | 53% | +10 | 14.8 | +0.3 |
| Bastion | Failover | 21/24 | 48% | +5 | 13.9 | -0.6 |
| Infiltrator | Opening | 24/24 | 36% | +1 | 8.3 | +0.0 |
| Infiltrator | Backstab | 24/24 | 32% | -3 | 8.2 | -0.0 |
| Infiltrator | Spoof | 24/24 | 32% | -3 | 8.2 | -0.0 |
| Infiltrator | Shadow Copy | 24/24 | 27% | -8 | 8.5 | +0.3 |
| Infiltrator | Log Wipe | 24/24 | 35% | -0 | 8.5 | +0.3 |
| Infiltrator | Rootkit Implant | 19/24 | 60% | +25 | 8.0 | -0.3 |
| Operator | Mesh | 24/24 | 34% | -8 | 4.9 | -0.1 |
| Operator | Kill Switch | 24/24 | 40% | -3 | 6.2 | +1.2 |
| Operator | Garbage Collect | 23/24 | 53% | +10 | 6.3 | +1.3 |
| Operator | Malloc | 24/24 | 49% | +7 | 6.0 | +1.0 |
| Operator | Fork | 24/24 | 40% | -3 | 5.7 | +0.7 |
| Operator | OOM Kill | 24/24 | 40% | -3 | 6.7 | +1.7 |
| Operator | Cron Storm | 24/24 | 40% | -3 | 6.2 | +1.2 |

## Every maxed build (level 50, all ranks)

| Class | Best build | Health lost · cycles | Worst build | Health lost · cycles |
|---|---|---:|---|---:|
| Breaker | Cluster Charge / Cascade Failure / Total Overkill | 19% · 6.4 | Exposed Wiring / Meltdown / Scorched Earth | 25% · 7.0 |
| Bastion | Deep Packet Inspection / Counterflow / Uptime | 40% · 14.5 | Tarpit / Write Protect / Kernel Panic | 43% · 14.1 |
| Infiltrator | Blind Spot / Rotating Proxies / Deep Cover | 29% · 8.2 | Blind Spot / Kill Chain / Leaked Creds | 37% · 8.5 |
| Operator | Big Process / Hydra / Zombie Process | 40% · 4.3 | Big Process / Hive / Supervisor | 46% · 5.4 |

## Crews in the farm (KESSLER-FARM-00)

You (a Demolitionist, played by the planner) and sim crewmates, everyone in blues with their subclass's stats, 20 seeds: the packs, then each boss, up to 4 tries each, everyone rested before a try. Boss wins are over tries; your Signal lost is in the wins; lowest anyone is the lowest share of Signal anyone in the crew reached (a lost try counts as 0); the Sysop column is the share of its cycles spent on a heal.

| Level | Crew | Boss wins | Your Signal lost | Lowest anyone | Fights someone dips under 40% | Sysop cycles healing | Cycles |
|---|---|---:|---:|---:|---:|---:|---:|
| 18 | none (3) | 52/125 | 75% | 8% | 94% | – | 6.5 |
| 18 | Sysop (3) | 60/61 | 48% | 37% | 61% | 39% | 10.5 |
| 18 | Warden (3) | 60/63 | 67% | 30% | 68% | – | 9.9 |
| 18 | Warden + Sysop (3) | 60/64 | 28% | 47% | 34% | 38% | 15.0 |
| 18 | none (4) | 56/89 | 79% | 12% | 94% | – | 6.4 |
| 18 | Sysop (4) | 60/60 | 34% | 54% | 13% | 42% | 7.1 |
| 18 | Warden (4) | 60/62 | 51% | 46% | 18% | – | 6.9 |
| 18 | Warden + Sysop (4) | 60/60 | 23% | 61% | 12% | 34% | 9.0 |
| 30 | none (3) | 51/144 | 80% | 6% | 99% | – | 6.2 |
| 30 | Sysop (3) | 60/61 | 22% | 48% | 31% | 50% | 10.1 |
| 30 | Warden (3) | 57/79 | 60% | 27% | 73% | – | 8.3 |
| 30 | Warden + Sysop (3) | 60/64 | 4% | 58% | 25% | 40% | 14.7 |
| 30 | none (4) | 57/83 | 80% | 10% | 95% | – | 6.2 |
| 30 | Sysop (4) | 60/60 | 32% | 54% | 28% | 40% | 6.8 |
| 30 | Warden (4) | 60/60 | 52% | 46% | 50% | – | 6.8 |
| 30 | Warden + Sysop (4) | 60/60 | 8% | 68% | 7% | 40% | 8.5 |
