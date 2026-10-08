# BLACKBOX class balance by level

One scripted planner for every class (it finishes bare or about-to-fire parts, answers attacks it cannot prevent, strips armor with small or spread hits, then finishes), playing each class’s own kit (from level 10 its default subclass: Demolitionist, Warden, Phantom, Herder; every subclass has its own table below). Each bracket: 20 random home intrusions at your level and the four guards at the deepest layer reached (your level + 2 per layer). Your numbers and theirs both grow 4% per level, and enemy hits on your Signal take the late step from level 10 (`CONFIG.runLate`: ×1.1 at 10, ×1.12 at 18, ×1.35 from 30); misses follow the level gap (5% at your level). Talents as a player would have them: a point at level 10 and every 2 levels after, spent in a fixed order (14 points at 50, not the whole tree). Everyone loads a Tuned (blue) protocol in every open slot (4, 5 at 15, 6 at 30) at their level (an implant slot only from 15, where implants start to drop), from level 10 each carrying a stat its subclass chases, in turn (the subclass’s `chase` list: Damage and Crit for a Demolitionist, Restore and Clock Speed for a Sysop, Payload for the burn and helper classes…) and runs a bracket’s worth of defensive services (none at 1; four v1 at 10; up to eight v3 at 50), except the no-gear column, which has neither. Crits are on for both sides (seeded). Every fight brings its tells (tells.mjs: moves a part announces ahead), and the planner reads and answers them. Health lost is a share of your own max. Scripted policies, not people.

| Bracket | Spike, no gear | Spike only | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|---:|---:|
| Lv 1 | 11/24 · 0 clean · 78% · 10.3c | 23/24 · 1 clean · 42% · 8.3c | 24/24 · 1 clean · 31% · 7.7c | 24/24 · 1 clean · 21% · 7.5c | 24/24 · 2 clean · 21% · 6.8c | 24/24 · 1 clean · 15% · 6.7c |
| Lv 10 | 4/24 · 0 clean · 95% · 7.6c | 8/24 · 1 clean · 85% · 9.4c | 22/24 · 2 clean · 35% · 9.0c | 24/24 · 1 clean · 35% · 13.8c | 24/24 · 1 clean · 29% · 9.3c | 24/24 · 1 clean · 35% · 8.0c |
| Lv 18 | 0/24 · 0 clean · 100% · 6.7c | 3/24 · 0 clean · 96% · 9.7c | 24/24 · 1 clean · 35% · 7.5c | 24/24 · 2 clean · 29% · 15.8c | 24/24 · 2 clean · 32% · 9.8c | 24/24 · 0 clean · 40% · 6.4c |
| Lv 30 | 3/24 · 0 clean · 94% · 5.8c | 4/24 · 0 clean · 89% · 8.2c | 24/24 · 1 clean · 21% · 6.3c | 24/24 · 2 clean · 34% · 15.4c | 24/24 · 3 clean · 28% · 9.1c | 22/24 · 1 clean · 44% · 5.7c |
| Lv 50 | 3/24 · 0 clean · 96% · 4.2c | 4/24 · 1 clean · 88% · 7.5c | 24/24 · 3 clean · 23% · 6.3c | 23/24 · 2 clean · 52% · 14.8c | 24/24 · 4 clean · 24% · 8.5c | 23/24 · 2 clean · 49% · 5.1c |

Cells: wins · clean kills (nothing got through: no damage, encryption included) · average health lost · average cycles.

## The hard slice

Every strain open at the level, six grade 2 wilds and six wilds two levels up.

| Bracket | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|
| Lv 1 | 12/12 · 65% · 10.3c | 12/12 · 45% · 9.4c | 12/12 · 43% · 7.4c | 12/12 · 53% · 9.0c |
| Lv 10 | 18/22 · 60% · 9.0c | 17/22 · 60% · 13.0c | 20/22 · 47% · 8.6c | 21/22 · 47% · 8.9c |
| Lv 18 | 23/23 · 37% · 7.3c | 23/23 · 50% · 16.0c | 23/23 · 46% · 10.8c | 23/23 · 51% · 6.8c |
| Lv 30 | 23/23 · 47% · 6.7c | 20/23 · 57% · 13.2c | 22/23 · 54% · 9.9c | 20/23 · 53% · 5.8c |
| Lv 50 | 22/23 · 39% · 5.7c | 20/23 · 67% · 13.5c | 22/23 · 35% · 8.0c | 22/23 · 53% · 4.8c |

## By subclass

The same fights for each of the eight subclasses (blues, the bracket's services and talents; the bar is the core four and the line's first three). Cells: health lost · wins.

| Bracket | Demolitionist | Overclocker | Warden | Sysop | Payload | Phantom | Herder | Hijacker |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Lv 10 | 35% · 22/24 | 41% · 23/24 | 35% · 24/24 | 41% · 24/24 | 34% · 24/24 | 29% · 24/24 | 35% · 24/24 | 43% · 24/24 |
| Lv 18 | 35% · 24/24 | 40% · 24/24 | 29% · 24/24 | 44% · 22/24 | 44% · 24/24 | 32% · 24/24 | 40% · 24/24 | 34% · 24/24 |
| Lv 30 | 21% · 24/24 | 36% · 23/24 | 34% · 24/24 | 46% · 21/24 | 49% · 24/24 | 28% · 24/24 | 44% · 22/24 | 46% · 23/24 |
| Lv 50 | 23% · 24/24 | 36% · 22/24 | 52% · 23/24 | 49% · 18/24 | 53% · 24/24 | 24% · 24/24 | 49% · 23/24 | 46% · 22/24 |

## Tells: reading them or not

The same fights for each subclass, by the planner that reads tells and by one that ignores them (`TELL.bots.answer = false`). Cells: health lost reading · ignoring (wins reading · ignoring). balance.test.mjs holds the gap at 2.5 points or more on average.

| Bracket | Demolitionist | Overclocker | Warden | Sysop | Payload | Phantom | Herder | Hijacker | Average gap |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Lv 10 | 35% · 45% (22 · 20) | 41% · 48% (23 · 22) | 35% · 39% (24 · 23) | 41% · 46% (24 · 22) | 34% · 44% (24 · 24) | 29% · 35% (24 · 24) | 35% · 41% (24 · 24) | 43% · 48% (24 · 23) | 6.6 |
| Lv 18 | 35% · 37% (24 · 24) | 40% · 42% (24 · 24) | 29% · 35% (24 · 23) | 44% · 49% (22 · 18) | 44% · 44% (24 · 24) | 32% · 33% (24 · 24) | 40% · 40% (24 · 24) | 34% · 41% (24 · 24) | 2.9 |
| Lv 30 | 21% · 21% (24 · 24) | 36% · 39% (23 · 23) | 34% · 45% (24 · 24) | 46% · 50% (21 · 18) | 49% · 51% (24 · 24) | 28% · 30% (24 · 24) | 44% · 43% (22 · 22) | 46% · 45% (23 · 23) | 2.9 |

Target (friction.mjs; a `todo` test in balance.test.mjs): a blue-geared fight at your level costs every subclass 35–45% of its health at levels 10, 18 and 30, subclasses within about 10 points.

## Skill use at level 50

- **Breaker:** shatter 43% · shaped-charge 17% · crack 17% · spike 11% · overload 8% · hold 4%
- **Bastion:** spike 45% · blowback 15% · rate-limit 15% · firewall 9% · retaliate 5% · purge 4% · suspend 3% · bulkhead 3% · sigint 1%
- **Infiltrator:** inject 34% · backdoor 23% · opening 21% · spike 12% · null-route 4% · tag 2% · sigint 1% · backstab 1%
- **Operator:** spike 47% · fan-out 20% · mesh 16% · deploy 15% · botnet 2% · kill-switch 1%

## Unlockable skills (level 50, whole tree)

Each one swapped into the fifth slot. Change vs the first five.

| Class | Skill | Wins | Health lost | Δ | Cycles | Δ |
|---|---|---:|---:|---:|---:|---:|
| Breaker | Fork Bomb | 23/24 | 36% | +14 | 8.5 | +2.2 |
| Breaker | Shaped Charge | 24/24 | 22% | -0 | 6.4 | +0.2 |
| Breaker | Thermal Runaway | 24/24 | 34% | +11 | 8.5 | +2.2 |
| Breaker | Logic Bomb | 23/24 | 38% | +15 | 8.7 | +2.4 |
| Breaker | Chain Reaction | 15/24 | 64% | +42 | 7.9 | +1.6 |
| Breaker | Bit Rot | 24/24 | 38% | +15 | 8.7 | +2.5 |
| Breaker | Zero-day | 24/24 | 31% | +8 | 7.5 | +1.3 |
| Bastion | Bulkhead | 21/24 | 54% | +1 | 16.4 | +1.6 |
| Bastion | Blowback | 21/24 | 52% | -0 | 13.3 | -1.5 |
| Bastion | Throttle | 17/24 | 57% | +5 | 13.6 | -1.2 |
| Bastion | Harden | 20/24 | 51% | -2 | 16.2 | +1.4 |
| Bastion | Quarantine | 19/24 | 53% | +1 | 14.2 | -0.6 |
| Bastion | DMZ | 17/24 | 58% | +5 | 13.4 | -1.4 |
| Bastion | Failover | 18/24 | 58% | +6 | 13.2 | -1.6 |
| Infiltrator | Opening | 23/24 | 31% | +6 | 8.5 | +0.0 |
| Infiltrator | Backstab | 23/24 | 33% | +9 | 8.2 | -0.3 |
| Infiltrator | Spoof | 23/24 | 33% | +9 | 8.4 | -0.1 |
| Infiltrator | Shadow Copy | 23/24 | 29% | +4 | 9.0 | +0.5 |
| Infiltrator | Log Wipe | 23/24 | 34% | +10 | 8.6 | +0.1 |
| Infiltrator | Rootkit Implant | 22/24 | 51% | +27 | 8.1 | -0.4 |
| Operator | Mesh | 24/24 | 35% | -14 | 5.1 | +0.0 |
| Operator | Kill Switch | 24/24 | 36% | -13 | 5.8 | +0.8 |
| Operator | Garbage Collect | 24/24 | 53% | +4 | 6.4 | +1.3 |
| Operator | Malloc | 24/24 | 47% | -2 | 6.3 | +1.3 |
| Operator | Fork | 24/24 | 42% | -7 | 6.2 | +1.1 |
| Operator | OOM Kill | 24/24 | 35% | -13 | 6.2 | +1.1 |
| Operator | Cron Storm | 24/24 | 36% | -13 | 5.8 | +0.8 |

## Every maxed build (level 50, all ranks)

| Class | Best build | Health lost · cycles | Worst build | Health lost · cycles |
|---|---|---:|---|---:|
| Breaker | Cluster Charge / Meltdown / Scorched Earth | 20% · 6.7 | Cluster Charge / Cascade Failure / Scorched Earth | 24% · 6.3 |
| Bastion | Deep Packet Inspection / Counterflow / Uptime | 49% · 14.8 | Tarpit / Write Protect / Kernel Panic | 53% · 14.1 |
| Infiltrator | Fast Hands / Kill Chain / Deep Cover | 24% · 8.5 | Fast Hands / Rotating Proxies / Leaked Creds | 31% · 8.0 |
| Operator | Big Process / Hive / Supervisor | 46% · 5.3 | Long-running / Hive / Zombie Process | 49% · 5.1 |

## Crews in the farm (KESSLER-FARM-00)

You (a Demolitionist, played by the planner) and sim crewmates, everyone in blues with their subclass's stats, 20 seeds: the packs, then each crew boss, up to 4 tries each, everyone rested before a try. Each boss column is its wins over tries; Cleared is the seeds where all three fell; lowest anyone is the lowest share of Signal anyone in the crew reached (a lost try counts as 0); the Sysop column is the share of its cycles spent on a heal. A full crew is a Warden, a Sysop and a Payload with you (two damage dealers). The rows below it each take one thing away: the tank, the healer, everyone's SIGINT (`bots: { interrupt: false }`), or a damage dealer (a second Sysop instead). docs/bosses.md has what each role does.

| Level | Crew | Foreman | Heatsink | Coldwallet | Cleared | Lowest anyone | Fights someone dips under 40% | Sysop cycles healing | Cycles |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 18 | Warden + Sysop (4) | 20/20 | 20/21 | 20/20 | 20/20 | 22% | 84% | 53% | 18.6 |
| 18 | no tank (4) | 13/57 | 20/20 | 20/35 | 13/20 | 8% | 94% | 51% | 12.4 |
| 18 | no healer (4) | 20/21 | 15/48 | 20/20 | 15/20 | 5% | 98% | – | 15.0 |
| 18 | no SIGINT (4) | 0/80 | 20/29 | 20/29 | 0/20 | 2% | 98% | 52% | 13.2 |
| 18 | one damage (4) | 6/71 | 13/54 | 0/80 | 0/20 | 2% | 98% | 52% | 24.3 |
| 18 | Warden + Sysop (3) | 18/47 | 20/27 | 10/71 | 9/20 | 9% | 97% | 54% | 24.6 |
| 18 | Sysop (3) | 20/38 | 20/20 | 20/20 | 20/20 | 17% | 82% | 54% | 18.6 |
| 18 | Warden (3) | 20/20 | 11/59 | 20/20 | 11/20 | 4% | 100% | – | 16.5 |
| 18 | Sysop (2) | 13/55 | 20/20 | 20/28 | 13/20 | 17% | 82% | 52% | 26.4 |
| 30 | Warden + Sysop (4) | 20/20 | 20/21 | 20/20 | 20/20 | 40% | 54% | 65% | 18.6 |
| 30 | no tank (4) | 0/80 | 20/24 | 19/41 | 0/20 | 4% | 97% | 61% | 9.4 |
| 30 | no healer (4) | 20/20 | 1/77 | 20/20 | 1/20 | 9% | 86% | – | 13.7 |
| 30 | no SIGINT (4) | 0/80 | 20/38 | 20/20 | 0/20 | 7% | 100% | 66% | 12.8 |
| 30 | one damage (4) | 3/76 | 1/79 | 0/80 | 0/20 | 1% | 99% | 61% | 24.0 |
| 30 | Warden + Sysop (3) | 19/49 | 17/45 | 20/29 | 16/20 | 9% | 93% | 58% | 25.9 |
| 30 | Sysop (3) | 20/25 | 20/20 | 19/38 | 19/20 | 12% | 94% | 64% | 17.5 |
| 30 | Warden (3) | 20/21 | 10/63 | 20/20 | 10/20 | 15% | 77% | – | 14.8 |
| 30 | Sysop (2) | 19/32 | 20/25 | 15/54 | 15/20 | 15% | 86% | 65% | 24.7 |
