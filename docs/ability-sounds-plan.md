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
