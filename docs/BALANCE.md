# BLACKBOX class balance by level

One scripted planner for every class (it finishes bare or about-to-fire parts, answers attacks it cannot prevent, strips armor with small or spread hits, then finishes), playing each class’s own kit. Each bracket: 20 random home intrusions at your level and the four guards at the deepest layer reached (your level + 3 per layer). Your numbers and theirs both grow 4% per level; misses follow the level gap (5% at your level). Levels 30 and 50 include talents (30: two ranked nodes maxed and the first tier-1 choice; 50: the whole tree). Everyone loads a Tuned protocol in every open slot (4, 5 at 15, 6 at 30) at their level and runs a bracket’s worth of defensive services (none at 1; four v1 at 10; up to eight v3 at 50), except the no-gear column, which has neither. Crits are on for both sides (seeded). Health lost is a share of your own max. Scripted policies, not people.

| Bracket | Spike, no gear | Spike only | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|---:|---:|
| Lv 1 | 24/24 · 2 clean · 26% · 10.4c | 24/24 · 2 clean · 16% · 9.4c | 24/24 · 12 clean · 5% · 6.0c | 24/24 · 15 clean · 6% · 8.7c | 24/24 · 1 clean · 14% · 7.9c | 24/24 · 11 clean · 5% · 5.8c |
| Lv 10 | 18/24 · 0 clean · 52% · 12.0c | 20/24 · 2 clean · 43% · 11.4c | 24/24 · 4 clean · 19% · 7.6c | 24/24 · 7 clean · 11% · 13.8c | 24/24 · 1 clean · 18% · 7.3c | 24/24 · 6 clean · 13% · 6.1c |
| Lv 18 | 15/24 · 0 clean · 66% · 11.3c | 16/24 · 1 clean · 56% · 11.6c | 24/24 · 8 clean · 16% · 7.1c | 24/24 · 10 clean · 10% · 14.5c | 24/24 · 1 clean · 17% · 7.9c | 24/24 · 2 clean · 27% · 8.0c |
| Lv 30 | 12/24 · 0 clean · 72% · 10.2c | 17/24 · 0 clean · 62% · 10.8c | 24/24 · 10 clean · 16% · 6.4c | 24/24 · 23 clean · 2% · 11.9c | 24/24 · 13 clean · 9% · 5.9c | 24/24 · 7 clean · 21% · 5.9c |
| Lv 50 | 13/24 · 0 clean · 73% · 9.3c | 22/24 · 0 clean · 54% · 9.6c | 24/24 · 8 clean · 18% · 6.0c | 24/24 · 19 clean · 3% · 9.8c | 24/24 · 15 clean · 6% · 5.7c | 24/24 · 13 clean · 8% · 4.5c |

Cells: wins · clean kills (nothing got through: no damage, encryption included) · average health lost · average cycles.

## Skill use at level 50

- **Breaker:** shatter 34% · crack 29% · spike 24% · brace 8% · overload 2% · segfault 2%
- **Bastion:** spike 58% · kill-process 20% · suspend 10% · firewall 6% · retaliate 4% · purge 1%
- **Infiltrator:** inject 54% · backdoor 26% · null-route 9% · opening 7% · detonate 4% · spike 1%
- **Operator:** spike 25% · deploy 24% · botnet 22% · kill-switch 21% · hook 4% · jam 3% · barrier 1%

## Unlockable skills (level 50, whole tree)

Each one swapped into the fifth slot. Change vs the first five.

| Class | Skill | Wins | Health lost | Δ | Cycles | Δ |
|---|---|---:|---:|---:|---:|---:|
| Breaker | Shatter | 24/24 | 16% | -2 | 5.8 | -0.2 |
| Breaker | Segfault | 24/24 | 16% | -2 | 5.9 | -0.1 |
| Breaker | Fork Bomb | 24/24 | 28% | +10 | 6.0 | +0.0 |
| Breaker | Thermal Runaway | 24/24 | 17% | -2 | 5.6 | -0.4 |
| Breaker | Sudo | 24/24 | 16% | -2 | 6.0 | +0.0 |
| Breaker | Zero-day | 24/24 | 6% | -13 | 4.4 | -1.5 |
| Bastion | Throttle | 24/24 | 3% | +0 | 9.8 | -0.0 |
| Bastion | Purge | 24/24 | 3% | +0 | 9.8 | +0.0 |
| Bastion | Harden | 24/24 | 4% | +1 | 9.5 | -0.3 |
| Bastion | Reclaim | 24/24 | 2% | -1 | 10.0 | +0.1 |
| Bastion | Quarantine | 24/24 | 3% | +0 | 10.4 | +0.6 |
| Bastion | Failover | 24/24 | 3% | +0 | 9.8 | -0.0 |
| Infiltrator | Detonate | 24/24 | 23% | +17 | 6.0 | +0.3 |
| Infiltrator | Opening | 24/24 | 21% | +14 | 6.0 | +0.3 |
| Infiltrator | Propagate | 24/24 | 22% | +16 | 6.1 | +0.4 |
| Infiltrator | Spoof | 24/24 | 22% | +16 | 6.1 | +0.4 |
| Infiltrator | Rootkit Implant | 24/24 | 22% | +16 | 6.1 | +0.4 |
| Operator | Jam | 24/24 | 9% | +1 | 4.4 | -0.0 |
| Operator | Kill Switch | 24/24 | 8% | -1 | 4.2 | -0.3 |
| Operator | Garbage Collect | 24/24 | 25% | +17 | 4.5 | +0.0 |
| Operator | Fork | 24/24 | 5% | -3 | 3.3 | -1.2 |
| Operator | Reroute | 24/24 | 5% | -3 | 3.3 | -1.2 |
| Operator | Cron Storm | 24/24 | 5% | -3 | 3.3 | -1.2 |

## Every maxed build (level 50, all ranks)

| Class | Best build | Health lost · cycles | Worst build | Health lost · cycles |
|---|---|---:|---|---:|
| Breaker | Sharp Exploit / Piercing / Cascade Failure | 1% · 2.5 | Hair Trigger / Core Dump / Unsafe Mode | 22% · 6.4 |
| Bastion | Deep Packet Inspection / Active Defense / Uptime | 2% · 9.3 | Service Pack / Rate Limit / Uptime | 5% · 9.8 |
| Infiltrator | Fast Hands / Polymorphic / Leaked Creds | 6% · 5.7 | Supercookie / Rotating Proxies / Perfect Trace | 13% · 6.5 |
| Operator | Long-running / Extra Nodes / Parallel Deploy | 8% · 4.3 | Long-running / Hive / Supervisor | 20% · 5.8 |
