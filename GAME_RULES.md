# BLACKBOX — game rules

This is the single source of truth for how combat works. If code, README or an old spec disagrees with this file, this file wins. Numbers live in `dist/data.mjs`.

## The Craft page

Everything you build is on one page, **Craft** (at home only): protocols (compile from your recipes, Zero-days from source), configs and harvesters, with your credits, code and salvage stacks beside them. Protocols you *run* live on the **Loadout** page's first tab, Protocols (the stash as one row per item on the left, slots and stats on the right); skills and talents share the second tab (slots, stats, stash: load, unload, scrap).

## First launch

A new game opens on a bare terminal: `blackbox login:` asks for a handle (2–16 letters, numbers, dots, dashes or underscores) and a password (4+ characters; never stored). Then an encrypted transmission from Halcyon Mutual's Office of Loss Prevention explains that the terminal was set up for you and that wick of LOWLIGHT will write. Your handle is your name on the prompt from then on.

## The loop

1. `connect sprawl`: **SPRAWL-00**, a rogue server, is where you go to fight from the start. A virus sits in each of its six folders at your level, but never above level 3: it's a starter area, and past that the fights worth having are on the servers you trace (`ls` shows it as `name.exe`); SPRAWL-00 only ever has the plain families, never strains or bigger grades; `attack` it when you're ready. A kill pays like a home kill, straight away (XP, code, a possible drop, a lead), and the folder fills again 90 seconds later.
2. Every neutralized virus gives a lead toward its family's origin: +15% for the kill plus half your backtrace (about seven plain kills, or two full backtraces) (each class traces its own way, at home and on the rogue server; see Backtrace). At 100% the origin is located. A full backtrace locates it in one fight; four plain kills of the same family also get there.
3. `connect <location>` starts a run on a traced origin. Your server stays home; out on the net your health is **Signal** (100 × your power, plus protocols). Signal carries between connections and rests back up while you're home and not fighting (20% of max a minute, empty to full in 5 minutes, and it catches up while the game is closed); you need a quarter of it to connect. Or **top up**: click the Signal meter (a **+** chip sits beside it whenever it isn't full, and a first-time tip points at it), or type `top up`, to pay for the rest now (see The economy). The Integrity meter has the same **+** for `repair`. On a run, the store's **Signal patch** fills it. (Signal boosters are retired: they can't be crafted any more, and ones you still carry work with `boost`.)
4. Explore the location's file system, fight what guards it, read files for clues, pull files into your pack.
5. Some files lead deeper: a trace record locates a node one layer down.
6. `jack out` to go home and bank your pack. Nothing waits at your gate: home only sees a fight when an invasion gets through.
7. Meanwhile, locations you've found send **invasions** home along the network. Your wall (the Firewall service) meets them; `jack in` to fight one yourself.
8. **Mail** gives it all a reason: contracts from your crew and from Halcyon Mutual, which pays a retainer every 30 minutes while your standing holds, plus Indemnity to spend at its store (see Mail and contracts, The hidden network, The Halcyon store).

## Runs

| Rule | Detail |
|---|---|
| Signal | 50 at the start of each run. Moving (`cd`) costs 1. Guards hit it. A wrong password costs 3. |
| Disconnect | At 0 Signal you're thrown home: your unbanked pack is lost, your server is untouched, the location stays. Guards you beat stay beaten. |
| Guards | A guarded directory starts a fight when you enter it. `engage` to fight, `cd ..` to back off. Guard fights use the same combat rules, except damage (encryption included) hits Signal, and Trace doesn't apply. |
| Locked | A locked directory needs `unlock <dir> <password>`. The password is written in a file somewhere in the location. |
| Pack | Pulled files are unbanked until you jack out. A pull pops a small card with what it was (a blueprint or daemon shows ??? until it's banked); jacking out shows a **Banked** card with everything you brought home (Enter, a click or your next command closes it). Credits go to your credits, items to salvage, protocols to your stash, code to your server, source (Zero-day or special service) and blueprints to your recipes; trace records locate a deeper node. |
| Home while out | Intrusions wait. A waiting intrusion is parked when you connect and returns when you're back. |

### Run commands

| Command | What it does |
|---|---|
| `ls` | List this directory: subdirectories (with [guarded] / [locked]), files (with [pull] if takeable). `ls -a` also shows hidden dotfiles. |
| `cd <dir>` | Move. Unix paths work: `cd ..`, `cd ../logs`, `cd /relay/vault` |
| `cat <file>` | Read a file (paths work too) |
| `history` | The whole run so far. The terminal otherwise starts over in each folder you `cd` into (the *earlier* link at the top does the same). |

A typo'd folder, file or fight command gets "Did you mean …?" with the guess as a button (`cd vra` → `cd var`, `spike pusle` → `spike pulse`, `spikefrag2` → `spike frag2`). Warnings from a fight stay on the fight screen and out of the run terminal.
| `pull <file>` | Copy a file from this directory into your pack |
| `unlock <dir> <password>` | Open a locked directory |
| `jack out` | Go home and bank your pack |
| `pwd` | Show where you are |
| `tree` | Map of the directories you've seen |
| `pack` | What you're carrying (unbanked) |
| `help` | List these commands |

`look` and `go` are accepted as aliases. Entering a directory lists it automatically, like arriving in a MUD room.

### Locations

Every location uses one of five layouts, rotating so consecutive locations play differently. Each has one guard, one locked directory, a password to find, credits, a salvage item and a trace record. Each layout has one idea:

| Layout | Idea | Map |
|---|---|---|
| relay | The basics: password in a log | /readme.txt · /logs (access.log) · /relay [WATCHDOG] cache.dat · /relay/vault [locked] |
| mailhub | Split key: half in mail, half behind the guard | /motd.txt · /mail (ops.eml) · /spool [SENTINEL] queue.log, queue.dat · /spool/vault [locked] |
| mirror | Deep tree, password past the guard | /index.txt · /public · /private [WATCHDOG] ledger.dat · /private/admin todo.txt · /private/admin/vault [locked] |
| archive | Three month logs, three keys; readme.md says which month is current | /readme.md · /backups jan/feb/mar.log, old.dat · /srv [SHREDDER] stock.dat · /srv/vault [locked] |
| lab | Honeypot: /tmp/bait.dat looks like loot; pulling it costs 10 Signal. notice.txt warns you, cat reveals it | /notice.txt · /bin login.sh (password) · /tmp bait.dat · /lab [CRAWLER] samples.dat · /lab/vault [locked] |

### Rogue servers

About 1 in 6 servers you trace is **rogue** (never your first two, and never more than five tame ones in a row). A rogue server is a farm: 4–8 folders with one virus each, at the server's level and grade (strains from layer 2), each coming back 3–5 minutes after you kill it. No vault, no password, nothing to take over or harvest, no log sweep, and it never sends invasions. It shows on the map as a hexagon. **Reconnect wait:** once you leave a wild server (SPRAWL-00 or a rogue one), by jacking out or being thrown out, it won't take you back for a minute (`CONFIG.relockMs`; its card counts down). That stops the jack out, top up, go straight back loop. Kinds:

| Kind | Rule |
|---|---|
| Nest | One family only, and strains twice as often |
| Pit | Mixed families, 2 levels above the server, a second roll for drops. A third of its folders hold an **elite** (see below) |
| Gauntlet | Mixed families; clear every folder in one run for a bonus cache (60 + 12×level credits, code, XP) |

### Guards

Every enemy is built the same way: one basic attacker and one signature part that is the whole idea of that enemy, each with armor chits (◆).

| Guard | Attacker | Signature |
|---|---|---|
| WATCHDOG | Sentry (bare): Sweep −6 every 3 | Tracker ◆: one big Trace-back −16 every 5. Delay it if your class can, or strip and break it first. |
| SENTINEL | Lens ◆, veiled: Glare −10 every 4 | Lockout ◆, veiled: −7 every 3. Timers hidden until you strip or Tag them. |
| CRAWLER | Maw (bare): Bite −7 every 3 | Brood ◆: spawns a fragment every 4 that gnaws Signal every cycle |
| SHREDDER | Grinder ◆: Grind −9 every 4 | Shredder ◆: Shred −14 every 5. One slow, heavy strike to plan around. |

### Quirks

Every location has its family's quirk: one visible rule, shown on the map card, the run header and when you connect.

| Family | Quirk | Rule |
|---|---|---|
| Ransomware | Hoard | Caches pay 50% more, but the guards are Armored. |
| Worm | Nest | An extra /nest room with a CRAWLER and a brood sample (salvage). Optional. |
| Ghostroot | Hidden | A hidden /.ghost directory with a credit stash and the vault key. Only `ls -a` shows it; the root file hints at it. |

### Going deeper

A trace record (`signal.trc`) you pull and bank locates a new node **one layer deeper**, of the family named in the file. On the Map it branches off the node it came from. Each layer adds +3 guard levels (about +12% health and damage) and +20 credits per cache. Layer 3 guards call for good play or a Signal booster.

## Protocols, services and code

Two sides, two ways to get stronger. **You** run protocols: loot with rolled stats. **Your server** runs services: things you build from code. Neither is fiddly: a protocol goes in any slot, and a service is one rule.

### Items (you): loot, Diablo 2 style

Everything you equip is software: code, tools and access, never hardware. The Loadout page's Protocols tab (type `protocols`) shows your slots, your stat sheet and the stash. Design: the items design doc ("BLACKBOX: loot and 50 items").

**Slots.** Exploit (weapon: Damage), Proxy (chest: Signal + Block), Shell (helm: Signal + Regen), Script (ring: Damage + Signal); an **Implant** slot opens at level 15 and another at 30 (Implants are uniques only for now). `load` puts an item in its slot; if the slot is full it **swaps** (the old one goes back to the stash). Each class loads its own; one place at a time; one of each unique and each Zero-day per loadout.

**An item = a base + affixes (+ a unique's effect).**
- **Base items** (20, five per slot) give the **primary stats**, the feel-good numbers: Damage on every hit, Signal, Block, Regen. A new tier unlocks every few levels (Exploit: Proof of Concept 1, Weaponized Exploit 5, Exploit Chain 11, Zero-click 18, Wormable 26; the other slots likewise). Primaries scale +4% per item level from the tier's own level, ×0.6 overall (the monster pass, below).
- **Affixes** are the **secondary stats**, small on purpose (2–10%): a prefix adds offense (Weaponized +Damage, Precise Crit, Calibrated Accuracy, Loaded Payload, Multithreaded Clock Speed, Brutal Crit Damage, Recursive Echo), a suffix defense or utility (of the Bunker +Signal, of Mending Regen, of the Scavenger Scavenge, of the Ghost Evasion, of Leeching Leech, of Silence Stealth, of the Beat Sync, of Scrubbing Sanitize). Each needs a minimum item level. Names read like D2: *Precise Proof of Concept of the Bunker*.

| Rarity | Colour | What it has |
|---|---|---|
| Scrap | Grey | Base ×0.8; 40% roll a junk affix (Buggy −Damage, that Leaks −Evasion) |
| Stock | White | Base |
| Tuned | Blue | Base ×1.1 + 1–2 affixes (one prefix, one suffix) |
| Custom | Yellow | Base ×1.2 + 3–5 affixes (up to three each), a random two-word name |
| Zero-day | Gold | A **unique** (30, written in the editor) or a found Zero-day (Rootkit, Race Condition, Buffer Overflow) |
| Indemnified | Orange | Halcyon's store only |

**Uniques** have a fixed name, stats, flavour line and usually one **effect**, sometimes a downside. Found at a higher level, their stats grow; their downside doesn't. They can drop again. Effects are blocks (when · if · does · limits), so new ones are written in the editor without code: e.g. Logger Spool (+25% damage in a Sync Window, Keylogger trophy), Gate Bypass (start each fight with an armor chit, Bouncer ICE), Deadman's Switch (at 0 Signal on a run you jack out with your pack; rearms 90 real minutes later). Hover an item for its flavour.

**Drops: a grind, on purpose.** Targets in play time: a blue every 20–30 minutes, a yellow about every two hours, a gold every 10–12 hours. Per kill (at the assumed pace of 60 kills an hour, `LOOT` in gear.mjs): one in six drops a grey or white; blue 1 in 36 kills, yellow 1 in 180, gold 1 in 900, then vaults and double rolls make up the rest. Most kills drop nothing.
- **Guards, rogue-server Pits and bounties** roll twice and keep the best. Deeper layers add 10% a layer to the blue and yellow odds.
- **Vaults:** half hold a protocol (`kit.bin`, fixed per server; your first server's always does), white or better: white 80 · blue 16 · yellow 3.5 · gold 0.5 (a unique that drops from vaults that deep).
- **A strain's trophy:** 1 in 200 kills of that strain drops its own unique (Keylogger → Logger Spool, Hashrat → Cryptominer…).
- **Scavenge is magic find** with diminishing returns: +50% Scavenge = +33% better odds.
- **Rewards:** a story beat or contract can give a unique (killing claimjack gives wick's Old Toolkit: 5–6 Damage, +10 Signal, about a good blue at level 1).
- **Pace:** the System page shows your kills an hour of active play (the game open, used in the last 2 minutes). The odds assume 60; the scripted player measures 40–55 at a careful pace and about 90 fast.
- A good drop shows as a notice; greys and whites drop quietly.

**Deconstruct** (`deconstruct <id>`, or `scrap`): grey 1–2 salvage, white 2–3, blue 3 + 1 code, yellow 5 + 2 code + 1 Exploit, gold 10 + 4 code + 3 Exploits; +1 salvage per 10 item levels. The code is the family the item dropped from. A drop into a full stash (40) is deconstructed.

**Compile** at home with a recipe: `compile <stat>` gives a **blue** at your level with that stat as one of its affixes (60 + 15×level credits and 8 salvage); `compile <zero-day>` once you've banked its source. A Build Farm makes both cheaper. Halcyon's sealed item is a blue.

**Blueprints.** Nothing is buildable at the start. Every regular service (11) and every protocol recipe (16) is a blueprint you find once. A quarter of vaults hold a `blueprint.bp` (your first server's always does); a home kill drops one 0.5% of the time and a guard 1.25% (into your pack). Your first blueprint is always the Firewall; after that you get one you don't have yet, at random. One you already know is 2 salvage.

**The monster pass (friction, then relief).** Fights on your Signal (runs, SPRAWL-00, rogue servers) have enemies ×1.4 Integrity and ×1.9 damage (`CONFIG.runHp`, `runDamage`), tuned with `node friction.mjs` against the gear you're likely to have. Health a same-level fight costs (scripted planner, levels 5–10, after the Ghostroot fix): nothing equipped ~70%, whites ~42%, blues ~28–33%, yellows ~19–22%; level 1 sits on target (53 / 31 / 25 / 16). Home fights on your server are unchanged. The Infiltrator is weakest before Backdoor (level 10) and mid-pack after it.

## The economy

**Where credits come from** (bot, levels 5–15, taking contracts): about 1,000–1,500 credits an hour; 400 an hour at levels 1–4. Run caches are a bit over half of it, contracts about a third, the Halcyon retainer the rest. No credits come from kills. Measure it with `node econ.mjs <class> [level] [seed]`.

**Where they go.**
- **Health (the everyday sink).** Signal rests back at 20% a minute and the server at 2% a minute, offline too. Or pay to top up now: a full Signal bar costs 8 + 3×(class level) credits, a full server 10 + 4×(server level); less missing costs less (at least 1). Click the meter, or type `top up` / `repair [n]`. On a run it's the store's Signal patch instead. A bot that always pays spends about a quarter to a third of its income on it and reaches level 10 two to three times sooner than one that always waits; the Bastion barely needs it.
- **Building (the big goals).** Services, outpost modules, harvesters and configs cost credits, code and salvage, so deconstructed items feed your server and outposts. A v1 service is about ten minutes of income at level 5; a v2 about half an hour at level 15; a v3 is a long goal.
- **Gear.** Compiling a blue costs 60 + 15×level credits and 8 salvage, cheaper than the store's sealed item (180 + 14×level).

| Sink | Credits | Code | Salvage | Other |
|---|---|---|---|---|
| Signal top-up (full) | 8 + 3L | | | |
| Server repair (full) | 10 + 4 × server level | | | |
| Service v1 / v2 / v3 | 120 / 600 / 2,000 | 12 / 40 / 100 | 6 / 15 / 40 | Exploits 0 / 1 / 3 |
| Compile a blue | 60 + 15L | | 8 | its recipe |
| Compile a Zero-day | 400 + 30L | | 16 (2 guard parts) | its source |
| Harvester | 200 | 15 | 5 | its seed |
| Outpost module | 150 | 8 | 5 | |
| Config | 250 | 15 | 6 | its source |
| Architecture switch | 1,000 | | | |


**Commands** (at home, between fights): `protocols`, `load <id>` (swaps a full slot), `unload <id|slot#>`, `deconstruct <id>`, `compile [stat]`, `compile <zero-day>`.

### Services (your server)

The server has no items. It runs **services** in **service slots**, Master of Orion style: each service is one rule, built from code, and upgraded **v1 → v2 → v3**. The Server page (type `server` or `services`) shows ports, code, the install queue, what's running and what you can build.

**Service slots** (shown as pips, filled for used). 6 to start, one more every 8 server levels (7 at 9, 8 at 17 … 12 at 41). A running service uses one slot whatever its version.

**The install queue.** One install at a time, in real time, and it keeps going while you fight, run or close the game. You can queue one from anywhere except mid-fight (on a run too: it's your server doing the work). `cancel install` refunds everything. `uninstall <service>` frees the port and gives back half the code it cost (credits and salvage don't come back).

| Version | Cost | Time | Needs |
|---|---|---|---|
| v1 | 12 code + 120 credits + 6 salvage | 15 min | its blueprint |
| v2 | 40 code + 1 Exploit + 600 credits + 15 salvage | 1 hour | server level 10 |
| v3 | 100 code + 3 Exploits + 2,000 credits + 40 salvage | 4 hours | server level 25 |

| Service | Code | v1 / v2 / v3 |
|---|---|---|
| Firewall | Cipher | your wall's rating ×1 / 1.2 / 1.45 (×0.75 with none); see Invasions |
| Tarpit | Worm | invasions travel 50 / 100 / 150% slower |
| RAID Array | Worm | +5 / 10 / 15% max Integrity |
| Hardened Kernel | Kernel | 2 / 4 / 6 Block on hits at home (× server power) |
| Scrubber | Cipher | every home fight starts with a shield of 4 / 7 / 10% of max Integrity |
| Hot-patcher | Worm | Regen 0.3 / 0.6 / 1 (×your server's power): per cycle in home fights, per real minute between them |
| Counter-intrusion | Worm | whatever hits your server takes 2 / 4 / 6 (×power) back; on armor it breaks a chit |
| Honeypot | Kernel | 3 / 5 / 8% Evasion at home |
| Sandbox | Cipher | 15 / 30 / 45% Sanitize at home |
| Uplink Array | Cipher | +10 / 20 / 30% Trace |
| Build Farm | Kernel | compiling costs 15 / 25 / 35% less |
| **Cron Job** (special) | Worm + Kernel | every 3rd cycle of a home fight, hits the soonest attacker for 8 × power × 0.4 / 0.6 / 0.8 (shown on the *You* row) |
| **Snapshot** (special) | Cipher + Kernel | once per home fight, when a hit drops you below half, restores 8 / 12 / 16% |

Special services need their **source** first (`cron.src`, `snapshot.src`, found in a quarter of vaults from layer 2) and cost both kinds of code, a bit more in total (v1: 6 + 6). Flat values grow with the server's level (+4% a level), like everything else.

### Code

Services are built from **code**, one kind per virus family, plus rare **Exploits** (v3 needs 2).

| Code | Family | From |
|---|---|---|
| Cipher code | Ransomware | kills, guards and vaults of that family |
| Worm code | Worm | 〃 |
| Kernel code | Ghostroot | 〃 |
| Exploits | any | 4% of home kills, 8% of guard kills |

A kill drops 1 code at level 1 (+1 every 10 levels); a guard drops half again, into your pack. Every vault's `payload.bin` is a cache of 12 + half the location's level. Scavenge adds to all of it. Salvage stays generic: it's for compiling protocols.

**Old saves.** Server gear that was installed comes back as v1 of the matching service, free (as service slots allow); the rest turns into code. Rig items become protocols, and Cron Job and Snapshot source becomes service source. The older Upgrades list came back the same way (Hardening as RAID Array, Amplifier as Uplink Array, the Signal booster as a loaded Stock Relay). Daemon slots come from server level (+1 at 10 and 20).

## Mail and contracts

**The story.** Halcyon Mutual insures half the servers on the net. Rival crews keep hitting its clients, so Halcyon pays third-party crews to fight a turf war against them, and never asks how. You're an initiate of one of those crews, **LOWLIGHT** (your handler is `wick`). The rival crews are named for the viruses they run: **TOLLGATE** (ransomware), **SWARMLINE** (worms) and **PALEMASK** (ghostroot). **GLASSJAW** is a broker that works against Halcyon.

**Standing** with Halcyon runs from 0 to 100 and starts at 10. It sets the retainer, paid every 30 real minutes, offline too (up to 8 hours of it builds up while you're away), and what the store will sell you. L is your server level.

| Standing | Tier | Retainer every 30 min |
|---|---|---|
| 0 | Suspended | nothing |
| 1–24 | Probation | 5 + L |
| 25–49 | Contractor | 10 + 2L |
| 50–74 | Trusted | 15 + 3L |
| 75–100 | Preferred | 20 + 4L |

Delivering a contract raises standing. A crash on your own server costs 10, but never takes you below 1: a breach alone never suspends you. GLASSJAW's work costs 8 per job, and only that can get you suspended. Declining or dropping a contract never costs anything.

**Contracts** pay credits and **Indemnity** (Halcyon's scrip, spent only at its store; GLASSJAW pays no Indemnity, but 1.6× the credits). They track themselves once taken; you hand them in from the Mail tab (`mail deliver <n>`).

| Type | Done when | Hand-in |
|---|---|---|
| Kill | N kills of a family, anywhere (or anything in SPRAWL-00) | — |
| Named process | You kill the named process the contract puts in a SPRAWL-00 folder (two levels above you) | — |
| Takeover | You open the server's vault. That server is then **taken over** (yours, teal on the map) | — |
| Materials | You have the code in stock | the code is handed over |
| Recover a file | The contract's file sits in a server's vault; pull it and jack out to bank it | the file is handed over |

A takeover or recovery contract points at a server you've found and haven't taken over, or at an **unknown server** one hop past one you've found. Halcyon never tells you where an unknown one is: see The hidden network.

**The board** opens with the fourth letter (the turf job, after claimjack), so random contracts at your level arrive while the rest of the storyline runs. Up to five offers sit on it; a new one arrives somewhere between 2 and 9 minutes after the last (5 on average, sometimes two at once), and an offer nobody takes is gone after 18–45 minutes. You can hold three at a time (`mail accept <n>`, `mail drop <n>`); only a contract you've taken counts. Rewards scale with your level (L): kill 30 + 5L credits, named process 40 + 6L, materials 35 + 6L, recovery 50 + 8L, takeover 60 + 10L, plus 1–4 Indemnity (+1 per 12 levels), XP and +5 standing (+6 recovery, +8 takeover). A fifth of offers (once your standing is 10 or more) come off the books from GLASSJAW.

**The initiate storyline** (LOWLIGHT's jobs, in order; they can't be dropped and don't count toward your three): kill three processes in SPRAWL-00 (60 credits, 1 Indemnity); hand over two Worm code (80, 1); kill the named process `claimjack` in /var/log, an elite (2 levels above you, grade 2: +15% Integrity, +10% damage; it stays put if you lose) (100, 2, wick's Old Toolkit); take over any server you've traced (150, 3, a blueprint and your first **relay**); recover Halcyon's stolen claims ledger, `claims.db`, from an unknown server next to the one you took (150, 4, a daemon): put the relay up, then trace the flagged server. Each pays standing (+3, +3, +3, +4, +4), so you finish at Contractor. The board and the store open with the turf letter.

## The hidden network

Every server you find is wired to two you haven't found yet, one layer deeper. They aren't on the map until you hear of them; then they show as **?** beside the server they hang off.

- **Invasions** can come from them (two in five, when there are any), through the server they hang off: "origin unknown, past VANTA-SINK-36". Jack in and beat one: its server is 40% traced (plus three quarters of your backtrace). If your wall stops one: +10%.
- **Relays** (Halcyon sells them; the storyline gives you one) go on a server you've taken over (`relay <server>`, or its map card). A relay pings that server's unknown neighbours, and flags the one carrying the signal of a contract you've taken.
- **Hunting a flagged server:** every kill of its family traces it 12% more (plus a quarter of your backtrace); the relay leaves a route file on its own server (`ping-….trc` in /) worth 50% when you pull it and bank it; a trace injector (store) adds 30%.
- At 100% it's **located**: an ordinary server, with its own two unknown neighbours. Contracts aimed at it follow it there.
- A vault's trace record (`signal.trc`) locates one of its server's unknown neighbours outright (a flagged one first).

## People: friends and who's online (presence.mjs)

Simulated until the server exists: `online sim` turns on a pool of 20 hackers who log on and off (about half are on at any time) and move every minute or so; `online off` turns them off. Everything else here is how it will work online.

- **The people button** on the top bar (a dot and how many are online; violet when a friend is on) opens two tabs: **Friends** (online ones first, with where they are; offline ones dimmed) and **Online** (everyone). Each line: handle, class and level, where they are (SPRAWL-00 and the folder, fighting or not; or just *on a run*, *on a rogue server*, *at home*: those are private).
- **Friends:** Add friend / Remove on any line, or `friend add <handle>`, `friend remove <handle>`, `friends`. `who` lists everyone online.
- **Crew:** an online friend can be **invited** (`crew invite <friend>`) and joins your run fights as a crewmate in their class (a bot for now). `crew kick <name>` lets them go. Three at most.
- **SPRAWL-00 is shared.** In its terminal, each folder shows who's in it or below it (a chip each, friends in violet, a red dot if they're fighting); arriving in a folder starts with *here* and who's there. The map's SPRAWL-00 node says how many are online there. Every other server is private.

## Consortium and the crew strip (consortium.mjs, run.mjs)

**A consortium** is hackers who merged their servers (simulated members for now). Everyone keeps their own home server and everything on it; merging runs a **trunk line** between home servers, so every member can reach every other member's servers.
- **Joining.** `consortium create <name>` founds one; invite people from the people panel (*Invite to consortium*) or `consortium invite <handle>`, and their server merges in. While you're in none, someone online now and then invites you (a pager entry, and a card on the people panel's **Consortium** tab): *Merge* / `consortium accept`, or `consortium decline`. Invites lapse after 10 minutes. Anyone can invite; only the founder can kick (`consortium kick <handle>`). `consortium leave` cuts the trunk line. You lose nothing of your own either way. `consortium` alone sums it up. (`guild` still works as the old name, and an old guild becomes a consortium.)
- **The map.** With a consortium, the Map has two views: *Your network* and the consortium's. The consortium's view has your home server in the middle, a trunk line out to each member's home server (their card lists their servers), and each member's servers branching off theirs: their outposts, servers they've traced and rogue servers (1–4 each, at the member's level, kept within 3 levels of yours while it's simulated).
- **Members' servers.** Connect to any of them like your own. Fights, files and drops are yours. Opening a member's vault doesn't take the server over: it stays theirs. Their natives come back 20 minutes after your last run there. Their home servers are theirs alone (home intrusions stay solo).
- **Shared ground.** Every member's server, plus your own outposts and rogue servers. Members online spend part of their time in its folders (yellow chips in `ls`), and when a fight starts in a folder they're in, they join it (up to three alongside you, counting your crew), each with full credit and their own loot. Nobody outside the consortium is there, so nobody can take your kills. A server you've only traced stays yours alone.
- **Owner and dividend.** An outpost's owner keeps its whole stockpile, as always. On top of that, every member's outpost pays each other member a **dividend**: 25% of what it produces, in kind (a Siphon's or Tap's code of its family, a Scraper's finds: credits, code, salvage, now and then a protocol). It fills in real time (offline too), a small stock per outpost of up to 12 hours' worth. An invaded outpost pays nothing until the invasion is stopped. The Consortium page shows what comes in an hour and what's waiting: *Collect*, or `consortium collect`. Each member outpost's card shows its rate and what's waiting. (Your outposts pay the other members the same way, at no cost to you.)
- **Invasions at members' outposts, and lockdowns.** Now and then (every 10–18 minutes of logged-on time) natives invade a member's outpost: a pager alert, and *Defend for a bounty* on its map card (`consortium defend <server>`). You have 8 minutes. Win for credits (30 + 8 × level), its family's code and XP. Nobody defends it: half the time a member deals with it; otherwise it goes into **lockdown** (pays no dividend for 2 hours). *Retake for a bounty* ends it.
- **Invasions at members' walls.** Every 15–25 minutes an invasion reaches an away member's wall (`consortium defend <handle>`, 8 minutes). Nobody stops it, and half the time a member does anyway; otherwise their server **crashes and reboots** for 2 hours, **occupied**: it shows under them on the map (`<HANDLE>-HOME`), open to anyone. Clear every folder for a bounty and it's back up. Their outposts pay no dividend while it reboots.
- **Invasions on the trunk line.** A lockdown or a crash (theirs or yours) sends the virus on along the trunk line toward another outpost, a member's or yours, a level stronger, arriving in 10 minutes as a fresh invasion. It's on the consortium map, and in the alerts: *Intercept* (`consortium intercept`) for a bounty that grows +50% a hop. One at a time; it burns out after 3 hops.
- **The Consortium page** (a top tab, there while you're in a consortium or have an invite; its badge counts what needs you). Left: **Needs you**, a card per alert (invasions at walls, at outposts and on the trunk line, lockdowns, crashed servers; yours first), each with what it is, a timer bar, the level and what it pays, and one button (Defend, Intercept, Connect, Retake); then the members (status, outposts, where they are; Map, Invite to crew, Kick). Right: the consortium and its size ladder, the dividend (*Collect*), and how your wall fares while you're away. The people panel's Consortium tab is a short summary that links to it.
- **Size.** The more servers merged (yours included), the better for everyone:

| Servers | Tier | Bonus |
|---|---|---|
| 3 | Linked | +10% outpost yield and dividend |
| 5 | Mesh | Invasion bounties doubled |
| 8 | Backbone | A trunk rogue server (a Pit at your level) opens on the network |
| 12 | Grid | +1 harvester slot and +10% wall |

Up to 20 servers. Crews of up to three are drawn from consortium members and friends (*Invite to crew*, `crew invite <name>`).

**The crew strip** sits under the run header when you have a crew: a card for you and each crewmate with their Signal and the folder they're in.
- Crewmates start **linked to you** (⛓ with you): they follow wherever you go.
- **Split** sends one off to look around on their own (they move every few seconds, never into a guard or a locked folder by themselves); *Split all* sends everyone.
- **Go to** takes you to them once. **Link** makes you follow them: when they move, you're pulled along ("kilo pulls you to /var/log"); any move of your own drops the link. **Unlink** drops it too.
- **Regroup** brings everyone back to you, linked.
- Only the crewmates in the fight's folder fight it. In `ls`, crewmates show as violet chips in their folder; arriving says who's here.
- The same as commands: `split <name|all>`, `goto <name>`, `link <name>`, `unlink`, `regroup`.
- The people panel's **Crew** tab lists your crew (up to 3): each crewmate's class and where they are (with you on the run, which folder, linked or not), *Remove from crew* for each, *Disband* for all, and the open slots.
- **Remove** takes someone out of your crew (and off the run): on their card in the crew strip, *Remove from crew* in the people panel or on the Consortium page, or `crew kick <name>`. Not mid-fight.

## The fight HUD

Left to right: **your Signal** (or your server at home; a signal-bars icon on runs, a server icon at home, and the same server icon on the top bar's Integrity), with your crew's bars under it in a small window, dividers between them; **Status**, everything on you right now, just the names in their colours (teal for yours, red for what's against you, violet for helpers): timed effects (Momentum, Brace, Blinded, Null-routed, Drawing fire…) and standing ones (Encrypted, Shield, Armor, Clock Speed, Rootkit, Snapshot, Helpers). Hover (or focus) one and a tooltip shows at once: how much, how many cycles left, and the rule; and **the virus**, its name and level labelling its bar, its armor and tags under it, lined up over its picture. The board below is just you, the parts and the timeline.

**Showing what happened.** Every cycle plays your turn first, then the virus answers a beat later (1.6 steps: about half a second at normal speed), one attack at a time. An attacking part's row lunges with a red edge and its attack's name floats off it; the damage rises on your bar. Every skill effect has its own word, flash and sound: a mark on a part (EXPOSED, TAGGED, HOOKED, THROTTLED, QUARANTINED: a lock-on blip), a burn (BURNING: a fizz), a helper (HELPER: three rising blips), a shield or a buff on you (SHIELD, or the skill's name: a swell). What you've put on a part stays as small icons by its name (teal for marks, orange for burns, violet for helpers), and an Exposed part's bar is hatched and outlined: it's open.

## Who's aiming where

On the fight board, each part shows who's aiming at it this cycle: round initials stacked in a rail down the row's left edge (yours teal, from your handle; each crewmate's violet). Hover one for the command. Every row keeps the rail's width, so names line up whether anyone's aiming there or not.

**While you type** a command that names a part (`spike scr`, `overload pul`), your avatar moves to that part before you press Enter: dashed and breathing if it would go through, red if it wouldn't (on cooldown, not lit, no armor to crack…; hover it for why). It's read exactly as Enter would read it, however the line got there (typed, Tab-completed, or recalled with the arrow keys). Clear the line and it goes back to your real aim.

When a command lands (hitfx.mjs), the shooter's avatar lunges at the part (that's who did it): a crit lunges harder, breaking an armor chit flashes it white, a miss shakes it.

**Effects** (System; `effects calm|full|minimal`) keep the board readable: one visual per event, on the thing it's about.
- **Calm** (the default): the number rises in the part's Now cell, the bar drops, the part's name line flashes, the avatar lunges. A crewmate's hit is quieter than yours (a smaller, dimmer number and no flash). A crit of yours also punches the virus picture. Breaking a part, winning, and a hit on you keep their big effects. The forecast's white slices still blink.
- **Full**: also the impact burst in the Now cell, sparks, the whole row flashing and a punch on every hit.
- **Minimal**: numbers and bars only (no flashes, no lunges, no shards).

At every Effects level, your own hits give the screen a small, quick shake (bigger for bigger hits and crits, a light one for a broken armor chit). Crewmates' hits don't. Motion off turns it off, like every other movement.

**The ability tray** says what's ready: every key has a charge bar along its bottom, full amber when it's ready. On cooldown the key is striped and dimmed, its bar refills cycle by cycle, a big number counts the cycles to go and the line under the name reads *ready next cycle* / *ready in 3 cycles*. A key that comes off cooldown flashes once. A key waiting for its moment (a lit key's window, like Shatter's) has no bar until it lights.

## Co-op, simulated (crew.mjs)

Online co-op comes later (a hosted server with logins). To try how it plays first, `crew sim bastion infiltrator` (up to three classes; `crew sim` alone takes the three you aren't) adds bot crewmates to your run fights (SPRAWL-00, rogue servers, guards). `crew` lists them, `crew off` sends them home. Home intrusions stay solo.

- Each crewmate is a player of its own: its class at your level, a Tuned protocol in every slot, its own Signal (full again at each fight), played by the same planner the balance scripts use.
- Each cycle everyone acts (you, then the crew), then the virus. Statuses are shared: anyone's hits benefit from Exposed, Tagged, Throttled and Hooked.
- A damage attack lands on everyone in the fight, each taking it in full, as if they fought it alone (its chip on the timeline says → all). Encryption, blinds and fragments stay on you.
- **Threat:** a Bastion's Firewall, in a crew, also draws fire for 2 cycles: every damage attack goes at that Bastion alone (one hit, at its solo size), and nobody else is hit. The chip says → nyx (or → you), the Bastion's row says *drawing fire*. Solo, Firewall is just its shield.
- **Turn order: strippers first.** Each cycle, everyone's command (yours and the crew's) goes by what it does, so a big hit isn't wasted on armor somebody was about to strip: armor strippers (Spike, Crack) first, then debuffs and the rest (Exploit, Tag, Inject, Brace…), then damage skills (Overload, Kill Process, Flood…). Ties keep their order: you, then the crew. Add **`last`** after the target (`overload scrambler last`) to send your command to the back of the cycle, after everyone else's. Solo, nothing changes.
- **Turns play out one at a time** on screen in that order, then each of the virus's attacks due, a beat apart (0.38 / 0.33 / 0.26 s at relaxed / normal / fast; the virus's first attack waits 1.6 beats). The row (or crew avatar) whose turn just played lights up, the bars move with each turn, and every hit has its effect (a crewmate's on their row). When one attack hits everyone, only one hit sounds. The cycle timer waits meanwhile. (Scripts and tests still resolve a cycle at once.)
- **MMO-style, not ARPG-style.** A normal virus gets only +25% Integrity per extra player (`CREW.hpPer`); its hits stay their solo size. So a party makes normal fights easy, just not over before their mechanics show: simulated (planner bots, Tuned gear) a level-10 fight costs a solo player about 44% of their Signal, each player in a pair about 11%, in a four about 7%. **Kill XP is split** across the party, plus 10% per extra player (`PARTY_XP`): a pair gets 55% each, a four 32.5%, so grouping is a little better per hour, not the only way to level. Drops stay personal.
- **Elites** are the true group content: a third of a Pit's folders (the trunk server is a Pit too) hold one, marked *elite* on its folder and its bar. ×5.2 Integrity, ×1.3 damage, one more armor chit (`ELITE` in data.mjs), on top of the Pit's 2 levels, and they **don't scale with the party** (`CREW.elitePer` 0): built for four. They pay three times the XP (split like any kill) and roll three times for drops. Simulated: solo never wins, a pair 2–10 in 20, a party of 4 every time.
- If your target breaks before your turn (a crewmate got it), your command goes at the next threat instead.
- Crewmates' hits and breaks show on the board but stay quiet: the sounds are yours.
- A crewmate at 0 Signal is down for the rest of the fight. You going down still ends it. Rewards are yours (the bots keep nothing).
- On the fight screen each kind of crew information has one home. **Health**: a Crew column in the HUD, beside your Signal, a line per crewmate (name, bar with the blinking forecast slice, number; struck through when down; a *drawing fire* tag; lit on their turn; hover for their command). **Where they aim**: their avatar on the part's rail. **What happened**: the damage number on the part, their avatar's lunge, and the log, where their lines carry their name.

## The numbers station (station.mjs)

From class level 3, a numbers station, **LANTERN**, breaks into the radio now and then: the first time 4–8 minutes of logged-on time after you reach level 3, then every 20–35 minutes. The broadcast goes to the pager (and plays as a numbers transmission with Sound on):

`LANTERN LANTERN · VANTA-SINK-36 · 05 13 02 05 18 · 47`

It names a server in clear and spells a word in numbers, two digits a letter (01 = A … 26 = Z), then two digits. The word plus the digits (`ember47`) is the password to a **dead drop**: a locked `/drop` folder at that server's root, up for 15 minutes of logged-on time (it waits while you're inside it). It holds `cache.dat` (40 + 12×level credits) and `kit.bin` (a protocol at that level: 85% Tuned, 15% Custom). A wrong password costs 3 Signal like a vault. The drop goes on a traced server you can reach (never a rogue one), or on SPRAWL-00 if you haven't traced any; one drop at a time. Missing one costs nothing. On the map the server gets an antenna mark, and its card shows the numbers and the minutes left. `developer station` broadcasts one now.

## The Halcyon store

Opens with the Contractor letter. Two shelves:

**Halcyon's own line**, always there:

| Item | Price | Needs |
|---|---|---|
| Relay | 120 + 8L credits | Probation |
| Deductible (survival protocol): the first attack that lands on you each fight does nothing | 30 Indemnity | Contractor |
| Subrogation (offense protocol): when a part hits you, your next skill hit on it deals double | 45 Indemnity | Trusted |
| Actuarial Model (utility protocol): veils and blinds can't hide attack timers from you | 45 Indemnity | Trusted |
| Total Loss (offense protocol, the top weapon): when you break a part, every other part takes a quarter of its max Integrity (armor soaks it as usual); breaks it causes do it again | 80 Indemnity | Preferred |

The four chase protocols are **Indemnified**: rolled at your level with bigger stats than Custom (×1.45 main, two secondaries at ×0.85) and a signature effect nothing else has. One of each loaded at a time, like Zero-days.

**Agency stock**, resold through Halcyon from other agencies (Kestrel Underwriting, Norrland Re, Blue Ledger Security, Mimir Actuarial, Quayside Claims, Vesper Risk): four slots, each turning over on its own clock (40–150 minutes), each with a supplier, a price that drifts up to 25% either way from its usual (▲ above, ▼ below) and a small quantity. Possible stock: refurbished relays, key crackers (reveal a found server's vault key, from its map card), trace injectors, Signal patches, hot-swap kits (full Integrity), code lots, Exploits, salvage, sealed Custom protocols, and from Contractor, sealed blueprints and daemon images.

## Salvage

Salvage works like mana in Magic: most costs take **any** salvage, and a few also need a **specific** piece.
- Breaking a part can drop its piece (Pulse Kernel, Cipher Seed, Signal Key, a guard's Sentry Lens…). Scrapping protocols, spare blueprints and daemons, and store lots give plain Scrap, which only ever pays the generic part.
- Your salvage shows as stacks on the Craft page; pieces some recipe asks for by name are marked.
- Costs:

  | Build | Salvage |
  |---|---|
  | Protocol (compile) | 4 salvage |
  | Zero-day (compile) | 6 salvage + 2 guard components (Sentry Lens, Tracker Core, Sentinel Lens, Lockout Relay, Crawler Maw, Brood Seed, Shredder Blade, Grinder Core) |
  | Siphon / Scraper / Tap harvester | + 1 Replication Seed / Cipher Seed / Signal Key (on top of credits and code) |

- **Choosing what pays.** Every build button opens a picker with the stacks and a − / + for each. It starts filled with a sensible default (plain Scrap first, then pieces no recipe asks for, then the most plentiful), and Build lights up once the payment covers the cost. On the command line: `compile crit pay scrap:2,pulse-kernel:2` (without `pay`, the default is used).

## Outposts

A server you've taken over can run a **harvester**: a packaged virus that works for you there.

- **Getting one.** Mostly you craft them on the Craft page, one per kind (200 credits, 15 code and 5 salvage, plus its seed: Siphon uses Worm code, Scraper Cipher, Tap Kernel). Compiled harvesters are Stock, at your server level. Rarely (12% of vaults, twice that on Legacy sites) a vault holds a packaged native (`<family>.vx`): pull it and jack out. Only these can carry traits. The rack holds 6.
- **A harvester is a kind, a level and 0–2 traits** (Stock none, Tuned one, Custom two).
  - Siphon: a steady flow of the server's code (1 + level/10 an hour, storage 6 + level/2).
  - Scraper: a loot roll every 90 minutes, 4 stored. Rolls are credits, code, salvage or, rarely, a protocol.
  - Tap: a small trickle (0.5 + level/20 an hour), noticed a quarter as often.
  - Traits: Rich (+50% yield), Deep (double storage), Quiet (noticed half as often), Sturdy (half the time an invasion gives up on its own), Lucky (better loot rolls).
- **Site traits** are fixed when a server is found (45% have one): Rich (+50% yield), Legacy (better loot rolls; its vault more often holds a package, and a better one), Backbone (no bandwidth), Hostile (twice the invasions, +50% yield), Hardened (its natives are Armored).
- **Harvester slots** (pips on the server card and the outpost) limit how many outposts run at once: 1, plus 1 every 10 server levels (5 at most).
- **Production runs in real time, offline too,** up to the cap. Connecting to the server collects it. Degraded mode pauses outposts.
- **Pulling out** gives the harvester back with what it holds; the slot then resets for 30 minutes.
- **Invasions.** Natives notice an outpost about every 6 hours (by kind, traits and site), real time, so logging off doesn't dodge them. You then have 10 minutes of play to **Defend** it (a home-style fight at the server's level): its timer only counts down while you're logged on, so one that starts while you're away waits for you. An outpost produces nothing while it's invaded. If you don't:
  - the outpost goes into **lockdown** for 2 real hours: no harvesting, but its stockpile is kept;
  - the server and everything past it stay open (nothing is ever cut off).
- **Retake** it (beat the natives there) to end a lockdown sooner. In a consortium, the virus that won moves on along the trunk line (see Consortium).

- **Modules.** Each outpost has **module slots** (pips), like your server's service slots: 2, then 3 at server level 20 and 4 at 35. They belong to the server, so modules stay when you swap or pull the harvester (and sleep while the outpost is in lockdown). A module costs 150 credits, 8 of the server's code and 5 salvage; removing one gives half the code back.

  | Module | What it does |
  |---|---|
  | Pipeline | +50% yield |
  | Storage Array | Double storage |
  | Firewall Node | Invasions and swarms here take twice as long to take it |
  | IDS | Natives notice it half as often; swarms heading here are seen 50% sooner |
  | Honeytoken | Draws trouble, for when you want more fights: noticed twice as often, swarms come twice as often and pick it first, infestations come sooner and pick it first. Beating them here pays double (a stopped invasion: an hour's harvest and a kill's XP; an infestation: two hours instead of one; a swarm: double code and XP) |

- **Home services for outposts:** Edge Router (+1 / 2 / 3 harvester slots, Worm code) and Scheduler (collects every outpost every 60 / 30 / 15 minutes, real time, offline too; Kernel code). Both are blueprints you find.
- **Server architecture** (server level 20, like a Master of Orion 2 government). Free to pick the first time; rebuilding as another costs 1,000 credits, between fights.

  | Architecture | Trade |
  |---|---|
  | Fortress | Wall rating +25%; harvesters yield 25% less |
  | Hub | +2 harvester slots; wall rating −15% |
  | Lab | Crafting costs 30% fewer credits; outposts are noticed a quarter more often |

- **Infestations.** Every so often (two hours, divided by how many outposts you run, a Honeytoken counting three; never under 40 minutes, 20 with a Honeytoken) a pack of 2–3 wild viruses moves into one outpost, at its level and one layer deeper. They stay 20 minutes. **Clear** them one fight at a time (`outpost clear <server>`) and the stockpile gets an hour's worth of yield on top, plus XP. Ignore them and they leave; nothing is lost.

Commands: `outpost install <server> [n]`, `outpost mod|unmod <server> <module>`, `architecture fortress|hub|lab`, `outpost pull|defend|retake <server>`, `outpost compile siphon|scraper|tap`.

## Configs

Every service can run one **config**: a side-grade that changes how it works, not how big it is. Swapping is instant and free, but only between fights (the Server page shows a Config row on each running service that has them).

| Service | Config | What it does |
|---|---|---|
| Firewall | Stateful | Wall rating +20%; invasions it stops leave nothing behind |
| Firewall | Reflective | Invasions it stops drop their family's code as well |
| Firewall | Deep Inspection | Invasions it stops add lead progress toward where they came from |
| Firewall | Adaptive | +40% against the family that hits you most, −10% against the rest |
| Tarpit | Sticky | Invasions crawl half again as slowly |
| Tarpit | Toll | Invasions reach your wall worn down to 80% |
| Tarpit | Beacon | Invasions from unknown servers add 15% lead as they pass; swarms are seen coming 50% sooner |
| Honeypot | Tar | A part whose attack misses you fires its next one a cycle later |
| Honeypot | Sting | A part whose attack misses you takes a hit back |
| Hot-patcher | Triage | Double repair below half Integrity, half above |

**Getting one.** 8% of vaults hold a config source (`<config>.cfg`). Bank it and you know it; craft it on the Craft page for 250 credits, 15 of the service's code and 6 salvage. A source you already know is 2 salvage.

## Swarms

Once you run an outpost, the network organises against it.
- The first swarm gathers about 45 minutes after your first outpost goes up; after that, one every 90–150 minutes (half that with a Honeytoken out). One swarm at a time. Swarms gather and travel on real time (logging off doesn't dodge them); its timer at the outpost only counts down while you're logged on, and the outpost produces nothing while a swarm sits at it.
- A swarm is 2–4 processes of one family, two levels above the outpost it's after. It usually gathers on an unknown server hanging off that outpost.
- You see it coming: the pager goes off, and the Map shows it moving in with its size and time to land (10 minutes; 15 with a Tarpit Beacon).
- **Intercept** on the way or **Defend** once it arrives (`swarm engage`): each fight kills one process, and the timer waits while you fight (a paused fight, or one left open over a reload, holds nothing).
- Once it arrives, it gives you 8 minutes. Processes still there when that runs out put the outpost in lockdown (Sturdy doesn't save it): retake it to end it sooner.
- Break the whole swarm for its haul: code from every process, a salvage core per process and bonus XP.
- Degraded mode pauses swarms like everything else on the network.

## Threats at a glance

Three kinds of threat, two things they leave behind, four things you do. The specifics go in the name: *Invasion at your wall*, *Invasion at nyx's outpost on VANTA-RELAY-80*, *Swarm from LANTERN at your outpost on …*, *Swarm from Kestrel at KESTREL-DC-NORTH*.

| Word | Means |
|---|---|
| **Invasion** | One attacker comes for a wall or an outpost (yours, or a consortium member's). It travels, then sits at its target on a timer. |
| **Swarm** | Several processes come for an outpost or a hub you hold, one fight each. It travels, then sits at its target on a timer. Natives send them, and so does a Hostile faction. |
| **Infestation** | A pack of wild viruses settles into one of your outposts for a while, then leaves. Optional: clearing it pays. |
| **Lockdown** | What an outpost or hub goes into when an invasion or swarm runs out its timer: it makes nothing until it ends. Never lost for good. |
| **Crash** | What a server suffers when its wall falls: yours goes Degraded (rebooting); a member's is rebooting and open to clear. |
| **Intercept** / **Defend** | Fight it on the way / at its target. |
| **Retake** | End a lockdown sooner (one fight). |
| **Clear** | Fight out an infestation, or a crashed member's server. |

At a wall, an invasion is **Blocked**, **Contested** (the wall grinds it while it chips you) or a **Breach**, by your wall's strength.

*Logged-on* clocks only run while you're playing; *real* clocks run offline too.

### Your home server

| Threat | Comes from | How often | Its clock | You | Ignored | Beat it |
|---|---|---|---|---|---|---|
| **Invasion at your wall** | A location you've found | First 3 min after your first find, then 6–10 min after the last (logged-on) | Travels 2 min + 1 a layer, then Blocked, Contested or Breach | **Jack in** (`jack in`) | Contested and Breach chip your Integrity; at 0, a crash | A home kill |

### Your outposts

| Threat | Comes from | How often | Its clock | You | Ignored | Beat it |
|---|---|---|---|---|---|---|
| **Invasion at your outpost** | That server's natives | About every 6 h (real) | 10 min to defend (logged-on); makes nothing meanwhile | **Defend** (outpost card) | Lockdown | Kill XP (Honeytoken: + an hour's harvest) |
| **Swarm at your outpost** | 2–4 processes from past it | First 45 min after your first outpost, then 90–150 min (real) | Travels 10 min (real), then 8 min to defend (logged-on); makes nothing meanwhile | **Intercept** / **Defend**, a fight a process (`swarm engage`) | Lockdown | Code, a salvage core a process, XP |
| **Swarm from a faction at your outpost** | A Hostile faction you just struck | Once a strike | As a swarm, in the faction's colours | As a swarm | Lockdown | As a swarm |
| **Infestation** | 2–3 wild viruses | Every 2 h ÷ outposts, never under 40 min (logged-on) | Stays 20 min | **Clear**, a fight each (`outpost clear`) | They leave; nothing lost | +1 h of yield, XP |
| **Invasion on the trunk line** (consortium) | The winner of a lockdown or crash, a level stronger | After a lockdown or crash; up to 3 hops | Arrives in 10 min as an invasion at an outpost | **Intercept** (`consortium intercept`) | An invasion at that outpost | Bounty, +50% a hop |

Lockdown here: 2 h (real), no harvesting, the stockpile kept, nothing past it cut off. **Retake** (`outpost retake`) ends it sooner.

### Hubs you hold

| Threat | Comes from | How often | Its clock | You | Ignored | Beat it |
|---|---|---|---|---|---|---|
| **Swarm from its old owner** | The faction, while Hostile | 30 min after the capture, then 2–4 h (real) | Travels 10 min (real), then 8 min to defend (logged-on); earns nothing meanwhile | **Intercept** / **Defend**, a fight a process (`hub defend`) | Lockdown | Code, salvage, XP |

Lockdown here: until you **Retake** it (one fight, `hub retake`). No income; the hub is still yours.

### Consortium members' servers

| Threat | Comes from | How often | Its clock | You | Ignored | Beat it |
|---|---|---|---|---|---|---|
| **Invasion at a member's outpost** | Its natives | Every 10–18 min (logged-on) | 8 min | **Defend for a bounty** (`consortium defend <server>`) | Half the time a member stops it; else lockdown (no dividend, 2 h) | Bounty: credits, code, XP |
| **Invasion at a member's wall** | A virus at it, while they're away | Every 15–25 min (logged-on) | 8 min | **Defend** (`consortium defend <handle>`) | Half the time a member stops it; else a crash (rebooting 2 h, its outposts pay no dividend) | Bounty |
| **Invasion on the trunk line** | The winner of a lockdown or crash | After a lockdown or crash; up to 3 hops | Arrives in 10 min as an invasion at an outpost | **Intercept** (`consortium intercept`) | An invasion at that outpost | Bounty, +50% a hop |

A member's lockdown: **Retake for a bounty**. A member's crash: **Clear** every folder for a bounty.

## Invasions and the wall

The idle layer. While you're logged on, the locations you've found send viruses back along the network to your server, **one at a time**. On the Map an invasion moves in from its location; the Server page's **Wall** card and the top bar say what it's doing.

- **When.** The first sets out 3 minutes after you find your first location; the next 6–10 minutes after the last one is dealt with. Only logged-on time counts: a closed game, hidden tab or sleeping laptop doesn't advance the network (a long gap counts as 5 seconds).
- **Who.** A virus of the location's family (CRYPTJACK, SPLINTER or GHOSTROOT) at the location's level; from level 3, sometimes mutated (10% stronger).
- **Travel.** 2 minutes from a layer-1 location, a minute more per layer. A Tarpit slows it.
- **The wall.** Your wall's rating (100 × the server's power × the Firewall's version) against the invasion's strength (100 × its power):

| Rating vs invasion | Result |
|---|---|
| 20% or more stronger | **Blocked** at the wall: 25% of a kill's XP and 1 salvage |
| Within ±20% | **Contested**: the wall wears the invasion down (4–20% of it a minute) while it chips your server (0–1% of max Integrity a minute); the stronger your wall, the faster it grinds and the less it chips. Ground to nothing counts as blocked. |
| 20% or more weaker | **Breach**: it chips 1% of your max Integrity a minute until you deal with it |

- The Wall card says it in levels: *"Your wall blocks invasions up to level 12 and contests level 13–22; above level 22, they breach."* A new Firewall (or version, or server level) takes effect at once, even on an invasion already at the wall.
- **Jack in** (`jack in`, or the button): fight the invasion at the wall yourself. It's as worn down as the wall left it, its armor is intact, and it's a full home kill (XP, code, drops, lead). You can't jack in from a run: jack out first. A waiting gate intrusion steps aside and comes back when you next `engage`. There's no daemon that jacks in for you.
- A chip never ends a home fight you're in (it stops at 1), and nothing chips while you fight the invasion.

### Crash and Degraded mode

At 0 Integrity (a lost home fight, or a breach chipping you out) the server **crashes and reboots at half its max**, then runs **Degraded** for 10 real minutes (it keeps counting with the game closed):

- your wall is down: an invasion at the wall waits, and no new one sets out;
- installs pause (the queue picks up where it was);
- the server earns no XP.

You can still fight, explore and level. Crashing again restarts the 10 minutes. The top bar, the Map and the Server page show the time left.

**In a consortium, while you're logged off** (played out a minute at a time when you come back, up to a day):
- invasions keep coming, at half the pace, and your wall meets them as usual: blocked, contested or breach. The server card's **Away** line says what your wall blocks and holds, next to the highest level your servers send; a Firewall is how you raise it;
- now and then a member steps in and stops one at your wall;
- a crash while away reboots the server for **2 hours** (Degraded, same rules), and the invasion **occupies** it: HOME shows on your server card with *Connect*. Its processes sit in six folders (services, daemons, vault, logs, cache, wall) and don't come back; clear them all to be back online at once. The virus then moves on along the trunk line;
- your outposts can be invaded while you're away too (half as often); members sometimes stop those invasions, otherwise it's a lockdown.
Solo, nothing happens while you're logged off.

Testing: `developer invade` (an invasion arrives now), `developer crash`, `developer reboot` (ends Degraded mode).

## The fight in one paragraph

A virus is its parts: a basic attacker and a signature part. Each part wears **armor chits**, and a hit on armor does no damage, however big: it breaks one chit. Strip a part with small hits, then finish it with a big one. Every part owns one heavy, telegraphed attack, and your command always resolves first, so a part you break on the cycle it would fire never fires. There's no drain: only attacks cost you anything, so a well-planned takedown costs nothing. Leave a part bare too long, though, and it patches a chit back.

## Rules, one per layer

| Layer | Rule |
|---|---|
| Win | Reduce Virus Integrity (the sum of all parts) to zero. |
| Parts | Two per virus, each with one attack shown on the timeline (rare and heavy: every 3–5 cycles). Breaking a part stops its attack; 35% of the time it leaves its loot as salvage. |
| Armor | Chits on a part (◆; a part wearing 2 or more wears half again: 2 → 3, 3 → 5). A hit on an armored part does no damage and breaks one chit; a heavy hit from your command (40+ base: Overload, Shatter, a due Kill Process…) breaks two, and Kill Process always breaks two. Burn ticks, helper hits and each target of a spread hit count one chit each. A part with no chits left patches one back 5 cycles later (`CONFIG.patchDelay`), unless you break it first. Armor-piercing hits (Backdoor, Bypass) go straight through, at a longer cooldown. |
| Patch | Two cycles after a part loses its last chit, it patches one chit back, unless you've broken it. The timeline shows the patch (◆ patch) in the column where it happens. |
| Veiled | Ghostroot and the Sentinel hide a part's attack timers while it still has armor. Strip it, or Tag it, to see them. |
| Stakes | Damage is the only threat: your server's Integrity at home (0 = crash: reboot at half, Degraded mode), your Signal on a run. Nothing takes your credits, files or trace. Each family hurts you its own way: Ransomware encrypts (damage every cycle that stacks until you break the Encryptor), Worm spawns fragments that gnaw every cycle, Ghostroot blinds you (every timer hidden for a couple of cycles, and hits that land while you're blind deal +25%). |
| Time | One command per cycle, and entering it turns the cycle at once (so the pace is yours). If you don't, a cycle lasts 12 seconds by default (speed setting: relaxed 12s, the default; normal 8s; fast 5s; `speed <name>` or the button in the top bar). Press Enter on an empty line, or type `now`, to resolve the cycle now. Rules count cycles, so speed never changes balance. Order: your command, then burns and helpers, then encryption, then attacks due that cycle, then patches. No attack lands on cycle 1. |
| Crits | Every hit you land that does damage can crit for ×1.5 (5% base, plus Crit and Crit Damage from protocols). Enemy damage attacks crit too, 10% of the time, from enemy level 3. Timeline numbers show the normal hit, after your Block. |
| Misses | Your damaging skills miss 5% of the time against a same-level enemy, +1% per level it's above you, −1% per level below, less your Accuracy; the HUD shows *you miss N%*. A miss does nothing, and the skill's cooldown is still spent. Enemy damage attacks miss you the same way from their side, plus your Evasion. Burns, helpers and utility skills never miss. |
| Clean | A fight where nothing got through (no damage, encryption included) says so. That's the reward: nothing to repair. |
| Idle | If you type nothing, you Spike the last part you hit. It stops when that part breaks. Type `hold` to do nothing. |
| Delays | Only Bastion (Suspend, Quarantine) and Operator (Jam) can push an attack back. Breakers answer with Brace and faster kills, Infiltrators with Null Route. |
| Weak point | Found with Scan (Infiltrator, level 11). It takes +50% damage. When it breaks, a new one forms on another part. |
| Backtrace | Each class traces its own way, from level 10, at home and on SPRAWL-00: Breaker +6% Uplink per crit it lands, Bastion +10% per attack that reaches it and does nothing (a shield soaks it all, a chit, a dodge), Operator +2% per helper hit, Infiltrator Traceroute (+25% a use, cooldown 2). Passive gains land as one line at the end of the cycle. Trace protocols start each of those fights partly traced. 100% before the kill locates the origin; less saves a partial lead. |
| Encryption | Each Encrypt adds its amount to a stack; the stack hits you every cycle (after your command and helpers, before attacks). Breaking the Encryptor recovers the key and clears it. Your armor chits and Lockdown stop an Encrypt; shields soak the per-cycle damage; Rollback wipes the stack. |
| Blind | Every attack timer is hidden for a couple of cycles, and damage that lands on you meanwhile deals +25% (Blindside). Tagged parts still show theirs. Chits and Lockdown stop it. |

## Levels

Two kinds, so a new player never faces everything at once.

- **Hacker level (yours, per class, 1–50).** A long, WoW-style climb. Every class starts at level 1 with Spike and one skill, and levels on its own. **Every level adds 4% power**: your damage, heals, shields and Signal grow (Spike hits 25 at level 1, 44 at 20, 74 at 50), and skill text shows your current numbers. Skills unlock one at a time: level 1 your first skill, 3 your second, 5 your third, 7 your fourth (the class's answer to armor: Crack, Retaliate, Backdoor, Botnet), 10 your class's Backtrace (a passive), 14/18/22 skills five to seven (the bar is full at 22), then one more every 4 levels from 26 to 38. Past seven you choose which seven to equip.
- **XP (WoW-style):** a kill is worth 20 + 10 × the enemy's level: a home defense 1×, a guard 0.8×, cracking a vault 1.5× and your first run on a location 0.7× (at the location's level). Enemies above you give up to 25% more; each level below you takes 10% off, so ten levels below give nothing. Level L to L+1 takes about 5 + 1.2×L kills of your own level (6 at level 1, 27 at 18, 64 at 49): an MMO-length climb of about 1,700 fights to 50.
- **Talent points:** one every other level from 10 (21 by level 50, a full tree).
- **Server level (shared, 1–50).** It gets every point of XP any of your classes earns, plus 10 per banked item and 1 per 10 credits banked, on the same curve, so it keeps pace with your best class (and pulls ahead with alts). Its level sets its base Integrity (100, +4% a level), opens daemon slots (+1 at 10 and 20), adds a service slot every 8 levels, and opens service v2 (10) and v3 (25).
- **Enemies have a level (1–60).** Home intrusions come in at your level (random ones sometimes one higher). A location keeps the level it was found at (your level then, +2 per layer down): its guards, vault protocols and code caches are that level, so old locations get easier as you outlevel them. Their size and damage grow 4% a level like yours (a level-1 virus is gentler: 80% of a level-1 match, ramping to 100% by level 6). Mutations and enemy crits from level 3; more armor chits at 3, 7 and 10. Enemy levels are colored WoW-style: red (5+ above you), orange (3–4 above), yellow (about even), green (below), grey (10+ below, no XP).
- **Level gap (WoW-style):** one level up is about even. Past that, each level an enemy has over you takes 7% off everything you deal it (never under 40%) and adds 10% to everything it deals you (`CONFIG.gap`), so orange (3–4 up) is a real fight and red (5+) a gamble: simulated, a geared level-5 player beats a level-9 virus about half the time, and a level-11 one almost never. Below you it goes a little the other way (3% a level, up to +15% dealt and −30% taken).
- **Misses (Classic WoW):** 5% of your damaging hits miss a same-level enemy, +1% per level it's above you, −1% per level below (never under 0); your Accuracy takes some off. It misses you the same way the other direction, plus your Evasion.
- The top bar shows your level; the Map shows the server's. The tray shows the next unlock as a ghost key. Testing: `developer level <n>`, `developer server <n>`. Saves from the 1–25 scale keep what they'd unlocked: a class's level roughly doubles, and the server matches your best class.

## Classes and loadout

Pick a class on the Loadout page (`archetype <id>`). Your bar has up to 8 keys, shown only once you've unlocked them:

- **Key 1 (everyone):** Spike, the free hit that repeats when you give no order.
- **Keys 2–8:** your seven equipped class skills (`equip`, `unequip`). Run skills (Spoof, Tap) take a slot too and are used on runs. There's no shared Interrupt or Trace: delaying attacks belongs to Bastion and Operator, and each class traces its own way (Backtrace).
- **Each skill is simple, with one twist**, WoW style: a **burn** (damage every cycle: Inject stacks, Thermal Runaway grows, Purge heals you as it ticks), a **proc** that lights a key for a cycle or two (Shatter after you strip a part, Overload resetting on a crit), a **reactive** skill (Retaliate after you're hit, Opening after an attack misses you), or an **execute** (Segfault ×3 under 30%). Combos: Exploit then Overload for crits, Firewall then Retaliate, Inject ×3 then Detonate, Deploy then Barrier or Jam.
- **Passives** are always on: Breaker Momentum (each part you break: +10% damage for 2 cycles, up to 3 stacks; another break adds a stack and resets the 2 cycles), Bastion Hardened (you start each fight with an armor chit of your own: the first attack on you does nothing), Infiltrator Ghost (on a run, `slip` walks past one guard without a fight: no XP or drop, and it's back on guard next run; every fight opens with a Surprise window, see The Sync Window; return trips on runs are free), Operator Extra thread (+1 daemon slot).
- **Statuses** anyone's hits cash in: Exposed (+25% crit chance, 2 cycles, Breaker), Tagged (burns tick +50% and its timer shows even if veiled, Infiltrator), Throttled (its attacks deal half) and Quarantined (+25% damage while its attack is held, Bastion), Hooked (+6 on every hit, helpers and burns too, Operator). Operators run at most 6 helpers at once.
- **Talents:** each class's tree has six rows. Three **choice tiers** (pick one of two) with a **ranked row** before each (two nodes, up to 3 ranks each: small bonuses). A row opens once you've spent enough points in the rows above it: ranks 0, tier 1 needs 3, ranks 4, tier 2 needs 8, ranks 9, tier 3 needs 14. Changing picks and ranks is free at home. Commands: `talent <1-3> <a|b>`, `talent add|remove <node>`, `talent reset`.
- Loadouts change at home only.

## The Sync Window

On **25% of cycles**, a window (10% of the cycle, about a second at normal speed) opens early on the Now column's cycle bar, always inside the first half, at a new spot each time. It's forgiving: a press a little early or late (up to 3% of the cycle either side) still counts. The **Sync** protocol stat (a Utility stat; Phaselock protocols lead with it) adds to that chance, up to +50%. It lights up while the bar is inside it. Fire your command then (Enter, or a key) and it **syncs**: +10% damage, plus your class's sync bonus:

| Class | Sync bonus |
|---|---|
| Breaker | An extra armor chit cracks on the part you hit |
| Bastion | +8 shield |
| Infiltrator | +10% Uplink trace |
| Operator | Your helpers each hit once more |

**Infiltrator Surprise.** For an Infiltrator the first cycle of every fight always opens a wider window (15%), glowing blue instead of yellow. Fired in it, on top of the sync bonus: Inject lands an extra stack, Tag lasts 6 cycles and its burns tick +75% (not +50%), and Traceroute adds 50% trace (not 25%).

Auto-repeat (the cycle running out) and later steps of a `;` plan never sync. The window's spot comes from the fight and the cycle, not the game's dice, so it never changes other rolls.

## Planning ahead

Separate commands with `;` to plan up to 3 cycles: `exploit encryptor; overload encryptor; spike pulse`. The plan shows across the *You* row (dashed = later cycles). A new command always replaces the whole plan; `cancel` clears it. Later steps check cooldowns when they fire, and a step that can't fire is skipped with a warning.

Who acts in a cycle, in order: **your queued command (or, with nothing typed, a Spike on the last part you hit) → your daemons that are ready → burns and helpers → the virus.**

## Daemons

Daemons are programs you **find**: a `daemon.exe` waits in 10% of vaults (fixed per location), guards drop one 1% of the time (into your pack) and home kills 0.25%. Finding one you already have **upgrades** it (v1 → v2 → v3: its numbers ×1, ×1.5, ×2, and they grow with your power); past v3 it's 3 salvage. A daemon you find isn't slotted for you: you choose on the Daemons page.

A **slotted daemon acts on its own cooldown, in addition to your order**, right after you act. Its chip sits on the *You* row in the cycle it acts next. The once-per-fight daemons wait for their moment. **Slots:** 1, +1 at server level 10 and 20, Operators +1. Commands (between fights): `daemon list`, `daemon slot <name>`, `daemon unslot <name>`, or the Daemons page. No daemon jacks you in or out.

| Daemon | What it does (v1) | Cooldown |
|---|---|---:|
| Sweeper | Hits the part whose attack lands soonest for 10. | 4 |
| Fuzzer | Breaks an armor chit on an armored part. | 5 |
| Tracer | +10% Uplink if the cycle stays quiet (home fights). | 3 |
| Mender | Heals you 8. | 5 |
| Spider | A burn of 4 for 3 cycles on the part you last hit. | 5 |
| Mirror | Hits the part you last hit for 12. | 3 |
| Watchman | Once per fight: delays an attack of 20 or more by a cycle. | once per fight |
| Canary | Once per fight: a 15 shield the first time you drop below half. | once per fight |

`jack out` during a guard fight is an emergency escape: it resolves on your turn, you keep your pack, and the guard stays.

## Feedback language

Every kind of event has one signature: a flash on the thing it happened to, a floating number, an optional sound, and a vibration on phones that support it (Android browsers). Settings: speed, sound (on by default; browsers start it at your first click or key), motion, vibration.

**Sound** is recorded CC0 samples (Kenney impact, interface and UI packs; mechanical keyboard takes; credits in `dist/sfx/CREDITS.md`) layered with a little synthesis, in a tactile old-hardware palette: punches and metal for hits, relays for the clock, mechanical keys on the prompt, a modem for daemons and connecting, all through one small room reverb. Each play picks a different take and nudges its pitch, so repeats never sound identical. With Sound on, a quiet room tone runs underneath (a CRT's mains hum, a fan, and a hard drive seeking now and then), and it goes silent when the tab is hidden. Until the samples finish loading (or if they can't load), synthesized stand-ins play.

| Event | Signature |
|---|---|
| You hit a part | its row flashes gold, damage floats up, a punch with a sub thump (heavier for bigger hits), 10ms tap |
| You break an armor chit | its row flashes gold, −◆ floats up, a light clink of plate, short tap; once its last chit is gone the row shows faint cracks until it patches |
| A part patches a chit back | its row pulses red, +◆, the cracks disappear, a rising two-note re-lock and a tin clack |
| A part breaks | bright flash, BROKEN, metal giving way, glass scattering, a sub drop, triple pulse |
| You get hit | your bar shakes red, the screen edge glows red, a heavy dull body blow, 80ms buzz |
| A delay (Suspend, Quarantine, Jam) | the row glows teal, DELAYED, a swing and a glancing clang, short tap |
| Time passing | the Now column is a faint band down the whole board with a thin playhead line that sweeps across it as the cycle runs; the header shows the cycle number and seconds left |
| About to land (1.5s left) | the playhead and band edges turn red; this cycle's attacks blink red, soft beep, one buzz |
| A cycle ends | the timeline turns over: every chip slides one column left from where it was; an attack that landed flies at your bar, your command flies at its target, and new attacks drift in from the right; the Now band flashes and the cycle number ticks; a quiet clock-relay tick (all off when Motion is off, except the tick) |
| A contested or breached wall bites | the Integrity meter flashes red with the amount, 8ms tap |
| Jack in at the wall, or connect to a server | a teal flash, a short glitch, a modem handshake and a relay, a double tap |
| Jack out | a relay lets go and the line dies away |
| Typing | a mechanical key per keystroke, a heavier Enter; buttons click like hardware |
| Something happens out in the world (a letter, an offer, a contract ready, the retainer, a flag, a location, an invasion) | the **pager** on the top bar logs it: its screen scrolls the line, its lamp blinks until you open it (red for a breach), it rattles and chirps (quiet ones only light up; mid-fight only a breach chirps), and a short vibration |
| A daemon acts | your row glows violet, soft tick |
| A skill lights up | its key glows gold and pulses; a soft chime |
| Command refused | the prompt shakes, buzz |
| Win / crash | big flash / red screen edge, long buzz |

Leaving the combat screen pauses a live fight; coming back resumes it.

## No explanations on screen: first-time tips

The screens carry names, numbers and state, never how-to text. Rules live in two places, the way RPGs and strategy games keep them:

- **Hover** for reference: a stat, a status tag, a mutation or quirk, a service's "special" tag, a skill in the library, a talent, a wall band. Each shows its rule on hover.
- **First-time tips** for learning: the first time something is on screen (your server, an intrusion, the timeline, armor chits, an invasion, the wall, a protocol drop, code, a mutation, a quirk…), a small tip points at it and says how it works, once. One tip at a time. Tips in a fight pause it until you close them (Got it, Enter on an empty line, Esc, or clicking the thing it points at). "Turn tips off" on any tip, or on the System page, stops them; **Replay tips** there shows them again. Seen tips are kept with your settings, so a new game doesn't repeat them.

The log and the terminal still speak (that's the MUD's voice): what happened, in a line. They don't teach.

## The pages, at a glance

Pages show instead of explaining; the words are in the hover.

- **Wall: a level ruler.** Teal for invasion levels your wall stops, amber for the ones it contests, red hatching for the ones that break through, with your level marked on it and the incoming invasion too. The Server page has the full ruler with its numbers; the map's server card has a thin one, and in a consortium a second thin one for while you're away.
- **The map's server card:** the server's level bar, an Integrity bar, credits, salvage and servers found as icon counts, the wall ruler, and service and harvester slots as pips. An install in progress shows as a small bar.
- **Craft:** every recipe shows what it takes as chips, an icon and *have/need* each (teal when you have it, red when you're short). Protocols, Configs and Harvesters each fold, a one-line purpose under each title; what you fold stays folded. Materials are a grid of counts (the Server page uses the same grid).
- **The sidebar** (left, on every page, fights included; screens 1100px and wider; `sidebar off|on`): your crew (class, a Signal bar each, live in a fight, the same rows that flash when they're hit; *Find a crew* when you're solo), then what the page is about: on the Map, the selected node's card (the map gets the full width); elsewhere, what needs you (unhandled comms with their buttons). In a fight the sidebar is just the **Party**: each crewmate's Signal bar (with what this cycle's hits will take off it) and what they mean to cast this cycle, the skill in its verb's colour and the part it's aimed at (*last* if they sent it to the back; it lights up when their turn plays). Your own bar, Status and the virus stay on the HUD.
- **The expected damage and chits** (the white blink on a part's bar, the chit about to go) follow what you're typing: type a different skill at a part and the board shows what that one would do, before you press Enter. A heavy hit shows two chits going.
- **Map:** a server's level is the big number under it in WoW colours (how hard it is for you), its layer a small teal tag (L2, L3); names can show only on hover (**Aa**, or `map names hover|on`). Scroll zooms around the cursor (up to 5×; labels stay readable), drag pans, double-click or ⤢ zooms out.
- **Consortium:** members sit on one grid: online dot, name (a teal edge and a runner icon if they're in your crew, ★ for the founder), class and level, outposts, servers, and where they are (click it to see that server on the map). The dividend is a table, one row per member outpost: whose, which server, what it yields, how much an hour, and how full its share is.

## Factions

Five PvE factions, companies and hacker crews, each with a colour, a mark and a hub on your map (`factions.mjs`). Halcyon is the first of them: its standing is its rep, its retainer and store work as before.

| Faction | Kind | Colour | Hub (level) | Allies | Rivals | Goods (on top of the wares) |
|---|---|---|---|---|---|---|
| Halcyon Mutual | company | blue | HALCYON-CLEARING-01 (1) | Kestrel | GLASSJAW, NULL CHOIR | its store (instant, and the only place for heals) |
| GLASSJAW | company | magenta | GLASSJAW-ANNEX-07 (8) | — | Halcyon, LANTERN | key crackers, sealed items, blueprints |
| Kestrel Underwriting | company | green | KESTREL-DC-NORTH (4) | Halcyon | NULL CHOIR | relays, trace injectors, daemon images |
| LANTERN | hacker crew | orange | LANTERN-RELAY-88 (6) | NULL CHOIR | GLASSJAW | broadcast schedules (a dead drop now), key crackers, trace injectors |
| NULL CHOIR | hacker crew | rose | NULLCHOIR-SQUAT-13 (12) | LANTERN | Halcyon, Kestrel | daemon images, sealed items, key crackers |

- **Rep** runs −100 to 100 with five tiers at 1/25/50/75 (each faction names its own: Kestrel's are Blacklisted, Prospect, Client, Account, Key account). Below 1 a faction is Hostile: its market is shut and it posts you no work. Hostility has depth: rep keeps falling under zero, down to −100, shown as a red segment before the tiers (Halcyon's standing stops at 0). Rep never comes back on its own: win a faction back by hitting its rivals (the ripple), working for its allies, or donating. Everyone starts at 10 (GLASSJAW at 5).
- **Ripples:** whatever rep you gain or lose with a faction, its rivals move half the other way and its allies a quarter the same way. Halcyon's standing ripples too.
- **Hubs** appear on your map when the contract board opens, on a ring of their own between the first two layers (a diamond in the faction's colour with its mark; its rep tier under the name). Its card shows your rep as a five-step bar and its allies and rivals; **Connect** opens the hub page: who they are, their work on the board, their market, and their servers on your map.
- **One market per hub.** Its **wares** (code, Exploits, salvage) are bought and sold at moving prices (see Markets). Its **goods** are the specialty things only that hub sells: buy-only, a few of each, refilled every hour; better tiers buy 5% cheaper per tier from the third, and some goods wait for a tier. Priced at the hub's level or yours, whichever's higher. Everything bought at a hub comes by file transfer, goods included. `buy <faction> <good>` or `market buy <faction> <good>`. Halcyon is the exception: its goods are its store, delivered at once.
- **Work:** once the hubs are up, about half the board (beyond GLASSJAW's off-the-books jobs) is Kestrel's, LANTERN's or NULL CHOIR's: the same kinds of contracts, paying 20% more credits and their own rep instead of Indemnity and Halcyon standing. Their takeover and recovery jobs often point at their rivals' servers. Each offer on the Mail board shows its faction's mark; Mail also shows your tier with each faction.
- **Faction servers:** about one in eight of the servers you trace (never your first two, never rogue ones) belong to Kestrel, GLASSJAW, LANTERN or NULL CHOIR: their colour on the map node, their mark beside it. Opening one's vault takes the server from them: their rep −15, their rivals warm to you (+7).

### Markets

Every hub buys and sells what you farm: Cipher, Worm and Kernel code (base 14 credits), Exploits (140) and salvage (7) (`market.mjs`). The Market card on each hub page shows what it pays and asks for each ware, with an arrow for how far off normal it is (hover it for why).

- **Prices move on things you can't change.** Each hub has its own fixed condition, and one world event at a time touches every hub:

  | Hub | Condition | Effect |
  |---|---|---|
  | Halcyon | Claims backlog | Cipher ×1.35 |
  | GLASSJAW | Black budget | Exploits ×1.5 |
  | Kestrel | Overheating racks | Kernel ×1.8, salvage ×1.25 |
  | LANTERN | Thin bandwidth | Worm ×1.45 |
  | NULL CHOIR | Scrap economy | salvage ×0.6, Cipher ×1.15 |

  World events turn over every 4 hours, never the same twice running: Ransomware outbreak (Cipher ×1.5), Worm season (Worm ×1.5), Patch Tuesday (all code ×0.8), Zero-day rush (Exploits ×1.6), Grid blackout (salvage ×1.5, Kernel ×1.25), Quiet market.
- **Spread and pressure:** a hub asks 15% over its price and pays 15% under (2% better per rep tier above Probation's). Each unit of a lot is priced after its own push, so selling a lot exactly undoes buying it: no round trip ever turns a profit, not even at a hub you hold. Each unit you sell somewhere takes 4% off its price there (each one you buy adds 4%; between 35% and 160% of normal); the pressure eases 12% an hour, offline too.
- **File transfers:** a sale leaves your stock now and its credits arrive when the transfer completes; a purchase is paid now and arrives later. Transfer time: Halcyon 5 min, Kestrel 8, LANTERN 10, GLASSJAW 12, NULL CHOIR 15; each relay on your servers cuts 10% (up to 40%). Transfers in progress show on the hub's Market card and can't be lost. Hostile factions won't trade.
- `market sell|buy <faction> <ware> <n>` (1–99).
- While a hub is wiped offline (see Payloads), the other hubs pay 25% more for whatever its condition was buying.

### Payloads

Viruses you write to hit a faction hub (`payload.mjs`), compiled and deployed from the hub page's Payloads card. They execute on their own when they arrive.

- **Compile:** 60 + 10×level credits, 10 code and 3 salvage. An **Exfil** takes Cipher code and pulls credits plus the code the hub hoards. A **Wiper** takes Worm code and knocks the hub offline. Power is 10 + 2×your level; spending an Exploit arms it (×1.5). You hold three at most.
- **Deploy:** it uploads like a file transfer (same times, relays help). You can't hit a hub that's already offline. A payload that reaches a hub you've taken in the meantime stands down and returns to you.
- **Execution:** power × a roll of ±20% against the hub's defence (12 + 2×hub level, +25% for each recent strike; one step eases every 6 hours). Under 70%, it's **Blocked**. From 70% to 100%, a **Partial** breach does half the job. At 100% and over, it's a **Breach**. Each payload you hold shows its likely band against that hub before you deploy it.
- **Results:**
  - An Exfil on a breach pays 50 + 12×hub level credits and 6 + hub level/2 of the code its condition wants.
  - A Wiper on a breach takes the hub offline for 4 hours (2 on a partial): its market shuts and its map node goes dim.
  - The owner's rep drops 3 when blocked, 6 on a partial and 10 on a breach. The rep ripple warms its rivals.
- **Backdoor** (Kernel code) takes the hub for you, but only if it's offline when the Backdoor executes: Wiper it first, then get a Backdoor in before it comes back up. It shows Blocked until then. A breach captures the hub, costing −40 rep with its owner (the ripple spreads it). Never Halcyon's; two hubs at most.
- `payload compile exfil|wiper|backdoor [exploit]`, `payload deploy <n> <faction>`.

### Hubs you hold

- **Perks:** its market trades at the true price (no spread), its goods sell at 60% with no tier locks, and it earns you a cut of its trade: 10 + 3×hub level credits an hour, times how hot what it deals in is right now (its condition's wares). Real time, offline too; it holds a day's worth. Collect it on the hub page (`hub collect <faction>`). The old owner posts you no work.
- **Swarms from the old owner:** while it's Hostile, it comes for the hub: 30 minutes after the capture, then every 2–4 hours, one at a time. These gather and travel on real time, so logging off doesn't dodge them, but the timer at the hub only counts down while you're logged on (you're never locked down while away). The hub earns nothing while its swarm is out. 3 processes at the hub's level or yours (whichever's higher) +1, in the faction's virus family (GLASSJAW Ghostroot, NULL CHOIR Ransomware, the rest Worm). 10 minutes out, then 8 minutes to defend; Intercept or Defend one process a fight (`hub defend <faction>`), and the timer waits while you fight (not while the fight is paused). Break it for code, salvage and XP. The hub's map node flashes red with the timer.
- **Lockdown:** if the timer runs out, the hub earns nothing until you retake it (one fight, `hub retake <faction>`). You never lose it for good.
- **Striking a Hostile faction** (without holding its hub) gets one answer: a swarm in its colours at one of your outposts.

### Donations

While your rep with a faction is under 24, its hub page offers **Donate**: credits (80 + 10×hub level) and 5 of the code it wants (Halcyon and NULL CHOIR Cipher, Kestrel Kernel, LANTERN Worm; GLASSJAW takes Exploits), all × (1 + depth/10), where depth is how far under 1 you are. +5 rep each, never past 24: trust you earn. `hub donate <faction>`.


## Server memory

Memory is how many servers your network holds at once (`MEMORY` in memory.mjs): 4 at server level 1, one more every 5 server levels. Every server you've found and kept attached takes a slot, rogue ones too; SPRAWL-00 and consortium servers don't. It shows as chip pips on the map's server card.

- **Full memory:** a new find still lands on the map, but **detached** (dimmed). You can't connect to it until you attach it.
- **Attach / detach** from a server's map card (or `attach <server>`, `detach <server>`): 25 + 5 × its level credits, either way, the same every time. Swapping back and forth costs no more than that.
- **Detaching freezes** the server and everything found through it: no runs, its outpost makes nothing, no invasions, swarms or infestations, its timers stop, and it frees their slots. Attach it again and it picks up exactly where it was (nothing is made for the frozen time). A server found through a detached one says so and waits for that one.
- Harvester slots still decide how many outposts run; memory decides how many servers you hold.

## The codex

A virus component's name always shows (so you can target it), but what it does reads **???** (a small ? by its name, ??? on hover) until you've broken one of it yourself. Then hovering its name says what it does, on every virus that has it. The System page lists every component by virus: the ones you've decoded with what they do, the rest as ???. Keyed by strain or family and part (a Ransomware Pulse Node and a Worm one are separate). Breaking a new one flashes DECODED.

## Buyout

Timed builds can be finished now for credits, Master of Orion style (`BUYOUT` in combat.mjs): 3× the credit cost when the timer starts, falling with the time left, never under 20. *Finish now · N* sits by the timer.

- **Installs and upgrades** (`buyout`): the service runs at once. Not while the server is degraded.
- **Outposts** (`outpost buyout <server>`): a lockdown ends (base 250 credits), or a harvester slot that's resetting is ready (base 80).

## The pager

The pager sits on the top bar, between the tabs and your meters (on narrower screens just its lamp and count). It keeps the last 40 world events on your save, so what happened while you were away is still there when you come back.

- Its little screen scrolls the latest line; the lamp blinks amber while anything is unread, red if it's a breach; the number is how many you haven't seen.
- Click it for **Comms**: the list, newest first, filtered by All, Contracts (offers, contracts ready), Mail, Network (flags, relays, locations, invasions, swarms, breaches) or Money (retainer, pay, standing, the store). Each line has its sender, its age and a link to where it happened: the letter or contract in Mail, the server on the map, the Store, or Jack in for a breach. Opening it marks everything read.
- **Handled** lines grey out and clear after 5 minutes: you handled one when you opened what it points at, or ticked it (✓). Lines with nothing to act on count as handled once seen. **Clear** removes everything you've seen.
- An unanswered alert shakes the pager every 10 seconds until you open Comms. A **breach** makes the Integrity meter flash red with a pulsing BREACH badge, and pings every 15 seconds until it's dealt with.
- It chirps for letters, offers, contracts ready, the retainer, flags, locations, invasions and dropped standing; pay for a delivery, rising standing, restocks and takeovers only light it up. While you're in a fight, only a breach chirps.

## The monitor casing

With the immersive shell on a desktop-sized window, the screen sits in a dark monitor (BLACKBOX · MODEL 7). The bottom bezel has two knobs (sound, speed) and labelled lamps that show real state, steady, never blinking:

| Lamp | Lit |
|---|---|
| PWR | amber; red while Degraded |
| GATE | amber with an intrusion waiting, red while you fight one |
| WALL | dim while an invasion travels, amber when contested, red on a breach |
| NET | teal on a run |
| INST | amber while an install runs (dim while Degraded) |
| DMN | teal with a daemon slotted |

System → Casing turns it off; phones and small windows never show it.

## Abilities

Type the name or press its key. Targets accept prefixes: `spike enc`.

| Who | Skill | What it does | Cooldown |
|---|---|---|---:|
| everyone (level 1) | `spike <part>` | 25 damage | — |

Class skills, in the order they unlock. **Lit** skills only work in the cycle or two after their event: Shatter after you break a part's last armor chit, Retaliate after an attack reaches you, Opening after an attack misses you or is delayed. Their key glows while they're lit.

| Who | Level | Skill | What it does | Cooldown |
|---|---:|---|---|---:|
| Breaker | 1 | `overload <part>` | 40 damage. If it crits, its cooldown resets. | 3 |
| Breaker | 3 | `exploit <part>` | Exposed this cycle and next: every hit on it from anyone has +25% crit chance. | 2 |
| Breaker | 5 | `flood <part>` | 30 damage, double on a part with no armor left. | 4 |
| Breaker | 10 | `crack <part>` | Breaks 3 armor chits on it at once. | 4 |
| Breaker | 14 | `brace` | For 2 cycles: +5 Block, and whatever hits you loses an armor chit (or takes 10 if it has none). | 5 |
| Breaker | 18 | `shatter <part>` | Lights up for 2 cycles when you break a part's last armor chit. 55 damage. | lit |
| Breaker | 22 | `segfault <part>` | 30 damage, three times that on a part under 30%. | 3 |
| Breaker | 26 | `fork-bomb` | 15 damage to every part, 30 to an Exposed one. | 3 |
| Breaker | 30 | `thermal-runaway <part>` | A burn that grows: 6, 10, 14, 18. | 4 |
| Breaker | 34 | `sudo` | This cycle and next, every hit you land crits. | 6 |
| Breaker | 38 | `zero-day <part>` | 80 damage straight through armor. Once per fight. | once |
| Bastion | 1 | `kill-process <part>` | 30 damage, +15 if its attack is due this cycle. On armor it breaks 2 chits. | 2 |
| Bastion | 3 | `firewall` | A shield that absorbs the next 20 damage. If it soaks a whole hit, Retaliate lights up. | 4 |
| Bastion | 5 | `suspend [part]` | SIGSTOP: push its attack back 2 cycles. With no part, the attack landing soonest. | 4 |
| Bastion | 10 | `retaliate <part>` | The cycle after an attack reaches you (or your shield): hit back for twice its size, up to 60. | lit |
| Bastion | 14 | `patch` | Heal 10 now, then 5 a cycle for 3 cycles. | 4 |
| Bastion | 18 | `throttle [part]` | Its attacks deal half for 3 cycles. | 4 |
| Bastion | 22 | `purge <part>` | A burn of 6 for 4 cycles; each tick heals you 2. It also clears your encryption. | 4 |
| Bastion | 26 | `harden` | Gain an armor chit: the next attack on you does nothing, however big. | 6 |
| Bastion | 30 | `reclaim <part>` | 35 damage, and you heal half of what it does. On armor it breaks 2 chits. | 3 |
| Bastion | 34 | `quarantine [part]` | Push its attack back 3 cycles; while it waits, it takes +25% damage. | 6 |
| Bastion | 38 | `failover` | Hit every part for a quarter of your missing health (at least 20). | 5 |
| Infiltrator | 1 | `inject <part>` | 10 damage every cycle for 3 cycles. Up to 3 on one part. | 1 |
| Infiltrator | 3 | `tag <part>` | For 4 cycles, burns on it tick 50% harder and its timer shows even if it is veiled. | 3 |
| Infiltrator | 5 | `traceroute` | +25% Uplink trace now (at home and on SPRAWL-00). 100% before the kill finds where the virus came from. | 2 |
| Infiltrator | 10 | `backdoor <part>` | 24 damage straight through armor, +6 for each burn on it. | 4 |
| Infiltrator | 14 | `null-route` | Every attack this cycle misses you, and your next skill crits. | 5 |
| Infiltrator | 18 | `detonate <part>` | Every burn on it deals all its remaining damage now, ×1.5. | 4 |
| Infiltrator | 22 | `opening <part>` | The cycle after an attack misses you or is delayed: 50 damage. | lit |
| Infiltrator | 26 | `propagate <part>` | Copy your burns on it to every other part. | 5 |
| Infiltrator | 30 | `spoof` (runs) | On runs: once per run, the next guarded folder doesn't start a fight. Read and pull one file there. | once/run |
| Infiltrator | 34 | `tap` (runs) | On runs: once per run, print the whole folder tree, its guards, and which file holds the key. | once/run |
| Infiltrator | 38 | `implant <part>` | A burn of 10 every cycle until the part breaks. Once per fight. | once |
| Operator | 1 | `deploy <part>` | A helper hits it for 12 every cycle for 4 cycles (it moves on if the part breaks). | 4 |
| Operator | 3 | `hook <part>` | Hooked for 4 cycles: every hit on it from anyone (helpers and burns too) gets +6. | 3 |
| Operator | 5 | `spawn <part>` | A small helper hits it for 5 every cycle for 3 cycles. | 1 |
| Operator | 10 | `botnet <part>` | Three small helpers hit it for 4 each every cycle for 3 cycles. | 5 |
| Operator | 14 | `barrier <part>` | Pull one of your helpers off it: a shield worth all the damage it had left. | 3 |
| Operator | 18 | `jam [part]` | Pull one of your helpers off it to push its attack back a cycle. | 2 |
| Operator | 22 | `kill-switch` | Your helpers deal all their remaining damage now. | 3 |
| Operator | 26 | `garbage-collect` | 10 damage to every part, and your helpers last a cycle longer. | 3 |
| Operator | 30 | `fork` | For 4 cycles, each helper hit has a 15% chance to start another helper (up to your helper cap). | 6 |
| Operator | 34 | `reroute <part>` | Every helper moves to this part and hits it once on arrival. | 4 |
| Operator | 38 | `cron-storm` | Every helper hits twice this cycle. | 6 |

### Talent ranks (up to 3 each)

| Class | First ranks | Second ranks | Third ranks |
|---|---|---|---|
| Breaker | Overclocked Core: +3% damage per rank · Chain Exploit: Momentum +2% per stack per rank | Exploit Kit: Exposed gives +5% more crit chance per rank · Heat Sink: Overload +4 damage per rank | Armor Cracker: Parts you strip take 1 cycle longer to patch per rank · Failsafe: Take 3% less damage from attacks per rank |
| Bastion | Patch Notes: Patch heals +3 per rank · Stateful Firewall: Firewall absorbs +5 per rank | kill -9: Kill Process +4 damage per rank · Redundancy: +4 max Signal on runs per rank | Hardened Kernel: Take 3% less damage from attacks per rank · Reverse Shell: Retaliate hits +5 per rank |
| Infiltrator | Heap Spray: Inject +2 per tick per rank · Recon: Opening +5 damage per rank | Backchannel: Backdoor +4 damage per rank · Onion Routing: +3 max Signal on runs per rank | Persistent Tag: Tagged burns tick +10% more per rank · Low Profile: Take 3% less damage from attacks per rank |
| Operator | Thread Pool: Deploy helpers deal +1 per rank · Kernel Hook: Hooked parts take +1 more per hit per rank | Node Pool: Botnet helpers deal +1 per rank · Dead Man’s Switch: Kill Switch cashes in +5% per rank | Load Balancer: Take 3% less damage from attacks per rank · Extra Memory: +3 max Signal on runs per rank |

All numbers are per rank.

### Talent choices

| Class | Tier 1 (3 points above) | Tier 2 (8 above) | Tier 3 (14 above) |
|---|---|---|---|
| Breaker | Sharp Exploit: Exploit also deals 20 damage · or · Hair Trigger: Overload has cooldown 2 but deals 35 | Core Dump: Segfault's execute starts under 40% · or · Piercing: Overload goes straight through armor | Cascade Failure: Your first break each fight resets your cooldowns · or · Unsafe Mode: +30% damage dealt, +20% damage taken |
| Bastion | Deep Packet Inspection: Firewall absorbs 40 · or · Service Pack: Patch heals 20 up front | Rate Limit: Throttle cuts attacks by 75% · or · Active Defense: Retaliate stays lit for 2 cycles | Uptime: Once per fight, a hit that would drop you to 0 leaves you at 1 · or · Preemption: Suspend has cooldown 2 |
| Infiltrator | Fast Hands: Opening stays lit for 2 cycles · or · Supercookie: Tag lasts 6 cycles | Polymorphic: Inject lasts 5 cycles · or · Rotating Proxies: Spoof twice per run | Leaked Creds: Slip past 3 guards a run instead of 1 · or · Perfect Trace: A full backtrace also reveals the new location’s vault key |
| Operator | Big Process: Deploy helpers deal 14 · or · Long-running: Deploy helpers last 6 cycles | Extra Nodes: Botnet sends 4 helpers · or · Hive: Your helper cap is 9 | Parallel Deploy: Deploy starts two helpers at half damage: same total, twice the hits for Hook · or · Supervisor: Each time a daemon acts, Deploy’s cooldown drops by 1 |

Order within a cycle: your command → burns → helpers → heals over time → enemy attacks → patches.

## Families and mutations

Home intrusions (100 Integrity to defend). Numbers are at enemy level 6; Integrity and damage scale 4% per level (a level-1 Pulse Node has 27 Integrity and hits for 11).

| Family | Threatens | Basic part | Signature part |
|---|---|---|---|
| Ransomware (CRYPTJACK) | Integrity | Pulse Node: 34, ◆, Surge 14 every 4 (first cycle 3) | Encryptor: 38, ◆ (◆◆ from level 3), Encrypt every 5 (first cycle 4): +4 damage per cycle, stacking, until it breaks |
| Worm (SPLINTER) | Integrity | Pulse Node: 34, ◆, Surge 12 every 4 (first cycle 4) | Replicator: 38, ◆ (◆◆ from level 3), spawns a fragment every 4 (first cycle 3). Fragments: 18 Integrity, no armor, gnaw 3 every cycle, max 3 |
| Ghostroot (GHOSTROOT) | Integrity | Pulse Node: 34, ◆, veiled, Surge 14 every 4 (first cycle 3) | Scrambler: 38, ◆ (◆◆ from level 3), veiled, Blind every 4 (first cycle 2): all timers hidden for 2 cycles, timed so the Surge lands inside it (+25%) |

Guards on runs are lighter (you have 50 Signal): Watchdog (Sentry 24 bare, Sweep 6 every 3; Tracker 28 ◆, Trace-back 16 every 5), Sentinel (Lens and Lockout, 24 ◆ each, both veiled), Crawler (Maw 24 bare; Brood 28 ◆ spawns fragments), Shredder (Grinder 26 ◆, Grind 9 every 4; Shredder 26 ◆, Shred 14 every 5).

**Enemy level** is set by the server level (home) or the server level plus the layer (guards). Beyond size, the signature part gains a chit at level 3 and again at 7, the basic part gains one at 10, and from level 9 first attacks come a cycle sooner (never on cycle 1). Test fights and the tables above use level 6.

Mutations are always visible and each changes a decision:

- **Armored** — every part has one more armor chit.
- **Regenerative** — a stripped part patches after 1 cycle instead of 2. Strip it only when you can finish it.
- **Hasty** — every attack starts a cycle sooner, but all parts have 15% less Integrity. Race it.

(Reactive and Redundant were cut: they added rules without adding decisions.)

## After a fight

A win shows a card over the virus with what it gave you: XP (one bar, any level-up), drops, code, salvage, leads, located origins and bounties; the fight log has the same in words. Enter on an empty line takes you back to the map (home) or the run.

**Fast kills.** Each class keeps your usual pace (cycles per 100 Integrity of virus, a running average). From your sixth kill with a class, a win at least a quarter faster than that pays **+25% XP**, shown as a gold *Fast kill* row. It's measured against you, so a slow, tanky class earns it as often as a burst one.

**New on the tabs.** Loadout, Craft and Daemons carry a teal count of what's arrived since you last opened them (protocols; blueprints, source and configs; daemons and daemon upgrades).

A loss crashes the server: it reboots at half Integrity in Degraded mode (see Invasions). Between fights the server **rests**: it repairs 2% of its max a minute (empty to full in about 50 minutes, offline too), stopping while an invasion is contested at or breaches your wall. `repair [n]`, or a click on the Integrity meter, pays for it now (see The economy). Leads and located origins appear on the Map, salvage and protocols on the Loadout page (Protocols tab), code on the Server page. Testing only: `developer reboot`, `developer location <ransomware|worm|ghostroot>`.

## Balance targets (checked by `node playtest.mjs` and `node balance.mjs`)

- Every fixture is winnable by at least two different plans, and the plans trade different things. On CRYPTJACK, breaking the Pulse Node first lets the Encryptor start its stack; breaking the Encryptor first costs a 14-damage Surge. A class that can delay (Bastion, Operator) can avoid both.
- Class balance (`node balance.mjs` → docs/BALANCE.md, guarded by `balance.test.mjs`): one scripted planner plays every class's own kit at five points on the level curve, loading a Tuned protocol in every open slot at the bracket's level and running a bracket's worth of defensive services (the first column has neither, to show what they're worth). Every class wins all but at most one fight (the deep guards are orange: two levels a layer, with the level gap), loses less than plain Spiking, and gets at least as many clean kills. Current result (wins · clean kills · health lost · cycles):

| Bracket | Spike, no gear | Spike only | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|---:|---:|
| Lv 1 | 14/24 · 0 clean · 75% · 11.2c | 24/24 · 0 clean · 32% · 8.6c | 24/24 · 1 clean · 27% · 7.8c | 24/24 · 6 clean · 17% · 7.6c | 24/24 · 0 clean · 23% · 7.9c | 24/24 · 0 clean · 16% · 6.6c |
| Lv 10 | 5/24 · 0 clean · 97% · 10.1c | 20/24 · 1 clean · 63% · 13.0c | 24/24 · 1 clean · 44% · 9.8c | 24/24 · 5 clean · 20% · 14.1c | 24/24 · 1 clean · 34% · 9.2c | 24/24 · 1 clean · 23% · 7.0c |
| Lv 18 | 0/24 · 0 clean · 100% · 8.4c | 16/24 · 0 clean · 73% · 12.7c | 24/24 · 0 clean · 33% · 7.9c | 24/24 · 1 clean · 30% · 15.0c | 24/24 · 1 clean · 30% · 8.9c | 24/24 · 0 clean · 40% · 7.9c |
| Lv 30 | 0/24 · 0 clean · 100% · 7.8c | 18/24 · 0 clean · 74% · 13.3c | 24/24 · 1 clean · 30% · 7.9c | 24/24 · 8 clean · 15% · 15.2c | 24/24 · 9 clean · 12% · 7.3c | 24/24 · 1 clean · 25% · 7.3c |
| Lv 50 | 0/24 · 0 clean · 100% · 5.6c | 21/24 · 0 clean · 67% · 11.3c | 24/24 · 1 clean · 30% · 7.4c | 23/24 · 1 clean · 27% · 13.7c | 24/24 · 6 clean · 18% · 6.8c | 24/24 · 2 clean · 20% · 5.1c |

- Difficulty (September 2026): enemy parts have 1.7× their base Integrity, enemy hits grow 3% a level faster than your power, and a level-1 virus matches a level-1 player. Targets: a skilled, geared player loses about 10–25% of their health a fight; no gear roughly doubles that; plain Spiking without gear loses fights from level 10. Gear stats roughly doubled so a full rig halves the damage you take by level 18. Brackets assume few services (services are rare now).
- Known gaps: the Bastion is the safe, slow tank (2–11% a fight, 10–15 cycles) and the other three are fast and riskier (6–30%, 4–8 cycles), easing as they gear up and get their level-14 defensive skill (Brace, Null Route, Barrier). Level 18 is the hardest stretch for Operator and Infiltrator. Tune after people play it.

These are scripted policies. Only people can tell us whether it's fun and readable in five seconds.

## Not built yet (see the design review)

The server as directories, roles and loadouts, drop-in co-op, crew chat, the tutorial (parked).

## Log sweep (forensics.mjs)

About half the servers you find (fixed per server) keep an incident file at the root, of one of three kinds. `cat` it for a one-screen log, a question and three suspects. Click a line to light up every line that shares its source (address, peer or parent pid; up to three colours); two filters hide the rest. Answer with `sweep <answer>` or by clicking a suspect.

| File | Question | Layer 1 | Layer 2 | Layer 3+ (a note at the top gives the clue) |
|---|---|---|---|---|
| `breach.log` | Which address broke in? | Fails over and over, then gets in | A loud scanner never gets in; a quiet address fails twice, then logs in as a service account | Logs in as the admin at night; the badge log puts the admin on site only by day |
| `transfer.log` | Which file was stolen? | The biggest thing out, at night, to an unknown peer | A huge nightly backup to the known backup target is the decoy; the theft is mid-sized, to an unknown peer | The file leaves in numbered chunks so no single transfer stands out |
| `ps.snapshot` | Which pid is hiding? | A miner eating 90%+ CPU | `sshd` started by the web server instead of init | A fake kernel thread: `[kworker]` in brackets but started by init and running from /tmp |

- The log comes from the server's seed: the same every visit, different everywhere.
- A right answer: lead toward the next server +40% on the first try, then +25%, +15%, +10%, and 30% of a kill's XP. Once per server.
- A wrong answer costs nothing. Skipping it changes nothing.

## Strains (waves 1 and 1b)

Strains are variants of a home family built around one rule. They share their family's art, code drops and leads. SPRAWL-00 is the starter area and never has them: strains come from layer 2 and deeper. What a server sends (invasions, swarms) is a strain about half the time once both its layer and its level allow it (fixed by the seed). The fight header shows the strain; its rule is on hover, and a first-time tip explains it.

### Grades

Deeper servers also send bigger versions of the same viruses, named v2 and v3. Only the stats change, on top of the extra levels a deeper server already has:

| Grade | Sent by | Integrity | Attack damage | Armor |
|---|---|---|---|---|
| v1 | SPRAWL-00 and layer 1 | ×1 | ×1 | as normal |
| v2 | layer 2 | ×1.15 | ×1.1 | as normal |
| v3 | layer 3 and deeper | ×1.35 | ×1.25 | as normal |

(Softened 2026-10-01: a deeper server is already 3 levels higher per layer, and the old numbers made same-level v3 fights on rogue servers unwinnable for some classes.)

Strains are graded too. A swarm counts one layer deeper than the outpost it targets. Against your wall, an invasion's strength is multiplied by its grade's Integrity factor.

| Strain | Family | From (level, layer) | Parts | Rule |
|---|---|---|---|---|
| Keylogger | Ghostroot | 4, layer 2 | Pulse Node, Logger | A Sync Window (0.14 wide) opens every cycle. The Logger only takes damage from commands fired inside it, and from burns and helpers started inside one. Every command fired outside it (auto-repeat and planned steps included) is logged; at 3, the Logger's Dump (18) lands next cycle and the log clears. |
| Hashrat | Ransomware | 5, layer 2 | Pulse Node, Miner (no armor, no attack) | While the Miner lives, every other cycle your cooldowns don't tick. |
| Floodgate | Worm | 6, layer 2 | Pulse Node, Flooder (no armor) | Flood hits every cycle from cycle 2 for 2, +1 (scaled) each time; any delay resets it. |
| Leech | Worm | 8, layer 2 | Pulse Node, Tap (28) | Siphon (8, every 3) heals the virus's most damaged part by what it deals and clears one burn on it. Shields and throttling starve it. |
| Sleeper | Ghostroot | 10, layer 2 | Pulse Node, Cell | Dormant (attacks off the timeline) until any hit lands or cycle 6. On waking, the Cell's Alarm (14) lands that cycle, then every 5; the Pulse Node attacks every 3. |
| Patchwork | Worm | 3, layer 2 | Pulse Node, Patcher (28) | Patch (every 3, from cycle 3) heals the most damaged part by 12 (scaled with its size). A heal on its own side: your chits, Null Route and misses don't stop it; delays do. |
| Flicker | Ghostroot | 4, layer 2 | Pulse Node, Shade (22) | The Shade is out of phase on odd cycles: every hit on it passes through (no damage, no chit), burns and helpers too, and a quarter of your own command's hit bounces back at you (`CONFIG.phaseBounce`; never your last point). Its Fade (5) lands every even cycle. A stripped Shade patches a cycle later than normal. |
| Extortion | Ransomware | 6, layer 2 | Pulse Node, Demand (40, no armor) | Deadline (26, every 5, from cycle 4). Damage dealt to the Demand in the 2 cycles before Deadline lands adds up; at 18 (scaled) the Deadline is called off and starts over. |
| Echo | Ghostroot | 8, layer 2 | Pulse Node, Echo (no attack) | While the Echo lives, every damage attack that gets through repeats next cycle at half (shown on the timeline). Echoes don't echo. |
| Bricker | Ransomware | 9, layer 2 | Pulse Node, Locker | Each part's attacks deal ×1.5 while it's below half Integrity (the timeline shows it). |
| Overrun | Worm | 11, layer 2 | Pulse Node, Hive | Swarm spawns a fragment every 4 cycles (from cycle 2). Its fragments bite +1 (scaled) every cycle they live. |

The balance sim plays Keylogger on the beat and hits a Flicker's Shade only when it's in phase (as a skilled player would).

### ICE

On layer 2 and deeper, about half the servers (fixed by the seed) swap their Watchdog for **Tracer** ICE and their Sentinel for **Bouncer** ICE. The fight header shows it as a tag with the rule on hover, and a first-time tip explains it.

| ICE | Replaces | Parts | Rule |
|---|---|---|---|
| Bouncer | Sentinel | Gate (3 armor, Ram 10 every 3), Keyring (no attack) | At the end of every 4th cycle the Keyring re-arms the Gate to full armor. |
| Tracer | Watchdog | Probe (Ping 4 every 2), Tracker | The Tracker's Trace-back (6, every 3) grows by 2 (scaled) every cycle the fight lasts. |

### Testing a strain

`?playtest=<name>` opens a fight against any strain or fixture (`?playtest=flicker`, `?playtest=bouncer`), and `encounter <name>` starts one from the prompt.

## Volume

The System page has three sliders (0–100, default 80, the level the game was mixed at): **Music** (the soundtrack), **Ambience** (radio chatter, rain, thunder, the street ten floors down with its odd horn and passing siren, the room tone) and **Effects** (hits, keys, alerts and every other game sound). Dragging is heard live; letting go saves it. All of them sit under the Sound switch.

## Fair play

Rules that keep timing, reloads and loops from paying:

- **A paused fight holds no clock.** The timers on invasions and swarms (and on members' lockdowns) wait while you fight them, but only while the fight is running. A paused fight, or one left open over a reload (it comes back paused), holds nothing.
- **In a consortium, the away rules still stand.** While you're logged off, the gap is played out a minute at a time as before: invasions at half pace, outposts noticed half as often, and invasions at outposts that can end in lockdown, with a member sometimes stopping one. An invaded outpost makes nothing (as it pays no dividend). Swarms still wait for you to log on.
- **Threats run on real time; their timers wait for you.** Invasions at outposts and swarms gather and travel whether you're logged on or not. Their timers only count down while you're logged on, so nothing falls while you're away. Production stops while one sits at an outpost or hub.
- **No store-to-market loop.** Hubs sell code, Exploits and salvage only as market wares. The Halcyon store never sells them for less than 10% over what the best hub market would pay for them right now. A round trip at one hub never profits (each unit of a lot is priced after its own push). Prices move between 35% and 160% on your own trading.
- **Hub income reads outside factors only.** A held hub earns by its condition, the world event and wiped hubs elsewhere, not by your own trading there.
- **What you compile breaks down without Exploits.**
- **Detached servers make nothing.** Reattaching starts their outposts fresh.
- **Developer commands** only work in tests, playtest pages and with `?dev` in the address.
- **The game saves when the tab closes**, and every roll comes from the save's seed: reloading replays the same result.

