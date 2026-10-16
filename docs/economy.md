# The economy

A design sheet, agreed in conversation with the designer; nothing here is built yet. It replaces the scattered
currencies with four, each with one job. Code becomes the thing you build the world with: programs on the servers you
hold, patches that improve a program everywhere, the factions' supply orders and your consortium's projects. Nothing
in it puts a button on the ability bar, and nothing in it is random. Access to content (a floor, a vault, a lair) is
earned by playing, never bought.

## What's wrong today

Measured with the pacing bot (`node econ.mjs`, topping up its Signal with credits, seed 7):

| Run | Time | Code held | Exploits | Components | Credits earned |
|---|---|---|---|---|---|
| Breaker to 5 | 35 min | 13 Cipher, 5 Worm | 0 | 30 | 371 |
| Breaker to 15 | 3 h | 55 Cipher, 52 Worm, 10 Kernel | 5 | 112 | 1,629 |
| Bastion to 15 | 5.1 h | 176 Cipher, 134 Worm, 28 Kernel | 9 | 130 | 2,644 |
| Infiltrator to 15 | 3.1 h | 59 Cipher, 49 Worm, 19 Kernel | 14 | 95 | 1,472 |
| Breaker to 25 | 8.7 h | 139 Cipher, 422 Worm, 10 Kernel | 27 | 264 | 4,435 |

- **Everything piles up.** About 40–65 code, 25–50 components and 500 credits an hour come in; topping up Signal is
  the only steady sink (40% of credits for this bot), and a bot that never pays banks all of it.
- **Too many currencies with overlapping jobs**: credits, three codes, Exploits, dozens of named components, Indemnity,
  standing, five reps, research, daemons, blueprints, codebases.
- **Nothing to trade.** The markets are with factions only and no round trip profits (right for solo). In multiplayer
  nobody needs anybody's goods.
- **A network already specialises**: the Breaker to 25 held 42 Worm code for every Kernel. That's the seed of trade.

The bot doesn't hold servers or build programs, so these are what a player *could* spend, not what they do. The first
build step re-measures with programs in.

## Four currencies, one job each

| Currency | Its job | Tradeable between players |
|---|---|---|
| **Credits** | Topping up Signal and repairs, codebases, the stores, the market's fees, the consortium bank | Yes |
| **Code** (Cipher, Worm, Kernel) **and Exploits** | Programs, patches, the firewall, supply orders, consortium projects | Yes |
| **Components** | Programs, Zero-days | Yes |
| **Progress**: standing, research, levels | What you've earned; never spent | No |

Gear comes from drops, the stores and (later) other players. Ordinary drops trade until you equip them; boss uniques and
the collection log's chase items never trade.

### What goes

- **Indemnity.** Halcyon's store prices in credits, its tiers still gated by standing as now. A contract that paid
  Indemnity pays its value in credits instead (a starting rate of 50 credits an Indemnity, to tune). An old save's
  unspent Indemnity becomes credits at the same rate.
- **Scripts.** Off the ability bar and out of the drops. What dropped them pays code. An old save's scripts become code.
- **Random-stat crafting.** Compiling a protocol around a stat goes. Gear is found, not rolled at a bench. What stays on
  the Craft page is one item per recipe: a Zero-day from its source, the Relay from its plan.
- **The stash room** (Root 2's free code every two hours). Root becomes four ranks (below).
- **Gear rerolls and upgrades.** Never: better gear drops, as daemons do.

## Code's four uses

### 1. Programs: installed per server

A program goes in a socket room on a server you hold, as today. Each family's code builds the programs that family
would write. Installing costs that code and components every time (the running cost); a program's **version** is
network-wide (next section).

**Worm code: what spreads and repeats**

| Program | Weight | v1 | v2 | v3 |
|---|---|---|---|---|
| Cron Spawner *(today)* | light | fight rooms respawn ×1.5 as fast | ×2 | ×2.5 |
| Seeder | light | market transfers from your network 10% faster (with other Seeders, up to 40%) | 20% | 30% |
| Botnet | medium | a fight here starts with 1 helper on the weakest part | 2 | 3 |
| Crawler *(with floors)* | light | walking into a room reveals 1 neighbour's kind | 2 | all |

**Cipher code: locks, vaults and value**

| Program | Weight | v1 | v2 | v3 |
|---|---|---|---|---|
| Cache Mill *(today)* | light | caches refill twice as fast and pay +25% | +50% | +75% |
| Escrow | light | contracts on this server pay +15% | +30% | +45% |
| Lockdown | medium | invasions this server sends lose a process | and arrive a level lower | lose two |

**Kernel code: control and stealth**

| Program | Weight | v1 | v2 | v3 |
|---|---|---|---|---|
| Rootkit | light | moves here cost 25% less Signal | 50% | 75% |
| Tunnel *(today)* | medium | a free link to the entry the hunter can't use | a second link | the links hide you: the hunter never steps into a tunneled room |
| Snare *(today)* | medium | holds the hunter 4 of your moves, once a visit | 6 | 8 |
| Listening Post *(today, changed)* | medium | the unique you name drops twice as often here | no versions | |

The Listening Post is the one exception: **one on your whole network**, and it **goes quiet once its unique drops**.
Retuning it to a new unique costs its install again. That makes it a step in a chase, not a program every server runs.

**The server's own code** (whatever its family): Harvester (+1 component a kill), Code Siphon (+3 code a room, v2 +5,
v3 +8), Defrag Bay (a rest room for 25% Signal, v2 35%, v3 50%). Their patches take any code.

**Install cost.** Today's numbers stand: a light program 15 code and 20 components, a medium one 30 code, 40 components
(10 the server's own) and an Exploit, ×1.25 a layer deeper. Deeper servers cost more to fill, so installing never stops
being a sink while you climb.

### 2. Patches: network-wide, bought once

Patching a program to v2 or v3 upgrades **every copy of it on every server you hold**, and every copy you install later.
It's a one-off goal, priced to take a long time:

| Patch | Code (its family) | Components | Exploits | Needs |
|---|---|---|---|---|
| v2 light | 100 | 30 | 0 | level 10 |
| v2 medium | 150 | 40 | 1 | level 10 |
| v3 light | 400 | 60 | 1 | level 20 |
| v3 medium | 600 | 80 | 2 | level 20 |

At the measured rate a network makes 20–40 of its main code an hour and 5–10 of the others. A v2 is a few hours of its
family's code, a v3 about a day's, and patching all twelve-odd programs is over a hundred hours of code: unless you
trade for the families your network doesn't make. Maxing out is fine: installs, supply orders and consortium projects
keep taking code after the last patch. New programs come as you level (codebases at hubs and drops), and v4 can come
with a higher level cap.

### 3. Supply orders: the factions

Each faction keeps a **standing order** for what its market condition wants, one at a time, never on a clock:

| Faction | Wants |
|---|---|
| Halcyon | Cipher code |
| Kestrel | Kernel code |
| LANTERN | Worm code |
| NULL CHOIR | Components |
| GLASSJAW | Exploits |

An order asks for 10 + level/2 (an Exploit order 1 + level/15) and pays its market value ×1.25 in credits and +4
standing. The next order arrives an hour after you deliver. Standing still unlocks each faction's store, so supply
orders are how you climb a faction you don't do contracts for. The storyline's "hand over two Worm code" is the first.

### 4. Consortium projects: everyone's

Today's size tiers become projects the consortium **funds together**. Each needs the consortium at a size first, then
its price, paid by anyone in any share (the consortium page shows who gave what). Every project works for **every
member, on every network**.

| Project | Needs | Price (each code, credits) | Effect for every member |
|---|---|---|---|
| Trunk Relay | 2 servers | 100 each, 1,000 | Sending code, components or gear to a member is instant and free of the market's fee |
| Linked | 3 | 150 each, 1,500 | +10% components on members' servers *(today's tier)* |
| Mesh | 5 | 300 each, 3,000 | Invasion rewards doubled *(today's tier)* |
| Backbone | 8 | 600 each, 6,000 | A shared rogue server opens *(today's tier)* |
| Consortium Firewall | 8 | 800 each, 8,000 | Every member's wall counts the members' firewall levels together |
| Grid | 12 | 1,200 each, 12,000 | +1 socket room on every member's server, firewall +2 *(today's tier)* |

Every project takes all three codes, so a consortium of mixed networks funds them far faster than one of a single
family. Simulated members contribute at a steady rate until real players do.

## Root: four ranks

Root still rewards coming back to a server you hold (cleared respawns), but no longer opens a stash room:

| Root | After | Perk |
|---|---|---|
| 1 | the takeover | taken over |
| 2 | 5 cleared respawns | stops costing memory and sends no invasions *(today's Root 3)* |
| 3 | 15 | +1 socket room beside the Core *(today's Root 4)* |
| 4 | 30 | rare spawns twice as often *(today's Root 5)* |

An old save keeps its count; its rank follows the new table, and a stash room it had goes.

## Access is earned, never bought

Opening content is a progression system, not a price: anything everyone would buy is a tax.
- **Floors** (R3): reach a floor once and a visit can start there (a waypoint).
- **The vault**: unchanged. The key hunt each visit is the loop.

## Trading between players (needs a server)

Real trade waits for a backend; until then it's built and tested against simulated players.
- **Order books at the hubs**: players post buy and sell orders; a 2% fee to list and an 8% cut of each sale (the
  credit sink that grows with the economy). The factions' own prices stay as a floor and a ceiling, so a thin market
  never crashes. Each hub's transfer times and conditions make buying at one and selling at another a small game.
- **Consortium trades** go through the Trunk Relay: instant, no fee.
- **Bound**: standing, research, levels, boss uniques and the collection log's chase items.

## Build order

1. **The cuts and their refunds**: Indemnity, scripts, random-stat crafting, the stash room, Root's ranks. Old saves get
   what they had back as credits and code.
2. **Programs and patches**: the new programs, versions, the Listening Post's rule, the patch page. Re-measure code
   income and spending with the bot holding servers, and tune the prices above.
3. **Supply orders.**
4. **Consortium projects**, funded by you and simulated members.
5. **Floors' waypoints**, with the R3 work.
6. **The player market and trade rules**, once there's a backend.

## Open questions

- Indemnity's rate (50 credits) and the patch prices need the re-measure in step 2.
- Rootkit at 75% may make Signal on a held server meaningless; the cap may be 50%.
- Botnet's helper damage needs a number against the room fights' budget.
