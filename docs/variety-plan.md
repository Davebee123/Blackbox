# Variety plan: strains, objectives and the collection log

October 28, 2026. The designer: *"I still think variety is going to be the most important factor to prevent burnout."*
They picked three things from the suggestions: more strains, different objectives, and a collection log. This is the
plan, cut into sessions. Each session ships lean (CLAUDE.md "Lean first"), on its own branch, and ends pushed.

## Why these three

- **Strains stop at level 11.** All eleven (Keylogger to Overrun) open between levels 3 and 11. From 12 to 50 a
  strain is a bigger copy of one you've met. The mechanics list (docs/mechanics-list.md) gave twenty built rules that
  roll nowhere yet (`PARTS.mech` 0). Strains are how they arrive: one named pairing at a time, at a level chosen for it.
- **Every fight asks the same thing.** Every fight but the Exfil is "break every part". A new objective makes a virus
  you know feel new, with no new art.
- **The grind has no visible shape.** Research, components, uniques and achievements exist, but nothing shows what
  you've collected and what is still missing. Old School RuneScape players grind for years to fill one page like that.

## 1. Strains (S)

A strain today: a home family's lineage, a level (`from`), a depth (2: never on SPRAWL-00), an author crew, its fixed
genes, a tell, a rule, an answer, and its own parts (the Pulse Node and a special that replaces the signature). It
takes the plain family's place about half the time where it lives (`STRAIN_SHARE`, `variantFor`).

A mechanics strain is the same shape, with the mechanics list's parts as its parts. It may carry three parts where a
feeder is the point. Each one is a pairing from docs/mechanics-list.md "Do combinations need to spawn together?",
option C: pairs are made by hand. Nothing else about the mechanics changes, and `PARTS.mech` stays 0.

Proposed (names, levels and pairings for the designer to change):

| Strain | Family, author | Level | Parts | The lesson |
|---|---|---|---|---|
| **Lurker** | Ghostroot, PALEMASK | 12 | Pulse, Scrambler, Opportunist | Stay clean, or it wakes. |
| **Bloodhound** | Ransomware, TOLLGATE | 13 | Pulse, Encryptor, Predator | Cleanse now, or race it. |
| **Scythe** | Ransomware, TOLLGATE | 14 | Pulse, Volatile, Harvester | Cleansing has a price, and so does waiting. |
| **Doomsday** | Worm, SWARMLINE | 15 | Pulse, Countdown, Leaker | Every command counts toward the big turn. |
| **Bad Blood** | Worm, SWARMLINE | 16 | Pulse, Vendetta, Amplifier | The kill order shifts every cycle. |
| **Bodysnatcher** | Ghostroot, NULL CHOIR | 18 | Pulse, Swap, Stunner | Choose where your debuffs land. |
| **Thornwall** | Worm, SWARMLINE | 20 | Pulse, Bodyguard, Thorns | Switch targets, and burn what bites back. |
| **Desync** | Ghostroot, PALEMASK | 22 | Pulse, Jitter, Sandbox | Your command lands late, and only quiet ones land. |
| **Junkyard** | Worm, GLASSJAW | 24 | Pulse, Junker, Backtrace | Clear the junk before it calls for help. |
| **Last Stand** | Ghostroot, PALEMASK | 26 | Pulse, Turncoat, Prober | Stay over half, or take it Exposed and Scrambled. |
| **Sweatshop** | Ransomware, GLASSJAW | 28 | Pulse, Encryptor, Feeder | Every debuff you carry heals it. |

That fills levels 12 to 28. Levels 30 to 50 wait for parts plan P3 and P4's families (the Cryptominer, the Wiper),
which bring their own strains.

**Each strain ships with** its entry in `STRAINS` (parts, rule, answer, tell), its Codex page (the Strains group reads
`STRAINS`), a genesim probe (named builds already have one each), a unit test that it builds and its pair interacts,
and the docs. Its author's toolkit gains its genes. Balance is the full suite: a strain is a deliberate change to the
mix, so where a balance test moves, the session reports it rather than bending the planner (docs/mechanics-list.md
"As built").

## 2. Objectives (O)

An objective changes what wins a fight, never the virus. Today there are two: break every part, and the Exfil (break
it before its upload completes, `e.escapeAt`). Proposed, each an objective a server room can carry:

| Objective | What wins | Missing it | Board mark |
|---|---|---|---|
| **Uptime** | Your Signal stays up for N cycles (start: 8). The virus can't be broken. Its attacks speed up as the timer runs. | You disconnect as usual. | A countdown in the phase strip. |
| **Priority** | Break the marked part within N cycles (start: 5). The rest can stand. | The fight goes on as a normal fight, without the bonus. | A red target mark on the part, and its cycles left. |
| **Backup** | A friendly process on the board (teal: it's yours) survives the fight. The virus hits it instead of you on some attacks. | The fight goes on, without the bonus. | The process's own row and bar, in teal. |
| **Clean run** | Break every part while carrying no status at the end of any cycle. | The fight goes on, without the bonus. | A chip that breaks the first time a status sticks. |

**The rule for failure: friction, not spikes.** A missed objective never costs more than the fight would have. You lose
the bonus and fight on. Only Uptime ends on your Signal, as every fight already can.

**Where they appear.** A fight room on a server (`floorplan.mjs`) rolls one sometimes. Its map mark and room card say
which, so you can choose to walk in. The reward is the room's usual one, plus a bonus when you make the objective:
more components, a better drop chance, research.

**Engine shape.** One `objective` on the encounter (`{ kind, n, part?, failed?, met? }`), set when the room's fight
starts. A small module (`objectives.mjs`, as mechanics.mjs) holds each rule, its board mark, its tooltip and its
check. `finish` reads it for the bonus. The Exfil moves onto it as the first objective, with no change to how it plays.

## 3. The collection log (C)

One page that shows everything you can collect, what you have, and what's left. Old School RuneScape's log, in this
game's words.

**What it lists, per entry** (a family, a strain, a guard, a boss, a floor):
- **Components:** each part's drop (Fuse Wire, Thermal Pad…), got or ???.
- **Uniques:** the boss and floor uniques its kills can drop.
- **Research:** each part mastered (research 60), with the mastered star.
- **Feats:** its achievements (a strain beaten without its lesson's mistake, a boss's).

**Each slot** shows ??? and a one-line hint until you get it, then the item and the date it first came. A count, n of N,
on every entry and in the index. The first time a slot fills, one pager line says so ("Collection log: Fuse Wire").

**Rewards stay cosmetic and come from achievements** (CLAUDE.md "Unlocks"). Filling an entry, a family's or a floor's
earns an achievement, whose reward is a title, a sticker, a banner or a casing colourway.

**Data.** A save keeps `s.collection = { [slot]: when }`. An older save fills it on load from what it already holds:
components in the stash, uniques owned or dismantled where the save knows them, research at 60, achievements earned.
That fill is quiet, with one pager line, as achievements did.

**Where it lives.** A tab of the Codex, beside the index (the Codex already groups every kind of virus). The look has
real alternatives, so the session shows two or three as screenshots first (CLAUDE.md "Design choices"): a grid of
item slots per entry, a list per entry with progress bars, or slots on each Codex page.

## 4. Sessions

Each is one fresh session on its own branch, merged into main when its full suite passes. Each uses one agent at
most. The prompt to paste is under each.

| # | Session | Depends on | Size |
|---|---|---|---|
| 1 | Collection log: the look (options as screenshots) | nothing | small |
| 2 | Collection log: build the picked look | 1, the designer's pick | medium |
| 3 | Strains wave 1: Lurker to Bodysnatcher (six, levels 12 to 18) | the designer's answers to section 5 | medium |
| 4 | Strains wave 2: Thornwall to Sweatshop (five, levels 20 to 28) | 3 merged | medium |
| 5 | Objectives: the engine, the Exfil moved onto it, Priority and Uptime | nothing | medium |
| 6 | Objectives: Backup and Clean run, and their rooms on servers | 5 merged | medium |

Sessions 1, 3 and 5 can run side by side: they touch different files. 2 should come after 4 if it is to list the new
strains on day one, but it reads `STRAINS`, so it picks them up whenever they land.

**Session 1.** *Read docs/variety-plan.md section 3. Show the designer two or three looks for the collection log as
screenshots, using the save's real data (a fresh save and a veteran's). Don't build the system yet: mock the page with
real content in the Codex tab. Scripts and screenshots stay in the scratchpad.*

**Session 2.** *Read docs/variety-plan.md section 3 and the look the designer picked. Build the collection log lean:
`s.collection`, the fill from an older save, the Codex tab in the picked look, the first-time pager line, and the
achievements for a filled entry. Unit tests and docs. Full suite once at the end, then push.*

**Session 3.** *Read docs/variety-plan.md sections 1 and 5 (the designer's answers) and docs/mechanics-list.md. Build
strains wave 1 lean: Lurker, Bloodhound, Scythe, Doomsday, Bad Blood and Bodysnatcher in `STRAINS`, from the mechanics
list's parts, with rule, answer, tell, author toolkits, genesim probes, a unit test each and the docs. Report any
balance test that moves; don't tune the planner to it. Full suite once at the end, then push.*

**Session 4.** *The same as session 3, for Thornwall, Desync, Junkyard, Last Stand and Sweatshop.*

**Session 5.** *Read docs/variety-plan.md section 2. Build the objectives engine lean (objectives.mjs, the encounter's
`objective`, its board mark and tooltip, the bonus in `finish`), move the Exfil onto it with no change in play, and add
Priority and Uptime with a unit test each and their playtest pages. Full suite once at the end, then push.*

**Session 6.** *Read docs/variety-plan.md section 2. Add Backup and Clean run to objectives.mjs, then roll objectives
onto server fight rooms (floorplan.mjs) with their map mark and room card. Unit tests and docs. Full suite once at the
end, then push.*

## 5. Questions for the designer

1. **The strains.** Keep, rename or re-pair any of the eleven? Are levels 12 to 28 right?
2. **Do strains turn on their parts?** Once Lurker exists, should the Opportunist also roll as a plain third
   (`PARTS.weight`), or only inside its strain until you've played it?
3. **Objectives and the one-lever rule.** Does an objective count as the fight's lever (docs/puzzle-levers.md 5), or
   come on top of it?
4. **How often objectives appear.** Start at one fight room in four on a server?
5. **The objective bonus.** Components, a better drop chance, or research?
6. **The Backup process.** Teal is only ever the player. Is a friendly process "you", or does it need its own look?
7. **The collection log's scope.** Families, strains, guards, bosses and floors, or also daemons, sets and gear?
