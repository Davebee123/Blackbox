# Levers with answers: puzzle fights P2, redesigned

October 27, 2026. Signed off (section 9) and being built. It replaces P2 of docs/puzzle-fights.md (section 7) and section
5's ceilings for the blind and kit players.

The designer, on starting P2: *"I worry that it's not going to be beneficial to put it against a bot since the bot is
biased. I think that, in a vacuum, the mechanics just need to be more complex and nuanced."* Then: design doc first,
no code.

## 0. The short version

| Question | Answer in this design |
|---|---|
| What's wrong with today's levers? | Each has one fixed answer: the Tripwire last, the Lockbox first, quiet on every beat, SIGINT every cast. Any fixed rule solves it, whether it's a bot's habit, a preset or yours. Once learned, a fight is a checklist. |
| What should a lever be instead? | A rule whose right answer depends on the board. The same part asks for different moves in different fights, for different classes and on different cycles, and the fact that decides it is on the board. |
| What changes? | The common levers get a second side. The Mimic copies whatever you fire, not just hits. Loud parts also break faster. The Zip Bomb's blast hits its own side too. The Lockbox holds back the damage past its cap instead of losing it. A seal re-arms by the ◆ left on its part. Casts show their price, and SIGINT can answer a charge too. |
| Do fights get more lethal? | No. A wrong call costs Signal or cycles, under the spike cap. A fight is lost to several wrong calls, or to one made from a weak position. |
| What about the bots? | They stay as a fairness check: the planner, which reads the rules, must still win, so no fight is a wall. The blind and kit ceilings go. In their place: no fixed rule wins (section 6), and the designer plays it. |
| What about routines? | Each lever brings a WHEN chip that reads the fact that decides it, so a prepared routine still wins. A plain preset no longer does. |

## 1. What the bots showed, and why they can't be the bar

`node solved.mjs` and the probes measured the kit player (the planner with every tell and gene unread) against the
planner on rolled wild fights (P1 code, 40 seeds × 4 classes a level). Signal lost, kit against planner, by the levers
a fight carries:

| Level | Levers in the fight | Fights | Planner | Kit |
|---|---|---:|---:|---:|
| 18 | a cast and a part to break last | 60 | 23 | 24 |
| 18 | a cast only | 40 | 30 | 29 |
| 18 | a beat and a cast | 32 | 25 | 42 |
| 18 | a cast and a part to break first | 12 | 25 | 31 |
| 30 | a cast and a part to break last | 52 | 28 | 25 |
| 30 | a beat and a cast | 24 | 23 | 38 |

- **The kit's mistakes are its quirks, not the mechanics' depth.** It never aims at a part with no attack, so it
  leaves a Zip Bomb or a Hotspot for last by accident. It ignores a Lockbox or a Mutex, and that costs it nothing.
  Only the beat costs it anything, because its rotation fires a hit every cycle.
- **Tuning against it would make spikes, not puzzles.** For the kit to lose 70% of fights, a misread would have to
  cost about 70 points of Signal, nearly three times what a whole fight costs the planner (1.5 of
  docs/puzzle-fights.md says the same about bigger numbers).
- **The real finding:** every lever has one right move, whatever the board. A bot, a preset and a player with a
  habit all find it once and keep it. That's why reading pays so little.

## 2. What a nuanced lever is

1. **No fixed rule wins.** For each lever, "always do X" and "never do X" both play worse than reading the board.
2. **What decides it is on the board.** A count, a preview or a tether, never a hidden number. The sentence goes in
   the tooltip; the board shows the number.
3. **A wrong call is friction.** It costs Signal or cycles, under the spike cap (45% for a wild virus), never the
   fight on its own.
4. **One part, one rule** (docs/parts-plan.md). The nuance is inside the rule (its effect depends on the state) and
   between parts, not more rules stacked on one part.
5. **Each class answers it its own way.** The best answer depends on your kit, so the same part plays differently for
   a Breaker and an Operator.

## 3. The levers, reworked

Each entry: today's rule, its one fixed answer, the rework, and what decides the right move. Numbers marked *start*
are first guesses for the harness to tune.

### 3.1 The Mimic: it copies what you fire

- **Today.** Every 4 cycles it copies the command you fire and deals its direct damage to you. Anything without a direct
  hit is quiet. **Fixed answer:** fire no hit on the beat.
- **Rework.** On its beat it copies your command and turns it on you, whatever it is:

  | You fire | It does |
  |---|---|
  | a hit | hits you for its direct damage (as today) |
  | a strip (Crack, Exploit) | strips your ◆ and your shield, the same count |
  | a burn (Inject, Purge, Deploy's ticks) | burns you with the same ticks |
  | a debuff (Throttle, Tag, Hook) | puts it on you (Throttled: your hits halved, its cycles) |
  | a shield or buff on yourself (Firewall, Brace, Fork) | gives it to the Mimic |
  | a heal (Patch, Vent) | heals the virus's most damaged part, the same amount |
  | SIGINT or a stun | you're Hung: your next command doesn't fire |
  | hold | nothing, but you lose the cycle |

  Helpers count as P1 built them (sent after the beat was said, caught at their size).
- **What decides it.** No move is free, so the cheapest copy depends on the board. A heal is cheap when every part is
  full and dear when one is about to break. A strip is cheap when you wear no ◆. A burn is cheap when you can cleanse
  next cycle. A small hit is cheap. Holding is cheap unless a charge is due.
- **Each class.** The Breaker strips on the beat when it wears no ◆. The Bastion's Firewall gives the Mimic a shield, so
  it Throttles instead when its next hit is small anyway. The Infiltrator's Tag Tags it, so it burns on the beat. The
  Operator's helpers are caught, so it Kill Switches before the beat (P1).
- **On the board.** The beat cell shows what your selected command would copy, as a red ghost on your Signal bar or
  ◆. The tooltip names it: *Mimic*, *Beat*, *Copies your Crack: strips 2 ◆ from you.*

### 3.2 The Tripwire: loud both ways

- **Today.** Break it while other parts stand and they go loud for the rest of the fight: 25% more damage, each attack a
  cycle sooner. **Fixed answer:** break it last.
- **Rework.** Loud parts also take more damage (*start* 40% more) and drop their ◆. Tripping it early turns the fight
  into a race: the virus hits harder and sooner, and breaks faster.
- **What decides it.** Can you finish the rest before the faster attacks add up? Trip it with your big cooldowns ready,
  the other parts low, or a shield up for the attack that now comes a cycle sooner. Leave it when your kill is slow or
  a charge is near: loud brings it a cycle closer.
- **Each class.** The Breaker trips it with Overload ready. The Bastion rarely does, and keeps Quiet Wire for when it
  must. The Infiltrator trips it once Tag and its burns are on the others. The Operator trips it with its helpers
  already spread.
- **On the board.** When the preview shows the Tripwire breaking, the other parts' attacks show their loud numbers and
  their ◆ show falling, so you see the trade before you make it.

### 3.3 The Zip Bomb: the blast hits both sides

- **Today.** Break it and its 2-cycle fuse lights. The blast deals 20% of your max to you, and a shield or ◆ takes it.
  Ending the fight puts the fuse out. **Fixed answer:** break it last.
- **Rework.** The blast hits every part on the board, the virus's too: each of its parts takes a share of its max
  (*start* 20%) and loses a ◆. You still take yours unless a shield or ◆ is up when the fuse runs out.
- **What decides it.** Breaking it early can finish weakened parts and strip the field, if your shield is timed to the
  fuse. It costs you 20% of your max for nothing if the parts are full or your shield is down. Last is still safe, and
  gives up the blast.
- **Each class.** The Bastion times Firewall to the fuse and lets the blast work. The Breaker uses it to strip the field,
  then bursts. The Operator's helpers finish what the blast leaves. The Infiltrator leaves it last when its burns are
  already doing that work.
- **On the board.** The fuse chip counts down 2, 1. When it's lit, each part's bar shows the blast's bite as a ghost.

### 3.4 The Lockbox: held, not lost

- **Today.** While it stands, its partner loses at most 25% of its max a cycle, and damage past the cap is lost.
  **Fixed answer:** break it first if you burst; ignore it if you chip.
- **Rework.** Damage past the cap isn't lost. The Lockbox holds it, and when the Lockbox breaks it all lands on the
  partner at once.
- **What decides it.** When to break it. Break it the cycle you need the partner gone: before its charge, before a cast,
  before another Encrypt stack. Too early and little is held; too late and the charge lands. Burst kits fill it fast and
  chip kits barely use it, so the timing differs by class.
- **On the board.** The Lockbox row shows the damage it holds, in your teal, and the partner's bar shows where that
  would leave it.

### 3.5 Seals: a dial, not a switch

- **Today.** If its part still wears any ◆ when the seal lands, the part re-arms to full with one ◆ more, and every
  stripped part gets one back. **Fixed answer:** strip the sealer before it lands.
- **Rework.** It re-arms by what's left: each ◆ the sealing part still wears when it lands gives one ◆ back to every
  part (never past its max). A full strip costs nothing, a half strip half.
- **What decides it.** How many strips to spend on the sealer against the part you're killing. A strip on the sealer
  saves a ◆ on every part. A strip on your target may end it before the seal matters. Your strip cooldowns and the
  seal's countdown decide it.
- **On the board.** The seal's cell shows how many ◆ it will hand out.
- **As built.** `TELL.seal` 1: each ◆ left gives one ◆ back to every part, the sealer included, never past a part's
  max (no more ◆ on its max). What it takes from you scales the same way: the share of its ◆ still on (`sealShare`) of
  your ◆ and shield, and Corrupted at that share. The seal's first now lands one cycle after the first tell can
  (`TELL.sealAfter` 1, was 3), so it lands mid-fight in the Sentinel's short fights. Its cell shows the ◆ it would hand
  out in all, in steel (*+4 ◆*: a partial strip can hand out more than none, since the sealer gains room). The
  planner strips it with its best strip (`bestStrip`) when the commands left before it lands are all it needs and that
  saves at least 1.5 ◆ a command, weighing what it takes from you as 3 ◆ at full share (`TELL.weigh`). WHEN chip *seal
  dear* (the sealing part's, rule tier, 2 RAM: it lands within 2 cycles while it wears 2 ◆ or more); preset *Seal
  dear: strip it*. `node solved.mjs rules`: no fixed rule wins at 10, 18 and 30 (the Sentinel at your level, 6
  fights). *Always strip* loses 7 to 30 points on some class at every level, *never strip* (never a ◆ off the sealer
  while it's said) 7 to 29.

### 3.6 Casts and SIGINT: one key, two clocks

- **Today.** SIGINT (8-cycle cooldown) or two hits on its part in its window stops a cast. Double Extortion: 35% more
  damage for 4 cycles. Self-Update: every part a quarter more Integrity. Persistence: attacks repeat a cycle faster for
  4 cycles. **Fixed answer:** SIGINT every cast.
- **Rework.**
  - **Each cast shows its price.** Double Extortion and Persistence show the Signal they'd add from the attacks due in
    their 4 cycles. Self-Update grows each part by a quarter of its *current* Integrity, so it's cheap late in a fight.
  - **SIGINT can also cut a charge** in its window.
- **What decides it.** A cast and a charge compete for one SIGINT. Spend it on the dearer one and answer the other with
  hits on its part, a shield, or by letting it land when it's cheap.
- **On the board.** The cast's cell and the charge's chip each show what they'd cost you. The SIGINT key shows its
  cooldown against both windows.
- **As built.** Prices (`tellPrice`): a charge its whole landing (a Full Disk's encryption and burst together), Double
  Extortion and Persistence the extra their part's attacks due in their 4 cycles would deal, Self-Update the Integrity
  it adds (`TELL.grow` 0.25 of each part's current Integrity), turned into Signal at your pace so far for the planner.
  SIGINT stops the open tell that lands first (`sigintTarget`); on a charge it cancels the attack it rides, as a cut
  does. It cuts charges from level 17 (`TELL.sigintChargeFrom`), where a charge and a cast are live together: below
  it a lone charge took SIGINT every time, a free answer that halved what a fight at 10 cost the Bastions and the
  Phantom and pushed the Herder and the Payload under their solo band (balance.test.mjs). The breach build keeps casts
  only. The SIGINT key's state line shows a pip a tell, struck through when SIGINT
  won't be ready in time. The planner SIGINTs the open tell when it costs more than every other live one SIGINT could
  stop, counting one whose part a cut can still reach as cheap and one whose window hasn't opened at half its price
  (`TELL.weigh.later`), and cuts first when a cut answers it. In a crew it saves nothing: every bar has a SIGINT. WHEN chip
  *dearer* (rule tier, 2 RAM); preset *SIGINT the dearer* (*dearer → SIGINT*), which replaces *SIGINT the cast*.
  `node solved.mjs rules` (32 wild fights with a charge and a cast): **a fixed rule wins.** At 18 *every cast* and
  *only charges* stay within 3 points of the planner on every class; at 30 *every cast* loses 6 on the Bastion, *only
  charges* nowhere. SIGINT itself is worth under 5 points in these fights at 18 (the planner with no SIGINT at all
  loses at most 4 more), because a tell's part usually breaks, or a cut answers it, before it lands. Tuning the cast
  (window 1, 50% louder, lasting the fight), SIGINT's cooldown (5 or 12), the tells' rest and where the cast sits didn't
  move it. For the designer: SIGINT's lever needs fights where tells outlive their part (P3's elites), or casts a cut
  can't answer.
- **HASHLORD.** With the seal a dial and Self-Update on current Integrity, a player who ignores its tells won 95% of it
  at 16 (80% before), as many as the planner. Its Block Reward now grows each part by half of what it has left
  (`TELLS.blockreward.grow`), and its Integrity is ×4.3 (was ×3.9): the planner 89%, the misreader 82%, blind 79%.

### 3.7 The rest already depend on the board

- **Mutex**: burst through just after the relock, or break the Mutex.
- **C2 Node**: break it once fragments are up.
- **Hotspot**: a command hit is safe when the charge lands on an attack you can cut.
- **Limiter**: hit size against its cap.

Each depends on the board already. P2 only shows what decides it where the board doesn't yet: the Hotspot's glow names
the attack it would charge, and the C2 Node shows the fragments it would drop. The Limiter isn't an order lever (its
bot hint says *last*), so it leaves routines.mjs `leverOf`.

### 3.8 The Decoy: a bent beat (optional)

- **Today.** Every 4th cycle your commands deal no damage and 30% reflects back. **Fixed answer:** fire nothing direct
  on the beat, the same as the Mimic.
- **Option.** On its beat the Decoy bends your single-target command onto the part it points at, and the pointer moves
  each beat. The pointer is a dashed red tether, shown once its ◆ is stripped or it's Tagged. Fire when it points at a
  part you want hit. Go quiet, or hit every part, when it points at the Zip Bomb, the Tripwire or the sealer.
- **The catch.** It's close to the Front End's bend. Question 6.

## 4. Rules that pull against each other

An ordinary fight carries one lever (section 5), but its answer moves with what else is on the board. These are the
pairs whose answers clash. P3 builds elites from them.

| Pair | The pull |
|---|---|
| Zip Bomb and a seal | The blast strips every part, so breaking the Zip Bomb a cycle before the seal lands answers the seal: an early break is right. |
| Mimic and a cast | SIGINT on the beat Hangs you. When the cast's window and the beat share a cycle, you need two hits on its part, or you let the cast land. |
| Tripwire and the Lockbox | The Lockbox's held damage and the loud parts' extra damage taken stack: break the Lockbox into a loud partner. The trip brings the partner's charge closer, too. |
| Mimic and the Lockbox | Big hits fill the Lockbox fastest, and big hits are what the Mimic copies. Fill it between beats. |
| Decoy and the Tripwire | The Decoy's tether points at the Tripwire on its beat: fire anyway only if you mean to trip it. |

## 5. The roll: one lever a fight

From level 6, every wild roll, invasion and guard carries one lever: one part whose rule is in section 3, or, for a
guard, a seal or a cast.

- **Ransomware:** the Zip Bomb from 5, the Lockbox from 3, the Tripwire from 16. Its seal from 6 and its cast from 10.
- **Worm:** the Zip Bomb from 5, the C2 Node from 8. Its seal and cast.
- **Ghostroot:** the Mimic from 8 (the Decoy before it), the Hotspot from 6.
- **Guards:** the Sentinel's Blacklist (a seal). The others have Call Home (a cast) from 10, and a Zip Bomb below 10.

A second lever in the same fight is rolled again: ordinary fights keep one (docs/puzzle-fights.md 2). About 60% of
today's fights have one already.

## 6. How it's measured

- **The planner learns each rework** (it reads the deciding fact) and still wins 85% of every fight: no walls.
- **No fixed rule wins.** For each lever, two scripted players that always take one side play its fights: always
  quiet on the beat and always fire; always trip and never; the Zip Bomb always early and always last; the Lockbox
  first and last; SIGINT every cast and only charges. Each must lose a few points of Signal (*start* 5) against the
  planner on some class, and neither may match the planner on every class. This measures the property directly,
  instead of a bot's luck.
- **The designer plays it.** P2 ships when it plays right, not when a column hits a number.
- **The kit and blind columns stay in `solved.mjs`** as information, with no ceiling.

## 7. Routines: a handler that reads the condition

A fixed preset (*Quiet on the beat*, *Tripwire last*) is a fixed rule, so it no longer wins on its own. Each lever brings
one WHEN chip that reads its deciding fact, at the rule tier (2 RAM):

| Lever | WHEN chip | A preset with it |
|---|---|---|
| Mimic | *dear copy*: on the beat, the copy of your rotation's move costs a tenth of your max or more | dear copy → Hold |
| Tripwire | *loud wins*: the other parts' Integrity is under what your next 3 cycles deal | loud wins → Rotation → the Tripwire |
| Zip Bomb | *blast pays*: the blast breaks a part, and your shield covers the fuse | blast pays → Rotation → the Zip Bomb |
| Lockbox | *cash in*: the held damage breaks the partner | cash in → Rotation → the Lockbox |
| Seal | *seal dear*: its part wears 2 ◆ or more, 2 cycles out | seal dear → your strip → that part |
| Cast | *dearer*: this cast costs more than the live charge | dearer → SIGINT |

Preparing still pays as much as watching (decision 6): the routine that fits the trick reads the same fact you would.

## 8. Build order

| Step | What ships | Done when |
|---|---|---|
| P2a | The Mimic, the Tripwire and the Zip Bomb reworked, with their board marks and WHEN chips. One lever a fight in the roll. The planner taught. The no-fixed-rule test. | The test passes, the planner floor holds, and the designer has played them. |
| P2b | The Lockbox, seals and casts with SIGINT on charges. The guards' levers. | The same. |
| P2c | The Decoy, if the designer wants it (question 6). | The same. |

P3 (elites) builds on section 4's pairs: two levers that pull against each other, plus the Integrity cut.

## 9. Decided

October 27, 2026, from the designer: *"Copy everything. To answer all questions, just lean on the notion of the more
difficult choice. I will test them out."* The harder choice, question by question:

1. **The Mimic** copies everything you fire (section 3.1's table).
2. **The Tripwire:** loud parts take more damage *and* drop their ◆, so tripping it is a real temptation.
3. **The Zip Bomb:** the blast takes a share of each part's max *and* a ◆ off each.
4. **SIGINT** answers a charge too: one key, two clocks.
5. **The Lockbox:** half the held damage lands on the partner, so cashing it in pays less.
6. **The Decoy:** the bent beat, more to read.
7. **The bar:** the blind and kit ceilings go; the no-fixed-rule test and the designer's play replace them (decision 2
   of docs/puzzle-fights.md changes with this).

All of P2 (a, b and c) is built for the designer to play.
