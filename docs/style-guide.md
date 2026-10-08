# BLACKBOX style guide

How every line a player reads is written: tooltips, item effects, log lines, mail, tips and labels. The model is the skill tooltip the designer approved (the `help` and `short` of every ability in `dist/data.mjs` and `dist/classes/*.data.mjs`, and the key-1 rules in `SPIKE`). New text follows this page. When a rule here and a line in the game disagree, fix the line.

## 1. Two voices

**Tooltip grammar** is for anything that describes a mechanic: skills, talents, edges, statuses, item effects, rule affixes, zero-days, stats, daemons, filters, firewall tiers, buildings, architectures, genes, strains, guards, bosses and tells.

**Plain sentences** are for everything else: log lines, mail, contracts, story, tips, tutorial steps, warnings and hover text.

Both voices share the glossary (section 4) and the general rules (section 3).

## 2. Tooltip grammar

1. **Lead with a third-person verb, and use plain numbers.** "Deals 38 damage to the target." "Heals you for 4." "Breaks 3 ◆ on the target." "Grants you 1 ◆ at the start of each fight." Not "A hit for 38", not "Heal 4", not "two ◆".
2. **The effect comes first, the condition after it.** "Increases your damage by 50% when the target is below half Integrity." "Heals you for 6 when you land a critical strike." A condition that limits use gets its own sentence: "Usable only for 1 cycle after you break the target's last ◆." "Usable once per fight." "In a crew, can target a crewmate."
3. **Passive effects that fire on their own say how often in their own sentence:** "Works once per fight." "Works once per run." "Works again 90 minutes later." Skills you fire say "Usable once per fight."
4. **"The target" is the part you name.** An item effect on a hit also says "the target". A part you did not name is "a part", "every other part" or "the part whose attack lands soonest".
5. **Short lines lead with the number:** "38 damage, ×2 vs no armor", "Burn 12 ×3; stacks 3", "+1 filter slot", "30% faster defrag".
6. **No mechanic-speak.** Say what the player sees: "counts as a hit against a cast", not "counts as a hit on the cast"; "becomes usable", not "is lit" or "procs".
7. **Item effects** are one sentence built by `fxText` (`dist/content.mjs`): the effect as a verb phrase (`FX_DO[].label`), then its trigger and condition. A rule affix reads "Name — Sentence." in the approved `help` shape: "Interrupt Handler — Increases your damage by 15% when the target is winding up a tell." Write a unique's `effect.text` only when the generated sentence reads badly, and write it in the same shape.
8. **Library text** (`SKILL_TEXT` in `dist/lore.mjs`, and a subclass skill's `desc`) opens with the skill's hacker verb in the third person, then the mechanics in tooltip grammar: "Overclocks the target, dealing 40 damage. A critical strike resets the cooldown." Keep its numbers in step with `help`, because `scaledText` grows the same numbers with level.

## 3. General rules (both voices)

- **Show, don't tell.** Say what happens, not that it is good or clever.
- **Full sentences.** No "Label: fragment" (write "Ports open. Invasions come 2.5× as often.", not "Ports open: invasions 2.5×"). A source name before a full sentence in the combat log is fine ("Purge clears your encryption." or "Deductible: the Surge is covered.").
- **No semicolon chains.** Split them into sentences, or join with "and" or "but".
- **No aphorisms** outside flavour lines (item `flavour`, skill `lore`), which keep their own voice.
- **Hacker-flavoured names** for things you name: skills, daemons, items, buildings.
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

## 5. Before and after

### Skills and talents
- Before: "Overclock a part, dealing 40 damage. Critical hits reset the cooldown."
  After: "Overclocks the target, dealing 40 damage. A critical strike resets the cooldown."
- Before: "Opening stays lit for 2 cycles."
  After: "Opening stays usable for 2 cycles."
- Before: "Your first hit on each part's bare code crits (not through armor)."
  After: "Your first hit that damages each part is a critical strike. A hit that pierces armor to get there does not count."

### Item effects and rule affixes
- Before: "When you break a part: all your cooldowns drop by 1."
  After: "Reduces all your cooldowns by 1 cycle when you break a part."
- Before: "On a crit: heal 6."
  After: "Heals you for 6 when you land a critical strike."
- Before: "Interrupt Handler: +15% damage when the target is winding up a tell."
  After: "Interrupt Handler — Increases your damage by 15% when the target is winding up a tell."

### Stats, daemons, filters and tiers
- Before: "Chance a hit that does damage crits (everyone starts at 5%)."
  After: "Increases the chance that a damaging hit is a critical strike. Everyone starts at 5%."
- Before: "Once per fight: shields you for 15 the first time you drop below half."
  After: "Shields you for 15 the first time you drop below half health. Works once per fight."
- Before: "Defrag 30% faster"
  After: "30% faster defrag"

### Genes, strains, guards and bosses
- Before: "A plain heavy hit every 3 to 5 cycles."
  After: "Deals a plain heavy hit every 3 to 5 cycles."
- Before: "The Flooder hits every cycle, one harder each time; any delay resets it."
  After: "The Flooder attacks every cycle, dealing 1 more damage each time. Any delay resets it."
- Before: "A Patchwork boss: its Patcher heals the most damaged part. At 60% it re-arms, at 30% every attack comes a cycle sooner."
  After: "A Patchwork boss. Its Patcher heals the most damaged part. At 60% Integrity it re-arms every part, and at 30% every attack comes a cycle sooner."

### Log lines
- Before: "Shatter isn't lit. Break a part's last ◆ first."
  After: "Shatter isn't usable yet. Break a part's last ◆ first."
- Before: "Scramble: you're SCRAMBLED for 2 cycles. Each attack has a 25% chance to hit you instead."
  After: "Scramble lands, and you are SCRAMBLED for 2 cycles. Each of your attacks has a 25% chance to hit you instead."
- Before: "Finishing it now costs 80 credits; you have 40."
  After: "Finishing it now costs 80 credits. You have 40."

### Narrative, mail and tips
- Before: "Our board carries up to five offers at a time. Take up to three; drop any you like, and nothing is held against you."
  After: "Our board carries up to five offers at a time. Take up to three, and drop any you like. Nothing is held against you."
- Before: "This is your skill bar. Everyone has the first three, and you choose up to five class skills as they unlock."
  After: "This is your skill bar. Key 1 is your class's plain hit, and from level 10 the - key is SIGINT. You fill the other slots with class skills as they unlock: seven slots, eight at level 22 and nine at 30."

### UI labels and hover text
- Before: "Tagged: +25% damage from anyone; its timer shows even if it's veiled"
  After: "Tagged: burns on it deal 50% more damage, and its timer shows through a veil"
- Before: "Elite: built for a crew. Much tougher; three times the XP, three loot rolls, a blue at least."
  After: "Elite: built for a crew. It is much tougher, gives three times the XP, and rolls for loot three times, a blue at least."

## 6. Checking a line

1. Is it a mechanic? Then: verb first, number plain, effect before condition, the glossary's nouns.
2. Does it state a number? Check it against the code that implements it (`dist/data.mjs`, `dist/combat.mjs`, `dist/classes/*.mjs`, `dist/tells.mjs`). Text that is wrong about a mechanic is a bug.
3. Does a test match it? Update the test to the new wording and keep what it checks.
4. Does `GAME_RULES.md` or `README.md` quote it? Keep them in step.
