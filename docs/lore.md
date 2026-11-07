# Lore: the world and the story

**Status.** Decided, not built. GAME_RULES.md says what's built; where this changes a built line, see *Lines to revise*.

## 1. The machine

The net is one computer: every server under one operating system, one process table, one PID 1 called **INIT** (a
single-system-image cluster). Processes move from server to server, which is why viruses walk room to room. An
ordinary network can't do that: each of its machines has its own PID 1.

| Year | What happened |
|---:|---|
| 2041 | **Kessler Systems** builds a payment clearing house as a pilot for about 40 banks, on one machine. |
| 2041–61 | **It grows.** Instant settlement is too good: insurers, exchanges, payroll, rents and the city's own accounts join, each by adding servers. It is never rebuilt for that size. |
| 2051 | **Settlement finality.** The members demand that a payment, once in, can never be cancelled. Halcyon pushes hardest: a rolled-back payment is a failed payment, and a failed payment is a claim. The safety valve, a timeout that rolled back any trade unanswered after a few seconds, is switched off by **moth's dad**, Kessler's senior settlement engineer. He had argued against it and lost. |
| 2051–61 | **Orphans.** A bank fails mid-trade; its side dies; the other side waits forever for an answer. INIT must adopt every orphan, and can only clear one when it finishes. These never finish. The table fills. |
| 2056 | **INIT's reports:** *"process table at N%"*. Kessler sells them to Halcyon. Halcyon adds a clause excluding "failure of the underlying system". |
| 2057 | **The leak.** wick leaks a report to a city paper; nobody acts. Kessler fines him; moth's dad pays it. |
| **10 Nov 2061** | **The Cascade**, at 02:14. The table reaches 100%. Nothing new can start; the old net freezes, still running. wick files the last report: *"process table at 99%."* Other insurers go broke paying out; Halcyon pays little. |
| 2061–86 | **The recovery.** Finality protected only insured trades, so Kessler cancels every uninsured waiting trade to free room. wick writes and runs the cancel job, in one night. It takes several rounds over the years; each frees a slice the city builds a new layer in. The first runs the morning after. |
| 2062 | **The Halcyon Guarantee.** |
| 2070 | moth's dad dies, still owed. |
| 2091 | **Now.** |

**Dates.** Every dated line in the game uses this calendar, marked against the Cascade (*C−4*, *C+29*). Now is 2091,
C+30. The floors mounted deepest first:

| Floor | 8 Bedrock | 7 The Sink | 6 Kernel Space | 5 Deep Core | 4 Coldline | 3 The Stacks | 2 Backhaul | 1 The Sprawl |
|---|---|---|---|---|---|---|---|---|
| Mounted | 2041 (the pilot) | 2062 | 2064 | 2067 | 2071 | 2075 | 2080 | 2086 |

**The floors** are those layers: each a later layer of the same machine, its orphans still handed down to INIT.
**Bedrock** is the original clearing house, frozen and still running. Deeper floors hold older orphans, and are harder.

## 2. Who's who

| Who | In the fiction |
|---|---|
| **Halcyon Mutual** | After the Cascade it won the city back with **the Halcyon Guarantee**: every frozen payment will clear one day. Cheap to sell, because Halcyon knew they wouldn't. A restart now fails them all at once: the biggest claim in history, and not excluded. So Halcyon keeps the net frozen, and pays crews like LOWLIGHT to keep the table under the line. |
| **ACTUARY** | Halcyon's model, built on INIT's reports and on wick's cancel code. It chooses which uninsured trades die. Halcyon has been doing what you do, on purpose, with a model. |
| **Kestrel Underwriting** | Kessler's reinsurer. When Kessler went bankrupt, Kestrel was paid in hardware, which is why an underwriter runs the data centres. It owns the machine. |
| **LANTERN** | Old Kessler staff and their heirs. Its beacons reach Bedrock. It sells information to fund the settling. |
| **NULL CHOIR** | *"Let it roll back."* Every server it breaks is a small rollback. |
| **GLASSJAW** | A broker selling INIT's reports to the highest bidder. Buys what ends up in the Sink. Grey, not evil. |
| **TOLLGATE, SWARMLINE, PALEMASK** | Crews with no paymaster: ransoms, rented botnets, stolen data. Their attacks lock and interrupt trades mid-settlement, which makes new orphans. |
| **Strays and Residents** | Orphans running dead crews' code. A crew's attack left a virus in the trade it interrupted, and the virus outlived the crew: it retries the handshake with anything that might be the counterparty, and takes every wrong answer as hostile. You fight the virus; the trade dies with it. "Nobody's" because their parents are dead. Crews still write the viruses (*viruses are written, not grown*). |
| **You** | Your kills end processes cleanly, which frees space. Killing a stray cancels an uninsured payment, someone's money. That grey is deliberate. |

**Now.** The table is filling again.

**The claims ledger** (the storyline's *ledger* mail) shows Halcyon collecting premiums on frozen accounts whose
holders are long dead.

## 3. The question: what should happen to the frozen payments?

| Answer | Faction | The case | The cost |
|---|---|---|---|
| **Hold** | Halcyon | A promise is a promise; a restart breaks millions at once. | The table fills again, and someone profits from the wait. |
| **Seal** | Kestrel | Protect the living net; wall off the old floors. | Everything below is abandoned. |
| **Settle** | LANTERN | Each trade was a real person's deal; close each one fairly. | Slow, maybe endless; someone decides who was owed. |
| **Roll back** | NULL CHOIR | The debts are decades old and the people they bind are dead. | Every saving still in the system goes with it. |
| *Sell* | GLASSJAW | For players who don't care: the reports go to the highest bidder. | — |

- **Your stance is your commission** (docs/factions-plan.md 3; was: the faction you stand highest with), a line on the NET ID badge (*Holds with
  Halcyon*, *Seals with Kestrel*, *Settles with LANTERN*, *Rolls back with NULL CHOIR*, *Sells to GLASSJAW*), set at a hub (*Commission*).
- **Floor 5:** each faction sends its case in a short transmission.
- **The built choices lean the same way:** Two Buyers, the Kestrel or NULL CHOIR side contract, feuds, and Orphans,
  whose clean exit is Settle in miniature.
- **INIT's first fall** is still the end of the climb. You can't kill PID 1, so the fall frees a large block of the
  table. It reads your stance: wick's letter changes, and each stance has an achievement and its cosmetic. The world's
  rules don't change, and nothing is locked.

## 4. The story: one storyline mail per floor

The rest stays sandbox.

| Floor | Beat | wick |
|---:|---|---|
| 1 · The Sprawl | The ledger. | The handler: terse and funny. He wants you to read it. |
| 2 · Backhaul | A LANTERN broadcast: the strays come from below, and someone is counting them. | Same. |
| (level 22) | The badge mail. | He rebuilds his Old Toolkit and gives it back. It's his cancel code, and it can't be deconstructed (*built*): you carry it now. |
| 3 · The Stacks | NULL CHOIR's offer. | — |
| 4 · Coldline | moth goes dark (Cold Start). The first Kessler logs show the timeout switched off. | His lines get shorter. |
| 5 · Deep Core | ACTUARY. | It's built from his code. Holding never stopped the cancelling; it hid it. |
| 6 · Kernel Space | Kestrel tries to seal the floors under you, with you inside. | Quiet; he stops pointing. *"you pick. i picked twice."* |
| 7 · The Sink | GLASSJAW's archive of INIT's reports. | Quiet. |
| 8 · Bedrock | INIT, and wick's letter. | The letter (5). |

## 5. wick

wick is **he**; moth's dad is **he**; moth is **they** (undecided).

**His past.** A junior settlement engineer on Kessler's night desk, trained by moth's dad, who taught him to read
INIT's reports. Years before the Cascade, wick leaked a report to a city newspaper. Nobody acted. Kessler fined him
more than a year's pay. moth's dad paid the fine unasked (*"pay me back when you can"*): he agreed with the leak, but he
had a young child, couldn't risk his job, and the timeout had been his. **His dad built the flaw; wick ran the
cleanup.**

wick saved for years and sent the repayment the night of the Cascade. It became the last trade into the table, and
froze. One process among millions: it didn't cause the Cascade, and wick believes it did. He ran the cancel job and
kept his own payment out of it. moth's dad died some years later, still owed (offscreen; don't dwell). wick recruited
moth to look after them. moth knows none of this.

**Why Halcyon.** Holding is the one answer that means nobody cancels again. LOWLIGHT steers Halcyon's war at the crews'
fresh orphans, away from the old trades: *"halcyon pays, i point"* is literal. *"Do not read it. (Read it.)"* is a man
who was punished for reading.

**His voice** stays as built: lowercase, terse, dry. **The letter** is his one long piece of writing, and his first
capital letters. It half agrees and half argues with your stance, then ends on his frozen payment:

| Stance | His payment |
|---|---|
| Hold | It waits, and moth never learns. |
| Seal | It's sealed under, and he tells moth the truth instead. |
| Settle | It clears to moth, thirty years late, to the cent. |
| Roll back | It returns to him, and he hands it to moth himself. |
| Sell (GLASSJAW) | *Open.* |

## 6. Final Settlement (designed, not built)

The Old Toolkit finished, sent with wick's letter at INIT's first fall. The same item for every stance.

> **Final Settlement** · Exploit · Unique · Level 50
> When you break a part, everything it spawned breaks with it.
> *rebuilt. it finishes what it starts now.*

It kills the whole process group, so it leaves no orphans. Making it the third LOWLIGHT Kit piece is optional, for later.

## 7. Parked: ASTERNA

Name undecided (ASTERNA, ARSENAT, TSARENA; docs/server-specials.md *Blooms*). If it's ever used: below Bedrock is the
**swap**, where INIT paged out its oldest orphans, and ASTERNA breeds them into the strains it looses as blooms. Not
joinable; INIT stays the end. Nothing above depends on it.

## 8. The living network: a guide for the next session

Nothing here is built. Where lore surfaces: vault files, Codex lines, LANTERN broadcasts, thread endings. Always a
sentence or two, ??? until found, never timed.

### 8.1 Who's on the net

| Institution | Kind | Now | Line |
|---|---|---|---|
| **Brandt & Vey** | Merchant bank, a founding member | Frozen (Bedrock) | The first bank to fail mid-trade; its orphans are the oldest. |
| **Annick Life** | Insurer | Frozen | Went broke paying out after the Cascade; its policyholders' claims still wait. |
| **Pellucid Payroll** | Payroll processor | Frozen (the Sink) | Failed mid-run: a whole month of the city's wages, still settling. |
| **Corvid Exchange** | Commodities exchange | Alive (the Stacks) | Survived by trading only insured lots; very proud of it. |
| **Harrow Street Credit Union** | Credit union | Alive (Backhaul) | Small, stubborn, LANTERN's oldest listener. |
| **City Treasury Office** | City accounts | Half frozen | Its tax rolls run; its pre-Cascade rents and pensions don't. |
| **Tenements Board** | Rents | Alive (the Sprawl) | Rebuilt in the first freed slice; every lease since is Halcyon-guaranteed. |
| **Kessler Systems** | The builder | Bankrupt | Its name is still on the farms and mirrors (KESSLER-FARM-00). |

### 8.2 Voices

| Who | Example |
|---|---|
| wick | *you read it. good. now forget you did.* |
| moth | *still here. mostly. don't tell wick i said mostly.* |
| Halcyon Claims | *Your submission has been received. Settlement will follow in due course.* |
| ACTUARY | *Premium adjusted: you are good at this. Risk noted.* |
| Kestrel | *Rack 4 will close at the end of this cycle. Please collect your belongings.* |
| GLASSJAW | *Ninety-one percent, the day before. I have the original. Make an offer.* |
| LANTERN | *Four. Nine. Nine. Brandt and Vey, account nine, still owed. Four. Nine. Nine.* |
| NULL CHOIR | *Everyone's dead and still paying. Funny, isn't it? Let it roll back.* |
| KUDZU · ESCROW · HUSH · CANTOR | As docs/rivals.md: *"hiii again!! brought friends"* · *"Invoice 0417. Your time is billable."* · your own last command · *"Again. From the top."* |

### 8.3 Why each contract exists

| Contract | The reason in the world |
|---|---|
| Kill, Grind | Stray orphans are filling the table; each clean kill frees a slot. |
| Named process | One orphan has started hitting Halcyon's clients by name. |
| Strain | A crew's build is making orphans faster than the rest. |
| Materials | ACTUARY prices policies from live code. |
| Rooms, Map | Halcyon wants to know what's running where, and how full it is. |
| Takeover, Root | A crew server changes hands to someone who doesn't lock trades mid-settlement. |
| Recover a file | Something of Halcyon's leaked: a claim, a report, a ledger. |
| Decode | Read a crew's code before it reaches a client. |
| Solve, Sweep | Logs and locks left by a crew's hit, cleared so trades can finish. |
| Hold, Interrupt | Every attack that lands mid-settlement is a new orphan; stop it before it lands. |
| Install | A canary, a tap or a patch: Halcyon watching its own clients. |
| Break Encryptors | An encrypted trade can't answer; it orphans. |
| Catch an Exfil | Stolen data heading for the Sink. |
| Map without resting, Past the Tracker | Proof you can walk a server without waking it: Halcyon's audit test. |
| Side (Kestrel or NULL CHOIR) | Seal or roll back, in a single job: the first lean. |

### 8.4 Hand-off: what each system could carry

| System | The one way it carries the world |
|---|---|
| SPRAWL-00 | Its strays' names are trade IDs: `TRD-…`, a payer and a sum, ??? until scanned. |
| Vaults | One file a vault is a frozen trade's receipt: who paid whom, and when. Stamped at the takeover: docs/receipts.md. |
| Codex | A line a family on who wrote it and why, earned with mastery. |
| Residents | A Resident is the oldest orphan on its server; its scan card names its counterparty. |
| Threads | Every chain's ending is one sentence that settles, seals or rolls back something small. |
| Rivals | Each rival's loss line names who pays its crew, or that nobody does. |
| Hubs and shops | Each hub's vendor speaks its faction's voice (8.2). |
| Invasions | Attacks on your wall come mid-settlement: the strip shows a trade at risk. |
| KESSLER-FARM-00 | A Kessler farm still mining for an owner who died in the Cascade; its ledger vault says whose. |
| Pager | LANTERN's broadcasts arrive as numbers, decoded once you stand with LANTERN. |
| Collection log (the Ledger) | Each boss's page ends on the trade it orphaned. |
| Achievements | One per stance, at INIT's first fall (3). |
| NET ID badge | The stance line (3). |
| Flash ranks | Each rank reflashes an older layer: a line on how old its orphans are. |
| Blooms | Only if ASTERNA is used (7). |

## Lines to revise

Don't edit these here; each wants the designer's pass.

| Where | Today | Under this lore |
|---|---|---|
| `dist/content/contracts.mjs` `floors` (the floor jobs, GAME_RULES *Floor jobs*) | Eight built chains: page nine, LANTERN's schedule, Underwriting, Kestrel's forged lease, NULL CHOIR and the model, wick shelving a copy, a Claims insider, and the actuary killed at Bedrock. | They are the storyline mails (9). F1, F2, F4 and F6 fit with a rewrite; F3, F5, F7 and F8 collide (9.1). |
| `dist/content/story.mjs` *ledger* file text | *"Fourteen months of payouts, every client named."* | Premiums still collected on frozen accounts whose holders are long dead. |
| `dist/content/story.mjs` *welcome* | Halcyon pays crews because each breach is a claim. | Still true; the deeper reason (the table, the Guarantee) is learned later. No change needed. |
| `dist/factions.mjs` NULL CHOIR `about` | *"Breaks corporate servers for fun…"* | Breaks servers as small rollbacks; *"Let it roll back."* |
| `dist/factions.mjs` Kestrel `about` | *"Runs the data centres everyone rents. Neutral…"* | Owns the machine, paid in hardware. |
| `dist/factions.mjs` LANTERN `about` | *"Sells what it hears…"* | Old Kessler staff and heirs; sells to fund the settling. |
| `dist/factions.mjs` GLASSJAW `about` | *"Halcyon's competitor."* | A broker of INIT's reports. |
| `docs/threads.md` 10 *Orphans* | A kernel thread forked off a dead parent. | An orphaned trade; *"tell them to stop"* is its dead counterparty's dump. |
| `docs/threads.md` 7 *Cold Start* | moth, a LOWLIGHT runner. | Same, plus the floor-4 beat and wick's shorter lines. |
| `GAME_RULES.md` KESSLER-FARM-00 | *"a mining farm somebody stopped paying for"* | A Kessler-era farm (8.4). |

## 9. Building it

The floor jobs (`arcs.mjs`) already carry a storyline a floor; they are where the beats go. Steps stay; letters change.

### 9.1 The beats against the built chains

| Floor | Built chain (giver) | Lore beat | Fit |
|---:|---|---|---|
| 1 | Page nine (wick) | The ledger | Fits: page nine becomes premiums on a dead holder's account. |
| 2 | Carrier (LANTERN) | LANTERN's broadcast | Fits: *the schedule* becomes INIT's count. |
| 3 | Underwriting (Claims) | NULL CHOIR's offer | Collides: another giver. |
| 4 | Cold storage (Kestrel) | moth goes dark; the Kessler logs | Fits: the forged lease becomes the timeout log. moth's half needs Cold Start. |
| 5 | Static (NULL CHOIR, after the model) | ACTUARY | Half: the right subject, another giver. |
| 6 | Ring zero (wick shelves a copy) | Kestrel seals the floors | Collides. |
| 7 | Minutes (a Claims insider) | GLASSJAW's archive | Collides. |
| 8 | Bedrock (wick: kill the actuary) | INIT and the letter | Collides: the built climb ends on the actuary. |

### 9.2 Sessions, in order

Each lands before the next starts. 1 and 2 can run side by side (2 is applets in the scratchpad).

| # | Session | Lane (owns) | Needs first |
|---:|---|---|---|
| 1 | **Built.** **Story text.** The floor jobs' letters rewritten to 9.1 (drafted: docs/story-script.md), each chain ending on a named boss; the ledger file, the faction `about` lines (left for the designer's pass). Text, extra letters and the Boss step (stand-ins). | `content/contracts.mjs` floors, `content/story.mjs`, `factions.mjs` about | The designer's call on 9.1 |
| 2 | **Lore surfaces, prototype.** Journals picked (docs/journals.md). Vault records, Codex lines, LANTERN on the pager, ??? until found: applets and screenshots. | scratchpad | — |
| 3 | **Stance.** The badge's stance line; floor 5's four transmissions (`scenes.mjs`, opened by the floor). | `profile.mjs` badge, `scenes.mjs` | 1 |
| 4 | **Lore surfaces, built** from 2's pick, with the living-network content (8.1–8.3) the designer keeps from 8.4. | the record kind, server names, contract and vendor text | 2, the designer's picks |
| 5 | **Threads:** the *hold* and *follow* step kinds, then Cold Start (4) and Orphans (6). | `threads.mjs`, `content/threads.mjs` | — |
| 6 | **Floor 6's seal.** Prototype first. | the floor-6 chain | 1, 5 |
| 6b | **The climaxes**, two or three bosses a session: the Boss step (the lair boss stands in), then CENTRIFUGE, SHOULDER SURFER, NIGHT DESK, EXIT NODE, BULKHEAD, GOLDEN PARACHUTE (docs/story-script.md). Each a puzzle fight (docs/puzzle-fights.md). | data.mjs BOSSES, the floor jobs | 1 |
| 7 | **The end.** INIT, wick's five letters, an achievement and cosmetic a stance, Final Settlement (a part's spawn tracked, so it breaks with it). | Bedrock, `achievements.mjs`, combat | Floor 8's content (docs/content.md 3.2) |

Story text (1, 3) and the end (7) touch the storyline and achievements; the save only in 7. None run side by side with
another session on those systems.
