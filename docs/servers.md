# Servers: rooms, floors and sockets

This is a design for review. Only R0, the first playable slice, is built (see 9.4). It replaces the breach campaign (docs/roguelite.md, docs/world.md) with a rebuild of the **old game**: the persistent network, your home server, runs into servers, invasions, hubs and factions. What changes is how a server plays. A server becomes a graph of **rooms**, the network becomes a stack of **floors**, and outpost buildings become **socket programs** you inject into rooms. Fights get one new universal rule (the **interrupt** at 50% and 25%), ten new virus families and **attack sets**, so the same family no longer fires on the same cycles every time.

The designer's brief, in their words:

> "1) I think the servers should have a similar design as the breach design, but instead be like different rooms similar to darkest dungeon. This will give much more depth to rooms and also give opportunity for things to spawn in those rooms consistently. It also allows progress to be measured much more simply.
> 2) I think we definitely need more virus depth and variety. I was also thinking that attack sets between the same virus types should be different. So for example, pulses or encryption doesn't always happen at the same time.
> 3) … a new mechanic that could partly simplify the tell system: At 50% and 25% HP of a component, you interrupt the upcoming attack on the cycle. This gives a lot more opportunity to add many more systems and complexity to the fights.
> 4) … I didn't like the roguelike breach system. I like having a network.
> 5) … the network should be much more asymmetrical. I think deeper networks should be on a 'z' axis with an entirely new network diagram. I think exit nodes are something that are located in the network diagram which allows you to go to the next network. This gives a 'tower-like' component to the game instead of it being flat.
> 6) Within a server map, there should be opportunities to 'socket' components in it, which can preserve the building system that we had. But, instead of the building affecting the server at a macro level, it would modify the server at the micro-level.
> Things to think about: increased drop rate of materials on the server; increased xp from enemies (for more xp/hr)."

**Already decided (designer, follow-ups).** A room is either an interactable or a fight, and a room can be empty when moving between rooms is a real Signal risk. Rooms form a branching graph. Rooms with viruses respawn over time, with timers that show when, and nothing is lost by being away. Progress is rooms cleared per server, and you can request help to finish a server. The interrupt cancels the attack landing **this cycle**, once per threshold per part (two a part a fight at most). Tells become the large mechanic you plan your interrupts around, and some complex fights have tells that need more than one thing. Floors stack on a z-axis, you can go back up, and exit nodes simply exist on each floor's diagram ("if you're not leveled correctly, you'll get destroyed"). A socket changes the mechanics of its whole server ("every time you kill a virus, you get an extra of its viral component"), you need its codebase, and you pay for it with materials you gathered, never by crafting. The new viruses add to Ransomware, Worm and Ghostroot. XP "still should be a grind."

**Decided after the first draft (designer).** Keys and vaults stay, as a routing decision: go find a key in a different part of the server and bring it back, at the cost of Signal. **Trace is cut**: *"Trace could feel bad because it goes against getting loot."* Danger is never tied to looting. In its place the **hunter is a server feature**: *"maybe instead there is a room where a hunter follows you at a certain speed within changing rooms and you need to plan your route or you'll encounter it"* (section 2.5). Server-type rules stay. On bosses, *"it's worth a test"*: the first slice ships all three boss options behind a switch (sections 3.4 and 9).

A word on words. The designer's *component* (a piece of a virus) is a **part** here, as in the style guide. **Component** means what a broken part drops (Pulse Kernel, Cipher Seed, Signal Key), the material the Harvester doubles. *Interrupt* already means stopping a cast with SIGINT, and this design widens it: an interrupt cancels whatever a part does this cycle.

## 0. The short version

| Question | Answer in this design |
|---|---|
| What is a server? | A graph of 8 to 18 **rooms**: fights, interactables (cache, terminal, vault, key, switch, rest, socket) and empty junctions. A fixed level, a kind (Mailhub, Relay, Mirror, Archive, Lab, the rogue kinds) and an author. Its Resident waits in `/core`, behind its vault. |
| How do you move? | On the server's room map (the terminal still works: a room is a directory). Every room you enter for the first time on a visit costs 3% of your max Signal. Rooms you've already walked this visit are free. A vault's key sits in another part of the server, so fetching it is a route you pay for in Signal. |
| What's the danger between rooms? | On medium and large servers from floor 2, a **hunter**: ICE that patrols a fixed loop or wakes and follows you, one room for every two of your moves, shown on the map with its next room. You plan your route around it, or you fight it. It only moves when you walk, never when you loot. There is no Trace. |
| What persists? | Everything. Cleared rooms count toward the server's **progress** (*Rooms 9/14*) for good. Fight rooms respawn on visible timers. Vaults, terminals and first clears happen once. |
| The interrupt? | Every part has ticks at 50% and 25% of its Integrity. Take it across one on a cycle its move is due and that move is cancelled. Each tick works once. A boss's core part turns its ticks into its phases instead (recommended option a). |
| Tells? | Fewer and bigger. A charge is answered by an interrupt on its cycle, a cast by SIGINT or an interrupt in its window, and new **linked tells** ask for two or three things at once. The burst rule (shares of a part's max, ◆ counting as a half or a third) goes. |
| Variety? | Ten new families (Trojan, Cryptominer, Wiper, Logic Bomb, Polymorph, Botnet, Rootkit, RAT, Stealer, Fileless) opening from level 4 to 26, each with two attack sets and its own threshold verb. Every virus rolls an **attack set** (when each part fires and which leads), weighted by its author. |
| The network? | Eight **floors**, each its own diagram with its own level band, shape, server mix and author. Each floor has an **exit node** that opens the floor below. You can go back up. Layers and `BANDS` become floors. |
| Buildings? | **Sockets**: rooms in a server where you inject a **program** whose codebase you know, paid in components, code and Exploits. Each program changes its own server's rules (16 in the catalogue). Outposts, plans, slots, bandwidth, stores and swarms go. |
| Materials and XP? | Parts drop their component 60% of the time on a server (35% at home), code drops double, and room kills pay 25% more XP. Levels per hour by band are targeted so 50 takes about 50 hours. |
| Breach build? | Kept: scripts, keys and vaults, switches, the hunter (reworked), server-kind rules (as room themes), caches and bait, the rest room, elites, rolled genomes, the heal cap, skill rules on gear. Cut: Trace, the breach mode and campaign, acts and gates, rewrites, heat, brokers and tokens. Parked: LOWLIGHT's room and the world turn. |
| First build? | One server as a room graph behind `?playtest=rooms`, with respawns, progress, keys, a hunter, the interrupt rule, attack sets for the three families, the Trojan, the Cryptominer and the Wiper, and a Resident whose boss rule switches between options (a), (b) and (c) so the designer can play each (section 9). |

## 1. Goals, and why fights got samey

**Why it got samey** (the designer: *"I'm facing the same mob over and over again and doing the same thing"*):

- **One server, one author, one body.** A breach was about 11 fights from the same author, and a wild virus was that author's body plus at most one mutation. Eleven CRYPTJACKs in a row.
- **One schedule per family.** Every ransomware Surge comes every 4 cycles from cycle 3, every Encrypt every 5 from cycle 4 (`FAMILIES` in data.mjs). The opening is solved once and repeated forever.
- **One answer per tell.** A charge asks for 50% of the part, or ◆2, on its cycle (docs/solo-tells.md). The answer is "keep Crack ready for that cycle", every fight.
- **Three bodies.** Third parts and strains each turn up in 4–9% of fights (docs/genome.md 1.1). Most of the time it is one of three shapes.
- **Drafting felt forced, and the map was the fun.** *"Having a map is more interactive than the terminal."* What worked in the breach was choosing a route on a map with keys, vaults and a hunter on it.

**Goals.**

1. A server is a place you learn, with rooms that spawn the same kind of thing every time, and a progress number that says how much of it you've done.
2. Every fight has a timing decision that isn't "hold a key": when to take a part across its tick.
3. Thirteen families, two to four attack sets each, so the same name can be a different fight.
4. A network you climb: floors with exits, each harder and shaped differently.
5. Building comes back, but small and local: it changes how the server you build in plays.
6. Lean. Each new piece replaces an old one (section 8). Nothing runs out while you're away.

## 2. Servers as room graphs

### 2.1 Room kinds

A room is a fight or an interactable, or empty. Each kind has a mark on the room map and a tag in `ls`.

| Room | Mark | Kind | What happens | Respawns |
|---|---|---|---|---|
| Process | ▣ | fight | A wild virus of the server's author at the server's level, rolled genome and attack set (4.1). | 15 min after it falls |
| Nest | ▦ | fight | A group: two viruses of the author, or one Botnet, as one fight (section 4.4). Pays 1.5× a kill. | 20 min |
| Elite | ◆▣ | fight | An elite (5.2× Integrity, two mutations, an extra tell). | 45 min |
| Guard post | ⛨ | fight | A guard or Kestrel ICE (Watchdog, Sentinel, Crawler, Shredder, Tracer, Bouncer). While the vault is shut, it holds the vault's **key** (2.4). | 20 min |
| Core | ♛ | fight | The Resident: the server's boss. Sealed until the vault is open. | Never on a held server |
| Den | ☠ | fight | Where the server's **hunter** lives (2.5). Some hunters sleep here, others start their patrol from it. | Its hunter is back every visit |
| Cache | ▤ | interactable | Credits, code and components, now and then a script. One in four is **bait**: `cat` it first, or pulling it costs 10% of your max Signal (the old `bait.dat`). | Refills 2 h after you take it |
| Terminal | ⌨ | interactable | A short scene with a choice: a log sweep (forensics.mjs), a password lock (the old runs' `unlock`, the password in another room's file), a half-written cron job, leaked creds, a sandbox sample, a `topology.map`. Each choice costs Signal or a fight, never a clock. | Once |
| Vault | ▥ | interactable | `open` it with its key, or `force` it without (15% of your max Signal). Holds blue or yellow gear a third of the time, or a script, plus a codebase (section 6.2), `payload.bin` and `signal.trc`. Opening it unseals `/core`. | Once |
| Switch | ⇋ | interactable | **Patch server** (every virus on the server has 1 ◆ less on every part) or **Lock the den** (the hunter stays in its den, 2.5). `fight` its watchdog ICE, or `splice` it for 8% of your max Signal. It lasts until you jack out. | Every visit |
| Rest | ☰ | interactable | `rest`: restores 30% of your max Signal. The hunter never comes in: it stops at the door. | Once a visit |
| Socket | ⊕ | fight, then interactable | A bus slot (`/dev/bus0`) guarded by a process. Clear it once and it's yours to build in (section 6). | Never, once cleared |
| Junction | · | empty | Nothing, except the cost of walking through it and the hunter walking through it too. | — |

Empty rooms earn their place because moving costs Signal (2.4) and gives the hunter its moves (2.5): a junction is distance, and distance is risk. A server is about a fifth junctions.

**Rooms spawn the same thing.** A fight room's family, author and attack set are fixed by the server's seed, so `/var/spool` on MERIDIAN-MX-14 is always a TOLLGATE ransomware on the Lockout set. Its mutation rerolls with every respawn (one at most, the designer's cap; two on an elite). One respawn in ten is a **rare spawn** (★): two levels up, three loot rolls, and it waits until you kill it.

### 2.2 How a server is built

The generator works from the server's seed, size, kind and floor, the same seed always giving the same server.

1. **Size** (the old outpost size roll): small 30%, medium 50%, large 20%, at 8, 12 and 16 rooms, +1 room per floor past the third (at most 18).
2. **Spine.** A path from the entry (`/`) to `/core`, 4 rooms long on a small server, 5 on a medium, 6 on a large. The vault is the room before `/core`.
3. **Branches.** The other rooms hang off the spine in branches of 1 to 3, so most rooms have 2 or 3 exits. A medium server gets one loop (two branches joined), a large one two.
4. **Placement**, then fill:

| Room | Small | Medium | Large | Where |
|---|---:|---:|---:|---|
| Entry, vault, core | 1 each | 1 each | 1 each | Spine |
| Guard post (the key) | 1 | 1 | 1 | On another branch, 3+ rooms from the vault |
| Den (the hunter) | 0 | 1 (from floor 2) | 1 | Where its loop or its chase crosses the way to the key |
| Socket | 1 | 2 | 3 | End of a branch |
| Elite | 0 | 1 | 2 | Not next to the entry |
| Rest | 0 | 1 | 1 | Mid-spine or one off it |
| Switch | 0 | 1 | 1 | A branch |
| Cache | 1 | 2 | 3 | Anywhere off the spine |
| Terminal | 1 | 1 | 2 | Anywhere |
| Process and nest | the rest of the fights | | | About half the rooms are fights |
| Junction | about a fifth | | | Where branches split |

**Kinds are room themes**, the breach's server-kind rules kept:

| Kind | Theme | Its rule | Its hunter |
|---|---|---|---|
| Mailhub | `/var/spool`, `/etc/postfix` | *Spam floods*: the rooms on its mail queue (a marked branch) bring a weak, quick Spam part to every fight | Patroller, on the queue |
| Relay | `/etc/bind`, `/var/named` | *Hops*: two shortcut links that skip a room each (drawn as curves). The hunter uses them too. | Patroller, through the hops |
| Mirror | `/srv/www`, `/private` | *Mirrors*: one cache is a mirror, with an elite behind it | Tracker |
| Archive | `/backups`, `/srv/tape` | *Deep storage*: two vaults and two guard posts with keys | Tracker, in the tape vault |
| Lab | `/lab`, `/tmp` | *Overheat*: from a fight's 10th cycle the rack burns you for 2% of your max a cycle and every part for 3% of its max | Tracker, faster (a room every move) once awake |
| Nest, Pit, Gauntlet (rogue) | as today | Every room is a fight (no vault, no core, nothing to take over). Nest: one family, strains twice as often. Pit: two levels up, a third elites, loot rolls twice. Gauntlet: clear every room in one visit for a bonus cache. Respawns in half the time. | None |
| Lair | the network's | A rogue server whose core is the floor's native boss, back an hour after it falls | None |
| Kestrel's servers | its data centres | Every guard post is ICE | Always one, on any size and any floor (where floor 1 meets its first) |

**Server traits** (the old site traits, fixed when found, 45% of servers) now read in rooms: **Rich** (caches pay double), **Legacy** (rare spawns twice as often), **Backbone** (+1 socket room), **Hostile** (fight rooms respawn twice as fast), **Hardened** (its viruses are Armored), and the old quirks: **Hoard** (caches +50%, guard posts Armored), **Nest** (an extra nest room with a brood sample), **Hidden** (a hidden room only `ls -a` or a `topology.map` shows).

### 2.3 What replaces the file system

A room is a directory, and the terminal maps straight onto the room map. The map is the main screen, and the prompt is still there for everyone who types.

| Command | On rooms |
|---|---|
| `ls` | The room you're in (its contents, who's here) and its exits as folders with tags: `spool/ [process · CRYPTJACK]`, `cron.d/ [terminal]`, `bus0/ [socket]`, `??/` for a room you can't see yet. `ls -a` shows a hidden room. |
| `cd <room>` | Move (a click on the map does the same). `cd ..` goes back toward the entry. |
| `cat`, `pull`, `pull all` | In caches, terminals and vaults, as today. |
| `open`, `force`, `rest`, `fight`, `splice`, `build` | The interactables' verbs. |
| `engage`, `back` | A fight room shows its virus's card when you walk in. `engage` fights it, `back` steps out (the move is spent). |
| `scan <room>` | A virus's genome card from the next room (1 Signal, free for an Infiltrator). |
| `wait` | Stay where you are for one move: the hunter takes its step, you spend nothing (2.5). |
| `map` (`tree`) | Draws the room graph you've seen. |
| `jack out` | Home, from any room, banking the pack. |

The five old layouts (`LAYOUTS` in run.mjs) go: their one idea each lives on as a terminal kind (the split key, the deep tree, three month logs, the honeypot `bait.dat`).

### 2.4 Movement, Signal and keys

Signal is the clock of a visit, as on the old runs: it carries from fight to fight, rests at home (20% a minute), and the Signal top-up costs credits. Heals inside a fight still stop at the Signal you brought in (the breach's heal cap), so walking and fighting add up. There is no Trace: nothing you take, open or read makes the server more dangerous.

| Thing | Signal |
|---|---|
| Enter a room for the first time this visit | 3% of your max (4% from floor 5) |
| Walk through a room you've been in this visit, or `wait` | free |
| A fight | what it costs |
| Force a vault without its key | 15% |
| Pull bait without reading it / splice a switch / fail a password | 10% / 8% / 5% |
| Rest | +30% |

**The key is a route.** The vault's key sits in a guard post on another branch, at least three rooms from the vault, often across the hunter's loop or past its den. Beat the guard and the key goes in your pack. Walk it back and `open`. The walk there and back is the price, paid in Signal and in moves the hunter gets. `force` skips the walk for 15% of your max at once. A key is good for one visit: jack out with it and it goes back to its post, guard and all. An Archive has two vaults and two keys, so the order you fetch them in is the plan. A Tunnel program (6.4) shortens the walk for good.

### 2.5 The hunter

The danger between rooms is a hunter ICE that moves through the room graph as you do. It is a server feature, like a server's kind rule: you see it, you learn its pattern, and you route around it or fight it.

| Rule | Detail |
|---|---|
| Where | One on every medium and large server from floor 2, and one on every Kestrel server (where floor 1 meets its first). None on small servers, rogue servers, lairs or SPRAWL-00. Its den is a room on the map. |
| What | A hunter ICE (Tracer, Bouncer or Watchdog body, Kestrel's) two levels over the server at twice a guard's Integrity: a hard fight, about an elite's. |
| **Patroller** (Mailhubs, Relays) | Awake from the start. It walks a fixed loop of 4 to 7 rooms, one room for every 2 of your moves. Its loop is drawn on the map as a dashed red line once you've seen any room of it. |
| **Tracker** (Mirrors, Archives, Labs, Kestrel) | Asleep in its den. It wakes the first time you walk into a room next to the den (those rooms carry a red edge, so you always know). Awake, it follows you by the shortest path, one room for every 2 of your moves (every move in a Lab). It loses you when you're 5 rooms away, and walks back to its den. |
| When it moves | Only when you walk into a room or `wait`. Never during a fight, a pull, an open, a read, a rest or a build, so looting costs it nothing and nothing is on a clock. |
| How it shows | Its glyph in its room, a red arrow to the room it steps into next, and a counter on the server strip (*hunter moves in 1*). Outside what you can see, you still see a red pulse at the edge of your fog when it's within two rooms. `ls` says it in words: *the hunter is two rooms off, in cron.d, heading for spool.* |
| Meeting it | If it steps into your room, or you step into its, you fight it. No back-off. Beat it and it drops a script and two components, and it's down for the rest of the visit. Lose and you're disconnected, as usual. |
| Rooms it won't enter | The rest room (it waits at the door), the entry, and a room with a Bulkhead (6.4). A Snare (6.4) holds it for 4 of your moves. A switch's **Lock the den** keeps a Tracker asleep, or a Patroller in its den, for the visit. |
| Respawns, keys, sockets | It isn't a room, so it never counts toward progress and doesn't respawn with the rooms: it's simply back at its den at the start of every visit. It never fights the viruses or clears rooms. Socket rooms you've built in are ordinary rooms to it, so a socket on its loop is one you'll meet it near. |
| Classes | An Infiltrator sees a Patroller's whole loop and a Tracker's next two rooms, and its `slip` walks past the hunter once a visit without a fight. |

The plan it asks for is the route: the key is past the den, the elite is on the loop, and the rest room is two junctions away. A Patroller is a timing puzzle (wait a move, then cross its loop behind it). A Tracker is a choice (wake it on purpose and lead it away from the vault, or never go near the den).

**Balance target.** A fight at your level in a room costs 20–30% of your Signal (today's 35–45% band is for a fight you rest after), an elite 45–60%, and the Resident wins about one fight in three, as today. A visit is 3 to 5 rooms before you jack out, rest a few minutes and come back (the 30-second reconnect wait stays). A medium server at your level takes about three visits, 45 to 60 minutes, to finish alone.

### 2.6 Fog

- You see the room you're in, the kind of every room next to it, and the shape (boxes and links, no kinds) one link further. An Infiltrator sees kinds one link further.
- `/core` always shows, with its Resident's name: bosses stay predictable.
- A fight room's family and author show once it's next to you. Its genes and attack set read ??? until you've met them (the codex, 4.1).
- What you've seen stays seen across visits. A `topology.map` terminal, or reaching 50% progress, draws the whole server.
- Nothing shows a percentage or a hint. You find out by going there.

### 2.7 Respawns and timers

Respawns run on real time, online or off. A room never respawns while you stand in it, and a room that respawns during your visit shows it at once.

- **Each room shows its timer** on the map (`↻ 12:40`) and in `ls`. The server's card shows the soonest one.
- **Nothing expires.** A rare spawn waits until you kill it. A full cache stays full. A week away costs you nothing: the server is just full again.
- **Levels.** A server keeps its level for good. Its respawns come at that level (a rare spawn two over), so you outgrow servers the way you outgrew the old ones, and the floor below is where the fights worth having are.

### 2.8 Progress, and finishing a server

**Progress is rooms cleared at least once.** A fight room counts when you first beat it, an interactable when you first use it (a cache taken, a terminal solved, a vault opened, a switch thrown, a socket cleared), a junction when you first walk into it. Respawns never take progress away. The server's card shows a bar and *Rooms 9/14*, and the floor map shows it as a ring around the server's node.

| Progress | What it gives |
|---|---|
| Each first clear | +50% of that fight's XP (a *First clear* row), and toward the server's trace links (section 5.4) |
| 50% | The whole room graph is drawn |
| Vault and core | **Taken over**: the server is yours (teal on the map), its core becomes a core socket (6.3) |
| 100%, **Mapped** | Once: an item roll two levels over the server, a codebase you don't have (6.2), its Resident's `core.dump` if you don't have it, and 5 kills' worth of XP. The server's node gets a solid ring. |

**Root** (root.mjs) keeps its five pips but counts respawned fight rooms you clear on a server you hold, instead of rotations (respawns are rotations now): Root 2 after 5, 3 after 15, 4 after 30, 5 after 50.

| Root | What it gives |
|---|---|
| 1 | Taken over: the core socket |
| 2 | `/root` opens: a stash room of the server's code (4 + level/4), refilled every 2 hours |
| 3 | It stops sending invasions |
| 4 | One more socket room |
| 5 | Its rare spawns come twice as often |

### 2.9 Requesting help

Finishing a server alone is the default, and help is there for the elite, the Resident or the room that keeps beating you. It reuses the crew and the consortium (consortium.mjs, crew.mjs) and adds one button.

- **Request help** sits on the server's card (and `help request <server> [room]`). It names a room, or *the rest* (every room you haven't cleared). One request is open at a time, and it has no timer: it stays up until it's filled or you cancel it.
- It goes to your consortium and your friends as a pager line (*nyx asks for a hand with the core on MERIDIAN-MX-14*). Someone online answers within a few minutes (simulated, as `crew sim` is today), and their chip appears on the server's card.
- **Help comes to your fight.** The helper joins your crew (up to three alongside you, as today) and fights in the room with you. They follow you (linked, as the crew column does) or split to clear another room in the same visit. A room counts for your progress when you're in the fight, or when a crewmate on your visit clears it.
- XP for a helper is by damage, as drop-ins are today. Each player rolls their own loot. A Mapped server pays the completion roll to everyone who helped clear it.
- Members' servers stay shared ground: their rooms are yours to fight in, and your progress there is your own.

### 2.10 The core and the Resident

`/core` is the far end of the spine, behind the vault. The Resident is the server author's boss at the server's level (1.4× Integrity, 1.1× on your first server), named on the card before you go. Beat it with the vault open and the server is taken over, as today. Lose and you're disconnected as usual. On a server you hold, `/core` is quiet and becomes the **core socket**, the only place core programs go (6.3). Lair cores, RELAY-KING's room on SPRAWL-00 and KESSLER-FARM-00's boss rooms work the same way with their own timers (an hour, 30 minutes and 6 hours).

### 2.11 Example: MERIDIAN-MX-14, first visit

A TOLLGATE Mailhub, medium (12 rooms), level 12, on floor 2. You're a level 12 Demolitionist with full Signal and two scripts.

1. `/` (entry): exits `spool/ [process · CRYPTJACK]`, `postfix/ [junction]`, `??/`. A dashed red line crosses `postfix`: the Mailhub's Patroller walks the mail queue, and its arrow says it reaches `postfix` in 2 moves. You go to `spool` (−3%). The CRYPTJACK is on the **Lockout** set: its Encryptor leads, encrypting on cycle 2. You take the Encryptor across 50% on cycle 6, when its next Encrypt is due, and it's cancelled. Win at 76% Signal. *First clear* +50%.
2. Back through `/` (free) and you `wait` once: the Patroller steps through `postfix` and on down the queue. You cross behind it (73%). `postfix` has three exits: a cache, a terminal and, on the far branch, the guard post with the key. You `cat` the cache first (bait, so you leave it) and walk three rooms to the guard post (64%). The Watchdog falls (46% Signal) and the key is in your pack.
3. The way back to the vault crosses the queue again. The hunter is one room off, so you go the long way through the rest room (88%, and it stops at the door). The vault: `open`. A blue Shell and the **Cron Spawner** codebase. `/core` unseals. DEADBOLT is named on it.
4. At 85% you jack out rather than take DEADBOLT on a walk past the queue. *Rooms 7/12*. Every room you cleared shows `↻ 14:xx`. The vault stays open, so next visit needs no key: you go for the elite, the socket and DEADBOLT, or you request help for DEADBOLT.

## 3. The interrupt

### 3.1 The rule

**Every part has two ticks, at 50% and 25% of its max Integrity. When damage takes a part across a tick on a cycle that part's move is due, its move this cycle is cancelled. Each tick works once a fight, whether or not anything was due.**

- **What's cancelled:** whatever the part does this cycle: its attack (Surge, Encrypt, Replicate, Scramble, a delivery, a volley, a wipe), a charge riding that attack, a cast finishing on it, a seal landing on it, the Mimic's playback on its beat. A patch (◆ coming back) isn't a move.
- **After a cancel**, the part's schedule goes on as if the move had landed: its next comes at its usual interval from now.
- **When it counts:** anything that damages the part before attacks resolve: your command, your daemons, burns and helpers, a crewmate, a socket's turret (6.4), Overkill's spill. The cycle order is unchanged (your command, daemons, burns and helpers, encryption, attacks, patches).
- **A wasted tick.** A part crossed on a cycle with nothing due spends that tick for nothing. One hit across both ticks spends both and cancels one move at most. Crossing them one at a time, on the right cycles, is the skill.
- **Never again.** A part healed back over a spent tick (a Patcher, a Hook, Block Reward) doesn't re-arm it. A rebooted twin keeps its spent ticks.
- **Small parts have none:** fragments, Zombies, Packages and anything with under 20 Integrity at level 6 scale. Every family's ordinary parts have them.
- **A family can change the verb.** Seven of the new families do something else at their ticks (vent, delay, surface, release, return, evict, shorten a fuse). The tick's hover says it in one sentence, and the codex learns it with the family.

### 3.2 How it plays with the rest of the fight

| Rule | With the interrupt |
|---|---|
| ◆ armor | A hit on ◆ does no damage, so it can't cross. Armor guards the ticks: strip first, then cross on the cycle you want. |
| Armor-piercing (Backdoor, Bypass, Meltdown, Zero-day) | Goes through ◆, so it can cross a tick on an armored part. Its long cooldown is what you plan. |
| Burst and big hits | Overload, Flood, a critical strike: big enough to cross from far above, often far enough to cross both ticks at once and waste one. |
| Burns and helpers | Count. Their ticks are on the board before they land, so a burn class knows the cycle its Inject will cross. Delay a burn's start, or let it cross on a quiet cycle and lose the tick. |
| Delays (Suspend, Jam, Rate Limit) | Move a part's move onto the cycle you'll cross its tick, or off a cycle you can't. |
| Critical strikes | Can cross a tick you meant to save for later. The damage preview shows the normal hit, and the crit range on hover. |
| Overkill (Breaker) | The spill onto the next part counts, so breaking one part can cancel the next part's move. |
| Wards, locks, caps (Lockbox, Mutex, Rate cap) | The lock soaks first and the cap limits a cycle's damage, so you work under them to line up the crossing. |
| Decoy mirror | On its beat your commands do nothing, so only burns and helpers can cross then. |
| Linked (v2, v3) | Unchanged. A cancel isn't a break, so nothing reroutes. |
| Crews | Anyone's damage counts. *Who takes the Encryptor across half on cycle 8* is the crew's call to make. |
| Enrage | An enraged part attacks every cycle, so any crossing cancels something. |

### 3.3 Showing it

- **Ticks on the bar.** Each part's Integrity bar has two notches at 50% and 25%. A spent one goes hollow and grey.
- **What's due this cycle.** In the Now column, every part with a move due shows what crossing takes: *cut ▸ 9* (deal 9), *cut ▸ ◆1 + 9* when it still wears armor, *cut ▸ —* when nothing you have does it this cycle. A planned `;` command shows *cuts Surge* on the cycles it will.
- **Hover a key** for its preview: *Crosses 50% · cancels Encrypt*, or *Crosses 50% and 25% · one tick wasted*.
- **When it lands:** the part flashes, INTERRUPTED floats up, a relay clack, and one log line (*You take the Encryptor under half. Its Encrypt is cancelled.*). A wasted tick floats *−tick* in grey.
- No tutorial text. The first time, a first-time tip points at the notch and nothing more.

### 3.4 Bosses: three options

A boss already has phases at a share of its total Integrity (`BOSSES` in data.mjs). The designer asked to discuss how ticks fit.

| Option | Rule | For | Against |
|---|---|---|---|
| **(a) Core ticks are phases** | The boss's core part (its signature part, marked ♛) has phase ticks at 50% and 25% instead of interrupts: taking it across one starts the next phase (re-arm, faster, spawn, Doppelganger). Its other parts interrupt as usual. | Phases stay fixed and readable, and you choose when they come: after you've broken the add, with your cooldowns up. One rule for every other part. Nothing new to count. | A boss's phases now follow one part instead of its whole bar, so each boss's numbers need a pass. |
| **(b) Every part interrupts** | Every boss part has normal ticks, phases stay on total Integrity, and the boss's big moves come as tells. You choose which tick to spend: on a plain attack or on a tell. | The purest version of "tells are the big plan". | Three or four parts give a boss six to eight cancels, most of its pressure. Bosses would need far more tells to stay hard. |
| **(c) Phases plus a budget** | Phases at 50% and 25% of total. Ticks interrupt, but the boss has a fight budget (three interrupts, any part), shown as pips. | Tight control of how much interrupting a boss allows. | A new counter, and a rule that works one way on bosses and another everywhere else. |

**Test all three first.** The designer: *"it's worth a test."* The first slice (R0, section 9) builds DEADBOLT under each option behind a switch (`&boss=a|b|c` on the playtest page, `developer bossrule a|b|c` mid-session), with the same seed, so the only thing that changes between tries is the rule. For (b), DEADBOLT's phases stay on total Integrity and it brings one more charge. For (c), the budget shows as three pips on its bar. The bots play all three too, so each comes with its win rate and Signal lost beside the designer's feel.

**Recommendation: (a).** It keeps bosses predictable, gives the player agency over phase timing, and adds no rule a wild fight doesn't teach. Enrage stays on the cycle count. Crew bosses (raid.mjs) keep their own framework: their parts have no ticks.

### 3.5 What tells become

The interrupt takes over the everyday job of a tell (stopping one big hit on one cycle), so tells become **the big moves you plan your interrupts around.** A part has two ticks for the whole fight, so spending one on a plain Surge is spending it away from the charge that lands three cycles later.

| Kind | Telegraph | Answer | If it lands |
|---|---|---|---|
| **Charge** | On the attack it rides, 3 cycles ahead | An interrupt on its part on its cycle, or a built answer (Suspend, Jam, Spoofed ACK, Hijack, Blackhole, Backfire). Soften it with ◆, a shield, Brace, Bulkhead. | ×2.5 to ×3 the plain hit, capped (45% of your max for a wild virus, 60% for a boss), then an after-effect |
| **Cast** | Its own cell, 3 cycles ahead, a 2-cycle window | SIGINT in the window, an interrupt on its part in the window, or a built answer | Its buff for 4 cycles (Double Extortion, Persistence, Self-Update, Call Home), then an after-effect |
| **Seal** | Its own cell, 2+ ahead | Strip the part before it lands | It re-arms with 1 ◆ more, and stripped parts get a ◆ back |
| **Beat** (Mimic) | Always on the board | Fire no direct hit on the beat, or interrupt the Mimic on its beat | Your command's direct hit comes back at you |
| **Linked** (new) | 4 cycles ahead, its chip listing two or three requirements with a check box each | All of them by its cycle | Each unmet requirement lands its share |

**Linked tells** are the complex fights' tell: elites from level 10, groups and Botnets, and every boss.

| Linked tell | Who | Needs | If it lands |
|---|---|---|---|
| **Cascade** | Elites, any family | Interrupts on two named parts on the same cycle | Both attacks land charged |
| **Quorum** | Botnet (elite and boss) | An interrupt on the C&C and 3 Zombies broken before it lands | Every Zombie fires three times |
| **Handover** | Nest rooms (two viruses) | SIGINT one virus's cast and interrupt the other's charge, on one cycle | Both land |
| **Failover** | Bosses with an add | Break the add and interrupt the core part's attack that cycle | The add comes back at full and the attack lands charged |

**Counts.** A wild virus brings no tells at levels 1–5 (the ticks are the lesson), one from 6 and two from 17, one live at a time below 17. An elite brings one more, a Linked tell from 10. A boss brings its fixed set plus one Linked tell. Reading still pays: an answered charge, cast or beat leaves its part Open for 2 cycles and adds a tenth of the kill's XP (up to 40%), and reading every tell rolls the loot once more. Ignoring still hurts: Offline, Corrupted and Hung by level, as today.

**What goes** from the tell system (tells.mjs, `TELL` in data.mjs): the burst (25/35/50% of a part's max by tier, 20% for elites and bosses), ◆ counting as half or a third of a burst, windows by tier, *half the burst lands it plain*, the charge's softening in step with what you dealt, and the bots' burst bookkeeping (`burstLeft`, `chitsLeft`, `chitValue`). One rule (cross the tick on the cycle) replaces all of it.

## 4. Virus variety

### 4.1 Attack sets

Every virus rolls an **attack set** when it spawns: when each part fires first, how often, and which part leads. Sets are named, so they are learnable. The board already shows when each attack lands, so a set needs no new UI. The codex learns sets the way it learns genes (??? until you've fought one, named once seen), and the virus card shows the set's name once seen.

- **Same pressure, different timing.** A set's damage over the first 20 cycles stays within 5% of its family's Standard set, so a set changes the plan, not the difficulty. Every set passes the spike cap (the worst three cycles at most 75% of a same-level player's max).
- **Seeded jitter.** On top of the set, each part's first attack moves by up to a cycle either way (never onto cycle 1).
- **Authors weight sets.** A room's set is fixed by the server's seed (2.1), so you learn the room, and the next server of the same family can be a different fight.
- **SPRAWL-00** only rolls Standard sets, so the first fights teach one rhythm per family.

| Family | Set | Pulse Node | Signature part | Leads | Favoured by |
|---|---|---|---|---|---|
| Ransomware | **Standard** | Surge every 4, from 3 | Encrypt every 5, from 4 | Pulse | everyone, SPRAWL-00 |
| Ransomware | **Lockout** | Surge every 5, from 5 | Encrypt every 4, from 2 | Encryptor | TOLLGATE |
| Ransomware | **Hammer** | Surge ×1.5 every 6, from 4 | Encrypt every 5, from 3 | Pulse | TOLLGATE, GLASSJAW |
| Ransomware | **Lockstep** | Surge every 4, from 3 | Encrypt every 4, from 5 | alternating every 2 | NULL CHOIR |
| Worm | **Standard** | Surge every 4, from 4 | Replicate every 4, from 3 | Replicator | everyone, SPRAWL-00 |
| Worm | **Bloom** | Surge every 5, from 5 | Replicate every 3, from 2 | Replicator | SWARMLINE |
| Worm | **Wave** | Surge every 4, from 3 | Replicate (two fragments) every 6, from 4 | Pulse | SWARMLINE, LANTERN |
| Ghostroot | **Standard** | Surge every 4, from 3 | Scramble every 4, from 2 | Scrambler | everyone, SPRAWL-00 |
| Ghostroot | **Ambush** | Surge ×0.75 every 3, from 2 | Scramble (3 cycles) every 6, from 5 | Pulse | PALEMASK |
| Ghostroot | **Flicker** | Surge every 4, from 4 | Scramble every 4, from 2 | alternating every 2 | NULL CHOIR, PALEMASK |

Strains and guards get two sets each in the same shape. A third part's attack (the Mirror's Splice, the Tripwire's Ping) keeps its own rhythm. The ten new families each come with two sets (4.3).

### 4.2 The new families at a glance

They are new **bodies** (genes.mjs, authors.mjs), not genes, so each rolls its author's genes on top within the budget and the compatibility rules (docs/genome.md 5.3), with one mutation at most. Each passes rule 4 (an answer in every kit at its level) before it ships. Numbers below are at level 6 scale, like the `FAMILIES` table, and grow 4% a level.

| Family | Stem | Opens (level, floor) | Authors | Code | Components | Threshold verb |
|---|---|---|---|---|---|---|
| Trojan | TROJAN | 4, floor 1 | SWARMLINE, LANTERN | Worm | Courier Packet, Loader Stub | Courier: cancel. Loader: delay the next delivery. |
| Cryptominer | XMRIG | 6, floor 1 | GLASSJAW, TOLLGATE | Cipher | ASIC Die, Heat Pipe | Rig: vent (reset ramp and heat) |
| Botnet | MIRAINET | 8, floor 2 | SWARMLINE | Worm | C2 Beacon, Zombie Node | C&C: cancel a volley |
| Wiper | SHAMOON | 10, floor 2 | TOLLGATE, GLASSJAW | Cipher | Zero Block, Degauss Coil | cancel (a wipe) |
| Logic Bomb | TIMEBOMB | 12, floor 2 | TOLLGATE | Cipher | Trigger Pin, Fuse Wire | Trigger: cancel. Payload: shorten the fuse. |
| Polymorph | SHAPESHIFT | 14, floor 3 | PALEMASK, NULL CHOIR | Kernel | Morph Engine, Mutation Key | cancel, and lock its form 2 cycles |
| RAT | DARKCOMET | 16, floor 3 | NULL CHOIR, GLASSJAW | Kernel | Client Stub, Remote Shell | Operator: release your key |
| Rootkit | KERNELHOOK | 18, floor 3 | PALEMASK, NULL CHOIR | Kernel | Driver Stub, Syscall Table, Kernel Hook | surface the next part |
| Stealer | INFOSTEAL | 22, floor 4 | GLASSJAW, LANTERN | Cipher | Exfil Pipe, Session Cookie | Siphon: return what it stole |
| Fileless | LOLBIN | 26, floor 4 | NULL CHOIR, PALEMASK | Kernel | Memory Image (from the room) | evict it from that process |

Code stays three kinds, by lineage: Cipher for the leverage families, Worm for the spreading ones, Kernel for the hiding ones. Invasions can be any family but the Fileless, which lives only in rooms.

### 4.3 The ten families

**1. Trojan. Don't hit the box.**

| Part | Integrity | ◆ | Move |
|---|---:|---:|---|
| Courier | 34 | 1 | Drop 10, and delivers a Package |
| Loader | 30 | 2 | none. While it lives, any damage to a Package unpacks it. |
| Package | 16 | 0 | none. Unpacks on its own 5 cycles after delivery (a countdown on it). At most 3. |
| Dropper (from an unpacked Package, two each) | 14 | 0 | Spray 5 every 2 |

- Sets: **Express** (a Package every 3 from 2, Drop every 5) and **Freight** (a Package every 4 from 2, Drop every 3).
- Once the Loader is broken, Packages are inert boxes: break one for a Payload Box (credits and a component).
- Ticks: the Courier's cancel its Drop or that cycle's delivery. The Loader's each delay the next delivery by 2 cycles. Packages and Droppers have none.
- The lesson: area hits and spreading burns unpack every box on the board. Kill the Loader first, or hit nothing but the Courier until you can.

**2. Cryptominer. Let it cook, or vent it.**

| Part | Integrity | ◆ | Move |
|---|---:|---:|---|
| Rig | 44 | 1 | Hash every 2 from 2: 4, then +2 each time it lands (the ramp) |
| Cooler | 26 | 1 | none |

- **Heat.** The Rig gains 10 heat a cycle while the Cooler lives, 25 once it's broken (and every Hash lands 50% harder). At 100 it overheats: it stops hashing and burns itself for 12% of its max every cycle until it breaks.
- Sets: **Cold rig** (ramp +3, heat ×0.8: burns out around cycle 13) and **Hot rig** (ramp +1, heat ×1.4: around cycle 8).
- Ticks on the Rig **vent** instead of cancelling: its ramp drops back to 4 and its heat to 0. That saves you from the ramp and saves it from burnout.
- The plays: shield up and wait for burnout (Bastion), break the Cooler and race it (Breaker), or vent at the top of the ramp and pay for it with a longer fight.

**3. Wiper. Hold your big key.**

| Part | Integrity | ◆ | Move |
|---|---:|---:|---|
| Eraser | 34 | 1 | Zero 12 every 4 from 3 |
| Degausser | 38 | 2 | Wipe: damage, and a key off your bar |

- Sets: **Targeted** (Wipe 6 every 5 from 4: your strongest ready skill is wiped for 3 cycles) and **Rolling** (Wipe 4 every 3 from 2: the skill you used last, for 2 cycles). Key 1 and SIGINT are never wiped.
- A wiped key shows blank with *WIPED 3* in red: it can't be pressed, and its cooldown doesn't tick. It reuses the Offline after-effect (`lockLast`).
- Ticks: the Degausser's cancel a wipe. (The designer's *Shredder*, renamed so it doesn't share the SHREDDER guard's name.)
- The lesson: fire your big key just after a wipe, or keep a tick on the Degausser for the cycle it would take it.

**4. Logic Bomb. Count your hits.**

| Part | Integrity | ◆ | Move |
|---|---:|---:|---|
| Trigger | 30 | 1 | Tick 9 every 3 from 2 |
| Payload | 70 | 1 (2 from 10) | none. A **fuse** on its bar. |

- Sets: **Contact** (an 8-hit fuse that counts your command hits on the Payload, a hit on ◆ included) and **Timed** (a 6-hit fuse that counts every hit on it, burn ticks and helper hits too, and winds back up by 1 each cycle, to 6).
- At 0 it detonates: 35% of your max Signal, and the Payload is gone with its loot. The fight goes on against the Trigger.
- Ticks on the Payload shorten the fuse by 2 and never interrupt. The Trigger's cancel as usual.
- The lesson: Contact wants few big hits or burns. Timed wants one big hit a cycle and no helpers.

**5. Polymorph. Hit the other one.**

| Part | Integrity | ◆ | Move |
|---|---:|---:|---|
| Engine | 36 | shared | Surge 12 every 4 from 3 |
| Mutator | 36 | shared | Rewrite 8 every 5 from 4 |
| Shared armor | | 3 (4 from 20) | sits on one part at a time |

- At the end of each cycle its ◆ move to the part you hit last. Sets: **Reactive** (every cycle) and **Drifting** (every other cycle, and each move shifts both parts' next attacks a cycle, earlier then later, shown on the board).
- Ticks cancel as usual and **lock its form** for 2 cycles: the ◆ stay where they are.
- The lesson: alternate. The part you didn't hit last cycle has no armor now. Burns on one and commands on the other work too.

**6. Botnet. Farm it or end it.**

| Part | Integrity | ◆ | Move |
|---|---:|---:|---|
| C&C | 46 | 2 | Volley: every Zombie fires at once |
| Zombie (6; 7 from 15; 8 from 25) | 8 each | 0 | its share of the volley |

- Sets: **Barrage** (a volley every 4 from 4, each Zombie 3) and **Drizzle** (every 2 from 2, each Zombie 1, scaled).
- Break the C&C and the Zombies scatter: the fight ends safely, but pays only the C&C's share (0.6 of a kill) and none of the Zombies' drops. Clear the Zombies first and it pays 1.5 kills, a Zombie Node from each at 40%.
- Ticks: the C&C's cancel a volley. Zombies have none.
- The lesson: area builds farm it. Anyone low on Signal ends it.

**7. Rootkit. Find the Hook.**

| Part | Integrity | ◆ | Move |
|---|---:|---:|---|
| Driver | 34 | 1 | Surge 12 every 4 |
| Syscall | 34 | 1 | Hijack 8 every 3 |
| Hook | 28 | 1 | Heals every hidden part by 10% of its max every 3 |

- One part is **surfaced** at a time. The others are hidden in the kernel: they can't be targeted or hit (area hits miss them, burns on them pause), and their attacks land as veiled ??? chips.
- Sets: **Hook last** (Driver, Syscall, Hook) and **Hook second** (Syscall, Hook, Driver).
- Ticks: taking the surfaced part across one sends it back down and surfaces the next (no cancel). Breaking it surfaces the next too. A healed part's spent ticks stay spent, so it can't dive again at a tick it already passed.
- The lesson: every tick brings the Hook closer. Break the Hook and nothing heals.

**8. RAT. Don't press the red key.**

| Part | Integrity | ◆ | Move |
|---|---:|---:|---|
| Client | 34 | 1 | Surge 11 every 4 |
| Operator | 38 | 2 | Takeover every 6 from 3: hijacks one of your keys |

- Sets: **Profiler** (your most-pressed skill this fight) and **Roulette** (a random ready skill, picked again every 3 cycles). One key at a time, never key 1 or SIGINT.
- A hijacked key glows red with *HIJACKED*. Pressing it heals the virus's most damaged part by what the skill would have dealt.
- Ticks: the Operator's release your key (and cancel that cycle's move). Breaking the Operator releases it for good.
- The lesson: your rotation is the weakness. Play off-script until you've taken a tick.

**9. Stealer. Have nothing to steal.**

| Part | Integrity | ◆ | Move |
|---|---:|---:|---|
| Exfil | 34 | 1 | Surge 12 every 4 |
| Siphon | 40 | 2 | Steal |

- What it steals: your shield (it becomes a shield on the Siphon), your Momentum and other stacks (+10% to its attacks a stack), your burns on its parts (they move onto you), your helpers (they turn and hit you until they expire). What it holds shows as chips on the Siphon.
- Sets: **Smash and grab** (every 5 from 4, everything) and **Pickpocket** (every 2 from 2, the one thing worth most).
- Ticks on the Siphon return everything it holds. They don't cancel.
- The lesson: every class has something to lose here (the Bastion's shields, the Breaker's Momentum, the Infiltrator's burns, the Operator's helpers). Lay them down after the steal, or take them back at a tick.

**10. Fileless. Evict it, don't break it.**

- It has no parts of its own. The room has 3 processes (4 from 34), named for its subsystem (in `/etc/cron.d`: crond, atd, logrotate), each 36 Integrity and ◆1, inert until possessed. The Fileless possesses one (two from 30) and attacks with it: Surge 12 every 4, or the process's own move.
- Sets: **Hop** (it jumps to a new process each time it's evicted) and **Nest** (it stays a cycle longer in each, and its first attack there comes a cycle sooner).
- Ticks **evict** it: that process goes clean (inert for the rest of the fight) and the Fileless jumps to an inert one, named on its chip, the next cycle. With nowhere left to jump, it's purged and the fight is won.
- Breaking a possessed process cleans it too, but every point past its remaining Integrity **spills into the room** and burns 1% of the room's loot (shown as a pile bar over the board). Overkill's spill burns loot here instead of the next part.
- The lesson: precise crossings, not burst. The Demolitionist's whole kit fights against itself.

### 4.4 Nest rooms: two viruses at once

A nest room holds two viruses of the author as one fight: their parts share one board, each keeps its own body's rules, and the kill pays 1.5 kills. It is where Linked tells live (Handover) and where interrupts are scarcest: two bodies, more moves due, the same two ticks a part. The engine already fights many parts (fragments, a boss's extras, Botnet's Zombies). Mixing two bodies' rules on one board is the new work (phase R4).

### 4.5 Who writes what

| Author | Old families | New families | Sets it favours |
|---|---|---|---|
| TOLLGATE | Ransomware | Cryptominer, Wiper, Logic Bomb | Lockout, Hammer, Targeted, Contact |
| SWARMLINE | Worm | Trojan, Botnet | Bloom, Wave, Express, Barrage |
| PALEMASK | Ghostroot | Polymorph, Rootkit, Fileless | Ambush, Flicker, Hook last, Nest |
| NULL CHOIR | Ghostroot builds | Polymorph, RAT, Rootkit, Fileless | Lockstep, Flicker, Roulette, Hop |
| GLASSJAW | any | Cryptominer, Wiper, RAT, Stealer | Hammer, Hot rig, Profiler, Smash and grab |
| LANTERN | light | Trojan, Stealer | Wave, Freight, Pickpocket |
| Kestrel | ICE | none | its guards' sets |

A floor's holder (5.3) decides most of its families, so floor 2 under TOLLGATE plays nothing like floor 2 under SWARMLINE on another network.

## 5. The network as floors

### 5.1 The model

The network is a stack of **floors** going down. Each floor is its own diagram, with its own level band, shape, size, server mix and holder. The map shows one floor at a time, with a floor panel down its side (like a lift's buttons: the floors you've opened lit, the next one dim, the rest dark).

- **Travel is free, discovery isn't.** From home you can connect to any server you've located on any floor you've opened. The links matter for finding servers, not for reaching them.
- **Exit nodes.** Each floor has an exit node (two from floor 4), a ▼ glyph on the far side of the diagram from the floor's entry. It shows from the moment you arrive, lit through the fog, so you always know where down is. It hangs off one or two servers. Locate one of them and the exit is yours: connect to it and the floor below opens. No fight, no key: the floor below is its own warning (its band on the exit's card, coloured against your level).
- **Going back up.** Every floor's entry node links up to the floor above, always open, and the floor panel takes you anywhere you've been.
- **Your floor** is the deepest floor whose band holds your level. It replaces *your layer* wherever the rules use it.

### 5.2 The floors

| Floor | Name | Levels | Shape | Servers | New here | On it |
|---:|---|---|---|---:|---|---|
| 1 | The Sprawl | 1–8 | A star around SPRAWL-00 | 10 | the three families, Trojan, Cryptominer | SPRAWL-00 (the entry), Halcyon's and Kestrel's hubs, KESSLER-FARM-00 (from 7) |
| 2 | Backhaul | 7–14 | A long trunk with spurs | 12 | strains, Kestrel ICE, Botnet, Wiper, Logic Bomb | LANTERN's and GLASSJAW's hubs, a lair |
| 3 | The Stacks | 13–20 | A lattice with holes | 14 | Polymorph, RAT, Rootkit | NULL CHOIR's hub, a lair |
| 4 | Coldline | 19–26 | A ring around a dead centre | 14 | Stealer, Fileless | a lair, two exits |
| 5 | Deep Core | 25–32 | Two halves joined by one bridge | 16 | ACTUARY's floor (26) | a lair |
| 6 | Kernel Space | 31–38 | A deep tree | 16 | | a lair |
| 7 | The Sink | 37–44 | A funnel | 18 | | a lair |
| 8 | Bedrock | 43–50 | Scattered islands | 18 | | a lair, no exit |

- **Asymmetry.** Floors differ in shape and size, and within a floor a server's level rises with its distance from the entry (the near side at the band's floor, the exit's neighbours at its top). Server kinds lean by floor (Mailhubs and Relays near the top, Archives and Labs deeper), rogue servers are about one in six, faction servers one in eight, as today.
- **A floor is a sector.** The genome's sectors (docs/genome.md 4.2) were layers. Now each floor has a **holder**: the author that writes most of it, from the network's roster. Floors hand over when finished, as the designer decided for sectors.
- **The lair** is one rogue server per floor from floor 2, its core holding a native boss in that floor's band (genome's "a room per band" becomes a lair per floor).
- **Bedrock** has no exit. What sits at the bottom is open question 9.

### 5.3 How the old pieces fit

| Piece | On floors |
|---|---|
| **Home** | Not on a floor. It sits above the stack, and every connection starts there. Jack out from any room goes home. |
| **Layers and `BANDS`** | Replaced by floors and their bands. `SERVER.locationLevel` reads the floor and the server's place on it instead of your level, so a server's level is fixed when the floor is generated. |
| **Finding servers** (the hidden network) | Every server links to its neighbours on its floor's diagram. A linked server you haven't located shows as **?** with its link. Its trace (the old game's word for finding a server, not the cut Trace meter) fills to 100% to locate it: each first clear of a fight room on a linked server +10%, its vault's `signal.trc` +50%, a Relay program +15% a clear (6.4), a trace injector +30%. Family leads (a kill tracing its family's origin) go: leads come from rooms. |
| **Invasions** | Unchanged in kind and in the wall. Any server you've connected to and don't hold at Root 3 can send them, at its level. Travel is 2 minutes, plus 1 a floor. The wall's base is the highest level among those servers, less 2. |
| **Hubs** | On the floors in the table, located by tracing as today. Halcyon's is there from the start. |
| **Faction servers** | On every floor, in their colour. Opening one's vault takes it from the faction, as today. |
| **SPRAWL-00** | Floor 1's entry: six rooms of strays, respawning every 90 seconds, shared with everyone online. RELAY-KING keeps its room. |
| **KESSLER-FARM-00** | A floor 1 server whose rooms are its folders (it was already built that way). Crew only, as today. |
| **The consortium** | Each member's servers sit on their own floors. You can connect to a member's server on a floor you've opened yourself. Trunk lines link home servers, as today. |
| **Networks** (the signature) | Unchanged. The lean, native strain, native uniques and lair bosses read the network, and a floor reads its holder. |
| **Reflash** | A reflashed network rebuilds every floor around your level, as genome 14 says. |

## 6. Sockets

### 6.1 The model

A **socket room** is a bus slot in a server, guarded on your first visit by a process. Clear it once and it's yours: click it and **Build** opens a panel of every program whose **codebase** you know, each as a card (what it does, what it costs, what you hold). Pick one and it's injected at once. The room then shows the program's glyph on the map, and the program changes how its server plays for as long as it runs.

- **Scope: its server.** A program never reaches another server (the Relay's pings to linked servers are the one exception). That is the designer's *micro, not macro*.
- **Any server.** Sockets work on servers you don't hold. Taking the server over adds its core socket, where the bigger programs go.
- **One of each** program per server.
- **Instant.** No build queue and no real-time builds: you're injecting code, not pouring concrete.
- **Uninstall** in the room between fights: free, and half of the components and code come back. Swapping is uninstall then build.
- **No upkeep, nothing breaks.** A program runs until you take it out. Nothing comes to knock it over.

| Server | Socket rooms |
|---|---:|
| Small | 1 |
| Medium | 2 |
| Large | 3 |
| Backbone trait | +1 |
| Root 4 | +1 |
| Held server | + the core socket (core programs only) |

### 6.2 Codebases

You need a program's **codebase** to build it, once, and then you can build it anywhere. You start knowing the **Harvester**.

| Source | What it gives |
|---|---|
| A server's vault | One in three holds a codebase you don't know (your first vault always does) |
| A Resident's first fall | A codebase from its author's list |
| A server Mapped (100%) | A codebase you don't know |
| Faction hub shops | Each sells its own, by rep tier: Halcyon (Harvester, Defrag Bay, Cache Mill), Kestrel (Snare, Bulkhead, Sentry Turret), LANTERN (Relay, Listening Post, Tunnel), GLASSJAW (Honeytoken, Patch Injector, Code Siphon), NULL CHOIR (Lure, Cron Spawner) |
| A lair boss's first fall | A core codebase (Range, Jump Host) |

A codebase you already know banks as 4 components. The Build panel shows only codebases you know, like the Craft page did: no ??? list of what you're missing.

### 6.3 Costs

Programs are paid with what you gather: **components** (most costs take any, and some ask for named ones, as salvage did), the server's **code**, and **Exploits**. Core programs also take a **boss core**. Nothing is crafted.

| Weight | Components | Code (the server's) | Rare | Rough play time on that floor |
|---|---|---:|---|---|
| Light | 20 any | 15 | — | 30 minutes |
| Medium | 40, 10 of them named | 30 | 1 Exploit | 1.5 hours |
| Core | 80, 20 of them named | 60 | 3 Exploits, 1 boss core | 4 hours |

Costs grow by a quarter a floor past the first (×1.25 on floor 2, ×2.75 on floor 8), since drops don't grow with level. Named components are the server's own families' (a Cipher Seed on a ransomware server, a Heat Pipe on a Cryptominer one), so building on a server is paid by fighting there. The pay picker from salvage.mjs stays: it opens filled with the plain components first and Build lights up once it's covered.

### 6.4 The catalogue

Sixteen programs. Each line is its tooltip.

| # | Program | Was | Weight | What it does |
|---:|---|---|---|---|
| 1 | **Harvester** | new (the designer's example) | Light | Every virus you kill on this server drops 1 more component, from the part you broke last. |
| 2 | **Cron Spawner** | new | Light | Fight rooms on this server respawn twice as fast. |
| 3 | **Code Siphon** | Code Siphon | Light | Every fight room you clear on this server pays 3 more of its code. |
| 4 | **Cache Mill** | Data Miner, Scrap Mill, Credit Skimmer | Light | Caches on this server refill twice as fast and pay 50% more. |
| 5 | **Defrag Bay** | new (the rest room) | Light | Turns this room into a rest room. Restores 25% of your max Signal. Usable once per visit. |
| 6 | **Tunnel** | new (the shortcut) | Medium | Links this room to the server's entry. Moving through the link costs no Signal, and the hunter can't use it. |
| 7 | **Snare** | IDS | Medium | A hunter that walks into this room is held there for 4 of your moves. Works once per visit. |
| 8 | **Bulkhead** | Firewall Node, Citadel | Medium | The hunter can't pass through this room. Fights in this room and the rooms next to it start with a shield of 10% of your max Signal. |
| 9 | **Sentry Turret** | Sentry Daemon | Medium | In fights in this room and the rooms next to it, deals 6% of a part's max Integrity to the part whose move lands soonest every 3 cycles. Its hits count toward interrupts. |
| 10 | **Patch Injector** | the breach's Patch server switch | Medium | Viruses on this server respawn with 1 ◆ less on every part. |
| 11 | **Listening Post** | Listening Post | Medium | Kills on this server roll for the unique you name twice as often, wherever it can drop here. |
| 12 | **Lure** | docs/server-types.md's Lure | Medium | Fight rooms on this server respawn as the family or strain you name, one you've met. |
| 13 | **Honeytoken** | Honeytoken | Medium | Viruses on this server respawn a grade higher, and 1 in 4 as an elite. Kills here pay 50% more XP and roll for loot once more. |
| 14 | **Relay** | the Relay item, the Route Logger | Medium | Pings the unknown servers linked to this one. Every fight room you clear here traces each of them 15% more, and it flags the one a contract points at. |
| 15 | **Range** | docs/server-types.md's Range | Core | Holds a solo boss you've beaten in this room, with its own loot table and pity. It comes back an hour after it falls. |
| 16 | **Jump Host** | new | Core | Connecting to this server starts you in any room you've been in. |

**Where they go matters.** The turret and the Bulkhead cover their room and its neighbours, the Tunnel links one room, the Defrag Bay rests in one place. On a big server a socket at the end of a long branch is a different program from one beside the entry.

**Stacking on one server** is the build: a Lure, a Cron Spawner and a Harvester make one server your farm for one strain's components. A Honeytoken, a Turret and a Bulkhead make a hard server you can survive. A Snare and a Bulkhead on the hunter's loop make its server a quiet one. A Listening Post and a Honeytoken make a unique hunt.

### 6.5 What replaces outposts

| Was | Now |
|---|---|
| Outposts (a held server with buildings) | Any server with programs in its sockets |
| 13 buildings and two specialisations | 16 programs (6.4) |
| Plans (15% of vaults, Halcyon's shelf) | Codebases (6.2) |
| Building slots by size, +1 Backbone, +1 Root 4 | Socket rooms by size, the same +1s |
| Bandwidth (network-wide) | Gone. Programs are local, so there's nothing to budget across servers. |
| Real-time builds, the queue of two, *Finish now* | Instant |
| Production, stores, collecting, the Scheduler | Gone. Programs pay out as you play on the server. |
| Natives noticing outposts, swarms, lockdowns, regrowth, Retake | Gone. A program has nothing to steal and nothing to defend. |
| Outpost firewalls | Gone. The home wall stays. |
| Site traits | Server traits (2.2) |
| Edge Router, Scheduler, Architecture | Gone |
| The consortium dividend | Gone with production (open question 7) |

## 7. Materials and XP

### 7.1 Materials

| Material | Kinds | From | On a server | Elsewhere (home, invasions) | Spent on |
|---|---|---|---|---|---|
| **Components** | One per part kind (about 45 with the new families) | A broken part | 60% a part, elites 100% and 1 more, Harvester +1 | 35% a part, as today | Programs |
| **Code** | Cipher, Worm, Kernel | Kills by lineage, caches, vaults, `/root` | 2 + level/8 a kill | 1 + level/10 a kill, as today | Programs, firewall tiers, hub markets, donations |
| **Exploits** | one | Room kills 6%, elites 15%, vaults 25% | | home kills 4%, as today | Medium and core programs, the wall's top tiers |
| **Boss cores** | One per boss (*DEADBOLT core*) | A boss's first fall, then 20% a kill | | | Core programs |
| Credits | | Caches, vaults, contracts, the retainer | | | Signal top-ups, the wall, hub shops, codebases at hubs |
| Signatures | | Invasions only | | | The wall, as today |

Components replace salvage. Plain Scrap goes (nothing scraps into it any more). Hubs' markets trade components as a ware, priced by rarity, so a surplus of Zombie Nodes is credits.

### 7.2 XP

The designer: more XP an hour from enemies, but *still a grind*. The plan is to pay more per room kill and keep the level curve, then measure that the hours land on the targets below.

| Source | XP |
|---|---|
| A room kill | 1.25× a kill (20 + 10 × level), the room bonus |
| A first clear | +50% of that fight |
| Elite, nest, rare spawn | 3×, 1.5×, 2× |
| Resident | 4× (with the takeover's 1.5 kills, as today) |
| Mapped | 5 kills |
| Home and invasion kills | As today |
| Reading tells, Behind, Rested, Fresh, Hot strain, Fast kill | As today |

Level L to L+1 stays at 5 + 1.2 × L kills of your level. At about 30 room fights an hour (a fight is 1 to 2 minutes, and walking and resting fill the rest), that lands on these targets:

| Levels | Levels an hour | Minutes a level | Hours to the band's top |
|---|---:|---:|---:|
| 1–5 | 5 | 12 | 1 |
| 6–10 | 3 | 20 | 2.7 |
| 11–20 | 1.6 | 38 | 9 |
| 21–30 | 1 | 60 | 19 |
| 31–40 | 0.7 | 86 | 33 |
| 41–50 | 0.5 | 120 | 51 |

About 50 hours to level 50, and every class within 1.25× the fastest's time to 30 (the progression target). Today's climb reaches 30 in 17 to 35 hours by class, so the curve stays as long while the hour feels fuller. The catch-up target (6 + 2.2 × level minutes) already matches this table, so *Behind* needs no change. `roomsim.mjs` checks it (section 9).

## 8. Keep, cut or change

### 8.1 The old game

| System | Decision | Notes |
|---|---|---|
| Home server, Signal, rest, top-ups | Keep | |
| Runs: connect, jack out, the pack, banking | Keep | A run is a visit to a server's rooms |
| The five layouts and the file system | Change | Room graphs (2.2). Their ideas live on as terminal kinds. |
| Guards and Kestrel ICE | Keep | As guard posts that carry keys, and the hunter |
| Locked folders and passwords | Change | Keys and vaults. A password lock stays as one terminal kind. |
| Break-in Trace and the Tracer at 100 | Cut | Danger is never tied to looting. The hunter is a server feature (2.5). |
| Clean job | Cut | Progress is the reward |
| Quirks (Hoard, Nest, Hidden) | Change | Server traits |
| Rogue servers (Nest, Pit, Gauntlet) | Keep | All-fight room servers |
| KESSLER-FARM-00, crew bosses | Keep | Its folders are rooms |
| Lair and native bosses | Change | A lair per floor |
| SPRAWL-00, RELAY-KING | Keep | Floor 1's entry |
| Leads, the hidden network, relays, injectors, trace records | Change | Tracing along a floor's links (5.3). The Relay is a program. |
| Log sweep | Keep | A terminal room |
| Root access | Change | Respawns replace rotations, and Root counts clears (2.8) |
| Outposts, buildings, plans, slots, bandwidth, stores | Cut | Sockets (6.5) |
| Natives, swarms, lockdowns, regrowth, Retake | Cut | |
| Invasions, the wall, filters, signatures, harden.sh, captures | Keep | Sent by servers you've connected to |
| The thief invasion | Cut | No stores to steal |
| The saboteur invasion | Change | It switches off your best program on one server until you kill it |
| Services (Route Logger, Build Farm, Edge Router, Scheduler) | Cut | The Route Logger's job is the Relay's |
| Architecture | Cut | |
| Server memory | Cut | Already off |
| The Craft page: compiling, Zero-days, crafted filters, salvage | Cut | Gear and filters come from drops, vaults, captures and shops. Salvage becomes components. |
| Daemons | Keep | |
| Mail, contracts, Halcyon standing, the retainer | Keep | Contracts point at rooms: clear N rooms, map a server, take one over, recover a vault's file |
| Factions, hubs, markets, shops, donations | Keep | Hubs on floors. Shops sell codebases and scripts. Payloads stay off. |
| Consortium, crew, presence | Keep | Plus help requests (2.9). The size ladder re-points (Linked: +10% components on members' servers; Grid: +1 socket on every server). |
| The consortium dividend | Cut | Open question 7 |
| Networks (the signature) | Keep | |
| Codex, genes, authors, `scan`, `inspect` | Keep | Attack sets and threshold verbs join the codex |
| Tells | Change | Section 3.5 |
| SIGINT | Keep | |
| Bosses, phases, enrage, boss uniques | Change | Phases on the core part's ticks (option a) |
| Families, third parts, strains, grades, mutations | Keep | Plus ten families and attack sets. One mutation at most on a wild virus. |
| Levels, XP, catch-up, Rested, Fresh, hot strain | Keep | The room bonus (7.2) |
| Layers and level bands | Change | Floors |
| Uniques, collection, natives, the Listening Post | Keep | The Listening Post is a program |
| Events, the pager, the store, buyout | Keep | Buyout loses its outpost uses |

### 8.2 The breach build

| System | Decision | Notes |
|---|---|---|
| The breach mode, acts, rows, gates, `?playtest=breach` | Cut | The map's ideas move into rooms |
| The breach map view and node cards | Change | Reused for the room map |
| Keycards and vaults | Keep | Guard posts and vaults |
| Switches | Keep | They last a visit |
| Trace | Cut | *"Trace could feel bad because it goes against getting loot."* |
| The hunter | Change | No longer called by Trace: a Patroller or a Tracker that lives on the server (2.5) |
| Scripts (3 slots, one a fight) | Keep | From vaults, elites, hunters, Residents, caches and hub shops |
| Server-kind rules | Keep | Room themes |
| Caches and bait | Keep | |
| Defrag | Change | The rest room (once a visit) |
| Brokers and tokens | Cut | Hubs sell scripts for credits |
| Terminal events (cron, leaked creds, honeytoken, sandbox sample) | Keep | Terminal rooms, paid in Signal or a fight |
| Elites | Keep | Elite rooms |
| Rolled genomes (`rollGenome`) | Keep | For room viruses, with the designer's mutation cap |
| Breach enrage | Change | Elites from cycle 9 and bosses keep it. Wild viruses don't. |
| The heal cap | Keep | |
| Skill rules on gear, the Phantom's two talents | Keep | Now in the main game |
| Overclock and Lock (the roguelite tells) | Cut | Lock's mechanic powers the Wiper |
| Rewrites and outputs | Cut | Sockets |
| Heat | Cut | The Honeytoken is the opt-in dial, and loud runs stay |
| The campaign, its save, map, checkpoints, bounties, re-imaging | Cut | |
| `core.dump` fragments and the Archive | Keep | In `/core` on a Resident's first fall, filed in the codex |
| LOWLIGHT's room, the world turn, dig in, dead drops | Park | Its reactive lines could come back on the pager later |
| `breachsim.mjs`, `campaignsim.mjs` | Change | `roomsim.mjs` |

## 9. Build plan

### 9.1 Phases

| Phase | What | Playable as |
|---|---|---|
| **R0, the slice** | One server as a room graph, behind `/?playtest=rooms&class=…&level=…&kind=…&seed=…` with a fresh character that's never saved. Room kinds: process, elite, guard post and key, vault, core, den, cache with bait, rest, junction. Fog, the key walk, a Patroller and a Tracker (`&hunter=patrol|track`), respawn timers (×10 speed in the playtest), progress. A Resident in `/core` with the boss rule on a switch (`&boss=a|b|c`, and `developer bossrule a|b|c` mid-session) so the designer can play DEADBOLT under each option and pick (3.4). The interrupt rule with its ticks and readout. Attack sets for the three families. The Trojan, the Cryptominer and the Wiper. `roomsim.mjs`: a bot that walks a server visit by visit. | A playtest page |
| **R1, into the old game** | Traced servers become room graphs. SPRAWL-00, rogue servers and KESSLER-FARM-00 as rooms. Takeover, the new Root. Tells simplified (3.5). Terminal commands on rooms. Contracts re-pointed. A save migration (9.3). | The real save |
| **R2, sockets** | Socket rooms, codebases, components and the drop rates, the first eight programs (Harvester, Cron Spawner, Code Siphon, Cache Mill, Defrag Bay, Tunnel, Snare, Listening Post). Outposts, swarms and services go. | |
| **R3, floors** | Floor diagrams and their generator, exits, the floor panel, floors replacing `BANDS`, hubs and lairs on floors, invasions by floor. | |
| **R4, depth** | The other seven families, nest rooms, Linked tells, boss phases on core ticks (option a), help requests, the other eight programs. | |
| **R5, the cut** | Delete the breach and campaign code and tests, and the GAME_RULES and README sections for them. | |

Each phase ends with the balance checks: every class at 85%+ wins against a same-level room fight and 20–30% Signal lost, every new family passing rule 4 with the per-gene harness (genesim.mjs), a medium server finished in 2 to 4 visits, and the hours in 7.2 within 15%.

### 9.2 What's reused

| Code | Becomes |
|---|---|
| `combat.mjs`, `tells.mjs`, `planner.mjs`, `dist/classes` | The fight. The interrupt goes in a new `dist/interrupt.mjs` hooked where damage lands (one check before attacks resolve). The bots gain `interruptMove`: cross a tick on a due cycle, and save a tick for a tell. |
| `breach.mjs` | The room graph generator (its lanes and rows become spine and branches), the hunter (it already steps along links toward you: add the patrol loop and the den), keys, vaults, switches, caches and bait, server kinds. Moves to a new `dist/floorplan.mjs`. |
| `breach-view.mjs`, `breach.css` | The room map and its room cards |
| `rogue.mjs`, `zone.mjs`, `root.mjs` | Respawn timers, relocks, rare spawns |
| `run.mjs` | `connect`, `jack out`, the pack, `ls`/`cd`/`cat`/`pull`, guards, the core, the crew on a run |
| `genes.mjs`, `authors.mjs`, `genome.mjs` | New bodies, attack sets (`ATTACK_SETS` by family, weighted by author), `rollGenome` in rooms, the codex |
| `scripts.mjs`, `skillrules.mjs` | As they are |
| `outpost.mjs`, `salvage.mjs` | Program costs, codebases from plans, the pay picker. The rest of outpost.mjs goes. |
| `hidden.mjs`, `network.mjs` | Tracing servers along floor links, the floor's holder |
| `consortium.mjs`, `crew.mjs`, `presence.mjs` | Help requests and drop-ins |
| `invasion.mjs`, `firewall.mjs`, `filters.mjs` | As they are, with floors for travel |
| `raid.mjs` | Crew bosses, unchanged |

A naming note: `dist/room.mjs` and `room-view.mjs` today are LOWLIGHT's back room (parked). The server rooms' code goes in `floorplan.mjs` so the two never share a name.

### 9.3 Migrating a save

A version bump, in place. Every server you'd found becomes a room graph from its seed. A server you held starts with its vault opened and its Resident beaten (two rooms toward progress) and still held. Each building's plan becomes the matching program's codebase, and every building's cost comes back as code and components (salvage counts one for one). The Relay you'd placed becomes a Relay codebase. Services, the architecture and the dividend pay back what they cost, as save v34 did. A mail from wick says what changed, in one short paragraph.

### 9.4 What shipped: R0

**Play it:** `/?playtest=rooms&class=breaker&level=10&kind=Mailhub&seed=7&boss=a` (class `breaker|bastion|infiltrator|operator`; `&kind=Mailhub|Relay|Mirror|Archive|Lab`, `&size=small|medium|large`, `&boss=a|b|c`, `&hunter=patrol|track`, `&author=…`, `&floor=…`, `&sub=…`). A fresh character in blue gear on a server that is never saved; the clocks run ten times as fast. GAME_RULES.md and README.md ("Rooms playtest (R0)") describe the screen and the rules as built. Code: `dist/floorplan.mjs`, `dist/interrupt.mjs`, `dist/families.mjs`, `dist/floorplan-view.mjs`, `dist/floorplan.css`; the bot is `roomsim.mjs`; tests in `rooms.test.mjs`, `interrupt.test.mjs` and `families.test.mjs`. Nothing in the old game changed outside the playtest page: the room hooks in `combat.mjs` act only on fights flagged `e.rooms`, the new bodies live in `ROOM_FAMILIES` (never in `FAMILIES`), and the board's ticks and cut readout only draw in room fights.

**In it:** the R0 row of 9.1. Room kinds process, elite, guard post with the key, vault, core, den, cache with bait, rest and junction, on a branching graph built from seed, size, kind and floor (a spine, branches of one to three, a loop on medium and two on large, a Relay's two hops). Walking costs 3% (4% from floor 5) for a room's first entry on a visit. Fog, respawn timers on the map and in `ls`, progress (Rooms n/N, the map drawn at half, Mapped at 100%). The key walk and the vault (one visit's key, force for 15%), the Patroller and the Tracker on every server kind (`&hunter=` overrides), the interrupt with its ticks on the bars, the *cut ▸ n* readout and the INTERRUPTED float, attack sets for the Ransomware, the Worm and the Ghostroot (and the new bodies), the Trojan, the Cryptominer and the Wiper, and DEADBOLT under rules a, b and c (the strip's switch, `&boss=`, `developer bossrule`). The terminal maps onto rooms (`ls`, `cd`, `cd ..`, `map`, `wait`, `back`, the verbs).

**The sim** (`node roomsim.mjs 8 10 medium 60`): eight medium servers a class and rule, the five kinds in turn, level 10, the subclass a player picks first; the bot maps each server (or gives it up after four losses in one room), then farms its respawns for an hour. *Fights* is all room fights won; *boss* DEADBOLT's wins over tries; Signal lost is the share of the bar a fight cost; *to Mapped* is the first clear (dense in first-clear XP, decoding and the Mapped bonus), *session* the clear plus an hour's farming, the steady grind. Level 10 needs 2,040 XP, so the 6–10 band's target of 3 levels an hour (7.2) is about 6,100 XP an hour.

| Class (subclass) | Rule | Mapped | Fights won | DEADBOLT (tries) | Signal lost: process / elite / guard / boss / hunter | Min to Mapped (visits) | To Mapped XP/h (lv/h) | Session XP/h (lv/h) | Cuts / wasted ticks a server |
|---|---|---|---|---|---|---|---|---|---|
| Breaker (Demolitionist) | a | 100% | 93% | 80% (2.5) | 19 / 27 / 17 / 42 / 31% | 59 (10.0) | 9,109 (4.5) | 5,149 (2.5) | 10.0 / 25.9 |
| Bastion (Warden) | a | 100% | 99% | 94% (2.0) | 12 / 27 / 9 / 36 / 8% | 33 (3.8) | 10,970 (5.4) | 5,654 (2.8) | 12.1 / 48.6 |
| Infiltrator (Payload) | a | 88% | 96% | 100% (1.5) | 22 / 35 / 19 / 34 / 29% | 38 (7.6) | 11,994 (5.9) | 5,864 (2.9) | 16.4 / 35.4 |
| Operator (Herder) | a | 75% | 95% | 55% (2.5) | 18 / 21 / 19 / 58 / 21% | 48 (9.1) | 8,777 (4.3) | 5,276 (2.6) | 22.4 / 75.1 |
| Breaker | b | 100% | 93% | 89% (2.3) | 19 / 33 / 16 / 47 / 30% | 59 (9.8) | 9,036 (4.4) | 5,128 (2.5) | 10.8 / 26.0 |
| Bastion | b | 88% | 100% | 100% (1.8) | 12 / 25 / 10 / 19 / 8% | 56 (3.3) | 10,647 (5.2) | 5,205 (2.6) | 12.9 / 45.9 |
| Infiltrator | b | 88% | 95% | 83% (1.5) | 23 / 33 / 20 / 27 / 24% | 40 (8.0) | 11,851 (5.8) | 5,834 (2.9) | 16.5 / 36.8 |
| Operator | b | 38% | 87% | 16% (3.1) | 21 / 40 / 21 / 70 / 22% | 54 (10.6) | 6,836 (3.4) | 4,872 (2.4) | 19.0 / 63.5 |
| Breaker | c | 100% | 93% | 89% (2.3) | 19 / 33 / 16 / 45 / 31% | 59 (9.8) | 9,031 (4.4) | 5,148 (2.5) | 10.6 / 25.1 |
| Bastion | c | 88% | 97% | 92% (1.6) | 12 / 26 / 9 / 22 / 10% | 32 (3.8) | 11,039 (5.4) | 5,656 (2.8) | 12.9 / 48.3 |
| Infiltrator | c | 88% | 96% | 92% (1.6) | 22 / 34 / 19 / 33 / 25% | 39 (7.9) | 12,102 (5.9) | 5,922 (2.9) | 17.0 / 38.0 |
| Operator | c | 75% | 93% | 50% (3.0) | 19 / 25 / 19 / 61 / 21% | 50 (9.6) | 7,991 (3.9) | 5,171 (2.5) | 23.5 / 83.3 |

DEADBOLT alone, from a full bar (twenty fresh level-10 characters a class, Mailhub, the same subclasses): rule a Breaker 17, Bastion 18, Infiltrator 20, Herder 2; rule b 18 / 20 / 20 / 0; rule c 16 / 20 / 19 / 3.

What the numbers say: a process fight costs 12–23% of the bar (the doc's 20–30% for the Breaker and the Infiltrator, less for the Bastion); elites 21–40% (under the 45–60% target: elites were cut from 5.2× to 2.2× Integrity because solo bots lost too many). DEADBOLT is a near-sure win for the Bastion and the Infiltrator and a coin flip or worse for the Herder under every rule; rule b is the Herder's worst. The Payload Infiltrator struggles with an elite Trojan (its spreading burns open the Packages). The farming hour sits just under the XP target (about 2.4–2.9 levels an hour at 10 against 3); the first clear runs well over it. A medium server maps in 32–59 minutes over 3–11 visits. Between rules the gap is within the noise of eight servers. In the browser a URL without `&sub=` gets each class's default subclass, which fares worse than the sim's pick (the default Infiltrator won DEADBOLT 2 of 20).

**Where R0 differs from the doc, and why:**
- *No terminals, switches, sockets or nests* (not in R0's row). A socket room is a process's room first, so R0 keeps the process: a medium server is the entry, the vault, `/core`, a guard post, the den, an elite, the rest room, two caches and three processes, one fewer junction than "a fifth".
- *`/core` comes back an hour after DEADBOLT falls* (like a lair's core), since R0 has no takeover; the designer can fight it under each rule again.
- *Fight sizes are R0's own* (`ROOMS.size`, `eliteHp` 2.2 instead of the old 5.2): tuned by the sim for solo play. Elites carry one rolled mutation at most, like processes.
- *The hunter* is a Bouncer body (Patroller) or a Tracer (Tracker), two levels over the server at about 1.3 times a guard's Integrity (twice cost the bots a server in three). It drops a script, not components (R2). An Infiltrator sees the whole loop, but only the Tracker's next room.
- *Bait*: reading a cache doesn't defuse it. Pulling bait costs 10% of your max Signal and still pays what it holds, so 100% costs some Signal. Caches pay credits and code (components are R2). Vaults hold gear or a script (no codebase, `payload.bin` or `signal.trc` yet), and Mapped pays an item and 5 kills of XP (no codebase or `core.dump`).
- *Tells* keep their old answers (the burst, SIGINT) beside the interrupt: the simplification is R1. Their counts follow 3.5 already (none to level 5, one from 6, two from 17, an elite one more). A cut answers a charge riding the cancelled move, and a cast or seal landing on that part that cycle.
- *Attack sets are evened out*: each set's damage over 20 cycles is scaled to its Standard's (`SET_SCALE`; Lockout ×0.8, Bloom ×0.88, Ambush ×1.16, Hot rig ×2.06 on the Hash's base), so "×1.5" on the Hammer is a bit more in play. Its jitter is a cycle either way, never onto cycle 1.
- *Rule (b)'s extra charge* is Full Disk, added to DEADBOLT's set (three charges and a cast). *Rule (c)'s budget* counts cancels; a tick crossed after the third is spent for nothing.
- *Every verb works on the map and the prompt*, but there is no `scan <room>`, `ls -a` or Lock the den (no switches), and help requests are R4.
- *The playtest's ×10 clock* also speeds the rest at home and the 30-second reconnect wait.
- *Who writes a server*: by kind unless `&author=` says otherwise (Mailhub TOLLGATE, Relay SWARMLINE, Mirror PALEMASK, Archive GLASSJAW, Lab LANTERN). Every family the author writes and that is open at the server's level turns up in at least one room.

### 9.5 What shipped: R1

**Play it:** the real game. A new character connects to SPRAWL-00 from level 1 and every server plays as rooms on the **Run** tab (the strip, Schematic HD, the pop-up cards, Wait and Jack out); home, the network map, mail, the loadout, invasions, the firewall and hubs are as they were. `developer location ransomware` (with `?dev`) traces a server to try a traced one at once; `developer bossrule a|b|c` switches the boss rule. An existing save moves to rooms when it loads. `?playtest=rooms` stays as R0's dev page (its own server, never saved, clocks ×10). GAME_RULES.md ("Runs: servers as rooms (R1)", "Root access", "Tells") and README.md describe it as built. Code: `dist/netrooms.mjs` (new), `dist/floorplan.mjs` (its world mode: the `WORLD` hooks), `dist/run.mjs` (connect, the pack and `bank`, the terminal on rooms), `dist/interrupt.mjs` and `dist/tells.mjs` (3.5), `dist/root.mjs`, `dist/mail.mjs`; tests in `netrooms.test.mjs` (new) and the old files ported to rooms; the bots in `bot.mjs`, `roomsim.mjs` and `farmsim.mjs` walk rooms.

**In it:** the R1 row of 9.1.
- *Servers as rooms.* A traced server is the R0 generator's graph from its seed: its template is its kind (relay Relay, mailhub Mailhub, mirror Mirror, archive Archive, lab Lab), its family's crew (or its faction) the author, its layer the floor, its size its own. Its guard post holds the vault's key; the vault holds what its old vault did (a protocol kit, code, a trace record, plans, blueprints, source, a contract's planted file), all into the pack when it opens; the Resident waits in the Core. Beat it with the vault open and the server is taken over (teal on the map, its Core quiet for good). SPRAWL-00, rogue servers (Nest, Pit, Gauntlet), lairs and KESSLER-FARM-00 are their folders as rooms, linked as the folder tree, every room a fight on its folder's own spawn and timer; RELAY-KING's `/net/relay` and a lair's `/core` are Cores; the farm's packs are elite rooms, its three crew bosses boss rooms (♛), its ledger a vault that opens once the Foreman and the Heatsink are down. Progress (Rooms n/N, Mapped and its reward, what's opened and taken) lives on the server in the save.
- *Clocks* run at real speed: a process room 15 minutes, a guard post 20, an elite 45 (2.7, 10.8); a wild server keeps its folders' timers (SPRAWL-00 90 seconds, a rogue folder 3–5 minutes).
- *Takeover and Root* (2.8). Root counts respawned fight rooms cleared on a held server: Root 2 after 5 (a stash room opens beside the Core), 3 after 15 (no memory, no invasions), 4 after 30, 5 after 50 (rare spawns twice as often). Root 4's "one more socket room" is R2: until then it's the old building slot.
- *Tells simplified* (3.5): every solo fight carries the interrupt (crew bosses and the breach build keep their own rules); tells are the big moves (none to level 5, one from 6, two from 17, an elite one more); the burst, the windows by tier, landing plain and the bots' burst bookkeeping are gone; a charge is cut on its cycle, a cast SIGINTed or cut in its two-cycle window. The bots cut big moves first (never into a Mimic's beat) and leave a boss's ♛ part for last while its phases remain. Linked tells are R4.
- *The boss rule* is (a) everywhere; `developer bossrule a|b|c` switches it.
- *The terminal* on rooms: `ls`, `cd` (a room's name or slug, a folder path on a wild server: `cd var`, `cd /var/log`), `cd ..`, `map`, `go`, `wait`, `back`, `engage` (`attack`), `cat`, `pull`, `open`, `force`, `rest`, `slip`, `scan [room]`, `pack`, `help`, `jack out` (mid-fight the emergency escape, as before) and `connect`. The crew's `split`, `link`, `goto` and `regroup` walk rooms; SPRAWL-00's `ls` says who else is in each room.
- *Contracts* point at rooms: clear N new rooms on a server, map a server, take one over, recover a vault's file. LOWLIGHT's initiate storyline plays from level 1: claimjack waits in a SPRAWL-00 room (never the sealed Core).
- *The save* (v39), in place: every server you'd found becomes rooms from its seed; a held one starts with its vault opened and its Resident beaten, stays held, keeps its Root (counting from where its level begins) and gets its stash room at Root 2; a run in flight on the old file system banks its pack. Buildings and outposts stay as they are.

**The level-1 sim** (`bot.mjs`, the pacing bot: a fresh character through the real commands, walking each server's rooms with the rooms bot, resting to full at home, six seeds a class; `node bot.mjs <class> 10 <seed>`). The 7.2 targets: 1 hour to level 5, 2.7 to 10, 9 to 20.

| Class | Minutes a level, 1→2 … 9→10 | Hours to 5 | Hours to 10 | Room fights won | Time resting |
|---|---|---:|---:|---:|---:|
| Breaker | 5 / 12 / 10 / 12 / 18 / 19 / 20 / 28 / 26 | 0.64 | 2.48 | 97% | 30% |
| Bastion | 5 / 13 / 15 / 22 / 24 / 15 / 13 / 29 / 29 | 0.91 | 2.74 | 96% | 28% |
| Infiltrator | 3 / 9 / 11 / 17 / 21 / 30 / 24 / 28 / 40 | 0.67 | 3.03 | 95% | 38% |
| Operator | 4 / 11 / 4 / 16 / 12 / 19 / 29 / 26 / 24 | 0.60 | 2.42 | 99% | 29% |

To level 20 (three seeds): Breaker 7.4 hours, Bastion 9.8, Infiltrator 9.2, Operator 7.2 (the slowest 1.36× the fastest). The XP mix to 20: fights 52–67%, break-ins (first clears, Mapped, first runs) 28–30%, intel 5–10%, build (a held server's respawns) 4–9%.

Its room fights by kind (wins, and Signal lost a won fight), levels 1–5 and 6–10: SPRAWL-00's strays at your level 96–100% at 15–22% (a level over: 58–90% at 40–50%); a traced server's process rooms at 6–10 96–100% at 6–18%, its guard posts 97–100% at 5–26%, its elites 85–100% at 6–38%, the Resident 69–100% at 17–41%. Servers trail your level a little, so most of them cost less than a same-level fight.

**The rooms sim** (`roomsim.mjs`, R0's: medium servers built at your level, six a class, rule a, the subclass a player picks first at 10): the same-level check of 9.1.

| Level | Class | Mapped | Fights won | Signal lost: process / elite / guard / boss / hunter | Min to Mapped (visits) |
|---|---|---:|---:|---|---|
| 3 | Breaker | 100% | 91% | 17 / 50 / 22 / 19 / 42% | 54 (8.3) |
| 3 | Bastion | 67% | 83% | 21 / 38 / 23 / 35 / 21% | 40 (6.0) |
| 3 | Infiltrator | 100% | 97% | 26 / 36 / 25 / 26 / 27% | 33 (5.3) |
| 3 | Operator | 83% | 88% | 24 / 44 / 25 / 38 / 25% | 43 (7.0) |
| 6 | Breaker | 83% | 82% | 45 / 44 / 20 / 19 / 24% | 40 (7.2) |
| 6 | Bastion | 100% | 93% | 26 / 22 / 4 / 9 / 16% | 29 (4.3) |
| 6 | Infiltrator | 100% | 96% | 36 / 30 / 26 / 52 / 37% | 56 (8.3) |
| 6 | Operator | 100% | 90% | 27 / 38 / 23 / 36 / 35% | 51 (8.2) |
| 10 | Breaker (Demolitionist) | 100% | 86% | 37 / 35 / 18 / 32 / 38% | 56 (9.7) |
| 10 | Bastion (Warden) | 100% | 96% | 20 / 26 / 10 / 24 / 16% | 27 (3.3) |
| 10 | Infiltrator (Payload) | 100% | 100% | 21 / 41 / 14 / 26 / 22% | 23 (4.3) |
| 10 | Operator (Herder) | 100% | 97% | 26 / 30 / 23 / 33 / 15% | 31 (5.0) |

What the numbers say: the climb lands on 7.2 (2.4–3.0 hours to 10 against 2.7, 7.2–9.8 to 20 against 9), and in play nearly every fight is won. The same-level gate holds for the Bastion, the Infiltrator and the Operator at 10 (20–26% a process, 96–100% won, 3–5 visits), and for every class at 3. It doesn't for the Breaker at 6 and 10 (37–45% a process fight, 82–86% won, 7–10 visits) or the Infiltrator at 6 (36%): the Breaker's base kit and the Demolitionist can't cut a charge on an Encryptor wearing ◆5 in time, and an Encrypt left to stack does the rest. R0 measured the Breaker at 9–10 visits too. A kit pass for the interrupt is the fix (below).

**Balance tests re-baselined** to what the interrupt in every fight measures, each with its numbers in its test: the tells gap (`balance.test.mjs`: about 5 points of Signal at 10, 2 at 18, 1 at 30 now, since both bots cut the big attacks; it was 17 under the burst), HASHLORD and MIRRORSHADE's band (they hit harder: dmg 1.5 and 1.15), the kit spreads, core rotations and second presets (`kits-balance.test.mjs`), the natives' floor, the Hijacker in a crew, and the SPRAWL-only climb. Mass Mailer and Infest hatch one fewer, a charge rests 7 cycles, the after-effects are lighter (Offline 1 cycle, Corrupted 3–4%, Hung retired).

**Where R1 differs from the doc, and why:**
- *SPRAWL-00 has five rooms of strays and a Core, not "floor 1's entry"* (floors are R3). Its folders are the room tree, so `cd var` still works; its strays are a lighter room size (`ROOMS.size.stray`: a plain virus's Integrity, 80% of its hits) because levels 1–5 are where the ticks are learned.
- *Wild servers keep their own timers and payouts* (straight into your bank, as their folders always paid); only traced servers' kills go in the pack.
- *Root 4* is the old building slot until sockets (R2); Root 3 keeps "no memory" too, since memory is still on.
- *The terminal* has no `ls -a`, `unlock`, `sweep`, `tap`, `spoof` or `pwd` on rooms: passwords, the Trace and quirk folders went with the file system; the log sweep comes back as a terminal room later; the run skills (Tap, Spoof, Ghost, Light footprint) sit out until they're re-pointed. The old file system stays behind `run.mjs` `LEGACY.files` for its tests until R5.
- *First clears and Mapped count as break-in XP* in the mix (exploration), and a held server's respawned rooms as build: the kills pay the same.
- *The bots*: below level 10 they don't strip a part ahead of its charge (with three or four keys it cost more than the charge); the planner's big-cut priority has a sim switch (`TELL.bots.bigCut`).
- *Not in R1:* sockets and codebases (R2), floors (R3), new families, nest rooms, Linked tells and help requests (R4), deleting the breach and campaign code (R5). No mail from wick about the move yet.

**Known issues:** the Breaker's room fights at 6–10 (above); at level 3 the Bastion maps two medium servers in three; the pacing bot never fights the farm or the lair; kit spreads and core rotations at 18–40 measure under their old lines (held in the tests), so the classes want a pass for the interrupt; a traced server's guard posts at 6–10 cost the Bastion almost nothing.

## 10. Open questions for the designer

**Designer's answers (decided):** 2 yes, burns, helpers and daemons trigger interrupts. 3 yes, a wasted tick stays spent. 4 and 5 yes, 8 floors and no gatekeeper. 6: a socket only ever applies to the server it's built on (read as: you can build in any server you're on, held or not; holding adds the core socket). 7: the dividend goes with production; a help reward for both players is the replacement idea. 15 yes, no tells at levels 1 to 5. 1: test all three boss options in R0 (`&boss=a|b|c`) and pick after playing. The rest stand as recommended.

| # | Question | Options | Recommendation |
|---:|---|---|---|
| 1 | Bosses and ticks | (a) core ticks are phases, (b) every part interrupts and big moves are tells, (c) phases plus an interrupt budget | **(a)**, for the reasons in 3.4. All three ship switchable in R0, and the designer picks after playing them. |
| 2 | Do burns, helpers and daemons trigger interrupts? | All damage counts. Only your commands count (as tells do today). | **All damage counts.** The tick is about the part's Integrity, not your command, so the rule stays one sentence, and burn and helper kits get their own timing puzzle. |
| 3 | A tick crossed when nothing is due | Spent for nothing. Saved for the part's next move. | **Spent.** *This cycle* is what makes it a timing decision. Saving it makes it automatic. |
| 4 | How many floors | 5 (today's layers), 8, 10 | **8**, about six levels each, so every floor is a step and the exits come often enough to feel like a tower |
| 5 | A gatekeeper at the exit | None. A fixed boss at the next band's floor. | **None**, as the designer said. The exit's card shows the floor below's band in WoW colours. |
| 6 | Sockets on servers you don't hold | Yes. Only once held. | **Yes**, so building starts on your first server. Holding adds the core socket. |
| 7 | Threats to what you build, and the consortium dividend | Keep swarms and lockdowns for servers with programs. Cut them. | **Cut them.** Programs aren't income, so there's nothing to raid, and the home wall stays the idle layer. The dividend goes with production. If members should share, a member's programs could work for you on their servers. |
| 8 | Respawn times | 15 / 20 / 45 min (process, nest, elite). Faster. Slower. | **15 / 20 / 45**, with the Cron Spawner and Hostile as the ways to speed one server up. `roomsim.mjs` checks a full server is rarely empty when you come back from a rest. |
| 9 | The bottom of the tower | Bedrock's last server holds a final boss. Bedrock simply ends. A reflash opens at Bedrock's 100%. | **A reflash opens when Bedrock is Mapped**, as genome 14 has it, plus a final Resident on its deepest server |
| 10 | Movement cost | 3% of max Signal a new room. More. Nothing, and the hunter alone is the risk. | **3%.** Enough that junctions and the key walk matter, little enough that a visit is 3 to 5 rooms of fights |
| 11 | The hunter's pace and reach | A room every 2 of your moves (every move in a Lab). Every move. A Tracker that never loses you. | **Every 2 moves, and a Tracker loses you at 5 rooms.** You can always out-walk it by planning, never by luck. A dev flag sets the pace for the first playtest. |
| 12 | What wakes a Tracker | Walking next to its den. Opening the vault. Taking the key. | **Walking next to its den.** Waking it on opening the vault or taking the key would tie danger to loot again, which is what cut Trace. |
| 13 | Help that clears rooms without you | Counts for your progress. Doesn't. | **Doesn't.** Help comes to your fight. Progress stays something you did. |
| 14 | Program versions | One version each. v1 and v2 like services. | **One version.** The choice is which programs on which server, not upgrade tiers. |
| 15 | Tells at levels 1–5 | None (the ticks are the lesson). One charge, as today. | **None.** A level-1 player learns one rule at a time, and the first tell at 6 is answered with the rule they already know. |
