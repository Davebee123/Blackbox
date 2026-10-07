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
// Fields the engine reads generically: taunt (draw fire in a crew), once, ally. The rest (cut, cap,
// heal, tick, ticks, cycles) are read by ./bastion.mjs; heal and tick also scale in the skill text.
export const abilities = {
  // Warden: the tank. Draws fire, soaks it, sends it back.
  bulkhead: { cls: 'bastion', sub: 'warden', verb: 'shield', name: 'Bulkhead', target: 'none', damage: 0, cut: 0.5, cycles: 2, taunt: 2, cooldown: 6, icon: 'shell-shield', short: 'Half damage 2, draw fire',
    help: 'bulkhead — this cycle and next, attacks on you deal half. With a crew, every attack comes at you for those 2 cycles.',
    desc: 'Seal the bulkheads. This cycle and next, every attack that lands on you deals half damage. With a crew, every attack comes at you instead of them for those 2 cycles.' },
  blowback: { cls: 'bastion', sub: 'warden', verb: 'hit', name: 'Blowback', target: 'part', damage: 0, cap: 70, chits: 2, cooldown: 3, icon: 'spike', short: 'Hit back all you soaked',
    help: 'blowback <part> — hits it for the full size of every attack that has hit you since your last Blowback, shields and cuts included, up to 70. On armor it breaks 2 ◆.',
    desc: 'Send it all back. Blowback hits a part for the full size of every attack that has hit you since your last Blowback, counting what your shields and cuts took off, up to 70. On armor it breaks 2 ◆.' },
  dmz: { cls: 'bastion', sub: 'warden', verb: 'shield', name: 'DMZ', target: 'none', damage: 0, cut: 0.3, cycles: 2, cooldown: 6, icon: 'event-lock', short: '−30% damage to the crew',
    help: 'dmz — this cycle and next, attacks deal 30% less to you and to everyone in your crew.',
    desc: 'Open a demilitarized zone around the crew. This cycle and next, every attack deals 30% less to you and to everyone fighting beside you.' },
  // Sysop: the healer. Heals that spill into shields, and fixes for what a virus does to a crewmate.
  multicast: { cls: 'bastion', sub: 'sysop', verb: 'heal', name: 'Multicast', target: 'none', damage: 0, heal: 10, cooldown: 4, icon: 'expand', short: 'Heal 10, whole crew',
    help: 'multicast — heals you and everyone in your crew for 10.',
    desc: 'One packet, every host. Multicast heals you and everyone fighting beside you for 10.' },
  heartbeat: { cls: 'bastion', sub: 'sysop', verb: 'heal', name: 'Heartbeat', target: 'none', ally: true, damage: 0, tick: 5, ticks: 4, cooldown: 4, icon: 'server', short: 'Heal 5×4',
    help: 'heartbeat [name] — heals you 5 a cycle for 4 cycles, starting now. In a crew, heartbeat nyx heals nyx instead. A new Heartbeat replaces the old one.',
    desc: 'Keep the session alive. Heartbeat heals you or a crewmate for 5 every cycle for 4 cycles, starting this cycle. A second Heartbeat on the same player replaces the first.' },
  scrub: { cls: 'bastion', sub: 'sysop', verb: 'heal', name: 'Scrub', target: 'none', ally: true, damage: 0, heal: 8, cooldown: 5, icon: 'clear', short: 'Decrypt, unscramble, heal 8',
    help: 'scrub [name] — clears encryption and Scrambled from you, and heals you 8. In a crew, scrub nyx does it for nyx.',
    desc: 'Scrub the logs clean. Scrub clears encryption and Scrambled from you or a crewmate and heals them for 8.' },
  rollback: { cls: 'bastion', sub: 'sysop', verb: 'heal', name: 'Rollback', target: 'none', ally: true, damage: 0, cooldown: 6, icon: 'behavior', short: 'Undo the last hit',
    help: 'rollback [name] — undoes the last attack that hurt you: heals back all it did, or deletes the fragment it spawned. In a crew, rollback nyx does it for nyx.',
    desc: 'Restore the last good state. Rollback undoes the last attack that hurt you or a crewmate: it heals back everything that attack did, or deletes the fragment it spawned.' },
  'hot-standby': { cls: 'bastion', sub: 'sysop', verb: 'shield', name: 'Hot Standby', target: 'none', ally: true, damage: 0, once: true, cooldown: 0, icon: 'shell-shield', short: 'Hold at 1, once',
    help: 'hot-standby [name] — once per fight, the next attack that would drop you to 0 leaves you at 1 instead. In a crew, hot-standby nyx covers nyx.',
    desc: 'Keep a spare running. Once per fight, put yourself or a crewmate on standby: the next attack that would drop them to 0 leaves them at 1 instead.' },
  rebalance: { cls: 'bastion', sub: 'sysop', verb: 'heal', name: 'Rebalance', target: 'none', damage: 0, heal: 6, cooldown: 6, icon: 'mutation', short: 'Even out the crew, heal 6',
    help: 'rebalance — evens out the Signal of everyone in the fight (each moves to the crew\'s average share of their max), then heals everyone 6.',
    desc: 'Spread the load. Rebalance moves everyone in the fight to the same share of their max Signal, the crew\'s average, and then heals everyone for 6. Alone, it is a small heal.' },
};

export const subs = {
  warden: {
    name: 'Warden', role: ['Tank', 'Retaliation'], idea: 'Every hit comes to you, and goes back.', solo: 'Outlasts anything and hits back.', crew: 'The tank: draws fire and turns it around.',
    edge: { legacy: true, name: 'Grudge', rule: 'The part that last hit you takes +20% from your hits.' },
    skills: ['suspend', 'bulkhead', 'blowback', 'throttle', 'harden', 'quarantine', 'dmz', 'failover'],
    fillers: [
      [f('reverse-shell', 'Reverse Shell', 'Retaliate hits +5 per rank.', 5), f('deep-buffer', 'Deep Buffer', 'Blowback deals +10% per rank.', 0.1)],
      [f('hardened-kernel', 'Hardened Kernel', 'Take 3% less damage from attacks per rank.', 0.03), f('stateful-firewall', 'Stateful Firewall', 'Firewall absorbs +5 per rank.', 5)],
      [f('vendetta', 'Vendetta', 'Grudge adds +5% more per rank.', 0.05), f('token-bucket', 'Token Bucket', 'Rate Limit +4 damage per rank.', 4)],
    ],
    talents: [
      [t('tarpit', 'Tarpit', 'Suspend also Throttles the part until its attack lands.'), t('deep-packet-inspection', 'Deep Packet Inspection', 'Firewall absorbs 30.')],
      [t('counterflow', 'Counterflow', 'Retaliate also sends back everything Blowback has stored.'), t('write-protect', 'Write Protect', 'Harden gives two ◆, but costs 10% of your max Signal.')],
      [t('uptime', 'Uptime', 'Once per fight, a hit that would drop you to 0 leaves you at 1.'), t('kernel-panic', 'Kernel Panic', 'Below a third of your Signal, your hits deal 30% more.')],
    ],
  },
  sysop: {
    name: 'Sysop', role: ['Healer', 'Support'], idea: 'Keep everyone up, and the logs clean.', solo: 'Heals through long fights.', crew: 'The healer: keeps the crew standing and undoes what the virus does.',
    edge: { name: 'Overprovision', rule: 'Healing past full turns into a shield, up to 20.' },
    skills: ['patch', 'multicast', 'heartbeat', 'scrub', 'reclaim', 'rollback', 'hot-standby', 'rebalance'],
    fillers: [
      [f('patch-notes', 'Patch Notes', 'Patch heals +3 per rank.', 3), f('fan-out', 'Fan-out', 'Multicast heals +3 per rank.', 3)],
      [f('reserve-pool', 'Reserve Pool', 'Overprovision holds +5 more shield per rank.', 5), f('redundancy', 'Redundancy', '+4 max Signal on runs per rank.', 4)],
      [f('tick-rate', 'Tick Rate', 'Heartbeat heals +1 a cycle per rank.', 1), f('hardened-kernel', 'Hardened Kernel', 'Take 3% less damage from attacks per rank.', 0.03)],
    ],
    talents: [
      [t('service-pack', 'Service Pack', 'Patch heals 20 up front.'), t('ping-flood', 'Ping Flood', 'Multicast also hits every part for what it heals.')],
      [t('critical-path', 'Critical Path', 'Your heals on anyone under a third of their Signal heal 50% more.'), t('redistribute', 'Redistribute', 'Reclaim heals the lowest crewmate as much as it heals you. Alone, it heals you twice as much.')],
      [t('overcommit', 'Overcommit', 'Overprovision holds twice as much shield.'), t('loopback', 'Loopback', 'Every heal you cast also heals you for a third of it.')],
    ],
  },
};
