# Routines: programs you write to fight for you

**Status.** The plan for programs that play your moves when you look away. Built: R1, programs from level 5 with a
routine per virus, presets, exceptions, RAM from class level and the rails (GAME_RULES.md *Routines: your program*).
Left: R2 (RAM from mastery and gear, the benchmark, cues) and R3 (rarer chips, share codes, the run queue).

You should be able to start something and look away, the way you can in RuneScape or World of Warcraft, without the game losing its nuance. Attention is a dial, not a switch. Looking away never costs you the run or your rewards. Paying attention earns more.

## Principles

- **The nuance moves into preparation.** A program is a build decision, like a rotation. Understanding a virus in the Codex and writing a good program for it, for your subclass and gear, is a skill.
- **Easy to write.** Drag and drop, no code.
- **Attention still pays.** The best play needs you there. A program is good enough for ordinary fights; bosses and anything new need you.
- **Looking away is never fatal.** Safety rails stop a run before it goes wrong.
- **You know when to look back.** Sound, the pager and an optional browser notification tell you.

## 1. Programs and handlers

A **program** is your subclass's default rotation plus a **routine for each virus** you've met: a stack of
**handlers** (WHEN, DO, TARGET chips, dragged into place) or a ready-made preset. Built in R1: GAME_RULES *Routines:
your program*. Still to build is what makes a program worth studying:

### RAM: the program's budget

Each virus's routine has its own RAM, never a shared total. Each handler costs RAM by complexity (a plain handler 1, one with a rarer chip more). (Not "memory": that's the network's server slots.)

| Source | What it gives | What it rewards |
|---|---|---|
| Class level (built) | A small, steady base: 4 at level 1, 10 at 50 | Playing |
| Codex mastery | That virus's routine: +1 for every 3 of its parts mastered, a bonus for a fully mastered family | Preparation: the main growth |
| Gear | A RAM stat on some protocols, paid for like Scavenge (it costs the item's other stats); a few uniques and set bonuses add RAM or make one kind of handler cheaper | A build choice: a stronger character or a smarter program |

At level 30, roughly 8 from level, 4–6 from mastery and 0–3 from gear: a player who studies has nearly twice the program of one who doesn't.

### Theorycrafting

A program only has a "best" worth arguing about if its result depends on more than which skill it presses. Four things make it so:

- **Gear and talents that care about sequence.** Chorus wants the same skill twice in a row; Appraisal wants a break first; Glass Jaw wants Signal kept high; Clean Signal wants attacks cut, not tanked; uniques like refund-on-crit and chain-on-break; talents like Kill Chain. With different gear, a different program is best.
- **Rarer chips as loot and Codex rewards:** Predict (act a cycle before a tell), Chain (two actions as one handler), Hold (skip a cycle to line up a combo), Watch (react to a crewmate). Your program's vocabulary grows like a skill tree.
- **RAM as a budget,** so the question is always the best program that fits.
- **A sandbox benchmark:** pick a virus build from your Codex and run your program against it 50 times (the balance harness's fight engine): average cycles to kill, Signal lost, win rate. "The most efficient program for an Encryptor with a Mutex" gets a real, comparable answer. Later: per-virus leaderboards and a weekly featured strain everyone benchmarks.
- **Sharing:** a program exports as a short code to paste. An imported program only runs as well as your own Codex research and RAM allow, so a shared program is a starting point, not a shortcut.

The parts plan's variety (about 46 part kinds, mutations, strains, two new families, fights of 2–4 parts) times four classes, eight subclasses, talents and gear is what keeps any single program from winning everywhere.

## 2. What attention still earns

| You, watching | Your program |
|---|---|
| The sync window: +10% on the move | Never |
| Tells answered the best way (the exact cycle, holding through a Mimic beat) | The simple answer only |
| Big cooldowns saved for the right moment | Only if a handler names them |
| The fights worth the most: elites, lairs, Residents, feuds and crew bosses are complex enough that you need to be watching to win them | Ordinary fights, at normal rewards; nothing taken away |

Elites, lair bosses, Residents, feuds and crew bosses have tells built to need you. A program can survive them badly; it can't farm them.

## 3. Knowing when to look back

- **Sound cues**, each distinct: a tell landing on you, Signal under 30%, an elite in the room, a rare drop, a director event, a run ending.
- **Browser notification** (an option, off by default) when the tab is in the background and something needs you: a run stopped, an elite ahead, a feud or bounty hunt dealt.
- **The pager** keeps the rest, as now.

## 4. Safety rails

- **Auto jack-out** and **stop before danger**: built (R1).
- **Run queue:** you can queue a run's next rooms (clear these, open that), and the run walks them with your program, stopping at the rails above.

## 5. Attention by activity

| Low attention (program-friendly) | High attention (built for you) |
|---|---|
| SPRAWL-00 and mapped servers | Elites, lairs, Residents |
| Invasions your wall and daemons handle | Feuds, bounty hunts, crew bosses |
| Markets, the channel | New parts you haven't mastered |

The director already tells you when something in the right column appears.

## 6. Botting

Parked, by the designer's call (October 20, 2026). Revisit with real multiplayer.

## Build phases

1. **R1:** built.
2. **R2:** RAM from Codex mastery and gear, and the sandbox benchmark. Sound cues and the browser notification option.
3. **R3:** the rarer chips (Predict, Chain, Hold, Watch) as loot and Codex rewards, share codes, the run queue, and the
   bigger variety bonus.
4. **Later:** per-virus leaderboards and a weekly featured strain.

## Decisions

October 20, 2026, from the designer.

1. **Reward attention, never penalize its absence.** No reduced XP or loot for routine-played fights, and no streak or bonus for watching. Attention pays because the most complex and rewarding fights need you to look: their tells and mechanics are beyond what a routine can handle.
2. **Routines are available from the start,** to see how it feels. (Changed October 21: from level 5.)
3. **No diminishing returns.** Farming one place is never paid below normal; varied play earns a bigger variety bonus on top.
4. **Handlers are written with drag and drop** (dropdowns as a fallback), never typed code.
5. **Encounters need some skill, and prep is rewarded,** like RuneScape: ordinary fights can run on a program; bosses can't.
6. **Sharing will happen,** so it's designed in: share codes, limited by your own Codex and RAM.
7. **RAM** comes from class level (a small base), Codex mastery (the main growth) and gear (a trade-off).

October 21, 2026, from the designer's playtest.

8. **Routines open at class level 5,** not from the start: below it the Program tab is greyed and the old fallback plays.
9. **RAM is per virus,** never a shared total: each routine has its own budget, and Codex mastery will grow the virus you mastered.
10. **Virus first.** You pick a virus, then a routine for it: ready-made presets from its parts, or your own stack.
11. **Auto jack-out stays** (the emergency escape mid-fight).
12. **Exceptions, streamlined:** a colour that isn't red, labelled *EXCEPTION · no available handler*, handing over only the part (the program plays the rest), with no key to hand back and one cue a fight.
13. **Only a routine you made or confirmed throws.** A virus you haven't set up is the rotation's, start to finish.
