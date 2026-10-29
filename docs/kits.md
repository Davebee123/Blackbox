# Kits: rotations, answers, cooldowns and specialists

The model every subclass kit is built to, and the checks that hold it. Built: fifteen keys a subclass (lines in
docs/subclasses/*.md, rules in GAME_RULES.md "Classes"), presets, and the checks below (kits-balance.test.mjs,
kits-crew.test.mjs, balance.test.mjs). Left: the kit retune the held drifts in section 7 wait on. Code cites this doc by
section number.

## 1. The kit model

### 1.1 The four layers

| Layer | What it is | Keys on a rotation build | Cooldowns |
|---|---|---:|---|
| Core rotation | Three or four buttons good against anything, one feeding another. Key 1 is the filler under them. | 4 | 0 to 3 cycles |
| Utility and answers | Interrupts, cleanses, mitigation, control, the answers to tells. Each has a plain use too. | 3 | 4 to 6 |
| Cooldowns | The big buttons you plan a fight around. | 1 to 2 | 8 or more, or once a fight |
| Specialists | Great against one kind of board: fragments, healers, seals, the Mimic, a part rule, a boss. | 0 to 1 (2 to 3 on a conditional build) | 3 to 6 |

Every skill obeys two rules.

| Rule | What it means |
|---|---|
| Baseline floor | Outside its situation, a skill is worth at least a key-1 hit for the command. A setup skill does some damage too. |
| Situation multiplier | In its situation a specialist is worth two to three times its baseline, so carrying it is a real choice. |

A damage dealer presses 5 to 12 commands a fight, so it meets at most six or seven keys. A pool bigger than the bar is
what makes swapping before a fight worth it.

### 1.3 Press-share targets

Shares of all commands in a fight, key 1 and SIGINT included.

| Layer | Rotation build, typical fight | Conditional build, matched | Conditional build, unmatched |
|---|---:|---:|---:|
| Core rotation | 60–70% | 35–45% | 55–65% |
| of which key 1 | 20% at most | 15% at most | 20% at most |
| Utility and answers | 15–25% | 15–20% | 15–25% |
| Cooldowns | 5–15% | 5–15% | 5–15% |
| Specialists | 0–5% | 25–35% | 5–10% |

## 5. The bar

### 5.2 Presets

A preset belongs to one subclass and stores its keys in order; each subclass keeps up to six. Two ship with each
subclass: `rotation`, which the bar follows as skills unlock until you edit it, and a second playstyle (section 11).
A preset naming a skill you don't know leaves that key empty and says so.

## 6. Specialists read board facts

A specialist reads a board fact, never a family or strain name, so any gene that makes the fact lights it.

| Board fact | Specialists that answer it |
|---|---|
| Fragments, spawning | Fork Bomb, Chain Reaction, DMZ, Multicast, Propagate, Garbage Collect |
| Heals, patches, Self-Update | Revoke, Rootkit Implant, Cache Poison, Bit Rot |
| Armor that comes back, seals | Bit Rot, Polymorph, Fork, Cache Poison |
| Veil, Decoy, Mimic, Echo, Scramble | Unmask, Log Wipe, Honeypot, Echo Cancel, Sudo |
| Locks, wards, Tripwire, going loud | Sudo, Logic Bomb, Throttle, Zero-day |
| Long fights, bosses | Crontab, Circuit Breaker, Takeover, Maintenance Window |

## 7. The checks

Run on the scripted players, so every skill needs a planner rule for its baseline and its moment.

| Check | Bar |
|---|---|
| Press spread, `rotation` preset, Lv 18, 30 and 40 | 4.4 effective keys or more; key 1 at most 20% of presses |
| Core rotation alone | Within 12 points of the full build (the Bastions 20) at Lv 18 and 30, with 90% of its wins |
| Second presets | Within 5 points of `rotation` on the generic fights, and 5 better on the fights they suit |
| Specialist keys | Pressed in a quarter of the generic fights when on the bar |
| Level-10 Breakers | Beat the three-part solo bosses half the time, HOLLOW CHOIR included |
| Per mode | Solo-leaning subclasses lose less alone; crew-leaning damage dealers win 90% of a crew's boss tries and keep it higher |
| The Bastions alone | The Warden at least 1.4× the damage dealers' median cycles a fight, the Sysop 2× and at most 15% Signal lost |
| Tells still pay | The reading bot beats the bot that ignores tells (balance.test.mjs) |

**Held drifts** (`DRIFT` in kits-balance.test.mjs, waiting on a kit retune): the Demolitionist's `area`, the Sysop's
`healers`, the Hijacker's and the Overclocker's `rules` and the Herder's `swarm` sit outside the second-preset bar, and
the Hijacker carries a crew in 65% of boss tries.

## 9. The designer's decisions

- **Order.** Lines are reordered freely; saves keep every skill they knew.
- **Swapping.** Presets swap anywhere out of a fight, home or run; swapped-in keys start the next fight cooling.
  Editing presets follows the same rule.
- **Solo and crew.** A subclass may be weaker in one mode if it is stronger in the other (a holy priest is weak solo,
  strong in a group). Balance bands are per mode and per subclass.
- **Key 1.** Each class names it to fit its theme; it stays a plain hit with no cooldown, at 20% of presses at most.

## 11. After review

- **General use over narrow counters.** A specialist key is useful in most fights, its special case a bonus.
- **Second presets are playstyles**, not counters: the Demolitionist's `area`, the Phantom's `evasion`, `rules`,
  `swarm` and `healers` for the rest.
- **The Sysop alone** deals 75% with its hits and burns (`SUBS.sysop.alone`); its heals come from the full hit. In a
  crew nothing changes.
- **The spike cap.** A solo boss's single landing stops at 60% of your max, a wild virus's or a guard's charge at 45%
  (`CONFIG.spikeCap`). Plain wild hits aren't capped: capping them made levels 1 to 12 too safe.
- **Tooltips** read like a World of Warcraft tooltip (docs/style-guide.md).
