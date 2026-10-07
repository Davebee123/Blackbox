# Infiltrator subclasses: Payload and Phantom

At level 10 an Infiltrator picks one of two subclasses with `subclass payload` or `subclass phantom`. The first pick works anywhere out of a fight. Switching later is free, but only at home. Each subclass keeps its own skill bar and its own talent tree, so switching back finds them as you left them.

Before level 10 every Infiltrator has the same core: `inject`, `tag`, `keepalive` and `backdoor`, and the Ghost passive. Ghost lets you slip past one guard a run without a fight, opens every fight with a blue Surprise window (Inject, Tag and Keepalive fired in it hit harder), and makes return trips on runs free. Both subclasses keep all of that.

From level 12 each subclass learns its own line of eight skills, one at levels 12, 14, 18, 22, 26, 30, 34 and 38. Your bar still has seven slots, so past level 18 you choose which skills to carry.

Numbers below are at level 1. Damage and shields grow 4% a level, the same way every skill's numbers do. Burns and the heals you cast grow half as fast with level (+2%), and Payload and Restore on your gear make up the rest: a Payload in blues that chases Payload carries about 38% at level 18 and 52% at 30, and its Inject ticks 22 and 28 there (17 and 21 in whites).

## Payload

Payload is the damage-over-time Infiltrator. You plant burns, let them spread through the virus, and set them off when the moment comes. On your own it takes whole viruses apart. In a crew it spreads damage across every part while the others focus one.

### Edge: Bloom

When a part you are burning breaks, its burns jump to the part whose attack lands soonest. Each one arrives a cycle shorter, so a burn on its last cycle ends with the part. It does not matter who broke the part: a crewmate's kill moves your burns too. A Rootkit Implant that blooms keeps burning the next part until that one breaks as well.

### Skills

| Level | Skill | What it does | Cooldown |
|---:|---|---|---:|
| 12 | `wormable <part>` | Burns it for 10 a cycle for 4 cycles. Each cycle the burn you cast ticks, it also copies itself onto one more part that has no Wormable yet, with the time it has left. The copies burn but do not spread. | 3 |
| 14 | `detonate <part>` | Every burn on it deals all its remaining damage now, ×1.5. Polymorph's burn goes off too. A Rootkit Implant keeps burning: it has no end to cash in. | 4 |
| 18 | `implant <part>` | Rootkit Implant. Burns it for 10 every cycle until the part breaks. Once per fight. | once |
| 22 | `skim <part>` | Burns it for 9 a cycle for 4 cycles, and every tick that lands heals you 4. | 3 |
| 26 | `propagate <part>` | Copies your burns on it to every other part. | 5 |
| 30 | `polymorph <part>` | Burns it for 14 a cycle for 3 cycles, straight through armor. | 3 |
| 34 | `thrash <part>` | For 3 cycles, every burn on it ticks twice a cycle, from anyone in the fight. The extra tick does not use up the burn. | 5 |
| 38 | `irq-storm` | IRQ Storm. Every burn you have, on every part, ticks once more right now. None of them runs out any sooner. | 4 |

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

Open with Inject in the Surprise window for the extra stack. On a virus with two or more parts, cast Wormable early and let it walk through them. Put the Rootkit Implant on the biggest part: when that part breaks, Bloom carries the Implant on to the next. Save Detonate for the cycle it finishes a part. Against armor, Polymorph does damage while your other burns are still breaking chits.

## Phantom

Phantom is the stealth and burst Infiltrator. It lands crits, dodges what it can see coming, and has the easiest runs in the game. In a crew it picks off parts and gets everyone past the guards.

### Edge: Weak Spot

Your first hit on each part's bare code crits. Burns do not count, and neither does a hit that goes through armor (it doesn't use the Weak Spot up either), so a Phantom opens on a fresh bare part with a hit (Backstab, Opening, Spike, or Backdoor once the armor is off) and lets the burns follow.

### Skills

| Level | Skill | What it does | Cooldown |
|---:|---|---|---:|
| 12 | `null-route` | The next attack misses you, and your next skill crits. | 6 |
| 14 | `opening <part>` | Hits it for 50 the cycle after an attack misses you or is delayed. | lit |
| 18 | `backstab <part>` | 32 damage. It always crits if the part's attack is not due this cycle or the next. | 2 |
| 22 | `spoof` (runs) | Once per run, the next guarded folder does not start a fight. You can read and pull one file there. | once a run |
| 26 | `shadow-copy [name]` | Shadow Copy. A decoy takes the next hit that would land on you, and Opening lights up when it does. In a crew, `shadow-copy nyx` puts the decoy on nyx instead. | 5 |
| 30 | `tap` (runs) | Once per run, prints the whole folder tree, its guards, and which file holds the key. | once a run |
| 34 | `log-wipe` | Log Wipe. Weak Spot is fresh on every part again, and the next hit on you deals half. | 6 |
| 38 | `implant <part>` | Rootkit Implant. Burns it for 10 every cycle until the part breaks. Once per fight. | once |

Spoof and Tap are run skills. They take a slot on your bar like any other skill, but they do nothing in a fight, so many Phantoms swap them in for a run and out again at home.

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

Open on the part that hurts most: Backdoor goes through armor (no crit until the armor is off), and the first hit on its bare code crits. Backstab parts that are not about to attack, because those hits always crit. When a big attack is coming, Null Route or Shadow Copy takes it, and Opening is lit for the next cycle. Once every part has had its first hit, Log Wipe gives you all your Weak Spots back. A Lockbox caps how much its part can lose each cycle, which wastes a burst, so a Phantom breaks the Lockbox first.

## Shared notes

Rootkit Implant is in both lines, at level 18 for Payload and level 38 for Phantom.

The old Infiltrator talents keep their ids in the new trees. Heap Spray, Persistent Tag, Backchannel, Low Profile, Supercookie and Assassinate went to Payload. Polymorphic is now called Long Fuse and also went to Payload. Recon, Onion Routing, Low Profile, Backchannel, Fast Hands, Rotating Proxies and Leaked Creds went to Phantom. A save from before subclasses keeps its ranks in the nodes Phantom still has, and the tier picks come back as free points.
