# BLACKBOX class balance by level

One scripted planner for every class (it finishes bare or about-to-fire parts, answers attacks it cannot prevent, strips armor with small or spread hits, then finishes), playing each class’s own kit (from level 10 one subclass a class, data.mjs `defaultSub`: Demolitionist, Warden, Phantom, Herder; every subclass has its own table below). Each bracket: 20 random wild fights at your level and the four guards (Watchdog, Sentinel, Crawler, Shredder) at the bracket’s guard level (1, 9, 18, 18, 28). Your numbers and theirs both grow 4% per level, and enemy hits on your Signal take the late step from level 10 (`CONFIG.runLate`: ×0.95 at 10, ×1 at 18, ×1.32 at 30, back to ×1.2 at 50) and their Integrity a smaller one (`CONFIG.runLateHp`: ×0.96 at 18, ×1.05 at 30, ×1 at 50), set against gear on one smooth item-level curve (gear.mjs `ITEM_CURVE`); misses follow the level gap (5% at your level). Talents as a player would have them: a point at level 10 and every 2 levels after, spent in a fixed order (14 points at 50, not the whole tree). Everyone loads a Tuned (blue) protocol in every open slot (4, 5 at 15, 6 at 30) at their level (an implant slot only from 15, where implants start to drop), from level 10 each carrying a stat its subclass chases, in turn (the subclass’s `chase` list: Damage and Crit for a Demolitionist, Restore and Clock Speed for a Sysop, Payload for the burn and helper classes…) except the no-gear column, which has none. Every blue carries a minor rule affix (gear.mjs RULES) and one numeric affix, the one its subclass chases. Crits are on for both sides (seeded). Every fight brings its tells (tells.mjs: moves a part announces ahead), and the planner reads and answers them. Health lost is a share of your own max. Scripted policies, not people.

| Bracket | Spike, no gear | Spike only | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|---:|---:|
| Lv 1 | 20/24 · 0 clean · 63% · 11.0c | 24/24 · 0 clean · 29% · 8.8c | 24/24 · 0 clean · 21% · 8.1c | 24/24 · 1 clean · 16% · 8.0c | 24/24 · 1 clean · 14% · 6.1c | 24/24 · 2 clean · 13% · 6.7c |
| Lv 10 | 3/24 · 1 clean · 91% · 6.9c | 6/24 · 0 clean · 87% · 8.8c | 23/24 · 0 clean · 37% · 8.5c | 24/24 · 0 clean · 30% · 11.9c | 24/24 · 2 clean · 33% · 10.0c | 24/24 · 8 clean · 16% · 7.2c |
| Lv 18 | 1/24 · 0 clean · 100% · 6.6c | 6/24 · 0 clean · 94% · 9.5c | 24/24 · 2 clean · 24% · 6.3c | 24/24 · 3 clean · 22% · 15.8c | 24/24 · 5 clean · 27% · 9.4c | 24/24 · 3 clean · 16% · 8.1c |
| Lv 30 | 3/24 · 0 clean · 95% · 5.8c | 5/24 · 0 clean · 89% · 8.6c | 23/24 · 1 clean · 30% · 6.9c | 24/24 · 3 clean · 28% · 14.6c | 24/24 · 8 clean · 17% · 7.3c | 24/24 · 2 clean · 18% · 5.8c |
| Lv 50 | 2/24 · 0 clean · 93% · 4.3c | 12/24 · 0 clean · 75% · 8.3c | 23/24 · 5 clean · 20% · 4.9c | 24/24 · 1 clean · 29% · 14.6c | 24/24 · 12 clean · 12% · 7.1c | 24/24 · 0 clean · 15% · 5.3c |

Cells: wins · clean kills (nothing got through: no damage, encryption included) · average health lost · average cycles.

## The hard slice

Every strain open at the level, six grade 2 wilds and six wilds two levels up.

| Bracket | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|
| Lv 1 | 12/12 · 57% · 11.2c | 11/12 · 47% · 10.4c | 12/12 · 26% · 7.4c | 12/12 · 43% · 9.8c |
| Lv 10 | 19/22 · 42% · 7.5c | 19/22 · 47% · 10.9c | 20/22 · 50% · 9.3c | 21/22 · 32% · 7.8c |
| Lv 18 | 37/37 · 21% · 5.6c | 36/37 · 39% · 15.3c | 36/37 · 27% · 8.9c | 36/37 · 30% · 7.8c |
| Lv 30 | 42/45 · 36% · 6.5c | 43/45 · 36% · 14.4c | 43/45 · 28% · 7.9c | 44/45 · 27% · 6.0c |
| Lv 50 | 45/45 · 21% · 4.4c | 45/45 · 27% · 13.6c | 43/45 · 19% · 8.6c | 45/45 · 17% · 4.2c |

## By subclass

The same fights for each of the eight subclasses (blues and the bracket's talents; the bar is the core four and the line's first three). Cells: health lost · wins.

| Bracket | Demolitionist | Overclocker | Warden | Sysop | Payload | Phantom | Herder | Hijacker |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Lv 10 | 37% · 23/24 | 40% · 22/24 | 30% · 24/24 | 26% · 24/24 | 20% · 24/24 | 33% · 24/24 | 16% · 24/24 | 22% · 24/24 |
| Lv 18 | 24% · 24/24 | 36% · 23/24 | 22% · 24/24 | 8% · 23/24 | 26% · 24/24 | 27% · 24/24 | 16% · 24/24 | 37% · 23/24 |
| Lv 30 | 30% · 23/24 | 28% · 23/24 | 28% · 24/24 | 6% · 24/24 | 22% · 24/24 | 17% · 24/24 | 18% · 24/24 | 31% · 22/24 |
| Lv 50 | 20% · 23/24 | 31% · 23/24 | 29% · 24/24 | 3% · 24/24 | 18% · 24/24 | 12% · 24/24 | 15% · 24/24 | 9% · 23/24 |

## Tells: reading them or not

The same fights for each subclass, by the planner that reads tells and by one that ignores them (`TELL.bots.answer = false`). Cells: health lost reading · ignoring (wins reading · ignoring). balance.test.mjs holds the gap at 12 points or more on average from Lv 10.

| Bracket | Demolitionist | Overclocker | Warden | Sysop | Payload | Phantom | Herder | Hijacker | Average gap |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Lv 10 | 37% · 35% (23 · 23) | 40% · 42% (22 · 24) | 30% · 29% (24 · 24) | 26% · 33% (24 · 22) | 20% · 24% (24 · 24) | 33% · 43% (24 · 22) | 16% · 24% (24 · 23) | 22% · 26% (24 · 24) | 4.0 |
| Lv 18 | 24% · 29% (24 · 23) | 36% · 38% (23 · 24) | 22% · 28% (24 · 24) | 8% · 14% (23 · 24) | 26% · 30% (24 · 24) | 27% · 34% (24 · 23) | 16% · 18% (24 · 24) | 37% · 37% (23 · 23) | 3.8 |
| Lv 30 | 30% · 32% (23 · 22) | 28% · 34% (23 · 21) | 28% · 37% (24 · 23) | 6% · 6% (24 · 24) | 22% · 23% (24 · 24) | 17% · 26% (24 · 24) | 18% · 20% (24 · 24) | 31% · 25% (22 · 22) | 3.0 |

Target (friction.mjs; a `todo` test in balance.test.mjs): a blue-geared fight at your level costs every subclass 35–45% of its health at levels 10, 18 and 30, subclasses within about 10 points.

## Skill use at level 50

- **Breaker:** shatter 28% · crack 18% · overload 17% · shaped-charge 11% · thermal-runaway 9% · flood 9% · spike 3% · sigint 3% · logic-bomb 1% · backfire 1%
- **Bastion:** rate-limit 21% · purge 19% · reject 18% · spike 11% · blowback 10% · harden 6% · quarantine 4% · bulkhead 4% · circuit-breaker 3% · sigint 3% · suspend 1%
- **Infiltrator:** backdoor 22% · opening 21% · side-channel 16% · inject 9% · fingerprint 9% · unmask 8% · sigint 5% · spike 5% · shadow-copy 2% · backstab 2% · null-route 1% · hold 1%
- **Operator:** nohup 25% · botnet 20% · hook 15% · spike 11% · fan-out 8% · deploy 4% · load-shed 3% · kill-switch 3% · sigint 3% · mesh 3% · hold 2% · spawn 2%

## Each skill beside the core four (level 50)

A five-key bar: the core four and that skill. Δ against the full bar above.

| Class | Skill | Wins | Health lost | Δ | Cycles | Δ |
|---|---|---:|---:|---:|---:|---:|
| Breaker | Shaped Charge | 24/24 | 27% | +7 | 6.8 | +1.8 |
| Breaker | Fork Bomb | 24/24 | 23% | +3 | 5.8 | +0.9 |
| Breaker | Debris Field | 23/24 | 29% | +9 | 7.5 | +2.6 |
| Breaker | Thermal Runaway | 23/24 | 22% | +2 | 6.7 | +1.8 |
| Breaker | Backfire | 23/24 | 27% | +7 | 7.3 | +2.3 |
| Breaker | Logic Bomb | 23/24 | 27% | +7 | 7.1 | +2.2 |
| Breaker | rm -rf | 23/24 | 27% | +7 | 7.1 | +2.2 |
| Breaker | Chain Reaction | 23/24 | 25% | +5 | 5.9 | +1.0 |
| Breaker | Bit Rot | 24/24 | 23% | +3 | 7.0 | +2.0 |
| Breaker | Zero-day | 24/24 | 17% | -3 | 5.7 | +0.8 |
| Bastion | Suspend | 24/24 | 30% | +0 | 14.2 | -0.4 |
| Bastion | Bulkhead | 24/24 | 32% | +2 | 14.5 | -0.0 |
| Bastion | Blowback | 23/24 | 33% | +3 | 12.9 | -1.7 |
| Bastion | Harden | 24/24 | 30% | +1 | 14.3 | -0.3 |
| Bastion | Quarantine | 23/24 | 28% | -1 | 13.9 | -0.7 |
| Bastion | Throttle | 24/24 | 29% | -0 | 14.7 | +0.1 |
| Bastion | Circuit Breaker | 23/24 | 33% | +4 | 14.3 | -0.3 |
| Bastion | DMZ | 23/24 | 33% | +3 | 14.3 | -0.3 |
| Bastion | Honeypot | 24/24 | 32% | +3 | 14.3 | -0.3 |
| Bastion | Failover | 24/24 | 33% | +4 | 14.1 | -0.5 |
| Infiltrator | Null Route | 24/24 | 13% | +1 | 8.2 | +1.0 |
| Infiltrator | Opening | 24/24 | 17% | +5 | 8.9 | +1.8 |
| Infiltrator | Backstab | 24/24 | 17% | +5 | 8.5 | +1.4 |
| Infiltrator | Side Channel | 24/24 | 10% | -2 | 7.1 | -0.0 |
| Infiltrator | Shadow Copy | 24/24 | 13% | +1 | 8.2 | +1.0 |
| Infiltrator | Spoof | 24/24 | 15% | +3 | 8.4 | +1.3 |
| Infiltrator | Rotate Keys | 24/24 | 16% | +4 | 8.6 | +1.5 |
| Infiltrator | Log Wipe | 24/24 | 14% | +2 | 8.4 | +1.3 |
| Infiltrator | Unmask | 24/24 | 14% | +2 | 6.9 | -0.3 |
| Infiltrator | Vanish | 24/24 | 14% | +2 | 8.4 | +1.3 |
| Infiltrator | Rootkit Implant | 23/24 | 20% | +8 | 9.2 | +2.1 |
| Operator | nohup | 24/24 | 15% | -0 | 5.7 | +0.4 |
| Operator | Kill Switch | 24/24 | 16% | +1 | 6.5 | +1.3 |
| Operator | Load Shed | 24/24 | 15% | +0 | 6.6 | +1.3 |
| Operator | Fork | 24/24 | 16% | +1 | 5.5 | +0.3 |
| Operator | Mesh | 24/24 | 14% | -2 | 4.8 | -0.5 |
| Operator | Garbage Collect | 24/24 | 14% | -1 | 6.0 | +0.8 |
| Operator | Malloc | 23/24 | 30% | +15 | 6.1 | +0.8 |
| Operator | Crontab | 24/24 | 20% | +5 | 6.0 | +0.7 |
| Operator | OOM Kill | 24/24 | 14% | -1 | 6.5 | +1.2 |
| Operator | Cron Storm | 24/24 | 15% | -1 | 6.4 | +1.1 |

## Every talent pick (level 50)

The eight combinations of the three picks, in the default subclass.

| Class | Best build | Health lost · cycles | Worst build | Health lost · cycles |
|---|---|---:|---|---:|
| Breaker | Cluster Charge / Meltdown / Scorched Earth | 20% · 4.6 | Exposed Wiring / Cascade Failure / Scorched Earth | 25% · 5.1 |
| Bastion | Tarpit / Counterflow / Kernel Panic | 29% · 14.5 | Deep Packet Inspection / Write Protect / Uptime | 34% · 14.5 |
| Infiltrator | Fast Hands / Ghost Route / Deep Cover | 9% · 6.8 | Blind Spot / Kill Chain / Tracking Pixel | 12% · 7.0 |
| Operator | Big Process / Hydra / Zombie Process | 14% · 4.1 | Long-running / Hive / Supervisor | 15% · 5.8 |

## Crews in the farm (KESSLER-FARM-00)

You (a Demolitionist, played by the planner) and sim crewmates, everyone in blues with their subclass's stats, 20 seeds: the packs, then each crew boss, up to 4 tries each, everyone rested before a try. Each boss column is its wins over tries; Cleared is the seeds where all three fell; lowest anyone is the lowest share of Signal anyone in the crew reached (a lost try counts as 0); the Sysop column is the share of its cycles spent on a heal. A full crew is a Warden, a Sysop and a Payload with you (two damage dealers). The rows below it each take one thing away: the tank, the healer, everyone's SIGINT (`bots: { interrupt: false }`), or a damage dealer (a second Sysop instead). docs/bosses.md has what each role does.

| Level | Crew | Foreman | Heatsink | Coldwallet | Cleared | Lowest anyone | Fights someone dips under 40% | Sysop cycles healing | Cycles |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 18 | Warden + Sysop (4) | 20/20 | 20/22 | 20/20 | 20/20 | 30% | 66% | 47% | 17.3 |
| 18 | no tank (4) | 16/39 | 20/21 | 16/16 | 16/20 | 11% | 88% | 51% | 12.6 |
| 18 | no healer (4) | 20/20 | 20/34 | 20/20 | 20/20 | 12% | 85% | – | 14.0 |
| 18 | no SIGINT (4) | 0/80 | 20/24 | – | 0/20 | 1% | 99% | 54% | 11.2 |
| 18 | one damage (4) | 9/67 | 6/66 | 0/16 | 0/20 | 1% | 100% | 48% | 24.8 |
| 18 | Warden + Sysop (3) | 20/24 | 20/22 | 20/22 | 20/20 | 23% | 79% | 47% | 22.7 |
| 18 | Sysop (3) | 19/32 | 20/24 | 18/27 | 18/20 | 10% | 94% | 51% | 15.2 |
| 18 | Warden (3) | 20/20 | 17/38 | 17/17 | 17/20 | 19% | 81% | – | 14.7 |
| 18 | Sysop (2) | 19/27 | 19/19 | 15/30 | 15/20 | 14% | 87% | 47% | 18.5 |
| 30 | Warden + Sysop (4) | 20/20 | 20/20 | 20/21 | 20/20 | 40% | 52% | 65% | 16.3 |
| 30 | no tank (4) | 0/80 | 20/20 | – | 0/20 | 8% | 88% | 66% | 11.9 |
| 30 | no healer (4) | 20/20 | 19/26 | 19/19 | 19/20 | 15% | 85% | – | 12.5 |
| 30 | no SIGINT (4) | 0/80 | 20/21 | – | 0/20 | 5% | 98% | 65% | 10.6 |
| 30 | one damage (4) | 17/46 | 20/28 | 5/55 | 5/20 | 9% | 88% | 68% | 22.5 |
| 30 | Warden + Sysop (3) | 20/30 | 20/20 | 20/26 | 20/20 | 28% | 63% | 63% | 22.6 |
| 30 | Sysop (3) | 15/40 | 20/20 | 15/22 | 15/20 | 14% | 80% | 60% | 11.5 |
| 30 | Warden (3) | 20/20 | 20/33 | 20/20 | 20/20 | 19% | 79% | – | 14.1 |
| 30 | Sysop (2) | 20/21 | 20/20 | 18/37 | 18/20 | 24% | 74% | 68% | 18.3 |
