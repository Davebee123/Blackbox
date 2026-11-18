# The ticker: market cards

**Status.** Ready to build (November 2026); the look is to be picked from mock-ups. It's what stays of market.md: the
cards, without sway or INIT's count. It replaces the wall-clock world event and the Market shock (GAME_RULES
*Markets*, *Events*). Outposts (outposts.md) are tabled. If the exchange (exchange.md, proposed) is picked, each card
moves one good on its book instead of a hub's price, at the sizes there.

## 1. The rule

- **A card every 20–40 logged-on minutes**, on the director's own dice (never counted toward the two-event limit).
  Several can run at once. Nothing moves while you're logged off.
- **A card moves prices at a hub** for its minutes, and says why in its owner's voice (lore.md 8.2): a Log line, and
  the reason in every price tooltip it touches.
- **Seeded per network:** two **favoured** cards come up 2.5 times as often, and a **style** weights the modifiers.
  Two networks' tickers read differently.
- **Missing one costs nothing.** Prices move both ways while you play.

## 2. The cards

| Owner | Card | Line | Does |
|---|---|---|---|
| Halcyon | **Premium review** | *ACTUARY is repricing. Live code is wanted for the model.* | One code ×1.6 at Halcyon, 20 min |
| | **Rent day** | *Rent day. Every lease is Halcyon-guaranteed.* | Cipher ×1.4 at Halcyon, 20 min |
| | **Small print** | *Claims arising from failure of the underlying system are excluded.* | Cipher ×0.7 at Halcyon, 20 min |
| Kestrel | **Rack closure** | *Rack 4 will close at the end of this cycle. Please collect your belongings.* | Components ×1.6 at Kestrel, 20 min |
| | **Thermal alarm** | *The north aisle is running warm. Kernel code is wanted for the tuning.* | Kernel ×1.6 at Kestrel, 20 min |
| | **Insured lots** | *Corvid Exchange lists insured lots. Settlement guaranteed.* | One code ×1.5 at Kestrel, 30 min |
| LANTERN | **Census** | *Four. Nine. Nine. Census tonight. Worm carries the count.* | Worm ×1.5 at LANTERN, 25 min |
| | **Beacon repair** | *The Bedrock beacon is quiet. Parts, please.* | Components ×1.5 at LANTERN, 20 min |
| NULL CHOIR | **Open mic** | *Bring us anything. We pay fair, which is more than they do.* | Kernel ×1.5 at NULL CHOIR, 20 min |
| | **Rehearsal** | *Send us TOLLGATE's code. We're learning the words.* | Cipher ×1.5 at NULL CHOIR, 20 min |
| | **Rollback night** | *Everyone's dead and still paying. Funny, isn't it? Let it roll back.* | Components ×0.7 everywhere, 30 min |
| GLASSJAW | **Report auction** | *Today's count, signed by INIT. Bids open.* | Exploits ×1.8 at GLASSJAW, 20 min |
| | **Sink clearance** | *Whatever falls to the Sink, I buy. Kernel first.* | Kernel ×1.5 at GLASSJAW, 20 min |
| | **Early word** | *Three prices move in the next twenty minutes. I know which.* | Three flickers (×1.3 or ×0.75) across the hubs, 20 min |
| | **Claim files** | *Annick Life's claim files are moving to the Sink.* | Exploits ×1.5 at GLASSJAW, 25 min |
| City Treasury | **Tax run** | *Tax rolls clearing. Expect delays on all other accounts.* | Every hub ×1.15 for everything, 20 min |
| Pellucid Payroll | **Wage run** | *A month of the city's wages, still settling.* | Worm ×0.8 everywhere, 30 min |
| Crews | **TOLLGATE's run**, **SWARMLINE's rental**, **PALEMASK's harvest** | *(the crew on #net)* | The built Outbreak: its family's strays surge and drop double code, 30 min; that code ×0.8 everywhere |

## 3. Modifiers, orders and rare cards

- **Modifiers**, on two cards in five, weighted by the network's style: **Rushed** (half as long, half again as big),
  **Lingering** (twice as long, half as big), **Wide** (a second hub posts it too), **Leaked** (GLASSJAW's early word
  puts it on the Log five minutes ahead), **Quiet** (no Log line; only the hub's tag shows it).
- **A bulk order:** three price cards in ten carry one, 20–60 code, 40–120 components or 2–6 Exploits. It holds the
  card's price until it's filled or the card ends: a unit sold into it takes nothing off the price.
- **Two buyers:** two rival hubs bid ×1.4 for one ware at once (Halcyon and GLASSJAW, GLASSJAW and LANTERN, Kestrel and
  NULL CHOIR, Halcyon and NULL CHOIR).
- **A corner:** a runner buys up one code at their hub (×1.4, 10 min), on #net: *buying every kernel lot at kestrel.
  sell me yours*
- **Rare cards:** each network holds two of five, each once a playthrough (market.md 5, *Rare cards*), price effects
  only.

## 4. On the screen (mock-ups; pick one)

The card's line goes to the Log in every option. In the hub's market window:

- **A, the tag:** the card replaces the world event's tag in the window's head (▲, its name, minutes left); the bulk
  order is a chip on the ware's price (*31 wanted*).
- **B, the strip:** a thin amber line under the ware's row: the card, the order (*Kestrel buys 31 more at 26*), minutes
  left and a bar.
- **C, the wire:** every live card on the net above the table, this hub's first: the ware, its name, what it does and
  where, minutes left and a bar. A crew's run in red.

## 5. Building it

One slice: the cards, favoured cards and style from the seed, modifiers, bulk orders, two buyers, corners, the rare
cards; price tooltips naming their causes; the Log lines; the picked look; the world event and the shock removed.
Saved: the live cards and the rare cards left. A unit test on fixed seeds: two networks' tickers differ, and no card
takes a price past ×2.5 or under ×0.4.
