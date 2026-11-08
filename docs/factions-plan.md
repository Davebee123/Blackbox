# Factions plan: patrons, boards, receipts

**Status.** 1–4, 7, 8 and 10 built lean (GAME_RULES *Commission*, *Contracts*, *Factions*). Not yet: floor 5's Commission buttons
(its transmissions aren't built), wick's letter at INIT's fall and the ACTUARY line (not built), per-faction board text,
and 5. 7–10 added after the designer's first look: 7, 8 and 10 decided; 9's numbers confirmed, its pieces to pick. One session (it changes the economy and the factions; nothing else on
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

## 2. Where rep comes from

| Source | Rep with |
|---|---|
| **Contracts** | The faction that posted the job |
| **Receipts** (docs/receipts.md) | The faction you stamp, **+10** a takeover |
| **Feuds** (7) | The side you fight for: +4 a runner beaten, +6 the win, its allies a quarter; no ripple |
| **Defence calls** (8) | The server's owner; − on a call you answered and lost |

Ripples stay: rivals move half the other way, allies a quarter the same way, never under 1.

Still open: bounties, hunts, the counter-raid, the returning bounty, LANTERN's offer, threads and floor chains pay rep
as built; the designer hasn't decided whether they stay.

**Cut:** rep from clearing a faction's server (it still traces the hub); a faction server's vault (−6) and takeover
(−15) costs. **The Side contract goes:** commissions are the one way to pick a side.

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

## 7. Feuds pay rep again

Decided: feuds are a third source. As before the cut: **+4** a runner beaten, **+6** for the win, the side's allies a
quarter; no ripple, so a feud never costs rep with anyone. The part and the good stay.

## 8. Defence calls

Decided. A faction's server (one you've found) comes under invasion from its owner's rival: a **call** goes up, an event
card (*Kestrel: KDC-04 under attack · Defend*).

- **Ignoring it costs nothing.** The server may reboot; that's the owner's problem. Calls roll only while you're logged
  on, like every invasion (invasion.mjs), and none comes due while you're away.
- **Answering is a commitment.** Hold it (beat the invader at that server's wall before it reboots): **+rep** with the
  owner, the usual ripple cooling the attacker. It reboots while you hold the call: **−rep** with the owner.
- **Your commission's calls carry more:** a bigger + for a hold, a bigger − for a reboot. Your patron counts on you;
  you chose that when you took the commission.
- Built with: a 10-minute window, +6 a hold, −4 a reboot (no ripple), the commission ×1.5 (+9, −6), weight 1 in the
  event deck (a feud's) from level 6, on faction servers at your level + 2 or under (events.mjs `CALL`).
- Lean build: the call card, the invader at the faction server's wall (the invasion engine aimed at a server you don't
  own), the rule, a unit test, GAME_RULES *Events* and *Factions*.

## 9. Faction sets (numbers confirmed)

One piece is too quick a chase: at 3 receipts a part, stamping one faction finishes its piece in 9 takeovers, about a
floor and a half. A rep gate can't slow it: a stamp's +10 reaches Trusted in a few stamps, contracts faster still.

- **Each faction gets a set of four pieces**, its current unique one of them, with set bonuses at 2 and 4 (sets.mjs).
- **Each piece takes 3 parts; a part is 5 receipts or one feud win.** The full set is about 60 receipts for one
  faction, half the climb's servers (about 118): a reason to commit to one side.
- Assembling and re-tuning work as built (faction-gear.mjs), a piece at a time.
- Before building: the twelve new pieces, their slots and the set bonuses, written here for the designer's pick.

## 10. Payloads are cut

Decided: payloads won't return. Remove the payload system, hub capture, held hubs (their bank, the market at its true
price, goods at cost) and the swarms that retake them (`payload.mjs`, `hubs.mjs`, `fleet.mjs`). A save that holds a hub
is paid out once in credits, with a letter (like the Indemnity cut, store.mjs `indemnityRestore`). One session of its
own.
