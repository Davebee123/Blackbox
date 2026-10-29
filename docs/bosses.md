# Crew bosses: the review sheet

KESSLER-FARM-00's three crew bosses (`dist/raid.mjs`). Built: the rules, each phase and each role's job are in
GAME_RULES.md "Bosses". This sheet keeps what a missed job costs, what was dropped and why, and the tuning knobs.
The sim results are in docs/BALANCE.md (`node farmsim.mjs 18 30`).

## What a missed job costs

| Boss | The check | The job | If missed |
|---|---|---|---|
| THE FOREMAN | Tank | Taunt and Bulkhead **Pink Slip** (90% on whoever holds aggro, every 6) | It lands on the top damage dealer: one is nearly fatal, two are |
| | Support | SIGINT **Clock In** (45% on everyone, every 5) and, under 50%, **Layoffs** | 45% on everyone; Layoffs burns the whole crew until cleansed |
| | Damage | Break the **Payroll Lockbox** before its fuse | 30% on everyone every 4 cycles it lives |
| HEATSINK | Healer | Cleanse **Coolant Leak**, saving Patch for it; under 40% it spreads if left 3 cycles | A leak takes a player in ten cycles, and leaks multiply |
| | Tank | Pull the **Coolant Workers**; take **Core Melt** under 40% | They chew the marked player; Core Melt lands on a damage dealer |
| COLDWALLET | Damage, everyone | Break **Cold Storage** within 3 cycles, around the Decoy's beat | 35% on everyone; two damage dealers alone don't break it in time |
| | Everyone | Be topped up for **Withdrawal** (30% on everyone, no SIGINT) | 30% on someone already low downs them |
| All three | Damage | Beat the enrage (cycle 22, 25, 18) | Everyone is hit every cycle |

In the sims, taking one role away hands its boss the fight: no tank, the Foreman; no healer, the Heatsink; no SIGINT,
the Foreman; one damage dealer, the Coldwallet.

## Soak and isolate: dropped

**Soak** (spend your turn to split a big hit between everyone who soaks) was built and taken out. Split evenly, soaking
and not soaking come to the same total, so the only difference is whose turn is lost; tuned so that not soaking is a
disaster, it becomes a tax everyone pays the same way every time. Withdrawal is now a cast SIGINT can't stop.

**Isolate** (spend your turn to stop a spreading debuff) wasn't built: it would be a second button for what cleansing
already does. Coolant Leak spreads instead, so the healer's cleanse is that check.

## Tuning knobs

All in `RAID` (raid.mjs) and the bosses' `raid` data (data.mjs): `scale` (mechanic size by level), `hpScale`, `crewHp`
and `crewSize` (by crew size), `enrageLate`, `wipe`, `stress`, `aggroWindow`, `rest` (how long a marked player is
spared), `interrupt` (from, cooldown, sooner).
