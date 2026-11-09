# Phone plan: a phone UI of its own

P0 picked, P1 (the shell) and P2 (the fight) built. Same game, state and commands on a phone; its own shell and its own markup for the core components.
P0 (prototypes for the designer's pick) comes before any code.

## Where the phone is now

Measured 2026-11-09 in a fight (`?playtest=random&level=12`), Playwright device presets:

| Phone | Screen | Top bar | Dock (prompt and tray) | Fight board on screen at load |
|---|---|---|---|---|
| iPhone SE | 320 × 568 | 152 px | 212 px | 0 px |
| iPhone 13 | 390 × 664 | 152 px | 212 px | 60 px (its header row) |
| Pixel 7 | 412 × 839 | 152 px | 204–212 px | 251 px |

- **Chrome eats the screen.** The top bar is three rows (brand and credits, meters, tabs in two rows of four in a
  fight); the sticky dock is the #net line, the prompt and a 3 × 3 tray. Together 55–64% of a small phone. The board
  sits under the dock: you scroll down to read the parts, then back up to read your bar. At 320 px the keys break
  names mid-word (*Shatt·er*, *Exploi·t*) and the board's header runs *cycle 1* into *+1*.
- **The desktop, squeezed.** 102 width media queries at 25 widths (380 to 1700 px) across 21 stylesheets, layered as
  overrides. A desktop change can break the phone and nothing checks it.
- **The prompt is on every page.** Codex, Settings and Mail carry a `$` field and the #net line on a screen with no
  room for either. On a phone the keyboard is the last resort.
- **Detail is hover-only.** The game's rules live in tooltips; on touch only the board's names, tells and gear chips
  answer a tap. The tray keys, map glyphs, talents and Server rows keep their rules out of reach.
- **Pages are desktop pages stacked.** Loadout → Skills and talents is 2,681 px tall (every subclass tree at once);
  Rig repeats the achievements summary; onboarding tips sit over the content.
- **Four bottom sheets.** The Server panel, the pager's `.pg-pop.sheet`, the Daemons `.dm-panel` and the journal card
  each slide up their own way.
- **Maps zoom by wheel only.** No pinch, no double-tap.
- **Everything loads.** 80 static imports and 21 stylesheets at start (about 4.6 MB of scripts unminified), the
  casing, the window's city, the bench panel and the fx playtest included, though a phone never shows them.

## The shell

- **`dist/form.mjs`**: the one answer to "is this a phone": up to 600 px wide, or up to 500 px tall with a coarse
  pointer (a phone on its side). Sets `<html data-form="phone|desk">` and redraws on a change. It replaces `phoneBar`,
  `portraitQ` and the loose `matchMedia('(max-width: 900px)')` calls in app.js.
- **Markup by form.** The views keep returning strings. Where the phone's layout differs (the top strip, the tab bar,
  the fight HUD, the tray, sheets) render() calls a phone markup function; shared pieces (`keyFace`, `serverIcon`,
  tag lines, rows) are reused. A tap sends the same command a click does, so rules, saves and tests stay as they are.
- **`dist/phone.css`**, every rule under `[data-form=phone]`. As each component moves over, its old `max-width`
  overrides are deleted. 600–900 px (tablets, narrow windows) keeps today's one-column desktop.
- **Tokens:** `--tap` 44 px minimum target, a phone type ramp (body 15 px, nothing under 11 px), `env(safe-area-inset-*)`
  with `viewport-fit=cover`, `100dvh`, `touch-action: manipulation` on controls.
- **Loads less.** Desktop-only modules become dynamic imports a phone never asks for: the casing, the window
  (`window.mjs`), the bench and dev panels, the fx playtest. Rarely opened pages (Codex, achievements, journals)
  load on first open, on both forms.

## The phone kit

| Component | Desktop now | Phone |
|---|---|---|
| **Top strip** | three-row top bar | one 44 px row: Integrity, Signal, credits, the pager's lamp with its count. Handle, class and level move to the player card |
| **Tab bar** | tabs in one or two rows at the top | five slots at the bottom, in thumb reach: Map (the live context in its place while there is one: a fight, a visit, a run, a breach), Mail, Loadout, Server, **More** (Codex, Rig, Settings). A tab hidden on desktop stays hidden |
| **Sheet** | four sheets and many pop-up cards | one component: peek (a line and the main action), half, full; drag down or tap outside to close. Map cards, the room pop-up, the Server panel, Comms, hub windows, the quest window |
| **Tap for info** | hover tooltips | a tap on anything with a rule (a `title` or `data-tt` that isn't a button) shows its card in a peek sheet; a long press on a button (a key, a talent) shows its card without firing. WoW grammar, as on desktop |
| **Prompt** | always under every page | behind a `>_` key (in a fight's tray, in More); opens with the keyboard and the suggestions |
| **Notices** | bottom-right toasts; level-up under the top bar | one slot above the tab bar or tray, never over the board's rows |

## The fight

Budget: on 375 × 667 the whole fight fits with no scroll, and the board gets at least half the screen.

- **No top strip in a fight.** The HUD sits at the top: the virus's bar over yours, name and level over each, its ◆
  and rules or your statuses under them, a crewmate's bar as a thin violet line under yours. The whose-half chip
  (*Your move* / *Its move*) folds into the board's header.
- **The virus picture** sits in a window at the HUD's top right. In its half the whole window (panel, grid, red
  border) slides out to the right of the Now column, where it covers no timeline chip, plays its strike (about 1.3×
  slower than desktop), and slides home; its slot shows a dashed outline meanwhile. Motion off: it stays home.
- **Board:** Now, +1 and +2 as now, names at 24 px with the aim rail inside, chips without icons, rows filling the
  height left.
- **Tray at the bottom:** two rows of four keys (icon over name, 44 px minimum) in thumb reach; the column at the
  row's end is the **menu key** (`···`, the pager's lamp on it), with **+n** under it past eight keys. Tap picks, a
  second tap fires, a long press shows the key's card. The menu opens the tab bar, the pager and the command line.
- **Log:** its latest line as a ticker over the tray, its side's edge in teal or red; a tap opens the log in a sheet.
- **On its side:** the phone shell, board on the left with +3, the strip, ticker and a 2 × 4 tray in a right column.
- **Left out:** the #net line, `>_` in the tray (combat never opens the keyboard).

## The other screens

- **Map:** full bleed between the strip and the tab bar. Pinch and double-tap zoom. The threat rail and contract
  tracker fold into a chip row over the map (a red count, an amber count, a green ✓) that opens them in a sheet. The
  floor picker is a compact segmented row. A server's card is a sheet whose peek is its name, level and **Connect**.
- **Rooms map:** a one-line header (server, Signal, rooms n/N, the hunter's countdown); the map fills the rest
  standing up (as now); one tap walks; the room's decision (**Engage**/**Step back**, **Open**/**Force it**…) comes up
  as a peek sheet with both buttons in thumb reach.
- **Pages** are one column of rows; a row opens a sheet or pushes a sub-page with a back chevron.
  - **Loadout:** its tabs as a segmented row. Skills and talents shows your subclass's tree; the others sit behind
    the subclass picker.
  - **Mail:** the list, then the item pushed full screen with its actions on the floor.
  - **Codex, Collection, Rig, Settings:** list, then detail. Settings hides the desktop-only options (Casing,
    Window, UI scale).
  - **Hubs:** the menu as rows, each window a full sheet; the market's slider at 44 px.
  - **Transmission, Firmware update, scenes:** a full-screen sheet, one at a time, actions on the floor.

## What a phone leaves out

The casing and the window's city (not loaded at all), the dev and bench panels, the traceroute (already hidden),
the map's moving traffic, the always-on prompt and #net line, desktop-only settings, hover previews (the Server
page's first tap previews and the second runs, as now). Hits, damage numbers, the lash and ability effects stay: they
are the fight's feedback.

## Phases

Each lands on its own; the designer plays it on a phone before the next. One session at a time: the shell touches
render(), style.css and the fight board, so no other UI session runs beside it.

| Phase | What | Done when |
|---|---|---|
| **P0 Prototypes** | Scratchpad applets at 375 × 667 with fixture data: the shell (strip, tab bar, More), the fight in the options below, the sheet at its three heights, the map with a peek sheet. Screenshots to the designer | The designer has picked |
| **P1 Shell** (done) | `form.mjs`, `phone.css`, tokens and safe areas, the top strip, the tab bar and More, the prompt behind `>_`, tap for info, the one sheet, lazy desktop-only modules | Every page reachable in two taps; no hover-only rule left on the shell |
| **P2 Fight** (done) | The picked fight layout | The budget above on 320 × 568 and 375 × 667, with a crew |
| **P3 Maps and sheets** | Map, rooms map, map cards, the room pop-up, the Server panel, Comms, the quest window and level-up in the sheet | Each pop-up is the one sheet; the four old sheets are gone |
| **P4 Pages** | Loadout, Mail, Codex and Collection, Rig, Settings, hubs | No page over three screens tall at its default state |
| **P5 Cleanup** | Delete the phone overrides the shell replaced; docs/ui.md's phone rules and GAME_RULES.md's *On a phone* rewritten | style.css has no rule under 600 px |

**Tests:** a `phone.test.mjs` renders each phone view from fixture saves and checks that every action has a
`data-` command (a tap path), every element with a rule is tappable, and nothing on the cut list is in the markup.
Layout budgets are checked with the scratchpad screenshot set each phase.

## Built (P1)

`form.mjs` sets `data-form`; `phone-shell.mjs` draws the tab bar and More; `sheet.mjs` is the one sheet (tap for info and
More use it; the old four move in P3); `phone.css` holds every phone rule. The strip is the desktop's own meters and
pager restyled. Lazy: `window.mjs` (its districts moved to `districts.mjs`), `bench.mjs` (its save keys in
`bench-key.mjs`), the fx playtest. `casing.mjs` stays static: the Rig page's views read it; a phone never wears the
casing. The bench's Dev drawer is hidden on a phone; its commands work at the prompt. Tested by `phone.test.mjs`.

## Built (P2)

All in `phone.css` under `body.ph-fight`, plus app.js `phMenuKey`, `phTicker`, `phStage` and view.mjs `crewLineMarkup`.
The HUD is one line (the designer's pick *C*, 41 px): the bars and their numbers, the rest in their cards (app.js
`phHudCards`). Measured with a crewmate: the board is 379 of 568 px on 320 × 568, 478 of 667 px on 375 × 667, no scroll. A notice
takes the ticker's slot, one line (a tap shows it whole). The Toolkit's key is left out of the tray. The board has no You row (the designer: too busy); the picked key is outlined amber. The virus's window
steps out to the first clear stretch right of Now, top down; with none tall enough it stays home.

## Picked (P0)

Tray: two rows of four. Virus: its window top right, stepping out in its half. Tab bar: Map, Mail, Loadout, Server,
More. On its side: the phone shell, board wider. No top strip in a fight.
