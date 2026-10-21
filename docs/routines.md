# Routines: programs you write to fight for you

Draft, October 20, 2026, for the designer's review. Phase R1 is built (Build phases); the rest is not.

You should be able to start something and look away, the way you can in RuneScape or World of Warcraft, without the game losing its nuance. Attention is a dial, not a switch. Looking away never costs you the run or your rewards. Paying attention earns more.

## Principles

- **The nuance moves into preparation.** A program is a build decision, like a rotation. Understanding a virus in the Codex and writing a good program for it, for your subclass and gear, is a skill.
- **Easy to write.** Drag and drop, no code.
- **Attention still pays.** The best play needs you there. A program is good enough for ordinary fights; bosses and anything new need you.
- **Looking away is never fatal.** Safety rails stop a run before it goes wrong.
- **You know when to look back.** Sound, the pager and an optional browser notification tell you.

## 1. Programs and handlers

Today, when the cycle timer runs out, key 1 hits the last part you hit. A **program** replaces that fallback: your subclass's default rotation, plus a stack of **handlers** you write for the viruses you understand. Each cycle you don't act, the program checks its handlers top to bottom, and the first one that fits fires. If none fits, the rotation does.

### Writing a handler: three chips, no code

A handler is one line of three chips, dragged into place (a dropdown on each chip does the same, for phones):

| WHEN | DO | TARGET |
|---|---|---|
| Mimic beat | Shield | — |
| Encryptor under 2 cycles to Encrypt | Overload | the Encryptor |
| A part charging a tell | Cut | the charging part |
| Fragments at 2 or more | Flood | — |

- **WHEN** chips come from your Codex: only parts and behaviours you've researched appear, each with its icon.
- **DO** chips are the skills on your bar, as cards.
- **TARGET** is a short list: that part, the soonest attacker, the lowest, a bare part.
- Handlers sit in a stack you reorder by dragging. It reads like a sentence and needs no typing. It lives on the Loadout page beside the bar, and on each part's Codex page (a quick "add a handler for this part").
- Each subclass keeps its own program and starts with a sensible default rotation (the planner's priorities, which the balance bots already play).

### What the Codex unlocks

| Codex tier | WHEN chips you can use for that part |
|---|---|
| Decoded | Its name and health: focus it, leave it for last |
| Rule | Its rule and timer: before its attack lands, while it charges |
| Mastered | Prediction: the cycle before its tell, its hidden timer, its weak window |

Understanding a virus is how your program gets better at it.

### Exceptions: where you step in

When a fight has a part, mutation or behaviour your program has no handler for, the program **throws an exception**: it holds its turn, a distinct cue sounds, and the part is marked on the board. You play that part by hand; one key hands control back. New things always need you; things you've mastered become automatic. The varied encounters of the parts plan keep this loop going.

### Watching and overriding

- The program's **next move shows** on the board as a ghosted command on the part it will hit.
- Anything you type overrides it for that cycle. Glance over, see a bad call coming, step in.
- Its moves carry a small ⟳ in the log and on the board, so you can review a fight you didn't watch.

### What programs can't do

- Fire a skill with a cooldown of 6 or more unless a handler names it (big cooldowns stay your call by default).
- Press Enter in the sync window.
- Use anything you can't see on the board.
- Fully handle a boss, lair, Resident or crew boss: their phases have no Codex handler, or only partial ones. Those fights are yours.

### RAM: the program's budget

Each handler costs RAM by complexity (a plain handler 1, one with a rarer chip more). (Not "memory": that's the network's server slots.)

| Source | What it gives | What it rewards |
|---|---|---|
| Class level | A small, steady base: about 4 at level 1, about 10 at 50 | Playing |
| Codex mastery | +1 for every 3 parts mastered, a bonus for a fully mastered family | Preparation: the main growth |
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

- **Auto jack-out threshold:** you set it (off, 10–50% Signal). Crossing it on a run jacks you out with your pack, like Deadman's Switch.
- **Stop before danger:** on by default. A program never walks into an elite, a boss, a Resident or a vault guard; the run waits there for you, with a sound cue.
- **Run queue:** you can queue a run's next rooms (clear these, open that), and the run walks them with your program, stopping at the rails above.

## 5. Attention by activity

| Low attention (program-friendly) | High attention (built for you) |
|---|---|
| SPRAWL-00 and mapped servers | Elites, lairs, Residents |
| Invasions your wall and daemons handle | Feuds, bounty hunts, crew bosses |
| Crafting, markets, the channel | New parts you haven't mastered |

The director already tells you when something in the right column appears.

## 6. Botting

Parked, by the designer's call (October 20, 2026). Revisit with real multiplayer.

## Build phases

R1 waits for phase P1 of the parts plan: that's where the variety comes from.

1. **R1 (built):** programs with the drag-and-drop handler stack (WHEN, DO and TARGET chips from the Codex and your bar), per-subclass default rotations, the shown next move, override at any time, exceptions on unknown parts, the ⟳ mark, RAM from class level, the auto jack-out threshold and stop-before-danger. Tests: a program fires only visible conditions and only researched WHEN chips, never the sync bonus, never a long cooldown unless named; an unknown part throws an exception; programs pay normal rewards; the rails stop a run.
2. **R2:** RAM from Codex mastery and gear, and the sandbox benchmark. Sound cues and the browser notification option.
3. **R3:** the rarer chips (Predict, Chain, Hold, Watch) as loot and Codex rewards, share codes, the run queue, and the bigger variety bonus.
4. **Later:** per-virus leaderboards and a weekly featured strain.

**R1 as built** (`dist/routines.mjs`, `dist/routines-view.mjs`, `dist/routines-ui.mjs`, `routines.test.mjs`; GAME_RULES.md *Routines*). Where it settles what the plan leaves open:

- **A cycle.** When the timer runs out and you typed nothing, the program first checks for an exception (it holds), then its handlers top to bottom (the first whose WHEN holds now, whose skill is ready and whose target exists fires), then the rotation: the planner with every long cooldown taken out (only a handler that names one fires it), and key 1 on the soonest attacker if that leaves nothing. It fires like auto-repeat: never synced, never a read of a tell. Off (`program off`), the old fallback comes back.
- **Chips.** WHEN on a part: *on board*, *under half*, *no ◆* at decoded; *hits now*, *hits in 2*, *tell live* at rule; *before tell* (the cycle before a tell's window opens) and *Open* at mastered. About the fight: *every cycle*, *you under half*, *2+ fragments* (a Replicator decoded), *encrypted 3+* (an Encryptor decoded), *any tell live* (any part at its rule), and a mutation once its rule is decoded. A part is its Codex key (a second copy answers to the first's). TARGET: that part, soonest, lowest, no ◆. DO: the skills on your bar, Spike and SIGINT included.
- **Long cooldown** means 6 or more, by your talents and gear, or once a fight.
- **RAM.** 4 + 6 × (level − 1) / 49, rounded: 4 at 1, 5 at 6, 8 at 30, 10 at 50. A handler costs its WHEN chip's RAM (1, 2 or 3) and 1 more for a long cooldown. Handlers past the budget sit out, top to bottom.
- **Exceptions.** A part is covered by a handler that names it, or by its research: decoded for a plain part, its rule tier for a part with a rule (a Lockbox, a Mutex, a Mimic, a guard's rule). A mutation by a handler on it or its rule decoded. A tell by a handler on that part's tells (or *any tell live*) or by mastery. A boss, lair, Resident or crew boss always throws, once a phase. Handing back covers what's on the board for the rest of the fight. The cue is an existing sound (escalate) for now.
- **Rails.** Auto jack-out trips on a crossing (a run you start under the line never trips) and works mid-fight as the emergency jack out. Stop-before-danger applies to a walk of more than one room (`cd` to an address or a folder far off); one step you take yourself goes in.
- **Saves.** `s.programs`, made on first use with the defaults (program on, auto jack-out off, stop-before-danger on, no handlers); no SAVE_VERSION change.

## Decisions

October 20, 2026, from the designer.

1. **Reward attention, never penalize its absence.** No reduced XP or loot for routine-played fights, and no streak or bonus for watching. Attention pays because the most complex and rewarding fights need you to look: their tells and mechanics are beyond what a routine can handle.
2. **Routines are available from the start,** to see how it feels.
3. **No diminishing returns.** Farming one place is never paid below normal; varied play earns a bigger variety bonus on top.
4. **Handlers are written with drag and drop** (dropdowns as a fallback), never typed code.
5. **Encounters need some skill, and prep is rewarded,** like RuneScape: ordinary fights can run on a program; bosses can't.
6. **Sharing will happen,** so it's designed in: share codes, limited by your own Codex and RAM.
7. **RAM** comes from class level (a small base), Codex mastery (the main growth) and gear (a trade-off).
