# BLACKBOX class balance by level

One scripted planner for every class (it finishes bare or about-to-fire parts, answers attacks it cannot prevent, strips armor with small or spread hits, then finishes), playing each class’s own kit. Each bracket: 20 random home intrusions at your level and the four guards at the deepest layer reached (your level + 2 per layer). Your numbers and theirs both grow 4% per level; misses follow the level gap (5% at your level). Talents as a player would have them: a point at level 10 and every 2 levels after, spent in a fixed order (14 points at 50, not the whole tree). Everyone loads a Tuned (blue) protocol in every open slot (4, 5 at 15, 6 at 30) at their level (an implant slot only from 15, where implants start to drop) and runs a bracket’s worth of defensive services (none at 1; four v1 at 10; up to eight v3 at 50), except the no-gear column, which has neither. Crits are on for both sides (seeded). Health lost is a share of your own max. Scripted policies, not people.

| Bracket | Spike, no gear | Spike only | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|---:|---:|
| Lv 1 | 11/24 · 0 clean · 81% · 10.6c | 24/24 · 1 clean · 41% · 9.1c | 24/24 · 2 clean · 27% · 8.0c | 24/24 · 9 clean · 12% · 8.0c | 24/24 · 0 clean · 25% · 7.5c | 24/24 · 4 clean · 18% · 7.0c |
| Lv 10 | 4/24 · 1 clean · 91% · 9.0c | 15/24 · 1 clean · 76% · 12.0c | 24/24 · 5 clean · 18% · 7.8c | 24/24 · 9 clean · 11% · 12.5c | 24/24 · 2 clean · 34% · 8.1c | 24/24 · 5 clean · 18% · 6.5c |
| Lv 18 | 1/24 · 0 clean · 98% · 7.5c | 9/24 · 0 clean · 87% · 11.0c | 24/24 · 2 clean · 37% · 7.8c | 24/24 · 3 clean · 35% · 13.3c | 24/24 · 1 clean · 27% · 7.9c | 24/24 · 1 clean · 44% · 8.6c |
| Lv 30 | 4/24 · 0 clean · 92% · 7.2c | 11/24 · 1 clean · 81% · 11.3c | 24/24 · 1 clean · 36% · 8.3c | 24/24 · 8 clean · 17% · 13.0c | 24/24 · 7 clean · 18% · 6.9c | 24/24 · 7 clean · 25% · 5.9c |
| Lv 50 | 4/24 · 0 clean · 91% · 6.8c | 10/24 · 1 clean · 77% · 10.5c | 23/24 · 2 clean · 40% · 7.7c | 24/24 · 10 clean · 17% · 11.2c | 24/24 · 6 clean · 22% · 6.7c | 24/24 · 9 clean · 10% · 4.8c |

Cells: wins · clean kills (nothing got through: no damage, encryption included) · average health lost · average cycles.

## The hard slice

Every strain open at the level, six grade 2 wilds and six wilds two levels up.

| Bracket | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|
| Lv 1 | 12/12 · 50% · 10.6c | 12/12 · 16% · 9.3c | 12/12 · 50% · 8.8c | 12/12 · 52% · 9.8c |
| Lv 10 | 20/22 · 42% · 9.1c | 21/22 · 29% · 13.2c | 21/22 · 40% · 8.6c | 22/22 · 30% · 7.3c |
| Lv 18 | 23/23 · 35% · 7.9c | 22/23 · 30% · 14.4c | 23/23 · 32% · 8.3c | 23/23 · 38% · 9.1c |
| Lv 30 | 23/23 · 35% · 8.4c | 23/23 · 23% · 14.3c | 23/23 · 24% · 6.9c | 23/23 · 28% · 6.7c |
| Lv 50 | 23/23 · 41% · 7.7c | 23/23 · 20% · 11.4c | 23/23 · 25% · 7.0c | 23/23 · 14% · 5.0c |

Target (a `todo` test in balance.test.mjs until Phase 3): a blue-geared fight at your level costs every class 22–35% of its health, classes within 15 points.

## Skill use at level 50

- **Breaker:** shatter 26% · spike 26% · crack 24% · segfault 18% · overload 2% · brace 2% · flood 1% · exploit 1%
- **Bastion:** spike 60% · rate-limit 21% · suspend 7% · retaliate 6% · patch 3% · purge 3%
- **Infiltrator:** inject 56% · opening 13% · null-route 13% · backdoor 10% · detonate 7% · spike 2%
- **Operator:** spike 29% · botnet 22% · deploy 21% · jam 17% · kill-switch 5% · spawn 5% · barrier 1%

## Unlockable skills (level 50, whole tree)

Each one swapped into the fifth slot. Change vs the first five.

| Class | Skill | Wins | Health lost | Δ | Cycles | Δ |
|---|---|---:|---:|---:|---:|---:|
| Breaker | Shatter | 24/24 | 40% | -0 | 7.7 | +0.0 |
| Breaker | Segfault | 24/24 | 18% | -21 | 6.6 | -1.1 |
| Breaker | Fork Bomb | 24/24 | 37% | -3 | 6.8 | -0.9 |
| Breaker | Thermal Runaway | 24/24 | 13% | -26 | 6.3 | -1.4 |
| Breaker | Sudo | 24/24 | 18% | -21 | 6.5 | -1.2 |
| Breaker | Zero-day | 24/24 | 12% | -28 | 5.4 | -2.3 |
| Bastion | Throttle | 24/24 | 36% | +19 | 11.8 | +0.6 |
| Bastion | Purge | 24/24 | 22% | +5 | 11.1 | -0.0 |
| Bastion | Harden | 24/24 | 37% | +20 | 11.8 | +0.7 |
| Bastion | Reclaim | 24/24 | 27% | +10 | 11.5 | +0.3 |
| Bastion | Quarantine | 24/24 | 37% | +20 | 11.9 | +0.7 |
| Bastion | Failover | 24/24 | 35% | +18 | 11.5 | +0.3 |
| Infiltrator | Detonate | 24/24 | 35% | +13 | 6.3 | -0.3 |
| Infiltrator | Opening | 24/24 | 33% | +12 | 6.4 | -0.3 |
| Infiltrator | Propagate | 24/24 | 33% | +12 | 6.4 | -0.3 |
| Infiltrator | Spoof | 24/24 | 33% | +12 | 6.4 | -0.3 |
| Infiltrator | Rootkit Implant | 24/24 | 33% | +12 | 6.4 | -0.3 |
| Operator | Jam | 24/24 | 8% | -2 | 4.8 | +0.0 |
| Operator | Kill Switch | 24/24 | 9% | -1 | 4.0 | -0.8 |
| Operator | Garbage Collect | 24/24 | 25% | +15 | 4.5 | -0.3 |
| Operator | Fork | 24/24 | 9% | -1 | 4.0 | -0.8 |
| Operator | Reroute | 24/24 | 9% | -1 | 4.0 | -0.8 |
| Operator | Cron Storm | 24/24 | 9% | -1 | 4.0 | -0.8 |

## Every maxed build (level 50, all ranks)

| Class | Best build | Health lost · cycles | Worst build | Health lost · cycles |
|---|---|---:|---|---:|
| Breaker | Hair Trigger / Piercing / Unsafe Mode | 12% · 4.3 | Hair Trigger / Core Dump / Cascade Failure | 40% · 7.8 |
| Bastion | Service Pack / Backpressure / Preemption | 15% · 11.5 | Deep Packet Inspection / Active Defense / Uptime | 18% · 10.3 |
| Infiltrator | Fast Hands / Polymorphic / Leaked Creds | 22% · 6.7 | Supercookie / Rotating Proxies / Assassinate | 24% · 6.9 |
| Operator | Big Process / Extra Nodes / Parallel Deploy | 10% · 4.8 | Big Process / Hive / Supervisor | 33% · 6.3 |
