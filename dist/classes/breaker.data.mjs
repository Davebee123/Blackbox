// Breaker subclasses: Demolitionist and Overclocker. Data only (no engine imports): the skills they add to
// ABILITIES, and each subclass's skill line, edge and talent tree. The engine side (what new skills do,
// talents, the edge, how the planner plays them) lives in ./breaker.mjs.
//
// A subclass is picked at level 10 (`subclass <id>`; switching is free, at home). Its skill line unlocks
// at SUB_UNLOCKS in data.mjs, in the order written here (up to 8). Its talent tree has the same shape as
// before: three filler rows of two ranked nodes, and three tiers of two picks.
// edge.legacy: the class's old edge (EDGE in data.mjs), now this subclass's.
import { f, t } from './kit.mjs';

// New skills (ABILITIES entries, same fields as data.mjs). Give each a cls and a sub.
export const abilities = {};

export const subs = {
  demolitionist: {
    name: 'Demolitionist', role: ['DPS', 'Armor', 'Area'], idea: 'Bring the whole thing down.', solo: 'Strips armor fast and hits every part.', crew: 'Opens every part for the crew.',
    edge: { legacy: true, name: 'Overkill', rule: 'When your hit breaks a part, the damage left over spills onto the next part (up to 20).' },
    skills: ['shatter', 'fork-bomb', 'thermal-runaway', 'zero-day'],
    fillers: [
      [f('armor-cracker', 'Armor Cracker', 'Parts you strip take 1 cycle longer to patch per rank.', 1), f('exploit-kit', 'Exploit Kit', 'Exposed gives +5% more crit chance per rank.', 5)],
      [f('heat-sink', 'Heat Sink', 'Overload +4 damage per rank.', 4), f('failsafe', 'Failsafe', 'Take 3% less damage from attacks per rank.', 0.03)],
      [f('overclocked', 'Overclocked Core', '+3% damage per rank.', 0.03), f('chain-exploit', 'Chain Exploit', 'Momentum +2% per stack per rank.', 0.02)],
    ],
    talents: [
      [t('sharp-exploit', 'Sharp Exploit', 'Exploit also deals 20 damage.'), t('piercing', 'Piercing', 'Your first Overload each fight goes straight through armor.')],
      [t('core-dump', 'Core Dump', 'Segfault\'s execute starts under 40%.'), t('hair-trigger', 'Hair Trigger', 'Overload has cooldown 2 but deals 35.')],
      [t('cascade-failure', 'Cascade Failure', 'Your first break each fight resets your cooldowns.'), t('unsafe-mode', 'Unsafe Mode', '+30% damage dealt, +20% damage taken.')],
    ],
  },
  overclocker: {
    name: 'Overclocker', role: ['DPS', 'Burst'], idea: 'Run it hot until something melts.', solo: 'The biggest single hits in the game.', crew: 'Deletes the part that matters.',
    edge: { name: 'Redline', rule: 'Momentum stacks to 5, but you take 10% more damage while you have any.' },
    skills: ['brace', 'segfault', 'sudo', 'zero-day'],
    fillers: [
      [f('heat-sink', 'Heat Sink', 'Overload +4 damage per rank.', 4), f('chain-exploit', 'Chain Exploit', 'Momentum +2% per stack per rank.', 0.02)],
      [f('exploit-kit', 'Exploit Kit', 'Exposed gives +5% more crit chance per rank.', 5), f('failsafe', 'Failsafe', 'Take 3% less damage from attacks per rank.', 0.03)],
      [f('overclocked', 'Overclocked Core', '+3% damage per rank.', 0.03), f('armor-cracker', 'Armor Cracker', 'Parts you strip take 1 cycle longer to patch per rank.', 1)],
    ],
    talents: [
      [t('hair-trigger', 'Hair Trigger', 'Overload has cooldown 2 but deals 35.'), t('sharp-exploit', 'Sharp Exploit', 'Exploit also deals 20 damage.')],
      [t('core-dump', 'Core Dump', 'Segfault\'s execute starts under 40%.'), t('piercing', 'Piercing', 'Your first Overload each fight goes straight through armor.')],
      [t('unsafe-mode', 'Unsafe Mode', '+30% damage dealt, +20% damage taken.'), t('cascade-failure', 'Cascade Failure', 'Your first break each fight resets your cooldowns.')],
    ],
  },
};
