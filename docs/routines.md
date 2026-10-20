# Routines: playing with one eye on another screen

Draft, October 20, 2026, for the designer's review. Nothing here is built.

You should be able to start something and look away, the way you can in RuneScape or World of Warcraft, without the game losing its nuance. Attention is a dial, not a switch. Looking away never costs you the run or your rewards. Paying attention earns more.

## Principles

- **The nuance moves into preparation.** A routine is a build decision, like a rotation. Writing a good one for your subclass and kit is a skill.
- **Attention still pays.** The best play needs you there. A routine is good enough for ordinary fights and never as good as you.
- **Looking away is never fatal.** Safety rails stop a run before it goes wrong.
- **You know when to look back.** Sound, the pager and an optional browser notification tell you.

## 1. Routines

Today, when the cycle timer runs out, key 1 hits the last part you hit. A routine replaces that fallback: an ordered list of rules, checked top to bottom each cycle you don't act. The first rule that fits fires.

| Rule (examples) | Fires when |
|---|---|
| Cut the part whose attack a tick would cancel | a cut is on the board this cycle |
| Strip armor on the part attacking soonest | it has ◆ and attacks within 2 cycles |
| Shield | a hit of 20%+ of your max Signal lands this cycle |
| Burn the Tagged part | a part is Tagged and has no burn |
| Hit the bare part with the least Integrity | always |

- **Building one:** pick rules from a list and order them by dragging, on the Loadout page beside the bar. Each subclass keeps its own routine, and every subclass starts with a sensible default (the planner's own priorities, which the balance bots already play).
- **What rules can use:** your skills on the bar, and conditions you can see on the board: armor, ticks, cuts, tells, statuses, Signal, who attacks soonest. Nothing a player can't see.
- **What rules can't do:** fire a skill with a cooldown of 6 or more (your big cooldowns stay your call) unless you add it by name, and never press Enter in the sync window.
- **The routine shows what it did:** a small ⟳ on its command in the log and on the board, so you can review a fight you didn't watch.

## 2. What attention still earns

| You, watching | The routine |
|---|---|
| The sync window: +10% on the move | Never |
| Tells answered the best way (the exact cycle, holding through a Mimic beat) | The simple answer only |
| Big cooldowns saved for the right moment | Only if you added them, by its rule |
| The fights worth the most: elites, lairs, Residents, feuds and crew bosses are complex enough that you need to be watching to win them | Ordinary fights, at normal rewards; nothing taken away |

Elites, lair bosses, Residents, feuds and crew bosses have tells built to need you. A routine can survive them badly; it can't farm them.

## 3. Knowing when to look back

- **Sound cues**, each distinct: a tell landing on you, Signal under 30%, an elite in the room, a rare drop, a director event, a run ending.
- **Browser notification** (an option, off by default) when the tab is in the background and something needs you: a run stopped, an elite ahead, a feud or bounty hunt dealt.
- **The pager** keeps the rest, as now.

## 4. Safety rails

- **Auto jack-out threshold:** you set it (off, 10–50% Signal). Crossing it on a run jacks you out with your pack, like Deadman's Switch.
- **Stop before danger:** on by default. A routine never walks into an elite, a boss, a Resident or a vault guard; the run waits there for you, with a sound cue.
- **Run queue:** you can queue a run's next rooms (clear these, open that), and the run walks them with your routine, stopping at the rails above.

## 5. Attention by activity

| Low attention (routine-friendly) | High attention (built for you) |
|---|---|
| SPRAWL-00 and mapped servers | Elites, lairs, Residents |
| Invasions your wall and daemons handle | Feuds, bounty hunts, crew bosses |
| Crafting, markets, the channel | New parts you haven't mastered |

The director already tells you when something in the right column appears.

## 6. Botting

Parked, by the designer's call (October 20, 2026). Revisit with real multiplayer.

## Build phases

1. **R1:** routines (rules, ordering UI, per-subclass defaults, the ⟳ mark), the attention rules in section 2, the auto jack-out threshold and stop-before-danger. Tests: a routine fires only visible-condition rules, never the sync bonus, never a long cooldown unless added; routine-played fights pay normal rewards; the rails stop a run.
2. **R2:** sound cues and the browser notification option.
3. **R3:** the run queue, and the bigger variety bonus.

## Decisions

October 20, 2026, from the designer.

1. **Reward attention, never penalize its absence.** No reduced XP or loot for routine-played fights, and no streak or bonus for watching. Attention pays because the most complex and rewarding fights need you to look: their tells and mechanics are beyond what a routine can handle.
2. **Routines are available from the start,** to see how it feels.
3. **No diminishing returns.** Farming one place is never paid below normal; varied play earns a bigger variety bonus on top.
