# Factions plan: patrons, boards, receipts

**Status.** Decided with the designer, not built. One session (it changes the economy and the factions; nothing else on
those systems runs beside it). The shops (docs/economy.md *Shops*) follow it, since their yellows open by rep.

**The loop:** pick a patron, take anyone's work, stamp receipts. Starsector's model: work for anyone, hold one
commission.

## 1. One rep scale

Rep already shares one store with Halcyon's old standing (`s.standing`, `factions.mjs` `rep`, `rippleRep`). Finish it:

- **Every faction runs 0 to 100**, tiers at 1/25/50/75, each faction naming its own. Halcyon's tiers keep their names.
- **No Hostile.** Nothing drives a faction under 1, so a shop never closes. Donations go with it.
- **GLASSJAW's −8 Halcyon standing** goes: a GLASSJAW job pays GLASSJAW rep, and the ripple cools Halcyon.
- A crash on your own server no longer costs Halcyon standing.

## 2. Rep comes from two things

| Source | Rep with |
|---|---|
| **Contracts** | The faction that posted the job |
| **Receipts** (docs/receipts.md) | The faction you stamp, **+10** a takeover |

Ripples stay: rivals move half the other way, allies a quarter the same way, never under 1.

**Cut:** rep from clearing a faction's server (it still traces the hub); a faction server's vault (−6) and takeover
(−15) costs; feud rep (feuds keep their parts and goods). The Side contract stays: it is a contract.

## 3. Commissions

- **You hold one commission:** the faction that pays your retainer (`mail.mjs`, the formula and tiers as built, read
  from your rep with that faction). You start with Halcyon's.
- **Switch at any found hub** (its menu's *Commission*), free, any time out of a fight.
- **Your commission is your stance:** the badge line (*Holds with Halcyon*, *Settles with LANTERN*…) and wick's
  letter at INIT's fall read it. lore.md 3 changes to match.
- **wick** has one line on each switch (*"lantern pays now. i still point."*). Floor 5's ACTUARY beat lands on a
  Halcyon commission as written; on another, one line from Claims.

## 4. Every hub posts its own work

One contract engine (`mail.mjs`), five givers. Each hub's **Work** shows its faction's board; Mail shows them all,
your commission's first. Each faction weights the kinds that fit it (lore.md 8.3) and posts in its own voice
(story-script.md *Voices*):

| Faction | Weights toward |
|---|---|
| Halcyon | Kill, Grind, Install, Map without resting |
| Kestrel | Map, Rooms, Hold, Root |
| LANTERN | Decode, Recover a file, Solve, Sweep |
| NULL CHOIR | Takeover (its rivals' servers), Break Encryptors, Interrupt |
| GLASSJAW | Catch an Exfil, Recover a file, Past the Tracker |

Pay stays one table (credits, XP); GLASSJAW's premium stays. A board offers every kind your level opens, at a lower
weight, so no patron locks content away.

## 5. The session

- **Lane:** `factions.mjs`, `mail.mjs` (board, retainer), `store.mjs` gating, the badge's stance line, receipts
  (vault file, takeover card, hub hand-in), `achievements.mjs` where it reads standing. Not combat, not the shops.
- **Save:** `s.commission` is new (absent reads as Halcyon). Clamp rep under 1 to 1 on load, keyed on the value, so it
  runs twice safely.
- **Lean:** the rules, the takeover card (the *Stamps* look), the commission menu line, tooltips, a unit test each,
  GAME_RULES and README. Per-faction board text can start with one line a kind.
- **Docs to change with it:** GAME_RULES *Standing*, *Contracts*, *Factions*, *Events* (feuds); lore.md 3; receipts.md.
