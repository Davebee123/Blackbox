# Performance plan: phones first, settings for what costs looks

Measured 2026-11-15 on main with `tools/perf/phone-audit.mjs`: an emulated phone (412 × 839, touch, CPU slowed 4×).
The graphics are software there, so the main thread's numbers are the ones to trust.

## Where it stands

| Screen | Main thread busy | Frames a second |
|---|---|---|
| Settings, Mail, Loadout, Server, Codex, Rig (idle or scrolling) | 22–29% | 60 |
| Class pick, a drawer open (batch 8; was 33–49%, 60) | 3–4% | 1 |
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
The hosted game now loads one script and one stylesheet (batch 7).

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
| Samples, audio textures and the chip effects' defs warmed on the loading screen (`warm.mjs`) | both | landed |
| One bundled, minified script and stylesheet for the hosted game (`scripts/build.mjs`) | both, phones most | landed |
| The class pick's border effects on the compositor (`pickfx.mjs`); no flex-basis transitions in its phone layout | both, phones most | landed |

**The same look, by other means (the designer's eye before it lands):**

| What | Helps | State |
|---|---|---|
| Map and rooms animations the graphics card can run | both | landed |
| A part's dissolve drawn on a canvas | both | landed |
| Audio textures as they sounded at 192 kHz (commit d38e785, held by 034b166) | both | waiting on the A/B pick |

**Settings (each costs looks):**

| Setting | Helps | Desktop default | Phone default |
|---|---|---|---|
| Virus picture: full motion, slow, or still | phones (an icon there) | full | slow |
| Ambient motion: the map's pulses, the rooms' bits and links, the backdrop's drift, the CRT's roll | both | on | on |
| Part dissolve: all its bits, fewer, or a fade | both | all | fewer |
| Chip effects: Now and +1, or Now only (about 4%) | both | both columns | both columns |
| Tether glow: breathing or steady | both | breathing | steady |
| Fight effects level (today's Screen effects: off, subtle, medium, bold) | both | medium | medium |

## The settings screen (batch 5)

Landed. The designer's pick: one screen, a checkbox for what is on or off, a slider for what has steps (the whole page,
Options too). Graphics is the right column: the preset over a *Costs looks* heading (Virus picture, Part dissolve and
Screen effects as sliders; Ambient motion, Chip effects at +1, Breathing tether as checkboxes), then *Screen* (Motion,
the shell, Casing, Window, Grain, the Screen effects' parts). Auto: a desktop Quality, a phone Balanced (the phone
column above). Performance is still virus, no ambient, a fade, Now only, steady, subtle. `graphics.mjs`; GAME_RULES.md
"Settings".

## The loading screen (batch 6)

Landed. The designer's pick: the *Trace* (poweron.mjs). The Horizon plays as picked; the box's outline draws itself
round, clockwise from its top left, as the warm-ups report (not before the box shows); once it closes the box's light
leaks out (not before its old 1.5 s) and the prompt follows a second later. A key while it comes on lands the picture;
the prompt still waits for the outline, never past 6 s from power-on (`WAIT_MAX`). Motion off: no drawing, the same
wait. Warmed (`warm.mjs`, one step a task): the sample bank (`sound.mjs` warmBank: the context is made, not started,
and fed), the textures (warmTextures: the abilities' hall, every noise colour, the fight music's reverb, now built once
a context, where every theme built its own), the chip effects' defs. Not warmed: fonts (none ship), the stage's still
layer (1–7 ms, rebuilt every fight).

## Batches

One session each, started fresh. Measure before and after with `tools/perf/phone-audit.mjs` (phone and
`DEVICE=desk`), the same day; land only what moves the numbers.

| Batch | What | Owns | Order |
|---|---|---|---|
| 1 | The tick rests when idle | `app.js` frame and what it calls every frame | landed |
| 2 | Partial rebuild of the fight screen | `app.js` render and `put`, the board's post-render steps | landed |
| 3 | Composited map and rooms animations | the map's and floorplan's markup and CSS | landed |
| 4 | The dissolve on a canvas | `hitfx.mjs`, `dissolvefx.mjs` | landed |
| 5 | The Graphics settings: prototypes, the pick, then the build | the Settings page, `settings` in the save | landed |
| 6 | The loading screen: prototypes, the pick, then the build and the warm-ups | `poweron.mjs`, `shell.mjs` boot, `sound.mjs` loadBank | landed |
| 7 | A build step for the hosted game (approved 2026-11-15); `dist/` stays runnable as plain files for development | `scripts/build.mjs`, the Pages workflow | landed |
| 8 | The class pick: measure it, fix what costs | the class pick (`app.js` near `classPickMarkup`, `view.mjs` classPickMarkup, its CSS) | landed |
| 9 | The CRT and the backdrop's textures merged into fewer layers: prototypes, the pick, then the build | `screenfx.css`/`.mjs`, `#crt`, `#fx-back`, `#fx-edge` | next |

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

**Batch 5 (landed).** Each preset against main, same day, two runs each, frames a second (main thread ms/s). Phone:
boss fight main 18.4, 21.7 (977, 972); Quality 21.4, 20.5 (957, 971); Balanced 26.3, 26.0 (945, 944); Performance
32.3, 31.8 (910, 926), long blocks 71, 65 → 44, 41. Regular fight main 36.1, 35.4 (911, 921); Quality 29.5, 34.6;
Balanced 30.3, 34.9; Performance 44.2, 40.4 (820, 854). Rooms map idle main 67, 70 ms/s; Quality 83, 58; Balanced 78,
77; Performance 53, 50. Map idle 25–30 ms/s under every preset. Desktop: boss main 11.4, 11.3 (574, 640); Quality
12.1, 10.6; Balanced 11.0, 11.3 (504, 532); Performance 11.3, 12.8 (538, 500); rooms map main 26, 24 frames/s,
Performance 33, 36; the Map and regular fights within the noise (the window's canvas is most of a desktop's cost).
Quality runs main's code paths. Every row takes effect at once and survives a reload; Motion off and reduced motion
still win; no page errors in a boss fight under each preset, desktop and phone.

**Batch 6 (landed).** Same day, two runs each, branch against main. The prompt from a cold load (a fresh player):
phone 4.67, 4.80 s → 4.70, 4.76 s; desktop 3.31, 3.40 → 3.66, 3.82 s (the outline's minimum); blocks over 50 ms
before it, phone 4, 5 → 6, 7 (the textures, 74–84 ms each). What each buys. *Samples:* on a normal network main
already decodes the bank under the Horizon (the soundtrack makes the context at boot): 99 of 116 files in by the tap
both ways, the first sample 110 ms after it. With each sample 4.5 s away main's prompt comes at 4.3, 4.5 s with none
of the 96 in (the first sounds after the key play without them for 5 s); the branch's at 7.6, 8.0 s with all 96.
*Textures:* the first real fight (Horizon, boot lines, then a fight; phone, JS profile) spent 68–71 ms in the
abilities' hall and 11–16 ms in noise on main, 0 on the branch; the music's reverb cost a phone about 180 ms at a
theme's first start and 35–50 ms at each one after, every fight, and is now built once. *Chip defs:* 1.3–2.1 ms
(phone), 0.4–0.7 ms (desktop) off the first fight's first render. The first real fight's first 1.5 s, main thread
busy (worst block): phone 1590, 1433 (238, 184) → 1438, 1449 ms (216, 178); desktop 1363, 1359 (179, 198) → 1428,
1386 (219, 131): within the noise. Playtest fights (no Horizon) unchanged: phone boss 18.1, 20.7 → 21.1, 19.1
frames/s and regular 30.6, 30.8 → 31.8, 32.0 (both on port 4173: one port read 2–4 frames/s lower than the other for
the same code); desktop boss 11.0, 10.9 → 10.4, 11.0, regular 13.7, 13.8 → 13.5, 13.1. The Horizon as picked, a key
or tap starting it, an early tap, samples 9 s away (the prompt at 8.3, 8.6 s), Motion off and a fresh player's cold
open: as before, no page errors.

**Batch 7 (landed).** `node scripts/build.mjs` (esbuild, pinned) writes `build/`, which the Pages workflow deploys:
`app.js` and its imports as one minified `app-<hash>.js` at the root (`import.meta.url` still finds `sfx/`), index.html's
24 sheets as one minified `style-<hash>.css`, everything else copied but the editor. `dist/` is unchanged and runs as
before. The three dynamic imports (the window, the bench, the effects playtest) are made static in the bundle: left
dynamic, esbuild wraps the 104 modules they reach in lazy closures, and split into chunks they load as six more
requests. The one dev-visible difference: `developer fight` under `?dev` finds the Arena without `?bench`. Samples stay
files (96 small WAVs, 1.8 MB; packing them into one file would save requests but delay the first sound to the whole
pack). Same day, both served the way Pages serves (gzip, `max-age=600`) from one server, ports swapped between the two
rounds, dist → build. A cold load to the prompt (a fresh player): 334 → 110 requests, 4.2 → 3.3 MB over the wire
(scripts 1.9 → 1.1 MB, styles 181 → 112 KB). Unslowed network, phone: prompt 5.24, 5.13 → 5.26, 5.21 s, main thread
3.36, 2.80 → 3.53, 3.02 s; desktop: prompt 4.25, 3.74 → 4.14, 4.23 s, main thread 2.69, 2.68 → 2.70, 2.97 s. A phone on a
slow network (1.6 Mb/s, 150 ms a request): the Horizon 14.6, 14.3 → 8.7, 8.8 s, the prompt 21.6, 21.7 → 16.2, 16.2 s
(a local HTTP/1.1 server; Pages speaks HTTP/2, where 300 requests cost less, so read this as the most it buys). Warm
loads (cached) level: phone prompt 3.76–4.20 → 3.69–4.09 s. The bundle counts more as script (phone 0.8–1.0 → 1.6–1.8
s), unminified too, and less as everything else: 200 module loads gone. Fights level: phone boss 17.8, 19.3 → 18.0,
18.9 frames/s, regular 24.7, 25.7 → 27.4, 28.6; desktop boss 10.6, 9.7 → 10.0, 9.9, regular 12.0, 12.3 → 12.2, 11.1.
The Horizon and its prompt (desktop and phone), a fresh player's cold open with its samples, both playtest fights, the
desktop window, `?dev`, `?playtest=fx` and `?bench=arena`: as on dist, no page errors, no new 404s.

**Batch 8 (landed).** Reached from a fresh save (`phone-audit.mjs` step `fresh:`; mode `click` for the drawer and
switching). With none picked the pick was already cheap (phone 28–31 ms/s, 1 frame a second). The picked square's
border effect ran on the main thread every frame while you read its drawer: Breaker's flash (a `box-shadow`
animation), Bastion's ward (`border-color`), Infiltrator's and Operator's lights (`offset-path`). Now the flash is a
shadow layer fading by opacity (at its peak the same; as it fades it stays wide where the old one shrank), the ward a
bright border fading in over the dim one (the same colours), and the lights transform keyframes along the same rounded
border at the same speed (`pickfx.mjs`, rebuilt by a ResizeObserver as the drawer opens; within 0.3 px of the old
path at 81 points, desktop and phone). The phone layout's cards no longer transition `flex-basis` (a grid there: it
did nothing but lay the page out every frame). Same day, two runs each, ports alternated, before → after, main thread
ms/s (frames a second). Phone, a drawer open: Breaker 415, 351 (60) → 40, 34 (1); Bastion 325, 349 (60) → 36, 33 (1);
Infiltrator 446, 485 (60) → 31, 27 (1); Operator 438, 466 (60) → 28, 30 (1). Phone, a drawer opened and closed every
1.2 s: 516, 539 → 396, 435 (layouts 28 → 4 a second, paints 131 → 38); switching classes every 1.2 s: 689, 703 → 464,
489 (layouts 32 → 12). None picked: 29, 28 → 31, 28. Desktop: the window's canvas (184–302 ms/s, swinging run to
run) is most of it and holds it near 17 frames/s; the rest of the main thread level or lower: a drawer open 49–56 →
39–54, a drawer opening 109, 109 → 96, 99, switching 92, 96 → 94, 110. Each class's border, Start, keys 1–4 and Esc,
reduced motion (the lights held still at the top left, as before), the phone's rows: as before, no page errors.

Not yet measured: breach and campaign, hubs and shops, co-op, the tutorial, the More sheet, a phone on its side.
