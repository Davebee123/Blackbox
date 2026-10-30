# Server specials

A server's **special**, like a planet special in Master of Orion II: one rule with an upside and a cost, that makes a
server good at one thing and points at the programs to build there. They replaced the traits (Rich, Legacy, Backbone,
Hostile, Hardened). **Built** (October 2026), all but Scarred: `dist/specials.mjs`, GAME_RULES.md "Server kinds,
specials and quirks". The rules as built are there; this doc keeps the design and the decisions.

## The rule for a special

- **Every traced server has one;** two from floor 5 (Deep Core) down. Guarded is the only rare one (1 in 25).
- **Two sides:** an upside and a cost, or a threat you turn up or down.
- **It points at programs:** one that leans in (⇡), one that cancels the cost (⇣).
- **Big numbers** (×2, ±2 levels), so the card makes the choice obvious.
- **Never class-flavoured.** The leanings test holds (docs/leanings.md).
- **Never names its use.** No "Daemon source" or "Code farm" on the card or in the tooltip: the player reads it.

## The look (picked: *Tag*)

One filled amber tag beside the kind on the server card, the special's glyph and name. Everything else is in its
tooltip, in WoW's grammar: the name, *Server special*, the rule, the upside and cost as icon chips, then the ▸ answer
naming the programs. On the map each server's node carries the special's glyph.

## The catalogue

| Special | Upside | Cost | ⇡ Leans in | ⇣ Fixes |
|---|---|---|---|---|
| ⚡ **Volatile** | Sends invasions twice as often; its invaders drop a daemon 50% of the time | Its invaders come 2 levels higher | Amplifier (new: +2 levels) | Lockdown (−2 levels) |
| ≈ **Stable** | A rest room | Sends invasions half as often | Lockdown | Amplifier |
| ⌗ **Rich** | Kills and its vault drop twice the code | Its guards and Resident are Armored | Code Siphon | Patch Injector |
| ↻ **Hostile** | Its fights pay 50% more XP | Its fights cost 25% more Signal | Defrag Bay | Bulkhead |
| ★ **Legacy** | Rare spawns twice as often | Its Resident fights a level higher | Listening Post | Bulkhead |
| ⊞ **Backbone** | One more socket room | Open: today's cost (invasions travel twice as fast) is too soft | any | Lockdown |
| ◆ **Hardened** | Its vault pays double; Root climbs twice as fast | Its Resident and guards are Armored | Honeytoken | Patch Injector |
| ♜ **Guarded** (rare) | Its vault rolls one of the floor's uniques | A crew elite holds its Core | — | — |
| ✳ **Scarred** | Strains spawn twice as often | Its invaders carry the strain's mutation | Lure | Firebreak (new) |

Scarred is what a bloom leaves behind (below), and waits for blooms with Firebreak. The other eight shipped with their
programs (Lockdown, Amplifier, Patch Injector, Bulkhead, Honeytoken, Lure), v1 only.

## Decisions made building it

- **Sourcing:** the half of invasions from your strongest server stays; the other half's pick weighs a Volatile server
  ×2 and a Stable one ×½. Hidden servers' invaders take no special.
- **Levels:** Volatile, Amplifier (+2 each) and Lockdown (−2) stack on what a server sends; the Safe readout counts them.
- **Volatile's daemon:** 50% for one you kill or intercept (it was 35% and 50%).
- **Stable's rest room** hangs off the spine nearest its middle and rests once a visit, apart from the server's own.
- **Hostile's cost** is its viruses' hits ×1.25 (the Signal its fights cost).
- **Rich** no longer doubles caches; Hardened's vault doubles credits and code, Rich's its code.
- **Guarded:** its Core's crew elite is a Pit elite at the Resident's level; beating it takes the server. The unique is
  one of the floor's (any source there), else its layer's vault table's, once.
- **Shelves:** Kestrel sells Bulkhead (tier 2) and Lockdown (3); GLASSJAW Patch Injector (2) and Honeytoken (3); NULL
  CHOIR Lure (2) and Amplifier (3). Lockdown is paid in Cipher, as economy.md's list has it.
- **Lure** names a family only (`lure <family>`, or buttons in its room); strains wait.
- **The save (v50):** `loc.trait` becomes `loc.special` (a list), keyed on the field; a server with none rolls one.

## What the measurement showed

The rooms bot (roomsim.mjs's loop) maps a medium server, then farms it for an hour: 4 classes × 3 seeds, levels 18 and
30. Each special was emulated by editing `FP.ROOMS` (respawn clocks, move costs, rare odds, caches, the rest). A
second pass ran fights 5× as fast with Signal topped up instead of rested, about 90 kills an hour. The invasion side
is worked from the formulas.

| Rule | An hour of farming | Verdict |
|---|---|---|
| Rare spawns ×2 (Legacy) | rare kills ×3–6, XP +9–11% | Works |
| A second rest | XP +23% | Strong: Signal is the limit |
| Respawns ×2 (today's Hostile, Cron Spawner) | XP −15% to +7%, even at 90 kills an hour | Does nothing: respawns aren't the limit |
| Caches ×2 (today's Rich) | 0 | Caches refill every 2 hours, so a farm hour sees none |
| Invaders +2 levels (Volatile as first drafted) | daemons +4.8%, bounty +7% | Too weak alone |

- **Signal is what limits farming.** Resting at home is a third of every hour. Topping up instead pays +50% XP an hour
  for about 200 credits (the bot) or 570 (human pace) at level 18.
- **An invasion special does nothing unless its server sends.** Half of all invasions come from your highest-level
  server, the rest from any. With 10 servers, a Volatile one that isn't the highest sends about one in 20.
- **The wall works against daemon farming:** a blocked invasion drops a daemon 15% of the time, one you kill 35%.

## Blooms, from the same talk

- A chaotic evil faction looses strains on the net, from below Bedrock (Master of Orion II's Antarans). Names, all
  anagrams of Antares: **ASTERNA** (proposed), ARSENAT, TSARENA. The designer hasn't picked.
- **The risk (the designer's rule):** a bloom's viruses hurt the Integrity of servers you hold. An infected server's
  programs stop and it can't be farmed until you clear its infestation. Fair means warned (the front on the map),
  clearable solo, easier in co-op.
- **Firebreak** (code) seals a server you hold so a bloom can't pass it.

## Open

- **Two filled amber tags.** A leaning is also a filled amber tag on the card (docs/leanings.md): the two need telling
  apart once leanings are built.
- **Backbone's cost.**
- **Hardened and Root 3:** Root 3 stops a server's invasions, which works against daemon farming. Root climbing twice
  as fast gets there sooner.
- **Rich and the Hoard quirk** overlap (caches and Armored guards): fold Hoard in, or keep quirks as family flavour.
- **Code ×2 against the markets:** code is sold at hubs, so Rich needs a check against their prices.
- **Components:** give them a job, or fold them into credits. Credits never modify gear.
