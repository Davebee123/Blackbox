# The demo: floors 1–2

**Status.** Proposed (21 November 2026); the designer's answers are in the decisions table, and D2, D5 and D6 await
their OK before Phase 1. Nothing here is built. It comes from the
readiness audit of 20 November: a fresh-save playtest (Breaker, desktop and iPhone 13), a content count of floors 1–4
and a pacing pass. Each phase is one session, started fresh from main, in the order below.

## The demo

Floors 1–2, levels 1 to 14, ending when CENTRIFUGE (14) falls at the end of floor 2's job chain, *Carrier*. About 5
hours on the pacing table, likely 8–10 in real play.

- **Floors 1–4 is a full game's length**: 17–19 hours on paper to level 26 for a contract worker, 26–28 for a farmer,
  and likely 30–45 in real play (the table assumes 150 kills an hour; fights run about 15 cycles).
- **Floor 2 is the most finished floor**: five lair bosses reworked into three acts, CENTRIFUGE and SHAKEDOWN with their
  loot, three new families (Botnet, Cryptominer, Logic Bomb) and a chain that ends on a real boss.
- **Floors 3–4 aren't ready**: floor 3 has no new family, lair bosses on old acts and no lair loot; TRIPMINE and
  FLOODWALL have two acts; floor 4 has no thread (Later, below).
- The subclass at 10 and two of its skills (12, 14) fall inside it.

## Decisions to sign off

| # | Decision | The designer (21 Nov) | The plan |
|---:|---|---|---|
| D1 | The demo's scope | Floors 1–2 | Capped at level 14, ending on CENTRIFUGE |
| D2 | Where it lives | itch.io or Steam; not $100 before knowing people play it | **Proposed:** itch.io first (free; a Restricted page for the closed test, Public after). Steam's $100 fee (recouped after $1,000 of sales) waits for the itch numbers in Phase 8 |
| D3 | The first disconnect | SPRAWL-00 reboots like every server | The revert stays everywhere. The run shows what's unbanked, and the tour teaches jack out after the first win |
| D4 | The guided practice | Could work; to be tested | Phase 2 wires it in behind an offer after the class pick; it lands once the designer has played it, else stays off |
| D5 | Floor 1's chain boss | PAGE NINE early is fine, but beatable when it comes | **Proposed:** PAGE NINE closes floor 1's chain; its step waits for level 6 and it fights at your level (6–8), so it's never above you. CENTRIFUGE (14) stays the demo's last boss |
| D6 | Hearing from players | Asked for a recommendation | **Proposed:** a Feedback button that downloads a report and opens a free Discord server (testers attach the file; itch's comments take the public); opt-in telemetry to a Cloudflare Worker (free tier), the only way to measure real play time and where players stop |
| D7 | What levels 1–14 hide until it matters | Brainstorm the paths first | D7 paths below; Phase 7 opens with the brainstorm |
| D8 | The end card | The demo freezes there | The card ends play (XP stopped, the exit shut), with the itch follow and the Discord; a Steam wishlist once a store page exists |

**The demo's bosses, in order:** RELAY-KING (SPRAWL-00's Core, from 3) → PAGE NINE (floor 1's chain, 6–8) → the floor 2
lair and SHAKEDOWN's Pit (7–14) → CENTRIFUGE (*Carrier*'s end, 14). Diablo III's Starter Edition ends the same way, on
an act's last boss.

### D7 paths

Three ways a system can wait, to brainstorm before Phase 7 (prototype the picked one per CLAUDE.md):

- **A · By level** (WoW's talents at 10): the Firmware update names what opened. Predictable; arbitrary for systems
  with no tie to power.
- **B · By a letter** (Exile's Reach): a contact brings it in (wick the market, LANTERN the scanner). It gives each a
  reason and fits Phase 5's transmissions; it costs writing, and a player who skips Mail misses it.
- **C · By the place** (discovery): it shows the first time you stand where it lives. Nothing is on screen before it
  matters; some players meet a system late.

| System | Shows now | A · level | C · the first time you… |
|---|---|---|---|
| INIT's table (header) | Minute one, no tip | 8 | break an orphan |
| Rivals | Any traced server, 20% of visits | 6 | open a vault |
| Invasions and daemons | 3 min after the first connect | 3 | take a server over |
| Events, blips, run cards | 3 | 4 | jack out with a full pack |
| A hub's market, ticker, supply order | With the hub | 5 | sell at that hub |
| Quest sites | 5 | 8 | finish floor 1's chain |
| Hiring runners | 5 | 7 | help one in a room |
| Factions' rep and commission | Halcyon's from the start | 5 | reach a second hub |
| Receipts, Root, sockets | First takeover | — | (already by place) |
| Rig: casing, terminal, house | Always | — | earn the first achievement |

## Evidence from the games it resembles

| Here | What a shipped game did | Phase |
|---|---|---|
| Nothing stops a player at floor 4, and the story runs out | WoW's free trial has stopped at level 20 since 2011 ([Blizzard](https://support.blizzard.com/en/article/3226)); Diablo III's Starter Edition ends at the Skeleton King, capped at 13 ([Blizzard](https://support.blizzard.com/en/article/2730)). Both cap a level and end on a boss | 1, 5 |
| Most players see only the first hour | Across 130 Steam demos the median play was 14 minutes, and the best performers' medians were 38–65 ([Zukowski](https://howtomarketagame.com/2022/10/26/what-is-a-good-median-play-time-for-a-demo-benchmark/)) | 2 first |
| The first disconnect takes the kill, the XP and the contract step, unannounced | Elden Ring keeps the runes you carry on screen and lets you walk back once for them; WoW dropped EverQuest's XP loss for a ghost's run back and 10% durability ([wiki](https://warcraft.wiki.gg/wiki/Death_(gameplay))); Path of Exile charges no XP for dying before Act 5's Kitava ([wiki](https://www.poewiki.net/wiki/Experience)); Starsector recovers your lost ships with D-mods ([Fractal Softworks](https://fractalsoftworks.com/2017/01/20/ship-recovery)) | 2 (D3) |
| A cost framed as a penalty | WoW's beta halved XP after a few hours of play; testers hated it, so Blizzard kept the numbers and called the full rate *rested* (Rob Pardo, GDC 2010, [Game Developer](https://www.gamedeveloper.com/game-platforms/gdc-blizzard-s-core-game-design-concepts)) | 2, 6 |
| Levels 2, 9, 11, 13 bring nothing | WoW cut 120 levels to 60 so every level would mean something, dropping the ones with no new spell or talent ([Blizzard](https://worldofwarcraft.blizzard.com/en-us/news/23187291)); Diablo II gives 5 attribute points and a skill point every level; Diablo III unlocked a skill or rune every level to 60 | 7 |
| 35 systems by level 10; the practice unreachable | Exile's Reach brings in WoW's features one at a time from 1 to 10 ([Blizzard](https://support.blizzard.com/en/article/296577)); Starsector's new campaign offers a skippable *Start with tutorial!*; Diablo III keeps Elective Mode off until you want it | 2 (D4), 7 (D7) |
| The Shop undercuts drops | Diablo III closed both auction houses in 2014 because "it ultimately undermines Diablo's core game play: kill monsters to get cool loot" (John Hight, [GamesBeat](https://gamesbeat.com/blizzard-to-close-the-diablo-iii-auction-house)) | 7 |
| No gear is a wall | Diablo III's Inferno launched gear-gated; patch 1.0.3 cut its damage and health and raised drops ([Tom's Hardware](https://www.tomshardware.com/news/Diablo-3-1.0.3-Patch-download-update,16085.html)). On consoles a green arrow marks an upgrade | 7 |
| No way to hear from players | Mega Crit collected data on every Slay the Spire run and changed cards and enemies by it through early access ([Game Developer](https://gamedeveloper.com/design/how-i-slay-the-spire-i-s-devs-use-data-to-balance-their-roguelike-deck-builder)); Hades shipped a big update every couple of months, built with its players ([PC Gamer](https://www.pcgamer.com/uk/a-journey-through-early-access-helped-make-hades-a-masterpiece/)) | 1, 8 |
| Every push to main reaches players, saves and all | Starsector ships numbered builds, each hotfix a new number (0.97a reached RC11 in two weeks), and every release post says whether old saves load ([Fractal Softworks](https://fractalsoftworks.com/tag/release)) | 1 |
| Who tests it | Five users find most usability problems ([Nielsen](https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/)); a Steam demo has had its own page and reviews since July 2024, and wishlist buttons belong in its menus ([Zukowski](https://howtomarketagame.com/2021/06/21/neat-ideas-for-your-games-demo/)) | 8 (D8) |

## Phases

Every phase: start from a fresh main, read only what its lane needs, `npm test` before each commit, docs (GAME_RULES.md,
README.md) in the same commit, land with `node scripts/land.mjs`, and add a line to the Log below. A phase that changes
a fight or a map brings a before and after from `tools/perf/phone-audit.mjs`. Screenshots and scripts stay in the
session's scratchpad.

**Session prompt** (the same for each; paste with the phase's number):

> Do Phase N of docs/demo-plan.md, as signed off. Its Lane is what you own; leave its Hands off alone. Lean first
> (CLAUDE.md). Where a step names a choice of look, show the designer two or three screenshots before building it. Land
> with node scripts/land.mjs and log what landed in the plan.

### Phase 1 · The demo build

The frame every later phase is checked inside: a capped build at its own address, a save that can be backed up, and a
way to hear from players. No gameplay changes.

- **Lane:** scripts/build.mjs, a new `dist/demo.mjs`, app.js (boot, save, Settings), bench-key.mjs, floors.mjs (the
  exit's card), the level-up's floor line, soundtrack.mjs and coldopen.mjs loading, `.github/workflows/`, GAME_RULES.md
  *Saves* and *Developer tools*, README.md, a new `tools/telemetry/` (the Worker and its page).
- **Hands off:** fights, tips, the XP curve's numbers, content.

1. **The switch.** `dist/demo.mjs` exports `DEMO`: `null` in the game, `{ floor: 2, level: 14, version: '0.1' }` in a
   build made with `node scripts/build.mjs build --demo`. Every rule below reads it; with `null` the game is unchanged.
2. **The cap** (WoW's Starter Edition). XP stops at 14: the bar stays full and its tooltip says the demo ends here.
   Floor 2's exit ▼ shows its card with *The full game* in place of **Go down** (`canDescend`, floors.mjs:358). Nothing
   deals content below floor 2: contracts, events, sites, invasions, runners' trades. At 13 the level-up names the full
   game in place of floor 3.
3. **Its own save.** Key `blackbox-demo` (bench-key.mjs `pageSave`), so a demo and a dev build never share one.
   `?dev`, `?bench` and `?playtest` do nothing; bench.mjs, arena.mjs and the editor stay out of the bundle.
4. **Save backup.** Settings → **Export save** downloads `blackbox-<handle>-<date>.json`; **Import save** reads one
   through `restore`, asks, and reloads; it refuses a save from a newer `SAVE_VERSION`. After the class pick the game
   asks the browser to keep its storage (`navigator.storage.persist()`), once.
5. **Feedback** (D6). A **Feedback** row in Settings and a button on the page-error card (app.js:2173). It downloads a
   report (version, browser, screen size, level, floor, the last 100 log lines, the save) and opens the Discord's
   feedback channel (D6).
6. **Telemetry** (D6). Asked once, after your first jack out, off until yes; a toggle in Settings. A random install id, never the handle. Events: a session's start and length, a
   level reached, a boss fought (its id, won or lost, cycles, Integrity left), a disconnect (where, by what), the demo
   finished, the last screen before closing. Sent to a Cloudflare Worker that stores them (the designer's account, free
   tier), with a page that reads them back: median play time, hours to 5, 10 and 14, where players stop, which bosses
   win.
7. **A version** (Starsector's numbered builds): *demo 0.1* small on the power-up's corner, in Settings and in every
   report.
8. **Deploy** (D2). A `demo` branch whose workflow builds with `--demo` and pushes to itch.io with butler (an
   `ITCH_API_KEY` secret the designer adds; the itch page, Restricted, the designer makes). main keeps deploying the
   dev build to Pages. A release is a tag (`demo-0.1`), a hotfix `demo-0.1.1`, cherry-picked from main. The Pages
   workflow retries once on the artifact lookup that fails now and then (4 of the last 30).
9. **itch's frame.** itch runs a browser game in an iframe on its own domain, so: the embed launches full screen (the
   monitor needs most of the screen); the save survives a reload and a new upload in Chrome, Firefox and Safari on
   itch's page (export is the fallback, and the way a demo save reaches the full game); the save's size is measured
   against the 5 MB a domain gets.
10. **The end-of-demo card**, as a frame: it opens when the *Carrier* chain's Boss step is delivered, with your time
    played, level, bosses down and uniques found, **Feedback** and the call to action (D8). Its words come in Phase 5.
11. **Loading.** The cold open's crowd (`sfx/coldopen/crowd.mp3`, 1.5 MB) loads after the first key; soundtrack.mjs
    stops asking for the four files that don't exist (`music/home.mp3`, `run.mp3`, `fight.ogg`, `fight.mp3`); a sample
    is fetched once (the keys' `key-*.wav` and `relay-*.wav` come twice).
12. **Docs drift.** GAME_RULES.md's loop still sends invasions past a firewall; *Levels* still gives a talent point
    every other level. Fix both.

**Done when:** tests on `DEMO` (the cap, the exit, nothing dealt below floor 2) and on export → import round-tripping a
save pass, the game with `DEMO = null` passes as before, and the designer has opened the demo's address.

### Phase 2 · The first hour

A stranger reaches the first kill in about 4 minutes, then loses it without knowing why. This phase makes the first
hour teach what it costs.

- **Lane:** tips.mjs, app.js (the part click, the loss card, where a tip sits), view.mjs (the class pick), runners.mjs
  `sprawlSpot`, the run's strip (floorplan-view.mjs, reading visit.mjs's snap), floorplan.css (the rooms map's
  labels), phone.css, tutorial.mjs (D4).
- **Hands off:** fight numbers, the XP curve, bosses, the demo switch.

1. **The stake on screen** (D3). Every server reboots as now, SPRAWL-00 included. The run's strip shows what's
   unbanked since you connected (XP, files, contract steps) as icons beside **Jack out**, and the No carrier card lists
   the same as what went: a risk shown and chosen (the standing rules). GAME_RULES's *A kill pays at once* in SPRAWL-00
   is corrected to match.
2. **The tour teaches banking.** `tour-jackout` follows the first win whatever came before it (drop its
   `after: ['tour-engage']`, tips.mjs:44); `tour-engage` counts **Help** too. SPRAWL-00's first ring holds no runner
   until the tour's done (runners.mjs `sprawlSpot`): the playtest's first room offered only Help, and the tour stopped.
3. **A click fires.** With a skill picked, a click or tap on a part fires it (app.js:3256 only fills the prompt now, and
   the fight waits for Enter); a part picked first, then a skill, fires too. The `fight-keys` tip says what's true.
4. **Tips clear their target.** A tip never covers what it points at or the button it names: wick's map tip sits on
   SPRAWL-00's **Connect** now, the rooms tip on your room and three of its four neighbours, a phone's first fight tip on
   the whole board. Checked at 1440×900 and 390×664 with `elementFromPoint` on the target's centre.
5. **Text that's wrong.** The class pick lists Flood under *Starts with* (view.mjs:3522; it opens at 3). The level tip
   says 4% a level (tips.mjs:64; it's 6%, your own numbers stop at 6 and gear carries the rest). The elite tip promises
   a blue or better (tips.mjs:76; elites roll 0.5%). The first server's tip talks about memory (tips.mjs:88), which is
   off. The low-Integrity tip (tips.mjs:78) names a rest room on SPRAWL-00, which has none.
6. **The first move isn't scolded.** `fight-wasted` (tips.mjs:127) waits for your second fight: Overload on the
   unarmored part is the obvious first play.
7. **No carrier's clock** counts down live, and rounds up (app.js `lossCard`: computed once; 59.5 s reads 0:00).
8. **The rooms map reads on a desktop.** Its names, costs and YOU tag render about 6 px tall; the plus fills a quarter
   of its panel. Two layouts as screenshots for the designer.
9. **Phone.** After a win the spoils card is off-screen (its stage panel collapses to 8 px; the only way out is ··· →
   Run). The Wait / Jack out pill sits under the log line, MATERIALS is clipped in the top bar, and the class pick's
   Start is below the fold with the drawer open.
10. **The guided practice** (D4): offered once after the class pick, skippable, on its training virus. The designer
    plays it in this session; it lands on, or stays off.

**Done when:** a scripted fresh-save pass (desktop 1440×900, iPhone SE, iPhone 13) reaches the first kill, a jack out,
level 2 and the first traced server's Connect with no tip over its target and no reverted kill, in under 15 minutes of
play; its timeline beside the audit's; one screenshot set shown to the designer.

### Phase 3 · Floor 1's bosses

RELAY-KING opens at level 3 in SPRAWL-00's Core and stands in for floor 1's chain boss; the planner wins it 3 times in
48 at level 10 (solo-bosses.md). It's the first boss most players try.

- **Lane:** data.mjs `BOSSES` (relayking, pagenine), acts.mjs `ACT_BARS`, floorbosses.mjs, boss-art.mjs, the boss tests,
  GAME_RULES.md *Solo bosses* and *Floor jobs*.
- **Hands off:** the Resident, floor 2's bosses, items' tables.

1. **RELAY-KING, retuned** for its level: a blind player loses, one who reads *Broadcast* wins (puzzle-fights.md). The
   designer plays it at 3 and at 5, on two classes, before it lands.
2. **PAGE NINE** (D5), floor 1's chain boss as written (story-script.md): an elite at 8, *Premium Paid* (one part
   Insured a cycle, shown a cycle ahead, in a fixed order) and *Filed Early* (its tells a cycle sooner), in three acts,
   with its art and its challenge and fall lines. The Boss step finds it by name (arcs.mjs `namedBoss`) and RELAY-KING
   stops standing in. Its letter waits for level 6, and it fights at your level from 6 to 8 (as lairs keep up inside
   their band), so it's never above you when it comes. Its loot is the chain's Custom pick of three; its own uniques
   wait.

**Done when:** the designer has played both; each act runs 15–20 cycles; the boss tests pass.

### Phase 4 · The Resident, and floor 2 in band

The Resident is the boss players fight most. Only the worm's and the ransomware's play in three acts (data.mjs
`resident.acts`); every other family keeps the old two-phase fight with no beat.

- **Lane:** data.mjs `BOSSES.resident` (`acts`, `actPhases`), acts.mjs, boss-art.mjs (the Resident by family),
  genesim.mjs's floor 2 bands.
- **Hands off:** RELAY-KING and PAGE NINE, floors 3–8.

1. **The Resident in three acts** for every family a floor 1–2 server can have: ghostroot, botnet, cryptominer and logic
   bomb. Each act 3 takes its family's nature, as the worm's Outbreak and the ransomware's Lockdown do.
2. **Floor 2's bosses in band** at their levels: CENTRIFUGE (the demo's last), SHAKEDOWN and the five lair natives
   (genesim.test.mjs's floor 2–4 todo, its floor 2 rows).

**Done when:** the designer has fought each new Resident once; genesim's floor 2 rows pass; the full suite is green on
the workflow.

### Phase 5 · The story's spine and its end

Only two transmissions exist (the welcome and the first server), and the twist is on floor 5. The demo needs a middle
and an end.

- **Lane:** content/scenes.mjs and its triggers (scenes.mjs), content/contracts.mjs (floors 1–2), content/story.mjs, the
  end card's words.
- **Hands off:** rules and numbers.

1. **LANTERN's arrival** on reaching floor 2 (story-script.md, drafted: *Four. Nine. Nine.*), and the *Carrier* chain's
   two extra letters (wick after step 1, Halcyon Claims after step 3; drafted).
2. **A closing transmission** as CENTRIFUGE falls (new; drafted for the designer first, by the prose rules). It picks
   up the chain's closing line (the schedule is signed by a pricing model; the count says 81%) and points below floor 2.
3. **The end card's words** (Phase 1's frame): the demo stops here (D8), with the itch follow and the Discord.

**Done when:** the designer has approved every line; each plays from the editor's *Play from here*.

### Phase 6 · Logged off is safe

The backlog's item as written in CLAUDE.md, run alone (it's pacing work): no invasions while logged off; every minute
away banks rested XP; the consortium's away help goes; GAME_RULES.md *While you're logged off* and *Away is played out*;
the tests (wick's `server-wall` tip went with the wall); a save left occupied migrates. `SAVE_VERSION` +1 on landing.
A returning player comes back to a bonus and nothing lost (WoW's rested XP).

### Phase 7 · Levels 1–14: what opens when, and what it pays

**Gate:** the designer plays the demo build from level 1 to 14 on one class first, with notes in the Log. This phase
tunes to that play, never to pass the bots.

- **Lane:** progression.mjs `levelGains`, the level gates in data.mjs and tips.mjs, table.mjs (the header), the rivals'
  roll (netrooms.mjs), store.mjs prices, the stash view, docs/BALANCE.md.
- **Hands off:** bosses, story, the demo switch.

1. **What waits** (D7). About 35 systems are on screen by level 10, in clumps at 3–4, 5–6, 8 and 10. The session opens
   with the brainstorm on the D7 paths, prototypes the picked path as scratchpad applets, and builds it once the
   designer has picked.
2. **No dead levels** from 2 to 14. Nothing new arrives at 2 or 9, and 11 and 13 bring little. Candidates: the second
   core skill at 2 (it's Flood for a Breaker, which the class pick already promises), presets at 9, a bases tier at 13.
   The designer picks.
3. **Upgrades show**: a protocol in the stash better than what's loaded wears an amber ▲, and so
   does the Loadout tab. With nothing equipped, a level-10 fight wins 17–58% of the time; a player who never opens
   Protocols hits a wall.
4. **Credits on a real clock.** One bot run made 7.8k credits by level 10 in 1.9 real hours, about 14 times `incomeAt`
   (store.mjs:43), so a shelf blue costs 13 minutes and undercuts drops. Measure the designer's credits an hour (`s.pace`)
   and set `incomeAt` to it, so the shelf costs the hours it was meant to (store.mjs:9). Components get a buyer before
   level 12 or stay banked (the designer's call).
5. **Difficulty**, from the designer's notes: the friction band at 1, 10 and 14 (balance.test.mjs todo), the Breaker at
   10 (37–40% lost, 58% of solo bosses won), the Herder (16% lost).
6. **docs/BALANCE.md** regenerated (`node balance.mjs`): it still says 4% a level and *Signal*.

**Done when:** the designer's second pass; hours to 5, 10 and 14 measured on the designer's clock; the full suite green.

### Phase 8 · Closed test, then the demo

1. **Freeze.** Tag `demo-0.1` on the demo branch; it goes to the Restricted itch page.
2. **Five strangers**, each sent the Restricted page, watched over a screen share with no help for their first hour,
   then five questions: where they stopped, what confused them, what they'd do next, which class, would they keep
   playing.
3. **One fix session** for what they hit, landed on main and cherry-picked as `demo-0.1.x`.
4. **Open it**: the itch page Public, the Discord linked from the end card.
5. **The Steam call** (D2), after two weeks public, from telemetry and itch's own numbers: the median play time against
   Zukowski's benchmark (14 minutes across 130 Steam demos, 38–65 for the best), the share who finish, the follows. A
   Steam page then gets the demo as its own store page, a wishlist button in Settings, and opens ahead of a Next Fest,
   never first during one (Zukowski).

## Order and landing

| Phase | After | Beside it, if speed matters |
|---|---|---|
| 1 The demo build | sign-off | 3 (combat rules; shares no files) |
| 2 The first hour | 1 | — |
| 3 Floor 1's bosses | 1 | 1 |
| 4 The Resident, floor 2 in band | 3 (both change combat rules) | 5 |
| 5 Story and its end | 1 (the card) | 4 |
| 6 Logged off is safe | 2 (both touch the visit and the save) | — |
| 7 Levels 1–14 | 2–6, and the designer's play | — |
| 8 Closed test | 7 | — |

Side by side, the earlier phase lands first and the later one merges main before its last test run.

## Later: floors 3–4 (if D1 grows)

- The lair natives in three acts: TRIPMINE and FLOODWALL have two; HASHLORD and ECHOLALIA use generic acts
  (solo-bosses.md build step 4). Their own uniques (floor-items.md); floor 3's lair drops no lair items, floor 4's only
  Pager.
- The Resident's acts for wiper and the floor 3–4 families.
- RAT (floor 3) and Fileless (floor 4); floor 4's thread (Cold Start, Frostbite: threads.md); moth's transmission and the
  Claims letter; NULL CHOIR's transmission.
- Levels 17 and 21–25 bring nothing; 22 to 26 is about 5 hours with one skill.
- Tells pay 3–4 points of Integrity a fight against the 15–22 target (BALANCE.md).

## Log

*One line per phase as it lands: what landed, the commit, and what the designer said.*
