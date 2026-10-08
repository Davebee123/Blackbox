# Skills that read the board

This pass gave every subclass skill a moment on the board that it is built for, and taught the bots to press it then. The kit pass that followed (docs/kits.md, section 10) grew each line to eleven skills, moved several of the skills below to new levels and changed some of their numbers. docs/subclasses/ has the current lines, and this page is the record of the pass before it. Before it, several skills were flat numbers that the planner pressed whenever they were off cooldown, a few made the bot play worse, and Spike carried the Warden, the Sysop and the Herder. The code is in dist/data.mjs and dist/classes/*.data.mjs (the numbers and the text), dist/classes/*.mjs (what each skill does and each subclass's planner), and dist/situations.mjs (the moment each key lights up for).

## The bar

The bar holds the plain hit on key 1 (Spike then; since the kit pass each class names it, Bash, Ban, Poke or Ping), seven class skills on keys 2 to 8 from level 1, an eighth on key 9 from level 22 and a ninth on key 0 from level 30. SIGINT moved from key 9 to the - key, so it keeps one key for the whole game. Run skills (Spoof, Tap) no longer take a slot. A skill you unlock goes onto the bar by itself while a slot is free, which means the skill that opens at 22 or 30 lands in the new slot. The Loadout shows a closed slot as *slot Lv 22* or *slot Lv 30*. GAME_RULES.md said the bar was full at 18, while the code filled it at 22. Both now say seven, then eight at 22, then nine at 30.

A save from before this pass (SAVE_VERSION 35, `barRestore` in combat.mjs) drops run skills from each bar, keeps the bar as it was, and fills only the slots that are new with what the player would have been given on levelling.

## Keys that light up

When a skill's moment is on the board, its key says so in amber, in a word or two: *drain charge*, *stops a cast*, *fragments*, *Exposed ×2*, *seal*, *no spawn*. A key that a landed tell knocked offline says *OFFLINE* in red. The words come from `SITUATIONS` in dist/situations.mjs. The planners answer the same moments.

## What changed, class by class

The press shares are the share of a subclass's commands that went to that key on the 24 class-balance fights at its level (`node balance.mjs` fights, the reading bot, the bar a player has at that level). *Before* is the code before this pass, with a seven-key bar. *After* is this pass with the progression package merged. A dash means the key was not on the bar or was never pressed. The press test (presses.test.mjs) also puts each skill on the bar four levels after it opens and plays it over fights that hold its moment: the bracket's own fights, six worms, six elites and four strains. Every subclass skill but Rebalance, which has nothing to do alone, is pressed there at least once.

### Breaker: Demolitionist

| Skill | The problem | The moment now | Lv 30 share before → after |
|---|---|---|---|
| Shatter | The bot pressed it whenever it was lit, as if it were free, though it takes the command and hits for 38 where Flood hits a bare part for 76. Taking it off the bar cut the Lv 18 Demolitionist's losses from 33% to 17%. Its spill also counted as a hit on every part, so it called off charges by accident. | It is lit for one cycle, on the part whose last ◆ you just broke, and the bots press it when it's the biggest hit they have on that part. Its hit no longer counts as an answer to a tell. | 36% → 21% at Lv 18, 41% → 34% at 30 |
| Shaped Charge | Without the Shatter waste, the Demolitionist lost 17% a fight at Lv 18, under the 25% floor. Shaped Charge (all ◆ off at once) was most of that. | It provokes again: the part lashes out and its attack comes a cycle sooner, so it's for a part whose attack is still far off. An earlier balance pass removed the provoke to make up for a Shatter nerf. | 18% → 11% |
| Fork Bomb | 15 to every part and 30 to an Exposed one. The bot pressed it as filler. | Fragments are up. It deals 12 to every part and three times that to each fragment, so it clears a Mass Mailer's brood and chips the rest. | – → 2% (13 presses at 18 in the press test) |
| Thermal Runaway | A plain burn. | A part compiling a cast. Each tick counts as a hit on the cast, so the burn stops it when SIGINT is cooling. Its ticks are 4, 8, 12 and 16. | – → 12% |
| Logic Bomb | A delayed area hit with nothing to aim at. | Twins and the Tripwire. A part it breaks can't reboot, and a Tripwire it breaks stays quiet. | – → rare (1 in the press test) |
| Bit Rot | It stopped patching and nothing else. | A seal. A rotting part's seal fails. | – → rare (1) |
| Zero-Day | 65 through armor once. | Locks and wards. It goes through those too, so it is the answer to a Mutex lock or a Lockbox ward. | – (opens at 38) |

### Breaker: Overclocker

| Skill | The problem | The moment now | Lv 30 share before → after |
|---|---|---|---|
| Segfault | ×3 under 30% made it an execute that the generic planner already covered with Overload. | A part winding up a charge. It hits for three times as much and calls the charge off. | 12% → 17% |
| Overvolt | A buff that made the next Overload hit twice, so it cost a command and did nothing on its own. | A cast, or a seal on a part with two ◆. It is two hits of 20 in one command, and both count, so one Overvolt stops a cast. | 6% → 14% |
| Brace | +5 Block and a ◆ off whatever hit you, which barely mattered. | A charge you can't call off. Hits deal 30% less for two cycles, and whatever hits you takes twice what Brace saved. | – → 4% |
| Sudo | Every hit crits for two cycles, a flat burst. | A part rule in your way. For two cycles locks and wards don't hold your hits, a Tripwire you break stays quiet, and the Decoy and the Mimic can't copy you. | – → 3% |
| Stack Smash | 30 damage that hit again on each crit, never better than Overload. | An Exposed part. After an Exploit it hits twice for sure, and crits keep adding hits. | – → rare (1 in the press test; most at-level parts break before the combo is worth it) |
| Turbo Boost | +2 Momentum for 6 Signal. | You are under half your Signal. Then it costs nothing and gives 3 stacks, which feed Thermal Throttle. | – (opens at 34) |
| Thermal Throttle | Unchanged in numbers. Its pierce now also goes through locks and wards. | Momentum to spend, or a lock to burst. | 7% → 8% |

### Bastion: Warden

| Skill | The problem | The moment now | Lv 30 share before → after |
|---|---|---|---|
| Suspend | A plain two-cycle delay. | A charge winding up. The charge drains out and the attack lands plain. | 3% → 3% (52 presses in the press test at 16) |
| Quarantine | A delay and +25%. | A cast compiling. Quarantine stops it, which saves SIGINT for the next one. | – → 9% |
| Throttle | Half damage for 3 cycles, pressed at random. | A part gone loud (a Tripwire set off, Double Extortion, a Bricker's rage), where it lasts 6 cycles and the loud wears off, or a charge Suspend can't reach. | – → rare (4 in the press test) |
| Bulkhead | Half damage for 2 cycles. | A charge landing now that nobody called off. It takes three quarters off a charged hit. | 2% → 1% |
| DMZ | −30% to the crew, which solo was a weaker Bulkhead. | A Replicate landing. Inside the DMZ a Replicate spawns nothing, fragment bites and small hits do nothing, and the rest deal 30% less. | – (opens at 34; 26 presses in the press test at 38) |
| Purge | It cleared encryption. | Encryption or Corrupted on you. The Warden's planner now uses it as its burn and its cleanse, and that took Spike from 47% of its presses to 19%. | 4% → 22% |

### Bastion: Sysop

| Skill | The problem | The moment now | Lv 30 share before → after |
|---|---|---|---|
| Heartbeat | A small heal over time. | A charge coming. While it runs, a charged hit on you deals 25% less. | 2% → 5% |
| Scrub | It cleared encryption and Scrambled. | Encryption, Scrambled or Corrupted on you. It heals 12 instead of 8 when it cleared something. | – → 10% |
| Rollback | Undo the last hit. | A cast that just compiled (alone, it undoes it), or Corrupted. | – → rare (5 in the press test) |
| Multicast | A crew heal, useless alone. | Two or more fragments. Each takes the heal as damage. | 1% → – at 30 (6 presses in the press test at 18) |

The Sysop alone still leans on Spike, at 43% of its presses at Lv 30 (it was 50%). A solo healer needs a free hit between heals. Its 30th-level bar holds Rollback in the ninth slot, so Reclaim (opened at 26, when the bar was full) waits in the library unless the player puts it on.

### Infiltrator: Payload

| Skill | The problem | The moment now | Lv 30 share before → after |
|---|---|---|---|
| Implant | A burn till the part breaks. | A part that heals or grows (a Leech, a Patchwork, Self-Update). While it burns, the part can't be healed or grown. | 15% → 11% |
| Polymorph | A burn through armor that was as good on a bare part. | An armored part. On a bare part it burns for half. | – → 6% |
| IRQ Storm | Every burn ticks once more. | Burns on a part with a tell. Each part it ticks counts it as a hit from you, so one IRQ Storm can call off a charge and count toward a cast. | – (opens at 38) |
| Thrash, Propagate | Unchanged in numbers. The planner now presses Thrash on a bare part carrying three burns or more, and Propagate when one part is loaded with burns and two others carry none. | | rare (5 and 2 in the press test) |

### Infiltrator: Phantom

| Skill | The problem | The moment now | Lv 30 share before → after |
|---|---|---|---|
| Backstab | It crit when the part's attack was not due, which was most of the time. | A part busy with a tell (charging, compiling, sealing or recording). It always crits that part. | 2% → 2% |
| Log Wipe | A Weak Spot reset and half damage on the next hit. | The Mimic. Its next beat has nothing of you to play. | – (opens at 34) |

### Operator: Herder

| Skill | The problem | The moment now | Lv 30 share before → after |
|---|---|---|---|
| Fan-out | A helper on every part, which the bot pressed before Botnet. Three helpers on the target beat one on each part, and the Lv 18 Herder lost less with Fan-out off its bar. | Three parts or more with Botnet cooling, a tell on a part your helpers don't reach yet (for Kill Switch), or Fork ready to split a helper on every ◆. | 19% → 16% |
| Fork | Each helper hit had a 15% chance to start another helper, so the swarm grew at random and the bot spent commands on it with nothing to show. | Thick armor. Each ◆ your helpers break starts another helper on that part. | – → 16% |
| Kill Switch | Cash in your helpers' remaining damage. | Two parts with tells and helpers on them. Each part they hit takes it as a hit from your command, so it can call off two charges at once. | – → 2% |
| Garbage Collect | 10 to every part and longer helpers. | Fragments up. Each fragment takes three times as much. | – → 5% |
| Cron Storm | Unchanged. The planner presses it with five helpers or more. | | – (opens at 38; 2 presses in the press test) |

### Operator: Hijacker

| Skill | The problem | The moment now | Lv 30 share before → after |
|---|---|---|---|
| Hijack | A helper spent to turn the part's next attack onto its own side at 60%, which often hit a part that was already broken and left the real threat in place. | A tell with a helper on its part. A charge lands on another part of the virus at full size, through armor, and a cast compiles for you instead (+35% damage for 4 cycles). With no tell, the part's next hit lands on its own side for half. | 4% → 9% |
| Spoofed ACK | A one-cycle delay and half the attack back. | A charge winding up. It drains out, and the part takes half the charge (up to 60). | – → 11% |
| Jam | A one-cycle delay for a helper. | A charge with a helper on its part. The charge loses its signal and lands plain. | 11% → – at 30 (5 presses in the press test at 16; Spoofed ACK does the job from 22) |
| Replay | Its attack back at it, 20 to 30. | A charge winding up. It plays the charged hit back, up to 80, and the plain attack is 25 to 40. | 15% → 16% |
| Barrier | A shield worth a helper's remaining damage. | You are under half and a big hit is landing on a part your helper is on. | – (opens at 26; 4 presses in the press test at 30) |
| Cache Poison | Its repairs hurt it. | A seal. A poisoned part's seal fails and hits it for 30. | – (opens at 30) |
| Reroute | Move every helper to one part. | A cast. Each helper's arrival counts as a hit from you, so two helpers stop a cast. | – (opens at 34) |
| Blackhole | Unchanged. The planner sends a charge into it when nothing else answers it. | | – (opens at 38) |

The Hijacker's edge, Man in the Middle, now also counts a helper of yours on a part as a foothold, and your own hits on that part take +20%.

## Spike's share

Spike was the top key for the Warden (47% at Lv 30), the Sysop (50%) and the Herder (46%). After this pass the Warden's top key is Purge at 22%, the Sysop's is Spike at 43%, and the Herder's is Spike at 41%. presses.test.mjs holds every subclass's top key under 45% at Lv 30. A tighter line at 40% would fail on the Sysop, a solo healer whose free hit is how it deals damage at all. The kit pass gave every subclass cheap core hits (Checksum, Reject, nohup, Sniff and others), and key 1 now takes 13% or less of every subclass's presses at Lv 18, 30 and 40 but the Payload's 17% at 40 (docs/kits.md, section 10). kits-balance.test.mjs holds it at 20%.

## Balance before and after

Signal lost a fight and wins, on the 24 class-balance fights at each level, for the bot that reads tells, and the gap to the same bot ignoring them (`TELL.bots.answer = false`). *Before* is the code before this pass. *After* is this pass with the progression package merged in, so some of the change at each level is that package's (one level, kit talents, new rules on gear).

| Subclass | Lv | Before | After | Ignoring costs, before | Ignoring costs, after | Ignoring bot's wins |
|---|---|---|---|---|---|---|
| Demolitionist | 10 | 35% · 22/24 | 41% · 22/24 | 9.8 | 12.8 | 20 → 21 |
| Demolitionist | 18 | 35% · 24/24 | 28% · 24/24 | 2.0 | 5.9 | 24 → 22 |
| Demolitionist | 30 | 21% · 24/24 | 27% · 23/24 | 0.0 | 3.6 | 24 → 22 |
| Overclocker | 10 | 41% · 23/24 | 39% · 22/24 | 6.9 | 5.7 | 22 → 22 |
| Overclocker | 18 | 40% · 24/24 | 31% · 23/24 | 2.2 | 15.0 | 24 → 21 |
| Overclocker | 30 | 36% · 23/24 | 37% · 23/24 | 3.2 | 7.1 | 23 → 20 |
| Warden | 10 | 35% · 24/24 | 36% · 23/24 | 3.9 | 11.9 | 23 → 21 |
| Warden | 18 | 29% · 24/24 | 29% · 24/24 | 6.6 | 8.1 | 23 → 23 |
| Warden | 30 | 34% · 24/24 | 30% · 23/24 | 11.3 | 10.4 | 24 → 23 |
| Sysop | 10 | 41% · 24/24 | 45% · 22/24 | 4.7 | 8.1 | 22 → 21 |
| Sysop | 18 | 44% · 22/24 | 44% · 23/24 | 4.6 | 17.9 | 18 → 17 |
| Sysop | 30 | 46% · 21/24 | 36% · 21/24 | 4.1 | 7.2 | 18 → 21 |
| Payload | 10 | 34% · 24/24 | 30% · 24/24 | 10.1 | 38.9 | 24 → 16 |
| Payload | 18 | 44% · 24/24 | 42% · 23/24 | 0.0 | 12.9 | 24 → 22 |
| Payload | 30 | 49% · 24/24 | 41% · 24/24 | 2.8 | 6.1 | 24 → 21 |
| Phantom | 10 | 28% · 24/24 | 32% · 24/24 | 6.7 | 14.6 | 24 → 23 |
| Phantom | 18 | 32% · 24/24 | 41% · 23/24 | 1.2 | 22.0 | 24 → 16 |
| Phantom | 30 | 28% · 24/24 | 28% · 24/24 | 2.1 | 13.5 | 24 → 22 |
| Herder | 10 | 36% · 24/24 | 30% · 24/24 | 5.3 | 25.7 | 24 → 20 |
| Herder | 18 | 40% · 24/24 | 44% · 24/24 | -0.1 | 8.1 | 24 → 21 |
| Herder | 30 | 44% · 22/24 | 40% · 22/24 | -0.4 | 1.4 | 22 → 23 |
| Hijacker | 10 | 43% · 24/24 | 30% · 24/24 | 5.1 | 26.3 | 23 → 22 |
| Hijacker | 18 | 34% · 24/24 | 29% · 24/24 | 7.0 | 13.0 | 24 → 21 |
| Hijacker | 30 | 46% · 23/24 | 43% · 24/24 | -0.2 | 11.2 | 23 → 22 |

On average the ignoring bot used to lose 6.6, 2.9 and 2.9 points more at Lv 10, 18 and 30. Now it loses 18.0, 12.9 and 7.6, and it wins 503 of 576 fights where the reader wins 557. The Lv 10 Payload is the outlier. Ignoring tells costs it 39 points and 8 fights, because its burns leave parts alive long enough for every charge and cast to land.

The HEATSINK, the farm's healer check, went from Integrity ×15 to ×17. Once the bots stopped wasting commands on Shatter, a crew without a healer beat it 11 times in 16, and the check is that such a crew mostly loses. At ×17 it wins 3 in 16 again, and the full crew still wins every try.

## The bots

Each subclass's planner in dist/classes/*.mjs reads the board for its own keys before the generic planner (dist/planner.mjs) picks a hit, and `tellMove` in dist/tells.mjs answers tells with a skill built for them before it spends a plain hit or SIGINT. The generic planner focuses an Open part, lets the Overclocker burst through a Mutex lock, and gives Bastions other than the Sysop Purge as a filler.
