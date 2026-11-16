# Performance plan: phones first, settings for what costs looks

Measured 2026-11-15 on main with `tools/perf/phone-audit.mjs`: an emulated phone (412 × 839, touch, CPU slowed 4×).
The graphics are software there, so the main thread's numbers are the ones to trust.

## Where it stands

| Screen | Main thread busy | Frames a second |
|---|---|---|
| Settings, Mail, Loadout, Server, Codex, Rig (idle or scrolling) | 22–29% | 60 |
| Power-on, login prompt | 27–28% | 60 |
| Cold open | 44% | 60 |
| Map (idle) | 55% | 60 |
| Fight, waiting for the first order | 73% | 59 |
| Run on a server (idle) | 91% | 53 |
| Rooms map (idle) | 96% | 51 |
| Regular fight, playing | 75% | 30 |
| Boss fight, playing | 98% | 12 |
| Boss fight, Motion off | 83% | 38 |

A first load is 328 requests and 9 MB (5.3 MB of scripts in 196 files, 2.2 MB of samples, 0.75 MB of styles in 24).

**Why, biggest first:**

1. **Fights: effects.** Motion off triples the boss fight's frame rate. A part breaking makes about 230 elements, each
   with its own timer and a colour fade the graphics card can't run (`hitfx.mjs` dissolve): one style pass of 97 ms on a
   desktop, a third of a second frozen. Landed (batch 4): one canvas a part, for the length of the effect.
2. **Fights: the screen is rebuilt whole** on every event (`app.js` render: board, HUD, tray). About 48 ms a rebuild on
   a desktop, three a second. Landed (batch 2): the board and tray keep the rows that didn't change.
3. **Fights: the virus picture.** On a phone it is a 32 px icon, drawn from the whole model 25 times a second: 23% of
   the main thread.
4. **Fights: the tether's glow** (a `box-shadow` animation) and the backdrop repaint every frame: another 23% in a
   waiting fight.
5. **Rooms map, runs, Map: SVG animations.** The flowing links (a dash-offset animation), the rooms' traffic and the
   Map's moving files (script every frame) cost style, layout and paint of the map every frame; the rings, the blink
   and the bits already ran on the graphics card. Landed (batch 3).
6. **Every screen: the game's tick** (`app.js` frame) ran 60 times a second with nothing to do. Landed (batch 1): it
   rests, and an idle phone screen's main thread went from 117–141 ms/s to 20–30 (the Map 313 → 28), 60 frames a second
   to 1 (the status line's clock).
7. **Six full-screen layers** on every screen (the CRT's sweep and roll, the backdrop's texture, static and edge):
   about 57 MB of textures on a phone.

## The rules (the designer, November 2026)

- **What nobody can see or hear ships for everyone**, with no setting.
- **What costs looks is a setting**, like any game's graphics options. A desktop defaults to the full look; a phone may
  default lower. The setting says it costs looks.
- **Every item below says who it helps**: phones only, or phones and desktops.
- **A loading screen** with a boot animation before *tap to start* is welcome where it buys time later.

## The list

**No visible change (always on):**

| What | Helps | State |
|---|---|---|
| Audio renders at 48 kHz on outputs set higher (`sound.mjs` openContext) | both | landed |
| The stage's reflection, glows and light (`stage.mjs`); the virus's projection (`virus-art.mjs`) | both | landed |
| Three loops rest: rooms traffic, glyph flicker, the virus pictures | both | landed |
| The game's tick rests when nothing needs it (`app.js` frame) | both | landed |
| The fight screen rebuilds only what changed (`app.js` putRows) | both | landed |
| A click on a room swaps its card, not the rooms map (`app.js` putRooms); virus names and room outlines kept between draws. Click to frame, median: desktop 76 → 55 ms, phone 158 → 89 ms | both | landed |
| Samples, audio textures and fonts warmed on the loading screen | both | batch 6 |
| One bundled, minified script and stylesheet for the hosted game | both, phones most | batch 7 (build step approved) |

**The same look, by other means (the designer's eye before it lands):**

| What | Helps | State |
|---|---|---|
| Map and rooms animations the graphics card can run | both | landed |
| A part's dissolve drawn on a canvas | both | landed |
| Audio textures as they sounded at 192 kHz (commit d38e785, held by 034b166) | both | waiting on the A/B pick |

**Settings (each costs looks):**

| Setting | Helps | Desktop default | Phone default |
|---|---|---|---|
| Virus picture: full motion, slow, or still | phones (an icon there) | full | to pick |
| Ambient motion: the map's pulses, the rooms' bits and links, the backdrop's drift, the CRT's roll | both | on | to pick |
| Part dissolve: all its bits, fewer, or a fade | both | all | to pick |
| Chip effects: Now and +1, or Now only (about 4%) | both | both columns | to pick |
| Tether glow: breathing or steady | both | breathing | to pick |
| Fight effects level (today's Screen effects: off, subtle, medium, bold) | both | medium | to pick |

## The settings screen (batch 5)

A Graphics block on the Settings page: a preset (Auto, Quality, Balanced, Performance; Auto reads the device) over the
rows above, each row marked as costing looks. Motion, Screen effects, Shell, Casing and Window already live there and
fold into it. Prototype two or three layouts as screenshots first (desktop and phone); the designer picks.

## The loading screen (batch 6)

Before the Horizon's *tap to start*: a boot animation while the game warms what otherwise hitches later. To warm: the
sample bank (96 files, decoded), the audio textures (if the 192 kHz retune is kept: about 200 ms of building on a
desktop, four times that on a phone), the fonts, the first fight's pieces (the chip effects' defs, the stage's still layer). The Horizon is a picked
look: the loading is a phase of it or before it, never a replacement. Prototype two or three as screenshots first.

## Batches

One session each, started fresh. Measure before and after with `tools/perf/phone-audit.mjs` (phone and
`DEVICE=desk`), the same day; land only what moves the numbers.

| Batch | What | Owns | Order |
|---|---|---|---|
| 1 | The tick rests when idle | `app.js` frame and what it calls every frame | landed |
| 2 | Partial rebuild of the fight screen | `app.js` render and `put`, the board's post-render steps | landed |
| 3 | Composited map and rooms animations | the map's and floorplan's markup and CSS | landed |
| 4 | The dissolve on a canvas | `hitfx.mjs`, `dissolvefx.mjs` | landed |
| 5 | The Graphics settings: prototypes, the pick, then the build | the Settings page, `settings` in the save | after 3 and 4 (it switches them) |
| 6 | The loading screen: prototypes, the pick, then the build and the warm-ups | `poweron.mjs`, `shell.mjs` boot, `sound.mjs` loadBank | any time |
| 7 | A build step for the hosted game (approved 2026-11-15); `dist/` stays runnable as plain files for development | new | last |

**Batch 1 (landed).** `frame` runs every frame while `tickBusy` holds: a fight, `dirty`, a queued effect, strike or
level-up, the Tune window, files moving on the map, co-op, or the second after an input. Otherwise a timer runs it when
something is due (the once-a-second work, the radio's schedule, the next tip check), a quarter second at most, and
nothing while the tab is hidden. `markDirty()`, input, `feel.add`, `lu.push` and the tab coming back wake it at once.
The three earlier loops look on their timers without asking for a frame. Phone, idle, main thread ms/s before → after
(same day): Settings 117 → 21, Mail 137 → 22, Loadout 141 → 30, Server 125 → 22, Codex 126 → 21, Rig 129 → 20, Map 313
→ 28 (the tick's per-frame layout and paint; its animations still play), Rooms 729 → 702 (its own animations, batch 3).
Fights unchanged (the tick runs). Desktop idle 347–374 → 331–341. A fight from the prompt, a timer's render, a level-up,
notices, tips, the caret and the clock measured the same as before.

**Batch 2 (landed).** `putRows` replaces only the board's and tray's top-level rows whose markup changed; a kept row
keeps its node and what effects put in it, and the steps after a render re-apply theirs (spent chips now clear both
ways). A forced render, or anything else put in the panel, rebuilds it whole. The HUD stays whole (two blocks, cheap).
About two thirds of the board's rows are kept between renders in a boss fight. Looping animations on kept rows no longer
restart on every render, and one-shot flashes and typed or flipped chip names play to the end: shown to the designer as a
side-by-side recording, kept. Same day, two runs each, before → after: phone boss 12.9 → 14.3 frames/s, `frame` 21.3 →
17.3 ms; desk boss `frame` 9.7 → 8.4 ms; regular fights and a fight waiting for its first order unchanged (phone regular
22 → 23 frames/s, `frame` 9.9 → 9.6 ms). A fight from the prompt, bars stepping hit by hit, a part's dissolve, chips
moving between cycles, the act break's Strip, the phone's HUD cards: as before, no page errors; the board's DOM matches a
whole rebuild of it.

**Batch 3 (landed).** Flowing dashes (live links, the hunter's and Exfil's arrows, the Map's hot links, trunks and
hunts) are clipped pieces, each a period longer than its stretch and slid along it by a transform; a curve is eight
pieces in phase (`flowfx.mjs`). The rooms' traffic and the Map's moving files are transform and opacity animations
(`traffic.mjs`, `mapmotion.mjs`); a file in transit is a CSS animation, not SMIL. Nothing in them runs every frame,
and the Map no longer keeps the tick awake while hubs trade. An animation started on a map not yet laid out runs on
the main thread for good, so the files restart two frames after a redraw (`settle`). `.no-ambient` on a container
stills it all (for batch 5). Same day, phone, idle, two runs each, main thread ms/s before → after: rooms map 848, 873
→ 94, 65; a run (`?playtest=run`) 907, 827 → 95, 93; the Map with two hubs trading 656, 787 → 36, 29; the Map
without them 30 → 30. Desktop unchanged at 350–475 (its cost is elsewhere). Shown to the designer as side-by-side
recordings (rooms map, Map, a run), kept. Walking, rooms resolving, the hunter's arrow, zoom, the phone's map, files
after a redraw: as before, no page errors.

**Batch 4 (landed).** A broken part's dissolve is one canvas over the part for the length of the effect
(`dissolvefx.mjs`), removed when it ends, in place of a span, an animation and a timer for each of its 1s and 0s and
its letters. Each glyph runs the old keyframes (opacity, colour, drift, eased out) and flickers on the old timers; it is
drawn from a sprite of that character in that colour with its glow baked in, the sprites packed on small atlas pages
made before a frame draws (a canvas each, or one big atlas drawn into after being drawn from, cost more than the
drawing). One loop draws every dissolve under way; its clock is an animation on the canvas, so the winning hit's slow
motion slows it too. `createHitFx`'s `dissolveMode` (for batch 5): `all`, `fewer` (a third of the bits) or `fade` (no
canvas: the row's letters fade with it, `.dissolve-fade`). Shown to the designer as side-by-side recordings (a regular
part, a boss's, three close together; desktop and phone) with a cheaper option (one glow over the whole canvas); the
designer kept the glow on each digit, matching main. Same day, before → after. The break alone (a fresh effects layer
on the boss's board, two runs each): phone, three parts at once, the call (the freeze) 375, 311 → 64, 80 ms, the longest
gap between frames 395, 347 → 157, 178 ms, style 358, 295 → 54, 66 ms over the effect, the main thread over its 1.8 s
2011, 1953 → 1612, 1687 ms (1100–1200 without a break), 513 elements → 3 canvases; phone, one part, the call 59, 70 →
39, 26 ms, style 290, 301 → 79, 79 ms;
desktop, three parts, the call 48–70 → 17 ms, style 103–123 → 11 ms. Its loop costs about 0.4 ms a frame on a desktop
for three parts and 3–4 ms a part on the slowed phone. A boss fight (phone): paints 346, 336 → 153, 159 a second,
style 178, 177 → 155, 155 ms/s, the break's own task 28, 31 → 18 ms, frames 15.9, 16.8 → 15.8, 18.7 a second, blocks
over 50 ms 74, 68 → 72, 57; (desktop): paints 403, 472 → 148, 154, raster tasks 737, 798 → 490, 531, main thread 664,
606 → 610, 583 ms/s. Regular fights broke no part in the audit's 12 s: unchanged. Boss fights to their act break (the
Strip plays), Motion off (no canvas), the phone's layout, several parts at once: as before, no canvas left behind, no
page errors.

Not yet measured: breach and campaign, hubs and shops, co-op, the class pick and tutorial, the More sheet, a phone on
its side.
