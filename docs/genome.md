# Genome: authored viruses, built from genes

This began as a design for review. Phases 0 and 1 are now built, and section 15 says what shipped and what it measured. The rest is still design. It proposes one model for every virus in the game: a virus is a body (its family) plus a set of **genes**, and a hacker crew wrote it. Bosses are fixed gene sets with one signature mechanic each. Loot reads the genes too: what drops from a virus carries a line against what that virus did to you.

The measurements in this sheet come from throwaway scripts run against the current code (the planner bot, Tuned gear, every subclass, six seeds a cell, run fights). Prototype numbers come from in-memory patches in those scripts. No game file was changed.

## 0. The short version

| Question | Answer in this design |
|---|---|
| Where does variety come from? | 60 genes in five categories. A wild virus rolls one to three of them on top of its family's body, from its author's toolkit. |
| Who makes viruses? | Crews and factions write them. TOLLGATE, SWARMLINE and PALEMASK (the crews the contract mail already names) write the three families. GLASSJAW, NULL CHOIR, LANTERN and Kestrel write their own builds. Each author has a toolkit and a style you learn. |
| Is anything adaptive? | One author, ACTUARY, Halcyon's pricing model gone rogue. From level 26 it holds one sector of your network and rewrites its viruses to counter what you keep beating, with a notice before each change. Nothing else drifts. |
| What stops unfair combinations? | Five compatibility rules: one punishment per pressure axis, one beat per virus, one clock, an answer in every kit at that level, and a cap on the biggest hit. |
| How do you learn a virus? | The codex learns gene by gene, so knowing Ward on a ransomware virus means knowing it on a worm. `scan` shows a virus's genes before you engage. |
| Bosses? | 26 fixed solo bosses across levels 3 to 40 (12 kept, 14 new), grouped in boss lines by author. The same boss is the same fight every time. Each has its own loot table of two or three items with BOSS_LOOT's pity. |
| HASHLORD and MIRRORSHADE? | Both rebuilt. HASHLORD gets a warded Miner, a Block Reward cast and a Chain Fork at half, so killing the Miner first no longer ends its trick. MIRRORSHADE keeps one feedback gene, loses the Decoy split, gets a Doppelganger phase, and opens at level 12 with a trimmed Scrambler at 12 and 13. |
| Bane items? | Mostly **implicits**: every random drop carries one line from a gene of the virus that dropped it, so fighting a TOLLGATE ward build gives you anti-ward gear. Boss uniques and network natives are the strong single-gene banes. |
| Chase? | Uniques, boss loot and **sets**. Ten sets of two to four pieces, most pieces dropping from one author's boss line, so beating a variety of bosses has a reason. |
| When your seed is done? | Recommended: a sector changes authors only after you've finished it (you confirm, it's announced ahead), plus an optional **reflash** once the whole network is complete. Anything that leaves stays reachable another way. |
| First slice? | Genes as data with no behaviour change, then gene tags, the gene codex and `scan`, the compatibility rules applied to today's content, the two boss rebuilds and the per-gene balance check. |

## 1. What exists today, measured

### 1.1 Variety today

Every wild fight today is a family body (two parts), plus at most one third part or one strain rule, plus at most one mutation, plus Linked from v2. A sample of 6,000 wild viruses at levels 10, 18 and 30 (families even, strains at their 50% share, mutations at their level's chance) shows how often each mechanic turns up:

| Mechanic | Share of wild fights (even families) | On a ransomware-led network (3 / 1.5 / 0.5) |
|---|---:|---:|
| Any one third part (Lockbox, Mutex, Mirror, C2 Node, Decoy, Mimic) | 8–9% each | 15% for each ransomware one, 2–3% for each ghostroot one |
| Tripwire (from 20) | 5% at 30 | 10% at 30 |
| Any one strain | 4–6% each | up to 10% for its own family's |
| Each rolled mutation (from 10) | 9–11% each | the same |
| Veiled parts | 17% | 5% |
| Linked | every v2 and v3 | the same |

That is why a bane for one third part feels like dead weight today. Reflector (the Mimic's native unique) does something in about 8% of fights, and in 3% on a ransomware-led network. About 85 shapes of wild virus exist at level 18, and most fights carry two or three ideas.

### 1.2 HASHLORD and MIRRORSHADE

Measured with the planner over all eight subclasses and six seeds (48 fights a cell), in a lair's `/core` at the given level. *Misreading* is a planner that plays as if it can't see the tells on a random 30% of its cycles, a rough stand-in for a person. *Blind* never reads them (`TELL.bots.answer = false`).

| Boss | Lv 10 | Lv 18 | Lv 30 | Misreading 18 / 30 | Blind 18 | Where its damage came from |
|---|---:|---:|---:|---:|---:|---|
| HASHLORD today | 65% | 90% | 83% | 73% / 73% | 50% | The Pulse Node, 44–57% of your max Signal a fight. The Miner, 22–26%. |
| MIRRORSHADE today | 38% | 77% | 90% | 60% / 77% | 40% | At 10 the Scrambler, 60% of your max a fight, and the Pulse Node 27%. Self-hits from Scrambled, 3%. The Mimic, nothing for a perfect reader and 19% for the blind bot at 18. |
| For scale: HOLLOW CHOIR | 40% | 85% | | | 63% | |
| For scale: REPO MAN | 31% | 44% | | | | |
| For scale: DEADBOLT | 50% | | | | | |

What the numbers say:

- **HASHLORD's rule barely matters to it.** The fight is decided by two big hits from the Pulse Node. The Miner's tax slows cooldowns, but a planner that fills with Spike barely notices, and the Miner only attacks once it's alone. A two-part boss with one rule has nothing left to teach once you know which part to kill.
- **MIRRORSHADE at 10 is mostly a numbers problem, and the feedback stack is the human problem.** Its Scrambler wears five ◆ at boss level 10 and hits for 27% of your max every four cycles. A Surge crit took 52% of a Breaker's Signal in one hit. The Mimic, the longer scramble and the Decoy all punish the same thing (firing a direct hit at the wrong moment), and a perfect reader shrugs that off, but a misreading one loses 5 to 8 more points a fight and the blind one drops from 77% to 40% at 18.
- **Taking the Decoy split away alone changes nothing at 10** (31% against 38%, within noise), because most level-10 fights end before or soon after half.
- **Every Breaker subclass loses all six tries at level 10 against every three-part solo boss** (MIRRORSHADE, HOLLOW CHOIR, and one or two of six against REPO MAN). That is a class gap at 10, not a boss gap. The per-gene check in section 11 is built to surface exactly this kind of thing.

## 2. The model in one picture

| Layer | What it is | Example |
|---|---|---|
| Body | The family: its two core parts, its core genes, art, code and leads. Three bodies, as today. | Ransomware: Pulse Node (Surge), Encryptor (Encrypt) |
| Author | Who wrote it: a crew or faction with a toolkit of genes, a style, the sectors it holds, a boss line and a set. | TOLLGATE: locks and leverage |
| Genes | One to three rolled from the author's toolkit, plus the body's core genes and its tells. | Ward, Hasty |
| Grade | v1 to v3 and elite, champion, boss: size and budget. | v2 |
| Name and tags | Read off the genes and the author. | *WARDED CRYPTJACK-4821 v2 · TOLLGATE* with chips *ward · hasty · linked* |

A **strain** becomes a named build: an author's fixed gene set on a body, with its own name, trophy and hot-strain week. Keylogger is a NULL CHOIR build, Hashrat a GLASSJAW one, Patchwork a SWARMLINE one. Nothing about a strain's fight changes in the migration.

## 3. The gene library

### 3.1 Pressure axes

Every gene presses on one axis: the habit or weakness of yours that it punishes. The compatibility rules (section 5.3) work on these axes.

| Axis | What it punishes | Icon idea |
|---|---|---|
| Burst | Standing in front of big hits | bolt |
| Attrition | Letting damage build up over time | flame |
| Feedback | Firing a direct hit at the wrong time | mirror |
| Tempo | Leaning on cooldowns and long skills | hourglass |
| Sustain | Slow kills (the virus heals or grows) | droplet |
| Shell | Single big hits on one part (the damage is capped, soaked or blocked) | shield |
| Order | Killing parts in the wrong order | chain |
| Clock | Long fights | clock |
| Fog | Not knowing what is coming | eye with a slash |
| Swarm | Ignoring adds | three dots |
| Pierce | Stacking shields, ◆ and heals | needle |

A gene is either a **primary** on its axis (it brings the punishment) or an **amplifier** (it makes a punishment bigger and carries its own release: break its part, hit its tell). The rules allow one primary per axis and one amplifier on top, and an amplifier may stand alone. Tells are bounded by the tell system's own limits instead (section 5.3).

### 3.2 How to read the tables

- **Cost** is the gene's difficulty in budget points, 1 (light) to 3 (heavy). The first calibration target is about 3 to 4 points of Signal lost a fight per cost point for the planner at the gene's level, and the per-gene harness (section 11) sets the real numbers.
- **Opens** is the lowest virus level that can roll it.
- **Suits** names the bodies (R ransomware, W worm, G ghostroot, ICE) and the authors whose toolkits carry it. A signature gene of an author is in bold there.
- **Implicit** is the line an item gets when it drops from a virus carrying that gene (section 8.2), at tier I, II and III.
- *Today* marks genes that carry existing content. The rest are new.

### 3.3 Attack types: what a part does when its attack lands (15)

| Gene | What it does | Telegraph and read | Answer | Cost | Opens | Axis | Suits | Implicit (I / II / III) |
|---|---|---|---|---:|---:|---|---|---|
| Surge *(today)* | A plain heavy hit every 3 to 5 cycles. | Its cell on the timeline, with the number after your Block. | Break or delay the part, Block, a ◆, a shield, Brace, Bulkhead, Throttle. | 1 | 1 | Burst, primary | Every body (core) | The family's bane: +5 / 8 / 12% damage on its parts, and 3 / 5 / 8% less from them |
| Encrypt *(today)* | Adds to a stack that hits you every cycle until its part breaks. | Its cell, then an *Encrypted N* status. | Break the Encryptor. Purge, Scrub or Rollback clear it. A ◆ or Lockdown stops one Encrypt. Repossessed Key, Tollgate Token. | 3 | 1 | Attrition, primary | R (core) · TOLLGATE | Encryption on you stacks 10 / 18 / 25% slower |
| Replicate *(today)* | Spawns a fragment (up to 3) that gnaws you every cycle. | Its cell, then fragments on the board. | Fork Bomb, Garbage Collect, Multicast, DMZ, Spike on fragments, break the Replicator. Fork Reaper, Brood Tap. | 3 | 1 | Swarm, primary | W (core), Crawler · SWARMLINE | +20 / 35 / 50% damage on fragments and adds |
| Scramble *(today)* | A hit, then two cycles where each of your attacks may hit you instead at half. | Its cell, then *Scrambled*. | Scrub, a ◆ or Lockdown, quiet commands while scrambled, Choirboy. | 3 | 1 | Feedback, primary | G (core) · PALEMASK | Scrambled hits on you deal 15 / 25 / 35% less |
| Flood ramp *(today: Floodgate)* | Hits every cycle, one harder each time, and any delay resets it. | Every cell, the number climbing. | Any delay (Suspend, Quarantine, Jam, Spoofed ACK, the Stall daemon), or break the bare Flooder. | 3 | 6 | Attrition, primary | W · **SWARMLINE** | Ramping attacks on you grow 15 / 25 / 35% slower |
| Siphon *(today: Leech)* | Its hit heals its most damaged part by what it dealt and clears one burn there. | Its cell, marked *siphon*. | Shields and Block (less dealt, less healed), Throttle, Implant, break it. | 3 | 8 | Sustain, primary | W · SWARMLINE | Heals a virus part gets are 10 / 18 / 25% smaller |
| Mend *(today: Patchwork)* | Heals the most damaged part every 3 cycles. | Its cell, marked *heal*. | Break the mender first, delays, Implant, Cache Poison, burst a part between mends. | 3 | 3 | Sustain, primary | W · **SWARMLINE** | As Siphon |
| Deadline *(today: Extortion)* | A big hit that winds up. Deal enough damage to its part in the 2 cycles before it lands and it's called off. | Its cell shows the threshold and what you've dealt. | Burst or burns on the part in the window. | 2 | 6 | Burst, primary | R · **TOLLGATE** | Damage you deal counts 10 / 20 / 30% more toward wind-up thresholds |
| Escalation *(today: Tracer)* | Its attack hits harder every cycle the fight goes on. | The number climbing on its cell. | Kill its part early. | 2 | 1 | Clock, primary | ICE · Kestrel | Attacks that grow with time grow 15 / 25 / 35% slower on you |
| Hive brood *(today: Overrun)* | Spawns fragments that bite one harder every cycle they live. | Its cell, and each fragment's bite on its row. | Clear fragments young, or break the Hive. | 3 | 11 | Swarm, primary | W · SWARMLINE | As Replicate |
| Exfiltrate | When it lands it takes your shield and your ◆, and adds up to two of them to its own part as ◆. | Its cell says *takes shield*. | Spend your shield before it lands (let it soak another hit), break the part, Write Blocker. | 2 | 12 | Pierce, primary | R, G · **TOLLGATE**, GLASSJAW | Exfiltrate takes 1 / 1 / 2 fewer of your ◆ and 20 / 35 / 50% less shield |
| SYN Flood | When it lands, the skill you fired that cycle cools down 2 cycles longer. | Its cell says *SYN*. | Fire Spike or a short skill, or hold, on its cycle. Clock Speed. Break it. | 2 | 10 | Tempo, primary | W, R · **GLASSJAW** | Cooldown penalties on you are 1 cycle shorter (tier II and III: and Offline too) |
| Bad Sectors | When it lands, your next heals are eaten up to 10% of your max. | Its cell says *sectors*, then a status. | Scrub clears it, heal before it lands, shield instead of healing. | 2 | 12 | Pierce, primary | R, G · GLASSJAW | Bad Sectors eat 25 / 40 / 60% less |
| Botnet Recruit | When it lands, your oldest helper defects and becomes a fragment on its side. | Its cell says *recruit*. | Jam, Barrier or Reroute before it lands, or have no helper on the board then. Classes without helpers ignore it. | 2 | 14 | Pierce, primary | W · SWARMLINE | Your helpers can't be recruited, and +10 / 20 / 30% helper damage on its part |
| Antivirus Sweep | Every 4 cycles its part wipes every burn and helper on itself. | Its cell says *sweep*. | Detonate, Kill Switch or IRQ Storm before it, or hit it directly. | 2 | 14 | Sustain, primary | W, G · SWARMLINE | Burns and helpers wiped by the virus leave 25 / 40 / 60% of what they had left as an instant hit |

### 3.4 Part behaviours: a part whose life or death changes a rule (15)

| Gene | What it does | Telegraph and read | Answer | Cost | Opens | Axis | Suits | Implicit (I / II / III) |
|---|---|---|---|---:|---:|---|---|---|
| Ward *(today: Lockbox)* | While it lives, its partner loses at most 25% of its max a cycle. | *warded: N held back* on the partner. | Break the ward first, or chip under the cap. Lockpick, Keyjam, Sudo, Zero-Day. | 2 | 3 | Shell, primary | R · **TOLLGATE** | Your hits get through a ward's cap 15 / 25 / 40% more |
| Mutex lock *(today: Mutex)* | Its partner wears a shield of 25% of its max that comes back 4 cycles after it breaks, while the Mutex lives. | *lock N*, *relocks in N*. | Break the Mutex, or burst through one lock. Lockpick, Thermal Throttle, Sudo. | 3 | 8 | Shell, primary | R · **TOLLGATE** | Locks take 15 / 25 / 40% more from you |
| Tripwire *(today)* | Break it while others live and they go loud: 25% harder and a cycle sooner for the fight. | *tripwire* tag, then *loud*. | Break it last. Quiet Wire, Logic Bomb, Sudo, Throttle on loud parts. | 2 | 16 (today 20) | Order, primary | R · TOLLGATE | Loud parts hit you 8 / 12 / 18% less |
| Twin *(today: Mirror)* | Break one twin alone and it reboots at 40% three cycles later, once. | *Reboot* chip on the board. | Break both close together. Split Brain, Logic Bomb. | 2 | 3 | Order, primary | W · **SWARMLINE** | A twin reboots at 30 / 20 / 10% instead of 40% |
| C2 command *(today: C2 Node)* | Fragments gnaw 50% harder while it lives, and all drop when it breaks. | *commands fragments* tag. | Break it once fragments are up. | 2 | 8 | Swarm, amplifier | W · SWARMLINE | +25 / 40 / 60% damage on a part that commands others |
| Decoy mirror *(today: Decoy)* | Every 4th cycle your commands do nothing and 30% bounces back. Veiled. | *Mirror* chip in its column once visible. | Fire nothing direct on its beat, or break it. Mirror Maze, Sudo. | 3 | 4 | Feedback, amplifier, global beat | G · **PALEMASK** | Bounces and mirrors hit you 20 / 35 / 50% less |
| Mimic *(today)* | Records you and on its beat plays your command's direct hit back at you. | Its beat chip, always on the board. | Go quiet on the beat (a debuff, a strip, a burn, a helper, a shield, hold), or break it. Reflector, Log Wipe, Sudo. | 3 | 8 | Feedback, amplifier, global beat | G · **NULL CHOIR** | Playback on you deals 20 / 35 / 50% less |
| Keyring *(today: Bouncer)* | Re-arms its partner to full ◆ every 4 cycles, three times. | Re-arm on the board. | Break the Keyring, or kill the partner between re-arms. | 2 | 1 | Shell, primary, part beat | ICE · **Kestrel** | Re-armed ◆ come back one fewer (tier III: two) |
| Cycle tax *(today: Hashrat's Miner)* | While it lives your cooldowns tick only every other cycle. Its own attack fires only when it's alone. | *tax* status on you. | Break it, Clock Speed, short skills. | 2 | 5 | Tempo, primary | R · **GLASSJAW** | Clock Speed fills 20 / 35 / 50% faster while you're taxed or slowed |
| Front End | While it wears ◆, your single-target commands at its partner land on it instead. Burns, helpers and area hits go through. | *behind proxy* on the partner. | Strip the Front End (once bare it covers nothing), burns, helpers, area hits, Backdoor. | 2 | 10 | Shell, primary | G, R · PALEMASK | Your commands at a covered part reach it at 15 / 25 / 40% |
| Load Balancer | While both live, half of what its partner takes moves to the Load Balancer. | *balanced* on both. | Break the Load Balancer first, or spread damage with area hits. | 2 | 12 | Shell, primary | W · SWARMLINE, GLASSJAW | Damage you deal is moved 15 / 25 / 40% less |
| Hot Spare | A dormant copy of the signature part, off the timeline. When the signature breaks, the Spare boots 2 cycles later at 60% with its attack. | *standby* tag, then a boot chip 2 cycles ahead. | Break the Spare while it sleeps (it's bare and doesn't fight), Split Brain, Logic Bomb. | 2 | 14 | Order, primary | W, G · SWARMLINE | Spares and reboots come back with 10 / 20 / 30% less Integrity |
| Zip Bomb | A small bare part with no attack. When it breaks it starts a 2-cycle fuse, then hits you for 25% of your max unless you're shielded, Braced, Null Routed or wearing a ◆. | The fuse on its row the moment it breaks. | Break it when your defence is ready, or leave it for last. Area hits and spills can set it off, so mind them. | 2 | 7 | Order, primary | R, W · TOLLGATE | Death blasts on you deal 25 / 40 / 60% less |
| Honeypot | A bare, juicy-looking part. A command of yours that hits it makes the virus's next attack two or more cycles away a charge. | *bait* tag, and the new charge chip at once. | Leave it to burns and helpers (they don't trigger it), or hit it and answer the charge. | 1 | 6 | Burst, amplifier | Any · LANTERN, PALEMASK | Charges that bait sets up deal 15 / 25 / 35% less, and bait parts take +20% from burns |
| Watchdog timer | Counts cycles since the signature part last took a command hit. At 5 the virus re-arms every part. | A countdown on the signature's row, a chip at 2 left. | Touch the signature at least every 4 cycles, or break the timer part. | 2 | 9 | Clock, primary, part beat | Any · **Kestrel**, GLASSJAW | Re-arm timers on the virus run 1 / 1 / 2 cycles longer |

### 3.5 Defences and armor patterns: how a part takes damage (6)

Plated (◆ with a patch) and Bare (no ◆) stay as the baseline that every part has. They are not genes and cost nothing.

| Gene | What it does | Telegraph and read | Answer | Cost | Opens | Axis | Suits | Implicit (I / II / III) |
|---|---|---|---|---:|---:|---|---|---|
| Veil *(today)* | Its timers are hidden while it wears ◆. | Grey cells, and a *veiled* tag. | Strip it, Tag it, Night Light. | 1 | 1 | Fog, primary | G, Sentinel · **PALEMASK**, NULL CHOIR | Veiled timers show 1 / 1 / 2 cycles ahead anyway |
| Phase shift *(today: Flicker)* | Out of phase on odd cycles: every hit passes through and 15% of your command bounces back. | Its row greys on odd cycles. | Hit it on even cycles. | 3 | 4 | Feedback, primary, part beat | G · **PALEMASK** | Out-of-phase bounces deal 25 / 40 / 60% less |
| Sync lock *(today: Keylogger's Logger)* | Only commands fired in a Sync Window hurt it (a window opens every cycle while it lives). | The Sync Window on every cycle bar. | Fire in the window. Metronome, Logger Spool. | 3 | 4 | Tempo, primary, part beat | G · **NULL CHOIR** | The Sync Window is 10 / 20 / 30% wider against it |
| Rate cap | No single hit takes more than 20% of its max. The rest is dropped. | *cap N* on the part. | Many small hits, burns, helpers, Overvolt's two hits, Kill Switch. | 2 | 10 | Shell, primary | R, W · TOLLGATE, GLASSJAW | The cap is 25 / 30 / 35% for you |
| ACL | While it wears ◆ it drops one kind of damage, named on its tag: burns, helpers or area hits. | *ACL: no burns* (or helpers, or area). | Strip it first (any kit can), then use anything, or use the kinds it lets through. | 2 | 12 | Shell, primary | Any · **GLASSJAW** | The dropped kind gets through at 20 / 35 / 50% |
| Stateless | Statuses you put on it (Exposed, Tagged, Hooked, Throttled, Quarantined) last a cycle less. | *stateless* tag. | Cash in a debuff the same cycle or the next (plan it with `;`). | 1 | 10 | Tempo, primary | Any · GLASSJAW, NULL CHOIR | Your statuses on it last 0 / 1 / 1 cycle longer than the gene allows, and +5 / 8 / 12% damage on it |

### 3.6 Passive rules: whole-virus modifiers (12)

| Gene | What it does | Telegraph and read | Answer | Cost | Opens | Axis | Suits | Implicit (I / II / III) |
|---|---|---|---|---:|---:|---|---|---|
| Armored *(today)* | Every part has one more ◆. | *armored* tag, the chits. | Strippers (Crack, Rate Limit, Fork, Polymorph), piercing hits. | 2 | 4 | Shell, amplifier | Any · TOLLGATE | Your strips break one more ◆ on its parts once a cycle (tier I: once a fight) |
| Regenerative *(today)* | A stripped part patches a cycle sooner. | *regenerative* tag, the patch cell. | Strip only when you can finish. Sticky Bit, Rowhammer, Bit Rot. | 1 | 4 | Shell, amplifier | W · SWARMLINE | Its parts patch 1 / 1 / 2 cycles later |
| Hasty *(today)* | Every attack a cycle sooner and a cycle faster, with 10% less Integrity. | *hasty* tag. | Race it, delays. | 2 | 4 | Clock, primary | Any · SWARMLINE, GLASSJAW | Attacks that came sooner deal 8 / 12 / 18% less |
| Adaptive *(today)* | A part your commands hit three cycles in a row gains a ◆. | *adapting* tag a cycle ahead. | Switch targets for a cycle, or finish it on the third hit. | 1 | 4 | Shell, amplifier | Any · NULL CHOIR, ACTUARY | Adapting needs one more cycle in a row |
| Linked *(today, every v2 and v3)* | A broken part passes a third of its hit to the next survivor. | *+N rerouted* tag. | Pick your kill order. | 1 | Layer 2 | Order, amplifier | Every graded virus | Rerouted hits deal 30 / 50 / 70% of the extra |
| Echo *(today: Echo)* | Every damage attack that gets through repeats next cycle at half. | Echo cells on the timeline. | Break the Echo, shields, Block. | 3 | 8 | Attrition, primary | G · **PALEMASK** | Echoes on you deal 20 / 35 / 50% less |
| Dormant *(today: Sleeper)* | Attacks wait off the timeline until a hit or cycle 6, then wake with an Alarm. | *dormant*, then *WAKES*. | Open with something big, or set up before it wakes. | 2 | 10 | Fog, primary | G · **PALEMASK** | A dormant virus's first attack deals 15 / 25 / 40% less |
| Rage *(today: Bricker)* | A part hits 30% harder once it's below half. | The rage shows on its cell. | Take a part from healthy to dead in one go. | 2 | 9 | Burst, amplifier | R · **TOLLGATE** | +10 / 15 / 25% damage on a part above half |
| Keystroke dump *(today: Keylogger)* | Every command fired outside a Sync Window is logged. At 3 the Logger's Dump lands next cycle. It also Dumps every 6. | The log count on the Logger, the Dump cell. | Fire in the window, or break the Logger. | 2 | 4 | Feedback, primary | G · **NULL CHOIR**, LANTERN | Out-of-sync commands log only every other time (tier III: Dumps deal 30% less too) |
| Clock glitch | No Sync Windows open while its part lives (the Infiltrator's opener too). | A dead cycle bar and a *glitch* tag. | Break its part early, or play without the window. Never rolls with Sync lock. | 1 | 12 | Tempo, primary | G · NULL CHOIR | One Sync Window still opens every 4 / 3 / 2 cycles |
| Ransom timer | A countdown from cycle 1 on the virus bar. At 0 it leaks for 30% of your max and starts again at 8. | The countdown, always on screen. | Kill it fast. Escrow. Bosses never take it (they have enrage). | 3 | 14 | Clock, primary | R · **TOLLGATE** | Countdowns on the virus run 1 / 2 / 3 cycles longer |
| Packed | Its rolled genes show as ??? chips until its first part breaks, even ones your codex knows. | ??? chips that unpack on the first break. | `scan` before engaging. | 1 | 20 | Fog, amplifier | Any · LANTERN, ACTUARY | Packed genes unpack when you scan (tier III: at the start of the fight) |

### 3.7 Tells: moves announced on the timeline (12)

The tell system stays as it is (TELL in data.mjs, tells.mjs). Each family, author and boss picks its tells from these genes, and a strain or boss renames its charge.

| Gene | Kind | What it does | Answer | Cost | Opens | Axis | Today it is | Implicit (I / II / III) |
|---|---|---|---|---:|---:|---|---|---|
| Overcharge | Charge | Its part's attack, much bigger. | Hit it (twice for an elite or boss), Suspend, Jam, Spoofed ACK, Segfault, soften it. | 1 | 1 (second charge from 17) | Burst, amplifier | Overcharge, Lock-on, Claymore, every strain's own charge (Keystorm, Deluge, Blink, Brick Wall, Wake-up Call, Last Word, Difficulty Bomb, Storm Surge…) | Charged hits on you deal 5 / 8 / 12% less |
| Full Disk | Charge | Its Encrypt, plus a burst of encryption for 3 cycles. | Hit it, then Purge, Scrub or Rollback the burst. | 2 | 1 | Attrition, amplifier | Full Disk, Deadbolt | As Encrypt |
| Mass Mailer | Charge | A Replicate that hatches two. | Hit it, DMZ. | 2 | 1 | Swarm, amplifier | Mass Mailer, Infest, Spam Run, Swarm | As Replicate |
| Possession | Charge | A Scramble that lasts two cycles longer. | Hit it, Scrub. | 2 | 1 | Feedback, amplifier | Possession, Doppelganger | As Scramble |
| Battering Ram | Charge | Its attack, much bigger. Called off by breaking ◆2 off its part, not by a hit. | Strip it. | 2 | 1 (ICE) | Burst, amplifier | Battering Ram | As Overcharge |
| Hotfix | Charge | A heal, far bigger. | Hit it, Implant, Cache Poison. | 2 | 3 | Sustain, amplifier | Hotfix, Gorge, Rollup | As Siphon |
| Double Extortion | Cast | Every attack hits 35% harder for 4 cycles. | SIGINT, two hits, Quarantine, Overvolt, Thermal Runaway, Hijack, Reroute, Kill Switch, IRQ Storm. | 2 | 10 | Burst, amplifier | Double Extortion | Casts on the virus last 1 / 1 / 2 cycles less |
| Self-Update | Cast | Every part grows a quarter more Integrity. | As Double Extortion. | 2 | 10 | Sustain, amplifier | Self-Update | As Double Extortion |
| Persistence | Cast | Every attack repeats a cycle faster for 4 cycles. | As Double Extortion. | 2 | 10 | Clock, amplifier | Persistence, Call Home | As Double Extortion |
| Re-key | Seal | If its part still wears ◆, it re-arms with one more and stripped parts get one back. | Strip it first, Bit Rot, Cache Poison. Write Blocker. | 2 | 6 (elites, bosses) | Shell, amplifier | Key Rotation, Resync, Go Dark, Blacklist | Seals that land leave your ◆ and shield 0 / 50 / 100% intact |
| Handshake | Charge | Its attack, much bigger, called off only by a hit fired in a Sync Window. While it's live a window opens every cycle, so there's always a chance to answer. | Fire in the window, or soften it. | 2 | 12 | Tempo, amplifier | New | The window is wider while a Handshake is live |
| Fork() | Cast | Compiles a copy of its basic part at half Integrity, with its attack at half. | SIGINT, two hits, the cast answers above. | 2 | 12 | Swarm, primary | New | Adds a virus spawns start with 10 / 20 / 30% less Integrity |

That is **60 genes**: 41 carry today's content and 19 are new (Exfiltrate, SYN Flood, Bad Sectors, Botnet Recruit, Antivirus Sweep, Front End, Load Balancer, Hot Spare, Zip Bomb, Honeypot, Watchdog timer, Rate cap, ACL, Stateless, Clock glitch, Ransom timer, Packed, Handshake, Fork()). Each boss adds one signature mechanic of its own on top (section 7), which no wild virus can roll.

### 3.8 Today's content, mapped

Nothing is lost. Every family, strain, mutation, third part, tell and boss mechanic is a gene or a set of genes.

| Today | Genes |
|---|---|
| Ransomware body | Surge, Encrypt, tells Full Disk, Double Extortion, Overcharge, Re-key |
| Worm body | Surge, Replicate, tells Mass Mailer, Self-Update, Overcharge, Re-key |
| Ghostroot body | Surge, Scramble, Veil, tells Possession, Persistence, Overcharge, Re-key |
| Lockbox, Mutex, Tripwire | Ward, Mutex lock, Tripwire |
| Mirror, C2 Node | Twin, C2 command |
| Decoy, Mimic | Decoy mirror, Mimic |
| Armored, Regenerative, Hasty, Adaptive | The same four rules |
| Rerouting (retired), Linked | Linked |
| Keylogger | Sync lock, Keystroke dump, a renamed Overcharge (Keystorm) · NULL CHOIR |
| Hashrat | Cycle tax, Overcharge · GLASSJAW |
| Floodgate | Flood ramp (on a bare part), Overcharge (Deluge) · SWARMLINE |
| Leech | Siphon, Hotfix (Gorge) · SWARMLINE |
| Sleeper | Dormant, Overcharge (Wake-up Call) · PALEMASK |
| Patchwork | Mend, Hotfix · SWARMLINE |
| Flicker | Phase shift, Overcharge (Blink) · PALEMASK |
| Extortion | Deadline (on a bare part), Overcharge · TOLLGATE |
| Echo | Echo, Overcharge (Feedback) · PALEMASK |
| Bricker | Rage, Overcharge (Brick Wall) · TOLLGATE |
| Overrun | Hive brood, Mass Mailer (Swarm) · SWARMLINE |
| Watchdog, Shredder, Crawler, Sentinel | Surge (and Replicate on the Crawler), Veil on the Sentinel, tells Overcharge, Re-key (Blacklist), Persistence (Call Home). The Shredder's Deep Shred is Overcharge with its file-shred rider. |
| Tracer, Bouncer (ICE) | Escalation · Keyring with Battering Ram · Kestrel |
| Boss phases (re-arm, faster, spawn a part, enrage) | Phase verbs on a boss (section 7.1), not genes |
| Crew bosses (Foreman, Heatsink, Coldwallet) | Stay on raid.mjs. Their mechanics are role checks, not genes. Their own parts' bodies read as genes for the codex. |

## 4. Authors: who writes the viruses

Viruses are written, not grown. A crew builds a virus to take a server, and it builds with the tools it knows. A player who has met a crew's work reads the next one at a glance: *a NULL CHOIR build, so expect a Mimic and a veil.*

### 4.1 The roster

Everyone here already exists in the game. TOLLGATE, SWARMLINE and PALEMASK are the crews the contract mail names for the three families (`CREWS` in mail.mjs). GLASSJAW, NULL CHOIR, LANTERN and Kestrel are factions with servers and hubs (factions.mjs). LOWLIGHT is your crew and Halcyon your employer, so neither writes viruses against you, except Halcyon's pricing model.

| Author | Who they are | Bodies they write | Toolkit (signature genes in bold) | Style, in one line | Where they write |
|---|---|---|---|---|---|
| TOLLGATE | The ransomware crew | Ransomware | **Ward, Mutex lock, Deadline, Rage, Ransom timer**, Tripwire, Zip Bomb, Exfiltrate, Rate cap, Armored | Locks and leverage. Everything is behind something, and something is on a clock. | Ransomware servers on every network, weighted by lean |
| SWARMLINE | The worm crew | Worm | **Twin, Flood ramp, Mend, Hot Spare**, C2 command, Hive brood, Siphon, Load Balancer, Botnet Recruit, Antivirus Sweep, Fork(), Regenerative, Hasty | Numbers and spares. Whatever you break comes back or brings friends. | Worm servers, weighted by lean |
| PALEMASK | The ghostroot crew | Ghostroot | **Veil, Decoy mirror, Phase shift, Echo, Dormant**, Front End, Honeypot | Misdirection. You never quite see where the hit comes from. | Ghostroot servers, weighted by lean |
| NULL CHOIR | Anarchist crew (faction) | Mostly ghostroot, sometimes the others | **Mimic, Sync lock, Keystroke dump**, Veil, Clock glitch, Handshake, Stateless, Adaptive | Rhythm and mockery. It copies you and makes you keep time. | Its own servers, and a sector on networks where it's in the roster |
| GLASSJAW | Off-the-books corp (faction) | Any | **Cycle tax, SYN Flood, ACL**, Exfiltrate, Bad Sectors, Stateless, Rate cap, Load Balancer, Watchdog timer, Hasty | Professional denial. It taxes your tools and blocks your favourites. | Its own servers, and a sector where it's in the roster |
| LANTERN | The numbers station (faction) | Any, lightly | **Honeypot, Packed**, Keystroke dump, Handshake, Veil | It listens. Its builds bait you and hide their hand. LANTERN writes no bosses: it sells what it hears (section 6.4). | Its own servers only |
| Kestrel Underwriting | Runs the data centres (faction) | ICE (guards) | **Keyring, Escalation, Watchdog timer**, Veil, Battering Ram | Defend the door. Kestrel writes the Bouncer, the Tracer and the Sentinel. | Guards and ICE on layer 2 and deeper, and its own servers |
| ACTUARY | Halcyon's risk model, running loose (section 4.4) | Any | Every gene, re-weighted by your play | It prices you, then raises the premium on what you're good at. | One sector of your network, from a story beat at level 26 |

### 4.2 How authors sit on a network

A network's signature (network.mjs) gains an **author roster**: the three family crews weighted by its lean as today (3, 1.5, 0.5), plus one or two faction authors rolled from the seed. Each **sector** of your network has a holder. A sector is a layer of your network (layer 1 is your first servers, layer 2 the ones traced from there, and so on), so a network has up to five, and the map already draws them as bands.

| Thing | Who wrote it |
|---|---|
| A traced server's viruses, guards' bodies, Resident | The sector's holder, or the family crew of the server's family on a sector held by a family crew |
| A faction-owned server (about one in eight, as today) | That faction |
| ICE on layer 2 and deeper | Kestrel |
| Rogue servers (Nest, Pit, Gauntlet) | The sector's holder for a Nest. Pits and Gauntlets mix the roster. |
| Invasions | The sending server's author. A sector about to change hands sends scouts from the incoming author first (section 6). |
| SPRAWL-00 | Nobody's: plain bodies, no rolled genes, as today |
| Your lair | One room per band (section 7.3), each holding a boss of an author on your roster |

### 4.3 Learning an author

- Each author has a colour and a mark. Its tag sits on the fight header (*· TOLLGATE*), the map's server card and the Network card.
- The codex has an **Authors** tab: each author's toolkit (genes you've met by name, the rest ???), its style line, its boss line with your kills, its set and which pieces you hold.
- An author's signature genes are weighted three to one over the rest of its toolkit. On a sector it holds, a signature gene shows up in about a third of its wild fights and any other toolkit gene in about one in six. A bane aimed at an author's signature gene fires in a third of the fights in that sector, against 8% for a third part today.

### 4.4 ACTUARY, the one adaptive author

Halcyon prices crews' risk with a model. In the late story it starts writing viruses to make the risk it prices come true. That is the only author that changes its work by watching you.

| Rule | Detail |
|---|---|
| When | A story beat at level 26 (mail from Claims: *our model has started writing its own policies*). It takes one sector of your network, chosen from the seed, and keeps it. |
| Its portfolio | Six genes at a time, shown on the Network card and its sector's servers. Its viruses roll from those six, under the same budget and rules as everyone. |
| Repricing | Once a week, if you made kills in its sector that week, it drops the portfolio gene you beat most there (by kills, reads and parts broken first) and adds that gene's listed counter (table below). No kills, no repricing: it doesn't move while you're away. |
| Warning | A *Repricing notice* mail and a Network card line say what is under review a week ahead: *Twin claims are down 40%. Under review: Twin. Proposed: Hot Spare.* Nothing changes without that notice. |
| Bounds | At most one gene out and one in per week. Its genes stay inside the compatibility rules. It never drops below one gene per axis it started with, so its sector never becomes one-note. |
| Its boss | UNDERWRITER, a fixed boss (section 7). The adaptation is in its wild viruses and elites only, so the boss is the same fight every time. |
| Steering | You can see what it will counter. Farming one gene in its sector tells it what to bring next, so you can steer it toward what your gear answers. |

Counters (each gene lists the one that sidesteps the usual way it is beaten):

| Beaten often | Counter it brings | Why |
|---|---|---|
| Ward (break the Lockbox first) | Mutex lock | A lock doesn't care about kill order |
| Mutex lock (burst through) | Rate cap | A cap stops the burst |
| Twin (break both together) | Hot Spare | The spare boots no matter when |
| Tripwire (leave it last) | Zip Bomb | Leaving it last costs you a blast instead |
| Mimic (go quiet) | Handshake | Now one charge wants a hit on a beat |
| Decoy mirror (fire off-beat) | Phase shift | The beat moves onto one part |
| Replicate (area clears) | C2 command | The adds hit harder while you clear |
| Encrypt (cleanse) | Bad Sectors | Your cleanse-heals get eaten |
| Mend or Siphon (Implant, kill the healer) | Antivirus Sweep | The burns that stop heals get wiped |
| Veil (strip or Tag) | Dormant | Nothing to strip before it wakes |
| Cycle tax (kill the Miner) | SYN Flood | The tax rides an attack instead of a part |
| Front End (strip it) | ACL | It keeps blocking a damage kind |
| Hasty (race it) | Ransom timer | The race has a visible deadline |
| Armored (strippers) | Adaptive | Chains of hits build armor |

## 5. How a virus is built

### 5.1 Budget by level and grade

The body and its tells are free. The budget pays for rolled genes.

| Virus level | Wild budget (points) | Rolled genes | Notes |
|---|---:|---|---|
| 1–3 | 0 | 0 | The body only. SPRAWL-00 stays here at every level. |
| 4–7 | 2 | 1 | One light gene. |
| 8–12 | 4 | 1–2 | |
| 13–16 | 5 | 2 | |
| 17–24 | 6 | 2 | |
| 25–32 | 7 | 2–3 | |
| 33+ | 8 | 3 | |

| Grade | Change |
|---|---|
| v2 | +1 point, Linked |
| v3 | +2 points, Linked |
| Strain (a named build) | Its fixed genes are paid first. Whatever budget is left rolls from its author's toolkit, so a level-25 Hashrat carries the tax and one more gene. |
| Elite | +3 points and one more gene (crew content, as today) |
| Champion invasion | +2 points |
| Boss | Fixed gene set, written by hand (section 7). The harness checks it against the same rules and against a boss band. |

An author's toolkit gene is drawn by weight (signature 3, other toolkit genes 1). A gene outside the toolkit can still show up at weight 0.1, so any author can surprise you, but rarely.

### 5.2 The roll, step by step

1. Pick the author (sector holder, faction owner, ICE) and the body.
2. Pay for the strain's fixed genes if it's a named build.
3. Draw a gene by weight from the genes open at the virus's level that fit the remaining budget.
4. Check the compatibility rules. A gene that breaks one is struck from this virus's draw list and the draw repeats, at most eight times.
5. Repeat until the gene count or the budget runs out.
6. Simulate the first 20 cycles of the timeline with no player input. Reject the genome if two heavy events land on one cycle that the scheduler can't move, or the spike cap fails (rules 3 and 5). On a reject, drop the last gene.
7. Name it and tag it.

### 5.3 Compatibility rules

| Rule | What it says | What it would reject today |
|---|---|---|
| 1. One punishment per axis | Among attack types, part behaviours, defences and passive rules (the body's core genes included), a virus carries at most one primary per axis and one amplifier on top. Burst is exempt, because rule 5 bounds it. Tells don't count here: the tell system already keeps them from stacking (one live below 17, two from 17, never landing on the same cycle). | MIRRORSHADE after half: a Scramble with the Mimic and a Decoy as two amplifiers on Feedback. Today's wild viruses all pass, since each carries at most one third part or one mutation (the phase 0 test asserts it). |
| 2. One beat | At most one gene with a beat of its own (Mimic, Decoy mirror, Phase shift, Sync lock, Keyring, Watchdog timer). Global beats (Mimic, Decoy mirror), which punish every direct hit on their cycle, may cover at most one cycle in four. | HOLLOW CHOIR's second Decoy on the off-beat (two cycles in four). MIRRORSHADE's Decoy next to its Mimic. |
| 3. One clock | Every gene event (an Attachment, a fuse, a vote, a countdown leak, a re-arm) goes through the tell scheduler: on the board at least two cycles ahead, never on a cycle with another heavy event or a tell landing, and counted against the live limit when it hurts (6% of your max or more, `TELL.heavy`). | Nothing today. It's there for the new genes. |
| 4. An answer in every kit | For every gene, each subclass at that level (each class below 10) must own at least one answer from the gene's answer list: a skill unlocked by then, SIGINT from 10, or a play every kit has (strip, hold, kill order, hit a bare part). A play only counts if the harness shows it's enough (section 11.1). | A Handshake below 12, since a level-10 kit has no reliable way to fire in a window it can't count on. An ACL that drops helpers on a part with no ◆ (the Herder would have no answer), which is why ACL only holds while the part wears ◆. |
| 5. Spike cap | The worst single landing, including a crit and a charge's cap, is at most 45% of a same-level player's max Signal in blues, and the worst three cycles at most 75% (85% for bosses). | MIRRORSHADE's level-10 Surge crit at 52% of a Breaker's max. |

Hard exclusions on top of the rules: Sync lock never with Clock glitch (the Logger could never be hurt), Twin never with Hot Spare, Ransom timer never on a boss, Dormant never with Honeypot (you can't see the bait before it wakes).

### 5.4 Names and tags

| Piece | Rule | Example |
|---|---|---|
| Prefix | The adjective of its costliest rolled gene. Each gene has one: Warded, Locked, Wired, Twinned, Commanded, Mirrored, Mimicking, Taxing, Proxied, Balanced, Spared, Rigged, Baited, Watched, Capped, Filtered, Stateless, Armored, Regenerating, Hasty, Adaptive, Echoing, Dormant, Raging, Glitched, Timed, Packed. | WARDED |
| Stem | The body's stem (CRYPTJACK, SPLINTER, GHOSTROOT) or the named build's name. | CRYPTJACK |
| Tag and grade | The seed's four digits and v2 or v3, as today. | -4821 v2 |
| Byline | The author. | · TOLLGATE |
| Chips | One per gene under the virus bar, with its axis icon: core genes dim, rolled genes bright, unknown genes ???. Hover a chip for the codex line. | ward · hasty · linked |

A full header reads *WARDED CRYPTJACK-4821 v2 · TOLLGATE*, with *ward · hasty · linked* under the bar. A named build reads *HASHRAT-0193 v2 · GLASSJAW* with *tax · armored*.

### 5.5 Seeded and deterministic

- A genome is a pure function of the save's seeds: the network seed, the server's seed, the folder's spawn serial, the level, the grade, and the author's weights. The same save always rolls the same virus in the same folder.
- The roll uses its own hash stream, as the third part's pick does today (`Math.imul(seed ^ 0x7f4a7c15, …)` in createVirus), so adding genes never moves the game's other dice.
- ACTUARY's portfolio is state on the save, changed only at its weekly repricing from your recorded kills, so a reload replays the same result.
- Inside a fight nothing is random that wasn't already: crits, misses and the Sync Window's spot, as today.

## 6. When a seed runs out: shifting on a cadence

A player eventually beats every boss on their network, collects its natives and fills its sets. The designer wants the seed to shift, undecided on how. Three options, then a recommendation.

### 6.1 The options

| Option | How it works | Good | Bad |
|---|---|---|---|
| A. Sector handovers on a calendar | Every two weeks one sector of every network changes authors. A rival crew announces itself a week ahead (a pager line, scouts in your invasions, a dashed border on the map). Its viruses, its lair room and its loot come with it. | The world moves on its own. It reads as a turf war, which fits the factions. No reset. | Calendar-driven change is the kind of thing that breeds FOMO, and a returning player finds the net rearranged. It needs every author to have enough content to carry a sector. |
| B. Handovers when you've finished a sector | A sector changes hands only once you've beaten its holder's lair room boss and every boss of that author you can reach, and you confirm it (*Let SWARMLINE's rivals move in?*). The incoming crew is named before you say yes. | Nothing changes until you're done with it. The player chooses when. No FOMO at all. | The net only moves when you push it. Players who never finish never see a handover (which may be fine). |
| C. Reflash | Once the whole network is complete (every lair room cleared, 70% of its natives, every sector's author line beaten), you can reflash: a new network seed. | A full refresh, entirely the player's choice. | The biggest cost of the three. Done wrong it feels like a prestige reset that throws work away. |

### 6.2 What a reflash keeps and costs

| Kept | Reset | Paid |
|---|---|---|
| Levels, items, stash, collection, codex, recipes, blueprints, daemons, faction rep, signatures (the wall's currency), credits, materials, held hubs, consortium | The network signature (name, lean, roster, natives, lair bosses, rich code), your traced servers and their outposts, your lair, sector authors, the pity counters on the old network's natives (moved to a *former network* list where they still roll at the "known" rate) | 2,000 + 100 × level credits and 10 Exploits. Your outposts' stores are banked first. A screen lists every server and outpost you lose before you confirm. |

### 6.3 Recommendation

**B as the cadence, C as the end of the road, and A off by default.** A sector you've finished offers a handover, and the incoming crew is announced the moment it's offered. Once you accept, it moves in at your next login, with scouts first. A setting *Let rivals move in on their own* turns A on for players who want the world to move without them. Reflash opens when the whole network is complete.

### 6.4 Nothing that leaves is lost

- **Other networks.** An author leaving your sector still holds sectors elsewhere: consortium members' networks, and the trunk and hubs, which mix every roster.
- **LANTERN sells what it hears.** The darknet listing (an event card today) extends to the boss loot and set pieces of authors no longer on your network, priced as natives are today (400 + 40 × level credits and 2 Exploits).
- **The Listening Post** can tune to an author instead of a native. Tuned to an author, it brings a **guest lair** event once a day: that author's boss for your band in a temporary `/guest` room for 30 minutes, with its own loot table and pity carried over.
- **Pity is kept** per item, not per network, so a half-finished chase continues wherever the item drops next.

## 7. Bosses: fixed gene sets with one signature each

A boss is the same fight every time: a fixed body, fixed genes, fixed tells, one signature mechanic only it has, fixed phases and an enrage. Variety comes from having many of them, each with its own loot.

### 7.1 Phase verbs

Bosses keep today's phase system (`phases` on BOSSES, `bossPhases` in combat.mjs) with these verbs: **re-arm** (every part back to full ◆), **faster** (every attack a cycle sooner), **spawn** (a part joins, with its gene), **swap** (one gene leaves and another takes its place, announced on the phase card), and **enrage** (from its cycle, every attack every cycle, a quarter harder). A phase may never add a gene that breaks the compatibility rules: it swaps instead.

### 7.2 Target bands

A solo boss at its floor level should be won by the planner 60–80% of the time, by the misreading planner at least 45%, and the blind planner should lose at least 20 points of win rate against the reader (reading matters). No subclass should win fewer than two of six tries at the floor, and a subclass that does is flagged for its kit, not tuned around by the boss.

### 7.3 Where bosses live

| Place | Bosses | How you meet them |
|---|---|---|
| World bosses | 9, fixed places everyone shares | SPRAWL-00, the last folder of layer-1 Gauntlets, events, and the throne folder of Pits on layers 2 to 4. The story for ACTUARY. |
| Lair rooms | 17, three bands | Your lair gets one room per band. Band A (8–15) opens at 8 with three finds, as today. Band B opens at 16 and band C at 29. Each room holds one boss of that band, picked from the seed and weighted by your roster, so a network shows three of the seventeen. A room opens at its boss's floor if that's later than the band's start. Old rooms stay open. |
| Residents | Every server's `/core` | Built from the server's author: its body, its two heaviest toolkit genes open at the server's level, today's Integrity and phases. Its loot is unchanged (Squatter's Rights and Eviction Notice once each, then world uniques). |
| Crew bosses | KESSLER-FARM-00's three | Unchanged, on raid.mjs. |

### 7.4 The pool: 26 solo bosses by author

Every boss below has a fixed gene list. *Floor* is the lowest level you meet it at (it's met at your level, no lower than that). The loot column lists two or three items: its own uniques and, where it has one, its set piece. Every table follows BOSS_LOOT: 30% a kill, +10% for each kill without one, one you lack first.

**TOLLGATE (ransomware, locks and leverage)**

| Boss | Floor | Where | Genes | Signature | Phases | Loot |
|---|---:|---|---|---|---|---|
| REPO MAN *(today)* | 8 | Bounty event | Surge, Encrypt, Ward, Full Disk, Re-key | **Seizure.** An Encrypt that lands while you hold a shield takes the shield and adds it to the Lockbox's Integrity. | 60% re-arm, 30% faster | Lien and Repossessed Key *(today)*. Tollbooth Crowbar (set, exploit). |
| DEADBOLT *(today)* | 8 | Lair A | Surge, Encrypt, Mutex lock, Full Disk (as Deadbolt), Double Extortion, Re-key | **Double Lock.** At 30% a second Mutex throws a fresh lock on the Encryptor. | 60% re-arm, 30% Double Lock | Bump Key (script, 8). When a lock breaks, the part behind it is Open for 2 cycles. Deadlatch (proxy, 8). Once a fight, below half, you gain a lock of 15% of your max that comes back once, 4 cycles after it breaks. Tollbooth Ledger (set, script). |
| SHAKEDOWN | 12 | Lair A | Surge, Deadline (the Demand), Exfiltrate, Ward on the Demand, Overcharge, Double Extortion, Re-key | **Ransom Clock.** A 12-cycle countdown on its bar. Each Deadline you call off adds 3 cycles. At 0 it leaks for 30% of your max and restarts at 6. | 50% the Demand re-arms | Paper Trail (exploit, 12). Damage you deal counts 50% more toward wind-up thresholds and strips that call off charges. Escrow (shell, 12). Countdowns, enrages and re-arm timers fire 2 cycles later. Tollbooth Meter (set, shell). |
| TRIPMINE *(today)* | 20 | Lair B | Surge, Encrypt, Tripwire, Overcharge (as Claymore), Double Extortion, Re-key | **Minefield.** From half, each part you break leaves a mine on its row that blasts 15% of your max 2 cycles later unless you hold, shield or Brace that cycle. | 50% faster | Quiet Hours (proxy, 20). A part that goes loud calms down after 4 cycles. Sapper Kit (exploit, 20). When you break a part with a death trigger (Tripwire, Zip Bomb, Twin), the trigger fires on the virus's next part instead of on you. Strongbox Tumbler (set, implant). |
| BRICKWALL | 36 | Lair C | Surge, Encrypt, Rage, Rate cap, Full Disk, Overcharge, Double Extortion, Re-key | **Hard Brick.** Below half, when a part's rage starts it bricks the last skill you used on it (Offline until that part breaks, shown on the key). | 60% re-arm | Firmware Flash (shell, 36). A skill knocked offline comes back the next time you land Spike. Recovery Mode (script, 36). Below half, every 6 cycles the next hit on you is capped at 15% of your max. Strongbox Vault Door (set, proxy). |

**SWARMLINE (worm, numbers and spares)**

| Boss | Floor | Where | Genes | Signature | Phases | Loot |
|---|---:|---|---|---|---|---|
| RELAY-KING *(today)* | 3 | SPRAWL-00 `/net/relay` | Surge, Replicate, Twin, Mass Mailer | **Hop Count.** At half, every attack a cycle sooner. | 50% Hop Count | Crown Packet and Hop Limit *(today)* |
| PATIENT ZERO | 5 | Last folder of every layer-1 Gauntlet, back in 30 minutes | Surge, Replicate, Mass Mailer | **Index Case.** Its fragments wear one ◆, and each fragment you break leaves the Replicator Open for a cycle. It teaches fragments. | 50% faster | Contact Tracer (script, 5). When a fragment hatches, your next hit on its parent deals +30%. Herd Immunity (shell, 5). Fragments gnaw you for 2 less. Hive Mind Seed (set, exploit). |
| BACK ORIFICE *(today)* | 8 | Lair A | Surge, Replicate, C2 command, Mass Mailer (as Spam Run), Self-Update, Re-key | **Remote Admin.** At 25% a Twin spins up for the Replicator. | 50% faster, 25% Remote Admin | Port Knock (exploit, 8). Your first hit on each part with no attack of its own crits. Firewall Rule (proxy, 8). Fragments can't gnaw on the cycle they hatch, and command bonuses don't apply to bites on you. Hive Mind Shell (set, shell). |
| PATCH TUESDAY *(today)* | 9 | Lair A | Surge, Mend, Hotfix (as Rollup), Self-Update, Re-key | **Cumulative Update.** Every Patch that lands makes the next one 25% bigger (shown on its cell), until you delay the Patcher or Implant it. | 60% re-arm, 30% faster | Out-of-Band (script, 9). A heal the virus casts on a part you hit this cycle heals half. Change Freeze (shell, 9). When a virus part heals, you heal 3. Hive Mind Proxy (set, proxy). |
| FLOODWALL *(today)* | 16 | Lair B | Surge, Flood ramp, Overcharge (as Storm Surge), Self-Update, Re-key | **Spillway.** A delay that resets its ramp makes the Flooder take the ramp it lost as damage. Its lesson is delays. | 50% re-arm | Sandbag (proxy, 16). Ramping damage grows half as fast on you. Backflow (exploit, 16). When an attack hits you for less than its last landing, its part takes three times the difference. Hive Mind Script (set, script). |
| CAMSWARM | 24 | Lair B | Surge, Hive brood, C2 command, Botnet Recruit, Mass Mailer, Self-Update, Re-key | **Telnet Sweep.** Every 5 cycles (on the board two ahead), each of its parts below half hatches a fragment. Break parts cleanly. | 60% re-arm | Changed Default (proxy, 24). The virus can't recruit, take or cleanse your helpers. Mass Reboot (script, 24). When you break a part, every fragment takes 30. Load Balanced Core (set, implant). |
| PARASITE | 32 | Lair C | Surge, Siphon, Hot Spare (of the Tap), Load Balancer, Hotfix (as Gorge), Self-Update, Re-key | **Host Takeover.** Healing its Siphon does past a part's max becomes a fragment. | 50% re-arm | Antibody (exploit, 32). A part that healed this cycle takes +40% from you. Tourniquet (proxy, 32). Siphons and drains that hit you deal 50% less and heal half as much. Load Balanced Shell (set, shell). |

**PALEMASK (ghostroot, misdirection)**

| Boss | Floor | Where | Genes | Signature | Phases | Loot |
|---|---:|---|---|---|---|---|
| LOVELETTER | 6 | Chain Letter event (from 6, 25 minutes on a traced mailhub server) | Surge, Scramble, Veil, Honeypot, Possession | **Attachment.** Every 5 cycles (two ahead) the Scrambler sends an Attachment, a bare one-hit part that opens two cycles later and Scrambles you unless broken. | 50% faster | Unsubscribe Link (exploit, 6): +40% damage on a part with no attack of its own. Spam Filter (shell, 6). The first Scramble each fight misses you. Palemask Veil (set, proxy). |
| SLEEPWALKER *(today)* | 10 | Lair A | Surge, Dormant, Overcharge (as Night Terror), Persistence, Re-key | **Lucid.** Wake it with a command fired in a Sync Window and it wakes Open for 2 cycles. Wake it any other way and its Alarm comes charged. | 50% re-arm | Night Light (shell, 10). Veiled and dormant timers show for you. Snooze (script, 10). The first attack of each fight lands a cycle later. Palemask Pillow (set, shell). |
| ECHOLALIA *(today)* | 18 | Lair B | Surge, Echo, Overcharge (as Last Word), Persistence, Re-key | **Repeat After Me.** Below 30% its echoes echo once more, at a quarter. | 60% re-arm, 30% Repeat After Me | Noise Gate (proxy, 18). Echoes and repeats on you deal 50% less. Call and Response (exploit, 18). When an echo hits you, your next hit on its source deals that much more. Palemask Chorus (set, script). |
| EXIT NODE | 30 | Lair C | Surge, Scramble, Veil, Packed, Front End (three layers), Overcharge, Persistence, Re-key | **Onion Routing.** Three Front End layers over the core. Your commands at the core land on the outer layer, and a peeled layer regrows 6 cycles later unless the core is Open (reading its tells keeps it peeled). | 50% re-arm | Guard Relay (proxy, 30). Your burns and helpers ignore Front Ends, wards and locks. Hidden Service (implant, 30). Every 6 cycles the next attack on you is routed through a layer and deals half. Palemask Exit (set, exploit). |
| BLACKOUT | 34 | Throne folder of layer-4 Pits | Surge, Scramble, Veil, Echo, Overcharge, Persistence, Re-key | **Rolling Blackout.** Each cycle one of its three parts is dark in a fixed rotation shown on the board. A dark part takes no damage and doesn't attack, and a broken part leaves the rotation. | 50% faster | Generator (implant, 34). When the part you aim at is out of reach (dark, out of phase, mirrored), your command hits the next part at full. UPS (shell, 34). For the first 3 cycles of a fight, hits on you deal 20% less. |

**NULL CHOIR (rhythm and mockery)**

| Boss | Floor | Where | Genes | Signature | Phases | Loot |
|---|---:|---|---|---|---|---|
| HOLLOW CHOIR *(today, rebuilt)* | 10 | Its event | Surge, Scramble, Veil, Decoy mirror, Possession, Persistence | **Harmony.** At half the Decoy's bounce rises from 30% to 50%, in place of today's second Decoy on the off-beat. | 50% Harmony | Choirboy and Hollow Note *(today)*. Choirbook Psalter (set, script). |
| MIRRORSHADE *(rebuilt, 7.5)* | 12 | Lair A | Surge, Scramble, Veil, Mimic, Overcharge (as Glass Cut), Persistence, Re-key | **Doppelganger** | 60% re-arm, 50% Doppelganger | Silvering (exploit, 12): +50% damage on a part that copied something (a Mimic, a Decoy, a Doppelganger, a rebooted twin). Smoke Pane (proxy, 12). On a cycle you hold or fire a quiet command, hits on you deal 20% less. Choirbook Mirror (set, shell). |
| SHOULDER SURFER | 18 | Lair B | Surge, Sync lock (the Logger), Keystroke dump, Veil, Overcharge (as Keystorm), Persistence, Re-key | **Credential Replay.** Its Dump replays the last command you fired in a window, at its full direct hit, in place of a flat 18. | 50% re-arm | Privacy Screen (shell, 18). Out-of-sync commands log only every other time. Muscle Memory (script, 18). After you fire in two Sync Windows in a row, the next cycle opens one for sure. Choirbook Keys (set, exploit). |
| RING ZERO | 34 | Lair C | Surge, Scramble, Mimic, Adaptive, Overcharge, Persistence, Re-key | **Kernel Hook.** At the start it hooks your key-2 skill (marked on the tray). Fired at any part but the Hook, that skill feeds the Hook a ◆ instead of damage. The Hook is a bare part worth about two hits. | 50% re-arm | Ring Minus One (implant, 34). Your skills can't be hooked, taxed or knocked offline. Syscall Table (script, 34). Each different skill you land in a row adds +5% damage, up to +25%, and repeating one resets it. Choirbook Kernel (set, implant). |

**GLASSJAW (professional denial)**

| Boss | Floor | Where | Genes | Signature | Phases | Loot |
|---|---:|---|---|---|---|---|
| CENTRIFUGE | 14 | Throne folder of layer-2 Pits | Surge, Encrypt, SYN Flood on the Pulse Node, Full Disk, Double Extortion, Re-key | **Spin-up.** The Pulse Node's interval drops by one each time its Surge lands (4, 3, 2). Any delay or Throttle on it spins it back to 4. Classes without delays kill the Pulse Node first. | 50% re-arm | Governor (proxy, 14). An attack that lands within 2 cycles of its part's last one deals 25% less. Cascade Failure (exploit, 14). When you delay or Throttle an attack, its part takes 20. Glass Ceiling Rotor (set, exploit). |
| HASHLORD *(rebuilt, 7.5)* | 16 | Lair B | Surge, Cycle tax (the Miner), Ward (the Pool Lock), Overcharge (as Difficulty Bomb), Self-Update (as Block Reward), Re-key | **Chain Fork** | 60% re-arm, 50% Chain Fork | Proof of Work (shell, 16): Clock Speed fills twice as fast while anything slows your cooldowns. Orphan Block (exploit, 16). When a part you're hitting heals or grows, your next hit on it adds that amount, up to 40. Glass Ceiling Ledger (set, script). |
| BYZANTINE | 26 | Throne folder of layer-3 Pits | Surge, Replicate, Stateless, Mass Mailer, Self-Update, Re-key (three Nodes) | **Byzantine Fault.** Every 4 cycles (two ahead) the three Nodes vote and the most damaged one is restored to the average of the three. Spread your damage, then burst. | 50% re-arm | Majority Attack (exploit, 26): +8% damage for each part below half, up to +32%. Quorum Sensor (proxy, 26). When two attacks land on the same cycle, the second deals 30% less. Glass Ceiling Quorum (set, proxy). |
| GOLDEN PARACHUTE | 38 | Lair C | Surge, Encrypt, Exfiltrate, ACL, Cycle tax, Full Disk, Double Extortion, Re-key | **Severance.** When a part breaks, every surviving part gains a ◆ and its next attack (two or more cycles away) becomes a charge. | 60% re-arm | Non-Compete (shell, 38): ◆ and shield the virus takes from you (Exfiltrate, seals) vanish instead of going to it. Stock Options (script, 38). Every 4 cycles you survive adds +5% damage, up to +20%, for the fight. Glass Ceiling Parachute (set, implant). |

**ACTUARY (the AI)**

| Boss | Floor | Where | Genes | Signature | Phases | Loot |
|---|---:|---|---|---|---|---|
| UNDERWRITER | 40 | ACTUARY's sector, `/core` of its hub server, from its story beat | A three-part construct: Surge, Encrypt, Replicate, Scramble, Veil, Rate cap, Full Disk, Self-Update, Re-key | **Risk Model.** A premium meter on its bar. Each tell that lands on you raises it, each read lowers it. At 60% and 30% it buys a phase whose size depends on the premium: a re-arm when low, a re-arm and faster when high. Fully deterministic from your play, and on screen the whole time. | 60% and 30% Risk Model | Moral Hazard (exploit, 40): +3% damage for each tell that landed on you this fight, up to +30%. Reinsurance (proxy, 40). The first time each fight a hit takes more than 30% of your max, the excess comes back as a shield over 2 cycles. Actuarial Table (set, implant). |

That is 26 solo bosses: 12 kept (RELAY-KING, REPO MAN, HOLLOW CHOIR and the nine native bosses) and 14 new, spread over levels 3 to 40 (eleven at 3 to 12, eight at 14 to 26, seven at 30 to 40). Each has its own loot, and 24 of them carry a set piece.

The current nine native bosses drop their network's natives today. In this design each has its own table, and its first kill still names its network's natives. A lair boss also rolls the network's native roll at the elite rate (three rolls at 0.5% with the network's pity), so the lair stays a native route without being the native route.

### 7.5 HASHLORD and MIRRORSHADE, rebuilt

**HASHLORD** (GLASSJAW's Hashrat build, lair band B, floor 16)

| | Today | Rebuilt |
|---|---|---|
| Parts | Pulse Node, Miner (bare) | Pulse Node, Miner (bare), Pool Lock (a Lockbox warding the Miner) |
| Genes | Surge, Cycle tax, Overcharge (Difficulty Bomb), Double Extortion, Re-key | Surge, Cycle tax, Ward (Pool Lock), Overcharge (Difficulty Bomb), Self-Update (as Block Reward), Re-key |
| Signature | None beyond the tax | **Chain Fork.** At half a second Miner spins up. The tax comes back if the first Miner is gone, and the Pool Lock wards it too if it still stands. |
| Phases | 60% re-arm, 30% faster | 60% re-arm, 50% Chain Fork. The 30% faster is gone. |
| The lesson | Kill the Miner, then it's a plain two-part fight | Break the Pool Lock early, keep SIGINT (or a cast answer) for Block Reward, and save burst for the fork. Killing the first Miner early buys the first half only. |
| Floor | Your level from 8 | 16 (band B), where the kit has SIGINT and every subclass has a cast answer or two hits to spare |
| Axes | Tempo, Burst | Tempo (tax), Shell (ward), Sustain (Block Reward, an amplifier you can interrupt), Burst. One primary each. |

Prototype, measured (in memory: a Lockbox warding the Miner, a second Miner at half, the Self-Update cast on the Miner, Integrity unchanged):

| | Lv 10 | Lv 18 | Lv 30 | Misreading 18 / 30 |
|---|---:|---:|---:|---:|
| Today | 65% | 90% | 83% | 73% / 73% |
| Prototype | 58% | 79% | 73% | 75% / 63% |

The prototype lands in the 60–80% band at 18 and 30. The per-subclass view caught a problem: the Herder won 2 of 6 at 18 and 30, and the Payload 0 of 6 at 30, because today's Lockbox caps burns and helpers too. The rebuild's Pool Lock caps only your commands and lets burns and helpers through at full, which is the answer those two kits have. That version still has to be measured, and it is the first job for the harness in section 11.

**MIRRORSHADE** (NULL CHOIR, lair band A, floor 12)

| | Today | Rebuilt |
|---|---|---|
| Parts | Pulse Node, Scrambler, Mimic, and a Decoy from half | Pulse Node, Scrambler, Mimic |
| Feedback genes | Scramble (primary), the Mimic and the Decoy (two amplifiers), and Possession as its two-hit charge | Scramble (primary), the Mimic (one amplifier). Its charge becomes Glass Cut, a plain Overcharge on the Scrambler. The rules would allow Possession, but a boss's charge takes two hits and the misreading bot paid most for feedback, so the rebuild drops it. |
| Global beats | One in four before half, two in four after | One in four before half, none after |
| Signature | Doppelganger, a longer scramble | **Doppelganger.** At half the Mimic stops recording and takes the shape of the first part you broke (its attack and its ◆ count), or of the Pulse Node if you haven't broken one. The phase card names the shape. |
| Phases | 50% Decoy | 60% re-arm, 50% Doppelganger |
| Floor | Your level from 8 | 12. At 12 and 13 its budget trims the Scrambler to ◆3 (from ◆5) and its Scramble to every 5 cycles (from 4). |
| The lesson | Go quiet on two beats in four while scrambled | Go quiet on the Mimic's beat until half, then choose your first kill knowing what the Doppelganger will copy. |

Prototype, measured (in memory: Possession swapped for a plain charge, a re-arm in place of the Decoy split as a stand-in for Doppelganger, boss damage ×0.9, and at 13 and under the Scrambler at ◆3 attacking every 5):

| | Lv 10 | Lv 18 | Lv 30 | Misreading 10 / 18 / 30 |
|---|---:|---:|---:|---:|
| Today | 38% | 77% | 90% | 33% / 60% / 77% |
| Prototype without the level trim | 40% | 77% | 88% | 33% / 69% / 81% |
| Prototype with the level trim | 56% | | | 56% |

With the trim, the misreading player wins as often as the perfect reader at 10, so the fight no longer punishes one misread three ways. It still sits under the band at 10, which is one reason for the floor of 12. Both Breaker subclasses still lose all six at 10, as they do against HOLLOW CHOIR and REPO MAN. Capping every plain hit so its crit stays under 45% of your max didn't change that (38%, the same as today), so the Breaker's level-10 trouble with three-part bosses is sustained pressure and a short kit, not one spike. It belongs to the class pass.

## 8. Loot: random rolls, unique chase, and implicits

### 8.1 The philosophy

| Layer | What it's for | Where it comes from |
|---|---|---|
| Random rolls (white, blue, yellow) | The bulk of drops, the primary stats, and now the **implicit**: everyday gear that answers what you fight | Every kill, as today (`LOOT` in gear.mjs) |
| Rule affixes | Reading the board: tells winding up, the signature part, bare parts | Blues and yellows, as today |
| Uniques | The chase. Each changes how a fight plays. | Bosses (26 tables), world drops, strains' trophies, natives, sets |
| Natives | The network's own chase | Kills on the network, lairs, the darknet, the Listening Post, as today |
| Sets | Build-defining chase that rewards beating many bosses | Boss lines and authors' elites and champions |

Drop rates stay as they are (a blue every 20–30 minutes, a gold every 10–12 hours). The chase moves toward named items: with 26 boss tables and 10 sets, most of the gold a player hunts is something with a name and a source.

### 8.2 Implicits

Every protocol that drops from a virus kill gets one **implicit**: an extra line, chosen from one of that virus's genes, that works against that gene. You get anti-ward gear from fighting ward builds.

| Rule | Detail |
|---|---|
| Which gene | One of the dropping virus's genes, weighted by gene cost, so its hardest gene is likeliest. A core gene gives the family's bane line (the Surge row). Its own dice, so it never moves other rolls. |
| Tier | Tier I from a wild virus with one rolled gene. Tier II from two or more rolled genes, a v2 or v3, or a named build. Tier III from an elite, a champion, or a boss's random drops (three rolls each, as today). |
| How many | One. Elites' and bosses' random drops carry two, from two different genes. |
| What it does | The gene's implicit column in section 3 (for example Ward: *your hits get through a ward's cap 25% more* at tier II). |
| On which items | Whites, blues and yellows. Uniques, natives and set pieces don't roll implicits: they're designed whole. |
| Stacking | Two implicits on the same gene count once, at the better value, as rules do today. Against any one virus, implicit damage bonuses add up to +20% at most. |
| Rule affixes | A separate line. An implicit never takes a rule's place, and Policy Engine doesn't amplify implicits (it amplifies rules). |
| Old items | Items from before this have no implicit. Nothing is taken away. |

**In the tooltip** the implicit sits under the primary stats and above the affixes, in its axis colour with its gene's icon, and names where it came from:

> **Weaponized Exploit Chain**
> Damage 14 · Crit 4%
> *Implicit · from a WARDED CRYPTJACK (TOLLGATE)*: your hits get through a ward's cap 25% more.
> Precise · +3% Crit
> Interrupt Handler · +19% damage on a part winding up a tell

The implicit names the gene even if your codex hasn't decoded it, and the drop marks the gene as *Seen*. Loot teaches the codex.

**Crafting.**

| Action | What it does | Cost |
|---|---|---|
| Recompile | Rerolls the implicit's value inside its tier. | 40 + 6 × level credits and 2 of the dropping family's code |
| Graft | Moves an implicit from one item to another. The donor is destroyed, and the target's old implicit is replaced. Uniques, natives and set pieces can't take one. | 2 Exploits and 4 salvage |
| Imprint | Compiling a blue at home (`compile <stat>`) can add a tier I implicit of a gene your codex has Decoded, paid in that gene's sample: the salvage its part already leaves (a Lock Pin for Ward, a Mirror Shard for Twin, a Mimic Mask for the Mimic). Tier II takes three samples. Tier III can only drop. | The compile's usual price and the samples |

Part salvage already exists for every part (*Lock Pin*, *Mutex Handle*, *Mirror Shard*, *Decoy Shell*…), so samples give it a second use. New genes' parts each get a salvage name.

**Balance bounds**, checked by the harness the way natives.test.mjs checks natives today:

- On fights that don't carry its gene an implicit does nothing, so a blue with an implicit is a blue.
- On fights that carry it, the planner loses 2, 4 and 7 points less Signal a fight at tiers I, II and III. A loadout of six matched implicits may not cut more than 15 points.
- No implicit may turn a gene off entirely. That job belongs to bane uniques, which are rare and named.

### 8.3 Banes: which item answers which virus

| Kind | Strength | How often its target turns up | How you get it |
|---|---|---|---|
| Family implicit | Small (+5 to 12% damage, 3 to 8% less taken) | A third of fights, 60% on a network led by that family | Any drop from that family |
| Gene implicit | Medium | One fight in six to one in three in its author's sectors | Drops from viruses carrying the gene, or imprinted |
| Boss unique bane (Sapper Kit, Guard Relay, Ring Minus One…) | Strong, rule-changing | Built for an axis or a gene family, so 15 to 35% of fights | That boss's table |
| Native bane (Reflector, Split Brain, Quiet Wire, Mirror Maze…) | Strong | Each now targets a toolkit gene of an author on its network's roster, so it fires in that author's sectors | Its network, as today |
| Set bonuses | Behaviour | Always on | Boss lines |

**Applicable, not dead weight.** Two things raise how often a bane's target shows up. Authors concentrate genes: a signature gene appears in a third of its author's fights, against 8% for a third part today. And the codex, `scan` and the map show what a sector holds, so you know before connecting. The test for a bane: in its home context (its author's sectors, its lair band) its moment comes up in at least a quarter of fights, and in random play at its level in at least one in ten.

**The swap pays.** Loadouts change at home only, as today. Two additions make the swap worth doing: **loadout presets** (three saved sets of protocols, `loadout <name>` at home), and the server card listing the genes it's known to hold with your stash items that answer them (*Ward: Bump Key in your stash, 2 implicits*). The target: on matched fights a bane loaded in place of a chased blue saves 6 to 12 points of Signal a fight, and on unmatched fights it costs no more than 4.

**Not duplicating what exists.** Rule affixes read the board (a tell winding up, a bare part). Implicits and banes read the virus's identity (its family, its genes). Situational skills answer moments, and a bane never does exactly what a skill does. Instead it fills holes in the answer matrix: the harness lists which (gene, subclass, level) cells have the thinnest answers, and boss uniques are written to fill those first. Sapper Kit gives the kits that can't play around death triggers a way through. Guard Relay gives burn and helper kits the answer to wards and locks that burst kits already have.

## 9. Sets

### 9.1 Rules

| Rule | Detail |
|---|---|
| Size | Two to four pieces. Bonuses at 2, 3 and 4. |
| Slots | Pieces cover Exploit, Proxy, Shell, Script and Implant. With six slots (two Implants from 30) a player can wear one 4-piece set and one 2-piece, or two 3-piece sets. |
| Pieces | Each piece is a unique with its own effect, a sidegrade on its own (held to the natives' bounds: loaded in place of a chased blue, it moves the average by no more than 4 points). |
| Bonuses | The 2-piece bonus is worth about a major rule. The 3- and 4-piece bonuses change how you play. Only one 4-piece bonus can be active. |
| Sources | Most pieces drop from one author's boss line, one piece per boss, so a set means beating several different bosses. The rest come from that author's elites and champions. |
| Pity | A boss's set piece shares its table's BOSS_LOOT pity, one you lack first. |
| Level | Pieces grow with item level like every unique, so a piece from a level-8 boss found at 30 keeps up. |

### 9.2 The ten sets

| Set | Pieces and where they drop | 2 pieces | 3 pieces | 4 pieces |
|---|---|---|---|---|
| **Tollbooth** (TOLLGATE, 8–12) | Crowbar (exploit, REPO MAN), Ledger (script, DEADBOLT), Meter (shell, SHAKEDOWN) | Encryption ticking on you also ticks the Encryptor for the same amount. | When you break a Lockbox, Mutex or Tripwire you take its rule for 3 cycles: a ward on you (no hit takes more than 25% of your max), a lock of 15% of your max, or a quiet virus (its parts deal 25% less for the fight). | |
| **Strongbox** (TOLLGATE, 20–36) | Tumbler (implant, TRIPMINE), Vault Door (proxy, BRICKWALL), Drill (exploit, TOLLGATE elites from 20), Combination (script, TOLLGATE champions from 20) | A shield you raise locks: when it breaks, half comes back 4 cycles later, once. | Below half Signal you go loud: +25% damage. | Once a fight, a hit that would drop you to 0 is encrypted instead: you take it in four equal ticks, and breaking the part that dealt it clears the rest. |
| **Hive Mind** (SWARMLINE, 5–16) | Seed (exploit, PATIENT ZERO), Shell (shell, BACK ORIFICE), Proxy (proxy, PATCH TUESDAY), Script (script, FLOODWALL) | When you break a fragment, a helper of yours starts on the part that made it (5 a cycle for 3 cycles). | A helper of yours that expires leaves a copy at half for 2 cycles. | Every 5 cycles you hatch a fragment of your own (on your row). It takes the next attack's hit in your place. |
| **Load Balanced** (SWARMLINE, 24–32) | Core (implant, CAMSWARM), Shell (shell, PARASITE), Relay (proxy, SWARMLINE elites from 24) | A fifth of each hit on you lands a cycle later instead. | When the virus heals a part, you heal a quarter of that. | |
| **Palemask** (PALEMASK, 6–30) | Veil (proxy, LOVELETTER), Pillow (shell, SLEEPWALKER), Chorus (script, ECHOLALIA), Exit (exploit, EXIT NODE) | Veiled timers show for you. | When an attack misses you, its part is Scrambled for 2 cycles: its attacks may hit its own side. | You start every fight veiled: the virus's first two attacks on you deal half, and your first command crits. |
| **Choirbook** (NULL CHOIR, 10–34) | Psalter (script, HOLLOW CHOIR), Mirror (shell, MIRRORSHADE), Keys (exploit, SHOULDER SURFER), Kernel (implant, RING ZERO) | Mimic, Decoy, Phase shift and Sync beats show a cycle further ahead. | A quiet command on a virus's beat readies your last skill. | You get a beat of your own: every 4th cycle, shown on your row, your command echoes at 50%. |
| **Glass Ceiling** (GLASSJAW, 14–38) | Rotor (exploit, CENTRIFUGE), Ledger (script, HASHLORD), Quorum (proxy, BYZANTINE), Parachute (implant, GOLDEN PARACHUTE) | Taxes, SYN Flood and Offline add at most 1 cycle to any skill. | A skill that sits ready and unused banks 5% damage a cycle for its next use, up to +30%. | Once a fight, below 25% Signal, your next two commands cost no cooldown and each heals 10% of your max. |
| **Kestrel Clearance** (Kestrel ICE, layer 2+) | Badge (proxy, the Bouncer), Token (script, the Tracer), Lanyard (shell, the Sentinel) | Trace on runs grows 25% slower, and a guard's first attack waits a cycle. | Every 5 cycles, if you have no ◆, you gain one. | |
| **Actuarial Tables** (ACTUARY, 30–40) | Table (implant, UNDERWRITER), Ledger (exploit, ACTUARY elites), Model (script, ACTUARY champions) | Your implicits count 50% more (inside the +20% cap). | Your implicits work against every gene on the same axis, not just their own. | |
| **LOWLIGHT Kit** (story) | wick's Old Toolkit (exploit, level 1) and the Lowlight Badge (implant, level 22), both existing | Delivering a contract fills your Signal, and your next kill pays 25% more XP. | | |

The Actuarial Tables set is the implicit-build set: it turns a stash of anti-gene gear into broad answers, so the late game has a reason to collect implicits on purpose.

### 9.3 How sets sit with everything else

| | Uniques | Native uniques | Implicits | Sets |
|---|---|---|---|---|
| Job | Change one rule of the fight | Your network's identity | Answer what you fight | Build around an author's style |
| Source | Bosses, world, strains | Network kills, lair, darknet, Listening Post | Every random drop | Boss lines, authors' elites and champions |
| Strength alone | A sidegrade | A sidegrade | Small, matched only | A sidegrade a piece |
| Strength together | One of each | One of each | Best per gene, +20% cap | One 4-piece bonus at most |

A typical level-30 rig: a 4-piece set, a native in the fifth slot, a boss unique in the sixth, and implicits on nothing (set pieces and uniques don't roll them). A player who wants more implicits trades a set piece for a yellow with the right implicit for a known fight. That trade is the loadout decision the system is built to create.

## 10. The codex, scanning and learning

### 10.1 The gene codex

The codex keys on genes, not on family and part, so knowledge carries across bodies and authors. Today's keys (`strain or family:part`) map onto genes in a save migration, so nothing decoded is lost.

| Stage | How you reach it | What you see |
|---|---|---|
| Unknown | Never met | A ??? chip with its category icon (so you know it's a part behaviour, say) |
| Seen | It was in a fight with you, or an item's implicit named it | Its name, axis and category, and the authors you've seen use it |
| Decoded | You broke its part, or answered its tell or beat, or beat two viruses carrying a rule gene | Its whole rule, its telegraph, its answers, and the items in your stash that answer it. One kill of Intel XP the first time, as decoding pays today. |

The System page lists genes by category, each with its decode state. The Authors tab (section 4.3) sits beside it.

### 10.2 `scan` and `inspect`

| Command | Where | What it does | Cost |
|---|---|---|---|
| `scan <virus>` | A run, on a virus or guarded folder you can see | Shows its genome card: author, body, grade and every gene chip (names if Seen, ??? otherwise, with category). Unpacks a Packed virus. | 1 Signal, and +4 Trace on a break-in |
| `inspect <part>` | In a fight | That part's genes and what each does (if Decoded). Takes no command and no cycle. | Free |
| `scan` as an Infiltrator | A run | Quiet (no Trace), and it shows the rule of undecoded genes for that fight only | Free |

The lair card and the Network card list each lair room's boss and its genes once you've met it, so a boss fight can always be planned before you connect.

## 11. Balance: measuring a combinatorial space

The harness runs at about 10 ms a fight today (120 balance fights in 1.1 seconds on this machine), so large sweeps are cheap.

### 11.1 The checks

| Check | How | Size and time | Bound |
|---|---|---|---|
| Per-gene cost | Fight a probe (the body plus one gene) against the body alone, for every subclass, at levels 5, 10, 18 and 30, six seeds | 60 genes × 8 × 4 × 6 ≈ 11,500 fights, about 2 minutes | Sets each gene's cost: about 3–4 points of Signal per point |
| Per-gene answer | For each gene and subclass: the planner that answers it, against one that ignores that gene alone (a per-gene version of `TELL.bots.answer`) | ≈ 23,000 fights, 4 minutes | Answering is worth at least 3 points. Ignoring costs no more than 20. Each subclass owns an answer that wins at least as often as ignoring (rule 4, measured) |
| Pairs | Every legal pair as a probe, against the sum of its two genes alone | ≈ 1,500 pairs × 8 × 2 levels × 2 seeds ≈ 48,000 fights, 8 minutes | A pair worth 50% more than its two genes added up is excluded or costs more |
| Sampled genomes | 300 legal genomes per level and grade, rolled as the game would, every subclass, two seeds | ≈ 120,000 fights, 20 minutes, nightly | Wild fights at your level: the class bands that hold today (35–50% lost in blues, at least 85% wins) |
| Hardest legal genome | A beam search over legal genomes for each level and grade that maximises Signal lost | Nightly | The planner still wins 60% of the worst wild genome at its level, and the misreading planner 40% |
| Bosses | Every boss at its floor, +4 and +10 levels, every subclass, six seeds, reader, misreader and blind | 26 × 3 × 8 × 6 × 3 ≈ 11,000 fights | The bands in 7.2 |
| Banes, implicits, set pieces | Each loaded in place of a chased blue, on matched and unmatched fights | Per item | 8.2 and 8.3 |

### 11.2 The misreading bot

A planner that reads every tell is a better player than anyone. The misreading bot plays as if blind on a random share of its cycles (30% in this sheet's measurements). It took five lines in the scratch harness: on a seeded roll, flip `TELL.bots.answer` off for that cycle's choice. It's the stand-in for a person in every boss band and in the hardest-genome bound, because it's what showed MIRRORSHADE's real problem: its feedback genes cost a misreader far more than a reader.

### 11.3 Bots answering genes

Each gene carries a `bot` block the planner reads, in place of the part flags it checks by hand today (`deadman`, `lock`, `command` in planner.mjs):

| Field | Meaning | Examples |
|---|---|---|
| `focus` | Where its part sits in the kill order | `first` (Ward, C2 command once fragments are up, Pool Lock), `last` (Tripwire, Zip Bomb when you're low), `together` (Twin), `asleep` (Hot Spare while dormant) |
| `quiet` | Cycles to fire nothing direct | Mimic and Decoy beats |
| `window` | Fire inside a Sync Window | Sync lock, Handshake |
| `strip` | Strip before it lands | Re-key, Front End, ACL |
| `delay` | A delay is the answer | Flood ramp, Spin-up |
| `spread` | Spread damage | Load Balancer, Byzantine Fault |
| `touch` | Hit this part every N cycles | Watchdog timer |

The tellMove answers in tells.mjs stay, with one new answer kind (a hit fired in a window, for Handshake).

## 12. Migration and implementation

### 12.1 Data shapes

| Module | Change |
|---|---|
| `dist/genes.mjs` (new) | `GENES`: id → { name, adj, cat, axis, role (primary or amplifier), beat, cost, opens, part spec or rule hook, telegraph text, answers, implicit, bot, counter }. `AXES`. `compatible(genome, gene, level)`. `budgetFor(level, grade)`. `rollGenome(ctx)`. `nameOf(virus)` and `tagsOf(virus)`. |
| `dist/authors.mjs` (new) | `AUTHORS`: id → { name, faction, bodies, toolkit weights, colour, style, bosses, set }. Sector holders from the network seed. ACTUARY's portfolio and weekly repricing. |
| `dist/data.mjs` | FAMILIES gain `core` (gene ids). STRAINS become named builds with `author` and `genes`. MUTATIONS and the third parts become genes (their part specs move to genes.mjs). TELL_SETS are built from the body's tell genes. BOSSES gain `author`, `genes`, `signature`, `loot`, `floor`, `band`. `createVirus` takes a `genome` (rolled by `rollGenome` when none is given) and puts `genes` and `author` on the virus. |
| `dist/combat.mjs` | Today's part flags stay, so existing genes need no new code. New genes add hooks (an event list on the virus that the tell scheduler owns). |
| `dist/tells.mjs` | Gene events go through `announce` and the live limit. A window answer for Handshake. |
| `dist/network.mjs` | The signature gains a roster, sectors and three lair bosses (one per band). The lair gets a room per band. |
| `dist/gear.mjs` | `rollItem` takes the dropping virus's genes for the implicit. Recompile, graft and imprint recipes. `SETS` with bonus effect blocks. |
| `dist/content/items.mjs` | Boss uniques and set pieces, written in the editor as effect blocks. New conditions (*target copied*, *target has no attack*, *target is behind a proxy*) and effects (*implicit amplify*, *set bonus*). |
| `dist/view.mjs` | Gene chips and the byline on the fight header, the scan card, the codex by gene and the Authors tab, the Network card's roster and sectors, the map's sector shading and author marks, the implicit tooltip line, set bonuses on the Loadout page, loadout presets. |
| `dist/planner.mjs` | Reads gene `bot` blocks. |
| Harness | `genesim.mjs` (the checks in 11.1) and tests: `genes.test.mjs`, `authors.test.mjs`, a golden test for phase 0. |
| Saves | A version bump: codex keys move to genes, the network signature's one boss becomes its band-A or band-B boss by that boss's band (the other bands roll from the seed), old items keep no implicit. |

### 12.2 Order

| Phase | What ships | Done when |
|---|---|---|
| 0. Genes as data | genes.mjs describes today's content. createVirus reads genes. No behaviour change. | A golden test: 10,000 seeds through old and new createVirus give identical viruses, and every existing test is green. |
| 1. The first slice | Gene chips and the byline (TOLLGATE, SWARMLINE, PALEMASK on family viruses, factions on their servers), the gene codex and its migration, `scan` and `inspect`, the compatibility rules applied to today's content (HOLLOW CHOIR's Harmony in place of its second Decoy), HASHLORD and MIRRORSHADE rebuilt, genesim's per-gene cost and answer checks and the misreading bot. | The two bosses sit in their bands. No subclass under 2 of 6 against either (apart from the flagged Breaker-at-10 gap). |
| 2. Implicits | Implicits on drops, the tooltip line, recompile, graft and imprint. | Matched and unmatched bounds hold. |
| 3. Authors and rolled genomes | Toolkits, sectors, rolled genes on wild viruses by the budget, the eight lightest new genes (Front End, Zip Bomb, Honeypot, Stateless, Rate cap, Clock glitch, SYN Flood, Exfiltrate), names. | Sampled genomes inside the class bands, and the hardest-genome bound. |
| 4. Bosses, loot and sets | Lair bands, the 14 new bosses (in batches by author), boss loot tables, the ten sets, loadout presets. | Every boss in its band. Set pieces inside the sidegrade bounds. |
| 5. Movement | The rest of the new genes, ACTUARY and UNDERWRITER, completion-gated handovers, guest lairs, LANTERN's listings for departed authors, reflash. | The pacing bot's climb on eight network seeds stays within today's spread. |

### 12.3 The smallest useful slice

Phase 0 and phase 1. It makes what already exists legible as genes and authors, fixes the two bosses the designer named, and puts the per-gene check in place before any new gene is written. It needs no new item types, no new genes and no new bosses, and every later phase builds on it.

## 13. Open decisions

| # | Decision | Options | Recommendation |
|---|---|---|---|
| 1 | How the seed shifts | A, calendar handovers. B, handovers once you've finished a sector. C, reflash. Or a hybrid. | B as the cadence, C at full completion, A as an opt-in setting. Every departed item stays reachable through other networks, LANTERN's listings and guest lairs. |
| 2 | What a reflash costs | Keep everything but the network. Also reset outposts. Also reset faction rep. | Lose the network's servers and outposts (with a screen listing them), keep everything about you, pay 2,000 + 100 × level credits and 10 Exploits. |
| 3 | ACTUARY's timing and reach | A story beat at 26 holding one sector. An endgame author at 40. Every sector. | 26, one sector, weekly repricing only from your kills in it. |
| 4 | Lairs | One lair with a room per band. A lair per band. One lair whose boss follows your band. | One lair, a room per band, old rooms stay open. |
| 5 | Lair bosses and natives | Own loot only. Natives only (today). Own loot plus an elite-rate native roll. | Own loot plus the elite-rate native roll, and the first kill still names the network's natives. |
| 6 | Whether tells count toward rule 1 | Count them too (stricter: a Mimic ghostroot would swap Possession for Overcharge, and a C2 worm Mass Mailer for Overcharge). Leave tells to the tell system's limits. | Leave them out. The live limit already stops two tells from stacking, and today's wild viruses pass unchanged. |
| 7 | Strains | Keep them as named author builds (names, trophies, hot strain). Dissolve them into genes. | Keep them as named builds. |
| 8 | Implicit reach | Whites, blues and yellows only. Also uniques. Also set pieces. | Whites, blues and yellows only. Named items are designed whole. |
| 9 | Imprinting | Allow tier I and II from samples. Tier I only. Drops only. | Tier I from one sample, tier II from three, tier III only from drops. |
| 10 | Set power | One 4-piece bonus at most. No limit. No 4-piece bonuses. | One 4-piece bonus at most, with 2-piece bonuses about as strong as a major rule. |
| 11 | `scan` cost | Free. 1 Signal and Trace on break-ins. A skill. | 1 Signal and +4 Trace on break-ins, free and deeper for Infiltrators. |
| 12 | How much of the roster and ACTUARY's weights to show | Exact numbers. Bars and arrows. Names only. | Bars and arrows, with exact chances on hover. |
| 13 | Tripwire's level | Keep 20. Open it at 16 so it's in band B with TRIPMINE's other parts. | 16. |
| 14 | The Breaker at level 10 against three-part bosses | Fix in the bosses (lower floors and numbers). Fix in the class (a defensive tool before 12). | In the class pass. Every three-part solo boss shows it, so it isn't any one boss's fault. |

## 14. The designer's decisions

The designer approved the recommendations on the first seven open decisions:
- Sectors hand over to a new author once finished, and a full reflash opens at completion.
- A reflash costs that network's servers and outposts plus credits and Exploits, and keeps everything about you.
- ACTUARY arrives as a level 26 story beat, holds one sector, and adapts weekly.
- Lair bosses have their own loot plus a native roll.
- Tells don't count toward the one-punishment-per-axis rule.
- Implicits only appear on random rolls.
- Only one 4-piece set bonus can be active.

**What level a reflashed network is.** Classes keep their levels through a reflash, so the new network can't restart at level 1. A reflashed network is generated around your current level, the way a new zone opens at the level cap. Its layers band upward from your level with depth, and its lair and boss line sit at the top of that band. Each reflash also raises a **reflash tier** that the network carries. Every tier adds to the virus difficulty budget, raises implicit tiers, and lifts the item level of what drops, with a cap so it stays inside the balance bands. Repeat reflashes become a climb of their own instead of a reset. A reflash only opens at full completion, which in practice means late in the climb, so the new network starts near the top of the level range anyway.

## 15. What shipped: phases 0 and 1

Phases 0 and 1 are built: today's content as genes, authors and bylines, the gene codex, `scan` and `inspect`, the compatibility rules applied to today's content, HASHLORD and MIRRORSHADE rebuilt, and the per-gene cost and answer checks. No new gene rolls into a wild virus, and nothing from phases 2 to 5 is in. SAVE_VERSION stays 36.

Every measurement here comes from the planner in `genesim.mjs` (Tuned blues with the stat each subclass chases, talents for the level, run fights), on all eight subclasses (the four classes below level 10). The boss rows use twelve seeds a cell, so a subclass's wins read out of twelve. They come from this harness, not the throwaway scripts behind sections 1 and 7, so the "before" rows differ a little from the tables there.

### 15.1 Phase 0: genes as data, with no change in play

- `dist/genes.mjs` holds 41 genes: the ten attack types, nine part behaviours, three defences, nine passive rules and ten tells that carry today's content. Each has the fields section 12.1 lists. The 19 new genes are not in it. Phase 3 adds them with the same shape.
- `dist/authors.mjs` holds the eight authors, with their colours, style lines, signature genes, toolkits, builds and bosses.
- In `dist/data.mjs`, FAMILIES take their third parts from their genes (`GENES[id].parts`, pooled in `FAMILIES[f].third`, in the old order). MUTATIONS are the rule genes. STRAINS carry `genes`, `author` and their charge's gene. Every TELLS entry names its gene. `createVirus` puts `genes` (each with where it came from: core, build, rolled, grade or boss) and `author` on every virus, and takes `overrides.genes` to force the rolled genes. That is the hook phase 3's `rollGenome` will fill.
- The golden test (`golden.test.mjs`) builds 10,000 seeds over every family, strain, grade, mutation, elite, boss, guard and fixture through `createVirus` and through the builder from before genes (`golden-virus.mjs`, frozen). Part for part and number for number they match, with only the genes, the author and the name added. It then plays more than 500 planner fights (wild, strain, v2, every guard and every boss but the three rebuilt ones) on each builder's virus, and every result, cycle count, Signal lost and command count matches. That second half plays each subclass's own kit, so it holds whatever the class pass changes.

### 15.2 Phase 1

| What | How it works now |
|---|---|
| Authors and bylines | TOLLGATE, SWARMLINE and PALEMASK write the three families. Strains are named builds of their authors, as section 3.8 maps them. Kestrel writes the ICE and the Sentinel. A faction's server runs that faction's viruses, a traced server's guards and Resident are its family's crew's, and SPRAWL-00's strays sign nothing. The fight header shows *WARDED CRYPTJACK-4821 v2* with *· TOLLGATE* after it in the author's colour, and the intrusion line says who wrote it. |
| Names | A wild virus takes the adjective of its costliest rolled gene (a third part or a mutation, the first on a tie), its body's stem and its file's four digits. Files on a run carry the stem too (`cryptjack-4821.exe`). Named builds, bosses and fixtures keep their names. |
| Gene chips | There is one chip per gene under the virus's bar, in its axis's colour and icon. The body's chips are dim and dashed, everything else is bright, and a gene you've never seen shows ??? with its category's icon. Hovering a chip gives its rule once it's decoded, and a mutation's rule from the first meeting, as before. On a phone a long name wraps rather than losing its byline. |
| The gene codex | Each gene is unknown, seen or decoded (section 10.1). A fight makes every gene in it seen, and a tell becomes seen once it's said. Breaking a part decodes its genes, reading a tell decodes its gene, and two kills of a virus that carries a passive rule decode that rule. A part is known on sight once every gene it carries is decoded, on any body. The System page lists the 41 genes by category. Decode XP stays per part, as it was. A save from before genes reads its part codex and the families it met as genes, so nothing migrates. |
| `scan` | On a run it shows the card of the virus in this folder, of a folder next door that holds a virus or a guard, or of the guard at the door. It costs 1 Signal, and +4 Trace on a break-in. An Infiltrator's scan is free and quiet, shows every gene's name and the rule of each one it hasn't decoded, and its `inspect` keeps those rules for that fight. Mid-fight, `scan` shows the fight's card for free. |
| `inspect <part>` | It lists a part's genes, and what each does once decoded. It takes no command and no cycle. |
| Compatibility rules | `compatible()` checks one punishment and one amplifier per axis (Burst exempt, tells left out, as the designer decided), one beat, and the hard exclusions. Over 3,000 sampled wild viruses, and every strain with every mutation and grade, today's content passes. MIRRORSHADE (a Mimic and a Decoy as two Feedback amplifiers, two beats) and the HOLLOW CHOIR (two Decoys, two beats in four) didn't, so both changed. |
| HOLLOW CHOIR | Harmony: at half its Decoy bounces 50% of your command back instead of 30%. It no longer splits off a second Decoy. At home, where its event fights you, the win rate barely moves (95% to 96% at 10, 93% to 94% at 18). |
| Lairs | A boss with a floor holds `/core` once you reach it. HASHLORD's lair still opens at 8, but `/core` stands empty until 16 (12 for MIRRORSHADE), and `network` and `attack` there say so. |
| The harness | `genesim.mjs` holds the boss bands (reader, misreader, blind, by subclass), the spike cap measure and the per-gene checks. `genesim.test.mjs` runs them as tests. |

### 15.3 HASHLORD and MIRRORSHADE, before and after

**HASHLORD** is built as section 7.5 says. A Pool Lock (a Lockbox) wards the Miner against your commands only. Block Reward is a Self-Update cast on the Miner, and the Chain Fork at half spins up a second Miner that the Pool Lock wards too while it stands. Its phases are 60% re-arm and 50% Chain Fork, and its floor is 16. Built as the prototype was, on its old numbers, it won 84 to 88% at 16, and its Pulse Node landed for 47% of a Payload's Signal at 30 (the strain step is ×1.45 there). So it got a flatter step of its own (×0.95 at 18, ×1.1 at 30), damage ×1.05 instead of ×1.3, and Integrity ×3.4 instead of ×2. After the class-kit redesign made every class stronger, it moved to Integrity ×3.9 and damage ×1.1, which puts the reading planner at 83% at level 16 and 80% at 30 with every subclass winning at least 5 of 12.5.

| HASHLORD | Lv 10 | Lv 16 (floor) | Lv 18 | Lv 30 |
|---|---:|---:|---:|---:|
| Before: read, misread, blind | 72%, 67%, 51% | 91%, 83%, 70% | 91%, 79%, 58% | 79%, 76%, 57% |
| After: read, misread, blind | (not met) | **78%, 69%, 16%** | 77%, 58%, 10% | 80%, 61%, 27% |
| After, wins by subclass of 12 | | Demolitionist 7, Overclocker 9, Warden 9, Sysop 11, Payload 11, Phantom 7, Herder 10, Hijacker 11 | | Payload 11 and Herder 7 (4 and 4 before) |

The Pool Lock, measured as section 7.5 asked. At 16 the rebuilt boss wins 78% with a Pool Lock that caps only commands, 78% with one that caps burns and helpers too, and 83% with no Pool Lock at all. At 30 the Herder wins 7 of 12 and the Payload 11 of 12 with either ward. The planner breaks a ward first in every kit but the Infiltrator's, which burns under it, so the commands-only cap changes little for these two kits. What sank the Herder and the Payload at 30 before was the size of the Pulse Node's hits, not the ward.

**MIRRORSHADE** is built as section 7.5 says. The Mimic is its one Feedback amplifier, and Glass Cut (a plain Overcharge on the Scrambler) takes Possession's place. At half, the Doppelganger stops the Mimic recording and gives it the attack and ◆ of the first part you broke, or the Pulse Node's. The phase card names the shape. Its phases are 60% re-arm and 50% Doppelganger, and its floor is 12. At 12 and 13 its Scrambler wears ◆3 and Scrambles every 5. Built at its old size it won 31% at 12, and the Doppelganger was most of that (50% without it). Integrity ×1.3 (from ×1.5) and damage ×0.9 (from ×1.1) put it in the band.

| MIRRORSHADE | Lv 10 | Lv 12 (floor) | Lv 18 | Lv 30 |
|---|---:|---:|---:|---:|
| Before: read, misread, blind | 51%, 41%, 14% | 54%, 42%, 21% | 80%, 75%, 49% | 94%, 88%, 74% |
| After: read, misread, blind | 66%, 56%, 25% | **64%, 65%, 43%** | 80%, 79%, 63% | 85%, 83%, 74% |
| After, wins by subclass of 12 | | Demolitionist 8, Overclocker 9, Warden 12, Sysop 3, Payload 6, Phantom 10, Herder 9, Hijacker 4 | Sysop 0 | Sysop 1 |
| Worst single hit and worst three cycles at 12 | | 42% and 73% (51% and 85% before) | | |

On the genome build, before the class kits, both sat in the band at their floors: the reader won 60 to 80%, the misreader 45% or more, and the blind bot more than 20 points less. Every subclass won at least four in twelve, except the Sysop against MIRRORSHADE, which is flagged for its kit (section 7.2). At 12 the misreader won as often as the reader, which is what the rebuild was for. Both Breakers, at 0 of 12 before, won 8 and 9.

**MIRRORSHADE after the class kits.** On the merged build, at the same ×1.3 Integrity and ×0.9 damage, the reader won 83% at 12, the misreader 85% and the blind bot 73%. Reading was worth 10 points, and the band asks for 20.

The Mimic's beat is the read this fight is built on, and the blind bot went quiet on 180 of the 218 beats the Mimic recorded without reading one of them. Before the kits it went quiet on 176 of 222. The beats fall on cycles 3 and 7, inside the Scrambles of cycles 2 to 4 and 7 to 9. While it's Scrambled the planner holds back its big hits whether it reads tells or not, and the kits open on cycle 3 with set-ups the Mimic has nothing to copy from: Crack, Retaliate, Detonate, Null Route and Hook. Half comes by cycle 5 or 6, so most fights record only that one beat. A plain playback cost the blind bot 8% of its Signal a fight, and 10% before the kits.

That was enough before the kits because the fight was close. The Scrambler took 44% of a blind bot's Signal a fight and the Pulse Node 10%. With the kits those fell to 34% and 6%, and the blind bot had room to spare. The kits' strips and hits also answer the boss's other tells by accident. Go Dark landed on the blind bot 3 times in 96 fights, down from 16, and Glass Cut didn't land once.

The reading planner misread the beat as well. It answered a cast or a seal (a hit for Persistence, a Spike to strip the Scrambler before Go Dark) without checking whether the Mimic was recording, so it fired hits into the beat. The Payload took six playbacks that way in its twelve fights, and the readers took ten before the kits.

The fix makes the Mimic the amplifier on its Scramble in play as well as on paper. While you're Scrambled, MIRRORSHADE's Mimic plays your hit back twice over (BOSSES `mimic: 2`, in `mimicLands`), still under the tell ceiling of half your max. Clearing the Scramble with Vent, Scrub or Rotate Keys, or sending it after a Honeypot, brings the playback back to one. A reader who goes quiet on the beat never pays it, so the worst single hit and the worst three cycles at 12 stay at 42% and 74%. The planner's answers to a cast or a seal now skip a command with a direct hit on a beat the Mimic is recording, and the reader takes no playbacks at all. Integrity and damage stay at ×1.3 and ×0.9. Raising damage alone to ×1.2 had opened the gap to 21 points, but the worst three cycles reached 89% and the Sysop and the Payload collapsed at 18.

| MIRRORSHADE, merged build | Lv 12 (floor) | Lv 18 | Lv 30 |
|---|---:|---:|---:|
| Before the fix: read, misread, blind | 83%, 85%, 73% | 82%, 76%, 54% | 86%, 81%, 68% |
| After the fix: read, misread, blind | **84%, 83%, 58%** | 82%, 75%, 48% | 86%, 79%, 64% |
| After, wins by subclass of 12 | Demolitionist 8, Overclocker 9, Warden 10, Sysop 11, Payload 12, Phantom 10, Herder 12, Hijacker 9 | Sysop 0, Payload 9, the rest 11 or 12 | Sysop 2, the rest 11 or 12 |
| Worst single hit and worst three cycles, after | 42% and 74% | 43% and 65% | 45% and 77% |

The reader sits at the top of the test's band at 12 (55 to 85%), as HASHLORD does at 16. The kits made every class stronger, and the fight was left at its size so the change stays on the tell.

### 15.4 Per gene

These come from `node genesim.mjs genes`, with six seeds (the test runs two). Each gene is fought as a probe against its body alone: a third part or a mutation on its family's body, Linked on a v1, the Bouncer against the Shredder and the Tracer against the Watchdog, and a tell alone against no tells. *Answering saves* compares the planner playing the gene with one that ignores that gene alone (`GENE_BOTS.ignore`), on genes the planner has a rule for. Points are Signal lost a fight, averaged over levels 5, 10, 18 and 30 where the gene is open.

| Gene | Cost | Points a fight | A cost point | Answering saves | Ignoring costs |
|---|---:|---:|---:|---:|---:|
| Ward | 2 | +9.8 | +4.9 | +1.3 | +11.1 |
| Mutex lock | 3 | +3.3 | +1.1 | −2.4 | +0.9 |
| Tripwire (30 only) | 2 | +16.1 | +8.1 | −0.2 | +15.9 |
| Twin | 2 | +15.0 | +7.5 | +1.0 | +16.0 |
| C2 command | 2 | +10.8 | +5.4 | 0.0 | +10.8 |
| Decoy mirror | 3 | −5.3 | −1.8 | +9.1 | +3.8 |
| Mimic | 3 | −3.6 | −1.2 | +12.9 | +9.4 |
| Armored | 2 | +17.9 | +8.9 | | |
| Regenerative | 1 | −0.5 | −0.5 | | |
| Hasty | 2 | +11.2 | +5.6 | | |
| Adaptive | 1 | +0.3 | +0.3 | −0.1 | +0.2 |
| Linked | 1 | +13.9 | +13.9 | | |
| Keyring | 2 | +16.2 | +8.1 | −14.3 | +1.9 |
| Escalation | 2 | −1.8 | −0.9 | | |
| Overcharge (17+) | 1 | −1.3 | −1.3 | +0.1 | −1.2 |
| Full Disk | 2 | +1.0 | +0.5 | +4.1 | +5.1 |
| Mass Mailer | 2 | −0.6 | −0.3 | +6.1 | +5.5 |
| Possession | 2 | −1.4 | −0.7 | +2.0 | +0.6 |
| Double Extortion | 2 | +3.1 | +1.6 | +4.5 | +7.6 |
| Self-Update | 2 | +5.2 | +2.6 | +8.9 | +14.0 |
| Persistence | 2 | +2.0 | +1.0 | +7.9 | +9.9 |
| Re-key (on the Sentinel) | 2 | +1.3 | +0.6 | −0.2 | +1.1 |
| Battering Ram | 2 | +6.4 | +3.2 | +3.6 | +10.0 |
| Hotfix (on the Patchwork) | 2 | +0.4 | +0.2 | −0.8 | −0.4 |

The named builds are measured as each strain against its family's body, a part of which it replaces, so these numbers are the build's net cost: Rage (the Bricker) +21.3, Deadline (the Extortion) +19.0, Flood ramp +5.7, Siphon +4.9, Dormant +3.8, Phase shift +1.3, Cycle tax +0.9, Echo −12.8, Hive brood −12.9, Mend −18.6 and Sync lock −31.3. The Keylogger's number comes from a harness that fires in every window it gets, which a person won't.

What the table says:

- **Ward, C2 command and Hasty sit near the target**, about 5 points a cost point. Twin, Armored, the Keyring and the Tripwire cost about twice their points, and Linked, which comes free with v2, costs 14 points.
- **The Decoy and the Mimic cost a reader nothing.** As third parts they take 15% of the other two parts' Integrity and carry no attack, so a reader comes out ahead. Ignoring them is what costs, 4 and 9 points. Regenerative, Adaptive, Escalation, Hotfix and Re-key barely move a fight.
- **Tells are cheap alone and worth reading.** Answering Self-Update, Persistence, the Mimic or Mass Mailer saves 6 to 13 points. Overcharge alone is rarely said, because a two-part body dies before its first one lands.
- **The planner's Keyring answer is wrong.** Breaking the Keyring first loses 14 points to playing the Bouncer as a plain guard, and every subclass wins more by ignoring it.
- **The answer bounds don't hold yet.** Answering is worth under 3 points for Ward, Twin, C2, the Tripwire, Adaptive, the Mutex and Re-key, because the planner already plays them well without the rule. It leaves a Tripwire for last anyway, since its Ping is small.

`genesim.test.mjs` holds two hard bounds: no rolled gene or tell costs more than 25 points a fight, and ignoring one never costs more than 25. The calibration targets (2 to 6 points a cost point, answers worth 3 or more, ignoring 20 at most, and every kit's answer winning at least as often as ignoring) run as a `todo` test that lists today's misfits.

### 15.5 The spike cap, today

Rule 5 asks that no single landing pass 45% of a same-level player's Signal. Here is the worst single hit each boss landed on any subclass, reading, over six seeds:

| Boss | Lv 10 | Lv 18 | Lv 30 |
|---|---:|---:|---:|
| RELAY-KING | 34% | 49% | 47% |
| REPO MAN | 18% | 49% | 50% |
| DEADBOLT | 52% | 40% | 47% |
| TRIPMINE | 65% | 49% | 47% |
| BACK ORIFICE | 49% | 49% | 37% |
| PATCH TUESDAY | 58% | 56% | 77% |
| FLOODWALL | 39% | 46% | 52% |
| SLEEPWALKER | 51% | 49% | 68% |
| ECHOLALIA | 31% | 44% | 63% |
| HOLLOW CHOIR (at home) | 38% | 41% | 41% |
| HASHLORD, rebuilt | 50% at 16 | 49% | 57% |
| MIRRORSHADE, rebuilt | 42% at 12 | 43% | 45% |

Most of these are a boss charge that got through. A boss's charge adds up to 27.5% of your max on top of its plain hit (`TELL.boss.cap`), so any plain hit over about 17% of the smallest Signal pool (a Phantom's or a Payload's) lands a charge past 45%. Cutting HASHLORD's hits further to meet the cap pushed it out of the band before it got under 45%. The cap runs as a `todo` test for the two rebuilt bosses.

### 15.6 Decisions for the designer

1. **The spike cap against boss charges.** Either a boss charge's extra counts toward the cap, and most of today's bosses fail it, or rule 5 reads the plain hit with a crit and leaves charges, which can be answered, to the tell system's own ceiling of 50%.
2. **The Sysop against MIRRORSHADE.** With the class kits it wins 11 of 12 at 12, but 0 of 12 at 18 and 2 of 12 at 30. The Doppelganger's extra attacker lands while the Sysop's slow kill is still going. It's flagged for its kit, as section 7.2 says, but the gap widens with level.
3. **Costs the table disagrees with.** Armored, Twin, Linked and the Keyring cost far more than their points, and the Decoy, the Mimic, Regenerative and Adaptive far less. Phase 3's budget rolls by these costs, so they should move first. The levers are the Decoy's and the Mimic's Integrity trim, Regenerative's one-cycle patch and Linked's third of a hit.
4. **The Keyring answer.** The planner and the codex line say to break the Keyring first, and the harness says that loses. Either the answer or the Keyring changes.
5. **Floors on the other bosses.** Only HASHLORD (16) and MIRRORSHADE (12) have floors. Section 7.4 gives every boss one (FLOODWALL 16, ECHOLALIA 18, TRIPMINE 20). Holding `/core` until then is a one-line data change each, but it delays those networks' lair bosses, so it waits for the lair bands of phase 4.
6. **Tripwire at 16** (open decision 13) isn't applied. It stays at 20 until it's confirmed, because it changes which wild viruses roll at 16 to 19.

### 15.7 Where phases 2 to 5 plug in

- New genes join `GENES` with the same shape (a part spec under `parts`, or a rule hook), and `compatible()` already knows the hard exclusions that name them.
- `createVirus` takes `overrides.genes`. Phase 3's `rollGenome` draws from an author's toolkit with `budgetFor` and passes the result there, and `stemOf` names the virus from whatever it rolled.
- Every virus carries `author`. Phase 3's sector holder is one more case in `placeAuthor` (combat.mjs).
- Every gene carries `implicit`, its line for phase 2, and `counter`, ACTUARY's swap for phase 5.
- BOSSES take `extra` parts, a `trim` below a level, `floor`, `band` and `signature`, and the phase verbs now include `fork:<part>`, `harmony` and `doppelganger`. Phase 4's 14 new bosses are data plus one signature verb each.
- `GENE_BOTS.ignore`, `TELL.sim.only` and `genesim.mjs` are the per-gene harness section 11 asks for. The pairs, sampled-genome and hardest-genome checks are the next ones to add.
