# Solo bosses: the review sheet

The bosses that fight you alone (docs/puzzle-fights.md P4). The rules as built are in GAME_RULES.md "Solo bosses".

The designer, October 31, 2026: *"Bosses need to be mechanically unique and difficult to fight. Like really pushing your
ability to kill. The most puzzles out of all encounters."* Before this, RELAY-KING, REPO MAN and HOLLOW CHOIR were a
family virus at 1.6× Integrity with one stock phase: the kit player (blind to the boss) won 83–100%.

## The shape

- **Three acts**: the opening, then one at each of the ♛ part's ticks (50%, 25%). Each act adds a mechanic. A stock
  phase (re-arm, a cycle sooner) is never an act on its own.
- **A part of its own**, with a rule, on top of its family's: the boss's signature, shown on its row.
- **You choose when**: the ♛ ticks are yours to cross, so each phase starts when you are ready for it.

## Built: the three solo bosses

| Boss | Its part | Act 1 | Act 2 (50%) | Act 3 (25%) | The read |
|---|---|---|---|---|---|
| RELAY-KING | Relay: Broadcast every 4, +its hit per fragment | Broadcast | **Crown Hop**: the ♛ moves to the healthiest part; the old one heals 25% | **Flood**: Replicate every 2, Broadcast every 3 | Clear fragments before a Broadcast; pace the parts so the ♛ hops where you want it |
| REPO MAN | Ledger: Collection every 5, +its hit per Lien | **Liens**: each command a ◆ absorbs adds one; a Collection, landed or cut, clears them | Re-arms every part; a Collection in 3 | **Interest**: each Lien counts twice; a Collection in 3 | Strip with strips, burns or helpers; cut the Collection; cross a tick with the ledger clear |
| HOLLOW CHOIR | A Mimic (its third) | One voice: a beat every 4 | **Second voice**: a second Mimic, beating 2 behind | **Round**: each beat plays back your last three commands | Cut a voice before 25%; hold or fire small in the two cycles before a beat |

Integrity (`BOSSES` in data.mjs): RELAY-KING 1.25× (its Relay is a fourth part), REPO MAN 1.6×, HOLLOW CHOIR 1.4× (its second
voice is a boss-sized part).

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

## Proposed: floors 5–8 (picked November 2026, not built)

Prototyped as applets (a board an act), with docs/content.md 3.2. Each plays in the shape above: three acts, a
signature that changes the fight, a beat, the default move wrong at least once. *Sketched* has no board yet.

| Boss | Floor · where | Act 1 | Act 2 (50%) | Act 3 (25%) |
|---|---|---|---|---|
| GRACE PERIOD 28 · *new* | 5 · lair | **Grace**: each part has 3 cycles' grace; your command on it pays it up. Left alone it lapses: full ◆, and its next attack is a charge | **Reinstatement**: a lapsed part hits 25% harder until its ◆ are stripped again | **Acceleration**: grace is 2 cycles, and a lapse takes a cycle off every other part |
| PARASITE 32 · *sketched* | 5 · lair | **Host Takeover** (docs/genome.md 7.4) | **Spare Tap**: a broken Tap boots back 2 cycles later at 60% | **Gorge**: every 4 cycles it eats its fragments to heal the ♛ by what they had left |
| EXIT NODE 30 | 5 · floor job | **Rollback**: every 6 cycles it restores every bar, its and yours, to an image taken 2 cycles before. Its acts ride its three backups, v7, v6, v5: a broken one stays broken | **Older image**: taken 4 cycles before | **Cold image**: one image, taken as v6 broke, for every restore |
| ACTUARY 40 | 5 · its hub's Core, sealed until 40 | **Premium paid**: one part is insured, the tag moving in a fixed order a cycle ahead; damage on it is refunded. A landed tell raises the premium 15, an answered one lowers it 15; its hits grow 1% a point | **Write-off**: the Cancel Job wakes; every 5 cycles it breaks the most damaged uninsured part and what it had left lands on you | **Finality**: the premium is set to 60. Insured parts take nothing, and the Model is insured at 50 or more. Each cycle the part just uncovered charges, landing in 2. The last part beside the Model is never written off |
| RING ZERO 34 | 6 · lair | **Hook**: one key is hooked, moving every 3 cycles (shown a cycle ahead). It still fires, but onto the Hook, which replays what it holds every 4 cycles. Breaking the Hook frees the key for 3. Never key 1 or SIGINT | **Second hook**: two keys at once | **Ring 0**: the key you fired last is hooked next |
| BRICKWALL 36 · *sketched* | 6 · lair | **Bricklaying**: every 3 cycles a ◆ on the part you hit last | **Rage**: a part at 5 ◆ hits ×1.5 until stripped below 3 | **Two at once**: a ◆ on each of the two parts you hit last |
| BULKHEAD 36 | 6 · floor job | **Closure** (docs/story-script.md): every 3 cycles, after a cycle's notice, the Lock seals the deepest open floor; its Integrity becomes ◆ on the Lock | **Pressure**: a sealed floor's attacks keep counting; break the Lock and all of it lands | **Final notice**: one notice for every floor still open, 2 cycles, then all seal |
| BLACKOUT 34 | 6 · throne of the Pits | **Rolling Blackout** (docs/genome.md 7.4) | acts to write | acts to write |
| PAY RUN 40 · *new* | 7 · lair | **Payday**: its parts never attack alone. Every 4 cycles the Batch lands one hit for each part standing; a part's share grows 10% a cycle since your command last hit it | **Back pay**: a part broken between paydays hands its share, and half again, to the next | **Settlement**: a payday heals the ♛ by what lands on you |
| BIT BUCKET 42 · *sketched* | 7 · lair | **/dev/null**: the first 30% of your damage each cycle is discarded, 5% more a ◆ it wears | **Flush**: every 4 cycles what it discarded returns as one hit | **Pipe**: it discards your largest hit instead |
| GOLDEN PARACHUTE 38 | 7 · floor job | **Severance** (docs/genome.md 7.4) | **Vesting**: every part hits 4% harder a cycle it has stood this act | **The Parachute**: it jacks out in 4 cycles; gone, it's back next visit, no loot |
| SUMP 44 · *new* | 7 · the funnel's point | **Runoff**: a fifth of your damage collects in the Sump. Every 5 cycles the Pump heals the ♛ by half of it; breaking the Sump flushes it onto you and every part alike, and it re-forms empty in 3 | **Overflow**: at 300 it flushes on its own, onto you only | **Drain open**: all your damage to the ♛ runs down |
| HALT AND CATCH FIRE 46 | 8 · lair | **Heat** rises 8 a cycle, its hits grow 1% a point. A tick crossed on a Rig vents 25. At 100 it blows: 20% of max off you and every part, back to 40 | **Runaway**: a vent leaves you Overheated (cooldowns 1 longer for 2 cycles) | **Halt**: at 100 it halts 2 cycles, nothing hittable, then every skipped attack lands |
| THUNDERING HERD 47 · *new* | 8 · lair | **Herd**: workers sleep; the Listener adds one every 4. A hit that doesn't break a sleeping worker wakes them all to bite once | **Accept**: every 5 cycles the Listener wakes them itself; a worker hit while awake wakes nobody | **Stampede**: after each wake one more stays awake for good |
| CORE DUMP 48 · *new* | 8 · floor job | **Ghosts**: its parts are ACTUARY's. A broken part stays as a ghost repeating its last attack at half every 3 cycles; each part alternates a small and a big one | **Reload**: every 6 cycles the hardest-hitting ghost returns as a part at 30% | **Full dump**: every attack the ♛ lands stays as an echo |

**INIT** (50, Bedrock's deepest Core) has five acts. Its health is the process table, drawn as squares, one a percent:
97% at the start, won at 61%. Each act starts as the table crosses its mark, and keeps every rule before it.

| Act | Rule |
|---|---|
| 1 · Adoption (97%) | It adopts an orphan each cycle. One broken in one hit or while Open frees 2%; one left three cycles is re-parented, +1% |
| 2 · Zombies (90%) | An orphan broken over more than one hit is a zombie: it frees nothing and holds its slot. Every 4 cycles INIT reaps them, a hit each |
| 3 · Fork (83%) | Orphans wear ◆; one that survives a hit forks a copy with what it has left |
| 4 · Table full (76%) | With five standing INIT can't adopt, and nothing new of yours starts (helper, burn, shield, buff). Hits still land |
| 5 · Still filling (68%) | Brandt & Vey's orphans. The table rises 1% every cycle on its own |
