# Solo bosses: the review sheet

The bosses that fight you alone (docs/puzzle-fights.md P4). The rules as built are in GAME_RULES.md "Solo bosses".

The designer, October 31, 2026: *"Bosses need to be mechanically unique and difficult to fight. Like really pushing your
ability to kill. The most puzzles out of all encounters."* Before this, RELAY-KING, REPO MAN and HOLLOW CHOIR were a
family virus at 1.6× Integrity with one stock phase: the kit player (blind to the boss) won 83–100%.

## The shape

- **Three acts, each a fresh bar** (built November 2026): every part back at full with that act's rules on top. An act
  ends when its last part breaks; the next begins at the cycle's end. Each act brings a mechanic. A stock phase (re-arm,
  a cycle sooner) is never an act on its own.
- **One rule an act** (built November 13): every act starts from act 1's board and act 1's rules, so an act's own rule
  leaves with it and what grew in it starts over. A part an act brings takes a seat, and the board holds act 1's
  Integrity.
- **A part of its own**, with a rule, on top of its family's: the boss's signature, its ♛, shown on its row.
- **The ♛ is a part like the others**: its ticks are 50% and 25%, it interrupts, and crossing it starts no act. No kill
  order is forced and none is punished, so a boss needs no rule to make its ♛ worth working early.
- **15 to 20 cycles an act** (the designer, November 13; acts.mjs `ACT_BARS`): each act holds a third of 1.8 of the
  boss's Integrity, times its `bar` (BOSSES), set so the planner's acts land there. Its hits are ×0.55 of one bar's, so
  the longer fight costs about what the short one did, and its rounds and enrage (24 cycles in) start with each act.
- **About even acts** is the aim, with no hard ratio (the designer, November 13: a boss can carry a bit more health,
  and bosses needn't be perfectly balanced). A boss whose acts run far apart gets its behaviour or mechanics changed,
  never its split.

### Why acts became bars (the designer, November 2026)

Acts used to start at the ♛'s ticks (60% and 30%). Act 1 held every part, so commands spread and it ran long; once the
other parts were dead the ♛ took the whole kit and acts 2 and 3 burned in a few cycles. Measured on nearly every boss
(the table below, before): RELAY-KING 19.4 / 4.7 / 2.8, PATCH TUESDAY 15.4 / 4.9 / 2.8, EXIT NODE 16.6 / 2.6 / 3.0.
More health on the ♛ didn't fix it (GRACE PERIOD: act 3 got shorter). What went with the change: the ♛'s act ticks, the
cap that held it at its tick, the one to leave (take it under too soon and every part re-arms) and the rule that
working only the ♛ is punished — an act ends only when every part is down, so the order is the player's.

### Act bars, measured

Cycles an act (every act that ended, won or lost) and the band: the planner on every subclass, 6 seeds, each boss at its
floor (10 where it has none). The band is read · misread · blind wins, act bars as first built (November 12, share
0.72) → with one rule an act and the pacing (November 13). The redesign below reworks each boss from here.

| Boss | Act 1 | Act 2 | Act 3 | Read | Misread | Blind |
|---|---|---|---|---|---|---|
| Resident worm | 16.2 | 17.2 | 17.9 | 47 → 75% | 47 → 75% | 47 → 75% |
| Resident ransomware | 20.2 | 21.4 | 19.2 | 96 → 67% | 97 → 63% | 100 → 48% |
| RELAY-KING | 19.4 | 18.6 | 19.0 | 14 → 10% | 13 → 10% | 13 → 10% |
| REPO MAN | 14.1 | 14.9 | 14.9 | 38 → 60% | 38 → 60% | 38 → 60% |
| HOLLOW CHOIR | 17.3 | 20.4 | 13.0 | 43 → 52% | 49 → 27% | 40 → 6% |
| CENTRIFUGE | 16.0 | 18.2 | 17.6 | 86 → 98% | 70 → 58% | 67 → 38% |
| SHAKEDOWN | 15.8 | 15.1 | 13.4 | 0 → 71% | 1 → 73% | 0 → 73% |
| SHOULDER SURFER | 19.7 | 19.4 | 15.0 | 14 → 23% | 11 → 10% | 1 → 0% |
| RECURSION | 17.8 | 18.8 | 18.7 | 43 → 85% | 34 → 67% | 13 → 31% |
| NIGHT DESK | 15.5 | 16.0 | 13.8 | 21 → 79% | 2 → 35% | 0 → 0% |
| BYZANTINE | 16.9 | 18.5 | 18.4 | 15 → 60% | 17 → 56% | 22 → 23% |
| CAMSWARM | 19.9 | 21.1 | 18.5 | 13 → 60% | 13 → 46% | 13 → 33% |
| GRACE PERIOD | 15.9 | 19.3 | 15.3 | 63 → 73% | 50 → 63% | 27 → 10% |
| EXIT NODE | 17.3 | 17.8 | 17.7 | 27 → 25% | 28 → 23% | 31 → 15% |
| DEADBOLT | 19.2 | 19.7 | 18.8 | 100 → 88% | 100 → 88% | 100 → 88% |
| TRIPMINE | 15.8 | 15.7 |  | 84 → 100% | 88 → 100% | 89 → 100% |
| HASHLORD | 16.6 | 17.6 | 19.2 | 13 → 85% | 11 → 79% | 9 → 75% |
| BACK ORIFICE | 17.4 | 18.0 | 18.5 | 43 → 65% | 45 → 67% | 45 → 67% |
| PATCH TUESDAY | 18.9 | 17.3 | 18.1 | 76 → 77% | 79 → 77% | 74 → 77% |
| FLOODWALL | 16.2 | 15.2 |  | 85 → 100% | 86 → 94% | 83 → 94% |
| MIRRORSHADE | 21.6 | 16.9 | 14.6 | 74 → 65% | 56 → 56% | 22 → 19% |
| SLEEPWALKER | 17.9 | 18.3 |  | 88 → 100% | 88 → 100% | 88 → 100% |
| ECHOLALIA | 19.6 | 19.9 | 16.8 | 92 → 83% | 91 → 85% | 88 → 88% |

TRIPMINE, FLOODWALL and SLEEPWALKER have two acts until their redesign. Before act bars, acts started at the ♛'s
ticks: act 1 held every part and ran long, and acts 2 and 3 burned in a few cycles (RELAY-KING 19.4 / 4.7 / 2.8).

### What the old shape left behind (November 2026)

Built while acts came from the ♛'s ticks, and still in the code: the ♛'s share of its board (`BOSSES` work.share: half
on the Resident and SHOULDER SURFER, 45% on RELAY-KING and REPO MAN), the Resident's **Watchdog** (act 2's rule
since session 2 of the redesign below), CENTRIFUGE's **Sold** heal and SHAKEDOWN's planner lead (work.lead).

## The act-bars redesign (picked November 13, 2026)

Every boss's rules were written for one bar. The designer picked a rework for all 23 (the review page, November 13),
with each fork's A unless named, NIGHT DESK's Margin Call, and acts of 15 to 20 cycles. The signature runs all fight;
each act brings one rule of its own, and costs the default move (the first ready key on the first part, every charge
called off, the big key on the beat) something specific.

**The shared rules** (built, session 1, acts.mjs):

- **One rule an act.** Every act starts from act 1's board and act 1's rules; an act's own rule leaves with it.
- **What grows lasts the act**: a leak, a sale, a passed vote, a Call, a Dump, a lapse charge, a full table, Liens.
- **A part an act brings takes a seat** (`joinPart` seat), and the board holds act 1's Integrity (`actEven`).
- **Pacing**: rounds and the enrage (24 cycles in) count from each act's start; hits ×0.55; each act a third of
  `ACT_BARS.share`, times the boss's `bar`.
- **The refill does the returning.** Re-arm, Hard fork's returns, Botnet's and Reinstatement's go in their sessions. A
  part comes back mid-act only where its system is about coming back (the Mutex's lock, Final notice, Hotfix, restores).
- **The break can name the next act** (not built): BYZANTINE's traitor is your last break, MIRRORSHADE's Doppelganger
  your first; the strip says so (*ACT 2 / 3 · TRAITOR · NODE C*).

**Each boss** (the ♛'s signature runs all three acts; *seat*: takes that part's place):

| Boss | Act 1 | Act 2 | Act 3 | The blind move it costs |
|---|---|---|---|---|
| SHAKEDOWN (built) | **Ransom Clock**, one an act | **Second demand**: seat Lockbox | **Final notice** | Calling off every Deadline; the Demand first |
| NIGHT DESK (built) | **No Timeout** | **Night shift**: the Clerk, seat Teller | **Margin Call**: the Desk's attack settles the table | Tunnelling the Desk |
| CAMSWARM | **Telnet Sweep**; the 15% limit on the Hive only | **Botnet**: a Camera, seat Pulse Node | **Lockout**: a Camera, seat C2 Node | Chipping every part under half |
| BYZANTINE | **Vote**, Consensus for the act | **Traitor**: your last break in act 1 | **Hard fork**: mid-act returns only | Tunnelling one Node |
| SHOULDER SURFER | **Replay**, the Dump's growth for the act | **Again** | **From the top**, without Again | A big key on a shut cycle |
| RELAY-KING (built) | **Broadcast** | **Crown Hop**: at its 50% tick the ♛ hops to the healthiest part, the two swap how full they are | **Flood**: each Broadcast hatches a fragment on every part | Ignoring fragments; tunnelling the ♛ |
| EXIT NODE | **v7 · Front** | **v6 · Kept charges**, v6 fronts | **v5 · Cold image**: the restore point is the act's first break | Bursting in the restore window |
| REPO MAN (built) | **Liens** | **Repossession**: a Collection re-arms a ◆ a Lien | **Interest** | Plain hits into ◆ |
| RECURSION | **Call**, its growth for the act | **Return**: no frame pushed | **Overflow**: one frame deeper, same Integrity | Letting every Call through |
| HOLLOW CHOIR (built) | **One voice** | **Second voice**: seat Pulse Node | **Round**, one voice | The big key on the beat |
| GRACE PERIOD | **Grace** 3, the Rider | **Reinstatement**: a lapsed part +25% until stripped; nothing returns | **Acceleration**: a lapse takes a cycle off every other part | Paying every part |
| CENTRIFUGE | **Bidding** | **Reserve price** | **Second lot** | Commands at the Gavel |
| The Residents (built) | **Backlash** | **Watchdog**, this act only | Worm **Outbreak** (a lash hatches); ransomware **Lockdown** (a lash encrypts you) | Hits on the beat |
| DEADBOLT | **Lock** | **Tumblers**: a Deadbolt that lands re-locks | **Double lock**: a Mutex, seat Pulse Node | Hitting the lock |
| TRIPMINE | **Tripwire** | **Daisy chain**: a Tripwire, seat Pulse Node (Claymore to the Encryptor) | **Dead man**: the Pulse Node sets off every wire | The Tripwire first |
| HASHLORD | **Pool Lock** | **Chain Fork**: a Miner, seat Pulse Node | **51%**: the Lock wards the healthiest part | Commands into the ward |
| BACK ORIFICE | **Spam Run** | **Port knock**: one part open every 3, the rest half | **Mirror**: seat Pulse Node | Closed ports |
| PATCH TUESDAY | **Patch** | **Out of band**: a tick crossed is patched at once | **Hotfix**: the last part broken back at 25% | Chipping the first part |
| FLOODWALL | **Flood** | **Spillway**: a delay sends the ramp to the Pulse Node | **Levee**: the ramp moves on when the Flooder breaks | Never delaying |
| MIRRORSHADE | **Feedback** | **Doppelganger**: your first break in act 1 | **Shatter**: three copies of your next command, a third each | Bursting while Scrambled |
| SLEEPWALKER | **Dormant**, every act | **REM**: one part dozes, ×2; a hit sounds the Alarm | **Night Terror**: the dozer charges; wake it or take it | Waking it at once |
| ECHOLALIA | **Echo** | **Echo chamber**: echoes wait, and land when the Echo breaks | **Last Word**: the last part repeats its final 3 cycles' hits (its charge back to Feedback) | Bursting the last part |

**Build order**, one session each, in sequence (every one touches the combat rules), each played before the next:
1. The shared rules, the pacing, SHAKEDOWN and NIGHT DESK (built November 13).
2. The Residents, RELAY-KING, REPO MAN, HOLLOW CHOIR (built November 13). Their acts for the planner (won fights, level
   10): Resident worm 15.3 / 15.8 / 15.3 (`bar` 0.6), ransomware 16.2 / 18.7 / 17.7 (1.2), REPO MAN 15.8 / 16.0 / 15.4
   (2.2), HOLLOW CHOIR 16.0 / 17.7 / 14.5 (3.85). RELAY-KING (0.85) is won 3 times in 48, so its acts are read over every
   act that ended: 18.8 / 17.6 / 18.0.
3. Floor 2: DEADBOLT, BACK ORIFICE, PATCH TUESDAY, SLEEPWALKER, MIRRORSHADE, CENTRIFUGE.
4. Floor 3: SHOULDER SURFER, RECURSION, HASHLORD, FLOODWALL, ECHOLALIA.
5. Floors 4 and 5: BYZANTINE, CAMSWARM, TRIPMINE, GRACE PERIOD, EXIT NODE.

Each session sets its bosses' `bar` so their acts run 15 to 20 cycles for the planner (`node genesim.mjs`'s
actLengths), and leaves the bands to the designer's play.

## Built: the three solo bosses

| Boss | Its part | Act 1 | Act 2 | Act 3 | The read |
|---|---|---|---|---|---|
| RELAY-KING | Relay: Broadcast every 4, +its hit per fragment | Broadcast | **Crown Hop**: at the ♛'s 50% tick it hops to the healthiest part, and the two swap how full they are | **Flood**: a Broadcast that lands hatches a fragment on every part | Bring the other parts down before the ♛'s tick; cut the Broadcast |
| REPO MAN | Ledger: Collection every 5, +its hit per Lien | **Liens**: each command a ◆ absorbs adds one; a Collection, landed or cut, clears them | **Repossession**: a Collection that lands puts a ◆ back a Lien | **Interest**: each Lien counts twice | Strip with strips, burns or helpers; cut the Collection |
| HOLLOW CHOIR | A Mimic (its third) | One voice: a beat every 4 | **Second voice**: a second Mimic in the Pulse Node's seat, beating 2 behind | **Round**, one voice: each beat plays back your last three commands | Hold or fire small in the two cycles before a beat |

Integrity (`BOSSES` in data.mjs): RELAY-KING 1.25× (its Relay is a fourth part), REPO MAN 1.6×, HOLLOW CHOIR 1.4×.

The Round's sung notes land at half (`ROUND.echo`) and record only what you fire after it starts: at full, one Flood
fired the cycle the Round began came back as 54% of a level-10 Breaker's bar.

## Proposed: floors 2–8 (picked November 2026)

**Built:** CENTRIFUGE, SHAKEDOWN, SHOULDER SURFER, RECURSION, CAMSWARM, NIGHT DESK and BYZANTINE (floorbosses.mjs,
GAME_RULES.md "Floor bosses"; SHAKEDOWN's and the floor 4 rows below are as built), in act bars like every boss. The rest
are not built.

Prototyped as applets (a board an act), with docs/content.md 3.2. How each one plays, phase by phase: docs/boss-guide.md. Each plays in the shape above: three acts, a
signature that changes the fight, a beat, the default move wrong at least once. *Sketched* has no board yet.

**Every act adds a pressure that costs to ignore** (the November audit): the opening carries two at least, so that
answering one costs you on the other, and an act that only tightens a number (sooner, fewer, smaller) is not an act.

| Boss | Floor · where | Act 1 | Act 2 | Act 3 |
|---|---|---|---|---|
| SHAKEDOWN 12 | 2 · throne of the Pits | **Ransom Clock**, one an act: 14 cycles; at 0 it leaks 35% of your max (15% more each leak that act) and restarts at 7. A Deadline you let land pays the ransom (+3); one you call off buys nothing. The Lockbox wards the Demand. **Leverage**: while a Demand stands the Collector loses 10% of its max a cycle at most | **Second demand**: a second Demand in the Lockbox's seat, its Deadline on the same cycle | **Final notice**: each leak re-arms the Demand and brings the Lockbox back |
| CENTRIFUGE 14 | 2 · floor job | **Bidding**: each Surge the Gavel lands spins it faster (every 4, 3, 2); a delay or Throttle withdraws it to 4. A Surge at every 2 sells: the buyer the Gavel names joins as a part with its crew's rule (TOLLGATE wards the Rotor, SWARMLINE twins the Gavel, PALEMASK veils a part), and heals the Rotor 10% | **Reserve price**: a delay or Throttle only steps the Gavel back one | **Second lot**: each sale brings two buyers |
| SHOULDER SURFER 18 | 3 · floor job | **Replay**: a Sync Window every other cycle. The Logger takes damage only from commands fired in it; each one outside is logged, and at 3 its Dump plays your last command back. The Pulse Node's charges land on the closed cycles | **Again**: on its beat, every 4, it plays your last three commands back in order | **From the top**: the log never clears, and the Dump plays the biggest command logged |
| RECURSION 19 · *new* | 3 · the last room of floor 3's Gauntlets | **Call**: frames stack, main() (the ♛) at the bottom. Your single-target commands reach only the top frame; burns and area hits reach all. Every 5 cycles the top frame pushes a new one at 60% of its max; a frame under 25 can't | **Return**: it pushes a frame at 25% as the act starts; a frame that breaks makes the one beneath attack a cycle sooner at +50% | **Overflow**: one more frame; at 5 frames every frame attacks at once |
| CAMSWARM 24 | 4 · lair | **Telnet Sweep**: every 5 cycles each part under half (never the Hive) hatches a fragment and shields it until that part breaks; each one hatched brings the next sweep a cycle sooner. A fragment that lives 3 cycles becomes a Camera with its own Surge. A hit takes 15% of a part at most | **Botnet**: every Camera fires with the C2 Node's Beacon; a broken C2 Node comes back, and each other part you broke returns as a Camera at 30% | **Lockout**: the Hive boots a Camera, and takes no damage while a Camera stands |
| NIGHT DESK 24 | 4 · floor job | **No Timeout**: its attacks open pending trades on their parts. Hitting a part settles its trades on you at half; at four pending, all settle in full and later trades that act open 25% bigger. Only the Desk takes damage, 10% a hit at most; its traders and their trades go with it. Interrupts do nothing | **Night shift**: the Night Clerk in the Teller's seat, holding one trade; a pending trade grows 15% a cycle | **Margin Call**: the Desk's own attack settles every pending trade with it, in full |
| BYZANTINE 26 | 4 · throne of the Pits | **Vote**: every 4 cycles the most damaged Node, if 15% or more under the average, is restored to it, and every Node hits 30% harder. A hit takes 20% of a Node at most | **Traitor**: the most damaged Node turns; while it isn't the most damaged, the restore goes to the healthiest's level | **Hard fork**: every broken Node returns as the act starts; a Node that breaks returns at the next vote at the others' average, unless both are under half |
| GRACE PERIOD 28 · *new* | 5 · lair | **Grace**: each part has 3 cycles' grace; your command on it pays it up. Left alone it lapses: full ◆, and its next attack is a charge | **Reinstatement**: a lapsed part hits 25% harder until its ◆ are stripped again | **Acceleration**: grace is 2 cycles, and a lapse takes a cycle off every other part |
| PARASITE 32 · *sketched* | 5 · lair | **Host Takeover** (docs/genome.md 7.4); the Siphon's healing is drained from your Signal | **Spare Tap**: a broken Tap boots back 2 cycles later at 60% | **Gorge**: every 4 cycles it eats its fragments to heal the ♛ by what they had left |
| EXIT NODE 30 | 5 · floor job | **Rollback**: every 6 cycles it restores its own bars, never yours, to an image taken 2 cycles before. Its acts ride its three backups, v7, v6, v5; a broken one stays broken | **Kept charges**: a charge you cut inside the window comes back at the restore | **Cold image**: one image, taken as v6 broke, for every restore |
| ACTUARY 40 | 5 · its hub's Core, sealed until 40 | **Premium paid**: one part is insured, the tag moving in a fixed order a cycle ahead; damage on it is refunded. A landed tell raises the premium 15, an answered one lowers it 15; its hits grow 1% a point | **Write-off**: the Cancel Job wakes; every 5 cycles it breaks the most damaged uninsured part and what it had left lands on you | **Finality**: the premium is set to 60. Insured parts take nothing, and the Model is insured at 50 or more. Each cycle the part just uncovered charges, landing in 2. The last part beside the Model is never written off |
| RING ZERO 34 | 6 · lair | **Hook**: one key is hooked, moving every 3 cycles (shown a cycle ahead). It still fires, but onto the Hook, which replays what it holds every 4 cycles. Breaking the Hook frees the key for 3. Never key 1 or SIGINT | **Second hook**: two keys at once | **Ring 0**: the key you fired last is hooked next |
| BRICKWALL 36 · *sketched* | 6 · lair | **Bricklaying**: every 3 cycles a ◆ on the part you hit last; a part at 4 ◆ hits ×1.5 until stripped below 3 | **Load-bearing**: stripping a raging part's last ◆ lays one on each part beside it | **Two at once**: a ◆ on each of the two parts you hit last |
| BULKHEAD 36 | 6 · floor job | **Closure** (docs/story-script.md): every 3 cycles, after a cycle's notice, the Lock seals the deepest open floor; its Integrity becomes ◆ on the Lock | **Pressure**: a sealed floor's attacks keep counting; break the Lock and all of it lands | **Final notice**: the Lock can only be hit on a cycle a notice is running |
| BLACKOUT 34 | 6 · throne of the Pits | **Rolling Blackout** (docs/genome.md 7.4) | acts to write | acts to write |
| PAY RUN 40 · *new* | 7 · lair | **Payday**: its parts never attack alone. Every 4 cycles the Batch lands one hit for each part standing; a part's share grows 10% a cycle since your command last hit it | **Back pay**: a part broken between paydays hands its share, and half again, to the next | **Settlement**: a payday heals the ♛ by what lands on you |
| BIT BUCKET 42 · *sketched* | 7 · lair | **/dev/null**: the first 30% of your damage each cycle is discarded, 5% more a ◆; every 4 cycles what it discarded flushes back at you as one hit | **Pipe**: it discards your largest hit instead | **Blackhole**: the part you hit most in the last 3 cycles discards all of it |
| GOLDEN PARACHUTE 38 | 7 · floor job | **Severance** (docs/genome.md 7.4) | **Vesting**: every part hits 4% harder a cycle it has stood this act | **The Parachute**: it jacks out in 4 cycles; gone, it's back next visit, no loot |
| SUMP 44 · *new* | 7 · the funnel's point | **Runoff**: a fifth of your damage collects in the Sump. Every 5 cycles the Pump heals the ♛ by half of it; breaking the Sump flushes it onto you and every part alike, and it re-forms empty in 3 | **Overflow**: at 300 it flushes on its own, onto you only | **Drain open**: all your damage to the ♛ runs down |
| HALT AND CATCH FIRE 46 | 8 · lair | **Heat** rises 8 a cycle, its hits grow 1% a point. A tick crossed on a Rig vents 25. At 100 it blows: 20% of max off you and every part, back to 40 | **Runaway**: a vent leaves you Overheated (cooldowns 1 longer for 2 cycles) | **Halt**: at 100 it halts 2 cycles, nothing hittable, then every skipped attack lands |
| THUNDERING HERD 47 · *new* | 8 · lair | **Accept**: its workers sleep; the Listener adds one every 4 and wakes them all every 5 to bite once. A worker broken in one hit, or hit while awake, wakes nobody | **Light sleepers**: a hit that doesn't break a sleeping worker wakes them all | **Stampede**: after each wake one more stays awake for good |
| CORE DUMP 48 · *new* | 8 · floor job | **Ghosts**: its parts are ACTUARY's. A broken part stays as a ghost repeating its last attack at full strength every 3 cycles; each part alternates a small and a big one | **Reload**: every 6 cycles the hardest-hitting ghost returns as a part at 30% | **Full dump**: every attack the ♛ lands stays as an echo, at half |

**INIT** (50, Bedrock's deepest Core) has five acts. Its health is the process table, drawn as squares, one a percent:
97% at the start, won at 61%. Each act starts as the table crosses its mark, and keeps every rule before it.

| Act | Rule |
|---|---|
| 1 · Adoption (97%) | It adopts an orphan each cycle. One broken in one hit or while Open frees 2%; one left three cycles is re-parented, +1% |
| 2 · Zombies (90%) | An orphan broken over more than one hit is a zombie: it frees nothing and holds its slot. Every 4 cycles INIT reaps them, a hit each |
| 3 · Fork (83%) | Orphans wear ◆; one that survives a hit forks a copy with what it has left |
| 4 · Table full (76%) | With five standing INIT can't adopt, and nothing new of yours starts (helper, burn, shield, buff). Hits still land |
| 5 · Still filling (68%) | Brandt & Vey's orphans. The table rises 1% every cycle on its own |
