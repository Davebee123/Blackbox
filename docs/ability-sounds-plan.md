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
- Built live from the CC0 bank and synth (lengths follow the travel), in `abilitysound.mjs`, laid out like the effects
  table: per motion, particle and class, plus overrides for the signature abilities.

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
   **1h** (built, waiting on the pick): Bash and Poke with no square blips or bit-crush, Ban and Ping as Deep echo:
   B11 Tear (sample grains, a stuck buffer, a driven bass hit) and B12 Trailer (a swell, a metal slam, low brass).
2. **Every ability**: the generic layers in the picked style, all 110 rows, and overrides for Overload, Detonate,
   Firewall, Purge, Crack, Quarantine, Botnet, Deploy, Inject, Flood, Shatter and Failover.
3. **Tiers and finishers**: the mastery layers, the 13 tier overrides, the 12 finishers.
4. **Land**: the mix in real fights (crowded cycles, crewmates, burns), the voice cap, tests, GAME_RULES and README.
