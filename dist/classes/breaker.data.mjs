// Breaker subclasses: Demolitionist and Overclocker. Data only (no engine imports): the skills they add to
// ABILITIES, and each subclass's skill line, edge and talent tree. The engine side (what new skills do,
// talents, the edge, how the planner plays them) lives in ./breaker.mjs.
//
// A subclass is picked at level 10 (`subclass <id>`; switching is free, at home). Its skill line unlocks
// at SUBCLASS.unlocks in data.mjs (levels 10 to 38), in the order written here (eleven skills). Its talent tree has the same shape as
// before: three filler rows of two ranked nodes, and three tiers of two picks.
// edge.legacy: the class's old edge (EDGE in data.mjs), now this subclass's.
import { f, t } from './kit.mjs';

// New skills (ABILITIES entries, same fields as data.mjs). Give each a cls and a sub.
// damage 0 with a number in the help: breaker.mjs deals it (it depends on armor, Momentum or a timer).
// cost: Signal (Integrity at home) the skill spends. charge/bomb/blast/stack/rot: breaker.mjs's numbers.
// scales: the fields breaker.mjs grows with your level, so the text on screen grows with them (view.mjs scaledText).
export const abilities = {
  // Demolitionist: armor and area.
  'shaped-charge': {
    cls: 'breaker', sub: 'demolitionist', verb: 'debuff', name: 'Shaped Charge', target: 'part', damage: 0, strip: 99, bareHit: 30, provoke: 1, scales: ['bareHit'], cooldown: 5, icon: 'shell-shield',
    short: 'All ◆ off; it lashes out',
    help: 'shaped-charge <part> — Breaks every ◆ on the target at once. The part lashes out, and its next attack comes a cycle sooner. Deals 30 damage instead to a part with no armor.',
    desc: 'Blow the casing off a part, breaking every armor chit on it at once. The part lashes out: its next attack comes a cycle sooner, so blow it when that attack is still far off. On a part with no armor left, it deals 30 damage instead.',
  },
  'logic-bomb': {
    cls: 'breaker', sub: 'demolitionist', verb: 'hit', name: 'Logic Bomb', target: 'part', damage: 0, bomb: 50, blast: 20, scales: ['bomb', 'blast'], fuse: 2, cooldown: 5, icon: 'event-warning',
    short: 'Bomb 50 +20 all in 2',
    help: 'logic-bomb <part> — Plants a bomb that goes off 2 cycles later, dealing 50 damage to the target and 20 to every other part. A part it breaks can\'t reboot, and a Tripwire it breaks stays quiet.',
    desc: 'Plant a bomb in a part. Two cycles later it goes off, dealing 50 damage to that part and 20 to every other part. Whatever it breaks goes down for good: a twin can\'t reboot it, and a Tripwire caught in it never trips. If the part breaks first, the bomb goes off on the next one.',
  },
  'chain-reaction': {
    cls: 'breaker', sub: 'demolitionist', verb: 'hit', name: 'Chain Reaction', target: 'part', damage: 40, chits: 2, cycles: 3, blast: 30, scales: ['blast'], cooldown: 5, icon: 'expand',
    short: '40 damage; blows if it breaks',
    help: 'chain-reaction <part> — Deals 40 damage to the target, or breaks 2 ◆ on an armored one, and wires it for 3 cycles. If it breaks while wired, it explodes for 30 damage to every other part, and a part the blast breaks explodes too.',
    desc: 'Wire a part to blow. It takes 40 damage now, or loses 2 ◆ if it wears armor, and if it breaks in the next 3 cycles it blows up and hits every other part for 30. A part the blast breaks blows up as well, so a swarm of fragments goes up in one chain.',
  },
  'bit-rot': {
    cls: 'breaker', sub: 'demolitionist', verb: 'debuff', name: 'Bit Rot', target: 'part', damage: 25, chits: 2, cycles: 4, strip: 1, more: 0.2, cooldown: 5, icon: 'mutation',
    short: '25 damage; rots, +20% taken',
    help: 'bit-rot <part> — Deals 25 damage, or breaks 2 ◆ on an armored part, and rots the target for 4 cycles. A rotting part takes 20% more damage from you, loses a ◆ at the end of each of your turns and can\'t patch armor back. A seal it lands while rotting fails.',
    desc: 'Rot a part. It takes 25 damage now, or loses 2 ◆ if it wears armor. For 4 cycles it takes 20% more from you, loses an armor chit at the end of each of your turns and can\'t patch any back, and a seal it lands while it rots fails and leaves it open.',
  },
  'debris-field': {
    cls: 'breaker', sub: 'demolitionist', verb: 'shield', name: 'Debris Field', target: 'none', damage: 0, cycles: 3, per: 5, most: 30, scales: ['per', 'most'], cooldown: 6, icon: 'shell-shield',
    short: 'Each ◆ you break shields 5',
    help: 'debris-field — For 3 cycles, every ◆ you break shields you for 5, up to 30.',
    desc: 'Keep the casing you blow off. This cycle and the next two, every armor chit you break turns into 5 points of shield on you, up to 30. Crack and Shaped Charge on a thick shell fill it in one command.',
  },
  backfire: {
    cls: 'breaker', sub: 'demolitionist', verb: 'hit', name: 'Backfire', target: 'part', damage: 25, cap: 60, cooldown: 4, icon: 'event-warning',
    short: '25 damage; a charge blows up',
    help: 'backfire <part> — Deals 25 damage to the target. A charge it is winding up blows up inside it, dealing the extra the charge would have added (up to 60), and the attack lands plain.',
    desc: 'Jam the part\'s own wind-up. It takes 25 damage, and if it is winding up a charge, the charge goes off inside it: the part takes the extra the charge would have dealt you, up to 60, and its attack lands plain.',
  },
  'rm-rf': {
    cls: 'breaker', sub: 'demolitionist', verb: 'buff', name: 'rm -rf', target: 'none', damage: 0, cycles: 2, share: 0.5, cooldown: 10, icon: 'expand',
    short: 'Hits splash all, 2 cycles',
    help: 'rm-rf — For 2 cycles, every hit you land also hits every other part for half as much.',
    desc: 'Recursive and forced. This cycle and next, every hit you land on a part also lands on every other part for half as much. Line it up with Shatter and Flood on a bare part and the whole virus comes down.',
  },
  // Overclocker: one big target, run hot.
  overvolt: {
    cls: 'breaker', sub: 'overclocker', verb: 'hit', name: 'Overvolt', target: 'part', damage: 0, hit: 20, hits: 2, cost: 6, scales: ['cost', 'hit'], cooldown: 4, icon: 'overload',
    short: 'Two hits of 20 at once',
    help: 'overvolt <part> — Hits the target twice for 20 damage in one command. Both hits count against a tell, so one Overvolt stops a cast. Costs 6 Signal (Integrity at home).',
    desc: 'Arc two hits of 20 into a part in one command. Each one counts on its own: one Overvolt stops a cast that needs two hits, calls off an elite\'s charge, or breaks two ◆. It costs you 6 Signal, or 6 Integrity at home.',
  },
  'thermal-throttle': {
    cls: 'breaker', sub: 'overclocker', verb: 'hit', name: 'Thermal Throttle', target: 'part', damage: 0, pierceAt: 2, base: 20, perStack: 20, scales: ['base', 'perStack'], cooldown: 3, icon: 'overload',
    short: 'Momentum: 20 +20 a stack',
    help: 'thermal-throttle <part> — Spends all your Momentum to deal 20 damage, plus 20 for each stack spent. With 2 or more stacks it goes straight through armor, locks and wards. Requires Momentum.',
    desc: 'Dump all your heat into one part. It needs Momentum and spends every stack, dealing 20 damage plus 20 for each stack spent. With 2 or more stacks it goes straight through armor, a Mutex\'s lock and a Lockbox\'s ward.',
  },
  'stack-smash': {
    cls: 'breaker', sub: 'overclocker', verb: 'hit', name: 'Stack Smash', target: 'part', damage: 30, repeats: 3, cooldown: 3, icon: 'spike',
    short: '30 damage; twice if Exposed',
    help: 'stack-smash <part> — Deals 30 damage to the target. Hits twice against an Exposed part, and each critical strike hits again, up to 3 more times.',
    desc: 'Smash a part\'s stack for 30 damage. On an Exposed part (Exploit) it hits twice for sure, and every critical hit hits it again, up to 3 more times.',
  },
  'hot-loop': {
    cls: 'breaker', sub: 'overclocker', verb: 'hit', name: 'Hot Loop', target: 'part', damage: 22, cycles: 2, cooldown: 2, icon: 'overload',
    short: '22 damage, +1 Momentum',
    help: 'hot-loop <part> — Deals 22 damage and gives you a Momentum stack that lasts 2 cycles.',
    desc: 'Spin a tight loop on one part. It takes 22 damage, and the heat gives you a Momentum stack for 2 cycles, which Thermal Throttle and Vent can spend.',
  },
  vent: {
    cls: 'breaker', sub: 'overclocker', verb: 'heal', name: 'Vent', target: 'none', damage: 0, heal: 5, cooldown: 5, icon: 'clear',
    short: 'Spends heat: cleanse, heal',
    help: 'vent — Spends all your Momentum to clear Corrupted, encryption and Scrambled, and heals you for 5 per stack spent, at least 5.',
    desc: 'Dump the heat out of the case. Every Momentum stack goes, and with them Corrupted, encryption and Scrambled. You heal 5 for each stack you spent, at least 5, and with no stacks left Redline stops making you take more.',
  },
  'fault-injection': {
    cls: 'breaker', sub: 'overclocker', verb: 'hit', name: 'Fault Injection', target: 'part', damage: 20, cycles: 3, cooldown: 10, icon: 'exploit',
    short: '20 damage; hits on it crit',
    help: 'fault-injection <part> — Deals 20 damage to the target. For 3 cycles, every hit you land on it is a critical strike.',
    desc: 'Glitch the part\'s clock. It takes 20 damage, and for 3 cycles every hit you land on it crits, so Segfault, Stack Smash and Thermal Throttle all land at their biggest. Plan the fight around it.',
  },
  'turbo-boost': {
    cls: 'breaker', sub: 'overclocker', verb: 'buff', name: 'Turbo Boost', target: 'none', damage: 0, cycles: 3, gain: 2, cost: 6, scales: ['cost'], cooldown: 5, icon: 'behavior',
    short: '+2 Momentum; free when low',
    help: 'turbo-boost — Gives you 2 Momentum stacks that last 3 cycles, for 6 Signal (Integrity at home). Below half your Signal it costs nothing and gives 3.',
    desc: 'Run past the safe clock. You gain 2 Momentum stacks that last 3 cycles, for 6 Signal (or Integrity at home). Run it hot when you\'re hurt: under half your Signal it costs nothing and gives 3 stacks.',
  },
};

export const subs = {
  demolitionist: {
    name: 'Demolitionist', role: ['DPS', 'Armor', 'Area'], idea: 'Bring the whole thing down.', solo: 'Strips armor fast and hits every part.', crew: 'Opens every part for the crew.', lean: 'solo',
    chase: ['damage', 'crit'], // what a player of it chases on gear, one per protocol in turn (balance sims, sim crewmates)
    edge: { legacy: true, name: 'Overkill', rule: 'When your hit breaks a part, the damage left over spills onto the next part (up to 20).' },
    skills: ['shatter', 'shaped-charge', 'fork-bomb', 'debris-field', 'thermal-runaway', 'backfire', 'logic-bomb', 'rm-rf', 'chain-reaction', 'bit-rot', 'zero-day'],
    // The four keys a generic fight is played with (docs/kits.md), and the shipped presets: a priority list each.
    rotationCore: ['crack', 'shatter', 'flood', 'overload'],
    presets: {
      rotation: ['crack', 'shatter', 'flood', 'overload', 'shaped-charge', 'thermal-runaway', 'backfire', 'rm-rf', 'logic-bomb', 'zero-day', 'fork-bomb', 'exploit', 'bit-rot', 'debris-field', 'chain-reaction'],
      area: ['crack', 'shatter', 'fork-bomb', 'chain-reaction', 'flood', 'overload', 'rm-rf', 'shaped-charge', 'backfire', 'logic-bomb', 'debris-field', 'bit-rot', 'thermal-runaway', 'exploit'],
    },
    layers: { core: ['crack', 'shatter', 'flood', 'overload', 'exploit'], utility: ['shaped-charge', 'debris-field', 'thermal-runaway', 'backfire'], cooldown: ['logic-bomb', 'rm-rf', 'zero-day'], specialist: ['fork-bomb', 'chain-reaction', 'bit-rot'] },
    tags: { 'fork-bomb': 'Fragments', 'chain-reaction': 'Fragments', 'bit-rot': 'Seals', 'logic-bomb': 'Part rules', 'zero-day': 'Bosses' },
    fillers: [
      [f('armor-cracker', 'Armor Cracker', 'Increases the time parts you strip take to patch by 1 cycle per rank.', 1), f('blast-radius', 'Blast Radius', 'Increases the damage of Fork Bomb, Logic Bomb and Chain Reaction by 10% per rank.', 0.1)],
      [f('overclocked', 'Overclocked Core', 'Increases all damage you deal by 3% per rank.', 0.03), f('shrapnel', 'Shrapnel', 'Increases the damage of Shatter by 8% per rank.', 0.08)],
      [f('failsafe', 'Failsafe', 'Reduces the damage you take from attacks by 3% per rank.', 0.03), f('deep-burn', 'Deep Burn', 'Increases the damage of each Thermal Runaway tick by 2 per rank.', 2)],
    ],
    talents: [
      [t('cluster-charge', 'Cluster Charge', 'Shaped Charge also breaks 2 ◆ on every other part.'), t('exposed-wiring', 'Exposed Wiring', 'A part that loses its last ◆ is Exposed for your next 2 cycles.')],
      [t('cascade-failure', 'Cascade Failure', 'Your first break each fight resets all your cooldowns.'), t('meltdown', 'Meltdown', 'Thermal Runaway also burns every other part at half strength.')],
      [t('total-overkill', 'Total Overkill', 'Overkill spills onto every other part, not just the next one.'), t('scorched-earth', 'Scorched Earth', 'Parts can\'t patch their ◆ back while you are in the fight.')],
    ],
  },
  overclocker: {
    name: 'Overclocker', role: ['DPS', 'Burst'], idea: 'Run it hot until something melts.', solo: 'The biggest single hits in the game.', crew: 'Deletes the part that matters.', lean: 'solo',
    chase: ['crit', 'damage'], // what a player of it chases on gear, one per protocol in turn (balance sims, sim crewmates)
    edge: { name: 'Redline', rule: 'Momentum stacks to 5, but you take 10% more damage while you have any.', max: 5, taken: 1.1 },
    skills: ['hot-loop', 'overvolt', 'segfault', 'thermal-throttle', 'brace', 'vent', 'stack-smash', 'fault-injection', 'sudo', 'turbo-boost', 'zero-day'],
    rotationCore: ['crack', 'hot-loop', 'segfault', 'flood'],
    presets: {
      rotation: ['crack', 'hot-loop', 'segfault', 'flood', 'thermal-throttle', 'overvolt', 'brace', 'fault-injection', 'overload', 'zero-day', 'vent', 'stack-smash', 'exploit'],
      rules: ['crack', 'hot-loop', 'segfault', 'flood', 'thermal-throttle', 'overvolt', 'overload', 'sudo', 'vent', 'brace', 'fault-injection', 'stack-smash', 'exploit'],
    },
    layers: { core: ['crack', 'hot-loop', 'segfault', 'thermal-throttle', 'overload', 'flood', 'exploit', 'stack-smash'], utility: ['overvolt', 'brace', 'vent'], cooldown: ['fault-injection', 'turbo-boost', 'zero-day'], specialist: ['sudo'] },
    tags: { sudo: 'Part rules', 'zero-day': 'Bosses' },
    fillers: [
      [f('heat-sink', 'Heat Sink', 'Increases the damage of Overload by 4 per rank.', 4), f('chain-exploit', 'Chain Exploit', 'Increases the damage each Momentum stack gives by 2% per rank.', 0.02)],
      [f('exploit-kit', 'Exploit Kit', 'Increases the crit chance Exposed gives by 5% per rank.', 5), f('core-voltage', 'Core Voltage', 'Increases the damage of Segfault and Stack Smash by 8% per rank.', 0.08)],
      [f('heat-spreader', 'Heat Spreader', 'Increases the duration of Momentum by 1 cycle per rank.', 1), f('liquid-cooling', 'Liquid Cooling', 'Reduces the Signal cost of Overvolt and Turbo Boost by 2 per rank.', 2)],
    ],
    talents: [
      [t('hair-trigger', 'Hair Trigger', 'Overload deals 35 damage, and its cooldown is 2 cycles.'), t('feedback-loop', 'Feedback Loop', 'Each critical strike you land gives you a Momentum stack.')],
      [t('core-dump', 'Core Dump', 'Segfault also deals triple damage to a part below 30% health.'), t('burn-in', 'Burn-in', 'Thermal Throttle spends only half your Momentum stacks.')],
      [t('unsafe-mode', 'Unsafe Mode', 'You deal 30% more damage and take 20% more.'), t('critical-heat', 'Critical Heat', 'Every hit you land is a critical strike while you have 4 or more Momentum stacks.')],
    ],
  },
};
