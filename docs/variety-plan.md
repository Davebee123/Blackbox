# Variety plan: strains, objectives and the collection log

**Status.** The designer's current plan against burnout, cut into sessions. Built: one kind of component (session 1,
v47; GAME_RULES.md *Components*), and strains wave 1 with the spread (session 4; GAME_RULES.md *Strains and grades*).
Left: sessions 2, 3 and 5 to 8: the collection log, 16 new and mutated strains, and objectives. Session 4 left two
balance tests `todo` for the designer: the Warden's capstones at 50, and the climb's contract share (strain contracts
naming the new strains stall).

October 28, 2026. The designer: *"I still think variety is going to be the most important factor to prevent burnout."*
They picked three things from the suggestions: more strains, different objectives, and a collection log, then added a
fourth: one kind of component instead of a named one for every part. Each session ships lean (CLAUDE.md "Lean
first"), on its own branch, and ends pushed.

## Why these

- **Strains stop at level 11.** All eleven (Keylogger to Overrun) open between levels 3 and 11. From 12 to 50 a
  strain is a bigger copy of one you've met. The mechanics list (docs/mechanics-list.md) gave twenty built rules that
  roll nowhere yet (`PARTS.mech` 0). Strains are how they arrive.
- **Every fight asks the same thing.** Every fight but the Exfil is "break every part". A new objective makes a virus
  you know feel new, with no new art.
- **The grind has no visible shape.** Uniques, sets, research and achievements exist, but no one page shows them
  together, per family, strain, guard, boss and floor. (The System page's Collection lists uniques, faction pieces
  and sets only.)

## 1. Strains (S)

A strain today: a home family's lineage, a level (`from`), a depth (2: never on SPRAWL-00), an author crew, its fixed
genes, a tell, a rule, an answer, and its own parts (the Pulse Node and a special that replaces the signature). It
takes the plain family's place about half the time where it lives (`STRAIN_SHARE`, `variantFor`).

### 1.1 Eleven new strains, built by hand

A mechanics strain is the same shape, with the mechanics list's parts as its parts. It may carry three parts where a
feeder is the point. The designer has approved these pairings:

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

### 1.2 Strains spread as they mutate

The designer: strains are made by hand, but their parts can roll onto adjacent viruses as they mutate. So a strain
seeds its parts into its neighbourhood:

- **Who it reaches.** A wild virus of the strain's lineage, from the strain's level and depth, can roll one of the
  strain's mechanics parts as its third (a plain Ghostroot past level 12 can roll the Lurker's Opportunist).
- **How often.** Each spread part rolls at `PARTS.spread` (start: 0.5, the weight a third has against the others' 1).
  Parts stay at `PARTS.mech` 0 everywhere else, so a mechanic appears only where its strain lives.
- **How it reads.** The virus takes the part's adjective as any third does (a LURKING GHOSTROOT), and its Codex page
  names the strain it came from.
- **The feeder rule still holds.** A part that reads what the signature does (`sig`: the Predator, the Opportunist,
  the Feeder, the Backtrace) spreads only to a virus that has its signature.

### 1.3 Mutated strains: the old eleven, each with a mechanic

To make strains feel like more than a list, each of the old eleven gets a mutated form: the strain plus one
mechanics part that sharpens its lesson, named by that part's adjective. It is a third form of the strain (plain,
mutated, and its v2/v3 grades), arriving from about ten levels past the strain's own:

| Mutated strain | Adds | Why it fits |
|---|---|---|
| Leaking Keylogger | Leaker | Every command outside the window already costs; now every command does. |
| Junking Hashrat | Junker | Your cooldowns are already slow; now a key is gone too. |
| Amplified Floodgate | Amplifier | The ramp gets a boost on top. |
| Feeding Leech | Feeder | Two healers, one fed by what's on you. |
| Lurking Sleeper | Opportunist | Two things wake: one on a hit, one on a debuff. |
| Guarded Patchwork | Bodyguard | The heal and the shield both protect the part you're on. |
| Lagging Flicker | Jitter | Its even-cycle window, and your command arriving late. |
| Probing Extortion | Prober | The wind-up hit lands Exposed. |
| Volatile Echo | Volatile | Hits repeat, and cleansing has a price. |
| Vengeful Bricker | Vendetta | Rage below half, and harder with every break. |
| Counting Overrun | Countdown | Fragments, and a big turn that sends them all. |

### 1.4 How much content this is

The designer worried eleven isn't much. It isn't, alone. Counted as what a level-20 player meets:

- **Today:** three families and eleven strains, each with one objective. About 14 kinds of fight.
- **After:** three families, 22 strains and 11 mutated strains is 36 bodies. Spread mechanics vary each family's
  wild fights, and half of all room fights carry one of five objectives (section 2). That makes about 36 × 5, near
  180 kinds of fight, before mutations and grades.

What makes a kind feel new is that it asks for a different move. Every one above does, which is the puzzle fights'
bar (docs/puzzle-fights.md). Parts plan P3 and P4's families (the Cryptominer, the Wiper) bring strains for 30 to 50.

**Each strain ships with** its `STRAINS` entry (parts, rule, answer, tell), its Codex page, a genesim probe, a unit test
that it builds and its pair interacts, and the docs. Balance is the full suite. A strain is a deliberate change to the
mix, so where a balance test moves, the session reports it rather than bending the planner.

## 2. Objectives (O)

An objective changes what wins a fight, never the virus. Today there are two: break every part, and the Exfil (break
it before its upload completes, `e.escapeAt`). Four more, each something a server room can carry:

| Objective | What wins | Missing it | Board mark |
|---|---|---|---|
| **Uptime** | Your Signal stays up for N cycles (start: 8). The virus can't be broken. Its attacks speed up as the timer runs. | You disconnect as usual. | A countdown in the phase strip. |
| **Priority** | Break the marked part within N cycles (start: 5). The rest can stand. | The fight goes on as a normal fight, without the bonus. | A target mark on the part, and its cycles left. |
| **Backup** | A friendly process on the board survives the fight. The virus hits it instead of you on some attacks. | The fight goes on, without the bonus. | The process's own row and bar, in its own look. |
| **Clean run** | Break every part while carrying no status at the end of any cycle. | The fight goes on, without the bonus. | A chip that breaks the first time a status sticks. |

- **How often:** one fight room in two on a server (the designer's call).
- **The bonus:** a better drop chance, more XP and more components.
- **Missing one:** friction, not spikes. You lose the bonus and fight on. Only Uptime ends on your Signal, as every
  fight already can.
- **Where:** a fight room on a server (`floorplan.mjs`). Its map mark and room card say which objective, so you choose
  to walk in.
- **The Backup's look:** its own, not teal, which is only ever you. Session 6 shows two or three options first. Each
  colour already means one thing (teal you, red threat, amber loot and what you use, violet daemons, steel armor).
- **The engine:** one `objective` on the encounter (`{ kind, n, part?, failed?, met? }`), set as the room's fight
  starts. A module (`objectives.mjs`, as mechanics.mjs) holds each rule, mark, tooltip and check, and `finish` pays
  the bonus. The Exfil moves onto it as the first objective, with no change to how it plays.

**One trick a fight.** From level 6, every ordinary fight carries exactly one *lever*: a part whose rule makes the
obvious move the wrong one (the Tripwire, the Zip Bomb, the Mimic, the Lockbox…; docs/puzzle-levers.md 5). With an
objective on half the fights, the question is whether those fights also bring a lever. **Decided (the designer: try it): an
objective takes the lever's place.** The objective is that fight's trick, and a fight with both an objective and a lever reads
busy. The other half of fights keep their lever, so nothing about the puzzles is lost.

## 3. The collection log (C)

One page that shows everything you can collect, what you have, and what's left. Daemons have their own log, so this
one leaves them out.

**What it lists, per entry** (a family, a strain, a guard, a boss, a floor):
- **Uniques:** the uniques its kills can drop.
- **Sets:** the set pieces it drops, with the set's progress.
- **Research:** each part mastered (research 60), with the mastered star.
- **Beaten:** the strain, its mutated form, and each objective done against it.
- **Feats:** its achievements.

There are no component slots.

**Each slot** shows ??? and a one-line hint until you get it, then the item and the date it first came. A count, n of N,
on every entry and in the index. The first time a slot fills, one pager line says so.

**Rewards stay cosmetic and come from achievements** (CLAUDE.md "Unlocks"). Filling an entry, a family's or a floor's
earns an achievement, whose reward is a title, a sticker, a banner or a casing colourway.

**Data.** A save keeps `s.collection = { [slot]: when }`. An older save fills it on load from what it already holds
(uniques and set pieces it owns, research at 60, achievements earned), quietly, with one pager line.

**Open point for the designer.** The Collection on the System page exists (GAME_RULES *Collection log*), and
`s.collection` already holds `{ [unique]: when }` for it. The log either grows out of that card (slots keyed so a
unique's slot is its id) or replaces it; it must not keep two collections.

**Where it lives.** A tab of the Codex. The look has real alternatives, so session 1 shows two or three as
screenshots first: a grid of item slots per entry, a list with progress bars, or slots on each Codex page.

## 4. One kind of component (K)

**Done (v47).** Components are one currency, a count (GAME_RULES *Components*). The collection log never lists them.

## 5. Sessions

Each is one fresh session on its own branch, merged into main when its full suite passes, using one agent at most.
The prompt to paste is under each.

| # | Session | Depends on | Size |
|---|---|---|---|
| 1 | One kind of component (section 4): **done** | nothing | small |
| 2 | Collection log: the look, as screenshots | 1 | small |
| 3 | Collection log: build the picked look | 2 and the designer's pick | medium |
| 4 | Strains wave 1: Lurker to Bodysnatcher, and the spread rule: **done** | nothing | medium |
| 5 | Strains wave 2: Thornwall to Sweatshop | 4 merged | medium |
| 6 | Strains wave 3: the eleven mutated strains | 4 merged | medium |
| 7 | Objectives: the engine, the Exfil on it, Priority and Uptime, one room in two | the answer on levers | medium |
| 8 | Objectives: Backup (its look first, as screenshots) and Clean run | 7 merged | medium |

Sessions 2, 4 and 7 touch different files and can run side by side. Sessions 5 and 6 can too, once 4 is merged.

**Session 2.** *Read docs/variety-plan.md section 3. Show the designer two or three looks for the collection log as
screenshots, using real data (a fresh save and a veteran's). Don't build the system yet: mock the page with real
content in the Codex tab. Scripts and screenshots stay in the scratchpad.*

**Session 3.** *Read docs/variety-plan.md section 3 and the look the designer picked. Build the collection log lean:
`s.collection`, the fill from an older save, the Codex tab in the picked look, the first-time pager line, and the
achievements for a filled entry. Unit tests and docs. Full suite once at the end, then push.*

**Session 4.** *Read docs/variety-plan.md section 1 and docs/mechanics-list.md. Build strains wave 1 lean: Lurker,
Bloodhound, Scythe, Doomsday, Bad Blood and Bodysnatcher in `STRAINS`, from the mechanics list's parts, with rule,
answer, tell, author toolkits, genesim probes, a unit test each and the docs. Add the spread rule (section 1.2,
`PARTS.spread`). Report any balance test that moves; don't tune the planner to it. Full suite once at the end, then
push.*

**Session 5.** *The same as session 4, for Thornwall, Desync, Junkyard, Last Stand and Sweatshop (the spread rule is
already built).*

**Session 6.** *Read docs/variety-plan.md section 1.3. Add the eleven mutated strains lean: each old strain's mutated
form with its one mechanics part, named by the part's adjective, from about ten levels past the strain's own, with
its Codex page, a unit test each and the docs. Full suite once at the end, then push.*

**Session 7.** *Read docs/variety-plan.md section 2. Build the objectives engine lean (objectives.mjs, the encounter's
`objective`, its board mark and tooltip, the bonus in `finish`: drop chance, XP and components). Move the Exfil onto
it with no change in play. Add Priority and Uptime, rolled on one server fight room in two, with their map mark and
room card, following the designer's answer on levers. A unit test each and the docs. Full suite once at the end, then
push.*

**Session 8.** *Read docs/variety-plan.md section 2. Show the designer two or three looks for the Backup process as
screenshots, and build the picked one. Add Backup and Clean run to objectives.mjs, with a unit test each and the docs.
Full suite once at the end, then push.*

## 6. The designer's answers

- The eleven pairings stand.
- Strains spread their parts to adjacent viruses (1.2).
- Objectives appear in one fight room in two.
- The bonus is drop chance, XP and components.
- The Backup gets its own look.
- The log leaves daemons out (they have their own) and covers uniques and sets.
- An objective takes the lever's place in its fight (try it, and see how it plays).
- The mutated strains (1.3) are a third wave, with their eleven pairings.

Nothing is open. A session asks the designer only where its own section says to show options.
