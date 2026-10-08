# BLACKBOX UI system

How the screens are put together, and the rules that keep them consistent. Everything here lives in
`dist/style.css`: the tokens on `:root` at the top, and the shared components in the **UI SYSTEM** block at
the end of the file. Later rules in that block deliberately win over the per-feature rules above them.

The look is an amber CRT terminal: IBM Plex Mono for anything the machine says (labels, numbers, kickers,
logs), a sans (Inter Tight) for prose and names. Square corners, hairlines, no gradients on surfaces, no
emoji markers, nothing centred that is meant to be scanned.

## Colour: one job each

| Token | Job |
| --- | --- |
| `--amber` | structure and interaction (borders you can click, kickers, the prompt) |
| `--hot` | lands this cycle, a breach, a loss, a destructive action |
| `--next` | lands next cycle |
| `--you` (teal) | you: your command, your bars, your level, what is on and yours |
| `--daemon` (violet) | your daemons and your crew acting for you |
| `--gray` / `--dim` | broken, unavailable, small print |

A colour never means two things on one screen. A tag takes the colour of what it labels, not of the card
it sits on.

## Tokens

- **Spacing**: `--s1` 2px, `--s2` 4px, `--s3` 6px, `--s4` 8px, `--s5` 12px, `--s6` 16px, `--s7` 24px.
  Gaps and paddings come from this scale. Inside a row: `--s3`. Between blocks in a card: `--s4` to `--s5`.
  Card padding: 16px 18px.
- **Corners**: `--r-tag` 2px, `--r-btn` 3px, `--r-card` 4px. Nothing rounder, except the preset chips (pills)
  and status lamps (circles).
- **Type roles**: `--kicker` (600 11px mono, `--kicker-track` 1.5px, caps): the line over a block, like a card's
  `h2`. `--label` (600 10px mono, `--label-track` 1px, caps): a row label beside its value, or a stat tile's label.
- **Control heights**: `--h-btn` 32px, `--h-btn-sm` 26px, `--h-chip` 20px.

## Components

**Card** (`.card`): kicker `h2`, then the name `h1`, then content. One border colour (`--line`); an alert card
switches its border and kicker to `--hot`. On a map pop-up the close button is the card's only top-right item.

**Kicker strip**: the tell chip's `.tl-kick`, the level-up's `.lu-head`. A coloured band across the top of a
card or chip, mono caps, an icon on the left and the timing on the right. Use it when the block is an event
with a time attached; don't use it for static cards.

**Labelled rows** (`.op-row`, `.net-row`, `.srv-line`): a fixed label column (`--label` type, `--dim`) and the
value beside it. Every row in a block uses the same label width. This is the pattern for any "what is on this
thing" section (the outpost on the map card, a network's signature, the server card).

**Rows with an icon**: the icon has its own fixed left column on every row, including rows that have nothing
to show there (the mail list puts a neutral dim diamond in that slot: `.mrow-none`). Never let the icon float
in the text.

**Item row with an action** (`.coll li`, `.net-native`): the name over its meta on the left, one small framed
action on the right in its own column. The action never floats over the text.

**Tag line** (`.tagline`): a level, then tags, as a flex row with a gap. Any line that starts with
`levelTag()` and carries tags after it uses `class="tagline"`, so a tag can never butt into the level.

**Tags** (`.tag`): 11px caps mono, 1px border, 2px radius, the colour of what they label (`.hot`, `.you`,
`.warn`, `.dim`, `.daemon`). Tags label; they are not buttons. A tag that opens something should be a button.

**Buttons** (`.btn`): two sizes (`--h-btn`, `.small` = `--h-btn-sm`), inline-flex with a 6px gap so an icon and a
label line up. `.primary` (amber wash) is the one thing the card wants you to do; a card has at most one.
`.hot-btn` (hazard tape on the left edge) is for the one risky choice. A row of actions that may wrap gets
`.row.acts`, so its buttons fill each line edge to edge instead of leaving a ragged line.

**Toggles** (`.settings-grid`): a grid of buttons with `aria-pressed`, each with a lamp (lit amber = on), like the
casing's lamps. On/off is never only a word in the label.

**Stat tiles** (`.stats` > `.stat`): label over value. They wrap and fill their row, so a lone tile never sits
at half width with a gap beside it.

**Tiles** (`.ptile`): daemons, protocols, shop wares. The action row sits on the tile's floor
(`margin-top: auto`), so buttons line up across a row of tiles.

**Hover tips** (`.tt`): every `title` in the game shows in the game's own card (amber top rule, mono title
line). Never rely on the browser's default tooltip.

## Layout rules

- **No sideways scroll, ever.** `.app` clips horizontal overflow (`overflow-x: clip`: no scroll box, sticky and
  fixed children still work). That clip is a safety net for transient effects (a hit's shake), not a fix:
  content must still fit. Grid columns are `minmax(0, 1fr)`; anything with `nowrap` inside a cell also gets
  `min-width: 0` and an ellipsis.
- **Phone (≤ 900px)**: one column. Side windows (a hub's shop or market, the crew column) stack above or below
  their page; nothing is squeezed beside it. The top bar is a grid: brand, pager and credits; Integrity and
  Signal; then the tabs.
- **Narrow columns**: board cells are size containers (`container-type: inline-size`); a chip tightens its
  padding and drops its icon below 132px instead of cutting words off.
- **Map labels**: one label per spot. The crowding pass in `mapMarkup` ranks every labelled node (selected,
  threats, contracts, outposts, then the rest) and hides any label that would overlap a more important one or
  be cut by the scope's edge; it comes back on hover, selection or zoom.
- **Pane titles** (`[ ssh … ]`) sit on a panel's top edge; the page leaves room above so they are never cut.
- **Balance the columns** of a two-column page: the long cards should not all stack on one side.

## Fixes in this pass (before → after)

| # | Where | Before | After |
| --- | --- | --- | --- |
| 1 | Map cards (invasion, rogue, server, fleet…) | Level and tags in a `<p>` with literal spaces: a tag could touch the level | `.tagline` flex row with a gap on every level line |
| 2 | Map | Labels piled on each other (a lead over a server, a swarm's sub-line over a server, two Unknowns stacked) | Every labelled node takes part in the crowding pass; HOME's label is reserved; edge-cut labels wait for hover |
| 3 | Server page, phone | Cards 17px wider than the screen (the Open ports row) | Page grid columns can't be pushed wider than the page; the row wraps |
| 4 | Collection, Network card | "listen" was plain text under the item, or floated over it with a negative margin | Item row with an action column; the action is a small framed button |
| 5 | System → Settings | Fifteen identical buttons, on/off only in the label; the sound test looked the same | A grid of lamp toggles; the sound test is its own block with small keys |
| 6 | Loadout class cards, phone | Two columns; the level tag ran under the Use button | One column; the head sits at the top; Use pinned top right |
| 7 | Loadout key bar | Names cut off ("Rate Limi") | Icon over the name; the name wraps |
| 8 | Ability tray (11+ keys) | Names clipped; each key's text centred at a different height | A size down when crowded; top-aligned; state clamped to three lines |
| 9 | Hub market, phone | The market window squeezed beside the terminal, its Buy column cut off | Hub windows stack above the terminal; phone column widths |
| 10 | Build panel | Building names ran into their role tags; "Build" a large unstyled heading; six cramped columns | Tag drops to its own line when needed; the kicker style; wider cards |
| 11 | Server page | Left column three times the right's height; Uninstall floating mid-row | Running, Install queue and Architecture move to the right; actions top right |
| 12 | Home card on the map | Jack in, then Services + Repair, then Top up alone: ragged | `.row.acts`: each line filled edge to edge |
| 13 | Top bar, phone | Meters in three ragged rows; dividers misaligned | A grid: brand, pager, credits; Integrity, Signal; tabs |
| 14 | Map, phone | The scope squeezed to 236px under the threat rail | The scope keeps 380px under the rail |
| 15 | Fight HUD, phone | Server, status and virus in three cramped columns | Your side and statuses on one row, the virus under them |
| 16 | Paused fight | The PAUSED banner sat on top of "Your move" | It sits in the phase strip's empty right end |
| 17 | Run with a crew, phone | The crew column squeezed the run to a 150px strip that overflowed | The crew column stacks above the page |
| 18 | Fights, phone | A hit's shake and a long chip label widened the page to 510px | `.app` clips; chip labels ellipsize |
| 19 | Tell chips in a narrow board | Kicker and answer cut off; the "→ all" tab clipped | Container query tightens the chip; the tab shows |
| 20 | Mail | Rows with no faction left a hole in the icon column | A neutral mark keeps the column |
| 21 | Error card | Its kicker in the normal muted colour | Alert colour, a hot rule on the trace |
| 22 | Run and hub panes | The `[ ssh … ]` title cut at the top of the page; the fight log's first line cut under its title | Room above the pane; the log fades under its title |
| 23 | Buttons everywhere | Heights from ad hoc paddings (28 to 36px), icon and label misaligned | Two heights, inline-flex, one gap |
| 24 | Stat tiles | Auto-fit grid left a lone tile at half width; labels in sans | Wrap and fill; labels in `--label` type |
| 25 | Hub session, phone | The faction's ASCII mark wrapped into broken lines | The mark never wraps or shrinks; a size down on phones |
| 26 | Fight board, phone | A part's HP overlapped its wrapped name; armor chits ran into the Now column | Name on its own line, armor and HP under it |
| 27 | Attack chips, phone | The damage number cut to "−…" | Tighter chip padding in part rows |
| 28 | Pause banner, phone | Floated over the board's column heads | In the flow, above the phase strip |
| 29 | Disconnect card | Red kicker in an amber frame | The whole card goes hot: frame, corners, glow |
| 30 | Top tabs, phone | With Consortium up, Loadout and System scrolled off screen | A size down when seven tabs show |
| 31 | Map list, phone | Layer, Explored and Status cut off; rows of different heights | Two lines per row: name, family, level; then progress and status |
| 32 | Network natives | Three cramped columns broke names onto two lines beside "listen" | Wider columns |
| 33 | Settings, desktop | "Speed: relaxed (12s per cycle)" ran out of its cell | Speed spans two cells; labels ellipsize |

## Rules for future UI work

1. Use the tokens. A new padding or gap comes from the spacing scale; a new label uses `--label` or `--kicker`.
2. Reach for an existing component before writing a new one: card, labelled rows, item row with action,
   tag line, tiles, `.row.acts`, toggles.
3. Icons live in a fixed left column. If some rows have no icon, keep the column with a neutral mark.
4. Anything that can wrap must look right wrapped: test the phone width (390px) and a crew fight (narrow board).
5. One primary button per card. Risky actions use `.hot-btn`. Tags never act as buttons.
6. Every hover explanation goes through `title` (the themed `.tt` shows it), never a browser default.
7. Don't centre text that people scan; centre only single numbers and banners.
8. No new colours. If something needs a colour, it is one of the jobs in the table above.
9. Check with screenshots at 1440 and 390 wide, with no horizontal overflow and no page errors.
