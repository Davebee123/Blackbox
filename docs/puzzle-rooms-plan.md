# Plan: three new puzzle rooms (Packet routing, Deadlock, Cryptogram)

Not built yet. The designer played prototypes of all three (October 2026) and kept them; the playable prototype is
https://claude.ai/artifact/XqTzscjsm6DYUJ7peGhipw (private to the designer). Build them to its rules, look and one-line
rules; this page holds enough of its logic to rebuild. Leave out the prototype's frame (tabs, "Next board").

## The designer's calls

- **Anywhere.** All three join the puzzle-room draw on every server and every floor, weight 1 each, like Cascade and Ping
  sweep (`floorplan.mjs` `puzzleKinds`, `puzzles.mjs` `PUZZLE_KINDS`). No floor gating; Deadlock is no longer "the floor 6
  board". Same exclusions as now (SPRAWL-00, rogue servers, lairs, the farm).
- **They pay less than the four existing boards.** Same one rule: pays once, at its end, done until it refills (2 hours).
  Proposed numbers (tune lean; the designer's play is the bar):
  - a win pays **half a kill's XP** (intel), where the others pay a whole one (`finishPuzzle`: `xpFor(s, L, P.xp)`);
  - Packet routing: half a cache's code, nothing per spare turn;
  - Deadlock: 1 component;
  - Cryptogram: no extra loot; the decoded note is the reward, and solved letters join your key either way;
  - none of the three rolls the floor's puzzle-board uniques on The Sink and Bedrock;
  - a win still counts for a Solve contract.
- **Cryptogram's lead:** ship the note as plain lore (a wick note) for now. Leads to off-map servers wait for the scanner and
  off-map servers (docs/activities.md); don't build them here.

## The boards (lean: rule, board, tooltip, unit test, docs)

Each in `puzzles.mjs` (state, generator, move, `puzzleScore`, terminal words in `boardLines`/`moveLine`/`cellOf`) and
`puzzle-view.mjs` (SVG/DOM board, `statsOf`, `resultOf`, `BOOT`, fx). Same look as the existing boards: cut-corner chips,
traces with a dark bed, the dot-grid well. A glow filter on a straight SVG line has no area and draws nothing: use a wider
translucent line under it instead.

1. **Packet routing**, *Get it through*. Rule: "Click turns a tile clockwise, right-click turns it back. Join the source to
   the sink." 7×5 tiles (straight, elbow, tee, a few empty), source chip left (amber), sink chip right (gold). Generator:
   a self-avoiding walk of 13–21 cells from source row to sink row becomes the route's tiles (20% upgraded to tees), the
   rest random, every tile randomly rotated. Fewest turns: DFS over simple routes, each tile costing min(cw, ccw) quarter
   turns, pruned by a lower bound from value iteration over (cell, entry side). Keep boards with fewest 9–14. Budget =
   fewest + 2. Lit wire from the source glows and flows; won when the sink is lit; lost at 0 turns, with the fewest route
   shown dashed. Phone: a tap turns clockwise (no right-click).
2. **Deadlock**, *Let them all finish*. Rule: "Give a process a free lock. One holding all it needs finishes and returns its
   locks." Six processes in a ring around a pool of free locks, typed A–D. Each needs 2–3 locks and holds some. A needed
   slot you have free is lit amber and takes a click; hovering it glows gold if that give finishes the process. A finished
   process returns all its locks to the pool. Lost (DEADLOCK, red) when no process can finish from the pool. Generator: keep
   boards where exactly one process can finish at the start, at most two at any point of the finish chain, at least three
   decoys (givable but not finishable), and random play wins 4–30% (prototype boards: 10–20%). Solvable check: finishing
   whatever can finish, in any order, finishes everyone (finishing only frees locks). On a phone the ring stands upright.
3. **Cryptogram**, *Read wick's note*. Rule: "Each letter stands for another, the same in every note. A wrong letter costs
   a strike." One substitution key for the player (no letter maps to itself), so a solved letter stays solved on every
   later note, win or lose. Notes in wick's voice: lower case, terse; prototype notes are in the artifact. Click a cipher
   letter, then type or tap the on-screen a–z (a phone never opens its keyboard). A correct letter fills every instance and
   moves to the next unknown one; a wrong one costs a strike and is struck on the keys for that symbol. Three strikes lose.
   Carried letters show dim amber, this board's bright amber; a Key n/26 bar shows both.

## The save

The cryptogram key is new player state (the solved plain letters). Add it with a migration keyed on the field (missing →
empty), safe to run twice. Raise `SAVE_VERSION` only when landing, after main is merged in: one more than main's.

## Docs and tests

- GAME_RULES.md "### Puzzle rooms": three new rows in the table, the "anywhere" placement and the lower pay. README.md's code
  map in step, same commit.
- `puzzles.test.mjs`: each generator's boards are solvable and meet their bounds; the fewest-move solutions win; a board
  can be lost; the key carries between notes and survives a loss.
- `npm test` before every commit; commit only on `# fail 0`.
