# BLACKBOX class balance by level

One scripted planner for every class (it finishes bare or about-to-fire parts, answers attacks it cannot prevent, strips armor with small or spread hits, then finishes), playing each class’s own kit (from level 10 its default subclass: Demolitionist, Warden, Phantom, Herder; every subclass has its own table below). Each bracket: 20 random home intrusions at your level and the four guards at the deepest layer reached (your level + 2 per layer). Your numbers and theirs both grow 4% per level, and enemy hits on your Signal take the late step from level 10 (`CONFIG.runLate`: ×0.95 at 10, ×1 at 18, ×1.32 at 30, back to ×1.2 at 50) and their Integrity a smaller one (`CONFIG.runLateHp`: ×0.96 at 18, ×1.05 at 30, ×1 at 50), set against gear on one smooth item-level curve (gear.mjs `ITEM_CURVE`); misses follow the level gap (5% at your level). Talents as a player would have them: a point at level 10 and every 2 levels after, spent in a fixed order (14 points at 50, not the whole tree). Everyone loads a Tuned (blue) protocol in every open slot (4, 5 at 15, 6 at 30) at their level (an implant slot only from 15, where implants start to drop), from level 10 each carrying a stat its subclass chases, in turn (the subclass’s `chase` list: Damage and Crit for a Demolitionist, Restore and Clock Speed for a Sysop, Payload for the burn and helper classes…) except the no-gear column, which has none. Every blue carries a minor rule affix (gear.mjs RULES) and one numeric affix, the one its subclass chases. Crits are on for both sides (seeded). Every fight brings its tells (tells.mjs: moves a part announces ahead), and the planner reads and answers them. Health lost is a share of your own max. Scripted policies, not people.

| Bracket | Spike, no gear | Spike only | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|---:|---:|
| Lv 1 | 21/24 · 0 clean · 62% · 10.8c | 24/24 · 0 clean · 28% · 8.5c | 24/24 · 0 clean · 20% · 8.0c | 24/24 · 1 clean · 17% · 7.8c | 24/24 · 1 clean · 14% · 6.1c | 24/24 · 2 clean · 13% · 6.6c |
| Lv 10 | 13/24 · 3 clean · 71% · 9.8c | 20/24 · 5 clean · 53% · 9.9c | 24/24 · 7 clean · 24% · 7.3c | 24/24 · 9 clean · 13% · 9.3c | 22/24 · 7 clean · 31% · 8.1c | 24/24 · 6 clean · 21% · 7.0c |
| Lv 18 | 0/24 · 0 clean · 100% · 7.3c | 12/24 · 0 clean · 85% · 11.3c | 24/24 · 4 clean · 20% · 6.3c | 24/24 · 6 clean · 12% · 14.4c | 24/24 · 11 clean · 18% · 9.5c | 24/24 · 3 clean · 16% · 7.9c |
| Lv 30 | 3/24 · 0 clean · 95% · 6.4c | 12/24 · 0 clean · 76% · 10.0c | 24/24 · 6 clean · 24% · 6.7c | 24/24 · 4 clean · 17% · 12.5c | 24/24 · 12 clean · 15% · 7.8c | 24/24 · 2 clean · 20% · 5.9c |
| Lv 50 | 2/24 · 0 clean · 94% · 5.4c | 21/24 · 0 clean · 60% · 9.8c | 24/24 · 8 clean · 15% · 5.4c | 24/24 · 5 clean · 12% · 12.2c | 24/24 · 17 clean · 3% · 7.3c | 24/24 · 5 clean · 15% · 4.6c |

Cells: wins · clean kills (nothing got through: no damage, encryption included) · average health lost · average cycles.

## The hard slice

Every strain open at the level, six grade 2 wilds and six wilds two levels up.

| Bracket | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|
| Lv 1 | 12/12 · 52% · 10.2c | 11/12 · 41% · 9.7c | 12/12 · 24% · 7.2c | 12/12 · 44% · 9.2c |
| Lv 10 | 21/22 · 22% · 7.0c | 20/22 · 26% · 9.4c | 21/22 · 39% · 7.5c | 22/22 · 23% · 7.3c |
| Lv 18 | 22/23 · 25% · 6.2c | 23/23 · 32% · 14.2c | 23/23 · 31% · 9.3c | 23/23 · 29% · 7.7c |
| Lv 30 | 22/23 · 33% · 5.7c | 22/23 · 28% · 12.8c | 22/23 · 34% · 7.4c | 22/23 · 34% · 6.7c |
| Lv 50 | 23/23 · 19% · 4.4c | 23/23 · 25% · 12.0c | 23/23 · 29% · 7.7c | 23/23 · 20% · 4.4c |

## By subclass

The same fights for each of the eight subclasses (blues and the bracket's talents; the bar is the core four and the line's first three). Cells: health lost · wins.

| Bracket | Demolitionist | Overclocker | Warden | Sysop | Payload | Phantom | Herder | Hijacker |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Lv 10 | 24% · 24/24 | 26% · 24/24 | 13% · 24/24 | 20% · 23/24 | 18% · 24/24 | 31% · 22/24 | 21% · 24/24 | 18% · 24/24 |
| Lv 18 | 20% · 24/24 | 30% · 23/24 | 12% · 24/24 | 2% · 24/24 | 20% · 24/24 | 18% · 24/24 | 16% · 24/24 | 28% · 23/24 |
| Lv 30 | 24% · 24/24 | 33% · 22/24 | 17% · 24/24 | 2% · 24/24 | 22% · 24/24 | 15% · 24/24 | 20% · 24/24 | 21% · 23/24 |
| Lv 50 | 15% · 24/24 | 31% · 22/24 | 12% · 24/24 | 0% · 24/24 | 17% · 24/24 | 3% · 24/24 | 15% · 24/24 | 8% · 24/24 |

## Tells: reading them or not

The same fights for each subclass, by the planner that reads tells and by one that ignores them (`TELL.bots.answer = false`). Cells: health lost reading · ignoring (wins reading · ignoring). balance.test.mjs holds the gap at 12 points or more on average from Lv 10.

| Bracket | Demolitionist | Overclocker | Warden | Sysop | Payload | Phantom | Herder | Hijacker | Average gap |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Lv 10 | 24% · 30% (24 · 24) | 26% · 31% (24 · 24) | 13% · 18% (24 · 24) | 20% · 22% (23 · 23) | 18% · 17% (24 · 24) | 31% · 34% (22 · 22) | 21% · 20% (24 · 23) | 18% · 15% (24 · 24) | 1.9 |
| Lv 18 | 20% · 18% (24 · 24) | 30% · 39% (23 · 22) | 12% · 15% (24 · 24) | 2% · 5% (24 · 24) | 20% · 23% (24 · 24) | 18% · 19% (24 · 24) | 16% · 17% (24 · 24) | 28% · 31% (23 · 24) | 2.7 |
| Lv 30 | 24% · 22% (24 · 23) | 33% · 35% (22 · 24) | 17% · 18% (24 · 24) | 2% · 4% (24 · 23) | 22% · 20% (24 · 24) | 15% · 19% (24 · 24) | 20% · 22% (24 · 24) | 21% · 20% (23 · 23) | 0.7 |

Target (friction.mjs; a `todo` test in balance.test.mjs): a blue-geared fight at your level costs every subclass 35–45% of its health at levels 10, 18 and 30, subclasses within about 10 points.

## Skill use at level 50

- **Breaker:** overload 26% · flood 18% · crack 13% · shatter 12% · shaped-charge 9% · thermal-runaway 8% · sigint 5% · rm-rf 5% · spike 4% · backfire 1%
- **Bastion:** rate-limit 22% · reject 21% · purge 19% · spike 9% · blowback 8% · quarantine 7% · harden 6% · circuit-breaker 4% · bulkhead 2% · suspend 1% · sigint 0%
- **Infiltrator:** opening 21% · side-channel 16% · backdoor 14% · inject 13% · fingerprint 9% · unmask 7% · shadow-copy 7% · sigint 6% · backstab 3% · spike 2% · null-route 2%
- **Operator:** nohup 26% · botnet 21% · hook 10% · fan-out 9% · deploy 8% · sigint 8% · mesh 7% · spike 5% · load-shed 4% · kill-switch 1% · spawn 1%

## Unlockable skills (level 50, whole tree)

Each one swapped into the fifth slot. Change vs the first five.

| Class | Skill | Wins | Health lost | Δ | Cycles | Δ |
|---|---|---:|---:|---:|---:|---:|
| Breaker | Shaped Charge | 23/24 | 17% | +1 | 6.0 | +0.7 |
| Breaker | Fork Bomb | 24/24 | 10% | -6 | 4.8 | -0.5 |
| Breaker | Debris Field | 24/24 | 21% | +6 | 7.0 | +1.7 |
| Breaker | Thermal Runaway | 24/24 | 16% | +1 | 6.5 | +1.1 |
| Breaker | Backfire | 24/24 | 16% | +1 | 6.5 | +1.1 |
| Breaker | Logic Bomb | 24/24 | 15% | +0 | 6.5 | +1.1 |
| Breaker | rm -rf | 24/24 | 16% | +1 | 6.5 | +1.2 |
| Breaker | Chain Reaction | 24/24 | 14% | -1 | 5.6 | +0.2 |
| Breaker | Bit Rot | 24/24 | 13% | -2 | 5.8 | +0.5 |
| Breaker | Zero-day | 24/24 | 9% | -6 | 5.3 | -0.1 |
| Bastion | Suspend | 24/24 | 23% | +11 | 11.9 | -0.3 |
| Bastion | Bulkhead | 24/24 | 25% | +13 | 11.9 | -0.3 |
| Bastion | Blowback | 24/24 | 22% | +10 | 11.1 | -1.0 |
| Bastion | Harden | 24/24 | 18% | +6 | 11.8 | -0.4 |
| Bastion | Quarantine | 24/24 | 21% | +8 | 11.0 | -1.1 |
| Bastion | Throttle | 24/24 | 19% | +7 | 11.8 | -0.4 |
| Bastion | Circuit Breaker | 24/24 | 22% | +10 | 11.9 | -0.3 |
| Bastion | DMZ | 24/24 | 21% | +9 | 12.1 | -0.1 |
| Bastion | Honeypot | 24/24 | 21% | +9 | 11.9 | -0.3 |
| Bastion | Failover | 24/24 | 23% | +10 | 11.6 | -0.6 |
| Infiltrator | Null Route | 24/24 | 10% | +7 | 8.0 | +0.7 |
| Infiltrator | Opening | 23/24 | 16% | +13 | 7.8 | +0.5 |
| Infiltrator | Backstab | 23/24 | 17% | +14 | 7.7 | +0.3 |
| Infiltrator | Side Channel | 24/24 | 8% | +5 | 6.6 | -0.7 |
| Infiltrator | Shadow Copy | 24/24 | 11% | +8 | 8.1 | +0.8 |
| Infiltrator | Spoof | 24/24 | 14% | +11 | 7.9 | +0.6 |
| Infiltrator | Rotate Keys | 24/24 | 14% | +11 | 8.1 | +0.8 |
| Infiltrator | Log Wipe | 24/24 | 15% | +12 | 8.3 | +0.9 |
| Infiltrator | Unmask | 24/24 | 11% | +8 | 7.0 | -0.3 |
| Infiltrator | Vanish | 24/24 | 10% | +7 | 8.0 | +0.7 |
| Infiltrator | Rootkit Implant | 24/24 | 17% | +14 | 8.5 | +1.2 |
| Operator | nohup | 24/24 | 10% | -5 | 5.2 | +0.6 |
| Operator | Kill Switch | 23/24 | 16% | +1 | 6.0 | +1.4 |
| Operator | Load Shed | 24/24 | 12% | -2 | 6.0 | +1.4 |
| Operator | Fork | 24/24 | 15% | -0 | 5.6 | +1.0 |
| Operator | Mesh | 24/24 | 13% | -2 | 4.4 | -0.3 |
| Operator | Garbage Collect | 24/24 | 12% | -3 | 5.9 | +1.3 |
| Operator | Malloc | 24/24 | 16% | +1 | 6.1 | +1.5 |
| Operator | Crontab | 24/24 | 18% | +3 | 5.9 | +1.3 |
| Operator | OOM Kill | 24/24 | 12% | -2 | 5.8 | +1.2 |
| Operator | Cron Storm | 24/24 | 12% | -2 | 5.8 | +1.2 |

## Every maxed build (level 50, all ranks)

| Class | Best build | Health lost · cycles | Worst build | Health lost · cycles |
|---|---|---:|---|---:|
| Breaker | Cluster Charge / Meltdown / Scorched Earth | 10% · 4.6 | Cluster Charge / Cascade Failure / Total Overkill | 15% · 5.4 |
| Bastion | Tarpit / Counterflow / Uptime | 12% · 12.2 | Deep Packet Inspection / Write Protect / Kernel Panic | 16% · 12.1 |
| Infiltrator | Fast Hands / Ghost Route / Deep Cover | 2% · 6.2 | Blind Spot / Kill Chain / Tracking Pixel | 3% · 7.1 |
| Operator | Big Process / Hydra / Supervisor | 12% · 4.3 | Big Process / Hive / Zombie Process | 15% · 4.6 |

## Crews in the farm (KESSLER-FARM-00)

You (a Demolitionist, played by the planner) and sim crewmates, everyone in blues with their subclass's stats, 20 seeds: the packs, then each crew boss, up to 4 tries each, everyone rested before a try. Each boss column is its wins over tries; Cleared is the seeds where all three fell; lowest anyone is the lowest share of Signal anyone in the crew reached (a lost try counts as 0); the Sysop column is the share of its cycles spent on a heal. A full crew is a Warden, a Sysop and a Payload with you (two damage dealers). The rows below it each take one thing away: the tank, the healer, everyone's SIGINT (`bots: { interrupt: false }`), or a damage dealer (a second Sysop instead). docs/bosses.md has what each role does.

| Level | Crew | Foreman | Heatsink | Coldwallet | Cleared | Lowest anyone | Fights someone dips under 40% | Sysop cycles healing | Cycles |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 18 | Warden + Sysop (4) | 20/20 | 20/20 | 20/20 | 20/20 | 34% | 48% | 45% | 17.8 |
| 18 | no tank (4) | 12/48 | 20/20 | 12/13 | 12/20 | 8% | 93% | 52% | 10.8 |
| 18 | no healer (4) | 20/20 | 18/37 | 18/18 | 18/20 | 12% | 85% | – | 13.6 |
| 18 | no SIGINT (4) | 1/77 | 18/36 | 1/1 | 1/20 | 1% | 100% | 58% | 11.8 |
| 18 | one damage (4) | 6/64 | 2/76 | – | 0/20 | 0% | 100% | 51% | 25.3 |
| 18 | Warden + Sysop (3) | 20/24 | 20/22 | 13/45 | 13/20 | 14% | 90% | 49% | 22.3 |
| 18 | Sysop (3) | 15/43 | 20/24 | 9/34 | 9/20 | 6% | 94% | 54% | 14.7 |
| 18 | Warden (3) | 20/20 | 16/45 | 16/16 | 16/20 | 19% | 83% | – | 14.9 |
| 18 | Sysop (2) | 20/22 | 20/20 | 16/35 | 16/20 | 17% | 84% | 45% | 18.3 |
| 30 | Warden + Sysop (4) | 20/20 | 20/20 | 20/20 | 20/20 | 39% | 58% | 64% | 15.8 |
| 30 | no tank (4) | 0/80 | 20/20 | – | 0/20 | 8% | 88% | 78% | 11.8 |
| 30 | no healer (4) | 20/20 | 19/30 | 19/19 | 19/20 | 16% | 80% | – | 12.4 |
| 30 | no SIGINT (4) | 0/80 | 20/21 | – | 0/20 | 5% | 98% | 78% | 10.5 |
| 30 | one damage (4) | 16/43 | 20/27 | 0/64 | 0/20 | 8% | 93% | 70% | 22.1 |
| 30 | Warden + Sysop (3) | 20/28 | 20/22 | 8/58 | 8/20 | 13% | 87% | 68% | 23.7 |
| 30 | Sysop (3) | 12/44 | 20/20 | 12/12 | 12/20 | 17% | 75% | 64% | 10.1 |
| 30 | Warden (3) | 20/20 | 17/38 | 17/17 | 17/20 | 18% | 67% | – | 13.3 |
| 30 | Sysop (2) | 20/20 | 19/19 | 19/47 | 19/20 | 22% | 80% | 68% | 19.2 |
