# Infiltrator subclasses: Payload and Phantom

At level 10 an Infiltrator picks one of two subclasses with `subclass payload` or `subclass phantom`. The first pick works anywhere out of a fight. Switching later is free, but only at home. Each subclass keeps its own skill bar and its own talent tree, so switching back finds them as you left them.

Before level 10 every Infiltrator has the same core: `inject`, `tag`, `keepalive` and `backdoor`, and the Ghost passive. Ghost lets you slip past one guard a run without a fight, opens every fight with a blue Surprise window (Inject, Tag and Keepalive fired in it hit harder), and makes return trips on runs free. Both subclasses keep all of that.

From level 10 each subclass learns its own line of eleven skills, one at each of levels 10, 12, 14, 16, 18, 20, 22, 26, 30, 34 and 38, so with the four core skills it has fifteen keys to choose from. Your bar holds seven, an eighth from level 22 and a ninth from level 30. Two presets come with each subclass (docs/kits.md): `rotation`, which your bar follows as skills unlock until you change it by hand, and one built for a kind of fight. `loadout use <name>` puts a preset on anywhere out of a fight, at home or on a run, and the keys it brings in start your next fight cooling. `loadout save <name>` keeps the bar you have under a name, and `loadout list` shows them all. A save from before the fifteen-key lines keeps every skill it knew.

Numbers below are at level 1. Damage and shields grow 4% a level, the same way every skill's numbers do. Burns and the heals you cast grow half as fast with level (+2%), and Payload and Restore on your gear make up the rest: a Payload in blues that chases Payload carries about 38% at level 18 and 52% at 30, and its Inject ticks 22 and 28 there (17 and 21 in whites).

## Payload

Payload is the damage-over-time Infiltrator. You plant burns, let them spread through the virus, and set them off when the moment comes. On your own it takes whole viruses apart. In a crew it spreads damage across every part while the others focus one.

### Edge: Bloom

When a part you are burning breaks, its burns jump to the part whose attack lands soonest. Each one arrives a cycle shorter, so a burn on its last cycle ends with the part. It does not matter who broke the part: a crewmate's kill moves your burns too. A Rootkit Implant that blooms keeps burning the next part until that one breaks as well.

### Skills

| Level | Skill | What it does | Cooldown |
|---:|---|---|---:|
| 10 | `wormable <part>` | Burns the target for 10 damage every cycle for 4 cycles. Each cycle it burns, it spreads a copy to one more part. | 3 |
| 12 | `detonate <part>` | Every burn on the target deals all its remaining damage at once, increased by 50%. | 4 |
| 14 | `fuzz <part>` | Deals 12 damage and burns the target for 8 every cycle for 3 cycles. Its hit counts twice against a tell, so it calls off an elite's charge or stops a cast. | 4 |
| 16 | `implant <part>` | Burns the target for 10 damage every cycle until it breaks. It can't be healed or grown while it burns. Once per fight. | once |
| 18 | `skim <part>` | Burns the target for 9 damage every cycle for 4 cycles. Each tick heals you for 4. | 3 |
| 20 | `polymorph <part>` | Burns the target for 14 damage every cycle for 3 cycles, straight through armor. | 3 |
| 22 | `logic-trap` | The next hit on you deals half damage, and the part that lands it catches a copy of every burn on your target. | 6 |
| 26 | `propagate <part>` | Copies your burns on the target to every other part. | 5 |
| 30 | `thrash <part>` | For 3 cycles, every burn on the target ticks twice each cycle, whoever started it. | 5 |
| 34 | `outbreak` | Every part catches an Inject, 12 damage every cycle for 3 cycles. For 4 cycles nothing can clear your burns. | 10 |
| 38 | `irq-storm` | Every burn you have on every part ticks once more right now. Each part it reaches takes it as a hit from your command, which calls off a charge or counts toward stopping a cast. | 4 |

Polymorph rewrites itself every cycle, which is why armor never stops it. It also hides it from some of your older skills. Detonate sets it off and Keepalive stretches it, but only on a part that has an ordinary burn on it as well. Propagate does not copy it, and Backdoor does not count it as a burn. Tag, Thrash, IRQ Storm and Bloom all work on it.

Thrash is a status on the part, like Tag. A Bastion's Purge or a crewmate's Inject on a Thrashing part ticks twice as well.

### Talent tree

Talent points come at level 10 and every two levels after. The filler rows take up to 3 ranks per node. A tier opens once you have spent enough points above it, and you pick one of its two talents.

| Row | Opens at | Left | Right |
|---|---:|---|---|
| Ranks | 0 points | Heap Spray: Inject +2 per tick per rank. | Persistent Tag: Tagged burns tick +10% more per rank. |
| Tier 1 | 3 points | Supercookie: Tag lasts 6 cycles. | Long Fuse: Inject lasts 5 cycles. |
| Ranks | 4 points | Shaped Charge: Detonate deals +10% per rank. | Backchannel: Backdoor +4 damage per rank. |
| Tier 2 | 8 points | Contagion: each Inject also starts a copy on the part whose attack lands soonest. | Assassinate: Detonate on a Tagged part deals double. |
| Ranks | 9 points | Low Profile: take 3% less damage from attacks per rank. | Virulence: Wormable, Skim and Polymorph +2 per tick per rank. |
| Tier 3 | 14 points | Superspreader: Bloom also copies the burns to every other part, not just the next one. | Persistence: Rootkit Implant can be used twice a fight. |

Each tier is a real choice. Contagion and Superspreader spread your damage wide, which is how a Payload clears worms and their fragments. Assassinate and Persistence keep it on one target, which is how a Payload takes down a boss.

### How it plays

Open with Inject in the Surprise window for the extra stack. On a virus with two or more parts, cast Wormable early and let it walk through them. Put the Rootkit Implant on the biggest part: when that part breaks, Bloom carries the Implant on to the next. Save Detonate for the cycle it finishes a part. Polymorph is the biggest burn you have, 14 a cycle on any part. Against armor it does damage while your other burns are still breaking chits. Implant shuts off heals: a Leech, a Patchwork or a Self-Update can't grow a part it burns. IRQ Storm ticks every burn at once, and each part it ticks takes it as your hit, so it can call off a charge on a burning part. A burn on its own never calls off a tell, but Fuzz does: it hits and leaves a burn, and it counts twice against a tell, so one Fuzz stops a cast. Logic Trap halves the next hit on you, and the part that lands it catches a copy of your burns. Outbreak puts an Inject on every part, and for 4 cycles nothing can clear your burns. The `swarm` preset swaps Tag and the Rootkit Implant for Propagate and Logic Trap, for worms, fragments and an Overrun.

## Phantom

Phantom is the stealth and burst Infiltrator. It lands crits, dodges what it can see coming, and has the easiest runs in the game. In a crew it picks off parts and gets everyone past the guards.

### Edge: Weak Spot

Your first hit on each part's bare code crits. Burns do not count, and neither does a hit that goes through armor (it doesn't use the Weak Spot up either), so a Phantom opens on a fresh bare part with a hit (Backstab, Opening, Spike, or Backdoor once the armor is off) and lets the burns follow.

### Skills

| Level | Skill | What it does | Cooldown |
|---:|---|---|---:|
| 10 | `fingerprint <part>` | Deals 15 damage and makes Weak Spot fresh on the target again. | 3 |
| 12 | `null-route` | The next attack on you misses, and your next skill is a critical strike. | 6 |
| 14 | `opening <part>` | Deals 50 damage to the target. Usable the cycle after an attack misses you or is delayed. | lit |
| 16 | `backstab <part>` | Deals 32 damage to the target. Always a critical strike against a part busy with a tell: winding up a charge, compiling a cast, sealing or recording. | 2 |
| 18 | `side-channel <part>` | Deals 20 damage straight through armor. The target's timer shows for 3 cycles, even through a veil. | 2 |
| 20 | `shadow-copy [name]` | A decoy of you takes the next hit that would land on you, and Opening lights up when it does. In a crew, shadow-copy nyx puts the decoy on nyx. | 5 |
| 20 | `spoof` (runs) | Once per run, the next guarded folder does not start a fight. You can read and pull one file there. | once a run |
| 22 | `rotate-keys` | Clears encryption, Scrambled and Corrupted. The next 2 hits on you deal 30% less, and each one lights Opening. | 6 |
| 26 | `log-wipe` | Makes Weak Spot fresh on every part, and the next hit on you deals half damage. The Mimic's next beat has nothing of you to play. | 6 |
| 30 | `unmask <part>` | Deals 26 damage straight through armor and unmasks the target for 4 cycles. Your hits on an unmasked part have +25% crit chance, and its timer shows through a veil. A Decoy or Mimic you unmask has nothing of you to copy on its next beat. | 4 |
| 30 | `tap` (runs) | Once per run, prints the whole folder tree, its guards, and which file holds the key. | once a run |
| 34 | `vanish` | The next 2 attacks on you miss, and Weak Spot is fresh on every part. Opening stays lit for 2 cycles after each miss. | 12 |
| 38 | `implant <part>` | Burns the target for 10 damage every cycle until it breaks. It can't be healed or grown while it burns. Once per fight. | once |

Spoof and Tap are run skills. They take no slot on your bar: you know them once they unlock, and you type them on a run.

Shadow Copy only takes a hit. An Encrypt or a Replicate that does no damage goes straight past it, and the decoy waits for the next real hit.

### Talent tree

| Row | Opens at | Left | Right |
|---|---:|---|---|
| Ranks | 0 points | Cold Open: Weak Spot hits deal +5% per rank. | Recon: Opening +5 damage per rank. |
| Tier 1 | 3 points | Fast Hands: Opening stays lit for 2 cycles. | Blind Spot: Weak Spot also crits your first burn tick on each part. |
| Ranks | 4 points | Pivot: Backstab deals +10% per rank. | Onion Routing: +3 max Signal on runs per rank. |
| Tier 2 | 8 points | Kill Chain: breaking a part readies Backstab and lights Opening. | Rotating Proxies: Spoof twice per run. |
| Ranks | 9 points | Low Profile: take 3% less damage from attacks per rank. | Backchannel: Backdoor +4 damage per rank. |
| Tier 3 | 14 points | Deep Cover: Log Wipe also readies Null Route and Shadow Copy. | Leaked Creds: slip past 3 guards a run instead of 1. |

The tiers ask what kind of Phantom you are. Fast Hands, Kill Chain and Deep Cover make a duelist who chains crits and dodges through a fight. Blind Spot lets a Phantom lean on Inject and still get its crits. Rotating Proxies and Leaked Creds make a ghost who barely fights on runs at all.

### How it plays

Open on the part that hurts most: Backdoor goes through armor (no crit until the armor is off), and the first hit on its bare code crits. Backstab a part that is busy with a tell (charging, compiling, sealing or recording), because those hits always crit. When a big attack is coming, Null Route or Shadow Copy takes it, and Opening is lit for the next cycle. Once every part has had its first hit, Log Wipe gives you all your Weak Spots back, and the Mimic's next beat has nothing of you to play. A Lockbox caps how much its part can lose each cycle, which wastes a burst, so a Phantom breaks the Lockbox first. Fingerprint is the cheap hit that makes a part's Weak Spot fresh again, and Side Channel hits through armor. Rotate Keys clears a scramble and takes 30% off the next two hits, and each of those lights Opening. Vanish makes the next two attacks miss, which lights Opening twice. Unmask is a 26 hit through armor that leaves the part unmasked for 4 cycles: your hits on it crit 25% more often, its timer shows through a veil, and a Mimic or a Decoy has nothing of you to copy on its next beat. The `rotation` preset carries Unmask in place of Log Wipe. The `evasion` preset is built around misses and Opening: it leads with Opening, Null Route, Shadow Copy and Rotate Keys, keeps Backstab, Side Channel, Inject, Backdoor and Unmask, and drops Fingerprint and Log Wipe. Every attack it dodges or softens lights Opening for a 50 hit. It is a little better than `rotation` on an ordinary fight and clearly better against elites, Bricker and Extortion strains and the bosses that hit hard.

## Shared notes

Rootkit Implant is in both lines, at level 18 for Payload and level 38 for Phantom.

The old Infiltrator talents keep their ids in the new trees. Heap Spray, Persistent Tag, Backchannel, Low Profile, Supercookie and Assassinate went to Payload. Polymorphic is now called Long Fuse and also went to Payload. Recon, Onion Routing, Low Profile, Backchannel, Fast Hands, Rotating Proxies and Leaked Creds went to Phantom. A save from before subclasses keeps its ranks in the nodes Phantom still has, and the tier picks come back as free points.
