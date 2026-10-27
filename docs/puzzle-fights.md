# Puzzle fights: fights you read, or prepare for

Draft, October 27, 2026. The designer answered the first round of questions the same day (section 8). Nothing in it
is built.

docs/progression.md "How solved fights are" measured the class-balance fights twice: once with the planner, which
reads every rule, tell and timer, and once with a blind player, who fires the first ready key on its bar at the first
part on the board. For three classes of four, the blind player still wins 79–100% of fights at every level, and
reading pays only in Signal. It ended on a target: *a fight that is a puzzle should lose a blind player more often
than not, at least from level 18 on.* This sheet says which fights that should be, why today's fights don't do it,
and what would.

The designer's direction: every fight should be a little tricky, elites and bosses harder, and the game challenging.
A puzzle, never a wall. A blind player should lose, and two things should win: paying attention, and having written
the right routine.

The measurements come from `node solved.mjs` and throwaway scripts run against the current code (the balance
harness's 24 fights a bracket, its Tuned gear and its planner). Prototype numbers come from in-memory patches in
those scripts. No game file was changed.

## 0. The short version

| Question | Answer in this design |
|---|---|
| Which fights should be puzzles? | All of them, in two tiers. Ordinary fights (wild viruses, guards, invasions) are a little tricky: one conflict a fight. Elites and bosses (Residents, solo bosses, lair bosses, feuds) are hard: two or three. |
| Are they puzzles today? | No. For three classes of four, a blind player wins 79–100% of ordinary fights, and 83–100% of Resident fights at levels 18 and 30. Reading pays in Signal: a blind Breaker loses 69% of its Signal to a level-18 Resident, the planner 20%. The elites are walls: they beat the planner too. |
| Why does the blind player win? | Its default move is usually the right one. It answers half the tells by accident, because hitting a part and breaking it are the answers. Fights end in 5 to 14 cycles, with one to three tells said. A landed tell costs a lot of Signal but never ends the fight. |
| Would bigger numbers fix it? | No. Charges five times the plain hit change almost nothing. Doubling every part's Integrity cuts the blind Breaker to 58% wins, and the planner pays for it too: 13 more points of Signal a fight for the Breaker and 20 for the Infiltrator. The blind Operator still wins every fight. |
| What makes a puzzle, then? | A conflict: a moment when the default move is the wrong one. Hold on a beat, break the parts in an order, leave a part standing, spend a key early, answer two clocks with one plan. Most of the pieces exist already (the Mimic, seals, the Tripwire, the Spare, tethers, boss phases). |
| What wins one? | Watching, or the right routine. An ordinary fight's conflict can always be answered by a handler built from your research, so preparing pays as much as watching. Elites need a mastered part's chips. Bosses are yours alone, as today. |
| And the Operator? | Its helpers count. A helper's hit on a beat is played back, a helper that breaks the wrong part sets it off, and a helper on a boss's ♛ part starts its phases. The Operator's puzzle is where its helpers will be in three cycles. |
| How is it measured? | `solved.mjs` grows a misreader (blind on 30% of cycles), a routine player and the elite and boss sets. From level 18 the blind player wins 60% or less of ordinary fights and 40% or less of elites and bosses, and lower is better. |


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
12 fights a cell. The Resident: 6. Solo bosses: DEADBOLT, TRIPMINE, RELAY-KING, MIRRORSHADE, PATCH TUESDAY and
HOLLOW CHOIR, two seeds each.

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

- **Every fight, in two tiers.** Ordinary fights (wild viruses, guards, invasions) carry one conflict. Elites and
  bosses (Residents, solo bosses, lair bosses, feuds) carry two or three. Levels 1 to 5 stay as they are: they have no
  tells yet, and the ticks are the lesson.
- **The default move is wrong at least once a fight.** Every fight has a moment when the move a rotation makes (hit
  the part in front of you with the first ready key) costs the fight or comes close. Reading the board is how you
  find that moment.
- **Two ways to win: watch, or prepare.** In an ordinary fight, the conflict can always be answered by a handler
  built from your research of that virus's parts, so a player who writes the right routine wins as often as one who
  watches. A player who does neither loses more often. That is the designer's answer to *reward attention, never
  punish its absence* (docs/routines.md decision 1): what costs you is skipping both the attention and the
  preparation. Elites need a mastered part's chips to be routine-played. Bosses stay yours alone.
- **A puzzle, never a wall.** A fight you lose to should be one you could see how to win. The planner wins 85% or
  more of every fight at its level, elites and bosses included. A fight that only a crew or a higher level beats is a
  crew fight, and is labelled one.
- **Everything is on the board.** The answer can be found from what the board shows: tells, timers, tethers and the
  part's tooltip. A veiled part keeps its answer (strip it, or Tag it). The same boss is the same fight every time
  (docs/genome.md 7), so a fight you lost is a fight you can learn.
- **Every class has an answer** (docs/genome.md rule 4, docs/parts-plan.md "Principles"), from its core skills and
  SIGINT, not only from a subclass line.
- **A misread is telegraphed.** A fight loses you by a move you could see coming three cycles out, never by a
  surprise. The tell's chip and its ▸ line stay as they are.
- **Show it, don't explain it.** A puzzle fight looks like any fight. Its conflicts read as board marks (tells,
  tethers, a beat), and the sentences live in tooltips and the Codex.

## 3. The levers: conflicts

Each lever is a moment when the default move is wrong. Most of them are rules that exist in one place today; a
puzzle fight uses them on purpose.

| Lever | The conflict | What a blind player does | The routine's answer | Built from |
|---|---|---|---|---|
| **The beat** | Fire nothing with a direct hit this cycle. | Fires into it, and its hit comes back at it. | WHEN *beat in 1*, DO Hold. Needs the Hold chip (docs/routines.md R3), brought forward. | The Mimic (Ghostroot, from 8). An elite's or a boss's beat comes every few cycles, not once. |
| **The order** | Break the parts in a given order. The wrong one first sets something off. | Breaks whatever is first on the board. | A preset that names the order (*Encryptor first*), or TARGET *that part*. | The Tripwire (16), the Spare (14), the Mirror's twin, the Mutex's lock, the Lockbox's ward. |
| **Strip before** | A seal that re-arms every part if its part still wears ◆ when it lands. | Strips the part it happens to be hitting. | WHEN *tell live*, DO an armor-breaker, TARGET *that part*. | Seals (elites and bosses, from 6). The seal sits on a part the rotation doesn't reach first. |
| **Save the key** | A cast only SIGINT answers (its part can't be cut in its window), so SIGINT spent on the wrong thing loses it. | Fires SIGINT when it's ready, or never. | WHEN *tell live* on that part, DO SIGINT. | Casts and SIGINT (from 10). |
| **Two clocks** | Two tells due on the same cycle, on different parts. One cut a cycle, so one has to be answered early: delay it, strip ahead of it, or SIGINT it. | Answers one, by accident. | WHEN *the cycle before its tell* (a mastered part's chip). | The tells as built, with *no pile-ups* lifted (elites and bosses only). Every such fight is checked to be winnable (section 5). |
| **The one to leave** | A part that must stand until a phase is done. Its ticks start phases and cut nothing. | Hits it from the start, so its phases come before the other parts are dealt with. | None: bosses are yours alone. | A boss's ♛ part (the boss rule). |
| **Phases** | The fight runs as three or four phases of a few cycles each, so three or four tells get their turn. | Lives long enough to meet them. | None: bosses are yours alone. | Boss phases. This replaces "more Integrity" (1.5): the fight is longer because it has more to read, not because the parts are bigger. |

An ordinary fight takes one of the first four, the ones a routine can answer with a decoded or rule-tier chip. An
elite takes two, and may use two clocks. A boss takes two or three. One rule a part still holds (docs/parts-plan.md
"One part, one rule").

**The rotation stays general.** A virus with no routine of yours plays the rotation, and the rotation is the planner
(`dist/planner.mjs`): it reads tells and already leaves a Tripwire for last. If it keeps doing that, the default
program solves every ordinary fight's conflict, and nobody needs to watch or prepare. So the rotation knows your kit,
not the virus: the answer to each lever moves out of the rotation and into the presets and handlers, which open with
research. Section 8 asks.

### 3.1 The Operator: helpers count

Every other class's question is what to fire this cycle. The Operator's is where its helpers will be in three cycles:
a Deploy is four cycles of hits on one part, set going now. The blind Operator wins because nothing a helper does can
be wrong. The Mimic plays back only a command's direct hit, and helpers give it nothing (`dist/tells.mjs`,
`mimicHit`). Tells die with their parts, and helpers break parts.

So instead of exempting the helpers, every lever counts them as yours:

| Lever | What a helper does | The Operator's answer, from its own keys |
|---|---|---|
| The beat | Each helper's hit on that part on the beat is played back at you, at its size. Only helpers sent after the beat was said count, so a beat never catches a helper you couldn't have planned around. | Don't send helpers into a beat you can see. Barrier one into a shield, Reroute them to another part, or let them run out first. |
| The order | A helper that breaks the wrong part first sets it off, like your own hit. When its part breaks, the board shows where it will go next, as a dashed tether. | Send helpers to the part that breaks first. Reroute before the break. |
| Strip before | Helper hits break ◆ as today, so helpers on the sealing part are an answer. | Put helpers on the part with the seal. |
| Save the key | No change: Reroute's arrivals count as hits, so two helpers stop a cast. | SIGINT, or Reroute two helpers onto the casting part. |
| The one to leave | A helper's tick on a boss's ♛ part starts its phases like your own. | Keep helpers off it until the phase is due. |

What the board needs: each helper's remaining ticks as small teal pips in its part's timeline columns, and a tick
that lands on a beat edged in red, so the plan can be read three cycles out like a tell. Nothing new to type: Barrier,
Reroute and Jam already move, spend or cancel helpers, and they become the Operator's answers rather than spare keys.

What it should do, to be checked in P0: the blind Operator, which fires Deploy, Botnet and Spawn as they come
ready, should lose to beats and orders as the other blind players do. A reading Operator keeps its helpers and its
identity. The first measurement is how much of the blind Operator's 94% of tells answered comes from helpers cutting
and how much from short fights.

## 4. Where they live

| Tier | Fights | Conflicts | Planner's Signal lost |
|---|---|---|---|
| Ordinary | Wild viruses, guards and invasions, from level 6 (the first tells) | One, that a routine can answer | The solo band, as today (15–50%) |
| Hard | Elites, Residents, solo bosses, lair bosses and feuds | Two or three | The boss band |

**Elites become puzzles.** In the harness today they beat the planner (17–67% wins for the Breaker). Their Integrity
comes down until the planner wins 85% or more, and the difficulty comes back as conflicts. They hold the vault key, so
every server has one: every server has a hard puzzle on its main road.

**Residents keep their puzzle every time.** No fallback after a loss: a Resident is the same fight until you beat it.

**The Debugger room** (a fifth puzzle room: a seeded fight board whose loss costs no Signal or pack) is parked. The
designer didn't pick it, and with every fight a puzzle it's less needed as a place to practise.

**What it costs the player.** Losing costs what it costs today: on a run you're disconnected and lose your unbanked
pack. Ordinary fights get harder only for a player who neither watches nor sets up a routine. Nothing is taken from a
fight a routine plays.

## 5. How it's measured

`solved.mjs` today plays the planner against the blind player on the class-balance fights. It grows four things:

1. **The misreader**, blind on 30% of its cycles (docs/genome.md 11.2): the stand-in for a person.
2. **The routine player**: the program as a player would set it up, with the virus's presets and handlers from the
   research its tier allows (decoded and rule chips for ordinary fights, mastered chips for elites). It answers
   question 6: a correct routine wins.
3. **The kit player**, blind to the virus but not to its own kit: it plays its subclass's `rotation` preset in order,
   at the part that attacks soonest. It separates reading the virus from playing your kit, which the Infiltrator's
   numbers mix up today (1.2).
4. **The elite and boss sets**: every elite roll's conflicts, every boss at its floor, +4 and +10 levels, every
   subclass, six seeds.

| Fights | Planner wins | Routine wins | Misreader wins | Blind and kit wins |
|---|---|---|---|---|
| Ordinary, levels 6–17 | 85% or more | 85% or more | 70% or more | 75% or less |
| Ordinary, from 18 | 85% or more | 85% or more | 70% or more | 60% or less |
| Elites, from 10 | 85% or more | 60% or more (mastered chips) | 60% or more | 40% or less, aiming for 25% |
| Bosses, from 10 | 85% or more | — (yours alone) | 60% or more | 40% or less, aiming for 25% |

Lower is better on the last column, as long as the planner and misreader rows hold: the misreader is the line that
keeps "challenging" from becoming "unfair". A fight that misses its row doesn't ship.

Like the Hunter chase's dens (*every den is searched first*), a fight that lifts *no pile-ups* is checked when it's
made: the planner must win it on every class at its level, so two clocks never become two clocks with no answer. An
elite is rolled, not authored, so the check runs on its roll, and a roll that fails is rerolled from the next seed.
The checks go in a `puzzlefights.test.mjs`, slow-suite like the balance simulation.

## 6. What it pays

Nothing is taken away for not reading, and a routine's fight pays what yours does. Reading already pays: each tell
read adds a tenth of the kill's XP, up to 40%, and reading every tell in a fight rolls its loot once more. Puzzle
fights keep those and add:

- **Solved**, on the win card, when every tell was read and none landed: a row like *Clean*. What it pays is the
  read bonus and the second loot roll it already counts; the row says you found the answer.
- **Achievements**, cosmetic only: an elite solved, a boss solved, every Resident on a floor solved, a fight solved by
  each class, and one for a routine that wins a fight with a conflict it has a handler for.

## 7. Build phases

| Phase | What ships | Done when |
|---|---|---|
| P0 | `solved.mjs`: the misreader, the routine player, the kit player, and the elite and boss sets. How much of the blind Operator's wins comes from helpers. No game change. | Section 1.4's table, with the new players' columns, is in progression.md. |
| P1 | The rotation made general (the levers' answers move into presets and handlers). The Hold chip brought forward from R3, and the *beat in 1* chip. Helpers count on every lever, with their pips on the board. | The routine player wins as often as the planner on today's fights, and the rotation alone doesn't. |
| P2 | Ordinary fights: each wild roll, guard and invasion gets one conflict from the first four levers. | Ordinary fights meet their rows. |
| P3 | Elites: Integrity down, two conflicts, *no pile-ups* lifted and checked on the roll. | Elites meet their row. |
| P4 | Bosses: the levers as boss rules (a beat that repeats, phases, the one to leave). Two Residents and two solo bosses first, then the rest, lair bosses and feuds. | Every boss meets its row, and the designer has played the first four. |

Each phase is played by the designer before the next starts: P2 changes every fight in the game.

## 8. Decided, and still open

October 27, 2026, from the designer:

1. **Which fights.** *"Most fights should be slightly tricky, with bosses and elites being harder."* Two tiers
   (section 4).
2. **The bar.** *"40% is good, but lower the better. I want the game to be challenging."* Blind wins 40% or less on
   elites and bosses, aiming for 25%, held up by the misreader's row (section 5).
3. **Residents as gates.** No fallback: a Resident keeps its puzzle every time.
4. **The Operator.** The designer wasn't sure and asked for an approach. Section 3.1 is the proposal: helpers count on every lever, and the Operator's puzzle is planning where they'll be.
5. **Pile-ups.** Lifted, for elites and bosses, checked fight by fight.
6. **The Infiltrator, and routines.** *"Paying attention should be rewarded, but also making the correct routine
   should also be rewarded."* The Infiltrator's blind losses stand. A correct routine wins ordinary fights (section 2).
7. **Elites.** *"Puzzles versus walls always."* Elites become puzzles (section 4).

Still open:

1. **The rotation.** Make it general, so the default program no longer answers a virus's levers by itself (section
   3)? Without it, nobody needs to watch or prepare for an ordinary fight.
2. **The Operator's approach** (section 3.1): helpers count on every lever. Yes, or something else after P0's
   measurement?
3. **The Hold chip.** Bring it forward from routines R3, so a routine can answer a beat?
4. **The ordinary tier's bar.** Blind 60% or less from 18 and 75% or less from 6 to 17, or lower?
