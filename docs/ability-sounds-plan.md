# Ability sounds

Each ability gets a sound of its own, timed to its effect, in place of the result's shared voice (`feel.mjs` SIGNS: every
damage ability plays the same `hit`, every mark the same `mark`). The designer hears every round before any of it goes
into a fight.

## The grammar

A sound is four layers on the effect's plan (`abilityfx.mjs` play(): travel, hold, impact, stop):

| Layer | When | From |
|---|---|---|
| Launch | it leaves the key | its class |
| Travel | the flight; a crit's draw-back winds up | its motion (swing, punch, dart, wave, bolt, walk, fly…) |
| Contact | the impact, the number's beat | motion and result: light, big, crit, on ◆ (a glance in steel), miss (the travel passes on) |
| Tail | after the hit-stop | its particles (shock, bits, shards, flame, dust, ring, `+`) |

Each class keeps its rhythm: the Breaker cuts dead, the Bastion rings on, the Infiltrator's spreads out late, the
Operator's comes in three beats.

## Rules

- The ability's contact replaces the result's voice; the flash and the buzz stay. Breaks and the virus family's
  one-shots stay as they are.
- Screen effects off or Motion off: no travel to time, so contact and tail on the number's beat.
- One contact per ability per batch; a hit on every part plays one contact with a wider tail; burn ticks stay small
  and rate-limited; a cap on voices.
- Key 1 fires most: the shortest, driest and most varied.
- A crewmate's: quieter, tier 1, silent when yours lands on the same beat.
- Built live from the CC0 bank and synth (lengths follow the travel): `abilitysound.mjs` holds the kit and each
  class's key 1, `abilitysound-all.mjs` builds the rest from the effects table by motion, particle and class, with
  layers of their own for the signature abilities.

## Rounds

1. **Style**: Bash, Ban, Poke and Ping as a hit, small, big, crit, on ◆, a miss and three in a row, in A Hardware,
   B Weighty and C Digital beside today's. `?playtest=fx` has the Sound row; the preview videos are rendered from the
   same plans. The designer kept B's weight but heard it as being hit (it shared the hurt's punches and sub-drop) and
   as thin.
   **1b**: two Weighty takes with none of the hurt's samples: B1 Cinematic and B2 Electric. Rejected as light and
   fluffy; the designer wants round 1's bass, and more of it.
   **1c**: round 1's Weighty with far more low end: B3 Heavy and B4 Seismic. Not good enough: the designer wants it
   glitchier, with today's hit as the compass.
   **1d**: today's hit (`sound.mjs` digitalHit) taken apart and timed to the effect, a boom under it: B5 Machine and
   B6 Glitch (lower, the hit stuttering like a stuck buffer). Glitch is the better; it wants more reverb and echo.
   **1e**: Glitch with longer, louder echoes, a far repeat and a hall: B7 Echo and B8 Cavern. Echo is very close;
   slightly less of both.
   **1f**: B9 Soft echo, Echo eased a third of the way back to Glitch. Bash had no echo; a little more bass on all.
   **1g**: B10 Deep echo, Soft echo with a longer, fuller boom, the Breaker's echoes carrying past its cut (`RING`).
   Good on bass and reverb; Bash and Poke want something other than the 8-bit sound, glitchier or cinematic.
   **1h**: Bash and Poke with no square blips or bit-crush: B11 Tear (sample grains, a stuck buffer, a driven bass
   hit) and B12 Trailer (a swell, a metal slam, low brass). Trailer sounds pretty good.
   **1i**: Trailer for Ban (a low bell and a rumble ringing on) and Ping (three slams stepping down) too. The
   designer prefers Deep echo, with the blips on Bash and Poke toned down.
   **1j**: B13 Deep echo, soft: Bash's and Poke's blips (data, cascade, stutter, pings) about 7 dB down. Picked.
2. **Every ability** (built, waiting on the designer's ear): all 108 rows in the pick (`abilitysound.mjs` PICKED),
   built from each row by `abilitysound-all.mjs`: a launch by class, a travel by motion, a contact by kind (strike,
   sign, yours, helper, fire) and a tail by particles, each ability at its own pitch. SIGNATURE adds layers for
   Overload, Detonate, Firewall, Purge, Crack, Quarantine, Botnet, Deploy, Inject, Flood, Shatter and Failover.
   Levels are measured into `abilitysound-levels.mjs`. `?playtest=fx` plays any of them with Sound on B13.
   **2b** (built, waiting on the designer's ear): the designer heard many as the same, and is fine with that
   where it means the same mechanic. Kept the five kinds; inside each, a class's abilities now differ: a trait voice
   for what each does (TRAITS: breaks ◆, wards, dodges, undoes, slows, spreads, commands helpers…), one of three
   bodies and an evenly spread pitch by its place among its class's of that kind, and layers of their own for the
   long-cooldown ones (Zero-day, Logic Bomb, Kill Switch, Takeover, Outbreak, Turbo Boost, Vanish, Circuit Breaker,
   Opening, Hot Standby).
3. **Tiers and finishers** (built, waiting on the designer's ear): a mastered ability's sound with a layer on top
   (`tiered`: tier 2 throws more, tier 3 leaves a glint), a layer of its own for each hand-made tier as its effect
   draws it (TIER_SOUND: Ban's deeper slam and glowing crack, Poke's three needles, Ping's echo coming back…; a
   burn's ticks keep today's voice), and the 12 finishers' flourishes over the break's own voice. Main has since removed the break finishers' effects;
   the designer kept the sounds for the winning break's slow motion (`flourishes`, by `flourishKey`).
   `?playtest=fx` plays the tiers: Mastery picks one.
4. **Land** (built, waiting on the designer's play): a fight plays the pick. `app.js` strikes(): each command's own
   sound (abilitySound) timed to its effect's plan, or on the number's beat with no effect; the events it speaks for
   (abilityVoices: its hits, miss, marks, cuts, heals) keep their flash and buzz and lose their voice (`feel.mute`). A
   crewmate's at half level, two a batch, none on your beat. At most four ability sounds start within a quarter
   second (`sound.mjs` ABILITY_CAP); one more falls back to its result's voice. The winning break sounds your class's
   flourish over the break as it slows (winSound). Burn ticks keep today's voice.

## Virus attacks

The same workflow for what the virus does to you. Today every attack that lands plays one `hurt` (a crit `hurtcrit`),
whatever it is; Encrypt and Scramble have a voice each. A fight plays today's until the designer picks.

Yours is bright and rings out; theirs is dull and falls: no crack on top, a lower boom, dark echoes.

| Layer | When | From |
|---|---|---|
| Launch | its chip goes off | its theme (the bolt's snap, the padlocks lifting, the fire catching, the hand winding) |
| Travel | the strike's flight | its theme's strike (`chipfx.mjs` STRIKE_PLAN) |
| Contact | it lands on your bar, the number's beat | the result: a hit by its size, a crit, blocked (a glance off your wall, no weight), evaded (nothing: the travel passes on) |
| Tail | what the strike leaves on your bar | its theme (sparks, the last hasps, flames dying down, ticks running out) |

Screen effects off or Motion off: contact and tail on the beat. The family's one-shots stay. Levels match today's:
a medium hit −17 LUFS, a crit −13, blocked −25, evaded −26 (`virussound.mjs` TRIM, `virussound-levels.mjs`, measured
through `renderBoard`).

1. **Style**: Surge (Pulse Node, at once), Encrypt (Encryptor, seven clamps
   one after another), Hash (Rig, a lob) and Discharge (Accumulator, a wind-up), as a hit small, medium and big, a
   crit, blocked and evaded, in A Body (today's hurt in pieces, air and thuds), B Corrupt (your signal breaking up: a
   crushed drop, a stuck buffer, the carrier cutting out) and C Chassis (your machine taking it: the rack struck, the
   power sagging, relays tripping) beside today's. `?playtest=fx` has them under Virus attacks.
   The designer picked Corrupt; its Encrypt (a modem's tones, seven square steps down) is too on the nose.
   **1b**: Corrupt's Encrypt with no tones: B1 Latch (static drawing in, seven
   crushed latches, a stuck slice sagging under each) and B2 Choke (your carrier's hum pinched shut a notch at a
   time, duller each notch, then cut). Latch is picked (`virussound.mjs` PICKED). Surge, Hash and
   Discharge are kept as they are.
2. **Every attack** (kept): the other 14 themes' strikes and the lash in the pick,
   each from its strike's own timing (`chipfx.mjs` STRIKE_PLAN: every strike reads its plan), with the pick's hit as
   the contact (`virussound-all.mjs`). `?playtest=fx` plays them all under Virus attacks.

   | Attack | Launch and travel | Tail |
   |---|---|---|
   | Cipher | a data burst in two pitches, static rushing over | the last streams landing |
   | Beacon (ring) | a dull ping, the beam humming, brackets whining in and locking | the ping back, lower |
   | Chill (frost) | ice breaking on its chip, thin cold air | your signal frozen: one slice held, ice settling |
   | Zero (erase) | pixels flaking off, more and more | static thinning as the wipe crosses, cut dead |
   | Bad Write (crumble) | cracks racing, a shatter, shards falling | the rest landing, grit |
   | Spread (scramble) | a decoding wave, glyphs churning | the wave, rows tearing left and right, falling apart |
   | Prick (thorn) | nine thwips | eight punctures after the first, a quiver |
   | Tick (strobe) | a flash tube left, then right, charging between | your signal flickering evenly |
   | Splice (copy) | the copier's lamp, four copies snapping on, each a generation worse | the thump copied twice, duller |
   | Scrape (scan) | the emitter, a laser buzz climbing, data ticking off | brackets snap on, static |
   | Ping (plate) | halves clang shut, lift, come down | steel, the shield ringing low, a rumble |
   | Ledger | reels ticking, four clunks, the number flying | a countdown, a line struck through |
   | Turn (mask) | a hum lifting, two voices in turn | a hollow knock, eyes left and right, a tear, halves out of tune |
   | Gnaw (byte) | a flit, brackets clamp | the shortest: a tear, one stuck slice, a few blips |
   | Lash (no theme) | static tearing across, a second strand on a crit | 1s and 0s ticking away |

   What isn't a hit on you has one form and no weight: **Scramble** (the scramble strike, then your carrier chopped up
   and slices out of order; today's `blind`), **Replicate** (the copy strike onto its fragment, which boots: the growl
   rising where a hit's falls; silent today), **Patch** (static draws in, a latch, steel closing; today's `patch`).
3. **Charges and bosses** (built, waiting on the designer's ear), in the pick. Two layers over any attack's own hit
   (`virussound-all.mjs` layers; Lands in `?playtest=fx`), and two tells that land on the virus:
   - **A charge** (a hit with `tell`; today the hurt): the wind-up let go as it flies (a long draw-in, a low riser),
     metal groaning as it lands and the floor going a beat after, then what it knocks out: a power-down, your carrier
     gone for a long moment, a breaker dropping. A big one comes to a crit's −13 LUFS.
   - **A boss's beat** (its signature part's attack: Broadcast, Collection, the Backlash…; today the hurt): the act
     break's low G against its tritone, tolling once under the hit, a second toll far off. One layer for every boss.
   - **A cast compiles** (today the hurt): slices chattering faster, a latch, the virus's hum climbing and holding,
     two dull latches. −19 LUFS.
   - **A seal lands** (today `patch`): Patch down the board, a latch a part, then steel pulled off you backwards and
     your carrier dipping. −22 LUFS.

   Left as they are: the after-effects (Offline, Corrupted), the Mimic's playback (its copy strike), the act break.
4. **Land**: a fight plays the pick in place of `hurt`: one contact a batch, the number on the strike's impact (today
   the two are timed apart), a cap shared with yours.
