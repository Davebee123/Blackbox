# Solo tells: the designer's review sheet

Every virus that fights you alone now announces its big moves. A part winds up, the log says what is coming and when, and a chip sits on that part's row in the column where the move lands. The player has two or three cycles to answer it. Crew bosses keep their own mechanics (raid.mjs and docs/bosses.md). This sheet covers everything else: wild viruses, strains, guards and ICE, elites, champion invasions, home intrusions and the solo bosses. The code is in dist/tells.mjs, and the numbers are in `TELL`, `TELLS` and `TELL_SETS` in dist/data.mjs.

## How a tell plays

A tell is announced once in the log, for example *The Encryptor winds up FULL DISK. It lands in 2 cycles. Hit it once before then to stop it, or brace for it.* From then on its chip sits on the part's row. The chip has a kicker line (*CHARGING*, *COMPILING…*, *SEALING*, *MIMIC*), the move's name, what it does, and an amber last line that says what answers it: *hit it once*, *SIGINT, or hit ×2*, *strip ◆3* or *go quiet*. A veiled part's tell shows anyway, because nothing lands unannounced. Breaking a tell's part always stops the tell.

The tell picks its part when it is announced. It goes to the part nothing has hit for the longest time that can do the move, and the signature part wins a tie. While you work on the Encryptor, the Pulse Node winds up. On the signature part the move has the family's own name (Full Disk, Mass Mailer, Possession). On any other part it is called Overcharge.

There are four kinds.

| Kind | What it is | What answers it | What ignoring it costs |
|---|---|---|---|
| Charge | The part's next attack, made much bigger. It takes the place of that attack in its column, so you never get both. | Hit the part with a command before it lands. Any command that damages the part or breaks a ◆ on it counts once. Burns and helpers don't count. One hit is enough, or two for an elite or a boss. A charge that is called off knocks its plain attack back a cycle. You can also soften it with a ◆, a shield, Null Route, Throttle, Rate Limit, Brace or Block. | The plain hit times 2 to 2.4, but the extra is capped at a tenth of your max at levels 1 to 5 and about a sixth from level 10. One hit never takes more than 55% of your max. Charges never crit. |
| Cast | *Compiling…*: a buff on the whole virus that lasts 4 cycles. Casts start at level 10, when you get SIGINT. | SIGINT, two command hits on the part, or breaking the part. | Double Extortion makes every attack 35% harder. Persistence and Call Home make every attack repeat a cycle faster, but what is already on the board stays put. Self-Update gives every part a quarter more Integrity. |
| Seal | The part re-arms if it still wears ◆ when the seal lands. Seals start at level 6. | Strip the part first. | The part goes back to full ◆ with one more for the rest of the fight, and every part you had stripped gets a ◆ back. |
| Mimic | The Mimic part records you. On its beat (every 4 cycles from cycle 3) it plays back whatever command you fire that cycle. | Fire something with no direct hit on the beat: a debuff, a strip (Crack has no hit in it), a burn, a helper or a shield. | Your command's whole direct hit comes back at you, softened like any other hit. |

## By level

The tiers mirror raid.mjs: gentle while you have three skills, richer from 10 when SIGINT arrives, full from 17.

| Levels | Tells a wild virus brings | Warning | Charge size (the extra over the plain hit, at most) |
|---|---|---|---|
| 1–5 | One, its charge | 3 cycles | ×2, up to 10% of your max |
| 6–9 | One, its charge | 2 cycles | ×2.2, up to 14% |
| 10–16 | Two, its charge and its cast | 2 cycles | ×2.4, up to 18% |
| 17+ | Two, its charge and its cast | 2 cycles | ×2.3, up to 17% |

- **Elites** bring one more tell, their family's seal (from level 6). Their charges can cost 15% more and need two hits to call off.
- **Solo bosses** (RELAY-KING, REPO MAN, HOLLOW CHOIR, the Residents) bring every tell open at their level. Their charges need two hits and can cost 10% more.
- **Champion invasions** are elite-grade but sized for one player. They bring the usual tells for their level, and their charges are a tenth bigger. They don't get the elite's extra seal.
- **SPRAWL-00's first two kills**, while its hits land at 60%, bring no tells. The first fights after that bring one charge with three cycles of warning. The tutorial is parked, so it has no tells to tune.
- **Below level 10**, every tell can be answered with skills the player already has: Spike or any damage skill calls a charge off, and Harden softens one. Casts only appear once SIGINT does.

## Every tell, by family

The warning is 3 cycles at levels 1 to 5 and 2 cycles from level 6. A cast is first announced on cycle 4 and comes every 7 cycles. A seal is first announced on cycle 5 and comes every 7. A charge is first announced on cycle 2 and comes every 6.

The last column gives what one landing cost in the sim, plain hit included, as a share of the player's max Signal. It comes from 4 classes × 18 wild fights per family plus the guards, played by a bot that ignores tells (balance.mjs fights, gear and services; scratch numbers, not a test). The extra over the plain hit is capped as in the table above.

### Home families

| Family | Tell | Kind | Opens | What it does | Answer | One landing cost (Lv 4 / 12 / 20) |
|---|---|---|---|---|---|---|
| Ransomware | **Full Disk** | Charge | 1 | Its Encrypt, much bigger, plus a burst of encryption on top for 3 cycles (up to 3–5% of your max a cycle) | Hit the Encryptor once. Purge, Scrub, Rollback or breaking the Encryptor clears the burst | – / 15% / 13% |
| Ransomware | **Double Extortion** | Cast | 10 | Every attack hits 35% harder for 4 cycles | SIGINT, or hit the part twice | Indirect: four cycles of harder hits |
| Ransomware | **Key Rotation** | Seal | 6 (elites) | The part re-arms with one ◆ more, and stripped parts get a ◆ back | Strip it first | Lost strip work |
| Worm | **Mass Mailer** | Charge | 1 | A Replicate that hatches two fragments (within the fragment limit) | Hit the Replicator once | 13% / 14% / 8% |
| Worm | **Self-Update** | Cast | 10 | Every part grows a quarter more Integrity, for good | SIGINT, or hit the part twice | A longer fight |
| Worm | **Resync** | Seal | 6 (elites) | As Key Rotation | Strip it first | Lost strip work |
| Ghostroot | **Possession** | Charge | 1 | Its Scramble, plus two more cycles of scrambling (Scrub cleanses it) | Hit the Scrambler once | 21% / 10% / 4% |
| Ghostroot | **Persistence** | Cast | 10 | Every attack repeats a cycle faster for 4 cycles. What is already on the board doesn't move | SIGINT, or hit the part twice | Indirect: about one extra attack |
| Ghostroot | **Go Dark** | Seal | 6 (elites) | As Key Rotation | Strip it first | Lost strip work |
| Any family | **Overcharge** | Charge | 1 | The family's charge, when it lands on a part that isn't the signature one: that part's next attack, bigger | Hit that part once | Included in the rows above |
| Ghostroot (Mimic part) | **Mimic** | Mimic | 8 | Plays your command's direct hit back at you on its beat | Go quiet on the beat | 11% / 13% ignoring, 1% reading |

The Full Disk shows a dash at level 4 because the sampled ransomware fights all answered it, even the ignoring bot, by hitting the Encryptor anyway. A Possession at level 4 costs a lot because a scrambled level-4 player hits itself.

### Strains

A strain brings a charge of its own on its rule's part, plus its lineage's cast and seal. The strain charge follows the charge rules above, so it adds at most the tier's cap on top of the move it rides.

| Strain | Tell | On | What it does |
|---|---|---|---|
| Keylogger | **Keystorm** | Logger | Its Dump, much bigger |
| Hashrat | **Overcharge** | Pulse Node (the Miner's Overclock is too small to carry one) | A bigger Surge |
| Floodgate | **Deluge** | Flooder | A Flood far bigger than the ramp. The ramp goes on from there |
| Leech | **Gorge** | Tap | A bigger Siphon, which also heals more |
| Sleeper | **Wake-up Call** | Cell | A bigger Alarm |
| Patchwork | **Hotfix** | Patcher | A Patch that heals far more |
| Flicker | **Blink** | Shade | A bigger Fade |
| Extortion | **Overcharge** | Pulse Node (the Demand already has its own Deadline wind-up) | A bigger Surge |
| Echo | **Feedback** | Echo | A bigger Reverb, which echoes too |
| Bricker | **Brick Wall** | Locker | A bigger Brick |
| Overrun | **Swarm** | Hive | A Swarm that spawns two fragments |

### Guards and ICE

| Guard | Tell | Kind | What it does | One landing cost (Lv 4 / 12 / 20) |
|---|---|---|---|---|
| Watchdog, Tracer | **Lock-on** | Charge | Its attack, much bigger | 46% / – / – (answered every time at 12 and 20) |
| Crawler | **Infest** | Charge | Its spawn, hatching two | Always answered in the sample |
| Shredder | **Deep Shred** | Charge | Its attack, bigger, and it shreds the newest code or credits file in your pack (never a protocol or a blueprint) | 35% / – / – |
| Bouncer | **Battering Ram** | Charge | Its Gate's attack, much bigger | 38% / 33% / 9% |
| Sentinel | **Blacklist** | Seal | As Key Rotation, from cycle 3 | Lost strip work |
| Every guard | **Call Home** | Cast (from 10) | As Persistence | Indirect |

A guard sits two levels above you per layer, so its plain hit is already large at low levels. That is why one Lock-on landing at level 4 can cost close to half your Signal, even though the charge only adds a tenth of your max on top.

## Parts that change the fight

A wild virus picks its third part from its family's pool, using its seed. Each pool part opens at a level. Bosses always take the classic part (Lockbox, Mirror or Decoy), so their fights read as before. The new parts in the pools are the Mutex, the Tripwire, the C2 Node and the Mimic.

| Part | Family | Opens | Stats | What it does | How to play it |
|---|---|---|---|---|---|
| Lockbox (existing) | Ransomware | 3 | 16, no ◆, no attack | While it lives, the Encryptor loses at most a quarter of its max a cycle | Break it first, or chip under the cap |
| **Mutex** (new) | Ransomware | 8 | 18, ◆, no attack | Shields its neighbour. The Encryptor wears a lock worth a quarter of its max that soaks hits first. Once the lock breaks it comes back to full 4 cycles later, for as long as the Mutex lives | Break the Mutex and the lock goes with it, or burst the Encryptor through one lock |
| **Tripwire** (new) | Ransomware | 20 | 18, ◆, Ping 3 every 3 | Enrages the others when it dies. If you break it while the Pulse Node or Encryptor lives, they go loud for the rest of the fight: 25% harder, and every attack a cycle sooner | Leave it for last. Its Ping is small on purpose |
| Mirror (existing) | Worm | 3 | 18, ◆, Splice 3 every 4 | Twinned with the Replicator: break one alone and the other reboots once | Break both close together |
| **C2 Node** (new) | Worm | 8 | 18, ◆, Beacon 3 every 4 | Commands the fragments. While it lives they gnaw 50% harder. Break it and every fragment drops with it | Kill it once two or more fragments are up |
| Decoy (existing) | Ghostroot | 4 | 18, ◆, veiled | On every 4th cycle it mirrors your commands: they do nothing, and 30% bounces back | Don't fire into its beat, or break it |
| **Mimic** (new) | Ghostroot | 8 | 18, ◆, veiled, no attack | Copies your last skill. It records you and on its beat plays your command's direct hit back at you. Its beat is always on the board, even while veiled | Go quiet on the beat, or break it |

The board tags these parts: *lock N* and *relocks in N* on the Encryptor, *tripwire* and then *loud* on the others, *commands fragments* on the C2 Node, and the Mimic's beat chip. The part's hover text says the rule in a sentence.

## SIGINT in solo fights

SIGINT (key 9, from level 10) answers a solo cast as well as a crew boss's. It costs your command for the cycle, and it answers nothing but a cast. To keep it from being too strong, an interrupted cast comes back two cycles sooner than it would have. Casts come every 7 cycles and SIGINT is ready every 8, so it can stop at most every other cast. The other cast you hit off with two command hits, eat, or stop by killing the part. Charges and seals never accept SIGINT. They are answered by playing the board.

## The bots

The planner reads tells (planner.mjs, with `tellMove` in tells.mjs).

- **Charges.** A cycle before the last chance, the bot hits the charging part, but only if what the charge adds is worth a command. The threshold is 6% of max, or 14% if its planned command would set up a burn or helpers. It skips the answer when something bigger is about to land.
- **Casts.** It fires SIGINT on the cycle the cast lands, when the buff is worth a command.
- **The Mimic.** On the Mimic's beat it fires something quiet if its planned hit would come back hard.
- **Seals.** It strips a part about to seal when one command does it.
- **Never overridden.** None of that overrides a kill or a hit the bot is softening.
- **Parts.** The planner leaves a Tripwire for last, breaks the Mutex or bursts through the lock, and goes for the C2 Node once fragments are up.

`TELL.bots.answer = false` makes a bot that plays as if it can't see the tells. balance.test.mjs runs it on the class-balance fights for every subclass and checks that it does worse.

| Bracket | Reading (Signal lost, average of 8 subclasses) | Ignoring | Gap |
|---|---:|---:|---:|
| Lv 10 | 37% | 43% | 6.6 |
| Lv 18 | 37% | 40% | 2.9 |
| Lv 30 | 38% | 41% | 2.9 |

Across the three brackets the ignoring bot loses 4.1 points more Signal a fight on average, and it wins 549 fights against the reading bot's 564 (of 576). The test holds the gap at 2.5 points or more on average, at least 1.5 in each bracket, and the reader never wins fewer fights. That is smaller than a crew boss's role checks on purpose. There, a missed role loses most tries. Solo, the tells are about learning the mob. On a wider sample (the gapq scratch run) the gap is about 0 at level 1, 1.5 at 5, 3.7 at 8, 4.7 at 10, 3.2 at 18 and 2.5 at 30. docs/BALANCE.md has the per-subclass table.

## Flood and the Breaker

Flood's cooldown went from 4 to 6. On its own that pushed the level-10 Breaker from 47% to 50% lost with fewer wins (21 of 24). The retune is in Crack, not in Flood. Crack's cooldown went from 3 to 2, so the Breaker strips armor more often and its Overload and Exploit land on bare parts sooner. Overload at 45 and an Exploit that strips a ◆ were both tried and changed nothing measurable, so both were dropped. Crack opens at level 10, so at levels 8 and 9 nothing makes up for the slower Flood. The level-8 Breaker loses 40% instead of 34%, which is still under the 55% ceiling the class tests hold.

| Level | Before (Flood 4, no tells) | After (Flood 6, Crack 2, tells) |
|---|---|---|
| 8 (Breaker) | 34% · 24/24 | 40% · 23/24 |
| 10 Demolitionist | 47% · 23/24 | 35% · 22/24 |
| 10 Overclocker | 48% · 21/24 | 41% · 23/24 |
| 12 Demolitionist | 52% · 21/24 | 44% · 22/24 |
| 12 Overclocker | 47% · 23/24 | 36% · 23/24 |
| 14 Demolitionist | 47% · 21/24 | 38% · 23/24 |
| 14 Overclocker | 45% · 22/24 | 39% · 23/24 |
| 16 Demolitionist | 56% · 22/24 | 55% · 22/24 |
| 16 Overclocker | 45% · 24/24 | 36% · 22/24 |

## Open questions for the designer

1. **The knock-back.** A charge that is called off also knocks its plain attack back a cycle. Players who read tells therefore come out a little ahead of a fight with no tells, most of all a class that hits every part at once. At level 10 with tells off, the Demolitionist loses 49% and the Phantom 37%. With tells on and read, they lose 35% and 29%. At 18 and 30 the difference is within 1–3 points. With no knock-back (`TELL.knock = 0`), a called-off charge just becomes the plain attack. The level-10 Breaker would then sit near 49%, and Crack 2 alone would not hold it in the band. An earlier version cancelled the attack outright, which pushed readers under the 25% floor.
2. **Area hits answer everything.** One command that damages every part counts as a hit on each, so Fork Bomb or Shatter call off whatever is charging. The ignoring Demolitionist still answers most charges by accident. Is that a strength the class should keep?
3. **SIGINT's price.** SIGINT stops at most every other cast, and it costs the command. Should a stopped cast come back only a cycle sooner, so that SIGINT can stop more of them?
4. **Seals.** Wild viruses never seal, even from level 17. Only elites, solo bosses and the Sentinel do. Should wild viruses at 17+ add the seal as a third tell?
5. **Possession** is a plain Scramble hit with two more cycles of scrambling, not a bigger hit. A bigger hit stacked on the self-hit chance was too much at low levels.
6. **Deep Shred** destroys a file in the pack: the newest code or credits file, never a protocol or a blueprint. Is losing loot to a guard all right?
7. **Persistence** never moves an attack that is already on the board. An earlier version did, and it broke the hard slice for the Sysop.
8. **The level-16 Demolitionist** sits at 55% (it was 56% before this change). It is outside every test bracket.
9. **Champions at level 14** lose 51–75% of their Signal with tells, against 48–83% without. That is above the 25–50% target with or without tells, and it comes from the invasion rework. Champions at level 10 lose 28–59% and at 18 lose 38–55%.
10. **Saves.** Tell state lives on the fight's virus and is gone when the fight ends. The new part flags default to off. Nothing in a save changed shape, so SAVE_VERSION stays at 33.
