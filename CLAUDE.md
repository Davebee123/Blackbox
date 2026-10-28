# Working on BLACKBOX

A browser hacking game: `dist/` is the game (plain ES modules, no build), `*.test.mjs` the tests, GAME_RULES.md the
rules as built, README.md the code map, `docs/` the design docs (docs/style-guide.md and docs/ui.md for the look).

## Workflow

- **Tests.** `npm test` before every commit. It runs every fast test file, and a slow balance simulation only when
  something it loads changed (scripts/test.mjs; `npm run test:plan` says what runs and why). It takes about a minute.
  Run `npm run test:full` (about 13 minutes) before pushing a batch that touches combat, balance, progression or
  loot, and once after merging agents' branches. Commit or push only on `# fail 0`. The two balance TODO tests in
  the full suite are expected. When reading a test log, grep for its totals and its `not ok` lines; never read the
  whole log.
- **Docs.** Keep GAME_RULES.md and README.md in sync with the code and with each other, in the same commit.
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

## Decisions so far (don't undo these without asking)

- **Picked looks:**
  - quest window: the *Transmission*;
  - level-up: the *Firmware update*;
  - pager: the *Tray*;
  - player card: the *NET ID badge*.
- **Rejected looks:**
  - the *View* background behind the monitor; keep the original city, with more detail at the same size;
  - card-first clicks on the rooms map; one click walks;
  - Roomy, the extra monitor size.
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
  routine wins.

## Backlog

- **Backlog:** Silos, more event cards, a death recap on the Disconnected card, parts plan P3 and P4, and co-op's
  rough edges.
