# Levers with answers: puzzle fights P2

What a lever is, how each one is decided, and the questions still open. All of P2 is built (the rules are in
GAME_RULES.md "Fights", its routines in "Classes"); left are three open calls (3.3, 3.6, 3.8) and section 4's pairs
for P3's elites. Code cites this doc by section number, so the numbers stay.

## 1. Why not a bot's bar

Before P2 every lever had one right move whatever the board (the Tripwire last, the Lockbox first, quiet on every beat,
SIGINT every cast), so a bot, a preset and a player's habit all found it once and kept it. The designer: *"I worry
that it's not going to be beneficial to put it against a bot since the bot is biased. In a vacuum, the mechanics just
need to be more complex and nuanced."*

## 2. What a nuanced lever is

1. **No fixed rule wins.** "Always do X" and "never do X" both play worse than reading the board.
2. **What decides it is on the board**: a count, a preview or a tether, never a hidden number. The tooltip has the
   sentence; the board shows the number.
3. **A wrong call is friction.** It costs Signal or cycles, under the spike cap, never the fight on its own.
4. **One part, one rule.** The nuance is inside the rule and between parts, not more rules on one part.
5. **Each class answers it its own way.**

## 3. The levers

One entry a lever: the fact that decides it, its WHEN chip (rule tier, 2 RAM), and what is still open.

### 3.1 The Mimic: it copies what you fire

- **Decides it:** what your move's copy would cost you now. No move is free: a heal is cheap when every part is full,
  a strip when you wear no ◆, a burn when you can cleanse next cycle, holding unless a charge is due.
- **Chip:** *dear copy* (the copy costs a tenth of your max or more). Preset *Hold on a dear copy*.

### 3.2 The Tripwire: loud both ways

- **Decides it:** can you finish the rest before the faster, harder attacks add up? Loud parts also take 40% more and
  drop their ◆.
- **Chip:** *loud wins*. Preset *Trip when loud wins*.

### 3.3 The Zip Bomb: the blast hits both sides

- **Decides it:** will the blast break or cut something, with your ◆ or shield covering the fuse?
- **Chip:** *blast pays*. Preset *Blast when it pays*.
- **Open:** a fixed rule (always last) still matches the planner at 10 and 18, even with the blast cutting. Options for
  the designer: a cheaper Zip Bomb, or a bigger blast.

### 3.4 The Lockbox: held, not lost

- **Decides it:** when to break it. Half of what it held lands on the partner at once, so break it the cycle you need
  the partner gone.
- **Chip:** *cash in*. Preset *Cash in*.

### 3.5 Seals: a dial, not a switch

- **Decides it:** how many strips to spend on the sealer against your target. Each ◆ left on the sealer gives one ◆
  back to every part.
- **Chip:** *seal dear* (lands within 2 cycles while its part wears 2 ◆ or more). Preset *Seal dear: strip it*.

### 3.6 Casts and SIGINT: one key, two clocks

- **Decides it:** a cast and a charge compete for one SIGINT (it cuts charges from level 17). Spend it on the dearer;
  answer the other with hits, a shield, or let it land if it's cheap.
- **Chip:** *dearer*. Preset *SIGINT the dearer*.
- **Open:** a fixed rule still wins (*only charges* stays within 2 points of the planner), because a tell's part
  usually breaks before it lands. SIGINT's lever needs fights where tells outlive their part (P3's elites), or casts a
  cut can't answer.

### 3.7 The rest already depend on the board

The Mutex (burst just after the relock, or break it), the C2 Node (break it once fragments are up), the Hotspot (a
command hit is safe when its charge lands on an attack you can cut) and the Limiter (hit size against its cap).

### 3.8 The Decoy: a bent beat

- **Decides it:** where its pointer is. On its beat your single-target command bends onto the part it points at.
  Fire when that's a part you want hit; go quiet when it's itself or a part to break last.
- **Chip:** *bent onto a lever*. Preset *Quiet when bent*.
- **Open:** at level 30 always-quiet ties the planner (every class has a shield or buff as good as its hit). Accept
  quiet as its late answer, or give it more to read (section 4's pairs).

## 4. Rules that pull against each other

Built in P3 (genes.mjs CLASHES): an elite takes two levers whose answers clash. The first three roll; no family
carries both parts of the last two yet.

| Pair | The pull |
|---|---|
| Zip Bomb and a seal | The blast strips every part, so an early break a cycle before the seal answers it. |
| Mimic and a cast | SIGINT on the beat Hangs you. When the cast's window meets the beat, two hits on its part, or let it land. |
| Tripwire and the Lockbox | Held damage and the loud parts' extra damage stack: break the Lockbox into a loud partner. |
| Mimic and the Lockbox | Big hits fill the Lockbox fastest, and big hits are what the Mimic copies. Fill it between beats. |
| Decoy and the Tripwire | The Decoy points at the Tripwire on its beat: fire only if you mean to trip it. |

## 5. The roll: one lever a fight

From level 6 every wild roll, invasion and guard carries one lever; a second is rolled again.

| Family | Its levers |
|---|---|
| Ransomware | Zip Bomb (5), Lockbox (3), Tripwire (16); its seal (6) and cast (10) |
| Worm | Zip Bomb (5), C2 Node (8); its seal and cast |
| Ghostroot | Mimic (8; the Decoy before it), Hotspot (6) |
| Guards | The Sentinel's seal; the others' cast from 10, a Zip Bomb below 10 |

## 6. How it's measured

- **No walls.** The planner reads each deciding fact and still wins 85% of every fight.
- **No fixed rule wins.** For each lever, two players that always take one side (always quiet and always fire, trip and
  never, Zip Bomb early and last, Lockbox first and last, SIGINT every cast and only charges) must each lose about 5
  points of Signal against the planner on some class (`node solved.mjs rules`).
- **The designer plays it.** A lever ships when it plays right, not when a column hits a number.
- The kit and blind players stay in `solved.mjs` as information, with no ceiling.

## 7. Routines: a handler that reads the condition

A fixed preset is a fixed rule, so each lever brings one WHEN chip that reads its deciding fact (section 3). Preparing
still pays as much as watching: the routine that fits the trick reads the same fact you would.

## 8. Build order

P2a (Mimic, Tripwire, Zip Bomb), P2b (Lockbox, seals, casts) and P2c (Decoy) are built, and P3's elites from
section 4's pairs. Each new lever adds its entry to `solved.mjs` FIXED beside its tests.

## 9. Decided

The designer: *"Copy everything. To answer all questions, just lean on the notion of the more difficult choice. I will
test them out."* So the Mimic copies everything; loud parts take more damage and drop their ◆; the blast takes a share
of each part's max and a ◆; SIGINT answers a charge too; half the held damage lands; the Decoy bends. The blind and kit
ceilings are gone (docs/puzzle-fights.md decision 13); the planner, routine and learner floors stay.
