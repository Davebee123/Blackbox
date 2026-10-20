# BLACKBOX sound samples

Every file in this folder is **CC0 1.0 (public domain)**. No attribution is required; credit is
given here anyway. Files were trimmed (leading silence and tail), mixed to mono, peak-normalized
to −1 dBFS and saved as 16-bit 44.1 kHz WAV. `<name>-<n>.wav` are takes of one sound; the game
picks one at random each time and nudges its pitch.

| Files | Source | Author | License |
|---|---|---|---|
| punch-m, punch-h, soft-h, soft-m, metal-h, metal-l, plate-l, plate-h, glass-l, glass-h, mining, tin, bell | [Impact Sounds](https://kenney.nl/assets/impact-sounds) (impactPunch, impactSoft, impactMetal, impactPlate, impactGlass, impactMining, impactTin, impactBell) | Kenney (kenney.nl) | CC0 1.0 |
| glitch, scratch, error, tick, confirm, drop, pluck, glassui, bong | [Interface Sounds](https://kenney.nl/assets/interface-sounds) | Kenney (kenney.nl) | CC0 1.0 |
| relay, click | [UI Audio](https://kenney.nl/assets/ui-audio) (switch2/7/11/22/26/28, click1/2/5, mouseclick1) | Kenney (kenney.nl) | CC0 1.0 |
| whoosh, subdrop, shimmer | StrongerFX procedural transitions (original-whoosh, original-subdrop, original-shimmer), via [strongerfx-mcp](https://github.com/smartpage/strongerfx-mcp) | StrongerFX | CC0 1.0 |
| key | [Keyboard Soundpack 1 — Typing and Single Keystrokes](https://opengameart.org/content/keyboard-soundpack-1-typing-and-single-keystrokes) (keypress-001…012, Cherry KC 1000) | unicaegames | CC0 1.0 |
| key-enter | [Enter key](https://freesound.org/people/alpinemesh/sounds/627647/) | alpinemesh | CC0 1.0 |
| key-back | [Single key](https://freesound.org/people/yottasounds/sounds/380141/) | yottasounds | CC0 1.0 |

The room tone (CRT hum, fan, flyback whine), the modem chatter and the chimes are synthesized
in `sound.mjs`; they are not samples.

## City outside the window (`city/`, all CC0)

- `city-ambience.mp3`: "Small city ambience with traffic, motors, horn, siren, slight passerby hubbub" by felix.blume, https://freesound.org/people/felix.blume/sounds/705049/ (Freesound HQ preview)
- `horn-double.mp3`: "Car horn beep beep two beeps honk honk" by AmishRob, https://freesound.org/people/AmishRob/sounds/423990/ (Freesound HQ preview)

## Places and virus families (`floors/`, `hubs/`, `families/`, Ogg Vorbis)

Synthesized for BLACKBOX: rendered offline with Web Audio by `tools/sound-preview/` (`FORMAT=ogg node
tools/sound-preview/render.mjs dist/sfx <clip>…`, `SET=2` for the round-two clips), loudness-matched (loops at
−23 LUFS integrated, Kernel Space at −28 on purpose; one-shots at −16 LUFS on their loudest 400 ms) and saved as
44.1 kHz stereo Ogg Vorbis. No licence is involved in the synthesized part. Some clips also layer the CC0
samples above (heavily resampled, pitched, reversed or cut into grains); nothing new was downloaded. Each loop
file carries 50 ms of wrap-around before and after the loop, which the game plays between (`places.mjs`).

| File | What it is | CC0 samples layered in |
|---|---|---|
| floors/floor-1-sprawl-r2-a | The Sprawl: a back street at night, a club through a wall, a neon sign, a far train | city-ambience (as a low murmur) |
| floors/floor-2-backhaul-r2 | Backhaul: a cable duct's slow hum, relay banks clunking down a long duct | metal-l |
| floors/floor-3-stacks-r2-b | The Stacks: a tape library's fan wash, a robot arm fetching cartridges | plate-l, click, scratch |
| floors/floor-4-coldline-b | Coldline: cold storage, a compressor, wind through a vent, ice creaking | scratch, metal-l, tin |
| floors/floor-5-deep-core | Deep Core: furnace rumble, heat shimmer, a magnetic drone, arcing | none |
| floors/floor-6-kernel-space-b | Kernel Space: one held test tone, a fifth above it, a precise tick | none |
| floors/floor-7-the-sink | The Sink: slow drips into a deep cistern over a red drone | none |
| floors/floor-8-bedrock-b | Bedrock: the breathing machine, interference stuttering through | none |
| hubs/hub-halcyon | Halcyon: an office, air handling, distant typing, a soft chime | key |
| hubs/hub-glassjaw | GLASSJAW: cold digital ticks, thin air, glass pinging | glassui |
| hubs/hub-kestrel | Kestrel: an operations room, a radar sweep and its return | none |
| hubs/hub-lantern | LANTERN: a radio room, the dial tuned, a numbers station (the game's `transmission()`) | none |
| hubs/hub-null-choir-a | NULL CHOIR: a slow choral pad in a stone room | none |
| families/ransomware-b-press-idle, -attack, -break | Ransomware, the hydraulic press: building pressure; a bolt driven home; a line bursting | tin, metal-l, punch-h; punch-m, plate-l; punch-h, glass-l, metal-l |
| families/worm-a-insect-idle, -attack, -break | Worm, insectoid: a swarm of chitin clicks; a lunge and a bite; a carapace cracking | click, key, scratch; key, soft-h, punch-m; glass-l, punch-h, key, click |
| families/ghostroot-a-whisper-idle, -attack, -break | Ghostroot, the whisper: whispering and reversed glass; a reversed breath and a hit; glass shattering backwards | glass-h, shimmer, bell; punch-h; glass-l, glass-h |

Credits for the samples these layer in (all CC0 1.0, public domain; credited anyway):

| Sample | Source | Author | Licence |
|---|---|---|---|
| city-ambience ("Small city ambience with traffic, motors, horn, siren, slight passerby hubbub") | https://freesound.org/people/felix.blume/sounds/705049/ | felix.blume | CC0 1.0 |
| punch-h, punch-m, soft-h, metal-h, metal-l, plate-h, plate-l, glass-h, glass-l, tin, mining, bell (Impact Sounds) | https://kenney.nl/assets/impact-sounds | Kenney | CC0 1.0 |
| scratch, glitch, glassui (Interface Sounds) | https://kenney.nl/assets/interface-sounds | Kenney | CC0 1.0 |
| relay, click (UI Audio) | https://kenney.nl/assets/ui-audio | Kenney | CC0 1.0 |
| subdrop, shimmer (StrongerFX procedural transitions) | https://github.com/smartpage/strongerfx-mcp | StrongerFX | CC0 1.0 |
| key (Keyboard Soundpack 1, Cherry KC 1000) | https://opengameart.org/content/keyboard-soundpack-1-typing-and-single-keystrokes | unicaegames | CC0 1.0 |
