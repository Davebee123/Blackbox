# Roguelite: a run is a breach of one server

This is a design for review. Nothing here is built, and no code changes until the designer picks a direction. It proposes reshaping BLACKBOX into a roguelite inside a persistent world, the way Hades and Dead Cells work. Each run breaches one server on a branching map like Slay the Spire's. Class levels, gear, uniques and the servers you capture persist. What you draft inside a run resets.

The designer's brief, in their words:

> "I think we need a major refactor in how the game plays. It's not very fun and I think the systems themselves are just bloated. I think the concept of the server itself needs to be elaborated. The servers need to have a lot more interaction and combat, and I wonder if it needs to look like a slay the spire map. Each area has a virus in it, and defeated that virus alters the final output of the server in a certain way. So essentially you are hacking the server to change it to do something for you. And each server is like mini dungeon that you have to explore. I think the game is starting to feel good in terms of friction, and the items are getting more interesting, especially with the little added bonuses. I think the tells are still not very exciting, as they don't really change my approach to a fight. Maybe everything is just too predictable and the format of the game needs to be formed to a different design entirely. Maybe it should be focused on a rogue like experience instead with more randomness."

And on story: *"I don't even know if we do story mail. Maybe there are nuggets of info we put at the end of the server."*

**Decisions (designer):** proceed with every recommendation in section 10, except counter-breaches, which are cut: *"Idk if counter breaching is going to solve anything. We just need to keep the systems lean."* Lean is the rule: a system that doesn't change what you fight, how you fight or what you can get doesn't ship.

Decisions already made: roguelite runs inside a persistent world, this doc before any code, crafting and salvage removed ("I never craft anything"), and Inject becoming one strong refreshing burn instead of three stacks (landing separately). Mail is cut, and story moves into fragments found at the end of a server (section 6.6).

## 0. The short version

| Question | Answer in this design |
|---|---|
| What is a run? | A **breach** of one server: three acts (Perimeter, Services, Kernel) of five rows each on a branching map, an act **gate** after each of the first two acts, and the server's **Resident** at the end. About 11 fights and 35 to 45 minutes. |
| What do you choose? | Your path. Fog hides the map more than two rows ahead. Node kinds are virus, elite, cache, terminal, broker and defrag. |
| Where is the randomness? | Every fight drafts 1 of 3: a **mod** (changes how one of your skills works), a **CVE** (a relic that lasts the run) or **gear** (a real item that persists). Every virus rolls its genome from its author. Map, events and drafts are seeded per breach. |
| What does the server become? | Each subsystem you clear (smtpd, dns, cron, syslog…) is **rewritten**: pick 1 of 2 or 3 rewrites. Beat the Resident and the server is captured. Its **output** is the sum of your rewrites, and it changes later runs: what you fight, how you fight, or what you can get. |
| What persists? | Class levels, skills and talents, gear and uniques, the codex, captured servers and their outputs, the unlocks that widen the draft pool, faction ranks, heat cleared, and the lore fragments you've recovered. |
| Tells? | Rebuilt so that each kind asks for a different verb, and some tempt you to let them land. Overclock doubles the damage the virus takes, Beacon pulls the next node's virus in so you can skip it, and Lock is fed a skill that's on cooldown anyway. |
| What goes? | Home defence, outposts, hubs and markets, salvage and crafting, mail and contracts, services, server memory, real-time timers. Crew and the consortium are parked. Section 7 covers every system. |
| First build? | One breach end to end behind `?playtest=breach`, reusing the combat engine, run terminal, guards, bosses and item rolls. It needs no save change. |

## 1. Diagnosis

### 1.1 Predictable

- **Every tell has one answer.** A charge asks for a burst of 25 to 50% of the part's max, or ◆2, in its window. A cast asks for SIGINT or two hits. A seal asks for a strip, and the Mimic for going quiet. The answer is always "do the thing in the window", and doing it always pays: a stagger, XP and a loot roll. Three charges in four land on a part that still wears ◆ (docs/solo-tells.md), so most of the time the answer is "◆2 this cycle". Nothing about a tell asks you to change your plan. It asks you to hold a key for one cycle.
- **Every virus of a family brings the same tells.** `TELL_SETS.ransomware` is Full Disk, Double Extortion, Overcharge and Key Rotation, in that order, on the same part, every time. That's right for bosses and wrong for wild viruses.
- **Runs are a checklist.** There are five layouts (relay, mailhub, mirror, archive, lab). Each has one guard, one locked folder, a password in a file, and a vault with `payload.bin` and `signal.trc`. Once you've seen the five, a run is `cat`, find the key, beat the guard, `unlock`, `pull all`, `/core`.
- **Builds are decided at home.** Bar, presets and talents are set before you connect, and nothing in a run changes them. The same subclass plays the same way every run. Gear arrives in slivers: the median upgrade is 3.6% on one stat (docs/progression.md 2).

### 1.2 Bloated

- **Systems that don't change a fight.** A climb that spent 7,000 to 9,000 credits on services and 2,700 on buildings reached level 30 within 7% of one that built nothing. Paying for the firewall takes about 45% of income to level 20, and home fights are 3% of all fights (docs/progression.md 2).
- **A dozen level-like numbers.** Hacker level, server level, firewall level and tier, each outpost's firewall, Root 1 to 5, service and daemon versions, item level, location level, layer and faction tiers.
- **Currencies feeding currencies.** Credits, three codes, Exploits, salvage, signatures, Indemnity and standing all exist. Markets trade codes between hubs, and outposts make what crafting spent.
- **Real-time chores.** These all run on the clock: the retainer every 30 minutes, invasions every 20 to 30, swarms every 90 to 150, root rotation every 2 hours, market events every 4, Signal rest over 5 minutes, reconnect waits, the Resident's 6-hour grudge, and outpost stores to collect. Each one is a reason to log in that isn't a fight, which is FOMO.
- **The server is a corridor.** Taking one opens slots for buildings that don't matter (docs/server-types.md 1). The server never becomes anything, and the place you fought never changes.

### 1.3 What works, and stays

The fight itself: cycles, the timeline, parts and ◆, the one clock, the Sync Window, planning with `;`, four classes with eight subclasses and 15-key kits, and talents. Also the items: bases, affixes, the rule affixes (the "little added bonuses"), uniques and their pity. The genome too: genes, authors, the codex and `scan`. Bosses with fixed phases, the friction tuning (Signal carrying from fight to fight, loud runs, elites), and the terminal flavour.

## 2. The run

### 2.1 Shape

| Piece | Rule |
|---|---|
| Acts | **Perimeter**, **Services**, **Kernel**. Each has five rows of nodes. Act 2's viruses are 1 level above the server and act 3's are 2 above. |
| Gates | After act 1 and act 2, a guard: today's WATCHDOG, SENTINEL, CRAWLER, SHREDDER or Kestrel ICE (`GUARDS`). A gate is a fixed fight (no rolled genes). Beating it **banks your pack**, and you choose to go on or jack out. Jacking out keeps the pack and doesn't capture the server. |
| The Resident | Row 16, at `/core`. It's a fixed boss from the server's author and band (genome 7.3 and 7.4), at the server's level +1. It's named on the server's card before you breach, so bosses stay predictable even though runs don't. |
| Signal | Your health for the run: max Signal as today (`maxSignal`), carried from fight to fight as today. Defrag nodes and a few drafts restore it. At 0 the run ends. Nothing rests in real time. |
| Tokens | Session tokens: the run's currency, valid until you jack out. Fights pay 12 to 20, elites 35, caches 30 to 60. Spent at brokers. |
| Trace | Kept from break-ins (`TRACE` in run.mjs), but only loud choices raise it: terminal options, bait pulls and a failed password. At 100 a **hunter** (Tracer ICE) drops onto the next row of every path, and you must fight it. Beating it sets Trace to 50. |
| Losing | You keep XP and everything banked at a gate. You lose the act's unbanked pack, your drafts and tokens, and the server stays uncaptured. Its map is reseeded next time. |

### 2.2 Map generation

The generator follows Slay the Spire's.

1. Each act is a grid of 5 rows by 4 columns.
2. Draw 4 paths from row 1 to the gate. Each step goes to the same column or a neighbouring one, and paths never cross. Nodes no path touches are removed. The result has 2 to 4 choices a row, and lanes that split and merge.
3. Row 1 is all virus fights. Row 5 is all defrag or broker, so you face the gate rested or stocked, your call.
4. Rows 2 to 4 roll by weight, under the rules below.
5. Every fight node is tagged with one of the act's two **subsystems** (section 3), and both appear in every act.

| Node | Mark | What happens | Weight, rows 2–4 | Rules |
|---|---|---|---:|---|
| Virus | `virus` | A wild virus of the sector's author, rolled genome (2.3). Rewards: a draft, a rewrite, tokens. | 40 | |
| Elite | `elite` | A virus sized for one at about 2× Integrity, with two mutations and two tells. Rewards: a draft with a CVE guaranteed, gear at blue or better, a **tier II** rewrite. | 15 | Not in act 1 rows 1–2. At least 2 per act. |
| Terminal | `term` | A choice with a cost (2.4). | 20 | |
| Cache | `cache` | Tokens and an item roll. One cache in four is bait, like the lab's `bait.dat`: `cat` before you `pull`. | 10 | |
| Broker | `broker` | A faction's stall (2.5). | 7 | Never two in a row on one path. |
| Defrag | `defrag` | Pick one: **rest** (restore 30% Signal), **recompile** (upgrade a mod to +), or **re-slot** (swap skills on your bar). | 8 | Never two in a row on one path. |

**Server kinds** set the weights and the subsystem pool. Today's layouts and rogue servers fold in here:

| Kind | Always runs | Map |
|---|---|---|
| Mailhub | smtpd | As above |
| Relay | dns | As above |
| Mirror | sshd | One more terminal a row |
| Archive | backup | Caches ×2, bait ×2 |
| Lab | sandbox | Viruses can roll a mutation one cost higher |
| Nest (rogue) | one family only | Viruses ×1.5, no terminals, strains twice as often |
| Pit (rogue) | mixed authors | Elites ×2, every fight rolls loot twice |
| Gauntlet (rogue) | mixed authors | No defrag nodes, and a bonus cache before the Resident |

### 2.3 What you fight

- **Wild viruses** are the author's body plus **at most one mutation**: one rolled gene from the author's toolkit (genome 3 and 4), on a part wherever the gene allows. Breaking that part ends the mutation, so it's a target, not a modifier. The cost cap rises by act: cost 1 in act 1, 2 in act 2 and 3 in act 3, inside the budget table (genome 5.1).
- **Elites and Residents** carry two mutations, as the designer decided.
- **Tells** come from the author's tell list (section 5). A wild virus brings one tell kind, an elite two, and a boss its fixed set.
- **Strains** stay as named builds, and one fight in five past layer 2 is the network's native strain.
- **Gates** are fixed guards with fixed tells. They're the punctuation between acts.

### 2.4 Fog and exploring

- You see node kinds and subsystems **two rows ahead**. Past that you see the graph (where lanes split and merge) and nothing else. The gate and the Resident always show, with their names.
- A virus node within sight shows its family and author. `scan <node>` (1 Signal, +4 Trace, as today) shows its genome card before you commit. Infiltrators scan for free and see three rows ahead, which is their class identity in runs.
- Nothing is ever shown as a percentage, a hint or a ??? count. You find out by going there.
- The interface stays a terminal. `ls` lists the reachable nodes like folders (`smtpd/ [virus]`, `tmp/ [cache]`, `cron.d/ [term]`), `cd <node>` moves, `tree` draws the map, `cat` and `pull` work in caches and terminals, and `jack out` works at gates.

**Terminal events** (examples). Each is a short scene in files, using today's file-system code.

| Event | What you find | The choice |
|---|---|---|
| Half-written cron | A TOLLGATE job in `/etc/cron.d` | Finish it (+20 Trace): the next gate starts with its signature part delayed 2 cycles. Or wipe it: +15 tokens. |
| Log sweep | Today's forensics puzzle (`sweep <answer>`) | Right: a CVE pick of 3. Wrong: +25 Trace. |
| Locked folder | `unlock` with a password from a file on another node of this act | Inside: gear at yellow or better, or a rare mod. |
| Leaked keys | Credentials for the gate | Use them: the gate starts with 1 ◆ less on every part, but its tell window is 1 cycle shorter. |
| Sandbox sample | A caged virus | Fight it now for a rare draft, at your current Signal. |
| Honeytoken | A file that looks like loot | `pull` it: 50 tokens and +40 Trace. |
| Quarantine | One of your mods, flagged by the server | Lose that mod and gain a CVE, or keep it and lose 10% max Signal for the run. |
| Recovered fragment | Rare: a lore fragment (6.6) | Read it. |

### 2.5 Brokers

The factions survive as stalls inside runs. Each broker sells 3 cards from its own lean, and the stock widens with your rank with that faction (6.2).

| Broker | Sells | Also |
|---|---|---|
| GLASSJAW | Tempo CVEs and mods | Removes a mod for 40 tokens |
| LANTERN | Recon | 30 tokens to see the whole act |
| Kestrel | Defensive CVEs | A gate pass for 80 tokens: skip the next gate's fight, and the pack still banks |
| NULL CHOIR | Sync and rhythm cards | Turns a mod into its + version for 70 tokens |
| Halcyon | Gear | 25 tokens to reroll a draft you're offered later |

Prices: a mod 50 to 90 tokens, a CVE 80 to 150, gear 60 to 140, by rarity.

### 2.6 Example: breaching MERIDIAN-MX-14 at level 10

You're a level 10 Demolitionist. On your bar: Bash, Crack, Exploit, Overload, Flood, Shatter and SIGINT. You wear a blue *Exploit Chain of Interrupts* (Interrupt Handler) and a white Proxy and Shell. Your network holds SPRAWL-00 and VANTA-RELAY-07, which you rewrote last week with **Zone Transfer**, so you see three rows ahead, not two.

**The campaign map.** Three servers sit on your frontier. You hover MERIDIAN-MX-14:

> **MERIDIAN-MX-14** · Mailhub · level 11 · TOLLGATE
> Resident: **DEADBOLT** · Lockpick, Keyjam (Collection: 0/2, 30%)
> Runs: smtpd, sshd · cron, ledger · backup, kmod
> Bounty · Halcyon: capture it without letting a Ransom land. 220 credits, Halcyon rank.

You want Lockpick, so you breach at heat 1 (loud) and take Halcyon's bounty. Bounties now sit on the server card, not in mail (6.7).

**Act 1, Perimeter.** `ls` shows three folders: `smtpd/ [virus]`, `sshd/ [virus]` and `smtpd/ [virus]`. `tree` shows rows 2 and 3 as well: a terminal and a cache on the left, an elite sshd on the right, and fog below. You go left.

*smtpd: RIGGED CRYPTJACK-2210 · TOLLGATE.* Its mutation is Zip Bomb, on a small bare part. Its tell is **Ransom**. You Crack the Pulse Node, and Shatter's shards chip the Zip Bomb. On cycle 4 the Encryptor starts *Demanding*: when it lands, it takes 25 tokens, or 10% of your Signal if you hold fewer. You hold 0, and the bounty forbids it anyway, so you hit the Encryptor twice in its window and keep SIGINT. You break the Zip Bomb last, on a cycle when nothing else is due, and take the 25% blast. Signal is 74%.

The draft offers three cards:
> **Aftershock** (mod, Crack) — Crack also deals 8 damage to the target for each ◆ it breaks.
> **Heartbleed** (CVE) — Heals you for 3 each time you break a ◆.
> **Weaponized Proxy of the Bunker** (Tuned, lv 10) — Stack Canary — Each fight starts behind a shield of 4.

You take Aftershock, since Crack is your opener and now it damages too. Then comes the rewrite:
> **smtpd** — pick one
> **Mail Drop** · Pays 60 + 6 × its level credits when you finish any breach. *Now:* +30 tokens.
> **Spam Cannon** · Viruses on servers linked to it start with 15% less Integrity. *Now:* the act 1 gate starts with 10% less.

KESTREL-DC-3 is linked to MERIDIAN and is next on your list, so you take Spam Cannon.

*Row 2, `cron.d/ [term]`.* A half-written TOLLGATE cron job. Finishing it costs +20 Trace and delays the gate's Tracker by 2 cycles. You finish it. *Row 3, cache:* you `cat` first, it's clean, and you pull 40 tokens and a white Script.

*Row 4, sshd elite: LOCKED CRYPTJACK-0447 v2.* It has two mutations, a Mutex and Rage, and two tells: **Lock** and Key Rotation. Lock reads *Locking · the first command you fire after it lands is locked for 3 cycles, key 1 included.* It lands on cycle 6, so on cycle 6 you fire Flood, a 6-cycle cooldown that was going down anyway. The Lock eats a key you couldn't use, and that's the whole verb. You strip the Mutex before Key Rotation lands. The elite's draft has a CVE guaranteed:
> **BlueKeep** (CVE) — Gates and Residents start with 1 ◆ less on every part.
> **Conficker** (CVE) — Your next skill is ready at once when a tell lands on you.
> **Overcommit** (mod, Overload) — Overload deals 60 damage and costs 4 Signal. A critical strike refunds the Signal.

You take BlueKeep, for DEADBOLT. The rewrite is **tier II**, because an elite cleared it. You pick **Forged Keys II**: every breach starts with a pick of 1 of 3 CVEs, and its rare odds are doubled.

*Row 5, defrag.* You're at 58%. You rest to 88%, because WATCHDOG's Lock-on is a big charge.

*Gate: WATCHDOG.* Your cron job delays its Tracker for 2 cycles, and BlueKeep takes a ◆ off every part. It falls in 7 cycles, and your pack banks: the Proxy and the Script are safe now. You go on.

**Act 2, Services** (cron and ledger). The left lane runs virus, broker, virus. At the GLASSJAW broker you buy **Slowloris** (every 4th cycle, every virus attack is delayed 1 cycle) for 95 tokens.

Then a SWARMLINE worm starts **Beacon** in cron's row: *Calling home · if it lands, the virus at the next node on your path joins this fight at half Integrity, and that node is empty.* The next node is a cron virus you'd rather not fight at 61% Signal. You let the Beacon land, Shatter's shards cover both bodies, and you skip a fight. The cost: cron's node is empty, so cron gets no rewrite, and you lose that draft.

At ledger, a GLASSJAW virus starts **Overclock**: *for 2 cycles, every attack comes a cycle sooner and every part takes double damage.* You let it land, Crack and then Flood a bare part for double, and break two parts in two cycles. Ledger's rewrite is **Bounty Board**: one more bounty offered on every server card. The gate is SENTINEL, and you strip its Lockout before Blacklist seals.

**Act 3, Kernel** (backup and kmod). You take **Restore Point** at backup: once per breach, when your Signal would drop to 0, it drops to 1 and you restore 25%. At kmod you take **Kernel Hook**: drafts offer 4 cards. Two elites wait on the right lane, so you take the left and arrive at 71%.

**DEADBOLT.** A Mutex locks its Encryptor. It re-arms at 60%, and at 30% a second Mutex throws a fresh lock. BlueKeep starts every part 1 ◆ light. Aftershock's Crack damages the Mutex as it strips, and the bounty holds, because no Ransom ever landed. It falls on cycle 15. You get three loot rolls and a gold Proxy, but no Lockpick. The Collection reads *Lockpick · 40% next kill*.

Then `/core` lists one more file: `core.dump`.

> `core.dump` · recovered from DEADBOLT's process
> *TOLLGATE build note, unsigned: "halcyon flagged mx-14 as insured. good. insured doors are the ones they forget to lock."*

It joins the **Archive** (6.6) as fragment 3 of TOLLGATE's 7.

**The capture card.**

> **MERIDIAN-MX-14** · captured · heat 1
> smtpd · Spam Cannon · linked servers' viruses start with 15% less Integrity
> sshd · Forged Keys II · every breach starts with a CVE pick of 3, with rare odds doubled
> cron · stock
> ledger · Bounty Board · one more bounty on every server card
> backup · Restore Point · once a breach, 0 Signal becomes 1 and you restore 25%
> kmod · Kernel Hook · drafts offer 4 cards
> +1,180 XP · +220 credits (bounty) · 2 servers revealed

The map node grows the marks of its rewrites. KESTREL-DC-3 now shows *Spam Cannon: −15% Integrity* on its card.

## 3. Rewrites

### 3.1 Subsystems and rewrites

A server runs six subsystems, two in each act, drawn from the pool for its act and its kind. Clearing a subsystem's fight node offers its rewrites. Tier I comes from a virus, tier II from an elite or from clearing the same subsystem twice in one breach. *Now* applies for the rest of this breach. *Output* applies once you capture the server.

**Act 1: Perimeter**

| Subsystem | Rewrite | Output (tier I) | Tier II | Now | Replaces |
|---|---|---|---|---|---|
| smtpd | **Mail Drop** | Pays 60 + 6 × its level credits when you finish any breach. | ×1.5, and +1 Exploit on a capture | +30 tokens | Exchange |
| smtpd | **Spam Cannon** | Viruses on servers linked to it start with 15% less Integrity. | 25% | The act 1 gate starts with 10% less Integrity | |
| dns | **Sinkhole** | Name a family or a gene you've decoded. Breaches of linked servers roll it 3 times as often, so their drops carry its implicit. | Two picks, or a strain | The rest of this act's viruses roll it | Lure |
| dns | **Zone Transfer** | You see 1 row further on every breach. | 2 rows | Reveals this whole act | |
| sshd | **Jump Host** | You can breach servers two links past this one, before they're revealed. | Three links | You may move to any node in the next row | Jump Host |
| sshd | **Forged Keys** | Every breach starts with a pick of 1 of 3 CVEs. | Rare odds doubled | A CVE pick now | |
| sshd | **Service Account** | You can jack out at any node and keep your pack. | The pack banks at every elite | The next locked folder opens free | |

**Act 2: Services**

| Subsystem | Rewrite | Output (tier I) | Tier II | Now | Replaces |
|---|---|---|---|---|---|
| cron | **Warm Start** | Every fight on a breach starts with your cooldowns 1 cycle further along. | Also your first SIGINT | Same, this breach | |
| cron | **Nightly Build** | Gives 1 more draft reroll each act. | 2 more | 2 rerolls now | |
| syslog | **Listening Post** | Name a unique you've heard named. It drops 50% more often, and each breach plants one carrier node on the map, a virus that rolls for it at boss odds. | 2 carriers a breach | The next elite rolls loot twice | Listening Post |
| syslog | **Rotate Logs** | Trace rises 25% slower on breaches. | 40% | Trace −40 | |
| syslog | **Audit Trail** | `scan` is free on breaches and shows the node's tell before you engage. | Reads 4 rows ahead | Free scans this breach | |
| ledger | **Bounty Board** | One more bounty offered on every server card. | Bounties pay ×1.5 | A bounty for this breach | Contracts |
| ledger | **Price Fix** | Brokers charge 25% less. | 40% | The next broker is half price | |
| ledger | **Slush Fund** | Every breach starts with 40 tokens. | 80 | +40 tokens | |

**Act 3: Kernel**

| Subsystem | Rewrite | Output (tier I) | Tier II | Now | Replaces |
|---|---|---|---|---|---|
| backup | **Restore Point** | Once per breach, when your Signal would drop to 0, it drops to 1 and you restore 25%. | 40% | Restore 25% | |
| backup | **Archive** | At the start of each breach, draft 1 of the mods you ended your last breach with. | 1 of them, or 2 picks | Copy one mod you hold onto a second skill | |
| sandbox | **Range** | This server's card gets *Replay*: its Resident alone, at your level, with its loot table and pity. You earn a replay charge for each breach you finish, and hold up to 3. | Patch one gene onto it for an extra loot roll | You see the Resident's genome and phases | Range |
| sandbox | **Testbed** | Viruses on linked servers roll one more cost step and drop 2 item levels higher. Wild viruses still carry 1 mutation at most. | +1 implicit tier | The next fight drops gear at blue or better | |
| kmod | **Kernel Hook** | Drafts offer 4 cards. | Also gates' drafts | Same, this breach | |
| kmod | **Memory Map** | +10% max Signal on breaches. | +15% | +10% now | |

That is 22 rewrites over 9 subsystems. The good ideas in docs/server-types.md (Listening Post, Lure, Jump Host, Chokepoint, Exchange, Range) all live here as rewrites, so that doc is superseded.

### 3.2 A server's output

1. A captured server's output is one line per subsystem you cleared, at tier I or II. A subsystem you skipped stays stock and does nothing. That's the cost of a Beacon you let land, or of a path you didn't take.
2. **Each rewrite counts once on your network**, at the best tier you hold. Two Kernel Hooks don't make 5 cards. This is the rule rule affixes already follow, and it's what keeps outputs varied: a new capture is worth most when it brings rewrites you don't have.
3. **Linked rewrites** (Spam Cannon, Sinkhole, Testbed, Jump Host) act on the servers linked to their own server. Two copies on different servers reach different neighbours, and each counts there. Where you capture something matters, so geography on the campaign map becomes a choice.
4. **Re-imaging.** You can breach a server you hold again at its best heat or higher. Each subsystem you clear lets you keep its old rewrite or pick a new one, and the Resident is the same fight.

### 3.3 Between runs

Nothing ticks in real time. Outputs fire at the start of a breach (tokens, CVE picks, Signal), during one (drafts, scans, Trace), and when one ends (credits, bounties). A week away costs nothing.

**No counter-breach.** Home defence is cut outright, not folded in (designer: "Idk if counter breaching is going to solve anything. We just need to keep the systems lean"). A captured server stays captured.

### 3.4 Limits

| Limit | Rule | Why |
|---|---|---|
| Per server | 6 lines, one per subsystem | One breach decides one server |
| Per network | Each rewrite once, at its best tier | Outputs widen the run, they don't stack into flat power |
| Power rewrites | Restore Point, Kernel Hook, Memory Map, Forged Keys and Warm Start are the only ones that make runs easier. They're all act 3 or tier-capped, and heat (6.3) costs more than they give. | Runs must stay hard |
| Network size | No cap. A capture costs a 40-minute run, and new captures only add rewrites you lack. | Diminishing returns come from rule 2, not a slot count |

## 4. Drafting

### 4.1 The draft

| Fight | Cards | Rules |
|---|---|---|
| Virus | 3 (4 with Kernel Hook): each card a mod 50%, a CVE 15%, gear 35% | At least two kinds in every draft. **Skip** for 15 tokens. |
| Elite | 3: one CVE guaranteed, gear at blue or better | |
| Gate | 3 gear cards, all blue or better | The pack banks right after |
| Resident | Its boss loot table (three rolls and pity), then 1 of 3 gear | No mods or CVEs: the run is over |

| Rarity | Colour | Act 1 | Act 2 | Act 3 |
|---|---|---:|---:|---:|
| Common | white | 60% | 50% | 40% |
| Uncommon | blue | 32% | 36% | 40% |
| Rare | yellow | 8% | 14% | 20% |

Elites move 10 points from common to rare. Every draft without a rare adds 3% to the next one's rare odds. **Rerolls:** 1 free each breach, more from Nightly Build or Halcyon's broker. A reroll redraws all the cards.

### 4.2 Mods

A mod changes how one skill on your bar works. Only skills you have unlocked and slotted can roll one. A skill holds one mod, and drafting a second on the same skill replaces the first (the card shows both). A defrag **recompiles** a mod to its + version. Your bar can only change at a defrag (*re-slot*), so a mod is a commitment. Every mod is a sidegrade with a reason to want it, and some carry a cost.

| Class | Skill | Mod | What it does | + | Tells it changes |
|---|---|---|---|---|---|
| Breaker | Crack | **Aftershock** | Crack also deals 8 damage to the target for each ◆ it breaks. | 12 | Seal, Swap: strips that also hurt |
| Breaker | Overload | **Overcommit** | Overload deals 60 damage and costs 4 Signal. A critical strike refunds the Signal. | Costs 2 | Overclock: you want it to land |
| Breaker | Flood | **Undertow** | Flood delays the target's next attack by 1 cycle when the target has no armor. | Also a charge on it | Lock: a 6-cycle key to feed it |
| Demolitionist | Shatter | **Fragmentation** | Shatter's shards also hit parts that wear ◆, breaking 1 ◆ on each. | 2 ◆ on the target | Fork: copies are stripped on arrival |
| Demolitionist | Backfire | **Blowout** | Backfire's blast also hits every other part for half. | Full | Charge |
| Overclocker | Hot Loop | **Feedback Loop** | Hot Loop grants 2 Momentum when it lands a critical strike. | 3 | |
| Overclocker | Thermal Throttle | **Meltdown** | Thermal Throttle hits every part, at half damage for each Momentum spent. | Two thirds | Fork, Beacon |
| Overclocker | Segfault | **Core Dump** | Segfault also breaks every ◆ on a part winding up a tell. | | Swap, Seal |
| Bastion | Firewall | **Reflective ACL** | Firewall deals a whole hit back to the part that dealt it when its shield absorbs that hit. | ×1.5 | Dead Man: break it into your shield |
| Bastion | Retaliate | **Grudge Match** | Retaliate stays usable for 2 cycles after you are hit, and can be fired twice in that time. | 3 cycles | Charge: let it land, then return it |
| Bastion | Purge | **Deep Scan** | Purge also clears one tell's after-effect from you, and its ticks heal for 3. | 4 | Every tell: landing costs less |
| Bastion | Rate Limit | **Token Bucket** | Rate Limit Throttles the target's next 2 attacks, but deals 15 less damage. | Full damage | Overclock |
| Warden | Blowback | **Ricochet** | Blowback also hits every other part for a quarter of what it deals. | Half | Fork |
| Sysop | Checksum | **Parity Bit** | Checksum heals you for half of what it deals, but deals 25% less damage. | 15% less | Ransom: pay in Signal, heal it back |
| Infiltrator | Inject | **Viral Load** | Inject's burn deals 4 more damage each cycle it ticks, and refreshing it keeps the growth. | 6 | Lock: one press, a long burn |
| Infiltrator | Backdoor | **Persistence** | Backdoor also starts an Inject on the target. | | Seal (through armor) |
| Infiltrator | Tag | **Tracking Pixel** | When a Tagged part breaks, Tag moves to the part whose attack lands soonest, with the cycles it had left. | +2 cycles | Fork, Beacon |
| Infiltrator | Keepalive | **Long Poll** | Keepalive makes every burn on the target tick twice now, but adds no cycles. | Three times | Overclock: double ticks on a doubled part |
| Payload | Wormable | **Lateral Movement** | Wormable spreads to every part instead of one more. | | Fork, Beacon |
| Phantom | Backstab | **Blindside** | Backstab is a critical strike against a part that attacked last cycle. | And Open | Bait |
| Operator | Deploy | **Daemonize** | Deploy's helper stays until its part breaks, dealing 8 damage each cycle. | 11 | Lock: one press, a long helper |
| Operator | Hook | **Barbed Hook** | Hooked parts take 10 more damage from helpers and burns, and none more from your commands. | 14 | Dead Man: kill it with helpers on your cycle |
| Operator | Spawn | **Clone** | Spawn sends 2 helpers, but its cooldown is 2. | Cooldown 1 | Fork |
| Operator | Botnet | **Zombie Swarm** | Botnet's helpers move to a fragment or a copy when one appears, and deal double damage to it. | Triple | Fork, Beacon |
| Herder | Kill Switch | **Dead Drop** | Kill Switch leaves a helper for each one it cashes in, dealing 4 damage each cycle for 2 cycles. | 6 | Charge |
| Hijacker | Spoofed ACK | **SYN Cookie** | Spoofed ACK delays the attack by 2 cycles. | Its cooldown −1 | Overclock: push it out of the doubled window |

Phase 3 writes 6 to 8 mods per class (core skills) and 3 per subclass, about 50 in all.

### 4.3 CVEs

A CVE lasts the whole breach. The name keeps clear of today's words: *exploit* is already a slot, a Breaker skill and a currency, and *zero-day* is a rarity. CVEs are written in the effect blocks uniques and rules already use (`when · if · does · limits`, content.mjs), so most need no new code. You hold any number of them, but only one copy of each.

| CVE | Rarity | What it does |
|---|---|---|
| **Heartbleed** | Common | Heals you for 3 each time you break a ◆. |
| **Shellshock** | Common | Delays the attack that lands soonest by 1 cycle at the start of each fight. |
| **EternalBlue** | Common | Makes your first command each fight a critical strike. |
| **Sasser** | Common | Restores 5% of your Signal after a fight where no tell landed. |
| **Mirai** | Common | Sends a helper at the next part when you break a part, dealing 5 damage each cycle for 3 cycles. |
| **WannaCry** | Common | Pays 15 more tokens after every fight. Trace starts at 30. |
| **BlueKeep** | Uncommon | Gates and Residents start with 1 ◆ less on every part. |
| **Stuxnet** | Uncommon | The part carrying a virus's mutation starts each fight with no armor. |
| **Slowloris** | Uncommon | Delays every virus attack by 1 cycle on every 4th cycle. |
| **Conficker** | Uncommon | Your next skill is ready at once when a tell lands on you. |
| **Code Red** | Uncommon | Increases your damage by 25% while the virus is Overclocked or a Fork copy lives. |
| **Ghostcat** | Uncommon | Tells are announced 1 cycle further ahead. |
| **POODLE** | Rare | Drafts offer 1 more card. |
| **Zerologon** | Rare | Defrag nodes give both rest and recompile. |
| **Morris** | Rare | Elites draft twice. Virus fights offer 2 cards. |
| **Meltdown** | Rare | Your critical strikes deal ×2. So do the virus's. |
| **NotPetya** | Rare | Grants a random rare CVE at the start of each act. Your max Signal is 10% lower. |
| **Ripple20** | Rare | Each tell you let land readies SIGINT. |

**Daemons become CVEs.** The ten daemons (Sweeper, Fuzzer, Stall, Mender, Spider, Mirror, Watchman, Canary, Cron Job, Snapshot) join the pool as CVEs that act on their own cooldown for the breach. A daemon you own today unlocks its card (section 8).

### 4.4 Gear in the draft

A gear card is a real item, rolled by `rollItem` at the node's level with today's rarities, affixes and rule affixes. The rule affixes are the little bonuses the designer likes, and once genome phase 2 ships, the **implicit** from the gene of the virus that dropped it. You can equip it between nodes, and it goes into your pack, which banks at gates. So a run's path decides which genes you farm implicits from, and the draft is where the persistent chase meets the run. Uniques don't appear as draft cards. They drop from Residents, elites, natives and carriers, as named items with sources.

## 5. Tells, reworked

### 5.1 The problem, and the rule

Today every tell asks the same question: can you deal the burst in the window? Every answer earns the same thing, a stagger. The rework gives each tell kind **its own verb**, and makes **landing a real option** for some of them. A drafted build makes some kinds easy and others dangerous, so the same tell plays differently in different runs.

What stays: the one clock (every tell rides the timeline and goes through `announce`), the warning lead, the live limit (one tell live below 17, two from 17), the spike cap, a fixed part per tell, "only deliberate answers count", and breaking the part always stopping it. Bosses keep fixed tell sets and fixed parts. The universal stagger goes: each kind has its own payoff.

### 5.2 The catalogue

| Tell | Chip kicker | Verb | Telegraph | Answer | If it lands | Why you might let it |
|---|---|---|---|---|---|---|
| **Charge** (kept) | *Charged* | Burst | Its attack's cell, 2 cycles ahead | Burst or ◆2 in the window | ×2 to ×3 and an after-effect | Rarely: with Bulkhead, Circuit Breaker, Grudge Match or Conficker |
| **Seal** (kept) | *Sealing* | Strip | Its own cell, 2 or more ahead | Strip the part before it lands | Re-arms with 1 ◆ more, and stripped parts get one back | Never. This is the stripper's test. |
| **Mimic beat** (kept) | *Recording* | Go quiet | The beat, always on the board | Fire no direct hit on the beat | Your hit comes back at you | Never |
| **Fork** | *Forking* | Kill the source | 3 cycles ahead | Break the source part. Hits don't call it off. | A copy joins at 50%, with the part's attack and its mutation | Each copy you break adds a card to this fight's draft. Area builds farm it. |
| **Overclock** | *Overclocking* | Gamble | A cast, 2 cycles ahead | SIGINT or two hits in the window | For 2 cycles every attack comes a cycle sooner, and every part takes double damage | You hold a cooldown (rm -rf, Fault Injection, Detonate, Overcommit) and the Signal to take two fast cycles |
| **Lock** | *Locking* | Sequence | 2 cycles ahead | None but breaking the part | The first command you fire after it lands is locked for 3 cycles. Key 1 counts. | You always let it land. The play is what you feed it: a long cooldown you just used costs nothing, and key 1 costs your filler. |
| **Swap** | *Rerouting* | Retarget | The receiving part is named on the chip | Strip the source before it lands. Then nothing moves, and the receiver is Open for 1 cycle. | Every ◆ on the source moves to the receiver | If the source is your kill target, letting it land leaves the source with no armor |
| **Dead Man** | *Armed* | Time the kill | 4 cycles armed | Don't break the part while it's armed, or break it behind a shield, a ◆, Null Route or Brace | Nothing, if it's still alive when the switch disarms | It punishes the burst reflex. Bastions break it into a shield on purpose. |
| **Bait** | *Exposed* | Take it or leave it | The part drops its ◆ for 1 cycle and takes double damage | Leave it alone, or hit it with your defence ready | A command hit on it during the bait makes the virus's next attack a charge | Double damage on a bare part. Crit builds take it every time. |
| **Beacon** | *Calling home* | Skip or stop | A cast, 2 cycles ahead | SIGINT or two hits in the window | The virus at the next node on your path joins this fight at half Integrity, and that node is empty when you reach it: no fight, no draft, no rewrite | It saves a fight's worth of Signal, and area builds kill both bodies at once |
| **Ransom** | *Demanding* | Price it | A cast, 2 cycles ahead | SIGINT or two hits in the window | Takes 25 tokens, or 10% of your Signal if you hold fewer | Paying keeps SIGINT for the next cast. Rich runs pay. |

That's 11 kinds, 8 of them new. Fork, Lock and Dead Man reuse code that exists: the Fork() gene, `lockLast` (today's Offline after-effect) and the `deadman` part flag. Beacon is the one tell that reads the run map.

### 5.3 Who brings which

Each author's tell list is part of how you learn it (genome 4.3):

| Author | Tells |
|---|---|
| TOLLGATE | Ransom, Lock, Seal, Dead Man |
| SWARMLINE | Fork, Beacon, Charge |
| PALEMASK | Swap, Bait, Charge |
| NULL CHOIR | Mimic beat, Lock |
| GLASSJAW | Overclock, Lock, Ransom |
| LANTERN | Bait, Beacon |
| Kestrel (gates, ICE) | Charge, Seal, Dead Man |

### 5.4 Builds against tells

| Tell | Easy for | Dangerous for | Cards that flip it |
|---|---|---|---|
| Fork | Demolitionist, Herder, Payload (area, helpers, spreading burns) | Sysop, Phantom (one target, slow) | Fragmentation, Zombie Swarm, Mirai, Lateral Movement |
| Overclock | Overclocker, Payload (Detonate) | Warden and Sysop at low Signal | Overcommit, Code Red, SYN Cookie |
| Lock | Big-cooldown builds | Spam rotations (Spawn, Inject) | Viral Load, Daemonize (one press does a lot) |
| Swap | Single-target focus | Demolitionist mid-strip | Core Dump, Aftershock |
| Dead Man | Warden, Hijacker (Takeover) | Phantom, Overclocker | Reflective ACL, Barbed Hook |
| Bait | Phantom, Overclocker (crits) | Low-defence builds | Blindside, EternalBlue |
| Beacon | Area builds | Anyone low on Signal | Tracking Pixel, Meltdown |
| Ransom | Token-rich runs (WannaCry) | Runs that need SIGINT for a cast | Parity Bit |

## 6. Persistence and meta

### 6.1 What carries over

| Carries | Resets each breach |
|---|---|
| Class levels, XP, skills, subclasses, talents, presets | Mods, CVEs, tokens, Trace |
| Stash, equipped gear, uniques, the Collection and pity | Signal (full at the start) |
| The codex: genes and authors | The map (seeded per breach) |
| Captured servers and their outputs | The pack you haven't banked |
| Unlocks in the draft pool, faction ranks | |
| Credits, Exploits | |
| Best heat on each server and each Resident | |
| The Archive (6.6) | |

XP is paid per kill as today, plus a capture bonus of a third of the run's kill XP. Today's catch-up (*Behind*) and fast-kill bonuses stay.

### 6.2 The unlock pool

The draft pool starts small and widens. Unlocks add width and sidegrades, never flat stats: your class level is the power curve.

| Source | Adds to the pool |
|---|---|
| A skill you unlock | Its mods |
| Faction ranks (1 to 5, earned from bounties and broker purchases) | That broker's CVEs and stock |
| Your first kill of each Resident | One CVE themed on it (DEADBOLT adds *Deadbolt*: the first ◆ you break each fight is broken twice) |
| Daemons you own | Their daemon CVEs |
| The meta vendor (LOWLIGHT's board, at home) | Pool cards for credits, one-time each. It replaces the Halcyon store and faction shops. |

### 6.3 Heat

Heat is today's loud run, grown into ranks. You pick it per breach, and you unlock the next rank by capturing any server at your current one.

| Heat | Adds |
|---|---|
| 1 Loud | Every fight has 25% more Integrity and hits 20% harder (`HOT_RUN`) |
| 2 Hardened ICE | Gates bring one more tell |
| 3 Rotation | One more elite each act |
| 4 Thin pipe | Defrag restores 20% |
| 5 Audit | Trace starts at 40 |
| 6 Fog of war | You see 1 row ahead, and outputs can't widen it past 2 |
| 7 Short list | Drafts offer one card fewer |
| 8 Hardened Resident | The Resident has 25% more Integrity and a re-arm phase at 80% |

**Rewards for heat:** each rank adds 1 item level to drops (up to +5), 3 points to rare odds and 25% to XP. The capture card and the server's node show the heat. A server captured at heat 4 or higher can re-image one rewrite to tier II for free.

### 6.4 The campaign map

The Map page becomes the campaign. Your home sits at the centre, and the network's signature (network.mjs: name, lean, natives, native strain, native boss, rich code) seeds every server on it, as today.

- **You breach a server linked to one you hold.** Capturing a server reveals the servers linked to it. That replaces leads, tracing percentages, trace records and the hidden network.
- **Layers stay as level bands.** A deeper server is a higher level. A server you've outgrown greys out, as SPRAWL-00 does today.
- **Each card** shows the server's name, kind, level, author, its Resident and loot table with pity, the subsystems it runs, bounties posted on it, your best heat there, and, once captured, its output lines.
- **The native boss** is the Resident of one deep server per layer, which replaces the lair.
- **SPRAWL-00 is your first breach.** It's a one-act tutorial with RELAY-KING as its Resident.
- **Sectors and authors** follow genome 4.2. A finished sector's handover and the reflash stay as decided (genome 14). ACTUARY's sector at level 26 reprices against the mods and CVEs you draft most, not the genes you kill. It's the one author that adapts.

### 6.5 The chase

| Chase | Where |
|---|---|
| Boss uniques | Residents (BOSS_LOOT: 30%, +10% a kill with none), replayed through Range |
| Natives | Breaches on your network (×10 there), carriers from a Listening Post |
| World uniques | Elites (8%), gates, caches |
| Implicits | Every random drop, from the dropping virus's gene. You farm a gene with Sinkhole and Testbed. |
| Rule affixes | Blues and yellows, as today |
| Strain trophies | Native strains on your network |
| Sets | Genome phase 4, later |

### 6.6 Lore: fragments, not mail

Mail goes. The story is found, not delivered.

- **`core.dump`.** After every Resident falls, `/core` lists one recovered file: a log, an intercepted message, or an author's build note. It's the payoff at the end of a server.
- **Rare fragments** sit on terminal nodes (about one breach in four) and on the hunter ICE.
- **The Archive** (a tab on the System page, beside the Collection) files every fragment by thread: LOWLIGHT and wick, Halcyon's Claims desk, each author (TOLLGATE 3/7). Missing ones show only as a count. Read in order, they piece together the turf war, who wick works for, and what ACTUARY is.
- **Fragments are seeded per server and author, never random.** Deeper servers and harder Residents carry the later pieces, so the story follows your progress, and each one is found once.
- **The first launch** (the login and Halcyon's transmission) stays as the opening. wick's voice survives in fragments addressed to you.

### 6.7 Bounties

Contracts become **bounties posted on server cards** on the campaign map, where you choose your next breach. Each card shows up to 2, from the factions on that network (1 more with Bounty Board). You take one when you breach. A bounty is a condition on that breach, and finishing it pays credits and faction rank. Failing it costs nothing.

Examples: *Capture without letting a Ransom land.* *Read 3 Fork tells.* *Reach the Resident without a defrag.* *Capture at heat 3.* *Break 6 mutation parts.*

## 7. Keep, cut or fold

| System | Today | Verdict | Reason |
|---|---|---|---|
| Combat engine: cycles, timeline, parts, ◆, the one clock | combat.mjs | **Keep** | It's the game |
| Tells | tells.mjs | **Rework** (5) | One answer doesn't change your approach |
| Sync Window, planning with `;`, SIGINT | combat.mjs | **Keep** | They're how you fight |
| Classes, subclasses, 15-key kits, talents, presets | classes/* | **Keep** | Mods are built on them |
| Hacker level | | **Keep** | The persistent power curve |
| Server level | | **Cut** | A copy of your level (progression 2) |
| Items: bases, affixes, rule affixes, uniques | gear.mjs, content/items.mjs | **Keep** | The chase, and the designer likes the bonuses |
| Implicits | genome phase 2 | **Build** | Ties the drops to the path |
| Sets | genome phase 4 | **Later** | |
| Genome, genes, authors, codex, `scan` | genes.mjs, authors.mjs, genome.mjs | **Keep** | Every node's virus rolls from it |
| Strains | data.mjs | **Keep** | Named builds and trophies |
| Solo bosses, native bosses, the Resident | BOSSES | **Keep** | They become Residents. Fixed fights. |
| Guards and ICE | GUARDS | **Keep** | They become gates and hunters |
| Elites | ELITE | **Keep, resized** | Solo-sized for the map |
| Crew bosses, KESSLER-FARM-00 | raid.mjs | **Park** | Comes back with co-op breaches |
| Crew sim, consortium, presence | crew.mjs, consortium.mjs, presence.mjs | **Park** | Hide the UI. Co-op runs come later. |
| Signal as run health | | **Keep** | It already carries between fights |
| Signal rest, top up, repair, reconnect wait | | **Cut** | Runs have their own health. The timers are FOMO. |
| Loud runs | HOT_RUN | **Fold** | Heat 1 |
| Run file systems, layouts, passwords | run.mjs | **Fold** | The terminal becomes the map's interface, and puzzles become terminal nodes |
| Trace and the hunter | run.mjs | **Fold** | In-run Trace |
| Quirks, rogue servers (Nest, Pit, Gauntlet) | rogue.mjs | **Fold** | Server kinds |
| SPRAWL-00 | zone.mjs | **Keep** | The first breach |
| Leads, tracing, trace records | | **Cut** | Captures reveal neighbours |
| Hidden network, relays | hidden.mjs | **Fold** | Map discovery |
| Networks and the signature | network.mjs | **Keep** | It seeds the campaign map |
| Lair | | **Fold** | A native boss server per layer |
| Root access, log rotation | root.mjs | **Cut** | A real-time chore |
| Outposts, buildings, plans | outpost.mjs | **Cut** | Replaced by rewrites |
| Server types | docs/server-types.md | **Fold** | Its six types are rewrites |
| Swarms | fleet.mjs | **Cut** | A timer that defends outposts that no longer exist |
| Invasions, the wall, firewall, signatures, filters, crash | invasion.mjs, firewall.mjs, filters.mjs | **Cut as a mode** | Cut outright (3.3): no counter-breach |
| Services and code | tickServices | **Cut** | 7% of a climb, and nothing to build with |
| Server memory | memory.mjs | **Cut** | Already switched off |
| Salvage, crafting, the Craft page, blueprints | salvage.mjs | **Cut** | Decided |
| Daemons | | **Fold** | Daemon CVEs |
| Mail: story letters and the retainer | mail.mjs | **Cut** | Story becomes fragments (6.6) |
| Contracts | mail.mjs | **Fold** | Bounties on server cards (6.7) |
| Halcyon standing, Indemnity | | **Fold** | Halcyon's faction rank. Indemnity goes. |
| Halcyon store, faction shops | store.mjs | **Fold** | The meta vendor |
| Factions | factions.mjs | **Keep** | Brokers, ranks, authors |
| Hubs, markets, payloads, donations | hubs.mjs, market.mjs, payload.mjs | **Cut** | Trading changes no fight |
| Event director | events.mjs | **Fold** | Terminal nodes, and the darknet becomes LANTERN's broker |
| Log sweep | forensics.mjs | **Fold** | A terminal node |
| Collection log | | **Keep** | The chase made visible |
| Pager and comms | comms.mjs | **Trim** | Between-breach news only |
| Buyout | | **Cut** | No timers left to buy out |
| First launch, intro | intro.mjs | **Keep** | The opening |
| Tutorial | tutorial.mjs | **Fold** | The SPRAWL-00 breach |
| Feedback, sound, music, casing, shell | | **Keep** | The flavour |
| ACTUARY, handovers, reflash | genome 4.4, 6 | **Keep** (later) | It reprices drafts |

## 8. Migrating saves

A version bump (38 to 39). A current player keeps everything about themselves, and a mail-free *Recovered* card lists what changed.

| Today | Becomes |
|---|---|
| Class levels, XP, subclasses, talents, presets, stash, equipped gear, uniques, Zero-days, Collection, pity, codex | Kept as they are |
| Network seed | The same campaign map |
| Servers you hold | Captured. Each gets rewrites from its outpost's type, following server-types 5: a Listening Post becomes syslog Listening Post, producers become smtpd Mail Drop, defences become smtpd Honeymail. The rest stay stock until re-imaged. |
| SPRAWL-00 | Captured, with ledger Slush Fund |
| Credits | Kept |
| Code, salvage, signatures, Indemnity, materials | Credits at fixed rates (code 14, salvage 7, a signature 20) |
| Exploits | Kept, for the meta vendor and Mail Drop II |
| Services, buildings, filters, blueprints, plans, payloads | Their full price back in credits |
| Daemons | Unlock their CVE cards |
| Hubs held | Faction rank +1 |
| Faction rep, Halcyon standing | Faction ranks, by tier |
| Story letters already read | The matching Archive fragments, marked found |
| Open contracts | Their pay, in credits |
| Waiting invasions, swarms, lockdowns, stores | Banked or cleared. Nothing is lost. |

## 9. Build plan

### 9.1 Phases

| Phase | What ships | Done when |
|---|---|---|
| **0. One breach** (the prototype) | `?playtest=breach&class=…&level=10`: one server, 3 acts of 4 rows, 2 gates, DEADBOLT. Nodes: virus, elite, cache, defrag, broker, and 4 terminal events. 6 subsystems with 2 rewrites each, shown as *Now* with the output on the capture card. 12 mods (3 a class), 10 CVEs, gear from `rollItem`. Two new tells, Overclock and Lock. One `core.dump`. No save change. | The designer plays five breaches with two classes. `breachsim.mjs` shows each class winning 50 to 70% at heat 0 in blues. |
| **1. Tells** | Fork, Swap, Dead Man, Bait, Beacon and Ransom, author tell lists, per-kind payoffs, solo-tells.md rewritten | Per-tell checks: letting it land and answering it are both viable lines in the bot's hands |
| **2. The world** | The campaign map, captures, outputs, re-imaging, bounties on cards, the Archive, the save migration. Cut systems switched off by flags (`.on`, as `MEMORY.on` and `PAYLOAD.on` are today). | An old save loads into a playable campaign |
| **3. Breadth** | 22 rewrites, about 50 mods, 20 or more CVEs, 12 terminal events, five brokers, heat 1 to 8, unlock ranks, the meta vendor, a fragment set per author | Draft-pick rates: no card under 5% or over 40% when offered |
| **4. Genome in runs** | Genome phase 3's rolled mutations per node by act, phase 2's implicits, Residents from the 26-boss pool by author and band | Genome bands hold on sampled breaches |
| **5. Clean-up** | Cut code deleted, GAME_RULES.md rewritten, ACTUARY on drafts, then co-op breaches | |

### 9.2 Reused and new

| Piece | Reused | New |
|---|---|---|
| Fights | combat.mjs (`selectEncounter`, `encounterVirus`, `resolveCycle`), combat-view, Signal carry | Draft and rewrite cards after a win |
| Viruses | `createVirus` with `overrides.genes`, `budgetFor`, `compatible`, authors.mjs | A mutation cap and a cost cap by act |
| Gates, Residents, hunter | `GUARDS`, `BOSSES`, `BOSS_LOOT`, `hunt` and `TRACE` in run.mjs | Act scaling |
| Terminal | run.mjs prompt, `ls`, `cd`, `cat`, `pull`, `unlock`, pack and banking, forensics | `dist/breach.mjs`: breach state, map generator, node resolution |
| Map | | Map view (ASCII `tree` and a page drawing) |
| Mods | ABILITIES fields (most mods are field patches), classes/*.mjs hooks | `dist/drafts.mjs`: mods and the pool |
| CVEs | Effect blocks, `fxText`, the editor | A few new triggers (a tell landed, a node entered) |
| Gear | `rollItem`, `uniqueItem`, rarities, rules | |
| Tells | tells.mjs announce, windows, live limit, `lockLast`, `deadman`, Fork() | Kind handlers for 8 kinds, a run hook for Beacon |
| Rewrites | | `dist/rewrites.mjs` (data), output reader |
| Bots | planner.mjs, balance harness | `breachsim.mjs`: a pathing and drafting bot |

## 10. Open questions

| # | Question | Options | Recommendation |
|---|---|---|---|
| 1 | Run length | 3 acts of 5 rows. 3 of 4. 2 of 5. | 3 of 5, about 40 minutes. The prototype uses 3 of 4 to measure. |
| 2 | What a loss costs | Everything. The unbanked pack. Nothing but the capture. | The act's unbanked pack and the run's drafts. XP and banked gear stay, so the chase is never wiped. |
| 3 | The relic's name | Exploits. CVEs. Bugs. | CVEs. *Exploit* is already a slot, a skill and a currency. |
| 4 | Changing your bar mid-run | Anytime between nodes. Defrag only. Never. | Defrag only (*re-slot*), so mods are a commitment. Gear swaps any time between nodes. |
| 5 | Do rewrites have a *Now* half? | Yes. Output only. | Yes. Choosing between beating this Resident and wanting this output later is the decision. |
| 6 | Stacking outputs | Each rewrite once. Stack with falloff. | Once, at the best tier. Linked rewrites count once per neighbourhood. |
| 7 | Counter-breaches | Off. After every N breaches. On a clock. | **Decided: off.** Home defence is cut, not folded in. Keep the systems lean. |
| 8 | Heat | Ranked (Slay the Spire). Pick modifiers (Hades). | Ranked first, since it's simpler to read. Pick-your-own can come later. |
| 9 | Wild tells per fight | One kind. Two. | One kind per wild virus, two on elites, fixed on bosses. Fewer, meaner tells. |
| 10 | Farming outside runs | Free-roam rogue servers. None. | None. Range replays and re-imaging cover it, and every fight sits inside a run. |
| 11 | Server level | Fixed by layer. Scales to you. | Fixed by layer, as today. Heat is the challenge knob. |
| 12 | Lore delivery | `core.dump` only. Plus rare fragments on nodes. Plus a codex voice-over. | `core.dump` after every Resident, plus rare node fragments. Fragments are seeded so they're found in story order. |
| 13 | Bounties | Cut. On server cards. Offered at breach start. | On server cards, up to 2 (3 with Bounty Board), take one, no penalty for failing. They're optional goals on the screen where you choose. |
| 14 | Crew | Park. Co-op breaches. | Park. Co-op later as a shared map where each player drafts alone and the crew votes on the path. |
