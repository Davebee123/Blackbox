# Factions plan: patrons, boards, receipts

**Status.** 1–5, 7, 8 and 10 built lean (GAME_RULES *Commission*, *Contracts*, *Factions*). Not yet: floor 5's Commission buttons
(its transmissions aren't built), wick's letter at INIT's fall and the ACTUARY line (not built), per-faction board text,
and 9. 7–10 added after the designer's first look: 7, 8 and 10 decided; 9's numbers confirmed, its pieces to pick. One session (it changes the economy and the factions; nothing else on
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

Built (GAME_RULES *Shops*): tools, the shelf, a chase line at the tiers at 25, 50 and 75, codebases. The lines:
Indemnified (Halcyon), Bonded (Kestrel), Off-book (GLASSJAW), Broadcast (LANTERN), Unsigned (NULL CHOIR), each item
with its faction's implicit.

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
- Proposed below, for the designer's pick (the cards: the session's screenshots). Not built.

**The shape.** Each set fills four of the five slot kinds and pushes its own way to play. Every piece is a faction
piece as built: its slot's best base ×1.2 at your level, its faction's implicit a quarter stronger (it counts once),
a signature, and a green line at 2 pieces. Each 2-piece strengthens the implicit. Implant pieces load from level 15.
The new names clash with nothing in the game, and with nothing on the shops' chase lines as of this writing.

**Halcyon: Full Coverage.** Hold: take the big hits, and claims pay them back.

| Piece | Slot | Signature | Green |
| --- | --- | --- | --- |
| Umbrella Policy (built) | Proxy | You take 6% less damage while below half health | +2 Block |
| Endorsement | Shell | Each claim waiting to pay out gives +1 Block | +6% max health |
| Annuity | Script | When a claim pays out, your next skill deals 10% more | +5% damage |
| Grace Period | Implant | A hit for more than 25% of your max lands half now, half over the next 2 cycles | +5% Clock Speed |

(2) Claims pay back 8% more of each hit. (4) **A, Counterclaim:** a claim that pays out also hits the part that made
it, for the same amount. **B, Early payout:** below 25% health, every claim waiting pays out at once, 50% larger.

**Kestrel: Sealed Floor.** Seal: break the appraised part first.

| Piece | Slot | Signature | Green |
| --- | --- | --- | --- |
| Mews (built) | Shell | A critical strike heals 2% of your max health | +5% crit |
| Containment | Proxy | The appraised part deals 20% less to you | +2 Block |
| Exclusion Clause | Exploit | Breaking the appraised part takes 1 cycle off all your cooldowns | +5% damage |
| Write-off | Implant | +3% damage for each part you've broken this fight, up to 12% | +6% max health |

(2) You deal 6% more to the appraised part. (4) **A, Sealed:** breaking the appraised part appraises the next one at
once, and its attack comes a cycle later. **B, On time:** breaking the appraised part before it attacks heals 8% of
your max.

**GLASSJAW: Top Bid.** Sell: stay above 75% and open hard.

| Piece | Slot | Signature | Green |
| --- | --- | --- | --- |
| Blank Check (built) | Exploit | +15% damage against the part with the most Integrity left | +5% crit |
| Stop-Loss | Proxy | A hit that takes you under 75% health shields you for 8% of your max | +6% max health |
| Insider | Shell | A heal that takes you back above 75% is 20% larger | +2 Block |
| Auction Lot | Implant | Each cycle above 75%, your next crit deals 5% more, up to 25%; a crit spends it | +5% Clock Speed |

(2) Glass Jaw's extra damage holds down to 60% health. (4) **A, Sold:** breaking a part while above 75% takes 2 cycles
off all your cooldowns. **B, Margin:** breaking a part while above 75% heals 5% of your max.

**LANTERN: Night Count.** Settle: answer every tell, and the count builds.

| Piece | Slot | Signature | Green |
| --- | --- | --- | --- |
| Carrier Wave (built) | Exploit | Answering a tell takes 1 cycle off all your cooldowns | +5% damage |
| Noise Gate | Proxy | An attack you answer doesn't clear Clean Signal | +2 Block |
| Call Sign | Shell | At full Clean Signal, your Regen heals twice as much | +6% max health |
| Tally Sheet | Implant | Each tell you answer gives +3% damage, up to 15%, until an attack lands on you | +5% Clock Speed |

(2) Clean Signal stacks up to 4. (4) **A, Return to sender:** at full Clean Signal, an attack you answer hits its own
part for the damage it would have dealt. **B, Open line:** answering a tell adds a Clean Signal stack.

**NULL CHOIR: Evensong.** Roll back: repeat a skill, let burns run, and undo a bad turn.

| Piece | Slot | Signature | Green |
| --- | --- | --- | --- |
| Descant (built) | Script | Your burns and helpers deal 10% more | +5% Clock Speed |
| Plainsong | Proxy | The same skill twice in a row shields you for 4% of your max | +2 Block |
| Ostinato | Exploit | Chorus's extra hit adds 1 cycle to your burns on that part | +5% crit |
| Da Capo | Implant | Once a fight, falling under 25% rolls your health back to where it was 3 cycles ago (a tick on the bar marks it) | +6% max health |

(2) Chorus's second hit deals 10% more. (4) **A, Requiem:** when a part breaks, your burns on it move to the next
living part, their time back to full. **B, Encore:** a burn or helper that runs out comes back once, for 2 cycles at
half strength.

- **For the pick:** each 4-piece's A or B; the set names; Da Capo against Golden Parachute (both fire under 25%).
- **Built with (once picked):** each new piece a unique with `faction` and `set` (content/items.mjs), the five sets
  (content/sets.mjs) with their codes in SET_HOOKS, PIECES holding four a faction, parts counted a piece at a time
  (s.factionParts by piece), GAME_RULES *Sets* and *Faction gear*.

## 10. Payloads are cut

Decided: payloads won't return. Remove the payload system, hub capture, held hubs (their bank, the market at its true
price, goods at cost) and the swarms that retake them (`payload.mjs`, `hubs.mjs`, `fleet.mjs`). A save that holds a hub
is paid out once in credits, with a letter (like the Indemnity cut, store.mjs `indemnityRestore`). One session of its
own.
