# Legends and Epoch items

**Status.** Talked through with the designer, November 2026. Decided: legends (very rare, very strong, endgame), the
name *Epoch*, trading later, and uncapping is fine for a legend. The rest is proposed. Built on the bench only: all 27
in `dist/legends.mjs`, off until the legends simulation registers them; none drops.

## Why

Native uniques (GAME_RULES.md "Networks") are sidegrades, and native bosses aren't exclusive: floors 2 and 3 draw their
lairs from pools of 5 and 3, so a player meets most native bosses on their own network. A seed gives friends little
reason to visit. Legends do.

## Legends (decided)

Items like Diablo 2's Shako, Windforce and Thunder God's Vigor: a fixed name and rule, strong enough to build around,
rare enough that a drop is a story.

- **Endgame:** levels 45–50.
- **Very rare,** with a pity kept per network like the boss tables', so every kill on a friend's lair counts toward
  that network's legend.
- **What they buy:** faster farming in the 45–50 band, and a push deeper into the flash ranks (docs/content.md 4.2).
- **The one exception** to docs/loot-plan.md's "modest on their own".

## Two kinds (proposed)

| Kind | Like | Drops |
|---|---|---|
| **Build legend** | Windforce, Thunder God's Vigor: one build is made around it | Native: three per class, and each seed rolls one per class, from its native boss in the floor 8 lair. Your network holds one for your class; friends' networks hold the other two |
| **Universal legend** | The Shako: every class wants it | Anywhere in the band at the same odds, so no seed is better for everyone |

The floor 8 lair holds your native boss, and none is built yet (GAME_RULES.md "Lairs and native bosses"), so build
legends come after floor 8's bosses.

## First draft

Each pays off only once set up. None ignores ◆, tells or the one-delay rule, so a blind player still loses.

| Legend | For | What it does | The play it makes |
|---|---|---|---|
| **Flashover** | Breaker | Overload always crits a part with no ◆ | A crit resets Overload, so a bare part takes one every cycle until it patches |
| **Avalanche** | Demolitionist | Overkill has no cap, and a part it breaks spills its leftover again | Strip every part, then one big hit runs through the virus |
| **Positive Feedback** | Overclocker | Each ◆ you break refreshes your Momentum | Redline's 5 stacks stay up; armor left on a part is fuel |
| **Bounce Message** | Bastion | When Firewall soaks a whole hit, Retaliate fires that cycle for free | Firewall timed to the hit is your biggest damage |
| **Stress Test** | Warden | Blowback has no cap, and a charged attack counts double toward it | A charge is a choice: cut it, or take it into Harden or Circuit Breaker and send it back |
| **Headroom** | Sysop | Overprovision has no cap. Each hit spends up to 10 shield to deal that much more | Heals become shields, shields become damage: the healer fights alone |
| **First Light** | Infiltrator | Each part you break opens a Surprise window on your next cycle | Breaks timed for Surprise's bonuses, several times a fight |
| **Reinfection** | Payload | Up to 3 Injects on a part, each on its own clock. Inject cools a cycle slower | Stack three, then Detonate or Thrash |
| **Dead Angle** | Phantom | Each attack that misses you makes Weak Spot fresh on every part | Evasion, Null Route, Vanish and Shadow Copy all feed it |
| **Wakeup Call** | Operator | When a helper expires, each of your daemons acts again (once a cycle) | A daemon build on the extra thread |
| **Quine** | Herder | An expiring helper starts a copy of itself at half damage. Copies don't copy | About half again more helper damage; Last Gasp and Kill Switch count the copies |
| **Crossed Wires** | Hijacker | A Jammed part's next attack lands on the virus's other parts instead of you (half on a boss) | Jam the part whose tell is coming |
| **SIGKILL** | Universal | SIGINT is ready every 5 cycles | More casts and charges stopped |
| **Third Rail** | Universal | Every part has a third interrupt tick, at 75% | One more cut a part |
| **Perfect Pitch** | Universal | Sync Windows open twice as often | Each class's Sync bonus, twice as often |

Twelve more, three a class:

| Legend | For | What it does |
|---|---|---|
| **Patch Gap** | Demolitionist | Zero-Day readies again each time a part breaks |
| **Detonator Cord** | Demolitionist | Logic Bomb plants on every part at once, and they go off together |
| **Red Zone** | Overclocker | Segfault on a part winding up a charge readies again at once |
| **Rate Card** | Bastion | Throttle stacks: each Rate Limit halves the part's next attack again |
| **Flatline** | Warden | Below a quarter of your Signal, Failover has no cooldown |
| **Bleach** | Sysop | Scrub also bleaches a part: clears its buffs and casts, and its ◆ can't patch for 3 cycles |
| **Long Tail** | Infiltrator | Implant is once a part instead of once a fight |
| **Pressure Cooker** | Payload | Detonate leaves the burns running |
| **Knife Edge** | Phantom | A Backstab crit makes Weak Spot fresh on its part |
| **Ulimit** | Operator | No helper cap |
| **Cron Farm** | Herder | Crontab runs on every part at once; a new one doesn't replace the last |
| **Instant Replay** | Hijacker | Replay plays back the last tell that hit you, at double |

## First simulation (November 2026)

Level 50, Bedrock's band, the planner, the same seeds with and without; the legend keeps the replaced item's stats.
Cycles change (normal / elite / boss) and Signal lost. Bosses: the six built ones; INIT and floors 6–8 have none yet.

| Strong | Cycles | Signal lost | On bosses |
|---|---|---|---|
| Quine | −27 / −27 / −30% | −11% | REPO MAN 0 → 7 of 10 |
| Avalanche | −13 / −17 / −24% | −22% | RELAY-KING −44% cycles |
| Stress Test | −10 / −20 / −13% | −50% | REPO MAN and BACK ORIFICE 0 → 9 |
| Crossed Wires | −3 / 0 / −14% | −31% | DEADBOLT 1 → 9 |
| Flashover (Demolitionist) | −11 / −13 / −14% | −13% | REPO MAN 0 → 9 |
| Patch Gap, Detonator Cord | about −8 / −8 / −17% | −16% | HOLLOW CHOIR 0 → 9 (Detonator Cord) |

- **No boss went trivial.** Over 40% fewer cycles: Avalanche on RELAY-KING and BACK ORIFICE, Quine on BACK ORIFICE.
- **Not set up by the planner** (untested, not weak): SIGKILL, Pressure Cooker, Ulimit, Rate Card, Flatline, Long
  Tail on the Payload. Near zero: Red Zone, Positive Feedback, Knife Edge, Dead Angle, Cron Farm, Bounce Message,
  Headroom. Reinfection is a net loss (its slower Inject costs more than the stacks).
- **Bleach** does little on bosses: the solo bosses never cast. The Sysop wins no level-50 boss either way.
- Next: the designer plays them on the bench.

## Epoch items (name decided)

The flash ranks drop **Epoch** versions of uniques and set pieces, legends included: *Epoch Stress Test*, *an Epoch
set*. An epoch is Unix's time zero and a layer of rock; each flash rank reflashes an older layer of Bedrock.

- **Same rule, bigger numbers** (proposed): rolled at the rank's item level (51–55), so a legend found at 48 is still
  worth its slot at rank 7, and the hunt goes on after the first find.
- **Dated** (proposed): the tooltip's muted last line dates the item's layer on the Cascade calendar (*C−7*), older
  for deeper ranks (docs/lore.md: each rank says how old its orphans are).
- **One word for uniques and sets**, and no colour of its own (amber is loot). The tag's look is picked from two or
  three screenshots.

## Testing

1. **Bench only:** the legends as items that never drop, a dev command to hand one out (none exists yet), a unit test
   each.
2. **The designer plays them** in the Arena bench (`/?bench=arena&as=warden&level=50`) against the deep bosses and
   the three-act bosses. That play is the bar.
3. **A simulation as an alarm, never for tuning:** the planner with and without each legend; flag one that halves a
   boss's cycles or lets a bot win without reading tells. Once flash ranks exist, it also counts the ranks each legend
   adds, aiming at about the same for all so no seed is luckier; until then, levels 51–55 with heat.mjs's modifiers
   stand in. The planner doesn't set legends up, so it understates them.

## Open calls

- Is a legend worth breaking a set for? Bedrock's uniques sit "below a full set". Proposed: yes.
- The friends' ladder (docs/coop.md): crew clears with solo ones, or apart?
- Trading comes later. Proposed then: bind on equip, so an unworn legend can go to a friend once.
