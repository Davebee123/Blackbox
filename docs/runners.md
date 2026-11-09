# Runners: the people on the net

**Status.** Decided direction, not built. The looks are picked: the map (the *Rail*), and meeting and hiring (below).
Talked through with the designer, November 2026.

## Why

BLACKBOX is played solo, with friends as an option. A hosted world (an MMO's server that never stops) costs more to
run and watch than the game needs, so multiplayer stays peer to peer (docs/coop.md) plus records friends post for each
other. Everything social today is simulated (presence.mjs, channel.mjs, consortium members, `crew sim`), and the
simulated people read as stand-ins for players nobody can see. Runners turn them into characters with names and a reason to
be on the net, like Guild Wars 1's heroes and Starsector's officers and fleets.

## Rules

- **Logged-on time only.** Runners move while you play, like the director. Nothing runs while you're away; rested XP
  stays the only reward for time off.
- **Every social slot has a runner by default; a friend can take it.** A crewmate, a consortium member, a drop-in, a
  rival. Nothing is locked behind friends.
- **Runners only add.** Leads (a server one traced shows on your map), tips, help in a room you share, an offer to
  crew, a dead runner room when one crashes. They never clear your rooms, take your vaults or lock anything. Their
  work is kept on the runner; a server's state stays yours. Rivals racing you to a vault stay as built.
- **No entropy.** Factions are fixed backdrops. A runner works for one, and nothing a runner does moves a faction's
  power, territory or prices. Feuds stay director cards; runners appear in them by name.
- **A stable cast.** A few dozen per network, from its seed. Their levels keep to a band around yours. A crashed
  runner is pulled out and comes back. No permanent death; none quits on you.
- **Cheap to run.** Each runner is a loop (hub, job, travel, work), worked out from the seed and logged-on time the
  way presence.mjs places people today. Off-screen outcomes are rolled from a runner's level against the server's,
  never fought. Saved: standing with you, goal progress.

## Why they're on the net

| Layer | What it is | What you see |
|---|---|---|
| **Work** | The table is filling again. Paymasters pay per process ended: Halcyon pays crews like LOWLIGHT; the factions run contracts. A runner does your job for their own paymaster | Hub → a server near their level → work it → back to the hub to be paid |
| **Someone's money** | In 2091 nearly everyone has a payment frozen in the table: a pension, a shop that died mid-trade. Each runner is after one trade, on a fixed floor | Over weeks they climb toward it (#net shows it). Arriving is a story beat: a letter, or a request to help with the last server |

## On the map: the *Rail* (picked)

- **The rail:** a Runners list under Contracts, the runners you know: handle, class and level, and where they are
  (`→` a server for one travelling).
- **The map** draws only the runner you pick: a paper-white diamond with their handle, a dotted route through the
  servers they've passed, a dashed ring on where they're heading.
- **Tooltip:** the handle; *Runner · <faction>*; class, level and what they're doing; then, muted, how you know them
  and what they're after.
- **Colour:** paper white (`--bright`). Teal, red, amber, violet and steel keep their meanings; a runner hunting you is
  the one red.

Rejected: a pip under each server per runner (*Pips*), and a count tag per server with travelling dashes (*Counts*).

## Meeting and hiring (picked)

- **Meeting:** in the world. A runner fighting in a room you walk into (help them, standing rises); a rival you beat; a
  crashed runner you pull out. No invite menu.
- **In the room:** a paper-white tab with the handle on the room's chip (beside YOU once you're in, where a rival's tab
  goes), a thin bar of their Signal under it. The room's tooltip adds *The runner marrow is fighting it, at 46%
  Signal.* and ▸ *Walk in to help.*
- **The room's card:** the virus, then the runner's row (handle, faction mark, class and level, their Signal), their
  line, the standing it pays as an icon, and **Help** / **Step back**. Win, and it shows the room cleared and their
  standing up a tier.
- **Standing:** 0–100 in four tiers: Stranger, Known (leads), Friend (hire), Close (consortium). Drawn as the tier's
  name, a bar to the next and the next one's name (the *Tier bar*); the number and how you met are its tooltip.
- **The runner card** (a Rail row opens it beside their diamond): *Runner · faction*, the handle, class glyph, class,
  level and a temperament tag; rows for Standing, Now (→ a server and its time) and After (the trade in words over a
  floor strip, lit up to their nerve, the trade's floor marked); their latest line; **Hire**.
- **The crew card** (Hire turns the runner card into it): For (the server, its floor marked on the strip); Pay as
  two icons, both owed (MOO2's leaders): a credits fee when you connect, and a cut of the credits the run pays (items
  and code stay yours); the bar, picked from their presets as chips over the eight named keys each one makes (the *Presets*).
  Temperament (Careful, Steady, Bold) steers the planner (Starsector's officers); its tooltip says how. They level
  with you. Hired, a runner is crew: violet, like every crewmate.
- **Busy:** Now reads Busy with the time they're free; Hire is off, the clock on it.
- **Turned down:** a server above their nerve hatches its floor on the strip, their line takes the place of Pay and Bar
  (*Coldline is past me. Anything on the Stacks and I'll come.*), and Hire is off, marked with the floor.
- **Consortium:** runners you're close to, merging with you. A friend joins it as one more member.

Rejected: standing as pips like a faction's rep, or as the steps each tier opens; setting a runner's bar in their own
Toolkit, or key by key from what they know; paying a fee or a cut as a choice.

## Friends

A friend is a runner in your world, from their **record**: handle, level, character (`coop-char.mjs characterOf`),
network seed, servers traced and held, project contributions, when it was posted. A few KB. Each player writes only
their own record, and shared things are read from everyone's: a consortium's tier counts records, a project sums
contributions, a member's network is drawn from their seed. Records travel peer to peer when friends connect, or
through a small mailbox (a file store, no game logic). Live co-op puts the person in their ghost's place.

Rewards between friends are trusted. Trading with strangers stays out.

## Invasions (direction)

With nothing running while you're away, the logged-off replay goes: no invasions every 2–4 hours away, no occupation
while away, no "how your wall fares while you're away". An invasion happens while you play, and the wall is retuned
around that. A separate session; it changes the save.

## Slices

| | Slice | Replaces |
|---|---|---|
| R1 | The population and its loop; the Rail; #net lines from runners' real events | presence.mjs's simulated people |
| R2 | Meeting, standing and hiring | `crew sim`, `crew invite` |
| R3 | Rivals, feuds and dead runner rooms drawn from the population | — |
| R4 | Friends as runners, from records | consortium's simulated members |
