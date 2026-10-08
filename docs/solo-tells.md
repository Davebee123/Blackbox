# Solo tells: the designer's review sheet

Every virus that fights you alone announces its big moves. A part winds up, the log says what is coming and when, and a chip sits on that part's row in the column where the move lands. Crew bosses keep their own mechanics (raid.mjs and docs/bosses.md). This sheet covers everything else: wild viruses, strains, guards and ICE, elites, champion invasions, home intrusions and the solo bosses. The code is in dist/tells.mjs, and the numbers are in `TELL`, `TELLS` and `TELL_SETS` in dist/data.mjs.

## How a tell plays

A tell is announced once in the log, for example *The Replicator charges its Replicate into MASS MAILER. It lands in 2 cycles. Deal 53 to the Replicator on the cycle it lands, or break 2 ◆ on it, to call it off. Hits before then don't count.* From then on its chip sits on the part's row. The chip has a kicker line (*Charged*, *Casting*, *Sealing*, *Recording*), the move's name, what it does, and a last line that says exactly what counts as an answer and when: *▸ Burst 53 or ◆2 in 2*, *▸ SIGINT in 1*, *▸ Strip ◆3 first*, *▸ Go quiet now*. When its window opens the log says so (*MASS MAILER's window is open. Deal 53 to the Replicator this cycle, or break 2 ◆ on it, to call it off.*) and the chip lights up with a NOW badge. Hovering the chip gives the whole rule, what reading it pays, and what it leaves behind if it lands. A veiled part's tell shows anyway. Breaking a tell's part always stops the tell.

## The window and the burst

The designer's playtest found that answering at any time made tells a chore: you hit the part as soon as the tell showed and moved on, and nothing felt threatening. A tell now has a window, and a charge asks for a burst inside it.

### The window

A charge or a cast can only be answered in its window. From level 6 a charge's window is the cycle it lands. At levels 1 to 5 it is the last two cycles. An elite's or a solo boss's charge gets one cycle more. A cast's window is two cycles at every level, so that its two hits fit. Hits before the window still do their damage, but they don't count toward the answer, and the log says so once a cycle: *Too early for MASS MAILER. Its window opens next cycle, and only hits in it count.* A tell said with less lead than its window is open from the moment it's said, so nothing is unanswerable. If you push a charge's attack back (Rate Limit, Jam, Suspend outside the window), its window moves with it.

Seals and the Mimic were already timed. A seal still fails if its part has no ◆ when it lands, so a strip at any time before then works, and its chip turns to NOW on the cycle it lands. The Mimic's beat is its own window.

### The burst

A charge is called off by a burst: damage from your own commands into the part, inside the window, worth a share of the part's max Integrity. Every ◆ you break on it in the window counts as half the burst, so two ◆ do the whole thing. A Breaker's Crack (three ◆) or any heavy hit that breaks two calls off an armored charge on its own, and a Spike that breaks one does half.

| Levels | Window (a charge) | Burst, as a share of the part's max | Each ◆ broken |
|---|---|---|---|
| 1–5 | its last 2 cycles | 25% | half the burst |
| 6–9 | the cycle it lands | 35% | half |
| 10+ | the cycle it lands | 50% | half |
| Elite or solo boss | one cycle more | 20% of a part about five times bigger | a third |

At level 12 the Encryptor has about 105 Integrity, so its burst is 53. A Spike does 42 to 49 there, so it falls short on a bare part, and an Overload or a Flood clears it. From level 18 a Spike already does more than half a wild part's max, so on a bare part the burst is easy and the window is what matters. Three charges in four land on a part that still wears ◆ (four on average, measured on the balance fights), so most of the time the burst is ◆2 in the window, and holding a heavy hit or a strip for that cycle is the play. An elite's Encryptor at level 10 carries about 546 Integrity and asks for 109 over two cycles, or ◆3.

Double Tap and Spectre count every command twice toward a burst, and Fuzz counts its own hit twice. Overvolt's two hits each count. A skill that hits for you later counts what it does to the part in the window: Kill Switch's cash-in, IRQ Storm's ticks, Reroute's arrivals and Detonate's cash-in all add to the burst.

**Half the burst lands it plain.** Short of the whole burst the charge still lands, but what it adds over the plain attack shrinks in step with what you dealt, and at half the burst it is gone: the attack lands plain and leaves nothing behind (no Offline, Corrupted or Hung). A Mass Mailer's extra fragment and a Possession's longer scramble shrink the same way. The log says it: *You burst 15 of 60 into the Encryptor. FULL DISK lands 50% softer.* or *You burst 30 of 60 into the Encryptor. FULL DISK lands plain and leaves nothing behind.* So a Spike that breaks one ◆ in the window blunts a charge, and only the whole burst calls it off and staggers the part. The choice in the window is between a cheap hit that blunts it and the big one, kept ready, that buys the stagger.

**A cast** is stopped by SIGINT in its window, or by two hits in it. SIGINT before the window is refused and its cooldown kept: *Too early: Double Extortion's window opens next cycle. SIGINT only interrupts a cast in its window.*

**Skills built for a tell answer it outright, in its window only.** Suspend and Spoofed ACK drain a charge whose window they fire in, and before the window they only push its attack back, the charge riding along. Jam, Backfire, Quarantine, Revoke and Hijack's theft of a cast work the same way. Hijack and Blackhole on a charge resolve as the attack lands, which is always in the window. Segfault still triples on a charging part at any time, but its hit counts toward the burst only in the window.

### The payoff: the part staggers

A charge, a cast or the Mimic's beat answered in full staggers its part. It's Open for 2 cycles (+50% from everyone), and its next attack lands a cycle later: *READ: the Replicator staggers. It takes +50% from everyone for 2 cycles, and its Replicate lands a cycle later.* A charge of another tell already riding that attack keeps its cycle, so the delay never piles a charge onto the Mimic's beat. A solo boss staggers Open but keeps its clock. With the delay too, the readers beat MIRRORSHADE 94% of the time, over its band. Reading still adds a tenth of the kill's XP for each read, and reading every tell in a fight rolls its loot once more.

### How it shows on the board

- The chip sits in the cell where the tell lands. Before its window its last line says what it takes and when the window opens (*▸ Burst 53 or ◆2 in 2*). The ◆ part shows only while the part wears armor.
- While the window is open the chip wears the Sync Window's yellow: a yellow border and glow, a NOW badge in place of the countdown, and the order in yellow (*▸ Burst 53 or ◆2 now*). Burst dealt so far shows at the right (*30/53*).
- A window longer than a cycle (levels 1 to 5, an elite's or a boss's charge, every cast) marks the cells before the chip with a slim WINDOW strip, lit *Window · now* in the cycle you're in.
- The log says when a window opens, says when a hit came too early, counts a partial burst, and says how much softer a charge lands.
- The CSS for all of it is one commented block in style.css (*Tell windows*).

## The rules around every tell

### One clock

A tell never runs on a timer of its own.

- **A charge powers up an attack that is already on the board.** The attack's cell turns into the charge at least two cycles before it lands (three at levels 1 to 5), and it lands exactly when the attack was due. If you delay the attack with Rate Limit, Suspend or Jam, the charge moves with it. A charge rides one landing of its part's attack, so a called-off charge doesn't come back on the next one.
- **A cast or a seal gets its own cell** on its part's row, two cycles ahead or more.
- **No pile-ups.** A charge never lands on the same cycle as another part's heavy attack, or on the Mimic's beat. Below level 17 one tell is live at a time. From 17 two can be live, and never on the same cycle.

### A fixed part

Each tell sits on one part, always the same for its family, guard or strain, and the chip and the codex name it. A family's charge, cast and seal sit on its signature part (the Encryptor, the Replicator, the Scrambler). Overcharge, the second charge from level 17, sits on the plain attacker (the Pulse Node). A strain's charge sits on its rule's part. The Mimic's beat belongs to the Mimic, and the seals sit on the armored signature part. An earlier version picked the part nothing had hit for longest, which players couldn't plan for.

### Only deliberate answers count

A command of yours aimed at the tell's part, typed after the tell was said and landing in its window, counts. These don't, though they still do their damage:

- area hits (Fork Bomb, Shatter, Chain Reaction, Logic Bomb's spread),
- burns and helpers,
- a crewmate's splash and Overkill spills,
- your auto-repeat Spike, and daemons.

A skill that hits for you later counts as the command you typed: Thermal Runaway's ticks, Kill Switch's cash-in on each part, Reroute's arrivals, IRQ Storm's ticks. Toward a charge's burst what counts is the damage and the ◆. Toward a cast each command counts once, except Overvolt and Fuzz (twice). Double Tap and Spectre make each command count twice, its burst or its hit.

Some skills are built for a kind of tell and answer it outright when they land on its part in its window:

| Kind | Built answers |
|---|---|
| Charge | Suspend and Spoofed ACK drain it, Jam makes it land plain, Backfire sets it off inside the part, Hijack lands it on another part, Blackhole swallows it. Segfault (three times the hit on a charging part), Replay (its charged size), Kill Switch, IRQ Storm and Detonate count by the burst they deal |
| Cast | SIGINT, Quarantine, Overvolt, Fuzz, Thermal Runaway (fired the cycle before, its ticks land in the window), Hijack (it compiles for you), Reroute, Kill Switch, IRQ Storm |
| Seal | Any strip before it lands, Bit Rot (it fails even with ◆ on), Cache Poison (it fails and hits the part for 30) |
| Mimic | Anything with no direct hit: a debuff, a strip, a burn, a helper, a shield, hold. Log Wipe leaves its next beat nothing to play |

### Reading pays

- **A stagger.** A charge, a cast or the Mimic's beat answered in its window staggers its part. It's Open, taking 50% more from everyone for 2 cycles, and its next attack lands a cycle later (a solo boss keeps its clock). The log says *READ: the Replicator staggers. It takes +50% from everyone for 2 cycles, and its Replicate lands a cycle later.* and the part flashes.
- **A ready key.** A seal stopped by a strip readies the skill that did it.
- **XP.** Each read adds a tenth of the kill's XP to the kill, up to 40%: *Read 3 tells: +42 XP.*
- **Loot.** Read every tell in a fight (two or more said, none landed) and its loot rolls once more.
- **Gear.** Uniques and rules that fire on calling off a tell (Ctrl-C, Interrupt Vector, Abort Handler, Exception Handler) fire on every read.

### Ignoring hurts

From level 10 a charge can add a quarter of your max on top of the plain hit, and a charge or a cast that gets through leaves something behind (a charge you burst half of lands plain and leaves nothing):

- **Offline.** The last skill you used (not Spike or SIGINT) is knocked offline for 2 cycles (1 at levels 6 to 9). Its key says *OFFLINE*.
- **Corrupted.** You lose 4% of your max a cycle for 3 cycles (2% at 6 to 9, 5% from 17). Purge, Scrub or Rollback cleanses it.
- **Hung.** From level 10 your next command doesn't fire.
- **A seal** that lands while its part wears ◆ also takes your own ◆ and shield, from level 6.

Nothing one-shots. One hit never takes more than half your max, or the plain hit if that is bigger. Levels 1 to 5 have no after-effects.

## The kinds

| Kind | What it is | What answers it | What ignoring it costs |
|---|---|---|---|
| Charge | The part's next scheduled attack, made much bigger, in that attack's cell. | A burst into the part in its window (a share of its max, or ◆2), or a built answer in the window. Called off, the attack still lands, plain, a cycle later. Short of the burst it lands softer. You can also soften it: a ◆, a shield, Brace, Bulkhead, Throttle, Heartbeat. | ×2 to ×3 the plain hit, the extra capped by level (table below). Charges never crit. Then the after-effects, unless you burst half of it (it lands plain). |
| Cast | *Casting*: a buff on the whole virus for 4 cycles. From level 10, when you get SIGINT. | SIGINT or two command hits on the part in its window (its last two cycles), a built answer, or breaking the part. | Double Extortion makes every attack 35% harder. Persistence and Call Home make every attack repeat a cycle faster (what is already on the board stays put). Self-Update gives every part a quarter more Integrity. Then the after-effects. |
| Seal | The part re-arms if it still wears ◆ when the seal lands. From level 6, on elites, bosses and the Sentinel. | Strip the part first, or Bit Rot or Cache Poison it. | The part goes back to full ◆ with one more for the rest of the fight, every part you had stripped gets a ◆ back, your own ◆ and shield go, and you are Corrupted. |
| Mimic | The Mimic part records you. On its beat (every 4 cycles from cycle 3) it plays back whatever command you fire that cycle. | Go quiet on the beat. | Your command's whole direct hit comes back at you. |

## By level

| Levels | Tells a wild virus brings | Live at once | Warning | Window (a charge) | Burst | Charge (the extra over the plain hit, at most) | After-effects |
|---|---|---|---|---|---|---|---|
| 1–5 | One, its charge | 1 | 3 cycles | last 2 cycles | 25% of the part's max, or ◆2 | ×2, 10% of your max | None |
| 6–9 | One, its charge | 1 | 2 cycles | the cycle it lands | 35%, or ◆2 | ×2.3, 15% | Offline 1 cycle, Corrupted 2% |
| 10–16 | Two, its charge and its cast | 1 | 2 cycles | the cycle it lands | 50%, or ◆2 | ×2.8, 25% | Offline 2, Corrupted 4%, Hung |
| 17+ | Three, adding Overcharge on its other attacker | 2 | 2 cycles | the cycle it lands | 50%, or ◆2 | ×3, 25% | Offline 2, Corrupted 5%, Hung |

- **Elites** bring one more tell, their family's seal (from level 6). Their charges can cost 15% more, and their window is a cycle longer for a burst of 20% of a part about five times bigger, or ◆3.
- **Solo bosses** (RELAY-KING, REPO MAN, HOLLOW CHOIR, the Residents) bring every tell open at their level. Their charges ask for what an elite's do and can cost 10% more. A boss staggers Open but its attacks keep their clock.
- **Champion invasions** bring the usual tells for their level, and their charges are a tenth bigger.
- **SPRAWL-00's first two kills**, while its hits land at 60%, bring no tells.
- **Timing.** The first tell lands on cycle 3 at the soonest. After a tell lands or is answered, the next of its kind may land 4 cycles on (a charge) or 7 (a cast or a seal), plus a seeded 0 to 2.

## Every tell, by family

### Home families

| Family | Tell | Kind | On | Opens | What it does | Answer |
|---|---|---|---|---|---|---|
| Ransomware | **Full Disk** | Charge | Encryptor | 1 | Its Encrypt, much bigger, plus a burst of encryption on top for 3 cycles | Burst the Encryptor in its window. Purge, Scrub, Rollback or breaking the Encryptor clears the burst |
| Ransomware | **Double Extortion** | Cast | Encryptor | 10 | Every attack hits 35% harder for 4 cycles | SIGINT, or hit the Encryptor twice, in its window |
| Ransomware | **Overcharge** | Charge | Pulse Node | 17 | Its Surge, much bigger | Burst the Pulse Node in its window |
| Ransomware | **Key Rotation** | Seal | Encryptor | 6 (elites) | The part re-arms with one ◆ more, and stripped parts get a ◆ back | Strip it first |
| Worm | **Mass Mailer** | Charge | Replicator | 1 | A Replicate that hatches two fragments (within the limit) | Burst the Replicator in its window. A Warden's DMZ makes the spawns fizzle |
| Worm | **Self-Update** | Cast | Replicator | 10 | Every part grows a quarter more Integrity, for good | SIGINT, or hit the Replicator twice, in its window |
| Worm | **Overcharge** | Charge | Pulse Node | 17 | Its Surge, much bigger | Burst the Pulse Node in its window |
| Worm | **Resync** | Seal | Replicator | 6 (elites) | As Key Rotation | Strip it first |
| Ghostroot | **Possession** | Charge | Scrambler | 1 | Its Scramble, plus two more cycles of scrambling (Scrub cleanses it) | Burst the Scrambler in its window |
| Ghostroot | **Persistence** | Cast | Scrambler | 10 | Every attack repeats a cycle faster for 4 cycles | SIGINT, or hit the Scrambler twice, in its window |
| Ghostroot | **Overcharge** | Charge | Pulse Node | 17 | Its Surge, much bigger | Burst the Pulse Node in its window |
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
| Bouncer | **Battering Ram** | Charge | Its Gate's attack, much bigger. The Gate wears ◆, so ◆2 off it in the window calls it off |
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

SIGINT moved to the - key, so it keeps the same key all game. It answers a solo cast in its window as well as a crew boss's cast, at the price of your command for the cycle, and a cast is the only tell it answers. Fired before the window it is refused, and its cooldown kept. An interrupted solo cast no longer comes back sooner. SIGINT is ready every 8 cycles and casts come about every 7, so a class with a skill built for casts (Quarantine, Overvolt, Thermal Runaway, Hijack, Reroute) keeps SIGINT for the next one. Charges and seals never accept SIGINT.

## The bots

The planner reads tells (planner.mjs, `tellMove` in tells.mjs, and each subclass's planner in dist/classes).

- **Charges, in the window.** The bot fires the biggest burst it has on the part: the cheapest command that does the whole thing (so the bigger keys stay ready), else the biggest part of it. A skill built for the charge counts as a whole burst, Kill Switch and IRQ Storm as what they cash in, Detonate as the burns it sets off, and ◆ at half the burst each. It answers when that calls the charge off or bursts half of it, and keeps its own plan when the plan bursts it as well. When it's low and its plan heals, it heals, unless the charge alone would finish it. A big charge landing now wins over a small kill.
- **Charges, before the window.** The bot plans for the window instead of hitting early. It keeps the key the window needs off cooldown (it fires a Spike in its place when nothing else would make the burst then). It doesn't chip the part's ◆ down to one when ◆2 in the window would be a whole burst, and hits another part instead. The cycle before the window, when the burst through ◆ falls short and a bare hit would make it, it strips the part (Spike on its last ◆, Crack, Shaped Charge or Overvolt), so the window's hit lands on a bare part.
- **Casts.** In the window it answers with its own built skill first, then SIGINT, then two hits. Thermal Runaway goes on the cycle before, so its ticks land in the window. On a cycle where it would take a kill, a cast landing now still gets SIGINT first.
- **The Mimic.** On the Mimic's beat it fires something quiet if its planned hit would come back.
- **Seals.** It strips a part about to seal when one or two commands do it, and Bit Rots or Poisons one it can't strip.
- **Parts.** The planner leaves a Tripwire for last, breaks the Mutex or bursts through the lock, goes for the C2 Node once fragments are up, and focuses a part it left Open.

`TELL.bots.answer = false` makes a bot that plays as if it can't see the tells. balance.test.mjs runs it on the class-balance fights for every subclass.

### The gap, before and after the window

The same 24 class-balance fights per subclass and bracket, the reading bot against the ignoring bot. *Before* is the code before the window and burst (any hit at any time called a charge off). *After* is this pass.

| Bracket | Gap before | Gap after |
|---|---:|---:|
| Lv 10 | 15.4 | 19.8 |
| Lv 18 | 15.2 | 21.9 |
| Lv 30 | 6.7 | 10.2 |
| Average | 12.4 | 17.3 |
| Lv 5 (per class) | 1.0 | 3.1 |
| Lv 8 (per class) | 5.9 | 12.8 |

The reading bot wins 66 more of the 576 fights than the ignoring one (47 before). The ignoring bot got worse because a hit that happened to land on a charging part no longer calls the charge off. The reading bot got better where it has a burst or a strip for the window, because a clean answer staggers the part, and a little worse where it has neither (the Herder at Lv 10, the Sysop at 18 and 30). balance.test.mjs holds the average gap at 15 to 22 points from Lv 10, at least 8 in each bracket, the ignoring bot winning fewer fights, and a gap below 10 that is there but smaller.

| Subclass | Lv | Reading bot (Signal lost) | Ignoring bot | Gap |
|---|---|---|---|---|
| Demolitionist | 10 | 36% → 27% | 45% → 44% | 9.1 → 17.3 |
| Demolitionist | 18 | 22% → 18% | 28% → 30% | 6.0 → 12.3 |
| Demolitionist | 30 | 23% → 25% | 26% → 30% | 3.4 → 4.9 |
| Overclocker | 10 | 35% → 28% | 45% → 43% | 10.4 → 15.4 |
| Overclocker | 18 | 32% → 26% | 34% → 42% | 2.5 → 16.1 |
| Overclocker | 30 | 33% → 30% | 36% → 44% | 3.5 → 14.6 |
| Warden | 10 | 28% → 24% | 40% → 45% | 12.2 → 20.9 |
| Warden | 18 | 18% → 22% | 30% → 37% | 12.3 → 15.4 |
| Warden | 30 | 26% → 27% | 43% → 44% | 17.2 → 17.3 |
| Sysop | 10 | 34% → 33% | 46% → 49% | 12.0 → 15.9 |
| Sysop | 18 | 2% → 6% | 36% → 37% | 34.0 → 31.6 |
| Sysop | 30 | 5% → 8% | 20% → 21% | 15.4 → 12.6 |
| Payload | 10 | 20% → 21% | 40% → 41% | 19.4 → 20.0 |
| Payload | 18 | 41% → 41% | 61% → 69% | 19.7 → 27.2 |
| Payload | 30 | 38% → 36% | 47% → 46% | 8.8 → 10.1 |
| Phantom | 10 | 32% → 27% | 46% → 48% | 14.8 → 20.8 |
| Phantom | 18 | 36% → 25% | 55% → 58% | 18.9 → 32.3 |
| Phantom | 30 | 24% → 20% | 29% → 27% | 4.8 → 7.1 |
| Herder | 10 | 24% → 29% | 50% → 54% | 26.0 → 25.4 |
| Herder | 18 | 37% → 33% | 56% → 57% | 18.9 → 23.4 |
| Herder | 30 | 41% → 34% | 38% → 38% | -2.8 → 3.8 |
| Hijacker | 10 | 37% → 38% | 56% → 60% | 19.6 → 22.9 |
| Hijacker | 18 | 42% → 38% | 51% → 55% | 9.7 → 16.8 |
| Hijacker | 30 | 37% → 34% | 40% → 44% | 3.2 → 11.0 |

Every subclass stays inside its solo band (15–50% lost, the Bastions under 50%), and the six damage dealers stay within 30 points of each other at each bracket.

## Decisions for the designer

1. **The burst is half a part's max from level 10, not 20%.** A same-level wild part is only about two Spikes deep (a Spike is 45% of its max at Lv 10 and 60–70% at Lv 18 and 30), so 20% would have been less than a Spike, a tap again. At 50% a Spike falls short at Lv 10 and a big hit clears it. From Lv 18 even a Spike clears a part with no armor, and there the window and the armor carry the rule: three charges in four land on a part that still wears ◆ (four on average), where the answer is ◆2 in the window.
2. **◆ count at half the burst each** (a third for an elite or a boss) instead of keeping the old *strip ◆2* answer. It is the same thing on an armored part, it reads as one rule, and the Battering Ram is now an ordinary charge.
3. **Half the burst lands it plain, with no after-effect.** A proportional softening all the way to the full burst left cheap kits (the core rotations, the Sysop) eating most of every charge. With the two steps a cheap hit in the window blunts a charge, and only the whole burst calls it off and staggers the part. The choice in the window is between them.
4. **A solo boss staggers Open but keeps its clock.** With the delay too, the readers beat MIRRORSHADE 94% of the time (its band asks 55–85%). Without it they win 83%.
5. **Built answers work in the window only.** Suspend and Spoofed ACK fired before it just push the attack back, and the charge rides along.
6. **Known drift, held in the tests and waiting on a kit look.** The second presets of the Demolitionist (area, 5.2 points better on the generic fights, 4.1 on its own), the Sysop (healers, 5.4 better on the generic fights, 2.7 on its own) and the Hijacker (rules, 6.1 worse on the generic fights, 3.1 better on its own) measure outside kits-balance.test.mjs's 5-point line. The Hijacker carries a crew on the farm less (75% of boss tries over Lv 18 and 30, against 90% asked): the crew bosses bring no tells, but the packs before them do, and with the packs' tells off the old and the new code give the same 81%. The Bastion's SPRAWL-only climb is 1.21× the mixed one (1.25× asked). natives.test.mjs's floor moved from 20% to the class band's 15%, because the Demolitionist at Lv 18 and the Phantom at 30 now lose 17–20% on plain blues. Each test lists these and holds them at what they measure now.
7. **Fuzz's tooltip still says one Fuzz calls off an elite's charge.** Under the burst it counts its hit twice toward the burst, which isn't always enough. The text belongs to the language pass.

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

1. **The knock-back is back, as the stagger.** A charge called off in its window leaves its attack to land plain a cycle later, and the part Open. It is what lifts the strongest readers to 17–20% lost (see Decisions for the designer, above). A solo boss keeps its clock.
2. **Area hits don't answer.** Fork Bomb, Shatter and the like no longer call off tells. The Demolitionist has to aim at the charging part like everyone else.
3. **SIGINT's price.** An interrupted solo cast no longer comes back two cycles sooner. With casts every 7 or so and SIGINT every 8, SIGINT still can't stop every cast alone.
4. **Overcharge from 17.** Wild viruses at 17+ bring a second charge on their plain attacker instead of a seal. Seals stay with elites, bosses and the Sentinel.
5. **After-effects.** Offline, Corrupted and Hung are much of what makes ignoring cost about 17 points from level 10. Without them the charge size alone would have had to go past a third of your max, close to one-shot territory.
6. **Deep Shred** still destroys a file in the pack: the newest code or credits file, never a protocol or a blueprint.
7. **Saves.** Tell state lives on the fight's virus. A save from an older version drops any tell state mid-fight (`barRestore`, SAVE_VERSION 35), and the fight's tells start fresh.
