# Leanings

A server's one positive rule, shown on its card before you connect, that rewards attention in fights. Not built yet:
these are the designer's picks from the prototypes (October 2026).

## The rule for a leaning

**It never favours a class or subclass.** A sim with every class's core kit (levels 3, 5 and 7) and every subclass (18
and 30) showed what passes: a leaning has to be **triggered by the virus's timeline** (a part attacked, an attack lands
now). One triggered by your own damage pattern (spreading, big hits, stripping, crossing ticks) always pays the class
whose kit has that pattern.

## Kept

| Leaning | Rule | Gain, level 7 (Breaker · Bastion · Infiltrator · Operator) |
|---|---|---|
| **Venting** | A part takes 50% more damage on the cycle after it attacks. | 1.9 · 3.1 · 2.3 · 3.1% fewer cycles |
| **Wind-up** | A part takes 25% more damage on the cycle its attack lands. | 1.1 · 4.5 · 3.4 · 4.3% fewer cycles |
| **Brownout** | An attack deals 30% less damage to you when your command aims at its part that cycle. | about 20% less Signal lost for each class (Operator 14%) |

Brownout keys on the part your command **aims at**, not one it hits: Spawn and Deploy deal no damage on their own.

## Cut (don't offer again)

| Leaning | Why |
|---|---|
| Alternating bus (+20% to a part you didn't hit last cycle) | Spread burns earn it for free (Infiltrator 9%, Breaker 1%). Chasing it pulls a Breaker off the right target. |
| Overkill (damage past a part's last point carries on) | Pays big hits (Demolitionist 12–16%, Herder 1–3%). It is also the Demolitionist's edge. |
| Clean clock (Sync Window on half the cycles) | Each class's sync bonus differs: Operator 13%, Bastion 1%. A +25% sync damage version was fair but barely felt. |
| Loud tells (a read staggers a cycle longer) | No tells before level 6. Worth 0–2% after. |
| Bare metal (stripping the last ◆ leaves a part Open), Clean cut (an interrupt leaves it Open), a third interrupt tick | Helpers strip ◆ and cross ticks for free: Operator outlier each time. |

## The look

- **Server card:** a small table under the level: **Server** (its kind, site and quirk, as outlined tags) beside
  **Leaning** (one filled amber tag with its icon). The tooltip: the name, *Server leaning*, the rule, then the muted ▸
  answer.
- **Fight header:** a *Leaning* row under Status, like Gear: the chip names the leaning and counts what it has paid this
  fight (`Venting | +46`). It's lit amber on a cycle it pays. Its tooltip adds the paid amount as an icon chip.
- **Board:** on the cycle it pays, a filled amber tag with the leaning's icon and number sits beside that part's name
  (after its ◆). Nothing shows ahead of time. On a long name with full armor the tag wraps under the name.

Amber throughout: a leaning is something you use, not yours (teal) or a threat (red).
