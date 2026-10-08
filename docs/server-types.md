# Server types: one conversion per held server

This is a design for review. Nothing here is built. It proposes replacing the outpost building system (GAME_RULES.md, *Outposts*) with one choice per held server: you **convert** it to a type, then upgrade it from tier I to tier III. Slots, bandwidth, plans and the build queue go. Site traits are reworked so each one favours a type.

The designer's brief: the buildings aren't strong enough to care about, the server modifiers don't feel like they do anything, and a server should become one thing instead of holding a bunch. Each type has to change what you fight, where you go or what you can get. One type may be plain income, but income isn't the point. Crafting is being removed from the game, and salvage most likely goes with it, so no type pays off through crafting and nothing here costs salvage or needs a plan.

## 0. The short version

| Type | What it changes | Tier I | Tier II | Tier III |
|---|---|---|---|---|
| **Listening Post** | What you can get: one unique you name | The unique drops 50% more often everywhere | Your wins plant **carriers** in its folders: kills that roll for the unique at boss odds | Carriers twice as often, and they can carry a foreign native or (phase 4) a set piece |
| **Lure** | What you fight: viruses you pick, on demand | Bait a family: its folders fill like a Nest | Bait a strain, plus an elite folder | Bait up to two genes you've decoded, so the drops carry their implicits |
| **Jump Host** | Where you go: past what you've traced | Run its unknown neighbours blind, before they're located | Hop from server to server on one run, the pack riding along | A deep rogue server two layers past it, with a throne boss |
| **Chokepoint** | What you fight: every swarm comes here | Draws every swarm on your network, firewall +3 | Quarantine: swarms wait in its folders with no timer | Bigger, elite-led swarms that leave captures |
| **Exchange** | Plain income | Credits an hour, paid straight to you | Also the server's code | Double, and an Exploit every 8 hours |
| **Range** | What you can get: bosses on demand | Replay a solo boss you've beaten, with its loot table and pity | Patch a gene onto it for an extra loot roll | Load a guest boss from an author you've met, and patch twice |

Tiers II and III open at Root 3 and Root 5, so a server earns its upgrades by being played on. Each type can run on two servers at most, and only one of them at tier III. Site traits favour one type each, at double strength.

## 1. Why the buildings don't land

- **They don't move the climb.** The pacing bot that built every building it could afford spent about 2,700 credits on them by level 30 and reached 30 within 7% of a bot that built nothing (docs/progression.md, 1.4 and 2).
- **Eleven of thirteen are a number on a resource.** Producers make code, credits and salvage. Support buildings multiply the producers. Defences protect the producers from the swarms the buildings draw. The loop feeds itself, and nothing in a fight or on the map looks different afterwards.
- **What they make paid for crafting.** Salvage and most of the code went into compiling. With crafting gone, a Scrap Mill makes nothing anyone needs.
- **Four limits guard a choice that doesn't matter.** Slots, bandwidth, the two-build queue and plans all gate which +% goes where. The Edge Router service and the Hub architecture exist only to loosen one of those limits.
- **Collecting is a chore.** Production waits in a store until you connect. The Scheduler service exists to do that for you, and the thief invasion exists to punish you for not doing it.
- **The site traits are invisible.** Rich, Hostile and Legacy are +50% on producers or a better loot roll on a Data Miner, and Backbone is one more slot. A player never notices them without doing sums.
- **The two buildings that land are the seeds.** The Listening Post changes what drops and the Honeytoken changes what comes at you. Those are the only two that change play, and both turn into types below.

## 2. The types

### 2.1 Rules every type shares

| Rule | Detail |
|---|---|
| One type | A held server is plain until you convert it. Converting makes it one type at tier I. A plain server still rotates its logs and earns Root levels (root.mjs), as today. |
| Unlocks | No plans. Each type shows in the server's **Convert** panel once you've done the thing it builds on (table below), so the list grows as you play. |
| Cost | Credits, the server's family code and Exploits. No salvage. |
| Time | Real time, online or off. One conversion or upgrade per server at a time, with no network-wide queue. *Finish now* buys it out as today (BUYOUT). |
| Tier gates | Tier II needs **Root 3** on that server. Tier III needs **Root 5** and server level 20. |
| Switching | **Refit** between fights: the tier stays with the server (you paid for the hardware), and the role changes. A refit costs tier I's price times the current tier and takes 30 minutes a tier. The server does nothing meanwhile. |
| Retuning | A type's setting (the unique, the bait, the loaded boss) changes for free between fights. Retuning is how a type follows what you're chasing. |
| Firewall | Every typed server keeps its own firewall, as every outpost has today (`firewall.mjs`): its level plus the tiers you buy. |

| Step | Credits | Code (server's family) | Exploits | Time | Needs |
|---|---|---|---|---|---|
| Convert (tier I) | 150 + 15 × level | 10 + level/2 | | 20 min | the type unlocked |
| Tier II | 600 + 40 × level | 30 + level | 1 | 1 h | Root 3 |
| Tier III | 2,000 + 80 × level | 80 + 2 × level | 3 | 4 h | Root 5, server lv 20 |

At a level-20 server that is 450 credits and 20 code to convert, 1,400, 50 and 1 Exploit for tier II, and 3,600, 120 and 3 Exploits for tier III. That's two hours and five hours of income at that level, close to a v2 and a v3 service.

| Type | Shows in the Convert panel once |
|---|---|
| Exchange | You hold any server |
| Lure | You've cleared a rogue server's folder |
| Listening Post | Level 5 and you've heard a unique named (as today) |
| Chokepoint | A swarm has come for one of your servers |
| Jump Host | A relay has pinged an unknown server |
| Range | You've beaten a solo boss (a lair `/core` or a world boss) |

**Root levels.** Root still counts rotated processes cleared (1, 2, 4 and 7 for Root 2 to 5), and now any 10 fights you win at the server count as one more. A Lure or a Chokepoint earns its own tiers by being fought at. Root 4's slot and producer perks and Root 5's producer doubling go. The new ladder is: Root 1, taken over and tier I. Root 2, `/root` opens. Root 3, it stops sending invasions and tier II opens. Root 4, its firewall +3 levels. Root 5, tier III opens.

### 2.2 Listening Post

You name a unique (`listen <unique>`, or **listen** on its Collection row), and the network brings it to you. Each post has its own tuning, so two posts chase two uniques. Two posts on the same unique count once, at the higher tier.

| Tier | What it does |
|---|---|
| I | The unique drops 50% more often wherever it can drop: its gold roll, a strain's trophy, a boss's chance, a native's home roll. A native you've heard named drops off its network 3 times as often. |
| II | **Carriers.** Every 15 fights you win on your network (not SPRAWL-00), the post plants a carrier in one of its folders, up to 3 waiting. A carrier is a virus that can drop the unique: its strain for a trophy, its native family for a native, any virus at its level for a world gold. Its kill rolls for the unique at boss odds (30%, +10% a kill without one, BOSS_LOOT's pity). A boss's own uniques get only tier I's lift. |
| III | A carrier every 8 wins. It can carry a foreign native you've heard named, and from genome phase 4 a set piece of an author you've met. |

**How you see it.** The map node grows an antenna. The server's terminal gets `/var/spool/intercepts`: one file per carrier (`carrier-keyjam.cap`) naming the unique and the folder it's in. The card reads *Tuned: Keyjam · 6 wins to the next carrier*. The post never says where a ??? unique drops: you tune only to what you've heard named.

Carriers are made by your wins, not by a clock, so a week away costs nothing and nothing expires.

### 2.3 Lure

Today's Honeytoken drew trouble. A Lure draws what you choose. Its folders (4, 5 or 6 by the server's size, which survives as a folder count) fill with the bait, at the server's level and grade, keeping up with you inside its layer's band like a rogue server. Each comes back 3 to 5 minutes after it falls, and the Lure takes you back with no reconnect wait.

| Tier | Bait |
|---|---|
| I | A family. The Lure is your own Nest, on a server you picked. |
| II | A strain you've met, or a named build. Its kills count for strain contracts and roll for its trophy (1 in 200). One folder holds an elite, as in a Pit. |
| III | Up to two genes you've decoded, rolled on every virus inside the compatibility rules (docs/genome.md 5.3). Their drops carry those genes' implicits, at tier II and III, so you farm the answer to what's beating you. The elite folder holds a champion. Before genome phase 3, tier III baits a mutation instead. |

**How you see it.** The node turns to a jar, each folder shows its bait on the map card, and `ls` on the server reads like a rogue server's. A Lure on a server below your layer's band goes grey with it, which is why the newest deep server is the best Lure.

The Lure's own natives come as its bait. In ACTUARY's sector (genome 4.4) a Lure's kills count toward its repricing, so baiting a gene there is how you steer it.

### 2.4 Jump Host

Today you go deeper by tracing. A Jump Host lets you go before you've finished.

| Tier | What it does |
|---|---|
| I | **Blind runs.** You can connect to an unknown server next to it before it's located. It's a full break-in at its own level, a layer deeper and about 3 levels up. Nothing shows until you're in: family ?, layout ?. Opening its vault locates it. Jacking out before then leaves its trace 35% further. |
| II | **Hops.** On a run that started at the Jump Host, `hop <server>` moves you to a next server without going home. The pack, Signal and Trace carry. Every hop after the first raises its fights by a level and adds a loot roll to its vault caches. Up to 3 hops. Lose your Signal and you lose the whole chain's pack. |
| III | **Deep link.** A rogue server opens two layers past it: a Pit in that layer's band, with a throne folder holding that layer's world boss (genome 7.3). It's the one place you fight above your frontier on purpose. |

**How you see it.** Dashed links from the node to what it reaches, and its card lists them: *3 servers in reach*. A hop's banner names the chain (*hop 2 of 3 · +1 level · +1 roll*).

### 2.5 Chokepoint

The Honeytoken, the Firewall Node, the IDS, the Sentry and the Citadel become one type. Swarms stop being a chore spread over every server and become one place you fight when you choose.

| Tier | What it does |
|---|---|
| I | **Draw.** Every swarm on your network goes for the Chokepoint: any held server's natives, swarms from past your servers, a Hostile faction's answer. Its firewall is 3 levels higher. Other servers never lock down while it draws. |
| II | **Quarantine.** A swarm that reaches it doesn't run a timer. It moves into `/quarantine` and waits for you, up to 2 swarms. A third goes for its own target as today. Clear it when you like: a fight a process, paying as a swarm. |
| III | Quarantine holds 3. Swarms come led by an elite. A cleared swarm leaves a capture (as a champion's: a protocol, a Custom filter or an invasion-only unique) and traces its origin server 50%. |

**How you see it.** The node is a funnel, and every swarm on the map bends toward it. The card reads *Quarantine 1/2*, and the folder lists each swarm with its family and size.

### 2.6 Exchange

The plain option, and nothing more. It pays straight into your balance with no store and no collecting, online or off, for up to 24 hours away.

| Tier | Pays an hour |
|---|---|
| I | 20 + 3 × level credits (today's Credit Skimmer) |
| II | ×1.5, plus 2 + level/10 of the server's code (in your network's rich code 30% of the time, as every code drop) |
| III | ×2, and an Exploit every 8 hours |

Natives notice an Exchange 1.5 times as often. The thief invasion, which used to take half an outpost's stores, now goes after an Exchange: if it gets through, the Exchange pays nothing for 2 hours.

**How you see it.** A coin on the node and one readout: *+142 credits an hour · 1,136 since you last looked*.

### 2.7 Range

A cyber range: the bosses you've beaten, on a server of yours. Bosses stay predictable. A loaded boss is the same fight every time, and a patched one is the same patched fight every time.

| Tier | What it does |
|---|---|
| I | **Replay.** Load a solo boss you've beaten (a lair room's, a world boss, a member's lair boss) into `/range`, at your level, with its own loot table and pity. It comes back an hour after it falls, like a lair's `/core`. One boss loaded at a time. |
| II | **Patch.** Add one gene from its author's toolkit, inside the compatibility rules. A patched kill rolls loot once more and drops at +2 item levels. |
| III | Two patches. **Guest images**: load the boss of any author you've met, beaten or not, including authors who have left your network (genome phase 5). This replaces the guest lair's once-a-day, 30-minute window in genome 6.4. |

**How you see it.** The node is a box with the boss's mark in it. The card reads *Loaded: DEADBOLT · patched: Rate cap · back in 41 min*.

### 2.8 Natives, lockdown and regrowth

The rules stay: natives notice a held server, a lost defence is a 2-hour lockdown (or until you retake it), and two lockdowns you let run out while logged on within 24 hours regrow the Resident. A plain server draws no natives. A typed one does, at 15% more per tier, times its type's draw:

| Type | Natives notice it | In lockdown | After regrowth |
|---|---|---|---|
| Listening Post | ×0.75 | No carriers are planted, and tier I's lift stops. Carriers already waiting stay. | Type, tier and tuning wait for the retake |
| Lure | ×1, and they come as its bait | Its folders empty | 〃 |
| Jump Host | ×1 | No blind runs, hops or deep link from it. A chain already out is untouched. | 〃 |
| Chokepoint | It takes everyone's | Swarms go back to their own targets. Quarantine keeps what it holds. | 〃 |
| Exchange | ×1.5 | Pays nothing | 〃 |
| Range | ×1 | The boss unloads | 〃 |

A conversion or upgrade pauses during a lockdown or a swarm at the server, as builds do today.

## 3. Site traits

Each trait does something you feel at that server whatever it is, and favours one type at double strength. Six traits instead of five, still on 45% of servers. The trait shows as a chip on the card and in the server's files. In the Convert panel, the favoured type carries a *×2 here* tag.

| Trait | At the server, whatever it is | Favours | At that type |
|---|---|---|---|
| Rich | Its rotated caches pay double, and natives notice it 1.5 times as often | Exchange | Pays double |
| Hostile | Natives come twice as often, and as its family's strain | Lure | Every kill rolls for loot twice |
| Legacy | Rotated processes roll for loot once more | Listening Post | Carriers come twice as often |
| Backbone | It hangs off three unknown servers instead of two | Jump Host | One more hop, and blind runs reach two hops out |
| Hardened | Its Resident and natives are Armored (as today) | Chokepoint | Quarantine holds one more, and its firewall +3 more |
| Testbed (new) | Its viruses roll one gene more (before phase 3: always a mutation) | Range | Each patch costs nothing to swap, and a patched kill rolls once more |

## 4. Limits

| Limit | Rule | Why |
|---|---|---|
| Per type | At most 2 servers of each type, and only one of them at tier III | The bot held 4 to 5 servers by level 40. With six types, you pick, and a later find can change the pick. |
| Bandwidth | Gone, and nothing replaces it | The only budget is servers you've taken over, and each takeover is earned |
| Server level and layer | A Lure, a Jump Host and a Range want your newest deep servers. An Exchange and a Chokepoint work anywhere. | Old servers drift into the plain roles as you climb |
| Traits | A favoured trait doubles one type | The best home for each type depends on your map, not a guide |
| The network | Your lean, native strain, natives and lair bosses decide what's worth luring, listening for and replaying | No two networks have the same answer |
| Consortium Grid | Replaces *+1 outpost slot* with +1 to every type's cap | |

## 5. Migration and what goes

**What goes.**

| Removed | Notes |
|---|---|
| Building slots, server size as slots, bandwidth, the build queue | Size survives only as a Lure's folder count |
| All 13 buildings, specialisations, stores and collecting | |
| Plans: the vault roll (15% of vaults), Halcyon's **Plans** shelf, `buy plan-*` | Crafting is going entirely, so there are no Craft-page recipes left to move. The Craft page never held building plans; they were on Halcyon's shelf. |
| Salvage in every cost | The Scrap Mill and the Data Miner's salvage go with it |
| Edge Router and Scheduler (services) | Both existed only for bandwidth and collecting |
| Architecture (Fortress, Hub, Lab) | Hub was bandwidth and Lab was a building and crafting discount, so only Fortress's +5 home firewall would be left. See open question 4. |
| Root 4's slot and producer perks, Root 5's producer doubling | Replaced by the tier gates (2.1) |

The Relay item is not a building and stays: it goes on any held server, typed or plain. How you get one, now that it can't be crafted, is part of the crafting removal and not this change.

**An old save** (a version bump, `loc.buildings` → `loc.type = { id, tier, tune }`):

1. Every store is banked.
2. Each held server with buildings gets a type: a Listening Post if it had one (keeping your `s.listen` tuning), otherwise whichever group it spent most on. Producers, the Storage Array, the Pipeline and the Refinery make an Exchange. Defences and the Honeytoken make a Chokepoint. A tie makes an Exchange.
3. A server with a specialisation (Refinery or Citadel) starts at tier II, whatever its Root level. Every other one starts at tier I.
4. Past the per-type cap, the server with the lowest level stays plain.
5. Every building's cost comes back in full: credits, code and Exploits. Its salvage comes back as credits (10 a salvage) if salvage is removed. The conversion is free.
6. Each plan you knew beyond the Code Siphon pays its Halcyon price back in credits.
7. Edge Router and Scheduler come back at cost for every version installed, as save v34 did. A picked architecture is cleared, and its switch fee comes back if you paid one.
8. A mail from wick says what each server became.

## 6. With the genome and the consortium

| Genome phase | Touches |
|---|---|
| 2, implicits | The Lure's tier III is the way to farm a chosen implicit, now that implicits only come from drops |
| 3, authors and sectors | A Lure baits from the sector holder's toolkit. A Jump Host's blind runs show the next sector's author before you've traced it. A Lure in ACTUARY's sector steers its repricing. |
| 4, lairs, boss tables, sets | The Range replays any band's lair boss, so a finished room's loot stays reachable. Listening Post III carriers can carry set pieces. |
| 5, handovers and reflash | The Range's guest images keep departed authors' bosses reachable with no daily window. A reflash loses the servers, as genome 6.2 says, and pays back half of the credits and code put into their types. |

**The consortium.** A member's typed servers work for you when you're on their network:

| Their type | For you |
|---|---|
| Exchange | The dividend, 25% of what it pays, in their rich code as today |
| Lure | You can farm it, and its natives roll at their home rate |
| Range | You can fight what they've loaded, with your own pity |
| Jump Host | Blind runs and hops into their frontier |
| Listening Post | Its tuning shows on their card. A native it listens for is named for you. |
| Chokepoint | Invasions at their outposts (*Defend for a bounty*) go to it |

Linked's +10% outpost yield applies to Exchanges only. Simulated members' outposts stop using the old harvester kinds (`OUTPOST.kinds`) and roll types from their handle's seed. Crewmates join fights at a Lure, a Chokepoint's quarantine and a Range as they join any fight.

## 7. Open questions for the designer

| # | Question | Options | Recommendation |
|---|---|---|---|
| 1 | Switching type | Reset to tier I. Keep the tier for a refit fee. Free. | Keep the tier, pay tier I's price times the tier, 30 minutes a tier. Trying a type shouldn't throw away Root you earned. |
| 2 | Caps | 1, 2 or 3 per type. Only one at tier III. | 2 per type, one at tier III, Grid +1. |
| 3 | Tier gates | Root levels. Server level. Cost only. | Root 3 and Root 5, with 10 wins at the server counting as a process, so you earn tiers by playing there. |
| 4 | Architecture | Remove it. Keep Fortress alone. Rework all three. | Remove it. The Chokepoint takes the defensive role, and the home wall has filters and tiers. |
| 5 | Chokepoint's quarantine | No timer. A long timer. | No timer. Its capacity is the limit, and a full quarantine sends the next swarm to its own target. |
| 6 | Exchange numbers | Today's Skimmer. Lower. Higher. | Today's Skimmer at tier I. Measure with the pacing bot that the bot taking three Exchanges doesn't out-climb one that takes Lures. |
| 7 | Carrier pace | 15 and 8 wins. Faster. A clock. | 15 and 8 wins, never a clock. |
| 8 | A Range's crew bosses | Allow KESSLER-FARM-00's three with a crew. Solo bosses only. | Solo only. The farm is the crew's place. |
| 9 | Names | The designer's working names (Honeypot, Relay, Fortress). The ones here. | Lure, Jump Host and Chokepoint, because Honeypot is a gene and the lab layout, Relay is an item, Fortress an architecture, and Sinkhole and Honeynet are invasion uniques. |
| 10 | A rotation's rare process expires within the hour | Keep it. Let it wait like a carrier. | Let it wait. It's the one timer left on a held server that punishes being away. |
