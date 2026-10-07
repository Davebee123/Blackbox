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
// damage 0 with a number in the help: breaker.mjs deals it (it depends on armor, Momentum or a timer).
// cost: Signal (Integrity at home) the skill spends. charge/bomb/blast/stack/rot: breaker.mjs's numbers.
export const abilities = {
  // Demolitionist: armor and area.
  'shaped-charge': {
    cls: 'breaker', sub: 'demolitionist', verb: 'debuff', name: 'Shaped Charge', target: 'part', damage: 0, strip: 99, bareHit: 30, cooldown: 5, icon: 'shell-shield',
    short: 'Strip all ◆ at once',
    help: 'shaped-charge <part> — breaks every ◆ on it at once. On a part with no armor left, it deals 30 damage instead.',
    desc: 'Blow the casing off a part, breaking every armor chit on it at once. On a part with no armor left, it deals 30 damage instead.',
  },
  'logic-bomb': {
    cls: 'breaker', sub: 'demolitionist', verb: 'hit', name: 'Logic Bomb', target: 'part', damage: 0, bomb: 50, blast: 20, fuse: 2, cooldown: 4, icon: 'event-warning',
    short: 'Bomb 50, +20 to all, in 2',
    help: 'logic-bomb <part> — plants a bomb that goes off 2 cycles later, dealing 50 damage to it and 20 to every other part. If that part breaks first, the bomb goes off on the next one.',
    desc: 'Plant a bomb in a part. Two cycles later it goes off, dealing 50 damage to that part and 20 to every other part. If the part breaks first, the bomb goes off on the next one.',
  },
  'chain-reaction': {
    cls: 'breaker', sub: 'demolitionist', verb: 'buff', name: 'Chain Reaction', target: 'none', damage: 0, cycles: 3, blast: 20, cooldown: 6, icon: 'expand',
    short: 'Breaks hit every part 20',
    help: 'chain-reaction — for 3 cycles, every part you break hits every other part for 20. A part that breaks from it sets off the next blast.',
    desc: 'For 3 cycles, every part you break blows up and deals 20 damage to every other part. A part broken by the blast sets off a blast of its own.',
  },
  'bit-rot': {
    cls: 'breaker', sub: 'demolitionist', verb: 'debuff', name: 'Bit Rot', target: 'part', damage: 0, cycles: 4, strip: 1, cooldown: 5, icon: 'mutation',
    short: '−1 ◆ a cycle, no patching',
    help: 'bit-rot <part> — for 4 cycles it loses a ◆ at the end of each of your turns, and it can\'t patch any back.',
    desc: 'Rot a part\'s casing. For 4 cycles it loses an armor chit at the end of each of your turns, and it can\'t patch any back while it rots.',
  },
  // Overclocker: one big target, run hot.
  overvolt: {
    cls: 'breaker', sub: 'overclocker', verb: 'buff', name: 'Overvolt', target: 'none', damage: 0, cycles: 3, cost: 6, cooldown: 4, icon: 'overload',
    short: 'Next Overload hits twice',
    help: 'overvolt — your next Overload in the next 3 cycles hits twice. It costs you 6 Signal (Integrity at home).',
    desc: 'Push more voltage through your next Overload, so it hits twice if you fire it within the next 3 cycles. It costs you 6 Signal, or 6 Integrity at home.',
  },
  'thermal-throttle': {
    cls: 'breaker', sub: 'overclocker', verb: 'hit', name: 'Thermal Throttle', target: 'part', damage: 0, pierceAt: 2, base: 20, perStack: 20, cooldown: 3, icon: 'overload',
    short: 'Spend Momentum: 20 +20 a stack',
    help: 'thermal-throttle <part> — needs Momentum and spends all of it. It deals 20 damage plus 20 for each stack spent, and with 2 or more stacks it goes straight through armor.',
    desc: 'Dump all your heat into one part. It needs Momentum and spends every stack, dealing 20 damage plus 20 for each stack spent. With 2 or more stacks it goes straight through armor.',
  },
  'stack-smash': {
    cls: 'breaker', sub: 'overclocker', verb: 'hit', name: 'Stack Smash', target: 'part', damage: 30, repeats: 3, cooldown: 3, icon: 'spike',
    short: 'Hit 30, crits hit again',
    help: 'stack-smash <part> — 30 damage. Each crit hits it again, up to 3 more times.',
    desc: 'Smash a part\'s stack for 30 damage. Every critical hit hits it again, up to 3 more times.',
  },
  'turbo-boost': {
    cls: 'breaker', sub: 'overclocker', verb: 'buff', name: 'Turbo Boost', target: 'none', damage: 0, cycles: 3, gain: 2, cost: 6, cooldown: 5, icon: 'behavior',
    short: '+2 Momentum, costs 6',
    help: 'turbo-boost — gain 2 Momentum stacks that last 3 cycles. It costs you 6 Signal (Integrity at home).',
    desc: 'Run past the safe clock. You gain 2 Momentum stacks that last 3 cycles, and it costs you 6 Signal, or 6 Integrity at home.',
  },
};

export const subs = {
  demolitionist: {
    name: 'Demolitionist', role: ['DPS', 'Armor', 'Area'], idea: 'Bring the whole thing down.', solo: 'Strips armor fast and hits every part.', crew: 'Opens every part for the crew.',
    edge: { legacy: true, name: 'Overkill', rule: 'When your hit breaks a part, the damage left over spills onto the next part (up to 20).' },
    skills: ['shatter', 'fork-bomb', 'shaped-charge', 'thermal-runaway', 'logic-bomb', 'chain-reaction', 'bit-rot', 'zero-day'],
    fillers: [
      [f('armor-cracker', 'Armor Cracker', 'Parts you strip take 1 cycle longer to patch per rank.', 1), f('blast-radius', 'Blast Radius', 'Fork Bomb, Logic Bomb and Chain Reaction deal 10% more per rank.', 0.1)],
      [f('overclocked', 'Overclocked Core', '+3% damage per rank.', 0.03), f('shrapnel', 'Shrapnel', 'Shatter deals 8% more per rank.', 0.08)],
      [f('failsafe', 'Failsafe', 'Take 3% less damage from attacks per rank.', 0.03), f('deep-burn', 'Deep Burn', 'Thermal Runaway burns 2 more a tick per rank.', 2)],
    ],
    talents: [
      [t('cluster-charge', 'Cluster Charge', 'Shaped Charge also breaks 2 ◆ on every other part.'), t('exposed-wiring', 'Exposed Wiring', 'A part that loses its last ◆ is Exposed for your next 2 cycles.')],
      [t('cascade-failure', 'Cascade Failure', 'Your first break each fight resets your cooldowns.'), t('meltdown', 'Meltdown', 'Thermal Runaway also burns every other part at half strength.')],
      [t('total-overkill', 'Total Overkill', 'Overkill spills onto every other part, not just the next one.'), t('scorched-earth', 'Scorched Earth', 'No part patches its ◆ back while you\'re in the fight.')],
    ],
  },
  overclocker: {
    name: 'Overclocker', role: ['DPS', 'Burst'], idea: 'Run it hot until something melts.', solo: 'The biggest single hits in the game.', crew: 'Deletes the part that matters.',
    edge: { name: 'Redline', rule: 'Momentum stacks to 5, but you take 10% more damage while you have any.', max: 5, taken: 1.1 },
    skills: ['overvolt', 'segfault', 'thermal-throttle', 'brace', 'stack-smash', 'sudo', 'turbo-boost', 'zero-day'],
    fillers: [
      [f('heat-sink', 'Heat Sink', 'Overload +4 damage per rank.', 4), f('chain-exploit', 'Chain Exploit', 'Momentum +2% per stack per rank.', 0.02)],
      [f('exploit-kit', 'Exploit Kit', 'Exposed gives +5% more crit chance per rank.', 5), f('core-voltage', 'Core Voltage', 'Segfault and Stack Smash deal 8% more per rank.', 0.08)],
      [f('heat-spreader', 'Heat Spreader', 'Momentum lasts 1 cycle longer per rank.', 1), f('liquid-cooling', 'Liquid Cooling', 'Overvolt and Turbo Boost cost 2 less per rank.', 2)],
    ],
    talents: [
      [t('hair-trigger', 'Hair Trigger', 'Overload has cooldown 2 but deals 35.'), t('feedback-loop', 'Feedback Loop', 'Every crit you land adds a Momentum stack.')],
      [t('core-dump', 'Core Dump', 'Segfault\'s execute starts under 40%.'), t('burn-in', 'Burn-in', 'Thermal Throttle spends only half your Momentum stacks.')],
      [t('unsafe-mode', 'Unsafe Mode', '+30% damage dealt, +20% damage taken.'), t('critical-heat', 'Critical Heat', 'With 4 or more Momentum stacks, every hit you land crits.')],
    ],
  },
};
