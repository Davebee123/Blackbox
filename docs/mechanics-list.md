# Mechanics list: 20 parts for the designer to play

**Status.** Twenty new part mechanics for the designer to test. Built, all twenty, lean: `dist/mechanics.mjs` (rules
and `MECH` start numbers), a gene each, playtest pages `?playtest=part:<id>`; GAME_RULES.md *Families and mutations*
has the table. Left: none rolls yet (`PARTS.mech` 0), the roll bug below, and the designer's call on combinations.

October 28, 2026. The designer: *"Adding more mechanics for me to test primarily is going to save a lot."* And: *"You
can run a small balance check and make sure they work, but don't go overboard with the bots. Players are going to be
way smarter than bots."*

## The twenty

- **Statuses on you:** Exposed, Lag (gene: Latency), Leak, Sandboxed, Stunned, Junk process.
- **Virus abilities your statuses unlock:** Predator, Opportunist, Feeder, Punisher, Harvester, Volatile.
- **Buffs and support on the virus:** Amplifier, Bodyguard, Vendetta (the list's Spite: a daemon has that name),
  Thorns.
- **Timing and control:** Countdown, Backtrace, Swap, Turncoat.

**Combinations that should be hard:** the Opportunist with a Scrambler; Volatile against the Purge-reliant kits
(Bastion, Sysop); Stunned with a Scraper; the Harvester with Corrupted from seals and landed tells; Countdown with Leak
and the Mimic.

## As built: where it reads the list its own way

- **Exposed shares its name** with the Exposed you put on a part (+25% critical strike chance). The two read alike,
  but the designer may want another word.
- **Lag runs only in a solo fight.** A Lagged cycle plays the virus's half first, then your command.
- **Leak never takes your last point**, and Junk process holds one key at a time, never key 1 or SIGINT.
- **Harvester's stacks** are the cycles your Corrupted has left. **Swap** moves Throttled, Exposed, and Corrupted as a
  burn (never a Volatile one).
- **The Opportunist stays awake** once woken. **The Amplifier** gives each part one boost at most. **The Bodyguard's**
  shield is the Buffer's: it takes your commands only.

## To do when one rolls

- **Weights.** Once the designer keeps a part, give it a weight in `PARTS.weight` and run the full suite.
  `developer parts mech 0.5` rolls them all for a session. At half weight they came in about 40% of wild fights from
  level 10, and four full-suite balance tests moved (the Overclocker's Sudo, crew-leaning kits, the Operator's solo
  pace, two sets); don't bend the planner to them.
- **The roll bug.** An elite or ★ rare spawn holding two levers can swap away the floor native it must bring, when a
  non-lever third is open to take the lever's place (parts.mjs). With the list rolling, the natives test fails. Fix:
  keep the forced native, and swap the other lever.

**The bots' check** (genesim, level 18, one seed, every subclass): Signal lost a fight against the body alone. All
under the 25-point bound and the planner still wins. Not tuning targets.

| Part | Points | Part | Points | Part | Points | Part | Points |
|---|---|---|---|---|---|---|---|
| Exposed | +10.3 | Predator | +22.4 | Amplifier | +12.5 | Countdown | +6.5 |
| Lag | +6.0 | Opportunist | +18.1 | Bodyguard | +20.0 | Backtrace | +6.4 |
| Leak | +21.5 | Feeder | +2.4 | Vendetta | +5.8 | Swap | −2.0 |
| Sandboxed | +9.0 | Punisher | −1.4 | Thorns | +18.5 | Turncoat | +3.1 |
| Stunned | +8.4 | Harvester | +9.5 | | | | |
| Junk process | +19.9 | Volatile | +14.8 | | | | |

## Open: do combinations need to spawn together?

The abilities (Predator to Volatile) and the two that read your statuses (Backtrace, Swap) depend on something
feeding them:

| Kind | Parts | How they're fed today |
|---|---|---|
| Self-fed | Volatile, Thorns, Swap, Turncoat, Countdown, and the ten statuses and buffs | Their own attack or your own play. They work in any fight. |
| Fed by the body | Predator (Encrypted), Opportunist (Scrambled), Feeder, Backtrace (any debuff) | `sig: true`: they roll only when the signature does. |
| Fed by your mistakes | Punisher (Hung, Stunned), Harvester (Corrupted) | Landed tells, seals and the Mimic; the playtest page brings a feeder part. |

- **Option A: spawn rules.** A dependent part rolls only beside a part that feeds it. Each part stays one clean idea,
  but pairs eat slots, get rarer and look alike, and the Codex has to explain parts in pairs.
- **Option B: self-sufficient.** Every dependent part carries a small trigger of its own. It works anywhere, but each
  part becomes two rules and busier tooltips, which the designer has rejected before.
- **Option C, recommended: feed by the board, pair by hand.** Keep the body-fed four on `sig`. Widen the Punisher to
  any command you lose (Hung, Stunned, refused by Sandboxed) and the Harvester to any damage over time on you
  (Corrupted, or Encrypted stacks consumed). Keep true pairs for authored fights: elites, ★ rare spawns and floor
  natives.

This needs the designer's call before the trigger change: it reshapes what the Punisher and the Harvester ask of you.
