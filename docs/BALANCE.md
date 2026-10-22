# BLACKBOX class balance by level

One scripted planner for every class (it finishes bare or about-to-fire parts, answers attacks it cannot prevent, strips armor with small or spread hits, then finishes), playing each class’s own kit (from level 10 its default subclass: Demolitionist, Warden, Phantom, Herder; every subclass has its own table below). Each bracket: 20 random home intrusions at your level and the four guards at the deepest layer reached (your level + 2 per layer). Your numbers and theirs both grow 4% per level, and enemy hits on your Signal take the late step from level 10 (`CONFIG.runLate`: ×0.95 at 10, ×1 at 18, ×1.32 at 30, back to ×1.2 at 50) and their Integrity a smaller one (`CONFIG.runLateHp`: ×0.96 at 18, ×1.05 at 30, ×1 at 50), set against gear on one smooth item-level curve (gear.mjs `ITEM_CURVE`); misses follow the level gap (5% at your level). Talents as a player would have them: a point at level 10 and every 2 levels after, spent in a fixed order (14 points at 50, not the whole tree). Everyone loads a Tuned (blue) protocol in every open slot (4, 5 at 15, 6 at 30) at their level (an implant slot only from 15, where implants start to drop), from level 10 each carrying a stat its subclass chases, in turn (the subclass’s `chase` list: Damage and Crit for a Demolitionist, Restore and Clock Speed for a Sysop, Payload for the burn and helper classes…) except the no-gear column, which has none. Every blue carries a minor rule affix (gear.mjs RULES) and one numeric affix, the one its subclass chases. Crits are on for both sides (seeded). Every fight brings its tells (tells.mjs: moves a part announces ahead), and the planner reads and answers them. Health lost is a share of your own max. Scripted policies, not people.

| Bracket | Spike, no gear | Spike only | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|---:|---:|
| Lv 1 | 20/24 · 0 clean · 63% · 11.0c | 24/24 · 0 clean · 29% · 8.8c | 24/24 · 0 clean · 21% · 8.1c | 24/24 · 1 clean · 16% · 8.0c | 24/24 · 1 clean · 14% · 6.1c | 24/24 · 2 clean · 13% · 6.7c |
| Lv 10 | 3/24 · 1 clean · 93% · 7.5c | 6/24 · 0 clean · 88% · 8.8c | 23/24 · 0 clean · 39% · 7.8c | 24/24 · 1 clean · 31% · 10.8c | 22/24 · 2 clean · 40% · 9.0c | 24/24 · 6 clean · 17% · 6.6c |
| Lv 18 | 0/24 · 0 clean · 100% · 5.9c | 4/24 · 0 clean · 96% · 8.8c | 24/24 · 3 clean · 19% · 6.1c | 24/24 · 1 clean · 24% · 13.5c | 24/24 · 5 clean · 27% · 9.0c | 24/24 · 0 clean · 18% · 7.0c |
| Lv 30 | 3/24 · 0 clean · 95% · 5.6c | 5/24 · 0 clean · 89% · 8.4c | 24/24 · 2 clean · 23% · 6.1c | 24/24 · 1 clean · 22% · 12.8c | 24/24 · 11 clean · 18% · 6.6c | 24/24 · 1 clean · 16% · 5.6c |
| Lv 50 | 2/24 · 0 clean · 94% · 4.4c | 9/24 · 0 clean · 79% · 7.9c | 24/24 · 1 clean · 20% · 4.7c | 24/24 · 1 clean · 20% · 12.7c | 24/24 · 14 clean · 6% · 6.3c | 24/24 · 2 clean · 13% · 4.7c |

Cells: wins · clean kills (nothing got through: no damage, encryption included) · average health lost · average cycles.

## The hard slice

Every strain open at the level, six grade 2 wilds and six wilds two levels up.

| Bracket | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|
| Lv 1 | 12/12 · 57% · 11.2c | 11/12 · 47% · 10.4c | 12/12 · 26% · 7.4c | 12/12 · 43% · 9.8c |
| Lv 10 | 21/22 · 41% · 7.4c | 21/22 · 42% · 10.6c | 19/22 · 48% · 8.5c | 22/22 · 26% · 7.2c |
| Lv 18 | 23/23 · 21% · 5.4c | 22/23 · 35% · 13.0c | 23/23 · 18% · 8.3c | 23/23 · 19% · 6.8c |
| Lv 30 | 22/23 · 36% · 5.4c | 22/23 · 28% · 12.3c | 23/23 · 21% · 6.3c | 22/23 · 23% · 5.8c |
| Lv 50 | 23/23 · 24% · 4.5c | 23/23 · 24% · 11.6c | 23/23 · 14% · 7.0c | 23/23 · 19% · 4.0c |

## By subclass

The same fights for each of the eight subclasses (blues and the bracket's talents; the bar is the core four and the line's first three). Cells: health lost · wins.

| Bracket | Demolitionist | Overclocker | Warden | Sysop | Payload | Phantom | Herder | Hijacker |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Lv 10 | 39% · 23/24 | 50% · 22/24 | 31% · 24/24 | 32% · 22/24 | 17% · 24/24 | 40% · 22/24 | 17% · 24/24 | 23% · 24/24 |
| Lv 18 | 19% · 24/24 | 39% · 23/24 | 24% · 24/24 | 9% · 23/24 | 21% · 24/24 | 27% · 24/24 | 18% · 24/24 | 33% · 23/24 |
| Lv 30 | 23% · 24/24 | 31% · 23/24 | 22% · 24/24 | 2% · 24/24 | 18% · 24/24 | 18% · 24/24 | 16% · 24/24 | 24% · 23/24 |
| Lv 50 | 20% · 24/24 | 34% · 22/24 | 20% · 24/24 | 6% · 24/24 | 14% · 24/24 | 6% · 24/24 | 13% · 24/24 | 4% · 24/24 |

## Tells: reading them or not

The same fights for each subclass, by the planner that reads tells and by one that ignores them (`TELL.bots.answer = false`). Cells: health lost reading · ignoring (wins reading · ignoring). balance.test.mjs holds the gap at 12 points or more on average from Lv 10.

| Bracket | Demolitionist | Overclocker | Warden | Sysop | Payload | Phantom | Herder | Hijacker | Average gap |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Lv 10 | 39% · 41% (23 · 24) | 50% · 40% (22 · 24) | 31% · 34% (24 · 23) | 32% · 33% (22 · 22) | 17% · 24% (24 · 24) | 40% · 48% (22 · 22) | 17% · 21% (24 · 23) | 23% · 21% (24 · 24) | 1.8 |
| Lv 18 | 19% · 22% (24 · 24) | 39% · 42% (23 · 23) | 24% · 25% (24 · 24) | 9% · 8% (23 · 23) | 21% · 19% (24 · 24) | 27% · 27% (24 · 23) | 18% · 18% (24 · 24) | 33% · 29% (23 · 24) | -0.2 |
| Lv 30 | 23% · 25% (24 · 23) | 31% · 37% (23 · 22) | 22% · 33% (24 · 24) | 2% · 2% (24 · 24) | 18% · 21% (24 · 24) | 18% · 20% (24 · 23) | 16% · 18% (24 · 24) | 24% · 16% (23 · 24) | 2.2 |

Target (friction.mjs; a `todo` test in balance.test.mjs): a blue-geared fight at your level costs every subclass 35–45% of its health at levels 10, 18 and 30, subclasses within about 10 points.

## Skill use at level 50

- **Breaker:** shatter 26% · crack 19% · overload 16% · shaped-charge 11% · thermal-runaway 8% · flood 5% · rm-rf 4% · sigint 4% · spike 3% · backfire 2% · logic-bomb 1% · hold 1%
- **Bastion:** purge 21% · rate-limit 21% · reject 21% · blowback 9% · quarantine 7% · spike 7% · harden 5% · circuit-breaker 4% · bulkhead 3% · suspend 3% · sigint 0%
- **Infiltrator:** backdoor 23% · opening 20% · side-channel 18% · inject 9% · spike 8% · fingerprint 7% · sigint 7% · unmask 7% · shadow-copy 1% · null-route 1%
- **Operator:** botnet 23% · nohup 23% · hook 10% · fan-out 9% · deploy 7% · spike 6% · load-shed 5% · sigint 4% · kill-switch 4% · mesh 4% · hold 2% · spawn 2%

## Unlockable skills (level 50, whole tree)

Each one swapped into the fifth slot. Change vs the first five.

| Class | Skill | Wins | Health lost | Δ | Cycles | Δ |
|---|---|---:|---:|---:|---:|---:|
| Breaker | Shaped Charge | 24/24 | 22% | +2 | 5.8 | +1.1 |
| Breaker | Fork Bomb | 24/24 | 19% | -1 | 5.1 | +0.4 |
| Breaker | Debris Field | 23/24 | 34% | +15 | 7.3 | +2.6 |
| Breaker | Thermal Runaway | 24/24 | 19% | -0 | 6.3 | +1.6 |
| Breaker | Backfire | 23/24 | 27% | +8 | 6.6 | +1.9 |
| Breaker | Logic Bomb | 23/24 | 27% | +7 | 6.5 | +1.9 |
| Breaker | rm -rf | 23/24 | 28% | +9 | 6.5 | +1.9 |
| Breaker | Chain Reaction | 24/24 | 22% | +2 | 5.5 | +0.9 |
| Breaker | Bit Rot | 24/24 | 22% | +3 | 6.1 | +1.5 |
| Breaker | Zero-day | 24/24 | 14% | -6 | 4.9 | +0.3 |
| Bastion | Suspend | 24/24 | 25% | +5 | 12.0 | -0.7 |
| Bastion | Bulkhead | 24/24 | 26% | +6 | 11.6 | -1.0 |
| Bastion | Blowback | 24/24 | 30% | +10 | 10.9 | -1.8 |
| Bastion | Harden | 24/24 | 27% | +8 | 11.6 | -1.1 |
| Bastion | Quarantine | 24/24 | 26% | +7 | 11.9 | -0.8 |
| Bastion | Throttle | 24/24 | 23% | +3 | 11.8 | -0.9 |
| Bastion | Circuit Breaker | 24/24 | 27% | +7 | 11.8 | -0.8 |
| Bastion | DMZ | 23/24 | 34% | +15 | 12.0 | -0.7 |
| Bastion | Honeypot | 24/24 | 30% | +10 | 12.2 | -0.5 |
| Bastion | Failover | 24/24 | 29% | +9 | 11.7 | -1.0 |
| Infiltrator | Null Route | 24/24 | 11% | +4 | 7.6 | +1.3 |
| Infiltrator | Opening | 24/24 | 12% | +5 | 7.8 | +1.5 |
| Infiltrator | Backstab | 24/24 | 13% | +7 | 7.6 | +1.3 |
| Infiltrator | Side Channel | 24/24 | 10% | +3 | 5.9 | -0.4 |
| Infiltrator | Shadow Copy | 24/24 | 10% | +4 | 7.6 | +1.3 |
| Infiltrator | Spoof | 24/24 | 13% | +6 | 7.5 | +1.2 |
| Infiltrator | Rotate Keys | 24/24 | 12% | +6 | 7.7 | +1.3 |
| Infiltrator | Log Wipe | 24/24 | 12% | +6 | 7.7 | +1.3 |
| Infiltrator | Unmask | 24/24 | 17% | +10 | 6.8 | +0.4 |
| Infiltrator | Vanish | 24/24 | 13% | +7 | 7.7 | +1.4 |
| Infiltrator | Rootkit Implant | 24/24 | 20% | +14 | 8.1 | +1.8 |
| Operator | nohup | 24/24 | 13% | -1 | 4.8 | +0.2 |
| Operator | Kill Switch | 24/24 | 13% | -0 | 5.5 | +0.8 |
| Operator | Load Shed | 24/24 | 15% | +2 | 5.8 | +1.2 |
| Operator | Fork | 24/24 | 14% | +1 | 5.0 | +0.3 |
| Operator | Mesh | 24/24 | 8% | -5 | 3.9 | -0.8 |
| Operator | Garbage Collect | 24/24 | 13% | -0 | 5.5 | +0.8 |
| Operator | Malloc | 24/24 | 25% | +12 | 5.9 | +1.3 |
| Operator | Crontab | 24/24 | 20% | +7 | 5.4 | +0.8 |
| Operator | OOM Kill | 24/24 | 13% | -0 | 5.5 | +0.8 |
| Operator | Cron Storm | 24/24 | 13% | -0 | 5.5 | +0.8 |

## Every maxed build (level 50, all ranks)

| Class | Best build | Health lost · cycles | Worst build | Health lost · cycles |
|---|---|---:|---|---:|
| Breaker | Exposed Wiring / Meltdown / Scorched Earth | 18% · 4.7 | Exposed Wiring / Cascade Failure / Total Overkill | 20% · 4.9 |
| Bastion | Tarpit / Counterflow / Uptime | 20% · 12.7 | Deep Packet Inspection / Write Protect / Kernel Panic | 25% · 12.6 |
| Infiltrator | Blind Spot / Kill Chain / Deep Cover | 6% · 6.4 | Fast Hands / Ghost Route / Tracking Pixel | 8% · 5.9 |
| Operator | Big Process / Hydra / Zombie Process | 12% · 3.9 | Big Process / Hive / Supervisor | 14% · 5.0 |

## Crews in the farm (KESSLER-FARM-00)

You (a Demolitionist, played by the planner) and sim crewmates, everyone in blues with their subclass's stats, 20 seeds: the packs, then each crew boss, up to 4 tries each, everyone rested before a try. Each boss column is its wins over tries; Cleared is the seeds where all three fell; lowest anyone is the lowest share of Signal anyone in the crew reached (a lost try counts as 0); the Sysop column is the share of its cycles spent on a heal. A full crew is a Warden, a Sysop and a Payload with you (two damage dealers). The rows below it each take one thing away: the tank, the healer, everyone's SIGINT (`bots: { interrupt: false }`), or a damage dealer (a second Sysop instead). docs/bosses.md has what each role does.

| Level | Crew | Foreman | Heatsink | Coldwallet | Cleared | Lowest anyone | Fights someone dips under 40% | Sysop cycles healing | Cycles |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 18 | Warden + Sysop (4) | 20/20 | 20/22 | 20/20 | 20/20 | 31% | 55% | 46% | 17.6 |
| 18 | no tank (4) | 15/49 | 20/20 | 15/15 | 15/20 | 11% | 87% | 50% | 11.3 |
| 18 | no healer (4) | 20/20 | 19/29 | 19/19 | 19/20 | 15% | 84% | – | 13.6 |
| 18 | no SIGINT (4) | 0/80 | 20/22 | – | 0/20 | 3% | 99% | 55% | 11.0 |
| 18 | one damage (4) | 11/62 | 8/69 | 1/17 | 1/20 | 0% | 100% | 48% | 24.8 |
| 18 | Warden + Sysop (3) | 19/29 | 20/21 | 13/46 | 13/20 | 14% | 91% | 48% | 22.0 |
| 18 | Sysop (3) | 18/38 | 20/21 | 9/49 | 9/20 | 5% | 98% | 50% | 15.6 |
| 18 | Warden (3) | 20/20 | 19/36 | 19/19 | 19/20 | 20% | 77% | – | 14.9 |
| 18 | Sysop (2) | 19/29 | 20/20 | 14/35 | 14/20 | 17% | 81% | 46% | 18.5 |
| 30 | Warden + Sysop (4) | 20/20 | 20/20 | 20/20 | 20/20 | 44% | 53% | 64% | 16.1 |
| 30 | no tank (4) | 0/80 | 20/20 | – | 0/20 | 8% | 91% | 67% | 11.9 |
| 30 | no healer (4) | 20/20 | 20/30 | 20/20 | 20/20 | 19% | 74% | – | 12.6 |
| 30 | no SIGINT (4) | 0/80 | 20/21 | – | 0/20 | 5% | 93% | 66% | 10.7 |
| 30 | one damage (4) | 18/38 | 20/26 | 0/72 | 0/20 | 10% | 90% | 65% | 22.1 |
| 30 | Warden + Sysop (3) | 19/37 | 20/20 | 13/56 | 13/20 | 16% | 80% | 65% | 23.7 |
| 30 | Sysop (3) | 18/37 | 20/20 | 18/18 | 18/20 | 19% | 69% | 57% | 11.9 |
| 30 | Warden (3) | 20/20 | 19/36 | 19/19 | 19/20 | 19% | 69% | – | 13.7 |
| 30 | Sysop (2) | 20/20 | 20/20 | 7/67 | 7/20 | 16% | 82% | 67% | 17.7 |
