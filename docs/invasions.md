# Invasions: the review sheet

Invasions were good on paper and tedious to play against: one every 6–10 minutes, nearly always one easy virus from the same three families, paying a normal home kill, with defrag, upgrade, harden and filters as chores between them. This sheet covers the rework: fewer and bigger invasions, a currency only they pay, kinds that do something besides chip, and a firewall that keeps up with your network by itself. The rules live in GAME_RULES.md under *Invasions and the wall*; the code is `dist/invasion.mjs` and `dist/firewall.mjs`.

## Pacing

| | Before | After |
|---|---|---|
| Online | one every 6–10 min after the last | one every **20–30 min** after the last |
| First one | 3 min after your first find | 3 min after your first find, always a plain raider |
| Open ports | 2.5× as often (2.4–4 min), +50% rewards | 2.5× as often (**8–12 min**), +50% rewards (signatures too) |
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
| **Champion** | 12 | server lv 8 | *A champion, built like an elite. It counts 2 levels higher at your wall and leaves a capture when you kill it.* | jack in, or harden.sh to turn it away | chip | 5 and a capture |
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

**Signatures** are the wall's currency, and nothing but invasions pays them.

| Source | Signatures |
|---|---|
| Your kill (jack in, intercept) | the bounty, plus what it grew |
| The wall wears it down | the base bounty |
| The wall blocks it outright | half the base, rounded up |
| Open ports | ×1.5 |
| Streak | +10% per invasion already in the streak, up to +50% |

**The growing bounty.** While an invasion sits contested or breaching at your wall and you're not on it, its bounty grows by a quarter of its base every minute, up to three times the base. Only your kill collects the growth. So you choose: jack in early for the base, or let it sit, take the chip, and hope the wall doesn't grind it down first (then you get only the base). The card shows both numbers before you fight, for example *13 → 34*.

**What signatures buy.**

| Sink | Signatures |
|---|---|
| Firewall tier +3 / +4 / +5 / +6 | 3 / 6 / 9 / 12 |
| Crafting a filter | 3 (plus its credits, Cipher and salvage) |
| Writing a harden.sh when you hold none | 6 |

**The streak.** Invasions stopped in a row, by your wall or by you. It pays more per stop (above) and every fifth stop in a row leaves a **capture**. A crash, a theft or a finished scout map ends it. The Firewall card shows the streak and how many stops to the next capture.

**Captures** come from champions you kill and from every fifth stop in a row. Each is one item:

- one of the three **invasion-only uniques** (Tripwire, lv 6: the first hit each fight lands at half; Honeynet, lv 14: crits heal; Sinkhole, lv 24: breaking a part cuts every cooldown by 2), 20% a capture and 10% more for every capture without one, back to 20% when one drops, like a boss's pity (one you don't have comes first; a Listening Post helps);
- otherwise a **Custom filter** (four times in ten), the only place Custom filters and the rare Tar, Hive and Reflection affixes come from now (a vault's `filter.flt` is Tuned at best);
- otherwise a protocol, Tuned or (three times in ten) Custom.

**How much.** The level bot (bot.mjs, 6 seeds a class) earns 2–11 signatures on the way to level 10 and 11–31 by level 20, depending on how much it fights at home. A real player who jacks in more earns more. Climb times to level 10 and 20 are within a few percent of before, because the XP from invasion kills was a small share of it. No credits come from invasions, so the credit economy is unchanged; filters and tiers +3 and up now also take signatures.

## The firewall follows the network

The designer's call, folded into this work: keeping the wall level with what you attach was a tax (about 45% of income by level 20), and a wall that fell behind stalled the game while an invasion sat at it and repair stopped.

- **Base.** Your home wall's base is the level of the highest server attached to your network, less 2, never under 1. It moves for free as you attach and detach. An outpost's base is that server's level; a hub's is the hub's level.
- **Tiers.** Upgrades buy a margin on top, +1 to +6, kept for good. Tier *t* on base *B*: (25 + 6B) × t credits, (2 + B/3) × t Cipher, ⌈t × (1 + B/10)⌉ each of Worm and Kernel, and from +3, 3 × (t − 2) signatures. On a base of 10: 85 credits for +1, 255 for +2 in all, 1,785 for all six.
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
| Harden | bought at hub shops, used before logging off | also written on the spot from 6 signatures, offered on an incoming invasion's card when +3 levels would turn it away |
| Filters | a slot to fill | the best ones come from invasions, so they're something you chase |

## Decisions for the designer

- **Signature prices.** Tiers +3 to +6 (3/6/9/12), crafted filters (3) and harden.sh (6). Raise them if signatures pile up; the bot ends level 20 with 11–31.
- **Thief and scout while away.** They never come while you're logged off. A thief that could rob you overnight felt like FOMO; say if you want them back at a lower weight.
- **One crash, then it leaves.** The leave-after-crash rule makes ignoring a breach cost one crash instead of a loop of them. It also means a player can let a hard invasion crash them to be rid of it.
- **Champion size.** 1.5× Integrity, a level over its server, from server level 8. 2.2× at two levels over cost the planner 50–96% health and a third of its fights.
- **The +6 cap and the base gap of 2.** A bigger gap or more tiers widens the choice; a smaller gap makes invasions rarer to notice.

## Still worth doing

- ~~Fold the home-fight services into firewall perks and filter stats.~~ Done in the progression pass (docs/progression.md): four became filter stats, the RAID Array and the Filter Bay tier perks, Cron Job and Snapshot daemons.
- A pager filter for just the wall, now that blocked invasions add quiet lines.
- Sounds of its own for a thief arriving and a scout finishing, instead of the general loss cue.
- An `invasions` panel on the Map listing the last few and what each paid, so the streak has a history.
