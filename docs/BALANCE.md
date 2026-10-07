# BLACKBOX class balance by level

One scripted planner for every class (it finishes bare or about-to-fire parts, answers attacks it cannot prevent, strips armor with small or spread hits, then finishes), playing each class’s own kit. Each bracket: 20 random home intrusions at your level and the four guards at the deepest layer reached (your level + 2 per layer). Your numbers and theirs both grow 4% per level; misses follow the level gap (5% at your level). Talents as a player would have them: a point at level 10 and every 2 levels after, spent in a fixed order (14 points at 50, not the whole tree). Everyone loads a Tuned (blue) protocol in every open slot (4, 5 at 15, 6 at 30) at their level (an implant slot only from 15, where implants start to drop) and runs a bracket’s worth of defensive services (none at 1; four v1 at 10; up to eight v3 at 50), except the no-gear column, which has neither. Crits are on for both sides (seeded). Health lost is a share of your own max. Scripted policies, not people.

| Bracket | Spike, no gear | Spike only | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|---:|---:|
| Lv 1 | 11/24 · 0 clean · 81% · 10.6c | 24/24 · 1 clean · 41% · 9.1c | 24/24 · 2 clean · 27% · 8.0c | 24/24 · 9 clean · 12% · 8.0c | 24/24 · 0 clean · 25% · 7.5c | 24/24 · 4 clean · 18% · 7.0c |
| Lv 10 | 4/24 · 0 clean · 95% · 9.2c | 15/24 · 1 clean · 76% · 12.0c | 24/24 · 5 clean · 19% · 7.9c | 24/24 · 9 clean · 11% · 12.7c | 24/24 · 2 clean · 35% · 8.2c | 24/24 · 5 clean · 18% · 6.6c |
| Lv 18 | 0/24 · 0 clean · 100% · 7.0c | 9/24 · 0 clean · 89% · 11.0c | 24/24 · 1 clean · 38% · 7.8c | 24/24 · 3 clean · 36% · 13.5c | 24/24 · 2 clean · 27% · 7.9c | 24/24 · 1 clean · 45% · 8.7c |
| Lv 30 | 0/24 · 0 clean · 100% · 6.4c | 11/24 · 0 clean · 89% · 11.8c | 24/24 · 0 clean · 40% · 8.4c | 24/24 · 7 clean · 19% · 13.3c | 24/24 · 6 clean · 20% · 7.1c | 24/24 · 5 clean · 27% · 6.2c |
| Lv 50 | 0/24 · 0 clean · 100% · 5.4c | 9/24 · 1 clean · 85% · 10.7c | 23/24 · 1 clean · 48% · 7.9c | 24/24 · 10 clean · 21% · 11.5c | 24/24 · 5 clean · 26% · 7.0c | 24/24 · 8 clean · 12% · 4.9c |

Cells: wins · clean kills (nothing got through: no damage, encryption included) · average health lost · average cycles.

## The hard slice

Every strain open at the level, six grade 2 wilds and six wilds two levels up.

| Bracket | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|
| Lv 1 | 11/12 · 56% · 11.7c | 12/12 · 24% · 10.6c | 12/12 · 53% · 8.9c | 11/12 · 53% · 10.4c |
| Lv 10 | 20/22 · 42% · 9.1c | 21/22 · 29% · 13.2c | 21/22 · 40% · 8.6c | 22/22 · 30% · 7.3c |
| Lv 18 | 23/23 · 35% · 7.9c | 22/23 · 30% · 14.4c | 23/23 · 32% · 8.3c | 23/23 · 38% · 9.1c |
| Lv 30 | 23/23 · 35% · 8.4c | 23/23 · 23% · 14.3c | 23/23 · 24% · 6.9c | 23/23 · 28% · 6.7c |
| Lv 50 | 23/23 · 41% · 7.7c | 23/23 · 20% · 11.4c | 23/23 · 25% · 7.0c | 23/23 · 14% · 5.0c |

Target (a `todo` test in balance.test.mjs until Phase 3): a blue-geared fight at your level costs every class 22–35% of its health, classes within 15 points.

## Skill use at level 50

- **Breaker:** shatter 25% · crack 24% · spike 24% · segfault 21% · overload 2% · brace 2% · flood 2% · exploit 1%
- **Bastion:** spike 60% · rate-limit 21% · suspend 8% · retaliate 6% · patch 3% · purge 3% · firewall 0%
- **Infiltrator:** inject 58% · null-route 12% · opening 12% · backdoor 10% · detonate 7% · spike 2%
- **Operator:** spike 29% · botnet 21% · deploy 21% · jam 15% · kill-switch 7% · spawn 5% · barrier 1%

## Unlockable skills (level 50, whole tree)

Each one swapped into the fifth slot. Change vs the first five.

| Class | Skill | Wins | Health lost | Δ | Cycles | Δ |
|---|---|---:|---:|---:|---:|---:|
| Breaker | Shatter | 24/24 | 45% | -3 | 7.9 | -0.0 |
| Breaker | Segfault | 24/24 | 21% | -27 | 6.6 | -1.3 |
| Breaker | Fork Bomb | 24/24 | 41% | -7 | 6.8 | -1.1 |
| Breaker | Thermal Runaway | 24/24 | 16% | -32 | 6.3 | -1.6 |
| Breaker | Sudo | 24/24 | 21% | -27 | 6.5 | -1.4 |
| Breaker | Zero-day | 24/24 | 14% | -34 | 5.4 | -2.5 |
| Bastion | Throttle | 24/24 | 40% | +19 | 12.1 | +0.6 |
| Bastion | Purge | 24/24 | 26% | +5 | 11.5 | -0.0 |
| Bastion | Harden | 24/24 | 41% | +20 | 12.0 | +0.5 |
| Bastion | Reclaim | 24/24 | 31% | +9 | 11.8 | +0.3 |
| Bastion | Quarantine | 24/24 | 41% | +20 | 12.0 | +0.5 |
| Bastion | Failover | 24/24 | 40% | +18 | 11.8 | +0.3 |
| Infiltrator | Detonate | 24/24 | 41% | +15 | 6.6 | -0.4 |
| Infiltrator | Opening | 24/24 | 40% | +14 | 6.7 | -0.3 |
| Infiltrator | Propagate | 24/24 | 40% | +14 | 6.7 | -0.3 |
| Infiltrator | Spoof | 24/24 | 40% | +14 | 6.7 | -0.3 |
| Infiltrator | Rootkit Implant | 24/24 | 40% | +14 | 6.7 | -0.3 |
| Operator | Jam | 24/24 | 10% | -2 | 4.9 | +0.0 |
| Operator | Kill Switch | 24/24 | 11% | -1 | 4.1 | -0.8 |
| Operator | Garbage Collect | 24/24 | 29% | +16 | 4.5 | -0.3 |
| Operator | Fork | 24/24 | 10% | -2 | 4.0 | -0.9 |
| Operator | Reroute | 24/24 | 10% | -2 | 4.0 | -0.9 |
| Operator | Cron Storm | 24/24 | 10% | -2 | 4.0 | -0.9 |

## Every maxed build (level 50, all ranks)

| Class | Best build | Health lost · cycles | Worst build | Health lost · cycles |
|---|---|---:|---|---:|
| Breaker | Hair Trigger / Piercing / Unsafe Mode | 13% · 4.3 | Hair Trigger / Core Dump / Cascade Failure | 49% · 8.0 |
| Bastion | Service Pack / Backpressure / Preemption | 19% · 11.7 | Deep Packet Inspection / Active Defense / Uptime | 22% · 10.6 |
| Infiltrator | Fast Hands / Polymorphic / Leaked Creds | 26% · 7.0 | Supercookie / Rotating Proxies / Assassinate | 29% · 7.3 |
| Operator | Big Process / Extra Nodes / Parallel Deploy | 12% · 4.9 | Big Process / Hive / Supervisor | 40% · 7.0 |
