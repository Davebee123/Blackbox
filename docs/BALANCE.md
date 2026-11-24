# BLACKBOX class balance by level

One scripted planner for every class (it finishes bare or about-to-fire parts, answers attacks it cannot prevent, strips armor with small or spread hits, then finishes), playing each class’s own kit (from level 10 one subclass a class, data.mjs `defaultSub`: Demolitionist, Warden, Phantom, Herder; every subclass has its own table below). Each bracket: 20 random wild fights at your level and the four guards (Watchdog, Sentinel, Crawler, Shredder) at the bracket’s guard level (1, 9, 18, 18, 28). Your numbers grow 6% a level, compounding, to level 6 and gear carries them after; theirs keep growing 6% a level. Enemy hits on your Integrity take the late step from level 10 (`CONFIG.runLate`: ×0.95 at 10, ×1 at 18, ×1.32 at 30, back to ×1.2 at 50) and their Integrity a smaller one (`CONFIG.runLateHp`: ×0.96 at 18, ×1.05 at 30, ×1 at 50), set against gear on one smooth item-level curve (gear.mjs `ITEM_CURVE`); misses follow the level gap (5% at your level). Talents as a player would have them: a point at level 10 and every 2 levels after, spent in a fixed order (14 points at 50, not the whole tree). Everyone loads a Tuned (blue) protocol in every open slot (4, 5 at 15, 6 at 30) at their level (an implant slot only from 15, where implants start to drop), from level 10 each carrying a stat its subclass chases, in turn (the subclass’s `chase` list: Damage and Crit for a Demolitionist, Restore and Clock Speed for a Sysop, Payload for the burn and helper classes…) except the no-gear column, which has none. Every blue carries a minor rule affix (gear.mjs RULES) and one numeric affix, the one its subclass chases. Crits are on for both sides (seeded). Every fight brings its tells (tells.mjs: moves a part announces ahead), and the planner reads and answers them. Health lost is a share of your own max. Scripted policies, not people.

| Bracket | Spike, no gear | Spike only | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|---:|---:|
| Lv 1 | 20/24 · 0 clean · 63% · 11.0c | 24/24 · 0 clean · 29% · 8.8c | 24/24 · 0 clean · 21% · 8.1c | 24/24 · 1 clean · 12% · 7.0c | 24/24 · 1 clean · 14% · 6.1c | 24/24 · 2 clean · 13% · 6.7c |
| Lv 10 | 0/24 · 0 clean · 100% · 7.7c | 8/24 · 0 clean · 86% · 13.9c | 23/24 · 1 clean · 36% · 14.0c | 23/24 · 3 clean · 23% · 21.0c | 23/24 · 0 clean · 34% · 13.5c | 24/24 · 0 clean · 24% · 14.1c |
| Lv 18 | 0/24 · 0 clean · 100% · 4.9c | 3/24 · 0 clean · 97% · 11.7c | 24/24 · 0 clean · 26% · 11.1c | 24/24 · 0 clean · 17% · 23.5c | 22/24 · 1 clean · 30% · 15.8c | 24/24 · 0 clean · 30% · 14.8c |
| Lv 30 | 0/24 · 0 clean · 100% · 3.1c | 6/24 · 0 clean · 84% · 11.2c | 21/24 · 0 clean · 29% · 11.0c | 24/24 · 0 clean · 18% · 21.4c | 22/24 · 4 clean · 34% · 14.8c | 22/24 · 0 clean · 40% · 13.9c |
| Lv 50 | 0/24 · 0 clean · 100% · 2.2c | 4/24 · 1 clean · 84% · 11.0c | 21/24 · 4 clean · 36% · 10.9c | 21/24 · 4 clean · 27% · 22.3c | 23/24 · 4 clean · 32% · 16.8c | 21/24 · 4 clean · 40% · 13.2c |

Cells: wins · clean kills (nothing got through: no damage, encryption included) · average health lost · average cycles.

## The hard slice

Every strain open at the level, six grade 2 wilds and six wilds two levels up.

| Bracket | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|
| Lv 1 | 11/12 · 68% · 16.3c | 10/12 · 56% · 16.3c | 11/12 · 47% · 11.8c | 9/12 · 55% · 12.8c |
| Lv 10 | 21/22 · 49% · 15.3c | 20/22 · 48% · 22.6c | 19/22 · 46% · 13.6c | 20/22 · 42% · 14.4c |
| Lv 18 | 34/37 · 35% · 10.2c | 34/37 · 41% · 23.6c | 31/37 · 46% · 14.9c | 30/37 · 60% · 14.3c |
| Lv 30 | 41/45 · 39% · 12.4c | 42/45 · 28% · 22.9c | 40/45 · 39% · 18.4c | 34/45 · 64% · 16.3c |
| Lv 50 | 44/45 · 36% · 14.5c | 42/45 · 24% · 26.6c | 41/45 · 29% · 21.5c | 40/45 · 49% · 17.0c |

## By subclass

The same fights for each of the eight subclasses (blues and the bracket's talents; the bar is the core four and the line's first three). Cells: health lost · wins.

| Bracket | Demolitionist | Overclocker | Warden | Sysop | Payload | Phantom | Herder | Hijacker |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Lv 10 | 36% · 23/24 | 35% · 22/24 | 23% · 23/24 | 34% · 21/24 | 32% · 22/24 | 34% · 23/24 | 24% · 24/24 | 39% · 23/24 |
| Lv 18 | 26% · 24/24 | 32% · 22/24 | 17% · 24/24 | 21% · 23/24 | 25% · 24/24 | 30% · 22/24 | 30% · 24/24 | 41% · 22/24 |
| Lv 30 | 29% · 21/24 | 35% · 19/24 | 18% · 24/24 | 32% · 19/24 | 30% · 24/24 | 34% · 22/24 | 40% · 22/24 | 41% · 22/24 |
| Lv 50 | 36% · 21/24 | 36% · 21/24 | 27% · 21/24 | 32% · 21/24 | 17% · 24/24 | 32% · 23/24 | 40% · 21/24 | 46% · 20/24 |

## Tells: reading them or not

The same fights for each subclass, by the planner that reads tells and by one that ignores them (`TELL.bots.answer = false`). Cells: health lost reading · ignoring (wins reading · ignoring). balance.test.mjs holds the gap at 12 points or more on average from Lv 10.

| Bracket | Demolitionist | Overclocker | Warden | Sysop | Payload | Phantom | Herder | Hijacker | Average gap |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Lv 10 | 36% · 43% (23 · 20) | 35% · 44% (22 · 18) | 23% · 35% (23 · 22) | 34% · 46% (21 · 17) | 32% · 40% (22 · 22) | 34% · 48% (23 · 22) | 24% · 33% (24 · 23) | 39% · 44% (23 · 22) | 9.6 |
| Lv 18 | 26% · 32% (24 · 23) | 32% · 48% (22 · 21) | 17% · 27% (24 · 24) | 21% · 37% (23 · 19) | 25% · 36% (24 · 24) | 30% · 49% (22 · 17) | 30% · 48% (24 · 22) | 41% · 44% (22 · 22) | 12.3 |
| Lv 30 | 29% · 32% (21 · 20) | 35% · 44% (19 · 20) | 18% · 29% (24 · 22) | 32% · 47% (19 · 15) | 30% · 35% (24 · 22) | 34% · 37% (22 · 20) | 40% · 43% (22 · 21) | 41% · 40% (22 · 22) | 5.9 |

Target (friction.mjs; a `todo` test in balance.test.mjs): a blue-geared fight at your level costs every subclass 35–45% of its health at levels 10, 18 and 30, subclasses within about 10 points.

## Skill use at level 50

- **Breaker:** overload 21% · flood 15% · crack 11% · shaped-charge 10% · thermal-runaway 9% · rm-rf 7% · shatter 6% · sigint 6% · spike 6% · backfire 4% · logic-bomb 4% · hold 1%
- **Bastion:** reject 22% · purge 21% · rate-limit 21% · blowback 12% · spike 9% · quarantine 7% · harden 4% · sigint 3% · bulkhead 1% · suspend 0%
- **Infiltrator:** inject 19% · unmask 18% · backdoor 14% · side-channel 10% · fingerprint 10% · backstab 8% · sigint 6% · shadow-copy 5% · spike 5% · opening 3% · null-route 1%
- **Operator:** nohup 32% · deploy 14% · hook 10% · spike 10% · botnet 9% · sigint 9% · fan-out 6% · mesh 5% · spawn 4% · hold 2%

## Each skill beside the core four (level 50)

A five-key bar: the core four and that skill. Δ against the full bar above.

| Class | Skill | Wins | Health lost | Δ | Cycles | Δ |
|---|---|---:|---:|---:|---:|---:|
| Breaker | Shaped Charge | 19/24 | 47% | +11 | 14.9 | +4.0 |
| Breaker | Fork Bomb | 18/24 | 43% | +7 | 10.8 | -0.1 |
| Breaker | Debris Field | 16/24 | 48% | +12 | 15.0 | +4.0 |
| Breaker | Thermal Runaway | 19/24 | 42% | +6 | 14.1 | +3.2 |
| Breaker | Backfire | 19/24 | 43% | +7 | 14.7 | +3.8 |
| Breaker | Logic Bomb | 18/24 | 40% | +4 | 13.5 | +2.6 |
| Breaker | rm -rf | 18/24 | 45% | +9 | 14.2 | +3.3 |
| Breaker | Chain Reaction | 20/24 | 47% | +11 | 14.0 | +3.1 |
| Breaker | Bit Rot | 18/24 | 39% | +3 | 13.9 | +3.0 |
| Breaker | Zero-day | 20/24 | 37% | +1 | 14.6 | +3.7 |
| Bastion | Suspend | 20/24 | 36% | +10 | 24.5 | +2.1 |
| Bastion | Bulkhead | 20/24 | 46% | +20 | 24.8 | +2.5 |
| Bastion | Blowback | 20/24 | 43% | +16 | 20.4 | -1.9 |
| Bastion | Harden | 21/24 | 38% | +11 | 23.9 | +1.6 |
| Bastion | Quarantine | 21/24 | 31% | +5 | 25.8 | +3.5 |
| Bastion | Throttle | 23/24 | 37% | +10 | 26.3 | +4.0 |
| Bastion | Circuit Breaker | 17/24 | 42% | +16 | 22.9 | +0.5 |
| Bastion | DMZ | 20/24 | 45% | +18 | 25.2 | +2.8 |
| Bastion | Honeypot | 20/24 | 41% | +14 | 25.7 | +3.3 |
| Bastion | Failover | 19/24 | 39% | +12 | 21.9 | -0.5 |
| Infiltrator | Null Route | 18/24 | 50% | +18 | 17.1 | +0.3 |
| Infiltrator | Opening | 16/24 | 56% | +24 | 15.7 | -1.1 |
| Infiltrator | Backstab | 17/24 | 53% | +21 | 15.3 | -1.5 |
| Infiltrator | Side Channel | 17/24 | 54% | +21 | 15.7 | -1.1 |
| Infiltrator | Shadow Copy | 18/24 | 50% | +18 | 17.0 | +0.2 |
| Infiltrator | Spoof | 18/24 | 52% | +19 | 16.3 | -0.6 |
| Infiltrator | Rotate Keys | 19/24 | 47% | +15 | 18.7 | +1.9 |
| Infiltrator | Log Wipe | 19/24 | 48% | +16 | 16.9 | +0.1 |
| Infiltrator | Unmask | 23/24 | 46% | +13 | 17.3 | +0.5 |
| Infiltrator | Vanish | 18/24 | 50% | +17 | 16.6 | -0.3 |
| Infiltrator | Rootkit Implant | 19/24 | 45% | +12 | 16.3 | -0.5 |
| Operator | nohup | 22/24 | 50% | +10 | 17.0 | +3.8 |
| Operator | Kill Switch | 21/24 | 47% | +7 | 18.1 | +4.9 |
| Operator | Load Shed | 21/24 | 47% | +7 | 18.2 | +5.0 |
| Operator | Fork | 20/24 | 52% | +12 | 17.3 | +4.1 |
| Operator | Mesh | 21/24 | 46% | +6 | 15.7 | +2.5 |
| Operator | Garbage Collect | 20/24 | 53% | +13 | 17.0 | +3.8 |
| Operator | Malloc | 24/24 | 41% | +1 | 15.6 | +2.4 |
| Operator | Crontab | 23/24 | 39% | -1 | 16.3 | +3.0 |
| Operator | OOM Kill | 21/24 | 47% | +7 | 18.1 | +4.9 |
| Operator | Cron Storm | 21/24 | 47% | +7 | 18.1 | +4.9 |

## Every talent pick (level 50)

Each tier's other two picks against all plain picks, in the default subclass.

| Class | Best build | Health lost · cycles | Worst build | Health lost · cycles |
|---|---|---:|---|---:|
| Breaker | Reactive Plating | 34% · 9.5 | Cook-Off | 39% · 11.0 |
| Bastion | Bounce Buffer | 16% · 19.4 | Write Protect | 31% · 23.1 |
| Infiltrator | Ghost Route | 31% · 17.0 | Tracking Pixel | 42% · 18.2 |
| Operator | Hot Swap | 24% · 10.3 | Final Run | 46% · 13.8 |

## Crews in the farm (KESSLER-FARM-00)

You (a Demolitionist, played by the planner) and sim crewmates, everyone in blues with their subclass's stats, 20 seeds: the packs, then each crew boss, up to 4 tries each, everyone rested before a try. Each boss column is its wins over tries; Cleared is the seeds where all three fell; lowest anyone is the lowest share of Integrity anyone in the crew reached (a lost try counts as 0); the Sysop column is the share of its cycles spent on a heal. A full crew is a Warden, a Sysop and a Payload with you (two damage dealers). The rows below it each take one thing away: the tank, the healer, everyone's SIGINT (`bots: { interrupt: false }`), or a damage dealer (a second Sysop instead). docs/bosses.md has what each role does.

| Level | Crew | Foreman | Heatsink | Coldwallet | Cleared | Lowest anyone | Fights someone dips under 40% | Sysop cycles healing | Cycles |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| 18 | Warden + Sysop (4) | 20/20 | 20/21 | 20/20 | 20/20 | 22% | 84% | 48% | 18.4 |
| 18 | no tank (4) | 12/57 | 20/24 | 8/33 | 8/20 | 1% | 100% | 54% | 12.5 |
| 18 | no healer (4) | 20/22 | 2/72 | 2/2 | 2/20 | 3% | 99% | – | 15.2 |
| 18 | no SIGINT (4) | 2/79 | 19/34 | 2/2 | 2/20 | 2% | 100% | 58% | 12.0 |
| 18 | one damage (4) | 5/69 | 3/71 | 0/8 | 0/20 | 0% | 100% | 49% | 25.0 |
| 18 | Warden + Sysop (3) | 20/25 | 20/25 | 18/39 | 18/20 | 12% | 92% | 50% | 23.3 |
| 18 | Sysop (3) | 16/48 | 20/23 | 9/41 | 9/20 | 5% | 98% | 53% | 14.9 |
| 18 | Warden (3) | 19/19 | 17/51 | 16/16 | 16/20 | 10% | 88% | – | 15.2 |
| 18 | Sysop (2) | 19/25 | 16/16 | 11/31 | 11/20 | 11% | 94% | 47% | 19.2 |
| 30 | Warden + Sysop (4) | 20/20 | 20/20 | 20/20 | 20/20 | 31% | 75% | 68% | 14.9 |
| 30 | no tank (4) | 1/77 | 20/20 | 1/2 | 1/20 | 6% | 94% | 69% | 12.6 |
| 30 | no healer (4) | 20/20 | 20/32 | 20/20 | 20/20 | 9% | 96% | – | 12.3 |
| 30 | no SIGINT (4) | 0/80 | 20/20 | – | 0/20 | 5% | 100% | 70% | 10.5 |
| 30 | one damage (4) | 20/24 | 20/22 | 13/55 | 13/20 | 21% | 75% | 71% | 19.3 |
| 30 | Warden + Sysop (3) | 20/20 | 20/20 | 20/21 | 20/20 | 42% | 36% | 63% | 17.1 |
| 30 | Sysop (3) | 13/56 | 20/20 | 12/24 | 12/20 | 13% | 85% | 64% | 11.1 |
| 30 | Warden (3) | 20/20 | 19/34 | 19/19 | 19/20 | 12% | 90% | – | 11.4 |
| 30 | Sysop (2) | 19/19 | 19/19 | 15/32 | 15/20 | 25% | 79% | 61% | 15.8 |
