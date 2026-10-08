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
    short: 'Breaks all ◆; provokes',
    help: 'shaped-charge <part> — Breaks all ◆ on the target, but provokes it: its next attack comes 1 cycle sooner. Against a target with no armor, deals 30 damage instead.',
    desc: 'Blows the casing off the target, breaking all its ◆ at once. The target lashes out, and its next attack comes 1 cycle sooner, so use it while that attack is still far off. Against a target with no armor, deals 30 damage instead.',
  },
  'logic-bomb': {
    cls: 'breaker', sub: 'demolitionist', verb: 'hit', name: 'Logic Bomb', target: 'part', damage: 0, bomb: 50, blast: 20, scales: ['bomb', 'blast'], fuse: 2, cooldown: 5, icon: 'event-warning',
    short: 'Bomb: 50, and 20 to all',
    help: 'logic-bomb <part> — Plants a bomb on the target that detonates after 2 cycles, dealing 50 damage to the target and 20 damage to every other part. A part the blast breaks cannot reboot, and a Tripwire it breaks stays quiet.',
    desc: 'Plants a logic bomb in the target. 2 cycles later it detonates, dealing 50 damage to the target and 20 damage to every other part. A part the blast breaks stays down: a twin cannot reboot it, and a Tripwire caught in it stays quiet. If the target breaks first, the bomb goes off on the next part.',
  },
  'chain-reaction': {
    cls: 'breaker', sub: 'demolitionist', verb: 'hit', name: 'Chain Reaction', target: 'part', damage: 40, chits: 2, cycles: 3, blast: 30, scales: ['blast'], cooldown: 5, icon: 'expand',
    short: '40 damage; explodes on break',
    help: 'chain-reaction <part> — Deals 40 damage to the target, or breaks 2 ◆ if it is armored, and wires it for 3 cycles. If the target breaks while wired, it explodes for 30 damage to every other part. Parts the explosion breaks explode as well.',
    desc: 'Wires the target to blow, dealing 40 damage, or breaking 2 ◆ if it is armored. If the target breaks within 3 cycles, it explodes for 30 damage to every other part. A part the explosion breaks explodes as well, so a swarm of fragments goes up in one chain.',
  },
  'bit-rot': {
    cls: 'breaker', sub: 'demolitionist', verb: 'debuff', name: 'Bit Rot', target: 'part', damage: 25, chits: 2, cycles: 4, strip: 1, more: 0.2, cooldown: 5, icon: 'mutation',
    short: '25 damage; rots, +20% taken',
    help: 'bit-rot <part> — Deals 25 damage to the target, or breaks 2 ◆ if it is armored, and rots it for 4 cycles. A rotting part takes 20% more damage from you, loses 1 ◆ after each of your turns and cannot patch its armor. A seal it lands while rotting fails.',
    desc: 'Rots the target, dealing 25 damage, or breaking 2 ◆ if it is armored. For 4 cycles, it takes 20% more damage from you, loses 1 ◆ at the end of each of your turns and cannot patch its armor. A seal it lands while rotting fails and leaves it open.',
  },
  'debris-field': {
    cls: 'breaker', sub: 'demolitionist', verb: 'shield', name: 'Debris Field', target: 'none', damage: 0, cycles: 3, per: 5, most: 30, scales: ['per', 'most'], cooldown: 6, icon: 'shell-shield',
    short: 'Each ◆ broken shields 5',
    help: 'debris-field — For 3 cycles, each ◆ you break shields you for 5, up to 30.',
    desc: 'Turns the casing you blow off into cover. For 3 cycles, each ◆ you break shields you for 5, up to 30. Crack and Shaped Charge on a thick shell fill it in one command.',
  },
  backfire: {
    cls: 'breaker', sub: 'demolitionist', verb: 'hit', name: 'Backfire', target: 'part', damage: 25, cap: 60, cooldown: 4, icon: 'event-warning',
    short: '25 damage; detonates charges',
    help: 'backfire <part> — Deals 25 damage to the target. If the target is winding up a charge, the charge detonates early, dealing its bonus damage to the target instead (up to 60), and its attack lands uncharged.',
    desc: 'Jams the target\'s own wind-up, dealing 25 damage. If the target is winding up a charge, the charge goes off inside it, dealing its bonus damage to the target instead, up to 60, and its attack lands uncharged.',
  },
  'rm-rf': {
    cls: 'breaker', sub: 'demolitionist', verb: 'buff', name: 'rm -rf', target: 'none', damage: 0, cycles: 2, share: 0.5, cooldown: 10, icon: 'expand',
    short: 'Hits splash all, 2 cycles',
    help: 'rm-rf — For 2 cycles, each of your hits also deals half its damage to every other part.',
    desc: 'Deletes recursively, and by force. For 2 cycles, each of your hits also deals half its damage to every other part. Line it up with Shatter and Flood on a part with no armor, and the whole virus comes down.',
  },
  // Overclocker: one big target, run hot.
  overvolt: {
    cls: 'breaker', sub: 'overclocker', verb: 'hit', name: 'Overvolt', target: 'part', damage: 0, hit: 20, hits: 2, cost: 6, scales: ['cost', 'hit'], cooldown: 4, icon: 'overload',
    short: 'Strikes twice for 20',
    help: 'overvolt <part> — Strikes the target twice for 20 damage each. Each strike counts as a hit against a tell, so one Overvolt interrupts a cast. Costs 6 Signal.',
    desc: 'Arcs two strikes of 20 damage into the target. Each strike counts on its own, so one Overvolt interrupts a cast, calls off an elite\'s charge, or breaks 2 ◆. Costs 6 Signal, or 6 Integrity at home.',
  },
  'thermal-throttle': {
    cls: 'breaker', sub: 'overclocker', verb: 'hit', name: 'Thermal Throttle', target: 'part', damage: 0, pierceAt: 2, base: 20, perStack: 20, scales: ['base', 'perStack'], cooldown: 3, icon: 'overload',
    short: '20 +20 per Momentum',
    help: 'thermal-throttle <part> — Consumes all Momentum to deal 20 damage, plus 20 per stack consumed. With 2 or more stacks, ignores armor, locks and wards. Requires Momentum.',
    desc: 'Dumps all your heat into the target. Consumes all Momentum to deal 20 damage, plus 20 per stack consumed. With 2 or more stacks, ignores armor, a Mutex\'s lock and a Lockbox\'s ward. Requires Momentum.',
  },
  'stack-smash': {
    cls: 'breaker', sub: 'overclocker', verb: 'hit', name: 'Stack Smash', target: 'part', damage: 30, repeats: 3, cooldown: 3, icon: 'spike',
    short: '30 damage; twice if Exposed',
    help: 'stack-smash <part> — Deals 30 damage to the target. Strikes twice against an Exposed target, and each critical strike strikes again, up to 3 more times.',
    desc: 'Smashes the target\'s stack for 30 damage. Strikes twice against an Exposed target, and each critical strike strikes again, up to 3 more times.',
  },
  'hot-loop': {
    cls: 'breaker', sub: 'overclocker', verb: 'hit', name: 'Hot Loop', target: 'part', damage: 22, cycles: 2, cooldown: 2, icon: 'overload',
    short: '22 damage, +1 Momentum',
    help: 'hot-loop <part> — Deals 22 damage to the target and grants 1 Momentum for 2 cycles.',
    desc: 'Spins a tight loop on the target, dealing 22 damage and granting 1 Momentum for 2 cycles. Thermal Throttle and Vent spend it.',
  },
  vent: {
    cls: 'breaker', sub: 'overclocker', verb: 'heal', name: 'Vent', target: 'none', damage: 0, heal: 5, cooldown: 5, icon: 'clear',
    short: 'Momentum: cleanse and heal',
    help: 'vent — Consumes all Momentum to remove Corrupted, encryption and Scrambled from you, and heals you for 5 per stack consumed (minimum 5).',
    desc: 'Vents the heat out of the case. Consumes all Momentum to remove Corrupted, encryption and Scrambled from you, and heals you for 5 per stack consumed (minimum 5). With no stacks left, Redline stops increasing the damage you take.',
  },
  'fault-injection': {
    cls: 'breaker', sub: 'overclocker', verb: 'hit', name: 'Fault Injection', target: 'part', damage: 20, cycles: 3, cooldown: 10, icon: 'exploit',
    short: '20 damage; your hits crit',
    help: 'fault-injection <part> — Deals 20 damage to the target. For 3 cycles, all your hits against it are critical strikes.',
    desc: 'Glitches the target\'s clock, dealing 20 damage. For 3 cycles, all your hits against it are critical strikes, so Segfault, Stack Smash and Thermal Throttle land at their biggest. Plan the fight around it.',
  },
  'turbo-boost': {
    cls: 'breaker', sub: 'overclocker', verb: 'buff', name: 'Turbo Boost', target: 'none', damage: 0, cycles: 3, gain: 2, cost: 6, scales: ['cost'], cooldown: 5, icon: 'behavior',
    short: '+2 Momentum; free when low',
    help: 'turbo-boost — Grants 2 Momentum for 3 cycles. Costs 6 Signal. Below half Signal, costs nothing and grants 3.',
    desc: 'Runs past the safe clock, granting 2 Momentum for 3 cycles. Costs 6 Signal, or 6 Integrity at home. Below half Signal, costs nothing and grants 3.',
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
      [f('armor-cracker', 'Armor Cracker', 'Increases the time parts you strip take to patch their ◆ back by 1 cycle per rank.', 1), f('blast-radius', 'Blast Radius', 'Increases the damage of Fork Bomb, Logic Bomb and Chain Reaction by 10% per rank.', 0.1)],
      [f('overclocked', 'Overclocked Core', 'Increases all damage you deal by 3% per rank.', 0.03), f('shrapnel', 'Shrapnel', 'Increases the damage of Shatter by 8% per rank.', 0.08)],
      [f('failsafe', 'Failsafe', 'Reduces the damage you take from attacks by 3% per rank.', 0.03), f('deep-burn', 'Deep Burn', 'Increases the damage of each Thermal Runaway tick by 2 per rank.', 2)],
    ],
    talents: [
      [t('cluster-charge', 'Cluster Charge', 'Shaped Charge also breaks 2 ◆ on every other part.'), t('exposed-wiring', 'Exposed Wiring', 'A part that loses its last ◆ is Exposed for your next 2 cycles.')],
      [t('cascade-failure', 'Cascade Failure', 'The first part you break in each fight resets all your cooldowns.'), t('meltdown', 'Meltdown', 'Thermal Runaway also burns every other part for half damage.')],
      [t('total-overkill', 'Total Overkill', 'Overkill spills onto every other part, not just the next one.'), t('scorched-earth', 'Scorched Earth', 'Parts cannot patch their ◆ back while you are in the fight.')],
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
      [f('exploit-kit', 'Exploit Kit', 'Increases the critical strike chance Exposed gives by 5% per rank.', 5), f('core-voltage', 'Core Voltage', 'Increases the damage of Segfault and Stack Smash by 8% per rank.', 0.08)],
      [f('heat-spreader', 'Heat Spreader', 'Increases the duration of Momentum by 1 cycle per rank.', 1), f('liquid-cooling', 'Liquid Cooling', 'Reduces the Signal cost of Overvolt and Turbo Boost by 2 per rank.', 2)],
    ],
    talents: [
      [t('hair-trigger', 'Hair Trigger', 'Overload deals 35 damage, and its cooldown is 2 cycles.'), t('feedback-loop', 'Feedback Loop', 'Each critical strike you land grants you 1 Momentum.')],
      [t('core-dump', 'Core Dump', 'Segfault also deals triple damage to a part below 30% Integrity.'), t('burn-in', 'Burn-in', 'Thermal Throttle spends only half your Momentum stacks.')],
      [t('unsafe-mode', 'Unsafe Mode', 'You deal 30% more damage and take 20% more.'), t('critical-heat', 'Critical Heat', 'Every hit you land is a critical strike while you have 4 or more Momentum stacks.')],
    ],
  },
};
