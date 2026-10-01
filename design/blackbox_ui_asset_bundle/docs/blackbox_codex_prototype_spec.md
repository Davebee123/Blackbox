# BLACKBOX — Cyberpunk MUD Prototype Systems & UI Specification

## Purpose

Implement the core gameplay systems inside the existing game shell. Do not rebuild the overall application or substantially redesign the existing framework unless required to support these systems.

The prototype exists to answer one primary question:

> **Is it fun to fight hostile software by rapidly alternating between offensive attacks on its subsystems and defensive responses to its actions?**

The game should feel like an RPG played through an underground hacker terminal, not like a realistic hacking simulator.

Players should not need prior knowledge of servers, networking, or programming.

---

# 1. Core Game Fantasy

The player is a hacker belonging to a group that owns a shared server.

The server functions as the group’s base and houses things such as:

- Currency
- Items
- Technology
- Research
- Mission information
- Player-created programs

Hostile viruses and rogue programs periodically attack the server.

Players personally fight these threats.

Defeating threats may allow the player to trace where they came from, eventually revealing cyber locations that can later be explored.

Programs are **not combat creatures**.

Programs will eventually be built and deployed into cleared cyber locations to perform jobs such as:

- Extraction
- Surveillance
- Tracing
- Mining
- Sabotage

That program-deployment system does not need to be fully implemented in this prototype.

---

# 2. Core Gameplay Loop

The long-term gameplay loop is:

1. A hostile virus attacks the group server.
2. The player defends the server in real-time combat cycles.
3. The player may trace the virus origin while fighting.
4. A successful trace reveals a new cyber location.
5. The player later explores/hacks that location.
6. The player extracts resources, technology, and information.
7. Cleared locations can eventually host player-built programs.
8. Those programs generate resources/intelligence or perform strategic tasks.
9. Server and hacker progression increase.
10. Stronger and more varied threats appear.
11. Eventually the player discovers other player-controlled servers, alliances, and enemies.

For this prototype, focus only on the combat and immediate post-combat systems.

---

# 3. Combat Philosophy

Combat should be:

- Fast
- Readable
- Numeric
- Tactical
- Command-driven
- Understandable to nontechnical players

The terminal aesthetic is important.

Players should type abilities such as:

```text
spike replicator
interrupt
exploit shell
trace
```

They should NOT need to type realistic syntax such as:

```text
network --pid 302 --force --subnet=4
```

Commands should feel like RPG abilities expressed through a terminal.

The player should be making decisions, not remembering syntax.

---

# 4. Combat Cycles

Combat runs in synchronized **5-second cycles**.

During each cycle:

1. The enemy’s current actions are clearly displayed.
2. The player may submit **one ability**.
3. The player can replace their queued action until near the end of the cycle.
4. At the end of the cycle, actions resolve.
5. The next cycle begins immediately.

For the solo prototype there is only one player action per cycle.

## Resolution Order

Use this order consistently:

1. Resolve player ability.
2. Apply damage/status changes.
3. Destroy any subsystem that reached 0 Integrity.
4. Cancel enemy actions associated with destroyed or interrupted subsystems.
5. Resolve enemy actions whose timers expire.
6. If the virus Core is still alive, apply its baseline Corruption damage.
7. Tick cooldowns and status durations.
8. Begin next cycle.

This means a player can destroy or interrupt a component on the last possible cycle and prevent its action.

Destroying the Core immediately ends combat.

---

# 5. Server Integrity

The server has persistent health:

```text
SERVER INTEGRITY
100 / 100
```

Every virus Core deals automatic **Corruption damage** to Server Integrity every cycle while alive.

Example:

```text
VOIDWORM CORE
Corruption: 4 / cycle
```

This is the fundamental reason the player cannot safely spend forever dismantling every enemy component.

## Foundational Rule

> **As long as the virus Core exists, the server is taking damage.**

Destroying offensive components reduces special threats but does NOT stop baseline Corruption.

Server Integrity persists after combat.

For the prototype, provide a simple post-combat Repair action so Integrity matters across multiple encounters.

Make repair cost configurable.

Suggested prototype value:

```text
1 Credit = 1 Integrity repaired
```

Do not treat this number as final balance.

If Server Integrity reaches 0, display a **SERVER CRASHED** state.

Permanent server deletion is outside prototype scope.

---

# 6. Virus Anatomy

Viruses behave somewhat like MechWarrior enemies.

They contain separately targetable systems.

Every virus has a Core and may have a Shell and several Components.

## Core

The kill condition.

The Core:

- Has Integrity
- Deals baseline Corruption every cycle
- May have innate behaviors
- Ends the encounter when destroyed

The Core should generally remain targetable unless a specific enemy mechanic explicitly hides it.

## Shell

Optional defensive layer.

The Shell does not completely prevent Core attacks.

Instead:

```text
Shell active:
Core receives 50% damage
```

Destroying Shell removes this reduction.

This creates a choice:

- Attack Core through armor and try to end the fight quickly
- Spend cycles destroying Shell to make later Core attacks stronger

## Components

Components provide additional behavior.

Examples:

```text
Replicator
Mobility Node
Encryptor
Mask
Trace Scrambler
Decoy Generator
Uplink
```

There should **not** be a universal generic `PAYLOAD` component.

Components should exist because they create a specific tactical problem.

Destroying a component permanently disables the behavior associated with that component.

---

# 7. Core vs Component Decision

This is a foundational combat rule.

Components make the virus more dangerous.

The Core is what continuously damages the server.

Therefore:

## Core Rush

The player ignores some enemy capabilities and kills the virus quickly.

Advantages:

- Less total Corruption
- Faster victory
- Prevents all remaining component actions once Core dies

Disadvantages:

- Special enemy attacks may succeed before the Core dies

## Component Dismantling

The player destroys dangerous systems before finishing the Core.

Advantages:

- Prevents dangerous special effects
- Makes the encounter safer

Disadvantages:

- Virus stays alive longer
- Server takes more total Corruption

There should NOT be a universally correct choice.

---

# 8. Initial Player Abilities

Keep the prototype ability set small.

## `spike [target]`

Basic offensive attack.

Examples:

```text
spike core
spike replicator
```

Suggested base damage:

```text
25
```

No cooldown.

---

## `exploit [target]`

Applies:

```text
EXPOSED
```

for 2 cycles.

Exposed subsystem receives:

```text
+50% incoming damage
```

Exploit itself deals little or no damage.

Suggested cooldown:

```text
2 cycles
```

---

## `overload [target]`

Heavy offensive attack.

Suggested base damage:

```text
40
```

Suggested cooldown:

```text
3 cycles
```

Benefits strongly from EXPOSED.

Example combo:

```text
exploit replicator
overload replicator
```

---

## `interrupt`

Cancels the enemy action currently being prepared.

Interrupt does NOT damage the associated component.

Suggested cooldown:

```text
2 cycles
```

This is the player’s primary defensive response.

If multiple enemy actions exist later, support:

```text
interrupt encryptor
```

For the first implementation, automatically target the only interruptible action if just one exists.

---

## `scan`

Reveals information.

Depending on the enemy it may reveal:

- Mutation
- Hidden subsystem
- Weakness
- Behavior
- Upcoming special condition

Scan should not be mandatory every encounter.

Previously encountered Virus Families should have some information automatically known.

---

## `trace`

Improves the post-combat Origin Trace reward.

Tracing is optional.

Using it costs a combat cycle, meaning the player intentionally allows the virus to remain alive longer.

This creates a direct risk/reward decision.

Suggested prototype:

```text
trace = +25 Trace progress
100 Trace = guaranteed location discovery
```

Partial Trace can provide lesser rewards or progress.

---

# 9. Damage, Status, and Combos

The system should support simple but meaningful offensive combinations.

Example:

```text
exploit encryptor
overload encryptor
```

This should deal much more damage than using Overload alone.

The goal is to create tactical sequencing without requiring dozens of abilities.

Possible statuses for prototype:

- EXPOSED
- INTERRUPTED
- ARMORED
- REGENERATING
- HIDDEN
- DISABLED

Keep the status vocabulary small.

---

# 10. Emergency File Lock

Some enemies may target stored assets.

The player has an emergency command:

```text
lock files
```

This is **not** intended as a normal rotation ability.

It is a last-resort action.

## Effect

Immediately:

- Prevent all further theft, encryption, or corruption of stored assets
- Files stay locked for the rest of combat
- They CANNOT be unlocked during the encounter

## Cost

After combat, File Recovery is required.

While recovering:

- Stored items/currency cannot be accessed
- File-based research is paused
- File-dependent operations are paused or terminated

The exact recovery duration should be configurable.

For prototype testing, use a short value such as:

```text
60 seconds
```

Production values may be substantially longer.

The important design principle is:

> **Lock Files guarantees protection, but creates painful post-combat downtime.**

---

# 11. Simple Server Targets

Avoid realistic computer architecture.

The average player should understand every target immediately.

Use these four high-level categories:

| Target | Meaning |
|---|---|
| Files | Stored valuables, items, research, mission data |
| Operations | Programs/jobs currently running outside the server |
| Connection | The route connecting the server to the wider network |
| Server | Overall server integrity |

Enemy special attacks may threaten one of these.

Do not introduce terms such as subnet, kernel, routing table, process tree, memory bank, etc. as required mechanics.

They may appear as flavor text only.

---

# 12. Virus Generation

Enemies should NOT be static puzzles.

Generate encounters using:

```text
Virus Family
+
Mutation
+
Target
```

Optional later:

```text
+
Secondary Mutation
+
Environment
```

The player should learn what an enemy family generally does without permanently solving every encounter from that family.

---

# 13. Virus Families

Implement at least three for the prototype.

## A. Worm

Identity:

**Replication**

Typical anatomy:

```text
Core
Shell
Replicator
```

Optional:

```text
Mobility Node
```

Core continues causing Corruption.

Replicator periodically creates additional threats.

Destroying Replicator stops replication but does not stop Core Corruption.

---

## B. Ransomware

Identity:

**Threatens stored assets**

Typical anatomy:

```text
Core
Shell
Encryptor
```

Encryptor periodically attempts to encrypt/corrupt Files.

Player may:

- Interrupt it
- Destroy Encryptor
- Race Core
- Use emergency File Lock

---

## C. Ghostroot

Identity:

**Concealment / information warfare**

Typical anatomy:

```text
Core
Mask
Trace Scrambler
```

Mask may hide some information or Core targeting until damaged/scanned.

Trace Scrambler reduces Trace opportunities.

The player may choose between killing Ghostroot quickly or prolonging combat to preserve/recover Trace information.

---

# 14. Mutations

Each encounter should receive at least one mutation.

Implement several of these.

## Armored

One component gains increased Integrity.

## Regenerative

One component restores Integrity if it goes several cycles without taking damage.

## Reactive

Using a specific action triggers a response.

Example:

```text
Interrupting this virus temporarily strengthens its Shell.
```

## Redundant

The virus has two copies of an important component.

Example:

```text
Replicator A
Replicator B
```

Destroying one weakens replication but does not fully stop it.

## Polymorphic

Periodically changes which subsystem is vulnerable or gains temporary resistance to repeated attacks.

## Migratory

Can relocate or alter target selection when threatened.

Mutations should preferably change decisions rather than merely add numerical stats.

---

# 15. Why Repeated Enemies Stay Interesting

Enemies are archetypes, not fixed puzzles.

A Ghostroot should always be recognizable as a Ghostroot, but the player should not know the exact solution before combat begins.

Example structure:

```text
Family: Ghostroot
Target: Connection
Mutation: Reactive
Secondary Mutation: Unknown
```

The player recognizes the broad threat but still needs to adapt.

This should make prior knowledge useful without making future encounters trivial.

---

# 16. Threat Rating

Each virus should have a Threat value.

Threat should influence:

- Core Integrity
- Component Integrity
- Core Corruption
- Special-action frequency
- Mutation count
- Mutation strength

Do NOT make difficulty purely numerical.

Suggested conceptual progression:

```text
Low Threat
Simple family behavior
0–1 mutation

Medium Threat
Family behavior
1 mutation
Multiple targetable components

High Threat
1–2 mutations
More simultaneous pressures
More complex component interaction

Boss
Custom rules
Multiple components
Unique behaviors
```

---

# 17. Player Progression Framework

Do NOT implement ability purchasing from stores.

Abilities should eventually be learned through **Talent Trees**.

Use three conceptual disciplines.

## Systems

Defensive/server-focused hacker.

Potential talents affect:

- Interrupt
- File Lock recovery
- Repair
- Component disabling
- Defensive efficiency

## Recon

Information and tracing.

Potential talents affect:

- Scan
- Trace
- Mutation discovery
- Hidden components
- Location discovery

## Intrusion

Offensive combat.

Potential talents affect:

- Spike
- Exploit
- Overload
- Core damage
- Component damage
- Exposed bonuses

For the first combat prototype, a complete talent tree is unnecessary.

Instead, make ability numbers data-driven so talents can modify them later.

Optionally provide 3 preset test builds:

```text
Systems
Recon
Intrusion
```

with small stat differences.

---

# 18. Programs as Payloads / Deployables

Programs are not creatures and do not fight viruses directly.

Long-term, programs should function as deployable tools/payloads installed in cleared cyber locations.

Examples:

- Extractor
- Scraper
- Tracer
- Backdoor
- Relay
- Cryptominer
- Watcher
- Cleaner
- Saboteur

Programs should eventually have their own stats and customization, such as:

- Extraction
- Stealth
- Speed
- Footprint
- Modules

The player personally handles combat.

Programs perform strategic tasks after a cyber location is secured.

This system is outside the prototype scope but should be considered when structuring future data models.

---

# 19. Example Prototype Encounter 1 — CRYPTJACK

```text
CRYPTJACK
Family: Ransomware
Mutation: Armored
Target: Files

SERVER INTEGRITY: 100

CORE        120
SHELL        60
ENCRYPTOR    55

CORE CORRUPTION:
4 / cycle

SHELL:
Core receives 50% damage while active.

ENCRYPTOR:
Encrypt Files
Every 3 cycles
```

The player can choose:

## Core Rush

Accept file risk and try to kill Cryptjack quickly.

## Destroy Encryptor

Stop file attacks but suffer additional Corruption while dismantling it.

## Interrupt Repeatedly

Temporarily prevent encryption without permanently solving it.

## Lock Files

Guarantee asset safety but trigger post-combat File Recovery.

## Trace

Spend even more time alive to potentially discover where Cryptjack came from.

There should be multiple viable strategies.

---

# 20. Example Prototype Encounter 2 — SPLINTER

```text
SPLINTER
Family: Worm
Mutation: Regenerative
Target: Operations

CORE        110
SHELL        40
REPLICATOR   55

CORE CORRUPTION:
3 / cycle

REPLICATOR:
Replication completes every 4 cycles.
```

When replication succeeds, create a temporary child process:

```text
SPLINTER_FRAGMENT

CORE: 40
CORRUPTION: 1 / cycle
```

Fragments do not need full anatomy in prototype.

Destroying the original Replicator prevents future fragments.

The tactical question:

> Can the player kill Core before replication becomes a serious problem, or should Replicator be removed first?

---

# 21. Example Prototype Encounter 3 — GHOSTROOT

```text
GHOSTROOT
Family: Ghostroot
Mutation: Reactive
Target: Connection

CORE              100
MASK               45
TRACE SCRAMBLER    45

CORE CORRUPTION:
3 / cycle
```

Initially:

```text
CORE damage reduction: 75%
```

while Mask exists.

Destroying or sufficiently exploiting Mask lowers the protection.

Trace Scrambler removes:

```text
10 Trace progress every 2 cycles
```

Reaction mutation:

```text
When INTERRUPTED:
Mask gains 10 temporary Integrity.
```

The player must decide whether to:

- Break Mask
- Kill Trace Scrambler
- Push damage through Mask
- Spend cycles Tracing
- Ignore Trace entirely and end the fight

---

# 22. Combat Balancing Principle

There must be no universally optimal targeting rule.

Specifically test against:

**Always Core First**

and

**Always Components First**

Both should fail to be optimal across the complete encounter set.

Sometimes the right answer should be:

```text
core → core → core → kill
```

Sometimes:

```text
replicator → core
```

Sometimes:

```text
interrupt → shell → core
```

Sometimes:

```text
trace → trace → core
```

Sometimes:

```text
lock files → core
```

The current state of the server and the player’s priorities should affect the answer.

---

# 23. Data-Driven Design

Virus families, mutations, abilities, and components should be configurable rather than hard-coded into encounter logic.

Suggested conceptual structures:

```text
VirusFamily
VirusInstance
VirusComponent
Mutation
EnemyAction
PlayerAbility
StatusEffect
Encounter
ServerState
```

A Virus Instance should be assembled from:

```text
family
mutation(s)
target
component stats
core corruption
threat rating
```

This should allow future procedural combinations without creating unique combat code for every enemy.

---

# 24. Debug / Balance Telemetry

Add a developer/debug summary after every encounter:

```text
Encounter duration:
Cycles elapsed:

Player actions:
Spike:
Exploit:
Overload:
Interrupt:
Scan:
Trace:
Lock Files:

Damage dealt:
Core:
Shell:
Components:

Server Corruption taken:

Special enemy actions completed:
Special enemy actions interrupted:

Trace achieved:

Files locked:
Yes / No

Result:
Victory / Server Crash
```

This is important for balancing.

Specifically watch whether players:

- Always attack Core
- Always attack the dangerous component
- Never use Trace
- Never use Interrupt
- Always use File Lock
- Ignore mutations

Those patterns would indicate design problems.

---

# 25. Prototype Scope

Implement:

1. Five-second combat cycles
2. Typed player abilities
3. Server Integrity
4. Persistent Corruption damage
5. Core + Shell + component targeting
6. Numeric damage
7. Exposed status
8. Cooldowns
9. Enemy telegraphed actions
10. Interrupts
11. Trace
12. Emergency File Lock
13. Post-combat File Recovery
14. Three Virus Families
15. Several Mutations
16. Three hand-designed test encounters
17. Basic randomized variants
18. Debug/balance telemetry

Do NOT currently implement:

- PvP
- Multiplayer combat
- Full cyber-world exploration
- Program crafting
- Remote program deployment
- Full talent trees
- Guild/server ownership systems
- Permanent server deletion
- Complex loot
- Realistic hacking commands
- Large content libraries

The prototype should remain focused on determining whether the combat itself is enjoyable.

---

# 26. Definition of Combat Success

The prototype is successful if the player regularly experiences decisions like:

> “I can probably kill the Core before that Replicator fires.”

> “I can’t afford another encryption attack. I need to disable the Encryptor.”

> “The server is already badly damaged. I need to end this quickly.”

> “I could kill this right now, but I really want the Trace.”

> “This is getting out of control. Lock the files.”

The ideal combat rhythm is:

> **Read threat → choose offense or defense → type ability → see immediate numeric/system impact → reassess next cycle.**

The player should feel like a hacker fighting hostile software while still receiving the numerical progression, targeting decisions, and buildcraft expected from an RPG.

---

# 27. BLACKBOX UI / Visual Design Direction

The in-world software suite is named **BLACKBOX**.

BLACKBOX is an underground cyber-operations tool used by hackers to manage their server, investigate the network, trace hostile software, and fight viruses.

The interface should feel:

- Underground and illicit
- Lived-in rather than corporate
- Dense enough to feel powerful
- Understandable to a player with no hacking/server knowledge
- Modern and highly readable
- Slightly grimy, but never visually broken

The primary UX rule is:

> **Show the player what matters right now. Keep everything else available, but visually subordinate.**

Do not pursue information density merely to imitate a hacker terminal.

The supplied visual reference is inspiration for atmosphere, panel structure, typography, and technical confidence only.

**Do not reproduce its layout or visual design directly.**

---

# 28. BLACKBOX Application Model

BLACKBOX should appear to be **one main software application with internal panels**.

Do not simulate an entire desktop containing many movable application windows.

BLACKBOX itself may contain:

- Docked panels
- Tabs
- Context panes
- Alert windows
- Expandable utility windows
- Combat windows

Virus attacks should appear inside BLACKBOX rather than taking over the entire screen.

The player should feel as though:

> They are running an illicit hacker application, and hostile software has caused an emergency window to appear inside it.

---

# 29. Primary Layout

Use a layout conceptually similar to:

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ BLACKBOX     SERVER: ONLINE       09:41:12       MARKET / NEWS TICKER → │
├───────────────┬───────────────────────────────────┬──────────────────────┤
│               │                                   │                      │
│ SERVER        │                                   │ CONTEXT              │
│               │                                   │                      │
│ Integrity     │         MAIN WORKSPACE            │ Current target       │
│ Files         │                                   │ Components           │
│ Alerts        │      Network / Combat / Trace     │ Status effects       │
│ Trace         │                                   │ Relevant logs        │
│               │                                   │                      │
│               │                                   │                      │
├───────────────┴───────────────────────────────────┴──────────────────────┤
│ EVENT LOG / RECENT OUTPUT                                                │
├──────────────────────────────────────────────────────────────────────────┤
│ > _                                                   [ ? ABILITIES ]    │
└──────────────────────────────────────────────────────────────────────────┘
```

This is a conceptual hierarchy, not a rigid pixel-perfect requirement.

## Center Workspace

The center should be visually dominant.

It contains whatever task currently matters most:

- Combat
- Home
- Trace
- Files
- Network exploration

## Left Panel

Persistent high-level player/server information.

Examples:

- Server Integrity
- File Lock status
- Current alerts
- Trace progress
- Key resources

## Right Panel

Context-sensitive details.

During combat this can contain:

- Virus components
- Component Integrity
- Mutations
- Status effects
- Current target
- Relevant action information

## Bottom

Persistent command entry and recent output.

---

# 30. Visual Hierarchy

Information should have three levels of priority.

## Primary

Information required for the current task.

During combat:

- Virus visualization
- Virus components
- Current hostile action
- Server Integrity
- Cycle countdown
- Command input

These should immediately attract the eye.

## Secondary

Useful tactical information:

- Mutation information
- Trace progress
- Cooldowns
- Status effects
- Recent combat result
- Target descriptions

## Tertiary

Atmospheric or persistent background information:

- Market ticker
- Clock
- Credits
- News
- Background activity
- Decorative telemetry

Tertiary information must never compete visually with active gameplay.

---

# 31. Typography

Use **sans-serif fonts as the primary UI typography**.

Use monospace selectively.

## Sans-serif

Use for:

- Headers
- Tabs
- Component names
- Health values
- Labels
- Notifications
- Buttons
- Ticker
- Menus
- Tooltips

## Monospace

Use primarily for:

- Command entry
- Command output
- Combat logs
- ASCII/dot-art
- Diagnostic text
- Occasional flavor readouts

The interface should evoke a terminal without forcing the player to read an entire game rendered in terminal typography.

---

# 32. Visual Style

Use:

- Near-black / charcoal backgrounds
- Thin borders
- Subtle panel separation
- Cool gray structural lines
- Cyan/teal interaction accents
- Muted green success indicators
- Amber warnings
- Red or magenta hostile indicators
- Off-white primary text

Avoid excessive saturation.

Suggested semantic hierarchy:

```text
CYAN     interactive / selected / active
GREEN    successful / healthy
AMBER    warning / incoming action
RED      hostile / critical
GRAY     disabled / secondary
WHITE    primary readable information
```

---

# 33. Subtle Grime

BLACKBOX should feel **used and modified**, not pristine.

Achieve this through small details.

Possible examples:

```text
// don't restart relay-3 again -M
```

```text
PATCH 09 // unstable
```

```text
BLACKBOX build 0.8.17-custom
```

Other subtle details:

- Server nicknames
- Old log entries
- ASCII signatures
- Slightly irregular labels
- Small texture/noise
- Modified version identifiers
- Sparse operator comments

Do NOT rely on:

- Heavy scanlines
- Constant glitch effects
- Continuous screen flicker
- Distorted text
- Static covering information
- Excessive chromatic aberration

The interface should feel **lived in, not malfunctioning**.

---

# 34. BLACKBOX Modules

For the prototype implement:

## HOME

General server overview.

## COMBAT

Automatically activated when engaging hostile software.

## TRACE

Shows origin-tracing progress and discovered locations.

## FILES

Shows stored resources and File Lock / Recovery state.

## LOGS

Persistent history of important events.

Do not fully implement Market or Operations yet.

Their existence may be implied through the ticker and flavor text.

---

# 35. Top Ticker

Include a persistent horizontal ticker near the top of BLACKBOX.

For the prototype it is primarily atmospheric.

Example:

```text
SCRAP 14.22 ▲1.8%  //  ZERO-DAY 441.08 ▼3.1%  //  NEWS: KESSLER NETWORK DENIES BREACH  //  BOUNTY: VANTA NODE 850C
```

Possible content:

- Fictional commodity prices
- Technology prices
- Black-market goods
- Corporate news
- Network events
- Bounties
- Strange activity
- Security warnings

Architect the ticker so real gameplay information can later be inserted.

Potential future data:

- Actual market prices
- Player activity
- PvP incidents
- Faction events
- Resource shortages
- Bounties

Ticker movement should be slow enough to read.

It is tertiary UI and should never distract from combat.

---

# 36. Virus Intrusion Alert

Virus attacks should initially appear as a compact alert inside BLACKBOX.

Example:

```text
┌─────────────────────────────────────────┐
│ INTRUSION DETECTED                      │
│                                         │
│        [ rotating virus art ]           │
│                                         │
│ CRYPTJACK                               │
│ Ransomware // Threat 16                 │
│                                         │
│ TARGET: FILES                           │
│                                         │
│             [ ENGAGE ]                  │
└─────────────────────────────────────────┘
```

Use:

- One short alert sound
- Clear border/highlight animation
- Possibly one brief visual distortion when the alert initially appears

Do not continuously glitch the interface.

Selecting **ENGAGE** should expand or transition the center workspace into Combat.

Do not obscure the entire BLACKBOX interface.

---

# 37. Combat Workspace

Combat should occupy the primary workspace while leaving surrounding BLACKBOX information accessible.

Concept:

```text
┌───────────────────────────────────────────────────────────────┐
│ CRYPTJACK                                  THREAT // 16       │
│                                                               │
│       .::''''::.                          CORE     91 / 120   │
│    .:'          ':.                       SHELL    38 / 60    │
│   ::    ▓▓▓▓▓     ::                     ENCRYPT  55 / 55    │
│   ::  ▓▓░░░░▓▓    ::                                        │
│    ':   ▓▓▓▓     :'                      STATUS              │
│       '::....::'                         SHELL ACTIVE        │
│                                                               │
│             rotating / shifting                              │
│                                                               │
│ ENEMY ACTION                                                  │
│ ENCRYPT FILES                                                 │
│ ███████████████░░░  1 CYCLE                                  │
│                                                               │
│ SERVER INTEGRITY                                              │
│ █████████████████░░  84 / 100                                │
└───────────────────────────────────────────────────────────────┘
```

The player should understand within seconds:

1. What am I fighting?
2. What is it doing?
3. What parts can I attack?
4. How damaged is my server?
5. What should I type next?

---

# 38. Virus Visuals

Virus families should have **large recognizable creature-like ASCII/dot-art visualizations**.

Do not limit viruses to tiny icons.

The image should provide identity and spectacle.

Possible visual language:

## Worm

Long segmented or serpentine body.

## Ghostroot

Mask, apparition, branching root, or skeletal silhouette.

## Ransomware

Armored, crab-like, vault-like, or bulky mechanical creature.

Future virus families may resemble:

- Spiders
- Parasites
- Swarms
- Serpents
- Insects
- Predatory machines
- Abstract beasts

Keep them stylized and clearly artificial rather than literal biological monsters.

---

# 39. 3D ASCII / Dot-Art Rotation

Where practical, virus representations should appear three-dimensional and slowly rotate.

Possible implementation approaches:

## Frame Animation

Store several ASCII/dot-art views:

```text
front
front-right
right
rear-right
rear
...
```

Cycle them slowly.

## Procedural Point Representation

If technically reasonable, represent the virus using dots/characters projected from a simple 3D point model.

Do not over-engineer this for the prototype.

A convincing multi-frame illusion is sufficient.

Animation should be slow and atmospheric.

Do not create distracting constant motion.

---

# 40. Component Damage Visualization

Subsystem targeting should have visible consequences on the virus art.

For example, destroying:

```text
REPLICATOR
```

might cause one appendage or region of the ASCII creature to:

- disappear
- fragment
- glitch briefly
- dim
- collapse
- become visually damaged

An attack should clearly communicate:

> I hit that specific thing and changed the enemy.

When possible, component damage should correspond spatially to recognizable portions of the virus visualization.

---

# 41. Command Prompt

The command line is a persistent part of BLACKBOX.

Example:

```text
> exploit encryptor_
```

The player must type abilities to retain the hacker fantasy.

However, command syntax should remain extremely forgiving.

The game should support lightweight suggestions.

Typing:

```text
> exp
```

can suggest:

```text
exploit
```

After:

```text
> exploit 
```

suggest valid targets:

```text
core
shell
encryptor
```

The challenge should be choosing the correct ability, not remembering exact syntax.

---

# 42. Ability Reference Window

Provide a lightweight utility window accessible through something like:

```text
[ ? ABILITIES ]
```

It may remain open or be pinned while playing.

Example:

```text
KNOWN ABILITIES

spike [target]
Basic targeted damage.

exploit [target]
Expose target for increased damage.

overload [target]
Heavy targeted damage.

interrupt
Cancel the current hostile action.

scan
Analyze the virus.

trace
Investigate its origin.

lock files
Emergency asset protection.
Requires recovery after combat.
```

New players may keep this visible permanently.

Experienced players should be able to ignore or close it.

---

# 43. Tutorial Helper

Implement contextual tutorial assistance.

Avoid long modal tutorial sequences.

The helper should appear when a player encounters a new concept.

Example:

```text
TIP

CRYPTJACK is preparing to encrypt your Files.

You can:

interrupt
Temporarily stop the action.

attack encryptor
Try to permanently disable its encryption ability.

attack core
Attempt to destroy the entire virus first.
```

Do not instruct the player which option is correct.

Teach the **decision**.

Another example:

```text
TIP

Shell reduces damage dealt to the Core.

You may destroy the Shell first,
or attack through it and attempt to end the fight faster.
```

Once the player has demonstrated understanding, reduce or stop these notifications.

---

# 44. Notifications

Use just-in-time notifications rather than filling BLACKBOX with permanent warnings.

## Minor

```text
Trace complete.
```

## Important

```text
OPERATION LOST
SCRAPER-7 connection terminated.
```

## Critical

```text
SERVER INTEGRITY CRITICAL
18%
```

## Intrusion

```text
HOSTILE SOFTWARE DETECTED
```

Old notifications should automatically move into Logs.

Do not leave unnecessary alert boxes on-screen.

---

# 45. Motion and Feedback

Allowed:

- Slowly moving ticker
- Subtle window transitions
- Alert entrance animations
- Slow virus rotation
- Component damage effects
- Damage number feedback
- Progress-bar animation
- Small UI bleeps
- Hostile alert sound

Avoid:

- Persistent panel flicker
- Constant glitch animation
- Excessive shaking
- Rapid looping movement
- Effects that make text harder to read

The UI should remain calm until something important occurs.

---

# 46. Usability During Five-Second Combat Cycles

This is critical.

Combat occurs on approximately five-second decision cycles.

Therefore the player must be able to identify the important state in substantially less than five seconds.

During combat prioritize visibility of:

1. Current hostile action
2. Remaining cycles
3. Available targets
4. Component Integrity
5. Server Integrity
6. Current statuses
7. Command input

Information such as fictional prices, news, timestamps, decorative logs, and general server telemetry must visually recede during combat.

Do not remove them unnecessarily; simply reduce their prominence.

---

# 47. Diegetic vs Game Information

BLACKBOX should feel like in-world software, but gameplay clarity is more important than strict simulation.

Explicit RPG information is allowed.

Examples:

```text
Threat 16
```

```text
Server Integrity 82 / 100
```

```text
Trace 75%
```

```text
Encryptor 34 / 55
```

```text
EXPOSED // 2 cycles
```

Do not obscure useful game information merely because real hacking software would not display it that way.

BLACKBOX is fictional hacker software designed to make the RPG understandable.

---

# 48. Final Visual Goal

BLACKBOX should create both of these reactions:

> **“This looks like an underground hacking tool I probably shouldn’t have access to.”**

and:

> **“I immediately understand what is happening and what I can do.”**

The second goal takes priority.

Start the prototype relatively sparse.

Add decorative technical information only after the primary visual hierarchy works.

The supplied reference image should inspire:

- Technical atmosphere
- Panel confidence
- Dark palette
- Dense tool aesthetic
- Information framing

It should **not** determine:

- Exact layout
- Exact colors
- Exact widgets
- Exact typography
- Exact visual composition

BLACKBOX must develop its own recognizable identity.

---

# 49. Updated Prototype Deliverables

In addition to the combat-system deliverables, implement:

1. BLACKBOX visual identity
2. Single-app internal panel architecture
3. Primary / secondary / tertiary information hierarchy
4. Persistent flavor ticker
5. HOME / COMBAT / TRACE / FILES / LOGS modules
6. Intrusion alert window
7. Combat workspace that does not take over the entire application
8. Large recognizable ASCII/dot-art virus visualization
9. At least one slowly rotating or multi-frame virus
10. Visible component damage feedback
11. Persistent typed command prompt
12. Autocomplete / command suggestions where practical
13. Pin-able ability reference window
14. Context-sensitive tutorial helper
15. Just-in-time notification system
16. Subtle grime / lived-in details
17. Minimal, purposeful motion and audio feedback
18. Strong readability for players with no technical background

The prototype should prioritize:

> **Combat usability first, atmosphere second, decorative complexity third.**

---

# 50. Final Implementation Priority

Implement in this order:

## Phase 1 — Combat Engine

- 5-second cycle loop
- Typed command parser
- Server Integrity
- Core Corruption
- Core / Shell / Components
- Spike / Exploit / Overload / Interrupt / Scan / Trace
- Cooldowns and EXPOSED status
- Basic enemy special actions

## Phase 2 — Three Enemy Families

- Cryptjack / Ransomware
- Splinter / Worm
- Ghostroot

Add one mutation system and ensure randomized variants work.

## Phase 3 — File Lock + Post-Combat

- Emergency File Lock
- File Recovery
- Repair Server
- Trace result
- Encounter telemetry

## Phase 4 — BLACKBOX UI

- Core layout
- Main workspace
- Persistent prompt
- Context panel
- Ticker
- Logs
- Intrusion alert
- Combat view
- Ability helper

## Phase 5 — Visual Flavor

- Large ASCII/dot-art viruses
- Slow multi-frame rotation
- Component-specific damage feedback
- Subtle grime
- Minimal sound/motion polish

## Phase 6 — Playtest Balancing

Test whether:

- Players ever choose Core rush
- Players ever choose component dismantling
- Interrupt is meaningful
- Trace is tempting
- File Lock feels like a last resort
- Mutations create different decisions
- Five seconds feels comfortable
- The interface remains readable under pressure

Do not add major new systems until these questions are answered.

---

# 51. Prototype Success Criteria

The prototype is successful if:

- The player understands combat without technical knowledge
- Combat feels like hacking rather than ordinary fantasy combat with renamed spells
- Typed abilities enhance the fantasy without creating syntax frustration
- The player regularly alternates between offense and defense
- Targeting Core versus Components produces meaningful choices
- Higher difficulty comes from interacting mechanics rather than only larger numbers
- Repeated Virus Families remain interesting because of mutations and targets
- The server feels valuable without requiring the player to understand real server architecture
- BLACKBOX feels like a grimy underground hacker tool
- Visual hierarchy makes the current task immediately obvious
- The player wants to fight another encounter after finishing one
