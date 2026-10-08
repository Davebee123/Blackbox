# Kits: rotations, answers, cooldowns and specialists

This began as a design for review, and section 10 records what shipped from it. It sets out a kit model with four layers, audits every subclass skill against that model with the balance harness, proposes a pool of 15 skills for each subclass, and gives example loadouts, bar and UI changes, a hook into the genome design, the tests that should hold it, and the open decisions.

The numbers in section 2 are measured. The numbers in sections 3 and 4 for skills that don't exist yet are targets, not measurements.

## Summary

| Subclass | Missing today | Too conditional or dead | Flat (pressed, worth nothing) | Makes fights worse | Headline new skills |
|---|---|---|---|---|---|
| Demolitionist | A cooldown before 38, and any mitigation | Fork Bomb, Logic Bomb, Chain Reaction, Bit Rot | Shatter | Exploit | Backfire, Debris Field, rm -rf |
| Overclocker | A Momentum builder, a cooldown before 34 | Sudo, Stack Smash, Thermal Throttle | Segfault is close to flat | Exploit | Hot Loop, Vent, Fault Injection |
| Warden | A core hit with interplay, a planned cooldown | Throttle, Failover | Blowback, Retaliate | none | Reject, Circuit Breaker, Honeypot |
| Sysop | A core rotation (Spike is 41–47% of presses) | Multicast, Rollback, Rebalance | Retaliate | Patch (solo) | Checksum, Revoke, Maintenance Window, Reclaim moved to 12 |
| Payload | A rotation the bot keeps (it drops Inject) | Keepalive, Propagate, Detonate | IRQ Storm, Polymorph | none (the line as a whole costs 5–7 points) | Fuzz, Logic Trap, Outbreak |
| Phantom | A loadout choice (10 keys for 9 slots at 38), a cleanse | Keepalive, Tag, Log Wipe | Opening | Rootkit Implant | Fingerprint, Side Channel, Rotate Keys, Unmask, Vanish |
| Herder | A rotation (Spike is 35–50%) | Hook, Spawn, Cron Storm, OOM Kill | Malloc | Kill Switch, Garbage Collect, Mesh | nohup, Load Shed, Crontab |
| Hijacker | A cheap core hit, a planned cooldown | Jam, Hook, Barrier, Blackhole, Cache Poison | Spoofed ACK | none | Sniff, Takeover, Echo Cancel |

Every subclass grows to 15 bar keys (from 12, or 10 for the Phantom), with the first loadout choice at level 16 instead of 26. Over-conditional skills keep their moment and gain a baseline that is at least as good as a Spike for the command.

Many of the "dead" and "worse" findings are the planner, not the skill. Logic Bomb, Backstab, Detonate and the Payload's Inject are good buttons that the bots press too rarely or in the wrong order. Section 2 says which is which, because the press test and the balance tests can only see what the bots do.

## 1. The kit model

### 1.1 The four layers

| Layer | What it is | Keys on a rotation build | Cooldowns | What makes it good |
|---|---|---:|---|---|
| Core rotation | Three or four buttons that are good against anything. One sets up or feeds another, the way a hunter's shots work together between its cooldowns. Spike, on key 1, is the filler under it. | 4 | 0 to 3 cycles | A fight where nothing special happens is played mostly with these, and they turn over every two or three cycles so there is always one ready. |
| Utility and answers | Interrupts, cleanses, mitigation, control, and the answers to tells (a charge, a cast, a seal, the Mimic). | 3 | 4 to 6 cycles | Each one has a plain use as well as its answer. Suspend delays any attack and drains a charge. Scrub heals and cleanses. |
| Cooldowns | The big buttons you plan a fight around. | 1 to 2 | 8 or more, or once a fight | A fight at level 30 lasts 5 to 14 cycles for most subclasses, so a cooldown of 8 to 12 fires once in most fights and twice against a boss. |
| Conditional specialists | Great against one kind of board: fragments, healers, seals, the Mimic, a part rule, a boss. | 0 to 1 on a rotation build, 2 to 3 on a conditional build | 3 to 6 cycles | In its situation it does two or three times its baseline. Outside it, it is still a solid press. |

Every skill obeys two rules.

| Rule | What it means | Example |
|---|---|---|
| Baseline floor | Outside its situation, a skill is worth at least a Spike for the command. A pure setup skill does some damage as well. | Segfault hits for 30 on any part and triple on a part winding up a charge. That is the shape to copy. Chain Reaction today does nothing unless a part breaks within 3 cycles, which is the shape to fix. |
| Situation multiplier | In its situation a specialist is worth two to three times its baseline, so carrying it is a real choice. | Fork Bomb (reworked) deals 16 to every part and 48 to every fragment. |

### 1.2 How many presses a fight has

The layers have to fit the number of commands a fight takes. At level 30 the scripted players take these many cycles, one command a cycle.

| Subclass | Wild families | Strains | Guards | Solo bosses |
|---|---:|---:|---:|---:|
| Demolitionist | 8 | 5 | 5 | 9 |
| Overclocker | 8 | 6 | 6 | 9 |
| Warden | 14 | 10 | 9 | 14 |
| Sysop | 18 | 13 | 24 | 20 |
| Payload | 7 | 5 | 4 | 9 |
| Phantom | 11 | 6 | 5 | 12 |
| Herder | 5 | 7 | 7 | 8 |
| Hijacker | 9 | 7 | 5 | 12 |

A damage dealer presses 5 to 12 commands a fight. With cooldowns of 2 to 6 cycles, it presses at most six or seven different keys in one fight. A 9-key bar therefore doesn't mean nine keys a fight. It means four core keys that carry the fight, two or three answers that come up most fights, a cooldown, and one or two keys that come up only in the right fight. This is why a pool bigger than the bar matters. The keys that come up only in some fights are the ones worth swapping before a fight.

### 1.3 Press-share targets

Shares of all commands in a fight, Spike and SIGINT included. Spike counts in the core row, and SIGINT counts as utility.

| Layer | Rotation build, typical fight | Conditional build, matched fight | Conditional build, unmatched fight |
|---|---:|---:|---:|
| Core rotation | 60–70% | 35–45% | 55–65% |
| of which Spike | 20% at most | 15% at most | 20% at most |
| Utility and answers | 15–25% | 15–20% | 15–25% |
| Cooldowns | 5–15% | 5–15% | 5–15% |
| Conditional specialists | 0–5% | 25–35% | 5–10% |

Here is what that looks like in a level 30 Demolitionist fight against a Ransomware with a Mutex, eight commands, on the rotation build. The keys come from section 3.

| Cycle | Command | Layer | Why |
|---:|---|---|---|
| 1 | `crack mutex` | Core | Strip the part that holds the lock. |
| 2 | `shatter mutex` | Core | Lit on the part you just bared. The Mutex breaks, and its lock on the Encryptor goes with it. |
| 3 | `thermal-runaway encryptor` | Utility | Double Extortion is compiling on the Encryptor. Every tick counts as a hit on the cast, so it stops it and SIGINT stays ready. |
| 4 | `crack encryptor` | Core | The Encryptor is next. |
| 5 | `rm-rf` | Cooldown | Two cycles of every hit landing on every part. |
| 6 | `flood encryptor` | Core | Doubled on a bare part, and half of it lands on the Pulse Node. |
| 7 | `backfire pulse` | Utility | Overcharge is winding up on the Pulse Node. Backfire blows the charge up inside it. |
| 8 | `overload pulse` | Core | The Pulse Node breaks. |

That fight is 5 core presses of 8, 2 utility and 1 cooldown, with no Spike. Against a Worm with fragments, the swarm build swaps Overload and Shaped Charge for Fork Bomb and Chain Reaction, and three of its eight presses go to them.

## 2. Audit

### 2.1 How it was measured

The harness is balance.mjs's `build` and the scripted planner, with a fight function that also takes solo bosses. Each subclass played the bar a player has at its level by default (`defaultBar`), in blues with its chase stats and the talents `build` gives at that level.

| Fights per level | Count | Notes |
|---|---:|---|
| Wild families | 12 | Four each of Ransomware, Worm and Ghostroot. The third part comes from the seed, so Mutex, Tripwire, C2 Node and Mimic all appear. |
| Strains | 10 at Lv 10, 11 from 18 | Every strain open at the level. |
| Elites | 3 | One per family. Elites are crew rooms and a solo player loses nearly all of them, so they count in press shares but their removal cost is zero. |
| Guards | 6 | Watchdog, Sentinel, Crawler, Shredder, Bouncer and Tracer at the bracket's deepest layer. |
| Solo bosses | 13 | Resident, RELAY-KING, REPO MAN, HOLLOW CHOIR and the nine native bosses. |

Each fight was played with two seeds, so each cell rests on 88 or 90 fights. Levels 10, 18 and 30 were measured, and level 40 as well so the skills that open at 34 and 38 could be seen.

- **Share** is the share of all commands that went to the key.
- **In fights** is the share of fights in which the key was pressed at least once.
- **Removal cost** is how many more points of Signal a fight cost on average with that key's slot left empty. A positive number means the skill helps. A skill that isn't on the default bar (it opened while the bar was full) was swapped in for the least-pressed key instead, and its number in brackets is what the swap saved.
- The **noise** is about 3 points. The same bar on a different pair of seeds moves the average by up to 5.7 points. Removal costs are paired (same seeds), so they are steadier, but anything within 3 points of zero should be read as no effect.

The sample is harder than the 24 class-balance fights in docs/BALANCE.md, because it has 13 bosses and 3 elites in it, so the health-lost numbers are higher than the ones there.

### 2.2 Subclasses at a glance

Effective keys is one over the sum of squared shares, the measure docs/progression.md uses. It counts Spike and SIGINT. *Class core alone* is the same fights with only the class's four core skills on the bar, against the default bar. A positive number means the subclass line helps.

| Subclass | Effective keys at 18 · 30 · 40 | Spike's share at 18 · 30 · 40 | Top key at 30 | Class core alone, points worse at 18 · 30 · 40 |
|---|---|---|---|---|
| Demolitionist | 8.1 · 7.5 · 7.5 | 12% · 3% · 3% | Shatter 22% | +8.8 · +7.5 · +6.1 |
| Overclocker | 6.0 · 6.6 · 6.2 | 13% · 10% · 12% | Crack 28% | +3.7 · +6.6 · +8.1 |
| Warden | 7.2 · 7.3 · 7.2 | 18% · 18% · 18% | Purge 19% | +10.1 · +19.2 · +18.4 |
| Sysop | 4.1 · 4.2 · 4.0 | 42% · 41% · 44% | Spike 41% | +8.3 · +13.5 · +14.4 |
| Payload | 5.4 · 5.5 · 5.4 | 32% · 30% · 30% | Spike 30% | +3.9 · −6.8 · −5.3 |
| Phantom | 4.8 · 6.0 · 6.0 | 23% · 14% · 15% | Inject 24% | +11.8 · +12.4 · +9.5 |
| Herder | 4.0 · 5.0 · 5.4 | 44% · 38% · 35% | Spike 38% | −11.5 · −7.9 · −11.5 |
| Hijacker | 5.4 · 6.3 · 6.2 | 32% · 27% · 27% | Spike 27% | +12.5 · +3.3 · +15.3 |

Two subclasses play worse with their own line than without it. The Herder loses 8 to 12 points to its line at every level, and the Payload loses 5 to 7 from level 30.

### 2.3 Layer shares today

The current skills, classified into the four layers (the class tables below give each skill's layer). Shares are of all commands on the default bar.

| Subclass | Lv | Core (with Spike) | of which Spike | Utility | Cooldowns | Specialists |
|---|---:|---:|---:|---:|---:|---:|
| Demolitionist | 30 | 64% | 3% | 32% | 0% | 4% |
| Overclocker | 30 | 78% | 10% | 20% | 0% | 2% |
| Warden | 30 | 74% | 18% | 25% | 0% | 1% |
| Sysop | 30 | 71% | 41% | 28% | 1% | 0% |
| Payload | 30 | 71% | 30% | 12% | 13% | 5% |
| Phantom | 30 | 81% | 14% | 18% | 0% | 0% |
| Herder | 30 | 64% | 38% | 13% | 4% | 20% |
| Hijacker | 30 | 70% | 27% | 28% | 0% | 1% |

Six of the eight default bars at level 30 press no cooldown at all, because the cooldowns open at 34 and 38 or open into a full bar. The Herder's 20% of specialist presses is Fork and Garbage Collect, and three quarters of the Garbage Collect presses strip armor with no fragment up. No subclass presses a specialist in its moment more than a few percent of the time, and no default bar is a conditional build.

### 2.4 Moments: how often a skill built for a situation meets it

For each skill with a moment, the share of its presses at level 30 where the moment was on the board when it was pressed.

| Skill | Presses at 30 | In its moment | What the rest of its presses were |
|---|---:|---:|---|
| Segfault | 113 | 25% | A plain 30 hit on a part not charging |
| Replay | 122 | 18% | A plain 25–40 hit through armor |
| Rootkit Implant (Payload) | 77 | 8% | A plain burn, no healer on the board |
| Garbage Collect | 60 | 23% | Stripping armor, no fragments |
| Thermal Runaway | 81 | 44% | A plain burn |
| Spoofed ACK | 114 | 48% | A delay and half the attack back |
| Backstab | 33 | 55% | A plain 32 hit |
| Suspend | 107 | 79% | A plain delay |
| Hijack | 63 | 79% | The no-tell use |
| Kill Switch | 34 | 91% | |
| Overvolt | 78 | 97% | |
| Quarantine | 115 | 99% | |
| Fork Bomb, Sudo, Polymorph, Scrub, Heartbeat | 15–122 | 100% | The bot presses them only in their moment |
| Throttle | 13 | 23% | A plain half-damage debuff |
| Multicast | 5 | 20% | |

This answers the concern about Segfault directly. Three quarters of its presses are a plain hit, which is why it is pressed in 86% of the Overclocker's fights. It already has the shape this doc asks for. Its removal cost is small (+0.4 at 30) because a plain 30 is only a little more than a Spike, and that is the price of a reliable button. The skills that are dead are the ones with no baseline (Chain Reaction, Bit Rot, Sudo, Jam, Multicast alone) and the ones the bot presses only in their moment (Fork Bomb, Logic Bomb).

### 2.5 Breaker: Demolitionist

| Skill | Lv | Layer today | Share at 10 · 18 · 30 · 40 | In fights at 30 | Removal cost at 10 · 18 · 30 · 40 | Finding |
|---|---:|---|---|---:|---|---|
| Overload | 1 | Core | 16 · 11 · 10 · 11 | 56% | +6.1 · +1.6 · +0.5 · +1.8 | It carries at 10. Later Shatter and Flood do its job, so it is worth about a point. |
| Flood | 3 | Core | 15 · 12 · 9 · 8 | 52% | +21.7 · +16.8 · +11.8 · +11.0 | It carries at every level. |
| Exploit | 5 | Core (setup) | 9 · 6 · 3 · 3 | 16% | −3.9 · −2.7 · −0.5 · −1.1 | It makes fights worse. A command for one cycle of +25% crit chance returns less than the hit it replaces. |
| Crack | 7 | Core | 16 · 19 · 18 · 17 | 71% | +17.8 · +15.1 · +18.6 · +17.0 | It carries. The Demolitionist's rotation is Crack and whatever follows it. |
| Shatter | 12 | Core (proc) | – · 14 · 22 · 22 | 87% | – · −0.9 · −0.8 · −0.4 | It is flat. It takes a fifth of all presses, and leaving it off costs nothing because Flood or Overload take its place one for one. |
| Fork Bomb | 14 | Specialist | – · 3 · 3 · 3 | 17% | – · +1.4 · +0.4 · −0.3 | It is too conditional. Nearly all its presses are against worms, and it is worth a point there. |
| Shaped Charge | 18 | Utility | – · 11 · 10 · 10 | 71% | – · +6.8 · +3.6 · +4.3 | It works. It is the strip Crack can't finish on thick armor. |
| Thermal Runaway | 22 | Utility | – · – · 13 · 12 | 73% | – · – · +2.0 · +1.2 | It works. 44% of its presses melt a cast and the rest are a plain burn. |
| Logic Bomb | 26 | Specialist | – · – · (1) · (1) | (8%) | – · – · (−0.2) · (−0.3) | It is too conditional in the bot's hands. The bot presses it only on twins or a Tripwire, though 50 to the part and 20 to every other part is a good hit anywhere. |
| Chain Reaction | 30 | Specialist | – · – · 2 · 2 | 11% | – · – · 0.0 · 0.0 | It is dead. With no part breaking in the next 3 cycles it does nothing. |
| Bit Rot | 34 | Specialist | – · – · – · (0) | (1%) | – · – · – · (0.0) | It is dead. One press in 90 fights at 40. |
| Zero-day | 38 | Cooldown | – · – · – · (13) | (96%) | – · – · – · (+8.7) | It is the best unlock in the line, and it opens into a full bar. |
| Spike | 1 | Filler | 33 · 12 · 3 · 3 | | | |

The Demolitionist has the most even presses in the game, but four of its eight line skills are too conditional or dead, its one proc is flat, and it has no cooldown before 38 and no mitigation key at all.

### 2.6 Breaker: Overclocker

| Skill | Lv | Layer today | Share at 10 · 18 · 30 · 40 | In fights at 30 | Removal cost at 10 · 18 · 30 · 40 | Finding |
|---|---:|---|---|---:|---|---|
| Overload | 1 | Core | 18 · 11 · 11 · 10 | 61% | +9.5 · +0.1 · +3.3 · +1.1 | It works, and it is flat late. |
| Flood | 3 | Core | 15 · 9 · 6 · 4 | 42% | +19.1 · +9.6 · +6.4 · +5.6 | It carries early and fades as Segfault takes its presses. |
| Exploit | 5 | Core (setup) | 9 · 5 · 3 · 1 | 17% | −7.1 · −5.1 · −3.1 · −0.7 | It makes fights worse at every level. |
| Crack | 7 | Core | 17 · 29 · 28 · 29 | 100% | +15.0 · +29.4 · +32.0 · +36.8 | It carries. Its removal cost is the largest single number in the audit. |
| Overvolt | 12 | Utility | – · 9 · 11 · 11 | 80% | – · +1.6 · +1.8 · +3.9 | It works. 97% of its presses stop a cast or a seal. |
| Segfault | 14 | Core, with a specialist rider | – · 18 · 17 · 18 | 86% | – · +3.3 · +0.4 · +0.9 | It is not dead. See 2.4. It is a reliable hit with a moment. |
| Thermal Throttle | 18 | Core (spender) | – · 1 · 4 · 5 | 31% | – · +0.6 · +1.4 · +1.4 | It is too conditional in practice. It needs Momentum, and a 6 to 8 cycle fight breaks one or two parts. |
| Brace | 22 | Utility | – · – · 6 · 6 | 44% | – · – · +2.4 · +0.9 | It works modestly. |
| Stack Smash | 26 | Core (combo) | – · – · (1) · (0) | (9%) | – · – · (+0.9) · (+0.7) | It is dead. The bot rarely sets up the Exploit it needs, and Exploit itself is a loss. |
| Sudo | 30 | Specialist | – · – · 2 · 2 | 16% | – · – · 0.0 · −0.1 | It is dead. With no part rule on the board it does nothing. |
| Turbo Boost | 34 | Cooldown | – · – · – · (6) | (36%) | – · – · – · (+1.0) | It is small. |
| Zero-day | 38 | Cooldown | – · – · – · (14) | (98%) | – · – · – · (+9.4) | It works and opens into a full bar. |
| Spike | 1 | Filler | 31 · 13 · 10 · 12 | | | |

The Overclocker's real rotation is Crack and three hits. Its builder-and-spender idea (Momentum into Thermal Throttle) doesn't turn over in fights this short, because only breaks build Momentum. Its first cooldown opens at 34.

### 2.7 Bastion: Warden

| Skill | Lv | Layer today | Share at 10 · 18 · 30 · 40 | In fights at 30 | Removal cost at 10 · 18 · 30 · 40 | Finding |
|---|---:|---|---|---:|---|---|
| Rate Limit | 1 | Core | 25 · 19 · 17 · 18 | 100% | +15.7 · +3.9 · −1.9 · +1.0 | It carries at 10 and is flat by 30, when Purge and the answers do the work. |
| Firewall | 3 | Utility | 4 · 3 · 3 · 4 | 19% | +1.1 · +0.9 · +0.8 · +0.9 | It is small solo. It is the crew taunt. |
| Purge | 5 | Core | 22 · 18 · 19 · 19 | 100% | +24.8 · +20.7 · +21.3 · +22.6 | It carries at every level. |
| Retaliate | 7 | Core (proc) | 13 · 10 · 9 · 9 | 66% | +5.1 · +0.8 · −1.0 · +0.1 | It is flat from 18. |
| Suspend | 12 | Utility | – · 10 · 9 · 8 | 74% | – · +11.0 · +6.8 · +8.9 | It works. 79% of its presses drain a charge. |
| Bulkhead | 14 | Utility | – · 4 · 3 · 3 | 43% | – · +3.0 · −0.1 · +0.9 | It is small. The bot presses it when two attacks land together. |
| Blowback | 18 | Core | – · 10 · 10 · 10 | 84% | – · +0.7 · +0.3 · +1.7 | It is flat. |
| Throttle | 22 | Specialist | – · – · 1 · 1 | 11% | – · – · −1.4 · −0.4 | It is too conditional. Only 23% of its presses find a loud part. Harden in its slot saves 4.8 points at 30, and DMZ saves 5.6 at 40. |
| Harden | 26 | Utility | – · – · (6) · (5) | (59%) | – · – · (+4.8) · (+3.6) | It works, and it opens into a full bar. |
| Quarantine | 30 | Utility | – · – · 9 · 9 | 90% | – · – · +8.0 · +10.4 | It works. 99% of its presses stop a cast. |
| DMZ | 34 | Specialist | – · – · – · (3) | (22%) | – · – · – · (+5.6) | It works as a specialist. See 2.13. |
| Failover | 38 | Cooldown | – · – · – · (2) | (10%) | – · – · – · (−0.4) | It is too conditional. It only pays when you are already low. |
| Spike | 1 | Filler | 28 · 18 · 18 · 18 | | | |

The Warden has the best utility layer in the game. It lacks a core hit with interplay, so Spike is 18% of its presses, and it has no cooldown worth planning around.

### 2.8 Bastion: Sysop

| Skill | Lv | Layer today | Share at 10 · 18 · 30 · 40 | In fights at 30 | Removal cost at 10 · 18 · 30 · 40 | Finding |
|---|---:|---|---|---:|---|---|
| Rate Limit | 1 | Core | 23 · 20 · 19 · 16 | 93% | +18.8 · +20.0 · +16.8 · +19.0 | It carries. It is the Sysop's only real hit. |
| Firewall | 3 | Utility | 5 · 5 · 4 · 3 | 36% | −1.2 · −0.8 · −1.5 · −1.9 | It is a small loss solo. |
| Purge | 5 | Core | 4 · 5 · 1 · 1 | 8% | +13.1 · +9.7 · +2.6 · +2.1 | The bot is told not to press it for a Sysop alone, so a solo Sysop stays slow. When it does press it, it is worth a lot. |
| Retaliate | 7 | Core (proc) | 12 · 10 · 10 · 11 | 77% | +1.0 · +2.2 · −1.5 · −1.9 | It is flat. |
| Patch | 12 | Utility | – · 3 · 2 · 2 | 27% | – · +2.5 · −5.3 · −3.2 | It makes solo fights worse from 30. The bot keeps it for under 30% Signal, where a hit does more. |
| Multicast | 14 | Specialist | – · 1 · 0 · 0 | 3% | – · −0.2 · −0.2 · +0.4 | It is dead solo. It is a crew heal. |
| Heartbeat | 18 | Utility | – · 4 · 3 · 4 | 39% | – · +3.1 · +4.6 · +4.6 | It works. |
| Scrub | 22 | Utility | – · – · 7 · 7 | 38% | – · – · +3.6 · +2.4 | It works. |
| Reclaim | 26 | Core | – · – · (9) · (9) | (79%) | – · – · (+9.3) · (+12.8) | It is the missing rotation. Swapped in it saves 9 to 13 points, but it opens at 26 into a full bar, so a player on the defaults never has it. |
| Rollback | 30 | Cooldown | – · – · 1 · 1 | 9% | – · – · +0.4 · +0.5 | It is too conditional. |
| Hot Standby | 34 | Cooldown | – · – · – · (1) | (27%) | – · – · – · (0.0) | It is a safety net with no measurable effect solo. |
| Rebalance | 38 | Specialist (crew) | – · – · – · (0) | (0%) | – · – · – · (−0.4) | It does nothing solo. |
| Spike | 1 | Filler | 47 · 42 · 41 · 44 | | | |

The Sysop has no rotation. Spike carries 41–47% of its presses at every level, the highest of any subclass. With Reclaim on its bar at level 40 it loses 17% of its Signal in the generic set of 2.13 instead of 29%.

### 2.9 Infiltrator: Payload

| Skill | Lv | Layer today | Share at 10 · 18 · 30 · 40 | In fights at 30 | Removal cost at 10 · 18 · 30 · 40 | Finding |
|---|---:|---|---|---:|---|---|
| Inject | 1 | Core | 48 · 9 · 2 · 2 | 13% | +44.0 · −0.1 · +0.8 · +0.8 | It carries at 10. From 18 the Payload's planner presses its line ahead of it and Inject nearly disappears. |
| Backdoor | 3 | Core | 6 · 11 · 14 · 13 | 87% | +1.5 · 0.0 · +3.9 · +4.7 | It works. |
| Keepalive | 5 | Core (setup) | 0 · 0 · 0 · 0 | 0% | 0.0 at every level | It is dead. No fight at any level presses it. |
| Tag | 7 | Core (setup) | 8 · 6 · 2 · 1 | 11% | −1.9 · −0.1 · −0.3 · 0.0 | It is nearly dead after 10. |
| Wormable | 12 | Core | – · 20 · 21 · 22 | 97% | – · +5.0 · +5.3 · +3.6 | It works. |
| Detonate | 14 | Core (finisher) | – · 2 · 1 · 2 | 7% | – · +1.6 · +0.1 · +0.3 | It is too gated. The bot waits for burns to cover the whole part. |
| Rootkit Implant | 18 | Cooldown, with a specialist rider | – · 13 · 13 · 14 | 86% | – · +2.4 · +1.0 · −0.1 | It works as a plain burn. Only 8% of its presses find a healer. |
| Skim | 22 | Utility | – · – · 3 · 3 | 17% | – · – · +0.2 · −0.5 | It is small. |
| Propagate | 26 | Specialist | – · – · (0) · (0) | (2%) | – · – · (0.0) · (0.0) | It is dead. |
| Polymorph | 30 | Specialist | – · – · 5 · 5 | 30% | – · – · −0.6 · −1.2 | It is pressed on armor and is worth nothing measurable. |
| Thrash | 34 | Cooldown | – · – · – · (3) | (14%) | – · – · – · (+0.4) | It is small. |
| IRQ Storm | 38 | Utility | – · – · – · (16) | (87%) | – · – · – · (−0.3) | It is pressed a lot and is worth nothing measurable. |
| Spike | 1 | Filler | 31 · 32 · 30 · 30 | | | |

The Payload has more core buttons than any subclass, but no rotation. The bot burns with the line and fills with Spike, and the class core alone beats the full bar by 5 to 7 points from level 30. The fix is mostly in the planner (keep Inject at three stacks first), plus a baseline for Keepalive and Tag.

### 2.10 Infiltrator: Phantom

| Skill | Lv | Layer today | Share at 10 · 18 · 30 · 40 | In fights at 30 | Removal cost at 10 · 18 · 30 · 40 | Finding |
|---|---:|---|---|---:|---|---|
| Inject | 1 | Core | 37 · 32 · 24 · 23 | 100% | +39.5 · +30.4 · +19.0 · +13.7 | It carries. |
| Backdoor | 3 | Core | 24 · 21 · 20 · 21 | 99% | +1.0 · +5.4 · +9.7 · +10.6 | It carries from 18. |
| Keepalive | 5 | Core (setup) | 0 · 0 · 0 · 0 | 0% | 0.0 at every level | It is dead. |
| Tag | 7 | Core (setup) | 2 · 1 · 1 · 0 | 6% | −0.4 · +0.5 · 0.0 · +0.1 | It is dead. |
| Null Route | 12 | Utility | – · 6 · 2 · 1 | 16% | – · +10.9 · +0.8 · +0.2 | It matters at 18, when it is the only defence, and fades as Shadow Copy arrives. |
| Opening | 14 | Core (proc) | – · 6 · 20 · 18 | 98% | – · +1.0 · +1.3 · +1.5 | It is flat. It replaces a Backdoor or a Spike. |
| Backstab | 18 | Core | – · 5 · 4 · 3 | 28% | – · +1.1 · +1.7 · +0.9 | The bot under-presses it. 32 on a 2-cycle cooldown beats a Spike on any bare part, but the bot keeps it for busy parts. |
| Shadow Copy | 26 | Utility | – · – · 8 · 8 | 58% | – · – · +2.0 · +1.2 | It works modestly. |
| Log Wipe | 34 | Cooldown | – · – · – · 3 | 20% | – · – · – · +0.7 | It is small. |
| Rootkit Implant | 38 | Cooldown | – · – · – · (11) | (100%) | – · – · – · (−3.9) | It makes fights worse. It takes commands from Backdoor and Opening. |
| Spike | 1 | Filler | 29 · 23 · 14 · 15 | | | |

The Phantom has ten skills that take a slot (Spoof and Tap don't), so at 38 it has ten keys for nine slots and never makes a loadout choice. Its rotation is the Infiltrator core plus Opening, and it has no cleanse.

### 2.11 Operator: Herder

| Skill | Lv | Layer today | Share at 10 · 18 · 30 · 40 | In fights at 30 | Removal cost at 10 · 18 · 30 · 40 | Finding |
|---|---:|---|---|---:|---|---|
| Deploy | 1 | Core | 20 · 10 · 5 · 5 | 29% | +8.1 · +2.6 · −0.6 · +1.0 | It carries at 10 and fades. |
| Hook | 3 | Core (setup) | 9 · 2 · 1 · 1 | 8% | −0.7 · −0.8 · 0.0 · −0.4 | It is nearly dead. |
| Spawn | 5 | Core | 4 · 1 · 0 · 0 | 2% | +0.6 · 0.0 · −0.2 · 0.0 | It is dead. A 5 × 3 helper is worth less than a Spike for the command. |
| Botnet | 7 | Core | 9 · 15 · 6 · 6 | 36% | +2.6 · +1.6 · +2.0 · +1.8 | It works. |
| Fan-out | 12 | Core | – · 12 · 13 · 14 | 82% | – · −2.8 · +7.9 · +7.5 | It works from 30. |
| Mesh | 14 | Cooldown | – · 6 · 4 · 4 | 26% | – · −2.9 · −0.7 · −0.4 | It makes fights a little worse. It costs a command when few helpers are out. |
| Kill Switch | 18 | Utility | – · 4 · 5 · 4 | 33% | – · −2.5 · −6.2 · −6.5 | It makes fights worse. 91% of its presses answer a tell, and the answer costs more than it saves. Cashing in early forfeits each helper's Last Gasp, which is the likely cause. |
| Garbage Collect | 22 | Specialist | – · – · 10 · 11 | 62% | – · – · −3.7 · −2.6 | It makes fights worse. 77% of its presses strip armor with no fragments up. |
| Malloc | 26 | Cooldown | – · – · (14) · (15) | (77%) | – · – · (−1.1) · (+0.2) | It is flat. |
| Fork | 30 | Specialist | – · – · 10 · 11 | 68% | – · – · +4.8 · −1.0 | It works on armor. |
| OOM Kill | 34 | Utility | – · – · – · (1) | (9%) | – · – · – · (−0.4) | It is too conditional. |
| Cron Storm | 38 | Cooldown | – · – · – · (3) | (18%) | – · – · – · (0.0) | It is too conditional. |
| Spike | 1 | Filler | 50 · 44 · 38 · 35 | | | |

The Herder plays worse with its line than without it, by 8 to 12 points. Its helpers come on cooldowns of 4 and 5, so it has no cheap key between them and presses Spike for 35–50% of its commands.

### 2.12 Operator: Hijacker

| Skill | Lv | Layer today | Share at 10 · 18 · 30 · 40 | In fights at 30 | Removal cost at 10 · 18 · 30 · 40 | Finding |
|---|---:|---|---|---:|---|---|
| Deploy | 1 | Core | 24 · 9 · 10 · 10 | 59% | +10.7 · +1.5 · +1.2 · +1.5 | It works. |
| Hook | 3 | Core (setup) | 1 · 0 · 1 · 1 | 6% | +0.1 · 0.0 · −0.3 · 0.0 | It is dead. |
| Spawn | 5 | Core | 4 · 11 · 3 · 2 | 24% | +1.7 · +1.1 · +0.9 · +0.2 | It is small. It is the foothold for Hijack. |
| Botnet | 7 | Core | 11 · 13 · 14 · 15 | 92% | +6.0 · +4.9 · +4.4 · +4.1 | It works. |
| Jam | 12 | Utility | – · 2 · 0 · 0 | 4% | – · +0.3 · 0.0 · 0.0 | It is dead. Spoofed ACK does its job without spending a helper. |
| Hijack | 14 | Utility | – · 11 · 8 · 7 | 64% | – · +5.1 · +2.2 · +1.7 | It works. |
| Replay | 18 | Core | – · 17 · 15 · 15 | 93% | – · +15.7 · −4.8 · +0.8 | It carries at 18. At 40 it saves 24 points against wild families and costs 16 against bosses. 18–27% of its presses catch a charge. |
| Spoofed ACK | 22 | Utility | – · – · 14 · 15 | 82% | – · – · −2.3 · +0.2 | It is flat. |
| Barrier | 26 | Utility | – · – · (1) · (0) | (8%) | – · – · (−0.7) · (0.0) | It is too conditional. |
| Cache Poison | 30 | Specialist | – · – · 1 · 2 | 9% | – · – · +0.3 · +0.6 | It is too conditional. Most parts never patch, heal or seal. |
| Reroute | 34 | Utility | – · – · – · (1) | (11%) | – · – · – · (+0.6) | It is small. |
| Blackhole | 38 | Cooldown | – · – · – · (1) | (8%) | – · – · – · (−0.1) | It is too conditional. |
| Spike | 1 | Filler | 52 · 32 · 27 · 27 | | | |

The Hijacker has more answers than it can press. It lacks a cheap core hit (Spike is 27–52%) and a cooldown that fires in most fights.

### 2.13 Conditional builds today

At level 40 every skill is known, so a player can build a bar for a kind of fight. These are 9-key bars made from today's skills, played on four sets of fights with two seeds each. *Swarm* is eight worms, two Overruns, a Crawler, RELAY-KING and BACK ORIFICE. *Rules* is eight Ransomware (Mutex and Tripwire third parts), four Ghostroot (Mimic), DEADBOLT, TRIPMINE, MIRRORSHADE, PATCH TUESDAY, a Patchwork and a Leech. *Boss* is all 13 solo bosses. *Generic* is wild Ransomware and Ghostroot, two worms, and five guards. Cells are health lost and wins.

| Subclass | Build | Swarm | Rules | Boss | Generic | Matched set beats the rotation build? |
|---|---|---:|---:|---:|---:|---|
| Demolitionist | Rotation (Zero-day, Bit Rot, Exploit) | 23% · 26/26 | 22% · 36/36 | 32% · 25/26 | 16% · 30/30 | |
| Demolitionist | Swarm (Fork Bomb, Chain Reaction, Logic Bomb) | 29% · 26/26 | 30% · 34/36 | 41% · 23/26 | 23% · 30/30 | No, it is 6 points worse on swarms. |
| Overclocker | Rotation (Stack Smash, Exploit) | 28% | 26% | 35% | 22% | |
| Overclocker | Rules (Sudo, Brace) | 28% | 26% | 32% | 22% | No, it ties. |
| Overclocker | Boss (Brace, Turbo Boost) | 29% | 25% | 30% · 25/26 | 21% | Yes, by 5 points. |
| Warden | Rotation (Retaliate, Failover) | 29% · 25/26 | 16% | 29% · 26/26 | 22% | |
| Warden | Swarm (DMZ, Throttle) | 12% · 26/26 | 16% | 29% · 23/26 | 20% | Yes, by 17 points, and it ties elsewhere. |
| Sysop | Default bar | 58% | 34% | 55% | 29% | |
| Sysop | Rotation (Reclaim, Purge) | 52% | 17% | 40% | 17% | |
| Sysop | Swarm (Multicast) | 50% | 17% | 40% | 18% | No, by 2 points. |
| Payload | Rotation | 41% | 45% | 53% | 24% | |
| Payload | Swarm (Propagate, Thrash) | 41% | 46% | 53% | 24% | No, it ties. |
| Payload | Class core only | 23% | 44% | 58% | 24% | The core alone is 18 points better on swarms. |
| Herder | Rotation (Malloc, Hook) | 25% | 46% | 57% | 31% | |
| Herder | Swarm (Garbage Collect, OOM Kill) | 28% | 47% | 63% | 31% | No, it is 3 points worse. |
| Hijacker | Rotation (Barrier, Blackhole) | 27% | 20% | 64% | 10% | |
| Hijacker | Rules (Cache Poison, Jam) | 26% | 18% | 56% | 10% | Not by the 5-point bar. |

The Warden's swarm build is the one working example of the model in the game today. It carries two specialists, DMZ and Throttle, and it costs 17 points less than its rotation build on swarms while costing nothing elsewhere. Every other conditional build ties or loses, because the specialists either do too little in their moment or the bot doesn't press them.

### 2.14 What the audit found

These skills are over-conditional or dead: Chain Reaction, Bit Rot, Sudo, Jam, Multicast (solo), Propagate, Keepalive, Tag (after 10), Hook, Spawn, Throttle, Failover, Barrier, Blackhole, Cache Poison, OOM Kill, Cron Storm and Rebalance (solo). Fork Bomb and Logic Bomb have a good baseline that the bot never uses. Stack Smash and Detonate are held back by the bot's set-up rules.

Shatter, Opening, Retaliate, Blowback, Spoofed ACK, IRQ Storm, Malloc and Polymorph are flat. They are pressed often and leaving them off costs nothing, because another key does the same job.

These skills are worse than an empty slot: Exploit (both Breakers), Kill Switch, Garbage Collect, Mesh, Patch (solo, from 30), and Rootkit Implant on the Phantom. For the Herder and the Payload the whole line is a loss against the class core.

This table shows what each subclass is missing, layer by layer.

| Subclass | Core rotation | Utility and answers | Cooldowns |
|---|---|---|---|
| Demolitionist | Yes (Crack, Shatter, Flood, Overload) | Cast answer only. No charge answer or mitigation. | None before Zero-day at 38 |
| Overclocker | Hits, but no builder for its spender | Cast answer and Brace. No cleanse. | None before Turbo Boost at 34 |
| Warden | Rate Limit and Purge, then Spike | Full | Failover only, and it is weak |
| Sysop | Rate Limit, then Spike | Full for a healer | Hot Standby, solo it does nothing |
| Payload | On paper, not in play | IRQ Storm at 38 is its first tell answer | Implant, Thrash |
| Phantom | Infiltrator core and Opening | Dodges. No cleanse or tell answer besides Backstab. | Log Wipe at 34, small |
| Herder | Deploy, Botnet, Fan-out, then Spike | Kill Switch, and it hurts | Mesh, Malloc, Cron Storm, none of them pays |
| Hijacker | Botnet and Replay, then Spike | Many | Blackhole at 38, rarely pressed |

## 3. Expanded pools

### 3.1 Unlock pacing

Each subclass line grows from 8 skills to 11, unlocking every two levels from 10 to 22 and every four after. With the class's four core skills that is a pool of 15 bar keys. The Phantom's run skills, Spoof and Tap, stay outside the count and come at 20 and 30.

| Level | Unlocks (proposed) | Pool, proposed | Bar slots | Keys on the shelf, proposed | Pool today | Keys on the shelf today |
|---:|---|---:|---:|---:|---:|---:|
| 1, 3, 5, 7 | Class core | 1 to 4 | 7 | 0 | 1 to 4 | 0 |
| 10 | Subclass and its first skill | 5 | 7 | 0 | 4 | 0 |
| 12 | Line 2 | 6 | 7 | 0 | 5 | 0 |
| 14 | Line 3 | 7 | 7 | 0 | 6 | 0 |
| 16 | Line 4 | 8 | 7 | 1 | 6 | 0 |
| 18 | Line 5 | 9 | 7 | 2 | 7 | 0 |
| 20 | Line 6 | 10 | 7 | 3 | 7 | 0 |
| 22 | Line 7, key 9 opens | 11 | 8 | 3 | 8 | 0 |
| 26 | Line 8 | 12 | 8 | 4 | 9 | 1 |
| 30 | Line 9, key 0 opens | 13 | 9 | 4 | 10 | 1 |
| 34 | Line 10 | 14 | 9 | 5 | 11 | 2 |
| 38 | Line 11 | 15 | 9 | 6 | 12 | 3 |

The first loadout choice moves from 26 to 16. From 20 a player has three keys on the shelf, which is enough for a rotation build and a conditional build to differ by two or three keys. No skill unlocks at 16 or 20 today.

Each line is ordered so the rotation is complete by 16, the first answers come by 12 to 20, the first cooldown by 16 to 26, and the specialists from 14 on. Several existing skills move. A save that already knows a skill keeps it even if the skill now opens later.

### 3.2 Changes to the class core

These five skills are dead or harmful in at least one of their two subclasses and weak in the other. Each gets a baseline.

| Class | Skill | Lv | Layer | Short | Help | Cooldown | Change |
|---|---|---:|---|---|---|---:|---|
| Breaker | Exploit | 5 | Core (setup) | Hit 15, Exposed 2 | exploit \<part\> — 15 damage, and Exposed this cycle and next: every hit on it from anyone has +25% crit chance. | 2 | It gains a hit. It makes fights 1 to 7 points worse today. |
| Infiltrator | Keepalive | 5 | Core (setup) | Burns tick now, +2 | keepalive \<part\> — every burn on it ticks once now and lasts 2 cycles longer. | 3 | It gains an immediate tick. No fight presses it today. |
| Infiltrator | Tag | 7 | Core (setup) | Hit 10, burns +50% | tag \<part\> — 10 damage, and for 4 cycles burns on it tick 50% harder and its timer shows even if it is veiled. | 3 | It gains a hit. |
| Operator | Hook | 3 | Core (setup) | Hit 10, Hooked 4 | hook \<part\> — 10 damage, and Hooked for 4 cycles: every hit on it from anyone (helpers and burns too) gets +6. | 3 | It gains a hit. |
| Operator | Spawn | 5 | Core | Helper 7 ×3 | spawn \<part\> — sends a small helper to hit it for 7 every cycle for 3 cycles. | 1 | 5 becomes 7, so with Last Gasp it beats a Spike (28 against 25). |

### 3.3 Demolitionist

The rotation is Crack into Shatter, then Flood on the bare part, with Overload between. Shatter's shards make the strip pay on every bare part, which is the Demolitionist's area identity. Backfire is its first charge answer, and Debris Field turns its own strips into shields.

| Lv | Skill | Layer | Short | Help | Cooldown | Change |
|---:|---|---|---|---|---:|---|
| 1–7 | Overload, Flood, Exploit, Crack | Core | | Class core (Exploit as in 3.2) | | |
| 10 | Shatter | Core (proc) | Hit 38 the part you just bared; shards 12 | shatter \<part\> — lit for a cycle on the part whose last ◆ you just broke. 38 damage to it, and its shards hit every other bare part for 12. | lit | Moved from 12. The shards give it a job Flood can't do. |
| 12 | Shaped Charge | Utility | Strip all ◆; it lashes out | As today. | 5 | Moved from 18. |
| 14 | Fork Bomb | Specialist (fragments) | Hit 16 all, fragments ×3 | fork-bomb — 16 damage to every part, three times that to every fragment. | 3 | 12 becomes 16, so two parts already beat a Spike. |
| 16 | **Debris Field** | Utility (mitigation) | Each ◆ you break: shield 5 | debris-field — this cycle and the next two, every ◆ you break shields you for 5, up to 30. | 6 | New. |
| 18 | Thermal Runaway | Utility (cast answer) | Burn 4→16, melts casts | As today. | 4 | Moved from 22. |
| 20 | **Backfire** | Utility (charge answer) | Hit 25; a charge blows up in it | backfire \<part\> — 25 damage. On a part winding up a charge, the charge blows up inside it: it takes the extra the charge would have added (up to 60), and the attack lands plain. | 4 | New. |
| 22 | Logic Bomb | Cooldown (twins, Tripwire) | Bomb 50 +20 all; no reboots | As today. | 5 | Moved from 26, cooldown 4 becomes 5. The bot presses it as a burst whenever two or more parts stand. |
| 26 | **rm -rf** | Cooldown | Your hits hit every part, 2 cycles | rm-rf — this cycle and next, every hit you land also hits every other part for half. | 10 | New. |
| 30 | Chain Reaction | Specialist (fragments, many parts) | Hit 30; if it breaks, it blows | chain-reaction \<part\> — 30 damage. If the part breaks within 3 cycles, it blows up and hits every other part for 25, and a part the blast breaks blows up too. | 6 | Reworked. It is a 30 hit in any fight. |
| 34 | Bit Rot | Specialist (seals, armor that patches) | Hit 20; −1 ◆ a cycle, no seal | bit-rot \<part\> — 20 damage now. For 4 cycles it loses a ◆ at the end of each of your turns, it can't patch any back, and a seal it starts fails. | 5 | It gains a hit. |
| 38 | Zero-day | Cooldown | Hit 65 through ◆ and locks, once | As today. | once | |

### 3.4 Overclocker

Hot Loop gives the Overclocker the builder its spender needs. A rotation of Hot Loop, Segfault, Overload and Thermal Throttle turns over every two cycles, and Vent is the other way to spend heat. Fault Injection is the burst you plan around. Sudo becomes a specialist on a long cooldown that is good against armor anywhere and great against a part rule.

| Lv | Skill | Layer | Short | Help | Cooldown | Change |
|---:|---|---|---|---|---:|---|
| 1–7 | Overload, Flood, Exploit, Crack | Core | | Class core | | |
| 10 | **Hot Loop** | Core (builder) | Hit 22, +1 Momentum | hot-loop \<part\> — 22 damage, and you gain a Momentum stack that lasts 2 cycles. | 2 | New. |
| 12 | Overvolt | Utility (cast and seal answer) | Two hits of 20 at once | As today. | 4 | |
| 14 | Segfault | Core, with a rider (charges) | Hit 30, ×3 if charging | As today. | 3 | Kept. It already has the right shape. |
| 16 | Thermal Throttle | Core (spender) | Spend Momentum: 20 +20 a stack | As today. | 3 | Moved from 18. Hot Loop feeds it. |
| 18 | Brace | Utility (mitigation) | Hits −30%, sent back ×2 | As today. | 5 | Moved from 22. |
| 20 | **Vent** | Utility (cleanse) | Spend heat: cleanse, heal 5 a stack | vent — spend all your Momentum: clears Corrupted, encryption and Scrambled, and heals you 5 for each stack spent (at least 5). | 5 | New. Dropping your stacks also drops Redline's +10% damage taken. |
| 22 | Stack Smash | Core (combo) | Hit 30; Exposed: twice, crits again | As today. | 3 | Moved from 26. Exploit now hits, so setting it up costs nothing. |
| 26 | **Fault Injection** | Cooldown | Every hit on it crits, 3 cycles | fault-injection \<part\> — for 3 cycles, every hit you land on it crits. | 10 | New. |
| 30 | Sudo | Specialist (part rules, armor), on a long cooldown | Through ◆ and part rules, 2 | sudo — root override, this cycle and next: your hits go through ◆ (each still breaks one), locks and wards don't hold them, a Tripwire you break stays quiet, and the Decoy and the Mimic can't copy you. | 8 | Reworked. Going through armor gives it a use in any fight. |
| 34 | Turbo Boost | Cooldown | +2 Momentum; free, +3 when low | As today. | 5 | |
| 38 | Zero-day | Cooldown | Hit 65 through ◆ and locks, once | As today. | once | |

### 3.5 Warden

Reject is the Warden's own hit. It pays off Grudge, and Blowback now lights Retaliate, so the soak-and-return loop is Reject, Blowback, Retaliate with Purge ticking under it. Harden and Quarantine move up because they measured better than what sits ahead of them. Circuit Breaker is the boss button.

| Lv | Skill | Layer | Short | Help | Cooldown | Change |
|---:|---|---|---|---|---:|---|
| 1–7 | Rate Limit, Firewall, Purge, Retaliate | Core (Firewall is utility) | | Class core | | |
| 10 | **Reject** | Core | Hit 28; shield 10 on your Grudge | reject \<part\> — 28 damage. On the part that last hit you, you also shield 10. | 2 | New. |
| 12 | Suspend | Utility (charge answer) | Delay 2; drains a charge | As today. | 4 | |
| 14 | Bulkhead | Utility (mitigation) | Half 2; a charge a quarter | As today. | 6 | |
| 16 | Blowback | Core | Hit back all you soaked; lights Retaliate | blowback \<part\> — hits it for the full size of every attack that has hit you since your last Blowback, up to 70, and Retaliate is lit for the next cycle. On armor it breaks 2 ◆. | 3 | Moved from 18. Lighting Retaliate gives it a follow-up. |
| 18 | Harden | Utility (mitigation) | Block next attack | As today. | 6 | Moved from 26. It saves 4.8 points in Throttle's slot today. |
| 20 | Quarantine | Utility (cast answer) | Delay 3, +25%; stops a cast | As today. | 6 | Moved from 30. Casts start at level 10. |
| 22 | Throttle | Specialist (loud parts) | Hit 20, half 3; 6 if loud | throttle [part] — 20 damage, and its attacks deal half for 3 cycles. On a part gone loud (a Tripwire set off, Double Extortion, a Bricker's rage), for 6, and the loud wears off. | 4 | It gains a hit. |
| 26 | **Circuit Breaker** | Cooldown | No hit over a tenth, 3 cycles | circuit-breaker — for 3 cycles, no attack can take more than a tenth of your max Signal from you. What it would have dealt past that goes into Blowback. | 12 | New. |
| 30 | DMZ | Specialist (fragments, Replicate) | −30%; no bites, no spawns | As today. | 6 | Moved from 34. |
| 34 | **Honeypot** | Specialist (Scramble, Mimic) | Next hit −15; scrambles miss you | honeypot — for 2 cycles, the next hit on you deals 15 less, and a Scramble, a Possession or the Mimic's beat lands on the honeypot instead of you. | 6 | New. |
| 38 | Failover | Cooldown | Hit all for missing/4 | As today. | 5 | |

### 3.6 Sysop

The Sysop gets a rotation: Checksum and Reclaim heal as they hit, with Rate Limit and Purge between. Its solo weakness should come from its numbers, not from keys the bot is told not to press (see decision 5). Revoke answers the healers and Self-Update. Maintenance Window is the healer's cooldown.

| Lv | Skill | Layer | Short | Help | Cooldown | Change |
|---:|---|---|---|---|---:|---|
| 1–7 | Rate Limit, Firewall, Purge, Retaliate | Core (Firewall is utility) | | Class core | | |
| 10 | **Checksum** | Core | Hit 24, heal a quarter | checksum \<part\> — 24 damage, and you heal a quarter of what it does. In a crew, the lowest crewmate heals instead. | 2 | New. |
| 12 | Reclaim | Core | Hit 35, heal half | As today. | 3 | Moved from 26. It saves 9 to 13 points today and is never on a default bar. |
| 14 | Patch | Utility (heal) | Heal 4 + 2×3 | As today. | 4 | Moved from 12. |
| 16 | Heartbeat | Utility (charge) | Heal 4×4; a charge −25% | As today. | 4 | Moved from 18. |
| 18 | Scrub | Utility (cleanse) | Cleanse, heal 8 (12 if dirty) | As today. | 5 | Moved from 22. |
| 20 | Multicast | Specialist (fragments, crew) | Heal 16 all; parts 6, fragments 16 | multicast — heals you and everyone in your crew for 16. Every part takes 6, and every fragment takes 16. | 4 | Moved from 14. Every part taking 6 gives it a use alone. |
| 22 | Rollback | Cooldown (heal, cast) | Undo the last hit or cast | As today. | 6 | Moved from 30. |
| 26 | **Maintenance Window** | Cooldown | Heals +50%, hits heal, 3 cycles | maintenance-window — for 3 cycles, your heals heal 50% more, and your hits heal you for a quarter of what they deal. | 12 | New. |
| 30 | **Revoke** | Specialist (healers, Self-Update) | Hit 22; its heals and patches fail | revoke \<part\> — 22 damage. For 4 cycles a heal, patch or Self-Update it casts fails, and a heal it would have cast on its own side heals you instead. | 4 | New. It is also a cast answer for Self-Update. |
| 34 | Hot Standby | Cooldown | Hold at 1, once | As today. | once | |
| 38 | Rebalance | Specialist (crew) | Even out the crew, heal 6; alone 12 | rebalance — evens out the Signal of everyone in the fight, then heals everyone 6. Alone, it heals you 12. | 6 | The solo half doubles. It stays a crew key. |

### 3.7 Payload

The rotation is Inject, Tag, Wormable, then Detonate to cash in, with Keepalive now doing something the moment it is pressed. (Since section 12, Inject is one heavy burn a part that refreshes instead of stacking: one press, then Wormable spreads it, Tag amplifies it and Detonate cashes it in.) Fuzz is an early tell answer, which the Payload lacks until IRQ Storm at 38 today. Outbreak is the burst you plan around. Most of the Payload's loss today is the bot, which must keep Inject at three stacks before reaching for its line.

| Lv | Skill | Layer | Short | Help | Cooldown | Change |
|---:|---|---|---|---|---:|---|
| 1–7 | Inject, Backdoor, Keepalive, Tag | Core | | Class core (Keepalive and Tag as in 3.2) | | |
| 10 | Wormable | Core | Burn 8×4, spreads Inject | Burns for 8 a cycle (was 10), and your Inject on the target spreads with it (section 12). | 3 | Moved from 12. |
| 12 | Detonate | Core (finisher) | Burns now ×1.5 | As today. | 4 | Moved from 14. |
| 14 | **Fuzz** | Utility (tell answer) | Hit 12 + burn 8×3; counts twice | fuzz \<part\> — 12 damage, and a burn of 8 a cycle for 3 cycles. Its hit counts twice against a tell: it calls off an elite's charge, or stops a cast. | 4 | New. |
| 16 | Rootkit Implant | Cooldown (healers) | Burn 10 till it breaks; no heals | As today. | once | Moved from 18. |
| 18 | Skim | Utility (sustain) | Burn 9×4, heals 4 a tick | As today. | 3 | Moved from 22. |
| 20 | Polymorph | Specialist (armor) | Burn 14×3 thru ◆; 10 on bare | polymorph \<part\> — burns it for 14 a cycle for 3 cycles, straight through armor. Once the part is bare, it burns for 10. | 3 | Moved from 30. On a bare part it burns for 10 instead of 7, so it never drops below a Spike's worth. |
| 22 | **Logic Trap** | Utility (mitigation) | Next hit half; its part catches your burns | logic-trap — the next hit on you deals half, and the part that lands it catches a copy of every burn you have on your target. | 6 | New. |
| 26 | Propagate | Specialist (fragments, many parts) | Copy burns to all; fragments ×2 | propagate \<part\> — copies your burns on it to every other part. Fragments catch them at double. | 5 | Reworked. |
| 30 | Thrash | Cooldown | Burns on it tick twice | As today. | 5 | Moved from 34. |
| 34 | **Outbreak** | Cooldown | Inject every part; burns stick | outbreak — every part catches an Inject (20 a cycle for 4 cycles, refreshing one already there), and for 4 cycles nothing can clear your burns. | 10 | New. Leech and Patchwork clear burns today. |
| 38 | IRQ Storm | Utility (tell answer) | Every burn ticks now; hits tells | As today. | 4 | |

### 3.8 Phantom

The Phantom gets five new keys, because it has the fewest. Fingerprint renews Weak Spot, so the burst loop is Fingerprint, Backstab and Opening. Side Channel is its rotation while the armor is still on. Rotate Keys is the cleanse it lacks, Unmask is its Ghostroot specialist, and Vanish is its cooldown.

| Lv | Skill | Layer | Short | Help | Cooldown | Change |
|---:|---|---|---|---|---:|---|
| 1–7 | Inject, Backdoor, Keepalive, Tag | Core | | Class core (Keepalive and Tag as in 3.2) | | |
| 10 | **Fingerprint** | Core (setup) | Hit 15; Weak Spot fresh | fingerprint \<part\> — 15 damage that doesn't use up Weak Spot, and Weak Spot is fresh on it again. | 3 | New. |
| 12 | Null Route | Utility (dodge) | Dodge one; next skill crits | As today. | 6 | |
| 14 | Opening | Core (proc) | Hit 50 (after a miss) | As today. | lit | |
| 16 | Backstab | Core | Hit 32, crits a busy part | As today. | 2 | Moved from 18. The bot should press it on any bare part. |
| 18 | **Side Channel** | Core (armor) | Hit 20 thru ◆; timer shows | side-channel \<part\> — 20 damage straight through armor, and its timer shows for 3 cycles even if it is veiled. | 2 | New. |
| 20 | Shadow Copy | Utility (decoy) | A decoy takes the next hit | As today. | 5 | Moved from 26. Spoof (run skill) also comes at 20. |
| 22 | **Rotate Keys** | Utility (cleanse) | Cleanse; next hit −30% | rotate-keys — clears encryption, Scrambled and Corrupted from you, and the next hit on you deals 30% less. | 6 | New. |
| 26 | Log Wipe | Cooldown (Mimic) | Weak Spot again, next hit half | As today. | 6 | Moved from 34. |
| 30 | **Unmask** | Specialist (veiled parts, Decoy, Mimic) | Hit 20; veil off, no copy | unmask \<part\> — 20 damage. Its veil drops for 4 cycles, and if it is a Decoy or a Mimic it can't copy you on its next beat. | 4 | New. Tap (run skill) also comes at 30. |
| 34 | **Vanish** | Cooldown | Next 2 attacks miss; Weak Spot fresh | vanish — the next 2 attacks on you miss, Weak Spot is fresh on every part, and Opening stays lit for 2 cycles after each miss. | 12 | New. |
| 38 | Rootkit Implant | Cooldown | Burn 10 till it breaks; no heals | As today. | once | |

### 3.9 Herder

The Herder gets a cheap key between its big helpers. nohup hits now and leaves a helper, and Spawn (3.2) beats a Spike, so the rotation is Deploy, Botnet, Fan-out and nohup with Spawn as filler. Load Shed spends helpers as armor. Crontab is for long fights. Kill Switch and Mesh are reworked so pressing them is never a loss.

| Lv | Skill | Layer | Short | Help | Cooldown | Change |
|---:|---|---|---|---|---:|---|
| 1–7 | Deploy, Hook, Spawn, Botnet | Core | | Class core (Hook and Spawn as in 3.2) | | |
| 10 | Fan-out | Core | Helper 6 ×3 on every part | As today. | 4 | Moved from 12. |
| 12 | **nohup** | Core | Hit 15 + helper 5 ×3 | nohup \<part\> — 15 damage now, and a helper that hits it for 5 every cycle for 3 cycles. | 2 | New. |
| 14 | Kill Switch | Utility (tell answer) | Cash in helpers + Last Gasp; hits tells | kill-switch — your helpers deal all their remaining damage now, plus their Last Gasp. Each part they hit takes it as a hit from your command: it calls a charge off there. | 3 | Moved from 18. Last Gasp counts, so cashing in early loses nothing. |
| 16 | **Load Shed** | Utility (mitigation) | Helpers soak the next hit | load-shed — the next attack on you is split over your helpers. Each takes an even share off it and loses that much of the damage it has left, and you take what is left over. | 5 | New. |
| 18 | Fork | Specialist (armor) | Each ◆ cracked splits a helper | As today. | 6 | Moved from 30. |
| 20 | Mesh | Cooldown | Helpers hit now, then splash all | mesh — every helper hits once now, and for 3 cycles every helper hit that does damage also hits every other part for half. | 8 | Moved from 14, cooldown 6 becomes 8. The immediate hit means it is never a wasted command. |
| 22 | Garbage Collect | Specialist (fragments) | Hit 10 all, fragments ×3 | As today. | 3 | The bot stops using it to strip armor. |
| 26 | Malloc | Cooldown (prep) | Next 3 helpers +50% | As today. | 5 | |
| 30 | **Crontab** | Specialist (bosses, long fights) | A helper for the whole fight | crontab \<part\> — once per fight: a helper that hits it for 20 every other cycle until the fight ends. It moves on when its part breaks. | once | New. |
| 34 | OOM Kill | Utility (heal) | Helpers → heal | As today. | 6 | |
| 38 | Cron Storm | Cooldown | Helpers hit twice | As today. | 6 | |

### 3.10 Hijacker

Sniff is the cheap core hit, and it leaves the foothold that Hijack, Barrier and Blackhole spend. Jam becomes a hit that applies Jammed, so Man in the Middle pays every fight. Takeover is the boss button, and Echo Cancel turns the Ghostroot's tricks around.

| Lv | Skill | Layer | Short | Help | Cooldown | Change |
|---:|---|---|---|---|---:|---|
| 1–7 | Deploy, Hook, Spawn, Botnet | Core | | Class core (Hook and Spawn as in 3.2) | | |
| 10 | **Sniff** | Core | Hit 18, leave a foothold | sniff \<part\> — 18 damage, and it leaves a foothold: a helper that hits it for 4 for 2 cycles. | 2 | New. |
| 12 | Replay | Core | Its attack back; a charge ×2 | As today. | 5 | Moved from 18. |
| 14 | Spoofed ACK | Utility (charge answer) | Delay 1, half back; drains a charge | As today. | 5 | Moved from 22. |
| 16 | Hijack | Utility (tell answer) | Spend a helper: steal its tell | As today. | 6 | Moved from 14. |
| 18 | Jam | Core (Jammed) | Hit 15, Jammed; a helper delays it | jam \<part\> — 15 damage, and it is Jammed until its next attack. If one of your helpers is on it, pull it off to push that attack back a cycle as well: a charge on it loses its signal and lands plain. | 2 | Moved from 12, reworked. |
| 20 | Barrier | Utility (shield) | Spend a helper: shield | As today. | 3 | Moved from 26. |
| 22 | Cache Poison | Specialist (seals, healers, patches) | Burn 5; its repairs and seals hurt it | cache-poison \<part\> — Poisoned for 5 cycles: it takes 5 a cycle, an armor patch it is due hits it for 15 instead, a heal it casts hurts the part it was meant for, and a seal it lands fails and hits it for 30. | 4 | Moved from 30. The burn gives it a use anywhere. |
| 26 | **Takeover** | Cooldown | Its attacks hit its own side, 3 | takeover \<part\> — for 3 cycles, its attacks land on the other parts of the virus at full size instead of on you. A part on its own hits itself. | 12 | New. |
| 30 | **Echo Cancel** | Specialist (Mimic, Decoy, Echo) | Hit 24; its echo turns on the virus | echo-cancel \<part\> — 24 damage. An Echo on it stops repeating your hits, and the Mimic or a Decoy plays its next beat back at the virus instead of you. | 4 | New. |
| 34 | Reroute | Utility (cast answer) | Swarm a part; each arrival a hit | As today. | 4 | |
| 38 | Blackhole | Cooldown | Spend a helper: drop its attack | As today. | 6 | |

### 3.11 Pool sizes

| Subclass | Pool today | Pool proposed | New skills | Reworked | Moved |
|---|---:|---:|---|---|---:|
| Demolitionist | 12 | 15 | Debris Field, Backfire, rm -rf | Exploit, Shatter, Fork Bomb, Chain Reaction, Bit Rot | 5 |
| Overclocker | 12 | 15 | Hot Loop, Vent, Fault Injection | Exploit, Sudo | 4 |
| Warden | 12 | 15 | Reject, Circuit Breaker, Honeypot | Blowback, Throttle | 4 |
| Sysop | 12 | 15 | Checksum, Maintenance Window, Revoke | Multicast, Rebalance | 7 |
| Payload | 12 | 15 | Fuzz, Logic Trap, Outbreak | Keepalive, Tag, Polymorph, Propagate | 7 |
| Phantom | 10 (+2 run) | 15 (+2 run) | Fingerprint, Side Channel, Rotate Keys, Unmask, Vanish | Keepalive, Tag | 3 |
| Herder | 12 | 15 | nohup, Load Shed, Crontab | Hook, Spawn, Kill Switch, Mesh | 4 |
| Hijacker | 12 | 15 | Sniff, Takeover, Echo Cancel | Hook, Spawn, Jam, Cache Poison | 6 |

That is 26 new skills and 20 reworks. The new skills need entries in ABILITIES or the class data modules, behaviour in dist/classes/*.mjs, a planner rule for both the baseline and the moment, a line in SITUATIONS for the ones with a moment, and, for Backfire, Fuzz, Honeypot, Unmask, Echo Cancel and Revoke, a row in the built-answers table of docs/solo-tells.md.

## 4. Example loadouts

Keys are listed in order from 2 to 0 at level 30 (nine slots, thirteen keys known). Shares are targets for the scripted players, in the order Core · Utility · Cooldown · Specialist, with Spike counted in Core. *Matched* is the kind of fight the build is for. *Unmatched* is a generic set of wild families and guards.

### 4.1 Demolitionist

| Build | Keys 2–0 | For | Unmatched | Matched |
|---|---|---|---|---|
| Rotation | crack, shatter, flood, overload, shaped-charge, thermal-runaway, backfire, rm-rf, logic-bomb | Farming anything | 65 · 25 · 10 · 0 | — |
| Swarm | crack, shatter, flood, fork-bomb, chain-reaction, thermal-runaway, backfire, rm-rf, logic-bomb | Worms, Overrun, Crawler, RELAY-KING, BACK ORIFICE | 58 · 20 · 10 · 12 | 40 · 15 · 10 · 35 |
| Boss | crack, shatter, flood, overload, backfire, thermal-runaway, debris-field, rm-rf, logic-bomb | Solo bosses | 60 · 28 · 12 · 0 | 55 · 30 · 15 · 0 |

Today the swarm build loses to the rotation on swarms by 6 points (2.13). With Fork Bomb at 16 and Chain Reaction as a 30 hit, the target is to win by 5 or more.

### 4.2 Overclocker

| Build | Keys 2–0 | For | Unmatched | Matched |
|---|---|---|---|---|
| Rotation | crack, hot-loop, segfault, overload, thermal-throttle, overvolt, brace, fault-injection, flood | Farming anything | 70 · 22 · 8 · 0 | — |
| Rules | crack, hot-loop, segfault, thermal-throttle, overvolt, brace, vent, fault-injection, sudo | Mutex, Lockbox, Tripwire, Mimic, DEADBOLT, TRIPMINE, MIRRORSHADE | 62 · 22 · 8 · 8 | 50 · 20 · 10 · 20 |
| Boss | crack, hot-loop, segfault, overload, thermal-throttle, overvolt, brace, vent, fault-injection | Solo bosses | 62 · 28 · 10 · 0 | 55 · 30 · 15 · 0 |

The Overclocker's specialists ride on keys it already presses (Segfault's charges, Sudo's armor), so its conditional builds differ by one or two keys rather than three.

### 4.3 Warden

| Build | Keys 2–0 | For | Unmatched | Matched |
|---|---|---|---|---|
| Rotation | rate-limit, purge, reject, blowback, retaliate, suspend, quarantine, harden, circuit-breaker | Farming anything | 65 · 28 · 7 · 0 | — |
| Swarm | rate-limit, purge, reject, blowback, suspend, quarantine, dmz, throttle, circuit-breaker | Worms, Overrun, Crawler, loud parts | 60 · 28 · 5 · 7 | 45 · 20 · 5 · 30 |
| Crew tank | rate-limit, purge, reject, firewall, bulkhead, harden, suspend, quarantine, circuit-breaker | Crew bosses | — | 40 · 50 · 10 · 0 |

The Warden's swarm build already beats its rotation by 17 points on swarms today (2.13), so this pool keeps its specialists and adds a core hit and a cooldown.

### 4.4 Sysop

| Build | Keys 2–0 | For | Unmatched | Matched |
|---|---|---|---|---|
| Solo rotation | rate-limit, checksum, reclaim, purge, heartbeat, scrub, patch, maintenance-window, rollback | Levelling alone | 60 · 30 · 10 · 0 | — |
| Healers | rate-limit, checksum, reclaim, purge, heartbeat, scrub, revoke, maintenance-window, rollback | Leech, Patchwork, PATCH TUESDAY, Self-Update casts | 60 · 25 · 8 · 7 | 45 · 20 · 10 · 25 |
| Crew healer | patch, heartbeat, scrub, multicast, rollback, maintenance-window, checksum, reclaim, rate-limit | Crew bosses and the farm. From 34 and 38, Hot Standby and Rebalance take Rate Limit's and Reclaim's keys. | — | 25 · 55 · 10 · 10 |

Measured today with Reclaim and Purge on the bar, the Sysop loses 17% in the generic set instead of 29% (2.13), and Spike falls from 50% to 45% of its presses. Checksum is what brings Spike under 20%.

### 4.5 Payload

| Build | Keys 2–0 | For | Unmatched | Matched |
|---|---|---|---|---|
| Rotation | inject, tag, keepalive, wormable, detonate, backdoor, fuzz, implant, thrash | Farming anything | 70 · 15 · 15 · 0 | — |
| Swarm | inject, keepalive, wormable, detonate, backdoor, propagate, fuzz, logic-trap, thrash | Worms, Overrun, many parts | 58 · 20 · 12 · 10 | 40 · 15 · 15 · 30 |
| Armor and healers | inject, tag, wormable, detonate, backdoor, polymorph, implant, fuzz, thrash | Sentinel, Bouncer, Patchwork, Leech | 60 · 15 · 15 · 10 | 40 · 15 · 15 · 30 |

### 4.6 Phantom

| Build | Keys 2–0 | For | Unmatched | Matched |
|---|---|---|---|---|
| Rotation | backstab, fingerprint, opening, side-channel, inject, backdoor, null-route, shadow-copy, log-wipe | Farming anything | 65 · 25 · 10 · 0 | — |
| Ghostroot | backstab, fingerprint, opening, inject, backdoor, unmask, shadow-copy, rotate-keys, log-wipe | Ghostroot, Mimic, Decoy, HOLLOW CHOIR, MIRRORSHADE | 60 · 22 · 10 · 8 | 40 · 20 · 15 · 25 |
| Runner | backstab, fingerprint, opening, side-channel, inject, backdoor, null-route, shadow-copy, rotate-keys | Deep runs and guards (Spoof and Tap take no slot) | 70 · 30 · 0 · 0 | 65 · 35 · 0 · 0 |

From 34, Vanish takes Log Wipe's key in the rotation build. If decision 7 lets a lit proc fire from key 1, Opening leaves the bar and every Phantom build gains a key.

### 4.7 Herder

| Build | Keys 2–0 | For | Unmatched | Matched |
|---|---|---|---|---|
| Rotation | deploy, botnet, fan-out, nohup, spawn, hook, load-shed, kill-switch, mesh | Farming anything | 70 · 20 · 10 · 0 | — |
| Swarm | deploy, botnet, fan-out, nohup, garbage-collect, fork, load-shed, kill-switch, mesh | Worms, Overrun, Crawler | 58 · 20 · 10 · 12 | 40 · 15 · 10 · 35 |
| Boss | deploy, botnet, nohup, spawn, crontab, malloc, load-shed, kill-switch, mesh | Solo bosses | 60 · 20 · 15 · 5 | 50 · 20 · 15 · 15 |

### 4.8 Hijacker

| Build | Keys 2–0 | For | Unmatched | Matched |
|---|---|---|---|---|
| Rotation | sniff, replay, botnet, jam, spoofed-ack, hijack, barrier, takeover, deploy | Farming anything | 65 · 28 · 7 · 0 | — |
| Rules | sniff, replay, botnet, jam, spoofed-ack, hijack, cache-poison, echo-cancel, takeover | Healers, seals, Mimic, Echo | 60 · 25 · 7 · 8 | 40 · 20 · 10 · 30 |
| Crew control | sniff, botnet, spoofed-ack, hijack, jam, barrier, spawn, takeover, replay | Crew bosses. From 34 and 38, Reroute and Blackhole take Spawn's and Jam's keys. | — | 35 · 50 · 15 · 0 |

## 5. Bar and UI

### 5.1 The keys still fit

| Key | Holds | From |
|---|---|---|
| 1 | Spike | Level 1 |
| 2 to 8 | Seven chosen skills | Level 1 |
| 9 | An eighth | Level 22 |
| 0 | A ninth | Level 30 |
| - | SIGINT | Level 10 |

Nine keys plus Spike and SIGINT is enough. A fight has 5 to 12 commands for a damage dealer and 9 to 24 for a Bastion, so a tenth key would be one more that a fight never reaches, and it would shrink the choice the pool is meant to create. The = key stays free. This doc recommends against using it.

### 5.2 Presets

The designer likes typing commands, so presets are typed. A preset belongs to one subclass and stores the keys in order.

| Command | What it does |
|---|---|
| `loadout` | Shows the bar, the keys on the shelf and your presets. |
| `loadout save <name>` | Saves the bar you have now under that name. |
| `loadout use <name>` | Puts that preset on the bar. |
| `loadout list` | Lists your presets with their keys. |
| `loadout show <name>` | Shows one preset's keys and their layers. |
| `loadout delete <name>` | Deletes it. |
| `equip <skill> on <key>` | Puts a skill on a key. What was there goes back to the shelf. |
| `swap <skill> <skill>` | Swaps two skills, on the bar or between the bar and the shelf. |

Here is how it reads.

```
> loadout save farm
Saved farm: 2 crack · 3 shatter · 4 flood · 5 overload · 6 shaped-charge · 7 thermal-runaway · 8 backfire · 9 rm-rf · 0 logic-bomb.
> loadout use swarm
Bar set from swarm. In: fork-bomb (5), chain-reaction (6). Out: overload, shaped-charge.
> loadout list
rotation · swarm · boss · farm
```

A preset that names a skill you no longer know (after a subclass switch, or from an older save) leaves that key empty and says so. Each subclass has up to six presets. The game ships two for each subclass, `rotation` and its first conditional build from section 4, and fills them as skills unlock, so a player who never edits still has a sensible bar and can type `loadout use swarm`. A skill that unlocks while the bar is full goes to the shelf, and the log says which preset would use it.

### 5.3 Where swaps happen

Today `equip` and `unequip` work only at home, out of a fight. Lairs, native bosses and deep runs are where conditional builds matter, and today a player who scouts a lair with Tap has to jack out to change keys.

| Option | What it means | For | Against |
|---|---|---|---|
| A. Home only (today) | Every change happens at home. | Simple. Planning the run before you leave is part of the game. | Jacking out to swap after a scout is tedious, so players will just run the rotation build everywhere. |
| B. Presets on runs, edits at home | Out of a fight on a run, `loadout use <name>` works. Building or saving a preset still needs home. Every skill the swap puts on the bar starts the next fight cooling, as if just pressed. | Scouting pays off, the cooling cost keeps a swap a decision, and the bar can't be rebuilt mid-run. | One more rule to learn. |
| C. Anywhere out of a fight | Full edits on runs. | The most freedom. | Players swap before every fight, which makes the choice cheap and the fights alike. |

The recommendation is B.

### 5.4 The Loadout page

The shelf on the Loadout page groups the pool by layer: Core, Utility, Cooldown and Specialist. Each specialist carries a chip for the board it is built for (Fragments, Healers, Seals, Mimic, Part rules, Bosses, Crew), which is the same word its key shows in amber in a fight. Presets sit as tabs above the bar, and the page shows the command for each action, so the page teaches the commands.

## 6. Genome

docs/genome.md, in progress in parallel, rolls viruses from a library of mechanic genes and adds bane items against gene types. This section is written to fit whatever names that doc settles on.

The rule that makes them compatible is that a specialist reads a board fact, never a family or a strain name. Fork Bomb reads "fragments on the board", Revoke reads "a part that heals or patches", and Unmask reads "a veiled part, a Decoy or a Mimic". Any gene that produces that fact lights the specialist, so a rolled virus with a spawner gene meets the swarm build however it was assembled.

| Board fact (likely gene class) | Specialists that answer it |
|---|---|
| Fragments, spawning | Fork Bomb, Chain Reaction, DMZ, Multicast, Propagate, Garbage Collect |
| Heals, patches, Self-Update | Revoke, Rootkit Implant, Cache Poison, Bit Rot |
| Armor that comes back, seals | Bit Rot, Polymorph, Fork, Cache Poison |
| Veil, Decoy, Mimic, Echo, Scramble | Unmask, Log Wipe, Honeypot, Echo Cancel, Sudo |
| Locks, wards, Tripwire, going loud | Sudo, Logic Bomb, Throttle, Zero-day |
| Long fights, bosses | Crontab, Circuit Breaker, Takeover, Maintenance Window |

Bane items and specialists stay on different axes. A bane item changes numbers against a gene, and it rides in a protocol slot. A specialist changes what you can do, and it rides on a key. Stacking both against one gene is a choice a player pays for twice, once in gear and once in a key, so it needs no cap of its own. The codex can show a virus's genes, and the Loadout page can show which presets answer them.

## 7. Balance approach

These are the checks the tests should hold once the pools land. They extend presses.test.mjs and balance.test.mjs, and they run on the scripted players, so every new skill needs a planner rule for its baseline and for its moment, or the tests will read it as dead. The *Today* column uses this audit's sample (2.1) and today's default bars.

| Check | What it measures | Threshold | Today |
|---|---|---|---|
| Press-diversity floor | Effective keys on the shipped `rotation` preset, in the class-balance fights at 18, 30 and 40 | 5.0 or more for every subclass | Fails for the Sysop (4.0–4.2), the Herder (4.0 at 18) and the Phantom (4.8 at 18) |
| Spike's share | Spike's share of presses on the same fights | 20% or less | Fails for the Sysop (41–44%), the Herder (35–44%), the Payload (30–32%), the Hijacker (27–32%), the Phantom at 18 (23%) |
| No dead key on a build | Each key on a shipped preset is pressed in at least a quarter of its matched fights, and each specialist in at least a tenth of unmatched fights | Every key | Fails on most conditional keys (2.4) |
| Core rotation alone is viable | Health lost with only the four core-rotation keys (plus Spike and SIGINT), against the full rotation build, on generic fights at 18 and 30 | Within 12 points, and at least 90% of the full build's wins | Using the class core as a stand-in, fails for the Warden (+19 at 30), the Sysop (+14 at 40), the Hijacker (+15 at 40) and the Phantom (+12.4 at 30) |
| The rest of the kit earns its keys | The same comparison the other way | The full build at least 3 points better than the core alone | Fails for the Herder (−8 to −12) and the Payload (−5 to −7) |
| Conditional beats rotation when matched | Each shipped conditional preset against the rotation preset, on its matched set (2.13) | At least 5 points less health lost | Only the Warden's swarm build passes (17 points) |
| Conditional isn't crippled when unmatched | The same pair on the generic set | No more than 8 points worse | Passes for every build measured |
| Tells still pay | The reading bot against the bot that ignores tells (TELL.bots.answer false) | The existing gap of 12 points on average from level 10 | Holds today (docs/skills.md: 12.8 points on average) |

Three planner changes come before any new skill, because the audit shows they are most of the dead weight today.

| Planner | Change | Why |
|---|---|---|
| Payload | Keep Inject at three stacks before pressing Wormable, Implant or Thrash (since section 12: keep one Inject on the target, then spread it). | The Payload drops Inject from 48% of its presses at 10 to 2% at 30 and loses 5 to 7 points to its own class core. |
| Herder (generic planner) | Press Garbage Collect only with fragments up, and Kill Switch only when the cash-in breaks a part or answers a tell that would cost more than the helpers have left. | Both cost 3 to 6 points today. |
| Phantom | Press Backstab on any bare part when it is ready. | 32 on a 2-cycle cooldown beats a Spike, and the bot presses it in 28% of fights. |

## 8. Open decisions

| # | Decision | Options | Recommendation |
|---:|---|---|---|
| 1 | Pool size and pacing | (a) 15 keys, first choice at 16. (b) 15 keys, first choice at 14, by putting two skills at 10. (c) 16 keys, a twelfth line skill at 42. | (a). A new subclass player gets three levels with the full rotation before choosing anything, and the shelf has three keys by 20. |
| 2 | Moving existing skills | (a) Reorder the lines as in section 3. (b) Keep today's levels and add the new skills in the gaps. | (a). Reclaim and Harden measured better than keys that open ahead of them, and both open into full bars today. Keep every skill a save already knows. |
| 3 | Over-conditional skills | (a) Give each a baseline as in section 3. (b) Replace them with new skills. (c) Leave them and lean on presets. | (a). It keeps the moments the last pass built and the tells doc names. |
| 4 | Spike's role | (a) Keep Spike as the filler under every rotation, with a 20% ceiling. (b) Give each subclass its own key-1 skill. | (a). Spike is the same key for everyone and teaches the board. The new cheap core keys bring it down. |
| 5 | The Sysop alone | (a) Keep it weaker by its numbers (smaller hits and heals) and let the bot press every key. (b) Keep it weaker by keeping Purge off the bot's list (today). | (a). A player will press Purge, so the bot should too. If the Sysop gets too strong alone, cut Checksum's heal. |
| 6 | Swaps on runs | (a) Home only. (b) Presets on runs out of a fight, swapped-in keys start cooling. (c) Anywhere out of a fight. | (b). See 5.3. |
| 7 | Procs on the bar | (a) Shatter, Opening and Retaliate keep taking a slot. (b) A lit proc fires from key 1 in place of Spike while it is lit, and leaves the bar. | (a) for now. (b) frees a slot for three subclasses, but it changes what key 1 means. Revisit after the pools land. |
| 8 | Crew-only keys | (a) Fine as specialists, since a solo build leaves them on the shelf. (b) Every key must work alone. | (a). Rebalance and Firewall's taunt stay crew keys, with a small solo baseline. |
| 9 | Double-counting answers | Fuzz counts twice against a tell, like Overvolt today. (a) Allow it. (b) Keep Overvolt the only one. | (a). The Payload has no tell answer before 38 otherwise. |
| 10 | Shipped presets | (a) Two per subclass (`rotation` and one conditional). (b) None. (c) One per section 4 build. | (a). Enough to show what a conditional build is, without choosing for the player. |
| 11 | Test thresholds | The numbers in section 7. | Start there and tighten after the first pass. Five of the eight subclasses already reach the diversity floor of 5.0 at every level measured. |

## 9. The designer's decisions

- **Order.** Reorder the subclass lines as proposed. Saves keep every skill they already know.
- **Swapping.** Presets can be swapped anywhere outside combat, home or run. Swapped-in keys start the next fight cooling. Editing presets follows the same rule.
- **Solo and crew.** Classes don't need to be equal in both modes. Each subclass may be weaker in one mode as long as it is stronger in the other, the way a holy priest is weak solo and strong in a group. The balance bands become per mode and per subclass: a subclass that leans crew may sit at the hard edge of the solo band, as long as it carries a crew in the crew sims.
- **Spike.** Each class may rename Spike to fit its theme, but it stays a plain direct-damage filler with no cooldown. The 20% press cap stands.

## 10. What shipped

The pools in section 3 shipped with the designer's decisions in section 9. Every subclass line is eleven skills, one at each of levels 10, 12, 14, 16, 18, 20, 22, 26, 30, 34 and 38, so a subclass has fifteen keys by 38. Twenty-six skills are new, the over-conditional ones from the audit got a baseline, and Reclaim opens at 12. Two shipped presets come with each subclass, key 1 has a name in each class, and SAVE_VERSION is 37. The numbers below come from the same fights as section 2 (20 wilds and the four guards, and the thirteen solo bosses on two seeds each) and from farmsim.mjs for crews. *Before* is the code at the start of the pass.

### What each subclass got

| Subclass | New | Reworked | Moved |
|---|---|---|---|
| Demolitionist | Debris Field (16), Backfire (20), rm -rf (26) | Shatter's shards hit every other bare part for 12. Fork Bomb deals 16. Chain Reaction takes a part, hits it for 30 and blows for 25 if it breaks. Bit Rot hits for 20. Logic Bomb cools for 5. | Shatter 12→10, Shaped Charge 18→12, Thermal Runaway 22→18, Logic Bomb 26→22 |
| Overclocker | Hot Loop (10), Vent (20), Fault Injection (26) | Sudo's hits go through ◆, one chit each, and it cools for 8. | Thermal Throttle 18→16, Brace 22→18, Stack Smash 26→22 |
| Warden | Reject (10), Circuit Breaker (26), Honeypot (34) | Blowback lights Retaliate. Throttle hits for 20. | Blowback 18→16, Harden 26→18, Quarantine 30→20, DMZ 34→30 |
| Sysop | Checksum (10), Maintenance Window (26), Revoke (30) | Multicast hits every part for 6. Rebalance heals 12 alone. | Reclaim 26→12, Patch 12→14, Heartbeat 18→16, Scrub 22→18, Multicast 14→20, Rollback 30→22 |
| Payload | Fuzz (14), Logic Trap (22), Outbreak (34) | Polymorph burns for 10 once the part is bare. | Wormable 12→10, Detonate 14→12, Rootkit Implant 18→16, Skim 22→18, Polymorph 30→20, Thrash 34→30 |
| Phantom | Fingerprint (10), Side Channel (18), Rotate Keys (22), Unmask (30), Vanish (34) | | Backstab 18→16, Spoof 22→20, Shadow Copy 26→20, Log Wipe 34→26 |
| Herder | nohup (12), Load Shed (16), Crontab (30) | Kill Switch adds Last Gasp to the cash-in, and on armor it breaks a chit for every hit left. Mesh hits once now and cools for 8. | Fan-out 12→10, Kill Switch 18→14, Fork 30→18, Mesh 14→20 |
| Hijacker | Sniff (10), Takeover (26), Echo Cancel (30) | Jam hits for 15 and holds the part even with no helper on it. Cache Poison burns for 5 a cycle. | Replay 18→12, Spoofed ACK 22→14, Hijack 14→16, Jam 12→18, Barrier 26→20, Cache Poison 30→22 |

A skill a save already knew stays known when it moved later (Patch, Multicast, Jam, Hijack, Mesh).

The class cores changed too. Exploit hits for 15, Tag and Hook for 10, Keepalive ticks every burn once when it lands (cooldown 3), and Spawn's helper hits for 7. docs/subclasses/ has every line in full.

### Key 1

Key 1 keeps its id, `spike`, in the code and the save. Each class types and sees its own word for it, and `spike` still works for everyone.

| Class | Key 1 | Typed |
|---|---|---|
| Breaker | Bash | `bash <part>` |
| Bastion | Ban | `ban <part>` |
| Infiltrator | Poke | `poke <part>` |
| Operator | Ping | `ping <part>` |

### Presets

`loadout save <name>`, `loadout use <name>`, `loadout list`, `loadout show <name>` and `loadout delete <name>` work anywhere out of a fight, at home or on a run, and so do `equip` and `unequip`. Every key a swap brings in starts your next fight cooling, as if you had just pressed it (a once-a-fight key cools for 3 cycles). A subclass holds up to six presets. The shipped ones are priority lists: the bar a shipped preset gives is its first keys you know, so a bar that follows `rotation` fills as you level. A bar you edit by hand stops following. The Loadout's skills tab shows the presets as chips over the bar, lit for the one the bar follows, with a *Save bar as…* chip that fills the command line. Tab completion offers the verbs and your preset names.

| Subclass | Conditional preset | Against `rotation` at 30 | For |
|---|---|---|---|
| Demolitionist | `swarm` | Fork Bomb and Chain Reaction for Thermal Runaway and Logic Bomb | Worms, fragments, an Overrun |
| Overclocker | `rules` | Sudo and Vent for Brace and Fault Injection | Ransomware, the Ghostroot, locks, Tripwires and the Mimic |
| Warden | `swarm` | DMZ and Throttle for Harden and Bulkhead | Worms, fragments, loud parts |
| Sysop | `healers` | Revoke for Patch | Leech, Patchwork, PATCH TUESDAY |
| Payload | `swarm` | Propagate and Logic Trap for Tag and the Rootkit Implant | Worms, fragments, an Overrun |
| Phantom | `ghostroot` | Unmask for Log Wipe | The Ghostroot, HOLLOW CHOIR, MIRRORSHADE |
| Herder | `swarm` | Garbage Collect and Fork for Spawn and Load Shed | Worms, fragments, thick armor |
| Hijacker | `rules` | Cache Poison and Echo Cancel for Barrier and Deploy | Healers, the Echo, the Mimic |

### Saves

A save from before the pass (v36) keeps every skill it knew. A skill that now opens later than the save's level goes into `loadout.kept` and stays known. A bar nobody edited (the old default at its level, in the same order) becomes the new `rotation` bar and follows it. An edited bar keeps its keys in their places and fills its empty slots from `rotation`. Every subclass gets its two shipped presets.

### Press shares

Effective keys are one over the sum of the squared press shares, key 1 and SIGINT included. The floor in section 7 is 5.0 at 18, 30 and 40, and key 1's cap is 20%.

| Subclass | Effective keys, before (10 · 18 · 30 · 40) | After | Key 1, before | After |
|---|---|---|---|---|
| Demolitionist | 4.8 · 6.5 · 5.1 · 5.2 | 5.5 · 7.1 · 5.2 · 5.5 | 32% · 17% · 1% · 2% | 4% · 4% · 0% · 1% |
| Overclocker | 4.8 · 4.9 · 5.4 · 5.3 | 5.3 · 5.6 · 5.5 · 5.3 | 32% · 7% · 5% · 7% | 5% · 2% · 1% · 1% |
| Warden | 4.6 · 6.8 · 6.5 · 6.6 | 5.5 · 6.5 · 7.5 · 7.2 | 27% · 21% · 19% · 20% | 7% · 6% · 3% · 3% |
| Sysop | 3.4 · 4.1 · 4.2 · 4.0 | 5.3 · 6.9 · 7.2 · 7.4 | 47% · 44% · 43% · 45% | 7% · 3% · 3% · 3% |
| Payload | 2.6 · 4.5 · 4.5 · 5.1 | 4.5 · 5.4 · 6.7 · 6.2 | 32% · 38% · 38% · 33% | 26% · 13% · 13% · 17% |
| Phantom | 3.4 · 4.2 · 5.6 · 5.4 | 3.8 · 5.4 · 7.0 · 7.1 | 21% · 27% · 13% · 11% | 14% · 5% · 2% · 2% |
| Herder | 3.0 · 3.8 · 4.3 · 4.6 | 4.4 · 6.4 · 6.3 · 6.7 | 52% · 45% · 41% · 37% | 31% · 13% · 11% · 10% |
| Hijacker | 3.0 · 5.8 · 5.3 · 5.2 | 4.8 · 7.9 · 7.8 · 7.3 | 51% · 28% · 33% · 34% | 19% · 9% · 4% · 4% |

| Subclass | Top presses at 30, before | After |
|---|---|---|
| Demolitionist | Shatter 34%, Crack 20%, Thermal Runaway 12%, Shaped Charge 11%, Overload 10% | Shatter 34%, Crack 20%, Shaped Charge 11%, Overload 11%, Thermal Runaway 10% |
| Overclocker | Crack 30%, Overload 19%, Segfault 17%, Overvolt 14%, Thermal Throttle 8% | Crack 29%, Overload 19%, Segfault 16%, Overvolt 14%, Thermal Throttle 10% |
| Warden | Purge 22%, key 1 19%, Rate Limit 19%, Blowback 10%, Quarantine 9% | Purge 20%, Rate Limit 18%, Reject 17%, Quarantine 10%, Blowback 9% |
| Sysop | key 1 43%, Rate Limit 12%, SIGINT 12%, Scrub 10%, Retaliate 8% | Purge 20%, Reclaim 17%, Rate Limit 16%, Checksum 14%, Scrub 11% |
| Payload | key 1 38%, Wormable 19%, Backdoor 14%, Implant 11%, SIGINT 9% | Inject 28%, Backdoor 14%, key 1 13%, Wormable 8%, Detonate 8% |
| Phantom | Inject 27%, Backdoor 23%, Opening 16%, key 1 13%, SIGINT 8% | Inject 22%, Backdoor 19%, Opening 16%, Side Channel 10%, SIGINT 9% |
| Herder | key 1 41%, Fan-out 16%, Fork 16%, Mesh 9%, SIGINT 6% | nohup 28%, Botnet 17%, Fan-out 14%, key 1 11%, Mesh 7% |
| Hijacker | key 1 33%, Botnet 17%, Replay 16%, Spoofed ACK 12%, Hijack 9% | Sniff 22%, Botnet 16%, Replay 13%, Takeover 12%, Spoofed ACK 9% |

The Breakers barely moved at 30: their fights there last six or seven cycles, and Shatter after each strip is most of them. At 10 the Payload still presses key 1 26% of the time and the Herder 31%, because their cheap hits (Fuzz, nohup) open at 14 and 12. The tests hold the floor and the cap from 18.

The planner changed with the kits. The Payload keeps an Inject on its target before it spends its line's burns, the Herder presses Garbage Collect only with fragments up and cashes Kill Switch in only when the helpers on a part would break it, and the Phantom Backstabs any bare part. Each subclass has a `fill` list of cheap keys the generic planner presses before key 1, and a part its burns and helpers break this cycle (Hooked hits counted) gets no command. Kill Switch no longer counts as an answer to a charge on a part with no helpers on it.

### Balance per mode

Each subclass now says which way it leans (`lean` in its data). A subclass that leans one way may be weaker in the other, as the designer's decision allows, and must be strong in the one it leans to.

| Subclass | Leans | Signal lost alone at 18 · 30 | Cycles a fight alone | Solo bosses won at 30, before → after | As a crew's third member: boss tries won at 18 · 30 | Crew's low point at 18 · 30 |
|---|---|---|---|---|---|---|
| Demolitionist | Solo | 26% · 23% | 7.2 · 6.8 | 18/26 → 24/26 | 18/20 · 18/21 | 14% · 31% |
| Overclocker | Solo | 34% · 36% | 8.1 · 6.9 | 22/26 → 24/26 | 17/30 · 18/21 | 10% · 29% |
| Phantom | Solo | 36% · 26% | 9.4 · 9.8 | 22/26 → 23/26 | 18/26 · 18/28 | 15% · 27% |
| Payload | Crew | 41% · 38% | 9.0 · 6.5 | 12/26 → 23/26 | 18/18 · 18/18 | 23% · 45% |
| Herder | Crew | 37% · 41% | 8.5 · 5.9 | 17/26 → 18/26 | 18/20 · 18/18 | 25% · 36% |
| Hijacker | Crew | 42% · 37% | 8.8 · 8.0 | 24/26 → 20/26 | 18/18 · 18/19 | 32% · 35% |
| Warden | Crew | 18% · 26% | 13.8 · 14.1 | 26/26 → 24/26 | the tank | the tank |
| Sysop | Crew | 3% · 5% | 15.6 · 14.3 | 11/26 → 22/26 | the healer | the healer |

The solo-leaning damage dealers lose less alone than the crew-leaning ones, at 18 and 30 together. The crew-leaning ones win more of the crew's boss tries and keep the crew's lowest point higher. The two Bastions carry their crews: on the farm at 18 a crew with no healer clears none of six runs and wins 12 of 36 boss tries, and one with no tank clears one and wins 13 of 40, where the full crew clears all six and wins every try. Alone the Bastions pay in time, at about twice the cycles a fight of a damage dealer.

The level-10 Breakers used to lose most tries against the three-part solo bosses. Over six seeds of the eight three-part bosses, the Demolitionist now wins 30 of 48 (13 before) and the Overclocker 31 of 48 (22 before), against 31 for the Payload and the Phantom, 26 for the Herder and 17 for the Hijacker. Each Breaker beats HOLLOW CHOIR three times in six.

### The tests

| Section 7 check | Now |
|---|---|
| At least 5.0 effective keys at 18, 30 and 40 | Every subclass, on the rotation preset |
| Key 1 at 20% or less | Every subclass from 18. The Payload's 17% at 40 is the highest. |
| The core rotation alone within 12 points of the full build | Every subclass but the Bastions, whose cores leave out their answers and heals: the Warden is 15 points back at 30 and the Sysop 20. The test gives them 20. |
| Each conditional preset 5 points better on its fights, and no more than 8 worse elsewhere | The Sysop (14 better), the Hijacker (14), the Herder (8), the Overclocker (8), the Warden (8) and the Payload (6). The Demolitionist's swarm build is 3 better and the Phantom's ghostroot build level with its rotation: a `todo` test. |
| Tells still pay | The reading bot's gap holds (balance.test.mjs). |
| Per-mode bands | `soloBand` in balance.mjs: 15–50% lost alone, the Bastions under 50%. The Bastions are held to at least 1.4 times the damage dealers' cycles alone, and the crew-leaning damage dealers to the crew numbers above (kits-crew.test.mjs). |

kits.test.mjs checks the lines, the presets and their commands, the cooling on a swap, key 1's names and the v36 save. kits-balance.test.mjs and kits-crew.test.mjs check the numbers above.

### For the designer

- **The Sysop alone.** Decision 5 kept it weaker by its numbers, but its hits now heal: Checksum, and Reclaim from 12. Alone it loses 3–5% of its Signal a fight from 18 and wins 22 of 26 solo bosses, where it lost 35–45% and won 11 before. It is still the slowest subclass, at about twice the cycles of a damage dealer. With every self-heal set to zero it would lose about 35%, so reaching the hard edge of the solo band through numbers alone means taking most of what it heals with. The tests hold it by pace for now.
- **Two conditional builds miss the 5-point target.** The Demolitionist's rotation already strips and blasts a swarm well, and the Phantom's rotation already reads the Ghostroot with Backstab and Fingerprint. A swarm or ghostroot key with more bite, or a harder matched set, would make the swap pay.
- **The Hijacker alone at 30.** It won 24 of 26 solo bosses before and wins 20 now. It leans crew, and in a crew at 18 it keeps the crew higher than any other damage dealer.
- **The Breaker climbs faster alone.** With the level-10 fix, SPRAWL-only play gets a Breaker to 12 only 8% slower than mixed play, where every other class takes at least 37% longer. loop.test.mjs holds the Breaker, which leans solo, to 1.0 times.
- **Key 1 at 10.** The Payload and the Herder press key 1 26% and 31% of the time at 10, before their cheap hits open. Moving Fuzz or nohup to 10 would fix that, at the cost of a reorder.

## 11. After review

The designer reviewed the kit pass and asked for four things: tooltips that read like a World of Warcraft tooltip, specialist keys that are useful in most fights with their special case as a bonus, second presets that are playstyles of their own, and three items left over from the merge (a slower Sysop alone, a cap on boss charges, and the Keyring's answer). All of it is in, SAVE_VERSION is 38, and the full suite is green apart from its two `todo` tests (the friction band and the per-gene calibration). Unless a table says otherwise, the numbers come from the 24 class-balance fights of section 10 (20 wilds and the four guards), at Lv 30.

### Tooltips

Every ability's `help` keeps its command first (`flood <part> — `), because the help line, the skill cards and the tests read it, and the tooltip comes after the dash. The text is in the third person, states each effect with its number, gives durations as *for 4 cycles*, puts conditions after the main effect, and ends with *Once per fight.* or *Cooldown resets on a critical strike.* as sentences of their own. The `short` line on each key stays terse and leads with the number, at 29 characters or fewer. Talent and filler rules read the same way (*Increases the damage of Shatter by 8% per rank.*), key 1's card in each class does too, and the library's descriptions in dist/lore.mjs that still had old numbers (Flood's 30, Zero-day's 80, Brace's Block) were brought up to date. The numbers still grow with your level on screen, as before (`scaledText`).

| Skill | Before | After |
|---|---|---|
| Flood | 38 damage, double on a part with no armor left. | Deals 38 damage to the target. Damage is doubled against a target with no armor. |
| Overload | 40 damage. If it crits, its cooldown resets. | Deals 40 damage to the target. Cooldown resets on a critical strike. |
| Zero-day | 65 damage straight through armor, locks and wards. Once per fight. | Deals 65 damage to the target, straight through armor, locks and wards. Once per fight. |
| Rate Limit | 45 damage, +15 if its attack is due this cycle, and its next attack deals half (Throttled). On armor it breaks 2 ◆. | Deals 45 damage and Throttles the target, so its next attack deals half. Deals 15 more if its attack is due this cycle. Breaks 2 ◆ on an armored part. |
| Inject | 20 damage every cycle for 4 cycles. Pressing it again on the same part refreshes it; it never stacks. | Burns the target for 20 damage every cycle for 4 cycles. Reapplying it refreshes the duration. |
| Backstab | 32 damage. It always crits a part that's busy with a tell: winding up a charge, compiling a cast, sealing or recording. | Deals 32 damage to the target. Always a critical strike against a part busy with a tell: winding up a charge, compiling a cast, sealing or recording. |
| Heartbeat | heals you 4 a cycle for 4 cycles, starting now, and a charged hit on you while it runs deals 25% less. | Heals you for 4 every cycle for 4 cycles, starting now. A charged hit on you deals 25% less while it runs. |
| Hijack | pull one of your helpers off it to take over its tell. A charge lands on another part of the virus at full size, through armor; a cast compiles for you instead (+35% damage for 4 cycles). | Spends one of your helpers on the target to take over its tell. A charge lands on another part of the virus at full size, through armor. A cast compiles for you instead, and your hits deal 35% more for 4 cycles. |

| Key | Short before | Short after |
|---|---|---|
| Flood | Hit 38, ×2 if bare | 38 damage, ×2 on bare parts |
| Overload | Hit 40, crit resets | 40 damage, resets on a crit |
| Crack | Strip 3 ◆ | Breaks 3 ◆ |
| Purge | Burn 6×4, heal, cleanse | Burn 6 ×4, heals, cleanses |
| Rate Limit | Hit 45 (+15 if due), throttle | 45 damage and Throttles |

At 390 pixels the tray shows the first 17 or so characters of a short line, as it did before, so each one leads with what matters. The tray, the Loadout's skills tab and the library have no horizontal scroll at that width (headless Chromium, a level-30 Demolitionist on `area`, a Phantom on `evasion`, a Sysop and a Hijacker).

### General use over narrow counters

Each specialist key (the `layers.specialist` of every subclass) was put on the rotation bar at Lv 30, or the level it opens, in the last slot when the preset leaves it off, and played over the 24 fights. A key pressed in fewer than a quarter of them got a general baseline, with its special case kept. kits-balance.test.mjs now holds every specialist key to a quarter of the fights.

| Subclass | Key | What changed | Fights it is pressed in, before → after |
|---|---|---|---|
| Demolitionist | Fork Bomb | A Crack on every part: it breaks 3 ◆ on each armored part and deals 16 to each bare one (fragments ×3). Cooldown 4. It used to deal 16 to every part, which on an armored part only broke one ◆. | 3 → 21 |
| Demolitionist | Chain Reaction | 40 damage (30 before), or 2 ◆ off an armored part, and the blast is 30 (25). Cooldown 5 (6). The planner wires the part it is about to Shatter, and takes kills with it when other parts stand to catch the blast. | 4 → 14 |
| Demolitionist | Bit Rot | 25 damage (20), or 2 ◆ off an armored part, and any part rots: it takes 20% more from you while it does. The planner opens on a ◆4 shell with it, or strips with it while Crack cools. | 0 → 13 |
| Warden | DMZ | Unchanged in numbers. Alone, the Warden puts it up whenever a fifth of its Signal is about to land and nothing else cuts it. | 4 → 12 |
| Sysop | Multicast | Unchanged in numbers. Alone it tops the Sysop up below 75%, and it hits every part on the way. | 0 → 13 |
| Sysop | Revoke | A revoked part's attacks deal 25% less for 4 cycles, on anyone. Alone, the Sysop Revokes the part that hits hardest a cycle before it lands. | 6 → 23 |
| Sysop | Rebalance | Unchanged. Alone it is a top-up heal below 75% (at 38). | 0 → 10 |
| Payload | Polymorph | Burns for 14 on a bare part too (10 before), and the planner puts it on anything that will outlive its burns. | 5 → 9 |
| Phantom | Unmask | 26 damage through armor (20, not through), and for 4 cycles your hits on the part have +25% crit chance. The veil and the Mimic still come with it. | 5 → 15 |
| Phantom | Rotate Keys (utility) | Softens the next two hits by 30% instead of one, and each lights Opening, so it serves the `evasion` build. | |
| Herder | Garbage Collect | 14 to every part (10). The Herder presses it when three or more helpers are about to run out, so they run a cycle longer. | 3 → 11 |
| Hijacker | Cache Poison | 18 damage (none before) and 8 a cycle (5), and a poisoned part's attacks deal 20% less. Alone, the Hijacker poisons its target when Botnet or Deploy is cooling. | 1 → 7 |

Throttle (12), Honeypot (9), Propagate (13), Fork (16), Crontab (20) and Echo Cancel (13) were already in use. Sudo sits at 6 of 24, a quarter exactly, and was left as it was: a wider rule cost the Overclocker Signal in crews. Two attempts were dropped for the same reason. A Fork Bomb that stripped two ◆ a part was too weak to press, and every Demolitionist key that cost a command before the first kill (a Bit Rot on the next part, a Fork Bomb on cycle 1) lost 15 to 25 points of Signal, because at 30 the first cycle decides who fires first.

### Second presets

The second preset of each subclass is now a playstyle, tested against `rotation` on two sets: the 24 generic fights, where it must stay within 5 points of the rotation either way, and the fights its playstyle suits (balance.mjs `MATCHED`, two seeds each), where it must lose at least 5 points less. The old test, which asked a counter build to win by 5 on its matched fights, was a `todo` for the Demolitionist and the Phantom and is gone.

| Subclass | Preset | For | Generic, against `rotation` | Its fights, better by |
|---|---|---|---:|---:|
| Demolitionist | `area` (was `swarm`) | Spreading damage over every part: Fork Bomb, Chain Reaction and rm -rf for Thermal Runaway and Logic Bomb | 3.8 better | 7.2 (many parts) |
| Overclocker | `rules` | Locks, wards, Tripwires and the Mimic | 1.5 worse | 8.4 |
| Warden | `swarm` | Fragments, Replicates and loud parts | 1.8 worse | 7.6 |
| Sysop | `healers` | Leech, Patchwork, PATCH TUESDAY | 1.9 better | 14.2 |
| Payload | `swarm` | Worms, fragments, an Overrun | 0.3 worse | 5.6 |
| Phantom | `evasion` (was `ghostroot`) | Misses and Opening: Opening, Null Route, Shadow Copy and Rotate Keys lead, Fingerprint and Log Wipe sit out | 3.0 better | 10.2 (big hitters) |
| Herder | `swarm` | Garbage Collect for Mesh | 0.2 better | 23.1 |
| Hijacker | `rules` | Healers, the Echo, the Mimic | 4.3 worse | 8.1 |

The `rotation` presets changed in two places. The Phantom's carries Unmask in its seventh key, where Log Wipe was, and the Demolitionist's puts Exploit ahead of Fork Bomb, so the Lv 18 rotation is the single-target bar (Fork Bomb sits on it at 14 and 16, when there is room). The Herder's `swarm` used to swap Spawn and Load Shed for Garbage Collect and Fork, which made it 8 points better than `rotation` on every fight. It now swaps Mesh for Garbage Collect. The Evasion set is four elites, a Bricker, an Extortion and a Floodgate, DEADBOLT, TRIPMINE and RELAY-KING.

A v37 save renames the two presets in place (`PRESET_RENAMES`, `presetRenameRestore` in combat.mjs): the shipped `swarm` becomes `area` for the Demolitionist and `ghostroot` becomes `evasion` for the Phantom, in the same place in the list, and a bar that followed the old name follows the new one. A preset the player saved under one of those names is theirs and keeps it. The other six second presets keep their names.

### The Sysop alone

Alone (no crew in the fight) the Sysop's hits and burns deal 75% of their size (`SUBS.sysop.alone`). The heals it draws from its hits (Checksum, Reclaim, Maintenance Window) are worked out from the full hit, so they stay where they were. Its core rotation is now Checksum, Reclaim, Purge and Heartbeat: the four hits on their own lost about 30% at 30 with the cut, a healer's simplest rotation includes a heal, and that one loses about 14%. In a crew nothing changes.

| Over three gear sets, 48 fights each | Cycles a fight, before → after | Against the damage dealers' median | Signal lost, before → after | Wins |
|---|---|---|---|---|
| Lv 18 | 15.8 → 18.0 | 1.78× → 2.03× | 3.3% → 3.8% | 99% |
| Lv 30 | 14.0 → 16.5 | 1.88× → 2.23× | 7.7% → 10.5% | 93% |

balance.test.mjs holds the Sysop to twice the median and 15% lost at most, and the Warden to 1.4 times as before. A cut to 70% reached 2.10× at 18 but lost a Tripwire probe at 30 outright, and the hard bound on rolled genes (25 points) failed.

### Boss charges

A solo boss's single landing on you, charged or plain, now stops at 60% of your max, so nothing one-shots you. A wild virus's or a guard's charge stops at 45% (`CONFIG.spikeCap`, applied where an attack lands and in the charge's own size). Crew bosses keep their own rules. The spike-cap test is no longer a `todo`: it holds HASHLORD and MIRRORSHADE on their twelve seeds and every solo boss at 10, 18 and 30 (one seed a subclass) to 60%, and every charge in the hard slice at 10 and 30 to 45%.

| Worst single landing, one seed a subclass at 10, 18 and 30 | Before | After |
|---|---:|---:|
| SLEEPWALKER | 64% | 49% |
| PATCH TUESDAY, DEADBOLT, TRIPMINE | 58–59% | 57–58% |
| HASHLORD | 55% | 55% |
| MIRRORSHADE | 43% | 35% |
| The rest | 25–46% | 25–49% |

A plain wild hit with a crit can still pass 45%: 55 of 2,806 landings in the hard slice did (a Deadline crit at 75% the worst). Capping those too made a solo player so much safer at levels 1 to 12 that SPRAWL-only play caught up with mixed play (the slow-road test in loop.test.mjs fell from 1.85× to 1.39×), so the 45% holds for charges only.

### The Keyring

Breaking the Keyring first was wrong for every kit but one. The Keyring has no attack, and its re-arm only gives the Gate its shell back, so burns, helpers and hits through armor lose nothing to it. What it beats is a strip: a Breaker that can't get through the Gate's shell and kill it before the next re-arm wastes every Crack. So the planner now works on the Gate, and only a Breaker without Shaped Charge, whose strips can't bare the Gate in the cycles left before the next re-arm, breaks the Keyring first (`keyringNow` in planner.mjs). The codex line, the Bouncer's rule and its first-meeting tip say the same: kill the Gate between re-arms, and break the Keyring first only when its shell is too thick.

| Keyring probe, six seeds | Before | After |
|---|---:|---:|
| Points answering saves over ignoring it | −14.8 | +0.2 |
| A Lv 5 Breaker's wins, answering · ignoring | 5 · 0 of 6 | 5 · 0 of 6 |
| The Payload's wins, answering · ignoring | 17 · 18 of 18 | 18 · 18 of 18 |

The calibration test's bar of 3 points for an answer is still a `todo` for the Keyring: for every kit but a low-level Breaker, the right answer is to play the Bouncer as a plain guard.

### What else moved

- **COLDWALLET** went from Integrity ×8 to ×8.8. Fork Bomb opens every part for the crew now, so a crew with one damage dealer beat it 7 times in 16, where the farm test wants the boss to win most tries. At ×8.8 it wins 12 of 16, and the full crew still wins 24 of 25 tries.
- **Solo numbers on the 24 fights** moved only where the kits changed: the Demolitionist at 18 from 25% to 22% (Fork Bomb on its bar there), the Phantom at 30 from 26% to 24% (Unmask on the bar), and the Sysop's cycles as above. Every band, the boss bands, the tells gap, the press tests and the crew tests hold.
- **The planner** takes kills with Chain Reaction before Overload and Flood, and a lit Shatter or an attack due this cycle comes before any Demolitionist set-up.

### For the designer

- **The Payload's `swarm` and the Hijacker's `rules` are close to the lines.** The Payload's is 5.6 better on its fights (5 is the bar), and the Hijacker's 4.3 worse on generic fights (5 is the bar).
- **The Sysop at 18 is at 2.03×.** A small change to the damage dealers' pace at 18 can move it under 2.
- **Sudo and Garbage Collect at 40.** Sudo is pressed in a quarter of the fights exactly. Garbage Collect is pressed in 11 of 24 at 30 but 3 of 24 at 40, where the fights end before the helpers run down.
- **Wild hits over 45%.** Only charges are capped for wild viruses. Capping every hit needs the solo pace at levels 1 to 12 looked at again, or the slow-road test moved.

## 12. Inject: one strong burn

A player's report: "Inject feels awkward to play with. You're required to inject 3 times to deal good damage which is annoying." The designer chose one strong burn. One press is enough, and stacking moves to other skills: Wormable spreads it, Tag amplifies it, Detonate cashes it in.

### The numbers

| Skill | Before | Now | Why |
|---|---|---|---|
| Inject | 12 a cycle for 3 cycles, stacks to 3 (a fourth replaces the oldest), cooldown 1 | **20 a cycle for 4 cycles, cooldown 3.** Pressing it again on the same part refreshes it (the longer time left wins) instead of adding a second. A copy landing on a part with your Inject (Propagate, Wormable, Contagion, Bloom, Logic Trap, Outbreak) refreshes it too. | The rework. 80 damage a press instead of 36. |
| Surprise window | Inject lands an extra stack | Inject ticks once at once, on top of its cycle's tick | A bigger first tick, with no second burn to track. |
| Heap Spray | Inject +2 a tick a rank | +3 a tick a rank | The same share of a bigger tick (15% a rank). |
| Long Fuse (`polymorphic`) | Inject lasts 5 cycles | 6 cycles | Still two cycles more. |
| Contagion | Copies each Inject (a fourth replaced the oldest) | Copies it, or refreshes the one there | No stacks. |
| Backdoor | +6 a burn | +8 a burn | One Inject used to be up to three burns. |
| Wormable | Burn 10 a cycle, spreads | Burn 8 a cycle; each copy carries your Inject on the target with it (refreshing one there) | "Wormable spreads it." The carried Inject is worth far more than the 2 a tick it gave up, and without the trim the Payload sat under its solo floor at Lv 10. |
| Outbreak | An Inject (12 ×3) on every part | An Inject (20 ×4) on every part, refreshing one there | Inject's numbers. |
| Detonate, Tag, Keepalive | | As before | Tag (+50% for 4 cycles on a 3-cycle cooldown) and Detonate (the rest at once, +50%) already fit one heavy burn. |

The burn tag on a part reads *Inject · 20* now: no ×n/cap count for a burn that can't stack. The MIRRORSHADE boss went from ×1.3 to ×1.34 Integrity (docs/genome.md 15.3): with Tag free for the Mimic's beat, the Phantom won all twelve fights at its floor and put the reader over the band's 85%.

### The intended rotations

- **Payload.** Inject in the Surprise window (it ticks at once). Then spread it: Propagate copies every burn on the target to every part without an Inject, Wormable walks it on one part a cycle (Wormable first against a Replicator, as it reaches the fragments still to come). Tag the target while the Inject burns, Fuzz on a tell, Polymorph through thick armor. Detonate when what is left of the burns breaks the part or the part is about to fire, with Propagate first when there's time so the burns live on elsewhere. Inject again only on a part without one.
- **Phantom.** In the Surprise window, Inject, unless the target fires within a cycle and Backdoor now with Side Channel or Unmask next breaks it first. Keep one Inject burning under the hits: on the target, then on the next part to attack. Backdoor, Side Channel and Fingerprint (which takes a last ◆ or two off and leaves the bare code fresh for a crit) on armor; Opening, Backstab and Unmask on bare code. Holding a key for a charge's window now fires an Inject the part doesn't have, not a Spike.

### What the planner does differently

The planner (dist/classes/infiltrator.mjs) presses Inject only on a part without one (planner.mjs and tells.mjs too: the old `burnsOn < 3` checks are gone), puts the Phantom's next Inject on the next part to attack, takes a Payload's Detonate on a part about to fire before any other kill, puts Polymorph on thick armor before Inject and on anything that will outlive its burns, and raises Logic Trap's bar to a hit of 20% of your max (it was 12%, and it spent the cycle Wormable wanted).

### Balance, before and after (balance.mjs, the 24 class-balance fights, Signal lost)

| | Lv 10 | Lv 18 | Lv 30 |
|---|---:|---:|---:|
| Phantom, before | 27% (9.6 cycles) | 25% (8.9) | 20% (8.2) |
| Phantom, now | 37% (10.0) | 25% (8.5) | 20% (6.6) |
| Payload, before | 21% (7.4) | 41% (8.7) | 36% (6.3) |
| Payload, now | 18% (6.1) | 41% (7.1) | 38% (6.1) |

The Phantom still loses less alone than every crew-leaning damage dealer at 18 and 30, and the Payload still carries a crew best (the farm at 18 and 30: Payload wins 100% of boss tries with a low point of 40%, the Phantom 90% and 33%; before, 97% and 37%, 61% and 19%). The hard slice: the Payload 22/22 to 23/23 (29–46% lost), the Phantom 19/22 at 10, 23/23 from 18 (22–54%). Reading tells is still worth the most at Lv 10 and 18. Effective keys at 18, 30 and 40: the Payload 6.9, 7.1 and 6.5, the Phantom 5.1, 6.6 and 6.0. The Phantom at Lv 10, with Fingerprint its only line key, is the one place the rework costs: one Inject on a 3-cycle cooldown leaves it pressing Spike between its few keys, where three stacks used to be one key pressed every cycle. It stays inside its band.

## Appendix: rerunning the audit

The audit used balance.mjs's `build` and `POLICIES` and dist/combat.mjs's `defaultBar`, with a fight function written like balance.mjs's `fight` that also passes `boss` to `selectEncounter` (with the boss's family and strain from `BOSSES`). For each subclass and level it played the sample in 2.1 with seeds offset by 0 and 77, then the same fights with each key left empty, with only the class core, and with each known skill that isn't on the default bar swapped in for the least-pressed key. The moment check in 2.4 read `tellOn` from dist/tells.mjs and the board before each command. The build comparison in 2.13 played named bars at level 40 on the four sets listed there. The scripts were throwaway and are not in the repo.
