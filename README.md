# BLACKBOX

A hacking game in the browser, played on a terminal. You fight viruses part by part, walk servers room by room down
eight floors of a network, and climb one of four hacker classes to level 50.

**Play:** [davebee123.github.io/Blackbox](https://davebee123.github.io/Blackbox/) (GitHub Pages deploys `dist/` on
every push to main). The game saves in your browser.

## Run locally

Needs Node.js. No packages, no build step.

```sh
node serve.mjs
```

Open http://127.0.0.1:4173. The content editor is at `/editor.html`.

## How a session goes

- **SPRAWL-00** is where you start: a rogue server of six rooms with a stray in each. Kill them to trace the servers
  linked to it. A stray stays down until the last one falls; then you're jacked out, it reboots for 30
  seconds, and they're all back. Its Core
  (RELAY-KING) opens from level 3, after the first reboot.
- **Floors.** The network is a stack of eight floors. Each server you trace sits on one, at a fixed level; each floor
  has an exit down.
- **Rooms.** `connect` to a server and walk its rooms: fight what holds them, take the vault's key from its elite, beat
  the Resident in the Core to take it over. `jack out` banks your pack.
- **Contracts.** Mail brings jobs from your crew and from Halcyon Mutual, a floor's job chain, and threads you stumble
  on in rooms.
- **Invasions.** Servers on your network send invasions home. Your firewall meets them; the ones that get through are
  yours to fight, and the only source of daemons.

[`GAME_RULES.md`](GAME_RULES.md) holds every rule as built. It is the single source of truth.

## Developer URLs

Every playtest URL runs on a fresh state that is never saved. The real save is never read or written.

| URL | What it opens |
|---|---|
| `/?dev` | The real game with developer commands on (and `window.__bb`, the live state, for tests). |
| `/?bench=<name>` | A test bench: its own save (`blackbox-bench-<name>`), developer mode on, a BENCH tag. Add `&as=<subclass\|class>&level=<n>` to start as that character. |
| `/?playtest=cryptjack` | A paused fight against a fixture or strain (`splinter`, `ghostroot`…); `random` for a wild one. `&level=`, `&cls=`, `&sub=`, `&family=`, `&seed=`. Type `resume`. |
| `/?playtest=part:<id>` | A fight with that part, at the level it opens (or `&level=`). |
| `/?playtest=fx` | The ability effects playtest: a panel that fires every ability's effect, at each Screen effects level and mastery tier. `&cls=`, `&crew=<class>`. |
| `/?playtest=run` | Connected to a fresh server. `&family=worm\|ghostroot`, `&template=mailhub\|mirror\|archive\|lab` (its rooms' kind), `&depth=<floor>`. |
| `/?playtest=rooms` | One server as rooms, clocks ten times as fast. `&class=`, `&level=`, `&kind=`, `&size=small\|medium\|large`, `&floor=`, `&boss=a\|b\|c`, `&hunter=patrol\|track`, `&seed=`. |
| `/?playtest=story&beat=<id>` | A test save at a story beat (the editor's *Play from here*). |
| `/?playtest=breach`, `/?campaign=breach` | The side modes (GAME_RULES.md "Side modes"): one breach, or the breach campaign under its own save. |
| `/?shell=plain`, `/?tod=night\|dawn\|day\|dusk` | No CRT shell; another time of day outside the window. |
| Co-op | Two benches in two tabs, then `coop host` and `coop join <code>`: [`docs/coop.md`](docs/coop.md). |

Common developer commands (with `?dev` or on a bench; the **Dev** drawer above the prompt has buttons for most):

| Command | Does |
|---|---|
| `bench <subclass\|class> <level>` | Starts this bench over as a ready character. `bench list`, `bench delete <name>`. |
| `developer level <n>`, `developer server <n>` | Sets your class's level; sets a floor under your server's level. |
| `developer location <family>` | Traces a new server of that family on the map. |
| `developer fight <family\|random> <level> <seed>`, `developer fight part:<id>` | Starts a fight. |
| `developer parts` | The parts roll's numbers and mix. |
| `developer event [card]`, `developer invade [kind]` | Deals an event card; sends an invasion. |
| `developer levelup preview`, `developer thread preview`, `terminal preview` | Plays the level-up, a thread's windows, a boot look. |
| `crew sim <class…>`, `online sim` | Bot crewmates in your fights; simulated hackers online. |
| `reset game` (twice) | Starts over from level 1. Settings stay. |

## Tests and landing

```sh
npm test               # before a commit: every fast file, and the slow simulations the changes reach (about a minute)
npm run test:full      # everything (the Tests workflow runs it on every push to main and claude/ branches)
npm run test:plan      # what npm test would run, and why
node scripts/land.mjs  # land a branch: merge origin/main, test the merged tree, push it to main
```

[`CLAUDE.md`](CLAUDE.md) has the workflow: testing, landing, saves, parallel sessions and the designer's standing rules.

## Code map

Plain ES modules, no build. `dist/` is the game; the root holds the tests and the simulations. Every file opens with a
comment saying what it does.

### Engine and rules

| File | What it does |
|---|---|
| `dist/combat.mjs` | The engine: pure and deterministic, commands in, events out. Fights, XP and levels, the save and its migrations. |
| `dist/data.mjs` | Every tunable number: abilities, classes, families, strains, guards, bosses, floors, and `createVirus`. |
| `dist/classes/` | Each class's subclasses: `<class>.data.mjs` their skills and trees, `<class>.mjs` what they do in a fight; `kit.mjs` talent helpers. |
| `dist/parts.mjs` | What a wild virus is made of: its basic, signature and third parts, rolled by named constants (`PARTS`), and the strains' spread (`PARTS.spread`). |
| `dist/genes.mjs` | The gene library: every family, strain, third part, mutation, tell and guard rule in one shape. Data only. |
| `dist/authors.mjs` | The crews that write viruses, each with signature genes, builds and bosses. Data only. |
| `dist/genome.mjs` | A virus's genes in play: `scan`, `inspect` and the rules' chips. |
| `dist/families.mjs` | Attack sets for the room families, the Trojan, Cryptominer and Wiper, and the rules every room fight shares. |
| `dist/tells.mjs` | Solo tells: the big moves a part announces ahead (charges, casts, seals). |
| `dist/interrupt.mjs` | The interrupt: crossing a part's 50% or 25% tick on its due cycle cancels its move. |
| `dist/order.mjs` | The order levers: parts whose right moment to break depends on the board. |
| `dist/mechanics.mjs` | The mechanics list: twenty third parts built lean, each rule's hooks in one place. Six strains are built from them (`STRAINS`). |
| `dist/situations.mjs` | The moment on the board each situational skill is built for; the tray lights it. |
| `dist/raid.mjs` | Crew bosses: phases and mechanics for KESSLER-FARM-00's three. |
| `dist/planner.mjs` | The scripted fight player for every class, used by the simulations and bot crewmates. |
| `dist/research.mjs` | Part research: what you know of a part grows with what you do to it. |
| `dist/progression.mjs` | What each level brings on every track, the play clock, and old saves' progression migrations. |
| `dist/mastery.mjs` | Ability mastery: use evolves an ability's effect through three tiers. Cosmetic only. |

### Gear, loot and daemons

| File | What it does |
|---|---|
| `dist/gear.mjs` | Protocols: slots, rarities, item levels, stats and rule affixes. Pure data and functions. |
| `dist/sets.mjs` | Sets: piece counts and their bonuses in a fight. |
| `dist/faction-gear.mjs` | Faction gear: implicit lines on a faction's items, and the five faction uniques assembled from feud parts. |
| `dist/filters.mjs` | Filters: rolled gear for your firewall's slots. |
| `dist/salvage.mjs` | Components, one currency every broken part drops. |
| `dist/store.mjs` | The Halcyon store: Halcyon's own line and the premium shelf. |
| `dist/daemons.mjs` | Daemons: programs that fight beside you, dropped only by invasions. |
| `dist/daemons-view.mjs`, `dist/daemons.css` | The Loadout's Daemons tab: the party with each one's 12-cycle bar. |
| `dist/daemon-sprites.mjs` | A mirrored ASCII sprite for each daemon, drawn from its id. |
| `dist/protocol-glyphs.mjs` | Each protocol's own ASCII picture, from its kind, name, main stat and rarity. |
| `dist/ascii3d.mjs` | Spinning ASCII wireframes for item tooltips. |
| `dist/glyphs.mjs` | The game's line-drawn 16×16 icon set. |
| `dist/content/items.mjs`, `dist/content/sets.mjs` | The uniques and the sets, as data. |

### Servers, rooms and the network

| File | What it does |
|---|---|
| `dist/run.mjs` | Runs: connecting, the pack, banking at jack out, the run commands on rooms. |
| `dist/floorplan.mjs` | A server as a graph of rooms: moving, fights, caches, the hunter, the vault and the Core. |
| `dist/netrooms.mjs` | Every server on the real save as a room graph, kept on its location; takeover and Root rooms. |
| `dist/floorplan-view.mjs`, `dist/floorplan.css` | The rooms page: the server strip and the room map with its pop-up card. |
| `dist/floors.mjs` | The eight floors: each one's diagram of server slots, generated from your network's seed. |
| `dist/hidden.mjs` | Unknown servers along your floors' links, and tracing them. |
| `dist/address.mjs` | Every room's grid address (C2). |
| `dist/zone.mjs` | SPRAWL-00, the starting zone. |
| `dist/rogue.mjs` | Rogue servers, where viruses gather, and the KESSLER-FARM-00 crew dungeon. |
| `dist/root.mjs` | Root access: perks on a server you hold, by respawned rooms cleared. |
| `dist/sockets.mjs` | Sockets: build a program in a cleared socket room; it changes its own server. |
| `dist/specials.mjs` | Server specials: each traced server's rule (an upside and a cost) from its seed, its pull on invasions, and its leaning's id (`leaningOf`). |
| `dist/leanings.mjs` | Leanings: a server's one positive rule (Venting, Wind-up, Brownout), its multipliers in the fight and what it has paid. |
| `dist/rivals.mjs` | Rivals: named runners who race you to a server's vault and fight you two or three in a row. |
| `dist/puzzles.mjs`, `dist/puzzle-view.mjs` | Puzzle rooms: seven boards that aren't fights, and the cryptogram's key (`s.cipher`). |
| `dist/forensics.mjs` | Log sweep: a short detective puzzle in a server's incident file. |
| `dist/traffic.mjs`, `dist/travelfx.mjs` | Ambient packets on the room map; the step between rooms as a train of code. |
| `dist/network.mjs` | Your network's signature, rolled from its seed. |
| `dist/memory.mjs` | Server memory: how many servers your network holds. Switched off (`MEMORY.on`). |

### Home, threats and the world

| File | What it does |
|---|---|
| `dist/invasion.mjs` | Invasions: servers on your network send kinds of invader home while you play. |
| `dist/firewall.mjs` | The firewall: its base follows your network, plus the margin you buy. |
| `dist/server-view.mjs`, `dist/server.css` | The Server page: your home server's ring, rows and detail panel. |
| `dist/events.mjs`, `dist/event-cards.mjs` | The event director's deck, and each card's panel. |
| `dist/factions.mjs` | Factions: hubs, shops, rep, friends and enemies. |
| `dist/market.mjs` | Hub markets: prices that move with conditions, world events and sales. |
| `dist/hubs.mjs`, `dist/fleet.mjs` | Holding a hub, and the swarms its old owner sends. Hub capture is off with Payloads. |
| `dist/payload.mjs` | Payloads against a faction hub. Switched off (`PAYLOAD.on`). |
| `dist/consortium.mjs` | Consortium: simulated members who merged servers with yours. |

### Mail, story and quests

| File | What it does |
|---|---|
| `dist/mail.mjs` | Letters, contracts and the Halcyon retainer. |
| `dist/content.mjs` | Fills and checks the written content's blanks. |
| `dist/content/story.mjs`, `dist/content/contracts.mjs` | The story beats and contract templates, written in the editor. |
| `dist/arcs.mjs`, `dist/arcs-view.mjs` | Floor jobs: each floor's fixed chain of contracts, and its page in Mail. |
| `dist/threads.mjs`, `dist/threads-view.mjs`, `dist/content/threads.mjs` | Threads: quests found in rooms, their marks and dialogue, and their data. |
| `dist/scanner.mjs`, `dist/scanner-view.mjs`, `dist/scanner.css` | The scanner: a shortwave radio on the Map page, its stations, the reel and what each pays. |
| `dist/quest-view.mjs`, `dist/quest.css` | The quest window: a thread as an intercepted transmission. |
| `dist/portraits.mjs` | The speaker's portrait in the quest window: a backlit ASCII silhouette, the cast's own or one from their name. |
| `dist/intro.mjs` | First launch: the login, then Halcyon's transmission. |
| `dist/tips.mjs` | First-time tips, the game's only tutorial text. |
| `dist/tutorial.mjs` | Guided practice on an isolated training virus. |
| `dist/lore.mjs` | Skill descriptions and flavour lines for the library. |
| `dist/editor.html`, `dist/editor.mjs`, `dist/editor.css` | The content editor; saves into `dist/content/` through `serve.mjs`. |

### Your character and pages

| File | What it does |
|---|---|
| `dist/view.mjs` | Markup builders for every page and the fight board. Pure functions of state. |
| `dist/fightread.mjs` | Reading a fight: what a tell does and how to stop it, live gear rules, decoded parts. |
| `dist/ruletext.mjs` | Picks out a rule's key facts (numbers, ◆, statuses) for highlighting. |
| `dist/skills-view.mjs` | Loadout → Skills and talents, and the subclass breakout. |
| `dist/routines.mjs` | Routines: a program per virus that plays your moves when you don't. |
| `dist/routines-view.mjs`, `dist/routines-ui.mjs`, `dist/routines.css` | The Program tab, its drag and drop, and the program's marks on the board. |
| `dist/levelup-view.mjs`, `dist/levelup-ui.mjs`, `dist/levelup.css` | The level-up: a firmware update under the top bar. |
| `dist/codex.mjs`, `dist/codex-view.mjs`, `dist/codex.css` | The Codex: every virus you can meet, and what you know of it. |
| `dist/achievements.mjs`, `dist/achievements-view.mjs`, `dist/achievements.css` | Achievements and their cosmetic rewards. |
| `dist/profile.mjs`, `dist/profile-view.mjs` | Your profile card (`finger`), and #net's markup. |
| `dist/channel.mjs`, `dist/presence.mjs` | #net, the public channel; who's online and your friends. |
| `dist/comms.mjs`, `dist/pager.mjs`, `dist/pager-view.mjs`, `dist/pager.css` | The pager: world events as entries, which ones ask something of you, and the tray. |
| `dist/casing.mjs`, `dist/casing-view.mjs`, `dist/casing.css` | Casing cosmetics: the monitor's colourway, plate, stickers and desk. |
| `dist/terminal.mjs`, `dist/terminal-view.mjs`, `dist/terminal.css`, `dist/boots.mjs` | Terminal cosmetics on System → **Terminal**: boot looks (POST, Corrupted…), prompts, cursors. |
| `dist/recap.mjs` | The death recap on the Disconnected card. |
| `dist/uiscale.mjs` | UI scale: the whole screen drawn larger or smaller. |

### Co-op

| File | What it does |
|---|---|
| `dist/crew.mjs` | Bot crewmates in your fights (`crew sim`), played by the planner. |
| `dist/coop.mjs` | Peer-to-peer co-op sessions: the host runs the world, a guest sends commands. |
| `dist/coop-net.mjs` | Co-op transports: in memory, BroadcastChannel, WebRTC. |
| `dist/coop-char.mjs` | The character a guest sends the host. |
| `dist/coop-ui.mjs`, `dist/coop.css` | The Co-op panel. Developer mode only. |

### Shell, look and sound

| File | What it does |
|---|---|
| `dist/index.html`, `dist/app.js` | The page and its shell: modules, command line, clock, save, rendering, URL parameters. |
| `dist/style.css` | Tokens and every shared component (docs/ui.md). Each page has its own stylesheet beside its view. |
| `dist/shell.mjs`, `dist/poweron.mjs` | The CRT shell, boot lines and status line; the power-up. |
| `dist/screenfx.mjs`, `dist/screenfx.css` | Screen effects: light on the glass around the game, never on it. |
| `dist/bootfx.mjs`, `dist/bootfx.css` | A new fight: the screen boots into it, the virus first; leaving a won one, a channel cut; connecting to a server, the dial-up. |
| `dist/window.mjs` | The slum outside the window behind the monitor, and its weather. |
| `dist/abilityfx.mjs`, `dist/abilityfx-table.mjs`, `dist/abilityfx-playtest.mjs` | Ability effects on the board, the table of every ability's effect, and its playtest. |
| `dist/hitfx.mjs`, `dist/dmgfx.mjs`, `dist/lash.mjs` | Hits landing on a part, damage numbers one per source, a virus lashing at the screen. |
| `dist/virus-art.mjs` | Each virus as animated 3D ASCII art. |
| `dist/nocarrier.mjs`, `dist/nocarrier.css` | Losing a fight: static and NO CARRIER, then the Disconnected card. |
| `dist/class-emblems.mjs` | The class picker's ASCII emblems. |
| `dist/feel.mjs` | The feedback language: each kind of event's one signature in motion and sound. |
| `dist/sound.mjs`, `dist/sfx/` | Sound effects from recorded CC0 samples (CREDITS.md). |
| `dist/soundtrack.mjs`, `dist/music/` | Music and radio chatter (CC0 tracks, CREDITS.md). |
| `dist/fightmusic.mjs` | Each virus family's fight theme, synthesized live; heat brings its layers in. |
| `dist/places.mjs` | A sound bed for each floor, and the virus you're fighting. |
| `dist/ui/` | Icons, textures and the favicon. Some of the set is unused. |

### Side modes and developer tools

| File | What it does |
|---|---|
| `dist/breach.mjs`, `dist/breach-view.mjs`, `dist/breach.css` | A breach: one run through one server on a branching map. |
| `dist/campaign.mjs`, `dist/campaign-view.mjs`, `dist/campaign.css` | The breach campaign: servers by layer, its own save. |
| `dist/heat.mjs`, `dist/scripts.mjs`, `dist/rewrites.mjs`, `dist/skillrules.mjs` | The breach's heat ranks, one-shot scripts, rewrites and skill rules. |
| `dist/world.mjs`, `dist/room.mjs`, `dist/room-view.mjs`, `dist/room.css`, `dist/content/room.mjs` | LOWLIGHT's back room and the world turn between breaches. |
| `dist/bench.mjs` | The test bench and the Dev drawer; `build()` is shared with the simulations. |

### Root: server, scripts and simulations

| File | What it does |
|---|---|
| `serve.mjs` | The local server, and the editor's save endpoint. Listens on 127.0.0.1 only. |
| `scripts/test.mjs` | The test runner: fast files, plus slow simulations whose imports changed. |
| `scripts/land.mjs` | Lands a branch on main, tested against the main it lands on. |
| `balance.mjs` | Class balance by level → [`docs/BALANCE.md`](docs/BALANCE.md). |
| `bot.mjs` | A scripted player from a fresh save to a level, through the real commands. |
| `pacing.mjs` | Hours of real play to each level, against the targets. |
| `lootsim.mjs` | Kills per drop of each rarity, against the loot targets. |
| `econ.mjs` | What the bot earns and spends, resting or topping up. |
| `farmsim.mjs` | Crews against KESSLER-FARM-00's bosses. |
| `friction.mjs` | Health a same-level fight costs, by gear. |
| `genesim.mjs` | The genome harness: boss bands, the spike cap, per-gene checks. |
| `solved.mjs` | How solved fights are: eight kinds of player by class and tier. |
| `roomsim.mjs`, `breachsim.mjs`, `campaignsim.mjs` | Bots playing a server's rooms, a breach, and the breach campaign. |
| `playtest.mjs` | Kill-order strategies against the fixtures; prints its tables. |
| `golden-virus.mjs` | The virus builder before genes, frozen for `golden.test.mjs`. |
| `tools/sound-preview/` | Renders sound preview clips to MP3 for the designer to hear. |

### Tests

`x.test.mjs` tests `dist/x.mjs` (or `x.mjs` at the root); every other test file's first comment names what it holds.
The nine slow simulations (`SLOW` in scripts/test.mjs) are `balance`, `loop`, `natives`, `genesim`, `sets-balance`,
`kits-crew`, `kits-balance`, `presses` and `farm`; `npm test` runs one only when something it loads changed. Targets
not met yet are `todo` tests. `testrunner.test.mjs` holds the runner's rules, `land.test.mjs` the landing script's,
and `style.test.mjs` the tooltip grammar.

## Docs

| Doc | What it is |
|---|---|
| [`GAME_RULES.md`](GAME_RULES.md) | The rules as built. |
| [`docs/ui.md`](docs/ui.md), [`docs/style-guide.md`](docs/style-guide.md) | The look (colours, tokens, components); how every line is written. |
| [`docs/servers.md`](docs/servers.md) | Servers as rooms, floors, sockets and puzzle rooms. |
| [`docs/puzzle-rooms-plan.md`](docs/puzzle-rooms-plan.md) | Plan: three new puzzle rooms (Packet routing, Deadlock, Cryptogram). Built. |
| [`docs/genome.md`](docs/genome.md), [`docs/parts-plan.md`](docs/parts-plan.md), [`docs/mechanics-list.md`](docs/mechanics-list.md) | How viruses are built, their parts, and the mechanics to play. |
| [`docs/puzzle-fights.md`](docs/puzzle-fights.md), [`docs/puzzle-levers.md`](docs/puzzle-levers.md) | Fights you read or prepare for, and their levers. |
| [`docs/kits.md`](docs/kits.md), [`docs/subclasses/`](docs/subclasses/) | Class kits and the eight subclasses. |
| [`docs/routines.md`](docs/routines.md) | Routines. |
| [`docs/progression.md`](docs/progression.md), [`docs/economy.md`](docs/economy.md), [`docs/content.md`](docs/content.md), [`docs/variety-plan.md`](docs/variety-plan.md) | Pacing, the economy, activities and variety. |
| [`docs/rivals.md`](docs/rivals.md) | Rivals: the roster, the rules and the picked look. |
| [`docs/loot-plan.md`](docs/loot-plan.md) | Sets and uniques. |
| [`docs/house.md`](docs/house.md) | Your house and its furniture (decided, not built). |
| [`docs/leanings.md`](docs/leanings.md) | Leanings: a server's one positive rule (built: GAME_RULES.md "Server kinds, specials and quirks"). |
| [`docs/server-specials.md`](docs/server-specials.md) | Server specials: an upside, a cost and the programs for each (picked, not built). |
| [`docs/threads.md`](docs/threads.md), [`docs/director.md`](docs/director.md) | Threads, and the event director. |
| [`docs/invasions.md`](docs/invasions.md), [`docs/networks.md`](docs/networks.md), [`docs/bosses.md`](docs/bosses.md) | Review sheets: invasions, network signatures, crew bosses. |
| [`docs/coop.md`](docs/coop.md) | Co-op, peer to peer. |
| [`docs/BALANCE.md`](docs/BALANCE.md) | Generated by `node balance.mjs`. |

`design/` holds the specs and reviews of the previous UI pass: history, not instructions.
