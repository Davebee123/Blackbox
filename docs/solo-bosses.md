# Solo bosses: the review sheet

The bosses that fight you alone (docs/puzzle-fights.md P4). The rules as built are in GAME_RULES.md "Solo bosses".

The designer, October 31, 2026: *"Bosses need to be mechanically unique and difficult to fight. Like really pushing your
ability to kill. The most puzzles out of all encounters."* Before this, RELAY-KING, REPO MAN and HOLLOW CHOIR were a
family virus at 1.6× Integrity with one stock phase: the kit player (blind to the boss) won 83–100%.

## The shape

- **Three phases**: the opening, then one at each of the ♛ part's ticks (50%, 25%). Each phase adds a mechanic. A stock
  phase (re-arm, a cycle sooner) is never a phase on its own.
- **A part of its own**, with a rule, on top of its family's: the boss's signature, shown on its row.
- **You choose when**: the ♛ ticks are yours to cross, so each phase starts when you are ready for it.

## Built: the three solo bosses

| Boss | Its part | Opening | At 50% | At 25% | The read |
|---|---|---|---|---|---|
| RELAY-KING | Relay: Broadcast every 4, +its hit per fragment | Broadcast | **Crown Hop**: the ♛ moves to the healthiest part; the old one heals 25% | **Flood**: Replicate every 2, Broadcast every 3 | Clear fragments before a Broadcast; pace the parts so the ♛ hops where you want it |
| REPO MAN | Ledger: Collection every 5, +its hit per Lien | **Liens**: each command a ◆ absorbs adds one; a Collection, landed or cut, clears them | Re-arms every part; a Collection in 3 | **Interest**: each Lien counts twice; a Collection in 3 | Strip with strips, burns or helpers; cut the Collection; cross a tick with the ledger clear |
| HOLLOW CHOIR | A Mimic (its third) | One voice: a beat every 4 | **Second voice**: a second Mimic, beating 2 behind | **Round**: each beat plays back your last three commands | Cut a voice before 25%; hold or fire small in the two cycles before a beat |

Integrity (`BOSSES` in data.mjs): RELAY-KING 1.25× (its Relay is a fourth part), REPO MAN 1.6×, HOLLOW CHOIR 1.4× (its second
voice is a boss-sized part).

What the bots made of it (`node solved.mjs bosses`; the scratch sim, 12 fights a cell, before → after):

| Boss, level | Planner | Kit | Blind |
|---|---|---|---|
| RELAY-KING 3 | 92 → 67 | 83 → 50 | 50 → 17 |
| RELAY-KING 10 | 100 → 67 | 100 → 75 | 50 → 50 |
| REPO MAN 10 | 92 → 67 | 100 → 75 | 100 → 33 |
| REPO MAN 18 | 100 → 50 | 92 → 75 | 75 → 50 |
| HOLLOW CHOIR 10 | 92 → 58 | 83 → 67 | 83 → 25 |
| HOLLOW CHOIR 18 | 100 → 75 | 100 → 42 | 75 → 25 |

The planner knows only enough to measure: clear fragments before a Broadcast, and cut the second voice. It doesn't avoid
Liens or go quiet before a Round beat (holding two cycles cost it more than the Round). The designer's play is the bar.

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
