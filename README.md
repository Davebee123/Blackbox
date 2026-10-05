# BLACKBOX — hacker MUD prototype

A virus breaks into your server; you fight it, trace where it came from, then make a run on that location: explore its file system with `ls`, `cd`, `cat` and `pull`, beat what guards it, and jack out to bank what you found. This build is **solo**; co-op comes later (see the design review in the Hacker MUD project).

**Rules live in [`GAME_RULES.md`](GAME_RULES.md).** That file is the single source of truth; this README only explains how to run and work on the code.

## Run

Needs Node.js. No packages, no build step.

```sh
node serve.mjs
```

Open http://127.0.0.1:4173. You land on the **Map**.

For isolated checks that never read or write the save, open `/?playtest=cryptjack`, `/?playtest=splinter`, `/?playtest=ghostroot` or `/?playtest=random` (fights start paused; type `resume`), or `/?playtest=run` to start connected to a location (add `&template=mailhub|mirror|archive|lab`, `&family=worm|ghostroot` for the Nest / Hidden quirks, and `&depth=3` for deeper layers).

To skip straight to a run in your real save, type `developer location ransomware`, then click the new node on the Map and Connect. To try later skills and talents, `developer level 25` sets your class's level and `developer server 10` the server's. To start over from level 1, type `reset game` (twice) or use Reset game on the System page; settings stay.

## Screens

The top bar shows **Map, Mail, Server, Craft, Loadout, Daemons, System** always, **Store** once the board opens (the fourth story letter), plus **Fight** and **Run** only while a fight or run is live.

- **Sidebar:** on the left of every page (fights too, 1100px+; `sidebar off|on`): your crew's bars and the page's context (the map selection, or what needs you).
- **Map:** your server at the centre (its card shows the server level and what the next one opens); traced locations radiate out by family (ransomware, worm, ghostroot), deeper layers branch off the node that led to them, and half-traced leads show as dashed ghosts with their %. A waiting intrusion pulses at the server's gate. An invader moves in from its location to your wall (amber at a siege, red on a breach). Click any node for its card (server stats and repair, Engage, Connect, Jack in). Each server's level is the big number under it, coloured by how hard it is for you (green below, yellow even, orange and red above), with its layer as a small teal tag. Scroll to zoom (up to 5×, around the cursor), drag to pan, double-click or ⤢ to zoom back out. **Aa** (or `map names hover|on`) shows names only on hover.
- **The pager** (top bar): the latest world event scrolling on its screen, a lamp and an unread count; click it for Comms, the filtered list with links to where each thing happened.
- **Mail:** your standing with Halcyon Mutual, Indemnity and the retainer countdown; your contracts (held/3), the board (offers with their time left) and letters (unread count on the tab). Open any of them to read it; a contract shows its progress, pay, and Take / Deliver / Drop. On the map, takeover and recovery targets show as "contract", servers you've taken over as "yours", unknown servers you've heard of as "?" (flagged ones in yellow).
- **Store:** Halcyon's own line (relays, the Indemnified chase protocols, locked by tier), your kit (relays, key crackers, trace injectors) and four slots of agency stock with supplier, price trend, quantity and time left.
- **Server:** your server's service slots (pips), code (Cipher, Worm, Kernel, Exploits), the **Wall** (what your Firewall blocks and holds, the current invader, Jack in, Degraded mode), the install queue with its progress bar, running services (upgrade or uninstall) and the services you can build. Installs run in real time, even while the game is closed. Testing: `developer code 50` gives code, `developer finish` completes the current install, `developer invade` puts an invader at your wall, `developer crash` crashes the server, `developer station` makes the numbers station broadcast a dead drop.
- **Loadout:** four class tabs, each with its own level; your class, passive, equipped skills, protocols and talents are all live. **Protocols** tab (opens first): left, the stash as one row per item (rarity edge, name, slot and level, stats; filter by slot; Load / Swap and deconstruct), loaded items not repeated; right, the class in use's protocol slots (4, 5 at 15, 6 at 30) and the stat sheet (every stat, zeros dimmed). **Skills and talents** tab: left, your level and XP under the class name, the key bar you'll fight with (Spike + 7 equipped skills; locked keys show the level they open at) and the class's library of skills (equip, unequip; locked ones show their level); right, the talent tree (teal = picked, amber = you can pick, gray = locked). Compiling protocols is on the Craft page.
- **System:** speed / sound / motion / vibration / shell (immersive or plain) / casing / tips (on, off, replay), a sound test, Reset game, the wire ticker, recent fight reports and the full log.
- **No how-to text on screens.** Names, numbers and state only; rules on hover; first-time tips (`dist/tips.mjs`) teach each thing once when it first appears. Playtest URLs skip them; `tips off` in the command line stops them.

### The combat screen

- **HUD (top):** the virus's name, family, what it threatens and its mutation, then two bars side by side: the Virus (sum of its parts) and yours (your server at home, your Signal on a run), with the virus's armor chits left under its bar.
- **Board (main):** one row per part — health, armor chits (◆ filled, ◇ broken), tags (veiled, exposed, weak); a part whose armor is broken shows faint cracks and its attacks placed in the cycle columns Now / +1 / +2 / +3. Before a cycle resolves, every bar shows what it's about to lose as a blinking white slice: each part (from your command and the crew's; a hit on armor only breaks a chit, and the chits about to break blink too), the virus total, your Signal or server and each crewmate's (from the attacks you can see landing this cycle, after chits, shields and Block; crits aren't guessed). The *You* row shows your queued command and the countdown; under it, the *Status* row shows what's running on you (Momentum, Brace and other buffs, a blind) as a bar over the cycles it lasts. Red = lands this cycle, gold = next cycle; a dashed ◆ patch chip marks when a bare part gets a chit back. Click a row to target that part.
- **Side:** the virus art. **Log** under the board.
- **Net (runs):** one terminal column. Signal is in the header and in the prompt itself (`[47/50] location:/path$`), turning gold then red as it drops. Arriving in a directory lists it automatically; every name is clickable (directory = cd, file = cat, with a pull button on takeable files). The buttons under the prompt show only the actions that make sense where you are. `tree` prints a map, `pack` your unbanked loot, `help` the commands. The terminal shows one folder at a time (from the `cd` that got you there); `history` (or the *earlier* link at the top) shows the whole run. A typo'd name or command gets a clickable "Did you mean …?", in the terminal and in fights. Guard fights switch to the combat screen and back.
- **Daemons tab:** your 3 daemon slots, presets to install, and the syntax for your own.
- **Gain cards and new counts:** a pull pops a small card with what you got; jacking out shows a Banked card with everything you brought home. Loadout, Craft and Daemons carry a teal count of what's new until you open them. A win at least a quarter faster than your usual pace (per class) pays +25% XP, a gold *Fast kill* row on the spoils card.
- **Command line + tray:** type, or press 1–8 on an empty line to prefill an ability with the selected part, then Enter. Tab completes, ↑↓ recall history. Key 1 is Spike (everyone's), 2–8 your seven equipped class skills; keys appear as you unlock them, and a ghost key shows what the next level brings. Plan up to 3 cycles with `;` (`exploit enc; overload enc`). An empty cycle is filled by your daemons, then by Spiking the last part you hit. Enter on an empty line resolves the cycle now; the top-bar button switches speed (12s / 8s / 5s per cycle).

Red is used only for "lands this cycle" and critical server health.

## Code

| File | What it does |
|---|---|
| `dist/data.mjs` | Every tunable number, abilities, families, mutations, fixtures, virus generation |
| `dist/invasion.mjs` | Invasions: invaders from found locations, the wall (blocked / siege / breach), `jack in`, the network clock (`tickNetwork`, logged-on time; in a consortium, time away is played out too) and the end of Degraded mode |
| `dist/gear.mjs` | Items: slots (Exploit, Proxy, Shell, Script, Implant), the 20 base items, affixes, rarities, `rollItem` and `uniqueItem`, drop odds (`LOOT`, time targets → odds per kill), deconstruct yields; services (ports, versions, costs), code materials. Pure data and functions. Unique effects run in combat.mjs (`fxFire`). |
| `dist/combat.mjs` | Pure deterministic engine: `command()`, `resolveCycle()`, `advance()`, `intents()`, leads, disconnects. Fights damage `defender(s)`: the server at home, your Signal on a run. No DOM. Written so it can move onto a shared server for co-op unchanged. |
| `dist/view.mjs` | Pure markup builders for the combat screen and pages |
| `dist/app.js` | Browser shell: modules, command line, clock, save (`localStorage` key `blackbox-v6`, save format 24), the once-a-second network and install tick, sound, level-up banner |
| `dist/run.mjs` | Runs: the location file system, `connect`/`ls`/`cd`/`cat`/`pull`/`unlock`/`jack out`, and `play()`, the single entry point for everything typed |
| `dist/zone.mjs` | SPRAWL-00, the rogue server: its folders and state (`zoneOf`, `zoneRooms`) |
| `dist/rogue.mjs` | Rogue servers: about 1 in 6 traced servers (pity after 5, never the first 2) is a wild farm of 4–8 folders that respawn every 3–5 minutes. Kinds Nest / Pit / Gauntlet. No vault, no invaders, no sweep (`rollRogue`, `rogueSpawns`, `rogueKill`). After you leave one (or SPRAWL-00) it won't take you back for a minute (`relockLeft`, `CONFIG.relockMs`). Outpost infestations live in `outpost.mjs` (`tickInfest`, `outpost clear`). |
| `dist/editor.html` | The content editor: `node serve.mjs`, then open http://127.0.0.1:4173/editor.html. Story beats (letters, their jobs, rewards and when they arrive), contract templates with variants, contacts, files to recover, bounty names, and uniques (stats, effect blocks, where they drop, a live preview of the item). Every new piece starts from a template with working text; blanks like `{count}` are one click; mistakes are flagged as you type; Ctrl+S saves into `dist/content/`; **Play from here** opens the game on a test save at that beat (your real save is untouched). |
| `dist/content/` | The written content the editor saves (`story.mjs`, `contracts.mjs`): JSON after `export default`, so it diffs cleanly in git and can be edited by hand. |
| `dist/content/items.mjs` | The uniques (written on the editor's Uniques page): name, base, level, primaries, secondaries, downside, an effect built from blocks, where it drops, flavour. |
| `friction.mjs` | The difficulty curve: health a same-level fight costs with nothing, whites, blues and yellows equipped, per class and level, against the items doc's targets. `node friction.mjs 1 5 10`. |
| `items.test.mjs` | Uniques and their effect blocks, trophies, rewards, Deadman's Switch, pace. |
| `dist/content.mjs` | What each kind of text can say (its blanks), filling them in, and the checker the editor and `content.test.mjs` share. |
| `dist/mail.mjs` | Mail: letters, the LOWLIGHT storyline, the contract board (five offers on uneven clocks, three held), contracts (kill, named process, takeover, materials, recover a file), Halcyon standing, Indemnity and the retainer (`tickMail`), GLASSJAW's off-books offers |
| `dist/hidden.mjs` | The hidden network: each found server's unknown neighbours, invaders from them, leads toward them, relays, flags and route files, key crackers and trace injectors |
| `dist/architecture.mjs` | Server architecture at server level 20: Fortress, Hub, Lab (`architecture <id>`) and the multipliers the rest of the game asks for. |
| `dist/configs.mjs` | Service configs: side-grades per service (`CONFIGS`), vault sources, crafting, `config <service> <id>`. Effects live where each service acts (invasion.mjs for Firewall/Tarpit, combat.mjs for Honeypot/Hot-patcher). |
| `dist/fleet.mjs` | Swarms (called fleets in the code): sent against an outpost, they move and siege on logged-on time (`tickFleet`, from `tickNetwork`), `swarm engage` one process per fight, the haul, and the fall. |
| `dist/salvage.mjs` | Salvage as mana: named stacks, generic and specific costs (`SALVAGE_COSTS`), the default payment (`autoPay`), checking a chosen one (`payProblem`) and `... pay a:1,b:2` parsing. The picker UI is `payMarkup` in view.mjs. |
| `dist/outpost.mjs` | Outposts: harvesters (kinds, traits, vault packages, compiling), site traits, harvester slots, real-time production and collecting, sieges on logged-on time (and away, in a consortium), lockdowns and retaking (`tickOutposts`, called from `tickNetwork`) |
| `dist/store.mjs` | The Halcyon store: its own line (relays, Indemnified chase protocols by tier) and rotating agency stock (`tickStore`) |
| `dist/comms.mjs` | The pager's memory: world events turned into pager entries (`logComms`), kept on the save; groups for the Comms filters |
| `dist/sound.mjs` | The sound engine: recorded CC0 samples (`dist/sfx/`, credits in `dist/sfx/CREDITS.md`) layered per event with a little synthesis, a small room reverb, mechanical key sounds for the prompt, and a quiet CRT/fan room tone while Sound is on. Synthesized stand-ins play until the samples load. The System page has a sound test; `renderBoard()` bounces voices (or a timed scene) to a WAV. |
| `dist/shell.mjs` | The immersive shell around the layout: CRT scanlines and glow, a boot screen that reads your server back to you, a status line, a block cursor, and a glitch when something hits you. On desktop the screen sits in a monitor casing whose bezel lamps show real state (`casing()` in `app.js`). Look and feel only. `shell plain` / `shell immersive` (or the System page) switches it, `shell boot` replays the boot, `?shell=plain` turns it off for one visit. Motion off keeps it still. |
| `dist/tips.mjs` | First-time tips: each one's page, the element it points at, when it applies and its text; `nextTip()` picks the next one to show (one at a time, once each). The DOM side (placing, pausing fights, closing) is in `app.js`. |
| `dist/sfx/` | The CC0 samples (mono 16-bit WAV, about 2.2 MB) and `CREDITS.md` |
| `dist/soundtrack.mjs` | Music and radio chatter behind Sound. One track per mood (home, run, fight) from `dist/music/`, crossfaded; a missing file is silence. Radio transmissions are synthesized (garbled voices, squelch, roger beeps, numbers stations, modem bursts). The street bed, horns and synthesized sirens go through a far-away chain (steep low-pass, building reflections) so they sound ten floors down. Commands: `music on\|off`, `radio on\|off`, `radio test`. |
| `dist/music/` | Drop CC0 tracks here as `home`, `run`, `fight` (`.ogg` or `.mp3`); `CREDITS.md` lists the recommended ones |
| `strains.test.mjs` | The strains (wave 1: Keylogger, Hashrat, Floodgate, Leech, Sleeper; wave 1b: Patchwork, Flicker, Extortion, Echo, Bricker, Overrun) and the ICE guards (Bouncer, Tracer): data in `STRAINS` / `GUARDS` (`dist/data.mjs`), rules in `dist/combat.mjs`, ICE swaps in `layoutOf` (`dist/run.mjs`). |
| `bot.mjs` | A scripted player from a fresh save to a target level through the real commands, on a simulated clock: `node bot.mjs <class> <level> <seed>` prints what it fought, where XP came from and when each level landed. |
| `econ.mjs` | The economy check: the bot climbs to a level never paying for health, always topping up, and topping up plus building services, and prints earned, spent, rest time and time to level. `node econ.mjs <class> <level> <seed>`. |
| `dist/crew.mjs` | Simulated co-op, to try it before there's a server: `crew sim <class> [<class>…]` (up to 3), `crew`, `crew off`. Bot crewmates (full player states at your level, a Tuned protocol per slot) fight your run fights on the same virus and cycle, played by `planner.mjs`. Hooks into `combat.mjs` (`crewEngage`, `crewAct`, `crewTarget`, `crewEnd`); `playerPhase` is one player's part of a cycle. |
| `dist/presence.mjs` | Who's online, where, and your friends list. Simulated until there's a server (`online sim` / `online off`): a pool of 20 hackers who log on and off and move every minute or so, worked out from the clock. Friends are on the save (`friend add\|remove <handle>`, `friends`, `who`). SPRAWL-00 is shared: `ls` shows who's in each folder (and below it), arriving says who's here, the map's SPRAWL-00 node counts them. The top-bar people button opens Friends / Online; an online friend can be invited into your crew (`crew invite <friend>`, `crew kick <name>`). |
| `dist/factions.mjs` | The five PvE factions (Halcyon, GLASSJAW, Kestrel, LANTERN, NULL CHOIR): colours, marks, tiers, allies and rivals; rep with ripples (`changeRep`, −100 to 100; Halcyon floors at 0); donations (`donationOf`, `donate`); hubs on the map with shops (`buy <faction> <good>`); faction-owned servers (`claimServer`, `strikeServer`). Tested in `factions.test.mjs`. |
| `dist/market.mjs` | Hub markets: wares, each hub's condition and the rotating world event, price pressure and recovery, and trades as file transfers that take time (`market sell|buy <faction> <ware> <n>`). Tested in `market.test.mjs`. |
| `dist/payload.mjs` | Payloads: Exfil and Wiper viruses compiled and deployed at faction hubs, executed automatically against the hub's defence and alert (blocked/partial/breach), with loot, offline hubs and rep hits (`payload compile|deploy`); Backdoor captures an offline hub. Tested in `payload.test.mjs`. |
| `exploits.test.mjs` | Fair-play checks: paused fights hold no clock, threats arrive across a reload, outposts and hubs make nothing under siege, shops never undercut markets, compiled items give no Exploits, your trading doesn't pump hub income. |
| `dist/hubs.mjs` | Hubs you hold: no-spread trading, shop at cost, income over real time (`hub collect`); retake swarms from Hostile owners on logged-on time (`hub defend`), lockdown and clearing (`hub clear`), the answer swarm at your outposts after a strike; donations route here (`hub donate`). Tested in `hubs.test.mjs`. |
| `dist/memory.mjs` | Server memory: how many servers your network holds (`memoryCap`), attach/detach for credits (`attach\|detach <server>`), a detached server and everything found through it frozen (`isLive`, `branchOf`). Tested in `memory.test.mjs`. |
| `dist/consortium.mjs` | The consortium (simulated members): merged home servers joined by a trunk line. `consortium create <name>`, `invite\|kick <handle>`, `leave`, `accept\|decline` (simulated invites), `defend <server>` (sieges on members' outposts), `collect` (the dividend: a 25% share, in kind, of what members' outposts produce), raids on members' walls, lockdowns, occupied (crashed) servers, the travelling virus (`intercept`). Members' networks (built from their handles), shared ground, size tiers (yield, bounties, the trunk rogue server, bandwidth). Tested in `consortium.test.mjs`. |
| `dist/hitfx.mjs` | Hit effects on the fight board: when a command lands, the shooter's avatar (the initials on the part's rail, `view.mjs`) lunges; misses shake, broken chits flash. The rest of a hit (number, flash, bursts) is app.js, by the Effects setting. On a layer beside `#board`, played by `app.js` after each board redraw. |
| `dist/planner.mjs` | The scripted fight player (the balance scripts and simulated crewmates use it). |
| `dist/station.mjs` | The numbers station: LANTERN reads a dead drop out over the radio (`tickStation`, from `tickNetwork`), a locked `/drop` on a server with a credit cache and a blue-or-better protocol (`dropFile`), the password spelled two digits a letter (`spell`). `developer station` broadcasts one now. |
| `dist/forensics.mjs` | Log sweep: an incident file on about half the found servers (who broke in, what was stolen, which process is hiding), built from the server's seed, harder by layer. `sweep <answer>` answers; a right answer pushes the lead toward the next server. |
| `dist/lore.mjs` | Skill library text: a plain sentence of what each skill does (numbers scale with level) and a line of flavour. The fight's ability bar keeps the terse `short` from `data.mjs`. |
| `dist/window.mjs` | The window behind the monitor (casing on, screens 1700px and wider): a canvas slum skyline with lit windows, flickering neon, blinds and grimy glass, and weather that changes every five minutes (clear, fog, drizzle, rain, storm with lightning). Rain and thunder play through `soundtrack.mjs`. Commands: `window on\|off`, `weather <clear\|fog\|drizzle\|rain\|storm\|auto>`. |
| `dist/intro.mjs` | First launch (and after Reset game): a tty login (handle + password; only the handle and the password's length are kept), then Halcyon's encrypted transmission explaining the terminal and pointing to wick's mail. The handle replaces `rookie` on the prompt, the run pane and the boot screen. |
| `dist/rain.mjs` | The run backdrop: faint amber binary falling behind the terminal, faster and brighter as Signal drops, red while a guard has you. Motion off: none. |
| `dist/feel.mjs` | The feedback language: one flash / float / sound voice / vibration signature per event kind |
| `dist/tutorial.mjs` | Parked: guided lessons, not wired into the UI right now |
| `dist/virus-art.mjs` | The viruses as ASCII art: 3D point clouds with surface normals, drawn as terminal characters shaded by light (`.:-=+*#%@`, with 0/1 grain). 16 shapes picked by strain, guard or family (`shapeOf`: crab, padlock, serpent, wraith, hound, eye, spider, tick, blades, block, dish, cube, fountain, cocoon, rings, hive), each varied by the virus's seed (legs, size, spikes, antennae, halos). Parts animate (undulate, sway, orbit, spin, breathe, bob); hits flash and jolt, a hit tears rows sideways, parts about to attack throb red, badly hurt parts corrupt, broken parts burst into falling characters, Flicker's Shade fades on odd cycles; a faint data rain behind. Reads state only. |
| `dist/style.css` | All styling; colour meanings are listed at the top |

## Checks

```sh
node --test            # every *.test.mjs, including balance.test.mjs (class balance by level)
node playtest.mjs      # kill orders vs enemies → docs/PLAYTEST.md
node balance.mjs       # one scripted player per class at five points on the level curve → docs/BALANCE.md
```

The playtest script runs 7 scripted strategies against each fixture and 30 random variants. It checks that no single kill order always wins; it can't tell you if the game is fun. Play it with people for that.

## Leftovers from the previous build

These files are no longer used and can be deleted: `dist/blackbox.js`, `dist/blackbox.css`, `dist/combat-layout.css`, `dist/combat-feedback.mjs`, `dist/combat-view.mjs`, `dist/encounter-view.mjs`, `docs/variant-results.json`, `docs/exploit-results.json`. The old specs and phase reviews under `design/` describe the previous combat model; treat them as history, not instructions.

Saves from before the level system keep their server, credits and locations, but every class restarts at level 1 with a fresh loadout. A fight saved under the old armor rules is dropped on load (the next intrusion arrives as usual). Older ones (`blackbox-v4` / `v5`) start a fresh server.
