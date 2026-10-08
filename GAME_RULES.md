# BLACKBOX — game rules

This is the single source of truth for how combat works. If code, README or an old spec disagrees with this file, this file wins. Numbers live in `dist/data.mjs`.

## The Craft page

Everything you build is on one page, **Craft** (at home only), in three panes: **categories** down the left (Protocols, Zero-days, Filters, Relays; each shows only once it has something in it, with a count of what you can craft now), the **recipes** in the one you pick, only ones you know (a teal dot on the ones you can afford; a recipe you haven't found doesn't show, and a category with none stays hidden), and the recipe you pick on the right: **what comes out** (its name in its rarity colour, rarity and level as chips, its stats as icon rows with their numbers; a filter adds your filters held and its slots as pips), **what it takes**, a row each (credits, code, salvage, named components; your have / its need, red when short), and **Craft**. That's all the page shows: whether you can make each thing, and what's missing if you can't. Hover any protocol (or filter) for its card: a spinning ASCII model of its kind (an Exploit's spike, a Proxy's diamond, a Shell's cube, a Script's prism, a filter's disc) in its rarity colour, over its name, rarity, kind, level, stats, effect and flavour. On a stash protocol (and on its **Load**/**Swap** button) the card ends with what loading it changes against what that slot runs now: ▲ gains, ▼ losses, and any Zero-day or unique effect you'd give up (or *into an empty slot*). Protocols you *run* live on the **Loadout** page's first tab, Protocols (the stash as one row per item on the left, slots and stats on the right); skills and talents share the second tab (slots, stats, stash: load, unload, scrap).

## First launch

A new game opens on a bare terminal: `blackbox login:` asks for a handle (2–16 letters, numbers, dots, dashes or underscores) and a password (4+ characters; never stored). Then an encrypted transmission from Halcyon Mutual's Office of Loss Prevention explains that the terminal was set up for you and that wick of LOWLIGHT will write. Your handle is your name on the prompt from then on.

## The loop

1. `connect sprawl`: **SPRAWL-00**, a rogue server, is where you go to fight from the start. A virus sits in each of its six folders at your level, but never above level 5 (now and then one a level higher): it's a starter area (its card says Lv 1–5, amber once you've outgrown it, grey when its kills pay under half), and past that the fights worth having are on the servers you trace (`ls` shows it as `name.exe`); SPRAWL-00 only ever has the plain families, never strains or bigger grades; `attack` it when you're ready. For your first two kills its hits land at 60% (`CONFIG.zone.starterHit`, `starterKills`), while you learn the board. After that it hits for real. A kill pays like a home kill, straight away (XP, code, a possible drop, a lead), and the folder fills again 90 seconds later.
2. Every neutralized virus gives a lead toward its family's origin: +25% a kill (four kills), falling with the level gap like XP (10% less a level under you, nothing from a grey kill). At 100% the origin is located, on **your layer** (see Level bands).
3. `connect <location>` starts a run on a traced origin. Your server stays home; out on the net your health is **Signal** (100 × your power, plus protocols). Signal carries between connections and rests back up while you're home and not fighting (20% of max a minute, empty to full in 5 minutes, and it catches up while the game is closed); you need a quarter of it to connect. While it rests, a clock beside the meter counts down to full (or, below a quarter, to when you can connect). Or **top up**: click the Signal meter (a **+** chip sits beside it whenever it isn't full, and a first-time tip points at it), or type `top up`, to pay for the rest now (see The economy). The Integrity meter has the same **+** for `repair`. On a run, the store's **Signal patch** fills it. (Signal boosters are retired: they can't be crafted any more, and ones you still carry work with `boost`.)
4. Explore the location's file system, fight what guards it, read files for clues, pull files into your pack.
5. Some files lead deeper: a trace record puts 35% on the trace to a node one layer down.
6. `jack out` to go home and bank your pack. Nothing waits at your gate: home only sees a fight when an invasion gets through.
7. Meanwhile, the servers on your network send **invasions** home, one every 20–30 minutes while you play: raiders, packs, pairs, champions, saboteurs, thieves and scouts. Your **firewall** meets them. It keeps level with your network by itself (your highest attached server, less 2), and you buy a margin on top. Weak ones it stops quietly; the ones that get through ask for you. They pay **signatures**, the wall's own currency, and nothing else does (see Invasions and the wall).
8. **Mail** gives it all a reason: contracts from your crew and from Halcyon Mutual, which pays a retainer every 30 minutes while your standing holds, plus Indemnity to spend at its store (see Mail and contracts, The hidden network, The Halcyon store).

## Runs

| Rule | Detail |
|---|---|
| Loud run | `connect <server> loud` (or **Go loud** beside Connect; the old `+hot` still works): friction you choose. Every fight on that run has 25% more Integrity and hits 20% harder. Every kill pays 25% more XP and rolls for loot once more. A **loud** tag sits beside Signal. |
| Signal | 50 at the start of each run. Moving (`cd`) costs 1. Guards hit it. A wrong password costs 3. |
| Trace | A break-in (any server with a vault; not SPRAWL-00 or rogue servers) has a **Trace** bar beside Signal: how loud you've been. Each `cd` adds 4, each file you pull 6, a wrong password 20, a guard fight 2 a cycle; arming Spoof takes 20 off, and an Infiltrator gains it half as fast (`TRACE` in run.mjs). At 100 a **hunter** ICE (Tracer, a level above the server) engages you where you stand, and you can't jack out (or flee) until it's down; beat it and Trace drops to 50. Jack out under 40% with the vault opened for a **clean job**: +25% banked credits and half a kill of XP (Break-in). |
| Contracts ready | A yellow **✓** by Mail on the top bar whenever a contract is ready to deliver (its hover says how many). |
| Disconnect | At 0 Signal you're thrown home: your unbanked pack is lost, your server is untouched, the location stays. Guards you beat stay beaten. A **Disconnected** card says what took you out, any files lost, and *Reconnection possible in m:ss*: the later of the reconnect wait and your Signal resting back to a quarter. |
| Guards | A guarded directory starts a fight when you enter it. `engage` to fight, `cd ..` to back off. Guard fights use the same combat rules, except damage (encryption included) hits Signal. |
| Locked | A locked directory needs `unlock <dir> <password>`. The password is written in a file somewhere in the location. |
| Leads | The **leads** button in a run's header opens a panel beside the terminal with every trace in progress: each family's lead and each unknown server you can see (where it hangs off, its layer), with its percent, and the contract marker on flagged ones. At most 8 unknown servers show at once, here and on the map (`HIDDEN.shown`): flagged ones first, then the most traced, then the newest ping. The rest are still there and still trace; they show once one ahead of them is found. Click one to see it on the map; the button closes it. |
| Contract marker | In a run's listing, a virus (or a folder whose guard or virus waits inside) that would count for one of your open contracts gets a small amber contract mark (a page with a check) next to its name; hover it for which contract(s). It goes once the count is met. |
| After a fight | Win a fight on a run and the kill screen stays as always; back in the terminal, the folder you're in is listed again under it (`ls`, minus what you just beat): click a folder to `cd`, a file to `cat` or pull, a virus to `attack`, or keep typing. A virus's fight carries its file's name (`worm-9271.exe` → WORM-9271). |
| Pull all | `pull all` (or `pull *`, or the **pull all · N** button atop a listing, or in the buttons under the terminal) takes every file still waiting in the folder, one pull each with the usual checks: a watching guard stops it, a spoof covers one file, and a canary you've read is left alone (one you haven't read still bites, so `cat` first if you suspect one). |
| Pack | Pulled files are unbanked until you jack out. A pull pops a small card with what it was (a blueprint or daemon shows ??? until it's banked); jacking out shows a **Banked** card with everything you brought home (no card when you brought nothing) (Enter, a click or your next command closes it). Credits go to your credits, items to salvage, protocols to your stash, code to your server, source (Zero-day or special service) and blueprints to your recipes; trace records add 35% to the trace on a deeper node. |
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

About 1 in 6 servers you trace is **rogue** (never your first two, and never more than five tame ones in a row). The first one after those two is always a **Nest** of the family that traced it (the one you've been killing). A rogue server is a farm: 4–8 folders with one virus each, at the server's level and grade (it keeps up with you inside its layer's band, then tops out; strains from layer 2), each coming back 3–5 minutes after you kill it. No vault, no password, nothing to take over or harvest, no log sweep, and it never sends invasions. It shows on the map as a hexagon. **Reconnect wait:** once you leave any server that isn't an outpost (SPRAWL-00, a rogue server, any server you've found or taken over), by jacking out or being thrown out, it won't take you back for 30 seconds (`CONFIG.relockMs`; its Connect button counts down). An outpost (a server running a harvester) takes you straight back. That stops the jack out, top up, go straight back loop. Kinds:

| Kind | Rule |
|---|---|
| Nest | One family only, and strains twice as often |
| Pit | Mixed families, 2 levels above the server, a second roll for drops. A third of its folders hold an **elite** (see below) |
| Gauntlet | Mixed families; clear every folder in one run for a bonus cache (60 + 12×level credits, code, XP) |

### KESSLER-FARM-00 (the crew dungeon)

At level 7 **KESSLER-FARM-00** turns up on your map: a mining farm somebody stopped paying for. It only lets you in with a crew (`crew sim <class>` from level 5, or `crew invite <friend>`). It keeps up with your level. Inside:

| Folder | What's there |
|---|---|
| `/intake` | an elite worm pack. It blocks the way to `/intake/racks` until it falls |
| `/intake/racks` | **THE FOREMAN** (ransomware crew boss, the tank and SIGINT check). Under half it starts the layoffs. Enrages at cycle 22. Its `shift.log` gives the ledger password's word, once it's down |
| `/cooling` | an elite ghostroot pack, in the way of `/cooling/nest` and `/cooling/loop` |
| `/cooling/nest` | an optional elite ransomware pack (its kills can drop Hashboard) |
| `/cooling/loop` | **HEATSINK** (worm crew boss, the healer check). Under 40% it melts down. Enrages at cycle 25. Its `temps.log` gives the password's digits, once it's down |
| `/ledger` | locked: `unlock ledger <word><digits>` |
| `/ledger/core` | **COLDWALLET** (ghostroot crew boss, the damage check and everyone's). Under half a bank run starts. Enrages at cycle 18 |

- Packs are elites at 2.9× Integrity. The three bosses are **crew bosses** (see Crew bosses below): built for a crew of four, with a job for every role in every phase, every mechanic telegraphed, and a missed one costs a big share of somebody's Signal. A smaller crew meets a smaller boss with smaller mechanics and a later enrage.
- **Every role has a job.** The Foreman checks the tank and SIGINT, the Heatsink the healer, the Coldwallet damage and everyone. Simulated at 18 and 30 (`node farmsim.mjs`, everyone in blues): a crew of four with a Warden, a Sysop and two damage dealers wins 97–98% of boss tries, and someone in it dips under 40% in 61–89% of fights. Take away its tank and the Foreman wins 83–100% of tries; its healer, and the Heatsink wins 76–97%; its SIGINTs, and the Foreman wins every try; a damage dealer, and the Coldwallet wins every try. Crews of two and three clear all three in 9 to 20 runs of 20, retrying (docs/bosses.md).
- **Attrition:** your Signal and your crew's carry from fight to fight. After the Foreman and the Heatsink the crew regroups: everyone back up to at least 60%. Progress stays when you jack out to rest: a pack comes back 30 minutes after it falls, a boss 6 hours after, and the ledger locks again when the Coldwallet is back.
- **Loot:** every fight drops like an elite (three rolls, a blue at least). Each boss has two uniques with bad-luck protection (see Bosses), and every pack kill has a 1 in 40 chance at Dead Pool (the nest's, 1 in 20 at Hashboard). The Collection counts the set: *KESSLER-FARM-00 · n/8*.
- A Pit elite that beats you moves on; the farm's don't. They wait for your crew to come back.
- **At levels 7–9** (no subclasses, no SIGINT, no heals yet) the mechanics are two fifths of their size, the bosses cast nothing SIGINT would stop, and Corruption waits for Patch (level 12); the role checks harden from level 13 and are full from 17. Scripted crews of three and four in blues clear all three bosses at levels 8 to 16 (20 runs in 20), someone still dipping low; from level 10 a crew that never uses SIGINT loses to the Foreman.

| Boss | Unique | What it does |
|---|---|---|
| THE FOREMAN | Foreman's Lanyard (proxy, level 7) | Below half, the next hit on you deals half, once a fight |
| THE FOREMAN | Overtime (script, level 7) | +2% damage for every cycle the fight has lasted, up to +30% |
| HEATSINK | Thermal Paste (exploit, level 8) | +20% crit chance on a Tagged part |
| HEATSINK | Fan Curve (shell, level 8) | Your burns grow +2 a cycle |
| COLDWALLET | Cold Wallet (proxy, level 9) | A crit against you lands as a normal hit |
| COLDWALLET | Air Gap (shell, level 9) | Start every fight with a ◆ |
| Packs | Hashboard (script, level 7) | When you break a part, that skill's cooldown comes back |
| Packs | Dead Pool (exploit, level 8) | +30% damage on a part below half |

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

**Trace is three rules.** (1) Kills trace your own layer (their family's lead). (2) Route files trace the next layer: relay route files (`ping-*.trc`), vault trace records, trace injectors and log sweeps; the **Route Logger** service makes each count 25 / 50 / 75% more. (3) A relay reveals the unknown servers next to it, and their family.

A trace record (`signal.trc`) you pull and bank puts **35%** on the trace to an unknown node **one layer deeper** (the one it names, or a flagged one first); kills, your relay's pings and trace injectors do the rest. On the Map it branches off the node it came from. Each layer sits in its own level band (see Level bands): a deeper one is ahead of you. Each layer down adds +25% to blue and yellow drop odds and 40% more credits per cache.

## Protocols, services and code

Two sides, two ways to get stronger. **You** run protocols: loot with rolled stats. **Your server** runs services: things you build from code. Neither is fiddly: a protocol goes in any slot, and a service is one rule. The fights at your server belong to its firewall (tiers and filters, see Invasions and the wall) and to your daemons.

### Items (you): loot, Diablo 2 style

Everything you equip is software: code, tools and access, never hardware. The Loadout page's Protocols tab (type `protocols`) shows your slots, your stat sheet and the stash. Hovering an item in the stash lights the slot it goes in. Design: the items design doc ("BLACKBOX: loot and 50 items").

**Slots.** Exploit (weapon: Damage), Proxy (chest: Signal + Block), Shell (helm: Signal + Regen + Restore), Script (ring: Damage + Signal + Payload); an **Implant** slot opens at level 15 and another at 30 (Implants drop and compile from item level 15, about one item in five, as well as the named uniques). `load` puts an item in its slot; if the slot is full it **swaps** (the old one goes back to the stash). Each class loads its own; one place at a time; one of each unique and each Zero-day per loadout.

**An item = a base + affixes + a rule (or a unique's effect).**
- **Base items** (31: seven for each of the four main slots, three for the Implant) give the **primary stats**, the feel-good numbers: Damage on every hit, Signal, Block, Regen, and Restore on a Shell and Payload on a Script. A new tier unlocks every few levels (Exploit: Proof of Concept 1, Weaponized Exploit 5, Exploit Chain 11, Zero-click 18, Wormable 26, Sandbox Escape 34, Hypervisor Escape 42; Proxy: … Mixnet 26, Domain Front 34, Covert Channel 42; Shell: … Ghost Shell 26, Ring 0 Shell 34, Firmware Shell 42; Script: … Polymorphic Engine 26, Living off the Land 34, Metamorphic Engine 42; Implant 15, Bootkit 34, Firmware Rootkit 42). The two late tiers give about 1.4 times what the tier before gives at their level, so a new base is a moment. Primaries scale +4% per item level from the tier's own level, ×0.42 overall (cut from ×0.6 so early gear doesn't double your health and damage). Saves from before the cut have their protocols' Damage, Signal and Regen brought down 30%.
- **Uniques keep up.** A named unique's primaries are the best base of its slot at its item level times 1.2 (a yellow's), or its own listed numbers grown from its level (×0.5), whichever is higher. Its secondaries come along as written and its downside in full. Eviction Notice found at level 20 is a Zero-click with about 14 Damage, not 6.
- **Affixes** are the **secondary stats**, small on purpose (2–10%): a prefix adds offense (Weaponized +Damage (1–4), Precise Crit, Calibrated Accuracy, Loaded +Payload% (4–10%), Multithreaded Clock Speed, Brutal Crit Damage, Recursive Echo), a suffix defense or utility (of the Bunker +Signal (6–20), of Mending Regen, of Restoration +Restore% (4–10%), of the Scavenger Scavenge, of the Ghost Evasion, of Leeching Leech, of Silence Stealth, of the Beat Sync, of Scrubbing Sanitize). Each needs a minimum item level. An affix's range runs from item level 1 to 20 and keeps growing past 20 (Loaded and of Restoration roll about 19% at item level 30). Names read like D2: *Precise Proof of Concept of the Bunker*. There are no junk affixes.
- **Rule affixes.** Every blue carries one minor rule and every yellow one major rule, in place of a numeric affix. They are written in the same effect blocks as uniques (`RULES` in gear.mjs) and most of them read the board: a tell winding up, the signature part, a bare part. A blue with no numeric suffix takes its rule's name (*Zero-click of Interrupts*). The rule's number grows with item level (the range below is item level 1 to 40). The same rule on two items counts once, at the better number.

| Rule | Tier | What it does |
|---|---|---|
| Interrupt Handler | minor (blue) | +15–25% damage on a part that is winding up a tell |
| Signature Scan | minor | +10–20% damage on the virus's signature part |
| Null Deref | minor | +1–6 damage on a part with no ◆ left |
| Safe Mode | minor | Once a fight, a hit that lands below half restores 3–5% of your health |
| Stack Canary | minor | Each fight starts behind a shield of 1–6 |
| Exception Handler | minor | When you call off a tell, a shield of 1–6 goes up |
| Sticky Bit | minor | Bare parts patch their ◆ back 1–2 cycles later |
| Clock Skew | minor | +5–10% crit chance on odd cycles |
| Abort Handler | major (yellow) | When you call off a tell, heal 4–14 |
| Double Tap | major | Each command you land counts twice toward calling off a tell (one hit stops an elite's or a boss's charge) |
| Fork on Break | major | When you break a part, every cooldown drops by 1 (2 from item level 21) |
| Daisy Chain | major | When you break a part, the part winding up a tell (or the next to attack) takes 6–16 |
| Read-only Mount | major | Once a fight, a hit that lands below half deals half |
| Race Window | major | When your command crits, that skill is ready again |
| Deep Inspection | major | +30–45% damage on a part that is winding up a tell |
| Clean Room | major | A crit against you lands as a normal hit |


**Stats a protocol can carry** (the stat sheet on the Protocols tab lists them all):

| Stat | What it does | Where it rolls |
|---|---|---|
| Damage | Added to every skill hit you land. | Exploit, Script and Implant primary; Weaponized (prefix) |
| Crit (%) | Chance a hit that does damage crits (everyone starts at 5%). | Precise (prefix) |
| Crit Damage | Added to every crit, on top of ×1.5. | Brutal (prefix) |
| Accuracy (%) | Cancels the enemy's evasion, so your damaging skills miss less. A miss still spends the cooldown. | Calibrated (prefix) |
| Echo (%) | Chance a skill hit repeats for half damage. Against armor, the echo breaks another ◆. | Recursive (prefix) |
| Payload (%) | Every burn tick and every helper hit you start deals this percentage more damage. | Script primary; Loaded (prefix) |
| Signal | More max Signal on runs. | Proxy, Shell, Script and Implant primary; of the Bunker (suffix) |
| Regen | Heals this much per cycle in fights. Rig: on runs, also per move. Server: at home, and very slowly between fights (per minute). | Shell primary; of Mending (suffix) |
| Block | Taken off every hit (a hit never drops below half). | Proxy primary |
| Evasion (%) | Chance an enemy's damage attack misses (up to 20%). | of the Ghost (suffix) |
| Sanitize (%) | Chance an Encrypt, Blind or spawn fails (up to 50%). | of Scrubbing (suffix) |
| Restore (%) | Every heal you cast, on yourself or on a crewmate, heals this percentage more. | Shell primary; of Restoration (suffix) |
| Leech | Heals you this much for every skill hit that does damage: your server at home, your Signal on runs. | of Leeching (suffix) |
| Clock Speed (%) | Fills a meter every cycle. When it's full, all your cooldowns tick one extra cycle. | Multithreaded (prefix) |
| Stealth (%) | Chance each enemy part's first attack comes a cycle later. | of Silence (suffix) |
| Sync (%) | Added to the 25% chance that a cycle opens a Sync Window. | of the Beat (suffix) |
| Scavenge (%) | Better drops (more often, better rarity) and more credits from caches you bank. | of the Scavenger (suffix) |

**Heals and burns grow with gear, not just level.** Everything else you do grows 4% a level. The heals you cast (Patch and its heal over time, the Sysop's heals, Purge's and Skim's drain) and your damage over time (every burn tick and helper hit, and what Detonate sets off) keep only half of that, +2% a level (`CONFIG.healLevel`, `CONFIG.dotLevel`). Restore and Payload on your gear make up the rest and more: a blue Sysop at level 30 carries about 65% Restore and heals about a fifth more than the full 4% a level would give, and one in whites (about 13%, from its Shell) about a sixth less. Heals that give back damage (Reclaim's lifesteal, Rollback, OOM Kill) already grow with what they give back, so they take Restore and nothing else. Old saves' flat Payload (+1–2 a tick) comes back ×7 as a percentage (save v32).

| Rarity | Colour | What it has |
|---|---|---|
| Stock | White | Base |
| Tuned | Blue | Base ×1.1, 0–1 numeric affix and a minor rule |
| Custom | Yellow | Base ×1.2, 2–4 numeric affixes (up to three of each kind) and a major rule, a random two-word name |
| Zero-day | Gold | A **unique** (written in the editor) or a found Zero-day (Rootkit, Race Condition, Buffer Overflow) |
| Indemnified | Orange | Halcyon's store only |

There are no grey protocols. (Filters still come in Scrap, a grey.) Old saves' greys became Stock items of their base and level, without their junk affix (save v34).

**Uniques** have a fixed name, stats, flavour line and usually one **effect**, sometimes a downside. Found at a higher level, their stats grow; their downside doesn't. They can drop again, except a Resident's (see Bosses). Effects are blocks (when · if · does · limits), so new ones are written in the editor without code. Conditions include a Tagged or a burning target, and an effect can shorten one skill's cooldown (never under 1). Examples: e.g. Logger Spool (+25% damage in a Sync Window, Keylogger trophy), Gate Bypass (start each fight with an armor chit, Bouncer ICE), Deadman's Switch (at 0 Signal on a run you jack out with your pack; rearms 90 real minutes later). Hover an item for its flavour.

**World uniques for levels 18 to 40.** Each one changes how a fight plays, most of them through the tells and the parts.

| Unique | Slot, level | Where | What it does |
|---|---|---|---|
| Rowhammer | Exploit, 18 (leans Breaker) | Layer 3 vaults, layer 3 rogue servers | Bare parts patch their ◆ back 3 cycles later |
| Ctrl-C | Script, 20 | Layer 3 vaults, Tracer ICE | When you call off a tell, every cooldown drops by 2 |
| Slammer | Script, 22 (leans Payload) | Layer 3 rogue servers and vaults | Burns on a part you break jump to the next part, with what they had left |
| Log4Shell | Exploit, 24 (leans Demolitionist) | Layer 3 vaults, the Shredder | When you break a part, the part winding up a tell (or the next to attack) takes 22 |
| Spectre | Shell, 26 | Layer 3 vaults and rogue servers | Each command you land counts twice toward calling off a tell |
| Bulletproof Host | Proxy, 28 (leans Bastion) | Layer 4 vaults, layer 3 rogue servers | Block counts double while a part winds up a tell |
| Hot Reload | Implant, 30 (leans Overclocker) | Layer 4 vaults and rogue servers | When your command crits, that skill is ready again |
| Interrupt Vector | Script, 32 (leans Warden) | Layer 4 vaults, the Bouncer | When you call off a tell, a shield of 30 goes up |
| Blue Pill | Shell, 34 | Layer 4 vaults and rogue servers | A tell landing on you deals half |
| Shellshock | Exploit, 38 (leans Breaker) | Layer 4 vaults and rogue servers | A hit on a part wearing ◆ breaks two of them |

**Drops: a grind, on purpose.** Targets in play time: a blue every 20–30 minutes, a yellow about every two hours, a gold every 10–12 hours. Per kill (at the assumed pace of 20 kills an hour, about what the pacing bot measures; `LOOT` in gear.mjs): about one in nine drops a white; blue 1 in 12 kills, yellow 1 in 60, gold 1 in 300, then vaults and double rolls make up the rest. Most kills drop nothing.
- **Guards, rogue-server Pits and bounties** roll twice and keep the best. Deeper layers add 25% a layer to the blue and yellow odds.
- **Vaults:** half hold a protocol (`kit.bin`, fixed per server; your first server's always does), white or better: white 80 · blue 16 · yellow 3.5 · gold 0.5 (a unique that drops from vaults that deep).
- **Class uniques** lean toward a class or a subclass: they drop anywhere they're written to, three times as often for that subclass and twice as often for the rest of its class (a class lean: twice as often for that class). The Collection names the class or subclass.

| Class | Unique | Where | What it does |
|---|---|---|---|
| Infiltrator | Tracking Pixel (script, level 3) | SPRAWL-00, layer 1 vaults | +25% damage on a Tagged part |
| Infiltrator | Slow Drip (exploit, level 4) | SPRAWL-00, rogue servers | +15% crit chance on a burning part |
| Infiltrator | Spearphish (exploit, level 7) | Layer 2 vaults, rogue servers | Tag cools down a cycle faster |
| Breaker | Jackhammer (exploit, level 5) | Layer 1 vaults, rogue servers | Flood cools down a cycle faster |
| Breaker | Shrapnel (script, level 8) | SPRAWL-00, rogue servers | Heal 6 when you break a part |
| Bastion | Hot Patch (shell, level 4) | SPRAWL-00 | Patch cools down a cycle faster |
| Bastion | Uptime SLA (proxy, level 6) | Layer 1 vaults, rogue servers | Below half, a hit on you restores 8% of your health, once a fight |
| Operator | Thread Pool (script, level 5) | SPRAWL-00, layer 1 vaults | Burns and helpers deal +15% |
| Operator | Fork Handle (shell, level 9) | Layer 2 vaults, rogue servers | Botnet cools down a cycle faster |

- **A boss's uniques:** two each, 30% a kill plus 10% for every kill without one (see Bosses). A Resident drops each of its own once; after that its roll gives a world unique you don't have yet, or a yellow.
- **A strain's trophy:** 1 in 200 kills of that strain drops its own unique (Keylogger → Logger Spool, Hashrat → Cryptominer…).
- **Native uniques:** 27 more belong to networks, 3 to 5 to each, about ten times as likely on their own network as anywhere else, with pity there and from its lair boss (see Networks).
- **Scavenge is magic find** with diminishing returns: +50% Scavenge = +33% better odds.
- **Rewards:** a story beat or contract can give a unique (killing claimjack gives wick's Old Toolkit: 5–6 Damage, +10 Signal, about a good blue at level 1).
- **Pace:** the System page shows your kills an hour of active play (the game open, used in the last 2 minutes). The odds assume 20; the pacing bot (`bot.mjs`, 6-second cycles, every reconnect wait and memory limit, skipping grey fights) measures 9–16 counting the time it waits for something on its level.
- A good drop shows as a notice; whites drop quietly.

**Deconstruct** (`deconstruct <id>`, or `scrap`): white 1–2 salvage, blue 2–3 + 1 code, yellow 5 + 2 code + 1 Exploit, gold 10 + 4 code + 3 Exploits (an Indemnified protocol from Halcyon's store gives no Exploits back); +1 salvage per 10 item levels. The code is the family the item dropped from. A drop into a full stash (40) is deconstructed. Deconstructing (a protocol, or scrapping a filter) opens a card listing what you got (salvage, code, Exploits), like the one a jack-out shows; Enter or a click closes it.

**Compile** at home with a recipe: `compile <stat>` gives a **blue** at your level with that stat as one of its affixes (60 + 15×level credits and 8 salvage); `compile <zero-day>` once you've banked its source. A Build Farm makes both cheaper. Halcyon's sealed item is a blue.

**Blueprints.** Nothing is buildable at the start. Every service (4) and every protocol recipe (17) is a blueprint you find once. A quarter of vaults hold a `blueprint.bp` (your first server's always does); a home kill drops one 0.8% of the time and a guard 2% (into your pack). Each one teaches something you don't have yet, at random, from **every kind of recipe**: protocol recipes and service blueprints, **filter recipes** (one per stat), harvester and module **plans**, and **config sources**. Once you know everything, one is 2 salvage.

**The monster pass (friction, then relief).** Fights on your Signal (runs, SPRAWL-00, rogue servers) have enemies ×1.4 Integrity and ×2.1 damage (`CONFIG.runHp`, `runDamage`), and on top of that an early-game step by enemy level (`CONFIG.runEarly`: ×1.35 at 3, ×1.5 at 4, ×1.45 from 5 to 12, easing back to ×1 by 17), when you have the least gear. From level 10 a late step rides on top (`CONFIG.runLate`: ×1.1 at 10, ×1.12 at 18, ×1.35 from 30, linear between), because your subclass, talents and fifth and sixth protocol slots outgrow the 4% a level; bosses and elites skip it (crew content is tuned for crews). Encryption skips both steps, because it stacks. The game is meant to be hard: a fight at your level costs a good player 35–50% of their Signal, and one two levels up can beat you. Tuned with `node friction.mjs` against the gear you're likely to have (targets: nothing equipped 60–75%, whites 40–50%, blues 35–45%, yellows 20–30%). Health a same-level fight costs (scripted planner, levels 5–10, after the Ghostroot fix): nothing equipped ~70%, whites ~42%, blues ~28–33%, yellows ~19–22%; level 1 sits on target (53 / 31 / 25 / 16). With the late step and the gear each subclass chases (heals-and-burns pass, October 2026; all eight subclasses, three gear sets of 48 fights each): blues ~39% at 10 and 18 and ~37% at 30 (every subclass 30–47%, except the Demolitionist at 19% from level 29, whose flat Damage lands on every one of its many hits; the Sysop, weaker alone on purpose, 41–45% with 80–85% wins; docs/BALANCE.md); whites ~50% at 18 and ~54% at 30; yellows ~27% at 18 and ~22% at 30 (gear tiers spread apart faster than one curve can follow). Home fights on your server are unchanged. The Infiltrator is weakest before Backdoor (level 10) and mid-pack after it.

## The economy

**Where credits come from** (pacing bot, taking contracts): about 300 credits an hour to level 10, 500–900 an hour over the climb to 20. Run caches are a bit over half of it, contracts about a third, the Halcyon retainer the rest. No credits come from kills. Measure it with `node econ.mjs <class> [level] [seed]`.

**Where they go.**
- **Health (the everyday sink).** Signal rests back at 20% a minute and the server at 2% a minute (half that while an invasion is contested or breaching at your wall), offline too. Or pay to top up now: a full Signal bar costs 8 + 1.5×(class level) credits, a full server 10 + 2×(server level); less missing costs less (at least 1). Click the meter, or type `top up` / `repair [n]`. Short of credits, the rest comes out of your biggest pile of code, 8 credits a unit. On a run it's the store's Signal patch instead. A bot that always pays spends about a quarter to a third of its income on it and reaches level 10 two to three times sooner than one that always waits; the Bastion barely needs it.
- **You start with 0 credits.** Caches, kills and contracts pay; topping up Signal or repairing costs credits from the first one you earn.
- **Building (the big goals).** Services and buildings on your outposts cost credits, code and salvage, so deconstructed items feed your server and outposts. A v1 service is about ten minutes of income at level 5; a v2 about half an hour at level 15; a v3 is a long goal.
- **Gear.** Compiling a blue costs 60 + 15×level credits and 8 salvage, cheaper than the store's sealed item (180 + 14×level).

| Sink | Credits | Code | Salvage | Other |
|---|---|---|---|---|
| Signal top-up (full) | 8 + 1.5L | | | |
| Server repair (full) | 10 + 2 × server level | | | |
| Service v1 / v2 / v3 | 120 / 600 / 2,000 | 12 / 40 / 100 | 6 / 15 / 40 | Exploits 0 / 1 / 3 |
| Compile a blue | 60 + 15L | | 8 | its recipe |
| Compile a Zero-day | 400 + 30L | | 16 (2 guard parts) | its source |
| Outpost module (into your stock; needs its plan) | 150 | 8 | 5 | |
| Architecture switch | 1,000 | | | |


**Commands** (at home, between fights): `protocols`, `load <id>` (swaps a full slot), `unload <id|slot#>`, `deconstruct <id>`, `compile [stat]`, `compile <zero-day>`.

### Services (your server)

The server has no items. It runs **services**, Master of Orion style: each service is one rule, built from code, and upgraded **v1 → v2 → v3**. There are four, and all of them work on the network around you. There are no ports: every service you hold the blueprint for can run. The Server page (type `server` or `services`) shows your server's level (your highest class level) and what the next level adds, code, the firewall, the install queue, what's running and what you can build.

**The install queue.** One install at a time, in real time, and it keeps going while you fight, run or close the game. You can queue one from anywhere except mid-fight (on a run too: it's your server doing the work). `cancel install` refunds everything. `uninstall <service>` gives back half the code it cost (credits and salvage don't come back).

| Version | Cost | Time | Needs |
|---|---|---|---|
| v1 | 12 code + 120 credits + 6 salvage | 15 min | its blueprint |
| v2 | 40 code + 1 Exploit + 600 credits + 15 salvage | 1 hour | level 10 (your highest class) |
| v3 | 100 code + 3 Exploits + 2,000 credits + 40 salvage | 4 hours | level 25 |

| Service | Code | v1 / v2 / v3 |
|---|---|---|
| Route Logger | Cipher | route files (relay pings, trace records, injectors, log sweeps) trace 25 / 50 / 75% further |
| Build Farm | Kernel | compiling costs 15 / 25 / 35% less |
| Edge Router | Worm | +1 / 2 / 3 outpost bandwidth |
| Scheduler | Kernel | collects every outpost every 60 / 30 / 15 minutes |

**Where the other services went** (save v34). The home fight is the wall's job now, so the services that only acted there moved to it:

| Was a service | Now |
|---|---|
| Filter Bay | The firewall has two filter slots of its own, and tiers +1, +3 and +5 add one each (five at +5, as a v3 Bay and the old tier slots gave) |
| RAID Array | Firewall tiers +1, +3 and +5 each add 5% to your server's max Integrity (15% at +5, a v3 Array) |
| Hardened Kernel | A filter stat, *Hardened*: 2–6 Block on hits at home, growing with the filter's item level |
| Scrubber | A filter stat, *of the Scrubber*: home fights start behind a shield of 4–10% of max Integrity |
| Hot-patcher | A filter stat, *Self-healing*: 0.3–1 Regen at home, per cycle in a fight and per minute between them |
| Counter-intrusion | A filter stat, *of Barbs*: whatever hits your server takes 2–6 back (on armor it breaks a ◆) |
| Cron Job | A daemon (see Daemons) |
| Snapshot | A daemon (see Daemons) |

A save that ran one of these got everything it cost back (each version's credits, code, Exploits and salvage), and the blueprint of a service that became a filter stat became that filter's recipe. A running Cron Job or Snapshot, or its source, became that daemon at the service's version instead.

### Code

Services are built from **code**, one kind per virus family, plus rare **Exploits** (v3 needs 2).

| Code | Family | From |
|---|---|---|
| Cipher code | Ransomware | kills, guards and vaults of that family |
| Worm code | Worm | 〃 |
| Kernel code | Ghostroot | 〃 |
| Exploits | any | 4% of home kills, 8% of guard kills |

A kill drops 1 code at level 1 (+1 every 10 levels); a guard drops half again, into your pack. Every vault's `payload.bin` is a cache of 12 + half the location's level. Scavenge adds to all of it. Salvage stays generic: it's for compiling protocols.

**Old saves.** Server gear that was installed comes back as v1 of the matching service, free; the rest turns into code. Rig items become protocols, and Cron Job and Snapshot source becomes service source. The older Upgrades list came back the same way (Hardening as RAID Array, Amplifier as Route Logger, the Signal booster as a loaded Stock Relay). From save v34 those services go on as described above. Daemon slots come from your server's level (+1 at 10 and 20).

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

**Contracts** pay credits and **Indemnity** (Halcyon's scrip, spent only at its store; GLASSJAW pays no Indemnity and costs you 8 Halcyon standing, but it pays for the risk: 2.5× the credits, 1.5× the XP, 5 GLASSJAW rep and a protocol, Tuned or better (a quarter of the time Custom)). They track themselves once taken; you hand them in from the Mail tab (`mail deliver <n>`). Delivering one opens the **Contract delivered** card in the middle of the screen: everything it paid, a row each (credits, Indemnity, XP, standing or rep, and any relay, blueprint, daemon or protocol), then Continue. A letter that comes with a contract shows once, as that contract (its text opens with it; its unread dot moves to the contract row), not again under Letters. Delivered ones move to **Completed** at the bottom of the inbox, greyed out, newest first (every LOWLIGHT job, and your last 15 contracts); click one to read it again.

| Type | Done when | Hand-in |
|---|---|---|
| Strain | N kills of one strain at your level (from level 7, a quarter of the board). Every fifth strain contract in a row pays double and rolls for that strain's trophy; dropping one resets the streak (RuneScape Slayer) | — |
| Side | KESTREL and NULL CHOIR each post one when the board opens, and they wait there: take one and the other is gone. Delivering it pays +20 rep with that faction, and the ripple turns its rival against you (WoW's Aldor or Scryers) | — |
| Kill | N kills of a family, anywhere (or anything in SPRAWL-00), no more than 4 levels under the level it was posted at (its title says Lv N+). XP pays at the average level of the kills that filled it | — |
| Named process | You kill the named process the contract puts in a SPRAWL-00 folder (two levels above you, never past SPRAWL's cap + 2; only posted while SPRAWL is still your level) | — |
| Takeover | You open the server's vault, then beat its **Resident** in `/core`. That server is then **taken over** (yours, teal on the map) | — |
| Materials | You have the code in stock | the code is handed over |
| Recover a file | The contract's file sits in a server's vault; pull it and jack out to bank it | the file is handed over |

A takeover or recovery contract points at a server you've found and haven't taken over, or at an **unknown server** one hop past one you've found. Halcyon never tells you where an unknown one is: see The hidden network.

**The board** opens with the fourth letter (the turf job, after claimjack), or once you've held the claimjack or turf job for an hour, whichever comes first, so random contracts at your level arrive while the rest of the storyline runs. Up to five offers sit on it; a new one arrives somewhere between 1 and 3 minutes after the last (2 on average, sometimes two at once), and an offer nobody takes is gone after 5 minutes. You can hold three at a time (`mail accept <n>`, `mail drop <n>`); only a contract you've taken counts. Rewards scale with your level (L): kill 30 + 5L credits, named process 40 + 6L, materials 35 + 6L, recovery 50 + 8L, takeover 60 + 10L, plus 1–4 Indemnity (+1 per 12 levels), XP and +5 standing (+6 recovery, +8 takeover). A fifth of offers (once your standing is 10 or more) come off the books from GLASSJAW.

**The initiate storyline** (LOWLIGHT's jobs, in order; they can't be dropped and don't count toward your three): kill three processes in SPRAWL-00 (60 credits, 1 Indemnity); hand over two Worm code (80, 1); kill the named process `claimjack` in /var/log, an elite (1 level above you but never above level 4, unmutated, grade 2: +15% Integrity, +10% damage; it stays put if you lose, and after two losses it's worn down to v1) (100, 2, wick's Old Toolkit); take over any server you've traced (150, 3, a blueprint and your first **relay**); recover Halcyon's stolen claims ledger, `claims.db`, from an unknown server next to the one you took (150, 4, a daemon): put the relay up, then trace the flagged server. Each pays standing (+3, +3, +3, +4, +4), so you finish at Contractor. The board and the store open with the turf letter.

## The hidden network

Every server you find is wired to two you haven't found yet, one layer deeper. They aren't on the map until you hear of them; then they show as **?** beside the server they hang off.

- **Invasions** can come from them (two in five, when there are any), through the server they hang off: "origin unknown, past VANTA-SINK-36". They come at that server's level and layer, never above it (an unknown server is 3 levels up and a layer deeper, but what you've connected to sets what comes at you); the road is longer, so they take longer to arrive. Jack in and beat one: its server is 40% traced (plus the Route Logger's bonus). If your wall stops one: +10%.
- **Relays** (Halcyon sells them; the storyline gives you one; or craft your own once you know the **Relay plan**: 60 credits, 6 Kernel code and 4 salvage on the Craft page) go on a server you've taken over (`relay <server>`, or its map card). Until you know it, one Halcyon server job at a time (take over a server, or recover a file) also pays the Relay plan. A server you own with no relay on it says on its card where to get one. A relay pings that server's unknown neighbours, and flags the one carrying the signal of a contract you've taken.
- **Hunting a pinged server** (any server a relay pings, contract or not): every kill of its family traces it 12% more (at home or in SPRAWL-00); the relay leaves a route file for each one on its own server (`ping-….trc` in /) worth 50% when you pull it and bank it; a trace injector (store, Kestrel, LANTERN) adds 30%. An unknown server's family stays hidden ("family ?" on its card, the Leads panel and the map's list) until a relay next to it pings it or it sends an invader at you. Its map card lists every way with what it adds, dim until it's open to you (a relay next to it; an injector in hand), struck through once done.
- At 100% it's **located**: an ordinary server, with its own two unknown neighbours. Contracts aimed at it follow it there.
- A vault's trace record (`signal.trc`) adds 35% to the trace on one of its server's unknown neighbours (a flagged one first). It never locates one outright.

## People: friends and who's online (presence.mjs)

Simulated until the server exists (developer mode only, `?dev`): `online sim` turns on a pool of 20 hackers who log on and off (about half are on at any time) and move every minute or so; `online off` turns them off. Everything else here is how it will work online.

- **The people button** on the top bar (a dot and how many are online; violet when a friend is on) opens two tabs: **Friends** (online ones first, with where they are; offline ones dimmed) and **Online** (everyone). Each line: handle, class and level, where they are (SPRAWL-00 and the folder, fighting or not; or just *on a run*, *on a rogue server*, *at home*: those are private).
- **Friends:** Add friend / Remove on any line, or `friend add <handle>`, `friend remove <handle>`, `friends`. `who` lists everyone online.
- **Crew:** an online friend can be **invited** (`crew invite <friend>`) and joins your run fights as a crewmate in their class (a bot for now). `crew kick <name>` lets them go. Three at most.
- **SPRAWL-00 is shared.** In its terminal, each folder shows who's in it or below it (a chip each, friends in violet, a red dot if they're fighting); arriving in a folder starts with *here* and who's there. The map's SPRAWL-00 node says how many are online there. Every other server is private.

## Consortium and the crew on a run (consortium.mjs, run.mjs)

**A consortium** is hackers who merged their servers (simulated members for now). Everyone keeps their own home server and everything on it; merging runs a **trunk line** between home servers, so every member can reach every other member's servers.
- **Joining.** `consortium create <name>` founds one; invite people from the people panel (*Invite to consortium*) or `consortium invite <handle>`, and their server merges in. While you're in none, someone online now and then invites you (a pager entry, and a card on the people panel's **Consortium** tab): *Merge* / `consortium accept`, or `consortium decline`. Invites lapse after 10 minutes. Anyone can invite; only the founder can kick (`consortium kick <handle>`). `consortium leave` cuts the trunk line. You lose nothing of your own either way. `consortium` alone sums it up. (`guild` still works as the old name, and an old guild becomes a consortium.)
- **The map.** With a consortium, the Map has two views: *Your network* and the consortium's. The consortium's view has your home server in the middle, a trunk line out to each member's home server (their card lists their servers), and each member's servers branching off theirs: their outposts, servers they've traced and rogue servers (1–4 each, at the member's level, kept within 3 levels of yours while it's simulated).
- **Members' networks.** Each member's network has its own signature (see Networks): their servers lean to their families and their native strain, their natives drop about ten times as often there as anywhere else, their lair holds their native boss from their level 8, and their dividend comes in their rich code.
- **Members' servers.** Connect to any of them like your own. Fights, files and drops are yours. Opening a member's vault doesn't take the server over: it stays theirs. Their natives and credit and code caches come back 20 minutes after your last run there; the vault stays open (its XP pays once) and other files you pulled stay pulled. Their home servers are theirs alone (home intrusions stay solo).
- **Shared ground.** Every member's server, plus your own outposts and rogue servers. Members online spend part of their time in its folders (yellow chips in `ls`), and when a fight starts in a folder they're in, they join it (up to three alongside you, counting your crew), each with their own loot. **XP for a drop-in is by damage:** a member who joined your fight takes the share of the kill's XP that matches the share of the virus's health they took off; you and your own crew split the rest evenly (the pool is the kill plus 10% per extra player, as in any party). Dropping into a fight you barely touched pays next to nothing. Nobody outside the consortium is there, so nobody can take your kills. A server you've only traced stays yours alone.
- **Owner and dividend.** An outpost's owner keeps its whole stockpile, as always. On top of that, every member's outpost pays each other member a **dividend**: 25% of what it produces, in kind (a Siphon's or Tap's code of its family, a Scraper's finds: credits, code, salvage, now and then a protocol). It fills in real time (offline too), a small stock per outpost of up to 12 hours' worth. An invaded outpost pays nothing until the invasion is stopped. The Consortium page shows what comes in an hour and what's waiting: *Collect*, or `consortium collect`. Each member outpost's card shows its rate and what's waiting. (Your outposts pay the other members the same way, at no cost to you.)
- **Invasions at members' outposts, and lockdowns.** Now and then (every 10–18 minutes of logged-on time) natives invade a member's outpost: a pager alert, and *Defend for a bounty* on its map card (`consortium defend <server>`). You have 8 minutes. Win for credits (30 + 8 × level), its family's code and XP. Nobody defends it: half the time a member deals with it; otherwise it goes into **lockdown** (pays no dividend for 2 hours). *Retake for a bounty* ends it.
- **Raids on members' walls and the trunk line are cut** for now (the threat merge): they come back when real players share a network.
- **The Consortium page** (a top tab, there while you're in a consortium or have an invite; its badge counts what needs you). Left: **Needs you**, a card per alert (invasions at walls, at outposts and on the trunk line, lockdowns, crashed servers; yours first), each with what it is, a timer bar, the level and what it pays, and one button (Defend, Intercept, Connect, Retake); then the members (status, outposts, where they are; Map, Invite to crew, Kick). Right: the consortium and its size ladder, the dividend (*Collect*), and how your wall fares while you're away. The people panel's Consortium tab is a short summary that links to it.
- **Size.** The more servers merged (yours included), the better for everyone:

| Servers | Tier | Bonus |
|---|---|---|
| 3 | Linked | +10% outpost yield and dividend |
| 5 | Mesh | Invasion bounties doubled |
| 8 | Backbone | A trunk rogue server (a Pit at your level) opens on the network |
| 12 | Grid | +1 outpost slot and firewall +2 levels |

Up to 20 servers. Crews of up to three are drawn from consortium members and friends (*Invite to crew*, `crew invite <name>`).

**On a run, the crew column** shows each crewmate's Signal, a chip for how they move (*with you* when linked to you, *leading* when you follow them, *solo* on their own), the folder they're in, and their controls: Unlink, Go to, Link; × in the card's top right takes them out of your crew. Regroup (or Split all) sits at the bottom.
- Crewmates start **linked to you** (⛓ with you): they follow wherever you go.
- **Unlink** (`split <name>`) sends one off to look around on their own (they move every few seconds, never into a guard or a locked folder by themselves); *Split all* sends everyone.
- **Go to** takes you to them once. **Link** makes you follow them: when they move, you're pulled along ("kilo pulls you to /var/log"); any move of your own drops the link. **Unlink** drops it too.
- **Regroup** brings everyone back to you, linked.
- Only the crewmates in the fight's folder fight it. In `ls`, crewmates show as violet chips in their folder; arriving says who's here.
- The same as commands: `split <name|all>`, `goto <name>`, `link <name>`, `unlink`, `regroup`.
- The people panel's **Crew** tab lists your crew (up to 3): each crewmate's class and where they are (with you on the run, which folder, linked or not), *Remove from crew* for each, *Disband* for all, and the open slots.
- **Remove** takes someone out of your crew (and off the run): × on their row in the crew column, *Remove from crew* in the people panel or on the Consortium page, or `crew kick <name>`. Not mid-fight.

## Networks (network.mjs)

Every player's network has a **signature**, rolled from its **network seed**: the same seed always rolls the same network. A new game rolls a seed, and a save from before networks gets one from its own seed and handle (save v36). Each simulated consortium member's network comes from their handle; a real player's will be theirs. docs/networks.md is the designer's review sheet.

| Part | What it does |
|---|---|
| Name | *Rust Lattice*, *Saltwire Loop*: on the Network card, the consortium map, member rows and tooltips |
| Lean | The three families weighted 3, 1.5 and 0.5. Mixed rogue folders (Pits, Gauntlets), the hidden neighbours your servers reveal, the other half of root rotations, and the families of couriers, bounties and outbreaks lean that way |
| Native strain | One strain (its lead family's seven times in ten), five times as likely as each of its family's other strains on that network |
| Native boss | One of nine, in its **lair** (below) |
| Native uniques | 3 to 5 of 27, at least one in each band (5–15, 16–28, 29–40). About ten times as likely on their network as anywhere else |
| Event bias | Two of the director's cards come up 2.5 times as often |
| Code bias | Its rich code: 30% of every other code dropped there comes as it (kills, guard drops and vault caches when banked, Code Siphons when collected, a member's dividend). Its rich material, salvage or Exploits, drops 1.5 times as often there |

**Whose network.** Your traced servers, rogue servers, home fights, events and lair are yours. A member's servers and lair are theirs. SPRAWL-00, KESSLER-FARM-00, the trunk server and the hubs are nobody's. Drops, code and strains read the network the fight is on.

**Native uniques.** A kill on a network rolls for its natives open at the kill's level (up to 2 over it): 0.5% a kill (an elite or a boss three times), +0.01% for every kill on that network without one, back to 0.5% when one drops, one you lack first (a mean of 88 kills). Anywhere else, each native you know of (named, or native to a network you know) drops at 0.02% a kill, and the ones you've never heard of share 0.05% a kill. A grey kill rolls nothing. The roll has its own dice. A native shows as ??? until it drops for you or you hear it named: a **darknet listing**, its network's lair boss falling, or a drop. Its tooltip names its home network.

| Native | Lv | Slot | What it does |
|---|---:|---|---|
| Null Byte | 5 | Exploit | +35% damage on an Open part |
| Canary Token | 6 | Shell | Tells are announced a cycle further ahead |
| Ping of Death | 7 | Script | When you call off a tell, the part you read takes 10 |
| Lockpick | 8 | Script | Your hits count double against a Mutex lock or a Lockbox ward |
| Reflector | 9 | Shell | The Mimic's playback hits the Mimic instead of you, at 50% |
| Fork Reaper | 10 | Exploit | +60% damage on a fragment |
| Watchlist | 11 | Proxy | When a tell lands on you, restore 6% of your health |
| IRQ Line | 12 | Script | SIGINT cools down 2 cycles faster |
| Read Receipt | 13 | Shell | Parts you read stay Open a cycle longer |
| Split Brain | 14 | Exploit | A twin you break can't reboot |
| Rootless | 15 | Implant | +25% damage with a skill whose moment is on the board |
| Write Blocker | 16 | Proxy | A seal that goes through leaves your ◆ and shield, and you stay clean |
| Policy Engine | 18 | Script | Your blue and yellow rules count 50% more (−3% Crit) |
| Quiet Wire | 20 | Proxy | A Tripwire you break stays quiet |
| Static Discharge | 21 | Exploit | +35% crit chance on a part gone loud |
| Hush Money | 22 | Implant | A cast that compiles lasts 2 cycles less |
| Brood Tap | 23 | Script | When you break a fragment, heal 5 |
| Keyjam | 24 | Exploit | +40% damage on a part behind a lock or a ward |
| Metronome | 26 | Shell | +30% crit chance when you fire in a Sync Window |
| Hold Music | 28 | Proxy | Evasion counts double while a part winds up a tell |
| Kill Chain | 30 | Implant | When you break a part, the next part to attack is Open for a cycle |
| Preempt | 32 | Script | +40% crit chance on a part winding up a tell |
| Brute Force | 33 | Exploit | On a part behind a lock or a ward, a hit that meets ◆ breaks two of them |
| Takedown Notice | 34 | Implant | When you break a fragment, every cooldown drops by 1 |
| Sandman | 36 | Shell | A tell that lands leaves nothing behind (−2 Regen) |
| Rubber Hose | 38 | Exploit | +6 damage for every tell you read this fight, up to +30 (−3% Crit) |
| Mirror Maze | 40 | Proxy | The Decoy's mirror lets your commands through at 50%, and nothing bounces back |

They follow the unique rules (the best base at their item level ×1.2), and they're sidegrades: loaded in place of a blue on every subclass at levels 10, 18 and 30, none moves the average health lost by more than 4 points (natives.test.mjs).

**The lair.** From level 8, once you've found three servers, your network's lair is on your map: a rogue server of kind *Lair*, at your level. `/outer` and `/den` hold its family (its native strain more often) and come back half an hour after they fall. `/core` holds its **native boss**, back an hour after it falls. A member's lair is on their network from their level 8. A native boss is a solo boss (every tell open at its level, charges that take two hits, phases, an enrage), and it drops its network's natives at BOSS_LOOT's odds: 30% a kill, +10% a kill without one, kept per network. The first time it falls it names all of them.

| Boss | Built on | What it does |
|---|---|---|
| DEADBOLT | Ransomware, a Mutex | Its charge is Deadbolt. Re-arms at 60%; at 30% a second Mutex re-locks the Encryptor |
| TRIPMINE | Ransomware, a Tripwire (a Lockbox below 20) | Claymore on the Pulse Node. Every attack a cycle sooner at half |
| HASHLORD | The Hashrat strain | Difficulty Bomb. Re-arms at 60%, sooner at 30% |
| BACK ORIFICE | Worm, a C2 Node | Spam Run hatches two. Sooner at half; at 25% a Mirror twins the Replicator |
| PATCH TUESDAY | The Patchwork strain | Rollup. Re-arms at 60%, sooner at 30% |
| FLOODWALL | The Floodgate strain | Storm Surge. Re-arms at half |
| MIRRORSHADE | Ghostroot, a Mimic | Doppelganger. At half a Decoy mirrors you on the off-beat |
| SLEEPWALKER | The Sleeper strain | Night Terror. Re-arms at half |
| ECHOLALIA | The Echo strain | Last Word. Re-arms at 60%, sooner at 30% |

A strain boss's hits step with level (×0.8 at 10, ×1.1 at 18, ×1.45 at 30).

**The slow ways to someone else's native.** A Listening Post tunes to a native you've heard named (`listen <unique>`): on its network, its usual +25% a post; anywhere else, its 0.02% a kill × (1 + 2 per post). A **darknet listing** (an event card from level 8, weight 0.5) offers a native from another network, the one you listen for first: it names it, and `event buy <id>` (or Buy on the Network card) takes it for 400 + 40 × level credits and 2 Exploits within 20 minutes. Or merge with its network's owner and fight there.

**Show it.** The **Network** card (Server page, Consortium page) has the name, the lean as a bar, the native strain, the native boss with its lair and chance a kill, the favoured cards, what it's rich in, the natives (??? until seen or named, a *listen* button once named) with the native chance a kill, and any darknet listing. Members' rows on the Consortium page name their networks; the consortium map labels each member with their network and native strain, and a member's card carries their Network card. `network` prints yours, `network <member>` theirs. Testing: `developer network <seed>`, `developer lair`, `developer native <id>`.

## The fight HUD

Left to right: **your Signal** (or your server at home; a signal-bars icon on runs, a server icon at home, and the same server icon on the top bar's Integrity), with your crew's bars under it in a small window, dividers between them; **Status**, everything on you right now, just the names in their colours (teal for yours, red for what's against you, violet for helpers): timed effects (Momentum, Brace, Scrambled, Null-routed, Drawing fire…) and standing ones (Encrypted, Shield, Armor, Clock Speed, Rootkit, Snapshot, Helpers). Hover (or focus) one and a tooltip shows at once: how much, how many cycles left, and the rule; and **the virus**, its name and level labelling its bar, its armor and tags under it, lined up over its picture. The board below is just you, the parts and the timeline.

**Showing what happened.** Every cycle plays your turn first, then the virus answers a beat later (4 steps: about 1.3 s at normal speed, the board red the whole time), one attack at a time. An attacking part's row lunges with a red edge and its attack's name floats off it; the damage rises on your bar. Every skill effect has its own word, flash and sound: a mark on a part (EXPOSED, TAGGED, HOOKED, THROTTLED, QUARANTINED: a lock-on blip), a burn (BURNING: a fizz), a helper (HELPER: three rising blips), a shield or a buff on you (SHIELD, or the skill's name: a swell). What you've put on a part stays as small icons by its name (teal for marks, orange for burns, violet for helpers), and an Exposed part's bar is hatched and outlined: it's open.

## Who's aiming where

On the fight board, each part shows who's aiming at it this cycle: round initials stacked in a rail down the row's left edge (yours teal, from your handle; each crewmate's violet). Hover one for the command. Every row keeps the rail's width, so names line up whether anyone's aiming there or not.

**While you type** a command that names a part (`spike scr`, `overload pul`), your avatar moves to that part before you press Enter: dashed and breathing if it would go through, red if it wouldn't (on cooldown, not lit, no armor to crack…; hover it for why). It's read exactly as Enter would read it, however the line got there (typed, Tab-completed, or recalled with the arrow keys). Clear the line and it goes back to your real aim.

**Whose half.** Each cycle is two halves: yours (you and your crew), then the virus's. A strip across the top of the board names it (`YOUR MOVE` while it waits on you, then `YOU`, then the virus's name), and the virus's half turns the board red (a faint red wash and border; yours leaves it as it is); your half holds a moment after you act so it always shows first, and the virus's runs about 1.3 seconds before its hit lands and ends a moment after it: the red is gone the instant it's your move. During the virus's half the prompt reads `<VIRUS> acts…` and dims. Effects land on the things involved, not the screen: your hit bursts on the part (the number on it); a virus hit frames the attacking part's row and your bar in red (the number on your bar). Screen shake, the red screen edge and the static glitch are kept for crits and heavy hits (15% of your max or more). Log lines carry a teal or red left rule by side.

When a command lands (hitfx.mjs), it lands on the part itself: the part's cell flashes and jolts, and a burst of 1s and 0s flies out of it (amber for yours, violet for a crewmate's). A crit bursts bigger in gold-white and jolts harder; breaking an armor chit throws a few white bits (CRACKED rises off it); a miss shakes it and stamps a big MISS across it, struck through. A status that lands on you (Encrypted, Scrambled, a shield, a buff…) shows big over the board for a moment, then flies into its place in the HUD's Status column. A part you break doesn't just vanish: its row flickers and dissolves for a second while its 1s and 0s rise off it and scatter, then it joins the *Broken* list.

**Effects** (System; `effects calm|full|minimal`) keep the board readable: one visual per event, on the thing it's about.
- **Calm** (the default): the number rises off the part, the bar drops, the part's cell takes the strike (flash, burst of bits, jolt). A crewmate's hit is quieter than yours (a smaller, dimmer number and no flash). A crit of yours also punches the virus picture. Breaking a part, winning, and a hit on you keep their big effects. The forecast's white slices still blink.
- **Full**: also the impact burst in the Now cell, sparks, the whole row flashing and a punch on every hit.
- **Minimal**: numbers and bars only (no flashes, no strikes, no shards).

At every Effects level, your own hits give the screen a small, quick shake (bigger for bigger hits and crits, a light one for a broken armor chit). Crewmates' hits don't. Motion off turns it off, like every other movement.

**The ability tray** says what's ready: every key has a charge bar along its bottom, full amber when it's ready. On cooldown the key is striped and dimmed, its bar refills cycle by cycle, a big number counts the cycles to go and the line under the name reads *ready next cycle* / *ready in 3 cycles*. A key that comes off cooldown flashes once. A key waiting for its moment (a lit key's window, like Shatter's) has no bar until it lights.

## Co-op, simulated (crew.mjs)

Online co-op comes later (a hosted server with logins). To try how it plays first (developer mode only, `?dev`), `crew sim bastion infiltrator` (up to three classes; `crew sim` alone takes the three you aren't) adds bot crewmates to your run fights (SPRAWL-00, rogue servers, guards). The sim crew comes at level 5; before that you run alone. `crew` lists them, `crew off` sends them home. Home intrusions stay solo.

- Each crewmate is a player of its own: its class at its own level (a friend or consortium member at theirs; a `crew sim` bot at yours when it joined), which never moves when you switch class, a Stock protocol in every slot (a sim crew entry can carry another rarity, as the balance scripts' do: then each protocol carries a stat its subclass chases, like Restore for a Sysop), and its own Signal. A crewmate's Signal carries from fight to fight through a run, like yours. One that went down comes back at 25% for the next fight, and a new run starts everyone full. Your crew strip shows what each one has left. played by the same planner the balance scripts use.
- Each cycle everyone acts (you, then the crew), then the virus. Statuses are shared: anyone's hits benefit from Exposed, Tagged, Throttled and Hooked.
- A damage attack lands on everyone in the fight, each taking it in full, as if they fought it alone (its chip on the timeline says → all). Encryption, scrambles and fragments stay on you.
- **Threat:** a Bastion's Firewall, in a crew, also draws fire for 3 cycles: every damage attack goes at that Bastion alone (one hit, at its solo size), and nobody else is hit. The chip says → nyx (or → you), the Bastion's row says *drawing fire*. Solo, Firewall is just its shield. A crew boss aims its attacks instead of hitting everyone (see Crew bosses).
- **Healer:** in a crew, `patch <name>` heals that crewmate instead of you (a crewmate's Patch on you reads *Patch from nyx*). The Sysop is the healer, built for a crew: Multicast heals everyone (16 each), and Checksum's heal goes to the lowest crewmate. Alone it is the slow one, like a healer levelling solo: its hits are small but heal it (Checksum, and Reclaim from level 12), so a fight takes it about twice the cycles of a damage dealer and rarely leaves it low. A Sysop crewmate heals ahead of the damage (Patch on the lowest under 80%, Multicast when two are under 85%, a Heartbeat on the lowest under 95%); alone it keeps its heals for under 30%.
- **Pit elites move on:** an elite that beats you, or that you run from, leaves its folder. The folder fills again about 30 minutes later, so an elite can't be retried until it falls.
- **Turn order: strippers first.** Each cycle, everyone's command (yours and the crew's) goes by what it does, so a big hit isn't wasted on armor somebody was about to strip: armor strippers (Spike, Crack) first, then debuffs and the rest (Exploit, Tag, Inject, Brace…), then damage skills (Overload, Kill Process, Flood…). Ties keep their order: you, then the crew. Add **`last`** after the target (`overload scrambler last`) to send your command to the back of the cycle, after everyone else's. Solo, nothing changes.
- **Turns play out one at a time** on screen in that order, then each of the virus's attacks due, a beat apart (0.38 / 0.33 / 0.26 s at relaxed / normal / fast; the virus's first attack waits 4 beats). The row (or crew avatar) whose turn just played lights up, the bars move with each turn, and every hit has its effect (a crewmate's on their row). When one attack hits everyone, only one hit sounds. The cycle timer waits meanwhile. (Scripts and tests still resolve a cycle at once.)
- **MMO-style, not ARPG-style.** A normal virus gets +50% Integrity per extra player (`CREW.hpPer`), a boss +80% (`CREW.bossPer`), an elite +5%; its hits stay their solo size. So a party makes normal fights easy, but long enough for their mechanics to show: simulated (planner bots, Tuned gear; sim crewmates now carry Stock) a level-10 fight costs a solo player about 22% of their Signal over 8 cycles, each player in a pair about 6% over 6–7, in a four about 2% over 4–5. **Kill XP is split** across the party, plus 10% per extra player (`PARTY_XP`): a pair gets 55% each, a four 32.5%, so grouping is a little better per hour, not the only way to level. Drops stay personal.
- **Elites** are the true group content: a third of a Pit's folders (the trunk server is a Pit too) hold one, marked **◆ CREW** in gold on its folder, its listing and its bar. ×5.2 Integrity, ×1.3 damage, one more armor chit (`ELITE` in data.mjs), on top of the Pit's 2 levels, and they grow only **+5% per extra player** (`CREW.elitePer`): built for four. They pay three times the XP (split like any kill), roll three times for drops, never drop less than a blue, and 8% of the time drop a unique (`ELITE.floor`, `ELITE.unique`). Never on the way to anything you need: only Pit folders hold them. Simulated: solo never wins; a crew of four at level 18 wins every time (at +15% a player it lost 8 in 20).
- If your target breaks before your turn (a crewmate got it), your command goes at the next threat instead.
- Crewmates' hits and breaks show on the board but stay quiet: the sounds are yours.
- A crewmate at 0 Signal is down for the rest of the fight. You going down still ends it. Rewards are yours (the bots keep nothing).
- On the fight screen each kind of crew information has one home. **Health**: a Crew column in the HUD, beside your Signal, a line per crewmate (name, bar with the blinking forecast slice, number; struck through when down; a *drawing fire* tag; lit on their turn; hover for their command). **Where they aim**: their avatar on the part's rail. **What happened**: the damage number on the part, the strike in their colour, and the log, where their lines carry their name.

## Events (events.mjs)

The net isn't a storyline: things happen on it, and you act on them or let them pass. From class level 3 an **event director** deals one event now and then: the first 4–8 minutes of logged-on time after you reach level 3, then every 15–30 minutes, never the same kind twice in a row, at most two up at once. Each one goes to the pager and stays there while it's up. Missing one costs nothing. The director rolls its own dice, so an event never shifts the rest of the game's rolls.

| Event | Where | Lasts | What you do | What you get |
|---|---|---|---|---|
| **Courier** | a traced server | 15 min | LANTERN's courier is carrying a dead drop through. *Intercept* it from the server's card: a fight at your level. About one courier in six carries a unique you haven't found instead, and says which (one that drops out in the world, up to two levels over you): a lucky shot, not a deadline. | 40 + 12×level credits and a protocol (85% Tuned, 15% Custom), or that unique, on top of the kill |
| **Bounty** | a traced server | 25 min | Halcyon posts a bounty on a named virus two levels above you (from level 8, on REPO MAN, a boss at your level). *Intercept* it. | 80 + 15×level credits and +2 Halcyon standing, on top of the kill |
| **Boss** (Hollow Choir) | a traced server, from level 10 | 25 min | The HOLLOW CHOIR, a ghostroot boss. *Intercept* it. | Twice the bounty's credits and a Custom protocol, on top of the kill |
| **Outbreak** | the net | 30 min | One family surges. | Its kills drop double code |
| **Leak** | a server you've found but not taken | at once | Someone leaks its vault key. | Its vault opens without the password |
| **Darknet listing** | the net, from level 8 | 20 min | A broker lists a native unique from another network (see Networks), naming it. `event buy <id>`. | That unique, for 400 + 40×level credits and 2 Exploits |

Your network's two favoured cards come up 2.5 times as often, and couriers', bounties' and outbreaks' families follow its lean (see Networks). A server with an event gets an antenna mark on the map, the event and its minutes left on its card, and a row in the map's threat list. An event you're fighting waits for you. Losing the fight leaves it up until its time runs out. `developer event [courier|bounty|choir|outbreak|leak]` deals one now. (LANTERN's numbers-station dead drops, which you had to decode, unlock and bank, became the courier.)

## The Halcyon store

Opens with the Contractor letter. Two shelves:

**Halcyon's own line**, always there:

| Item | Price | Needs |
|---|---|---|
| Relay | 120 + 8L credits | Probation |
| Deductible (survival protocol): the first attack that lands on you each fight does nothing | 30 Indemnity | Contractor |
| Subrogation (offense protocol): when a part hits you, your next skill hit on it deals double | 45 Indemnity | Trusted |
| Actuarial Model (utility protocol): veils can't hide attack timers from you | 45 Indemnity | Trusted |
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

- **Choosing what pays.** Every build button opens a picker with the stacks and a − / + for each. It starts filled with a sensible default (plain Scrap first, then pieces no recipe asks for, then the most plentiful), and Build lights up once the payment covers the cost. On the command line: `compile crit pay scrap:2,pulse-kernel:2` (without `pay`, the default is used).

## Root access

A server you've taken over keeps paying you back if you keep coming back to it (`root.mjs`; RuneScape's player-owned house, WoW's dailies and rare spawns).

- **Log rotation.** An hour after the takeover, then every 2 hours (real time, online or off; not while it's detached), its logs rotate: a fresh process moves into one of its open folders (at your level inside the server's layer band, maybe a strain or a bigger grade, like a rogue server's), and a rotated cache of credits (`rotated.gz`, 20 + 4 × level, +25% a Root level) waits at its root. The map marks a waiting process with **↻** on the node; the server card shows it (name, level, folder) or how long to the next rotation. `attack` it in its folder (the button under the prompt): it's a wild kill (XP, code, a drop, a lead).
- **Rare process.** A quarter of rotations bring a rare one instead (**★**): 2 levels up, three loot rolls on top of the kill's drop, and gone within the hour.
- **Root levels.** Every process you clear counts. Root 1 at the takeover; Root 2 after 1, 3 after 2, 4 after 4, 5 after 7. The card shows five pips (the perks on hover):

| Root | What it gives |
|---|---|
| 1 | Taken over |
| 2 | `/root` opens: a stash of the server's code (4 + level/4), refilled every rotation |
| 3 | It stops costing memory |
| 4 | One more building slot, and its producers make 25% more |
| 5 | Its firewall +3 levels, and its producers make double |

## Outposts

A server you hold (you beat its Resident in `/core`) is yours to build on, like a colony in Master of Orion 2. What you build decides what it does. Nothing costs upkeep and nothing switches itself off.

- **Slots.** Each held server has 3, 4 or 5 building slots by its size (fixed by its seed: small 30%, medium 50%, large 20%), +1 on a Backbone site and +1 at Root 4, at most 6.
- **Bandwidth** is yours, across your network: 3 + server level ÷ 4 (3 at level 1, 8 at level 20), plus the Edge Router, the Hub architecture and the consortium. Each building takes 1–3. You can't build everything everywhere.
- **Building** runs in real time, offline too: one build per server and two across your network at once. It costs credits, the server's family code and salvage (you pick which salvage), and the specialisations take 3 Exploits too. A lockdown or a swarm at the server holds a build up. **Finish now** buys it out. Taking a building down (×) gives back half its credits.
- **Plans.** You start knowing the Code Siphon. Every other building needs its **plan**: about 15% of vaults hold one (your first vault always does), and Halcyon's shop sells each once. A plan you already know banks as 2 salvage.
- **Production** piles up in the server's store, up to 8 hours' worth (Storage Array 16, Refinery a day), and connecting to the server collects it (the Scheduler does it on its own). A lockdown stops production; what's stored stays.
- **On the map card** a held server's outpost section has one header (Outpost, its slots used and your bandwidth used) and a labelled row for each part: **Buildings** (what's built, × to take one down, and the Build button), **Stored** (what's waiting, collected when you connect) and **Wall** (its firewall level and what it is vulnerable to).

| Building | Kind | Bandwidth | Cost (credits / code / salvage) | Time | Needs | What it does |
|---|---|---|---|---|---|---|
| Code Siphon | producer | 1 | 150 / 10 / 4 | 10 min | — | 1.5 + level/10 of the server's code an hour |
| Credit Skimmer | producer | 1 | 300 / 15 / 8 | 30 min | plan | 20 + 3×level credits an hour; natives notice the server 50% more |
| Scrap Mill | producer | 1 | 200 / 12 / 6 | 20 min | plan | 1 + level/15 salvage an hour |
| Data Miner | producer | 2 | 500 / 25 / 12 | 1 h | plan, server lv 10 | A loot roll every 90 minutes (credits, code, salvage, now and then a protocol; better on Legacy) |
| Firewall Node | defence | 1 | 200 / 12 / 6 | 20 min | plan | The server's firewall +3 levels |
| IDS | defence | 1 | 350 / 18 / 8 | 40 min | plan | Natives notice it half as often; swarms heading here are seen sooner |
| Sentry Daemon | defence | 2 | 600 / 30 / 15 | 2 h | plan, server lv 15 | Kills one virus of every swarm that reaches the server |
| Storage Array | support | 1 | 250 / 12 / 6 | 20 min | plan | Stores twice as much |
| Pipeline | support | 2 | 400 / 20 / 10 | 45 min | plan, server lv 10 | Producers here make 50% more |
| Listening Post | support | 1 | 250 / 12 / 6 | 30 min | server lv 5 | Listens for the unique you name (`listen <unique>`, or **listen** on its Collection row): wherever it drops, it drops 25% more often, 25% more for each post. That counts its gold roll, a strain's trophy and a boss's chance. A native unique you've heard named also drops off its network 1 + 2 per post times as often (see Networks) |
| Honeytoken | support | 1 | 250 / 12 / 6 | 30 min | plan | Draws trouble: noticed twice as often, swarms pick it first and come sooner; beating them here pays double |
| Refinery | producer, specialisation | 3 | 2,500 / 120 / 50 + 3 Exploits | 6 h | plan, server lv 20, 3 producers here | Producers here make 50% more; stores a day's worth |
| Citadel | defence, specialisation | 3 | 2,500 / 120 / 50 + 3 Exploits | 6 h | plan, server lv 20, 2 defences here | The firewall +6 levels; a lost defence never locks it down |

One specialisation per server. A Legacy site takes a quarter off a specialisation.

- **Site traits** are fixed when a server is found (45% have one): Rich (producers +50%), Legacy (better loot rolls, cheaper specialisations), Backbone (+1 slot), Hostile (natives come twice as often, producers +50%), Hardened (its Resident and natives are Armored).
- **Its firewall.** Every outpost has its own (`firewall.mjs`). Its base is the server's own level, and you buy tiers on top like at home (`firewall upgrade|harden <server>`, or the row on its card): +1 to +6, the same prices on that base. Firewall Nodes and Citadels add to it.
- **Natives.** A server with buildings is an **outpost**, and its natives notice it about every 6 hours of play, more often the more you build (15% more per building, times what each one draws). They come as a **small swarm** (1–2 viruses at the server's level, arriving in 3 minutes; `FLEET.nativeMs`). Like any swarm it meets the outpost's firewall: **blocked**, it bounces; **contested**, the firewall wears it down; **breached**, you have 8 minutes to **Defend**. Lose and:
  - the outpost goes into **lockdown** for 2 real hours: it makes nothing, but what's stored is kept;
  - the server and everything past it stay open (nothing is ever cut off).
- **Retake** it (beat the natives there) to end a lockdown sooner.
- **Regrowth.** Two lockdowns you let run out while you're logged on, within 24 hours, and the Resident regrows: the server isn't yours until you beat it in `/core` again. Its buildings wait. A lockdown that ends while you're away never counts.
- **Home services for outposts:** Edge Router (+1 / 2 / 3 bandwidth, Worm code) and Scheduler (collects every outpost every 60 / 30 / 15 minutes, real time, offline too; Kernel code). Both are blueprints you find.
- **Server architecture** (server level 20, like a Master of Orion 2 government). Free to pick the first time; rebuilding as another costs 1,000 credits, between fights.

  | Architecture | Trade |
  |---|---|
  | Fortress | Firewall +5 levels; producers make 25% less |
  | Hub | +2 bandwidth; firewall −3 levels |
  | Lab | Crafting and building cost 30% fewer credits; outposts are noticed a quarter more often |

- **Old saves.** Harvesters and modules became buildings: a Siphon or Tap became a Code Siphon, a Scraper a Data Miner, each installed module its building (what didn't fit came back as 150 credits). Harvesters in your rack came back as 200 credits each, modules in stock as 150. A Scraper plan became the Data Miner's, a Tap plan the Credit Skimmer's.

**Building.** A held server's card has a **Build** button. It opens the Build panel over the map: every building as a card with what it does, what it costs, how long it takes, and what it still needs. Typing `build <server>` (or just `build` with a server selected) opens the same panel, and Esc closes it.

Commands: `build [server]`, `outpost build <server> <building>`, `outpost demolish <server> <building>`, `outpost buyout|defend|retake <server>`, `buy plan-<building>`, `architecture fortress|hub|lab`, `developer outpost <server> [building…]` (testing).

## Configs (gone)

Services used to take a config, a side-grade per service. They're gone: services run as they come. A save that crafted one gets 250 credits back for each.

## Swarms

Once you run an outpost, the network organises against it.
- The first swarm gathers about 45 minutes after your first outpost goes up; after that, one every 90–150 minutes (half that with a Honeytoken out). One swarm at a time. Everything runs on real time, online or off. At the outpost it meets the outpost's firewall: **blocked**, it bounces off; **contested**, the firewall kills a process now and then (each time its grind adds up to a whole one); a **breach** just runs the timer. The outpost produces nothing while a swarm sits at it.
- A swarm is 2–4 processes of one family, two levels above the outpost it's after. It usually gathers on an unknown server hanging off that outpost.
- You see it coming: the pager goes off, and the Map shows it moving in with its size and time to land (10 minutes).
- **Intercept** on the way or **Defend** once it arrives (`swarm engage`): each fight kills one process, and the timer waits while you fight (a paused fight, or one left open over a reload, holds nothing).
- Once it arrives, it gives you 8 minutes. Processes still there when that runs out put the outpost in lockdown: retake it to end it sooner.
- Break the whole swarm for its haul: code from every process, a salvage core per process and bonus XP.
- Degraded mode pauses swarms like everything else on the network.

## Firewalls and the away rule (in progress)

The plan the next changes build to; each part moves into the sections above as it lands.

**One rule, online or off.** *(Done for home, outposts and hubs you hold; silos next.)* All PvE runs on real time. Whatever comes for something you hold meets that holding's **firewall**: **Blocked** (it bounces), **Contested** (the firewall and the threat wear each other down, each on its clock) or **Breach** (it gets through and the holding falls when its timer runs out: a crash at home, a lockdown at an outpost or a hub you hold, a silo lost). Being online only means you can jack in and fight it. No logged-on clocks, no "never while away" exceptions: the firewall is the guardrail, and you can see it.

**Threats come from what you've attached.** A threat's level comes from the server that sends it (or the holding it targets), never from your own level. Attach a level-20 server and level-20 things can find you; detach it and they can't. Your own power levels off; defence is what you build per holding.

**The firewall** (every holding has one: home, outposts, hubs you hold, silos):
- **Level:** it follows what it guards. At home, the base is your highest attached server's level less 2; at an outpost or a hub you hold, that holding's own level. Upgrades buy a margin of +1 to +6 on top.
- **Readout:** one line on each holding's card, *Vulnerable to lv N+* (teal *Safe* when nothing attached can get through), with a family note when a filter changes it.
- **Fragmentation:** an invasion that gets past your home wall cracks it (contested: a block, a breach: two); an outpost's or hub's never fragments (it's a level and nothing more). Shown as a block grid; fragmented blocks cost it levels. Buying a tier leaves it whole; **Defrag** restores it without one, taking a few minutes at reduced strength.
- **Hardening scripts** (`harden.sh`): one-use, +3 levels for 8 hours. Bought at hub shops, or written from 6 signatures. *(Home: done; see Invasions and the wall.)*
- **Filters:** firewall gear in slots, rolled like protocols (rarity, item level, stats): Strength, Strength against a family, slower fragmentation, faster defrag, more grind, less chip, Evasion and Sanitize at home, and rarer tar, sting and reflection. Home has the most slots; outposts and silos one or two. *(Home: done; see Invasions and the wall.)*

**The away clock.** Away, everything runs on a long passive clock (home invasions every 2–4 hours, swarms and old owners at a quarter pace); online, **Open ports** brings invasions faster and richer. Thieves and scouts only come while you're logged on. Before logging off: harden if it still reads vulnerable.

**Silos.** Rare faction servers (at most one per faction, never an early find) that hold a faction's stock. Run clean lines for them (rep), with Trojan and logic-bomb mines on hops you don't hold; or capture one with a Backdoor payload and hold it against the faction's counter-swarm. A silo that falls goes back to the faction with everything stored in it.

## Threats at a glance

Three kinds of threat, two things they leave behind, four things you do. The specifics go in the name: *Invasion at your wall*, *Invasion at nyx's outpost on VANTA-RELAY-80*, *Swarm from LANTERN at your outpost on …*, *Swarm from Kestrel at KESTREL-DC-NORTH*.

| Word | Means |
|---|---|
| **Invasion** | One attacker comes for your wall (or a consortium member's outpost). It travels, then sits at its target on a timer. |
| **Swarm** | One or more viruses come for an outpost or a hub you hold, one fight each. It travels, then sits at its target on a timer. Natives send small ones (1–2), servers past it bigger ones (2–4), and so does a Hostile faction. One swarm at a time. |
| **Lockdown** | What an outpost or hub goes into when an invasion or swarm runs out its timer: it makes nothing until it ends. Never lost for good. |
| **Crash** | What a server suffers when its wall falls: yours goes Degraded (rebooting); a member's is rebooting and open to clear. |
| **Intercept** / **Defend** | Fight it on the way / at its target. |
| **Retake** | End a lockdown sooner (one fight). |
| **Clear** | Fight out your server when it's occupied after a crash. |

At a wall, an invasion is **Blocked**, **Contested** (the wall grinds it while it chips you) or a **Breach**, by your wall's strength.

**Two kinds of threat** (the threat merge): an **invasion** at your wall (one virus; your server's firewall, Integrity chipped), and a **swarm** at a holding (one or more viruses, a fight each; an outpost's natives, servers past it, or a hub's old owner; the holding's firewall, then lockdown). One swarm at a time across your network.

Everything runs on real time, online or off: whatever comes meets that holding's **firewall** first (Blocked, Contested, Breach), and being online means you can step in and fight it. Threats come only from servers attached to your network, at their levels (or the holding's), never yours.

### Your home server

| Threat | Comes from | How often | Its clock | You | Ignored | Beat it |
|---|---|---|---|---|---|---|
| **Invasion at your wall** | A server attached to your network | First 3 min after your first find, then 20–30 min after the last (**Open ports**: 2.5× as often, +50% each); away, a long clock: one every 2–4 h | Travels 2 min + 1 a layer (a champion half again, a thief four times, a scout half), then Blocked (quietly), Contested or Breach | **Jack in** (`jack in`), **Intercept** a thief (`intercept`) | Contested and Breach chip your Integrity; at 0, a crash, and it leaves. Each kind adds its own cost (see Invasions) | A home kill per virus, and its bounty in signatures |

### Your outposts

| Threat | Comes from | How often | Its clock | You | Ignored | Beat it |
|---|---|---|---|---|---|---|
| **Natives at your outpost** | That server's natives: a swarm of 1–2 at its level | About every 6 h | Arrives in 3 min, meets its firewall, then 8 min to defend; makes nothing meanwhile | **Defend**, a fight a virus | Lockdown | As a swarm |
| **Swarm at your outpost** | 2–4 processes from past it, 2 levels above it | First 45 min after your first outpost, then 90–150 min | Travels 10 min, meets the outpost's firewall, then 8 min to defend; makes nothing meanwhile | **Intercept** / **Defend**, a fight a process (`swarm engage`) | Lockdown | Code, a salvage core a process, XP |
| **Swarm from a faction at your outpost** | A Hostile faction you just struck | Once a strike | As a swarm, in the faction's colours | As a swarm | Lockdown | As a swarm |

Lockdown here: 2 h, nothing made, what's stored kept, nothing past it cut off. **Retake** (`outpost retake`) ends it sooner.

### Hubs you hold

| Threat | Comes from | How often | Its clock | You | Ignored | Beat it |
|---|---|---|---|---|---|---|
| **Swarm from its old owner** | The faction, while Hostile, at the hub's level + 1 | 30 min after the capture, then 2–4 h | Travels 10 min, meets the hub's firewall, then 8 min to defend; earns nothing meanwhile | **Intercept** / **Defend**, a fight a process (`hub defend`) | Lockdown | Code, salvage, XP |

Lockdown here: until you **Retake** it (one fight, `hub retake`). No income; the hub is still yours. The old owner's swarm is the same swarm as at an outpost (`fleet.mjs`, aimed at the hub), so only one swarm is ever out on your network: a hub's waits while an outpost's is out, and the other way round.

### Consortium members' servers

| Threat | Comes from | How often | Its clock | You | Ignored | Beat it |
|---|---|---|---|---|---|---|
| **Invasion at a member's outpost** | Its natives | Every 10–18 min (logged-on) | 8 min | **Defend for a bounty** (`consortium defend <server>`) | Half the time a member stops it; else lockdown (no dividend, 2 h) | Bounty: credits, code, XP |

A member's lockdown: **Retake for a bounty**. (Raids on members' walls and the trunk line's travelling virus are cut until real players share a network.)

## Invasions and the wall

The idle layer, built as events: fewer, bigger, and each one worth a look. The servers attached to your network send them back along it to your server, **one at a time**, online or off. On the Map an invasion moves in from its server (a thief toward the outpost it's after); its card, the Server page's **Firewall** card and the top bar say what it is, what it does and what it pays. `invasions` lists the same in the terminal. The designer's review sheet is `docs/invasions.md`.

- **When.** The first sets out 3 minutes after you find your first location; the next 20–30 minutes after the last one is dealt with. While you're logged off, a long passive clock takes over: one every 2–4 hours (see below). **Open ports** (`open ports` / `close ports`, the switch under the Firewall card's ruler, with *Invasions ×2.5* and *Rewards +50%* beside it, lit while it's on) brings them 2.5× as often while you play (8–12 minutes), each worth +50% (XP, salvage, signatures, code when you kill one); they close when you log off. Only servers attached to your network send them (Memory): detach one and its invasions stop.
- **Who.** Half the time your strongest attached server sends it, otherwise any of them. Each is a virus of that server's family (CRYPTJACK, SPLINTER or GHOSTROOT) at its level, maybe mutated (from level 4: a quarter of the time to level 9, then 40%), with the server's grade and maybe a strain. The very first is always a plain raider.
- **Kinds.** Each invasion is one of these, rolled by weight from what the sending server's level allows and what you have for it to go after, never the same special twice running if it can help it. Its card says what it does in one plain sentence before it lands.

| Kind | Weight | From server lv | What it is | Warning | Your answer | If you miss it | Bounty (signatures) |
|---|---|---|---|---|---|---|---|
| **Raider** | 30 | 1 | One virus, as invasions always were | none needed | your wall, or jack in | chip | 2 |
| **Pack** | 16 | 3 | Three of the server's viruses. It counts 2 levels higher at your wall for each one still waiting behind the front one | *A pack of 3. It counts 4 levels higher at your wall until it thins out.* | jack in once per virus; the next steps up when the front one falls | chip, until it thins | 1 a virus (3) |
| **Pair** | 12 | 4, two servers attached | Two viruses from two of your servers, arriving together. +2 levels at the wall while both stand | *X and Y came together…* | two fights | chip | 3 |
| **Champion** | 12 | 8 | An elite-grade virus (elite armor and hits, elite flags: whatever answers elites in a fight answers it) a level over its server, 1.5× a normal virus's size. Counts 2 levels higher at the wall and travels half again as long | *A champion, built like an elite…* | jack in, or harden.sh to turn it away | chip | 5, and a **capture** when you kill it |
| **Saboteur** | 10 | 4, a service running | A level over its server. If it gets past your wall (contested or breach), it shuts off your best running service until it's gone; nothing installs or uninstalls meanwhile | *If it gets past your wall, it shuts off your Edge Router until you kill it.* | your wall, or kill it | that service, off for as long as it stays | 3 |
| **Thief** | 10 | 3, an outpost with 3+ stored, online only | Two levels over its server, heading for the outpost with the most stored, on a road four times as long (8 minutes from layer 1). It meets that outpost's firewall, not yours | *It is after the stores on X. Intercept it on the way, or it takes half of what is stored there.* | **Intercept** (`intercept`, or the card's button): a fight on its way | half of each stock on that outpost (the store refills) | 3 |
| **Scout** | 10 | 2, online only | Small (two levels under its server) and quick (half the travel). It doesn't chip and the wall doesn't grind it: it sits outside mapping your wall for 5 minutes, unless your wall clears its server's level by 3, when it's swatted quietly | *It is mapping your wall. Kill it in the next 5 min, or the next invasion counts 3 levels higher.* | jack in within 5 minutes, or harden for the next one | the next invasion counts 3 levels higher at your wall | 2 |

  **Quirks.** A raider, pack or champion carries its server's quirk three times in ten: from a **Hoard** it is Armored and its bounty is half again as big; from a **Nest** it brings a brood (one more virus, two levels under, behind it; +1 bounty); a **Hidden** one counts 2 levels higher at your wall. The quirk is a tag on its card.
- **Travel.** 2 minutes from a layer-1 location, a minute more per layer, times its kind (above). A filter of Tar slows it.
- **The firewall** (`firewall.mjs`) is your wall. It **follows your network**: its base is the level of the highest server attached to it, less 2 (never under 1), and it moves for free as you attach and detach. Your server's level adds nothing.
  - **Tiers** (`firewall upgrade`, or the button): a margin bought on top of the base, **+1 to +6**, kept for good as the base moves. Tier *t* on a base of *B* costs (25 + 6B) × t credits, (2 + B/3) × t Cipher code and ⌈t × (1 + B/10)⌉ each of Worm and Kernel code; from +3 it also takes 3 × (t − 2) signatures (3, 6, 9, 12). On a base of 10 that's 85 credits for +1, 255 for the first two, 1,785 for all six. Shown as a **+N** tag beside the level (the base and the perks on hover).
  - **Perks by tier** (any firewall): **+1** a filter slot and +5% max Integrity, **+2** defrag 30% faster, **+3** a filter slot and +5% max Integrity, **+4** fragments 25% slower, **+5** a filter slot and +5% max Integrity, **+6** harden.sh lasts twice as long. The Integrity perks are your home server's (they were the RAID Array), and the slots were the Filter Bay's.
  - What the margin means: at +0 a raider from your strongest server is contested, at +2 it's blocked, +4 blocks a v2 raider, +5 a champion and +6 a full pack (before filters and the +N chip). Less margin means more invasions ask for you, and more bounty to grow.
  - **Fragmentation:** an invasion that gets past the wall cracks it: one block when it's contested, two on a breach (once each per invasion), out of 16. Losing Integrity no longer wears it, and an invasion it blocks costs nothing. (An outpost's or a hub's firewall never fragments.) Every 4 fragmented blocks cost it a level. The card shows the blocks: solid when whole, hollow when fragmented. **Buying a tier leaves every block whole.**
  - **Defrag** (`defrag`): (3 + level) credits a fragmented block; 3 minutes, running 2 levels weaker meanwhile, then every block is whole again.
  - **Hardening:** `harden.sh` (Kestrel's and NULL CHOIR's shops, and Halcyon's agency stock) adds 3 levels for 8 hours (`firewall harden`); another adds 8 more hours. Holding none, `firewall harden` writes one from **6 signatures**. When a coming invasion would be stopped by 3 more levels, its card offers harden.sh right there.
  - Its **effective level** (base + tier + filters + the +N chip − fragmentation − a running defrag + hardening) is what it blocks outright. The card reads **Vulnerable to lv N+** against the highest level your attached servers send (amber if that would be contested, red if it would break through), or **Safe**. The map's server card says the same in one line.
  - **Three knobs.** The wall is your tier, your filters and harden.sh, on the base your network sets. Everything else that adds levels shows as one **+N** chip beside the level (hover for what's in it): at home, Architecture (Fortress +5, Hub −3) and the consortium's Grid tier (+2); on an outpost, a Firewall Node (+3) and Root 5 (+3). Tarpit, Honeypot and Sandbox are no longer services: a save that ran one got a filter carrying its stat (blue for v1–v2, yellow for v3).
  - **Filters** (`filters.mjs`): gear for the firewall, rolled like protocols (Scrap, Stock, Tuned, Custom; an item level). Your firewall has two slots, and its tiers +1, +3 and +5 add one each. Every filter adds levels (about 1 + item level / 10, more on better bases: Packet, Stateful from 10, Deep from 25, Neural from 40). Tuned ones carry 1–2 more stats, Custom ones 3: **+2–4 levels against one family** (Wormguard, Lockbreak, Exorcism; that family only), **15–40% less fragmentation**, **20–50% faster defrag**, **15–35% more grind** and **15–35% less chip** while contested, for home fights **2–5% Evasion** (Decoy), **10–25% Sanitize** (Sandboxed), **2–6 Block** (Hardened), a **4–10% shield** at the start (of the Scrubber), **0.3–1 Regen** (Self-healing) and **2–6 back on every hit** (of Barbs), the last four the services that were (Block, Regen and barbs grow with the filter's item level), and on Custom ones only, **2–5 of its family's code from every invader it stops** (of Reflection), **15–30% slower invasions** (of Tar) or invasions that **arrive 10–25% worn** (of the Hive). Where they come from: about one vault in seven holds a `filter.flt` (Stock or Tuned at best; pull it, jack out to bank it); **craft** one on the Craft page (Filters): a Tuned filter at your level, built around a stat whose **recipe** you know (Wormguard, Lockbreak, Exorcism, Compacted, Indexed, Abrasive, Buffered; blueprints teach them) or any of yours, for 60 + 8 × level credits, 6 + level/2 Cipher code, 4 salvage and **3 signatures** (`filter craft <stat|any>`); and **captures** from invasions, the only source of **Custom** filters. The Firewall card lists them: what's in, the empty slots, then the rest; **In**, **Out** and **×** (scrap for 1–3 salvage) at home only (`filter equip|unequip|scrap <n>`). You hold 12 at most.
- **The wall's rating** against the invasion's strength (100 × its power at its level plus what it counts higher: its kind, a pack's waiting viruses, a quirk, a scout's map), set so the firewall blocks invasions up to its effective level:

| Rating vs invasion | Result |
|---|---|
| 20% or more stronger | **Blocked** at the wall, quietly: a log line and a pager entry with no beep, no alert and no sound. It pays half its bounty (rounded up), 25% of a kill's XP and 1 salvage, and counts toward your streak. |
| Within ±20% | **Contested**: the wall wears the front virus down (4–20% of it a minute) while it chips your server (0–1% of max Integrity a minute); the stronger your wall, the faster it grinds and the less it chips. Ground to nothing, the next of a pack steps up; the last one ground down pays the base bounty. |
| 20% or more weaker | **Breach**: it chips 1% of your max Integrity a minute until you deal with it |

  An invasion the wall will stop says so when it sets out, quietly. Only one that it will contest or that will break through sets off the pager and a notice.
- **Signatures** are the wall's currency, and only invasions pay them: the **bounty**. Each kind has a base (the table); it grows by a quarter of the base every minute the invasion sits contested or breaching at your wall with you not on it, up to three times the base. The growth is yours only if you kill it yourself (jack in or intercept): the wall wearing it down pays the base, an outright block half. So you can wait and take the chip (and the risk that the wall finishes it first) for a bigger payout, or jack in early. Open ports pays half again. Signatures buy firewall tiers from +3, crafted filters, and harden.sh. The card shows the bounty now and the most it can grow to (*13 → 34*) before you fight.
- **Streak.** Invasions stopped in a row, by your wall or by you. Each stop pays 10% more per invasion already in the streak, up to +50%, and every fifth in a row leaves a **capture**. It ends when an invasion crashes your server, a thief gets into an outpost's stores, or a scout finishes mapping your wall. The Firewall card shows your signatures, the streak and how many stops to the next capture.
- **Captures** (a champion you kill, every fifth stop in a row): a protocol (Tuned, or Custom three times in ten) or a Custom filter (four times in ten), or one of the **invasion-only uniques** (Tripwire, Honeynet, Sinkhole; source *invasion*): 20% a capture plus 10% for every capture without one, like a boss's (BOSS_LOOT), back to 20% when one drops; one you don't have comes first, and a Listening Post works on them.
- The Firewall card's ruler says it in levels: teal what it blocks, amber what it contests, red what breaks through, with the highest level your servers send marked on it, and the invasion marked where it counts at your wall. A tier, a defrag or hardening takes effect at once, even on an invasion already at the wall.
- **Jack in** (`jack in`, or the button): fight the invasion at the wall yourself. It's as worn down as the wall left it, its armor is intact, and it's a full home kill (XP, code, drops, lead), one fight per virus. A champion is a ★ CHAMPION fight: elite-grade, triple XP. You can't jack in from a run: jack out first. A waiting gate intrusion steps aside and comes back when you next `engage`. There's no daemon that jacks in for you. **Intercept** (`intercept`) is the same against a thief still on its road.
- A chip never ends a home fight you're in (it stops at 1), and nothing chips while you fight the invasion.
- **One crash, not a loop.** An invasion that chips your server to a crash leaves your wall afterwards (online; away it occupies your server, below). One you lost a fight to stays, as worn down as you left it.

### Crash and Degraded mode

At 0 Integrity (a lost home fight, or a breach chipping you out) the server **crashes and reboots at half its max**, then runs **Degraded** for 10 real minutes (it keeps counting with the game closed):

- your wall is down: an invasion still at the wall (one you lost a fight to) waits, and no new one sets out;
- installs pause (the queue picks up where it was).

You can still fight, explore and level. Crashing again restarts the 10 minutes. The top bar, the Map and the Server page show the time left.

**While you're logged off** (played out a minute at a time when you come back, up to a day), solo or in a consortium:
- invasions keep coming on a long passive clock, one every 2–4 hours (no thieves or scouts), and your firewall meets them as usual: blocked, contested or breach. The Firewall card's *Vulnerable to lv N+* is the check before you go: a tier, a defrag or harden.sh;
- swarms, your outposts' natives and your hubs' old owners keep coming too, and each meets that holding's firewall;
- in a consortium, now and then a member steps in and stops one at your wall or outpost;
- a crash while away reboots the server for **2 hours** (Degraded, same rules), and the invasion **occupies** it: HOME shows on your server card with *Connect*. Its processes sit in six folders (services, daemons, vault, logs, cache, wall) and don't come back; clear them all to be back online at once. In a consortium, the virus then moves on along the trunk line.

Testing: `developer invade [raider|pack|pair|champion|saboteur|thief|scout|hoard|nest|hidden]` (an invasion arrives now; a thief sets out), `developer wall <n>|off` (pins your wall's base, or lets it follow the network again), `developer crash`, `developer reboot` (ends Degraded mode).

## The fight in one paragraph

A virus is its parts: a basic attacker and a signature part. Each part wears **armor chits**, and a hit on armor does no damage, however big: it breaks one chit. Strip a part with small hits, then finish it with a big one. Every part owns one heavy, telegraphed attack, and your command always resolves first, so a part you break on the cycle it would fire never fires. There's no drain: only attacks cost you anything, so a well-planned takedown costs nothing. Leave a part bare too long, though, and it patches a chit back. And the parts don't just attack on a timer: each virus announces a move or two a couple of cycles ahead (its **tells**, below), and the part you've left alone is the one that winds up, so what you press changes from cycle to cycle.

## Rules, one per layer

| Layer | Rule |
|---|---|
| Win | Reduce Virus Integrity (the sum of all parts) to zero. |
| Parts | Two per virus, each with one attack shown on the timeline (rare and heavy: every 3–5 cycles). Breaking a part stops its attack; 35% of the time it leaves its loot as salvage. |
| Armor | Chits on a part (◆; a part wearing 2 or more wears half again: 2 → 3, 3 → 5). A hit on an armored part does no damage and breaks one chit; a heavy hit from your command (40+ base: Overload, a due Kill Process…) breaks two, and Kill Process always breaks two. Burn ticks, helper hits and each target of a spread hit count one chit each. A part with no chits left patches one back 5 cycles later (`CONFIG.patchDelay`), unless you break it first. Armor-piercing hits (Backdoor, Bypass) go straight through, at a longer cooldown. |
| Patch | Two cycles after a part loses its last chit, it patches one chit back, unless you've broken it. The timeline shows the patch (◆ patch) in the column where it happens. |
| Veiled | Ghostroot and the Sentinel hide a part's attack timers while it still has armor. Strip it, or Tag it, to see them. |
| Stakes | Damage is the only threat: your server's Integrity at home (0 = crash: reboot at half, Degraded mode), your Signal on a run. Nothing takes your credits, files or trace. Each family hurts you its own way: Ransomware encrypts (damage every cycle that stacks until you break the Encryptor), Worm spawns fragments that gnaw every cycle, Ghostroot's Scrambler hits you (8, scaled like any attack) and scrambles you (for a couple of cycles, each of your attacks has a 25% chance to hit you instead, at half strength), so it's still a threat once the Pulse Node is down. |
| Time | One command per cycle, and entering it turns the cycle at once (so the pace is yours). If you don't, a cycle lasts 12 seconds by default (speed setting: relaxed 12s, the default; normal 8s; fast 5s; `speed <name>` or the button in the top bar). Press Enter on an empty line, or type `now`, to resolve the cycle now. Rules count cycles, so speed never changes balance. Order: your command, then burns and helpers, then encryption, then attacks due that cycle, then patches. No attack lands on cycle 1. |
| Crits | Every hit you land that does damage can crit for ×1.5 (5% base, plus Crit and Crit Damage from protocols). Enemy damage attacks crit too, 10% of the time, from enemy level 3. Timeline numbers show the normal hit, after your Block. |
| Misses | Your damaging skills miss 5% of the time against a same-level enemy, +1% per level it's above you, −1% per level below, less your Accuracy; the HUD shows *you miss N%*. A miss does nothing, and the skill's cooldown is still spent. Enemy damage attacks miss you the same way from their side, plus your Evasion. Burns, helpers and utility skills never miss. |
| Clean | A fight where nothing got through (no damage, encryption included) says so. That's the reward: nothing to repair. |
| Idle | If you type nothing, you Spike the last part you hit. It stops when that part breaks. Type `hold` to do nothing. |
| No part picked | A skill that needs a part, fired without one, goes at the last part you hit, else the part that attacks soonest. |
| Delays | Only Bastion (Suspend, Quarantine) and Operator (Jam) can push an attack back. Breakers answer with Brace and faster kills, Infiltrators with Null Route. A delay moves an attack, not a tell: a tell keeps its own clock. |
| Weak point | Found with Scan (Infiltrator, level 11). It takes +50% damage. When it breaks, a new one forms on another part. |
| Edge | Each class's signature passive, from level 10 (the root of its talent tree). Since subclasses each of these belongs to one subclass (Demolitionist, Warden, Phantom, Herder), and the other subclass has its own (docs/subclasses/): **Breaker, Overkill**: when your hit breaks a part, the damage left over spills onto the next part, up to 20. **Bastion, Grudge**: the part that last hit you takes +20% from your hits. **Infiltrator, Weak Spot**: your first hit on each part's bare code crits (a hit through armor doesn't find it, and doesn't use it up). **Operator, Last Gasp**: each helper hits once more as it expires. |
| Encryption | Each Encrypt adds its amount to a stack; the stack hits you every cycle (after your command and helpers, before attacks). Breaking the Encryptor recovers the key and clears it. Your armor chits and Lockdown stop an Encrypt; shields soak the per-cycle damage; Rollback wipes the stack. |
| Scramble | For a couple of cycles, each of your attacks has a 25% chance to hit you instead, at 50% (it shows SCRAMBLED and the hit on you; the cooldown is spent). Chits and Lockdown stop it. |

## Levels

Two kinds, so a new player never faces everything at once.

- **Hacker level (yours, per class, 1–50).** A long, WoW-style climb. Every class starts at level 1 with Spike and one skill, and levels on its own. **Every level adds 4% power**: your damage, heals, shields and Signal grow (Spike hits 25 at level 1, 44 at 20, 74 at 50), and skill text shows your current numbers. Heals you cast and damage over time take half of it, and Restore and Payload on your gear the rest (see Items). Skills unlock one at a time: level 1 your first skill, 3 your second, 5 your third, 7 your fourth (the class's answer to armor: Crack, Retaliate, Backdoor, Botnet), 10 your class's Edge (a passive: Overkill, Grudge, Weak Spot, Last Gasp), 14/18/22 skills five to seven (the bar is full at 22), then one more every 4 levels from 26 to 38. Past seven you choose which seven to equip.
- **XP (WoW-style):** a kill is worth 20 + 10 × the enemy's level: a home defense 1×, a guard 0.8×, cracking a vault 1.5× and your first run on a location 0.7× (at the location's level). Enemies above you give up to 25% more; each level below you takes 10% off, so ten levels below give nothing. Level L to L+1 takes 5 + 1.2×L kills of your own level (6 at level 1, 27 at 18, 64 at 49): about 1,700 kills to 50 on paper. The first levels used to take 15% more, and that bump is gone (`CONFIG.xpEarly`). In practice most fights are below your level: the pacing bot takes 10–16 hours to reach 20 (level 10 in 2½–5 hours), rarely waiting: it solves log sweeps on the second try 70% of the time, intercepts half the couriers, clears rotations and farms rogue servers on its level.
- **Decoding:** the first time you break a part you've never broken, it's decoded in the Codex and pays one kill of XP (Intel), shown as a *Decoded* row on the win card. At two kills it paid half the XP of levels 1–5, and level 6 took three times as long as level 5.
- **Behind (catch-up):** each level has a target of 6 + 2.2 × level minutes of active play (28 at 10, 50 at 20, 72 at 30, 92 at 39). Once the level you're on runs past 1.25 times its target, kills pay +50% XP until you reach the next level. Only time you played that class counts (the game open and used in the last 2 minutes), so there is nothing to miss by logging off. The log says so when it starts, the spoils card shows a *Behind* row, and the Loadout's XP bar carries a *Behind* tag and the top bar's XP line turns amber while it's on (`CATCHUP` in data.mjs, progression.mjs).
- **Hot strain:** every 4 hours one strain open at your level runs hot: +50% XP and lead from it, on the pager when it changes. Fixed by the 4-hour window, so everyone with the same strains open sees the same one.
- **Rested:** every safe hour you're logged off (no crash) banks a kill's worth of XP, up to 1.5 levels' worth. Kills spend it: each kill pays double until it runs out (a *Rested* row on the spoils card). It rewards building a safe period with your firewall.
- **Varied play pays (Fresh).** XP comes in kinds: **Fights** (kills, invasions, swarms, outpost clears), **Break-ins** (a first run, a vault, a Resident beaten), **Intel** (log sweeps, LANTERN dead drops), **Building** (first crafts, installs, Root levels) and **Trading**. The first XP of a kind other than fighting that you haven't earned in 20 minutes of active play pays half again (at most a kill's worth); the gain shows a *FRESH* row. Nothing fades: doing one thing over and over just pays normally. Events under half a kill never count, so a free action can't farm it. Contracts get no bonus; they count as the activity behind them (a kill contract is fighting).
- **XP away from fighting:** a takeover 1.5 kills (on top of the vault's 1.5); each Root level ¾ of a kill; a cracked dead drop 1.5; a log sweep 1 on the first read (less for each wrong answer, like its lead); the first time you compile each protocol recipe, craft each filter, config, harvester or module, run each service version, or trade at each hub, half a kill (once each).
- **Contracts pay at the level of the work:** a kill contract's XP is paid at the average level of the kills that filled it.
- **Out of the starter area:** if you reach level 4 with no server traced, one is (the family you've chased most); at 5, wick pages you with one you haven't cracked yet (the pager; click it to see it on the map).
- **The kit talent (level 5):** from level 5 one of your class's first-row talents is part of its kit, two free ranks on top of any you buy later: Breaker Overclocked Core (+6% damage), Bastion Patch Notes (Patch heals +6), Infiltrator Recon (Opening +10 damage), Operator Thread Pool (Deploy helpers +2). It shows under the passive on the Loadout page (`LOADOUT.kit`). It replaced the level-5 specialty pick. The Infiltrator's is Recon because two ranks of Heap Spray took a blue Payload from 34% to 21% of its Signal a fight at level 10, far past the few percent the others add.
- **Talent points:** one every other level from 10 (21 by level 50, a full tree).
- **Your server's level is your highest class level.** It has no XP of its own (save v34 dropped it, and banking loot no longer pays any). Its level sets its base Integrity (100, +4% a level), opens daemon slots (+1 at 10 and 20), service v2 (10) and v3 (25), outpost bandwidth (3 + level/4), memory (one more every 5 levels), buildings (by their level) and architecture (20).
- **The level-up banner covers every track.** It lists what the level brings: skills, your subclass, SIGINT, a talent point, a protocol slot, new protocol bases, a new layer, the kit talent, and when the level raises your server, a daemon slot, a service version, an outpost slot, buildings, memory and architecture. Under that it gives the power line (and the server's new Integrity) and a ghost line for the next level that brings something.
- **Enemies have a level (1–60).** Home intrusions come in at your level (random ones sometimes one higher). A location keeps the level it was found at (see Level bands): its guards, vault protocols and code caches are that level, so old locations get easier as you outlevel them. Their size and damage grow 4% a level like yours (a level-1 virus is gentler: 80% of a level-1 match, ramping to 100% by level 6). Mutations from level 4, enemy crits from level 3; more armor chits at 5, 7 and 10. Enemy levels are colored WoW-style: red (5+ above you), orange (3–4 above), yellow (about even), green (below), grey (10+ below, no XP).
- **Level bands.** Each layer of the net has a band (`BANDS` in data.mjs): layer 1 is levels 1–9, layer 2 7–18, layer 3 16–28, layer 4 26–40, layer 5 38–50. **Your layer** is the deepest band you've reached (layer 2 from 7, 3 from 16, 4 from 26, 5 from 38). A server found on a layer whose band holds your level is your level; otherwise 2 more per layer deeper (or less per layer shallower), kept inside the band. So kills trace servers on your layer at your level; trace records, relay route files, injectors and log sweeps lead to the next layer, which sits ahead of you. Rogue servers keep up with you inside their band, then top out.
- **Level gap (WoW-style):** one level up is about even. Past that, each level an enemy has over you takes 7% off everything you deal it (never under 40%) and adds 10% to everything it deals you (`CONFIG.gap`), so orange (3–4 up) is a real fight and red (5+) a gamble: simulated, a geared level-5 player beats a level-9 virus about half the time, and a level-11 one almost never. Below you it goes a little the other way (3% a level, up to +15% dealt and −30% taken).
- **Misses (Classic WoW):** 5% of your damaging hits miss a same-level enemy, +1% per level it's above you, −1% per level below (never under 0); your Accuracy takes some off. It misses you the same way the other direction, plus your Evasion.
- The top bar shows your level; the Map's server card shows the server's level with the class it comes from. The tray shows the next unlock as a ghost key. Testing: `developer level <n>`, `developer server <n>` (a floor under the server's level, for tests). Saves from the 1–25 scale keep what they'd unlocked: a class's level roughly doubles, and the server matches your best class.

## Classes and loadout

You pick your first class right after you log in: four cards, each with its role in MMO terms (Breaker: DPS, Burst; Bastion: Tank, Healer; Infiltrator: DPS, Damage over time, Stealth runs; Operator: Support, Summoner), its passive and its first two skills. Change it on the Loadout page (`archetype <id>`). **Trying classes is free:** until any class reaches level 5 (`LOADOUT.trialUntil`), switching to a class you haven't played takes your level and XP with it. After that each class levels on its own. The Loadout's class cards show the same role tags. The level-up banner lists everything the level brings (see Levels), and one that unlocks a skill puts a *See it on Loadout* button on it, and the Loadout tab's teal count includes new skills until you open it. Your bar has up to 11 keys, shown only once you've unlocked them:

- **Key 1 (everyone):** the free hit that repeats when you give no order, 25 damage with no cooldown. Each class calls it by its own name and types its own word for it: a Breaker's Bash (`bash`), a Bastion's Ban (`ban`), an Infiltrator's Poke (`poke`) and an Operator's Ping (`ping`). `spike` works for every class too.
- **Keys 2–8, then 9 and 0:** your equipped class skills (`equip`, `unequip`). The bar holds seven of them from level 1, an eighth (key 9) from level 22 and a ninth (key 0) from level 30 (`LOADOUT.bar`). A skill you unlock goes onto the bar by itself while a slot is free, so the eighth and ninth slots fill with the skill that opened with them. A closed slot shows on the Loadout as *slot Lv 22* or *slot Lv 30*. A save from before the nine-key bar (save v35) keeps its bar and gets its new slots filled. **Presets** (docs/kits.md): from level 10 each subclass has fifteen keys to choose from (its four core skills and an eleven-skill line), and two shipped presets, `rotation` and one built for a kind of fight. Your bar follows `rotation` as skills unlock until you change it by hand. `loadout use <name>` puts a preset on, `loadout save <name>` keeps the bar you have (up to six a subclass), and `loadout list`, `loadout show <name>` and `loadout delete <name>` do what they say. Swapping works anywhere out of a fight, at home or on a run, and so do `equip` and `unequip`. Every key a swap brings in starts your next fight cooling, as if you had just pressed it. The Loadout page shows your presets as chips over the bar, with a button to save the bar as one. A save from before the fifteen-key lines (save v36) keeps every skill it knew, even one that now opens later, and a bar nobody edited becomes the new `rotation`. Run skills (Spoof, Tap) take no slot: you know them, and you use them on runs by typing them. Delaying ordinary attacks belongs to Bastion and Operator. Each class has its own Edge, a passive from level 10.
- **The - key (everyone, from level 10):** SIGINT (`sigint`, or `interrupt`), the shared interrupt. It stops a cast while it compiles: a crew boss's (see Crew bosses) or a virus part's (see Tells). It's ready every 8 cycles, and it takes your command for the cycle.
- **Situational keys light up.** A skill built for a moment on the board says so on its key when that moment is there, in a word or two in amber: *drain charge* on Suspend when a charge is winding up, *stops a cast* on Quarantine, *fragments* on Fork Bomb, *Exposed ×2* on Stack Smash (situations.mjs). A key a landed tell knocked offline says *OFFLINE* in red until it comes back. docs/skills.md lists every skill's moment.
- **Each skill is simple, with one twist**, WoW style: a **burn** (damage every cycle: Inject stacks, Thermal Runaway grows, Purge heals you as it ticks), a **proc** that lights a key for a cycle or two (Shatter after you strip a part, Overload resetting on a crit), a **reactive** skill (Retaliate after you're hit, Opening after an attack misses you), or an **execute** (Segfault ×3 under 30%). Combos: Exploit then Overload for crits, Firewall then Retaliate, Inject ×3 then Detonate, Deploy then Barrier or Jam.
- **Passives** are always on: Breaker Momentum (each part you break: +10% damage for 2 cycles, up to 3 stacks; another break adds a stack and resets the 2 cycles), Bastion Hardened (the first damage hit on you each fight deals 25% less; half kept the Bastion far below the friction target), Infiltrator Ghost (on a run, `slip` walks past one guard without a fight: no XP or drop, and it's back on guard next run; every fight opens with a Surprise window, see The Sync Window; return trips on runs are free), Operator Extra thread (+1 daemon slot).
- **Statuses** anyone's hits cash in: Exposed (+25% crit chance, 2 cycles, Breaker), Tagged (burns tick +50% and its timer shows even if veiled, Infiltrator), Throttled (its attacks deal half) and Quarantined (+25% damage while its attack is held, Bastion), Hooked (+6 on every hit, helpers and burns too, Operator). Operators run at most 6 helpers at once.
- **Talents:** each class's tree has six rows. Three **choice tiers** (pick one of two) with a **ranked row** before each (two nodes, up to 3 ranks each: small bonuses). A row opens once you've spent enough points in the rows above it: ranks 0, tier 1 needs 3, ranks 4, tier 2 needs 8, ranks 9, tier 3 needs 14. Changing picks and ranks is free at home. Commands: `talent <1-3> <a|b>`, `talent add|remove <node>`, `talent reset`.
- Loadouts change at home only.

## The Sync Window

On **25% of cycles**, a window (10% of the cycle, about a second at normal speed) opens early on the Now column's cycle bar, always inside the first half, at a new spot each time. It's forgiving: a press a little early or late (up to 3% of the cycle either side) still counts. The **Sync** protocol stat (a Utility stat; Phaselock protocols lead with it) adds to that chance, up to +50%. It lights up while the bar is inside it. Fire your command then (Enter, or a key) and it **syncs**: +10% damage, plus your class's sync bonus:

| Class | Sync bonus |
|---|---|
| Breaker | Cracks an extra armor chit on the part you hit |
| Bastion | Shields you for 8 |
| Infiltrator | Stretches your burns on the part you hit by a cycle |
| Operator | Makes each helper hit once more |

**Infiltrator Surprise.** For an Infiltrator the first cycle of every fight always opens a wider window (15%), glowing blue instead of yellow. Fired in it, on top of the sync bonus: Inject lands an extra stack, Tag lasts 6 cycles and its burns tick +75% (not +50%), and Keepalive stretches burns 4 cycles (not 2).

Auto-repeat (the cycle running out) and later steps of a `;` plan never sync. The window's spot comes from the fight and the cycle, not the game's dice, so it never changes other rolls.

## Planning ahead

Separate commands with `;` to plan up to 3 cycles: `exploit encryptor; overload encryptor; spike pulse`. The plan shows across the *You* row (dashed = later cycles). A new command always replaces the whole plan; `cancel` clears it. Later steps check cooldowns when they fire, and a step that can't fire is skipped with a warning.

Who acts in a cycle, in order: **your queued command (or, with nothing typed, a Spike on the last part you hit) → your daemons that are ready → burns and helpers → the virus.**

## Daemons

Daemons are programs you **find**: a `daemon.exe` waits in 10% of vaults (fixed per location), guards drop one 1% of the time (into your pack) and home kills 0.25%. Finding one you already have **upgrades** it (v1 → v2 → v3: its numbers ×1, ×1.5, ×2, and they grow with your power); past v3 it's 3 salvage. A daemon you find isn't slotted for you: you choose on the Loadout page's **Daemons** tab (between Protocols and Skills and talents; `daemons` opens it).

A **slotted daemon acts on its own cooldown, in addition to your order**, right after you act. Its chip sits on the *You* row in the cycle it acts next. The once-per-fight daemons wait for their moment. **Slots:** 1, +1 at server level 10 and 20 (your highest class level), Operators +1. Commands (between fights): `daemon list`, `daemon slot <name>`, `daemon unslot <name>`, or the Loadout page's Daemons tab. No daemon jacks you in or out.

| Daemon | What it does (v1) | Cooldown |
|---|---|---:|
| Sweeper | Hits the part whose attack lands soonest for 10. | 4 |
| Fuzzer | Breaks an armor chit on an armored part. | 5 |
| Stall | Pushes the attack landing soonest back a cycle. | 6 |
| Mender | Heals you 8. | 5 |
| Spider | Burns the part you last hit for 4 a cycle, for 3 cycles. | 5 |
| Mirror | Hits the part you last hit for 12. | 3 |
| Watchman | Once per fight: delays an attack of 20 or more (scaled with your power) by a cycle. v2 delays it two cycles; v3 does it twice a fight. | once per fight |
| Canary | Once per fight: shields you for 15 the first time you drop below half. | once per fight |
| Cron Job | Hits the part winding up a tell for 8 (or the part whose attack lands soonest). It was a home-fight service; as a daemon it fights wherever you do. | 3 |
| Snapshot | Once per fight: the first time a hit drops you below half, restores 8% of your max (v2 12%, v3 16%). It was a home-fight service. | once per fight |

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
- **First-time tips** for learning: the first time something is on screen (your server, an intrusion, the timeline, armor chits, an invasion, the wall, a protocol drop, code, a mutation, a quirk, a hub session and its market (a step at a time as you meet it: the rows, ▲/▼ against other hubs, the condition and news tags, then on the order ticket the slider and why big orders get less each, the preview, transfers taking minutes, and orders in transfer), payloads, every threat on the map (an invasion on its way, contested or breaching your wall, an invasion or swarm at an outpost, a lockdown, an infestation, a swarm or lockdown at a hub you hold, and in a consortium the trunk line, a member under invasion and a crashed member), your first protocol (three steps: Loadout, the Protocols tab, Load; equipping is at home only, and the tip says so if you open it on a run), a found server and the memory it takes, the Status column, plans on the Craft page and at Halcyon, crafted modules, your harvester rack on an outpost card…), a small tip points at it and says how it works, once. One tip at a time. Your first fight is one pause, not four: the timeline, your skills, armor chits and the Sync Window are one tip you click through a step at a time (Next, Enter, or clicking the thing it points at; 1/4 shows where you are), each step pointing at its own thing. Esc skips the rest. One that turns up later still gets its own tip. Tips in a fight pause it until you close them (Got it, Enter on an empty line, Esc, or clicking the thing it points at). "Turn tips off" on any tip, or on the System page, stops them; **Replay tips** there shows them again. After you close one, the next waits a few seconds, and none shows over a disconnect. Seen tips are kept with your settings, so a new game doesn't repeat them.

The log and the terminal still speak (that's the MUD's voice): what happened, in a line. They don't teach.

## The pages, at a glance

Pages show instead of explaining; the words are in the hover.

- **Wall: a level ruler.** Quiet (*no invasions yet*) until something has come for your wall. Then teal for invasion levels your wall stops, amber for the ones it contests, red hatching for the ones that break through, with your server marked on it (`server N`) and the incoming invasion too (`GHOSTROOT N`); each level is a cell, and the marks and the scale's numbers sit on the middle of theirs (a number a mark already shows isn't repeated). The Server page has the full ruler with its numbers; the map's server card shows it as a row like Integrity: a bar of how well it covers the highest level your traced servers send (teal: stopped; amber: contested; red: breaks through) and the level it stops (`stops lv N`); in a consortium an **Away** row does the same for while you're logged off.
- **Selecting:** click a node for its card (and the reticle round it); click empty map, the card's ×, or Esc to close the card and clear the selection.
- **A crowded map:** servers that ask nothing of you right now (finished, detached, a rogue server you're not in, or yours and quiet) draw as dim dots without labels; hover one, select it, or zoom in and its name comes back. Servers under threat, with a contract, freshly found, unexplored or running an outpost keep their labels. Labels never overlap: where two would, the more important server keeps its label (selected, then under threat, then an outpost or where you are, then a contract or fresh find, then the rest) and the other's name waits for hover or zoom. Labels are small and keep their size on screen at any zoom. A **Show** picker at the top left, beside **Map · List**: a dropdown of checkboxes (**Mine**, **Targets**, **Threats**; tick any mix, none ticked shows all, **Show all** clears them) that dims everything outside the ticked groups: Mine is what you hold (taken over, outposts, a hub you hold), Targets is contracts, fresh finds, unexplored servers, leads and unknown servers, Threats is anything attacking you or yours (intrusions, invasions, swarms, sieges, lockdowns, infestations, dead drops).
- **Traffic:** files moving on the net show as dots running along the links. Your market orders and payloads run between your server and the hub: an order is a teal file (a page with a folded corner), a payload a red spiked virus, each with an arrow ahead of it pointing the way it's going (out for a sale or a strike, home for a buy), each at its share of the transfer time. The hubs you've found are joined by a faint backbone on their ring, and their own trade runs along it as files in the sender's colour (not through a hub that's offline). That trade is real: each shipment is a ware going from the hub where it's cheaper to the neighbour that pays more for it, the biggest price gaps first, one per lap, so the traffic shows you where demand is. **Hover any moving file** for its card: the ware (or goods, or payload) and how many, its file name, from → to, and for hub trade the unit price at each end with the gap (▲%); for yours, the credits and the time left. The Show picker dims it; Mine keeps yours.
- **The threat rail** (down the left of the map, under its toolbar): everything coming for you or under way, hottest first, then soonest: a breach or contested invasion, swarms (to an outpost or a hub you hold), natives at an outpost, lockdowns, infestations, a reboot, an open dead drop, and the next invasion's countdown. Each row has its name, where, its time left and a bar; red for what's hitting you, amber for what's on its way. Click one to select it on the map.
- **List mode** (**Map · List** at the top of the map, MOO2's planets list): every server you've found as a row: name (with its faction's mark), family, level (coloured against yours), layer, how much you've explored, and its status (here, invasion, lockdown, infested, swarm, a contract, found, detached, your outpost's stock, yours, a rogue's kind). Click a column to sort (again to reverse); the Show picker applies; click a row and its card opens beside the list. Below the servers: **Hubs** you've found (with how you stand with each) and **Leads and unknown servers** (each trace with its percent, a contract's marker on flagged ones). Every row ends with a **locate** button: back to the map, zoomed in and centred on it, its card open. The same button on the map's toolbar zooms to whatever is selected.
- **Map labels:** under each server's name, its level as `lv N` (coloured by how it compares to yours) and its status if it has one; the ring it sits on (labelled `layer 1`, `layer 2`…) is its layer. A server you've taken over shows only its name: its blue mark says it's yours.
- **The top bar:** the pages on the left; in the middle who you are (handle · class · level, the class's XP as a thin bar under it); on the right the people button, the pager, then Integrity, Signal and credits.
- **HOME on the map:** its name, then Integrity as a thin bar (teal, amber below 60%, red below 30%) with the number under it.
- **A page that fails to draw** shows a red card with the error text and a Back to the map button, instead of freezing the game. Copy that text into a bug report.
- **The map's server card:** the server's level (your highest class level) with that class's name as a tag (hover for what the next level adds), an Integrity bar, the wall, the services you run as a strip of tiles (shown only when you run one), and Memory, Bandwidth and Salvage as counts. Your packed harvesters are on the Craft page, not the server card. An install in progress shows as a small bar.
- **Craft:** every recipe shows what it takes as chips, an icon and *have/need* each (teal when you have it, red when you're short). Protocols and Harvesters each fold, a one-line purpose under each title; what you fold stays folded. Materials are a grid of counts (the Server page uses the same grid). The Server page's Blueprints card and every running service's next version show their cost the same way: a row each for credits, code, Exploits, salvage and the level it needs (your highest class's), *have/need*, red when short; the button carries the build time.
- **Timeline chips** show an attack's name; where a long name won't fit the column, a three-letter code takes its place (Surge → SRG, Encrypt → ENC), never an ellipsis. Hover for the full name.
- **On a phone** (under 480 px): the board shows Now, +1 and +2; chips drop their icon; the skill tray is three wide. Tap a skill to pick it and tap it again to fire it (tapping a part aims it); the keyboard stays down.
- **Paused** shows as a strip across the top of the board (*PAUSED · any order resumes*), not a corner word.
- **The crew column**: a narrow column on the left of every page while you have a crew (none when solo; `sidebar off|on` hides or shows it). Each row: name, then class and level flush with the right end of the Signal bar; it never shakes when they're hit, it outlines red. In a run fight it's the live party: bars, who's down, what each means to do this cycle. The combat log is a short strip under the timeline.
- **Map cards pop up** beside the node you click (to its right, or its left when there's no room): the server card (Level, Integrity and the Wall as one line each; the running services as a strip of tiles; Memory, Bandwidth and Salvage), a location, a hub, an invasion (its own card: the virus, where it's from, what it's doing with a timer bar, one line on how your firewall meets it, Jack in once it's at your wall, and a link to the Firewall). `×`, Escape or a click on empty map closes it.
- **The expected damage and chits** (the white blink on a part's bar, the chit about to go) follow what you're typing: type a different skill at a part and the board shows what that one would do, before you press Enter. A heavy hit shows two chits going.
- **Map:** a server's level is the big number under it in WoW colours (how hard it is for you), its layer a small teal tag (L2, L3); names can show only on hover (**Aa**, or `map names hover|on`). Scroll zooms around the cursor (up to 5×; labels stay readable), drag pans, double-click or ⤢ zooms out.
- **Consortium:** members sit on one grid: online dot, name (a teal edge and a runner icon if they're in your crew, ★ for the founder), class and level, outposts, servers, and where they are (click it to see that server on the map). The dividend is a table, one row per member outpost: whose, which server, what it yields, how much an hour, and how full its share is.

## Factions

Five PvE factions, companies and hacker crews, each with a colour, a mark and a hub on your map (`factions.mjs`). Halcyon is the first of them: its standing is its rep, its retainer and store work as before.

**Every hub: Market and Shop.** A hub's menu has a **Market** (the wares, traded through the order ticket; the same wares everywhere at different prices) and a **Shop**: that faction's own shelf, as tiles (better rep unlocks more of it and trims the price; a hub you hold sells at cost). **Halcyon's Shop is its store** (its own line, plans, chase protocols for Indemnity, agency stock): there's no separate Store tab any more; anything that sent you to the store opens Halcyon's hub at its Shop.

**Finding the hubs.** When the board opens, only Halcyon's hub is on your map (it's your employer). Every other hub you find: its trace starts at 0% and grows when you **locate a server that faction owns** (+40%) and when you **clear a guard or virus off one of its servers** (+20% each, and +2 rep with them: they like that). At 100% the hub is located: a pager alert, it appears on the map, and `connect <faction>` reaches it (before that, connect tells you how far along its trace is). The Leads panel on a run lists each hub you haven't found with its trace. Until a hub is found you can't trade there, deploy payloads at it, or take its work. A faction's rep chip (under the retainer on the Mail page) only shows once you've met it: found its hub or one of its servers. (Only hubs you've traced to 100% count as found.)

| Faction | Kind | Colour | Hub (level) | Allies | Rivals | Goods (on top of the wares) |
|---|---|---|---|---|---|---|
| Halcyon Mutual | company | blue | HALCYON-CLEARING-01 (1) | Kestrel | GLASSJAW, NULL CHOIR | its store (instant, and the only place for heals) |
| GLASSJAW | company | magenta | GLASSJAW-ANNEX-07 (8) | — | Halcyon, LANTERN | key crackers, sealed items, blueprints |
| Kestrel Underwriting | company | green | KESTREL-DC-NORTH (4) | Halcyon | NULL CHOIR | relays, trace injectors, daemon images |
| LANTERN | hacker crew | orange | LANTERN-RELAY-88 (6) | NULL CHOIR | GLASSJAW | bootleg filters (a sealed Stock or Tuned filter at your level), key crackers, trace injectors |
| NULL CHOIR | hacker crew | rose | NULLCHOIR-SQUAT-13 (12) | LANTERN | Halcyon, Kestrel | daemon images, sealed items, key crackers |

- **Rep** runs −100 to 100 with five tiers at 1/25/50/75 (each faction names its own: Kestrel's are Blacklisted, Prospect, Client, Account, Key account). Below 1 a faction is Hostile: its market is shut and it posts you no work. Hostility has depth: rep keeps falling under zero, down to −100, shown as a red segment before the tiers (Halcyon's standing stops at 0). Rep never comes back on its own: win a faction back by hitting its rivals (the ripple), working for its allies, or donating. Everyone starts at 10 (GLASSJAW at 5).
- **Ripples:** whatever rep you gain or lose with a faction, its rivals move half the other way and its allies a quarter the same way. Only what actually changed ripples (a gain at 100 moves nobody). Halcyon's standing ripples too, but never pushes a rival below 0: doing your day job isn't picking a side.
- **Hubs** appear on your map when the contract board opens, on a ring of their own between the first two layers (a diamond in the faction's colour with its mark; its rep tier under the name). Its card shows your rep as a five-step bar and its allies and rivals; **Connect** (or `connect <faction>`) jacks you into the hub's terminal, like any server: an ssh handshake, the hub's banner (its ASCII mark, name, level and your tier), one line from whoever answers (Halcyon's concierge, GLASSJAW's nameless broker, Kestrel's helpdesk, LANTERN's radio op, vesper of NULL CHOIR; your own root shell on a hub you hold) that changes with your rep, and its menu as tokens. Type a number or a word (or click a token): each choice opens its own window beside the terminal (Market, Work, Payloads, Donate, Their servers; Halcyon adds its Store; a hub you hold offers Your hub and Market; Hostile, only Payloads, Donate and Their servers). `menu` prints it again; `0` or `disconnect` closes it. The prompt reads `you@<hub>:~$` while you're in.
- **One market per hub.** Its **wares** (code, Exploits, salvage) are bought and sold at moving prices (see Markets). Its **goods** are the specialty things only that hub sells: buy-only, a few of each, refilled every hour; better tiers buy 5% cheaper per tier from the third, and some goods wait for a tier. Priced at the hub's level or yours, whichever's higher. Everything bought at a hub comes by file transfer, goods included. `buy <faction> <good>` or `market buy <faction> <good>`. Halcyon is the exception: its goods are its store, delivered at once.
- **Work:** once the hubs are up, about half the board (beyond GLASSJAW's off-the-books jobs) is Kestrel's, LANTERN's or NULL CHOIR's: the same kinds of contracts, paying 20% more credits and their own rep instead of Indemnity and Halcyon standing. Their takeover and recovery jobs often point at their rivals' servers. Each offer on the Mail board shows its faction's mark; Mail also shows your tier with each faction.
- **Faction servers:** about one in eight of the servers you trace (never your first two, never rogue ones) belong to Kestrel, GLASSJAW, LANTERN or NULL CHOIR: their colour on the map node, their mark beside it. Opening one's vault takes the server from them: their rep −15, their rivals warm to you (+7).

### Markets

Every hub buys and sells what you farm: Cipher, Worm and Kernel code (base 14 credits), Exploits (140) and salvage (7) (`market.mjs`). The Market card on each hub page shows, for each ware, what you hold (×N), what it pays here, and a chip for how that compares with the average across every hub (▲ green above, ▼ red below; hover it for the average and why), with Sell and Buy buttons. Transfers in progress show as bars that fill until they land.

- **Prices move on things you can't change.** Each hub has its own fixed condition, and one world event at a time touches every hub:

  | Hub | Condition | Effect |
  |---|---|---|
  | Halcyon | Claims backlog | Cipher ×1.35 |
  | GLASSJAW | Black budget | Exploits ×1.5 |
  | Kestrel | Overheating racks | Kernel ×1.8, salvage ×1.25 |
  | LANTERN | Thin bandwidth | Worm ×1.45 |
  | NULL CHOIR | Scrap economy | salvage ×0.6, Cipher ×1.15 |

  World events turn over every 4 hours, never the same twice running: Ransomware outbreak (Cipher ×1.5), Worm season (Worm ×1.5), Patch Tuesday (all code ×0.8), Zero-day rush (Exploits ×1.6), Grid blackout (salvage ×1.5, Kernel ×1.25), Quiet market.
- **Trading: the order ticket.** A hub's market lists each ware once: what you hold, what it pays you (with ▲/▼ against the other hubs) and what it charges. Click a ware to open its ticket: **Sell** or **Buy**, a slider for how many (up to what you hold, or can afford), and a live preview: what you get or pay in total, the price of the first and last unit (each one moves the price), how that compares with the same order at the other hubs you can reach (*vs elsewhere*), and your credits after. Confirm sends it (it arrives after the transfer time).
- **Spread and pressure:** a hub asks 15% over its price and pays 15% under (2% better per rep tier above Probation's). Each unit of a lot is priced after its own push, so selling a lot exactly undoes buying it: no round trip ever turns a profit, not even at a hub you hold. Each unit you sell somewhere takes 4% off its price there (each one you buy adds 4%; between 35% and 160% of normal); the pressure eases 12% an hour, offline too.
- **File transfers:** a sale leaves your stock now and its credits arrive when the transfer completes; a purchase is paid now and arrives later. Transfer time: Halcyon 5 min, Kestrel 8, LANTERN 10, GLASSJAW 12, NULL CHOIR 15; each relay on your servers cuts 10% (up to 40%). Transfers in progress show on the hub's Market card and can't be lost. Hostile factions won't trade.
- `market sell|buy <faction> <ware> <n>` (1–99).
- While a hub is wiped offline (see Payloads), the other hubs pay 25% more for whatever its condition was buying.

### Payloads

**Switched off for now** (`PAYLOAD.on` in payload.mjs), to be revisited: hubs show no Payloads line, `payload` says so, and nothing compiles, flies or strikes. Hubs you already hold stay yours. With payloads off, a hub can't be taken. The rules below are what they do when switched back on.

Viruses you write to hit a faction hub (`payload.mjs`), compiled and deployed from the hub page's Payloads card. They execute on their own when they arrive.

- **Compile:** 60 + 10×level credits, 10 code and 3 salvage. An **Exfil** takes Cipher code and pulls credits plus the code the hub hoards. A **Wiper** takes Worm code and knocks the hub offline. Power is 10 + 2×your level; spending an Exploit arms it (×1.5). You hold three at most.
- **Deploy:** it uploads like a file transfer (same times, relays help). You can't hit a hub that's already offline. A payload that reaches a hub you've taken in the meantime stands down and returns to you.
- **Execution:** power × a roll of ±20% against the hub's defence (12 + 2×hub level, +25% for each recent strike; one step eases every 6 hours). Under 70%, it's **Blocked**. From 70% to 100%, a **Partial** breach does half the job. At 100% and over, it's a **Breach**. Each payload you hold shows its likely band against that hub before you deploy it.
- **Results:**
  - An Exfil on a breach pays 50 + 12×hub level credits and 6 + hub level/2 of the code its condition wants (a hub short of Exploits gives just 1).
  - A Wiper on a breach takes the hub offline for 4 hours (2 on a partial): its market shuts and its map node goes dim.
  - The owner's rep drops 3 when blocked, 6 on a partial and 10 on a breach. The rep ripple warms its rivals.
- **Backdoor** (Kernel code) takes the hub for you, but only if it's offline when the Backdoor executes: Wiper it first, then get a Backdoor in before it comes back up. It shows Blocked until then. A breach captures the hub, costing −40 rep with its owner (the ripple spreads it). Never Halcyon's; two hubs at most.
- `payload compile exfil|wiper|backdoor [exploit]`, `payload deploy <n> <faction>`.

### Hubs you hold

- **Perks:** its market trades at the true price (no spread), its goods sell at 60% with no tier locks, and it earns you a cut of its trade: 10 + 3×hub level credits an hour, times how hot what it deals in is right now (its condition's wares). Real time, offline too; it holds a day's worth. Collect it on the hub page (`hub collect <faction>`). The old owner posts you no work.
- **Swarms from the old owner:** while it's Hostile, it comes for the hub: 30 minutes after the capture, then every 2–4 hours, one at a time. Real time, online or off. The hub has its own firewall (at the hub's level to start; the Your hub window shows it, with Upgrade, Defrag and harden.sh, or `firewall upgrade|defrag|harden <faction>`), and the swarm meets it on arrival: blocked, it bounces; contested, the firewall kills a process now and then; a breach just runs the timer. The hub earns nothing while its swarm is out. 3 processes at the hub's level +1 (never yours), in the faction's virus family (GLASSJAW Ghostroot, NULL CHOIR Ransomware, the rest Worm). 10 minutes out, then 8 minutes to defend; Intercept or Defend one process a fight (`hub defend <faction>`), and the timer waits while you fight (not while the fight is paused). Break it for code, salvage and XP. The hub's map node flashes red with the timer.
- **Lockdown:** if the timer runs out, the hub earns nothing until you retake it (one fight, `hub retake <faction>`). You never lose it for good.
- **Striking a Hostile faction** (without holding its hub) gets one answer: a swarm in its colours at one of your outposts.

### Donations

While your rep with a faction is under 24, its hub page offers **Donate**: credits (80 + 10×hub level) and 5 of the code it wants (Halcyon and NULL CHOIR Cipher, Kestrel Kernel, LANTERN Worm; GLASSJAW takes Exploits), all × (1 + depth/10), where depth is how far under 1 you are. +5 rep each, never past 24: trust you earn. `hub donate <faction>`.


## Server memory

**Switched off while we test playing without it** (`MEMORY.on` false in memory.mjs). Every server you find joins your network at once; there's no attaching or detaching, and the memory pips and Detach buttons are gone. A find you've never connected to still counts toward the cap of 10 never-visited finds. In its place: **Root 3** makes a server stop sending invasions, and a rotated cache is spread over the servers you hold (`ROOT.spread` 6: hold 12 and each cache pays half). Simulated to level 20, pacing barely moved without memory (12.5–13.9 h vs 11.6–14.6 h with it; the same servers found and the same invasions): tracing is what paces finding servers. Flip `MEMORY.on` back to restore what follows.

Memory is how many servers your network holds at once (`MEMORY` in memory.mjs): 4 at server level 1, one more every 5 server levels. Every server you've found and kept attached takes a slot, rogue ones too; SPRAWL-00, consortium servers and servers at Root 3 or more (see Root access) don't. It shows as chip pips on the map's server card. Finds you've never connected to are capped at ten: when an eleventh arrives, the oldest one nothing points at (no contract on it, nothing found through it) drops off the map, with the unknown servers past it.

- **A find arrives off your network.** A server you trace lands on the map dimmed, marked *found*. Nothing is decided for you: its card shows your **free** memory as pips (free now → free after, e.g. *4 → 3/4 free*, the slot it would take blinking; red when there isn't enough). The server card and log messages count free memory the same way and a **Connect** button. Connect (or typing `connect <server>`) opens that prompt on its card first; **Connect · +N** commits it (N: it and anything found past it), **Cancel** backs out. The first connection costs memory only, no credits. With memory full, the pips show red and Connect waits until you detach something.
- **Attach / detach** (a server that was already on your network) from its map card (or `attach <server>`, `detach <server>`): attaching costs 25 + 5 × its level credits, the same every time; detaching is free.
- **Detaching freezes** the server and everything found through it: no runs, its outpost makes nothing, no invasions or swarms, its timers stop, and it frees their slots. Attach it again and it picks up exactly where it was (nothing is made for the frozen time). A server found through a detached one says so and waits for that one.
- Outpost slots still decide how many outposts run; memory decides how many servers you hold.

## The codex

A virus component's name always shows (so you can target it), but what it does reads **???** (a small ? by its name; hover says *Unknown*) until you've broken one of it yourself. Then hovering its name says what it does, on every virus that has it. The System page lists every component by virus: the ones you've decoded with what they do, the rest as ???. A virus you've never met is ??? all the way down, its name and its parts' names too, so the list spoils nothing. Keyed by strain or family and part (a Ransomware Pulse Node and a Worm one are separate). Breaking a new one flashes DECODED.

## Collection log

Every unique and strain trophy has a place in the **Collection** on the System page (`collectionMarkup`), sorted by level: the ones you've found by name, the rest as **???** with their level and where they come from (SPRAWL-00, a guard, a layer's vaults, a rogue server, the storyline, a contract, Halcyon's store, a boss; a strain's trophy names the strain only once you've met it). A missing boss unique also shows that boss's chance a kill, bad-luck protection included. A bar and *N/total* show how far you are. The card stays hidden until your first unique. A new one adds a *New in collection* row to the reward card. It counts the first time you get one, even if a full stash breaks it down; an old save counts what it already holds. A native unique is listed once it's yours, named, or native to a network you know (yours or a member's), with that network as its source.

## Buyout

Timed builds can be finished now for credits, Master of Orion style (`BUYOUT` in combat.mjs): 3× the credit cost when the timer starts, falling with the time left, never under 20. *Finish now · N* sits by the timer.

- **Installs and upgrades** (`buyout`): the service runs at once. Not while the server is degraded.
- **Outposts** (`outpost buyout <server>`): a lockdown ends (base 250 credits), or a building finishes (base half its credits).

## The pager

The pager sits on the top bar, between the tabs and your meters (on narrower screens just its lamp and count). It keeps up to 20 world events on your save, and only while they still matter. News (pay, the retainer, standing, restocks, harvests, flags and finds) goes 10 minutes after it came in, read or not. Something to act on stays while it's true: an offer leaves with it from the board, a ready contract once you deliver it, a swarm or invasion alert once it's over, and nothing stays past an hour. The same news again (the next retainer, another restock) replaces the old line instead of stacking.

- Its little screen scrolls the latest line; the lamp blinks amber while anything is unread, red if it's a breach; the number is how many you haven't seen.
- Click it for **Comms**: the list, newest first (× on any entry clears just that one; Clear clears everything you have seen), filtered by All, Contracts (offers, contracts ready), Mail, Network (flags, relays, locations, invasions, swarms, breaches) or Money (retainer, pay, standing, the store). Each line has its sender, its age and a link to where it happened: the letter or contract in Mail, the server on the map, the Store, or Jack in for a breach. Opening it marks everything read.
- **Handled** lines grey out and clear after 2 minutes: you handled one when you opened what it points at, or ticked it (✓). Lines with nothing to act on count as handled once seen. **Clear** removes everything you've seen.
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
| everyone (level 1) | `bash`, `ban`, `poke` or `ping <part>` (your class's key 1; `spike` works too) | 25 damage | — |

Class skills, in the order they unlock. Since subclasses (level 10) this table is the pre-subclass order: each class keeps its first four as its core (levels 1, 3, 5 and 7), and every skill after that belongs to a subclass line with its own levels (docs/subclasses/). **Lit** skills only work in the cycle or two after their event: Shatter after you break a part's last armor chit, Retaliate after an attack reaches you, Opening after an attack misses you or is delayed. Their key glows while they're lit.

| Who | Level | Skill | What it does | Cooldown |
|---|---:|---|---|---:|
| Breaker | 1 | `overload <part>` | 40 damage. If it crits, its cooldown resets. | 3 |
| Breaker | 3 | `exploit <part>` | 15 damage, and Exposed this cycle and next: every hit on it from anyone has +25% crit chance. | 2 |
| Breaker | 5 | `flood <part>` | 38 damage, double on a part with no armor left. | 6 |
| Breaker | 10 | `crack <part>` | Breaks 3 armor chits on it at once. | 2 |
| Breaker | 14 | `brace` | For 2 cycles: +5 Block, and whatever hits you loses an armor chit (or takes 10 if it has none). | 5 |
| Breaker | 18 | `shatter <part>` | Lights up for 2 cycles when you break a part's last armor chit. 38 damage. | lit |
| Breaker | 22 | `segfault <part>` | 30 damage, three times that on a part under 30%. | 3 |
| Breaker | 26 | `fork-bomb` | 15 damage to every part, 30 to an Exposed one. | 3 |
| Breaker | 30 | `thermal-runaway <part>` | Burns it for 6, then 10, 14 and 18. | 4 |
| Breaker | 34 | `sudo` | This cycle and next, every hit you land crits. | 6 |
| Breaker | 38 | `zero-day <part>` | 65 damage straight through armor. Once per fight. | once |
| Bastion | 1 | `rate-limit <part>` | 45 damage, +15 if its attack is due this cycle, and its next attack deals half (Throttled). On armor it breaks 2 chits. | 3 |
| Bastion | 3 | `firewall` | Shields you from the next 16 damage. If it soaks a whole hit, Retaliate lights up. | 4 |
| Bastion | 5 | `purge <part>` | Burns it for 6 a cycle for 4 cycles; each tick heals you 2. It also clears your encryption. | 4 |
| Bastion | 7 | `retaliate <part>` | Hits back for twice the size of the last attack that reached you (or your shield), up to 60, the cycle after. | lit |
| Bastion | 14 | `suspend [part]` | SIGSTOP: push its attack back 2 cycles. With no part, the attack landing soonest. | 4 |
| Bastion | 18 | `patch` | Heal 4 now, then 2 a cycle for 3 cycles. In a crew, `patch <name>` heals that crewmate instead. | 4 |
| Bastion | 22 | `throttle [part]` | Its attacks deal half for 3 cycles. | 4 |
| Bastion | 26 | `harden` | Gain an armor chit: the next attack on you does nothing, however big. | 6 |
| Bastion | 30 | `reclaim <part>` | 35 damage, and you heal half of what it does. On armor it breaks 2 chits. | 3 |
| Bastion | 34 | `quarantine [part]` | Push its attack back 3 cycles; while it waits, it takes +25% damage. | 6 |
| Bastion | 38 | `failover` | Hit every part for a quarter of your missing health (at least 20). | 5 |
| Infiltrator | 1 | `inject <part>` | 12 damage every cycle for 3 cycles. It stacks: up to 3 on one part, each with its own timer. The part shows a tag like *Inject ×2/3 · 24* (hover for each stack's cycles left). | 1 |
| Infiltrator | 3 | `tag <part>` | 10 damage, and for 4 cycles burns on it tick 50% harder and its timer shows even if it is veiled. | 3 |
| Infiltrator | 5 | `keepalive <part>` | Every burn on it ticks once now and lasts 2 cycles longer. | 3 |
| Infiltrator | 10 | `backdoor <part>` | 24 damage straight through armor, +6 for each burn on it. | 4 |
| Infiltrator | 14 | `null-route` | The next attack misses you, and your next skill crits. | 6 |
| Infiltrator | 18 | `detonate <part>` | Every burn on it deals all its remaining damage now, ×1.5. A Rootkit Implant keeps burning (it has no end to cash in). | 4 |
| Infiltrator | 22 | `opening <part>` | Hits it for 50 the cycle after an attack misses you or is delayed. | lit |
| Infiltrator | 26 | `propagate <part>` | Copy your burns on it to every other part. | 5 |
| Infiltrator | 30 | `spoof` (runs) | On runs: once per run, the next guarded folder doesn't start a fight. Read and pull one file there. | once/run |
| Infiltrator | 34 | `tap` (runs) | On runs: once per run, print the whole folder tree, its guards, and which file holds the key. | once/run |
| Infiltrator | 38 | `implant <part>` | Burns it for 10 every cycle until the part breaks. Once per fight. | once |
| Operator | 1 | `deploy <part>` | Sends a helper to hit it for 12 every cycle for 4 cycles (it moves on if the part breaks). | 4 |
| Operator | 3 | `hook <part>` | 10 damage, and Hooked for 4 cycles: every hit on it from anyone (helpers and burns too) gets +6. | 3 |
| Operator | 5 | `spawn <part>` | Sends a small helper to hit it for 7 every cycle for 3 cycles. | 1 |
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
| Bastion | Patch Notes: Patch heals +3 per rank · Stateful Firewall: Firewall absorbs +5 per rank | Token Bucket: Rate Limit +4 damage per rank · Redundancy: +4 max Signal on runs per rank | Hardened Kernel: Take 3% less damage from attacks per rank · Reverse Shell: Retaliate hits +5 per rank |
| Infiltrator | Heap Spray: Inject +2 per tick per rank · Recon: Opening +5 damage per rank | Backchannel: Backdoor +4 damage per rank · Onion Routing: +3 max Signal on runs per rank | Persistent Tag: Tagged burns tick +10% more per rank · Low Profile: Take 3% less damage from attacks per rank |
| Operator | Thread Pool: Deploy helpers deal +1 per rank · Kernel Hook: Hooked parts take +1 more per hit per rank | Node Pool: Botnet helpers deal +1 per rank · Dead Man’s Switch: Kill Switch cashes in +5% per rank | Load Balancer: Take 3% less damage from attacks per rank · Extra Memory: +3 max Signal on runs per rank |

All numbers are per rank.

### Talent choices

| Class | Tier 1 (3 points above) | Tier 2 (8 above) | Tier 3 (14 above) |
|---|---|---|---|
| Breaker | Sharp Exploit: Exploit also deals 20 damage · or · Hair Trigger: Overload has cooldown 2 but deals 35 | Core Dump: Segfault's execute starts under 40% · or · Piercing: Your first Overload each fight goes straight through armor | Cascade Failure: Your first break each fight resets your cooldowns · or · Unsafe Mode: +30% damage dealt, +20% damage taken |
| Bastion | Deep Packet Inspection: Firewall absorbs 30 · or · Service Pack: Patch heals 10 up front | Backpressure: Throttled cuts attacks by 75% · or · Active Defense: Retaliate stays lit for 2 cycles | Uptime: Once per fight, a hit that would drop you to 0 leaves you at 1 · or · Preemption: Suspend has cooldown 2 |
| Infiltrator | Fast Hands: Opening stays lit for 2 cycles · or · Supercookie: Tag lasts 6 cycles | Polymorphic: Inject lasts 5 cycles · or · Rotating Proxies: Spoof twice per run | Leaked Creds: Slip past 3 guards a run instead of 1 · or · Assassinate: Detonate on a Tagged part deals double |
| Operator | Big Process: Deploy helpers deal 14 · or · Long-running: Deploy helpers last 6 cycles | Extra Nodes: Botnet sends 4 helpers · or · Hive: Your helper cap is 9 | Parallel Deploy: Deploy starts two helpers at half damage: same total, twice the hits for Hook · or · Supervisor: Kill Switch readies Deploy |

Order within a cycle: your command → burns → helpers → heals over time → enemy attacks → patches.

## The Resident and bosses

**Taking a server.** Opening a vault no longer takes the server. It opens `/core` at the root, where the server's **Resident** lives: the owner's process, a boss built from the server's family (all three parts) at the server's level, with 1.4× Integrity (1.1× on your first server). A Cloak doesn't get you past it. Beat it and the server is yours (`RESIDENT` in run.mjs, `BOSSES.resident` in data.mjs). Lose and you're disconnected as usual, and for the next 6 hours the Resident is a level stronger, up to three levels for three losses. On a server you hold, `/core` is quiet.

**Bosses** have phases and an enrage timer. At half its total Integrity the Resident re-arms every part (**PHASE 2**). From cycle 18 it **enrages**: every attack lands every cycle, a quarter harder, with a warning three cycles before. Scripted classes at the Resident's level win it about two times in three.

**Early bosses**, on the same phase system (`BOSSES` in data.mjs). Each is a three-part virus of its family at your level:

| Boss | Where | From | Integrity | Phases | Enrages |
|---|---|---|---|---|---|
| RELAY-KING (worm) | SPRAWL-00's `/net/relay`, back 30 minutes after you beat it (it stays if it beats you) | level 3 | 1.6× | at half: every attack comes a cycle sooner | cycle 16 |
| REPO MAN (ransomware) | The Bounty event from level 8 | level 8 | 1.6× | at 60%: re-arms every part; at 30%: every attack a cycle sooner | cycle 18 |
| HOLLOW CHOIR (ghostroot) | Its own event (Boss) from level 10, 25 minutes on a traced server | level 10 | 1.6× | at half: splits off a second Decoy on the off-beat, so it mirrors you two cycles in four | cycle 16 |

Each network's **native boss** (nine templates, in its lair) is on the same system; see Networks. A boss drops like an elite (three loot rolls). The Hollow Choir also pays twice the bounty's credits and a Custom protocol. A phase change flashes on screen.

**Boss uniques.** Each boss has two uniques of its own (`BOSS_LOOT`). A kill has a 30% chance to drop one, and every kill that drops none adds 10% to the next, back to 30% once one drops. One you haven't found comes first. A Resident (met on every takeover) drops each of its two only once (`BOSS_LOOT.once`); once you hold both, its roll gives a world unique you don't have yet (one that drops in SPRAWL-00, vaults, guards or rogue servers, up to two levels over the Resident), or a yellow when there's none left. After a miss the log says the next kill's chance, and the Collection shows it beside each boss unique you're missing.

| Boss | Unique | What it does |
|---|---|---|
| RELAY-KING | Crown Packet (exploit, level 3) | +30% damage on a part whose attack lands this cycle or next |
| RELAY-KING | Hop Limit (shell, level 3) | When an attack lands on you, restore 3% of your health |
| A Resident | Squatter's Rights (proxy, level 4) | Start every fight with a ◆ |
| A Resident | Eviction Notice (exploit, level 4) | When you break a part, all your cooldowns drop by 1 |
| REPO MAN | Lien (script, level 8) | +6 damage on a part with no armor left |
| REPO MAN | Repossessed Key (shell, level 8) | Encryption on you stacks half as fast |
| HOLLOW CHOIR | Choirboy (proxy, level 10) | Scrambles on you last one cycle less |
| HOLLOW CHOIR | Hollow Note (exploit, level 10) | +30% damage on odd cycles |

**Regrowth.** A held server whose lockdown runs out without you retaking it counts it. Two of those within 24 hours and the Resident regrows: the server isn't yours until you beat it in `/core` again. What you built there waits.

## Tells (tells.mjs)

Every virus that fights you alone brings **tells**: moves a part announces a couple of cycles ahead, that you answer. Wild viruses, guards, elites, strains, champions, the solo bosses and home intrusions all have them; crew bosses have their own mechanics instead (Crew bosses, below). docs/solo-tells.md is the designer's review sheet, with every tell by family.

**Nothing lands unannounced.** A tell is said once in the log when it's announced (*The Replicator charges its Replicate into MASS MAILER. It lands in 3 cycles. Hit the Replicator once with a command before then to call it off.*) and sits as a chip on its part's row, in the column it lands, until it does. The chip says what it is and what it does, and its last line says exactly what counts as an answer (*hit it*, *hit it ×2*, *SIGINT or hit ×2*, *strip ◆2*, *strip it*, *go quiet*). Hover it for the whole rule: what counts, what reading it pays, and what it leaves behind if it lands. A veiled part's tell shows anyway. Breaking a tell's part always stops it.

**One clock.** A tell never runs on a timer of its own. A charge powers up one of its part's attacks that is already on the board: that attack's cell turns into the charge at least two cycles ahead (three at levels 1 to 5), and it lands exactly when the attack was due. If you delay the attack (Rate Limit, Jam), the charge moves with it. A cast or a seal gets its own cell on its part's row, two cycles ahead or more.

**No pile-ups.** A charge never lands on the same cycle as another part's heavy attack, or on the Mimic's beat. Below level 17 one tell is live at a time. From 17 two can be, and never on the same cycle.

**A fixed part.** Each tell sits on one part, always the same for its family, guard or strain: the signature part for its charge, its cast and its seal (the Encryptor, the Replicator, the Scrambler), the plain attacker for the second charge from level 17 (Overcharge on the Pulse Node), and the rule's part for a strain's charge. The chip and the codex name it. The Mimic's beat belongs to the Mimic.

| Kind | What it is | What answers it | If you don't |
|---|---|---|---|
| Charge | The part's next scheduled attack, much bigger, in that attack's cell. | A command of yours aimed at the part before it lands: one hit, two for an elite's or a boss's. The Bouncer's Battering Ram asks for ◆2 broken off its Gate instead. A skill built for charges answers it outright (Suspend, Spoofed ACK, Jam, Hijack, Blackhole, Kill Switch, IRQ Storm). Or soften it when it lands (a ◆, a shield, Brace, Bulkhead, Throttle, Heartbeat). Called off, the attack still lands, plain. | From level 10 it can add a quarter of your max on top of the plain hit (a tenth at 1–5, 15% at 6–9), never more than half your max in one hit. Charges don't crit. Then the after-effects. |
| Cast | *Compiling…*: a buff on the virus for 4 cycles. From level 10, when you have SIGINT. | SIGINT, or two command hits on the part, or a skill built for it (Quarantine, Overvolt's two hits, Thermal Runaway's ticks, Hijack, Reroute, IRQ Storm, Kill Switch). | Double Extortion: its attacks hit 35% harder. Persistence and Call Home: its attacks repeat a cycle faster (what's on the board stays put). Self-Update: every part grows a quarter more Integrity. Then the after-effects. |
| Seal | If the part still wears ◆ when it lands, it re-arms. From level 6, elites and bosses. | Strip it first. Bit Rot and Cache Poison make it fail even with ◆ on. | It re-arms to full with one ◆ more for the rest of the fight, and every part you stripped gets a ◆ back. From level 6 your own ◆ and shield go with it, and you're Corrupted. |
| Mimic | The Mimic part (ghostroot, from level 8) records you, and on its beat plays back the command you fire then. | Fire something with no direct hit on its beat: a debuff, a strip, a burn, a helper, a shield, or hold. | Your command's whole direct hit, at you. |

**Only deliberate answers count.** A command of yours aimed at the tell's part, typed after the tell was said. Area hits (Fork Bomb, Shatter's spill, Chain Reaction), burns, helpers, a crewmate's splash, your auto-repeat Spike and daemons don't count, though they still do their damage. A skill that hits for you later counts as the command you typed (Thermal Runaway's ticks, Kill Switch's cash-in, Reroute's arrivals). Each command counts once (Overvolt twice). Double Tap and Spectre make each one count twice.

**Reading pays.** A charge, a cast or the Mimic's beat answered by a read leaves the part **Open**: it takes 50% more from everyone for 2 cycles (*READ: the Replicator is open.*, and the part flashes). A seal stopped by a strip readies the skill that did it. Each read adds a tenth of the kill's XP to the kill, up to 40% (*Read 3 tells: +42 XP.*). Read every tell in a fight (two or more said, none landed) and its loot rolls once more. Gear that fires when you call off a tell (Ctrl-C, Interrupt Vector, Abort Handler, Exception Handler) fires on every read.

**Ignoring hurts.** A charge or a cast that gets through leaves something behind (`TELL.tiers`):
- **Offline**: the last skill you used (not Spike or SIGINT) is knocked offline, 1 cycle at levels 6 to 9 and 2 from 10. Its key says *OFFLINE*.
- **Corrupted**: you lose 2% of your max a cycle for 3 cycles at 6 to 9, 4% at 10 to 16 and 5% from 17. Purge, Scrub or Rollback cleanses it.
- **Hung** (from 10): your next command doesn't fire.

Levels 1 to 5 have none of these. There, a charge is all a tell costs.

**By level** (`TELL.tiers`):

| Levels | Tells a wild virus brings | Live at once | Warning | Charge (the extra over the plain hit, at most) | After-effects |
|---|---|---|---|---|---|
| 1–5 | One, its charge | 1 | 3 cycles | ×2, 10% of your max | None |
| 6–9 | One, its charge | 1 | 2 cycles | ×2.3, 15% | Offline 1, Corrupted 2% |
| 10–16 | Two: its charge and its cast | 1 | 2 cycles | ×2.8, 25% | Offline 2, Corrupted 4%, Hung |
| 17+ | Three: its charge, its cast and Overcharge on its other attacker | 2 | 2 cycles | ×3, 25% | Offline 2, Corrupted 5%, Hung |

An **elite** brings one more (its family's seal) and its charges take two hits and cost up to 15% more; a **solo boss** brings every tell open at its level, its charges taking two hits; a **champion** invasion brings the usual ones, its charges a tenth bigger. SPRAWL-00's first two kills (while its hits land at 60%) bring none. After a tell lands or is answered, the next of its kind waits 4 cycles (a charge) or 7 (a cast or a seal), plus up to 2.

**Who brings what** (`TELL_SETS`): Ransomware: Full Disk (a charge: its Encrypt, and a burst of encryption on top for 3 cycles, that goes when the Encryptor breaks, with Purge, Scrub or Rollback), Double Extortion, Overcharge, Key Rotation. Worm: Mass Mailer (a Replicate that hatches two fragments, up to the limit), Self-Update, Overcharge, Resync. Ghostroot: Possession (a Scramble that lasts two cycles longer: Scrub cleanses it), Persistence, Overcharge, Go Dark. A strain brings a charge of its own on its rule's part (the Patchwork's Hotfix heals far more, the Floodgate's Deluge floods, the Keylogger's Keystorm dumps), and its lineage's cast and seal. Guards: the Watchdog's and the Tracer's Lock-on, the Crawler's Infest, the Shredder's Deep Shred (it also shreds the newest code or credits file in your pack, never a protocol or a blueprint), the Bouncer's Battering Ram (strip ◆2 off its Gate), the Sentinel's Blacklist (a seal); from level 10 each also has Call Home.

**SIGINT in solo fights** stops a solo cast at the price of your command for the cycle, and a cast is the only tell it answers. It's ready every 8 cycles and casts come every 7 or so, so a class with a skill built for casts keeps SIGINT for the next one.

**The bots read tells too** (planner.mjs, `tellMove` in tells.mjs, and each class's planner in dist/classes): they answer a charge on its last chance when what it adds and leaves behind is worth a command, with a skill built for it when they have one; they answer a cast with their own skill first and SIGINT after; they fire something quiet on the Mimic's beat; they strip a part about to seal. A kill comes first unless a bigger charge lands now. `TELL.bots.answer = false` is a bot that plays as if it can't see them: on the class-balance fights it loses about 13 points more Signal a fight from level 10 (18 at 10, 13 at 18 and 8 at 30), wins 503 of 576 fights against the reader's 557, and at levels 5 and 8 loses about 1 and 9 points more (balance.test.mjs checks the gap).

## Crew bosses (raid.mjs)

A **crew boss** is built for a crew of four, like a WoW raid boss: in every phase the tank, the healer, the damage dealers and support each have a job, and a missed job costs the fight. KESSLER-FARM-00's three are crew bosses. The other bosses (RELAY-KING, REPO MAN, HOLLOW CHOIR, the Residents) stay solo: those are about learning the mob, and they bring every tell open at their level (see Tells).

**Nothing big lands unannounced.** Every mechanic is announced two cycles before it lands, on the board and in the log (`PINK SLIP → kilo in 2.`). The board has a row for the boss above its parts: each chip sits on the cycle it lands, says who it's going at, and shows *Compiling…* when it's a cast. Hover a chip for what it does and how much.

**Who it hits** (a target rule on each mechanic, and on the boss's own parts):
- **everyone**, in full;
- **aggro**: whoever is drawing fire (a Bastion's Firewall or the Warden's Bulkhead), otherwise whoever dealt the most damage over the last 3 cycles;
- **marked**: a random player who isn't holding aggro, picked when it's announced (and not anyone marked in the last 5 cycles, while there's anyone else);
- **lowest**: the lowest Signal (as a share of its max) when it lands;
- **healer**: whoever cast the most heals over the last 6 cycles.

**The mechanic library.** A mechanic's size is a share of its target's max Signal, so a level doesn't change what it means.

| Mechanic | Whose job | What it does | Missed |
|---|---|---|---|
| Buster | Tank | A big hit on whoever holds aggro. Some leave **Thermal Stress**: +25% damage taken a stack, until Purge clears it | It lands on a damage dealer, who can take one at most |
| Pulse | Healer | A hit on everyone, some growing each time | The crew wears down |
| Burst | Healer | A big hit on a marked player | The marked player drops low or goes down |
| Corruption | Healer | Damage every cycle until Patch, Scrub or Purge cleanses it (some spread to someone else if left 3 cycles) | It never stops, and spreads |
| Encrypted sectors | Healer | Eat the next heals on their target, until healed through or Scrubbed | The healer can't heal |
| Workers | Tank | Adds that hit the marked player every cycle unless someone draws fire | The marked player is chewed up while damage breaks them |
| Priority add | Damage | While it lives the boss takes 75% less damage, and every few cycles it goes off on everyone | It goes off, again and again |
| Firewall phase | Damage, everyone | A shield over the boss: every hit lands on it, armor or not. Break it in 3 cycles | It goes off on everyone |
| Cast | Support, anyone | *Compiling…*: SIGINT stops it, unless it can't be interrupted | Whatever it casts lands |
| Enrage | Damage | From its cycle the boss hits everyone every cycle, and its parts attack every cycle | The crew dies |

**SIGINT** (the - key, `sigint` or `interrupt`, everyone's from level 10) stops a crew boss's cast while it compiles (and a solo virus's cast: see Tells). It only works on a cast (not an ordinary attack), it's ready every 8 cycles, some casts can't be interrupted, and an interrupted boss casts its next one a cycle sooner. A crew of four has four of them, so the job is to take turns.

**Losing.** You going down still ends the fight. So does a **wipe**: half the crew down (two of three or four). One missed mechanic costs a big share of someone's Signal, or downs them; two usually lose the fight.

**Smaller crews.** A crew boss is sized for four. A crew of three meets one with 72% of the Integrity and mechanics at 80%; two, 42% and half. It enrages 3 cycles later for each player short of four.

**Early levels.** Mechanics scale with the boss's level: two fifths of their size to level 9 (no subclasses, no heals, no SIGINT yet), three fifths at 13, full from 17 and a fifth more by 30, and the boss has a fifth less Integrity at level 9 and below, rising to full at 18. Before level 10 a boss casts nothing SIGINT would stop, and Corruption waits for level 12 (Patch).

**The bots** (planner.mjs, bastion.mjs) play every mechanic, so crew sims can play the bosses: the Warden taunts for every buster and saves Bulkhead for it, purges Thermal Stress between busters and pulls the workers; the Sysop cleanses Corruption (saving Patch when one is coming), tops up whoever a big hit is marked for and keeps the crew topped up; damage dealers switch to the priority add and the workers; one crewmate takes each cast (support first, by name; never counting on you), and everyone hits a firewall phase's shield. Only the tank taunts.

### The farm's three

Each boss's phases, with what each role does. docs/bosses.md has the designer's review sheet with what happens if each role fails, and the sim results.

**THE FOREMAN** (ransomware): the tank and SIGINT check. Integrity ×13, enrages at cycle 22 (MASS LAYOFF hits everyone). Its Surge goes at whoever holds aggro; its Encryptor no longer encrypts (Layoffs does).

| Phase | Tank | Healer | Damage | Support |
|---|---|---|---|---|
| Day shift (100–50%) | Taunt and Bulkhead for **Pink Slip** (90% of max Signal on whoever holds aggro, every 6), and pull the **Scabs** (two adds on a marked player, every 7) | Heal the tank back up after each Pink Slip, and everyone after **Shift Bell** (10%, every 5) | Break the **Payroll Lockbox** (the boss takes 75% less while it lives; it goes off for 30% on everyone every 4) and the Scabs | SIGINT **Clock In** (a cast: 45% on everyone, every 5) |
| Layoffs (under 50%) | Pink Slip now leaves Thermal Stress: Purge it off between busters | Cleanse any Layoffs that gets through (Patch, Purge) | Burn the boss before the enrage, and the Scabs | SIGINT **Layoffs** (a cast, every 5: if it lands it encrypts the whole crew, 8% a cycle until cleansed) |

**HEATSINK** (worm): the healer check. Integrity ×17, enrages at cycle 25 (THERMAL RUNAWAY). Its Surge goes at whoever holds aggro, its Mirror's Splice at the lowest; its Replicator sends workers instead of fragments.

| Phase | Tank | Healer | Damage | Support |
|---|---|---|---|---|
| Warm loop (100–40%) | Pull the **Coolant Workers** (two adds on a marked player, every 7, while the Replicator lives) | Heal through **Thermal Spike** (6% on everyone every 3, growing), top up the player marked for **Overheat** (30%, every 5) and cleanse **Coolant Leak** (10% a cycle on a marked player until cleansed, every 4) | Break the workers, or the Replicator to stop them | SIGINT **Fan Stall** (a cast: 6% a cycle on everyone for 4, every 8) |
| Meltdown (under 40%) | Take **Core Melt** (40% on whoever holds aggro, every 5) | Thermal Spike every 2. Coolant Leak lands on two players every 6, and spreads to someone else if left 3 cycles: cleanse it fast | Burn the boss before the enrage | SIGINT Fan Stall |

**COLDWALLET** (ghostroot): the damage check, and everyone's. Integrity ×8, enrages at cycle 18 (LIQUIDATION). Its Surge goes at whoever holds aggro; its Decoy still mirrors your commands on its beat.

| Phase | Tank | Healer | Damage | Support |
|---|---|---|---|---|
| Hot wallet (100–50%) | Taunt and mitigate **Margin Call** (55% on whoever holds aggro, every 4) | Heal the tank, and everyone after **Gas Fee** (10%, every 4) | Break **Cold Storage** in time (a shield of 12% of the boss's Integrity every 6: every hit lands on it; unbroken in 3 cycles it goes off for 35% on everyone), and don't hit into the Decoy's beat | SIGINT **Rug Pull** (a cast: 30% on everyone, every 7). Everyone hits Cold Storage |
| Bank run (under 50%) | Margin Call | Heal through **Encrypted Sectors** (they eat the next 30% of max Signal of heals on the healer, every 6) and top everyone up before **Withdrawal** | Break Cold Storage, and beat the enrage at 18 | **Withdrawal** is a cast nobody can interrupt (30% on everyone, every 5): everyone stays topped up and uses their defences |

**Adding a crew boss** takes only data: give its `BOSSES` entry a `raid` with its part target rules, the parts whose attack a mechanic replaces, its enrage hit and its phases, each a list of library mechanics with their numbers (`FOREMAN`, `HEATSINK` and `COLDWALLET` in data.mjs are the examples). The engine, the bots and the board read the same data.

## Families and mutations

Home intrusions (100 Integrity to defend). Numbers are at enemy level 6; Integrity and damage scale 4% per level (a level-1 Pulse Node has 27 Integrity and hits for 11).

| Family | Threatens | Basic part | Signature part |
|---|---|---|---|
| Ransomware (CRYPTJACK) | Integrity | Pulse Node: 34, ◆, Surge 14 every 4 (first cycle 3) | Encryptor: 38, ◆ (◆◆ from level 5), Encrypt every 5 (first cycle 4): +4 damage per cycle, stacking, until it breaks |
| Worm (SPLINTER) | Integrity | Pulse Node: 34, ◆, Surge 12 every 4 (first cycle 4) | Replicator: 38, ◆ (◆◆ from level 5), spawns a fragment every 4 (first cycle 3) with a 4-damage Splice. Fragments: 18 Integrity (scaled like the virus's health, not its damage), no armor, gnaw 3 every cycle, max 3 |
| Ghostroot (GHOSTROOT) | Integrity | Pulse Node: 34, ◆, veiled, Surge 11 every 4 (first cycle 3) | Scrambler: 40, ◆ (◆◆ from level 5), veiled, Scramble every 4 (first cycle 2), hitting for 9: Scrambled for 2 cycles, each of your attacks 25% likely to hit you instead at half |

**Third parts.** From level 3 (ghostroot from 4), wild viruses of each family bring a third part, and the other two give up 15% of their Integrity for it. Each family has a pool of them: a virus brings one of those open at its level, picked by its seed (`pool: 'third'` in data.mjs), so from level 8 the same family can be two different fights. Each one changes the fight by living or dying, so kill order is the decision, and each shows on the board (a tag, a chip, the codex line). Named fixtures (CRYPTJACK, SPLINTER, GHOSTROOT) keep two parts, and a boss keeps its family's first.

| Family | Third part | What it does |
|---|---|---|
| Ransomware | **Lockbox** (from level 3): 16, ◆, no attack | Wards the Encryptor: while the Lockbox lives, the Encryptor loses at most 25% of its max Integrity a cycle, from everything (`CONFIG.ward`). The rest shows as *warded: N held back*. Break the Lockbox first, or chip the Encryptor under the cap while encryption stacks. |
| Worm | **Mirror** (from level 3): 18, ◆, Splice 3 every 4 | Twinned with the Replicator: break one while the other lives and a **Reboot** chip appears; 3 cycles later it comes back at 40% with its armor, once (`CONFIG.twinReboot`). Break both close together. |
| Ghostroot | **Decoy** (from level 4): 18, ◆, veiled | Every 4th cycle a **Mirror** chip sits in its column: your own commands that cycle do nothing, and 30% of the hit bounces back (never your last point; `CONFIG.mirrorBounce`). Burns, helpers and your server's hits get through. Veiled, so you see the beat only once its armor is gone (or it's Tagged). Breaking it ends the mirroring. |
| Ransomware | **Mutex** (from level 8): 18, ◆, no attack | Holds a lock on the Encryptor: a shield of a quarter of its max (a *lock N* tag) that takes every hit first, burns and helpers too. Break the lock and it comes back 4 cycles later while the Mutex lives (`CONFIG.mutex`). Break the Mutex first, or burst through the lock in one go. |
| Ransomware | **Tripwire** (from level 20): 18, ◆, Ping 3 every 3 | Break it while the others stand and they go loud: 25% harder and every attack a cycle sooner, for the rest of the fight (`CONFIG.tripwire`). Break it last, and live with its Ping meanwhile. |
| Worm | **C2 Node** (from level 8): 18, ◆, Beacon 3 every 4 | Commands the fragments: they gnaw half again as hard while it lives, and every one of them drops when it breaks (`CONFIG.c2`). Break it once the fragments pile up (after a Mass Mailer). |
| Ghostroot | **Mimic** (from level 8): 18, ◆, veiled, no attack | Records you. Every 4 cycles (its tell, announced two ahead) it plays the command you fire that cycle back at you, its whole direct hit. Fire something with no hit in it then (a debuff, a strip, a burn, a shield). Breaking it ends it. |

Guards on runs are lighter (you have 50 Signal): Watchdog (Sentry 24 bare, Sweep 6 every 3; Tracker 28 ◆, Trace-back 16 every 5), Sentinel (Lens and Lockout, 24 ◆ each, both veiled), Crawler (Maw 24 bare; Brood 28 ◆ spawns fragments), Shredder (Grinder 26 ◆, Grind 9 every 4; Shredder 26 ◆, Shred 14 every 5).

**Enemy level** is set by the server level (home) or the server level plus the layer (guards). Beyond size, the signature part gains a chit at level 5 and again at 7, the basic part gains one at 10, and from level 9 first attacks come a cycle sooner (never on cycle 1). Test fights and the tables above use level 6.

Mutations are always visible and each changes a decision:

- **Armored** — every part has one more armor chit.
- **Regenerative** — a stripped part patches after 1 cycle instead of 2. Strip it only when you can finish it.
- **Hasty** — every attack comes a cycle sooner and repeats a cycle faster (never more often than every 2 cycles), but its parts have 10% less Integrity. Race it.
- **Linked** (every v2 or bigger virus; it replaced the old Rerouting mutation, which no longer rolls) — when a part breaks, a third of its hit moves to the surviving part that attacks next (`CONFIG.linked`; WoW council fights). A survivor whose attack isn't a hit (Encrypt, Scramble, Replicate) gains a hit on top of what it does (the timeline shows `−N · …`, the part a `+N rerouted` tag). Which part you break first decides what the rest hits for.
- **Adaptive** — a part your commands hit three cycles in a row gains an armor chit at the end of that third cycle (*ADAPTS +◆*). A part one cycle from it is tagged *adapting*. Switch for a cycle, or finish it with that hit.

(Reactive and Redundant were cut: they added rules without adding decisions.)

## After a fight

A win shows a card over the virus with what it gave you: XP (one bar, any level-up), drops, code, salvage, leads, located origins and bounties; the fight log has the same in words. Enter on an empty line takes you back to the map (home) or the run.

**Behind.** While the level you're on runs past 1.25 times its target (see Levels), kills pay +50% XP, a *Behind* row on the card.

**Fast kills.** Each class keeps your usual pace (cycles per 100 Integrity of virus, a running average). From your sixth kill with a class, a win at least a quarter faster than that pays **+25% XP**, shown as a gold *Fast kill* row. It's measured against you, so a slow, tanky class earns it as often as a burst one.

**New on the tabs.** Loadout, Craft and Daemons carry a teal count of what's arrived since you last opened them (protocols; blueprints and source; daemons and daemon upgrades).

A loss crashes the server: it reboots at half Integrity in Degraded mode (see Invasions). Between fights the server **rests**: it repairs 2% of its max a minute (empty to full in about 50 minutes, offline too), at half that while an invasion is contested at or breaches your wall. `repair [n]`, or a click on the Integrity meter, pays for it now (see The economy). Leads and located origins appear on the Map, salvage and protocols on the Loadout page (Protocols tab), code on the Server page. Testing only: `developer reboot`, `developer location <ransomware|worm|ghostroot>`.

## Balance targets (checked by `node playtest.mjs` and `node balance.mjs`)

- Every fixture is winnable by at least two different plans, and the plans trade different things. On CRYPTJACK, breaking the Pulse Node first lets the Encryptor start its stack; breaking the Encryptor first costs a 14-damage Surge. A class that can delay (Bastion, Operator) can avoid both.
- Class balance (`node balance.mjs` → docs/BALANCE.md, guarded by `balance.test.mjs`): one scripted planner plays every class's own kit at five points on the level curve, loading a Tuned protocol in every open slot at the bracket's level (from level 10 each carrying a stat its subclass chases, the subclass's `chase` list in turn: Damage and Crit for a Demolitionist, Crit and Damage for an Overclocker or a Phantom, Signal and Restore for a Warden, Restore and Clock Speed for a Sysop, Payload and Crit for a Payload, Payload and Signal for a Herder, Payload and Clock Speed for a Hijacker; a white has no affix to carry one) and running a bracket's worth of defensive services (the first column has neither, to show what they're worth). Every class wins at least 85% of fights at its level, loses less than plain Spiking, and gets at least as many clean kills; the hard slice is beatable (at least 55% for every class and subclass, 45% for the Sysop) but risky (at level 10 some class loses two or more); every subclass at levels 10, 18 and 30 wins at least 85% (the Sysop 70%), loses 25–50% (the Demolitionist at 30: 15%, a known gap), all eight within 30 points. **The Sysop alone** (over three gear sets): 38–58% lost and 70–92% wins at 18 and 30, fewer wins than any other subclass (target 45–55% and 75–85%). **Crews** (`farmsim.mjs`, in `farm.test.mjs` and `raid.test.mjs`): at level 18 a full crew of four (a Warden, a Sysop and two damage dealers, everyone with SIGINT) wins at least 95% of boss tries, someone in it dips under 50% and the Sysop heals more than 30% of its cycles; without its tank the Foreman wins at least half the tries, without its healer the Heatsink at least 40%, without SIGINT the Foreman at least 70%, and with one damage dealer the Coldwallet at least 70%. **Tells** (tells.mjs): every fight brings its tells and the planner answers them. A bot that ignores them (`TELL.bots.answer = false`) loses at least 2.5 points more Signal a fight across the subclasses at 10, 18 and 30, at least 1.5 at each, and wins no more (4.1 points and 15 fights of 576 now). **Target band** (a `todo` test, friction.mjs's blue target): a fight at your level costs every subclass 35–45% at levels 10, 18 and 30 (the Sysop 45–55% from 18; 28–55% at level 1), within about 10 points. Not met yet: see Known gaps below. **Fight mix** (`loop.test.mjs`, the pacing bot to level 20): grey fights are 0–1% of fights from level 10 to 20 (under 20%) and strains and ICE 48–63% from 12 (at least 15%). **XP mix:** fights are about 60% of the bot's XP (under 70%; it never crafts or trades), break-ins about 30%, intel and building the rest. **The slow road:** playing only SPRAWL-00 takes about 1.5× as long to reach level 12 as mixed play (median of 7 seeds; the test wants 1.25× for every class and 1.4× on average). Current result (wins · clean kills · health lost · cycles):

| Bracket | Spike, no gear | Spike only | Breaker | Bastion | Infiltrator | Operator |
|---|---:|---:|---:|---:|---:|---:|
| Lv 1 | 11/24 · 0 clean · 78% · 10.3c | 23/24 · 1 clean · 42% · 8.3c | 24/24 · 1 clean · 31% · 7.7c | 24/24 · 1 clean · 21% · 7.5c | 24/24 · 2 clean · 21% · 6.8c | 24/24 · 1 clean · 15% · 6.7c |
| Lv 10 | 4/24 · 0 clean · 95% · 7.6c | 8/24 · 1 clean · 85% · 9.4c | 22/24 · 2 clean · 35% · 9.0c | 24/24 · 1 clean · 35% · 13.8c | 24/24 · 1 clean · 29% · 9.3c | 24/24 · 1 clean · 35% · 8.0c |
| Lv 18 | 0/24 · 0 clean · 100% · 6.7c | 3/24 · 0 clean · 96% · 9.7c | 24/24 · 1 clean · 35% · 7.5c | 24/24 · 2 clean · 29% · 15.8c | 24/24 · 2 clean · 32% · 9.8c | 24/24 · 0 clean · 40% · 6.4c |
| Lv 30 | 3/24 · 0 clean · 94% · 5.8c | 4/24 · 0 clean · 89% · 8.2c | 24/24 · 1 clean · 21% · 6.3c | 24/24 · 2 clean · 34% · 15.4c | 24/24 · 3 clean · 28% · 9.1c | 22/24 · 1 clean · 44% · 5.7c |
| Lv 50 | 3/24 · 0 clean · 96% · 4.2c | 4/24 · 1 clean · 88% · 7.5c | 24/24 · 3 clean · 23% · 6.3c | 23/24 · 2 clean · 52% · 14.8c | 24/24 · 4 clean · 24% · 8.5c | 23/24 · 2 clean · 49% · 5.1c |

By subclass (health lost · wins; from level 10 the class columns play each class's default: Demolitionist, Warden, Phantom, Herder):

| Bracket | Demolitionist | Overclocker | Warden | Sysop | Payload | Phantom | Herder | Hijacker |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Lv 10 | 35% · 22/24 | 41% · 23/24 | 35% · 24/24 | 41% · 24/24 | 34% · 24/24 | 29% · 24/24 | 35% · 24/24 | 43% · 24/24 |
| Lv 18 | 35% · 24/24 | 40% · 24/24 | 29% · 24/24 | 44% · 22/24 | 44% · 24/24 | 32% · 24/24 | 40% · 24/24 | 34% · 24/24 |
| Lv 30 | 21% · 24/24 | 36% · 23/24 | 34% · 24/24 | 46% · 21/24 | 49% · 24/24 | 28% · 24/24 | 44% · 22/24 | 46% · 23/24 |
| Lv 50 | 23% · 24/24 | 36% · 22/24 | 52% · 23/24 | 49% · 18/24 | 53% · 24/24 | 24% · 24/24 | 49% · 23/24 | 46% · 22/24 |

The hard slice (every strain open at the level, six grade 2 wilds, six wilds two levels up), the per-build tables and the crews in the farm are in docs/BALANCE.md. Talents count as a player has them (a point at 10, then every 2 levels); implant slots are filled only from 15, where implants drop.

- Difficulty (September 2026): enemy parts have 1.7× their base Integrity, enemy hits grow 3% a level faster than your power, and a level-1 virus matches a level-1 player. Targets: a skilled, geared player loses about 10–25% of their health a fight; no gear roughly doubles that; plain Spiking without gear loses fights from level 10. Gear stats roughly doubled so a full rig halves the damage you take by level 18. Brackets assume few services (services are rare now).
- Known gaps (solo tells pass, October 2026): with the gear each subclass chases, the Demolitionist runs 21–23% from level 29 (flat Damage on every one of its hits: Overkill, Fork Bomb, Shatter; a Damage-stat problem, its own floor in the test until it's fixed). The Phantom runs 28–32% from level 10, the Warden (Signal on its gear) 29–34% at 18 and 30, and the Hijacker 34% at 18. The Payload runs 49% at 30, the Hijacker 46%. At level 1 the Bastion, Infiltrator and Operator lose 15–21%. Readers come out a little ahead of a fight with no tells at level 10, because a charge that is called off knocks its plain attack back a cycle (docs/solo-tells.md has the numbers). The Breaker's level-16 Demolitionist sits at 55%, outside the brackets. The Sysop alone sits at 41% with 80% wins at 30 (target 45–55%): it either wins comfortably or dies. At 10–11 it has no heals yet (Patch comes at 12), so it plays like a Warden. Crews (the crew bosses, October 2026): the Sysop bot heals in 50–65% of its cycles. Between levels 12 and 16 the role checks are soft on purpose (at 14 a crew without a tank still beats the Foreman about half the time, and one without a healer the Heatsink three tries in four; the Sysop has no Multicast before 14), and at 30 a full crew dips under 40% in only half its fights. A duo (you and a Sysop) clears more often than a trio of you, a Warden and a Sysop, whose one damage dealer can't break Cold Storage in time. In-game `crew sim` bots still carry Stock gear.

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
- A right answer: lead toward the next server +40% on the first try, then +25%, +15%, +10%, and a kill's XP. Once per server.
- A wrong answer costs nothing. Skipping it changes nothing.

## Strains (waves 1 and 1b)

Strains are variants of a home family built around one rule. They share their family's art, code drops and leads. Each network has a native strain, five times as likely as each of its family's other strains there (see Networks). SPRAWL-00 is the starter area and never has them: strains come from layer 2 and deeper. What a server sends (invasions, swarms) is a strain about half the time once both its layer and its level allow it (fixed by the seed). The fight header shows the strain; its rule is on hover, and a first-time tip explains it.

### Grades

Deeper servers also send bigger versions of the same viruses, named v2 and v3. Only the stats change, on top of the extra levels a deeper server already has:

| Grade | Sent by | Integrity | Attack damage | Armor |
|---|---|---|---|---|
| v1 | SPRAWL-00 and layer 1 | ×1 | ×1 | as normal |
| v2 | layer 2 | ×1.15 | ×1.1 | as normal |
| v3 | layer 3 and deeper | ×1.35 | ×1.25 | as normal |

(Softened 2026-10-01: a deeper server is already 3 levels higher per layer, and the old numbers made same-level v3 fights on rogue servers unwinnable for some classes.)

Strains are graded too. A swarm counts one layer deeper than the outpost it targets. Against your wall, a v2 invader counts as 2 levels higher and a v3 as 4: your firewall blocks a v1 at its level, a v2 at its level +2, a v3 at +4.

| Strain | Family | From (level, layer) | Parts | Rule |
|---|---|---|---|---|
| Keylogger | Ghostroot | 4, layer 2 | Pulse Node, Logger | A Sync Window (0.14 wide) opens every cycle. The Logger only takes damage from commands fired inside it, and from burns and helpers started inside one. Every command fired outside it (auto-repeat and planned steps included) is logged; at 3, the Logger's Dump (18) lands next cycle and the log clears. It also Dumps on its own every 6 cycles. |
| Hashrat | Ransomware | 5, layer 2 | Pulse Node, Miner (no armor) | While the Miner lives, every other cycle your cooldowns don't tick. Left alone, it Overclocks: 4 every 2 cycles. |
| Floodgate | Worm | 6, layer 2 | Pulse Node, Flooder (no armor) | Flood hits every cycle from cycle 2 for 2, +1 (scaled) each time; any delay resets it. |
| Leech | Worm | 8, layer 2 | Pulse Node, Tap (28) | Siphon (8, every 3) heals the virus's most damaged part by what it deals and clears one burn on it. Shields and throttling starve it. |
| Sleeper | Ghostroot | 10, layer 2 | Pulse Node, Cell | Dormant (attacks off the timeline) until any hit lands or cycle 6. On waking, the Cell's Alarm (14) lands that cycle, then every 5; the Pulse Node attacks every 3. |
| Patchwork | Worm | 3, layer 2 | Pulse Node, Patcher (28) | Patch (every 3, from cycle 3) heals the most damaged part by 12 (scaled with its size). A heal on its own side: your chits, Null Route and misses don't stop it; delays do. |
| Flicker | Ghostroot | 4, layer 2 | Pulse Node, Shade (22) | The Shade is out of phase on odd cycles: every hit on it passes through (no damage, no chit), burns and helpers too, and 15% of your own command's hit bounces back at you (`CONFIG.phaseBounce`; never your last point). Its Fade (5) lands every even cycle. A stripped Shade patches a cycle later than normal. |
| Extortion | Ransomware | 6, layer 2 | Pulse Node, Demand (40, no armor) | Deadline (26, every 5, from cycle 4). Damage dealt to the Demand in the 2 cycles before Deadline lands adds up; at 14 (scaled) the Deadline is called off and starts over. |
| Echo | Ghostroot | 8, layer 2 | Pulse Node, Echo | While the Echo lives, every damage attack that gets through repeats next cycle at half (shown on the timeline). Echoes don't echo. Its Reverb hits for 6 every 4. |
| Bricker | Ransomware | 9, layer 2 | Pulse Node, Locker | Each part's attacks deal ×1.3 while it's below half Integrity (`CONFIG.enrage`; the timeline shows it). |
| Overrun | Worm | 11, layer 2 | Pulse Node, Hive | Swarm spawns a fragment every 4 cycles (from cycle 2). Its fragments bite +1 (scaled) every cycle they live. |

The balance sim plays Keylogger on the beat and hits a Flicker's Shade only when it's in phase (as a skilled player would).

### ICE

On layer 2 and deeper, about half the servers (fixed by the seed) swap their Watchdog for **Tracer** ICE and their Sentinel for **Bouncer** ICE. The fight header shows it as a tag with the rule on hover, and a first-time tip explains it.

| ICE | Replaces | Parts | Rule |
|---|---|---|---|
| Bouncer | Sentinel | Gate (3 armor, Ram 10 every 3), Keyring (no attack) | At the end of every 4th cycle the Keyring re-arms the Gate to full armor, three times; then it overheats and stops. |
| Tracer | Watchdog | Probe (Ping 4 every 2), Tracker | The Tracker's Trace-back (6, every 3) grows by 2 (scaled) every cycle the fight lasts. |

### Testing a strain

`?playtest=<name>` opens a fight against any strain or fixture (`?playtest=flicker`, `?playtest=bouncer`), and `encounter <name>` starts one from the prompt.

## Volume

The System page has three sliders (0–100, default 80, the level the game was mixed at): **Music** (the soundtrack), **Ambience** (radio chatter, rain, thunder, the street ten floors down with its odd horn and passing siren, the room tone) and **Effects** (hits, keys, alerts and every other game sound). Dragging is heard live; letting go saves it. All of them sit under the Sound switch.

## Fair play

Rules that keep timing, reloads and loops from paying:

- **A paused fight holds no clock.** The timers on invasions and swarms (and on members' lockdowns) wait while you fight them, but only while the fight is running. A paused fight, or one left open over a reload (it comes back paused), holds nothing.
- **Away is played out, solo or not.** While you're logged off, the gap is played out a minute at a time: invasions every 2–4 hours, outposts noticed half as often, swarms and hubs' old owners at a quarter pace, each meeting that holding's firewall. In a consortium a member sometimes stops one. An invaded outpost makes nothing (as it pays no dividend).
- **Threats run on real time, and your firewalls are the guard.** Invasions, swarms and hubs' old owners come whether you're logged on or not, and meet that holding's firewall; their timers run either way. What protects you while you're away is your network's base, the margin you bought on top, harden.sh and filters. Production stops while one sits at an outpost or hub.
- **No store-to-market loop.** Hubs sell code, Exploits and salvage only as market wares. The Halcyon store never sells them for less than 10% over what the best hub market would pay for them right now. A round trip at one hub never profits (each unit of a lot is priced after its own push). Prices move between 35% and 160% on your own trading.
- **Hub income reads outside factors only.** A held hub earns by its condition, the world event and wiped hubs elsewhere, not by your own trading there.
- **What you compile breaks down without Exploits.**
- **Detached servers make nothing.** Reattaching starts their outposts fresh.
- **Developer commands** only work in tests, playtest pages and with `?dev` in the address.
- **The game saves when the tab closes**, and every roll comes from the save's seed: reloading replays the same result.

