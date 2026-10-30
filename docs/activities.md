# Activities: what to add for variety

A brainstorm with the designer (October 2026) on more things to do, at every scale: the fight, the room, the run, home,
the floor and the long term. This page keeps what was wanted, what was cut and why, so a later brainstorm doesn't
offer the cut ones again. Only the scanner is built (GAME_RULES.md "The scanner"). **Every one is prototyped first** as standalone applets (pages in the
session's scratchpad, never in the repo), shown as screenshots, before any of it goes in the game.

## The bar a new activity has to clear

- **It changes a decision.** A modifier you only put up with is tedium. If you still clear the server the same way, it
  isn't worth its rule.
- **It never asks a player to change class.** No rule favours one class or subclass: players keep the class fantasy
  they chose. A rule works with every class's core kit.
- **It doesn't assume a kit.** Some players one-shot parts; some have no support skills.
- **It rewards attention,** never punishes its absence (the standing rule: friction, not spikes).
- **One rule, not a subsystem.** No feature creep.

## Wanted: prototype these

| Activity | What it is | Open points for the prototype |
|---|---|---|
| **More puzzle rooms** | New boards beside Quarantine, Hunter chase, Cascade and Ping sweep. Named gaps first: **Defrag** (floor 5: slide fragments into one block), **Deadlock** (floor 6: a ring of processes each holding a lock; pick the release order so all finish), **Bit flip** (floor 8: Lights Out on a register, to a target word). New: **Packet routing** (rotate wire tiles to join a source to a sink, on the room map's dot grid), **Hex dump** (find the planted string in a dump), **Cryptogram** (a substitution-cipher note; letters you've solved stay solved on later boards) | Which read well at a glance; board size; what each pays (the puzzle rooms' one rule holds) |
| **The scanner** | **Built** (GAME_RULES.md "The scanner"): a radio button on the Map page opens a strip across the map's foot; sweep the dial by ear, reel the station in. Numbers stations pay lore for now (coordinates wait for off-map servers), pirates a market tip, distress calls a thread | Kept for later: *Bearing*, an Antenna knob and a teal beam from HOME across the map, a station fading outside ±25° of its source |
| **Your house** | A funny little ASCII house of your own, and ASCII furniture you collect for it. Cosmetic only (unlocks come from achievements and play, never server floors: see CLAUDE.md). Not tower defense. | The look; where it lives; how furniture is placed; where pieces come from |
| **Rivals** | Named, recurring runners, one per crew, who grow with you across the floors and remember your last meeting (wick has a line for it). On a server, a rival walks toward the vault; their lineup shows as 2 or 3 virus chips. Meeting them is a trainer battle: their viruses one after another, your Signal carrying over, and between fights they counter-pick (burn their first one down and the next brings a Patcher). First to the vault takes its contents; beat them and you take theirs too. You never lose anything. | The roster and their personalities; the lineup between fights; how a run with a rival on it reads on the map |
| **Leanings** | A server's one positive rule, shown on its card before you connect, that pays attention and works for every class: *Alternating bus* (+20% damage to a part you didn't hit last cycle), *Venting* (a part takes +30% the cycle after it fires), *Overkill* (damage past a part's last point carries into the next part), *Clean clock* (the Sync Window opens half the cycles), *Loud tells* (a read staggers a cycle longer). Never class-flavoured (no "burns tick harder"). | Which survive a check that every class's core kit gains about the same; the card's chip and the fight header's |
| **wick's card** | A 3×3 card of different activities (a Cascade win, an Exfil, a lair kill, a trade…). A line pays; a full card is a cosmetic. No timer: a finished line's three squares are replaced, weighted toward what you haven't done lately and what's open at your level. **Picked (prototype):** in Mail, a row above Contracts with a mini 3×3, the card in the reading pane; *Tiles* (a tile a square, lit amber when done, flips to its replacement). A done square's position keeps a corner notch through the swap; the full card is all nine notches. A finished line is a News line, not a page. | What a line pays; how squares are chosen |
| **Dead runner** | A room where a crashed hacker's session sits: their rig (a real build: class, subclass, loadout), one item from their stash, and their last log, which says what killed them (a hint about this server's Resident or an elite's tells). Sometimes their ghost session starts a thread. With real players, later: a player's disconnect leaves one. **Picked (prototype):** a **rare room** (★ like a rare spawn): one server in 25, at most one a server, never on your first servers; the stash (3 protocols, take 1) rolls like a rare spawn's loot. Chip: a cracked NET ID badge, the runner's handle on the plate, amber until taken. Card: the *session dump* (rig and log in one terminal block, cycle-stamped, their voice, no advice; the stash as rows with Take). | The log's lines per Resident and elite |
| **Off-map servers** | Small handmade servers found only from clues (the scanner, a dead runner's log, a cryptogram, wick), never by tracing. The Museum (retired viruses from old builds), a LOWLIGHT safehouse, a dev box (debug viruses with every number shown), the Graveyard (dead runners' sessions), a pirate station (the scanner's broadcasts). | How many; how a clue puts one on the floor map |

## Virus roster (prototyped and kept; Cavity to rework)

Variety across viruses, one rule each, with an answer in every kit.

| Virus | Kind | Rule | Note |
|---|---|---|---|
| **Adware** | Family, floors 1–2 | Spawns Ad parts that never attack; each live ad makes its main part hit harder; a broken ad pays a few credits | Must not be farmable: ads cap at 3 alive, stop spawning at cycle 12, and only the first 4 a fight pay. Kept: each Ad its own row with ¤ 4 (¤ 0 once 4 have paid) and a red *+3 ▸ POP* in the Popup's attack column; an *Ad spawner* row with *n/3 alive*, *¤ n/4 paid*, *+ AD*, *capped* and *ads end* |
| **Scareware** | Family | Some tells are bluffs; a bluff's chip flickers off the beat. Answer the real ones | Kept: a red beat lamp by the cycle; a real charge's strip pulses on it, a bluff's flickers off it. SIGINT on a bluff floats *BLUFF* and its cooldown is spent |
| **Spyware** | Family | A skill used twice in a row is learned (an icon on its part) and does less to it | Kept: per part, for the fight. Seen once: a dashed ○ code on the part and *○ seen* on the key; learned: a red ◉ code and *LEARNED · ½* (half damage, Crack 1 ◆ fewer) |
| **Journaler** | Strain | Every 5 cycles it rewinds its parts to 3 cycles before; a ghost bar shows where to | Kept: Integrity and ◆ go back to the start of the cycle 2 before; a broken part stays broken. A *Rewind* row with *● save* and *↺ rewind ▸ cN*; a hatched ghost on the bar; *↺ +N* on each part in the rewind column |
| **Molter** | Strain | At cycle 8 it molts into its v2 form: re-armed, one part more, better loot | Kept: a *Molt* row whose chip shows v2, +1 part and the new loot 3 cycles out, *+N ◆* on each part; HUD chips *v1*/*v2* and the loot. Broken parts stay broken |
| **Cocoon** | Part | No attack; hatches into a stronger part at cycle 6 | Needs more ◆ or Integrity than a usual third, or it's always broken first. Kept: 95 Integrity and ◆3 beside a 50-Integrity basic; a *hatch N* tag and a Hatch chip naming the Moth's Integrity, which keeps the Cocoon's damage |
| **Anchor** | Part | While it lives, no other part drops below 1 | Kept: no attack; a steel tether to every part, a steel floor line on their bars, *held at 1* and *−N · HELD* |
| **Mesh node** | Room virus | A part more for each live room beside it, its links drawn on the map | Kept: steel links to the rooms beside it, each with a *+1* node (dashed *+0* once cleared); its card lists a Node part per linked room |
| **Burner** (rework) | Strain | Each part lives 3 cycles, then is thrown away for a fresh one, its damage gone; a part broken in time isn't replaced | Was "deletes itself at cycle 10": boring. Kept: a 3-cell red fuse and *#n* on each part, staggered; *↻ fresh +N* in the column it's replaced |
| **Cavity** (rework) | Strain | A pressure gauge: each skill fills it, key 1 drains it. Over the line it heals; under it, it's Open. Pace yourself | Was "heals when you fire no skill": you always fire skills. Prototyped: key 1 alone stays Open and wins, so it needs a rework. Proposed, the *band*: Open only just under the line, and under the band every part patches 1 ◆ a cycle |
| **Museum classics** | Named elites | CREEPER, ELK, BRAIN, CHERNOBYL, SLAMMER, MORRIS: wanted, but each needs a mechanic not already discussed | — |
| **Rare daemons** | Daemons | A ★ rare and a legendary tier beside the common 40: sidegrades with a rule no common has. Sources open up (golden invaders, rivals' signatures, dead runners, the Museum, roamers); invasions stay the only source of the common 40. A small legendary set. Some are **native**: each network rolls its own, like native uniques, so the rest are found on other players' networks (a member's servers, co-op) | Profiles proposed: Metronome, Familiar, Rubber Duck, Paperclip, Shuffle, Archivist, Stray, Pay Day; rivals' Cutting, Auditor, Shh; legendaries Heisenbug, Maxwell, Kernel Panic, INIT. (Reaper is taken: a common.) Prototyped; picked: the Roster's ★ Rare and ★★ Legendary groups as **rows** like the commons (an unfound one names its source: *Native to nyx's network*, *KUDZU, after 3 wins*); a **hairline** violet frame with ★ on its corner (a legendary's double, ★★); cards in WoW grammar with the source muted last; Heisenbug marks every part you aren't targeting with a dashed violet **?** in the aim rail, which turns into **HB** on the part it hits. |

## Kept for later

- **Signal storm.** A front that crosses a floor over an hour. On a Mapped or held server it brings every room back at
  once with storm-touched viruses that drop more, so finished servers are where it pays.
- **Par.** A move count for a clear of a Mapped server. Only from a solver's true shortest walk (doubling back
  included), shown only once Mapped, and missing it shows nothing.
- **Fight ideas, not yet discussed:** fixtures (a neutral prop on the board: a capacitor, a coolant line, a loose
  cache); wired parts (break both within 2 cycles to short them); *Engage hot* (a visible third part for a better drop).

## Cut (don't offer again)

| Idea | Why |
|---|---|
| Room conditions (Overheating, Packet loss, Low bandwidth) | Tedium that doesn't change how you play. Mythic+ affixes work for Mythic+; roguelites like Slay the Spire leave them out |
| Live capture (leave a part at 10% and extract it) | Not wanted; hard on a kit that one-shots |
| Bystander (a process to protect in the fight) | Assumes support skills not every class has |
| Infighting (bait one virus into another) | Tedious |
| Overclock rack (pick a buff for the next fights) | Belongs to games where you blow everything up; this isn't one |
| Ripening cache | Feature creep |
| Class-flavoured server moods | Push people to switch class |
| Weaknesses by damage shape (burst, burn, helpers, spread, reactive) | A part weak to one shape favours the class that deals it |
| Trace-back after an invasion | Repeats systems already there |
| Daily seed | Out of scope for now |
| Home layout as tower defense | The house is a cosmetic, not a defence game |
| Port knocking | An intrusion metaphor |
| Rabbit (tiny copies that breed) | Too close to the Replicator |
| Negotiator (a deal at half Integrity) | Not wanted |
| Coalesce (fragments merge) | No decision: you kill the fragment every time |
| Beacon (calls allies for more loot) | Farmable |
| Held item (a visible protocol on a part) | Not wanted |
| Ballast (slows attacks while alive) | Not wanted |
| Magpie (gets richer the longer you wait) | Rewards waiting |
