# Threads: quests you find in rooms

**Status.** WoW-style quests found in server rooms. Built: the engine, three chains, nine one-offs, the talk, goto,
escort and temporary-server steps, and the quest window (GAME_RULES.md *Threads*; `dist/threads.mjs`,
`dist/content/threads.mjs`). Left: the sketched step kinds (2.2), chains 4 to 12 (4), and the open questions (6).

The designer's ask:

> WoW-style quests you stumble on in server rooms: more involved and immersive than contracts from your employer,
> requiring you to go do other things.

"Threads" is a working name: a thread you pull, and see where it goes. They have a section of their own in the quest
log (Mail), next to Contracts.

## 1. The rules that still govern

- **Found, not given.** A thread starts in a room, someone or something waiting there.
- **Amber, never teal.** Its marks, its file and its temporary servers are amber. Teal is only ever you.
- **Never timed.** No clock anywhere in a thread; nothing expires, nothing is missable.
- **A reason in the world.** Every thread is for someone or something, said in a line, in WoW's tooltip grammar.
  Computing that makes sense in the fiction, never real intrusion technique.

## 2. Step kinds

Built: **talk**, **goto**, **escort**, **temporary server** (GAME_RULES *Threads*).

### 2.2 Sketched

| Kind | You | Sketch |
|---|---|---|
| **shards** | Collect pieces | N files (3–5) scattered one a server across a floor's servers, each in a nook; the thread's card counts them (2/4). A shard is taken as you stand in its room. The pieces make a thing whole: a stack trace, a key, a recording. |
| **follow** | A stray follows you home | The escort turned around: a lost process attaches to you and follows you room to room (a room behind, one per move), bitten like a file when it's not beside you. Jack out with it and it's home: it moves into your home server as a small passive (what it gives is open: daemons come only from invasions). |
| **hold** | Hold the room while a crewmate reconnects | A room you must stand in for N of your moves (`wait` counts) while viruses respawn into the rooms next to it and walk in (the hunter's pathing, toward you). A count on the strip. Losing the room (jacking out) resets it; nothing else is lost. |
| **find** | Find who's doing it | Three servers' logs each hold a piece (a time, an address, a pid); a fourth server holds three suspects in nooks. Talk to the one the pieces point at. A wrong one says nothing useful and the thread waits. |
| **choice of buyers** | Two buyers for one file | Built as a talk step's choice (The Night Operator). Sketched further: two nooks on two servers want the same file; carrying it to one closes the other (both stay on the map, one greyed), each pays a faction. |

## 3. How it's played

Built: where threads start, nooks, the map marks, the quest log, the terminal and the save (GAME_RULES *Threads*).

## 4. The chains

Twelve, two to five steps each, across the floors. Built: 1 Restore Point (floor 1), 2 The Night Operator (floor 2),
3 Mirror (floor 3), and the one-offs (escort, talk and temporary-server variants).

### Sketched

| # | Floor | Chain | Reason | Steps |
|---:|---:|---|---|---|
| 4 | 1 | **Dead Letters** | A LANTERN courier's route broke mid-run; three of its packets are stuck on three servers. | **talk** the courier's last hop → **shards** ×3 (one a server) → **escort** the reassembled packet to SPRAWL-00's door → **talk** LANTERN (standing). |
| 5 | 2 | **Two Buyers** | A Halcyon claims file that GLASSJAW also wants. | **goto** the file in a vault-side nook → **choice of buyers**: carry it to Halcyon's drop (standing, credits) or GLASSJAW's (credits, Halcyon −); the other drop greys. |
| 6 | 3 | **Who's Deleting the Tenants** | Backups are vanishing off three Stacks servers, one tenant a night. | **talk** a tenant's restore job → **find**: three servers' logs (a time, an address, a pid) → **talk** the suspect the pieces point at (a NULL CHOIR cron job, or a Halcyon auditor: a choice) → **temporary server** it was copying them into: kill. |
| 7 | 4 | **Cold Start** | moth, a LOWLIGHT runner, dropped mid-raid on Coldline and is reconnecting. | **talk** moth's ghost session → **hold** the room for 12 moves while the ring's processes walk in → **escort** moth's session token to a server across the dead centre → **talk** moth (wick's line in the room after). |
| 8 | 4 | **Frostbite** | A cryptominer rig left running on Coldline is cooking the floor. | **temporary server** (a rig that grows a room a visit, its Lab rule hotter each room) → **talk** its owner, who wants it back (a choice: give him the kill switch's key, or throw it yourself). |
| 9 | 5 | **The Bridge Toll** | TOLLGATE raised a server on Deep Core's bridge and taxes everything crossing. | **temporary server** on the bridge: logs → **shards**: its toll ledger in three pieces on both halves → **talk** the people it taxed → **temporary server: kill**. Pays standing with whoever you hand the ledger to. |
| 10 | 6 | **Orphans** | A kernel thread forked off a parent that died; its children keep spawning. | **follow**: the orphan attaches to you → **goto** its parent's crash dump deep in a tree server → **talk** the dump (*"tell them to stop"*) → **escort** the orphan back to its parent's room, where it exits cleanly. |
| 11 | 7 | **Drain** | The Sink's servers are leaking traffic down into something new. | **temporary server** (Undertow's bigger brother, two kill switches) → **find** who: SWARMLINE or NULL CHOIR, by their logs → **talk** them; a choice of two that sets which faction's servers on the floor go quiet. |
| 12 | 8 | **Last Light** | The last LANTERN station on Bedrock is going dark, its beacon still sending. | **talk** the station → **escort** the beacon island to island (three legs, in transit twice) → **hold** the last room while the beacon finishes → **talk**: the station's final broadcast, a line in the Archive for good. |

## 5. Pacing

A chain is about 20 to 45 minutes at its floor's level, paying about 50 to 60 kills' worth of XP and an item: a side
dish, not a second climb. The pacing bot never starts a thread, and a thread's rooms never count toward Rooms n/N.

## 6. Open questions

- Should the one-offs pay a pick of three at all, or only XP and a single item (they're ~35% of servers)?
- More than one start a server, once the first is done? (Today: one a server for good.)
- A tracked thread's step on the pager is one line that replaces the last; is a persistent "objective" line on the
  pager wanted too?
- Should a temporary server ever send a stray at your wall while it stands (the ask's alternative to growing)? Today it
  only grows, and only when you visit.
- Mirror copies your *most cleared* server (a held one first). Should it copy your home server's look instead, once
  home has rooms?

## 7. The quest window

Built: *the Transmission*, the designer's pick (GAME_RULES *Threads*; `dist/quest-view.mjs`, `dist/quest.css`).
