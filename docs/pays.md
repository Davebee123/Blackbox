# What pays what

**Status.** P1–P3 built (November 2026; `dist/pays.mjs`, GAME_RULES.md *Events*, *Reacting*). P4 not built. Replaces
market.md's section of the same name; quest sites (docs/sites.md) follow it.

## The rules

- **Gear is general.** Every fight, vault and goal drops gear at the usual odds: it's the main reward everywhere. Some
  activities pay better gear (a rarity up); none is the only place for it.
- **Each activity pays its own thing** on top: one currency, a lot of it and hardly anything else. You pick an activity
  by what you need.
- **The value stays.** What an activity pays today, at usual prices, goes into its one thing, so nothing pays more on an
  ordinary day. The value is fixed; which thing it pays is the knob.
- **Standing follows the owner.** An activity a faction owns (its event, its institution, its contract) always pays that
  faction's standing.
- **XP comes from fights, contracts and deeds** (Mapped, a takeover, Root, a thread's steps, a board's kill). No activity
  adds XP as a bonus.
- **Every currency is spent somewhere.** A thing nobody spends is no reason to go anywhere (*Sinks*).

## Gear everywhere: an example

One visit each on floor 2. Every fight, vault and goal rolls the same drop table (GAME_RULES *Drops*) at its source's
odds; the activity only changes what it pays on top.

| Visit | What rolls for gear | An item | A blue or better | Its own thing |
|---|---|---:|---:|---|
| A Settlement run | 4 processes, the lock (an elite) | 29% | 1.3% | 3 Exploits, LANTERN +12 |
| A Rack pull | 5 processes, a guard, the cage (a vault) | 66% | 5.4% | 15 + level/2 components, 3 receipts, Kestrel +6 |
| A server, cleared | 10 processes, 2 elites, the vault | 77% | 6.9% | Mapped's item, its takeover |
| A Courier | Its fight, and its sure protocol | 100% | 100% (a yellow 15%) | Better gear is its thing |

## The map

| You need | It buys | Go | Changes from today |
|---|---|---|---|
| **Better gear** | Your slots | Courier, Escort, LANTERN's offer, Hollow Choir, a Pit, a Sighting, a Hunter pack, a rival's lineup, a dead runner's stash, a thread's pick of three, a Mapped server's item | The courier's, the escort's and the rival's credits go into the item's rarity |
| **Credits** | Top-ups, programs, codebases, the Shops, tools | Contracts, the retainer, Bounty, Bounty hunt, Counter-raid, the Gauntlet, Ping sweep, Terminal, caches, a Stray cache | The code in their caches comes as credits |
| **One family's code** | Programs, supply orders | Invasions (the bounty), Outbreak, Patient zero, Quarantine, Packet routing, vault payloads, Root's stash room, a Code Siphon | Patient zero pays a second code cache in place of an elite's loot |
| **Exploits** | Medium programs, darknet listings | Settlement runs, the Exfil, elites, guard posts | The Exfil's credits come as Exploits (its item and 5% unique stay); elites and guards drop them more often |
| **Components** | NULL CHOIR's supply order; hubs buy them | Rack pulls, Surge room, Cascade, Deadlock, a Nest, scrapping, a Harvester | A surge's waves pay components in place of credits; Deadlock pays as Cascade does |
| **Daemons** | Your party | Invasions only | — |
| **One faction's standing** | Shop tiers, codebases, chase lines, your commission | Defence calls, Feuds, Settlement runs, the faction's contracts and supply order | A feud's wins pay standing in place of credits and protocols; its faction piece stays |
| **Receipts** | Faction pieces, standing where you stamp them | Takeovers, Rack pulls | New with quest sites |
| **A crewmate** | Hires, leads, a codebase without the rep | Helping a runner in a room, a runner's trade, beating a rival | New with quest sites |
| **New servers** | The climb | Kills and first clears, vault trace records, relays, invaders from a **?** | — |
| **Uniques** | The chase | Bosses, lairs, natives (a Listening Post, a darknet listing), captures | — |
| **Lore** | The Ledger | Vault journals, Cryptograms, the scanner, threads' endings | — |

**The lore.** An Exploit is a flaw somebody guards, and a crew's lock is built from them. An Exfil's archive is
someone's findings on the way to a buyer. A surge breaks the same virus over and over, and the room fills with parts. A
rack is Kessler's hardware, and its trades are older than the floor.

## Sinks

**Supply orders are the main sink** (economy.md 3). Each faction keeps one standing order, never on a clock, and the
next arrives an hour after you deliver, so every ware is always wanted somewhere. An order pays its market value ×1.5
in credits and +4 standing. Patches (economy.md 2) are the long goal on top, spent once.

| Currency | Spent on | Its supply order |
|---|---|---|
| Credits | Top-ups, programs, codebases, the Shops, tools | — (orders pay it) |
| Code | Programs; patches | Halcyon (Cipher), Kestrel (Kernel), LANTERN (Worm) |
| Exploits | Medium programs, darknet listings; patches | GLASSJAW |
| Components | Patches; hubs buy them | NULL CHOIR |
| Standing, receipts | Shop tiers, codebases, chase lines; faction pieces | — (orders pay +4) |
| Gear, daemons | Slots | — |

## Reacting

Needs the ticker (docs/ticker.md). While a card wants a ware, the director deals what pays it twice as often: its
events, the surge among run cards, the Exfil's roll, quest sites. Puzzle rooms stay where they are. A price's tooltip
lists what pays that ware.

## On the screen

An activity's card leads with its own thing, as its icon and number; standing and gear follow, smaller. Nothing else
changes.

## Build order

1. **P1: supply orders** (economy.md 3), so code, components and Exploits always have a buyer. Built (GAME_RULES.md
   *Supply orders*).
2. **P2: the pay changes** (the map's last column) and each card leading with its own thing. Built: a courier's, an
   escort's and a rival's item is a Custom; a feud's win +10 standing; the Exfil's credits as Exploits (one at level
   20); elites drop Exploits 8%, guard posts 12%.
3. **P3: reacting**, now that the ticker is built (docs/ticker.md). Built (GAME_RULES.md *Reacting*): weights only, the
   director's dice unchanged; a wanted site comes next, out of turn; Patient zero in half the kills.
4. **P4: patches** (economy.md 2), the long goal.

Quest sites are built (docs/sites.md). Supply orders and the pay changes are economy work: one session after the other.
