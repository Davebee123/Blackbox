# Parts plan: more virus variety

Draft, October 20, 2026, for the designer's review. Phases P1 and P2 are built (Build phases); the rest is not.

Fights repeat too soon. Measured over 300 random fights a level (`selectEncounter(s, 'random', seed, { level })`): levels 1–2 meet 4 part kinds, 3–7 meet 7, 8–19 meet 10, and 20–50 meet 11, with nothing new after 20. Two of three slots never change (the Pulse Node and the family's signature are in every fight), there are only three families, and the third-part pool barely grows. The Cryptominer and the Wiper exist but only fight in special rooms.

This plan adds 8 basic parts, 23 third parts (21 of them floor natives), two families from the rooms engine, and fights of 2 to 4 parts. Every 2–3 levels from 1 to 50 brings something new, and the kinds you can meet go from 11 to 46.

## Principles

- **One part, one rule.** Each part changes one decision: what to hit first, when to hold, or what to save. If you can't say its rule in one sentence, it's two parts.
- **Show it, don't explain it** (docs/style-guide.md 0). Each rule reads on the board as an icon, a chip, a tether, a bar or a tell. The sentence lives in the tooltip and the Codex.
- **A Codex entry for every part**, with research as today (decoded at 3, its rule at 15, mastered at 60) and its own component.
- **Every class has an answer.** Every part names an answer for the Breaker, Bastion, Infiltrator and Operator at the level it opens (genome rule 4). Below level 10 that means the class core, Spike and the plays every kit has: kill order, hold, strip, hit a bare part.
- **No part only punishes.** Each one has a way out: break it, time it, or use a kind of damage it lets through. Reading it right should pay.
- **Friction, not spikes** (docs/progression.md, Power spikes). New parts make fights different, not harder. A fight at your level still costs about the same share of your Signal, however many parts it has.
- **Honest costs.** A third part costs genome budget points (1 to 3). A basic part is free because it's pressure-matched to the Pulse Node (below). Costs are set by the per-gene harness, not by guesswork (Calibration).
- **Names** are visual or mechanical, in computing words. No intrusion words (no keyholes, ways in or backdoors). Sentence case in text.

## Slots

| Slot | What it is | Today | After |
|---|---|---|---|
| Basic | The family's plain attacker or guard. One in every fight (two in a duplicate fight). | Always the Pulse Node | 3–4 per family, picked by the roll |
| Signature | The family's own threat. In most fights, not all (Decisions 1). | Encryptor, Replicator, Scrambler | + the Rig (Cryptominer) and the Degausser (Wiper) |
| Third | A rule part from the gene library. 0–2 a fight. | 7, opening at 3, 4, 8 and 20 | 30, opening every 2–3 levels |
| Native | A third part first met on one floor, and weighted there. | none | 21 of the 30 thirds |

## Basic parts

Pressure-matched: a basic deals about the Pulse Node's damage over 20 cycles (`pressureOf`, within 5%, after the Block a level's blues carry). A basic with no attack is matched by the Signal a fight costs instead (within 3 points in the harness). So a basic changes the rhythm of a fight, not its size, and costs no budget.

Numbers are at enemy level 6, before trims, like GAME_RULES.md Families (4% a level).

| Part | Families | Opens | Integrity, ◆, attack | Rule | Board |
|---|---|---:|---|---|---|
| Pulse Node | R, W, G, Cm | 1 | 34, ◆, Surge 14 every 4 | As today. | As today |
| **Accumulator** | R, Cm, Wp | 1 | 30, ◆, Discharge 21 every 6 | One big hit every 6 cycles. It never carries a charge. | A charge bar on its row that fills to a bolt |
| **Strobe** | W, G, Cm | 1 | 26, bare, Tick 4 every cycle from 2 | A small hit every cycle, so your Block counts on every one. | A cell in every column, a blinking light |
| **Repeater** | W, G, Wp | 3 | 32, ◆, Double Tap 8 + 8 every 5 | Two hits on back-to-back cycles, as one move: one cut cancels both, one delay moves both. | Two cells joined by a bracket |
| **Buffer** | R, Wp | 3 | 24, bare, no attack | Every 3 cycles it shields the part below it for 10. The shield takes command hits only; burns and helpers go under it. | A tether with a shield node; a steel segment on the target's bar |
| **Prism** | G | 3 | 30, ◆, veiled, Spread 3 × 6 every 5 | Its volley splits into three hits on the next three cycles. A cut stops the rest. | Three thin cells in a fan |
| **Cipher Block** | R | 5 | 30, ◆, Cipher 8 every 4 | Hits 2 harder for each point of encryption on you. | Its number climbs with your Encrypted status; a key mark on the cell |
| **Fan-in** | W | 5 | 30, ◆, Fan-in 6 every 4 | Hits 3 harder for each fragment on the board. | A line from each fragment to its cell |
| **Obfuscator** | G | 5 | 22, ◆, no attack | While it lives, every part stays veiled, even bare. Tag still shows timers. | A smoke tether to each veiled row |
| Cooler | Cm | 9 | 26, ◆, no attack | As in the rooms: break the Rig first and it takes over the Hash, uncooled. | As in the rooms |
| Eraser | Wp | 19 | 34, ◆, Zero 12 every 4 | The Wiper's plain attacker (the rooms' Eraser). | As in the rooms |

Each family's basics: Ransomware Pulse Node, Accumulator, Buffer, Cipher Block. Worm Pulse Node, Strobe, Repeater, Fan-in. Ghostroot Pulse Node, Strobe, Prism, Obfuscator. Cryptominer Cooler, Pulse Node, Strobe, Accumulator. Wiper Eraser, Accumulator, Repeater, Buffer.

Basics keep their own timing under any attack set; a set only nudges their first attack. Overcharge rides the basic with the biggest plain hit, never the Accumulator; with a basic that has no attack, it rides a third part that has one, or doesn't roll.

## Third parts

Bold is new. Unlock levels sit inside their floor's band, so a native is first met on its floor. Cost is the proposed genome budget, before the harness.

| Part | Slot | Families | Opens (floor) | Integrity, ◆, attack | Rule | Tell | Board | Cost |
|---|---|---|---|---|---|---|---|---:|
| Lockbox | third | R | 3 (1) | 16, ◆, none | As today: wards the Encryptor. | — | Ward tether | 2 |
| Mirror | third | W | 3 (1) | 18, ◆, Splice 3 / 4 | As today: twinned with the Replicator. | — | Reboot chip | 2 |
| Decoy | third | G | 4 (1) | 18, ◆, veiled, none | As today: mirrors every 4th cycle. | — | Mirror chip | 3 → 2 |
| **Zip Bomb** | native | R, W | 5 (1) | 14, bare, none | Break it and a 2-cycle fuse burns, then it hits you for 20% of your max unless a shield or ◆ takes it. A fight that ends puts the fuse out. | The fuse | Fuse spark on its row, 2, 1 | 2 |
| **Hotspot** | native | R, G | 6 (1) | 14, bare, none | A command hit on it turns the virus's next attack 2 or more cycles away into a charge. Burns and helpers don't set it off. | The charge it makes | Amber glow; a dashed line to the attack it would charge | 1 |
| Mutex | third | R | 8 (2) | 18, ◆, none | As today: locks the Encryptor. | — | Lock tether | 3 |
| C2 Node | third | W | 8 (2) | 18, ◆, Beacon 3 / 4 | As today: commands the fragments. | — | Command tether | 2 |
| Mimic | third | G | 8 (2) | 18, ◆, veiled, none | As today: plays your command back on its beat. | Its beat | Beat chip | 3 |
| **Idle Timer** | native | R, Cm | 9 (2) | 20, ◆, none | Counts the cycles since the signature part last took a command hit. At 5, every part re-arms to full ◆. | Chip at 2 left | Countdown pips on the signature's row | 2 |
| **Front End** | native | G, R | 10 (2) | 22, ◆, none | While it wears ◆, your single-target commands at its partner land on it. Burns, helpers and area hits go through. | — | A tether that bends your hit onto it | 2 |
| **Backlog** | native | W, Cm | 12 (2) | 20, ◆, Ack 6 / 4 | When its hit lands, the skill you fired that cycle cools down 2 cycles longer. | SYN mark on its cell | +2 on the key it hits | 2 |
| **Limiter** | native | R, Wp | 13 (3) | 24, ◆, Ping 3 / 3 | No single hit takes more than 20% of its max. | — | A cap line on its bar | 2 |
| **Spare** | native | W, G | 14 (3) | 2, ◆◆◆, none (P2 rework; was 20, bare) | Sleeps off the timeline under 3 ◆. When the signature breaks, it boots 2 cycles later at 60% of the signature's max, with its attack, and drops its ◆. | Boot chip | A dim standby row | 2 |
| Tripwire | third | R, Wp | 16, was 20 (3) | 18, ◆, Ping 3 / 3 | As today: break it last. | — | Tripwire tag | 2 |
| ~~Shunt~~ | cut (P2 rework) | W, Cm | 17 (3) | 24, ◆, none | Cut: half of what its partner took moved onto it, which overlapped the Limiter. | — | — | — |
| **Scraper** | native | R, Wp | 19 (4) | 22, ◆, Scrape 8 / 4 | When it lands, it takes your shield, your ◆ and your timed buffs, and adds up to 2 ◆ to itself. | Takes-buffs mark | An arrow from your shield to its ◆ | 2 |
| **Packer** | third | G, Cm | 20 (4) | 20, ◆, none | Its rolled parts show as "Packed part" (name, tags, telegraphs, rule, attack name ???) and its rolled rules as ??? chips until the Packer breaks, even ones your Codex knows. | — | ??? chips and Packed parts that unpack when it breaks | 1 |
| **Bad Block** | native | Wp, G | 21 (4) | 22, ◆, Bad Write 7 / 4 | When it lands, your next heals lose up to 10% of your max. Cleansed like Corrupted. | — | Cracked cells on your Signal bar | 2 |
| **Damper** | third | Cm, Wp | 23 (4) | 26, ◆◆, none | While it wears ◆, it takes no damage from one kind: burns, helpers or area hits (its tag says which). That kind still breaks its ◆. | — | The dropped kind's icon, crossed | 2 |
| **Cold Store** | native | Wp, R | 24 (4) | 30, ◆, Chill 16 / 5 | Starts frozen: off the timeline and untouchable for 5 cycles, then joins. | Thaw chip | Frosted row with a thaw bar | 2 |
| **Reactor** | native | Cm, R | 26 (5) | 28, ◆, Flare 6 / 4 | Its Flare hits 2 harder for each command hit it took since the last one. Burns and helpers don't feed it. | — | A gauge that rises with each hit | 2 |
| **Latch** | native | G, Wp | 28 (5) | 24, ◆, Pin 5 / 3 | While it lives, the same skill twice in a row deals half the second time. Spike is exempt. | — | A latch mark on your last key | 2 |
| **Tarball** | native | W | 30 (5) | 24, ◆, none | When it breaks, it unpacks into 2 fragments. | — | A box with a ×2 chip | 1 |
| **Monitor** | native | R, Cm | 32 (6) | 26, ◆, none | Once a fight, each other part that drops under 25% gets 2 ◆ back and a shield of 10% of its max. | — | A tether to each part, a pip that goes dark once used | 2 |
| **Interrupt Mask** | native | G, Wp | 34 (6) | 18, ◆, none | While it lives, the part below it has no interrupt ticks. | — | Greyed ticks under a mask tether | 2 |
| **Bus** | native | W, R | 36 (6) | 28, ◆, Clock 6 / 4 | While it lives, other parts can't drop below 1 Integrity. When it breaks, every part at 1 breaks with it. | — | Parts at 1 hang from a tether to the Bus | 3 |
| **Reservoir** | native | W, Cm | 39 (7) | 30, ◆, none | Every 4 cycles it pours 20% of its own current Integrity into the most damaged part. | Pour chip | A water level on its row; a pour arrow | 3 |
| **Bleeder** | native | Wp, G | 41 (7) | 18, bare, none | While it lives, you lose 1% of your max Signal a cycle, 2% from cycle 7 and 3% from 13. | — | Drips on your Signal bar | 2 |
| **Bootloader** | native | all | 44 (8) | 34, ◆◆◆, Boot 10 / 5 | Break it and every other part's rule goes dark: a Lockbox stops warding, a Mutex stops locking. | — | A power tether to every rule chip | 3 |
| **Consensus** | native | all | 47 (8) | 26, ◆, none | Every 4 cycles the parts vote: if two or more others are above half, they all attack together that cycle. | Volley chip | Vote pips on each row | 3 |

Family short forms: R Ransomware, W Worm, G Ghostroot, Cm Cryptominer, Wp Wiper.

Left out on purpose: Botnet Recruit and Antivirus Sweep (genome.md) change a decision for only the two classes with helpers or burns. Clock glitch, Stateless and Ransom timer stay passive rules for a later mutation batch.

## How each class answers

Class core (levels 1–7): Breaker Overload, Flood, Exploit, Crack. Bastion Rate Limit, Firewall, Purge, Retaliate. Infiltrator Inject, Backdoor, Keepalive, Tag. Operator Deploy, Hook, Spawn, Botnet. Subclass skills appear from 10.

| Part | Breaker | Bastion | Infiltrator | Operator |
|---|---|---|---|---|
| Accumulator | Crack and Overload it before its bar fills | Firewall the Discharge; Rate Limit halves it | Leave it; burn the signature first | Hook it; helpers break it before cycle 6 |
| Strobe | One Overload breaks it (bare) | Firewall soaks four ticks | Inject: every tick lands on bare code | Spawn and Deploy |
| Repeater | Cut it across a tick; Brace from 10 | Firewall soaks both hits | Backdoor across a tick | Hook, then helpers across a tick; Jam from 10 |
| Buffer | Overload it first (bare) | Purge burns under the shield | Inject burns under it | Helpers hit under it |
| Prism | Cut the volley on its first hit | Firewall; Block counts three times | Tag shows the volley; Backdoor cuts it | Helpers cross a tick |
| Cipher Block | Encryptor first | Purge clears the encryption, and the Cipher shrinks | Backdoor the Encryptor through ◆ | Encryptor first, with Botnet |
| Fan-in | Flood the fragments; Fork Bomb from 10 | Retaliate; Multicast from 10 | Kill the Replicator; its fragments go with it | Botnet on the fragments; Garbage Collect from 10 |
| Obfuscator | Crack and Overload it first | Rate Limit it, or play by the ticks | Tag shows any part's timers | Helpers break it |
| Rig | Let it cook, then burst; crossing its ticks vents it | Rate Limit the Hash | Steady burns while it cooks | Helpers while it cooks |
| Degausser | Fire Overload just before the Wipe | Fire your big key first; Retaliate and Purge after | Inject before the Wipe; Backdoor after | Deploy before; Spawn and Hook after |
| Zip Bomb | Break it last | Firewall up, then break it | Break it last | Break it last; Barrier from 10 |
| Hotspot | Hit it when its charge lands on a part you can cut | Rate Limit the charged hit | Inject it: burns don't set it off | Helpers on it: they don't set it off |
| Idle Timer | Exploit the signature every 4 cycles | Retaliate the signature | Tag the signature | Hook the signature |
| Front End | Crack it bare; Fork Bomb from 10 | Purge the partner | Inject the partner | Deploy on the partner |
| Backlog | Shatter or Spike on its cycle | Retaliate (no cooldown) | Spike or Opening | Spawn (1-cycle cooldown) |
| Limiter | Overvolt's two strikes, Shatter's shards | Purge ticks | Burns | Helpers |
| Spare | Crack its ◆ while it sleeps, or one big hit once it boots | Rate Limit's chits while it sleeps, or let it boot | Inject's ticks break its ◆ | Helpers break its ◆, one each |
| Scraper | Brace and Momentum after it lands | Firewall after it lands, not before | Null Route makes it miss | Barrier after it lands |
| Packer | Scan first, or Crack and break it | Scan first, or Rate Limit it | Scan first, or Backdoor it | Scan first, or helpers on it |
| Bad Block | You barely heal: break it when convenient | Heal before it lands; Purge clears it | Rotate Keys clears it | Kill order; Barrier instead of heals |
| Damper | Crack strips it | Rate Limit strips it | Inject's ticks strip it, even when dropped | Helpers strip it, even when dropped |
| Cold Store | Break the others first; save Overload for it | Firewall its first Chill | Burn the others, then it | Kill order; helpers ready for the thaw |
| Reactor | One big hit, then switch | Purge it | Burns | Helpers |
| Latch | Alternate keys | Alternate keys | Alternate keys | Alternate keys |
| Tarball | Break it with Fork Bomb ready, or last | Multicast after it breaks | Wormable or Propagate | Garbage Collect |
| Monitor | Break it first, or Thermal Throttle past 25% | Break it first | Detonate a part past 25% | Kill Switch past 25% |
| Interrupt Mask | Break the Mask; Segfault the charges | Suspend, Quarantine | Shadow Copy, Null Route | Jam, Spoofed ACK |
| Bus | Pile on the others, then pop the Bus | Break the Bus first | Propagate, then the Bus | Fan-out, then the Bus |
| Reservoir | Break it first | Break it first with Rate Limit | Rootkit Implant on the part it pours into | Cache Poison spoils the pour |
| Bleeder | Overload it (bare) | Rate Limit it | Backdoor it | Deploy on it |
| Bootloader | Crack, Shaped Charge | Rate Limit | Polymorph, Backdoor | Fork |
| Consensus | Spread with rm -rf | Failover | Propagate | Fan-out |

The harness checks every row for every subclass at the part's level (rule 4) before a part ships.

## New families

| | Cryptominer (XMRIG) | Wiper (SHAMOON) |
|---|---|---|
| From | Level 9, floor 2 (Backhaul) | Level 19, floor 4 (Coldline) |
| Crew | GLASSJAW (its hub is on floor 2; it already writes the Hashrat's miner) | TOLLGATE, its second family (a wiper is ransomware with no key) |
| Also fielded by | TOLLGATE | GLASSJAW |
| Threatens | Integrity at home, Signal on a run | The same |
| Signature | **Rig**: 44, ◆, Hash 4 every 2, 2 harder each landing; heats 10 a cycle; at 100 heat it overheats and burns out. Its ticks vent it. | **Degausser**: 38, ◆◆, Wipe 6 every 5: takes your strongest ready key for 3 cycles. Key 1 and SIGINT are never wiped. |
| Basics | Cooler, Pulse Node, Strobe, Accumulator | Eraser, Accumulator, Repeater, Buffer |
| Lean | Clock and tempo: a fight that runs hot | Tempo: hold your big key |
| Natives it carries | Idle Timer, Backlog, Reactor, Monitor, Reservoir | Limiter, Scraper, Bad Block, Cold Store, Latch, Bleeder |

They are the rooms engine's bodies (`families.mjs`), moved from `ROOM_FAMILIES` into `FAMILIES`, so the rooms playtest and the real game read one definition. Their attack sets come with them. Networks lean toward five families once the floor allows them; invasions, swarms and rogue servers send them like the others. No strains for them in this plan. The Trojan stays a rooms body and the Exfil stays a runner.

## Unlock cadence

| Floor | Band | Levels with something new | New kinds |
|---|---|---|---|
| 1 The Sprawl | 1–8 | 1, 3, 4, 5, 6 | Accumulator, Strobe; Buffer, Repeater, Prism, Lockbox, Mirror; Decoy; Cipher Block, Fan-in, Obfuscator, Zip Bomb; Hotspot |
| 2 Backhaul | 7–14 | 8, 9, 10, 12 | Mutex, C2 Node, Mimic; Cryptominer (Rig, Cooler), Idle Timer; Front End; Backlog |
| 3 The Stacks | 13–20 | 13, 14, 16 | Limiter; Spare; Tripwire |
| 4 Coldline | 19–26 | 19, 20, 21, 23, 24 | Wiper (Degausser, Eraser), Scraper; Packer; Bad Block; Damper; Cold Store |
| 5 Deep Core | 25–32 | 26, 28, 30 | Reactor; Latch; Tarball |
| 6 Kernel Space | 31–38 | 32, 34, 36 | Monitor; Interrupt Mask; Bus |
| 7 The Sink | 37–44 | 39, 41 | Reservoir; Bleeder |
| 8 Bedrock | 43–50 | 44, 47 | Bootloader; Consensus |

The longest gap is 3 levels. Every floor brings two or three new kinds.

**Kinds you can meet** (every family open at the level, measured the same way as today; *a → b* is the band's first level to its last):

| Levels | Before | After |
|---|---:|---:|
| 1–2 | 4 | 6 |
| 3–7 | 7 | 11 → 17 |
| 8–12 | 10 | 20 → 25 |
| 13–19 | 10 | 26 → 32 |
| 20–26 | 11 | 33 → 37 |
| 27–35 | 11 | 37 → 41 |
| 36–44 | 11 | 42 → 45 |
| 45–50 | 11 | 45 → 46 |

## Fight composition

**Part count** by level, for a wild fight:

| Levels | 2 parts | 3 parts | 4 parts | Duplicates |
|---|---:|---:|---:|---|
| 1–2 | 100% | — | — | none |
| 3–7 | 30% | 70% | — | none |
| 8–15 | 15% | 70% | 15% | from 10: 1 in 10 fights with 3 or more parts doubles its basic |
| 16–30 | 10% | 60% | 30% | 1 in 8 |
| 31–50 | 10% | 50% | 40% | 1 in 6 |

- A fight is one basic (or two copies), usually the signature (Decisions 1; a second third takes its slot when it's missing), and 0–2 thirds.
- **The total stays the same.** A fight's Integrity and pressure come from its level and grade, not its part count. Parts share it: a 2-part fight's parts are bigger, a 4-part fight's smaller (today's third-part trim, 0.85, becomes a share by count).
- **Duplicates** are only ever a basic: two Strobes, or two Accumulators a cycle apart. Each copy has 60% of one's Integrity and damage. They're named for targeting (*Strobe*, *Strobe 2*). A rule part never doubles, so no rule stacks.
- **The roll** moves wild viruses onto `rollGenome`: the basic is drawn from the family's open basics (free), then thirds are drawn by weight from the family's open pool within the budget, struck when they break a compatibility rule (one punishment per axis, one beat). The budget opens at level 3 (2 points) instead of 4, so the level-3 thirds fit.
- **Floors weight their natives**: on its own floor, a native's weight is ×3 (on top of its author's weight). Elsewhere it rolls at ×1 once its level allows it.

| Fight | Parts | Thirds | Natives |
|---|---|---|---|
| Wild (rooms, couriers, bounties) | 2–4 by the table | by budget | ×3 on their floor |
| Elite | Always 3–4 | budget +3 | always one of its floor's |
| ★ rare spawn | Always 3–4 | budget +2 | always one of its floor's |
| Guard post, ICE | Their two parts | From floor 3, half bring Kestrel's Idle Timer | — |
| Resident, lair and named bosses | Hand-written, unchanged | The floor 3–8 bosses, when built, take their floor's natives | — |
| Invasion (raider, pair, pack) | As wild; a pack's viruses 2 parts each | by budget | ×3 on the source's floor |
| Champion invasion | 4 | budget +2 | as wild |
| Hub swarm | 2 each | none | — |
| SPRAWL-00 strays, fixtures, strains | Unchanged (body only; strains keep the Pulse Node their rules name) | none | — |
| Exfil | Unchanged | none | — |

**Gentle first fights.**

- Levels 1–2: two parts only, no third, no mutation, no tell. The basic is the Pulse Node 2 fights in 3.
- **One stranger a fight.** A fight never holds more than one part you've never met (research 0), at any level. A new kind's first fight has 2 or 3 parts, never 4.
- The first third (level 3) arrives in a 3-part fight with a basic you already know.

## Damage profiles

The designer's decision on P1's difficulty drop: every virus has a basic DPS profile, not a random one. **Every family deals the same expected damage over a typical fight at its level; only the shape differs** (the designer's follow-up). The budget is split into three shapes, and a fight's parts share it out by role, so its difficulty doesn't depend on which parts rolled.

| Shape | What it is | Carried by |
|---|---|---|
| **steady** | regular hits | the Pulse Node, the basics, the thirds' small hits, the Replicator's fragments |
| **ramp** | damage that grows the longer the fight runs | the Encryptor's stacks |
| **burst** | big hits a cut can stop, and what comes with them | the Scrambler's hit and its Scramble |

- **A typical fight** (`PARTS.horizon`). The budget is measured over the fight length the balance harness sees, not over a flat 20 cycles: ramp is back-loaded, so over 20 cycles Ransomware's Encrypts counted for far more than they deal in a real fight. The pre-P1 wild fights averaged 9.7 cycles at level 10, 10.5 at 18, 10.3 at 30 and 8.4 at 50 (every subclass, 40 fights each). The horizon is 10 cycles to level 39, 9 at 40–49 and 8 from 50.
- **The budget** (`data.mjs` `profileBudget`, × `PARTS.budget`, 1). It is the average of the three families' pre-P1 fights (the Pulse Node and the signature) over the horizon, in nominal damage before the level's damage scale. An Encrypt counts from the cycle after it lands, as it ticks.

  | Family | Over 20 cycles (P1's first profiles) | Over 10 cycles before | Over 10 cycles now |
  |---|---|---|---|
  | Ransomware | 222 (11.1 a cycle) | 56 (5.6) | 59.7 (6.0) |
  | Worm | 140 (7.0) | 56 (5.6) | 59.7 (6.0) |
  | Ghostroot | 130 (6.5) | 67 (6.7) | 59.7 (6.0) |

  Over 8 cycles (level 50), the families were 44, 56 and 52, and now each is 50.7. The "about 4 a cycle less" for Worm and Ghostroot came from the 20-cycle count. Over a real fight the three were already close.
- **Shapes** (`PARTS.profile`, shares of the budget, each family's pre-P1 split over 10 cycles). Ransomware is half steady and half ramp: it starts lower and climbs, and lands on the same total over a normal-length fight. Worm is all steady, and wide: its fragments are part of it. Ghostroot is a third steady and two thirds burst.
- **Roles** (`PARTS.roles`). The Encryptor is ramp, the Scrambler burst, and every other attacker steady. A shape the family's profile doesn't have counts as steady there, so the Accumulator is steady on Ransomware. A basic counts as one Pulse Node, since the basics are pressure-matched to it.
- **The share-out.** Each role's parts scale to its share, within `PARTS.pressure` (0.85 to 2.5). A special's hit scales with its role, while its Scramble and fragments stay as they are. A Fan-in with no Replicator to feed it counts only its own hits, and a Cipher Block counts a Ratchet's steps as Encrypts. Anything left over goes onto the other attackers. A part that hits every cycle or two (a Strobe) takes only half the lift (`PARTS.fast`), because Block takes the same amount off every hit. The spike cap (`PARTS.cap`, 1.3 Pulse Nodes a hit) holds: past it, a part hits more often instead.
- **A missing role is never lost.** It moves onto the basic:
  - **No Encryptor:** the ramp becomes a **Ratchet**, the basic's own stack on the Encryptor's clock. The stack starts at cycle 4 and grows a step every 5 cycles while the basic lives. Breaking the basic ends it, and Purge or Rollback starts it over. The board shows it as an amber hatched chip in the basic's row (−N ratchet), with that cycle's size in each column and a ▲ ratchet tag under its name. Every Ransomware fight keeps its "kill it before it snowballs" clock.
  - **No Scrambler:** the basic's hits take the Scrambler's hit, and Scramble you at most once every 4 cycles.
  - **Nothing steady** (a Buffer or an Obfuscator beside the signature, with thirds that don't attack): the basic takes its family's Surge, at the steady share. Otherwise the fight is one attacker, and a cut answers all of it. The Buffer's shield and the Obfuscator's veil stay. **Decided** by the designer: "the virus needs to deal damage".
- **◆ are the family's too** (`PARTS.armor`). A rolled fight wears the ◆ that the Pulse Node, the signature and a third would wear at its level, and half of the shortfall from level 14. What its own parts lack (no signature, a bare Zip Bomb, Hotspot or Strobe) goes onto its armored parts, the biggest first. Most of P1's drop came from here: at level 10 a fight without its signature lost the signature's 5 ◆, and the thirds that took its place wear few or none.
- **Integrity** (`PARTS.bulk`) stays at the family's two core parts ×1.06 from level 3. The ×1.5 step from level 14 only made up for the missing ◆, so it is gone.
- **The Mimic weighs 3 in the roll** (`PARTS.weight`), which puts it in about half the Ghostroot fights again, as before P1. Going quiet on its beat is where reading tells pays most: in 60 fights at level 18 the gap was 13 to 17 points on a Mimic fight and about 0 elsewhere.
- **Measured** (balance.mjs's fights, 80 random wilds × 2 seed sets, Signal lost against pre-P1). The overall average matches pre-P1. From level 18 every subclass is within about 5 points, except four: the Hijacker at 18 (34 against 46, pre-P1's own outlier and a known gap), the Warden at 30 (−7), and the Overclocker (+7) and Hijacker (−7) at 50. At level 10 the classes spread: the Sysop loses 8 points less, the Herder 16 and the Hijacker 13, while the Payload loses 8 more and the Phantom 13. The new thirds and one-big-basic fights suit helpers and stuns, and punish burst. Plain Spiking wins 37 of 160 at level 10 (36 before; 99 at P1's first cut). Reading tells pays 1.1 points a fight on the balance test's sets (2.7 before; about 0 without the Mimic's weight). Equal damage isn't equal Signal lost: every subclass's average Signal lost by family (30 fights each) is 27%, 32% and 36% for Ransomware, Worm and Ghostroot at level 10 (25%, 34% and 37% before), and 21%, 27% and 25% at 30 (25%, 22% and 24% before). A ramp can be broken before it climbs, and a Scramble costs more than its count.

## Calibration

- **Basics:** `pressureOf` within 5% of the Pulse Node over 20 cycles, and the genesim harness within 3 points of a Pulse Node fight's Signal lost, for the planner at the level it opens and at 30.
- **Thirds:** the per-gene harness (docs/genome.md 11 and 15.4) sets each cost. Target 2 to 6 points of Signal lost a fight per cost point, answering worth 3 or more, ignoring 20 at most, and every kit's answer winning at least as often as ignoring. A part outside the target doesn't ship; its numbers or its cost change first. New parts join the `todo` calibration test that lists today's misfits.
- **Spike cap** (rule 5): the Accumulator, Cold Store, Scraper and Consensus volley at most 45% of a same-level player's Signal in blues, and the worst three cycles at most 75%.
- **Planner rules:** each new gene gets its `bot` answer (focus, quiet, strip, window, delay, switch), so the balance bot plays them as a skilled player would.

## Build phases

| Phase | Contents | Tests and checks |
|---|---|---|
| **P1: the basic slot and levels 1–12** (built) | The 8 basics on every home family; wild viruses rolled by `rollGenome` with the budget from 3; 2–3 parts (4 from 8); duplicates from 10; one stranger a fight; Zip Bomb, Hotspot, Idle Timer, Front End, Backlog; the Decoy's cost to 2. GAME_RULES.md's "two per virus" line and the Families table updated. | A new `parts.test.mjs`: 300 fights a level give at least the kinds table, no 4-level window without a new kind, levels 1–2 always two parts, one stranger a fight. `pressureOf` and genesim bounds per basic. `balance.mjs` class band at 1, 10 and 18 (85% wins, 10–25% Signal lost). `genesim.test.mjs`, `degenerate.test.mjs` (two plans for every new combination), `codex.test.mjs` (a card, research and a component per part), `tips.test.mjs` (one tip per new board element: the fuse, the bent tether, the countdown). |
| **P2: floors 2–4 and natives** (built) | Floor native weighting; elites and ★ always bring a native; the 4-part share from 16; Kestrel's Idle Timer on guards from floor 3; Limiter, Spare, Tripwire to 16, Scraper, Packer, Bad Block, Damper, Cold Store (the Shunt was built, then cut: the P2 rework below). | `floors.test.mjs` (natives ×3 on their floor), `balance.mjs` at 18 and 30, the hard slice, genesim per gene, rule 4 for every subclass, spike cap. |
| **P3: two new families** | The Cryptominer (floor 2, level 9) and the Wiper (floor 4, level 19) into `FAMILIES`, with crews, network lean, invasions, rogue servers, Codex pages and tips; their thirds join the existing pools. | `families.test.mjs`, `genome.test.mjs` (compatibility of their core genes), `roomsim.mjs` unchanged for the rooms playtest, `balance.mjs` at 10, 18 and 30, the kinds table again. |
| **P4: deep floors** | Reactor, Latch, Tarball, Monitor, Interrupt Mask, Bus, Reservoir, Bleeder, Bootloader, Consensus; the 4-part share from 31. | `balance.mjs` at 30 and 50 (watch the Phantom's opening burst against smaller 4-part parts), genesim, spike cap, the kinds table to 50. |

**P1 as built** (`dist/parts.mjs`, `parts.test.mjs`). The 8 basics on the three home families (the Cryptominer's and the Wiper's come with P3), the roll above with the signature by the designer's decision 1, one stranger a fight, duplicates from 10, and the Zip Bomb, Hotspot, Idle Timer, Front End and Backlog. Where it differs from the tables above, tuned by the harnesses: the Accumulator's Discharge is 1.25 Pulse Nodes every 5 (at 1.5 every 6 it went past the spike cap), the Buffer wears ◆ and shields for half its own Integrity (30, ◆; bare, it was one hit and the fight was cheap), a basic with no attack is its signature's fallback (degenerate.test.mjs), a fight's damage is its family's profile shared out by role (Damage profiles, above) and its Integrity ×1.06 from level 3 (`PARTS.bulk`), the Backlog's Ack is 3 every 4 (at 6 it cost 9.7 points a cost point), the Zip Bomb and the Hotspot ship as written though the harness measures them cheap (answered, by breaking it last or by burns, each costs about a point of Signal a cost point; they join the calibration `todo`, as raising them moved the class band), a missing signature's charge becomes a plain Overcharge, and at levels 3–4 the signature stays when no third can take its slot. Wild viruses roll their thirds through `rollGenome` (by the budget, 2 points from level 3) but keep their mutation roll as before. Every number is a named constant in `PARTS`, shown and set at runtime with `developer parts`. The difficulty drop P1 first shipped with (at level 10 the Warden lost 13% where it had lost 25, and plain Spiking won 20 of 24 where it had won 9) is answered by the designer's decision: **damage profiles** (above). The family's profile is shared out by role, a missing role moves onto the basic (the Ratchet, a Scramble on Ghostroot's hits), and the fight wears the family's ◆. Knobs that stay neutral: `carve` (how much of the thirds' Integrity comes out of the basic's and signature's), `hit` (a level step on every rolled hit) and `ratchet` (the Ratchet's clock; null is the Encryptor's).

**P2 as built** (`dist/parts.mjs`, `parts.test.mjs`, `floors.test.mjs`). The floor weighting (`PARTS.floor`, ×3; a native is a gene with a `floor`, the P1 five included), a native on every elite and ★ rare spawn (`PARTS.native`; a ★ rare spawn also brings 3 parts or more and 2 more budget points, `PARTS.rare`), the 4-part share from 16 (`PARTS.count`), Kestrel's Idle Timer on half the guard posts and ICE from floor 3 (`PARTS.kestrel`), the Tripwire from 16, and the eight new parts, each with its board mark, tip, Codex card, component and playtest page. A fight's floor is its server's (an invasion's, its source's; SPRAWL-00 is floor 1), else your floor at its level. A traced server's room thirds are drawn by the same weights when it is built, and its elites and ★ take a native of their floor in place of the room's third; the rest of a server's room fights stay as they were (fixed thirds, not the parts roll). Where it differs from the tables above, tuned by the harnesses:

- **Costs** (`node genesim.mjs genes`, six seeds, points of Signal a fight and a cost point). Limiter 3 (15.3, 5.1; at 2 it was 8.3 a point), Scraper 3 (16.6, 5.5), Bad Block 3 (12.8, 4.3), Cold Store 2 (10.7, 5.4), and Spare, Shunt, Packer and Damper 1, the lowest a part can cost, where they still measure under 2 a point: the Spare −1.7 (its Integrity comes out of the others' and it sleeps till the signature breaks; −2.4 after the rework), the Shunt 0.9 (since cut), the Packer 0.1 (the bot reads every rule anyway; a person doesn't) and the Damper −1.8. They join the calibration `todo`, as the Zip Bomb and the Hotspot did, and no answer is worth 3 points yet (the Bad Block's cleanse saves 1.3). The suite's smaller sample flags the same five and the Cold Store at 6.1.
- **The Scraper's Scrape is 4 every 4** (at 8 it cost 26.8 points a fight), and it takes what is left of your shield once its hit is through it, so a shield still stops the hit itself; your ◆ it takes before the hit. It wears at most 2 ◆ over the whole fight, not 2 a landing.
- **The Bad Block's Bad Write is 4 every 4** (7) and **the Cold Store's Chill 10 every 5** (16): both cost more than their points. The Chill comes at the earliest 2 cycles after the thaw, so its Thaw chip is a warning.
- **Weights** (`PARTS.weight`): the Mimic 4 (3 in P1: the floor-2 natives' ×3 and P2's three new Ghostroot thirds had taken it under half the Ghostroot fights), the Tripwire 1.5 (P2's three new Ransomware thirds took it from 30% of Ransomware fights at 30 to 20%; it is a key the Bastions carry), the Zip Bomb 0.5 (in a third of all fights past level 5) and the Cold Store 0.5 (its late thaw costs a kit with no shield 8.8 points more than its rotation). **The Damper rolls at 0** until its own families come with P3: on the Worm the harness measured it free (−1.8 a point), so the kinds table is 31 at 24, not 32 (30 since the Shunt was cut). It is built, with its playtest page, Codex card and probe.
- **Planner answers.** The Infiltrator Injects a Front End's partner, or strips the Front End when it can't (the floor-2 natives' ×3 had made the Phantom lose 20 of 24 at level 10 by hitting the Front End's partner). Before a Cold Store's first Chill it saves a Throttle, Rate Limit, Suspend or Firewall; it breaks a Spare once its boot is scheduled; it puts no ◆ up into a Scrape; a class with a cleanse clears a Bad Block under 75%. The Limiter, the Packer and the Damper need no rule of their own (the Shunt didn't either).
- **Kestrel's Idle Timer** joins only with the parts plan on (`PARTS.on`), so golden fights and the old guard tables stay as they were with it off.
- **Measured** (balance.mjs, docs/BALANCE.md, Signal lost before → after P2). Level 18: Breaker 22% → 19%, Bastion 21% → 24%, Infiltrator 21% → 27%, Operator 20% → 18%; by subclass Demolitionist 22 → 19, Overclocker 40 → 39, Warden 21 → 24, Sysop 12 → 9, Payload 19 → 21, Phantom 21 → 27, Herder 20 → 18, Hijacker 32 → 33. Level 30: Breaker 29% → 23%, Bastion 21% → 22%, Infiltrator 12% → 18%, Operator 16% → 16%; Demolitionist 29 → 23, Overclocker 38 → 31, Warden 21 → 22, Sysop 5 → 2, Payload 19 → 18, Phantom 12 → 18, Herder 16 → 16, Hijacker 23 → 24. The hard slice at 18: 20/37/25/20% → 21/35/18/19%; at 30: 33/35/28/25% → 36/28/21/23%. Reading tells pays 1.8, −0.2 and 2.2 points at 10, 18 and 30 (0.6, 0.6 and 2.2 before). Every subclass keeps its solo band, every specialist key its slot.

**The P2 rework** (October 22, 2026, designer-approved). Four of P2's parts changed after play:

- **Packer: it hides identity, not just rule text.** A player who knew the game lost nothing to a Packer that only hid rule text: the part's name, its attack's name and its telegraphs said what it was. Now, while it stands, each rolled part it packs shows as *Packed part* (A, B… with more than one): no tag of its own rule, no cap line, no boot chip label, no tether, no tooltip rule, no `inspect`, its attack on the timeline with its timing and amount but named ???, and "the packed part" in the log (`combat.mjs packParts`, `p.packedAs` holding its own names; the names never reach a title, an aria label, a suggestion or a target list). What it does still happens (a capped hit, a boot, a scrape), so an attentive player can tell. Breaking the Packer, or a `scan` before you engage, unpacks them all; the log names what they were. The first-time tip for the packed tag is gone: the Packer is learned through the Codex.
- **Spare: a real trade-off.** It sleeping bare at 20 Integrity made breaking it first always best. Now it sleeps under exactly 3 ◆ (`spare.armor`, its own, outside `PARTS.armor`) with 2 Integrity under them (8 at levels 14–20; the rest goes to its basic and signature by the carve, so it boots bigger, about 88), and drops its ◆ as it boots: soft, none to patch back. You choose when to pay: hits on its ◆ while it sleeps (Crack, chits, burns and helpers count one each), or its Integrity once it boots, while its attack lands. Measured with the planner, the cycles of your damage a Spare alone on the board takes to break (wild fights that roll one, every subclass, levels 14, 16, 18 and 20, ten seeds, worm and ghostroot), asleep against booted: Breaker 2.10 / 1.13 (×1.86), Bastion 3.06 / 1.79 (×1.71), Infiltrator 2.14 / 1.85 (×1.16), Operator 2.00 / 2.04 (×0.98), all 2.33 / 1.70 (×1.37; before the rework 2.11 / 1.52, ×1.39, its one level ◆ on 61 Integrity). The Infiltrator and the Operator are inside ±20%. The Breaker and the Bastion aren't, at any ◆ and Integrity tried (1–3 ◆, 2–20 Integrity): a booted Spare dies to one of their big hits, and ◆ always take two (a strip or chits, then the kill). 2 ◆ brings the Bastion to ×1.15 but the Operator to ×0.49 (its helpers break 2 ◆ and the rest in one cycle), so it stays 3. In whole fights the planner loses about the same either way it plays it. The planner breaks it in its boot window only with 1 ◆ or fewer left. Its cost by the harness: −2.4 a point (−1.7 before).
- **Shunt: cut.** It overlapped the Limiter (both punish one big hit on one part). Its gene, its mechanics, tether, tip, pool entry, probe and tests are gone, and its component (the Shunt Strap) drops nowhere. A save that still holds one keeps loading: the fight under way keeps it as a plain part with no rule, and any other virus loses it and its gene (`combat.mjs shuntRestore`, keyed on the part, no SAVE_VERSION change). The kinds table is one less from 17 (30 at 24).
- **Scraper: any buff.** Its Scrape took only your ◆ and shield, so it bit shield builds alone. Now it takes the buffs you put up before it lands: your ◆, your shield, and your timed buffs (the status strip's own: Momentum, Brace, Sudo, Bulkhead…; not Null Route, which still makes it miss). It wears 1 ◆ for each one it takes (2 for two ◆ or more), 2 in all over the fight, and past that still takes them. The answer: buff after it lands, not before. The planner fires no ◆ and no timed buff into a landing Scrape (`planner.mjs BUFFING`). Its cost by the harness: 17.0 points a fight, 5.7 a point (16.6 and 5.5 before).

Each phase ends with `node --test`, `node balance.mjs` into docs/BALANCE.md, and a playtest page per new part (`?playtest=part:<id>`).

## Decisions

October 20, 2026, from the designer.

1. **The signature is not in every fight.** It is the family's identity, but a fixed part in every fight makes fights repeat. Levels 1–2 keep it, to teach the family. From level 3, a fight brings it about 70% of the time; from level 10, about 55%; from level 20, about 45%. When it's missing, a second third part takes its slot, and only thirds that don't refer to the signature can come (no Lockbox, Mutex, Mirror twin, Idle Timer or Spare without it). The family still shows in its basics, its thirds and its colour. Encounters should feel random and interesting from fight to fight.
2. **Crews:** the Cryptominer is GLASSJAW's, the Wiper TOLLGATE's.
3. **The Hashrat** moves to the Cryptominer.
4. **Native strength** and 5. **part counts** stay as written, to be tuned by playing. Every number in both (the ×3 floor weight, the native on elites and rare spawns, the 4-part share by level, the duplicate rate, the signature rates above) is one named constant, so a playtest can change it in one place.

Also noted: the game should work as a second-monitor game too, something you can keep going while doing something else. That's a separate design question, not part of this plan.
