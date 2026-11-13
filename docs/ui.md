# BLACKBOX UI system

How the screens are put together, and the rules that keep them consistent. Everything here lives in
`dist/style.css`: the tokens on `:root` at the top, and the shared components in the **UI SYSTEM** block at
the end of the file. Later rules in that block deliberately win over the per-feature rules above them. The rules the
player meets are in GAME_RULES.md (*The screen*); the voice is docs/style-guide.md.

The look is an amber CRT terminal: IBM Plex Mono for anything the machine says (labels, numbers, kickers,
logs), a sans (Inter Tight) for prose and names. Square corners, hairlines, no gradients on surfaces, no
emoji markers, nothing centred that is meant to be scanned.

## Colour: one job each

| Token | Job |
| --- | --- |
| `--amber` | the structure colour (kickers, borders you can click, the prompt) and loot and what you use (a cache, the vault, a reward, an earned achievement) |
| `--hot` | threat: lands this cycle, a breach, a loss, a destructive action |
| `--next` | lands next cycle |
| `--you` (teal) | only ever you: your command, your bars, your level, what is on and yours |
| `--daemon` (violet) | your daemons and your crew acting for you |
| `--exception` (orchid) | a part your program leaves to you (*EXCEPTION · no available handler*): its row, the Now cell, the log line, a boss fight's header |
| `--steel` | armor and what protects a virus part: a hit on ◆, a Mutex's lock, a Lockbox's cap, the tethers between parts |
| `--gray` / `--dim` | broken, unavailable, small print |
| `--ready` (green) | done and waiting on you: a contract to turn in (the map's tracker) |
| `--backup` (ivory) | the Backup objective's process: its row, its segmented bar, the stripe and disk on an attack coming for it |
| `--r-set` (set green) | a set (sets.mjs): its name, its lit pieces and bonuses, in tooltips, the Loadout's Set bonuses and the Collection. It sits with the rarity colours (`--r-stock` … `--r-indemnified`, D2's white, blue, yellow, gold and orange), warmed to the amber screen (`#b6cf55`). A set piece shows in it too: its name, card, tile and glyph (gear.mjs `shownRarity`). |

A colour never means two things on one screen. A tag takes the colour of what it labels, not of the card it sits on.
Signs, lamps and cosmetics outside the glass (the window, the casing) use amber, peach, rose and pale white: never
teal, violet or a threat's red.

## Tokens

- **Spacing**: `--s1` 2px, `--s2` 4px, `--s3` 6px, `--s4` 8px, `--s5` 12px, `--s6` 16px, `--s7` 24px.
  Inside a row: `--s3`. Between blocks in a card: `--s4` to `--s5`. Card padding: 16px 18px.
- **Corners**: `--r-tag` 2px, `--r-btn` 3px, `--r-card` 4px. Nothing rounder, except the preset chips (pills)
  and status lamps (circles).
- **Type roles**: `--kicker` (600 11px mono, `--kicker-track` 1.5px, caps): the line over a block. `--label` (600 10px
  mono, `--label-track` 1px, caps): a row label beside its value, or a stat tile's label.
- **Control heights**: `--h-btn` 32px, `--h-btn-sm` 26px, `--h-chip` 20px.

## Components

- **Card** (`.card`): kicker `h2`, then the name `h1`, then content; one border colour (`--line`); an alert card turns
  its border and kicker `--hot`. On a map pop-up the close button is the card's only top-right item.
- **Kicker strip** (`.tl-kick`, `.lu-b-head`): a coloured band across the top of a card or chip, mono caps, an icon left
  and the timing right. Only for a block that is an event with a time attached.
- **Event cards** (`.evc`, `event-cards.mjs`): a kicker strip (icon and name in event violet, a ring that drains with
  the time left), then a picture with its action built in, always a real button: a target tile (a courier, a bounty
  poster, a boss frame), a feud's two faction halves over its bar, a price tile, a price tag. Rewards are an icon and a
  number. The card's sentence is the strip's tooltip. Motion is locked to the clock (`--ph`) so a redraw never restarts
  it. The map pop-up widens to 376px while it holds one.
- **Contract tracker** (`.ctrack`, `view.mjs` `contractTracker`): under the threat rail; an icon column, who it's for over
  the name, the progress in amber (its few words, *3/5 viruses killed*; past 10 a bar
  with *n/N*); a done one has a green border and **Turn in**. A row is a
  button (`data-locate`, `data-go` to Mail, or a done one's `mail deliver`); its tooltip shows the pay as icon chips. No teal.
- **Labelled rows** (`.op-row`, `.net-row`, `.srv-line`): a fixed label column (`--label`, `--dim`) and the value
  beside it, every row in a block at one label width.
- **Rows with an icon:** the icon has its own fixed left column on every row; a row with nothing to show keeps the slot
  with a neutral dim mark (`.mrow-none`).
- **Item row with an action** (`.coll li`, `.net-native`): the name over its meta, one small framed action in its own
  column on the right.
- **Tag line** (`.tagline`): a level, then tags, as a flex row with a gap.
- **Tags** (`.tag`): 11px caps mono, 1px border, the colour of what they label (`.hot`, `.you`, `.warn`, `.dim`,
  `.daemon`). Tags label; a tag that opens something should be a button.
- **Buttons** (`.btn`): two heights, inline-flex with a 6px gap. `.primary` (amber wash) is the one thing the card wants
  you to do; `.hot-btn` (hazard tape on the left edge) the one risky choice. A row that may wrap gets `.row.acts`.
- **Toggles** (`.settings-grid`): buttons with `aria-pressed`, each with a lamp (lit amber = on). On/off is never only a
  word.
- **Stat tiles** (`.stats` > `.stat`): label over value; they wrap and fill their row.
- **Tiles** (`.ptile`): daemons, protocols, shop wares; the action row sits on the tile's floor.
- **Hover tips** (`.tt`): every `title` shows in the game's own card (amber top rule, mono title line); never the
  browser's default.
- **Card and detail panel** (the Server page): a card of picks (names and state only) beside one sticky panel that
  explains the picked, hovered or focused item, the only place its facts are lit. On a phone the panel is in the one
  sheet. Skills and talents is a card alone (`.cls`, docs/class-page.md): its rules are tooltips.
- **Tethers** (`.tether`, `view.mjs` `tethers`, `fightread.mjs` `partLinks`): one look for every rule that reaches from
  one part to another. A steel bracket in the board's left gutter from the part the rule sits on (a square) to the part
  it reaches (an arrow), drawn a piece per row; a round node mid-span carries the rule's icon, or **?** until the codex
  knows the part; a rule counting down shows a clock chip with the cycles left in its place, centered on the line. Two
  arrows into one part sit a little above and below its middle, and share a lane when one comes from above and one
  from below. It glows while the rule holds, goes dashed while
  it's down, and snaps as its part dissolves; hovering it lights both rows. The gutter (`--gut`: 38px, 56px with one
  lane, 68px with two) stays to the end of the fight. On the bar a Mutex's lock is an absorb segment (`.lockseg`,
  hatched steel with a padlock) and a Lockbox's ward a cap line (`.wardcap`).
- **Part research** (`codex-view.mjs` researchBar): a thin bar of 60 with ticks at 3, 15 and 60 and *n/60* beside it;
  what a tier still hides reads **???** with what unlocks it in `--dim`. A mastered part carries the **mastered mark**
  (`.pmast`), a small star in `--amber-soft`, never teal.
- **The Daemons tab** (`daemons-view.mjs`): rows with the sprite in a fixed left column; a cycle bar lights a cell
  (violet) where a daemon acts and a short teal bar for your command; a trigger is a dashed lane.
- **Achievements** (`achievements-view.mjs`): categories down a fixed left column, rows with the points on a medal, the
  reward shown as itself, earned rows lit amber (loot), the rest muted. No teal.

## The fight board

- **The HUD**, left to right: your Signal (your server at home) with your crew's bars under it; **Status**, everything on
  you, names in their colours (teal yours, red against you, violet helpers), each with its rule on hover; under it
  **Gear**, a chip for each equipped rule that waits on a condition (`fightread.mjs` gearLive), lit teal while it holds,
  struck through once a once-a-fight one is spent; and the virus, its name and level over its bar, its tags and the
  rules' chips under it.
- **Whose half.** A strip names it (`YOUR MOVE`, `YOU`, then the virus's name); the virus's half turns the board red
  (a faint wash and border) for about 1.3 s, and the prompt reads `<VIRUS> acts…`. The *You* row shows your queued
  command; the Now column is a band with a playhead that turns red 1.5 s before the cycle ends. A faint dot grid (12 px) sits behind the board.
- **Who's aiming where:** round initials in a rail down each row's left edge (yours teal, a crewmate's violet). While
  you type a command that names a part, your avatar moves there first (dashed if it would go through, red if not).
- **Previews:** before a cycle resolves, every bar shows what it's about to lose as a blinking white slice (the chits
  about to break blink too), following what you're typing. Timeline chips name the attack, or a three-letter code where
  the name won't fit (Surge → SRG), never an ellipsis.
- **Themed chips** (chipfx.mjs `CHIP_THEMES`; each theme in docs/chip-themes.md): a part with a theme plays it faint
  inside its own chips, under the text, in the chip's colour and white: nothing at +2 and +3, faint at +1, stronger in
  Now and its last 1.5 s. When it goes off (`chipStrike`: at its own hit, a step before the board turns for all but
  the last; its number waits for the impact), its strike flies from the chip into your bar in the threat's
  red (a replicate's into the new fragment's bar), in place of the chip's ghost (beside it for the frost), and its hit
  throws no lash. A replicate that fizzles plays out in place. A packed part shows none.
  Screen effects off, Motion off or reduced motion: none; subtle: fainter.
- **Hits land on the thing hit** (hitfx.mjs): the part's cell flashes and a burst of 1s and 0s flies out (amber yours,
  violet a crewmate's); a crit bursts gold-white; a hit spent on ◆ floats *◆ ABSORBED* in steel; a miss stamps MISS. A
  status on you shows big, then flies into the Status column. A broken part dissolves into rising 1s and 0s.
- **Ability effects** (abilityfx.mjs, abilityfx-table.mjs, abilitylight.mjs): each ability plays its own short effect,
  at 1.5× its recipe's speed (none outlasts 0.8 s), in teal (a crit gold-white, a hit on ◆ steel, a crewmate's violet),
  drawn over the part's name. It starts from its key in the tray however it was fired, or from your bar when the key
  isn't on screen; a crewmate's from their own bar. A heal or shield travels to your bar (Firewall's bricks play on your
  bar). The damage numbers wait for it to land and show at contact, the hold following (as a hit-stop does). It never
  stops over a key's label, your bar's numbers or the crew's names, has no background and takes no input. A part
  whose name is out of sight (under the phone's dock or a toast, or off the screen) gets the plain strike instead.
  - **The look** (the *Glyph + light*): the ASCII piece is what you throw, with afterimages in flight, white-hot where
    it hits. What it does there is light, as the telegraphs are: a flash, a shock ring along the bar, cracks, spark
    streaks, flames, ripples; a comet carries an effect to where it plays. 1s and 0s, ◇ shards and + stay characters.
  - **What the hit says:** a hit that makes contact holds there a moment, longer the bigger it is (`stopOf`). A crit
    draws back and glints first, then cracks the bar end to end. A hit on ◆ lands on the ◆, clangs in steel and
    glances off; the bar is untouched, and each ◆ broken takes a steel strike of its own. A miss goes on through and
    nothing lands (MISS still stamps). Every motion reads it: a flown piece draws back on a crit; marks, clamps, cuts,
    blasts and a burn being set make contact where they land; a wave or helpers go on past on a miss; an effect on every
    part shows each part's own result (combat events by target).
  - **An ability's own rule:** Overload's bolt crackles at its key, holds lit through the hit-stop and flickers out; a
    miss grounds past the bar, ◆ throws a steel arc, and a crit (its cooldown resets) runs back to the key as a gold
    comet. Crack lands on the ◆ row and strikes each ◆ it broke a beat apart (combat.mjs `broke`), glancing off when
    none are left. Rate Limit's brackets snap onto the attack it throttles; on a miss the halves pass each other.
    What spreads jumps on to every other part as a spark, nearest first (Shatter's shards in steel; Propagate sets each
    part burning as it lands). What stops an attack (SIGINT, Suspend, Jam, Blackhole) pulls a line tight through its
    chip. A heal runs a light along your bar (Reclaim's comes back from the part first). Fork Bomb strikes each ◆ it
    broke on every part (a strip's `broke`).
  - **A status cashing in** (combat.mjs damage `marks`): Exposed's crosshair flies off its mark and closes on a crit;
    Quarantined's brackets snap onto the name; Hooked's line pulls tight as its +6 lands; Tagged burns taller. The mark
    glows.
  - **Each class's rhythm** (`CADENCE`, by the skill's class): the Breaker winds up and stops dead; the Bastion's piece
    stays up a beat once it lands; the Infiltrator's goes in quick and its impact spreads after; the Operator's lands in
    three small even beats. On your bar only the rhythm shows: the Breaker's stamp slams down, its shell shuts harder,
    its sweep winds up.
  - **A burn runs down** (combat.mjs tick `left`): each tick's fire stands lower than the last, the last one gutters to
    falling embers, and Keepalive stokes it up.
  - **Mastery tiers** (`tierRecipe`): tier 2 more particles and a spark burst, tier 3 a glint and each iconic skill's own
    flourish; a crewmate's always plays tier 1. The hit that breaks a part plays its effect like any other; the part
    then dissolves into 1s and 0s, the fight-winning one in slow motion. Subtle and medium drop the afterimages, the
    swing's fan and the cracks; the result's timing and a status cashing in show on both. `?playtest=fx` reviews them all, by result, status and ticks left.
- **Damage numbers** (dmgfx.mjs): every source its own number with an icon (a hit, a crit, a burn, a helper or daemon,
  a reflect, a shield's soak, a heal, encryption, an interrupt, a virus's claw), landing one after another in the
  order they resolved (0.45 s apart for two, faster for more, a batch never over 2.2 s), the bars dropping with each.
- **The lash** (lash.mjs): a virus attack throws a whip of the attacking part's characters into your Signal bar, which
  flares and splits its colours (it never moves); bigger hits and charges whip harder; encryption scrambles hex across
  your bar. About half a second.
- **The tray:** a key is its icon and name, one height and padding (view.mjs `keyFace`); the rest is its tooltip, with
  what holds now as coloured lines under the kind (`data-tt-state`). A charge bar on every key (full amber when ready);
  on cooldown striped, with the count over the dimmed icon; a key off cooldown flashes once; a steel icon when armor
  would take the hit.
- **How much moves** follows Screen effects: subtle and medium show the number, the bar and the strike (a crewmate's
  quieter); bold adds impact bursts, sparks and row flashes; off shows numbers and bars only, a soft red edge when you're
  hit, and a cycle's numbers stacked at once. Two things move the screen: an attack that hurts you shakes it as its
  number lands (`shakeOf`: harder for a bigger hit, a crit or a charge; half on subtle and medium), and the hit that wins
  the fight plays in slow motion (`slowAt`: a quarter speed, back to full in about half a second). Nothing else moves;
  flashes keep their light and lose their movement.
- **On a phone** the board shows Now, +1 and +2, chips drop their icon, and a part's name sits on its own line.

## Feedback language

Every kind of event has one signature: a flash on the thing it happened to, a floating number, an optional sound and a
short vibration on phones that have it.

| Event | Signature |
|---|---|
| You hit a part | its row flashes gold, damage floats up, a punch with a sub thump |
| You break an armor chit | −◆ floats up, a clink of plate; a bare part shows faint cracks until it patches |
| A part patches a chit | its row pulses red, +◆, a rising re-lock |
| A part breaks | a bright flash, BROKEN, metal giving way, glass scattering |
| You get hit | the lash into your bar, a heavy body blow |
| A delay | the row glows teal, DELAYED; an attack already delayed keeps a teal pause mark |
| A cycle ends | the timeline turns over (chips slide a column left), the Now band flashes, a clock-relay tick |
| A contested or breached wall bites | the Integrity meter flashes red with the amount |
| Connect or jack in / jack out | a teal flash, a glitch and a modem handshake / a relay letting go |
| Typing | a mechanical key per keystroke, a heavier Enter |
| A daemon acts | your row glows violet, a soft tick |
| A skill lights up | its key glows and pulses, a soft chime |
| Command refused | the prompt's box lights red, a buzz |
| Win / crash | a big flash / a red screen edge, a long buzz |

## The pages, at a glance

- **The top bar:** the pages on the left; in the middle your handle · class · level with the class's XP as a thin bar;
  on the right the people button, the pager, then Integrity (a server tower that drains), Signal (five bars) and
  credits, each with its **+**. At 1440 with the casing the pager's tray tightens so the class name keeps its place.
- **The map** shows one floor at a time. A server (the *Glyph*, `view.mjs` serverIcon) is its kind's glyph on a dark
  plate, a bar under it filling as you clear it, and a ring round one you haven't been into, a pulse going out from it;
  amber, gray when done, teal where you are and what's yours, yellow for a contract's. Its kind's rule is the glyph's
  tooltip; the server card's kind tag carries the same glyph and tooltip. Under its name, the level in WoW colours (the name's size) and its specials' glyphs. Servers that ask
  nothing of you draw dim without labels until hovered, selected or zoomed. The ground is the *Chart*: a faint crosshair
  every 60 map units with hairlines between, drawn in the map so it pans and zooms with it (dimmer on a desktop; cells
  double on a phone's small map), over the floor's own backdrop. Labels never overlap: the more
  important one keeps its label (selected, then threats, then where you are, then a contract or fresh find). Scroll
  zooms (up to 5×), drag pans, double-click or ⤢ fits. A **Show** picker (**Mine**, **Targets**, **Threats**) dims the
  rest. **Map · List** toggles a sortable list of every server (name, family, level, floor, explored, status), then hubs
  and leads, each with a **locate** button.
- **The class picker** (`view.mjs` classPickMarkup, app.js pickClass): four translucent squares (emblem, name, roles).
  The picked one opens a drawer from its side (Traits, Starts with, Subclass; rules in tooltips) and the rest narrow to
  strips (small emblem, name up the side). Its border plays its class, always amber: Breaker cracks and shatters,
  Bastion deflects shots off a standing barrier, Infiltrator dims to one light tracing the edge, Operator circles three
  processes. Start is a lit command line, the class typed in. A phone stacks rows that open downward. No slogans.
- **The threat rail** (down the map's left): everything coming for you, hottest first, then soonest; red for what's
  hitting you, amber for what's on its way. Under it the contract tracker.
- **Map cards** pop up beside the node you click (never over it): the server card (level, Integrity, the wall as one
  line each), a hub, an invasion. `×`, Esc or a click on empty map closes them. **Traffic:** your market orders run as
  teal files between home and the hub, hub trade in the sender's colour; hover any moving file for its card.
- **The room map** (*Schematic HD*, floorplan-view.mjs, floorplan.css): each room a **chip** (cut corners, a depth
  gradient, its line icon over a name plate, its address in a dim plate on its bottom edge); teal only for your chip
  (a pulsing outline, a *YOU* tab). Red a live threat, amber loot and what you use, gray cleared; an unknown room a
  dashed ghost with a ?. Badges: a red live light, the step's Signal cost, a respawn ring with its m:ss, and tags (KEY,
  LOCKED, KEY FITS, SEALED, ★, WAKES). Links are traces, the ones out of your room flowing amber. Your step travels its
  trace as teal 1s and 0s and a scan line runs down the chip you enter (travelfx.mjs, about two thirds of a second,
  never holding a click); the hunter's step travels in red. Faint gray packets cross discovered traces (traffic.mjs,
  three at most, each server kind its own). The **traceroute** at the map's foot lists the last three hops with their
  milliseconds (red near the hunter; hidden on a phone). Notices pop up in the bottom-right corner for a few seconds,
  clicks going through. The pop-up card opens by itself when the room wants a decision (**Engage**/**Step back**,
  **Fight it**/**Slip past**, **Take it**/**Leave it**, **Open**/**Force it**, **Rest**), never covers its room and
  stays on screen at phone width. On a phone the map stands up, the spine top to bottom. With Screen effects off, Motion
  off or reduced motion nothing on it moves.
- **Puzzle boards** are drawn like the room map (chips and traces): the worm and the Tracker red, firewalls steel, data
  nodes and caches gold, you teal. A board boots in with a line, each action has its own small animation and sound, and
  the end is a card like a reward's. Motion off: the board just changes.
- **The Server page** (`server-view.mjs`, `server.css`): one card and a detail panel (in the one sheet on a phone). The
  card's header draws your firewall as a ring of sixteen blocks round your server's core (whole blocks solid teal,
  fragmented ones hollow, an amber arc while an invasion is at the wall, a red marker coming down its road), the
  Integrity ring inside. Then quiet rows: Threat, Wall (level, tier pips, the readout), Filters, Code. Pointing at a
  button that changes the wall shows before and after, run on a copy of the save.
- **The wall's ruler:** each level a cell, teal for what it blocks, amber contested, red hatching what breaks through,
  your server and the incoming invasion marked.
- **The quest window** (the *Transmission*, quest-view.mjs): a thread or floor job read as an intercepted message,
  the speaker's backlit ASCII portrait beside their lines (portraits.mjs, scanning in a row at a time, once), its opening line resolving out of noise once, its steps as a job (`job 0003`, ✓, ▸, the rest dim hex). The reward
  card is a signed receipt. Calm: lines arrive once, Mail's page never animates.
- **The level-up** (the *Firmware update*, levelup-view.mjs): an amber *Firmware update · <class>.rom* strip, the
  level in teal dot-font digits, `[ OK ]` a row at a time with a tick each; it waits for a calm moment. It powers on
  to its sound (the lift): the strip flickers on, the bar climbs with the hum, the new level snaps in at the lock.
- **The pager** (the *Tray*): a lamp and one icon per page (up to four on a desktop, three on a phone, then **+n**),
  amber, red for a threat, a soft glow on one you haven't seen; its tooltip is the line and, muted, ▸ what the tap does.
- **The player card** (the *NET ID badge*, profile-view.mjs): an amber NET ID strip, the banner framed as a photo
  (teal corners), the handle large in teal, the title amber, the plan a quiet italic quote, sections on one column,
  a bar code at the foot.
- **Paused** is a strip across the top of the board (*PAUSED · any order resumes*). **The crew column** sits on the
  left of every page while you have a crew; it outlines red when they're hit, never shakes.
- **A page that fails to draw** shows a red card with the error and a Back to the map button.

## Layout rules

- **No sideways scroll, ever.** `.app` clips horizontal overflow (`overflow-x: clip`); that's a safety net, not a fix:
  content must still fit. Grid columns are `minmax(0, 1fr)`; a `nowrap` inside a cell also gets `min-width: 0` and an
  ellipsis.
- **Phone (≤ 900px)**: one column (its own shell is planned: docs/phone-plan.md). Side windows (a hub's shop or market, the crew column) stack above or below their
  page. The top bar is a grid: brand, pager and credits; Integrity and Signal; then the tabs (two rows of four when
  eight show).
- **Narrow columns**: board cells are size containers; a chip tightens and drops its icon below 132px instead of
  cutting words.
- **Map labels**: one label per spot. The crowding pass in `mapMarkup` ranks every labelled node (selected, threats,
  contracts, then the rest) and tries each side of its node (outward first, then right, left, under, over); it hides
  a label only when every side would meet a more important label, another node or the edge. A label's gap and line
  spacing are in ems, so it hugs its node at any zoom; a halo in the map's ground keeps links out of the words.
- **Pane titles** (`[ ssh … ]`) sit on a panel's top edge; the page leaves room above them.
- **Balance the columns** of a two-column page.
- **UI scale** (uiscale.mjs) scales the screen as a whole, tooltips and pop-ups included, only while it stays 1700px
  wide in its own pixels.

## Screen effects (screenfx.mjs, screenfx.css)

The designer's rules for anything that sets a mood: **everything is light on glass**, and **nothing interferes with the
interface**. CSS, the DOM and text only (no canvas, WebGL or PixiJS on the screen).

- An effect lives behind or around the interface: the backdrop (`#fx-back`, z-index −1 inside `.app`, carrying the
  screen's own background), the tube's edge (`#crt-bezel`), the casing's lamps, and the virus picture (`#virus-canvas`,
  a crit's tear through the `#sfx-tear-a/b` SVG filters). `screenfx.test.mjs` fails on any rule that styles anything
  else.
- Text, numbers, bars, chips and the board never move, dim, blur or get covered; no effect shifts layout or takes a
  click. A big hit tears the backdrop, not `.app`. Flashes on the interface keep their light and never translate.
- Your health shows only on the screen's edge: under half a faint warm line (medium, bold), under a quarter a thin red
  burning into grey haze, breathing (subtle: still).
- Strength is one setting, off / subtle / medium (default) / bold, as `--sfx-k` on `<html data-sfx>`, each effect
  switchable on its own; it also sets how much moves on the fight board. Motion off (`.no-motion`) and
  `prefers-reduced-motion` stop every animation in the file.
- **The strike** (virus-art.mjs, `#art-out`), asked for by the designer: an attacking part comes out of the render's
  window, nearer and bigger, over the page for about half a second, and back. Every body moves its core and its limbs
  differently (`STRIKE_OF`, fourteen moves in `STRIKES`): claws snap, tails and shackles lash, heads dart or slam,
  roots and legs stab or rake, nodes and cells blink to the glass, cores throb at you, cells swarm; and some stay put
  and throw something instead: rings, sparks, a spill of packets, clumps of characters, a sweeping beam. The body
  never leaves its window. No input; Screen effects off or Motion off: none.
- **Boss bodies** (boss-art.mjs): every boss wears a model of its own, built from what its fight is about (a rotor
  and a Gavel, a tunnel of frames, three domed towers). Wide and bold, to fill the window; a boss faces you, swinging
  side to side, and a part that strikes swells out from where it stands.
- **A broken part** dissolves into drifting 1s and 0s inside the render; on the board its row flickers out into a block
  of 1s and 0s, its name and health breaking up letter by letter, which drift up and fade (hitfx.mjs).
- **The fight boot** (bootfx.mjs, bootfx.css) is another effect on the panels, approved by the designer (*Centre stage*).
  The first time you see a fight: brackets lock on its room (from the rooms page), the tube goes dark with a red edge,
  the virus comes up alone at the centre, decoding out of red noise, and drops into its panel; a boot console types
  your bar, class, keys and the virus where the board will be; your panels come up. About two seconds; any key or
  click ends it and still acts. Leaving a won fight (*Channel cut*): the page folds to a teal line and a dot, the next
  page opens out of it and your room rings teal, under 0.9 s. Connecting to a server (*Carrier*): a teal line runs
  from HOME to its node, the node pings, and the rooms open in a circle from there, the map dimming behind the edge;
  the entry rings teal. Eased, no black, no text, chrome lit; 1.7 s (1.3 s with no HOME on the map). Jacking out
  (*Hang-up*): your room locks teal, the rooms go dark toward it, the hang-up readout, then the map with the server's
  node ringed; 1.7 s. **No flash, no blink** (the designer): in the boot and the hang-up a panel only brightens or only
  dims, in held steps; chrome dims to 15%, never out (bootfx.test.mjs). Any key or click ends each. Screen effects off or Motion off: none of them.
- **Floor palettes** are the one exception to *No new colours*, approved by the designer. A floor swaps the surface
  tokens (`--bg`, `--panel`, `--panel-2`, `--inset`), the structure colour (`--amber` and its forms) and the text tints
  inline on `<html>`; the job colours (`--hot`, `--next`, `--you`, `--daemon`, `--exception`, `--steel`, `--gray`) never
  change. At medium and bold the accent tints the panels (3.5%, 6%). Each tint keeps 4.5:1 on every surface (body text
  7:1), checked in `screenfx.test.mjs`. Hues sit away from the job colours.

| Floor | Structure | bg / panel (subtle) | Texture | dim, worst surface (subtle to bold) |
| --- | --- | --- | --- | --- |
| The Sprawl | `#f4b437` warm amber | `#0a0603` / `#110b05` | haze | 4.8 to 4.6 |
| Backhaul | `#f3a33a` sodium | `#0b0602` / `#130b04` | sodium lamp light | 4.8 to 4.7 |
| The Stacks | `#a9c48a` dusty green | `#050804` / `#0a0f08` | dust | 5.2 to 5.0 |
| Coldline | `#cfe9f7` ice | `#02060a` / `#060e14` | frost at the edges | 5.4 to 5.2 |
| Deep Core | `#f07ac8` magenta | `#0a0308` / `#12060f` | heat shimmer | 4.7 to 4.6 |
| Kernel Space | `#f4f4f4` white | `#000000` / `#0a0a0a` | dot matrix | 5.4 to 5.0 |
| The Sink | `#e09a94` blood rose | `#0a0303` / `#130606` | drips | 4.9 to 4.8 |
| Bedrock | `#cfc7b4` stone | `#080807` / `#0f0f0d` | heavy static | 4.9 to 4.6 |

## The stage

- **The floor's place** (stage.mjs) is drawn inside the virus picture (`#virus-canvas`), never behind the board: in
  characters on the virus's own grid, in the floor's structure colour, faint (mean alpha under 0.3). Its still part is
  cached; only what moves is drawn each frame. The render's label names the floor (`[ coldline/render ]`).
- **It acts on the virus, not the board:** light (brightness only), camera, entrance, a broken part's bits, a
  reflection where there is water. The board's chips and telegraphs keep their look on every floor; only how a chip
  comes in changes (boardfx.mjs: typed on the old ledgers, flipped on the departure boards).
- **The fight log** folds to its newest line by default (`▴ N` opens it), so the picture takes the room.
- Prototyped first (picked by the designer, November 2026): *Place* over *Era* for the picture, the era kept for the
  theme's sound.

## The casing and the window

- **The monitor casing** (immersive shell, desktop): BLACKBOX · MODEL 7, two knobs (sound, speed) and labelled lamps
  (PWR, GATE, WALL, NET, INST, DMN) that glow with real state and blink at medium and bold.
- **Casing cosmetics** (`casing.mjs`, `casing.css`): only the casing changes, never the screen. A colourway sets only
  `--case-*` variables, each read in style.css with the stock colour as its fallback, and fills the bezel's frame with
  the glass cut out exactly. Stickers sit anywhere on the plastic (the top, a side, where they read upward, or the
  chin, a little crooked), over each other but never over the glass, the knobs, the plate or the lamps; they drag only
  while Rig → Casing is open. Props stand on top of the monitor (with the window, when there is room over it), on the
  desk under it, or on the chin without the window, still but for the mug's steam. `casing.test.mjs` holds them to the
  plastic.
- **The window behind the monitor** (`window.mjs`): a canvas of the original city behind the page (`.window-out`,
  z-index −2, no pointer events), with the casing and the Window on at 1700px and wider, painted only in the strips
  beside and above the monitor and the desk. Four depths with atmospheric perspective, the near tower's face in detail,
  vertical signs with their light on the wall; the sky follows the clock (night is the original), the weather turns
  every five minutes. Each district (the rail yards, the server towers, the harbour, the rooftops) is the same engine.
  About 20 frames a second, every still layer drawn once; the loop stops with Motion off, reduced motion or a hidden
  tab. `window.test.mjs` holds its show rule, weather, hours, colours and loop.

## Rules for future UI work

- **Show it, don't explain it** (docs/style-guide.md section 0). Cards are icons, numbers, bars, pips and states;
  explanations go in tooltips, never a paragraph on the card.
- **Tooltips read like World of Warcraft's** (below): the name is the title, the mechanics come first, the answer sits
  on its own muted line.

1. Use the tokens. A new padding or gap comes from the spacing scale; a new label uses `--label` or `--kicker`.
2. Reach for an existing component before writing a new one.
3. Icons live in a fixed left column. If some rows have no icon, keep the column with a neutral mark.
4. Anything that can wrap must look right wrapped: test the phone width (390px) and a crew fight (narrow board).
5. One primary button per card. Risky actions use `.hot-btn`. Tags never act as buttons.
6. Every hover explanation goes through `title` (the themed `.tt` shows it). Icons it can't carry (pay, costs) go in a
   `<template class="tt-more">` inside the element, drawn as chips above the answer line.
7. Don't centre text that people scan; centre only single numbers and banners.
8. No new colours. If something needs a colour, it is one of the jobs above (a floor's palette recolours the structure
   and surfaces, never a job).
9. Check with screenshots at 1440 and 390 wide, with no horizontal overflow and no page errors.

## Tooltip style (WoW grammar)

Every tooltip and Codex card that describes a virus's part, tell, mutation or rule reads like a World of Warcraft
ability or creature tooltip. `partRead` and `tellTip` (fightread.mjs), the genes' `does` and `answer` (genes.mjs), the
strains' and ICE's `rule` and `answer` (data.mjs), and the server, site and quirk rules follow it; `style.test.mjs` scans
them. docs/style-guide.md section 2 has the grammar for skills, items and the rest.

1. **The name is the title** (`ttShow` bolds `Name: rest`); the body never repeats it.
2. **Mechanics first,** in short present-tense sentences with numerals: *Deals 28 damage to you every 5 cycles.*
3. **Lead with the verb or the effect:** *Deals…*, *Shields…*, *While it stands, …*, *When broken, …*.
4. **One idea a sentence:** no colon chains, no semicolons, nothing over 25 words. Name the target where *it* would be
   unclear.
5. **Second person only for the player as the target.** The mechanics never give advice.
6. **The answer goes on its own last line:** one imperative of 10 words or fewer, starting `▸ ` (`answerLine`), drawn
   muted under a rule like WoW's *Use:* line; on a Codex card its own teal paragraph. Cut it when it only repeats the
   mechanics.
7. **Numbers** are the live, scaled values in a fight and the base values on a Codex card.
8. **Sentence case, plain English,** no word the player hasn't met on the board; *cycle*, *◆*, *Integrity* for a part's
   health, *Signal* for yours.

The highlighter (`ruletext.mjs`) lights the facts of this grammar in a detail panel: *28 damage*, *5 cycles*, *1 ◆*,
*Scrambled*.
