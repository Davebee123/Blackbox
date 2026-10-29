# The economy

**Status.** The plan for what code, credits and components are for. Built: the currencies, programs, codebases and
the stores as they stand (GAME_RULES.md *The economy*, *Components*, *Code*, *Sockets and programs*, *The Halcyon
store*); Indemnity is retired (v48) and crafting is gone (v49). Left: patches, supply orders, consortium projects,
the four-rank Root, the programs still to build, and player trade.

Agreed with the designer: nothing here puts a button on the ability bar, and nothing in it is random. Access to content
(a floor, a vault, a lair) is earned by playing, never bought.

## Currencies, one job each

| Currency | Its job | Tradeable between players |
|---|---|---|
| **Credits** | Topping up Signal and repairs, programs, codebases, the stores, the market's fees, the consortium bank | Yes |
| **Code** (Cipher, Worm, Kernel) **and Exploits** | Programs, patches, the firewall, supply orders, consortium projects | Yes |
| **Components** | Sold at hubs; NULL CHOIR's supply order | Yes |
| **Progress**: standing, research, levels | What you've earned; never spent | No |

Ordinary drops trade until you equip them; boss uniques and the collection log's chase items never trade.

**Still to cut.** Scripts (still dropped in rooms: caches, vaults, elites, hunters, the Resident) leave the drops,
and what dropped them pays code; an old save's scripts become code. The stash room goes with Root's fourth rank
(below). Gear is never rerolled or upgraded: better gear drops.

## 1. Programs

A program goes in a socket room and changes that server's rules (GAME_RULES *Sockets and programs*). Each
family's code builds the programs that family would write. Installing costs credits and the server's code every time
(the running cost); a program's **version** is network-wide (2, Patches).

### Programs still to build

One list: the servers design's catalogue and this sheet's. Light and medium cost what the built ones do (140 or 280
credits, 15 or 30 of the server's code, a medium an Exploit, ×1.25 a floor past the first). Core programs go only in a
held server's core socket.

| Program | Code | Weight | Codebase | v1 (v2, v3 by patch) |
|---|---|---|---|---|
| **Seeder** | Worm | light | | Market transfers from your network 10% faster, with other Seeders up to 40% (20%, 30%) |
| **Botnet** | Worm | medium | | A fight here starts with 1 helper on the weakest part (2, 3) |
| **Crawler** | Worm | light | | Walking into a room reveals 1 neighbour's kind (2, all) |
| **Escrow** | Cipher | light | | Contracts on this server pay +15% (+30%, +45%) |
| **Lockdown** | Cipher | medium | | Invasions this server sends lose a process (and arrive a level lower; lose two) |
| **Rootkit** | Kernel | light | | Moves here cost 25% less Signal (50%, 75%) |
| **Bulkhead** | any | medium | Kestrel | The hunter can't pass through this room. Fights here and next door start with a shield of 10% of your max Signal. |
| **Sentry Turret** | any | medium | Kestrel | In fights here and next door, deals 6% of a part's max Integrity to the part whose move lands soonest every 3 cycles. Its hits count toward interrupts. |
| **Patch Injector** | any | medium | GLASSJAW | Viruses on this server respawn with 1 ◆ less on every part |
| **Honeytoken** | any | medium | GLASSJAW | Viruses here respawn a grade higher, 1 in 4 as an elite. Kills pay 50% more XP and roll for loot once more. |
| **Lure** | any | medium | NULL CHOIR | Fight rooms here respawn as the family or strain you name, one you've met |
| **Relay** | any | medium | LANTERN | Pings the unknown servers linked to this one: each room you clear here traces each 15% more, and it flags the one a contract points at |
| **Range** | any | core | | Holds a solo boss you've beaten, with its own loot table and pity. Back an hour after it falls. |
| **Jump Host** | any | core | | Connecting to this server starts you in any room you've been in |

**Where they go matters.** The Turret and the Bulkhead cover their room and its neighbours. **Stacking on one server**
is the build: a Lure, a Cron Spawner and a Harvester make one server your farm for one strain; a Honeytoken, a Turret
and a Bulkhead make a hard server you can survive.

**Versions of the built ones.** Cron Spawner ×1.5, ×2, ×2.5 as fast. Cache Mill +25%, +50%, +75%. Code Siphon +3, +5,
+8 code a room. Defrag Bay 25%, 35%, 50% Signal. Tunnel: a second link at v2; at v3 the hunter never steps into a
tunneled room. Snare holds 4, 6, 8 moves. The Harvester has no versions. **The Listening Post** has none either: one on
your whole network, quiet once its unique drops, and retuning it costs its install again.

## 2. Patches: network-wide, bought once

Patching a program to v2 or v3 upgrades every copy on every server you hold, and every copy you install later. A
one-off goal, priced to take a long time:

| Patch | Code (its family) | Components | Exploits | Needs |
|---|---|---|---|---|
| v2 light | 100 | 30 | 0 | level 10 |
| v2 medium | 150 | 40 | 1 | level 10 |
| v3 light | 400 | 60 | 1 | level 20 |
| v3 medium | 600 | 80 | 2 | level 20 |

A v2 is a few hours of its family's code, a v3 about a day's, and patching every program is over a hundred hours of
code unless you trade for the families your network doesn't make. Installs, supply orders and projects keep taking
code after the last patch. The server's own programs (Harvester, Code Siphon, Defrag Bay) patch with any code.

## 3. Supply orders: the factions

Each faction keeps a **standing order**, one at a time, never on a clock:

| Faction | Wants |
|---|---|
| Halcyon | Cipher code |
| Kestrel | Kernel code |
| LANTERN | Worm code |
| NULL CHOIR | Components |
| GLASSJAW | Exploits |

An order asks for 10 + level/2 (an Exploit order 1 + level/15) and pays its market value ×1.25 in credits and +4
standing. The next arrives an hour after you deliver. Supply orders are how you climb a faction you don't do contracts
for.

## 4. Consortium projects: everyone's

Today's size tiers become projects the consortium **funds together**: the consortium at a size first, then the price,
paid by anyone in any share (the page shows who gave what). Every project works for every member, on every network.

| Project | Needs | Price (each code, credits) | Effect for every member |
|---|---|---|---|
| Trunk Relay | 2 servers | 100 each, 1,000 | Sending code, components or gear to a member is instant and free of the market's fee |
| Linked | 3 | 150 each, 1,500 | +10% components on members' servers *(today's tier)* |
| Mesh | 5 | 300 each, 3,000 | Invasion rewards doubled *(today's tier)* |
| Backbone | 8 | 600 each, 6,000 | A shared rogue server opens *(today's tier)* |
| Consortium Firewall | 8 | 800 each, 8,000 | Every member's wall counts the members' firewall levels together |
| Grid | 12 | 1,200 each, 12,000 | +1 socket room on every member's server, firewall +2 *(today's tier)* |

Every project takes all three codes, so a consortium of mixed networks funds them faster. Simulated members
contribute at a steady rate until real players do.

## Root: four ranks

Root still rewards cleared respawns on a server you hold, but no longer opens a stash room:

| Root | After | Perk |
|---|---|---|
| 1 | the takeover | taken over |
| 2 | 5 cleared respawns | stops costing memory and sends no invasions *(today's Root 3)* |
| 3 | 15 | +1 socket room beside the Core *(today's Root 4)* |
| 4 | 30 | rare spawns twice as often *(today's Root 5)* |

An old save keeps its count; its rank follows the new table, and its stash room goes.

## Trading between players (needs a server)

Built and tested against simulated players until there's a backend.
- **Order books at the hubs**: buy and sell orders; a 2% fee to list and an 8% cut of each sale. The factions' prices
  stay as a floor and a ceiling, so a thin market never crashes.
- **Consortium trades** go through the Trunk Relay: instant, no fee.
- **Bound**: standing, research, levels, boss uniques and the collection log's chase items.

## Build order

1. **Cuts**: scripts out of the drops, the stash room, Root's four ranks. Old saves get what they had as credits and code.
2. **Programs and patches**: the programs above, versions, the Listening Post's rule, the patch page. Re-measure code
   income and spending with the bot holding servers (`node econ.mjs`), and tune the prices.
3. **Supply orders.**
4. **Consortium projects**, funded by you and simulated members.
5. **The player market**, once there's a backend.

## Open questions

- Patch prices (set before v49 took components out of installs) need the re-measure in step 2.
- Rootkit at 75% may make Signal on a held server meaningless; the cap may be 50%.
- Botnet's helper damage needs a number against the room fights' budget.
- Where core codebases come from: lair bosses' first falls taught them in the design, but codebases are only bought
  since v49.
- Names: *Botnet* is also a family (docs/servers.md 4.3) and an Operator skill; *Rootkit* a family and a Zero-day.
