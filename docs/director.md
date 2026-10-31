# The event director: a living net

**Status.** The plan to make the net move without you. Built: the director, its deck and chains (D1), blips and the
history list (D2; GAME_RULES.md *Events*, *Chains*, *Blips*, *History*). Left: run cards (D3) and crises (D4).

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

**Built (D1).** The rules are in GAME_RULES *Chains*; the code is `dist/events.mjs` (`CHAIN`, `dealChain`), tested in
`chains.test.mjs`. What still governs them:

- Ignoring a card never starts a chain, and ignoring a follow-up costs nothing and starts nothing.
- Chains never pay more than the cards they come from, and nothing pays for letting an event get away (a marked bounty
  with a named drop after two escapes was built and taken out for that reason).
- LANTERN's offer is a courier fight until D3's Escort (section 4) replaces it.

## 3. Three sizes

| Size | How often | Lasts | On screen | Examples |
|---|---|---|---|---|
| **Blip** | about every 5 min logged on (4–6) | 2–8 min | A pager line and a short mark on the map | A stray cache, a price flicker, a rumour, a rare-spawn sighting |
| **Event** | every 15–30 min (as now) | 10–30 min | A card on the server or hub | Courier, Bounty, Feud, Bounty hunt, Market shock, Spotter, Outbreak, Leak, Darknet listing, Hollow Choir |
| **Crisis** | about every 3 hours, from level 8 | 45–90 min | A banner on the floor panel and the map tinted for that floor | Strain bloom, Turf war, Blackout |

Blips don't count toward the two-event limit. At most one crisis is up at a time, and a crisis holds its own slot.

### Blips

**Built (D2).** The rules are in GAME_RULES *Blips*; the code is `dist/events.mjs` (`BLIPS`, `dealBlip`), tested in
`blips.test.mjs`. Small, quick and cheap. No fights of their own, or one room at most.

- **Stray cache:** a cache appears in a room you've cleared on one of your servers (credits and code, about half a vault cache) until someone else takes it (a few minutes).
- **Price flicker:** one ware at one hub moves ±15% for 5 minutes. The ▲/▼ chip on the hub shows it.
- **Rumour:** a pager line that names where the next event will land (*Couriers are moving through MERIDIAN-MX-14*). It's true. This is foreshadowing, and it makes the world look connected.
- **Sighting:** a rare spawn is due in a named room on one of your servers within the next few minutes.

### Crises

One floor, for most of a session. Each has a clear way to end it early and a reward for taking part, paid once per crisis.

- **Strain bloom.** A strain spreads across a floor: every few minutes it takes another server, whose rooms then carry the strain's mutation (the map shows the spread in its colour). Its source is one server; clear that server's core and the bloom ends. Pays the strain's trophy table and the codex entry.
- **Turf war.** Two rival factions contest a floor. Faction servers on it flip colour as the war moves, Feud cards on that floor come up three times as often, and your feud wins tip the balance. The side that holds more of the floor at the end puts its goods on sale for a day (and the loser is simply back to normal). Backing the loser costs you nothing.
- **Blackout.** A floor's hubs go dark: their markets close, components drop 50% more often and every run on that floor has one more rest room. It ends on its own. Restore a relay on the floor (a puzzle room, marked) to end it early and get the hub's thanks (+3 rep).

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

1. **D1: chains**: built.
2. **D2: blips**, all four, and the history list: built. Pacing (bot.mjs, seed 7, to level 12, the director's own
   clock): events 2.7–2.9 an hour, blips 11.7 an hour; every blip taken would add about 10% to credits an hour
   (3 caches) and 3 rare spawns' kills (+0.0015 uniques an hour); uniques within one of the run with blips off.
3. **D3: run cards**: the Surge room first, then Escort, then hunter packs.
4. **D4: crises**: Strain bloom first (strains already exist), then Turf war, then Blackout.

Each phase gets a pacing check in the sims: events and blips per hour of play, rewards per hour against the economy targets, and uniques still under one an hour.

## 8. Decided

- **Blips** come about every 5 minutes of logged-on time.
- **No loss aversion with factions.** Feuds, counter-raids and turf wars only ever add rep or a discount; nothing lowers rep or closes a shop.

## 9. Open questions

- **Crisis length.** 45–90 minutes assumes a long session. Should a crisis pause while you're logged off, or run on real time?
- **Run cards.** About one run in four: more, less, or tied to the server's kind (Mailhubs deal Surges, Relays deal Escorts)?
