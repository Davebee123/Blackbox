# BLACKBOX — game rules

How the game plays today, rule by rule. Numbers live in `dist/` (`data.mjs`, and the module named beside a rule).
Design plans live in `docs/`; the code map is README.md.

## Overview

### First launch

Every session opens with the power-up: the monitor comes on, the BLACKBOX mark (a black square eclipsing an amber
light) rises, and **Press any key to start** waits (a tap on a phone). A new game opens on a bare terminal:
`blackbox login:` asks for a handle (2–16 letters, numbers, dots, dashes or underscores) and a password (4+
characters, never stored). An encrypted transmission from Halcyon Mutual's Office of Loss Prevention says the terminal
was set up for you and that wick of LOWLIGHT will write. Then you pick a class (Classes and loadout), and wick's
first transmission comes in over the map (Transmissions).

### The loop

1. `connect sprawl`: **SPRAWL-00**, the starter server, six rooms of strays at your level (never above 5, now and
   then one a level higher). Walk into a room and `engage`. Your first two kills there hit at 60%
   (`CONFIG.zone.starterHit`). A kill pays at once, and the room fills again 90 seconds later. Its Core opens from
   level 3.
2. The network is a stack of eight **floors**; SPRAWL-00 is floor 1's entry. The servers linked to what you know show
   as **?**: kills and first clears **trace** them, and at 100% one is located (Floors, The hidden network).
3. `connect <server>` starts a run. Out on the net your health is **Signal** (100 × your power, plus gear). It carries
   between connections and rests back at home (Visits).
4. Walk the server's rooms, take the vault's key from its guard, open the vault, and beat the **Resident** in the
   Core to take the server over.
5. Each floor has an exit (▼) down to the next, deeper and higher in level.
6. `jack out` to bank your pack. Home sees a fight only when an **invasion** gets past your **firewall** (Home).
7. **Mail** gives it all a reason: LOWLIGHT's storyline, contracts from Halcyon Mutual and the factions, each floor's
   job chain, and the store (Mail and contracts).

### Found or bought

Nothing is made at home. Every protocol, filter and relay is **found** (drops, vaults, contracts, events) or
**bought** (Halcyon's store and its premium shelf, the hubs' shops).

## Fights

### The fight in one paragraph

A virus is its parts: a basic attacker, usually a signature part, sometimes one or two more. Each part wears **armor
chits** (◆): a hit on armor does no damage, however big, and breaks a chit. Strip a part with small hits, then finish
it with a big one. Every part owns one telegraphed attack, and your command always resolves first, so a part you break
on the cycle it would fire never fires. Only attacks cost you anything. Leave a part bare too long and it patches a
chit back. From level 6 a virus also announces big moves ahead (**tells**), and the part you've left alone is the one
that winds up.

### Rules, one per layer

| Layer | Rule |
|---|---|
| Win | Reduce the virus's Integrity (the sum of its parts) to zero. |
| Parts | 2 to 4 a wild virus (Viruses), each with an attack on the timeline. Breaking a part stops its attack and can drop components (Components). |
| Armor | Chits on a part (◆; a part wearing 2 or more wears half again: 2 → 3, 3 → 5). A hit on an armored part does no damage and breaks one chit; a heavy hit from your command (40+ base, `CONFIG.heavyHit`) breaks two, and Kill Process always breaks two. Burn ticks, helper hits and each target of a spread hit break one each. Armor-piercing hits (Backdoor and the like) go straight through. A hit spent on ◆ logs as absorbed and floats *◆ ABSORBED*, never MISS; the tray turns a key's icon steel when armor would absorb its hit. |
| Patch | A part with no chits left patches one back 5 cycles later (`CONFIG.patchDelay`), unless it breaks first. The timeline shows the patch (◆ patch). |
| Veiled | Ghostroot and the Sentinel hide a part's timers while it still has armor. Strip it, or Tag it, to see them. |
| Stakes | Damage is the only threat: your Signal on a run, your server's Integrity at home (0 = a crash: Home). Nothing takes your credits or files. Ransomware encrypts (a stack that hits you every cycle until the Encryptor breaks), Worm spawns fragments that gnaw every cycle, Ghostroot's Scrambler hits and scrambles you. |
| Time | One command a cycle; entering it turns the cycle at once. Typed nothing, a cycle lasts 12 s (`speed relaxed`; normal 8 s, fast 5 s; the top bar's button). Enter on an empty line or `now` resolves it now. Rules count cycles, so speed never changes balance. No attack lands on cycle 1. |
| Order | Your command (or your routine's) → your daemons → burns → helpers → heals over time → encryption → attacks due → patches. |
| Crits | Any hit you land that does damage can crit for +50% (5% base, plus Crit and Crit Damage). Enemy damage attacks crit 10% of the time from enemy level 3. Timeline numbers show the normal hit, after your Block. |
| Misses | Your damaging skills miss 5% of the time against a same-level enemy, +1% a level it's above you, −1% a level below, less your Accuracy; the HUD shows *you miss N%*. A miss spends the cooldown. Enemy attacks miss you the same way, plus your Evasion (up to 20%). Burns, helpers and utility skills never miss. |
| Level gap | One level up is about even. Each level an enemy has over you takes 7% off what you deal it (never under 40%) and adds 10% to what it deals you (`CONFIG.gap`); below you, 3% a level the other way (up to +15% dealt, −30% taken). |
| Clean | A fight where nothing got through says so. |
| Idle | Type nothing and you fire key 1 at the last part you hit (from level 5, your routine moves instead: Routines). `hold` does nothing. |
| No part picked | A skill that needs a part goes at the last part you hit, else the part that attacks soonest. |
| Delays | Skills push an attack back (the Warden's Suspend and Quarantine, the Hijacker's Jam and Spoofed ACK, SIGINT's read of a tell), and so do talents, capstones, uniques, set bonuses, daemons, Stealth and scripts. **One delay a wind-up:** once an attack has been pushed later, no other delay moves it until it lands (or is cut); the next attack can be delayed again (`delayAttack` in combat.mjs). A held attack wears a teal pause mark. A delay moves an attack, never a tell's own clock. A miss is not a delay. |
| Edge | Each subclass's signature passive, from level 10 (Subclasses). |
| Encryption | Each Encrypt adds to a stack that hits you every cycle. Breaking the Encryptor clears it. A ◆ on you stops an Encrypt; shields soak the stack's damage; Purge and Rollback wipe it. |
| Scramble | For a couple of cycles, each of your attacks has a 25% chance to hit you instead, at half. A ◆ stops it. |

`jack out` mid-fight is the emergency escape: it resolves on your turn, you keep your pack, and the virus stays.
Leaving the fight screen pauses a live fight.

### The interrupt

Every part has two ticks on its bar, at 50% and 25% of its Integrity. Take it across one on the cycle its move is due
and that move is cancelled (*INTERRUPTED*); its schedule goes on as if it had landed. Each tick works once a fight:
crossed with nothing due, it's spent for nothing, and one hit across both cancels one move at most. Burns, helpers and
daemons count. Fragments, Packages, Droppers, the Spam Flood and the Mutex have no ticks. The Now column says what
crossing takes (*cut ▸ 9*, *cut ▸ ◆1 + 9*), and a queued command says *cuts* or *−tick*. A charge riding the cancelled
move is called off with it.

### Tells (tells.mjs)

**Tells are the big moves you plan your interrupts around.** Every virus that fights you alone has them from level 6:
wild viruses, guards, elites, strains, champions, solo bosses and invaders. Crew bosses have their own mechanics.

**Nothing lands unannounced.** A tell is said once in the log and sits as a chip on its part's row, in the column it
lands, until it does. The chip's last line is the answer (*▸ Cut past ◆2*, from 17 *▸ Cut past ◆2 or SIGINT*,
*▸ SIGINT or cut*, *▸ Strip ◆3*, *▸ Pick a cheap copy*). Its number is its price (`tellPrice`): a charge's hit, a cast's
extra damage over its 4 cycles in red (*−15*), a Self-Update's Integrity (*+55 hp*), a seal's ◆ in steel (*+4 ◆*).
Hover it for what happens and, on its own muted ▸ line, how to stop it. Breaking a tell's part always stops it.

| Kind | What it is | What answers it | If you don't |
|---|---|---|---|
| Charge | The part's next scheduled attack, much bigger, 3 cycles ahead. | A cut on that cycle, or a built answer (Suspend, Jam, Spoofed ACK, Hijack, Blackhole, Backfire); soften it with ◆, a shield, Brace, Bulkhead. From level 17 SIGINT cuts a charge too. | ×2.5 to ×3 the plain hit, capped at 45% of your max (a solo boss's 60%: `CONFIG.spikeCap`). Charges don't crit. Then the after-effects. |
| Cast | *Casting*: a buff on the virus for 4 cycles. From level 10. | SIGINT or a cut on its part in its two-cycle window, or a skill built for it (Quarantine, Hijack). SIGINT before the window is refused and keeps its cooldown. | Double Extortion: its attacks hit 35% harder. Persistence and Call Home: its attacks repeat a cycle faster. Self-Update: every part grows by a quarter of the Integrity it has left. Then the after-effects. |
| Seal | A dial, from level 6: the Sentinel's Blacklist, elites and bosses. | Strip its part first, as far as it pays. Bit Rot and Cache Poison make it fail even with ◆ on. | Each ◆ its part still wears gives one ◆ back to every part, never past a part's max. It takes the same share of your ◆ and shield and leaves you Corrupted at that share. |
| Mimic | The Mimic (ghostroot, from level 8) records you; on its beat it copies the command you fire and turns it on you, with each helper you sent onto it after the beat was said. | Fire what costs least to have copied (a strip when you wear no ◆, a heal when every part is whole, a small hit), hold, or cut the Mimic on its beat. | What it copied, never past the tell ceiling (Third parts: the Mimic). |

- **No pile-ups.** A charge never lands on the same cycle as another part's heavy attack, or on the Mimic's beat.
  Below level 17 one tell is live at a time; from 17 two can be, never on the same cycle. **An elite** with a clash has one
  more live, and its tells may land together when a cast is among them (its window opens a cycle early: answer it then). After a tell lands or is
  answered, the next of its kind waits 7 cycles, plus up to 2.
- **A fixed part.** Each tell sits on one part: the signature for its charge, cast and seal, the plain attacker for
  Overcharge, the rule's part for a strain's charge. A boss's charges and casts stay off its ♛ part while another can
  carry them.
- **Reading pays.** A charge, a cast or the Mimic's beat answered **staggers** the part: Open (50% more damage from
  everyone) for 2 cycles and its next attack a cycle later (a solo boss: Open only). A seal stopped by a strip readies
  the skill that did it. Each read adds a tenth of the kill's XP, up to 40%, and reading every tell in a fight (two or
  more said, none landed) rolls its loot once more.
- **Ignoring hurts** (`TELL.tiers`): a charge or cast that gets through knocks your last skill **Offline** for a cycle
  (from level 6; never key 1 or SIGINT), and leaves you **Corrupted** (3% of your max a cycle for 3 cycles at 10–16,
  4% from 17; Purge, Scrub or Rollback cleanses it).
- **A boss's beat** (Boss acts): the Backlash, REPO MAN's Repo Agent and HOLLOW CHOIR's singing Decoy.
- **Helpers count** (docs/puzzle-fights.md 3.2). A helper's hit is your hit on every lever: it can set off a Tripwire,
  cross a boss's phase tick or boot a Spare, and on the Mimic's beat each helper you sent onto it after the beat was
  said is played back at its own size (`caughtHelpers`). Helpers never cut a tell on their own. On the board each
  helper's hits left show as teal pips in its part's columns; a pip that trips a lever is edged red.

| Levels | A wild virus brings | Live at once | Charge (extra over the plain hit, at most) | After-effects |
|---|---|---|---|---|
| 1–5 | None: the ticks are the lesson | — | — | — |
| 6–9 | Its charge | 1 | ×2.5, 12% of your max | Offline |
| 10–16 | Its charge | 1 | ×2.5, 18% | Offline, Corrupted 3% |
| 17+ | Its charge and its cast | 2 | ×3, 25% | Offline, Corrupted 4% |

An **elite** brings one more from level 6 (its clash's tell first, then its family's seal and cast), each charge up to 15% bigger; a **solo
boss** brings three; a **champion** invader the usual ones, its charges a tenth bigger. SPRAWL-00's first two kills
bring none.

**Who brings what** (`TELL_SETS`): Ransomware Full Disk (its Encrypt plus a burst of encryption for 3 cycles), Double
Extortion, Overcharge, Key Rotation. Worm Mass Mailer (a Replicate that hatches two fragments), Self-Update, Overcharge,
Resync. Ghostroot Possession (a Scramble two cycles longer), Persistence, Overcharge, Go Dark. A strain brings a charge
of its own on its rule's part, and its lineage's cast and seal. Guards: the Watchdog's and the Tracer's Lock-on, the
Crawler's Infest, the Shredder's Deep Shred (it also shreds the newest code or credits file in your pack), the Bouncer's
Battering Ram, the Sentinel's Blacklist (a seal); from level 10 each also has Call Home.

### SIGINT

The **-** key (`sigint` or `interrupt`), everyone's from level 10: it stops a cast while it compiles (a crew boss's or a
virus part's), and from level 17 in a solo fight it also cuts a charge on its cycle. With a cast and a charge both in
their windows it stops the cast. Ready every 8 cycles; it takes your command for the cycle. While a cast or charge is
on the board, its tooltip has a line for each, red while SIGINT will be ready in time, muted when it won't.

### The Sync Window

On **25% of cycles** a window (10% of the cycle) opens on the Now column's cycle bar, inside the first half, at a new
spot each time; up to 3% of the cycle either side still counts. The **Sync** stat adds to the chance (up to +50%). Fire
your command while the bar is inside it and it **syncs**: +10% damage, plus your class's bonus. The window's spot comes
from the fight and the cycle, never the game's dice.

| Class | Sync bonus |
|---|---|
| Breaker | Breaks 1 more ◆ on the part you hit |
| Bastion | Shields you for 8 |
| Infiltrator | Extends your burns on the part you hit by 1 cycle |
| Operator | Each helper strikes once more |

**Infiltrator Surprise:** an Infiltrator's first cycle always opens a wider window (15%), glowing blue. Fired in it, on
top of the sync bonus: Inject ticks once at once, Tag lasts 6 cycles and its burns tick +75%, and Keepalive stretches
burns 4 cycles. Auto-repeat, your routine's moves and later steps of a `;` plan never sync.

### Planning ahead

Separate commands with `;` to plan up to 3 cycles: `exploit encryptor; overload encryptor; spike pulse`. The plan
shows across the *You* row (dashed: later cycles). A new command replaces the whole plan; `cancel` clears it. A later
step that can't fire is skipped with a warning. Add **`last`** after the target to send your command to the back of the
cycle, after your crew's. Type a skill's name or press its key; targets take prefixes (`spike enc`). If your target
breaks before your turn, your command goes at the next threat.

### Statuses

Each class makes one, and anyone's hits cash it in: **Exposed** (+25% crit chance on it, 2 cycles; Breaker),
**Tagged** (burns tick +50% and its timer shows through a veil; Infiltrator), **Throttled** (its attacks deal half) and
**Quarantined** (+25% damage while its attack is held; Bastion), **Hooked** (+6 on every hit, helpers and burns too;
Operator). An Operator runs at most 6 helpers at once.

### After a fight

A win shows a card over the virus: XP (one bar, any level-up), drops, code, components, leads and bounties. Enter on an
empty line goes back. **Fast kills:** each class keeps your usual pace (cycles per 100 Integrity); from your sixth kill
with it, a win at least a quarter faster pays **+25% XP** (*Fast kill*). Loadout and Daemons carry a teal count of what's
arrived since you last opened them.

**Disconnect.** At 0 Signal on a run you're thrown home: the unbanked pack is lost; XP, banked gear and the server's
progress stay. The screen holds on the hit for 0.8 s, drops to static with **NO CARRIER** and the server's name, then
clears onto the **Disconnected** card (a key skips it), which says what took you out. Over it sits the **death recap**
of the last 6 cycles (recap.mjs): your Signal as a bar a cycle, the hits that did it (biggest first, at most 4, the
last hit tagged **Last**), and **Taken**, **Healed** and **Shielded**; hover any of it for the sentence. A loss at home
is a crash (Home).

## Viruses

### Families

Numbers at enemy level 6; Integrity and damage grow 4% a level (a level-1 virus is gentler, 80% of a match, ramping to
100% by level 6). More ◆ at 5, 7 and 10; from level 9 first attacks come a cycle sooner (never on cycle 1).

| Family | Basic part | Signature part |
|---|---|---|
| Ransomware (CRYPTJACK) | Pulse Node: 34, ◆, Surge 14 every 4 (first 3) | Encryptor: 38, ◆ (◆◆ from 5), Encrypt every 5 (first 4): +4 damage a cycle, stacking, until it breaks |
| Worm (SPLINTER) | Pulse Node: 34, ◆, Surge 12 every 4 (first 4) | Replicator: 38, ◆ (◆◆ from 5), spawns a fragment every 4 (first 3) with a 4-damage Splice. Fragments: 18, bare, gnaw 3 every cycle, at most 3 |
| Ghostroot (GHOSTROOT) | Pulse Node: 34, ◆, veiled, Surge 11 every 4 (first 3) | Scrambler: 40, ◆ (◆◆ from 5), veiled, Scramble every 4 (first 2), hitting for 9 |
| Cryptominer (XMRIG), from 9 on floor 2 | Pulse Node: 34, ◆, Surge 12 every 4 (first 3) | **Rig**: 40, ◆ (◆◆ from 5), Hash 5 every 2 (first 2), 1 more each landing. It heats 10 a cycle; at 100 it overheats and burns itself out. Its ticks vent it. |
| Wiper (SHAMOON), from 19 on floor 4 | Eraser: 34, ◆, Zero 12 every 4 (first 3) | **Degausser**: 38, ◆ (◆◆ from 5), Wipe 10 every 5 (first 3): takes your strongest ready key for 3 cycles (*WIPED*), its cooldown standing still. Never key 1 or SIGINT. |
| Botnet (MIRAINET), from 8 on floor 2 | Pulse Node: 34, ◆, Surge 12 every 4 (first 3) | **C&C**: 46, ◆◆, Volley 12 every 4 (first 4): every **Zombie** at once (6; 7 from 15, 8 from 25; 8 each, bare, no ticks or drops), so it shrinks as they break (*6 zombies*). |
| Logic Bomb (TIMEBOMB), from 12 on floor 2 | Trigger: 30, ◆, Tick 9 every 3 (first 2) | **Payload**: 70, ◆ (◆◆ from 10), no attack. A **fuse** of 8 (*fuse 8/8*) that your commands' hits on it burn, a hit on ◆ included; each of its ticks burns 2, and cancels nothing. At 0 it **detonates**: 35% of your max Signal (never your last point), and it's gone with its loot. |

GLASSJAW writes the Cryptominer (and the Hashrat), TOLLGATE the Wiper and the Logic Bomb, SWARMLINE the Botnet. Their
rules run in any fight (`families.mjs`).
Servers, rogue folders and invasions send them once a server's level and floor allow (`network.mjs` `lateFamilies`,
lean 1.5 each); a random virus with no family named stays one of the first three. A Hash climbs like encryption
(the run's early and late steps skip it). A Cooler in the fight keeps the Rig at 10 heat a cycle; break it and the
Rig heats 25 a cycle, every Hash 50% harder.

**The Botnet: farm it or end it.** Break the C&C while a Zombie stands and everything left scatters: the fight ends,
paying 0.6 of a kill. Clear every Zombie first and the C&C falls silent, and the kill pays 1.5. Its ticks cancel a
Volley. **The Logic Bomb: count your hits.** A wild one's fuse is Contact's; the fight goes on against the rest after a
detonation. The Payload's ◆ are its own (none added), and it falls back on the fight's attacker: break that first and
it takes the attack over.

**The Trojan.** A traced server's rooms also field a body by its authors (`families.mjs`):
- **Trojan** (SWARMLINE, LANTERN). The Courier drops a hit and delivers Packages; the fight opens with one on the board.
  While the Loader lives, any damage to a Package unpacks it into two Droppers (Spray 2 every 2), and one left alone
  unpacks 5 cycles after delivery. **The Loader redeploys the Courier**: break it and it comes back 4 cycles later at
  half its max, every time (a Redeploy chip and a tether; ↻ N while it's down). Break the Loader and the Courier stays
  down and the Packages go inert. The Courier's ticks cancel a delivery; the Loader's delay the next by 2.

**Attack sets.** Each spawn rolls its set (Ransomware Standard, Lockout, Hammer or Lockstep; Worm Standard, Bloom or
Wave; Ghostroot Standard, Ambush or Flicker; Trojan Express or Freight; Cryptominer Cold or Hot rig; Wiper Targeted or
Rolling, the Rolling Wipe taking your last key for 2; Botnet Barrage or Drizzle, a Volley every 2; Logic Bomb Contact or
Timed, a 6-hit fuse that every hit burns, burns and helpers too, winding back up 1 a cycle), and each part's first attack moves a cycle either way. A set changes when things land, not how much (within
5% over 20 cycles). The room's card never names it: you read it on the board, and the Codex keeps every set you've
faced. Bosses and the farm keep their own timing.

### What a wild virus is made of (parts.mjs)

A wild virus (a room's process, a courier, a bounty, an invader, a SPRAWL-00 stray) is 2 to 4 parts: a **basic** (or
two copies of it), usually its family's **signature**, and 0 to 2 **third** parts. Strains, bosses, guards and named
fixtures keep their own shapes. A traced server's process and elite rooms keep a fixed third (6 rooms in 10), drawn
when the server is built. Every number is a named constant in `PARTS`; `developer parts` shows them.

- **Levels 1–2:** the basic and the signature, nothing else.
- **The signature** comes in about 70% of fights from level 3, 55% from 10 and 45% from 20. Without it, another third
  takes its slot (never one that refers to it: a Lockbox, Mutex, Mirror or Idle Timer), its charge becomes an
  Overcharge on another part, and its basic is one that attacks.
- **Part count** (2 · 3 · 4 parts): levels 3–7 30% · 70% · 0; 8–15 15% · 70% · 15%; 16–30 10% · 60% · 30%; 31+
  10% · 50% · 40%. An elite and a ★ rare spawn bring at least three. From level 10 a fight of three or more sometimes
  doubles its basic (one in ten, one in six from 31): two copies at 60% each, a cycle apart, named *Strobe*, *Strobe 2*.
- **The total stays the same.** A fight's Integrity and ◆ are its family's two core parts' (×1.06 from level 3), shared
  out, so a two-part fight's parts are bigger and a four-part fight's smaller.
- **Damage profiles.** Every family deals the same budget over a typical fight at its level, in its own shape:
  Ransomware half steady and half ramp, Worm all steady, Ghostroot a third steady and two thirds burst, Cryptominer
  half steady and half ramp (the Hash), Wiper half steady and half burst (the Wipe), Botnet half steady and half burst
  (the Volley), Logic Bomb all steady on its Trigger, the one attacker (a Tick may grow to 2.6× its own; an unrolled
  Payload counts as 38 in its total). No single hit
  grows past 1.3× its family's Pulse Node; past that a part hits more often instead.
- **A missing role moves onto the basic.** No Encryptor: the basic's **Ratchet** stacks on the Encryptor's clock
  (an amber hatched chip, *▲ ratchet 7*, *Ratcheted* on you; Purge or Rollback resets it); no Rig, on the Rig's. No Scrambler: the basic's
  hits Scramble you, at most once every 4 cycles. Nothing steady: the basic takes its family's Surge too.
- **One stranger a fight.** At most one part you've never met (research 0), and a fight with one is never four parts.
- **One lever a fight** (docs/puzzle-levers.md 5). From level 6 every wild fight (every invasion too) carries one
  **lever**, a part whose rule makes the default move the wrong one: a beat (Mimic, Decoy), a part to break last
  (Tripwire, Zip Bomb, Hotspot), a part to break first (Lockbox, Mutex, C2 Node, Packer) or twins (Mirror). A fight
  that already brings a stranger may have none, and a server fight with an objective has none (Objectives).
- **An elite's clash** (docs/puzzle-levers.md 4). From level 6 an elite carries two levers whose answers pull against
  each other, and no other lever but its floor's native. A ⇄ tag names both; its tooltip says the pull and the answer.

  | Clash | Families, from | The pull | The answer |
  |---|---|---|---|
  | Zip Bomb ⇄ its seal | Ransomware, Worm, 6 | The blast strips every part; the seal re-arms by the ◆ left on its part. | Break the Zip Bomb a cycle before the seal lands. |
  | Mimic ⇄ its cast | Ghostroot, 10 | SIGINT on the beat Hangs you, and the cast can land on the beat. | SIGINT the cast a cycle early, cut its part twice, or let it land. |
  | Tripwire ⇄ Lockbox | Ransomware, 16 | Half the held damage lands at once, and loud parts take 40% more. | Trip the wire, then break the Lockbox into its loud partner. |

  The Mimic ⇄ Lockbox and Decoy ⇄ Tripwire pairs are built but no family carries both yet. A clash that doesn't fit
  (a rule it breaks, a second stranger) is rolled again; none fits, and the elite carries one lever.
- **Floor natives.** A native is a third first met on one floor: the Zip Bomb and Hotspot on floor 1; the Idle Timer,
  Front End and Backlog on 2; the Limiter and Spare on 3; the Scraper, Bad Block and Cold Store on 4. On its own floor
  it weighs three times as much, four floors down twice (an echo: .exe builds); elsewhere it rolls at its own weight
  once its level allows. **Elites and ★ rare spawns** always bring one of their floor's natives, and a rare spawn at
  least three parts and 2 more budget points.

**.exe builds** (exe.mjs). From floor 4 a wild virus's part can come as its **.exe**: the same part, its rule harder or
bent a new way, its *.exe* red on the board (hover it for what changed). Each part with a build comes as it 15% of the
time on floor 4, 5% more each floor down (35% on floor 8); an elite or ★ rare spawn there brings at least one. A part
you've never met never comes as its .exe. Its research and Codex card are the part's.

- **Echoes.** A floor's natives come back four floors down (floor 1's on 5, 2's on 6, 3's on 7, 4's on 8), weighing
  twice as much there and always as their .exe.
- **Elites** from floor 6 bring their clash's parts as .exe builds.
- **Broken,** an .exe part gives one more component, and from then on its Codex card names the build.

| Part | Its .exe |
|---|---|
| Accumulator | Discharge every 4 cycles, not 5. |
| Strobe | Each Tick deals more than the last; a delay starts the climb over. |
| Repeater | A volley of three hits, not two, each at 80%. |
| Buffer | Shields every 2 cycles, not 3. |
| Cipher Block | +50% for each Encrypt, not 25%. |
| Fan-in | +100% for each fragment, not 50%. |
| Obfuscator | Tag reveals nothing while it stands. |
| Lockbox | Caps its partner at 15% a cycle, not 25%. |
| Mirror | A twin reboots twice, not once. |
| Decoy | Bends every 3 cycles, not 4. |
| Zip Bomb | A 1-cycle fuse, not 2. |
| Hotspot | Burns and helpers set it off too. |
| Mutex | A broken lock returns in 2 cycles, not 4. |
| C2 Node | Fragments deal 100% more, not 50%. |
| Idle Timer | Every part re-arms at 4 cycles, not 5. |
| Front End | Fronts its partner while it stands, ◆ or not. |
| Backlog | Its Ack cools your skill 3 cycles longer, not 2. |
| Limiter | Its cap holds every part while it stands. |
| Spare | Boots at 90% of the signature's max, not 60%. |
| Tripwire | Loud parts attack 2 cycles sooner, not 1. |
| Scraper | Gains up to 4 ◆ from what it takes, not 2. |
| Bad Block | Cracked heals lose up to 20% of your max, not 10%. |
| Encryptor | Broken, it leaves your encryption on, one step lighter each cycle; Purge still clears it. |
| Replicator | Each Replicate hatches two fragments, not one. |
| Scrambler | While you're Scrambled, a backfired attack hits you at full, not half. |
| Rig | At 100 heat it blows a cycle later instead of burning out: a Zip Bomb's blast on both sides, then it vents. |
| Degausser | Its Wipe takes your two strongest keys. |
| Prism | A cut stops only the hit it lands on, not the rest of the volley. |
| Mimic | On its beat it plays back the dearer of your last two commands. |
| Packer | A scan unpacks only one of the parts it hides. |
| Damper | Drops two kinds of damage, not one. |
| Cold Store | Thaws with one more ◆; its Chill lands the next cycle. |
| Twin Rig | A Rig left alone takes the other's climb and 3 steps more, not 1. |
| Recycle Bin | Crossing a tick gives the key back still cooling. |

**Basic parts** (each matched to its family's Pulse Node over 20 cycles; level 6).

| Part | Families | From | Integrity, ◆, attack | Rule |
|---|---|---:|---|---|
| Pulse Node | all | 1 | 34, ◆, Surge 14 / 12 / 11 every 4 | — |
| Accumulator | Ransomware | 1 | 30, ◆, Discharge 18 every 5 | One big hit (a charge bar fills toward it). Never carries a charge. |
| Strobe | Worm, Ghostroot | 1 | 26, bare, Tick 5 every cycle from 2 | Your Block counts on every hit. |
| Repeater | Worm | 3 | 32, ◆, Double Tap 8 + 8 every 5 | Two hits on back-to-back cycles, one move: a cut on the first stops both, a delay moves both. |
| Buffer | Ransomware | 3 | 30, ◆, none | Every 3 cycles it shields the part below it for half its own Integrity; the shield takes your commands' hits only. |
| Prism | Ghostroot | 3 | 30, ◆, veiled, Spread 5 × 3 every 5 | Three hits on three cycles; a cut stops the rest. |
| Cipher Block | Ransomware | 5 | 30, ◆, Cipher 9 every 4 | +25% for each Encrypt on you. |
| Fan-in | Worm | 5 | 30, ◆, Fan-in 6 every 4 | +50% for each fragment on the board. |
| Obfuscator | Ghostroot | 5 | 22, ◆, veiled, none | While it lives every part hides its timers. Tag still shows one. |

A basic with no attack is its signature's **fallback**: break the signature first and it takes the attack over.

**Third parts** (`GENES[id].parts`, each in its family's pool). Each shows on the board; the Codex has the details.

| Family | Third part (from level) | Rule |
|---|---|---|
| Ransomware | **Lockbox** (3): 16, ◆ | Wards the Encryptor: it loses at most 25% of its max a cycle. The damage past the cap is **held** in the Lockbox (*held N*), and when the Lockbox breaks half of it lands on the Encryptor, through ◆. Break it the cycle half of it finishes the Encryptor (*cash in*). |
| Worm | **Mirror** (3): 18, ◆, Splice 3 every 4 | Twinned with the Replicator: break one while the other lives and 3 cycles later it reboots at 40% with its armor, once. Break both close together. |
| Ghostroot | **Decoy** (4): 18, ◆1, veiled | **The bent beat:** every 4 cycles from cycle 3 your command at one part goes to the part the Decoy points at (*→ Pulse Node*; the pointer moves each beat). Pointing at itself, 50% of a hit bounces back at you. Where it points shows once its ◆ is stripped or it's Tagged. Area commands and ones on you aren't bent; Sudo, Unmask and Echo Cancel go straight through. |
| Ransomware, Worm | **Zip Bomb** (5): 14, bare | Break it and its fuse burns 2 cycles, then it goes off **both ways**: 20% of your max to you unless a ◆ or a shield takes it, and every part of the virus loses a ◆ and 20% of its max and has its move that cycle cut (no tick spent). Break it last, or early when the blast pays (*blast pays*). |
| Ransomware, Ghostroot | **Hotspot** (6): 14, bare | A hit from your command on it turns the virus's next attack 2+ cycles away into a *Hot Charge*. Burns and helpers don't set it off. |
| Ransomware | **Mutex** (8): 18, ◆ | Locks the Encryptor behind a shield of a quarter of its max that takes every hit first; a broken lock comes back 4 cycles later while the Mutex lives. |
| Worm | **C2 Node** (8): 18, ◆, Beacon 3 every 4 | Fragments gnaw half again as hard while it lives, and all drop when it breaks. |
| Ghostroot | **Mimic** (8): 18, ◆, veiled | Every 4 cycles (announced two ahead) it copies the command you fire and turns it on you (`copyOf`): a hit for its whole direct hit; a strip strips your ◆ and shield; a burn leaves you Corrupted for its ticks at a quarter each; a debuff Throttles you; a shield or buff re-arms the Mimic with a ◆; a heal heals the virus's most damaged part; SIGINT, a stun or a utility Hangs you (your next command doesn't fire); hold copies nothing. A copy under a tenth of your max is a read. Its chip shows what your selected command would copy. |
| Cryptominer | **Twin Rig** (9): 18, ◆, Hash 2 every 2, climbing | A second Rig on the same heat (*twin*); its ticks vent it too. Break one while the other stands and the other takes its climb, and one step more. Bring both down close together. |
| Ransomware, Cryptominer, Botnet, Logic Bomb | **Idle Timer** (9): 20, ◆ | Hit the signature with a command at least every 4 cycles, or at 5 every part re-arms to full ◆. Pips count down on the signature's row. |
| Ghostroot, Ransomware, Logic Bomb | **Front End** (10): 22, ◆ | While it wears ◆, your single-target commands at its partner land on it. Burns, helpers, area hits and Sudo go through. |
| Worm, Cryptominer, Botnet, Logic Bomb | **Backlog** (12): 20, ◆, Ack 3 every 4 | When its Ack lands, the skill you fired that cycle cools 2 cycles longer. |
| Ransomware, Wiper | **Limiter** (13): 24, ◆, Ping 3 every 3 | No single hit takes more than 20% of its max. Many small hits answer it. |
| Worm, Ghostroot, Botnet | **Spare** (14): 2, ◆◆◆ | Sleeps off the timeline under 3 ◆. When the signature breaks, it boots 2 cycles later at 60% of the signature's max, with its attack, and drops its ◆. Pay its ◆ while it sleeps or its Integrity once it boots. |
| Ransomware | **Tripwire** (16): 18, ◆, Ping 3 every 3 | Break it while the others stand and they go **loud** for the fight: 25% more damage and every attack a cycle sooner, but 40% more damage taken and all their ◆ gone. Trip it when you can finish them fast (*loud wins*), else break it last. Throttle quiets a loud part. |
| Ransomware, Wiper | **Scraper** (19): 22, ◆, Scrape 4 every 4 | When its Scrape lands it takes the buffs you put up before it: your ◆, your shield after its hit, your timed buffs. Buff after it lands. |
| Wiper | **Recycle Bin** (19): 24, ◆ | Holds the key the Wipe takes (*holds Flood*). Push it past a tick while it holds one and the key comes back, ready. |
| Ghostroot | **Packer** (20): 20, ◆ | While it stands, the virus's rolled parts show as *Packed part* (attacks named ???) and its rules as ??? chips. A scan before you engage, or breaking it, unpacks them. |
| Ghostroot, Wiper | **Bad Block** (21): 22, ◆, Bad Write 4 every 4 | When it lands your next heals lose up to 10% of your max (*Cracked*). Purge, Scrub, Rollback, Rotate Keys and Vent clear it. |
| Cryptominer, Wiper | **Damper** (23): 26, ◆◆ | While it wears ◆ it takes nothing from one kind (burns, helpers or area hits, crossed out on its tag), which still breaks a ◆. Strip it first. |
| Ransomware, Wiper | **Cold Store** (24): 30, ◆, Chill 10 every 5 | Frozen and untouchable for its first 5 cycles; its first Chill comes 2 cycles after the thaw. |

**Built, not rolling yet.** The mechanics list's twenty (docs/mechanics-list.md,
`mechanics.mjs`: Prober, Jitter, Leaker, Sandbox, Stunner, Junker, Predator, Opportunist, Feeder, Punisher, Harvester,
Volatile, Amplifier, Bodyguard, Vendetta, Thorns, Countdown, Backtrace, Swap, Turncoat) roll in no fight
(`PARTS.mech` 0) until the designer has played them; `?playtest=part:<id>` shows each, and `developer parts mech 0.5`
rolls them for a session.

**The spread.** A strain's mechanics parts roll as a third on wild viruses of its lineage from its level and floor
(weight `PARTS.spread` 0.5, a server room's fixed third too): a Ghostroot from 12 on floor 2 can be a *LURKING
GHOSTROOT*. A part that reads the signature (the Predator, the Opportunist) comes only beside it. The Codex card names
the earliest strain it spreads from (the Worm's Leaker and Backtrace are the Doomsday's and the Junkyard's, the
Ghostroot's Jitter and Prober the Lagging Flicker's and the Last Stand's).

### Mutations and part rules

Mutations are always visible (a tag), open from level 4, and each changes a decision:

- **Armored**: every part has one more ◆.
- **Regenerative**: a bare part patches its ◆ a cycle sooner. Strip a part only when you can finish it.
- **Hasty**: every attack comes a cycle sooner and repeats a cycle faster (never under every 2 cycles); its parts have
  10% less Integrity. Race it.
- **Adaptive**: a part your commands hit three cycles running gains a ◆ (*ADAPTS +◆*; *adapting* the cycle before).

Two part rules run on many viruses:
- **Linked** (every v2 or bigger virus but Bad Blood, the Bodysnatcher and the Vengeful Bricker): when a part breaks, a third of its hit moves to the surviving part that
  attacks next (`CONFIG.linked`); a survivor whose attack isn't a hit gains one on top. Kill order decides what the
  rest hits for.
- **Fallback**: a part with no attack of its own (or one that doesn't hit you) takes over its partner's attack when the
  partner breaks first (*FALLBACK*), on its own clock: the Keyring takes the Gate's Ram, the Patcher the Surge, the
  Cooler the Hash, the Crawler's Brood bites with each spawn. A *fallback* tag and tether show it.

### Strains and grades

A strain is a variant of a family built around one rule; it shares the family's art and code. Strains come from floor
2 (never SPRAWL-00). A server sends one about half the time once its floor and level allow (fixed by its seed); each
network has a **native strain**, five times as likely as its family's others there. The fight header names it, with
its rule on hover.

| Strain | Family | From | Rule |
|---|---|---:|---|
| Patchwork | Worm | 3 | The Patcher heals the most damaged part 12 every 3. Delays stop it; ◆ and misses don't. Break the Pulse Node first and the Patcher falls back on its Surge. |
| Keylogger | Ghostroot | 4 | A Sync Window opens every cycle. The Logger takes damage only from commands fired inside it (and burns and helpers started there). Each command outside it is logged; at 3 its Dump (18) lands next cycle. It also Dumps every 6. |
| Flicker | Ghostroot | 4 | The Shade is out of phase on odd cycles: hits pass through and 15% of your command's hit bounces back. Its Fade (5) lands every even cycle. |
| Hashrat | Cryptominer | 5 | While the Miner lives your cooldowns tick only every other cycle. Last part standing, it Overclocks for 4 every 2. |
| Floodgate | Worm | 6 | Flood hits every cycle from 2, +1 each time; any delay resets it. |
| Extortion | Ransomware | 6 | Deadline (26, every 5): 14 damage to the Demand in the 2 cycles before it calls it off. |
| Leech | Worm | 8 | Siphon (8, every 3) heals the most damaged part by what it deals and clears one burn. Shields and Throttle starve it. |
| Echo | Ghostroot | 8 | While the Echo lives every damage attack that gets through repeats next cycle at half. |
| Bricker | Ransomware | 9 | Each part hits ×1.3 while below half Integrity. |
| Sleeper | Ghostroot | 10 | Dormant until any hit lands or cycle 6; then the Cell's Alarm (14) lands that cycle and every 5. |
| Overrun | Worm | 11 | Swarm spawns a fragment every 4; its fragments bite +1 every cycle they live. |
| Lurker | Ghostroot | 12 | Pulse, Scrambler, Opportunist. The Opportunist sleeps off the timeline until you carry any debuff, then wakes for good (Pounce 5 every 3). Charge: Lure, a Scramble 2 cycles longer. |
| Bloodhound | Ransomware | 13 | Pulse, Encryptor, Predator. While you're Encrypted the Predator's Bite (2) lands every cycle. Charge: Bloodlust, a burst of encryption. |
| Scythe | Ransomware | 14 | Pulse, Volatile, Harvester. The Volatile Corrupts you (2% of your max for 3 cycles); cleansing it deals the rest at once. The Harvester's Reap consumes it for 4% a cycle it had left (a reap is no cleanse). |
| Doomsday | Worm | 15 | Pulse, Countdown, Leaker. At 10 commands fired every part attacks at once; the Drip leaks you (3% a command for 3 cycles). Holding is free and doesn't count. |
| Bad Blood | Worm | 16 | Pulse, Vendetta (Grudge 5 every 3), Amplifier. The Amplifier boosts the Pulse's and the Vendetta's next attack in turn (+50%); while the Vendetta stands each break makes the rest hit 20% harder. |
| Bodysnatcher | Ghostroot | 18 | Pulse, Swap, Stunner. The Swap's Pass Throttles you, and your next command hit moves it (or Exposed or Corrupted) onto that part; the Jolt Stuns you. |
| Thornwall | Worm | 20 | Pulse, Thorns, Bodyguard. A command on the Thorns Corrupts you (1% for 3 cycles); the Bodyguard shields the part your command hit (15%, commands only). |
| Desync | Ghostroot | 22 | Pulse, Sandbox, Jitter. The Jitter lags you 2 cycles (your command lands after the virus acts); the Contain Sandboxes you a cycle (quiet commands only). |
| Junkyard | Worm | 24 | Pulse, Junker, Backtrace. The Junk puts a dead key on your bar; each status you carry stacks the Backtrace, and at 5 it calls a fragment. |
| Last Stand | Ghostroot | 26 | Pulse, Turncoat, Prober. The Probe Exposes you (next hit +50%, a ◆ blocks it); below half the Turn Scrambles you 2 cycles. |
| Sweatshop | Ransomware | 28 | Pulse, Encryptor, Feeder. Each cycle the Feeder heals the most damaged part 2% a debuff you carry. Charge: Overtime, a burst of encryption. |

The last eleven are the mechanics list's parts, paired by hand (docs/variety-plan.md 1.1). A strain's build crowds out what
would break the compatibility rules beside it: the Doomsday never rolls Hasty, and Bad Blood and the Bodysnatcher are
never Linked.

**Mutated strains** (docs/variety-plan.md 1.3). Each of the first eleven has a mutated form 10 levels later: the strain
(its rule, tell and author) plus one mechanics part, named by the part's adjective. Its part spreads as any strain's
does: the Bodyguard onto worms from 13, the Jitter onto ghostroots from 14, the Prober onto ransomware from 16.

| Mutated strain | From | Adds |
|---|---:|---|
| Guarded Patchwork | 13 | Bodyguard: shields the part you hit, 15% of its max. |
| Leaking Keylogger | 14 | Leaker: its Drip leaks you, 3% a command for 3 cycles. |
| Lagging Flicker | 14 | Jitter: lags you 2 cycles; your command lands after the virus acts. |
| Junking Hashrat | 15 | Junker: a dead key on your bar until you fire it. |
| Amplified Floodgate | 16 | Amplifier: the Pulse's and the Flooder's next attack in turn, +50%. |
| Probing Extortion | 16 | Prober: leaves you Exposed; your next incoming hit +50%. |
| Feeding Leech | 18 | Feeder: heals the most damaged part 2% of its max per debuff you carry. |
| Volatile Echo | 18 | Volatile: Corrupts you 2% for 3 cycles; cleansing deals the rest. |
| Vengeful Bricker | 19 | Vendetta: while it stands, each break makes the rest hit 20% harder. Never Linked. |
| Lurking Sleeper | 20 | Opportunist: sleeps on past the virus's wake until you carry a debuff. |
| Counting Overrun | 21 | Countdown: at 10 commands fired every part attacks at once, fragments too. |

The Leaking Keylogger and the Feeding Leech carry two punishments on one axis by design (two leaks, two healers).

**Grades.** Deeper servers send bigger versions: **v1** (SPRAWL-00 and floor 1) as normal, **v2** (floors 2–3) ×1.15
Integrity and ×1.1 damage, **v3** (floor 4 and deeper) ×1.35 and ×1.25. At your wall a v2 invader counts 2 levels
higher and a v3 4.

### Guards and ICE

A guard holds a traced server's vault key in its guard post (an elite room). Each is a basic attacker and a signature.

| Guard | Parts (base) | Rule |
|---|---|---|
| Watchdog | Sentry 24, bare, Sweep 6 every 3 · Tracker 28 ◆, Trace-back 16 every 5 | One big hit to plan around. |
| Sentinel | Lens 24 ◆, Glare 10 every 4 · Lockout 24 ◆, 7 every 3; both veiled | Timers hidden until you strip or Tag them. Its lever is its seal, the Blacklist. |
| Crawler | Maw 24, bare, Bite 7 every 3 · Brood 28 ◆, a fragment every 4 | Once the Maw is down the Brood bites with each spawn (Fallback). |
| Shredder | Grinder 26 ◆, Grind 9 every 4 · Shredder 26 ◆, Shred 14 every 5 | One slow, heavy strike. |
| **Bouncer** ICE (for the Sentinel) | Gate 30 ◆◆◆, Ram 10 every 3 · Keyring 22 ◆ | Every 4th cycle the Keyring re-arms the Gate to full ◆, three times, then overheats. Kill the Gate between re-arms; break it while the Keyring stands and the Keyring takes the Ram. |
| **Tracer** ICE (for the Watchdog) | Probe 22, Ping 4 every 2 · Tracker 28 ◆ | Its Trace-back (6 every 3) grows 2 every cycle. |

On floor 2 and deeper about half the servers (by seed) field the ICE. From floor 3, half the guard posts and ICE bring
**Kestrel's Idle Timer** as a third part (`PARTS.kestrel`; never a nest's Crawler). From level 6 every guard but the
Sentinel brings a **Zip Bomb** (docs/puzzle-levers.md 5).

### Rules and authors

Every virus is a body plus rules, written by a crew (`genes.mjs` the 41 rules, `authors.mjs` the crews). TOLLGATE
writes ransomware, SWARMLINE worms, PALEMASK ghostroots. A strain is a named build of its author: the Keylogger NULL
CHOIR's, the Hashrat GLASSJAW's, the Floodgate, Leech, Patchwork and Overrun SWARMLINE's, the Sleeper, Flicker and Echo
PALEMASK's, the Extortion and Bricker TOLLGATE's. The mechanics strains go the same way (the Lurker PALEMASK's, the
Bloodhound and Scythe TOLLGATE's, the Doomsday, Bad Blood and Thornwall SWARMLINE's, the Bodysnatcher NULL CHOIR's, the
Desync and Last Stand PALEMASK's, the Junkyard and Sweatshop GLASSJAW's), and their
parts join their authors' toolkits; a mutated strain is its strain's author's. Kestrel writes the ICE and the Sentinel. A faction's server runs its
faction's viruses; SPRAWL-00's strays sign nothing.

- **Names.** A wild virus is named for its costliest rolled rule, its body's stem, four digits and its grade:
  *WARDED CRYPTJACK-4821 v2*. The fight header adds the author's byline in its colour.
- **The rules' chips** under the virus's bar name its rules (the body's dim and dashed, rolled ones bright), ??? until
  met or scanned. `inspect <part>` lists a part's rules and what each does once researched; it takes no cycle.
- **Compatibility** (docs/genome.md 5.3): at most one punishment and one amplifier per axis (Burst exempt, tells left
  out), at most one beat, and the hard exclusions.
- **Testing:** `?playtest=<name>` (`?playtest=flicker`, `?playtest=bouncer`) or `encounter <name>` fights any strain or
  fixture.

### Part research

What you know about a virus is what you've done to its **parts** (`research.mjs`). Each part counts on its own, by its
body (a boss's parts count on its family's or strain's):

| You | Research |
|---|---|
| Break it (its first break in a fight) | +1 |
| Cut its move with a tick | +1 |
| Answer a tell it rides (by any answer) | +2 |

A cut that calls off a charge counts as both (+3). A crewmate's counts for them. Research tops out at **60**: a part you
meet often is decoded in about two fights, gives up its rule in about eight and is mastered in about thirty.

| Research | What the Codex and the board show |
|---|---|
| 0 (met) | Its name and what it hits; on the board *???* and how to decode it |
| 3 (decoded) | Integrity, ◆, its attack and timing at your level; a cue under its name (*locks Encryptor*). Pays a kill's XP (Intel) the first time |
| 15 | Its rule, what answers it (a muted ▸ line) and the tells it can ride |
| 60 (mastered) | Its loot; it drops components 25% more often, and every hit of yours on it deals 3% more. A small amber star by its name |

Each tier says so once, in the log and as a float on the part. **Tethers** (`partLinks`): every rule that reaches from
one part to another (a lock, a ward, a twin, a re-arm, a redeploy, a fallback, the Cooler, a C2 Node) draws a steel
tether in the board's gutter, glowing while it holds, grey while it's down, with **↻ N** when it comes back in N cycles;
a Mutex's lock also sits on its partner's bar as an absorb segment, a Lockbox's ward as a cap line. Before the
protector is decoded its node shows **?**.

### The Codex tab

A top tab (`codex`), between Loadout and System. Left, an index in six groups: **Families** (Ransomware, Worm,
Ghostroot and the room bodies), **Strains** (33), **Guards & ICE** (6), **Exfils**, **Bosses**, **Mutations**; each row
its icon, name and count (a body's research %, a boss's wins, kills toward a mutation's decode). Unmet entries are ???.
Over the index, two tabs: the Codex and the collection log (*Collection log*).

- **A family, strain or guard:** its art, your kills, its research, the sets you've faced and its authors; one card a
  part, revealed by research (a bar of 60 marked at 3, 15 and 60, *n/60*); its attack sets as timing strips (only those
  faced); its tells (??? until said in your fight); its loot (??? until the part is mastered).
- **A boss** (??? until fought): its body, floor and lair, your fights and wins, phases, parts, tells and its **loot
  table** as WoW's dungeon journal shows it: the sure item, its uniques and their odds with the pity (`bossTable`).
- **A mutation:** its axis, level and rule; two kills decode it.

It remembers `s.dex` (genome.mjs) and `s.research`; crewmates' fights don't write it.

## The Resident and bosses

### Solo bosses

Bosses have phases and an enrage. A solo boss's **♛ part** (its signature) has phase ticks at 50% and 25% instead of
interrupts: taking it across one starts its next phase; its other parts interrupt as usual (interrupt.mjs rule a;
`developer bossrule b|c` tries the alternatives). A boss brings three tells, every one open at its level. From its
enrage cycle every attack lands every cycle, a quarter harder, with a warning three cycles before. A phase change
flashes on screen.

**The Resident.** Opening a server's vault unseals its **Core**, where the Resident waits: the owner's process, a boss of
the server's family (all three parts) at the server's level, 1.4× Integrity (1.1× on your first server). Its phase
re-arms every part; it enrages at cycle 18. A worm or ransomware Resident plays in acts instead (below): 1.1× Integrity,
enraging at cycle 24. Beat it and the server is **taken over**: yours, teal on the map, its Core
quiet for good. Lose and you're disconnected, and for 6 hours it is a level stronger, up to three levels.

| Boss | Where | From | Integrity | Phase | Enrages |
|---|---|---|---|---|---|
| RELAY-KING (worm) | SPRAWL-00's relay room, a Core sealed until level 3; back 30 minutes after it falls | level 3 | 1.6× | every attack a cycle sooner | cycle 16 |
| REPO MAN (ransomware) | The Bounty event from level 8 | level 8 | 1.6× | In acts: its Repo Agent's beat every 3 cycles; every attack a cycle sooner | cycle 18 |
| HOLLOW CHOIR (ghostroot) | Its own event, from level 10 | level 10 | 1.6× | In acts: Harmony (75% of a bend bounces back); every attack a cycle sooner | cycle 16 |

### Boss acts (acts.mjs)

A P4 boss (docs/puzzle-fights.md 7) plays in **three acts**: the first from the start, the next two from its ♛ part's
ticks at 50% and 25%. Built: the worm and ransomware Residents, REPO MAN and HOLLOW CHOIR.

- **One tick a hit.** A hit takes the ♛ under its next tick and no further, so no act is skipped.
- **A tell an act.** Act 1 deals the boss's first tell (its charge), act 2 its cast as well, act 3 its third.
- **The beat** repeats on a fixed rhythm, always on the board. Act 2 quickens it; act 3 makes every attack a cycle sooner.
- **The one to leave.** The ♛ stays above its next tick until this act's beat has played, or nothing else stands. Taken
  under it sooner, every part re-arms (*Too soon*). The held tick is outlined red; its tooltip says when the beat plays.

| Boss | The beat | Every | What answers it |
|---|---|---|---|
| Resident (worm, ransomware) | **Backlash**: a part with an attack that your command hits on the beat lashes back for its attack doubled (30% of your max at least, 60% at most), and an Encrypt or Replicate does its own thing once on top. A hit that breaks it doesn't lash, nor do burns or helpers sent before. | 4, then 3 | A shield, a buff or hold, a part with no attack (the Lockbox), or a hit that breaks its part |
| REPO MAN | **Repossess**: its Repo Agent, a Mimic, copies what you fire and turns it on you | 4, then 3 | What costs least to have copied, or break the Agent |
| HOLLOW CHOIR | **Bend**: its Decoy bends your command at one part onto the part it points at, and part of the hit comes back at you wherever it lands (50%, 75% from act 2) | 3 | A shield, a buff or an area command, or a small hit |

The Backlash's chips (*Lash −N*) sit on every part with an attack, in the columns the beat falls in.

**Loot.** A boss always drops one item at its level (`bossLoot`): a blue, or a yellow one kill in four. The Resident
rolls like an elite instead (one is met on every takeover). Each boss has **two uniques of its own**: 15% a kill, +5%
for every kill without one, back to 15% when one drops (about four kills for the first); one you lack comes first. A
Resident drops each of its two once, then makes no unique roll. After a miss the log gives the next kill's chance.

| Boss | Unique | What it does |
|---|---|---|
| RELAY-KING | Crown Packet (exploit, 3) | +30% damage on a part whose attack lands this cycle or next |
| RELAY-KING | Hop Limit (shell, 3) | When an attack lands on you, restore 3% of your health |
| A Resident | Squatter's Rights (proxy, 4) | Start every fight with a ◆ |
| A Resident | Eviction Notice (exploit, 4) | When you break a part, all your cooldowns drop by 1 |
| REPO MAN | Lien (script, 8) | +6 damage on a part with no armor left |
| REPO MAN | Repossessed Key (shell, 8) | Encryption on you stacks half as fast |
| HOLLOW CHOIR | Choirboy (proxy, 10) | Scrambles on you last one cycle less |
| HOLLOW CHOIR | Hollow Note (exploit, 10) | +30% damage on odd cycles |

### Lairs and native bosses

Every floor from 2 has a **lair** slot, found by tracing. Its two outer rooms hold its boss's family (your native
strain more often) and come back half an hour after they fall; its Core holds the floor's **lair boss**, back an hour
after it falls. The map labels a found lair with its boss, and its card's boss tag gives the rules.

**Lairs by floor** (`floors.mjs` lairBossFor): each floor draws from the built bosses that fit its band. Your
**native boss** takes the lair on its own floor; the others draw from their pool, weighted to your network's lean.

| Floor | Its pool |
|---:|---|
| 2 | DEADBOLT, BACK ORIFICE, PATCH TUESDAY, SLEEPWALKER, MIRRORSHADE |
| 3 | HASHLORD, FLOODWALL, ECHOLALIA |
| 4 | TRIPMINE |
| 5–8 | none built yet: your native boss |
 A boss with a floor
(HASHLORD 16, MIRRORSHADE 12) moves in only once you reach that level; until then the Core stays sealed and says from
which. Every lair boss drops a boss's item and rolls for its network's **native uniques** (Networks) at the bosses'
odds, kept per network; its first fall names them all. A strain boss's hits step with level (×0.8 at 10, ×1.1 at 18,
×1.45 at 30).

| Boss | Built on | What it does |
|---|---|---|
| DEADBOLT | Ransomware, a Mutex | Its charge is Deadbolt. Re-arms at 60%; at 30% a second Mutex re-locks the Encryptor |
| TRIPMINE | Ransomware, a Tripwire (a Lockbox below 20) | Claymore on the Pulse Node. Every attack a cycle sooner at half |
| HASHLORD | The Hashrat strain (GLASSJAW's) | A Pool Lock wards its Miner against your commands (burns and helpers go through). Difficulty Bomb, and Block Reward grows each part by half of what it has left. Re-arms at 60%; at half a second Miner spins up |
| BACK ORIFICE | Worm, a C2 Node | Spam Run hatches two. Sooner at half; at 25% a Mirror twins the Replicator |
| PATCH TUESDAY | The Patchwork strain | Rollup. Re-arms at 60%, sooner at 30% |
| FLOODWALL | The Floodgate strain | Storm Surge. Re-arms at half |
| MIRRORSHADE | Ghostroot, a Mimic (NULL CHOIR's) | Glass Cut on the Scrambler. While you're Scrambled its Mimic plays your hit back twice over. Re-arms at 60%; at half the Mimic becomes a Doppelganger of the first part you broke |
| SLEEPWALKER | The Sleeper strain | Night Terror. Re-arms at half |
| ECHOLALIA | The Echo strain | Last Word. Re-arms at 60%, sooner at 30% |

### Crew bosses (raid.mjs)

A **crew boss** is built for four, like a WoW raid boss: in every phase the tank, the healer, the damage dealers and
support each have a job, and a missed job costs the fight. Every mechanic is announced two cycles ahead on a row above
the boss's parts (*Compiling…* for a cast) and in the log (`PINK SLIP → kilo in 2.`).

- **Who it hits:** everyone in full; **aggro** (whoever draws fire with Firewall or Bulkhead, else the most damage over
  3 cycles); **marked** (a random player not holding aggro); **lowest** (by share of Signal); **healer** (the most heals
  over 6 cycles).
- **Mechanics** are sized as a share of the target's max Signal: Buster (tank; some leave Thermal Stress, +25% damage
  taken a stack until Purged), Pulse and Burst (healer), Corruption (healer: damage every cycle until cleansed; some
  spread if left 3 cycles), Encrypted sectors (eat the next heals), Workers (tank: adds on a marked player), Priority
  add (damage: the boss takes 75% less while it lives), Firewall phase (everyone: a shield to break in 3 cycles), Cast
  (support: SIGINT it), Enrage.
- **SIGINT** stops a crew boss's cast; some casts can't be stopped, and a stopped boss casts its next a cycle sooner. A
  crew of four has four: take turns.
- **Losing:** you going down ends the fight, and so does a **wipe** (half the crew down).
- **Smaller crews:** three meet 72% Integrity and mechanics at 80%; two, 42% and half; it enrages 3 cycles later for
  each player short of four.
- **Early levels:** mechanics are two fifths of their size to level 9, three fifths at 13, full from 17; before level 10
  a boss casts nothing SIGINT would stop, and Corruption waits for level 12.
- A crew boss is data (`raid` on its `BOSSES` entry: `FOREMAN`, `HEATSINK`, `COLDWALLET` in data.mjs).

### KESSLER-FARM-00 (the crew dungeon)

At level 7 a mining farm somebody stopped paying for turns up on floor 1. It lets you in only with a crew (`crew sim
<class>` from level 5, or `crew invite <friend>`), and keeps up with your level. Its rooms: an elite worm pack at the
intake (blocking THE FOREMAN), an elite ghostroot pack in cooling (blocking HEATSINK and an optional elite ransomware
pack), the ledger vault (`open` once the Foreman and the Heatsink are down) and COLDWALLET behind it.

- Packs are elites at 2.9× Integrity. **Attrition:** your Signal and your crew's carry from fight to fight; after the
  Foreman and the Heatsink everyone comes back up to at least 60%. A pack comes back 30 minutes after it falls, a boss 6
  hours after; the ledger locks again when the Coldwallet is back. Walking costs a flat 3%. A farm elite that beats you
  stays put.
- **Loot:** a pack drops like an elite; each boss a yellow at its level every kill, 10% a world unique, and its two
  uniques at 30% a kill, +10% a miss. Every pack kill has 1 in 40 at Dead Pool (the nest's pack 1 in 20 at Hashboard).
- **At levels 7–9** the mechanics are two fifths of their size and the bosses cast nothing SIGINT would stop.

| Boss | Unique | What it does |
|---|---|---|
| THE FOREMAN | Foreman's Lanyard (proxy, 7) | Below half, the next hit on you deals half, once a fight |
| THE FOREMAN | Overtime (script, 7) | +2% damage for every cycle the fight has lasted, up to +30% |
| HEATSINK | Thermal Paste (exploit, 8) | +20% crit chance on a Tagged part |
| HEATSINK | Fan Curve (shell, 8) | Your burns grow +2 a cycle |
| COLDWALLET | Cold Wallet (proxy, 9) | A crit against you lands as a normal hit |
| COLDWALLET | Air Gap (shell, 9) | Start every fight with a ◆ |
| Packs | Hashboard (script, 7) | When you break a part, that skill's cooldown comes back |
| Packs | Dead Pool (exploit, 8) | +30% damage on a part below half |

**THE FOREMAN** (ransomware; the tank and SIGINT check): ×13 Integrity, enrages at 22 (MASS LAYOFF). Its Surge goes at
whoever holds aggro.

| Phase | Tank | Healer | Damage | Support |
|---|---|---|---|---|
| Day shift (100–50%) | Taunt and Bulkhead for **Pink Slip** (90% on aggro, every 6); pull the **Scabs** (two adds on a marked player, every 7) | Heal the tank after Pink Slip; everyone after **Shift Bell** (10%, every 5) | Break the **Payroll Lockbox** (the boss takes 75% less while it lives; it goes off for 30% on everyone every 4) and the Scabs | SIGINT **Clock In** (45% on everyone, every 5) |
| Layoffs (under 50%) | Pink Slip leaves Thermal Stress: Purge it between busters | Cleanse any Layoffs that gets through | Burn the boss before the enrage | SIGINT **Layoffs** (every 5: it encrypts the crew, 8% a cycle) |

**HEATSINK** (worm; the healer check): ×17 Integrity, enrages at 25 (THERMAL RUNAWAY). Its Replicator sends workers.

| Phase | Tank | Healer | Damage | Support |
|---|---|---|---|---|
| Warm loop (100–40%) | Pull the **Coolant Workers** (two adds, every 7, while the Replicator lives) | Heal through **Thermal Spike** (6% on everyone every 3, growing), top up the **Overheat** target (30%, every 5), cleanse **Coolant Leak** (10% a cycle, every 4) | Break the workers, or the Replicator | SIGINT **Fan Stall** (6% a cycle on everyone for 4, every 8) |
| Meltdown (under 40%) | Take **Core Melt** (40% on aggro, every 5) | Thermal Spike every 2; Coolant Leak on two players every 6, spreading if left 3 cycles | Burn the boss before the enrage | SIGINT Fan Stall |

**COLDWALLET** (ghostroot; the damage check, and everyone's): ×8 Integrity, enrages at 18 (LIQUIDATION). Its Decoy
bends your commands on its beat.

| Phase | Tank | Healer | Damage | Support |
|---|---|---|---|---|
| Hot wallet (100–50%) | Mitigate **Margin Call** (55% on aggro, every 4) | Heal the tank, and everyone after **Gas Fee** (10%, every 4) | Break **Cold Storage** (a shield of 12% of its Integrity every 6; unbroken in 3 cycles it goes off for 35% on everyone); don't hit into the beat | SIGINT **Rug Pull** (30% on everyone, every 7) |
| Bank run (under 50%) | Margin Call | Heal through **Encrypted Sectors** (eat 30% of max Signal of heals, every 6); top everyone up before **Withdrawal** | Break Cold Storage; beat the enrage | **Withdrawal** can't be stopped (30% on everyone, every 5): stay topped up |

## Runs: servers as rooms

Every `connect` plays a server as a graph of rooms (`netrooms.mjs` on the rooms engine, `floorplan.mjs`), kept on the
server for good: what you've cleared, seen, opened and taken stays across visits and saves. The **Run** tab shows the
strip (the server, its kind, level and rule, your Signal, **Rooms n/N**, your keys, the hunter, your pack, **Wait** and
**Jack out**), the room map, and each room's pop-up card. `?playtest=rooms` builds a throwaway server to try (README).

### Rooms

| Room | Mark | What it is |
|---|---|---|
| Entry | door | Where you come in. Files left for you (a relay's route files) are `pull`ed here. |
| Process | ▣ | A virus of the server's author at the server's level; the same family every time, its set and mutation fresh each respawn. |
| Elite | ◆▣ | An elite (`ELITE`) with a clash, one more tell, enrages from cycle 9. |
| Guard post | ◆▣ KEY | A guard or ICE holding the vault's key, shown as an elite. Hoard, Rich and Hardened servers' are Armored. |
| Vault | ▥ | `open` with its key, or `force` it for 15% of your max Signal. It holds the server's files: a protocol half the time (your first server's always), code, a trace record, spare credits, now and then a Zero-day (floor 2+) or a filter, and a contract's planted file. Everything goes in your pack. |
| Core | ♛ | The Resident, **SEALED** until the vault opens. |
| Cache | ▤ | Credits and code, now and then a script; one in four is **bait** (10% of your max Signal; `cat` shows it). Refills 2 hours after you take it. |
| Rest room | ☰ | `rest`: 30% of your max Signal, once a visit. |
| Den | ☠ | The hunter's. |
| Junction | · | A crossing. |
| Socket | bus slot | Guarded by a process once, then open for good: build a program in it (Sockets and programs). |
| Puzzle room | its own | A board, not a fight (Puzzle rooms). |
| Thread room, nest, hidden room | | Threads and Quirks, below. |

A medium server is 12 rooms: the spine from the entry to the Core with the vault before it, branches of one to three
rooms, and a loop; small and large ones scale it. Rooms are named for what they are (Entry, Process 2, Elite 1, Vault,
Core), and a fight room you know with its virus up wears the virus's name.

### Room addresses

Every room has a short grid address, a column letter and a row number (**C2**, **E4**), the same for good and never
shared on a server. It sits on every chip (an unknown room's too), opens its card, leads each line of `ls` and `map`,
and `go`/`cd` take it. A room a contract points at, or whose live virus a job would count, shows its address amber with
the contract's mark.

### Objectives (objectives.mjs)

One plain fight room in two (a Process, from level 6) carries an **objective**, rolled with each respawn. It takes the
fight's lever's place: a room third that's a lever stays out of that fight. The map tags the chip with its icon (and
number), and the room card names it with its bonus.

| Objective | What wins | Missed | Board |
|---|---|---|---|
| **Priority** | Break the marked part by the end of cycle 5. The rest can stand. | The fight goes on, no bonus. | ◎ on the part with its cycles left; **Priority 2/5** on the phase strip. |
| **Uptime** | Keep your Signal up to the end of cycle 8. The virus can't be broken (a hit leaves a part at 1); every 3 cycles its attacks come a cycle quicker. | You disconnect as usual. | **Uptime 3/8** on the phase strip. |
| **Backup** | Break the virus with the Backup still up. It has 60% of your max Signal, and every damage attack landing on an even cycle hits it instead of you, nothing of yours soaking it. | The fight goes on, no bonus; its attacks come back to you. | Its own ivory row under yours, a segmented bar; its disk on each attack card coming for it; **Backup 47/60**. |
| **Clean run** | Break every part with no status on you at the end of any cycle (any debuff the virus puts on you). | The fight goes on, no bonus. | **Clean run** on the phase strip, struck through once a status sticks. |

**Met, it pays:** the loot rolls once more, the kill's XP half again, and 2 components. The Exfil's upload is an
objective too (it pays its archive, not the bonus).

### Walking and fog

- **Walking** into a room for the first time on a visit costs 3% of your max Signal if you've been in it before, 5% if
  you never have (4% and 6% from floor 5); the cost sits on its chip. Rooms you've walked this visit and `wait` are free.
- **Fog.** Every room is **unknown** until you've been in it: a dashed ghost chip with a ? and its address. You see the
  shape of the rooms next to you and one further (an Infiltrator's two) and the Core's chip. Walk in and it's
  **discovered** for good. A virus in an unknown room still stops you at the door (**Engage** / **Step back**).
- **Live viruses hold their rooms:** `engage`, or `back` out (the move in is spent).
- **Scan** (`scan [room]`, or **SCAN −1** on a discovered neighbour's chip): 1 Signal (an Infiltrator's is free and
  reads deeper) for a card naming every rule the virus carries; it unpacks a Packer.
- **The key walk.** The guard post sits on another branch, three or more rooms from the vault. Beat its guard and the
  key is yours for the visit; jack out holding it and it goes back to its post, guard and all. An Archive has two
  vaults and two keys; only the one before the Core unseals it. A leaked key or a key cracker puts it in your hand as
  you connect.
- **Half the rooms cleared** draws the whole map, as unknown chips.

### The hunter

Medium and large servers from floor 2 have one. A **Patroller** (Mailhubs, name servers) walks a fixed loop, its traces
tinted red once you've discovered a room of it. A **Tracker** (Mirrors, Archives, Labs) sleeps in its den and wakes
when you walk into a room next to it (a discovered one wears **WAKES**); it follows you, loses you five rooms off, and
walks home. Either moves a room for every two of your moves (a Lab's awake Tracker every move), only when you walk or
wait. It shows its next room with a red dashed arrow and never enters the entry or the rest room. You see it in your
room, next to you (an Infiltrator two off) or in a discovered room; within two rooms but out of sight, the room at the
fog's edge pulses red. Meet it and you fight it (two levels over the server); beat it and it drops a script and is down
for the visit. An Infiltrator can `slip` past it once a visit.

### Rivals (rivals.mjs)

Named runners, one per crew, racing you to a traced server's vault ([docs/rivals.md](docs/rivals.md)).

| Rival | Crew | Lineup | Counter-pick (how you won the last fight → the part it adds) |
|---|---|---|---|
| **KUDZU** | SWARMLINE | Trojan, Twinned Worm, Worm | Burst one down → Patcher · spread hits → Hot spare · else Flood ramp |
| **ESCROW** | TOLLGATE | Ransomware, Wiper, Cryptominer | Burst → Mutex lock · slow or burns → Deadline · else Ward |
| **HUSH** | PALEMASK | Ghostroot, Echo, Sleeper | Every tell read → Veil · helpers → Phase shift · else Decoy mirror |

- **The roll.** At most one a visit: 20% at each connect to a traced server whose vault is shut and that isn't yours,
  then none for an hour (`RIVAL`). It starts as far from the vault as the entry is, never next to you.
- **The walk.** A room for each of your moves (walk or wait), by the shortest route to the vault, never through the
  Core, no key needed. At the vault it opens it and takes the files, then walks to the entry and jacks out with them
  (got away: the files are gone). Its room, its route (a red dotted trace) and the vault show through the fog; the
  vault's chip shows the race (**YOU 3 · KUDZU 2**).
- **Aggro.** When it reaches your room, or you walk into its, it has you: no step back, no wait, no jack out. Engage.
- **The fights.** 2 on floors 1–2, 3 from floor 3, one after another, one level over you, sized like a process room.
  Your Signal carries; each fight starts your cooldowns fresh. The board tags it **KUDZU 2/3**.
- **Counter-pick.** Between fights it adds one part to its next virus, read from how you won the last: burst (a hit
  of a fifth of the virus's Integrity), spread (two parts hit in a quarter of your cycles), slow (14 cycles), burns or
  helpers (a third of the damage), every tell read, small strips (◆ broken six times). Shown before you engage; the
  part wears **+ KUDZU**. The Veil veils every part of the next virus instead (a ◆ each at least).
- **Stakes.** Beat the whole lineup: its pack (4 Stashes' credits and a blue one level over you) and, if it opened
  the vault, the vault's files, into your pack. Lose: it's gone with both, and you're disconnected as from any fight.
- **Memory.** `s.rivals`: each rival's meetings, your record (*meeting 3 · 1–1*), how it last ended, and the command
  HUSH quotes back. wick has a line on each card.

### Respawns and progress

- **Respawns** (real time, never while you stand in the room): a process room 15 minutes, a guard post 20, an elite 45,
  the Core 60 while you explore; once the server is **Mapped** or yours, 2, 3, 5 and 10 (`ROOMS.respawn`), so a
  finished server carries a session of farming (*Fast respawns* on its card). A Cron Spawner halves
  either. One respawn in 25 is a **★ rare spawn**: two levels up, five kills' worth of XP, usually an item.
- **Progress** counts rooms cleared at least once and never goes down: **Rooms n/N** on the strip and the map card. At
  all of them the server is **Mapped**: an item two levels over it and one lump of XP (5 kills plus half of each fight
  room's kill, an elite's three times and the Core's four, times the deed scale: about 40 kills of your level on a
  medium server; `mappedShare`). A first clear pays no XP of its own. Caches, puzzle rooms, thread rooms and quirk
  rooms never count.
- **Wild servers** (SPRAWL-00, a lair, the farm) can't be taken over: each room is a fight, and kills pay straight
  into your bank. Each room fills again on its own timer (SPRAWL-00's 90 seconds, RELAY-KING's 30 minutes, a rogue
  server's 3–5 minutes). A contract's named target holds its room until it falls.

### Visits

- **Signal on a run** is what you walked in with, spent by moves, fights, forcing a vault and bait. A fight never
  leaves you with more than you walked into it with. At home Signal rests back 20% of your max a minute (offline too);
  you need a quarter to connect. A clock beside the meter counts down to full. Click its **+** (or `top up`) to pay for
  the rest now (The economy).
- **Jack out** (`jack out`, or the strip's button) from any room banks your **pack** (cache credits and code, the
  vault's files, kill drops; a **Banked** card) and sends you home.
- **Reconnect wait.** A server you leave takes you back after 30 s (`CONFIG.relockMs`), +15 s for each disconnect on
  its run, 2 min at most (`CONFIG.deathWait`). A clean jack out resets the count. Connect counts it down,
  with ☠ and the count. Deadman's Switch counts as a jack out.
- **Home while out:** an invasion that wants you waits until you're back.
- **Contracts ready:** a yellow ✓ by Mail on the top bar.

### Server kinds, specials and quirks

| Kind | Rule |
|---|---|
| Mailhub | Spam floods: fights on its mail queue (the Patroller's loop, or its longest branch) bring a weak, quick Spam Flood. |
| Name server | Hops: two curved links skip a room. The hunter uses them too. |
| Mirror | One cache is a mirror with an elite behind it. |
| Archive | Two vaults, each with its own key; only the one before the Core unseals it. |
| Lab | From cycle 10 of a fight the rack burns you for 2% of your max Signal and every part for 3% of its max a cycle. Its Tracker is fast. |
| Router (floor 2 only) | Routes: two links on its loops are one-way, drawn as an arrow at the link's middle. You and its Tracker keep to them. |
| Honeypot (floor 3 only) | Bait: every cache is bait (10% of your max Signal to take), and bait pays double. A Patroller. |
| Cold storage (floor 4 only) | Cold: every virus sleeps off the timeline (· asleep) until you hit it or cycle 6, then attacks at its own pace; the vault holds two kits (`kit.bin`, `kit2.bin`). |

A floor's signature kind takes about a third of its servers (`floors.mjs` FLOOR.signature), off the floor's own dice.

**Specials** (`specials.mjs`, docs/server-specials.md): every traced server has one from its seed, two from floor 5
down; Guarded comes 1 in 25. Each is an upside and a cost, and points at a program that leans in (⇡) and one that
fixes the cost (⇣). It shows as one filled amber tag (its glyph and name) on the card, its rule, chips and ▸ programs
on hover, and as its glyph in amber on the map node.

| Special | Upside | Cost | ⇡ | ⇣ |
|---|---|---|---|---|
| ⚡ Volatile | Sends invasions twice as often; its invaders you kill drop a daemon 50% of the time | Its invaders come 2 levels higher | Amplifier | Lockdown |
| ≈ Stable | One more rest room (beside the spine; each rests once a visit) | Sends invasions half as often | Lockdown | Amplifier |
| ⌗ Rich | Kills and its vault drop twice the code | Its guards and Resident are Armored | Code Siphon | Patch Injector |
| ↻ Hostile | Its fights pay 50% more XP | Its viruses hit 25% harder | Defrag Bay | Bulkhead |
| ★ Legacy | Rare spawns twice as often | Its Resident fights a level higher | Listening Post | Bulkhead |
| ⊞ Backbone | One more socket room | Its invasions travel twice as fast | any | Lockdown |
| ◆ Hardened | Its vault pays double (credits and code); Root climbs twice as fast | Its guards and Resident are Armored | Honeytoken | Patch Injector |
| ♜ Guarded | Its vault holds one of its floor's uniques, once | A crew elite holds its Core in the Resident's place | — | — |

**Leanings** (`leanings.mjs`, docs/leanings.md): every traced server also has one positive rule from its seed, keyed on
the virus's timeline so it favours no class. It holds in every fight on that server.

| Leaning | Rule |
|---|---|
| Venting | A part takes 50% more damage, from every hit, on the cycle after it attacks. |
| Wind-up | A part takes 25% more damage, from every hit, on the cycle its attack lands. |
| Brownout | An attack deals 30% less damage to you when your command aimed at its part that cycle (Spawn and Deploy count). |

The card shows a small table under the level: **Server** (kind, specials, quirk) beside **Leaning** (one filled amber tag
with its icon). In a fight a *Leaning* row under Gear counts what it has paid (damage added, or Signal kept), lit amber
on the cycle after it paid; that cycle the part it paid on carries an amber tag with the amount. Nothing shows ahead of
time.

A server's kind, specials and quirk are tags on its card, each with its rule on hover. A server a faction owns shows its owner and the standing that taking
it moves (−15 with the owner, +8 with each rival).

### Quirks

Every traced server has its family's quirk (`QUIRKS`): one rule, a tag on its card.

| Family | Quirk | Rule |
|---|---|---|
| Ransomware | Hoard | Caches pay 50% more, but the guards are Armored. |
| Worm | Nest | An optional **nest** room holds a Crawler and its brood (two hatchlings already out), an elite-lite fight at the server's level. A kill pays the usual and **6 components**. It respawns like an elite, never as a rare spawn. |
| Ghostroot | Hidden | A **hidden room** stays off the map (no chip, no ?, no address) until you clear the room beside it, then opens for good: a stash (a cache's pile, a 15% script, a blue one time in ten), refilling 2 hours after you take it, never bait. |

Each quirk room hangs off a dead end of a branch, never in the way of the vault or the Core, and never counts for
Rooms n/N, Mapped or a no-rest job. Invasions carry the quirk too (Invasions).

### Run commands

| Command | What it does |
|---|---|
| `ls` | This room and its neighbours, by address: what each is, its timer, ? for unknown, the cost to walk in |
| `cd`/`go <room>` | Move (a name, a number from `ls`, or an address; `cd ..` steps back; a wild server's folder paths work too) |
| `map` (`tree`) | The rooms you've seen, ✓ on cleared ones, its links |
| `wait` | Stay a move (the hunter takes its step) |
| `engage` (`attack`), `back` | Fight what holds the room, or step back out |
| `cat`, `pull` | Read a cache, take it; `pull` in an open vault or at the entry takes what's waiting |
| `open`, `force` | The vault: with its key, or for 15% of your Signal |
| `rest` | The rest room (or a Defrag Bay: 25%), once a visit |
| `scan [room]` | Read this room or a discovered neighbour |
| `slip` | Slip past the hunter (Infiltrator) |
| `build [program]`, `uninstall` | In a cleared socket (Sockets and programs) |
| `install` (`plant`) | A contract's item, in its room |
| `talk` (`read`, `take`), `talk 1`/`2` | In a thread's room |
| `sweep <pid>` | Answer a temporary server's process log |
| `play …` | A puzzle room's board as text (`play wall c4`, `play up`, `play tap b2`, `play ping d4`) |
| `pack`, `jack out`, `help` | What you carry; home; these commands |

### Puzzle rooms

Rooms that aren't fights (`puzzles.mjs`). Every traced server has one, or two (a quarter of small
servers, half of medium, three in four large), never two of a kind, each at the end of a branch. **Quarantine** turns up
three times as often on a Worm server, the **Hunter chase** only beside a sleeping Tracker's den, the **Terminal** from
floor 2 (half again as often as one board), the rest anywhere, on every floor. SPRAWL-00, rogue servers, lairs and the
farm have none.

- Walking in opens its board over the map (**Play** on its card brings it back). A board stays the same until it
  refills, as you left it. Its chip shows **IN PLAY**, **SOLVED** or **FAILED** once you've started.
- **One rule for all:** played to its end, won or lost, the room is done until it refills (two hours, then a new
  board). It pays once, at its end: a win counts for a Solve contract and pays a kill's XP (Intel, not scaled), half one
  on Packet routing, Deadlock and Cryptogram. On The Sink and Bedrock a win on the first four and the Terminal also rolls
  an elite's gold odds for one of the floor's puzzle-board uniques.

| Room | The board | What it pays | Deeper |
|---|---|---|---|
| Quarantine, *Wall it in* | A 7×9 grid with a worm outbreak, ★ data nodes and dead slots. Click a node to firewall it; the worm then copies into the open frontier node with the most open neighbours (marked in advance). It ends when the worm can't spread. | Each node it never reached pays this server's code (a ★ three; 6 + level/2 for the whole board). Half or more saved is **Contained**. | Two outbreaks, or a worm that copies twice a turn |
| Hunter chase, *Reach the door* | A 5×5 den with walls. You move or wait; the Tracker takes two steps toward you, across first, never around a wall. Cells where it would catch you show red. Undo and Restart. Every den can be won (5 to 12 moves). | Through the door: the real Tracker loses you for the visit, and half a cache. **Caught:** the hunter fight starts. | Floor 3+: a second Tracker in the den |
| Cascade, *Bring it all down* | A 5×5 rack of nodes charged 1–3. A tap discharges a node and every neighbour gains 1; one past 3 discharges too. Clear it within the fewest taps + 1. | 3 components of the server's families, 2 more for the spare tap. | Floor 3+: two 4×4 racks; a node on a rack's edge (notched) also charges the same slot on the other rack |
| Ping sweep, *Find the cache* | A 7×7 dark room with a buried cache. **Ping** reads the steps to it and lights that ring; **Dig** digs. A budget of 5. | A cache's credits and code, a quarter more for each unspent action. | Two caches (budget 8), or four noisy cells that read one off |
| Packet routing, *Get it through* | 7×5 wire tiles (straight, elbow, tee, empty). Click turns one clockwise, right-click back (a phone's tap: clockwise). Join the source to the sink within the fewest turns (9–14, by search) + 2; lit wire glows. Out of turns shows the fewest route. | Half a cache's code. | — |
| Deadlock, *Let them all finish* | Six processes round a pool of free locks (A–D), each needing 2–3 and holding some. Give one a free lock it needs; one holding all it needs finishes and returns its locks. **Deadlocked** when none can finish from the pool. One can finish at the start, never more than two at once. | 1 component. | — |
| Cryptogram, *Read wick's note* | A note of wick's in your own substitution key. Pick a cipher letter, then type or tap its letter: right fills every one, wrong is a strike (three lose). Solved letters stay in your key for every later note, won or lost; once no note has three left, wick changes the key. | The note. | — |
| Terminal, *Name it* | The log sweep: an incident file (a breach log, a transfer log or a process list), its question and three suspects. Click a line to light every line sharing its value; filter the noise; name a suspect. A second wrong answer loses. | A cache's credits and code, half after a wrong answer; counts for a Sweep contract. | The trick: obvious on floor 2, a decoy on 3, the note at the log's top from 4 |

### Rogue servers

About 1 in 6 servers you trace is **rogue** (never your first two, never more than five tame ones in a row); the first
after those is always a **Nest** of the family that traced it. A rogue server is a hexagon on the map, never beside a
floor's entry or on its main road. It has 4–8 fight rooms at the server's level and grade (it keeps up with you inside
its floor's band) and 2–4 **quiet rooms**: an **Empty** (nothing) or a **Stash** (4 + level/2 credits into your bank
as you walk in, 1 code one time in five). No vault, nothing to take over, no puzzle rooms, no invasions.

| Kind | Rule |
|---|---|
| Nest | One family only, and strains twice as often |
| Pit | Mixed families, 2 levels above the server, a second roll for drops. A third of its rooms hold a **◆ CREW elite** (Co-op); one that beats you, or that you run from, moves on and the room fills again in 30 minutes |
| Gauntlet | Mixed families; clear every fight room in one visit for a bonus cache (60 + 12×level credits, code, XP) |

Each fight room fills again 3–5 minutes after it falls, a Stash 30 minutes after you take it. Clearing every fight
room in one visit is a **full clear**.

**The Exfil.** Each visit rolls once as you connect: 25% (`CONFIG.exfil`) for an **Exfil**, a process smuggling an archive
off the server (**EXFIL-####**). After one turns up, none does on any rogue server you visit for 45 minutes.
- It starts in the room farthest from you that no live virus holds: a gold archive on its chip, an amber dashed arrow
  to where it runs next, *Exfil running* on the strip. After each of your moves it steps to the neighbour farthest
  from you, never into your room or through a live virus's room. With nowhere farther to go it's **cornered**.
- **Catch it** by walking into its room: a short fight with an Uplink and an Archive, light hits. Its row counts the
  upload (its objective), **Upload 0/6**: still up at the end of cycle 6 and the archive is gone. Break it in time: **Archive
  recovered**: 10 Stashes' worth of credits, one item at the server's level (the best of two trash rolls, a white if
  both miss), 5% one of the server's uniques, and a process kill's XP. Jack out and it's gone.

### Threads

Quests you stumble on in server rooms (`threads.mjs`; the content in `dist/content/threads.mjs`, the plan in
docs/threads.md). Never given, never timed, nothing missable.

- **Found.** A thread starts in a room of its own (*Ops room*, *Stalled job*, *Index*): someone waiting or something
  left. Its amber **!** shows once you've been in that room, and its server wears a small amber ! on the map. **Talk**
  (`talk`; **Read**, **Take** for a thing) starts it.
- **Where.** Each server's start is pinned the first time you connect, from its seed: at most one a server, never on
  SPRAWL-00, the farm, a lair, a rogue, a member's or a temporary server. An authored chain lands on the first servers
  of its floor you connect to once you're at its level; any other server holds a one-off 35% of the time. A distress
  call on the scanner pins a one-off on a server with none, already found.
- **A thread's rooms** hang off the deep end of a branch, on this server, one a link or two off, or a floor up (always
  one you've located). They come cleared and never count toward Rooms n/N. The step you're on marks its room with an
  amber **?** and its server on the map.
- **Steps.** **Talk** (sometimes a choice of two: `talk 1`, `talk 2`). **Goto**: stand in a room with nothing live.
  **Escort**: a file walks the graph toward its destination, a room for every 2 of your moves, never into a live room;
  every move you're not with it, each live room beside it bites it (10%, an elite 15%, the hunter 25%). At 0 it's
  corrupted and a clean copy waits where that leg began. Across servers it travels between legs on the floor map.
- **Temporary servers.** A named server (*MIRROR-17*) appears beside the thread's server, linked by a dashed line; no
  invasions, no memory. Each visit it grows a room (up to six). Its **build log** says where its kill switch is; its
  **process log** is a sweep (*Which pid built this server?*, `sweep <pid>`; a wrong answer costs nothing). Its Core is
  the **kill switch**, sealed until you know it. Beat it and the server goes **dark** for good.
- **Set aside** (`thread abandon <id>`) puts a thread down as it stood; **Pick it up** carries on.
- **Rewards.** Each step after the first pays deed XP at the thread's level (`deedXpFor`: an authored chain's steps
  2.5 each, its last 4; a one-off's 1.5 and 2.5). At the end, the **reward card**: three items, pick one (**Later**
  keeps it in Mail). One leans to your class and your subclass's stat. A chain's are blues, a yellow one time in ten; a
  one-off's blue half the time, else white. On The Sink or Bedrock one time in ten an item is one of the floor's own
  uniques. Faction standing where a faction is in it, and a line of lore.
- **The quest window** reads a thread as an intercepted *Transmission*: the sender and their mark, the title, its lines
  (the opening resolving out of noise, once) beside the speaker's portrait (a backlit ASCII silhouette, or a page for a
  file or log, scanning in once), its steps as a job (✓ done, ▸ current, the rest encrypted). The reward
  card is a signed receipt. Mail's **Threads** list holds each thread, tracked, set aside or done. `threads`,
  `thread <id>`, `thread track|abandon|resume <id>`, `thread take <n>`.

| Chain | Floor (level) | For | Steps |
|---|---|---|---|
| Restore Point | 1 (3) | M. Wren's photos | Talk to a stalled restore job; reach her archive; walk it to the restore point a link or two off; talk to it |
| The Night Operator | 2 (7) | Forty people's payroll | Talk to an idle session; fight to the payroll file on another server; carry it to her terminal two servers over; hand it over (Kestrel +12) or sell it to GLASSJAW (GLASSJAW +10, Kestrel −8, 150 + 25L credits) |
| Mirror | 3 (13) | Your ground, copied and sold | Read an index (MIRROR-nn appears, copied from your server); read its logs; talk to its builder Quill a floor up (he unseals the kill switch); beat its Core |
| One-offs | any | Each its own | An escort, a talk, or a temporary server (a beacon names it) |

## Floors and tracing

### Floors

The network is a stack of eight **floors** going down (`floors.mjs`, docs/servers.md 5), each its own diagram drawn
from your network's seed, with its own level band, shape and size.

| Floor | Name | Levels | Shape | Servers | On it |
|---:|---|---|---|---:|---|
| 1 | The Sprawl | 1–8 | A star around SPRAWL-00 | 10 | SPRAWL-00 (the entry), Halcyon's and Kestrel's hubs, KESSLER-FARM-00 (from 7) |
| 2 | Backhaul | 7–14 | A trunk with spurs | 12 | LANTERN's and GLASSJAW's hubs, a lair, a holder |
| 3 | The Stacks | 13–20 | A lattice with holes | 14 | NULL CHOIR's hub, a lair, a holder |
| 4 | Coldline | 19–26 | A ring around a dead centre | 14 | a lair, a holder, two exits |
| 5 | Deep Core | 25–32 | Two halves joined by one bridge | 16 | a lair, a holder, two exits |
| 6 | Kernel Space | 31–38 | A deep tree | 16 | a lair, a holder, two exits |
| 7 | The Sink | 37–44 | A funnel | 18 | a lair, a holder, two exits |
| 8 | Bedrock | 43–50 | Scattered islands | 18 | a lair, a holder, no exit |

- **A server's level** is its place on its floor, fixed when the floor is drawn: the entry's side at the band's bottom,
  the exits' side at its top. Its kind leans by floor (Mailhubs and name servers near the top, Archives and Labs
  deeper), its family your network's way (its holder's, if the holder wrote it). Rogue servers (1 in 6) and faction servers (1 in 8) are rolled as you find
  them. Rogue servers, the farm and lairs keep up with you inside their floor's band.
- **Floor holders.** Floors 2–8 each have a holder: TOLLGATE, SWARMLINE, PALEMASK, NULL CHOIR, GLASSJAW or LANTERN,
  rolled from your network's seed, weighted to its lean, never the floor above's. It writes three in four of the
  floor's servers: their families are its own, and their rooms its families and attack sets. A faction's server stays
  its faction's. The floor panel wears its colour; its tooltip names it.
- **Your floor** is the deepest one whose band holds your level; the level-up names a floor when you reach its band.
- **Exits.** One a floor (two from floor 4; Bedrock none), a **▼** on the far side. It shows once you locate a server
  it hangs off, with the floor below's band in WoW colours; **Go down** on its card (`descend`) opens the floor below.
  No fight, no key: the band is the warning. The landing server beside the next entry is located as you arrive.
- **Back up** is always open: every floor's entry is a **▲**, and travel is free: from home you connect to any server
  you've found on any floor you've reached. Each floor you've reached is a **waypoint** (its landing server): **Start
  here** on its ▲ card.
- **The map** shows one floor at a time, home drawn above it with a line to its entry. **The floor panel** runs down
  the map's right side like a lift's buttons (`floors`, `floor <n>`, `floor up|down`).
- **Layers.** Content that names a layer reads floors 1, 2, 3–4, 5–6 and 7–8 as layers 1 to 5. Each layer down adds
  25% to blue and yellow drop odds and 40% to cache credits.

### The hidden network

Every server links to its neighbours on its floor. A linked server you haven't located shows as **?** ("family ?"
until a relay pings it or it sends an invader at you).

| Trace from | Adds |
|---|---|
| A stray killed in SPRAWL-00 | +25% to one ? (the most traced first; your first, the level-1 one), falling with the level gap like XP |
| A first clear of a fight room on a server linked to it | +20% |
| A vault's trace record (`signal.trc`), banked | +50% on one ? (a flagged one first) |
| Mapping the server it hangs off, or a rogue server's full clear | the rest of the way |
| An invader from a ? beaten by you / stopped by your wall | +40% / +10% |
| An invader from a found server, beaten | +25% to one ? linked to it |
| A trace injector (store, Kestrel, LANTERN) | +30% |
| A relay's family kill / its route file banked | +12% / +50% |

At 100% the server is **located**: an ordinary server at its slot, with its own ? neighbours; contracts aimed at it
follow it there. Its card shows the way you're tracing it now on top, with a pip for each step still needed, then the
other ways, dim until you have them. Your first server is always SPRAWL-00's level-1 neighbour; reaching level 4
with nothing traced traces it for you, and at 5 wick pages you with one you haven't cracked.

**Relays** (Halcyon sells them; the storyline gives you one) go on a server you've taken over (`relay <server>`, or its
card). While you have none, one Halcyon takeover or recovery job at a time pays a relay too. A relay pings the ?
servers linked to its server (their family shows) and flags the one carrying a contract's signal. Each kill of a
pinged server's family traces it 12% (at home or in SPRAWL-00), and the relay leaves a route file for each on its own
server (`ping-….trc`), worth 50% banked. Each relay also cuts hub transfer times 10% (up to 40%).

### Networks (network.mjs)

Every network has a **signature** rolled from its seed (a new game rolls one; a simulated member's comes from their
handle). docs/networks.md is the designer's review sheet.

| Part | What it does |
|---|---|
| Name | *Rust Lattice*, *Saltwire Loop*: on the Network card, the consortium map and tooltips |
| Lean | The three families weighted 3, 1.5 and 0.5: mixed rogue rooms, the ? servers your servers reveal, and the families of couriers, bounties and outbreaks lean that way |
| Native strain | One strain, five times as likely as its family's others there |
| Native boss | One of nine, in the lair of the floor whose pool holds it (Lairs and native bosses) |
| Native uniques | 3 to 5 of 27, at least one in each band (5–15, 16–28, 29–40) |
| Event bias | Two of the director's cards come up 2.5 times as often |
| Code bias | 30% of other code dropped there comes as its rich code; its rich material (components or Exploits) drops 1.5 times as often |

**Whose network:** your servers, rogue servers, home fights, events and lair are yours; a member's are theirs;
SPRAWL-00, the farm, the trunk server and the hubs are nobody's. Drops, code and strains read the network the fight
is on.

**Native uniques** come from their network's lair boss. Off it they're world drops: a kill on a network rolls for its
natives open at the kill's level at 0.0005% (an elite or boss three times), +0.00001% a kill without one; anywhere else
each native you know of drops at 0.00002% a kill. A native shows ??? until it drops or you hear it named (a darknet
listing, its lair boss falling). They follow the unique rules and are sidegrades. Other ways to someone else's native:
a Listening Post tuned to it (`listen <unique>`: on its network twice as often on that server; elsewhere ×(1 + 2 per
post)), a **darknet listing** (Events), or merging with its owner and fighting there.

| Native | Lv | Slot | What it does |
|---|---:|---|---|
| Null Byte | 5 | Exploit | +35% damage on an Open part |
| Canary Token | 6 | Shell | Tells are announced a cycle further ahead |
| Ping of Death | 7 | Script | When you call off a tell, the part you read takes 10 |
| Lockpick | 8 | Script | Your hits count double against a Mutex lock or a Lockbox ward |
| Reflector | 9 | Shell | A hit the Mimic copies (and the helpers it catches) lands on the Mimic instead of you, at 50% |
| Fork Reaper | 10 | Exploit | +60% damage on a fragment |
| Watchlist | 11 | Proxy | When a tell lands on you, restore 6% of your health |
| IRQ Line | 12 | Script | SIGINT cools down 2 cycles faster |
| Read Receipt | 13 | Shell | Parts you read stay Open a cycle longer |
| Split Brain | 14 | Exploit | A twin you break can't reboot |
| Rootless | 15 | Implant | +25% damage with a skill whose moment is on the board |
| Write Blocker | 16 | Proxy | A seal that goes through leaves your ◆ and shield, and you stay clean |
| Policy Engine | 18 | Script | Your blue and yellow rules count 50% more (−3% Crit) |
| Quiet Wire | 20 | Proxy | A Tripwire you break stays quiet |
| Static Discharge | 21 | Exploit | +35% crit chance on a part gone loud |
| Hush Money | 22 | Implant | A cast that compiles lasts 2 cycles less |
| Brood Tap | 23 | Script | When you break a fragment, heal 5 |
| Keyjam | 24 | Exploit | +40% damage on a part behind a lock or a ward |
| Metronome | 26 | Shell | +30% crit chance when you fire in a Sync Window |
| Hold Music | 28 | Proxy | Evasion counts double while a part winds up a tell |
| Kill Chain | 30 | Implant | When you break a part, the next part to attack is Open for a cycle |
| Preempt | 32 | Script | +40% crit chance on a part winding up a tell |
| Brute Force | 33 | Exploit | On a part behind a lock or a ward, a hit that meets ◆ breaks two |
| Takedown Notice | 34 | Implant | When you break a fragment, every cooldown drops by 1 |
| Sandman | 36 | Shell | A tell that lands leaves nothing behind (−10 Regen) |
| Rubber Hose | 38 | Exploit | +6 damage for every tell you read this fight, up to +30 (−3% Crit) |
| Mirror Maze | 40 | Proxy | On the Decoy's beat your commands go where you aim them, at 50%, and nothing bounces back |

**The Network card** (Server and Consortium pages) shows only what you've learned by playing there: its name always,
then its families as you fight, its native strain once you've beaten it there twice, its boss once its lair turns up,
a favoured card once it has come up twice, its rich code once it leans your way; ??? until then. No odds are shown.
`network`, `network <member>`.

## Classes

### Levels

- **Hacker level** (per class, 1–50): a long, WoW-style climb. Each class starts at level 1 and levels on its own.
  **Every level adds 4% power**: damage, heals, shields and Signal (key 1 hits 25 at level 1, 44 at 20, 74 at 50).
  Heals you cast and damage over time take half of it (+2% a level, `CONFIG.healLevel`, `dotLevel`); Restore and
  Payload on your gear make up the rest (Items).
- **Your server's level is your highest class level.** It sets your server's Integrity (100, +4% a level) and opens
  daemon slots (+1 at 15, 30 and 45).
- **Enemies have a level (1–60).** A server keeps the level it was found at, so old servers get easier. Enemy levels
  are coloured WoW-style: red (5+ above you), orange (3–4), yellow (about even), green (below), grey (10+ below, no XP).

| Level | Unlocks |
|---|---|
| 1 | Key 1 and your first core skill |
| 3, 5, 7 | Your second, third and fourth core skills |
| 5 | Your kit talent; routines (Routines) |
| 10 | Your subclass (and its edge and first skill), SIGINT, talent points (one every other level: 21 by 50) |
| 12–38 | Your subclass's line, a skill at 12, 14, 16, 18, 20, 22, 26, 30, 34 and 38 |
| 15, 30 | An Implant slot each |
| 22, 30 | An eighth and ninth skill key |
| 45, 50 | A capstone point each |

### XP

- **A kill** is worth 20 + 10 × the enemy's level: a home kill 1×, a guard 0.8×, a room kill 1.25×. An enemy above you
  pays up to 25% more; each level below you takes 10% off (ten below pays nothing).
- **The climb is long** (`CLIMB`): level L to L+1 takes 23 kills of your level at 1, 160 at 4, 172 at 10, 523 at 20,
  818 at 30, 1,000 at 40, 1,137 at 49. The real-play table (`PACE_TARGET`, a contract worker at about 150 kills an
  hour) is 0.7 hours to level 5, 2.7 to 10, 10 to 20, 23 to 30, 43 to 40 and 67 to 50; a farmer takes about half again.
- **Contracts** pay a fixed amount set when they're posted (Mail and contracts).
- **Deeds** pay shares of a kill grown with the climb (`deedScale`: `DEED.share` of how much longer your level is than a
  kill-only climb; about 4 to 8 kills on the long climb): a vault 1.5, your first run on a server 0.7, a takeover 1.5,
  each Root level ¾, a Mapped server 5 plus half its fight rooms' kills, the first trade at each hub ½. A puzzle board
  won, a decode and a log sweep pay a kill each, not scaled.
- **Fresh** (varied play pays). XP comes in kinds: **Fights**, **Break-ins** (a vault, a first run, a takeover,
  Mapped), **Intel** (decodes, boards, sweeps), **Building** (Root levels, a held server's respawned rooms) and
  **Trading**. The first XP of a kind other than fighting that you haven't earned in 20 minutes of play pays half again,
  at most a kill times the deed scale (*FRESH*). Gains under half a kill never count. Contracts count as the activity
  behind them.
- **Rested** (WoW's rule) comes only from time logged off with no crash: 5% of a level every 8 hours, up to 1.5 levels
  (`RESTED`). Kills spend it: each pays double while it lasts (a *Rested* row).
- **Hot strain:** every 4 hours one strain open at your level runs hot: +50% XP from it, on the pager.

### The level-up

It lists what the level brings: skills (with the key each went on), your subclass, SIGINT, a talent or capstone point,
a protocol slot, new protocol bases, a floor's band, and a daemon slot when your server rises; then the power line and
the next level that brings something. Several levels at once are one level-up. It is a **firmware update**: a compact
panel under the top bar, an amber *Firmware update · <class>.rom* strip, the level in big teal dot-font digits beside
*v9 → v10*, then `[ OK ]` per unlock as the flash finishes, **Loadout** (when there's something to set) and
**Continue**. It closes by itself 12 seconds after the flash, never comes up during a fight or over a card that waits,
and waits for the next calm moment. `developer levelup preview` plays your next one (`preview <level>`, `preview all`),
changing nothing.

### Classes and loadout

You choose your first class after you log in, on a full screen of four cards (each with its emblem, role, passive,
sync, first two skills and its two subclasses). Change class on the Loadout page (`archetype <id>`). **Trying classes is
free:** until any class reaches level 5, switching to a class you haven't played takes your level with it.

| Class | Role | Passive | Core skills (levels 1, 3, 5, 7) |
|---|---|---|---|
| Breaker | DPS, Burst | **Momentum**: each part you break gives +10% damage for 2 cycles, up to 3 stacks | Overload, Flood, Exploit, Crack |
| Bastion | Tank, Healer | **Hardened**: the first damaging hit on you each fight deals 25% less | Rate Limit, Firewall, Purge, Retaliate |
| Infiltrator | DPS, Damage over time | **Ghost**: every fight opens with a Surprise window (The Sync Window), and `slip` gets you past the hunter once a visit | Inject, Backdoor, Keepalive, Tag |
| Operator | Support, Summoner | **Extra thread**: +1 daemon slot | Deploy, Hook, Spawn, Botnet |

**The bar** has up to 11 keys, each shown once unlocked:
- **Key 1:** the free hit, 25 damage, no cooldown; it repeats when you give no order. Each class names it: Bash
  (Breaker), Ban (Bastion), Poke (Infiltrator), Ping (Operator); `spike` works for all.
- **Keys 2–8, then 9 and 0:** your equipped skills: seven from level 1, an eighth at 22, a ninth at 30. A skill you
  unlock goes on the bar by itself (a bar that follows a shipped preset fills from it). `equip <skill> <key>`,
  `unequip`, anywhere out of a fight; every key a swap brings in starts your next fight cooling.
- **The - key:** SIGINT, from level 10 (SIGINT).
- **Presets** (docs/kits.md): from level 10 a subclass has fifteen skills to choose from (its class's four core skills
  and its eleven-skill line) and two shipped presets, `rotation` and a second with a playstyle of its own. `loadout
  use|save|list|show|delete <name>` (up to six saved a subclass).
- **The tray:** each key is its icon and name; what it does is its tooltip (name, *Hit · 6 cycle cooldown*,
  the rule). A charge bar runs along the bottom (full amber when ready), the cycles to go sit over a dimmed icon, and
  the icon turns steel when the target's armor would take the hit whole. The next unlock shows as a ghost key.
- **A key's border** says what holds now, and its tooltip says it in words: amber when its moment is on the board
  (*drain charge*, *stops a cast*, *Exposed ×2*: situations.mjs), gold while lit, red when offline or wiped, teal when
  queued. A few skills only work in the cycle or two after their event (Shatter after you strip a part's last ◆,
  Retaliate after you're hit, Opening after an attack misses you or is delayed).

**The core skills** (numbers at level 1; they grow 4% a level):

| Skill | What it does | Cooldown |
|---|---|---:|
| `overload <part>` | Deals 40 damage. A critical strike resets the cooldown. | 3 |
| `flood <part>` | Deals 38 damage, doubled against a target with no armor. | 6 |
| `exploit <part>` | Deals 15 damage and Exposes the target for 2 cycles. | 2 |
| `crack <part>` | Breaks 3 ◆ on the target. | 2 |
| `rate-limit <part>` | Deals 45 damage and Throttles the target (its next attack deals half); 15 more if its attack is due this cycle. Breaks 2 ◆ on an armored part. | 3 |
| `firewall` | Shields you from the next 16 damage; soaking a whole hit lights Retaliate. In a crew, draws every attack for 3 cycles. | 4 |
| `purge <part>` | Burns 6 a cycle for 4 cycles, each tick healing you 2. Clears your encryption and Corrupted. | 4 |
| `retaliate <part>` | Deals twice the last attack that reached you or your shield, up to 60. The cycle after you're hit. | lit |
| `inject <part>` | Burns 20 a cycle for 4 cycles. Reapplying refreshes it (one Inject a part). | 3 |
| `backdoor <part>` | Deals 24 through armor, 12 more if the target is burning. | 4 |
| `keepalive <part>` | Every burn on the target ticks once now and lasts 2 cycles longer. | 3 |
| `tag <part>` | Deals 10 and Tags the target for 4 cycles. | 3 |
| `deploy <part>` | A helper deals 12 a cycle for 4 cycles; it moves on if the part breaks. | 4 |
| `hook <part>` | Deals 10 and Hooks the target for 4 cycles. | 3 |
| `spawn <part>` | A small helper deals 7 a cycle for 3 cycles. | 1 |
| `botnet <part>` | Three small helpers deal 4 a cycle each for 3 cycles. | 5 |

### Subclasses

Picked at level 10 (`subclass <id>`; the first pick anywhere out of a fight, switching free at home). Until you pick, a
class past 10 plays its **core alone**: its four core skills and kit talent, no edge, presets or tree. The first time
you're home with no pick, the **subclass breakout** opens: both subclasses side by side in four steps (Idea, Skills,
Talents, Choose); **Later** puts it off. Each subclass has its own eleven-skill line, edge, presets, talent tree and
capstones; docs/subclasses/ has every skill.

| Class | Subclass | Edge (from level 10) |
|---|---|---|
| Breaker | Demolitionist | **Overkill**: when your hit breaks a part, the leftover damage spills onto the next part (up to 20) |
| Breaker | Overclocker | **Redline**: Momentum stacks to 5, but you take 10% more damage while you have any |
| Bastion | Warden | **Grudge**: the part that last hit you takes +20% from your hits |
| Bastion | Sysop | **Overprovision**: healing past full becomes a shield, up to 20 |
| Infiltrator | Payload | **Bloom**: when a part you're burning breaks, its burns jump to the next part |
| Infiltrator | Phantom | **Weak Spot**: your first damaging hit on each part crits (a hit through armor doesn't count) |
| Operator | Herder | **Last Gasp**: each helper strikes once more as it expires |
| Operator | Hijacker | **Man in the Middle**: Jammed parts take 20% more from everyone, and a part with your helper on it 20% more from you |

**The Sysop** is the healer, built for a crew (Multicast heals everyone; Checksum heals the lowest). Alone its hits and
burns deal 75% (`SUBS.sysop.alone`), though its heals still come from the full hit: it fights slowly and ends most fights
nearly full.

### Talents

- **The kit talent (level 5):** one of your class's first talents is part of its kit, two free ranks: Breaker
  Overclocked Core (+6% damage), Bastion Patch Notes (Patch heals +6), Infiltrator Recon (Opening +10 damage), Operator
  Thread Pool (Deploy helpers +2) (`LOADOUT.kit`).
- **The tree** (each subclass's own): six rows, three **choice tiers** (pick one of two) with a **ranked row** before
  each (two nodes, up to 3 ranks). A row opens once you've spent enough above it: ranks 0, tier 1 needs 3, ranks 4,
  tier 2 needs 8, ranks 9, tier 3 needs 14. Changing picks and ranks is free at home. `talent <1-3> <a|b>`, `talent
  add|remove <node>`, `talent reset`.
- **Capstones:** a row under the tree (15 points above it), two a subclass, picked with the capstone point at 45; the
  point at 50 gives the one you picked its second rank. `talent capstone <a|b>`.

| Subclass | Capstones (rank 1 · rank 2) |
|---|---|
| Demolitionist | Structural Failure (when you break a part, every other part loses 1 · 2 ◆) or Load-Bearing Wall (the last part standing deals 30% · 60% less to you) |
| Overclocker | Arc Flash (Thermal Throttle also deals 25% · 50% to the part attacking soonest) or Thermal Paste (each Momentum stack you spend heals 1% · 2% of your max) |
| Warden | Iron Curtain (the part that last hit you deals 15% · 30% less to you) or Eye for an Eye (each attack that hits you deals 40% · 80% back to its part) |
| Sysop | Root Cause (your heals also deal 15% · 30% of their size to the part that last hit you) or Warm Standby (start each fight shielded for 10% · 20% of your max) |
| Payload | Pandemic (burn ticks also deal 25% · 50% to every other part) or Siphon (burn ticks heal you 5% · 10% of what they deal) |
| Phantom | Ghost Step (when you break a part, the soonest attack comes 1 · 2 cycles later, unless already delayed) or Smoke and Mirrors (the first attack that hits you each fight deals 50% less · nothing) |
| Herder | Thundering Herd (helper hits also deal 15% · 30% to every other part) or Sandbox (when an attack hits you, your oldest helper takes 15% · 30% of it and ends) |
| Hijacker | Puppet Master (Takeover lasts 1 · 2 cycles longer) or Dead Air (Jammed parts deal 25% · 50% less to you) |

### Ability mastery (mastery.mjs)

An ability's effect evolves as you use it: three tiers, cosmetic only (never a number). Every command you fire in a
fight counts, per class and ability, once it fires (typed, from the tray, auto-repeat, your routine's); a daemon's or
crewmate's never does.

- **Thresholds** (`MASTERY.bands`, by how often it can fire): key 1 and 2-cycle skills 100 uses for tier 2 and 1,000
  for tier 3; 3–5 cycles 75 and 750; 6–8 cycles 40 and 400; 10 cycles and over, or once a fight, 20 and 200.
- **Tier 2** is richer (more particles, a spark burst); **tier 3** is its signature (a glint, and for key 1 and each
  class's iconic skills a flourish of its own: Ban's crack, Bash's quake, Poke's three needles, Ping's echo).
- The tray key's tooltip ends with *Mastery 2 · 340/1000*; the Skills page shows three pips a skill and **Effect 1 2 3**
  to pick the tier it plays at (default your highest). `mastery <skill> <1|2|3>`.

### Routines

From class level 5, when the timer runs out and you typed nothing, your **program** moves for you
(`routines.mjs`; docs/routines.md). Below 5 the timer repeats your last hit. Each class keeps a program, each subclass
its own from 10; Loadout → **Program** edits it.

- **A routine a virus:** one for each virus you've met (a family, strain, guard or the Exfil). A virus with none plays
  the **rotation**: your kit played well (combos, cooldowns, ◆ before the hit, the part that attacks soonest), reading
  no tell and no part's rule. Answering those is what handlers are for.
- **Handlers:** an ordered stack checked top to bottom each cycle; the first that fits fires. A handler is three chips:
  **WHEN** (a condition), **DO** (a skill on your bar, **Rotation**, or from level 8 **Hold**) and **TARGET** (that
  part, the soonest attacker, the lowest, a part with no ◆, the soonest with no beat, the **other parts**, or **the
  twins**). A handler naming a part whose skill is cooling still aims the rotation there.
- **WHEN chips come from research:** decoded (3) a part's name and health (*on the board*, *under half*, *no ◆*), rule
  (15) its timer and tell (*hits now*, *hits in 2*, *tell live*, *seal dear*), mastered (60) prediction (*the cycle
  before its tell*, *Open*). Fight chips: *every cycle*, *you under half*, *2+ fragments*, *encrypted 3+*, *any tell
  live*, *dearer* (the tell SIGINT would stop costs most), *beat in 1/2*, *dear copy*, *bent onto a lever*, and each
  order lever's own (*loud wins*, *blast pays*, *cash in*).
- **Presets** on each routine: *Rotation*, one for each lever whose rule you've researched (*Hold on a dear copy*,
  *Quiet when bent*, *Tripwire last*, *Lockbox first*, *Trip when loud wins*, *Blast when it pays*, *Cash in*, *Twins
  together*, *Seal dear: strip it*), and a few built from the virus's parts (*Encryptor first*, *Answer the tells*,
  *SIGINT the dearer*, *Guard when low*).
- **RAM:** each routine has its own: class level (4 at level 1 to 10 at 50), Codex mastery of that virus (+1 for
  every 3 of its parts mastered, at most 6, +1 more with all of them), and gear's RAM stat (at most 3). A tag for each
  sits by the meter. A handler costs its WHEN chip's RAM (1 plain, 2 a rule chip, 3 a mastered chip; +1 for a
  long-cooldown skill). Handlers past the RAM sit out.
- **Benchmark** (`program <virus> bench`; not the Exfil): the routine alone against 50 builds of its virus at your
  level, on a copy of your save, no rails: win rate, cycles a win takes, Signal lost (a loss: all of it; past 80
  cycles: a loss; a part left to you stays unplayed). The result stays on the routine, dimmed once you change it.
- **Break ◆ first** (on by default, `program <virus> armor off`): before a hit armor would take, the program fires your
  best ready armor-breaker at that part instead, or aims at a part with no ◆ if the target allows.
- **What it can't do:** fire a skill with a cooldown of 6 or more (or once a fight) unless a handler names it; sync;
  read a tell.
- **Exceptions:** only for a virus whose routine you've made yours. A part you haven't decoded, a charge you haven't
  mastered, or a lever no handler covers is yours to play: its row is edged orchid, *EXCEPTION · no available handler*,
  and a cue sounds once a fight. The program plays the rest. A boss, a lair boss, a Resident or a crew boss is wholly
  yours.
- **On the board** its next move sits ghosted in *You*'s Now cell (*⟳ crack encryptor*); anything you type overrides it.
  A program's fight pays what yours does.
- **Rails:** **auto jack-out** (off, or at 10–50% Signal; `program jackout 30`) and **Stop before danger** (on: a walk
  of more than one room stops next door to an elite, a boss, the Resident or a vault guard).
- **Cues** (on: `program cues off`): while your program plays (the last move was its), a tell landing on you, your
  Signal crossing under 30% and a drop of yellow rarity or better each play their own sound. The elite ahead and a
  run's end have theirs already (the rails, the loss).
- `program on|off`; `program <virus> add|set|move|remove|clear|preset|undo|confirm|bench`.

## Items

Everything you equip is software: code, tools and access, never hardware. Protocols you run live on the Loadout page's
**Protocols** tab (`protocols`): your rig drawn as a board, its slots around it, the **stash** beside it (each row its
glyph, name in its rarity colour, three biggest stats with ▲ ▼ against what its slot runs now), and your stat sheet.
Clicking a slot lists the stash items that fit, sorted **▲ Best**, **Lv** or **Rarity**. Hover a row or slot for its
**datasheet**: name, rarity, kind, level, stats one a line against the slot's (▲ gains, ▼ losses, and any effect you'd
give up), effect, set lines and flavour. Every protocol has its own ASCII **glyph** (its kind picks the shape, its main
stat the fill, its rarity the colour; uniques flicker now and then; `protocol-glyphs.mjs`).

### Slots

**Exploit** (weapon: Damage), **Proxy** (chest: Signal + Block), **Shell** (helm: Signal + Regen + Restore), **Script**
(ring: Damage + Signal + Payload), and an **Implant** slot at level 15 and another at 30 (Implants drop from item level
15). `load <id>` puts an item in its slot (a full slot swaps), `unload <id|slot#>`; loadouts change at home only. Each
class loads its own. One of each unique and each Zero-day a loadout. The stash holds 40; a drop into a full stash is
deconstructed.

### An item: a base, affixes and a rule

- **Bases** (31: seven for each main slot, three Implants) give the **primary stats**. A new base opens every few levels
  (Exploit: Proof of Concept 1, Weaponized Exploit 5, Exploit Chain 11, Zero-click 18, Wormable 26, Sandbox Escape 34,
  Hypervisor Escape 42; the Proxy, Shell and Script lines likewise, ending in Covert Channel, Firmware Shell and
  Metamorphic Engine at 42; Implant 15, Bootkit 34, Firmware Rootkit 42). **Base power follows item level on one smooth
  curve** (`ITEM_CURVE` in gear.mjs): a new base brings its name and its mix of primaries, never a step in power. Plain
  gear grows about 10% a level at level 1, 7% at 10, 5% at 30 and 3.6% at 50, outgrowing the enemies' hits so a
  same-level fight costs about the same share of your Signal throughout.
- **Power spikes are earned** (the designer's rule): base power never spikes; a new skill, a talent tier, a capstone, a
  slot, a unique, a set bonus or a tier set does, and the big jumps belong past the level cap. A spike that takes the
  friction away is a problem to fix in its kit.
- **Affixes** are small **secondary stats** (2–10%), each from a minimum item level, growing with it: prefixes
  (Weaponized +Damage, Precise Crit, Calibrated Accuracy, Loaded +Payload, Multithreaded Clock Speed, Brutal Crit
  Damage, Recursive Echo) and suffixes (of the Bunker +Signal, of Mending +Regen, of Restoration +Restore, of the
  Scavenger Scavenge, of the Ghost Evasion, of Leeching Leech, of Silence Stealth, of the Beat Sync, of Scrubbing
  Sanitize). Names read like D2: *Precise Proof of Concept of the Bunker*.
- **Rule affixes.** Every blue carries one minor rule and every yellow one major rule (`RULES` in gear.mjs), its number
  growing with item level (the range below is item level 1 to 40). The same rule on two items counts once, at the
  better number.

| Rule | Tier | What it does |
|---|---|---|
| Interrupt Handler | minor | +15–25% damage on a part winding up a tell |
| Signature Scan | minor | +10–20% damage on the signature part |
| Null Deref | minor | +1–6 damage on a part with no ◆ left |
| Safe Mode | minor | Once a fight, a hit that lands below half restores 3–5% of your health |
| Stack Canary | minor | Each fight starts behind a shield of 1–6 |
| Exception Handler | minor | When you call off a tell, a shield of 1–6 goes up |
| Sticky Bit | minor | Bare parts patch their ◆ back 1–2 cycles later |
| Clock Skew | minor | +5–10% crit chance on odd cycles |
| Abort Handler | major | When you call off a tell, heal 4–14 |
| Double Tap | major | When you cut a part's move, the part is Open for 2 cycles |
| Fork on Break | major | When you break a part, every cooldown drops by 1 (2 from item level 21) |
| Daisy Chain | major | When you break a part, the part winding up a tell (or the next to attack) takes 6–16 |
| Read-only Mount | major | Once a fight, a hit that lands below half deals half |
| Race Window | major | When your command crits, that skill is ready again |
| Deep Inspection | major | +30–45% damage on a part winding up a tell |
| Clean Room | major | A crit against you lands as a normal hit |

### Stats

Every stat is a whole number. The stat sheet lists them all.

| Stat | What it does | Rolls on |
|---|---|---|
| Damage | Added to every skill hit you land | Exploit, Script, Implant; Weaponized |
| Crit (%) | Chance a damaging hit crits (5% base) | Precise |
| Crit Damage | Added to every crit, on top of its +50% | Brutal |
| Accuracy (%) | Cancels the enemy's evasion | Calibrated |
| Echo (%) | Chance a skill hit repeats at half; on armor it breaks another ◆ | Recursive |
| Payload | Added to every burn tick and helper hit you start (a budget point is 60% of Damage's) | Script; Loaded |
| Signal | Max Signal | Proxy, Shell, Script, Implant; of the Bunker |
| Regen | Heals this much every 5 cycles in a fight, a fifth a cycle; on runs also every 5 moves; at home every 5 minutes | Shell; of Mending |
| Block | Taken off every hit (never below half) | Proxy |
| Evasion (%) | Chance an enemy attack misses (up to 20%) | of the Ghost |
| Sanitize (%) | Chance each Encrypt, Scramble or Replicate on you fails (up to 50%) | of Scrubbing |
| Restore (%) | Every heal you cast heals this much more | Shell; of Restoration |
| Leech | Heals you this much per damaging skill hit | of Leeching |
| Clock Speed (%, max 25) | Fills a meter each cycle; full, every cooldown ticks an extra cycle (a ring under your Signal) | Multithreaded |
| Stealth (%) | Chance each part's first attack comes a cycle later | of Silence |
| Sync (%) | Added to the 25% chance of a Sync Window | of the Beat |
| Scavenge (%) | Magic find (below) | of the Scavenger |
| RAM | Every routine's RAM, up to 3 from all your gear (Routines) | of the Heap (from item level 10; 1, 2 from about 30) |

**Heals and burns grow with gear.** Heals you cast and damage over time keep +2% a level, not 4%; Restore and Payload
make up the rest and more (a blue Sysop at 30 carries about 65% Restore). Heals that give back damage (Reclaim,
Rollback, OOM Kill) take Restore only. Payload is flat on every tick, so it counts most on small, frequent ones.

**Scavenge is magic find** with diminishing returns (+50% Scavenge = +33% better odds) and more cache credits. It
**costs stats**, as in D2: of the Scavenger rolls 3% at item level 1 to 10% at most, and a rolled blue or yellow
carrying it has its primaries 1% lower a point (`SCAVENGE_COST`, at most 15%). RAM costs 6% a point (`RAM_COST`),
within the same 15%. Uniques and set pieces that carry either keep their stats.

### Rarity

| Rarity | Colour | What it has |
|---|---|---|
| Stock | White | Its base |
| Tuned | Blue | Base ×1.1, 0–1 numeric affix and a minor rule |
| Custom | Yellow | Base ×1.2, 2–4 numeric affixes and a major rule, a random two-word name |
| Zero-day | Gold | A **unique**, or a found Zero-day (Rootkit, Race Condition, Buffer Overflow) |
| Indemnified | Orange | Halcyon's chase protocols (The Halcyon store) |

There are no grey protocols (filters still come in Scrap). A **Zero-day** is found ready-made: a quarter of the vaults
on floor 2 and deeper hold one (`.src`), at the server's level.

### Uniques

A unique has a fixed name, stats, flavour and usually one **effect** (a few deep ones two or three), sometimes a
downside. Its primaries are the best base of its slot at its item level ×1.2, or its own grown from its level, whichever
is higher; its downside never grows. Effects are blocks (when · if · does · limits), written in the editor. A **class
unique** leans to a class or subclass: three times as likely for it, twice for the rest of its class.

- **Class uniques:** Tracking Pixel (script 3; SPRAWL-00, layer 1 vaults; Infiltrator): +25% damage on a Tagged part;
  Slow Drip (exploit 4; SPRAWL-00, rogue servers; Infiltrator): +15% crit on a burning part; Spearphish (exploit 7;
  layer 2 vaults, rogue servers; Infiltrator): Tag cools a cycle faster; Jackhammer (exploit 5; layer 1 vaults, rogue
  servers; Breaker): Flood cools a cycle faster; Shrapnel (script 8; SPRAWL-00, rogue servers; Breaker): heal 6 when you
  break a part; Hot Patch (shell 4; SPRAWL-00; Bastion): Patch cools a cycle faster; Uptime SLA (proxy 6; layer 1
  vaults, rogue servers; Bastion): below half, a hit on you restores 8% of your health, once a fight; Thread Pool
  (script 5; SPRAWL-00, layer 1 vaults; Operator): burns and helpers deal +15%; Fork Handle (shell 9; layer 2 vaults,
  rogue servers; Operator): Botnet cools a cycle faster.
- **World uniques, levels 18–40** (layer 3 and 4 vaults and rogue servers unless named): Rowhammer (exploit 18): bare
  parts patch their ◆ 3 cycles later; Ctrl-C (script 20; also Tracer ICE): calling off a tell drops every cooldown by
  2; Slammer (script 22): burns on a part you break jump to the next; Log4Shell (exploit 24; also the Shredder): a break
  hits the part winding up a tell (or the next to attack) for 22; Spectre (shell 26): a cut leaves the part Open for 2
  cycles; Bulletproof Host (proxy 28): Block counts double while a part winds up a tell; Hot Reload (implant 30): a
  crit readies that skill again; Interrupt Vector (script 32; also the Bouncer): calling off a tell shields you for 30;
  Blue Pill (shell 34): a tell landing on you deals half; Shellshock (exploit 38): a hit on a part wearing ◆ breaks two.
- **Deep uniques, levels 39–50** (docs/loot-plan.md): sidegrades, The Sink's (floor 7) and Bedrock's (floor 8), each
  dropping only where its source names. Bedrock's are the strongest uniques and still below a full set. Bosses not
  built yet (GOLDEN PARACHUTE, INIT, Bedrock's others, the flash ranks) drop theirs from the floor's lair boss.
  - **The Sink's lair boss:** Seawall (proxy 39): each hit your Block reduces adds 1 Block for the fight, up to 5;
    Backwash (script 40): when a helper expires, your next helper skill cools a cycle faster; Floodgate (exploit 41):
    breaking a part gives +6% damage for 3 cycles, stacking twice; Riptide (proxy 42): helpers deal 8% more to Jammed
    parts; Anchor Chain (implant 43): when an attack lands on you, your next heal or shield is 10% larger; Outfall
    (exploit 43): each skill's first use in a fight deals 10% more; Pumphouse (proxy 44): +5% to a skill for each
    Momentum stack it spends; Spillway (exploit 44): a breaking hit carries up to 15 of its leftover onto the next part.
  - **The Sink's rare spawns:** Undertow (exploit 39): +10% to a part that attacked last cycle; Brine (script 40): +8%
    to the part with the most Integrity left; Mooring (implant 41): no single attack takes more than 35% of your max;
    Deepwater (exploit 42): crits deal 10% more to armored parts; Flotsam (shell 43): +10% Scavenge, +2 Regen; Turbidity
    (proxy 44): after you crit, +5% Stealth for 2 cycles.
  - **The Sink's vaults:** Drain Plug (shell 39): once a fight, the first attack over 20% of your max deals half;
    Siltstone (implant 40): +1 Block for each ◆ you hold; Pressure Hull (shell 42): Block 25% stronger while you hold a
    shield; Ballast (implant 42): at full Momentum you take 6% less; Cofferdam (shell 44): while a shield holds you take
    5% less; Weir (implant 44): once a fight, a helper takes the first attack on you and expires.
  - **Threads on The Sink:** Low Tide (proxy 40): your first hit each fight crits; Depth Gauge (shell 41): +4 Regen below
    half; Silt Map (script 42): Mapped servers pay 10% more XP; Sounding Line (implant 44): tells are announced a cycle
    earlier, and a veiled part shows its next attack a cycle out.
  - **The Sink's puzzle boards:** Brackish (script 41): burns deal 10% more to parts below half; Ebb (script 43): your
    first helper each fight lasts 2 cycles longer.
  - **Strain kills** (the strain trophy roll, from level 39): Sump Pump (shell 41): heals on you 10% larger below half;
    Bilge (proxy 43): each burn you start lowers its part's damage to you 3%, up to 9%; Siphon Tube (script 44): Leech
    heals 50% more below half; Bitrot Ward (proxy 45): when a break leaves one part, a ◆ for 2 cycles, once a fight;
    Microcode (implant 48): +6% Clock Speed, your shortest cooldown a cycle shorter; Load Order (script 49): each helper
    hits once as it arrives.
  - **Crew bosses** (their 10% world unique): Wake (exploit 43): +5% damage for each crewmate in the fight.
  - **Bedrock's lair boss:** Bootstrap (script 45): each skill's first cooldown a cycle shorter; Init Vector (implant
    45): after every 5th cycle your next damaging skill hits again for 30%; Firmware (implant 46): +4% damage, max
    Signal and Clock Speed; Read-Only (shell 46): once a fight, the first attack that would take you below half deals
    40% less; Fuse Map (exploit 46): a break gives 1 more Momentum and +5% damage for 2 cycles; Golden Image (script
    47): +10% Scavenge, caches 10% more credits; Bedrock Seal (proxy 47): shields absorb 15% more; Last Known Good
    (script 48): once a fight, falling below 20% resets your Signal to 3 cycles earlier (up to +30% of max); Wire Wrap
    (exploit 48): a break that leaves Momentum full arms your next skill to hit every other part for 40%; Quarry
    (exploit 49): +15% to the last part standing; Keystone (implant 50): +3% damage per active set bonus; Signal Floor
    (proxy 50): Regen doubles below 25%; Warm Reset (shell 50): start each fight shielded for 8% of max; Root of Trust
    (exploit 50): crits heal 2% of your max.
  - **Bedrock's rare spawns:** POST Code (exploit 45): every hit of your first damaging skill each fight crits; Burn-In
    (proxy 46): burns you start tick once at once; Ground Plane (implant 49): hits on you can't crit; Undervolt (proxy
    49): Momentum no longer raises the damage you take.
  - **Bedrock's vaults:** Bedframe (shell 45): +12% max Signal, heals on you 5% larger; Bus Fault (implant 47): Jams
    also push the part's next attack back a cycle; Cold Iron (shell 48): +3 Block, and Block takes its full amount off
    damage over time; Strata (shell 49): each 10% of Signal missing cuts damage to you 2%, up to 10%.
  - **Bedrock's puzzle boards:** Watchdog Timer (script 46): every 6 cycles with no helper out, a free one joins for 2
    cycles; Bit Flip (exploit 47): every fourth crit in a fight deals double its bonus; Clock Tree (script 49): your
    Clock Speed meter starts half full.
  - **Threads on Bedrock:** Brownout (shell 47): below 25% Signal you take 15% less; Dead Reckoning (proxy 48): your
    first hit on each part goes through its ◆.
- **Boss uniques** (two each; The Resident and bosses), **native uniques** (Networks), **invasion-only uniques**
  (Tripwire, Honeynet, Sinkhole: Captures) and **strain trophies** (1 in 10,000 kills of a strain drops its own, Keylogger
  → Logger Spool and so on; a slayer streak's reward rolls for it outright).
- **Story and contracts** can give a unique (killing claimjack gives wick's Old Toolkit).
- **Uniques: never more than one an hour** of real play, about one every two on average (the designer's rule). Every
  source counts toward it, set pieces included; a bigger pool makes each drop likelier to be new, never more frequent.

### Drops (WoW's model)

Trash pays code and components and only now and then an item; elites and rare spawns drop better; a boss always drops
one item; quests pay what they say (`LOOT` in gear.mjs, `BOSS_LOOT` in data.mjs; WoW's green is our blue, its blue our
yellow, its epic our gold). Targets, at about 150 kills an hour of real play (`LOOT.killsPerHour`): a blue about every
85 kills, a yellow about every 500, a gold outside bosses under 1 in 4,500. Boss uniques are the way to gold.

| Source | One roll's odds (white · blue · yellow · gold) |
|---|---|
| **Trash**: a process, a SPRAWL-00 stray, a home invader | 4% · 0.12% · 0.01% · 0.0005% |
| **Elites**: an elite room, a Pit elite, a guard, a mirror | 15% · 0.5% · 0.06% · 0.005% (a gold is any world unique up to its level) |
| **★ Rare spawns** | 60% · 12% · 3% · 0.05% |
| **Bosses** | one item every kill (a blue, a yellow one in four), then its uniques |
| **Crew bosses** | a yellow every kill, its uniques at 30% +10% a miss, 10% a world unique |
| **Quests** (a contract's bonus, the storyline) | a blue, a yellow one time in ten |
| **Small rewards** (Mapped) | a white or a blue, half and half |

- **One roll each.** A guard rolls once; a contract's named target twice, keeping the best. Reading every tell adds a
  roll; a Pit rolls again after the kill. Deeper layers add 25% a layer to blue and yellow odds.
- **The Resident** rolls like an elite (no sure item) and for its two uniques once each.
- **Vaults:** half hold a protocol (`kit.bin`; your first server's always), white 94 · blue 6 · yellow 0.4 · gold 0.03
  (a unique that drops from vaults that deep). A second vault holds the same a third of the time, else a script.
- **Pace:** the System page shows your kills an hour of active play. Odds are set a kill at a time, so a faster or
  slower player sees the same drops a kill.
- A good drop shows as a notice; whites drop quietly. **Deconstruct** (`deconstruct <id>`, `scrap`): white 1–2
  components, blue 2–3 + 1 code, yellow 5 + 2 code + 1 Exploit, gold 10 + 4 code + 3 Exploits (an Indemnified one gives
  no Exploits); +1 component per 10 item levels; the code is the family it dropped from. A card lists what you got.

### Sets

Uniques that add up, D2 style (`sets.mjs`, the sets in `content/sets.mjs`). A **set piece** is a unique carrying a set:
**every piece works alone** (its slot's best base at its level, plus a small bonus of its own) and has a **green line**,
a second stat that counts while two or more of its set are loaded. A set's bonuses open at 2, 3 and 4 loaded pieces.
**Only one 4-piece bonus** is active at a time: the set whose fourth piece went on first keeps it. Set Clock Speed
counts toward the 25% cap.

**Tier sets** (one a class, the end-game gear): every piece is a **level-50** item (its slot's best base ×1.1), and
their bonuses are stronger. They drop from **KESSLER-FARM-00's crew bosses** and **Bedrock's lair boss**, on those
bosses' set rolls, from level 48: one of the sixteen pieces, three times as likely your own class's, pieces you lack
first. Anyone can wear them; each subclass line under the 4-piece works only for that subclass. Each takes four of the
five slot kinds, so a general set's 2-piece can go beside it.

| Set | Pieces (slot): own bonus [green line] | 2 pieces | 3 pieces | 4 pieces |
| --- | --- | --- | --- | --- |
| **Wrecking Crew** (Breaker) | Crowbar (exploit): +5% damage to parts below half [+5% crit] · Det Cord (script): breaking a part heals 2% of max Signal [+6% max Signal] · Hard Hat (shell): +2 Block [+5% damage] · Blast Map (implant): +5% crit [+5% Clock Speed] | +8% damage | Breaking a part gives +10% damage for 2 cycles | When you break a part, your next damaging skill also hits the part beside it for 50%. *Demolitionist:* Overkill spills 20 more. *Overclocker:* you gain 1 Momentum. |
| **Strongbox** (Bastion) | Drill (proxy): +2 Block [+6% max Signal] · Combination (script): shields you raise are 10% larger [+5% Clock Speed] · Vault Door (shell): the first hit on you each fight deals half [+2 Block] · Tumbler (implant): +6% max Signal [+5% damage] | +8% max Signal | Shields you raise are 15% larger | A hit for more than 15% of your max Signal marks its part, which takes 10% more from you for 3 cycles. You heal 3% of max. *Warden:* the marked part's next attack comes a cycle later. *Sysop:* the heal is doubled. |
| **Palemask** (Infiltrator) | Exit (exploit): +5% crit [+5% damage] · Veil (proxy): +5% Stealth [+5% crit] · Pillow (shell): +2 Block [+6% max Signal] · Mask (implant): your first hit on each part deals 8% more [+5% Clock Speed] | +5% crit | Your first hit on each part deals 15% more | When a part drops below half, your next hit on it crits. *Phantom:* Weak Spot resets on that part. *Payload:* your burns on it tick 20% harder. |
| **Load Balanced** (Operator) | Cron (script): your helpers deal 5% more [+5% Clock Speed] · Relay (proxy): +6% max Signal [+2 Block] · Parasite (shell): +2 Block [+5% damage] · Core (implant): +5% Clock Speed [+6% max Signal] | Your helpers deal 10% more | Your helpers last 1 cycle longer | Every third helper you call arrives as two. *Herder:* Last Gasp strikes deal 25% more. *Hijacker:* the extra helper plants a foothold. |

**General sets**, any class, by level:

| Set | Levels: drops from | Pieces (slot, level): own bonus [green line] | 2 pieces | 3 pieces | 4 pieces |
| --- | --- | --- | --- | --- | --- |
| **LOWLIGHT Kit** | 1, 22: wick's storyline | wick's Old Toolkit (exploit, 1): none [+5% crit] · LOWLIGHT Badge (implant, 22): +5% damage for each contract you hold [+6% max Signal] | Delivering a contract fills your Signal; your next kill pays 25% more XP | | |
| **Boot Disk** | 1–8: RELAY-KING, ★ rare spawns on floor 1 | Floppy (shell, 1): +6% max Signal [+5% crit] · Boot Sector (script, 3): +1 Regen [+5% damage] | +10% max Signal. Regen heals 1 more every 5 cycles | | |
| **Hive Mind** | 5–16: the floor 2 lair boss | Seed (exploit, 6): your burns deal 5% more [+5% crit] · Swarm (script, 9): your helpers deal 5% more [+5% Clock Speed] · Carapace (shell, 12): +2 Block [+6% max Signal] · Queen (implant, 15): +6% max Signal [+5% damage] | Burns and helpers deal 8% more | Burns and helpers last 1 cycle longer | Parts under your burns or helpers take 8% more from all your damage |
| **Kestrel Clearance** | 7+: the Kestrel guard posts, floor 2 and below | Kestrel Badge (proxy, 7, the Bouncer): answering a tell shields you for 10 [+5% Clock Speed] · Kestrel Token (script, 7, the Tracer): +10% damage on the signature part [+5% crit] · Kestrel Lanyard (shell, 7, the Sentinel): +10% crit on a part with no ◆ [+5% damage] | +8% max Signal | Once a fight, a hit that would take more than 30% of your max Signal deals 30% instead | |
| **Night Shift** | 7–14: threads on floors 1–2 | Timecard (script, 8): +5% Restore [+6% max Signal] · Night Light (proxy, 11): +6% max Signal [+5% damage] · Thermos (implant, 15): +1 Regen [+2 Block] | +2 Regen | Resting at home refills Signal 50% faster | |
| **Choirbook** | 10–20: the Hollow Choir, REPO MAN | Psalter (script, 10): +5% Clock Speed [+6% max Signal] · Mirror (shell, 13): +2 Block [+5% Clock Speed] · Keys (exploit, 16): +5% damage to jammed parts [+5% crit] | Answering a tell shields you for 5% of max Signal | Jams and delays you apply last 1 cycle longer | |
| **Patchwork** | 10–18: strain kills | Stitch (exploit, 10, ransomware strains): +4% damage [+5% crit] · Darn (proxy, 12, worm strains): +6% max Signal [+2 Block] · Hem (shell, 14, ghostroot strains): +2 Block [+5% damage] · Seam (implant, 15, any strain): +4% Clock Speed [+6% max Signal] | +5% damage, +5% max Signal | +5% Clock Speed | Each different skill you use in a fight adds +2% damage, up to +12% |
| **Lantern Route** | 12+: LANTERN's couriers | Shortwave (proxy, 12): +5% Scavenge [+6% max Signal] · Logbook (script, 14): caches you take pay 10% more credits [+5% damage] · Antenna (implant, 15): you see a server's rare spawn on its map card [+5% Scavenge] | +10% Scavenge | Caches and vaults pay 25% more credits | |
| **Glass Ceiling** | 14–26: GLASSJAW's bosses and elites | Rotor (exploit, 14): +5% damage [+5% crit] · Quorum (proxy, 17): +6% max Signal [+5% Clock Speed] · Ledger (script, 20): +5% crit [+5% damage] · Parachute (implant, 23): once a fight, below 25% Signal, heal 5% of max [+2 Block] | +6% damage | +10% damage while below half Signal | +10% Clock Speed while below half. Once a fight, dropping below 25% heals 10% of max |
| **On-Call** | 18–30: the floor 3 and 4 lair bosses | Pager (proxy, 18): +5% Restore [+2 Block] · Runbook (script, 22): your first heal each fight is 15% larger [+6% max Signal] · Failover (shell, 26, floor 4): +2 Block [+5% Clock Speed] | +10% Restore | Healing past full becomes a shield, up to 10% of max Signal | |
| **Cold Storage** | 19–26: vaults | Freezer (shell, 19): +2 Block [+6% max Signal] · Cold Cache (implant, 22): +6% max Signal [+5% damage] · Frost Line (proxy, 25): +1 Block while above 75% Signal [+5% crit] | +2 Block | Above 75% Signal, you take 8% less damage | |
| **Overtime** | 22–30: puzzle boards won, a piece a kind | Punch Card (script, 22, Quarantine): +4% Clock Speed [+5% damage] · Time Clock (implant, 24, Cascade): +6% max Signal [+5% Clock Speed] · Late Pass (proxy, 26, Ping sweep): +2 Block [+5% crit] · Coffee Run (exploit, 28, Hunter chase): +4% damage [+6% max Signal] | +5% Clock Speed | From a fight's 6th cycle, +8% damage | From the 6th cycle, cooldowns tick an extra cycle every other cycle |
| **Burst Buffer** | 25–32: ★ rare spawns | Cache Line (exploit, 25): +5% crit [+5% damage] · Prefetch (script, 28): your first skill each fight deals 8% more [+5% crit] · Flush (implant, 31): +4% Clock Speed [+6% max Signal] | Critical strikes deal 8% more | Your first two skills each fight deal 20% more | |
| **Hot Spare** | 28–36: Resident takeovers | Standby (shell, 28): +6% max Signal [+2 Block] · Failback (implant, 32): +2 Block [+5% damage] | The first time a fight drops you below 30% Signal, heal 20% of max and deal 10% more for 3 cycles | | |
| **Mesh** | 31–38: crew bosses | Node (proxy, 31): +6% max Signal [+2 Block] · Link (script, 34): heals you cast are 5% larger [+6% max Signal] · Hub (implant, 37): +4% damage [+5% Clock Speed] | +5% damage and healing per crewmate in the fight, up to 3 | Heals and shields you put on a crewmate also land on you at 25% | |
| **Deep Archive** | 37–44: vaults on floors 7 and 8 | Index (script, 37): +4% Clock Speed [+5% damage] · Spine (shell, 39): +2 Block [+6% max Signal] · Folio (exploit, 41): +5% damage [+5% crit] · Vellum (implant, 43): +6% max Signal [+2 Block] | +8% max Signal | +8% damage | Every 4th cycle, your next skill repeats at 40% |
| **Bedrock** | 43–50: the floor 8 lair boss | Bedrock Plate (shell, 43): +2 Block [+6% max Signal] · Core Sample (implant, 45): +6% max Signal [+5% Clock Speed] · Pick (exploit, 47): +5% damage [+5% crit] · Survey (proxy, 49): +5% crit [+5% damage] | +5% damage, +5% max Signal | +10% Clock Speed. Cooldowns start each fight 1 cycle shorter | Once a fight, a hit that would drop you to 0 leaves you at 1 and shields you for 20% of max |

- **What the words mean** (`SET_HOOKS`): a set's *damage* is all your damage (skill hits, burns, helpers); *+X% max
  Signal* is a share of your whole max; *your first hit on each part*, *your first skill* and *each different skill*
  count your commands; *the part beside it* is the next living part; *healing past full* counts any heal landing at
  full, Leech included; a cap like *a hit that would take more than 30%* applies before Block and shield; *a hit for
  more than 15%* is what reached your Signal.
- **Where the pieces drop** (`SET_LOOT`, `setDrop`): one roll an event of a source, at its chance plus its pity for each
  event without one while you lack a piece it drops; once you've found them all, a small flat chance. A piece you lack
  comes first, and a Listening Post listening for one lifts it. After a miss the log gives the next chance. The random
  golds (an elite's world unique, a courier's unique, a boss's own two) never give a set piece.

| Source | Chance · pity a miss · once all found | About how many events to a piece |
| --- | --- | --- |
| A Kestrel guard post's Bouncer, Tracer or Sentinel (floor 2+), its own piece | 4% · +2% · 1% | 8 kills |
| A named boss, a lair boss (by floor), a crew boss | 8% · +3% · 1.5% | 6 kills |
| A thread done (by its deepest floor) | 15% · +8% · 3% | 3 or 4 threads |
| A puzzle board won (by its kind) | 1% · +0.2% · 0.3% | 24 boards |
| A Resident takeover | 2% · +0.5% · 0.4% | 15 takeovers |
| A vault opened (by floor) | 0.5% · +0.06% · 0.1% | 44 vaults |
| A LANTERN courier intercepted | 0.6% · +0.1% · 0.2% | 35 couriers |
| A GLASSJAW boss or elite | 0.5% · +0.05% · 0.1% | 48 kills |
| A ★ rare spawn (by floor) | 0.08% · +0.003% · 0.03% | 205 kills |
| A strain kill (by its lineage) | 0.2% · +0.05% · 0.05% | 53 kills |

- **Sources not built yet** drop from their floor's lair boss (On-Call from floors 3 and 4, Bedrock and the tier sets
  from floor 8's). Floors 5 and 6 have no set of their own yet.
- **The LOWLIGHT Badge** comes with wick's last letter at level 22 (Mail), with wick's Old Toolkit rebuilt at your level.
- **The tooltip** reads in WoW's grammar under the piece's effect: its green line (set green once on, grey until then),
  the set's name and count (*Kestrel Clearance (2/3)*), its pieces (??? until found), and each bonus as *(2) Set: …*.
  The Loadout lists **Set bonuses**. **Set green** (`--r-set`) sits beside the rarity colours; a piece's name stays gold.

### Faction gear

Two kinds tie items to the factions (`faction-gear.mjs`): **implicits** on items a faction gives, and five **faction
pieces** that only feuds give.

**Implicits.** An item a faction gives carries one fixed extra line, its **implicit**, in the faction's colour with its
mark on the glyph. It grows with item level. **The same implicit counts once**, at its best, however many items carry it.
It rolls on a feud runner's protocol and the feud's sealed item, a faction's contract items (Halcyon's board Halcyon's,
GLASSJAW's off-the-books jobs GLASSJAW's), a hub's sealed item and premium protocol, and a faction server's vault item.
Never on a unique, a set piece or a Zero-day, and kills never roll one.

| Faction | Implicit | What it does | Lv 10 | Lv 30 | Lv 50 |
| --- | --- | --- | --- | --- | --- |
| Halcyon Mutual | **Claims** | A hit over 15% of your max is a claim: that share of it is healed back two cycles later (a striped pip past your Signal) | 18% | 26% | 34% |
| Kestrel Underwriting | **Appraisal** | When you break a part, the next part to attack is appraised: its next hit shows, and you deal that much more to it until it breaks | 12% | 17% | 23% |
| GLASSJAW | **Glass Jaw** | Above 75% health you deal that much more; below 25% you take half that more | 10% (5%) | 14% (7%) | 18% (9%) |
| LANTERN | **Clean Signal** | Each cycle no attack lands on you, your skills deal that much more, up to three times; a hit clears it | 4% a stack | 5% | 7% |
| NULL CHOIR | **Chorus** | The same damaging skill twice in a row: the second hits again for that share | 28% | 36% | 44% |

**Faction pieces.** One faction unique each, built from **3 parts**. Winning a feud for a side gives one part of its
piece. At the faction's hub, **Assemble** (`hub assemble <faction>`) with 3 parts gives you the piece **at your
level**; every 3 more parts **re-tune** it to your level. The parts are yours whatever your rep. Each is a sidegrade
(its slot's best base ×1.2), with a signature effect and its faction's implicit a quarter stronger.

| Piece | Faction | Slot | Signature |
| --- | --- | --- | --- |
| **Umbrella Policy** | Halcyon | Proxy | You take 6% less damage while below half health |
| **Mews** | Kestrel | Shell | Landing a critical strike heals 2% of your max health |
| **Blank Check** | GLASSJAW | Exploit | +15% damage against the part with the most Integrity left |
| **Carrier Wave** | LANTERN | Exploit | Answering a tell takes 1 cycle off all your cooldowns |
| **Descant** | NULL CHOIR | Script | Your burns and helpers deal 10% more |

### Collection log

Every unique, strain trophy, set piece and faction piece has a place in the **Collection** on the System page, by
level: the ones you've found by name, the rest **???** with their level and where they come from. A missing boss unique
shows its boss's chance a kill, pity included. A bar counts the total; the card shows from your first unique. A new
find adds a *New in collection* row to the reward card, and counts even if a full stash breaks it down. Sets show their
pieces (*Kestrel Clearance 1/3*, ??? until found); faction pieces their parts as three pips.

The **collection log** is the Codex's second tab, **Collection n/N** (`collection.mjs` keeps it, `collection-log.mjs`
builds it, `collection-view.mjs` draws it: the *Ledger*). Its index: Families, Strains, Guards & ICE, Bosses, Floors and
Elsewhere (every other source), each entry its n of N and a thin bar, and a search over the entries by their names and
what you've found or named on them (never a ??? slot). The **‹** over either tab folds the index to a rail, and stays
as you left it. An entry lists its slots, one line each, in sections; daemons have their own log.

| Section | A slot | It fills when |
|---|---|---|
| Uniques | each unique its kills or rooms drop | you first find it |
| *a set* | each piece of the set it drops (the heading counts the whole set) | you first find it |
| Mastered | each part the Codex lists for it | its research reaches 60 |
| Beaten | a strain, a boss | you first beat one |
| Feats | its achievements (a boss's, a floor's, each set's) | you earn it |

A line shows the slot's icon, its name (**???** until it fills) and a muted hint (its level and where it drops, or its
research toward 60), and the date it first came. The rest is its tooltip. The first time a slot fills, one quiet pager
line says so and opens its entry. A save keeps `s.collection = { slot: when }`: a unique by its id, `m:` a part
mastered, `b:` a strain beaten, `w:` a boss won, `full:` an entry filled. An older save stamps what it has already
done on load (as *before the log*), with one pager line.

## The economy

### Credits

You start with 0. About 300 credits an hour come in to level 10 and 500–900 an hour over the climb to 20 (taking
contracts): run caches a bit over half, contracts about a third, the Halcyon retainer the rest. No credits come from
kills. `node econ.mjs` measures it.

- **Health is the everyday sink.** Signal rests back 20% of max a minute, your server 2% a minute (half that while an
  invasion is contested or breaching), offline too. Or pay now: a full Signal bar costs 8 + 1.5 × your level, a full
  server 10 + 2 × its level; less missing costs less. Click the meter's **+**, or `top up` / `repair [n]`. Short of
  credits, you get what they buy. On a run the store's Signal patch fills it.
- **Building:** programs and codebases (Sockets and programs). **Gear:** the store's sealed item and premium shelf.

| Sink | Price |
|---|---|
| Signal top-up (full) | 8 + 1.5L credits |
| Server repair (full) | 10 + 2 × server level |
| A light / medium program (floor 1) | 140 / 280 credits, 15 / 30 of the server's code, 0 / 1 Exploit; +25% of that a floor past the first |
| A codebase, light / medium | 200 + 10L / 400 + 15L credits |
| A sealed item (a blue at your level) | 180 + 14L credits |
| A premium protocol: a blue at L + 2 / a yellow at L | 3.5 / 4.5 hours of income at L |
| Firewall tiers, defrag | Home |

### Code and components

**Code** comes one kind a virus family, plus rare **Exploits**: Cipher code (ransomware), Worm code (worms), Kernel code
(ghostroots), from kills, guards and vaults of that family. A kill drops 1 code at level 1 (+1 every 10 levels), a guard
half again, into your pack; every vault's `payload.bin` is a cache of 12 + half the server's level. Exploits drop from 4%
of home kills and 8% of guard kills. Scavenge adds to all of it.

**Components** (salvage.mjs) are one currency, a count: what broken parts leave behind. Breaking a part drops them **60%
of the time in a room fight**, always from an elite's parts with **one more** at the kill, and **35% anywhere else**
(home, invasions). A mastered part drops them 25% more often, and an .exe part always one more; a Harvester adds one a kill on its server; a network rich
in them more. Deconstructing, a stopped invasion and a scrapped filter give them too. Every hub's market buys them;
none sells them. Nothing is built from them. Your count shows on the Server page.

### The Halcyon store

Halcyon's hub's **Shop** (store.mjs). It opens with the contract board (Mail and contracts).

| Halcyon's own line | Price | Needs |
|---|---|---|
| Relay | 120 + 8L | Probation |
| Deductible (survival): the first attack that lands on you each fight does nothing | 1,200 × (1 + L/15) | Contractor |
| Subrogation (offense): when a part hits you, your next skill hit on it deals double | 1,800 × (1 + L/15) | Trusted |
| Actuarial Model (utility): veils can't hide attack timers from you | 1,800 × (1 + L/15) | Trusted |
| Total Loss (offense): when you break a part, every other part takes a quarter of its max Integrity (armor soaks it); breaks it causes do it again | 3,200 × (1 + L/15) | Preferred |

The four chase protocols are **Indemnified**: rolled at your level with bigger stats than Custom (×1.45 main, two
secondaries at ×0.85) and a signature effect nothing else has, one of each loaded at a time. They are the game's credit
sink (prices rounded to 10: at level 30, 3,600, 5,400, 5,400 and 9,600). Halcyon's codebases are on this shelf too.

- **Agency stock**, resold from other agencies (Kestrel Underwriting, Norrland Re, Blue Ledger Security, Mimir
  Actuarial, Quayside Claims, Vesper Risk): four slots, each turning over on its own clock (40–150 minutes), each with a
  supplier, a price drifting up to 25% either way (▲ ▼) and a small quantity: refurbished relays, key crackers (a found
  server's vault key, used from its map card), trace injectors, Signal patches, hot-swap kits (full Integrity), code
  lots, Exploits and sealed items.
- **The premium shelf** (`PREMIUM`), atop the agency stock: two protocols rolled for your level, a step above what
  drops: a **blue two levels up** and a **yellow at your level**, each for a different open slot, with Halcyon's
  implicit; never a unique, a set piece or a Zero-day. Each costs hours of credits at your level (`incomeAt`: 300 an
  hour to level 10, +60 a level to 900 at 20, then +40 a level): the blue 3.5 hours, the yellow 4.5. No clock: a new
  level brings new stock, and buying one puts a comparable one in its place. `buy premium-<n>`. Each faction hub's
  shop holds one premium protocol with its own implicit, at its tier's price (`buy <faction> premium-0`).

### Markets

Every hub buys and sells what you farm (`market.mjs`): Cipher, Worm and Kernel code (base 14 credits), Exploits (140);
components (7) it only buys. Each ware shows what you hold, what it pays here, and ▲ ▼ against the average across
hubs.

- **Prices move on things you can't change.** Each hub has a fixed condition, and one world event at a time (turning
  over every 4 hours, never the same twice running) touches every hub.

  | Hub | Condition | Effect |
  |---|---|---|
  | Halcyon | Claims backlog | Cipher ×1.35 |
  | GLASSJAW | Black budget | Exploits ×1.5 |
  | Kestrel | Overheating racks | Kernel ×1.8, components ×1.25 |
  | LANTERN | Thin bandwidth | Worm ×1.45 |
  | NULL CHOIR | Scrap economy | components ×0.6, Cipher ×1.15 |

  World events: Ransomware outbreak (Cipher ×1.5), Worm season (Worm ×1.5), Patch Tuesday (all code ×0.8), Zero-day
  rush (Exploits ×1.6), Grid blackout (components ×1.5, Kernel ×1.25), Quiet market.
- **The order ticket:** click a ware for **Sell** or **Buy**, a slider for how many, and a live preview (the total, the
  first and last unit's price, the same order at other hubs, your credits after). `market sell|buy <faction> <ware> <n>`.
- **Spread and pressure:** a hub asks 15% over its price and pays 15% under (2% better a rep tier above Probation's).
  Each unit you sell takes 4% off its price there, each you buy adds 4% (between 35% and 160% of normal), easing 12% an
  hour. Each unit of a lot is priced after its own push, so no round trip profits.
- **File transfers:** a sale leaves now and pays on arrival; a purchase is paid now and arrives later. Halcyon 5 min,
  Kestrel 8, LANTERN 10, GLASSJAW 12, NULL CHOIR 15; each relay cuts 10% (up to 40%). Hostile factions won't trade.
- **Tips.** A pirate broadcast logged on the scanner moves one ware's price at one hub for a while ("The scanner").

### Sockets and programs

A traced server has **socket rooms** (docs/servers.md 6, `sockets.mjs`), and a **program** you build in one changes
that server's rules and nothing else.

- **Socket rooms:** small servers 1, medium 2, large 3, leaves off the ends of branches, each guarded on your first
  visit by a process of the server. Beat it once and the socket is **open for good**. A Backbone server has one more;
  **Root 4** adds one beside the Core, open at once; a **Grid** consortium one on every traced server. A server you hold
  has its **Core** as a socket too.
- **Codebases:** you need a program's codebase to build it, once, then anywhere. You start with the **Harvester**; the
  rest are bought once each, by tier: Halcyon (Harvester and Defrag Bay at Probation, Cache Mill at Contractor), Kestrel
  (Snare, Bulkhead, Lockdown), LANTERN (Listening Post, Tunnel), GLASSJAW (Code Siphon, Patch Injector, Honeytoken),
  NULL CHOIR (Cron Spawner, Lure, Amplifier). Lockdown is paid in Cipher; the rest in the server's own code.
- **One of each a server**, injected at once (no timer, no upkeep, nothing comes for it). **Uninstall** (in its room,
  between fights) is free and gives back half the credits and code.
- **On the map** a socket is a bus slot: red while guarded, amber once open; a program takes the chip. Walk into an open
  socket for the **Build** card (every codebase you know, its rule, its cost as chips, **Build**). A server's card shows
  *Sockets n/N* and its programs. `build`, `build <program>` (`install`), `uninstall` (`remove`).

| Program | Weight | On its server |
|---|---|---|
| Harvester | light | Every virus you kill drops 1 more component |
| Cron Spawner | light | Fight rooms respawn twice as fast |
| Code Siphon | light | Every fight room you clear pays 3 more of its code |
| Cache Mill | light | Caches refill twice as fast and pay 50% more |
| Defrag Bay | light | Its room is a rest room: 25% of your max Signal, once a visit (a Tracker won't walk in) |
| Tunnel | medium | Its room and the entry are one free step apart; the hunter can't use the link |
| Snare | medium | A hunter that walks into its room is held 4 of your moves, once a visit |
| Listening Post | medium | Kills here roll for the unique you name (`listen <unique>`) twice as often; `listen` needs one somewhere |
| Lockdown | medium | Invasions it sends come 2 levels lower |
| Amplifier | medium | Invasions it sends come 2 levels higher |
| Bulkhead | medium | The hunter never steps into its room; fights in it and next door start behind a shield of 10% of your max Signal |
| Patch Injector | medium | Its viruses have 1 ◆ less on every part (not the hunter) |
| Honeytoken | medium | Its fight rooms' viruses come a grade higher, 1 in 4 an elite; its kills pay 50% more XP and roll for loot once more |
| Lure | medium | Its fight rooms respawn as the family you name (`lure <family>`, or its room's buttons), one you've met |

### Root access

A server you've taken over keeps paying you back if you keep coming back (`root.mjs`; RuneScape's player-owned house).
**Root counts the respawned fight rooms you clear on a server you hold** (a first clear is progress, not Root): Root 1
at the takeover, 2 after 5, 3 after 15, 4 after 30, 5 after 50. The card shows five pips. Each Root level pays ¾ of a
kill's deed XP, and a held server's respawned rooms count as Building XP.

| Root | What it gives |
|---|---|
| 1 | Taken over |
| 2 | A **stash room** beside the Core: the server's code (4 + level/4), back every two hours |
| 3 | It stops sending invasions |
| 4 | One more socket room, beside the Core, open at once |
| 5 | Its rare spawns come twice as often |

## Mail and contracts

**The story.** Halcyon Mutual insures half the servers on the net. Rival crews keep hitting its clients, so Halcyon
pays third-party crews to fight a turf war against them, and never asks how. You're an initiate of one of those crews,
**LOWLIGHT** (your handler is `wick`). The rival crews are named for the viruses they run: **TOLLGATE** (ransomware),
**SWARMLINE** (worms) and **PALEMASK** (ghostroot). **GLASSJAW** is a broker that works against Halcyon.

### Transmissions

A **transmission** is a conversation over the map with a contact (`scenes.mjs`; its words in `content/scenes.mjs`), in
the quest window's look: **Incoming**, their portrait beside the conversation, your answers in teal, numbered choices
under it (click, or press 1–9). A question you've asked is gone from the next choices; an answer can end it somewhere
(Mail, a server on the map). Esc or × ends it. Each plays once, never mid-fight; one that comes while another plays
waits its turn.

| Scene | When |
|---|---|
| wick's welcome | Your first login, after you pick a class: who LOWLIGHT is, what Halcyon wants, where to start (your first job in Mail). |
| Your first server | Your first server located: what a server is, getting in, the vault; **Show me** opens it on the map. Only on a save that heard the welcome. |

### Standing

Standing with Halcyon runs 0 to 100 and starts at 10. It sets the retainer, paid every 30 real minutes, offline too (up
to 8 hours of it builds up), and what the store sells you. L is your server level.

| Standing | Tier | Retainer every 30 min |
|---|---|---|
| 0 | Suspended | nothing |
| 1–24 | Probation | 5 + L |
| 25–49 | Contractor | 10 + 2L |
| 50–74 | Trusted | 15 + 3L |
| 75–100 | Preferred | 20 + 4L |

Delivering a contract raises standing. A crash on your own server costs 10, never below 1. GLASSJAW's work costs 8 a
job, and only that can suspend you. Declining or dropping a contract costs nothing.

### Contracts

They track themselves once taken; you hand them in from Mail (`mail deliver <n>`), and a **Contract delivered** card
lists what it paid. **Contracts are the best XP an hour** (WoW's quests): each pays a fixed XP set when it's posted, on
top of what the work pays: its kind's **baseline** in kills' worth (`BASE` in mail.mjs), times its **size** (a job that
counts something is small, medium or large by how many it asks: ×1, ×2, ×3; kills up to 5 small, 6–11 medium, 12+
large; `SIZE`), times the **level curve** at the level it was posted (`MAIL.xp`: 3× at level 1, 8× at 5, 13× from 10 to
20, 11× from 30). Delivered later, it pays what it was posted for. GLASSJAW's pay 1.5× that.

| Baseline | Kinds |
|---:|---|
| 1 | Materials (a code delivery) |
| 1.5 | Kill, Grind, Decode, Interrupt |
| 2 | Strain, Named process, Rooms, Solve, Sweep, a floor job's puzzle board |
| 2.5 | Recover a file, Hold, Break Encryptors, Catch an Exfil |
| 3 | Map, Takeover, Install, Root |
| 3.5 | Past the Tracker |
| 4 | Map without resting, a floor job's lair boss |

| Type | Done when | From level |
|---|---|---:|
| Kill | N kills of a family anywhere (or anything in SPRAWL-00), no more than 4 levels under the level it was posted at; a protocol it pays rolls at the kills' average level | — |
| Grind | Many kills of one family (12, +2 every 5 levels) | 3 |
| Named process | Kill the named process put in a SPRAWL-00 room (two levels above you; only while SPRAWL is your level) | — |
| Strain | N kills of one strain at your level. Every fifth strain contract in a row pays double and rolls for its trophy; dropping one resets the streak (RuneScape's Slayer) | 7 |
| Materials | You have the code in stock (it's handed over) | — |
| Rooms | Clear N rooms you haven't cleared before on a server | — |
| Map | Map a traced server | — |
| Takeover | Open the server's vault, then beat its Resident | — |
| Recover a file | Pull the contract's file from a server's vault and bank it (it's handed over) | — |
| Decode | Research N parts a tier (2, +1 every 15 levels) | 2 |
| Solve | Win N puzzle boards (2, 3 from 20), or one of a named kind | 4 |
| Sweep | Sweep a temporary server's process log, or two | 4 |
| Hold | Stop an invasion, at your wall or by hand (once you've traced a server) | 5 |
| Root | Reach the next Root level on a server you hold | 5 |
| Interrupt | Answer N attacks (6, +1 every 10 levels): a cast stopped, a charge or a seal blocked | 10 |
| Side | KESTREL and NULL CHOIR each post one when the board opens; take one and the other is gone. +20 rep with that faction, and its rival turns against you (WoW's Aldor or Scryers) | — |

**Room contracts** have no clock: one waits on the board at a time, outside the ten, each kind once, the next 8 to 20
minutes after you take it.

| Room contract | Done when | From | Pays |
|---|---|---:|---|
| Install | Carry Halcyon's item (a canary, a logging tap, a patch script) to a named room on a traced server (*at C2 on MERIDIAN-MX-14*) and `install` it there. It rides in your pack on that server; lose your Signal with it and the contract **fails** | 5 | 55 + 9L, +7, a protocol one time in three |
| Break Encryptors | Break N Encryptors (3, 4 from 20) before they land an Encrypt | 4 | 40 + 7L, +6 |
| Catch an Exfil | Recover an Exfil's archive, on any rogue server | 6 | 45 + 7L, +6 |
| Map without resting | One visit to a named small or medium server: stand in every room but the Core with nothing live in it, and never rest | 8 | 70 + 11L (×1.3 medium), +8, a protocol |
| Past the Tracker | Bank a file planted in a Tracker server's vault from a visit it never reached you (waking is fine) | 8 | 65 + 10L, +8, a protocol half the time |

A contract that points at a room marks it on that server's map (its address amber, the contract's mark), and so does any
job a room's live virus would count for. The strip shows **Contract** and its progress (its tip has each one, a row each as
the map's tracker draws it), the map's card each contract on that server. A takeover or recovery points at a server you've found, or at an **unknown server** one hop past one: you
trace it to find it.

**The board** opens with the turf letter (the storyline's fourth), or once you've held the claimjack or turf job for an
hour. Up to ten offers sit on it; a new one arrives every 1 to 3 minutes, and an untaken offer is gone after 15. Its kind
is drawn from what your level opens. You hold six at a time (`mail accept <n>`, `mail drop <n>`). Pay at your level L:
kill 30 + 5L credits, strain and named process 40 + 6L, materials, rooms and the activity kinds 35 + 6L, recovery 50 +
8L, map and takeover 60 + 10L, plus XP and +5 standing (+6 recovery, +7 map, +8 takeover). A fifth of offers (from
standing 10) come off the books from GLASSJAW: −8 Halcyon standing, but 2.5× the credits, 1.5× the XP, 5 GLASSJAW rep and
a protocol, Tuned or better. Once the hubs are up, about half the rest of the board is Kestrel's, LANTERN's or NULL
CHOIR's: 20% more credits and their own rep instead of standing, their takeovers often aimed at their rivals' servers.
Delivered contracts move to **Completed**, greyed, newest first.

### The initiate storyline

LOWLIGHT's jobs, in order (they can't be dropped and don't count toward your six; each pays XP by its kind): kill three
processes in SPRAWL-00 (60 credits); hand over two Worm code (80); kill the named process `claimjack`, an elite (one
level above you, never above 4; after two losses it's worn down to v1) (100, wick's Old Toolkit); take over any server
you've traced (250 and your first **relay**); recover Halcyon's stolen `claims.db` from an unknown server next to the
one you took (150, a protocol, Tuned or better). Each pays standing (+3, +3, +3, +4, +4), so you finish at Contractor.
The board and the store open with the turf letter. At level 22 wick writes once more (*crew colours*): take over one
more server (400 credits, +4 standing, the **LOWLIGHT Badge** and wick's Old Toolkit rebuilt at your level).

### Floor jobs (arcs.mjs)

Each floor has its own fixed chain of contracts (WoW's zone quests), carrying the storyline on: wick read the claims
ledger, and its trail leads down the floors. A floor's chain opens once you've reached the floor and the board is open.
One step is open at a time; delivering it brings the next as a letter. Floor jobs never expire, can't be dropped and
don't count toward your six. The words are in `dist/content/contracts.mjs` (`floors`).

| Floor | Chain | From | Steps |
|---|---|---|---|
| 1 The Sprawl | Page nine | wick | named process in SPRAWL-00 · Map · Recover a file · puzzle board |
| 2 Backhaul | Carrier | LANTERN | Install · Rooms · Past the Tracker · Map without resting · lair boss |
| 3 The Stacks | Underwriting | Halcyon Claims | Map · Recover a file · Takeover · puzzle board · Takeover |
| 4 Coldline | Cold storage | Kestrel | Rooms · Install · Past the Tracker · Map without resting · Takeover |
| 5 Deep Core | Static | NULL CHOIR | puzzle board · Recover a file · Rooms · Install · lair boss |
| 6 Kernel Space | Ring zero | wick | Map · Past the Tracker · Takeover · lair boss |
| 7 The Sink | Minutes | Halcyon Claims | Install · Rooms · Recover a file · Map without resting · Takeover |
| 8 Bedrock | Bedrock | wick | Map · puzzle board · Past the Tracker · Install · Takeover · lair boss |

- **Steps** are the board's contract types with fixed targets, plus two of their own: **Win a puzzle board** on a named
  server and **Beat the lair boss** (each after the step arrived).
- **Targets** come from the floor's diagram, so a network always gives the same ones: the landing server, a server along
  the main road (never a rogue or the lair), the first main-road server with a Tracker, or the lair. A target you haven't
  located reads *the server 2 links past ORIN-CACHE-57* until you do. A Past the Tracker step on a server with no
  Tracker becomes a plain recovery.
- **Pay** at your level when the step arrives: credits (40 + 7L up to 120 + 16L by step), Halcyon standing or the
  sender's rep, and contract XP by its kind and size.
- **A pick of three** on a chain's last step and some middle steps: three protocols at your level, each a different
  slot, the first for your class and your subclass's stat: **Custom** on a last step, **Tuned** on a middle one. **Later**
  puts it off; Mail's **Pick your reward** brings it back (`mail take <n>`).
- **In Mail** floor jobs have their own list over Contracts, a row a floor (its number on an amber flag, the sender, the
  title, n/N or **Ready**). Its page is the quest window (the *Transmission*): the chain and why, its steps as a job, the
  step's letter and contract with **Deliver**.

## Factions

Five PvE factions, companies and hacker crews, each with a colour, a mark and a hub (`factions.mjs`). Halcyon is the
first: its standing is its rep.

| Faction | Kind | Colour | Hub (level) | Allies | Rivals | Goods |
|---|---|---|---|---|---|---|
| Halcyon Mutual | company | blue | HALCYON-CLEARING-01 (1) | Kestrel | GLASSJAW, NULL CHOIR | its store |
| GLASSJAW | company | magenta | GLASSJAW-ANNEX-07 (8) | — | Halcyon, LANTERN | key crackers, sealed items |
| Kestrel Underwriting | company | green | KESTREL-DC-NORTH (4) | Halcyon | NULL CHOIR | relays, trace injectors, sealed items |
| LANTERN | hacker crew | orange | LANTERN-RELAY-88 (6) | NULL CHOIR | GLASSJAW | bootleg filters (a sealed Stock or Tuned filter), key crackers, trace injectors |
| NULL CHOIR | hacker crew | rose | NULLCHOIR-SQUAT-13 (12) | LANTERN | Halcyon, Kestrel | sealed items, key crackers |

- **Finding the hubs.** When the board opens only Halcyon's hub is on your map. Every other hub's trace grows when you
  locate a server that faction owns (+40%) and when you clear a guard or virus off one (+20%, and +2 rep). At 100% it's
  located and `connect <faction>` reaches it. Until then you can't trade there or take its work.
- **Rep** runs −100 to 100, five tiers at 1/25/50/75, each faction naming its own (Kestrel's: Blacklisted, Prospect,
  Client, Account, Key account). Below 1 a faction is **Hostile**: its market shut, no work. Rep never comes back on its
  own: win a faction back by hitting its rivals, working for its allies, or donating. Everyone starts at 10 (GLASSJAW 5).
- **Ripples:** whatever rep you gain or lose with a faction, its rivals move half the other way and its allies a quarter
  the same way. Halcyon's standing ripples too, but never pushes a rival below 0.
- **A hub session:** **Connect** jacks you into the hub's terminal (its banner, one line from whoever answers, changing
  with your rep, and its menu as tokens). Each choice opens a window beside it: **Market**, **Shop** (the faction's own
  shelf: its premium protocol first, then its codebases and goods; better rep unlocks more and trims prices; Halcyon's
  Shop is its store), **Work**, **Donate**, **Their servers**. Goods are buy-only, a few of each, refilled hourly,
  priced at the hub's level or yours, whichever's higher, and arrive by file transfer (Halcyon's at once).
- **Donations:** while your rep is under 24, **Donate** (`hub donate <faction>`): credits (80 + 10 × hub level) and 5 of
  the code it wants, × (1 + depth/10) below 1. +5 rep each, never past 24.
- **Faction servers:** about one in eight servers you trace (never your first two, never rogue) belongs to Kestrel,
  GLASSJAW, LANTERN or NULL CHOIR. Opening its vault costs 6 rep with it, taking it over 15 (`OWNED`); the ripple warms
  its rivals.
- **Switched off:** payloads (`PAYLOAD.on` false: no Payloads window, nothing compiles), and with them hub capture. A
  hub a save already holds stays its own: no spread at its market, its goods at 60%, a cut of its trade
  (`hub collect`), and its old owner's swarms (one at a time; lockdown until you `hub retake` it; `fleet.mjs`).

## Events (events.mjs)

The net isn't a storyline: things happen on it. From level 3 an **event director** deals one now and then (first 4–8
minutes of logged-on time after level 3, then every 15–30 minutes, never the same kind twice running, at most two up).
Each goes to the pager and to #net; missing one costs nothing. The director rolls its own dice.

| Event | Where | Lasts | What it is | What you get |
|---|---|---|---|---|
| **Courier** (weight 3) | a traced server | 15 min | LANTERN's courier passes through: *Intercept* it, a fight at your level. From level 10, one in twenty carries a unique you lack, and says which | 40 + 12L credits and a protocol (85% Tuned, 15% Custom), or that unique |
| **Bounty** (2) | a traced server | 25 min | A named virus two levels above you (from level 8, REPO MAN) | 80 + 15L credits, +2 standing |
| **Hollow Choir** (1) | a traced server, from 10 | 25 min | The boss | Twice the bounty's credits and a Custom protocol |
| **Outbreak** (2) | the net | 30 min | One family surges | Its kills drop double code |
| **Leak** (1) | a server you've found, not taken | at once | Someone leaks its vault key | You hold the key as you connect |
| **Darknet listing** (0.5) | the net, from 8 | 20 min | A broker lists a native unique from another network, naming it (`event buy <id>`) | It, for 400 + 40L credits and 2 Exploits |
| **Feud** (1) | a traced server, from 8, with two rival hubs located | 20 min | A tug-of-war between two rival factions (the bar drifts 2–5% a minute, never past 20/80 alone). *Pick a side* (`event fight <id> <faction>`): fight the other side's runner (an elite of its family at your level); each win pushes your side +25% and brings a fresh runner. Your side wins at 100%, or ahead when time runs out | Each win: 40 + 7.5L credits, +4 rep, a protocol with your side's implicit. The feud: a **part** of your side's faction piece, one of its goods, +6 rep (its allies +3). A feud never costs rep |
| **Bounty hunt** (1.5) | a traced server, from 6, two or more traced | 20 min | A named elite that hops to another of your servers every 5 minutes, 3 hops, a level each (up to yours + 3) | 80 + 15L credits ×1, ×1.3, ×1.6, ×2 by hops made, +2 Kestrel rep |
| **Market shock** (1) | a hub you can trade at, from 5 | 15 min | One ware's price ×2.5 there, or one time in three ×0.4 | No fight |
| **Spotter** (1) | your wall, from 6 | 10 min | A spotter watching your wall: *Fight* it | The next invasion comes 2 levels weaker, and you know where from and what kind |

Your network's two favoured cards come up 2.5 times as often, and couriers', bounties' and outbreaks' families follow
its lean. A server with an event wears an antenna on the map, and its card shows the event as a small panel: a strip
with its icon, name and a ring of time left, then its picture with the action built in (the card's sentence is the
strip's tooltip). An event you're fighting waits for you; losing leaves it up. `developer event [courier|bounty|choir|
outbreak|leak|darknet|feud|hunt|shock|spotter]`.

### Chains

What you do with an event can deal a **follow-up** (docs/director.md 2): at most 3 pending, one of each kind, each
waiting its delay in logged-on time and then taking a free slot; one not dealt within 3 hours goes quietly. Its card
and pager line carry a chain-link mark. Ignoring a card never starts a chain.

| Cause | Follow-up | Delay | What it is | What you get |
|---|---|---|---|---|
| A **Feud** you won a fight in | **Counter-raid** | 20–40 min | The side you fought sends a runner at a server you've been on (or home). 15 min | 40 + 7.5L credits, +2 rep with your side |
| A **Bounty hunt** that got away | **Returning bounty** | 30–60 min | Back once at the level it got away at (*last chance*). 20 min | What the hunt would have paid then, +2 rep |
| 3 **Couriers** intercepted | **LANTERN's offer** | at once | LANTERN's own courier on one of your servers. 15 min | A Custom protocol, +5 LANTERN rep |
| 15 kills of an **Outbreak**'s family while it's on | **Patient zero** | at once | The outbreak's source, an elite, on one of your servers; kill it and the outbreak ends. 15 min | A code cache (12 + level/2) and the elite's loot |
| A **Spotter** killed | the next invasion | its own clock | 2 levels weaker, its kind known | — |

### Blips

Small, quick and cheap (docs/director.md 3): one about every 4–6 minutes of logged-on time from level 3, never the same
kind twice running, at most two up, beside the events (not in their slots), on dice of their own. A blip shows as a
violet spark on its server or room (its line on hover) and a quiet pager line that goes with it. Missing one costs
nothing. `developer blip [cache|flicker|rumour|sighting]`.

| Blip | Where | Lasts | What it is | What you get |
|---|---|---|---|---|
| **Stray cache** | a room you've cleared on one of your servers | 3–6 min | Walk into the room (a live virus there first) | (40 + 12L) / 2 credits and half a vault's code (12 + L/2), into your pack |
| **Price flicker** | a hub you can trade at | 5 min | One ware ±15%, on the hub's ▲/▼ chip | No fight |
| **Rumour** | a traced server | 2–4 min | Names where the next event lands. It's true: the director deals that card there while it still fits | — |
| **Sighting** | a fight room you've cleared on one of your servers | 4–8 min | Its next virus is a ★ rare spawn, up within 1–4 minutes. Not met in time, it moves on (the room's next virus is ordinary) | A rare spawn's kill |

### History

The director's last 20 (events, follow-ups and blips) and how each ended (*up*, *won*, *gone*, *taken*, *missed*,
*came true*) sit under **History** in Comms, a follow-up with its chain mark and cause on hover.

## The scanner

A shortwave radio (`scanner.mjs`, `scanner-view.mjs`): the calm side activity, with no risk. It lives at the
**Listening Post**, LANTERN's (apart from LANTERN's trading hub): a hub's diamond with an antenna beside HOME on every
floor, "hub · on the air" with an amber ping while a broadcast is up, "hub · quiet" otherwise. **Connect** (or
`connect post`) opens it like a hub's terminal (`ssh <you>@post-07`, instant): LANTERN's line, then **[1] tune** (the
radio in a window beside it), **[2] recordings** (the tape), **[3] log**, **[0] disconnect**.

- **Found** from a clue: the first broadcast on the air outside a fight breaks into the radio chatter as numbers, a
  line says so, and the post shows on the map (`s.scanner.found`; already true for a save that had the old top-bar
  radio).
- **On the air.** One station at a time, for 2–3 minutes, then 15–30 minutes quiet (the first 5 minutes into a new
  save). Stations not yet logged come up first, then the ones that still pay. A broadcast starts with a quiet two-tone
  ping once the post is found, never in a fight.
- **Finding it.** The band runs 3–12 MHz, all of it on the dial. Drag, scroll or use the arrow keys
  (Shift for ×10). It never shows where a station you can catch is: the S-meter rises and the static clears within
  0.15 MHz of it. One with nothing left to catch shows as a muted glow.
- **The reel.** Within 0.04 MHz at a strength over S3 it **bites**: the dial zooms to 0.8 MHz round it, a teal hold
  zone of ±0.025 MHz sits round the needle, and the carrier moves. In the zone the lock fills in 5 s; outside it drains
  at 1/8 a second. A numbers station sways, a pirate hops every 1.7 s (never back to the centre), a distress call
  wanders and fades, and the lock waits while it's faded. Holding still never catches one. Leaving the window lets go.
- **Logged.** A full lock logs it (its own log, `s.scanner`: counts by kind in Tune, **[3] log** lists each with
  ??? for those not caught) and it signs off 8 s later. A numbers station pays once; a pirate or a distress call pays
  each time it's caught, once a broadcast, and the log keeps its last payoff.
- **The tape.** The post records each broadcast, over the last one (`s.scanner.tape`). Once it's off the air, the
  **On tape** row (in Tune and in **[2] recordings**) shows its station, frequency and age, and **Play back** puts it
  back on the air as long as it ran, to reel in as usual: once, and not if it was caught. The schedule keeps its time.

| Kind | Stations | Pays |
|---|---|---|
| Numbers station | 4 | A line of lore, kept in the log |
| Pirate broadcast | 3 | A tip for a hub you've found: one ware's price there moves (Kernel ×1.3 for 20 min, Cipher ×0.75 for 60, Worm ×1.5 for 40), shown on the hub like a market shock. Only once you've found a hub |
| Distress call | 3 | A one-off thread on the traced server it names (one with no thread, at most 3 levels over you), its ! on the map |

- **Radio traffic.** Fifteen transmissions across the band (time signals, Morse, data, music, voices), heard within
  0.06 MHz, on in bursts. Nothing to catch.
- **Sound** follows Sound and the Effects volume, and plays only while Tune is open: static that thins as a station
  clears, the off-tune whistle (silent dead on), the station under it, the traffic, and a chirp on a catch. The
  broadcast's ping plays anywhere but a fight.

## Home

Your server stays home: its Integrity is your health at home (100, +4% a level, +5% at firewall tiers +1, +3 and +5),
resting 2% of its max a minute between fights (half that while an invasion is contested or breaching), offline too.
`repair [n]` pays for it now. The **Server** page (`server-view.mjs`) is one card (your firewall drawn as a ring of
sixteen blocks round the core, the Integrity ring, **Repair**, Wall, Streak and Next) and a detail panel; its buttons
are the real commands, and pointing at one shows before and after, worked out on a copy of your save.

### Invasions and the wall

The servers you've connected to send **invasions** at your wall, **one at a time**, online or off (`invasion.mjs`;
docs/invasions.md). On the map an invasion moves in from its server; its card, the Server page and the top bar say what
it is, what it does and what it pays (`invasions` in the terminal).

- **When.** The first sets out 3 minutes after you first connect to a server; the next 20–30 minutes after the last is
  dealt with. Logged off, one every 2–4 hours. A server you hold at Root 3 sends none.
- **Who.** Half the time your strongest server sends it, otherwise any, a Volatile server counted twice and a Stable
  one half. A virus of that server's family **at its level** (Volatile and an Amplifier +2, a Lockdown −2) and floor
  grade, maybe a strain, maybe mutated (from level 4). The very first is a plain raider.
- **Travel:** 2 minutes from a floor-1 server, a minute more a floor down, times its kind's; half that from Backbone.
- **Quirks:** a raider, pack or champion carries its server's quirk three times in ten: from a **Hoard** it's Armored
  and pays half again; from a **Nest** it brings a brood (one more virus, two levels under; +1 bounty); a **Hidden** one
  counts 2 levels higher at your wall.

| Kind | Weight | From server lv | What it is | Bounty (points) |
|---|---|---|---|---|
| **Raider** | 30 | 1 | One virus | 2 |
| **Pack** | 16 | 3 | Three of the server's viruses; counts 2 levels higher at the wall for each one waiting behind the front | 1 a virus |
| **Pair** | 12 | 4 (two servers) | Two viruses from two of your servers together; +2 levels while both stand | 3 |
| **Champion** | 12 | 8 | An elite-grade virus a level over its server, 1.5× a normal one's size, travelling half again as long; counts 2 levels higher. Kill it for a **capture** | 5 |
| **Scout** | 10 | 2, online only | Small and quick; it doesn't chip but maps your wall for 5 minutes (unless your wall clears its level by 3). Kill it in time or the next invasion counts 3 levels higher | 2 |

### The firewall (firewall.mjs)

Your wall **follows your network**: its base is the level of the highest server you've connected to, less 2 (never
under 1), moving for free.

- **Tiers** (`firewall upgrade`): a margin of **+1 to +6** on top of the base, kept as the base moves. Tier *t* on a base
  *B* costs (25 + 6B) × t credits, (2 + B/3) × t Cipher code and ⌈t × (1 + B/10)⌉ each of Worm and Kernel code; from +3,
  t − 2 more **units** of each (a unit is 4 + B/3 code, what a point of bounty pays). Perks: **+1** a filter slot and +5%
  max Integrity, **+2** defrag 30% faster, **+3** a slot and +5%, **+4** fragments 25% slower, **+5** a slot and +5%,
  **+6** a slot. At +0 a raider from your strongest server is contested, at +2 blocked, +4 blocks a v2 raider, +5 a
  champion and +6 a full pack.
- **Fragmentation:** an invasion that gets past it cracks it, one block of 16 when contested, two on a breach; every 4
  fragmented blocks cost a level. Buying a tier leaves every block whole. **Defrag** (`defrag`): (3 + level) credits a
  block; 3 minutes running 2 levels weaker, then whole.
- **Effective level** (base + tier + filters + the **+N** chip − fragmentation − a running defrag) is what it blocks
  outright. The +N chip holds a Grid consortium's +2. The card reads **Vulnerable to lv N+** (amber if the worst would be
  contested, red if it would break through) or **Safe** only while it blocks everything that can reach it, grade and
  all. The Wall panel's ruler shows it in levels: teal blocked, amber contested, red through.

| Your wall against the invasion's strength | Result |
|---|---|
| 20% or more stronger | **Blocked**, quietly (a log line and a silent pager entry): half its bounty, 25% of a kill's XP, 1 component |
| Within ±20% | **Contested**: the wall wears the front virus down (4–20% a minute) while it chips you (0–1% of max Integrity a minute) |
| 20% or more weaker | **Breach**: it chips 1% of your max Integrity a minute until you deal with it |

**Filters** (`filters.mjs`): firewall gear rolled like protocols (Scrap, Stock, Tuned, Custom; an item level). Two
slots, plus one at tiers +1, +3, +5 and +6. Every filter adds levels (about 1 + item level / 10, more on better bases:
Packet, Stateful from 10, Deep from 25, Neural from 40). Tuned ones carry 1–2 more stats, Custom 3: +2–4 levels against
one family (Wormguard, Lockbreak, Exorcism), 15–40% less fragmentation, 20–50% faster defrag, 15–35% more grind or less
chip, and for home fights 2–5% Evasion, 10–25% Sanitize, 2–6 Block, a 4–10% opening shield, 2–5 Regen, 2–6 back on
every hit; Custom only: 2–5 of a family's code from every invader it stops (of Reflection), 15–30% slower invasions (of
Tar), invasions arriving 10–25% worn (of the Hive). About one vault in seven holds a `filter.flt` (Custom one time in
twelve, the only Custom source); LANTERN sells bootleg ones. **Put in**, **Take out**, **Scrap** (1–3 components) at home
(`filter equip|unequip|scrap <n>`). You hold 12 at most.

### Bounties, daemons and the streak

- **The bounty** is code of the invader's family, lots of it: each point pays a **unit** at the invasion's level (4 +
  level/3). It grows by a quarter of its base every minute it sits contested or breaching with you not on it, up to three
  times the base, and the growth is yours only if you kill it yourself; the wall wearing it down pays the base, a block
  half. The card shows the bounty now and the most it can grow to (*13 → 34*), and the chance of a daemon.
- **Jack in** (`jack in`, or the button): fight the invasion at the wall yourself, worn down as the wall left it, a full
  home kill, one fight a virus (a champion is a ★ CHAMPION fight: elite-grade, triple XP). Not from a run. A chip never
  ends a home fight (it stops at 1), and nothing chips while you fight.
- **Daemons** drop only from invasions, one roll per invasion stopped (`DAEMON_DROP`): **35%** your kill, **15%** the
  wall, a **capture** always; each stop without one adds 5%.
- **Streak:** invasions stopped in a row pay 10% more each, up to +50%. A crash or a scout's finished map ends it.
- **Captures** (a champion you kill): a sure daemon, and 10% (+5% a capture without one) at one of the
  **invasion-only uniques** (Tripwire, Honeynet, Sinkhole), one you lack first; a Listening Post works on them.

### Crash and Degraded mode

At 0 Integrity (a lost home fight, or a breach chipping you out) the server **crashes and reboots at half its max**,
then runs **Degraded** for 10 real minutes (the clock runs with the game closed; crashing again restarts it):

- your wall is down: an invasion still at the wall waits, and no new one sets out;
- **reboot sickness**: your max Signal and the damage you deal are lower, by the deepest floor you've reached: **20%**
  (floor 1), **40%**, **60%**, **75%**, **85%**, **90%**, **93%**, **95%** (Bedrock) (`CONFIG.rebootSick`). On a run,
  the run's max Signal drops at the crash and comes back with the server. It doesn't count inside your own occupied
  server. It shows as **−N%** beside your Signal, a *Reboot sickness* status in a fight, and on the Degraded tag.

You can still fight, explore and level, weaker. The top bar, the map and the Server page show the time left. An invasion
that crashes you leaves your wall afterwards; one you lost a fight to stays, as worn as you left it.

**While you're logged off** (played out a minute at a time when you come back, up to a day): invasions come every 2–4
hours (no scouts) and meet your wall as usual; a held hub's old owner at a quarter pace; in a consortium a member
sometimes stops one. A crash while away reboots for **2 hours** and the invasion **occupies** your server: HOME shows
**Connect**; clear its six rooms to come back at once. *Vulnerable to lv N+* is the check before you go.

### Daemons (daemons.mjs)

Small programs that fight beside you; **only invasions drop them**. Forty, eight to each band (lv 1–9, 7–18, 16–28,
26–40, 38–50); each is weak alone. An invasion drops one of its level's band (an earlier band's a quarter of the time)
**at its level**: its number grows 4% a level. You hold **one copy of each**: a higher one replaces yours, and the other
scraps for a unit of its family's code.

- **Slots:** 2, +1 at server level 15, 30 and 45; Operators +1. Choose them on the Loadout's **Daemons** tab: your
  **Party** (each slotted daemon with a bar of a fight's first 12 cycles lit where it acts), the **Bench**, and the
  **Roster** of all forty (unfound ones as silhouettes). `daemon list|slot|unslot|swap`.
- **How they act:** on top of your order. A cooldown daemon acts in a fight's first cycle, then every so many cycles; a
  triggered one when its moment comes. Shields and heals land at once; a hit when its step is over. **Daemons never set
  off daemons**, and none jacks you in or out.

*n* at its band's first and last level:

- **Band 1:** Sweeper (every 4): *n* to the soonest attacker (6–8). Mirror (every 3): *n* to the part you last
  attacked (7–9). Spider (every 5): burns the part you last attacked *n* a cycle for 3 (3). Mender (every 5): heals *n*
  (5–7). Fuzzer (every 6): breaks 1 ◆ on the most armored part, or *n* to the soonest attacker (5–7). Stall (every 7):
  delays the soonest attack a cycle and deals *n* to its part (3–4). Canary (below half, once): shields *n* (9–12).
  Snapshot (below half, once): heals *n*% of your max (5–7%).
- **Band 2:** Cron Job (every 3): *n* to the part winding up a tell, else the soonest attacker (6–8). Watchman (a big
  attack, once): it waits a cycle and its part takes *n* (7–10). Breakpoint (on an interrupt): that part takes *n*
  (10–13). Nudge (every 4): *n* to the part closest to its next tick (7–10). Drain (every 5): *n* to the soonest attacker,
  healing half (7–10). Kindle (every 4): *n* to every burning part (5–7). Airbag (fight start): shields *n* (12–17).
  Crowbar (a part's last ◆ breaks): it takes *n* (10–13).
- **Band 3:** Flare (every 6): Exposes the soonest attacker 2 cycles and deals *n* (8–10). Wiretap (an answered tell):
  shields *n* (16–21). Capacitor (every 5): shields *n* (8–10). Backscatter (your shield takes a hit, once a cycle): the
  attacker takes *n* (6–8). Drill (every 5): *n* through ◆ to the most armored part (10–12). Afterburn (a burn of yours
  ends): its part takes *n* (10–12). Lookout (a tell winds up): its part takes *n* (11–15). Checkpoint (below a quarter,
  once): heals *n* (22–29).
- **Band 4:** Leash (every 2, Exfils): the upload takes a cycle longer and it takes *n* (16–20). Sieve (every 3): *n* to
  every fragment (10–13). Ricochet (your crit, once a cycle): another part takes *n* (10–13). Spite (below half, once):
  the part that hit you takes *n* (32–41). Domino (a break): the soonest attacker takes *n* (18–23). Lightning Rod (a
  charge winds up): shields *n* (20–26). Overseer (every 2): *n* to the soonest attacker (6–8). Reaper (a part below a
  quarter): it takes *n* (16–20).
- **Band 5:** Broadcast (every 4): *n* to every part (7–9). Void (every 8): pushes the soonest attack back a full
  interval and deals *n* (15–18). Pendulum (you fire in a Sync Window): your target takes *n* (17–21). Sledge (every 6):
  breaks 1 ◆ on every armored part, *n* to the rest (10–12). Hot Spare (every 5): heals *n*, or shields at full (12–15).
  Lifeline (a killing blow, once): leaves you at 1 and heals *n* (25–30). Tandem (every 3): *n* to the soonest attacker
  and *n* to your last target (10–12). Guillotine (on an interrupt): every other part takes *n* (12–15).

**Testing** (`?dev`): `developer invade [raider|pack|pair|champion|scout|hoard|nest|hidden] [road]`, `developer frag
<n>`, `developer integrity <n>`, `developer daemon <id|all> [level]`, `developer wall <n>|off`, `developer crash`,
`developer reboot`.

**Switched off:** server memory (`MEMORY.on` false in memory.mjs): every server you find is on your network at once, with
no attaching, detaching or memory pips.

## Social

### People and #net

- **People** (presence.mjs) is simulated until there's a server (`?dev`: `online sim` turns on a pool of 20 hackers who
  log on and off; `online off`). The people button on the top bar (a dot and how many are online; violet when a friend
  is on) opens **Friends** and **Online**: handle, class and level, and where they are (SPRAWL-00 and its room; *on a
  run*, *at home* are private). `friend add|remove <handle>`, `friends`, `who`. SPRAWL-00 is shared: `ls` and arriving
  in a room say who else is there.
- **#net** (channel.mjs), the net talking to itself like WoW's General chat. Its latest line sits over the prompt; click
  it for the drawer. `say <text>` (or `'text`) posts, up to 120 characters; `channel off|on` mutes it. Every line comes
  from real game state: the director's events and how they end, faction contacts speaking for their side after a feud
  (never at you), your feats (a unique found, a title, every tenth level), and simulated hackers chatting from what
  they're doing and reacting to you. A line every 20–90 seconds of logged-on time; the last 80 stay on the save. It never
  touches the pager and rolls its own dice.

### Profile: finger (profile.mjs)

`finger` (or your handle on the top bar) shows your card; `finger <handle>` theirs. The card is a **NET ID badge**: an
amber NET ID strip; the **banner** (4 rows of 24) framed as its photo, the **handle** in teal, the **title** in amber and
the **plan** as a quiet quote; then **Classes**, **Gear** (your best pieces as glyphs), **Marks** (each faction you've
met, its tier as pips), **Stickers** and **Achievements** (your points and three pinned or latest); a bar code drawn
from the handle and when you've been on since. Explanations are tooltips.

- **Your editor:** **Banner** (12 presets, 6 more from achievements, or draw your own in plain characters; `banner
  <name>`), **Title** (one you've earned; `title <name>`, `title off`), **Plan** (60 characters; `plan <text>`).
- **Titles and stickers** are achievements' rewards (below), kept for good. Up to four stickers go on the monitor's
  casing.

### Achievements (achievements.mjs)

What you've done, kept for good, WoW style: **94 achievements, 1,740 points** (5, 10, 25 or 50 each) in eight
categories. Every cosmetic reward comes from one: titles, stickers, banners, casing colourways, window districts, desk
props, boots, prompts and cursors. None changes a number.

- **Checked cheaply:** every second, only the ones not yet earned, each a look at state the game already keeps; what
  only a fight knows is noted as the fight ends. A loss counts for nothing. Nothing is time-limited or missable.
- **Earning one** is a quiet pager line and a #net line naming it (and the title it brings). No new sound.
- **The page:** System → **Achievements** (`achievements`): the categories down the left with their bars, *Summary*
  first; each achievement's points on a medal, its bar while under way, what it brings shown as itself, and once earned
  the date and **Pin** (up to three on your card; `achieve pin|unpin <name>`). Its rule is its tooltip. Three are
  **hidden** (*???* and a hint).
- An older save gets what it has already done on load, quietly, in one pager line.

| Category | Achievements (points): deed → reward |
|---|---|
| Combat (17) | Process Killer (10): win 100 fights → casing Beige box. Long Uptime (10): win a fight of 20+ cycles → title *the Patient*, boot POST, desk prop Coffee mug. Big Game (10): beat 25 ◆ CREW elites. Uncrowned (10): beat RELAY-KING → *Uncrowner*. Repossessed (10): beat REPO MAN → *Repossessor*. Dead Air (25, hidden): silence the HOLLOW CHOIR → *of the Last Note*. Every Crown (25): beat RELAY-KING, REPO MAN and the farm's three → banner Crown, window Tar Beach. **Lairs:** Lair-born (10): beat a lair boss → *Lair-born*; then 10 each for each of the nine lair bosses → its sticker |
| Exploration (13) | Cartographer (5): Map a server → cursor Underline. Mapper (25): Map 20 → *Mapper*, window The Stacks. Change of Hands (10), Landlord (25): take over 1 / 10 servers. Five Points (10): find every hub → desk prop Keycard. Loose Ends (10): finish 5 threads. **Floors:** reach floors 2 to 8 → stickers F2–F8 (Down the Line also window Backhaul; Core Sample, floor 5, *Deepwalker*; Rock Bottom, floor 8, 50 points and casing Matte black) |
| Collection (26) | Full Page (10): fill an entry in the collection log → *the Thorough*. Family Album (25): Ransomware's, Worm's or Ghostroot's → sticker. Floor Plan (25): a floor's → sticker. Gold Star (5): find a unique. Collector (25): find 25 → *Collector*, desk prop Floppy stack. Curator (50): find 100 → banner Vault door. Assembled (10): assemble a faction piece → *the Assembler*. Five of a Kind (50): all five. Matched (10): complete a set → *the Matched*, prompt Titled. **Sets:** complete each general set → its sticker (10; Mesh, Deep Archive and Bedrock 25) |
| Factions (9) | Reach each faction's top tier (25 each) → *of Halcyon* (and so on), its sticker, its casing colourway, its boot and the Root prompt (On the Signal also window Coldline). Courier's Bane (10): intercept 10 couriers. Tracker (10): collect 5 bounty hunts. Feudbreaker (25): win 5 feuds. On Retainer (10): deliver 25 contracts |
| Classes (14) | Specialist (5): pick a subclass → prompt Two-line. Polyglot (25): all four classes to 10. Each class to 50 (50 each) → *the Hammer*, *the Wall*, *the Quiet*, *the Conductor*. **Mastery:** Second Nature (10): an ability at Mastery 3 → sticker Mastery 3; Muscle Memory (25): five → *the Virtuoso*; First Principles (25): Bash, Ban, Poke and Ping → banner Key one; Full Repertoire (50): key 1, the core and a whole subclass line → sticker Repertoire. **Tier sets:** complete each (25) → its sticker |
| Daemons (5) | Process Table (10): find 10 → cursor Beam. Pandemonium (50): find all → banner Pandemonium. Full House (10): slot 4 at once. Background Process (10): daemons act 500 times. Unattended (10): win a fight in which they act 10 times |
| Co-op (5) | Party Line (5), Full Stack (10): win with a crewmate / a crew of 3 beside you. Drop-in (10): win a fight a consortium member dropped into. Farmhand (25): beat the farm's three → *Farmhand*. On the Grid (25): a consortium of 12 servers → banner The grid |
| Feats (8) | Untouchable (10): win 8+ cycles without damage → casing Smoked, desk prop Cactus. Short Circuit (10): interrupt 3 moves in a fight → prompt Arrow. Open Book (25): read every tell in a fight of 4+. Chain Reaction (25, hidden): break every part of a 3+ part virus in one cycle → sticker Chain. Zero Exceptions (25): win with a routine of yours that never threw → sticker 0 exceptions, prompt Lambda, desk prop Rubber duck. Lone Wolf (25): beat a ◆ CREW elite solo → sticker Solo. No Rest (25): Map a server on a visit you never rest → boot Minimal. By a Thread (10, hidden): win under 5% health → sticker <5%, boot Corrupted, desk prop Lucky die |

`developer achieve <id|all|reset>` (developer mode).

### Consortium (consortium.mjs)

Hackers who merged their servers (simulated members for now). Everyone keeps their own home server; merging runs a
**trunk line** between them, so every member can reach every member's servers.

- **Joining.** `consortium create <name>`, `consortium invite <handle>`; while you're in none someone now and then
  invites you (`consortium accept|decline`; invites lapse after 10 minutes). Only the founder kicks. `consortium leave`
  cuts the line; you lose nothing of your own.
- **The map** gets a consortium view: your home in the middle, a trunk line to each member's home, their servers
  branching off. Each member's network has its own signature and lair.
- **Members' servers:** connect like your own; fights, files and drops are yours. A member's vault doesn't take the
  server over. Their caches come back 20 minutes after your last run there.
- **Shared ground:** members online spend time on shared servers and join a fight in a room they're in (up to three
  alongside you, counting your crew), each with their own loot. **A drop-in's XP is by damage:** a member takes the
  share of the kill's XP matching the share of its health they took off.
- **The Consortium page** (a top tab while you're in one): **Needs you** (a card per alert, one button each), the
  members, the size ladder, and how your wall fares while you're away.
- Raids on members' walls stay off until real players share a network.

| Servers merged | Tier | Bonus |
|---|---|---|
| 3 | Linked | +10% components on members' servers |
| 5 | Mesh | Invasion bounties doubled |
| 8 | Backbone | A trunk rogue server (a Pit at your level) opens |
| 12 | Grid | +1 socket room on every server, firewall +2 levels |

### Co-op, simulated (crew.mjs)

Crews of up to three come from friends and consortium members (`crew invite <name>`; `crew kick <name>`), or, in
developer mode, `crew sim <classes>` adds bot crewmates from level 5 (`crew`, `crew off`). Home fights stay solo.

- **A crewmate** plays its class at its own level with its own Signal, carried fight to fight through a run; one that
  went down comes back at 25% for the next fight. The same planner the balance scripts use plays it.
- **On a run** crewmates start **linked** (they follow you). The crew column shows each one's Signal, how it moves
  (*with you*, *leading*, *solo*) and its controls: **Unlink** (`split <name|all>`: it wanders rooms nothing holds),
  **Go to** (`goto`), **Link** (`link`: you follow it), **Regroup**. Only crewmates in the fight's room fight it.
- **Each cycle** everyone acts (you, then the crew), then the virus. Commands go by what they do: armor strippers
  first, then debuffs, then damage (ties: you first); `last` sends yours to the back. Turns play out one at a time on
  screen. Statuses are shared.
- **A damage attack lands on everyone**, each in full (its chip says → all); encryption, scrambles and fragments stay
  on you. **Threat:** a Bastion's Firewall in a crew draws every attack for 3 cycles (→ nyx). **Healer:** `patch <name>`
  heals a crewmate.
- **MMO, not ARPG:** a normal virus gets +50% Integrity a player (`CREW.hpPer`), a boss +80%, an elite +5%; its hits
  stay their solo size. **Kill XP is split**, plus 10% a player (`PARTY_XP`: a pair 55% each, a four 32.5%). Drops
  stay personal; rewards are yours.
- **◆ CREW elites** (a third of a Pit's rooms, and the trunk server, and every elite room): ×1.5 Integrity, ×0.7
  damage, one more ◆ and a clash (`ELITE`; Fights), only +5% a player. A champion, a feud and the farm's packs size
  their own Integrity, keep ×1.3 damage and roll no clash. Three times the XP, three drop rolls, never less than a blue, 8% a
  unique. Never in the way of anything you need.
- A crewmate at 0 Signal is down for the fight; you going down ends it. Their hits stay quiet: the sounds are yours.

### Co-op, peer to peer (coop.mjs)

Two players, two saves, no server; developer mode while it's a prototype (docs/coop.md).

- **Starting:** `coop` (or *Open Co-op* on the System page). *Host* shows a room code for a tab in the same browser;
  for another machine, invite and reply codes are pasted across. `coop host`, `coop join <code>`, `coop leave`.
- **Who runs what:** the host's game runs the world (their network, run and fights); the guest's sends its character
  (class, level, bar, talents, gear, daemons, routines, research) and commands. Nothing else crosses; the handle is the
  only name. The guest fights as the host's crewmate, so the crew rules hold. The guest's own home and mail stay theirs.
- **Cycles** turn when everyone has a command in, or the timer runs out. Only the host can jack out, pause or change
  speed. **Rooms:** the host leads; a cache the host takes pays the guest a share rolled on the guest's dice.
- **Go to <guest>'s network** (`coop swap`, out of a run) hands hosting over on the same link.
- **Rewards:** each player's game pays them on their own save. A guest who drops is played by the planner to the end of
  that fight; a host who drops sends the guest home.

## The screen

How it looks is docs/ui.md; these are the rules the player meets.

### No explanations on screen

Screens carry names, numbers and state, never how-to text. Rules live in **hovers** (every stat, tag, skill, talent,
mutation and wall band shows its rule, in WoW's tooltip grammar) and in **first-time tips**: the first time something
is on screen, a small tip points at it and says how it works, once, one at a time. Your first fight is one tip you step
through (the timeline, your skills, the interrupt's ticks, armor, the Sync Window). Tips in a fight pause it. **Turn
tips off** on any tip or the System page; **Replay tips** shows them again. Your first server's room map gets a short
**rooms tour**, a step at a time (walk, engage, jack out; a cache, the hunter, the rest room and SCAN as you meet them).
The log and terminal still say what happened, in a line; they don't teach.

### The pager

On the top bar: a lamp, then one icon per thing you can act on (`pager.mjs`). A **page** is a line you can act on (a
threat, a world event, a contract ready, an offer, a letter, a thread, wick's lead, an invite); everything else is
**news** (pay, the retainer, standing, restocks, finds, a blocked invasion, titles), gone 10 minutes after it came in.
A page stays while it's true, an hour at most; the same news again replaces the old line.

- **The tray:** one icon per waiting page, most urgent first (threats, then events by time left, then a ready contract,
  letters, offers), amber, red for a threat; up to four on a desktop, three on a phone, then **+n**. **One tap** does
  the page's thing (**Deliver**, **Read**, **Jack in**, **Show**…); mid-fight or on a run, anything that would start a
  fight shows you where it is instead. A page that takes on a task (an offer, a world event's fight) shows its quest
  first, in the quest window's look, with **Take** (or **Intercept**, **Hunt**…) and **Cancel**.
- **The lamp:** dark with nothing to do, lit while pages wait, blinking while one is new, red for a threat; click it for
  **Comms** (the pages, then the news folded under **News**, then the director's **History**).
- **Sound:** only a new page chirps; mid-fight only a breach. A breach also flashes the Integrity meter with BREACH.

### Settings

On the System page: **speed** (relaxed 12 s, normal 8 s, fast 5 s a cycle), **sound** with four sliders (Music,
Ambience, Places, Effects), **motion**, **vibration** (on phones that have it), **Screen effects**, **UI scale** and the
casing's options. Nothing plays before your first click or key.

- **Sound** is recorded CC0 samples and a little synthesis in an old-hardware palette (`dist/sfx/CREDITS.md`), with a
  quiet room tone under it. **Places:** each floor and hub has its own quiet loop, and each virus family a sound under
  its fights, adding its attack and break sounds.
- **Music:** a track on your server and another on a run. Each virus family's fights have their own theme (dark,
  gritty industrial synthwave, synthesized live): it fades in as the fight starts, builds as the virus breaks, and fades
  back to the track when the fight is over. It plays a little under the track, on the Music slider.
- **UI scale** (System → Settings, `ui scale <auto|80–200>`, 100% by default) draws the whole screen larger or smaller;
  it grows only while the screen stays 1700px wide in its own pixels. **Auto** sizes it to 1800px.
- **On a phone** (under 480 px) the board shows Now, +1 and +2 and the tray is three wide: tap a skill to pick it, tap
  again to fire. Only a tap on the prompt itself opens the keyboard.

### Screen effects

Light on the glass around the game, never on it: effects live in the backdrop behind the panels, on the screen's edge,
in the casing's lamps or across the virus picture; text, numbers, bars and the board never move, and nothing covers a
control. One setting, **off / subtle / medium (default) / bold** (`screen fx`), with each effect switchable on its own
(`screen fx <signal|hits|crits|floor|lamps> on|off`).

| Effect | Subtle | Medium | Bold |
|---|---|---|---|
| Low Signal (under a quarter) | a thin red edge burning into grey haze, still | the same, breathing, light static | stronger static, a quicker breath |
| Under half your health | — | a faint warm line at the edge | a stronger one |
| A big hit on you | a short tear across the backdrop | a brief tear | a longer, doubled tear |
| Your crit on a part | a short tear across the virus picture | a little longer | longer |
| Floor colour | the floor's palette and a still texture | the palette tinting the panels, the texture moving | tinted more |
| The fight board | numbers, bars and the strike | the same | impact bursts, sparks and flashes too |

Each floor has its own palette and texture (The Sprawl warm amber and neon haze, Backhaul sodium orange, The Stacks
dusty green, Coldline ice, Deep Core magenta, Kernel Space white on black, The Sink deep red, Bedrock near-monochrome);
the job colours never change. **Off** shows numbers and bars only. Motion off or reduced motion: no tears, nothing
moves.

**A new fight boots in.** The first time you see a fight, the screen goes dark and the virus comes up first, alone
at the centre, before dropping into its panel; a boot console checks your system and your panels come up. About two
seconds; any key or click ends it (and still acts). Leaving a won fight, the page folds to a teal line like a tube
switching channel and the map opens back out of it, your room ringing. Connecting to a server dials it: its node locks
teal and pings, the screen dims into black, its name decodes over a dial readout and flies into the server strip, and
the rooms switch on outward from the entry (about two seconds; a first run's XP waits for it). **Jacking out** hangs
up: your room locks teal and the rooms go dark toward it, the hang-up's readout holds the dark, then the map comes up
with the server's node ringed (under two seconds; the Banked card waits for it). None of them flashes or blinks: a
panel only brightens or only dims, and your chrome dims rather than going out. Screen effects off or Motion off:
straight in and out.

### The monitor casing

With the immersive shell on a desktop-sized window, the screen sits in a dark monitor (BLACKBOX · MODEL 7) whose bottom
bezel has two knobs (sound, speed) and lamps that show real state: **PWR** (red while Degraded), **GATE** (an invader
at your wall), **WALL** (contested, a breach), **NET** (teal on a run; amber while a world event is up), **INST** (a
market transfer on its way), **DMN** (a daemon slotted; bright when one fires). System → Settings → Casing turns it off;
phones never show it.

**The window behind it** (window.mjs; System → Settings → Window, on by default, at 1700px and wider): the strips beside
and above the monitor look out through grimy glass onto the city, its sky following your clock and its weather turning
every five minutes (`weather <…>` holds one). **Districts:** The Sprawl (always yours), Backhaul (*Down the Line*), The
Stacks (*Mapper*), Coldline (*On the Signal*) and Tar Beach (*Every Crown*); `district <name>`.

**Casing cosmetics** (System → **Casing**), each an achievement's reward, only ever the casing: a **colourway** (Stock
and eight more; `casing color <name>`), the **nameplate** (stock, a title you hold, or 16 characters of your own;
`casing plate …`), four **stickers** on the chin (`casing sticker <1-4> <sticker>|off`) and two **desk props** (`casing
prop <1-2> <prop>|off`).

### The terminal

How the screen boots, what the prompt says and how the cursor looks (terminal.mjs; System → **Terminal**). Cosmetic, each
an achievement's reward; the stock look is the default and nothing changes how the command line takes what you type.

- **Boot** (after the power-up, skippable): **Stock** (your server read back to you, then the login), **POST** (a BIOS
  memory count and devices answering `[ OK ]`), a **faction's** (its ASCII mark and a line in its voice), **Corrupted**
  (lines arriving garbled and settling once), **Minimal** (*<handle>@blackbox ready*). `terminal preview [boot]` plays
  yours.
- **Prompt** (home only, always one line high): Stock `dana@blackbox:~$`, **Root** `root@glassjaw#` (your best faction
  at its top tier), **Titled** `dana@matched:~$`, **Arrow** `>`, **Lambda** `λ`, **Two-line** (`.-[dana]-[breaker
  12]-[~]` over `'-$`).
- **Cursor:** **Block**, **Underline** or **Beam**, and **Blink** on or off for everyone. `terminal boot|prompt|cursor
  <look>`, `terminal blink on|off`.

## Developer tools

Developer commands work only in tests, playtest pages, a test bench and with `?dev` in the address.

- **Test bench** (`bench.mjs`): `/?bench=<name>` is a save of its own (`blackbox-bench-<name>`) that never touches the
  real one. `bench <subclass|class> <level>` makes a ready character (talents, blue gear with its subclass's stats, its
  rotation, floors reached); `bench list`, `bench delete <name>`. A **BENCH** tag sits on the top bar, and a **Dev**
  drawer over the prompt holds buttons that type the common developer commands.
- **The Arena** (`arena.mjs`, the Dev drawer; `?bench=arena` opens on it): every fightable thing, read from the data
  tables and grouped by kind (families, strains by wave and mutated, ICE, parts and .exe builds, elites by clash,
  Residents, solo, lair and crew bosses, floor holders, rivals' fights, invaders), with its level. Fight types
  `developer fight <kind>:<id> [level] [seed] [leaning=…] [objective=…]`: a home fight, at the level it opens if
  empty (never under yours; a part's at its own, a rival's one over you). A rival's later fights bring its counter, read
  from your win in the one before. **Again** (`developer fight again`) restarts the last pick; ♥ refills first.
- **Playtest pages:** `?playtest=rooms` (a throwaway server of rooms, its clocks ten times as fast), `?playtest=<strain
  or fixture>`, `?playtest=part:<id>` (`part:<id>.exe` for its .exe build), `?playtest=fx` (every ability effect, tier and break finisher, fired from its key).
- `developer scene <id>` plays a transmission again. `developer levelup preview`, `developer thread preview`, `developer pager fill`, `developer parts`, `developer
  event`, `developer exfil`, and the rest under each section.

## Side modes

**The breach campaign** (`?campaign=breach`, unlinked from the map) is a roguelite of breaches with its own save
(`blackbox-campaign-v1`): the main game's save and systems never touch it. You log in, pick a class at level 1 and breach
14 servers in 4 layers (The Sprawl 1–5, Backhaul 6–11, The Stacks 12–17, Deep Core 18–25), each a branching map of up to
three acts (five rows each, a gate after acts 1 and 2) ending at its Resident. **Signal** is the breach's health and
carries fight to fight; only a defrag, a broker's patch or a script restores it. **Trace** (0–100) is how loud you've
been: at 55 a hunter ICE comes for you. **Scripts** are one-shot exploits you carry (3 slots). Vaults take keycards;
switches weaken an act's gate; every subsystem you clear lets you pick a **rewrite** whose output runs on later
breaches once you capture the server. Gear, scripts and XP bank at gates and on capture; a gate you beat is a
checkpoint. **Heat 1–8** adds a modifier a rank and pays more. **LOWLIGHT's room** (`world.mjs`, `room.mjs`) is where
you come back after each breach: wick has a line about it, the board lists what moved, and from your second capture a
**world turn** runs after every breach (an author digs in on its nearest open server, dead drops appear, never on a
clock). `?playtest=breach` plays one breach with a throwaway character. Code: `breach.mjs`, `campaign.mjs`,
`scripts.mjs`, `rewrites.mjs`, `heat.mjs`, `world.mjs`; bots `breachsim.mjs`, `campaignsim.mjs`.

## Balance targets

Checked by `node balance.mjs` (docs/BALANCE.md, `balance.test.mjs`), `farmsim.mjs` and the pacing bot (`pacing.mjs`,
`loop.test.mjs`). These are scripted policies; only people can tell whether it's fun and readable in five seconds.

- **Friction:** a fight at your level costs a good player 35–50% of their Signal, and one two levels up can beat you.
  On your Signal (runs) enemies have ×1.4 Integrity and ×2.1 damage (`CONFIG.runHp`, `runDamage`), with an early step
  by enemy level (`runEarly`) and a late one from level 10 (`runLate`, `runLateHp`); bosses, elites and encryption skip
  the steps. Targets by gear (friction.mjs): nothing equipped 60–75% lost, whites 40–50%, blues 35–45%, yellows 20–30%.
- **Classes:** every class wins at least 85% of fights at its level and loses less than plain Spiking; every subclass
  at 10, 18 and 30 wins at least 85% (the Sysop 70%) and loses 25–50%, all eight within 30 points; the hard slice is
  beatable (55%, the Sysop 45%) but risky. A target band of 35–45% lost at 10, 18 and 30 is a `todo` test.
- **Tells:** a bot that ignores them loses 15–22 points more Signal a fight, at least 8 at each level.
- **Crews:** at 18 a full crew of four wins at least 95% of the farm's boss tries; without its tank the Foreman wins at
  least half the tries, without its healer the Heatsink 40%, without SIGINT the Foreman 70%, with one damage dealer the
  Coldwallet 70%.
- **Pacing** (`todo` until the designer has played contract XP): real hours to levels 5, 10, 20, 30 within 15% of the
  table; grey fights under 20% from 10 to 20; strains and ICE at least 15% of fights from 12; XP by source: kills 25–45%,
  deeds 7% or more, contracts 45–70%; playing only SPRAWL-00 is the slow road (1.25× to level 8).
- **Loot:** a blue about every 85 kills, a yellow every 500, uniques under one an hour (`node lootsim.mjs`).

## Fair play

- **A paused fight holds no clock.** Timers on invasions wait while you fight them, but only while the fight runs; a
  paused fight, or one left open over a reload (it comes back paused), holds nothing.
- **Away is played out**, a minute at a time, up to a day: invasions every 2–4 hours, each meeting your firewall. What
  protects you is your network's base, the margin you bought and your filters. Programs make nothing on their own, so
  nothing raids them.
- **No store-to-market loop.** Hubs sell code and Exploits only as market wares and never sell components; the store
  never sells code for less than 10% over the best hub's price; a round trip at one hub never profits.
- **A held hub earns by outside factors only:** its condition, the world event and wiped hubs elsewhere.
- **The game saves when the tab closes**, and every roll comes from the save's seed: reloading replays the same result.

## Saves

The save is `SAVE_VERSION` 53 (combat.mjs). An older save is migrated on load, each step keyed on the field it converts,
so it is safe to run twice; nothing a save held is lost.

- **v53** the cryptogram's key, `s.cipher`, made on first use (`cipherOf`).
- **v52** rivals' memory, `s.rivals`, made on first use (`rivalsRestore`).
- **v51** the scanner's log, `s.scanner`, made on first use (`scannerOf`).
- **v50** site traits become specials: Rich, Legacy, Backbone, Hostile and Hardened keep their names, a traced server
  with none rolls its own, a Stable server gets its rest room and a Backbone one its socket (`specialsRestore`).
- **v49** crafting goes: recipes, plans and their files become credits (a letter from wick lists them), banked Zero-day
  source the Zero-day (`craftRestore`).
- **v48** unspent Indemnity becomes credits once, with a letter from Halcyon (`indemnityRestore`).
- **v47** a pile of named salvage becomes the components count (`componentsRestore`).
- **v46** a class past level 10 with no subclass picked plays its core, the breakout due (`subRestore`).
- **v45** sets: loaded protocols stamped, the Badge's beat armed (`setsRestore`). **v44** whole-number stats
  (`statsRestore`). **v43** threads. **v42** the long climb keeps your share of a level (`climbRestore`). **v41** layers
  become floors (`floorsRestore`). **v40** outposts, buildings, services and plans pay back, plans become codebases
  (`retireOutposts`). **v39** every server becomes a room graph (`roomsRestore`).
- Older steps (networks, presets, the nine-key bar, daemons' levels, signatures, harden.sh) turn what they retired into
  credits, code or their replacement. Signal boosters you still carry work with `boost`.
- Fields added without a version (`s.profile`, `s.channel`, `s.achievements`, `s.mastery`, `s.cosmetics`, `s.research`,
  `s.dex`) start empty with defaults; an older save earns the achievements it already did.

