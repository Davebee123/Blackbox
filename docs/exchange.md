# The exchange: one book for what you farm

**Status.** Proposed (the designer, November 2026) and prototyped. The look is picked: the Tape (section 6). Building
it is next. It replaces the five hubs' markets (GAME_RULES *Markets*); the hubs keep their Shop, Work,
Commission, Receipts and Their servers. The ticker (ticker.md) moves its prices. The numbers come from a scratchpad
simulation, 200 network seeds × 40 logged-on hours at level 12; building it re-measures them.

## 1. The rule

- **One exchange, at LANTERN's Listening Post** (the scanner's post beside HOME on every floor, instant to connect):
  **[4] exchange** in its menu opens one book for Cipher, Worm and Kernel code, Exploits and components, which LANTERN
  reads out over the post's carrier. The hubs have no market. It opens when the post shows on the map (Nine Days Deaf);
  until then what you farm waits in your pack. `exchange sell|buy <good> <n>`.
- **Hosting gives LANTERN nothing on the book.** Rep never touches the spread, and LANTERN's cards move prices like
  anyone's.
- **Par:** a code 10 credits, an Exploit 100, a component 5. The price is par times what's moving it (section 2),
  between ×0.5 and ×2. You sell at the bid, 4% under the price, and buy at the ask, 4% over. Components can be bought
  now too.
- **A position** is what you bought and still hold. Together your bought units can cost at most an hour's income at
  your level (`incomeAt`: 420 at 12). Farmed stock is never capped, and a sale takes bought units first. The row shows
  what you paid and how it stands, in teal.
- **Settlement:** a buy lands 5 minutes later (each relay 10% sooner, up to 40%) and can't be sold until it lands. A
  sale is priced when it leaves and pays when it lands.
- **Logged off,** no mover runs. Your push (section 3) keeps easing on the wall clock.

## 2. What moves a price

Every mover eases in over 3 minutes, holds, and eases out over its last 6. One posted ahead is priced in as it nears:
when it lands, 40% of it is already in the price, so buying on the word beats buying at the bell.

### The ticker's cards

The ticker as ticker.md has it (a card every 20–40 logged-on minutes, two favoured cards a network, a style, the
modifiers Rushed, Lingering, Leaked and Quiet), each card moving one good on the book. Posted: on the Log 5–15
minutes ahead, four cards in five (★) or half of them (½). Leaked posts any card 5 minutes ahead.

| Good | Up | Down |
|---|---|---|
| Cipher | **Rent day** (Tenements Board) ×1.3, 20 min ★; **Rehearsal** (NULL CHOIR) ×1.35, 20 min | **Small print** (Halcyon) ×0.8, 20 min; **TOLLGATE's run** ×0.82, 30 min, always posted |
| Worm | **Census** (LANTERN) ×1.35, 25 min ★ | **Wage run** (Pellucid Payroll) ×0.82, 30 min; **SWARMLINE's rental** ×0.82, 30 min, always posted |
| Kernel | **Thermal alarm** (Kestrel) ×1.4, 20 min; **Open mic** (NULL CHOIR), **Sink clearance** (GLASSJAW) ×1.35, 20 min | **PALEMASK's harvest** ×0.82, 30 min, always posted; **Margin call** (Corvid) ×0.78, 20 min |
| Exploits | **Report auction** (GLASSJAW) ×1.5, 20 min ½; **Claim files** (Annick Life) ×1.35, 25 min | **Leaked report** (GLASSJAW) ×0.8, 20 min; **Disclosure** (Kestrel) ×0.82, 25 min ½ |
| Components | **Rack closure** (Kestrel) ×1.4, 20 min ★; **Beacon repair** (LANTERN) ×1.35, 20 min; **Claims inspection** (Halcyon) ×1.35, 25 min ½ | **Rollback night** (NULL CHOIR) ×0.8, 30 min; **A farm wakes** (Kessler) ×0.85, 30 min; **Arrears** (Tenements Board) ×0.82, 25 min ½ |
| A code | **Premium review** (Halcyon) ×1.4, 20 min; **Insured lots** (Corvid) ×1.35, 30 min ½ | |
| Everything | **Tax run** (City Treasury) ×1.1, 20 min ★ | |
| Three goods | **Early word** (GLASSJAW): each ×1.2 or ×0.85, 20 min, always posted | |

New lines: **Claims inspection**, *Failed hardware is now required as evidence for every claim.* **Disclosure**,
*Kestrel Underwriting has disclosed a firmware flaw. A patch is available to every client.* The rest keep ticker.md's
and market.md's. A crew's run is the built Outbreak (its strays drop double code) and is bragged about on #net first.
Rare cards and runners' corners move the book the same way (not in the prototype). Wide, Contested and two buyers go:
there are no hubs to split.

### What you do

Moves you cause. Kills, rooms, time logged on and trading volume move nothing.

| You | Moves | Why |
|---|---|---|
| Take over a server | Its family's code ×1.3, 40 min | One nest fewer: that code gets scarce |
| Win a feud | The winner's good ×1.25, 30 min | It restocks after the win |
| Hold a defence call | The owner's good ×1.2, 30 min | The same |
| Catch an Exfil | Exploits ×1.3, 30 min | The findings never reach their buyer |

A faction's good: Halcyon Cipher, Kestrel components, LANTERN Worm, GLASSJAW Exploits, NULL CHOIR Kernel. **On one good,
only your biggest move counts.** It multiplies with the cards.

### Orders

Three up-cards in ten carry an **order**: the card's owner buys 20–40 code, 40–80 components or 2–4 Exploits through the
book for the card's minutes and 40 more. A unit sold into it fetches the price without your push and takes nothing off
it; your sales fill it first. Runners fill about two in five.

## 3. Guards

- **The push:** every 40 credits of a good you sell takes 1% off its price, and every 40 you buy adds 1% (a code ¼% a
  unit, a component ⅛%, an Exploit 2½%). Each unit is priced after its own push, so a round trip never profits. The
  push eases by half every 30 minutes, back toward the price. Sold at once, 10 codes fetch 1.4% under the bid, 30 3.9%,
  100 12.6%: bulk goes into an order.
- **The spread, the cap and settlement** (section 1).
- **One rule per abuse:**

| Against | Guard | Measured, against an ordinary seller |
|---|---|---|
| Pump and dump | The push eases against whoever pushed; the spread | Sold 10 min later ×0.72; an hour later ×0.87 |
| Crash and rebuy | The same | ×0.87 |
| Stuffing an order | It pays the price without your push | ×0.94 |
| Stacking your moves | The biggest counts | ×1.35, under plain attention's ×1.40 (×1.49 if they multiplied) |
| Idle farming | No mover counts kills or time; trading needs you there | Trading the ticker with no play: 39 credits an hour, ×0.15 |
| An obvious buy | Every good moves both ways; positions are capped | Bought and sold an hour later: −6.4% for every good. Each good is the trader's best on 10–28% of seeds |
| Big positions | The cap | At two hours' income: attentive ×1.59, ticker only ×0.22 |

## 4. Measured

The farm is market.md's level-12 bot: 15 code, 14 components and 0.4 Exploits an hour, the codes split 55/30/15 by the
network. Cards 2 an hour, orders 0.3, your moves 1.1 (a takeover every 2.5 hours, a feud won every 5, a defence call
every 3.3, an Exfil every 5). Prices ran ×0.59 to ×2.

| Player | Credits an hour | Against ordinary |
|---|---:|---:|
| Today's market: the best hubs every 30 min | 250 | ×0.98 |
| Today's market: their own hub only | 154 | ×0.60 |
| **Ordinary:** sells everything every 45 min, never buys | 255 | ×1.00 |
| **Attentive:** looks every 5 min; holds stock for spikes and orders, sells ahead of a glut, buys ahead of posted cards and its own moves, buys a glut's dip | 358 | ×1.40 |
| Its stock sold well, buying nothing | 274 | ×1.07 |
| **Casual:** the same, every 20 min | 324 | ×1.27 |

The attentive player's trading makes 78 an hour on about two positions an hour: its own moves 32 (takeovers 15),
posted cards 18, a glut's dip 18, cards it caught live 11. Each good's share runs 16–22%.

## 5. What changes

- **Gone:** the hubs' Market windows, their fixed conditions, per-hub trade times and the rep tier's 2% on trades. The
  world event and the Market shock go with the ticker (ticker.md).
- **Aimed at the book:** price flickers and the scanner's pirate tips. `bestSell` (shops never sell under it) reads
  the bid.
- **Unchanged:** code deliveries, programs' costs, shop deliveries' transfer times.

## 6. On the screen: the Tape (picked)

Picked by the designer (November 2026) from the Board, the Tape and the Wire; *Focus* over a five-row board. In the
Listening Post's window, top to bottom:

- **Position:** a teal bar, *410 / 420*.
- **The strip:** five cells, one a good: its symbol (CPH, WRM, KRN, XPL, CMP), last price, ▲▼ against par, the last
  two hours as a line in the up or down colour, a dot for each mover (amber a card, red a crew's run, teal yours,
  hollow one posted ahead). A cell picks the good.
- **The good:** its name and par small, its symbol and last price large, ▲▼ beside it; your holding in a teal box
  (held, paid, what you've made).
- **The chart:** 5-minute candles two hours back and 30 minutes ahead, a price axis on the right with the last price
  tagged, par dotted, what you paid as a dashed teal line. Each mover is a pin where it started (*Taken over ×1.3 ·
  28m*), coloured as in the strip, and a posted card a dashed box ahead at its size (*Rent day ×1.3 · in 14m*). The
  pins are the only list of movers.
- **Sell and Buy:** two large buttons with the bid and the ask, what you hold and the room your cap leaves. Each opens
  the order ticket (*Paid* where *vs elsewhere* was). An order shows as *31 wanted* on Sell.
- **In transfer** below, and a card's line on the Log.

## 7. Building it

One slice in the economy's lane (nothing else on the economy or the save beside it), after the pick: the book (par,
spread, push, cap, settlement), the ticker aimed at it (ticker.md's slice folded in), your moves' hooks, orders, the
picked look, the post's menu and a phone layout, GAME_RULES *Markets* rewritten. Saved: one push a good in place of the hubs' pressure,
positions (units and what they cost), the live movers. The migration keys on the hub-keyed `s.market.pressure` and
drops it; transfers in flight still land. A unit test on fixed seeds: a round trip never profits, the cap holds, only
your biggest move counts, an order takes no push, prices stay within ×0.5–×2.
