// Operator subclasses: Herder and Hijacker. Data only (no engine imports): the skills they add to
// ABILITIES, and each subclass's skill line, edge and talent tree. The engine side (what new skills do,
// talents, the edge, how the planner plays them) lives in ./operator.mjs.
//
// A subclass is picked at level 10 (`subclass <id>`; switching is free, at home). Its skill line unlocks
// at SUB_UNLOCKS in data.mjs, in the order written here (up to 8). Its talent tree has the same shape as
// before: three filler rows of two ranked nodes, and three tiers of two picks.
// edge.legacy: the class's old edge (EDGE in data.mjs), now this subclass's.
import { f, t } from './kit.mjs';

// New skills (ABILITIES entries, same fields as data.mjs). Give each a cls and a sub.
export const abilities = {};

export const subs = {
  herder: {
    name: 'Herder', role: ['Summoner', 'Damage over time'], idea: 'More processes than they can kill.', solo: 'A swarm of helpers doing the work.', crew: 'Constant damage on everything.',
    edge: { legacy: true, name: 'Last Gasp', rule: 'Each helper hits once more as it expires.' },
    skills: ['kill-switch', 'garbage-collect', 'fork', 'cron-storm'],
    fillers: [
      [f('thread-pool', 'Thread Pool', 'Deploy helpers deal +1 per rank.', 1), f('node-pool', 'Node Pool', 'Botnet helpers deal +1 per rank.', 1)],
      [f('dead-mans-switch', 'Dead Man’s Switch', 'Kill Switch cashes in +5% per rank.', 0.05), f('kernel-hook', 'Kernel Hook', 'Hooked parts take +1 more per hit per rank.', 1)],
      [f('load-balancer', 'Load Balancer', 'Take 3% less damage from attacks per rank.', 0.03), f('extra-memory', 'Extra Memory', '+3 max Signal on runs per rank.', 3)],
    ],
    talents: [
      [t('big-process', 'Big Process', 'Deploy helpers deal 14.'), t('long-running', 'Long-running', 'Deploy helpers last 6 cycles.')],
      [t('extra-nodes', 'Extra Nodes', 'Botnet sends 4 helpers.'), t('hive', 'Hive', 'Your helper cap is 9.')],
      [t('parallel-deploy', 'Parallel Deploy', 'Deploy starts two helpers at half damage: same total, twice the hits for Hook.'), t('supervisor', 'Supervisor', 'Kill Switch readies Deploy.')],
    ],
  },
  hijacker: {
    name: 'Hijacker', role: ['Control', 'Support'], idea: 'Their code, your commands.', solo: 'Turns the virus against itself.', crew: 'Shuts attacks down for everyone.',
    edge: { name: 'Man in the Middle', rule: 'Jammed parts take +20% from everyone.' },
    skills: ['jam', 'barrier', 'reroute'],
    fillers: [
      [f('kernel-hook', 'Kernel Hook', 'Hooked parts take +1 more per hit per rank.', 1), f('thread-pool', 'Thread Pool', 'Deploy helpers deal +1 per rank.', 1)],
      [f('node-pool', 'Node Pool', 'Botnet helpers deal +1 per rank.', 1), f('dead-mans-switch', 'Dead Man’s Switch', 'Kill Switch cashes in +5% per rank.', 0.05)],
      [f('load-balancer', 'Load Balancer', 'Take 3% less damage from attacks per rank.', 0.03), f('extra-memory', 'Extra Memory', '+3 max Signal on runs per rank.', 3)],
    ],
    talents: [
      [t('long-running', 'Long-running', 'Deploy helpers last 6 cycles.'), t('big-process', 'Big Process', 'Deploy helpers deal 14.')],
      [t('hive', 'Hive', 'Your helper cap is 9.'), t('extra-nodes', 'Extra Nodes', 'Botnet sends 4 helpers.')],
      [t('supervisor', 'Supervisor', 'Kill Switch readies Deploy.'), t('parallel-deploy', 'Parallel Deploy', 'Deploy starts two helpers at half damage: same total, twice the hits for Hook.')],
    ],
  },
};
