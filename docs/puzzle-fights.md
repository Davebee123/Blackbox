# Puzzle fights: fights you read, or prepare for

October 27, 2026. Every question this sheet raised has the designer's answer (section 8). P0 is built: `solved.mjs`
measures it, and docs/progression.md "How solved fights are" has its numbers. Nothing else is built yet; section 7 is
the build order.

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
| What wins one? | Watching, or the right routine. The default program knows your kit, not the virus: you fit each virus's routine to its trick, with handlers that cost RAM and open with research. An ordinary fight's trick always has such a handler, so preparing pays as much as watching. Elites need a mastered part's chips. Bosses are yours alone, as today. |
| And the Operator? | Its helpers count. A helper on a beat's part is played back, a helper that breaks the wrong part sets it off, and a helper on a boss's ♛ part starts its phases. Only helpers sent after a beat was said are caught. The Operator's puzzle is where its helpers will be in three cycles, and each subclass already has the keys to answer it (section 3.2). |
| How is it measured? | `solved.mjs` grows a learner (blind on 30%, 15% or 5% of cycles), a routine player and the elite and boss sets. The blind player's wins fall fast with level: from 18, 30% or less of ordinary fights, 10% of elites and 5% of bosses. A person loses most first tries at an elite or a boss and wins once they've learned it, like Elden Ring. |


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

### 2.1 Hard to learn, rewarding to learn

The designer: *the mechanics should be difficult and rewarding to learn. Think Elden Ring.* What that asks of a fight:

- **You lose before you win, and the loss teaches.** A first try at an elite or a boss usually fails. Every loss is to
  a move the board showed coming, and the next try is the same fight (docs/genome.md 7), so the second try starts
  from what the first one taught. The backlog's *death recap on the Disconnected card* is where that lesson lands: the
  move that took you out, and its ▸ answer.
- **Hard, never unfair.** The planner, which knows the fight, still wins 85% of it. Nothing is hidden that research
  or a strip can't show, and nothing lands unannounced. Difficulty comes from what you have to notice and do in
  time, not from numbers you can't see (1.5).
- **What you learn stays learned.** Part research in the Codex keeps counting across tries, and each tier shows more
  of the part on the board and opens its routine chips. Learning a boss also teaches its parts everywhere else.
- **Learning shows.** A learned player beats the fight cleanly: *Solved* on the win card, the read bonus, the second
  loot roll, and the achievements (section 6).
- **Help is there, at a price.** Levels above the fight and a crew make it easier, as summons and levels do in Elden
  Ring, but the conflicts stay: a higher level makes a misread survivable, not unnecessary.
- **You choose the risk.** A loss on a run costs what it does today: the unbanked pack, a wait (the server takes you
  back 30 seconds later, 15 more for each disconnect, up to 2 minutes) and the walk back. That stays. An elite or a
  boss shows on the map before you walk in (and *stop before danger* stops a program's walk next door), so you know the
  risk before the fight, and `jack out` banks your pack before you take it on. The designer: *you know the risk of the
  fight before entering. You can always jack out before combat.*

## 3. The levers: conflicts

Each lever is a moment when the default move is wrong. Most of them are rules that exist in one place today; a
puzzle fight uses them on purpose.

| Lever | The conflict | What a blind player does | The routine's answer | Built from |
|---|---|---|---|---|
| **The beat** | Fire nothing with a direct hit this cycle. | Fires into it, and its hit comes back at it. | WHEN *beat in 1*, DO Hold (section 3.1). | The Mimic (Ghostroot, from 8). An elite's or a boss's beat comes every few cycles, not once. |
| **The order** | Break the parts in a given order. The wrong one first sets something off. | Breaks whatever is first on the board. | A preset that names the order (*Encryptor first*), or TARGET *that part*. | The Tripwire (16), the Spare (14), the Mirror's twin, the Mutex's lock, the Lockbox's ward. |
| **Strip before** | A seal that re-arms every part if its part still wears ◆ when it lands. | Strips the part it happens to be hitting. | WHEN *tell live*, DO an armor-breaker, TARGET *that part*. | Seals (elites and bosses, from 6). The seal sits on a part the rotation doesn't reach first. |
| **Save the key** | A cast only SIGINT answers (its part can't be cut in its window), so SIGINT spent on the wrong thing loses it. | Fires SIGINT when it's ready, or never. | WHEN *tell live* on that part, DO SIGINT. | Casts and SIGINT (from 10). |
| **Two clocks** | Two tells due on the same cycle, on different parts. One cut a cycle, so one has to be answered early: delay it, strip ahead of it, or SIGINT it. | Answers one, by accident. | WHEN *the cycle before its tell* (a mastered part's chip). | The tells as built, with *no pile-ups* lifted (elites and bosses only). Every such fight is checked to be winnable (section 5). |
| **The one to leave** | A part that must stand until a phase is done. Its ticks start phases and cut nothing. | Hits it from the start, so its phases come before the other parts are dealt with. | None: bosses are yours alone. | A boss's ♛ part (the boss rule). |
| **Phases** | The fight runs as three or four phases of a few cycles each, so three or four tells get their turn. | Lives long enough to meet them. | None: bosses are yours alone. | Boss phases. This replaces "more Integrity" (1.5): the fight is longer because it has more to read, not because the parts are bigger. |

An ordinary fight takes one of the first four, the ones a routine can answer with a decoded or rule-tier chip. An
elite takes two, and may use two clocks. A boss takes two or three. One rule a part still holds (docs/parts-plan.md
"One part, one rule").

### 3.1 The program fits the trick

A virus with no routine of yours plays the rotation, and the rotation is the planner (`dist/planner.mjs`): today it
reads tells and leaves a Tripwire, a Hotspot or a Zip Bomb for last on its own. Left like that, the default program
would solve every ordinary fight's trick, and nobody would need to watch or prepare.

The designer's decision: *the default program should have players allocate the program to fit the trick.* So:

- **The rotation knows your kit, not the virus.** It plays your skills well (combos, cooldowns, Break ◆ first) and
  aims at the part that attacks soonest. It answers no lever: it doesn't hold on a beat, keep an order, strip a part
  ahead of its seal or save SIGINT for a cast. Leaving a Tripwire for last moves out of the rotation and into a preset.
- **The answer is a handler, and a handler costs RAM.** Each virus's routine has its own RAM (4 at level 1 to 10 at 50),
  and each lever's answer is a handler of 1 to 3 RAM (a rule chip 2, a mastered chip 3). Fitting the program to the
  trick is choosing which handlers that virus's RAM goes on. An ordinary fight's one trick fits easily; an elite's two,
  one of them a mastered chip, fill most of a mid-level routine.
- **Presets make it quick.** The Program tab's presets are built from your research and your bar, and each lever
  brings one once its part's rule is decoded (*Hold on the beat*, *Tripwire last*, *Strip the sealer*, *SIGINT the
  cast*). Picking one is the preparation, and it shows you what the handler does.
- **The Hold chip.** docs/routines.md plans Hold for R3, as a rare chip from loot and the Codex: a DO chip that fires
  nothing that cycle (*skip a cycle to line up a combo*). It's the routine's version of typing `hold`, and the only way
  a routine can answer a beat. A lever every routine must answer can't wait on a drop, so Hold comes forward: every
  program has it from level 8, when the Mimic first appears, and it costs no RAM of its own (its handler pays for its
  WHEN chip, as any handler does).
- **A trick with no handler is an exception.** Today a decoded part with a rule that no handler names is yours to
  play (*EXCEPTION · no available handler*). A part that brings a lever works the same way: if your routine has no
  handler for it, the program plays the rest of the fight and leaves that part, and its lever, to you.

### 3.2 The Operator: helpers count

#### Why the Operator is the hard case

A helper hits one part every cycle, after your command, until it runs out. When its part breaks it moves on to the
part whose attack lands soonest. Helpers alone never call off a tell (only Kill Switch and Reroute turn their hits
into yours), and they give the Mimic nothing: it plays back only a command's direct hit (`dist/tells.mjs`,
`mimicHit`). So nothing a helper does can be wrong. The blind Operator answers 94% of its tells because helpers break
parts fast and a tell dies with its part, not because it reads anything.

#### The idea: a helper is a commitment

Every other class asks what to fire this cycle. A Deploy is four cycles of hits on one part, set going now, so the
Operator's question is where its helpers will be in three cycles. That is the same skill as reading a tell, aimed at
your own side of the board. The Operator's puzzle is its schedule: which part each helper is on, when it runs out,
and where it goes when its part breaks.

#### The rules

1. **A helper's hit is your hit, on every lever.** A helper that breaks a part out of order sets it off, like your
   own hit. A helper's tick on a boss's ♛ part starts its phases. A helper that wakes a Spare wakes it. Helper hits
   already break ◆, so helpers on a sealing part are an answer to its seal.
2. **The beat counts the helpers on its part.** On a beat, each helper on the beat's part (the Mimic, or the part
   carrying an elite's or boss's beat) has its hit played back at you, at its own size. Helpers on other parts are
   free. One beat's playback never passes the tell ceiling (`TELL.ceiling`), however many helpers it catches.
3. **Only helpers you sent after the beat was said.** A beat is said two cycles ahead and a Deploy runs four, so a
   helper you placed before you could see the beat is never caught. The misread is sending a helper onto a part whose
   beat is on the board.
4. **Where a helper moves on is shown.** When the preview shows a part breaking this cycle, a dashed teal tether runs
   from it to the part its helpers will move on to. If that part must not break yet, you can see it coming.
5. **Helpers still never cut a tell on their own.** A cut needs your command, or a skill that makes their hits yours
   (Kill Switch, Reroute). This stays: it is what keeps the Operator reading.

#### What each Operator answers with

Below level 10 the Operator plays its core (Deploy, Hook, Spawn, Botnet), with no key that moves or ends a helper.
Its answer is placement, and rule 3 keeps that fair: don't send helpers onto a part whose beat you can see, and don't
put more on a part than it needs to break when you want it broken.

| Lever | Herder (from 10) | Hijacker (from 10) |
|---|---|---|
| The beat | Kill Switch the cycle before: the helpers cash in early, as your hit, and none is left on the beat. OOM Kill (34) ends them all for health. | Barrier (20) turns the helper into a shield. Echo-cancel (30) sends the Mimic's beat back at the virus. Jam, Hijack and Blackhole each spend the helper. |
| The order | Fan-out puts a helper on every part, so it's the wrong key when one part must break last: Deploy and Botnet on the right part instead. | Reroute (34) moves every helper before the break. Spend the helper on the part that must stay. |
| Strip before | Fork (18): the ◆ the swarm breaks on the sealer makes more helpers on it. | Spawn a helper onto the sealer; Cache Poison (22) makes its seal fail. |
| Save the key | Kill Switch's hits count as yours, so it calls off a charge on every part a helper is on. SIGINT for a cast. | Reroute: two arrivals stop a cast. Hijack takes the cast for you. |
| Two clocks | Kill Switch answers both charges at once if a helper is on each part. | Jam and Spoofed ACK push one clock back a cycle. |
| The one to leave | Keep Fan-out off the boss: aim the swarm at the other parts. | Takeover (26) turns the ♛ part's attacks on its own side without hitting it. |

So each subclass already owns its answers. The Herder's are about timing the cash-in; the Hijacker's are about
spending helpers on the right part. The proposal changes no skill.

#### On the board

- **Helper pips.** Each helper's remaining hits show as small teal pips in its part's timeline columns (Now, +1, +2,
  +3), one row of pips a helper, so the schedule reads like the tells on the same row.
- **A pip that trips a lever is edged red:** a hit on a beat, or the hit that would break a part out of order. Its
  tooltip, in WoW grammar: *Deploy*, *Helper*, *Hits the Mimic for 12 on its beat.*, then muted *▸ The Mimic plays it
  back at you. Move it or cash it in first.*
- **The move-on tether**, dashed teal, from a part about to break to where its helpers go next (rule 4).

#### In a routine

An Operator's handlers can answer helper levers too, with chips that exist plus one: WHEN *beat in 2* (a rule-tier
chip), DO Kill Switch or Barrier, TARGET *that part*. Deploy, Spawn and Botnet handlers take a TARGET that avoids a
part with a beat on the board (*no beat*), as Break ◆ first avoids armor today.

#### What it should do, and the risk

The blind Operator fires Deploy, Botnet, Spawn and Fan-out at the first part on the board as they come ready. Under
these rules its helpers sit on a beat's part, break parts out of order and start a boss's phases early, so it should
lose as the other blind players do. A reading Operator keeps its swarm and its identity.

The risk was the Herder in Ghostroot fights: its strength is volume, and a beat that catches five helpers is five
hits. P0 measured it with rules 2 and 3 prototyped in the harness and the planner taught them (no helper onto the
Mimic while a beat it would reach is on the board and other parts stand, Kill Switch on the beat). The risk didn't
show: the Herder's helpers are small, so a caught beat costs it about 3 Signal, and the planner Herder's Signal lost in
Mimic fights moved by a point at most (14% at 18). The Hijacker's bigger helpers cost it 2–6 points. The blind Operator
lost 3–11 more points of Signal and no fights: rules 2 and 3 alone don't make it lose, so rule 1 (the order, the ♛
part) has to carry the rest.

**In the game (P1).** Rules 2 to 5 are built (`tells.mjs` `caughtHelpers`, the pips and the tether from `fightread.mjs`
`helperPlan`), and rule 1 already held: a helper's break sets off a Tripwire and boots a Spare, and its tick crosses a
♛ part's phase tick, because those rules never asked whose hit it was (`helper-rules.test.mjs` pins it). The planner
keeps its helpers off a beat (with the Mimic alone too: it has no attack, so waiting costs nothing), cashes caught ones
in with Kill Switch, and sends none that would break a Tripwire while others stand. `node solved.mjs operator`, Signal
lost in Ghostroot fights with a Mimic at 10, 18 and 30, before the rule and now: the planner Herder 20, 14, 19 → 20, 16,
19; the planner Hijacker 23, 35, 20 → 25, 37, 21; the blind Herder 20, 59, 63 → 31, 64, 66; the blind Hijacker 72, 44,
49 → 73, 46, 49. Every planner still wins them all. What the planner still meets is a helper moving on onto the Mimic
when its own part breaks, which the tether shows.

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

`solved.mjs` played the planner against the blind player on the class-balance fights. P0 grew it four things, and
checks every row against the bar below:

1. **The learner**: the misreader of docs/genome.md 11.2, blind to the virus on a share of its cycles (there it plays
   the kit player's move), at three shares for three stages of learning a fight: 30% (a first try), 15% (a few tries
   in) and 5% (learned). It's the stand-in for a person, and its three numbers are the learning curve.
2. **The routine player**: the program as a player would set it up, with research at its tier (rule chips for
   ordinary fights, mastered chips for elites) and a handler for each trick. Today that's one handler, *any tell live*,
   your best hit, *that part*: the presets of today replace the rotation's play and lose fights. P1's lever presets go
   here. It answers question 6: a correct routine wins. Beside it, the rotation alone (no routine for the virus).
3. **The kit player**, blind to the virus but not to its own kit: the planner with every tell and gene unread. It
   separates reading the virus from playing your kit, which the Infiltrator's numbers mix up today (1.2), and it's
   what section 3.1 says the rotation should become.
4. **The elite and boss sets**: 12 elite rolls; every boss at its floor, +4 and +10 levels, every subclass, six seeds.
   Each elite roll's conflicts come with P3.

| Fights | Planner wins | Routine wins | Learner wins (30% · 15% · 5% misread) | Blind and kit wins |
|---|---|---|---|---|
| Ordinary, levels 6–17 | 85% or more | 85% or more | 70% · 80% · 85% or more | 40% or less |
| Ordinary, levels 18–29 | 85% or more | 85% or more | 70% · 80% · 85% or more | 30% or less |
| Ordinary, level 30 and up | 85% or more | 85% or more | 70% · 80% · 85% or more | 20% or less |
| Elites, levels 10–17 | 85% or more | 60% or more (mastered chips) | 35% · 60% · 85% or more | 20% or less |
| Elites, levels 18–29 | 85% or more | 60% or more (mastered chips) | 35% · 60% · 85% or more | 10% or less |
| Elites, level 30 and up | 85% or more | 60% or more (mastered chips) | 35% · 60% · 85% or more | 5% or less |
| Bosses, levels 10–17 | 85% or more | — (yours alone) | 20% · 50% · 85% or more | 10% or less |
| Bosses, levels 18–29 | 85% or more | — (yours alone) | 20% · 50% · 85% or more | 5% or less |
| Bosses, level 30 and up | 85% or more | — (yours alone) | 20% · 50% · 85% or more | 2% or less |

The blind column falls fast with level because there are more mechanics to not understand: more tells live at once,
casts and seals, more parts with rules. The designer asked for blind players at about 30% of ordinary fights at high
levels, then for a steeper ramp: this table reaches 30% at level 18 and keeps falling. Elites and bosses are where
the game is hard to learn: a blind player almost never beats one, and a person usually loses a first try.

The learner's columns are the other half of the bar, and they matter as much. An ordinary fight is a little tricky:
a first try already wins most of the time. An elite or a boss is learned: a first try usually fails, a few tries in
it's a coin flip, and once learned it's won as reliably as the planner wins it. A fight whose learned column falls
short is a wall, and doesn't ship. Neither does one whose first-try column is too high: that one isn't hard to learn.

Today's blind player wins 79–100% of ordinary fights at level 30 for three classes of four, and section 1.5 shows
bigger numbers won't take it to 20%. Only the levers can, so P2 is where that bar is tested first.

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
| P0 | `solved.mjs`: the learner at three misread shares, the routine player, the kit player, and the elite and boss sets. How much of the blind Operator's wins comes from helpers. No game change. | Section 1.4's table, with the new players' columns, is in progression.md. **Done.** |
| P1 | The rotation made general (the levers' answers move into presets and handlers), a preset per lever, and a lever's part with no handler as an exception. The Hold chip from level 8, and the *beat in 1* and *beat in 2* chips. Helpers count on every lever (section 3.2's rules), with their pips and the move-on tether on the board, and the *no beat* target. The planner taught the helper rules. **Built so far:** helpers count on every lever, their pips and the move-on tether, and the planner taught the helper rules (section 3.2, *In the game*). | The routine player wins as often as the planner on today's fights, and the rotation alone doesn't. |
| P2 | Ordinary fights: each wild roll, guard and invasion gets one conflict from the first four levers. | Ordinary fights meet their rows. |
| P3 | Elites: Integrity down, two conflicts, *no pile-ups* lifted and checked on the roll. | Elites meet their row. |
| P4 | Bosses: the levers as boss rules (a beat that repeats, phases, the one to leave). Two Residents and two solo bosses first, then the rest, lair bosses and feuds. | Every boss meets its row, and the designer has played the first four. |

Each phase is played by the designer before the next starts: P2 changes every fight in the game.

**What P0 found for the phases after it** (docs/progression.md "Every player, every tier"):

- **No fight meets its bar today**, and the kit player is why: reading neither tells nor genes, it wins 83–100% of
  ordinary fights and of the Residents. Today's tells and gene rules don't decide fights; P2's levers have to.
- **There's no learning curve yet.** The learner at 30% wins about what it wins at 5%, except on MIRRORSHADE.
- **The rotation alone wins ordinary fights** as often as the planner, so preparing pays nothing until P1 makes the
  rotation the kit player.
- **Elites are walls.** At 10 the planner wins 0–33% of them. P3's Integrity cut comes first.
- **The planner falls short on some bosses** (RELAY-KING at every level, PATCH TUESDAY at 10, FLOODWALL at 10 and
  14, BACK ORIFICE at 14, HASHLORD at 20 and 26, SLEEPWALKER at 20), and on SLEEPWALKER, FLOODWALL and HASHLORD the
  kit player beats it by 19–27 points: its answers to their rules cost more than ignoring them. P4 needs those answers
  fixed before its planner floor of 85% means anything.

**What P1 built, the routine half** (docs/progression.md "The program fits the trick"):

- **The rotation is the kit player.** It plays your kit and reads the timers, and reads no tell and no part's rule.
  Broad TARGETs (soonest, lowest, no ◆) do what they say: none leaves a Tripwire for last on its own any more.
- **Two DO chips that aren't skills.** *Hold* (from level 8, no RAM of its own) fires nothing. *Rotation* (always
  there, no RAM of its own) is your rotation's move at the TARGET part, so a handler says where and your kit says
  what. Fired by a beat chip, the Rotation reads the beat and goes quiet. A handler that names its part but can't
  fire (its skill cooling) aims the rotation there too.
- **New chips:** WHEN *beat in 1* and *beat in 2* (a Mimic's or a Decoy's beat, open with either part's rule); TARGET
  *no beat* and *other parts* (any part but the ones the WHEN chip names).
- **A preset for each lever** whose part's rule you've researched, listed first, the one in the fight first. A lever is
  a part whose gene's bot hint says how to answer it (genes.mjs `bot`): *Quiet on the beat* (the Mimic, the Decoy:
  *beat in 1 → Rotation → no beat*), *Tripwire last* (the Zip Bomb, the Hotspot, the Limiter: *on board → Rotation →
  other parts*), *Lockbox first* (the Mutex, the C2 Node, the Packer: *on board → Rotation → that part*). Then *Answer
  the tells* (*any tell live → Rotation → that part*) and *SIGINT the cast*, beside the plain presets.
- **Exceptions:** in a routine that's yours, a lever no handler names is yours to play however well researched, and so
  is a seal or a cast on the board. A charge is still covered once mastered.
- **Where it differs from section 3.1.** The beat's preset is *Quiet on the beat*, not *Hold on the beat*: holding wasted
  the cycle, and the Bastion lost fights to it that its rotation won; Hold stays as a chip. SIGINT is its own preset,
  not part of answering the tells: fired by a handler into a cycle a kill was due, it cost the kill. The twin and the
  Spare are not levers yet (their answers are *together* and *asleep*, not first or last); P2 decides.

## 8. Decided, and still open

October 27, 2026, from the designer:

1. **Which fights.** *"Most fights should be slightly tricky, with bosses and elites being harder."* Two tiers
   (section 4).
2. **The bar.** *"40% is good, but lower the better. I want the game to be challenging."* Then, for ordinary fights:
   *"blind players more like 30% at high levels from not understanding the mechanics."* Blind wins fall with level:
   ordinary fights, steeper still: *"they should be steeper. The mechanics should be difficult and rewarding to
   learn. Think Elden Ring."* Blind wins fall to 30% of ordinary fights by level 18, 10% of elites and 5% of bosses,
   and lower from 30. A learner's curve holds them up: elites and bosses are lost on a first try and won once learned
   (sections 2.1 and 5).
3. **Residents as gates.** No fallback: a Resident keeps its puzzle every time.
4. **The Operator.** The designer asked for the approach in detail, then approved it: section 3.2's rules. Helpers
   count on every lever, a beat catches only the helpers on its part sent after it was said, where helpers move on is
   shown, and helpers still never cut a tell on their own. The Operator's puzzle is planning where they'll be. P0
   measured the Herder's cost in Ghostroot fights: about a point of Signal for the planner (section 3.2).
5. **Pile-ups.** Lifted, for elites and bosses, checked fight by fight.
6. **The Infiltrator, and routines.** *"Paying attention should be rewarded, but also making the correct routine
   should also be rewarded."* The Infiltrator's blind losses stand. A correct routine wins ordinary fights (section 2).
7. **Elites.** *"Puzzles versus walls always."* Elites become puzzles (section 4).
8. **The Hold chip.** Every program has it from level 8 (section 3.1).
9. **The program.** *"The default program should have players allocate the program to fit the trick."* The rotation
   knows your kit, not the virus; each lever's answer is a handler that costs RAM (section 3.1).

10. **A learning try's cost.** Unchanged: a loss costs the unbanked pack. *"You know the risk of the fight before
    entering. You can always jack out before combat."* (section 2.1)
11. **The ramp's numbers.** *"They seem steep enough."* The blind and learner columns in section 5 stand.

Nothing is open. P0 is done; P1 (section 7) is next, in its own session.
