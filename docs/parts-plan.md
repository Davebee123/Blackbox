# Parts plan: more virus variety

Something new every 2–3 levels from 1 to 50. Built: P1 (the basic slot, levels 1–12, damage profiles), P2 (floors
2–4, natives, the Packer, Spare, Scraper and Shunt rework) and P3 (the Cryptominer and the Wiper), with the basic
parts, the roll, the damage profiles and the families in GAME_RULES.md "Viruses". Left: P4 (the deep-floor thirds),
in the backlog.

## Principles

- **One part, one rule.** Each part changes one decision: what to hit first, when to hold, or what to save.
- **Show it, don't explain it.** Each rule reads on the board as an icon, chip, tether, bar or tell; the sentence is
  in the tooltip and the Codex. Every part has a Codex card, a tip and a playtest page (`?playtest=part:<id>`).
- **Every class has an answer** at the level the part opens, from the class core below 10.
- **No part only punishes**: break it, time it, or use a kind of damage it lets through.
- **Friction, not spikes.** A fight at your level costs about the same share of Signal however many parts it has.
- **Honest costs.** A third costs genome budget (1 to 3), set by the per-gene harness, not by guesswork.
- **Names** are visual or mechanical, in computing words. No intrusion words.

## P3: two new families (built)

Built as below, with these choices: the Wiper's Pulse Node is its Eraser; a lever each (the Cryptominer the Hotspot,
the Wiper the Tripwire); a random virus with no family named stays one of the first three; a Hash climbs like
encryption (the run's steps skip it).

The rooms engine's bodies (`families.mjs` `ROOM_FAMILIES`) move into `FAMILIES`, so the rooms playtest and the game
read one definition.

| | Cryptominer (XMRIG) | Wiper (SHAMOON) |
|---|---|---|
| From | Level 9, floor 2 (Backhaul) | Level 19, floor 4 (Coldline) |
| Crew | GLASSJAW (with the Hashrat); TOLLGATE also fields it | TOLLGATE; GLASSJAW also fields it |
| Signature | **Rig**: Hash 4 every 2, 2 harder each landing; heats 10 a cycle and burns out at 100. Its ticks vent it. | **Degausser**: Wipe every 5 takes your strongest ready key for 3 cycles. Key 1 and SIGINT are never wiped. |
| Basics | Cooler, Pulse Node, Strobe, Accumulator | Eraser, Accumulator, Repeater, Buffer |
| Lean | Clock and tempo: a fight that runs hot | Tempo: hold your big key |
| Natives it carries | Idle Timer, Backlog, Reactor, Monitor, Reservoir | Limiter, Scraper, Bad Block, Cold Store, Latch, Bleeder |

Networks lean toward them once the floor allows; invasions, swarms and rogue servers send them like the others. No
strains in this plan. The Damper rolls at 0 until they come (on the Worm it measured free). The Trojan stays a rooms
body and the Exfil a runner.

| Part | Breaker | Bastion | Infiltrator | Operator |
|---|---|---|---|---|
| Rig | Let it cook, then burst; crossing its ticks vents it | Rate Limit the Hash | Steady burns while it cooks | Helpers while it cooks |
| Degausser | Overload just before the Wipe | Big key first; Retaliate and Purge after | Inject before the Wipe; Backdoor after | Deploy before; Spawn and Hook after |

## P4: the deep floors

Integrity, ◆ and attack are first guesses at enemy level 6, before the harness tunes them; cost is genome budget.

| Part | Families | Opens (floor) | Integrity, ◆, attack | Rule | Board | Cost |
|---|---|---|---|---|---|---:|
| Reactor | Cm, R | 26 (5) | 28, ◆, Flare 6 / 4 | Its Flare hits 2 harder for each command hit it took since the last one. Burns and helpers don't feed it. | A gauge that rises with each hit | 2 |
| Latch | G, Wp | 28 (5) | 24, ◆, Pin 5 / 3 | While it lives, the same skill twice in a row deals half the second time. Key 1 is exempt. | A latch mark on your last key | 2 |
| Tarball | W | 30 (5) | 24, ◆, none | When it breaks, it unpacks into 2 fragments. | A box with a ×2 chip | 1 |
| Monitor | R, Cm | 32 (6) | 26, ◆, none | Once a fight, each other part that drops under 25% gets 2 ◆ back and a shield of 10% of its max. | A tether to each part, a pip that goes dark once used | 2 |
| Interrupt Mask | G, Wp | 34 (6) | 18, ◆, none | While it lives, the part below it has no interrupt ticks. | Greyed ticks under a mask tether | 2 |
| Bus | W, R | 36 (6) | 28, ◆, Clock 6 / 4 | While it lives, other parts can't drop below 1. When it breaks, every part at 1 breaks with it. | Parts at 1 hang from a tether to it | 3 |
| Reservoir | W, Cm | 39 (7) | 30, ◆, none | Every 4 cycles it pours 20% of its own Integrity into the most damaged part. | A water level; a pour arrow | 3 |
| Bleeder | Wp, G | 41 (7) | 18, bare, none | While it lives, you lose 1% of your max Signal a cycle, 2% from cycle 7, 3% from 13. | Drips on your Signal bar | 2 |
| Bootloader | all | 44 (8) | 34, ◆◆◆, Boot 10 / 5 | Break it and every other part's rule goes dark. | A power tether to every rule chip | 3 |
| Consensus | all | 47 (8) | 26, ◆, none | Every 4 cycles, if two or more other parts are above half, they all attack together. | Vote pips on each row | 3 |

Families: R Ransomware, W Worm, G Ghostroot, Cm Cryptominer, Wp Wiper.

| Part | Breaker | Bastion | Infiltrator | Operator |
|---|---|---|---|---|
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

**Cadence.** Floor 5 brings the Reactor, Latch and Tarball (26, 28, 30); floor 6 the Monitor, Interrupt Mask and Bus
(32, 34, 36); floor 7 the Reservoir and Bleeder (39, 41); floor 8 the Bootloader and Consensus (44, 47). The floor 5–8
bosses, when built, take their floor's natives.

## Calibration

- **Basics:** `pressureOf` within 5% of the Pulse Node over 20 cycles, and genesim within 3 points of a Pulse Node
  fight's Signal lost, at the level it opens and at 30.
- **Thirds:** the per-gene harness sets each cost. Target 2 to 6 points of Signal a cost point, answering worth 3 or
  more, ignoring 20 at most, and every kit's answer winning at least as often as ignoring. A part outside the target
  doesn't ship; new misfits join the calibration `todo`.
- **Spike cap:** the Accumulator, Cold Store, Scraper and Consensus volley at most 45% of a same-level player's Signal,
  the worst three cycles at most 75%.
- **Planner rules:** each new gene gets its `bot` answer so the balance bot plays it as a skilled player would.

## Build phases

| Phase | Contents | Tests and checks |
|---|---|---|
| P1, P2 | Built. | `parts.test.mjs`, `floors.test.mjs`, `codex.test.mjs`, `tips.test.mjs` |
| P3 (built) | The Cryptominer and the Wiper into `FAMILIES`, with crews, network lean, invasions, rogue servers, Codex pages and tips; their thirds join the pools; the Damper's weight up. | `families.test.mjs`, `genome.test.mjs`, `roomsim.mjs` unchanged, `balance.mjs` at 10, 18 and 30, the kinds table again |
| **P4** | The ten deep-floor thirds above. | `balance.mjs` at 30 and 50 (watch the Phantom's opening burst against smaller parts), genesim, spike cap, the kinds table to 50 |

Each phase ends with `npm test`, `node balance.mjs` into docs/BALANCE.md, and a playtest page per new part.

## Decisions

From the designer, October 20, 2026:

1. **The signature is not in every fight**: encounters should feel random from fight to fight. Without it a second
   third takes its slot, and only thirds that don't refer to the signature come.
2. **Crews:** the Cryptominer is GLASSJAW's, the Wiper TOLLGATE's.
3. **The Hashrat** moves to the Cryptominer.
4. **Native strength and part counts** are tuned by playing: each is one named constant in `PARTS`.
5. **Every family deals the same expected damage** over a typical fight; only the shape differs. *"The virus needs to
   deal damage."*
