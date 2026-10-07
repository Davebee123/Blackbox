# BLACKBOX class balance by level

One scripted planner for every class (it finishes bare or about-to-fire parts, answers attacks it cannot prevent, strips armor with small or spread hits, then finishes), playing each class’s own kit (from level 10 its default subclass: Demolitionist, Warden, Phantom, Herder; every subclass has its own table below). Each bracket: 20 random home intrusions at your level and the four guards at the deepest layer reached (your level + 2 per layer). Your numbers and theirs both grow 4% per level, and enemy hits on your Signal take the late step from level 10 (`CONFIG.runLate`: ×1.1 at 10, ×1.12 at 18, ×1.35 from 30); misses follow the level gap (5% at your level). Talents as a player would have them: a point at level 10 and every 2 levels after, spent in a fixed order (14 points at 50, not the whole tree). Everyone loads a Tuned (blue) protocol in every open slot (4, 5 at 15, 6 at 30) at their level (an implant slot only from 15, where implants start to drop) and runs a bracket’s worth of defensive services (none at 1; four v1 at 10; up to eight v3 at 50), except the no-gear column, which has neither. Crits are on for both sides (seeded). Health lost is a share of your own max. Scripted policies, not people.

| Bracket | Spike, no gear | Spike only | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|---:|---:|
| Lv 1 | 12/24 · 0 clean · 79% · 10.3c | 24/24 · 1 clean · 42% · 9.0c | 24/24 · 1 clean · 30% · 7.9c | 24/24 · 1 clean · 20% · 7.8c | 24/24 · 1 clean · 20% · 6.8c | 24/24 · 1 clean · 20% · 7.0c |
| Lv 10 | 1/24 · 0 clean · 97% · 7.2c | 10/24 · 1 clean · 84% · 9.9c | 24/24 · 1 clean · 32% · 8.7c | 23/24 · 3 clean · 32% · 12.5c | 24/24 · 3 clean · 29% · 8.6c | 24/24 · 1 clean · 36% · 7.8c |
| Lv 18 | 1/24 · 0 clean · 99% · 6.7c | 4/24 · 0 clean · 92% · 9.7c | 24/24 · 1 clean · 38% · 7.9c | 24/24 · 1 clean · 36% · 15.5c | 24/24 · 2 clean · 38% · 9.3c | 24/24 · 0 clean · 45% · 6.5c |
| Lv 30 | 4/24 · 0 clean · 93% · 6.1c | 4/24 · 1 clean · 86% · 8.7c | 24/24 · 1 clean · 39% · 7.7c | 24/24 · 1 clean · 37% · 16.8c | 24/24 · 2 clean · 43% · 10.1c | 24/24 · 2 clean · 36% · 5.9c |
| Lv 50 | 4/24 · 0 clean · 96% · 4.4c | 4/24 · 1 clean · 87% · 7.9c | 24/24 · 2 clean · 16% · 6.4c | 23/24 · 2 clean · 40% · 14.0c | 23/24 · 3 clean · 39% · 8.5c | 24/24 · 3 clean · 41% · 5.0c |

Cells: wins · clean kills (nothing got through: no damage, encryption included) · average health lost · average cycles.

## The hard slice

Every strain open at the level, six grade 2 wilds and six wilds two levels up.

| Bracket | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|
| Lv 1 | 11/12 · 66% · 10.1c | 12/12 · 50% · 10.0c | 12/12 · 46% · 7.7c | 11/12 · 70% · 9.3c |
| Lv 10 | 18/22 · 60% · 9.3c | 15/22 · 61% · 12.0c | 22/22 · 50% · 8.5c | 18/22 · 48% · 7.4c |
| Lv 18 | 22/23 · 44% · 7.7c | 18/23 · 57% · 13.7c | 22/23 · 51% · 9.8c | 22/23 · 50% · 6.3c |
| Lv 30 | 22/23 · 49% · 7.7c | 19/23 · 62% · 14.5c | 23/23 · 55% · 10.6c | 21/23 · 48% · 6.3c |
| Lv 50 | 20/23 · 48% · 6.3c | 21/23 · 62% · 13.2c | 21/23 · 46% · 8.1c | 23/23 · 49% · 4.8c |

## By subclass

The same fights for each of the eight subclasses (blues, the bracket's services and talents; the bar is the core four and the line's first three). Cells: health lost · wins.

| Bracket | Demolitionist | Overclocker | Warden | Sysop | Payload | Phantom | Herder | Hijacker |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Lv 10 | 32% · 24/24 | 47% · 24/24 | 32% · 23/24 | 33% · 23/24 | 32% · 24/24 | 29% · 24/24 | 36% · 24/24 | 41% · 24/24 |
| Lv 18 | 38% · 24/24 | 45% · 24/24 | 36% · 24/24 | 27% · 24/24 | 43% · 24/24 | 38% · 24/24 | 45% · 24/24 | 34% · 24/24 |
| Lv 30 | 39% · 24/24 | 48% · 22/24 | 37% · 24/24 | 29% · 23/24 | 39% · 24/24 | 43% · 24/24 | 36% · 24/24 | 35% · 24/24 |
| Lv 50 | 16% · 24/24 | 37% · 23/24 | 40% · 23/24 | 28% · 23/24 | 44% · 24/24 | 39% · 23/24 | 41% · 24/24 | 38% · 24/24 |

Target (friction.mjs; a `todo` test in balance.test.mjs): a blue-geared fight at your level costs every subclass 35–45% of its health at levels 10, 18 and 30, subclasses within about 10 points.

## Skill use at level 50

- **Breaker:** shatter 39% · shaped-charge 16% · crack 14% · overload 12% · spike 10% · hold 10%
- **Bastion:** spike 46% · rate-limit 16% · blowback 13% · firewall 9% · purge 5% · suspend 5% · retaliate 5% · bulkhead 2%
- **Infiltrator:** inject 37% · backdoor 24% · opening 23% · spike 14% · null-route 2%
- **Operator:** spike 43% · fan-out 20% · mesh 17% · deploy 16% · botnet 4%

## Unlockable skills (level 50, whole tree)

Each one swapped into the fifth slot. Change vs the first five.

| Class | Skill | Wins | Health lost | Δ | Cycles | Δ |
|---|---|---:|---:|---:|---:|---:|
| Breaker | Fork Bomb | 24/24 | 40% | +23 | 9.2 | +2.7 |
| Breaker | Shaped Charge | 24/24 | 16% | -0 | 5.8 | -0.6 |
| Breaker | Thermal Runaway | 24/24 | 38% | +22 | 8.8 | +2.4 |
| Breaker | Logic Bomb | 22/24 | 38% | +22 | 8.7 | +2.3 |
| Breaker | Chain Reaction | 22/24 | 57% | +40 | 8.3 | +1.8 |
| Breaker | Bit Rot | 24/24 | 40% | +24 | 9.2 | +2.7 |
| Breaker | Zero-day | 24/24 | 24% | +8 | 7.8 | +1.4 |
| Bastion | Bulkhead | 23/24 | 46% | +6 | 15.0 | +1.0 |
| Bastion | Blowback | 23/24 | 43% | +4 | 12.9 | -1.1 |
| Bastion | Throttle | 23/24 | 47% | +7 | 14.4 | +0.5 |
| Bastion | Harden | 22/24 | 42% | +2 | 15.3 | +1.3 |
| Bastion | Quarantine | 22/24 | 45% | +5 | 14.7 | +0.7 |
| Bastion | DMZ | 23/24 | 47% | +7 | 14.4 | +0.5 |
| Bastion | Failover | 24/24 | 46% | +6 | 13.5 | -0.5 |
| Infiltrator | Opening | 23/24 | 39% | +1 | 8.5 | +0.0 |
| Infiltrator | Backstab | 23/24 | 32% | -7 | 8.0 | -0.5 |
| Infiltrator | Spoof | 23/24 | 32% | -7 | 8.1 | -0.4 |
| Infiltrator | Shadow Copy | 23/24 | 32% | -7 | 8.7 | +0.2 |
| Infiltrator | Log Wipe | 23/24 | 36% | -3 | 8.5 | -0.0 |
| Infiltrator | Rootkit Implant | 19/24 | 63% | +24 | 8.5 | +0.0 |
| Operator | Mesh | 24/24 | 35% | -5 | 4.8 | -0.1 |
| Operator | Kill Switch | 24/24 | 42% | +1 | 6.5 | +1.5 |
| Operator | Garbage Collect | 24/24 | 45% | +4 | 6.1 | +1.1 |
| Operator | Malloc | 24/24 | 46% | +6 | 6.0 | +1.1 |
| Operator | Fork | 24/24 | 39% | -1 | 5.9 | +1.0 |
| Operator | OOM Kill | 23/24 | 41% | +0 | 6.6 | +1.6 |
| Operator | Cron Storm | 24/24 | 41% | +1 | 6.5 | +1.5 |

## Every maxed build (level 50, all ranks)

| Class | Best build | Health lost · cycles | Worst build | Health lost · cycles |
|---|---|---:|---|---:|
| Breaker | Cluster Charge / Cascade Failure / Scorched Earth | 16% · 6.4 | Exposed Wiring / Meltdown / Total Overkill | 19% · 7.1 |
| Bastion | Deep Packet Inspection / Counterflow / Uptime | 37% · 14.0 | Tarpit / Write Protect / Kernel Panic | 40% · 13.6 |
| Infiltrator | Blind Spot / Rotating Proxies / Deep Cover | 28% · 7.9 | Blind Spot / Kill Chain / Leaked Creds | 39% · 8.5 |
| Operator | Long-running / Hydra / Zombie Process | 33% · 4.6 | Big Process / Hive / Supervisor | 44% · 5.3 |
