# Invasions: the review sheet

Invasions were good on paper and tedious to play against: one every 6–10 minutes, nearly always one easy virus from the same three families, paying a normal home kill, with defrag, upgrade, harden and filters as chores between them. This sheet covers the rework: fewer and bigger invasions, kinds that do something besides chip, and a firewall that keeps up with your network by itself; and its second pass: signatures cut, invasions paying lots of code, and the daemons (forty, weaker, only from invasions, an item level each). The rules live in GAME_RULES.md under *Invasions and the wall* and *Daemons*; the code is `dist/invasion.mjs`, `dist/firewall.mjs` and `dist/daemons.mjs`.

## Pacing

| | Before | After |
|---|---|---|
| Online | one every 6–10 min after the last | one every **20–30 min** after the last |
| First one | 3 min after your first find | 3 min after your first find, always a plain raider |
| Open ports | 2.5× as often (2.4–4 min), +50% rewards | 2.5× as often (**8–12 min**), +50% rewards (the code bounty too) |
| Away | one every 2–4 h | one every 2–4 h, never a thief or a scout (you couldn't answer them) |
| A weak one | an alert, a notice, a sound, a pager beep, then a block | **silent**: a log line and a pager entry with no beep, no notice, no sound |
| A crash | the invader stayed and chipped you again after every reboot | an invasion that chips you to a crash **leaves**: one crash, not a loop |

Only an invasion your wall will contest, or that will break through, asks for your attention. When one sets out, the departure line already says *Your wall will stop it* or names what it does.

## The kinds

Rolled by weight when it sets out, from what the sending server's level allows and what you have for it to go after. The same special kind twice in a row is rarer (it rerolls once). Half the time your strongest attached server sends it.

| Kind | Weight | Needs | Warning on its card | Your answer | If you miss it | Bounty |
|---|---|---|---|---|---|---|
| **Raider** | 30 | server lv 1 | none | your wall, or jack in | chip | 2 |
| **Pack** | 16 | server lv 3 | *A pack of 3. It counts 4 levels higher at your wall until it thins out.* | jack in once per virus; the next steps up | chip until it thins | 3 (1 a virus) |
| **Pair** | 12 | server lv 4, 2+ servers attached | *X and Y came together. The pair counts 2 levels higher at your wall until one of them falls.* | two fights; a family filter only covers one | chip | 3 |
| **Champion** | 12 | server lv 8 | *A champion, built like an elite. It counts 2 levels higher at your wall and leaves a daemon when you kill it.* | jack in, or harden.sh to turn it away | chip | 5 and a capture |
| **Saboteur** | 10 | server lv 4, a service running | *If it gets past your wall, it shuts off your Edge Router until you kill it.* | a wall that stops it, or kill it | that service off while it stays; no installs | 3 |
| **Thief** | 10 | server lv 3, an outpost with 3+ stored, online | *It is after the stores on X. Intercept it on the way, or it takes half of what is stored there.* | `intercept` on its 8-minute road (the outpost's firewall may stop it too) | half of each stock on that outpost | 3 |
| **Scout** | 10 | server lv 2, online | *It is mapping your wall. Kill it in the next 5 min, or the next invasion counts 3 levels higher.* | jack in within 5 minutes; a wall 3 levels clear of its server swats it quietly | the next invasion counts +3 at your wall | 2 |

**Quirks** ride on raiders, packs and champions three times in ten, from the sending server's family:

| Quirk | At your wall | Bounty |
|---|---|---|
| Hoard (ransomware) | Armored | ×1.5 |
| Nest (worm) | a brood: one more virus, two levels under, behind it | +1 |
| Hidden (ghostroot) | counts 2 levels higher | as its kind |

**Sizes.** A champion is elite-grade (elite armor, elite hits, the `elite` flag, so whatever answers elites in a fight answers it) a level over its server and 1.5× a normal virus's Integrity (a crew elite is 5.2×). The scripted planner in blues loses 25–50% of the server's health to one at levels 10–18 and wins 10–12 of 12; at level 6 it was much worse, which is why champions start at server level 8. A pack is three normal fights. A scout is two levels under its server.

**Missing one is modest and recoverable.** The worst outcomes are a crash (10 minutes Degraded, then the invasion is gone), half an outpost's store (it refills), a service off until you deal with the saboteur, or one invasion three levels tougher. Each also ends your streak, except the saboteur.

## Rewards

*Second pass (daemons rework):* signatures are cut. Invasions pay **code**, lots of it, and they are the only thing that drops **daemons** (next section). The first pass's signature numbers are kept in the decisions below for reference.

**The bounty is code** of the invading family's kind (Cipher from ransomware, Worm from worms, Kernel from ghostroots). Each kind keeps its bounty in points (the kinds table), and each point pays a **unit** of code at the invasion's level: `codeUnit(L) = 4 + ⌊L/3⌋` (5 at level 3, 7 at 10, 10 at 20, 14 at 30, 20 at 50). A raider at level 10 is 14 code for your kill, about a vault's payload; a champion 35, and up to three times that if you let it sit.

| Source | Code |
|---|---|
| Your kill (jack in, intercept) | the bounty, plus what it grew |
| The wall wears it down | the base bounty |
| The wall blocks it outright | half the base, rounded up |
| Open ports | ×1.5 |
| Streak | +10% per invasion already in the streak, up to +50% |

**The growing bounty.** Unchanged: while an invasion sits contested or breaching at your wall and you're not on it, its bounty grows by a quarter of its base every minute, up to three times the base, and only your kill collects the growth. The card shows both numbers (*14 → 42*), and now the chance of a daemon beside them.

**Where the code goes: the wall.** Its prices count in the same units, at the wall's base, so the wall stays the sink for what invasions pay.

| Sink | Before (signatures) | Now (code) |
|---|---|---|
| Firewall tier +3 / +4 / +5 / +6 | 3 / 6 / 9 / 12 | its old price, plus 1 / 2 / 3 / 4 units of **each** of Cipher, Worm and Kernel (3, 6, 9, 12 units in all, the old signature counts) |
| Writing a harden.sh when you hold none | 6 | 2 units of each of the three (6 units) |
| Crafting a filter | 3 | its old price, plus a unit of each of the three at your level |

On a base of 18 (unit 10) the four upper tiers take 300 code more than before, on top of the 290-odd code the six tiers already took.

**The streak.** Invasions stopped in a row, by your wall or by you. It pays more per stop (above) and every fifth stop in a row leaves a **capture**. A crash, a theft or a finished scout map ends it.

**Captures** come from champions you kill and from every fifth stop in a row. A capture is now a **sure daemon** (at the invasion's level, from its band), plus the old roll for one of the three **invasion-only uniques** (Tripwire, Honeynet, Sinkhole: 20% a capture and 10% more for every capture without one, back to 20% when one drops; one you don't have comes first; a Listening Post helps). Captures no longer give protocols or filters: **Custom filters come from vaults** now (a vault's `filter.flt` is Custom one time in twelve), with their rare stats (Tar, Hive, Reflection).

**Old saves.** Signatures you held become code: a unit at your wall's base for each, split evenly over Cipher, Worm and Kernel (ten signatures on a base of 12 is 27 of each).

**How much** (the level bot, bot.mjs, 4 classes × 5 seeds to level 20; it never spends on the wall and never slots daemons): code banked by level 20 went from 533 (signatures 17–42 on the side) to **673** on average, about 140 more, the invasions' share. It found **1 to 5 daemons** by level 20 (2.6 on average; the versioned ones it found were 0 to 3). Climb times: level 10 at 186 minutes (182 before), level 20 at 552 (527 before), inside the run-to-run spread (298–746 minutes to level 20): the bot fights the same, and only the dice moved.

## Daemons

*The designer's call:* many more daemons, each weaker; only invasions drop them; an item level instead of versions; more slots. The rules live in GAME_RULES.md *Daemons*; the code is `dist/daemons.mjs` and `DAEMONS` in `dist/data.mjs`.

**Forty daemons, eight to a level band** (the layers' `BANDS`). The old ten are the first bands at about 60% of their numbers. Each line is its tooltip; *n* is its number at its item level, which grows 4% a level like a protocol's stats (the table gives it at its band's first and last level). A cooldown daemon acts right after your order; a triggered one when its moment comes. Shields and heals land at once; a triggered hit lands when the step it came in is over (never inside another hit), and daemons never set off daemons.

| Daemon | What it does | When | *n* |
|---|---|---|---|
| **Band 1** (lv 1–9) | | | |
| Sweeper | Deals *n* damage to the part whose attack lands soonest. | Every 4 cycles | 6 at lv 1, 8 at 9 |
| Mirror | Deals *n* damage to the part you last attacked. | Every 3 cycles | 7 at lv 1, 9 at 9 |
| Spider | Burns the part you last attacked for *n* a cycle for 3 cycles. | Every 5 cycles | 3 at lv 1, 3 at 9 |
| Mender | Heals you for *n*. | Every 5 cycles | 5 at lv 1, 7 at 9 |
| Fuzzer | Breaks 1 ◆ on the most armored part. With no ◆ left, deals *n* to the soonest attacker. | Every 6 cycles | 5 at lv 1, 7 at 9 |
| Stall | Delays the attack that lands soonest by 1 cycle, and deals *n* to its part. | Every 7 cycles | 3 at lv 1, 4 at 9 |
| Canary | The first time you drop below half health, shields you for *n*. | Below half · once a fight | 9 at lv 1, 12 at 9 |
| Snapshot | The first time you drop below half health, heals you for *n*% of your max. | Below half · once a fight | 5% at lv 1, 7% at 9 |
| **Band 2** (lv 7–18) | | | |
| Cron Job | Deals *n* damage to the part winding up a tell, or else to the soonest attacker. | Every 3 cycles | 6 at lv 7, 8 at 18 |
| Watchman | The first big attack about to land waits 1 cycle, and its part takes *n*. | On a big attack · once a fight | 7 at lv 7, 10 at 18 |
| Breakpoint | When you interrupt a move, that part takes *n*. | On an interrupt | 10 at lv 7, 13 at 18 |
| Nudge | Deals *n* damage to the part closest to its next tick. | Every 4 cycles | 7 at lv 7, 10 at 18 |
| Drain | Deals *n* damage to the soonest attacker and heals you for half that. | Every 5 cycles | 7 at lv 7, 10 at 18 |
| Kindle | Deals *n* damage to every burning part. | Every 4 cycles | 5 at lv 7, 7 at 18 |
| Airbag | Shields you for *n* as the fight starts. | As a fight starts | 12 at lv 7, 17 at 18 |
| Crowbar | When a part's last ◆ breaks, it takes *n*. | On a stripped part | 10 at lv 7, 13 at 18 |
| **Band 3** (lv 16–28) | | | |
| Flare | Exposes the soonest attacker for 2 cycles and deals *n* damage to it. | Every 6 cycles | 8 at lv 16, 10 at 28 |
| Wiretap | When you answer a tell, shields you for *n*. | On an answered tell | 16 at lv 16, 21 at 28 |
| Capacitor | Shields you for *n*. | Every 5 cycles | 8 at lv 16, 10 at 28 |
| Backscatter | When your shield takes a hit, the attacker takes *n*. Once a cycle. | On a shield hit | 6 at lv 16, 8 at 28 |
| Drill | Deals *n* damage to the most armored part, through its ◆. | Every 5 cycles | 10 at lv 16, 12 at 28 |
| Afterburn | When one of your burns runs out, its part takes *n*. | On a burn ending | 10 at lv 16, 12 at 28 |
| Lookout | When a part starts winding up a tell, it takes *n*. | On a tell | 11 at lv 16, 15 at 28 |
| Checkpoint | The first time you drop below a quarter of your health, heals you for *n*. | Below a quarter · once a fight | 22 at lv 16, 29 at 28 |
| **Band 4** (lv 26–40) | | | |
| Leash | An Exfil's upload takes 1 cycle longer, and it takes *n* every 2 cycles. | Every 2 cycles | 16 at lv 26, 20 at 40 |
| Sieve | Deals *n* damage to every fragment. | Every 3 cycles | 10 at lv 26, 13 at 40 |
| Ricochet | When you land a critical strike, another part takes *n*. Once a cycle. | On a crit | 10 at lv 26, 13 at 40 |
| Spite | The first time you drop below half health, the part that hit you takes *n*. | Below half · once a fight | 32 at lv 26, 41 at 40 |
| Domino | When a part breaks, the soonest attacker takes *n*. | On a break | 18 at lv 26, 23 at 40 |
| Lightning Rod | When a part winds up a charge, shields you for *n*. | On a charge | 20 at lv 26, 26 at 40 |
| Overseer | Deals *n* damage to the soonest attacker. | Every 2 cycles | 6 at lv 26, 8 at 40 |
| Reaper | When a part drops below a quarter of its Integrity, it takes *n*. | Below a quarter (a part) | 16 at lv 26, 20 at 40 |
| **Band 5** (lv 38–50) | | | |
| Broadcast | Deals *n* damage to every part. | Every 4 cycles | 7 at lv 38, 9 at 50 |
| Void | Pushes the attack that lands soonest back a full interval, and deals *n* to its part. | Every 8 cycles | 15 at lv 38, 18 at 50 |
| Pendulum | When you fire in a Sync Window, your target takes *n*. | On a Sync Window | 17 at lv 38, 21 at 50 |
| Sledge | Breaks 1 ◆ on every armored part. Parts with none take *n*. | Every 6 cycles | 10 at lv 38, 12 at 50 |
| Hot Spare | Heals you for *n*, or shields you for *n* when you are at full health. | Every 5 cycles | 12 at lv 38, 15 at 50 |
| Lifeline | The first hit that would take you to 0 leaves you at 1, and heals you for *n*. | On a killing blow · once a fight | 25 at lv 38, 30 at 50 |
| Tandem | Deals *n* damage to the soonest attacker and *n* to the part you last attacked. | Every 3 cycles | 10 at lv 38, 12 at 50 |
| Guillotine | When you interrupt a move, every other part takes *n*. | On an interrupt | 12 at lv 38, 15 at 50 |

**What each band leans on.** Band 1 is the old basics (hit, burn, heal, ◆, a delay, a low-health save). Band 2 the tells and the interrupt (Cron Job, Watchman, Breakpoint, Nudge toward a tick), burns (Kindle) and ◆ (Crowbar). Band 3 shields (Capacitor, Wiretap on an answered tell, Backscatter off your shield), ◆ (Drill through it), burns (Afterburn) and the tells' timing (Lookout). Band 4 breaks (Domino), crits (Ricochet), fragments (Sieve), charges (Lightning Rod), the quarter mark (Reaper) and the **Exfil** (Leash: its upload a cycle longer, and a hit every 2 cycles, useless anywhere else). Band 5 reach: every part (Broadcast, Sledge on ◆), the Sync Window (Pendulum), a long push on the next attack (Void), a cheat-death (Lifeline), and a second cut (Guillotine). None is needed for anything: each is a few points of a fight, and a choice of slot.

**Drops.**

| How the invasion was stopped | Chance of a daemon |
|---|---|
| Your kill at the wall (jack in) | **35%** |
| A thief you intercept on its road | **50%** |
| The wall (blocked outright or worn down) | **15%**: upgrading the wall never costs you daemons |
| A capture (a champion you kill, every fifth stop in a row) | **100%** |
| Bad-luck protection | **+5%** for every stop in a row without one, back to the base when one drops (15% reaches certain by the 18th) |

- One roll per invasion stopped (a pack or a pair rolls once, at the end).
- **The band**: the invasion's level picks its band (the deepest one whose floor it has reached: 1–6 band 1, 7–15 band 2, 16–25 band 3, 26–37 band 4, 38+ band 5). Three times in four it's that band's daemon, otherwise one of an earlier band's, at the invasion's level all the same. Never a later band's.
- **The level**: the invasion's level (a champion's is a level over its server).
- **One copy each.** A daemon better than yours replaces it; yours (or the new one, if it's no better) scraps for a unit of the invader's code at its level. One copy of a daemon is slotted at a time.
- **Slots**: 2 at the start, +1 at server level 15, 30 and 45 (your highest class level); Operators +1 (before: 1, +1 at 10 and 20, Operators +1).
- **The Daemons tab** (Loadout): your slots (and the level that opens the next), then each band with what you've found (name, level, its line at its level, when it acts) and **???** for the rest.

**What replaced the other sources.** A vault's `daemon.exe` (10% of vaults) is now `backup.bin`, a second cache of the vault's code; a kill's 0.25% and a guard's 1% daemon are an Exploit at the same odds; the claims.db contract (LOWLIGHT's fifth job) pays a protocol, Tuned or better; Kestrel's daemon image is a Sealed item, NULL CHOIR's a Sealed blueprint, and the agency stock's daemon image weight went to a second share of Sealed items. Old saves: each versioned daemon is that daemon at your level less 4 (v1), less 2 (v2) or your level (v3); slots follow the new rule (never fewer than before); a `daemon.exe` still in a run's pack banks as the vault's code.

**What daemons are worth** (a scratch sim on the class-balance fights: 20 wilds × 4 classes at each level, the planner, Signal lost a fight with no daemons and with every slot filled by a sensible set: hitters and a heal from the open bands at the player's level; before, the old ten at v2, v3 from level 25):

| Level | No daemons | Old set (slots) | New set (slots) | Old saves | New saves |
|---|---|---|---|---|---|
| 10 | 33.7% | 22.9% (2.3) | 28.6% (2.3) | 10.8 points | 5.1 points |
| 18 | 19.5% | 17.0% (2.3) | 17.2% (3.3) | 2.5 | 2.3 |
| 30 | 24.7% | 17.3% (3.3) | 15.3% (4.3) | 7.4 | 9.4 |
| 45 | 13.0% | 10.4% (3.3) | 9.7% (5.3) | 2.6 | 3.3 |

Each daemon is weaker; with the slots from 15, 30 and 45 the total is in line from level 18 on, and a little under the old v2 set at level 10 (a level-10 player rarely had v2 daemons; against v1 the two are about even). Cycles a fight drop 2–2.7 with the new sets (1.4–2.1 before). The friction and balance numbers don't move: those fights slot no daemons.

## The firewall follows the network

The designer's call, folded into this work: keeping the wall level with what you attach was a tax (about 45% of income by level 20), and a wall that fell behind stalled the game while an invasion sat at it and repair stopped.

- **Base.** Your home wall's base is the level of the highest server attached to your network, less 2, never under 1. It moves for free as you attach and detach. An outpost's base is that server's level; a hub's is the hub's level.
- **Tiers.** Upgrades buy a margin on top, +1 to +6, kept for good. Tier *t* on base *B*: (25 + 6B) × t credits, (2 + B/3) × t Cipher, ⌈t × (1 + B/10)⌉ each of Worm and Kernel, and from +3, t − 2 units more of each of the three codes (`codeUnit(B)`, what a point of bounty pays). On a base of 10: 85 credits for +1, 255 for +2 in all, 1,785 for all six.
- **What a margin buys.** At +0 a raider from your strongest server is contested; at +2 it's blocked; +4 blocks a v2 raider, +5 a champion and +6 a full pack (before filters and the +N chip). Less margin means more invasions ask for you and more bounty to grow, which is a choice and not a mistake.
- **Versions became tier perks**: +2 defrag 30% faster, +3 a filter slot, +4 fragments 25% slower, +5 a filter slot, +6 harden.sh lasts twice as long. The progression pass (docs/progression.md, save v34) added a filter slot and +5% max Integrity at each of +1, +3 and +5: the Filter Bay and the RAID Array folded into the wall. `TIER_PERKS` in firewall.mjs takes more.
- **Repair** carries on at half rate while an invasion is contested or breaching at your wall (it used to stop).
- **Old saves** (v32 to v33): a climbed wall becomes the tier nearest its old margin over the new base (0 to +6), and whatever the old climb cost beyond that tier's price comes back as credits, code and Exploits, with a log line saying so. An outpost's or hub's wall converts the same way against its own level.

## Upkeep

| Chore | Before | After |
|---|---|---|
| Keeping level with the network | an upgrade every level, forever | free: the base follows your network |
| Fragmentation | a block for every 5% of Integrity lost (every chip and every hit in a home fight) | a block when an invasion is contested, two on a breach, once each; blocks and fights cost nothing |
| Defrag | after nearly every invasion | rarely; buying a tier also leaves every block whole |
| Harden | bought at hub shops, used before logging off | also written on the spot from code (2 units of each code), offered on an incoming invasion's card when +3 levels would turn it away |
| Filters | a slot to fill | Custom ones come from vaults now (they came from invasions' captures in the first pass) |

## Decisions for the designer

- **Code prices** (second pass). Tiers +3 to +6 take 1–4 units more of each code, harden.sh 2 of each, a crafted filter 1 of each (the old 3/6/9/12, 6 and 3 signatures, a unit for each). The unit, `codeUnit(L) = 4 + ⌊L/3⌋`, also sets the bounty: raise it for more code from invasions, raise the multiples for a deeper sink. (First pass: signatures; the bot ended level 20 with 11–31.)
- **Daemon odds** (second pass). 35% / 50% / 15% / 100% and +5% a miss are starting values; the bot finds 1–5 by level 20. Lower the wall's 15% if a strong wall rains daemons; the pity keeps it fair either way.
- **Daemon numbers.** About 60% of the old ones; a full set of slots is worth about what the old set was from level 18 (the table above). The band-5 Lifeline is the one to watch: a cheat-death, even small, is the kind of thing that can start to feel mandatory.
- **Thief and scout while away.** They never come while you're logged off. A thief that could rob you overnight felt like FOMO; say if you want them back at a lower weight.
- **One crash, then it leaves.** The leave-after-crash rule makes ignoring a breach cost one crash instead of a loop of them. It also means a player can let a hard invasion crash them to be rid of it.
- **Champion size.** 1.5× Integrity, a level over its server, from server level 8. 2.2× at two levels over cost the planner 50–96% health and a third of its fights.
- **The +6 cap and the base gap of 2.** A bigger gap or more tiers widens the choice; a smaller gap makes invasions rarer to notice.

## Still worth doing

- ~~Fold the home-fight services into firewall perks and filter stats.~~ Done in the progression pass (docs/progression.md): four became filter stats, the RAID Array and the Filter Bay tier perks, Cron Job and Snapshot daemons.
- A pager filter for just the wall, now that blocked invasions add quiet lines.
- Sounds of its own for a thief arriving and a scout finishing, instead of the general loss cue.
- An `invasions` panel on the Map listing the last few and what each paid, so the streak has a history.
