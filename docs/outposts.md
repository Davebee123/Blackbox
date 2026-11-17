# Outposts: faction markets on every floor

**Status.** A concept, prototyped November 2026; not built. The numbers come from a scratchpad simulation (100 network
seeds × 20 logged-on hours), and the looks from mock-ups drawn on the real floor map. Building it re-measures both.

**Decided (the designer, November 2026).**
- Factions hold **outposts**: markets beside the servers, on every floor. A market can't be taken. Faction servers stay
  as they are (taken like any server: its vault, then its Resident).
- Each outpost rolls a **quality** from its owner: what it reliably wants, or has too much of. Events push it to its
  extremes.
- Activities pay mostly one thing (market.md, *What pays what*); outposts are where it sells.
- All five balances below.
- **Servers spread further apart** to make room: neighbours about 180 map units apart, from 132 (floors.mjs
  `FLOOR.gap`). The map pans, and labels keep their size.
- Of market.md, only the ticker's cards stay, as the events here. Sway, INIT's count and the rest of the Charter are
  shelved.

## 1. The loop

1. An activity pays a lot of one ware.
2. Each outpost on a floor you've reached wants its own wares, and an event pushes one to an extreme now and then.
3. You connect to the best few and sell until their need fills. It refills over 6 hours of play.

## 2. Outposts

- **Where.** Floor 1 has 3, floor 2 3–4, floor 3 4, floors 4–8 4–5: about 34 a network. Each hangs off a server like a
  hub, from the network's seed.
- **Owner.** Weighted by floor: a hub's faction twice on its own floor, the floor holder three times, Halcyon thinning
  out below floor 2, GLASSJAW and NULL CHOIR thickening from floor 5.
- **Size.** Small (45%), medium (40%) or large (15%): how much it needs.
- **Need.** A want's need is 150, 270 or 450 credits' worth at base (a hub's 540); every other ware 30% of that,
  at base price. A unit pays base × its want × (0.55 + 0.45 × the share of the need left), less your cut.
- **Hubs** roll a quality from their owner too, so each network's hubs want different things (today's are fixed).

| Quality | Owners | Wants | Line |
|---|---|---|---|
| Claims backlog | Halcyon | Cipher ×1.4 | *The claims queue has not been empty since 2079.* |
| Actuarial floor | Halcyon | Kernel ×1.3, Worm ×1.2 | *ACTUARY prices every policy on live code.* |
| Night shift | Kestrel, Halcyon | Exploits ×1.6 (banned: the black market) | *Twelve-hour shifts, and an audit at the end of every one.* |
| Overheating racks | Kestrel | Kernel ×1.7, components ×1.2 | *The north aisle has run warm for a decade.* |
| Spares cage | Kestrel, LANTERN | Components ×1.6 | *Every rack that closes comes through here for parts.* |
| Thin bandwidth | LANTERN | Worm ×1.5 | *One line out, shared by four hundred households.* |
| Relay office | LANTERN, Kestrel | Worm ×1.4 | *Every message on the floor passes this desk.* |
| Dead beacon | LANTERN | Components ×1.6, Worm ×1.1 | *The beacon went quiet in the Cascade. They are still rebuilding it.* |
| Black budget | GLASSJAW | Exploits ×1.5 | *Nothing here appears in any ledger.* |
| Sink buyer | GLASSJAW | Kernel ×1.4; components ×0.75 | *Whatever falls to the Sink, this desk buys.* |
| Scrap economy | NULL CHOIR | Cipher ×1.3; components ×0.6 | *Everything here was built from something else.* |
| Rehearsal room | NULL CHOIR | Cipher ×1.5 | *They're learning TOLLGATE's code by heart.* |
| Workshop | NULL CHOIR, GLASSJAW | Components ×1.5 | *They build their rigs out of what you break.* |
| Open squat | NULL CHOIR, LANTERN | Exploits ×1.2; bans nothing | *No rules, no names, no questions.* |

## 3. Events

One every 20–40 logged-on minutes, from the ticker's cards (market.md 5), each landing on an outpost it fits:

| Event | Share | Does |
|---|---|---|
| **Spike** (the quality's card: a rack closing, a census, an audit) | 60% | Its top want ×1.5 and its need doubled, 60 min |
| **Raid** (a rival hits it) | 25% | Every want ×1.4 and its need doubled, 45 min; reaching the desk is a fight |
| **Dump** (a crew unloads a ware) | 15% | That ware ×0.6, 60 min |

## 4. The five balances

| Balance | Rule |
|---|---|
| **Need** | Each outpost takes only so much (section 2), so a big haul goes to several |
| **In person** | You sell at an outpost by connecting to it: about 2 minutes a stop. Hubs keep their file transfers |
| **Rep** | Your cut by rep tier with the owner: 20%, 15%, 10%, 5% |
| **Contraband** | Halcyon and Kestrel ban Exploits at their outposts, LANTERN Cipher code. A banned ware sells on the outpost's black market at its want: the fence takes 15%, and each 140 credits' worth costs 2 rep with the owner. A squat bans nothing |
| **Raids** | A raided outpost wants the most (section 3), and you fight your way to its desk |

## 5. Measured

100 seeds × 20 hours, trading on floors 1–4. An ordinary hour (the level-12 bot) is 190 credits, 15 code, 14
components and 0.4 Exploits; an hour of one activity pays that much at base prices, all in its ware.

| Player | Credits an hour | |
|---|---|---|
| Sells at hubs only (today) | 503 | ×1.00 |
| Ordinary play, sells at the best markets | 524 | ×1.04 |
| Also raids and black markets | 529 | ×1.05 |
| Follows the market: each hour, the activity whose ware pays best, then sells | 648 | ×1.29 |

- **Deeper pays more.** Following the market against ordinary play: ×1.17 on floors 1–2, ×1.24 on 1–4, ×1.27 on 1–7.
- **Always a profit somewhere.** Every ware has a market paying ×1.23 its base or more after a cut, 90% of the time.
- **One ware wears out.** Farming one ware, hour 2 to hour 6: Cipher 539 to 426 an hour, Worm 504 to 347, Kernel 521
  to 415, components 556 to 431, Exploits 700 to 534. The follower rotates: Exploits 30% of its hours, components 26%,
  Kernel 18%, Cipher 16%, Worm 10%.
- **Siding barely moves trade:** +1–3%, even at the top tier with no cut at your own faction. Commission, retainer and
  receipts stay the reasons to side.
- **The black market** costs the follower about 0.6 rep an hour.

## 6. On the screen (mock-ups; pick one marker)

- **The map marker**, hanging off its server by a dotted line in its owner's colour:
  - **A**: a small diamond, the quality as its name, ▲ and what it wants under it;
  - **B**: the diamond and its wants as ware icons with ▲, no words;
  - **C**: a small hub, the owner's mark inside, its top want as a badge.

  ▲▲ marks a spike, a dashed red ring a raid, ▼ a glut.
- **The card:** the owner and *outpost*, the quality as its title, the host name and floor, the event strip (amber; red
  for a raid; the black market's rep per unit), what it buys (price after your cut, the ▲ multiplier, a need bar), rep
  pips and your cut, Connect.
- **The sell list:** one ware's markets on floors you've reached, best first, each with its floor, price, ▲ and need
  bar, a raid's ⚔. It lives in the market's order ticket, which already shows the same order at other hubs.

## 7. Open

- Rep's cut alone doesn't make siding pay in trade. Keep it, or give a faction's members something more?
- Exploits lead the follower's picks on 44 seeds in 100.
- Hubs roll a quality per network, or keep today's fixed conditions?
- Do hubs ban too? Halcyon's hub buys Exploits today.
- The phone's map and card.

## 8. Building it

One slice a session, after the activities' pay (market.md M6). Outposts and qualities come from the seed; only needs
and events are saved.

| # | Slice | Builds | Saved |
|---|---|---|---|
| O1 | **Outposts** | The wider gap between servers (with a phone audit before and after); the nodes on the floor map, owners, qualities, the card; selling in person with need, refill and your cut | `s.outposts` (needs) |
| O2 | **Events** | Spikes, raids (the fight to the desk) and dumps from the ticker's cards | The live events |
| O3 | **Contraband** | Bans and the black market | — |
| O4 | **The sell list** | In the order ticket | — |
