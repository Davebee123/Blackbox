# Routines: programs you write to fight for you

Draft, October 20, 2026, for the designer's review; reworked after the designer's playtest, October 21, 2026 (Decisions). Phase R1 is built (Build phases); the rest is not.

You should be able to start something and look away, the way you can in RuneScape or World of Warcraft, without the game losing its nuance. Attention is a dial, not a switch. Looking away never costs you the run or your rewards. Paying attention earns more.

## Principles

- **The nuance moves into preparation.** A program is a build decision, like a rotation. Understanding a virus in the Codex and writing a good program for it, for your subclass and gear, is a skill.
- **Easy to write.** Drag and drop, no code.
- **Attention still pays.** The best play needs you there. A program is good enough for ordinary fights; bosses and anything new need you.
- **Looking away is never fatal.** Safety rails stop a run before it goes wrong.
- **You know when to look back.** Sound, the pager and an optional browser notification tell you.

## 1. Programs and handlers

Today, when the cycle timer runs out, key 1 hits the last part you hit. From class level 5, a **program** replaces that fallback: your subclass's default rotation, plus a **routine for each virus** you've met (a Codex family, strain, guard or the Exfil): a stack of **handlers** you write, or a ready-made one you pick. The fight's virus picks the routine. Each cycle you don't act, the routine checks its handlers top to bottom, and the first one that fits fires. If none fits, the rotation does.

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
- You start from the virus: pick it from the list, then pick a ready-made routine for it (*Encryptor first*, *Before it hits*, *Guard when low*, *Focus the lowest*: built from its parts, your research and your bar) or write your own.
- Handlers sit in a stack you reorder by dragging. It reads like a sentence and needs no typing. It lives on the Loadout page, and on each part's Codex page (a quick "add a handler for this part", which opens that part's virus).
- Each subclass keeps its own program and starts with a sensible default rotation (the planner's priorities, which the balance bots already play).

### What the Codex unlocks

| Codex tier | WHEN chips you can use for that part |
|---|---|
| Decoded | Its name and health: focus it, leave it for last |
| Rule | Its rule and timer: before its attack lands, while it charges |
| Mastered | Prediction: the cycle before its tell, its hidden timer, its weak window |

Understanding a virus is how your program gets better at it.

### Exceptions: where you step in

Once a virus's routine is yours (you picked a preset, wrote or changed a handler, or pressed Confirm), a part in its fights that the routine has no handler for and your research doesn't cover **throws an exception**: that part, and only that part, is yours to play. It's marked on the board, *EXCEPTION · no available handler*, and a cue sounds once a fight. The program keeps playing the rest and never targets it; once it's gone, or you've acted on it, the program takes it too. A virus with no routine of yours never throws: the rotation plays it all. New things need you; things you've mastered become automatic. The varied encounters of the parts plan keep this loop going.

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

Each virus's routine has its own RAM, never a shared total. Each handler costs RAM by complexity (a plain handler 1, one with a rarer chip more). (Not "memory": that's the network's server slots.)

| Source | What it gives | What it rewards |
|---|---|---|
| Class level | A small, steady base: about 4 at level 1, about 10 at 50 | Playing |
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

1. **R1 (built):** programs from level 5, a routine per virus with its own RAM and ready-made presets, the drag-and-drop handler stack (WHEN, DO and TARGET chips from the Codex and your bar), per-subclass default rotations, the shown next move, override at any time, exceptions that hand you only the part, the ⟳ mark, RAM from class level, the auto jack-out threshold and stop-before-danger. Tests: a program fires only visible conditions and only researched WHEN chips, never the sync bonus, never a long cooldown unless named; an unknown part throws an exception; programs pay normal rewards; the rails stop a run.
2. **R2:** RAM from Codex mastery and gear, and the sandbox benchmark. Sound cues and the browser notification option.
3. **R3:** the rarer chips (Predict, Chain, Hold, Watch) as loot and Codex rewards, share codes, the run queue, and the bigger variety bonus.
4. **Later:** per-virus leaderboards and a weekly featured strain.

**R1 as built** (`dist/routines.mjs`, `dist/routines-view.mjs`, `dist/routines-ui.mjs`, `routines.test.mjs`; GAME_RULES.md *Routines*). Where it settles what the plan leaves open:

- **Level 5.** Routines unlock at class level 5 (`ROUTINES.unlockLevel`). Below it the Loadout's Program tab is greyed (its tooltip and its page say *Routines unlock at level 5.*), every `program …` command refuses with that sentence, the timer repeats your last hit as before, nothing throws, the rails are off and the Codex has no *+ handler*.
- **A routine a virus.** A virus is a Codex body: a family (and the room bodies), a strain, a guard, the Exfil; the key a part's research is kept under. Each class (each subclass from level 10) keeps one routine per virus, and a subclass's first program copies its class's routines. The fight's virus picks the routine; a virus with no handlers plays the rotation.
- **A cycle.** When the timer runs out and you typed nothing: a boss fight holds (nothing fires); else the parts that are yours to play (exceptions) are taken off the board for the program, which checks the routine's handlers top to bottom (the first whose WHEN holds now, whose skill is ready and whose target exists fires), then the rotation: the planner with every long cooldown taken out, and key 1 on the soonest attacker if that leaves nothing. With only parts that are yours left, it holds and nothing fires. It fires like auto-repeat: never synced, never a read of a tell. Off (`program off`), the old fallback comes back.
- **Chips.** WHEN on a part: *on board*, *under half*, *no ◆* at decoded; *hits now*, *hits in 2*, *tell live* at rule; *before tell* (the cycle before a tell's window opens) and *Open* at mastered. About the fight: *every cycle*, *you under half*, *2+ fragments* (a Replicator decoded), *encrypted 3+* (an Encryptor decoded), *any tell live* (any part at its rule), and a mutation once its rule is decoded. The palette shows the fight-wide chips and only the picked virus's parts you've met. TARGET: that part, soonest, lowest, no ◆; the broad three leave a Hotspot, a Tripwire or a Zip Bomb (while another part stands) and a Trojan's live Package for last, as the rotation's planner does. DO: the skills on your bar, Spike and SIGINT included.
- **Long cooldown** means 6 or more, by your talents and gear, or once a fight.
- **RAM.** Per routine: `ramFor(s, virus)` = 4 + 6 × (level − 1) / 49, rounded (4 at 1, 5 at 6, 8 at 30, 10 at 50) + `ramBonus(s, virus)`, which is 0 in R1 and is where R2's Codex mastery of that virus adds. A handler costs its WHEN chip's RAM (1, 2 or 3) and 1 more for a long cooldown. The cost shows as a small circle on the left of a WHEN chip, a preset and a handler row (*2R*; the row's total, so a chip in a row drops its own). Handlers past the budget sit out, top to bottom.
- **Presets.** Two to four a virus (`presetsFor`), each a prefilled stack that fits its RAM, with only chips you've opened and skills on your bar, and Break ◆ first on: *‹Signature› first* (its signature part decoded: your best hit at it while it's on the board, the option breaking its ◆ first; with a skill that goes through ◆ instead, such as Backdoor, that skill while it wears ◆ and your best hit once it's bare), *Before it hits* (its parts at their rule: your best hit on each whose attack lands now, signature first), *Guard when low* (a short-cooldown guard skill under half Signal, else the lowest), *Focus the lowest*, and *No ◆ first* if that leaves fewer than two. *Rotation* (no handlers) sits first. The current one is lit; an edited stack is marked *edited*, and a preset over it keeps it one **Undo** away (`program undo`).
- **Break ◆ first.** The designer's question (October 21): a routine should be able to say "break the armor first". An option on each routine (`armor` on it, false when off; missing is on, so new routines, presets and older saves have it on), a small switch with a steel ◆ beside the RAM meter, its tooltip *Break ◆ first: before a big hit would be absorbed by armor, your program cracks the armor first.* `program <virus> armor on|off`. Before a handler fires a skill that `armorTakes` (combat.mjs) says a ◆ on its target would take (a Front End wearing ◆ in front of it counts as the target), the program fires your best ready armor-breaker at that part instead (`breakerFor`): a skill on your bar whose data breaks ◆ (`breaks`: strip, or chits of 2; a piercer such as Backdoor breaks none, and Shatter, which only fires once the last ◆ is gone, isn't one), the one that breaks the most of the target's ◆, then the shortest cooldown, then the first on the bar, and never a long cooldown. The hit itself fires on a later cycle, once it lands. With none ready, the handler aims its hit at a part with no ◆ if its TARGET allows one (*soonest*, *lowest*: the first with no ◆ in the same order; *that part*: another part its WHEN chip names). **Otherwise it fires anyway**, into the ◆: a *that part* handler on an armored part, or a broad one when every part wears ◆. Free (`ROUTINES.armorRam` 0): it's on by default, so a cost would cut every routine's RAM and push the last handler of a full one out. Turning it on or off doesn't confirm a routine. The rotation is unchanged (the planner strips ◆ first on its own). Measured with mastered research over 120 seeded fights each (ransomware, worm, ghostroot; a bench-built character): Demolitionist level 14, *Focus the lowest*, 197 of 344 Overloads absorbed with it off, 0 of 265 with it on; *Before it hits*, 15 of 129 off, 1 of 117 on (the rotation's move). Overclocker level 20, *Focus the lowest*, 253 of 414 Segfaults off, 86 of 307 on; *Before it hits*, 36 of 236 off, 28 of 231 on; every one left fired with no breaker ready and no part without ◆.
- **Confirmed.** A routine is yours once you pick a preset (or *Rotation*), add, change, move, remove or clear a handler, or press **Confirm** (`program <virus> confirm`): `confirmed` on the routine. Only a confirmed virus throws exceptions; an R1 save's migrated routines count as confirmed.
- **Exceptions.** In a confirmed virus's fight, a part is covered by a handler that names it, or by its research: decoded for a plain part, its rule tier for a part with a rule (a Lockbox, a Mutex, a Mimic, a guard's rule); a tell on it by a handler on that part's tells (or *any tell live*) or by mastery. An uncovered part is yours: its row is edged and its tag line carries *EXCEPTION · no available handler* in the exception colour, its Now cell just *EXCEPTION* (`--exception`, an orchid: not red, which is a threat, nor teal, amber or the daemons' violet), and the log says it once. Acting on it (a typed command at it) or breaking it ends it; there is no hand-back key. A mutation hands nothing over (it is the whole virus, not a part; its chip is how you teach it). A boss, lair boss, Resident or crew boss: the whole fight is yours, one mark on the fight's header, whether or not the virus's routine is confirmed. The cue (an existing sound, escalate) plays once a fight.
- **Rails.** Auto jack-out trips on a crossing (a run you start under the line never trips) and works mid-fight as the emergency jack out. Stop-before-danger applies to a walk of more than one room (`cd` to an address or a folder far off); one step you take yourself goes in. Both from level 5.
- **Saves.** `s.programs`, made on first use with the defaults (program on, auto jack-out off, stop-before-danger on, no handlers, Break ◆ first on); no SAVE_VERSION change. An R1 save's single stack per class moves on load: each handler into the routine of the virus whose part it names, one naming no part into every met virus's routine with room for it (else dropped).

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
