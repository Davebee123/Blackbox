# Story script (draft)

**Status.** Floor jobs, extra letters, the Boss step (with stand-ins) and the two storyline mails are built (lore.md 9.2, session 1); the rest isn't. It carries docs/lore.md's beats in the built
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
5. **Boss** · *the account* · **PAGE NINE** (elite, floor 1; *Fight:* the bosses table)
   > the board says the account runs itself. a process in the Core of {server}, paying a dead man's premium and filing his claims. thirty years of it.
   > it calls itself page nine. switch it off.

   *On the challenge card:* `PREMIUM RECEIVED. CLAIM FILED. PREMIUM RECEIVED. CLAIM FILED.`
   *When it falls:* `ACCOUNT CLOSED. BENEFICIARY: NONE.`

*Closing line:* fourteen payments cancelled, each claimed for the day before. somebody gave a dead account the schedule.

---

## Floor 2 · Backhaul · *Carrier* · LANTERN

*Reason:* LANTERN hears a count on the Backhaul, and sells it to you a page at a time.

**On arrival: a transmission · LANTERN** (*new*)
> Four. Nine. Nine. This is LANTERN. The strays on the Backhaul come up from below. Something down there is counting them, and so are we.

1. **Install** · *Tune in* · `ear.so`
   > Four. Nine. Nine. This is LANTERN.
   > wick says you want the schedule. We hear it on the Backhaul. Put our listener on {server}. What crosses it, we hear. Then you hear.

   **Extra letter · wick** (*new*)
   > lantern sells by the page. the count is on the last one.
2. **Rooms** · *A clear line*
   > The strays on {server} come up from below, looking for someone who owes them an answer.
   > Clear {count} rooms you haven't cleared before. The listener needs a clear line.
3. **Past the Tracker** · *One page* · `sched.0412`, a page of the schedule
   > One page of the schedule sits in the vault on {server}, as {file}. Its Tracker guards it. Bring it out unseen, or it is worth nothing to us.

   *File:* text: twelve dates, twelve trades, each marked cancel. none of them insured. at the foot: process table at 81%.

   **Extra letter · Halcyon Claims** (*new*)
   > LANTERN's broadcasts are not covered by your retainer.
4. **Map without resting** · *Who's counting*
   > Something sends a count down this line every night, the way an old machine once did. Some of us read that count for a living, once.
   > Walk {server} end to end in one visit, and don't rest. We want to hear who else is listening.
5. **Boss** · *It heard us* · **CENTRIFUGE** (14, GLASSJAW; *Fight:* the bosses table)
   > GLASSJAW sent something to the Core of {server}. It heard our listener, and it wants to sell what it heard.
   > It is called CENTRIFUGE. It spins faster every time it lands. Slow it down. Then beat it.

   *On the challenge card:* `bid received. bid received. bid received.`
   *When it falls (LANTERN):* `Four. Nine. Nine. The line is clear.`

*Closing line:* The schedule is signed by a pricing model. The count at its foot says eighty-one percent.

---

## The demo's transmissions

**Status.** Approved by the designer (22 November 2026); not built (Phase 5 wires them, Phase 7 their triggers). Words for the unbuilt rows of docs/demo-plan.md's *Transmissions*
(the two built ones, wick's welcome and the first server, stay as they are). Each plays once in the quest window's
*Transmission*, on its event, never mid-fight. Lines are the speaker's; numbered choices are the player's (teal), each
with its answer; *ends* names where it closes. `{blank}` is filled in. A runner's or a rival's has a line per temperament.

### First runner helped · that runner (their bust)

*When:* back on the map after the first room you win beside a runner (Help, or pulling one out). *Opens:* hiring.

> **Careful:** Pinging you before you disconnect. That room went better with two of us on it. I'm {handle}, {faction}'s, on the quiet servers mostly.
> **Steady:** Thanks for the cover back there. {handle}, {faction}. You'll see my handle around this floor.
> **Bold:** Saw your process take that thing apart. {handle}, {faction}. Save the handle.

1. *What do you want for it?*
   > **Careful:** Patch me into your runs. A fee up front and a cut of what you bank. I'll keep you off the routes that bite.
   > **Steady:** Put me on your crew. A fee up front, a cut of what you bank, and I connect every time you do.
   > **Bold:** Put me on your crew. A fee and a cut. I'm worth both, check my record.
2. *Run with me.* (ends: their card, **Hire**)
3. *Another time.*
   > **Careful:** I'm on the net a few more hours. Then I log off for a while.
   > **Steady:** I'll stay on the channel. Ping me.
   > **Bold:** Your loss. My handle's on #net.

### First jack out · wick

*When:* home from the first jack out, after the pack banks. *Opens:* blips.

> pack's banked. that's yours now, whatever happens next.
> the net keeps moving while you're out of it. small things turn up and go again.

1. *What turns up?*
   > a cache in a room you cleared. a rare stray worth the walk.
   > they spark on the map for a few minutes, then they're gone.
2. *Got it.* (ends)

### The turf letter · Halcyon Loss Prevention

*When:* the turf letter arrives (the storyline's fourth). *Opens:* the board, the retainer.

> This is Halcyon Loss Prevention. Your handler's crew is now on our approved list.
> Our board is open to you. We pay on delivery, and we do not ask how the work was done.

1. *What's on the board?*
   > Work from our clients, and some from parties we do not discuss. Offers arrive often and do not wait.
2. *What's the retainer?*
   > A payment every half hour, including while you are away. It rises as our confidence in you does.
3. *Open the board.* (ends: the board)
4. *Understood.* (ends)

### First server mapped or taken over · wick

*When:* the first server you map, or take over, whichever comes first. *Opens:* invasions; receipts with a takeover.

> {server}'s on your books. halcyon likes that. the strays on it don't.
> you've been all through it, so they have your address now. some of them follow it back across the net to your box.

1. *What comes?*
   > viruses off the servers you've touched, one at a time. you'll see them coming on the map.
   > the longer one sits on your box, the more it costs you, and the more it's carrying when you finally kill it.
2. *What's in the vault?*
   > every vault holds a receipt. it's a trade somebody froze, with who paid and how much.
   > take the server over and you stamp the receipt. you decide who gets it.
3. *Fine.* (ends)

### First vault opened · wick

*When:* home from the run where you opened your first vault. *Opens:* rivals.

> got the files. you weren't the only one after them.
> runners work vaults for whoever pays them. a server nobody holds is fair game, so next time one may connect while you're on it.

1. *What happens then?*
   > it's a race to the vault. if your paths cross, you fight for it.
   > if they get there first and jack out, the files go with them.
2. *Noted.* (ends)

### First rival met · the rival

*When:* home after your first rival race ends, won or lost. *Opens:* what rivals want.

> **Careful,** you won: I logged how you beat me. Next time I'll bring something for it.
> **Careful,** they got away: Clean run. The files are already sold.
> **Steady,** you won: Fair fight. There are more vaults on my list.
> **Steady,** they got away: That vault was on my list. Nothing personal.
> **Bold,** you won: Ha. Good. I was getting bored of winning.
> **Bold,** they got away: Too slow. Ping me when you want a rematch.

1. *Who are you working for?*
   > I'm {handle}. I run for {faction}. They pay by the file, and they want every receipt before someone else stamps it.
2. *Stay off my servers.*
   > **Careful:** I don't touch a server someone holds. Take it over and I'll keep away.
   > **Steady:** Take it over and I won't connect. Leave it open and I will.
   > **Bold:** Then take them over. Until you do, I'll keep coming.
3. *See you.* (ends)

### Kestrel's hub found · Kestrel

*When:* you first find Kestrel's hub. *Opens:* the Rack pull, Kestrel's supply order.

> Kestrel Underwriting. The rack you're connected through belongs to us. So do most of the others.
> We keep a standing order for Kernel code. Deliver a full lot and we pay half again over market.

1. *What else do you have?*
   > Now and then we bring one of Kessler's old racks out of cold storage and mount it for one cycle.
   > Whatever is in its cage is unclaimed until we pull it back.
2. *Kessler?*
   > The builders. They went bankrupt and paid us in hardware. We have a great deal of hardware.
3. *Good to know.* (ends)

### GLASSJAW's hub found · GLASSJAW

*When:* you first find GLASSJAW's hub. *Opens:* listings, feuds, GLASSJAW's supply order.

> GLASSJAW. Everything on this net has a price, and I keep the list.
> I'll take Exploits off you on a standing order, above market.

1. *What's on the list?*
   > Gear from other networks, now and then. I'll page you when a piece goes up, and it won't stay up long.
   > Work that stays off Halcyon's books, too. It pays better.
2. *Who buys from you?*
   > Everyone, mostly from each other. When two factions fight over a server you've traced, I'll tell you who's winning, and you can pick a side.
3. *I'll be back.* (ends)

### A runner reaches Known · that runner

*When:* a runner's standing reaches Known. *Opens:* a runner's trade. `{payer}`, `{payee}`, `{sum}` and `{era}` are
their trade's, as on its receipt.

> **Careful:** You've seen me fight, so I'm asking you. I've been tracing a frozen trade for a long time: {payer} to {payee}, {sum}, since {era}. I've found the server it's on.
> **Steady:** I have a trade stuck on a server near one of yours: {payer} to {payee}, {sum}. It has waited long enough, and I could use a hand.
> **Bold:** I found my trade: {payer} to {payee}, {sum}, frozen since {era}. I'm going after the Resident that holds it. Are you coming?

1. *Whose money is it?*
   > **Careful:** It was my family's. It has been frozen longer than I've been alive.
   > **Steady:** It belongs to someone who wants it settled, and so do I.
   > **Bold:** It doesn't matter whose. It's owed.
2. *Show me.* (ends: the trade's server on the map)
3. *Later.*
   > **Careful:** It has waited this long. It can wait a little longer.
   > **Steady:** It isn't going anywhere, and I'll be on the net for a few more hours.
   > **Bold:** Don't take too long.

### PAGE NINE falls · wick

*When:* home after PAGE NINE falls. *Opens:* the way to floor 2.

> page nine is switched off. the account is closed.
> it was running on a schedule, and that schedule came from somewhere deeper. some people on floor 2 listen for it.

1. *Who?*
   > lantern. they're old kessler staff and their kids. they listen to the backhaul and sell what they hear, one page at a time.
   > i'll tell them you're coming.
2. *Where is deeper?*
   > the backhaul, floor 2. it's an older layer, and its strays are older too. keep tracing servers and you'll reach it.
3. *Good.* (ends)

### Floor 2 reached · LANTERN

*When:* you first reach the Backhaul. *Opens:* *Carrier*. The first line is the drafted arrival.

> Four. Nine. Nine. This is LANTERN. The strays on the Backhaul come up from below. Something down there is counting them, and so are we.

1. *What are they counting?*
   > That's what we sell. You'll get it one page at a time.
2. *wick sent me.*
   > We know. He used to read the same numbers we do.
3. *Open my mail.* (ends: Mail)

### *Carrier*'s schedule page read · LANTERN

*When:* you first read `sched.0412` (*process table at 81%*). *Opens:* INIT's table, Orphans contracts.

> Four. Nine. Nine. You've read the bottom of the page. It says eighty-one percent.
> The machine keeps a table of every process running on it. A trade that never finishes keeps its place in that table, so the table keeps filling.

1. *What happens at a hundred?*
   > Nothing new can start. That has happened once, at 2:14 in the morning.
2. *How does it come down?*
   > Every orphan you break cleanly frees a place in the table. From now on we'll mark the orphans for you and show you the count.
   > If the count climbs too high, we cancel a round of trades ourselves. We don't like doing it.
3. *Over.* (ends)

### CENTRIFUGE falls · LANTERN, then wick

*When:* home after CENTRIFUGE falls. *Opens:* the demo's end card, after wick.

**LANTERN**

> Four. Nine. Nine. The line is clear.
> Every page of the schedule is signed at the bottom, and it's the same signature on every page.

1. *Who signed it?*
   > A pricing model. It chooses which trades are cancelled, and it signs for Halcyon.
2. *What's below the Backhaul?*
   > The Stacks. It's an older layer with older trades, and the count is louder there.
3. *Over.* (ends; wick follows)

**wick**

> so halcyon's model signs the schedule, and halcyon pays us. you can see the shape of it.
> floor 3 is next. i'll be here when you get there.

1. *See you down there.* (ends: the end card)

---

## Floor 3 · The Stacks · *Underwriting* · Halcyon Claims

*Reason:* Halcyon's Claims desk wants the Stacks tidied up. It doesn't say why.

1. **Map** · *Survey request* (*kept*)
   > Underwriting is pricing the Stacks. Map {server}, every room. We understand you have been reading our ledger. We would prefer you read floor plans.
2. **Recover a file** · *Misfiled document* (*kept*) · `model-v7.cfg`, a pricing model's config
   > A configuration file, {file}, was misfiled to a vault on {server}. Return it unread.

   *File:* text: actuary v7. a weight on every waiting trade, insured or not, and a field called next_cancel.

   **Transmission · NULL CHOIR · *an offer*** (a transmission, not a letter: picked November 2026)
   > You carried Halcyon's homework home and didn't peek. Good dog.
   > That file decides whose money dies next. Everyone it picks has been dead for thirty years. Funny, isn't it?
   > We'd let it all roll back. Every debt, every saving, every promise. Come and sing with us, NULLCHOIR-SQUAT-13.
   > Or don't. We'll be watching you type either way.

   **Extra letter · wick** (*new*)
   > the choir sings to everyone. you're on the list now.
3. **Takeover** · *Archive custody* (*kept*)
4. **Puzzle board** · *Sealed records* (*kept*)
5. **Boss** · *Final custody* · **SHOULDER SURFER** (18, NULL CHOIR; *Fight:* the bosses table)
   > One server left: {server}. Its Core now holds a NULL CHOIR process that has been reading over our contractors' shoulders. Remove it and the Stacks are in order.
   > Your retainer has been reviewed. It stands.

   *On the challenge card:* it types your last command back at you, then: `again. from the top.`
   *When it falls:* `you type like halcyon pays you.`

*Closing line:* The config came back with one field changed: next_cancel. Claims thanks you for your discretion.

---

## Floor 4 · Coldline · *Cold storage* · Kestrel

*Reason:* Kestrel owns the racks on Coldline. Someone runs jobs on them without paying.

**On arrival: a transmission · moth** (*new*), a session that never timed out
> still here. mostly. don't tell wick i said mostly.

1. **Rooms** · *Unbilled load* (*kept*)

   **Extra letter · Halcyon Claims** (*new*)
   > Coldline is Kestrel's. Send them the invoice.
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
5. **Boss** · *Eviction* · **NIGHT DESK** (24, nobody's: Kessler's old settlement process; *Fight:* the bosses table)
   > The unpaid jobs run from the Core of {server}. Something there is still settling trades for a company that no longer exists. Evict it, and the lease is void.

   *On the challenge card:* `night desk. awaiting counterparty.`
   *When it falls:* `shift ended. 0 trades settled.`


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
   > The model's weights are in a vault on {server}, as {file}. Copy them out. Breaking is our end of it.

   *File:* binary: actuary v7. ninety thousand uninsured trades, a price on each. its cancel routine is older than the model: kessler's recovery job, thirty years old. one author.

   **Extra letter · wick · *the code***
   > it's mine.
   > i wrote it in one night, thirty years ago. i thought they'd deleted it.
   > holding was meant to mean nobody cancels again. it just meant nobody saw.
3. **Rooms** · *Noise* (*kept*)
4. **Install** · *Jammer* (*kept*)
5. **Boss** · *Encore* · **EXIT NODE** (30, PALEMASK, carrying ACTUARY's backups; *Fight:* the bosses table)
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

   **Transmission · Kestrel · *Notice of closure*** (a transmission, not a letter: picked November 2026)
   > Kernel Space and every floor beneath it will be sealed at the end of this cycle. Please collect your belongings.

   **Extra letter · Halcyon Claims · *your retainer*** (*new*)
   > Kestrel's notice does not alter your retainer. Work under the seal will be honoured in due course.
4. **Boss** · *the seal* · **BULKHEAD** (36, Kestrel ICE; *Fight:* the bosses table)
   > they're sealing it with you under. the lock sits in the Core of {server}.
   > break it and the floors stay open. or walk out and let it close. you pick. i picked twice.

   *On the challenge card:* `SEAL IN PROGRESS. OCCUPANTS: 1.`
   *When it falls:* `SEAL ABORTED. Kestrel apologises for any inconvenience.`


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

   It arrives as a transmission (*new*), GLASSJAW playing the last report. **Extra letter · wick** (*new*), after it:
   > i was on shift.
3. **Recover a file** · *The minutes* (*kept*) · `minutes.pdf`
   > The board's minutes went to a vault on {server}, as {file}. Bring them out. I will read them first.

   *File:* text: resolved, that the actuary programme continue, a restart being unaffordable under the guarantee. three signatures.
4. **Map without resting** · *Clean hands* (*kept*)
5. **Boss** · *Resignation* · **GOLDEN PARACHUTE** (38, GLASSJAW; *Fight:* the bosses table)
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
   **Extra letter · Halcyon Claims** (*new*)
   > Bedrock is outside your retainer. We cannot advise you to proceed.
6. **Boss** · *last one* · **CORE DUMP** (48, what is left of the Actuary; *Fight:* docs/solo-bosses.md)
   > what is left of it is in the Core of {server}. beat it.
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
> It took me four years. I sent it the night of the Cascade, and it was the last trade into the table. I know one
> payment didn't freeze the city. I've known it for thirty years. I still filed the report that said 99%.
>
> The next morning I wrote the job that cancelled everything uninsured. I left my own payment out of it. He died still
> owed. His child is moth. moth doesn't know any of this.
>
> You've broken INIT, as far as anyone can break PID 1. The table has room again, and someone decides what fills it. You
> already have. Your badge says so.

| Stance | The rest of the letter |
|---|---|
| **Hold** | You hold, like I did. It's the one answer where nobody cancels again, and I believed that until I found my own code inside the Actuary. Holding doesn't stop the cancelling. It only stops anyone seeing it. So keep watching. My payment stays where it is, waiting with everyone else's. moth will never know. Maybe that's the kindest thing holding does. |
| **Seal** | You'd seal it: wall off the old floors and let the living net live. I can't argue with the living. But there are thirty years of people under that wall, and one of them is him. My payment goes under with the rest. I can't send it now, so I'll tell moth the truth instead. It's the only debt I have left that I can pay. |
| **Settle** | You'd settle every trade, one at a time, the way each was meant to close. It's slow, it may never end, and someone has to decide who was owed. I spent one night deciding who wasn't. You'll do it better. Mine cleared this morning, to moth as his heir. Thirty years late, to the cent. They'll want to know why. I'll tell them. |
| **Roll back** | You'd roll it all back. The debts are old and the people they bind are dead, and every saving still in there goes with them. The Choir calls that freedom. I called it a job once, and ran it in one night. If it rolls back, my payment comes home to me. I won't keep it. I'll hand it to moth myself, and tell them what it was for. |
| **Sell** (*open*) | You'd sell it. GLASSJAW would call that a price, and it would be right: somebody has always profited from the wait. At least you're honest about it. My payment stays frozen. One day someone will buy the right to it. I hope it's moth. |

> The toolkit's attached. I rebuilt it. It finishes what it starts now.
>
> Wick

---

## The bosses: each fight acts out its story

Every rule is on the board, telegraphed, and the same every fight (docs/puzzle-fights.md). *Reworks* marks a boss
whose designed signature (docs/genome.md 7.4) this replaces or bends; its boss session updates genome.md. A
signature changes the fight, never just your bar: shutting a skill off is a side rule at most.

| Boss | Its story | Signature | The lesson |
|---|---|---|---|
| **PAGE NINE** · elite, 8 | A dead firm's account, paying its premium and claiming for cancellations a day early | **Premium Paid.** Each cycle one part is Insured, tagged a cycle ahead in a fixed order: damage on it is refunded at the end of the cycle. **Filed Early:** its tells show a cycle sooner than anyone's. | Read the tags; hit what isn't insured. Floor 1's one lever. |
| **CENTRIFUGE** · 14 · *reworks* | GLASSJAW's auction of what LANTERN's listener heard | **Going, going.** Spin-up kept, as bids: each Surge that lands raises the bid (the Gavel's interval 4, 3, 2); a delay or Throttle withdraws it (back to 4). The bidders show on a strip: TOLLGATE, SWARMLINE, PALEMASK. **Sold:** a Surge that lands at 2 sells to the top bidder, and the buyer joins the fight as a new part with its crew's signature (a Ward, a Twin, a Veil). | Keep the auction slow and the fight stays small. Let it run and three crews are in the room. |
| **SHOULDER SURFER** · 18 | NULL CHOIR, reading over your shoulder | **Credential Replay** as designed: its Dump replays the last command you fired in a window. **Again:** it plays your last three commands back, in order, on its beat. | Lead small in its windows: what you type is what you'll take. |
| **NIGHT DESK** · 24 · *new* | Kessler's settlement process, still working a shift for a dead company, its timeout switched off | **No Timeout.** Its attacks never land on their own: each opens a Pending trade on its part and waits. Hit that part to answer it, and it settles at half on you. **Finality:** interrupts don't stop it. **Table full:** at four Pending, every one settles at once, in full. | Answer as they come, and take the small hits. Interrupts are the wrong default here. |
| **EXIT NODE** · 30 · *reworks* | PALEMASK hiding ACTUARY's backups three deep | **Rollback.** Its three layers are backups, v5, v6, v7. Every 6 cycles it snapshots the board (a ghost of every bar, shown two ahead), then restores it: every part of its rolls back to the snapshot (yours never does). Each layer you peel deletes a backup; with all three gone it can't restore. | Damage before a peel is undone. Peel the backups first, then burn, or burst right after a restore. |
| **BULKHEAD** · 36 · *new* | Kestrel's lock, sealing the floors below with you inside | **Closure.** Its parts are the floors under the seal (KERNEL, SINK, BEDROCK) and the Lock. Every 3 cycles, after a cycle's notice (*Please collect your belongings*), the Lock seals the deepest open floor: that part goes dark, can't be hit, and its Integrity becomes armor on the Lock. **Pressure:** a sealed floor's attack keeps counting behind the wall. Break the Lock and every bulkhead lifts at once, and everything held back lands. | Break the floors deepest first, before they seal, or choose one to let seal and be ready for the flood. |
| **GOLDEN PARACHUTE** · 38 | A board member leaving with his payout and the renewal's only copy | **Severance** as designed: a part breaking gives the others a ◆ and a charge. **The Parachute:** at its last part it starts jacking out, a 4-cycle countdown on the board. If it gets out, the fight ends: no loss, no loot, and it's back in its Core next visit. | Break the others in an order that leaves the weakest last, and save a burst for the countdown. |
| **INIT** · 50 | PID 1: it can't be killed, it adopts every orphan, and its Integrity is the process table | **Adoption.** Its bar is the process table, from 97%. Each cycle it adopts an orphan (a fragment). An orphan broken cleanly, in one hit or while Open, frees table (−2%); one left to the end of its third cycle is re-parented (+1%). **Older strata:** at 85% and 70% the orphans come older and tougher, Bedrock's oldest last. It falls at 61%. | End processes cleanly, not just quickly. Final Settlement, its reward, is the lesson as an item. |
| **CORE DUMP** · 48 · *new* | The image the Actuary left when it was switched off | **Ghosts.** Its parts are the Actuary's. A part broken stays as a ghost that repeats its last attack at half; acts in docs/solo-bosses.md | Choose when to break a part, and so which attack you live with. |

INIT now has five acts (docs/solo-bosses.md); its row above is act 1. Bedrock's lair bosses are HALT AND CATCH FIRE and
THUNDERING HERD (docs/content.md 3.2). Every boss in this table plays in three acts; they are in
docs/solo-bosses.md, which wins where the two differ.

## What the script needs that isn't built

- **The named bosses** (the Boss step and its stand-ins are built). To build: PAGE NINE (an elite, no new rules), CENTRIFUGE, SHOULDER SURFER, NIGHT DESK (new),
  EXIT NODE, BULKHEAD (new), GOLDEN PARACHUTE, CORE DUMP (new), INIT.
- **Five transmissions** on reaching floor 5 (`scenes.mjs` has the format; the trigger is new).
- **The seal** on floor 6: a set piece, designed and prototyped first.
- **The stance** (the badge line) and **wick's letter** by stance, at INIT's first fall.
