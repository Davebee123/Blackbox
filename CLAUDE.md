# Working on BLACKBOX

A browser hacking game: `dist/` is the game (plain ES modules, no build), `*.test.mjs` the tests, GAME_RULES.md the
rules as built, README.md the code map, `docs/` the design docs (docs/style-guide.md and docs/ui.md for the look).

## Workflow

- **Tests.** `npm test` before every commit. It runs every fast test file, and a slow balance simulation only when
  something it loads changed (scripts/test.mjs; `npm run test:plan` says what runs and why). It takes about a minute.
  The Tests workflow on GitHub runs `npm run test:full` on every push to main and to a `claude/` branch (a branch
  merged with main first). Check it when a session starts: a red main is the first thing to fix. A cloud session
  takes about two hours over the full suite, so leave it to the workflow. Commit or land only on `# fail 0`. The `todo`
  tests in the full suite are expected. When reading a test log, grep for its totals and its `not ok`
  lines; never read the whole log. Run `npm ci` once a session (esbuild, for the build and its test).
- **The hosted build** (scripts/build.mjs): Pages serves `dist/` bundled into one script and one stylesheet. A new
  stylesheet goes in index.html's links; a file fetched by URL is page-relative, or `new URL(x, import.meta.url)` from
  a module at `dist/`'s root (the bundle sits there).
- **Landing.** Every session lands its own work: commit on its branch, then `node scripts/land.mjs`. It merges
  origin/main in, tests the merged tree, pushes it to main, and starts over if main moved meanwhile. Resolve its
  conflicts yourself, keeping both sides' intent. Where two changes collide in design (one removes what the other
  reworks), stop and ask the designer. A session never leaves its branch for a later merge.
- **Parallel sessions.** A session that writes prompts for others gives each one a lane (the system and files it
  owns), what it must not touch, and a landing order. Two sessions that change the same system (economy, XP and
  pacing, the save, combat rules) run one after the other, never side by side.
- **Saves.** Key a save migration on the field it converts, so it is safe to run twice (like `hardenRestore`). Raise
  `SAVE_VERSION` only when landing, after main is merged in: one more than main's. land.mjs stops if both sides
  raised it.
- **Branches.** Start from a fresh main and land before the session ends. Work that can't land yet (an experiment the
  designer hasn't kept) goes on a `wip/` branch, so it isn't mistaken for outstanding work.
- **Docs.** Keep GAME_RULES.md and README.md in sync with the code and with each other, in the same commit. Write
  docs lean too: no preamble, no restating, no walls of text. Cut a wall whenever you touch it.
- **Agents.** Use worktree agents for big features only; do small fixes directly. Tell an agent to read narrowly
  (grep for the function, read that part of a file), to run `npm test -- --base main` in its worktree, and to merge
  main before its final test run. Merge agents' branches into main one at a time. Never cd into an agent's worktree.
- **Lean first.** A new or reworked mechanic ships lean: the rule, its board mark and tooltip, a unit test, and the
  docs. Teach the planner only enough to keep the balance tests green. Routine chips and presets, the no-fixed-rule
  tuning and screenshot sets wait until the designer has played it and kept it. Batch many mechanics per session, use
  one agent at most, and run the full suite once at the end. The designer's play is the bar; never tune against the
  bots to pass it.
- **Sessions.** Start a fresh session for each batch of work, after the last one is pushed. A long session re-reads
  its whole context on every step, and that is most of the token cost.
- **Performance** (docs/performance-plan.md). Phones are the bar. New code costs nothing while idle: no loop, timer or
  infinite animation runs when its thing isn't on screen. Animate `transform` and `opacity` only; never `box-shadow`,
  `filter`, colours or SVG attributes in a loop. Update the DOM in place rather than rebuilding it, never read layout
  (`getBoundingClientRect`, `offsetWidth`, `scrollHeight`) right after writing it, and build per-sample or per-pixel
  work once, not per frame. A change to a fight, a map or anything that animates gets a before and after from
  `tools/perf/phone-audit.mjs` (phone, and `DEVICE=desk`), and it lands only if it doesn't get slower. What nobody can
  see ships for everyone; what costs looks goes behind a Graphics setting, full by default on a desktop. Keep the
  plan's table current.
- **Screenshots.** One good set per feature, looked at before showing. Scripts and screenshots go in the session's
  scratchpad, never in the repo. Chromium is preinstalled for Playwright; never run `playwright install`.
- **Processes.** Never `pkill -f`; kill by PID.
- **Commits.** No pull requests unless asked. No model names in code, comments, commits or PR text.

## The designer's standing rules

- **Show, don't tell. Always reduce verbiage.** Numbers, tags, bars and icons on the screen; the rule behind them goes in
  a tooltip, never a paragraph. Cut every word the screen can do without, in new UI and whenever you touch old UI.
  Assume the player knows the basics; what needs teaching goes in the tutorial, everything else is left out. Rewards
  and costs are icons, in tooltips too.
- **Prose** (letters, journals, lore): a science fiction writer's, concrete and plain. Never the contrast pattern
  (*not X, but Y*; *you don't X, you Y*; *it isn't X, it's Y*), in any form, and no stacked triplets or closing
  aphorisms.
- **Tooltips use WoW's grammar:** a name, its kind, what it does, then the answer, muted. Use sentence case and good
  grammar: whole sentences, never cryptic labels.
- **Colours keep one meaning each:** teal is only ever the player, red is threat, amber is loot and what you use,
  violet is daemons, steel is armor.
- **Friction, not spikes.** No loss aversion; reward attention, never punish its absence. A risk the player is shown
  and chooses (an uninsured transfer) may cost what they staked; that isn't loss aversion.
- **No intrusion metaphors** (keyhole, way in, backdoor).
- **No canvas or PixiJS for new UI.** Screen effects never cover or interfere with the UI, and there is no rain on
  the screen.
- **No slogans on a class**, anywhere (its `idea`, `solo` and `crew` lines stay off the screen).
- **Busy designs get rejected.** Improve by aligning and spacing, not by adding decoration. Keep the original map.
- **Sounds:** the designer hears a sound before it is added.
- **Design choices:** for a look with real alternatives, show two or three options as screenshots and let the
  designer pick.
- **Prototype first.** A new activity or feature is built as standalone applets (pages in the scratchpad) and shown as
  screenshots before any of it is implemented. docs/activities.md lists what's wanted and what was cut.

## Decisions so far (don't undo these without asking)

- **Picked looks:**
  - the power-up: the *Horizon* (a line of light across the screen, the black box standing on it with its light
    leaking round the edges, the name small and low; poweron.mjs), its loading phase the *Trace* (the box's outline
    draws itself round while the game warms up, then the light leaks out); and the same box on a short line as the small mark
    (the top bar, the class pick, the favicon); the top bar's tabs as the *Rail* (cells in one frame split by hairlines, the open one lit; links with a `/` between them were the old look); the player tag as the *Level chip* (the level in a teal square, handle over class, XP a hairline under them; *Prompt* and *Badge* were the alternatives); the top bar's right side in icons, each word in its tooltip;
  - quest window: the *Transmission*;
  - a hub's market head: *Squares* (the condition and each ticker card an icon in a 30px square, everything else on
    hover; up green, down pink, a crew's run red, the time left on its bottom edge; a rare card's star top-left, a bulk
    order beside its ware's name; docs/ticker.md 4); text tags, the strip and the wire were the alternatives;
  - level-up: the *Firmware update*;
  - wick's tips (the guided path's, tips.mjs `wick`): the *Transmission* (his face, the kicker, his lowercase line);
  - pager: the *Log* on a desktop (ping lines in the map's left column under Contracts, above the prompt elsewhere;
    pings.mjs), which replaced the *Tray*; a phone keeps its lamp and Comms;
  - player card: the *NET ID badge*;
  - collection log: the *Ledger*;
  - journals: one Ledger entry, a timeline over the writers, a document card on the first find (docs/journals.md);
  - runners on the map: the *Diamonds* (one small paper-white diamond under a place you've revealed that has runners,
    how many beside it from two up, a hollow one each on the road; none under a ? or anywhere else you haven't
    revealed; a lone diamond opens their card to hire them, a counted one the list of who's there; the runner you pick
    gets their route and where they're heading, as far as you've revealed); the *Rail* (a Runners list) is off the
    desktop map (the designer reads the map instead) and stays only in a phone's sheet; runners stay off the Online
    list (docs/runners.md);
  - meeting and hiring runners: a paper-white tab on the room, Help / Step back on its card; cards with rows split by
    hairlines; traits as named chips, temperament first; standing as the *Tier bar* (the tier, a bar to the next); a
    hired runner's bar picked from their *Presets* (a tile each: name and how it plays, keys in its tooltip);
  - a boss's loot page: *Grouped* (every kill, its uniques, its set piece, each with the next kill's odds as a bar);
  - a boss's act break: the *Strip* (after a breath the board's strip flares in with the act's name, holds about 4 s
    and fades out blurred; the boss's emote types under its bar; then the parts come back in, top to bottom; the clock
    holds; the *Tritone*: a heavy break, then a low G against its tritone droning under the strip);
  - a boss's bar: the *Segments* (one segment an act, the acts done dark, the act now draining);
  - the Backlash on the board: the *Return chip* (hatched red, pointing back at you, *↩ −12 if hit*); the beat column
    and a warning on your row were the alternatives;
  - room verbs on the map (roomfx.mjs, each with its sound): a vault the *Dial* (its dial clicks three times, the doors
    part, the files fly to your Pack a note higher; *Seal* and *Count* were the alternatives); a cache the *Lid* (the
    lid tips up, kept inside the chip; *Spill* was the alternative); a rest *Breathe* (*Power-nap* was the alternative);
    bait, entry files, a key and a socket's program as first shown;
  - connecting to a server: the *Carrier* (a teal line from HOME to its node, the rooms open in a circle from there;
    eased, no black screen, no readout), and jacking out plays it backwards (your room locks teal, the rooms close in
    a circle onto the node, the line runs home);
  - a disconnect: the *Reboot* after NO CARRIER (the line runs home, HOME's outline draws itself round, HOME lights
    with its bar at your Integrity), then the No carrier card (the Warm cache struck through, the death recap folded
    behind one red row; nothing reverts since D9); a Resident that beats you no longer grows;
  - network map servers: the *Glyph* (each server its kind's glyph, a bar of what's cleared, a ring round a new one);
  - INIT's count: *Plain* in the header (*PROCESS TABLE N%* between Signal and Credits, the band's effects in its
    tooltip; docs/init-table.md); the map's *Readout* was too small to notice;
  - network map ground: the *Chart* (faint crosshairs and hairlines that pan and zoom with the map);
  - fights by floor: the *Place* (the floor's scene in characters inside the render, its light and camera on the virus,
    the floor's entrance and break physics; stage.mjs), the fight log on its newest line (▴ opens it), chips typed or
    flipped in on some floors (their look never changes), the theme's *era* on Coldline and Bedrock; the picture's
    *Era* and board skins that change the chips were rejected; then the visit's sky (fog, a low sun), the virus in the
    floor's colour (not Deep Core or the Sink), the spoils arriving the floor's way, the rooms map's floor as a
    *material* (a picture under the map was rejected: its landmarks fell under rooms); the *Swap* (the picture left of
    the board, the virus's bar over it, yours over the board); the board's *frame* by floor (playhead form, rules,
    headings; never chips); strikes throwing the floor's material were rejected;
  - rooms map: each room kind its own outline and hue (the *Hues*: orange socket, green rest, gold vault, white
    entry and den), thick borders. The one place a colour means a kind. An elite is red like any threat, with its bevel
    and a chevron rank tag (magenta was dropped); a fight room's icon is its virus family's.
  - class picker: the *Drawer* (four squares; the picked one slides its traits, starting skills and subclasses out of
    its side, the rest narrow to strips) with a class border each (Breaker *Fracture*, Bastion *Deflect*, Infiltrator
    *Trace*, Operator *Threads*) and Start as a lit command, `> start --as <class>` (docs/ui.md);
  - phone shell (docs/phone-plan.md): four tabs at the bottom (Map, Mail, Loadout, More; the Server tab went with the wall); in a fight no top
    strip, the HUD as one line (*C*: your bar left, the virus's right with its ◆, its window at the end; the rest in
    the bars' cards; it slides out beside the board in its half, covering no chip),
    two rows of four keys with the menu key at the row's end; on its side, the same shell with a wider board.
- **Rejected looks:**
  - the *View* background behind the monitor; keep the original city, with more detail at the same size;
  - card-first clicks on the rooms map; one click walks;
  - Roomy, the extra monitor size;
  - a diamond for every runner, side by side under a server (one diamond and a count instead); runners listed in the
    Online panel;
  - runner standing as pips or as the steps each tier opens; a runner's bar set in their Toolkit or key by key; traits
    as bare icons.
- **The monitor** takes up most of the screen. UI scale is a setting, 100% by default.
- **Ability effects:**
  - short, and drawn over the part's name;
  - played at 1.5× speed;
  - each starts from its ability key, or from the bar when the key isn't visible;
  - a crewmate's starts from their own bar;
  - Firewall plays on your bar.
- **The market moves** (November 2026): prices move on logged-on time, run by the director, each mover with a reason
  in the lore. *No entropy* and no loss aversion guard the time you're away; the market moves both ways while you play.
  What's next is the ticker (docs/ticker.md): lore-voiced cards that move hub prices. Sway is shelved. INIT's count is kept
  as INIT's table (docs/init-table.md): play moves it, and it moves no prices. Outposts (docs/outposts.md) and a central exchange (docs/exchange.md) are tabled as too complicated for now.
- **HOME is lean** (November 2026): it is its Integrity, nothing more. Invasions chip it until you intercept them; the
  firewall, its tiers, filters and the Server page are gone. The designer will decide what makes servers dynamic next.
- **Rested XP** comes only from time logged off. There is no catch-up XP.
- **Unlocks:** cosmetic unlocks (districts, boots, prompts, desk props, mastery looks) come from achievements, not
  from server floors.
- **Phones:** combat on a phone never opens the keyboard.
- **Fights** (docs/puzzle-fights.md): every fight is a little tricky, elites and bosses harder, and the game challenging.
  Puzzles, never walls: hard and rewarding to learn, like Elden Ring. A blind player loses; watching or a correct
  routine wins. Hard means several threats at once, each choice a lesser evil (docs/puzzle-fights.md decision 15);
  about 30% Signal a same-level fight, and gear matters. A boss's signature changes the fight and ties to its lore; shutting a skill off is a side rule at
  most.
- **Act bars:** every solo boss fights in three acts, each a fresh bar: every part back at full, with the act's rules
  on top. An act ends when its last part breaks. Acts run about even, with no hard ratio: a boss can carry a bit more
  health, and bosses needn't be perfectly balanced. Uneven acts get behaviour or mechanics changed, never the split
  (acts.mjs `ACT_BARS`). An act runs 15 to 20 cycles
  and starts from act 1's board and rules, with one rule of its own. The ♛ carries the boss's signature, and its ticks
  are a part's. Parts come back mid-act only where a boss's system fits it.

## Backlog

- **Enhance, don't add** (the designer, November 2026). In order: the fights (the main loop); then every floor's
  content, its bosses finished (floors 5–8 have none of their own); then itemization on the deeper floors. Every floor
  should have content. Runners go on slice by slice (R2 built; R3 next, then R4: docs/runners.md). Other new
  systems (off-map servers, co-op, crises) wait.
