# The market: a seeded economy the director runs

**Status.** Proposed November 2026, not built. The numbers come from a prototype (a scratchpad simulation of this
design over 200 network seeds × 40 logged-on hours, the cast's eight runners and you in it); building it re-measures
them. Today's market (GAME_RULES *Markets*) is the floor this builds on: wares, the spread, pressure, transfers.

**Decided (the designer, November 2026).**
- **The market moves both ways while you play.** Nothing moves while you're away, so *No entropy* and no loss aversion
  guard the time you're logged off. While you're logged on, prices fall as well as rise and factions gain and lose
  ground. Rep is yours and the market never touches it, and no hub ever shuts.
- **No faction dominates.** In Starsector with Nexerelin, one faction can snowball across the sector. Here a faction's
  lead feeds two others, and the lead turns.
- **Lore first.** Every mover has a reason in the fiction (lore.md) and speaks in its owner's voice.
- **A short-handed faction pays more credits for its contracts** (never XP), and siding with a faction keeps its own
  rewards (section 3, *Pay*).
- **Also decided:**
  - no institution ever freezes;
  - INIT's count shows as a small bar at the network map's top right;
  - Halcyon stays slightly the largest;
  - sway never changes which servers a faction owns;
  - wick says nothing when the tide turns.

## 1. The shape

| Layer | Rolled | What it is |
|---|---|---|
| **The Charter** | Once, from the network seed | The network's market: each hub's standing, the institutions that trade on it, its deck of cards and their variants, its temper, its first tide |
| **Sway and the tide** | Logged-on time | Each faction's share of the net. A slow lean (the tide) turns every 8–16 hours. Each faction's lead shows its cost, and the cost feeds two others |
| **INIT's count** | Logged-on time | The process table's fill, the lore's heartbeat: orphans raise it, clean kills lower it |
| **The ticker** | The director, every 20–40 minutes | Market cards: faction moves, institutions, crews' runs, cancel rounds |

The market's state lives on `s.market` beside today's fields, each part made on first use. The Charter is never saved:
it comes from the seed, like the signature (network.mjs), on a sub-seed of its own so the signature's rolls (natives,
lean, rich code) stay as they are. The ticker rolls the director's own dice, so it never shifts the game's.

## 2. The Charter: what the seed picks

| Pick | From | Per network |
|---|---|---|
| **Standings** | Each hub draws one of its three (below) | 243 combinations |
| **Clients** | Two of the four living institutions (lore.md 8.1) | Their cards join the deck |
| **Ghost** | One of the four frozen ones | Its card joins the deck |
| **Deck** | Each faction's cost card, and two of its three ordinary moves | Which moves this net sees |
| **Variants** | Each card's code, size and length, within its own range (a price card ×1.4–1.8, 15–30 min) | One network's Premium review wants Kernel, another's Cipher |
| **Temper** | Steady, restless or jittery | Cards ×0.7, ×1 or ×1.3 as big |
| **First tide** | One faction | Who the net leans to first |
| **Dispositions** | Each faction Bold (1 in 4), Steady (2 in 4) or Careful (1 in 4) | Its office on this network: Bold moves half again as often, a fifth bigger, and its cost comes due half again as fast; Careful 0.7×, 0.9× and 0.6× |
| **Favoured moves** | Two of the deck's ordinary moves | Each comes up 2.5 times as often (the signature's favoured cards, for the market) |
| **Style** | Plain, leaky, quiet or contested | The modifier its cards lean to (section 5) |
| **Rare cards** | Two of five | Each once a playthrough (section 5) |
| **Scarcity** | The signature's lean | Its commonest code ×0.97, the middle one ×1, its rarest ×1.12 |

### Standings

A hub's standing is its lasting reason to pay over the odds (today's `HUB_CONDITION`, one each, becomes one of three).
Two built numbers ease so the market can move them: Kestrel's racks ×1.8 to ×1.4, LANTERN's bandwidth ×1.45 to ×1.4.

| Hub | Standing | Pays | Why |
|---|---|---|---|
| Halcyon | Claims backlog (built) | Cipher ×1.35 | Buried in ransomware claims, it pays to study the code. |
| | Model retraining | Cipher ×1.2, Kernel ×1.2 | ACTUARY is learning a deeper floor. |
| | Reserve call | Cipher ×1.15, Exploits ×1.2 | The Guarantee needs reserves, and Exploits hold their value. |
| Kestrel | Overheating racks (built) | Kernel ×1.4, components ×1.15 | Kernel code tunes the CPUs; components patch the cooling. |
| | Cooling failure | Components ×1.4, Kernel ×1.15 | The north aisle's chillers are failing. |
| | Reprovisioning | Kernel ×1.3, Worm ×1.1 | Old Kessler racks, reflashed for new tenants. |
| LANTERN | Thin bandwidth (built) | Worm ×1.4 | Its relay is starved, and Worm code carries its traffic. |
| | Beacon repairs | Worm ×1.2, components ×1.3 | Its beacons to Bedrock need parts. |
| | Long count | Worm ×1.3, Cipher ×1.15 | It counts TOLLGATE's orphans one by one. |
| NULL CHOIR | Scrap economy (built) | Components ×0.6, Cipher ×1.15 | It lives on components and has more than it needs. |
| | Fair trade | Every code ×1.1 | It trades fair with anyone who does the same. |
| | Hymnal | Cipher ×1.3 | It learns TOLLGATE's code to roll it back. |
| GLASSJAW | Black budget (built) | Exploits ×1.5 | It buys every Exploit it can, no questions. |
| | Sink buyer | Exploits ×1.3, Kernel ×1.15 | It buys what ends up in the Sink. |
| | Archive drive | Exploits ×1.25, Cipher ×1.15 | It buys claim files by the crate. |

## 3. Sway: who has the net's ear

Each faction holds a share of the net, five numbers that add up to 100. Its **baseline** is its natural size:
Halcyon 21 (it insures half the net), Kestrel 20.5 (it owns the hardware), LANTERN, NULL CHOIR and GLASSJAW 19.5. The
tide's faction gets 3 more.

| What moves it | Points |
|---|---|
| Your sale at a hub | +0.25 to that hub |
| A contract you deliver | +0.6 to the faction that posted it |
| A receipt you stamp | +0.6 to the stamp's faction: File (Halcyon), Seal (Kestrel), Settle (LANTERN), Roll back (NULL CHOIR), Sell (GLASSJAW). Each receipt is one trade's answer |
| A feud won, a defence call held or lost | +2.5 to the side you won for, −2.5 to the other; ±1.25 to the call's owner (not in the prototype) |
| A runner's sale, a runner's job | +0.25 to the hub they sell at; +0.1 to their paymaster |
| A card | ±1.9 to ±3.75 (section 5), times the temper. A gain shrinks to half once its faction holds over 27% of the net, and to a quarter over 30% |
| Drift | Each hour, a third of the gap back to its baseline |
| The web | Each hour, 90% of a faction's excess over its baseline goes to the two it feeds |

### Need: a hub pays for what it lacks

A faction below its baseline pays more; above it, less: **need = 1 + 0.7 × (baseline − sway) ÷ baseline**, plus 0.6 ×
the excess of each faction that feeds it (as a share of that faction's baseline), kept to 0.6–1.6. It counts most on
the faction's own good (need to the power 1.4), the ware its supply order wants (economy.md 3): Halcyon Cipher, Kestrel
Kernel, LANTERN Worm, NULL CHOIR components, GLASSJAW Exploits. On everything else it buys it counts lightly (to the
power 0.4). The runners and you sell where a faction is short, and that brings it back toward its share.

### Pay: follow the need, or back a side

| Rule | Does |
|---|---|
| **Need pays credits** | A faction's contracts pay its need over 1 as a credits premium, up to +40%, never XP and never under par. It's set when the offer posts and kept until you deliver, like the XP. |
| **A short-handed board** | A faction's share of the offers on the board weighs by its need squared, so the factions that need work post more of it. |
| **Halcyon's line** | Its kill work (Kill, Grind, Strain, Named process) pays up to +20% more credits as the count climbs from 88% to 95%: it needs the table under the line. |
| **The patron's share** | Your commission's retainer rises with your patron's lead: +1.5 × its sway over its baseline (as a share of the baseline), up to +30%. Backing a side pays when it rises, and your work is what raises it. |
| **Siding, as built** | Rep tiers (shops, chase lines), receipts and set pieces, defence calls at ×1.5, the stance. A mercenary spreads that rep thin. |

Measured (section 8): a loyal player's credits come out ×1.03, a mercenary's ×1.05. Mercenaries also steady the market:
the faction that leads most holds it 43% of the time against 49%.

### The web: each answer's cost feeds two others

The five answers to *what should happen to the frozen payments* (lore.md 3) each carry a cost. When one leads, its
cost shows, and the cost makes two other answers' case. Each feeds two and is fed by two, so no answer wins for long.

| When this leads | Its cost | Feeds |
|---|---|---|
| **Hold** (Halcyon) | The table fills while it waits, and the wait makes people angry | NULL CHOIR (*let it roll back*), Kestrel (*wall it off*) |
| **Roll back** (NULL CHOIR) | Savings go with the debts | Kestrel (protect the living net), GLASSJAW (it sells proof of what was lost) |
| **Seal** (Kestrel) | The floors below are abandoned | GLASSJAW (it buys what sinks), LANTERN (its beacons speak for those below) |
| **Sell** (GLASSJAW) | INIT's reports go to the highest bidder | LANTERN (a leak shows who was owed), Halcyon (fear sells the Guarantee) |
| **Settle** (LANTERN) | Slow, and someone decides who was owed | Halcyon (every dispute is a claim), NULL CHOIR (the debts are old and their holders dead) |

**The cost comes due.** Each faction's deck holds its cost card (section 5), weighted 0.15 + 1.5 × *due*. Due grows by
1 an hour while the faction leads. On top, it moves by 3 × (its excess over its baseline as a share of the baseline,
less 5%) an hour: up while the faction sits well over its share, down while it doesn't. The card resets it.

**The tide.** Every 8–16 logged-on hours the tide turns to whichever of the two its faction feeds holds more sway, so
your play steers it. Its faction's line goes to the Log:

| Tide | Line |
|---|---|
| Halcyon | *Cover is available on all accounts. Settlement will follow in due course.* |
| Kestrel | *New tenancies are open on the upper racks. Rates on application.* |
| LANTERN | *Four. Nine. Nine. The city is counting with us.* |
| NULL CHOIR | *Louder now. Everybody sing.* |
| GLASSJAW | *Everyone's buying. I'm selling.* |

## 4. INIT's count

The process table's fill, *process table at N%*, one number a save, 80–86% at the start. It's the lore's pulse: the
table is filling again, Halcyon pays crews like LOWLIGHT to keep it under the line, and every clean kill frees a slot.
It never reaches 100%: that was the Cascade. The story's pages keep their own numbers (81% on floor 2's schedule, 99%
at the Cascade); this is today's.

### What moves it

| Up | Points | Down | Points |
|---|---|---|---|
| Orphans piling up | +5 an hour, up to half again while Halcyon holds more than its share | Your kills | −0.035 each (70 an hour: −2.5 an hour) |
| A crew's run | +3 | A runner's job | −0.02 (the eight of them: about −1 an hour) |
| Account nine, the Margin call | +2 | Faction cards | −1 to −6: the schedule −6 (a crew's run follows, +3), a rollback night −5, a seal drill −4, a rack closure −3, LANTERN's drive −2, its census −1 |
| Pellucid's wage run | +3 | A cancel round, the moment it reaches 95% | −8 |
| | | The floor | Never under 70%: the oldest floors' trades never clear |

Your play is the brake: past about 115 kills an hour it falls on its own, under that it climbs.

### What it does: two bands

Between 80% and 88% nothing changes. Each band's effects grow from its edge to its end, so a count of 91.5% is half
a harvest.

| | **The harvest** (88% → 95%) | **The sale** (80% → 72%) |
|---|---|---|
| What it means | Orphans everywhere: strays crowd the servers and old ones surface | Room on the table: strays are scarce, and trades can finish |
| Code sells for | up to 15% less | up to 10% more |
| Outbreaks (double code from one family) | up to 2.5 times as often | as usual |
| ★ rare spawns | up to 25% more | as usual |
| Halcyon's kill contracts | up to +20% credits | as usual |
| Market cards | 1.4 times as often | 0.77 times as often |
| Runners' frozen payments | as usual | clear twice as fast |
| Cards that need it | the schedule and report auctions from 88%; INIT's warnings on the Log from 90% (the cold open's lines) | — |

A **cancel round** at 95% takes 8 off at once, ends the live market cards, and LANTERN reads the cancelled accounts:
Kessler's cancel job, run again (lore.md 1).

| Your play (prototype, 40 hours) | Harvest | Sale | Cancel rounds |
|---|---|---|---|
| Light, 30 kills an hour | 64% of the time | 1% | one in 4 hours |
| Normal, 70 | 38% | 13% | one in 13 hours |
| Heavy, 150 | none | 93%, near the floor | none |

**A session** (8 hours of normal play on a jittery network, whose cards hit 1.3 times as hard; from the prototype):
- **0–3h:** it climbs 81% to 85%: orphans +5 an hour, your kills −2.4, runners −0.9.
- **3:06:** Corvid's margin call (+2.6) and TOLLGATE's run (+3.9) take it to 92.5%: a harvest, and INIT's warnings.
- **4:34:** Halcyon's schedule (−6) with SWARMLINE's run (+3.9).
- **4:49:** PALEMASK's run reaches 95%: a cancel round, down to 87.5%.
- **5:10–5:59:** a rollback night (−5) and two rack closures (−3 each) take it to 78%: a sale.
- **6:47:** SWARMLINE's run (+3.9) brings it back to 84%. It ends at 86%.

**Where it shows:** a small bar at the network map's top right (the count, its two bands marked, the number in its
tooltip); LANTERN's line on the Log at each two points (*Four. Nine. Nine. The table is at eighty-eight.*); INIT's
warnings over 90%.

## 5. The ticker: market cards

A market card every 20–40 logged-on minutes, about two an hour, on its own clock and the director's dice. It never
counts toward the two-event limit, and several can run at once. Each speaks in its owner's voice (lore.md 8.2).
Sizes and lengths shown are typical; each network's Charter fixes its own variant (section 2).

### Faction moves

A faction acts more the further it sits from its baseline either way: strong ones press, weak ones scramble. **Cost**
marks the card that comes due (section 3).

| Faction | Card | Line | Does |
|---|---|---|---|
| Halcyon | **Premium review** | *ACTUARY is repricing. Live code is wanted for the model.* | One code ×1.6 at Halcyon, 20 min; +2.5 |
| | **The schedule** (88% and over) | *Settlement will follow in due course.* | A crew's run starts (below); the count −6; +2.5 |
| | **Guarantee drive** | *Every frozen payment will clear one day. Ask about cover.* | +3.75 |
| | **Small print** (cost) | *Claims arising from failure of the underlying system are excluded.* | −3.75; NULL CHOIR and Kestrel +1.9; Cipher ×0.7 at Halcyon, 20 min |
| Kestrel | **Rack closure** | *Rack 4 will close at the end of this cycle. Please collect your belongings.* | Components ×1.6 at Kestrel, 20 min; the count −3; +2.5 |
| | **Thermal alarm** | *The north aisle is running warm. Kernel code is wanted for the tuning.* | Kernel ×1.6 at Kestrel, 20 min |
| | **Rent review** | *Rents on the lower racks are under review.* | +3.75 |
| | **Seal drill** (cost) | *Floors below this one are closed to visitors until further notice.* | The count −4; −3.75; GLASSJAW and LANTERN +1.9 |
| LANTERN | **Census** | *Four. Nine. Nine. Census tonight. Worm carries the count.* | Worm ×1.5 at LANTERN, 25 min; the count −1 |
| | **Settlement drive** | *Account nine. Account ten. Account eleven. Settled.* | +3.75; the count −2 |
| | **Beacon repair** | *The Bedrock beacon is quiet. Parts, please.* | Components ×1.5 at LANTERN, 20 min |
| | **Disputed count** (cost) | *Correction. Account nine was paid to the wrong name.* | −3.75; Halcyon and NULL CHOIR +1.9 |
| NULL CHOIR | **Open mic** | *Bring us anything. We pay fair, which is more than they do.* | Kernel ×1.5 at NULL CHOIR, 20 min |
| | **Vigil** | *Another one for the dead account holders. Sing along.* | +3.75 |
| | **Rehearsal** | *Send us TOLLGATE's code. We're learning the words.* | Cipher ×1.5 at NULL CHOIR, 20 min |
| | **Rollback night** (cost) | *Everyone's dead and still paying. Funny, isn't it? Let it roll back.* | The count −5; components ×0.7 everywhere, 30 min; −3.75; Kestrel and GLASSJAW +1.9 |
| GLASSJAW | **Report auction** (over 88%) | *Today's count, signed by INIT. Bids open.* | Exploits ×1.8 at GLASSJAW, 20 min; +2.5 |
| | **Early word** | *Three prices move in the next twenty minutes. I know which.* | Three flickers (×1.3 or ×0.75) across the hubs, 20 min |
| | **Sink clearance** | *Whatever falls to the Sink, I buy. Kernel first.* | Kernel ×1.5 at GLASSJAW, 20 min |
| | **Leaked report** (cost) | *Someone gave my report away. It was worth more than that.* | −3.75; LANTERN and Halcyon +1.9; Exploits ×0.8 at GLASSJAW, 20 min |

### Institutions and their arcs

A network's two clients and its ghost (the Charter) each bring a card, then an arc: a crisis, and a resolution that
goes to one of two factions, the one that needs it more seven times in ten. The winner takes +3.75 and its good ×1.3
at its hub for 20 min. Then the arc starts again. No institution ever freezes.

| Institution | Card | Line | Does |
|---|---|---|---|
| Corvid Exchange (alive, the Stacks) | **Insured lots** | *Corvid Exchange lists insured lots. Settlement guaranteed.* | One code ×1.5 at Kestrel, 30 min (its matching engine runs on Kestrel's racks); Kestrel +2.5 |
| Harrow Street Credit Union (alive, Backhaul) | **Members' vote** | *Harrow Street's members vote to fund the count.* | LANTERN +3.75 |
| City Treasury Office (half frozen) | **Tax run** | *Tax rolls clearing. Expect delays on all other accounts.* | Every hub pays ×1.15 for everything, 20 min |
| Tenements Board (alive, the Sprawl) | **Rent day** | *Rent day. Every lease is Halcyon-guaranteed.* | Cipher ×1.4 at Halcyon, 20 min; Halcyon +2.5 |
| Brandt & Vey (frozen, Bedrock) | **Account nine** | *Four. Nine. Nine. Brandt and Vey, account nine, still owed.* | The oldest orphans stir: the count +2; LANTERN +3.75 |
| Annick Life (frozen) | **Claim files** | *Annick Life's claim files are moving to the Sink.* | Exploits ×1.5 at GLASSJAW, 25 min; GLASSJAW +2.5 |
| Pellucid Payroll (frozen, the Sink) | **Wage run** | *A month of the city's wages, still settling.* | Worm strays stir: Worm ×0.8 everywhere, 30 min; the count +3; NULL CHOIR +2.5 |
| Kessler Systems (bankrupt) | **A farm wakes** | *KESSLER-FARM, still mining for an owner who died in the Cascade.* | Components ×0.75 everywhere, 30 min; Kestrel +2.5 (it was paid in Kessler's hardware) |

| Institution | The crisis | Line | Does | Ends with |
|---|---|---|---|---|
| Corvid Exchange | **Margin call** | *Corvid Exchange is selling lots below cost. Insured, of course.* | Kernel ×0.6 everywhere, 20 min; the count +2 | Kestrel or Halcyon takes it over |
| Harrow Street | **A run on the union** | *Members are queuing at Harrow Street.* | Worm ×1.5 at LANTERN, 20 min; LANTERN −2.5 | LANTERN holds it, or it joins the Guarantee (Halcyon) |
| City Treasury | **Audit** | *The Treasury is being audited. Copies are available.* | Exploits ×1.5 at GLASSJAW, 20 min | A write-off vote (NULL CHOIR) or the pension fund (LANTERN) |
| Tenements Board | **Arrears** | *Arrears notices are posted on every floor.* | Components ×0.8 everywhere, 20 min; NULL CHOIR +2.5 | Leases renewed (Halcyon) or a rent strike (NULL CHOIR) |
| Brandt & Vey | **The heirs** | *Brandt and Vey's heirs are selling their claim.* | Exploits ×1.5 at GLASSJAW, 20 min | Account nine settles (LANTERN) or is sold (GLASSJAW); the count −3 |
| Annick Life | **The policyholders' letter** | *Annick Life's policyholders have written to Halcyon. Again.* | Halcyon −2.5, LANTERN +2.5 | Halcyon buys the files back, or GLASSJAW sells them to the Sink |
| Pellucid Payroll | **The payday that never came** | *Thirty years late. Still pending.* | NULL CHOIR +2.5, LANTERN +1.25 | A month settles (LANTERN) or rolls back (NULL CHOIR); the count −4 |
| Kessler Systems | **The farm's ledger** | *Whose farm was it? GLASSJAW knows.* | GLASSJAW +2.5 | Kestrel claims the rack, or the Choir strips it (components ×0.6) |

### Crews' runs

TOLLGATE, SWARMLINE and PALEMASK have no paymaster. A run is the built **Outbreak** card with a crew's name: its
family's strays surge and their kills drop double code for 30 minutes, its code ×0.8 everywhere, the count +3. The
ticker deals them more often through the harvest (×1 at 88%, ×2.5 at 95%), and the schedule starts one.

| Crew | Run | Family |
|---|---|---|
| TOLLGATE | **TOLLGATE's run** | Ransomware: Cipher |
| SWARMLINE | **SWARMLINE's rental** | Worm: Worm |
| PALEMASK | **PALEMASK's harvest** | Ghostroot: Kernel |

### Modifiers and follow-ups

Two cards in five carry a modifier, weighted by the network's style:

| Modifier | Does |
|---|---|
| **Rushed** | Half as long, half again as big |
| **Lingering** | Twice as long, half as big |
| **Wide** | A second hub posts it too |
| **Leaked** | GLASSJAW's early word puts it on the Log five minutes ahead |
| **Quiet** | No Log line: only the hub's chip shows it, for whoever checks the markets |
| **Contested** | A rival answers at its own hub, smaller, and takes +1.25 |

When a card ends, the director remembers it (director.md 1). Sold into (10 units or more, by you or the runners): its
faction's **thanks**, +2.5. Unanswered: half the time it **comes back** a quarter bigger, once.

### Bulk orders and two buyers

- **A bulk order:** three price cards in ten at one hub are orders of 20–60 units, gone once filled. Runners fill about
  a third before an order closes; the rest is there for you. The hub shows how much is left.
- **Two buyers** (lore.md's built choice, threads.md 5): two rivals bid ×1.4 for one ware at once (Halcyon and
  GLASSJAW, GLASSJAW and LANTERN, Kestrel and NULL CHOIR, Halcyon and NULL CHOIR). Whoever you sell to takes the sway.

### Runner cards

- **A corner:** a runner buys up one code at their hub (×1.4, 10 min). On #net: *buying every kernel lot at kestrel. sell me yours*
- **A trade clears:** a runner's frozen payment comes through (runners.md *Someone's money*): +2.5 to their faction,
  the count −1, their line on #net. Twice as often under 80%.

### Rare cards

Each network holds two of the five, each once a playthrough.

| Card | Line | Does |
|---|---|---|
| **The original** (GLASSJAW) | *Ninety-one percent, the day before. I have the original. Make an offer.* | Exploits ×3 at GLASSJAW, 10 min; GLASSJAW +2.5 |
| **Rack zero** (Kestrel) | *Rack 0 is open for inspection. It has not been opened since 2041.* | Kernel ×0.6 everywhere and components ×1.5 at Kestrel, 30 min; Kestrel +2.5 |
| **Every name** (LANTERN) | *Four. Nine. Nine. Tonight we read every name.* | Worm ×1.5 at LANTERN, 30 min; the count −3; LANTERN +3.75 |
| **The long rollback** (NULL CHOIR) | *One whole floor of debts. We sang it back to nothing.* | The count −6; components ×0.6 everywhere, 30 min; NULL CHOIR +2.5 |
| **The Guarantee, renewed** (Halcyon) | *The Halcyon Guarantee is renewed for a further thirty years.* | Cipher ×1.5 at Halcyon, 30 min; Halcyon +3.75 |

**What it replaces:** the world event (market.mjs `EVENTS`, chosen by the wall clock, so every save has the same one
at the same moment) and the Market shock card: their moves now come from the ticker, with a reason. Flickers (blips),
pirate tips (the scanner) and your own selling's pressure stay as built.

## 6. Runners in the market

Runners already pick jobs from what their hub pays (runners.md, built November 2026). Here they become the market's
population:

- **They sell where it pays.** They read every hub and stay loyal to their own unless another pays 15% more. Each sale
  gives that hub +0.25 sway and presses its price 0.2% (yours press 4% a unit, as built).
- **They work for their paymaster.** Each job gives it +0.1 sway, and their clean kills lower the count.
- **They fill orders and corner codes.** A bulk order draws them, and a corner or a cleared trade is a card of
  their own (section 5).
- **They talk about it on #net:** a card (*kestrel's closing rack 4. kernel's up*), a tide, the count.
- **The cast leans each net.** Eight runners from the seed, so a network with three Kestrel runners has Kestrel's work
  done for it.

## 7. On the screen

Lean, in the designer's grammar: numbers, marks and tooltips. Each look gets two or three applet options before it's
built.

| Where | What |
|---|---|
| The hub's market (built ▲ ▼) | Each price's tooltip names what moved it: the standing, the hub's need, a card and its minutes left |
| Sway | A five-part bar in the factions' colours (the market window's head, the hub's menu), the tide's faction marked, numbers in its tooltip |
| The map | An amber ▲ on the glyph of each server whose family's code is dearest right now: where to farm |
| Contracts | A premium as an amber ▲ and its percentage on the offer's pay, the reason in its tooltip (*Kestrel is short-handed.*) |
| A bulk order | How many units are left, on the hub's price row |
| The network map's top right | INIT's count as a small bar, the harvest and sale bands marked, the number in its tooltip |
| The Log (the pager) | A card's line in its voice; LANTERN's count; the tide turning; a cancel round |
| The Network card | The Charter as you learn it: standings once you've seen the hub's market, institutions once their card has come, ??? until then (like the rich code) |
| #net | Runners reacting |

## 8. Measured

The prototype, 200 seeds × 40 logged-on hours, every layer on, normal play (70 kills an hour), you loyal to one
faction (a different one each seed). In brackets: loyal to Halcyon alone, the hardest case for dominance.

| Check | Result |
|---|---|
| Highest sway any faction reaches | 28% typical, 31% at most (31%) |
| A faction's range (5th to 95th percentile) | 15–25% |
| The lead changes hands | 2.8 times an hour (2.6); 2 on the slowest tenth of seeds (1.6) |
| The faction that leads most, by seed | 49% of the time typical, 73% at the 90th percentile (53%, 78%) |
| Time in the lead | Halcyon 29%, Kestrel 27%, NULL CHOIR 17%, LANTERN 15%, GLASSJAW 13% (Halcyon 49%) |
| Tide turns | 2.8 in 40 hours |
| INIT's count | 76% to 93% (5th to 95th percentile), 87% typical; harvest 38% of the time, sale 13% (48%, 8%) |
| Market cards | 2.5 an hour; a cancel round every 13 hours |
| Variety | 55 distinct cards a seed (card and modifier) in 40 hours, against 24 with only the moves, institutions and crews; the commonest card is 15% of a ticker; two seeds' tickers are 0.50 alike (cosine), against 0.57 |
| Follow-ups, orders, arcs | 5.4 thanks and 2.2 come-backs in 10 hours; 14 bulk orders a seed in 40 hours, runners filling a third; 2.9 arcs finished; a rare card about once in 48 hours |
| The dearest code | Changes 1.3 times an hour; on a seed, one code is dearest 65% of the time, 15% over the next (44% at the 90th percentile) |
| What your sales fetch | 5% more than today's market, with your own selling's pressure (0.64 against 0.61 of today's best prices) |

| You | Contracts pay | Retainer | Credit income |
|---|---|---|---|
| Loyal to one faction | ×1.03 | ×1.12 | ×1.03 |
| A mercenary (the neediest board) | ×1.13 | ×1.05 | ×1.05 |
| Loyal to Halcyon | ×1.05 | ×1.10 | ×1.03 |

Credit income weighs caches at half, contracts a third, the retainer the rest (GAME_RULES *Credits*).

## 9. Building it

One session a slice, each landing before the next. It's the economy's lane, so nothing else on the economy, factions
or the save runs beside it. Each slice ships lean: the rule, its mark and tooltip, a unit test, GAME_RULES and README.
A test on the engine keeps section 8's guardrails: on fixed seeds no sway over 33%, the lead turning, the value within
5% of today's.

| # | Slice | Builds | Saved |
|---|---|---|---|
| M1 | **The Charter and the ticker** | Standings, scarcity, institutions' first cards, crews' runs, replacing the wall-clock world event and the shock; price tooltips name their causes; runners read every hub | The ticker's cards |
| M2 | **Sway and pay** | Sway, need and the web; sales, contracts and receipts move it; need on prices and contract credits, a short-handed board, the patron's share; the sway bar | `s.market.sway` |
| M3 | **Moves and the tide** | Faction moves with variants, dispositions and favoured moves; cost cards; the tide; modifiers and follow-ups; bulk orders, two buyers; feuds and calls move sway | `s.market.tide`, `due` |
| M4 | **INIT's count** | The count, its movers and bands, fronts, cancel rounds, LANTERN's readout; runners' trades and corners; rare cards | `s.market.count`, the rare cards left |
| M5 | **Arcs and Turf war** | Institution arcs; Turf war (director.md D4): two rivals within 2 points at the top contest a floor, the winner takes 5 | Each arc's step, the crisis |
