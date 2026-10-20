# BLACKBOX class balance by level

One scripted planner for every class (it finishes bare or about-to-fire parts, answers attacks it cannot prevent, strips armor with small or spread hits, then finishes), playing each class’s own kit (from level 10 its default subclass: Demolitionist, Warden, Phantom, Herder; every subclass has its own table below). Each bracket: 20 random home intrusions at your level and the four guards at the deepest layer reached (your level + 2 per layer). Your numbers and theirs both grow 4% per level, and enemy hits on your Signal take the late step from level 10 (`CONFIG.runLate`: ×0.95 at 10, ×1 at 18, ×1.32 at 30, back to ×1.2 at 50) and their Integrity a smaller one (`CONFIG.runLateHp`: ×0.96 at 18, ×1.05 at 30, ×1 at 50), set against gear on one smooth item-level curve (gear.mjs `ITEM_CURVE`); misses follow the level gap (5% at your level). Talents as a player would have them: a point at level 10 and every 2 levels after, spent in a fixed order (14 points at 50, not the whole tree). Everyone loads a Tuned (blue) protocol in every open slot (4, 5 at 15, 6 at 30) at their level (an implant slot only from 15, where implants start to drop), from level 10 each carrying a stat its subclass chases, in turn (the subclass’s `chase` list: Damage and Crit for a Demolitionist, Restore and Clock Speed for a Sysop, Payload for the burn and helper classes…) except the no-gear column, which has none. Every blue carries a minor rule affix (gear.mjs RULES) and one numeric affix, the one its subclass chases. Crits are on for both sides (seeded). Every fight brings its tells (tells.mjs: moves a part announces ahead), and the planner reads and answers them. Health lost is a share of your own max. Scripted policies, not people.

| Bracket | Spike, no gear | Spike only | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|---:|---:|
| Lv 1 | 20/24 · 0 clean · 63% · 11.0c | 24/24 · 0 clean · 29% · 8.8c | 24/24 · 0 clean · 21% · 8.1c | 24/24 · 1 clean · 16% · 8.0c | 24/24 · 1 clean · 14% · 6.1c | 24/24 · 2 clean · 13% · 6.7c |
| Lv 10 | 3/24 · 1 clean · 93% · 7.5c | 6/24 · 0 clean · 89% · 8.9c | 23/24 · 0 clean · 35% · 7.5c | 24/24 · 1 clean · 29% · 10.7c | 21/24 · 2 clean · 45% · 9.0c | 24/24 · 6 clean · 16% · 6.6c |
| Lv 18 | 0/24 · 0 clean · 100% · 6.0c | 4/24 · 0 clean · 97% · 8.8c | 24/24 · 3 clean · 22% · 5.5c | 24/24 · 2 clean · 21% · 12.8c | 24/24 · 10 clean · 21% · 8.2c | 24/24 · 2 clean · 20% · 7.4c |
| Lv 30 | 3/24 · 0 clean · 95% · 5.6c | 6/24 · 0 clean · 87% · 8.5c | 24/24 · 2 clean · 29% · 6.3c | 24/24 · 2 clean · 21% · 13.5c | 24/24 · 12 clean · 12% · 6.3c | 24/24 · 2 clean · 16% · 5.5c |
| Lv 50 | 2/24 · 0 clean · 94% · 4.5c | 10/24 · 0 clean · 75% · 8.0c | 23/24 · 3 clean · 21% · 4.8c | 24/24 · 2 clean · 19% · 12.9c | 24/24 · 14 clean · 8% · 6.4c | 24/24 · 4 clean · 12% · 4.1c |

Cells: wins · clean kills (nothing got through: no damage, encryption included) · average health lost · average cycles.

## The hard slice

Every strain open at the level, six grade 2 wilds and six wilds two levels up.

| Bracket | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|
| Lv 1 | 12/12 · 57% · 11.2c | 11/12 · 47% · 10.4c | 12/12 · 26% · 7.4c | 12/12 · 43% · 9.8c |
| Lv 10 | 21/22 · 38% · 7.1c | 21/22 · 39% · 10.5c | 20/22 · 47% · 8.6c | 22/22 · 23% · 7.1c |
| Lv 18 | 23/23 · 20% · 5.5c | 22/23 · 37% · 13.2c | 23/23 · 25% · 8.4c | 23/23 · 20% · 6.9c |
| Lv 30 | 22/23 · 33% · 5.3c | 22/23 · 35% · 13.1c | 22/23 · 28% · 6.3c | 22/23 · 25% · 5.9c |
| Lv 50 | 23/23 · 23% · 4.2c | 22/23 · 27% · 12.0c | 23/23 · 16% · 6.7c | 23/23 · 17% · 4.3c |

## By subclass

The same fights for each of the eight subclasses (blues and the bracket's talents; the bar is the core four and the line's first three). Cells: health lost · wins.

| Bracket | Demolitionist | Overclocker | Warden | Sysop | Payload | Phantom | Herder | Hijacker |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Lv 10 | 35% · 23/24 | 50% · 22/24 | 29% · 24/24 | 30% · 22/24 | 25% · 24/24 | 45% · 21/24 | 16% · 24/24 | 22% · 24/24 |
| Lv 18 | 22% · 24/24 | 40% · 23/24 | 21% · 24/24 | 12% · 22/24 | 19% · 24/24 | 21% · 24/24 | 20% · 24/24 | 32% · 23/24 |
| Lv 30 | 29% · 24/24 | 38% · 22/24 | 21% · 24/24 | 5% · 23/24 | 19% · 24/24 | 12% · 24/24 | 16% · 24/24 | 23% · 23/24 |
| Lv 50 | 21% · 23/24 | 40% · 21/24 | 19% · 24/24 | 4% · 24/24 | 11% · 24/24 | 8% · 24/24 | 12% · 24/24 | 6% · 24/24 |

## Tells: reading them or not

The same fights for each subclass, by the planner that reads tells and by one that ignores them (`TELL.bots.answer = false`). Cells: health lost reading · ignoring (wins reading · ignoring). balance.test.mjs holds the gap at 12 points or more on average from Lv 10.

| Bracket | Demolitionist | Overclocker | Warden | Sysop | Payload | Phantom | Herder | Hijacker | Average gap |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Lv 10 | 35% · 37% (23 · 24) | 50% · 40% (22 · 24) | 29% · 32% (24 · 23) | 30% · 31% (22 · 22) | 25% · 26% (24 · 24) | 45% · 51% (21 · 21) | 16% · 21% (24 · 23) | 22% · 20% (24 · 24) | 0.6 |
| Lv 18 | 22% · 24% (24 · 24) | 40% · 37% (23 · 24) | 21% · 24% (24 · 24) | 12% · 10% (22 · 23) | 19% · 20% (24 · 24) | 21% · 23% (24 · 22) | 20% · 20% (24 · 24) | 32% · 34% (23 · 22) | 0.6 |
| Lv 30 | 29% · 31% (24 · 23) | 38% · 41% (22 · 22) | 21% · 34% (24 · 24) | 5% · 4% (23 · 24) | 19% · 20% (24 · 24) | 12% · 15% (24 · 23) | 16% · 18% (24 · 24) | 23% · 18% (23 · 24) | 2.2 |

Target (friction.mjs; a `todo` test in balance.test.mjs): a blue-geared fight at your level costs every subclass 35–45% of its health at levels 10, 18 and 30, subclasses within about 10 points.

## Skill use at level 50

- **Breaker:** shatter 24% · crack 18% · overload 16% · thermal-runaway 11% · shaped-charge 9% · flood 9% · sigint 4% · rm-rf 3% · spike 3% · backfire 2%
- **Bastion:** purge 21% · rate-limit 21% · reject 21% · quarantine 8% · blowback 8% · spike 7% · harden 6% · circuit-breaker 4% · bulkhead 3% · suspend 2% · sigint 0%
- **Infiltrator:** backdoor 24% · opening 21% · side-channel 19% · inject 9% · sigint 8% · unmask 7% · fingerprint 5% · spike 5% · shadow-copy 2% · null-route 1%
- **Operator:** botnet 23% · nohup 23% · fan-out 12% · hook 9% · deploy 8% · spike 6% · load-shed 5% · mesh 4% · sigint 4% · kill-switch 2% · spawn 2%

## Unlockable skills (level 50, whole tree)

Each one swapped into the fifth slot. Change vs the first five.

| Class | Skill | Wins | Health lost | Δ | Cycles | Δ |
|---|---|---:|---:|---:|---:|---:|
| Breaker | Shaped Charge | 24/24 | 24% | +3 | 6.0 | +1.2 |
| Breaker | Fork Bomb | 24/24 | 21% | -0 | 5.2 | +0.4 |
| Breaker | Debris Field | 23/24 | 35% | +14 | 7.3 | +2.5 |
| Breaker | Thermal Runaway | 24/24 | 22% | +1 | 6.3 | +1.4 |
| Breaker | Backfire | 23/24 | 30% | +9 | 6.6 | +1.8 |
| Breaker | Logic Bomb | 23/24 | 30% | +9 | 6.6 | +1.8 |
| Breaker | rm -rf | 23/24 | 31% | +10 | 6.7 | +1.8 |
| Breaker | Chain Reaction | 23/24 | 26% | +4 | 5.7 | +0.8 |
| Breaker | Bit Rot | 24/24 | 26% | +4 | 6.3 | +1.4 |
| Breaker | Zero-day | 24/24 | 10% | -11 | 4.8 | -0.0 |
| Bastion | Suspend | 24/24 | 24% | +5 | 11.7 | -1.2 |
| Bastion | Bulkhead | 24/24 | 25% | +7 | 11.5 | -1.4 |
| Bastion | Blowback | 24/24 | 28% | +9 | 11.1 | -1.8 |
| Bastion | Harden | 24/24 | 24% | +5 | 12.1 | -0.8 |
| Bastion | Quarantine | 24/24 | 23% | +4 | 11.6 | -1.3 |
| Bastion | Throttle | 24/24 | 20% | +2 | 11.6 | -1.3 |
| Bastion | Circuit Breaker | 24/24 | 25% | +6 | 11.6 | -1.3 |
| Bastion | DMZ | 23/24 | 28% | +9 | 11.9 | -1.0 |
| Bastion | Honeypot | 24/24 | 28% | +9 | 12.2 | -0.8 |
| Bastion | Failover | 24/24 | 27% | +8 | 11.3 | -1.6 |
| Infiltrator | Null Route | 24/24 | 9% | +1 | 7.8 | +1.4 |
| Infiltrator | Opening | 24/24 | 15% | +7 | 8.0 | +1.7 |
| Infiltrator | Backstab | 24/24 | 16% | +9 | 7.6 | +1.3 |
| Infiltrator | Side Channel | 24/24 | 9% | +1 | 6.3 | -0.1 |
| Infiltrator | Shadow Copy | 24/24 | 8% | +1 | 7.7 | +1.3 |
| Infiltrator | Spoof | 24/24 | 14% | +6 | 7.8 | +1.4 |
| Infiltrator | Rotate Keys | 24/24 | 13% | +5 | 7.6 | +1.3 |
| Infiltrator | Log Wipe | 24/24 | 12% | +4 | 7.8 | +1.4 |
| Infiltrator | Unmask | 24/24 | 13% | +5 | 6.7 | +0.3 |
| Infiltrator | Vanish | 24/24 | 10% | +3 | 7.8 | +1.4 |
| Infiltrator | Rootkit Implant | 24/24 | 18% | +10 | 7.7 | +1.3 |
| Operator | nohup | 24/24 | 11% | -1 | 4.8 | +0.7 |
| Operator | Kill Switch | 24/24 | 12% | -0 | 5.6 | +1.5 |
| Operator | Load Shed | 24/24 | 14% | +2 | 6.0 | +2.0 |
| Operator | Fork | 24/24 | 14% | +1 | 4.9 | +0.8 |
| Operator | Mesh | 24/24 | 8% | -4 | 3.7 | -0.4 |
| Operator | Garbage Collect | 24/24 | 11% | -1 | 5.4 | +1.3 |
| Operator | Malloc | 24/24 | 20% | +8 | 5.8 | +1.7 |
| Operator | Crontab | 24/24 | 19% | +6 | 5.3 | +1.2 |
| Operator | OOM Kill | 24/24 | 12% | -0 | 5.6 | +1.5 |
| Operator | Cron Storm | 24/24 | 12% | -0 | 5.6 | +1.5 |

## Every maxed build (level 50, all ranks)

| Class | Best build | Health lost · cycles | Worst build | Health lost · cycles |
|---|---|---:|---|---:|
| Breaker | Cluster Charge / Meltdown / Total Overkill | 18% · 4.4 | Exposed Wiring / Cascade Failure / Scorched Earth | 25% · 5.0 |
| Bastion | Tarpit / Counterflow / Uptime | 19% · 12.9 | Deep Packet Inspection / Write Protect / Kernel Panic | 24% · 12.9 |
| Infiltrator | Blind Spot / Kill Chain / Deep Cover | 6% · 6.4 | Blind Spot / Ghost Route / Tracking Pixel | 9% · 6.2 |
| Operator | Big Process / Hive / Zombie Process | 12% · 4.1 | Long-running / Hydra / Supervisor | 13% · 4.0 |

## Crews in the farm (KESSLER-FARM-00)

You (a Demolitionist, played by the planner) and sim crewmates, everyone in blues with their subclass's stats, 20 seeds: the packs, then each crew boss, up to 4 tries each, everyone rested before a try. Each boss column is its wins over tries; Cleared is the seeds where all three fell; lowest anyone is the lowest share of Signal anyone in the crew reached (a lost try counts as 0); the Sysop column is the share of its cycles spent on a heal. A full crew is a Warden, a Sysop and a Payload with you (two damage dealers). The rows below it each take one thing away: the tank, the healer, everyone's SIGINT (`bots: { interrupt: false }`), or a damage dealer (a second Sysop instead). docs/bosses.md has what each role does.

| Level | Crew | Foreman | Heatsink | Coldwallet | Cleared | Lowest anyone | Fights someone dips under 40% | Sysop cycles healing | Cycles |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 18 | Warden + Sysop (4) | 20/20 | 20/22 | 20/20 | 20/20 | 31% | 55% | 46% | 17.8 |
| 18 | no tank (4) | 12/46 | 20/22 | 12/12 | 12/20 | 9% | 91% | 51% | 11.0 |
| 18 | no healer (4) | 20/20 | 17/31 | 17/17 | 17/20 | 14% | 84% | – | 13.7 |
| 18 | no SIGINT (4) | 0/80 | 19/35 | – | 0/20 | 1% | 100% | 58% | 11.8 |
| 18 | one damage (4) | 9/67 | 3/80 | 0/12 | 0/20 | 0% | 100% | 52% | 24.8 |
| 18 | Warden + Sysop (3) | 20/25 | 20/24 | 13/44 | 13/20 | 13% | 89% | 49% | 22.2 |
| 18 | Sysop (3) | 15/47 | 20/28 | 7/40 | 7/20 | 5% | 97% | 53% | 15.0 |
| 18 | Warden (3) | 20/20 | 19/29 | 19/19 | 19/20 | 22% | 78% | – | 14.7 |
| 18 | Sysop (2) | 20/30 | 19/19 | 17/26 | 17/20 | 20% | 79% | 46% | 18.0 |
| 30 | Warden + Sysop (4) | 20/20 | 20/20 | 20/20 | 20/20 | 43% | 52% | 65% | 16.1 |
| 30 | no tank (4) | 0/80 | 20/20 | – | 0/20 | 7% | 90% | 77% | 11.7 |
| 30 | no healer (4) | 20/20 | 19/32 | 19/19 | 19/20 | 18% | 75% | – | 12.5 |
| 30 | no SIGINT (4) | 0/80 | 20/22 | – | 0/20 | 5% | 99% | 78% | 10.5 |
| 30 | one damage (4) | 16/48 | 19/33 | 0/60 | 0/20 | 7% | 92% | 70% | 22.5 |
| 30 | Warden + Sysop (3) | 20/32 | 20/22 | 12/62 | 12/20 | 13% | 86% | 68% | 23.4 |
| 30 | Sysop (3) | 10/50 | 20/20 | 10/10 | 10/20 | 15% | 70% | 63% | 9.6 |
| 30 | Warden (3) | 20/20 | 15/44 | 15/15 | 15/20 | 17% | 73% | – | 13.5 |
| 30 | Sysop (2) | 20/20 | 20/20 | 19/41 | 19/20 | 25% | 74% | 68% | 19.4 |
