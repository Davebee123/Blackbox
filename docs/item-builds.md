# Item builds: combos in the uniques and sets

An audit of the 188 uniques, 28 sets, five faction pieces, Zero-days and chase protocols as built (November 2026):
the combos they already make, what fails to stack, and loops to watch. Talents named are the tier talents
(docs/builds.md).

## How items stack

- **Six slots:** exploit, proxy, shell, script, two implants. One of each unique and each Zero-day a loadout.
- **Conditional damage multiplies.** Every `damage%` that holds is a separate ×; `crit%` and flat `damage+` add.
- **Uniques stack, rules don't.** Two uniques with the same effect both fire (two break refunds sum). A blue or yellow
  rule counts once, at its best; a faction implicit once, at its best.
- **One 4-piece bonus.** A tier set takes four of the five slot kinds and always leaves **an implant plus one other
  slot** free: Wrecking Crew leaves proxy, Strongbox exploit, Palemask script, Load Balanced exploit.
- **Pieces that keep up with you:** faction pieces (assembled and re-tuned at your level), earned pieces (they arrive at
  your level), Zero-days and chase protocols. Every other unique is fixed at its own level, so a level-5 unique's
  effect is a leveling tool, not an endgame piece.

## Builds

### Chain reaction (Breaker; Kestrel's line)

Each break takes cooldowns off, and Total Loss turns one break into several.

| Piece | Slot, level, source | Part in it |
|---|---|---|
| Sinkhole or Eviction Notice | exploit 24, invasion · exploit 4, Resident | A break: −2 / −1 on every cooldown |
| Rockfall | script 45, Bedrock's lair boss | A break: −1 on every cooldown, at endgame |
| Cryptominer | proxy 5, Hashrat strain | A break: −1 on every cooldown (−5% Accuracy) |
| Hashboard | script 7, KESSLER-FARM packs | A break: that skill is ready again |
| Fork on Break (yellow rule) | any | A break: −2 on every cooldown |
| Cold Aisle (Bonded) | implant, Kestrel shop | After a break, cooldowns run twice as fast for 2 cycles |
| Total Loss (Zero-day) | Halcyon shop | A break hits every other part for 25% of its max; a part it breaks goes off again |
| Buffer Overflow (Zero-day) + Hot Reload or Race Window | vault · implant 30 · yellow | A break makes the next hit crit; the crit readies that skill |
| Log4Shell / Daisy Chain | exploit 24 · yellow | A break hits the part winding up a tell |
| Domain Admin (3, 4) | set 32–37, floor 6 | A last ◆ stripped: −1 on the nearest cooldown; from the third break, every cooldown 1 shorter |
| Load Path | exploit 36, floor 6 | A hit a ◆ takes still deals 15% to the part |

Talents: Cascade Failure, Flashpoint, Exposed Wiring. At 50: Wrecking Crew 4 (+1 Momentum a break as an Overclocker),
Hot Reload or Cold Aisle in the implant, the proxy free. Catch: the refund uniques are low level; the endgame version
leans on Zero-days, chase pieces and rules.

### Encore (Overclocker; NULL CHOIR's line)

A crit readies the skill, and the same skill again climbs Crescendo.

| Piece | Slot, level, source | Part in it |
|---|---|---|
| Hot Reload | implant 30, layer 4 vaults | A crit readies that skill (−10 Signal). Race Window is the same and doesn't stack |
| Crescendo (Unsigned) | implant, NULL CHOIR shop | The same skill in a row: +15% a repeat, up to +60% |
| Chorus implicit, Refrain, Round | NULL CHOIR items | The repeat hits again for 28–44%; the second use's cooldown halves; Chorus spills to another part |
| Crit sources | | Setuid (every hit in Sudo crits), Exploit Kit, Feedback Loop, Preempt (script 32, +40% on a part winding up a tell), POST Code (exploit 45), Crypter (3: a stripped ◆ crits the next hit elsewhere), Pass the Hash (exploit 35: a crit passes to another part) |
| Same target | | Contiguous (3): commands in a row on one part, +6% each to 18% |
| Crit payoffs | | Root of Trust (exploit 50) and Mews (shell, faction): 2% heal a crit each, stacking; Bit Flip (exploit 47); Burst Buffer (2) |

Both implants are the build. Catch: Patchwork (4), Outfall and Syscall Table (script 34) reward the opposite (different
skills); Ring Minus One (implant 34) rewards holding one back.

### Read the room (any class; the designer's "watching wins")

Damage on a part winding up multiplies, and every answer pays.

| Piece | Slot, level, source | Part in it |
|---|---|---|
| Deep Inspection (yellow) × Interrupt Handler (blue) | any two | +30–45% × +15–25% on a part winding up a tell |
| Policy Engine | script 18, native | Rules count 50% more: Deep Inspection to about +68% (−3% crit) |
| Preempt, or Sampler | script 32, native · script 20, earned | +40% crit there, or a cycle's more warning and +10% |
| Ctrl-C | script 20, vaults, the Tracer | An answer: −2 on every cooldown |
| Tide Table | implant 42, The Sink's boards | An answer: −1 on every cooldown, in an implant |
| Carrier Wave (faction) | exploit, LANTERN feuds | An answer: −1 on every cooldown, at your level |
| Bottleneck or Rubber Hose | exploit 42, earned · exploit 38, native | +4% an answer (to 12%) · +6 a read (to 30) |
| Kestrel Badge, Choirbook (2), Interrupt Vector | proxy 7 · set · script 32 | An answer shields you |
| Notice Period | script 36, floor 6 | A tell starting: −1 on the nearest cooldown, before you answer it |
| Fine Print (3) or Moral Hazard | set 26–32 · exploit 40, floor 5 | The tells you miss pay: a shield, or +3% each to 30% |

Talents: Clock Glitch, Flow Control, Rebroadcast, IRQ Chain, Timing Attack, Shock Front. Catch: Ctrl-C, Preempt,
Sampler, Policy Engine and Interrupt Vector are all scripts; pick one (Tide Table is the implant that eases it).

### Redline (low Signal)

| Piece | Slot, level, source | Part in it |
|---|---|---|
| Glass Ceiling (3–4) | set 14–26, GLASSJAW | +10% damage and +10% Clock Speed below half; one heal at 25% |
| Ouroboros Loop | shell 32, the gauntlet | Clock Speed ×2 below half (−10 Regen) |
| Siphon Tube, Hotfix, Sump Pump, Depth Gauge | script 44, shell 5, shell 41, shell 41 | Leech +50%, Regen ×2, heals +10%, +4 Regen below half |
| Signal Floor, Brownout, Strata | proxy 50, shell 47, shell 49 | Regen ×2 and −15% taken below 25%; up to −10% as you drop |
| Umbrella Policy (faction), Last Known Good, Hot Spare (2) | proxy · script 48 · set | The floor under you |
| Recovery Mode, Reinsurance | script 36 · proxy 40 | Below half a hit capped at 15% every 6 cycles; a big hit's excess back as a shield |

Talents: Kernel Panic (Warden), Critical Path (Sysop). Catch: never with the Glass Jaw implicit, which hurts below 25%.

### Top shelf (above 75%; GLASSJAW's line)

Glass Jaw implicit (+10–18% above 75%), Black Budget (Off-book exploit: crits +50% above 75%), Long Shot (implant 40,
earned: +5% crit, +10% above 75%), Cold Storage (3) and Frost Line (−8% taken, +1 Block above 75%), Shell Company
(the first hit under 75% halved). Kept up by Root of Trust, Mews, Warm Reset, Leech or a Sysop. The opposite of
Redline: never mix them.

### Radio silence (LANTERN's line)

Clean Signal implicit (+4–7% a cycle nothing lands, three stacks), Dead Air (Broadcast proxy: a cooldown tick each cycle
nothing reaches you), Numbers Station (Broadcast exploit: at full stacks the next hit lands on every part for the same),
Carrier Wave (Broadcast script: keeps the stacks through the first hit). Hits kept off by Evasion (Shade Filter, Hold
Music), Stealth (Quiet Hours, Switchback (2), Veil, Turbidity) and delays and Jams (Warden, Hijacker, Choirbook (3), Bus
Fault). Catch: Dead Air counts a blocked hit, so Block doesn't feed it. Two different items are named Carrier Wave
(LANTERN's faction exploit and its chase script).

### Plague (Payload; NULL CHOIR's Descant)

Burn damage multiplies: Hollow and Hidden Process (32–36: +5%, and burns tick on a part out of reach), Banked Fire (shell 43: +12%), Flue (proxy 48: a shield each tick), Descant (script, faction, +10% at your level), Thread Pool (+15%) or the Hive Mind unique
(+25%, −10 Signal), all scripts, so one. Then Fan Curve (shell 8: burns grow +2 a tick), Slammer (script 22: burns jump
on a break) or Tail Call (exploit 19: a break ticks the rest), Burn-In (proxy 46: tick at once), Brackish (script 41),
Bilge (proxy 43: each burn cuts its part's damage to you 3%, to 9%), Slow Drip (exploit 4: +15% crit on a burning part).
The Hive Mind set (4: parts under burns take 8% more from everything) for levels 6–15; Palemask (4) at 50, whose
Payload line makes burns tick 20% harder below half, with Descant in the free script. Talents: Fever, Heat Sink,
Contagion, Superspreader, Third-Party Cookie.

### Swarm (Operator)

Load Balanced (4: every third helper arrives as two), Spawning Run (exploit 42: helpers +15%), Relief Valve (shell 45:
a cut takes a cycle off every cooldown), Weir (implant 44: a helper takes the first hit), Load Order
(script 49: a helper hits as it arrives), Watchdog Timer (script 46: a free helper every 6 cycles), Backwash and Ebb
(scripts), Descant. Hijacker: Riptide (proxy 42: helpers +8% on Jammed parts), Bus Fault (implant 47: Jams push the
attack back), Choirbook (3: Jams a cycle longer), Semaphore (3: a delayed part is Open) and Pressure Relief (shell 36: a
delayed attack deals 20% less). Catch: nearly every Operator deep unique is a script, as is Cron;
Load Balanced (3) plus Load Order may beat the 4.

### Bulwark (Warden)

Siltstone (implant 40: +1 Block for each ◆ you hold) with Harden and Write Protect, Squatter's Rights or Air Gap, Full
Coverage (4) and Bitrot Ward for ◆. Seawall (proxy 39: +1 Block a reduced hit, to 5), Cold Iron (shell 48: +3, and Block
works on burns), Pressure Hull (shell 42: +25% while shielded), Bulletproof Host (proxy 28: ×2 while a tell winds up),
Honeycomb and Ring Main (earned). Strongbox leaves the implant free for Siltstone.

### Shield battery (Bastion)

Bigger shields: Cutoff Wall (script 47: a shield on a cut), Strongbox (3: +15%), Combination (+10%), Bedrock Seal (proxy 47: +15%), Anchor Chain (implant 43:
+10% after a hit), Warm Reset (shell 50: start shielded). Paid on a shield: Breakwater (exploit 41: +5% damage, stacking 3), Pre-Authorization (script 24: next command
+10%), Cofferdam or Pressure Hull, and the *shielded* talents (Bounce Buffer, Cold Plate, Health Probe, Heat Sink, Hot
Swap, Cover Traffic, Shim, Reactive Plating), Fine Print (4: +10% behind a shield). Raised by Interrupt Vector, Kestrel
Badge, Exception Handler, On-Call (3), Golden Ticket (implant 36: the first shield doubled), Fine Print (3).

### Opening act (Infiltrator; short fights)

Low Tide (proxy 40), POST Code (exploit 45) or Cold Start (3) crit the opener; Burst Buffer (3: first two skills +20%),
Prefetch, Outfall (first use of each skill +10%), Palemask (3) and Mask (first hit on each part), Dead Reckoning (that
hit through ◆), Cold Start (2: +8% before a part attacks). Bootstrap, Bootloader (3) and Bedrock (3) shorten the first
cooldowns, and they add. Catch: Low Tide, POST Code and Cold Start (3) crit the same first hit.

### Set count (Keystone)

Keystone (implant 50: +3% damage a set bonus). A tier set (4) and a two-piece in its free slots make four bonuses, but
then Keystone has no slot; tier set plus Keystone is three (+9%). Wrecking Crew (4) plus Bedrock (2) (Core Sample,
Survey) fills all six slots with four bonuses.

## Doesn't stack

| Pair | Why |
|---|---|
| Hot Reload + Race Window | One refund a crit |
| Fan Curve + Flood Ramp | Only the first burn growth counts |
| Canary Token, Sampler, Sounding Line | Only one early warning counts (the lead caps at 3) |
| Low Tide, POST Code, Cold Start (3), Buffer Overflow, Flashpoint | All crit the same hit |
| Two of one rule or implicit | Counted once, at its best |

## Watch (possibly too strong)

- **Setuid + Hot Reload:** in Sudo every hit crits, so every skill readies itself: your biggest skill every cycle,
  climbing Crescendo to +60%.
- **Total Loss + the break refunds:** each break in the chain fires every refund, so one break on a four-part virus can
  clear every cooldown.
- **Deep Inspection under Policy Engine with Interrupt Handler:** about ×2.3 on a part winding up before Preempt's
  crits. Earned by reading, so within the rule.

## Gaps (for the deeper floors' itemization, after the fights and the floor bosses)

The build ideas are there; the pieces don't carry most of them to level 50.

**Built (Batch 2, November 2026):** ten pieces at 41–48 for the enablers, the empty class slots and the four events
(GAME_RULES.md *Uniques*), and Catchment, the general 4-piece. **Floors 5–6** (docs/floor-items.md): seven sets and
19 uniques at 26–40. Left: the flat sidegrades (the designer: keep the items players own as they are).

| Gap | Today | Fix, in order |
|---|---|---|
| Thin middle | Built: non-set uniques by level 66 at 1–14, 38 at 15–26, 36 at 27–38 (was 19), 77 at 39–50 | Floors 5–6's batch, on the builds above |
| Enablers stop at low levels | Break refunds 4–24, burn multipliers 4–22, Hive Mind set 6–15; only faction pieces, Zero-days and chase protocols reach 50 | 39–50 versions of the enablers: a break refund, a burn multiplier, a helper multiplier |
| Class pieces share a slot | Of the 39–50 uniques, Operator's are mostly scripts, Bastion's 9 of 13 shells; the tell pieces all scripts | Spread each class's deep pieces over every slot |
| Endgame funnels | A tier set takes four slots with a generic 4-piece, and only one 4-piece counts: tier set, implant, one flex | One general 4-piece set at 39–50 that competes with the tier sets |
| Flat sidegrades | About half the 39–50 uniques are flat damage, Block, Regen or Signal | Rework some into build pieces |
| Talent events unused | Talents fire on burn tick, shielded, Tagged and cut; items almost only on hit, crit, break and answer | Deep uniques on those four events, so off-class item builds exist |
