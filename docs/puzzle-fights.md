# Puzzle fights: fights you read, or prepare for

Which fights are puzzles, the bar they're measured against, and the phases. Built: P0 (`solved.mjs`), P1 (the program
fits the trick; helpers count), P2 (one lever a fight, docs/puzzle-levers.md) and P3 (elites: a clash); the rules are
in GAME_RULES.md "Fights". Left: P4 (bosses) and section 6's pay. Code cites this doc by section number.

The designer: every fight a little tricky, elites and bosses harder, the game challenging. A puzzle, never a wall. A
blind player loses; paying attention wins, and so does the right routine.

## 2. What a puzzle fight is

- **Two tiers.** Ordinary fights (wild viruses, guards, invasions) carry one conflict from level 6. Elites and bosses
  (Residents, solo bosses, lair bosses, feuds) carry two or three.
- **The default move is wrong at least once a fight**, and reading the board is how you find when.
- **Watch, or prepare.** An ordinary fight's conflict can always be answered by a handler built from your research, so
  a prepared routine wins as often as watching. Elites need a mastered part's chips. Bosses stay yours alone.
- **A puzzle, never a wall.** The planner wins 85% or more of every fight at its level.
- **Everything is on the board**: tells, timers, tethers, the tooltip. The same boss is the same fight every time.
- **Every class has an answer** from its core skills and SIGINT, not only from a subclass line.
- **A misread is telegraphed** three cycles out, never a surprise.

### 2.1 Hard to learn, rewarding to learn

The designer: *"The mechanics should be difficult and rewarding to learn. Think Elden Ring."*

- A first try at an elite or a boss usually fails, and the loss teaches: the next try is the same fight.
- Hard, never unfair: nothing lands unannounced, nothing is hidden that research or a strip can't show.
- What you learn stays learned: part research keeps counting and opens routine chips.
- Help is there at a price: a higher level or a crew makes a misread survivable, not unnecessary.
- You choose the risk: an elite or boss shows on the map, and `jack out` banks your pack before it.

## 3. The levers: conflicts

| Lever | The conflict | Built from |
|---|---|---|
| **The beat** | The Mimic copies whatever you fire on its beat (docs/puzzle-levers.md 3.1). | The Mimic, the Decoy; an elite's or boss's beat repeats. |
| **The order** | The wrong part first sets something off. | The Tripwire, the Spare, the Mirror's twin, the Mutex, the Lockbox. |
| **Strip before** | A seal re-arms by the ◆ left on its part. | Seals. |
| **Save the key** | A cast and a charge compete for one SIGINT. | Casts, charges and SIGINT. |
| **Two clocks** | Two tells due on one cycle, on different parts: answer one early. | Elites and bosses only (*no pile-ups* lifted, checked fight by fight). |
| **The one to leave** | A part that must stand until a phase is done. | A boss's ♛ part. |
| **Phases** | Three or four short phases, so three or four tells get their turn. | Boss phases, in place of more Integrity. |

An ordinary fight takes one of the first four, an elite two, a boss two or three.

### 3.1 The program fits the trick

The designer: *"The default program should have players allocate the program to fit the trick."*

- **The rotation knows your kit, not the virus.** It plays your skills well and reads timers, and answers no lever.
- **The answer is a handler, and a handler costs RAM.** Each lever brings a WHEN chip and a preset once its part's
  rule is researched (docs/puzzle-levers.md 7).
- **Hold** (a DO chip that fires nothing) comes with every program from level 8, at no RAM of its own.
- **A trick with no handler is an exception**: the program plays the rest and leaves that part to you.

### 3.2 The Operator: helpers count

A Deploy is four cycles of hits set going now, so the Operator's puzzle is where its helpers will be in three cycles.

1. A helper's hit is your hit on every lever: it trips a Tripwire, wakes a Spare, starts a ♛ part's phases.
2. The beat catches the helpers on its part, never past the tell ceiling.
3. Only helpers sent after the beat was said are caught.
4. Where a helper moves on is shown: a dashed teal tether.
5. Helpers still never cut a tell on their own (Kill Switch and Reroute make their hits yours).

## 4. Where they live

| Tier | Fights | Conflicts | Planner's Signal lost |
|---|---|---|---|
| Ordinary | Wild viruses, guards and invasions, from level 6 | One, that a routine can answer | The solo band (15–50%) |
| Hard | Elites, Residents, solo bosses, lair bosses, feuds | Two or three | The boss band |

- **Elites are puzzles** (P3, built): Integrity ×1.5 and hits ×0.7 (from ×5.2 and ×1.3), difficulty back as a clash.
- **Residents keep their puzzle every time**: no fallback after a loss.
- **The Debugger room** (a practice board whose loss costs nothing) is parked.

## 5. How it's measured

`node solved.mjs` plays each fight with eight players on the same seeds: the **planner** (reads everything), the
**routine** player (research at the fight's tier, the routine fitted to the trick), the **rotation** (no routine), the
**learner** (the kit player's move on 30%, 15% or 5% of its cycles: a first try, a few tries in, learned), the **kit**
player (blind to the virus, not to its kit) and the **blind** player (the first ready key at the first part). The bar,
floors only:

| Fights | Planner | Routine | Learner 30 · 15 · 5 | First try (learner 30) |
|---|---|---|---|---|
| Ordinary | 85% or more | 85% or more | 70 · 80 · 85% or more | — |
| Elites | 85% or more | 60% or more (mastered chips) | 35 · 60 · 85% or more | under 50% |
| Bosses and Residents | 85% or more | — (yours alone) | 20 · 50 · 85% or more | under 50% |

The kit and blind columns are information, with no ceiling (decision 13); docs/puzzle-levers.md 6's no-fixed-rule test
and the designer's play judge a lever.

### How solved fights are

`node solved.mjs 10 18 30`, October 29, 2026: wins %, the lowest and highest of the four classes.

| Level | Fights | Planner | Routine | Rotation | Learner 30 | Learner 5 | Kit | Blind |
|---:|---|---|---|---|---|---|---|---|
| 10 | Ordinary | 96–100 | 92–100 | 88–96 | 100 | 100 | 88–96 | 71–100 |
| 18 | Ordinary | 100 | 96–100 | 92–100 | 96–100 | 100 | 92–100 | 21–100 |
| 30 | Ordinary | 100 | 96–100 | 92–100 | 96–100 | 100 | 96–100 | 38–100 |
| 10 | Elites | 83–100 | 67–100 | 50–83 | 83–100 | 92–100 | 42–83 | 17–100 |
| 18 | Elites | 92–100 | 75–100 | 67–100 | 83–100 | 92–100 | 75–100 | 0–100 |
| 30 | Elites | 92–100 | 83–100 | 75–100 | 83–100 | 92–100 | 67–100 | 8–100 |
| 10 | Residents | 67–100 | — | — | 83–100 | 67–100 | 100 | 67–100 |
| 18 | Residents | 83–100 | — | — | 83–100 | 83–100 | 83–100 | 0–100 |
| 30 | Residents | 83–100 | — | — | 83–100 | 83–100 | 100 | 17–100 |
| 10 | Solo bosses | 58–100 | — | — | 58–100 | 58–100 | 58–83 | 42–100 |
| 18 | Solo bosses | 83–100 | — | — | 83–100 | 83–100 | 75–92 | 0–100 |
| 30 | Solo bosses | 83–100 | — | — | 83–100 | 83–100 | 67–100 | 8–92 |

- **Ordinary fights meet the bar** at every level. Blind play still wins most of them except as an Infiltrator (21% at
  18, 38% at 30) and a Bastion (75% from 18); the blind Operator wins every one.
- **Elites meet their floors** (P3's numbers, October 30), but for the Infiltrator's planner at 10: 83%, one fight in
  12 (a Front End fronts the Scrambler, so Possession can't be cut).
- **No learning curve on hard fights yet**: a first try wins about what a learned one does, so every elite, Resident
  and boss row misses its first-try ceiling. Bigger tells don't make one (elite charges ×2 cost every player alike):
  the learner's misreads seldom fall on a lever's cycle.
- **The planner falls short on some bosses**: the Breaker wins 58% of the solo bosses at 10, the Infiltrator 75%, and
  the Bastion 83% of Residents from 18. P4 needs those answers fixed before its 85% floor means anything.

`node solved.mjs bosses` plays every solo boss at its floor, +4 and +10, and `node solved.mjs operator` the Operator's
helpers.

## 6. What it pays (not built; still wanted?)

Nothing is taken away for not reading. Reading already pays (the read bonus, the second loot roll). Proposed on top:

- **Solved** on the win card when every tell was read and none landed.
- **Achievements**, cosmetic: an elite solved, a boss solved, every Resident on a floor solved, a fight solved by each
  class, a routine that wins a fight with a conflict.

## 7. Build phases

P0 to P3 are built. Each phase is played by the designer before the next starts.

| Phase | What ships | Done when |
|---|---|---|
| P3 (built) | Elites: Integrity down, two conflicts from docs/puzzle-levers.md 4, *no pile-ups* lifted and checked on the roll (a failed roll rerolls). | Elites meet their row (floors met; first try open, as section 5 says). |
| P4 | Bosses: a beat that repeats, phases, the one to leave. Two Residents and two solo bosses first, then the rest, lair bosses and feuds. | Every boss meets its row, solved, not outgeared, at its level (decision 14), and the designer has played the first four. |

## 8. Decided

The designer, October 2026:

1. **Which fights:** *"Most fights should be slightly tricky, with bosses and elites being harder."*
2. **The bar:** *"I want the game to be challenging"*; elites and bosses lost on a first try and won once learned.
3. **Residents as gates:** no fallback.
4. **The Operator:** helpers count on every lever (section 3.2).
5. **Pile-ups:** lifted for elites and bosses, checked fight by fight.
6. **Routines:** *"Paying attention should be rewarded, but also making the correct routine should also be rewarded."*
7. **Elites:** *"Puzzles versus walls always."*
8. **Hold:** every program has it from level 8.
9. **The program:** *"The default program should have players allocate the program to fit the trick."*
10. **A learning try's cost** is unchanged: *"You know the risk of the fight before entering. You can always jack out
    before combat."*
11. **The ramp:** *"They seem steep enough."*
12. **Difficulty first, answers after:** gear, talents and scripts that answer a lever come later, as their own design.
13. **Nuance, not a bot's bar:** the blind and kit ceilings are gone (docs/puzzle-levers.md 9).
14. **First tries:** *"Bosses especially should not be killable on the first try unless you are in insane gear"*, though
    not strictly: *"in a lot of MMOs, bosses are designed to need to be solved."* A boss is a fight you learn: at its
    level a first try usually loses and a learned one wins. Only being overleveled for it (gear and level well past the
    boss's) carries a first try. Elites lean the same way, less. P4 builds to it; the bar's first-try ceiling (under
    50%) stays the measure.
