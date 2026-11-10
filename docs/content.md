# Content: a sandbox to climb

**Status.** The plan for what each floor needs to carry its share of the climb, and what to build, in order. Built
content is in GAME_RULES.md (the activities, floors, bosses, uniques and sets). Left: everything in sections 3 to 5,
none of it built.

The designer's direction:

> "There needs to be enough variety and content for someone to grind the content for a while."
> "Having a bunch of activities is what I'm going for. Games like Warframe and Starsector, even Terraria, don't have a
> super concentrated storyline. I want it to function like a sandbox."

Taste this sheet holds to: show, don't tell; terse tooltip text; one job per system; ??? until found; a world you
climb; no FOMO (no timed exclusives, no dailies to miss); hard and varied; programs and viruses that make computing
sense; teal is only ever you. *Planned* means designed in another sheet (docs/economy.md, docs/servers.md,
docs/genome.md); *Proposed* means new here.

## 1. The sandbox loop

### 1.1 Hours on each floor

On the farmer's pace (`FARM_TARGET`, about 100 hours to 50; a contract worker's is about two thirds of it), taking
each exit about a level into the floor below's band, at about 150 kills an hour. Approximate:

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

From level 20 nothing new is introduced: no family, strain, third part, mutation, guard or boss opens past the
Tripwire at 20, every floor's lair holds the same boss, and no hub stands below floor 3. Floors 2 to 4 are where
players are now, so they come first (section 5). Section 3 fills the rest: a new family a floor from 3, and floors
5–8 to floor 6's standard (3.1).

### 1.2 The activity menu

A session opens on the map. What's ready shows where it is. You pick one, then another. None has to be done; each
one's reward waits.

| You want | Go | A go takes | Pays most | Refills |
|---|---|---|---|---|
| To climb | Trace and map servers toward the floor's exit | 30–60 min a server | XP, gear, trace | The floor itself |
| Code | A held server with programs (Harvester, Code Siphon, Cron Spawner) | 15–30 min | Code of its family, components to sell | Rooms: 2–10 min once Mapped or held |
| A boss unique | The lair, RELAY-KING, an event boss, the farm | 5–20 min a boss | Uniques (with pity), a sure item | Lair 1 h, RELAY-KING 30 min, farm 6 h, events every 15–30 min |
| A fast clear | A rogue server's visit, and an Exfil if it rolls | 10–20 min | XP, Stashes, a Gauntlet's cache, the Exfil's archive | Rooms 3–5 min, Stashes 30 min; Exfil 45 min |
| Daemons and code | Jack in at the wall | 5 min an invasion | Code bounties, daemons (the only source) | Every 20–30 min |
| Credits and standing | Contracts, room contracts, supply orders *(planned)* | 10–30 min | Credits, standing, XP, protocols | Offers every 1–3 min |
| A break between fights | A puzzle room | 1–3 min | Code, a cache, the Tracker off your trail | 2 h |
| A story | A thread (docs/threads.md) | 20–45 min a chain | Deed XP, pick one of three items, standing, lore | Found as you connect; never timed |
| Knowledge | Fight what you haven't mastered | as it comes | Research to 60 | Never runs out |
| To build | Home: programs, patches *(planned)*, the wall, the market | 5 min | Your servers' rules | When you have the materials |

### 1.3 Why switching pays

Rotation, not obligation: clocks refill and wait, Fresh XP pays half again for a kind you haven't earned in 20
minutes, the hot strain pays +50% XP, and the sinks want every currency (a patch one family's code, a program credits
and its server's code, the wall's top tiers and consortium projects all three codes). The short one says where to go
next.

*Proposed, S:* a **Ready** section at the top of the map's List mode: what's ready (a lair's Core back, puzzle rooms
refilled, the farm's bosses, a supply order waiting), each with its locate button. A list, never a chirp.

## 2. Planned elsewhere

| Activity | Source | Pays | Floors |
|---|---|---|---|
| Patches (v2, v3 for every copy of a program) | docs/economy.md 2 | A program network-wide | All |
| Supply orders (one standing order per faction) | docs/economy.md 3 | Credits ×1.25 market value, +4 standing | All |
| Consortium projects | docs/economy.md 4 | Trunk Relay to Grid, for every member | All |
| The programs still to build | docs/economy.md 1 | That server's rules | All |
| Seven more families | docs/servers.md 4.2 | Their code | 2–4 |
| Nest rooms, Linked tells, help requests | docs/servers.md 9.1 (R4) | 1.5 kills a nest | All |
| Fourteen more solo bosses | docs/genome.md 7.4 | Uniques and set pieces | 1–8 |
| ACTUARY, the adaptive author, and its boss | docs/genome.md 4.4, docs/solo-bosses.md | Its floor's loot | 5 |
| The log sweep as a terminal room | old file system only (run.mjs `LEGACY`) | Trace, a kill of XP | All |
| Reflash | docs/genome.md 6 | A new network | 8 |
| Trade between players | docs/economy.md | Credits | Needs a server |

## 3. Floor by floor

### 3.1 What a floor needs

To carry 10–15 hours without feeling like floor 1 again, each floor gets six things: **a new cast** (families,
strains or rules that open there), **its own named bosses**, **a faction thread**, **a puzzle twist**, **a signature**
(a server kind or event only it has) and **a reason to come back**.

**The standard is floor 6** (the designer, November 2026): one new family; four named bosses (two in the lair pool, the
floor job's, one in a fixed place), each a three-act fight (docs/solo-bosses.md); a board of its own or a deep one; a
server kind; a thread and a transmission; **five sets and 20 uniques** in its band. Floors 5–8 are written to it; 2–4
are next.

**Lairs by floor** (*built*, `floors.mjs` FLOOR.lairs). Each floor's lair draws a boss from that floor's band, weighted
by your network. Your native boss takes the lair on the floor whose band fits it. Every lair still rolls your network's
natives (three rolls at the elite rate with the network's pity). Floors 5–8 have no built boss yet, so their lairs keep
your native boss until the bosses below are built; a lair found before this keeps the boss it had.

| Floor | Built bosses that fit its band | Designed, not built (docs/genome.md 7.4) |
|---|---|---|
| 2 (7–14) | DEADBOLT 8, BACK ORIFICE 8, PATCH TUESDAY 9, SLEEPWALKER 10, MIRRORSHADE 12 | SHAKEDOWN 12 |
| 3 (13–20) | HASHLORD 16, FLOODWALL 16, ECHOLALIA 18 | SHOULDER SURFER 18 |
| 4 (19–26) | TRIPMINE 20 | CAMSWARM 24 |
| 5 (25–32) | — | GRACE PERIOD 28, PARASITE 32 |
| 6 (31–38) | — | RING ZERO 34, BRICKWALL 36 |
| 7 (37–44) | — | PAY RUN 40, BIT BUCKET 42 |
| 8 (43–50) | — | HALT AND CATCH FIRE 46, THUNDERING HERD 47 |

A floor job's boss (EXIT NODE, BULKHEAD, GOLDEN PARACHUTE, CORE DUMP) is fought in its job's Core, never in the lair.

**Floor holders** (*built*, `floors.mjs` holdersOf). Each floor has a holder, the author that writes most of it, rolled
from your network's roster. It sets the floor's families (`AUTHOR_FAMILIES`), attack sets, Nest and guard posts, so
floor 2 under TOLLGATE plays nothing like floor 2 under SWARMLINE. Floor 5 is always ACTUARY's. *Built:* floors 2–8,
from the six authors that write viruses, weighted to the lean, never the floor above's; it writes three servers in
four (their families and their rooms' families and attack sets). *Left:* Nest and guard posts don't read the author
yet, and floor 5 rolls like the rest until ACTUARY writes viruses (priority 12).

### 3.2 The floors

**Floor 1 · The Sprawl** (1–8). Fine as it is.
- *Add:* PATIENT ZERO (5, SWARMLINE) in the last room of floor 1's Gauntlets, the boss that teaches fragments, and
  LOVELETTER (6, PALEMASK) as a Chain Letter event on a traced Mailhub (both docs/genome.md 7.4).

**Floor 2 · Backhaul** (7–14). The carrier's trunk lines: traffic, relays, botnets.
- *Cast:* **Botnet** (8) and **Logic Bomb** (12), docs/servers.md 4.3. Botnet's *farm it or end it* is the floor's
  area-build farm.
- *Bosses:* the lair from the pool above; **CENTRIFUGE** (14, GLASSJAW) on the throne of floor 2's Pits; SHAKEDOWN
  joins the lair pool.
- *Faction:* LANTERN and GLASSJAW are rivals with both hubs here. A second side-contract pair (LANTERN against
  GLASSJAW, as Kestrel against NULL CHOIR), from floor 2.
- *Puzzle:* the **log sweep** comes back as a terminal room (forensics.mjs has its three file kinds and three depths).
- *Signature:* **Router**, a server kind. *Routes: two links are one-way, drawn as arrows. The hunter keeps to them too.*
- *Come back:* CENTRIFUGE's uniques, Botnet farms.

**Floor 3 · The Stacks** (13–20). Racks of servers, the call stack.
- *Cast:* **RAT** (16), docs/servers.md 4.3. Polymorph and Rootkit moved to floors 5 and 6.
- *Bosses:* the lair from HASHLORD, FLOODWALL and ECHOLALIA; **SHOULDER SURFER** (18, NULL CHOIR) joins the pool.
- *Faction:* NULL CHOIR's floor. A third of its traced servers are NULL CHOIR's (one in eight elsewhere), so the
  Kestrel–NULL CHOIR side choice is played here.
- *Puzzle:* deeper boards for the two that have none: the **Hunter chase** with a second Tracker in the den, and
  **Cascade** with two racks, where a node discharging on the edge charges the other rack.
- *Signature:* **Honeypot**, a server kind. *Bait: every cache is bait, and bait pays double.*
- *Come back:* layer 3 uniques, the new families' code, SHOULDER SURFER's uniques.

**Floor 4 · Coldline** (19–26). Cold storage: backups, archives, cold wallets.
- *Cast:* **Fileless** (26), docs/servers.md 4.3. The Stealer moved to floor 7.
- *Bosses:* TRIPMINE and **CAMSWARM** (24, SWARMLINE) in the lair pool; **BYZANTINE** (26, GLASSJAW) on the throne of
  floor 4's Pits.
- *Faction:* Kestrel's ground: a third of Coldline's servers are Kestrel's, and its ICE guards every one.
- *Signature:* **Cold storage**, a server kind. *Cold: every virus sleeps until you hit it or cycle 6, and the vault
  holds two kits.*
- *Come back:* BYZANTINE's and CAMSWARM's uniques, Kestrel's top tier.

Floors 5–8 were prototyped as applets (floor sheets and boss boards, November 2026). The bosses' acts are in
docs/solo-bosses.md; a boss named *new* is new there.

**Floor 5 · Deep Core** (25–32). Two halves and one bridge: ACTUARY's two books, the insured and the uninsured.
- *Cast:* **Polymorph** (26), ACTUARY's family: its shared ◆ move to the part you hit last. ACTUARY's portfolio
  (docs/genome.md 4.4); its elites are hedged, a rule and its counter as a clash (Mimic ⇄ Handshake, Tripwire ⇄ Zip
  Bomb, Ward ⇄ Mutex). Handshake is the one counter with no part yet.
- *Bosses:* **GRACE PERIOD** (28, TOLLGATE, *new*) and **PARASITE** (32, SWARMLINE) in the lair pool; **EXIT NODE** (30,
  PALEMASK) for the floor job; **ACTUARY** (40) in the Core of its hub server, sealed until 40. It retires UNDERWRITER
  and takes its two uniques.
- *Faction:* Halcyon. The Claims desk's letters follow its own model loose on the floor.
- *Puzzle:* a new board, **Defrag**: *move a block to a free slot until every file is whole, in the fewest moves + 1.*
- *Signature:* the bridge, a Router's one-way pair; and **Underwriting desk**, a server kind: every fight on it carries
  one insured part.
- *Come back:* ACTUARY at 40; the portfolio, steered by what you farm.

**Floor 6 · Kernel Space** (31–38). Drivers, hooks, the kernel. The standard.
- *Cast:* **Rootkit** (32): one part surfaced at a time, the hidden ones healing. Front End is built; Clock glitch has
  no rule written yet.
- *Bosses:* **RING ZERO** (34, NULL CHOIR) and **BRICKWALL** (36, TOLLGATE) in the lair pool; **BULKHEAD** (36, Kestrel
  ICE) for the floor job; **BLACKOUT** (34, PALEMASK) on the throne of floor 6's Pits.
- *Faction:* NULL CHOIR, deeper. Kestrel's notice of closure arrives as a transmission.
- *Puzzle:* **Deadlock** is built for every floor; here, its deep board, three times as often: eight processes, and one
  crashed holding a lock that returns when both beside it finish.
- *Signature:* **Domain Controller**, a server kind. *Credentials: three vaults, each holding the next one's key. The
  last unseals the Core.*
- *Come back:* RING ZERO's uniques, BLACKOUT on the throne, the Domain Controller's vaults.

**Floor 7 · The Sink** (37–44). Where stolen data ends up; Pellucid Payroll froze here mid-run.
- *Cast:* **Stealer** (38): what the Siphon takes, it uses. Exfiltrate wired as an Upload count on a part's row.
- *Bosses:* **PAY RUN** (40, *new*) and **BIT BUCKET** (42) in the lair pool; **GOLDEN PARACHUTE** (38, GLASSJAW) for
  the floor job; **SUMP** (44, GLASSJAW, *new*) in the server at the funnel's point.
- *Faction:* GLASSJAW, the buyer. It plays INIT's last report as a transmission.
- *Puzzle:* two puzzle rooms a server, both on their deepest boards, and **Packet routing**'s deep board: two sources
  into one sink.
- *Signature:* **Sinkhole**, a server kind. *Drain: every kill here drains its code into the Core. The Resident grows a
  level for every 10 kills, up to 3, and pays all of it when it falls.*
- *Come back:* Sinkholes, SUMP, two lair bosses.

**Floor 8 · Bedrock** (43–50, and the endgame). Firmware: what's under everything.
- *Cast:* **Bootkit** (44, *new*): the Loader loads a stage every 4 cycles. TOLLGATE, SWARMLINE and PALEMASK each own a
  third of its servers, each with a strain for 43–50: DEAD HAND (a Limiter on a growing Encryptor), COLD STANDBY (a
  Spare for every part), DEAD DROP (one veiled part is a Zip Bomb).
- *Bosses:* **HALT AND CATCH FIRE** (46, TOLLGATE) and **THUNDERING HERD** (47, SWARMLINE, *new*) in the lair pool;
  **CORE DUMP** (48, *new*, what is left of the Actuary) for the floor job; **INIT**, PID 1, in the Core of Bedrock's
  deepest server at 50, in five acts.
- *Puzzle:* a new board, **Bit flip**: *flipping a bit flips its neighbours. Zero the ROM.*
- *Signature:* **Firmware**, a server kind, and the endgame ladder (4.2).

**Items, floors 5–8.** Five sets and 20 uniques a floor, by band:

| Floor | Sets today | Uniques today | To do |
|---:|---|---:|---|
| 5 | Burst Buffer, Hot Spare | 12 | 3 sets; two uniques a boss |
| 6 | Mesh | 9 | 4 sets; two a boss, three from the cast and server kind |
| 7 | Deep Archive | 33 | 4 sets; move the lair's uniques onto its four bosses |
| 8 | the four tier sets, Bedrock | 43 | move the lair's 18 onto its four bosses |

### 3.3 The gaps

✓ there today, *thin* there but not enough, ✗ missing. A cell names what fills it.

| Floor | New cast | Named bosses and lair | Faction thread | Puzzle twist | Signature | Come back for |
|---:|---|---|---|---|---|---|
| 1 | ✓ | ✓ add PATIENT ZERO, LOVELETTER | ✓ | ✓ | ✓ | ✓ |
| 2 | ✓ | *thin* → CENTRIFUGE, SHAKEDOWN | ✓ add the side pair | ✓ | ✓ | *thin* → CENTRIFUGE, Botnet |
| 3 | ✗ → RAT | ✗ → HASHLORD, FLOODWALL, ECHOLALIA, SHOULDER SURFER | ✓ add its ground | ✓ | ✓ | *thin* → SHOULDER SURFER |
| 4 | *thin* → Fileless | ✗ → TRIPMINE, CAMSWARM, BYZANTINE | ✗ → Kestrel's ground | ✓ | ✓ | *thin* → BYZANTINE, CAMSWARM |
| 5 | ✗ → Polymorph, ACTUARY's portfolio | ✗ → GRACE PERIOD, PARASITE, EXIT NODE, ACTUARY | ✗ → Halcyon | ✗ → Defrag | ✗ → the bridge, Underwriting desk | ✗ → ACTUARY |
| 6 | ✗ → Rootkit | ✗ → RING ZERO, BRICKWALL, BULKHEAD, BLACKOUT | ✗ → NULL CHOIR | ✗ → deep Deadlock | ✗ → Domain Controller | *thin* → RING ZERO |
| 7 | ✗ → Stealer | ✗ → PAY RUN, BIT BUCKET, GOLDEN PARACHUTE, SUMP | ✗ → GLASSJAW | ✗ → deep boards | ✗ → Sinkhole | ✓ |
| 8 | ✗ → Bootkit, three crew strains | ✗ → HALT AND CATCH FIRE, THUNDERING HERD, CORE DUMP, INIT | ✗ → the three crews | ✗ → Bit flip | ✗ → Firmware | ✗ → the endgame ladder |

## 4. Long goals: the chase

### 4.1 What's missing

What a level-50 player still lacks, beyond what's built (the collection log, Codex mastery, faction standing, boss
uniques, sets, daemons, KESSLER-FARM-00):

| Goal | Add |
|---|---|
| Collection log | The 14 designed bosses' uniques; the loot plan's next batches (15–20 and 33–38); a page a boss with your kills and its table |
| Codex mastery | The seven families' parts |
| Patches, consortium projects, supply orders | docs/economy.md |
| Boss uniques | The 14 designed bosses; each native boss's own two uniques (docs/genome.md 7.4) once lairs move by floor |
| Sets | The floor 3–8 bosses' pieces move to those bosses once they exist (a floor's lair boss drops them until then); flash ranks join the tier sets' sources |
| KESSLER-FARM-00 | *Proposed:* a second crew dungeon on floor 6 (crew bosses are data on raid.mjs) |
| Bedrock | 4.2 |

**Cosmetics** come only from achievements (CLAUDE.md, Unlocks; GAME_RULES *Achievements*). A new cosmetic is a new
achievement's reward.

### 4.2 Bedrock's endgame (*decided, to try*)

| Piece | What it is |
|---|---|
| **INIT** | The last Resident, PID 1, on Bedrock's deepest server at level 50. Its first fall is the end of the climb: a letter from wick, its uniques. |
| **Flash ranks** | A Mapped Bedrock server can be reflashed: every room back, one rank up. Each rank keeps the ones under it and adds one modifier (heat.mjs's, rewritten for rooms); each pays gear a level higher (past 50, up to 55) and more yellows. Nothing resets on a clock and nothing is lost by stopping. |
| **Reflash** | Optional, once all of Bedrock is Mapped: a new network seed (docs/genome.md 6). |

## 5. Priorities

Ordered for the most variety per hour of work, floors 2–4 first. S is a day or two, M about a week, L more.

| # | Build | Size | Fills |
|---:|---|:---:|---|
| 1 | **Lairs by floor** (3.1). *Built* | S | Floors 2–4: five different bosses from content that exists |
| 2 | **Floor holders** (3.1). *Built* | S–M | Floors 2–8 |
| 3 | **Botnet and Logic Bomb**. *Built* | M | Floor 2 |
| 4 | **The log sweep as a terminal room**. *Built* | S | Floors 2–8 |
| 5 | **Floor 2–4 bosses**: CENTRIFUGE, SHAKEDOWN, SHOULDER SURFER, CAMSWARM, BYZANTINE, with their uniques; the native bosses' own uniques | M | Floors 2–4 |
| 6 | **RAT** | L | Floor 3 |
| 7 | **Floor 2–4 signatures**: Router, Honeypot, Cold storage. *Built* | S each | Floors 2–4 |
| 8 | **Deeper chase and Cascade boards**. *Built* | S | Floors 3–8 |
| 9 | **Faction ground and the LANTERN–GLASSJAW side pair**; supply orders | S, then M | Floors 2–7 |
| 10 | **Fileless** | L | Floor 4 (it needs possession of room processes) |
| 11 | **Floors 5–8 bosses**, two or three a session: GRACE PERIOD, PARASITE, EXIT NODE, RING ZERO, BRICKWALL, BULKHEAD, BLACKOUT, PAY RUN, BIT BUCKET, GOLDEN PARACHUTE, SUMP, HALT AND CATCH FIRE, THUNDERING HERD, CORE DUMP | L | Floors 5–8 |
| 12 | **ACTUARY**: its portfolio, Handshake, and its boss | L | Floor 5 |
| 12b | **Polymorph, Rootkit, Stealer, Bootkit**, one a floor | L each | Floors 5–8 |
| 12c | **Five sets and 20 uniques a floor** (3.2's items table) | M a floor | Floors 5–8 |
| 13 | **New boards**: Defrag, Deadlock, Bit flip | M each | Floors 5, 6, 8 (each needs a generator and a solver) |
| 14 | **Bedrock**: INIT (five acts), flash ranks, Firmware; then the reflash | L | Floor 8 and after |
| 15 | **A second crew dungeon** | M–L | Floor 6, once crews are real |

*Proposed, S, anywhere in the list:* the **Ready** section in the map's List mode (1.3).

## 6. Decided (October 2026)

1. **Lairs by floor**: one lair a floor, its boss from that floor's band, your native boss on its own band's floor.
2. **Floor holders**: rolled per network from its roster; floor 5 is always ACTUARY's.
3. **Bedrock**: INIT and flash ranks, to try. Flash ranks pay gear past 50, up to 55.
4. **ACTUARY** reprices every 300 kills on its floor, never on a calendar.

## 7. Decided (November 2026)

1. **Floor 6 is the standard** for every floor's content (3.1).
2. **A new family a floor from 3**: RAT (3), Fileless (4), Polymorph (5), Rootkit (6), Stealer (7), Bootkit (8).
3. **Items:** five sets and 20 uniques a floor.
4. **ACTUARY** is a boss in three acts and retires UNDERWRITER. **INIT** has five acts, its table drawn as squares.
