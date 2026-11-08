# Chip themes

What each theme plays inside its chips (chipfx.mjs `THEMES`) and its strike into your bar (`chipStrike`). Rules:
docs/ui.md "Themed chips".

| Theme | Inside the chip | Strike | Parts |
|---|---|---|---|
| zap | fractal arcs over a bloom, hot spots at the edges | a forked bolt strobes into your bar | Pulse Node |
| lock | padlocks rise with depth, shackles snapping shut | padlocks arc over and clamp on | Encryptor |
| cipher | hex streams fall, a bright head over a fading tail | streams fly in head first and scatter | Cipher Block |
| ring | rings roll out from the icon | a beam, brackets lock on, the bar flashes | C2 Node |
| frost | dendrites branch in from the corners over a rime | the frost shatters | Cold Store |
| erase | the playhead eats a dither field | pixels fly off in wipe order, a dither sweeps the bar | Eraser |
| heat | flames lick up from the foot, white-hot cores, embers that pop | a comet-tailed fireball, flames run along the bar | Rig, Twin Rig, Hotspot, Volatile, Payload, Vendetta |
| crumble | glowing cracks branch in, hot tips, falling chips, dead pixels | cracks flash, glass shards tumble onto the bar, it cracks | Bad Block, Zip Bomb, Degausser, Recycle Bin, Junker |
| scramble | a sparse glyph field, a decoding wave, rows that tear | glyphs swarm to a band on the bar, decode and tear | Scrambler, Obfuscator, Prism, Packer, Decoy, Sandbox |
| thorn | hooked thorns spring from a bramble on both edges | a volley drives in, sticks and quivers, sparks | Thorns, Punisher, Predator, Opportunist |
| clock | a dial steps at +1; in Now its hand sweeps the cycle, a ruler fills along the foot | the hand winds, shoots to the bar, ticks ratchet out, a stop and a chime | Idle Timer, Countdown, Backlog, Accumulator, Trigger |
| strobe | light columns fire in chases and bursts, a flare on the big ones | three pulses chase across the bar, cones of light, the bar flickers | Strobe, Repeater, Jitter, Amplifier, Stunner |
| copy | a copier's light sweeps, outline copies lift off and sink back | four outlines fly over, stack on the bar, collapse into it | Replicator, Mirror, Fan-in, Spare, Mimic, Swap |
| scan | a laser line sweeps a hidden dot grid, brackets snap on finds | a laser fan rakes the bar, data bits rise, brackets snap | Scraper, Prober, Harvester, Leaker, Feeder, Tripwire |
| plate | plates slide in and clang shut over a hex shield, sparks, a ripple | the joined plate flies over and slams down, a hex ripple | Front End, Bodyguard, Mutex, Lockbox, Limiter |
| ledger | odometer reels tick over ruled lines, spinning as the cycle runs out | reels lock a number, its digits fly in, count down, a strike-through | Buffer, Cooler, Damper |
| mask | a line-drawn mask turns like a coin between two faces, eyes glinting | it flies over turning, lands frowning, eyes flare, it splits | Turncoat, Backtrace, C&C |

Every part in `FAMILIES` wears a theme; a part a family shares wears one theme in every family.
