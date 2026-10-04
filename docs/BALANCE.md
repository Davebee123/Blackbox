# BLACKBOX class balance by level

One scripted planner for every class (it finishes bare or about-to-fire parts, answers attacks it cannot prevent, strips armor with small or spread hits, then finishes), playing each class’s own kit. Each bracket: 20 random home intrusions at your level and the four guards at the deepest layer reached (your level + 3 per layer). Your numbers and theirs both grow 4% per level; misses follow the level gap (5% at your level). Levels 30 and 50 include talents (30: two ranked nodes maxed and the first tier-1 choice; 50: the whole tree). Everyone loads a Tuned protocol in every open slot (4, 5 at 15, 6 at 30) at their level and runs a bracket’s worth of defensive services (none at 1; four v1 at 10; up to eight v3 at 50), except the no-gear column, which has neither. Crits are on for both sides (seeded). Health lost is a share of your own max. Scripted policies, not people.

| Bracket | Spike, no gear | Spike only | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|---:|---:|
| Lv 1 | 12/24 · 1 clean · 83% · 12.2c | 23/24 · 0 clean · 37% · 10.3c | 24/24 · 1 clean · 31% · 8.8c | 24/24 · 5 clean · 23% · 9.5c | 24/24 · 0 clean · 26% · 8.8c | 24/24 · 0 clean · 17% · 7.0c |
| Lv 10 | 5/24 · 0 clean · 96% · 9.8c | 17/24 · 1 clean · 67% · 12.4c | 24/24 · 0 clean · 38% · 9.1c | 24/24 · 4 clean · 25% · 13.1c | 24/24 · 0 clean · 41% · 9.3c | 24/24 · 0 clean · 29% · 7.2c |
| Lv 18 | 0/24 · 0 clean · 100% · 8.1c | 20/24 · 0 clean · 62% · 11.2c | 24/24 · 0 clean · 33% · 7.9c | 24/24 · 2 clean · 24% · 12.8c | 24/24 · 1 clean · 23% · 9.1c | 24/24 · 0 clean · 42% · 8.8c |
| Lv 30 | 1/24 · 0 clean · 100% · 7.7c | 20/24 · 0 clean · 59% · 11.2c | 24/24 · 1 clean · 23% · 7.0c | 24/24 · 11 clean · 10% · 11.6c | 24/24 · 6 clean · 12% · 6.2c | 24/24 · 0 clean · 27% · 7.0c |
| Lv 50 | 0/24 · 0 clean · 100% · 5.5c | 24/24 · 0 clean · 42% · 8.4c | 24/24 · 0 clean · 24% · 5.8c | 24/24 · 7 clean · 14% · 10.8c | 24/24 · 5 clean · 14% · 6.5c | 24/24 · 12 clean · 9% · 4.3c |

Cells: wins · clean kills (nothing got through: no damage, encryption included) · average health lost · average cycles.

## Skill use at level 50

- **Breaker:** shatter 34% · crack 31% · spike 21% · brace 7% · segfault 4% · overload 2%
- **Bastion:** spike 52% · kill-process 16% · retaliate 11% · suspend 10% · firewall 8% · throttle 2% · purge 1% · patch 0%
- **Infiltrator:** inject 55% · backdoor 17% · null-route 12% · opening 12% · detonate 3% · spike 1% · tag 1%
- **Operator:** spike 30% · deploy 23% · botnet 22% · jam 14% · hook 10% · kill-switch 2%

## Unlockable skills (level 50, whole tree)

Each one swapped into the fifth slot. Change vs the first five.

| Class | Skill | Wins | Health lost | Δ | Cycles | Δ |
|---|---|---:|---:|---:|---:|---:|
| Breaker | Shatter | 24/24 | 22% | -1 | 5.6 | -0.2 |
| Breaker | Segfault | 24/24 | 24% | +0 | 5.8 | -0.0 |
| Breaker | Fork Bomb | 24/24 | 21% | -3 | 5.5 | -0.4 |
| Breaker | Thermal Runaway | 24/24 | 21% | -3 | 5.7 | -0.1 |
| Breaker | Sudo | 24/24 | 24% | +1 | 5.8 | +0.0 |
| Breaker | Zero-day | 24/24 | 13% | -10 | 3.8 | -2.1 |
| Bastion | Throttle | 24/24 | 15% | +1 | 11.2 | +0.4 |
| Bastion | Purge | 24/24 | 12% | -2 | 10.5 | -0.3 |
| Bastion | Harden | 24/24 | 14% | +0 | 10.3 | -0.5 |
| Bastion | Reclaim | 24/24 | 9% | -5 | 10.9 | +0.2 |
| Bastion | Quarantine | 24/24 | 17% | +3 | 11.3 | +0.5 |
| Bastion | Failover | 24/24 | 13% | -1 | 10.9 | +0.2 |
| Infiltrator | Detonate | 24/24 | 23% | +9 | 6.3 | -0.2 |
| Infiltrator | Opening | 24/24 | 26% | +12 | 6.4 | -0.1 |
| Infiltrator | Propagate | 24/24 | 26% | +12 | 6.4 | -0.1 |
| Infiltrator | Spoof | 24/24 | 26% | +12 | 6.4 | -0.1 |
| Infiltrator | Rootkit Implant | 24/24 | 26% | +12 | 6.4 | -0.1 |
| Operator | Jam | 24/24 | 9% | +0 | 4.3 | +0.0 |
| Operator | Kill Switch | 24/24 | 9% | -1 | 3.5 | -0.8 |
| Operator | Garbage Collect | 24/24 | 19% | +10 | 4.2 | -0.1 |
| Operator | Fork | 24/24 | 8% | -1 | 3.3 | -1.0 |
| Operator | Reroute | 24/24 | 8% | -1 | 3.3 | -1.0 |
| Operator | Cron Storm | 24/24 | 8% | -1 | 3.3 | -1.0 |

## Every maxed build (level 50, all ranks)

| Class | Best build | Health lost · cycles | Worst build | Health lost · cycles |
|---|---|---:|---|---:|
| Breaker | Sharp Exploit / Piercing / Cascade Failure | 4% · 2.5 | Hair Trigger / Core Dump / Unsafe Mode | 25% · 6.1 |
| Bastion | Deep Packet Inspection / Active Defense / Uptime | 12% · 9.7 | Service Pack / Rate Limit / Preemption | 23% · 13.3 |
| Infiltrator | Fast Hands / Polymorphic / Leaked Creds | 14% · 6.5 | Supercookie / Rotating Proxies / Perfect Trace | 16% · 6.8 |
| Operator | Big Process / Extra Nodes / Parallel Deploy | 9% · 4.3 | Big Process / Hive / Supervisor | 32% · 6.3 |
