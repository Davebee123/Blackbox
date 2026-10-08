# Crew bosses: the review sheet

KESSLER-FARM-00's three bosses run on the group boss framework (`dist/raid.mjs`; the rules are in GAME_RULES.md under Crew bosses). This sheet is for reviewing them: for each boss, phase by phase, what the tank, the healer, the damage dealers and support are doing, and what happens when they don't. The numbers are shares of the target's max Signal at level 17 and up (two fifths of that at level 9 and below, three fifths at 13, a fifth more at 30), for a crew of four.

The solo bosses (RELAY-KING, REPO MAN, HOLLOW CHOIR, the Residents) don't use this framework. They bring every solo tell open at their level instead, and docs/solo-tells.md is their review sheet.

**How a fight is lost.** You going down ends it. So does a wipe: half the crew down (two of three or four). A missed mechanic downs someone or costs a big share of their Signal; two usually lose.

**How a fight reads.** Every mechanic is announced two cycles ahead on the boss's row of the board and in the log (`PINK SLIP → nyx in 2.`). A cast shows *Compiling…* and says whether SIGINT stops it. The crew strip shows what's on each crewmate (Thermal Stress stacks, Corruption, encrypted sectors, who's marked).

## THE FOREMAN: the tank and SIGINT check

Ransomware. Integrity ×13, enrages at cycle 22 (MASS LAYOFF, 20% on everyone every cycle). Its Surge goes at whoever holds aggro. Its Encryptor no longer encrypts: Layoffs is that job now, as a cast the crew can stop.

| Phase | Role | Their job | If they don't |
|---|---|---|---|
| Day shift (100–50%) | Tank | Taunt (Firewall, Bulkhead) for **Pink Slip** every 6 and Bulkhead it: 90% on whoever holds aggro. Pull the **Scabs** (two adds on a marked player, every 7) | Pink Slip lands on the top damage dealer at 90%: one is nearly fatal, two are |
| | Healer | Heal the tank back up after each Pink Slip, and everyone after **Shift Bell** (10%, every 5) | The tank can't take the next Pink Slip |
| | Damage | Break the **Payroll Lockbox** (up every 10: the boss takes 75% less while it lives) before its 4-cycle fuse, and the Scabs | It goes off for 30% on everyone, every 4 cycles it lives |
| | Support | SIGINT **Clock In** (a cast every 5: 45% on everyone) | 45% on everyone, every 5 cycles |
| Layoffs (under 50%) | Tank | Pink Slip leaves **Thermal Stress** now (+25% damage taken a stack): Purge it off between busters | The next Pink Slip is a quarter bigger, then half |
| | Healer | Tank healing; cleanse any Layoffs that gets through (Patch, or Purge on yourself) | Layoffs burns everyone until cleansed |
| | Damage | Burn the boss before the enrage at 22, and the Scabs | Mass Layoff |
| | Support | SIGINT **Layoffs** (a cast every 5: if it lands, 8% a cycle on everyone until cleansed) | The whole crew burns, and the healer can only cleanse one a cycle |

## HEATSINK: the healer check

Worm. Integrity ×17 (×15 until bots used Shatter only when it was their biggest hit, and a crew without a healer then outran it), enrages at cycle 25 (THERMAL RUNAWAY). Its Surge goes at whoever holds aggro, its Mirror's Splice at the lowest. Its Replicator sends the workers instead of fragments.

| Phase | Role | Their job | If they don't |
|---|---|---|---|
| Warm loop (100–40%) | Tank | Pull the **Coolant Workers** (two adds on a marked player, every 7, while the Replicator lives) | They chew the marked player, 5% a cycle each |
| | Healer | Heal through **Thermal Spike** (6% on everyone every 3, 1.2% more each time). Top up whoever is marked for **Overheat** (30%, every 5). Cleanse **Coolant Leak** (10% a cycle on a marked player until cleansed, every 4) with Patch, saving Patch when one is coming | A leak never stops: left alone it takes a player in ten cycles, and a new one comes every four |
| | Damage | Break the workers, or the Replicator to stop them for good | The marked player goes down |
| | Support | SIGINT **Fan Stall** (a cast every 8: 6% a cycle on everyone for 4) | 24% on everyone |
| Meltdown (under 40%) | Tank | Take **Core Melt** (40% on whoever holds aggro, every 5) | It lands on a damage dealer |
| | Healer | Thermal Spike every 2. Coolant Leak on two players every 6, and a leak left on 3 cycles spreads to someone else: cleanse fast | Leaks multiply until half the crew is down |
| | Damage | Burn the boss before the enrage at 25 | Thermal Runaway |
| | Support | SIGINT Fan Stall | 24% on everyone |

## COLDWALLET: the damage check, and everyone's

Ghostroot. Integrity ×8, enrages at cycle 18 (LIQUIDATION). Its Surge goes at whoever holds aggro. Its Decoy still mirrors your commands on its beat.

| Phase | Role | Their job | If they don't |
|---|---|---|---|
| Hot wallet (100–50%) | Tank | Taunt and mitigate **Margin Call** (55% on whoever holds aggro, every 4) | A damage dealer takes 55% |
| | Healer | Heal the tank, and everyone after **Gas Fee** (10%, every 4) | Attrition |
| | Damage | Break **Cold Storage** (every 6: a shield of 12% of the boss's Integrity, and every hit lands on it, armor or not) within 3 cycles, around the Decoy's beat | It goes off for 35% on everyone |
| | Everyone | Hit Cold Storage: the tank and the healer too, unless someone is in trouble | Two damage dealers alone don't break it in time |
| | Support | SIGINT **Rug Pull** (a cast every 7: 30% on everyone) | 30% on everyone |
| Bank run (under 50%) | Tank | Margin Call | As above |
| | Healer | Heal through **Encrypted Sectors** (every 6: they eat the next 30% of max Signal of heals on the healer) and have everyone topped up for Withdrawal | Nobody gets healed for a cycle or two |
| | Damage | Break Cold Storage again, and beat the enrage at 18 | Liquidation: a crew with one damage dealer never gets there |
| | Everyone | **Withdrawal** is a cast SIGINT can't stop (30% on everyone, every 5): be topped up and use your defences | 30% on someone who was already low downs them |

## Sim results

`node farmsim.mjs 18 30` (also in docs/BALANCE.md): you (a Demolitionist) and sim crewmates, everyone in blues, 20 seeds, up to 4 tries per boss, everyone rested before a try. A full crew is a Warden, a Sysop and a Payload with you. Each row below it takes one thing away. Boss columns are wins over tries.

| Level | Crew | Foreman | Heatsink | Coldwallet | Cleared | Lowest anyone | Fights someone dips under 40% |
|---|---|---:|---:|---:|---:|---:|---:|
| 18 | Full crew (4) | 20/20 | 20/20 | 20/22 | 20/20 | 20% | 89% |
| 18 | No tank (4) | **10/58** | 20/20 | 20/31 | 10/20 | 7% | 95% |
| 18 | No healer (4) | 20/21 | **14/58** | 20/20 | 14/20 | 5% | 98% |
| 18 | No SIGINT (4) | **0/80** | 20/27 | 20/26 | 0/20 | 3% | 100% |
| 18 | One damage dealer (4) | 5/72 | 16/49 | **0/80** | 0/20 | 2% | 98% |
| 18 | Warden + Sysop (3) | 18/38 | 20/26 | 10/66 | 9/20 | 9% | 94% |
| 18 | Sysop + Payload (3) | 20/31 | 20/20 | 20/21 | 20/20 | 24% | 69% |
| 18 | Warden + Payload (3) | 20/20 | 13/57 | 20/20 | 13/20 | 5% | 97% |
| 18 | Sysop (2) | 13/53 | 20/20 | 19/32 | 12/20 | 16% | 81% |
| 30 | Full crew (4) | 20/20 | 20/20 | 20/21 | 20/20 | 36% | 61% |
| 30 | No tank (4) | **0/80** | 20/20 | 18/37 | 0/20 | 4% | 99% |
| 30 | No healer (4) | 20/21 | **2/78** | 20/20 | 2/20 | 9% | 86% |
| 30 | No SIGINT (4) | **0/80** | 20/33 | 20/21 | 0/20 | 6% | 100% |
| 30 | One damage dealer (4) | 4/76 | 2/75 | **0/80** | 0/20 | 0% | 100% |
| 30 | Warden + Sysop (3) | 15/51 | 17/43 | 19/33 | 12/20 | 8% | 92% |
| 30 | Sysop + Payload (3) | 20/23 | 20/20 | 18/37 | 18/20 | 11% | 90% |
| 30 | Warden + Payload (3) | 20/22 | 9/62 | 20/20 | 9/20 | 12% | 82% |
| 30 | Sysop (2) | 18/34 | 20/25 | 17/45 | 15/20 | 16% | 82% |

- **A full crew** wins 60 of 62 boss tries at 18 and 60 of 61 at 30, and someone in it dips under 40% in 89% of fights at 18 (61% at 30).
- **Take one role away** and the matching boss wins: without the tank the Foreman wins 83% of tries at 18 and all of them at 30; without the healer the Heatsink wins 76% and 97%; without SIGINT the Foreman wins every try; with one damage dealer the Coldwallet wins every try.
- **Crews of two and three** are sized down (72% Integrity and mechanics at 80% for three; 42% and half for two; 3 cycles later to enrage per missing player) and clear the farm with retries, except where they're missing the role a boss checks.
- **Early levels** (farm rows, 20 seeds): a full crew clears every run at levels 8, 10, 12, 13, 14 and 16, nearly without retries (a crew of three at 8 too), and someone dips under 40% in a quarter to nine tenths of fights. From level 10, a crew that never uses SIGINT loses to the Foreman 67 tries in 72. Between 10 and 16 the tank and healer checks are soft on purpose (no Bulkhead or Multicast before 14): at 10 a crew without a tank beats every boss; at 14 it beats the Foreman 19 tries in 35, and a crew without a healer the Heatsink 20 in 26.

## SIGINT

Key 9, `sigint` or `interrupt`, everyone's from level 10.

- It only stops a crew boss's cast while it compiles (*Compiling…* on the boss's row), never an ordinary attack. With nothing compiling it does nothing and says so.
- It's ready every 8 cycles.
- Some casts can't be interrupted (the Coldwallet's Withdrawal).
- An interrupted boss casts its next one a cycle sooner.
- Below level 10 the bosses cast nothing SIGINT would stop.

The bots take turns: whichever crewmate has it ready, support (Operator) first, then damage, then the tank and healer, by name. They never count on you: you're in the rota only when no crewmate has SIGINT ready (that's the sims' planner playing you).

## Soak and isolate: dropped

Soak (a typed command that spends your turn: a big hit split between everyone who soaks) was built and tried as the Coldwallet's Withdrawal, then taken out. With the hit split evenly, soaking and not soaking come to the same total damage, so the only difference is whose turn is lost. In sims the outcome didn't move: a full crew beat the Coldwallet 9 tries in 12 with bots that soaked and 9 in 12 with bots that never did. Tuned so that not soaking is a disaster, it becomes a tax everyone pays every time it shows, the same answer every time (the healthy ones type soak). That's busywork, not a decision. Withdrawal is now a cast SIGINT can't stop: the healer tops everyone up before it lands, and everyone uses their defences.

Isolate (spend your turn to stop a spreading debuff) wasn't built: it would be a second button for what cleansing already does. Coolant Leak spreads instead, so the healer's cleanse is that check.

## Tuning knobs

All in `RAID` (raid.mjs) and the bosses' `raid` data (data.mjs): `scale` (mechanic size by level), `hpScale`, `crewHp` and `crewSize` (by crew size), `enrageLate`, `wipe`, `stress`, `aggroWindow`, `rest` (how long a marked player is spared), `interrupt` (from, cooldown, sooner).
