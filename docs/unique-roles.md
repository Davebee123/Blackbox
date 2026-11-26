# What each unique is for

A unique is about a good yellow in its own situation (the designer, November 2026): a yellow's base, two secondary stats
where a yellow has its affixes, and its effect where a yellow has its rule. Its *why* is its tooltip's answer line
(content/items.mjs `why`, view.mjs uniqueWhy). `node unisim.mjs` measures it.

## How it's measured

Each unique in place of a yellow in its slot, the rest of the build yellow too, at its own level:

- **Niche:** the subclasses it leans to (every subclass for one that leans to none), in its situation where it has one
  (setsim.mjs SCENES), else the generic fights: the change in Integrity a fight costs against the yellow, in points of
  your max. Negative: the unique beats the yellow.
- **All:** every subclass on the generic fights.

The aim: the niche at about 0 or better (a good yellow there), *All* no better than about −4 (never a must-wear). One
unique moves a fight a little, and two runs of the same unique differ by up to 3 points, so read a row's sign and size,
not its decimal. Where the bots can't show a unique's situation, *Bots* says why, and the designer's play decides.

**Where it stands:** across the 214 uniques, the average is +0.2 in the niche and +0.4 for all: a yellow's worth.

| Unique | Lv | Slot | Why | Who | Where | Niche | All | Bots |
|---|---:|---|---|---|---|---:|---:|---|
| Neighbour's Wi-Fi | 2 | proxy | Dodge more the more you're hit | Everyone | any fight | -0.1 | -0.1 |  |
| Boot Loop | 3 | shell | Keep fighting once you drop below half | Everyone | starting at 45% Integrity | -5.2 | -1.6 |  |
| Crown Packet | 3 | exploit | Hit each part on the cycle it attacks | Everyone | any fight | -2.4 | -2.4 |  |
| Hop Limit | 3 | shell | Heal a little from every hit you take | Everyone | any fight | -5.6 | -5.6 | levels 3–5: any start-of-fight help swings these short fights |
| Tracking Pixel | 3 | script | Tag a part, then hit it, as a Phantom | Phantom | any fight | -1.1 | +4.2 |  |
| DuckyScript | 4 | script | Win short fights in the first three cycles | Everyone | any fight | -3.4 | -3.4 |  |
| Eviction Notice | 4 | exploit | Break parts to bring your skills back sooner | Everyone | any fight | +2.4 | +2.4 |  |
| Hot Patch | 4 | shell | Patch more often as a Sysop | Sysop | any fight | +9.1 | +1.5 | the bots don't press that skill yet |
| Slow Drip | 4 | exploit | Burn a part, then crit it, as a Payload | Payload | any fight | +2.5 | +2.3 |  |
| Squatter's Rights | 4 | proxy | Start every fight behind a ◆ | Everyone | any fight | -13.7 | -13.7 | levels 3–5: any start-of-fight help swings these short fights |
| Cryptominer | 5 | proxy | Speed up the longer a fight runs | Everyone | elites (long fights) | +0.1 | +4.1 |  |
| Hotfix | 5 | shell | Regen your way back from below half | Everyone | starting at 45% Integrity | -12.2 | -4.5 | levels 3–5: any start-of-fight help swings these short fights |
| Jackhammer | 5 | exploit | Flood more often as a Demolitionist | Demolitionist | any fight | -2.0 | -2.4 | the bots don't press that skill yet |
| Logger Spool | 5 | exploit | Fire on the beat inside Sync Windows | Everyone | any fight | -2.0 | -2.0 | the bots don't play its situation |
| Null Byte | 5 | exploit | Answer a tell, then hit the Open part hard | Everyone | any fight | -2.4 | -2.4 |  |
| Worker Pool | 5 | script | Send helpers at the parts you've burned, as a Herder | Herder | any fight | +2.5 | +1.6 |  |
| Canary Token | 6 | shell | See every tell a cycle sooner | Everyone | any fight | +6.4 | +6.4 | the bots don't play its situation |
| Flood Ramp | 6 | script | Hit the parts your burns are on | Everyone | any fight | +1.1 | +1.1 |  |
| Regular | 6 | script | Build around Echo early | Everyone | any fight | -1.1 | -1.1 |  |
| Shade Filter | 6 | shell | Dodge more on even cycles | Everyone | any fight | +4.5 | +4.5 | raised once; the bots rarely meet its condition |
| Tripwire | 6 | shell | Let tells land and dodge what follows | Everyone | any fight | +5.5 | +5.5 | raised once; the bots rarely meet its condition |
| Uptime SLA | 6 | proxy | Hold the line below half as a Warden | Warden | starting at 45% Integrity | -4.9 | -1.1 |  |
| Foreman's Lanyard | 7 | proxy | Take less from long fights' later cycles | Everyone | elites (long fights) | -1.7 | -2.2 |  |
| Hashboard | 7 | script | Break a part to fire that skill again | Everyone | any fight | -1.1 | -1.1 |  |
| Ping of Death | 7 | script | Answer tells to damage the part | Everyone | any fight | -0.2 | -0.2 |  |
| Ransom Note | 7 | exploit | Crit the virus's signature part | Everyone | any fight | +1.6 | +1.6 |  |
| Spearphish | 7 | exploit | Tag more often as a Phantom | Phantom | any fight | +2.0 | +3.5 | the bots don't press that skill yet |
| Time and a Half | 7 | script | Grow stronger the longer a fight runs | Everyone | elites (long fights) | -4.7 | -1.9 |  |
| Dead Pool | 8 | exploit | Finish parts below half | Everyone | any fight | +3.3 | +3.3 | raised once; the bots rarely meet its condition |
| Fan Curve | 8 | shell | Let your burns grow over a long fight | Everyone | any fight | +1.7 | +1.7 |  |
| Leech Hook | 8 | exploit | Crit to heal through Leech | Everyone | any fight | +5.7 | +5.7 | raised once; the bots rarely meet its condition |
| Lien | 8 | script | Crit armored parts | Everyone | any fight | -0.4 | -0.4 |  |
| Lockpick | 8 | script | Crack Mutex locks and Lockbox wards | Everyone | any fight | +0.2 | +0.2 | a counter: its virus or boss is rare in the generic fights |
| Repossessed Key | 8 | shell | Regen behind your shield | Everyone | any fight | +0.2 | +0.2 |  |
| Shrapnel | 8 | script | Heal on every break as an Overclocker | Overclocker | any fight | -5.5 | -2.0 |  |
| Street Atlas | 8 | script | Push into rooms you haven't cleared | Everyone | in a room you haven't cleared | -0.2 | -2.8 | the bots don't play its situation |
| Thermal Paste | 8 | exploit | Tag a part, then crit it | Everyone | any fight | +3.4 | +3.4 | raised once; the bots rarely meet its condition |
| Watchdog Whitelist | 8 | proxy | Harden against hits that take a big bite | Everyone | any fight | -4.0 | -4.0 |  |
| Air Gap | 9 | shell | Fight viruses that encrypt you | Everyone | any fight | +2.3 | +2.3 | a counter: its virus or boss is rare in the generic fights |
| Cold Wallet | 9 | proxy | Take no crits from the virus | Everyone | any fight | +3.6 | +3.6 | raised once; the bots rarely meet its condition |
| Fork Handle | 9 | shell | Botnet more often as a Hijacker | Hijacker | any fight | +6.7 | +5.6 | the bots don't press that skill yet |
| Reflector | 9 | shell | Turn a Mimic's playback against it | Everyone | any fight | +1.0 | +1.0 | a counter: its virus or boss is rare in the generic fights |
| Choirboy | 10 | proxy | Shake off Scrambles faster | Everyone | any fight | -2.1 | -2.1 | a counter: its virus or boss is rare in the generic fights |
| Fork Reaper | 10 | exploit | Cut down a virus's fragments | Everyone | any fight | +2.8 | +2.8 | a counter: its virus or boss is rare in the generic fights |
| Hollow Note | 10 | exploit | Save big hits for odd cycles | Everyone | any fight | +1.1 | +1.1 |  |
| Brick Key | 11 | exploit | Hit parts that have gone loud | Everyone | any fight | +3.6 | +3.6 | a counter: its virus or boss is rare in the generic fights |
| Echo Chamber | 11 | script | Echo more while a part winds up a tell | Everyone | any fight | +3.0 | +3.0 |  |
| Watchlist | 11 | proxy | Heal from the tells you take | Everyone | any fight | -0.3 | -0.3 |  |
| IRQ Line | 12 | script | Interrupt more often with SIGINT | Everyone | any fight | +4.6 | +4.6 | the bots don't press that skill yet |
| Paper Trail | 12 | exploit | Call off a boss's wind-up in time | Everyone | any fight | +0.5 | +0.5 | a counter: its virus or boss is rare in the generic fights |
| Payment Plan | 12 | shell | Buy time against a boss's enrage | Everyone | elites (long fights) | -0.7 | +0.2 | a counter: its virus or boss is rare in the generic fights |
| Swarm Intelligence | 12 | script | Burn while your helpers work | Everyone | any fight | +3.2 | +3.2 | raised once; the bots rarely meet its condition |
| Cell Key | 13 | exploit | Open every fight with a crit | Everyone | any fight | -1.0 | -1.0 |  |
| Quiet Hours | 13 | shell | Slip past the first attacks of a fight | Everyone | any fight | +0.9 | +0.9 | the bots don't play its situation |
| Read Receipt | 13 | shell | Keep answered parts Open a cycle longer | Everyone | any fight | +7.4 | +7.4 | the bots don't play its situation |
| Cascade Failure | 14 | exploit | Delay attacks to damage their parts | Everyone | any fight | +1.1 | +1.1 | the bots don't play its situation |
| Gate Bypass | 14 | proxy | Hold a helper out to harden yourself | Everyone | any fight | +2.3 | +2.3 |  |
| Governor | 14 | proxy | Blunt parts that attack again and again | Everyone | any fight | -0.1 | -0.1 |  |
| Honeynet | 14 | script | Crit, then dodge for two cycles | Everyone | any fight | +1.4 | +1.4 |  |
| Split Brain | 14 | exploit | Keep a broken twin down | Everyone | any fight | +2.4 | +2.4 | a counter: its virus or boss is rare in the generic fights |
| Trace Loop | 14 | shell | Heal by hitting Tagged parts | Everyone | any fight | -1.5 | -1.5 |  |
| Rootless | 15 | implant | Fire each skill in its moment | Everyone | any fight | +6.2 | +6.2 | the bots don't play its situation |
| Cold Boot | 16 | shell | Come back once a run from the brink | Everyone | starting at 45% Integrity | -1.1 | +1.0 | the bots don't play its situation |
| Honeycomb | 16 | shell | Block hard in the first three cycles | Everyone | any fight | +1.9 | +1.9 |  |
| Write Blocker | 16 | proxy | Keep your ◆ and shield through a seal | Everyone | any fight | +2.2 | +2.2 | a counter: its virus or boss is rare in the generic fights |
| Muscle Memory | 18 | script | Fire on a steady two-cycle rhythm | Everyone | any fight | -1.1 | -1.1 | the bots don't play its situation |
| Policy Engine | 18 | script | Lean on your blue and yellow rules | Everyone | any fight | -3.6 | -3.6 |  |
| Privacy Screen | 18 | shell | Beat viruses that copy your commands | Everyone | any fight | -0.1 | -0.1 | a counter: its virus or boss is rare in the generic fights |
| Rowhammer | 18 | exploit | Keep parts bare after you strip them, as a Breaker | Breaker | any fight | +3.1 | 0.0 | the bots don't play its situation |
| Shredder Routine | 18 | exploit | Hit parts once their armor is gone | Everyone | any fight | -1.0 | -1.0 |  |
| Sweetener | 18 | implant | Heal from the caches you take | Everyone | any fight | -0.5 | -0.5 | the bots don't play its situation |
| Stack Guard | 19 | proxy | Brace for the hit after a break | Everyone | any fight | -3.2 | -3.2 |  |
| Tail Call | 19 | exploit | Break parts while your burns run | Everyone | any fight | +3.7 | +3.7 | raised once; the bots rarely meet its condition |
| Ctrl-C | 20 | script | Answer a tell, then fire your big skill | Everyone | any fight | +0.9 | +0.9 |  |
| Quiet Wire | 20 | proxy | Break Tripwires without the alarm | Everyone | any fight | -0.5 | -0.5 | a counter: its virus or boss is rare in the generic fights |
| Sampler | 20 | script | Answer tells to hit harder for two cycles | Everyone | any fight | +0.6 | +0.6 |  |
| Static Discharge | 21 | exploit | Crit parts that have gone loud | Everyone | any fight | +0.4 | +0.4 | a counter: its virus or boss is rare in the generic fights |
| Calling Card | 22 | shell | Dodge more while you're below half | Everyone | starting at 45% Integrity | -3.2 | +0.7 |  |
| Hush Money | 22 | implant | Cut a compiled cast short | Everyone | any fight | +0.2 | +0.2 | a counter: its virus or boss is rare in the generic fights |
| No Rest | 22 | shell | Run a whole visit without resting | Everyone | unrested, starting at 65% Integrity | -2.9 | +1.6 | the bots don't play its situation |
| Slammer | 22 | script | Carry burns over to the next part, as a Payload | Payload | any fight | +1.6 | +4.2 |  |
| SWARMLINE Swarm Key | 22 | script | Catch more Sync Windows | Everyone | any fight | +4.0 | +4.0 | the bots don't play its situation |
| TOLLGATE Token | 22 | implant | Heal by cutting parts' moves | Everyone | any fight | -0.2 | -0.2 | the bots don't play its situation |
| Brood Tap | 23 | script | Heal by breaking fragments | Everyone | any fight | +0.9 | +0.9 | a counter: its virus or boss is rare in the generic fights |
| Changed Default | 24 | proxy | Bring helpers against fragment viruses | Everyone | any fight | +0.5 | +0.5 | a counter: its virus or boss is rare in the generic fights |
| GLASSJAW Sucker Punch | 24 | exploit | Crit parts before they attack | Everyone | any fight | -1.8 | -1.8 |  |
| Keyjam | 24 | exploit | Hit parts behind a lock or a ward | Everyone | any fight | +1.0 | +1.0 | a counter: its virus or boss is rare in the generic fights |
| Log4Shell | 24 | exploit | Break a part to hit a tell, as a Demolitionist | Demolitionist | any fight | -1.3 | +0.4 |  |
| Mass Reboot | 24 | script | Break parts to wipe out fragments | Everyone | any fight | +3.0 | +3.0 | a counter: its virus or boss is rare in the generic fights |
| Overdraft | 24 | proxy | Survive one killing hit a fight | Everyone | any fight | -2.4 | -2.4 |  |
| Pre-Authorization | 24 | script | Raise a shield, then hit | Everyone | any fight | +2.0 | +2.0 |  |
| Ring Main | 24 | proxy | Hold servers on the ring to harden | Everyone | on a server you hold | -3.4 | -1.8 | the bots don't play its situation |
| Sinkhole | 24 | exploit | Hit hard while any part winds up a tell | Everyone | any fight | -0.8 | -0.8 |  |
| Underwriter's Seal | 24 | proxy | Answer a big hit with a bigger heal or shield | Everyone | any fight | -3.3 | -3.3 |  |
| Black Ledger | 26 | implant | Crit more with every part you break | Everyone | any fight | +3.6 | +3.6 | raised once; the bots rarely meet its condition |
| Majority Attack | 26 | exploit | Wear several parts down below half | Everyone | any fight | +1.5 | +1.5 |  |
| Metronome | 26 | shell | Crit inside Sync Windows | Everyone | any fight | +2.7 | +2.7 | the bots don't play its situation |
| Quorum Sensor | 26 | proxy | Blunt the second hit in a cycle | Everyone | any fight | -0.3 | -0.3 |  |
| Spectre | 26 | shell | Cut a part's move, then hit it Open | Everyone | any fight | +6.5 | +6.5 | the bots don't play its situation |
| Bulletproof Host | 28 | proxy | Block hard while a tell winds up, as a Bastion | Bastion | any fight | -0.4 | -0.9 |  |
| Deadman's Switch | 28 | proxy | Jack out when your Integrity hits 0 | Everyone | any fight | -0.7 | -0.7 | the bots don't play its situation |
| Field Guide | 28 | exploit | Hunt strains | Everyone | any fight | -0.3 | -0.3 | the bots don't play its situation |
| Hold Music | 28 | proxy | Dodge while a tell winds up | Everyone | any fight | +1.7 | +1.7 |  |
| Installment | 28 | implant | Spread your hits across the parts | Everyone | any fight | -0.4 | -0.4 |  |
| Late Fee | 28 | exploit | Punish parts that patch their ◆ back | Everyone | any fight | +2.1 | +2.1 | the bots don't play its situation |
| Sapper | 28 | exploit | Hit armored parts harder | Everyone | any fight | 0.0 | 0.0 |  |
| Hidden Service | 30 | implant | Take a half hit every eight cycles | Everyone | any fight | -2.7 | -2.7 |  |
| Hot Reload | 30 | implant | Crit to fire that skill again, as an Overclocker | Overclocker | any fight | +2.4 | -1.0 |  |
| Kill Chain | 30 | implant | Break a part to open the next one | Everyone | any fight | -1.2 | -1.2 |  |
| Mixed Bag | 30 | script | Fight on servers with many specials | Everyone | any fight | +0.7 | +0.7 | the bots don't play its situation |
| Tail Circuit | 30 | exploit | Save big hits for even cycles | Everyone | any fight | +1.3 | +1.3 |  |
| Zero Cool | 30 | exploit | Answer a tell, then crit the Open part | Everyone | any fight | -0.3 | -0.3 |  |
| Antibody | 32 | exploit | Hit parts that heal | Everyone | any fight | +0.7 | +0.7 | a counter: its virus or boss is rare in the generic fights |
| Interrupt Vector | 32 | script | Answer tells to take ◆, as a Warden | Warden | any fight | -0.6 | -2.2 |  |
| Ouroboros Loop | 32 | shell | Speed up below half | Everyone | starting at 45% Integrity | +3.4 | +2.0 | raised once; the bots rarely meet its condition |
| Preempt | 32 | script | Crit parts winding up a tell | Everyone | any fight | -1.3 | -1.3 |  |
| Tourniquet | 32 | proxy | Fight viruses that siphon you | Everyone | any fight | +1.9 | +1.9 | a counter: its virus or boss is rare in the generic fights |
| Brute Force | 33 | exploit | Hit parts that still wear ◆ | Everyone | any fight | +3.8 | +3.8 | raised once; the bots rarely meet its condition |
| DKOM | 33 | script | Hit parts as they come back into reach | Everyone | any fight | +0.8 | +0.8 |  |
| Blue Pill | 34 | shell | Take tells at half | Everyone | any fight | -0.3 | -0.3 |  |
| Generator | 34 | implant | Keep hitting when your target slips out of reach | Everyone | any fight | +0.1 | +0.1 |  |
| Ring Minus One | 34 | implant | Hold a skill back, then fire it | Everyone | any fight | +0.7 | +0.7 | the bots don't play its situation |
| Syscall Table | 34 | script | Fire a different skill every cycle | Everyone | any fight | +1.3 | +1.3 |  |
| Takedown Notice | 34 | implant | Break fragments to bring skills back sooner | Everyone | any fight | +0.9 | +0.9 | a counter: its virus or boss is rare in the generic fights |
| UPS | 34 | shell | Take less in the first three cycles | Everyone | any fight | -0.4 | -0.4 |  |
| Pass the Hash | 35 | exploit | Chain crits from part to part | Everyone | any fight | +0.6 | +0.6 |  |
| Golden Ticket | 36 | implant | Open each fight with a double shield | Everyone | any fight | -0.1 | -0.1 |  |
| Load Path | 36 | exploit | Hit through ◆ as you strip it | Everyone | any fight | +0.1 | +0.1 |  |
| Notice Period | 36 | script | See a tell coming and fire sooner | Everyone | any fight | -0.4 | -0.4 |  |
| Pressure Relief | 36 | shell | Delay attacks to soften them | Everyone | any fight | +2.8 | +2.8 | the bots don't play its situation |
| Recovery Mode | 36 | script | Stay alive below half against big hits | Everyone | any fight | -0.2 | -0.2 |  |
| Sandman | 36 | shell | Shrug off what a landed tell leaves behind | Everyone | any fight | +1.8 | +1.8 | a counter: its virus or boss is rare in the generic fights |
| Superuser | 36 | implant | Fight on servers you hold | Everyone | on a server you hold | +1.2 | -0.6 | the bots don't play its situation |
| Rubber Hose | 38 | exploit | Answer every tell in a long fight | Everyone | any fight | +2.8 | +2.8 |  |
| Shellshock | 38 | exploit | Strip ◆ twice as fast, as a Breaker | Breaker | any fight | +3.5 | +3.1 | raised once; the bots rarely meet its condition |
| Drain Plug | 39 | shell | Halve the first big hit, as a Bastion | Bastion | any fight | -1.5 | -2.8 |  |
| Seawall | 39 | proxy | Stack Block as hits meet it, as a Bastion | Bastion | any fight | -1.7 | -2.1 |  |
| Undertow | 39 | exploit | Hit back at the part that just attacked | Everyone | any fight | +0.7 | +0.7 |  |
| Backwash | 40 | script | Keep helpers coming, as an Operator | Operator | any fight | -1.5 | -0.2 |  |
| Brine | 40 | script | Burn armored parts | Everyone | any fight | -0.6 | -0.6 |  |
| Culvert | 40 | implant | Carry a break's leftover damage on | Everyone | any fight | +2.9 | +2.9 |  |
| Headcount | 40 | proxy | Block more against many-part viruses | Everyone | any fight | -1.0 | -1.0 |  |
| Long Shot | 40 | implant | Stay above 75% and hit harder | Everyone | any fight | +2.2 | +2.2 |  |
| Low Tide | 40 | proxy | Build Stealth, as an Infiltrator | Infiltrator | any fight | -0.5 | -0.9 |  |
| Mirror Maze | 40 | proxy | Hit through a Decoy's bend | Everyone | any fight | -2.8 | -2.8 | a counter: its virus or boss is rare in the generic fights |
| Moral Hazard | 40 | exploit | Hit harder for every tell you take | Everyone | any fight | +0.5 | +0.5 |  |
| Reinsurance | 40 | proxy | Turn a huge hit into a shield | Everyone | any fight | -1.5 | -1.5 |  |
| Siltstone | 40 | implant | Turn your ◆ into Block | Everyone | any fight | +3.2 | +3.2 | raised once; the bots rarely meet its condition |
| Brackish | 41 | script | Burn parts below half, as an Infiltrator | Infiltrator | any fight | +0.4 | +0.8 |  |
| Breakwater | 41 | exploit | Hit harder from behind your shield, as a Bastion | Bastion | any fight | +4.5 | +1.5 | raised once; the bots rarely meet its condition |
| Depth Gauge | 41 | shell | Regen through long fights | Everyone | elites (long fights) | -1.9 | +0.4 |  |
| Floodgate | 41 | exploit | Break parts to crit, as a Breaker | Breaker | any fight | -0.2 | +1.4 |  |
| Mooring | 41 | implant | Never lose more than a third to one hit | Everyone | any fight | +1.3 | +1.3 |  |
| Sump Pump | 41 | shell | Heal more while you're below half, as a Bastion | Bastion | starting at 45% Integrity | -10.7 | 0.0 |  |
| Ballast | 42 | implant | Crit at full Momentum, as a Breaker | Breaker | any fight | 0.0 | +1.5 |  |
| Bottleneck | 42 | exploit | Jam a part, then hit it | Everyone | any fight | -1.8 | -1.8 |  |
| Deepwater | 42 | exploit | Crit armored parts harder | Everyone | any fight | -1.7 | -1.7 |  |
| Pressure Hull | 42 | shell | Block more behind a shield, as a Bastion | Bastion | any fight | +0.5 | -0.5 |  |
| Riprap | 42 | shell | Cut moves to hit harder, as a Breaker | Breaker | any fight | -1.8 | -1.3 | the bots don't play its situation |
| Riptide | 42 | proxy | Jam a part, then send helpers, as an Operator | Operator | any fight | +3.4 | +2.4 | raised once; the bots rarely meet its condition |
| Silt Map | 42 | script | Level by mapping servers | Everyone | any fight | +2.0 | +2.0 | the bots don't play its situation |
| Spawning Run | 42 | exploit | Hit harder with helpers, as an Operator | Operator | any fight | -1.3 | -1.5 |  |
| Tide Table | 42 | implant | Answer a tell to fire that skill again | Everyone | any fight | +0.3 | +0.3 |  |
| Anchor Chain | 43 | implant | Heal or shield bigger after each hit, as a Bastion | Bastion | any fight | -2.0 | +1.0 |  |
| Banked Fire | 43 | shell | Burn harder, as an Infiltrator | Infiltrator | any fight | +1.8 | +1.1 |  |
| Bilge | 43 | proxy | Burn parts to weaken their attacks, as an Infiltrator | Infiltrator | any fight | -2.9 | -0.4 |  |
| Ebb | 43 | script | Open each fight with a longer helper, as an Operator | Operator | any fight | +2.5 | +2.7 |  |
| Flotsam | 43 | shell | Regen more with every part you break | Everyone | any fight | -0.6 | -0.6 |  |
| Outfall | 43 | exploit | Use every skill once each fight | Everyone | any fight | -0.2 | -0.2 |  |
| Wake | 43 | exploit | Crit harder in a crew | Everyone | with two crewmates | +0.7 | 0.0 |  |
| Check Valve | 44 | proxy | Break parts that blow up | Everyone | any fight | +2.0 | +2.0 |  |
| Cofferdam | 44 | shell | Take less behind a shield, as a Bastion | Bastion | any fight | -0.6 | -0.5 |  |
| Pumphouse | 44 | proxy | Spend Momentum on big skills, as a Breaker | Breaker | any fight | +3.6 | +2.1 | raised once; the bots rarely meet its condition |
| Siphon Tube | 44 | script | Leech your way back from below half | Everyone | starting at 45% Integrity | -1.0 | -0.2 |  |
| Sounding Line | 44 | implant | Read Veiled parts and crit their tells, as an Infiltrator | Infiltrator | any fight | +2.4 | +0.7 | the bots don't play its situation |
| Spillway | 44 | exploit | Crit parts below half, as a Breaker | Breaker | any fight | +7.2 | +3.0 | raised once; the bots rarely meet its condition |
| Turbidity | 44 | proxy | Crit to make attacks come late, as an Infiltrator | Infiltrator | any fight | +1.5 | +1.3 |  |
| Weir | 44 | implant | Let a helper take the first hit, as an Operator | Operator | any fight | +0.2 | +1.2 |  |
| Bedframe | 45 | shell | Harden against tells that land, as a Bastion | Bastion | any fight | -1.7 | -3.3 |  |
| Bitrot Ward | 45 | proxy | Take a ◆ against the last part, as a Bastion | Bastion | any fight | -1.5 | -2.5 |  |
| Bootstrap | 45 | script | Crit with each skill's first use | Everyone | any fight | -0.6 | -0.6 |  |
| Init Vector | 45 | implant | Crit more as a fight runs long | Everyone | elites (long fights) | +6.7 | +2.4 | raised once; the bots rarely meet its condition |
| POST Code | 45 | exploit | Open each fight with a crit storm | Everyone | any fight | -2.3 | -2.3 |  |
| Relief Valve | 45 | shell | Cut moves to bring skills back, as an Operator | Operator | any fight | +0.3 | +0.2 | the bots don't play its situation |
| Rockfall | 45 | script | Break parts to push attacks back, as a Breaker | Breaker | any fight | -0.7 | +0.3 |  |
| Burn-In | 46 | proxy | Make burns tick at once, as an Infiltrator | Infiltrator | any fight | +0.6 | -0.1 |  |
| Firmware | 46 | implant | Break parts to speed up | Everyone | any fight | +2.3 | +2.3 |  |
| Fuse Map | 46 | exploit | Build Momentum fast, as a Breaker | Breaker | any fight | +1.5 | +0.4 |  |
| Read-Only | 46 | shell | Blunt the hit that drops you below half | Bastion | starting at 45% Integrity | -0.2 | -0.5 |  |
| Watchdog Timer | 46 | script | Keep a free helper coming, as an Operator | Operator | any fight | +1.1 | +1.9 |  |
| Bedrock Seal | 47 | proxy | Make your shields hold more, as a Bastion | Bastion | any fight | -3.2 | -1.5 |  |
| Bit Flip | 47 | exploit | Crit often, as an Infiltrator | Infiltrator | any fight | +1.0 | -0.2 |  |
| Brownout | 47 | shell | Survive below 25% | Everyone | starting at 45% Integrity | -9.4 | -2.0 |  |
| Bus Fault | 47 | implant | Jam parts to delay them too, as an Operator | Operator | any fight | -1.4 | +0.9 |  |
| Cutoff Wall | 47 | script | Cut moves to shield up, as a Bastion | Bastion | any fight | +2.0 | +1.2 | the bots don't play its situation |
| Golden Image | 47 | script | Farm credits from caches | Everyone | any fight | +1.8 | +1.8 | the bots don't play its situation |
| Bench Mark | 48 | implant | Tag parts and crit them, as an Infiltrator | Infiltrator | any fight | +1.1 | +0.8 |  |
| Cold Iron | 48 | shell | Block burns and encryption, as a Bastion | Bastion | any fight | -1.7 | -2.9 |  |
| Dead Reckoning | 48 | proxy | Hit each part through its ◆, as an Infiltrator | Infiltrator | any fight | -2.1 | -3.0 |  |
| Flue | 48 | proxy | Shield up as your burns tick | Everyone | any fight | -0.4 | -0.4 |  |
| Last Known Good | 48 | script | Rewind one disaster a fight | Everyone | starting at 45% Integrity | -5.5 | -2.2 |  |
| Last Mile | 48 | proxy | Fight viruses with many parts | Everyone | any fight | -1.7 | -1.7 | the bots don't play its situation |
| Microcode | 48 | implant | Speed up your shortest cooldown | Everyone | any fight | -0.3 | -0.3 |  |
| Wire Wrap | 48 | exploit | Fill Momentum to hit every part, as a Breaker | Breaker | any fight | -0.8 | -1.4 |  |
| Clock Tree | 49 | script | Start every fight with Clock Speed half full | Everyone | any fight | +1.0 | +1.0 |  |
| Ground Plane | 49 | implant | Turn hits on you into crits | Everyone | any fight | +0.2 | +0.2 |  |
| Load Order | 49 | script | Make helpers hit as they arrive, as an Operator | Operator | any fight | -4.3 | -0.3 |  |
| Quarry | 49 | exploit | Finish the last part | Everyone | any fight | -1.1 | -1.1 |  |
| Strata | 49 | shell | Harden as you drop, as a Bastion | Bastion | starting at 45% Integrity | -11.7 | -1.7 |  |
| Undervolt | 49 | proxy | Hold Momentum safely, as a Breaker | Breaker | any fight | +0.8 | -0.3 |  |
| Keystone | 50 | implant | Wear several sets at once | Everyone | any fight | +1.0 | +1.0 | the bots don't play its situation |
| Root of Trust | 50 | exploit | Crit to hit harder for a while | Everyone | any fight | -1.3 | -1.3 |  |
| Signal Floor | 50 | proxy | Dodge while you're below 25% | Everyone | starting at 45% Integrity | -0.4 | -1.1 |  |
| Warm Reset | 50 | shell | Start every fight shielded, as a Bastion | Bastion | any fight | -1.4 | -2.8 |  |

## What changed (November 2026)

- **Two secondary stats on every unique.** The 77 that had none (most below level 27) carry two, sized by level as the
  deep uniques' are and picked to fit the effect: crit for crit pieces, Payload for burns and helpers, Block or Regen for
  defence. Owned copies keep the stats they dropped with; new drops carry them.
- **Must-wears trimmed:** DuckyScript, Crown Packet, Hop Limit, Stack Guard, Watchdog Whitelist, Underwriter's Seal,
  Foreman's Lanyard, Policy Engine, Bedframe, Hidden Service, Cold Iron; Squatter's Rights' ◆ fades after 4 cycles.
- **Weak niches raised:** Leech Hook, Tripwire, Brute Force, Black Ledger, Siltstone, Culvert, Rubber Hose, Thermal Paste,
  Swarm Intelligence, Slow Drip, Breakwater, Ebb, Spillway, Pumphouse, Riptide, Init Vector, Shade Filter, Ouroboros
  Loop, and the class skills' uniques (Hot Patch, Fork Handle, IRQ Line).
