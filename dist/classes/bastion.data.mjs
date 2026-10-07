// Bastion subclasses: Warden and Sysop. Data only (no engine imports): the skills they add to
// ABILITIES, and each subclass's skill line, edge and talent tree. The engine side (what new skills do,
// talents, the edge, how the planner plays them) lives in ./bastion.mjs.
//
// A subclass is picked at level 10 (`subclass <id>`; switching is free, at home). Its skill line unlocks
// at SUB_UNLOCKS in data.mjs, in the order written here (up to 8). Its talent tree has the same shape as
// before: three filler rows of two ranked nodes, and three tiers of two picks.
// edge.legacy: the class's old edge (EDGE in data.mjs), now this subclass's.
import { f, t } from './kit.mjs';

// New skills (ABILITIES entries, same fields as data.mjs). Give each a cls and a sub.
export const abilities = {};

export const subs = {
  warden: {
    name: 'Warden', role: ['Tank', 'Retaliation'], idea: 'Every hit comes to you, and goes back.', solo: 'Outlasts anything and hits back.', crew: 'The tank: draws fire and turns it around.',
    edge: { legacy: true, name: 'Grudge', rule: 'The part that last hit you takes +20% from your hits.' },
    skills: ['suspend', 'throttle', 'harden', 'quarantine', 'failover'],
    fillers: [
      [f('stateful-firewall', 'Stateful Firewall', 'Firewall absorbs +5 per rank.', 5), f('reverse-shell', 'Reverse Shell', 'Retaliate hits +5 per rank.', 5)],
      [f('token-bucket', 'Token Bucket', 'Rate Limit +4 damage per rank.', 4), f('redundancy', 'Redundancy', '+4 max Signal on runs per rank.', 4)],
      [f('hardened-kernel', 'Hardened Kernel', 'Take 3% less damage from attacks per rank.', 0.03), f('patch-notes', 'Patch Notes', 'Patch heals +3 per rank.', 3)],
    ],
    talents: [
      [t('deep-packet-inspection', 'Deep Packet Inspection', 'Firewall absorbs 30.'), t('service-pack', 'Service Pack', 'Patch heals 20 up front.')],
      [t('backpressure', 'Backpressure', 'Throttled cuts attacks by 75%.'), t('active-defense', 'Active Defense', 'Retaliate stays lit for 2 cycles.')],
      [t('uptime', 'Uptime', 'Once per fight, a hit that would drop you to 0 leaves you at 1.'), t('preemption', 'Preemption', 'Suspend has cooldown 2.')],
    ],
  },
  sysop: {
    name: 'Sysop', role: ['Healer', 'Support'], idea: 'Keep everyone up, and the logs clean.', solo: 'Heals through long fights.', crew: 'The healer.',
    edge: { name: 'Overprovision', rule: 'Healing past full turns into a shield, up to 20.' },
    skills: ['patch', 'reclaim'],
    fillers: [
      [f('patch-notes', 'Patch Notes', 'Patch heals +3 per rank.', 3), f('redundancy', 'Redundancy', '+4 max Signal on runs per rank.', 4)],
      [f('token-bucket', 'Token Bucket', 'Rate Limit +4 damage per rank.', 4), f('stateful-firewall', 'Stateful Firewall', 'Firewall absorbs +5 per rank.', 5)],
      [f('hardened-kernel', 'Hardened Kernel', 'Take 3% less damage from attacks per rank.', 0.03), f('reverse-shell', 'Reverse Shell', 'Retaliate hits +5 per rank.', 5)],
    ],
    talents: [
      [t('service-pack', 'Service Pack', 'Patch heals 20 up front.'), t('deep-packet-inspection', 'Deep Packet Inspection', 'Firewall absorbs 30.')],
      [t('active-defense', 'Active Defense', 'Retaliate stays lit for 2 cycles.'), t('backpressure', 'Backpressure', 'Throttled cuts attacks by 75%.')],
      [t('uptime', 'Uptime', 'Once per fight, a hit that would drop you to 0 leaves you at 1.'), t('preemption', 'Preemption', 'Suspend has cooldown 2.')],
    ],
  },
};
