# Your house

A funny little ASCII house of your own, and ASCII furniture you collect for it. Cosmetic only; not tower defense.
*Decided from a prototype, not built.* The brainstorm row is in docs/activities.md.

## Decided

- **The look: a cutaway, floors stacked.** A tenement slice: the roof (an antenna, a dish), rooms one above another
  and a ladder down the right. Gravel outside marks street level; floors below it are underground. The structure is
  drawn dim, the furniture in the text colour. No furniture uses teal, red, violet, steel or amber.
- **Free placement.** Pick a piece in the picker, then click a spot: it stands on the floor under the cursor, and a wall
  piece hangs on that floor's back wall. Pieces can't overlap each other, a window or the ladder. Click a placed piece to
  pick it up again, and press Esc to put it back. Each piece is one of a kind.
- **The house grows with achievement points.** You start with one street-level room and the roof. Each threshold adds
  a floor: a loft (50 points), a cellar (200), a shack on the roof with the rest of the roof left as a terrace (450),
  a bunker (800), a fifth floor (1,200, of 1,740 today). The thresholds are a guess until checked against real pacing.
  The next floor shows as a dotted outline where it will go. Its tooltip reads **???**, *Floor*, then *Earn 200
  achievement points.*, muted. A new floor is one pager line, like an achievement.
- **The page scrolls** when the house is taller than the screen.
- **The picker:** a tile per piece with its count (*9/14*). An owned piece shows by name, muted once placed. A piece
  you don't own shows as its shape in solid blocks (as an unfound daemon is), **???**, and the line that names what
  earns it.
- **The tooltip:** the name, *Furniture* (*Furniture, wall*), the flavour line, then its source, muted.
- **Rules:** every piece comes from an achievement (a new one where none exists yet), never a server floor, a shop or
  a timer. No effect on play, and kept for good.

## Open

Where it lives (System, its own page, or the home screen); the fifth floor's name; how it looks on a phone.

## The first furniture

| Piece | Flavour | Earned by |
|---|---|---|
| Bare mattress | Came with the squat. So did the stain. | Yours from the start |
| Milk-crate desk | Load-bearing dairy. | Map your first server |
| CRT aquarium | Gutted for parts. The fish runs it now. | Win Cascade 25 times |
| Quarantine lamp | Something is contained in there. Mostly. | Win Quarantine 25 times |
| Repossessed armchair | Repo'd twice. The third time, it stayed. | REPO MAN's first fall |
| Relay throne | Five wheels, four that turn. Still a throne. | RELAY-KING's first fall |
| Hashboard heater | Mines nothing. Heats everything. | HEATSINK's first fall |
| Cold-safe planter | Cracked open. Holds a cactus now. | COLDWALLET's first fall |
| Claims cabinet | Every drawer a denied claim. Yours is on top. | Halcyon Mutual's top tier |
| Choir pew | Seats a choir of none. | NULL CHOIR's top tier |
| Crew couch | Seats three. Has seated nine. | LOWLIGHT's first job done |
| The cat | Not furniture. Placed anyway. | Play for 100 hours |
| HANG IN THERE (wall) | Process 4417 did not. | Win a fight on 1 Signal |
| Mystery toilet | Plumbed into something. Don't trace it. | Trace 100 servers |
