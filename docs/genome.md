# Genome: authored viruses

**Status.** The design for viruses as bodies plus rules, written by crews. Built: the rule library (`genes.mjs`), the
authors (`authors.mjs`), the compatibility rules, HASHLORD and MIRRORSHADE rebuilt, sets (the loot plan's), rolled
builds on breaches (GAME_RULES.md *Rules and authors*, *Part research*, *Sets*, *The Resident and bosses*). Left: the
14 new bosses, ACTUARY and UNDERWRITER, the Tollbooth set, handovers and the reflash.

**Genes are cut from the player's view.** The designer: *"Genes are not computer virus properties though."* The
player reads parts and their research, never genes; the gene library stays in the code as the shape content is built
from. Below, a virus's *rules* are its gene ids.

## 4.4 ACTUARY, the one adaptive author

Halcyon prices crews' risk with a model; in the late story it starts writing viruses to make the risk it prices come
true. The only author that changes its work by watching you (`authors.mjs` has it, `later: true`).

| Rule | Detail |
|---|---|
| When | A story beat at level 26 (mail from Claims: *our model has started writing its own policies*). It holds floor 5, Deep Core, for good. |
| Its portfolio | Six rules at a time, shown on the Network card and its floor's servers. Its viruses roll from those six, under the same budget and rules as everyone. |
| Repricing | Every 300 kills on its floor (never on a calendar), it drops the rule you beat most there (by kills, reads and parts broken first) and adds that rule's counter (below). No kills, no repricing. |
| Warning | A *Repricing notice* mail and a Network card line say what is under review first: *Twin claims are down 40%. Under review: Twin. Proposed: Hot Spare.* |
| Bounds | One rule out and one in at a time, inside the compatibility rules. It never drops below one rule per axis it started with. |
| Its boss | UNDERWRITER (7.4), the same fight every time: the adaptation is in its wild viruses and elites only. |
| Steering | You see what it will counter, so farming one rule on its floor tells it what to bring next. |

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
| Mend or Siphon (kill the healer) | Antivirus Sweep | The burns that stop heals get wiped |
| Veil (strip or Tag) | Dormant | Nothing to strip before it wakes |
| Cycle tax (kill the Miner) | SYN Flood | The tax rides an attack instead of a part |
| Front End (strip it) | ACL | It keeps blocking a damage kind |
| Hasty (race it) | Ransom timer | The race has a visible deadline |
| Armored (strippers) | Adaptive | Chains of hits build armor |

## 5.3 Compatibility rules: the authoring checklist

Checked on every virus's rules (`compatible` in genes.mjs). A new body, boss or rule passes all five.

| Rule | What it says |
|---|---|
| 1. One punishment per axis | At most one primary per axis and one amplifier on top. Burst is exempt (rule 5 bounds it); tells don't count (the designer's decision). |
| 2. One beat | At most one rule with a beat of its own (Mimic, Decoy mirror, Phase shift, Sync lock, Keyring, Watchdog timer). A global beat covers at most one cycle in four. |
| 3. One clock | Every rule event goes through the tell scheduler: on the board two cycles ahead, never on a cycle with another heavy event or a tell landing. |
| 4. An answer in every kit | Each subclass at that level (each class below 10) owns an answer: a skill unlocked by then, SIGINT from 10, or a play every kit has, shown enough by the harness. |
| 5. Spike cap | The worst single landing, crit and charge cap included, is at most 45% of a same-level player's max Signal in blues; the worst three cycles at most 75% (85% for bosses). |

Hard exclusions (`EXCLUDE`): Sync lock never with Clock glitch, Twin never with Hot Spare, Dormant never with Honeypot;
Ransom timer never on a boss.

## 6. When a seed runs out

**Decided (designer).** A floor hands over to a new holder only once you've finished it, and you confirm (the
incoming crew is named first, its scouts come in your invasions). A full **reflash** opens once Bedrock is Mapped. A
setting *Let rivals move in on their own* can turn on calendar handovers for players who want the world to move
without them.

| A reflash keeps | Resets | Costs |
|---|---|---|
| Levels, items, stash, collection, Codex, daemons, faction rep, signatures, credits, materials, consortium | The network signature (name, lean, roster, natives, lair bosses), its floors and servers, floor holders; the old natives' pity moves to a *former network* list where they still roll at the "known" rate | 2,000 + 100 × level credits and 10 Exploits; a screen lists every server you lose before you confirm |

**What level a reflashed network is.** It is generated around your current level, its floors banding upward from it.
Each reflash raises a **reflash tier** the network carries: more virus budget and higher item levels, capped inside
the balance bands, so repeat reflashes are a climb of their own.

**Nothing that leaves is lost.** An author leaving your floors still writes on consortium members' networks and the
hubs. LANTERN's darknet listing extends to departed authors' boss loot (400 + 40 × level credits and 2 Exploits). The
Listening Post can tune to an author for a daily **guest lair**: that author's boss for your band in a temporary room
for 30 minutes. Pity is kept per item, not per network.

## 7. Bosses: fixed rules, one signature each

A boss is the same fight every time: a fixed body, rules, tells, one signature mechanic only it has, fixed phases and
an enrage. Variety comes from having many, each with its own loot.

### 7.1 Phase verbs

**re-arm** (every part back to full ◆), **faster** (every attack a cycle sooner), **spawn** (a part joins), **swap**
(one rule leaves and another takes its place, on the phase card) and **enrage** (every attack every cycle, a quarter
harder). A phase never adds a rule that breaks 5.3: it swaps instead.

### 7.2 Target bands

At its floor level the planner wins a solo boss 60–80% of the time, the misreading planner (11.2) at least 45%, and
the blind planner loses at least 20 points against the reader. No subclass wins fewer than two of six at the floor; one
that does is flagged for its kit, not tuned around by the boss.

### 7.3 Where bosses live

| Place | Bosses |
|---|---|
| World bosses, fixed places everyone shares | SPRAWL-00, the last room of floor 1's Gauntlets, events, the throne of Pits on floors 2, 4 and 6 |
| Lairs | One a floor, its boss from that floor's band, weighted by your roster (docs/content.md 3.1) |
| Residents | Every server's Core (built) |
| Crew bosses | KESSLER-FARM-00's three, on raid.mjs (built) |

### 7.4 The 14 new bosses

*Floor* is the lowest level you meet it at. Loot follows BOSS_LOOT: 30% a kill, +10% for each kill without one, one
you lack first. A boss's set piece is the loot plan's (docs/loot-plan.md), dropped by its floor's lair boss until the
boss exists.

**TOLLGATE (ransomware, locks and leverage)**

| Boss | Floor | Where | Rules | Signature | Phases | Loot |
|---|---:|---|---|---|---|---|
| SHAKEDOWN | 12 | Lair, floor 2 | Surge, Deadline (the Demand), Exfiltrate, Ward on the Demand, Overcharge, Double Extortion, Re-key | **Ransom Clock.** A 12-cycle countdown on its bar. Each Deadline you call off adds 3 cycles. At 0 it leaks for 30% of your max and restarts at 6. | 50% the Demand re-arms | Paper Trail (exploit): damage you deal counts 50% more toward wind-up thresholds and strips that call off charges. Escrow (shell): countdowns, enrages and re-arm timers fire 2 cycles later. |
| BRICKWALL | 36 | Lair, floor 6 | Surge, Encrypt, Rage, Rate cap, Full Disk, Overcharge, Double Extortion, Re-key | **Hard Brick.** Below half, when a part's rage starts it bricks the last skill you used on it (Offline until that part breaks, shown on the key). | 60% re-arm | Firmware Flash (shell): a skill knocked offline comes back the next time you land Spike. Recovery Mode (script): below half, every 6 cycles the next hit on you is capped at 15% of your max. |

**SWARMLINE (worm, numbers and spares)**

| Boss | Floor | Where | Rules | Signature | Phases | Loot |
|---|---:|---|---|---|---|---|
| PATIENT ZERO | 5 | Last room of floor 1's Gauntlets, back in 30 minutes | Surge, Replicate, Mass Mailer | **Index Case.** Its fragments wear one ◆, and each fragment you break leaves the Replicator Open for a cycle. It teaches fragments. | 50% faster | Contact Tracer (script): when a fragment hatches, your next hit on its parent deals +30%. Herd Immunity (shell): fragments gnaw you for 2 less. |
| CAMSWARM | 24 | Lair, floor 4 | Surge, Hive brood, C2 command, Botnet Recruit, Mass Mailer, Self-Update, Re-key | **Telnet Sweep.** Every 5 cycles (two ahead), each of its parts below half hatches a fragment. Break parts cleanly. | 60% re-arm | Changed Default (proxy): the virus can't recruit, take or cleanse your helpers. Mass Reboot (script): when you break a part, every fragment takes 30. |
| PARASITE | 32 | Lair, floor 5 | Surge, Siphon, Hot Spare (of the Tap), Load Balancer, Hotfix (as Gorge), Self-Update, Re-key | **Host Takeover.** Healing its Siphon does past a part's max becomes a fragment. | 50% re-arm | Antibody (exploit): a part that healed this cycle takes +40% from you. Tourniquet (proxy): siphons and drains that hit you deal 50% less and heal half as much. |

**PALEMASK (ghostroot, misdirection)**

| Boss | Floor | Where | Rules | Signature | Phases | Loot |
|---|---:|---|---|---|---|---|
| LOVELETTER | 6 | Chain Letter event (from 6, 25 minutes on a traced Mailhub) | Surge, Scramble, Veil, Honeypot, Possession | **Attachment.** Every 5 cycles (two ahead) the Scrambler sends an Attachment, a bare one-hit part that opens two cycles later and Scrambles you unless broken. | 50% faster | Unsubscribe Link (exploit): +40% damage on a part with no attack of its own. Spam Filter (shell): the first Scramble each fight misses you. |
| EXIT NODE | 30 | Lair, floor 5 | Surge, Scramble, Veil, Packed, Front End (three layers), Overcharge, Persistence, Re-key | **Onion Routing.** Three Front End layers over the core. Your commands at the core land on the outer layer, and a peeled layer regrows 6 cycles later unless the core is Open. | 50% re-arm | Guard Relay (proxy): your burns and helpers ignore Front Ends, wards and locks. Hidden Service (implant): every 6 cycles the next attack on you is routed through a layer and deals half. |
| BLACKOUT | 34 | Throne of floor 6's Pits | Surge, Scramble, Veil, Echo, Overcharge, Persistence, Re-key | **Rolling Blackout.** Each cycle one of its three parts is dark in a fixed rotation shown on the board: it takes no damage and doesn't attack. A broken part leaves the rotation. | 50% faster | Generator (implant): when the part you aim at is out of reach, your command hits the next part at full. UPS (shell): for the first 3 cycles of a fight, hits on you deal 20% less. |

**NULL CHOIR (rhythm and mockery)**

| Boss | Floor | Where | Rules | Signature | Phases | Loot |
|---|---:|---|---|---|---|---|
| SHOULDER SURFER | 18 | Lair, floor 3 | Surge, Sync lock (the Logger), Keystroke dump, Veil, Overcharge (as Keystorm), Persistence, Re-key | **Credential Replay.** Its Dump replays the last command you fired in a window, at its full direct hit, in place of a flat 18. | 50% re-arm | Privacy Screen (shell): out-of-sync commands log only every other time. Muscle Memory (script): after you fire in two Sync Windows in a row, the next cycle opens one for sure. |
| RING ZERO | 34 | Lair, floor 6 | Surge, Scramble, Mimic, Adaptive, Overcharge, Persistence, Re-key | **Kernel Hook.** At the start it hooks your key-2 skill. Fired at any part but the Hook, that skill feeds the Hook a ◆ instead of damage. The Hook is a bare part worth about two hits. | 50% re-arm | Ring Minus One (implant): your skills can't be hooked, taxed or knocked offline. Syscall Table (script): each different skill you land in a row adds +5% damage, up to +25%; repeating one resets it. |

**GLASSJAW (professional denial)**

| Boss | Floor | Where | Rules | Signature | Phases | Loot |
|---|---:|---|---|---|---|---|
| CENTRIFUGE | 14 | Throne of floor 2's Pits | Surge, Encrypt, SYN Flood on the Pulse Node, Full Disk, Double Extortion, Re-key | **Spin-up.** The Pulse Node's interval drops by one each time its Surge lands (4, 3, 2). Any delay or Throttle spins it back to 4. | 50% re-arm | Governor (proxy): an attack that lands within 2 cycles of its part's last one deals 25% less. Cascade Failure (exploit): when you delay or Throttle an attack, its part takes 20. |
| BYZANTINE | 26 | Throne of floor 4's Pits | Surge, Replicate, Stateless, Mass Mailer, Self-Update, Re-key (three Nodes) | **Byzantine Fault.** Every 4 cycles (two ahead) the three Nodes vote and the most damaged is restored to the average of the three. Spread your damage, then burst. | 50% re-arm | Majority Attack (exploit): +8% damage for each part below half, up to +32%. Quorum Sensor (proxy): when two attacks land on the same cycle, the second deals 30% less. |
| GOLDEN PARACHUTE | 38 | Lair, floor 7 | Surge, Encrypt, Exfiltrate, ACL, Cycle tax, Full Disk, Double Extortion, Re-key | **Severance.** When a part breaks, every surviving part gains a ◆ and its next attack (two or more cycles away) becomes a charge. | 60% re-arm | Its three are built and drop from the Sink's lair boss until it exists (GAME_RULES *Items*). |

**ACTUARY**

| Boss | Floor | Where | Rules | Signature | Phases | Loot |
|---|---:|---|---|---|---|---|
| UNDERWRITER | 40 | The Core of ACTUARY's hub server on floor 5, sealed until 40 | A three-part construct: Surge, Encrypt, Replicate, Scramble, Veil, Rate cap, Full Disk, Self-Update, Re-key | **Risk Model.** A premium meter on its bar: each tell that lands on you raises it, each read lowers it. At 60% and 30% it buys a phase sized by the premium: a re-arm when low, a re-arm and faster when high. | 60% and 30% Risk Model | Moral Hazard (exploit): +3% damage for each tell that landed on you this fight, up to +30%. Reinsurance (proxy): the first time each fight a hit takes more than 30% of your max, the excess comes back as a shield over 2 cycles. |

**The native bosses' own loot**, once lairs move by floor. Each of the nine built native bosses gets two uniques of
its own; a lair boss still rolls the network's natives at the elite rate.

| Boss | Its two uniques |
|---|---|
| DEADBOLT | Bump Key (script, 8): when a lock breaks, the part behind it is Open for 2 cycles. Deadlatch (proxy, 8): once a fight, below half, you gain a lock of 15% of your max that comes back once, 4 cycles after it breaks. |
| BACK ORIFICE | Port Knock (exploit, 8): your first hit on each part with no attack of its own crits. Firewall Rule (proxy, 8): fragments can't gnaw on the cycle they hatch, and command bonuses don't apply to bites on you. |
| PATCH TUESDAY | Out-of-Band (script, 9): a heal the virus casts on a part you hit this cycle heals half. Change Freeze (shell, 9): when a virus part heals, you heal 3. |
| SLEEPWALKER | Night Light (shell, 10; the name is taken by a Nightshift piece): veiled and dormant timers show for you. Snooze (script, 10): the first attack of each fight lands a cycle later. |
| MIRRORSHADE | Silvering (exploit, 12): +50% damage on a part that copied something. Smoke Pane (proxy, 12): on a cycle you hold or fire a quiet command, hits on you deal 20% less. |
| HASHLORD | Proof of Work (shell, 16): Clock Speed fills twice as fast while anything slows your cooldowns. Orphan Block (exploit, 16): when a part you're hitting heals or grows, your next hit on it adds that amount, up to 40. |
| FLOODWALL | Sandbag (proxy, 16): ramping damage grows half as fast on you. Backflow (exploit, 16): when an attack hits you for less than its last landing, its part takes three times the difference. |
| ECHOLALIA | Noise Gate (proxy, 18): echoes and repeats on you deal 50% less. Call and Response (exploit, 18): when an echo hits you, your next hit on its source deals that much more. |
| TRIPMINE | Quiet Hours (proxy, 20): a part that goes loud calms down after 4 cycles. Sapper Kit (exploit, 20): when you break a part with a death trigger (Tripwire, Zip Bomb, Twin), the trigger fires on the virus's next part instead of on you. |

## 9.2 The Tollbooth set (TOLLGATE, 8–12)

| Pieces and where they drop | 2 pieces | 3 pieces |
|---|---|---|
| Crowbar (exploit, REPO MAN), Ledger (script, DEADBOLT), Meter (shell, SHAKEDOWN) | Encryption ticking on you also ticks the Encryptor for the same amount. | When you break a Lockbox, Mutex or Tripwire you take its rule for 3 cycles: a ward on you (no hit takes more than 25% of your max), a lock of 15% of your max, or a quiet virus (its parts deal 25% less for the fight). |
