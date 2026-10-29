# Mechanics list: 20 components for the designer to play

October 28, 2026. The designer: *"Adding more mechanics for me to test primarily is going to save a lot. Mechanics that
buff virus attacks, make your attacks hit weaker, stun you so you can't attack, add status effects. Maybe some status
effects unlock other abilities for the virus when you have it."* And: *"You can run a small balance check and make sure
they work, but don't go overboard with the bots. Players are going to be way smarter than bots."*

Drawn from Slay the Spire, Darkest Dungeon, Monster Train, Into the Breach and WoW and FFXIV raid design, checked against
what BLACKBOX already has. Several read the statuses that exist (Encrypted, Scrambled, Corrupted, Hung, Throttled), so
one new part makes new combinations without a new thing to learn. Numbers marked *start* are first guesses; the
designer's play tunes them.

## How to build them (CLAUDE.md "Lean first")

In one fresh session, as one batch:
- **Each component:** the rule, its board mark and its tooltip (WoW grammar; statuses on you in red, the threat colour),
  one unit test that it works, and the docs (GAME_RULES.md, README.md).
- **Where it goes:** each is a part (a gene in genes.mjs with a third-part spec in its family's pool) or a status on you,
  rolled like any third from a level that fits it. Each also gets a playtest page, `?playtest=part:<id>`.
- **Bots:** teach the planner only enough to keep the balance tests green, plus one small check, about 20 fights per
  component at one level. It confirms the component works and isn't absurd (the planner still wins). Players are
  smarter than bots: no tuning against them.
- **Wait for the designer:** routine chips and presets, the no-fixed-rule test, screenshot sets and balance tuning wait
  until the designer has played a component and kept it.
- **Workflow:** one agent at most, and the full suite once at the end.

## Statuses on you

1. **Exposed.** Your next incoming hit deals 50% more (*start*), then it clears. *Slay the Spire's Vulnerable.* Pulls
   against any charge: take it Exposed, or spend a shield now.
2. **Lag.** For 2 cycles (*start*) your command lands after the virus acts that cycle, not before. *Darkest Dungeon's
   speed order.* Pulls against cuts and deadlines, which need you first.
3. **Leak.** For 3 cycles (*start*) every command you fire costs 3% of your max (*start*); holding is free. *Slay the
   Spire's Pain.* Pulls against the Mimic, whose beat wastes a hold's cycle anyway.
4. **Sandboxed.** For 1 cycle you can fire only quiet commands: shields, strips, burns, helpers, no direct hits. *Monster
   Train's Silence, turned around.* Pulls against a part about to break that you needed to finish.
5. **Stunned.** Your next command doesn't fire unless you wear a ◆; the ◆ breaks instead. *Darkest Dungeon's stun and
   stun resist.* Pulls against the Scraper, which takes your ◆.
6. **Junk process.** A dead key takes one of your bar's keys until you clear it, which costs a command. *Slay the Spire's
   Dazed.* Pulls against Backlog and Lag, where every cycle already counts.

## Virus abilities your statuses unlock

7. **Predator.** While you're Encrypted or Corrupted, it attacks every cycle instead of every 3. *Darkest Dungeon's
   bonus against marked targets.* Pulls against cleansing now versus pushing damage.
8. **Opportunist.** Asleep, off the timeline, until you carry any debuff; then it wakes and attacks. *Raid adds that
   punish the debuffed.* Pulls against every other part's debuffs, which become its timer.
9. **Feeder.** Each cycle it heals the most damaged part by 2% of that part's max (*start*) for each debuff you carry.
   *Slay the Spire's leech enemies.* Pulls against kill speed versus cleansing.
10. **Punisher.** While you're Hung or Stunned, it gets a free extra attack. *Fighting games' punish windows.* Pulls
    against SIGINT on the Mimic's beat, which Hangs you.
11. **Harvester.** Its attack consumes all your Corrupted stacks for a hit of 4% of your max a stack (*start*). *WoW's
    consume-the-debuff mechanics.* A pile of Corrupted becomes a countdown you can read.
12. **Volatile.** Cleansing a status it gave you deals that status's remaining damage at once. *WoW's Unstable
    Affliction.* Purge and Scrub stop being automatic.

## Buffs and support on the virus

13. **Amplifier.** Each cycle it raises the next attack of one other part by 50% (*start*), in turn, and a chip shows
    which. *Monster Train's Rage givers.* Kill order shifts every cycle.
14. **Bodyguard.** At the end of each cycle it shields the part you hit that cycle, for 15% of that part's max
    (*start*). *Darkest Dungeon's Guard, Slay the Spire's Shield Gremlin.* Pulls against focus fire: switch, or break the
    Bodyguard first.
15. **Spite.** Each part you break makes every other part hit 20% harder (*start*) for the rest of the fight. *Raid
    enrage on an add's death.* Every break has a price, against the Tripwire's order.
16. **Thorns.** Your direct hits on it give you 1 Corrupted. *Monster Train's Spikes, Slay the Spire's Thorns.* Burns and
    helpers become its answer, and the Mimic punishes those on its beat.

## Timing and control

17. **Countdown.** After you fire 10 commands (*start*), it takes a big turn: every part attacks at once. A counter
    shows it. *Slay the Spire's Time Eater.* Holding stalls it; Leak and the Mimic punish holds.
18. **Backtrace.** Each status you carry adds a stack each cycle. At 5 stacks (*start*) it calls in a fragment, and the
    stacks reset. *Into the Breach's telegraphed spawns.* Every status becomes a clock.
19. **Swap.** When a status of the virus's lands on you, it moves to the next part you hit (Throttled throttles that
    part). *FFXIV's debuff passing.* Where to put it is the puzzle.
20. **Turncoat.** Below half your Signal it changes stance (*start*: its attack Scrambles). *Raid health phases, from
    your side.* Heal to stay over the line, or burst through the change.

## Combinations that should be hard

- **Opportunist and a Scrambler.** The Scramble wakes it, so cleanse timing decides the fight.
- **Volatile against the Purge-reliant kits** (the Bastion, the Sysop). Their main answer now has a price.
- **Stunned and a Scraper.** The Scraper takes the ◆ that would save you from the stun.
- **Harvester and the Corrupted from seals and landed tells.** The debuffs you already live with become a big hit.
- **Countdown, Leak and the Mimic.** Holding is the only way to stall the Countdown, and two parts punish it.

## As built (October 28, 2026)

All twenty are built lean in `dist/mechanics.mjs` (the rules and their `MECH` start numbers), each a gene in genes.mjs
with a third-part spec carrying `mech`, a tooltip, a cue under its name, red statuses on your strip, a unit test
(`mechanics.test.mjs`) and a playtest page. GAME_RULES.md has the table. Where the build reads the list its own way:

- **Spite is the Vendetta.** Spite is already a daemon's name.
- **Lag's gene is Latency.** The gene library wants a name longer than three letters. The status on you still reads Lag.
- **Exposed shares its name** with the Exposed you put on a part (+25% critical strike chance). The two read alike
  (you're easier to hurt), but the designer may want another word.
- **Lag runs only in a solo fight.** A Lagged cycle plays the virus's half first, then your command.
- **Leak never takes your last point**, and Junk process holds one key at a time, never key 1 or SIGINT. The dead key
  clears even while it's cooling.
- **Harvester's stacks** are the cycles your Corrupted has left. **Swap** moves the three statuses with a meaning on a
  part: Throttled, Exposed, and Corrupted as a burn (never a Volatile one).
- **The Opportunist stays awake** once woken. **The Amplifier** gives each part one boost at most, spent as it lands.
  **The Bodyguard's** shield is the Buffer's: it takes your commands only.
- **They don't roll yet** (`PARTS.mech` 0, as the Damper). They roll in no wild fight, breach node or server room. The
  playtest pages are how to meet them. At half weight they came in about 40% of wild fights from level 10. Four of the
  full suite's balance tests moved: the Overclocker's Sudo, crew-leaning kits, the Operator's solo pace and two sets.
  Bending the planner to those would be tuning against the bots. Once the designer keeps a part, give it a weight in
  `PARTS.weight` and run the full suite. `developer parts mech 0.5` rolls them all for a session.
- **A roll bug to fix when they roll.** An elite or ★ rare spawn holding two levers can swap away the floor native it
  must bring. This happens when a non-lever third is open to take the lever's place (parts.mjs). Today no such third
  is open where it matters. With the list rolling, the natives test fails. Fix: keep the forced native, and swap the
  other lever.

**The bots' check** (genesim, level 18, one seed, every subclass): Signal lost a fight against the body alone. Every one
is under the 25-point bound and the planner still wins. These are not tuning targets.

| Component | Points | Component | Points | Component | Points | Component | Points |
|---|---|---|---|---|---|---|---|
| Exposed | +10.3 | Predator | +22.4 | Amplifier | +12.5 | Countdown | +6.5 |
| Lag | +6.0 | Opportunist | +18.1 | Bodyguard | +20.0 | Backtrace | +6.4 |
| Leak | +21.5 | Feeder | +2.4 | Vendetta | +5.8 | Swap | −2.0 |
| Sandboxed | +9.0 | Punisher | −1.4 | Thorns | +18.5 | Turncoat | +3.1 |
| Stunned | +8.4 | Harvester | +9.5 | | | | |
| Junk process | +19.9 | Volatile | +14.8 | | | | |

Swap helps the bot: passing Throttled onto a part is a free debuff. Punisher and Harvester barely fire, because the
planner answers the tells that would Hang or Corrupt it. Feeder and Backtrace are small where the planner keeps clean.

## Do combinations need to spawn together?

The question is the abilities (7 to 12) and the two that read your statuses (Backtrace, Swap). The six statuses on you
and the four buffs stand alone: each part brings its own trigger. The rest fall into three kinds:

| Kind | Components | How they're fed today |
|---|---|---|
| Self-fed | Volatile, Thorns, Swap, Turncoat, Countdown, and the ten above | Their own attack or your own play triggers them. They work in any fight. |
| Fed by the body | Predator (Encrypted), Opportunist (Scrambled), Feeder, Backtrace (any debuff) | Built with `sig: true`: they roll only when the signature does, so the feeder is always there. |
| Fed by your mistakes | Punisher (Hung, Stunned), Harvester (Corrupted) | Landed tells, seals and the Mimic. They fire only when you miss a tell, and the playtest page brings a feeder part. |

**Option A: spawn rules.** A dependent part rolls only beside a part that feeds it (a `needs` list in the roll). Each
part stays one clean idea, and the combination is the lesson. The cost is slots: most wild fights roll one or two
thirds, the one-lever rule takes one, and a pair takes the rest. Pairs get rarer, every fight with one looks alike,
and the Codex has to explain parts in pairs.

**Option B: self-sufficient.** Every dependent part carries a small trigger of its own (a Predator whose Bite
Corrupts). It works in any fight, but each part becomes two rules, and the discovery (the Scramble wakes the
Opportunist) turns routine. Tooltips get busier, which the designer has rejected before.

**Option C, the recommendation: feed by the board, pair by hand.**
- **Keep the body-fed four on `sig`.** It costs nothing and is already built: the signature is in more than half of
  fights.
- **Widen Punisher and Harvester's triggers rather than pairing them.** The Punisher reads any command you lose: Hung,
  Stunned, or refused by Sandboxed. The Harvester reads any damage over time on you: Corrupted, or Encrypted stacks
  consumed for a big hit. Both then feed off what most fights already do, with no new part and no spawn rule.
- **Keep true pairs for authored fights.** The list's hard combinations (Opportunist with a Scrambler, Countdown with
  Leak and the Mimic, Stunned with a Scraper) suit elites, ★ rare spawns and floor natives. There a pair is the
  designed lesson, and a slot is spent on purpose. Wild rolls stay independent, and the rare fight where two parts
  meet is a surprise, not a rule.

This needs the designer's call before the trigger change: it reshapes what the Punisher and the Harvester ask of you.
