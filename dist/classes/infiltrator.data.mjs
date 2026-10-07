// Infiltrator subclasses: Payload and Phantom. Data only (no engine imports): the skills they add to
// ABILITIES, and each subclass's skill line, edge and talent tree. The engine side (what new skills do,
// talents, the edge, how the planner plays them) lives in ./infiltrator.mjs.
//
// A subclass is picked at level 10 (`subclass <id>`; switching is free, at home). Its skill line unlocks
// at SUB_UNLOCKS in data.mjs, in the order written here (up to 8). Its talent tree has the same shape as
// before: three filler rows of two ranked nodes, and three tiers of two picks.
// edge.legacy: the class's old edge (EDGE in data.mjs), now this subclass's.
import { f, t } from './kit.mjs';

// New skills (ABILITIES entries, same fields as data.mjs). Give each a cls and a sub.
export const abilities = {};

export const subs = {
  payload: {
    name: 'Payload', role: ['DPS', 'Damage over time'], idea: 'Plant it, and let it spread.', solo: 'Burns that take whole viruses apart.', crew: 'Spreads damage across every part.',
    edge: { name: 'Bloom', rule: 'When a part you are burning breaks, its burns jump to the next part.' },
    skills: ['detonate', 'propagate', 'implant'],
    fillers: [
      [f('heap-spray', 'Heap Spray', 'Inject +2 per tick per rank.', 2), f('persistent-tag', 'Persistent Tag', 'Tagged burns tick +10% more per rank.', 0.1)],
      [f('backchannel', 'Backchannel', 'Backdoor +4 damage per rank.', 4), f('onion-routing', 'Onion Routing', '+3 max Signal on runs per rank.', 3)],
      [f('low-profile', 'Low Profile', 'Take 3% less damage from attacks per rank.', 0.03), f('recon', 'Recon', 'Opening +5 damage per rank.', 5)],
    ],
    talents: [
      [t('supercookie', 'Supercookie', 'Tag lasts 6 cycles.'), t('fast-hands', 'Fast Hands', 'Opening stays lit for 2 cycles.')],
      [t('polymorphic', 'Polymorphic', 'Inject lasts 5 cycles.'), t('rotating-proxies', 'Rotating Proxies', 'Spoof twice per run.')],
      [t('assassinate', 'Assassinate', 'Detonate on a Tagged part deals double.'), t('leaked-creds', 'Leaked Creds', 'Slip past 3 guards a run instead of 1.')],
    ],
  },
  phantom: {
    name: 'Phantom', role: ['DPS', 'Burst', 'Stealth runs'], idea: 'In, out, and never seen.', solo: 'Crits, and the easiest runs.', crew: 'Gets the crew past guards and picks off parts.',
    edge: { legacy: true, name: 'Weak Spot', rule: 'Your first hit on each part crits.' },
    skills: ['null-route', 'opening', 'spoof', 'tap', 'implant'],
    fillers: [
      [f('recon', 'Recon', 'Opening +5 damage per rank.', 5), f('backchannel', 'Backchannel', 'Backdoor +4 damage per rank.', 4)],
      [f('onion-routing', 'Onion Routing', '+3 max Signal on runs per rank.', 3), f('low-profile', 'Low Profile', 'Take 3% less damage from attacks per rank.', 0.03)],
      [f('heap-spray', 'Heap Spray', 'Inject +2 per tick per rank.', 2), f('persistent-tag', 'Persistent Tag', 'Tagged burns tick +10% more per rank.', 0.1)],
    ],
    talents: [
      [t('fast-hands', 'Fast Hands', 'Opening stays lit for 2 cycles.'), t('supercookie', 'Supercookie', 'Tag lasts 6 cycles.')],
      [t('rotating-proxies', 'Rotating Proxies', 'Spoof twice per run.'), t('polymorphic', 'Polymorphic', 'Inject lasts 5 cycles.')],
      [t('leaked-creds', 'Leaked Creds', 'Slip past 3 guards a run instead of 1.'), t('assassinate', 'Assassinate', 'Detonate on a Tagged part deals double.')],
    ],
  },
};
