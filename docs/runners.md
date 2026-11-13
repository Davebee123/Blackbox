# Runners: the people on the net

**Status.** R1 and R2 built (the cast, the loop, the Rail, #net lines; meeting, standing and hiring). R3 in part:
rivals are runners (the *red diamond*, picked; beating one raises their standing), and feuds name runners; dead runner
rooms wait on their look (a crash marks an existing room; you pull them out). R4 to come. R2's follow-ups: trait
effects in fights (only Known face and Haggler are in play), temperament steering the planner, Known's leads and
Close's consortium. The looks are picked: the map (the *Rail*), and meeting and hiring (below).
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
- **A rotating cast.** Eight on a network at once, from its seed and a pool of 60 handles, so each new game has its
  own. Each stays 2–4 hours of logged-on time, then moves on and the next takes their place; they come back later in
  the playthrough as the same person, standing kept. A hire stays while they're with you. Their levels keep to a band
  around yours. A crashed runner is pulled out and comes back. No permanent death.
- **Cheap to run.** Each runner is a loop (hub, job, travel, work), worked out from the seed and logged-on time the
  way presence.mjs places people today. Off-screen outcomes are rolled from a runner's level against the server's,
  never fought. Saved: standing with you, goal progress.

## Why they're on the net

| Layer | What it is | What you see |
|---|---|---|
| **Work** | The table is filling again. Paymasters pay per process ended: Halcyon pays crews like LOWLIGHT; the factions run contracts. A runner does your job for their own paymaster | Hub → a server near their level → work it → back to the hub to be paid |
| **Someone's money** | In 2091 nearly everyone has a payment frozen in the table: a pension, a shop that died mid-trade. Each runner is after one trade, on a fixed floor | Over weeks they climb toward it (#net shows it). Arriving is a story beat: a letter, or a request to help with the last server |

## On the map: the *Diamonds* and the *Rail* (picked)

- **The rail:** a Runners list under Contracts, the runners you know: handle, class and level, and where they are
  (`→` a server for one travelling). A server you haven't located is only its floor (*F1*, *→ F1*).
- **The map** draws the runners in places you've revealed (the *Diamonds*, picked November 2026 over a list in the
  server card and named diamonds behind a toggle): one small paper-white diamond under a place with runners, how many
  beside it from two up (*◆ 6*), and a hollow diamond each on the road. A lone diamond opens their card, where you
  hire them. A counted one opens the list of who's there beside it (rows like the Rail's: handle, class and level); a
  row opens that runner's card. The one you pick also gets their handle, a dotted route through the servers they've
  passed, a dashed ring on where they're heading, and leaves the count.
- **Only where you've revealed** (the designer's rule, November 2026): located servers, SPRAWL-00 and the up-links,
  hubs you've found and exits on your map. A `?` doesn't count. No diamond under a `?`, at a server or hub off your
  map, or on a road with an unrevealed end. The picked runner's route stops at the first unrevealed place, their ring
  is drawn only on a revealed one, and out of sight they have no mark: their card opens beside their Rail row.
- **The Rail folds** to its head; runners stay off the Online list (it keeps friends, members and crew).
- **Tooltip:** the handle; *Runner · <faction>*; class, level and what they're doing (*working a server on floor 1*
  where you haven't located it); then, muted, how you know them and what they're after. Their own #net lines keep the
  server's kind (*on a Lab on floor 1 now*).
- **Colour:** paper white (`--bright`). Teal, red, amber, violet and steel keep their meanings; a runner hunting you is
  the one red.

Rejected: a count tag per server with travelling dashes (*Counts*); a diamond for every runner, side by side under a
server; runners in the Online list.

## Meeting and hiring (picked)

- **Meeting:** in the world. A runner fighting in a room you walk into (help them, standing rises); a rival you beat; a
  crashed runner you pull out. No invite menu.
- **In the room:** a paper-white tab with the handle on the room's chip (beside YOU once you're in, where a rival's tab
  goes), a thin bar of their Signal under it. The room's tooltip adds *The runner marrow is fighting it, at 46%
  Signal.* and ▸ *Walk in to help.*
- **The room's card:** the virus, then the runner's row (handle, faction mark, class and level, their Signal), their
  line, the standing it pays as an icon, and **Help** / **Step back**. Win, and it shows the room cleared and their
  standing up a tier.
- **Standing:** 0–100 in four tiers: Stranger, Known (leads), Friend, Close (consortium); anyone can be hired, and each
  tier makes the fee smaller (a stranger's is double). Drawn as the tier's
  name, a bar to the next and the next one's name (the *Tier bar*); the number and how you met are its tooltip.
- **The runner card** (a Rail row opens it beside their diamond): the head is the *Badge* (picked November 2026 over
  the bust on top or in a sidebar): a small backlit ASCII bust from their handle (portraits.mjs), then *Runner ·
  faction*, the handle, class glyph, class and level, and the Tier bar; rows, split by hairlines and each label level with its row's first line, for Traits (temperament first, dashed, then the traits as named chips, ★ on a
  starred one), Now (→ a server and its time) and After (the trade in words and the
  floor it's frozen on); their latest line; **Hire**.
- **The crew card** (Hire turns the runner card into it): Pay as two icons, both owed (MOO2's leaders): a credits fee
  once, the first time you hire that runner, and a cut of the credits each run pays while they're with you (items and
  code stay yours); the bar, picked from their presets: a tile each, a lamp, its name and how it plays in two words
  (*One target*, *Many parts*), its eight keys in the tooltip (the *Presets*). Traits sit above Pay, as on the runner
  card. No floor limit: a hire goes wherever you go.
  Temperament (Careful, Steady, Bold) steers the planner (Starsector's officers); its tooltip says how. They level
  with you. Hired, a runner is crew: violet, like every crewmate.
- **Busy:** Now reads Busy with the time they're free; Hire is off, the clock on it.
- **On a run:** the hire's Signal carries from fight to fight, like yours. At 0 they disconnect with a line (*Signal's
  going. I'm out.*) and go back to their server to recover; they're hireable again once they're full. If you drop to
  0, you both jack out, the hire at whatever Signal they had.
- **Traits** (MOO2's leaders): each runner carries one to four; see *Traits* below.
- **Consortium:** runners you're close to, merging with you. A friend joins it as one more member.

Rejected: standing as pips like a faction's rep, or as the steps each tier opens; setting a runner's bar in their own
Toolkit, key by key from what they know, or as tiles showing their keys or their mix of skills; traits as bare
icons; paying a fee or a cut as a choice; a nerve that turns down floors above it.

## Traits

From MOO2's leaders. A runner carries one to four traits, each an icon on the runner and crew cards with its rule in
the tooltip. A trait grows as the runner levels; a starred one (★) is half again as strong. More traits and more stars
make a dearer fee. No drawbacks for now.

- **Party, never self.** Every trait helps the crew (you included) or the run. A runner's own power is their level and
  gear.
- **Once per crew.** Two runners with the same trait don't stack; the crew gets its best version.
- **The pool:** eight runners on a network at once, rotating (*A rotating cast*, above). Runners with several starred
  traits are rare.

| Trait | Does (MOO2) |
|---|---|
| **Spotter** | Every few cycles, the part they hit takes more damage from everyone for a cycle. ★: two parts (Weaponry) |
| **Swarm** | Everyone's helpers hit harder (Fighter Pilot) |
| **Bulwark** | The crew starts each fight shielded (Security, Commando) |
| **Decoy** | The first attack each fight goes at them (Helmsman) |
| **Patch** | The crew recovers Signal between fights (Medicine) |
| **Repair** | Restores your server's Integrity after a run (Engineer) |
| **Routefinder** | Your steps cost less Signal (Navigator) |
| **Mapper** | Rooms a step further out show their kind (Galactic Lore) |
| **Reader** | One tell a fight shows a cycle early (Telepath) |
| **Archivist** | More research on the parts you fight together (Researcher) |
| **Mentor** | More XP on runs together (Instructor) |
| **Coordinator** | The crew's Sync windows last longer (Tactics, Operations) |
| **Counter-intel** | Rivals' counter-picks read you less often (Assassin, Spy Master) |
| **Fixer** | Contracts done together pay more faction rep (Diplomat) |
| **Haggler** | A smaller cut (Trader, Financial Leader) |
| **Known face** | A smaller fee, and standing rises faster (Famous) |
| **Moonlighter** | Brings credits to each run in place of a cut (Megawealth) |
| **Gift** | Brings a codebase, script or blueprint the first time you hire them (a leader's tech) |
| **Wildcard** | Traits rolled from the seed (Brainiac, Mystic X) |

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
