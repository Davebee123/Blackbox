# Puzzle fights: fights that need you watching

Draft, October 27, 2026, for the designer's review. Nothing in it is built.

docs/progression.md "How solved fights are" measured the class-balance fights twice: once with the planner, which
reads every rule, tell and timer, and once with a blind player, who fires the first ready key on its bar at the first
part on the board. For three classes of four, the blind player still wins 79–100% of fights at every level, and
reading pays only in Signal. It ended on a target: *a fight that is a puzzle should lose a blind player more often
than not, at least from level 18 on.* This sheet says which fights that should be, why today's fights don't do it,
and what would.

The measurements come from `node solved.mjs` and throwaway scripts run against the current code (the balance
harness's 24 fights a bracket, its Tuned gear and its planner). Prototype numbers come from in-memory patches in
those scripts. No game file was changed.

## 0. The short version

| Question | Answer in this design |
|---|---|
| Which fights should be puzzles? | The fights worth the most: Residents, solo bosses, lair bosses and feuds (docs/routines.md, the designer's decisions 1 and 5: *ordinary fights can run on a program; bosses can't*). Ordinary wild fights stay as they are. |
| Are they puzzles today? | No. A blind Breaker, Bastion or Operator wins 83–100% of Resident fights at levels 18 and 30. It pays in Signal: a blind Breaker loses 69% of its Signal to a level-18 Resident, the planner 20%. |
| Why does the blind player win? | Its default move is usually the right one. It answers half the tells by accident, because hitting a part and breaking it are the answers. Fights end in 5 to 14 cycles, with one to three tells said. A landed tell costs a lot of Signal but never ends the fight. |
| Would bigger numbers fix it? | No. Charges five times the plain hit change almost nothing. Doubling every part's Integrity cuts the blind Breaker to 58% wins, and the planner pays for it too: 13 more points of Signal a fight for the Breaker and 20 for the Infiltrator. The blind Operator still wins every fight. |
| What makes a puzzle, then? | A conflict: a moment when the default move is the wrong one. Hold on a beat, break the parts in an order, leave a part standing, spend a key early, answer two clocks with one plan. Most of the pieces exist already (the Mimic, seals, the Tripwire, the Spare, tethers, boss phases). |
| How is it measured? | `solved.mjs` grows a misreader (blind on 30% of cycles) and a set of puzzle fights. From level 18: the planner wins 85% or more, the misreader 60% or more, the blind player 40% or less. |
| What does it cost the player? | Nothing new. A puzzle fight is a boss you choose to engage, telegraphed as today, and losing it is the boss loss it already is. Wild fights don't change. |

## 1. What was measured

### 1.1 Why the blind player wins

Three things, at levels 18 and 30 (the class-balance fights, per class):

| Level | Class | Planner cycles | Tells said a fight | Planner: answered · landed a fight | Blind: answered · landed a fight |
|---|---|---:|---:|---|---|
| 18 | Breaker | 6.2 | 1.7 | 95% · 0.08 | 53% · 1.08 |
| 18 | Bastion | 14.0 | 2.8 | 88% · 0.33 | 49% · 1.46 |
| 18 | Infiltrator | 9.1 | 2.0 | 88% · 0.25 | 33% · 1.54 |
| 18 | Operator | 7.4 | 1.8 | 95% · 0.08 | 94% · 0.21 |
| 30 | Breaker | 6.1 | 1.5 | 95% · 0.08 | 57% · 0.83 |
| 30 | Bastion | 13.2 | 2.6 | 86% · 0.38 | 56% · 1.29 |
| 30 | Infiltrator | 6.8 | 1.8 | 90% · 0.17 | 35% · 1.38 |
| 30 | Operator | 5.7 | 1.8 | 100% · 0.00 | 94% · 0.25 |

- **The answers are what you'd do anyway.** A charge is cut by taking its part across a tick on its cycle, and a tell
  dies with its part. A player who hits the first part on the board every cycle does both by accident about half the
  time.
- **The Operator answers almost every tell blind.** Its helpers hit every cycle and its fights are the shortest, so
  most tells die with their parts or are cut by a helper's hit. Nothing in its kit is wrong to fire at any moment.
- **A landed tell is affordable.** The blind Breaker, Bastion and Infiltrator take one to one and a half landed tells
  a fight from level 18. A wild charge is at most three times the plain hit, so it costs Signal and doesn't end the
  fight.

### 1.2 The Infiltrator measures its own kit

The blind Infiltrator loses on every family alike (13–31% wins at 18 and 30, against 94–100% for the planner), so
its losses don't come from reading the virus. Its kit is a sequence: Tag and Stealth set up the payoff. The blind
player fires the bar in key order, so it fires the payoff first, unset, over and over (Backstab 122 times in 24
fights at level 30). That is playing a rotation, not reading a fight. `solved.mjs` should tell the two apart (section
5).

### 1.3 By family

Blind wins and Signal lost, 16 fights a cell at level 18 (the planner wins 94–100% of every cell):

| Family | Breaker | Bastion | Infiltrator | Operator |
|---|---|---|---|---|
| Ransomware | 100% · 47% | 100% · 37% | 19% · 96% | 100% · 21% |
| Worm | 94% · 50% | 56% · 73% | 25% · 88% | 100% · 18% |
| Ghostroot | 88% · 66% | 88% · 64% | 13% · 98% | 100% · 31% |

The Worm takes wins from the blind Bastion (56% at 18, 50% at 30): its fragments gnaw while the blind player hits
the wrong part, and the Bastion's fights are long enough for that to add up. That is a conflict (which part first),
and it works. The Ghostroot's Mimic is a conflict too (fire nothing on its beat), and it costs the blind player
Signal but rarely the fight: one beat a fight, played back once.

### 1.4 The fights worth the most

Wins for the planner · the misreader (blind on 30% of its cycles, docs/genome.md 11.2) · the blind player. Elites:
12 fights a cell. The Resident: 6. Solo bosses: DEADBOLT, TRIPMINE, RELAY-KING, MIRRORSHADE, PATCH TUESDAY and HOLLOW CHOIR,
two seeds each.

| Level | Fight | Breaker | Bastion | Infiltrator | Operator |
|---|---|---|---|---|---|
| 18 | Resident | 100 · 100 · 100 | 83 · 83 · 83 | 100 · 100 · 0 | 100 · 100 · 100 |
| 18 | Solo bosses | 83 · 75 · 92 | 100 · 75 · 67 | 92 · 50 · 0 | 100 · 100 · 100 |
| 18 | Elites | 17 · 17 · 0 | 50 · 67 · 25 | 17 · 0 · 0 | 33 · 25 · 42 |
| 30 | Resident | 100 · 100 · 83 | 83 · 83 · 83 | 100 · 83 · 17 | 100 · 100 · 100 |
| 30 | Solo bosses | 100 · 92 · 92 | 92 · 100 · 83 | 92 · 83 · 0 | 100 · 100 · 92 |
| 30 | Elites | 67 · 42 · 0 | 100 · 50 · 25 | 50 · 17 · 0 | 33 · 67 · 33 |

The Residents and solo bosses are fights the blind player wins, more slowly and for more Signal. docs/routines.md
promised that these fights would need you watching, and today they don't. The elites are the other way round: in the
harness they beat the planner too (17% for the Breaker at 18), so they are walls, not puzzles. A wall isn't
answered by attention, only by level or a crew.

### 1.5 Bigger numbers don't make a puzzle

In-memory patches at level 18. Blind wins, then the planner's Signal lost (the planner's wins were 88–100%
throughout):

| Patch | Breaker | Bastion | Infiltrator | Operator |
|---|---|---|---|---|
| None (today) | 88% · 23% | 92% · 25% | 29% · 26% | 100% · 19% |
| Wild spike cap 45% → 80% | 88% · 23% | 92% · 25% | 29% · 26% | 100% · 19% |
| Charges ×5 (cap 50% of your max) | 88% · 23% | 92% · 29% | 21% · 28% | 100% · 20% |
| Charges ×5, parts ×1.5 Integrity | 79% · 26% | 88% · 22% | 8% · 34% | 100% · 25% |
| Parts ×2 Integrity | 58% · 36% | 79% · 25% | 13% · 46% | 100% · 34% |
| Charges ×5, parts ×2 Integrity | 58% · 40% | 79% · 28% | 4% · 52% | 100% · 38% |

The cap never binds: charges are already under it. Bigger charges hardly matter, because the blind player answers
half of them by accident and the rest it can afford. Longer fights work, but they work by making every fight harder:
the planner pays nearly as much as the blind player gains, and the Operator's helpers still win every blind fight.
A puzzle has to come from the decisions, not from the numbers.

## 2. What a puzzle fight is

- **The fights worth the most, and only those.** Residents, solo bosses, lair bosses and feuds. Ordinary wild fights,
  guards and invasions stay as they are: a rotation wins them, and reading pays in Signal and in the read bonus. That
  keeps the designer's rule (*reward attention, never punish its absence*): you choose to engage a boss, and the
  ordinary game never asks you to watch.
- **The default move is wrong at least once a fight.** Every puzzle fight has a moment when the move a rotation makes
  (hit the part in front of you with the first ready key) loses the fight or comes close. Reading the board is how you
  find that moment.
- **Everything is on the board.** The answer can be found from what the board shows: tells, timers, tethers and the
  part's tooltip. A veiled part keeps its answer (strip it, or Tag it). The same boss is the same fight every time
  (docs/genome.md 7), so a fight you lost is a fight you can learn.
- **Every class has an answer** (docs/genome.md rule 4, docs/parts-plan.md "Principles"), from its core skills and
  SIGINT, not only from a subclass line.
- **A misread is telegraphed.** A puzzle fight loses you by a move you could see coming three cycles out, never by
  a surprise. The tell's chip and its ▸ line stay as they are.
- **Show it, don't explain it.** A puzzle fight looks like any fight. Its conflicts read as board marks (tells,
  tethers, a beat), and the sentences live in tooltips and the Codex.

## 3. The levers: conflicts

Each lever is a moment when the default move is wrong. Most of them are rules that exist in one place today; a
puzzle fight uses them on purpose and more than once.

| Lever | The conflict | What a blind player does | Built from |
|---|---|---|---|
| **The beat** | Fire nothing with a direct hit this cycle. | Fires into it, and its hit comes back at it. | The Mimic (Ghostroot, from 8). A puzzle fight's beat comes every few cycles, not once. |
| **The order** | Break the parts in a given order. The wrong one first sets something off. | Breaks whatever is first on the board. | The Tripwire (16), the Spare (14), the Mirror's twin, the Mutex's lock, the Lockbox's ward. |
| **The one to leave** | A part that must stand until a phase is done. Its ticks start phases and cut nothing. | Hits it from the start, so its phases come before the other parts are dealt with. | A boss's ♛ part (the boss rule). |
| **Two clocks** | Two tells due on the same cycle, on different parts. One cut a cycle, so one has to be answered early: delay it, strip ahead of it, or SIGINT it. | Answers one, by accident. | The tells as built. Today's *no pile-ups* rule forbids it; a puzzle fight lifts the rule, and every such fight is checked to be winnable (section 5). |
| **Strip before** | A seal that re-arms every part if its part still wears ◆ when it lands. | Strips the part it happens to be hitting. | Seals (elites and bosses, from 6). A puzzle fight's seal sits on a part the rotation doesn't reach first. |
| **Save the key** | A cast only SIGINT answers (its part can't be cut in its window), so SIGINT spent on the wrong thing loses it. | Fires SIGINT when it's ready, or never. | Casts and SIGINT (from 10). |
| **Phases** | The fight runs as three or four phases of a few cycles each, so three or four tells get their turn. | Lives long enough to meet them. | Boss phases. This replaces "more Integrity" (1.5): the fight is longer because it has more to read, not because the parts are bigger. |

A puzzle fight uses two or three levers, never all of them: one beat or one order, plus the clocks. One rule a part
still holds (docs/parts-plan.md "One part, one rule").

**The Operator** is the hard case. Its helpers hit every cycle, so they cut, strip and break things on
their own, and an order or a beat can be broken by a helper the player never aimed. Two ways to handle it: helpers
respect a beat (they hold on it, and a helper's hit on a beat plays back like yours), or the Operator's puzzle fights
lean on the levers helpers can't trip (two clocks, save the key). Section 8 asks.

## 4. Where they live

| Option | What it is | For | Against |
|---|---|---|---|
| **A. The bosses** (recommended first) | Residents, solo bosses, lair bosses and feuds become puzzle fights. | Already the fights worth the most, already authored, already the same fight every time. The routines design promised it. | A Resident stands between you and a server. A puzzle there is a gate for a player who doesn't want one. |
| **B. A fifth puzzle room** | *Debugger, Step through it*: a seeded fight board in a room at the end of a branch, like the four puzzle rooms. A loss ends the board (FAILED until it refills) and costs no Signal and no pack. | A place to learn puzzle fights with no stakes. It fits the puzzle rooms' one rule (*played to its end, won or lost, done until it refills*). | A fight that isn't a fight. It needs its own end card. |
| **C. Elites** | Turn the elites from walls into puzzles: less Integrity, more conflicts. | They hold the vault key, so every server has one. | They're on the main road of a server. Needs its own balance pass (1.4 says they beat the planner today). |
| **D. Every fight from level 18** | What progression.md's line could be read as asking for. | One rule everywhere. | Punishes the absence of attention in the ordinary game, which the designer ruled out. Not recommended. |

Recommended: A, starting with two Residents and two solo bosses, then B if the designer wants a place to practise. C
waits for its own measurement.

If A makes a Resident too much of a gate, the Resident can keep a fallback: a player who loses to it twice on a visit
meets it without its puzzle the third time. Section 8 asks.

## 5. How it's measured

`solved.mjs` today plays the planner against the blind player on the class-balance fights. It grows three things:

1. **The misreader**, blind on 30% of its cycles (docs/genome.md 11.2): the stand-in for a person.
2. **The rotation player**, blind to the virus but not to its own kit: it plays its subclass's `rotation` preset in
   order, at the part that attacks soonest. It separates reading the virus from playing your kit, which the
   Infiltrator's numbers mix up today (1.2).
3. **The puzzle set**: every puzzle fight, at its own level, +4 and +10 levels, every subclass, six seeds.

| Fights | Planner wins | Misreader wins | Blind and rotation wins | Planner's Signal lost |
|---|---|---|---|---|
| Wild, guards, invasions | 85% or more (as today) | — | No bound | The solo band (15–50%), as today |
| Puzzle fights, levels 10–17 | 85% or more | 60% or more | 60% or less | The boss band |
| Puzzle fights, from 18 | 85% or more | 60% or more | 40% or less | The boss band |

A puzzle fight that misses its row doesn't ship. Like the Hunter chase's dens (*every den is searched first*), a fight
that lifts *no pile-ups* is checked when it's authored: the planner must win it on every class at its level, so two
clocks never become two clocks with no answer. The checks go in a `puzzlefights.test.mjs`, slow-suite like the
balance simulation.

**Routines.** A routine playing a puzzle fight should score like the rotation player: it survives some, badly, and it
can't farm them (docs/routines.md section 2). Its rails (auto jack-out, stop before danger) carry the cost, as today.

## 6. What it pays

Nothing is taken away for not reading, in puzzle fights or anywhere else. Reading already pays: each tell read adds a
tenth of the kill's XP, up to 40%, and reading every tell in a fight rolls its loot once more. A puzzle fight keeps
those and adds:

- **Solved**, on the win card, when every tell was read and none landed: a row like *Clean*. What it pays is the
  read bonus and the second loot roll it already counts; the row says you found the answer.
- **Achievements**, cosmetic only: a boss solved, every Resident on a floor solved, a puzzle fight solved by each
  class.

## 7. Build phases

| Phase | What ships | Done when |
|---|---|---|
| P0 | `solved.mjs`: the misreader, the rotation player and the boss set. No game change. | Section 1.4's table, with the rotation player's column, is in progression.md. |
| P1 | The levers as boss rules: a beat that repeats, *no pile-ups* lifted for puzzle fights, phases. Two Residents and two solo bosses rebuilt as puzzle fights. | Their rows meet section 5's targets, and the designer has played them. |
| P2 | The rest of the solo bosses, lair bosses and feuds. | Every puzzle fight meets its row. |
| P3 | The Debugger room, if picked. | Its board, end card and tests, as the puzzle rooms. |
| P4 | Elites, if picked. | Their own balance pass. |

## 8. Decisions for the designer

1. **Which fights are puzzles.** Bosses only (recommended), or bosses plus the Debugger room, plus elites?
2. **The bar.** Blind wins 40% or less from level 18, or the line's *more often than not* (under 50%)?
3. **Residents as gates.** Keep a Resident's puzzle every time, or meet it without its puzzle after two losses on a
   visit?
4. **The Operator.** Helpers respect a beat (they hold on it, and a helper's hit on a beat plays back), or the
   Operator's puzzle fights lean on the levers helpers can't trip?
5. **Pile-ups.** Lift *no pile-ups* in puzzle fights only, checked fight by fight?
6. **The Infiltrator in ordinary fights.** Its kit loses ordinary wild fights blind (29–63% wins from 18), which the
   other classes don't. Is that the class's identity, or the absence of attention punished where it shouldn't be?
   Its rotation preset run blind (P0) will say how much is the kit and how much is key order.
7. **Elites.** They beat the planner too in the harness (17–67% wins for the Breaker). Walls for a crew or a higher
   level, or puzzles?
