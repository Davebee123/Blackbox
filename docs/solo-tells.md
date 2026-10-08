# Solo tells: the designer's review sheet

Every virus that fights you alone announces its big moves. A part winds up, the log says what is coming and when, and a chip sits on that part's row in the column where the move lands. Crew bosses keep their own mechanics (raid.mjs and docs/bosses.md). This sheet covers everything else: wild viruses, strains, guards and ICE, elites, champion invasions, home intrusions and the solo bosses. The code is in dist/tells.mjs, and the numbers are in `TELL`, `TELLS` and `TELL_SETS` in dist/data.mjs.

## How a tell plays

A tell is announced once in the log, for example *The Replicator charges its Replicate into MASS MAILER. It lands in 3 cycles. Hit the Replicator once with a command before then to call it off.* From then on its chip sits on the part's row. The chip has a kicker line (*Charged*, *Compiling…*, *Sealing*, *Mimic*), the move's name, what it does, and an amber last line that says exactly what counts as an answer: *hit it*, *hit it ×2*, *SIGINT or hit ×2*, *strip ◆2*, *strip it* or *go quiet*. Hovering the chip gives the whole rule, what reading it pays, and what it leaves behind if it lands. A veiled part's tell shows anyway. Breaking a tell's part always stops the tell.

### One clock

A tell never runs on a timer of its own.

- **A charge powers up an attack that is already on the board.** The attack's cell turns into the charge at least two cycles before it lands (three at levels 1 to 5), and it lands exactly when the attack was due. If you delay the attack with Rate Limit, Suspend or Jam, the charge moves with it. A charge rides one landing of its part's attack, so a called-off charge doesn't come back on the next one.
- **A cast or a seal gets its own cell** on its part's row, two cycles ahead or more.
- **No pile-ups.** A charge never lands on the same cycle as another part's heavy attack, or on the Mimic's beat. Below level 17 one tell is live at a time. From 17 two can be live, and never on the same cycle.

### A fixed part

Each tell sits on one part, always the same for its family, guard or strain, and the chip and the codex name it. A family's charge, cast and seal sit on its signature part (the Encryptor, the Replicator, the Scrambler). Overcharge, the second charge from level 17, sits on the plain attacker (the Pulse Node). A strain's charge sits on its rule's part. The Mimic's beat belongs to the Mimic, and the seals sit on the armored signature part. An earlier version picked the part nothing had hit for longest, which players couldn't plan for.

### Only deliberate answers count

A command of yours aimed at the tell's part, typed after the tell was said, counts. These don't, though they still do their damage:

- area hits (Fork Bomb, Shatter, Chain Reaction, Logic Bomb's spread),
- burns and helpers,
- a crewmate's splash and Overkill spills,
- your auto-repeat Spike, and daemons.

A skill that hits for you later counts as the command you typed: Thermal Runaway's ticks, Kill Switch's cash-in on each part, Reroute's arrivals, IRQ Storm's ticks. Each command counts once, except Overvolt (two hits). Double Tap and Spectre make each command count twice.

Some skills are built for a kind of tell and answer it outright when they land on its part:

| Kind | Built answers |
|---|---|
| Charge | Suspend and Spoofed ACK drain it, Jam makes it land plain, Hijack lands it on another part, Blackhole swallows it, Segfault crashes it for three times the hit, Replay plays it back at its charged size, Kill Switch and IRQ Storm count as your hit |
| Cast | SIGINT, Quarantine, Overvolt, Thermal Runaway, Hijack (it compiles for you), Reroute, Kill Switch, IRQ Storm |
| Seal | Any strip before it lands, Bit Rot (it fails even with ◆ on), Cache Poison (it fails and hits the part for 30) |
| Mimic | Anything with no direct hit: a debuff, a strip, a burn, a helper, a shield, hold. Log Wipe leaves its next beat nothing to play |

### Reading pays

- **Open.** A charge, a cast or the Mimic's beat answered by a read leaves its part Open: it takes 50% more from everyone for 2 cycles. The log says *READ: the Replicator is open.* and the part flashes.
- **A ready key.** A seal stopped by a strip readies the skill that did it.
- **XP.** Each read adds a tenth of the kill's XP to the kill, up to 40%: *Read 3 tells: +42 XP.*
- **Loot.** Read every tell in a fight (two or more said, none landed) and its loot rolls once more.
- **Gear.** Uniques and rules that fire on calling off a tell (Ctrl-C, Interrupt Vector, Abort Handler, Exception Handler) fire on every read.

### Ignoring hurts

From level 10 a charge can add a quarter of your max on top of the plain hit, and a charge or a cast that gets through leaves something behind:

- **Offline.** The last skill you used (not Spike or SIGINT) is knocked offline for 2 cycles (1 at levels 6 to 9). Its key says *OFFLINE*.
- **Corrupted.** You lose 4% of your max a cycle for 3 cycles (2% at 6 to 9, 5% from 17). Purge, Scrub or Rollback cleanses it.
- **Hung.** From level 10 your next command doesn't fire.
- **A seal** that lands while its part wears ◆ also takes your own ◆ and shield, from level 6.

Nothing one-shots. One hit never takes more than half your max, or the plain hit if that is bigger. Levels 1 to 5 have no after-effects.

## The kinds

| Kind | What it is | What answers it | What ignoring it costs |
|---|---|---|---|
| Charge | The part's next scheduled attack, made much bigger, in that attack's cell. | One command hit on the part before it lands, two for an elite or a boss. The Battering Ram asks for ◆2 off its Gate. A built answer. Called off, the attack still lands, plain. You can also soften it: a ◆, a shield, Brace, Bulkhead, Throttle, Heartbeat. | ×2 to ×3 the plain hit, the extra capped by level (table below). Charges never crit. Then the after-effects. |
| Cast | *Compiling…*: a buff on the whole virus for 4 cycles. From level 10, when you get SIGINT. | SIGINT, two command hits on the part, a built answer, or breaking the part. | Double Extortion makes every attack 35% harder. Persistence and Call Home make every attack repeat a cycle faster (what is already on the board stays put). Self-Update gives every part a quarter more Integrity. Then the after-effects. |
| Seal | The part re-arms if it still wears ◆ when the seal lands. From level 6, on elites, bosses and the Sentinel. | Strip the part first, or Bit Rot or Cache Poison it. | The part goes back to full ◆ with one more for the rest of the fight, every part you had stripped gets a ◆ back, your own ◆ and shield go, and you are Corrupted. |
| Mimic | The Mimic part records you. On its beat (every 4 cycles from cycle 3) it plays back whatever command you fire that cycle. | Go quiet on the beat. | Your command's whole direct hit comes back at you. |

## By level

| Levels | Tells a wild virus brings | Live at once | Warning | Charge (the extra over the plain hit, at most) | After-effects |
|---|---|---|---|---|---|
| 1–5 | One, its charge | 1 | 3 cycles | ×2, 10% of your max | None |
| 6–9 | One, its charge | 1 | 2 cycles | ×2.3, 15% | Offline 1 cycle, Corrupted 2% |
| 10–16 | Two, its charge and its cast | 1 | 2 cycles | ×2.8, 25% | Offline 2, Corrupted 4%, Hung |
| 17+ | Three, adding Overcharge on its other attacker | 2 | 2 cycles | ×3, 25% | Offline 2, Corrupted 5%, Hung |

- **Elites** bring one more tell, their family's seal (from level 6). Their charges can cost 15% more and need two hits to call off.
- **Solo bosses** (RELAY-KING, REPO MAN, HOLLOW CHOIR, the Residents) bring every tell open at their level. Their charges need two hits and can cost 10% more.
- **Champion invasions** bring the usual tells for their level, and their charges are a tenth bigger.
- **SPRAWL-00's first two kills**, while its hits land at 60%, bring no tells.
- **Timing.** The first tell lands on cycle 3 at the soonest. After a tell lands or is answered, the next of its kind may land 4 cycles on (a charge) or 7 (a cast or a seal), plus a seeded 0 to 2.

## Every tell, by family

### Home families

| Family | Tell | Kind | On | Opens | What it does | Answer |
|---|---|---|---|---|---|---|
| Ransomware | **Full Disk** | Charge | Encryptor | 1 | Its Encrypt, much bigger, plus a burst of encryption on top for 3 cycles | Hit the Encryptor. Purge, Scrub, Rollback or breaking the Encryptor clears the burst |
| Ransomware | **Double Extortion** | Cast | Encryptor | 10 | Every attack hits 35% harder for 4 cycles | SIGINT, or hit the Encryptor twice |
| Ransomware | **Overcharge** | Charge | Pulse Node | 17 | Its Surge, much bigger | Hit the Pulse Node |
| Ransomware | **Key Rotation** | Seal | Encryptor | 6 (elites) | The part re-arms with one ◆ more, and stripped parts get a ◆ back | Strip it first |
| Worm | **Mass Mailer** | Charge | Replicator | 1 | A Replicate that hatches two fragments (within the limit) | Hit the Replicator. A Warden's DMZ makes the spawns fizzle |
| Worm | **Self-Update** | Cast | Replicator | 10 | Every part grows a quarter more Integrity, for good | SIGINT, or hit the Replicator twice |
| Worm | **Overcharge** | Charge | Pulse Node | 17 | Its Surge, much bigger | Hit the Pulse Node |
| Worm | **Resync** | Seal | Replicator | 6 (elites) | As Key Rotation | Strip it first |
| Ghostroot | **Possession** | Charge | Scrambler | 1 | Its Scramble, plus two more cycles of scrambling (Scrub cleanses it) | Hit the Scrambler |
| Ghostroot | **Persistence** | Cast | Scrambler | 10 | Every attack repeats a cycle faster for 4 cycles | SIGINT, or hit the Scrambler twice |
| Ghostroot | **Overcharge** | Charge | Pulse Node | 17 | Its Surge, much bigger | Hit the Pulse Node |
| Ghostroot | **Go Dark** | Seal | Scrambler | 6 (elites) | As Key Rotation | Strip it first |
| Ghostroot (Mimic part) | **Mimic** | Mimic | Mimic | 8 | Plays your command's direct hit back at you on its beat | Go quiet on the beat |

### Strains

A strain brings a charge of its own on its rule's part, plus its lineage's cast and seal. The strain charge follows the charge rules above: it powers up that part's next scheduled move, and it adds at most the tier's cap on top.

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

| Guard | Tell | Kind | What it does |
|---|---|---|---|
| Watchdog, Tracer | **Lock-on** | Charge | Its attack, much bigger |
| Crawler | **Infest** | Charge | Its spawn, hatching two |
| Shredder | **Deep Shred** | Charge | Its attack, bigger, and it shreds the newest code or credits file in your pack (never a protocol or a blueprint) |
| Bouncer | **Battering Ram** | Charge | Its Gate's attack, much bigger. Strip ◆2 off the Gate to call it off |
| Sentinel | **Blacklist** | Seal | As Key Rotation, from cycle 3 |
| Every guard | **Call Home** | Cast (from 10) | As Persistence |
| Watchdog, Crawler, Shredder, Tracer | **Overcharge** | Charge (from 17) | Its other attacker's hit, much bigger |

A guard sits two levels above you per layer, so its plain hit is already large at low levels.

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

SIGINT moved to the - key, so it keeps the same key all game. It answers a solo cast as well as a crew boss's, at the price of your command for the cycle, and a cast is the only tell it answers. An interrupted solo cast no longer comes back sooner. SIGINT is ready every 8 cycles and casts come about every 7, so a class with a skill built for casts (Quarantine, Overvolt, Thermal Runaway, Hijack, Reroute) keeps SIGINT for the next one. Charges and seals never accept SIGINT.

## The bots

The planner reads tells (planner.mjs, `tellMove` in tells.mjs, and each subclass's planner in dist/classes).

- **Charges.** On a charge's last chance the bot answers it when what it adds and leaves behind is worth a command, with a skill built for it when it has one, and with a plain hit on the part otherwise. A big charge landing now wins over a small kill.
- **Casts.** It answers with its own built skill first, then SIGINT, then two hits.
- **The Mimic.** On the Mimic's beat it fires something quiet if its planned hit would come back.
- **Seals.** It strips a part about to seal when one or two commands do it, and Bit Rots or Poisons one it can't strip.
- **Parts.** The planner leaves a Tripwire for last, breaks the Mutex or bursts through the lock, goes for the C2 Node once fragments are up, and focuses a part it left Open.

`TELL.bots.answer = false` makes a bot that plays as if it can't see the tells. balance.test.mjs runs it on the class-balance fights for every subclass.

| Bracket | Reading (Signal lost, average of 8 subclasses) | Ignoring | Gap before this pass | Gap now |
|---|---:|---:|---:|---:|
| Lv 10 | 36% | 54% | 6.6 | 18.0 |
| Lv 18 | 36% | 49% | 2.9 | 12.9 |
| Lv 30 | 35% | 43% | 2.9 | 7.6 |

Across the three brackets the ignoring bot now loses 12.8 points more Signal a fight on average, and it wins 503 of 576 fights against the reading bot's 557. Below level 10 the gap is about 1 point at levels 3 and 5 and 9 at level 8. The test holds the gap at 12 points or more on average from level 10, at least 6 in each bracket, the ignoring bot winning fewer fights, and a gap below 10 that is there but smaller. At Lv 30 fights are short (5 to 8 cycles), so fewer tells get said. The Herder (1.4) and the Demolitionist (3.6) are the ones a Lv 30 fight barely tests, because their helpers and area hits break the telling part before most tells land. The Lv 10 Payload is the other end: ignoring tells costs it 39 points and 8 fights, because its burns leave parts alive long enough for every tell to land. docs/skills.md has the per-subclass table.

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

1. **No knock-back.** A called-off charge now leaves its attack to land plain, on time. The old knock-back (the plain attack a cycle later) let readers come out ahead of a fight with no tells.
2. **Area hits don't answer.** Fork Bomb, Shatter and the like no longer call off tells. The Demolitionist has to aim at the charging part like everyone else.
3. **SIGINT's price.** An interrupted solo cast no longer comes back two cycles sooner. With casts every 7 or so and SIGINT every 8, SIGINT still can't stop every cast alone.
4. **Overcharge from 17.** Wild viruses at 17+ bring a second charge on their plain attacker instead of a seal. Seals stay with elites, bosses and the Sentinel.
5. **After-effects.** Offline, Corrupted and Hung are what makes ignoring cost 12 to 15 points from level 10. Without them the charge size alone would have had to go past a third of your max, close to one-shot territory.
6. **Deep Shred** still destroys a file in the pack: the newest code or credits file, never a protocol or a blueprint.
7. **Saves.** Tell state lives on the fight's virus. A save from an older version drops any tell state mid-fight (`barRestore`, SAVE_VERSION 35), and the fight's tells start fresh.
