# BLACKBOX class balance by level

One scripted planner for every class (it finishes bare or about-to-fire parts, answers attacks it cannot prevent, strips armor with small or spread hits, then finishes), playing each class’s own kit. Each bracket: 20 random home intrusions at your level and the four guards at the deepest layer reached (your level + 2 per layer). Your numbers and theirs both grow 4% per level; misses follow the level gap (5% at your level). Talents as a player would have them: a point at level 10 and every 2 levels after, spent in a fixed order (14 points at 50, not the whole tree). Everyone loads a Tuned (blue) protocol in every open slot (4, 5 at 15, 6 at 30) at their level (an implant slot only from 15, where implants start to drop) and runs a bracket’s worth of defensive services (none at 1; four v1 at 10; up to eight v3 at 50), except the no-gear column, which has neither. Crits are on for both sides (seeded). Health lost is a share of your own max. Scripted policies, not people.

| Bracket | Spike, no gear | Spike only | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|---:|---:|
| Lv 1 | 14/24 · 0 clean · 76% · 10.5c | 24/24 · 1 clean · 39% · 9.0c | 24/24 · 1 clean · 28% · 7.9c | 24/24 · 1 clean · 17% · 7.8c | 24/24 · 0 clean · 23% · 7.5c | 24/24 · 1 clean · 19% · 7.0c |
| Lv 10 | 4/24 · 1 clean · 91% · 8.9c | 19/24 · 1 clean · 75% · 12.2c | 24/24 · 3 clean · 19% · 7.7c | 23/24 · 3 clean · 35% · 12.7c | 24/24 · 2 clean · 29% · 8.0c | 24/24 · 3 clean · 19% · 6.3c |
| Lv 18 | 1/24 · 0 clean · 98% · 7.0c | 12/24 · 0 clean · 84% · 11.4c | 24/24 · 1 clean · 37% · 7.7c | 24/24 · 1 clean · 41% · 13.6c | 24/24 · 1 clean · 28% · 7.8c | 24/24 · 0 clean · 44% · 8.3c |
| Lv 30 | 4/24 · 0 clean · 92% · 7.0c | 11/24 · 1 clean · 81% · 11.5c | 24/24 · 1 clean · 35% · 8.3c | 24/24 · 2 clean · 20% · 13.4c | 24/24 · 7 clean · 19% · 6.8c | 24/24 · 6 clean · 25% · 5.8c |
| Lv 50 | 4/24 · 0 clean · 91% · 6.7c | 12/24 · 1 clean · 74% · 10.5c | 24/24 · 1 clean · 39% · 7.7c | 24/24 · 2 clean · 21% · 11.3c | 24/24 · 6 clean · 21% · 6.7c | 24/24 · 8 clean · 11% · 4.8c |

Cells: wins · clean kills (nothing got through: no damage, encryption included) · average health lost · average cycles.

## The hard slice

Every strain open at the level, six grade 2 wilds and six wilds two levels up.

| Bracket | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|
| Lv 1 | 12/12 · 52% · 10.0c | 12/12 · 35% · 9.8c | 12/12 · 46% · 8.5c | 12/12 · 58% · 9.3c |
| Lv 10 | 20/22 · 50% · 9.3c | 20/22 · 30% · 11.9c | 22/22 · 42% · 8.4c | 22/22 · 35% · 7.2c |
| Lv 18 | 23/23 · 43% · 7.9c | 22/23 · 39% · 14.1c | 23/23 · 33% · 7.8c | 23/23 · 43% · 8.7c |
| Lv 30 | 22/23 · 42% · 8.4c | 23/23 · 33% · 14.0c | 23/23 · 28% · 7.0c | 23/23 · 28% · 6.8c |
| Lv 50 | 23/23 · 44% · 7.7c | 22/23 · 38% · 12.0c | 23/23 · 28% · 7.0c | 23/23 · 17% · 4.9c |

Target (a `todo` test in balance.test.mjs until Phase 3): a blue-geared fight at your level costs every class 22–35% of its health, classes within 15 points.

## Skill use at level 50

- **Breaker:** spike 27% · shatter 26% · crack 24% · segfault 18% · overload 2% · flood 2% · brace 2%
- **Bastion:** spike 61% · rate-limit 19% · retaliate 8% · suspend 6% · patch 4% · purge 3%
- **Infiltrator:** inject 56% · opening 14% · null-route 13% · backdoor 9% · detonate 8% · spike 1%
- **Operator:** spike 24% · botnet 22% · deploy 21% · jam 17% · kill-switch 11% · spawn 5% · barrier 1%

## Unlockable skills (level 50, whole tree)

Each one swapped into the fifth slot. Change vs the first five.

| Class | Skill | Wins | Health lost | Δ | Cycles | Δ |
|---|---|---:|---:|---:|---:|---:|
| Breaker | Shatter | 24/24 | 39% | -0 | 7.6 | -0.1 |
| Breaker | Segfault | 24/24 | 18% | -21 | 6.2 | -1.5 |
| Breaker | Fork Bomb | 24/24 | 32% | -7 | 6.4 | -1.3 |
| Breaker | Thermal Runaway | 24/24 | 14% | -25 | 6.3 | -1.4 |
| Breaker | Sudo | 24/24 | 18% | -21 | 6.2 | -1.5 |
| Breaker | Zero-day | 24/24 | 10% | -29 | 5.0 | -2.7 |
| Bastion | Throttle | 24/24 | 47% | +26 | 11.5 | +0.3 |
| Bastion | Purge | 24/24 | 28% | +8 | 10.8 | -0.5 |
| Bastion | Harden | 24/24 | 50% | +30 | 12.6 | +1.3 |
| Bastion | Reclaim | 24/24 | 34% | +14 | 11.3 | +0.0 |
| Bastion | Quarantine | 24/24 | 48% | +27 | 11.7 | +0.5 |
| Bastion | Failover | 24/24 | 46% | +26 | 11.4 | +0.1 |
| Infiltrator | Detonate | 24/24 | 33% | +12 | 6.3 | -0.3 |
| Infiltrator | Opening | 24/24 | 32% | +11 | 6.4 | -0.3 |
| Infiltrator | Propagate | 24/24 | 32% | +11 | 6.4 | -0.3 |
| Infiltrator | Spoof | 24/24 | 32% | +11 | 6.4 | -0.3 |
| Infiltrator | Rootkit Implant | 24/24 | 32% | +11 | 6.4 | -0.3 |
| Operator | Jam | 24/24 | 9% | -2 | 4.8 | +0.0 |
| Operator | Kill Switch | 24/24 | 9% | -2 | 3.9 | -0.9 |
| Operator | Garbage Collect | 24/24 | 24% | +13 | 4.2 | -0.5 |
| Operator | Fork | 24/24 | 9% | -2 | 3.9 | -0.9 |
| Operator | Reroute | 24/24 | 9% | -2 | 3.9 | -0.9 |
| Operator | Cron Storm | 24/24 | 9% | -2 | 3.9 | -0.9 |

## Every maxed build (level 50, all ranks)

| Class | Best build | Health lost · cycles | Worst build | Health lost · cycles |
|---|---|---:|---|---:|
| Breaker | Sharp Exploit / Piercing / Unsafe Mode | 11% · 5.0 | Sharp Exploit / Core Dump / Cascade Failure | 39% · 7.7 |
| Bastion | Service Pack / Backpressure / Preemption | 17% · 11.6 | Deep Packet Inspection / Active Defense / Uptime | 23% · 10.9 |
| Infiltrator | Supercookie / Polymorphic / Leaked Creds | 21% · 6.7 | Supercookie / Rotating Proxies / Assassinate | 24% · 6.9 |
| Operator | Big Process / Extra Nodes / Parallel Deploy | 11% · 4.8 | Long-running / Hive / Supervisor | 33% · 6.1 |
