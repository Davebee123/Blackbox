# Factions plan: patrons, boards, receipts

**Status.** 1–4 built lean (GAME_RULES *Commission*, *Contracts*, *Factions*). Not yet: floor 5's Commission buttons
(its transmissions aren't built), wick's letter at INIT's fall and the ACTUARY line (not built), per-faction board text,
and 5. One session (it changes the economy and the factions; nothing else on
those systems runs beside it). The shops (docs/economy.md *Shops*) follow it, since their yellows open by rep.

**The loop:** pick a patron, take anyone's work, stamp receipts. Starsector's model: work for anyone, hold one
commission.

## 1. One rep scale

Rep already shares one store with Halcyon's old standing (`s.standing`, `factions.mjs` `rep`, `rippleRep`). Finish it:

- **Every faction runs 1 to 100**, four tiers at 1/25/50/75, shown as **four pips**; the tier's name (each faction's
  own) is in the tooltip. The bottom tier's names (*Suspended*, *Burned*…) go.
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
(−15) costs; feud rep (feuds keep their parts and goods). **The Side contract goes:** commissions are the one way to pick a side.

## 3. Commissions

- **You hold one commission:** the faction that pays your retainer (`mail.mjs`, the formula and tiers as built, read
  from your rep with that faction). You start with Halcyon's.
- **Switch at any found hub** (its menu's *Commission*), free, any time out of a fight.
- **Your commission is your stance:** the badge line (*Holds with Halcyon*, *Settles with LANTERN*…) and wick's
  letter at INIT's fall read it. lore.md 3 changes to match.
- **wick** has one line on each switch (*"lantern pays now. i still point."*). Floor 5's ACTUARY beat lands on a
  Halcyon commission as written; on another, one line from Claims.
- **Floor 5's five transmissions** (each faction's case, lore.md 3) each carry a **Commission** button: the story's
  question is the moment you can answer it.
- **Receipts kept for later** hand in at your commission's hub.

## 4. Every hub posts its own work

One contract engine (`mail.mjs`), five givers. Each hub's **Work** shows its faction's board; Mail shows them all,
your commission's first. **Every faction posts every kind your level opens, at the same odds:** a patron never decides
how you play. A faction differs in its voice (the job's letter and its reason, lore.md 8.3, story-script.md *Voices*)
and its targets (its takeovers aim at its rivals' servers). Pay stays one table (credits, XP); GLASSJAW's premium
stays.

## 5. Every hub's shop has one shape

Tools (relays, key crackers, trace injectors, Signal patches, hot-swap kits), **the shelf** (docs/economy.md *Shops*),
and **a chase line** at Contractor, Trusted and Preferred (the tiers at 25, 50, 75). Halcyon's Indemnified protocols are
its line; each other faction gets one of its own, with its implicit. Built after the shops session: the layout first,
then the four new lines (content).

## 6. The session

- **Lane:** `factions.mjs`, `mail.mjs` (board, retainer), `store.mjs` gating, the badge's stance line, receipts
  (vault file, takeover card, hub hand-in), `achievements.mjs` where it reads standing, floor 5's transmissions (`scenes.mjs`). Not combat, not the shops (5).
- **Save:** `s.commission` is new (absent reads as Halcyon). Clamp rep under 1 to 1 on load, keyed on the value, so it
  runs twice safely.
- **Lean:** the rules, the takeover card (the *Stamps* look), the commission menu line, tooltips, a unit test each,
  GAME_RULES and README. Per-faction board text can start with one line a kind.
- **Docs to change with it:** GAME_RULES *Standing*, *Contracts* (the Side row), *Factions*, *Events* (feuds); lore.md 3; receipts.md.
