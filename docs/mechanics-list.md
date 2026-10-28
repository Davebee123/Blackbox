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
