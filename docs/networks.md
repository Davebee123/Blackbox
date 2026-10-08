# Networks: the designer's review sheet

Every player's network now has a signature. A network seed rolls it, and the same seed always rolls the same network. Each simulated consortium member has a seed of their own, made from their handle, so a solo player who merges with simulated members visits networks that play differently from theirs. When real multiplayer arrives, each player's seed will be the one on their save.

The code is in `dist/network.mjs`. The native bosses are `nb-*` in `BOSSES` (dist/data.mjs), their signature charges are in `TELLS` and `TELL_SETS`, and the native uniques are the entries with source `native` in `dist/content/items.mjs`. The tests are `network.test.mjs` (the rules) and `natives.test.mjs` (the class bands with native uniques loaded).

## 1. The signature

`signature(seed)` rolls these, in this order, on dice of its own:

| Part | What it is | Where it shows in play |
|---|---|---|
| Name | Two words, like *Rust Lattice* or *Saltwire Loop* | The Network card, the consortium map, member rows, tooltips |
| Lean | The three families in an order of their own, weighted 3, 1.5 and 0.5 | The families of mixed rogue folders (Pits and Gauntlets), the hidden neighbours your servers reveal, the other half of root rotations, and the families of couriers, bounties and outbreaks |
| Native strain | One strain of its lead family seven times in ten, otherwise one of its second family's | Five times as likely as each of its family's other strains on that network: rogue folders, invasions, outpost natives, swarms, rotations and the lair |
| Native boss | One of nine templates, its lead family's three times as often | In its lair, a rogue server of its own |
| Native uniques | 3 to 5 from a pool of 27, at least one from each level band (5–15, 16–28, 29–40), a native tied to its lead family twice as likely | About ten times as likely on its home network as anywhere else |
| Event bias | Two of the director's six cards | Each comes up 2.5 times as often |
| Code bias | A rich code (its lead family's six times in ten) and a rich material (salvage or Exploits) | 30% of every other code dropped there comes as the rich code, and the rich material drops 1.5 times as often there |

A fight or a server belongs to one network. Your traced servers, your rogue servers, your home fights, your events and your lair are yours. A member's servers and their lair are theirs. SPRAWL-00, KESSLER-FARM-00, the trunk server and the faction hubs belong to nobody. Natives, code, salvage, Exploits and strains read the network the fight is on. The event bias reads yours.

**Saves.** SAVE_VERSION is 36. A new game rolls its seed (`app.js`). A save from before networks gets one in `networkRestore`, made from its own seed, its rng and its handle, so loading the same save always gives the same network. The restore list also accepts v34 saves again: they used to start over by mistake. A bare engine state with no seed (the tests' `fresh()`) has no network, so the older tests run unchanged. The pacing bot always plays with a seed.

## 2. The native unique pool

Every native follows the current unique rules: its primaries are the best base of its slot at its item level ×1.2, it drops at the item level of the kill, and its effect is built from effect blocks the editor knows. The *tie* column is the lean family a native prefers to be native to.

| Name | Level | Slot (base) | What it does | Tie |
|---|---:|---|---|---|
| Null Byte | 5 | Exploit (Weaponized Exploit) | +35% damage on an Open part (a tell you read) | tells |
| Canary Token | 6 | Shell (TTY Upgrade) | Tells are announced a cycle further ahead | tells |
| Ping of Death | 7 | Script (Cron Job) | When you call off a tell, the part you read takes 10 | tells |
| Lockpick | 8 | Script (Cron Job) | Your hits count double against a Mutex lock or a Lockbox ward | ransomware |
| Reflector | 9 | Shell (TTY Upgrade) | The Mimic's playback hits the Mimic instead of you, at 50% | ghostroot |
| Fork Reaper | 10 | Exploit (Weaponized Exploit) | +60% damage on a fragment | worm |
| Watchlist | 11 | Proxy (VPN Cascade) | When a tell lands on you, restore 6% of your health | tells |
| IRQ Line | 12 | Script (Dropper) | SIGINT cools down 2 cycles faster | tells |
| Read Receipt | 13 | Shell (Root Shell) | Parts you read stay Open a cycle longer | tells |
| Split Brain | 14 | Exploit (Exploit Chain) | A twin you break can't reboot | worm |
| Rootless | 15 | Implant (Implant) | +25% damage with a skill whose moment is on the board | skills |
| Write Blocker | 16 | Proxy (VPN Cascade) | A seal that goes through leaves your ◆ and shield, and you stay clean | tells |
| Policy Engine | 18 | Script (Loader) | Your blue and yellow rules count 50% more (−3% Crit) | rules |
| Quiet Wire | 20 | Proxy (Onion Circuit) | A Tripwire you break stays quiet | ransomware |
| Static Discharge | 21 | Exploit (Zero-click) | +35% crit chance on a part gone loud (a Tripwire, a Bricker's rage, Double Extortion) | ransomware |
| Hush Money | 22 | Implant (Implant) | A cast that compiles lasts 2 cycles less | tells |
| Brood Tap | 23 | Script (Loader) | When you break a fragment, heal 5 | worm |
| Keyjam | 24 | Exploit (Zero-click) | +40% damage on a part behind a lock or a ward | ransomware |
| Metronome | 26 | Shell (Ghost Shell) | +30% crit chance when you fire in a Sync Window | sync |
| Hold Music | 28 | Proxy (Mixnet) | Evasion counts double while a part winds up a tell | tells |
| Kill Chain | 30 | Implant (Implant) | When you break a part, the next part to attack is Open for a cycle | tells |
| Preempt | 32 | Script (Polymorphic Engine) | +40% crit chance on a part winding up a tell | tells |
| Brute Force | 33 | Exploit (Wormable) | On a part behind a lock or a ward, a hit that meets ◆ breaks two of them | ransomware |
| Takedown Notice | 34 | Implant (Bootkit) | When you break a fragment, every cooldown drops by 1 | worm |
| Sandman | 36 | Shell (Ring 0 Shell) | A tell that lands leaves nothing behind: no key offline, no Corrupted, no Hung (−2 Regen) | tells |
| Rubber Hose | 38 | Exploit (Sandbox Escape) | +6 damage for every tell you read this fight, up to +30 (−3% Crit) | tells |
| Mirror Maze | 40 | Proxy (Domain Front) | The Decoy's mirror lets your commands through at 50%, and nothing bounces back | ghostroot |

Twelve new effect blocks carry them, and the editor offers them like the rest. The new conditions are *the target is Open*, *the target is behind a lock or a ward*, *the target has gone loud*, *the target is a fragment* and *the skill's moment is on the board*. The new effects are a hit on the part you read, the next part Open on a break, tells announced further ahead, Open lasting longer, hits that count more against locks and wards, the Mimic's playback turned on itself, twins that can't reboot, seals that write nothing back, rules that count more, a quiet Tripwire, shorter casts, no after-effects and a Decoy you can hit through. Reads per fight is a new scale.

Each network rolls 3 to 5 of these. Over 2,000 seeds every native belongs to between 16% and 31% of networks. Mirror Maze is the most common (31%), because the top band has seven natives and a ghostroot-led network prefers it.

### Sidegrades, measured

`natives.test.mjs` loads each native in place of the blue in its slot, on all eight subclasses, at the first bracket it fits (10, 18 or 30), over the 24 class-balance fights. Positive is more health lost than the all-blue baseline.

| Bracket | Natives tested | Average change per native | Best single subclass | Worst single subclass | Health lost, all cases |
|---|---:|---|---:|---:|---|
| Lv 10 | 8 | −3.3 (Lockpick) to +3.8 (Reflector) | −12.4 (Ping of Death, Demolitionist) | +10.0 | 26–47% |
| Lv 18 | 14 | −1.2 (Quiet Wire) to +2.0 (IRQ Line) | −6.4 (Write Blocker, Demolitionist) | +7.4 | 21–50% |
| Lv 30 | 23 | −1.3 (Keyjam) to +2.8 (IRQ Line) | −4.6 (Ping of Death) | +10.8 | 24–48% |
| Lv 40 (outside the bands) | 6 | +0.3 (Preempt) to +1.8 (Rubber Hose) | −2.2 (Sandman) | +4.6 | baseline 12–40% |

No native moves a bracket's average by more than 4 points, every case stays between 20% and 52% lost, and every subclass keeps at least 80% wins (the Sysop 70%). On the generic fights a native is a little worse than a chased blue on average, because the blue carries the stat its subclass chases and the native's effect only fires in its moment. That moment is common on its home network: a ransomware-led network fields Mutexes, Lockboxes and Tripwires for Lockpick, Keyjam and Quiet Wire, and its native strain and boss lean the same way.

## 3. The native boss pool

Nine templates on the solo-boss and tells framework (not raid.mjs). Each brings every tell open at its level, its charges take two hits, it has phases and an enrage timer, and a family template always brings its own third part. A strain template is a boss built on that strain, with its strain's tells and its charge renamed.

| Boss | Base | Third part or rule | Signature charge | Phases | Lair |
|---|---|---|---|---|---|
| DEADBOLT | Ransomware | Mutex | Deadbolt (on the Encryptor) | 60% re-arm, 30% a second Mutex re-locks the Encryptor | DEADBOLT-VAULT |
| TRIPMINE | Ransomware | Tripwire (a Lockbox below 20) | Claymore (on the Pulse Node) | 50% every attack a cycle sooner | TRIPMINE-YARD |
| HASHLORD | Hashrat strain | Your cooldowns tick every other cycle while its Miner lives | Difficulty Bomb | 60% re-arm, 30% sooner | HASHLORD-RIG |
| BACK ORIFICE | Worm | C2 Node | Spam Run (a Replicate that hatches two) | 50% sooner, 25% a Mirror twins the Replicator | BACKORIFICE-C2 |
| PATCH TUESDAY | Patchwork strain | Its Patcher heals the most damaged part | Rollup | 60% re-arm, 30% sooner | PATCHDAY-WSUS |
| FLOODWALL | Floodgate strain | Its Flooder hits every cycle, harder each time | Storm Surge | 50% re-arm | FLOODWALL-SLUICE |
| MIRRORSHADE | Ghostroot | Mimic | Doppelganger (a Scramble two cycles longer) | 50% a Decoy mirrors you on the off-beat | MIRRORSHADE-HALL |
| SLEEPWALKER | Sleeper strain | Dormant until you hit it | Night Terror | 50% re-arm | SLEEPWALKER-WARD |
| ECHOLALIA | Echo strain | Hits that get through repeat at half | Last Word | 60% re-arm, 30% sooner | ECHOLALIA-CHAMBER |

**The lair.** Your lair turns up on your map once you are level 8 and have found three servers. It is a rogue server of kind *Lair*, never rolled, at your level. `/outer` and `/den` hold its family (its native strain more often) and come back half an hour after they fall. `/core` holds the boss, back an hour after it falls. A member's lair is on their network from their level 8, named after the boss and the member (FLOODWALL-NYX).

**Its drops.** A boss kill rolls like any boss (three loot rolls) and then for its network's natives that are open at its level, at BOSS_LOOT's odds: 30% a kill, +10% for every kill without one, one you lack first, kept per network. That is a native every 2.4 kills on average, so about one every two and a half hours of lair visits. The first time it falls it names every native of its network.

**Win rates.** The planner over every subclass and four seeds, in the same run fights as the existing solo bosses:

| Boss | Lv 10 | Lv 18 | Lv 30 |
|---|---:|---:|---:|
| DEADBOLT | 44% | 59% | 75% |
| TRIPMINE | 78% | 66% | 81% |
| HASHLORD | 56% | 100% | 94% |
| BACK ORIFICE | 53% | 63% | 88% |
| PATCH TUESDAY | 75% | 84% | 88% |
| FLOODWALL | 50% | 84% | 81% |
| MIRRORSHADE | 34% | 63% | 94% |
| SLEEPWALKER | 78% | 72% | 63% |
| ECHOLALIA | 84% | 78% | 56% |
| REPO MAN (for scale) | 47% | 44% | 59% |
| HOLLOW CHOIR (for scale) | 31% | 69% | 75% |

A strain boss has two parts and its strain's rule, so it is soft at 10 and easy to outgrow. Its hits step with level (`STRAIN_BOSS_LATE`: ×0.8 at 10, ×1.1 at 18, ×1.45 at 30). HASHLORD still wins too easily at 18.

## 4. Strain and family leans

The lean is a weight, never a rule: every family still turns up everywhere. On a network with weights 3, 1.5 and 0.5, a mixed folder or a hidden neighbour comes up about 60%, 30% and 10% by family. The native strain is five times as likely as each other strain of its family, so on a ransomware network with three ransomware strains open, a ransomware strain roll comes up its native strain five times in seven (it was one in three). Strains still take a family's place half the time, as before.

No new strains were needed. Eleven strains, three families in six orders and nine bosses already give every network a different mix, and over 3,000 seeds every strain is native to between 7% and 12% of networks. New strains would be the next lever if networks feel too alike past level 20, where no strain is new.

## 5. The event and resource bias

**Events.** Two of the six cards are favoured, each at 2.5 times its weight. The darknet listing is the new card (below). The families of couriers, bounties below level 8, and outbreaks follow your lean, on the director's own dice.

**Code and materials.** On a network, 30% of every code drop that isn't its rich code comes as its rich code: kill drops at once, guard drops and vault caches when you bank them, your outposts' Code Siphons when they're collected, and a member's dividend in their network's rich code. The total never changes, only the mix. A network rich in salvage drops part salvage 1.5 times as often, and one rich in Exploits drops Exploits 1.5 times as often. So a network with Cipher as its rich code runs short of Worm and Kernel code, and the dividend from a member whose rich code is Kernel is what fills that gap.

## 6. The solo routes, with drop rates and pity

Exclusivity is "much likelier there", never "only there".

| Route | Rate | Pity |
|---|---|---|
| A kill on its home network | 0.5% a kill for one of its natives open at the kill's level (an elite or a boss rolls three times) | +0.01% for every kill on that network without one: a mean of 88 kills, half within 78, nine in ten within about 170 |
| Its network's lair boss | 30% a kill for one of the natives open at its level | +10% a kill without one (BOSS_LOOT), mean 2.4 kills |
| A kill anywhere else, for a native you know of (named, or native to a network you know) | 0.02% a kill each, a tenth of a native's home share | None |
| A kill anywhere, for one you've never heard of | 0.05% a kill for one of them at random, and it's named when it drops | None |
| A Listening Post tuned to a native you know | At home, its usual +25% a post. Anywhere else, 0.02% × (1 + 2 per post): 0.1% with two posts, 0.18% with four | The home pity still applies at home |
| A darknet listing (event card, from level 8) | About 5% of events: one every 7 to 8 hours of play, every 3 hours where it's favoured | It names the unique; buy it for 400 + 40 × level credits and 2 Exploits within 20 minutes |

A darknet listing picks the native you listen for first, then one you've heard of half the time, then any you lack, open at your level and not native to your network. A native never drops from a grey kill. The native roll has its own dice, so it never moves the game's other rolls.

**Seen and named.** A native shows as ??? on the Network card and in the Collection until it drops for you or you hear it named: a darknet listing, its network's lair boss falling, or a drop. The Listening Post only tunes to a native you've heard named. The Collection lists a native once it's yours, named, or native to a network you know.

## 7. Showing it

- **The Network card** sits on the Server page and on the Consortium page. It shows only what you have learned by playing on the network (`s.netIntel`, network.mjs `intelOf`): the families you've beaten there as a bar, the native strain once you've beaten it there twice, the native boss once its lair is on your map, a favoured card once it has come up twice, and the rich code and material once the code has leaned eight times. Everything else reads ???, and the natives stay ??? until seen or named. It shows no odds or multipliers. A darknet listing shows on it with a Buy button.
- **Members.** Each member row on the Consortium page carries their network's name (lean, strain, boss and natives on hover). On the consortium map each member node is labelled with their network's name and native strain, and the member's card carries their Network card under it.
- **Tooltips.** A native unique's hover card carries a *Native · Rust Lattice (yours)* tag, and its title names the network too.
- **Commands.** `network` prints your signature, `network <member>` a member's, and `event buy <id>` buys a darknet listing. For testing: `developer network <seed>`, `developer lair` and `developer native <id>`.

Checked in headless Chromium at 1440 and 390 wide. The Network card, the member rows, the map's member card and the tooltip render with no page errors. On phones the Consortium page used to clip its cards and push the member buttons off to the left, and the Server page's right column clipped too. Both are fixed (`minmax(0, 1fr)` columns, and the member buttons on the first row).

## 8. The consortium incentive

**Built.** Merging puts every member's servers, and from their level 8 their lair, on your map. A kill on a member's server rolls for their natives at the home rate, with pity kept for their network, so the way to a native that isn't yours is to fight on the network it belongs to. Their lair boss drops their natives at BOSS_LOOT's odds. Their outposts' dividend comes in their rich code, so a member whose rich code is Kernel covers the Kernel your Cipher network is short of. Knowing a member's network also turns its natives into ones you know of: they drop off-network at the "known" rate, and your Listening Post can tune to them once they're named.

**Proposed, not built: paired lairs.** When two merged networks have native bosses of different families, the trunk opens a crossover lair at Backbone size (8 servers): a boss built from both templates, one third part from each, both signature charges, and phases from both. Its drops are a native from each network, each at BOSS_LOOT's odds with its own pity, plus one roll on a short list of *paired* natives that only exist as a pair (for example a Mutex-and-C2 unique for DEADBOLT with BACK ORIFICE). It needs a boss built from two specs in `createVirus`, a pairing table for the nine templates (36 pairs, or one per family pair, which is 3), and a few paired natives. That is a clean next step, but it is a design call: it makes some merges better than others.

## 9. Three seeds side by side

| | Seed 101 | Seed 303 | Seed 505 |
|---|---|---|---|
| Name | Hollow Ring | Brine Weave | Saltwire Loop |
| Lean | Ghostroot > Ransomware > Worm | Worm > Ransomware > Ghostroot | Worm > Ghostroot > Ransomware |
| Native strain | Keylogger | Patchwork | Echo |
| Native boss | SLEEPWALKER (SLEEPWALKER-WARD) | BACK ORIFICE (BACKORIFICE-C2) | FLOODWALL (FLOODWALL-SLUICE) |
| Native uniques | Ping of Death (7, Script), Fork Reaper (10, Exploit), Policy Engine (18, Script), Mirror Maze (40, Proxy) | Null Byte (5, Exploit), Write Blocker (16, Proxy), Keyjam (24, Exploit), Mirror Maze (40, Proxy) | Null Byte (5, Exploit), Hold Music (28, Proxy), Takedown Notice (34, Implant) |
| Favoured events | Hollow Choir, Darknet listing | Leak, Bounty | Darknet listing, Courier |
| Rich in | Cipher code, Exploits | Cipher code, Exploits | Worm code, salvage |

Hollow Ring is a ghostroot network: Keylogger strains that ask you to fire on the beat, a dormant boss, and its late chase is Mirror Maze for the Decoys it fields. Brine Weave is a worm network whose boss commands fragments, but two of its natives want locks and seals. Saltwire Loop is a worm network with Echo strains, short on late natives (three), and its Takedown Notice pays off in the fragment fights its lean brings.

## 10. Balance and pace across seeds

The balance bands, the tells gap, press diversity and the loop and economy tests are green, apart from the known target-band todo. The band numbers in GAME_RULES.md and docs/BALANCE.md don't move: the class fights load blues, and the native checks are in section 2.

The pacing bot (`bot.mjs`, `netSeed` option; it builds and tops up) to level 30 on eight network seeds and two play seeds each, against no network (seed 0). Hours of play, relaxed 12-second cycles.

| Class | No network: to 20 / to 30 | Networks: median to 20 | Range of the seeds' means to 20 | Median to 30 | Range of the seeds' means to 30 |
|---|---|---:|---|---:|---|
| Breaker | 8.7, 10.2 / 19.8, 20.2 | 8.6 | 7.5–9.9 | 19.0 | 17.6–21.3 |
| Bastion | 12.0, 9.3 / 29.5, 23.0 | 10.0 | 9.1–12.3 | 23.9 | 21.3–28.1 |
| Infiltrator | 8.5, 8.6 / 19.9, 22.0 | 8.2 | 7.6–9.2 | 19.2 | 17.7–21.7 |
| Operator | 12.7, 8.5 / 30.7, 26.4 | 8.3 | 7.9–8.7 | 26.0 | 22.8–34.9 |

The Operator's climb to 30 swings most with the play seed, so it got three more play seeds on four of the networks. Over five play seeds each, the median to 30 was 28.1 hours with no network, 23.7 on Hollow Ring (101), 31.0 on Rust Spur (202) and 31.9 on Blackglass Mesh (707). The longest single climb was 44.7 hours (Rust Spur, play seed 9). With no network the five runs spread from 22.9 to 30.7.

No network seed stalls a climb, and none is far off its class's pace: the slowest seed's mean is within about 12% of the class median for the Breaker and the Infiltrator and within 18% for the Bastion. The Operator's spread is mostly its play seeds (Hollow Ring ran 19.7 and 36.4 hours on two of them), and its medians sit within about 15% of the no-network median either way. Its long climbs got longer (four of 25 over 35 hours, none of five without a network), which is worth watching. The bot collected 2 to 4 of its own natives by level 30 and about one foreign native in every three climbs. Networks make the climb a little faster on the median, from the natives and the lair's boss XP. The lair is a visit, not a farm: its guards come back in half an hour, so fighting only in SPRAWL-00 is still the slow road (1.39× to 1.78× to level 12 by class, 1.54× on average).

## 11. Decisions for the designer

1. **The off-network rate.** "Ten times more often at home" is per unique, against natives you know of. Unknown natives share one small roll (0.05% a kill). Giving every one of the 27 its own tenth would make foreign natives as common as home ones.
2. **The Listening Post's off-network lift** is 1 + 2 per post (five times with two posts). It could be stronger if the solo route feels too slow. The darknet listing is the fast solo route.
3. **The darknet price** is 400 + 40 × level credits and 2 Exploits, about two hours of credits at level 20. It never sells one of your own natives.
4. **Paired lairs** (section 8): build them, or keep merges equal?
5. **Boss spread.** HASHLORD wins 94–100% from level 18, and MIRRORSHADE is hard at 10 (34%). The lair is optional, and its natives also drop from ordinary kills, so a hard boss slows a network's chase without blocking it.
6. **The top band** has seven natives, so Mirror Maze is native to almost a third of networks. One or two more natives in 29–40 would spread it.
7. **Members' networks while simulated** come from their handles, so `nyx` is always Copper Spur for everyone. Real members will bring their own seeds.
8. **A seed for bare engine states.** `fresh()` has no network so older tests run unchanged; every game (new, migrated, the bot) has one. If you'd rather the engine always rolls one, the older seeded tests will need new numbers.
9. **The kill check after the virus's half.** A hit back during the virus's half (Reflector, Countermeasures) that takes the last part now ends the fight at once. Before, the fight waited for the next cycle with nothing left to hit.
