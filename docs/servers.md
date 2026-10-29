# Servers: rooms, floors and sockets

**Status.** The design for servers as room graphs, the network as floors and socket programs. Built: R0 to R3 and the
puzzle rooms (GAME_RULES.md *Runs: servers as rooms*, *Runs*, *Puzzle rooms*, *Floors*, *Sockets and programs*,
*Root access*, *Tells*; the table at the end maps the old sections). Left: R4 (seven families, nest rooms, Linked tells,
help requests, the other programs) and R5 (the cut).

The designer's brief, in their words:

> "1) I think the servers should have a similar design as the breach design, but instead be like different rooms similar to darkest dungeon. This will give much more depth to rooms and also give opportunity for things to spawn in those rooms consistently. It also allows progress to be measured much more simply.
> 2) I think we definitely need more virus depth and variety. I was also thinking that attack sets between the same virus types should be different. So for example, pulses or encryption doesn't always happen at the same time.
> 3) … a new mechanic that could partly simplify the tell system: At 50% and 25% HP of a component, you interrupt the upcoming attack on the cycle. This gives a lot more opportunity to add many more systems and complexity to the fights.
> 4) … I didn't like the roguelike breach system. I like having a network.
> 5) … the network should be much more asymmetrical. I think deeper networks should be on a 'z' axis with an entirely new network diagram. I think exit nodes are something that are located in the network diagram which allows you to go to the next network. This gives a 'tower-like' component to the game instead of it being flat.
> 6) Within a server map, there should be opportunities to 'socket' components in it, which can preserve the building system that we had. But, instead of the building affecting the server at a macro level, it would modify the server at the micro-level.
> Things to think about: increased drop rate of materials on the server; increased xp from enemies (for more xp/hr)."

**Decided (designer), still governing.**
- A room is a fight or an interactable; rooms form a branching graph; progress is rooms cleared, and nothing is lost
  by being away.
- The interrupt cancels the attack landing **this cycle**, once per tick per part. Burns, helpers and daemons count. A
  wasted tick stays spent. No tells at levels 1 to 5.
- **Trace is cut**: *"Trace could feel bad because it goes against getting loot."* Danger is never tied to looting;
  the hunter is a server feature.
- Eight floors on a z-axis, no gatekeeper at an exit, and you can always go back up.
- A socket changes only the server it's built on, held or not; holding adds the core socket. One version a program.
- Help that clears rooms without you doesn't count for your progress: help comes to your fight.
- Bosses: *"it's worth a test."* All three boss rules shipped behind a switch (`&boss=a|b|c`); rule (a), the core
  part's ticks are its phases, is the default.

## 2.9 Requesting help (R4)

Finishing a server alone is the default; help is for the elite, the Resident or the room that keeps beating you. It
reuses the crew and the consortium (consortium.mjs, crew.mjs) and adds one button.

- **Request help** on the server's card (and `help request <server> [room]`) names a room, or *the rest*. One request
  open at a time, no timer: it stays up until filled or cancelled.
- It goes to your consortium and friends as a pager line (*nyx asks for a hand with the core on MERIDIAN-MX-14*).
  Someone online answers within a few minutes (simulated, as `crew sim` is), and their chip appears on the card.
- **Help comes to your fight**: the helper joins your crew (up to three) and fights with you, linked or split to
  another room on the same visit. A room counts for you when you're in the fight, or a crewmate on your visit clears it.
- A helper's XP is by damage, as drop-ins are. Each player rolls their own loot. A Mapped server pays its completion
  roll to everyone who helped.

## 3.5 Linked tells (R4)

Built tells are in GAME_RULES *Tells*. Still to build: the **Linked** tell, the complex fights' tell, 4 cycles ahead,
its chip listing two or three requirements with a check box each. Each unmet requirement lands its share.

| Linked tell | Who | Needs | If it lands |
|---|---|---|---|
| **Cascade** | Elites, any family | Interrupts on two named parts on the same cycle | Both attacks land charged |
| **Quorum** | Botnet (elite and boss) | An interrupt on the C&C and 3 Zombies broken before it lands | Every Zombie fires three times |
| **Handover** | Nest rooms (two viruses) | SIGINT one virus's cast and interrupt the other's charge, on one cycle | Both land |
| **Failover** | Bosses with an add | Break the add and interrupt the core part's attack that cycle | The add comes back at full and the attack lands charged |

**Counts.** An elite brings a Linked tell from level 10; a boss brings its fixed set plus one Linked tell.

## 4. Virus variety

Attack sets and the Trojan, Cryptominer and Wiper are built (GAME_RULES *Runs: servers as rooms*, *Families*). The seven families below are not.

### 4.2 The seven families still to build

New **bodies** (genes.mjs, authors.mjs): each rolls its author's genes on top within the budget and the
compatibility rules (docs/genome.md 5.3), one mutation at most, and passes rule 4 (an answer in every kit at its level)
before it ships. Numbers are at level 6 scale and grow 4% a level. Each comes with two attack sets.

| Family | Stem | Opens (level, floor) | Authors | Code | Threshold verb |
|---|---|---|---|---|---|
| Botnet | MIRAINET | 8, floor 2 | SWARMLINE | Worm | C&C: cancel a volley |
| Logic Bomb | TIMEBOMB | 12, floor 2 | TOLLGATE | Cipher | Trigger: cancel. Payload: shorten the fuse. |
| Polymorph | SHAPESHIFT | 14, floor 3 | PALEMASK, NULL CHOIR | Kernel | cancel, and lock its form 2 cycles |
| RAT | DARKCOMET | 16, floor 3 | NULL CHOIR, GLASSJAW | Kernel | Operator: release your key |
| Rootkit | KERNELHOOK | 18, floor 3 | PALEMASK, NULL CHOIR | Kernel | surface the next part |
| Stealer | INFOSTEAL | 22, floor 4 | GLASSJAW, LANTERN | Cipher | Siphon: return what it stole |
| Fileless | LOLBIN | 26, floor 4 | NULL CHOIR, PALEMASK | Kernel | evict it from that process |

Invasions can be any family but the Fileless, which lives only in rooms.

### 4.3 The families

**4. Logic Bomb. Count your hits.**

| Part | Integrity | ◆ | Move |
|---|---:|---:|---|
| Trigger | 30 | 1 | Tick 9 every 3 from 2 |
| Payload | 70 | 1 (2 from 10) | none. A **fuse** on its bar. |

- Sets: **Contact** (an 8-hit fuse counting your command hits on the Payload, a hit on ◆ included) and **Timed** (a
  6-hit fuse counting every hit, burns and helpers too, winding back up 1 a cycle, to 6).
- At 0 it detonates: 35% of your max Signal, and the Payload is gone with its loot. The fight goes on against the Trigger.
- Ticks on the Payload shorten the fuse by 2 and never interrupt. The Trigger's cancel as usual.
- The lesson: Contact wants few big hits or burns. Timed wants one big hit a cycle and no helpers.

**5. Polymorph. Hit the other one.**

| Part | Integrity | ◆ | Move |
|---|---:|---:|---|
| Engine | 36 | shared | Surge 12 every 4 from 3 |
| Mutator | 36 | shared | Rewrite 8 every 5 from 4 |
| Shared armor | | 3 (4 from 20) | sits on one part at a time |

- At the end of each cycle its ◆ move to the part you hit last. Sets: **Reactive** (every cycle) and **Drifting**
  (every other cycle, and each move shifts both parts' next attacks a cycle, earlier then later, shown on the board).
- Ticks cancel as usual and **lock its form** for 2 cycles: the ◆ stay where they are.
- The lesson: alternate. Burns on one and commands on the other work too.

**6. Botnet. Farm it or end it.**

| Part | Integrity | ◆ | Move |
|---|---:|---:|---|
| C&C | 46 | 2 | Volley: every Zombie fires at once |
| Zombie (6; 7 from 15; 8 from 25) | 8 each | 0 | its share of the volley |

- Sets: **Barrage** (a volley every 4 from 4, each Zombie 3) and **Drizzle** (every 2 from 2, each Zombie 1).
- Break the C&C and the Zombies scatter: the fight ends safely but pays only 0.6 of a kill and none of the Zombies'
  drops. Clear the Zombies first and it pays 1.5 kills.
- Ticks: the C&C's cancel a volley. Zombies have none.
- The lesson: area builds farm it. Anyone low on Signal ends it.

**7. Rootkit. Find the Hook.**

| Part | Integrity | ◆ | Move |
|---|---:|---:|---|
| Driver | 34 | 1 | Surge 12 every 4 |
| Syscall | 34 | 1 | Hijack 8 every 3 |
| Hook | 28 | 1 | Heals every hidden part by 10% of its max every 3 |

- One part is **surfaced** at a time. The others are hidden: they can't be targeted or hit (area hits miss, burns on
  them pause), and their attacks land as veiled ??? chips.
- Sets: **Hook last** (Driver, Syscall, Hook) and **Hook second** (Syscall, Hook, Driver).
- Ticks: taking the surfaced part across one sends it down and surfaces the next (no cancel). Breaking it surfaces the
  next too. A healed part's spent ticks stay spent.
- The lesson: every tick brings the Hook closer. Break the Hook and nothing heals.

**8. RAT. Don't press the red key.**

| Part | Integrity | ◆ | Move |
|---|---:|---:|---|
| Client | 34 | 1 | Surge 11 every 4 |
| Operator | 38 | 2 | Takeover every 6 from 3: hijacks one of your keys |

- Sets: **Profiler** (your most-pressed skill this fight) and **Roulette** (a random ready skill, picked again every 3
  cycles). One key at a time, never key 1 or SIGINT.
- A hijacked key glows red, *HIJACKED*. Pressing it heals the virus's most damaged part by what the skill would deal.
- Ticks: the Operator's release your key (and cancel that cycle's move). Breaking the Operator releases it for good.
- The lesson: your rotation is the weakness. Play off-script until you've taken a tick.

**9. Stealer. Have nothing to steal.**

| Part | Integrity | ◆ | Move |
|---|---:|---:|---|
| Exfil | 34 | 1 | Surge 12 every 4 |
| Siphon | 40 | 2 | Steal |

- It steals your shield (a shield on the Siphon), your Momentum and other stacks (+10% to its attacks a stack), your
  burns on its parts (they move onto you), your helpers (they turn on you until they expire). Chips on the Siphon.
- Sets: **Smash and grab** (every 5 from 4, everything) and **Pickpocket** (every 2 from 2, the one thing worth most).
- Ticks on the Siphon return everything it holds. They don't cancel.
- The lesson: every class has something to lose. Lay it down after the steal, or take it back at a tick.

**10. Fileless. Evict it, don't break it.**

- No parts of its own. The room has 3 processes (4 from 34), named for its subsystem (in `/etc/cron.d`: crond, atd,
  logrotate), each 36 Integrity and ◆1, inert until possessed. It possesses one (two from 30) and attacks with it:
  Surge 12 every 4, or the process's own move.
- Sets: **Hop** (it jumps to a new process each time it's evicted) and **Nest** (it stays a cycle longer in each, and
  its first attack there comes a cycle sooner).
- Ticks **evict** it: that process goes clean and the Fileless jumps to an inert one, named on its chip, next cycle.
  With nowhere left to jump, it's purged and the fight is won.
- Breaking a possessed process cleans it too, but every point past its Integrity **spills into the room** and burns 1%
  of the room's loot (a pile bar over the board). Overkill's spill burns loot here instead of the next part.
- The lesson: precise crossings, not burst.

### 4.4 Nest rooms: two viruses at once

A nest room holds two viruses of the author as one fight: their parts share one board, each keeps its own body's
rules, and the kill pays 1.5 kills. Linked tells live here (Handover), and interrupts are scarcest: two bodies, more
moves due, the same two ticks a part. Mixing two bodies' rules on one board is the new work.

### 4.5 Who writes the new families

| Author | New families | Sets it favours |
|---|---|---|
| TOLLGATE | Logic Bomb | Contact |
| SWARMLINE | Botnet | Barrage |
| PALEMASK | Polymorph, Rootkit, Fileless | Hook last, Nest |
| NULL CHOIR | Polymorph, RAT, Rootkit, Fileless | Roulette, Hop |
| GLASSJAW | RAT, Stealer | Profiler, Smash and grab |
| LANTERN | Stealer | Pickpocket |

A floor's holder (docs/content.md 3.1) decides most of its families.

## 6.4 Programs still to build

The eight built programs are in GAME_RULES *Sockets and programs*. The ones still to build (Bulkhead, Sentry
Turret, Patch Injector, Lure, Honeytoken, Relay, and the core programs Range and Jump Host) are in one list with the
economy's in **docs/economy.md, Programs still to build**.

## 9.1 Phases left

| Phase | What |
|---|---|
| **R4, depth** | The seven families (4.3), nest rooms (4.4), Linked tells (3.5), help requests (2.9), the other programs (6.4). |
| **R5, the cut** | Delete the breach and campaign code and tests (`breach.mjs`, `campaign.mjs` and their views, sims and tests). They stay as GAME_RULES *Side modes* until then. |

Each phase ends with the balance checks: every class at 85%+ wins against a same-level room fight at 20–30% Signal
lost, and every new family passing rule 4 with the per-gene harness (genesim.mjs).
