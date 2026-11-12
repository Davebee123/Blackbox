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
  lines; never read the whole log.
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
- **Friction, not spikes.** No loss aversion; reward attention, never punish its absence.
- **No intrusion metaphors** (keyhole, way in, backdoor).
- **No canvas or PixiJS for new UI.** Screen effects never cover or interfere with the UI, and there is no rain on
  the screen.
- **Busy designs get rejected.** Improve by aligning and spacing, not by adding decoration. Keep the original map.
- **Sounds:** the designer hears a sound before it is added.
- **Design choices:** for a look with real alternatives, show two or three options as screenshots and let the
  designer pick.
- **Prototype first.** A new activity or feature is built as standalone applets (pages in the scratchpad) and shown as
  screenshots before any of it is implemented. docs/activities.md lists what's wanted and what was cut.

## Decisions so far (don't undo these without asking)

- **Picked looks:**
  - the power-up: the *Horizon* (a line of light across the screen, the black box standing on it with its light
    leaking round the edges, the name small and low; poweron.mjs);
  - quest window: the *Transmission*;
  - level-up: the *Firmware update*;
  - wick's tips (the guided path's, tips.mjs `wick`): the *Transmission* (his face, the kicker, his lowercase line);
  - pager: the *Tray*;
  - player card: the *NET ID badge*;
  - collection log: the *Ledger*;
  - journals: one Ledger entry, a timeline over the writers, a document card on the first find (docs/journals.md);
  - runners on the map: the *Diamonds* (every runner on the floor a small paper-white diamond under the server they're
    at, hollow on the road; a click opens their card to hire them) and the *Rail* (a Runners list under Contracts that
    folds away; the runner you pick gets their route and where they're heading); runners stay off the Online list
    (docs/runners.md);
  - meeting and hiring runners: a paper-white tab on the room, Help / Step back on its card; cards with rows split by
    hairlines; traits as named chips, temperament first; standing as the *Tier bar* (the tier, a bar to the next); a
    hired runner's bar picked from their *Presets* (a tile each: name and how it plays, keys in its tooltip);
  - a boss's loot page: *Grouped* (every kill, its uniques, its set piece, each with the next kill's odds as a bar);
  - a boss's act break: the *Strip* (the ♛'s tick bursts into red 1s and 0s; after a breath the board's strip flares in
    with the act's name, holds about 4 s and fades out blurred; the boss's emote types under its bar; the clock holds; the *Tritone*: a heavy break, then a low G against its
    tritone droning under the strip);
  - connecting to a server: the *Carrier* (a teal line from HOME to its node, the rooms open in a circle from there;
    eased, no black screen, no readout);
  - network map servers: the *Glyph* (each server its kind's glyph, a bar of what's cleared, a ring round a new one);
  - network map ground: the *Chart* (faint crosshairs and hairlines that pan and zoom with the map);
  - rooms map: each room kind its own outline and hue (the *Hues*: magenta elite, orange socket, green rest, gold
    vault, white entry and den), thick borders. The one place a colour means a kind.
  - phone shell (docs/phone-plan.md): five tabs at the bottom (Map, Mail, Loadout, Server, More); in a fight no top
    strip, the HUD as one line (*C*: your bar left, the virus's right with its ◆, its window at the end; the rest in
    the bars' cards; it slides out beside the board in its half, covering no chip),
    two rows of four keys with the menu key at the row's end; on its side, the same shell with a wider board.
- **Rejected looks:**
  - the *View* background behind the monitor; keep the original city, with more detail at the same size;
  - card-first clicks on the rooms map; one click walks;
  - Roomy, the extra monitor size;
  - a count of runners on every server; runners listed in the Online panel;
  - runner standing as pips or as the steps each tier opens; a runner's bar set in their Toolkit or key by key; traits
    as bare icons.
- **The monitor** takes up most of the screen. UI scale is a setting, 100% by default.
- **Ability effects:**
  - short, and drawn over the part's name;
  - played at 1.5× speed;
  - each starts from its ability key, or from the bar when the key isn't visible;
  - a crewmate's starts from their own bar;
  - Firewall plays on your bar.
- **Rested XP** comes only from time logged off. There is no catch-up XP.
- **Unlocks:** cosmetic unlocks (districts, boots, prompts, desk props, mastery looks) come from achievements, not
  from server floors.
- **Phones:** combat on a phone never opens the keyboard.
- **Fights** (docs/puzzle-fights.md): every fight is a little tricky, elites and bosses harder, and the game challenging.
  Puzzles, never walls: hard and rewarding to learn, like Elden Ring. A blind player loses; watching or a correct
  routine wins. Hard means several threats at once, each choice a lesser evil (docs/puzzle-fights.md decision 15);
  about 30% Signal a same-level fight, and gear matters. A boss's signature changes the fight and ties to its lore; shutting a skill off is a side rule at
  most.
- **Act ticks:** every boss's ♛ crosses into its acts at 60% and 30%. Ticks and Integrity stay consistent across
  bosses; a boss whose acts run uneven gets its behaviour or mechanics changed, never its own ticks. The ♛ is attacked
  as part of the normal flow, and attacking only the ♛ is punished. An uneven boss gets more health on its ♛ or a change
  in its own system; bringing parts back only where a boss's system fits it, never on every boss.

## Backlog

- **Enhance, don't add** (the designer, November 2026). In order: the fights (the main loop); then every floor's
  content, its bosses finished (floors 5–8 have none of their own); then itemization on the deeper floors. Every floor
  should have content. New systems (runners R2+, off-map servers, co-op, crises) wait.
