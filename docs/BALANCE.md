# BLACKBOX class balance by level

One scripted planner for every class (it finishes bare or about-to-fire parts, answers attacks it cannot prevent, strips armor with small or spread hits, then finishes), playing each class’s own kit. Each bracket: 20 random home intrusions at your level and the four guards at the deepest layer reached (your level + 2 per layer). Your numbers and theirs both grow 4% per level; misses follow the level gap (5% at your level). Levels 30 and 50 include talents (30: two ranked nodes maxed and the first tier-1 choice; 50: the whole tree). Everyone loads a Tuned protocol in every open slot (4, 5 at 15, 6 at 30) at their level and runs a bracket’s worth of defensive services (none at 1; four v1 at 10; up to eight v3 at 50), except the no-gear column, which has neither. Crits are on for both sides (seeded). Health lost is a share of your own max. Scripted policies, not people.

| Bracket | Spike, no gear | Spike only | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|---:|---:|
| Lv 1 | 14/24 · 0 clean · 75% · 11.2c | 24/24 · 0 clean · 32% · 8.6c | 24/24 · 1 clean · 27% · 7.8c | 24/24 · 6 clean · 17% · 7.6c | 24/24 · 0 clean · 23% · 7.9c | 24/24 · 0 clean · 16% · 6.6c |
| Lv 10 | 5/24 · 0 clean · 97% · 10.1c | 20/24 · 1 clean · 63% · 13.0c | 24/24 · 1 clean · 44% · 9.8c | 24/24 · 5 clean · 20% · 14.1c | 24/24 · 1 clean · 34% · 9.2c | 24/24 · 1 clean · 23% · 7.0c |
| Lv 18 | 0/24 · 0 clean · 100% · 8.4c | 16/24 · 0 clean · 73% · 12.7c | 24/24 · 0 clean · 33% · 7.9c | 24/24 · 1 clean · 30% · 15.0c | 24/24 · 1 clean · 30% · 8.9c | 24/24 · 0 clean · 40% · 7.9c |
| Lv 30 | 0/24 · 0 clean · 100% · 7.8c | 18/24 · 0 clean · 74% · 13.3c | 24/24 · 1 clean · 30% · 7.9c | 24/24 · 8 clean · 15% · 15.2c | 24/24 · 9 clean · 12% · 7.3c | 24/24 · 1 clean · 25% · 7.3c |
| Lv 50 | 0/24 · 0 clean · 100% · 5.6c | 21/24 · 0 clean · 67% · 11.3c | 24/24 · 1 clean · 30% · 7.4c | 23/24 · 1 clean · 27% · 13.7c | 24/24 · 6 clean · 18% · 6.8c | 24/24 · 2 clean · 20% · 5.1c |

Cells: wins · clean kills (nothing got through: no damage, encryption included) · average health lost · average cycles.

## Skill use at level 50

- **Breaker:** spike 29% · shatter 27% · crack 25% · brace 9% · segfault 7% · flood 2% · exploit 1%
- **Bastion:** spike 54% · retaliate 12% · suspend 11% · firewall 9% · rate-limit 9% · throttle 3% · purge 1% · patch 1%
- **Infiltrator:** inject 60% · backdoor 15% · opening 10% · null-route 9% · detonate 6% · tag 1%
- **Operator:** spike 37% · botnet 23% · deploy 20% · kill-switch 7% · jam 6% · hook 4% · barrier 3%

## Unlockable skills (level 50, whole tree)

Each one swapped into the fifth slot. Change vs the first five.

| Class | Skill | Wins | Health lost | Δ | Cycles | Δ |
|---|---|---:|---:|---:|---:|---:|
| Breaker | Shatter | 24/24 | 26% | -3 | 6.8 | -0.6 |
| Breaker | Segfault | 24/24 | 26% | -4 | 6.7 | -0.8 |
| Breaker | Fork Bomb | 24/24 | 31% | +2 | 6.6 | -0.8 |
| Breaker | Thermal Runaway | 24/24 | 22% | -8 | 6.5 | -1.0 |
| Breaker | Sudo | 24/24 | 26% | -4 | 6.7 | -0.8 |
| Breaker | Zero-day | 24/24 | 17% | -13 | 4.0 | -3.5 |
| Bastion | Throttle | 23/24 | 33% | +6 | 13.8 | +0.1 |
| Bastion | Purge | 23/24 | 27% | -0 | 13.0 | -0.8 |
| Bastion | Harden | 22/24 | 27% | +0 | 13.4 | -0.3 |
| Bastion | Reclaim | 23/24 | 24% | -3 | 13.1 | -0.6 |
| Bastion | Quarantine | 24/24 | 31% | +4 | 14.1 | +0.4 |
| Bastion | Failover | 23/24 | 31% | +4 | 13.2 | -0.5 |
| Infiltrator | Detonate | 24/24 | 31% | +13 | 6.9 | +0.1 |
| Infiltrator | Opening | 24/24 | 30% | +12 | 6.9 | +0.1 |
| Infiltrator | Propagate | 24/24 | 30% | +12 | 6.9 | +0.1 |
| Infiltrator | Spoof | 24/24 | 30% | +12 | 6.9 | +0.1 |
| Infiltrator | Rootkit Implant | 24/24 | 30% | +12 | 6.9 | +0.1 |
| Operator | Jam | 24/24 | 18% | -2 | 4.9 | -0.2 |
| Operator | Kill Switch | 24/24 | 18% | -2 | 4.6 | -0.5 |
| Operator | Garbage Collect | 24/24 | 22% | +2 | 4.8 | -0.3 |
| Operator | Fork | 24/24 | 14% | -6 | 4.3 | -0.8 |
| Operator | Reroute | 24/24 | 14% | -6 | 4.3 | -0.8 |
| Operator | Cron Storm | 24/24 | 14% | -6 | 4.3 | -0.8 |

## Every maxed build (level 50, all ranks)

| Class | Best build | Health lost · cycles | Worst build | Health lost · cycles |
|---|---|---:|---|---:|
| Breaker | Sharp Exploit / Piercing / Cascade Failure | 8% · 3.5 | Hair Trigger / Core Dump / Cascade Failure | 30% · 7.4 |
| Bastion | Deep Packet Inspection / Rate Limit / Preemption | 27% · 17.0 | Service Pack / Active Defense / Uptime | 35% · 12.9 |
| Infiltrator | Fast Hands / Polymorphic / Leaked Creds | 18% · 6.8 | Supercookie / Rotating Proxies / Perfect Trace | 21% · 7.0 |
| Operator | Long-running / Extra Nodes / Parallel Deploy | 20% · 5.1 | Big Process / Hive / Supervisor | 39% · 6.8 |
