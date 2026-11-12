# Solo bosses: the review sheet

The bosses that fight you alone (docs/puzzle-fights.md P4). The rules as built are in GAME_RULES.md "Solo bosses".

The designer, October 31, 2026: *"Bosses need to be mechanically unique and difficult to fight. Like really pushing your
ability to kill. The most puzzles out of all encounters."* Before this, RELAY-KING, REPO MAN and HOLLOW CHOIR were a
family virus at 1.6× Integrity with one stock phase: the kit player (blind to the boss) won 83–100%.

## The shape

- **Three acts**: the opening, then one at each of the ♛ part's act ticks (60%, 30%). Each act adds a mechanic. A stock
  phase (re-arm, a cycle sooner) is never an act on its own.
- **A part of its own**, with a rule, on top of its family's: the boss's signature, shown on its row.
- **You choose when**: the ♛ ticks are yours to cross, so each phase starts when you are ready for it.
- **The ♛ is worked through the fight** (the designer, November 2026): it is attacked as part of the normal flow, and a
  player who attacks only the ♛ is punished. An uneven boss gets more of its health on the ♛, or something in its own
  system that makes the ♛ worth working early. Bringing parts back is for the few bosses whose system fits it, never a
  mechanic every boss shares.
- **Act length** (November 2026): the ♛'s act ticks are at **60% and 30%** on every boss (`TICKS.act`, interrupt.mjs);
  every other part's cut ticks stay at 50% and 25%. The aim is acts 2 and 3 lasting at least as long as act 1. The
  ticks and a boss's Integrity stay consistent: a boss whose acts run uneven gets its behaviour or mechanics changed
  (the designer, November 2026), never its ticks.

### Act length, measured

Cycles an act, the planner on every subclass, 12 seeds, each boss at its floor (10 where it has none): genesim.mjs
`bossFight`'s loop, noting the cycle each phase starts. Acts 2 and 3 over won fights only. The first eleven rows are
with "Working the ♛" built and the ♛ held at its tick (below); the natives are as they were.

| Boss | ♛ ticks | Act 1 | Act 2 | Act 3 |
|---|---|---|---|---|
| Resident (worm, ransomware) | 60 / 30 | 23.2 | 5.4 | 4.8 |
| RELAY-KING | 60 / 30 | 19.3 | 4.7 | 2.8 |
| REPO MAN | 60 / 30 | 10.1 | 3.9 | 2.8 |
| HOLLOW CHOIR | 60 / 30 | 6.9 | 2.5 | 8.4 |
| CENTRIFUGE | 60 / 30 | 7.5 | 4.8 | 9.7 |
| SHAKEDOWN | 60 / 30 | 8.0 | 4.4 | 7.8 |
| SHOULDER SURFER | 60 / 30 | 15.8 | 4.0 | 4.0 |
| RECURSION | 60 / 30 | 13.1 | 6.4 | 5.2 |
| NIGHT DESK | 60 / 30 | 8.4 | 6.5 | 8.9 |
| BYZANTINE | 60 / 30 | 11.2 | 7.6 | 9.2 |
| CAMSWARM | 60 / 30 | 20.0 | 6.5 | 8.2 |
| DEADBOLT | 60 / 30 | 19.2 | 5.5 | 8.7 |
| TRIPMINE (one phase) | 60 / 30 | 24.8 | 9.0 | |
| HASHLORD | 60 / 30 | 23.0 | 4.2 | 6.7 |
| BACK ORIFICE | 60 / 30 | 20.4 | 2.8 | 6.2 |
| PATCH TUESDAY | 60 / 30 | 23.4 | 4.5 | 2.5 |
| FLOODWALL (one phase) | 60 / 30 | 9.6 | 18.2 | |
| MIRRORSHADE | 60 / 30 | 16.5 | 3.9 | 6.5 |
| SLEEPWALKER (one phase) | 60 / 30 | 24.1 | 8.9 | |
| ECHOLALIA | 60 / 30 | 23.6 | 5.1 | 3.8 |

- Moving the built bosses from 50 / 25 to 60 / 30 took about a cycle off act 1 and added it to acts 2 and 3; their win
  rates moved inside the noise (HASHLORD's reader 59% → 68%).
- **Held at the tick** (November 12): damage takes a ♛ to its next act tick and no further until that act begins,
  on every boss with a ♛ (acts.mjs `actCap`). Before, a second hit in the same cycle went on to the next tick, and act
  2 lasted no cycles in 19% of HOLLOW CHOIR's fights and 10% of REPO MAN's; the natives and the ghostroot Resident had
  no cap at all. RELAY-KING's Crown Hop could land its ♛ on a part already under 30% (6% of its fights): it now hops
  only to a part above 30%, and stays put when none is. No act 2 is skipped. A tick no hit crossed (Integrity set some other way) holds nothing.
  CENTRIFUGE's Phantom had won by carrying the Rotor through 30% to 0 in one cycle; made to play act 3, its reader fell
  to 59%. After a sale the Gavel now drops to every 4 (it was 3), and each sale makes its Surge 30% harder (50%): read
  63%, misread 52%, blind 39%.
- **No boss meets the aim yet**, with "Working the ♛" built (below). NIGHT DESK (8.4 / 6.2 / 8.8) and SHAKEDOWN
  (8.0 / 4.4 / 7.9) are closest: a third act as long as the first, a second still short.

### Working the ♛ (built November 2026)

Each fix as built (floorbosses.mjs, combat.mjs `watchdog` and `secondVoice`, data.mjs `BOSSES` work; crown.test.mjs),
then measured: every subclass, 12 seeds, at the boss's floor. *Crown-only* is the planner with every one-part command
turned on the ♛. Before → after.

| Boss | Built | ♛ | Act 1 | Act 2 | Act 3 | Planner | Crown-only |
|---|---|---|---|---|---|---|---|
| Resident | The ♛ to half the boss. **Watchdog**: every 5 cycles the ♛ stands above its next tick, every other part patches a ◆ | 41 → 50% | 22.1 → 23.2 | 5.3 → 5.3 | 4.4 → 4.7 | 43 → 49% | 15 → 11% |
| RELAY-KING | The ♛ to 45% of the boss | 31 → 45% | 14.5 → 19.3 | 7.1 → 4.7 | 4.3 → 2.8 | 22 → 35% | 0 → 0% |
| REPO MAN | The ♛ to 45% of the boss | 31 → 45% | 8.9 → 10.1 | 3.2 → 2.9 | 3.6 → 2.9 | 94 → 67% | 13 → 14% |
| HOLLOW CHOIR | The second voice joins at the ♛'s full size | 42% | 6.9 → 6.9 | 2.3 → 2.3 | 6.9 → 8.8 | 70 → 68% | 30 → 24% |
| CENTRIFUGE | **Sold**: each sale heals the Rotor ♛ 10% of its max | 55% | 7.5 → 7.5 | 4.8 → 4.8 | 9.7 → 9.7 | 78 → 77% | 68 → 64% |
| SHAKEDOWN | **Leverage**: while a Demand stands, the Collector ♛ loses at most 15% of its max a cycle. The planner works the ♛ first (work.lead) | 60% | 10.6 → 8.0 | 2.8 → 4.4 | 3.7 → 7.9 | 79 → 81% | 93 → 91% |
| SHOULDER SURFER | The Logger ♛ to half the boss (47, 25, 22) | 38 → 50% | 16.5 → 15.8 | 4.0 → 4.0 | 3.9 → 4.0 | 74 → 73% | 23 → 19% |
| RECURSION | **Return** and **Overflow** each push a frame as they start, at 25% of the top frame's max, hardening nothing. Paid for in act 1: a Call every 5 cycles (it was 4) | 56% | 16.0 → 13.1 | 4.1 → 6.3 | 3.1 → 4.9 | 74 → 75% | 52 → 57% |
| NIGHT DESK | **Night shift** clocks in the Night Clerk, a third trader holding one trade (none of its own after), and trades grow 15% a cycle (10%). Paid for in act 1: no trades pending as it opens (2) | 62% | 12.3 → 8.4 | 5.2 → 6.2 | 8.6 → 8.8 | 81 → 85% | 39 → 57% |
| BYZANTINE | **Hard fork** forks at once: every broken Node returns as act 3 starts, at the standing Nodes' average | 33% | 11.2 → 11.2 | 8.5 → 7.9 | 6.2 → 9.0 | 68 → 63% | 11 → 11% |
| CAMSWARM | **Botnet** re-infects: each part you broke returns in its place as a Camera at 30% (the C2 Node as itself) | 49% | 20.0 → 20.0 | 5.1 → 6.5 | 8.6 → 8.2 | 66 → 67% | 0 → 0% |
| The natives | Not built: with their own phases (Proposed: the nine lair bosses, below). Crown-only goes unpunished on TRIPMINE (40% either way) and FLOODWALL (23% → 40%), so their phases need that too | 37–48% | | | | 23–77% | 0–40% |

What the numbers say:

- **Bringing work back lengthens the later acts** (RECURSION, NIGHT DESK, BYZANTINE's act 3, CAMSWARM's act 2), and
  the band holds when act 1 gives up as much pressure as the act gains. Sized as picked, each took its reader out of
  the band (RECURSION 27% with frames at 60%, NIGHT DESK 20% with a Clerk that trades, CAMSWARM 34% with Cameras back
  at full); the numbers above are the largest that keep every band green.
- **Moving health to the ♛ lengthens act 1** while the planner leaves the ♛ for last: act 1 holds every other part
  and 40% of a bigger ♛. REPO MAN's planner loses 27 points to it (its ♛ wears ◆◆◆◆◆ and re-arms at 60%).
- **Working the ♛ early costs the planner wins** (work.lead, planner.mjs `crownNow`: the ♛ is the part to work on while
  it stands further up its bar than the rest). It evens the acts some (Resident 16.0 / 4.9 / 5.1, REPO MAN 8.0 / 3.9 /
  3.5, SHOULDER SURFER 12.5 / 5.0 / 4.9) and drops the reader to 21%, 61% and 48%: the other parts keep hitting while
  the ♛'s ◆ are stripped. The Watchdog punishes leaving the ♛ without making it cheaper to work. Only SHAKEDOWN's
  planner has it, where the ♛ first was already the better play.
- **Crown-only is still the better play on SHAKEDOWN** (91% to 81%). The Collector stops the clock when it breaks, and
  every Deadline a crown-only player lets land pays the clock. A heavier Deadline flips it (Deadline 24, cap 20%:
  planner 53%, crown-only 52%; Deadline 28: 45% to 34%) and takes the reader out of the band, so it wasn't kept.
  It needs a rule that costs the Collector's attacker for each Deadline paid.
- For the designer: the share bosses and the Resident need a reason that makes the early ♛ the cheaper line (a ♛ with
  no ◆ of its own, or other parts that go quiet while the ♛ is being worked), before more health on it helps.

Health moves to the ♛ from the boss's other parts; its total stays. A part that comes back returns in its place with
fresh ticks, as a phase line.

## Built: the three solo bosses

| Boss | Its part | Act 1 | Act 2 (60%) | Act 3 (30%) | The read |
|---|---|---|---|---|---|
| RELAY-KING | Relay: Broadcast every 4, +its hit per fragment | Broadcast | **Crown Hop**: the ♛ moves to the healthiest part above 30% (none: it stays); the old one heals 25% | **Flood**: Replicate every 2, Broadcast every 3 | Clear fragments before a Broadcast; pace the parts so the ♛ hops where you want it |
| REPO MAN | Ledger: Collection every 5, +its hit per Lien | **Liens**: each command a ◆ absorbs adds one; a Collection, landed or cut, clears them | Re-arms every part; a Collection in 3 | **Interest**: each Lien counts twice; a Collection in 3 | Strip with strips, burns or helpers; cut the Collection; cross a tick with the ledger clear |
| HOLLOW CHOIR | A Mimic (its third) | One voice: a beat every 4 | **Second voice**: a second Mimic at the ♛'s full size, beating 2 behind | **Round**: each beat plays back your last three commands | Cut a voice before 30%; hold or fire small in the two cycles before a beat |

Integrity (`BOSSES` in data.mjs): RELAY-KING 1.25× (its Relay is a fourth part), REPO MAN 1.6×, HOLLOW CHOIR 1.4× (its second
voice is as big as its ♛).

They play in P4's acts (GAME_RULES.md "Boss acts"): one ♛ tick a hit, a tell an act, and the ♛ left above its tick until
the act's beat has played (the Broadcast, the Collection, the Mimic's copy), else every part re-arms.

What the bots made of it (a scratch sim, 12 fights a cell, wins %, before → after):

| Boss, level | Planner | Kit | Blind |
|---|---|---|---|
| RELAY-KING 10 | 100 → 67 | 100 → 50 | 50 → 42 |
| RELAY-KING 18 | 100 → 67 | 83 → 75 | 58 → 50 |
| REPO MAN 10 | 92 → 50 | 100 → 42 | 100 → 33 |
| REPO MAN 18 | 100 → 50 | 92 → 50 | 75 → 25 |
| HOLLOW CHOIR 10 | 92 → 33 | 83 → 33 | 83 → 25 |
| HOLLOW CHOIR 18 | 100 → 67 | 100 → 42 | 75 → 17 |

The planner knows only enough to measure: clear fragments before a Broadcast, cut the second voice, and keep a dear
command off the cycles a Round beat will sing. It doesn't avoid Liens. The designer's play is the bar.

The Round's sung notes land at half (`ROUND.echo`) and record only what you fire after it starts: at full, one Flood
fired the cycle the Round began came back as 54% of a level-10 Breaker's bar.

## Proposed: the nine lair bosses (not built)

Each keeps its signature and gains two phases of its own in place of re-arm and a cycle sooner. For the designer to
pick from before they're built.

| Boss | At 50% | At 25% |
|---|---|---|
| DEADBOLT | **Tumblers**: each Deadbolt that lands re-locks the Encryptor | **Double lock**: a second Mutex on the Pulse Node; break both within 2 cycles or the first re-forms |
| TRIPMINE | **Daisy chain**: a second Tripwire; tripping one gives the other a 3-cycle fuse | **Dead man**: breaking the Pulse Node sets off every live wire, so it goes last |
| HASHLORD | Chain Fork (as now) | **51%**: the Pool Lock wards whichever Miner has more Integrity, so keep them even |
| BACK ORIFICE | **Port knock**: every 3 cycles one part is open and takes full damage, the rest half | Its Mirror twins the Replicator (as now) |
| PATCH TUESDAY | **Rollback**: every 5 cycles the part you hit most in the last 3 returns to where it was 3 cycles ago | **Hotfix**: the Patcher brings back the last part you broke at 25%, unless the Patcher went first |
| FLOODWALL | **Spillway**: a delay sends the Flooder's ramp onto the Pulse Node's next hit instead of resetting it | **Levee**: when the Flooder breaks, its ramp moves to the next part |
| MIRRORSHADE | Doppelganger (as now) | **Shatter**: breaking the Doppelganger leaves three shards; each copies your next command |
| SLEEPWALKER | **REM**: one part dozes at a time, taking ×2; hitting it sounds the Alarm for 3 cycles | **Night Terror** every 3 cycles while any part dozes |
| ECHOLALIA | **Reverb**: your commands echo a cycle later at half, onto the part beside it | **Last Word**: the last part standing repeats every hit it took in its final 3 cycles |

## Proposed: floors 2–8 (picked November 2026)

**Built:** CENTRIFUGE, SHAKEDOWN, SHOULDER SURFER, RECURSION, CAMSWARM, NIGHT DESK and BYZANTINE (floorbosses.mjs,
GAME_RULES.md "Floor bosses"; the three floor 4 rows below are as built), their act ticks at 60% and 30% like every boss's. The rest are
not built.

Prototyped as applets (a board an act), with docs/content.md 3.2. How each one plays, phase by phase: docs/boss-guide.md. Each plays in the shape above: three acts, a
signature that changes the fight, a beat, the default move wrong at least once. *Sketched* has no board yet.

**Every act adds a pressure that costs to ignore** (the November audit): the opening carries two at least, so that
answering one costs you on the other, and an act that only tightens a number (sooner, fewer, smaller) is not an act.

| Boss | Floor · where | Act 1 | Act 2 (60%) | Act 3 (30%) |
|---|---|---|---|---|
| SHAKEDOWN 12 | 2 · throne of the Pits | **Ransom Clock**: a 12-cycle clock; at 0 it leaks 30% of your max and restarts at 6. A Deadline you let land pays the ransom (+3); one you call off buys nothing. The Lockbox wards the Demand. **Leverage**: while a Demand stands the Collector loses 15% of its max a cycle at most | **Second demand**: a second Demand, its Deadline on the same cycle | **Final notice**: each leak re-arms the Demand's ◆ and brings the Lockbox back |
| CENTRIFUGE 14 | 2 · floor job | **Bidding**: each Surge the Gavel lands spins it faster (every 4, 3, 2); a delay or Throttle withdraws it to 4. A Surge at every 2 sells: the buyer the Gavel names joins as a part with its crew's rule (TOLLGATE wards the Rotor, SWARMLINE twins the Gavel, PALEMASK veils a part), and heals the Rotor 10% | **Reserve price**: a delay or Throttle only steps the Gavel back one | **Second lot**: each sale brings two buyers |
| SHOULDER SURFER 18 | 3 · floor job | **Replay**: a Sync Window every other cycle. The Logger takes damage only from commands fired in it; each one outside is logged, and at 3 its Dump plays your last command back. The Pulse Node's charges land on the closed cycles | **Again**: on its beat, every 4, it plays your last three commands back in order | **From the top**: the log never clears, and the Dump plays the biggest command logged |
| RECURSION 19 · *new* | 3 · the last room of floor 3's Gauntlets | **Call**: frames stack, main() (the ♛) at the bottom. Your single-target commands reach only the top frame; burns and area hits reach all. Every 5 cycles the top frame pushes a new one at 60% of its max; a frame under 25 can't | **Return**: it pushes a frame at 25% as the act starts; a frame that breaks makes the one beneath attack a cycle sooner at +50% | **Overflow**: one more frame; at 5 frames every frame attacks at once |
| CAMSWARM 24 | 4 · lair | **Telnet Sweep**: every 5 cycles each part under half (never the Hive) hatches a fragment and shields it until that part breaks; each one hatched brings the next sweep a cycle sooner. A fragment that lives 3 cycles becomes a Camera with its own Surge. A hit takes 15% of a part at most | **Botnet**: every Camera fires with the C2 Node's Beacon; a broken C2 Node comes back, and each other part you broke returns as a Camera at 30% | **Lockout**: the Hive boots a Camera, and takes no damage while a Camera stands |
| NIGHT DESK 24 | 4 · floor job | **No Timeout**: its attacks open pending trades on their parts. Hitting a part settles its trades on you at half; at four pending, all settle in full and later trades open 25% bigger. Only the Desk takes damage, 12% a hit at most. Interrupts do nothing | **Night shift**: the Night Clerk clocks in holding one trade; a pending trade grows 15% a cycle | **Finality**: each trade you settle heals the Desk 4% |
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
