# Threads: quests you find in rooms

A design sheet for review. **Built** marks what's in the game today; the rest is a sketch. The rules a player reads
are in GAME_RULES.md *Threads*; the code is `dist/threads.mjs` (the engine), `dist/content/threads.mjs` (the chains
and the one-offs, as data), `dist/threads-view.mjs` (the screens), tested in `threads.test.mjs`.

The designer's ask:

> WoW-style quests you stumble on in server rooms: more involved and immersive than contracts from your employer,
> requiring you to go do other things.

"Threads" is a working name: a thread you pull, and see where it goes. They have a section of their own in the quest
log (Mail), next to Contracts.

## 1. The rules

| Rule | What it means here |
|---|---|
| Found, not given | A thread starts in a room: someone waiting in it (an idle session, a stalled job, a stranded process) or something (a file, an index, a beacon). Its amber **!** shows once you've been in that room: until then it's an unknown room like any other. The server it's on wears a small amber ! on the floor map once you've seen it. |
| Amber, never teal | The ! where one starts, the ? where the step you're on sends you, the file you carry, a temporary server: all amber. Teal is only ever you. |
| Never timed | No clock anywhere in a thread. A file in transit waits forever; a temporary server never goes on its own; nothing expires. You can set a thread aside and pick it up again (from Mail, or by going back to where you found it). Nothing is missable. |
| A reason in the world | Every thread is for someone or something: M. Wren's photos, forty paychecks, a copy of your ground somebody bought. It says so in a line, in WoW's tooltip grammar: terse, in the world, show don't tell. Computing that makes sense in the fiction, never real intrusion technique. |
| Rewards | Deed XP for each step (`deedXpFor`: a chain's steps about 12 kills of your level each at level 10, the last about 20; a one-off's about 7 and 12), a pick of one of three items at the end (WoW's quest reward), faction standing where a faction is in it, and a line of lore. |
| Loot | Inside the WoW model (gear.mjs `LOOT`): a chain's three are blues, one of them a yellow one time in ten (`LOOT.quest`); a one-off's are blue half the time (`LOOT.minor`), else white. One leans to your class and the stat your subclass chases, the other two to other stats, each a different slot. |

## 2. Step kinds

### 2.1 Built

| Kind | You | How it plays |
|---|---|---|
| **talk** | Reach someone and talk | A person or a thing in a room of its own (a *nook*: an Empty room hung off the deep end of a branch, named for what's in it, *Night desk*, *Quill's room*), on this server, a server one or two links off, or a floor up. You fight through to it. `talk` (the card's **Talk**, **Read**, **Take**…): a few terse lines over the map, sometimes a choice of two (`talk 1`, `talk 2`; buttons in the dialogue) that sets what happens next: standing, credits, the lore line. |
| **goto** | Reach a room | Standing in it with nothing live there is enough (the room engine's *stood*). It usually wakes the next thing: the file starts to walk. |
| **escort** | Carry a file out | The file is a slow process with its own Integrity (100). It walks the room graph toward its destination, a room for every **2 of your moves** (a step or a wait), along the shortest open way: the Exfil's pathing in reverse (`exfilNext` runs away; this runs toward). It never walks into a live room or the sealed Core: it waits at the first one in its way until you clear it. **Viruses go for it, not you**: every move you're not in its room, each live room next to it bites (10%, an elite 15%, a live room it stands in 20%, the hunter 25%). Stand in its room and nothing bites. So you choose: run ahead and clear the way, or stay with it. At 0 it's corrupted and a clean copy waits where that leg began: no failure, nothing lost. **Across servers**: leg one walks it to this server's entry; then it's *in transit* along the floor's links (on the floor map, moving down the route between the two servers); connect to the destination and it's waiting at the entry for leg two. |
| **temporary server** | Investigate a server, then shut it down | A new server appears on the floor map, named (*MIRROR-17*, *SPILLWAY-30*), an amber ? beside the server the thread started on, linked to it with a dashed line. It's not a server of your network: it never sends invasions, takes no memory, holds no starts. It never goes on its own; while it stands it **grows** a room each visit (up to six). Investigating is reading its logs: two rooms of its own, the **build log** (who built it, from what, where its kill switch is) and the **process log** (the log sweep from forensics.mjs, a ps.snapshot: *Which pid built this server?*; a wrong answer costs nothing). Its Core is the **kill switch**, sealed until you know it (from its logs, or from its builder); beat it and the server goes **dark** for good, greyed on the map as a record, refusing connects. |

### 2.2 Sketched

| Kind | You | Sketch |
|---|---|---|
| **shards** | Collect pieces | N files (3–5) scattered one a server across a floor's servers, each in a nook; the thread's card counts them (2/4). A shard is taken as you stand in its room. The pieces make a thing whole: a stack trace, a key, a recording. |
| **follow** | A stray follows you home | The escort turned around: a lost process attaches to you and follows you room to room (a room behind, one per move), bitten like a file when it's not beside you. Jack out with it and it's home: it moves into your home server's memory as a small passive (a codebase, a daemon at its level). |
| **hold** | Hold the room while a crewmate reconnects | A room you must stand in for N of your moves (`wait` counts) while viruses respawn into the rooms next to it and walk in (the hunter's pathing, toward you). A count on the strip. Losing the room (jacking out) resets it; nothing else is lost. |
| **find** | Find who's doing it | Three servers' logs each hold a piece (a time, an address, a pid); a fourth server holds three suspects in nooks. Talk to the one the pieces point at. A wrong one says nothing useful and the thread waits. |
| **choice of buyers** | Two buyers for one file | Built as a talk step's choice (The Night Operator). Sketched further: two nooks on two servers want the same file; carrying it to one closes the other (both stay on the map, one greyed), each pays a faction. |

## 3. How it's played (built)

- **Where they start.** When you connect to a server its start is pinned, from its seed, once (`startOn`): at most one a
  server, never on SPRAWL-00, the farm, a lair, a rogue server, a member's server or a temporary one. An **authored
  chain** lands on its floor's first servers you connect to (60% each, surely the second), once you're at its level;
  until then it waits, unplaced. Any other server holds a **one-off** 35% of the time (an escort, a talk or a
  temporary server, a variant from its seed), else nothing, for good. `developer thread <chain>` (with `?dev`) pins
  one where you stand.
- **Nooks.** Every place in a thread is a room of its own on its server, added to the graph at a branch's end on a cell
  that never moves another room's address. It comes **cleared**: it never counts toward Rooms n/N or Mapped, the bots
  never walk to it, and nothing about the server changes for a player who never starts the thread. A place on another
  server is a located server of yours (never an unknown one), one or two links off on the floor's diagram, apart from
  the thread's other places where it can be; a floor up for *a floor up*.
- **The map and the card.** The ! on a start you've been in, the ? on the room the step sends you to (drawn as a ?
  chip once the thread has told you where: you see where, never what). The file's badge sits on its room with its
  Integrity under it, an amber dashed arrow to the room it walks into next, and its line on the strip (*payroll.db
  ▮▮▮▯ 72% · waits · Process 2*). The thread you track has one line on the strip and each step goes up on the pager.
  On the floor map: a ! or ? beside a server, the temporary servers, a file in transit moving down its route.
- **The quest log.** Mail's **Threads** section lists every thread (tracked, set aside, done), and a thread opens
  as its giver, its title, its reason, its steps as a printed job (done, the current one with its progress, the
  ones ahead encrypted), its lore line at the end, and **Track** / **On map** / **Set aside** / **Pick it up** / **Pick your
  reward**.
- **The end.** The last lines first (signed), then the reward card over the page, a signed receipt: three items, *Take* one. **Later** puts it
  off; it waits in Mail.
- **The terminal.** `talk`, `talk 1`, `read`, `take`, `sweep <pid>` in a thread's room; `threads`, `thread <id>`,
  `thread track|abandon|resume <id>`, `thread take <n>` anywhere.
- **The save** (v43): `s.threads` (the starts, the threads, the temporary servers and their rooms, the reward waiting).
  An older save starts with none; its servers' starts are pinned as you connect to them.

## 4. The chains

Twelve, two to five steps each, across the floors. Three are built and play now; the one-offs are built too.

### Built

| # | Floor | Chain | Reason | Steps |
|---:|---:|---|---|---|
| 1 | 1 (from 3) | **Restore Point** | M. Wren's photos are stuck half-copied; the job moving them never gave up. | **talk** a stalled restore job in a *Stalled job* room → **goto** her archive (*Cold storage*, deep on the same server) → **escort** `wren-photos.tar` to the restore point on a server one or two links off (leg one to the entry, in transit, leg two) → **talk** the restore point: *"thank you, whoever you are."* Teaches the escort. |
| 2 | 2 (from 7) | **The Night Operator** | A payroll run nobody finished. Forty people wait on it. | **talk** an idle session in an *Ops room*: *"Payroll file's still on BH-…. Get it out before the purge."* → **goto** the payroll file on another server (fight to it) → **escort** `payroll.db` to her terminal two servers over → **talk** s. okafor at the *Night desk*: hand it over (Kestrel +12) or sell it to GLASSJAW (GLASSJAW +10, Kestrel −8, 150 + 25 × your level credits; a different lore line). |
| 3 | 3 (from 13) | **Mirror** | Someone is copying your ground, room for room. The copy's for sale. | **talk** (read) `mirror.idx` in an *Index* room: a temporary server appears, MIRROR-nn, its rooms a copy of the server of yours you hold or have cleared most → **temporary server: logs** (the build log names its builder, Quill, and where he was last seen; the process log's sweep) → **talk** Quill on a server a floor up: *"Yours sold twice."* He unseals the kill switch → **temporary server: kill** its Core. It goes dark. |
| — | any | **One-offs** | Each its own line. | **Escort** (*Orphaned Ledger*, *The Long Way Home*, *Witness*): take a file, walk it to a drop box a link or two off. **Talk** (*Last Call*, *Shift Change*, *Wrong Number*): carry a message to someone on another server. **Temporary server** (*Spillway*, *Scaffold*, *Undertow*): a beacon names a server being built past the floor's edge; read its logs, shut it down. |

### Sketched

| # | Floor | Chain | Reason | Steps |
|---:|---:|---|---|---|
| 4 | 1 | **Dead Letters** | A LANTERN courier's route broke mid-run; three of its packets are stuck on three servers. | **talk** the courier's last hop → **shards** ×3 (one a server) → **escort** the reassembled packet to SPRAWL-00's door → **talk** LANTERN (standing). |
| 5 | 2 | **Two Buyers** | A Halcyon claims file that GLASSJAW also wants. | **goto** the file in a vault-side nook → **choice of buyers**: carry it to Halcyon's drop (standing, Indemnity) or GLASSJAW's (credits, Halcyon −); the other drop greys. |
| 6 | 3 | **Who's Deleting the Tenants** | Backups are vanishing off three Stacks servers, one tenant a night. | **talk** a tenant's restore job → **find**: three servers' logs (a time, an address, a pid) → **talk** the suspect the pieces point at (a NULL CHOIR cron job, or a Halcyon auditor: a choice) → **temporary server** it was copying them into: kill. |
| 7 | 4 | **Cold Start** | moth, a LOWLIGHT runner, dropped mid-raid on Coldline and is reconnecting. | **talk** moth's ghost session → **hold** the room for 12 moves while the ring's processes walk in → **escort** moth's session token to a server across the dead centre → **talk** moth (wick's line in the room after). |
| 8 | 4 | **Frostbite** | A cryptominer rig left running on Coldline is cooking the floor. | **temporary server** (a rig that grows a room a visit, its Lab rule hotter each room) → **talk** its owner, who wants it back (a choice: give him the kill switch's key, or throw it yourself). |
| 9 | 5 | **The Bridge Toll** | TOLLGATE raised a server on Deep Core's bridge and taxes everything crossing. | **temporary server** on the bridge: logs → **shards**: its toll ledger in three pieces on both halves → **talk** the people it taxed → **temporary server: kill**. Pays standing with whoever you hand the ledger to. |
| 10 | 6 | **Orphans** | A kernel thread forked off a parent that died; its children keep spawning. | **follow**: the orphan attaches to you → **goto** its parent's crash dump deep in a tree server → **talk** the dump (*"tell them to stop"*) → **escort** the orphan back to its parent's room, where it exits cleanly. |
| 11 | 7 | **Drain** | The Sink's servers are leaking traffic down into something new. | **temporary server** (Undertow's bigger brother, two kill switches) → **find** who: SWARMLINE or NULL CHOIR, by their logs → **talk** them; a choice of two that sets which faction's servers on the floor go quiet. |
| 12 | 8 | **Last Light** | The last LANTERN station on Bedrock is going dark, its beacon still sending. | **talk** the station → **escort** the beacon island to island (three legs, in transit twice) → **hold** the last room while the beacon finishes → **talk**: the station's final broadcast, a line in the Archive for good. |

## 5. Pacing and the bots

The pacing bot never starts a thread (it never talks), so threads add nothing to its climb; a server's start is pinned
when the bot connects, but its nook comes cleared and never counts toward Rooms n/N, so the bot's maps are unchanged.
For a player a chain is about 20 to 45 minutes of play at its floor's level, paying about 50 to 60 kills' worth of XP
(a floor's 1,000 to 3,000 kills) and an item a chain: a side dish, not a second climb.

## 6. Open questions

- Should the one-offs pay a pick of three at all, or only XP and a single item (they're ~35% of servers)?
- More than one start a server, once the first is done? (Today: one a server for good.)
- A tracked thread's step on the pager is one line that replaces the last; is a persistent "objective" line on the
  pager wanted too?
- Should a temporary server ever send a stray at your wall while it stands (the ask's alternative to growing)? Today it
  only grows, and only when you visit.
- Mirror copies your *most cleared* server (a held one first). Should it copy your home server's look instead, once
  home has rooms?

## 7. The quest window: a transmission

The designer's ask: *"I think the quest window can feel more immersive as well."* Three directions were prototyped (a
transmission, a case file, a job ticket); the designer picked **the transmission**, now the only look. The quest
window is the three screens a thread is read on: its **dialogue over the map** (the thread arriving at its start, a
step's talk, its last lines with their choice, a temporary server's logs: `threadPanel`), its **page in Mail**
(`threadReader`) and its **reward card** (`offerMarkup`). The room card's Talk, the strip's line and the map's ! and ?
stay as they were. Code: `dist/quest-view.mjs`, `dist/quest.css`; tests in `quest-view.test.mjs`.

| Moment | What it shows |
|---|---|
| A new thread (its opening) | *Incoming* · the room's address and server; the sender with their faction's mark (or a terminal, a file, a log); the title; the lines, the first resolving out of noise once; the steps as a printed job (`job 0003`, ✓ done, ▸ now, the ones ahead dim hex) |
| A step's talk | *Channel open*, the lines |
| The turn-in | *Last transmission*, the lines and their choice; once said, signed by who said them |
| A log | *Log*, its lines (the process log's sweep as before) |
| Mail | the giver and mark, the reason, the job, and at the end the lore line, signed |
| The reward | a receipt: the steps, the lore line, *signed* and the thread's signature, *Pick one* of three, Later |

Calm: the lines arrive once (opacity only); the decrypt plays only for a new quest's opening, once (a redraw while it
plays carries it on where it was, `ageOf`, never starts it over; after about two seconds it is drawn still); Mail's
page never animates (it redraws as its clocks tick); Motion off and reduced motion draw everything still. The hex for
a step ahead is dim and smaller, a placeholder rather than noise. Nothing new is said: every line is the thread's own;
the signature, the job number and the cipher are presentation. `developer thread preview [chain] [stage]` (dev only)
shows any chain offered, under way, at its turn-in and its reward, without touching the save.
