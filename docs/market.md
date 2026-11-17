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
| A card | ±1.9 to ±3.75 (section 5), times the temper |
| Drift | Each hour, a third of the gap back to its baseline |
| The web | Each hour, 90% of a faction's excess over its baseline goes to the two it feeds |

### Need: a hub pays for what it lacks

A faction below its baseline pays more; above it, less: **need = 1 + 0.7 × (baseline − sway) ÷ baseline**, plus 0.6 ×
the excess of each faction that feeds it (as a share of that faction's baseline), kept to 0.6–1.6. It counts most on
the faction's own good (need to the power 1.4), the ware its supply order wants (economy.md 3): Halcyon Cipher, Kestrel
Kernel, LANTERN Worm, NULL CHOIR components, GLASSJAW Exploits. On everything else it buys it counts lightly (to the
power 0.4). The runners and you sell where a faction is short, and that brings it back toward its share.

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

The process table's fill, *process table at N%*, one number a save. It starts at 80–86%.

- **Up:** orphans pile up, +5 points an hour, up to half again as fast while Halcyon holds more than its share (*the
  table fills while it waits*). Crews' runs and the frozen institutions' cards add 2 or 3.
- **Down:** every clean kill frees a slot, 0.035 points one of yours and 0.02 a runner's job. Cards take it down 1 to 6
  (the schedule, a rack, a seal, a rollback). At 95% INIT runs a **cancel round**: −8, with the line *init: cancel
  round. process table at 87%*. It never reaches 100: that was the Cascade.
- **What it does:** a full table means more strays and more code, so code sells for up to 12% less above 85% and up to
  12% more below it. Some cards only come above a line (the schedule over 86%, a report auction over 88%), and crews'
  runs come more often the fuller it is. LANTERN reads it out on the Log at each two points: *Four. Nine. Nine. The
  table is at eighty-eight.*

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
| | **The schedule** (over 86%) | *Settlement will follow in due course.* | A crew's run starts (below); the count −6; +2.5 |
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
| GLASSJAW | **Report auction** (over 88%) | *Ninety-one percent, the day before. I have the original. Make an offer.* | Exploits ×1.8 at GLASSJAW, 20 min; +2.5 |
| | **Early word** | *Three prices move in the next twenty minutes. I know which.* | Three flickers (×1.3 or ×0.75) across the hubs, 20 min |
| | **Sink clearance** | *Whatever falls to the Sink, I buy. Kernel first.* | Kernel ×1.5 at GLASSJAW, 20 min |
| | **Leaked report** (cost) | *Someone gave my report away. It was worth more than that.* | −3.75; LANTERN and Halcyon +1.9; Exploits ×0.8 at GLASSJAW, 20 min |

### Institutions

A network's two clients and its ghost (the Charter) each bring a card.

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

### Crews' runs

TOLLGATE, SWARMLINE and PALEMASK have no paymaster. A run is the built **Outbreak** card with a crew's name: its
family's strays surge and their kills drop double code for 30 minutes, its code ×0.8 everywhere, the count +3. The
ticker deals them, more often the fuller the table (×1 at 80%, ×2 at 90%), and the schedule starts one.

| Crew | Run | Family |
|---|---|---|
| TOLLGATE | **TOLLGATE's run** | Ransomware: Cipher |
| SWARMLINE | **SWARMLINE's rental** | Worm: Worm |
| PALEMASK | **PALEMASK's harvest** | Ghostroot: Kernel |

**What it replaces:** the world event (market.mjs `EVENTS`, chosen by the wall clock, so every save has the same one
at the same moment) and the Market shock card: their moves now come from the ticker, with a reason. Flickers (blips),
pirate tips (the scanner) and your own selling's pressure stay as built.

## 6. Runners in the market

Runners already pick jobs from what their hub pays (runners.md, built November 2026). Here they become the market's
population:

- **They sell where it pays.** They read every hub and stay loyal to their own unless another pays 15% more. Each sale
  gives that hub +0.25 sway and presses its price 0.2% (yours press 4% a unit, as built).
- **They work for their paymaster.** Each job gives it +0.1 sway, and their clean kills lower the count.
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
| The Log (the pager) | A card's line in its voice; LANTERN's count; the tide turning; a cancel round |
| The Network card | The Charter as you learn it: standings once you've seen the hub's market, institutions once their card has come, ??? until then (like the rich code) |
| #net | Runners reacting |

## 8. Measured

The prototype, 200 seeds × 40 logged-on hours, you delivering work for a mix of factions. In brackets: you working for
Halcyon alone, the hardest case for dominance.

| Check | Result |
|---|---|
| Highest sway any faction reaches | 27% typical, 32% at most (31%); over 30% under 0.5% of the time |
| A faction's range (5th to 95th percentile) | 15–25% |
| The lead changes hands | 2.6 times an hour (2.4); 1.6 on the slowest tenth of seeds (1.4) |
| The faction that leads most, by seed | 54% of the time typical, 76% at the 90th percentile (58%, 86%) |
| Time in the lead | Halcyon 30%, Kestrel 26%, NULL CHOIR 16%, LANTERN 15%, GLASSJAW 13% (Halcyon 53%) |
| Tide turns | 2.8 in 40 hours |
| INIT's count | 76% to 94% (5th to 95th percentile), 88% typical; a cancel round every 8 hours |
| Market cards | About 2 an hour |
| The dearest code | Changes about once an hour; on a seed, one code is dearest 73% of the time, 14% over the next (40% at the 90th percentile) |
| Which code is dearest most often | Kernel on 47% of seeds, Cipher on 31%, Worm on 22% |
| What your sales fetch | 3% more than today's market, with your own selling's pressure (0.63 against 0.61 of today's best prices) |

## 9. Building it

One session a slice, each landing before the next. It's the economy's lane, so nothing else on the economy, factions
or the save runs beside it. Each slice ships lean: the rule, its mark and tooltip, a unit test, GAME_RULES and README.
A test on the engine keeps section 8's guardrails: on fixed seeds no sway over 33%, the lead turning, the value within
5% of today's.

| # | Slice | Builds | Saved |
|---|---|---|---|
| M1 | **The Charter and the ticker** | Standings, scarcity, clients and ghost; the ticker with crews' runs and institution cards, replacing the wall-clock world event and the shock; price tooltips name their causes; runners read every hub | The ticker's cards |
| M2 | **Sway** | Sway, need and the web; your sales, contracts and receipts and runners' sales move it; the sway bar | `s.market.sway` |
| M3 | **Moves and the tide** | Faction moves with their variants, cost cards, the tide and its lines; feuds and calls move sway | `s.market.tide`, `due` |
| M4 | **INIT's count** | The count, its effects, cancel rounds, LANTERN's readout | `s.market.count` |
| M5 | **Turf war** (director.md D4) | Two rivals within 2 points at the top contest a floor; the winner takes 5 points | The crisis |

## 10. Open

- Halcyon's baseline is one point over the others (it insures half the net). More, if it should read as the incumbent?
- Need could also pay a credits premium on a short-handed faction's contracts (never XP). Today one table pays every
  board (factions-plan.md 4).
- Should sway also set the share of faction servers you trace (one in eight today)?
- A tide line from wick when it turns, or only the faction's own voice?
