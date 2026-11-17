# Outposts: faction markets on every floor

**Status.** A concept, prototyped November 2026; not built. The numbers come from a scratchpad simulation (100 network
seeds × 20 logged-on hours), and the looks from mock-ups drawn on the real floor map. Building it re-measures both.

**Decided (the designer, November 2026).**
- Factions hold **outposts**: markets beside the servers, on every floor. A market can't be taken. Faction servers stay
  as they are (taken like any server: its vault, then its Resident).
- Each outpost rolls a **quality** from its owner: what it reliably wants, what it's prone to, and how hard it swings.
  Events push it to its extremes.
- Activities pay mostly one thing (market.md, *What pays what*); outposts are where it sells.
- All five balances below.
- **Exploits may pay best**, as the hardest and riskiest ware to get: they come from the Exfil, elites, guard posts and
  raids, and sell best on black markets.
- **Siding buys knowledge:** members' word (section 5).
- **A transfer can be lost** (section 7). A risk the player is shown and chooses isn't loss aversion; nothing is lost
  that the player didn't stake.
- **The marker is C:** a small hub (section 7).
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

## 3. Qualities

A quality is what an outpost is like, in five parts, all fixed by the seed:

| Part | What it sets |
|---|---|
| **Wants** | What it always pays more for (×1.2–1.7): the part you can count on |
| **Gluts** | What it has too much of and pays less for (×0.6–0.75) |
| **Prone to** | The event that comes to it three times as often: a spike on its top want, a raid, or a dump |
| **Swing** | How far its events push it: **steady** ×1.3, **lively** ×1.5, **wild** ×2 (and a wild one's dumps go to ×0.5) |
| **House rules** | Its owner's bans (section 6); a squat bans nothing |

| Quality | Owners | Wants; gluts | Prone to | Swing | Line |
|---|---|---|---|---|---|
| Claims backlog | Halcyon | Cipher ×1.4 | Spikes | Steady | *The claims queue has not been empty since 2079.* |
| Actuarial floor | Halcyon | Kernel ×1.3, Worm ×1.2 | Spikes | Lively | *ACTUARY prices every policy on live code.* |
| Night shift | Kestrel, Halcyon | Exploits ×1.6 (banned: the black market) | Spikes (audits) | Wild | *Twelve-hour shifts, and an audit at the end of every one.* |
| Overheating racks | Kestrel | Kernel ×1.7, components ×1.2 | Spikes (thermal alarms) | Lively | *The north aisle has run warm for a decade.* |
| Spares cage | Kestrel, LANTERN | Components ×1.6 | Dumps (a closed rack's parts) | Wild | *Every rack that closes comes through here for parts.* |
| Thin bandwidth | LANTERN | Worm ×1.5 | Spikes (a census) | Steady | *One line out, shared by four hundred households.* |
| Relay office | LANTERN, Kestrel | Worm ×1.4 | Raids | Lively | *Every message on the floor passes this desk.* |
| Dead beacon | LANTERN | Components ×1.6, Worm ×1.1 | Raids | Lively | *The beacon went quiet in the Cascade. They are still rebuilding it.* |
| Black budget | GLASSJAW | Exploits ×1.5 | Raids | Lively | *Nothing here appears in any ledger.* |
| Sink buyer | GLASSJAW | Kernel ×1.4; components ×0.75 | Dumps | Wild | *Whatever falls to the Sink, this desk buys.* |
| Scrap economy | NULL CHOIR | Cipher ×1.3; components ×0.6 | Raids | Lively | *Everything here was built from something else.* |
| Rehearsal room | NULL CHOIR | Cipher ×1.5 | Spikes | Steady | *They're learning TOLLGATE's code by heart.* |
| Workshop | NULL CHOIR, GLASSJAW | Components ×1.5 | Spikes | Lively | *They build their rigs out of what you break.* |
| Open squat | NULL CHOIR, LANTERN | Exploits ×1.2; bans nothing | Raids | Wild | *No rules, no names, no questions.* |

Its tooltip, in WoW's grammar: *Overheating racks. Outpost quality. Pays ×1.7 for Kernel code and ×1.2 for
components. Prone to thermal alarms, which push Kernel higher. Lively.* Then, muted: *▸ Bring Kernel code; more when
the alarm sounds.*

Measured, an outpost's top want against base, eight times in ten: a **steady** one ×1.4–1.5, past ×2 2% of the time; a
**lively** one ×1.3–1.7, past ×2 7%, at most ×2.9; a **wild** one ×1.2–1.6, past ×2 7%, at most ×3.2, and it's the one
that crashes.

## 4. Events

One every 20–40 logged-on minutes, from the ticker's cards (market.md 5). The director picks the kind, then an outpost:
one prone to that kind three times as likely, one on a floor you've reached three times as likely.

| Event | Share | Does |
|---|---|---|
| **Spike** (the quality's card: a rack closing, a census, an audit) | 60% | Its top want × its swing, need doubled, 60 min |
| **Raid** (a rival hits it) | 30% | Every want ×1.8 (×2 wild), need tripled, 75 min; reaching the desk is a fight |
| **Dump** (a crew unloads a ware) | 10% | Its glut (or top want) ×0.65 (×0.5 wild), 60 min |

## 5. Risk and profit

The risks are time, a fight, rep, and goods you send by transfer. The screen shows each one before you commit, and
only a transfer you chose to send uninsured can lose what you own.

| Risk | What it costs | What it pays | On the screen |
|---|---|---|---|
| **A raid's fight** | Lose it (about 1 in 4 at your level) and you top up Signal and spend 5 minutes reconnecting; the raid may end first | ×1.8–2 and three times the need | The raiders' level in WoW colours on the card |
| **The black market** | 2 rep with the owner each 140 credits' worth: your cut there rises a tier for every 25, and your own faction's black market costs your patron | A banned ware at the outpost's want | The rep cost on the event strip |
| **A wild outpost** | A dump can halve it while you're bringing goods | Up to ×3 on a spike | Its swing on the tooltip |
| **The window** | You farm for a spike; it ends, or the need fills, before you sell | The spike's price | Minutes left and the need bar |
| **A bare transfer** | About 8% a lot that it's intercepted, and the lot is gone | Selling from anywhere, now, at today's price | The chance on the order |
| **Exploits** | The Exfil, elites and guards are the hardest fights; the best buyers are black markets | The best price per hour of any ware | — |

**Members' word** (siding): your commission's outposts post their spikes and raids to your Log 15 minutes before they
start, and their need bars show live from anywhere. Anyone else's show their quality, and their need only after you've
connected this session.

## 6. The five balances

| Balance | Rule |
|---|---|
| **Need** | Each outpost takes only so much (section 2), so a big haul goes to several |
| **In person or by transfer** | In person you connect to it, about 2 minutes a stop, and nothing can go wrong. A transfer sells from anywhere, now, with a shown chance it's intercepted (section 7) |
| **Rep** | Your cut by rep tier with the owner: 20%, 15%, 10%, 5% |
| **Contraband** | Halcyon and Kestrel ban Exploits at their outposts, LANTERN Cipher code. A banned ware sells on the outpost's black market at its want: the fence takes 15%, and each 140 credits' worth costs 2 rep with the owner. A squat bans nothing |
| **Raids** | A raided outpost wants the most (section 4), and you fight your way to its desk |

## 7. Transfers

Selling in person means stopping what you're doing. A **transfer** sells from wherever you are, at today's price, and
pays when it lands (10 minutes, plus 3 a floor down). On the way it can be **intercepted**, and the lot is gone.

| Risk to a lot | Adds |
|---|---|
| Any transfer | 2% |
| Each floor below the first | 1.5% |
| A raid on the outpost's floor | 4% |
| Contraband | 8% |
| Its size | 2% a 1,000 credits, up to 6% |

- **The chance shows on the order** before you send, and a lot averages about 8%. A raided desk takes no transfers.
- **Halcyon's cover:** 10% of the lot up front, 90% back if it's lost. Halcyon won't cover contraband.
- So each lot is a choice: in person (your time, no risk), covered (a sure 10% less), or bare (the most, now and then
  nothing).

Measured, the bold follower on floors 1–4, by how often it stops to sell in person:

| Sells | Stops every 45 min | Stops every 90 min |
|---|---|---|
| In person only | 680 an hour | 641 |
| Covered transfers | 671 | 674 (×1.05) |
| Bare transfers | 700 (×1.03) | 710 (×1.11); a lot of 200+ credits lost about once in 17 hours |

Transfers pay most to a player on long runs, and bare ones pay most of all, for a loss you see coming.

## 8. Measured

100 seeds × 20 hours, trading on floors 1–4. An ordinary hour (the level-12 bot) is 190 credits, 15 code, 14
components and 0.4 Exploits; an hour of one activity pays that much at base prices, all in its ware. A raid's fight is
lost 1 time in 4.

| Player | Credits an hour | |
|---|---|---|
| Sells at hubs only (today) | 506 | ×1.00 |
| Ordinary play, sells at the best markets | 531 | ×1.05 |
| Follows the market, safely: each hour the activity whose ware pays best, no raids, no black market | 656 | ×1.30 |
| Follows the market, boldly: raids and black markets too | 705 | ×1.39 |

- **Bold pays about 7% over safe,** for about one raid fight every three hours and 0.7 rep an hour.
- **Deeper pays more.** The bold follower against ordinary play: ×1.27 on floors 1–2, ×1.33 on 1–4, ×1.36 on 1–7.
- **Always a profit somewhere.** Every ware has a market paying ×1.23 its base or more after a cut, 90% of the time.
- **One ware wears out.** Farming one ware, hour 2 to hour 6: Cipher 554 to 470 an hour, Worm 515 to 367, Kernel 556
  to 463, components 595 to 473, Exploits 784 to 612. The follower rotates: Exploits 30% of its hours, components 22%,
  Kernel 21%, Cipher 17%, Worm 11%.
- **Siding barely moves the price** (+1–3%, even with no cut at your own faction), so it pays in knowledge instead.
  Members' word isn't simulated yet.

## 9. On the screen

- **The map marker (C, picked):** a small hub hanging off its server by a dotted line: its owner's mark in a diamond in
  the owner's colour, its top want as an amber badge, the quality as its name. ▲ by the badge marks a spike, a dashed
  red ring a raid.
- **The card:** the owner and *outpost*, the quality as its title, the host name and floor, the event strip (amber; red
  for a raid; the black market's rep per unit), what it buys (price after your cut, the ▲ multiplier, a need bar), rep
  pips and your cut, Connect.
- **The sell list:** one ware's markets on floors you've reached, best first, each with its floor, price, ▲ and need
  bar, a raid's ⚔. It lives in the market's order ticket, which already shows the same order at other hubs.

## 10. Open

- Hubs roll a quality per network, or keep today's fixed conditions?
- Do hubs ban too? Halcyon's hub buys Exploits today.
- The phone's map and card.

## 11. Building it

One slice a session, after the activities' pay (market.md M6). Outposts and qualities come from the seed; only needs
and events are saved.

| # | Slice | Builds | Saved |
|---|---|---|---|
| O1 | **Outposts** | The wider gap between servers (with a phone audit before and after); the nodes on the floor map, owners, qualities, the card; selling in person with need, refill and your cut | `s.outposts` (needs) |
| O2 | **Events** | Spikes, raids (the fight to the desk) and dumps from the ticker's cards; members' word | The live events |
| O3 | **Contraband** | Bans and the black market | — |
| O4 | **Transfers** | Selling by transfer from anywhere, its risk on the order, Halcyon's cover, interception | Lots in transit |
| O5 | **The sell list** | In the order ticket | — |
