# Journals

**Status.** Built (journals.mjs, journals-view.mjs; GAME_RULES.md *Journals*). Facts from docs/lore.md; the storyline's beats from docs/story-script.md.

## How they surface (picked in lore.md 9.2 session 2; built in session 4)

- **A journal entry is a file in a vault**, one entry a file, on the floor its header names.
- **Dates.** *C−N* is the Nth year before the Cascade, *C+N* the Nth year after; the day itself is *C0*. So 14 March
  2058 is C−4, 2 May 2090 is C+29, and now, 2091, is C+30.
- **Found on.** A floor that existed when the entry was written (lore.md 1). Anything older comes from Bedrock or
  from a restored archive on a later floor.

The designer's picks from the prototype:

- **Where: one Journals entry in the Ledger** (collection-view.mjs), its own index group, n of 51. The entry's head as
  any Ledger entry's, then the **timeline**, then the **writers**.
  - **Timeline:** one column a C-year, C−13 (2049) to C+30 (2091), entries stacked in date order. A found entry is an
    amber chip with the writer's initials; an unfound one a faint dashed **?**. Axis labels: year over C-year at 2049,
    2057, 2071, 2081, 2091. **The Cascade** is a thin ivory line through the C0 column, labelled *CASCADE 02:14 ·
    10 NOV 2061*; never red. On a phone the chips are 6px squares, no initials.
  - **Writers:** one row each: the letter icon, the name (??? until one entry is found), the latest role muted, a pip
    per entry (amber found), n/N. A click opens the writer's lines under the row and fades the others' chips. A line:
    the date as the name (??? until found), *C-year · floor* muted, the date found.
  - **Reading:** a found line or chip opens the entry under the timeline (its chip lit), with *‹ Writers*, ‹ › through
    that writer's found entries, and the floor and date found.
- **The find:** the first time you take one from a vault, a **document card** opens over the map (the `.gain` and
  `.pz-card` look): *Journal* kicker with n/51, the writer, role, date and C-year, the text, **Continue** (Enter) and
  **Ledger ›**. A bottom sheet on a phone. After that it's only in the Ledger.
- **The writer's medium,** a light touch in the card and the Ledger: a framed sheet with one muted header line and the
  writer's type. Sabine: typewriter (Courier Prime), *COURANT · CITY DESK · ROTH*. moth (and Dace): lowercase mono,
  *~/notes/2088-03-12.txt*. Margit's night-desk entries: amber mono, *KESSLER SYSTEMS · NIGHT DESK · <date>*. Everyone
  else plain sans. Nothing moves.
- **Tooltips:** a found slot *Maud Ilic, 9 November 2061: Journal entry, C−1. Found on 8 Bedrock, Oct 3.*; an unfound
  one *???: Journal entry, C+19.* then *▸ Open vaults on Backhaul.*

## The writers

| Writer | Role · faction | Entries | Voice and arc |
|---|---|---|---|
| Margit Sorensen | Night-desk operator · Kessler Systems, then LANTERN | C−13 to C+11 | Wry; calls INIT Grandad. The desk, finality, the first orphans, the fine, the last night; then the radio in her kitchen becomes LANTERN. Nell's mother. |
| Corin Wade | Senior underwriter, then chairman · Halcyon Mutual | C−12 to C+13 | Vain and polished. Pushes finality, writes the clause, invents the Guarantee, keeps the machine frozen. |
| Sabine Roth | City desk · *The Evening Courant* | C−5 to C+2 | Sardonic newsroom present tense. Prints the leak on page fourteen; walks the city the morning it stops; counts the soup line. |
| Maud Ilic | Teller · Brandt & Vey, then Harrow Street Credit Union | C−1 to C+29 | Chatty. The Marrs and Mrs. Kowal before the freeze, the first winter, and thirty years at a counter after. |
| Abena Oduya | Night-run supervisor · Pellucid Payroll | C−1 to C+6 | Formal and devout. October's wages on the night; Pellucid's dead; the soup kitchen; numbered letters to her son. |
| Benedikt Sauer | Pensions clerk · City Treasury Office | C+2 to C+28 | Dry, by the forms. Issues the buff slips; reconciles a round; his mother's frozen pension, until it's gone. |
| Nell Sorensen | Reader, LANTERN-RELAY-88 · LANTERN | C+12 to C+30 | Blunt. Grows up beside the set; takes the station over from her mother. |
| Yusuf Lamb | Broker · GLASSJAW | C+20 to C+30 | Prices everything. Buys INIT's reports, up to the last page. |
| Ruth Amsel | Night technician, Coldline racks · Kestrel Underwriting | C+23 to C+30 | Dry and sensory. Bills every unpaid job, then hides one runner's session. |
| Kit | Singer · NULL CHOIR | C+24 to C+30 | Fervent. Joins for Gran's house on Vey Street; is shown the sum. |
| Teodor Asch | Claims Adjuster II · Halcyon Mutual | C+26 to C+30 | Melancholy. Stamps Liesl Marr's claim every March, and reads page six. |
| moth | Runner · LOWLIGHT | C+27 to C+30 | wick's soup, wick's sticky note, Coldline. |
| Dace | Runner · rents from SWARMLINE | C+30 | The letter to Mrs. Oduya. |

Lives that cross: Vey Street (the yellow house, the laundry); the Marrs and their statement; Mrs. Oduya, St. Matthew's
and letter thirty-two; Corvid Row; Ferrante's radio; the night desk's two operators; the lift that stops on nine; rack 40.

---

## Margit Sorensen

**Margit Sorensen** · Night-desk operator · Kessler Systems · *22 June 2049 · C−13* · found on 8 Bedrock, Kessler's night-desk terminal

> Grandad took in forty new servers tonight and never so much as hiccupped.
>
> That's what the desk calls INIT: Grandad, because he's process number one and everything else on the machine is
> family to him somehow. Annick Life wheeled their boxes in at eleven, still in the plastic, and their engineers stood
> about in clean shoes while ours racked them. At ten past one a payroll job that had been running on rack two since
> Tuesday got up and walked onto one of Annick's boxes, the way a cat moves to a warmer chair. I watched it go on the
> big board. Petrov says no other machine on earth can do that. Petrov says a lot of things, but I believe that one.
>
> Eight years ago Kessler was forty banks on one floor of this building. Now it's insurers and two exchanges and the
> tram company's wages, and next spring the city's own accounts come on, rents and pensions and dog licences. Every
> time somebody joins, Kessler buys more boxes and Grandad takes them in. I asked the senior once what would happen if
> anybody switched him off. He said the city would find out what money was.
>
> Nine hundred thousand trades between midnight and six. Twelve timed out and went back to whoever sent them, no harm
> done, and I logged each one in the blue book in my best handwriting, for nobody.
>
> Home at seven on the empty tram. Erik had bought a Kessler test bench at the surplus sale for the price of a pair of
> boots, and put it on the kitchen table where the bread goes. He wants to build a radio and listen to ships. I ate my
> toast standing up while he explained valves to me, and fell asleep in my coat.

**Margit Sorensen** · Night-desk operator · Kessler Systems · *3 March 2051 · C−11* · found on 8 Bedrock, Kessler's night-desk terminal

> The members voted for finality this afternoon, and the desk ran a sweep on it. I had Halcyon by a landslide and won
> four and six off Petrov.
>
> The senior was on the call for an hour before the vote. He'd printed every trade the timeout had saved in ten years,
> and he read them out in the voice he uses for the fire drill: a hospital's wages in '46, a ferry company that went
> under at four in the morning with half its diesel bought. He went on so long that Petrov started the crossword.
> Halcyon's man let him finish. Then Halcyon's man said, in one sentence, that a payment which comes back is a payment
> which failed, and that Halcyon was tired of paying for failures. They voted, and that was that.
>
> It was the senior's timeout. He wrote it when he was younger than I am now. He could have left it to the day shift.
> At twenty to midnight he sat down at the console and typed it out of the world himself, and signed the log, and
> under his name he wrote *objection on file*, very small.
>
> Then he went down to the street and bought a bag of hot chestnuts from the man outside the station and shared them
> round the desk, which is the nearest thing to a party he's thrown in the six years I've known him.
>
> Nothing timed out tonight. The blue book is in my drawer with a rubber band round it.
>
> Erik's radio picked up a trawler off the Point, and a man on board singing in a language neither of us knew.

**Margit Sorensen** · Night-desk operator · Kessler Systems · *14 August 2053 · C−9* · found on 8 Bedrock, Kessler's night-desk terminal

> Calloway Shipping went bust at eleven this morning while I was asleep, and by the time I came on it was all the desk
> could talk about.
>
> Calloway had three hundred and twelve payments in the machine when the receivers padlocked its doors. Two hundred
> and ninety closed before lunch. Twenty-two didn't. Calloway paying people, or being paid by them, and Calloway no
> longer there to say yes.
>
> Two years ago the timeout would have sent them home in four seconds. Now they sit. The senior put one up on the big
> board for us: Calloway to a chandler in the Narrows, eighteen hundred for rope. It has its own number in the process
> table, and every second it asks whether Calloway is still there. Calloway is a padlock and a notice on a door in
> Dock Road.
>
> Grandad has adopted all twenty-two. When a process loses its parent, the old man takes it in and waits for it to
> finish so he can tidy it away. The senior watched the board for a long time, and then he said, quietly, to nobody,
> that these weren't going to finish. Then he went back to his desk and didn't speak again till six.
>
> Petrov named the rope one Hemp. By three in the morning we were all saying goodnight to Hemp on the board. I said it
> too.
>
> The chandler rang at six, the minute the day line opened, and asked where his money was. I told him it was in
> progress. He asked how long. I gave him the senior's extension.

**Margit Sorensen** · Night-desk operator · Kessler Systems · *28 September 2057 · C−5* · found on 8 Bedrock, Kessler's night-desk terminal

> Kessler fined the boy a year's wages today.
>
> The boy is our junior, the one the senior's been training since last spring: all elbows, and lower case in
> everything he types, because he says capitals waste a keystroke. Since the reports started he reads the four o'clock
> page before anyone, *process table at* whatever it is, before Halcyon's courier comes for it at five. It was
> fifty-two this morning. It was forty-one when Halcyon started buying them. He keeps the figures in pencil on the
> inside of his locker door, a column of them running down towards the floor.
>
> A fortnight ago one of those pages turned up in the *Courant* on page fourteen, under a recipe. I knew it was him
> before anyone said, because he came in that night and couldn't sit still. Head office knew by Friday.
>
> The letter came by hand. They sent a man up in the lift just to put it on the desk in front of him. He read it twice
> and folded it into his coat, and his ears went red to the tips. He has seventy in his account. I know, because on
> Tuesday he borrowed his tram fare off me.
>
> At midnight his screen showed the fine as paid in full. He looked at it a long time. Then he walked over to the
> senior's desk and stood there with his hands in his pockets. The senior was eating a boiled egg out of a paper bag,
> with his back to the room, and he didn't turn round. After a while the boy went back to his chair.
>
> A woman from the *Courant* rang at nine and asked for him by the shape of his handwriting. I said there was nobody
> here like that. She was quiet for a moment, and then she said goodnight.

**Margit Sorensen** · Night-desk operator · Kessler Systems · *10 November 2061 · C0* · found on 8 Bedrock, Kessler's night-desk terminal

> 00:40. Ninety-four. Grandad's slow tonight. Everything that comes in stands in the queue behind ten years of Hemps
> and waits its turn.
>
> The senior's at home. It's the boy and me. Petrov retired in the spring and sends postcards of the sea.
>
> At midnight the boy sent a payment from his own account with his coat still on. The last of it, he said. Four years
> of bread and margarine and walking to work in the rain. He was grinning, and he hasn't grinned since the fine. It's
> in the queue behind Pellucid's month-end run, and he keeps looking at it like a man watching for his bus.
>
> 01:20. Ninety-six. At this time yesterday it was ninety-one.
>
> 02:02. Ninety-eight. I rang Pellucid's night supervisor and asked her to hold the run. She said it was already in. I
> knew it was, and I'd asked anyway. I said I was sorry and put the phone down before she could ask me what for.
>
> 02:09. The boy is typing the report. He hasn't asked me to check his spelling. His hands are quite steady.
>
> Erik will be up. On the nights I work he keeps the set on and listens to the ships, with Nell asleep on his chest.
>
> 02:13.

**Margit Sorensen** · Night-desk operator · Kessler Systems, then LANTERN · *17 January 2062 · C+1* · found on 7 The Sink, in a restored archive

> Ten weeks since Grandad stopped, and Kessler House has a chain on its doors as thick as my wrist.
>
> They kept the boy in for two days after. Kessler's lawyers came up in the lift at six that morning with the day
> shift and sent the rest of us home, and when he came out on the Saturday he walked past our door twice and didn't
> knock. Nobody from the desk has seen him since.
>
> We had two hundred and eighty in the house when it stopped, in notes, in the biscuit tin, because Erik doesn't trust
> anything he can't open with a screwdriver. It's gone. The coal man takes cash and nothing else, and so does the
> baker, and so does everybody who's still selling anything. Erik sold his good boots in December, and in January our
> two kitchen chairs went in the stove. We sit on the floor to eat. Nell thinks it's a picnic.
>
> The radio stayed. It runs off a car battery and nothing in it ever touched the clearing house, so most nights it's
> the only set on our street that works, and the neighbours come in their coats to listen to the ships. Last week a
> man from Harrow Street Credit Union knocked, Ferrante, with a list of his members' payments that froze on the night.
> He asked whether I could read them out over the air. In case somebody somewhere was listening who owed them, he
> said, or was owed.
>
> So on Tuesday at four in the morning I did. I opened with my old extension on the desk, because it's the only call
> sign I've got. Four, nine, nine. Then Ferrante's list, slowly, every name and every sum.
>
> On Thursday two more men came to the door with lists. One of them was Petrov, back from the sea.

**Margit Sorensen** · LANTERN · *9 May 2072 · C+11* · found on 4 Coldline

> My hands have started to go: a shake when I hold the pencil, worse in the mornings. Nell does the dial now and I do
> the strings, and when she reads she leans into the microphone the way I used to, as if the people listening were in
> the next room.
>
> Ten years on the air. There are nine of us, all old Kessler or married to it, with sets in kitchens from Low Harrow
> to the Narrows. Petrov does Thursdays from a caravan. We call ourselves LANTERN, because Petrov said a numbers
> station ought to have a name and that was the first thing he saw.
>
> Grandad still files his count every night, to nobody, and the beacons the boys strung along the old Kessler lines
> can hear it all the way down. We sell it now. Halcyon sends a man on Fridays and pays in coin. It buys the batteries
> and Petrov's diesel.
>
> The count is seventy-eight. The cancelling has run five times since that first morning. Each time it runs, the city
> builds another floor in the room it makes, everyone goes out on the bridges to see the lights, and the count goes
> down. Each time, when we read out the strings from the tin, fewer of them are still waiting.
>
> The boy never came back. Somebody said he went to work for the crews.
>
> I keep my desk book in the bread bin. Nell asked me last week about the last page, the torn one. I told her it was a
> shopping list.

---

## Corin Wade

**Corin Wade** · Senior underwriter · Halcyon Mutual · *8 November 2050 · C−12* · found on 7 The Sink, in a restored archive

> Lunch at the Marchmont with Calloway's man, who ate nothing and wanted to know why his claim had taken eleven days.
> I gave him the soup and the explanation, in that order.
>
> His grain payment went into Kessler's clearing house at four in the morning. The buyer's bank, a sleepy provincial
> outfit, took five seconds to answer, and Kessler's timeout, which allows four, sent the payment home like a letter
> with the wrong stamp. By the time Calloway tried again a rival had bought the grain. Two hundred and six thousand,
> plus costs, plus my afternoon.
>
> It is the ninth such claim this year. Each one is a policy behaving impeccably, and each one is a hole in my book
> that I am expected to explain to the twelfth floor in a suit I can't yet afford.
>
> So I have stopped explaining and started drawing. The chart I took up to Mrs. Lisle this evening has one line on it,
> rising, and a small red arrow at its foot marked *timeout*. She held it at arm's length, the way she holds menus,
> and said, Corin, can it be switched off? I said anything at Kessler can be switched off by the man who switched it
> on. She wants a paper to the members by the spring.
>
> The lift stopped on nine on my way down. Nine has been empty since the Tower went up. The doors opened on a dark
> corridor with dust sheets over the furniture, and stood open long enough for me to feel looked at, and closed.
> Facilities have raised a ticket. I took the stairs from eight.

**Corin Wade** · Senior underwriter · Halcyon Mutual · *3 March 2051 · C−11* · found on 7 The Sink, in a restored archive

> Carried at four o'clock by every member of the clearing house except Brandt & Vey, which abstained. Old Vey will
> learn at renewal what an abstention costs.
>
> I had expected Kessler to send a lawyer. They sent their settlement engineer, a tall, tired man in a cardigan, who
> spoke for an hour from a stack of printouts without once looking up. He read out the trades his timeout had saved: a
> hospital's wages, a ferry line that sank on paper at four in the morning. He read them like names on a war memorial,
> and it was quite effective. By the end half the members were looking at their shoes.
>
> When he had finished I thanked him, put up the chart, and let the members look at their own premiums. That did the
> rest.
>
> He asked one question afterwards, in the corridor, while people were finding their coats. What happens to a trade,
> he said, when the other side is never coming back? Mrs. Lisle told him that banks do not simply vanish, and that if
> any looked likely to, Halcyon would be delighted to insure it. He nodded as though she had answered him.
>
> Dinner in the long room at the Marchmont: the duck, a Saint-Aubin, the good cigars. Our settlement premiums will
> fall by a third and our claims by nine-tenths, and at the end Mrs. Lisle stood and toasted the engineer in his
> absence, which I thought handsome of her.
>
> The lift came down from the forty-first floor without stopping anywhere.

**Corin Wade** · Senior underwriter · Halcyon Mutual · *14 May 2056 · C−6* · found on 7 The Sink, in a restored archive

> Kessler has begun selling us a page a night, and I have begun reading it with my breakfast, which Marta finds
> morbid.
>
> *INIT: process table at 41%.* Kessler's people explained it to the twelfth floor with diagrams. Mrs. Lisle put it
> more briefly afterwards: a theatre with a fixed number of seats, filling up with an audience that never goes home.
>
> Legal asked me, with some anxiety, what the number would be in ten years. I asked them for a clause, and then
> rewrote it myself, because Legal writes like a frightened curate. *Losses arising from failure of the underlying
> system are excluded.* Mrs. Lisle had it set above the signature line on every renewal, in the same size of type as
> everything else. We do these things properly at Halcyon.
>
> Pardoe, Annick Life's chief underwriter, rang this afternoon to ask where we had found the wording. I said in a
> drawer. He laughed and said it was like insuring a house against the ground it stood on. Annick will keep its old
> terms. Pardoe has always been sentimental.
>
> Forty-one on Monday. Forty-one on Wednesday. Forty-two on Friday.
>
> Tonight I asked Marta to move our savings out of Brandt & Vey and into bonds. She asked me why. I said the carpets
> in the Vey Street branch were looking shabby.

**Corin Wade** · Senior underwriter · Halcyon Mutual · *3 February 2062 · C+1* · found on 7 The Sink, in a restored archive

> Pardoe came to see me today. Annick Life stops paying claims on Friday, because there is nothing left to pay them
> with. He didn't sit down. He wanted me to know he had read our clause again, in a newspaper this time, reprinted in
> full under the headline HOUSE AGAINST THE GROUND, and that he hoped I slept well. I told him I sleep perfectly well.
>
> The twelfth floor met at six. Halcyon has paid out less in three months than Annick paid in a week, and the city has
> noticed. There are people sleeping in the doorway of the Tower. Mrs. Lisle wants something to put on the trams.
>
> I gave her something. Every payment frozen in the machine will clear one day, and Halcyon guarantees it, for a small
> monthly premium. When a payment clears, we pay the claim. The actuaries ran the figures twice and came back pale,
> and then they came back smiling. It is the cheapest promise this company has ever made.
>
> Mrs. Lisle asked what would happen if somebody restarted the machine one day and the whole lot cleared at once. I
> said I would see to it that nobody did.
>
> She asked me to choose the colour for the seal. I chose green. It looks like money.
>
> The lift stopped on nine on my way out. I pressed eight to get away from it, and the doors opened on nine again.

**Corin Wade** · Chairman · Halcyon Mutual · *18 June 2074 · C+13* · found on 4 Coldline

> Mrs. Lisle was buried on Tuesday. On Wednesday the board made me chairman, and on Thursday Kestrel came to call.
>
> Kestrel's man was young and clever and badly dressed, an engineer who had been told to wear a suit and had borrowed
> one. He had a proposal. Kestrel owns every box Kessler ever bought, and has spent ten years learning what it owns,
> and now believes the old machine could be restarted. Everything frozen in it would clear, he said, more or less at
> once.
>
> I asked him to stay for lunch. We went to the Marchmont, and I let him order the duck, and while he ate it I
> described what *at once* would mean to an insurer that has written the Guarantee on half the frozen accounts in the
> city. He stopped eating at about the second glass.
>
> By the cheese we had an arrangement. Halcyon will rent the whole of Kestrel's newest floor, Coldline, for archive
> storage, for twenty years, at a price Kestrel's board will find difficult to refuse. Kestrel's engineers will have a
> great deal of archive to look after.
>
> He asked me at the door whether I ever thought about the people whose money was down there. I told him I thought
> about them professionally, every day.
>
> The lift stopped on nine on the way up to my new office. Somebody had taken the dust sheets off the furniture since
> I was last there. I did not get out.

---

## Sabine Roth

**Sabine Roth** · City desk · *The Evening Courant* · *12 September 2057 · C−5* · found on 8 Bedrock

> Wednesday. Council budget day, so the newsroom smells of fear and cold chips. I file eight hundred words on the tram
> subsidy. Morrow cuts it to three hundred and runs it under a photograph of a goat that got onto the Harrow line. The
> goat is page three. The subsidy is page nine.
>
> After lunch there's an envelope in my pigeonhole. No stamp: somebody walked it in past Doreen on the front desk,
> which takes nerve. One printed page, headed INIT. Under it, one line: *process table at 51%.* At the foot, Halcyon
> Mutual's crest and a distribution list. Clipped to the top, a note in pencil, all lower case, the letters very
> careful, like a child's on a birthday card: *this goes up every night. it has never gone down. ask kessler what
> happens at a hundred.*
>
> I ring Kessler. A woman in their press office tells me the figure is diagnostic and of no public interest, and asks
> where I got it. I ring Halcyon, because their crest is on it, and a man in Underwriting asks the same thing in a
> voice like warm butter, then asks after my editor by his first name.
>
> Hollis on the science desk says INIT is the first process on Kessler's machine. The grandfather, he says. Everything
> else on it is family.
>
> I go home past Kessler House on the number eleven. Every floor is dark except the top one, where somebody stands at
> the window with a mug, looking down at the city.

**Sabine Roth** · City desk · *The Evening Courant* · *30 September 2057 · C−5* · found on 8 Bedrock

> It runs on Tuesday the eighteenth. Page fourteen, below the ferry timetable, above a reader's recipe for plum cake.
> Morrow cuts it to six paragraphs and takes out the word *hundred*, because a hundred of what, Sabine, and I can't
> tell him. The headline is CLEARING HOUSE FIGURES QUERIED. I've written livelier captions for cattle shows.
>
> Reaction, in full: one letter, from a retired actuary in Low Harrow, correcting my use of *per cent*. Kessler shares
> up a point on Thursday. The *Morning Signal* doesn't follow it. The council's finance committee meets on Wednesday
> and spends forty minutes on the goat.
>
> Friday, a friend in Kessler's post room tells me head office has fined somebody on the night desk a year's pay for
> talking to the press. Nobody else has talked to the press. The somebody is mine.
>
> I ring the night desk at nine. A woman answers, very calm. I describe the handwriting: small, careful, lower case,
> someone who's been told off for his spelling. She says there's nobody there of that description. Then, after a
> pause, she says goodnight.
>
> Monday morning I pin the page over my typewriter, where Morrow has to pass it on his way to the lift. He reads it
> every day. He has never once asked me about it.

**Sabine Roth** · City desk · *The Evening Courant* · *10 November 2061 · C0* · found on 7 The Sink, in a restored archive

> The tram stops at Harrow Cross at a quarter past seven and doesn't start again. The driver gets out and stands in
> the road looking at his card reader, then at us, then at the sky. We walk.
>
> Every card reader in the city shows a green light and a little clock that turns and turns. The bakery on Vey Street
> is giving bread to anyone with a child. The queue outside Brandt & Vey goes round two corners, and a clerk inside is
> taping a notice to the glass: *in progress*.
>
> At the paper the switchboard is lit end to end. Pellucid hasn't paid anyone. The Treasury hasn't paid anyone.
> Halcyon's press office has a statement out by nine, which is quick, and which says nothing. Annick Life has none.
>
> Morrow gives me the front page and a word limit he doesn't mean. I ring Kessler House eleven times. On the eleventh
> a man picks up and says, very slowly, that the clearing house is operating normally and is unable to accept new
> instructions at this time. Then he starts to laugh, and puts the phone down.
>
> I write it with the page from four years ago propped against my typewriter. *process table at 51%.* Morrow comes by
> at six and looks at it, and at me, and asks if I want a coffee. He has never asked me that.
>
> The lead: *At 02:14 this morning, the city's money stopped.* He doesn't change a word.

**Sabine Roth** · City desk · *The Evening Courant* · *21 December 2062 · C+2* · found on 7 The Sink

> Second winter. The soup line at St. Matthew's starts at five and runs past the gasworks. I count it for the paper
> every Monday: four hundred and six this morning, up from three hundred and ninety. Morrow runs the number on the
> front page in a box, like the weather.
>
> The Tenements Board has taken over every block in Low Harrow whose landlord went under, which is most of them, and
> it is rehousing people in new flats with a Halcyon seal on every lease. Rent paid monthly, guaranteed. The queue for
> those runs past the gasworks too, the other way.
>
> The Guarantee is on the side of every tram: a green seal, a family on a doorstep, *Every frozen payment will clear.*
> I asked Halcyon's press office how many policies they'd sold. More than there are trams, the man said. I asked how
> many claims they'd paid. He said it was early days.
>
> For the anniversary the *Courant* reprinted page fourteen, shrunk to the size of a stamp, opposite a full-page
> Guarantee advertisement that paid for the issue. Three readers wrote in to say we should have said something sooner.
> Morrow had their letters framed and hung them in the lift.
>
> Kessler House is chained. Kestrel's name is on the board, painted over Kessler's in a hurry, the old letters showing
> through. On the tenth I rang the night desk's old number, out of habit. A recorded voice offered me the Guarantee.

---

## Maud Ilic

**Maud Ilic** · Teller · Brandt & Vey · *27 October 2061 · C−1* · found on 8 Bedrock

> Counter three, Vey Street. Thursday, the day the whole street gets paid and comes in to look at it.
>
> Mr. Haldane wound the clock on Monday and it's already four minutes fast, and he says it'll keep, which is what he
> says about everything, including the damp in the vault and his own heart. Brass rails, green lamps, and a carpet
> that's been the colour of strong tea since my mother banked here. Brandt & Vey is older than the clearing house, and
> Mr. Haldane would like you to know it.
>
> Anton Marr came in at lunch with Liesl, who's eight and has decided she's going to be a teller. I let her stamp his
> paying-in slip, and then she drew a horse on the back of it with my good pen, and I let her keep that too. He's
> saving for a flat with a second bedroom so she can stop sleeping in the box room with the boiler. Ten thousand eight
> hundred and forty. He likes to watch me write the number, and leans right over the rail to see it.
>
> Mrs. Kowal has finally sold the yellow house opposite the laundry, to a young couple from Corvid Row with a baby and
> a pram the size of a car. The money sits in our escrow until the deeds go through. She asked me three times how
> long, and I said a week, perhaps two, because that's what Mr. Haldane says to say. Everything's been slow since the
> summer. Transfers sit on my screen in a little grey box that used to say *pending*, until Head Office had it changed
> to *in progress*, because *pending* upset people.
>
> Tomas is taking me dancing at the Pavilion on Saturday if Corvid lets him off his shift. Mum thinks I'm at choir.

**Maud Ilic** · Teller · Brandt & Vey · *9 November 2061 · C−1* · found on 8 Bedrock

> Anton Marr came in at four with his hair still wet from the docks and paid in his week, and he went over eleven
> thousand, and he actually whooped, right there at the rail, and Mrs. Penhaligon at counter two put her hand on her
> chest. He asked for a printed statement to put on the fridge, so Liesl would see it when she got up. She's off
> school with a cold. I printed it on the good paper.
>
> Mrs. Kowal came in twice about her escrow. The second time she brought me a slice of her lemon cake wrapped in a
> napkin, and stood at the rail watching me eat it, as if that might hurry things along. I would have hurried it if I
> could. The little grey box said *in progress*, and the little clock in its corner went round.
>
> At five Mr. Haldane called us all into the back, where the coats are. Head Office had rung. No transfers to other
> banks until Monday, deposits only, and if anybody asked it was routine maintenance at the clearing house, and we
> were to smile. Mrs. Penhaligon asked whether we were in trouble. Mr. Haldane said Brandt & Vey had been in this
> building for ninety years. Then he went out and wound the clock, though it wasn't Monday.
>
> Tomas rang the branch at half past five to say the floor at Corvid was in uproar and he'd be working all night, so
> Saturday's off. I walked home along Vey Street in the dark. The lights were on in the yellow house. Mrs. Kowal had
> already taken the curtains down, and she was sitting in the bare window with her coat on, like someone waiting for a
> taxi.

**Maud Ilic** · Out of work · *9 February 2062 · C+1* · found on 7 The Sink, in a restored archive

> I'm writing this in my coat, because we burnt the last of the coal on Sunday, and Mum says we're not burning the
> table while she's alive. She says it every time she looks at it.
>
> Brandt & Vey's door is chained, and the brass rails are gone too. Somebody had them off with a hacksaw the second
> week, and Mr. Haldane stood on the step and watched them do it and didn't say a word. He drives the number eleven
> now, for cash at the end of each day. I see him most mornings, and he always lifts a finger off the wheel.
>
> Everyone on Vey Street banked with us, so everyone on Vey Street is frozen, and the ones who kept a bit under the
> bed are the rich ones now. Mrs. Kowal is still in the yellow house. She can't move out, because the sale's stuck in
> our escrow and she's nothing to move with. The couple from Corvid Row can't move in, because their money's stuck in
> the same place, so they're living with his mother, and she brings Mrs. Kowal their post.
>
> Anton Marr's docks paid through Pellucid, so he's had nothing since October, and his landlord's had nothing either.
> On Friday the bailiff put their things on the pavement. Anton stood there with Liesl on his shoulders and the
> statement from the fridge in his hand, and he showed it to the bailiff, and the bailiff read it all the way through,
> very carefully, and then carried on.
>
> Tomas still has his job, because Corvid only ever traded insured lots and got paid out, and Corvid is very pleased
> with itself. He brings us bread.
>
> Harrow Street Credit Union has asked me to come and count cash for them three days a week. They pay in cash.

**Maud Ilic** · Teller · Harrow Street Credit Union · *15 January 2063 · C+2* · found on 7 The Sink

> Harrow Street have taken me on properly, with a counter of my own. It's two rooms over a bakery, so the floor's warm
> in the mornings, which after last winter feels like being a duchess. Most of the members are paid in cash and pay
> their rent in cash and keep their savings in the union's safe, which looks like a wardrobe, and it came out of the
> Cascade with nearly everything.
>
> Tomas and I were married at St. Matthew's in October. Mrs. Oduya from the soup kitchen did the food, and wouldn't
> take a penny.
>
> Anton Marr came in today to open an account. The Marrs are in one of the Tenements Board's new flats on the far side
> of Harrow Cross, two rooms with a Halcyon seal on the lease, and he had nothing to put in the account, but he wanted
> a book. He had the statement from the fridge, gone soft at the folds, and he asked me very seriously whether we
> could take it as a deposit. I opened the account with a coin out of my own purse. Liesl stood at the rail and read
> him the Guarantee leaflet in her school voice, every word, and the queue behind them went quiet to listen.
>
> He said he'd pay the coin back when it cleared.

**Maud Ilic** · Teller · Harrow Street Credit Union · *10 November 2071 · C+11* · found on 4 Coldline

> Ten years tonight, and Halcyon paid for fireworks over the river, with a green one at the end that hung in the sky
> for ages while everybody went *ooh*. Our two sat on Tomas's shoulders, one each, and Pip said it looked like a lime.
>
> Anton Marr was on the bridge on his own, in his docker's coat, though the docks let him go in '66. He's thin as a
> rail now. He told me Liesl's top of her year and wants a job at the Tenements Board, in an office, with a desk and a
> chair of her own, and he said it as if she'd been made a duchess. Then he asked whether I thought it would clear
> soon, now it's been ten years. I said I thought it might. What else do you say on a bridge.
>
> Mrs. Kowal didn't come. She doesn't go out now. The couple from Corvid Row bring her shopping on Saturdays and stay
> for a cup of something and talk about the garden, which they've paid for and never planted, and nobody mentions it.
>
> At the union forty-one people came in today asking about the Guarantee, because a man on the radio said the tenth
> anniversary was a lucky day to buy. Mr. Ferrante sent them all along to Halcyon, and then he sat in the back with
> his exercise book and didn't come out till closing.

**Maud Ilic** · Teller · Harrow Street Credit Union · *14 October 2080 · C+19* · found on 2 Backhaul

> We moved onto the Backhaul this week. Mr. Ferrante says it'll save us a fortune in fees, because Kestrel can't
> charge much for a floor that's mostly noise. The new terminals hum, you can feel it through the counter if you lean
> on it, and Tomas says it's like working on top of a fridge.
>
> Ferrante's radio came with us, of course, and his exercise books, eighteen years of them, on a shelf in the back.
> When the numbers come on he writes the strings down in pencil and checks them against our members. In eighteen years
> one has been ours exactly twice, and both times he bought cakes for the counter.
>
> Tonight one was a Brandt & Vey string, *still owed*, and it ended in Marr. Ferrante didn't know the name. I wrote it
> in his book in ink, and then I had to go and stand in the yard for a bit.
>
> Liesl comes in on the first of the month and pays a little into her father's book. He used to come in with her,
> until last year. She's twenty-seven and works at the Tenements Board, in Leases, and she says she stamps the green
> seal so many times a day she sees it when she shuts her eyes.

**Maud Ilic** · Teller · Harrow Street Credit Union · *1 June 2090 · C+29* · found on 2 Backhaul

> Pension day. The queue was round the corner by nine, under the Tenements Board's scaffolding, which has been up so
> long there's moss on it. Half of them carry the old buff slips from the Treasury, gone soft as cloth. We put out
> soup in the big pan, because Mr. Ferrante always did.
>
> Liesl Marr came in at eleven with this year's letter from Halcyon, signed by a T. Asch, and said what they always
> say. She asked whether I thought anybody there actually read them. I said one of them did, because he'd spelled her
> father's name right.
>
> Mr. Ferrante has retired to his daughter's, and the radio in the back room is mine now. When it reads Brandt and Vey
> I turn it up, and the whole queue goes quiet.
>
> I'm fifty-four. I've been at a counter since I was twenty-two. Tomas says I could stop. I tell him I'll stop when
> the clock's right.

---

## Abena Oduya

**Abena Oduya** · Night-run supervisor · Pellucid Payroll · *31 October 2061 · C−1* · found on 7 The Sink, in a restored archive

> The October run did not go in tonight.
>
> I have supervised the night run at Pellucid for fourteen years, and in fourteen years I have missed a month-end
> twice: once in the floods of '52, and once tonight. Three hundred and eighty-one thousand, two hundred and six
> payslips. The tram drivers, the nurses at St. Agnes and the Royal, the Treasury's own clerks, the bin men, the
> teachers in the north district, and the eleven men who sweep Corvid Row, whose names I know because their foreman
> sends me a card at Christmas. All of them waiting on a batch the clearing house took from us at nine o'clock and is
> holding, politely, while it finishes something else.
>
> It has been finishing something else since June. In August we went in two days late, in September five. Mr.
> Achterberg upstairs says it is a capacity matter at Kessler and will be resolved. He has said this every month since
> June, in the same words, and I have begun to write them down.
>
> I sent my clerks home at two. They have children. I stayed with the screen and prayed the long way through, as my
> mother did, and at four I ate the biscuits meant for Friday.
>
> A letter from Kofi, number thirty-one. He numbers them so that I will know if one goes astray, which is his father's
> habit. The shipyard work is good. The bunks are cold. There is a girl in the canteen who saves him the end of the
> loaf, and he mentions her three times in two pages and believes I have not noticed. His contract finishes on the
> fourteenth of November, and he will be home for my birthday.
>
> October goes back in the queue tomorrow at midnight. Thirty-two should come by Thursday.

**Abena Oduya** · Night-run supervisor · Pellucid Payroll · *10 November 2061 · C0* · found on 7 The Sink, in a restored archive

> October began going in at midnight, ten days late, a line a second. St. Agnes first, because I put the hospitals
> first, then the Royal, then the trams. I said the Lord's Prayer once for every hundred lines, because it gave my
> mouth something to do.
>
> By half past one it was a line a minute. By two I could read each name as it went: a porter, a cook, a ward sister,
> a conductor on the number eleven.
>
> At two minutes past two Kessler's night desk rang me. A woman, very calm. In fourteen years I have never had a call
> from Kessler at night. She asked whether I could stop the run. I told her it was in, and that she must know better
> than anyone that what is in cannot come out. She said she was sorry, and put the telephone down before I could ask
> what for.
>
> At 02:14 by the wall clock the screen stopped. The cursor went on blinking. The line it blinked on said *Corvid Row
> street cleansing, week four, in progress*. Eleven men.
>
> It is half past three. I have rung Kessler six times and heard the engaged tone six times. I have rung Mr.
> Achterberg at home, and his wife says he is asleep and will deal with it in the morning. I have read the line about
> Corvid Row until I can see it with my eyes shut.
>
> Kofi's thirty-two did not come.

**Abena Oduya** · Out of work · *12 December 2061 · C+1* · found on 7 The Sink, in a restored archive

> Pellucid's doors were locked on the Monday after, with a notice from the receivers taped to the glass, and I have
> not been inside since. Fourteen years. My cardigan is still on the back of my chair.
>
> The October run is still in the machine. Nobody can take it out and nobody can pay it, so three hundred and
> eighty-one thousand people are owed October, and now November, and soon December, and every one of them knows my
> name, because it was printed at the foot of their payslips. They come to the house. They are very polite. The eleven
> men from Corvid Row came together on Saturday with their foreman, and stood in the yard with their caps in their
> hands while he asked me what he should tell their wives. I gave them what was in the house. It was the rent.
>
> Kofi came home on the fifteenth with his kitbag and no wages, because the shipyard paid through Pellucid too. He
> laughed when he understood that. He has not laughed since. He sits by the window and reads the old letters he sent
> me, all thirty-one, and he asks me what was in thirty-two. I tell him I don't know. He says he can't remember.
>
> The pastor at St. Matthew's has turned the church hall into a kitchen. I peel potatoes there from six until the soup
> runs out. It is the first work I have done since the tenth of November that finishes when I finish it.
>
> Our landlord came on Thursday. He has not been paid either. He was very sorry.

**Abena Oduya** · Soup kitchen, St. Matthew's · *3 September 2067 · C+6* · found on 6 Kernel Space

> Kofi has gone to the yards on the coast, where they pay in coin. He went in the spring. He writes when he can, and
> he has stopped numbering them.
>
> So I number mine. I am on forty. I write to him on Sundays after church, about the potatoes and the pastor and the
> new floor they have built on top of the machine, which the papers call Deep Core and the young men at the soup
> kitchen call the basement. I put the number at the top, in the corner, so he will know if one goes astray.
>
> Pellucid is still in the machine. The October run has not moved in six years. Once a month a man from Halcyon comes
> along Corvid Row selling the Guarantee on October's wages, and most of the street has bought it, because the premium
> is small and a month's pay is a month's pay. I have not bought it. I will not pay a man to promise me what I was
> paid to do.
>
> The doctor says it is my heart, and that I should not climb the stairs to the hall. I climb them slowly, and stop on
> the landing, and the boys wait for me at the top with the door held open.
>
> This morning I found my old Pellucid pass in a drawer, with my photograph on it from 2047. I look very sure of
> myself. I have put it in the envelope with letter forty, so that Kofi has something to laugh at.

---

## Benedikt Sauer

**Benedikt Sauer** · Clerk, Pensions (Pre-Cascade) · City Treasury Office · *3 April 2063 · C+2* · found on 7 The Sink

> Assigned to Pensions (Pre-Cascade), Room 14, as of Monday. The room has two desks and one clerk, which is me, and a
> window onto the light well.
>
> My duties are as follows. I keep the old pension roll open on the right-hand screen, in case it moves. I issue form
> P/7 to any pensioner who presents at the counter. Form P/7 states that the pension in question is held pending
> normal clearing, and that the Treasury acknowledges the debt. It is printed on buff card, because we ran out of
> white. I issued three hundred and twelve this week. One gentleman asked whether he could eat it. I referred him to
> the Board of Health.
>
> The left-hand screen is the tax roll, which runs. Every property in the city is billed quarterly, on time. My
> predecessor in Room 14 described it to me as the one part of the Treasury that never stopped, and then he resigned.
>
> Mother is on page 211 of the old roll. Irena Sauer, City Tramways, twenty-two years, held pending. She draws the
> Treasury's emergency pension, which buys coal or food in any given week but not both, and she has chosen coal,
> because she says she has never liked eating. This is untrue.
>
> On Friday her property tax came up on the left-hand screen, payable on the fifteenth. I paid it at the window
> downstairs from my wages. The cashier stamped it without looking up, which I took as a professional courtesy.

**Benedikt Sauer** · Clerk, Pensions (Pre-Cascade) · City Treasury Office · *22 October 2064 · C+3* · found on 6 Kernel Space

> Circular T/41 arrived from the Chancery on Tuesday, by hand, and the Deputy Treasurer read it aloud to all
> departments from the main stair.
>
> It announced the third recovery round. Kessler's receivers will cancel a further portion of the frozen payments that
> no one has insured, to make room for the city's new floor. The circular lists the categories to be cancelled. It
> does not list the payments. It thanks the citizens of the city for their patience.
>
> I was instructed to reconcile the old pension roll against the round, line by line, and mark each line cancelled or
> retained. This took me from Tuesday until Friday. Four thousand and eighty lines were cancelled. I marked them in
> red, which is the regulation colour.
>
> Page 211 was retained. I checked it three times.
>
> On Friday evening I took Mother to see the new floor's lights from the bridge at Harrow Cross, as half the city did.
> She said they were very fine. A man beside us on the bridge, a tram pensioner by his cap, was crying, and his wife
> held his elbow and went on looking at the lights.
>
> On Monday he came to my window for a P/7. His line was red. I did not have a form for that.

**Benedikt Sauer** · Clerk, Pensions (Pre-Cascade) · City Treasury Office · *1 March 2079 · C+18* · found on 3 The Stacks

> Mother died on the ninth of January, at home, in the chair by the stove.
>
> On the twelfth I submitted form R/2 to Records, requesting that her line on the old roll be marked deceased. On the
> nineteenth Records returned it with a note: no entry can be written to a frozen line until it clears. Her line
> therefore continues to read *held pending*, and Mother continues, in the Treasury's view, to be owed.
>
> Pension day. I sent the new roll to the credit unions by nine. Harrow Street receives the largest file, as it has
> since the first winter, because the old people trust a counter with a radio behind it. At lunch I walked down to see
> the queue. It went round the corner and under the Tenements Board's scaffolding. The teller at the end window had
> put out soup in a pan. A man near the front held a P/7, soft as cloth, and when he reached her she read it all the
> way through, as if it might pay.
>
> On the advice of a leaflet I filed a Guarantee claim for Mother's pension, as her heir. The form had a box for the
> date of death and, beneath it, a box for the date on which the payment would clear. The clerk at Halcyon told me to
> leave the second box blank. Nobody asked me for a premium, and I did not think to offer one.

**Benedikt Sauer** · Clerk, Pensions (Pre-Cascade) · City Treasury Office · *9 October 2089 · C+28* · found on 1 The Sprawl

> Page 211 changed overnight.
>
> Twenty-six lines are gone from it, Mother's among them, and the page has closed up over the gap. It is tidier than
> it has been in twenty-six years. The log gives a time, 03:12, and a reason, *cancelled, uninsured*, and nothing
> else.
>
> There was no circular. The last round was announced in 2086, from the main stair, with a printed list of categories
> and a reception afterwards for the opening of the Sprawl. I asked my supervisor about this one. She said the old
> roll belongs to the old machine, and the Treasury only reads it.
>
> I went through the remaining pages one at a time. Every line still on them carries a small green G in the margin.
> Mother's never carried one.
>
> Her flat is mine now, and its tax came up on the left-hand screen this morning, as it does every quarter. I will pay
> it at the window. The cashier is new, and she will stamp it.

---

## Nell Sorensen

**Nell Sorensen** · Reader, LANTERN-RELAY-88 · LANTERN · *12 January 2073 · C+12* · found on 4 Coldline

> Mum can't hold the pencil now, so tonight I did the strings as well as the count. She sat on the floor by the stove
> with her back to the wall and moved her lips along with me.
>
> Four, nine, nine. Then the strings: a woman from the Narrows with a dowry in Brandt & Vey, a cab driver's whole
> November, a new roof for a chapel. Then the count. Seventy-seven.
>
> I was six when Grandad stopped. I remember eating bread and dripping on the kitchen floor and thinking it was a
> picnic, and the neighbours coming in their coats to listen to the set. I don't remember being hungry. Mum says I
> was.
>
> Halcyon's man came at nine for the count, as he does every Friday, a thin boy in a good coat. He never comes in. He
> reads the number off my pad on the doorstep, writes it in a little book, counts the coins into my hand and goes. Mum
> calls him the milkman.
>
> After he'd gone I asked her again about the torn page in her desk book. She said it was a shopping list. Dad laughed
> from the other room, and she threw a spoon at the wall.

**Nell Sorensen** · Reader, LANTERN-RELAY-88 · LANTERN · *22 August 2086 · C+25* · found on 2 Backhaul

> Last round. That's what the Treasury's circular says, read out from the main stair and printed in the *Courant*: the
> final recovery round, and a new floor on top, the Sprawl, opening Saturday with fireworks.
>
> The count went from seventy-nine to seventy overnight. We had forty-one strings in the tin waiting to be read. Pim
> and I checked them against the round this morning. Thirty were gone, the cab driver's November and the chapel roof
> among them. I read all forty-one tonight anyway. Pim asked why. I said the people who brought them would be
> listening, and they'd want to hear it from us.
>
> Mum died in April. By the end she'd stopped knowing the numbers, but she knew the call sign, and she said it in her
> sleep. Her desk book went in the tin with the strings, and the tin went under the floor.
>
> At six a man from GLASSJAW knocked, a big soft man in a coat too good for Low Harrow, and asked whether I had any of
> Kessler's old paper. A desk book, he said, or a roster. He named a price that would keep the set on the air for ten
> years. I said we only had receipts. He left his card on the step.
>
> The fireworks on Saturday were very good. You could see them from the kitchen.

**Nell Sorensen** · Reader, LANTERN-RELAY-88 · LANTERN · *13 February 2091 · C+30* · found on 2 Backhaul

> Seventy-nine.
>
> Pim came up from the Stacks with a letter. A runner gave it to him for nothing, he says. Runners don't give anything
> for nothing, and he's turned it over twenty times looking for the catch.
>
> Mrs. A. Oduya, Corvid Row. Thirty-two in the corner. A son at a shipyard writing to his mother: the bunks are cold,
> there's a girl in the canteen who saves him the end of the loaf, he'll be home when the contract finishes. Sent at
> eleven at night on the ninth of November.
>
> I went down to Corvid Row this afternoon. The shoe mender's still there, and he remembered her: a tall woman, very
> straight, who ran the soup kitchen at St. Matthew's in the bad winters and took the stairs to it one at a time at
> the end. She died in '68. Her son came home that first winter and went to the coast. The shoe mender thought he'd
> married.
>
> I read the letter out tonight after the count, all of it, slowly, for the coast. Then I read the count again, for
> anyone who'd tuned in late.

**Nell Sorensen** · Reader, LANTERN-RELAY-88 · LANTERN · *3 March 2091 · C+30* · found on 2 Backhaul

> I read the numbers at four. My mother read them before me, from a kitchen in Low Harrow, on a transmitter my father
> built out of a Kessler test bench. She worked the night desk until the night there was no desk. She used to say the
> machine talked all the time, and the trick was knowing which of its sentences were about you.
>
> Tonight it was four, nine, nine, then the account strings, then the count. Eighty-three. It was eighty-one at the
> turn of the month. The count we keep off the air and sell. It pays for the fuel, and for Pim, who goes down to the
> Stacks twice a week and comes back with receipts.
>
> A man from Corvid Row brought me one this morning, printed on Pellucid stock: his wages for the last week of a month
> that never ended. He wanted to know if it was real. I told him it was, that the trade was still waiting on the other
> side and nobody had cancelled it yet. He cried, which they mostly do. I've never worked out whether it's the waiting
> or the *yet*.
>
> Pim came up at six with a cut on his hand and a Halcyon file he says is nothing. I put it in the tin with the
> others.

---

## Yusuf Lamb

**Yusuf Lamb** · Broker · GLASSJAW · *23 March 2081 · C+20* · found on 2 Backhaul

> Kessler's receivers sold the masters today: every report INIT filed from 2056 to the last night, forty grey binders,
> one lot. Reserve, the price of a house. Halcyon sent a junior with a ceiling. I went past it on the second bid, and
> he went out to telephone somebody, and came back and sat down.
>
> Five years ago I paid a cleaner's nephew sixty for a shoebox of loose copies. I sold those pages to every lawyer in
> the city with a claim against Halcyon, one at a time, and the shoebox paid for today.
>
> First buyer, inside the hour: Annick Life's creditors' committee, nineteen years into their action. They wanted one
> week, the week before the Cascade, when every page went to a Halcyon desk by breakfast. Second buyer: a Choir girl
> with a canvas bag of coins, who wanted the night before. *Process table at 91%.* I'd priced it highest. She asked
> why the night before cost more than the night itself. I told her that on the night itself everybody knew.
>
> The fortieth binder ends at 10 November 2061. Its last tab has a staple through nothing. The receivers' clerk said
> it was like that when they found it.
>
> I've put a notice in the *Courant*: wanted, one page, Kessler night desk, 10 November 2061. Price on application.

**Yusuf Lamb** · Broker · GLASSJAW · *15 October 2091 · C+30* · found on 7 The Sink

> The notice ran for ten years. It paid out this morning: a Kestrel archivist with a box of Kessler night-desk papers
> from a Coldline rack they're closing. Between two receipts for a kettle, the page. *process table at 99%.* 02:12, 10
> November 2061, from the night desk.
>
> It cost more than the forty binders together. I had three buyers by lunch.
>
> There's no operator's name on it. Kessler's records say two were on shift. One was a Sorensen. Her daughter in Low
> Harrow keeps a tin under the floor and won't sell. I've asked every year since 2086, and every year she offers me a
> receipt instead.
>
> Every buyer asks me who filed it. I tell them the page is the product.
>
> It's in the safe in the Sink, listed at a price nobody will pay. This afternoon I raised it.

---

## Ruth Amsel

**Ruth Amsel** · Night technician, Coldline racks · Kestrel Underwriting · *9 January 2084 · C+23* · found on 4 Coldline

> First week on Coldline. Danny is training me. He's been down here since the floor mounted in '71, and he says there
> are a thousand racks to every member of staff, and the staff is mostly him. He eats his lunch sitting on rack 30
> because it's the warmest, and talks to the drives while he swaps them.
>
> Most of Coldline is Halcyon's, on a lease Danny says was signed over a duck. Archive storage. The racks are full,
> and nothing on them is ever read. Kestrel keeps them cold and bills for it. I walk the aisles with a torch and a
> meter, and when a meter turns and nobody's paying for it, I find out why.
>
> Rack 12 has had a session open on it since 2072. A runner's, Danny thinks, someone who went in and never came out.
> It draws less than the lights. At Christmas Danny leaves a biscuit on top of the rack.
>
> Topside, Mum's at the Tenements Board office again about the damp. Our lease has the green seal on it like
> everyone's, and the seal says the rent is guaranteed, and the Board says that's all it says.
>
> They gave me the laminated card on my first night. I keep it in my top pocket, where my pen used to go.

**Ruth Amsel** · Night technician, Coldline racks · Kestrel Underwriting · *1 November 2090 · C+29* · found on 4 Coldline

> Coldline smells like a fridge left open in a room nobody lives in. It's the coolant. You stop noticing it after the
> first month, the way you stop noticing the strays.
>
> Kestrel issues a laminated card for when a process follows you. Step one says to keep quiet. They've wanted an
> answer for thirty years, and anything you send, a ping or a hello from your diagnostics, they take for the wrong
> answer and come at you like you owe them money. Danny says somebody does.
>
> Tonight I swapped two drives in rack 40 and found a third underneath, on no manifest, still warm. Someone has been
> running a job down here for a long time without paying for the power. I wrote it up. Kestrel will bill someone.
> Kestrel always finds someone to bill.
>
> Topside it was raining on the Tenements Board's new building, the one they put up in the first freed slice. The
> queue at the Harrow Street branch was already round the corner. Pension day. Half of them won't get anything, and
> they queue anyway, because the branch is warm and the teller knows their names.

**Ruth Amsel** · Night technician, Coldline racks · Kestrel Underwriting · *3 November 2091 · C+30* · found on 4 Coldline

> Billing traced the drive in rack 40 to an account opened by Kessler's night desk in 2058. The bill went to the
> filing cabinet that is Kessler's estate, which Kestrel keeps on Coldline, so we have billed ourselves.
>
> I read the job's log before they wiped it. One line, every second since before I was born: *night desk. awaiting
> counterparty.*
>
> Rack 4 closes at the end of the cycle. The notice by the lift says *Please collect your belongings*. Nobody keeps
> belongings on rack 4. Danny has been moved up to Kernel Space to help with something he won't talk about, and he
> took his biscuit tin.
>
> At three a session opened on rack 40, a runner's, quick and quiet. Then it stopped moving and stayed open, its
> Signal low and steady on the meter. The card says to report an idle session for disconnection. I put the card back
> in my pocket and turned the meter to the wall.

---

## Kit

**Kit** · Singer · NULL CHOIR · *14 February 2085 · C+24* · found on 3 The Stacks

> Ro let me in tonight. To be in the Choir you have to be in two places at once: on a mattress in the room over the
> shut café on Low Harrow Road with a rig on your head, and on NULLCHOIR-SQUAT-13, all seven of us together. Lio
> brought soup in a flask, and a cup for everyone.
>
> Ro puts the machine's hum through a speaker and we sing one line against it, *let it roll back*, over and over,
> until somebody laughs. Then we go and break something. Tonight it was a Halcyon claims box in the Stacks. It went
> down like a tent.
>
> Ro says the money that moved in the old world is still down there underneath us, stuck, and every box we break lets
> a little of it go back where it came from. Ro talks like a priest and looks like a bus conductor.
>
> We buried Gran on Saturday, from the yellow house on Vey Street. She sold it in 2061 and the money froze in Brandt &
> Vey's escrow, and she lived there twenty-three more years, a guest in her own front room. She kept the curtains
> folded in a box under the bed, ready. The couple who bought it still send a card at Christmas, addressed to their
> own house. They came to the funeral and stood at the back.
>
> I wrote my name on the squat wall in marker, under everybody else's.

**Kit** · Singer · NULL CHOIR · *9 September 2090 · C+29* · found on 3 The Stacks

> Before we broke the Halcyon box in the Stacks tonight, Ro made us stand in a circle in the squat and listen to it.
> You can hear a server if you route its fans to a speaker. This one hummed in B flat. Ro says every machine in the
> city hums in the same key, because it's all one machine, and if you sing against it long enough it forgets where it
> is.
>
> When the box went down, eleven trades unspooled out of it like ribbon, every one of them thirty years dead. For
> about a second the count on LANTERN's feed dropped a hundredth of a percent. We cheered. Lio cried.
>
> My gran had her house in a Brandt & Vey escrow when it froze. She lived out her life in a house she'd already sold,
> waiting to be told to leave. Ro says if it all rolls back, the house goes back to being hers. Ro doesn't mention
> that the mortgage goes back too.
>
> I'm still in. I sing louder when I think about it.

**Kit** · Singer · NULL CHOIR · *20 May 2091 · C+30* · found on 2 Backhaul

> Lio's gone. He left his mug on the hook and a note: work at Corvid Exchange, insured lots only. Ro put the mug in
> the sink.
>
> Today I went to Harrow Street, where Gran banked after Brandt & Vey. The teller at the end window knew Gran's name
> before I said it, and asked about the curtains. I asked her what happens to a sale if it rolls back. She took a
> pencil and worked it out on the back of a paying-in slip: the house, the couple's money, the mortgage, thirty years
> of interest on the mortgage. She drew a line under it, wrote the total, and turned it round for me.
>
> I kept the slip. Tonight we broke a Corvid box, and I sang the whole way through, and I didn't look at the feed.

---

## Teodor Asch

**Teodor Asch** · Claims Adjuster II · Halcyon Mutual · *14 March 2087 · C+26* · found on 1 The Sprawl

> The lift in Halcyon Tower stops on nine whether you press nine or not. Facilities calls it a known fault. I think
> somebody upstairs likes to see who gets off.
>
> I closed forty-one claims today. Thirty-eight were breach claims from the Sprawl, the usual kind: a crew locked a
> merchant's ledger mid-trade, and the merchant wants his week back. We pay those in two business days now, and the
> floor is proud of it. The other three were Guarantee claims. Those stay open. There's a stamp for them, green, paler
> every year, because nobody has reordered the ink.
>
> One came from a woman whose father had eleven thousand in savings at Brandt & Vey the week of the Cascade. She
> attached a photograph of the statement. The paper had gone the colour of weak tea. I stamped it and wrote the
> standard line, that her claim remains active and will settle on the restoration of normal clearing. She has been
> told this every year since she was nine.
>
> On the way out the lift stopped on nine. Nobody got on.

**Teodor Asch** · Claims Adjuster II · Halcyon Mutual · *20 March 2088 · C+27* · found on 1 The Sprawl

> The woman with the tea-coloured statement wrote again. Liesl Marr. This year there was a second sheet: her father
> died in 2079, she is his heir, and she would like the claim kept open in his name. It is. Halcyon keeps everything
> open.
>
> I pulled his account to stamp it, which I had never needed to do before. Anton Marr, docker, Brandt & Vey, frozen.
> Under the balance was a line I'd never had a reason to read: *Guarantee premium, collected monthly, current.* Three
> hundred and twelve premiums since 2062, taken from an account that can pay nothing else. A hundred and eight of them
> since the funeral.
>
> I took it to my supervisor. She looked at it for a long time, and then at me, and said the terms were on page six of
> the policy. I went and read page six. They are.
>
> The stamp's green is nearly grey. Supplies say the colour has been discontinued, and they're waiting on new stock.
>
> On nine the doors opened on a cleaner with a trolley. She looked at me, then at the button, and waited for the next
> one.

**Teodor Asch** · Claims Adjuster II · Halcyon Mutual · *14 March 2091 · C+30* · found on 1 The Sprawl

> Eleven hundred Guarantee claims closed overnight, by themselves. *Underlying trade cancelled, uninsured.* No
> adjuster's initials. The floor manager says it's Underwriting's housekeeping, and we're not to reopen them.
>
> Marr isn't on the list. I pulled a dozen of the closed ones and looked for the premium line. None of them had one.
>
> Liesl Marr's letter came this morning, the photograph a shade darker on the scan. I stamped it. Then I wrote to her
> by hand, one line, *keep your father's policy paid*, and posted it from the box outside Harrow Street.
>
> I took the stairs back up. Nine was dark, and someone had propped the fire door open with a chair.

---

## moth

**moth** · Runner · LOWLIGHT · *12 March 2088 · C+27* · found on 1 The Sprawl

> wick brought soup again. leek. he leaves it on the step, knocks twice, and he's down the stairs before i get the
> door open. he can't cook anything else and he won't say where he learned that.
>
> three jobs on the sprawl this week, all shopfronts. halcyon paid, wick pointed. a crew had locked a noodle bar's
> till mid-trade and she couldn't sell a thing for two days, and when i'd killed what was in it she sat on her step
> and watched me pack up my rig and said thank you like i'd fixed her boiler. halcyon pays her claim on tuesday.
>
> there's a sticky note on the edge of wick's monitor with a trade id on it. bedrock prefix, the old format. i asked
> once. he said it was to remind him to buy milk. the note has gone from yellow to white. he has never bought milk in
> his life.
>
> my signal took a hit on the last one and my hands are still buzzing. writing this to see if i can spell. i can.
> mostly.

**moth** · Runner · LOWLIGHT · *30 December 2089 · C+29* · found on 3 The Stacks

> asked wick for a bedrock job. he said no before i got to the end of the sentence. i said i'd seen the board and it
> pays fine. he said nothing down there pays him. then he put the radio on loud.
>
> did a stacks job instead. corvid exchange, with a plaque in the lobby about insured lots. a stray on the third floor
> was trying its handshake on everything, me included, over and over, the way a kid pulls a sleeve. i killed it.
> corvid paid inside the hour.
>
> while wick was in the kitchen i copied the id off his note onto my arm in biro. i'm not going to look it up.

**moth** · Runner · LOWLIGHT · *3 November 2091 · C+30* · found on 4 Coldline

> coldline. halcyon wants a rack cleared before kestrel closes it. wick said in and out.
>
> jacked in from the flat with the blanket over my knees. coldline is all sleeping racks and fans spinning down, and
> there are strays in every rack, knocking. one followed me two rooms.
>
> signal's at 30. tried to jack out. the line just sits there, waiting. rack 40.
>
> the id's still on my arm. i can read the last four digits.
>
> wick, if you get this. still here. mostly. don't

---

## Dace

**Dace** · Runner · rents from SWARMLINE · *30 January 2091 · C+30* · found on 2 Backhaul

> I jacked in at nine from the laundromat on Vey Street, because the signal's good there and nobody asks. First rule
> of the Backhaul: watch your own Signal. KUDZU says watch the board, but KUDZU has never come out of a server with a
> nosebleed.
>
> At night the Backhaul is trunk noise and carrier hum, and under that the strays. You hear them before you see them,
> little handshakes going out into the dark like someone knocking on every door in a building. If you're careless, you
> knock back.
>
> We rent our nets by the hour now. SWARMLINE takes the margin, the client takes the server, and I take what's in the
> vault before either of them notices. Tonight it was a cold wallet with nothing in it, and a letter thirty years old
> addressed to a Mrs. Oduya. I almost kept the letter.
>
> I came out at two with my hands shaking. The machines were still going. A woman was folding a child's clothes very
> carefully, smoothing each one flat, as if she were paid by the crease.

**Dace** · Runner · rents from SWARMLINE · *6 February 2091 · C+30* · found on 2 Backhaul

> Went back for the letter on somebody else's hour, and kept quiet.
>
> It was still there, *32* at the top. A cold bunk, a girl in the shipyard canteen who saves him the end of the loaf,
> home when the contract finishes. Signed Kofi. Corvid Row. I don't know anyone on Corvid Row, and SWARMLINE doesn't
> pay for post.
>
> KUDZU messaged while I was in: *hiii!! ur on someone elses clock!!* I logged out before it got curious.
>
> Pim from LANTERN buys receipts in the Stacks on Tuesdays. I gave him the letter for nothing. He looked at me as if
> I'd hit him, then folded it into his coat with the receipts.
