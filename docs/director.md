# The event director: a living net

Draft, October 17, 2026. For agreement before any code. Builds on `dist/events.mjs` (the director and its deck) and the four cards being added now: Feud, Bounty hunt, Market shock and Scout.

## 0. The short version

The director becomes one of the game's pillars: the thing that makes the net feel like it moves without you. Three changes:

1. **Chains.** What you do with an event deals the next one. A feud you settled sends a counter-raid, a bounty that got away comes back with a name, and a run of intercepted couriers gets LANTERN's attention.
2. **Three sizes.** Small **blips** every few minutes, the **events** we have now, and rare **crises** that change a floor for an hour.
3. **Inside runs.** The director also deals into the server you're on: a Surge room (waves), an Escort and a hunter pack.

What it does **not** do: read how you're doing. It never looks at your Signal, deaths, streaks or gear (section 6).

## 1. Principles

- **The world moves; you choose.** Every card is an offer. Missing one costs nothing, and that holds for chains too: a follow-up only comes from something you did (a fight you won, a side you picked), never as a punishment for skipping.
- **More small things beat fewer big ones.** A net that blinks every few minutes feels alive. A big card every half hour feels like a timer.
- **It remembers.** Names, sides and outcomes carry forward, so the next card is about you.
- **No faction losses.** Picking a side never costs rep with anyone, and nothing the director deals closes a shop or lowers prices against you. Factions only reward: the side you back gains, the others stay where they were. No loss aversion.
- **Fair dice.** The director rolls its own dice on the save, as now, so it never shifts the game's rolls and the same choices on the same seed give the same net.
- **Show it, don't explain it.** Map marks, faction colours, pips, a minutes chip and a link icon to the event that caused it. Detail goes in tooltips (style guide, section 0).
- **Levels 1 to 50 first.** Everything here scales with your level and floor. Nothing waits for level 50.

## 2. Chains

**Built (D1).** `dist/events.mjs` (`CHAIN`, the follow-up cards `counter`, `returning`, `lantern` and `zero`, `schedule`, `dealChain`, `eventKill`), their cards in `dist/event-cards.mjs`, tests in `chains.test.mjs`. `developer chain [counter|returning|lantern|zero]` deals one now with a made-up cause.

A chain is a follow-up card that one outcome schedules. The director keeps a short list of pending follow-ups on the save, each with what caused it, a delay and an expiry. When a follow-up is due, it is dealt like any card (it takes one of the two event slots) and its card shows a small link icon; hovering it names the event that caused it.

### The first chains

| Cause | Follow-up | Delay | What it is | Pays |
|---|---|---|---|---|
| You won at least one fight in a **Feud** (for the side you backed) | **Counter-raid** | 20–40 min | The side you fought sends a runner at a server you hold (a traced server you've been on), or your home if you hold none. A fight at your level in that side's colour and family, sized like a feud's runner (an elite, ×1.5 Integrity). Ignoring it costs nothing: the runner leaves (15 min), and nobody's rep moves. | Half a bounty's credits (40 + 7.5×level), +2 rep with the side you backed (no ripple), and the grudge ends |
| A **Bounty hunt** got away | **Returning bounty** | 30–60 min | Back once: the same name, at the level it got away at, on one of your servers for 20 min, with a *last chance* tag. If it gets away again it's gone for good. No marked version: anything that rewarded letting a hunt go would be farmed. | What the hunt would have paid when it got away (never more), and +2 rep with its hunter |
| You killed 3 **Couriers** (a running count, reset when the offer is dealt) | **LANTERN's offer** | at once | For now a special courier in LANTERN's colour and mark (a fight like a courier's, 15 min). It becomes LANTERN's courier asking for an Escort through one of your servers (section 4) in D3. | +5 LANTERN rep (Halcyon standing until LANTERN's hub is located) and a Custom protocol |
| You won a **Spotter** fight | **Invasion foreshadowed** | (the invasion's own clock) | The next invasion's kind shows on the wall and the pager ahead of time, and it comes in weaker. Already built with the Spotter card (invasion.mjs `scoutNext`); not on the follow-up list. | — |
| 15 kills of the family during an **Outbreak** | **Patient zero** | at once | The outbreak's source, an elite of that family at your level, turns up on one of your servers for 15 min. Kill it and the outbreak ends early. If the outbreak ends before it's dealt, it goes too. | A code cache of that family (a vault's: 12 + level/2) and the elite's loot |

Ignoring a card never starts a chain. A bounty hunt that "got away" counts only if you fought it at least once and left, or it had made all three hops while you were on a run on its floor. Otherwise it simply leaves. A returning bounty gets away the same way: you fought it and left, or it left while you were on a run on its floor. Ignoring a follow-up costs nothing and starts nothing.

Each follow-up's card shows a chain-link mark in its strip (a button to the server the cause happened on, while it's on your map), and its pager line the same mark; hovering either names the event that caused it. The follow-ups roll only the director's dice (delays, servers, names, the marked bounty's unique) and pay from the event's own seed.

### Limits

- At most 3 pending follow-ups, one per chain kind. A new cause for a chain that's already pending doesn't stack.
- A follow-up expires quietly if it isn't dealt within 3 hours of logged-on time (counted from when it was scheduled). When it's due and both event slots are full, it waits for one to free while its expiry runs. The list ticks on logged-on time only, so offline time never piles follow-ups up.
- Chains never pay more than the cards they come from, and nothing pays for letting an event get away: a follow-up that rewarded failing on purpose would be farmed. (A marked bounty with a named drop after two escapes was built and taken out for that reason.)

## 3. Three sizes

| Size | How often | Lasts | On screen | Examples |
|---|---|---|---|---|
| **Blip** | about every 5 min logged on (4–6) | 2–8 min | A pager line and a short mark on the map | A stray cache, a price flicker, a rumour, a rare-spawn sighting |
| **Event** | every 15–30 min (as now) | 10–30 min | A card on the server or hub | Courier, Bounty, Feud, Bounty hunt, Market shock, Scout, Outbreak, Leak, Darknet listing, Hollow Choir |
| **Crisis** | about every 3 hours, from level 8 | 45–90 min | A banner on the floor panel and the map tinted for that floor | Strain bloom, Turf war, Blackout |

Blips don't count toward the two-event limit. At most one crisis is up at a time, and a crisis holds its own slot.

### Blips

Small, quick and cheap. No fights of their own, or one room at most.

- **Stray cache:** a cache appears in a room you've cleared on one of your servers (credits and code, about half a vault cache) until someone else takes it (a few minutes).
- **Price flicker:** one ware at one hub moves ±15% for 5 minutes. The ▲/▼ chip on the hub shows it.
- **Rumour:** a pager line that names where the next event will land (*Couriers are moving through MERIDIAN-MX-14*). It's true. This is foreshadowing, and it makes the world look connected.
- **Sighting:** a rare spawn is due in a named room on one of your servers within the next few minutes.

### Crises

One floor, for most of a session. Each has a clear way to end it early and a reward for taking part, paid once per crisis.

- **Strain bloom.** A strain spreads across a floor: every few minutes it takes another server, whose rooms then carry the strain's mutation (the map shows the spread in its colour). Its source is one server; clear that server's core and the bloom ends. Pays the strain's trophy table and the codex entry.
- **Turf war.** Two rival factions contest a floor. Faction servers on it flip colour as the war moves, Feud cards on that floor come up three times as often, and your feud wins tip the balance. The side that holds more of the floor at the end puts its goods on sale for a day (and the loser is simply back to normal). Backing the loser costs you nothing.
- **Blackout.** A floor's hubs go dark: their markets close, salvage pays ×1.5 and every run on that floor has one more rest room. It ends on its own. Restore a relay on the floor (a puzzle room, marked) to end it early and get the hub's thanks (+3 rep).

## 4. Inside runs

When you connect to a server, the director can deal one **run card** into it: at most one per run, about one run in four, and never on SPRAWL-00, a rogue server or the farm. It shows on the room map as a lit room or a route, and on the strip.

- **Surge room (waves).** One room on this server lights up. Walk in and packs keep coming, one fight after another with no rest between. Each kill fills a bar; at 100% a guardian spawns, and beating it ends the surge. You can leave between fights and keep what you've earned. It pays a cache that grows with how far the bar got, and the guardian rolls an elite's loot. It draws on your run Signal like any fight, so it limits itself. Once a run.
- **Escort.** A courier process has to cross this server along a marked route of rooms. It moves one room each time you move, and it can't enter a room that something still holds. In a fight where it's with you, some parts aim at it instead of you (the aim lines already show who's aiming where), and it has its own Signal bar. Each class protects it its own way: shields, delays, killing the attackers first, or helpers that draw fire. Get it to the far room and it pays. If it's lost, nothing more happens.
- **Hunter pack.** A small pack walks the server's rooms toward you (using the rooms engine's hunters). Beat it for an elite's loot. It's an opportunity, not a trap: it never starts in the room you're in, and its path shows once you've seen it.
- **Crisis tie-ins.** On a floor with a crisis up, run cards follow it: Strain bloom servers deal Surge rooms of the strain, and Turf war servers deal faction runners.

## 5. Visibility

- **The pager** gets every blip, event, chain and crisis, each with its icon. Blips time out quickly so the pager doesn't fill up.
- **The map** marks events on their servers (the antenna, as now), a small spark for blips, a tinted floor for a crisis, and the link icon on a chain's card.
- **The floor panel** shows a crisis on its floor's button.
- **A history list** (on the pager) keeps the last 20 things the director dealt and how each ended, so you can follow a chain back.

## 6. Why the director doesn't react to how you're doing

A director that went easier after a loss, or paid more on a streak, could be gamed: losing on purpose, unloading gear, or stopping a streak at the right moment. So it reads only:

- **The world:** your floor, your level, what's on the map, your network's lean, which hubs you've found, your faction rep.
- **What you chose:** outcomes of earlier cards, for chains.

It never reads your Signal, deaths, win streaks, gear or play time per session. Pacing comes from fixed clocks on logged-on time. Offline time doesn't pile up blips or events.

## 7. Build order

1. **D1: chains** (built): the follow-up list, the link icon, and the five chains above (LANTERN's offer as a courier until D3's Escort).
2. **D2: blips**, all four, and the history list.
3. **D3: run cards**: the Surge room first, then Escort, then hunter packs.
4. **D4: crises**: Strain bloom first (strains already exist), then Turf war, then Blackout.

Each phase gets a pacing check in the sims: events and blips per hour of play, rewards per hour against the economy targets, and uniques still under one an hour.

## 8. Decided

- **Blips** come about every 5 minutes of logged-on time.
- **No loss aversion with factions.** Feuds, counter-raids and turf wars only ever add rep or a discount; nothing lowers rep or closes a shop.

## 9. Open questions

- **Crisis length.** 45–90 minutes assumes a long session. Should a crisis pause while you're logged off, or run on real time?
- **Run cards.** About one run in four: more, less, or tied to the server's kind (Mailhubs deal Surges, Relays deal Escorts)?
