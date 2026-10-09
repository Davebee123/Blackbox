# World: a room between breaches, and a network that moves

This began as a design for review. Its first slice, W0 (the room with wick and the board, the world turn with dig in, dead drops from leads), is built now: section 9 says what shipped. It adds a world around the breach campaign (docs/roguelite.md 9.3, GAME_RULES.md *Breach campaign*) without adding free roam or a separate consequences system.

**Approved (designer: "Seems solid to me for now").** Every recommendation in the open questions stands. Build W0 after roguelite phase 3 merges.

The designer's brief, in their words:

> "I still kinda want there to feel like a world, not just invading these servers. Sorta a mix between the two."

They picked two layers. The first is **a hub between runs**, a place you come back to after each breach: LOWLIGHT, Halcyon, a broker and faction standing, with people who react to your runs, so story comes from people too. The second is **a living network**: rival authors act between breaches (claim, harden, retake), and map events turn up (dead drops, leaks, rival crews, roaming hunters). It moves **per breach, not in real time**. Free roam and a separate "visible consequences" system were not picked, so every consequence lives inside these two.

## 0. The short version

| Question | Answer in this design |
|---|---|
| What is "a world" here? | People who notice what you did, and authors who answer it. Both show up on the screens you already use: a room after each breach, and marks on the campaign map. |
| The hub? | **LOWLIGHT's back room.** It opens after every breach. Four things are in it: **wick** (one line about your breach, and a **lead** that puts a map event on the map), the **Claims desk** (Halcyon's terminal: one **contract**, a bounty with a stake), **the fence** (one trade a visit into your draft pool, with shelves opened by standing), and **the board** (faction standing, and what moved on the network). |
| The living network? | A **world turn** runs once after each finished breach. The author whose server you took **answers**: it digs in on its nearest open server, or claims one if it has none. Up to one **map event** appears: a dead drop, a leak, a rival crew, Kestrel's hunter or (late) a handover. Each one is resolved inside a breach as a node or a card modifier. |
| What never happens? | Retakes. A captured server stays captured, and its outputs keep running. Nothing ticks in real time, nothing grows while you're away, and pressure never makes the only way forward harder. |
| ACTUARY? | It arrives with HASHLORD-RIG's capture (its invoice names ACTUARY). It writes CLAIMS-21's viruses and reprices its six-gene portfolio against the cards you draft, one gene a turn, with a notice a turn ahead. |
| Loot? | No new faucets. The world pays in pool cards, pity steps toward uniques ("claims"), standing, fragments and ways to fight. It never pays gear. Bounties stop paying a yellow protocol (open question 4). |
| First build? | The room with wick and the board, the world turn with *dig in* only, and dead drops placed by wick's leads (section 7). |

## 1. Goal and principles

A world here means two things. **People remember.** The people in the room talk about the breach you just played: the Resident you beat, the Beacon you let land, the cron you left stock. **The net answers.** The crews you hit push back where you hit them, and what they do shows up on the map as a fight you can choose.

How it stays lean:

1. **Every piece changes what you fight, how you fight, or what you can get.** Section 5 lists each one against that test. A piece that only adds flavour is a line of text on a piece that passes, never a system of its own.
2. **Per breach, never per minute.** The world turn runs when a breach ends. A week away changes nothing, and no event is lost by being away.
3. **Pressure is a choice.** An author's move makes one server harder and pays for it. There is always an open server with no pressure on it. Losses don't move the world against you.
4. **Show, don't tell.** People say one line each, about something you did. Nobody explains a mechanic or a fragment. The map shows a mark, and the card says what it does in one sentence.
5. **Bosses stay predictable.** No world move touches a Resident or a gate's fixed tells. Moves change wild viruses and elites, and add nodes.
6. **Hackers author viruses.** Every move is an author acting on its own turf, with its own genes. Only ACTUARY adapts to you.
7. **Uniques are the chase.** The world can move you toward a unique (a pity step). It never hands out more drops.

## 2. The hub: LOWLIGHT's back room

### 2.1 Where it is

The room is a fixed marker on the campaign map, above layer 1, linked to SPRAWL-00 and drawn in teal like your servers: *LOWLIGHT · back room*. It is never breached, and you never travel to it. It is where you are between breaches. After any breach ends, the end card's **Back to the map** becomes **Back to the room**, and the room opens. A **Room** tab joins Campaign, Loadout, Archive and System, so you can go back to it at any time.

### 2.2 What's in it

Four things and no more. Each has a voice from the old game (docs/style-guide.md 3: wick writes lower case and short, Claims writes formal and dry, GLASSJAW is terse).

| Who | Voice | What it does | The test it passes |
|---|---|---|---|
| **wick** (LOWLIGHT) | `wick` | One line about your last breach. Then **a lead**, when there is one: a line that names a server, after which the event is on the map. Leads are the only source of dead drops, and they can bring the leak or the crew sooner. | What you can get (drops), what you fight (where the events are) |
| **The Claims desk** (Halcyon) | `claims@halcyon` | One **contract** on offer at a time: a bounty with a stake on one open server, often a server the world turn just touched. Signing it costs Halcyon standing (the premium). If you meet it, it pays the premium back with more, plus a **claim**: one pity step toward that Resident's unique. If you miss it, the premium is gone. You can ignore it for free. | What you can get (a pity step), how you fight (the condition) |
| **The fence** | `—@glassjaw` | Three pool cards from the shelves of the factions you've met. **One trade a visit**: take a card into your draft pool and put one of yours out (your pool never drops below 5). The first card after each rank-up is free, with no swap. The fence sells no gear. | What you can get (the draft pool) |
| **The board** | Each faction's own voice | Your **standing** with the five factions, and what each rank opens. Up to three lines about what moved on the network this turn, each linking to the server on the map. Optional handovers are confirmed here. | What you can get (stalls, shelves, services), what you fight (the news points at it) |

### 2.3 Standing

Standing replaces the old rep and Halcyon's standing (factions.mjs: tiers, allies and rivals as they are). Each faction keeps 0 to 12 points, and every 3 points is a rank from 0 to 4, using that faction's own tier names (Kestrel: Blacklisted, Prospect, Client, Account, Key account). Halcyon starts at 4 points, and Kestrel and GLASSJAW at 3, so all three are at rank 1. LANTERN and NULL CHOIR start at 0, and you meet them through the world (a leak, a rival crew).

| Earned by | Points |
|---|---|
| A bounty met on a card | +2 with its poster |
| A contract met | +3 Halcyon, and the premium back |
| Clearing a claim (capturing a claimed server) | +2 with the claimer's rival faction |
| Beating a rival crew to its prize | +2 with the crew's rival faction |
| Beating Kestrel's hunter | +2 Kestrel |
| The ripple | When you gain with a faction, each of its rivals loses 1 (factions.mjs RIPPLE, halved). Allies don't move. Points never go below 0 and never decay. |

The rival faction of an author: TOLLGATE, SWARMLINE, PALEMASK and GLASSJAW hit Halcyon's clients, so beating them pleases **Halcyon**. NULL CHOIR's rival is **Kestrel**, LANTERN's is **GLASSJAW** and Kestrel's is **NULL CHOIR**.

| Rank | Opens |
|---|---|
| 1 | That faction's broker stall can turn up on breach maps (today only GLASSJAW, Halcyon and Kestrel stalls exist, and LANTERN and NULL CHOIR join them), and its shelf at the fence. |
| 2 | Its stall offers 4 cards, not 3, and its bounties come up twice as often on cards. |
| 3 | Its shelf carries its rare cards. |
| 4 | Its stall always offers its service (roguelite 2.5): GLASSJAW removes a mod, LANTERN shows the whole act, Kestrel sells a gate pass, NULL CHOIR recompiles a mod to +, and Halcyon rerolls a draft. |

Shelves draw from CVEs and mods not yet in your pool, by faction lean: GLASSJAW tempo (Slowloris, Conficker, Code Red), Kestrel defence (Stuxnet, BlueKeep, Shellshock), LANTERN recon (Ghostcat, WannaCry, POODLE), NULL CHOIR rhythm (Ripple20, Meltdown, Morris) and Halcyon recovery (Sasser, Zerologon, NotPetya). Phase 3's breadth (about 50 mods and 20 or more CVEs) fills them out.

### 2.4 How people react

When a breach ends, the campaign keeps its **debrief**: a short list of facts. Each person picks the most important fact it has a line for, and never repeats a line until its set for that fact runs out. If nothing fits, the person says nothing. A blank is better than filler.

| Priority | Fact | Example lines |
|---|---|---|
| 1 | First fall of a Resident | wick: *"vault warden's down. read the spool twice."* Claims: *"COLDSTORE-3 has been removed from our book, effective immediately."* |
| 2 | A world event resolved (crew, hunter, drop, leak) | wick: *"swarmline got to the gate second. they'll remember the handle."* Kestrel, on the board: *"Ticket #3301: asset TRACER-7 unresponsive. Escalating."* |
| 3 | A contract or bounty, met or missed | Claims: *"Contract lapsed. Your premium is retained."* GLASSJAW: *"No rest stops. Paid."* |
| 4 | A loss, by where it ended | wick: *"gate 1 holds. it'll keep."* After three in a row: *"depot will wait. the others won't mind you."* |
| 5 | Something you chose in the run | wick, on a Beacon you let land: *"you let it call home and fought both of them."* On a subsystem left stock: *"cron's still stock on pier-5."* |
| 6 | A rewrite, the first time you take it | wick, on Spam Cannon: *"loud mail. meridian's going to read every one."* |
| 7 | Heat, once heat ships | Claims: *"Your risk profile has been updated."* |

Lines are data (`dist/content/room.mjs`, editor-friendly like story.mjs), keyed by person, fact and, where it matters, server or author. About 120 lines cover the first build.

### 2.5 How story is delivered

- **`core.dump` stays the spine.** The 14 fragments, in story order, are where the plot lives. People never summarise them.
- **People follow the Archive.** A line about a fragment only exists once you've read it. wick's lines darken as the LOWLIGHT thread moves along. The Claims desk gets drier as the Halcyon thread does.
- **The room changes.** One sentence at the top describes the room, and it changes at story beats. After MIRROR-HALL-12's fragment (*"that isn't the same as trusting them"*), it reads: *The Claims terminal sits on the floor now. It's still on.* After the ACTUARY beat, contracts arrive signed `ACTUARY/1.4`, and nothing in the room explains why.
- **Two new fragment sources, both from the world.** Dead drops carry a LOWLIGHT side thread (4 fragments, wick's notes to you), and Kestrel's hunter carries an incident thread (3 fragments). Both are seeded in story order and found once, like the rest (roguelite 6.6).
- **No mail and no letters.** Nobody writes more than two lines in a visit.

### 2.6 The screen

One page. No windows and no menus.

```
LOWLIGHT · back room                           after REPO-DEPOT-7 · lost at gate 2
The radiator knocks. Someone left the Claims terminal logged in.

┌ wick ─────────────────────────┐ ┌ claims@halcyon ──────────────────────┐
│ gate 1 holds. it'll keep.     │ │ Contract lapsed. Premium retained.   │
│ lantern says depot's keys are │ │ CHAPEL-0 · Capture it without        │
│ floating around.   [ on map ] │ │ resting at a defrag.                 │
└───────────────────────────────┘ │ Premium 1 · Pays 4 and a claim on    │
┌ —@glassjaw ───────────────────┐ │ HOLLOW CHOIR.               [ Sign ] │
│ Slowloris · Stuxnet · Ghostcat│ └──────────────────────────────────────┘
│ One trade.        [ Trade… ]  │ ┌ board ───────────────────────────────┐
└───────────────────────────────┘ │ Halcyon ■□□□  Kestrel ■□□□           │
                                  │ GLASSJAW ■□□□  LANTERN ■□□□  NC □□□□ │
                                  │ · Leaked keys on REPO-DEPOT-7.       │
                                  └──────────────────────────────────────┘
                                                                   [ Map ]
```

On a phone the panels stack in the same order. Hover a rank square to see what it opens. The room is the only page with standing on it, and the map doesn't repeat it.

### 2.7 Example: three visits

You're a level 8 Breaker holding SPRAWL-00 and VANTA-RELAY-07.

**After capturing COLDSTORE-3**, with Kestrel's *clean* bounty met and Restore Point taken at backup. wick: *"vault warden's down. read the spool twice."* The Claims desk: *"COLDSTORE-3 has been removed from our book, effective immediately."* (Its fragment said the server was one of their best lines.) The board: Kestrel goes to 5 points, one short of Client, where its stalls sell a fourth card. NULL CHOIR, its rival, stays at 0. The news: *TOLLGATE dug in at REPO-DEPOT-7. Every elite and gate carries Ward.* The Claims desk offers its contract on that server, the insured client: *Clear an elite without ending a fight under half Signal.* You sign it, and the premium takes Halcyon from 4 points to 3. wick has a lead: *"somebody left you something on vanta. sshd side."* A dead drop is now on VANTA-RELAY-07, a server you hold, so a re-image there is worth a run.

**After losing at REPO-DEPOT-7**, at gate 2, against REPO MAN, with the contract signed. wick: *"gate 1 holds. it'll keep."* The Claims desk: *"Contract lapsed. Your premium is retained."* The premium is gone, and Halcyon stays at 3. No author moves, because the world doesn't push after a loss. The event roll lands on a lead, and wick says: *"lantern says depot's keys are floating around."* REPO-DEPOT-7 now carries **Leaked keys**: REPO MAN starts with 1 ◆ less on every part, and its tells come a cycle sooner. You met LANTERN through the leak, so it goes to rank 1, and its shelf opens at the fence. You trade Mirai out and take Ghostcat in.

**After capturing PIER-5**, with Halcyon's *elite* bounty met, after racing a SWARMLINE crew to the act 1 gate and letting a Beacon land in act 2. wick: *"swarmline got to the gate second. they'll remember the handle."* The board: Halcyon gets 2 points for the bounty and 2 for beating the crew, which takes it to 7 and Contractor. GLASSJAW and NULL CHOIR, its rivals, lose 1 each. The news: *SWARMLINE has no open server left, so it claims MERIDIAN-MX-14's Perimeter* (still unknown, but its mark shows on the card). The Claims desk's new contract: *CHAPEL-0. Capture it without letting a Mimic beat land. Pays 4 and a claim on HOLLOW CHOIR.* The fence: a free card for Halcyon's rank-up, so you take Zerologon from its shelf and put nothing out.

Each visit changed something you'll fight (a hardened depot, a leak, a claim), something you can get (a pool card, a claim) or where you'll go next.

## 3. The living network

### 3.1 The world turn

`worldTurn` runs once when a breach ends: won, lost or jacked out. It runs after the breach's record and before the room opens, so the room can talk about it. It never runs for the SPRAWL-00 tutorial, and it doesn't run before your second capture (wick's first lead, *"the others noticed you"*, starts it). It is seeded by the campaign seed and the turn number, so the same choices always make the same world.

Steps, in order:

1. **Clear.** Events you resolved go. Moves on a server you captured go.
2. **Age.** Each open opportunity loses a pip, and one at 0 goes (section 3.3).
3. **The answer.** At most one author move (3.2).
4. **The hunter steps** to its next server, if one is out.
5. **ACTUARY reprices**, once it's out (3.5).
6. **The event roll.** At most one new event (3.3).
7. **Faction reactions.** These are derived and not stored: contracts and bounties aimed at the servers that moved (section 4).
8. **News.** One to three lines go to the board.

### 3.2 What authors do

Each author has a **sector**, its turf: the servers whose card names it (campaign.mjs `SERVERS[].author`). It also has a **portfolio**: the genes it writes with (authors.mjs signature and toolkit, fixed for everyone but ACTUARY). Authors move only to **answer you**, and only the author you hit, so a move is always something you caused and can read.

| Move | When | What it does | Shown | Pays | Cleared by |
|---|---|---|---|---|---|
| **Dig in** | You captured a server of author X, and X has an open server you don't hold | X's nearest open server gets one of X's signature genes on every elite and on both gates, as an extra mutation within the budget rules. Wild viruses don't change. | A `dug in` chip and the gene's chip (its name if decoded, otherwise its category). Card: *TOLLGATE dug in. Every elite and gate carries Ward.* | Like a heat rank: drops are 1 item level higher, and the Resident's unique roll gets +10% on the capture | Capturing it |
| **Claim** | Same, but X has no open server left, or its nearest one already carries a move | X claims the nearest open or unknown server of another author, taking an unknown one first when an open one would break the clean-server rule. That server's act 1 wild viruses are X's (X's genes and tells, X's byline). The Resident, the gates and acts 2 and 3 don't change. | X's mark on the node, even on an *unknown* card. Card: *SWARMLINE claims the Perimeter.* | +2 standing with X's rival faction when you capture it, and act 1's implicits come from X's genes | Capturing it (a loss leaves it) |
| **Retake** | **Never** | | | | |

**Why no retakes.** Losing a capture takes away outputs, and that feels bad. Defending captures is the counter-breach that was cut (roguelite 3.3). *Dig in* gives the same story beat, "they fight back", on the front line, where you choose whether to take it on. A captured server is never touched.

Rules on pressure, which the bot checks (6.4):

- One move per server, never stacked, never growing over time.
- Never on a server you hold, on SPRAWL-00, on a server with a checkpoint, or on the server you just lost on.
- At most 2 servers under pressure at once.
- **There is always an open server with no pressure on it.** If a move would break that, it waits, and the board says *TOLLGATE is watching MERIDIAN-MX-14*.
- After a loss or a jack-out, no author moves.

### 3.3 Map events

| Event | Comes from | On the map | Resolved as | Pays | Lasts |
|---|---|---|---|---|---|
| **Dead drop** | wick's leads only | `drop` on a server, held ones too | A `drop/` cache node in act 1, rows 2 or 3, of your next breach there. You `cat` it and `pull` it. | A pool card, or the next dead-drop fragment (2.5) | 3 breaches |
| **Leak** | LANTERN, or a lead | `leak` | A card modifier on your next breach there. **Leaked keys:** the Resident starts with 1 ◆ less on every part, and its tells come a cycle sooner. **Leaked map:** act 1 is fully visible, and its terminal nodes show their events. | How you fight. The first leak takes LANTERN to rank 1. | 3 breaches, or until used |
| **Rival crew** | An author whose server you took, as well as its move, or GLASSJAW or NULL CHOIR | `crew` and the crew's mark. Card: *A SWARMLINE crew is inside, after Slowloris.* | A race in act 1. Their marker starts two rows ahead on a lane you can see. It moves a row each time you move, and spends an extra move on each fight node. Nodes it passes are emptied, with no draft and no rewrite, as Beacon does. The prize waits at the act 1 gate. Reach the gate first, or step onto their node to fight their runner (an elite of their author), and the prize is yours. If they get there first, they take it and leave. | The prize: a pool card or a claim, plus 2 standing with the crew's rival faction | 3 breaches |
| **Hunter** | Kestrel, from layer 2 | `hunter`, with an arrow to its next server | A hunter node (Tracer ICE, fixed tells) in act 1, or act 2 on longer breaches. Each time you move, it steps one node toward you along the edges, so you can slip past it by lane. | The next Kestrel incident fragment, and +2 Kestrel. Once that thread is done, a CVE pick of 3 for the breach. | It moves one link each turn along servers you don't hold, waiting where the next one already has an event. After you beat it, it's gone for 3 turns. |
| **Handover** (late) | Genome 6, option B: you hold every server of an author in a layer | `handover` on those held servers. The board offers it: *Let PALEMASK into SWARMLINE's old turf?* | You confirm or decline on the board. Once confirmed, re-images of those servers roll the incoming author's wild viruses and elites. Residents don't change. | New genes and implicits to farm on servers you already hold | Until you answer |

**Caps.** At most one new event a turn, and the roll succeeds about half the time (a lead always succeeds). At most 3 events on the map, at most one of each kind, and at most one event per server. No events in layer 1 except dead drops. That works out to about one new thing on the map every two breaches, and never a crowd.

**Shelf life.** Opportunities (drop, leak, crew) last 3 breaches, shown as three pips on the card. Pressure (dig in, claim) has no shelf life, but it never grows. Being away costs nothing, because time only passes when you breach.

### 3.4 How it's shown

- **The map node** carries at most two chips: one move and one event. They're coloured by author, or by the faction for the hunter, and use docs/ui.md tokens.
- **The card** gets a *World* row: one plain sentence per item, with its pips.
- **On the breach map**, a world node uses the existing marks, plus `D` for a drop, `r` for the crew and `H` for the hunter. The column beside the map gives it a card like any node.
- **The board** carries the turn's news. A line links to the server.

### 3.5 ACTUARY

ACTUARY is genome 4.4, moved onto the campaign and onto drafts, as roguelite 6.4 already decided.

| Rule | Detail |
|---|---|
| When | When you first capture HASHLORD-RIG. Its `core.dump` is the invoice made out to ACTUARY. The campaign tops out at 25, so this replaces genome's level 26 beat. |
| Its sector | CLAIMS-21 changes byline to ACTUARY. ECHOLALIA stays its Resident, because bosses stay fixed. ACTUARY can also claim up to 2 Deep Core servers, following the claim rule. |
| Its portfolio | Six genes, shown on its servers' cards. Its wild viruses and elites roll from them. |
| Repricing | Each world turn after a breach where you drafted, it tallies your drafts by lean. One turn ahead, the board posts its notice. The next turn, it swaps one gene out and one in. |
| Notice | In the Claims desk's voice, signed `ACTUARY/1.4`: *Strip-assisted claims are up 40%. Under review: Veil. Proposed: Adaptive.* Nothing changes without a notice. |
| Bounds | At most one gene out and one in a turn, inside the compatibility rules, and never below one gene per axis it started with. |
| Steering | You can see what it will bring. Drafting into one lean tells it what to counter next. |
| Its boss | The UNDERWRITER on KESTREL-DC-3, the same fight every time. |

| You draft a lot of | For example | It brings | Why |
|---|---|---|---|
| Strip | Aftershock, Fragmentation, BlueKeep | Adaptive | Chains of hits build armor |
| Burst and crits | EternalBlue, Overcommit, Meltdown | Mutex lock | A lock doesn't care how hard you hit |
| Tempo and delays | Slowloris, Shellshock, SYN Cookie | Hasty | Delays buy less against a fast clock |
| Helpers | Mirai, Daemonize, Zombie Swarm | Armored | Many small hits break one ◆ each |
| Burns | Viral Load, Persistence, Long Poll | Antivirus Sweep (phase 3 gene) | The burns get wiped |
| Heals | Heartbleed, Sasser, Parity Bit | Bad Sectors (phase 3 gene) | Your heals get eaten |

### 3.6 Example: five world turns

You start at level 8, holding SPRAWL-00 and VANTA-RELAY-07. COLDSTORE-3 and PIER-5 are open, and REPO-DEPOT-7 is unknown.

| Turn | The breach | The answer | The event roll | The map after |
|---|---|---|---|---|
| 1 | Capture COLDSTORE-3 (TOLLGATE) | TOLLGATE digs in at REPO-DEPOT-7, which just opened: Ward on every elite and gate | A lead from wick: a dead drop on VANTA-RELAY-07 | Depot `dug in`. PIER-5 is clean. Vanta `drop` ●●● |
| 2 | Capture PIER-5 (SWARMLINE) | SWARMLINE has no open server. Claiming CHAPEL-0 would leave no clean open server, so it claims the unknown MERIDIAN-MX-14 instead, and its mark shows on the unknown card. | None (the roll fails) | Depot `dug in`, MERIDIAN claimed. CHAPEL-0 is clean. The vanta drop ●● |
| 3 | Lose at REPO-DEPOT-7, gate 2 | None, after a loss | A lead: **Leaked keys** on REPO-DEPOT-7. LANTERN goes to rank 1. | Depot `dug in` and `leak` ●●●. The vanta drop ● |
| 4 | Capture REPO-DEPOT-7 from the checkpoint, using the leak | TOLLGATE's nearest open server, MERIDIAN-MX-14, is already claimed. Claiming CHAPEL-0 would leave no clean open server, so TOLLGATE waits. Board: *TOLLGATE is watching CHAPEL-0.* | A rival crew: GLASSJAW, inside MERIDIAN-MX-14, after Code Red. The vanta drop expires unused. | MERIDIAN claimed, with a `crew` ●●●. CHAPEL-0 is clean. |
| 5 | Capture MERIDIAN-MX-14. You beat the crew to the act 1 gate (Code Red joins your pool) and clear the claim. Halcyon gets +4, and GLASSJAW and NULL CHOIR get −2 each from the ripple. | TOLLGATE answers again and digs in at TRIPMINE-YARD, now open: Mutex lock. Its watch on CHAPEL-0 is dropped. | Kestrel's hunter appears on CHAPEL-0, heading for MIRROR-HALL-12 | TRIPMINE `dug in`. CHAPEL-0 has the `hunter`, which is an event, not pressure, so it's still the clean server. |

Across five breaches the map gained three moves (two digs, one claim), one watch and four events. There was always a clean way forward: PIER-5 on turn 1, and CHAPEL-0 after that. Every move came from a server you took, and the one loss moved nothing but a helpful leak.

## 4. How the two connect

| On the network | In the room |
|---|---|
| An author digs in | Halcyon's next contract goes on that server (*an insured client*), with a condition aimed at the gene (*capture it without breaking a Ward last*). |
| An author claims a server | The claimer's rival faction posts a bounty on it: *Capture it and clear SWARMLINE's claim.* |
| A rival crew appears | The crew's rival faction comments on the board, and wick names the prize. |
| The hunter moves | Kestrel's helpdesk posts its ticket on the board. Beating the hunter closes the ticket. |
| ACTUARY reprices | The notice comes from the Claims desk, signed `ACTUARY/1.4`. |
| A handover is ready | The board offers it, in the incoming author's colour. |
| wick's lead | It is the event. Dead drops only exist through leads. |
| Standing | It decides which stalls you meet in breaches, which shelves the fence carries, and how often each faction's bounties come up on the cards you choose from. |

The loop: you breach, the author answers, the room reads both, and its offers point you at what moved. Your next pick on the map is shaped by people as well as by outputs.

## 5. What it replaces and reuses

| Old system | Old game | Here | Why |
|---|---|---|---|
| Faction rep, tiers, allies and rivals, ripples | factions.mjs | **Keep**, as standing points and ranks (2.3) | Cheap, and it makes picking a bounty a choice |
| Hubs as places, hub sessions and voices | hubs.mjs, view.mjs `VOICE` | **Fold**: one room, with the voices kept for the board and the fence | One place, not five |
| Markets, wares, transfers, market events | market.mjs | **Stays cut** | Trading changes no fight |
| Hub capture, payloads, swarms on hubs, donations | payload.mjs, fleet.mjs | **Stays cut** | Timers, and a counter-breach in disguise |
| Halcyon standing, the retainer, Indemnity | mail.mjs | **Fold** into Halcyon's standing. The retainer and Indemnity stay cut. | No real-time income |
| The contract board, side contracts, hand-ins | mail.mjs | **Fold**: one Halcyon contract at a time, staked, with no timers | Contracts became bounties, and this is the one with stakes |
| Mail and story letters | mail.mjs, content/story.mjs | **Stays cut**. Voices survive as one-liners. | Story comes from `core.dump` and people |
| The Halcyon store, faction shops, agency stock | store.mjs | **Fold**: the fence's shelves, pool cards only | No gear faucet |
| The event director, darknet listings | events.mjs | **Fold**: map events. Darknet listings stay cut. | A listing is a unique faucet |
| Leads, tracing, relays, the hidden network | hidden.mjs | **Stays cut**. wick's leads are lines, not percentages. | Captures reveal neighbours |
| Invasions, the wall, home defence | invasion.mjs | **Stays cut**. Authors never retake. | Designer: no counter-breach |
| The hunter, Trace | run.mjs | **Fold**: Kestrel's roaming hunter as a map event | A fight you choose, with story on it |
| Sector handovers, reflash | genome 6 | **Keep**: handover as a late event. Reflash later. | Finished turf gets new genes, by your choice |
| ACTUARY | genome 4.4 | **Keep**, on drafts and on the campaign map | The one adaptive author |
| The pager and comms | comms.mjs | **Fold**: the board's news | Between-breach news only (roguelite 7) |
| Presence, consortium, crew | | **Parked** | Co-op later |

Also not added: free roam, a separate "consequences" system, real-time timers, new currencies, and gear from the world.

## 6. Data and code plan

### 6.1 Modules

| File | New or changed | What |
|---|---|---|
| `dist/world.mjs` | New | `worldTurn(camp, debrief, rng)`: author answers, events, hunter steps, ACTUARY, news. `modsFor(camp, id)`: what a server's breach carries from the world. Pure: state in, events out, no clock. |
| `dist/room.mjs` | New | Standing (points, ranks, ripple), `debriefOf(b, report)`, line picking, leads, the contract (offer, sign, settle), the fence (stock, trade). |
| `dist/content/room.mjs` | New | Lines and room sentences as data, editable in editor.html like story.mjs |
| `dist/room-view.mjs`, `dist/room.css` | New | The room page (2.6) |
| `dist/campaign.mjs` | Changed | Save v2 and its migration. `launch` passes `modsFor` into `cardFor`. `breachHooks.over` runs `debriefOf` and then `worldTurn`. Bounties pay standing points. The room marker joins the map. |
| `dist/breach.mjs` | Changed | `card.world`: extra genes on elites and gates (dig in), act 1 author (claim), extra nodes (drop, crew lane, hunter), and leak flags. The crew's and the hunter's steps on each move. `stats` gains `beacons`, `stock` and per-kind `landed`. |
| `dist/campaign-view.mjs` | Changed | Node chips, the card's *World* row, the room marker, the Room tab |
| `campaignsim.mjs` | Changed | `--world on/off`. The bot follows leads, signs contracts when its win odds are high, trades at the fence, and skips pressured servers half the time. |

### 6.2 State inside `blackbox-campaign-v1`

`s.camp.v` goes from 1 to 2. Migration adds the fields below with their defaults and touches nothing else. The world starts at turn 0, quiet, and the first lead comes on the next breach.

```js
s.camp = {
  ...v1,                       // seed, servers, archive, pool, lastMods, breaches, history
  v: 2,
  standing: { halcyon: 7, kestrel: 5, glassjaw: 1, lantern: 3, nullchoir: 0 },  // points 0–12, rank = floor(p / 3)
  world: {
    turn: 5,
    moves: { 'mirror-12': { kind: 'digin', author: 'nullchoir', gene: 'mimic', turn: 5 } },
    watch: { 'meridian-14': 'tollgate' },                      // a move waiting on the clean-server rule
    events: [
      { id: 'w4', kind: 'crew', at: 'meridian-14', author: 'glassjaw', prize: { pool: 'codered' }, pips: 2 },
      { id: 'w5', kind: 'hunter', at: 'tripmine-yard', next: 'hashlord-rig' },
    ],
    hunter: { beaten: 0, back: 0 },                            // fragments taken, turns until it returns
    actuary: null,                                             // or { portfolio: [6 genes], tally: { strip: 4 }, review: { out, in, turn } }
    handovers: {},                                             // { 'swarmline@1': 'offered' | 'palemask' | 'declined' }
    news: [{ turn: 5, text: 'NULL CHOIR dug in at MIRROR-HALL-12.', at: 'mirror-12' }],  // last 6
  },
  room: {
    debrief: { result: 'won', id: 'chapel-0', first: true, events: ['claim'], beacons: 0, stock: ['kmod'], bounty: null, contract: 'met' },
    seen: ['wick.first.chapel-0'],                             // line ids already said
    lead: null,                                                // or { event: 'w6' } until the room shows it
    contract: { at: 'meridian-14', cond: 'noransom', premium: 1, pay: 4, claim: 'nb-deadbolt', signed: false },
    traded: 5,                                                 // the turn of the last fence trade
  },
  claims: { 'nb-deadbolt': 1 },                                // pity steps from contracts and prizes, at most 2 a Resident
};
```

### 6.3 The world turn

```js
// world.mjs — one turn, after one breach. Returns { news } and mutates camp.world only.
export function worldTurn(camp, d, rng) {
  const w = camp.world; w.turn++;
  clearResolved(w, d); ageOpportunities(w);
  if (d.result === 'won' && !d.reimage) answer(camp, SERVER[d.id].author, rng);   // dig in, claim, or watch
  stepHunter(camp, rng);
  if (w.actuary) reprice(w.actuary, d.drafts);
  rollEvent(camp, d, rng);                                                        // ≤1 new, caps, a lead forces it
  return { news: w.news.filter((n) => n.turn === w.turn) };
}
```

`modsFor(camp, id)` turns moves and events into `card.world` when you breach. Nothing in the world is read anywhere else, so turning it off (`WORLD.on = false`) leaves today's campaign exactly as it is.

### 6.4 Bot and pacing checks

`node campaignsim.mjs 90 3 --world on`, against `--world off`:

| Check | Bound |
|---|---|
| New events a turn | Mean 0.4 to 0.7, never more than 1 |
| Live events | Never more than 3, and one per server |
| Pressured servers | Never more than 2, and every turn has an open server with no pressure on it (100%) |
| Win rate on pressured breaches | Within 10 points of unpressured ones at the same level band |
| Breaches to levels 10 and 20 | Within 10% of world off. `campaign.test.mjs`'s 26 breaches to level 10 still holds. |
| After a loss | No author move, ever |
| ACTUARY | At most 1 swap a turn, always noticed a turn ahead, never below one gene per starting axis |
| Standing | Every faction reaches rank 2 by layer 3 in the bot's typical play, and none needs grinding |

### 6.5 Tests

- `world.test.mjs`. Determinism: the same seed and the same debriefs give the same world. All the caps and the pressure rules in 3.2. Never on held servers, SPRAWL-00, checkpoints or the server just lost. No change without a breach (save and load 100 times, and the world is identical). The v1 to v2 migration. `WORLD.on = false` gives today's cards byte for byte.
- `room.test.mjs`. Line picking by priority, with no repeats until a set runs out. Contract settlement (premium, pay, claim, the cap of 2). Ranks and the ripple. The fence never lets the pool drop below 5 and never offers gear.
- `breach.test.mjs` additions. The crew's lane, its race and a prize taken. The hunter's steps and a dodge. A dug-in elite carries its gene. Leaked keys on the Resident.

## 7. Phased build

| Phase | What ships | Done when |
|---|---|---|
| **W0. The room and one move** (the smallest playable slice) | The room page with wick, the board's news and the room sentence. `debriefOf`, and about 60 lines across priorities 1, 4, 5 and 6. The world turn with **dig in** and the pressure rules. **Dead drops** from wick's leads (pool cards only), and the first 2 dead-drop fragments. Save v2. No standing yet, so the board shows only news. | The designer plays ten breaches and can say who answered what. The bot checks in 6.4 for dig in and drops are green. |
| **W1. Standing, the fence and contracts** | Standing points and ranks, with bounties paying points instead of a yellow protocol. LANTERN and NULL CHOIR stalls. The fence's shelves and trades. The Claims desk's contract and claims. Lines for priorities 2 and 3. | Every faction's rank changes something in the bot's runs, and pick rates on shelf cards are between 5% and 40%. |
| **W2. Claims, leaks and crews** | Claims, with act 1 authors on a claimed server. Leaks. The rival crew's race on the breach map. | The race is won 40% to 70% of the time by a bot that reads the lanes, and almost never by one that doesn't. |
| **W3. The hunter** | Kestrel's roaming hunter and its 3 incident fragments. The board's tickets. | The hunter can be dodged on 3 of 4 seeded maps. |
| **W4. Movement** | ACTUARY on CLAIMS-21 and its repricing. Handovers. ACTUARY-signed contracts. The rest of the room sentences. | The ACTUARY checks in 6.4. A handover re-image rolls the new author's genes. |

## 8. Open questions

| # | Question | Options | Recommendation |
|---|---|---|---|
| 1 | Where does the room live? | A map node you click. A screen after every breach. A tab. | All three, lightly. It's a fixed marker on the map, it opens after every breach, and it has a Room tab. You never travel to it. |
| 2 | Retakes | Authors retake held servers. They contest them (outputs paused). Never. | **Never.** Authors dig in on the front line instead. Retaking would bring back the cut counter-breach. |
| 3 | How long opportunities last | Until resolved. 3 breaches. 5. | 3 breaches, for opportunities only, shown as pips. Pressure doesn't expire but never grows. Time only passes when you breach, so nothing is lost by being away. |
| 4 | Bounty pay | A yellow protocol (today). Standing points. Both. | **Standing points.** It cuts a gear faucet, in line with the loot cut, and it gives standing its main source. |
| 5 | The fence's currency | Trades (a pool swap). Leftover tokens carried out of a breach. Credits again. | **Trades.** No new currency, the pool stays a fixed size between rank-ups, and curating it is a decision. Carrying tokens out would make players hoard instead of using brokers. |
| 6 | Contract stakes | Standing only. Also lose a checkpoint. Also lose pity. | **Standing only** (the premium). A stake never touches captures, checkpoints, items or pity. |
| 7 | Contract pay | A claim (a pity step). A pool card. A guaranteed unique. | **A claim**: +10% on that Resident's unique roll, at most 2 a Resident. It moves the chase without adding drops. |
| 8 | Rival crews | A race inside the breach. A countdown on the map. | **Inside the breach**, in act 1 only. A map countdown is a clock. A lane you can read is a choice. |
| 9 | ACTUARY's arrival | HASHLORD-RIG's capture. CLAIMS-21's. Level 20. | **HASHLORD-RIG's capture**: its fragment already names ACTUARY, and it's the right depth for a late beat on a level 25 campaign. |
| 10 | Does the room move as you go deeper? | Fixed. It moves to your deepest layer. | **Fixed.** Its sentence changes with story beats, which is enough to show time passing. |
| 11 | How often events come | About 1 every breach. About 1 every 2. Rarer. | **About 1 every 2**, at most 3 on the map. Raise it if the network feels still in playtests. |
| 12 | Does a loss move the world? | Authors press after a loss. Nothing moves. Only helpful events. | **No author moves after a loss.** The event roll still runs, and it leans toward leads (a leak on the server you lost) so the world helps you back up. |
| 13 | Handovers | Opt-in on the board. Automatic once a turf is finished. Cut. | **Opt-in**, late (W4). This is genome option B, already approved. |

## 9. What shipped

**W0, the room and one move**, shipped as section 7 describes, on top of the breach rework that replaced drafting with keys, vaults, switches, Trace and scripts (roguelite.md 11). GAME_RULES.md and README.md, *The world: LOWLIGHT's room and the world turn*, describe it in full. Code: `dist/world.mjs`, `dist/room.mjs`, `dist/content/room.mjs`, `dist/room-view.mjs`, `dist/room.css`, with changes in `campaign.mjs`, `breach.mjs`, `breach-view.mjs`, `campaign-view.mjs`, `combat.mjs` and `app.js`. Tests: `world.test.mjs`, and the bot's campaigns in `campaign.test.mjs`.

Drafting is gone, so everything in this doc that pays or reads **pool cards and drafts** now means **scripts** (`dist/scripts.mjs`): a dead drop holds a script, the fence (W1) should sell scripts through `scriptStock`, `priceOf` and `giveScript` rather than swap pool cards, and ACTUARY's repricing (W4) will need something other than draft leans to read.

| Planned (W0) | Shipped |
|---|---|
| The room page with wick, the board's news and the room sentence | As 2.6, without the Claims desk and the fence. A teal marker above layer 1 linked to SPRAWL-00, a **Room** tab, and the end card's **Back to the room**. Three room sentences: before your first capture, after SPRAWL-00, and the doc's line after MIRROR-HALL-12. |
| `debriefOf`, about 60 lines across priorities 1, 4, 5 and 6 | 66 lines in `dist/content/room.mjs` (14 first falls, 16 losses by where they ended, 16 choices, 20 rewrites), plus 6 leads. Picked by priority, in order within a set, starting over when a set runs out. Priority 5's Beacon line waits: no Beacon tell exists. The choices are what a breach records: a dug-in server taken, a heat opened, a checkpoint, a subsystem left stock, no rests, traced (a hunter came) and finished anyway, stayed quiet (Trace never reached the alarm), two vaults, two elites, no script run, a re-image, a replay. |
| The world turn with dig in and the pressure rules | As 3.1 and 3.2, steps 1, 2, 3 and 6 (the hunter, ACTUARY and faction reactions wait). It runs from your second capture, never for the tutorial. |
| Dead drops from wick's leads (pool cards only), the first 2 dead-drop fragments | As 3.3, paying a **script** instead of a pool card (there is no pool now). The first world turn always brings a lead (*the others noticed you.*). wick's two notes are a *dead drops* thread in the Archive. |
| Save v2 | v4: v2 was heat and v3 the scripts. Same key, migrated in place after the scripts' migration. |
| No standing yet | None: the board is news only. |

Decisions made on the way, beyond the doc:

- **What "a signature gene on every elite and gate" means.** Every author's signature genes are part genes or attack genes, not mutations, so the dig in's gene is the signature **part** for the server's body that opens at its level (Ward or Mutex lock, Twin, Mimic, Decoy mirror), with a toolkit mutation as the fallback (none is needed on today's map). On an elite it is the third part, on top of the roll, and the elite is written by that author; a rolled mutation that would break the compatibility rules goes. On a gate the guard keeps its parts and fixed tells, and the gene's part joins it at 40% of its size, holding the guard's signature part (the Lockbox wards the Watchdog's Tracker). Full size made pressured breaches about 15 points harder than clean ones; the rework's elites bring a charge, and a Ward's cap works against the burst that answers it, so dug-in elites are still the harder part (see the table).
- **The clean-server rule after a capture.** The doc checks it when a move is placed, but a capture can close the last clean server too (two dug-in servers left open, and the one you took opened nothing). Then the oldest move lifts and the board says *TOLLGATE pulled out of …*, so the rule holds on every turn. It never retakes anything.
- **Watches.** A move that waits on the rules is a watch (on the board and the card's World row). It never fires on its own: the author's next answer replaces it, as in 3.6's turn 5. An author with no open server left says so on the board (claims come in W2).
- **Where drops go.** On a server you can breach or hold, never SPRAWL-00 or one you've outgrown, and when it can be no more than 1 level under you and away from a dig in. In a breach the drop takes a cache in its row first, then a spare terminal, then a fight in a row that has another, never a mirror, a keycard's virus, a vault or a switch, so every act keeps its elite, its terminal, its keys and both subsystems.
- **A drop's script goes in your slots when you pull it.** With every slot full you can't pull it, and it stays on the map. The note is yours when the breach ends, even if it's lost.
- **The bot** follows a lead only with a script slot free; without that it kept re-imaging the drop's server and its win rate climbed past 90%.
- **Not built in W0:** the editor tab for `content/room.mjs` (it is editor-format JSON, editable by hand), chips on the breach map beyond the gate's `dug in · ward` and the drop node's `D`.

**The world in the bot's campaigns** (`node campaignsim.mjs 90 12 --world on`: 12 campaigns a class, 1,026 breaches after the first world turn):

| Check (6.4) | Bound | Shipped |
|---|---|---|
| New events a breach | 0.4 to 0.7, never more than 1 | 0.31, never more than 1. Dead drops are W0's only event and one is on the map at a time, so the rate sits under the full world's band; leaks and crews (W2) fill it. |
| Live events | Never more than 3, one a server | Never more than 1 |
| Pressured servers | Never more than 2, a clean open server every turn | Most 2, mean 0.76 (breaches ending with 0, 1, 2: 293, 687, 46). A clean open server on 100% of turns. 0.16 new moves a breach. |
| After a loss | No author move | 0 |
| Win rate on pressured breaches | Within 10 points of clean ones at the same level band | First tries at your level: 77% of 22 pressured against 85% of 151 clean. One level over you: 57% of 90 against 69% of 232, 12 points, just outside the bound (a sample this size reads within about ±5). All breaches: 66% against 76%. The bot skips a pressured server half the time; the designer's playtest should say whether the pay is worth it. |
| Dead drops | | 393 breaches carried one, 146 pulled. |
| Breaches to level 10 | Within 10% of world off | Not worse (below). |

Breaches to level 10, 12 campaigns a class, mean:

| Class | World off | World on |
|---|---:|---:|
| Bastion | 9.3 | 9.3 |
| Breaker | 10.5 | 9.8 |
| Infiltrator | 11.3 | 11.0 |
| Operator | 10.4 | 9.6 |

The full campaign (`node campaignsim.mjs 90 12`) reaches level 20 in 22, 24, 23 and 22 breaches with the world off and 21, 25, 23 and 21 with it on (Breaker, Bastion, Infiltrator, Operator). Win rates rise 5 to 9 points with the world on, from the scripts drops pay and the held servers leads send the bot back to. `campaign.test.mjs`'s 22 breaches to level 10 still holds, and it now checks the world's rules in the same runs.
