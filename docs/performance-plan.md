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
   desktop, a third of a second frozen.
2. **Fights: the screen is rebuilt whole** on every event (`app.js` render: board, HUD, tray). About 48 ms a rebuild on
   a desktop, three a second.
3. **Fights: the virus picture.** On a phone it is a 32 px icon, drawn from the whole model 25 times a second: 23% of
   the main thread.
4. **Fights: the tether's glow** (a `box-shadow` animation) and the backdrop repaint every frame: another 23% in a
   waiting fight.
5. **Rooms map, runs, Map: SVG animations** (the bits, the flowing links, the pulsing rings, the blinking dot). The
   browser runs SVG animation on the main thread: style, layout and paint of the map every frame. Off: 96% → 27% on
   the rooms map, 55% → 27% on the Map.
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
| The fight screen rebuilds only what changed | both | batch 2 |
| Samples, audio textures and fonts warmed on the loading screen | both | batch 6 |
| One bundled, minified script and stylesheet for the hosted game | both, phones most | batch 7 (build step approved) |

**The same look, by other means (the designer's eye before it lands):**

| What | Helps | State |
|---|---|---|
| Map and rooms animations the graphics card can run | both | batch 3 |
| A part's dissolve drawn on a canvas | both | batch 4 |
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
| 2 | Partial rebuild of the fight screen | `app.js` render and `put`, the board's post-render steps | after 1 (same file) |
| 3 | Composited map and rooms animations | the map's and floorplan's markup and CSS | any time |
| 4 | The dissolve on a canvas | `hitfx.mjs` | any time |
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

**Batch 2 notes.** `put('board')` replaces the whole board, then re-applies what effects had added (chip effect boxes,
spent chips, held bars, side marks, classes). Keep a row whose markup is unchanged; check every post-render step runs
safely on a kept row. Looping animations on kept rows then stop restarting on every rebuild: show the designer.

Not yet measured: breach and campaign, hubs and shops, co-op, the class pick and tutorial, the More sheet, a phone on
its side.
