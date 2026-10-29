# BLACKBOX class balance by level

One scripted planner for every class (it finishes bare or about-to-fire parts, answers attacks it cannot prevent, strips armor with small or spread hits, then finishes), playing each class’s own kit (from level 10 one subclass a class, data.mjs `defaultSub`: Demolitionist, Warden, Phantom, Herder; every subclass has its own table below). Each bracket: 20 random wild fights at your level and the four guards (Watchdog, Sentinel, Crawler, Shredder) at the bracket’s guard level (1, 9, 18, 18, 28). Your numbers and theirs both grow 4% per level, and enemy hits on your Signal take the late step from level 10 (`CONFIG.runLate`: ×0.95 at 10, ×1 at 18, ×1.32 at 30, back to ×1.2 at 50) and their Integrity a smaller one (`CONFIG.runLateHp`: ×0.96 at 18, ×1.05 at 30, ×1 at 50), set against gear on one smooth item-level curve (gear.mjs `ITEM_CURVE`); misses follow the level gap (5% at your level). Talents as a player would have them: a point at level 10 and every 2 levels after, spent in a fixed order (14 points at 50, not the whole tree). Everyone loads a Tuned (blue) protocol in every open slot (4, 5 at 15, 6 at 30) at their level (an implant slot only from 15, where implants start to drop), from level 10 each carrying a stat its subclass chases, in turn (the subclass’s `chase` list: Damage and Crit for a Demolitionist, Restore and Clock Speed for a Sysop, Payload for the burn and helper classes…) except the no-gear column, which has none. Every blue carries a minor rule affix (gear.mjs RULES) and one numeric affix, the one its subclass chases. Crits are on for both sides (seeded). Every fight brings its tells (tells.mjs: moves a part announces ahead), and the planner reads and answers them. Health lost is a share of your own max. Scripted policies, not people.

| Bracket | Spike, no gear | Spike only | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|---:|---:|
| Lv 1 | 20/24 · 0 clean · 63% · 11.0c | 24/24 · 0 clean · 29% · 8.8c | 24/24 · 0 clean · 21% · 8.1c | 24/24 · 1 clean · 16% · 8.0c | 24/24 · 1 clean · 14% · 6.1c | 24/24 · 2 clean · 13% · 6.7c |
| Lv 10 | 3/24 · 1 clean · 91% · 6.9c | 6/24 · 0 clean · 87% · 8.8c | 23/24 · 0 clean · 37% · 8.5c | 24/24 · 0 clean · 30% · 11.9c | 24/24 · 2 clean · 33% · 10.0c | 24/24 · 8 clean · 16% · 7.2c |
| Lv 18 | 1/24 · 0 clean · 100% · 6.4c | 5/24 · 0 clean · 94% · 9.0c | 24/24 · 2 clean · 28% · 6.1c | 24/24 · 4 clean · 20% · 15.2c | 24/24 · 6 clean · 27% · 8.7c | 24/24 · 2 clean · 17% · 8.1c |
| Lv 30 | 3/24 · 0 clean · 95% · 5.8c | 4/24 · 0 clean · 90% · 8.2c | 24/24 · 1 clean · 26% · 6.5c | 24/24 · 3 clean · 25% · 14.0c | 24/24 · 10 clean · 19% · 7.0c | 24/24 · 2 clean · 19% · 6.3c |
| Lv 50 | 2/24 · 0 clean · 93% · 4.0c | 9/24 · 0 clean · 79% · 7.8c | 24/24 · 5 clean · 18% · 4.6c | 24/24 · 2 clean · 24% · 13.9c | 24/24 · 11 clean · 13% · 7.3c | 24/24 · 1 clean · 15% · 5.1c |

Cells: wins · clean kills (nothing got through: no damage, encryption included) · average health lost · average cycles.

## The hard slice

Every strain open at the level, six grade 2 wilds and six wilds two levels up.

| Bracket | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|
| Lv 1 | 12/12 · 57% · 11.2c | 11/12 · 47% · 10.4c | 12/12 · 26% · 7.4c | 12/12 · 43% · 9.8c |
| Lv 10 | 20/22 · 38% · 7.4c | 19/22 · 47% · 11.0c | 19/22 · 53% · 9.4c | 21/22 · 32% · 7.9c |
| Lv 18 | 23/23 · 19% · 5.4c | 23/23 · 26% · 14.2c | 23/23 · 20% · 8.5c | 22/23 · 24% · 7.3c |
| Lv 30 | 21/23 · 36% · 5.7c | 22/23 · 29% · 12.9c | 22/23 · 24% · 6.7c | 22/23 · 23% · 5.8c |
| Lv 50 | 23/23 · 23% · 4.5c | 23/23 · 27% · 12.7c | 23/23 · 15% · 6.6c | 23/23 · 17% · 4.7c |

## By subclass

The same fights for each of the eight subclasses (blues and the bracket's talents; the bar is the core four and the line's first three). Cells: health lost · wins.

| Bracket | Demolitionist | Overclocker | Warden | Sysop | Payload | Phantom | Herder | Hijacker |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Lv 10 | 37% · 23/24 | 40% · 22/24 | 30% · 24/24 | 26% · 24/24 | 20% · 24/24 | 33% · 24/24 | 16% · 24/24 | 22% · 24/24 |
| Lv 18 | 28% · 24/24 | 35% · 23/24 | 20% · 24/24 | 5% · 23/24 | 23% · 24/24 | 27% · 24/24 | 17% · 24/24 | 36% · 23/24 |
| Lv 30 | 26% · 24/24 | 28% · 23/24 | 25% · 24/24 | 5% · 24/24 | 21% · 24/24 | 19% · 24/24 | 19% · 24/24 | 26% · 22/24 |
| Lv 50 | 18% · 24/24 | 38% · 22/24 | 24% · 24/24 | 4% · 24/24 | 21% · 24/24 | 13% · 24/24 | 15% · 24/24 | 7% · 24/24 |

## Tells: reading them or not

The same fights for each subclass, by the planner that reads tells and by one that ignores them (`TELL.bots.answer = false`). Cells: health lost reading · ignoring (wins reading · ignoring). balance.test.mjs holds the gap at 12 points or more on average from Lv 10.

| Bracket | Demolitionist | Overclocker | Warden | Sysop | Payload | Phantom | Herder | Hijacker | Average gap |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Lv 10 | 37% · 35% (23 · 23) | 40% · 42% (22 · 24) | 30% · 29% (24 · 24) | 26% · 33% (24 · 22) | 20% · 24% (24 · 24) | 33% · 43% (24 · 22) | 16% · 24% (24 · 23) | 22% · 26% (24 · 24) | 4.0 |
| Lv 18 | 28% · 30% (24 · 24) | 35% · 38% (23 · 24) | 20% · 24% (24 · 24) | 5% · 10% (23 · 24) | 23% · 31% (24 · 24) | 27% · 32% (24 · 23) | 17% · 22% (24 · 24) | 36% · 36% (23 · 23) | 3.9 |
| Lv 30 | 26% · 31% (24 · 23) | 28% · 32% (23 · 23) | 25% · 33% (24 · 23) | 5% · 5% (24 · 24) | 21% · 25% (24 · 24) | 19% · 23% (24 · 23) | 19% · 22% (24 · 24) | 26% · 16% (22 · 24) | 2.3 |

Target (friction.mjs; a `todo` test in balance.test.mjs): a blue-geared fight at your level costs every subclass 35–45% of its health at levels 10, 18 and 30, subclasses within about 10 points.

## Skill use at level 50

- **Breaker:** shatter 26% · overload 20% · crack 18% · shaped-charge 13% · thermal-runaway 8% · flood 8% · sigint 4% · spike 2% · logic-bomb 1% · backfire 1%
- **Bastion:** reject 20% · purge 20% · rate-limit 20% · spike 11% · blowback 8% · quarantine 6% · harden 5% · sigint 4% · circuit-breaker 3% · bulkhead 2% · suspend 1%
- **Infiltrator:** opening 21% · backdoor 21% · side-channel 14% · fingerprint 10% · inject 9% · unmask 7% · spike 7% · sigint 6% · shadow-copy 3% · backstab 1% · null-route 1% · hold 1%
- **Operator:** nohup 26% · botnet 22% · hook 14% · fan-out 10% · spike 9% · load-shed 6% · deploy 6% · sigint 4% · hold 2% · kill-switch 1% · spawn 1%

## Each skill beside the core four (level 50)

A five-key bar: the core four and that skill. Δ against the full bar above.

| Class | Skill | Wins | Health lost | Δ | Cycles | Δ |
|---|---|---:|---:|---:|---:|---:|
| Breaker | Shaped Charge | 24/24 | 25% | +7 | 6.2 | +1.5 |
| Breaker | Fork Bomb | 24/24 | 25% | +8 | 5.8 | +1.2 |
| Breaker | Debris Field | 23/24 | 36% | +18 | 7.8 | +3.2 |
| Breaker | Thermal Runaway | 24/24 | 23% | +5 | 6.8 | +2.2 |
| Breaker | Backfire | 23/24 | 31% | +14 | 7.2 | +2.5 |
| Breaker | Logic Bomb | 23/24 | 31% | +13 | 7.0 | +2.4 |
| Breaker | rm -rf | 23/24 | 31% | +14 | 7.1 | +2.5 |
| Breaker | Chain Reaction | 24/24 | 27% | +9 | 5.8 | +1.1 |
| Breaker | Bit Rot | 24/24 | 25% | +7 | 6.8 | +2.1 |
| Breaker | Zero-day | 24/24 | 15% | -3 | 5.6 | +1.0 |
| Bastion | Suspend | 24/24 | 28% | +4 | 13.6 | -0.3 |
| Bastion | Bulkhead | 24/24 | 28% | +4 | 13.7 | -0.2 |
| Bastion | Blowback | 24/24 | 31% | +7 | 12.5 | -1.3 |
| Bastion | Harden | 24/24 | 30% | +6 | 13.4 | -0.5 |
| Bastion | Quarantine | 24/24 | 25% | +1 | 13.5 | -0.4 |
| Bastion | Throttle | 24/24 | 28% | +3 | 13.6 | -0.3 |
| Bastion | Circuit Breaker | 24/24 | 32% | +8 | 13.6 | -0.3 |
| Bastion | DMZ | 23/24 | 37% | +13 | 14.0 | +0.1 |
| Bastion | Honeypot | 24/24 | 30% | +6 | 13.5 | -0.4 |
| Bastion | Failover | 24/24 | 32% | +8 | 13.1 | -0.8 |
| Infiltrator | Null Route | 24/24 | 13% | +0 | 7.9 | +0.6 |
| Infiltrator | Opening | 24/24 | 16% | +3 | 8.8 | +1.5 |
| Infiltrator | Backstab | 24/24 | 16% | +3 | 7.8 | +0.5 |
| Infiltrator | Side Channel | 24/24 | 11% | -2 | 7.1 | -0.2 |
| Infiltrator | Shadow Copy | 24/24 | 13% | +0 | 8.0 | +0.7 |
| Infiltrator | Spoof | 24/24 | 14% | +1 | 8.0 | +0.7 |
| Infiltrator | Rotate Keys | 24/24 | 17% | +4 | 8.5 | +1.2 |
| Infiltrator | Log Wipe | 24/24 | 16% | +3 | 7.9 | +0.6 |
| Infiltrator | Unmask | 24/24 | 14% | +1 | 7.0 | -0.3 |
| Infiltrator | Vanish | 24/24 | 14% | +1 | 8.2 | +0.9 |
| Infiltrator | Rootkit Implant | 24/24 | 22% | +9 | 9.0 | +1.7 |
| Operator | nohup | 24/24 | 13% | -1 | 5.5 | +0.4 |
| Operator | Kill Switch | 24/24 | 13% | -1 | 6.5 | +1.4 |
| Operator | Load Shed | 24/24 | 16% | +1 | 6.5 | +1.4 |
| Operator | Fork | 24/24 | 16% | +1 | 5.3 | +0.2 |
| Operator | Mesh | 24/24 | 11% | -4 | 4.5 | -0.6 |
| Operator | Garbage Collect | 24/24 | 13% | -1 | 5.8 | +0.7 |
| Operator | Malloc | 24/24 | 30% | +15 | 6.7 | +1.5 |
| Operator | Crontab | 24/24 | 23% | +9 | 6.1 | +1.0 |
| Operator | OOM Kill | 24/24 | 13% | -1 | 6.3 | +1.2 |
| Operator | Cron Storm | 24/24 | 13% | -1 | 6.3 | +1.1 |

## Every talent pick (level 50)

The eight combinations of the three picks, in the default subclass.

| Class | Best build | Health lost · cycles | Worst build | Health lost · cycles |
|---|---|---:|---|---:|
| Breaker | Cluster Charge / Cascade Failure / Total Overkill | 18% · 4.6 | Exposed Wiring / Cascade Failure / Scorched Earth | 23% · 5.0 |
| Bastion | Tarpit / Counterflow / Kernel Panic | 24% · 13.8 | Deep Packet Inspection / Write Protect / Uptime | 28% · 13.8 |
| Infiltrator | Fast Hands / Ghost Route / Deep Cover | 10% · 6.8 | Fast Hands / Kill Chain / Tracking Pixel | 13% · 7.3 |
| Operator | Big Process / Hydra / Zombie Process | 14% · 4.0 | Long-running / Hydra / Supervisor | 15% · 4.6 |

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
