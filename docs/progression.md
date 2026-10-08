# Progression: what the numbers say, and a proposal

This is a review sheet for the progression pass. It measures the four things that feel odd (leveling pace, gear, the number of tracks, and unlocks), ranks what causes each, and proposes changes with numbers. The designer approved the package in section 4 with the decisions listed at the top of section 6, and section 6 (What changed) gives what was built and the same measures before and after it. Sections 1 to 5 are the review as it was written.

Everything below was measured on commit 16ca6f3, before the solo combat rework that is in progress. Fight lengths, loss rates and some press shares will move when that lands, so the press tables in section 1.4 should be rerun afterwards. The structure of the findings (which track gates what, how gear scales, when unlocks arrive and whether they reach the bar) does not depend on combat tuning.

## How it was measured

The pacing bot (`bot.mjs`, `simulate`) played each of the four classes from a fresh save to level 40 on six seeds, in three money modes. In the first mode it pays to top up and builds every service and building it can afford. In the second it tops up but builds nothing. In the third it never pays and rests instead. That is 72 climbs, plus 24 more with a smarter gear rule (below). A copy of the bot was instrumented to record, per level, the fights, wins, cycles, time spent fighting and resting, XP by source, every protocol drop and what it would replace, the server and firewall levels, and the commands it typed.

The bot plays at the relaxed speed (12-second cycles, 3 seconds a command). Fights are about 70% of its time once it pays for top-ups, so at the normal 8-second speed the hours below shrink by about a fifth. It never picks talents, a specialty or a subclass (it plays the default subclass with no talents), never upgrades the firewall, and never slots daemons. Its own gear rule loads the highest rarity, then the highest level. That rule turned out to hide most of what gear does, so a second set of climbs uses a stat-aware rule. It values an item by its Damage as a share of a Spike, its Signal as a share of max Signal, small weights for the other stats, and about 3% of power for a unique or Zero-day effect.

Unlocks were measured with the balance harness (`balance.mjs` `build`, the planner and the same bracket of random fights and guards as `score`). The unlock tables use 40 random fights instead of 20. The rotation and talent tables use the harness's own 24 fights. For every skill in every class and subclass line, the harness played its unlock level twice, once with the bar the player had before it and once with the new skill on the bar. When the bar was already full (every unlock from level 22), it tried the new skill in each of the seven slots and compared each try against the same bar with that slot simply left empty, so the number is what the new skill itself adds. Press shares are the planner's. A skill the planner never presses is either one it has no situation for or one it was never taught, and either way a player gets no signal to press it.

"Moved presses" in the tables is the total variation between two press mixes, the share of all presses that went to a different key. A value of 0.05 means one press in twenty changed.

## 1. Tables

### 1.1 Leveling pace

The first table gives the hours of play to reach each level, as the median of six seeds. A count in brackets is how many of the six got there within the bot's 72-hour cap.

| Class | Mode | Level 10 | Level 20 | Level 30 | Level 40 |
|---|---|---:|---:|---:|---:|
| Breaker | pays and builds | 2.4 | 8.0 | 17.2 | 29.5 |
| Bastion | pays and builds | 2.6 | 11.8 | 29.8 | 53.0 (5/6) |
| Infiltrator | pays and builds | 2.7 | 8.1 | 18.2 | 31.5 |
| Operator | pays and builds | 2.9 | 8.5 | 19.9 | 39.3 |
| Breaker | tops up only | 2.2 | 8.0 | 17.3 | 29.1 |
| Bastion | tops up only | 2.5 | 12.2 | 32.1 | 57.4 |
| Infiltrator | tops up only | 2.2 | 7.5 | 18.6 | 32.0 |
| Operator | tops up only | 2.5 | 7.4 | 18.8 | 38.8 |
| Breaker | never pays | 3.8 | 13.2 | 30.8 | 60.2 (3/6) |
| Bastion | never pays | 4.5 | 35.3 | not reached (0/6) | not reached |
| Infiltrator | never pays | 4.3 | 12.1 | 28.2 | 50.0 (5/6) |
| Operator | never pays | 3.5 | 13.0 | 40.2 (4/6) | not reached (0/6) |

The next table gives the minutes and fights per level, averaged over each band, for the climbs that pay and build (median of six seeds). The last two columns are for all classes together. The win rate counts every fight the bot started, and a loss pays no XP.

| Levels | Breaker | Bastion | Infiltrator | Operator | Win rate | Rest share if it never pays |
|---|---|---|---|---|---:|---:|
| 1–5 | 8 min, 3 fights | 8 min, 3 fights | 7 min, 3 fights | 11 min, 5 fights | 80% | 49% |
| 6–10 | 25 min, 10 fights | 28 min, 9 fights | 31 min, 11 fights | 28 min, 11 fights | 85% | 41% |
| 11–15 | 32 min, 13 fights | 48 min, 15 fights | 31 min, 12 fights | 26 min, 12 fights | 74% | 47% |
| 16–20 | 37 min, 17 fights | 76 min, 23 fights | 38 min, 16 fights | 43 min, 21 fights | 77% | 48% |
| 21–25 | 51 min, 24 fights | 99 min, 32 fights | 56 min, 21 fights | 62 min, 30 fights | 77% | 51% |
| 26–30 | 65 min, 29 fights | 132 min, 41 fights | 68 min, 24 fights | 90 min, 44 fights | 69% | 55% |
| 31–35 | 78 min, 35 fights | 152 min, 47 fights | 72 min, 26 fights | 100 min, 48 fights | 72% | 59% |
| 36–39 | 73 min, 34 fights | 153 min, 49 fights | 94 min, 36 fights | 129 min, 60 fights | 69% | 41% |

This table shows where the time goes, class by class, between levels 16 and 39 in the climbs that pay and build.

| Class | Cycles a fight (20–30) | Win rate 16–25 | Win rate 26–39 | Kill XP a fight 26–39 |
|---|---:|---:|---:|---:|
| Breaker | 7.7 | 83% | 80% | 241 |
| Bastion | 13.3 | 67% | 54% | 163 |
| Infiltrator | 10.3 | 89% | 85% | 270 |
| Operator | 7.1 | 68% | 57% | 146 |

This table sets the XP curve against what the bot earns, for all classes in the climbs that pay and build. Kills needed is the level's XP divided by one kill at your own level.

| Level | XP to next | Kills needed | Fights taken | Minutes | XP a minute |
|---:|---:|---:|---:|---:|---:|
| 1 | 214 | 7.1 | 2 | 4 | 54 |
| 3 | 494 | 9.9 | 5 | 11 | 45 |
| 5 | 885 | 12.6 | 4 | 8 | 111 |
| 6 | 1,122 | 14.0 | 10 | 27 | 42 |
| 10 | 2,346 | 19.6 | 11 | 29 | 81 |
| 14 | 3,593 | 22.5 | 12 | 30 | 120 |
| 15 | 3,910 | 23.0 | 18 | 40 | 98 |
| 20 | 6,380 | 29.0 | 21 | 47 | 136 |
| 25 | 9,450 | 35.0 | 30 | 68 | 139 |
| 26 | 10,136 | 36.2 | 35 | 80 | 127 |
| 30 | 13,120 | 41.0 | 32 | 72 | 182 |
| 35 | 17,390 | 47.0 | 35 | 81 | 215 |
| 37 | 19,266 | 49.4 | 42 | 105 | 183 |
| 39 | 21,238 | 51.8 | 37 | 95 | 224 |

This table shows where the XP comes from, as a share of each band's XP, for all classes in the climbs that pay and build. Decoding is the first break of a part you have never broken, worth two kills of XP. Break-ins are first runs, vaults, takeovers and clean jobs. Building is Root levels and first crafts and installs. The Fresh and fast-kill bonuses are already inside the other columns.

| Levels | Kills | Decoding | Contracts | Break-ins | Intel | Building | Fresh bonus |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1–5 | 24% | 52% | 13% | 11% | 1% | 0% | 3% |
| 6–10 | 40% | 22% | 9% | 24% | 2% | 3% | 4% |
| 11–15 | 39% | 24% | 9% | 23% | 1% | 4% | 3% |
| 16–20 | 46% | 11% | 12% | 23% | 2% | 5% | 4% |
| 21–25 | 47% | 2% | 13% | 27% | 2% | 7% | 3% |
| 26–39 | 50% | 0% | 13% | 26% | 2% | 8% | 3% |

In the never-pays climbs, the bot rests until its Signal is full and its server is back over 30%. Server repair stops while an invasion sieges or breaches the wall, and the bot never upgrades its firewall. On seed 1 the Bastion spent 3,039 of its 4,331 minutes (70%) resting with an invasion at the wall, the Breaker 1,591 of 4,205 (38%) and the Operator 1,434 of 4,355 (33%).

These are the stalls and rushes, in order of size.

1. The Bastion takes 1.7 times as long as the Breaker to reach 30 and 1.8 times as long to reach 40, and the Operator 1.3 times as long to reach 40. Their fights are longer (the Bastion's 13 cycles against 7 to 10) and they lose 43–46% of their fights from level 26 in the climb, where a loss pays nothing.
2. A player who never pays spends 41–59% of the climb resting, and the Bastion and Operator stall outright in the 20s and 30s. A player who pays spends 0% of the climb resting from level 16. Top-ups cost about a quarter to a third of income, so the friction from health is either a wall of waiting or nothing.
3. Levels 1 to 5 take 7 to 11 minutes each, because decoding pays 52% of their XP. Levels 6 to 10 then take 25 to 31 minutes each, three times as long, while level 6 needs only 27% more XP than level 5. Decoding pays 22–24% from 6 to 15, 11% from 16 to 20, and nothing from 21. Each step down in decoding is a slowdown with nothing on screen to explain it.
4. There are smaller steps at 15, 26 and 37–38, where fights per level jump by a third and the win rate dips to 63–69%. They line up with the layer bands (16, 26, 38) and with a friction bump at 13–17 (whites cost 56–61% of health at 13–15 against a 40–50% target), but the cause was not isolated.
5. Past level 20 the climb is a smooth, steepening slope, as designed. The median rises from 47 minutes at level 20 to 95 at level 39.

### 1.2 Gear

This table covers drops and upgrades for a player who equips by stats, pooled over the 24 stat-aware climbs. An upgrade is a drop that beats the weakest item in its slot by that player's rule. Its size is the larger of two numbers, the Damage it adds as a share of your current hit (a Spike plus your gear Damage), or the Signal it adds as a share of your max Signal. A level-up adds 4% to everything, for comparison. An effect drop is a unique or a Zero-day.

| Levels | Drops a level | Upgrades a level | Share of drops that upgrade | Median upgrade | Upgrades over 4% | Effect drops | Upgrades that add an effect |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1–5 | 1.2 | 0.9 | 75% | 4.4% | 53% | 5% | 6% |
| 6–10 | 3.7 | 2.2 | 59% | 2.6% | 35% | 12% | 12% |
| 11–15 | 4.3 | 1.7 | 39% | 3.8% | 49% | 9% | 5% |
| 16–20 | 6.7 | 2.2 | 32% | 3.4% | 43% | 14% | 2% |
| 21–25 | 9.6 | 2.2 | 23% | 3.2% | 47% | 12% | 1% |
| 26–30 | 10.8 | 1.9 | 18% | 3.6% | 48% | 11% | 0% |
| 31–35 | 14.1 | 2.1 | 15% | 3.7% | 49% | 11% | 0% |
| 36–39 | 15.7 | 1.5 | 10% | 4.9% | 57% | 12% | 1% |

Across every upgrade from level 16 on (1,094 of them), the quarter points are 1.2%, 3.6% and 6.4%, the ninetieth percentile is 7.7%, and 2% are 10% or more.

This table gives the rarity of drops over time in the same climbs. Gold here counts uniques and found Zero-days.

| Levels | Grey | White | Blue | Yellow | Gold |
|---|---:|---:|---:|---:|---:|
| 1–5 | 7% | 22% | 45% | 7% | 18% |
| 6–10 | 7% | 25% | 44% | 12% | 12% |
| 11–15 | 5% | 26% | 47% | 12% | 9% |
| 16–20 | 4% | 17% | 54% | 11% | 14% |
| 21–25 | 3% | 15% | 57% | 14% | 12% |
| 26–30 | 3% | 14% | 59% | 14% | 11% |
| 31–35 | 2% | 12% | 61% | 15% | 11% |
| 36–39 | 1% | 12% | 62% | 13% | 12% |

The bot gets 6 to 10 protocols an hour. Gold is about one an hour, far more than the design's one every 10 to 12 hours, because of where it comes from. Over the 24 rarity-first climbs there were 896 gold drops. Eviction Notice dropped 380 times and Squatter's Rights 353 times. Those two are the Resident's own uniques (level 4), and every takeover beats a Resident at 30% plus 10% pity a kill. Together they are 82% of all gold, and 80% of all gold drops were a unique the player already had. New uniques arrive about 1.0 a climb in levels 1–5, 2.1 in 6–10, then 0.3 to 1.0 per five levels after that.

This table shows what a player wears under each of the two gear rules. The rarity-first rule is the bot's own. Gear Damage is the Damage on your protocols as a share of a Spike, and gear Signal is the Signal on your protocols as a share of your max.

| Level | Uniques loaded (rarity first) | Gear Damage (rarity first) | Gear Signal (rarity first) | Uniques loaded (by stats) | Gear Damage (by stats) | Gear Signal (by stats) |
|---:|---:|---:|---:|---:|---:|---:|
| 5 | 40% | 0.10 | 8% | 36% | 0.12 | 8% |
| 10 | 47% | 0.21 | 22% | 14% | 0.24 | 26% |
| 15 | 60% | 0.22 | 25% | 6% | 0.35 | 32% |
| 20 | 49% | 0.33 | 32% | 3% | 0.53 | 41% |
| 30 | 56% | 0.35 | 34% | 1% | 0.72 | 48% |
| 40 | 53% | 0.50 | 39% | 0% | 1.02 | 52% |

The stat player drops its uniques because their stats fall behind. A unique's numbers are its own level's numbers at half value, grown 4% a level. A rolled item takes the best base for its level, and the bases jump 1.5, 1.3, 1.2 and 1.2 times at item levels 5, 11, 18 and 26. The table below gives the average Damage on an Exploit and Signal on a Proxy at each item level.

| Item level | White Exploit | Yellow Exploit | Eviction Notice | White Proxy | Yellow Proxy | Squatter's Rights |
|---:|---:|---:|---:|---:|---:|---:|
| 5 | 4.5 | 6.2 | 5 | 19 | 26 | 17 |
| 10 | 5.2 | 6.8 | 5 | 22 | 30 | 19 |
| 20 | 11.1 | 14.3 | 6 | 44 | 58 | 25 |
| 30 | 16.3 | 21.3 | 9 | 64 | 82 | 31 |
| 40 | 19.5 | 25.1 | 9 | 76 | 100 | 37 |

From item level 10, a white beats the Resident's Exploit, and by 20 it has nearly twice its Damage. Of the 33 uniques that drop in the world, 28 are level 15 or lower and 5 are level 16 or higher. All 14 boss uniques are level 15 or lower. There is no new base item after level 26, so from 26 to 50 every drop is one of the same five bases with bigger numbers. Affixes are all flat numbers or percentages, and none of them changes a rule.

### 1.3 Tracks

The table below lists, for each track, when it changes, how often the player acts on it, and what it gates. Counts and times come from the climbs that pay and build.

| Track | How it rises | When it changes | How often you act on it | What it gates |
|---|---|---|---|---|
| Hacker (class) level | XP | every 4–11 min at 1–5, about 30 min at 6–15, 40–55 min at 16–25, 65–150 min at 26–39 | never directly | skills, talents, specialty (5), subclass (10), SIGINT (10), protocol slots (15, 30), drop item level, your layer (7, 16, 26, 38), SPRAWL-00's worth |
| Server level | every XP point any class earns, plus banking | with your hacker level (equal at 99% of 2,807 level-ups in 72 climbs, one behind otherwise) | never | daemon slots (10, 20), a service slot at 9, 17, 25, 33, 41, service v2 (10) and v3 (25), outpost bandwidth (3 + level/4), architecture (20), buildings (5, 10, 15, 20), base Integrity |
| Firewall level | bought a level at a time | only when you pay | about once a hacker level to stay ahead of what you've attached (the bot never did, and met 25 invasions and 22 breaches a climb) | whether invasions bounce, grind or breach, and so whether your server repairs and whether it crashes |
| Firewall version | every 10 firewall levels | when you pass 10, 20 … | with the upgrade | defrag speed, filter slots, wear, harden length |
| Subclass | a pick at 10 | once | once, free to switch | its skill line, edge and talent tree |
| Specialty | a pick at 5 | once | once | two free ranks of a first-row talent (+6% damage or similar) |
| Talents | a point at 10 and every 2 levels | 21 points by 50, choice tiers open at 16, 26 and 38 at the earliest | every 1 to 5 hours from 10 | small bonuses, and three rule choices |
| Protocols | drops and compiling | about 2 upgrades a level for a stat player | every 15–45 minutes | most of your power past 20 (gear Damage reaches a whole Spike by 40) |
| Services | code, credits, salvage, real-time installs | 16 installs by 40 | about one every 2 hours | 7 of 12 boost home fights only, plus filter slots, route, compile discount, bandwidth, collection |
| Buildings | code, credits, salvage, real-time builds | 14 on 4–5 outposts by 40 | about one every 2 hours, plus 52 swarms a climb (15 outposts fell) | income in code, credits and salvage, outpost walls |
| Root level | processes cleared on a held server | 1 to 5 per outpost | with each rotation | per-outpost perks |
| Daemons | found, upgraded by duplicates | rarely | when found | an extra action on a cooldown |
| Architecture | a pick at server 20 | once | once | a trade between wall, bandwidth and crafting |

The next table lists what arrives at each level, on every track that keys off a level, for a player with one class (so server level equals hacker level). Talent points come on every even level from 10.

| Level | What's new |
|---:|---|
| 1 | Spike and your first skill, four protocol slots |
| 2 | nothing beyond +4% |
| 3 | second skill |
| 4 | a traced server if you have none |
| 5 | third skill, specialty, the second base tier, the Listening Post |
| 6 | nothing beyond +4% |
| 7 | fourth skill, layer 2, the crew farm |
| 8 | an outpost bandwidth point (one every 4 levels) |
| 9 | a service slot |
| 10 | subclass and edge, SIGINT, first talent point, a daemon slot, service v2, two buildings |
| 11 | the third base tier |
| 12 | first subclass skill |
| 13 | nothing beyond +4% |
| 14 | second subclass skill |
| 15 | fifth protocol slot (implant), implants drop, the Sentry Daemon |
| 16 | layer 3, the first talent choice |
| 17 | a service slot |
| 18 | third subclass skill (the bar is now full), the fourth base tier |
| 19, 21, 23 | nothing beyond +4% |
| 20 | a daemon slot, architecture, two buildings |
| 22 | fourth subclass skill (not on the bar unless you swap) |
| 25 | service v3, a service slot |
| 26 | fifth subclass skill (not on the bar), layer 4, the fifth and last base tier, the second talent choice |
| 27, 29, 31 | nothing beyond +4% |
| 30 | sixth subclass skill (not on the bar), sixth protocol slot |
| 33 | a service slot |
| 34 | seventh subclass skill (not on the bar) |
| 35, 37, 39 | nothing beyond +4% |
| 38 | eighth subclass skill (not on the bar), layer 5, the third talent choice |

Twelve of the levels from 2 to 39 bring nothing but +4%. From level 19 every odd level is one of them except 25 and 33, which bring a service slot, and the even levels bring a talent point (and every fourth one a bandwidth point).

Credits earned to level 20 were 6,300 to 6,600, and to level 30 20,000 to 22,000 (two climbs, pays and builds). The bot spent 6,900 to 8,900 credits on services and about 2,700 on buildings by 30, and still reached 30 within 7% of the climbs that built nothing (Breaker 17.2 against 17.3 hours, Infiltrator 18.2 against 18.6, Operator 19.9 against 18.8, Bastion 29.8 against 32.1). Home fights were 28 of 922 fights in a climb (3%). Keeping the firewall level with the servers you attach costs 795 credits by level 10, 2,805 by 20, 6,015 by 30 and 10,425 by 40 (and 74, 260, 556 and 962 Cipher code), so about 45% of income to 20 and 30% to 30.

### 1.4 Unlocks

Each cell is the skill, the share of presses it got, the health it saved per fight in points of max health (minus means it made fights worse), and a verdict. "Changes play" means it is pressed in at least 3% of turns and moves health by 3 points or fight length by half a cycle. "Never pressed" is under 3% of turns. "1:1 swap" means its presses came out of one existing skill and nothing measurable changed. "No effect" means it is pressed but nothing measurable changed. From level 22 the bar is full and the cell is the best slot to put it in.

The first table covers the core four skills of each class.

| Level | Breaker | Bastion | Infiltrator | Operator |
|---|---|---|---|---|
| 1 | Overload, 31%, +3, changes play | Rate Limit, 30%, +11, changes play | Inject, 72%, +24, changes play | Deploy, 27%, +17, changes play |
| 3 | Flood, 25%, +33, changes play | Firewall, 8%, +7, changes play | Backdoor, 21%, −1, no effect | Hook, 3%, +0, never pressed |
| 5 | Exploit, 2%, +0, never pressed | Purge, 4%, +16, changes play | Keepalive, 0%, +0, never pressed | Spawn, 13%, +1, changes play |
| 7 | Crack, 12%, +8, changes play | Retaliate, 12%, −2, no effect | Tag, 19%, +1, 1:1 swap | Botnet, 12%, +7, changes play |

The next two tables cover the subclass lines, Breaker and Bastion first.

| Level | Demolitionist | Overclocker | Warden | Sysop |
|---|---|---|---|---|
| 12 | Shatter, 25%, −16, worse | Overvolt, 7%, −2, no effect | Suspend, 9%, +9, changes play | Patch, 5%, +2, changes play |
| 14 | Fork Bomb, 7%, +1, no effect | Segfault, 12%, +1, 1:1 swap | Bulkhead, 3%, −3, changes play | Multicast, 4%, +2, changes play |
| 18 | Shaped Charge, 13%, +17, changes play | Thermal Throttle, 4%, +0, 1:1 swap | Blowback, 12%, +10, changes play | Heartbeat, 2%, +0, never pressed |
| 22 | Thermal Runaway, 9%, +0, changes play | Brace, 5%, +0, 1:1 swap | Throttle, 0%, +0, never pressed | Scrub, 13%, +4, changes play |
| 26 | Logic Bomb, 0%, +0, never pressed | Stack Smash, 0%, +0, never pressed | Harden, 8%, +2, changes play | Reclaim, 18%, +15, changes play |
| 30 | Chain Reaction, 6%, +0, changes play | Sudo, 0%, +0, never pressed | Quarantine, 4%, +2, changes play | Rollback, 1%, +2, never pressed |
| 34 | Bit Rot, 0%, +0, never pressed | Turbo Boost, 15%, −2, 1:1 swap | DMZ, 0%, +0, never pressed | Hot Standby, 2%, +0, never pressed |
| 38 | Zero-day, 16%, +3, 1:1 swap | Zero-day, 18%, +18, changes play | Failover, 5%, +3, changes play | Rebalance, 0%, +0, never pressed |

These are the Infiltrator and Operator lines.

| Level | Payload | Phantom | Herder | Hijacker |
|---|---|---|---|---|
| 12 | Wormable, 15%, +6, changes play | Null Route, 7%, +14, changes play | Fan-out, 16%, −7, worse | Jam, 13%, −1, changes play |
| 14 | Detonate, 14%, +27, changes play | Opening, 3%, −1, 1:1 swap | Mesh, 16%, +7, changes play | Hijack, 10%, −14, worse |
| 18 | Rootkit Implant, 14%, +0, 1:1 swap | Backstab, 3%, +1, never pressed | Kill Switch, 0%, +0, never pressed | Replay, 12%, +25, changes play |
| 22 | Skim, 14%, +6, changes play | Spoof, run skill | Garbage Collect, 7%, −1, 1:1 swap | Spoofed ACK, 8%, +30, changes play |
| 26 | Propagate, 2%, +2, never pressed | Shadow Copy, 11%, +7, changes play | Malloc, 17%, −1, changes play | Barrier, 0%, +0, never pressed |
| 30 | Polymorph, 14%, +0, 1:1 swap | Tap, run skill | Fork, 5%, −4, worse | Cache Poison, 0%, +0, never pressed |
| 34 | Thrash, 1%, +0, never pressed | Log Wipe, 4%, −1, changes play | OOM Kill, 0%, +0, never pressed | Reroute, 0%, +0, never pressed |
| 38 | IRQ Storm, 18%, +1, changes play | Rootkit Implant, 9%, +27, changes play | Cron Storm, 8%, −1, changes play | Blackhole, 1%, +1, never pressed |

Of the 64 subclass unlocks, 28 change play, 19 are almost never pressed, 9 are 1:1 swaps, 2 are pressed with no effect, 4 make fights worse and 2 are run skills. Of the 40 unlocks from level 22 to 38, 16 change play and 16 are almost never pressed. Of the 16 core unlocks, 10 change play. The Overclocker has one unlock out of eight that changes play (Zero-day at 38). The Hijacker has five of eight that are never pressed or make it worse. Four of the Sysop's eight skills are never pressed by the planner, and three of those are heals.

The next table shows what the default bar presses as you level, for each subclass with its own bar and no swaps, as a new player would have it. "Skills in use" is the effective number of keys (one over the sum of squared press shares). "Moved presses" is against the previous row.

| Subclass | Skills in use at 10 | at 18 | at 30 | at 40 | Moved presses per step, 20 to 40 | Spike's share at 40 |
|---|---:|---:|---:|---:|---|---:|
| Demolitionist | 4.4 | 5.5 | 4.5 | 4.5 | 0.02–0.10 | under 13% |
| Overclocker | 4.0 | 5.4 | 5.6 | 5.3 | 0.02–0.13 | 25% |
| Warden | 2.9 | 3.6 | 3.7 | 3.6 | 0.01–0.03 | 47% |
| Sysop | 3.0 | 3.1 | 3.0 | 3.0 | 0.03–0.08 | 52% |
| Payload | 2.3 | 4.5 | 4.6 | 6.0 | 0.03–0.13 | 20% |
| Phantom | 3.1 | 3.7 | 3.9 | 3.8 | 0.02–0.16 | 13% |
| Herder | 2.5 | 3.8 | 3.6 | 3.7 | 0.01–0.05 | 42% |
| Hijacker | 2.7 | 5.0 | 5.0 | 5.1 | 0.03–0.12 | 32% |

The last table plays each talent tier both ways at level 50 with the whole tree, with the other tiers on their first option.

| Subclass | Tier 1 | Moved presses | Health | Tier 2 | Moved presses | Health | Tier 3 | Moved presses | Health |
|---|---|---:|---:|---|---:|---:|---|---:|---:|
| Demolitionist | Cluster Charge or Exposed Wiring | 0.15 | 2.3 | Cascade Failure or Meltdown | 0.01 | 0.4 | Total Overkill or Scorched Earth | 0.03 | 1.9 |
| Overclocker | Hair Trigger or Feedback Loop | 0.06 | 4.9 | Core Dump or Burn-in | 0.00 | 0.0 | Unsafe Mode or Critical Heat | 0.10 | 5.1 |
| Warden | Tarpit or Deep Packet Inspection | 0.00 | 3.3 | Counterflow or Write Protect | 0.00 | 0.0 | Uptime or Kernel Panic | 0.01 | 0.1 |
| Sysop | Service Pack or Ping Flood | 0.02 | 1.0 | Critical Path or Redistribute | 0.02 | 2.8 | Overcommit or Loopback | 0.04 | 0.8 |
| Payload | Supercookie or Long Fuse | 0.04 | 1.3 | Contagion or Assassinate | 0.13 | 2.8 | Superspreader or Persistence | 0.23 | 1.1 |
| Phantom | Fast Hands or Blind Spot | 0.04 | 2.3 | Kill Chain or Rotating Proxies | 0.22 | 5.5 | Deep Cover or Leaked Creds | 0.00 | 0.0 |
| Herder | Big Process or Long-running | 0.01 | 0.0 | Hive or Hydra | 0.10 | 2.8 | Zombie Process or Supervisor | 0.07 | 3.0 |
| Hijacker | Long Jam or Loopback | 0.00 | 0.0 | Double Agent or Crosstalk | 0.02 | 2.8 | Full Duplex or Kill Chain | 0.03 | 0.1 |

Health is the gap between the two options in points of max health, whichever way it goes. Sixteen of the 24 choices move fewer than one press in twenty, and seven show no measurable difference at all. Six move one press in ten or more.

The rules text and the data disagree on when skills arrive. GAME_RULES.md's Levels section says skills five to seven come at 14, 18 and 22 and the bar is full at 22. `SUBCLASS.unlocks` puts them at 12, 14 and 18, so the bar is full at 18 and five more skills follow at 22, 26, 30, 34 and 38.

## 2. Diagnosis

### Leveling pace

1. The class gap is the biggest stall. The Bastion reaches 30 in 29.8 hours against the Breaker's 17.2, and the Operator reaches 40 in 39.3 hours against 29.5. Two things compound. The Bastion's fights run 13 cycles against the Breaker's 7.7, and XP is paid per kill. And in the real climb, where Signal carries between fights and rare processes sit two levels up, the Bastion and Operator lose 43–46% of their fights from level 26, while the Breaker and Infiltrator lose 15–20%. The balance harness, which rests between fights, shows them winning nearly all of the same-level fights, so the gap opens in the conditions of a climb, not in a single fight.
2. Health friction is all or nothing. A player who never pays rests for 41–59% of the climb, and the Bastion and Operator stall in the 20s and 30s, mostly because server repair stops while an invasion sits at a firewall nobody upgraded. A player who pays rests 0% of the time from level 16, for about a quarter to a third of their income. So one habit decides whether the climb is stuck or has no health friction at all.
3. Decoding front-loads the curve. It pays 52% of the XP for levels 1–5, so those take 7 to 11 minutes, and levels 6 to 10 take three times as long. It keeps paying a quarter of the XP to 15, then fades to nothing by 21. The player never sees a reason for the slowdowns.
4. Small steps at 15, 26 and 37–38 coincide with the layer bands, where fights per level jump by a third and wins dip to 63–69%.
5. The late slope is steep (47 minutes a level at 20, 95 at 39), which is the intended MMO-length climb. Half the levels past 19 bring nothing but +4%, so the long levels are also empty ones.

### Gear doesn't feel like an upgrade

1. Gear arrives as about two upgrades a level, each about the size of one level-up. The median upgrade is 3.6% on one stat, and only 2% of upgrades from level 16 are 10% or more. In total, gear matters a lot (by level 40 a stat player's gear adds a whole Spike to every hit and half its Signal), but it comes in slivers. Each drop is at your level and scales 4% a level like everything else, the power is split over four to six slots, and the rarities are close together (a yellow's primaries are 1.2 times a white's).
2. Behaviour-changing gear is gone by level 20. Unique stats are their own level's numbers at half value, grown 4% a level, while rolled items climb the base tiers. A white beats the Resident's Exploit from item level 10. A player who reads stats wears uniques in 14% of slots at 10, 3% at 20 and none at 40. Only 5 of the 33 world uniques are above level 15, and affixes never change a rule. After level 16, 0–2% of upgrades add an effect.
3. Gold is mostly the same two items. The Resident's Eviction Notice and Squatter's Rights are 82% of gold drops, and 80% of all gold is a repeat. A player who equips by colour wears gold in about half its slots from level 5 to 40, mostly those two, and each of them is weaker than a white from item level 10.
4. Nothing new appears after level 26. The last base tier is at 26, so levels 26 to 50 are the same five bases with bigger numbers.
5. The rarity curve barely moves. Blues go from 45% to 62% of drops and whites from 22% to 12%, so a drop at 35 looks like a drop at 15.

### Too many tracks

1. Server level is a second copy of your level. Across 72 climbs it equalled the hacker level at 99% of level-ups and was one behind otherwise, and it is the level the Map shows on your server's card. Its gates (daemon slots, service slots and versions, bandwidth, architecture, buildings) could hang off your level directly.
2. The firewall is a parallel climb that the hacker climb silently needs. Invasions come at the level of the servers you attach, and those follow your level through the layers. Nothing raises the wall but paying, about 45% of income to level 20. Left alone, it breaches 22 times a climb, and when you don't pay for repairs it is the main reason a climb stalls. Nothing on the hacker side says the wall is behind.
3. Services and the firewall answer the same threat twice. Seven of the 12 services make home fights easier, home fights are 3% of all fights, and the firewall decides whether they happen. A climb that spent 7,000 to 9,000 credits on services and 2,700 on buildings reached 30 within 7% of one that built nothing.
4. There are about a dozen numbers that read as levels: hacker level, server level, firewall level and version, each outpost's firewall, Root 1 to 5, service v1 to v3, daemon v1 to v3, item level, enemy and location level, layer, and faction tiers.
5. Talents and the specialty trickle in as small percentages. A point every two levels from 10, mostly into +3% nodes, with the three real choices at 16, 26 and 38. The specialty is a separate menu at level 5 for about +6%.

### Unlocks feel flat

1. The bar freezes at 18. Four core skills and the first three subclass skills fill the seven slots, and the five later skills (22, 26, 30, 34, 38) never reach the bar unless the player swaps by hand. With the bar a new player has, the press mix from 20 to 40 moves between 0.01 and 0.16 per step, typically about 0.04.
2. Almost half the unlocks don't change what gets pressed. Of the 64 subclass skills, 19 are almost never pressed even in their best slot, 9 replace one existing button 1:1, and 2 are pressed without effect. In the late half (22 to 38) 16 of 40 are almost never pressed. The worst lines are the Overclocker (one of eight changes play), the Hijacker (four never pressed and Hijack makes fights worse) and the Sysop (four of eight never pressed, three of them heals).
3. Four skills make fights worse in the planner's hands. Shatter costs 16 points of health a fight, Hijack 14, Fan-out 7 and Fork 4. Either the skill or the planner is wrong, and the planner also plays the crew bots.
4. Spike is still the most pressed key for three subclasses at level 40 (the Warden at 47%, the Sysop at 52%, the Herder at 42%), so new skills compete for half the turns.
5. Talent choices rarely change the rotation. Sixteen of 24 move fewer than one press in twenty, and seven are indistinguishable in a fight.

## 3. Options

### Leveling pace

Option A reshapes the curve. Decoding would pay one kill instead of two (`DECODE_XP` 2 to 1) and the early XP bonus would go (`CONFIG.xpEarly.bonus` 0.15 to 0). By my estimate levels 1–5 would take about 11 minutes instead of 8, levels 6–15 would stay within about 5% of today (half the lost decoding is given back by the smaller XP need), and the cliff at 6 would shrink from three times to about two. The cost is a slower first hour, which some players will notice more than the cliff.

Option B adds catch-up for stalls. Each level gets a target time from the faster classes' measured pace, about 6 + 2.2 × level minutes of active play (28 at 10, 50 at 20, 72 at 30, 92 at 39). When a level runs past 1.25 times its target, kills pay +50% until the level ends, shown as a *Behind* row on the spoils card like Rested. It only ever counts time you played, so there is nothing to miss by logging off. It would take about 13% off the Bastion's 26–30 band, so it is a net under stalls, not a fix for the class gap. It also helps every other stall (layer steps, gear droughts, a bad streak) without anyone tuning them one by one.

Option C fixes the class gap where it starts. Set a target that every class reaches 30 within 1.25 times the fastest class's time in the climb, and hand it to the combat rework as a number to meet. The levers there are the Bastion's fight length (13 cycles against 7 to 10) and the late loss rate of the Bastion and Operator (43–46% from 26). A per-class XP multiplier (Bastion 1.5, Operator 1.2) would close the gap today, but it pays a class for being slow and breaks the even split in crews.

For health friction, either option works with one rule change. Server repair would continue at half rate while an invasion sieges or breaches (it stops entirely now), so a neglected wall slows a climb instead of halting it.

I recommend A, B and C together, plus the half-rate repair. C is the real fix, B catches whatever C misses and every stall nobody has found yet, and A removes the one cliff that comes from the curve itself.

### Gear

Option A gives every blue and yellow a rule. A blue would roll one minor rule affix from a pool of about 16 and a yellow one major rule, both written in the effect blocks uniques already use (when, if, does), with the numbers growing by level. Examples are "+20% damage on a part whose attack lands next cycle", "your first Spike each fight goes through armor" and "breaking a part takes a cycle off your longest cooldown". To keep total power where it is, a blue would carry one numeric affix plus its rule (today one or two numeric), and a yellow two or three plus its rule (today three to five). Since 54–62% of drops past 16 are blue, most drops become a roll that could change how you play. The cost is writing the pool and a harder balance pass, because rules stack in ways percentages don't.

Option B makes uniques keep up and stop repeating. A unique's primaries would come from the best base for its slot at its item level, times a yellow's 1.2, plus its own secondaries and downside. Eviction Notice at 20 would have about 14 Damage instead of 6. The Resident would drop each of its two uniques once, and after both are in the collection its 30% plus pity roll would give a world unique you don't have yet, or a yellow. That turns about 30 duplicate golds a climb into new effects, until the 33 world uniques run out, so it needs about ten more world uniques written for levels 18 to 40, where there are five today.

Option C makes fewer, bigger moments. Add base tiers at 34 and 42 (none exist after 26), each about 1.4 times the previous tier's primaries, so a new-tier Exploit at 40 adds about 8% to every hit. Spread the rarities so a yellow is an event (Tuned 1.1 to 1.15, Custom 1.2 to 1.35 on primaries). Delete greys and the two junk affixes, which takes a third out of common drops and leaves whites at about one kill in nine. I would expect about 1.5 upgrades a level instead of 2, with more of them over 10%, but that needs a rerun to confirm. The cost is a sparser stash, and the stat player's power curve gets lumpier, which friction.mjs would need to re-target.

I recommend B and A first, then C's two new tiers and the grey cut. B is the cheapest change with the biggest effect (it brings effects back past level 20 and removes 80% of duplicate gold). A is the change that makes drops matter at every rarity. The new tiers fix the dead stretch from 26 to 50. Rarity spread can wait for a friction rerun.

### Tracks

Option A has one headline level. Server level becomes your highest class level, with no XP of its own (`gainServerXp`, and banking XP in `SERVER.xp`, are deleted). Every gate it has keeps its number but reads your level. The Map shows your firewall under your server instead of a level, and the top bar shows the class level. The level-up banner then lists everything a level brings on every track (skills, talent point, slot, base tier, layer, daemon slot, service slot, buildings), with a ghost line for the next level that brings something. The cost is that alts no longer push the server ahead of your best class, which today is the one thing server level does that hacker level doesn't.

Option B makes the firewall follow your network. The wall's base would be the highest level among the servers you attach, minus 2, so an untouched wall contests (grinds) a same-level invader instead of letting it breach. Upgrades would buy +1 to +6 over that base at today's prices, and versions, filters and harden.sh stay as they are. That deletes the bought climb from 1 to 40 (6,015 credits and 556 Cipher by 30) and keeps the choice of how safe to be while away. The cost is that neglect hurts less, and a breach becomes something you choose by attaching a server far above your wall.

Option C folds the home-fight services into the wall. RAID Array, Hardened Kernel, Scrubber, Hot-patcher and Counter-intrusion would stop being services and become filter stats or firewall-version perks, because they only act when the wall fails. Cron Job and Snapshot already behave like daemons (Sweeper and Canary), so they would become daemon finds. The Filter Bay becomes part of the firewall version. That leaves four server modules (Route Logger, Build Farm, Edge Router, Scheduler), each v1 to v3, and service slots (ports) can go. The cost is fewer things to build at home, which the outposts already cover.

Specialty would go as well in all three. Its two free ranks would become part of the class's base kit (the Breaker's +6% damage, and so on), since the measured effect of a first-row pick is a few percent and level 5 is already the busiest early level.

I recommend all three. A is the change the designer asked about most directly, B removes the track that causes the worst measured stall, and C removes a set of decisions that don't move the climb. Root levels, outpost walls and architecture stay, because they belong to holdings you chose to build.

### Unlocks

Option A grows the bar. Add a slot at 22 and another at 30 (seven skill keys to nine), and let each fill with that level's unlock as the first seven do today. SIGINT would move off key 9 (to 0, or to a typed command only, since typing is the main way to play). This keeps every skill and puts the late ones in front of the player. The cost is a busier tray, and a nine-key bar needs nine skills worth pressing, which A alone doesn't give.

Option B redesigns the flat skills into rotation changers, without cutting the count. The list, in order of how flat each line is, is the Overclocker's Overvolt, Segfault, Thermal Throttle, Brace, Stack Smash, Sudo and Turbo Boost, the Hijacker's Barrier, Cache Poison, Reroute, Blackhole and Hijack, the Sysop's Heartbeat, Rollback, Hot Standby and Rebalance, the Warden's Throttle and DMZ, the Demolitionist's Fork Bomb, Logic Bomb, Bit Rot and its 1:1 Zero-day, the Payload's Propagate, Thrash, Rootkit Implant and Polymorph, the Phantom's Opening and Backstab, and the Herder's Kill Switch, Garbage Collect and OOM Kill. Shatter, Fan-out and Fork, which make fights worse, need a look at the skill and the planner first. This is the brief for the agent making class skills situational: each of these should get one situation the player can read on the board where it is clearly the best press. The cost is design time, and the gain only shows once the planner (and the crew bots) know the situations too.

Option C makes talents fewer and bigger. Cut the filler rows from three to one (one row of two ranked nodes) and replace the 21 points with six choice tiers at 12, 18, 24, 30, 36 and 42. Each tier is two options that each rewrite one skill's rule (for example "Detonate no longer spends Inject stacks, it copies them to the next part"). Start with the seven choices that measure as no difference today (Demolitionist tier 2, Overclocker tier 2, Warden tiers 2 and 3, Phantom tier 3, Herder tier 1 and Hijacker tier 1). The cost is losing the "spend a point" beat every two levels, and the tiers then land on the even levels that today carry a point.

I recommend A and B together, and C after B. A without B adds two slots of flat skills. B without A leaves the late skills off the bar. C is the right shape, but its tier picks should rewrite skills that B has already made worth pressing.

## 4. The recommended package

These are the additions. Kills pay +50% once active play on a level passes 1.25 times its target of 6 + 2.2 × level minutes, shown as a *Behind* row, until the level ends. The combat rework gets a class-pace target, so that every class reaches 30 within 1.25 times the fastest class's time. Server repair runs at half rate while an invasion sieges or breaches. Every blue gets one minor rule affix and every yellow one major rule affix, from a pool of about 16 written in the existing effect blocks. Unique primaries come from the best base at their item level, times 1.2. About ten world uniques are written for levels 18 to 40, and two base tiers are added at 34 and 42. The bar gains a slot at 22 and another at 30. The level-up banner covers every track, with a ghost line for the next level that brings something.

These are the changes. Decoding pays one kill a part instead of two, and the early XP bonus goes. The Resident drops each of its two uniques once, then a world unique you lack, or a yellow. Server level becomes your highest class level, and every gate on it reads that. The firewall's base follows the highest attached server minus 2, and upgrades buy +1 to +6 over it. The 30 flat subclass skills and the four that make fights worse, listed under Option B, are redesigned around a situation the player can read on the board.

These are the deletions. Server XP and banking XP go (`gainServerXp` and `SERVER.xp`), and so does the bought firewall climb from level 1. RAID Array, Hardened Kernel, Scrubber, Hot-patcher and Counter-intrusion stop being services and become filter stats or firewall-version perks. Cron Job and Snapshot become daemons, the Filter Bay becomes part of the firewall version, and service ports go. The specialty goes, with its two ranks folded into each class's base kit. Grey protocols and the two junk affixes go. Later, once the skills are redesigned, the two lower filler rows of every talent tree go too.

To check it once it is built, rerun the same measures. The pays-and-builds climb should show every class within 1.25 times of the fastest to 30, no level from 6 to 39 taking more than 1.4 times the one before it, and the never-pays climb reaching 30 for every class within 72 hours. A stat player should still wear an effect item in at least two slots at level 40, with about 1.5 upgrades a level and at least a fifth of them over 10%. Gold should be under 20% repeats. With the default bar, presses should move at least 0.15 at each of 22 and 30, and every subclass unlock should take at least 3% of presses in its best slot.

## 5. Decisions for the designer

1. Should the server keep a level of its own, so alts can push it ahead of your best class, or should it simply be your highest class level?
2. Should the firewall follow your network with upgrades on top, or stay a bought climb with a warning on the level-up banner when it falls behind?
3. Are home fights meant to be rare? If they are, the home-fight services can fold into the wall. If they are meant to be a regular part of play, the services stay and home fights need to come more often than 3% of fights.
4. Is a nine-key bar acceptable, and where does SIGINT go?
5. Should talents stay a point every two levels, or become six bigger choice tiers that rewrite skills?
6. Should uniques stay about a yellow in stats forever, so their effects survive the whole climb?
7. Is a catch-up bonus that only counts time you played acceptable, given the dislike of FOMO and the liking for friction?
8. Should the class pace gap be closed in combat (fight length and late loss rate) or with XP?
9. Paying for top-ups removes resting entirely from level 16. Is that the intended trade, or should top-ups cost more late so that money and waiting both stay in play?

## 6. What changed

The designer approved the package in section 4 with these decisions. Server level became your highest class level, with server XP and banking XP deleted. The firewall follows the network, as the invasion pass had already built it. Unique stats come from the best base at their item level ×1.2. The class pace gap is to be closed in combat by the skills pass, not with XP, so this pass measures it and leaves it alone. Paying for top-ups stays optional, and talents stay as they are.

### What was built

**One level.** Your server's level is your highest class level (`serverLevel` in combat.mjs). It has no XP of its own, and banking loot no longer pays any. Every gate it had reads that level now: base Integrity, daemon slots at 10 and 20, service v2 at 10 and v3 at 25, outpost bandwidth, memory, buildings and architecture. The Server page and the map's server card show the level with the class it comes from, and what the next level adds. `developer server <n>` now sets a floor under it, for tests.

**One banner.** A level-up lists everything the level brings on every track, then the power line (with the server's new Integrity when the level raised it), then a ghost line for the next level that brings something (`levelGains` and `nextGains` in progression.mjs). Level 20 for a Breaker reads *A talent point · A daemon slot · An outpost slot · Buildings: Refinery, Citadel · A choice of architecture*, then *Power +4% · Server Integrity 185*, then *Lv 22: Thermal Runaway, a talent point*.

**Pace.** Decoding pays one kill instead of two, and the 15% early XP bump is gone. A level that runs past 1.25 times its target of 6 + 2.2 × level minutes of play pays kills +50% until it ends (*Behind*). Only time played on that class counts (`tickPlay`). The log says so when it starts, the spoils card has a *Behind* row, the Loadout's XP bar has a *Behind* tag, and the top bar's XP line turns amber. Server repair at half rate while an invasion is contested or breaching was already in (`idleRegen`), and gear.test.mjs checks it.

**Uniques.** A unique's primaries are the best base of its slot at its item level ×1.2, or its own listed numbers grown from its level, whichever is higher. Eviction Notice found at level 20 is a Zero-click with 14 Damage instead of 6. The Resident drops each of its two uniques once (`BOSS_LOOT.once`). After both are in the collection its roll gives a world unique you don't have yet, or a yellow. Ten world uniques were written for levels 18 to 40:

| Unique | Slot, level | What it does |
|---|---|---|
| Rowhammer | Exploit, 18 | Bare parts patch their ◆ back 3 cycles later |
| Ctrl-C | Script, 20 | When you call off a tell, every cooldown drops by 2 |
| Slammer | Script, 22 | Burns on a part you break jump to the next part, with what they had left |
| Log4Shell | Exploit, 24 | When you break a part, the part winding up a tell (or the next to attack) takes 22 |
| Spectre | Shell, 26 | Each command you land counts twice toward calling off a tell |
| Bulletproof Host | Proxy, 28 | Block counts double while a part winds up a tell |
| Hot Reload | Implant, 30 | When your command crits, that skill is ready again |
| Interrupt Vector | Script, 32 | When you call off a tell, a shield of 30 goes up |
| Blue Pill | Shell, 34 | A tell landing on you deals half |
| Shellshock | Exploit, 38 | A hit on a part wearing ◆ breaks two of them |

They needed new effect blocks, which the editor now offers. The new trigger is *when you call off a tell* (a charge or cast hit off in time, or a cast stopped by SIGINT). The new conditions are *the target is winding up a tell*, *the target is the signature part*, *a part is winding up a tell* and *the hit is a tell landing*. The new effects are a shield, a hit on the part winding up, two ◆ broken at once, a command counting twice against a tell, a slower patch and burns that jump on.

**Rule affixes.** Every blue carries one minor rule and every yellow one major rule, and each lost one numeric affix to make room (a blue rolls 0–1 numbers, a yellow 2–4). There are eight of each, written in the same effect blocks (`RULES` in gear.mjs; the table is in GAME_RULES.md). Most of them read the board. Interrupt Handler and Deep Inspection hit a part winding up a tell harder. Exception Handler and Abort Handler pay off when you call one off. Double Tap makes one command count twice against a tell, and Daisy Chain throws a break at the part that is winding up. Signature Scan and Null Deref favour a part, and Sticky Bit keeps stripped parts bare longer. The same rule on two items counts once. The first pool had a Retry Loop, where calling off a tell took a cycle off every cooldown. A single refund a fight took 13 points off the level-10 Overclocker's health lost, because one cycle of Flood decides those fights, so Exception Handler replaced it. Stack Canary started as a 6–24 shield and was worth five points of health a fight across the subclasses. It is 1–6 now.

**Bases and greys.** Each slot has two more base tiers, at 34 and 42 (Sandbox Escape and Hypervisor Escape for the Exploit), each about 1.4 times what the tier before gives at its level. Grey protocols and the Buggy and that Leaks affixes are gone, so about one kill in nine drops a white.

**Tracks.** Four services stay: the Route Logger, the Build Farm, the Edge Router and the Scheduler. Section 3 kept them because each works on the network and none on the home fight. There are no ports. The rest moved as section 3 proposed:

| Was a service | Now |
|---|---|
| Filter Bay | The firewall has two filter slots, and tiers +1, +3 and +5 add one each (five at +5, what a v3 Bay and the old tier slots gave) |
| RAID Array | Tiers +1, +3 and +5 each add 5% to the server's max Integrity (15% at +5, a v3 Array) |
| Hardened Kernel | Filter stat *Hardened*, 2–6 Block at home |
| Scrubber | Filter stat *of the Scrubber*, a 4–10% shield at the start of a home fight |
| Hot-patcher | Filter stat *Self-healing*, 0.3–1 Regen at home |
| Counter-intrusion | Filter stat *of Barbs*, 2–6 back on every hit at home |
| Cron Job | A daemon, cooldown 3, that hits the part winding up a tell for 8, or the next to attack |
| Snapshot | A daemon, once a fight, whose first hit below half restores 8% (12% at v2, 16% at v3) |

The specialty is gone. Its two ranks are part of every class's kit from level 5: Overclocked Core for the Breaker, Patch Notes for the Bastion, Thread Pool for the Operator and Recon for the Infiltrator. The Infiltrator gets Recon because two ranks of Heap Spray took a blue Payload from 34% of its Signal lost a fight at level 10 to 21%, under the 25% floor balance.test.mjs holds. The other three move the subclass table by three points or less.

**Save v34** (`progressionRestore` in progression.mjs). Server XP is dropped. A save that ran the Filter Bay, the RAID Array or one of the four services that became filter stats gets back everything each version cost, in credits, code, Exploits and salvage. The blueprint of a service that became a filter stat becomes that filter's recipe. A running Cron Job or Snapshot becomes that daemon at the service's version, and so does a Cron Job or Snapshot source you held. An install in progress is refunded. The specialty cost nothing, so its pick is simply dropped, with a log line naming each class's kit talent. Greys become Stock items of their base and level without the junk affix. Uniques you hold grow to the new formula and never shrink. Blues and yellows you hold get a rule and keep their numbers. The skills pass may bump SAVE_VERSION too, so a merge should keep both steps.

### Before and after

Both columns come from the same bot (`bot.mjs` `simulate`, which now has the `trace` and `gearRule: 'stats'` options built in) on four classes, six seeds and three money modes to level 40, plus 24 climbs with the stat-aware gear rule. "Before" is commit 7fd95f3, with the solo tells and the invasion rework already in, so it differs a little from section 1. The bot plays at the relaxed 12-second cycle, as before.

| Class | Pays and builds, level 30 | Level 40 | Never pays, level 30 | Level 40 |
|---|---:|---:|---:|---:|
| Breaker | 17.5 → 18.0 h | 28.7 → 30.4 h | 27.3 → 30.4 h | 51.5 → 56.3 h |
| Bastion | 37.5 → 35.0 h | 65.3 (5/6) → 61.6 h | 69.8 (4/6) → 54.9 (5/6) h | not reached |
| Infiltrator | 20.8 → 20.1 h | 34.2 → 34.0 h | 31.0 → 28.5 h | 52.5 → 51.5 h |
| Operator | 24.1 → 23.5 h | 42.3 → 41.6 h | 49.6 → 39.5 h | not reached → over 72 h (1/6) |

To level 10 the climb is a little slower (pays and builds: Breaker 2.4 → 2.5 hours, Infiltrator 2.4 → 2.9, Operator 2.2 → 2.8, Bastion 3.0 → 3.1), because decoding pays half as much and the early bump is gone. To level 20 it is within half an hour of before, except the Infiltrator (8.5 → 9.6 hours).

The class gap to 30 in the climbs that pay and build went from the Bastion at 2.14 times the Breaker's time, the Operator at 1.37 and the Infiltrator at 1.18 to 1.94, 1.30 and 1.12. The target is 1.25 for every class, and the rest of it is the skills pass's to close. Catch-up is most of what moved the Bastion. It paid the Bastion 5–8% of its XP from level 11 and the other classes 0–4%, and it was on for about a third to a half of all levels past 15 in those climbs. In the climbs that never pay it was on for 62–98% of levels, because the bot counts its resting as play, and it paid the Bastion 8–14% of its XP and the others 2–12%.

Minutes per level, all classes pooled, pays and builds (median of the climbs):

| Level | 5 | 6 | 10 | 15 | 16 | 20 | 22 | 25 | 26 | 30 | 33 | 35 | 39 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Before | 10 | 24 | 27 | 45 | 42 | 58 | 64 | 85 | 78 | 90 | 87 | 81 | 99 |
| After | 14 | 25 | 27 | 41 | 47 | 52 | 77 | 79 | 89 | 90 | 101 | 89 | 95 |

The cliff at level 6 went from 2.40 times level 5 to 1.81 times. It is still the only level from 6 to 39 over 1.4 times the one before. The biggest step after it is level 22 at 1.38 (before, it was level 25 at 1.37).

Gear for a player who equips by stats, before → after:

| Levels | Upgrades a level | Median upgrade | Upgrades of 10% or more | Effect drops | Upgrades that add an effect |
|---|---:|---:|---:|---:|---:|
| 1–5 | 0.7 → 0.8 | 9.6% → 7.1% | 48% → 44% | 22% → 83% | 28% → 69% |
| 6–10 | 1.1 → 1.0 | 4.5% → 3.8% | 14% → 6% | 11% → 82% | 11% → 24% |
| 11–15 | 1.3 → 1.6 | 3.8% → 2.9% | 8% → 4% | 10% → 85% | 7% → 12% |
| 16–20 | 1.6 → 1.7 | 4.5% → 2.8% | 6% → 3% | 12% → 88% | 4% → 9% |
| 21–25 | 1.3 → 1.4 | 4.2% → 1.8% | 4% → 1% | 13% → 90% | 2% → 1% |
| 26–30 | 1.5 → 1.5 | 3.7% → 3.5% | 5% → 6% | 11% → 91% | 1% → 1% |
| 31–35 | 1.3 → 2.2 | 4.6% → 2.8% | 1% → 5% | 12% → 90% | 0% → 1% |
| 36–39 | 1.2 → 2.1 | 3.5% → 2.5% | 2% → 2% | 11% → 89% | 0% → 0% |

From level 16 there were 1.36 upgrades a level before and 1.78 after. The quarter points went from 1%, 4.3% and 6.6% to 0.9%, 2.6% and 5.9%, and 4% of upgrades were 10% or more both times. The new tiers show at 31–39, where upgrades come about twice a level. The median upgrade got smaller because an item with a rule counts about 3% of power to the stat player, so it swaps for an effect at nearly the same numbers. Gear Damage at level 40 went from 0.84 of a Spike to 1.07.

What a stat player wears, before → after:

| Level | Uniques (share of slots) | Effect items loaded | Gear Damage (× Spike) | Gear Signal (share of max) |
|---:|---:|---:|---:|---:|
| 10 | 17% → 21% | 1 → 4 | 0.22 → 0.24 | 25% → 23% |
| 20 | 3% → 14% | 0 → 5 | 0.45 → 0.49 | 41% → 39% |
| 30 | 0% → 11% | 0 → 5 | 0.72 → 0.65 | 49% → 46% |
| 35 | 0% → 14% | 0 → 6 | 0.86 → 0.93 | 55% → 53% |
| 40 | 0% → 1% | 0 → 6 | 0.84 → 1.07 | 55% → 59% |

All 24 stat climbs wear an effect item in all six slots at level 40, where none did before. The stat player loaded a unique 216 times instead of 67, and kept each a median of 2 levels (114 minutes) against 3 levels before. A unique at its drop level ×1.2 is overtaken after two or three levels of 4% growth and a yellow's affixes. The rarity-first player kept each unique a median of 4 levels instead of 2. Few uniques drop from 36 up, which is why the share falls to 1% at 40.

Gold is still about one drop an hour: 36.8 a climb before and 35.1 after. Repeats fell from 75% of gold drops to 7%, because the Resident's roll now hands out world uniques you don't have. Greys went from 2–8% of drops to none, whites from 12–28% to 10–16%, and blues from 36–63% to 48–64%.

The balance and economy checks stayed in place. The subclass fights in balance.test.mjs (blues, health lost a fight) moved by three points or less at levels 10 and 30. At 18 the Overclocker went from 40% to 32%, and the others moved by two points or less. The Sysop's wide sample at level 30 went from 48% lost and 77% wins to 51% and 72%, still inside its 70–92% band. friction.mjs moved by three points or less in every row but one: yellows at level 5 went from 27% to 21%, at the bottom of their 20–30% band, which is where a major rule shows most. econ.mjs shows the bot that builds spending 120–720 credits on services by level 20 instead of 1,440–1,680, and the rest on top-ups and buildings, with no climb running short.

### Against the checks in section 4

Section 4 asked for six things.

- Every class within 1.25 times the fastest to level 30, in the climbs that pay and build. Not yet: the Bastion is at 1.94 and the Operator at 1.30. That is the skills pass's.
- No level from 6 to 39 taking more than 1.4 times the one before. Level 6 is 1.81 times level 5, down from 2.40. Every other level is under 1.4.
- The never-pays climb reaching 30 for every class within 72 hours. 23 of 24 climbs do, against 22 of 24 before. One Bastion seed still stalls.
- A stat player wearing an effect item in at least two slots at level 40. All 24 do, in all six slots.
- About 1.5 upgrades a level with at least a fifth of them over 10%. There are 1.78 a level, but still 4% over 10%.
- Gold under 20% repeats. It is 7%.

### Decisions for the designer

1. **The Infiltrator's kit talent.** Two ranks of Heap Spray make the Payload far stronger than the few percent the specialty was meant to be (34% to 21% of its Signal a fight at level 10), so the Infiltrator's kit is Recon. Recon does nothing for a Payload. Should the Infiltrator get one rank of Heap Spray instead, or should Inject's base tick come down when the skills pass reworks it?
2. **Blues roll 0–1 numbers.** "Drop one number affix" was read literally, so a blue rolls 0 or 1 where it rolled 1 or 2. Section 3 had proposed exactly one. A blue built around a stat (compiled, or chased by the balance bots) always has that one.
3. **Old blues and yellows got a rule and kept their numbers,** so a stash from before v34 is a little stronger than new drops. The alternative is to take away each one's weakest affix.
4. **Big upgrades are still rare.** 4% of upgrades are 10% or more, against a target of a fifth. The two late tiers did not change that, because one slot's base is a small share of your hit. Spreading the rarities (Tuned 1.15, Custom 1.3) is the next lever section 3 named, and it would need a friction pass.
5. **Uniques still fade in two or three levels for a stat player.** If a unique should last through its band, its primaries could take ×1.3, or a unique could count its item level as two or three levels above its drop.
6. **The gold rate.** The Resident still rolls gold on every takeover at 30% plus pity, so gold stays at about one an hour, nearly all of it new. Lowering the Resident's chance once both of its own are found would bring gold toward the design's one every 10 to 12 hours.
7. **Behind counts resting at the terminal.** A player who rests with the game open and keeps typing builds Behind time, and the bot shows it on for most levels of a climb that never pays. Counting only time in fights and runs would make it a pure stall catcher.
8. **Level 6** still takes 1.8 times as long as level 5 (25 minutes against 14). Halving decoding moved most of the gap. Most of the rest is that the early decodes are all spent by level 5.
9. **A merge note for the class tests.** The kit talent changes exact skill numbers from level 5. Eight test files that check exact numbers (the four subclass files, classes, combat, skills2 and gear) got one line in their header that sets `LOADOUT.specRanks = 0`. Two assertions about daemon slots changed, because a level-38 or level-50 test server now has both of its daemon slots.
