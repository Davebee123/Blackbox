# Boss guide: floors 2 to 8

**Status.** Floors 2, 3 and 4 built (floorbosses.mjs; the numbers below are the prototypes', GAME_RULES.md has the built ones); the rest designed, not built: how each boss in docs/solo-bosses.md plays, written as a raid guide (what it is, its
abilities, each phase, how you die). docs/solo-bosses.md holds the rules; where the two differ, it wins. Prototyped as
applets with a board a phase (November 2026). Phases start as the ♛ part crosses 60% and 30% (BYZANTINE's 78% and 42%); INIT's as its table
crosses 90, 83, 76 and 68. The numbers are the prototypes' placeholders; the boss sessions set the real ones.

Terms: a **charge** is a big attack shown ahead that you can call off. A **cast** builds something on the virus, and
you interrupt it. **Cutting** means taking a part across a tick on the cycle its move is due, which cancels the move.
**SIGINT** is your one interrupt. **◆** is armor: a hit on armor breaks one ◆ and deals no damage.

---

## Floor 2

### CENTRIFUGE · floor 2's floor job · level 14

**Overview.** A two-part fight that grows extra parts if you let its Gavel run fast. The whole fight is how much tempo
you spend keeping it slow.

**Abilities**
- **Encrypt** (Rotor, every 4): stacks 8 damage a cycle on you until you cleanse it or the Rotor breaks.
- **Surge** (Gavel): 34 damage. Each one that lands makes the next come sooner: every 4 cycles, then 3, then 2.
- **Withdraw** (your move): a delay or Throttle on the Gavel's Surge resets it to every 4.
- **Sold** (Gavel, at every 2): if its Surge lands while it is at every 2, the buyer named on the Gavel joins as a new
  part, and the Gavel drops back to every 3.
  - TOLLGATE: a Ward. The Rotor loses at most 25% of its max a cycle while it stands.
  - SWARMLINE: a Twin of the Gavel. Break one and the other reboots unless both go down within 3 cycles.
  - PALEMASK: a Veil. One part's timers are hidden.

**Phase 1 (100–60%)**
- *What happens:* the Gavel speeds up every time it lands. By about cycle 8 it reaches every 2, and its next landing
  sells.
- *Strategy:* hit the Rotor. When the Gavel shows *every 2*, delay its next Surge. If your delay is on cooldown, read
  the next buyer: SWARMLINE and PALEMASK are cheap to take, TOLLGATE's Ward is not.
- *How you die:* you never delay, a Ward joins early, and the Rotor fight stretches while Encrypt stacks.

**Phase 2 (60–30%) · Reserve price**
- *What happens:* a delay now only steps the Gavel back one, from every 2 to every 3. It returns to every 2 after one
  more landing, so a sale is coming.
- *Strategy:* stop fighting the sale and choose it. Delay while the next buyer is TOLLGATE; when it names one you can
  handle, let the Surge land. Kill the new part at once (a Twin: break both together).
- *How you die:* spending every delay trying to stop all sales, then taking TOLLGATE anyway.

**Phase 3 (30–0%) · Second lot**
- *What happens:* each sale brings two buyers.
- *Strategy:* delay every Surge at every 2 from here on, and burst the Rotor. Through a Ward, use burns and helpers;
  they go through it.
- *How you die:* one late sale puts two new parts on the board with the Rotor nearly dead.

**Tips.** Throttle is your best key here, since it also softens the Surge. Keep a cleanse for the Encrypt stack in
phase 3.

---

### SHAKEDOWN · floor 2's Pits throne · level 12

**Overview.** A race against a ransom clock, where letting yourself get hit is how you buy time.

**Abilities**
- **Ransom clock**: counts down from 12. At 0 it **leaks**: 30% of your max Signal, and the clock restarts at 6.
- **Deadline** (Demand, charge, every 5): 36 damage. If it lands, the clock gains 3. If you call it off (cut or
  SIGINT), it does nothing, and the clock gains nothing.
- **Ward** (Lockbox): while the Lockbox stands, the Demand loses at most 25% of its max a cycle.
- **Surge** (Collector ♛, every 4): 30 damage.

**Phase 1 (100–60%)**
- *What happens:* the clock ticks down while you work on the Collector. Each Deadline asks whether to pay 36 Signal
  for 3 more cycles.
- *Strategy:* estimate how many cycles you need to kill the Collector. If the clock will reach 0 first, let Deadlines
  land; if not, call them off. Killing the Demand ends the Deadlines, and with them your way to buy time.
- *How you die:* calling off every Deadline out of habit, then eating a 30% leak at a bad moment.

**Phase 2 (60–30%) · Second demand**
- *What happens:* a second Demand joins, with its Deadline on the same cycle as the first.
- *Strategy:* choose how much time to buy: one lands (+3, −36), both (+6, −72), or neither.
- *How you die:* letting both land when you only needed one, and running low on Signal for phase 3.

**Phase 3 (30–0%) · Final notice**
- *What happens:* every leak now also refills the Demand's armor and brings the Lockbox back.
- *Strategy:* never let the clock reach 0. Bank time early in the phase, then burst the Collector.
- *How you die:* a single leak undoes the work you did on the Demand.

**Tips.** Shields make letting Deadlines land cheap. Bastions can buy time almost for free.

---

## Floor 3

### SHOULDER SURFER · floor 3's floor job · level 18

**Overview.** A timing fight. The ♛ only takes damage inside a window, and everything you fire outside it gets used
against you.

**Abilities**
- **Sync Window**: a slice of the cycle bar, open every other cycle. The Logger (♛) only takes damage from commands
  fired inside it.
- **Log**: every command you fire outside the window is logged (pips on the Logger).
- **Dump** (at 3 logged): hits you with your last logged command at its full strength, then clears the log.
- **Overcharge** (Pulse Node, charge, on closed cycles): 92 damage.
- **Scramble** (Scrambler, every 4): Scrambled for 2 cycles.

**Phase 1 (100–60%)**
- *What happens:* you alternate window cycles (hit the Logger) and closed cycles. The Pulse Node's charge lands on a
  closed cycle, so cutting it costs a log pip.
- *Strategy:* on window cycles, fire your best skill at the Logger inside the window. On closed cycles, Hold, or fire
  something small. Cut the Overcharge only if your log is at 0 or 1.
- *How you die:* firing a big skill outside the window, then getting it back from the Dump.

**Phase 2 (60–30%) · Again**
- *What happens:* every 4 cycles, on a marked beat, it fires your last three commands back at you in order.
- *Strategy:* in the two or three cycles before a beat, fire small skills or Hold, window or not.
- *How you die:* bursting into a beat and taking your own burst three times over.

**Phase 3 (30–0%) · From the top**
- *What happens:* the log never clears again, and the Dump uses the biggest command ever logged.
- *Strategy:* never fire a big skill outside the window. Finish the Logger in windows.
- *How you die:* one early mistake that keeps coming back.

**Tips.** Hold is free and is never logged. Burns started inside the window keep ticking on the Logger.

---

### RECURSION · last room of floor 3's Gauntlets · level 19

**Overview.** A stack of frames with the ♛ at the bottom. You dig down while it keeps adding to the top.

**Abilities**
- **Call stack**: single-target commands only hit the top frame. Burns and area hits reach every frame.
- **Call** (top frame, cast, every 4): pushes a new frame on top at 60% of its own max. A frame under 25 Integrity
  can't call.
- **Surge** (every frame, own timer): about 24 to 38 damage each.

**Phase 1 (100–60%)**
- *What happens:* main() starts under two frames. Every 4 cycles the top frame pushes another one unless you stop it.
- *Strategy:* break the top frame before its Call. If you can't, bring it under 25 so it can't call, and leave it as
  the top. Use burns and area hits to wear down main() through the stack.
- *How you die:* letting Calls through until five frames are attacking.

**Phase 2 (60–30%) · Return**
- *What happens:* breaking a frame makes the frame below attack a cycle sooner and 50% harder.
- *Strategy:* after each break, shield or delay the next frame's attack. Don't break two frames back to back.
- *How you die:* a fast double pop, then two boosted hits in a row.

**Phase 3 (30–0%) · Overflow**
- *What happens:* at five frames, every frame attacks at once (shown a cycle ahead).
- *Strategy:* keep the stack at four or fewer by breaking the top on the cycle before a Call.
- *How you die:* missing one Call while the stack is at four.

**Tips.** Area-hit classes (Breaker, Operator helpers) do well here. Infiltrators should set burns early.

---

## Floor 4

### CAMSWARM · floor 4 lair · level 24

**Overview.** Hurt parts spawn fragments, and fragments that live grow into Cameras. Finish what you start.

**As built:** the Hive never hatches; a fragment is shielded until the part that hatched it breaks (then it drops); each
fragment hatched brings the next sweep a cycle sooner; a hit takes 15% of a part at most; Botnet brings a broken C2 Node
back, and the Lockout boots a Camera.

**Abilities**
- **Telnet Sweep** (Hive ♛, every 5, shown 2 ahead): each part under half Integrity spawns a fragment.
- **Gnaw** (fragment): 6 damage a cycle.
- **Recruit**: a fragment that lives 3 cycles becomes a Camera, a part with a 30-damage Surge.
- **Surge** (Pulse Node): 62. **Beacon** (C2 Node): 20.

**Phase 1 (100–60%)**
- *What happens:* a sweep every 5 cycles. Half-dead parts spawn fragments; fragments turn into Cameras after 3 cycles.
- *Strategy:* take a part from full to broken between two sweeps, or don't start on it. Clear fragments before their
  third cycle; area hits are ideal.
- *How you die:* chipping every part to under half, then four fragments a sweep and Cameras everywhere.

**Phase 2 (60–30%) · Botnet**
- *What happens:* when the C2 Node's Beacon lands, every Camera fires with it.
- *Strategy:* break the C2 Node now, or kill Cameras before each Beacon.
- *How you die:* three Cameras and a Beacon on the same cycle.

**Phase 3 (30–0%) · Lockout**
- *What happens:* the Hive takes no damage while any Camera stands.
- *Strategy:* clear every Camera (and fragments before they turn), then burst the Hive.
- *How you die:* a burst wasted on a locked Hive.

**Tips.** Save your area hit for the cycle after a sweep.

---

### NIGHT DESK · floor 4's floor job · level 24

**Overview.** Its attacks don't land; they wait. You decide when to take them, at half, before four pile up.

**As built:** it opens with two trades held; one hit on a part clears every hit held there; only the Desk takes damage
(12% a hit at most), and its two traders go when it breaks; a full table makes later trades 25% bigger; Finality heals
the Desk 4% for each hit cleared.

**Abilities**
- **Held hit**: every attack it makes is held on the part that made it (a red tag on that row). Nothing hits you yet.
- **Clear**: hit a part with a held hit and that hit lands on you at half.
- **Table full**: when four hits are held at once, all of them land at full strength.
- SIGINT, delays and cuts do nothing to held hits.

**Phase 1 (100–60%)**
- *What happens:* every part's attack becomes a held hit. Three parts attacking every 3 to 4 cycles reach four held
  hits in about 5 cycles.
- *Strategy:* hit the Desk, and when three hits are held, clear the biggest by hitting its part.
- *How you die:* tunnelling the Desk until four land at once (about −250).

**Phase 2 (60–30%) · Night shift**
- *What happens:* a held hit grows 10% each cycle it waits.
- *Strategy:* clear the oldest first, even on a part you didn't want to hit.

**Phase 3 (30–0%) · Finality**
- *What happens:* clearing a held hit also heals the Desk by the half you didn't take.
- *Strategy:* clear only when the next hit would make four; otherwise burst the Desk.
- *How you die:* clearing out of habit and healing the Desk back over 30%.

**Tips.** Shields absorb held hits when they land, so a shield before a deliberate clear makes it nearly free.

---

### BYZANTINE · floor 4's Pits throne · level 26

**Overview.** Three Nodes that heal whichever is hurt most. Spread your damage, then strike between votes.

**As built:** a vote passes only when the lowest Node is 15% or more under the average; each one that passes makes
every Node hit 30% harder; a hit takes 20% of a Node at most; the traitor is the lowest Node as act 2 starts.

**Abilities**
- **Vote** (every 4, shown 2 ahead): the most damaged Node is restored to the average of the three. Steel hatching on
  its bar shows how much.
- **Surge** (78), **Replicate** (adds a fragment).

**Phase 1 (100–78%)**
- *What happens:* every 4 cycles the lowest Node is pulled back up to the average.
- *Strategy:* keep the Nodes even. Right after a vote you have 4 cycles; burst one Node then.
- *How you die:* focusing one Node and watching the vote undo it.

**Phase 2 (78–42%) · Traitor**
- *What happens:* one Node is tagged traitor. Its vote sends the restore to the healthiest Node's Integrity, a full
  heal, unless the traitor itself is the most damaged.
- *Strategy:* keep the traitor the lowest Node.

**Phase 3 (42–0%) · Hard fork**
- *What happens:* a Node you break comes back at the next vote, at the average of the other two, unless both of them
  are under half.
- *Strategy:* bring all three under half, then break them close together.
- *How you die:* breaking one early and fighting it again.

**Tips.** Area hits and burns spread damage evenly for free.

---

## Floor 5

### GRACE PERIOD · floor 5 lair · level 28

**Overview.** Four parts, each with a clock you reset by hitting it. You can't keep them all reset, so choose which
one lapses.

**Abilities**
- **Grace** (every part): 3 cycles, shown as pips. Your command on a part resets its clock.
- **Lapse**: when a part's clock runs out, its armor refills and its next attack becomes a charge.
- **Rider** (cast): its hits +15%. **Encrypt** (Notice), **Surge** (Policy ♛, Collector).

**Phase 1 (100–60%)**
- *What happens:* with one command a cycle and four clocks, a part lapses about every other cycle.
- *Strategy:* choose the lapse: let a part lapse whose charge you can cut or SIGINT. Keep the others reset.
- *How you die:* trying to keep everything reset and lapsing two parts at once.

**Phase 2 (60–30%) · Reinstatement**
- *What happens:* a lapsed part hits 25% harder until you strip its armor again.
- *Strategy:* strip or break lapsed parts; keep resetting the others.

**Phase 3 (30–0%) · Acceleration**
- *What happens:* grace drops to 2 cycles, and a lapse takes a cycle off every other part's clock.
- *Strategy:* one lapse starts a chain. Burst the Policy between chains.

**Tips.** Area hits reset every clock at once. Breakers and Operators find this boss much easier.

---

### EXIT NODE · floor 5's floor job · level 30

**Overview.** It undoes your damage every 6 cycles, but not its damage to you. Its three backups are the phases.

**Abilities**
- **Front**: the outer backup takes your single-target hits aimed at the Core. Burns and helpers go through.
- **Rollback** (every 6): restores its own bars to where they were 2 cycles earlier. A white notch marks that point.
  Your Signal is never restored.
- **Glass Cut** (Core, charge): 96. **Surge** (Core): 58.

**Phase 1 · v7**
- *What happens:* damage in the 2 cycles before a restore is undone, unless it breaks a backup outright. A broken
  backup stays broken.
- *Strategy:* time your bursts to finish the front backup inside the window. Use the window's other cycles to shield.

**Phase 2 · v6 · Kept charges**
- *What happens:* a charge you cut inside the window comes back at the restore.
- *Strategy:* cut charges outside the window; inside it, shield and take them.

**Phase 3 · v5 · Cold image**
- *What happens:* every restore now returns to the moment v6 broke.
- *Strategy:* get the Core low before breaking v6, then burst v5 and the Core between restores.
- *How you die:* breaking v6 early with the Core still near full, after which every restore goes back to that.

---

### ACTUARY · its hub server's Core, sealed until level 40

**Overview.** A pricing model. One part is insured (immune) each cycle, and every tell you miss makes it hit harder.

**Abilities**
- **Insured** (rotating, the next one shown): damage on the insured part is refunded at the end of the cycle, so cuts
  on it fail.
- **Premium** (gauge): +15 when a tell lands on you, −15 when you answer one. Its hits are 1% stronger per point.
- **Denial** (Claims, charge), **Reprice** (Pricing, cast: premium +10), **Surge** (Model ♛).

**Phase 1 (100–60%)**
- *Strategy:* hit uninsured parts. Answer every tell; on the insured part only SIGINT works. Keep the premium under
  about 40.

**Phase 2 (60–30%) · Write-off**
- *What happens:* the Cancel Job wakes. Every 5 cycles it breaks the most damaged uninsured part, and you take that
  part's remaining Integrity.
- *Strategy:* before a write-off, finish its target or get it very low. When a write-off and a charge come together,
  choose which to answer.

**Phase 3 (30–0%) · Finality**
- *What happens:* the premium is set to 60. Insured parts take no damage, and the Model is insured while the premium is
  50 or more. Each cycle, the part that just lost insurance charges, landing in 2.
- *Strategy:* answer the charges to bring the premium under 50, then burst the Model while it is uninsured. A tell that
  lands closes it again.

---

## Floor 6

### RING ZERO · floor 6 lair · level 34

**Overview.** It takes one of your keys. That key still fires, but into the Hook, which fires it back at you.

**Abilities**
- **Hook** (passive): one of your keys is hooked, moving every 3 cycles (the next is shown dashed). Never key 1 or
  SIGINT.
- **Replay** (Hook, every 4): fires everything the hooked key put into it back at you.
- **Re-arm** (Scrambler, seal): refills its armor if it still wears any.

**Phase 1 (100–60%):** avoid the hooked key, or fire it small. If you need that key, break the Hook (it frees the key
for 3 cycles).
**Phase 2 (60–30%) · Second hook:** two keys at once. A replay and a charge line up, so break the Hook or cut the
charge.
**Phase 3 (30–0%) · Ring 0:** the key you fired last is hooked next. Never use the same key twice in a row, and make
your last command before a replay a small one.

### BRICKWALL · floor 6 lair (no board yet)

Every 3 cycles it puts 1 armor on the part you hit last. A part at 4 armor rages (hits ×1.5) until stripped below 3.
**Phase 2 · Load-bearing:** stripping a raging part's last armor puts 1 on each part beside it. **Phase 3 · Two at
once:** armor goes on the last two parts you hit. *Strategy:* switch targets so no part reaches 4.

### BULKHEAD · floor 6's floor job · level 36

**Overview.** It seals its own parts away one by one, turning them into armor on the Lock.

**Abilities**
- **Closure** (every 3, a cycle's notice): seals the lowest open part (BEDROCK, then SINK, then KERNEL). A sealed part
  can't be hit or attack, and its remaining Integrity becomes armor on the Lock.

**Phase 1:** break the part with the notice before it seals, or let it seal: one less attacker, more armor on the
Lock.
**Phase 2 · Pressure:** a sealed part's attacks build up behind the seal, and breaking the Lock releases them all at
once. Shield before the final hit.
**Phase 3 · Final notice:** the Lock only takes damage on cycles a notice is running. Hit the other parts between
notices, and burst the Lock on notice cycles.

---

## Floor 7

### GOLDEN PARACHUTE · floor 7's floor job · level 38

**Overview.** Breaking a part makes all the others stronger, and at the end it tries to escape.

**Abilities**
- **Severance**: when a part breaks, every other part gains 1 armor and its next attack becomes a charge.
- **Exfiltrate** (Renewal, charge), **Cycle Tax** (Escrow: your cooldowns +2), **Surge**.

**Phase 1:** break a part only when you can answer the charges it creates.
**Phase 2 · Vesting:** each part hits 4% harder for every cycle it has stood in this phase. Kill quickly; save the
weakest for last.
**Phase 3 · The Parachute:** crossing 30% starts a 4-cycle escape. If it escapes, the fight ends with no loot (it's
back next visit). Cross 30% with a burst ready and ignore the other parts.

### PAY RUN · floor 7 lair · level 40

**Overview.** No regular attacks. Every 4 cycles, one payday hits you once for each part still standing.

**Abilities**
- **Payday** (Batch ♛, every 4): one hit per standing part, each at that part's share.
- **Share**: shown on each row, it grows 10% for every cycle you haven't hit that part.

**Phase 1:** touch every part every few cycles, or focus one down to remove its share.
**Phase 2 · Back pay:** a part broken between paydays passes its share, plus 50%, to the next payday. Break parts
right after a payday.
**Phase 3 · Settlement:** each payday heals the Batch by the damage you take. Shield before every payday.

### BIT BUCKET · floor 7 lair (no board yet)

The first 30% of your damage each cycle is thrown away (+5% per armor it wears), and every 4 cycles what it threw away
hits you as one attack. **Phase 2 · Pipe:** it throws away your largest hit instead. **Phase 3 · Blackhole:** the part
you hit most in the last 3 cycles takes no damage. *Strategy:* many small hits, and switch targets.

### SUMP · the server at floor 7's funnel point · level 44

**Overview.** Your damage partly drains into a tank that heals the boss. Empty it on your own terms.

**Abilities**
- **Runoff**: a fifth of the damage you deal collects in the Sump (gauge).
- **Pump** (cast, every 5): heals the Intake ♛ by half the runoff.
- **Flush**: breaking the Sump dumps all the runoff on you and on every part. It comes back empty 3 cycles later.

**Phase 1:** break the Sump before the Pump's cast, with your shield up.
**Phase 2 · Overflow:** at 300 runoff it flushes on its own, onto you only. Flush first.
**Phase 3 · Drain open:** all your damage to the Intake becomes runoff. Flush, then burst.

---

## Floor 8

### HALT AND CATCH FIRE · floor 8 lair · level 46

**Overview.** It overheats. Vent it, or let it blow up on both of you.

**Abilities**
- **Heat** (gauge): +8 a cycle; its hits are 1% stronger per point.
- **Vent**: crossing a tick on a Rig vents 25 heat.
- **Meltdown** (at 100): 20% of max off you and off every part; heat drops to 40.

**Phase 1:** vent before 100, or shield and let it blow (it hurts its parts as much as you).
**Phase 2 · Runaway:** venting leaves you Overheated (cooldowns +1 for 2 cycles). Vent only when you can afford it.
**Phase 3 · Halt:** at 100 it halts for 2 cycles, untouchable, then every attack it skipped lands at once. Vent, or
spend the halt on shields.

### THUNDERING HERD · floor 8 lair · level 47

**Overview.** A sleeping herd that grows. Thin it quietly before it wakes.

**Abilities**
- **Spawn** (Listener ♛, every 4): a new sleeping worker.
- **Accept** (every 5, shown ahead): every worker wakes and bites once (46 each).
- A worker broken in one hit, or hit while awake, wakes nobody.

**Phase 1:** one-shot workers between wakes. On the wake cycle, shield and use area hits on the awake workers.
**Phase 2 · Light sleepers:** hitting a sleeping worker without breaking it wakes them all. Only hit what you can
one-shot.
**Phase 3 · Stampede:** after each wake, one more worker stays awake for good. Kill those first, then burst.

### CORE DUMP · floor 8's floor job · level 48

**Overview.** A part you break keeps attacking as a ghost. Choose which attack you'll live with.

**Abilities**
- **Ghost**: a broken part stays on the board, can't be hit, and repeats its last attack every 3 cycles at full
  strength until the Image ♛ falls.
- Each part alternates a small attack and a big one; its row shows which it made last.

**Phase 1:** break each part right after its small attack.
**Phase 2 · Reload:** every 6 cycles the worst ghost comes back as a part at 30%, a chance to break it again after a
small attack.
**Phase 3 · Full dump:** every attack the Image lands also stays as a half-strength ghost. Shield, then burst.

### INIT · Bedrock's deepest server · level 50 · five phases

**Overview.** You can't break INIT. You bring its process table (one square a percent) from 97% down to 61% by
ending the orphans it adopts, cleanly.

**Abilities**
- **Adopt** (every cycle): a new orphan, a small part.
- **Clean kill**: an orphan broken in one hit, or while Open: −2%.
- **Re-parent**: an orphan alive at the end of its third cycle (3 pips) leaves: +1%.
- **Retry** (each orphan): 41 to 72 damage, growing with the phase.

**Phase 1 (97%):** one-shot orphans, or hit them while Open. Never let one reach 3 pips.
**Phase 2 (90%) · Zombies:** an orphan broken in more than one hit becomes a zombie: it frees nothing and holds its
square. Every 4 cycles INIT reaps them, a hit on you each. If you can't one-shot an orphan, let it re-parent instead.
**Phase 3 (83%) · Fork:** orphans have armor, and one that survives a hit splits off a copy. Strip, then one hit.
**Phase 4 (76%) · Table full:** with five standing, INIT can't adopt, and nothing new of yours starts (no helper, burn,
shield or buff; hits still work). Set up before it fills, or fill it on purpose to stop the count.
**Phase 5 (68%) · Still filling:** the table rises 1% every cycle on its own. A kill every other cycle only holds even,
so spend everything.
