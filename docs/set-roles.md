# What each set is for

Every set has one reason to wear it: its *why*, the answer line of its tooltip (content/sets.mjs `why`, shown by
view.mjs setLines). Its bonuses and pieces lean into that reason, and its numbers were tuned (November 2026) so it pays
most there and stays a sidegrade elsewhere. `node setsim.mjs` measures it.

## How it's measured

Each set worn whole in place of the blues in its slots, at the top of its level band (every piece at that level, as set
tuning wears them), on the eight subclasses:

- **Niche:** the subclasses it is for (*Who*), in its situation (*Where*): the change in Integrity a fight costs, in
  points of your max (negative is easier).
- **Rest:** every other subclass on the generic fights (balance.mjs score). For a set for everyone, the generic fights.

The aim: the niche at −4 or better, the rest between −4 and +4. The bots don't play every situation; where they can't
show a set's reason, *Bots* says why, and the designer's play decides.

| Set | Lv | Why | Who | Where | Niche | Rest | Bots |
|---|---|---|---|---|---:|---:|---|
| Wrecking Crew | 50 | Chain breaks as a Breaker | Demolitionist, Overclocker | any fight | -7.0 | -5.7 | Operators gain more (their payload blues are weak against level-50 damage pieces) |
| Strongbox | 50 | Take the biggest hits as a Bastion | Warden, Sysop | elites (long fights) | -12.9 | -1.4 |  |
| Palemask | 50 | Finish off parts below half as an Infiltrator | Phantom, Payload | any fight | +0.3 | -6.4 | the Infiltrator bots gain nothing: Weak Spot and the 4-piece crit trip their planner |
| Load Balanced | 50 | Keep helpers out as an Operator | Herder, Hijacker | any fight | -12.9 | +0.6 |  |
| LOWLIGHT Kit | 1–22 | Hold wick's contracts while you level | Everyone | holding 3 contracts | -6.6 | -2.8 |  |
| Boot Disk | 1–3 | Wear it on your first servers | Everyone | any fight | -7.4 | -7.4 |  |
| Hive Mind | 6–15 | Level a burn or helper build | Payload, Herder | any fight | -10.7 | -2.8 |  |
| Kestrel Clearance | 7–7 | Answer tells, and survive the one big hit | Everyone | any fight | -5.2 | -5.2 |  |
| Night Shift | 8–15 | Chain fights without resting | Everyone | unrested, starting at 65% Integrity | -13.9 | -6.1 |  |
| Choirbook | 10–16 | Jam and delay as a Hijacker or Warden | Hijacker, Warden | any fight | -5.5 | -0.4 |  |
| Patchwork | 10–15 | Use every key on your bar | Everyone | any fight | -9.1 | -9.1 |  |
| Lantern Route | 12–15 | Farm caches and vaults for credits | — | out of a fight | — | — |  |
| Glass Ceiling | 14–23 | Fight below half Integrity | Everyone | starting at 45% Integrity | -10.0 | -0.8 |  |
| On-Call | 18–26 | Heal through long fights as a Sysop | Sysop | unrested, starting at 65% Integrity | -11.0 | +3.3 |  |
| Cold Storage | 19–25 | Stay above 75% Integrity | Everyone | any fight | -7.7 | -7.7 |  |
| Overtime | 22–28 | Outlast long fights against elites and bosses | Everyone | elites (long fights) | -4.0 | -0.8 |  |
| Burst Buffer | 25–31 | Open every fight with crits | Overclocker, Phantom | any fight | -5.4 | +1.1 |  |
| Hot Spare | 28–32 | Recover the first time you drop low | Everyone | starting at 45% Integrity | -4.2 | -0.8 |  |
| Mesh | 31–37 | Play in a crew | Everyone | with two crewmates | -6.4 | +3.7 |  |
| Deep Archive | 37–43 | Save your biggest skill for every 4th cycle | Everyone | any fight | -4.7 | -4.7 |  |
| Switchback | 8–14 | Strike on the cycle after a delay lands | Warden, Hijacker | any fight | -6.7 | +0.9 |  |
| Cold Start | 19–25 | Win before the parts get going | Everyone | any fight | -6.3 | -6.3 |  |
| Bootloader | 31–37 | Fire your whole bar early in a fight | Everyone | any fight | +0.1 | +0.1 | the bots barely feel a shorter first cooldown |
| Atoll | 43–49 | Close out the last part | Everyone | any fight | -0.6 | -0.6 | bot fights end fast once one part is left |
| Full Coverage | 26–37 | Explore rooms you haven't cleared | Everyone | in a room you haven't cleared | -7.5 | -0.7 |  |
| Long Haul | 10–24 | Level fast on contracts | — | out of a fight | — | — |  |
| Tenure | 33–48 | Fight on servers you hold | Everyone | on a server you hold | -4.8 | +0.5 |  |
| Bedrock | 43–49 | Survive the hit that would end you | Everyone | starting at 45% Integrity | -3.1 | -0.7 | the bots rarely take the killing hit it saves |
| Catchment | 37–44 | Break part after part in big viruses | Everyone | any fight | -2.8 | -2.8 | a little under the general band |
| Fine Print | 26–32 | Tank the tells you can't answer, as a Bastion | Warden, Sysop | elites (long fights) | -11.3 | -3.0 |  |
| Contiguous | 27–31 | Focus one part until it breaks, as a Phantom | Phantom | any fight | -10.2 | +0.9 |  |
| Crypter | 26–31 | Strip ◆, then crit, as a Phantom | Phantom | any fight | -9.9 | +1.9 |  |
| Domain Admin | 32–37 | Break parts to shorten your cooldowns as an Operator | Herder, Hijacker | any fight | -6.9 | -0.6 |  |
| Semaphore | 33–37 | Delay attacks, then punish the Open part | Warden, Hijacker | any fight | 0.0 | +0.2 | the bots rarely delay |
| Hidden Process | 32–36 | Burn the parts you can't hit, as a Payload | Payload | any fight | -3.0 | -4.8 | the Payload bot gains a little less than the rest |
| Watertight | 34–38 | Weather the big hits of elites | Everyone | elites (long fights) | -4.3 | -2.4 |  |
| Smash and Grab | 38–42 | Steal the shields of Buffers and Bodyguards | Everyone | parts that shield (Bodyguards, Buffers) | -10.6 | +1.5 |  |
| Payroll | 39–43 | Heal steadily without a healer's skills | Everyone | any fight | -4.2 | -4.2 |  |
| Backbone | 38–44 | Hit several parts at once | Demolitionist | any fight | -2.5 | -0.9 | few bot skills reach several parts |

## What the tuning changed

- **Flat bonuses moved into the reason.** Wrecking Crew (2) and (3) work while you hold Momentum; Night Shift (2) and the
  Thermos while you haven't rested; Cold Storage (2) above 75%; Hidden Process (2) and Palemask (2) on burns; Domain
  Admin (2) on a part with no ◆; Backbone (2) for each part standing.
- **Sets that were a must-wear for everyone** came down: Night Shift (−14 on every subclass), Boot Disk, Patchwork, Cold
  Storage, Cold Start (3) now delays only the fight's first attack.
- **Class sets carry their class's stats.** The four tier sets' pieces, and Domain Admin's, Semaphore's, Backbone's and
  Hidden Process's, carry the two stats their subclasses chase, so a set for a class doesn't cost it the stats its blues
  gave.
- **Sets that were weak in their niche** came up: Bootloader, Domain Admin, Semaphore, Watertight, Tenure, Payroll,
  Backbone, Atoll, Bedrock, Hot Spare, Overtime, Catchment.
- **Who a set is for, where the numbers said otherwise:** Domain Admin is the Operators' (they gain most from break-driven
  cooldowns), Crypter and Contiguous the Phantom's.
