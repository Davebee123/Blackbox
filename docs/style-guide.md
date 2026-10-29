# BLACKBOX style guide

How every line a player reads is written: tooltips, item effects, log lines, mail, tips and labels. The model is the skill tooltip the designer approved (the `help` and `short` of every ability in `dist/data.mjs` and `dist/classes/*.data.mjs`, and the key-1 rules in `SPIKE`). New text follows this page. When a rule here and a line in the game disagree, fix the line.

## 0. The mantra: show it, don't explain it

**The designer's rule, and it outranks everything below.** The screen shows; it does not explain. If a player has to read a paragraph to understand a card, the card is wrong.

- **Visual vocabulary first:** an icon, a number, a bar, pips, a state (lit, dim, locked, done), a colour, a position. *What adds how much* is an icon and a number on one row; *how many are left* is pips or a bar; *not available yet* is a dim, locked row.
- **Words are labels, not instructions:** "Relay", "Trace injector". No "Also: …", no sentence that walks the player through a mechanic on the card.
- **The detail lives one step away,** in a tooltip (a tap on a phone). A sentence on the card is the last resort, and then one short line.
- **Cut every word the player can do without.** Assume they know the basics: what a slot, a stat or ▲ ▼ means. What needs teaching goes in the tutorial; anything else is left out, not explained. No qualifiers the screen already answers ("into an empty slot"), no restating the card in its tooltip.
- **Rewards, costs and stats are icons and numbers, in tooltips too.** A tooltip carries icon chips in a `<template class="tt-more">` inside its element (app.js `ttShow`); never spell out "Pays 90 credits and 240 XP".

Everything below is how the text in tooltips, logs, mail and tips is written. It is not a licence to put that text on the card.

## 1. Two voices

**Tooltip grammar** is for anything that describes a mechanic: skills, talents, edges, statuses, item effects, rule affixes, zero-days, stats, daemons, filters, firewall tiers, programs, a part's rules, strains, guards, bosses and tells.

**Plain sentences** are for everything else: log lines, mail, contracts, story, tips, tutorial steps, warnings and hover text.

Both voices share the glossary (section 4) and the general rules (section 3).

## 2. Tooltip grammar

The one full statement of how a tooltip reads (CLAUDE.md and docs/ui.md point here). A tooltip reads like World of
Warcraft's: **a name, its kind, what it does, then the answer, muted.** `style.test.mjs` holds every part, tell,
mutation and gene description to it.

1. **The name is the title.** The tooltip system bolds `Name: rest` (app.js `ttShow`); the body never repeats the name.
2. **Lead with a third-person verb, and use plain numbers.** "Deals 38 damage to the target." "Heals you for 4." "Breaks 3 ◆ on the target." Not "A hit for 38", not "Heal 4", not "two ◆". A part breaks, so it is *When broken*, not *When destroyed*.
3. **The effect comes first, the condition after it.** "Increases your damage by 50% when the target is below half Integrity." A condition that limits use gets its own sentence: "Usable once per fight." "In a crew, can target a crewmate."
4. **One idea a sentence.** Short, present tense. No colon chains, no semicolons, no sentence over 25 words. Name the target where *it* would be unclear: *the Encryptor*, *you*, *its partner*.
5. **Passive effects say how often in their own sentence:** "Works once per fight." "Works again 90 minutes later."
6. **"The target" is the part you name.** A part you did not name is "a part", "every other part" or "the part whose attack lands soonest". Second person only for the player as the target: "Deals 6 damage to you."
7. **The mechanics never give advice. The answer goes on its own last line:** one imperative of 10 words or fewer, starting with `▸ ` (fightread.mjs `answerLine`), drawn muted under a rule like WoW's *Use:* line. On a Codex card it is its own paragraph with the same ▸. Cut it when it only repeats the mechanics.
8. **Short lines lead with the number:** "38 damage, ×2 vs no armor", "Burn 20 ×4; refreshes", "+1 filter slot".
9. **No mechanic-speak.** Say what the player sees: "becomes usable", not "is lit" or "procs".
10. **Numbers** are the live, scaled values in a fight and the base values on a Codex card.
11. **Item effects** are one sentence built by `fxText` (`dist/content.mjs`): the effect as a verb phrase, then its trigger and condition. A rule affix reads "Name — Sentence.": "Interrupt Handler — Increases your damage by 15% when the target is winding up a tell." Write a unique's `effect.text` only when the generated sentence reads badly.
12. **Library text** (`SKILL_TEXT` in `dist/lore.mjs`, a subclass skill's `desc`) opens with the skill's hacker verb, then the mechanics: "Overclocks the target, dealing 40 damage. A critical strike resets the cooldown." Keep its numbers in step with `help`, because `scaledText` grows them with level.

## 3. General rules (both voices)

- **Show, don't tell.** Say what happens, not that it is good or clever.
- **Full sentences.** No "Label: fragment" (write "Burns on it deal 50% more damage.", not "Burns: +50%"). A source name before a full sentence in the combat log is fine ("Purge clears your encryption." or "Deductible: the Surge is covered.").
- **No semicolon chains.** Split them into sentences, or join with "and" or "but".
- **No aphorisms** outside flavour lines (item `flavour`, skill `lore`), which keep their own voice.
- **Hacker-flavoured names** for things you name: skills, daemons, items, programs.
- **One name per concept** (section 4). Do not swap in a synonym for variety.
- **Numbers:** digits for game numbers ("1 cycle", "3 ◆", "25%"), words only in flavour and narrative ("three bugs, one door").
- **Status readouts** (the `network` sheet, `status`, the damage line's notes, "+12 XP") may stay as labelled data. They are readouts, not prose.
- **Alert prefixes** the code parses stay as they are: `LOCKDOWN:`, `INVASION:`, `PHASE 2.`, `DISCONNECTED`.
- **Mail and story keep their voices.** wick writes lower case and short. Halcyon's Claims desk writes formal and dry. GLASSJAW is terse. Fix grammar and clarity, never personality.

## 4. Glossary

| Use | For | Never |
|---|---|---|
| **virus** | A whole enemy: a body of parts. | mob, monster |
| **part** | One piece of a virus (Pulse Node, Encryptor). | node, piece, organ |
| **the target** | The part you named. | the enemy, it (at the start of a tooltip) |
| **◆, armor** | A part's armor, one ◆ at a time. "Breaks 3 ◆." "A target with no armor." | chit, shell, casing (in rules; fine in flavour), bare |
| **no armor** | A part with no ◆ left. | bare, stripped bare, naked |
| **break, broken** | What happens to a part at 0 Integrity, and to a ◆ you remove. | kill (a part), destroy |
| **strip** | Breaking a part's ◆ until none are left. | crack (except the skill) |
| **Signal** | Your health on runs and in the rogue servers. | HP, health (on its own) |
| **Integrity** | Your server's health, and a part's. | HP |
| **health** | Only when it can be either Signal or Integrity ("below half health"). | |
| **cycle** | One turn of a fight. | turn, tick (except a burn's tick) |
| **critical strike** | A hit for ×1.5. "Is a critical strike", "has a 25% higher chance to critically strike". Short lines and floating numbers may say **crit**. | crit (in long text), crits |
| **burn** | Damage every cycle from your skills (Inject, Purge). Each hit of it is a **tick**. | DoT, bleed |
| **helper** | An Operator's summoned process. | bot, minion, pet |
| **tell** | A move a part announces ahead: a **charge**, a **cast**, a **seal**, or the **Mimic**'s beat. | telegraph (in player text) |
| **charge** | A tell that powers up one attack. You **call it off**. | windup (except a Deadline's wind-up) |
| **cast** | A tell that compiles a buff on the virus. You **interrupt** it. | spell |
| **seal** | A tell that re-arms a part if it still wears ◆. | |
| **answer** | What you do to a tell (hit it, strip it, go quiet). | counter, solve |
| **Open** | A part you answered, taking more from everyone. | |
| **daemon** | A program you slot that acts on its own. Enemy security programs are **guards** or **ICE**. | (enemy) daemon |
| **usable** | A skill that only works after something happens. "Retaliate becomes usable." | lit, lights up (in text; the bar may glow) |
| **shield** | Damage absorbed before Signal or Integrity. "Shields you for 16." | barrier (except the skill) |
| **delay** | Pushing an attack later. "Delays the attack by 1 cycle." | push back, stall (except the daemon) |
| **Mimic** | The part that plays your command back at you. | copycat |
| **research** | What you've learned about one part, 0 to 60: "Encryptor research 15." **Decoded** is research 3; **mastered** is 60. | gene, genome (never in player text), study, XP (for research) |
| **rule** | What a part, a mutation or a strain does that changes the fight (Ward, Armored, a tell). | gene |

## 5. Before and after

- Skill: "Overclock a part, dealing 40 damage. Critical hits reset the cooldown." → "Overclocks the target, dealing 40 damage. A critical strike resets the cooldown."
- Item effect: "On a crit: heal 6." → "Heals you for 6 when you land a critical strike."
- Stat: "Once per fight: shields you for 15 the first time you drop below half." → "Shields you for 15 the first time you drop below half health. Works once per fight."
- Virus rule: "The Flooder hits every cycle, one harder each time; any delay resets it." → "The Flooder attacks every cycle, dealing 1 more damage each time. Any delay resets it."
- Log line: "Shatter isn't lit. Break a part's last ◆ first." → "Shatter isn't usable yet. Break a part's last ◆ first."
- Mail: "Take up to three; drop any you like, and nothing is held against you." → "Take up to three, and drop any you like. Nothing is held against you."
- Hover text: "Elite: built for a crew. Much tougher; three times the XP, three loot rolls, a blue at least." → "Elite: built for a crew. It is much tougher, gives three times the XP, and rolls for loot three times, a blue at least."

## 6. Checking a line

0. Can it go? Cut it if the screen, an icon or the tutorial already says it.
1. Is it a mechanic? Then: verb first, number plain, effect before condition, the glossary's nouns.
2. Does it state a number? Check it against the code that implements it (`dist/data.mjs`, `dist/combat.mjs`, `dist/classes/*.mjs`, `dist/tells.mjs`). Text that is wrong about a mechanic is a bug.
3. Does a test match it? Update the test to the new wording and keep what it checks.
4. Does `GAME_RULES.md` quote it? Keep it in step.
