# Networks: what's left

Every player's network has a signature rolled from its seed: a name, a family lean, a native strain, a native boss and
its lair, 3 to 5 native uniques, two favoured event cards and a rich code. Built (`dist/network.mjs`); the rules are
in GAME_RULES.md "Networks". Left: paired lairs, the top band's spread, and real members' seeds.

## Paired lairs (proposed, not built)

When two merged networks have native bosses of different families, the trunk opens a crossover lair at Backbone size
(8 servers): a boss built from both templates, one third part from each, both signature charges, phases from both. It
drops a native from each network (each at `BOSS_LOOT`'s odds, with its own pity) and rolls once on a short list of
*paired* natives that only exist as a pair (a Mutex-and-C2 unique for DEADBOLT with BACK ORIFICE). It needs a boss
built from two specs in `createVirus`, a pairing table (one per family pair: 3), and a few paired natives.

**The call:** build them, or keep merges equal? Paired lairs make some merges better than others.

## The top band

Seven of the 27 natives are in the 29–40 band, so Mirror Maze is native to almost a third of networks. One or two
more natives there would spread it.

## Simulated members' seeds

A simulated member's network comes from their handle, so `nyx` has the same network for everyone. Real members will
bring the seed on their save.
