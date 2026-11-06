# Story script (draft)

**Status.** A draft for the designer to mark up; nothing here is built. It carries docs/lore.md's beats in the built
floor jobs (`content/contracts.mjs` `floors`): **every step's kind and target stay**, only the words change, and
**every chain ends on a named boss** (the *Boss* step, new: a fixed boss in a server's Core; the floor's lair boss
stands in until that boss is built). Where a
beat belongs to someone other than the chain's giver, it comes as an **extra letter** (a letter with no job, between
steps: new to the floor jobs). *Kept* marks a built line left as it is.

**The thread through it.** The built chains already follow a schedule of hits signed by Halcyon's pricing model. Under
the lore, the hits are **cancelled uninsured trades**: ACTUARY picks which ones die to keep the table under the line,
and *"a client who pays more is hit less"* becomes *an insured trade is never picked*.

Voices: wick lowercase and terse; Halcyon Claims formal; LANTERN a numbers station; NULL CHOIR mocking; Kestrel a
landlord; GLASSJAW a broker.

---

## The storyline mails (`content/story.mjs`)

Only two change.

**ledger** · the file's text
> binary: Halcyon Mutual's claims ledger. Premiums collected this month on 4,112 accounts. 3,960 of the holders are dead.

**badge** · wick's last paragraph
> do that and the badge is yours. the old toolkit's coming back too. rebuilt. don't try to scrap it. you can't.

---

## Floor 1 · The Sprawl · *Page nine* · wick

*Reason:* wick read the claims ledger. Page nine is an account whose holders died thirty years ago.

1. **Named process** · *page nine*
   > i read the ledger. so did you, or you lie better than i do.
   > page nine is marrow & vane. both partners died before the cascade. halcyon still takes their premium every month, and still pays their claims.
   > a process called {name} files those claims from SPRAWL-00. take it down before it files another.
2. **Map** · *where it reported*
   > pagenine-0909 reported to {server}. map it, every room. i want to know who reads dead men's mail.
3. **Recover a file** · *filed early* · `mv-claims.log`, marrow & vane's claim log
   > there is a claim log in a vault on {server}: {file}. bring it home.
   > read the dates. then read them again.

   *File:* text: fourteen claims. each dated the day before the payment it claims for was cancelled.
4. **Puzzle board** · *the board on {server}*
   > whoever files those claims left a puzzle board running on {server}. win it. the board keeps their schedule.
   > and the thing that files them lives behind it.
5. **Boss** · *the account* · **PAGE NINE** (elite ransomware at the floor's top level; *new*, a named elite, no new rules)
   > the board says the account runs itself. a process in the Core of {server}, paying a dead man's premium and filing his claims. thirty years of it.
   > it calls itself page nine. switch it off.

   *On the challenge card:* `PREMIUM RECEIVED. CLAIM FILED. PREMIUM RECEIVED. CLAIM FILED.`
   *When it falls:* `ACCOUNT CLOSED. BENEFICIARY: NONE.`

*Closing line:* fourteen payments cancelled, each claimed for the day before. somebody gave a dead account the schedule.

---

## Floor 2 · Backhaul · *Carrier* · LANTERN

*Reason:* LANTERN hears a count on the Backhaul, and sells it to you a page at a time.

1. **Install** · *Tune in* · `ear.so`
   > Four. Nine. Nine. This is LANTERN.
   > wick says you want the schedule. We hear it on the Backhaul. Put our listener on {server}. What crosses it, we hear. Then you hear.
2. **Rooms** · *A clear line*
   > The strays on {server} come up from below. They are not lost. They are looking for someone who owes them an answer.
   > Clear {count} rooms you haven't cleared before. The listener needs a clear line.
3. **Past the Tracker** · *One page* · `sched.0412`, a page of the schedule
   > One page of the schedule sits in the vault on {server}, as {file}. Its Tracker guards it. Bring it out unseen, or it is worth nothing to us.

   *File:* text: twelve dates, twelve trades, each marked cancel. none of them insured. at the foot: process table at 81%.
4. **Map without resting** · *Who's counting*
   > Something sends a count down this line every night, the way an old machine once did. Some of us read that count for a living, once.
   > Walk {server} end to end in one visit, and don't rest. We want to hear who else is listening.
5. **Boss** · *It heard us* · **CENTRIFUGE** (14, GLASSJAW; designed: it spins up each time its Surge lands)
   > GLASSJAW sent something to the Core of {server}. It heard our listener, and it wants to sell what it heard.
   > It is called CENTRIFUGE. It spins faster every time it lands. Slow it down. Then beat it.

   *On the challenge card:* `bid received. bid received. bid received.`
   *When it falls (LANTERN):* `Four. Nine. Nine. The line is clear.`

*Closing line:* The schedule is signed. Not by a crew. By a pricing model. And the count at its foot says eighty-one percent.

---

## Floor 3 · The Stacks · *Underwriting* · Halcyon Claims

*Reason:* Halcyon's Claims desk wants the Stacks tidied up. It doesn't say why.

1. **Map** · *Survey request* (*kept*)
   > Underwriting is pricing the Stacks. Map {server}, every room. We understand you have been reading our ledger. We would prefer you read floor plans.
2. **Recover a file** · *Misfiled document* (*kept*) · `model-v7.cfg`, a pricing model's config
   > A configuration file, {file}, was misfiled to a vault on {server}. Return it unread.

   *File:* text: actuary v7. a weight on every waiting trade, insured or not, and a field called next_cancel.

   **Extra letter · NULL CHOIR · *an offer***
   > You carried Halcyon's homework home and didn't peek. Good dog.
   > That file decides whose money dies next. Everyone it picks has been dead for thirty years. Funny, isn't it?
   > We'd let it all roll back. Every debt, every saving, every promise. Come and sing with us, NULLCHOIR-SQUAT-13.
   > Or don't. We'll be watching you type either way.
3. **Takeover** · *Archive custody* (*kept*)
4. **Puzzle board** · *Sealed records* (*kept*)
5. **Boss** · *Final custody* · **SHOULDER SURFER** (18, NULL CHOIR; designed: it replays the last command you fired)
   > One server left: {server}. Its Core now holds a NULL CHOIR process that has been reading over our contractors' shoulders. Remove it and the Stacks are in order.
   > Your retainer has been reviewed. It stands.

   *On the challenge card:* it types your last command back at you, then: `again. from the top.`
   *When it falls:* `you type like halcyon pays you.`

*Closing line:* The config came back with one field changed: next_cancel. Claims thanks you for your discretion.

---

## Floor 4 · Coldline · *Cold storage* · Kestrel

*Reason:* Kestrel owns the racks on Coldline. Someone runs jobs on them without paying.

1. **Rooms** · *Unbilled load* (*kept*)
2. **Install** · *Metering* · `meter.ko`
   > Put a meter on {server}. It counts what we are not paid for. On Coldline, that has been most things for thirty years.

   **Extra letter · wick · *moth***
   > moth dropped on coldline. mid-raid.
   > not your job. telling you anyway.
   > if you find a session that won't close, it's them. it won't time out. nothing down here does.

   (Cold Start, the thread, picks this up when it's built.)
3. **Past the Tracker** · *The lease* · `kessler-ops.log`, Kessler's night-desk log
   > Our oldest lease on Coldline is in the vault on {server}, as {file}. It predates us. Bring it out past the Tracker.

   *File:* text: kessler settlement, night desk, forty years ago. change approved: settlement timeout disabled. engineer's note: objection on file. switching it off.
4. **Map without resting** · *Walkthrough*
   > Walk {server} end to end in one visit, without a rest. Our auditors found a process there that answers to Kessler's night desk. Kessler has not had a night desk for thirty years.
5. **Boss** · *Eviction* · **NIGHT DESK** (24, nobody's: Kessler's old settlement process; *new*)
   > The unpaid jobs run from the Core of {server}. Something there is still settling trades for a company that no longer exists. Evict it, and the lease is void.

   *On the challenge card:* `night desk. awaiting counterparty.`
   *When it falls:* `shift ended. 0 trades settled.`

   *A sketch for the boss session:* **Finality.** Nothing it starts can be stopped: each attack waits for an answer.
   Hit the part that's charging and it settles at half; leave it and it settles in full.

*Closing line:* The lease was Kessler's, and so were its logs, and so was the thing still working the night shift. Kestrel has archived them all, and is raising its rates.

---

## Floor 5 · Deep Core · *Static* · NULL CHOIR

*Reason:* NULL CHOIR wants the pricing model broken. You want to read it first.

**On arrival: five transmissions**, one from each faction, in any order. Each is two or three lines and one question.

| From | They say | You ask → they answer |
|---|---|---|
| Halcyon Claims | The Guarantee is a promise made to every account on this network, living or otherwise. A restart would break it for millions at once. We would rather keep it slowly. | *And the trades you cancel?* → We manage risk. You have been managing it with us. |
| Kestrel | We own the machine, and we would like to keep owning a working one. The old floors are a liability. Seal them, and the living stop paying for the dead. | *Everyone below?* → Everyone below has been below for thirty years. Nothing changes for them. |
| LANTERN | Four. Nine. Nine. Every frozen trade was somebody's deal: a rent, a wage, a loan between friends. We close them one at a time, fairly. It may take forever. We've had practice. | *Who decides what's fair?* → Someone always does. We'd rather it was someone who reads the receipts. |
| NULL CHOIR | Everyone's dead and still paying. Roll it back: every debt, every saving. Start from zero and stop pretending. | *People lose everything.* → They lost it thirty years ago. We're just saying it out loud. |
| GLASSJAW | Four answers, and every one of them is selling something. I just put a price on mine. | *What's yours?* → INIT's reports, every one, to the highest bidder. No speeches. |

1. **Puzzle board** · *Audition*
   > You want the model. So do we. Win the puzzle board on {server} and we'll talk. Keep time.
2. **Recover a file** · *Weights* (*kept*) · `weights.bin`, the model's weights
   > The model's weights are in a vault on {server}, as {file}. Copy them out. We break things. We don't build them.

   *File:* binary: actuary v7. ninety thousand uninsured trades, a price on each. its cancel routine is older than the model: kessler's recovery job, thirty years old. one author.

   **Extra letter · wick · *the code***
   > it's mine.
   > i wrote it in one night, thirty years ago. i thought they'd deleted it.
   > holding was meant to mean nobody cancels again. it just meant nobody saw.
3. **Rooms** · *Noise* (*kept*)
4. **Install** · *Jammer* (*kept*)
5. **Boss** · *Encore* · **EXIT NODE** (30, PALEMASK; designed: three onion layers over its core)
   > The model keeps its backups behind {server}'s Core, three layers deep. It hired PALEMASK to hide them. Peel it. We'll do the rest.

   *On the challenge card:* `route: unknown. route: unknown. route: unknown.`
   *When it falls (NULL CHOIR):* `There it is. Naked. Sing.`

*Closing line:* The model has one rule: an insured trade is never picked. Its cancel code is thirty years old, and it has one author.

---

## Floor 6 · Kernel Space · *Ring zero* · wick

*Reason:* wick wants a copy of the model somewhere only LOWLIGHT can reach it. He has stopped telling you where.

1. **Map** · *somewhere to put it*
   > the choir broke their copy. i kept ours. it needs a shelf.
   > map {server}. if you like it, it's the shelf. you pick.
2. **Past the Tracker** · *who it calls* · `actuary.trace`, the model's call log
   > the model calls home. the log is in the vault on {server}: {file}. the tracker there is quick.

   *File:* text: every call the model made this quarter, each to a halcyon address. one to kestrel: seal schedule, kernel space and below.
3. **Takeover** · *our shelf*
   > take {server} over, or don't. it's your shelf.

   **Extra letter · Kestrel · *Notice of closure***
   > Kernel Space and every floor beneath it will be sealed at the end of this cycle. Please collect your belongings.
4. **Boss** · *the seal* · **BULKHEAD** (36, Kestrel ICE; *new*)
   > they're sealing it with you under. the lock sits in the Core of {server}.
   > break it and the floors stay open. or walk out and let it close. you pick. i picked twice.

   *On the challenge card:* `SEAL IN PROGRESS. OCCUPANTS: 1.`
   *When it falls:* `SEAL ABORTED. Kestrel apologises for any inconvenience.`

   *A sketch for the boss session:* **Seal.** Each cycle it seals one more of your keys; breaking a part opens one
   back: a race to keep your bar open. Walking out instead is the set piece's other choice, prototyped first.

*Closing line:* the model has a name inside halcyon: the actuary. kestrel had a date for the seal, and now it doesn't.

---

## Floor 7 · The Sink · *Minutes* · a Claims insider

*Reason:* Someone at Halcyon's Claims desk writes to you off the record.

1. **Install** · *Not an official request* (*kept*)
2. **Rooms** · *Room to work* (*kept*)

   **Extra letter · GLASSJAW · *the archive***
   > Every report INIT ever filed, thirty-five years of them. Halcyon bought them retail. I bought the archive.
   > The last one reads *process table at 99%*. It was filed from Kessler's night desk. Ask your handler who was on shift.
   > For sale, naturally.
3. **Recover a file** · *The minutes* (*kept*) · `minutes.pdf`
   > The board's minutes went to a vault on {server}, as {file}. Bring them out. I will read them first.

   *File:* text: resolved, that the actuary programme continue, a restart being unaffordable under the guarantee. three signatures.
4. **Map without resting** · *Clean hands* (*kept*)
5. **Boss** · *Resignation* · **GOLDEN PARACHUTE** (38, GLASSJAW; designed: every part it loses makes the rest charge)
   > One of the three who signed is leaving tonight, with a payout and the renewal's only copy. GLASSJAW is carrying both out through the Core of {server}.
   > Stop it. After that, I will not write again.

   *On the challenge card:* `severance approved.`
   *When it falls (the insider):* `Thank you. Please do not reply.`

*Closing line:* The minutes renew the Actuary for another year, because a restart would cost the Guarantee. Three names signed them. One of them signs your retainer.

---

## Floor 8 · Bedrock · *Bedrock* · wick

*Reason:* The Actuary runs on Bedrock. wick wants it switched off.

1. **Map** · *the bottom*
   > this is as far down as it goes. the clearing house. the first machine. it never stopped running.
   > map {server}. every room. look at the dates on things.
2. **Puzzle board** · *its clock* (*kept*)
3. **Past the Tracker** · *the whole thing* · `actuary.img`
   > its image sits in the vault on {server}, as {file}. bring it out past the tracker. then i'll know where every copy is.
4. **Install** · *a watchdog* (*kept*)
5. **Takeover** · *its host* (*kept*)
6. **Lair boss** · *last one* (Bedrock's own lair boss, to write at 46)
   > {boss} guards what is left of it, in the Core of {server}. beat it.
   > after that there's only init. i won't ask you to go. you'll go anyway.
7. **INIT** · Bedrock's deepest server, level 50. No letter sends you; the chain's closing line points the way.

   *On the challenge card:* `pid 1. process table at 97%. adopting.`
   *When it falls (the first time):* `process table at 61%.` Then wick's letter.

*Closing line:* the actuary is off. the table is at 97%, and nobody is counting it but you.

---

## INIT's first fall · wick's letter

Sent once, with **Final Settlement** attached. His first capital letters. It opens the same for everyone, then changes
with your stance.

**Subject:** Final settlement

> I'm writing this one properly. You've earned the capitals.
>
> Forty years ago the man who trained me switched off a timeout he'd argued to keep. He taught me to read INIT's
> reports. When I leaked one, Kessler fined me a year's pay, and he paid it without being asked. *Pay me back when
> you can.*
>
> It took me five years. I sent it the night of the Cascade, and it was the last trade into the table. I know one
> payment didn't freeze the city. I've known it for thirty years. I still filed the report that said 99%.
>
> The next morning I wrote the job that cancelled everything uninsured. I left my own payment out of it. He died still
> owed. His child is moth. moth doesn't know any of this.
>
> You've broken INIT. Not killed it: nobody can. But the table has room again, and someone decides what fills it. You
> already have. Your badge says so.

| Stance | The rest of the letter |
|---|---|
| **Hold** | You hold, like I did. It's the one answer where nobody cancels again, and I believed that until I found my own code inside the Actuary. Holding doesn't stop the cancelling. It only stops anyone seeing it. So keep watching. My payment stays where it is, waiting with everyone else's. moth will never know. Maybe that's the kindest thing holding does. |
| **Seal** | You'd seal it: wall off the old floors and let the living net live. I can't argue with the living. But there are thirty years of people under that wall, and one of them is him. My payment goes under with the rest. I can't send it now, so I'll tell moth the truth instead. It's the only debt I have left that I can pay. |
| **Settle** | You'd settle every trade, one at a time, the way each was meant to close. It's slow, it may never end, and someone has to decide who was owed. I spent one night deciding who wasn't. You'll do it better. Mine cleared this morning, to moth as his heir. Thirty years late, to the cent. They'll want to know why. I'll tell them. |
| **Roll back** | You'd roll it all back. The debts are old and the people they bind are dead, and every saving still in there goes with them. The Choir calls that freedom. I called it a job once, and ran it in one night. If it rolls back, my payment comes home to me. I won't keep it. I'll hand it to moth myself, and tell them what it was for. |
| **Sell** (*open*) | You'd sell it. GLASSJAW would say that isn't an answer, only a price, and it wouldn't be wrong: somebody has always profited from the wait. At least you're honest about it. My payment stays frozen. One day someone will buy the right to it. I hope it's moth. |

> The toolkit's attached. I rebuilt it. It finishes what it starts now.
>
> Wick

---

## What the script needs that isn't built

- **Extra letters** in a floor job: a letter with no job, from someone other than the chain's giver, after a named step.
- **The Boss step:** a fixed boss in a server's Core, with its challenge and fall lines; the floor's lair boss stands
  in until it's built. To build: PAGE NINE (an elite, no new rules), CENTRIFUGE, SHOULDER SURFER, NIGHT DESK (new),
  EXIT NODE, BULKHEAD (new), GOLDEN PARACHUTE, INIT.
- **Five transmissions** on reaching floor 5 (`scenes.mjs` has the format; the trigger is new).
- **The seal** on floor 6: a set piece, designed and prototyped first.
- **The stance** (the badge line) and **wick's letter** by stance, at INIT's first fall.
