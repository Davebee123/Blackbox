# BLACKBOX class balance by level

One scripted planner for every class (it finishes bare or about-to-fire parts, answers attacks it cannot prevent, strips armor with small or spread hits, then finishes), playing each class’s own kit (from level 10 its default subclass: Demolitionist, Warden, Phantom, Herder; every subclass has its own table below). Each bracket: 20 random home intrusions at your level and the four guards at the deepest layer reached (your level + 2 per layer). Your numbers and theirs both grow 4% per level, and enemy hits on your Signal take the late step from level 10 (`CONFIG.runLate`: ×0.95 at 10, ×1 at 18, ×1.32 at 30, back to ×1.2 at 50) and their Integrity a smaller one (`CONFIG.runLateHp`: ×0.96 at 18, ×1.05 at 30, ×1 at 50), set against gear on one smooth item-level curve (gear.mjs `ITEM_CURVE`); misses follow the level gap (5% at your level). Talents as a player would have them: a point at level 10 and every 2 levels after, spent in a fixed order (14 points at 50, not the whole tree). Everyone loads a Tuned (blue) protocol in every open slot (4, 5 at 15, 6 at 30) at their level (an implant slot only from 15, where implants start to drop), from level 10 each carrying a stat its subclass chases, in turn (the subclass’s `chase` list: Damage and Crit for a Demolitionist, Restore and Clock Speed for a Sysop, Payload for the burn and helper classes…) except the no-gear column, which has none. Every blue carries a minor rule affix (gear.mjs RULES) and one numeric affix, the one its subclass chases. Crits are on for both sides (seeded). Every fight brings its tells (tells.mjs: moves a part announces ahead), and the planner reads and answers them. Health lost is a share of your own max. Scripted policies, not people.

| Bracket | Spike, no gear | Spike only | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|---:|---:|
| Lv 1 | 21/24 · 0 clean · 65% · 11.1c | 24/24 · 0 clean · 30% · 8.6c | 24/24 · 0 clean · 20% · 8.2c | 24/24 · 1 clean · 16% · 8.0c | 24/24 · 2 clean · 13% · 6.0c | 24/24 · 2 clean · 13% · 6.7c |
| Lv 10 | 3/24 · 1 clean · 93% · 7.5c | 9/24 · 0 clean · 87% · 9.0c | 24/24 · 1 clean · 32% · 8.6c | 24/24 · 0 clean · 25% · 11.9c | 24/24 · 0 clean · 35% · 9.1c | 24/24 · 0 clean · 33% · 7.6c |
| Lv 18 | 0/24 · 0 clean · 100% · 5.9c | 3/24 · 0 clean · 98% · 8.2c | 24/24 · 1 clean · 20% · 5.6c | 24/24 · 0 clean · 18% · 14.0c | 24/24 · 6 clean · 18% · 8.0c | 24/24 · 1 clean · 20% · 7.7c |
| Lv 30 | 3/24 · 0 clean · 95% · 5.3c | 4/24 · 0 clean · 90% · 7.6c | 24/24 · 0 clean · 24% · 6.8c | 24/24 · 1 clean · 29% · 14.0c | 24/24 · 8 clean · 17% · 7.3c | 24/24 · 0 clean · 16% · 6.0c |
| Lv 50 | 2/24 · 0 clean · 94% · 4.0c | 8/24 · 0 clean · 81% · 7.8c | 24/24 · 4 clean · 13% · 4.9c | 24/24 · 3 clean · 18% · 14.2c | 24/24 · 9 clean · 12% · 7.0c | 24/24 · 6 clean · 10% · 4.3c |

Cells: wins · clean kills (nothing got through: no damage, encryption included) · average health lost · average cycles.

## The hard slice

Every strain open at the level, six grade 2 wilds and six wilds two levels up.

| Bracket | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|
| Lv 1 | 12/12 · 53% · 10.6c | 11/12 · 42% · 9.7c | 12/12 · 32% · 7.8c | 12/12 · 44% · 9.2c |
| Lv 10 | 22/22 · 27% · 7.7c | 20/22 · 41% · 11.1c | 20/22 · 54% · 8.9c | 22/22 · 32% · 7.5c |
| Lv 18 | 23/23 · 23% · 5.0c | 22/23 · 31% · 14.2c | 23/23 · 28% · 8.1c | 23/23 · 31% · 8.0c |
| Lv 30 | 22/23 · 41% · 6.3c | 23/23 · 29% · 13.2c | 23/23 · 22% · 6.7c | 22/23 · 23% · 6.3c |
| Lv 50 | 23/23 · 27% · 4.9c | 23/23 · 26% · 12.4c | 23/23 · 19% · 6.9c | 23/23 · 22% · 4.5c |

## By subclass

The same fights for each of the eight subclasses (blues and the bracket's talents; the bar is the core four and the line's first three). Cells: health lost · wins.

| Bracket | Demolitionist | Overclocker | Warden | Sysop | Payload | Phantom | Herder | Hijacker |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Lv 10 | 32% · 24/24 | 33% · 24/24 | 25% · 24/24 | 40% · 24/24 | 17% · 24/24 | 35% · 24/24 | 33% · 24/24 | 33% · 24/24 |
| Lv 18 | 20% · 24/24 | 34% · 23/24 | 18% · 24/24 | 4% · 24/24 | 23% · 24/24 | 18% · 24/24 | 20% · 24/24 | 42% · 24/24 |
| Lv 30 | 24% · 24/24 | 33% · 23/24 | 29% · 24/24 | 3% · 24/24 | 21% · 24/24 | 17% · 24/24 | 16% · 24/24 | 30% · 23/24 |
| Lv 50 | 13% · 24/24 | 31% · 23/24 | 18% · 24/24 | 4% · 24/24 | 15% · 24/24 | 12% · 24/24 | 10% · 24/24 | 16% · 24/24 |

## Tells: reading them or not

The same fights for each subclass, by the planner that reads tells and by one that ignores them (`TELL.bots.answer = false`). Cells: health lost reading · ignoring (wins reading · ignoring). balance.test.mjs holds the gap at 12 points or more on average from Lv 10.

| Bracket | Demolitionist | Overclocker | Warden | Sysop | Payload | Phantom | Herder | Hijacker | Average gap |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Lv 10 | 32% · 38% (24 · 24) | 33% · 37% (24 · 24) | 25% · 32% (24 · 24) | 40% · 39% (24 · 24) | 17% · 21% (24 · 24) | 35% · 43% (24 · 24) | 33% · 35% (24 · 23) | 33% · 32% (24 · 24) | 3.7 |
| Lv 18 | 20% · 23% (24 · 24) | 34% · 30% (23 · 23) | 18% · 24% (24 · 24) | 4% · 5% (24 · 24) | 23% · 22% (24 · 24) | 18% · 21% (24 · 24) | 20% · 24% (24 · 24) | 42% · 48% (24 · 23) | 2.4 |
| Lv 30 | 24% · 25% (24 · 23) | 33% · 32% (23 · 24) | 29% · 36% (24 · 24) | 3% · 3% (24 · 24) | 21% · 23% (24 · 24) | 17% · 28% (24 · 24) | 16% · 16% (24 · 24) | 30% · 27% (23 · 24) | 2.0 |

Target (friction.mjs; a `todo` test in balance.test.mjs): a blue-geared fight at your level costs every subclass 35–45% of its health at levels 10, 18 and 30, subclasses within about 10 points.

## Skill use at level 50

- **Breaker:** shatter 37% · crack 27% · overload 9% · sigint 8% · thermal-runaway 7% · shaped-charge 4% · rm-rf 3% · backfire 3% · logic-bomb 1% · flood 1% · spike 1%
- **Bastion:** rate-limit 22% · purge 19% · reject 17% · quarantine 9% · blowback 8% · harden 6% · spike 6% · suspend 5% · bulkhead 3% · circuit-breaker 3% · sigint 1%
- **Infiltrator:** backdoor 22% · side-channel 22% · opening 17% · sigint 11% · unmask 9% · inject 6% · spike 4% · fingerprint 4% · shadow-copy 2% · backstab 2%
- **Operator:** botnet 23% · hook 20% · nohup 18% · mesh 11% · fan-out 7% · spike 7% · sigint 6% · deploy 6% · spawn 2% · load-shed 1%

## Unlockable skills (level 50, whole tree)

Each one swapped into the fifth slot. Change vs the first five.

| Class | Skill | Wins | Health lost | Δ | Cycles | Δ |
|---|---|---:|---:|---:|---:|---:|
| Breaker | Shaped Charge | 23/24 | 17% | +4 | 5.7 | +0.8 |
| Breaker | Fork Bomb | 24/24 | 20% | +6 | 5.0 | +0.1 |
| Breaker | Debris Field | 23/24 | 24% | +11 | 6.6 | +1.7 |
| Breaker | Thermal Runaway | 24/24 | 16% | +2 | 6.1 | +1.2 |
| Breaker | Backfire | 23/24 | 18% | +5 | 6.0 | +1.1 |
| Breaker | Logic Bomb | 23/24 | 19% | +6 | 6.0 | +1.1 |
| Breaker | rm -rf | 23/24 | 19% | +5 | 5.9 | +1.0 |
| Breaker | Chain Reaction | 24/24 | 15% | +2 | 5.6 | +0.7 |
| Breaker | Bit Rot | 24/24 | 17% | +3 | 6.0 | +1.1 |
| Breaker | Zero-day | 24/24 | 14% | +0 | 5.2 | +0.3 |
| Bastion | Suspend | 24/24 | 27% | +9 | 12.8 | -1.5 |
| Bastion | Bulkhead | 24/24 | 31% | +13 | 13.0 | -1.2 |
| Bastion | Blowback | 24/24 | 34% | +16 | 12.1 | -2.1 |
| Bastion | Harden | 24/24 | 27% | +9 | 12.8 | -1.4 |
| Bastion | Quarantine | 24/24 | 29% | +11 | 12.9 | -1.3 |
| Bastion | Throttle | 24/24 | 28% | +10 | 13.0 | -1.3 |
| Bastion | Circuit Breaker | 24/24 | 30% | +13 | 12.8 | -1.5 |
| Bastion | DMZ | 24/24 | 35% | +17 | 13.3 | -0.9 |
| Bastion | Honeypot | 24/24 | 28% | +11 | 13.4 | -0.8 |
| Bastion | Failover | 24/24 | 32% | +15 | 12.7 | -1.5 |
| Infiltrator | Null Route | 24/24 | 26% | +14 | 9.7 | +2.7 |
| Infiltrator | Opening | 24/24 | 42% | +30 | 9.8 | +2.7 |
| Infiltrator | Backstab | 24/24 | 35% | +23 | 9.3 | +2.3 |
| Infiltrator | Side Channel | 24/24 | 13% | +1 | 6.7 | -0.3 |
| Infiltrator | Shadow Copy | 24/24 | 26% | +14 | 9.7 | +2.6 |
| Infiltrator | Spoof | 24/24 | 34% | +22 | 9.5 | +2.5 |
| Infiltrator | Rotate Keys | 24/24 | 32% | +20 | 10.0 | +2.9 |
| Infiltrator | Log Wipe | 23/24 | 33% | +21 | 9.5 | +2.5 |
| Infiltrator | Unmask | 24/24 | 17% | +5 | 7.4 | +0.4 |
| Infiltrator | Vanish | 24/24 | 26% | +14 | 9.5 | +2.5 |
| Infiltrator | Rootkit Implant | 24/24 | 24% | +12 | 9.0 | +2.0 |
| Operator | nohup | 24/24 | 8% | -2 | 5.0 | +0.7 |
| Operator | Kill Switch | 24/24 | 9% | -1 | 5.5 | +1.2 |
| Operator | Load Shed | 24/24 | 8% | -2 | 5.5 | +1.2 |
| Operator | Fork | 24/24 | 10% | +0 | 5.3 | +1.0 |
| Operator | Mesh | 24/24 | 9% | -1 | 4.3 | -0.1 |
| Operator | Garbage Collect | 24/24 | 7% | -2 | 5.2 | +0.8 |
| Operator | Malloc | 24/24 | 28% | +18 | 6.4 | +2.1 |
| Operator | Crontab | 24/24 | 26% | +17 | 5.7 | +1.4 |
| Operator | OOM Kill | 24/24 | 8% | -2 | 5.3 | +1.0 |
| Operator | Cron Storm | 24/24 | 8% | -2 | 5.3 | +1.0 |

## Every maxed build (level 50, all ranks)

| Class | Best build | Health lost · cycles | Worst build | Health lost · cycles |
|---|---|---:|---|---:|
| Breaker | Cluster Charge / Meltdown / Total Overkill | 12% · 4.5 | Exposed Wiring / Cascade Failure / Scorched Earth | 16% · 5.3 |
| Bastion | Tarpit / Counterflow / Uptime | 18% · 14.2 | Deep Packet Inspection / Write Protect / Kernel Panic | 27% · 14.2 |
| Infiltrator | Fast Hands / Ghost Route / Deep Cover | 10% · 6.0 | Fast Hands / Kill Chain / Tracking Pixel | 12% · 7.0 |
| Operator | Big Process / Hive / Zombie Process | 10% · 4.3 | Long-running / Hydra / Supervisor | 10% · 3.8 |

## Crews in the farm (KESSLER-FARM-00)

You (a Demolitionist, played by the planner) and sim crewmates, everyone in blues with their subclass's stats, 20 seeds: the packs, then each crew boss, up to 4 tries each, everyone rested before a try. Each boss column is its wins over tries; Cleared is the seeds where all three fell; lowest anyone is the lowest share of Signal anyone in the crew reached (a lost try counts as 0); the Sysop column is the share of its cycles spent on a heal. A full crew is a Warden, a Sysop and a Payload with you (two damage dealers). The rows below it each take one thing away: the tank, the healer, everyone's SIGINT (`bots: { interrupt: false }`), or a damage dealer (a second Sysop instead). docs/bosses.md has what each role does.

| Level | Crew | Foreman | Heatsink | Coldwallet | Cleared | Lowest anyone | Fights someone dips under 40% | Sysop cycles healing | Cycles |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 18 | Warden + Sysop (4) | 20/20 | 20/20 | 20/20 | 20/20 | 30% | 58% | 46% | 17.6 |
| 18 | no tank (4) | 10/58 | 20/21 | 10/11 | 10/20 | 9% | 90% | 53% | 9.9 |
| 18 | no healer (4) | 20/20 | 17/35 | 17/17 | 17/20 | 14% | 83% | – | 13.8 |
| 18 | no SIGINT (4) | 0/80 | 19/37 | – | 0/20 | 1% | 100% | 58% | 11.7 |
| 18 | one damage (4) | 7/68 | 6/68 | 2/6 | 2/20 | 0% | 100% | 51% | 25.0 |
| 18 | Warden + Sysop (3) | 20/26 | 20/24 | 16/34 | 16/20 | 19% | 88% | 48% | 21.9 |
| 18 | Sysop (3) | 18/41 | 20/23 | 6/57 | 6/20 | 4% | 99% | 54% | 15.1 |
| 18 | Warden (3) | 20/20 | 18/44 | 18/18 | 18/20 | 19% | 80% | – | 14.7 |
| 18 | Sysop (2) | 20/26 | 20/21 | 16/33 | 16/20 | 18% | 81% | 46% | 18.2 |
| 30 | Warden + Sysop (4) | 20/20 | 20/20 | 20/20 | 20/20 | 43% | 55% | 63% | 15.8 |
| 30 | no tank (4) | 0/80 | 20/20 | – | 0/20 | 8% | 87% | 77% | 11.8 |
| 30 | no healer (4) | 20/20 | 19/34 | 19/19 | 19/20 | 17% | 78% | – | 12.8 |
| 30 | no SIGINT (4) | 0/80 | 20/20 | – | 0/20 | 4% | 98% | 77% | 10.6 |
| 30 | one damage (4) | 18/38 | 19/31 | 0/68 | 0/20 | 7% | 97% | 70% | 22.1 |
| 30 | Warden + Sysop (3) | 20/26 | 20/21 | 10/57 | 10/20 | 15% | 84% | 68% | 23.5 |
| 30 | Sysop (3) | 12/44 | 20/20 | 12/12 | 12/20 | 17% | 74% | 62% | 10.3 |
| 30 | Warden (3) | 20/20 | 17/40 | 17/17 | 17/20 | 18% | 68% | – | 13.1 |
| 30 | Sysop (2) | 20/20 | 20/20 | 20/42 | 20/20 | 23% | 80% | 67% | 19.1 |
