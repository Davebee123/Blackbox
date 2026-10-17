# Content: a sandbox to climb

A design sheet for review. Nothing here is built unless it says **Built**. It takes stock of every activity the game
has, sets out what each floor needs to carry its share of a 100-hour climb, and proposes what to build, in order. It
adds one system, cosmetics for the computer on your desk. Everything else it proposes is content: new bosses, new
families, new boards, and placement rules for things that exist.

The designer's direction:

> "There needs to be enough variety and content for someone to grind the content for a while."
> "Having a bunch of activities is what I'm going for. Games like Warframe and Starsector, even Terraria, don't have a
> super concentrated storyline. I want it to function like a sandbox."
> "Having some cosmetic rewards that you can chase for your computer screen or something like that could also be fun."

Taste this sheet holds to: show, don't tell; terse tooltip text; one job per system; ??? until found; a world you
climb; no FOMO (no timed exclusives, no dailies to miss); hard and varied; programs and viruses that make computing
sense; teal is only ever you.

**Words.** *Built*: in the game today. *Off*: built and switched off. *Planned*: agreed or designed in another sheet
(docs/economy.md, docs/servers.md, docs/genome.md), not built. *Proposed*: new in this sheet. Currencies are the four
in docs/economy.md: **credits**, **code** (Cipher, Worm, Kernel) **and Exploits**, **components**, and **progress**
(XP, standing, research; never spent). Gear comes from drops.

## 0. The short version

| Question | Answer |
|---|---|
| Is there enough to do? | Floors 1 and 2 are full. From level 20 nothing new is introduced: no family, strain, third part, mutation, guard or boss opens past the Tripwire at 20, no unique sat above level 40 until the loot plan's Batch 1 (60 for 39–50, The Sink and Bedrock), every floor's lair holds the same boss, and no hub stands below floor 3. Floors 4 to 8 are about 85 of the 100 hours. |
| What carries a floor? | A new cast, its own named bosses and lair, a faction thread, a puzzle twist, a signature server kind, and something worth coming back for. Section 3 sets one of each per floor, most of them already designed elsewhere. |
| What's the loop with no story? | A menu of about a dozen activities, each refilling on its own clock and waiting for you. You pick what's ready and what pays the currency you're short of (section 1). |
| The long chase at 50? | The collection log, Codex mastery, patches, consortium projects, faction tiers, boss uniques and sets, daemons at their best level, and Bedrock's flash ranks (section 4). |
| Cosmetics? | A **Desk**: stickers on the monitor's bezel from bosses' first falls, casing finishes from the collection, phosphor tints from the Codex, props from factions' top tiers. Earned only, never bought, never timed. About 29 to earn in the first pass (section 5). |
| What first? | Lairs by floor, floor holders, Botnet and Logic Bomb, the log sweep as a terminal room, and the floor 2–4 bosses already designed (section 6). |

## 1. The sandbox loop

### 1.1 Hours on each floor

From the pacing targets another pass is setting (about 1 hour to 5, 4 to 10, 15 to 20, 35 to 30, 65 to 40, 100 to 50),
taking each exit about a level into the floor below's band, at about 150 kills an hour:

| Floor | Name | Band | Leave at | Hours on it | Kills on it |
|---:|---|---|---:|---:|---:|
| 1 | The Sprawl | 1–8 | 8 | 3 | 400 |
| 2 | Backhaul | 7–14 | 14 | 5.5 | 850 |
| 3 | The Stacks | 13–20 | 20 | 6.5 | 1,000 |
| 4 | Coldline | 19–26 | 26 | 12 | 1,800 |
| 5 | Deep Core | 25–32 | 32 | 14 | 2,100 |
| 6 | Kernel Space | 31–38 | 38 | 18 | 2,700 |
| 7 | The Sink | 37–44 | 44 | 20 | 3,000 |
| 8 | Bedrock | 43–50 | 50 | 21 | 3,150 |

The climb is back-loaded: floors 2 and 3 together are about 12 hours, and each floor from 4 down is 12 to 21. Floors 2
to 4 are where players are now and where the next 24 hours of play sit, so they come first (section 6).

### 1.2 The activity menu

A session opens on the map. What's ready shows where it is: a lair's Core back, puzzle rooms refilled, an event's
antenna, an invasion on the threat rail, a contract ready by Mail. You pick one, then another. None of them has to be
done; each one's reward waits.

| You want | Go | A go takes | Pays most | Refills |
|---|---|---|---|---|
| To climb | Trace and map servers toward the floor's exit | 30–60 min a server | XP, gear, trace, codebases | The floor itself |
| Code or components | A held server with programs (Harvester, Code Siphon, Cron Spawner) | 15–30 min | Code of its family, components | Rooms: 15 / 45 min (twice as fast with a Cron Spawner) |
| A boss unique | The lair, RELAY-KING, an event boss, the farm | 5–20 min a boss | Uniques (with pity), a sure item | Lair 1 h, RELAY-KING 30 min, farm 6 h, events every 15–30 min |
| A fast clear | A rogue server's run, and an Exfil if it rolls | 10–20 min | XP, Stashes, the Exfil's archive | Reboot 1 min after a full clear; Exfil 45 min cooldown |
| Daemons and code | Open ports and jack in at the wall | 5 min an invasion | Lots of code, daemons (the only source) | Every 20–30 min (8–12 with ports open) |
| Credits and standing | Contracts, room contracts, supply orders *(planned)* | 10–30 min | Credits, standing, XP, protocols | Offers every 1–3 min; a room contract 8–20 min after you take one; a supply order an hour after you deliver |
| A break between fights | A puzzle room | 1–3 min | Code, components, a cache, the Tracker off your trail | 2 h |
| A story | A thread: an amber ! in a room you've found (docs/threads.md, **Built**) | 20–45 min a chain | Deed XP, pick one of three items, standing, a lore line | Found as you connect, at most one a server; never timed |
| Knowledge | Fight what you haven't mastered | as it comes | Research to 60: a part's numbers, rule, loot, +3% damage and +25% component drops | Never runs out |
| To build | Home: programs, patches *(planned)*, the wall, the market | 5 min | Your servers' rules | When you have the materials |

### 1.3 Why switching pays

Rotation, not obligation. Four things already push a player from one activity to the next, and nothing is lost by not
following them.

- **Clocks refill and wait.** Every timer above refills a reward that sits until you come for it. The only things that
  expire are events and board offers, and missing one costs nothing (*Built*).
- **Fresh XP.** The first non-fight XP of a kind you haven't earned in 20 minutes of play pays half again (*Built*).
- **The sinks want every currency.** A patch wants one family's code, a program wants components and its server's code,
  the wall's top tiers and consortium projects want all three codes, the codebases and stores want credits
  (docs/economy.md). The short one says where to go next: Worm code is a SWARMLINE server or a worm invasion; components
  are rooms or a Cascade board.
- **Hot strain.** Every four hours one strain open at your level pays +50% XP. Everyone at the level sees the same one,
  and it's a bonus, never an exclusive (*Built*).

*Proposed, S:* a **Ready** section at the top of the map's List mode: the things whose clocks have run (a lair's Core
back, puzzle rooms refilled on servers you've found, the farm's bosses, a supply order waiting), each with its locate
button. A list, never a chirp or a pager line.

## 2. Activity inventory

*Depth* is a judgement: roughly how long before the activity has shown you everything it has, played on its own.

### 2.1 What exists

| Activity | You | Pays | Floors | Depth | State |
|---|---|---|---|---|---|
| Room clearing | Walk a traced server's rooms, fight, take caches, the key walk, the vault | XP, code, components (60% a part), cache credits, gear (trash, elites, ★ rare spawns), trace | 1–8 | The loop itself; a floor's cast is learned in 3–5 h | Built |
| Mapping | Clear every room once | An item 2 levels up, 5 kills of XP, a codebase, the rest of its ?s traced | 1–8 | 118 servers, 30–60 min each | Built |
| Takeover | Open the vault, beat the Resident in the Core | The server, its core socket, a codebase from its author, the Resident's two uniques once each | 1–8 | Every server once | Built |
| Root | Clear respawned rooms on a server you hold | Root 2–5 perks (4 ranks under docs/economy.md) | 1–8 | About 50 clears a server | Built |
| Sockets and programs | Build one of 8 programs in a socket room | That server's rules: farms, rest, shortcuts | 1–8 | 8 programs, a few hours of setups | Built |
| Puzzle rooms | Quarantine, Hunter chase, Cascade, Ping sweep | Code, components, a cache, the Tracker loses you; half a kill of XP a win | 1–8 (two deeper boards from 4) | 5–10 h of boards | Built |
| SPRAWL-00 | Shared strays, the starter area | XP, a lead a kill | 1 | To level 8 | Built |
| RELAY-KING | SPRAWL-00's boss, every 30 min | Crown Packet, Hop Limit | 1 | A handful of kills | Built |
| Rogue servers | Nest, Pit, Gauntlet: runs in clears, quiet rooms | XP, Stashes, Pit's second roll and crew elites, Gauntlet's bonus cache | 1–8 (1 in 6 servers) | Tied to the floor's cast | Built |
| The Exfil | Corner and catch a runner before its upload | 10 Stashes of credits, an item, 5% a unique | 1–8 | Short, and it stays a surprise | Built |
| Lairs | The network's native boss in a lair's Core, every hour | A sure item, the network's natives (15% + 5% a miss) | 2–8 | One boss, 3–5 natives: 5–10 h | Built |
| KESSLER-FARM-00 | Three crew bosses, every 6 h, keeping up with your level | 8 uniques (30% + 10% a miss), a yellow a kill, 10% a world unique | 1 (level 7 to 50) | About 10 boss sessions | Built |
| Invasions and the wall | Jack in, intercept, open ports, the streak | Code bounties, daemons (only here), captures, 3 invasion uniques | All | 40 daemons at their best level: a long tail | Built |
| The firewall | Tiers, filters, harden.sh, defrag | Fewer invasions asking for you | All | A sink, not an activity | Built |
| Contracts | Kill, named process, takeover, recovery, materials, rooms, map; strain (Slayer streak); side; GLASSJAW's | Credits, standing, XP, protocols, a strain trophy roll | All | Endless, and they point at other activities | Built |
| Room contracts | Install, Break Encryptors, Map without resting, Catch an Exfil, Past the Tracker | Credits, standing, a codebase or a protocol | 1–8 | Five kinds | Built |
| Events | Courier, Bounty (REPO MAN from 8), HOLLOW CHOIR (from 10), Outbreak, Leak, Darknet listing | Credits, protocols, a named unique, boss uniques, double code | All | Six cards | Built |
| Markets and shops | Trade wares between hubs; buy goods and codebases; donate | Credits, codebases | 1–3 | A small game, done in a few hours solo | Built |
| Halcyon's store | Chase protocols, agency stock | Four Indemnified protocols | All | Four items | Built |
| Payloads, held hubs | Strike a hub, take it, defend it | Hub income | 1–3 | — | Off |
| Codex research | Break, cut and answer parts | A part's numbers (3), rule (15), loot and mastery (60) | All | About 55 parts, 30 fights each to master | Built |
| Collection log | Find uniques and strain trophies | The list itself | All | 158 uniques today (60 of them Batch 1, for 39–50), natives on top | Built |
| Crafting | Zero-days, relays, filters (random-stat compiling goes under docs/economy.md) | Gear for the wall, relays | Home | Short | Built |
| Consortium | Merge servers, size tiers, members' networks | Components, bounties, a trunk Pit, sockets | All | Simulated members | Built |
| Loud runs | `connect <server> loud` | +25% XP, a loot roll more | All | A knob, not an activity | Built |
| The breach campaign | A separate mode on its own save | — | — | Cut in R5 (docs/servers.md 9.1): not part of the sandbox | Built, to go |

### 2.2 What's planned elsewhere

| Activity | Source | Pays | Floors |
|---|---|---|---|
| Patches (v2, v3 for every copy of a program) | docs/economy.md 2 | A program network-wide; over 100 h of code to max | All |
| Supply orders (one standing order per faction) | docs/economy.md 3 | Credits ×1.25 market value, +4 standing | All |
| Consortium projects | docs/economy.md 4 | Trunk Relay to Grid, for every member | All |
| New programs (Seeder, Botnet, Crawler, Escrow, Lockdown, Rootkit) | docs/economy.md 1 | That server's rules | All |
| Seven more families | docs/servers.md 4.2 | Their components and code | 2–4 |
| Nest rooms, Linked tells, help requests | docs/servers.md R4 | 1.5 kills a nest | All |
| Fourteen more solo bosses, ten sets | docs/genome.md 7.4, 9 | Uniques and set pieces | 1–8 |
| ACTUARY, the adaptive author, and UNDERWRITER | docs/genome.md 4.4 | Its sector's loot, the Actuarial Tables | 5 |
| The log sweep as a terminal room | GAME_RULES.md *Log sweep* | Trace, a kill of XP | All |
| Reflash, Bedrock's last Resident | docs/servers.md 10 q9, docs/genome.md 6 | A new network | 8 |
| Trade between players | docs/economy.md | Credits | Needs a server |

## 3. Floor by floor

### 3.1 What a floor needs

To carry 10–15 hours without feeling like floor 1 again, each floor gets six things. Most are already designed; this
section only places them.

1. **A new cast**: families, strains or rules that open there, so the first fights on a floor are fights you haven't had.
2. **Its own named bosses**, including the lair's: one in the lair, one in a fixed place (a Pit's throne, a Gauntlet's
   last room, an event).
3. **A faction thread**: a hub, or a faction whose ground it is.
4. **A puzzle twist**: a new board or a deeper one.
5. **A signature**: one server kind (one rule, like the five kinds today) or event that only starts there.
6. **A reason to come back** after you've left: a farm target, a unique source, a sealed Core.

**Lairs by floor** (*Proposed*). Today every floor's lair holds the same boss, your network's native boss at the slot's
level. Instead, each floor's lair draws a boss from that floor's band, weighted by your network (docs/genome.md 7.3's
bands, one per floor). Your native boss takes the lair on the floor whose band fits it. Every lair still rolls your
network's natives (docs/genome.md 7.4: three rolls at the elite rate with the network's pity), so the lair stays the
native route. The nine bosses built today cover floors 2 to 4 (levels are docs/genome.md 7.4's floors; in the code
only HASHLORD and MIRRORSHADE have one):

| Floor | Built bosses that fit its band | Designed, not built (docs/genome.md 7.4) |
|---|---|---|
| 2 (7–14) | DEADBOLT 8, BACK ORIFICE 8, PATCH TUESDAY 9, SLEEPWALKER 10, MIRRORSHADE 12 | SHAKEDOWN 12 |
| 3 (13–20) | HASHLORD 16, FLOODWALL 16, ECHOLALIA 18 | SHOULDER SURFER 18 |
| 4 (19–26) | TRIPMINE 20 | CAMSWARM 24 |
| 5 (25–32) | — | EXIT NODE 30, PARASITE 32 |
| 6 (31–38) | — | RING ZERO 34, BRICKWALL 36 |
| 7 (37–44) | — | GOLDEN PARACHUTE 38 |
| 8 (43–50) | — | nothing designed |

**Floor holders** (*Planned*, deferred from R3: docs/servers.md 5.2, docs/genome.md 4.2). Each floor has a holder, the
author that writes most of it, rolled from your network's roster. It sets the floor's families (`AUTHOR_FAMILIES`), its
attack sets, its Nest and its guard posts. Floor 2 under TOLLGATE plays nothing like floor 2 under SWARMLINE, so two
networks' floors differ, and a consortium member's floor is worth visiting. Floor 5 is always ACTUARY's (below).

### 3.2 The floors

**Floor 1 · The Sprawl** (1–8, about 3 hours). Fine as it is.
- *Today:* SPRAWL-00 and RELAY-KING; Ransomware, Worm and Ghostroot at v1; the Trojan (4) and the Cryptominer (6); the
  Lockbox and Mirror (3), the Decoy (4), the Mutex, C2 Node and Mimic (8); the Watchdog, Sentinel, Crawler and
  Shredder; KESSLER-FARM-00 from 7; Halcyon's and Kestrel's hubs; LOWLIGHT's storyline; all four puzzle rooms; the first
  rogue server is a Nest.
- *Add:* PATIENT ZERO (5, SWARMLINE) in the last room of floor 1's Gauntlets, the boss that teaches fragments, and
  LOVELETTER (6, PALEMASK) as a Chain Letter event on a traced Mailhub (both docs/genome.md 7.4).

**Floor 2 · Backhaul** (7–14, about 5.5 hours). The carrier's trunk lines: traffic, relays, botnets.
- *Today:* all 11 strains open (levels 3–11) and v2; Tracer and Bouncer ICE on half the servers; the Wiper (10); the
  hunter on medium and large servers; LANTERN's and GLASSJAW's hubs; REPO MAN's bounty (8), the HOLLOW CHOIR (10), the
  darknet (8); layer 2 vault uniques; natives from 5.
- *Cast:* **Botnet** (8) and **Logic Bomb** (12), docs/servers.md 4.3. Botnet's *farm it or end it* (1.5 kills and
  Zombie Nodes for clearing the Zombies first) is the floor's area-build farm.
- *Bosses:* the lair from the band A pool above; **CENTRIFUGE** (14, GLASSJAW) on the throne of floor 2's Pits;
  SHAKEDOWN joins the lair pool.
- *Faction:* LANTERN and GLASSJAW are rivals and both hubs are here. A second side-contract pair (LANTERN against
  GLASSJAW, as Kestrel against NULL CHOIR today), from floor 2: pick a side and the ripple does the rest.
- *Puzzle:* the **log sweep** comes back as a terminal room (forensics.mjs: `breach.log`, `transfer.log`,
  `ps.snapshot`, with their floor 1, floor 2 and floor 3+ versions already written). One answer, three suspects, a
  trace on the next server.
- *Signature:* **Router**, a server kind. *Routes: two links are one-way, drawn as arrows. The hunter keeps to them too.*
  The key walk becomes a route you plan around.
- *Come back:* strain trophies, CENTRIFUGE's uniques, Botnet farms for Zombie Nodes.

**Floor 3 · The Stacks** (13–20, about 6.5 hours). Racks of servers, the call stack.
- *Today:* NULL CHOIR's hub (12); v2; layer 3 vault and rogue uniques start (Rowhammer 18, Ctrl-C 20); the lair. Nothing
  new to fight: the cast stopped growing at level 11.
- *Cast:* **Polymorph** (14), **RAT** (16) and **Rootkit** (18), docs/servers.md 4.3. Three new threshold verbs on one
  floor: lock its form, release your key, surface the next part.
- *Bosses:* the lair from HASHLORD, FLOODWALL and ECHOLALIA; **SHOULDER SURFER** (18, NULL CHOIR) joins the pool.
- *Faction:* NULL CHOIR's floor. A third of its traced servers are NULL CHOIR's (one in eight elsewhere), so the
  Kestrel–NULL CHOIR side choice is played here.
- *Puzzle:* the deeper boards docs/servers.md 9.11 left out: the **Hunter chase** with a second Tracker in the den, and
  **Cascade** with two racks, where a node discharging on the edge charges the other rack.
- *Signature:* **Honeypot**, a server kind. *Bait: every cache is bait, and bait pays double.* You pay the Signal for
  the bigger caches.
- *Come back:* layer 3 uniques, the new families' components, SHOULDER SURFER's uniques.

**Floor 4 · Coldline** (19–26, about 12 hours). Cold storage: backups, archives, cold wallets.
- *Today:* v3; the Tripwire (20); deeper Quarantine and Ping sweep boards; two exits; the lair; the rest of layer 3's
  uniques (Slammer, Log4Shell, Spectre), Sinkhole (24, invasions), the three takeover-contract uniques (22). No hub.
- *Cast:* **Stealer** (22) and **Fileless** (26), docs/servers.md 4.3. Stealer asks every class to lay down what it
  has; Fileless punishes burst.
- *Bosses:* TRIPMINE and **CAMSWARM** (24, SWARMLINE) in the lair pool; **BYZANTINE** (26, GLASSJAW) on the throne of
  floor 4's Pits.
- *Faction:* Kestrel's ground. Kestrel runs the data centres, so a third of Coldline's servers are Kestrel's and its
  ICE guards every one of them.
- *Puzzle:* the deeper Quarantine and Ping sweep (*Built*).
- *Signature:* **Cold storage**, a server kind. *Cold: every virus sleeps until you hit it or cycle 6, and the vault
  holds two kits.* The Sleeper's rule for a whole server: the opening hit decides the fight.
- *Come back:* BYZANTINE's and CAMSWARM's uniques, Stealer and Fileless components, Kestrel's top tier.

**Floor 5 · Deep Core** (25–32, about 14 hours). Two halves and one bridge. ACTUARY's floor.
- *Today:* layer 4 uniques (Bulletproof Host 28, Hot Reload 30, Interrupt Vector 32); rooms cost 4% and 6%; the lair.
  Nothing new to fight.
- *Cast:* **ACTUARY** holds the floor (docs/genome.md 4.4): six rules at a time, and it reprices the one you beat most
  with its counter, a notice first. *Proposed change:* it reprices every 300 kills on the floor, not weekly, so it moves
  only while you play there. Its portfolio needs the first of the designed rules not yet wired (Rate cap, Zip Bomb, Hot
  Spare, Bad Sectors, Handshake).
- *Bosses:* **EXIT NODE** (30, PALEMASK) and **PARASITE** (32, SWARMLINE) in the lair pool. **UNDERWRITER** (40) waits
  in the Core of ACTUARY's hub server, sealed until level 40, the way HASHLORD's Core waits for 16.
- *Faction:* Halcyon. The Claims desk's letters follow its own model loose on the floor.
- *Puzzle:* a new board, **Defrag**: *slide the file blocks until every file is contiguous, in the fewest moves + 1.*
- *Signature:* the bridge: the one link between the halves is always a Router's one-way pair.
- *Come back:* UNDERWRITER at 40; layer 4 uniques; ACTUARY's counters, steered by what you farm.

**Floor 6 · Kernel Space** (31–38, about 18 hours). Drivers, hooks, the kernel.
- *Today:* the last layer 4 uniques (Blue Pill 34, Shellshock 38), the 34 base tiers, the lair. Nothing new to fight.
- *Cast:* two strains written for the floor's families (a Rootkit build and a Polymorph build, NULL CHOIR's and
  PALEMASK's), and two designed rules wired: Front End and Clock glitch.
- *Bosses:* **RING ZERO** (34, NULL CHOIR) and **BRICKWALL** (36, TOLLGATE) in the lair pool; **BLACKOUT** (34,
  PALEMASK) on the throne of floor 6's Pits.
- *Faction:* NULL CHOIR again, deeper: its Cantor tier's work.
- *Puzzle:* a new board, **Deadlock**: *order the lock grabs so no two processes wait on each other.*
- *Signature:* **Domain Controller**, a server kind. *Credentials: three vaults, each holding the next one's key. The
  last unseals the Core.* The key walk, three times over.
- *Come back:* RING ZERO's uniques, Blue Pill and Shellshock.

**Floor 7 · The Sink** (37–44, about 20 hours). Where stolen data ends up.
- *Today:* the 42 base tiers and daemon band 5. The loot plan's Batch 1 (docs/loot-plan.md): 30 uniques for 39–44,
  from its lair boss, rare spawns, vaults, threads, puzzle boards, strain kills and crew bosses (GOLDEN PARACHUTE's three
  from the lair boss until it is built).
- *Cast:* two Stealer strains, and Exfiltrate and Bad Sectors wired.
- *Bosses:* **GOLDEN PARACHUTE** (38, GLASSJAW) and one boss to write at 42. *Suggested:* **BIT BUCKET**: the first share
  of your damage each cycle goes to `/dev/null`, more of it while it has ◆.
- *Faction:* GLASSJAW, the buyer.
- *Puzzle:* every server has two puzzle rooms, both on their deepest boards.
- *Signature:* **Sinkhole**, a server kind. *Drain: every kill here drains its code into the Core. The Resident grows a
  level for every 10 kills, up to 3, and pays all of it when it falls.*
- *Come back:* The Sink's 30 uniques (Batch 1), GOLDEN PARACHUTE's.

**Floor 8 · Bedrock** (43–50, about 21 hours, and the endgame). Firmware: what's under everything.
- *Today:* the lair, and Batch 1's 30 uniques for 45–50 (the strongest in the game): from its lair boss (INIT's, the flash
  ranks' and its bosses' too until they are built), rare spawns, vaults, threads, puzzle boards and strain kills. Bedrock
  has no exit and nothing at the bottom (docs/servers.md 10, question 9).
- *Cast:* the three crews' home ground: TOLLGATE, SWARMLINE and PALEMASK each own a third of its servers, each with a
  strain of its own written for 43–50, and Zip Bomb, Hot Spare and Rate cap wired.
- *Bosses:* one to write at 46 (*suggested:* **HALT AND CATCH FIRE**, a Cryptominer line that runs hotter the longer
  it lives) and the last Resident, **INIT**, PID 1, in the Core of Bedrock's deepest server at 50.
- *Faction:* the crews you've fought since claimjack, on their own servers.
- *Puzzle:* a new board, **Bit flip**: *flipping a bit flips its neighbours. Zero the ROM.*
- *Signature:* **Firmware**, a server kind, and the endgame ladder (section 4.2).
- *Come back:* flash ranks, INIT's uniques, daemons at 50.

### 3.3 The gaps

✓ there today, *thin* there but not enough, ✗ missing. A cell names what fills it.

| Floor | Hours | New cast | Named bosses and lair | Faction thread | Puzzle twist | Signature | Come back for |
|---:|---:|---|---|---|---|---|---|
| 1 | 3 | ✓ three families, Trojan, Cryptominer, four guards | ✓ RELAY-KING, the farm; add PATIENT ZERO, LOVELETTER | ✓ Halcyon, Kestrel, the storyline | ✓ the four boards | ✓ SPRAWL-00, KESSLER-FARM-00 | ✓ the farm (to 50), RELAY-KING |
| 2 | 5.5 | ✓ 11 strains, ICE, Wiper; add Botnet, Logic Bomb | *thin*: the network's one boss → band A lair pool, CENTRIFUGE | ✓ LANTERN, GLASSJAW; add their side pair | ✗ → the log sweep | *thin*: the hunter arrives → Router | *thin*: strain trophies → CENTRIFUGE, Zombie Nodes |
| 3 | 6.5 | ✗ → Polymorph, RAT, Rootkit | ✗ the same boss → HASHLORD, FLOODWALL, ECHOLALIA, SHOULDER SURFER | ✓ NULL CHOIR; add its ground | ✗ → deeper chase and Cascade | ✗ → Honeypot | *thin*: layer 3 uniques → SHOULDER SURFER |
| 4 | 12 | *thin*: Tripwire, v3 → Stealer, Fileless | ✗ the same boss → TRIPMINE, CAMSWARM, BYZANTINE | ✗ → Kestrel's ground | ✓ deeper Quarantine, Ping sweep | ✗ → Cold storage | *thin*: layer 3 uniques → BYZANTINE, CAMSWARM |
| 5 | 14 | ✗ → ACTUARY's portfolio | ✗ → EXIT NODE, PARASITE, UNDERWRITER (sealed to 40) | ✗ → Halcyon, the Claims desk | ✗ → Defrag | ✗ → the bridge | *thin*: layer 4 uniques → UNDERWRITER |
| 6 | 18 | ✗ → two strains, Front End, Clock glitch | ✗ → RING ZERO, BRICKWALL, BLACKOUT | ✗ → NULL CHOIR, deeper | ✗ → Deadlock | ✗ → Domain Controller | *thin*: Blue Pill, Shellshock → RING ZERO |
| 7 | 20 | ✗ → two Stealer strains, Exfiltrate, Bad Sectors | ✗ → GOLDEN PARACHUTE, one to write | ✗ → GLASSJAW | ✗ → two deep boards a server | ✗ → Sinkhole | ✓ Batch 1's 30 uniques (39–44) |
| 8 | 21+ | ✗ → three crew strains, three rules | ✗ → one to write, INIT | ✗ → the three crews | ✗ → Bit flip | ✗ → Firmware, flash ranks | ✗ → the endgame ladder |

## 4. Long goals: the chase

### 4.1 What keeps a level-50 player busy

| Goal | Today | What it asks | Add |
|---|---|---|---|
| **Collection log** | 158 uniques up to level 50 (two sets' five pieces under Sets; Batch 1's 60 for 39–50) and 11 strain trophies, sorted by level, ??? until found; natives once known (*Built*) | Hundreds of hours: trophies are 1 in 10,000 kills of their strain | The 14 designed bosses' 30-odd uniques and the sets (docs/loot-plan.md); the plan's next batches (the thin middle, 15–20 and 33–38); a page a boss with your kills and its table, as the Codex has |
| **Codex mastery** | About 55 parts, research 60 each: +3% damage, +25% component drops, an amber star (*Built*) | About 30 fights a part you meet often, far more for a rare one | The seven families' 20-odd parts; a group finished (every family, every strain) earns a phosphor (section 5) |
| **Patches** | — | v2 and v3 of every program, over 100 hours of code (*Planned*, docs/economy.md) | Nothing more: installs and supply orders keep taking code after the last patch |
| **Root on held servers** | Root 1–5 by cleared respawns (*Built*; 4 ranks under docs/economy.md) | About 50 clears a server | The root prompt (section 5) for the top rank on ten servers |
| **Consortium projects** | Size tiers (*Built*) | Trunk Relay to Grid, funded together (*Planned*) | — |
| **Faction standing** | Five factions, tiers at 1/25/50/75, ripples (*Built*) | Rivals pull against each other, so every top tier at once is a long swing | Supply orders as the steady climb (*Planned*); a desk prop at each top tier, kept once earned |
| **Boss uniques** | Two each on 7 bosses and the farm's three; natives on the nine native bosses (*Built*) | 15% + 5% a miss (crew 30% + 10%) | The 14 designed bosses; each native boss's own two uniques from docs/genome.md 7.4 (Bump Key, Deadlatch…) once lairs move by floor |
| **Sets** | Kestrel Clearance and LOWLIGHT Kit (*Built*: the Collection's Sets, sets.mjs) | Ten sets, most pieces one per boss of an author's line (docs/genome.md 9) | The other eight once the bosses that drop them exist |
| **KESSLER-FARM-00** | Three crew bosses, 8 uniques, keeping up to 50 (*Built*) | Every 6 hours, with a crew | *Proposed:* a second crew dungeon on floor 6 (crew bosses are data on raid.mjs) |
| **Daemons** | 40, one copy each at its level; invasions only (*Built*) | A copy of each at 50: a long tail | — |
| **Bedrock's endgame** | Nothing (open question 9) | — | 4.2 |

### 4.2 Bedrock's endgame (*Proposed*)

docs/servers.md recommends a reflash once Bedrock is Mapped, plus a final Resident on its deepest server. This sheet
adds a ladder between the two, so the end of the climb is a place you stay, not a reset you're pushed into.

| Piece | What it is |
|---|---|
| **INIT** | The last Resident, PID 1, on Bedrock's deepest server at level 50. Its first fall is the end of the climb: a letter from wick, its sticker, its uniques. |
| **Flash ranks** | A Mapped Bedrock server can be reflashed: every room back, one rank up. Each rank keeps the ones under it and adds one modifier, the way heat did on breaches (heat.mjs), rewritten for rooms; each pays gear a level higher (past 50, up to 55) and more yellows. The server card shows its rank. Nothing resets on a clock and nothing is lost by stopping. |
| **Reflash** | Optional, once all of Bedrock is Mapped: a new network seed, as docs/genome.md 6.2 lists (kept: levels, gear, collection, Codex, rep, desk; reset: the network, its servers and lair). |

## 5. Cosmetics for the computer

### 5.1 What's there now

The game already sits on a desk (GAME_RULES.md *The monitor casing*, `window.mjs`, `shell.mjs`). With the immersive
shell on a desktop-sized window: the dark monitor (BLACKBOX · MODEL 7), its two knobs and six lamps; the CRT
(scanlines, glow, a rolling band); the window either side of it onto the slum, its weather turning every few minutes;
the desk (a worn top, the monitor's foot, a keyboard, a cable, a mug, a notepad); the boot (`BLACKBOX/OS 0.9.4 · tty1`,
your state read back, the login); the prompt (`<handle>@blackbox:~$`); the room tone, the radio chatter and the
mechanical keys. System has switches for Shell, Casing and Window.

None of it is yours. The proposal makes it yours, a piece at a time, by playing.

### 5.2 The rules

- **Earned by playing.** Never sold for credits or real money, never timed, never seasonal, nothing expires. Each one
  names what earns it, ??? until you have it, as the Collection does.
- **No effect on play.** Look and sound only.
- **Colours keep their jobs.** Nothing a cosmetic changes is teal, violet, hot red or steel. A phosphor moves only the
  amber family (`--amber`, `--text`, `--muted`, `--dim` and the panels), and each one is checked against `--you`,
  `--daemon`, `--hot`, `--steel` and `--next` before it ships. A green phosphor fails that check against teal, so there
  isn't one.
- **The lamps stay honest.** They show real state; no cosmetic touches them.
- **Kept for good**, through a reflash, and bound to you (never traded).
- **Show, don't tell.** A name, one flavour line, and the source line: *COLDWALLET sticker. A padlock, shackle cut.
  COLDWALLET's first fall.*

### 5.3 The Desk

One card on the System page, **Desk**, beside the Collection: a drawing of your monitor with its slots, and what you own
for each. Click a slot, pick one. `desk` in the terminal lists the same (`desk set sticker 2 coldwallet`). It works
anywhere out of a fight. A new one adds a *New on your desk* row to the reward card, and the first one brings a tip to
the card.

| Slot | What it changes | Default | Earned by | To earn |
|---|---|---|---|---:|
| **Stickers** (3 on the bezel) | The monitor's bezel | none | A named boss's first fall, one each: RELAY-KING, REPO MAN, HOLLOW CHOIR, a first takeover (*VOID IF REMOVED*), the nine native bosses (your network's and members'), THE FOREMAN, HEATSINK, COLDWALLET. Every new boss adds one. | 16 |
| **Casing** | The monitor's finish and its badge plate | MODEL 7, black | Collection milestones: 25 uniques (yellowed beige), 50 (brushed aluminium), 75 (smoked acrylic, the tube showing through), INIT's first fall (the Bedrock plate) | 4 |
| **Phosphor** | The tube's tint | P3 amber | Codex: every family mastered (P4 paper white), every strain mastered (sodium), every part mastered (P1 green) | 3 |
| **Desk props** (left, right) | What stands beside the monitor | mug, notepad | A faction's top tier: Halcyon a claims binder, Kestrel a visitor lanyard, LANTERN a shortwave set (the radio chatter's source), NULL CHOIR a stack of zines, GLASSJAW a burner phone; KESSLER-FARM-00's ledger opened: a dead hashboard | 6 |

That's 29 to earn in the first pass, most of them stickers, so the list grows with every boss section 6 builds.

**Second pass** (the same card, three more slots):

| Slot | What it changes | Default | Earned by | To earn |
|---|---|---|---|---:|
| **Keyboard** | The board on the desk and its key sound | today's mechanical | Each puzzle kind won 25 times: membrane, buckling spring, clicky, a terminal's | 4 |
| **Shell** | The boot banner and the prompt | `BLACKBOX/OS`, `$` | LOWLIGHT's storyline finished (wick's build), the top Root rank on ten servers (the `#` prompt), reaching Bedrock (a BIOS POST boot) | 3 |
| **Window** | The neon sign across the street | today's | Every server on a floor Mapped: that floor's holder's or faction's neon, one a floor | 8 |

Not proposed: map palettes (every map colour has a job) and fonts (readability is tuned for one).

**Where it shows.** Phosphor and Shell work on every screen. Casing, stickers, props, keyboard and window show only with
the casing on, as today: phones never show it, and a phone's Desk card still shows the drawing.

### 5.4 Other players' desks (later, with real players)

- **`whois <handle>`** prints a player's card: handle, class and level, floor, and a small drawing of their monitor
  (casing, phosphor, stickers, props). The people panel's line shows the same on hover, and a consortium member's row
  carries their sticker strip.
- Their phosphor is never applied to your screen, and nothing about them is recoloured in a fight: a crewmate stays
  violet.
- No leaderboards. A sticker is the boast.

## 6. Priorities

Ordered for the most variety per hour of work, floors 2–4 first. S is a day or two, M about a week, L more.

| # | Build | Size | Fills | Why here |
|---:|---|:---:|---|---|
| 1 | **Lairs by floor**: each floor's lair draws a boss from its band (3.1); your native boss on its own band's floor; natives still roll in every lair | S | Floors 2–4 (24 h) | Five different bosses on floors 2–4 from content that exists |
| 2 | **Floor holders**: an author writes most of each floor, per network | S–M | Floors 2–8 | Deferred from R3; two networks' floors stop looking alike |
| 3 | **Botnet and Logic Bomb** | M | Floor 2 (5.5 h) | Designed; the engine already fights many parts |
| 4 | **The log sweep as a terminal room** | S | Floors 2–8 | forensics.mjs has its three file kinds and three depths |
| 5 | **Floor 2–4 bosses**: CENTRIFUGE, SHAKEDOWN, SHOULDER SURFER, CAMSWARM, BYZANTINE, with their uniques; the native bosses' own uniques | M | Floors 2–4 | Designed with their rules and loot (docs/genome.md 7.4) |
| 6 | **The Desk, first pass**: the card, stickers, casing finishes, phosphors, props | M | All, and every boss after it | The designer's ask; stickers make each new boss a chase |
| 7 | **Polymorph, RAT, Rootkit** | L | Floor 3 (6.5 h) | Floor 3 has nothing new to fight today |
| 8 | **Floor 2–4 signatures**: Router, Honeypot, Cold storage | S each | Floors 2–4 | One rule each, on the room engine as it is |
| 9 | **Deeper chase and Cascade boards** | S | Floors 3–8 | The two boards with no deep version |
| 10 | **Faction ground and the LANTERN–GLASSJAW side pair**; supply orders | S, then M | Floors 2–7 | Weights and one list; supply orders are docs/economy.md step 3 |
| 11 | **Stealer and Fileless** | L | Floor 4 (12 h) | Designed; Fileless needs possession of room processes |
| 12 | **Uniques for 40–50** (the loot plan's Batch 1) | M | Floors 7–8 | Built: 60 for 39–50 (docs/loot-plan.md) |
| 13 | **Floors 5–7 bosses**: EXIT NODE, PARASITE, RING ZERO, BRICKWALL, BLACKOUT, GOLDEN PARACHUTE | L | Floors 5–7 (52 h) | Designed |
| 14 | **ACTUARY and UNDERWRITER** | L | Floor 5 (14 h) | Needs the first unwired rules |
| 15 | **New boards**: Defrag, Deadlock, Bit flip | M each | Floors 5, 6, 8 | Each needs a generator and a solver, as the four had |
| 16 | **Sets** | L | All | After the bosses that drop them. *Started:* the set system and the two sets whose pieces drop today, Kestrel Clearance (the Bouncer, the Tracer and the Sentinel, floor 2 and below) and LOWLIGHT Kit (the storyline), are built (sets.mjs, docs/genome.md 9.2); the other eight wait on their bosses |
| 17 | **Bedrock**: INIT, flash ranks, Firmware; then the reflash | L | Floor 8 and after | Needs a decision first (section 7) |
| 18 | **The Desk, second pass**: keyboards, shells, window signs | M | All | Needs key-sound takes and window art |
| 19 | **A second crew dungeon** | M–L | Floor 6 | Crew bosses are data on raid.mjs; worth it once crews are real |

*Proposed, S, anywhere in the list:* the **Ready** section in the map's List mode (1.3).

## 7. Decided (October 2026)

1. **Lairs by floor**: one lair a floor, its boss from that floor's band, your native boss on its own band's floor.
2. **Floor holders**: rolled per network from its roster; floor 5 is always ACTUARY's.
3. **Bedrock**: INIT and flash ranks, to try. Flash ranks pay gear past 50, up to 55.
4. **ACTUARY** reprices every 300 kills on its floor, never on a calendar.
5. **Cosmetics**: a first takeover earns a sticker (*VOID IF REMOVED*). Faction props need the top tier (75), like a
   skill cape. Green phosphor (P1) is in, from the Codex with the other two.
6. **Uniques for 40–50**: the loot plan's Batch 1 (docs/loot-plan.md), 60 for 39–50. *Built.* The sets are reworked
   beside them.
7. **Loot** (from the lootsim report): Mapped and dead drops pay a white or a blue (`LOOT.minor`), and the Resident's
   roll, once you hold its two, pays a yellow, never a world unique. *Built.*
