# BLACKBOX class balance by level

One scripted planner for every class (it finishes bare or about-to-fire parts, answers attacks it cannot prevent, strips armor with small or spread hits, then finishes), playing each class’s own kit (from level 10 its default subclass: Demolitionist, Warden, Phantom, Herder; every subclass has its own table below). Each bracket: 20 random home intrusions at your level and the four guards at the deepest layer reached (your level + 2 per layer). Your numbers and theirs both grow 4% per level, and enemy hits on your Signal take the late step from level 10 (`CONFIG.runLate`: ×0.95 at 10, ×1 at 18, ×1.2 from 30); misses follow the level gap (5% at your level). Talents as a player would have them: a point at level 10 and every 2 levels after, spent in a fixed order (14 points at 50, not the whole tree). Everyone loads a Tuned (blue) protocol in every open slot (4, 5 at 15, 6 at 30) at their level (an implant slot only from 15, where implants start to drop), from level 10 each carrying a stat its subclass chases, in turn (the subclass’s `chase` list: Damage and Crit for a Demolitionist, Restore and Clock Speed for a Sysop, Payload for the burn and helper classes…) except the no-gear column, which has none. Every blue carries a minor rule affix (gear.mjs RULES) and one numeric affix, the one its subclass chases. Crits are on for both sides (seeded). Every fight brings its tells (tells.mjs: moves a part announces ahead), and the planner reads and answers them. Health lost is a share of your own max. Scripted policies, not people.

| Bracket | Spike, no gear | Spike only | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|---:|---:|
| Lv 1 | 19/24 · 0 clean · 74% · 10.3c | 24/24 · 1 clean · 39% · 8.0c | 24/24 · 1 clean · 31% · 7.3c | 24/24 · 1 clean · 19% · 7.0c | 24/24 · 1 clean · 23% · 6.9c | 24/24 · 1 clean · 17% · 6.7c |
| Lv 10 | 2/24 · 1 clean · 95% · 7.0c | 8/24 · 1 clean · 83% · 9.3c | 22/24 · 1 clean · 41% · 9.4c | 23/24 · 1 clean · 36% · 11.3c | 24/24 · 1 clean · 32% · 9.3c | 24/24 · 2 clean · 30% · 8.3c |
| Lv 18 | 0/24 · 0 clean · 100% · 6.0c | 4/24 · 0 clean · 94% · 9.7c | 24/24 · 1 clean · 28% · 7.6c | 24/24 · 1 clean · 29% · 14.2c | 23/24 · 1 clean · 41% · 10.8c | 24/24 · 1 clean · 44% · 7.2c |
| Lv 30 | 3/24 · 0 clean · 94% · 5.6c | 4/24 · 0 clean · 87% · 8.5c | 23/24 · 1 clean · 27% · 6.8c | 23/24 · 1 clean · 30% · 12.4c | 24/24 · 2 clean · 28% · 9.6c | 22/24 · 1 clean · 40% · 5.3c |
| Lv 50 | 3/24 · 0 clean · 95% · 4.3c | 6/24 · 0 clean · 85% · 9.6c | 24/24 · 2 clean · 25% · 7.0c | 24/24 · 1 clean · 26% · 12.8c | 24/24 · 2 clean · 21% · 9.7c | 22/24 · 2 clean · 36% · 4.8c |

Cells: wins · clean kills (nothing got through: no damage, encryption included) · average health lost · average cycles.

## The hard slice

Every strain open at the level, six grade 2 wilds and six wilds two levels up.

| Bracket | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|
| Lv 1 | 10/12 · 69% · 9.7c | 12/12 · 49% · 8.8c | 10/12 · 50% · 7.5c | 10/12 · 70% · 8.6c |
| Lv 10 | 19/22 · 48% · 8.9c | 22/22 · 45% · 11.3c | 20/22 · 55% · 8.6c | 21/22 · 54% · 8.5c |
| Lv 18 | 23/23 · 28% · 7.0c | 23/23 · 33% · 13.2c | 22/23 · 41% · 9.6c | 20/23 · 48% · 6.3c |
| Lv 30 | 23/23 · 32% · 6.3c | 23/23 · 35% · 12.0c | 22/23 · 36% · 8.8c | 23/23 · 46% · 5.7c |
| Lv 50 | 23/23 · 23% · 6.4c | 21/23 · 31% · 11.2c | 22/23 · 25% · 9.1c | 23/23 · 39% · 4.7c |

## By subclass

The same fights for each of the eight subclasses (blues and the bracket's talents; the bar is the core four and the line's first three). Cells: health lost · wins.

| Bracket | Demolitionist | Overclocker | Warden | Sysop | Payload | Phantom | Herder | Hijacker |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Lv 10 | 41% · 22/24 | 39% · 22/24 | 36% · 23/24 | 45% · 22/24 | 30% · 24/24 | 32% · 24/24 | 30% · 24/24 | 33% · 24/24 |
| Lv 18 | 28% · 24/24 | 31% · 23/24 | 29% · 24/24 | 45% · 23/24 | 42% · 23/24 | 41% · 23/24 | 44% · 24/24 | 29% · 24/24 |
| Lv 30 | 27% · 23/24 | 37% · 23/24 | 30% · 23/24 | 36% · 21/24 | 41% · 24/24 | 28% · 24/24 | 40% · 22/24 | 43% · 24/24 |
| Lv 50 | 25% · 24/24 | 35% · 23/24 | 26% · 24/24 | 34% · 23/24 | 17% · 24/24 | 21% · 24/24 | 36% · 22/24 | 11% · 24/24 |

## Tells: reading them or not

The same fights for each subclass, by the planner that reads tells and by one that ignores them (`TELL.bots.answer = false`). Cells: health lost reading · ignoring (wins reading · ignoring). balance.test.mjs holds the gap at 12 points or more on average from Lv 10.

| Bracket | Demolitionist | Overclocker | Warden | Sysop | Payload | Phantom | Herder | Hijacker | Average gap |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Lv 10 | 41% · 54% (22 · 21) | 39% · 45% (22 · 22) | 36% · 48% (23 · 21) | 45% · 54% (22 · 21) | 30% · 68% (24 · 16) | 32% · 46% (24 · 23) | 30% · 56% (24 · 20) | 33% · 60% (24 · 22) | 18.1 |
| Lv 18 | 28% · 34% (24 · 22) | 31% · 46% (23 · 21) | 29% · 37% (24 · 23) | 45% · 62% (23 · 17) | 42% · 54% (23 · 22) | 41% · 63% (23 · 16) | 44% · 52% (24 · 21) | 29% · 41% (24 · 22) | 12.8 |
| Lv 30 | 27% · 31% (23 · 22) | 37% · 44% (23 · 20) | 30% · 41% (23 · 23) | 36% · 44% (21 · 21) | 41% · 47% (24 · 21) | 28% · 41% (24 · 22) | 40% · 42% (22 · 23) | 43% · 54% (24 · 22) | 7.6 |

Target (friction.mjs; a `todo` test in balance.test.mjs): a blue-geared fight at your level costs every subclass 35–45% of its health at levels 10, 18 and 30, subclasses within about 10 points.

## Skill use at level 50

- **Breaker:** shatter 33% · crack 21% · thermal-runaway 13% · shaped-charge 10% · overload 9% · sigint 7% · spike 2% · fork-bomb 2% · chain-reaction 2% · flood 1%
- **Bastion:** purge 22% · spike 18% · rate-limit 18% · blowback 12% · retaliate 10% · quarantine 9% · firewall 6% · suspend 3% · bulkhead 1% · throttle 0%
- **Infiltrator:** inject 27% · backdoor 24% · opening 14% · spike 12% · sigint 8% · shadow-copy 8% · log-wipe 5% · null-route 1% · backstab 1%
- **Operator:** spike 35% · fan-out 18% · fork 17% · mesh 9% · garbage-collect 6% · sigint 6% · deploy 3% · kill-switch 3% · botnet 3%

## Unlockable skills (level 50, whole tree)

Each one swapped into the fifth slot. Change vs the first five.

| Class | Skill | Wins | Health lost | Δ | Cycles | Δ |
|---|---|---:|---:|---:|---:|---:|
| Breaker | Fork Bomb | 23/24 | 31% | +6 | 9.3 | +2.2 |
| Breaker | Shaped Charge | 23/24 | 23% | -2 | 7.3 | +0.3 |
| Breaker | Thermal Runaway | 24/24 | 28% | +4 | 8.8 | +1.8 |
| Breaker | Logic Bomb | 23/24 | 31% | +6 | 9.4 | +2.4 |
| Breaker | Chain Reaction | 23/24 | 31% | +6 | 9.3 | +2.3 |
| Breaker | Bit Rot | 23/24 | 30% | +6 | 9.3 | +2.2 |
| Breaker | Zero-day | 24/24 | 22% | -2 | 8.2 | +1.2 |
| Bastion | Bulkhead | 24/24 | 31% | +5 | 12.7 | -0.2 |
| Bastion | Blowback | 24/24 | 35% | +9 | 12.4 | -0.4 |
| Bastion | Throttle | 24/24 | 34% | +8 | 13.5 | +0.7 |
| Bastion | Harden | 24/24 | 32% | +6 | 12.8 | +0.0 |
| Bastion | Quarantine | 24/24 | 28% | +1 | 12.8 | -0.1 |
| Bastion | DMZ | 24/24 | 29% | +3 | 12.4 | -0.4 |
| Bastion | Failover | 24/24 | 33% | +6 | 12.3 | -0.5 |
| Infiltrator | Opening | 24/24 | 27% | +6 | 8.9 | -0.8 |
| Infiltrator | Backstab | 24/24 | 29% | +8 | 8.7 | -1.0 |
| Infiltrator | Spoof | 24/24 | 29% | +8 | 8.8 | -1.0 |
| Infiltrator | Shadow Copy | 24/24 | 27% | +6 | 9.0 | -0.7 |
| Infiltrator | Log Wipe | 24/24 | 29% | +8 | 8.8 | -0.9 |
| Infiltrator | Rootkit Implant | 24/24 | 30% | +9 | 8.7 | -1.0 |
| Operator | Mesh | 24/24 | 23% | -12 | 5.4 | +0.6 |
| Operator | Kill Switch | 24/24 | 30% | -6 | 6.6 | +1.8 |
| Operator | Garbage Collect | 24/24 | 38% | +3 | 7.6 | +2.8 |
| Operator | Malloc | 24/24 | 34% | -1 | 7.3 | +2.5 |
| Operator | Fork | 24/24 | 29% | -7 | 6.3 | +1.5 |
| Operator | OOM Kill | 24/24 | 30% | -6 | 6.6 | +1.8 |
| Operator | Cron Storm | 24/24 | 30% | -6 | 6.6 | +1.8 |

## Every maxed build (level 50, all ranks)

| Class | Best build | Health lost · cycles | Worst build | Health lost · cycles |
|---|---|---:|---|---:|
| Breaker | Cluster Charge / Meltdown / Total Overkill | 21% · 6.5 | Exposed Wiring / Cascade Failure / Total Overkill | 26% · 7.7 |
| Bastion | Deep Packet Inspection / Counterflow / Uptime | 26% · 12.8 | Tarpit / Write Protect / Kernel Panic | 26% · 12.8 |
| Infiltrator | Blind Spot / Kill Chain / Deep Cover | 20% · 9.3 | Fast Hands / Rotating Proxies / Leaked Creds | 28% · 9.0 |
| Operator | Long-running / Hive / Zombie Process | 34% · 4.8 | Big Process / Hydra / Supervisor | 38% · 5.0 |

## Crews in the farm (KESSLER-FARM-00)

You (a Demolitionist, played by the planner) and sim crewmates, everyone in blues with their subclass's stats, 20 seeds: the packs, then each crew boss, up to 4 tries each, everyone rested before a try. Each boss column is its wins over tries; Cleared is the seeds where all three fell; lowest anyone is the lowest share of Signal anyone in the crew reached (a lost try counts as 0); the Sysop column is the share of its cycles spent on a heal. A full crew is a Warden, a Sysop and a Payload with you (two damage dealers). The rows below it each take one thing away: the tank, the healer, everyone's SIGINT (`bots: { interrupt: false }`), or a damage dealer (a second Sysop instead). docs/bosses.md has what each role does.

| Level | Crew | Foreman | Heatsink | Coldwallet | Cleared | Lowest anyone | Fights someone dips under 40% | Sysop cycles healing | Cycles |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 18 | Warden + Sysop (4) | 20/20 | 20/20 | 20/21 | 20/20 | 22% | 93% | 51% | 18.6 |
| 18 | no tank (4) | 7/60 | 20/21 | 20/20 | 7/20 | 10% | 93% | 49% | 10.6 |
| 18 | no healer (4) | 20/24 | 9/67 | 20/21 | 9/20 | 4% | 96% | – | 15.4 |
| 18 | no SIGINT (4) | 0/80 | 20/24 | 20/23 | 0/20 | 4% | 99% | 53% | 13.2 |
| 18 | one damage (4) | 20/20 | 15/52 | 5/69 | 3/20 | 7% | 91% | 50% | 23.4 |
| 18 | Warden + Sysop (3) | 20/20 | 20/25 | 9/64 | 9/20 | 14% | 86% | 54% | 24.2 |
| 18 | Sysop (3) | 20/28 | 20/21 | 20/22 | 20/20 | 25% | 89% | 53% | 17.2 |
| 18 | Warden (3) | 20/20 | 13/55 | 20/20 | 13/20 | 6% | 100% | – | 16.7 |
| 18 | Sysop (2) | 20/21 | 20/23 | 19/37 | 19/20 | 28% | 64% | 48% | 24.1 |
| 30 | Warden + Sysop (4) | 20/20 | 20/21 | 20/21 | 20/20 | 35% | 55% | 62% | 18.8 |
| 30 | no tank (4) | 0/80 | 20/23 | 20/24 | 0/20 | 4% | 99% | 59% | 9.4 |
| 30 | no healer (4) | 20/20 | 13/57 | 20/20 | 13/20 | 6% | 98% | – | 13.9 |
| 30 | no SIGINT (4) | 0/80 | 20/30 | 20/22 | 0/20 | 7% | 98% | 67% | 12.9 |
| 30 | one damage (4) | 20/25 | 6/72 | 0/80 | 0/20 | 6% | 90% | 62% | 23.3 |
| 30 | Warden + Sysop (3) | 20/21 | 17/47 | 5/69 | 4/20 | 9% | 89% | 62% | 24.4 |
| 30 | Sysop (3) | 20/21 | 20/23 | 20/26 | 20/20 | 13% | 99% | 63% | 17.9 |
| 30 | Warden (3) | 20/20 | 5/73 | 20/20 | 5/20 | 11% | 88% | – | 15.2 |
| 30 | Sysop (2) | 19/33 | 20/24 | 3/77 | 3/20 | 9% | 92% | 65% | 22.8 |
